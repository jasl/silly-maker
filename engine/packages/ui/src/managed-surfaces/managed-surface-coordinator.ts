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
  type ManagedSurfaceReadinessEvidenceV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceRouteActionInputV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceTransitionEvidenceV1,
  type ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "./managed-surface-definition.ts";
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

export interface ManagedSurfaceTransientInitialSupersedeInputV1
  extends ManagedSurfaceTransientOpenInputV1 {
  readonly expected: ManagedSurfaceReadinessEvidenceV1;
}

export interface ManagedSurfaceTransientReplacementCancelInputV1 {
  readonly retained: ManagedSurfaceHandleV1;
  readonly pending: ManagedSurfaceReadinessEvidenceV1;
}

export interface ManagedSurfaceTransientChildInputV1 extends ManagedSurfaceTransientOpenInputV1 {
  readonly parent: ManagedSurfaceHandleV1;
}

export interface ManagedSurfaceHandleResultV1 {
  readonly receipt: ManagedSurfaceTransitionReceiptV1;
  readonly handle: ManagedSurfaceHandleV1 | null;
  readonly readiness: ManagedSurfaceReadinessAdapterV1 | null;
}

export interface ManagedSurfaceReadinessAdapterV1 {
  readonly evidence: ManagedSurfaceReadinessEvidenceV1;
  ready(): ManagedSurfaceHandleResultV1;
  fail(): ManagedSurfaceTransitionReceiptV1;
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
  /** @internal Atomically replaces one initial blocking candidate with a fresh candidate. */
  supersedeTransientInitialPreparation(
    input: ManagedSurfaceTransientInitialSupersedeInputV1,
  ): ManagedSurfaceHandleResultV1;
  replaceTransientPrimary(
    input: ManagedSurfaceTransientReplaceInputV1,
  ): ManagedSurfaceHandleResultV1;
  /** @internal Cancels one pending primary replacement without replacing its retained root. */
  cancelTransientPrimaryReplacement(
    input: ManagedSurfaceTransientReplacementCancelInputV1,
  ): ManagedSurfaceTransitionReceiptV1;
  pushTransientChild(input: ManagedSurfaceTransientChildInputV1): ManagedSurfaceHandleResultV1;
  closeExpected(handle: ManagedSurfaceHandleV1): ManagedSurfaceTransitionReceiptV1;
  /** @internal Atomically closes the expected target and cancels this owner's preparation. */
  closeExpectedWithOwnerPreparationCancel(
    handle: ManagedSurfaceHandleV1,
    ownerId: ManagedSurfaceOwnerIdV1,
  ): ManagedSurfaceTransitionReceiptV1;
  /** Synchronous current-intent convenience; delayed callbacks use closeExpected. */
  closeTop(): ManagedSurfaceTransitionReceiptV1;
  /** @internal Closes the global current target and cancels its owner's preparation. */
  closeTopWithOwnerPreparationCancel(
    ownerId: ManagedSurfaceOwnerIdV1,
  ): ManagedSurfaceTransitionReceiptV1;
  closeOwner(handle: ManagedSurfaceOwnerHandleV1): ManagedSurfaceTransitionReceiptV1;
  routeDismiss(
    handle: ManagedSurfaceHandleV1,
    dismissKind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
  /** @internal Atomically dismisses the target and cancels this owner's preparation. */
  routeDismissWithOwnerPreparationCancel(
    handle: ManagedSurfaceHandleV1,
    ownerId: ManagedSurfaceOwnerIdV1,
    dismissKind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
  /** @internal Candidate-bound dismissal that preserves unrelated owner preparation. */
  routeFallbackDismissExactCandidate(
    evidence: ManagedSurfaceReadinessEvidenceV1,
    dismissKind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
  /** @internal Candidate-bound dismissal for a code-native blocking fallback. */
  routeFallbackDismissWithOwnerPreparationCancel(
    evidence: ManagedSurfaceReadinessEvidenceV1,
    ownerId: ManagedSurfaceOwnerIdV1,
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
  activateHandle: boolean,
  readiness: ManagedSurfaceReadinessAdapterV1 | null = null,
): ManagedSurfaceHandleResultV1 {
  return Object.freeze({
    receipt,
    handle: activateHandle && receipt.kind === "applied" && receipt.surfaceInstanceId !== undefined
      ? handleV1(
        applicationEpoch,
        parseNonNegativeSafeInteger(receipt.afterTopologyRevision),
        receipt.surfaceInstanceId,
      )
      : null,
    readiness,
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
      | "surface.invalid_definition"
      | "surface.owner_disposed"
      | "surface.unknown_owner"
      | "surface.slot_not_resolved"
      | "surface.slot_placement_mismatch"
      | "surface.slot_occupied"
      | "surface.invalid_parent"
      | "surface.invalid_transition",
  ): ManagedSurfaceTransitionReceiptV1 =>
    Object.freeze({
      kind: "rejected",
      code,
      beforeTopologyRevision: state.publication.topologyRevision,
      afterTopologyRevision: state.publication.topologyRevision,
    });

  const staleReceipt = (
    code:
      | "surface.stale_application_epoch"
      | "surface.stale_topology_revision"
      | "surface.stale_instance"
      | "surface.stale_readiness",
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1 =>
    Object.freeze({
      kind: "stale",
      code,
      beforeTopologyRevision: state.publication.topologyRevision,
      afterTopologyRevision: state.publication.topologyRevision,
      surfaceInstanceId,
    });

  const evidenceAdmissionFailure = (
    evidence: ManagedSurfaceHandleV1,
  ): ManagedSurfaceTransitionReceiptV1 | null => {
    if (evidence.applicationEpoch !== state.publication.applicationEpoch) {
      return staleReceipt("surface.stale_application_epoch", evidence.surfaceInstanceId);
    }
    if (evidence.topologyRevision !== state.publication.topologyRevision) {
      return staleReceipt("surface.stale_topology_revision", evidence.surfaceInstanceId);
    }
    const current = state.publication.orderedInstances.find(
      (instance) =>
        instance.surfaceInstanceId === evidence.surfaceInstanceId &&
        instance.readiness.kind === "ready",
    );
    return current === undefined
      ? staleReceipt("surface.stale_instance", evidence.surfaceInstanceId)
      : null;
  };

  const readinessAdmissionFailure = (
    evidence: ManagedSurfaceReadinessEvidenceV1,
  ): ManagedSurfaceTransitionReceiptV1 | null => {
    if (evidence.applicationEpoch !== state.publication.applicationEpoch) {
      return staleReceipt("surface.stale_application_epoch", evidence.surfaceInstanceId);
    }
    const current = state.publication.orderedInstances.find(
      (instance) =>
        instance.surfaceInstanceId === evidence.surfaceInstanceId &&
        instance.readiness.kind === "preparing",
    );
    return current === undefined
      ? staleReceipt("surface.stale_readiness", evidence.surfaceInstanceId)
      : null;
  };

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

  const normalizeDefinition = (
    definition: ManagedSurfaceResolvedDefinitionV1,
  ): ManagedSurfaceResolvedDefinitionV1 | ManagedSurfaceTransitionReceiptV1 => {
    try {
      return parseManagedSurfaceResolvedDefinitionV1(definition);
    } catch {
      return rejectedReceipt("surface.invalid_definition");
    }
  };

  const readinessAdapterV1 = (
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceReadinessAdapterV1 => {
    const evidence = Object.freeze({ applicationEpoch, surfaceInstanceId });
    return Object.freeze({
      evidence,
      ready(): ManagedSurfaceHandleResultV1 {
        const receipt = transition({ kind: "readiness_ready", evidence });
        return handleResultV1(applicationEpoch, receipt, true);
      },
      fail(): ManagedSurfaceTransitionReceiptV1 {
        return transition({ kind: "readiness_failed", evidence });
      },
    });
  };

  const preparationResultV1 = (
    receipt: ManagedSurfaceTransitionReceiptV1,
  ): ManagedSurfaceHandleResultV1 =>
    handleResultV1(
      applicationEpoch,
      receipt,
      false,
      receipt.kind === "applied" && receipt.surfaceInstanceId !== undefined
        ? readinessAdapterV1(receipt.surfaceInstanceId)
        : null,
    );

  const coordinator: ManagedSurfaceCoordinatorV1 = {
    getSnapshot: () => state.publication,

    getHandle(surfaceInstanceId) {
      const current = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === surfaceInstanceId &&
          instance.readiness.kind === "ready",
      );
      return current === undefined
        ? null
        : handleV1(applicationEpoch, state.publication.topologyRevision, surfaceInstanceId);
    },

    getOwnerHandle(ownerId) {
      const hasLiveInstance = state.publication.orderedInstances.some(
        (instance) =>
          instance.definition.ownerId === ownerId && instance.readiness.kind === "ready",
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
      const definition = normalizeDefinition(request.definition);
      if ("kind" in definition) {
        return handleResultV1(applicationEpoch, definition, false);
      }
      const admissionFailure = candidateAdmissionFailure(definition, "root");
      if (admissionFailure !== null) {
        return handleResultV1(applicationEpoch, admissionFailure, false);
      }
      if (state.disposedOwnerIds.includes(definition.ownerId)) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.owner_disposed"),
          false,
        );
      }
      const rootSlot = resolvedSlotDescriptors.find(
        (descriptor) => descriptor.kind === "root" && descriptor.slotId === definition.slotId,
      );
      if (
        rootSlot?.cardinality === "single" &&
        state.publication.orderedInstances.some(
          (instance) =>
            instance.parentInstanceId === null && instance.definition.slotId === definition.slotId,
        )
      ) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.slot_occupied"),
          false,
        );
      }
      const receipt = transition({
        kind: "prepare_initial",
        applicationEpoch,
        candidate: allocateCandidate({ ...request, definition }),
      });
      return preparationResultV1(receipt);
    },

    supersedeTransientInitialPreparation(request) {
      const definition = normalizeDefinition(request.definition);
      if ("kind" in definition) {
        return handleResultV1(applicationEpoch, definition, false);
      }
      const admissionFailure = candidateAdmissionFailure(definition, "root");
      if (admissionFailure !== null) {
        return handleResultV1(applicationEpoch, admissionFailure, false);
      }
      if (state.disposedOwnerIds.includes(definition.ownerId)) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.owner_disposed"),
          false,
        );
      }
      const readinessFailure = readinessAdmissionFailure(request.expected);
      if (readinessFailure !== null) {
        return handleResultV1(applicationEpoch, readinessFailure, false);
      }
      const expectedCandidate = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === request.expected.surfaceInstanceId &&
          instance.parentInstanceId === null &&
          instance.readiness.kind === "preparing" &&
          instance.readiness.transition === "initial_open",
      );
      const rootSlot = resolvedSlotDescriptors.find(
        (descriptor) => descriptor.kind === "root" && descriptor.slotId === definition.slotId,
      );
      if (
        expectedCandidate === undefined ||
        rootSlot?.cardinality !== "single" ||
        expectedCandidate.definition.ownerId !== definition.ownerId ||
        expectedCandidate.definition.slotId !== definition.slotId
      ) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.invalid_transition"),
          false,
        );
      }
      const receipt = transition({
        kind: "supersede_initial_preparation",
        expected: request.expected,
        candidate: allocateCandidate({ ...request, definition }),
      });
      return preparationResultV1(receipt);
    },

    replaceTransientPrimary(request) {
      const definition = normalizeDefinition(request.definition);
      if ("kind" in definition) {
        return handleResultV1(applicationEpoch, definition, false);
      }
      const admissionFailure = candidateAdmissionFailure(definition, "root");
      if (admissionFailure !== null) {
        return handleResultV1(applicationEpoch, admissionFailure, false);
      }
      if (state.disposedOwnerIds.includes(definition.ownerId)) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.owner_disposed"),
          false,
        );
      }
      const evidenceFailure = evidenceAdmissionFailure(request.expected);
      if (evidenceFailure !== null) {
        return handleResultV1(applicationEpoch, evidenceFailure, false);
      }
      const retained = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === request.expected.surfaceInstanceId &&
          instance.parentInstanceId === null &&
          instance.readiness.kind === "ready",
      );
      if (
        retained === undefined ||
        retained.definition.ownerId !== definition.ownerId ||
        retained.definition.slotId !== definition.slotId
      ) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.invalid_transition"),
          false,
        );
      }
      const receipt = transition({
        kind: "prepare_replacement",
        expected: request.expected,
        candidate: allocateCandidate({ ...request, definition }),
      });
      return preparationResultV1(receipt);
    },

    cancelTransientPrimaryReplacement(request) {
      if (state.publication.coordinatorDisposed) {
        return rejectedReceipt("surface.coordinator_disposed");
      }
      const retainedFailure = evidenceAdmissionFailure(request.retained);
      if (retainedFailure !== null) return retainedFailure;
      const readinessFailure = readinessAdmissionFailure(request.pending);
      if (readinessFailure !== null) return readinessFailure;
      const retainedRoot = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === request.retained.surfaceInstanceId &&
          instance.parentInstanceId === null &&
          instance.readiness.kind === "ready",
      );
      const pendingCandidate = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === request.pending.surfaceInstanceId &&
          instance.parentInstanceId === null &&
          instance.readiness.kind === "preparing" &&
          instance.readiness.transition === "primary_replacement",
      );
      if (
        retainedRoot === undefined ||
        pendingCandidate === undefined ||
        pendingCandidate.readiness.kind !== "preparing" ||
        pendingCandidate.readiness.transition !== "primary_replacement" ||
        pendingCandidate.readiness.retainedInstanceId !== retainedRoot.surfaceInstanceId ||
        pendingCandidate.definition.ownerId !== retainedRoot.definition.ownerId ||
        pendingCandidate.definition.slotId !== retainedRoot.definition.slotId
      ) {
        return rejectedReceipt("surface.invalid_transition");
      }
      return transition({
        kind: "cancel_primary_replacement",
        retained: request.retained,
        pending: request.pending,
      });
    },

    pushTransientChild(request) {
      const definition = normalizeDefinition(request.definition);
      if ("kind" in definition) {
        return handleResultV1(applicationEpoch, definition, false);
      }
      const admissionFailure = candidateAdmissionFailure(
        definition,
        "child",
        request.parent,
      );
      if (admissionFailure !== null) {
        return handleResultV1(applicationEpoch, admissionFailure, false);
      }
      if (state.disposedOwnerIds.includes(definition.ownerId)) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.owner_disposed"),
          false,
        );
      }
      const evidenceFailure = evidenceAdmissionFailure(request.parent);
      if (evidenceFailure !== null) {
        return handleResultV1(applicationEpoch, evidenceFailure, false);
      }
      const parent = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === request.parent.surfaceInstanceId &&
          instance.readiness.kind === "ready",
      );
      if (
        parent === undefined ||
        parent.phase !== "active" ||
        parent.definition.ownerId !== definition.ownerId ||
        definition.layerOrder < parent.definition.layerOrder
      ) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.invalid_parent"),
          false,
        );
      }
      const childSlot = resolvedSlotDescriptors.find(
        (descriptor) =>
          descriptor.kind === "child" &&
          descriptor.parentDefinitionId === parent.definition.definitionId &&
          descriptor.slotId === definition.slotId,
      );
      if (
        childSlot?.cardinality === "single" &&
        state.publication.orderedInstances.some(
          (instance) =>
            instance.parentInstanceId === parent.surfaceInstanceId &&
            instance.definition.slotId === definition.slotId,
        )
      ) {
        return handleResultV1(
          applicationEpoch,
          rejectedReceipt("surface.slot_occupied"),
          false,
        );
      }
      const receipt = transition({
        kind: "prepare_child",
        parentEvidence: request.parent,
        candidate: allocateCandidate({ ...request, definition }),
      });
      return preparationResultV1(receipt);
    },

    closeExpected(handle) {
      return transition({ kind: "close_expected", evidence: handle });
    },

    closeExpectedWithOwnerPreparationCancel(handle, ownerId) {
      return transition({
        kind: "close_expected_with_owner_preparation_cancel",
        evidence: handle,
        ownerId,
      });
    },

    closeTop() {
      return transition({ kind: "close_top", applicationEpoch });
    },

    closeTopWithOwnerPreparationCancel(ownerId) {
      return transition({
        kind: "close_top_with_owner_preparation_cancel",
        applicationEpoch,
        ownerId,
      });
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

    routeDismissWithOwnerPreparationCancel(handle, ownerId, dismissKind) {
      return transition({
        kind: "route_dismiss_with_owner_preparation_cancel",
        evidence: handle,
        ownerId,
        dismissKind,
      });
    },

    routeFallbackDismissExactCandidate(evidence, dismissKind) {
      return transition({
        kind: "route_fallback_dismiss_exact_candidate",
        evidence,
        dismissKind,
      });
    },

    routeFallbackDismissWithOwnerPreparationCancel(evidence, ownerId, dismissKind) {
      return transition({
        kind: "route_fallback_dismiss_with_owner_preparation_cancel",
        evidence,
        ownerId,
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
