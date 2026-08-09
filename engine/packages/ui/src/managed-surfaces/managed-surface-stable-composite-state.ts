// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import type {
  ManagedSurfaceInstanceIdV1,
  ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { parseManagedSurfaceInstanceIdV1 } from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceRuntimeAttemptIdentityInternalV1,
  hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1,
  inspectManagedSurfaceRuntimeAttemptSequenceInternalV1,
  type ManagedSurfaceRuntimeAttemptIdentityInternalV1,
} from "./managed-surface-identity.ts";
import {
  matchesManagedSurfaceStableAdmissionAuthorityConfigurationInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableReservationGenerationTokenInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import type { ManagedSurfaceStablePublisherLeaseRegistryInternalV1 } from "./managed-surface-stable-publisher-lease.ts";
import type { ManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeKernelInternalV1,
} from "./managed-surface-runtime-kernel.ts";

export interface ManagedSurfaceStableDesiredRuntimeTargetInternalV1 {
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly publisherLeaseSequence: PositiveSafeInteger;
  readonly occurrenceSequence: PositiveSafeInteger;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly admittedTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
}

export interface ManagedSurfaceStableRuntimeAttemptInternalV1 {
  readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly identity: ManagedSurfaceRuntimeAttemptIdentityInternalV1;
  readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
}

export interface ManagedSurfaceStableReadyRuntimeInstanceInternalV1 {
  readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
  readonly phase: "active" | "suspended";
}

export type ManagedSurfaceStableRuntimeBindingInternalV1 =
  | {
    readonly kind: "ready_instance";
    readonly instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  }
  | {
    readonly kind: "preparing";
    readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
    readonly transition: "initial_open" | "primary_replacement" | "child_open";
    readonly retainedPredecessor: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
  }
  | {
    readonly kind: "gap";
    readonly reason: "readiness_failed" | "parent_unavailable";
    readonly retainedPredecessor: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
  };

export interface ManagedSurfaceStableRuntimeEntryInternalV1 {
  readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly binding: ManagedSurfaceStableRuntimeBindingInternalV1;
}

export interface CreateManagedSurfaceStablePreparingRuntimeBindingInputInternalV1 {
  readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
  readonly transition: "initial_open" | "primary_replacement" | "child_open";
  readonly placement: "root" | "child";
  readonly slotCardinality: "single" | "stack";
  readonly retainedPredecessor: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
}

export interface CreateManagedSurfaceStableGapRuntimeBindingInputInternalV1 {
  readonly reason: "readiness_failed" | "parent_unavailable";
  readonly placement: "root" | "child";
  readonly slotCardinality: "single" | "stack";
  readonly retainedPredecessor: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
}

export function createManagedSurfaceStableReadyRuntimeBindingInternalV1(input: {
  readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
  readonly phase: "active" | "suspended";
}): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "ready_instance" }> {
  if (!hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(input.attempt.identity)) {
    throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
  }
  return Object.freeze({
    kind: "ready_instance" as const,
    instance: Object.freeze({ attempt: input.attempt, phase: input.phase }),
  });
}

export function createManagedSurfaceStablePreparingRuntimeBindingInternalV1(
  input: CreateManagedSurfaceStablePreparingRuntimeBindingInputInternalV1,
): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "preparing" }> {
  const replacement = input.transition === "primary_replacement";
  const targetPlacement = input.attempt.desiredTarget.admittedTarget.stackScope.kind;
  if (
    !hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(input.attempt.identity) ||
    targetPlacement !== input.placement ||
    replacement !== (input.retainedPredecessor !== null) ||
    (replacement && (input.placement !== "root" || input.slotCardinality !== "single")) ||
    (input.transition === "initial_open" && input.placement !== "root") ||
    (input.transition === "child_open" && input.placement !== "child")
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return Object.freeze({
    kind: "preparing" as const,
    attempt: input.attempt,
    transition: input.transition,
    retainedPredecessor: input.retainedPredecessor,
  });
}

export function createManagedSurfaceStableGapRuntimeBindingInternalV1(
  input: CreateManagedSurfaceStableGapRuntimeBindingInputInternalV1,
): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "gap" }> {
  if (
    (input.reason === "parent_unavailable" &&
      (input.placement !== "child" || input.retainedPredecessor !== null)) ||
    (input.retainedPredecessor !== null &&
      (input.reason !== "readiness_failed" || input.placement !== "root" ||
        input.slotCardinality !== "single"))
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return Object.freeze({
    kind: "gap" as const,
    reason: input.reason,
    retainedPredecessor: input.retainedPredecessor,
  });
}

export type ManagedSurfaceStableRootReservationContributorCandidateInternalV1 =
  | {
    readonly kind: "stable_desired";
    readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  }
  | {
    readonly kind: "stable_runtime";
    readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
    readonly binding: ManagedSurfaceStableRuntimeBindingInternalV1;
  };

type ManagedSurfaceTransientRootReservationContributorCandidateInternalV1 =
  | {
    readonly kind: "transient_runtime";
    readonly placement: "root" | "child";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly runtimeSequence: PositiveSafeInteger;
    readonly role: "candidate";
    readonly phase: "preparing";
  }
  | {
    readonly kind: "transient_runtime";
    readonly placement: "root" | "child";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly runtimeSequence: PositiveSafeInteger;
    readonly role: "ready_instance";
    readonly phase: "active" | "suspended";
  };

export type ManagedSurfaceStableRootReservationContributorInternalV1 =
  | {
    readonly kind: "stable_desired";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
    readonly publisherLeaseSequence: PositiveSafeInteger;
    readonly occurrenceId: ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"];
    readonly occurrenceSequence: PositiveSafeInteger;
    readonly role: "desired";
    readonly phase: "accepted";
  }
  | {
    readonly kind: "stable_runtime";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
    readonly publisherLeaseSequence: PositiveSafeInteger;
    readonly occurrenceId: ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"];
    readonly occurrenceSequence: PositiveSafeInteger;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly runtimeSequence: PositiveSafeInteger;
    readonly role: "candidate" | "ready_instance" | "retained_predecessor";
    readonly phase: "preparing" | "active" | "suspended";
  }
  | {
    readonly kind: "transient_runtime";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly runtimeSequence: PositiveSafeInteger;
    readonly role: "candidate" | "ready_instance";
    readonly phase: "preparing" | "active" | "suspended";
  };

export interface ManagedSurfaceStableCompositeStateInternalV1 {
  readonly transientState: ManagedSurfaceReducerStateV1;
  readonly stableAcceptedBaselines: readonly ManagedSurfaceStableAcceptedBaselineInternalV1[];
  readonly rootReservationContributors:
    readonly ManagedSurfaceStableRootReservationContributorInternalV1[];
  readonly rootReservationGenerationToken: ManagedSurfaceStableReservationGenerationTokenInternalV1;
  readonly stableRuntimeBindings: readonly ManagedSurfaceStableRuntimeEntryInternalV1[];
}

interface CompositeStateAuthorityRecordInternalV1 {
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly createRootReservationSnapshot: ManagedSurfaceStableAdmissionAuthorityInternalV1[
    "createRootReservationSnapshot"
  ];
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly origin: object;
  derivedFrom: ManagedSurfaceStableCompositeStateInternalV1 | null;
  derivationDepth: number;
  readonly installable: boolean;
  readonly boundRuntimeAttempts: ReadonlyMap<
    ManagedSurfaceRuntimeAttemptIdentityInternalV1,
    ManagedSurfaceStableRuntimeAttemptInternalV1
  >;
  readonly pendingRuntimeAttempts: ReadonlySet<ManagedSurfaceRuntimeAttemptIdentityInternalV1>;
  readonly stableContributorCandidates:
    readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[];
}

const compositeStateAuthorityRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeStateInternalV1,
  CompositeStateAuthorityRecordInternalV1
>();

export function createManagedSurfaceStableCompositeStateInternalV1(input: {
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly transientState: ManagedSurfaceReducerStateV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
}): ManagedSurfaceStableCompositeStateInternalV1 {
  const admissionAuthority = input.admissionAuthority;
  const transientState = input.transientState;
  const publisherLeaseRegistry = input.publisherLeaseRegistry;
  if (
    !matchesManagedSurfaceStableAdmissionAuthorityConfigurationInternalV1(
      admissionAuthority,
      publisherLeaseRegistry,
      transientState.resolvedSlotDescriptors,
    )
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const registrySnapshot = publisherLeaseRegistry.getSnapshot();
  if (
    registrySnapshot.disposed ||
    registrySnapshot.applicationEpoch !== transientState.publication.applicationEpoch
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const state = Object.freeze({
    transientState,
    stableAcceptedBaselines: Object.freeze([]),
    rootReservationContributors: Object.freeze([]),
    rootReservationGenerationToken: admissionAuthority.createReservationGenerationToken(),
    stableRuntimeBindings: Object.freeze([]),
  });
  compositeStateAuthorityRecordsInternalV1.set(state, {
    admissionAuthority,
    createRootReservationSnapshot: admissionAuthority.createRootReservationSnapshot,
    publisherLeaseRegistry,
    origin: Object.freeze({}),
    derivedFrom: null,
    derivationDepth: 0,
    installable: true,
    boundRuntimeAttempts: new Map(),
    pendingRuntimeAttempts: new Set(),
    stableContributorCandidates: Object.freeze([]),
  });
  return state;
}

export interface ManagedSurfaceStableRuntimeAttemptAllocationInternalV1 {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly identity: ManagedSurfaceRuntimeAttemptIdentityInternalV1;
}

/**
 * Purely derives one shared-cursor runtime attempt and a detached successor.
 * R3b may chain this while planning, then install only the final state through
 * the composition-owned kernel transition.
 */
export function allocateManagedSurfaceStableRuntimeAttemptInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
): ManagedSurfaceStableRuntimeAttemptAllocationInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const currentHighWater = currentState.transientState.identitySequenceHighWater;
  if (currentHighWater >= Number.MAX_SAFE_INTEGER) {
    throw new TypeError("ui.managed_surface_id_sequence_exhausted");
  }
  if (authorityRecord.pendingRuntimeAttempts.size >= 64) {
    throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
  }
  if (authorityRecord.derivationDepth >= 130) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const nextHighWater = parsePositiveSafeInteger(currentHighWater + 1);
  const identity = createManagedSurfaceRuntimeAttemptIdentityInternalV1(
    currentState.transientState.publication.applicationEpoch,
    nextHighWater,
  );
  const nextTransientState = Object.freeze({
    ...currentState.transientState,
    identitySequenceHighWater: parseNonNegativeSafeInteger(nextHighWater),
  });
  const nextState = Object.freeze({
    ...currentState,
    transientState: nextTransientState,
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: false,
    pendingRuntimeAttempts: new Set([
      ...authorityRecord.pendingRuntimeAttempts,
      identity,
    ]),
  });
  return Object.freeze({ state: nextState, identity });
}

function compareTextInternalV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const kindRankInternalV1 = Object.freeze({
  stable_desired: 0,
  stable_runtime: 1,
  transient_runtime: 2,
});
const roleRankInternalV1 = Object.freeze({
  desired: 0,
  candidate: 1,
  ready_instance: 2,
  retained_predecessor: 3,
});
const phaseRankInternalV1 = Object.freeze({
  accepted: 0,
  preparing: 1,
  active: 2,
  suspended: 3,
});

function compareContributorsInternalV1(
  left: ManagedSurfaceStableRootReservationContributorInternalV1,
  right: ManagedSurfaceStableRootReservationContributorInternalV1,
): number {
  const slotOrder = compareTextInternalV1(left.slotId, right.slotId);
  if (slotOrder !== 0) return slotOrder;
  const kindOrder = kindRankInternalV1[left.kind] - kindRankInternalV1[right.kind];
  if (kindOrder !== 0) return kindOrder;
  if (left.kind === "transient_runtime" && right.kind === "transient_runtime") {
    return left.runtimeSequence - right.runtimeSequence ||
      phaseRankInternalV1[left.phase] - phaseRankInternalV1[right.phase];
  }
  if (left.kind !== "transient_runtime" && right.kind !== "transient_runtime") {
    return left.publisherLeaseSequence - right.publisherLeaseSequence ||
      left.occurrenceSequence - right.occurrenceSequence ||
      roleRankInternalV1[left.role] - roleRankInternalV1[right.role] ||
      phaseRankInternalV1[left.phase] - phaseRankInternalV1[right.phase] ||
      (("runtimeSequence" in left ? left.runtimeSequence : 0) -
        ("runtimeSequence" in right ? right.runtimeSequence : 0));
  }
  return 0;
}

function sameContributorInternalV1(
  left: ManagedSurfaceStableRootReservationContributorInternalV1,
  right: ManagedSurfaceStableRootReservationContributorInternalV1,
): boolean {
  if (left.kind !== right.kind || left.slotId !== right.slotId) return false;
  if (left.kind === "transient_runtime" || right.kind === "transient_runtime") {
    return left.kind === "transient_runtime" && right.kind === "transient_runtime" &&
      left.surfaceInstanceId === right.surfaceInstanceId &&
      left.runtimeSequence === right.runtimeSequence && left.role === right.role &&
      left.phase === right.phase;
  }
  return left.publisherLease === right.publisherLease &&
    left.publisherLeaseSequence === right.publisherLeaseSequence &&
    left.occurrenceId === right.occurrenceId &&
    left.occurrenceSequence === right.occurrenceSequence && left.role === right.role &&
    left.phase === right.phase &&
    (!("surfaceInstanceId" in left) ||
      ("surfaceInstanceId" in right &&
        left.surfaceInstanceId === right.surfaceInstanceId &&
        left.runtimeSequence === right.runtimeSequence));
}

function validateDesiredTargetInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  desired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ReturnType<ManagedSurfaceStableAdmissionAuthorityInternalV1["inspectAdmittedTargetDefinition"]> {
  const definition = record.admissionAuthority.inspectAdmittedTargetDefinition(
    desired.admittedTarget,
  );
  if (
    desired.admittedTarget.publisherLease !== desired.publisherLease ||
    definition === null
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  const registry = record.publisherLeaseRegistry;
  const lease = registry.inspectCurrentLease(desired.publisherLease);
  const occurrence = registry.inspectIssuedOccurrence(
    desired.publisherLease,
    desired.admittedTarget.occurrenceId,
  );
  if (
    lease === null || occurrence === null ||
    lease.leaseSequence !== desired.publisherLeaseSequence ||
    occurrence !== desired.occurrenceSequence ||
    desired.sourceRevision > lease.sourceRevisionIssuanceHighWater ||
    !state.transientState.resolvedOwnerIds.includes(definition.ownerId)
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  return definition;
}

function captureDesiredTargetInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  desired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ManagedSurfaceStableDesiredRuntimeTargetInternalV1 {
  validateDesiredTargetInternalV1(state, record, desired);
  return Object.freeze({
    publisherLease: desired.publisherLease,
    publisherLeaseSequence: parsePositiveSafeInteger(desired.publisherLeaseSequence),
    occurrenceSequence: parsePositiveSafeInteger(desired.occurrenceSequence),
    sourceRevision: parsePositiveSafeInteger(
      desired.sourceRevision,
    ) as ManagedSurfaceStableSourceRevisionInternalV1,
    admittedTarget: desired.admittedTarget,
  });
}

function captureRuntimeAttemptInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  attempt: ManagedSurfaceStableRuntimeAttemptInternalV1,
  desiredTarget?: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ManagedSurfaceStableRuntimeAttemptInternalV1 {
  if (!hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(attempt.identity)) {
    throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
  }
  const boundAttempt = record.boundRuntimeAttempts.get(attempt.identity);
  if (boundAttempt !== undefined) {
    if (
      attempt.parentInstanceId !== boundAttempt.parentInstanceId ||
      !sameDesiredRuntimeTargetInternalV1(
        attempt.desiredTarget,
        boundAttempt.desiredTarget,
      )
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
    }
    return boundAttempt;
  }
  if (!record.pendingRuntimeAttempts.has(attempt.identity)) {
    throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
  }
  const capturedDesired = desiredTarget ?? captureDesiredTargetInternalV1(
    state,
    record,
    attempt.desiredTarget,
  );
  if (!sameDesiredRuntimeTargetInternalV1(attempt.desiredTarget, capturedDesired)) {
    throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
  }
  return Object.freeze({
    desiredTarget: capturedDesired,
    identity: attempt.identity,
    parentInstanceId: attempt.parentInstanceId === null
      ? null
      : parseManagedSurfaceInstanceIdV1(attempt.parentInstanceId),
  });
}

function captureReadyInstanceInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
): ManagedSurfaceStableReadyRuntimeInstanceInternalV1 {
  if (instance.phase !== "active" && instance.phase !== "suspended") {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const attempt = captureRuntimeAttemptInternalV1(state, record, instance.attempt);
  for (const entry of state.stableRuntimeBindings) {
    const binding = entry.binding;
    const candidates = binding.kind === "ready_instance"
      ? [binding.instance]
      : binding.retainedPredecessor === null
      ? []
      : [binding.retainedPredecessor];
    const existing = candidates.find((candidate) =>
      candidate.attempt === attempt && candidate.phase === instance.phase
    );
    if (existing !== undefined) return existing;
  }
  return Object.freeze({
    attempt,
    phase: instance.phase,
  });
}

function captureRuntimeBindingInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
): ManagedSurfaceStableRuntimeBindingInternalV1 {
  if (binding.kind === "ready_instance") {
    if (
      !sameStableOccurrenceIdentityInternalV1(
        binding.instance.attempt.desiredTarget,
        desiredTarget,
      )
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    if (
      record.pendingRuntimeAttempts.has(binding.instance.attempt.identity) &&
      !sameDesiredRuntimeTargetInternalV1(
        binding.instance.attempt.desiredTarget,
        desiredTarget,
      )
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    const instance = captureReadyInstanceInternalV1(state, record, binding.instance);
    const existing = state.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget &&
      entry.binding.kind === "ready_instance" && entry.binding.instance === instance
    );
    if (existing?.binding.kind === "ready_instance") return existing.binding;
    return Object.freeze({
      kind: "ready_instance" as const,
      instance,
    });
  }
  if (binding.kind === "preparing") {
    if (!sameDesiredRuntimeTargetInternalV1(binding.attempt.desiredTarget, desiredTarget)) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    if (
      binding.transition !== "initial_open" && binding.transition !== "primary_replacement" &&
      binding.transition !== "child_open"
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    const pendingAttempt = record.pendingRuntimeAttempts.has(binding.attempt.identity);
    const attempt = captureRuntimeAttemptInternalV1(
      state,
      record,
      binding.attempt,
      desiredTarget,
    );
    const retainedPredecessor = binding.retainedPredecessor === null
      ? null
      : captureReadyInstanceInternalV1(state, record, binding.retainedPredecessor);
    const existing = state.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget &&
      entry.binding.kind === "preparing" && entry.binding.attempt === attempt &&
      entry.binding.transition === binding.transition &&
      entry.binding.retainedPredecessor === retainedPredecessor
    );
    if (existing?.binding.kind === "preparing") return existing.binding;
    if (!pendingAttempt) {
      throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
    }
    return Object.freeze({
      kind: "preparing" as const,
      attempt,
      transition: binding.transition,
      retainedPredecessor,
    });
  }
  if (
    binding.kind !== "gap" ||
    (binding.reason !== "readiness_failed" && binding.reason !== "parent_unavailable")
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const retainedPredecessor = binding.retainedPredecessor === null
    ? null
    : captureReadyInstanceInternalV1(state, record, binding.retainedPredecessor);
  const existing = state.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget &&
    entry.binding.kind === "gap" && entry.binding.reason === binding.reason &&
    entry.binding.retainedPredecessor === retainedPredecessor
  );
  if (existing?.binding.kind === "gap") return existing.binding;
  return Object.freeze({
    kind: "gap" as const,
    reason: binding.reason,
    retainedPredecessor,
  });
}

function captureContributorCandidatesInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  candidates: readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[],
): readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[] {
  return Object.freeze(candidates.map((candidate) => {
    if (candidate.kind !== "stable_desired" && candidate.kind !== "stable_runtime") {
      throw new TypeError("ui.managed_surface_stable_reservation_contributor_invalid");
    }
    const desiredTarget = captureDesiredTargetInternalV1(state, record, candidate.desiredTarget);
    return candidate.kind === "stable_desired"
      ? Object.freeze({ kind: "stable_desired" as const, desiredTarget })
      : Object.freeze({
        kind: "stable_runtime" as const,
        desiredTarget,
        binding: captureRuntimeBindingInternalV1(
          state,
          record,
          desiredTarget,
          candidate.binding,
        ),
      });
  }));
}

function bindingAttemptsInternalV1(
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
): readonly ManagedSurfaceStableRuntimeAttemptInternalV1[] {
  if (binding.kind === "ready_instance") return Object.freeze([binding.instance.attempt]);
  if (binding.kind === "preparing") {
    return binding.retainedPredecessor === null
      ? Object.freeze([binding.attempt])
      : Object.freeze([binding.attempt, binding.retainedPredecessor.attempt]);
  }
  return binding.retainedPredecessor === null
    ? Object.freeze([])
    : Object.freeze([binding.retainedPredecessor.attempt]);
}

function slotCardinalityForDesiredInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  desired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  desiredByOccurrence: ReadonlyMap<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    ManagedSurfaceStableDesiredRuntimeTargetInternalV1
  >,
): "single" | "stack" {
  const placement = desired.admittedTarget.stackScope.kind;
  let parentDefinitionId: ManagedSurfaceStableAdmittedTargetInternalV1["definitionId"] | null =
    null;
  if (placement === "child") {
    const parentOccurrenceId = desired.admittedTarget.parentOccurrenceId;
    const parentDesired = parentOccurrenceId === null
      ? undefined
      : desiredByOccurrence.get(parentOccurrenceId);
    const parentDefinition = parentDesired === undefined
      ? null
      : record.admissionAuthority.inspectAdmittedTargetDefinition(parentDesired.admittedTarget);
    if (parentDefinition === null) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    parentDefinitionId = parentDefinition.definitionId;
  }
  const matches = state.transientState.resolvedSlotDescriptors.filter((descriptor) =>
    descriptor.kind === placement &&
    descriptor.slotId === desired.admittedTarget.stackScope.slotId &&
    (descriptor.kind !== "child" || descriptor.parentDefinitionId === parentDefinitionId)
  );
  if (matches.length !== 1) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return matches[0]!.cardinality;
}

function sameStableOccurrenceIdentityInternalV1(
  left: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  right: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): boolean {
  return left.publisherLease === right.publisherLease &&
    left.admittedTarget === right.admittedTarget &&
    left.publisherLeaseSequence === right.publisherLeaseSequence &&
    left.occurrenceSequence === right.occurrenceSequence;
}

function sameDesiredRuntimeTargetInternalV1(
  left: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  right: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): boolean {
  return sameStableOccurrenceIdentityInternalV1(left, right) &&
    left.sourceRevision === right.sourceRevision;
}

function validateRuntimeEntryInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  desired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
  desiredByOccurrence: ReadonlyMap<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    ManagedSurfaceStableDesiredRuntimeTargetInternalV1
  >,
  runtimeByOccurrence: ReadonlyMap<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    Extract<
      ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
      { readonly kind: "stable_runtime" }
    >
  >,
  usedRuntimeSequences: Set<number>,
  usedRuntimeAttempts: Map<
    ManagedSurfaceRuntimeAttemptIdentityInternalV1,
    ManagedSurfaceStableRuntimeAttemptInternalV1
  >,
): void {
  const definition = validateDesiredTargetInternalV1(state, authorityRecord, desired);
  if (definition === null || definition.placement !== desired.admittedTarget.stackScope.kind) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const placement = definition.placement;
  const slotCardinality = slotCardinalityForDesiredInternalV1(
    state,
    authorityRecord,
    desired,
    desiredByOccurrence,
  );
  const attemptMatchesOccurrence = (
    attempt: ManagedSurfaceStableRuntimeAttemptInternalV1,
  ): boolean => sameStableOccurrenceIdentityInternalV1(attempt.desiredTarget, desired);
  const preservesCurrentReadinessFailure = binding.kind === "gap" &&
    binding.reason === "readiness_failed" &&
    state.stableRuntimeBindings.some((entry) =>
      entry.desiredTarget.admittedTarget === desired.admittedTarget &&
      entry.binding === binding
    );
  if (binding.kind === "ready_instance") {
    if (
      (binding.instance.phase !== "active" && binding.instance.phase !== "suspended") ||
      !attemptMatchesOccurrence(binding.instance.attempt) ||
      binding.instance.attempt.desiredTarget.sourceRevision > desired.sourceRevision
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  } else if (binding.kind === "preparing") {
    if (
      !sameDesiredRuntimeTargetInternalV1(binding.attempt.desiredTarget, desired) ||
      (binding.transition === "primary_replacement" &&
        (placement !== "root" || slotCardinality !== "single" ||
          binding.retainedPredecessor === null)) ||
      (binding.transition === "initial_open" &&
        (placement !== "root" || binding.retainedPredecessor !== null)) ||
      (binding.transition === "child_open" &&
        (placement !== "child" || binding.retainedPredecessor !== null))
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  } else if (
    (binding.reason === "parent_unavailable" &&
      (placement !== "child" || binding.retainedPredecessor !== null)) ||
    (binding.retainedPredecessor !== null &&
      (binding.reason !== "readiness_failed" || placement !== "root" ||
        slotCardinality !== "single"))
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const directAttempt = binding.kind === "ready_instance"
    ? binding.instance.attempt
    : binding.kind === "preparing"
    ? binding.attempt
    : null;
  if (placement === "root") {
    if (directAttempt !== null && directAttempt.parentInstanceId !== null) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  } else {
    const parentOccurrenceId = desired.admittedTarget.parentOccurrenceId;
    const parentRuntime = parentOccurrenceId === null
      ? undefined
      : runtimeByOccurrence.get(parentOccurrenceId);
    const parentReady = parentRuntime?.binding.kind === "ready_instance"
      ? parentRuntime.binding.instance
      : null;
    if (binding.kind === "gap" && binding.reason === "parent_unavailable") {
      if (parentReady?.phase === "active") {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
    } else if (binding.kind === "gap") {
      if (
        parentReady === null ||
        (parentReady.phase !== "active" && !preservesCurrentReadinessFailure)
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
    } else if (
      parentReady === null ||
      directAttempt?.parentInstanceId !== parentReady.attempt.identity.surfaceInstanceId ||
      (binding.kind === "preparing" && parentReady.phase !== "active") ||
      (binding.kind === "ready_instance" && binding.instance.phase === "active" &&
        parentReady.phase !== "active")
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  }
  const currentReadyInstances = new Set<ManagedSurfaceStableReadyRuntimeInstanceInternalV1>();
  for (const entry of state.stableRuntimeBindings) {
    if (entry.binding.kind === "ready_instance") {
      currentReadyInstances.add(entry.binding.instance);
    } else if (entry.binding.retainedPredecessor !== null) {
      currentReadyInstances.add(entry.binding.retainedPredecessor);
    }
  }
  for (const attempt of bindingAttemptsInternalV1(binding)) {
    validateDesiredTargetInternalV1(state, authorityRecord, attempt.desiredTarget);
    const identity = attempt.identity;
    const sequence = identity.allocation.sequence;
    const boundAttempt = authorityRecord.boundRuntimeAttempts.get(identity);
    if (
      (boundAttempt === undefined && !authorityRecord.pendingRuntimeAttempts.has(identity)) ||
      (boundAttempt !== undefined && boundAttempt !== attempt) ||
      !hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(identity) ||
      identity.allocation.applicationEpoch !== state.transientState.publication.applicationEpoch ||
      sequence > state.transientState.identitySequenceHighWater ||
      usedRuntimeAttempts.has(identity) || usedRuntimeSequences.has(sequence)
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
    }
    usedRuntimeAttempts.set(identity, attempt);
    usedRuntimeSequences.add(sequence);
  }
  const retainedPredecessor = binding.kind === "ready_instance"
    ? null
    : binding.retainedPredecessor;
  if (retainedPredecessor !== null) {
    const predecessorDesired = retainedPredecessor.attempt.desiredTarget;
    if (
      predecessorDesired.publisherLease !== desired.publisherLease ||
      predecessorDesired.admittedTarget.occurrenceId === desired.admittedTarget.occurrenceId ||
      predecessorDesired.sourceRevision > desired.sourceRevision ||
      predecessorDesired.admittedTarget.stackScope.kind !== "root" ||
      predecessorDesired.admittedTarget.stackScope.slotId !==
        desired.admittedTarget.stackScope.slotId ||
      !currentReadyInstances.has(retainedPredecessor) ||
      retainedPredecessor.attempt.parentInstanceId !== null
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  }
}

function stableRuntimeRowsInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  desired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
): readonly ManagedSurfaceStableRootReservationContributorInternalV1[] {
  if (desired.admittedTarget.stackScope.kind !== "root") return Object.freeze([]);
  const base = {
    kind: "stable_runtime" as const,
    slotId: desired.admittedTarget.stackScope.slotId,
    publisherLease: desired.publisherLease,
    publisherLeaseSequence: desired.publisherLeaseSequence,
    occurrenceId: desired.admittedTarget.occurrenceId,
    occurrenceSequence: desired.occurrenceSequence,
  };
  const rowForInstance = (
    instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    role: "ready_instance" | "retained_predecessor",
  ): ManagedSurfaceStableRootReservationContributorInternalV1 => {
    const instanceDesired = instance.attempt.desiredTarget;
    validateDesiredTargetInternalV1(state, authorityRecord, instanceDesired);
    if (
      instanceDesired.admittedTarget.stackScope.kind !== "root" ||
      (role === "retained_predecessor" &&
        (instanceDesired.publisherLease !== desired.publisherLease ||
          instanceDesired.admittedTarget.stackScope.slotId !==
            desired.admittedTarget.stackScope.slotId))
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    return Object.freeze({
      kind: "stable_runtime" as const,
      slotId: instanceDesired.admittedTarget.stackScope.slotId,
      publisherLease: instanceDesired.publisherLease,
      publisherLeaseSequence: instanceDesired.publisherLeaseSequence,
      occurrenceId: instanceDesired.admittedTarget.occurrenceId,
      occurrenceSequence: instanceDesired.occurrenceSequence,
      surfaceInstanceId: instance.attempt.identity.surfaceInstanceId,
      runtimeSequence: instance.attempt.identity.allocation.sequence,
      role,
      phase: instance.phase,
    });
  };
  if (binding.kind === "ready_instance") {
    if (
      !sameStableOccurrenceIdentityInternalV1(binding.instance.attempt.desiredTarget, desired)
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    return Object.freeze([rowForInstance(binding.instance, "ready_instance")]);
  }
  if (binding.kind === "preparing") {
    if (!sameDesiredRuntimeTargetInternalV1(binding.attempt.desiredTarget, desired)) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    const rows: ManagedSurfaceStableRootReservationContributorInternalV1[] = [
      Object.freeze({
        ...base,
        surfaceInstanceId: binding.attempt.identity.surfaceInstanceId,
        runtimeSequence: binding.attempt.identity.allocation.sequence,
        role: "candidate" as const,
        phase: "preparing" as const,
      }),
    ];
    if (binding.retainedPredecessor !== null) {
      rows.push(rowForInstance(binding.retainedPredecessor, "retained_predecessor"));
    }
    return Object.freeze(rows);
  }
  return binding.retainedPredecessor === null
    ? Object.freeze([])
    : Object.freeze([rowForInstance(binding.retainedPredecessor, "retained_predecessor")]);
}

function sameStableRuntimeEntriesInternalV1(
  left: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
  right: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): boolean {
  if (left.length !== right.length) return false;
  const rightByOccurrence = new Map(
    right.map((entry) => [entry.desiredTarget.admittedTarget.occurrenceId, entry] as const),
  );
  return left.every((entry) => {
    const other = rightByOccurrence.get(entry.desiredTarget.admittedTarget.occurrenceId);
    return other !== undefined &&
      sameDesiredRuntimeTargetInternalV1(entry.desiredTarget, other.desiredTarget) &&
      entry.binding === other.binding;
  });
}

export function reconcileManagedSurfaceStableRootReservationsInternalV1(input: {
  readonly currentState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly contributorCandidates:
    readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[];
}): ManagedSurfaceStableCompositeStateInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(input.currentState);
  if (authorityRecord === undefined || !Array.isArray(input.contributorCandidates)) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const contributorCandidates = captureContributorCandidatesInternalV1(
    input.currentState,
    authorityRecord,
    input.contributorCandidates,
  );
  const desiredByOccurrence = new Map<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    ManagedSurfaceStableDesiredRuntimeTargetInternalV1
  >();
  const runtimeByOccurrence = new Map<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    Extract<
      ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
      { readonly kind: "stable_runtime" }
    >
  >();
  for (const candidate of contributorCandidates) {
    const occurrenceId = candidate.desiredTarget.admittedTarget.occurrenceId;
    const targetMap = candidate.kind === "stable_desired"
      ? desiredByOccurrence
      : runtimeByOccurrence;
    if (targetMap.has(occurrenceId)) {
      throw new TypeError("ui.managed_surface_stable_reservation_contributor_duplicate");
    }
    if (candidate.kind === "stable_desired") {
      desiredByOccurrence.set(occurrenceId, candidate.desiredTarget);
    } else {
      runtimeByOccurrence.set(occurrenceId, candidate);
    }
  }
  if (
    desiredByOccurrence.size !== runtimeByOccurrence.size ||
    [...desiredByOccurrence.keys()].some((occurrenceId) => !runtimeByOccurrence.has(occurrenceId))
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const rows: ManagedSurfaceStableRootReservationContributorInternalV1[] = [];
  const stableRuntimeBindings: ManagedSurfaceStableRuntimeEntryInternalV1[] = [];
  const usedRuntimeSequences = new Set<number>();
  const usedRuntimeAttempts = new Map<
    ManagedSurfaceRuntimeAttemptIdentityInternalV1,
    ManagedSurfaceStableRuntimeAttemptInternalV1
  >();
  for (const candidate of contributorCandidates) {
    validateDesiredTargetInternalV1(input.currentState, authorityRecord, candidate.desiredTarget);
    if (candidate.kind === "stable_desired") {
      if (candidate.desiredTarget.admittedTarget.stackScope.kind === "root") {
        rows.push(Object.freeze({
          kind: "stable_desired" as const,
          slotId: candidate.desiredTarget.admittedTarget.stackScope.slotId,
          publisherLease: candidate.desiredTarget.publisherLease,
          publisherLeaseSequence: candidate.desiredTarget.publisherLeaseSequence,
          occurrenceId: candidate.desiredTarget.admittedTarget.occurrenceId,
          occurrenceSequence: candidate.desiredTarget.occurrenceSequence,
          role: "desired" as const,
          phase: "accepted" as const,
        }));
      }
      continue;
    }
    const acceptedDesired = desiredByOccurrence.get(
      candidate.desiredTarget.admittedTarget.occurrenceId,
    );
    if (
      acceptedDesired === undefined ||
      !sameDesiredRuntimeTargetInternalV1(acceptedDesired, candidate.desiredTarget)
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    validateRuntimeEntryInternalV1(
      input.currentState,
      authorityRecord,
      candidate.desiredTarget,
      candidate.binding,
      desiredByOccurrence,
      runtimeByOccurrence,
      usedRuntimeSequences,
      usedRuntimeAttempts,
    );
    stableRuntimeBindings.push(Object.freeze({
      desiredTarget: candidate.desiredTarget,
      binding: candidate.binding,
    }));
    rows.push(
      ...stableRuntimeRowsInternalV1(
        input.currentState,
        authorityRecord,
        candidate.desiredTarget,
        candidate.binding,
      ),
    );
  }
  for (const identity of authorityRecord.pendingRuntimeAttempts) {
    if (!usedRuntimeAttempts.has(identity)) {
      throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
    }
  }
  for (
    const candidate of transientContributorCandidatesInternalV1(input.currentState.transientState)
  ) {
    if (usedRuntimeSequences.has(candidate.runtimeSequence)) {
      throw new TypeError("ui.managed_surface_runtime_contributor_invalid");
    }
    usedRuntimeSequences.add(candidate.runtimeSequence);
    if (candidate.placement === "child") continue;
    rows.push(Object.freeze({
      kind: "transient_runtime" as const,
      slotId: candidate.slotId,
      surfaceInstanceId: candidate.surfaceInstanceId,
      runtimeSequence: candidate.runtimeSequence,
      role: candidate.role,
      phase: candidate.phase,
    }));
  }
  rows.sort(compareContributorsInternalV1);
  for (let index = 1; index < rows.length; index += 1) {
    if (sameContributorInternalV1(rows[index - 1]!, rows[index]!)) {
      throw new TypeError("ui.managed_surface_stable_reservation_contributor_duplicate");
    }
  }
  const same = rows.length === input.currentState.rootReservationContributors.length &&
    rows.every((row, index) =>
      sameContributorInternalV1(row, input.currentState.rootReservationContributors[index]!)
    );
  const sameRuntimeEntries = sameStableRuntimeEntriesInternalV1(
    stableRuntimeBindings,
    input.currentState.stableRuntimeBindings,
  );
  if (
    authorityRecord.installable && same && sameRuntimeEntries &&
    authorityRecord.pendingRuntimeAttempts.size === 0
  ) {
    return input.currentState;
  }
  if (authorityRecord.derivationDepth >= 130) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const nextState = Object.freeze({
    transientState: input.currentState.transientState,
    stableAcceptedBaselines: input.currentState.stableAcceptedBaselines,
    rootReservationContributors: same
      ? input.currentState.rootReservationContributors
      : Object.freeze(rows),
    rootReservationGenerationToken: same
      ? input.currentState.rootReservationGenerationToken
      : authorityRecord.admissionAuthority.createReservationGenerationToken(),
    stableRuntimeBindings: sameRuntimeEntries
      ? input.currentState.stableRuntimeBindings
      : Object.freeze(stableRuntimeBindings),
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: input.currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: true,
    boundRuntimeAttempts: new Map(usedRuntimeAttempts),
    pendingRuntimeAttempts: new Set(),
    stableContributorCandidates: Object.freeze(
      [...contributorCandidates],
    ),
  });
  return nextState;
}

function transientContributorCandidatesInternalV1(
  state: ManagedSurfaceReducerStateV1,
): readonly ManagedSurfaceTransientRootReservationContributorCandidateInternalV1[] {
  const contributors: ManagedSurfaceTransientRootReservationContributorCandidateInternalV1[] = [];
  for (const instance of state.publication.orderedInstances) {
    if (instance.parentInstanceId !== null) continue;
    const runtimeSequence = inspectManagedSurfaceRuntimeAttemptSequenceInternalV1(instance);
    if (runtimeSequence === null) {
      throw new TypeError("ui.managed_surface_runtime_attempt_provenance_invalid");
    }
    if (
      instance.readiness.kind !== "preparing" && instance.phase !== "active" &&
      instance.phase !== "suspended"
    ) {
      throw new TypeError("ui.managed_surface_runtime_contributor_phase_invalid");
    }
    const common = {
      kind: "transient_runtime" as const,
      placement: "root" as const,
      slotId: instance.definition.slotId,
      surfaceInstanceId: instance.surfaceInstanceId,
      runtimeSequence,
    };
    contributors.push(
      instance.readiness.kind === "preparing"
        ? Object.freeze({ ...common, role: "candidate" as const, phase: "preparing" as const })
        : Object.freeze({
          ...common,
          role: "ready_instance" as const,
          phase: instance.phase as "active" | "suspended",
        }),
    );
  }
  return Object.freeze(contributors);
}

function replaceTransientStateInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  nextTransientState: ManagedSurfaceReducerStateV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  if (currentState.transientState === nextTransientState) return currentState;
  if (authorityRecord.derivationDepth >= 130) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const baseState = Object.freeze({
    ...currentState,
    transientState: nextTransientState,
  });
  compositeStateAuthorityRecordsInternalV1.set(baseState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: false,
  });
  return reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: baseState,
    contributorCandidates: authorityRecord.stableContributorCandidates,
  });
}

function validateCompositeStateInstallInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  nextState: ManagedSurfaceStableCompositeStateInternalV1,
): void {
  const currentRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
  const nextRecord = compositeStateAuthorityRecordsInternalV1.get(nextState);
  if (
    currentRecord === undefined || nextRecord === undefined ||
    currentRecord.origin !== nextRecord.origin || !nextRecord.installable ||
    nextRecord.pendingRuntimeAttempts.size !== 0
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  if (nextState === currentState) return;
  let cursor: ManagedSurfaceStableCompositeStateInternalV1 | null = nextState;
  let remaining = 131;
  while (cursor !== currentState) {
    const record = compositeStateAuthorityRecordsInternalV1.get(cursor);
    if (record === undefined || record.origin !== currentRecord.origin || remaining <= 0) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    cursor = record.derivedFrom;
    remaining -= 1;
    if (cursor === null) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
  }
}

function finalizeCompositeStateInstallInternalV1(
  nextState: ManagedSurfaceStableCompositeStateInternalV1,
): void {
  const record = compositeStateAuthorityRecordsInternalV1.get(nextState);
  if (record === undefined) return;
  record.derivedFrom = null;
  record.derivationDepth = 0;
}

export function createManagedSurfaceStableCompositeRuntimeKernelInternalV1(input: {
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly initialTransientState: ManagedSurfaceReducerStateV1;
  readonly reportSubscriberFailure?: () => void;
}): ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceStableCompositeStateInternalV1> {
  const empty = createManagedSurfaceStableCompositeStateInternalV1({
    admissionAuthority: input.admissionAuthority,
    publisherLeaseRegistry: input.publisherLeaseRegistry,
    transientState: input.initialTransientState,
  });
  const initialState = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: empty,
    contributorCandidates: Object.freeze([]),
  });
  return createManagedSurfaceRuntimeKernelInternalV1({
    initialState,
    stateAdapter: Object.freeze({
      getTransientState: (state: ManagedSurfaceStableCompositeStateInternalV1) =>
        state.transientState,
      replaceTransientState: (
        state: ManagedSurfaceStableCompositeStateInternalV1,
        nextTransientState: ManagedSurfaceReducerStateV1,
      ) => replaceTransientStateInternalV1(state, nextTransientState),
      validateInstallState: validateCompositeStateInstallInternalV1,
      finalizeInstallState: finalizeCompositeStateInstallInternalV1,
    }),
    ...(input.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: input.reportSubscriberFailure }),
  });
}

export function projectManagedSurfaceStableRootReservationSnapshotInternalV1(input: {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly subjectPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
}): ManagedSurfaceStableRootReservationSnapshotInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(input.state);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const slots = new Set<ManagedSurfaceSlotIdV1>();
  for (const contributor of input.state.rootReservationContributors) {
    if (
      contributor.kind !== "transient_runtime" &&
      contributor.publisherLease === input.subjectPublisherLease
    ) {
      continue;
    }
    slots.add(contributor.slotId);
  }
  return Reflect.apply(
    authorityRecord.createRootReservationSnapshot,
    authorityRecord.admissionAuthority,
    [{
      subjectPublisherLease: input.subjectPublisherLease,
      generationToken: input.state.rootReservationGenerationToken,
      foreignReservedRootSlotIds: Object.freeze([...slots].sort(compareTextInternalV1)),
    }],
  ) as ManagedSurfaceStableRootReservationSnapshotInternalV1;
}
