// SPDX-License-Identifier: MIT
import type { DeepReadonly, PositiveSafeInteger, StrictJsonValueV1 } from "@sillymaker/base";

import type {
  ManagedSurfaceDefinitionIdV1,
  ManagedSurfaceOwnerIdV1,
  ManagedSurfaceReadinessEvidenceV1,
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

/** Stable-only readiness fence; the transient evidence shape stays unchanged. */
export interface ManagedSurfaceStableReadinessEnvelopeInternalV1 {
  readonly readinessEvidence: ManagedSurfaceReadinessEvidenceV1;
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
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
 * order belongs to its exact admitted stack-scope sequence; cross-scope raw
 * interleaving is not identity and no numeric position field is retained.
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

export const managedSurfaceStableContractLimitsInternalV1 = {
  maxTargets: 64,
  canonicalParameters: {
    maxBytes: 65_536,
    maxDepth: 32,
    maxNodes: 4_096,
  },
} as const;

export type ManagedSurfaceStableAppliedCodeInternalV1 =
  | "surface.stable_publication_applied"
  | "surface.stable_publisher_disposed";
export type ManagedSurfaceStableUnchangedCodeInternalV1 =
  | "surface.stable_publication_unchanged"
  | "surface.stable_publisher_already_disposed";
export type ManagedSurfaceStableStaleCodeInternalV1 =
  | "surface.stable_publisher_lease_stale"
  | "surface.stable_source_revision_stale"
  | "surface.stable_reconcile_precondition_stale";
export type ManagedSurfaceStableRejectedCodeInternalV1 =
  | "surface.stable_publication_envelope_invalid"
  | "surface.stable_source_revision_invalid"
  | "surface.stable_initial_revision_invalid"
  | "surface.stable_target_shape_invalid"
  | "surface.stable_target_limit_exceeded"
  | "surface.stable_occurrence_duplicate"
  | "surface.stable_occurrence_unissued"
  | "surface.stable_occurrence_reused"
  | "surface.stable_definition_missing"
  | "surface.stable_definition_owner_mismatch"
  | "surface.stable_root_parent_invalid"
  | "surface.stable_parent_missing"
  | "surface.stable_parent_order_invalid"
  | "surface.stable_slot_invalid"
  | "surface.stable_slot_occupied"
  | "surface.stable_order_invalid"
  | "surface.stable_schema_invalid"
  | "surface.stable_canonical_invalid"
  | "surface.stable_canonical_bytes_exceeded"
  | "surface.stable_canonical_depth_exceeded"
  | "surface.stable_canonical_nodes_exceeded"
  | "surface.stable_source_revision_conflict"
  | "surface.stable_owner_conflict";
export type ManagedSurfaceStableFaultedCodeInternalV1 =
  | "surface.stable_admission_faulted"
  | "surface.stable_reconcile_faulted";
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
  | "retire_owned_targets"
  | "retire_owned_targets_and_prepare_unblocked_children"
  | "settle_readiness";
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

export interface ManagedSurfaceStableReadinessAppliedDeltaInternalV1 {
  readonly source: "unchanged";
  readonly runtime: "settle_readiness";
  readonly notificationCount: 1;
  readonly topology: "readiness_policy_derived";
  readonly runtimeAllocation: "zero" | "preparation_count";
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
    readonly runtime: "retire_owned_targets_and_prepare_unblocked_children";
    readonly notificationCount: 1;
    readonly topology: "readiness_policy_derived";
    readonly runtimeAllocation: "preparation_count";
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
  }
  | {
    readonly source: "remove_lease";
    readonly runtime: "retire_owned_targets_and_prepare_unblocked_children";
    readonly notificationCount: 1;
    readonly topology: "readiness_policy_derived";
    readonly runtimeAllocation: "preparation_count";
  };

export type ManagedSurfaceStableDeltaInternalV1 =
  | ManagedSurfaceStableZeroDeltaInternalV1
  | ManagedSurfaceStablePublicationAppliedDeltaInternalV1
  | ManagedSurfaceStablePublisherDisposedDeltaInternalV1
  | ManagedSurfaceStableReadinessAppliedDeltaInternalV1;

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

export type ManagedSurfaceStableReadinessResultInternalV1 =
  | {
    readonly kind: "applied";
    readonly code: "surface.readiness_ready" | "surface.readiness_failed";
    readonly delta: ManagedSurfaceStableReadinessAppliedDeltaInternalV1;
  }
  | {
    readonly kind: "stale";
    readonly code: "surface.stale_application_epoch" | "surface.stale_readiness";
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  }
  | {
    readonly kind: "faulted";
    readonly code: "surface.stable_reconcile_faulted";
    readonly delta: ManagedSurfaceStableZeroDeltaInternalV1;
  };
