// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import type {
  ManagedSurfaceReadinessEvidenceV1,
  ManagedSurfaceInstanceIdV1,
  ManagedSurfaceOperationV1,
  ManagedSurfaceSlotIdV1,
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
  deriveManagedSurfaceReducerTopologyProjectionInternalV1,
  type ManagedSurfaceReducerStateV1,
  type ManagedSurfaceReducerTopologyProjectionInternalV1,
  type ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1,
} from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeKernelInternalV1,
} from "./managed-surface-runtime-kernel.ts";
import { projectManagedSurfaceTopologyPolicyInternalV1 } from "./managed-surface-topology-policy.ts";

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
  settleStableReadinessFailedInternalV1(
    envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ): ManagedSurfaceStableReadinessResultInternalV1;
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
  for (const row of projected) {
    const node = row.subject;
    if (node.axis === "transient") {
      transientProjection.push(Object.freeze({ instance: node.instance, phase: row.phase }));
    } else if (node.instance !== null && row.phase !== "preparing") {
      stablePhaseByInstance.set(node.instance, row.phase);
    }
  }
  return Object.freeze({
    stablePhaseByInstance,
    transientProjection: Object.freeze(transientProjection),
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

function planWholeCompositeReflowInternalV1(input: {
  readonly beforeState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly seedState: ManagedSurfaceStableCompositeStateInternalV1;
  readonly transientRevisionMode: ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1;
}): WholeCompositeReflowPlanInternalV1 {
  const seedRecord = compositeStateAuthorityRecordsInternalV1.get(input.seedState);
  const inventory = seedRecord === undefined
    ? null
    : inspectCurrentStableBaselineInventoryInternalV1(input.seedState, seedRecord);
  if (
    seedRecord === undefined || inventory === null ||
    !hasExpectedStableBaselineRuntimeCoherenceInternalV1(input.seedState, inventory)
  ) {
    throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
  }
  const preliminary = projectWholeCompositeTopologyInternalV1(input.seedState);
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
  for (const entry of input.seedState.stableRuntimeBindings) {
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
  for (const entry of input.seedState.stableRuntimeBindings) {
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
        path: canonicalPlanningPathInternalV1(input.seedState, entry.desiredTarget),
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
    input.seedState,
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
        _operation: ManagedSurfaceOperationV1,
        reducerReceipt: ManagedSurfaceTransitionReceiptV1,
      ) => {
        if (reducerReceipt.kind !== "applied") {
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
  return Object.freeze({
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
    settleStableReadinessFailedInternalV1(
      envelope: ManagedSurfaceStableReadinessEnvelopeInternalV1,
    ): ManagedSurfaceStableReadinessResultInternalV1 {
      return settleStableReadiness(envelope, "failed");
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
