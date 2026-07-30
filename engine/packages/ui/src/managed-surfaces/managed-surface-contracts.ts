// SPDX-License-Identifier: MIT
import { type Brand, type NonNegativeSafeInteger, parseModuleId } from "@sillymaker/base";

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

export type ManagedSurfacePlacementV1 = "root" | "child";
export type ManagedSurfaceSlotCardinalityV1 = "single" | "stack";
export type ManagedSurfaceModalityV1 = "non_blocking" | "blocking";
export type ManagedSurfaceLifecyclePhaseV1 = "preparing" | "active" | "suspended" | "exiting";
export type ManagedSurfaceFocusRestoreV1 = "opener" | "previous_owner" | "none";

export interface ManagedSurfaceDismissPolicyV1 {
  readonly back: boolean;
  readonly escape: boolean;
  readonly backdrop: boolean;
  readonly routedCancel: boolean;
}

export interface ManagedSurfaceFocusPolicyV1 {
  readonly initialTargetId: ManagedSurfaceFocusTargetIdV1;
  readonly trap: boolean;
  readonly restore: ManagedSurfaceFocusRestoreV1;
}

export interface ManagedSurfaceResolvedDefinitionV1 {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly layerId: ManagedSurfaceLayerIdV1;
  readonly layerOrder: NonNegativeSafeInteger;
  readonly placement: ManagedSurfacePlacementV1;
  readonly slotCardinality: ManagedSurfaceSlotCardinalityV1;
  readonly allowedParentSlotIds: readonly ManagedSurfaceSlotIdV1[];
  readonly modality: ManagedSurfaceModalityV1;
  readonly inputContextId: InputContextIdV1;
  readonly dismissPolicy: ManagedSurfaceDismissPolicyV1;
  readonly focusPolicy: ManagedSurfaceFocusPolicyV1;
  readonly actionIds: readonly ManagedSurfaceActionIdV1[];
}

export interface ManagedSurfaceTransientTargetV1 {
  readonly kind: "transient";
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
}

export interface ManagedSurfaceCandidateV1 {
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly target: ManagedSurfaceTransientTargetV1;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
  readonly semanticOccurrenceId: string | null;
}

export type ManagedSurfaceReadinessV1 =
  | { readonly kind: "preparing" }
  | { readonly kind: "ready" }
  | {
      readonly kind: "faulted";
      readonly code: string;
    };

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
}

export interface ManagedSurfacePublicationV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly topologyRevision: NonNegativeSafeInteger;
  readonly orderedInstances: readonly ManagedSurfacePublishedInstanceV1[];
  readonly topmostBlockingInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly inputOwner: ManagedSurfaceInputOwnerV1 | null;
  readonly focusOwner: ManagedSurfaceFocusOwnerV1 | null;
  readonly ownerTrace: readonly ManagedSurfaceOwnerTraceV1[];
  readonly coordinatorDisposed: boolean;
}

export interface ManagedSurfaceTransitionEvidenceV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly topologyRevision: NonNegativeSafeInteger;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
}

export type ManagedSurfaceDismissKindV1 = "back" | "escape" | "backdrop" | "routed_cancel";

export type ManagedSurfaceOperationV1 =
  | {
      readonly kind: "open_primary";
      readonly applicationEpoch: NonNegativeSafeInteger;
      readonly candidate: ManagedSurfaceCandidateV1;
    }
  | {
      readonly kind: "replace_primary";
      readonly applicationEpoch: NonNegativeSafeInteger;
      readonly candidate: ManagedSurfaceCandidateV1;
    }
  | {
      readonly kind: "push_child";
      readonly applicationEpoch: NonNegativeSafeInteger;
      readonly parentInstanceId: ManagedSurfaceInstanceIdV1;
      readonly candidate: ManagedSurfaceCandidateV1;
    }
  | {
      readonly kind: "close_expected";
      readonly evidence: ManagedSurfaceTransitionEvidenceV1;
    }
  | {
      readonly kind: "route_dismiss";
      readonly dismissKind: ManagedSurfaceDismissKindV1;
      readonly evidence: ManagedSurfaceTransitionEvidenceV1;
    }
  | {
      readonly kind: "dispose_owner";
      readonly applicationEpoch: NonNegativeSafeInteger;
      readonly ownerId: ManagedSurfaceOwnerIdV1;
    }
  | {
      readonly kind: "dispose_coordinator";
    };

export type ManagedSurfaceTransitionOutcomeV1 =
  "applied" | "unchanged" | "stale" | "rejected" | "faulted";

export type ManagedSurfaceTransitionCodeV1 =
  | "surface.opened"
  | "surface.replaced"
  | "surface.child_pushed"
  | "surface.closed"
  | "surface.dismissed"
  | "surface.owner_disposed"
  | "surface.coordinator_disposed"
  | "surface.owner_already_disposed"
  | "surface.coordinator_already_disposed"
  | "surface.duplicate_occurrence"
  | "surface.duplicate_instance"
  | "surface.duplicate_routing_lease"
  | "surface.reused_occurrence"
  | "surface.reused_instance"
  | "surface.reused_routing_lease"
  | "surface.slot_occupied"
  | "surface.invalid_parent"
  | "surface.invalid_transition"
  | "surface.dismiss_locked"
  | "surface.stale_application_epoch"
  | "surface.stale_topology_revision"
  | "surface.stale_instance"
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
