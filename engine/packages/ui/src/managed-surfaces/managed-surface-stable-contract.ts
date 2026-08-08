// SPDX-License-Identifier: MIT
import type { DeepReadonly, PositiveSafeInteger, StrictJsonValueV1 } from "@sillymaker/base";

import type {
  ManagedSurfaceDefinitionIdV1,
  ManagedSurfaceOwnerIdV1,
  ManagedSurfaceSlotIdV1,
  ManagedSurfaceTargetOccurrenceIdV1,
} from "./managed-surface-contracts.ts";

declare const managedSurfaceStablePublisherLeaseBrandInternalV1: unique symbol;
declare const managedSurfaceStableSourceRevisionBrandInternalV1: unique symbol;
declare const managedSurfaceStableCanonicalBytesBrandInternalV1: unique symbol;

/** Opaque publisher capability. S1-R.1 owns construction and lifecycle. */
export interface ManagedSurfaceStablePublisherLeaseInternalV1 {
  readonly [managedSurfaceStablePublisherLeaseBrandInternalV1]: true;
}

/** Dedicated per-lease source domain; never a semantic or presentation revision. */
export type ManagedSurfaceStableSourceRevisionInternalV1 = PositiveSafeInteger & {
  readonly [managedSurfaceStableSourceRevisionBrandInternalV1]: true;
};

export interface ManagedSurfaceStableTargetInternalV1 {
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1 | null;
  readonly parameters: unknown;
}

export interface ManagedSurfaceStablePublicationInternalV1 {
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}

export type ManagedSurfaceStableStackScopeInternalV1 =
  | {
    readonly kind: "root";
    readonly slotId: ManagedSurfaceSlotIdV1;
  }
  | {
    readonly kind: "child";
    readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
    readonly slotId: ManagedSurfaceSlotIdV1;
  };

/**
 * Opaque immutable byte snapshot. S1-R.2 owns its private byte copy and exact
 * comparison; callers never receive a mutable TypedArray identity authority.
 */
export interface ManagedSurfaceStableCanonicalParameterBytesInternalV1 {
  readonly [managedSurfaceStableCanonicalBytesBrandInternalV1]: true;
  readonly byteLength: PositiveSafeInteger;
}

/**
 * Identity snapshot produced only after S1-R.2 admission. Relative sibling
 * order remains the order of the admitted vector rather than a numeric field.
 */
export interface ManagedSurfaceStableAdmittedTargetInternalV1 {
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly definitionContractRevision: PositiveSafeInteger;
  readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1 | null;
  readonly stackScope: ManagedSurfaceStableStackScopeInternalV1;
  readonly normalizedParameters: DeepReadonly<StrictJsonValueV1>;
  readonly canonicalParameterBytes: ManagedSurfaceStableCanonicalParameterBytesInternalV1;
}

export const managedSurfaceStableContractLimitsInternalV1 = Object.freeze({
  maxTargets: 64,
  canonicalParameters: Object.freeze({
    maxBytes: 65_536,
    maxDepth: 32,
    maxNodes: 4_096,
  }),
});

const appliedCodesInternalV1 = Object.freeze(
  [
    "surface.stable_publication_applied",
    "surface.stable_publisher_disposed",
  ] as const,
);
const unchangedCodesInternalV1 = Object.freeze(
  [
    "surface.stable_publication_unchanged",
    "surface.stable_publisher_already_disposed",
  ] as const,
);
const staleCodesInternalV1 = Object.freeze(
  [
    "surface.stable_publisher_lease_stale",
    "surface.stable_source_revision_stale",
  ] as const,
);
const rejectedCodesInternalV1 = Object.freeze({
  envelope_shape: Object.freeze(
    [
      "surface.stable_publication_envelope_invalid",
    ] as const,
  ),
  source_revision: Object.freeze(
    [
      "surface.stable_source_revision_invalid",
      "surface.stable_initial_revision_invalid",
    ] as const,
  ),
  target_count: Object.freeze(
    [
      "surface.stable_target_limit_exceeded",
    ] as const,
  ),
  identity_graph: Object.freeze(
    [
      "surface.stable_occurrence_duplicate",
      "surface.stable_occurrence_unissued",
      "surface.stable_occurrence_reused",
      "surface.stable_definition_missing",
      "surface.stable_definition_owner_mismatch",
      "surface.stable_root_parent_invalid",
      "surface.stable_parent_missing",
      "surface.stable_parent_order_invalid",
      "surface.stable_slot_invalid",
      "surface.stable_slot_occupied",
      "surface.stable_order_invalid",
    ] as const,
  ),
  canonical_parameters: Object.freeze(
    [
      "surface.stable_schema_invalid",
      "surface.stable_canonical_invalid",
      "surface.stable_canonical_bytes_exceeded",
      "surface.stable_canonical_depth_exceeded",
      "surface.stable_canonical_nodes_exceeded",
    ] as const,
  ),
  equal_revision: Object.freeze(
    [
      "surface.stable_source_revision_conflict",
    ] as const,
  ),
  owner_conflict: Object.freeze(
    [
      "surface.stable_owner_scope_invalid",
      "surface.stable_owner_conflict",
    ] as const,
  ),
});
const faultedCodesInternalV1 = Object.freeze(
  [
    "surface.stable_admission_faulted",
  ] as const,
);

export const managedSurfaceStableResultCodesInternalV1 = Object.freeze({
  applied: appliedCodesInternalV1,
  unchanged: unchangedCodesInternalV1,
  stale: staleCodesInternalV1,
  rejected: rejectedCodesInternalV1,
  faulted: faultedCodesInternalV1,
});

export type ManagedSurfaceStableAppliedCodeInternalV1 = typeof appliedCodesInternalV1[number];
export type ManagedSurfaceStableUnchangedCodeInternalV1 = typeof unchangedCodesInternalV1[number];
export type ManagedSurfaceStableStaleCodeInternalV1 = typeof staleCodesInternalV1[number];
export type ManagedSurfaceStableRejectedCodeInternalV1 =
  typeof rejectedCodesInternalV1[keyof typeof rejectedCodesInternalV1][number];
export type ManagedSurfaceStableFaultedCodeInternalV1 = typeof faultedCodesInternalV1[number];
export type ManagedSurfaceStableResultCodeInternalV1 =
  | ManagedSurfaceStableAppliedCodeInternalV1
  | ManagedSurfaceStableUnchangedCodeInternalV1
  | ManagedSurfaceStableStaleCodeInternalV1
  | ManagedSurfaceStableRejectedCodeInternalV1
  | ManagedSurfaceStableFaultedCodeInternalV1;

export type ManagedSurfaceStableSourceDeltaInternalV1 =
  | "unchanged"
  | "advance_cursor"
  | "replace_vector"
  | "accept_empty"
  | "remove_lease";
export type ManagedSurfaceStableRuntimeDeltaInternalV1 =
  | "unchanged"
  | "retry_gaps"
  | "retain_retire_prepare"
  | "retire_owned_targets";
export type ManagedSurfaceStableTopologyDeltaInternalV1 =
  | "unchanged"
  | "changed"
  | "readiness_policy_derived";
export type ManagedSurfaceStableRuntimeAllocationInternalV1 =
  | "zero"
  | "preparation_count";

export interface ManagedSurfaceStableZeroDeltaInternalV1 {
  readonly source: "unchanged";
  readonly runtime: "unchanged";
  readonly notificationCount: 0;
  readonly topology: "unchanged";
  readonly runtimeAllocation: "zero";
}

export type ManagedSurfaceStablePublicationAppliedDeltaInternalV1 =
  | {
    readonly source: "advance_cursor";
    readonly runtime: "unchanged";
    readonly notificationCount: 1;
    readonly topology: "unchanged";
    readonly runtimeAllocation: "zero";
  }
  | {
    readonly source: "advance_cursor";
    readonly runtime: "retry_gaps";
    readonly notificationCount: 1;
    readonly topology: "readiness_policy_derived";
    readonly runtimeAllocation: "preparation_count";
  }
  | {
    readonly source: "replace_vector";
    readonly runtime: "retain_retire_prepare";
    readonly notificationCount: 1;
    readonly topology: "readiness_policy_derived";
    readonly runtimeAllocation: "preparation_count";
  }
  | {
    readonly source: "accept_empty";
    readonly runtime: "retire_owned_targets";
    readonly notificationCount: 1;
    readonly topology: "changed" | "unchanged";
    readonly runtimeAllocation: "zero";
  }
  | {
    readonly source: "accept_empty";
    readonly runtime: "unchanged";
    readonly notificationCount: 1;
    readonly topology: "unchanged";
    readonly runtimeAllocation: "zero";
  };

export type ManagedSurfaceStablePublisherDisposedDeltaInternalV1 =
  | {
    readonly source: "remove_lease";
    readonly runtime: "retire_owned_targets";
    readonly notificationCount: 1;
    readonly topology: "changed" | "unchanged";
    readonly runtimeAllocation: "zero";
  }
  | {
    readonly source: "remove_lease";
    readonly runtime: "unchanged";
    readonly notificationCount: 1;
    readonly topology: "unchanged";
    readonly runtimeAllocation: "zero";
  };

export type ManagedSurfaceStableDeltaInternalV1 =
  | ManagedSurfaceStableZeroDeltaInternalV1
  | ManagedSurfaceStablePublicationAppliedDeltaInternalV1
  | ManagedSurfaceStablePublisherDisposedDeltaInternalV1;

export type ManagedSurfaceStableReconcileResultInternalV1 =
  | {
    readonly kind: "applied";
    readonly code: "surface.stable_publication_applied";
    readonly delta: ManagedSurfaceStablePublicationAppliedDeltaInternalV1;
  }
  | {
    readonly kind: "applied";
    readonly code: "surface.stable_publisher_disposed";
    readonly delta: ManagedSurfaceStablePublisherDisposedDeltaInternalV1;
  }
  | {
    readonly kind: "unchanged";
    readonly code: ManagedSurfaceStableUnchangedCodeInternalV1;
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  }
  | {
    readonly kind: "stale";
    readonly code: ManagedSurfaceStableStaleCodeInternalV1;
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: ManagedSurfaceStableRejectedCodeInternalV1;
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  }
  | {
    readonly kind: "faulted";
    readonly code: ManagedSurfaceStableFaultedCodeInternalV1;
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  };

export type ManagedSurfaceStableAdmissionStageInternalV1 =
  | "envelope_shape"
  | "publisher_lease"
  | "source_revision_scalar"
  | "initial_revision"
  | "lower_revision_short_circuit"
  | "target_count"
  | "identity_graph"
  | "canonical_parameters"
  | "owner_conflict"
  | "equal_revision_comparison";

export interface ManagedSurfaceStableAdmissionPrecedenceRowInternalV1 {
  readonly stage: ManagedSurfaceStableAdmissionStageInternalV1;
  readonly resultCodes: readonly ManagedSurfaceStableResultCodeInternalV1[];
}

function freezeAdmissionRowInternalV1(
  stage: ManagedSurfaceStableAdmissionStageInternalV1,
  resultCodes: readonly ManagedSurfaceStableResultCodeInternalV1[],
): ManagedSurfaceStableAdmissionPrecedenceRowInternalV1 {
  return Object.freeze({ stage, resultCodes: Object.freeze([...resultCodes]) });
}

export const managedSurfaceStableAdmissionPrecedenceInternalV1 = Object.freeze([
  freezeAdmissionRowInternalV1("envelope_shape", rejectedCodesInternalV1.envelope_shape),
  freezeAdmissionRowInternalV1("publisher_lease", [
    "surface.stable_publisher_lease_stale",
  ]),
  freezeAdmissionRowInternalV1("source_revision_scalar", [
    "surface.stable_source_revision_invalid",
  ]),
  freezeAdmissionRowInternalV1("initial_revision", [
    "surface.stable_initial_revision_invalid",
  ]),
  freezeAdmissionRowInternalV1("lower_revision_short_circuit", [
    "surface.stable_source_revision_stale",
  ]),
  freezeAdmissionRowInternalV1("target_count", rejectedCodesInternalV1.target_count),
  freezeAdmissionRowInternalV1("identity_graph", rejectedCodesInternalV1.identity_graph),
  freezeAdmissionRowInternalV1(
    "canonical_parameters",
    rejectedCodesInternalV1.canonical_parameters,
  ),
  freezeAdmissionRowInternalV1("owner_conflict", rejectedCodesInternalV1.owner_conflict),
  freezeAdmissionRowInternalV1("equal_revision_comparison", [
    "surface.stable_source_revision_conflict",
  ]),
]);

export type ManagedSurfaceStableDeltaCaseInternalV1 =
  | "stale_publisher_lease"
  | "header_or_initial_invalid"
  | "lower"
  | "equal_same"
  | "equal_invalid"
  | "equal_different"
  | "greater_invalid"
  | "greater_same_all_active"
  | "greater_same_gap"
  | "greater_changed"
  | "greater_empty_with_observable_targets"
  | "greater_empty_with_nonobservable_targets"
  | "greater_empty_without_runtime"
  | "first_empty"
  | "greater_empty_cursor_only"
  | "equal_empty"
  | "effective_dispose_with_observable_targets"
  | "effective_dispose_with_nonobservable_targets"
  | "effective_dispose_without_runtime"
  | "repeated_dispose"
  | "admission_fault";

export type ManagedSurfaceStableDeltaContractRowInternalV1 =
  & ManagedSurfaceStableDeltaInternalV1
  & {
    readonly case: ManagedSurfaceStableDeltaCaseInternalV1;
    readonly resultKind: ManagedSurfaceStableReconcileResultInternalV1["kind"];
    readonly resultCodes: readonly ManagedSurfaceStableResultCodeInternalV1[];
  };

function freezeDeltaRowInternalV1(
  row: ManagedSurfaceStableDeltaContractRowInternalV1,
): ManagedSurfaceStableDeltaContractRowInternalV1 {
  return Object.freeze(row);
}

const zeroDeltaInternalV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

const headerOrInitialInvalidCodesInternalV1 = Object.freeze([
  ...rejectedCodesInternalV1.envelope_shape,
  ...rejectedCodesInternalV1.source_revision,
]);

const vectorInvalidCodesInternalV1 = Object.freeze([
  ...rejectedCodesInternalV1.target_count,
  ...rejectedCodesInternalV1.identity_graph,
  ...rejectedCodesInternalV1.canonical_parameters,
  ...rejectedCodesInternalV1.owner_conflict,
]);

export const managedSurfaceStableDeltaContractInternalV1 = Object.freeze([
  freezeDeltaRowInternalV1({
    case: "stale_publisher_lease",
    resultKind: "stale",
    resultCodes: Object.freeze(["surface.stable_publisher_lease_stale"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "header_or_initial_invalid",
    resultKind: "rejected",
    resultCodes: headerOrInitialInvalidCodesInternalV1,
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "lower",
    resultKind: "stale",
    resultCodes: Object.freeze(["surface.stable_source_revision_stale"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "equal_same",
    resultKind: "unchanged",
    resultCodes: Object.freeze(["surface.stable_publication_unchanged"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "equal_invalid",
    resultKind: "rejected",
    resultCodes: vectorInvalidCodesInternalV1,
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "equal_different",
    resultKind: "rejected",
    resultCodes: Object.freeze(["surface.stable_source_revision_conflict"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "greater_invalid",
    resultKind: "rejected",
    resultCodes: vectorInvalidCodesInternalV1,
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "greater_same_all_active",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "advance_cursor",
    runtime: "unchanged",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_same_gap",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "advance_cursor",
    runtime: "retry_gaps",
    notificationCount: 1,
    topology: "readiness_policy_derived",
    runtimeAllocation: "preparation_count",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_changed",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "replace_vector",
    runtime: "retain_retire_prepare",
    notificationCount: 1,
    topology: "readiness_policy_derived",
    runtimeAllocation: "preparation_count",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_empty_with_observable_targets",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "accept_empty",
    runtime: "retire_owned_targets",
    notificationCount: 1,
    topology: "changed",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_empty_with_nonobservable_targets",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "accept_empty",
    runtime: "retire_owned_targets",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_empty_without_runtime",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "accept_empty",
    runtime: "unchanged",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "first_empty",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "accept_empty",
    runtime: "unchanged",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "greater_empty_cursor_only",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publication_applied"]),
    source: "advance_cursor",
    runtime: "unchanged",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "equal_empty",
    resultKind: "unchanged",
    resultCodes: Object.freeze(["surface.stable_publication_unchanged"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "effective_dispose_with_observable_targets",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publisher_disposed"]),
    source: "remove_lease",
    runtime: "retire_owned_targets",
    notificationCount: 1,
    topology: "changed",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "effective_dispose_with_nonobservable_targets",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publisher_disposed"]),
    source: "remove_lease",
    runtime: "retire_owned_targets",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "effective_dispose_without_runtime",
    resultKind: "applied",
    resultCodes: Object.freeze(["surface.stable_publisher_disposed"]),
    source: "remove_lease",
    runtime: "unchanged",
    notificationCount: 1,
    topology: "unchanged",
    runtimeAllocation: "zero",
  }),
  freezeDeltaRowInternalV1({
    case: "repeated_dispose",
    resultKind: "unchanged",
    resultCodes: Object.freeze(["surface.stable_publisher_already_disposed"]),
    ...zeroDeltaInternalV1,
  }),
  freezeDeltaRowInternalV1({
    case: "admission_fault",
    resultKind: "faulted",
    resultCodes: Object.freeze(["surface.stable_admission_faulted"]),
    ...zeroDeltaInternalV1,
  }),
]);
