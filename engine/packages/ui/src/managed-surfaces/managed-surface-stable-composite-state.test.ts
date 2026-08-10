// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceInstanceIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceRoutingLeaseIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceActionIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceCoordinatorFacadeInternalV1 } from "./managed-surface-coordinator.ts";
import { createManagedSurfaceRuntimeAttemptIdentityInternalV1 } from "./managed-surface-identity.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  createManagedSurfaceStableCompositeStateInternalV1,
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  allocateManagedSurfaceStableRuntimeAttemptInternalV1,
  createManagedSurfaceStableGapRuntimeBindingInternalV1,
  createManagedSurfaceStablePreparingRuntimeBindingInternalV1,
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
  projectManagedSurfaceStableRootReservationSnapshotInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
  type ManagedSurfaceStableCompositeStateInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
  type ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1,
  type ManagedSurfaceStableReadyActiveTargetProofInternalV1,
  type ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
  type ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRootReservationContributorInternalV1,
  type ManagedSurfaceStableRuntimeAttemptInternalV1,
  type ManagedSurfaceStableRuntimeBindingInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

type ExactKeysV1<TValue> = TValue extends unknown ? keyof TValue : never;

const applicationEpochV1 = parseNonNegativeSafeInteger(41);
const workspaceOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const narrativeOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");
const rootSlotAV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-a");
const rootSlotBV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-b");
const childSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.child");
const rootDefinitionAV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-a");
const replacementDefinitionAV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.root-a-replacement",
);
const rootDefinitionBV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-b");
const childDefinitionV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.child");
const grandchildDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.grandchild",
);
const grandchildSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.grandchild");
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.workspace");
const narrativeAdvanceActionIdV1 = parseManagedSurfaceActionIdV1("narrative.advance");
const narrativeOtherActionIdV1 = parseManagedSurfaceActionIdV1("narrative.other");

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
  ] satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function schemaV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({
    parse(value: unknown): unknown {
      return value;
    },
  });
}

function definitionV1(input: {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly placement?: "root" | "child";
  readonly modality?: "blocking" | "non_blocking";
  readonly layerOrder?: number;
  readonly managedInput?: boolean;
  readonly actionIds?: readonly ManagedSurfaceActionIdV1[];
}): ManagedSurfaceStableDefinitionSidecarInternalV1 {
  const definition = Object.freeze({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId,
    slotId: input.slotId,
    layerId: layerIdV1,
    layerOrder: parseNonNegativeSafeInteger(input.layerOrder ?? 1),
    placement: input.placement ?? "root",
    modality: input.modality ?? "blocking",
    inputPolicy: input.managedInput === true
      ? Object.freeze({ kind: "managed" as const, inputContextId: "narrative" as const })
      : Object.freeze({ kind: "none" as const }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: false,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({ kind: "none" as const }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([...(input.actionIds ?? [])]),
    readiness: Object.freeze({
      initialOpen: "blocking_fallback" as const,
      primaryReplacement: "retain_current" as const,
      childOpen: "blocking_fallback" as const,
    }),
  }) satisfies ManagedSurfaceResolvedDefinitionV1;
  return Object.freeze({ definition, parameterSchema: schemaV1() });
}

interface StableHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly workspace: ManagedSurfaceStablePublisherInternalV1;
  readonly narrative: ManagedSurfaceStablePublisherInternalV1;
  readonly workspaceRoot: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly workspaceReplacement: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly workspaceChild: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly narrativeRoot: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly workspaceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly workspaceReplacementRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly narrativeRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly workspaceReplacementBaseline: Extract<
    ManagedSurfaceStableAcceptedBaselineInternalV1,
    { readonly kind: "accepted" }
  >;
}

function admittedBaselineV1(
  authority: ManagedSurfaceStableAdmissionAuthorityInternalV1,
  publisher: ManagedSurfaceStablePublisherInternalV1,
  revision: ManagedSurfaceStableSourceRevisionInternalV1,
  targets: readonly unknown[],
  acceptedBaseline?: ManagedSurfaceStableAcceptedBaselineInternalV1,
): Extract<ManagedSurfaceStableAcceptedBaselineInternalV1, { readonly kind: "accepted" }> {
  const baseline = acceptedBaseline ?? authority.createUnpublishedBaseline(publisher.lease);
  const reservationSnapshot = authority.createRootReservationSnapshot({
    subjectPublisherLease: publisher.lease,
    generationToken: authority.createReservationGenerationToken(),
    foreignReservedRootSlotIds: [],
  });
  const result = authority.evaluate({
    publication: {
      publisherLease: publisher.lease,
      sourceRevision: revision,
      targets,
    },
    acceptedBaseline: baseline,
    reservationSnapshot,
  });
  expect(result.kind).toBe("admitted");
  if (result.kind !== "admitted") throw new Error(`expected admitted, got ${result.kind}`);
  return result.proposal.nextAcceptedBaseline;
}

function harnessV1(input: {
  readonly applicationEpoch?: ReturnType<typeof parseNonNegativeSafeInteger>;
  readonly managedInput?: boolean;
  readonly workspaceLayerOrder?: number;
  readonly narrativeLayerOrder?: number;
  readonly actionIds?: readonly ManagedSurfaceActionIdV1[];
} = {}): StableHarnessV1 {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: input.applicationEpoch ?? applicationEpochV1,
    resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const workspace = registry.issuePublisher(workspaceOwnerIdV1);
  const narrative = registry.issuePublisher(narrativeOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: [
      definitionV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
        layerOrder: input.workspaceLayerOrder ?? 1,
        managedInput: input.managedInput === true,
        actionIds: input.actionIds ?? [],
      }),
      definitionV1({
        definitionId: replacementDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
        layerOrder: input.workspaceLayerOrder ?? 1,
        managedInput: input.managedInput === true,
        actionIds: input.actionIds ?? [],
      }),
      definitionV1({
        definitionId: childDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: childSlotV1,
        placement: "child",
      }),
      definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: input.narrativeLayerOrder ?? 1,
        managedInput: input.managedInput === true,
        actionIds: input.actionIds ?? [],
      }),
    ],
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });

  const workspaceRootOccurrence = workspace.issueOccurrence();
  const workspaceChildOccurrence = workspace.issueOccurrence();
  const workspaceRevision = workspace.issueSourceRevision();
  const workspaceInitial = admittedBaselineV1(authority, workspace, workspaceRevision, [
    {
      occurrenceId: workspaceRootOccurrence,
      definitionId: rootDefinitionAV1,
      parentOccurrenceId: null,
      parameters: null,
    },
    {
      occurrenceId: workspaceChildOccurrence,
      definitionId: childDefinitionV1,
      parentOccurrenceId: workspaceRootOccurrence,
      parameters: null,
    },
  ]);

  const workspaceReplacementOccurrence = workspace.issueOccurrence();
  const workspaceReplacementRevision = workspace.issueSourceRevision();
  const workspaceReplacementBaseline = admittedBaselineV1(
    authority,
    workspace,
    workspaceReplacementRevision,
    [{
      occurrenceId: workspaceReplacementOccurrence,
      definitionId: replacementDefinitionAV1,
      parentOccurrenceId: null,
      parameters: null,
    }],
    workspaceInitial,
  );

  const narrativeRootOccurrence = narrative.issueOccurrence();
  const narrativeRevision = narrative.issueSourceRevision();
  const narrativeBaseline = admittedBaselineV1(authority, narrative, narrativeRevision, [{
    occurrenceId: narrativeRootOccurrence,
    definitionId: rootDefinitionBV1,
    parentOccurrenceId: null,
    parameters: null,
  }]);

  return {
    registry,
    authority,
    workspace,
    narrative,
    workspaceRoot: workspaceInitial.targets[0]!,
    workspaceChild: workspaceInitial.targets[1]!,
    workspaceReplacement: workspaceReplacementBaseline.targets[0]!,
    narrativeRoot: narrativeBaseline.targets[0]!,
    workspaceRevision,
    workspaceReplacementRevision,
    narrativeRevision,
    workspaceReplacementBaseline,
  };
}

function desiredV1(
  harness: Pick<StableHarnessV1, "registry">,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
  sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1,
): ManagedSurfaceStableDesiredRuntimeTargetInternalV1 {
  const leaseSnapshot = harness.registry.inspectCurrentLease(target.publisherLease);
  const occurrenceSequence = harness.registry.inspectIssuedOccurrence(
    target.publisherLease,
    target.occurrenceId,
  );
  if (leaseSnapshot === null || occurrenceSequence === null) {
    throw new Error("expected current issued stable target");
  }
  return Object.freeze({
    publisherLease: target.publisherLease,
    publisherLeaseSequence: leaseSnapshot.leaseSequence,
    occurrenceSequence,
    sourceRevision,
    admittedTarget: target,
  });
}

function attemptV1(
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  sequence: number,
  parentInstanceId: ReturnType<typeof parseManagedSurfaceInstanceIdV1> | null = null,
): ManagedSurfaceStableRuntimeAttemptInternalV1 {
  return Object.freeze({
    desiredTarget,
    identity: createManagedSurfaceRuntimeAttemptIdentityInternalV1(
      applicationEpochV1,
      parsePositiveSafeInteger(sequence),
    ),
    parentInstanceId,
  });
}

function readyBindingV1(
  attempt: ManagedSurfaceStableRuntimeAttemptInternalV1,
  phase: "active" | "suspended" = "active",
): Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { readonly kind: "ready_instance" }> {
  return createManagedSurfaceStableReadyRuntimeBindingInternalV1({ attempt, phase });
}

function stableDesiredCandidateV1(
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ManagedSurfaceStableRootReservationContributorCandidateInternalV1 {
  return Object.freeze({ kind: "stable_desired" as const, desiredTarget });
}

function stableRuntimeCandidateV1(
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  binding: ManagedSurfaceStableRuntimeBindingInternalV1,
): ManagedSurfaceStableRootReservationContributorCandidateInternalV1 {
  return Object.freeze({ kind: "stable_runtime" as const, desiredTarget, binding });
}

function gapRuntimeCandidateV1(
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
): ManagedSurfaceStableRootReservationContributorCandidateInternalV1 {
  const placement = desiredTarget.admittedTarget.stackScope.kind;
  return stableRuntimeCandidateV1(
    desiredTarget,
    createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: placement === "root" ? "readiness_failed" : "parent_unavailable",
      placement,
      slotCardinality: placement === "root" ? "single" : "stack",
      retainedSubtree: null,
    }),
  );
}

function allocateAttemptV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  parentInstanceId: ReturnType<typeof parseManagedSurfaceInstanceIdV1> | null = null,
): {
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
} {
  const allocation = allocateManagedSurfaceStableRuntimeAttemptInternalV1(state);
  return Object.freeze({
    state: allocation.state,
    attempt: Object.freeze({
      desiredTarget,
      identity: allocation.identity,
      parentInstanceId,
    }),
  });
}

function reconcileV1(
  currentState: ManagedSurfaceStableCompositeStateInternalV1,
  contributorCandidates:
    readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[],
): ManagedSurfaceStableCompositeStateInternalV1 {
  return reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState,
    contributorCandidates,
  });
}

function transientStateV1(
  applicationEpoch: ReturnType<typeof parseNonNegativeSafeInteger> = applicationEpochV1,
) {
  return createManagedSurfaceReducerStateV1(
    applicationEpoch,
    [workspaceOwnerIdV1, narrativeOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
}

function admitAndApplyStableTargetV1(input: {
  readonly harness: StableHarnessV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}): ManagedSurfaceStableAdmittedTargetInternalV1 {
  const context = input.kernel.captureAdmissionContextInternalV1(input.publisher.lease);
  if (context.kind !== "captured") throw new Error(`expected captured, got ${context.kind}`);
  const evaluated = input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.sourceRevision,
      targets: Object.freeze([Object.freeze({
        occurrenceId: input.target.occurrenceId,
        definitionId: input.target.definitionId,
        parentOccurrenceId: input.target.parentOccurrenceId,
        parameters: input.target.normalizedParameters,
      })]),
    }),
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
  if (evaluated.kind !== "admitted") {
    throw new Error(`expected admitted, got ${evaluated.kind}:${evaluated.code}`);
  }
  expect(input.kernel.applyStableAdmissionProposalInternalV1(evaluated.proposal)).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  const [installedTarget] = evaluated.proposal.nextAcceptedBaseline.targets;
  if (installedTarget === undefined) throw new Error("expected installed stable target");
  return installedTarget;
}

function stableActionFixtureV1(input: {
  readonly applicationEpoch?: ReturnType<typeof parseNonNegativeSafeInteger>;
} = {}) {
  const harness = harnessV1({
    ...(input.applicationEpoch === undefined ? {} : { applicationEpoch: input.applicationEpoch }),
    managedInput: true,
    workspaceLayerOrder: 10,
    narrativeLayerOrder: 20,
    actionIds: [narrativeAdvanceActionIdV1],
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: harness.authority,
    publisherLeaseRegistry: harness.registry,
    initialTransientState: transientStateV1(harness.registry.getSnapshot().applicationEpoch),
  });
  expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
    "registered",
  );
  expect(kernel.registerStablePublisherLeaseInternalV1(harness.narrative.lease).kind).toBe(
    "registered",
  );
  return Object.freeze({
    harness,
    kernel,
    authority: claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel),
  });
}

function settleCurrentStablePreparationReadyV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
): void {
  const entry = kernel.getStateInternalV1().stableRuntimeBindings.find((candidate) =>
    candidate.desiredTarget.admittedTarget.occurrenceId === target.occurrenceId
  );
  if (entry?.binding.kind !== "preparing") {
    throw new Error("expected current stable preparation");
  }
  expect(kernel.settleStableReadinessReadyInternalV1(Object.freeze({
    readinessEvidence: Object.freeze({
      applicationEpoch: kernel.getStateInternalV1().transientState.publication.applicationEpoch,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  }))).toMatchObject({ kind: "applied" });
}

function settleCurrentStablePreparationFailedV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
): void {
  const entry = kernel.getStateInternalV1().stableRuntimeBindings.find((candidate) =>
    candidate.desiredTarget.admittedTarget.occurrenceId === target.occurrenceId
  );
  if (entry?.binding.kind !== "preparing") {
    throw new Error("expected current stable preparation");
  }
  expect(kernel.settleStableReadinessFailedInternalV1(Object.freeze({
    readinessEvidence: Object.freeze({
      applicationEpoch: kernel.getStateInternalV1().transientState.publication.applicationEpoch,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  }))).toMatchObject({ kind: "applied" });
}

function applyEmptyStablePublicationV1(input: {
  readonly fixture: ReturnType<typeof stableActionFixtureV1>;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}): void {
  const context = input.fixture.kernel.captureAdmissionContextInternalV1(input.publisher.lease);
  if (context.kind !== "captured") throw new Error(`expected captured, got ${context.kind}`);
  const evaluated = input.fixture.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.sourceRevision,
      targets: Object.freeze([]),
    }),
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
  if (evaluated.kind !== "admitted") {
    throw new Error(`expected admitted, got ${evaluated.kind}:${evaluated.code}`);
  }
  expect(
    input.fixture.kernel.applyStableAdmissionProposalInternalV1(evaluated.proposal),
  ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
}

function publishReadyStableTargetV1(input: {
  readonly fixture: ReturnType<typeof stableActionFixtureV1>;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}): ManagedSurfaceStableAdmittedTargetInternalV1 {
  const installedTarget = admitAndApplyStableTargetV1({
    harness: input.fixture.harness,
    kernel: input.fixture.kernel,
    publisher: input.publisher,
    target: input.target,
    sourceRevision: input.sourceRevision,
  });
  settleCurrentStablePreparationReadyV1(input.fixture.kernel, installedTarget);
  return installedTarget;
}

interface RetainedSubtreeHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly workspace: ManagedSurfaceStablePublisherInternalV1;
  readonly narrative: ManagedSurfaceStablePublisherInternalV1;
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly initialRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly replacementRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly secondReplacementRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly narrativeRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly root: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly child: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly grandchild: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly replacement: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly secondReplacement: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly narrativeRoot: ManagedSurfaceStableAdmittedTargetInternalV1;
}

function retainedSubtreeHarnessV1(): RetainedSubtreeHarnessV1 {
  const resolvedSlotDescriptors = Object.freeze(
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
        parentDefinitionId: childDefinitionV1,
        slotId: grandchildSlotV1,
        cardinality: "stack" as const,
      }),
    ] satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
  );
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
      definitionV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
      }),
      definitionV1({
        definitionId: replacementDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
      }),
      definitionV1({
        definitionId: childDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: childSlotV1,
        placement: "child",
      }),
      definitionV1({
        definitionId: grandchildDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: grandchildSlotV1,
        placement: "child",
      }),
      definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
      }),
    ],
    resolvedSlotDescriptors,
  });

  const rootOccurrence = workspace.issueOccurrence();
  const childOccurrence = workspace.issueOccurrence();
  const grandchildOccurrence = workspace.issueOccurrence();
  const initialRevision = workspace.issueSourceRevision();
  const initial = admittedBaselineV1(authority, workspace, initialRevision, [
    {
      occurrenceId: rootOccurrence,
      definitionId: rootDefinitionAV1,
      parentOccurrenceId: null,
      parameters: null,
    },
    {
      occurrenceId: childOccurrence,
      definitionId: childDefinitionV1,
      parentOccurrenceId: rootOccurrence,
      parameters: null,
    },
    {
      occurrenceId: grandchildOccurrence,
      definitionId: grandchildDefinitionV1,
      parentOccurrenceId: childOccurrence,
      parameters: null,
    },
  ]);

  const replacementOccurrence = workspace.issueOccurrence();
  const replacementRevision = workspace.issueSourceRevision();
  const replacement = admittedBaselineV1(
    authority,
    workspace,
    replacementRevision,
    [{
      occurrenceId: replacementOccurrence,
      definitionId: replacementDefinitionAV1,
      parentOccurrenceId: null,
      parameters: null,
    }],
    initial,
  );

  const secondReplacementOccurrence = workspace.issueOccurrence();
  const secondReplacementRevision = workspace.issueSourceRevision();
  const secondReplacement = admittedBaselineV1(
    authority,
    workspace,
    secondReplacementRevision,
    [{
      occurrenceId: secondReplacementOccurrence,
      definitionId: replacementDefinitionAV1,
      parentOccurrenceId: null,
      parameters: null,
    }],
    replacement,
  );

  const narrativeOccurrence = narrative.issueOccurrence();
  const narrativeRevision = narrative.issueSourceRevision();
  const narrativeBaseline = admittedBaselineV1(authority, narrative, narrativeRevision, [{
    occurrenceId: narrativeOccurrence,
    definitionId: rootDefinitionBV1,
    parentOccurrenceId: null,
    parameters: null,
  }]);

  return Object.freeze({
    registry,
    authority,
    workspace,
    narrative,
    resolvedSlotDescriptors,
    initialRevision,
    replacementRevision,
    secondReplacementRevision,
    narrativeRevision,
    root: initial.targets[0]!,
    child: initial.targets[1]!,
    grandchild: initial.targets[2]!,
    replacement: replacement.targets[0]!,
    secondReplacement: secondReplacement.targets[0]!,
    narrativeRoot: narrativeBaseline.targets[0]!,
  });
}

interface RetainedReadySubtreeFixtureV1 {
  readonly harness: RetainedSubtreeHarnessV1;
  readonly state: ManagedSurfaceStableCompositeStateInternalV1;
  readonly rootDesired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly childDesired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly grandchildDesired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly narrativeDesired: ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
  readonly root: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly child: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly grandchild: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
  readonly narrativeRoot: ManagedSurfaceStableReadyRuntimeInstanceInternalV1;
}

function retainedReadySubtreeFixtureV1(): RetainedReadySubtreeFixtureV1 {
  const harness = retainedSubtreeHarnessV1();
  const rootDesired = desiredV1(harness, harness.root, harness.initialRevision);
  const childDesired = desiredV1(harness, harness.child, harness.initialRevision);
  const grandchildDesired = desiredV1(harness, harness.grandchild, harness.initialRevision);
  const narrativeDesired = desiredV1(
    harness,
    harness.narrativeRoot,
    harness.narrativeRevision,
  );
  const initial = createManagedSurfaceStableCompositeStateInternalV1({
    admissionAuthority: harness.authority,
    publisherLeaseRegistry: harness.registry,
    transientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      [workspaceOwnerIdV1, narrativeOwnerIdV1],
      harness.resolvedSlotDescriptors,
    ),
  });
  const rootAllocation = allocateAttemptV1(initial, rootDesired);
  const childAllocation = allocateAttemptV1(
    rootAllocation.state,
    childDesired,
    rootAllocation.attempt.identity.surfaceInstanceId,
  );
  const grandchildAllocation = allocateAttemptV1(
    childAllocation.state,
    grandchildDesired,
    childAllocation.attempt.identity.surfaceInstanceId,
  );
  const narrativeAllocation = allocateAttemptV1(
    grandchildAllocation.state,
    narrativeDesired,
  );
  const rootBinding = readyBindingV1(rootAllocation.attempt);
  const childBinding = readyBindingV1(childAllocation.attempt);
  const grandchildBinding = readyBindingV1(grandchildAllocation.attempt, "suspended");
  const narrativeBinding = readyBindingV1(narrativeAllocation.attempt);
  const state = reconcileV1(narrativeAllocation.state, [
    stableDesiredCandidateV1(rootDesired),
    stableRuntimeCandidateV1(rootDesired, rootBinding),
    stableDesiredCandidateV1(childDesired),
    stableRuntimeCandidateV1(childDesired, childBinding),
    stableDesiredCandidateV1(grandchildDesired),
    stableRuntimeCandidateV1(grandchildDesired, grandchildBinding),
    stableDesiredCandidateV1(narrativeDesired),
    stableRuntimeCandidateV1(narrativeDesired, narrativeBinding),
  ]);
  const readyInstance = (
    desiredTarget: ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  ): ManagedSurfaceStableReadyRuntimeInstanceInternalV1 => {
    const binding = state.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === desiredTarget.admittedTarget
    )?.binding;
    if (binding?.kind !== "ready_instance") throw new Error("expected retained ready instance");
    return binding.instance;
  };
  return Object.freeze({
    harness,
    state,
    rootDesired,
    childDesired,
    grandchildDesired,
    narrativeDesired,
    root: readyInstance(rootDesired),
    child: readyInstance(childDesired),
    grandchild: readyInstance(grandchildDesired),
    narrativeRoot: readyInstance(narrativeDesired),
  });
}

describe("dormant managed stable composite state", () => {
  it("shares one exact state cell, identity cursor, and transient projection with the façade", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    const initial = kernel.getStateInternalV1();
    const initialToken = initial.rootReservationGenerationToken;
    expect(coordinator.getSnapshot()).toBe(initial.transientState.publication);

    const opened = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(opened.receipt).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e41.n1",
    });
    const preparing = kernel.getStateInternalV1();
    expect(preparing).not.toBe(initial);
    expect(preparing.transientState.identitySequenceHighWater).toBe(1);
    expect(coordinator.getSnapshot()).toBe(preparing.transientState.publication);
    expect(preparing.rootReservationContributors).toMatchObject([
      {
        kind: "transient_runtime",
        slotId: rootSlotAV1,
        runtimeSequence: 1,
        role: "candidate",
        phase: "preparing",
      },
    ]);
    expect(preparing.rootReservationGenerationToken).not.toBe(initialToken);

    expect(opened.readiness!.ready().receipt).toMatchObject({ kind: "applied" });
    const ready = kernel.getStateInternalV1();
    expect(ready.transientState.identitySequenceHighWater).toBe(1);
    expect(ready.rootReservationContributors).toMatchObject([
      { role: "ready_instance", phase: "active", runtimeSequence: 1 },
    ]);
    expect(ready.rootReservationGenerationToken).not.toBe(
      preparing.rootReservationGenerationToken,
    );
    expect(coordinator.getSnapshot()).toBe(ready.transientState.publication);

    const second = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
      }).definition,
      semanticOccurrenceId: null,
    });
    second.readiness!.ready();
    expect(kernel.getStateInternalV1().rootReservationContributors).toMatchObject([
      { runtimeSequence: 1, role: "ready_instance", phase: "suspended" },
      { runtimeSequence: 2, role: "ready_instance", phase: "active" },
    ]);
    coordinator.closeTop();
    expect(kernel.getStateInternalV1().rootReservationContributors).toMatchObject([
      { runtimeSequence: 1, role: "ready_instance", phase: "active" },
    ]);
  });

  it("installs empty transient disposal without rotating root reservation authority", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    const initial = kernel.getStateInternalV1();
    const rootContributors = initial.rootReservationContributors;
    const rootGeneration = initial.rootReservationGenerationToken;
    let transientNotifications = 0;
    let stateNotifications = 0;
    coordinator.subscribe(() => transientNotifications += 1);
    kernel.subscribeStateInternalV1(() => stateNotifications += 1);

    expect(coordinator.dispose()).toMatchObject({ kind: "applied" });
    const disposed = kernel.getStateInternalV1();
    expect(disposed).not.toBe(initial);
    expect(disposed.transientState.publication.coordinatorDisposed).toBe(true);
    expect(disposed.rootReservationContributors).toBe(rootContributors);
    expect(disposed.rootReservationGenerationToken).toBe(rootGeneration);
    expect(transientNotifications).toBe(1);
    expect(stateNotifications).toBe(1);

    expect(coordinator.dispose()).toMatchObject({ kind: "unchanged" });
    expect(kernel.getStateInternalV1()).toBe(disposed);
    expect(transientNotifications).toBe(1);
    expect(stateNotifications).toBe(1);
  });

  it("installs child-only close without rotating unchanged root reservation authority", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    const rootPreparation = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
      }).definition,
      semanticOccurrenceId: null,
    });
    const rootReady = rootPreparation.readiness!.ready();
    expect(rootReady.handle).not.toBeNull();
    const childPreparation = coordinator.pushTransientChild({
      definition: definitionV1({
        definitionId: childDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: childSlotV1,
        placement: "child",
        modality: "non_blocking",
      }).definition,
      semanticOccurrenceId: null,
      parent: rootReady.handle!,
    });
    const childReady = childPreparation.readiness!.ready();
    expect(childReady.handle).not.toBeNull();
    const beforeClose = kernel.getStateInternalV1();
    const rootContributors = beforeClose.rootReservationContributors;
    const rootGeneration = beforeClose.rootReservationGenerationToken;
    let transientNotifications = 0;
    let stateNotifications = 0;
    coordinator.subscribe(() => transientNotifications += 1);
    kernel.subscribeStateInternalV1(() => stateNotifications += 1);

    expect(coordinator.closeExpected(childReady.handle!)).toMatchObject({ kind: "applied" });
    const afterClose = kernel.getStateInternalV1();
    expect(afterClose).not.toBe(beforeClose);
    expect(afterClose.rootReservationContributors).toBe(rootContributors);
    expect(afterClose.rootReservationGenerationToken).toBe(rootGeneration);
    expect(transientNotifications).toBe(1);
    expect(stateNotifications).toBe(1);
  });

  it("installs only exact installable successors from the current composite lineage", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const initial = kernel.getStateInternalV1();
    const listener = vi.fn();
    kernel.subscribeStateInternalV1(listener);
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    const narrativeDesired = desiredV1(
      harness,
      harness.narrativeRoot,
      harness.narrativeRevision,
    );

    const clone = Object.freeze({ ...initial });
    expect(() => kernel.transitionStateInternalV1(() => ({ state: clone, result: undefined })))
      .toThrowError("ui.managed_surface_stable_composite_state_invalid");
    const foreign = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    expect(() => kernel.transitionStateInternalV1(() => ({ state: foreign, result: undefined })))
      .toThrowError("ui.managed_surface_stable_composite_state_invalid");
    const intermediate = allocateManagedSurfaceStableRuntimeAttemptInternalV1(initial).state;
    expect(() =>
      kernel.transitionStateInternalV1(() => ({ state: intermediate, result: undefined }))
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");
    expect(kernel.getStateInternalV1()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();

    const firstBranch = reconcileV1(initial, [
      stableDesiredCandidateV1(desired),
      gapRuntimeCandidateV1(desired),
    ]);
    const staleSibling = reconcileV1(initial, [
      stableDesiredCandidateV1(narrativeDesired),
      gapRuntimeCandidateV1(narrativeDesired),
    ]);
    kernel.transitionStateInternalV1(() => ({ state: firstBranch, result: undefined }));
    expect(kernel.getStateInternalV1()).toBe(firstBranch);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() =>
      kernel.transitionStateInternalV1(() => ({ state: staleSibling, result: undefined }))
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");
    expect(kernel.getStateInternalV1()).toBe(firstBranch);
    expect(listener).toHaveBeenCalledTimes(1);

    kernel.transitionStateInternalV1((current) => ({
      state: reconcileV1(current, [
        stableDesiredCandidateV1(desired),
        gapRuntimeCandidateV1(desired),
      ]),
      result: undefined,
    }));
    expect(kernel.getStateInternalV1()).toBe(firstBranch);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("allocates stable and transient attempts from the exact same committed cursor", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "registered",
    );
    let transientNotifications = 0;
    let stateNotifications = 0;
    coordinator.subscribe(() => transientNotifications += 1);
    kernel.subscribeStateInternalV1(() => stateNotifications += 1);

    admitAndApplyStableTargetV1({
      harness,
      kernel,
      publisher: harness.workspace,
      target: harness.workspaceRoot,
      sourceRevision: harness.workspaceRevision,
    });
    const stableBinding = kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding;
    if (stableBinding?.kind !== "preparing") throw new Error("expected stable preparation");
    const stableIdentity = stableBinding.attempt.identity;
    expect(stableIdentity.surfaceInstanceId).toBe("surface-instance.e41.n1");
    expect(kernel.getStateInternalV1().transientState.identitySequenceHighWater).toBe(1);
    expect(transientNotifications).toBe(0);
    expect(stateNotifications).toBe(1);

    const transient = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
        layerOrder: 2,
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(transient.receipt).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e41.n2",
    });
    expect(kernel.getStateInternalV1().transientState.identitySequenceHighWater).toBe(2);
    expect(kernel.getStateInternalV1().rootReservationContributors.map((row) => row.kind)).toEqual([
      "stable_desired",
      "stable_runtime",
      "transient_runtime",
    ]);
    expect(
      projectManagedSurfaceStableRootReservationSnapshotInternalV1({
        state: kernel.getStateInternalV1(),
        subjectPublisherLease: harness.workspace.lease,
      }).reservedRootSlotIds,
    ).toEqual([rootSlotAV1]);
    expect(transientNotifications).toBe(1);
    expect(stateNotifications).toBe(2);
  });

  it("freezes the closed ready, preparing, and gap binding shapes", () => {
    expectTypeOf<ManagedSurfaceStableRuntimeBindingInternalV1["kind"]>().toEqualTypeOf<
      "ready_instance" | "preparing" | "gap"
    >();
    expectTypeOf<
      Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { kind: "ready_instance" }>["instance"]
    >().toEqualTypeOf<ManagedSurfaceStableReadyRuntimeInstanceInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { kind: "preparing" }>["transition"]
    >().toEqualTypeOf<"initial_open" | "primary_replacement" | "child_open">();
    expectTypeOf<
      Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { kind: "gap" }>["reason"]
    >().toEqualTypeOf<"readiness_failed" | "parent_unavailable">();

    const fixture = retainedReadySubtreeFixtureV1();
    const currentDesired = fixture.rootDesired;
    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const predecessor = fixture.root;
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: predecessor,
    });
    const ready = readyBindingV1(attemptV1(currentDesired, 1), "suspended");
    const initial = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: attemptV1(currentDesired, 2),
      transition: "initial_open",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: null,
    });
    const replacement = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: attemptV1(replacementDesired, 3),
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const failedReplacement = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const parentGap = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "parent_unavailable",
      placement: "child",
      slotCardinality: "stack",
      retainedSubtree: null,
    });

    expect(ready).toEqual({
      kind: "ready_instance",
      instance: {
        attempt: ready.instance.attempt,
        phase: "suspended",
      },
    });
    expect(initial).toMatchObject({
      kind: "preparing",
      transition: "initial_open",
      retainedSubtree: null,
    });
    expect(replacement).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
      retainedSubtree,
    });
    expect(failedReplacement).toEqual({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree,
    });
    expect(parentGap).toEqual({
      kind: "gap",
      reason: "parent_unavailable",
      retainedSubtree: null,
    });
    for (
      const value of [
        ready,
        ready.instance,
        initial,
        replacement,
        failedReplacement,
        parentGap,
      ]
    ) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(ready.instance.attempt).toBe(ready.instance.attempt);
    expect(replacement.retainedSubtree).toBe(retainedSubtree);
  });

  it("rejects every forbidden predecessor, transition, placement, and cardinality cross-product", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const desired = fixture.rootDesired;
    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });

    for (
      const invalid of [
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: attemptV1(desired, 2),
            transition: "initial_open",
            placement: "root",
            slotCardinality: "single",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: attemptV1(desired, 2),
            transition: "child_open",
            placement: "child",
            slotCardinality: "stack",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: attemptV1(replacementDesired, 2),
            transition: "primary_replacement",
            placement: "root",
            slotCardinality: "stack",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: attemptV1(replacementDesired, 2),
            transition: "primary_replacement",
            placement: "root",
            slotCardinality: "single",
            retainedSubtree: null,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "parent_unavailable",
            placement: "child",
            slotCardinality: "stack",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "parent_unavailable",
            placement: "root",
            slotCardinality: "single",
            retainedSubtree: null,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "readiness_failed",
            placement: "child",
            slotCardinality: "single",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "readiness_failed",
            placement: "root",
            slotCardinality: "stack",
            retainedSubtree,
          }),
      ]
    ) {
      expect(invalid).toThrow(TypeError);
    }
  });

  it("rejects unauthenticated attempts, target-gap splices, and authority-false cardinality", () => {
    const harness = harnessV1();
    const workspaceDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const unauthenticated = readyBindingV1(attemptV1(workspaceDesired, 1));
    expect(() =>
      reconcileV1(initial, [
        stableDesiredCandidateV1(workspaceDesired),
        stableRuntimeCandidateV1(workspaceDesired, unauthenticated),
      ])
    ).toThrow("ui.managed_surface_stable_runtime_attempt_invalid");

    const childGap = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "parent_unavailable",
      placement: "child",
      slotCardinality: "stack",
      retainedSubtree: null,
    });
    expect(() =>
      reconcileV1(initial, [
        stableDesiredCandidateV1(workspaceDesired),
        stableRuntimeCandidateV1(workspaceDesired, childGap),
      ])
    ).toThrow("ui.managed_surface_stable_runtime_binding_invalid");

    const fixture = retainedReadySubtreeFixtureV1();
    const narrativeSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.narrativeRoot,
    });
    const candidateAllocation = allocateAttemptV1(fixture.state, fixture.narrativeDesired);
    const falseSingleReplacement = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: candidateAllocation.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: narrativeSubtree,
    });
    expect(() =>
      reconcileV1(candidateAllocation.state, [
        stableDesiredCandidateV1(fixture.narrativeDesired),
        stableRuntimeCandidateV1(fixture.narrativeDesired, falseSingleReplacement),
      ])
    ).toThrow("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("requires exactly one closed runtime binding for every accepted desired target", () => {
    const harness = harnessV1();
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const gap = gapRuntimeCandidateV1(desired);

    expect(() => reconcileV1(initial, [stableDesiredCandidateV1(desired)])).toThrowError(
      "ui.managed_surface_stable_runtime_binding_invalid",
    );
    expect(() => reconcileV1(initial, [gap])).toThrowError(
      "ui.managed_surface_stable_runtime_binding_invalid",
    );
    expect(() => reconcileV1(initial, [stableDesiredCandidateV1(desired), gap, gap])).toThrowError(
      "ui.managed_surface_stable_reservation_contributor_duplicate",
    );

    const allocation = allocateAttemptV1(initial, desired);
    expect(() => reconcileV1(allocation.state, [stableDesiredCandidateV1(desired), gap]))
      .toThrowError("ui.managed_surface_stable_runtime_attempt_invalid");
    const malformedPhase = {
      kind: "ready_instance" as const,
      instance: Object.freeze({
        attempt: allocation.attempt,
        phase: "exiting",
      }),
    } as unknown as ManagedSurfaceStableRuntimeBindingInternalV1;
    expect(() =>
      reconcileV1(allocation.state, [
        stableDesiredCandidateV1(desired),
        stableRuntimeCandidateV1(desired, malformedPhase),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("never reuses a bound ready attempt as a preparing candidate", () => {
    const harness = harnessV1();
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const allocation = allocateAttemptV1(initial, desired);
    const ready = reconcileV1(allocation.state, [
      stableDesiredCandidateV1(desired),
      stableRuntimeCandidateV1(desired, readyBindingV1(allocation.attempt)),
    ]);
    const readyBinding = ready.stableRuntimeBindings[0]!.binding;
    expect(readyBinding.kind).toBe("ready_instance");
    if (readyBinding.kind !== "ready_instance") throw new Error("expected ready");
    const reusedCandidate = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: readyBinding.instance.attempt,
      transition: "initial_open",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: null,
    });

    expect(() =>
      reconcileV1(ready, [
        stableDesiredCandidateV1(desired),
        stableRuntimeCandidateV1(desired, reusedCandidate),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_attempt_invalid");
    expect(ready.stableRuntimeBindings[0]!.binding).toBe(readyBinding);
    expect(ready.transientState.identitySequenceHighWater).toBe(1);

    const preparingAllocation = allocateAttemptV1(initial, desired);
    const preparingInput = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: preparingAllocation.attempt,
      transition: "initial_open",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: null,
    });
    const preparing = reconcileV1(preparingAllocation.state, [
      stableDesiredCandidateV1(desired),
      stableRuntimeCandidateV1(desired, preparingInput),
    ]);
    const capturedPreparing = preparing.stableRuntimeBindings[0]!.binding;
    expect(capturedPreparing.kind).toBe("preparing");
    if (capturedPreparing.kind !== "preparing") throw new Error("expected preparing");
    const rebuiltPreparing = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: capturedPreparing.attempt,
      transition: capturedPreparing.transition,
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: capturedPreparing.retainedSubtree,
    });
    expect(
      reconcileV1(preparing, [
        stableDesiredCandidateV1(desired),
        stableRuntimeCandidateV1(desired, rebuiltPreparing),
      ]),
    ).toBe(preparing);
  });

  it("binds root and child attempts to exact ready-parent topology", () => {
    const harness = harnessV1();
    const rootDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const childDesired = desiredV1(
      harness,
      harness.workspaceChild,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const rootAllocation = allocateAttemptV1(
      initial,
      rootDesired,
      parseManagedSurfaceInstanceIdV1("surface-instance.e41.n99"),
    );
    expect(() =>
      reconcileV1(rootAllocation.state, [
        stableDesiredCandidateV1(rootDesired),
        stableRuntimeCandidateV1(rootDesired, readyBindingV1(rootAllocation.attempt)),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");

    const validRootAllocation = allocateAttemptV1(initial, rootDesired);
    const childWithoutParent = allocateAttemptV1(
      validRootAllocation.state,
      childDesired,
    );
    expect(() =>
      reconcileV1(childWithoutParent.state, [
        stableDesiredCandidateV1(rootDesired),
        stableRuntimeCandidateV1(rootDesired, readyBindingV1(validRootAllocation.attempt)),
        stableDesiredCandidateV1(childDesired),
        stableRuntimeCandidateV1(childDesired, readyBindingV1(childWithoutParent.attempt)),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");

    const childWithParent = allocateAttemptV1(
      validRootAllocation.state,
      childDesired,
      validRootAllocation.attempt.identity.surfaceInstanceId,
    );
    const suspendedParent = readyBindingV1(validRootAllocation.attempt, "suspended");
    expect(() =>
      reconcileV1(childWithParent.state, [
        stableDesiredCandidateV1(rootDesired),
        stableRuntimeCandidateV1(rootDesired, suspendedParent),
        stableDesiredCandidateV1(childDesired),
        stableRuntimeCandidateV1(childDesired, readyBindingV1(childWithParent.attempt, "active")),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
    expect(() =>
      reconcileV1(validRootAllocation.state, [
        stableDesiredCandidateV1(rootDesired),
        stableRuntimeCandidateV1(rootDesired, readyBindingV1(validRootAllocation.attempt)),
        stableDesiredCandidateV1(childDesired),
        gapRuntimeCandidateV1(childDesired),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("retains a child readiness-failed gap while its exact ready parent is suspended", () => {
    const harness = harnessV1();
    const rootDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const childDesired = desiredV1(
      harness,
      harness.workspaceChild,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const rootAllocation = allocateAttemptV1(initial, rootDesired);
    const childFailure = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "child",
      slotCardinality: "stack",
      retainedSubtree: null,
    });
    const active = reconcileV1(rootAllocation.state, [
      stableDesiredCandidateV1(rootDesired),
      stableRuntimeCandidateV1(rootDesired, readyBindingV1(rootAllocation.attempt)),
      stableDesiredCandidateV1(childDesired),
      stableRuntimeCandidateV1(childDesired, childFailure),
    ]);
    const rootBinding =
      active.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === rootDesired.admittedTarget
      )!.binding;
    expect(rootBinding.kind).toBe("ready_instance");
    if (rootBinding.kind !== "ready_instance") throw new Error("expected ready parent");

    const suspended = reconcileV1(active, [
      stableDesiredCandidateV1(rootDesired),
      stableRuntimeCandidateV1(
        rootDesired,
        readyBindingV1(rootBinding.instance.attempt, "suspended"),
      ),
      stableDesiredCandidateV1(childDesired),
      stableRuntimeCandidateV1(childDesired, childFailure),
    ]);
    const childBinding =
      suspended.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === childDesired.admittedTarget
      )!.binding;
    const activeChildBinding =
      active.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === childDesired.admittedTarget
      )!.binding;
    expect(childBinding).toMatchObject({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: null,
    });
    expect(childBinding).toBe(activeChildBinding);
    expect(suspended.transientState.identitySequenceHighWater).toBe(1);

    const parentOnlySuspended = reconcileV1(rootAllocation.state, [
      stableDesiredCandidateV1(rootDesired),
      stableRuntimeCandidateV1(
        rootDesired,
        readyBindingV1(rootAllocation.attempt, "suspended"),
      ),
    ]);
    expect(() =>
      reconcileV1(parentOnlySuspended, [
        stableDesiredCandidateV1(rootDesired),
        stableRuntimeCandidateV1(
          rootDesired,
          parentOnlySuspended.stableRuntimeBindings[0]!.binding,
        ),
        stableDesiredCandidateV1(childDesired),
        stableRuntimeCandidateV1(childDesired, childFailure),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("accepts only the exact current ready single-root predecessor", () => {
    const harness = harnessV1();
    const currentDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const replacementDesired = desiredV1(
      harness,
      harness.workspaceReplacement,
      harness.workspaceReplacementRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const currentAllocation = allocateAttemptV1(initial, currentDesired);
    const current = reconcileV1(currentAllocation.state, [
      stableDesiredCandidateV1(currentDesired),
      stableRuntimeCandidateV1(
        currentDesired,
        readyBindingV1(currentAllocation.attempt),
      ),
    ]);
    const currentBinding = current.stableRuntimeBindings[0]!.binding;
    expect(currentBinding.kind).toBe("ready_instance");
    if (currentBinding.kind !== "ready_instance") throw new Error("expected ready");
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: current,
      root: currentBinding.instance,
    });

    const replacementAllocation = allocateAttemptV1(current, replacementDesired);
    const replacement = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: replacementAllocation.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const successor = reconcileV1(replacementAllocation.state, [
      stableDesiredCandidateV1(replacementDesired),
      stableRuntimeCandidateV1(replacementDesired, replacement),
    ]);

    expect(successor.stableRuntimeBindings).toHaveLength(1);
    const successorBinding = successor.stableRuntimeBindings[0]!.binding;
    expect(successorBinding.kind).toBe("preparing");
    if (successorBinding.kind !== "preparing") throw new Error("expected preparing");
    expect(successorBinding.retainedSubtree).toBe(retainedSubtree);
    expect(successorBinding.retainedSubtree!.root.attempt).toBe(
      currentBinding.instance.attempt,
    );
    expect(successor.rootReservationContributors.map((row) => row.role)).toEqual([
      "desired",
      "retained_predecessor",
      "candidate",
    ]);

    const failedBinding = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: successorBinding.retainedSubtree,
    });
    const failed = reconcileV1(successor, [
      stableDesiredCandidateV1(replacementDesired),
      stableRuntimeCandidateV1(replacementDesired, failedBinding),
    ]);
    const capturedFailure = failed.stableRuntimeBindings[0]!.binding;
    expect(capturedFailure.kind).toBe("gap");
    if (capturedFailure.kind !== "gap") throw new Error("expected gap");
    expect(capturedFailure.retainedSubtree).toBe(retainedSubtree);
    expect(capturedFailure.retainedSubtree!.root.attempt).toBe(
      currentBinding.instance.attempt,
    );
  });

  it("accepts a gap predecessor only from a different exact current ready occurrence", () => {
    const harness = harnessV1();
    const currentDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const currentAllocation = allocateAttemptV1(initial, currentDesired);
    const current = reconcileV1(currentAllocation.state, [
      stableDesiredCandidateV1(currentDesired),
      stableRuntimeCandidateV1(currentDesired, readyBindingV1(currentAllocation.attempt)),
    ]);
    const currentBinding = current.stableRuntimeBindings[0]!.binding;
    expect(currentBinding.kind).toBe("ready_instance");
    if (currentBinding.kind !== "ready_instance") throw new Error("expected ready");
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: current,
      root: currentBinding.instance,
    });
    const sameOccurrenceGap = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    expect(() =>
      reconcileV1(current, [
        stableDesiredCandidateV1(currentDesired),
        stableRuntimeCandidateV1(currentDesired, sameOccurrenceGap),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");

    const preparingAllocation = allocateAttemptV1(initial, currentDesired);
    const preparingBinding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: preparingAllocation.attempt,
      transition: "initial_open",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: null,
    });
    const preparing = reconcileV1(preparingAllocation.state, [
      stableDesiredCandidateV1(currentDesired),
      stableRuntimeCandidateV1(currentDesired, preparingBinding),
    ]);
    const capturedPreparing = preparing.stableRuntimeBindings[0]!.binding;
    expect(capturedPreparing.kind).toBe("preparing");
    if (capturedPreparing.kind !== "preparing") throw new Error("expected preparing");
    const candidateMasqueradingAsReady = readyBindingV1(capturedPreparing.attempt).instance;
    expect(() =>
      createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
        currentState: preparing,
        root: candidateMasqueradingAsReady,
      })
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("rejects epoch, owner-domain, and unissued source provenance", () => {
    const harness = harnessV1();
    const wrongEpochState = createManagedSurfaceReducerStateV1(
      parseNonNegativeSafeInteger(42),
      [workspaceOwnerIdV1, narrativeOwnerIdV1],
      resolvedSlotDescriptorsV1,
    );
    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: harness.authority,
        publisherLeaseRegistry: harness.registry,
        transientState: wrongEpochState,
      })
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");

    const missingOwnerState = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: createManagedSurfaceReducerStateV1(
        applicationEpochV1,
        [narrativeOwnerIdV1],
        resolvedSlotDescriptorsV1,
      ),
    });
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    expect(() =>
      reconcileV1(missingOwnerState, [
        stableDesiredCandidateV1(desired),
        gapRuntimeCandidateV1(desired),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_target_invalid");

    const invalidSource = Object.freeze({
      ...desired,
      sourceRevision: parsePositiveSafeInteger(
        harness.workspaceReplacementRevision + 1,
      ) as ManagedSurfaceStableSourceRevisionInternalV1,
    });
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    expect(() =>
      reconcileV1(initial, [
        stableDesiredCandidateV1(invalidSource),
        gapRuntimeCandidateV1(invalidSource),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_target_invalid");
  });

  it("rejects a ready attempt whose source revision is newer than its current desired target", () => {
    const harness = harnessV1();
    const newerDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceReplacementRevision,
    );
    const olderDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const allocation = allocateAttemptV1(initial, newerDesired);
    const newer = reconcileV1(allocation.state, [
      stableDesiredCandidateV1(newerDesired),
      stableRuntimeCandidateV1(newerDesired, readyBindingV1(allocation.attempt)),
    ]);
    const readyBinding = newer.stableRuntimeBindings[0]!.binding;
    expect(readyBinding.kind).toBe("ready_instance");
    if (readyBinding.kind !== "ready_instance") throw new Error("expected ready");

    expect(() =>
      reconcileV1(newer, [
        stableDesiredCandidateV1(olderDesired),
        stableRuntimeCandidateV1(olderDesired, readyBinding),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("binds the composite factory to the admission authority's exact publisher registry", () => {
    const harness = harnessV1();
    const foreignRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: applicationEpochV1,
      resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
      leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
    });

    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: harness.authority,
        publisherLeaseRegistry: foreignRegistry,
        transientState: transientStateV1(),
      })
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");

    let foreignRegistryReads = 0;
    const foreignRegistryProxy = new Proxy(harness.registry, {
      get() {
        foreignRegistryReads += 1;
        throw new Error("foreign registry must stay opaque");
      },
    });
    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: harness.authority,
        publisherLeaseRegistry: foreignRegistryProxy,
        transientState: transientStateV1(),
      })
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");
    expect(foreignRegistryReads).toBe(0);

    const mismatchedSlotDescriptors = Object.freeze(
      resolvedSlotDescriptorsV1.map((descriptor) =>
        descriptor.kind === "root" && descriptor.slotId === rootSlotAV1
          ? Object.freeze({ ...descriptor, cardinality: "stack" as const })
          : descriptor
      ),
    ) satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[];
    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: harness.authority,
        publisherLeaseRegistry: harness.registry,
        transientState: createManagedSurfaceReducerStateV1(
          applicationEpochV1,
          [workspaceOwnerIdV1, narrativeOwnerIdV1],
          mismatchedSlotDescriptors,
        ),
      })
    ).toThrowError("ui.managed_surface_stable_composite_state_invalid");

    const reorderedSlotDescriptors = Object.freeze(
      resolvedSlotDescriptorsV1.toReversed().map((descriptor) => Object.freeze({ ...descriptor })),
    ) satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[];
    expect(() =>
      createManagedSurfaceStableCompositeStateInternalV1({
        admissionAuthority: harness.authority,
        publisherLeaseRegistry: harness.registry,
        transientState: createManagedSurfaceReducerStateV1(
          applicationEpochV1,
          [workspaceOwnerIdV1, narrativeOwnerIdV1],
          reorderedSlotDescriptors,
        ),
      })
    ).not.toThrow();

    const compositionReads = {
      admissionAuthority: 0,
      publisherLeaseRegistry: 0,
      transientState: 0,
    };
    const compositionInput = Object.defineProperties({}, {
      admissionAuthority: {
        enumerable: true,
        get() {
          compositionReads.admissionAuthority += 1;
          return harness.authority;
        },
      },
      publisherLeaseRegistry: {
        enumerable: true,
        get() {
          compositionReads.publisherLeaseRegistry += 1;
          return harness.registry;
        },
      },
      transientState: {
        enumerable: true,
        get() {
          compositionReads.transientState += 1;
          return transientStateV1();
        },
      },
    }) as Parameters<typeof createManagedSurfaceStableCompositeStateInternalV1>[0];
    expect(() => createManagedSurfaceStableCompositeStateInternalV1(compositionInput)).not
      .toThrow();
    expect(compositionReads).toEqual({
      admissionAuthority: 1,
      publisherLeaseRegistry: 1,
      transientState: 1,
    });
  });

  it("canonicalizes stable root contributors independently of child bindings and input order", () => {
    const harness = harnessV1();
    const workspaceDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const narrativeDesired = desiredV1(
      harness,
      harness.narrativeRoot,
      harness.narrativeRevision,
    );
    const childDesired = desiredV1(
      harness,
      harness.workspaceChild,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const workspaceAllocation = allocateAttemptV1(initial, workspaceDesired);
    const narrativeAllocation = allocateAttemptV1(
      workspaceAllocation.state,
      narrativeDesired,
    );
    const childAllocation = allocateAttemptV1(
      narrativeAllocation.state,
      childDesired,
      workspaceAllocation.attempt.identity.surfaceInstanceId,
    );
    const workspaceReady = readyBindingV1(workspaceAllocation.attempt, "active");
    const narrativeReady = readyBindingV1(narrativeAllocation.attempt, "suspended");
    const childReady = readyBindingV1(childAllocation.attempt);
    const next = reconcileV1(childAllocation.state, [
      stableRuntimeCandidateV1(narrativeDesired, narrativeReady),
      stableDesiredCandidateV1(childDesired),
      stableRuntimeCandidateV1(childDesired, childReady),
      stableDesiredCandidateV1(narrativeDesired),
      stableRuntimeCandidateV1(workspaceDesired, workspaceReady),
      stableDesiredCandidateV1(workspaceDesired),
    ]);

    expect(next.rootReservationContributors.map((row) => row.kind)).toEqual([
      "stable_desired",
      "stable_runtime",
      "stable_desired",
      "stable_runtime",
    ]);
    expect(next.rootReservationContributors.map((row) => row.slotId)).toEqual([
      rootSlotAV1,
      rootSlotAV1,
      rootSlotBV1,
      rootSlotBV1,
    ]);
    expect(
      next.rootReservationContributors.some((row) => row.slotId === childSlotV1),
    ).toBe(false);
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.rootReservationContributors)).toBe(true);
    for (const row of next.rootReservationContributors) expect(Object.isFrozen(row)).toBe(true);
  });

  it("preserves the exact token for semantic-equal, cursor-only, and child-only changes", () => {
    const harness = harnessV1();
    const workspaceDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const childDesired = desiredV1(
      harness,
      harness.workspaceChild,
      harness.workspaceRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const rootAllocation = allocateAttemptV1(initial, workspaceDesired);
    const rootReady = readyBindingV1(rootAllocation.attempt);
    const candidates = [
      stableDesiredCandidateV1(workspaceDesired),
      stableRuntimeCandidateV1(workspaceDesired, rootReady),
    ] as const;
    const accepted = reconcileV1(rootAllocation.state, candidates);
    const acceptedEntry = accepted.stableRuntimeBindings[0]!;
    expect(acceptedEntry.binding.kind).toBe("ready_instance");
    if (acceptedEntry.binding.kind !== "ready_instance") throw new Error("expected ready");
    const acceptedInstance = acceptedEntry.binding.instance;
    const acceptedAttempt = acceptedInstance.attempt;

    const rebuiltDesired = Object.freeze({
      ...workspaceDesired,
      sourceRevision: harness.workspaceReplacementRevision,
    }) satisfies ManagedSurfaceStableDesiredRuntimeTargetInternalV1;
    const cursorOnly = reconcileV1(accepted, [
      stableRuntimeCandidateV1(rebuiltDesired, rootReady),
      stableDesiredCandidateV1(rebuiltDesired),
    ]);
    expect(cursorOnly.rootReservationGenerationToken).toBe(
      accepted.rootReservationGenerationToken,
    );
    const cursorEntry = cursorOnly.stableRuntimeBindings[0]!;
    expect(cursorEntry.desiredTarget.sourceRevision).toBe(harness.workspaceReplacementRevision);
    expect(cursorEntry.binding).toBe(acceptedEntry.binding);
    expect(cursorEntry.binding.kind).toBe("ready_instance");
    if (cursorEntry.binding.kind !== "ready_instance") throw new Error("expected ready");
    expect(cursorEntry.binding.instance).toBe(acceptedInstance);
    expect(cursorEntry.binding.instance.attempt).toBe(acceptedAttempt);
    expect(cursorEntry.binding.instance.attempt.desiredTarget.sourceRevision).toBe(
      harness.workspaceRevision,
    );

    const childAllocation = allocateAttemptV1(
      cursorOnly,
      childDesired,
      rootAllocation.attempt.identity.surfaceInstanceId,
    );
    const childReady = readyBindingV1(childAllocation.attempt);
    const childOnly = reconcileV1(childAllocation.state, [
      stableDesiredCandidateV1(rebuiltDesired),
      stableRuntimeCandidateV1(rebuiltDesired, cursorEntry.binding),
      stableDesiredCandidateV1(childDesired),
      stableRuntimeCandidateV1(childDesired, childReady),
    ]);
    expect(childOnly.rootReservationGenerationToken).toBe(
      accepted.rootReservationGenerationToken,
    );
    expect(childOnly).not.toBe(cursorOnly);
    expect(childOnly.stableRuntimeBindings).toHaveLength(2);
    expect(
      childOnly.stableRuntimeBindings.some((entry) =>
        entry.desiredTarget.admittedTarget === childDesired.admittedTarget &&
        entry.binding.kind === "ready_instance"
      ),
    ).toBe(true);
  });

  it("rotates the token for every row change and never reuses it after slot-set ABA", () => {
    const harness = harnessV1();
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const desiredOnly = reconcileV1(initial, [
      stableDesiredCandidateV1(desired),
      gapRuntimeCandidateV1(desired),
    ]);
    const allocation = allocateAttemptV1(desiredOnly, desired);
    const readyAttempt = allocation.attempt;
    const ready = reconcileV1(allocation.state, [
      stableDesiredCandidateV1(desired),
      stableRuntimeCandidateV1(desired, readyBindingV1(readyAttempt, "active")),
    ]);
    const suspended = reconcileV1(ready, [
      stableDesiredCandidateV1(desired),
      stableRuntimeCandidateV1(
        desired,
        readyBindingV1(readyAttempt, "suspended"),
      ),
    ]);
    const desiredAgain = reconcileV1(suspended, [
      stableDesiredCandidateV1(desired),
      gapRuntimeCandidateV1(desired),
    ]);

    expect(desiredOnly.rootReservationGenerationToken).not.toBe(
      initial.rootReservationGenerationToken,
    );
    expect(ready.rootReservationGenerationToken).not.toBe(
      desiredOnly.rootReservationGenerationToken,
    );
    expect(suspended.rootReservationGenerationToken).not.toBe(
      ready.rootReservationGenerationToken,
    );
    expect(desiredAgain.rootReservationGenerationToken).not.toBe(
      suspended.rootReservationGenerationToken,
    );
    expect(desiredAgain.rootReservationGenerationToken).not.toBe(
      desiredOnly.rootReservationGenerationToken,
    );
    expect(
      new Set([
        initial.rootReservationGenerationToken,
        desiredOnly.rootReservationGenerationToken,
        ready.rootReservationGenerationToken,
        suspended.rootReservationGenerationToken,
        desiredAgain.rootReservationGenerationToken,
      ]).size,
    ).toBe(5);
  });

  it("detaches stable contributor inputs before later transient transitions", () => {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "registered",
    );
    admitAndApplyStableTargetV1({
      harness,
      kernel,
      publisher: harness.workspace,
      target: harness.workspaceRoot,
      sourceRevision: harness.workspaceRevision,
    });
    const currentEntry = kernel.getStateInternalV1().stableRuntimeBindings[0];
    if (currentEntry === undefined) throw new Error("expected stable runtime entry");
    const desired = { ...currentEntry.desiredTarget };
    const candidate = {
      kind: "stable_desired" as const,
      desiredTarget: desired,
    };
    kernel.transitionStateInternalV1((current) => ({
      state: reconcileV1(current, [
        candidate,
        gapRuntimeCandidateV1(desired),
      ]),
      result: undefined,
    }));
    const stableRows = kernel.getStateInternalV1().rootReservationContributors;

    desired.publisherLease = harness.narrative.lease;
    desired.admittedTarget = harness.narrativeRoot;
    candidate.desiredTarget = desiredV1(
      harness,
      harness.narrativeRoot,
      harness.narrativeRevision,
    );

    const opened = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 2,
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(opened.receipt.kind).toBe("applied");
    expect(kernel.getStateInternalV1().rootReservationContributors.slice(0, 1)).toEqual(stableRows);
  });

  it("excludes only the exact subject stable lease and keeps transient rows from the same owner", () => {
    const harness = harnessV1();
    const workspaceDesired = desiredV1(
      harness,
      harness.workspaceRoot,
      harness.workspaceRevision,
    );
    const narrativeDesired = desiredV1(
      harness,
      harness.narrativeRoot,
      harness.narrativeRevision,
    );
    const initial = createManagedSurfaceStableCompositeStateInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      transientState: transientStateV1(),
    });
    const workspaceAllocation = allocateAttemptV1(initial, workspaceDesired);
    const narrativeAllocation = allocateAttemptV1(
      workspaceAllocation.state,
      narrativeDesired,
    );
    const state = reconcileV1(narrativeAllocation.state, [
      stableDesiredCandidateV1(workspaceDesired),
      stableRuntimeCandidateV1(
        workspaceDesired,
        readyBindingV1(workspaceAllocation.attempt),
      ),
      stableDesiredCandidateV1(narrativeDesired),
      stableRuntimeCandidateV1(
        narrativeDesired,
        readyBindingV1(narrativeAllocation.attempt),
      ),
    ]);

    const workspaceSnapshot = projectManagedSurfaceStableRootReservationSnapshotInternalV1({
      state,
      subjectPublisherLease: harness.workspace.lease,
    });
    const narrativeSnapshot = projectManagedSurfaceStableRootReservationSnapshotInternalV1({
      state,
      subjectPublisherLease: harness.narrative.lease,
    });

    expect(workspaceSnapshot).toEqual({
      subjectPublisherLease: harness.workspace.lease,
      generationToken: state.rootReservationGenerationToken,
      reservedRootSlotIds: [rootSlotBV1],
    });
    expect(narrativeSnapshot).toEqual({
      subjectPublisherLease: harness.narrative.lease,
      generationToken: state.rootReservationGenerationToken,
      reservedRootSlotIds: [rootSlotAV1],
    });
    expect(workspaceSnapshot.generationToken).toBe(narrativeSnapshot.generationToken);
    expect(Object.isFrozen(workspaceSnapshot)).toBe(true);
    expect(Object.isFrozen(workspaceSnapshot.reservedRootSlotIds)).toBe(true);

    const evaluatedWithProjectedSnapshot = harness.authority.evaluate({
      publication: {
        publisherLease: harness.workspace.lease,
        sourceRevision: harness.workspaceReplacementRevision,
        targets: [{
          occurrenceId: harness.workspaceReplacement.occurrenceId,
          definitionId: harness.workspaceReplacement.definitionId,
          parentOccurrenceId: null,
          parameters: null,
        }],
      },
      acceptedBaseline: harness.workspaceReplacementBaseline,
      reservationSnapshot: workspaceSnapshot,
    });
    expect(evaluatedWithProjectedSnapshot).toMatchObject({
      kind: "unchanged",
      code: "surface.stable_publication_unchanged",
    });
    expect(
      harness.authority.evaluate({
        publication: {
          publisherLease: harness.workspace.lease,
          sourceRevision: harness.workspaceReplacementRevision,
          targets: [{
            occurrenceId: harness.workspaceReplacement.occurrenceId,
            definitionId: harness.workspaceReplacement.definitionId,
            parentOccurrenceId: null,
            parameters: null,
          }],
        },
        acceptedBaseline: harness.workspaceReplacementBaseline,
        reservationSnapshot: { ...workspaceSnapshot },
      }),
    ).toMatchObject({ kind: "faulted", code: "surface.stable_admission_faulted" });

    expect(
      harness.authority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: state.rootReservationGenerationToken,
        foreignReservedRootSlotIds: [rootSlotBV1, rootSlotBV1],
      }),
    ).toEqual(workspaceSnapshot);

    const foreignAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
      publisherLeaseRegistry: harness.registry,
      definitionSidecars: [],
      resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
    });
    expect(() =>
      foreignAuthority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: state.rootReservationGenerationToken,
        foreignReservedRootSlotIds: [],
      })
    ).toThrow(TypeError);
  });

  it("derives one authenticated frozen retained subtree in current topology preorder", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1>>()
      .toEqualTypeOf<"root" | "descendants">();
    expectTypeOf<
      ExactKeysV1<Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { kind: "preparing" }>>
    >().toEqualTypeOf<"kind" | "attempt" | "transition" | "retainedSubtree">();
    expectTypeOf<
      ExactKeysV1<Extract<ManagedSurfaceStableRuntimeBindingInternalV1, { kind: "gap" }>>
    >().toEqualTypeOf<"kind" | "reason" | "retainedSubtree">();

    const fixture = retainedReadySubtreeFixtureV1();
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });

    expect(retainedSubtree).toEqual({
      root: fixture.root,
      descendants: [fixture.child, fixture.grandchild],
    });
    expect(retainedSubtree.root).toBe(fixture.root);
    expect(retainedSubtree.descendants[0]).toBe(fixture.child);
    expect(retainedSubtree.descendants[1]).toBe(fixture.grandchild);
    expect(retainedSubtree.root.phase).toBe("active");
    expect(retainedSubtree.descendants.map((instance) => instance.phase)).toEqual([
      "active",
      "suspended",
    ]);
    expect(Object.isFrozen(retainedSubtree)).toBe(true);
    expect(Object.isFrozen(retainedSubtree.descendants)).toBe(true);
  });

  it("rejects pending, gap, cloned, reparented, duplicate, and cross-lease subtree splices", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });
    const pendingAllocation = allocateAttemptV1(fixture.state, fixture.rootDesired);
    const pendingMasqueradingAsReady = readyBindingV1(pendingAllocation.attempt).instance;
    expect(() =>
      createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
        currentState: pendingAllocation.state,
        root: pendingMasqueradingAsReady,
      })
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");

    const gap = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: null,
    });
    const clone = Object.freeze({ ...fixture.root });
    for (const root of [gap, clone]) {
      expect(() =>
        createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
          currentState: fixture.state,
          root: root as unknown as ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
        })
      ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
    }

    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const replacementAllocation = allocateAttemptV1(fixture.state, replacementDesired);
    const reparentedChild = readyBindingV1(
      attemptV1(
        fixture.childDesired,
        90,
        fixture.narrativeRoot.attempt.identity.surfaceInstanceId,
      ),
    ).instance;
    const authenticForeignSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.narrativeRoot,
    });
    const forgedSubtrees = [
      Object.freeze({
        root: retainedSubtree.root,
        descendants: Object.freeze([...retainedSubtree.descendants]),
      }),
      Object.freeze({
        root: retainedSubtree.root,
        descendants: Object.freeze([fixture.child, fixture.child]),
      }),
      Object.freeze({
        root: retainedSubtree.root,
        descendants: Object.freeze([reparentedChild]),
      }),
      Object.freeze({
        root: retainedSubtree.root,
        descendants: Object.freeze([pendingMasqueradingAsReady]),
      }),
      Object.freeze({
        root: retainedSubtree.root,
        descendants: Object.freeze([
          gap as unknown as ManagedSurfaceStableReadyRuntimeInstanceInternalV1,
        ]),
      }),
    ] as const;
    for (const forged of forgedSubtrees) {
      expect(() =>
        createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
          attempt: replacementAllocation.attempt,
          transition: "primary_replacement",
          placement: "root",
          slotCardinality: "single",
          retainedSubtree: forged as ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1,
        })
      ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
    }
    expect(() =>
      createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
        attempt: replacementAllocation.attempt,
        transition: "primary_replacement",
        placement: "root",
        slotCardinality: "single",
        retainedSubtree: authenticForeignSubtree,
      })
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
  });

  it("retains one exact root subtree while only the root contributes a reservation row", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });
    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const allocation = allocateAttemptV1(fixture.state, replacementDesired);
    const replacementBinding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: allocation.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const narrativeBinding =
      fixture.state.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.narrativeRoot
      )!.binding;
    const successor = reconcileV1(allocation.state, [
      stableDesiredCandidateV1(replacementDesired),
      stableRuntimeCandidateV1(replacementDesired, replacementBinding),
      stableDesiredCandidateV1(fixture.narrativeDesired),
      stableRuntimeCandidateV1(fixture.narrativeDesired, narrativeBinding),
    ]);

    const captured =
      successor.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.replacement
      )!.binding;
    expect(captured.kind).toBe("preparing");
    if (captured.kind !== "preparing") throw new Error("expected replacement preparing");
    expect(captured.retainedSubtree).toBe(retainedSubtree);
    expect(captured.retainedSubtree!.root).toBe(fixture.root);
    expect(captured.retainedSubtree!.descendants).toBe(retainedSubtree.descendants);
    expect(
      successor.stableRuntimeBindings.map((entry) =>
        entry.desiredTarget.admittedTarget.occurrenceId
      ),
    ).toEqual([
      fixture.harness.replacement.occurrenceId,
      fixture.harness.narrativeRoot.occurrenceId,
    ]);

    const workspaceRuntimeRows = successor.rootReservationContributors.filter(
      (row): row is Extract<
        ManagedSurfaceStableRootReservationContributorInternalV1,
        { readonly kind: "stable_runtime" }
      > => row.kind === "stable_runtime" && row.publisherLease === fixture.harness.workspace.lease,
    );
    expect(workspaceRuntimeRows.map((row) => [row.role, row.occurrenceId])).toEqual([
      ["retained_predecessor", fixture.harness.root.occurrenceId],
      ["candidate", fixture.harness.replacement.occurrenceId],
    ]);
    expect(
      workspaceRuntimeRows.some((row) =>
        row.occurrenceId === fixture.harness.child.occurrenceId ||
        row.occurrenceId === fixture.harness.grandchild.occurrenceId
      ),
    ).toBe(false);
  });

  it("preserves the exact retained subtree through a second replacement and terminal failure", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const initialHighWater = fixture.state.transientState.identitySequenceHighWater;
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });
    const firstDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const firstAllocation = allocateAttemptV1(fixture.state, firstDesired);
    const narrativeBinding =
      fixture.state.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.narrativeRoot
      )!.binding;
    const first = reconcileV1(firstAllocation.state, [
      stableDesiredCandidateV1(firstDesired),
      stableRuntimeCandidateV1(
        firstDesired,
        createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
          attempt: firstAllocation.attempt,
          transition: "primary_replacement",
          placement: "root",
          slotCardinality: "single",
          retainedSubtree,
        }),
      ),
      stableDesiredCandidateV1(fixture.narrativeDesired),
      stableRuntimeCandidateV1(fixture.narrativeDesired, narrativeBinding),
    ]);
    expect(first.transientState.identitySequenceHighWater).toBe(initialHighWater + 1);
    const firstBinding =
      first.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.replacement
      )!.binding;
    expect(firstBinding.kind).toBe("preparing");
    if (firstBinding.kind !== "preparing") throw new Error("expected first preparing");

    const secondDesired = desiredV1(
      fixture.harness,
      fixture.harness.secondReplacement,
      fixture.harness.secondReplacementRevision,
    );
    const secondAllocation = allocateAttemptV1(first, secondDesired);
    const second = reconcileV1(secondAllocation.state, [
      stableDesiredCandidateV1(secondDesired),
      stableRuntimeCandidateV1(
        secondDesired,
        createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
          attempt: secondAllocation.attempt,
          transition: "primary_replacement",
          placement: "root",
          slotCardinality: "single",
          retainedSubtree,
        }),
      ),
      stableDesiredCandidateV1(fixture.narrativeDesired),
      stableRuntimeCandidateV1(fixture.narrativeDesired, narrativeBinding),
    ]);
    const secondBinding =
      second.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.secondReplacement
      )!.binding;
    expect(secondBinding.kind).toBe("preparing");
    if (secondBinding.kind !== "preparing") throw new Error("expected second preparing");
    expect(secondBinding.retainedSubtree).toBe(retainedSubtree);
    expect(second.transientState.identitySequenceHighWater).toBe(initialHighWater + 2);
    expect(() =>
      reconcileV1(second, [
        stableDesiredCandidateV1(
          first.stableRuntimeBindings.find((entry) =>
            entry.desiredTarget.admittedTarget === fixture.harness.replacement
          )!.desiredTarget,
        ),
        stableRuntimeCandidateV1(
          first.stableRuntimeBindings.find((entry) =>
            entry.desiredTarget.admittedTarget === fixture.harness.replacement
          )!.desiredTarget,
          firstBinding,
        ),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_attempt_invalid");

    const failed = reconcileV1(second, [
      stableDesiredCandidateV1(secondDesired),
      stableRuntimeCandidateV1(
        secondDesired,
        createManagedSurfaceStableGapRuntimeBindingInternalV1({
          reason: "readiness_failed",
          placement: "root",
          slotCardinality: "single",
          retainedSubtree,
        }),
      ),
      stableDesiredCandidateV1(fixture.narrativeDesired),
      stableRuntimeCandidateV1(fixture.narrativeDesired, narrativeBinding),
    ]);
    const failureBinding =
      failed.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.secondReplacement
      )!.binding;
    expect(failureBinding.kind).toBe("gap");
    if (failureBinding.kind !== "gap") throw new Error("expected replacement failure gap");
    expect(failureBinding.retainedSubtree).toBe(retainedSubtree);
    expect(failureBinding.retainedSubtree!.descendants).toBe(retainedSubtree.descendants);
    expect(failed.transientState.identitySequenceHighWater).toBe(initialHighWater + 2);
    expect(() =>
      reconcileV1(failed, [
        stableDesiredCandidateV1(
          second.stableRuntimeBindings.find((entry) =>
            entry.desiredTarget.admittedTarget === fixture.harness.secondReplacement
          )!.desiredTarget,
        ),
        stableRuntimeCandidateV1(
          second.stableRuntimeBindings.find((entry) =>
            entry.desiredTarget.admittedTarget === fixture.harness.secondReplacement
          )!.desiredTarget,
          secondBinding,
        ),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_attempt_invalid");
  });

  it("reuses an exact retained subtree on semantic no-op and cannot revive it after cutover", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });
    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const replacementAllocation = allocateAttemptV1(fixture.state, replacementDesired);
    const alternateSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: replacementAllocation.state,
      root: fixture.root,
    });
    expect(alternateSubtree).not.toBe(retainedSubtree);
    const preparing = reconcileV1(replacementAllocation.state, [
      stableDesiredCandidateV1(replacementDesired),
      stableRuntimeCandidateV1(
        replacementDesired,
        createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
          attempt: replacementAllocation.attempt,
          transition: "primary_replacement",
          placement: "root",
          slotCardinality: "single",
          retainedSubtree,
        }),
      ),
    ]);
    const preparingBinding = preparing.stableRuntimeBindings[0]!.binding;
    expect(preparingBinding.kind).toBe("preparing");
    if (preparingBinding.kind !== "preparing") throw new Error("expected preparing");
    expect(preparingBinding.retainedSubtree).toBe(retainedSubtree);

    const rebuiltPreparing = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: preparingBinding.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: alternateSubtree,
    });
    const same = reconcileV1(preparing, [
      stableDesiredCandidateV1(preparing.stableRuntimeBindings[0]!.desiredTarget),
      stableRuntimeCandidateV1(
        preparing.stableRuntimeBindings[0]!.desiredTarget,
        rebuiltPreparing,
      ),
    ]);
    expect(same).toBe(preparing);
    expect(same.stableRuntimeBindings[0]!.binding).toBe(preparingBinding);

    const failedBinding = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const failed = reconcileV1(preparing, [
      stableDesiredCandidateV1(preparing.stableRuntimeBindings[0]!.desiredTarget),
      stableRuntimeCandidateV1(
        preparing.stableRuntimeBindings[0]!.desiredTarget,
        failedBinding,
      ),
    ]);
    const rebuiltFailure = createManagedSurfaceStableGapRuntimeBindingInternalV1({
      reason: "readiness_failed",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree: alternateSubtree,
    });
    const sameFailure = reconcileV1(failed, [
      stableDesiredCandidateV1(failed.stableRuntimeBindings[0]!.desiredTarget),
      stableRuntimeCandidateV1(
        failed.stableRuntimeBindings[0]!.desiredTarget,
        rebuiltFailure,
      ),
    ]);
    expect(sameFailure).toBe(failed);
    expect(sameFailure.stableRuntimeBindings[0]!.binding).toBe(
      failed.stableRuntimeBindings[0]!.binding,
    );

    const ready = reconcileV1(preparing, [
      stableDesiredCandidateV1(preparing.stableRuntimeBindings[0]!.desiredTarget),
      stableRuntimeCandidateV1(
        preparing.stableRuntimeBindings[0]!.desiredTarget,
        readyBindingV1(preparingBinding.attempt),
      ),
    ]);
    expect(ready.stableRuntimeBindings[0]!.binding.kind).toBe("ready_instance");
    expect(ready.transientState.identitySequenceHighWater).toBe(
      preparing.transientState.identitySequenceHighWater,
    );
    const readyToken = ready.rootReservationGenerationToken;

    const secondDesired = desiredV1(
      fixture.harness,
      fixture.harness.secondReplacement,
      fixture.harness.secondReplacementRevision,
    );
    const secondAllocation = allocateAttemptV1(ready, secondDesired);
    const staleSubtreeBinding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: secondAllocation.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    expect(() =>
      reconcileV1(secondAllocation.state, [
        stableDesiredCandidateV1(secondDesired),
        stableRuntimeCandidateV1(secondDesired, staleSubtreeBinding),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
    expect(ready.rootReservationGenerationToken).toBe(readyToken);
    expect(ready.transientState.identitySequenceHighWater).toBe(
      preparing.transientState.identitySequenceHighWater,
    );
  });

  it("rejects retained descendants duplicated as accepted runtime entries and forbidden cross-products", () => {
    const fixture = retainedReadySubtreeFixtureV1();
    const retainedSubtree = createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1({
      currentState: fixture.state,
      root: fixture.root,
    });
    const replacementDesired = desiredV1(
      fixture.harness,
      fixture.harness.replacement,
      fixture.harness.replacementRevision,
    );
    const allocation = allocateAttemptV1(fixture.state, replacementDesired);
    const replacementBinding = createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
      attempt: allocation.attempt,
      transition: "primary_replacement",
      placement: "root",
      slotCardinality: "single",
      retainedSubtree,
    });
    const childBinding =
      fixture.state.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.child
      )!.binding;
    const grandchildBinding =
      fixture.state.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.harness.grandchild
      )!.binding;
    expect(() =>
      reconcileV1(allocation.state, [
        stableDesiredCandidateV1(replacementDesired),
        stableRuntimeCandidateV1(replacementDesired, replacementBinding),
        stableDesiredCandidateV1(fixture.childDesired),
        stableRuntimeCandidateV1(fixture.childDesired, childBinding),
        stableDesiredCandidateV1(fixture.grandchildDesired),
        stableRuntimeCandidateV1(fixture.grandchildDesired, grandchildBinding),
      ])
    ).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");

    for (
      const invalid of [
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: allocation.attempt,
            transition: "initial_open",
            placement: "root",
            slotCardinality: "single",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStablePreparingRuntimeBindingInternalV1({
            attempt: allocation.attempt,
            transition: "primary_replacement",
            placement: "root",
            slotCardinality: "stack",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "parent_unavailable",
            placement: "child",
            slotCardinality: "stack",
            retainedSubtree,
          }),
        () =>
          createManagedSurfaceStableGapRuntimeBindingInternalV1({
            reason: "readiness_failed",
            placement: "child",
            slotCardinality: "stack",
            retainedSubtree,
          }),
      ]
    ) {
      expect(invalid).toThrowError("ui.managed_surface_stable_runtime_binding_invalid");
    }
  });

  it("keeps normalized contributor rows and tokens opaque to callers", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableRuntimeEntryInternalV1>>()
      .toEqualTypeOf<"desiredTarget" | "binding">();
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableRootReservationContributorInternalV1>>()
      .toEqualTypeOf<
        | "kind"
        | "slotId"
        | "publisherLease"
        | "publisherLeaseSequence"
        | "occurrenceId"
        | "occurrenceSequence"
        | "surfaceInstanceId"
        | "runtimeSequence"
        | "role"
        | "phase"
      >();
    expectTypeOf<
      ManagedSurfaceStableCompositeStateInternalV1["rootReservationGenerationToken"]
    >().toEqualTypeOf<
      ReturnType<
        ManagedSurfaceStableAdmissionAuthorityInternalV1["createReservationGenerationToken"]
      >
    >();
  });
});

describe("dormant managed stable action-route authority", () => {
  it("captures and routes only the exact direct active stable input target", () => {
    const fixture = stableActionFixtureV1();
    const authority = fixture.authority;
    expect(claimManagedSurfaceStableActionRouteAuthorityInternalV1(fixture.kernel)).toBe(
      authority,
    );
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Reflect.ownKeys(authority)).toEqual([
      "captureCurrentStableInputInternalV1",
      "captureReadyActiveStableTargetInternalV1",
      "routeActionInternalV1",
      "isCurrentDirectTargetInternalV1",
      "isCurrentReadyActiveStableTargetInternalV1",
    ]);
    expect(authority.captureCurrentStableInputInternalV1()).toEqual({ kind: "unavailable" });

    const installedTarget = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    expect(authority.captureCurrentStableInputInternalV1()).toEqual({ kind: "unavailable" });
    settleCurrentStablePreparationReadyV1(
      fixture.kernel,
      installedTarget,
    );

    const captured = authority.captureCurrentStableInputInternalV1();
    expect(captured.kind).toBe("captured");
    if (captured.kind !== "captured") throw new Error("expected captured stable input");
    expect(Reflect.ownKeys(captured)).toEqual([
      "kind",
      "contract",
      "directTarget",
      "sourceRevision",
      "targetProof",
    ]);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(captured.directTarget).toBe(installedTarget);
    expect(captured.sourceRevision).toBe(fixture.harness.workspaceRevision);
    expect(captured.targetProof).not.toBeNull();
    expect(captured.contract).toMatchObject({
      applicationEpoch: applicationEpochV1,
      ownerId: workspaceOwnerIdV1,
      inputContextId: "narrative",
      actionIds: [narrativeAdvanceActionIdV1],
    });
    expect(Object.isFrozen(captured.contract)).toBe(true);
    expect(Object.isFrozen(captured.contract.actionIds)).toBe(true);
    expect(authority.isCurrentDirectTargetInternalV1(captured.targetProof)).toBe(true);

    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    const receipt = authority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: captured.contract.applicationEpoch,
        topologyRevision: captured.contract.topologyRevision,
        surfaceInstanceId: captured.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: captured.contract.routingLeaseId,
    }));
    expect(receipt).toEqual({
      kind: "unchanged",
      code: "surface.action_routed",
      beforeTopologyRevision: captured.contract.topologyRevision,
      afterTopologyRevision: captured.contract.topologyRevision,
      surfaceInstanceId: captured.contract.surfaceInstanceId,
    });
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
  });

  it("captures an exact direct ready-active target independently of the input owner", () => {
    const fixture = stableActionFixtureV1();
    const installedTarget = publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    expectTypeOf<
      typeof fixture.authority.captureReadyActiveStableTargetInternalV1
    >().returns.toEqualTypeOf<ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1>();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1,
          { readonly kind: "captured" }
        >
      >
    >().toEqualTypeOf<"kind" | "directTarget" | "sourceRevision" | "proof">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1,
          { readonly kind: "unavailable" }
        >
      >
    >().toEqualTypeOf<"kind">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1,
          { readonly kind: "faulted" }
        >
      >
    >().toEqualTypeOf<"kind" | "code">();

    const initial = fixture.authority.captureReadyActiveStableTargetInternalV1(installedTarget);
    expect(initial.kind).toBe("captured");
    if (initial.kind !== "captured") throw new Error("expected ready-active proof");
    expect(Reflect.ownKeys(initial)).toEqual([
      "kind",
      "directTarget",
      "sourceRevision",
      "proof",
    ]);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial.directTarget).toBe(installedTarget);
    expect(initial.sourceRevision).toBe(fixture.harness.workspaceRevision);
    expectTypeOf(initial.proof).toEqualTypeOf<
      ManagedSurfaceStableReadyActiveTargetProofInternalV1
    >();
    expect(Reflect.ownKeys(initial.proof)).toEqual([]);
    expect(Object.isFrozen(initial.proof)).toBe(true);
    expect(
      fixture.authority.isCurrentReadyActiveStableTargetInternalV1(initial.proof),
    ).toBe(true);

    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(fixture.kernel);
    const higherInput = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 30,
        modality: "non_blocking",
        managedInput: true,
        actionIds: [narrativeAdvanceActionIdV1],
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(higherInput.receipt.kind).toBe("applied");
    expect(higherInput.readiness?.ready().receipt.kind).toBe("applied");
    expect(fixture.authority.captureCurrentStableInputInternalV1()).toEqual({
      kind: "unavailable",
    });
    expect(
      fixture.authority.isCurrentReadyActiveStableTargetInternalV1(initial.proof),
    ).toBe(false);

    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    coordinator.subscribe(transientListener);
    const fresh = fixture.authority.captureReadyActiveStableTargetInternalV1(installedTarget);
    expect(fresh.kind).toBe("captured");
    if (fresh.kind !== "captured") throw new Error("expected fresh ready-active proof");
    expect(fresh.directTarget).toBe(installedTarget);
    expect(fresh.sourceRevision).toBe(fixture.harness.workspaceRevision);
    expect(
      fixture.authority.isCurrentReadyActiveStableTargetInternalV1(fresh.proof),
    ).toBe(true);
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("rejects preparing, gap, retained, and suspended targets", () => {
    const preparingFixture = stableActionFixtureV1();
    const preparing = admitAndApplyStableTargetV1({
      harness: preparingFixture.harness,
      kernel: preparingFixture.kernel,
      publisher: preparingFixture.harness.workspace,
      target: preparingFixture.harness.workspaceRoot,
      sourceRevision: preparingFixture.harness.workspaceRevision,
    });
    expect(
      preparingFixture.authority.captureReadyActiveStableTargetInternalV1(preparing),
    ).toEqual({ kind: "unavailable" });
    settleCurrentStablePreparationFailedV1(preparingFixture.kernel, preparing);
    expect(
      preparingFixture.authority.captureReadyActiveStableTargetInternalV1(preparing),
    ).toEqual({ kind: "unavailable" });

    const retainedFixture = stableActionFixtureV1();
    const retained = publishReadyStableTargetV1({
      fixture: retainedFixture,
      publisher: retainedFixture.harness.workspace,
      target: retainedFixture.harness.workspaceRoot,
      sourceRevision: retainedFixture.harness.workspaceRevision,
    });
    const retainedProof = retainedFixture.authority
      .captureReadyActiveStableTargetInternalV1(retained);
    if (retainedProof.kind !== "captured") throw new Error("expected retained predecessor proof");
    const replacement = admitAndApplyStableTargetV1({
      harness: retainedFixture.harness,
      kernel: retainedFixture.kernel,
      publisher: retainedFixture.harness.workspace,
      target: retainedFixture.harness.workspaceReplacement,
      sourceRevision: retainedFixture.harness.workspaceReplacementRevision,
    });
    expect(
      retainedFixture.authority.isCurrentReadyActiveStableTargetInternalV1(
        retainedProof.proof,
      ),
    ).toBe(false);
    expect(
      retainedFixture.authority.captureReadyActiveStableTargetInternalV1(retained),
    ).toEqual({ kind: "unavailable" });
    expect(
      retainedFixture.authority.captureReadyActiveStableTargetInternalV1(replacement),
    ).toEqual({ kind: "unavailable" });

    const suspendedFixture = stableActionFixtureV1();
    const suspended = publishReadyStableTargetV1({
      fixture: suspendedFixture,
      publisher: suspendedFixture.harness.workspace,
      target: suspendedFixture.harness.workspaceRoot,
      sourceRevision: suspendedFixture.harness.workspaceRevision,
    });
    const suspendedProof = suspendedFixture.authority
      .captureReadyActiveStableTargetInternalV1(suspended);
    if (suspendedProof.kind !== "captured") throw new Error("expected active target proof");
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(
      suspendedFixture.kernel,
    );
    const blocker = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 30,
        modality: "blocking",
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(blocker.receipt.kind).toBe("applied");
    expect(blocker.readiness?.ready().receipt.kind).toBe("applied");
    expect(
      suspendedFixture.authority.captureReadyActiveStableTargetInternalV1(suspended),
    ).toEqual({ kind: "unavailable" });
    expect(
      suspendedFixture.authority.isCurrentReadyActiveStableTargetInternalV1(
        suspendedProof.proof,
      ),
    ).toBe(false);
  });

  it("invalidates ready-active proofs across source, topology, empty, disposal, and epoch fences", () => {
    const sourceFixture = stableActionFixtureV1();
    const sourceTarget = publishReadyStableTargetV1({
      fixture: sourceFixture,
      publisher: sourceFixture.harness.workspace,
      target: sourceFixture.harness.workspaceRoot,
      sourceRevision: sourceFixture.harness.workspaceRevision,
    });
    const initial = sourceFixture.authority.captureReadyActiveStableTargetInternalV1(sourceTarget);
    if (initial.kind !== "captured") throw new Error("expected initial ready-active proof");
    const nextSourceRevision = sourceFixture.harness.workspace.issueSourceRevision();
    const sourceAdvancedTarget = admitAndApplyStableTargetV1({
      harness: sourceFixture.harness,
      kernel: sourceFixture.kernel,
      publisher: sourceFixture.harness.workspace,
      target: sourceTarget,
      sourceRevision: nextSourceRevision,
    });
    expect(
      sourceFixture.authority.isCurrentReadyActiveStableTargetInternalV1(initial.proof),
    ).toBe(false);
    const sourceAdvanced = sourceFixture.authority
      .captureReadyActiveStableTargetInternalV1(sourceAdvancedTarget);
    expect(sourceAdvanced.kind).toBe("captured");
    if (sourceAdvanced.kind !== "captured") throw new Error("expected source-advanced proof");
    expect(sourceAdvanced.sourceRevision).toBe(nextSourceRevision);
    expect(sourceAdvanced.directTarget).toBe(sourceAdvancedTarget);

    admitAndApplyStableTargetV1({
      harness: sourceFixture.harness,
      kernel: sourceFixture.kernel,
      publisher: sourceFixture.harness.workspace,
      target: sourceFixture.harness.workspaceReplacement,
      sourceRevision: sourceFixture.harness.workspace.issueSourceRevision(),
    });
    expect(
      sourceFixture.authority.isCurrentReadyActiveStableTargetInternalV1(
        sourceAdvanced.proof,
      ),
    ).toBe(false);

    const emptyFixture = stableActionFixtureV1();
    const emptyTarget = publishReadyStableTargetV1({
      fixture: emptyFixture,
      publisher: emptyFixture.harness.workspace,
      target: emptyFixture.harness.workspaceRoot,
      sourceRevision: emptyFixture.harness.workspaceRevision,
    });
    const emptyProof = emptyFixture.authority
      .captureReadyActiveStableTargetInternalV1(emptyTarget);
    if (emptyProof.kind !== "captured") throw new Error("expected pre-empty proof");
    applyEmptyStablePublicationV1({
      fixture: emptyFixture,
      publisher: emptyFixture.harness.workspace,
      sourceRevision: emptyFixture.harness.workspace.issueSourceRevision(),
    });
    expect(
      emptyFixture.authority.isCurrentReadyActiveStableTargetInternalV1(emptyProof.proof),
    ).toBe(false);
    expect(
      emptyFixture.authority.captureReadyActiveStableTargetInternalV1(emptyTarget),
    ).toEqual({ kind: "unavailable" });

    const disposedFixture = stableActionFixtureV1();
    const disposedTarget = publishReadyStableTargetV1({
      fixture: disposedFixture,
      publisher: disposedFixture.harness.workspace,
      target: disposedFixture.harness.workspaceRoot,
      sourceRevision: disposedFixture.harness.workspaceRevision,
    });
    const disposedProof = disposedFixture.authority
      .captureReadyActiveStableTargetInternalV1(disposedTarget);
    if (disposedProof.kind !== "captured") throw new Error("expected pre-disposal proof");
    const disposedCoordinator = createManagedSurfaceCoordinatorFacadeInternalV1(
      disposedFixture.kernel,
    );
    expect(disposedCoordinator.dispose().kind).toBe("applied");
    expect(
      disposedFixture.authority.isCurrentReadyActiveStableTargetInternalV1(
        disposedProof.proof,
      ),
    ).toBe(false);

    const successorFixture = stableActionFixtureV1({
      applicationEpoch: parseNonNegativeSafeInteger(applicationEpochV1 + 1),
    });
    const successorTarget = publishReadyStableTargetV1({
      fixture: successorFixture,
      publisher: successorFixture.harness.workspace,
      target: successorFixture.harness.workspaceRoot,
      sourceRevision: successorFixture.harness.workspaceRevision,
    });
    const successorCapture = successorFixture.authority
      .captureReadyActiveStableTargetInternalV1(successorTarget);
    expect(successorCapture.kind).toBe("captured");
    expect(
      successorFixture.authority.isCurrentReadyActiveStableTargetInternalV1(
        disposedProof.proof,
      ),
    ).toBe(false);
    expect(
      successorFixture.authority.captureReadyActiveStableTargetInternalV1(disposedTarget),
    ).toEqual({ kind: "unavailable" });
  });

  it("rejects hostile, cloned, and foreign target and proof identities without reads or mutation", () => {
    const fixture = stableActionFixtureV1();
    const installedTarget = publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const captured = fixture.authority
      .captureReadyActiveStableTargetInternalV1(installedTarget);
    if (captured.kind !== "captured") throw new Error("expected ready-active proof");
    const foreign = stableActionFixtureV1();
    const foreignTarget = publishReadyStableTargetV1({
      fixture: foreign,
      publisher: foreign.harness.workspace,
      target: foreign.harness.workspaceRoot,
      sourceRevision: foreign.harness.workspaceRevision,
    });
    const foreignCaptured = foreign.authority
      .captureReadyActiveStableTargetInternalV1(foreignTarget);
    if (foreignCaptured.kind !== "captured") throw new Error("expected foreign proof");
    const targetRead = vi.fn();
    const proofRead = vi.fn();
    const hostileTarget = Object.defineProperty({}, "occurrenceId", { get: targetRead });
    const hostileProof = Object.defineProperty({}, "proof", { get: proofRead });
    const revokedTarget = Proxy.revocable({}, {});
    const revokedProof = Proxy.revocable({}, {});
    revokedTarget.revoke();
    revokedProof.revoke();
    const clonedTarget = Object.freeze({ ...installedTarget });

    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    for (
      const invalidTarget of [
        null,
        undefined,
        hostileTarget,
        revokedTarget.proxy,
        clonedTarget,
        foreignTarget,
        captured.proof,
      ]
    ) {
      expect(
        fixture.authority.captureReadyActiveStableTargetInternalV1(invalidTarget),
      ).toEqual({ kind: "unavailable" });
    }
    for (
      const invalidProof of [
        null,
        undefined,
        hostileProof,
        revokedProof.proxy,
        Object.freeze({ ...captured.proof }),
        foreignCaptured.proof,
      ]
    ) {
      expect(
        fixture.authority.isCurrentReadyActiveStableTargetInternalV1(invalidProof),
      ).toBe(false);
    }
    expect(targetRead).not.toHaveBeenCalled();
    expect(proofRead).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(
      fixture.authority.isCurrentReadyActiveStableTargetInternalV1(captured.proof),
    ).toBe(true);
  });

  it("fails every stable action path closed on raw publisher-registry divergence", () => {
    const fixture = stableActionFixtureV1();
    const installedTarget = publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const physical = fixture.authority.captureCurrentStableInputInternalV1();
    if (physical.kind !== "captured" || physical.targetProof === null) {
      throw new Error("expected direct physical proof");
    }
    const readyActive = fixture.authority
      .captureReadyActiveStableTargetInternalV1(installedTarget);
    if (readyActive.kind !== "captured") throw new Error("expected ready-active proof");
    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(fixture.kernel);
    const transientListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    coordinator.subscribe(transientListener);

    expect(
      fixture.harness.registry.disposePublisherLease(fixture.harness.workspace.lease),
    ).toBe("disposed");
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(
      fixture.authority.isCurrentDirectTargetInternalV1(physical.targetProof),
    ).toBe(false);
    expect(
      fixture.authority.isCurrentReadyActiveStableTargetInternalV1(readyActive.proof),
    ).toBe(false);
    expect(fixture.authority.captureCurrentStableInputInternalV1()).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(
      fixture.authority.captureReadyActiveStableTargetInternalV1(installedTarget),
    ).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });

    const route = (applicationEpoch: number, topologyRevision: number) =>
      fixture.authority.routeActionInternalV1(Object.freeze({
        evidence: Object.freeze({
          applicationEpoch: parseNonNegativeSafeInteger(applicationEpoch),
          topologyRevision: parseNonNegativeSafeInteger(topologyRevision),
          surfaceInstanceId: physical.contract.surfaceInstanceId,
        }),
        actionId: narrativeAdvanceActionIdV1,
        routingLeaseId: physical.contract.routingLeaseId,
      }));
    expect(route(
      physical.contract.applicationEpoch + 1,
      physical.contract.topologyRevision + 1,
    )).toMatchObject({ kind: "stale", code: "surface.stale_application_epoch" });
    expect(route(
      physical.contract.applicationEpoch,
      physical.contract.topologyRevision + 1,
    )).toMatchObject({ kind: "stale", code: "surface.stale_topology_revision" });
    expect(route(
      physical.contract.applicationEpoch,
      physical.contract.topologyRevision,
    )).toEqual({
      kind: "faulted",
      code: "surface.transition_faulted",
      beforeTopologyRevision: physical.contract.topologyRevision,
      afterTopologyRevision: physical.contract.topologyRevision,
      surfaceInstanceId: physical.contract.surfaceInstanceId,
    });
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("routes stable actions with exact evidence and owner precedence without mutating state", () => {
    const fixture = stableActionFixtureV1();
    publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const captured = fixture.authority.captureCurrentStableInputInternalV1();
    expect(captured.kind).toBe("captured");
    if (captured.kind !== "captured") throw new Error("expected captured stable input");
    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(fixture.kernel);
    const transientListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    coordinator.subscribe(transientListener);
    const route = (input: {
      readonly applicationEpoch?: number;
      readonly topologyRevision?: number;
      readonly surfaceInstanceId?: ReturnType<typeof parseManagedSurfaceInstanceIdV1>;
      readonly routingLeaseId?: ReturnType<typeof parseManagedSurfaceRoutingLeaseIdV1>;
      readonly actionId?: ManagedSurfaceActionIdV1;
    }) =>
      fixture.authority.routeActionInternalV1(Object.freeze({
        evidence: Object.freeze({
          applicationEpoch: parseNonNegativeSafeInteger(
            input.applicationEpoch ?? captured.contract.applicationEpoch,
          ),
          topologyRevision: parseNonNegativeSafeInteger(
            input.topologyRevision ?? captured.contract.topologyRevision,
          ),
          surfaceInstanceId: input.surfaceInstanceId ?? captured.contract.surfaceInstanceId,
        }),
        routingLeaseId: input.routingLeaseId ?? captured.contract.routingLeaseId,
        actionId: input.actionId ?? narrativeAdvanceActionIdV1,
      }));

    expect(route({
      applicationEpoch: captured.contract.applicationEpoch + 1,
      topologyRevision: captured.contract.topologyRevision + 1,
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e41.n999"),
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e41.n999"),
      actionId: narrativeOtherActionIdV1,
    })).toMatchObject({ kind: "stale", code: "surface.stale_application_epoch" });
    expect(route({
      topologyRevision: captured.contract.topologyRevision + 1,
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e41.n999"),
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e41.n999"),
      actionId: narrativeOtherActionIdV1,
    })).toMatchObject({ kind: "stale", code: "surface.stale_topology_revision" });
    expect(route({
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e41.n999"),
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e41.n999"),
      actionId: narrativeOtherActionIdV1,
    })).toMatchObject({ kind: "stale", code: "surface.stale_instance" });
    expect(route({
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e41.n999"),
      actionId: narrativeOtherActionIdV1,
    })).toMatchObject({ kind: "stale", code: "surface.stale_routing_lease" });
    expect(route({ actionId: narrativeOtherActionIdV1 })).toMatchObject({
      kind: "rejected",
      code: "surface.action_unpublished",
    });
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();

    const blocker = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 30,
        modality: "blocking",
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(blocker.receipt.kind).toBe("applied");
    expect(blocker.readiness?.ready().receipt.kind).toBe("applied");
    stateListener.mockClear();
    transientListener.mockClear();
    const blockedState = fixture.kernel.getStateInternalV1();
    expect(route({
      topologyRevision: coordinator.getSnapshot().topologyRevision,
    })).toMatchObject({ kind: "rejected", code: "surface.not_input_owner" });
    expect(fixture.kernel.getStateInternalV1()).toBe(blockedState);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("invalidates exact direct-target proof on source advance and replacement retention", () => {
    const fixture = stableActionFixtureV1();
    publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const initial = fixture.authority.captureCurrentStableInputInternalV1();
    expect(initial.kind).toBe("captured");
    if (initial.kind !== "captured" || initial.targetProof === null) {
      throw new Error("expected initial direct-target proof");
    }

    const sourceRevision = fixture.harness.workspace.issueSourceRevision();
    const sourceAdvancedTarget = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision,
    });
    expect(fixture.authority.isCurrentDirectTargetInternalV1(initial.targetProof)).toBe(false);
    const sourceAdvanced = fixture.authority.captureCurrentStableInputInternalV1();
    expect(sourceAdvanced.kind).toBe("captured");
    if (sourceAdvanced.kind !== "captured" || sourceAdvanced.targetProof === null) {
      throw new Error("expected source-advanced direct-target proof");
    }
    expect(sourceAdvanced.directTarget).toBe(sourceAdvancedTarget);
    expect(sourceAdvanced.sourceRevision).toBe(sourceRevision);
    expect(fixture.authority.isCurrentDirectTargetInternalV1(sourceAdvanced.targetProof)).toBe(
      true,
    );

    const replacementRevision = fixture.harness.workspace.issueSourceRevision();
    admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: replacementRevision,
    });
    expect(fixture.authority.isCurrentDirectTargetInternalV1(sourceAdvanced.targetProof)).toBe(
      false,
    );
    const retained = fixture.authority.captureCurrentStableInputInternalV1();
    expect(retained.kind).toBe("captured");
    if (retained.kind !== "captured") throw new Error("expected retained input binding");
    expect(retained.contract.surfaceInstanceId).toBe(initial.contract.surfaceInstanceId);
    expect(retained.directTarget).toBeNull();
    expect(retained.sourceRevision).toBeNull();
    expect(retained.targetProof).toBeNull();
    const retainedState = fixture.kernel.getStateInternalV1();
    expect(fixture.authority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: retained.contract.applicationEpoch,
        topologyRevision: retained.contract.topologyRevision,
        surfaceInstanceId: retained.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: retained.contract.routingLeaseId,
    }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    expect(fixture.kernel.getStateInternalV1()).toBe(retainedState);
  });

  it("rejects cloned, foreign, revoked, and terminal direct-target proofs", () => {
    const fixture = stableActionFixtureV1();
    publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const captured = fixture.authority.captureCurrentStableInputInternalV1();
    if (captured.kind !== "captured" || captured.targetProof === null) {
      throw new Error("expected direct-target proof");
    }
    const propertyRead = vi.fn();
    const clone = Object.defineProperty({}, "trap", { get: propertyRead });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const foreign = stableActionFixtureV1();

    expect(fixture.authority.isCurrentDirectTargetInternalV1(captured.targetProof)).toBe(true);
    expect(fixture.authority.isCurrentDirectTargetInternalV1(clone)).toBe(false);
    expect(fixture.authority.isCurrentDirectTargetInternalV1(revoked.proxy)).toBe(false);
    expect(foreign.authority.isCurrentDirectTargetInternalV1(captured.targetProof)).toBe(false);
    expect(propertyRead).not.toHaveBeenCalled();

    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(fixture.kernel);
    expect(coordinator.dispose().kind).toBe("applied");
    expect(fixture.authority.isCurrentDirectTargetInternalV1(captured.targetProof)).toBe(false);
    expect(fixture.authority.captureCurrentStableInputInternalV1()).toEqual({
      kind: "unavailable",
    });
  });

  it("does not capture a direct stable input target while shared topology suspends it", () => {
    const fixture = stableActionFixtureV1();
    publishReadyStableTargetV1({
      fixture,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    expect(fixture.authority.captureCurrentStableInputInternalV1().kind).toBe("captured");

    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(fixture.kernel);
    const blocker = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 30,
        modality: "blocking",
      }).definition,
      semanticOccurrenceId: null,
    });
    expect(blocker.receipt.kind).toBe("applied");
    expect(blocker.readiness?.ready().receipt.kind).toBe("applied");
    expect(fixture.authority.captureCurrentStableInputInternalV1()).toEqual({
      kind: "unavailable",
    });
  });
});

describe("dormant stable publisher registration", () => {
  function registrationFixtureV1() {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    return Object.freeze({ harness, kernel });
  }

  function expectRegistrationResultV1(
    result: ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
    kind: ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1["kind"],
  ): void {
    expect(result.kind).toBe(kind);
    expect(Object.isFrozen(result)).toBe(true);
  }

  it("registers one exact unpublished baseline with one state notification and zero transient delta", () => {
    const { harness, kernel } = registrationFixtureV1();
    expectTypeOf(kernel).toEqualTypeOf<
      ManagedSurfaceStableCompositeRuntimeKernelInternalV1
    >();
    const before = kernel.getStateInternalV1();
    const beforeTransientSnapshot = kernel.getTransientSnapshotInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    let reentrantResult: ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1 | null =
      null;
    kernel.subscribeTransientInternalV1(transientListener);
    kernel.subscribeStateInternalV1(() => {
      stateListener();
      const installed = kernel.getStateInternalV1();
      expect(installed.stableAcceptedBaselines).toHaveLength(1);
      reentrantResult = kernel.registerStablePublisherLeaseInternalV1(
        harness.workspace.lease,
      );
    });

    const result = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(result, "registered");
    expect(result).toMatchObject({
      kind: "registered",
      acceptedBaseline: {
        kind: "unpublished",
        publisherLease: harness.workspace.lease,
      },
    });
    if (result.kind !== "registered") throw new Error("expected registered result");
    expect(Object.keys(result)).toEqual(["kind", "acceptedBaseline"]);
    expect(Object.isFrozen(result.acceptedBaseline)).toBe(true);

    const after = kernel.getStateInternalV1();
    expect(after).not.toBe(before);
    expect(Object.isFrozen(after)).toBe(true);
    expect(Object.isFrozen(after.stableAcceptedBaselines)).toBe(true);
    expect(after.stableAcceptedBaselines).toEqual([result.acceptedBaseline]);
    expect(after.stableAcceptedBaselines[0]).toBe(result.acceptedBaseline);
    expect(after.transientState).toBe(before.transientState);
    expect(after.rootReservationContributors).toBe(before.rootReservationContributors);
    expect(after.rootReservationGenerationToken).toBe(
      before.rootReservationGenerationToken,
    );
    expect(after.stableRuntimeBindings).toBe(before.stableRuntimeBindings);
    expect(kernel.getTransientSnapshotInternalV1()).toBe(beforeTransientSnapshot);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();

    const nestedResult = reentrantResult as
      | ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1
      | null;
    expectRegistrationResultV1(nestedResult!, "unchanged");
    expect(nestedResult).toMatchObject({
      kind: "unchanged",
      acceptedBaseline: result.acceptedBaseline,
    });
    if (nestedResult?.kind !== "unchanged") {
      throw new Error("expected reentrant unchanged result");
    }
    expect(nestedResult.acceptedBaseline).toBe(result.acceptedBaseline);
    expect(kernel.getStateInternalV1()).toBe(after);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("does not treat absence or a caller-created authentic seed as the registered baseline", () => {
    const { harness, kernel } = registrationFixtureV1();
    const callerSeed = harness.authority.createUnpublishedBaseline(harness.workspace.lease);
    const before = kernel.getStateInternalV1();
    expect(before.stableAcceptedBaselines).toEqual([]);
    const missing = kernel.captureAdmissionContextInternalV1(harness.workspace.lease);
    expect(missing).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(Object.isFrozen(missing)).toBe(true);
    expect(kernel.getStateInternalV1()).toBe(before);

    const result = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(result, "registered");
    if (result.kind !== "registered") throw new Error("expected registered result");
    expect(result.acceptedBaseline).not.toBe(callerSeed);
    expect(kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([
      result.acceptedBaseline,
    ]);
    expect(kernel.getStateInternalV1().stableAcceptedBaselines).not.toContain(callerSeed);
  });

  it("canonicalizes registered baselines by authentic lease sequence", () => {
    const { harness, kernel } = registrationFixtureV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    const narrative = kernel.registerStablePublisherLeaseInternalV1(harness.narrative.lease);
    const workspace = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(narrative, "registered");
    expectRegistrationResultV1(workspace, "registered");
    if (narrative.kind !== "registered" || workspace.kind !== "registered") {
      throw new Error("expected two registered baselines");
    }
    const registered = kernel.getStateInternalV1();
    expect(registered.stableAcceptedBaselines).toEqual([
      workspace.acceptedBaseline,
      narrative.acceptedBaseline,
    ]);
    expect(stateListener).toHaveBeenCalledTimes(2);
    expect(transientListener).not.toHaveBeenCalled();

    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease)).toEqual({
      kind: "unchanged",
      acceptedBaseline: workspace.acceptedBaseline,
    });
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.narrative.lease)).toEqual({
      kind: "unchanged",
      acceptedBaseline: narrative.acceptedBaseline,
    });
    expect(kernel.getStateInternalV1()).toBe(registered);
    expect(stateListener).toHaveBeenCalledTimes(2);
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("keeps foreign opaque candidates stale after a valid baseline is registered", () => {
    const { harness, kernel } = registrationFixtureV1();
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "registered",
    );
    const foreignRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: applicationEpochV1,
      resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
      leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
    });
    const foreignPublisher = foreignRegistry.issuePublisher(narrativeOwnerIdV1);
    const trap = vi.fn();
    const proxyLease = new Proxy(foreignPublisher.lease as object, {
      get() {
        trap();
        throw new Error("foreign lease proxy must remain opaque");
      },
      ownKeys() {
        trap();
        throw new Error("foreign lease proxy must remain opaque");
      },
    });
    const before = kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    for (const value of [foreignPublisher.lease, proxyLease]) {
      expect(kernel.registerStablePublisherLeaseInternalV1(value)).toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
      });
      expect(kernel.captureAdmissionContextInternalV1(value)).toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
      });
    }
    expect(trap).not.toHaveBeenCalled();
    expect(kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("closes registration and context ingress before touching a candidate after coordinator dispose", () => {
    const { harness, kernel } = registrationFixtureV1();
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "registered",
    );
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);
    expect(coordinator.dispose()).toMatchObject({ kind: "applied" });
    const disposed = kernel.getStateInternalV1();
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).toHaveBeenCalledTimes(1);

    const trap = vi.fn();
    const proxyLease = new Proxy(harness.workspace.lease as object, {
      get() {
        trap();
        throw new Error("disposed composition must not inspect a candidate lease");
      },
      ownKeys() {
        trap();
        throw new Error("disposed composition must not inspect a candidate lease");
      },
    });
    expect(() => kernel.registerStablePublisherLeaseInternalV1(proxyLease)).toThrowError(
      "ui.managed_surface_coordinator_disposed",
    );
    expect(() => kernel.captureAdmissionContextInternalV1(proxyLease)).toThrowError(
      "ui.managed_surface_coordinator_disposed",
    );
    expect(trap).not.toHaveBeenCalled();
    expect(kernel.getStateInternalV1()).toBe(disposed);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).toHaveBeenCalledTimes(1);
  });

  it("shares the exact runtime transition fence with registration planning", () => {
    const { harness, kernel } = registrationFixtureV1();
    const initial = kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    kernel.transitionStateInternalV1((currentState) => {
      expect(currentState).toBe(initial);
      expect(() => kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease))
        .toThrowError("ui.managed_surface_runtime_transition_in_progress");
      expect(currentState.stableAcceptedBaselines).toEqual([]);
      return Object.freeze({ state: currentState, result: undefined });
    });
    expect(kernel.getStateInternalV1()).toBe(initial);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();

    expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
      "registered",
    );
    expect(kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("treats a disposed bound registry as global reconcile divergence before candidate inspection", () => {
    const { harness, kernel } = registrationFixtureV1();
    expect(harness.registry.dispose()).toBe("disposed");
    const before = kernel.getStateInternalV1();
    const trap = vi.fn();
    const proxyLease = new Proxy(harness.workspace.lease as object, {
      get() {
        trap();
        throw new Error("disposed registry must win before candidate inspection");
      },
      ownKeys() {
        trap();
        throw new Error("disposed registry must win before candidate inspection");
      },
    });

    expect(kernel.registerStablePublisherLeaseInternalV1(proxyLease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(kernel.captureAdmissionContextInternalV1(proxyLease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(trap).not.toHaveBeenCalled();
    expect(kernel.getStateInternalV1()).toBe(before);
  });

  it("returns stale for foreign, cloned, disposed-unregistered, and trap-bearing lease values", () => {
    const { harness, kernel } = registrationFixtureV1();
    const foreignRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: applicationEpochV1,
      resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
      leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
    });
    const foreignPublisher = foreignRegistry.issuePublisher(workspaceOwnerIdV1);
    const clonedLease = Object.freeze({ ...harness.workspace.lease });
    const trap = vi.fn();
    const proxyLease = new Proxy(harness.workspace.lease as object, {
      get() {
        trap();
        throw new Error("lease proxy must remain opaque");
      },
      ownKeys() {
        trap();
        throw new Error("lease proxy must remain opaque");
      },
    });
    expect(harness.registry.disposePublisherLease(harness.narrative.lease)).toBe("disposed");
    const before = kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    for (
      const lease of [
        foreignPublisher.lease,
        clonedLease,
        proxyLease,
        harness.narrative.lease,
        null,
        "surface-stable-publisher.e41.n1",
      ]
    ) {
      const result = kernel.registerStablePublisherLeaseInternalV1(lease);
      expectRegistrationResultV1(result, "stale");
      expect(result).toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
      });
      const captured = kernel.captureAdmissionContextInternalV1(lease);
      expect(captured).toEqual({
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
      });
      expect(Object.isFrozen(captured)).toBe(true);
    }
    expect(trap).not.toHaveBeenCalled();
    expect(kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("classifies a registered lease that loses registry currentness as reconcile divergence", () => {
    const { harness, kernel } = registrationFixtureV1();
    const registered = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(registered, "registered");
    const installed = kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.registry.disposePublisherLease(harness.workspace.lease)).toBe("disposed");
    const result = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(result, "faulted");
    expect(result).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(kernel.captureAdmissionContextInternalV1(harness.workspace.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });

    const clonedLease = Object.freeze({ ...harness.workspace.lease });
    const cloneResult = kernel.registerStablePublisherLeaseInternalV1(clonedLease);
    expectRegistrationResultV1(cloneResult, "faulted");
    expect(kernel.captureAdmissionContextInternalV1(clonedLease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    const trap = vi.fn();
    const proxyLease = new Proxy(harness.workspace.lease as object, {
      get() {
        trap();
        throw new Error("divergent registry must not inspect a candidate proxy");
      },
      ownKeys() {
        trap();
        throw new Error("divergent registry must not inspect a candidate proxy");
      },
    });
    expect(kernel.registerStablePublisherLeaseInternalV1(proxyLease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(kernel.captureAdmissionContextInternalV1(proxyLease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(kernel.registerStablePublisherLeaseInternalV1(harness.narrative.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    const successor = harness.registry.issuePublisher(workspaceOwnerIdV1);
    expect(kernel.registerStablePublisherLeaseInternalV1(successor.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(kernel.captureAdmissionContextInternalV1(successor.lease)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
    });
    expect(trap).not.toHaveBeenCalled();
    expect(kernel.getStateInternalV1()).toBe(installed);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("registers a fresh same-epoch successor when no retired composite record exists", () => {
    const { harness, kernel } = registrationFixtureV1();
    const before = kernel.getStateInternalV1();
    expect(harness.registry.disposePublisherLease(harness.workspace.lease)).toBe("disposed");
    const successor = harness.registry.issuePublisher(workspaceOwnerIdV1);

    const stale = kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease);
    expectRegistrationResultV1(stale, "stale");
    const registered = kernel.registerStablePublisherLeaseInternalV1(successor.lease);
    expectRegistrationResultV1(registered, "registered");
    if (registered.kind !== "registered") throw new Error("expected successor registration");
    expect(registered.acceptedBaseline.publisherLease).toBe(successor.lease);
    expect(registered.acceptedBaseline.publisherLease).not.toBe(harness.workspace.lease);
    expect(kernel.getStateInternalV1()).not.toBe(before);
    expect(kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([
      registered.acceptedBaseline,
    ]);
  });

  it("captures exact current admission context without mutation and feeds only R2 evaluation", () => {
    const { harness, kernel } = registrationFixtureV1();
    expect(harness.registry.disposePublisherLease(harness.workspace.lease)).toBe("disposed");
    const publisher = harness.registry.issuePublisher(workspaceOwnerIdV1);
    const registered = kernel.registerStablePublisherLeaseInternalV1(publisher.lease);
    if (registered.kind !== "registered") throw new Error("expected registration");
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);
    coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
      }).definition,
      semanticOccurrenceId: null,
    });
    const before = kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    const context = kernel.captureAdmissionContextInternalV1(publisher.lease);
    expect(context.kind).toBe("captured");
    if (context.kind !== "captured") throw new Error("expected captured context");
    expect(Object.keys(context)).toEqual([
      "kind",
      "acceptedBaseline",
      "reservationSnapshot",
    ]);
    expect(Object.isFrozen(context)).toBe(true);
    expect(context.acceptedBaseline).toBe(registered.acceptedBaseline);
    expect(context.acceptedBaseline).toBe(before.stableAcceptedBaselines[0]);
    expect(Object.isFrozen(context.reservationSnapshot)).toBe(true);
    expect(context.reservationSnapshot.subjectPublisherLease).toBe(publisher.lease);
    expect(context.reservationSnapshot.generationToken).toBe(
      before.rootReservationGenerationToken,
    );
    expect(context.reservationSnapshot.reservedRootSlotIds).toEqual([rootSlotBV1]);
    expect(kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();

    const occurrenceId = publisher.issueOccurrence();
    const sourceRevision = publisher.issueSourceRevision();
    const evaluated = harness.authority.evaluate({
      publication: {
        publisherLease: publisher.lease,
        sourceRevision,
        targets: [{
          occurrenceId,
          definitionId: rootDefinitionAV1,
          parentOccurrenceId: null,
          parameters: null,
        }],
      },
      acceptedBaseline: context.acceptedBaseline,
      reservationSnapshot: context.reservationSnapshot,
    });
    expect(evaluated.kind).toBe("admitted");
    expect(kernel.getStateInternalV1()).toBe(before);
    expect(before.stableAcceptedBaselines[0]).toBe(registered.acceptedBaseline);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("keeps the registration and admission-context type surfaces exact and source-relative", () => {
    expectTypeOf<ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1["kind"]>()
      .toEqualTypeOf<"registered" | "unchanged" | "stale" | "faulted">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
          { readonly kind: "registered" | "unchanged" }
        >
      >
    >().toEqualTypeOf<"kind" | "acceptedBaseline">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
          { readonly kind: "stale" | "faulted" }
        >
      >
    >().toEqualTypeOf<"kind" | "code">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
        { readonly kind: "registered" }
      >["acceptedBaseline"]["kind"]
    >().toEqualTypeOf<"unpublished">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
        { readonly kind: "unchanged" }
      >["acceptedBaseline"]["kind"]
    >().toEqualTypeOf<"unpublished" | "accepted">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
        { readonly kind: "stale" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_publisher_lease_stale">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
        { readonly kind: "faulted" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_reconcile_faulted">();
    expectTypeOf<ManagedSurfaceStableAdmissionContextCaptureResultInternalV1["kind"]>()
      .toEqualTypeOf<"captured" | "stale" | "faulted">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
          { readonly kind: "captured" }
        >
      >
    >().toEqualTypeOf<"kind" | "acceptedBaseline" | "reservationSnapshot">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
        { readonly kind: "captured" }
      >["acceptedBaseline"]["kind"]
    >().toEqualTypeOf<"unpublished" | "accepted">();
    expectTypeOf<
      ExactKeysV1<
        Extract<
          ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
          { readonly kind: "stale" | "faulted" }
        >
      >
    >().toEqualTypeOf<"kind" | "code">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
        { readonly kind: "stale" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_publisher_lease_stale">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionContextCaptureResultInternalV1,
        { readonly kind: "faulted" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_reconcile_faulted">();
  });
});
