// SPDX-License-Identifier: MIT
import {
  type Brand,
  type NonNegativeSafeInteger,
  type PositiveSafeInteger,
  parseModuleId,
  parseNonNegativeSafeInteger,
} from "@sillymaker/base";

import type { InputContextIdV1 } from "../input/contracts.ts";

export type ManagedSurfaceDefinitionIdV1 = Brand<string, "ManagedSurfaceDefinitionIdV1">;
export type ManagedSurfaceOwnerIdV1 = Brand<string, "ManagedSurfaceOwnerIdV1">;
export type ManagedSurfaceSlotIdV1 = Brand<string, "ManagedSurfaceSlotIdV1">;
export type ManagedSurfaceLayerIdV1 = Brand<string, "ManagedSurfaceLayerIdV1">;
export type ManagedSurfaceTargetOccurrenceIdV1 = Brand<
  string,
  "ManagedSurfaceTargetOccurrenceIdV1"
>;
export type ManagedSurfaceInstanceIdV1 = Brand<string, "ManagedSurfaceInstanceIdV1">;
export type ManagedSurfaceRoutingLeaseIdV1 = Brand<string, "ManagedSurfaceRoutingLeaseIdV1">;
export type ManagedSurfaceFocusTargetIdV1 = Brand<string, "ManagedSurfaceFocusTargetIdV1">;
export type ManagedSurfaceActionIdV1 = Brand<string, "ManagedSurfaceActionIdV1">;
export type ManagedSurfaceGestureIdV1 = Brand<string, "ManagedSurfaceGestureIdV1">;
export type ManagedSurfaceInputPublicationRevisionV1 = Brand<
  number,
  "ManagedSurfaceInputPublicationRevisionV1"
>;

function parseManagedSurfaceIdV1<TId extends string>(value: unknown): TId {
  return parseModuleId(value) as unknown as TId;
}

export function parseManagedSurfaceDefinitionIdV1(value: unknown): ManagedSurfaceDefinitionIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceOwnerIdV1(value: unknown): ManagedSurfaceOwnerIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceSlotIdV1(value: unknown): ManagedSurfaceSlotIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceLayerIdV1(value: unknown): ManagedSurfaceLayerIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceTargetOccurrenceIdV1(
  value: unknown,
): ManagedSurfaceTargetOccurrenceIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceInstanceIdV1(value: unknown): ManagedSurfaceInstanceIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceRoutingLeaseIdV1(
  value: unknown,
): ManagedSurfaceRoutingLeaseIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceFocusTargetIdV1(value: unknown): ManagedSurfaceFocusTargetIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceActionIdV1(value: unknown): ManagedSurfaceActionIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceGestureIdV1(value: unknown): ManagedSurfaceGestureIdV1 {
  return parseManagedSurfaceIdV1(value);
}

export function parseManagedSurfaceInputPublicationRevisionV1(
  value: unknown,
): ManagedSurfaceInputPublicationRevisionV1 {
  return parseNonNegativeSafeInteger(value) as unknown as ManagedSurfaceInputPublicationRevisionV1;
}

export type ManagedSurfacePlacementV1 = "root" | "child";
export type ManagedSurfaceSlotCardinalityV1 = "single" | "stack";
export type ManagedSurfaceModalityV1 = "non_blocking" | "blocking";
export type ManagedSurfaceLifecyclePhaseV1 = "preparing" | "active" | "suspended" | "exiting";
export type ManagedSurfaceFocusRestoreV1 = "opener" | "previous_owner" | "none";

export type ManagedSurfaceResolvedSlotDescriptorV1 =
  | {
    readonly kind: "root";
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly cardinality: ManagedSurfaceSlotCardinalityV1;
  }
  | {
    readonly kind: "child";
    readonly parentDefinitionId: ManagedSurfaceDefinitionIdV1;
    readonly slotId: ManagedSurfaceSlotIdV1;
    readonly cardinality: ManagedSurfaceSlotCardinalityV1;
  };

export interface ManagedSurfaceDismissPolicyV1 {
  readonly back: boolean;
  readonly escape: boolean;
  readonly backdrop: boolean;
  readonly routedCancel: boolean;
}

export type ManagedSurfaceInputPolicyV1 =
  | { readonly kind: "none" }
  | {
    readonly kind: "managed";
    readonly inputContextId: InputContextIdV1;
  };

export type ManagedSurfaceFocusPolicyV1 =
  | { readonly kind: "none" }
  | {
    readonly kind: "owns_focus";
    readonly initialTargetId: ManagedSurfaceFocusTargetIdV1;
    readonly trap: boolean;
    readonly restore: ManagedSurfaceFocusRestoreV1;
  };

export type ManagedSurfaceNavigationPolicyV1 =
  | { readonly kind: "none" }
  | { readonly kind: "close" };

export interface ManagedSurfaceReadinessPolicyV1 {
  readonly initialOpen: "blocking_fallback";
  readonly primaryReplacement: "retain_current";
  readonly childOpen: "blocking_fallback";
}

export interface ManagedSurfaceResolvedDefinitionV1 {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly contractRevision: PositiveSafeInteger;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly layerId: ManagedSurfaceLayerIdV1;
  readonly layerOrder: NonNegativeSafeInteger;
  readonly placement: ManagedSurfacePlacementV1;
  readonly modality: ManagedSurfaceModalityV1;
  readonly inputPolicy: ManagedSurfaceInputPolicyV1;
  readonly dismissPolicy: ManagedSurfaceDismissPolicyV1;
  readonly focusPolicy: ManagedSurfaceFocusPolicyV1;
  readonly navigationPolicy: ManagedSurfaceNavigationPolicyV1;
  readonly actionIds: readonly ManagedSurfaceActionIdV1[];
  readonly readiness: ManagedSurfaceReadinessPolicyV1;
}

export interface ManagedSurfaceTransientTargetV1 {
  readonly kind: "transient";
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
}

export interface ManagedSurfaceIdentityAllocationV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly sequence: PositiveSafeInteger;
}

export interface ManagedSurfaceCandidateV1 {
  readonly identityAllocation: ManagedSurfaceIdentityAllocationV1;
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly target: ManagedSurfaceTransientTargetV1;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
  readonly semanticOccurrenceId: string | null;
}

export type ManagedSurfacePreparationTransitionV1 =
  | "initial_open"
  | "primary_replacement"
  | "child_open";

export type ManagedSurfaceReadinessV1 =
  | {
    readonly kind: "preparing";
    readonly transition: "initial_open" | "child_open";
  }
  | {
    readonly kind: "preparing";
    readonly transition: "primary_replacement";
    readonly retainedInstanceId: ManagedSurfaceInstanceIdV1;
  }
  | { readonly kind: "ready" };

export interface ManagedSurfacePublishedInstanceV1 {
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly target: ManagedSurfaceTransientTargetV1;
  readonly semanticOccurrenceId: string | null;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
  readonly phase: ManagedSurfaceLifecyclePhaseV1;
  readonly readiness: ManagedSurfaceReadinessV1;
}

export interface ManagedSurfaceInputOwnerV1 {
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly inputContextId: InputContextIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
}

export interface ManagedSurfaceFocusOwnerV1 {
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly initialTargetId: ManagedSurfaceFocusTargetIdV1;
  readonly trap: boolean;
  readonly restore: ManagedSurfaceFocusRestoreV1;
}

export interface ManagedSurfaceOwnerTraceV1 {
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly surfaceInstanceIds: readonly ManagedSurfaceInstanceIdV1[];
  readonly disposed: boolean;
}

export interface ManagedSurfaceBlockingFallbackProjectionV1 {
  readonly kind: "blocking_fallback";
  readonly candidateInstanceId: ManagedSurfaceInstanceIdV1;
}

export interface ManagedSurfacePublicationV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly publicationRevision: NonNegativeSafeInteger;
  readonly topologyRevision: NonNegativeSafeInteger;
  readonly orderedInstances: readonly ManagedSurfacePublishedInstanceV1[];
  readonly preparationFallbacks: readonly ManagedSurfaceBlockingFallbackProjectionV1[];
  readonly topmostBlockingInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly inputOwner: ManagedSurfaceInputOwnerV1 | null;
  readonly focusOwner: ManagedSurfaceFocusOwnerV1 | null;
  readonly navigationTargetInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly ownerTrace: readonly ManagedSurfaceOwnerTraceV1[];
  readonly coordinatorDisposed: boolean;
}

export interface ManagedSurfaceTransitionEvidenceV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly topologyRevision: NonNegativeSafeInteger;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
}

export interface ManagedSurfaceReadinessEvidenceV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
}

export interface ManagedSurfaceActionEnvelopeV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly surfaceTopologyRevision: NonNegativeSafeInteger;
  readonly actionId: ManagedSurfaceActionIdV1;
  readonly gestureId: ManagedSurfaceGestureIdV1;
  readonly inputPublicationRevision: ManagedSurfaceInputPublicationRevisionV1;
}

export interface ManagedSurfaceRouteActionInputV1 {
  readonly evidence: ManagedSurfaceTransitionEvidenceV1;
  readonly actionId: ManagedSurfaceActionIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
}

export interface ManagedSurfaceOwnerTransitionEvidenceV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly topologyRevision: NonNegativeSafeInteger;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
}

export type ManagedSurfaceDismissKindV1 = "back" | "escape" | "backdrop" | "routed_cancel";

export type ManagedSurfaceOperationV1 =
  | {
    readonly kind: "prepare_initial";
    readonly applicationEpoch: NonNegativeSafeInteger;
    readonly candidate: ManagedSurfaceCandidateV1;
  }
  | {
    readonly kind: "supersede_initial_preparation";
    readonly expected: ManagedSurfaceReadinessEvidenceV1;
    readonly candidate: ManagedSurfaceCandidateV1;
  }
  | {
    readonly kind: "prepare_replacement";
    readonly expected: ManagedSurfaceTransitionEvidenceV1;
    readonly candidate: ManagedSurfaceCandidateV1;
  }
  | {
    readonly kind: "cancel_primary_replacement";
    readonly retained: ManagedSurfaceTransitionEvidenceV1;
    readonly pending: ManagedSurfaceReadinessEvidenceV1;
  }
  | {
    readonly kind: "prepare_child";
    readonly parentEvidence: ManagedSurfaceTransitionEvidenceV1;
    readonly candidate: ManagedSurfaceCandidateV1;
  }
  | {
    readonly kind: "readiness_ready";
    readonly evidence: ManagedSurfaceReadinessEvidenceV1;
  }
  | {
    readonly kind: "readiness_failed";
    readonly evidence: ManagedSurfaceReadinessEvidenceV1;
  }
  | {
    readonly kind: "close_expected";
    readonly evidence: ManagedSurfaceTransitionEvidenceV1;
  }
  | {
    readonly kind: "close_expected_with_owner_preparation_cancel";
    readonly evidence: ManagedSurfaceTransitionEvidenceV1;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  }
  | {
    readonly kind: "close_top";
    readonly applicationEpoch: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "close_top_with_owner_preparation_cancel";
    readonly applicationEpoch: NonNegativeSafeInteger;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  }
  | {
    readonly kind: "close_owner";
    readonly evidence: ManagedSurfaceOwnerTransitionEvidenceV1;
  }
  | {
    readonly kind: "route_dismiss";
    readonly dismissKind: ManagedSurfaceDismissKindV1;
    readonly evidence: ManagedSurfaceTransitionEvidenceV1;
  }
  | {
    readonly kind: "route_dismiss_with_owner_preparation_cancel";
    readonly dismissKind: ManagedSurfaceDismissKindV1;
    readonly evidence: ManagedSurfaceTransitionEvidenceV1;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  }
  | {
    readonly kind: "route_fallback_dismiss_exact_candidate";
    readonly dismissKind: ManagedSurfaceDismissKindV1;
    readonly evidence: ManagedSurfaceReadinessEvidenceV1;
  }
  | {
    readonly kind: "route_fallback_dismiss_with_owner_preparation_cancel";
    readonly dismissKind: ManagedSurfaceDismissKindV1;
    readonly evidence: ManagedSurfaceReadinessEvidenceV1;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  }
  | ({
    readonly kind: "route_action";
  } & ManagedSurfaceRouteActionInputV1)
  | {
    readonly kind: "dispose_owner";
    readonly applicationEpoch: NonNegativeSafeInteger;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  }
  | {
    readonly kind: "dispose_coordinator";
  };

export type ManagedSurfaceTransitionOutcomeV1 =
  | "applied"
  | "unchanged"
  | "stale"
  | "rejected"
  | "faulted";

export type ManagedSurfaceTransitionCodeV1 =
  | "surface.preparation_started"
  | "surface.preparation_cancelled"
  | "surface.readiness_ready"
  | "surface.readiness_failed"
  | "surface.closed"
  | "surface.owner_closed"
  | "surface.dismissed"
  | "surface.action_routed"
  | "surface.owner_disposed"
  | "surface.coordinator_disposed"
  | "surface.owner_already_disposed"
  | "surface.unknown_owner"
  | "surface.coordinator_already_disposed"
  | "surface.already_closed"
  | "surface.duplicate_occurrence"
  | "surface.duplicate_instance"
  | "surface.duplicate_routing_lease"
  | "surface.reused_occurrence"
  | "surface.reused_instance"
  | "surface.reused_routing_lease"
  | "surface.reused_identity_allocation"
  | "surface.invalid_identity_allocation"
  | "surface.slot_not_resolved"
  | "surface.slot_placement_mismatch"
  | "surface.slot_occupied"
  | "surface.invalid_parent"
  | "surface.invalid_transition"
  | "surface.dismiss_locked"
  | "surface.stale_routing_lease"
  | "surface.not_input_owner"
  | "surface.action_unpublished"
  | "surface.stale_application_epoch"
  | "surface.stale_topology_revision"
  | "surface.stale_instance"
  | "surface.stale_readiness"
  | "surface.invariant_failed"
  | "surface.transition_faulted";

export interface ManagedSurfaceTransitionReceiptV1 {
  readonly kind: ManagedSurfaceTransitionOutcomeV1;
  readonly code: ManagedSurfaceTransitionCodeV1;
  readonly beforeTopologyRevision: NonNegativeSafeInteger;
  readonly afterTopologyRevision: NonNegativeSafeInteger;
  readonly surfaceInstanceId?: ManagedSurfaceInstanceIdV1;
}

export interface ManagedSurfaceTransitionResultV1<TState> {
  readonly state: TState;
  readonly receipt: ManagedSurfaceTransitionReceiptV1;
}
