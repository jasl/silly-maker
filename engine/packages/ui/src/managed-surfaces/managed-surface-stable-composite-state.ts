// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type DeepReadonly,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import type {
  ManagedSurfaceDismissKindV1,
  ManagedSurfaceReadinessEvidenceV1,
  ManagedSurfaceInstanceIdV1,
  ManagedSurfaceOperationV1,
  ManagedSurfacePublishedInstanceV1,
  ManagedSurfaceResolvedDefinitionV1,
  ManagedSurfaceRouteActionInputV1,
  ManagedSurfaceSlotIdV1,
  ManagedSurfaceTransitionCodeV1,
  ManagedSurfaceTransitionReceiptV1,
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
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableReservationGenerationTokenInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ManagedSurfaceStableReadinessResultInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  type ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseSnapshotInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";
import {
  deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1,
  deriveManagedSurfaceReducerTopologyProjectionInternalV1,
  reduceManagedSurfaceV1,
  type ManagedSurfaceReducerCrossAxisParentProjectionInternalV1,
  type ManagedSurfaceReducerStateV1,
  type ManagedSurfaceReducerTopologyProjectionInternalV1,
  type ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1,
} from "./managed-surface-reducer.ts";
import {
  claimManagedSurfaceRuntimeStateInstallParticipantInternalV1,
  createManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeStateInstallParticipantInternalV1,
} from "./managed-surface-runtime-kernel.ts";
import { projectManagedSurfaceTopologyPolicyInternalV1 } from "./managed-surface-topology-policy.ts";
import {
  captureManagedSurfacePreparedInputBindingContractInternalV1,
  type ManagedSurfaceContractBoundActionRouteAuthorityInternalV1,
  type ManagedSurfaceInputBindingContractV1,
  type ManagedSurfacePreparedInputBindingContractInternalV1,
} from "./managed-surface-action-route.ts";

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

/**
 * Exact ready predecessor topology retained while a single-root replacement
 * is preparing or remains in a readiness-failed gap. The root and every
 * descendant are identities already owned by the same composite state; this
 * aggregate is not a second mutable topology authority.
 */
export interface ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 {
  readonly root: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly descendants: readonly ManagedSurfaceStableReadyRuntimeInstanceInternalV1[];
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
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
  }
  | {
    readonly kind: "gap";
    readonly reason: "readiness_failed" | "parent_unavailable";
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
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
  readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
}

export interface CreateManagedSurfaceStableGapRuntimeBindingInputInternalV1 {
  readonly reason: "readiness_failed" | "parent_unavailable";
  readonly placement: "root" | "child";
  readonly slotCardinality: "single" | "stack";
  readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
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
  const retainedRecord = input.retainedSubtree === null
    ? null
    : assertAuthenticRetainedRuntimeSubtreeInternalV1(input.retainedSubtree);
  const replacement = input.transition === "primary_replacement";
  const targetPlacement = input.attempt.desiredTarget.admittedTarget.stackScope.kind;
  if (
    !hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(input.attempt.identity) ||
    targetPlacement !== input.placement ||
    replacement !== (input.retainedSubtree !== null) ||
    (replacement && (input.placement !== "root" || input.slotCardinality !== "single")) ||
    (input.transition === "initial_open" && input.placement !== "root") ||
    (input.transition === "child_open" && input.placement !== "child") ||
    (retainedRecord !== null &&
      retainedRecord.root.attempt.desiredTarget.publisherLease !==
        input.attempt.desiredTarget.publisherLease)
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return Object.freeze({
    kind: "preparing" as const,
    attempt: input.attempt,
    transition: input.transition,
    retainedSubtree: input.retainedSubtree,
  });
}

export function createManagedSurfaceStableGapRuntimeBindingInternalV1(
  input: CreateManagedSurfaceStableGapRuntimeBindingInputInternalV1,
): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "gap" }> {
  if (input.retainedSubtree !== null) {
    assertAuthenticRetainedRuntimeSubtreeInternalV1(input.retainedSubtree);
  }
  if (
    (input.reason === "parent_unavailable" &&
      (input.placement !== "child" || input.retainedSubtree !== null)) ||
    (input.retainedSubtree !== null &&
      (input.reason !== "readiness_failed" || input.placement !== "root" ||
        input.slotCardinality !== "single"))
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return Object.freeze({
    kind: "gap" as const,
    reason: input.reason,
    retainedSubtree: input.retainedSubtree,
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

interface ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1 {
  readonly sameIdentity: boolean;
  readonly beforeSize: number;
  readonly afterSize: number;
}

export interface ManagedSurfaceStableCompositePrivateProvenanceComparisonInternalV1 {
  readonly sameOrigin: boolean;
  readonly sameAdmissionAuthority: boolean;
  readonly samePublisherLeaseRegistry: boolean;
  readonly boundRuntimeAttempts: ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1;
  readonly pendingRuntimeAttempts:
    ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1;
  readonly preservedReadinessFailureGaps:
    ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1;
  readonly stableContributorCandidates:
    ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1;
  readonly after: Readonly<{
    readonly installable: boolean;
    readonly derivedFromPresent: boolean;
    readonly derivationDepth: number;
  }>;
}

type ManagedSurfaceStableUnpublishedBaselineInternalV1 = Extract<
  ManagedSurfaceStableAcceptedBaselineInternalV1,
  { readonly kind: "unpublished" }
>;

type ManagedSurfaceStablePublishedBaselineInternalV1 = Extract<
  ManagedSurfaceStableAcceptedBaselineInternalV1,
  { readonly kind: "accepted" }
>;

export type ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1 =
  | {
    readonly kind: "registered";
    readonly acceptedBaseline: ManagedSurfaceStableUnpublishedBaselineInternalV1;
  }
  | {
    readonly kind: "unchanged";
    readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  }
  | {
    readonly kind: "stale";
    readonly code: "surface.stable_publisher_lease_stale";
  }
  | {
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  };

export type ManagedSurfaceStableAdmissionContextCaptureResultInternalV1 =
  | {
    readonly kind: "captured";
    readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
    readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
  }
  | {
    readonly kind: "stale";
    readonly code: "surface.stable_publisher_lease_stale";
  }
  | {
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  };

export interface ManagedSurfaceStableCompositeStateInstallParticipantInternalV1
  extends
    ManagedSurfaceRuntimeStateInstallParticipantInternalV1<
      ManagedSurfaceStableCompositeStateInternalV1
    > {}

export interface ManagedSurfaceStableCompositeRuntimeKernelInternalV1
  extends ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceStableCompositeStateInternalV1> {
  registerStablePublisherLeaseInternalV1(
    publisherLease: unknown,
  ): ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1;
  captureAdmissionContextInternalV1(
    publisherLease: unknown,
  ): ManagedSurfaceStableAdmissionContextCaptureResultInternalV1;
  applyStableAdmissionProposalInternalV1(
    proposal: unknown,
  ): ManagedSurfaceStableReconcileResultInternalV1;
  disposeStablePublisherLeaseInternalV1(
    publisherLease: unknown,
  ): ManagedSurfaceStableReconcileResultInternalV1;
  settleStableReadinessReadyInternalV1(
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1;
  settleStableReadinessReadyWithCommitGuardInternalV1(
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1;
  settleStableReadinessFailedInternalV1(
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1;
  settleStableReadinessFailedWithCommitGuardInternalV1(
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1;
}

declare const managedSurfaceStableDirectActionTargetProofBrandInternalV1: unique symbol;

export interface ManagedSurfaceStableDirectActionTargetProofInternalV1 {
  readonly [managedSurfaceStableDirectActionTargetProofBrandInternalV1]: true;
}

declare const managedSurfaceStableExactParentTransientChildCandidateBrandInternalV1: unique symbol;

export interface ManagedSurfaceStableExactParentTransientChildCandidateInternalV1 {
  readonly [managedSurfaceStableExactParentTransientChildCandidateBrandInternalV1]: true;
}

export interface ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1 {
  readonly commitInternalV1: (
    candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  ) => boolean;
}

export type ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1 =
  | Readonly<{
    readonly kind: "installed";
    readonly candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1;
  }>
  | Readonly<{ readonly kind: "stale" }>
  | Readonly<{ readonly kind: "faulted" }>;

interface PrepareManagedSurfaceStableExactParentTransientChildInputInternalV1 {
  readonly parentProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly expectedParent: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly expectedSourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly definition: DeepReadonly<ManagedSurfaceResolvedDefinitionV1>;
  readonly semanticOccurrenceId: null;
  readonly commitGuard: ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1;
}

export interface ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 {
  prepareExactParentTransientChildInternalV1(
    input: PrepareManagedSurfaceStableExactParentTransientChildInputInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1;
}

export interface ManagedSurfaceStableReadinessCommitGuardInternalV1 {
  readonly commitInternalV1: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
  ) => boolean;
}

export type ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 =
  | Readonly<{ readonly kind: "applied" }>
  | Readonly<{ readonly kind: "stale" }>
  | Readonly<{ readonly kind: "faulted" }>;

export interface ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 {
  settleExactParentTransientChildReadinessReadyInternalV1(
    candidate: unknown,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1;
  settleExactParentTransientChildReadinessFailedInternalV1(
    candidate: unknown,
    commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1;
}

export interface ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1 {
  readonly commitInternalV1: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1,
  ) => boolean;
}

export type ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1 =
  | Readonly<{
    readonly kind: "applied";
    readonly code: "surface.closed" | "surface.dismissed";
  }>
  | Readonly<{
    readonly kind: "locked";
    readonly code: "surface.dismiss_locked";
  }>
  | Readonly<{ readonly kind: "stale" }>
  | Readonly<{ readonly kind: "faulted" }>;

export interface ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1 {
  closeExactParentTransientChildInternalV1(
    candidate: unknown,
    guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1;
  dismissExactParentTransientChildInternalV1(
    candidate: unknown,
    dismissKind: ManagedSurfaceDismissKindV1,
    guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1;
}

export type ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly contract: ManagedSurfaceInputBindingContractV1;
  }>
  | Readonly<{ readonly kind: "unavailable" }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  }>;

export interface ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1
  extends ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 {
  captureCurrentExactParentTransientChildInputInternalV1(
    candidate: unknown,
  ): ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1;
}

declare const managedSurfaceStableReadyActiveTargetProofBrandInternalV1: unique symbol;

export interface ManagedSurfaceStableReadyActiveTargetProofInternalV1 {
  readonly [managedSurfaceStableReadyActiveTargetProofBrandInternalV1]: true;
}

export type ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
    readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
    readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
  }>
  | Readonly<{ readonly kind: "unavailable" }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  }>;

export type ManagedSurfaceStableActionInputCaptureResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly contract: ManagedSurfaceInputBindingContractV1;
    readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
    readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1 | null;
    readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1 | null;
  }>
  | Readonly<{ readonly kind: "unavailable" }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
  }>;

export interface ManagedSurfaceStableActionRouteAuthorityInternalV1
  extends ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 {
  captureCurrentStableInputInternalV1(): ManagedSurfaceStableActionInputCaptureResultInternalV1;
  captureReadyActiveStableTargetInternalV1(
    target: unknown,
  ): ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1;
  isCurrentDirectTargetInternalV1(
    proof: unknown,
  ): proof is ManagedSurfaceStableDirectActionTargetProofInternalV1;
  isCurrentReadyActiveStableTargetInternalV1(
    proof: unknown,
  ): proof is ManagedSurfaceStableReadyActiveTargetProofInternalV1;
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
  readonly preservedReadinessFailureGaps: ReadonlySet<
    Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "gap" }>
  >;
  readonly stableContributorCandidates:
    readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[];
}

const compositeStateAuthorityRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeStateInternalV1,
  CompositeStateAuthorityRecordInternalV1
>();

interface CompositeRuntimeKernelConfigurationRecordInternalV1 {
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly runtimeKernel: ManagedSurfaceRuntimeKernelInternalV1<
    ManagedSurfaceStableCompositeStateInternalV1
  >;
}

const compositeRuntimeKernelConfigurationRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  CompositeRuntimeKernelConfigurationRecordInternalV1
>();

interface ManagedSurfaceStableDirectActionTargetProofRecordInternalV1 {
  readonly authority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly applicationEpoch: number;
  readonly topologyRevision: number;
  readonly instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}

interface ManagedSurfaceStableReadyActiveTargetProofRecordInternalV1 {
  readonly authority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly applicationEpoch: number;
  readonly topologyRevision: number;
  readonly instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}

const stableActionRouteAuthoritiesInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  ManagedSurfaceStableActionRouteAuthorityInternalV1
>();
const stableDirectActionTargetProofRecordsInternalV1 = new WeakMap<
  object,
  ManagedSurfaceStableDirectActionTargetProofRecordInternalV1
>();
const stableReadyActiveTargetProofRecordsInternalV1 = new WeakMap<
  object,
  ManagedSurfaceStableReadyActiveTargetProofRecordInternalV1
>();

interface ManagedSurfaceStableExactParentTransientChildClaimRecordInternalV1 {
  readonly exactClaimant: object;
  readonly authority: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1;
}

interface ManagedSurfaceStableExactParentTransientChildReadinessClaimRecordInternalV1 {
  readonly exactClaimant: object;
  readonly authority: ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1;
}

interface ManagedSurfaceStableExactParentTransientChildLifecycleClaimRecordInternalV1 {
  readonly exactClaimant: object;
  readonly authority: ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1;
}

interface ManagedSurfaceStableExactParentTransientChildActionClaimRecordInternalV1 {
  readonly exactClaimant: object;
  readonly authority: ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1;
}

interface ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1 {
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly origin: object;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly definition: DeepReadonly<ManagedSurfaceResolvedDefinitionV1>;
  readonly target: DeepReadonly<ManagedSurfacePublishedInstanceV1>["target"];
  readonly routingLeaseId: DeepReadonly<ManagedSurfacePublishedInstanceV1>["routingLeaseId"];
  readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly semanticOccurrenceId: DeepReadonly<
    ManagedSurfacePublishedInstanceV1
  >["semanticOccurrenceId"];
  readonly readinessEvidence: ManagedSurfaceReadinessEvidenceV1;
}

const stableExactParentTransientChildClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  ManagedSurfaceStableExactParentTransientChildClaimRecordInternalV1
>();
const stableExactParentTransientChildReadinessClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  ManagedSurfaceStableExactParentTransientChildReadinessClaimRecordInternalV1
>();
const stableExactParentTransientChildLifecycleClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  ManagedSurfaceStableExactParentTransientChildLifecycleClaimRecordInternalV1
>();
const stableExactParentTransientChildActionClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  ManagedSurfaceStableExactParentTransientChildActionClaimRecordInternalV1
>();
const stableExactParentTransientChildCandidateRecordsInternalV1 = new WeakMap<
  object,
  ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1
>();
const stableExactParentTransientChildInstanceRecordsInternalV1 = new WeakMap<
  object,
  ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1
>();
const recordStableExactParentTransientChildCandidateInternalV1 =
  stableExactParentTransientChildCandidateRecordsInternalV1.set.bind(
    stableExactParentTransientChildCandidateRecordsInternalV1,
  );
const recordStableExactParentTransientChildInstanceInternalV1 =
  stableExactParentTransientChildInstanceRecordsInternalV1.set.bind(
    stableExactParentTransientChildInstanceRecordsInternalV1,
  );

/** Source-relative exact configuration proof for composition-owned family adapters. */
export function matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1(
  kernel: unknown,
  admissionAuthority: unknown,
  publisherLeaseRegistry: unknown,
): boolean {
  if ((typeof kernel !== "object" && typeof kernel !== "function") || kernel === null) {
    return false;
  }
  const record = compositeRuntimeKernelConfigurationRecordsInternalV1.get(
    kernel as ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  );
  return record !== undefined && record.admissionAuthority === admissionAuthority &&
    record.publisherLeaseRegistry === publisherLeaseRegistry;
}

export function claimManagedSurfaceStableCompositeStateInstallParticipantInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
  participant: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1,
): ManagedSurfaceStableCompositeStateInstallParticipantInternalV1 {
  const configuration = compositeRuntimeKernelConfigurationRecordsInternalV1.get(kernel);
  if (configuration === undefined) {
    throw new TypeError("ui.managed_surface_runtime_state_install_participant_claim_invalid");
  }
  return claimManagedSurfaceRuntimeStateInstallParticipantInternalV1(
    configuration.runtimeKernel,
    exactClaimant,
    participant,
  );
}

/**
 * Deterministic source-relative audit seam. It exposes only frozen identity
 * comparisons and collection sizes, never the private provenance containers.
 */
export function compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
  before: ManagedSurfaceStableCompositeStateInternalV1,
  after: ManagedSurfaceStableCompositeStateInternalV1,
): ManagedSurfaceStableCompositePrivateProvenanceComparisonInternalV1 {
  const beforeRecord = compositeStateAuthorityRecordsInternalV1.get(before);
  const afterRecord = compositeStateAuthorityRecordsInternalV1.get(after);
  if (beforeRecord === undefined || afterRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const compareCollection = (
    beforeCollection: object,
    afterCollection: object,
    beforeSize: number,
    afterSize: number,
  ): ManagedSurfaceStableCompositePrivateCollectionComparisonInternalV1 =>
    Object.freeze({
      sameIdentity: beforeCollection === afterCollection,
      beforeSize,
      afterSize,
    });
  return Object.freeze({
    sameOrigin: beforeRecord.origin === afterRecord.origin,
    sameAdmissionAuthority: beforeRecord.admissionAuthority === afterRecord.admissionAuthority,
    samePublisherLeaseRegistry:
      beforeRecord.publisherLeaseRegistry === afterRecord.publisherLeaseRegistry,
    boundRuntimeAttempts: compareCollection(
      beforeRecord.boundRuntimeAttempts,
      afterRecord.boundRuntimeAttempts,
      beforeRecord.boundRuntimeAttempts.size,
      afterRecord.boundRuntimeAttempts.size,
    ),
    pendingRuntimeAttempts: compareCollection(
      beforeRecord.pendingRuntimeAttempts,
      afterRecord.pendingRuntimeAttempts,
      beforeRecord.pendingRuntimeAttempts.size,
      afterRecord.pendingRuntimeAttempts.size,
    ),
    preservedReadinessFailureGaps: compareCollection(
      beforeRecord.preservedReadinessFailureGaps,
      afterRecord.preservedReadinessFailureGaps,
      beforeRecord.preservedReadinessFailureGaps.size,
      afterRecord.preservedReadinessFailureGaps.size,
    ),
    stableContributorCandidates: compareCollection(
      beforeRecord.stableContributorCandidates,
      afterRecord.stableContributorCandidates,
      beforeRecord.stableContributorCandidates.length,
      afterRecord.stableContributorCandidates.length,
    ),
    after: Object.freeze({
      installable: afterRecord.installable,
      derivedFromPresent: afterRecord.derivedFrom !== null,
      derivationDepth: afterRecord.derivationDepth,
    }),
  });
}

const stalePublisherLeaseResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stable_publisher_lease_stale" as const,
});

const reconcileFaultResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
});

const stableZeroDeltaInternalV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

const stableAdmissionFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_admission_faulted" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReconcileResultInternalV1;
const stableReconcileFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReconcileResultInternalV1;
const stablePublisherLeaseStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stable_publisher_lease_stale" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReconcileResultInternalV1;
const stableReconcilePreconditionStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stable_reconcile_precondition_stale" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReconcileResultInternalV1;
const stablePublisherAlreadyDisposedResultInternalV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "surface.stable_publisher_already_disposed" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReconcileResultInternalV1;
const stableReadinessEpochStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stale_application_epoch" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReadinessResultInternalV1;
const stableReadinessStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stale_readiness" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReadinessResultInternalV1;
const stableReadinessFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
  delta: stableZeroDeltaInternalV1,
}) satisfies ManagedSurfaceStableReadinessResultInternalV1;

type StablePublicationAppliedResultInternalV1 = Extract<
  ManagedSurfaceStableReconcileResultInternalV1,
  { readonly kind: "applied"; readonly code: "surface.stable_publication_applied" }
>;
type StablePublisherDisposedResultInternalV1 = Extract<
  ManagedSurfaceStableReconcileResultInternalV1,
  { readonly kind: "applied"; readonly code: "surface.stable_publisher_disposed" }
>;

function stablePublicationAppliedResultInternalV1(
  delta: StablePublicationAppliedResultInternalV1["delta"],
): StablePublicationAppliedResultInternalV1 {
  return Object.freeze({
    kind: "applied" as const,
    code: "surface.stable_publication_applied" as const,
    delta: Object.freeze(delta),
  });
}

function stablePublisherDisposedResultInternalV1(
  delta: StablePublisherDisposedResultInternalV1["delta"],
): StablePublisherDisposedResultInternalV1 {
  return Object.freeze({
    kind: "applied" as const,
    code: "surface.stable_publisher_disposed" as const,
    delta: Object.freeze(delta),
  });
}

function stableReadinessAppliedResultInternalV1(
  code: "surface.readiness_ready" | "surface.readiness_failed",
  allocatedPreparationCount: number,
): Extract<ManagedSurfaceStableReadinessResultInternalV1, { readonly kind: "applied" }> {
  return Object.freeze({
    kind: "applied" as const,
    code,
    delta: Object.freeze({
      source: "unchanged" as const,
      runtime: "settle_readiness" as const,
      notificationCount: 1 as const,
      topology: "readiness_policy_derived" as const,
      runtimeAllocation: allocatedPreparationCount === 0
        ? "zero" as const
        : "preparation_count" as const,
    }),
  });
}

interface RetainedRuntimeSubtreeAuthorityRecordInternalV1 {
  readonly origin: object;
  readonly root: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly descendants: readonly ManagedSurfaceStableReadyRuntimeInstanceInternalV1[];
}

const retainedRuntimeSubtreeAuthorityRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
  RetainedRuntimeSubtreeAuthorityRecordInternalV1
>();

const retainedRuntimeSubtreeCacheInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeStateInternalV1,
  Map<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1
  >
>();

interface StablePendingChildEligibilityRecordInternalV1 {
  readonly origin: object;
  readonly parentAttempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
}

const stablePendingChildEligibilityInternalV1 = new WeakMap<
  ManagedSurfaceRuntimeAttemptIdentityInternalV1,
  StablePendingChildEligibilityRecordInternalV1
>();

interface StableReadinessFailureEligibilityRecordInternalV1 {
  readonly origin: object;
  readonly candidateAttempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
  readonly candidateBinding: Extract<
    ManagedSurfaceStableRuntimeBindingInternalV1,
    { readonly kind: "preparing" }
  >;
}

const stableReadinessFailureEligibilityInternalV1 = new WeakMap<
  Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "gap" }>,
  StableReadinessFailureEligibilityRecordInternalV1
>();

function assertAuthenticRetainedRuntimeSubtreeInternalV1(
  subtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
): RetainedRuntimeSubtreeAuthorityRecordInternalV1 {
  const record = retainedRuntimeSubtreeAuthorityRecordsInternalV1.get(subtree);
  if (
    record === undefined || subtree.root !== record.root ||
    subtree.descendants !== record.descendants
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return record;
}

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
    transientState.publication.coordinatorDisposed || registrySnapshot.disposed ||
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
    preservedReadinessFailureGaps: new Set(),
    stableContributorCandidates: Object.freeze([]),
  });
  return state;
}

/**
 * Captures the exact ready closure rooted at one current stable root. The
 * returned aggregate is authenticated to the composite origin and contains no
 * cloned runtime instance or mutable topology.
 */
export function createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1(input: {
  readonly currentState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly root: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
}): ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 {
  const record = compositeStateAuthorityRecordsInternalV1.get(input.currentState);
  if (record === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  for (const entry of input.currentState.stableRuntimeBindings) {
    if (
      entry.binding.kind !== "ready_instance" &&
      entry.binding.retainedSubtree?.root === input.root
    ) {
      return entry.binding.retainedSubtree;
    }
  }
  let cache = retainedRuntimeSubtreeCacheInternalV1.get(input.currentState);
  const cached = cache?.get(input.root);
  if (cached !== undefined) return cached;
  const readyEntries = input.currentState.stableRuntimeBindings.flatMap((entry, index) =>
    entry.binding.kind === "ready_instance"
      ? [{ entry, index, instance: entry.binding.instance }]
      : []
  );
  const rootEntry = readyEntries.find(({ instance }) => instance === input.root);
  if (
    rootEntry === undefined || input.root.attempt.parentInstanceId !== null ||
    input.root.attempt.desiredTarget.admittedTarget.stackScope.kind !== "root"
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const descendants: ManagedSurfaceStableReadyRuntimeInstanceInternalV1[] = [];
  const visited = new Set<ManagedSurfaceStableReadyRuntimeInstanceInternalV1>([input.root]);
  const visitChildren = (parent: ManagedSurfaceStableReadyRuntimeInstanceInternalV1): void => {
    const children = readyEntries
      .filter(({ instance }) =>
        instance.attempt.parentInstanceId === parent.attempt.identity.surfaceInstanceId
      )
      .sort((left, right) => {
        const leftSlot = left.entry.desiredTarget.admittedTarget.stackScope.slotId;
        const rightSlot = right.entry.desiredTarget.admittedTarget.stackScope.slotId;
        return leftSlot < rightSlot ? -1 : leftSlot > rightSlot ? 1 : left.index - right.index;
      });
    for (const { entry, instance } of children) {
      const desired = instance.attempt.desiredTarget;
      if (
        visited.has(instance) || desired.publisherLease !==
          input.root.attempt.desiredTarget.publisherLease ||
        desired.admittedTarget.stackScope.kind !== "child" ||
        desired.admittedTarget.parentOccurrenceId !==
          parent.attempt.desiredTarget.admittedTarget.occurrenceId ||
        entry.desiredTarget.admittedTarget !== desired.admittedTarget
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
      visited.add(instance);
      descendants.push(instance);
      visitChildren(instance);
    }
  };
  visitChildren(input.root);
  const frozenDescendants = Object.freeze(descendants);
  const subtree = Object.freeze({
    root: input.root,
    descendants: frozenDescendants,
  });
  retainedRuntimeSubtreeAuthorityRecordsInternalV1.set(subtree, {
    origin: record.origin,
    root: input.root,
    descendants: frozenDescendants,
  });
  cache ??= new Map();
  cache.set(input.root, subtree);
  retainedRuntimeSubtreeCacheInternalV1.set(input.currentState, cache);
  return subtree;
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

function allocateManagedSurfaceStableRuntimeAttemptBatchInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  count: number,
): Readonly<{
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly identities: readonly ManagedSurfaceRuntimeAttemptIdentityInternalV1[];
}> {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
  if (
    authorityRecord === undefined || !Number.isSafeInteger(count) || count < 0 ||
    authorityRecord.derivationDepth >= 130 || authorityRecord.pendingRuntimeAttempts.size !== 0
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  if (count === 0) return Object.freeze({ state: currentState, identities: Object.freeze([]) });
  const currentHighWater = currentState.transientState.identitySequenceHighWater;
  if (count > Number.MAX_SAFE_INTEGER - currentHighWater) {
    throw new TypeError("ui.managed_surface_id_sequence_exhausted");
  }
  const identities = Object.freeze(
    Array.from(
      { length: count },
      (_value, index) =>
        createManagedSurfaceRuntimeAttemptIdentityInternalV1(
          currentState.transientState.publication.applicationEpoch,
          parsePositiveSafeInteger(currentHighWater + index + 1),
        ),
    ),
  );
  const nextHighWater = parseNonNegativeSafeInteger(currentHighWater + count);
  const nextTransientState = Object.freeze({
    ...currentState.transientState,
    identitySequenceHighWater: nextHighWater,
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
    pendingRuntimeAttempts: new Set(identities),
  });
  return Object.freeze({ state: nextState, identities });
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
    const candidates = readyInstancesForBindingInternalV1(entry.binding);
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

function readyInstancesForBindingInternalV1(
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
): readonly ManagedSurfaceStableReadyRuntimeInstanceInternalV1[] {
  if (binding.kind === "ready_instance") return Object.freeze([binding.instance]);
  if (binding.retainedSubtree === null) return Object.freeze([]);
  return Object.freeze([
    binding.retainedSubtree.root,
    ...binding.retainedSubtree.descendants,
  ]);
}

function captureRetainedRuntimeSubtreeInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: CompositeStateAuthorityRecordInternalV1,
  subtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
): ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 {
  const subtreeRecord = retainedRuntimeSubtreeAuthorityRecordsInternalV1.get(subtree);
  if (
    subtreeRecord === undefined || subtreeRecord.origin !== record.origin ||
    subtree.root !== subtreeRecord.root || subtree.descendants !== subtreeRecord.descendants
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const expected = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
    currentState: state,
    root: subtreeRecord.root,
  });
  if (
    expected.root !== subtreeRecord.root ||
    expected.descendants.length !== subtreeRecord.descendants.length ||
    expected.descendants.some((instance, index) => instance !== subtreeRecord.descendants[index])
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const currentAggregate = state.stableRuntimeBindings.find((entry) =>
    entry.binding.kind !== "ready_instance" &&
    entry.binding.retainedSubtree?.root === subtreeRecord.root
  );
  if (
    currentAggregate !== undefined && currentAggregate.binding.kind !== "ready_instance" &&
    currentAggregate.binding.retainedSubtree !== null
  ) {
    return currentAggregate.binding.retainedSubtree;
  }
  return subtree;
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
    const retainedSubtree = binding.retainedSubtree === null
      ? null
      : captureRetainedRuntimeSubtreeInternalV1(state, record, binding.retainedSubtree);
    const existing = state.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget &&
      entry.binding.kind === "preparing" && entry.binding.attempt === attempt &&
      entry.binding.transition === binding.transition &&
      entry.binding.retainedSubtree === retainedSubtree
    );
    if (existing?.binding.kind === "preparing") return existing.binding;
    if (!pendingAttempt) {
      throw new TypeError("ui.managed_surface_stable_runtime_attempt_invalid");
    }
    return Object.freeze({
      kind: "preparing" as const,
      attempt,
      transition: binding.transition,
      retainedSubtree,
    });
  }
  if (
    binding.kind !== "gap" ||
    (binding.reason !== "readiness_failed" && binding.reason !== "parent_unavailable")
  ) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  const retainedSubtree = binding.retainedSubtree === null
    ? null
    : captureRetainedRuntimeSubtreeInternalV1(state, record, binding.retainedSubtree);
  const existing = state.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget &&
    entry.binding.kind === "gap" && entry.binding.reason === binding.reason &&
    entry.binding.retainedSubtree === retainedSubtree
  );
  if (existing?.binding.kind === "gap") return existing.binding;
  return Object.freeze({
    kind: "gap" as const,
    reason: binding.reason,
    retainedSubtree,
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
  const retainedAttempts = binding.retainedSubtree === null ? [] : [
    binding.retainedSubtree.root.attempt,
    ...binding.retainedSubtree.descendants.map((instance) => instance.attempt),
  ];
  if (binding.kind === "preparing") {
    return Object.freeze([binding.attempt, ...retainedAttempts]);
  }
  return Object.freeze(retainedAttempts);
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
    authorityRecord.preservedReadinessFailureGaps.has(binding) &&
    state.stableRuntimeBindings.some((entry) =>
      sameStableOccurrenceIdentityInternalV1(entry.desiredTarget, desired) &&
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
          binding.retainedSubtree === null)) ||
      (binding.transition === "initial_open" &&
        (placement !== "root" || binding.retainedSubtree !== null)) ||
      (binding.transition === "child_open" &&
        (placement !== "child" || binding.retainedSubtree !== null))
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  } else if (
    (binding.reason === "parent_unavailable" &&
      (placement !== "child" || binding.retainedSubtree !== null)) ||
    (binding.retainedSubtree !== null &&
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
      const readinessFailureEligibility = stableReadinessFailureEligibilityInternalV1.get(binding);
      const candidateAttempt = readinessFailureEligibility?.candidateAttempt;
      const candidateBinding = readinessFailureEligibility?.candidateBinding;
      const authenticCandidateSettlement = parentReady !== null &&
        readinessFailureEligibility?.origin === authorityRecord.origin &&
        candidateAttempt !== undefined &&
        candidateBinding?.attempt === candidateAttempt &&
        sameDesiredRuntimeTargetInternalV1(candidateAttempt.desiredTarget, desired) &&
        candidateAttempt.parentInstanceId ===
          parentReady.attempt.identity.surfaceInstanceId &&
        authorityRecord.boundRuntimeAttempts.get(candidateAttempt.identity) === candidateAttempt;
      if (
        parentReady === null ||
        (parentReady.phase !== "active" && !preservesCurrentReadinessFailure &&
          !authenticCandidateSettlement)
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
    } else {
      const identity = directAttempt?.identity;
      const pendingEligibility = identity === undefined
        ? undefined
        : stablePendingChildEligibilityInternalV1.get(identity);
      const alreadyBound = identity !== undefined &&
        authorityRecord.boundRuntimeAttempts.get(identity) === directAttempt;
      if (
        parentReady === null ||
        directAttempt?.parentInstanceId !== parentReady.attempt.identity.surfaceInstanceId ||
        (parentReady.phase !== "active" && !alreadyBound &&
          (pendingEligibility === undefined ||
            pendingEligibility.origin !== authorityRecord.origin ||
            pendingEligibility.parentAttempt !== parentReady.attempt))
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
    }
  }
  const currentReadyInstances = new Set<ManagedSurfaceStableReadyRuntimeInstanceInternalV1>();
  for (const entry of state.stableRuntimeBindings) {
    for (const instance of readyInstancesForBindingInternalV1(entry.binding)) {
      currentReadyInstances.add(instance);
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
  const retainedSubtree = binding.kind === "ready_instance" ? null : binding.retainedSubtree;
  if (retainedSubtree !== null) {
    const predecessorDesired = retainedSubtree.root.attempt.desiredTarget;
    if (
      predecessorDesired.publisherLease !== desired.publisherLease ||
      predecessorDesired.admittedTarget.occurrenceId === desired.admittedTarget.occurrenceId ||
      predecessorDesired.sourceRevision > desired.sourceRevision ||
      predecessorDesired.admittedTarget.stackScope.kind !== "root" ||
      predecessorDesired.admittedTarget.stackScope.slotId !==
        desired.admittedTarget.stackScope.slotId ||
      !currentReadyInstances.has(retainedSubtree.root) ||
      retainedSubtree.root.attempt.parentInstanceId !== null
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    const subtreeInstances = [retainedSubtree.root, ...retainedSubtree.descendants];
    const subtreeByInstanceId = new Map(
      subtreeInstances.map((instance) =>
        [
          instance.attempt.identity.surfaceInstanceId,
          instance,
        ] as const
      ),
    );
    if (subtreeByInstanceId.size !== subtreeInstances.length) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    for (const descendant of retainedSubtree.descendants) {
      const descendantDesired = descendant.attempt.desiredTarget;
      const parentInstance = descendant.attempt.parentInstanceId === null
        ? undefined
        : subtreeByInstanceId.get(descendant.attempt.parentInstanceId);
      if (
        !currentReadyInstances.has(descendant) ||
        descendantDesired.publisherLease !== desired.publisherLease ||
        descendantDesired.sourceRevision > desired.sourceRevision ||
        descendantDesired.admittedTarget.stackScope.kind !== "child" ||
        parentInstance === undefined ||
        descendantDesired.admittedTarget.parentOccurrenceId !==
          parentInstance.attempt.desiredTarget.admittedTarget.occurrenceId
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
    }
    for (const instance of subtreeInstances) {
      if (
        desiredByOccurrence.has(instance.attempt.desiredTarget.admittedTarget.occurrenceId)
      ) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
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
    if (binding.retainedSubtree !== null) {
      rows.push(rowForInstance(binding.retainedSubtree.root, "retained_predecessor"));
    }
    return Object.freeze(rows);
  }
  return binding.retainedSubtree === null
    ? Object.freeze([])
    : Object.freeze([rowForInstance(binding.retainedSubtree.root, "retained_predecessor")]);
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
    const currentEntry = input.currentState.stableRuntimeBindings.find((entry) =>
      sameDesiredRuntimeTargetInternalV1(entry.desiredTarget, candidate.desiredTarget) &&
      entry.binding === candidate.binding
    );
    stableRuntimeBindings.push(
      currentEntry ?? Object.freeze({
        desiredTarget: candidate.desiredTarget,
        binding: candidate.binding,
      }),
    );
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
    preservedReadinessFailureGaps: new Set(
      stableRuntimeBindings.flatMap((entry) =>
        entry.binding.kind === "gap" && entry.binding.reason === "readiness_failed"
          ? [entry.binding]
          : []
      ),
    ),
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
  if (nextTransientState.publication.coordinatorDisposed) {
    const nextState = Object.freeze({
      transientState: nextTransientState,
      stableAcceptedBaselines: Object.freeze([]),
      rootReservationContributors: currentState.rootReservationContributors.length === 0
        ? currentState.rootReservationContributors
        : Object.freeze([]),
      rootReservationGenerationToken: currentState.rootReservationContributors.length === 0
        ? currentState.rootReservationGenerationToken
        : authorityRecord.admissionAuthority.createReservationGenerationToken(),
      stableRuntimeBindings: Object.freeze([]),
    });
    compositeStateAuthorityRecordsInternalV1.set(nextState, {
      ...authorityRecord,
      derivedFrom: currentState,
      derivationDepth: authorityRecord.derivationDepth + 1,
      installable: true,
      boundRuntimeAttempts: new Map(),
      pendingRuntimeAttempts: new Set(),
      preservedReadinessFailureGaps: new Set(),
      stableContributorCandidates: Object.freeze([]),
    });
    return nextState;
  }
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
  return baseState;
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

interface CurrentStableBaselineInventoryInternalV1 {
  readonly byPublisherLease: ReadonlyMap<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    ManagedSurfaceStableAcceptedBaselineInternalV1
  >;
  readonly leaseSequenceByPublisherLease: ReadonlyMap<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    PositiveSafeInteger
  >;
}

function inspectCurrentStableBaselineInventoryInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
): CurrentStableBaselineInventoryInternalV1 | null {
  const registrySnapshot = authorityRecord.publisherLeaseRegistry.getSnapshot();
  if (
    registrySnapshot.disposed ||
    registrySnapshot.applicationEpoch !== state.transientState.publication.applicationEpoch
  ) {
    return null;
  }
  const byPublisherLease = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    ManagedSurfaceStableAcceptedBaselineInternalV1
  >();
  const leaseSequenceByPublisherLease = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    PositiveSafeInteger
  >();
  let previousLeaseSequence = 0;
  for (const baseline of state.stableAcceptedBaselines) {
    const publisherLease = baseline.publisherLease;
    if (byPublisherLease.has(publisherLease)) return null;
    const currentLease = Reflect.apply(
      authorityRecord.publisherLeaseRegistry.inspectCurrentLease,
      authorityRecord.publisherLeaseRegistry,
      [publisherLease],
    );
    if (currentLease === null || currentLease.leaseSequence <= previousLeaseSequence) {
      return null;
    }
    previousLeaseSequence = currentLease.leaseSequence;
    byPublisherLease.set(publisherLease, baseline);
    leaseSequenceByPublisherLease.set(publisherLease, currentLease.leaseSequence);
  }
  return Object.freeze({ byPublisherLease, leaseSequenceByPublisherLease });
}

function hasExpectedStableBaselineRuntimeCoherenceInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  inventory: CurrentStableBaselineInventoryInternalV1,
): boolean {
  const runtimeByPublisherLease = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    ManagedSurfaceStableRuntimeEntryInternalV1[]
  >();
  for (const entry of state.stableRuntimeBindings) {
    const publisherLease = entry.desiredTarget.publisherLease;
    const baseline = inventory.byPublisherLease.get(publisherLease);
    if (
      baseline?.kind !== "accepted" ||
      entry.desiredTarget.admittedTarget.publisherLease !== publisherLease ||
      entry.desiredTarget.sourceRevision !== baseline.sourceRevision ||
      entry.desiredTarget.publisherLeaseSequence !==
        inventory.leaseSequenceByPublisherLease.get(publisherLease) ||
      !baseline.targets.includes(entry.desiredTarget.admittedTarget)
    ) {
      return false;
    }
    const entries = runtimeByPublisherLease.get(publisherLease) ?? [];
    entries.push(entry);
    runtimeByPublisherLease.set(publisherLease, entries);
  }
  for (const baseline of state.stableAcceptedBaselines) {
    const entries = runtimeByPublisherLease.get(baseline.publisherLease) ?? [];
    if (baseline.kind === "unpublished") {
      if (entries.length !== 0) return false;
      continue;
    }
    const exactTargets = new Set(baseline.targets);
    if (
      exactTargets.size !== baseline.targets.length || entries.length !== exactTargets.size ||
      new Set(entries.map((entry) => entry.desiredTarget.admittedTarget)).size !== entries.length ||
      entries.some((entry) => !exactTargets.has(entry.desiredTarget.admittedTarget))
    ) {
      return false;
    }
  }
  return true;
}

function deriveRegisteredStableBaselineStateInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  acceptedBaseline: ManagedSurfaceStableUnpublishedBaselineInternalV1,
  leaseSequence: PositiveSafeInteger,
  inventory: CurrentStableBaselineInventoryInternalV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  if (authorityRecord.derivationDepth >= 130 || authorityRecord.pendingRuntimeAttempts.size > 0) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const leaseSequenceByPublisherLease = new Map(inventory.leaseSequenceByPublisherLease);
  leaseSequenceByPublisherLease.set(acceptedBaseline.publisherLease, leaseSequence);
  const stableAcceptedBaselines = Object.freeze(
    [...currentState.stableAcceptedBaselines, acceptedBaseline].sort((left, right) =>
      leaseSequenceByPublisherLease.get(left.publisherLease)! -
      leaseSequenceByPublisherLease.get(right.publisherLease)!
    ),
  );
  const nextState = Object.freeze({
    ...currentState,
    stableAcceptedBaselines,
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: true,
  });
  return nextState;
}

function deriveReplacedStableBaselineStateInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  expectedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1,
  nextBaseline: ManagedSurfaceStablePublishedBaselineInternalV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  if (authorityRecord.derivationDepth >= 130 || authorityRecord.pendingRuntimeAttempts.size > 0) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const baselineIndex = currentState.stableAcceptedBaselines.indexOf(expectedBaseline);
  if (
    baselineIndex < 0 || expectedBaseline.publisherLease !== nextBaseline.publisherLease
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const stableAcceptedBaselines = Object.freeze(
    currentState.stableAcceptedBaselines.map((baseline, index) =>
      index === baselineIndex ? nextBaseline : baseline
    ),
  );
  const nextState = Object.freeze({
    ...currentState,
    stableAcceptedBaselines,
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: true,
  });
  return nextState;
}

function deriveRemovedStableBaselineStateInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  expectedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  if (authorityRecord.derivationDepth >= 130 || authorityRecord.pendingRuntimeAttempts.size > 0) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const baselineIndex = currentState.stableAcceptedBaselines.indexOf(expectedBaseline);
  if (baselineIndex < 0) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const stableAcceptedBaselines = Object.freeze(
    currentState.stableAcceptedBaselines.filter((_baseline, index) => index !== baselineIndex),
  );
  const nextState = Object.freeze({
    ...currentState,
    stableAcceptedBaselines,
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: true,
  });
  return nextState;
}

function stableContributorCandidatesForEntriesInternalV1(
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[] {
  return Object.freeze(entries.flatMap((entry) => [
    Object.freeze({
      kind: "stable_desired" as const,
      desiredTarget: entry.desiredTarget,
    }),
    Object.freeze({
      kind: "stable_runtime" as const,
      desiredTarget: entry.desiredTarget,
      binding: entry.binding,
    }),
  ]));
}

function desiredTargetsForAcceptedBaselineInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  leaseSnapshot: ManagedSurfaceStablePublisherLeaseSnapshotInternalV1,
  baseline: ManagedSurfaceStablePublishedBaselineInternalV1,
): readonly ManagedSurfaceStableDesiredRuntimeTargetInternalV1[] {
  const desiredTargets = baseline.targets.map((admittedTarget) => {
    const occurrenceSequence = Reflect.apply(
      authorityRecord.publisherLeaseRegistry.inspectIssuedOccurrence,
      authorityRecord.publisherLeaseRegistry,
      [baseline.publisherLease, admittedTarget.occurrenceId],
    );
    if (occurrenceSequence === null) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    const desiredTarget = Object.freeze({
      publisherLease: baseline.publisherLease,
      publisherLeaseSequence: leaseSnapshot.leaseSequence,
      occurrenceSequence,
      sourceRevision: baseline.sourceRevision,
      admittedTarget,
    });
    validateDesiredTargetInternalV1(state, authorityRecord, desiredTarget);
    return desiredTarget;
  });
  return Object.freeze(desiredTargets);
}

function canonicalDesiredTargetsInternalV1(
  desiredTargets: readonly ManagedSurfaceStableDesiredRuntimeTargetInternalV1[],
): readonly ManagedSurfaceStableDesiredRuntimeTargetInternalV1[] {
  const inputIndex = new Map(
    desiredTargets.map((desiredTarget, index) => [desiredTarget.admittedTarget, index] as const),
  );
  const childrenByParent = new Map<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    ManagedSurfaceStableDesiredRuntimeTargetInternalV1[]
  >();
  const roots: ManagedSurfaceStableDesiredRuntimeTargetInternalV1[] = [];
  for (const desiredTarget of desiredTargets) {
    const scope = desiredTarget.admittedTarget.stackScope;
    if (scope.kind === "root") {
      roots.push(desiredTarget);
      continue;
    }
    const children = childrenByParent.get(scope.parentOccurrenceId) ?? [];
    children.push(desiredTarget);
    childrenByParent.set(scope.parentOccurrenceId, children);
  }
  const compareScope = (
    left: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
    right: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  ): number => {
    const slotOrder = compareTextInternalV1(
      left.admittedTarget.stackScope.slotId,
      right.admittedTarget.stackScope.slotId,
    );
    return slotOrder !== 0
      ? slotOrder
      : inputIndex.get(left.admittedTarget)! - inputIndex.get(right.admittedTarget)!;
  };
  roots.sort(compareScope);
  for (const children of childrenByParent.values()) children.sort(compareScope);

  const canonical: ManagedSurfaceStableDesiredRuntimeTargetInternalV1[] = [];
  const visited = new Set<ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"]>();
  const visit = (desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1): void => {
    const occurrenceId = desiredTarget.admittedTarget.occurrenceId;
    if (visited.has(occurrenceId)) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    visited.add(occurrenceId);
    canonical.push(desiredTarget);
    for (const child of childrenByParent.get(occurrenceId) ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  if (canonical.length !== desiredTargets.length) {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  return Object.freeze(canonical);
}

function deriveStableRuntimeVectorStateInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  stableRuntimeBindings: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
  transientState: ManagedSurfaceReducerStateV1 = currentState.transientState,
): ManagedSurfaceStableCompositeStateInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
  if (authorityRecord === undefined || authorityRecord.derivationDepth >= 130) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  if (
    stableRuntimeBindings === currentState.stableRuntimeBindings &&
    transientState === currentState.transientState
  ) {
    return currentState;
  }
  const nextState = Object.freeze({
    ...currentState,
    transientState,
    stableRuntimeBindings: stableRuntimeBindings === currentState.stableRuntimeBindings
      ? currentState.stableRuntimeBindings
      : Object.freeze([...stableRuntimeBindings]),
  });
  compositeStateAuthorityRecordsInternalV1.set(nextState, {
    ...authorityRecord,
    derivedFrom: currentState,
    derivationDepth: authorityRecord.derivationDepth + 1,
    installable: false,
  });
  return nextState;
}

type StableTopologyDefinitionInternalV1 = NonNullable<
  ReturnType<ManagedSurfaceStableAdmissionAuthorityInternalV1["inspectAdmittedTargetDefinition"]>
>;
type TransientTopologyInstanceInternalV1 =
  ManagedSurfaceReducerStateV1["publication"]["orderedInstances"][number];

type StableTopologyRuntimeBindingInternalV1 =
  | Extract<
    ManagedSurfaceStableRuntimeBindingInternalV1,
    { readonly kind: "ready_instance" | "gap" }
  >
  | Readonly<{
    readonly kind: "preparing";
    readonly transition: "initial_open" | "primary_replacement" | "child_open";
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
  }>;

interface StableTopologyRuntimeEntryInternalV1 {
  readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly binding: StableTopologyRuntimeBindingInternalV1;
}

type WholeCompositeTopologyNodeInternalV1 =
  | Readonly<{
    readonly axis: "transient";
    readonly instance: TransientTopologyInstanceInternalV1;
    readonly definition: TransientTopologyInstanceInternalV1["definition"];
    readonly lifecycle: "preparing" | "ready";
    readonly blocksLower: boolean;
  }>
  | Readonly<{
    readonly axis: "stable";
    readonly instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
    readonly definition: StableTopologyDefinitionInternalV1;
    readonly lifecycle: "preparing" | "ready";
    readonly blocksLower: boolean;
    readonly baseline: ManagedSurfaceStablePublishedBaselineInternalV1 | null;
    readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
  }>;

interface WholeCompositeTopologyProjectionInternalV1 {
  readonly stablePhaseByInstance: ReadonlyMap<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    "active" | "suspended"
  >;
  readonly transientProjection: readonly ManagedSurfaceReducerTopologyProjectionInternalV1[];
  readonly nodes: readonly WholeCompositeTopologyNodeInternalV1[];
  readonly inputNode: WholeCompositeTopologyNodeInternalV1 | null;
}

function sameStableStackScopeInternalV1(
  left: ManagedSurfaceStableAdmittedTargetInternalV1,
  right: ManagedSurfaceStableAdmittedTargetInternalV1,
): boolean {
  const leftScope = left.stackScope;
  const rightScope = right.stackScope;
  return leftScope.kind === rightScope.kind && leftScope.slotId === rightScope.slotId &&
    (leftScope.kind === "root" ||
      (rightScope.kind === "child" &&
        leftScope.parentOccurrenceId === rightScope.parentOccurrenceId));
}

function isStableTargetAncestorInternalV1(
  baseline: ManagedSurfaceStablePublishedBaselineInternalV1,
  possibleAncestor: ManagedSurfaceStableAdmittedTargetInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
): boolean {
  const byOccurrence = new Map(
    baseline.targets.map((candidate) => [candidate.occurrenceId, candidate] as const),
  );
  let parentOccurrenceId = target.parentOccurrenceId;
  let remaining = baseline.targets.length;
  while (parentOccurrenceId !== null && remaining > 0) {
    if (parentOccurrenceId === possibleAncestor.occurrenceId) return true;
    parentOccurrenceId = byOccurrence.get(parentOccurrenceId)?.parentOccurrenceId ?? null;
    remaining -= 1;
  }
  return false;
}

function hasAuthoritativeEqualLayerOrderInternalV1(
  left: WholeCompositeTopologyNodeInternalV1,
  right: WholeCompositeTopologyNodeInternalV1,
): boolean {
  if (left.axis === "transient" || right.axis === "transient") {
    return left.axis === "transient" && right.axis === "transient";
  }
  if (
    left.retainedSubtree !== null &&
    left.retainedSubtree === right.retainedSubtree
  ) {
    return true;
  }
  if (
    left.baseline === null || left.baseline !== right.baseline ||
    left.directTarget === null || right.directTarget === null
  ) {
    return false;
  }
  return sameStableStackScopeInternalV1(left.directTarget, right.directTarget) ||
    isStableTargetAncestorInternalV1(left.baseline, left.directTarget, right.directTarget) ||
    isStableTargetAncestorInternalV1(left.baseline, right.directTarget, left.directTarget);
}

function wholeCompositeTopologyNodesInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  stableRuntimeBindings: readonly StableTopologyRuntimeEntryInternalV1[] =
    state.stableRuntimeBindings,
): readonly WholeCompositeTopologyNodeInternalV1[] {
  const nodes: WholeCompositeTopologyNodeInternalV1[] = [];
  for (const instance of state.transientState.publication.orderedInstances) {
    nodes.push(Object.freeze({
      axis: "transient" as const,
      instance,
      definition: instance.definition,
      lifecycle: instance.readiness.kind === "preparing" ? "preparing" as const : "ready" as const,
      blocksLower: (instance.readiness.kind === "ready" &&
        instance.definition.modality === "blocking") ||
        (instance.readiness.kind === "preparing" &&
          (instance.readiness.transition === "initial_open" ||
            instance.readiness.transition === "child_open")),
    }));
  }
  const entryByTarget = new Map(
    stableRuntimeBindings.map((entry) => [entry.desiredTarget.admittedTarget, entry] as const),
  );
  const addReadyNode = (
    instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    metadata: Readonly<{
      readonly baseline: ManagedSurfaceStablePublishedBaselineInternalV1 | null;
      readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
      readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
    }>,
  ): void => {
    const definition = authorityRecord.admissionAuthority.inspectAdmittedTargetDefinition(
      instance.attempt.desiredTarget.admittedTarget,
    );
    if (definition === null) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    nodes.push(Object.freeze({
      axis: "stable" as const,
      instance,
      definition,
      lifecycle: "ready" as const,
      blocksLower: definition.modality === "blocking",
      ...metadata,
    }));
  };
  for (const baseline of state.stableAcceptedBaselines) {
    if (baseline.kind !== "accepted") continue;
    for (const admittedTarget of baseline.targets) {
      const entry = entryByTarget.get(admittedTarget);
      if (entry === undefined) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
      const binding = entry.binding;
      if (binding.kind === "ready_instance") {
        addReadyNode(binding.instance, {
          baseline,
          directTarget: admittedTarget,
          retainedSubtree: null,
        });
      } else if (
        binding.kind === "preparing" && binding.transition !== "primary_replacement"
      ) {
        const definition = authorityRecord.admissionAuthority.inspectAdmittedTargetDefinition(
          admittedTarget,
        );
        if (definition === null) {
          throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
        }
        nodes.push(Object.freeze({
          axis: "stable" as const,
          instance: null,
          definition,
          lifecycle: "preparing" as const,
          blocksLower: true,
          baseline,
          directTarget: admittedTarget,
          retainedSubtree: null,
        }));
      } else if (binding.retainedSubtree !== null) {
        const retainedSubtree = binding.retainedSubtree;
        for (const instance of [retainedSubtree.root, ...retainedSubtree.descendants]) {
          addReadyNode(instance, {
            baseline: null,
            directTarget: null,
            retainedSubtree,
          });
        }
      }
    }
  }
  const transientByInstanceId = new Map(
    state.transientState.publication.orderedInstances.map((instance) =>
      [instance.surfaceInstanceId, instance] as const
    ),
  );
  const stableByInstanceId = new Map<
    ManagedSurfaceInstanceIdV1,
    Extract<WholeCompositeTopologyNodeInternalV1, { readonly axis: "stable" }>
  >();
  for (const node of nodes) {
    if (node.axis !== "stable" || node.instance === null) continue;
    const instanceId = node.instance.attempt.identity.surfaceInstanceId;
    if (transientByInstanceId.has(instanceId) || stableByInstanceId.has(instanceId)) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    stableByInstanceId.set(instanceId, node);
  }
  const occupiedStableChildSlots = new Set<string>();
  for (const instance of state.transientState.publication.orderedInstances) {
    const parentInstanceId = instance.parentInstanceId;
    if (parentInstanceId === null || transientByInstanceId.has(parentInstanceId)) continue;
    const parent = stableByInstanceId.get(parentInstanceId);
    const descriptor = parent === undefined
      ? undefined
      : state.transientState.resolvedSlotDescriptors.find((candidate) =>
        candidate.kind === "child" &&
        candidate.parentDefinitionId === parent.definition.definitionId &&
        candidate.slotId === instance.definition.slotId
      );
    const parentSequence = parent === undefined || parent.instance === null ||
        !hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1(
          parent.instance.attempt.identity,
        )
      ? null
      : parent.instance.attempt.identity.allocation.sequence;
    const childSequence = inspectManagedSurfaceRuntimeAttemptSequenceInternalV1(instance);
    const slotKey = `${parentInstanceId}\u0000${instance.definition.slotId}`;
    if (
      parent === undefined || parent.instance === null ||
      parentSequence === null || childSequence === null ||
      parentSequence > state.transientState.identitySequenceHighWater ||
      childSequence > state.transientState.identitySequenceHighWater ||
      instance.definition.placement !== "child" ||
      instance.definition.ownerId !== parent.definition.ownerId ||
      instance.definition.layerId !== parent.definition.layerId ||
      instance.definition.layerOrder < parent.definition.layerOrder ||
      descriptor?.cardinality !== "single" ||
      occupiedStableChildSlots.has(slotKey)
    ) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    occupiedStableChildSlots.add(slotKey);
  }
  return Object.freeze(nodes);
}

function projectWholeCompositeTopologyInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  stableRuntimeBindings?: readonly StableTopologyRuntimeEntryInternalV1[],
): WholeCompositeTopologyProjectionInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(state);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const nodes = wholeCompositeTopologyNodesInternalV1(
    state,
    authorityRecord,
    stableRuntimeBindings,
  );
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const left = nodes[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const right = nodes[rightIndex]!;
      if (
        left.definition.layerOrder === right.definition.layerOrder &&
        !hasAuthoritativeEqualLayerOrderInternalV1(left, right)
      ) {
        throw new TypeError("ui.managed_surface_stable_topology_order_invalid");
      }
    }
  }
  const projected = projectManagedSurfaceTopologyPolicyInternalV1(
    Object.freeze(nodes.map((node) =>
      Object.freeze({
        subject: node,
        layerOrder: node.definition.layerOrder,
        lifecycle: node.lifecycle,
        blocksLower: node.blocksLower,
      })
    )),
  );
  const stablePhaseByInstance = new Map<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    "active" | "suspended"
  >();
  const transientProjection: ManagedSurfaceReducerTopologyProjectionInternalV1[] = [];
  let inputNode: WholeCompositeTopologyNodeInternalV1 | null = null;
  for (const row of projected) {
    const node = row.subject;
    if (row.phase === "active" && node.definition.inputPolicy.kind === "managed") {
      inputNode = node;
    }
    if (node.axis === "transient") {
      transientProjection.push(Object.freeze({ instance: node.instance, phase: row.phase }));
    } else if (node.instance !== null && row.phase !== "preparing") {
      stablePhaseByInstance.set(node.instance, row.phase);
    }
  }
  return Object.freeze({
    stablePhaseByInstance,
    transientProjection: Object.freeze(transientProjection),
    nodes,
    inputNode,
  });
}

function rephaseStableReadyInstanceInternalV1(
  instance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
  stablePhaseByInstance: ReadonlyMap<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    "active" | "suspended"
  >,
): ManagedSurfaceStableReadyRuntimeInstanceInternalV1 {
  const phase = stablePhaseByInstance.get(instance);
  if (phase === undefined) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return phase === instance.phase ? instance : Object.freeze({ attempt: instance.attempt, phase });
}

function rephaseRetainedRuntimeSubtreeInternalV1(
  origin: object,
  subtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
  stablePhaseByInstance: ReadonlyMap<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    "active" | "suspended"
  >,
): ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 {
  const root = rephaseStableReadyInstanceInternalV1(subtree.root, stablePhaseByInstance);
  const descendants = subtree.descendants.map((instance) =>
    rephaseStableReadyInstanceInternalV1(instance, stablePhaseByInstance)
  );
  if (
    root === subtree.root &&
    descendants.every((instance, index) => instance === subtree.descendants[index])
  ) {
    return subtree;
  }
  const frozenDescendants = Object.freeze(descendants);
  const nextSubtree = Object.freeze({ root, descendants: frozenDescendants });
  retainedRuntimeSubtreeAuthorityRecordsInternalV1.set(nextSubtree, {
    origin,
    root,
    descendants: frozenDescendants,
  });
  return nextSubtree;
}

function materializeStableTopologyPhasesInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  stablePhaseByInstance: ReadonlyMap<
    ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
    "active" | "suspended"
  >,
  stableRuntimeBindings: readonly ManagedSurfaceStableRuntimeEntryInternalV1[] =
    state.stableRuntimeBindings,
): readonly ManagedSurfaceStableRuntimeEntryInternalV1[] {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(state);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  let changed = false;
  const entries = stableRuntimeBindings.map((entry) => {
    const binding = entry.binding;
    let nextBinding = binding;
    if (binding.kind === "ready_instance") {
      const instance = rephaseStableReadyInstanceInternalV1(
        binding.instance,
        stablePhaseByInstance,
      );
      if (instance !== binding.instance) {
        nextBinding = Object.freeze({ kind: "ready_instance" as const, instance });
      }
    } else if (binding.retainedSubtree !== null) {
      const retainedSubtree = rephaseRetainedRuntimeSubtreeInternalV1(
        authorityRecord.origin,
        binding.retainedSubtree,
        stablePhaseByInstance,
      );
      if (retainedSubtree !== binding.retainedSubtree) {
        nextBinding = binding.kind === "preparing"
          ? Object.freeze({
            kind: "preparing" as const,
            attempt: binding.attempt,
            transition: binding.transition,
            retainedSubtree,
          })
          : Object.freeze({
            kind: "gap" as const,
            reason: binding.reason,
            retainedSubtree,
          });
      }
    }
    if (nextBinding === binding) return entry;
    changed = true;
    return Object.freeze({ desiredTarget: entry.desiredTarget, binding: nextBinding });
  });
  return changed ? Object.freeze(entries) : stableRuntimeBindings;
}

interface StableCanonicalPlanningSegmentInternalV1 {
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly siblingIndex: number;
}

function canonicalPlanningPathInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): readonly StableCanonicalPlanningSegmentInternalV1[] {
  const baseline = state.stableAcceptedBaselines.find((candidate) =>
    candidate.kind === "accepted" &&
    candidate.publisherLease === desiredTarget.publisherLease &&
    candidate.targets.includes(desiredTarget.admittedTarget)
  );
  if (baseline?.kind !== "accepted") {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  const byOccurrence = new Map(
    baseline.targets.map((target) => [target.occurrenceId, target] as const),
  );
  const reversed: StableCanonicalPlanningSegmentInternalV1[] = [];
  let target: ManagedSurfaceStableAdmittedTargetInternalV1 | undefined =
    desiredTarget.admittedTarget;
  let remaining = baseline.targets.length + 1;
  while (target !== undefined && remaining > 0) {
    const scope = target.stackScope;
    const siblings = baseline.targets.filter((candidate) => {
      const candidateScope = candidate.stackScope;
      return candidateScope.kind === scope.kind && candidateScope.slotId === scope.slotId &&
        (scope.kind === "root" ||
          (candidateScope.kind === "child" &&
            candidateScope.parentOccurrenceId === scope.parentOccurrenceId));
    });
    const siblingIndex = siblings.indexOf(target);
    if (siblingIndex < 0) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    reversed.push(Object.freeze({ slotId: scope.slotId, siblingIndex }));
    target = target.parentOccurrenceId === null
      ? undefined
      : byOccurrence.get(target.parentOccurrenceId);
    remaining -= 1;
  }
  if (target !== undefined) {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  return Object.freeze(reversed.toReversed());
}

interface StableCanonicalPreparationRequestInternalV1 {
  readonly path: readonly StableCanonicalPlanningSegmentInternalV1[];
}

interface StableChildPreparationRequestInternalV1
  extends StableCanonicalPreparationRequestInternalV1 {
  readonly entry: ManagedSurfaceStableRuntimeEntryInternalV1;
  readonly parentInstance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
}

function compareStableCanonicalPreparationRequestInternalV1(
  left: StableCanonicalPreparationRequestInternalV1,
  right: StableCanonicalPreparationRequestInternalV1,
): number {
  const length = Math.min(left.path.length, right.path.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left.path[index]!;
    const rightSegment = right.path[index]!;
    const slotOrder = compareTextInternalV1(leftSegment.slotId, rightSegment.slotId);
    if (slotOrder !== 0) return slotOrder;
    if (leftSegment.siblingIndex !== rightSegment.siblingIndex) {
      return leftSegment.siblingIndex - rightSegment.siblingIndex;
    }
  }
  return left.path.length - right.path.length;
}

interface WholeCompositeReflowPlanInternalV1 {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly allocatedPreparationCount: number;
}

function stableReadyInstanceIdsInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  stableRuntimeBindings: readonly StableTopologyRuntimeEntryInternalV1[] =
    state.stableRuntimeBindings,
): ReadonlySet<ManagedSurfaceInstanceIdV1> {
  const instanceIds = new Set<ManagedSurfaceInstanceIdV1>();
  for (const entry of stableRuntimeBindings) {
    const instances = entry.binding.kind === "ready_instance"
      ? [entry.binding.instance]
      : entry.binding.retainedSubtree === null
      ? []
      : [
        entry.binding.retainedSubtree.root,
        ...entry.binding.retainedSubtree.descendants,
      ];
    for (const instance of instances) {
      const instanceId = instance.attempt.identity.surfaceInstanceId;
      if (instanceIds.has(instanceId)) {
        throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
      }
      instanceIds.add(instanceId);
    }
  }
  return instanceIds;
}

function cascadeRetiredStableParentTransientChildrenInternalV1(
  beforeState: ManagedSurfaceStableCompositeStateInternalV1,
  seedState: ManagedSurfaceStableCompositeStateInternalV1,
  prospectiveStableRuntimeBindings: readonly StableTopologyRuntimeEntryInternalV1[] =
    seedState.stableRuntimeBindings,
): ManagedSurfaceStableCompositeStateInternalV1 {
  projectWholeCompositeTopologyInternalV1(beforeState);
  const beforeStableInstanceIds = stableReadyInstanceIdsInternalV1(beforeState);
  const seedStableInstanceIds = stableReadyInstanceIdsInternalV1(
    seedState,
    prospectiveStableRuntimeBindings,
  );
  const beforeTransientInstanceIds = new Set(
    beforeState.transientState.publication.orderedInstances.map((instance) =>
      instance.surfaceInstanceId
    ),
  );
  const retiredCrossAxisParentIds = new Set<ManagedSurfaceInstanceIdV1>();
  for (const instance of beforeState.transientState.publication.orderedInstances) {
    const parentInstanceId = instance.parentInstanceId;
    if (
      parentInstanceId !== null && !beforeTransientInstanceIds.has(parentInstanceId) &&
      beforeStableInstanceIds.has(parentInstanceId) &&
      !seedStableInstanceIds.has(parentInstanceId)
    ) {
      retiredCrossAxisParentIds.add(parentInstanceId);
    }
  }
  if (retiredCrossAxisParentIds.size === 0) return seedState;

  let transientState = seedState.transientState;
  const roots = transientState.publication.orderedInstances.filter((instance) =>
    instance.parentInstanceId !== null &&
    retiredCrossAxisParentIds.has(instance.parentInstanceId)
  );
  for (const root of roots) {
    if (
      !transientState.publication.orderedInstances.some((instance) =>
        instance.surfaceInstanceId === root.surfaceInstanceId
      )
    ) {
      continue;
    }
    const reduced = root.readiness.kind === "preparing"
      ? reduceManagedSurfaceV1(transientState, {
        kind: "readiness_failed",
        evidence: Object.freeze({
          applicationEpoch: transientState.publication.applicationEpoch,
          surfaceInstanceId: root.surfaceInstanceId,
        }),
      })
      : reduceManagedSurfaceV1(transientState, {
        kind: "close_expected",
        evidence: Object.freeze({
          applicationEpoch: transientState.publication.applicationEpoch,
          topologyRevision: transientState.publication.topologyRevision,
          surfaceInstanceId: root.surfaceInstanceId,
        }),
      });
    if (
      reduced.receipt.kind !== "applied" ||
      (reduced.receipt.code !== "surface.closed" &&
        reduced.receipt.code !== "surface.readiness_failed")
    ) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    transientState = reduced.state;
  }
  return transientState === seedState.transientState
    ? seedState
    : replaceTransientStateInternalV1(seedState, transientState);
}

function planWholeCompositeReflowInternalV1(input: {
  readonly beforeState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly seedState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly transientRevisionMode: ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1;
}): WholeCompositeReflowPlanInternalV1 {
  const seedState = cascadeRetiredStableParentTransientChildrenInternalV1(
    input.beforeState,
    input.seedState,
  );
  const seedRecord = compositeStateAuthorityRecordsInternalV1.get(seedState);
  const inventory = seedRecord === undefined
    ? null
    : inspectCurrentStableBaselineInventoryInternalV1(seedState, seedRecord);
  if (
    seedRecord === undefined || inventory === null ||
    !hasExpectedStableBaselineRuntimeCoherenceInternalV1(seedState, inventory)
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const preliminary = projectWholeCompositeTopologyInternalV1(seedState);
  const beforeActiveAttempts = new Set(
    input.beforeState.stableRuntimeBindings.flatMap((entry) =>
      entry.binding.kind === "ready_instance" && entry.binding.instance.phase === "active"
        ? [entry.binding.instance.attempt]
        : []
    ),
  );
  const newlyActiveParents = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    Map<
      ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
      ManagedSurfaceStableReadyRuntimeInstanceInternalV1
    >
  >();
  for (const entry of seedState.stableRuntimeBindings) {
    if (
      entry.binding.kind !== "ready_instance" ||
      preliminary.stablePhaseByInstance.get(entry.binding.instance) !== "active"
    ) {
      continue;
    }
    if (beforeActiveAttempts.has(entry.binding.instance.attempt)) continue;
    let newlyActiveByOccurrence = newlyActiveParents.get(entry.desiredTarget.publisherLease);
    if (newlyActiveByOccurrence === undefined) {
      newlyActiveByOccurrence = new Map();
      newlyActiveParents.set(entry.desiredTarget.publisherLease, newlyActiveByOccurrence);
    }
    newlyActiveByOccurrence.set(
      entry.desiredTarget.admittedTarget.occurrenceId,
      entry.binding.instance,
    );
  }
  const requests: StableChildPreparationRequestInternalV1[] = [];
  for (const entry of seedState.stableRuntimeBindings) {
    const scope = entry.desiredTarget.admittedTarget.stackScope;
    if (
      scope.kind !== "child" || entry.binding.kind !== "gap"
    ) {
      continue;
    }
    const parentInstance = entry.binding.reason === "parent_unavailable"
      ? newlyActiveParents.get(entry.desiredTarget.publisherLease)?.get(
        scope.parentOccurrenceId,
      )
      : undefined;
    if (parentInstance !== undefined) {
      requests.push(Object.freeze({
        entry,
        parentInstance,
        path: canonicalPlanningPathInternalV1(seedState, entry.desiredTarget),
      }));
    }
  }
  requests.sort(compareStableCanonicalPreparationRequestInternalV1);
  for (let index = 1; index < requests.length; index += 1) {
    if (
      compareStableCanonicalPreparationRequestInternalV1(
        requests[index - 1]!,
        requests[index]!,
      ) === 0
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
  }
  const allocated = allocateManagedSurfaceStableRuntimeAttemptBatchInternalV1(
    seedState,
    requests.length,
  );
  let planningState = allocated.state;
  let entries = planningState.stableRuntimeBindings;
  if (requests.length > 0) {
    const desiredByOccurrence = new Map(
      entries.map((entry) =>
        [entry.desiredTarget.admittedTarget.occurrenceId, entry.desiredTarget] as const
      ),
    );
    const replacementByEntry = new Map<
      ManagedSurfaceStableRuntimeEntryInternalV1,
      ManagedSurfaceStableRuntimeEntryInternalV1
    >();
    const planningRecord = compositeStateAuthorityRecordsInternalV1.get(planningState);
    if (planningRecord === undefined) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    requests.forEach((request, index) => {
      const identity = allocated.identities[index]!;
      const attempt = Object.freeze({
        desiredTarget: request.entry.desiredTarget,
        identity,
        parentInstanceId: request.parentInstance.attempt.identity.surfaceInstanceId,
      });
      stablePendingChildEligibilityInternalV1.set(identity, {
        origin: planningRecord.origin,
        parentAttempt: request.parentInstance.attempt,
      });
      const binding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
        attempt,
        transition: "child_open",
        placement: "child",
        slotCardinality: slotCardinalityForDesiredInternalV1(
          planningState,
          planningRecord,
          request.entry.desiredTarget,
          desiredByOccurrence,
        ),
        retainedSubtree: null,
      });
      replacementByEntry.set(
        request.entry,
        Object.freeze({ desiredTarget: request.entry.desiredTarget, binding }),
      );
    });
    entries = Object.freeze(entries.map((entry) => replacementByEntry.get(entry) ?? entry));
    planningState = deriveStableRuntimeVectorStateInternalV1(planningState, entries);
  }
  const finalProjection = projectWholeCompositeTopologyInternalV1(planningState);
  const phasedEntries = materializeStableTopologyPhasesInternalV1(
    planningState,
    finalProjection.stablePhaseByInstance,
  );
  const transientState = deriveManagedSurfaceReducerTopologyProjectionInternalV1({
    state: planningState.transientState,
    projection: finalProjection.transientProjection,
    revisionMode: input.transientRevisionMode,
  });
  planningState = deriveStableRuntimeVectorStateInternalV1(
    planningState,
    phasedEntries,
    transientState,
  );
  const state = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: planningState,
    contributorCandidates: stableContributorCandidatesForEntriesInternalV1(
      planningState.stableRuntimeBindings,
    ),
  });
  return Object.freeze({ state, allocatedPreparationCount: requests.length });
}

function planStableReadinessSettlementInternalV1(input: {
  readonly currentState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly candidateEntry:
    & ManagedSurfaceStableRuntimeEntryInternalV1
    & Readonly<{
      readonly binding: Extract<
        ManagedSurfaceStableRuntimeBindingInternalV1,
        { readonly kind: "preparing" }
      >;
    }>;
  readonly outcome: "ready" | "failed";
}): WholeCompositeReflowPlanInternalV1 {
  const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(input.currentState);
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const desiredByOccurrence = new Map(
    input.currentState.stableRuntimeBindings.map((entry) =>
      [entry.desiredTarget.admittedTarget.occurrenceId, entry.desiredTarget] as const
    ),
  );
  const definition = validateDesiredTargetInternalV1(
    input.currentState,
    authorityRecord,
    input.candidateEntry.desiredTarget,
  );
  if (definition === null) {
    throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
  }
  const binding: ManagedSurfaceStableRuntimeBindingInternalV1 = input.outcome === "ready"
    ? createManagedSurfaceStableReadyRuntimeBindingInternalV1({
      attempt: input.candidateEntry.binding.attempt,
      phase: "active",
    })
    : createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: definition.placement,
      slotCardinality: slotCardinalityForDesiredInternalV1(
        input.currentState,
        authorityRecord,
        input.candidateEntry.desiredTarget,
        desiredByOccurrence,
      ),
      retainedSubtree: input.candidateEntry.binding.retainedSubtree,
    });
  if (binding.kind === "gap") {
    stableReadinessFailureEligibilityInternalV1.set(binding, {
      origin: authorityRecord.origin,
      candidateAttempt: input.candidateEntry.binding.attempt,
      candidateBinding: input.candidateEntry.binding,
    });
  }
  const entries = Object.freeze(
    input.currentState.stableRuntimeBindings.map((entry) =>
      entry === input.candidateEntry
        ? Object.freeze({ desiredTarget: entry.desiredTarget, binding })
        : entry
    ),
  );
  const seedState = deriveStableRuntimeVectorStateInternalV1(input.currentState, entries);
  return planWholeCompositeReflowInternalV1({
    beforeState: input.currentState,
    seedState,
    transientRevisionMode: "advance_direct_transition",
  });
}

interface StableRuntimePlanInternalV1 {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly allocatedPreparationCount: number;
  readonly cascadePreparationCount: number;
  readonly subjectRuntimeBefore: readonly ManagedSurfaceStableRuntimeEntryInternalV1[];
}

type StableOwnedRuntimeDispositionInternalV1 = "none" | "nonobservable" | "observable";

function stableOwnedRuntimeDispositionInternalV1(
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): StableOwnedRuntimeDispositionInternalV1 {
  let disposition: StableOwnedRuntimeDispositionInternalV1 = "none";
  for (const entry of entries) {
    const binding = entry.binding;
    if (binding.kind !== "gap" || binding.retainedSubtree !== null) return "observable";
    if (binding.reason === "parent_unavailable") disposition = "nonobservable";
  }
  return disposition;
}

function planStableRuntimeForProposalInternalV1(input: {
  readonly currentState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly authorityRecord: CompositeStateAuthorityRecordInternalV1;
  readonly leaseSnapshot: ManagedSurfaceStablePublisherLeaseSnapshotInternalV1;
  readonly proposal: ManagedSurfaceStableAdmissionProposalInternalV1;
}): StableRuntimePlanInternalV1 {
  const subjectPublisherLease = input.proposal.captured.lease;
  const subjectRuntimeBefore = Object.freeze(
    input.currentState.stableRuntimeBindings.filter((entry) =>
      entry.desiredTarget.publisherLease === subjectPublisherLease
    ),
  );
  const otherRuntimeEntries = input.currentState.stableRuntimeBindings.filter((entry) =>
    entry.desiredTarget.publisherLease !== subjectPublisherLease
  );
  let planningState = deriveReplacedStableBaselineStateInternalV1(
    input.currentState,
    input.authorityRecord,
    input.proposal.captured.acceptedBaseline,
    input.proposal.nextAcceptedBaseline,
  );
  const desiredTargets = desiredTargetsForAcceptedBaselineInternalV1(
    planningState,
    compositeStateAuthorityRecordsInternalV1.get(planningState)!,
    input.leaseSnapshot,
    input.proposal.nextAcceptedBaseline,
  );
  const canonicalDesiredTargets = canonicalDesiredTargetsInternalV1(desiredTargets);
  const desiredByOccurrence = new Map(
    desiredTargets.map((desiredTarget) =>
      [desiredTarget.admittedTarget.occurrenceId, desiredTarget] as const
    ),
  );
  const currentByOccurrence = new Map(
    subjectRuntimeBefore.map((entry) =>
      [entry.desiredTarget.admittedTarget.occurrenceId, entry] as const
    ),
  );
  interface StableProposalPreparationIntentInternalV1 {
    readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
    readonly transition: "initial_open" | "primary_replacement" | "child_open";
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
  }

  interface StableProposalPlannedEntryInternalV1 {
    readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
    readonly binding: ManagedSurfaceStableRuntimeBindingInternalV1 | null;
    readonly preparation: StableProposalPreparationIntentInternalV1 | null;
  }

  interface StableProposalPreparationRequestInternalV1
    extends StableCanonicalPreparationRequestInternalV1, StableProposalPreparationIntentInternalV1 {
    readonly parentInstance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null;
    readonly cascade: boolean;
  }

  const parentUnavailableGap = (
    desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  ): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "gap" }> => {
    const record = compositeStateAuthorityRecordsInternalV1.get(planningState);
    if (record === undefined || desiredTarget.admittedTarget.stackScope.kind !== "child") {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    return createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "parent_unavailable",
      placement: "child",
      slotCardinality: slotCardinalityForDesiredInternalV1(
        planningState,
        record,
        desiredTarget,
        desiredByOccurrence,
      ),
      retainedSubtree: null,
    });
  };

  const rootPreparation = (
    desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
    transition: "initial_open" | "primary_replacement",
    retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null,
  ): StableProposalPreparationIntentInternalV1 =>
    Object.freeze({ desiredTarget, transition, retainedSubtree });

  const childPreparation = (
    desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  ): StableProposalPreparationIntentInternalV1 =>
    Object.freeze({
      desiredTarget,
      transition: "child_open" as const,
      retainedSubtree: null,
    });

  const plannedSubjectEntries: StableProposalPlannedEntryInternalV1[] = [];

  for (const desiredTarget of canonicalDesiredTargets) {
    const occurrenceId = desiredTarget.admittedTarget.occurrenceId;
    const currentEntry = currentByOccurrence.get(occurrenceId);
    let binding: ManagedSurfaceStableRuntimeBindingInternalV1 | null;
    let preparation: StableProposalPreparationIntentInternalV1 | null = null;
    if (currentEntry?.binding.kind === "ready_instance") {
      binding = currentEntry.binding;
    } else if (
      currentEntry?.binding.kind === "gap" &&
      currentEntry.binding.reason === "parent_unavailable"
    ) {
      binding = currentEntry.binding;
    } else if (currentEntry?.binding.kind === "preparing") {
      if (desiredTarget.admittedTarget.stackScope.kind === "child") {
        binding = parentUnavailableGap(desiredTarget);
        preparation = childPreparation(desiredTarget);
      } else {
        if (currentEntry.binding.transition === "child_open") {
          throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
        }
        binding = null;
        preparation = rootPreparation(
          desiredTarget,
          currentEntry.binding.transition,
          currentEntry.binding.retainedSubtree,
        );
      }
    } else if (
      currentEntry?.binding.kind === "gap" &&
      currentEntry.binding.reason === "readiness_failed"
    ) {
      if (desiredTarget.admittedTarget.stackScope.kind === "child") {
        binding = currentEntry.binding;
        preparation = childPreparation(desiredTarget);
      } else {
        const transition = currentEntry.binding.retainedSubtree === null
          ? "initial_open" as const
          : "primary_replacement" as const;
        binding = null;
        preparation = rootPreparation(
          desiredTarget,
          transition,
          currentEntry.binding.retainedSubtree,
        );
      }
    } else if (desiredTarget.admittedTarget.stackScope.kind === "child") {
      binding = parentUnavailableGap(desiredTarget);
      preparation = childPreparation(desiredTarget);
    } else {
      const record = compositeStateAuthorityRecordsInternalV1.get(planningState);
      if (record === undefined) {
        throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
      }
      const slotCardinality = slotCardinalityForDesiredInternalV1(
        planningState,
        record,
        desiredTarget,
        desiredByOccurrence,
      );
      let retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null = null;
      if (slotCardinality === "single") {
        const currentPredecessor = subjectRuntimeBefore.find((entry) =>
          entry.desiredTarget.admittedTarget.stackScope.kind === "root" &&
          entry.desiredTarget.admittedTarget.stackScope.slotId ===
            desiredTarget.admittedTarget.stackScope.slotId &&
          entry.desiredTarget.admittedTarget.occurrenceId !== occurrenceId
        );
        if (currentPredecessor?.binding.kind === "ready_instance") {
          retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
            currentState: input.currentState,
            root: currentPredecessor.binding.instance,
          });
        } else if (
          currentPredecessor !== undefined &&
          currentPredecessor.binding.retainedSubtree !== null
        ) {
          retainedSubtree = currentPredecessor.binding.retainedSubtree;
        }
      }
      binding = null;
      preparation = rootPreparation(
        desiredTarget,
        retainedSubtree === null ? "initial_open" : "primary_replacement",
        retainedSubtree,
      );
    }
    plannedSubjectEntries.push(Object.freeze({ desiredTarget, binding, preparation }));
  }

  const topologyEntries: readonly StableTopologyRuntimeEntryInternalV1[] = Object.freeze([
    ...otherRuntimeEntries,
    ...plannedSubjectEntries.map((entry) => {
      if (entry.binding !== null) {
        return Object.freeze({ desiredTarget: entry.desiredTarget, binding: entry.binding });
      }
      if (entry.preparation === null) {
        throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
      }
      return Object.freeze({
        desiredTarget: entry.desiredTarget,
        binding: Object.freeze({
          kind: "preparing" as const,
          transition: entry.preparation.transition,
          retainedSubtree: entry.preparation.retainedSubtree,
        }),
      });
    }),
  ]);
  planningState = cascadeRetiredStableParentTransientChildrenInternalV1(
    input.currentState,
    planningState,
    topologyEntries,
  );
  const preliminaryProjection = projectWholeCompositeTopologyInternalV1(
    planningState,
    topologyEntries,
  );
  const beforeActiveAttempts = new Set(
    input.currentState.stableRuntimeBindings.flatMap((entry) =>
      entry.binding.kind === "ready_instance" && entry.binding.instance.phase === "active"
        ? [entry.binding.instance.attempt]
        : []
    ),
  );
  const activeParents = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    Map<
      ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
      ManagedSurfaceStableReadyRuntimeInstanceInternalV1
    >
  >();
  const newlyActiveParents = new Map<
    ManagedSurfaceStablePublisherLeaseInternalV1,
    Map<
      ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
      ManagedSurfaceStableReadyRuntimeInstanceInternalV1
    >
  >();
  for (const entry of topologyEntries) {
    if (
      entry.binding.kind !== "ready_instance" ||
      preliminaryProjection.stablePhaseByInstance.get(entry.binding.instance) !== "active"
    ) {
      continue;
    }
    let byOccurrence = activeParents.get(entry.desiredTarget.publisherLease);
    if (byOccurrence === undefined) {
      byOccurrence = new Map();
      activeParents.set(entry.desiredTarget.publisherLease, byOccurrence);
    }
    byOccurrence.set(entry.desiredTarget.admittedTarget.occurrenceId, entry.binding.instance);
    if (beforeActiveAttempts.has(entry.binding.instance.attempt)) continue;
    let newlyActiveByOccurrence = newlyActiveParents.get(entry.desiredTarget.publisherLease);
    if (newlyActiveByOccurrence === undefined) {
      newlyActiveByOccurrence = new Map();
      newlyActiveParents.set(entry.desiredTarget.publisherLease, newlyActiveByOccurrence);
    }
    newlyActiveByOccurrence.set(
      entry.desiredTarget.admittedTarget.occurrenceId,
      entry.binding.instance,
    );
  }

  const requests: StableProposalPreparationRequestInternalV1[] = [];
  const requestedTargets = new Set<ManagedSurfaceStableAdmittedTargetInternalV1>();
  const addRequest = (
    preparation: StableProposalPreparationIntentInternalV1,
    parentInstance: ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null,
    cascade: boolean,
  ): void => {
    if (requestedTargets.has(preparation.desiredTarget.admittedTarget)) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
    requestedTargets.add(preparation.desiredTarget.admittedTarget);
    requests.push(Object.freeze({
      ...preparation,
      parentInstance,
      cascade,
      path: canonicalPlanningPathInternalV1(planningState, preparation.desiredTarget),
    }));
  };
  for (const entry of plannedSubjectEntries) {
    const preparation = entry.preparation;
    if (preparation === null) continue;
    const scope = entry.desiredTarget.admittedTarget.stackScope;
    if (scope.kind === "root") {
      addRequest(preparation, null, false);
      continue;
    }
    const parentInstance = activeParents.get(entry.desiredTarget.publisherLease)?.get(
      scope.parentOccurrenceId,
    );
    if (parentInstance !== undefined) addRequest(preparation, parentInstance, false);
  }
  for (const entry of topologyEntries) {
    const scope = entry.desiredTarget.admittedTarget.stackScope;
    if (
      scope.kind !== "child" || entry.binding.kind !== "gap" ||
      entry.binding.reason !== "parent_unavailable" ||
      requestedTargets.has(entry.desiredTarget.admittedTarget)
    ) {
      continue;
    }
    const parentInstance = newlyActiveParents.get(entry.desiredTarget.publisherLease)?.get(
      scope.parentOccurrenceId,
    );
    if (parentInstance !== undefined) {
      addRequest(childPreparation(entry.desiredTarget), parentInstance, true);
    }
  }
  requests.sort(compareStableCanonicalPreparationRequestInternalV1);
  for (let index = 1; index < requests.length; index += 1) {
    if (
      compareStableCanonicalPreparationRequestInternalV1(
        requests[index - 1]!,
        requests[index]!,
      ) === 0
    ) {
      throw new TypeError("ui.managed_surface_stable_runtime_target_invalid");
    }
  }

  const allocated = allocateManagedSurfaceStableRuntimeAttemptBatchInternalV1(
    planningState,
    requests.length,
  );
  planningState = allocated.state;
  const planningRecord = compositeStateAuthorityRecordsInternalV1.get(planningState);
  if (planningRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const allDesiredByOccurrence = new Map(
    topologyEntries.map((entry) =>
      [entry.desiredTarget.admittedTarget.occurrenceId, entry.desiredTarget] as const
    ),
  );
  const bindingByTarget = new Map<
    ManagedSurfaceStableAdmittedTargetInternalV1,
    ManagedSurfaceStableRuntimeBindingInternalV1
  >();
  requests.forEach((request, index) => {
    const identity = allocated.identities[index]!;
    const attempt = Object.freeze({
      desiredTarget: request.desiredTarget,
      identity,
      parentInstanceId: request.parentInstance?.attempt.identity.surfaceInstanceId ?? null,
    });
    if (request.parentInstance !== null) {
      stablePendingChildEligibilityInternalV1.set(identity, {
        origin: planningRecord.origin,
        parentAttempt: request.parentInstance.attempt,
      });
    }
    const binding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt,
      transition: request.transition,
      placement: request.desiredTarget.admittedTarget.stackScope.kind,
      slotCardinality: slotCardinalityForDesiredInternalV1(
        planningState,
        planningRecord,
        request.desiredTarget,
        allDesiredByOccurrence,
      ),
      retainedSubtree: request.retainedSubtree,
    });
    bindingByTarget.set(request.desiredTarget.admittedTarget, binding);
  });

  const otherEntries = otherRuntimeEntries.map((entry) => {
    const binding = bindingByTarget.get(entry.desiredTarget.admittedTarget);
    return binding === undefined
      ? entry
      : Object.freeze({ desiredTarget: entry.desiredTarget, binding });
  });
  const subjectEntries = plannedSubjectEntries.map((entry) => {
    const binding = bindingByTarget.get(entry.desiredTarget.admittedTarget) ?? entry.binding;
    if (binding === null) {
      throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    return Object.freeze({ desiredTarget: entry.desiredTarget, binding });
  });
  const finalEntries = Object.freeze([...otherEntries, ...subjectEntries]);
  const phasedFinalEntries = Object.freeze(finalEntries.map((entry) => {
    if (entry.binding.kind !== "ready_instance") return entry;
    const instance = rephaseStableReadyInstanceInternalV1(
      entry.binding.instance,
      preliminaryProjection.stablePhaseByInstance,
    );
    return instance === entry.binding.instance ? entry : Object.freeze({
      desiredTarget: entry.desiredTarget,
      binding: Object.freeze({ kind: "ready_instance" as const, instance }),
    });
  }));
  const seedState = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: planningState,
    contributorCandidates: stableContributorCandidatesForEntriesInternalV1(
      phasedFinalEntries,
    ),
  });
  const reflow = planWholeCompositeReflowInternalV1({
    beforeState: input.currentState,
    seedState,
    transientRevisionMode: "advance_direct_transition",
  });
  if (reflow.allocatedPreparationCount !== 0) {
    throw new TypeError("ui.managed_surface_stable_runtime_binding_invalid");
  }
  return Object.freeze({
    state: reflow.state,
    allocatedPreparationCount: requests.length,
    cascadePreparationCount: requests.filter((request) => request.cascade).length,
    subjectRuntimeBefore,
  });
}

function appliedDeltaForProposalInternalV1(
  proposal: ManagedSurfaceStableAdmissionProposalInternalV1,
  plan: StableRuntimePlanInternalV1,
): StablePublicationAppliedResultInternalV1["delta"] {
  if (proposal.nextAcceptedBaseline.targets.length === 0) {
    if (proposal.relation === "initial") {
      return Object.freeze({
        source: "accept_empty" as const,
        runtime: "unchanged" as const,
        notificationCount: 1 as const,
        topology: "unchanged" as const,
        runtimeAllocation: "zero" as const,
      });
    }
    if (proposal.relation === "greater_same") {
      return Object.freeze({
        source: "advance_cursor" as const,
        runtime: "unchanged" as const,
        notificationCount: 1 as const,
        topology: "unchanged" as const,
        runtimeAllocation: "zero" as const,
      });
    }
    if (plan.cascadePreparationCount > 0) {
      return Object.freeze({
        source: "accept_empty" as const,
        runtime: "retire_owned_targets_and_prepare_unblocked_children" as const,
        notificationCount: 1 as const,
        topology: "readiness_policy_derived" as const,
        runtimeAllocation: "preparation_count" as const,
      });
    }
    const runtimeDisposition = stableOwnedRuntimeDispositionInternalV1(
      plan.subjectRuntimeBefore,
    );
    if (runtimeDisposition === "none") {
      return Object.freeze({
        source: "accept_empty" as const,
        runtime: "unchanged" as const,
        notificationCount: 1 as const,
        topology: "unchanged" as const,
        runtimeAllocation: "zero" as const,
      });
    }
    return Object.freeze({
      source: "accept_empty" as const,
      runtime: "retire_owned_targets" as const,
      notificationCount: 1 as const,
      topology: runtimeDisposition === "observable" ? "changed" as const : "unchanged" as const,
      runtimeAllocation: "zero" as const,
    });
  }
  if (proposal.relation === "greater_same" && plan.allocatedPreparationCount === 0) {
    return Object.freeze({
      source: "advance_cursor" as const,
      runtime: "unchanged" as const,
      notificationCount: 1 as const,
      topology: "unchanged" as const,
      runtimeAllocation: "zero" as const,
    });
  }
  if (proposal.relation === "greater_same") {
    return Object.freeze({
      source: "advance_cursor" as const,
      runtime: "retry_gaps" as const,
      notificationCount: 1 as const,
      topology: "readiness_policy_derived" as const,
      runtimeAllocation: "preparation_count" as const,
    });
  }
  return Object.freeze({
    source: "replace_vector" as const,
    runtime: "retain_retire_prepare" as const,
    notificationCount: 1 as const,
    topology: "readiness_policy_derived" as const,
    runtimeAllocation: "preparation_count" as const,
  });
}

interface StablePublisherDisposePlanInternalV1 {
  readonly kind: "dispose";
  readonly expectedState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly nextState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly result: StablePublisherDisposedResultInternalV1;
}

function planStablePublisherDisposeInternalV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  authorityRecord: CompositeStateAuthorityRecordInternalV1,
  publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
  acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1,
): StablePublisherDisposePlanInternalV1 {
  const subjectRuntime = currentState.stableRuntimeBindings.filter((entry) =>
    entry.desiredTarget.publisherLease === publisherLease
  );
  const otherRuntime = currentState.stableRuntimeBindings.filter((entry) =>
    entry.desiredTarget.publisherLease !== publisherLease
  );
  const baselineState = deriveRemovedStableBaselineStateInternalV1(
    currentState,
    authorityRecord,
    acceptedBaseline,
  );
  const seedState = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: baselineState,
    contributorCandidates: stableContributorCandidatesForEntriesInternalV1(otherRuntime),
  });
  const reflow = planWholeCompositeReflowInternalV1({
    beforeState: currentState,
    seedState,
    transientRevisionMode: "advance_direct_transition",
  });
  const nextState = reflow.state;
  const runtimeDisposition = stableOwnedRuntimeDispositionInternalV1(subjectRuntime);
  const result = reflow.allocatedPreparationCount > 0
    ? stablePublisherDisposedResultInternalV1(Object.freeze({
      source: "remove_lease" as const,
      runtime: "retire_owned_targets_and_prepare_unblocked_children" as const,
      notificationCount: 1 as const,
      topology: "readiness_policy_derived" as const,
      runtimeAllocation: "preparation_count" as const,
    }))
    : runtimeDisposition !== "none"
    ? stablePublisherDisposedResultInternalV1(Object.freeze({
      source: "remove_lease" as const,
      runtime: "retire_owned_targets" as const,
      notificationCount: 1 as const,
      topology: runtimeDisposition === "observable" ? "changed" as const : "unchanged" as const,
      runtimeAllocation: "zero" as const,
    }))
    : stablePublisherDisposedResultInternalV1(Object.freeze({
      source: "remove_lease" as const,
      runtime: "unchanged" as const,
      notificationCount: 1 as const,
      topology: "unchanged" as const,
      runtimeAllocation: "zero" as const,
    }));
  return Object.freeze({
    kind: "dispose" as const,
    expectedState: currentState,
    nextState,
    publisherLease,
    result,
  });
}

export function createManagedSurfaceStableCompositeRuntimeKernelInternalV1(input: {
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly initialTransientState: ManagedSurfaceReducerStateV1;
  readonly reportSubscriberFailure?: () => void;
}): ManagedSurfaceStableCompositeRuntimeKernelInternalV1 {
  const admissionAuthority = input.admissionAuthority;
  const publisherLeaseRegistry = input.publisherLeaseRegistry;
  const initialTransientState = input.initialTransientState;
  const reportSubscriberFailure = input.reportSubscriberFailure;
  const empty = createManagedSurfaceStableCompositeStateInternalV1({
    admissionAuthority,
    publisherLeaseRegistry,
    transientState: initialTransientState,
  });
  const initialState = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: empty,
    contributorCandidates: Object.freeze([]),
  });
  const disposePublisherLeaseRegistry = publisherLeaseRegistry.dispose;
  const runtimeKernel = createManagedSurfaceRuntimeKernelInternalV1({
    initialState,
    stateAdapter: Object.freeze({
      getTransientState: (state: ManagedSurfaceStableCompositeStateInternalV1) =>
        state.transientState,
      replaceTransientState: (
        state: ManagedSurfaceStableCompositeStateInternalV1,
        nextTransientState: ManagedSurfaceReducerStateV1,
      ) => replaceTransientStateInternalV1(state, nextTransientState),
      finalizeTransientTransition: (
        currentState: ManagedSurfaceStableCompositeStateInternalV1,
        reducerSuccessorState: ManagedSurfaceStableCompositeStateInternalV1,
        operation: ManagedSurfaceOperationV1,
        reducerReceipt: ManagedSurfaceTransitionReceiptV1,
      ) => {
        const applicableActionRoute = reducerReceipt.kind === "unchanged" &&
          reducerReceipt.code === "surface.action_routed" && operation.kind === "route_action";
        if (reducerReceipt.kind !== "applied" && !applicableActionRoute) {
          return Object.freeze({ state: reducerSuccessorState, receipt: reducerReceipt });
        }
        const protectedChildren = currentStableExactParentTransientChildrenForKernelInternalV1(
          compositeKernel,
          currentState,
        );
        const protectedChild = protectedChildren.find(({ instance }) => {
          if (operationTargetsStableExactParentTransientChildInternalV1(operation, instance)) {
            return true;
          }
          const successor = reducerSuccessorState.transientState.publication.orderedInstances.find(
            (candidate) => candidate.surfaceInstanceId === instance.surfaceInstanceId,
          );
          return successor !== instance;
        });
        if (protectedChild !== undefined) {
          return Object.freeze({
            state: currentState,
            receipt: stableActionRouteReceiptInternalV1(
              currentState,
              "rejected",
              "surface.invalid_transition",
              Object.hasOwn(reducerReceipt, "surfaceInstanceId")
                ? protectedChild.instance.surfaceInstanceId
                : undefined,
            ),
          });
        }
        if (applicableActionRoute) {
          return Object.freeze({ state: reducerSuccessorState, receipt: reducerReceipt });
        }
        try {
          const reflow = planWholeCompositeReflowInternalV1({
            beforeState: currentState,
            seedState: reducerSuccessorState,
            transientRevisionMode: "coalesce_existing_transition",
          });
          return Object.freeze({ state: reflow.state, receipt: reducerReceipt });
        } catch {
          const topologyRevision = currentState.transientState.publication.topologyRevision;
          const receipt: ManagedSurfaceTransitionReceiptV1 = Object.freeze({
            kind: "faulted" as const,
            code: "surface.transition_faulted" as const,
            beforeTopologyRevision: topologyRevision,
            afterTopologyRevision: topologyRevision,
          });
          return Object.freeze({ state: currentState, receipt });
        }
      },
      prepareTerminalTransientTransition: (
        _currentState: ManagedSurfaceStableCompositeStateInternalV1,
        reducerSuccessorState: ManagedSurfaceStableCompositeStateInternalV1,
      ) =>
        Object.freeze({
          state: reducerSuccessorState,
          commitGate: () => {
            Reflect.apply(disposePublisherLeaseRegistry, publisherLeaseRegistry, []);
          },
        }),
      validateInstallState: validateCompositeStateInstallInternalV1,
      finalizeInstallState: finalizeCompositeStateInstallInternalV1,
    }),
    ...(reportSubscriberFailure === undefined ? {} : { reportSubscriberFailure }),
  });
  const publisherLeaseDisposalAuthority =
    claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(
      publisherLeaseRegistry,
    );
  const inspectPublisherLeaseDisposal =
    publisherLeaseDisposalAuthority.inspectPublisherLeaseDisposal;
  const disposeCurrentPublisherLease = publisherLeaseDisposalAuthority.disposeCurrentPublisherLease;
  const settleStableReadiness = (
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    outcome: "ready" | "failed",
  ): ManagedSurfaceStableReadinessResultInternalV1 =>
    runtimeKernel.transitionStateInternalV1<ManagedSurfaceStableReadinessResultInternalV1>(
      (currentState) => {
        const readinessEvidence: ManagedSurfaceReadinessEvidenceV1 = envelope.readinessEvidence;
        const applicationEpoch = readinessEvidence.applicationEpoch;
        if (applicationEpoch !== currentState.transientState.publication.applicationEpoch) {
          return Object.freeze({
            state: currentState,
            result: stableReadinessEpochStaleResultInternalV1,
          });
        }
        const surfaceInstanceId = readinessEvidence.surfaceInstanceId;
        const candidate = currentState.stableRuntimeBindings.find((entry) =>
          entry.binding.kind === "preparing" &&
          entry.binding.attempt.identity.surfaceInstanceId === surfaceInstanceId
        );
        if (candidate?.binding.kind !== "preparing") {
          return Object.freeze({
            state: currentState,
            result: stableReadinessStaleResultInternalV1,
          });
        }
        const publisherLease = envelope.publisherLease;
        if (
          publisherLease !== candidate.desiredTarget.publisherLease ||
          publisherLease !== candidate.binding.attempt.desiredTarget.publisherLease
        ) {
          return Object.freeze({
            state: currentState,
            result: stableReadinessStaleResultInternalV1,
          });
        }
        const sourceRevision = envelope.sourceRevision;
        if (
          sourceRevision !== candidate.desiredTarget.sourceRevision ||
          sourceRevision !== candidate.binding.attempt.desiredTarget.sourceRevision
        ) {
          return Object.freeze({
            state: currentState,
            result: stableReadinessStaleResultInternalV1,
          });
        }
        const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
        const inventory = authorityRecord === undefined
          ? null
          : inspectCurrentStableBaselineInventoryInternalV1(currentState, authorityRecord);
        if (
          authorityRecord === undefined || inventory === null ||
          !hasExpectedStableBaselineRuntimeCoherenceInternalV1(currentState, inventory)
        ) {
          return Object.freeze({
            state: currentState,
            result: stableReadinessFaultedResultInternalV1,
          });
        }
        try {
          const plan = planStableReadinessSettlementInternalV1({
            currentState,
            candidateEntry: candidate as
              & ManagedSurfaceStableRuntimeEntryInternalV1
              & Readonly<{
                readonly binding: Extract<
                  ManagedSurfaceStableRuntimeBindingInternalV1,
                  { readonly kind: "preparing" }
                >;
              }>,
            outcome,
          });
          return Object.freeze({
            state: plan.state,
            result: stableReadinessAppliedResultInternalV1(
              outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed",
              plan.allocatedPreparationCount,
            ),
          });
        } catch {
          return Object.freeze({
            state: currentState,
            result: stableReadinessFaultedResultInternalV1,
          });
        }
      },
    );
  const settleStableReadinessWithCommitGuard = (
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    outcome: "ready" | "failed",
    commitGuardInput: ManagedSurfaceStableReadinessCommitGuardInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1 => {
    const currentState = runtimeKernel.getStateInternalV1();
    const readinessEvidence: ManagedSurfaceReadinessEvidenceV1 = envelope.readinessEvidence;
    if (
      readinessEvidence.applicationEpoch !==
        currentState.transientState.publication.applicationEpoch
    ) {
      return stableReadinessEpochStaleResultInternalV1;
    }
    const candidate = currentState.stableRuntimeBindings.find((entry) =>
      entry.binding.kind === "preparing" &&
      entry.binding.attempt.identity.surfaceInstanceId === readinessEvidence.surfaceInstanceId
    );
    if (candidate?.binding.kind !== "preparing") return stableReadinessStaleResultInternalV1;
    if (
      envelope.publisherLease !== candidate.desiredTarget.publisherLease ||
      envelope.publisherLease !== candidate.binding.attempt.desiredTarget.publisherLease ||
      envelope.sourceRevision !== candidate.desiredTarget.sourceRevision ||
      envelope.sourceRevision !== candidate.binding.attempt.desiredTarget.sourceRevision
    ) {
      return stableReadinessStaleResultInternalV1;
    }
    let commitGuard: CapturedStableReadinessCommitGuardInternalV1 | null;
    try {
      commitGuard = captureStableReadinessCommitGuardInternalV1(commitGuardInput);
    } catch {
      return stableReadinessFaultedResultInternalV1;
    }
    if (commitGuard === null) return stableReadinessFaultedResultInternalV1;

    let nextState: ManagedSurfaceStableCompositeStateInternalV1;
    let result: ManagedSurfaceStableReadinessResultInternalV1;
    let contractToken: ManagedSurfacePreparedInputBindingContractInternalV1 | null;
    try {
      const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
      const inventory = authorityRecord === undefined
        ? null
        : inspectCurrentStableBaselineInventoryInternalV1(currentState, authorityRecord);
      if (
        authorityRecord === undefined || inventory === null ||
        !hasExpectedStableBaselineRuntimeCoherenceInternalV1(currentState, inventory)
      ) {
        return stableReadinessFaultedResultInternalV1;
      }
      const plan = planStableReadinessSettlementInternalV1({
        currentState,
        candidateEntry: candidate as
          & ManagedSurfaceStableRuntimeEntryInternalV1
          & Readonly<{
            readonly binding: Extract<
              ManagedSurfaceStableRuntimeBindingInternalV1,
              { readonly kind: "preparing" }
            >;
          }>,
        outcome,
      });
      nextState = plan.state;
      result = stableReadinessAppliedResultInternalV1(
        outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed",
        plan.allocatedPreparationCount,
      );
      const contract = managedSurfaceInputBindingContractForCompositeStateInternalV1(nextState);
      contractToken = contract === null
        ? null
        : captureManagedSurfacePreparedInputBindingContractInternalV1(contract);
    } catch {
      return runtimeKernel.getStateInternalV1() === currentState
        ? stableReadinessFaultedResultInternalV1
        : stableReadinessStaleResultInternalV1;
    }

    let prepared: ReturnType<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1["prepareStateInstallInternalV1"]
    >;
    try {
      prepared = runtimeKernel.prepareStateInstallInternalV1(currentState, nextState);
    } catch {
      return runtimeKernel.getStateInternalV1() === currentState
        ? stableReadinessFaultedResultInternalV1
        : stableReadinessStaleResultInternalV1;
    }
    let guardFaulted = false;
    const installResult = runtimeKernel.commitPreparedStateInstallInternalV1(
      prepared,
      () => {
        try {
          const committed = Reflect.apply(commitGuard.callable, commitGuard.receiver, [
            contractToken,
          ]);
          if (committed !== true && committed !== false) guardFaulted = true;
          return committed === true;
        } catch {
          guardFaulted = true;
          return false;
        }
      },
    );
    if (installResult === "installed") return result;
    return guardFaulted
      ? stableReadinessFaultedResultInternalV1
      : stableReadinessStaleResultInternalV1;
  };
  const compositeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1 = Object.freeze({
    ...runtimeKernel,
    registerStablePublisherLeaseInternalV1(
      publisherLeaseInput: unknown,
    ): ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1 {
      return runtimeKernel.transitionStateInternalV1<
        ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1
      >((currentState) => {
        const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
        if (authorityRecord === undefined) {
          return Object.freeze({
            state: currentState,
            result: reconcileFaultResultInternalV1,
          });
        }
        const inventory = inspectCurrentStableBaselineInventoryInternalV1(
          currentState,
          authorityRecord,
        );
        if (inventory === null) {
          return Object.freeze({
            state: currentState,
            result: reconcileFaultResultInternalV1,
          });
        }
        const currentLease = Reflect.apply(
          authorityRecord.publisherLeaseRegistry.inspectCurrentLease,
          authorityRecord.publisherLeaseRegistry,
          [publisherLeaseInput],
        );
        if (currentLease === null) {
          return Object.freeze({
            state: currentState,
            result: stalePublisherLeaseResultInternalV1,
          });
        }
        const publisherLease = publisherLeaseInput as ManagedSurfaceStablePublisherLeaseInternalV1;
        const currentBaseline = inventory.byPublisherLease.get(publisherLease);
        if (currentBaseline !== undefined) {
          return Object.freeze({
            state: currentState,
            result: Object.freeze({
              kind: "unchanged" as const,
              acceptedBaseline: currentBaseline,
            }),
          });
        }
        const acceptedBaseline = Reflect.apply(
          authorityRecord.admissionAuthority.createUnpublishedBaseline,
          authorityRecord.admissionAuthority,
          [publisherLease],
        ) as ManagedSurfaceStableUnpublishedBaselineInternalV1;
        const nextState = deriveRegisteredStableBaselineStateInternalV1(
          currentState,
          authorityRecord,
          acceptedBaseline,
          currentLease.leaseSequence,
          inventory,
        );
        return Object.freeze({
          state: nextState,
          result: Object.freeze({
            kind: "registered" as const,
            acceptedBaseline,
          }),
        });
      });
    },
    captureAdmissionContextInternalV1(
      publisherLeaseInput: unknown,
    ): ManagedSurfaceStableAdmissionContextCaptureResultInternalV1 {
      const currentState = runtimeKernel.getStateInternalV1();
      if (currentState.transientState.publication.coordinatorDisposed) {
        throw new TypeError("ui.managed_surface_coordinator_disposed");
      }
      const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
      if (authorityRecord === undefined) return reconcileFaultResultInternalV1;
      const inventory = inspectCurrentStableBaselineInventoryInternalV1(
        currentState,
        authorityRecord,
      );
      if (inventory === null) return reconcileFaultResultInternalV1;
      const currentLease = Reflect.apply(
        authorityRecord.publisherLeaseRegistry.inspectCurrentLease,
        authorityRecord.publisherLeaseRegistry,
        [publisherLeaseInput],
      );
      if (currentLease === null) return stalePublisherLeaseResultInternalV1;
      const publisherLease = publisherLeaseInput as ManagedSurfaceStablePublisherLeaseInternalV1;
      const acceptedBaseline = inventory.byPublisherLease.get(publisherLease);
      if (acceptedBaseline === undefined) return reconcileFaultResultInternalV1;
      return Object.freeze({
        kind: "captured" as const,
        acceptedBaseline,
        reservationSnapshot: projectManagedSurfaceStableRootReservationSnapshotInternalV1({
          state: currentState,
          subjectPublisherLease: publisherLease,
        }),
      });
    },
    settleStableReadinessReadyInternalV1(
      envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    ): ManagedSurfaceStableReadinessResultInternalV1 {
      return settleStableReadiness(envelope, "ready");
    },
    settleStableReadinessReadyWithCommitGuardInternalV1(
      envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
      commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
    ): ManagedSurfaceStableReadinessResultInternalV1 {
      return settleStableReadinessWithCommitGuard(envelope, "ready", commitGuard);
    },
    settleStableReadinessFailedInternalV1(
      envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    ): ManagedSurfaceStableReadinessResultInternalV1 {
      return settleStableReadiness(envelope, "failed");
    },
    settleStableReadinessFailedWithCommitGuardInternalV1(
      envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
      commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
    ): ManagedSurfaceStableReadinessResultInternalV1 {
      return settleStableReadinessWithCommitGuard(envelope, "failed", commitGuard);
    },
    applyStableAdmissionProposalInternalV1(
      proposalInput: unknown,
    ): ManagedSurfaceStableReconcileResultInternalV1 {
      return runtimeKernel.transitionStateInternalV1<
        ManagedSurfaceStableReconcileResultInternalV1
      >((currentState) => {
        const proposal = admissionAuthority.inspectAdmissionProposal(proposalInput);
        if (proposal === null) {
          return Object.freeze({
            state: currentState,
            result: stableAdmissionFaultedResultInternalV1,
          });
        }
        const leaseSnapshot = Reflect.apply(
          publisherLeaseRegistry.inspectCurrentLease,
          publisherLeaseRegistry,
          [proposal.captured.lease],
        ) as ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
        if (leaseSnapshot === null) {
          return Object.freeze({
            state: currentState,
            result: stablePublisherLeaseStaleResultInternalV1,
          });
        }
        const currentBaseline = currentState.stableAcceptedBaselines.find((baseline) =>
          baseline.publisherLease === proposal.captured.lease
        );
        if (currentBaseline !== proposal.captured.acceptedBaseline) {
          return Object.freeze({
            state: currentState,
            result: stableReconcilePreconditionStaleResultInternalV1,
          });
        }
        if (
          currentState.rootReservationGenerationToken !==
            proposal.captured.reservationSnapshot.generationToken
        ) {
          return Object.freeze({
            state: currentState,
            result: stableReconcilePreconditionStaleResultInternalV1,
          });
        }
        const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
        const inventory = authorityRecord === undefined
          ? null
          : inspectCurrentStableBaselineInventoryInternalV1(currentState, authorityRecord);
        if (
          authorityRecord === undefined || inventory === null ||
          !hasExpectedStableBaselineRuntimeCoherenceInternalV1(currentState, inventory)
        ) {
          return Object.freeze({
            state: currentState,
            result: stableReconcileFaultedResultInternalV1,
          });
        }
        try {
          const plan = planStableRuntimeForProposalInternalV1({
            currentState,
            authorityRecord,
            leaseSnapshot,
            proposal,
          });
          return Object.freeze({
            state: plan.state,
            result: stablePublicationAppliedResultInternalV1(
              appliedDeltaForProposalInternalV1(proposal, plan),
            ),
          });
        } catch {
          return Object.freeze({
            state: currentState,
            result: stableReconcileFaultedResultInternalV1,
          });
        }
      });
    },
    disposeStablePublisherLeaseInternalV1(
      publisherLeaseInput: unknown,
    ): ManagedSurfaceStableReconcileResultInternalV1 {
      type DisposePreflightInternalV1 =
        | {
          readonly kind: "result";
          readonly result: ManagedSurfaceStableReconcileResultInternalV1;
        }
        | StablePublisherDisposePlanInternalV1;
      const preflight = runtimeKernel.transitionStateInternalV1<DisposePreflightInternalV1>(
        (currentState) => {
          const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
          if (authorityRecord === undefined) {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stableReconcileFaultedResultInternalV1,
              }),
            });
          }
          const inventory = inspectCurrentStableBaselineInventoryInternalV1(
            currentState,
            authorityRecord,
          );
          if (
            inventory === null ||
            !hasExpectedStableBaselineRuntimeCoherenceInternalV1(currentState, inventory)
          ) {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stableReconcileFaultedResultInternalV1,
              }),
            });
          }
          const inspection = Reflect.apply(
            inspectPublisherLeaseDisposal,
            publisherLeaseDisposalAuthority,
            [publisherLeaseInput],
          );
          const publisherLease =
            publisherLeaseInput as ManagedSurfaceStablePublisherLeaseInternalV1;
          const acceptedBaseline = inventory.byPublisherLease.get(publisherLease);
          if (inspection === "stale") {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stablePublisherLeaseStaleResultInternalV1,
              }),
            });
          }
          if (inspection === "already_disposed" && acceptedBaseline === undefined) {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stablePublisherAlreadyDisposedResultInternalV1,
              }),
            });
          }
          if (inspection !== "current" || acceptedBaseline === undefined) {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stableReconcileFaultedResultInternalV1,
              }),
            });
          }
          try {
            const plan = planStablePublisherDisposeInternalV1(
              currentState,
              authorityRecord,
              publisherLease,
              acceptedBaseline,
            );
            return Object.freeze({ state: currentState, result: plan });
          } catch {
            return Object.freeze({
              state: currentState,
              result: Object.freeze({
                kind: "result" as const,
                result: stableReconcileFaultedResultInternalV1,
              }),
            });
          }
        },
      );
      if (preflight.kind === "result") return preflight.result;

      const prepared = runtimeKernel.prepareStateInstallInternalV1(
        preflight.expectedState,
        preflight.nextState,
      );
      let disposalCommitResult:
        | ReturnType<
          ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1[
            "disposeCurrentPublisherLease"
          ]
        >
        | null = null;
      const installResult = runtimeKernel.commitPreparedStateInstallInternalV1(
        prepared,
        () => {
          disposalCommitResult = Reflect.apply(
            disposeCurrentPublisherLease,
            publisherLeaseDisposalAuthority,
            [preflight.publisherLease],
          );
          return disposalCommitResult === "disposed";
        },
      );
      return installResult === "installed" && disposalCommitResult === "disposed"
        ? preflight.result
        : stableReconcileFaultedResultInternalV1;
    },
  });
  compositeRuntimeKernelConfigurationRecordsInternalV1.set(compositeKernel, {
    admissionAuthority,
    publisherLeaseRegistry,
    runtimeKernel,
  });
  return compositeKernel;
}

function stableActionRouteReceiptInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  kind: ManagedSurfaceTransitionReceiptV1["kind"],
  code: ManagedSurfaceTransitionCodeV1,
  surfaceInstanceId?: ManagedSurfaceInstanceIdV1,
): ManagedSurfaceTransitionReceiptV1 {
  const topologyRevision = state.transientState.publication.topologyRevision;
  return Object.freeze({
    kind,
    code,
    beforeTopologyRevision: topologyRevision,
    afterTopologyRevision: topologyRevision,
    ...(surfaceInstanceId === undefined ? {} : { surfaceInstanceId }),
  }) as ManagedSurfaceTransitionReceiptV1;
}

const stableExactParentTransientChildReadinessAppliedResultInternalV1 = Object.freeze({
  kind: "applied" as const,
});
const stableExactParentTransientChildReadinessStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
});
const stableExactParentTransientChildReadinessFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
});
const stableExactParentTransientChildLifecycleClosedResultInternalV1 = Object.freeze({
  kind: "applied" as const,
  code: "surface.closed" as const,
});
const stableExactParentTransientChildLifecycleDismissedResultInternalV1 = Object.freeze({
  kind: "applied" as const,
  code: "surface.dismissed" as const,
});
const stableExactParentTransientChildLifecycleLockedResultInternalV1 = Object.freeze({
  kind: "locked" as const,
  code: "surface.dismiss_locked" as const,
});
const stableExactParentTransientChildLifecycleStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
});
const stableExactParentTransientChildLifecycleFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
});

function isStableExactParentTransientChildLifecycleDismissKindInternalV1(
  value: unknown,
): value is ManagedSurfaceDismissKindV1 {
  return value === "back" || value === "escape" || value === "backdrop" ||
    value === "routed_cancel";
}

const stableExactParentTransientChildActionUnavailableResultInternalV1 = Object.freeze({
  kind: "unavailable" as const,
});
const stableExactParentTransientChildActionFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
});

interface CapturedStableReadinessCommitGuardInternalV1 {
  readonly receiver: object;
  readonly callable: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
  ) => unknown;
}

function captureStableReadinessCommitGuardInternalV1(
  guard: unknown,
): CapturedStableReadinessCommitGuardInternalV1 | null {
  if ((typeof guard !== "object" && typeof guard !== "function") || guard === null) {
    return null;
  }
  const keys = Reflect.ownKeys(guard);
  const descriptor = Object.getOwnPropertyDescriptor(guard, "commitInternalV1");
  if (
    !Object.isFrozen(guard) || keys.length !== 1 || keys[0] !== "commitInternalV1" ||
    descriptor === undefined || !("value" in descriptor) ||
    typeof descriptor.value !== "function"
  ) {
    return null;
  }
  return Object.freeze({ receiver: guard, callable: descriptor.value });
}

interface CapturedStableExactParentTransientChildLifecycleCommitGuardInternalV1 {
  readonly receiver: object;
  readonly callable: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1,
  ) => unknown;
}

function captureStableExactParentTransientChildLifecycleCommitGuardInternalV1(
  guard: unknown,
): CapturedStableExactParentTransientChildLifecycleCommitGuardInternalV1 | null {
  if ((typeof guard !== "object" && typeof guard !== "function") || guard === null) {
    return null;
  }
  const keys = Reflect.ownKeys(guard);
  const descriptor = Object.getOwnPropertyDescriptor(guard, "commitInternalV1");
  if (
    !Object.isFrozen(guard) || keys.length !== 1 || keys[0] !== "commitInternalV1" ||
    descriptor === undefined || !("value" in descriptor) ||
    typeof descriptor.value !== "function"
  ) {
    return null;
  }
  return Object.freeze({ receiver: guard, callable: descriptor.value });
}

function managedSurfaceInputBindingContractForCompositeStateInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
): ManagedSurfaceInputBindingContractV1 | null {
  const projection = projectWholeCompositeTopologyInternalV1(state);
  const inputNode = projection.inputNode;
  if (inputNode === null || inputNode.definition.inputPolicy.kind !== "managed") return null;
  const publication = state.transientState.publication;
  if (inputNode.instance === null) return null;
  const surfaceInstanceId = inputNode.axis === "transient"
    ? inputNode.instance.surfaceInstanceId
    : inputNode.instance.attempt.identity.surfaceInstanceId;
  const routingLeaseId = inputNode.axis === "transient"
    ? inputNode.instance.routingLeaseId
    : inputNode.instance.attempt.identity.routingLeaseId;
  return Object.freeze({
    applicationEpoch: publication.applicationEpoch,
    ownerId: inputNode.definition.ownerId,
    surfaceInstanceId,
    inputContextId: inputNode.definition.inputPolicy.inputContextId,
    routingLeaseId,
    actionIds: Object.freeze([...inputNode.definition.actionIds]),
    topologyRevision: publication.topologyRevision,
  });
}

type CurrentStableExactParentTransientChildInspectionInternalV1 =
  | Readonly<{
    readonly kind: "current";
    readonly instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>;
    readonly projection: WholeCompositeTopologyProjectionInternalV1;
  }>
  | Readonly<{ readonly kind: "unavailable" }>
  | Readonly<{ readonly kind: "faulted" }>;

function inspectCurrentStableExactParentTransientChildInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  record: ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1,
): CurrentStableExactParentTransientChildInspectionInternalV1 {
  const currentAuthority = compositeStateAuthorityRecordsInternalV1.get(state);
  if (currentAuthority === undefined || record.origin !== currentAuthority.origin) {
    return stableExactParentTransientChildReadinessFaultedResultInternalV1;
  }
  const instance = state.transientState.publication.orderedInstances.find((candidate) =>
    candidate.surfaceInstanceId === record.surfaceInstanceId
  );
  if (instance === undefined) {
    return stableExactParentTransientChildActionUnavailableResultInternalV1;
  }
  if (
    instance.definition !== record.definition ||
    instance.target !== record.target ||
    instance.routingLeaseId !== record.routingLeaseId ||
    instance.parentInstanceId !== record.parentInstanceId ||
    instance.semanticOccurrenceId !== record.semanticOccurrenceId
  ) {
    return stableExactParentTransientChildActionUnavailableResultInternalV1;
  }
  try {
    const projection = projectWholeCompositeTopologyInternalV1(state);
    const node = projection.nodes.find((candidate) =>
      candidate.axis === "transient" && candidate.instance === instance
    );
    if (node === undefined || node.axis !== "transient") {
      return stableExactParentTransientChildReadinessFaultedResultInternalV1;
    }
    const parentInstanceId = instance.parentInstanceId;
    const parent = parentInstanceId === null
      ? undefined
      : projection.nodes.find((candidate) =>
        candidate.axis === "stable" && candidate.instance !== null &&
        candidate.instance.attempt.identity.surfaceInstanceId === parentInstanceId
      );
    if (parent === undefined || parent.axis !== "stable" || parent.instance === null) {
      return stableExactParentTransientChildReadinessFaultedResultInternalV1;
    }
    return Object.freeze({ kind: "current" as const, instance, projection });
  } catch {
    return stableExactParentTransientChildReadinessFaultedResultInternalV1;
  }
}

function currentStableExactParentTransientChildrenForKernelInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  state: ManagedSurfaceStableCompositeStateInternalV1,
): readonly Readonly<{
  readonly instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>;
  readonly record: ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1;
}>[] {
  const current: Readonly<{
    readonly instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>;
    readonly record: ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1;
  }>[] = [];
  for (const instance of state.transientState.publication.orderedInstances) {
    const record = stableExactParentTransientChildInstanceRecordsInternalV1.get(instance);
    if (record?.kernel === kernel) current.push(Object.freeze({ instance, record }));
  }
  return Object.freeze(current);
}

function operationTargetsStableExactParentTransientChildInternalV1(
  operation: ManagedSurfaceOperationV1,
  instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>,
): boolean {
  switch (operation.kind) {
    case "supersede_initial_preparation":
      return operation.expected.surfaceInstanceId === instance.surfaceInstanceId;
    case "prepare_replacement":
      return operation.expected.surfaceInstanceId === instance.surfaceInstanceId;
    case "cancel_primary_replacement":
      return operation.retained.surfaceInstanceId === instance.surfaceInstanceId ||
        operation.pending.surfaceInstanceId === instance.surfaceInstanceId;
    case "prepare_child":
      return operation.parentEvidence.surfaceInstanceId === instance.surfaceInstanceId;
    case "readiness_ready":
    case "readiness_failed":
      return operation.evidence.surfaceInstanceId === instance.surfaceInstanceId;
    case "close_expected":
    case "close_expected_with_owner_preparation_cancel":
    case "route_dismiss":
    case "route_dismiss_with_owner_preparation_cancel":
    case "route_action":
      return operation.evidence.surfaceInstanceId === instance.surfaceInstanceId;
    case "route_fallback_dismiss_exact_candidate":
    case "route_fallback_dismiss_with_owner_preparation_cancel":
      return operation.evidence.surfaceInstanceId === instance.surfaceInstanceId;
    case "close_owner":
      return operation.evidence.ownerId === instance.definition.ownerId;
    case "dispose_owner":
      return operation.ownerId === instance.definition.ownerId;
    case "prepare_initial":
    case "close_top":
    case "close_top_with_owner_preparation_cancel":
    case "dispose_coordinator":
      return false;
  }
  return false;
}

const stableExactParentTransientChildStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
});
const stableExactParentTransientChildFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
});

interface CapturedStableExactParentTransientChildInputInternalV1 {
  readonly parentProof: unknown;
  readonly expectedParent: unknown;
  readonly expectedSourceRevision: unknown;
  readonly definition: unknown;
  readonly semanticOccurrenceId: unknown;
  readonly commitGuard: unknown;
}

interface CapturedStableExactParentTransientChildCommitGuardInternalV1 {
  readonly receiver: object;
  readonly callable: (
    candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  ) => unknown;
}

function captureStableExactParentTransientChildInputInternalV1(
  input: unknown,
): CapturedStableExactParentTransientChildInputInternalV1 | null {
  if ((typeof input !== "object" && typeof input !== "function") || input === null) {
    return null;
  }
  const expectedKeys = [
    "parentProof",
    "expectedParent",
    "expectedSourceRevision",
    "definition",
    "semanticOccurrenceId",
    "commitGuard",
  ] as const;
  const keys = Reflect.ownKeys(input);
  if (
    !Object.isFrozen(input) || keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !keys.includes(key))
  ) {
    return null;
  }
  const values = new Map<string, unknown>();
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    values.set(key, descriptor.value);
  }
  return Object.freeze({
    parentProof: values.get("parentProof"),
    expectedParent: values.get("expectedParent"),
    expectedSourceRevision: values.get("expectedSourceRevision"),
    definition: values.get("definition"),
    semanticOccurrenceId: values.get("semanticOccurrenceId"),
    commitGuard: values.get("commitGuard"),
  });
}

function captureStableExactParentTransientChildCommitGuardInternalV1(
  guard: unknown,
): CapturedStableExactParentTransientChildCommitGuardInternalV1 | null {
  if ((typeof guard !== "object" && typeof guard !== "function") || guard === null) {
    return null;
  }
  const keys = Reflect.ownKeys(guard);
  const descriptor = Object.getOwnPropertyDescriptor(guard, "commitInternalV1");
  if (
    !Object.isFrozen(guard) || keys.length !== 1 || keys[0] !== "commitInternalV1" ||
    descriptor === undefined || !("value" in descriptor) ||
    typeof descriptor.value !== "function"
  ) {
    return null;
  }
  return Object.freeze({ receiver: guard, callable: descriptor.value });
}

export function claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 {
  if (
    !compositeRuntimeKernelConfigurationRecordsInternalV1.has(kernel) ||
    ((typeof exactClaimant !== "object" && typeof exactClaimant !== "function") ||
      exactClaimant === null)
  ) {
    throw new TypeError(
      "ui.managed_surface_stable_exact_parent_transient_child_claim_invalid",
    );
  }
  const retained = stableExactParentTransientChildClaimsInternalV1.get(kernel);
  if (retained !== undefined) {
    if (retained.exactClaimant !== exactClaimant) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_claim_invalid",
      );
    }
    return retained.authority;
  }

  let authority!: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1;
  const candidate: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 = {
    prepareExactParentTransientChildInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
      input: PrepareManagedSurfaceStableExactParentTransientChildInputInternalV1,
    ): ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_claim_invalid",
        );
      }
      let captured: CapturedStableExactParentTransientChildInputInternalV1 | null;
      let guard: CapturedStableExactParentTransientChildCommitGuardInternalV1 | null;
      try {
        captured = captureStableExactParentTransientChildInputInternalV1(input);
        guard = captured === null
          ? null
          : captureStableExactParentTransientChildCommitGuardInternalV1(
            captured.commitGuard,
          );
      } catch {
        return stableExactParentTransientChildFaultedResultInternalV1;
      }
      if (captured === null || guard === null || captured.semanticOccurrenceId !== null) {
        return stableExactParentTransientChildFaultedResultInternalV1;
      }
      if (
        (typeof captured.parentProof !== "object" &&
          typeof captured.parentProof !== "function") ||
        captured.parentProof === null
      ) {
        return stableExactParentTransientChildStaleResultInternalV1;
      }
      const proofRecord = stableDirectActionTargetProofRecordsInternalV1.get(
        captured.parentProof,
      );
      if (
        proofRecord === undefined || proofRecord.kernel !== kernel ||
        proofRecord.authority !== stableActionRouteAuthoritiesInternalV1.get(kernel) ||
        captured.expectedParent !== proofRecord.directTarget ||
        captured.expectedSourceRevision !== proofRecord.sourceRevision
      ) {
        return stableExactParentTransientChildStaleResultInternalV1;
      }
      if (
        (typeof captured.definition !== "object" &&
          typeof captured.definition !== "function") ||
        captured.definition === null
      ) {
        return stableExactParentTransientChildFaultedResultInternalV1;
      }

      const currentState = kernel.getStateInternalV1();
      if (currentState.transientState.publication.coordinatorDisposed) {
        return stableExactParentTransientChildStaleResultInternalV1;
      }
      let nextState: ManagedSurfaceStableCompositeStateInternalV1;
      let installedInstance: DeepReadonly<ManagedSurfacePublishedInstanceV1>;
      let installedOrigin: object;
      try {
        const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(currentState);
        const inventory = authorityRecord === undefined
          ? null
          : inspectCurrentStableBaselineInventoryInternalV1(currentState, authorityRecord);
        if (
          authorityRecord === undefined || inventory === null ||
          !hasExpectedStableBaselineRuntimeCoherenceInternalV1(currentState, inventory)
        ) {
          return stableExactParentTransientChildFaultedResultInternalV1;
        }
        installedOrigin = authorityRecord.origin;
        const publication = currentState.transientState.publication;
        const projection = projectWholeCompositeTopologyInternalV1(currentState);
        const parentNode = projection.nodes.find((node) =>
          node.axis === "stable" && node.instance === proofRecord.instance
        );
        const parentEntry = currentState.stableRuntimeBindings.find((entry) =>
          entry.desiredTarget.admittedTarget === proofRecord.directTarget &&
          entry.desiredTarget.sourceRevision === proofRecord.sourceRevision &&
          entry.binding.kind === "ready_instance" &&
          entry.binding.instance === proofRecord.instance
        );
        if (
          publication.applicationEpoch !== proofRecord.applicationEpoch ||
          publication.topologyRevision !== proofRecord.topologyRevision ||
          parentNode === undefined || parentNode.axis !== "stable" ||
          parentNode.instance !== proofRecord.instance || parentNode.baseline === null ||
          parentNode.directTarget !== proofRecord.directTarget ||
          parentNode.retainedSubtree !== null || parentEntry?.binding.kind !== "ready_instance" ||
          projection.stablePhaseByInstance.get(proofRecord.instance) !== "active"
        ) {
          return stableExactParentTransientChildStaleResultInternalV1;
        }
        const parentDefinition = authorityRecord.admissionAuthority
          .inspectAdmittedTargetDefinition(proofRecord.directTarget);
        const definition = captured.definition as DeepReadonly<
          ManagedSurfaceResolvedDefinitionV1
        >;
        if (
          parentDefinition === null || parentNode.definition !== parentDefinition ||
          definition.placement !== "child" ||
          definition.ownerId !== parentDefinition.ownerId ||
          definition.layerId !== parentDefinition.layerId ||
          definition.layerOrder < parentDefinition.layerOrder
        ) {
          return stableExactParentTransientChildFaultedResultInternalV1;
        }
        const parent: ManagedSurfaceReducerCrossAxisParentProjectionInternalV1 = Object.freeze({
          surfaceInstanceId: proofRecord.instance.attempt.identity.surfaceInstanceId,
          definition: parentDefinition,
          phase: "active" as const,
        });
        const transientCandidate = kernel.peekTransientCandidateInternalV1({
          definition,
          semanticOccurrenceId: null,
        });
        const reduced = deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1({
          state: currentState.transientState,
          parent,
          candidate: transientCandidate,
        });
        if (
          reduced.receipt.kind !== "applied" ||
          reduced.receipt.code !== "surface.preparation_started"
        ) {
          return stableExactParentTransientChildFaultedResultInternalV1;
        }
        const seedState = replaceTransientStateInternalV1(currentState, reduced.state);
        const reflow = planWholeCompositeReflowInternalV1({
          beforeState: currentState,
          seedState,
          transientRevisionMode: "coalesce_existing_transition",
        });
        nextState = reflow.state;
        const preparedInstance = nextState.transientState.publication.orderedInstances.find(
          (instance) => instance.surfaceInstanceId === transientCandidate.surfaceInstanceId,
        );
        const phasedParent = nextState.stableRuntimeBindings.find((entry) =>
          entry.binding.kind === "ready_instance" &&
          entry.binding.instance.attempt === proofRecord.instance.attempt
        );
        if (
          preparedInstance === undefined ||
          preparedInstance.parentInstanceId !== parent.surfaceInstanceId ||
          preparedInstance.definition.definitionId !== definition.definitionId ||
          preparedInstance.readiness.kind !== "preparing" ||
          preparedInstance.readiness.transition !== "child_open" ||
          phasedParent?.binding.kind !== "ready_instance" ||
          phasedParent.binding.instance.phase !== "suspended"
        ) {
          return stableExactParentTransientChildFaultedResultInternalV1;
        }
        installedInstance = preparedInstance;
      } catch {
        return kernel.getStateInternalV1() === currentState
          ? stableExactParentTransientChildFaultedResultInternalV1
          : stableExactParentTransientChildStaleResultInternalV1;
      }

      const opaqueCandidate = Object.freeze(
        {},
      ) as ManagedSurfaceStableExactParentTransientChildCandidateInternalV1;
      const readinessEvidence: ManagedSurfaceReadinessEvidenceV1 = Object.freeze({
        applicationEpoch: nextState.transientState.publication.applicationEpoch,
        surfaceInstanceId: installedInstance.surfaceInstanceId,
      });
      const candidateRecord:
        ManagedSurfaceStableExactParentTransientChildCandidateRecordInternalV1 = Object.freeze({
          kernel,
          origin: installedOrigin,
          surfaceInstanceId: installedInstance.surfaceInstanceId,
          definition: installedInstance.definition,
          target: installedInstance.target,
          routingLeaseId: installedInstance.routingLeaseId,
          parentInstanceId: installedInstance.parentInstanceId,
          semanticOccurrenceId: installedInstance.semanticOccurrenceId,
          readinessEvidence,
        });
      const installedResult = Object.freeze({
        kind: "installed" as const,
        candidate: opaqueCandidate,
      });
      let prepared: ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "prepareStateInstallInternalV1"
        ]
      >;
      try {
        prepared = kernel.prepareStateInstallInternalV1(currentState, nextState);
      } catch {
        return kernel.getStateInternalV1() === currentState
          ? stableExactParentTransientChildFaultedResultInternalV1
          : stableExactParentTransientChildStaleResultInternalV1;
      }

      let guardFaulted = false;
      const installResult = kernel.commitPreparedStateInstallInternalV1(
        prepared,
        () => {
          try {
            const outcome = Reflect.apply(guard.callable, guard.receiver, [opaqueCandidate]);
            if (outcome !== true && outcome !== false) guardFaulted = true;
            if (outcome !== true) return false;
            recordStableExactParentTransientChildCandidateInternalV1(
              opaqueCandidate,
              candidateRecord,
            );
            recordStableExactParentTransientChildInstanceInternalV1(
              installedInstance,
              candidateRecord,
            );
            return true;
          } catch {
            guardFaulted = true;
            return false;
          }
        },
      );
      if (installResult !== "installed") {
        return guardFaulted
          ? stableExactParentTransientChildFaultedResultInternalV1
          : stableExactParentTransientChildStaleResultInternalV1;
      }
      return installedResult;
    },
  };
  authority = Object.freeze(candidate);
  stableExactParentTransientChildClaimsInternalV1.set(kernel, {
    exactClaimant,
    authority,
  });
  return authority;
}

export function claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 {
  const preparationClaim = stableExactParentTransientChildClaimsInternalV1.get(kernel);
  if (
    !compositeRuntimeKernelConfigurationRecordsInternalV1.has(kernel) ||
    ((typeof exactClaimant !== "object" && typeof exactClaimant !== "function") ||
      exactClaimant === null) ||
    preparationClaim?.exactClaimant !== exactClaimant
  ) {
    throw new TypeError(
      "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
    );
  }
  const retained = stableExactParentTransientChildReadinessClaimsInternalV1.get(kernel);
  if (retained !== undefined) {
    if (retained.exactClaimant !== exactClaimant) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
      );
    }
    return retained.authority;
  }

  let authority!: ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1;
  const settle = (
    candidateInput: unknown,
    commitGuardInput: ManagedSurfaceStableReadinessCommitGuardInternalV1,
    outcome: "ready" | "failed",
  ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 => {
    if (
      (typeof candidateInput !== "object" && typeof candidateInput !== "function") ||
      candidateInput === null
    ) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
      );
    }
    const record = stableExactParentTransientChildCandidateRecordsInternalV1.get(
      candidateInput,
    );
    if (record === undefined || record.kernel !== kernel) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
      );
    }
    const currentState = kernel.getStateInternalV1();
    if (currentState.transientState.publication.coordinatorDisposed) {
      return stableExactParentTransientChildReadinessStaleResultInternalV1;
    }
    const inspected = inspectCurrentStableExactParentTransientChildInternalV1(
      currentState,
      record,
    );
    if (inspected.kind === "unavailable") {
      return stableExactParentTransientChildReadinessStaleResultInternalV1;
    }
    if (inspected.kind === "faulted") {
      return stableExactParentTransientChildReadinessFaultedResultInternalV1;
    }
    if (inspected.instance.readiness.kind !== "preparing") {
      return stableExactParentTransientChildReadinessStaleResultInternalV1;
    }
    let commitGuard: CapturedStableReadinessCommitGuardInternalV1 | null;
    try {
      commitGuard = captureStableReadinessCommitGuardInternalV1(commitGuardInput);
    } catch {
      return stableExactParentTransientChildReadinessFaultedResultInternalV1;
    }
    if (commitGuard === null) {
      return stableExactParentTransientChildReadinessFaultedResultInternalV1;
    }

    let nextState: ManagedSurfaceStableCompositeStateInternalV1;
    let contractToken: ManagedSurfacePreparedInputBindingContractInternalV1 | null;
    let successorInstance: DeepReadonly<ManagedSurfacePublishedInstanceV1> | null = null;
    try {
      const reduced = reduceManagedSurfaceV1(
        currentState.transientState,
        Object.freeze({
          kind: outcome === "ready" ? "readiness_ready" as const : "readiness_failed" as const,
          evidence: record.readinessEvidence,
        }),
      );
      if (
        reduced.receipt.kind !== "applied" ||
        reduced.receipt.code !==
          (outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed")
      ) {
        return reduced.receipt.kind === "stale"
          ? stableExactParentTransientChildReadinessStaleResultInternalV1
          : stableExactParentTransientChildReadinessFaultedResultInternalV1;
      }
      const seedState = replaceTransientStateInternalV1(currentState, reduced.state);
      nextState = planWholeCompositeReflowInternalV1({
        beforeState: currentState,
        seedState,
        transientRevisionMode: "coalesce_existing_transition",
      }).state;
      const successor = nextState.transientState.publication.orderedInstances.find((instance) =>
        instance.surfaceInstanceId === record.surfaceInstanceId
      );
      if (outcome === "ready") {
        if (
          successor === undefined || successor.readiness.kind !== "ready" ||
          successor.phase !== "active" ||
          successor.parentInstanceId !== record.parentInstanceId
        ) {
          return stableExactParentTransientChildReadinessFaultedResultInternalV1;
        }
        successorInstance = successor;
      } else if (successor !== undefined) {
        return stableExactParentTransientChildReadinessFaultedResultInternalV1;
      }
      const contract = managedSurfaceInputBindingContractForCompositeStateInternalV1(nextState);
      contractToken = contract === null
        ? null
        : captureManagedSurfacePreparedInputBindingContractInternalV1(contract);
    } catch {
      return kernel.getStateInternalV1() === currentState
        ? stableExactParentTransientChildReadinessFaultedResultInternalV1
        : stableExactParentTransientChildReadinessStaleResultInternalV1;
    }
    const committedProvenanceInstance = successorInstance ?? inspected.instance;

    let prepared: ReturnType<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1["prepareStateInstallInternalV1"]
    >;
    try {
      prepared = kernel.prepareStateInstallInternalV1(currentState, nextState);
    } catch {
      return kernel.getStateInternalV1() === currentState
        ? stableExactParentTransientChildReadinessFaultedResultInternalV1
        : stableExactParentTransientChildReadinessStaleResultInternalV1;
    }
    let guardFaulted = false;
    const installResult = kernel.commitPreparedStateInstallInternalV1(
      prepared,
      () => {
        try {
          const committed = Reflect.apply(commitGuard.callable, commitGuard.receiver, [
            contractToken,
          ]);
          if (committed !== true && committed !== false) guardFaulted = true;
          if (committed !== true) return false;
          recordStableExactParentTransientChildInstanceInternalV1(
            committedProvenanceInstance,
            record,
          );
          return true;
        } catch {
          guardFaulted = true;
          return false;
        }
      },
    );
    if (installResult === "installed") {
      return stableExactParentTransientChildReadinessAppliedResultInternalV1;
    }
    return guardFaulted
      ? stableExactParentTransientChildReadinessFaultedResultInternalV1
      : stableExactParentTransientChildReadinessStaleResultInternalV1;
  };

  const candidate: ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 = {
    settleExactParentTransientChildReadinessReadyInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
      childCandidate: unknown,
      commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
    ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
        );
      }
      return settle(childCandidate, commitGuard, "ready");
    },
    settleExactParentTransientChildReadinessFailedInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
      childCandidate: unknown,
      commitGuard: ManagedSurfaceStableReadinessCommitGuardInternalV1,
    ): ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
        );
      }
      return settle(childCandidate, commitGuard, "failed");
    },
  };
  authority = Object.freeze(candidate);
  stableExactParentTransientChildReadinessClaimsInternalV1.set(kernel, {
    exactClaimant,
    authority,
  });
  return authority;
}

export function claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1 {
  const preparationClaim = stableExactParentTransientChildClaimsInternalV1.get(kernel);
  if (
    !compositeRuntimeKernelConfigurationRecordsInternalV1.has(kernel) ||
    ((typeof exactClaimant !== "object" && typeof exactClaimant !== "function") ||
      exactClaimant === null) ||
    preparationClaim?.exactClaimant !== exactClaimant
  ) {
    throw new TypeError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );
  }
  const retained = stableExactParentTransientChildLifecycleClaimsInternalV1.get(kernel);
  if (retained !== undefined) {
    if (retained.exactClaimant !== exactClaimant) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
      );
    }
    return retained.authority;
  }

  let authority!: ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1;
  const transition = (
    candidateInput: unknown,
    guardInput: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
    request: Readonly<
      | { readonly kind: "close" }
      | { readonly kind: "dismiss"; readonly dismissKind: unknown }
    >,
  ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1 => {
    if (
      (typeof candidateInput !== "object" && typeof candidateInput !== "function") ||
      candidateInput === null
    ) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
      );
    }
    const record = stableExactParentTransientChildCandidateRecordsInternalV1.get(
      candidateInput,
    );
    if (record === undefined || record.kernel !== kernel) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
      );
    }

    const currentState = kernel.getStateInternalV1();
    if (currentState.transientState.publication.coordinatorDisposed) {
      return stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }
    const inspected = inspectCurrentStableExactParentTransientChildInternalV1(
      currentState,
      record,
    );
    if (inspected.kind === "unavailable") {
      return stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }
    if (inspected.kind === "faulted") {
      return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
    }
    const preparing = inspected.instance.readiness.kind === "preparing";
    if (
      (!preparing && inspected.instance.phase !== "active") ||
      (preparing && inspected.instance.readiness.transition !== "child_open")
    ) {
      return stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }
    const currentPublication = currentState.transientState.publication;
    const currentCloseTarget = currentPublication.orderedInstances.toReversed().find((instance) =>
      (instance.readiness.kind === "preparing" &&
        (instance.readiness.transition === "initial_open" ||
          instance.readiness.transition === "child_open")) ||
      instance.surfaceInstanceId === currentPublication.navigationTargetInstanceId
    );
    if (
      currentCloseTarget !== inspected.instance ||
      (!preparing &&
        (inspected.projection.inputNode?.axis !== "transient" ||
          inspected.projection.inputNode.instance !== inspected.instance ||
          currentPublication.navigationTargetInstanceId !== record.surfaceInstanceId))
    ) {
      return stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }
    let dismissKind: ManagedSurfaceDismissKindV1 | null = null;
    if (request.kind === "dismiss") {
      if (
        !isStableExactParentTransientChildLifecycleDismissKindInternalV1(
          request.dismissKind,
        )
      ) {
        return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      }
      dismissKind = request.dismissKind;
    }

    let nextState: ManagedSurfaceStableCompositeStateInternalV1;
    let contract: ManagedSurfaceInputBindingContractV1;
    let appliedResult:
      | typeof stableExactParentTransientChildLifecycleClosedResultInternalV1
      | typeof stableExactParentTransientChildLifecycleDismissedResultInternalV1;
    try {
      const publication = currentState.transientState.publication;
      let operation: ManagedSurfaceOperationV1;
      if (request.kind === "close") {
        operation = Object.freeze({
          kind: "close_top" as const,
          applicationEpoch: publication.applicationEpoch,
        });
      } else if (dismissKind === null) {
        return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      } else {
        operation = preparing
          ? Object.freeze({
            kind: "route_fallback_dismiss_exact_candidate" as const,
            dismissKind,
            evidence: record.readinessEvidence,
          })
          : Object.freeze({
            kind: "route_dismiss" as const,
            dismissKind,
            evidence: Object.freeze({
              applicationEpoch: publication.applicationEpoch,
              topologyRevision: publication.topologyRevision,
              surfaceInstanceId: record.surfaceInstanceId,
            }),
          });
      }
      const reduced = reduceManagedSurfaceV1(currentState.transientState, operation);
      if (
        request.kind === "dismiss" && reduced.receipt.kind === "rejected" &&
        reduced.receipt.code === "surface.dismiss_locked" &&
        reduced.receipt.surfaceInstanceId === record.surfaceInstanceId
      ) {
        return stableExactParentTransientChildLifecycleLockedResultInternalV1;
      }
      if (reduced.receipt.kind === "stale") {
        return stableExactParentTransientChildLifecycleStaleResultInternalV1;
      }
      const expectedCode = request.kind === "close" ? "surface.closed" : "surface.dismissed";
      if (
        reduced.receipt.kind !== "applied" || reduced.receipt.code !== expectedCode
      ) {
        return reduced.receipt.code === "surface.invalid_transition" ||
            reduced.receipt.code === "surface.already_closed"
          ? stableExactParentTransientChildLifecycleStaleResultInternalV1
          : stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      }
      if (reduced.receipt.surfaceInstanceId !== record.surfaceInstanceId) {
        return stableExactParentTransientChildLifecycleStaleResultInternalV1;
      }

      const seedState = replaceTransientStateInternalV1(currentState, reduced.state);
      const reflow = planWholeCompositeReflowInternalV1({
        beforeState: currentState,
        seedState,
        transientRevisionMode: "coalesce_existing_transition",
      });
      nextState = reflow.state;
      if (
        reflow.allocatedPreparationCount !== 0 ||
        nextState.transientState.identitySequenceHighWater !==
          currentState.transientState.identitySequenceHighWater ||
        nextState.transientState.publication.orderedInstances.some((instance) =>
          instance.surfaceInstanceId === record.surfaceInstanceId
        )
      ) {
        return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      }
      const successorProjection = projectWholeCompositeTopologyInternalV1(nextState);
      const parentNode = successorProjection.nodes.find((node) =>
        node.axis === "stable" && node.instance !== null &&
        node.instance.attempt.identity.surfaceInstanceId === record.parentInstanceId
      );
      if (
        parentNode === undefined || parentNode.axis !== "stable" ||
        parentNode.instance === null ||
        successorProjection.stablePhaseByInstance.get(parentNode.instance) !== "active"
      ) {
        return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      }
      const derivedContract = managedSurfaceInputBindingContractForCompositeStateInternalV1(
        nextState,
      );
      if (
        derivedContract === null ||
        derivedContract.surfaceInstanceId !== record.parentInstanceId
      ) {
        return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
      }
      contract = derivedContract;
      appliedResult = request.kind === "close"
        ? stableExactParentTransientChildLifecycleClosedResultInternalV1
        : stableExactParentTransientChildLifecycleDismissedResultInternalV1;
    } catch {
      return kernel.getStateInternalV1() === currentState
        ? stableExactParentTransientChildLifecycleFaultedResultInternalV1
        : stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }

    let guard: CapturedStableExactParentTransientChildLifecycleCommitGuardInternalV1 | null;
    try {
      guard = captureStableExactParentTransientChildLifecycleCommitGuardInternalV1(guardInput);
    } catch {
      return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
    }
    if (guard === null) {
      return stableExactParentTransientChildLifecycleFaultedResultInternalV1;
    }

    let contractToken: ManagedSurfacePreparedInputBindingContractInternalV1;
    try {
      contractToken = captureManagedSurfacePreparedInputBindingContractInternalV1(contract);
    } catch {
      return kernel.getStateInternalV1() === currentState
        ? stableExactParentTransientChildLifecycleFaultedResultInternalV1
        : stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }
    let prepared: ReturnType<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1["prepareStateInstallInternalV1"]
    >;
    try {
      prepared = kernel.prepareStateInstallInternalV1(currentState, nextState);
    } catch {
      return kernel.getStateInternalV1() === currentState
        ? stableExactParentTransientChildLifecycleFaultedResultInternalV1
        : stableExactParentTransientChildLifecycleStaleResultInternalV1;
    }

    let guardFaulted = false;
    const installResult = kernel.commitPreparedStateInstallInternalV1(
      prepared,
      () => {
        try {
          const committed = Reflect.apply(guard.callable, guard.receiver, [contractToken]);
          if (committed !== true && committed !== false) guardFaulted = true;
          return committed === true;
        } catch {
          guardFaulted = true;
          return false;
        }
      },
    );
    if (installResult === "installed") return appliedResult;
    return guardFaulted
      ? stableExactParentTransientChildLifecycleFaultedResultInternalV1
      : stableExactParentTransientChildLifecycleStaleResultInternalV1;
  };

  const candidate: ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1 = {
    closeExactParentTransientChildInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
      childCandidate: unknown,
      guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
    ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
        );
      }
      return transition(childCandidate, guard, Object.freeze({ kind: "close" as const }));
    },
    dismissExactParentTransientChildInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
      childCandidate: unknown,
      dismissKind: ManagedSurfaceDismissKindV1,
      guard: ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
    ): ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
        );
      }
      return transition(
        childCandidate,
        guard,
        Object.freeze({ kind: "dismiss" as const, dismissKind }),
      );
    },
  };
  authority = Object.freeze(candidate);
  stableExactParentTransientChildLifecycleClaimsInternalV1.set(kernel, {
    exactClaimant,
    authority,
  });
  return authority;
}

export function claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  exactClaimant: object,
): ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 {
  const preparationClaim = stableExactParentTransientChildClaimsInternalV1.get(kernel);
  if (
    !compositeRuntimeKernelConfigurationRecordsInternalV1.has(kernel) ||
    ((typeof exactClaimant !== "object" && typeof exactClaimant !== "function") ||
      exactClaimant === null) ||
    preparationClaim?.exactClaimant !== exactClaimant
  ) {
    throw new TypeError(
      "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
    );
  }
  const retained = stableExactParentTransientChildActionClaimsInternalV1.get(kernel);
  if (retained !== undefined) {
    if (retained.exactClaimant !== exactClaimant) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
      );
    }
    return retained.authority;
  }

  let authority!: ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1;
  const captureCurrent = (
    candidateInput: unknown,
  ): ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 => {
    if (
      (typeof candidateInput !== "object" && typeof candidateInput !== "function") ||
      candidateInput === null
    ) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
      );
    }
    const record = stableExactParentTransientChildCandidateRecordsInternalV1.get(candidateInput);
    if (record === undefined || record.kernel !== kernel) {
      throw new TypeError(
        "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
      );
    }
    if (kernel.getTransientSnapshotInternalV1().coordinatorDisposed) {
      return stableExactParentTransientChildActionUnavailableResultInternalV1;
    }
    return kernel.transitionStateInternalV1<
      ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1
    >((state) => {
      const inspected = inspectCurrentStableExactParentTransientChildInternalV1(state, record);
      if (inspected.kind !== "current") {
        return Object.freeze({
          state,
          result: inspected.kind === "faulted"
            ? stableExactParentTransientChildActionFaultedResultInternalV1
            : stableExactParentTransientChildActionUnavailableResultInternalV1,
        });
      }
      if (
        inspected.instance.readiness.kind !== "ready" || inspected.instance.phase !== "active" ||
        inspected.projection.inputNode?.axis !== "transient" ||
        inspected.projection.inputNode.instance !== inspected.instance
      ) {
        return Object.freeze({
          state,
          result: stableExactParentTransientChildActionUnavailableResultInternalV1,
        });
      }
      try {
        const contract = managedSurfaceInputBindingContractForCompositeStateInternalV1(state);
        if (
          contract === null || contract.surfaceInstanceId !== inspected.instance.surfaceInstanceId
        ) {
          return Object.freeze({
            state,
            result: stableExactParentTransientChildActionFaultedResultInternalV1,
          });
        }
        return Object.freeze({
          state,
          result: Object.freeze({ kind: "captured" as const, contract }),
        });
      } catch {
        return Object.freeze({
          state,
          result: stableExactParentTransientChildActionFaultedResultInternalV1,
        });
      }
    });
  };

  const candidate: ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 = {
    captureCurrentExactParentTransientChildInputInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
      childCandidate: unknown,
    ): ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
        );
      }
      return captureCurrent(childCandidate);
    },
    routeActionInternalV1(
      this: ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
      request: ManagedSurfaceRouteActionInputV1,
    ): ManagedSurfaceTransitionReceiptV1 {
      if (this !== authority) {
        throw new TypeError(
          "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
        );
      }
      const terminalState = kernel.getStateInternalV1();
      if (terminalState.transientState.publication.coordinatorDisposed) {
        return stableActionRouteReceiptInternalV1(
          terminalState,
          "rejected",
          "surface.coordinator_disposed",
        );
      }
      return kernel.transitionStateInternalV1((state) => {
        const evidence = request.evidence;
        const publication = state.transientState.publication;
        if (evidence.applicationEpoch !== publication.applicationEpoch) {
          return Object.freeze({
            state,
            result: stableActionRouteReceiptInternalV1(
              state,
              "stale",
              "surface.stale_application_epoch",
              evidence.surfaceInstanceId,
            ),
          });
        }
        if (evidence.topologyRevision !== publication.topologyRevision) {
          return Object.freeze({
            state,
            result: stableActionRouteReceiptInternalV1(
              state,
              "stale",
              "surface.stale_topology_revision",
              evidence.surfaceInstanceId,
            ),
          });
        }
        try {
          const authenticated = currentStableExactParentTransientChildrenForKernelInternalV1(
            kernel,
            state,
          );
          const target = authenticated.find(({ instance }) =>
            instance.surfaceInstanceId === evidence.surfaceInstanceId
          );
          if (target === undefined) {
            return Object.freeze({
              state,
              result: stableActionRouteReceiptInternalV1(
                state,
                "stale",
                "surface.stale_instance",
                evidence.surfaceInstanceId,
              ),
            });
          }
          const inspected = inspectCurrentStableExactParentTransientChildInternalV1(
            state,
            target.record,
          );
          if (inspected.kind !== "current") {
            return Object.freeze({
              state,
              result: stableActionRouteReceiptInternalV1(
                state,
                inspected.kind === "faulted" ? "faulted" : "stale",
                inspected.kind === "faulted"
                  ? "surface.transition_faulted"
                  : "surface.stale_instance",
                evidence.surfaceInstanceId,
              ),
            });
          }
          if (
            inspected.instance.readiness.kind !== "ready" ||
            inspected.instance.phase !== "active" ||
            inspected.projection.inputNode?.axis !== "transient" ||
            inspected.projection.inputNode.instance !== inspected.instance
          ) {
            return Object.freeze({
              state,
              result: stableActionRouteReceiptInternalV1(
                state,
                "rejected",
                "surface.not_input_owner",
                evidence.surfaceInstanceId,
              ),
            });
          }
          if (request.routingLeaseId !== inspected.instance.routingLeaseId) {
            return Object.freeze({
              state,
              result: stableActionRouteReceiptInternalV1(
                state,
                "stale",
                "surface.stale_routing_lease",
                evidence.surfaceInstanceId,
              ),
            });
          }
          if (!inspected.instance.definition.actionIds.includes(request.actionId)) {
            return Object.freeze({
              state,
              result: stableActionRouteReceiptInternalV1(
                state,
                "rejected",
                "surface.action_unpublished",
                evidence.surfaceInstanceId,
              ),
            });
          }
          return Object.freeze({
            state,
            result: stableActionRouteReceiptInternalV1(
              state,
              "unchanged",
              "surface.action_routed",
              evidence.surfaceInstanceId,
            ),
          });
        } catch {
          return Object.freeze({
            state,
            result: stableActionRouteReceiptInternalV1(
              state,
              "faulted",
              "surface.transition_faulted",
              evidence.surfaceInstanceId,
            ),
          });
        }
      });
    },
  };
  authority = Object.freeze(candidate);
  stableExactParentTransientChildActionClaimsInternalV1.set(kernel, {
    exactClaimant,
    authority,
  });
  return authority;
}

export function claimManagedSurfaceStableActionRouteAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
): ManagedSurfaceStableActionRouteAuthorityInternalV1 {
  if (!compositeRuntimeKernelConfigurationRecordsInternalV1.has(kernel)) {
    throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
  }
  const retained = stableActionRouteAuthoritiesInternalV1.get(kernel);
  if (retained !== undefined) return retained;

  const unavailableResult = Object.freeze({ kind: "unavailable" as const });
  const faultedResult = Object.freeze({
    kind: "faulted" as const,
    code: "surface.stable_reconcile_faulted" as const,
  });
  let authority!: ManagedSurfaceStableActionRouteAuthorityInternalV1;

  const hasCoherentStableState = (
    state: ManagedSurfaceStableCompositeStateInternalV1,
  ): boolean => {
    const authorityRecord = compositeStateAuthorityRecordsInternalV1.get(state);
    if (authorityRecord === undefined) return false;
    const inventory = inspectCurrentStableBaselineInventoryInternalV1(state, authorityRecord);
    return inventory !== null && hasExpectedStableBaselineRuntimeCoherenceInternalV1(
      state,
      inventory,
    );
  };

  const captureFromState = (
    state: ManagedSurfaceStableCompositeStateInternalV1,
  ): ManagedSurfaceStableActionInputCaptureResultInternalV1 => {
    try {
      if (!hasCoherentStableState(state)) return faultedResult;
      const projection = projectWholeCompositeTopologyInternalV1(state);
      const node = projection.inputNode;
      if (
        node === null || node.axis !== "stable" || node.instance === null ||
        node.definition.inputPolicy.kind !== "managed"
      ) {
        return unavailableResult;
      }
      const publication = state.transientState.publication;
      const contract: ManagedSurfaceInputBindingContractV1 = Object.freeze({
        applicationEpoch: publication.applicationEpoch,
        ownerId: node.definition.ownerId,
        surfaceInstanceId: node.instance.attempt.identity.surfaceInstanceId,
        inputContextId: node.definition.inputPolicy.inputContextId,
        routingLeaseId: node.instance.attempt.identity.routingLeaseId,
        actionIds: Object.freeze([...node.definition.actionIds]),
        topologyRevision: publication.topologyRevision,
      });
      if (node.baseline === null || node.directTarget === null || node.retainedSubtree !== null) {
        return Object.freeze({
          kind: "captured" as const,
          contract,
          directTarget: null,
          sourceRevision: null,
          targetProof: null,
        });
      }
      const entry = state.stableRuntimeBindings.find((candidate) =>
        candidate.desiredTarget.admittedTarget === node.directTarget &&
        candidate.desiredTarget.sourceRevision === node.baseline?.sourceRevision &&
        candidate.binding.kind === "ready_instance" &&
        candidate.binding.instance === node.instance
      );
      if (entry?.binding.kind !== "ready_instance") return faultedResult;
      const targetProof = Object.freeze(
        {},
      ) as ManagedSurfaceStableDirectActionTargetProofInternalV1;
      stableDirectActionTargetProofRecordsInternalV1.set(targetProof, {
        authority,
        kernel,
        applicationEpoch: publication.applicationEpoch,
        topologyRevision: publication.topologyRevision,
        instance: node.instance,
        directTarget: node.directTarget,
        sourceRevision: node.baseline.sourceRevision,
      });
      return Object.freeze({
        kind: "captured" as const,
        contract,
        directTarget: node.directTarget,
        sourceRevision: node.baseline.sourceRevision,
        targetProof,
      });
    } catch {
      return faultedResult;
    }
  };

  const captureReadyActiveTargetFromState = (
    state: ManagedSurfaceStableCompositeStateInternalV1,
    target: unknown,
  ): ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1 => {
    try {
      if (!hasCoherentStableState(state)) return faultedResult;
      const projection = projectWholeCompositeTopologyInternalV1(state);
      const node = projection.nodes.find((candidate) =>
        candidate.axis === "stable" && candidate.directTarget === target
      );
      if (
        node === undefined || node.axis !== "stable" || node.instance === null ||
        node.baseline === null || node.directTarget === null || node.retainedSubtree !== null ||
        projection.stablePhaseByInstance.get(node.instance) !== "active"
      ) {
        return unavailableResult;
      }
      const entry = state.stableRuntimeBindings.find((candidate) =>
        candidate.desiredTarget.admittedTarget === node.directTarget &&
        candidate.desiredTarget.publisherLease === node.directTarget?.publisherLease &&
        candidate.desiredTarget.sourceRevision === node.baseline?.sourceRevision &&
        candidate.binding.kind === "ready_instance" &&
        candidate.binding.instance === node.instance
      );
      if (entry?.binding.kind !== "ready_instance") return faultedResult;
      const publication = state.transientState.publication;
      const proof = Object.freeze(
        {},
      ) as ManagedSurfaceStableReadyActiveTargetProofInternalV1;
      stableReadyActiveTargetProofRecordsInternalV1.set(proof, {
        authority,
        kernel,
        applicationEpoch: publication.applicationEpoch,
        topologyRevision: publication.topologyRevision,
        instance: node.instance,
        publisherLease: entry.desiredTarget.publisherLease,
        directTarget: node.directTarget,
        sourceRevision: node.baseline.sourceRevision,
      });
      return Object.freeze({
        kind: "captured" as const,
        directTarget: node.directTarget,
        sourceRevision: node.baseline.sourceRevision,
        proof,
      });
    } catch {
      return faultedResult;
    }
  };

  const authorityCandidate: ManagedSurfaceStableActionRouteAuthorityInternalV1 = {
    captureCurrentStableInputInternalV1(
      this: ManagedSurfaceStableActionRouteAuthorityInternalV1,
    ): ManagedSurfaceStableActionInputCaptureResultInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
      }
      if (kernel.getTransientSnapshotInternalV1().coordinatorDisposed) {
        return unavailableResult;
      }
      return kernel.transitionStateInternalV1((state) =>
        Object.freeze({ state, result: captureFromState(state) })
      );
    },
    captureReadyActiveStableTargetInternalV1(
      this: ManagedSurfaceStableActionRouteAuthorityInternalV1,
      target: unknown,
    ): ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
      }
      if (kernel.getTransientSnapshotInternalV1().coordinatorDisposed) {
        return unavailableResult;
      }
      return kernel.transitionStateInternalV1((state) =>
        Object.freeze({ state, result: captureReadyActiveTargetFromState(state, target) })
      );
    },
    routeActionInternalV1(
      this: ManagedSurfaceStableActionRouteAuthorityInternalV1,
      request: ManagedSurfaceRouteActionInputV1,
    ): ManagedSurfaceTransitionReceiptV1 {
      if (this !== authority) {
        throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
      }
      const terminalState = kernel.getStateInternalV1();
      if (terminalState.transientState.publication.coordinatorDisposed) {
        return stableActionRouteReceiptInternalV1(
          terminalState,
          "rejected",
          "surface.coordinator_disposed",
        );
      }
      return kernel.transitionStateInternalV1((state) => {
        const evidence = request.evidence;
        const publication = state.transientState.publication;
        let receipt: ManagedSurfaceTransitionReceiptV1;
        if (evidence.applicationEpoch !== publication.applicationEpoch) {
          receipt = stableActionRouteReceiptInternalV1(
            state,
            "stale",
            "surface.stale_application_epoch",
            evidence.surfaceInstanceId,
          );
        } else if (evidence.topologyRevision !== publication.topologyRevision) {
          receipt = stableActionRouteReceiptInternalV1(
            state,
            "stale",
            "surface.stale_topology_revision",
            evidence.surfaceInstanceId,
          );
        } else {
          try {
            if (!hasCoherentStableState(state)) {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "faulted",
                "surface.transition_faulted",
                evidence.surfaceInstanceId,
              );
              return Object.freeze({ state, result: receipt });
            }
            const projection = projectWholeCompositeTopologyInternalV1(state);
            const targetNode = projection.nodes.find((node) =>
              node.axis === "stable" && node.instance !== null &&
              node.instance.attempt.identity.surfaceInstanceId === evidence.surfaceInstanceId
            );
            if (targetNode === undefined || targetNode.axis !== "stable") {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "stale",
                "surface.stale_instance",
                evidence.surfaceInstanceId,
              );
            } else if (projection.inputNode !== targetNode) {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "rejected",
                "surface.not_input_owner",
                evidence.surfaceInstanceId,
              );
            } else if (
              targetNode.instance === null ||
              request.routingLeaseId !== targetNode.instance.attempt.identity.routingLeaseId
            ) {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "stale",
                "surface.stale_routing_lease",
                evidence.surfaceInstanceId,
              );
            } else if (!targetNode.definition.actionIds.includes(request.actionId)) {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "rejected",
                "surface.action_unpublished",
                evidence.surfaceInstanceId,
              );
            } else {
              receipt = stableActionRouteReceiptInternalV1(
                state,
                "unchanged",
                "surface.action_routed",
                evidence.surfaceInstanceId,
              );
            }
          } catch {
            receipt = stableActionRouteReceiptInternalV1(
              state,
              "faulted",
              "surface.transition_faulted",
              evidence.surfaceInstanceId,
            );
          }
        }
        return Object.freeze({ state, result: receipt });
      });
    },
    isCurrentDirectTargetInternalV1(
      this: ManagedSurfaceStableActionRouteAuthorityInternalV1,
      proof: unknown,
    ): proof is ManagedSurfaceStableDirectActionTargetProofInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
      }
      if ((typeof proof !== "object" && typeof proof !== "function") || proof === null) {
        return false;
      }
      const record = stableDirectActionTargetProofRecordsInternalV1.get(proof);
      if (record === undefined || record.authority !== authority || record.kernel !== kernel) {
        return false;
      }
      if (kernel.getTransientSnapshotInternalV1().coordinatorDisposed) return false;
      return kernel.transitionStateInternalV1((state) => {
        let current = false;
        try {
          if (!hasCoherentStableState(state)) {
            return Object.freeze({ state, result: false });
          }
          const publication = state.transientState.publication;
          const projection = projectWholeCompositeTopologyInternalV1(state);
          const node = projection.inputNode;
          current = publication.applicationEpoch === record.applicationEpoch &&
            publication.topologyRevision === record.topologyRevision &&
            node?.axis === "stable" && node.instance === record.instance &&
            node.baseline !== null && node.directTarget === record.directTarget &&
            node.retainedSubtree === null &&
            node.baseline.sourceRevision === record.sourceRevision;
        } catch {
          current = false;
        }
        return Object.freeze({ state, result: current });
      });
    },
    isCurrentReadyActiveStableTargetInternalV1(
      this: ManagedSurfaceStableActionRouteAuthorityInternalV1,
      proof: unknown,
    ): proof is ManagedSurfaceStableReadyActiveTargetProofInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.managed_surface_stable_action_authority_invalid");
      }
      if ((typeof proof !== "object" && typeof proof !== "function") || proof === null) {
        return false;
      }
      const record = stableReadyActiveTargetProofRecordsInternalV1.get(proof);
      if (record === undefined || record.authority !== authority || record.kernel !== kernel) {
        return false;
      }
      if (kernel.getTransientSnapshotInternalV1().coordinatorDisposed) return false;
      return kernel.transitionStateInternalV1((state) => {
        let current = false;
        try {
          if (!hasCoherentStableState(state)) {
            return Object.freeze({ state, result: false });
          }
          const publication = state.transientState.publication;
          const projection = projectWholeCompositeTopologyInternalV1(state);
          const node = projection.nodes.find((candidate) =>
            candidate.axis === "stable" && candidate.instance === record.instance
          );
          current = publication.applicationEpoch === record.applicationEpoch &&
            publication.topologyRevision === record.topologyRevision &&
            node?.axis === "stable" && node.instance === record.instance &&
            node.baseline !== null && node.directTarget === record.directTarget &&
            node.retainedSubtree === null &&
            node.directTarget.publisherLease === record.publisherLease &&
            node.baseline.publisherLease === record.publisherLease &&
            node.baseline.sourceRevision === record.sourceRevision &&
            projection.stablePhaseByInstance.get(record.instance) === "active";
        } catch {
          current = false;
        }
        return Object.freeze({ state, result: current });
      });
    },
  };
  authority = Object.freeze(authorityCandidate);
  stableActionRouteAuthoritiesInternalV1.set(kernel, authority);
  return authority;
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
