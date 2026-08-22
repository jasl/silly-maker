// SPDX-License-Identifier: MIT
import type { DevDockContributionSetV1 } from "../debug/dev-dock.tsx";

interface DevDockContributionReceiptInternalV1 {
  acceptance?: {
    accepted: boolean;
    acknowledge(): void;
  };
  lifecycle?: {
    dispose(): Promise<void>;
  };
}

const contributionReceiptsInternalV1 = new WeakMap<
  DevDockContributionSetV1,
  DevDockContributionReceiptInternalV1
>();

function receiptForV1(
  contributions: DevDockContributionSetV1,
): DevDockContributionReceiptInternalV1 {
  return contributionReceiptsInternalV1.get(contributions) ?? {};
}

/** @internal Binds one Host readiness acknowledgment to a lazy contribution result. */
export function bindDevDockContributionAcceptanceInternalV1(
  contributions: DevDockContributionSetV1,
  acknowledge: () => void,
): DevDockContributionSetV1 {
  contributionReceiptsInternalV1.set(contributions, {
    ...receiptForV1(contributions),
    acceptance: { accepted: false, acknowledge },
  });
  return contributions;
}

/** @internal Binds one idempotent async cleanup to a lazy contribution result. */
export function bindDevDockContributionLifecycleInternalV1(
  contributions: DevDockContributionSetV1,
  dispose: () => void | PromiseLike<void>,
): DevDockContributionSetV1 {
  let disposal: Promise<void> | null = null;
  contributionReceiptsInternalV1.set(contributions, {
    ...receiptForV1(contributions),
    lifecycle: {
      dispose() {
        disposal ??= Promise.resolve().then(dispose);
        return disposal;
      },
    },
  });
  return contributions;
}

/** @internal Carries the receipt through UI-owned validation and merging. */
export function inheritDevDockContributionAcceptanceInternalV1(
  source: DevDockContributionSetV1,
  admitted: DevDockContributionSetV1,
): DevDockContributionSetV1 {
  const receipt = contributionReceiptsInternalV1.get(source);
  if (receipt !== undefined) contributionReceiptsInternalV1.set(admitted, receipt);
  return admitted;
}

/** @internal Acknowledges only after the mounted dock publishes its admitted registry. */
export function acknowledgeDevDockContributionAcceptanceInternalV1(
  contributions: DevDockContributionSetV1,
): void {
  const acceptance = contributionReceiptsInternalV1.get(contributions)?.acceptance;
  if (acceptance === undefined || acceptance.accepted) return;
  acceptance.accepted = true;
  acceptance.acknowledge();
}

/** @internal Releases a lazy contribution result after revocation or unmount. */
export function disposeDevDockContributionLifecycleInternalV1(
  contributions: DevDockContributionSetV1,
): Promise<void> {
  return contributionReceiptsInternalV1.get(contributions)?.lifecycle?.dispose() ??
    Promise.resolve();
}
