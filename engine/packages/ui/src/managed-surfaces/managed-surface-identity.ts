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

/** Shared epoch-local runtime attempt identity; stable occurrences remain publisher-issued. */
export interface ManagedSurfaceRuntimeAttemptIdentityInternalV1 {
  readonly allocation: ManagedSurfaceIdentityAllocationV1;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
}

const runtimeAttemptSequencesInternalV1 = new WeakMap<object, PositiveSafeInteger>();

export function createManagedSurfaceRuntimeAttemptIdentityInternalV1(
  applicationEpoch: NonNegativeSafeInteger,
  sequence: PositiveSafeInteger,
): ManagedSurfaceRuntimeAttemptIdentityInternalV1 {
  const parsedEpoch = parseNonNegativeSafeInteger(applicationEpoch);
  const parsedSequence = parsePositiveSafeInteger(sequence);
  const suffix = `e${parsedEpoch}.n${parsedSequence}`;
  return Object.freeze({
    allocation: Object.freeze({
      applicationEpoch: parsedEpoch,
      sequence: parsedSequence,
    }),
    surfaceInstanceId: parseManagedSurfaceInstanceIdV1(`surface-instance.${suffix}`),
    routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(`surface-lease.${suffix}`),
  });
}

export function hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(
  value: ManagedSurfaceRuntimeAttemptIdentityInternalV1,
): boolean {
  const expected = createManagedSurfaceRuntimeAttemptIdentityInternalV1(
    value.allocation.applicationEpoch,
    value.allocation.sequence,
  );
  return value.surfaceInstanceId === expected.surfaceInstanceId &&
    value.routingLeaseId === expected.routingLeaseId;
}

export function recordManagedSurfaceRuntimeAttemptSequenceInternalV1(
  value: object,
  sequence: PositiveSafeInteger,
): void {
  runtimeAttemptSequencesInternalV1.set(value, parsePositiveSafeInteger(sequence));
}

export function copyManagedSurfaceRuntimeAttemptSequenceInternalV1(
  source: object,
  target: object,
): void {
  const sequence = runtimeAttemptSequencesInternalV1.get(source);
  if (sequence !== undefined) runtimeAttemptSequencesInternalV1.set(target, sequence);
}

export function inspectManagedSurfaceRuntimeAttemptSequenceInternalV1(
  value: unknown,
): PositiveSafeInteger | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  return runtimeAttemptSequencesInternalV1.get(value) ?? null;
}

export function createManagedSurfaceTransientIdentityV1(
  applicationEpoch: NonNegativeSafeInteger,
  sequence: PositiveSafeInteger,
): ManagedSurfaceTransientIdentityV1 {
  const attempt = createManagedSurfaceRuntimeAttemptIdentityInternalV1(
    applicationEpoch,
    sequence,
  );
  const suffix = `e${attempt.allocation.applicationEpoch}.n${attempt.allocation.sequence}`;
  return Object.freeze({
    allocation: attempt.allocation,
    occurrenceId: parseManagedSurfaceTargetOccurrenceIdV1(`surface-occurrence.${suffix}`),
    surfaceInstanceId: attempt.surfaceInstanceId,
    routingLeaseId: attempt.routingLeaseId,
  });
}

export function hasExpectedManagedSurfaceTransientIdentityV1(
  candidate: ManagedSurfaceCandidateV1,
): boolean {
  const attemptMatches = hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1({
    allocation: candidate.identityAllocation,
    surfaceInstanceId: candidate.surfaceInstanceId,
    routingLeaseId: candidate.routingLeaseId,
  });
  const expectedOccurrence = createManagedSurfaceTransientIdentityV1(
    candidate.identityAllocation.applicationEpoch,
    candidate.identityAllocation.sequence,
  ).occurrenceId;
  return attemptMatches && candidate.target.occurrenceId === expectedOccurrence;
}
