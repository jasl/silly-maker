// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type {
  PositiveSafeInteger,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";

import { createWebInstanceLeaseCoordinatorV1 } from "./instance-lease.ts";
import type { WebInstancePolicyV1 } from "./instance-lease.ts";

const SELF = "owner.test.self";
const OTHER = "owner.test.other";

/** Record-backed fake mirroring the session-lease status semantics. */
function fakeLeaseV1(initial: { ownerId: string | null; token: number }) {
  let record = { ...initial };
  const calls = { takeOver: 0, takeOverUnowned: 0 };
  const statusV1 = (): SessionLeaseStatusV1 => {
    if (record.ownerId === null) {
      return Object.freeze({
        kind: "unowned",
        ownerId: null,
        fencingToken: record.token as unknown as PositiveSafeInteger,
      }) as SessionLeaseStatusV1;
    }
    return Object.freeze({
      kind: record.ownerId === SELF ? "owned" : "readonly",
      ownerId: record.ownerId,
      fencingToken: record.token as unknown as PositiveSafeInteger,
    }) as SessionLeaseStatusV1;
  };
  return {
    calls,
    setRecord(ownerId: string | null, token: number): void {
      record = { ownerId, token };
    },
    getRecord: () => record,
    lease: {
      getStatus: async () => statusV1(),
      takeOver: async (): Promise<SessionLeaseOperationResultV1> => {
        calls.takeOver += 1;
        record = { ownerId: SELF, token: record.token + 1 };
        return Object.freeze({ kind: "updated", status: statusV1() });
      },
      takeOverUnowned: async (
        expected: PositiveSafeInteger,
      ): Promise<SessionLeaseOperationResultV1> => {
        calls.takeOverUnowned += 1;
        if (record.ownerId !== null || record.token !== Number(expected)) {
          return Object.freeze({ kind: "rejected", code: "conflict" });
        }
        record = { ownerId: SELF, token: record.token + 1 };
        return Object.freeze({ kind: "updated", status: statusV1() });
      },
    },
  };
}

async function coordinatorV1(
  fake: ReturnType<typeof fakeLeaseV1>,
  policy: WebInstancePolicyV1,
  options: { claimOnStart?: boolean; channelScope?: string } = {},
) {
  return createWebInstanceLeaseCoordinatorV1({
    lease: fake.lease,
    policy,
    selfOwnerId: SELF,
    channelScope: options.channelScope ?? `test.${Math.random().toString(36).slice(2)}`,
    pollIntervalMs: 0,
    ...(options.claimOnStart === undefined ? {} : { claimOnStart: options.claimOnStart }),
  });
}

describe("createWebInstanceLeaseCoordinatorV1", () => {
  it("claims a free lease at boot with CAS semantics for every policy", async () => {
    for (const policy of ["take_over", "read_only", "wait", "unrestricted"] as const) {
      const fake = fakeLeaseV1({ ownerId: null, token: 4 });
      const port = await coordinatorV1(fake, policy);
      expect(port.state.getCurrent()).toMatchObject({ role: "owner", holderOwnerId: null });
      expect(fake.calls.takeOverUnowned).toBe(1);
      expect(fake.calls.takeOver).toBe(0);
      port.dispose();
    }
  });

  it("take_over seizes a live holder at boot", async () => {
    const fake = fakeLeaseV1({ ownerId: OTHER, token: 7 });
    const port = await coordinatorV1(fake, "take_over");
    expect(port.state.getCurrent().role).toBe("owner");
    expect(fake.calls.takeOver).toBe(1);
    expect(fake.getRecord()).toEqual({ ownerId: SELF, token: 8 });
    port.dispose();
  });

  it("read_only never contends with a live holder", async () => {
    const fake = fakeLeaseV1({ ownerId: OTHER, token: 7 });
    const port = await coordinatorV1(fake, "read_only");
    expect(port.state.getCurrent()).toMatchObject({
      role: "read_only",
      holderOwnerId: OTHER,
    });
    expect(fake.calls.takeOver).toBe(0);
    await port.refresh();
    expect(fake.calls.takeOver).toBe(0);
    port.dispose();
  });

  it("wait runs read-only until the holder releases, then claims automatically", async () => {
    const fake = fakeLeaseV1({ ownerId: OTHER, token: 7 });
    const port = await coordinatorV1(fake, "wait");
    expect(port.state.getCurrent()).toMatchObject({ role: "waiting", holderOwnerId: OTHER });
    expect(fake.calls.takeOver).toBe(0);

    fake.setRecord(null, 7);
    await port.refresh();
    expect(port.state.getCurrent().role).toBe("owner");
    expect(fake.calls.takeOverUnowned).toBe(1);
    port.dispose();
  });

  it("reports lost after a later instance seizes the lease", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "take_over");
    expect(port.state.getCurrent().role).toBe("owner");

    fake.setRecord(OTHER, 9);
    const state = await port.refresh();
    expect(state).toMatchObject({ role: "lost", holderOwnerId: OTHER });
    port.dispose();
  });

  it("unrestricted re-seizes ownership whenever it is lost", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "unrestricted");
    expect(port.state.getCurrent().role).toBe("owner");

    fake.setRecord(OTHER, 9);
    const state = await port.refresh();
    expect(state.role).toBe("owner");
    expect(fake.getRecord().ownerId).toBe(SELF);
    port.dispose();
  });

  it("manual takeOver reclaims from lost for any policy", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "read_only");
    expect(port.state.getCurrent().role).toBe("owner");

    fake.setRecord(OTHER, 5);
    await port.refresh();
    expect(port.state.getCurrent().role).toBe("lost");

    const state = await port.takeOver();
    expect(state.role).toBe("owner");
    port.dispose();
  });

  it("loses a CAS claim race without seizing the winner", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 3 });
    // The contender wins between our status read and our claim.
    const originalGetStatus = fake.lease.getStatus;
    let reads = 0;
    fake.lease.getStatus = async () => {
      reads += 1;
      const status = await originalGetStatus();
      if (reads === 1) fake.setRecord(OTHER, 4);
      return status;
    };
    const port = await coordinatorV1(fake, "wait");
    expect(port.state.getCurrent()).toMatchObject({ role: "waiting", holderOwnerId: OTHER });
    expect(fake.getRecord().ownerId).toBe(OTHER);
    port.dispose();
  });

  it("notifies subscribers only on state changes", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "take_over");
    const listener = vi.fn();
    port.state.subscribe(listener);

    await port.refresh();
    expect(listener).not.toHaveBeenCalled();

    fake.setRecord(OTHER, 6);
    await port.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
    port.dispose();
  });

  it("nudges peer coordinators over the broadcast channel on seizure", async () => {
    const scope = `test.broadcast.${Math.random().toString(36).slice(2)}`;
    const fakeA = fakeLeaseV1({ ownerId: null, token: 1 });
    const portA = await coordinatorV1(fakeA, "take_over", { channelScope: scope });
    expect(portA.state.getCurrent().role).toBe("owner");

    // B shares the same underlying record through its own lease view.
    const fakeB = fakeLeaseV1({ ownerId: SELF, token: 2 });
    fakeB.lease.getStatus = async () => {
      const record = fakeA.getRecord();
      if (record.ownerId === null) {
        return Object.freeze({
          kind: "unowned",
          ownerId: null,
          fencingToken: record.token as unknown as PositiveSafeInteger,
        }) as SessionLeaseStatusV1;
      }
      return Object.freeze({
        // From B's perspective A's ownership reads as readonly.
        kind: "readonly",
        ownerId: record.ownerId,
        fencingToken: record.token as unknown as PositiveSafeInteger,
      }) as SessionLeaseStatusV1;
    };
    const portB = await coordinatorV1(fakeB, "read_only", { channelScope: scope });
    expect(portB.state.getCurrent().role).toBe("read_only");

    // A re-seizes (e.g. after a manual takeover elsewhere) → the broadcast
    // nudge refreshes B without waiting for its poll.
    fakeA.setRecord(OTHER, 5);
    await portA.takeOver();
    await vi.waitFor(() => {
      expect(portB.state.getCurrent().holderOwnerId).toBe(SELF);
    });

    portA.dispose();
    portB.dispose();
  });

  it("rejects invalid policies and poll intervals", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    await expect(
      createWebInstanceLeaseCoordinatorV1({
        lease: fake.lease,
        policy: "everyone" as never,
        selfOwnerId: SELF,
        channelScope: "test.invalid",
      }),
    ).rejects.toThrow(/web\.instance_policy_invalid/u);
    await expect(
      createWebInstanceLeaseCoordinatorV1({
        lease: fake.lease,
        policy: "take_over",
        selfOwnerId: SELF,
        channelScope: "test.invalid",
        pollIntervalMs: -1,
      }),
    ).rejects.toThrow(/web\.instance_poll_interval_invalid/u);
  });

  it("skips the boot seizure for HMR successors (claimOnStart false)", async () => {
    const fake = fakeLeaseV1({ ownerId: OTHER, token: 3 });
    const port = await coordinatorV1(fake, "take_over", { claimOnStart: false });
    expect(port.state.getCurrent().role).toBe("read_only");
    expect(fake.calls.takeOver).toBe(0);
    port.dispose();
  });

  it("publishes unavailable when a background refresh throws, then recovers", async () => {
    const scope = `test.background.${Math.random().toString(36).slice(2)}`;
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "take_over", { channelScope: scope });
    expect(port.state.getCurrent().role).toBe("owner");

    const healthyGetStatus = fake.lease.getStatus;
    fake.lease.getStatus = async () => {
      throw new TypeError("host record store exploded");
    };
    // A peer's nudge drives the background refresh path (no await surface).
    const peer = new BroadcastChannel(`sillymaker.instance-lease.${scope}`);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin
    peer.postMessage("lease-changed");
    await vi.waitFor(() => {
      expect(port.state.getCurrent().role).toBe("unavailable");
    });
    peer.close();

    fake.lease.getStatus = healthyGetStatus;
    const state = await port.refresh();
    expect(state.role).toBe("owner");
    port.dispose();
  });

  it("stays inert after dispose", async () => {
    const fake = fakeLeaseV1({ ownerId: null, token: 1 });
    const port = await coordinatorV1(fake, "take_over");
    port.dispose();
    fake.setRecord(OTHER, 8);
    const state = await port.refresh();
    expect(state.role).toBe("owner");
  });
});
