// SPDX-License-Identifier: MIT
import {
  type DeepReadonly,
  type NonNegativeSafeInteger,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type StrictJsonObjectV1,
} from "@sillymaker/base";

import {
  type ManagedSurfaceCandidateV1,
  type ManagedSurfaceDismissKindV1,
  type ManagedSurfaceInstanceIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceOwnerTransitionEvidenceV1,
  type ManagedSurfacePublicationV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceRouteActionInputV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceTransitionEvidenceV1,
  type ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceTransientIdentityV1 } from "./managed-surface-identity.ts";
import {
  createManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
} from "./managed-surface-reducer.ts";

export type ManagedSurfaceHandleV1 = ManagedSurfaceTransitionEvidenceV1;
export type ManagedSurfaceOwnerHandleV1 = ManagedSurfaceOwnerTransitionEvidenceV1;

export interface ManagedSurfaceTransientOpenInputV1 {
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly semanticOccurrenceId: string | null;
}

export interface ManagedSurfaceTransientReplaceInputV1 extends ManagedSurfaceTransientOpenInputV1 {
  readonly expected: ManagedSurfaceHandleV1;
}

export interface ManagedSurfaceTransientChildInputV1 extends ManagedSurfaceTransientOpenInputV1 {
  readonly parent: ManagedSurfaceHandleV1;
}

export interface ManagedSurfaceHandleResultV1 {
  readonly receipt: ManagedSurfaceTransitionReceiptV1;
  readonly handle: ManagedSurfaceHandleV1 | null;
}

export interface ManagedSurfaceSubscriberFailureV1 {
  readonly code: "surface.subscriber_failed";
  readonly summary: string;
  readonly details: StrictJsonObjectV1;
}

export interface CreateManagedSurfaceCoordinatorInputV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly reportSubscriberFailure?: (
    failure: DeepReadonly<ManagedSurfaceSubscriberFailureV1>,
  ) => void;
}

export interface ManagedSurfaceCoordinatorV1 {
  getSnapshot(): DeepReadonly<ManagedSurfacePublicationV1>;
  getHandle(surfaceInstanceId: ManagedSurfaceInstanceIdV1): ManagedSurfaceHandleV1 | null;
  getOwnerHandle(ownerId: ManagedSurfaceOwnerIdV1): ManagedSurfaceOwnerHandleV1 | null;
  subscribe(listener: () => void): () => void;
  openTransientPrimary(input: ManagedSurfaceTransientOpenInputV1): ManagedSurfaceHandleResultV1;
  replaceTransientPrimary(
    input: ManagedSurfaceTransientReplaceInputV1,
  ): ManagedSurfaceHandleResultV1;
  pushTransientChild(input: ManagedSurfaceTransientChildInputV1): ManagedSurfaceHandleResultV1;
  closeExpected(handle: ManagedSurfaceHandleV1): ManagedSurfaceTransitionReceiptV1;
  /** Synchronous current-intent convenience; delayed callbacks use closeExpected. */
  closeTop(): ManagedSurfaceTransitionReceiptV1;
  closeOwner(handle: ManagedSurfaceOwnerHandleV1): ManagedSurfaceTransitionReceiptV1;
  routeDismiss(
    handle: ManagedSurfaceHandleV1,
    dismissKind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
  routeAction(input: ManagedSurfaceRouteActionInputV1): ManagedSurfaceTransitionReceiptV1;
  disposeOwner(ownerId: ManagedSurfaceOwnerIdV1): ManagedSurfaceTransitionReceiptV1;
  dispose(): ManagedSurfaceTransitionReceiptV1;
}

function handleV1(
  applicationEpoch: NonNegativeSafeInteger,
  topologyRevision: NonNegativeSafeInteger,
  surfaceInstanceId: ManagedSurfaceInstanceIdV1,
): ManagedSurfaceHandleV1 {
  return Object.freeze({
    applicationEpoch,
    topologyRevision,
    surfaceInstanceId,
  });
}

function handleResultV1(
  applicationEpoch: NonNegativeSafeInteger,
  receipt: ManagedSurfaceTransitionReceiptV1,
): ManagedSurfaceHandleResultV1 {
  return Object.freeze({
    receipt,
    handle: receipt.kind === "applied" && receipt.surfaceInstanceId !== undefined
      ? handleV1(
        applicationEpoch,
        parseNonNegativeSafeInteger(receipt.afterTopologyRevision),
        receipt.surfaceInstanceId,
      )
      : null,
  });
}

export function createManagedSurfaceCoordinatorV1(
  input: CreateManagedSurfaceCoordinatorInputV1,
): ManagedSurfaceCoordinatorV1 {
  const applicationEpoch = parseNonNegativeSafeInteger(input.applicationEpoch);
  const subscriberFailureV1 = Object.freeze({
    code: "surface.subscriber_failed" as const,
    summary: "Managed Surface publication subscriber failed.",
    details: Object.freeze({ applicationEpoch }) as StrictJsonObjectV1,
  });
  let state = createManagedSurfaceReducerStateV1(
    applicationEpoch,
    input.resolvedOwnerIds,
    input.resolvedSlotDescriptors,
  );
  const resolvedOwnerIds = new Set(state.resolvedOwnerIds);
  const resolvedSlotDescriptors = state.resolvedSlotDescriptors;
  const listeners = new Set<() => void>();

  const reportSubscriberFailure = (): void => {
    try {
      input.reportSubscriberFailure?.(subscriberFailureV1);
    } catch {
      // Diagnostics are best effort and cannot change a committed publication.
    }
  };

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        reportSubscriberFailure();
      }
    }
  };

  const transition = (
    operation: Parameters<typeof reduceManagedSurfaceV1>[1],
  ): ManagedSurfaceTransitionReceiptV1 => {
    const previousPublication = state.publication;
    const result = reduceManagedSurfaceV1(state, operation);
    state = result.state;
    if (state.publication !== previousPublication) notify();
    return result.receipt;
  };

  const rejectedReceipt = (
    code:
      | "surface.coordinator_disposed"
      | "surface.unknown_owner"
      | "surface.slot_not_resolved"
      | "surface.slot_placement_mismatch",
  ): ManagedSurfaceTransitionReceiptV1 =>
    Object.freeze({
      kind: "rejected",
      code,
      beforeTopologyRevision: state.publication.topologyRevision,
      afterTopologyRevision: state.publication.topologyRevision,
    });

  const candidateAdmissionFailure = (
    definition: ManagedSurfaceResolvedDefinitionV1,
    expectedPlacement: "root" | "child",
    parent?: ManagedSurfaceHandleV1,
  ): ManagedSurfaceTransitionReceiptV1 | null => {
    if (state.publication.coordinatorDisposed) {
      return rejectedReceipt("surface.coordinator_disposed");
    }
    if (!resolvedOwnerIds.has(definition.ownerId)) {
      return rejectedReceipt("surface.unknown_owner");
    }
    if (definition.placement !== expectedPlacement) {
      return rejectedReceipt("surface.slot_placement_mismatch");
    }
    if (expectedPlacement === "root") {
      const hasRoot = resolvedSlotDescriptors.some(
        (descriptor) => descriptor.kind === "root" && descriptor.slotId === definition.slotId,
      );
      if (hasRoot) return null;
      const hasOtherPlacement = resolvedSlotDescriptors.some(
        (descriptor) => descriptor.slotId === definition.slotId,
      );
      return rejectedReceipt(
        hasOtherPlacement ? "surface.slot_placement_mismatch" : "surface.slot_not_resolved",
      );
    }
    const currentParent = parent === undefined ||
        parent.applicationEpoch !== state.publication.applicationEpoch ||
        parent.topologyRevision !== state.publication.topologyRevision
      ? undefined
      : state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === parent.surfaceInstanceId,
      );
    if (currentParent === undefined) return null;
    const hasChild = resolvedSlotDescriptors.some(
      (descriptor) =>
        descriptor.kind === "child" &&
        descriptor.parentDefinitionId === currentParent.definition.definitionId &&
        descriptor.slotId === definition.slotId,
    );
    if (hasChild) return null;
    const hasRoot = resolvedSlotDescriptors.some(
      (descriptor) => descriptor.kind === "root" && descriptor.slotId === definition.slotId,
    );
    return rejectedReceipt(
      hasRoot ? "surface.slot_placement_mismatch" : "surface.slot_not_resolved",
    );
  };

  const allocateCandidate = (
    request: ManagedSurfaceTransientOpenInputV1,
  ): ManagedSurfaceCandidateV1 => {
    if (state.identitySequenceHighWater >= Number.MAX_SAFE_INTEGER) {
      throw new TypeError("ui.managed_surface_id_sequence_exhausted");
    }
    const sequence = parsePositiveSafeInteger(state.identitySequenceHighWater + 1);
    const identity = createManagedSurfaceTransientIdentityV1(applicationEpoch, sequence);
    return Object.freeze({
      identityAllocation: identity.allocation,
      definition: request.definition,
      target: Object.freeze({
        kind: "transient" as const,
        occurrenceId: identity.occurrenceId,
      }),
      surfaceInstanceId: identity.surfaceInstanceId,
      routingLeaseId: identity.routingLeaseId,
      semanticOccurrenceId: request.semanticOccurrenceId,
    });
  };

  const coordinator: ManagedSurfaceCoordinatorV1 = {
    getSnapshot: () => state.publication,

    getHandle(surfaceInstanceId) {
      const current = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === surfaceInstanceId,
      );
      return current === undefined
        ? null
        : handleV1(applicationEpoch, state.publication.topologyRevision, surfaceInstanceId);
    },

    getOwnerHandle(ownerId) {
      const hasLiveInstance = state.publication.orderedInstances.some(
        (instance) => instance.definition.ownerId === ownerId,
      );
      return hasLiveInstance
        ? Object.freeze({
          applicationEpoch,
          topologyRevision: state.publication.topologyRevision,
          ownerId,
        })
        : null;
    },

    subscribe(listener) {
      if (state.publication.coordinatorDisposed) {
        throw new TypeError("ui.managed_surface_coordinator_disposed");
      }
      listeners.add(listener);
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },

    openTransientPrimary(request) {
      const admissionFailure = candidateAdmissionFailure(request.definition, "root");
      if (admissionFailure !== null) return handleResultV1(applicationEpoch, admissionFailure);
      const receipt = transition({
        kind: "open_primary",
        applicationEpoch,
        candidate: allocateCandidate(request),
      });
      return handleResultV1(applicationEpoch, receipt);
    },

    replaceTransientPrimary(request) {
      const admissionFailure = candidateAdmissionFailure(request.definition, "root");
      if (admissionFailure !== null) return handleResultV1(applicationEpoch, admissionFailure);
      const receipt = transition({
        kind: "replace_primary",
        expected: request.expected,
        candidate: allocateCandidate(request),
      });
      return handleResultV1(applicationEpoch, receipt);
    },

    pushTransientChild(request) {
      const admissionFailure = candidateAdmissionFailure(
        request.definition,
        "child",
        request.parent,
      );
      if (admissionFailure !== null) return handleResultV1(applicationEpoch, admissionFailure);
      const receipt = transition({
        kind: "push_child",
        parentEvidence: request.parent,
        candidate: allocateCandidate(request),
      });
      return handleResultV1(applicationEpoch, receipt);
    },

    closeExpected(handle) {
      return transition({ kind: "close_expected", evidence: handle });
    },

    closeTop() {
      return transition({ kind: "close_top", applicationEpoch });
    },

    closeOwner(handle) {
      return transition({ kind: "close_owner", evidence: handle });
    },

    routeDismiss(handle, dismissKind) {
      return transition({
        kind: "route_dismiss",
        evidence: handle,
        dismissKind,
      });
    },

    routeAction(request) {
      return transition({
        kind: "route_action",
        evidence: request.evidence,
        actionId: request.actionId,
        routingLeaseId: request.routingLeaseId,
      });
    },

    disposeOwner(ownerId) {
      return transition({ kind: "dispose_owner", applicationEpoch, ownerId });
    },

    dispose() {
      const receipt = transition({ kind: "dispose_coordinator" });
      if (state.publication.coordinatorDisposed) listeners.clear();
      return receipt;
    },
  };

  return Object.freeze(coordinator);
}
