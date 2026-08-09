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
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableReservationGenerationTokenInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  type ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseSnapshotInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";
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

interface StableRuntimePlanInternalV1 {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly allocatedPreparationCount: number;
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
  const plannedByOccurrence = new Map<
    ManagedSurfaceStableAdmittedTargetInternalV1["occurrenceId"],
    ManagedSurfaceStableRuntimeEntryInternalV1
  >();
  const plannedSubjectEntries: ManagedSurfaceStableRuntimeEntryInternalV1[] = [];
  let allocatedPreparationCount = 0;

  const activeParentFor = (
    desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  ): ManagedSurfaceStableReadyRuntimeInstanceInternalV1 | null => {
    const scope = desiredTarget.admittedTarget.stackScope;
    if (scope.kind !== "child") return null;
    const parentEntry = plannedByOccurrence.get(scope.parentOccurrenceId);
    return parentEntry?.binding.kind === "ready_instance" &&
        parentEntry.binding.instance.phase === "active"
      ? parentEntry.binding.instance
      : null;
  };

  const allocatePreparation = (preparation: {
    readonly desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
    readonly transition: "initial_open" | "primary_replacement" | "child_open";
    readonly retainedSubtree: ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 | null;
    readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
  }): ManagedSurfaceStableRuntimeBindingInternalV1 => {
    const allocated = allocateManagedSurfaceStableRuntimeAttemptInternalV1(planningState);
    planningState = allocated.state;
    allocatedPreparationCount += 1;
    const attempt = Object.freeze({
      desiredTarget: preparation.desiredTarget,
      identity: allocated.identity,
      parentInstanceId: preparation.parentInstanceId,
    });
    const record = compositeStateAuthorityRecordsInternalV1.get(planningState);
    if (record === undefined) {
      throw new TypeError("ui.managed_surface_stable_composite_state_invalid");
    }
    const slotCardinality = slotCardinalityForDesiredInternalV1(
      planningState,
      record,
      preparation.desiredTarget,
      desiredByOccurrence,
    );
    return createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt,
      transition: preparation.transition,
      placement: preparation.desiredTarget.admittedTarget.stackScope.kind,
      slotCardinality,
      retainedSubtree: preparation.retainedSubtree,
    });
  };

  for (const desiredTarget of canonicalDesiredTargets) {
    const occurrenceId = desiredTarget.admittedTarget.occurrenceId;
    const currentEntry = currentByOccurrence.get(occurrenceId);
    let binding: ManagedSurfaceStableRuntimeBindingInternalV1;
    if (currentEntry?.binding.kind === "ready_instance") {
      binding = currentEntry.binding;
    } else if (
      currentEntry?.binding.kind === "gap" &&
      currentEntry.binding.reason === "parent_unavailable"
    ) {
      binding = currentEntry.binding;
    } else if (currentEntry?.binding.kind === "preparing") {
      const activeParent = activeParentFor(desiredTarget);
      if (
        desiredTarget.admittedTarget.stackScope.kind === "child" && activeParent === null
      ) {
        binding = createManagedSurfaceStableGapRuntimeBindingInternalV1({
          reason: "parent_unavailable",
          placement: "child",
          slotCardinality: slotCardinalityForDesiredInternalV1(
            planningState,
            compositeStateAuthorityRecordsInternalV1.get(planningState)!,
            desiredTarget,
            desiredByOccurrence,
          ),
          retainedSubtree: null,
        });
      } else {
        binding = allocatePreparation({
          desiredTarget,
          transition: currentEntry.binding.transition,
          retainedSubtree: currentEntry.binding.retainedSubtree,
          parentInstanceId: activeParent?.attempt.identity.surfaceInstanceId ?? null,
        });
      }
    } else if (
      currentEntry?.binding.kind === "gap" &&
      currentEntry.binding.reason === "readiness_failed"
    ) {
      const activeParent = activeParentFor(desiredTarget);
      if (
        desiredTarget.admittedTarget.stackScope.kind === "child" && activeParent === null
      ) {
        binding = currentEntry.binding;
      } else {
        const transition = desiredTarget.admittedTarget.stackScope.kind === "child"
          ? "child_open" as const
          : currentEntry.binding.retainedSubtree === null
          ? "initial_open" as const
          : "primary_replacement" as const;
        binding = allocatePreparation({
          desiredTarget,
          transition,
          retainedSubtree: currentEntry.binding.retainedSubtree,
          parentInstanceId: activeParent?.attempt.identity.surfaceInstanceId ?? null,
        });
      }
    } else if (desiredTarget.admittedTarget.stackScope.kind === "child") {
      const activeParent = activeParentFor(desiredTarget);
      binding = activeParent === null
        ? createManagedSurfaceStableGapRuntimeBindingInternalV1({
          reason: "parent_unavailable",
          placement: "child",
          slotCardinality: slotCardinalityForDesiredInternalV1(
            planningState,
            compositeStateAuthorityRecordsInternalV1.get(planningState)!,
            desiredTarget,
            desiredByOccurrence,
          ),
          retainedSubtree: null,
        })
        : allocatePreparation({
          desiredTarget,
          transition: "child_open",
          retainedSubtree: null,
          parentInstanceId: activeParent.attempt.identity.surfaceInstanceId,
        });
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
      binding = allocatePreparation({
        desiredTarget,
        transition: retainedSubtree === null ? "initial_open" : "primary_replacement",
        retainedSubtree,
        parentInstanceId: null,
      });
    }
    const entry = Object.freeze({ desiredTarget, binding });
    plannedSubjectEntries.push(entry);
    plannedByOccurrence.set(occurrenceId, entry);
  }

  const finalEntries = Object.freeze([...otherRuntimeEntries, ...plannedSubjectEntries]);
  const state = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: planningState,
    contributorCandidates: stableContributorCandidatesForEntriesInternalV1(finalEntries),
  });
  return Object.freeze({ state, allocatedPreparationCount, subjectRuntimeBefore });
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
  const nextState = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: baselineState,
    contributorCandidates: stableContributorCandidatesForEntriesInternalV1(otherRuntime),
  });
  const runtimeDisposition = stableOwnedRuntimeDispositionInternalV1(subjectRuntime);
  const result = runtimeDisposition !== "none"
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
