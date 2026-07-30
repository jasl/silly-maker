// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, NonNegativeSafeInteger } from "@sillymaker/base";

import type {
  ManagedSurfaceCandidateV1,
  ManagedSurfaceInstanceIdV1,
  ManagedSurfaceOperationV1,
  ManagedSurfaceOwnerIdV1,
  ManagedSurfacePublicationV1,
  ManagedSurfacePublishedInstanceV1,
  ManagedSurfaceResolvedDefinitionV1,
  ManagedSurfaceRoutingLeaseIdV1,
  ManagedSurfaceTargetOccurrenceIdV1,
  ManagedSurfaceTransitionCodeV1,
  ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";

export interface ManagedSurfaceReducerStateV1 {
  readonly publication: DeepReadonly<ManagedSurfacePublicationV1>;
  readonly retiredOccurrenceIds: readonly ManagedSurfaceTargetOccurrenceIdV1[];
  readonly retiredInstanceIds: readonly ManagedSurfaceInstanceIdV1[];
  readonly retiredRoutingLeaseIds: readonly ManagedSurfaceRoutingLeaseIdV1[];
  readonly disposedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
}

export interface ManagedSurfaceReducerResultV1 {
  readonly state: ManagedSurfaceReducerStateV1;
  readonly receipt: ManagedSurfaceTransitionReceiptV1;
}

function freezeDefinitionV1(
  definition: ManagedSurfaceResolvedDefinitionV1,
): DeepReadonly<ManagedSurfaceResolvedDefinitionV1> {
  return Object.freeze({
    ...definition,
    layerOrder: parseNonNegativeSafeInteger(definition.layerOrder),
    allowedParentSlotIds: Object.freeze([...definition.allowedParentSlotIds]),
    dismissPolicy: Object.freeze({ ...definition.dismissPolicy }),
    focusPolicy: Object.freeze({ ...definition.focusPolicy }),
    actionIds: Object.freeze([...definition.actionIds]),
  }) as DeepReadonly<ManagedSurfaceResolvedDefinitionV1>;
}

function freezePublishedInstanceV1(
  candidate: ManagedSurfaceCandidateV1,
  parentInstanceId: ManagedSurfaceInstanceIdV1 | null,
): DeepReadonly<ManagedSurfacePublishedInstanceV1> {
  return Object.freeze({
    definition: freezeDefinitionV1(candidate.definition),
    target: Object.freeze({ ...candidate.target }),
    surfaceInstanceId: candidate.surfaceInstanceId,
    semanticOccurrenceId: candidate.semanticOccurrenceId,
    parentInstanceId,
    phase: "active",
    readiness: Object.freeze({ kind: "ready" as const }),
    routingLeaseId: candidate.routingLeaseId,
  }) as DeepReadonly<ManagedSurfacePublishedInstanceV1>;
}

function withPhaseV1(
  instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>,
  phase: "active" | "suspended",
): DeepReadonly<ManagedSurfacePublishedInstanceV1> {
  if (instance.phase === phase) return instance;
  return Object.freeze({ ...instance, phase }) as DeepReadonly<ManagedSurfacePublishedInstanceV1>;
}

function orderedWithDerivedPhasesV1(
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
): readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[] {
  const ordered = instances
    .map((instance, insertionIndex) => ({ instance, insertionIndex }))
    .sort(
      (left, right) =>
        left.instance.definition.layerOrder - right.instance.definition.layerOrder ||
        left.insertionIndex - right.insertionIndex,
    )
    .map(({ instance }) => instance);
  let topmostBlockingIndex = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index]?.definition.modality === "blocking") topmostBlockingIndex = index;
  }
  return Object.freeze(
    ordered.map((instance, index) =>
      withPhaseV1(
        instance,
        topmostBlockingIndex >= 0 && index < topmostBlockingIndex ? "suspended" : "active",
      ),
    ),
  );
}

function ownerTraceV1(
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
): ManagedSurfacePublicationV1["ownerTrace"] {
  const byOwner = new Map<ManagedSurfaceOwnerIdV1, ManagedSurfaceInstanceIdV1[]>();
  for (const instance of instances) {
    const ownerId = instance.definition.ownerId;
    const current = byOwner.get(ownerId);
    if (current === undefined) byOwner.set(ownerId, [instance.surfaceInstanceId]);
    else current.push(instance.surfaceInstanceId);
  }
  return Object.freeze(
    [...byOwner].map(([ownerId, surfaceInstanceIds]) =>
      Object.freeze({
        ownerId,
        surfaceInstanceIds: Object.freeze(surfaceInstanceIds),
      }),
    ),
  );
}

function publicationV1(
  applicationEpoch: NonNegativeSafeInteger,
  topologyRevision: NonNegativeSafeInteger,
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  coordinatorDisposed: boolean,
): DeepReadonly<ManagedSurfacePublicationV1> {
  const orderedInstances = orderedWithDerivedPhasesV1(instances);
  const topmostBlocking =
    orderedInstances.toReversed().find((instance) => instance.definition.modality === "blocking") ??
    null;
  const inputInstance =
    orderedInstances.toReversed().find((instance) => instance.phase === "active") ?? null;
  const inputOwner =
    inputInstance === null
      ? null
      : Object.freeze({
          surfaceInstanceId: inputInstance.surfaceInstanceId,
          inputContextId: inputInstance.definition.inputContextId,
          routingLeaseId: inputInstance.routingLeaseId,
        });
  const focusOwner =
    inputInstance === null
      ? null
      : Object.freeze({
          surfaceInstanceId: inputInstance.surfaceInstanceId,
          initialTargetId: inputInstance.definition.focusPolicy.initialTargetId,
          trap: inputInstance.definition.focusPolicy.trap,
          restore: inputInstance.definition.focusPolicy.restore,
        });
  return Object.freeze({
    applicationEpoch,
    topologyRevision,
    orderedInstances,
    topmostBlockingInstanceId: topmostBlocking?.surfaceInstanceId ?? null,
    inputOwner,
    focusOwner,
    ownerTrace: ownerTraceV1(orderedInstances),
    coordinatorDisposed,
  }) as DeepReadonly<ManagedSurfacePublicationV1>;
}

function stateV1(
  publication: DeepReadonly<ManagedSurfacePublicationV1>,
  retiredOccurrenceIds: readonly ManagedSurfaceTargetOccurrenceIdV1[],
  retiredInstanceIds: readonly ManagedSurfaceInstanceIdV1[],
  retiredRoutingLeaseIds: readonly ManagedSurfaceRoutingLeaseIdV1[],
  disposedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
): ManagedSurfaceReducerStateV1 {
  return Object.freeze({
    publication,
    retiredOccurrenceIds: Object.freeze([...new Set(retiredOccurrenceIds)]),
    retiredInstanceIds: Object.freeze([...new Set(retiredInstanceIds)]),
    retiredRoutingLeaseIds: Object.freeze([...new Set(retiredRoutingLeaseIds)]),
    disposedOwnerIds: Object.freeze([...new Set(disposedOwnerIds)]),
  });
}

function receiptV1(
  state: ManagedSurfaceReducerStateV1,
  kind: ManagedSurfaceTransitionReceiptV1["kind"],
  code: ManagedSurfaceTransitionCodeV1,
  afterTopologyRevision = state.publication.topologyRevision,
  surfaceInstanceId?: ManagedSurfaceInstanceIdV1,
): ManagedSurfaceTransitionReceiptV1 {
  return Object.freeze({
    kind,
    code,
    beforeTopologyRevision: state.publication.topologyRevision,
    afterTopologyRevision,
    ...(surfaceInstanceId === undefined ? {} : { surfaceInstanceId }),
  }) as ManagedSurfaceTransitionReceiptV1;
}

function unchangedResultV1(
  state: ManagedSurfaceReducerStateV1,
  kind: "unchanged" | "stale" | "rejected" | "faulted",
  code: ManagedSurfaceTransitionCodeV1,
  surfaceInstanceId?: ManagedSurfaceInstanceIdV1,
): ManagedSurfaceReducerResultV1 {
  return Object.freeze({
    state,
    receipt: receiptV1(state, kind, code, state.publication.topologyRevision, surfaceInstanceId),
  });
}

function appliedResultV1(
  state: ManagedSurfaceReducerStateV1,
  code: ManagedSurfaceTransitionCodeV1,
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  retiredInstances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  disposedOwnerIds = state.disposedOwnerIds,
  coordinatorDisposed = false,
  surfaceInstanceId?: ManagedSurfaceInstanceIdV1,
): ManagedSurfaceReducerResultV1 {
  const nextRevision = parseNonNegativeSafeInteger(state.publication.topologyRevision + 1);
  const nextState = stateV1(
    publicationV1(state.publication.applicationEpoch, nextRevision, instances, coordinatorDisposed),
    [
      ...state.retiredOccurrenceIds,
      ...retiredInstances.map((instance) => instance.target.occurrenceId),
    ],
    [
      ...state.retiredInstanceIds,
      ...retiredInstances.map((instance) => instance.surfaceInstanceId),
    ],
    [
      ...state.retiredRoutingLeaseIds,
      ...retiredInstances.map((instance) => instance.routingLeaseId),
    ],
    disposedOwnerIds,
  );
  return Object.freeze({
    state: nextState,
    receipt: receiptV1(state, "applied", code, nextRevision, surfaceInstanceId),
  });
}

function candidateIdentityFailureV1(
  state: ManagedSurfaceReducerStateV1,
  candidate: ManagedSurfaceCandidateV1,
): ManagedSurfaceReducerResultV1 | null {
  const liveInstances = state.publication.orderedInstances;
  if (
    liveInstances.some((instance) => instance.target.occurrenceId === candidate.target.occurrenceId)
  ) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.duplicate_occurrence",
      candidate.surfaceInstanceId,
    );
  }
  if (
    liveInstances.some((instance) => instance.surfaceInstanceId === candidate.surfaceInstanceId)
  ) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.duplicate_instance",
      candidate.surfaceInstanceId,
    );
  }
  if (liveInstances.some((instance) => instance.routingLeaseId === candidate.routingLeaseId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.duplicate_routing_lease",
      candidate.surfaceInstanceId,
    );
  }
  if (state.retiredOccurrenceIds.includes(candidate.target.occurrenceId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.reused_occurrence",
      candidate.surfaceInstanceId,
    );
  }
  if (state.retiredInstanceIds.includes(candidate.surfaceInstanceId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.reused_instance",
      candidate.surfaceInstanceId,
    );
  }
  if (state.retiredRoutingLeaseIds.includes(candidate.routingLeaseId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.reused_routing_lease",
      candidate.surfaceInstanceId,
    );
  }
  return null;
}

function openPreconditionFailureV1(
  state: ManagedSurfaceReducerStateV1,
  candidate: ManagedSurfaceCandidateV1,
  expectedPlacement: "root" | "child",
): ManagedSurfaceReducerResultV1 | null {
  if (state.disposedOwnerIds.includes(candidate.definition.ownerId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.owner_disposed",
      candidate.surfaceInstanceId,
    );
  }
  const identityFailure = candidateIdentityFailureV1(state, candidate);
  if (identityFailure !== null) return identityFailure;
  if (
    candidate.definition.placement !== expectedPlacement ||
    (expectedPlacement === "root" && candidate.definition.slotCardinality !== "single")
  ) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.invalid_transition",
      candidate.surfaceInstanceId,
    );
  }
  return null;
}

function descendantsIncludingV1(
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  rootInstanceId: ManagedSurfaceInstanceIdV1,
): readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[] {
  const removedIds = new Set<ManagedSurfaceInstanceIdV1>([rootInstanceId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const instance of instances) {
      if (
        instance.parentInstanceId !== null &&
        removedIds.has(instance.parentInstanceId) &&
        !removedIds.has(instance.surfaceInstanceId)
      ) {
        removedIds.add(instance.surfaceInstanceId);
        changed = true;
      }
    }
  }
  return instances.filter((instance) => removedIds.has(instance.surfaceInstanceId));
}

function evidenceFailureV1(
  state: ManagedSurfaceReducerStateV1,
  evidence: {
    readonly applicationEpoch: NonNegativeSafeInteger;
    readonly topologyRevision: NonNegativeSafeInteger;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  },
): ManagedSurfaceReducerResultV1 | null {
  if (evidence.applicationEpoch !== state.publication.applicationEpoch) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_application_epoch",
      evidence.surfaceInstanceId,
    );
  }
  if (evidence.topologyRevision !== state.publication.topologyRevision) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_topology_revision",
      evidence.surfaceInstanceId,
    );
  }
  if (
    !state.publication.orderedInstances.some(
      (instance) => instance.surfaceInstanceId === evidence.surfaceInstanceId,
    )
  ) {
    return unchangedResultV1(state, "stale", "surface.stale_instance", evidence.surfaceInstanceId);
  }
  return null;
}

function closeInstanceV1(
  state: ManagedSurfaceReducerStateV1,
  surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  code: "surface.closed" | "surface.dismissed",
): ManagedSurfaceReducerResultV1 {
  const instances = state.publication.orderedInstances;
  const target = instances.find((instance) => instance.surfaceInstanceId === surfaceInstanceId);
  if (target === undefined) {
    return unchangedResultV1(state, "rejected", "surface.invalid_transition", surfaceInstanceId);
  }
  const removed = descendantsIncludingV1(instances, surfaceInstanceId);
  const removedIds = new Set(removed.map((instance) => instance.surfaceInstanceId));
  return appliedResultV1(
    state,
    code,
    instances.filter((instance) => !removedIds.has(instance.surfaceInstanceId)),
    removed,
    state.disposedOwnerIds,
    false,
    surfaceInstanceId,
  );
}

export function createManagedSurfaceReducerStateV1(
  applicationEpoch: number,
): ManagedSurfaceReducerStateV1 {
  const parsedEpoch = parseNonNegativeSafeInteger(applicationEpoch);
  return stateV1(
    publicationV1(parsedEpoch, parseNonNegativeSafeInteger(0), [], false),
    [],
    [],
    [],
    [],
  );
}

export function reduceManagedSurfaceV1(
  state: ManagedSurfaceReducerStateV1,
  operation: ManagedSurfaceOperationV1,
): ManagedSurfaceReducerResultV1 {
  if (operation.kind === "dispose_coordinator") {
    if (state.publication.coordinatorDisposed) {
      return unchangedResultV1(state, "unchanged", "surface.coordinator_already_disposed");
    }
    return appliedResultV1(
      state,
      "surface.coordinator_disposed",
      [],
      state.publication.orderedInstances,
      state.disposedOwnerIds,
      true,
    );
  }
  if (state.publication.coordinatorDisposed) {
    return unchangedResultV1(state, "rejected", "surface.coordinator_disposed");
  }
  if (
    operation.kind !== "close_expected" &&
    operation.kind !== "route_dismiss" &&
    operation.applicationEpoch !== state.publication.applicationEpoch
  ) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_application_epoch",
      operation.kind === "dispose_owner" ? undefined : operation.candidate.surfaceInstanceId,
    );
  }

  switch (operation.kind) {
    case "open_primary": {
      const failure = openPreconditionFailureV1(state, operation.candidate, "root");
      if (failure !== null) return failure;
      if (
        operation.candidate.definition.slotCardinality === "single" &&
        state.publication.orderedInstances.some(
          (instance) =>
            instance.definition.ownerId === operation.candidate.definition.ownerId &&
            instance.definition.slotId === operation.candidate.definition.slotId,
        )
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.slot_occupied",
          operation.candidate.surfaceInstanceId,
        );
      }
      const instance = freezePublishedInstanceV1(operation.candidate, null);
      return appliedResultV1(
        state,
        "surface.opened",
        [...state.publication.orderedInstances, instance],
        [],
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
      );
    }

    case "replace_primary": {
      const failure = openPreconditionFailureV1(state, operation.candidate, "root");
      if (failure !== null) return failure;
      const replacedRoot = state.publication.orderedInstances.find(
        (instance) =>
          instance.parentInstanceId === null &&
          instance.definition.ownerId === operation.candidate.definition.ownerId &&
          instance.definition.slotId === operation.candidate.definition.slotId,
      );
      if (replacedRoot === undefined) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.candidate.surfaceInstanceId,
        );
      }
      const removed = descendantsIncludingV1(
        state.publication.orderedInstances,
        replacedRoot.surfaceInstanceId,
      );
      const removedIds = new Set(removed.map((instance) => instance.surfaceInstanceId));
      const instance = freezePublishedInstanceV1(operation.candidate, null);
      return appliedResultV1(
        state,
        "surface.replaced",
        [
          ...state.publication.orderedInstances.filter(
            (current) => !removedIds.has(current.surfaceInstanceId),
          ),
          instance,
        ],
        removed,
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
      );
    }

    case "push_child": {
      const failure = openPreconditionFailureV1(state, operation.candidate, "child");
      if (failure !== null) return failure;
      const parent = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === operation.parentInstanceId,
      );
      if (
        parent === undefined ||
        parent.phase !== "active" ||
        parent.definition.ownerId !== operation.candidate.definition.ownerId ||
        state.publication.inputOwner?.surfaceInstanceId !== parent.surfaceInstanceId ||
        operation.candidate.definition.layerOrder < parent.definition.layerOrder ||
        !operation.candidate.definition.allowedParentSlotIds.includes(parent.definition.slotId)
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_parent",
          operation.candidate.surfaceInstanceId,
        );
      }
      if (
        operation.candidate.definition.slotCardinality === "single" &&
        state.publication.orderedInstances.some(
          (instance) =>
            instance.parentInstanceId === parent.surfaceInstanceId &&
            instance.definition.slotId === operation.candidate.definition.slotId,
        )
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.slot_occupied",
          operation.candidate.surfaceInstanceId,
        );
      }
      const instance = freezePublishedInstanceV1(operation.candidate, parent.surfaceInstanceId);
      return appliedResultV1(
        state,
        "surface.child_pushed",
        [...state.publication.orderedInstances, instance],
        [],
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
      );
    }

    case "close_expected": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      return closeInstanceV1(state, operation.evidence.surfaceInstanceId, "surface.closed");
    }

    case "route_dismiss": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      const target = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === operation.evidence.surfaceInstanceId,
      );
      if (
        target === undefined ||
        state.publication.inputOwner?.surfaceInstanceId !== target.surfaceInstanceId
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.evidence.surfaceInstanceId,
        );
      }
      const dismissAllowed =
        operation.dismissKind === "routed_cancel"
          ? target.definition.dismissPolicy.routedCancel
          : target.definition.dismissPolicy[operation.dismissKind];
      if (!dismissAllowed) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.dismiss_locked",
          target.surfaceInstanceId,
        );
      }
      return closeInstanceV1(state, target.surfaceInstanceId, "surface.dismissed");
    }

    case "dispose_owner": {
      if (state.disposedOwnerIds.includes(operation.ownerId)) {
        return unchangedResultV1(state, "unchanged", "surface.owner_already_disposed");
      }
      const removed = state.publication.orderedInstances.filter(
        (instance) => instance.definition.ownerId === operation.ownerId,
      );
      const removedIds = new Set(removed.map((instance) => instance.surfaceInstanceId));
      return appliedResultV1(
        state,
        "surface.owner_disposed",
        state.publication.orderedInstances.filter(
          (instance) => !removedIds.has(instance.surfaceInstanceId),
        ),
        removed,
        [...state.disposedOwnerIds, operation.ownerId],
      );
    }
  }
  const exhaustiveOperation: never = operation;
  return exhaustiveOperation;
}
