// SPDX-License-Identifier: MIT
import {
  type NonNegativeSafeInteger,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import {
  type ManagedSurfaceCandidateV1,
  type ManagedSurfaceIdentityAllocationV1,
  type ManagedSurfaceInstanceIdV1,
  type ManagedSurfaceRoutingLeaseIdV1,
  type ManagedSurfaceTargetOccurrenceIdV1,
  parseManagedSurfaceInstanceIdV1,
  parseManagedSurfaceRoutingLeaseIdV1,
  parseManagedSurfaceTargetOccurrenceIdV1,
} from "./managed-surface-contracts.ts";

export interface ManagedSurfaceTransientIdentityV1 {
  readonly allocation: ManagedSurfaceIdentityAllocationV1;
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
}

export function createManagedSurfaceTransientIdentityV1(
  applicationEpoch: NonNegativeSafeInteger,
  sequence: PositiveSafeInteger,
): ManagedSurfaceTransientIdentityV1 {
  const parsedEpoch = parseNonNegativeSafeInteger(applicationEpoch);
  const parsedSequence = parsePositiveSafeInteger(sequence);
  const suffix = `e${parsedEpoch}.n${parsedSequence}`;
  return Object.freeze({
    allocation: Object.freeze({
      applicationEpoch: parsedEpoch,
      sequence: parsedSequence,
    }),
    occurrenceId: parseManagedSurfaceTargetOccurrenceIdV1(`surface-occurrence.${suffix}`),
    surfaceInstanceId: parseManagedSurfaceInstanceIdV1(`surface-instance.${suffix}`),
    routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(`surface-lease.${suffix}`),
  });
}

export function hasExpectedManagedSurfaceTransientIdentityV1(
  candidate: ManagedSurfaceCandidateV1,
): boolean {
  const expected = createManagedSurfaceTransientIdentityV1(
    candidate.identityAllocation.applicationEpoch,
    candidate.identityAllocation.sequence,
  );
  return candidate.target.occurrenceId === expected.occurrenceId &&
    candidate.surfaceInstanceId === expected.surfaceInstanceId &&
    candidate.routingLeaseId === expected.routingLeaseId;
}
