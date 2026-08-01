// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, NonNegativeSafeInteger } from "@sillymaker/base";

import type {
  ManagedSurfaceCandidateV1,
  ManagedSurfaceDefinitionIdV1,
  ManagedSurfaceInstanceIdV1,
  ManagedSurfaceOperationV1,
  ManagedSurfaceOwnerIdV1,
  ManagedSurfaceOwnerTransitionEvidenceV1,
  ManagedSurfacePublicationV1,
  ManagedSurfacePublishedInstanceV1,
  ManagedSurfaceReadinessV1,
  ManagedSurfaceResolvedDefinitionV1,
  ManagedSurfaceResolvedSlotDescriptorV1,
  ManagedSurfaceSlotIdV1,
  ManagedSurfaceTransitionCodeV1,
  ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { hasExpectedManagedSurfaceTransientIdentityV1 } from "./managed-surface-identity.ts";

export interface ManagedSurfaceReducerStateV1 {
  readonly publication: DeepReadonly<ManagedSurfacePublicationV1>;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly identitySequenceHighWater: NonNegativeSafeInteger;
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
    definitionId: definition.definitionId,
    contractRevision: parsePositiveSafeInteger(definition.contractRevision),
    ownerId: definition.ownerId,
    slotId: definition.slotId,
    layerId: definition.layerId,
    layerOrder: parseNonNegativeSafeInteger(definition.layerOrder),
    placement: definition.placement,
    modality: definition.modality,
    inputPolicy: Object.freeze({ ...definition.inputPolicy }),
    dismissPolicy: Object.freeze({ ...definition.dismissPolicy }),
    focusPolicy: Object.freeze({ ...definition.focusPolicy }),
    navigationPolicy: Object.freeze({ ...definition.navigationPolicy }),
    actionIds: Object.freeze([...definition.actionIds]),
    readiness: Object.freeze({ ...definition.readiness }),
  }) as DeepReadonly<ManagedSurfaceResolvedDefinitionV1>;
}

function freezePublishedInstanceV1(
  candidate: ManagedSurfaceCandidateV1,
  parentInstanceId: ManagedSurfaceInstanceIdV1 | null,
  readiness: ManagedSurfaceReadinessV1 = Object.freeze({ kind: "ready" }),
): DeepReadonly<ManagedSurfacePublishedInstanceV1> {
  return Object.freeze({
    definition: freezeDefinitionV1(candidate.definition),
    target: Object.freeze({ ...candidate.target }),
    surfaceInstanceId: candidate.surfaceInstanceId,
    semanticOccurrenceId: candidate.semanticOccurrenceId,
    parentInstanceId,
    phase: readiness.kind === "preparing" ? "preparing" : "active",
    readiness: Object.freeze({ ...readiness }),
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

function withReadyReadinessV1(
  instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>,
): DeepReadonly<ManagedSurfacePublishedInstanceV1> {
  return Object.freeze({
    ...instance,
    phase: "active",
    readiness: Object.freeze({ kind: "ready" as const }),
  }) as DeepReadonly<ManagedSurfacePublishedInstanceV1>;
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
    const instance = ordered[index];
    if (
      instance !== undefined &&
      ((instance.readiness.kind === "ready" && instance.definition.modality === "blocking") ||
        isBlockingFallbackV1(instance))
    ) {
      topmostBlockingIndex = index;
    }
  }
  return Object.freeze(
    ordered.map((instance, index) =>
      instance.readiness.kind === "preparing" ? instance : withPhaseV1(
        instance,
        topmostBlockingIndex >= 0 && index < topmostBlockingIndex ? "suspended" : "active",
      )
    ),
  );
}

function isBlockingFallbackV1(
  instance: DeepReadonly<ManagedSurfacePublishedInstanceV1>,
): boolean {
  return instance.readiness.kind === "preparing" &&
    (instance.readiness.transition === "initial_open" ||
      instance.readiness.transition === "child_open");
}

function ownerTraceV1(
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  disposedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
): ManagedSurfacePublicationV1["ownerTrace"] {
  const byOwner = new Map<ManagedSurfaceOwnerIdV1, ManagedSurfaceInstanceIdV1[]>();
  for (const instance of instances) {
    const ownerId = instance.definition.ownerId;
    const current = byOwner.get(ownerId);
    if (current === undefined) byOwner.set(ownerId, [instance.surfaceInstanceId]);
    else current.push(instance.surfaceInstanceId);
  }
  return Object.freeze([
    ...[...byOwner].map(([ownerId, surfaceInstanceIds]) =>
      Object.freeze({
        ownerId,
        surfaceInstanceIds: Object.freeze(surfaceInstanceIds),
        disposed: false,
      })
    ),
    ...disposedOwnerIds
      .filter((ownerId) => !byOwner.has(ownerId))
      .map((ownerId) =>
        Object.freeze({
          ownerId,
          surfaceInstanceIds: Object.freeze([]),
          disposed: true,
        })
      ),
  ]);
}

function publicationV1(
  applicationEpoch: NonNegativeSafeInteger,
  publicationRevision: NonNegativeSafeInteger,
  topologyRevision: NonNegativeSafeInteger,
  instances: readonly DeepReadonly<ManagedSurfacePublishedInstanceV1>[],
  disposedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
  coordinatorDisposed: boolean,
): DeepReadonly<ManagedSurfacePublicationV1> {
  const orderedInstances = orderedWithDerivedPhasesV1(instances);
  const preparationFallbacks = Object.freeze(
    orderedInstances.filter(isBlockingFallbackV1).map((instance) =>
      Object.freeze({
        kind: "blocking_fallback" as const,
        candidateInstanceId: instance.surfaceInstanceId,
      })
    ),
  );
  const topmostBlocking =
    orderedInstances.toReversed().find((instance) =>
      instance.readiness.kind === "ready" && instance.definition.modality === "blocking"
    ) ??
      null;
  const inputInstance =
    orderedInstances.toReversed().find((instance) =>
      instance.phase === "active" && instance.definition.inputPolicy.kind === "managed"
    ) ?? null;
  const inputOwner =
    inputInstance === null || inputInstance.definition.inputPolicy.kind !== "managed"
      ? null
      : Object.freeze({
        surfaceInstanceId: inputInstance.surfaceInstanceId,
        inputContextId: inputInstance.definition.inputPolicy.inputContextId,
        routingLeaseId: inputInstance.routingLeaseId,
      });
  const focusInstance =
    orderedInstances.toReversed().find((instance) =>
      instance.phase === "active" && instance.definition.focusPolicy.kind === "owns_focus"
    ) ?? null;
  const focusOwner = focusInstance === null ||
      focusInstance.definition.focusPolicy.kind !== "owns_focus"
    ? null
    : Object.freeze({
      surfaceInstanceId: focusInstance.surfaceInstanceId,
      initialTargetId: focusInstance.definition.focusPolicy.initialTargetId,
      trap: focusInstance.definition.focusPolicy.trap,
      restore: focusInstance.definition.focusPolicy.restore,
    });
  const navigationTarget =
    orderedInstances.toReversed().find((instance) =>
      instance.phase === "active" && instance.definition.navigationPolicy.kind === "close"
    ) ?? null;
  return Object.freeze({
    applicationEpoch,
    publicationRevision,
    topologyRevision,
    orderedInstances,
    preparationFallbacks,
    topmostBlockingInstanceId: topmostBlocking?.surfaceInstanceId ?? null,
    inputOwner,
    focusOwner,
    navigationTargetInstanceId: navigationTarget?.surfaceInstanceId ?? null,
    ownerTrace: ownerTraceV1(orderedInstances, disposedOwnerIds),
    coordinatorDisposed,
  }) as DeepReadonly<ManagedSurfacePublicationV1>;
}

function stateV1(
  publication: DeepReadonly<ManagedSurfacePublicationV1>,
  resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
  resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[],
  identitySequenceHighWater: NonNegativeSafeInteger,
  disposedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
): ManagedSurfaceReducerStateV1 {
  return Object.freeze({
    publication,
    resolvedOwnerIds: Object.freeze([...resolvedOwnerIds]),
    resolvedSlotDescriptors: Object.freeze([...resolvedSlotDescriptors]),
    identitySequenceHighWater: parseNonNegativeSafeInteger(identitySequenceHighWater),
    disposedOwnerIds: Object.freeze([...new Set(disposedOwnerIds)]),
  });
}

function freezeSlotDescriptorV1(
  descriptor: ManagedSurfaceResolvedSlotDescriptorV1,
): ManagedSurfaceResolvedSlotDescriptorV1 {
  if (descriptor.cardinality !== "single" && descriptor.cardinality !== "stack") {
    throw new TypeError("ui.invalid_managed_surface_slot_descriptor");
  }
  if (descriptor.kind === "root") {
    return Object.freeze({
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1(descriptor.slotId),
      cardinality: descriptor.cardinality,
    });
  }
  if (descriptor.kind === "child") {
    return Object.freeze({
      kind: "child",
      parentDefinitionId: parseManagedSurfaceDefinitionIdV1(descriptor.parentDefinitionId),
      slotId: parseManagedSurfaceSlotIdV1(descriptor.slotId),
      cardinality: descriptor.cardinality,
    });
  }
  throw new TypeError("ui.invalid_managed_surface_slot_descriptor");
}

function slotDescriptorKeyV1(descriptor: ManagedSurfaceResolvedSlotDescriptorV1): string {
  return descriptor.kind === "root"
    ? `root:${descriptor.slotId}`
    : `child:${descriptor.parentDefinitionId}:${descriptor.slotId}`;
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
  disposedOwnerIds = state.disposedOwnerIds,
  coordinatorDisposed = false,
  surfaceInstanceId?: ManagedSurfaceInstanceIdV1,
  topologyChanged = true,
): ManagedSurfaceReducerResultV1 {
  const nextPublicationRevision = parseNonNegativeSafeInteger(
    state.publication.publicationRevision + 1,
  );
  const nextTopologyRevision = topologyChanged
    ? parseNonNegativeSafeInteger(state.publication.topologyRevision + 1)
    : state.publication.topologyRevision;
  const nextState = stateV1(
    publicationV1(
      state.publication.applicationEpoch,
      nextPublicationRevision,
      nextTopologyRevision,
      instances,
      disposedOwnerIds,
      coordinatorDisposed,
    ),
    state.resolvedOwnerIds,
    state.resolvedSlotDescriptors,
    state.identitySequenceHighWater,
    disposedOwnerIds,
  );
  return Object.freeze({
    state: nextState,
    receipt: receiptV1(state, "applied", code, nextTopologyRevision, surfaceInstanceId),
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
  if (candidate.identityAllocation.applicationEpoch !== state.publication.applicationEpoch) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_application_epoch",
      candidate.surfaceInstanceId,
    );
  }
  if (candidate.identityAllocation.sequence <= state.identitySequenceHighWater) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.reused_identity_allocation",
      candidate.surfaceInstanceId,
    );
  }
  if (
    candidate.identityAllocation.sequence !== state.identitySequenceHighWater + 1 ||
    !hasExpectedManagedSurfaceTransientIdentityV1(candidate)
  ) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.invalid_identity_allocation",
      candidate.surfaceInstanceId,
    );
  }
  return null;
}

function withAdmittedCandidateIdentityV1(
  state: ManagedSurfaceReducerStateV1,
  candidate: ManagedSurfaceCandidateV1,
): ManagedSurfaceReducerStateV1 {
  return stateV1(
    state.publication,
    state.resolvedOwnerIds,
    state.resolvedSlotDescriptors,
    parseNonNegativeSafeInteger(candidate.identityAllocation.sequence),
    state.disposedOwnerIds,
  );
}

function rootSlotDescriptorV1(
  state: ManagedSurfaceReducerStateV1,
  slotId: ManagedSurfaceSlotIdV1,
): ManagedSurfaceResolvedSlotDescriptorV1 | undefined {
  return state.resolvedSlotDescriptors.find(
    (descriptor) => descriptor.kind === "root" && descriptor.slotId === slotId,
  );
}

function childSlotDescriptorV1(
  state: ManagedSurfaceReducerStateV1,
  parentDefinitionId: ManagedSurfaceDefinitionIdV1,
  slotId: ManagedSurfaceSlotIdV1,
): ManagedSurfaceResolvedSlotDescriptorV1 | undefined {
  return state.resolvedSlotDescriptors.find(
    (descriptor) =>
      descriptor.kind === "child" &&
      descriptor.parentDefinitionId === parentDefinitionId &&
      descriptor.slotId === slotId,
  );
}

function candidateStructuralFailureV1(
  state: ManagedSurfaceReducerStateV1,
  operation: Extract<ManagedSurfaceOperationV1, { readonly candidate: ManagedSurfaceCandidateV1 }>,
): ManagedSurfaceReducerResultV1 | null {
  const candidate = operation.candidate;
  if (!state.resolvedOwnerIds.includes(candidate.definition.ownerId)) {
    return unchangedResultV1(state, "rejected", "surface.unknown_owner");
  }
  if (operation.kind !== "prepare_child") {
    if (candidate.definition.placement !== "root") {
      return unchangedResultV1(state, "rejected", "surface.slot_placement_mismatch");
    }
    if (rootSlotDescriptorV1(state, candidate.definition.slotId) !== undefined) return null;
    const hasOtherPlacement = state.resolvedSlotDescriptors.some(
      (descriptor) => descriptor.slotId === candidate.definition.slotId,
    );
    return unchangedResultV1(
      state,
      "rejected",
      hasOtherPlacement ? "surface.slot_placement_mismatch" : "surface.slot_not_resolved",
    );
  }
  if (candidate.definition.placement !== "child") {
    return unchangedResultV1(state, "rejected", "surface.slot_placement_mismatch");
  }
  if (
    operation.parentEvidence.applicationEpoch !== state.publication.applicationEpoch ||
    operation.parentEvidence.topologyRevision !== state.publication.topologyRevision
  ) {
    return null;
  }

  const parent = state.publication.orderedInstances.find(
    (instance) => instance.surfaceInstanceId === operation.parentEvidence.surfaceInstanceId,
  );
  if (parent === undefined) return null;
  if (childSlotDescriptorV1(state, parent.definition.definitionId, candidate.definition.slotId)) {
    return null;
  }
  const hasRootDescriptor = rootSlotDescriptorV1(state, candidate.definition.slotId) !== undefined;
  return unchangedResultV1(
    state,
    "rejected",
    hasRootDescriptor ? "surface.slot_placement_mismatch" : "surface.slot_not_resolved",
  );
}

function openPreconditionFailureV1(
  state: ManagedSurfaceReducerStateV1,
  candidate: ManagedSurfaceCandidateV1,
): ManagedSurfaceReducerResultV1 | null {
  if (state.disposedOwnerIds.includes(candidate.definition.ownerId)) {
    return unchangedResultV1(
      state,
      "rejected",
      "surface.owner_disposed",
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
      (instance) =>
        instance.surfaceInstanceId === evidence.surfaceInstanceId &&
        instance.readiness.kind === "ready",
    )
  ) {
    return unchangedResultV1(state, "stale", "surface.stale_instance", evidence.surfaceInstanceId);
  }
  return null;
}

function ownerEvidenceFailureV1(
  state: ManagedSurfaceReducerStateV1,
  evidence: ManagedSurfaceOwnerTransitionEvidenceV1,
): ManagedSurfaceReducerResultV1 | null {
  if (evidence.applicationEpoch !== state.publication.applicationEpoch) {
    return unchangedResultV1(state, "stale", "surface.stale_application_epoch");
  }
  if (evidence.topologyRevision !== state.publication.topologyRevision) {
    return unchangedResultV1(state, "stale", "surface.stale_topology_revision");
  }
  if (state.disposedOwnerIds.includes(evidence.ownerId)) {
    return unchangedResultV1(state, "unchanged", "surface.owner_already_disposed");
  }
  return null;
}

type ClosePreparationCancellationScopeV1 =
  | { readonly kind: "related" }
  | {
    readonly kind: "owner_preparations";
    readonly ownerId: ManagedSurfaceOwnerIdV1;
  };

const relatedPreparationCancellationV1 = Object.freeze({ kind: "related" as const });

function currentCloseTargetIdV1(
  state: ManagedSurfaceReducerStateV1,
): ManagedSurfaceInstanceIdV1 | null {
  return state.publication.orderedInstances.toReversed().find((instance) =>
    isBlockingFallbackV1(instance) ||
    instance.surfaceInstanceId === state.publication.navigationTargetInstanceId
  )?.surfaceInstanceId ?? null;
}

function closeInstanceV1(
  state: ManagedSurfaceReducerStateV1,
  surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  code: "surface.closed" | "surface.dismissed",
  cancellationScope: ClosePreparationCancellationScopeV1 = relatedPreparationCancellationV1,
): ManagedSurfaceReducerResultV1 {
  const instances = state.publication.orderedInstances;
  const target = instances.find((instance) => instance.surfaceInstanceId === surfaceInstanceId);
  if (target === undefined) {
    return unchangedResultV1(state, "rejected", "surface.invalid_transition", surfaceInstanceId);
  }
  const removed = descendantsIncludingV1(instances, surfaceInstanceId);
  const removedIds = new Set(removed.map((instance) => instance.surfaceInstanceId));
  for (const instance of instances) {
    if (
      instance.readiness.kind === "preparing" &&
      ((cancellationScope.kind === "owner_preparations" &&
        instance.definition.ownerId === cancellationScope.ownerId) ||
        (instance.readiness.transition === "primary_replacement" &&
          removedIds.has(instance.readiness.retainedInstanceId)))
    ) {
      removedIds.add(instance.surfaceInstanceId);
    }
  }
  return appliedResultV1(
    state,
    code,
    instances.filter((instance) => !removedIds.has(instance.surfaceInstanceId)),
    state.disposedOwnerIds,
    false,
    surfaceInstanceId,
  );
}

function settleReadinessV1(
  state: ManagedSurfaceReducerStateV1,
  operation: Extract<
    ManagedSurfaceOperationV1,
    { readonly kind: "readiness_ready" | "readiness_failed" }
  >,
): ManagedSurfaceReducerResultV1 {
  if (operation.evidence.applicationEpoch !== state.publication.applicationEpoch) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_application_epoch",
      operation.evidence.surfaceInstanceId,
    );
  }
  const candidate = state.publication.orderedInstances.find(
    (instance) =>
      instance.surfaceInstanceId === operation.evidence.surfaceInstanceId &&
      instance.readiness.kind === "preparing",
  );
  if (candidate === undefined) {
    return unchangedResultV1(
      state,
      "stale",
      "surface.stale_readiness",
      operation.evidence.surfaceInstanceId,
    );
  }
  if (operation.kind === "readiness_failed") {
    return appliedResultV1(
      state,
      "surface.readiness_failed",
      state.publication.orderedInstances.filter(
        (instance) => instance.surfaceInstanceId !== candidate.surfaceInstanceId,
      ),
      state.disposedOwnerIds,
      false,
      candidate.surfaceInstanceId,
      isBlockingFallbackV1(candidate),
    );
  }

  let instances = state.publication.orderedInstances;
  if (
    candidate.readiness.kind === "preparing" &&
    candidate.readiness.transition === "primary_replacement"
  ) {
    const removed = descendantsIncludingV1(instances, candidate.readiness.retainedInstanceId);
    const removedIds = new Set(removed.map((instance) => instance.surfaceInstanceId));
    instances = instances.filter(
      (instance) => !removedIds.has(instance.surfaceInstanceId),
    );
  }
  return appliedResultV1(
    state,
    "surface.readiness_ready",
    instances.map((instance) =>
      instance.surfaceInstanceId === candidate.surfaceInstanceId
        ? withReadyReadinessV1(instance)
        : instance
    ),
    state.disposedOwnerIds,
    false,
    candidate.surfaceInstanceId,
    true,
  );
}

export function createManagedSurfaceReducerStateV1(
  applicationEpoch: number,
  resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[],
  resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[],
): ManagedSurfaceReducerStateV1 {
  const parsedEpoch = parseNonNegativeSafeInteger(applicationEpoch);
  const parsedOwnerIds = resolvedOwnerIds.map(parseManagedSurfaceOwnerIdV1);
  if (new Set(parsedOwnerIds).size !== parsedOwnerIds.length) {
    throw new TypeError("ui.managed_surface_duplicate_owner");
  }
  const parsedSlotDescriptors = resolvedSlotDescriptors.map(freezeSlotDescriptorV1);
  const slotDescriptorKeys = parsedSlotDescriptors.map(slotDescriptorKeyV1);
  if (new Set(slotDescriptorKeys).size !== slotDescriptorKeys.length) {
    throw new TypeError("ui.managed_surface_duplicate_slot_descriptor");
  }
  return stateV1(
    publicationV1(
      parsedEpoch,
      parseNonNegativeSafeInteger(0),
      parseNonNegativeSafeInteger(0),
      [],
      [],
      false,
    ),
    parsedOwnerIds,
    parsedSlotDescriptors,
    parseNonNegativeSafeInteger(0),
    [],
  );
}

export function reduceManagedSurfaceV1(
  initialState: ManagedSurfaceReducerStateV1,
  operation: ManagedSurfaceOperationV1,
): ManagedSurfaceReducerResultV1 {
  let state = initialState;
  if (operation.kind === "readiness_ready" || operation.kind === "readiness_failed") {
    return settleReadinessV1(state, operation);
  }
  if (operation.kind === "dispose_coordinator") {
    if (state.publication.coordinatorDisposed) {
      return unchangedResultV1(state, "unchanged", "surface.coordinator_already_disposed");
    }
    return appliedResultV1(
      state,
      "surface.coordinator_disposed",
      [],
      state.disposedOwnerIds,
      true,
    );
  }
  if (state.publication.coordinatorDisposed) {
    return unchangedResultV1(state, "rejected", "surface.coordinator_disposed");
  }

  if ("candidate" in operation) {
    const structuralFailure = candidateStructuralFailureV1(state, operation);
    if (structuralFailure !== null) return structuralFailure;
    const identityFailure = candidateIdentityFailureV1(state, operation.candidate);
    if (identityFailure !== null) return identityFailure;
  }

  switch (operation.kind) {
    case "prepare_initial": {
      if (operation.applicationEpoch !== state.publication.applicationEpoch) {
        return unchangedResultV1(
          state,
          "stale",
          "surface.stale_application_epoch",
          operation.candidate.surfaceInstanceId,
        );
      }
      const failure = openPreconditionFailureV1(state, operation.candidate);
      if (failure !== null) return failure;
      const slotDescriptor = rootSlotDescriptorV1(state, operation.candidate.definition.slotId);
      if (
        slotDescriptor?.cardinality === "single" &&
        state.publication.orderedInstances.some(
          (instance) =>
            instance.parentInstanceId === null &&
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
      state = withAdmittedCandidateIdentityV1(state, operation.candidate);
      const instance = freezePublishedInstanceV1(
        operation.candidate,
        null,
        Object.freeze({ kind: "preparing", transition: "initial_open" }),
      );
      return appliedResultV1(
        state,
        "surface.preparation_started",
        [...state.publication.orderedInstances, instance],
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
        true,
      );
    }

    case "prepare_replacement": {
      const evidenceFailure = evidenceFailureV1(state, operation.expected);
      if (evidenceFailure !== null) return evidenceFailure;
      const failure = openPreconditionFailureV1(state, operation.candidate);
      if (failure !== null) return failure;
      const retainedRoot = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === operation.expected.surfaceInstanceId &&
          instance.parentInstanceId === null &&
          instance.readiness.kind === "ready",
      );
      if (
        retainedRoot === undefined ||
        retainedRoot.definition.ownerId !== operation.candidate.definition.ownerId ||
        retainedRoot.definition.slotId !== operation.candidate.definition.slotId
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.candidate.surfaceInstanceId,
        );
      }
      state = withAdmittedCandidateIdentityV1(state, operation.candidate);
      const instance = freezePublishedInstanceV1(
        operation.candidate,
        null,
        Object.freeze({
          kind: "preparing",
          transition: "primary_replacement",
          retainedInstanceId: retainedRoot.surfaceInstanceId,
        }),
      );
      return appliedResultV1(
        state,
        "surface.preparation_started",
        [
          ...state.publication.orderedInstances.filter((current) =>
            current.readiness.kind !== "preparing" ||
            current.readiness.transition !== "primary_replacement" ||
            current.readiness.retainedInstanceId !== retainedRoot.surfaceInstanceId
          ),
          instance,
        ],
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
        false,
      );
    }

    case "prepare_child": {
      const evidenceFailure = evidenceFailureV1(state, operation.parentEvidence);
      if (evidenceFailure !== null) return evidenceFailure;
      const failure = openPreconditionFailureV1(state, operation.candidate);
      if (failure !== null) return failure;
      const parent = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === operation.parentEvidence.surfaceInstanceId &&
          instance.readiness.kind === "ready",
      );
      if (
        parent === undefined ||
        parent.phase !== "active" ||
        parent.definition.ownerId !== operation.candidate.definition.ownerId ||
        operation.candidate.definition.layerOrder < parent.definition.layerOrder
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_parent",
          operation.candidate.surfaceInstanceId,
        );
      }
      const slotDescriptor = childSlotDescriptorV1(
        state,
        parent.definition.definitionId,
        operation.candidate.definition.slotId,
      );
      if (
        slotDescriptor?.cardinality === "single" &&
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
      state = withAdmittedCandidateIdentityV1(state, operation.candidate);
      const instance = freezePublishedInstanceV1(
        operation.candidate,
        parent.surfaceInstanceId,
        Object.freeze({ kind: "preparing", transition: "child_open" }),
      );
      return appliedResultV1(
        state,
        "surface.preparation_started",
        [...state.publication.orderedInstances, instance],
        state.disposedOwnerIds,
        false,
        instance.surfaceInstanceId,
        true,
      );
    }

    case "close_expected": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      return closeInstanceV1(state, operation.evidence.surfaceInstanceId, "surface.closed");
    }

    case "close_expected_with_owner_preparation_cancel": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      const target = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === operation.evidence.surfaceInstanceId,
      );
      if (target?.definition.ownerId !== operation.ownerId) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.evidence.surfaceInstanceId,
        );
      }
      return closeInstanceV1(
        state,
        target.surfaceInstanceId,
        "surface.closed",
        { kind: "owner_preparations", ownerId: operation.ownerId },
      );
    }

    case "close_top": {
      if (operation.applicationEpoch !== state.publication.applicationEpoch) {
        return unchangedResultV1(state, "stale", "surface.stale_application_epoch");
      }
      const topInstanceId = currentCloseTargetIdV1(state);
      if (topInstanceId === null) {
        return unchangedResultV1(state, "unchanged", "surface.already_closed");
      }
      return closeInstanceV1(state, topInstanceId, "surface.closed");
    }

    case "close_top_with_owner_preparation_cancel": {
      if (operation.applicationEpoch !== state.publication.applicationEpoch) {
        return unchangedResultV1(state, "stale", "surface.stale_application_epoch");
      }
      const topInstanceId = currentCloseTargetIdV1(state);
      if (topInstanceId === null) {
        return unchangedResultV1(state, "unchanged", "surface.already_closed");
      }
      const target = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === topInstanceId,
      );
      if (target?.definition.ownerId !== operation.ownerId) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          topInstanceId,
        );
      }
      return closeInstanceV1(
        state,
        topInstanceId,
        "surface.closed",
        { kind: "owner_preparations", ownerId: operation.ownerId },
      );
    }

    case "close_owner": {
      const failure = ownerEvidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      const ownerInstances = state.publication.orderedInstances.filter(
        (instance) => instance.definition.ownerId === operation.evidence.ownerId,
      );
      if (ownerInstances.length === 0) {
        return unchangedResultV1(state, "unchanged", "surface.already_closed");
      }
      const removedIds = new Set(
        ownerInstances.flatMap((instance) =>
          descendantsIncludingV1(
            state.publication.orderedInstances,
            instance.surfaceInstanceId,
          ).map((removed) => removed.surfaceInstanceId)
        ),
      );
      return appliedResultV1(
        state,
        "surface.owner_closed",
        state.publication.orderedInstances.filter(
          (instance) => !removedIds.has(instance.surfaceInstanceId),
        ),
      );
    }

    case "route_dismiss": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      const target = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === operation.evidence.surfaceInstanceId,
      );
      const isCurrentDismissTarget = operation.dismissKind === "back"
        ? state.publication.navigationTargetInstanceId === target?.surfaceInstanceId
        : state.publication.inputOwner?.surfaceInstanceId === target?.surfaceInstanceId;
      if (target === undefined || !isCurrentDismissTarget) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.evidence.surfaceInstanceId,
        );
      }
      const dismissAllowed = operation.dismissKind === "routed_cancel"
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

    case "route_dismiss_with_owner_preparation_cancel": {
      const failure = evidenceFailureV1(state, operation.evidence);
      if (failure !== null) return failure;
      const target = state.publication.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === operation.evidence.surfaceInstanceId,
      );
      const isCurrentDismissTarget = operation.dismissKind === "back"
        ? state.publication.navigationTargetInstanceId === target?.surfaceInstanceId
        : state.publication.inputOwner?.surfaceInstanceId === target?.surfaceInstanceId;
      if (
        target === undefined ||
        target.definition.ownerId !== operation.ownerId ||
        !isCurrentDismissTarget
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          operation.evidence.surfaceInstanceId,
        );
      }
      const dismissAllowed = operation.dismissKind === "routed_cancel"
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
      return closeInstanceV1(
        state,
        target.surfaceInstanceId,
        "surface.dismissed",
        { kind: "owner_preparations", ownerId: operation.ownerId },
      );
    }

    case "route_fallback_dismiss_with_owner_preparation_cancel": {
      if (operation.evidence.applicationEpoch !== state.publication.applicationEpoch) {
        return unchangedResultV1(
          state,
          "stale",
          "surface.stale_application_epoch",
          operation.evidence.surfaceInstanceId,
        );
      }
      const candidate = state.publication.orderedInstances.find(
        (instance) =>
          instance.surfaceInstanceId === operation.evidence.surfaceInstanceId &&
          instance.readiness.kind === "preparing",
      );
      if (candidate === undefined) {
        return unchangedResultV1(
          state,
          "stale",
          "surface.stale_readiness",
          operation.evidence.surfaceInstanceId,
        );
      }
      if (
        candidate.definition.ownerId !== operation.ownerId ||
        !isBlockingFallbackV1(candidate) ||
        currentCloseTargetIdV1(state) !== candidate.surfaceInstanceId
      ) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.invalid_transition",
          candidate.surfaceInstanceId,
        );
      }
      const dismissAllowed = operation.dismissKind === "routed_cancel"
        ? candidate.definition.dismissPolicy.routedCancel
        : candidate.definition.dismissPolicy[operation.dismissKind];
      if (!dismissAllowed) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.dismiss_locked",
          candidate.surfaceInstanceId,
        );
      }
      return closeInstanceV1(
        state,
        candidate.surfaceInstanceId,
        "surface.dismissed",
        { kind: "owner_preparations", ownerId: operation.ownerId },
      );
    }

    case "route_action": {
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
          "surface.not_input_owner",
          operation.evidence.surfaceInstanceId,
        );
      }
      if (
        operation.routingLeaseId !== target.routingLeaseId ||
        operation.routingLeaseId !== state.publication.inputOwner.routingLeaseId
      ) {
        return unchangedResultV1(
          state,
          "stale",
          "surface.stale_routing_lease",
          target.surfaceInstanceId,
        );
      }
      if (!target.definition.actionIds.includes(operation.actionId)) {
        return unchangedResultV1(
          state,
          "rejected",
          "surface.action_unpublished",
          target.surfaceInstanceId,
        );
      }
      return unchangedResultV1(
        state,
        "unchanged",
        "surface.action_routed",
        target.surfaceInstanceId,
      );
    }

    case "dispose_owner": {
      if (operation.applicationEpoch !== state.publication.applicationEpoch) {
        return unchangedResultV1(state, "stale", "surface.stale_application_epoch");
      }
      if (!state.resolvedOwnerIds.includes(operation.ownerId)) {
        return unchangedResultV1(state, "rejected", "surface.unknown_owner");
      }
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
        [...state.disposedOwnerIds, operation.ownerId],
        false,
        undefined,
        removed.length > 0,
      );
    }
  }
  const exhaustiveOperation: never = operation;
  return exhaustiveOperation;
}
