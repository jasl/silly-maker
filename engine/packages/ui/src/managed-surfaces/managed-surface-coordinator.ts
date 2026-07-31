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

const emptyFailureDetailsV1 = Object.freeze({}) as StrictJsonObjectV1;
const subscriberFailureV1 = Object.freeze({
  code: "surface.subscriber_failed" as const,
  summary: "Managed Surface publication subscriber failed.",
  details: emptyFailureDetailsV1,
});

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
  let state = createManagedSurfaceReducerStateV1(applicationEpoch, input.resolvedOwnerIds);
  const resolvedOwnerIds = new Set(state.resolvedOwnerIds);
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
    code: "surface.coordinator_disposed" | "surface.unknown_owner",
  ): ManagedSurfaceTransitionReceiptV1 =>
    Object.freeze({
      kind: "rejected",
      code,
      beforeTopologyRevision: state.publication.topologyRevision,
      afterTopologyRevision: state.publication.topologyRevision,
    });

  const candidateOwnerFailure = (
    ownerId: ManagedSurfaceOwnerIdV1,
  ): ManagedSurfaceTransitionReceiptV1 | null => {
    if (state.publication.coordinatorDisposed) {
      return rejectedReceipt("surface.coordinator_disposed");
    }
    return resolvedOwnerIds.has(ownerId) ? null : rejectedReceipt("surface.unknown_owner");
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
      const ownerFailure = candidateOwnerFailure(request.definition.ownerId);
      if (ownerFailure !== null) return handleResultV1(applicationEpoch, ownerFailure);
      const receipt = transition({
        kind: "open_primary",
        applicationEpoch,
        candidate: allocateCandidate(request),
      });
      return handleResultV1(applicationEpoch, receipt);
    },

    replaceTransientPrimary(request) {
      const ownerFailure = candidateOwnerFailure(request.definition.ownerId);
      if (ownerFailure !== null) return handleResultV1(applicationEpoch, ownerFailure);
      const receipt = transition({
        kind: "replace_primary",
        expected: request.expected,
        candidate: allocateCandidate(request),
      });
      return handleResultV1(applicationEpoch, receipt);
    },

    pushTransientChild(request) {
      const ownerFailure = candidateOwnerFailure(request.definition.ownerId);
      if (ownerFailure !== null) return handleResultV1(applicationEpoch, ownerFailure);
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
