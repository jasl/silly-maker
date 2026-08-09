// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceCoordinatorFacadeInternalV1 } from "./managed-surface-coordinator.ts";
import {
  createManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
} from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  allocateManagedSurfaceStableRuntimeAttemptInternalV1,
  compareManagedSurfaceStableCompositePrivateProvenanceInternalV1,
  createManagedSurfaceStableCompositeStateInternalV1,
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  createManagedSurfaceStableGapRuntimeBindingInternalV1,
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
  projectManagedSurfaceStableRootReservationSnapshotInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeStateInternalV1,
  type ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(73);
const workspaceOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const narrativeOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");
const rootSlotAV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-a");
const rootSlotBV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-b");
const childSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.child");
const narrativeChildSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.narrative-child");
const rootDefinitionAV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-a");
const replacementDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.root-a-replacement",
);
const rootDefinitionBV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-b");
const workspaceBlockerDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-blocker",
);
const narrativeRootDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.narrative-root",
);
const childDefinitionV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.child");
const narrativeChildDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.narrative-child",
);
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.reconcile-test");

const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root" as const,
      slotId: rootSlotAV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: rootSlotBV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootDefinitionAV1,
      slotId: childSlotV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: narrativeRootDefinitionV1,
      slotId: narrativeChildSlotV1,
      cardinality: "stack" as const,
    }),
  ] satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function schemaV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({ parse: (value: unknown): unknown => value });
}

function sidecarV1(input: {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly placement?: "root" | "child";
  readonly layerOrder: number;
}): ManagedSurfaceStableDefinitionSidecarInternalV1 {
  const definition = Object.freeze({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId,
    slotId: input.slotId,
    layerId: layerIdV1,
    layerOrder: parseNonNegativeSafeInteger(input.layerOrder),
    placement: input.placement ?? "root",
    modality: "blocking" as const,
    inputPolicy: Object.freeze({ kind: "none" as const }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: false,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({ kind: "none" as const }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([]),
    readiness: Object.freeze({
      initialOpen: "blocking_fallback" as const,
      primaryReplacement: "retain_current" as const,
      childOpen: "blocking_fallback" as const,
    }),
  }) satisfies ManagedSurfaceResolvedDefinitionV1;
  return Object.freeze({ definition, parameterSchema: schemaV1() });
}

const rootSidecarAV1 = sidecarV1({
  definitionId: rootDefinitionAV1,
  ownerId: workspaceOwnerIdV1,
  slotId: rootSlotAV1,
  layerOrder: 10,
});
const replacementSidecarV1 = sidecarV1({
  definitionId: replacementDefinitionV1,
  ownerId: workspaceOwnerIdV1,
  slotId: rootSlotAV1,
  layerOrder: 10,
});
const rootSidecarBV1 = sidecarV1({
  definitionId: rootDefinitionBV1,
  ownerId: workspaceOwnerIdV1,
  slotId: rootSlotBV1,
  layerOrder: 20,
});
const workspaceBlockerSidecarV1 = sidecarV1({
  definitionId: workspaceBlockerDefinitionV1,
  ownerId: workspaceOwnerIdV1,
  slotId: rootSlotAV1,
  layerOrder: 100,
});
const narrativeRootSidecarV1 = sidecarV1({
  definitionId: narrativeRootDefinitionV1,
  ownerId: narrativeOwnerIdV1,
  slotId: rootSlotBV1,
  layerOrder: 30,
});
const childSidecarV1 = sidecarV1({
  definitionId: childDefinitionV1,
  ownerId: workspaceOwnerIdV1,
  slotId: childSlotV1,
  placement: "child",
  layerOrder: 40,
});
const narrativeChildSidecarV1 = sidecarV1({
  definitionId: narrativeChildDefinitionV1,
  ownerId: narrativeOwnerIdV1,
  slotId: narrativeChildSlotV1,
  placement: "child",
  layerOrder: 40,
});

interface ReconcileHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly workspace: ManagedSurfaceStablePublisherInternalV1;
  readonly narrative: ManagedSurfaceStablePublisherInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
}

function harnessV1(input: {
  readonly identitySequenceHighWater?: number;
  readonly registerNarrative?: boolean;
  readonly reportSubscriberFailure?: () => void;
  readonly rootBLayerOrder?: number;
  readonly childLayerOrder?: number;
} = {}): ReconcileHarnessV1 {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const workspace = registry.issuePublisher(workspaceOwnerIdV1);
  const narrative = registry.issuePublisher(narrativeOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: [
      rootSidecarAV1,
      replacementSidecarV1,
      input.rootBLayerOrder === undefined ? rootSidecarBV1 : sidecarV1({
        definitionId: rootDefinitionBV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: input.rootBLayerOrder,
      }),
      workspaceBlockerSidecarV1,
      narrativeRootSidecarV1,
      input.childLayerOrder === undefined ? childSidecarV1 : sidecarV1({
        definitionId: childDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: childSlotV1,
        placement: "child",
        layerOrder: input.childLayerOrder,
      }),
      narrativeChildSidecarV1,
    ],
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });
  const baseTransientState = createManagedSurfaceReducerStateV1(
    applicationEpochV1,
    [workspaceOwnerIdV1, narrativeOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
  const initialTransientState = input.identitySequenceHighWater === undefined
    ? baseTransientState
    : Object.freeze({
      ...baseTransientState,
      identitySequenceHighWater: parseNonNegativeSafeInteger(
        input.identitySequenceHighWater,
      ),
    });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState,
    ...(input.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: input.reportSubscriberFailure }),
  });
  expect(kernel.registerStablePublisherLeaseInternalV1(workspace.lease).kind).toBe(
    "registered",
  );
  if (input.registerNarrative) {
    expect(kernel.registerStablePublisherLeaseInternalV1(narrative.lease).kind).toBe(
      "registered",
    );
  }
  return { registry, authority, workspace, narrative, kernel };
}

function constructionFixtureV1() {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const workspace = registry.issuePublisher(workspaceOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: [
      rootSidecarAV1,
      replacementSidecarV1,
      rootSidecarBV1,
      workspaceBlockerSidecarV1,
      narrativeRootSidecarV1,
      childSidecarV1,
      narrativeChildSidecarV1,
    ],
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });
  const initialTransientState = createManagedSurfaceReducerStateV1(
    applicationEpochV1,
    [workspaceOwnerIdV1, narrativeOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
  return Object.freeze({ registry, workspace, authority, initialTransientState });
}

function rawRootV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  definitionId: ManagedSurfaceDefinitionIdV1 = rootDefinitionAV1,
): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: publisher.issueOccurrence(),
    definitionId,
    parentOccurrenceId: null,
    parameters: null,
  });
}

function rawChildV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  parentOccurrenceId: ManagedSurfaceStableTargetInternalV1["occurrenceId"],
  definitionId: ManagedSurfaceDefinitionIdV1 = childDefinitionV1,
): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: publisher.issueOccurrence(),
    definitionId,
    parentOccurrenceId,
    parameters: null,
  });
}

function capturedContextV1(harness: ReconcileHarnessV1): {
  readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
} {
  const context = harness.kernel.captureAdmissionContextInternalV1(harness.workspace.lease);
  expect(context.kind).toBe("captured");
  if (context.kind !== "captured") throw new Error(`expected captured, got ${context.kind}`);
  return context;
}

function evaluateV1(input: {
  readonly harness: ReconcileHarnessV1;
  readonly context: ReturnType<typeof capturedContextV1>;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionProposalInternalV1 {
  const result = input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.harness.workspace.lease,
      sourceRevision: input.sourceRevision,
      targets: input.targets,
    }),
    acceptedBaseline: input.context.acceptedBaseline,
    reservationSnapshot: input.context.reservationSnapshot,
  });
  if (result.kind !== "admitted") {
    throw new Error(`expected admitted, got ${result.kind}:${result.code}`);
  }
  expect(result.kind).toBe("admitted");
  return result.proposal;
}

function admitV1(
  harness: ReconcileHarnessV1,
  targets: readonly ManagedSurfaceStableTargetInternalV1[],
): ManagedSurfaceStableAdmissionProposalInternalV1 {
  return evaluateV1({
    harness,
    context: capturedContextV1(harness),
    sourceRevision: harness.workspace.issueSourceRevision(),
    targets,
  });
}

function detachedProposalV1(input: {
  readonly harness: ReconcileHarnessV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionProposalInternalV1 {
  const result = input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.publisher.issueSourceRevision(),
      targets: input.targets,
    }),
    acceptedBaseline: input.acceptedBaseline,
    reservationSnapshot: projectManagedSurfaceStableRootReservationSnapshotInternalV1({
      state: input.harness.kernel.getStateInternalV1(),
      subjectPublisherLease: input.publisher.lease,
    }),
  });
  if (result.kind !== "admitted") {
    throw new Error(`expected admitted, got ${result.kind}:${result.code}`);
  }
  expect(result.kind).toBe("admitted");
  return result.proposal;
}

function desiredTargetFromProposalV1(
  harness: ReconcileHarnessV1,
  proposal: ManagedSurfaceStableAdmissionProposalInternalV1,
  targetIndex = 0,
): ManagedSurfaceStableDesiredRuntimeTargetInternalV1 {
  const lease = harness.registry.inspectCurrentLease(proposal.captured.lease);
  const admittedTarget = proposal.nextAcceptedBaseline.targets[targetIndex];
  if (lease === null || admittedTarget === undefined) {
    throw new Error("expected current proposal target");
  }
  const occurrenceSequence = harness.registry.inspectIssuedOccurrence(
    proposal.captured.lease,
    admittedTarget.occurrenceId,
  );
  if (occurrenceSequence === null) throw new Error("expected issued occurrence");
  return Object.freeze({
    publisherLease: proposal.captured.lease,
    publisherLeaseSequence: lease.leaseSequence,
    occurrenceSequence,
    sourceRevision: proposal.nextAcceptedBaseline.sourceRevision,
    admittedTarget,
  });
}

function rootFailureEntryV1(
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ManagedSurfaceStableRuntimeEntryInternalV1 {
  if (desiredTarget.admittedTarget.stackScope.kind !== "root") {
    throw new Error("expected root desired target");
  }
  return Object.freeze({
    desiredTarget,
    binding: createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: desiredTarget.admittedTarget.stackScope.slotId === rootSlotBV1
        ? "stack"
        : "single",
      retainedSubtree: null,
    }),
  });
}

function applyV1(
  harness: ReconcileHarnessV1,
  proposal: unknown,
): ManagedSurfaceStableReconcileResultInternalV1 {
  return harness.kernel.applyStableAdmissionProposalInternalV1(proposal);
}

const zeroDeltaV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

function contributorCandidatesV1(
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

function installStateV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  current: ManagedSurfaceStableCompositeStateInternalV1,
  next: ManagedSurfaceStableCompositeStateInternalV1,
): void {
  const prepared = kernel.prepareStateInstallInternalV1(current, next);
  expect(kernel.commitPreparedStateInstallInternalV1(prepared, () => true)).toBe("installed");
}

function installStableEntriesV1(
  harness: ReconcileHarnessV1,
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): ManagedSurfaceStableCompositeStateInternalV1 {
  const current = harness.kernel.getStateInternalV1();
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: contributorCandidatesV1(entries),
  });
  installStateV1(harness.kernel, current, next);
  return harness.kernel.getStateInternalV1();
}

function readinessEnvelopeV1(
  entry: ManagedSurfaceStableRuntimeEntryInternalV1,
): ManagedSurfaceStableReadinessEnvelopeInternalV1 {
  if (entry.binding.kind !== "preparing") throw new Error("expected stable preparation");
  return Object.freeze({
    readinessEvidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.binding.attempt.desiredTarget.publisherLease,
    sourceRevision: entry.binding.attempt.desiredTarget.sourceRevision,
  });
}

function crossOwnerUnblockFixtureV1(input: {
  readonly identitySequenceHighWater?: number;
} = {}): Readonly<{
  harness: ReconcileHarnessV1;
  blocker: ManagedSurfaceStableTargetInternalV1;
  narrativeParent: ManagedSurfaceStableTargetInternalV1;
  narrativeChild: ManagedSurfaceStableTargetInternalV1;
}> {
  const harness = harnessV1({
    registerNarrative: true,
    ...(input.identitySequenceHighWater === undefined
      ? {}
      : { identitySequenceHighWater: input.identitySequenceHighWater }),
  });
  const narrativeBaseline = harness.kernel.getStateInternalV1().stableAcceptedBaselines.find(
    (baseline) => baseline.publisherLease === harness.narrative.lease,
  );
  if (narrativeBaseline === undefined) throw new Error("expected narrative baseline");
  const narrativeParent = rawRootV1(harness.narrative, narrativeRootDefinitionV1);
  const narrativeChild = rawChildV1(
    harness.narrative,
    narrativeParent.occurrenceId,
    narrativeChildDefinitionV1,
  );
  expect(
    applyV1(
      harness,
      detachedProposalV1({
        harness,
        publisher: harness.narrative,
        acceptedBaseline: narrativeBaseline,
        targets: [narrativeParent, narrativeChild],
      }),
    ).kind,
  ).toBe("applied");

  const blocker = rawRootV1(harness.workspace, workspaceBlockerDefinitionV1);
  expect(applyV1(harness, admitV1(harness, [blocker])).kind).toBe("applied");
  const blockerEntry = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.occurrenceId === blocker.occurrenceId
  );
  if (blockerEntry === undefined) throw new Error("expected blocker preparation");
  expect(
    harness.kernel.settleStableReadinessReadyInternalV1(
      readinessEnvelopeV1(blockerEntry),
    ).kind,
  ).toBe("applied");

  const narrativeParentEntry = harness.kernel.getStateInternalV1().stableRuntimeBindings.find(
    (entry) => entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId,
  );
  if (narrativeParentEntry === undefined) throw new Error("expected narrative preparation");
  expect(
    harness.kernel.settleStableReadinessReadyInternalV1(
      readinessEnvelopeV1(narrativeParentEntry),
    ).kind,
  ).toBe("applied");

  const blocked = harness.kernel.getStateInternalV1();
  expect(
    blocked.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId
    )?.binding,
  ).toMatchObject({ kind: "ready_instance", instance: { phase: "suspended" } });
  expect(
    blocked.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeChild.occurrenceId
    )?.binding,
  ).toMatchObject({ kind: "gap", reason: "parent_unavailable" });
  return Object.freeze({ harness, blocker, narrativeParent, narrativeChild });
}

function settleRootV1(
  harness: ReconcileHarnessV1,
  phase: "active" | "suspended",
): ManagedSurfaceStableCompositeStateInternalV1 {
  const current = harness.kernel.getStateInternalV1();
  const rootEntry = current.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.stackScope.kind === "root" &&
    entry.desiredTarget.admittedTarget.stackScope.slotId === rootSlotAV1
  );
  if (rootEntry?.binding.kind !== "preparing") throw new Error("expected root preparation");
  const readyBinding = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: rootEntry.binding.attempt,
    phase,
  });
  const entries = current.stableRuntimeBindings.map((entry) =>
    entry === rootEntry ? Object.freeze({ ...entry, binding: readyBinding }) : entry
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: contributorCandidatesV1(entries),
  });
  installStateV1(harness.kernel, current, next);
  return harness.kernel.getStateInternalV1();
}

function settleRootAndChildV1(
  harness: ReconcileHarnessV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  const current = harness.kernel.getStateInternalV1();
  const rootEntry = current.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.stackScope.kind === "root"
  );
  const childEntry = current.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.stackScope.kind === "child"
  );
  if (
    rootEntry?.binding.kind !== "preparing" ||
    childEntry?.binding.kind !== "gap" ||
    childEntry.binding.reason !== "parent_unavailable"
  ) {
    throw new Error("expected root preparation and child parent-unavailable gap");
  }
  const allocated = allocateManagedSurfaceStableRuntimeAttemptInternalV1(current);
  const rootReadyBinding = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: rootEntry.binding.attempt,
    phase: "active",
  });
  const childReadyBinding = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: Object.freeze({
      desiredTarget: childEntry.desiredTarget,
      identity: allocated.identity,
      parentInstanceId: rootReadyBinding.instance.attempt.identity.surfaceInstanceId,
    }),
    phase: "active",
  });
  const entries = current.stableRuntimeBindings.map((entry) => {
    if (entry === rootEntry) {
      return Object.freeze({ ...entry, binding: rootReadyBinding });
    }
    if (entry === childEntry) {
      return Object.freeze({ ...entry, binding: childReadyBinding });
    }
    return entry;
  });
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: allocated.state,
    contributorCandidates: contributorCandidatesV1(entries),
  });
  installStateV1(harness.kernel, current, next);
  return harness.kernel.getStateInternalV1();
}

function failPreparingRootV1(
  harness: ReconcileHarnessV1,
): ManagedSurfaceStableCompositeStateInternalV1 {
  const current = harness.kernel.getStateInternalV1();
  const rootEntry = current.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.stackScope.kind === "root"
  );
  if (rootEntry?.binding.kind !== "preparing") {
    throw new Error("expected root preparation");
  }
  const failureBinding = createManagedSurfaceStableGapRuntimeBindingInternalV1({
    reason: "readiness_failed",
    placement: "root",
    slotCardinality: "single",
    retainedSubtree: rootEntry.binding.retainedSubtree,
  });
  const entries = current.stableRuntimeBindings.map((entry) =>
    entry === rootEntry ? Object.freeze({ ...entry, binding: failureBinding }) : entry
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: contributorCandidatesV1(entries),
  });
  installStateV1(harness.kernel, current, next);
  return harness.kernel.getStateInternalV1();
}

describe("dormant managed stable atomic reconcile", () => {
  it("captures all four factory fields once and claims disposal only after valid construction", () => {
    const fixture = constructionFixtureV1();
    const reportSubscriberFailure = vi.fn();
    const reads = {
      admissionAuthority: 0,
      publisherLeaseRegistry: 0,
      initialTransientState: 0,
      reportSubscriberFailure: 0,
    };
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      get admissionAuthority() {
        reads.admissionAuthority += 1;
        return fixture.authority;
      },
      get publisherLeaseRegistry() {
        reads.publisherLeaseRegistry += 1;
        return fixture.registry;
      },
      get initialTransientState() {
        reads.initialTransientState += 1;
        return fixture.initialTransientState;
      },
      get reportSubscriberFailure() {
        reads.reportSubscriberFailure += 1;
        return reportSubscriberFailure;
      },
    });

    expect(reads).toEqual({
      admissionAuthority: 1,
      publisherLeaseRegistry: 1,
      initialTransientState: 1,
      reportSubscriberFailure: 1,
    });
    expect(reportSubscriberFailure).not.toHaveBeenCalled();
    expect(kernel.getTransientStateInternalV1()).toBe(fixture.initialTransientState);
    expect(() =>
      claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(fixture.registry)
    ).toThrow("ui.managed_surface_stable_disposal_authority_claimed");
  });

  it("does not burn the unique claim on getter failure or invalid construction", () => {
    const getterFailure = constructionFixtureV1();
    const marker = new Error("factory getter failed");
    const reads = {
      admissionAuthority: 0,
      publisherLeaseRegistry: 0,
      initialTransientState: 0,
      reportSubscriberFailure: 0,
    };
    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        get admissionAuthority() {
          reads.admissionAuthority += 1;
          return getterFailure.authority;
        },
        get publisherLeaseRegistry() {
          reads.publisherLeaseRegistry += 1;
          return getterFailure.registry;
        },
        get initialTransientState() {
          reads.initialTransientState += 1;
          return getterFailure.initialTransientState;
        },
        get reportSubscriberFailure(): () => void {
          reads.reportSubscriberFailure += 1;
          throw marker;
        },
      })
    ).toThrow(marker);
    expect(reads).toEqual({
      admissionAuthority: 1,
      publisherLeaseRegistry: 1,
      initialTransientState: 1,
      reportSubscriberFailure: 1,
    });
    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: getterFailure.authority,
        publisherLeaseRegistry: getterFailure.registry,
        initialTransientState: getterFailure.initialTransientState,
      })
    ).not.toThrow();

    const invalid = constructionFixtureV1();
    const wrongEpochState = createManagedSurfaceReducerStateV1(
      parseNonNegativeSafeInteger(applicationEpochV1 + 1),
      [workspaceOwnerIdV1, narrativeOwnerIdV1],
      resolvedSlotDescriptorsV1,
    );
    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: invalid.authority,
        publisherLeaseRegistry: invalid.registry,
        initialTransientState: wrongEpochState,
      })
    ).toThrow("ui.managed_surface_stable_composite_state_invalid");
    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: invalid.authority,
        publisherLeaseRegistry: invalid.registry,
        initialTransientState: invalid.initialTransientState,
      })
    ).not.toThrow();
  });

  it("rejects an already-terminal initial projection without burning the registry claim", () => {
    const fixture = constructionFixtureV1();
    const terminalTransientState = reduceManagedSurfaceV1(
      fixture.initialTransientState,
      Object.freeze({ kind: "dispose_coordinator" }),
    ).state;
    expect(terminalTransientState.publication.coordinatorDisposed).toBe(true);

    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: fixture.authority,
        publisherLeaseRegistry: fixture.registry,
        transientState: terminalTransientState,
      })
    ).toThrow("ui.managed_surface_stable_composite_state_invalid");
    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: fixture.authority,
        publisherLeaseRegistry: fixture.registry,
        initialTransientState: terminalTransientState,
      })
    ).toThrow("ui.managed_surface_stable_composite_state_invalid");
    expect(fixture.registry.getSnapshot().disposed).toBe(false);

    expect(
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: fixture.authority,
        publisherLeaseRegistry: fixture.registry,
        initialTransientState: fixture.initialTransientState,
      }),
    ).toBeDefined();
  });

  it("rejects a second specialized kernel and second claim with exact zero state", () => {
    const fixture = constructionFixtureV1();
    const first = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: fixture.authority,
      publisherLeaseRegistry: fixture.registry,
      initialTransientState: fixture.initialTransientState,
    });
    const firstState = first.getStateInternalV1();
    const registrySnapshot = fixture.registry.getSnapshot();
    const stateListener = vi.fn();
    first.subscribeStateInternalV1(stateListener);

    expect(() =>
      createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
        admissionAuthority: fixture.authority,
        publisherLeaseRegistry: fixture.registry,
        initialTransientState: fixture.initialTransientState,
      })
    ).toThrow("ui.managed_surface_stable_disposal_authority_claimed");
    expect(() =>
      claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(fixture.registry)
    ).toThrow("ui.managed_surface_stable_disposal_authority_claimed");
    expect(first.getStateInternalV1()).toBe(firstState);
    expect(fixture.registry.getSnapshot()).toBe(registrySnapshot);
    expect(stateListener).not.toHaveBeenCalled();
  });

  it("keeps the pure composite-state factory claim-free", () => {
    const fixture = constructionFixtureV1();
    const state = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: fixture.authority,
      publisherLeaseRegistry: fixture.registry,
      transientState: fixture.initialTransientState,
    });
    const registrySnapshot = fixture.registry.getSnapshot();

    expect(Object.isFrozen(state)).toBe(true);
    expect(
      claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(fixture.registry),
    ).toBeDefined();
    expect(fixture.registry.getSnapshot()).toBe(registrySnapshot);
    expect(state.stableAcceptedBaselines).toEqual([]);
  });

  it("fences nested and disposed ingress before hostile proposal or lease inspection", () => {
    const nested = harnessV1();
    let trapCalls = 0;
    const hostile = new Proxy(Object.freeze({}), {
      get() {
        trapCalls += 1;
        throw new Error("lifecycle fence must win before hostile input");
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error("lifecycle fence must win before hostile enumeration");
      },
    });
    const nestedBefore = nested.kernel.getStateInternalV1();
    nested.kernel.transitionStateInternalV1((currentState) => {
      expect(currentState).toBe(nestedBefore);
      expect(() => nested.kernel.applyStableAdmissionProposalInternalV1(hostile)).toThrow(
        "ui.managed_surface_runtime_transition_in_progress",
      );
      expect(() => nested.kernel.disposeStablePublisherLeaseInternalV1(hostile)).toThrow(
        "ui.managed_surface_runtime_transition_in_progress",
      );
      return Object.freeze({ state: currentState, result: undefined });
    });
    expect(nested.kernel.getStateInternalV1()).toBe(nestedBefore);

    const disposed = harnessV1();
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(disposed.kernel);
    expect(coordinator.dispose().kind).toBe("applied");
    const disposedState = disposed.kernel.getStateInternalV1();
    expect(() => disposed.kernel.applyStableAdmissionProposalInternalV1(hostile)).toThrow(
      "ui.managed_surface_coordinator_disposed",
    );
    expect(() => disposed.kernel.disposeStablePublisherLeaseInternalV1(hostile)).toThrow(
      "ui.managed_surface_coordinator_disposed",
    );
    expect(trapCalls).toBe(0);
    expect(disposed.kernel.getStateInternalV1()).toBe(disposedState);
  });

  it("atomically terminal-disposes transient and stable runtime through one registry gate", () => {
    const diagnostics = vi.fn();
    const harness = harnessV1({
      registerNarrative: true,
      reportSubscriberFailure: diagnostics,
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(harness.kernel);
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    settleRootAndChildV1(harness);

    const replacement = rawRootV1(harness.workspace, replacementDefinitionV1);
    expect(applyV1(harness, admitV1(harness, [replacement])).kind).toBe("applied");
    const replacementState = harness.kernel.getStateInternalV1();
    expect(replacementState.stableAcceptedBaselines).toHaveLength(2);
    expect(replacementState.stableRuntimeBindings).toHaveLength(1);
    expect(replacementState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
    });
    if (replacementState.stableRuntimeBindings[0]?.binding.kind !== "preparing") {
      throw new Error("expected replacement preparation");
    }
    expect(replacementState.stableRuntimeBindings[0].binding.retainedSubtree).not.toBeNull();

    const transientPreparation = coordinator.openTransientPrimary({
      definition: narrativeRootSidecarV1.definition,
      semanticOccurrenceId: "semantic.terminal-transient",
    });
    expect(transientPreparation.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
    });
    const before = harness.kernel.getStateInternalV1();
    const previousGeneration = before.rootReservationGenerationToken;
    const previousHighWater = before.transientState.identitySequenceHighWater;
    const previousResolvedOwnerIds = before.transientState.resolvedOwnerIds;
    const previousResolvedSlotDescriptors = before.transientState.resolvedSlotDescriptors;
    const previousDisposedOwnerIds = before.transientState.disposedOwnerIds;
    const stalePreparedInstall = harness.kernel.prepareStateInstallInternalV1(before, before);
    expect(before.rootReservationContributors.length).toBeGreaterThan(0);
    expect(before.transientState.publication.orderedInstances).toHaveLength(1);

    const trace: string[] = [];
    let nestedRepeat: ReturnType<typeof coordinator.dispose> | null = null;
    harness.kernel.subscribeTransientInternalV1(() => {
      throw new Error("terminal transient listener failed");
    });
    harness.kernel.subscribeTransientInternalV1(() => {
      trace.push("transient");
      const installed = harness.kernel.getStateInternalV1();
      expect(installed.transientState.publication.coordinatorDisposed).toBe(true);
      expect(installed.stableAcceptedBaselines).toEqual([]);
      expect(installed.stableRuntimeBindings).toEqual([]);
      expect(harness.registry.getSnapshot().disposed).toBe(true);
      nestedRepeat = coordinator.dispose();
    });
    harness.kernel.subscribeStateInternalV1(() => {
      trace.push("state");
      expect(harness.kernel.getStateInternalV1().transientState.publication.coordinatorDisposed)
        .toBe(true);
      expect(harness.registry.getSnapshot().disposed).toBe(true);
    });

    const receipt = coordinator.dispose();

    expect(receipt).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: before.transientState.publication.topologyRevision,
      afterTopologyRevision: before.transientState.publication.topologyRevision + 1,
    });
    expect(nestedRepeat).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: receipt.afterTopologyRevision,
      afterTopologyRevision: receipt.afterTopologyRevision,
    });
    expect(trace).toEqual(["transient", "state"]);
    expect(diagnostics).toHaveBeenCalledOnce();

    const terminal = harness.kernel.getStateInternalV1();
    expect(terminal.stableAcceptedBaselines).toEqual([]);
    expect(terminal.stableRuntimeBindings).toEqual([]);
    expect(terminal.rootReservationContributors).toEqual([]);
    expect(terminal.rootReservationGenerationToken).not.toBe(previousGeneration);
    expect(terminal.transientState.publication.orderedInstances).toEqual([]);
    expect(terminal.transientState.publication.preparationFallbacks).toEqual([]);
    expect(terminal.transientState.identitySequenceHighWater).toBe(previousHighWater);
    expect(terminal.transientState.resolvedOwnerIds).toEqual(previousResolvedOwnerIds);
    expect(terminal.transientState.resolvedSlotDescriptors).toEqual(
      previousResolvedSlotDescriptors,
    );
    expect(terminal.transientState.disposedOwnerIds).toEqual(previousDisposedOwnerIds);
    const privateProvenance = compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
      before,
      terminal,
    );
    expect(Object.isFrozen(privateProvenance)).toBe(true);
    expect(Object.isFrozen(privateProvenance.boundRuntimeAttempts)).toBe(true);
    expect(Object.isFrozen(privateProvenance.pendingRuntimeAttempts)).toBe(true);
    expect(Object.isFrozen(privateProvenance.stableContributorCandidates)).toBe(true);
    expect(Object.isFrozen(privateProvenance.after)).toBe(true);
    expect(privateProvenance.sameOrigin).toBe(true);
    expect(privateProvenance.sameAdmissionAuthority).toBe(true);
    expect(privateProvenance.samePublisherLeaseRegistry).toBe(true);
    expect(privateProvenance.boundRuntimeAttempts).toMatchObject({
      sameIdentity: false,
      afterSize: 0,
    });
    expect(privateProvenance.boundRuntimeAttempts.beforeSize).toBeGreaterThan(0);
    expect(privateProvenance.pendingRuntimeAttempts).toEqual({
      sameIdentity: false,
      beforeSize: 0,
      afterSize: 0,
    });
    expect(privateProvenance.stableContributorCandidates).toMatchObject({
      sameIdentity: false,
      afterSize: 0,
    });
    expect(privateProvenance.stableContributorCandidates.beforeSize).toBeGreaterThan(0);
    expect(privateProvenance.after).toEqual({
      installable: true,
      derivedFromPresent: false,
      derivationDepth: 0,
    });
    const staleGate = vi.fn(() => true);
    expect(
      harness.kernel.commitPreparedStateInstallInternalV1(stalePreparedInstall, staleGate),
    ).toBe("stale");
    expect(staleGate).not.toHaveBeenCalled();
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
    expect(harness.registry.inspectCurrentLease(harness.narrative.lease)).toBeNull();
    expect(() => harness.workspace.issueSourceRevision()).toThrow(
      "ui.managed_surface_stable_publisher_lease_disposed",
    );
    expect(() => harness.kernel.subscribeStateInternalV1(() => {})).toThrow(
      "ui.managed_surface_coordinator_disposed",
    );
  });

  it("terminal-converges after raw registry disposal at exhausted identity capacity", () => {
    const harness = harnessV1({ identitySequenceHighWater: Number.MAX_SAFE_INTEGER });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(harness.kernel);
    expect(applyV1(harness, admitV1(harness, [])).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    const previousGeneration = before.rootReservationGenerationToken;
    const previousHighWater = before.transientState.identitySequenceHighWater;
    expect(harness.registry.dispose()).toBe("disposed");

    expect(coordinator.dispose()).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: before.transientState.publication.topologyRevision,
      afterTopologyRevision: before.transientState.publication.topologyRevision + 1,
    });
    const terminal = harness.kernel.getStateInternalV1();
    expect(terminal.transientState.publication.coordinatorDisposed).toBe(true);
    expect(terminal.stableAcceptedBaselines).toEqual([]);
    expect(terminal.stableRuntimeBindings).toEqual([]);
    expect(terminal.rootReservationContributors).toEqual([]);
    expect(terminal.rootReservationGenerationToken).toBe(previousGeneration);
    expect(terminal.transientState.identitySequenceHighWater).toBe(previousHighWater);
    const privateProvenance = compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
      before,
      terminal,
    );
    expect(privateProvenance.boundRuntimeAttempts).toEqual({
      sameIdentity: false,
      beforeSize: 0,
      afterSize: 0,
    });
    expect(privateProvenance.pendingRuntimeAttempts).toEqual({
      sameIdentity: false,
      beforeSize: 0,
      afterSize: 0,
    });
    expect(privateProvenance.stableContributorCandidates).toEqual({
      sameIdentity: false,
      beforeSize: 0,
      afterSize: 0,
    });
    expect(harness.registry.getSnapshot().disposed).toBe(true);
    expect(coordinator.dispose()).toMatchObject({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
    });
  });

  it("clears initial preparation and parent-unavailable gap without allocating during disposal", () => {
    const harness = harnessV1();
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(harness.kernel);
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    expect(before.stableAcceptedBaselines).toHaveLength(1);
    expect(before.stableRuntimeBindings.map((entry) => entry.binding)).toMatchObject([
      { kind: "preparing", transition: "initial_open" },
      { kind: "gap", reason: "parent_unavailable" },
    ]);
    expect(before.rootReservationContributors.length).toBeGreaterThan(0);

    expect(coordinator.dispose()).toMatchObject({
      kind: "applied",
      code: "surface.coordinator_disposed",
    });
    const terminal = harness.kernel.getStateInternalV1();
    expect(terminal.stableAcceptedBaselines).toEqual([]);
    expect(terminal.stableRuntimeBindings).toEqual([]);
    expect(terminal.rootReservationContributors).toEqual([]);
    expect(terminal.rootReservationGenerationToken).not.toBe(
      before.rootReservationGenerationToken,
    );
    expect(terminal.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater,
    );
    expect(harness.registry.getSnapshot().disposed).toBe(true);
  });

  it("installs initial root preparation and child gap in one exact commit", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    const proposal = admitV1(harness, [root, child]);
    const before = harness.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    const result = applyV1(harness, proposal);

    expect(result).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "replace_vector",
        runtime: "retain_retire_prepare",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.delta)).toBe(true);
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableAcceptedBaselines).toEqual([proposal.nextAcceptedBaseline]);
    expect(after.stableAcceptedBaselines[0]).toBe(proposal.nextAcceptedBaseline);
    expect(after.stableRuntimeBindings).toHaveLength(2);
    const [rootEntry, childEntry] = after.stableRuntimeBindings;
    expect(rootEntry!.desiredTarget.admittedTarget).toBe(proposal.nextAcceptedBaseline.targets[0]);
    expect(rootEntry!.binding).toMatchObject({
      kind: "preparing",
      transition: "initial_open",
      retainedSubtree: null,
    });
    expect(childEntry!.desiredTarget.admittedTarget).toBe(proposal.nextAcceptedBaseline.targets[1]);
    expect(childEntry!.binding).toEqual({
      kind: "gap",
      reason: "parent_unavailable",
      retainedSubtree: null,
    });
    expect(after.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(after.rootReservationGenerationToken).not.toBe(
      before.rootReservationGenerationToken,
    );
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("keeps initial empty exact and accepts greater empty with owned retirement", () => {
    const emptyHarness = harnessV1();
    const emptyProposal = admitV1(emptyHarness, []);
    const emptyBefore = emptyHarness.kernel.getStateInternalV1();
    expect(applyV1(emptyHarness, emptyProposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "accept_empty",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const emptyAfter = emptyHarness.kernel.getStateInternalV1();
    expect(emptyAfter.stableAcceptedBaselines[0]).toBe(emptyProposal.nextAcceptedBaseline);
    expect(emptyAfter.stableRuntimeBindings).toBe(emptyBefore.stableRuntimeBindings);
    expect(emptyAfter.rootReservationGenerationToken).toBe(
      emptyBefore.rootReservationGenerationToken,
    );
    expect(emptyAfter.transientState.identitySequenceHighWater).toBe(
      emptyBefore.transientState.identitySequenceHighWater,
    );

    const retireHarness = harnessV1();
    const root = rawRootV1(retireHarness.workspace);
    expect(applyV1(retireHarness, admitV1(retireHarness, [root])).kind).toBe("applied");
    const retireBefore = retireHarness.kernel.getStateInternalV1();
    const retireProposal = admitV1(retireHarness, []);
    expect(applyV1(retireHarness, retireProposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "accept_empty",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "changed",
        runtimeAllocation: "zero",
      },
    });
    const retired = retireHarness.kernel.getStateInternalV1();
    expect(retired.stableAcceptedBaselines[0]).toBe(retireProposal.nextAcceptedBaseline);
    expect(retired.stableRuntimeBindings).toEqual([]);
    expect(retired.transientState.identitySequenceHighWater).toBe(
      retireBefore.transientState.identitySequenceHighWater,
    );
    expect(retired.rootReservationGenerationToken).not.toBe(
      retireBefore.rootReservationGenerationToken,
    );
  });

  it("removes an empty root readiness-failure gap without claiming runtime retirement", () => {
    const harness = harnessV1();
    expect(applyV1(harness, admitV1(harness, [rawRootV1(harness.workspace)])).kind).toBe(
      "applied",
    );
    const failed = failPreparingRootV1(harness);
    expect(failed.stableRuntimeBindings[0]!.binding).toEqual({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: null,
    });
    const proposal = admitV1(harness, []);

    expect(applyV1(harness, proposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "accept_empty",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableAcceptedBaselines[0]).toBe(proposal.nextAcceptedBaseline);
    expect(after.stableRuntimeBindings).toEqual([]);
    expect(after.rootReservationGenerationToken).not.toBe(
      failed.rootReservationGenerationToken,
    );
    expect(after.transientState.identitySequenceHighWater).toBe(
      failed.transientState.identitySequenceHighWater,
    );

    const mixed = harnessV1();
    const mixedRoot = rawRootV1(mixed.workspace);
    const mixedChild = rawChildV1(mixed.workspace, mixedRoot.occurrenceId);
    expect(applyV1(mixed, admitV1(mixed, [mixedRoot, mixedChild])).kind).toBe("applied");
    const mixedFailed = failPreparingRootV1(mixed);
    expect(mixedFailed.stableRuntimeBindings.map((entry) => entry.binding)).toEqual([
      {
        kind: "gap",
        reason: "readiness_failed",
        retainedSubtree: null,
      },
      {
        kind: "gap",
        reason: "parent_unavailable",
        retainedSubtree: null,
      },
    ]);
    expect(applyV1(mixed, admitV1(mixed, []))).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "accept_empty",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    expect(mixed.kernel.getStateInternalV1().rootReservationGenerationToken).not.toBe(
      mixedFailed.rootReservationGenerationToken,
    );
  });

  it("disposes an empty root readiness-failure gap with source-only runtime delta", () => {
    const harness = harnessV1();
    expect(applyV1(harness, admitV1(harness, [rawRootV1(harness.workspace)])).kind).toBe(
      "applied",
    );
    const failed = failPreparingRootV1(harness);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableAcceptedBaselines).toEqual([]);
    expect(after.stableRuntimeBindings).toEqual([]);
    expect(after.rootReservationGenerationToken).not.toBe(
      failed.rootReservationGenerationToken,
    );
    expect(after.transientState.identitySequenceHighWater).toBe(
      failed.transientState.identitySequenceHighWater,
    );
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
  });

  it("enforces proposal, lease, baseline, reservation, then global-divergence precedence", () => {
    const malformed = harnessV1({ registerNarrative: true });
    const malformedProposal = admitV1(malformed, []);
    expect(malformed.registry.disposePublisherLease(malformed.narrative.lease)).toBe("disposed");
    let trapCalls = 0;
    const clonedProxy = new Proxy(Object.freeze({ ...malformedProposal }), {
      get() {
        trapCalls += 1;
        throw new Error("proposal provenance must not read a clone");
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error("proposal provenance must not enumerate a clone");
      },
    });
    const malformedBefore = malformed.kernel.getStateInternalV1();
    expect(applyV1(malformed, clonedProxy)).toEqual({
      kind: "faulted",
      code: "surface.stable_admission_faulted",
      delta: zeroDeltaV1,
    });
    expect(trapCalls).toBe(0);
    expect(malformed.kernel.getStateInternalV1()).toBe(malformedBefore);

    const staleLease = harnessV1();
    const staleLeaseProposal = admitV1(staleLease, []);
    expect(staleLease.registry.disposePublisherLease(staleLease.workspace.lease)).toBe("disposed");
    const staleLeaseBefore = staleLease.kernel.getStateInternalV1();
    expect(applyV1(staleLease, staleLeaseProposal)).toEqual({
      kind: "stale",
      code: "surface.stable_publisher_lease_stale",
      delta: zeroDeltaV1,
    });
    expect(staleLease.kernel.getStateInternalV1()).toBe(staleLeaseBefore);

    const staleBaseline = harnessV1();
    expect(applyV1(staleBaseline, admitV1(staleBaseline, [])).kind).toBe("applied");
    const commonContext = capturedContextV1(staleBaseline);
    const first = evaluateV1({
      harness: staleBaseline,
      context: commonContext,
      sourceRevision: staleBaseline.workspace.issueSourceRevision(),
      targets: [],
    });
    const second = evaluateV1({
      harness: staleBaseline,
      context: commonContext,
      sourceRevision: staleBaseline.workspace.issueSourceRevision(),
      targets: [],
    });
    expect(applyV1(staleBaseline, first).kind).toBe("applied");
    const baselineWinner = staleBaseline.kernel.getStateInternalV1();
    expect(applyV1(staleBaseline, second)).toEqual({
      kind: "stale",
      code: "surface.stable_reconcile_precondition_stale",
      delta: zeroDeltaV1,
    });
    expect(staleBaseline.kernel.getStateInternalV1()).toBe(baselineWinner);

    const staleReservation = harnessV1();
    const reservationProposal = admitV1(staleReservation, []);
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(
      staleReservation.kernel,
    );
    const opened = coordinator.openTransientPrimary({
      definition: rootSidecarBV1.definition,
      semanticOccurrenceId: null,
    });
    expect(opened.readiness).not.toBeNull();
    opened.readiness!.fail();
    const reservationBefore = staleReservation.kernel.getStateInternalV1();
    expect(applyV1(staleReservation, reservationProposal)).toEqual({
      kind: "stale",
      code: "surface.stable_reconcile_precondition_stale",
      delta: zeroDeltaV1,
    });
    expect(staleReservation.kernel.getStateInternalV1()).toBe(reservationBefore);

    const globalDivergence = harnessV1({ registerNarrative: true });
    const validProposal = admitV1(globalDivergence, []);
    expect(globalDivergence.registry.disposePublisherLease(globalDivergence.narrative.lease)).toBe(
      "disposed",
    );
    const divergenceBefore = globalDivergence.kernel.getStateInternalV1();
    expect(applyV1(globalDivergence, validProposal)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(globalDivergence.kernel.getStateInternalV1()).toBe(divergenceBefore);
  });

  it("faults every baseline-to-direct-runtime bijection drift before proposal planning", () => {
    const unpublished = harnessV1();
    const unpublishedRoot = rawRootV1(unpublished.workspace);
    const unpublishedSeed = admitV1(unpublished, [unpublishedRoot]);
    installStableEntriesV1(unpublished, [
      rootFailureEntryV1(desiredTargetFromProposalV1(unpublished, unpublishedSeed)),
    ]);
    const unpublishedProposal = evaluateV1({
      harness: unpublished,
      context: capturedContextV1(unpublished),
      sourceRevision: unpublishedSeed.nextAcceptedBaseline.sourceRevision,
      targets: [unpublishedRoot],
    });

    const missing = harnessV1();
    const missingRoot = rawRootV1(missing.workspace);
    expect(applyV1(missing, admitV1(missing, [missingRoot])).kind).toBe("applied");
    installStableEntriesV1(missing, []);
    const missingProposal = admitV1(missing, [missingRoot]);

    const extra = harnessV1();
    const acceptedRoot = rawRootV1(extra.workspace);
    expect(applyV1(extra, admitV1(extra, [acceptedRoot])).kind).toBe("applied");
    const extraRoot = rawRootV1(extra.workspace, rootDefinitionBV1);
    const extraSeed = admitV1(extra, [acceptedRoot, extraRoot]);
    installStableEntriesV1(extra, [
      ...extra.kernel.getStateInternalV1().stableRuntimeBindings,
      rootFailureEntryV1(desiredTargetFromProposalV1(extra, extraSeed, 1)),
    ]);
    const extraProposal = admitV1(extra, [acceptedRoot]);

    const otherOwner = harnessV1();
    const narrativeBaseline = otherOwner.authority.createUnpublishedBaseline(
      otherOwner.narrative.lease,
    );
    const narrativeSeed = detachedProposalV1({
      harness: otherOwner,
      publisher: otherOwner.narrative,
      acceptedBaseline: narrativeBaseline,
      targets: [rawRootV1(otherOwner.narrative, narrativeRootDefinitionV1)],
    });
    installStableEntriesV1(otherOwner, [
      rootFailureEntryV1(desiredTargetFromProposalV1(otherOwner, narrativeSeed)),
    ]);
    const otherOwnerProposal = admitV1(otherOwner, []);

    for (
      const [harness, proposal] of [
        [unpublished, unpublishedProposal],
        [missing, missingProposal],
        [extra, extraProposal],
        [otherOwner, otherOwnerProposal],
      ] as const
    ) {
      const before = harness.kernel.getStateInternalV1();
      const stateListener = vi.fn();
      harness.kernel.subscribeStateInternalV1(stateListener);
      expect(applyV1(harness, proposal)).toEqual({
        kind: "faulted",
        code: "surface.stable_reconcile_faulted",
        delta: zeroDeltaV1,
      });
      expect(harness.kernel.getStateInternalV1()).toBe(before);
      expect(stateListener).not.toHaveBeenCalled();
    }
  });

  it("retries only older pending work and preserves blocked child binding", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    const beforeRoot = before.stableRuntimeBindings[0]!;
    const beforeChild = before.stableRuntimeBindings[1]!;
    if (beforeRoot.binding.kind !== "preparing") throw new Error("expected preparation");
    const retryProposal = admitV1(harness, [root, child]);

    expect(applyV1(harness, retryProposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "advance_cursor",
        runtime: "retry_gaps",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    const afterRoot = after.stableRuntimeBindings[0]!;
    expect(after.stableAcceptedBaselines[0]).toBe(retryProposal.nextAcceptedBaseline);
    expect(afterRoot.binding.kind).toBe("preparing");
    if (afterRoot.binding.kind !== "preparing") throw new Error("expected retry");
    expect(afterRoot.binding.attempt).not.toBe(beforeRoot.binding.attempt);
    expect(afterRoot.binding.attempt.identity.allocation.sequence).toBe(
      beforeRoot.binding.attempt.identity.allocation.sequence + 1,
    );
    expect(after.stableRuntimeBindings[1]!.binding).toBe(beforeChild.binding);
    expect(after.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(
      harness.kernel.peekTransientCandidateInternalV1({
        definition: rootSidecarBV1.definition,
        semanticOccurrenceId: null,
      }).identityAllocation.sequence,
    ).toBe(after.transientState.identitySequenceHighWater + 1);
  });

  it("supersedes an initial pending root without promoting it to predecessor", () => {
    const harness = harnessV1();
    expect(applyV1(harness, admitV1(harness, [rawRootV1(harness.workspace)])).kind).toBe(
      "applied",
    );
    const before = harness.kernel.getStateInternalV1();
    const beforeBinding = before.stableRuntimeBindings[0]!.binding;
    if (beforeBinding.kind !== "preparing") throw new Error("expected initial preparation");
    const proposal = admitV1(harness, [
      rawRootV1(harness.workspace, replacementDefinitionV1),
    ]);

    expect(applyV1(harness, proposal)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableRuntimeBindings).toHaveLength(1);
    const afterBinding = after.stableRuntimeBindings[0]!.binding;
    expect(afterBinding).toMatchObject({
      kind: "preparing",
      transition: "initial_open",
      retainedSubtree: null,
    });
    if (afterBinding.kind !== "preparing") throw new Error("expected replacement preparation");
    expect(afterBinding.attempt).not.toBe(beforeBinding.attempt);
    expect(afterBinding.attempt.identity.allocation.sequence).toBe(
      beforeBinding.attempt.identity.allocation.sequence + 1,
    );
    expect(after.stableAcceptedBaselines[0]).toBe(proposal.nextAcceptedBaseline);
  });

  it("advances only the source cursor for ready-suspended parent-unavailable state", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    const blocker = rawRootV1(harness.workspace, rootDefinitionBV1);
    expect(applyV1(harness, admitV1(harness, [root, child, blocker])).kind).toBe("applied");
    const suspended = settleRootV1(harness, "suspended");
    const blockerEntry = suspended.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === blocker.occurrenceId
    );
    if (blockerEntry?.binding.kind !== "preparing") {
      throw new Error("expected blocker preparation");
    }
    const blockerAttempt = blockerEntry.binding.attempt;
    installStableEntriesV1(
      harness,
      suspended.stableRuntimeBindings.map((entry) =>
        entry === blockerEntry
          ? Object.freeze({
            ...entry,
            binding: createManagedSurfaceStableReadyRuntimeBindingInternalV1({
              attempt: blockerAttempt,
              phase: "active",
            }),
          })
          : entry
      ),
    );
    const before = harness.kernel.getStateInternalV1();
    const beforeBindings = before.stableRuntimeBindings.map((entry) => entry.binding);
    const proposal = admitV1(harness, [root, child, blocker]);

    expect(applyV1(harness, proposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "advance_cursor",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableRuntimeBindings[0]!.binding).toBe(beforeBindings[0]);
    expect(after.stableRuntimeBindings[1]!.binding).toBe(beforeBindings[1]);
    expect(after.stableRuntimeBindings[2]!.binding).toBe(beforeBindings[2]);
    expect(after.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater,
    );
    expect(after.rootReservationGenerationToken).toBe(before.rootReservationGenerationToken);
  });

  it("defers an explicit child retry until the proposal's shared topology leaves its parent active", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    const initialRoot = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    if (initialRoot === undefined) throw new Error("expected root preparation");
    expect(
      harness.kernel.settleStableReadinessReadyInternalV1(readinessEnvelopeV1(initialRoot)).kind,
    ).toBe("applied");
    const childCandidate = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    if (childCandidate === undefined) throw new Error("expected child preparation");
    expect(
      harness.kernel.settleStableReadinessFailedInternalV1(
        readinessEnvelopeV1(childCandidate),
      ).kind,
    ).toBe("applied");
    const failedState = harness.kernel.getStateInternalV1();
    const failedChild = failedState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    expect(failedChild?.binding).toMatchObject({
      kind: "gap",
      reason: "readiness_failed",
    });
    const failedGap = failedChild!.binding;
    const highWaterAfterFailure = failedState.transientState.identitySequenceHighWater;

    const blocker = rawRootV1(harness.workspace, rootDefinitionBV1);
    expect(applyV1(harness, admitV1(harness, [root, child, blocker])).kind).toBe("applied");
    const blockedState = harness.kernel.getStateInternalV1();
    const blockedRoot = blockedState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const blockedChild = blockedState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    expect(blockedRoot?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "suspended" },
    });
    expect(blockedChild?.binding).toBe(failedGap);
    expect(blockedState.transientState.identitySequenceHighWater).toBe(
      highWaterAfterFailure + 1,
    );

    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    const retriedState = harness.kernel.getStateInternalV1();
    const retriedRoot = retriedState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const retriedChild = retriedState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    expect(retriedRoot?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "suspended" },
    });
    expect(retriedChild?.binding).toMatchObject({
      kind: "preparing",
      transition: "child_open",
    });
    expect(retriedState.transientState.identitySequenceHighWater).toBe(
      blockedState.transientState.identitySequenceHighWater + 1,
    );
  });

  it("plans initial allocations in canonical topology order, not raw cross-scope order", () => {
    const run = (rootBFirst: boolean) => {
      const harness = harnessV1();
      const rootA = rawRootV1(harness.workspace, rootDefinitionAV1);
      const child = rawChildV1(harness.workspace, rootA.occurrenceId);
      const rootB = rawRootV1(harness.workspace, rootDefinitionBV1);
      const targets = rootBFirst ? [rootB, rootA, child] : [rootA, child, rootB];
      expect(applyV1(harness, admitV1(harness, targets)).kind).toBe("applied");
      const state = harness.kernel.getStateInternalV1();
      const sequenceFor = (definitionId: ManagedSurfaceDefinitionIdV1): number | null => {
        const entry = state.stableRuntimeBindings.find((candidate) =>
          candidate.desiredTarget.admittedTarget.definitionId === definitionId
        );
        return entry?.binding.kind === "preparing"
          ? entry.binding.attempt.identity.allocation.sequence
          : null;
      };
      return Object.freeze({
        rootA: sequenceFor(rootDefinitionAV1),
        rootB: sequenceFor(rootDefinitionBV1),
        childBinding: state.stableRuntimeBindings.find((entry) =>
          entry.desiredTarget.admittedTarget.definitionId === childDefinitionV1
        )?.binding,
        highWater: state.transientState.identitySequenceHighWater,
      });
    };

    const first = run(true);
    const second = run(false);
    expect(first).toMatchObject({ rootA: 1, rootB: 2, highWater: 2 });
    expect(second).toMatchObject({ rootA: 1, rootB: 2, highWater: 2 });
    expect(first.childBinding).toMatchObject({ kind: "gap", reason: "parent_unavailable" });
    expect(second.childBinding).toMatchObject({ kind: "gap", reason: "parent_unavailable" });
  });

  it("allocates an eligible fresh child before a later canonical root in one greater-changed commit", () => {
    const harness = harnessV1({ rootBLayerOrder: 1, childLayerOrder: 5 });
    const rootA = rawRootV1(harness.workspace, rootDefinitionAV1);
    expect(applyV1(harness, admitV1(harness, [rootA])).kind).toBe("applied");
    const rootCandidate = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === rootA.occurrenceId
    );
    if (rootCandidate === undefined) throw new Error("expected root preparation");
    expect(
      harness.kernel.settleStableReadinessReadyInternalV1(
        readinessEnvelopeV1(rootCandidate),
      ).kind,
    ).toBe("applied");
    const readyState = harness.kernel.getStateInternalV1();
    const readyRoot = readyState.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === rootA.occurrenceId
    );
    if (readyRoot?.binding.kind !== "ready_instance") throw new Error("expected ready root");
    expect(readyRoot.binding.instance.phase).toBe("active");

    const childA = rawChildV1(harness.workspace, rootA.occurrenceId);
    const rootB = rawRootV1(harness.workspace, rootDefinitionBV1);
    const beforeHighWater = readyState.transientState.identitySequenceHighWater;
    const installedStates: ManagedSurfaceStableCompositeStateInternalV1[] = [];
    harness.kernel.subscribeStateInternalV1(() => {
      installedStates.push(harness.kernel.getStateInternalV1());
    });

    expect(applyV1(harness, admitV1(harness, [rootA, childA, rootB])).kind).toBe("applied");
    const installed = harness.kernel.getStateInternalV1();
    expect(installedStates).toEqual([installed]);
    const childEntry = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === childA.occurrenceId
    );
    const rootBEntry = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === rootB.occurrenceId
    );
    if (
      childEntry?.binding.kind !== "preparing" ||
      rootBEntry?.binding.kind !== "preparing"
    ) {
      throw new Error("expected child and root preparations");
    }
    expect(childEntry.binding.attempt.parentInstanceId).toBe(
      readyRoot.binding.instance.attempt.identity.surfaceInstanceId,
    );
    expect(childEntry.binding.attempt.identity.allocation.sequence).toBe(beforeHighWater + 1);
    expect(rootBEntry.binding.attempt.identity.allocation.sequence).toBe(beforeHighWater + 2);
    expect(installed.transientState.identitySequenceHighWater).toBe(beforeHighWater + 2);
  });

  it("cascades an unblocked cross-owner child in the same greater-empty commit", () => {
    const { harness, narrativeParent, narrativeChild } = crossOwnerUnblockFixtureV1();
    const before = harness.kernel.getStateInternalV1();
    const parentBefore = before.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId
    );
    if (parentBefore?.binding.kind !== "ready_instance") {
      throw new Error("expected blocked ready narrative parent");
    }
    const emptyProposal = admitV1(harness, []);
    const workspaceLeaseBefore = harness.registry.inspectCurrentLease(harness.workspace.lease);
    const observedStates: ManagedSurfaceStableCompositeStateInternalV1[] = [];
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(() => {
      observedStates.push(harness.kernel.getStateInternalV1());
    });
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(applyV1(harness, emptyProposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "accept_empty",
        runtime: "retire_owned_targets_and_prepare_unblocked_children",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    const installed = harness.kernel.getStateInternalV1();
    expect(observedStates).toEqual([installed]);
    expect(transientListener).not.toHaveBeenCalled();
    const parentAfter = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId
    );
    const childAfter = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeChild.occurrenceId
    );
    if (
      parentAfter?.binding.kind !== "ready_instance" ||
      childAfter?.binding.kind !== "preparing"
    ) {
      throw new Error("expected retained parent and cascaded child preparation");
    }
    expect(parentAfter.binding.instance.attempt).toBe(parentBefore.binding.instance.attempt);
    expect(childAfter.binding.attempt.parentInstanceId).toBe(
      parentBefore.binding.instance.attempt.identity.surfaceInstanceId,
    );
    expect(childAfter.binding.attempt.identity.allocation.sequence).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(installed.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBe(
      workspaceLeaseBefore,
    );
  });

  it("cascades an unblocked cross-owner child only after effective publisher disposal", () => {
    const { harness, narrativeParent, narrativeChild } = crossOwnerUnblockFixtureV1();
    const before = harness.kernel.getStateInternalV1();
    const parentBefore = before.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId
    );
    if (parentBefore?.binding.kind !== "ready_instance") {
      throw new Error("expected blocked ready narrative parent");
    }
    const observedStates: ManagedSurfaceStableCompositeStateInternalV1[] = [];
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(() => {
      observedStates.push(harness.kernel.getStateInternalV1());
    });
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "retire_owned_targets_and_prepare_unblocked_children",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    const installed = harness.kernel.getStateInternalV1();
    expect(observedStates).toEqual([installed]);
    expect(transientListener).not.toHaveBeenCalled();
    const parentAfter = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeParent.occurrenceId
    );
    const childAfter = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === narrativeChild.occurrenceId
    );
    if (
      parentAfter?.binding.kind !== "ready_instance" ||
      childAfter?.binding.kind !== "preparing"
    ) {
      throw new Error("expected retained parent and cascaded child preparation");
    }
    expect(parentAfter.binding.instance.attempt).toBe(parentBefore.binding.instance.attempt);
    expect(childAfter.binding.attempt.parentInstanceId).toBe(
      parentBefore.binding.instance.attempt.identity.surfaceInstanceId,
    );
    expect(childAfter.binding.attempt.identity.allocation.sequence).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(installed.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
  });

  it("keeps state and publisher ingress exact when disposal cascade capacity is exhausted", () => {
    const { harness } = crossOwnerUnblockFixtureV1({
      identitySequenceHighWater: Number.MAX_SAFE_INTEGER - 2,
    });
    const before = harness.kernel.getStateInternalV1();
    const workspaceLeaseBefore = harness.registry.inspectCurrentLease(harness.workspace.lease);
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBe(
      workspaceLeaseBefore,
    );
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("retains one exact ready subtree across second replacement, failure, and disposal", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1(harness.workspace, root.occurrenceId);
    expect(applyV1(harness, admitV1(harness, [root, child])).kind).toBe("applied");
    const ready = settleRootAndChildV1(harness);
    const readyRoot = ready.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.stackScope.kind === "root"
    );
    if (readyRoot?.binding.kind !== "ready_instance") throw new Error("expected ready root");
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: ready,
      root: readyRoot.binding.instance,
    });
    const replacement = rawRootV1(harness.workspace, replacementDefinitionV1);
    const proposal = admitV1(harness, [replacement]);

    expect(applyV1(harness, proposal)).toEqual({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        source: "replace_vector",
        runtime: "retain_retire_prepare",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableAcceptedBaselines[0]).toBe(proposal.nextAcceptedBaseline);
    expect(after.stableRuntimeBindings).toHaveLength(1);
    const replacementEntry = after.stableRuntimeBindings[0]!;
    expect(replacementEntry.binding.kind).toBe("preparing");
    if (replacementEntry.binding.kind !== "preparing") throw new Error("expected replacement");
    expect(replacementEntry.binding.transition).toBe("primary_replacement");
    const currentRetainedSubtree = replacementEntry.binding.retainedSubtree;
    expect(currentRetainedSubtree).not.toBeNull();
    expect(currentRetainedSubtree).not.toBe(retainedSubtree);
    expect(currentRetainedSubtree!.root.attempt).toBe(retainedSubtree.root.attempt);
    expect(currentRetainedSubtree!.root.phase).toBe("suspended");
    expect(currentRetainedSubtree!.descendants).toHaveLength(retainedSubtree.descendants.length);
    currentRetainedSubtree!.descendants.forEach((instance, index) => {
      expect(instance.attempt).toBe(retainedSubtree.descendants[index]!.attempt);
    });
    expect(after.transientState.identitySequenceHighWater).toBe(
      ready.transientState.identitySequenceHighWater + 1,
    );

    const firstReplacementAttempt = replacementEntry.binding.attempt;
    const secondProposal = admitV1(harness, [rawRootV1(harness.workspace)]);
    expect(applyV1(harness, secondProposal).kind).toBe("applied");
    const second = harness.kernel.getStateInternalV1();
    expect(second.stableRuntimeBindings).toHaveLength(1);
    const secondBinding = second.stableRuntimeBindings[0]!.binding;
    if (secondBinding.kind !== "preparing") throw new Error("expected second replacement");
    expect(secondBinding.transition).toBe("primary_replacement");
    expect(secondBinding.retainedSubtree).toBe(currentRetainedSubtree);
    expect(secondBinding.attempt).not.toBe(firstReplacementAttempt);
    expect(secondBinding.attempt.identity.allocation.sequence).toBe(
      firstReplacementAttempt.identity.allocation.sequence + 1,
    );

    const failed = failPreparingRootV1(harness);
    expect(failed.stableRuntimeBindings[0]!.binding).toEqual({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: currentRetainedSubtree,
    });
    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "changed",
        runtimeAllocation: "zero",
      },
    });
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
  });

  it("preserves the other owner's exact baseline, runtime entry, binding, and current lease", () => {
    const harness = harnessV1({ registerNarrative: true });
    const narrativeBaseline = harness.kernel.getStateInternalV1().stableAcceptedBaselines.find(
      (baseline) => baseline.publisherLease === harness.narrative.lease,
    );
    if (narrativeBaseline === undefined) throw new Error("expected narrative baseline");
    const narrativeProposal = detachedProposalV1({
      harness,
      publisher: harness.narrative,
      acceptedBaseline: narrativeBaseline,
      targets: [rawRootV1(harness.narrative, narrativeRootDefinitionV1)],
    });
    expect(applyV1(harness, narrativeProposal).kind).toBe("applied");
    const narrativeInstalled = harness.kernel.getStateInternalV1();
    const exactNarrativeBaseline = narrativeInstalled.stableAcceptedBaselines.find((baseline) =>
      baseline.publisherLease === harness.narrative.lease
    );
    const exactNarrativeEntry = narrativeInstalled.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.publisherLease === harness.narrative.lease
    );
    const exactNarrativeLease = harness.registry.inspectCurrentLease(harness.narrative.lease);
    if (
      exactNarrativeBaseline === undefined || exactNarrativeEntry === undefined ||
      exactNarrativeLease === null
    ) {
      throw new Error("expected installed narrative identity");
    }

    expect(
      applyV1(harness, admitV1(harness, [rawRootV1(harness.workspace)])).kind,
    ).toBe("applied");
    const afterSubjectApply = harness.kernel.getStateInternalV1();
    expect(
      afterSubjectApply.stableAcceptedBaselines.find((baseline) =>
        baseline.publisherLease === harness.narrative.lease
      ),
    ).toBe(exactNarrativeBaseline);
    const narrativeAfterApply = afterSubjectApply.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.publisherLease === harness.narrative.lease
    );
    expect(narrativeAfterApply).toBe(exactNarrativeEntry);
    expect(narrativeAfterApply!.binding).toBe(exactNarrativeEntry.binding);
    expect(harness.registry.inspectCurrentLease(harness.narrative.lease)).toBe(
      exactNarrativeLease,
    );

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "applied",
    );
    const afterSubjectDispose = harness.kernel.getStateInternalV1();
    expect(
      afterSubjectDispose.stableAcceptedBaselines.find((baseline) =>
        baseline.publisherLease === harness.narrative.lease
      ),
    ).toBe(exactNarrativeBaseline);
    const narrativeAfterDispose = afterSubjectDispose.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.publisherLease === harness.narrative.lease
    );
    expect(narrativeAfterDispose).toBe(exactNarrativeEntry);
    expect(narrativeAfterDispose!.binding).toBe(exactNarrativeEntry.binding);
    expect(harness.registry.inspectCurrentLease(harness.narrative.lease)).toBe(
      exactNarrativeLease,
    );
  });

  it("maps planning exhaustion to reconcile fault with exact zero state", () => {
    const harness = harnessV1({ identitySequenceHighWater: Number.MAX_SAFE_INTEGER });
    const proposal = admitV1(harness, [rawRootV1(harness.workspace)]);
    const before = harness.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);

    expect(applyV1(harness, proposal)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();

    const lateHarness = harnessV1({
      identitySequenceHighWater: Number.MAX_SAFE_INTEGER - 1,
    });
    const lateProposal = admitV1(lateHarness, [
      rawRootV1(lateHarness.workspace, rootDefinitionAV1),
      rawRootV1(lateHarness.workspace, rootDefinitionBV1),
    ]);
    const lateBefore = lateHarness.kernel.getStateInternalV1();
    const lateListener = vi.fn();
    lateHarness.kernel.subscribeStateInternalV1(lateListener);
    expect(applyV1(lateHarness, lateProposal)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(lateHarness.kernel.getStateInternalV1()).toBe(lateBefore);
    expect(lateHarness.kernel.getStateInternalV1().transientState.identitySequenceHighWater).toBe(
      Number.MAX_SAFE_INTEGER - 1,
    );
    expect(lateHarness.kernel.getStateInternalV1().rootReservationGenerationToken).toBe(
      lateBefore.rootReservationGenerationToken,
    );
    expect(lateListener).not.toHaveBeenCalled();
  });

  it("publishes effective disposal before listener reentry can repeat and register successor", () => {
    const harness = harnessV1();
    expect(applyV1(harness, admitV1(harness, [rawRootV1(harness.workspace)])).kind).toBe(
      "applied",
    );
    const before = harness.kernel.getStateInternalV1();
    let notificationCount = 0;
    let successor: ManagedSurfaceStablePublisherInternalV1 | null = null;
    const observedStates: ManagedSurfaceStableCompositeStateInternalV1[] = [];
    const observedOldLeases: unknown[] = [];
    const observedSuccessorLeases: unknown[] = [];
    let repeatedResult: ManagedSurfaceStableReconcileResultInternalV1 | null = null;
    let successorRegistration:
      | ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "registerStablePublisherLeaseInternalV1"
        ]
      >
      | null = null;
    const stateListener = vi.fn(() => {
      notificationCount += 1;
      const installed = harness.kernel.getStateInternalV1();
      observedStates.push(installed);
      observedOldLeases.push(
        harness.registry.inspectCurrentLease(harness.workspace.lease),
      );
      if (notificationCount === 1) {
        repeatedResult = harness.kernel.disposeStablePublisherLeaseInternalV1(
          harness.workspace.lease,
        );
        successor = harness.registry.issuePublisher(workspaceOwnerIdV1);
        successorRegistration = harness.kernel.registerStablePublisherLeaseInternalV1(
          successor.lease,
        );
        return;
      }
      observedSuccessorLeases.push(
        successor === null ? null : harness.registry.inspectCurrentLease(successor.lease),
      );
    });
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "changed",
        runtimeAllocation: "zero",
      },
    });
    const installed = harness.kernel.getStateInternalV1();
    expect(installed.rootReservationGenerationToken).not.toBe(
      before.rootReservationGenerationToken,
    );
    expect(notificationCount).toBe(2);
    expect(stateListener).toHaveBeenCalledTimes(2);
    expect(transientListener).not.toHaveBeenCalled();
    expect(observedOldLeases).toEqual([null, null]);
    expect(observedStates[0]!.stableAcceptedBaselines).toEqual([]);
    expect(observedStates[0]!.stableRuntimeBindings).toEqual([]);
    expect(observedStates[1]).toBe(installed);
    expect(observedStates[1]!.stableRuntimeBindings).toEqual([]);
    expect(repeatedResult).toEqual({
      kind: "unchanged",
      code: "surface.stable_publisher_already_disposed",
      delta: zeroDeltaV1,
    });
    expect(successorRegistration).toMatchObject({ kind: "registered" });
    expect(successor).not.toBeNull();
    expect(observedSuccessorLeases).toHaveLength(1);
    expect(observedSuccessorLeases[0]).not.toBeNull();
    expect(installed.stableAcceptedBaselines[0]!.publisherLease).toBe(
      successor!.lease,
    );
  });

  it("contains disposal subscriber failure as diagnostics without rollback", () => {
    const reportSubscriberFailure = vi.fn();
    const harness = harnessV1({ reportSubscriberFailure });
    const before = harness.kernel.getStateInternalV1();
    const marker = new Error("dispose subscriber failed");
    const witness = vi.fn(() => {
      expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
      expect(harness.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);
    });
    harness.kernel.subscribeStateInternalV1(() => {
      throw marker;
    });
    harness.kernel.subscribeStateInternalV1(witness);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const installed = harness.kernel.getStateInternalV1();
    expect(installed).not.toBe(before);
    expect(installed.stableAcceptedBaselines).toEqual([]);
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
    expect(reportSubscriberFailure).toHaveBeenCalledTimes(1);
    expect(witness).toHaveBeenCalledTimes(1);
  });

  it("preserves the exact reservation token when disposing an accepted empty baseline", () => {
    const harness = harnessV1();
    const proposal = admitV1(harness, []);
    expect(applyV1(harness, proposal).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    expect(before.stableAcceptedBaselines[0]).toBe(proposal.nextAcceptedBaseline);
    expect(before.stableRuntimeBindings).toEqual([]);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
      delta: {
        source: "remove_lease",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const after = harness.kernel.getStateInternalV1();
    expect(after.stableAcceptedBaselines).toEqual([]);
    expect(after.stableRuntimeBindings).toBe(before.stableRuntimeBindings);
    expect(after.rootReservationGenerationToken).toBe(
      before.rootReservationGenerationToken,
    );
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
  });

  it("rejects cloned and revoked disposal leases as stale without input inspection", () => {
    const harness = harnessV1();
    const before = harness.kernel.getStateInternalV1();
    let trapCalls = 0;
    const cloned = new Proxy(Object.freeze({ ...harness.workspace.lease }), {
      get() {
        trapCalls += 1;
        throw new Error("foreign disposal input must remain opaque");
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error("foreign disposal input must not be enumerated");
      },
    });
    const revoked = Proxy.revocable(harness.workspace.lease as object, {
      get() {
        trapCalls += 1;
        throw new Error("revoked disposal input must remain opaque");
      },
    });
    revoked.revoke();

    for (const candidate of [cloned, revoked.proxy]) {
      expect(harness.kernel.disposeStablePublisherLeaseInternalV1(candidate)).toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
        delta: zeroDeltaV1,
      });
      expect(harness.kernel.getStateInternalV1()).toBe(before);
    }
    expect(trapCalls).toBe(0);
    expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).not.toBeNull();
  });

  it("faults repeated disposal when a package-internal reentrant commit leaves orphan runtime", () => {
    const harness = harnessV1();
    const narrativeBaseline = harness.authority.createUnpublishedBaseline(
      harness.narrative.lease,
    );
    const narrativeSeed = detachedProposalV1({
      harness,
      publisher: harness.narrative,
      acceptedBaseline: narrativeBaseline,
      targets: [rawRootV1(harness.narrative, narrativeRootDefinitionV1)],
    });
    const orphanEntry = rootFailureEntryV1(
      desiredTargetFromProposalV1(harness, narrativeSeed),
    );
    let installedOrphan = false;
    harness.kernel.subscribeStateInternalV1(() => {
      if (installedOrphan) return;
      installedOrphan = true;
      installStableEntriesV1(harness, [orphanEntry]);
    });
    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "applied",
    );
    const beforeRepeat = harness.kernel.getStateInternalV1();
    expect(beforeRepeat.stableAcceptedBaselines).toEqual([]);
    expect(beforeRepeat.stableRuntimeBindings).toEqual([orphanEntry]);
    const stateListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);

    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(harness.kernel.getStateInternalV1()).toBe(beforeRepeat);
    expect(stateListener).not.toHaveBeenCalled();
  });

  it("preserves token for unpublished dispose and faults direct/global divergence", () => {
    const unpublished = harnessV1();
    const unpublishedBefore = unpublished.kernel.getStateInternalV1();
    expect(unpublished.kernel.disposeStablePublisherLeaseInternalV1(unpublished.workspace.lease))
      .toEqual({
        kind: "applied",
        code: "surface.stable_publisher_disposed",
        delta: {
          source: "remove_lease",
          runtime: "unchanged",
          notificationCount: 1,
          topology: "unchanged",
          runtimeAllocation: "zero",
        },
      });
    expect(unpublished.kernel.getStateInternalV1().rootReservationGenerationToken).toBe(
      unpublishedBefore.rootReservationGenerationToken,
    );

    const unregistered = harnessV1();
    const unregisteredBefore = unregistered.kernel.getStateInternalV1();
    expect(unregistered.kernel.disposeStablePublisherLeaseInternalV1(unregistered.narrative.lease))
      .toEqual({
        kind: "faulted",
        code: "surface.stable_reconcile_faulted",
        delta: zeroDeltaV1,
      });
    expect(unregistered.kernel.getStateInternalV1()).toBe(unregisteredBefore);
    expect(unregistered.registry.inspectCurrentLease(unregistered.narrative.lease)).not.toBeNull();

    const foreignRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: applicationEpochV1,
      resolvedOwnerIds: [workspaceOwnerIdV1],
      leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
    });
    const foreignPublisher = foreignRegistry.issuePublisher(workspaceOwnerIdV1);
    expect(unregistered.kernel.disposeStablePublisherLeaseInternalV1(foreignPublisher.lease))
      .toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
        delta: zeroDeltaV1,
      });
    expect(unregistered.kernel.getStateInternalV1()).toBe(unregisteredBefore);

    for (const global of [false, true]) {
      const harness = harnessV1();
      const before = harness.kernel.getStateInternalV1();
      const stateListener = vi.fn();
      harness.kernel.subscribeStateInternalV1(stateListener);
      expect(
        global
          ? harness.registry.dispose()
          : harness.registry.disposePublisherLease(harness.workspace.lease),
      ).toBe("disposed");
      expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.workspace.lease))
        .toEqual({
          kind: "faulted",
          code: "surface.stable_reconcile_faulted",
          delta: zeroDeltaV1,
        });
      expect(harness.kernel.getStateInternalV1()).toBe(before);
      expect(stateListener).not.toHaveBeenCalled();
    }
  });

  it("keeps both specialized ingress results on the exact closed R0 union", () => {
    expectTypeOf<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
        "applyStableAdmissionProposalInternalV1"
      ]
    >().returns.toEqualTypeOf<ManagedSurfaceStableReconcileResultInternalV1>();
    expectTypeOf<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
        "disposeStablePublisherLeaseInternalV1"
      ]
    >().returns.toEqualTypeOf<ManagedSurfaceStableReconcileResultInternalV1>();
  });
});
