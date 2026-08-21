// SPDX-License-Identifier: MIT
import type { DevDockContributionSetV1 } from "../debug/dev-dock.tsx";

interface DevDockContributionAcceptanceReceiptInternalV1 {
  accepted: boolean;
  acknowledge(): void;
}

const acceptanceReceiptsInternalV1 = new WeakMap<
  DevDockContributionSetV1,
  DevDockContributionAcceptanceReceiptInternalV1
>();

/** @internal Binds one Host readiness acknowledgment to a lazy contribution result. */
export function bindDevDockContributionAcceptanceInternalV1(
  contributions: DevDockContributionSetV1,
  acknowledge: () => void,
): DevDockContributionSetV1 {
  acceptanceReceiptsInternalV1.set(contributions, { accepted: false, acknowledge });
  return contributions;
}

/** @internal Carries the receipt through UI-owned validation and merging. */
export function inheritDevDockContributionAcceptanceInternalV1(
  source: DevDockContributionSetV1,
  admitted: DevDockContributionSetV1,
): DevDockContributionSetV1 {
  const receipt = acceptanceReceiptsInternalV1.get(source);
  if (receipt !== undefined) acceptanceReceiptsInternalV1.set(admitted, receipt);
  return admitted;
}

/** @internal Acknowledges only after the mounted dock publishes its admitted registry. */
export function acknowledgeDevDockContributionAcceptanceInternalV1(
  contributions: DevDockContributionSetV1,
): void {
  const receipt = acceptanceReceiptsInternalV1.get(contributions);
  if (receipt === undefined || receipt.accepted) return;
  receipt.accepted = true;
  receipt.acknowledge();
}
