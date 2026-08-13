// SPDX-License-Identifier: MIT
/**
 * Multi-instance coordination over the single-writer persistence lease.
 *
 * Every started web application owns a unique lease identity (one per
 * tab/window/process). This coordinator applies the application-declared
 * `instancePolicy` when another live instance already holds the lease and
 * publishes an observable role so shells can render takeover banners:
 *
 * - `"take_over"` (default): seize the lease at boot; if a later instance
 *   seizes it back, this instance reports `lost` and stops writing.
 * - `"read_only"`: never contend — report `read_only` while another
 *   instance holds the lease.
 * - `"wait"`: run read-only (`waiting`) until the holder releases, then
 *   claim ownership automatically.
 * - `"unrestricted"`: reclaim ownership whenever it is lost (best-effort
 *   last-writer-wins; the application accepts interleaved slot writes).
 *
 * A free (unowned) lease is always claimed with compare-and-set semantics
 * regardless of policy — policy only governs behavior while another
 * instance holds it. Fencing tokens still protect every write: a seized
 * instance can never clobber newer data; its writes are rejected instead.
 */
import type {
  PositiveSafeInteger,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";

export type WebInstancePolicyV1 = "take_over" | "read_only" | "wait" | "unrestricted";

export type WebInstanceLeaseRoleV1 =
  | "owner"
  | "waiting"
  | "read_only"
  | "lost"
  | "unavailable";

export interface WebInstanceLeaseStateV1 {
  readonly policy: WebInstancePolicyV1;
  readonly role: WebInstanceLeaseRoleV1;
  /** The holding instance's lease identity while someone else owns it. */
  readonly holderOwnerId: string | null;
}

export interface WebInstanceLeasePortV1 {
  readonly policy: WebInstancePolicyV1;
  readonly state: {
    getCurrent(): WebInstanceLeaseStateV1;
    subscribe(listener: () => void): () => void;
  };
  /** Re-reads the lease record and updates the published role. */
  refresh(): Promise<WebInstanceLeaseStateV1>;
  /** Manual seizure (e.g. a banner's takeover action), any policy. */
  takeOver(): Promise<WebInstanceLeaseStateV1>;
  dispose(): void;
}

interface InstanceLeaseSourceV1 {
  getStatus(): Promise<SessionLeaseStatusV1>;
  takeOver(): Promise<SessionLeaseOperationResultV1>;
  takeOverUnowned(
    expectedFencingToken: PositiveSafeInteger,
  ): Promise<SessionLeaseOperationResultV1>;
}

export interface CreateWebInstanceLeaseCoordinatorInputV1 {
  readonly lease: InstanceLeaseSourceV1;
  readonly policy: WebInstancePolicyV1;
  /** This instance's lease identity (detects self-owned handoff states). */
  readonly selfOwnerId: string;
  /** Scopes the cross-tab refresh channel; use the story id. */
  readonly channelScope: string;
  /** Attempt the boot-time seizure (off for HMR successors mid-handoff). */
  readonly claimOnStart?: boolean;
  /** Lease re-read cadence; the cross-tab channel refreshes faster. */
  readonly pollIntervalMs?: number;
}

const instancePoliciesV1: readonly WebInstancePolicyV1[] = Object.freeze([
  "take_over",
  "read_only",
  "wait",
  "unrestricted",
]);

function stateEqualsV1(left: WebInstanceLeaseStateV1, right: WebInstanceLeaseStateV1): boolean {
  return left.role === right.role && left.holderOwnerId === right.holderOwnerId;
}

export async function createWebInstanceLeaseCoordinatorV1(
  input: CreateWebInstanceLeaseCoordinatorInputV1,
): Promise<WebInstanceLeasePortV1> {
  if (!instancePoliciesV1.includes(input.policy)) {
    throw new TypeError(`web.instance_policy_invalid:${input.policy}`);
  }
  const pollIntervalMs = input.pollIntervalMs ?? 4_000;
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 0) {
    throw new TypeError("web.instance_poll_interval_invalid");
  }
  if (typeof input.selfOwnerId !== "string" || input.selfOwnerId.length === 0) {
    throw new TypeError("web.instance_owner_id_invalid");
  }
  const policy = input.policy;
  const listeners = new Set<() => void>();
  let everOwned = false;
  let disposed = false;
  let current: WebInstanceLeaseStateV1 = Object.freeze({
    policy,
    role: "read_only" as const,
    holderOwnerId: null,
  });

  const publishV1 = (next: WebInstanceLeaseStateV1): WebInstanceLeaseStateV1 => {
    if (stateEqualsV1(current, next)) return current;
    current = next;
    for (const listener of [...listeners]) listener();
    return current;
  };

  // Cross-tab nudge: seizing instances announce themselves so the seized
  // window flips to `lost` promptly instead of at the next poll.
  const channel = typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(`sillymaker.instance-lease.${input.channelScope}`);

  const announceV1 = (): void => {
    try {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin
      channel?.postMessage("lease-changed");
    } catch {
      // Best-effort: a closed channel must never break lease handling.
    }
  };

  const ownedBySelfV1 = (status: SessionLeaseStatusV1): boolean =>
    (status.kind === "owned" || status.kind === "handoff_requested") &&
    (status.ownerId as string) === input.selfOwnerId;

  const roleForStatusV1 = (status: SessionLeaseStatusV1): WebInstanceLeaseStateV1 => {
    if (ownedBySelfV1(status)) {
      everOwned = true;
      return Object.freeze({ policy, role: "owner" as const, holderOwnerId: null });
    }
    switch (status.kind) {
      case "unavailable":
        return Object.freeze({ policy, role: "unavailable" as const, holderOwnerId: null });
      case "unowned":
        // Free leases are claimed in refreshV1; observing this state means
        // the claim lost a race or storage briefly failed.
        return Object.freeze({
          policy,
          role: policy === "wait" ? ("waiting" as const) : ("read_only" as const),
          holderOwnerId: null,
        });
      case "owned":
      case "readonly":
      case "handoff_requested": {
        const holder = status.ownerId as string | null;
        if (policy === "wait") {
          return Object.freeze({ policy, role: "waiting" as const, holderOwnerId: holder });
        }
        return Object.freeze({
          policy,
          role: everOwned ? ("lost" as const) : ("read_only" as const),
          holderOwnerId: holder,
        });
      }
      default: {
        const exhaustive: never = status;
        return exhaustive;
      }
    }
  };

  const refreshV1 = async (options?: { readonly contend?: boolean }): Promise<
    WebInstanceLeaseStateV1
  > => {
    if (disposed) return current;
    let status = await input.lease.getStatus();
    if (status.kind === "unowned") {
      // CAS claim: never seizes a contender that claimed first.
      const claimed = await input.lease.takeOverUnowned(status.fencingToken);
      if (claimed.kind === "updated") {
        status = claimed.status;
        announceV1();
      } else {
        status = await input.lease.getStatus();
      }
    } else if (
      !ownedBySelfV1(status) &&
      (status.kind === "readonly" || status.kind === "handoff_requested" ||
        status.kind === "owned") &&
      (options?.contend === true || policy === "unrestricted")
    ) {
      const seized = await input.lease.takeOver();
      if (seized.kind === "updated") {
        status = seized.status;
        announceV1();
      } else {
        status = await input.lease.getStatus();
      }
    }
    return publishV1(roleForStatusV1(status));
  };

  const onChannelMessageV1 = (): void => {
    void refreshV1();
  };
  channel?.addEventListener("message", onChannelMessageV1);

  const onVisibilityV1 = (): void => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void refreshV1();
    }
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityV1);
  }

  const timer = pollIntervalMs === 0 ? null : setInterval(() => {
    void refreshV1();
  }, pollIntervalMs);

  // Boot: only the seizing policies contend with a live holder; wait and
  // read_only start from whatever the record says.
  await refreshV1({
    contend: (input.claimOnStart ?? true) &&
      (policy === "take_over" || policy === "unrestricted"),
  });

  return Object.freeze({
    policy,
    state: Object.freeze({
      getCurrent: () => current,
      subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    refresh: () => refreshV1(),
    takeOver: () => refreshV1({ contend: true }),
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (timer !== null) clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityV1);
      }
      channel?.removeEventListener("message", onChannelMessageV1);
      // Nudge peers once: our teardown usually precedes a lease release, so
      // waiters re-read promptly instead of at their next poll.
      announceV1();
      channel?.close();
      listeners.clear();
    },
  });
}
