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
  type ManagedSurfaceDismissKindV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceCoordinatorFacadeInternalV1 } from "./managed-surface-coordinator.ts";
import { createManagedSurfaceRuntimeAttemptIdentityInternalV1 } from "./managed-surface-identity.ts";
import type { ManagedSurfacePreparedInputBindingContractInternalV1 } from "./managed-surface-action-route.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import type { ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 } from "./managed-surface-runtime-kernel.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1,
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
  type ManagedSurfaceStableCompositeStateInstallParticipantInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableDesiredRuntimeTargetInternalV1,
  type ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1,
  type ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  type ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1,
  type ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  type ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1,
  type ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1,
  type ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1,
  type ManagedSurfaceStableReadinessCommitGuardInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1,
  type ManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1,
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
const historySlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.history");
const rootDefinitionAV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-a");
const replacementDefinitionAV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.root-a-replacement",
);
const rootDefinitionBV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-b");
const childDefinitionV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.child");
const historyDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.history",
);
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
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootDefinitionAV1,
      slotId: historySlotV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: historyDefinitionV1,
      slotId: grandchildSlotV1,
      cardinality: "single" as const,
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
  readonly historyDefinition: ManagedSurfaceResolvedDefinitionV1;
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
  const historyDefinitionSidecar = definitionV1({
    definitionId: historyDefinitionV1,
    ownerId: workspaceOwnerIdV1,
    slotId: historySlotV1,
    placement: "child",
    layerOrder: (input.workspaceLayerOrder ?? 1) + 1,
    managedInput: true,
    actionIds: [narrativeAdvanceActionIdV1, narrativeOtherActionIdV1],
  });
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
      historyDefinitionSidecar,
      definitionV1({
        definitionId: grandchildDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: grandchildSlotV1,
        placement: "child",
        layerOrder: (input.workspaceLayerOrder ?? 1) + 2,
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
    historyDefinition: historyDefinitionSidecar.definition,
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
  identitySequenceHighWater: ReturnType<typeof parseNonNegativeSafeInteger> =
    parseNonNegativeSafeInteger(0),
) {
  const state = createManagedSurfaceReducerStateV1(
    applicationEpoch,
    [workspaceOwnerIdV1, narrativeOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
  return identitySequenceHighWater === 0
    ? state
    : Object.freeze({ ...state, identitySequenceHighWater });
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

function evaluateStablePublicationV1(input: {
  readonly harness: StableHarnessV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly targets: readonly ManagedSurfaceStableAdmittedTargetInternalV1[];
}) {
  const context = input.kernel.captureAdmissionContextInternalV1(input.publisher.lease);
  if (context.kind !== "captured") throw new Error(`expected captured, got ${context.kind}`);
  const evaluated = input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.sourceRevision,
      targets: Object.freeze(input.targets.map((target) =>
        Object.freeze({
          occurrenceId: target.occurrenceId,
          definitionId: target.definitionId,
          parentOccurrenceId: target.parentOccurrenceId,
          parameters: target.normalizedParameters,
        })
      )),
    }),
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
  if (evaluated.kind !== "admitted") {
    throw new Error(`expected admitted, got ${evaluated.kind}:${evaluated.code}`);
  }
  return evaluated.proposal;
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

function exactParentTransientChildFixtureV1(input: {
  readonly identitySequenceHighWater?: ReturnType<typeof parseNonNegativeSafeInteger>;
} = {}) {
  const harness = harnessV1({
    managedInput: true,
    workspaceLayerOrder: 10,
    narrativeLayerOrder: 20,
    actionIds: [narrativeAdvanceActionIdV1],
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: harness.authority,
    publisherLeaseRegistry: harness.registry,
    initialTransientState: transientStateV1(
      harness.registry.getSnapshot().applicationEpoch,
      input.identitySequenceHighWater ?? parseNonNegativeSafeInteger(0),
    ),
  });
  expect(kernel.registerStablePublisherLeaseInternalV1(harness.workspace.lease).kind).toBe(
    "registered",
  );
  const parent = admitAndApplyStableTargetV1({
    harness,
    kernel,
    publisher: harness.workspace,
    target: harness.workspaceRoot,
    sourceRevision: harness.workspaceRevision,
  });
  settleCurrentStablePreparationReadyV1(kernel, parent);
  const actionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel);
  const captured = actionAuthority.captureCurrentStableInputInternalV1();
  if (
    captured.kind !== "captured" || captured.directTarget === null ||
    captured.sourceRevision === null || captured.targetProof === null
  ) {
    throw new Error("expected exact stable direct-parent proof");
  }
  const parentProof = captured.targetProof;
  const expectedParent = captured.directTarget;
  const expectedSourceRevision = captured.sourceRevision;
  const claimant = Object.freeze({});
  return Object.freeze({
    harness,
    kernel,
    parent,
    captured,
    parentProof,
    expectedParent,
    expectedSourceRevision,
    claimant,
    authority: claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      kernel,
      claimant,
    ),
  });
}

function prepareExactParentTransientHistoryV1(
  fixture: ReturnType<typeof exactParentTransientChildFixtureV1>,
  commitInternalV1: (
    candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  ) => boolean,
) {
  return fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
    parentProof: fixture.parentProof,
    expectedParent: fixture.expectedParent,
    expectedSourceRevision: fixture.expectedSourceRevision,
    definition: fixture.harness.historyDefinition,
    semanticOccurrenceId: null,
    commitGuard: Object.freeze({ commitInternalV1 }),
  }));
}

function installedExactParentTransientHistoryV1() {
  const fixture = exactParentTransientChildFixtureV1();
  const installed = prepareExactParentTransientHistoryV1(fixture, () => true);
  if (installed.kind !== "installed") {
    throw new Error(`expected installed History, got ${installed.kind}`);
  }
  return Object.freeze({
    ...fixture,
    candidate: installed.candidate,
    readinessAuthority:
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    childActionAuthority:
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
  });
}

function exactParentTransientChildLifecycleFixtureV1(
  phase: "preparing" | "ready" = "preparing",
) {
  const fixture = installedExactParentTransientHistoryV1();
  const lifecycleAuthority =
    claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
      fixture.kernel,
      fixture.claimant,
    );
  if (phase === "ready") {
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
  }
  return Object.freeze({ ...fixture, lifecycleAuthority });
}

function lifecycleGuardV1(
  commitInternalV1: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1,
  ) => boolean,
): ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1 {
  return Object.freeze({ commitInternalV1 });
}

function currentStableReadinessEnvelopeV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
) {
  const entry = kernel.getStateInternalV1().stableRuntimeBindings.find((candidate) =>
    candidate.desiredTarget.admittedTarget.occurrenceId === target.occurrenceId
  );
  if (entry?.binding.kind !== "preparing") {
    throw new Error("expected current stable preparation");
  }
  return Object.freeze({
    readinessEvidence: Object.freeze({
      applicationEpoch: kernel.getStateInternalV1().transientState.publication.applicationEpoch,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
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
  readonly fixture: Pick<ReturnType<typeof stableActionFixtureV1>, "harness" | "kernel">;
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

describe("managed stable guarded admission apply", () => {
  it("installs an initial proposal only after the exact guard accepts the prepared input", () => {
    const fixture = stableActionFixtureV1();
    const proposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: fixture.harness.workspaceRevision,
      targets: [fixture.harness.workspaceRoot],
    });
    const before = fixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    const guard = vi.fn((contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) => {
      expect(contract).toBeNull();
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(stateListener).not.toHaveBeenCalled();
      return true;
    });

    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      proposal,
      Object.freeze({ commitInternalV1: guard }),
    )).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(guard).toHaveBeenCalledOnce();
    expect(stateListener).toHaveBeenCalledOnce();
    expect(fixture.kernel.getStateInternalV1()).not.toBe(before);
  });

  it("runs the exact guard inside prepared install before commit and notification", () => {
    const fixture = stableActionFixtureV1();
    const trace: string[] = [];
    let participant!: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1;
    participant = Object.freeze({
      prepareStateInstallInternalV1(
        this: unknown,
        previousState: ManagedSurfaceStableCompositeStateInternalV1,
        nextState: ManagedSurfaceStableCompositeStateInternalV1,
      ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
        expect(this).toBe(participant);
        expect(previousState).toBe(fixture.kernel.getStateInternalV1());
        expect(nextState).not.toBe(previousState);
        trace.push("prepare");
        let prepared!: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1;
        prepared = Object.freeze({
          validateInternalV1(this: unknown) {
            expect(this).toBe(prepared);
            trace.push("validate");
            return true;
          },
          commitLogicalInternalV1(this: unknown) {
            expect(this).toBe(prepared);
            trace.push("commit");
          },
          abortInternalV1(this: unknown) {
            expect(this).toBe(prepared);
            trace.push("abort");
          },
          completeInstalledInternalV1(this: unknown) {
            expect(this).toBe(prepared);
            trace.push("complete");
          },
        });
        return prepared;
      },
    });
    fixture.kernel.setStateInstallParticipantInternalV1(participant);
    const proposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: fixture.harness.workspaceRevision,
      targets: [fixture.harness.workspaceRoot],
    });
    fixture.kernel.subscribeStateInternalV1(() => trace.push("listener"));

    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      proposal,
      Object.freeze({
        commitInternalV1() {
          trace.push("guard");
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied" });
    expect(trace).toEqual(["prepare", "validate", "guard", "commit", "listener", "complete"]);

    const rejectedFixture = stableActionFixtureV1();
    const rejectedTrace: string[] = [];
    let rejectedParticipant!: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1;
    rejectedParticipant = Object.freeze({
      prepareStateInstallInternalV1(): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
        rejectedTrace.push("prepare");
        let prepared!: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1;
        prepared = Object.freeze({
          validateInternalV1() {
            rejectedTrace.push("validate");
            return true;
          },
          commitLogicalInternalV1() {
            rejectedTrace.push("commit");
          },
          abortInternalV1() {
            rejectedTrace.push("abort");
          },
          completeInstalledInternalV1() {
            rejectedTrace.push("complete");
          },
        });
        return prepared;
      },
    });
    rejectedFixture.kernel.setStateInstallParticipantInternalV1(rejectedParticipant);
    const rejectedProposal = evaluateStablePublicationV1({
      harness: rejectedFixture.harness,
      kernel: rejectedFixture.kernel,
      publisher: rejectedFixture.harness.workspace,
      sourceRevision: rejectedFixture.harness.workspaceRevision,
      targets: [rejectedFixture.harness.workspaceRoot],
    });
    const rejectedBefore = rejectedFixture.kernel.getStateInternalV1();
    const rejectedListener = vi.fn();
    rejectedFixture.kernel.subscribeStateInternalV1(rejectedListener);
    expect(rejectedFixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      rejectedProposal,
      Object.freeze({
        commitInternalV1() {
          rejectedTrace.push("guard");
          return false;
        },
      }),
    )).toMatchObject({ kind: "stale", code: "surface.stable_reconcile_precondition_stale" });
    expect(rejectedTrace).toEqual(["prepare", "validate", "guard", "abort"]);
    expect(rejectedListener).not.toHaveBeenCalled();
    expect(rejectedFixture.kernel.getStateInternalV1()).toBe(rejectedBefore);
  });

  it("canonicalizes guard rejection and faults with exact zero mutation", () => {
    const guardRows = [
      Object.freeze({
        commitInternalV1: vi.fn(() => false),
        expected: Object.freeze({
          kind: "stale" as const,
          code: "surface.stable_reconcile_precondition_stale" as const,
        }),
      }),
      Object.freeze({
        commitInternalV1: vi.fn(() => {
          throw new Error("guard fault");
        }),
        expected: Object.freeze({
          kind: "faulted" as const,
          code: "surface.stable_reconcile_faulted" as const,
        }),
      }),
      Object.freeze({
        commitInternalV1: vi.fn(() => "true" as unknown as boolean),
        expected: Object.freeze({
          kind: "faulted" as const,
          code: "surface.stable_reconcile_faulted" as const,
        }),
      }),
    ];
    for (const row of guardRows) {
      const fixture = stableActionFixtureV1();
      const proposal = evaluateStablePublicationV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        sourceRevision: fixture.harness.workspaceRevision,
        targets: [fixture.harness.workspaceRoot],
      });
      const before = fixture.kernel.getStateInternalV1();
      const stateListener = vi.fn();
      const transientListener = vi.fn();
      fixture.kernel.subscribeStateInternalV1(stateListener);
      fixture.kernel.subscribeTransientInternalV1(transientListener);

      expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
        proposal,
        Object.freeze({ commitInternalV1: row.commitInternalV1 }),
      )).toMatchObject({
        ...row.expected,
        delta: {
          source: "unchanged",
          runtime: "unchanged",
          notificationCount: 0,
          topology: "unchanged",
          runtimeAllocation: "zero",
        },
      });
      expect(row.commitInternalV1).toHaveBeenCalledOnce();
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(stateListener).not.toHaveBeenCalled();
      expect(transientListener).not.toHaveBeenCalled();
    }

    const malformedFixture = stableActionFixtureV1();
    const malformedProposal = evaluateStablePublicationV1({
      harness: malformedFixture.harness,
      kernel: malformedFixture.kernel,
      publisher: malformedFixture.harness.workspace,
      sourceRevision: malformedFixture.harness.workspaceRevision,
      targets: [malformedFixture.harness.workspaceRoot],
    });
    const malformedBefore = malformedFixture.kernel.getStateInternalV1();
    const getter = vi.fn(() => () => true);
    const malformedGuard = Object.freeze(Object.defineProperty({}, "commitInternalV1", {
      get: getter,
      enumerable: true,
    }));
    expect(malformedFixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      malformedProposal,
      malformedGuard as ManagedSurfaceStableReadinessCommitGuardInternalV1,
    )).toMatchObject({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: { notificationCount: 0 },
    });
    expect(getter).not.toHaveBeenCalled();
    expect(malformedFixture.kernel.getStateInternalV1()).toBe(malformedBefore);

    const staleFixture = stableActionFixtureV1();
    admitAndApplyStableTargetV1({
      harness: staleFixture.harness,
      kernel: staleFixture.kernel,
      publisher: staleFixture.harness.workspace,
      target: staleFixture.harness.workspaceRoot,
      sourceRevision: staleFixture.harness.workspaceRevision,
    });
    const staleProposal = evaluateStablePublicationV1({
      harness: staleFixture.harness,
      kernel: staleFixture.kernel,
      publisher: staleFixture.harness.workspace,
      sourceRevision: staleFixture.harness.workspace.issueSourceRevision(),
      targets: [staleFixture.harness.workspaceRoot],
    });
    const currentProposal = evaluateStablePublicationV1({
      harness: staleFixture.harness,
      kernel: staleFixture.kernel,
      publisher: staleFixture.harness.workspace,
      sourceRevision: staleFixture.harness.workspace.issueSourceRevision(),
      targets: [staleFixture.harness.workspaceRoot],
    });
    expect(staleFixture.kernel.applyStableAdmissionProposalInternalV1(currentProposal))
      .toMatchObject({ kind: "applied" });
    const staleBefore = staleFixture.kernel.getStateInternalV1();
    const staleGuardTrap = vi.fn();
    const staleGuard = new Proxy(Object.freeze({}), {
      getOwnPropertyDescriptor() {
        staleGuardTrap();
        throw new Error("stale guard descriptor read");
      },
      ownKeys() {
        staleGuardTrap();
        throw new Error("stale guard keys read");
      },
    });
    expect(staleFixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      staleProposal,
      staleGuard as ManagedSurfaceStableReadinessCommitGuardInternalV1,
    )).toMatchObject({
      kind: "stale",
      code: "surface.stable_reconcile_precondition_stale",
      delta: { notificationCount: 0 },
    });
    expect(staleGuardTrap).not.toHaveBeenCalled();
    expect(staleFixture.kernel.getStateInternalV1()).toBe(staleBefore);
  });

  it("guards source refresh, retained replacement, and exact-child cascading close", () => {
    const fixture = installedExactParentTransientHistoryV1();
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const childBeforeRefresh = fixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!;
    const sourceRevision = fixture.harness.workspace.issueSourceRevision();
    const refreshProposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision,
      targets: [fixture.parent],
    });
    const refreshBefore = fixture.kernel.getStateInternalV1();
    let refreshGuardCommitted = false;
    const refreshListener = vi.fn(() => {
      expect(refreshGuardCommitted).toBe(true);
      expect(fixture.kernel.getStateInternalV1()).not.toBe(refreshBefore);
    });
    fixture.kernel.subscribeStateInternalV1(refreshListener);
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      refreshProposal,
      Object.freeze({
        commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) {
          expect(contract).not.toBeNull();
          expect(Object.isFrozen(contract)).toBe(true);
          expect(Reflect.ownKeys(contract!)).toEqual([]);
          expect(fixture.kernel.getStateInternalV1()).toBe(refreshBefore);
          expect(refreshListener).not.toHaveBeenCalled();
          refreshGuardCommitted = true;
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(refreshListener).toHaveBeenCalledOnce();
    expect(
      fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances[0],
    ).toBe(childBeforeRefresh);
    expect(
      fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.desiredTarget.sourceRevision,
    ).toBe(sourceRevision);

    const replacementProposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: fixture.harness.workspace.issueSourceRevision(),
      targets: [fixture.harness.workspaceReplacement],
    });
    const replacementBefore = fixture.kernel.getStateInternalV1();
    const rejectedReplacementGuard = vi.fn(() => false);
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      replacementProposal,
      Object.freeze({ commitInternalV1: rejectedReplacementGuard }),
    )).toMatchObject({
      kind: "stale",
      code: "surface.stable_reconcile_precondition_stale",
      delta: { notificationCount: 0 },
    });
    expect(rejectedReplacementGuard).toHaveBeenCalledOnce();
    expect(fixture.kernel.getStateInternalV1()).toBe(replacementBefore);
    let replacementGuardCommitted = false;
    const replacementListener = vi.fn(() => {
      expect(replacementGuardCommitted).toBe(true);
    });
    fixture.kernel.subscribeStateInternalV1(replacementListener);
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      replacementProposal,
      Object.freeze({
        commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) {
          expect(contract).not.toBeNull();
          expect(fixture.kernel.getStateInternalV1()).toBe(replacementBefore);
          expect(replacementListener).not.toHaveBeenCalled();
          replacementGuardCommitted = true;
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(replacementListener).toHaveBeenCalledOnce();
    expect(
      fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances[0],
    ).toBe(childBeforeRefresh);

    const closeFixture = installedExactParentTransientHistoryV1();
    expect(
      closeFixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        closeFixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const closeProposal = evaluateStablePublicationV1({
      harness: closeFixture.harness,
      kernel: closeFixture.kernel,
      publisher: closeFixture.harness.workspace,
      sourceRevision: closeFixture.harness.workspace.issueSourceRevision(),
      targets: [],
    });
    const closeBefore = closeFixture.kernel.getStateInternalV1();
    let closeGuardCommitted = false;
    const closeListener = vi.fn(() => {
      expect(closeGuardCommitted).toBe(true);
      expect(closeFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
        .toEqual([]);
    });
    closeFixture.kernel.subscribeStateInternalV1(closeListener);
    expect(closeFixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      closeProposal,
      Object.freeze({
        commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) {
          expect(contract).toBeNull();
          expect(closeFixture.kernel.getStateInternalV1()).toBe(closeBefore);
          expect(closeListener).not.toHaveBeenCalled();
          closeGuardCommitted = true;
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(closeListener).toHaveBeenCalledOnce();
    expect(closeFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(
      closeFixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        closeFixture.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
  });

  it("opts pending projection refresh into token preservation without changing ordinary retry", () => {
    const ordinaryFixture = stableActionFixtureV1();
    const ordinaryTarget = admitAndApplyStableTargetV1({
      harness: ordinaryFixture.harness,
      kernel: ordinaryFixture.kernel,
      publisher: ordinaryFixture.harness.workspace,
      target: ordinaryFixture.harness.workspaceRoot,
      sourceRevision: ordinaryFixture.harness.workspaceRevision,
    });
    const ordinaryEnvelope = currentStableReadinessEnvelopeV1(
      ordinaryFixture.kernel,
      ordinaryTarget,
    );
    const ordinaryEntryBefore = ordinaryFixture.kernel.getStateInternalV1()
      .stableRuntimeBindings[0]!;
    if (ordinaryEntryBefore.binding.kind !== "preparing") {
      throw new Error("expected ordinary preparation");
    }
    const ordinaryProposal = evaluateStablePublicationV1({
      harness: ordinaryFixture.harness,
      kernel: ordinaryFixture.kernel,
      publisher: ordinaryFixture.harness.workspace,
      sourceRevision: ordinaryFixture.harness.workspace.issueSourceRevision(),
      targets: [ordinaryTarget],
    });
    expect(ordinaryFixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      ordinaryProposal,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({
      kind: "applied",
      delta: {
        runtime: "retry_gaps",
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
    });
    const ordinaryEntryAfter = ordinaryFixture.kernel.getStateInternalV1()
      .stableRuntimeBindings[0]!;
    if (ordinaryEntryAfter.binding.kind !== "preparing") {
      throw new Error("expected ordinary retry preparation");
    }
    expect(ordinaryEntryAfter.binding.attempt.identity).not.toBe(
      ordinaryEntryBefore.binding.attempt.identity,
    );
    expect(ordinaryEntryAfter.binding.attempt.identity.allocation.sequence).toBe(
      ordinaryEntryBefore.binding.attempt.identity.allocation.sequence + 1,
    );
    expect(ordinaryFixture.kernel.settleStableReadinessReadyInternalV1(ordinaryEnvelope))
      .toMatchObject({ kind: "stale", code: "surface.stale_readiness" });

    const initialFixture = stableActionFixtureV1();
    const initialClaimant = Object.freeze({});
    const initialRefreshAuthority =
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        initialFixture.kernel,
        initialClaimant,
      );
    expect(Object.isFrozen(initialRefreshAuthority)).toBe(true);
    expect(Reflect.ownKeys(initialRefreshAuthority)).toEqual([
      "applyPendingProjectionRefreshWithCommitGuardInternalV1",
    ]);
    expect(
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        initialFixture.kernel,
        initialClaimant,
      ),
    ).toBe(initialRefreshAuthority);
    const foreignRefreshAuthority =
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        initialFixture.kernel,
        Object.freeze({}),
      );
    const initialTarget = admitAndApplyStableTargetV1({
      harness: initialFixture.harness,
      kernel: initialFixture.kernel,
      publisher: initialFixture.harness.workspace,
      target: initialFixture.harness.workspaceRoot,
      sourceRevision: initialFixture.harness.workspaceRevision,
    });
    const initialEnvelope = currentStableReadinessEnvelopeV1(
      initialFixture.kernel,
      initialTarget,
    );
    const initialBefore = initialFixture.kernel.getStateInternalV1();
    const initialEntryBefore = initialBefore.stableRuntimeBindings[0]!;
    if (initialEntryBefore.binding.kind !== "preparing") {
      throw new Error("expected initial preparation");
    }
    const initialRefreshSource = initialFixture.harness.workspace.issueSourceRevision();
    const initialRefreshProposal = evaluateStablePublicationV1({
      harness: initialFixture.harness,
      kernel: initialFixture.kernel,
      publisher: initialFixture.harness.workspace,
      sourceRevision: initialRefreshSource,
      targets: [initialTarget],
    });
    expectTypeOf<ExactKeysV1<ManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1>>()
      .toEqualTypeOf<"applyPendingProjectionRefreshWithCommitGuardInternalV1">();
    expect(() =>
      Reflect.apply(
        initialRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1,
        Object.freeze({}),
        [
          initialRefreshProposal,
          initialEntryBefore,
          Object.freeze({ commitInternalV1: () => true }),
        ],
      )
    ).toThrowError("ui.managed_surface_stable_pending_projection_refresh_claim_invalid");
    const initialStateListener = vi.fn();
    const initialTransientListener = vi.fn();
    initialFixture.kernel.subscribeStateInternalV1(initialStateListener);
    initialFixture.kernel.subscribeTransientInternalV1(initialTransientListener);
    expect(initialRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      initialRefreshProposal,
      initialEntryBefore,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
      delta: {
        runtime: "unchanged",
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const initialRefreshed = initialFixture.kernel.getStateInternalV1();
    const initialEntryRefreshed = initialRefreshed.stableRuntimeBindings[0]!;
    expect(initialEntryRefreshed).not.toBe(initialEntryBefore);
    expect(initialEntryRefreshed.desiredTarget.sourceRevision).toBe(initialRefreshSource);
    if (initialEntryRefreshed.binding.kind !== "preparing") {
      throw new Error("expected refreshed initial preparation");
    }
    expect(initialEntryRefreshed.binding.attempt.identity).toBe(
      initialEntryBefore.binding.attempt.identity,
    );
    expect(initialRefreshed.transientState.identitySequenceHighWater).toBe(
      initialBefore.transientState.identitySequenceHighWater,
    );
    expect(initialStateListener).toHaveBeenCalledOnce();
    expect(initialTransientListener).not.toHaveBeenCalled();
    const secondRefreshSource = initialFixture.harness.workspace.issueSourceRevision();
    const secondRefreshProposal = evaluateStablePublicationV1({
      harness: initialFixture.harness,
      kernel: initialFixture.kernel,
      publisher: initialFixture.harness.workspace,
      sourceRevision: secondRefreshSource,
      targets: [initialTarget],
    });
    const staleGuard = vi.fn(() => true);
    expect(initialRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      secondRefreshProposal,
      initialEntryBefore,
      Object.freeze({ commitInternalV1: staleGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stable_reconcile_precondition_stale" });
    expect(staleGuard).not.toHaveBeenCalled();
    const cloneGuard = vi.fn(() => true);
    expect(initialRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      secondRefreshProposal,
      Object.freeze({ ...initialEntryRefreshed }),
      Object.freeze({ commitInternalV1: cloneGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stable_reconcile_precondition_stale" });
    expect(cloneGuard).not.toHaveBeenCalled();
    const foreignGuard = vi.fn(() => true);
    expect(foreignRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      secondRefreshProposal,
      initialEntryRefreshed,
      Object.freeze({ commitInternalV1: foreignGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stable_reconcile_precondition_stale" });
    expect(foreignGuard).not.toHaveBeenCalled();
    expect(initialRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      secondRefreshProposal,
      initialEntryRefreshed,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({
      kind: "applied",
      delta: {
        runtime: "unchanged",
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    expect(initialFixture.kernel.settleStableReadinessReadyInternalV1(initialEnvelope))
      .toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    const initialCaptured = initialFixture.authority.captureCurrentStableInputInternalV1();
    if (initialCaptured.kind !== "captured") throw new Error("expected refreshed initial input");
    expect(initialCaptured.directTarget).toBe(initialTarget);
    expect(initialCaptured.sourceRevision).toBe(secondRefreshSource);
    const initialSettled = initialFixture.kernel.getStateInternalV1();
    const replayGuard = vi.fn(() => true);
    expect(initialFixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
      Object.freeze({
        ...initialEnvelope,
        readinessEvidence: Object.freeze({ ...initialEnvelope.readinessEvidence }),
      }),
      Object.freeze({ commitInternalV1: replayGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stale_readiness" });
    expect(replayGuard).not.toHaveBeenCalled();
    expect(initialFixture.kernel.getStateInternalV1()).toBe(initialSettled);

    const replacementFixture = stableActionFixtureV1();
    const replacementRefreshAuthority:
      ManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1 =
        claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
          replacementFixture.kernel,
          Object.freeze({}),
        );
    publishReadyStableTargetV1({
      fixture: replacementFixture,
      publisher: replacementFixture.harness.workspace,
      target: replacementFixture.harness.workspaceRoot,
      sourceRevision: replacementFixture.harness.workspaceRevision,
    });
    const replacementTarget = admitAndApplyStableTargetV1({
      harness: replacementFixture.harness,
      kernel: replacementFixture.kernel,
      publisher: replacementFixture.harness.workspace,
      target: replacementFixture.harness.workspaceReplacement,
      sourceRevision: replacementFixture.harness.workspaceReplacementRevision,
    });
    const replacementEnvelope = currentStableReadinessEnvelopeV1(
      replacementFixture.kernel,
      replacementTarget,
    );
    const replacementBefore = replacementFixture.kernel.getStateInternalV1();
    const replacementEntryBefore = replacementBefore.stableRuntimeBindings[0]!;
    if (replacementEntryBefore.binding.kind !== "preparing") {
      throw new Error("expected replacement preparation");
    }
    const replacementRefreshSource = replacementFixture.harness.workspace.issueSourceRevision();
    const replacementRefreshProposal = evaluateStablePublicationV1({
      harness: replacementFixture.harness,
      kernel: replacementFixture.kernel,
      publisher: replacementFixture.harness.workspace,
      sourceRevision: replacementRefreshSource,
      targets: [replacementTarget],
    });
    expect(replacementRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      replacementRefreshProposal,
      replacementEntryBefore,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({
      kind: "applied",
      delta: {
        runtime: "unchanged",
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    const replacementRefreshed = replacementFixture.kernel.getStateInternalV1();
    const replacementEntryRefreshed = replacementRefreshed.stableRuntimeBindings[0]!;
    expect(replacementEntryRefreshed.desiredTarget.sourceRevision).toBe(
      replacementRefreshSource,
    );
    if (replacementEntryRefreshed.binding.kind !== "preparing") {
      throw new Error("expected refreshed replacement preparation");
    }
    expect(replacementEntryRefreshed.binding.attempt.identity).toBe(
      replacementEntryBefore.binding.attempt.identity,
    );
    expect(replacementEntryRefreshed.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
      retainedSubtree: replacementEntryBefore.binding.retainedSubtree,
    });
    expect(replacementRefreshed.transientState.identitySequenceHighWater).toBe(
      replacementBefore.transientState.identitySequenceHighWater,
    );
    const replacementSecondSource = replacementFixture.harness.workspace.issueSourceRevision();
    const replacementSecondProposal = evaluateStablePublicationV1({
      harness: replacementFixture.harness,
      kernel: replacementFixture.kernel,
      publisher: replacementFixture.harness.workspace,
      sourceRevision: replacementSecondSource,
      targets: [replacementTarget],
    });
    expect(replacementRefreshAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      replacementSecondProposal,
      replacementEntryRefreshed,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({
      kind: "applied",
      delta: {
        runtime: "unchanged",
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    });
    expect(replacementFixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
      replacementEnvelope,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    const replacementCaptured = replacementFixture.authority.captureCurrentStableInputInternalV1();
    if (replacementCaptured.kind !== "captured") {
      throw new Error("expected refreshed replacement input");
    }
    expect(replacementCaptured.directTarget).toBe(replacementTarget);
    expect(replacementCaptured.sourceRevision).toBe(replacementSecondSource);
  });

  it("guards opt-in refresh atomically and leaves rejected plans reusable", () => {
    const rows = [
      Object.freeze({
        commit: vi.fn(() => false),
        expected: Object.freeze({
          kind: "stale" as const,
          code: "surface.stable_reconcile_precondition_stale" as const,
        }),
      }),
      Object.freeze({
        commit: vi.fn(() => {
          throw new Error("refresh guard fault");
        }),
        expected: Object.freeze({
          kind: "faulted" as const,
          code: "surface.stable_reconcile_faulted" as const,
        }),
      }),
      Object.freeze({
        commit: vi.fn(() => "true" as unknown as boolean),
        expected: Object.freeze({
          kind: "faulted" as const,
          code: "surface.stable_reconcile_faulted" as const,
        }),
      }),
    ];
    for (const row of rows) {
      const fixture = stableActionFixtureV1();
      const target = admitAndApplyStableTargetV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        target: fixture.harness.workspaceRoot,
        sourceRevision: fixture.harness.workspaceRevision,
      });
      const authority = claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        fixture.kernel,
        Object.freeze({}),
      );
      const entry = fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
      const proposal = evaluateStablePublicationV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        sourceRevision: fixture.harness.workspace.issueSourceRevision(),
        targets: [target],
      });
      const before = fixture.kernel.getStateInternalV1();
      let committed = false;
      const listener = vi.fn(() => {
        expect(committed).toBe(true);
      });
      fixture.kernel.subscribeStateInternalV1(listener);
      expect(authority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
        proposal,
        entry,
        Object.freeze({ commitInternalV1: row.commit }),
      )).toMatchObject(row.expected);
      expect(row.commit).toHaveBeenCalledOnce();
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(authority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
        proposal,
        entry,
        Object.freeze({
          commitInternalV1() {
            expect(fixture.kernel.getStateInternalV1()).toBe(before);
            expect(listener).not.toHaveBeenCalled();
            committed = true;
            return true;
          },
        }),
      )).toMatchObject({ kind: "applied" });
      expect(listener).toHaveBeenCalledOnce();
    }
  });

  it("rejects nonpending, nonroot, multivector, and changed-vector opt-in inputs before guard", () => {
    const readyFixture = stableActionFixtureV1();
    const readyTarget = publishReadyStableTargetV1({
      fixture: readyFixture,
      publisher: readyFixture.harness.workspace,
      target: readyFixture.harness.workspaceRoot,
      sourceRevision: readyFixture.harness.workspaceRevision,
    });
    const readyEntry = readyFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    const readyProposal = evaluateStablePublicationV1({
      harness: readyFixture.harness,
      kernel: readyFixture.kernel,
      publisher: readyFixture.harness.workspace,
      sourceRevision: readyFixture.harness.workspace.issueSourceRevision(),
      targets: [readyTarget],
    });
    const readyGuard = vi.fn(() => true);
    expect(
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        readyFixture.kernel,
        Object.freeze({}),
      ).applyPendingProjectionRefreshWithCommitGuardInternalV1(
        readyProposal,
        readyEntry,
        Object.freeze({ commitInternalV1: readyGuard }),
      ),
    ).toMatchObject({ kind: "faulted", code: "surface.stable_reconcile_faulted" });
    expect(readyGuard).not.toHaveBeenCalled();

    const changedFixture = stableActionFixtureV1();
    admitAndApplyStableTargetV1({
      harness: changedFixture.harness,
      kernel: changedFixture.kernel,
      publisher: changedFixture.harness.workspace,
      target: changedFixture.harness.workspaceRoot,
      sourceRevision: changedFixture.harness.workspaceRevision,
    });
    const changedEntry = changedFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    const changedProposal = evaluateStablePublicationV1({
      harness: changedFixture.harness,
      kernel: changedFixture.kernel,
      publisher: changedFixture.harness.workspace,
      sourceRevision: changedFixture.harness.workspace.issueSourceRevision(),
      targets: [changedFixture.harness.workspaceReplacement],
    });
    const changedGuard = vi.fn(() => true);
    expect(
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        changedFixture.kernel,
        Object.freeze({}),
      ).applyPendingProjectionRefreshWithCommitGuardInternalV1(
        changedProposal,
        changedEntry,
        Object.freeze({ commitInternalV1: changedGuard }),
      ),
    ).toMatchObject({ kind: "faulted", code: "surface.stable_reconcile_faulted" });
    expect(changedGuard).not.toHaveBeenCalled();

    const childFixture = stableActionFixtureV1();
    const initialVector = evaluateStablePublicationV1({
      harness: childFixture.harness,
      kernel: childFixture.kernel,
      publisher: childFixture.harness.workspace,
      sourceRevision: childFixture.harness.workspaceRevision,
      targets: [childFixture.harness.workspaceRoot, childFixture.harness.workspaceChild],
    });
    expect(childFixture.kernel.applyStableAdmissionProposalInternalV1(initialVector)).toMatchObject(
      {
        kind: "applied",
      },
    );
    const childEntry = childFixture.kernel.getStateInternalV1().stableRuntimeBindings[1]!;
    const childProposal = evaluateStablePublicationV1({
      harness: childFixture.harness,
      kernel: childFixture.kernel,
      publisher: childFixture.harness.workspace,
      sourceRevision: childFixture.harness.workspace.issueSourceRevision(),
      targets: [childFixture.harness.workspaceRoot, childFixture.harness.workspaceChild],
    });
    const childGuard = vi.fn(() => true);
    expect(
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        childFixture.kernel,
        Object.freeze({}),
      ).applyPendingProjectionRefreshWithCommitGuardInternalV1(
        childProposal,
        childEntry,
        Object.freeze({ commitInternalV1: childGuard }),
      ),
    ).toMatchObject({ kind: "faulted", code: "surface.stable_reconcile_faulted" });
    expect(childGuard).not.toHaveBeenCalled();

    const failedFixture = stableActionFixtureV1();
    const failedTarget = admitAndApplyStableTargetV1({
      harness: failedFixture.harness,
      kernel: failedFixture.kernel,
      publisher: failedFixture.harness.workspace,
      target: failedFixture.harness.workspaceRoot,
      sourceRevision: failedFixture.harness.workspaceRevision,
    });
    const failedEnvelope = currentStableReadinessEnvelopeV1(
      failedFixture.kernel,
      failedTarget,
    );
    const failedAuthority = claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
      failedFixture.kernel,
      Object.freeze({}),
    );
    const failedPreparingEntry = failedFixture.kernel.getStateInternalV1()
      .stableRuntimeBindings[0]!;
    const failedRefresh = evaluateStablePublicationV1({
      harness: failedFixture.harness,
      kernel: failedFixture.kernel,
      publisher: failedFixture.harness.workspace,
      sourceRevision: failedFixture.harness.workspace.issueSourceRevision(),
      targets: [failedTarget],
    });
    expect(failedAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      failedRefresh,
      failedPreparingEntry,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied" });
    expect(failedFixture.kernel.settleStableReadinessFailedInternalV1(failedEnvelope))
      .toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    const failedEntry = failedFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    const retryProposal = evaluateStablePublicationV1({
      harness: failedFixture.harness,
      kernel: failedFixture.kernel,
      publisher: failedFixture.harness.workspace,
      sourceRevision: failedFixture.harness.workspace.issueSourceRevision(),
      targets: [failedTarget],
    });
    const failedGuard = vi.fn(() => true);
    expect(failedAuthority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      retryProposal,
      failedEntry,
      Object.freeze({ commitInternalV1: failedGuard }),
    )).toMatchObject({ kind: "faulted", code: "surface.stable_reconcile_faulted" });
    expect(failedGuard).not.toHaveBeenCalled();
  });

  it("keeps 10,000 opt-in pending refreshes on one preparation identity", () => {
    const fixture = stableActionFixtureV1();
    const target = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceRoot,
      sourceRevision: fixture.harness.workspaceRevision,
    });
    const authority = claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
      fixture.kernel,
      Object.freeze({}),
    );
    const initialState = fixture.kernel.getStateInternalV1();
    const initialEntry = initialState.stableRuntimeBindings[0]!;
    if (initialEntry.binding.kind !== "preparing") throw new Error("expected preparation");
    const identity = initialEntry.binding.attempt.identity;
    const highWater = initialState.transientState.identitySequenceHighWater;
    let firstProposal: ReturnType<typeof evaluateStablePublicationV1> | null = null;
    let latestSource = fixture.harness.workspaceRevision;
    for (let index = 0; index < 10_000; index += 1) {
      latestSource = fixture.harness.workspace.issueSourceRevision();
      const proposal = evaluateStablePublicationV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        sourceRevision: latestSource,
        targets: [target],
      });
      firstProposal ??= proposal;
      const currentEntry = fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
      const result = authority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
        proposal,
        currentEntry,
        Object.freeze({ commitInternalV1: () => true }),
      );
      if (result.kind !== "applied") {
        throw new Error(`expected applied refresh at cycle ${index}, got ${result.kind}`);
      }
    }
    const finalState = fixture.kernel.getStateInternalV1();
    const finalEntry = finalState.stableRuntimeBindings[0]!;
    if (finalEntry.binding.kind !== "preparing") throw new Error("expected final preparation");
    expect(
      finalState.stableAcceptedBaselines.filter((baseline) =>
        baseline.publisherLease === fixture.harness.workspace.lease
      ),
    ).toHaveLength(1);
    expect(finalState.stableRuntimeBindings).toHaveLength(1);
    expect(finalEntry.binding.attempt.identity).toBe(identity);
    expect(finalEntry.desiredTarget.sourceRevision).toBe(latestSource);
    expect(finalState.transientState.identitySequenceHighWater).toBe(highWater);
    const staleGuard = vi.fn(() => true);
    expect(authority.applyPendingProjectionRefreshWithCommitGuardInternalV1(
      firstProposal!,
      initialEntry,
      Object.freeze({ commitInternalV1: staleGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stable_reconcile_precondition_stale" });
    expect(staleGuard).not.toHaveBeenCalled();
  }, 30_000);
});

describe("managed stable exact-parent transient-child authority", () => {
  it("claims one exact retained authority per claimant and inspects neither claimant", () => {
    const fixture = stableActionFixtureV1();
    const exactClaimant = Object.freeze({});
    const authority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      exactClaimant,
    );

    expect(Object.isFrozen(authority)).toBe(true);
    expect(Reflect.ownKeys(authority)).toEqual([
      "prepareExactParentTransientChildInternalV1",
      "captureRetainedExactParentInputInternalV1",
    ]);
    expect(
      claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
        fixture.kernel,
        exactClaimant,
      ),
    ).toBe(authority);

    const claimantTrap = vi.fn();
    const foreignClaimant = new Proxy(Object.freeze({}), {
      getOwnPropertyDescriptor() {
        claimantTrap();
        throw new Error("foreign claimant inspected");
      },
      get() {
        claimantTrap();
        throw new Error("foreign claimant read");
      },
      ownKeys() {
        claimantTrap();
        throw new Error("foreign claimant enumerated");
      },
    });
    const foreignAuthority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      foreignClaimant,
    );
    expect(foreignAuthority).not.toBe(authority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
        fixture.kernel,
        foreignClaimant,
      ),
    ).toBe(foreignAuthority);
    expect(claimantTrap).not.toHaveBeenCalled();
    expect(() =>
      claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
        {} as ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
        exactClaimant,
      )
    ).toThrowError("ui.managed_surface_stable_exact_parent_transient_child_claim_invalid");

    const prepare = authority.prepareExactParentTransientChildInternalV1;
    expect(() => Reflect.apply(prepare, Object.freeze({}), [Object.freeze({})])).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_claim_invalid",
    );
  });

  it("partitions all four claims and candidate/action provenance by exact claimant", () => {
    const fixture = installedExactParentTransientHistoryV1();
    const secondClaimant = Object.freeze({});
    const preparationB = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      secondClaimant,
    );
    const readinessB =
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      );
    const lifecycleA =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const lifecycleB =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      );
    const actionB =
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      );

    expect(preparationB).not.toBe(fixture.authority);
    expect(readinessB).not.toBe(fixture.readinessAuthority);
    expect(lifecycleB).not.toBe(lifecycleA);
    expect(actionB).not.toBe(fixture.childActionAuthority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      ),
    ).toBe(preparationB);
    expect(
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      ),
    ).toBe(readinessB);
    expect(
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      ),
    ).toBe(lifecycleB);
    expect(
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        secondClaimant,
      ),
    ).toBe(actionB);

    const beforeCrossFamilyTokens = fixture.kernel.getStateInternalV1();
    const readinessGuard = vi.fn(() => false);
    expect(() =>
      readinessB.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: readinessGuard }),
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
    );
    const lifecycleGuard = vi.fn(() => false);
    expect(() =>
      lifecycleB.closeExactParentTransientChildInternalV1(
        fixture.candidate,
        lifecycleGuardV1(lifecycleGuard),
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );
    expect(() => actionB.captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate))
      .toThrowError(
        "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
      );
    expect(readinessGuard).not.toHaveBeenCalled();
    expect(lifecycleGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(beforeCrossFamilyTokens);

    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const captured = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    if (captured.kind !== "captured") throw new Error("expected captured child input");
    const beforeCrossFamilyAction = fixture.kernel.getStateInternalV1();
    expect(actionB.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: captured.contract.applicationEpoch,
        topologyRevision: captured.contract.topologyRevision,
        surfaceInstanceId: captured.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: captured.contract.routingLeaseId,
    }))).toMatchObject({ kind: "stale", code: "surface.stale_instance" });
    expect(fixture.kernel.getStateInternalV1()).toBe(beforeCrossFamilyAction);

    expect(
      lifecycleA.closeExactParentTransientChildInternalV1(
        fixture.candidate,
        lifecycleGuardV1(() => true),
      ),
    ).toEqual({ kind: "applied", code: "surface.closed" });
    const parentCaptureB = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    ).captureCurrentStableInputInternalV1();
    if (
      parentCaptureB.kind !== "captured" || parentCaptureB.targetProof === null ||
      parentCaptureB.directTarget === null || parentCaptureB.sourceRevision === null
    ) {
      throw new Error("expected refreshed stable parent proof");
    }
    const installedB = preparationB.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: parentCaptureB.targetProof,
      expectedParent: parentCaptureB.directTarget,
      expectedSourceRevision: parentCaptureB.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: () => true }),
    }));
    if (installedB.kind !== "installed") {
      throw new Error(`expected second claimant install, got ${installedB.kind}`);
    }
    expect(
      readinessB.settleExactParentTransientChildReadinessReadyInternalV1(
        installedB.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const capturedB = actionB.captureCurrentExactParentTransientChildInputInternalV1(
      installedB.candidate,
    );
    if (capturedB.kind !== "captured") throw new Error("expected second claimant input");
    expect(actionB.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: capturedB.contract.applicationEpoch,
        topologyRevision: capturedB.contract.topologyRevision,
        surfaceInstanceId: capturedB.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: capturedB.contract.routingLeaseId,
    }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    expect(
      lifecycleB.closeExactParentTransientChildInternalV1(
        installedB.candidate,
        lifecycleGuardV1(() => true),
      ),
    ).toEqual({ kind: "applied", code: "surface.closed" });
    expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toEqual([]);
  });

  it("atomically replaces one current same-claimant child without exposing an active parent", () => {
    const fixture = installedExactParentTransientHistoryV1();
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const capturedBeforeRefresh = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    if (capturedBeforeRefresh.kind !== "captured") {
      throw new Error("expected current child action and parent frame");
    }
    expect(capturedBeforeRefresh.parentDirectTarget).toBe(fixture.parent);
    expect(capturedBeforeRefresh.parentSourceRevision).toBe(fixture.expectedSourceRevision);
    expect(Object.isFrozen(capturedBeforeRefresh.parentTargetProof)).toBe(true);
    expect(Reflect.ownKeys(capturedBeforeRefresh.parentTargetProof)).toEqual([]);

    const refreshedSourceRevision = fixture.harness.workspace.issueSourceRevision();
    const refreshProposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: refreshedSourceRevision,
      targets: [fixture.parent],
    });
    const beforeRefresh = fixture.kernel.getStateInternalV1();
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      refreshProposal,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const captured = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    if (captured.kind !== "captured") {
      throw new Error("expected refreshed current child action and parent frame");
    }
    expect(captured.contract.surfaceInstanceId).toBe(
      capturedBeforeRefresh.contract.surfaceInstanceId,
    );
    expect(captured.parentDirectTarget).toBe(capturedBeforeRefresh.parentDirectTarget);
    expect(captured.parentSourceRevision).toBe(refreshedSourceRevision);
    expect(captured.parentTargetProof).not.toBe(capturedBeforeRefresh.parentTargetProof);
    expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances[0])
      .toBe(beforeRefresh.transientState.publication.orderedInstances[0]);

    const staleSourceBefore = fixture.kernel.getStateInternalV1();
    const staleSourceGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: capturedBeforeRefresh.parentTargetProof,
      expectedParent: capturedBeforeRefresh.parentDirectTarget,
      expectedSourceRevision: capturedBeforeRefresh.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: staleSourceGuard }),
    }))).toEqual({ kind: "stale" });
    expect(staleSourceGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(staleSourceBefore);

    const foreignClaimant = Object.freeze({});
    const foreignAuthority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      foreignClaimant,
    );
    const foreignActionAuthority =
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        foreignClaimant,
      );
    expect(() =>
      foreignActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        fixture.candidate,
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
    );
    const foreignBefore = fixture.kernel.getStateInternalV1();
    const foreignGuard = vi.fn(() => true);
    expect(foreignAuthority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: captured.parentTargetProof,
      expectedParent: captured.parentDirectTarget,
      expectedSourceRevision: captured.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: foreignGuard }),
    }))).toEqual({ kind: "stale" });
    expect(foreignGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(foreignBefore);

    const before = fixture.kernel.getStateInternalV1();
    const [currentChild] = before.transientState.publication.orderedInstances;
    expect(currentChild).toMatchObject({ readiness: { kind: "ready" }, phase: "active" });
    const currentParent = before.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === fixture.parent
    );
    expect(currentParent?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "suspended" },
    });

    const assertAtomicReplacement = () => {
      const state = fixture.kernel.getStateInternalV1();
      expect(state.transientState.publication.orderedInstances).toHaveLength(1);
      expect(
        state.stableRuntimeBindings.find((entry) =>
          entry.desiredTarget.admittedTarget === fixture.parent
        )?.binding,
      ).toMatchObject({
        kind: "ready_instance",
        instance: { phase: "suspended" },
      });
    };
    const transientListener = vi.fn(assertAtomicReplacement);
    const stateListener = vi.fn(assertAtomicReplacement);
    fixture.kernel.subscribeTransientInternalV1(transientListener);
    fixture.kernel.subscribeStateInternalV1(stateListener);
    const guard = vi.fn(() => {
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      return true;
    });

    const installed = fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: captured.parentTargetProof,
      expectedParent: captured.parentDirectTarget,
      expectedSourceRevision: captured.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: guard }),
    }));

    if (installed.kind !== "installed") {
      throw new Error(`expected replacement install, got ${installed.kind}`);
    }
    expect(installed.candidate).not.toBe(fixture.candidate);
    expect(guard).toHaveBeenCalledOnce();
    expect(transientListener).toHaveBeenCalledOnce();
    expect(stateListener).toHaveBeenCalledOnce();
    const after = fixture.kernel.getStateInternalV1();
    expect(after).not.toBe(before);
    expect(after.transientState.publication.publicationRevision).toBe(
      before.transientState.publication.publicationRevision + 1,
    );
    expect(after.transientState.publication.topologyRevision).toBe(
      before.transientState.publication.topologyRevision + 1,
    );
    expect(after.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    const [replacementChild] = after.transientState.publication.orderedInstances;
    expect(replacementChild).toMatchObject({
      parentInstanceId: currentChild?.parentInstanceId,
      readiness: { kind: "preparing", transition: "child_open" },
      phase: "preparing",
    });
    expect(replacementChild).not.toBe(currentChild);
    expect(replacementChild?.surfaceInstanceId).not.toBe(currentChild?.surfaceInstanceId);
    expect(after.transientState.publication.inputOwner).toBeNull();
    expect(
      after.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === fixture.parent
      )?.binding,
    ).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "suspended" },
    });

    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        installed.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const replacementCapture = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(installed.candidate);
    if (replacementCapture.kind !== "captured") {
      throw new Error("expected replacement child action and parent frame");
    }
    expect(replacementCapture.contract.surfaceInstanceId).toBe(
      replacementChild?.surfaceInstanceId,
    );
    expect(replacementCapture.parentDirectTarget).toBe(fixture.parent);
    expect(replacementCapture.parentSourceRevision).toBe(refreshedSourceRevision);
    expect(replacementCapture.parentTargetProof).not.toBe(captured.parentTargetProof);
    expect(fixture.childActionAuthority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: replacementCapture.contract.applicationEpoch,
        topologyRevision: replacementCapture.contract.topologyRevision,
        surfaceInstanceId: replacementCapture.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: replacementCapture.contract.routingLeaseId,
    }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });

    const predecessorZeroBefore = fixture.kernel.getStateInternalV1();
    const staleReadinessGuard = vi.fn(() => true);
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: staleReadinessGuard }),
      ),
    ).toEqual({ kind: "stale" });
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessFailedInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: staleReadinessGuard }),
      ),
    ).toEqual({ kind: "stale" });
    expect(staleReadinessGuard).not.toHaveBeenCalled();
    const lifecycleAuthority =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const staleLifecycleGuard = vi.fn(() => true);
    expect(lifecycleAuthority.closeExactParentTransientChildInternalV1(
      fixture.candidate,
      lifecycleGuardV1(staleLifecycleGuard),
    )).toEqual({ kind: "stale" });
    expect(lifecycleAuthority.dismissExactParentTransientChildInternalV1(
      fixture.candidate,
      "back",
      lifecycleGuardV1(staleLifecycleGuard),
    )).toEqual({ kind: "stale" });
    expect(staleLifecycleGuard).not.toHaveBeenCalled();
    expect(
      fixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        fixture.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(fixture.childActionAuthority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: capturedBeforeRefresh.contract.applicationEpoch,
        topologyRevision: capturedBeforeRefresh.contract.topologyRevision,
        surfaceInstanceId: capturedBeforeRefresh.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: capturedBeforeRefresh.contract.routingLeaseId,
    }))).toMatchObject({ kind: "stale", code: "surface.stale_topology_revision" });
    const staleFrameGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: captured.parentTargetProof,
      expectedParent: captured.parentDirectTarget,
      expectedSourceRevision: captured.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: staleFrameGuard }),
    }))).toEqual({ kind: "stale" });
    expect(staleFrameGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(predecessorZeroBefore);
  });

  it("freezes the exact source-relative authority, guard, candidate, and result shapes", () => {
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1>
    >().toEqualTypeOf<
      | "prepareExactParentTransientChildInternalV1"
      | "captureRetainedExactParentInputInternalV1"
    >();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1>
    >().toEqualTypeOf<"commitInternalV1">();
    expectTypeOf<
      ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1["commitInternalV1"]
    >().toEqualTypeOf<
      (candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1) => boolean
    >();
    expectTypeOf<
      ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1["kind"]
    >().toEqualTypeOf<"installed" | "stale" | "faulted">();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1>
    >().toEqualTypeOf<"kind" | "candidate">();
  });

  it("atomically installs one exact cross-axis child through the captured guard", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const before = fixture.kernel.getStateInternalV1();
    const parentEntry = before.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === fixture.parent
    );
    if (parentEntry?.binding.kind !== "ready_instance") {
      throw new Error("expected ready stable parent");
    }
    const parentInstanceId = parentEntry.binding.instance.attempt.identity.surfaceInstanceId;
    const observed: string[] = [];
    fixture.kernel.subscribeTransientInternalV1(() => {
      const state = fixture.kernel.getStateInternalV1();
      expect(state).not.toBe(before);
      expect(state.transientState.publication.orderedInstances).toHaveLength(1);
      observed.push("transient");
    });
    fixture.kernel.subscribeStateInternalV1(() => {
      expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
        .toHaveLength(1);
      observed.push("state");
    });
    let guardedCandidate:
      | ManagedSurfaceStableExactParentTransientChildCandidateInternalV1
      | null = null;
    const guard = vi.fn((
      candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
    ) => {
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(Reflect.ownKeys(candidate)).toEqual([]);
      guardedCandidate = candidate;
      return true;
    });

    const result = prepareExactParentTransientHistoryV1(fixture, guard);

    expect(result.kind).toBe("installed");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Reflect.ownKeys(result)).toEqual(["kind", "candidate"]);
    if (result.kind !== "installed") throw new Error("expected installed child");
    expect(result.candidate).toBe(guardedCandidate);
    expect(guard).toHaveBeenCalledTimes(1);
    expect(observed).toEqual(["transient", "state"]);
    const installed = fixture.kernel.getStateInternalV1();
    expect(installed.transientState.identitySequenceHighWater).toBe(
      before.transientState.identitySequenceHighWater + 1,
    );
    expect(installed.transientState.publication.topologyRevision).toBe(
      before.transientState.publication.topologyRevision + 1,
    );
    expect(installed.transientState.publication.publicationRevision).toBe(
      before.transientState.publication.publicationRevision + 1,
    );
    const [history] = installed.transientState.publication.orderedInstances;
    expect(history).toMatchObject({
      parentInstanceId,
      definition: {
        definitionId: historyDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: historySlotV1,
        placement: "child",
      },
      semanticOccurrenceId: null,
      phase: "preparing",
      readiness: { kind: "preparing", transition: "child_open" },
    });
    expect(
      installed.transientState.publication.orderedInstances.some((instance) =>
        instance.surfaceInstanceId === parentInstanceId
      ),
    ).toBe(false);
    const phasedParent = installed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === fixture.parent
    );
    expect(phasedParent?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "suspended" },
    });
  });

  it("keeps false-gate aborts and capacity faults exact, unallocated, and retryable", () => {
    const abortedFixture = exactParentTransientChildFixtureV1();
    const beforeAbort = abortedFixture.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    abortedFixture.kernel.subscribeStateInternalV1(stateListener);
    abortedFixture.kernel.subscribeTransientInternalV1(transientListener);
    const falseGuard = vi.fn(() => false);

    const aborted = prepareExactParentTransientHistoryV1(abortedFixture, falseGuard);

    expect(aborted).toEqual({ kind: "stale" });
    expect(Object.isFrozen(aborted)).toBe(true);
    expect(falseGuard).toHaveBeenCalledTimes(1);
    expect(abortedFixture.kernel.getStateInternalV1()).toBe(beforeAbort);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
    const retried = prepareExactParentTransientHistoryV1(abortedFixture, () => true);
    expect(retried.kind).toBe("installed");

    const capacityFixture = exactParentTransientChildFixtureV1({
      identitySequenceHighWater: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER - 1),
    });
    const beforeFault = capacityFixture.kernel.getStateInternalV1();
    expect(beforeFault.transientState.identitySequenceHighWater).toBe(Number.MAX_SAFE_INTEGER);
    const faultGuard = vi.fn(() => true);
    const faulted = prepareExactParentTransientHistoryV1(capacityFixture, faultGuard);
    expect(faulted).toEqual({ kind: "faulted" });
    expect(Object.isFrozen(faulted)).toBe(true);
    expect(Reflect.ownKeys(faulted)).toEqual(["kind"]);
    expect(faultGuard).not.toHaveBeenCalled();
    expect(capacityFixture.kernel.getStateInternalV1()).toBe(beforeFault);
  });

  it("notifies only after install and makes listener reentry observe the stale proof", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const nested: ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1[] = [];
    fixture.kernel.subscribeTransientInternalV1(() => {
      nested.push(prepareExactParentTransientHistoryV1(fixture, () => true));
    });
    fixture.kernel.subscribeStateInternalV1(() => {
      nested.push(prepareExactParentTransientHistoryV1(fixture, () => true));
    });

    const installed = prepareExactParentTransientHistoryV1(fixture, () => true);

    expect(installed.kind).toBe("installed");
    expect(nested).toHaveLength(2);
    expect(nested[0]).toEqual({ kind: "stale" });
    expect(nested[1]).toBe(nested[0]);
    expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toHaveLength(1);
  });

  it("returns historical installed after a listener immediately retires the authenticated child", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const readinessAuthority =
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    let installedCandidate:
      | ManagedSurfaceStableExactParentTransientChildCandidateInternalV1
      | null = null;
    let retired = false;
    let unsubscribe = (): void => {};
    unsubscribe = fixture.kernel.subscribeTransientInternalV1(() => {
      unsubscribe();
      if (installedCandidate === null) {
        throw new Error("expected authenticated candidate before listener retire");
      }
      expect(readinessAuthority.settleExactParentTransientChildReadinessFailedInternalV1(
        installedCandidate,
        Object.freeze({ commitInternalV1: () => true }),
      )).toEqual({ kind: "applied" });
      retired = true;
    });

    const historical = prepareExactParentTransientHistoryV1(fixture, (candidate) => {
      installedCandidate = candidate;
      return true;
    });

    expect(historical.kind).toBe("installed");
    expect(retired).toBe(true);
    const current = fixture.kernel.getStateInternalV1();
    expect(current.transientState.publication.orderedInstances).toEqual([]);
    expect(current.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
  });

  it("rejects foreign proof/parent/source and faults invalid definition/guard with exact zero", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const foreign = exactParentTransientChildFixtureV1();
    const before = fixture.kernel.getStateInternalV1();
    const guard = vi.fn(() => true);
    const commitGuard = Object.freeze({ commitInternalV1: guard });
    const call = (
      input: Readonly<{
        readonly parentProof: unknown;
        readonly expectedParent: unknown;
        readonly expectedSourceRevision: unknown;
        readonly definition: ManagedSurfaceResolvedDefinitionV1;
        readonly commitGuard: object;
      }>,
    ) =>
      fixture.authority.prepareExactParentTransientChildInternalV1(
        Object.freeze({
          ...input,
          semanticOccurrenceId: null,
        }) as Parameters<
          ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1[
            "prepareExactParentTransientChildInternalV1"
          ]
        >[0],
      );
    const staleRows = [
      call({
        parentProof: foreign.parentProof,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.expectedSourceRevision,
        definition: fixture.harness.historyDefinition,
        commitGuard,
      }),
      call({
        parentProof: fixture.parentProof,
        expectedParent: fixture.harness.workspaceReplacement,
        expectedSourceRevision: fixture.expectedSourceRevision,
        definition: fixture.harness.historyDefinition,
        commitGuard,
      }),
      call({
        parentProof: fixture.parentProof,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.harness.workspaceReplacementRevision,
        definition: fixture.harness.historyDefinition,
        commitGuard,
      }),
    ];
    expect(staleRows.every((row) => row.kind === "stale")).toBe(true);
    expect(staleRows[1]).toBe(staleRows[0]);
    expect(staleRows[2]).toBe(staleRows[0]);

    const foreignOwnerDefinition = Object.freeze({
      ...fixture.harness.historyDefinition,
      ownerId: narrativeOwnerIdV1,
    });
    const stackSlotDefinition = Object.freeze({
      ...fixture.harness.historyDefinition,
      slotId: childSlotV1,
    });
    const extraGuard = Object.freeze({ commitInternalV1: guard, extra: true });
    const faultRows = [
      call({
        parentProof: fixture.parentProof,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.expectedSourceRevision,
        definition: foreignOwnerDefinition,
        commitGuard,
      }),
      call({
        parentProof: fixture.parentProof,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.expectedSourceRevision,
        definition: stackSlotDefinition,
        commitGuard,
      }),
      call({
        parentProof: fixture.parentProof,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.expectedSourceRevision,
        definition: fixture.harness.historyDefinition,
        commitGuard: extraGuard,
      }),
    ];
    expect(faultRows.every((row) => row.kind === "faulted")).toBe(true);
    expect(faultRows[1]).toBe(faultRows[0]);
    expect(faultRows[2]).toBe(faultRows[0]);
    expect(guard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
  });

  it("retains the exact child through replacement preparation/failure and cascades on cutover", () => {
    const retainedFixture = exactParentTransientChildFixtureV1();
    expect(prepareExactParentTransientHistoryV1(retainedFixture, () => true).kind).toBe(
      "installed",
    );
    const retainedChild = retainedFixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!;
    const retainedParentId = retainedChild.parentInstanceId;
    const replacement = admitAndApplyStableTargetV1({
      harness: retainedFixture.harness,
      kernel: retainedFixture.kernel,
      publisher: retainedFixture.harness.workspace,
      target: retainedFixture.harness.workspaceReplacement,
      sourceRevision: retainedFixture.harness.workspaceReplacementRevision,
    });
    const preparing = retainedFixture.kernel.getStateInternalV1();
    expect(preparing.transientState.publication.orderedInstances[0]).toBe(retainedChild);
    const preparingReplacement = preparing.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === replacement
    );
    expect(preparingReplacement?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
      retainedSubtree: {
        root: { attempt: { identity: { surfaceInstanceId: retainedParentId } } },
      },
    });
    settleCurrentStablePreparationFailedV1(retainedFixture.kernel, replacement);
    const failed = retainedFixture.kernel.getStateInternalV1();
    expect(failed.transientState.publication.orderedInstances[0]).toBe(retainedChild);
    expect(failed.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: {
        root: { attempt: { identity: { surfaceInstanceId: retainedParentId } } },
      },
    });

    const cutoverFixture = exactParentTransientChildFixtureV1();
    expect(prepareExactParentTransientHistoryV1(cutoverFixture, () => true).kind).toBe(
      "installed",
    );
    const cutoverChild = cutoverFixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!;
    const cutoverParentId = cutoverChild.parentInstanceId;
    const cutoverReplacement = admitAndApplyStableTargetV1({
      harness: cutoverFixture.harness,
      kernel: cutoverFixture.kernel,
      publisher: cutoverFixture.harness.workspace,
      target: cutoverFixture.harness.workspaceReplacement,
      sourceRevision: cutoverFixture.harness.workspaceReplacementRevision,
    });
    const transientListener = vi.fn();
    const stateListener = vi.fn();
    cutoverFixture.kernel.subscribeTransientInternalV1(transientListener);
    cutoverFixture.kernel.subscribeStateInternalV1(stateListener);

    settleCurrentStablePreparationReadyV1(cutoverFixture.kernel, cutoverReplacement);

    const cutover = cutoverFixture.kernel.getStateInternalV1();
    expect(cutover.transientState.publication.orderedInstances).toEqual([]);
    expect(cutover.stableRuntimeBindings).toHaveLength(1);
    expect(cutover.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
    expect(cutover.stableRuntimeBindings[0]?.binding).not.toMatchObject({
      instance: { attempt: { identity: { surfaceInstanceId: cutoverParentId } } },
    });
    expect(transientListener).toHaveBeenCalledTimes(1);
    expect(stateListener).toHaveBeenCalledTimes(1);
  });

  it("keeps a ready exact child current while its parent is retained for primary replacement", () => {
    const fixture = installedExactParentTransientHistoryV1();
    const lifecycleAuthority =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const refreshedParentSourceRevision = fixture.harness.workspace.issueSourceRevision();
    const refreshProposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: refreshedParentSourceRevision,
      targets: [fixture.parent],
    });
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      refreshProposal,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const capturedBefore = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    if (capturedBefore.kind !== "captured") throw new Error("expected current detail frame");
    expect(capturedBefore.parentSourceRevision).toBe(refreshedParentSourceRevision);
    const beforeReplacement = fixture.kernel.getStateInternalV1();
    const retainedChild = beforeReplacement.transientState.publication.orderedInstances[0]!;

    const replacement = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: fixture.harness.workspace.issueSourceRevision(),
    });
    const pending = fixture.kernel.getStateInternalV1();
    expect(pending.transientState.publication.orderedInstances[0]).toBe(retainedChild);
    expect(pending.transientState.publication.topologyRevision).toBe(
      beforeReplacement.transientState.publication.topologyRevision,
    );
    expect(pending.stableRuntimeBindings[0]).toMatchObject({
      desiredTarget: { admittedTarget: replacement },
      binding: {
        kind: "preparing",
        transition: "primary_replacement",
        retainedSubtree: {
          root: { attempt: { identity: { surfaceInstanceId: retainedChild.parentInstanceId } } },
        },
      },
    });

    const capturedPending = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    if (capturedPending.kind !== "captured") {
      throw new Error(`expected retained detail frame, got ${capturedPending.kind}`);
    }
    expect(capturedPending.contract).toEqual(capturedBefore.contract);
    expect(capturedPending.parentDirectTarget).toBe(capturedBefore.parentDirectTarget);
    expect(capturedPending.parentSourceRevision).toBe(capturedBefore.parentSourceRevision);
    expect(capturedPending.parentTargetProof).not.toBe(capturedBefore.parentTargetProof);
    for (const capture of [capturedBefore, capturedPending]) {
      expect(fixture.childActionAuthority.routeActionInternalV1(Object.freeze({
        evidence: Object.freeze({
          applicationEpoch: capture.contract.applicationEpoch,
          topologyRevision: capture.contract.topologyRevision,
          surfaceInstanceId: capture.contract.surfaceInstanceId,
        }),
        actionId: narrativeAdvanceActionIdV1,
        routingLeaseId: capture.contract.routingLeaseId,
      }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    }

    const beforeLifecycleProbe = fixture.kernel.getStateInternalV1();
    const lifecycleGuard = vi.fn(
      (contract: ManagedSurfacePreparedInputBindingContractInternalV1) => {
        expect(contract).not.toBeNull();
        expect(fixture.kernel.getStateInternalV1()).toBe(beforeLifecycleProbe);
        return false;
      },
    );
    expect(lifecycleAuthority.closeExactParentTransientChildInternalV1(
      fixture.candidate,
      lifecycleGuardV1(lifecycleGuard),
    )).toEqual({ kind: "stale" });
    expect(lifecycleGuard).toHaveBeenCalledOnce();
    expect(fixture.kernel.getStateInternalV1()).toBe(beforeLifecycleProbe);

    const retainedProofGuard = vi.fn(() => false);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: capturedBefore.parentTargetProof,
      expectedParent: capturedBefore.parentDirectTarget,
      expectedSourceRevision: capturedBefore.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: retainedProofGuard }),
    }))).toEqual({ kind: "stale" });
    expect(retainedProofGuard).toHaveBeenCalledOnce();
    expect(fixture.kernel.getStateInternalV1()).toBe(beforeLifecycleProbe);

    const replacementEnvelope = currentStableReadinessEnvelopeV1(fixture.kernel, replacement);
    const cutoverBefore = fixture.kernel.getStateInternalV1();
    let cutoverGuardCommitted = false;
    const cutoverListener = vi.fn(() => {
      expect(cutoverGuardCommitted).toBe(true);
      expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
        .toEqual([]);
    });
    const cutoverTransientListener = vi.fn(() => {
      expect(cutoverGuardCommitted).toBe(true);
      expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
        .toEqual([]);
    });
    fixture.kernel.subscribeStateInternalV1(cutoverListener);
    fixture.kernel.subscribeTransientInternalV1(cutoverTransientListener);
    expect(fixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
      replacementEnvelope,
      Object.freeze({
        commitInternalV1(contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) {
          expect(contract).not.toBeNull();
          expect(fixture.kernel.getStateInternalV1()).toBe(cutoverBefore);
          expect(cutoverListener).not.toHaveBeenCalled();
          cutoverGuardCommitted = true;
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(cutoverListener).toHaveBeenCalledOnce();
    expect(cutoverTransientListener).toHaveBeenCalledOnce();
    const cutover = fixture.kernel.getStateInternalV1();
    expect(cutover.transientState.publication.orderedInstances).toEqual([]);
    expect(cutover.stableRuntimeBindings[0]).toMatchObject({
      desiredTarget: { admittedTarget: replacement },
      binding: { kind: "ready_instance", instance: { phase: "active" } },
    });

    const staleReadinessGuard = vi.fn(() => true);
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: staleReadinessGuard }),
      ),
    ).toEqual({ kind: "stale" });
    expect(staleReadinessGuard).not.toHaveBeenCalled();
    const staleLifecycleGuard = vi.fn(() => true);
    expect(lifecycleAuthority.closeExactParentTransientChildInternalV1(
      fixture.candidate,
      lifecycleGuardV1(staleLifecycleGuard),
    )).toEqual({ kind: "stale" });
    expect(staleLifecycleGuard).not.toHaveBeenCalled();
    expect(
      fixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        fixture.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(fixture.childActionAuthority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: capturedPending.contract.applicationEpoch,
        topologyRevision: capturedPending.contract.topologyRevision,
        surfaceInstanceId: capturedPending.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: capturedPending.contract.routingLeaseId,
    }))).toMatchObject({ kind: "stale", code: "surface.stale_topology_revision" });
    const staleProofGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: capturedPending.parentTargetProof,
      expectedParent: capturedPending.parentDirectTarget,
      expectedSourceRevision: capturedPending.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: staleProofGuard }),
    }))).toEqual({ kind: "stale" });
    expect(staleProofGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(cutover);
  });

  it("keeps retained root actions and opens one current exact child before replacement cutover", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const parentActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    );
    const refreshedSourceRevision = fixture.harness.workspace.issueSourceRevision();
    const refreshProposal = evaluateStablePublicationV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      sourceRevision: refreshedSourceRevision,
      targets: [fixture.parent],
    });
    expect(fixture.kernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
      refreshProposal,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied" });
    const activeParent = parentActionAuthority.captureCurrentStableInputInternalV1();
    if (
      activeParent.kind !== "captured" || activeParent.directTarget === null ||
      activeParent.sourceRevision === null || activeParent.targetProof === null
    ) {
      throw new Error("expected active parent frame");
    }
    expect(activeParent.sourceRevision).toBe(refreshedSourceRevision);

    const replacement = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: fixture.harness.workspace.issueSourceRevision(),
    });
    const genericRetainedParent = parentActionAuthority.captureCurrentStableInputInternalV1();
    if (genericRetainedParent.kind !== "captured") {
      throw new Error("expected retained parent input contract");
    }
    expect(genericRetainedParent).toEqual({
      kind: "captured",
      contract: activeParent.contract,
      directTarget: null,
      sourceRevision: null,
      targetProof: null,
    });
    const [replacementEntry] = fixture.kernel.getStateInternalV1().stableRuntimeBindings;
    expect(replacementEntry?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
    });
    const retainedParent = fixture.authority.captureRetainedExactParentInputInternalV1(
      Object.freeze({
        expectedCarrierEntry: replacementEntry,
        expectedParentInstanceId: activeParent.contract.surfaceInstanceId,
        expectedParent: activeParent.directTarget,
        expectedSourceRevision: activeParent.sourceRevision,
      }),
    );
    if (
      retainedParent.kind !== "captured" || retainedParent.directTarget === null ||
      retainedParent.sourceRevision === null || retainedParent.targetProof === null
    ) {
      throw new Error("expected claimed retained parent frame");
    }
    expect(retainedParent.contract).toEqual(activeParent.contract);
    expect(retainedParent.directTarget).toBe(activeParent.directTarget);
    expect(retainedParent.sourceRevision).toBe(activeParent.sourceRevision);
    expect(retainedParent.targetProof).not.toBe(activeParent.targetProof);
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(activeParent.targetProof)).toBe(
      true,
    );
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(retainedParent.targetProof)).toBe(
      true,
    );
    for (const capture of [activeParent, retainedParent]) {
      expect(parentActionAuthority.routeActionInternalV1(Object.freeze({
        evidence: Object.freeze({
          applicationEpoch: capture.contract.applicationEpoch,
          topologyRevision: capture.contract.topologyRevision,
          surfaceInstanceId: capture.contract.surfaceInstanceId,
        }),
        actionId: narrativeAdvanceActionIdV1,
        routingLeaseId: capture.contract.routingLeaseId,
      }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    }

    const staleCarrier = fixture.authority.captureRetainedExactParentInputInternalV1(
      Object.freeze({
        expectedCarrierEntry: Object.freeze({ ...replacementEntry }),
        expectedParentInstanceId: activeParent.contract.surfaceInstanceId,
        expectedParent: activeParent.directTarget,
        expectedSourceRevision: activeParent.sourceRevision,
      }),
    );
    expect(staleCarrier).toEqual({ kind: "unavailable" });

    const installed = fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: activeParent.targetProof,
      expectedParent: activeParent.directTarget,
      expectedSourceRevision: activeParent.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: () => true }),
    }));
    if (installed.kind !== "installed") {
      throw new Error(`expected retained-parent child install, got ${installed.kind}`);
    }
    const foreignClaimant = Object.freeze({});
    const foreignAuthority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      foreignClaimant,
    );
    const foreignProofGuard = vi.fn(() => true);
    expect(foreignAuthority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: retainedParent.targetProof,
      expectedParent: retainedParent.directTarget,
      expectedSourceRevision: retainedParent.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: foreignProofGuard }),
    }))).toEqual({ kind: "stale" });
    expect(foreignProofGuard).not.toHaveBeenCalled();
    const readinessAuthority =
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    expect(readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
      installed.candidate,
      Object.freeze({ commitInternalV1: () => true }),
    )).toEqual({ kind: "applied" });
    const childActionAuthority =
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const currentChild = childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(installed.candidate);
    if (currentChild.kind !== "captured") throw new Error("expected current retained child");
    const childInstance = fixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!;
    expect(childInstance.surfaceInstanceId).toBe(currentChild.contract.surfaceInstanceId);
    expect(currentChild.parentDirectTarget).toBe(activeParent.directTarget);
    expect(currentChild.parentSourceRevision).toBe(refreshedSourceRevision);

    const replacementEnvelope = currentStableReadinessEnvelopeV1(fixture.kernel, replacement);
    expect(fixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
      replacementEnvelope,
      Object.freeze({ commitInternalV1: () => true }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    const cutover = fixture.kernel.getStateInternalV1();
    expect(cutover.transientState.publication.orderedInstances).toEqual([]);
    expect(cutover.stableRuntimeBindings[0]).toMatchObject({
      desiredTarget: { admittedTarget: replacement },
      binding: { kind: "ready_instance", instance: { phase: "active" } },
    });
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(retainedParent.targetProof)).toBe(
      false,
    );
    const staleParentProofGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: currentChild.parentTargetProof,
      expectedParent: currentChild.parentDirectTarget,
      expectedSourceRevision: currentChild.parentSourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: staleParentProofGuard }),
    }))).toEqual({ kind: "stale" });
    expect(staleParentProofGuard).not.toHaveBeenCalled();
    const staleChildReadinessGuard = vi.fn(() => true);
    expect(readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
      installed.candidate,
      Object.freeze({ commitInternalV1: staleChildReadinessGuard }),
    )).toEqual({ kind: "stale" });
    expect(staleChildReadinessGuard).not.toHaveBeenCalled();
    expect(
      childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        installed.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(fixture.kernel.getStateInternalV1()).toBe(cutover);
  });

  it("captures a claimant-bound retained parent from the exact current readiness-failed gap", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const parentActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    );
    const replacement = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: fixture.harness.workspaceReplacementRevision,
    });
    const preparingEntry = fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    settleCurrentStablePreparationFailedV1(fixture.kernel, replacement);
    const failedState = fixture.kernel.getStateInternalV1();
    const failedEntry = failedState.stableRuntimeBindings[0]!;
    expect(failedEntry.binding).toMatchObject({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: {
        root: {
          attempt: {
            identity: { surfaceInstanceId: fixture.captured.contract.surfaceInstanceId },
          },
        },
      },
    });

    const retained = fixture.authority.captureRetainedExactParentInputInternalV1(Object.freeze({
      expectedCarrierEntry: failedEntry,
      expectedParentInstanceId: fixture.captured.contract.surfaceInstanceId,
      expectedParent: fixture.expectedParent,
      expectedSourceRevision: fixture.expectedSourceRevision,
    }));
    if (
      retained.kind !== "captured" || retained.directTarget === null ||
      retained.sourceRevision === null || retained.targetProof === null
    ) throw new Error("expected failed-gap retained parent capture");
    expect(retained.contract).toEqual(fixture.captured.contract);
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(retained.targetProof)).toBe(true);
    expect(parentActionAuthority.routeActionInternalV1(Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: retained.contract.applicationEpoch,
        topologyRevision: retained.contract.topologyRevision,
        surfaceInstanceId: retained.contract.surfaceInstanceId,
      }),
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: retained.contract.routingLeaseId,
    }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });

    for (const expectedCarrierEntry of [preparingEntry, Object.freeze({ ...failedEntry })]) {
      expect(fixture.authority.captureRetainedExactParentInputInternalV1(Object.freeze({
        expectedCarrierEntry,
        expectedParentInstanceId: fixture.captured.contract.surfaceInstanceId,
        expectedParent: fixture.expectedParent,
        expectedSourceRevision: fixture.expectedSourceRevision,
      }))).toEqual({ kind: "unavailable" });
    }
    const foreignAuthority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
      fixture.kernel,
      Object.freeze({}),
    );
    const foreignGuard = vi.fn(() => true);
    expect(foreignAuthority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: retained.targetProof,
      expectedParent: retained.directTarget,
      expectedSourceRevision: retained.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: foreignGuard }),
    }))).toEqual({ kind: "stale" });
    expect(foreignGuard).not.toHaveBeenCalled();
    expect(fixture.kernel.getStateInternalV1()).toBe(failedState);

    const ownGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: retained.targetProof,
      expectedParent: retained.directTarget,
      expectedSourceRevision: retained.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: ownGuard }),
    }))).toMatchObject({ kind: "installed" });
    expect(ownGuard).toHaveBeenCalledOnce();
  });

  it("stales a failed-gap proof at retry generation and replacement cutover", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const parentActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    );
    const replacement = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: fixture.harness.workspaceReplacementRevision,
    });
    settleCurrentStablePreparationFailedV1(fixture.kernel, replacement);
    const failedEntry = fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    const retained = fixture.authority.captureRetainedExactParentInputInternalV1(Object.freeze({
      expectedCarrierEntry: failedEntry,
      expectedParentInstanceId: fixture.captured.contract.surfaceInstanceId,
      expectedParent: fixture.expectedParent,
      expectedSourceRevision: fixture.expectedSourceRevision,
    }));
    if (
      retained.kind !== "captured" || retained.directTarget === null ||
      retained.sourceRevision === null || retained.targetProof === null
    ) throw new Error("expected failed-gap retained parent capture");

    const retried = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: replacement,
      sourceRevision: fixture.harness.workspace.issueSourceRevision(),
    });
    const retryEntry = fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    expect(retryEntry.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
    });
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(retained.targetProof)).toBe(false);
    const staleGuard = vi.fn(() => true);
    expect(fixture.authority.prepareExactParentTransientChildInternalV1(Object.freeze({
      parentProof: retained.targetProof,
      expectedParent: retained.directTarget,
      expectedSourceRevision: retained.sourceRevision,
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
      commitGuard: Object.freeze({ commitInternalV1: staleGuard }),
    }))).toEqual({ kind: "stale" });
    expect(staleGuard).not.toHaveBeenCalled();
    expect(fixture.authority.captureRetainedExactParentInputInternalV1(Object.freeze({
      expectedCarrierEntry: failedEntry,
      expectedParentInstanceId: fixture.captured.contract.surfaceInstanceId,
      expectedParent: fixture.expectedParent,
      expectedSourceRevision: fixture.expectedSourceRevision,
    }))).toEqual({ kind: "unavailable" });

    const fresh = fixture.authority.captureRetainedExactParentInputInternalV1(Object.freeze({
      expectedCarrierEntry: retryEntry,
      expectedParentInstanceId: fixture.captured.contract.surfaceInstanceId,
      expectedParent: fixture.expectedParent,
      expectedSourceRevision: fixture.expectedSourceRevision,
    }));
    if (fresh.kind !== "captured" || fresh.targetProof === null) {
      throw new Error("expected fresh retry retained parent capture");
    }
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(fresh.targetProof)).toBe(true);
    settleCurrentStablePreparationReadyV1(fixture.kernel, retried);
    expect(parentActionAuthority.isCurrentDirectTargetInternalV1(fresh.targetProof)).toBe(false);
  });

  it("cascades the child with greater-empty, publisher disposal, and Coordinator terminal", () => {
    const emptyFixture = exactParentTransientChildFixtureV1();
    expect(prepareExactParentTransientHistoryV1(emptyFixture, () => true).kind).toBe(
      "installed",
    );
    applyEmptyStablePublicationV1({
      fixture: emptyFixture,
      publisher: emptyFixture.harness.workspace,
      sourceRevision: emptyFixture.harness.workspace.issueSourceRevision(),
    });
    expect(emptyFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(emptyFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toEqual([]);

    const disposeFixture = exactParentTransientChildFixtureV1();
    expect(prepareExactParentTransientHistoryV1(disposeFixture, () => true).kind).toBe(
      "installed",
    );
    expect(
      disposeFixture.kernel.disposeStablePublisherLeaseInternalV1(
        disposeFixture.harness.workspace.lease,
      ),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publisher_disposed" });
    expect(disposeFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(
      disposeFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances,
    ).toEqual([]);

    const terminalFixture = exactParentTransientChildFixtureV1();
    expect(prepareExactParentTransientHistoryV1(terminalFixture, () => true).kind).toBe(
      "installed",
    );
    expect(terminalFixture.kernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
    const terminal = terminalFixture.kernel.getStateInternalV1();
    expect(terminal.stableRuntimeBindings).toEqual([]);
    expect(terminal.transientState.publication.orderedInstances).toEqual([]);
    expect(terminal.transientState.publication.coordinatorDisposed).toBe(true);
  });

  it("keeps 10,000 prepare-retire cycles bounded to current topology and scalar cursors", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const readinessAuthority =
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const childActionAuthority =
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const actionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    );
    const initialHighWater = fixture.kernel.getStateInternalV1().transientState
      .identitySequenceHighWater;
    for (let index = 0; index < 10_000; index += 1) {
      const captured = actionAuthority.captureCurrentStableInputInternalV1();
      if (
        captured.kind !== "captured" || captured.targetProof === null ||
        captured.directTarget === null || captured.sourceRevision === null
      ) {
        throw new Error(`expected fresh direct-parent proof at cycle ${index}`);
      }
      const installed = fixture.authority.prepareExactParentTransientChildInternalV1(
        Object.freeze({
          parentProof: captured.targetProof,
          expectedParent: captured.directTarget,
          expectedSourceRevision: captured.sourceRevision,
          definition: fixture.harness.historyDefinition,
          semanticOccurrenceId: null,
          commitGuard: Object.freeze({ commitInternalV1: () => true }),
        }),
      );
      if (installed.kind !== "installed") {
        throw new Error(`expected installed child at cycle ${index}`);
      }
      const retired = readinessAuthority
        .settleExactParentTransientChildReadinessFailedInternalV1(
          installed.candidate,
          Object.freeze({ commitInternalV1: () => true }),
        );
      if (retired.kind !== "applied") {
        throw new Error(`expected structural retirement at cycle ${index}`);
      }
    }
    const finalState = fixture.kernel.getStateInternalV1();
    expect(finalState.transientState.publication.orderedInstances).toEqual([]);
    expect(finalState.stableRuntimeBindings).toHaveLength(1);
    expect(finalState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
    expect(finalState.transientState.identitySequenceHighWater).toBe(
      initialHighWater + 10_000,
    );
    expect(
      claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(fixture.authority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(readinessAuthority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(childActionAuthority);
  }, 30_000);
});

describe("managed stable exact-parent transient-child lifecycle authority", () => {
  it("freezes the exact source-relative lifecycle guard, result, and authority shapes", () => {
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1>
    >().toEqualTypeOf<"commitInternalV1">();
    expectTypeOf<
      ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1[
        "commitInternalV1"
      ]
    >().toEqualTypeOf<
      (contract: ManagedSurfacePreparedInputBindingContractInternalV1) => boolean
    >();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1>
    >().toEqualTypeOf<
      | "closeExactParentTransientChildInternalV1"
      | "dismissExactParentTransientChildInternalV1"
    >();
    expectTypeOf<
      ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1["kind"]
    >().toEqualTypeOf<"applied" | "locked" | "stale" | "faulted">();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1>
    >().toEqualTypeOf<"kind" | "code">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1,
        { readonly kind: "applied" }
      >["code"]
    >().toEqualTypeOf<"surface.closed" | "surface.dismissed">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1,
        { readonly kind: "locked" }
      >["code"]
    >().toEqualTypeOf<"surface.dismiss_locked">();

    const fixture = installedExactParentTransientHistoryV1();
    const authority =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Reflect.ownKeys(authority)).toEqual([
      "closeExactParentTransientChildInternalV1",
      "dismissExactParentTransientChildInternalV1",
    ]);
  });

  it("retains one separate same-claimant authority and rejects foreign or borrowed claims zero-read", () => {
    const fixture = installedExactParentTransientHistoryV1();
    const authority =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    expect(
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(authority);
    expect(authority).not.toBe(fixture.authority);
    expect(authority).not.toBe(fixture.readinessAuthority);
    expect(authority).not.toBe(fixture.childActionAuthority);

    const claimantTrap = vi.fn();
    const foreignClaimant = new Proxy(Object.freeze({}), {
      get() {
        claimantTrap();
        throw new Error("foreign lifecycle claimant read");
      },
      getOwnPropertyDescriptor() {
        claimantTrap();
        throw new Error("foreign lifecycle claimant descriptor read");
      },
      ownKeys() {
        claimantTrap();
        throw new Error("foreign lifecycle claimant keys read");
      },
    });
    expect(() =>
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        foreignClaimant,
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );
    expect(claimantTrap).not.toHaveBeenCalled();
    expect(() =>
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        {} as ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
        fixture.claimant,
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );

    const argumentTrap = vi.fn();
    const hostileArgument = new Proxy(Object.freeze({}), {
      get() {
        argumentTrap();
        throw new Error("borrowed lifecycle argument read");
      },
      getOwnPropertyDescriptor() {
        argumentTrap();
        throw new Error("borrowed lifecycle argument descriptor read");
      },
      ownKeys() {
        argumentTrap();
        throw new Error("borrowed lifecycle argument keys read");
      },
    });
    expect(() =>
      Reflect.apply(
        authority.closeExactParentTransientChildInternalV1,
        Object.freeze({}),
        [hostileArgument, hostileArgument],
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );
    expect(() =>
      Reflect.apply(
        authority.dismissExactParentTransientChildInternalV1,
        Object.freeze({}),
        [hostileArgument, hostileArgument, hostileArgument],
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_lifecycle_claim_invalid",
    );
    expect(argumentTrap).not.toHaveBeenCalled();
  });

  it("closes preparing and ready exact children atomically with one nonnull restored-parent token", () => {
    const appliedResults: ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1[] =
      [];
    for (const phase of ["preparing", "ready"] as const) {
      const fixture = exactParentTransientChildLifecycleFixtureV1(phase);
      const before = fixture.kernel.getStateInternalV1();
      const beforePublication = before.transientState.publication;
      const guarded = vi.fn(
        (contract: ManagedSurfacePreparedInputBindingContractInternalV1) => {
          expect(fixture.kernel.getStateInternalV1()).toBe(before);
          expect(contract).not.toBeNull();
          expect(Object.isFrozen(contract)).toBe(true);
          expect(Reflect.ownKeys(contract)).toEqual([]);
          return true;
        },
      );
      let bindingCommitted = false;
      const guard = lifecycleGuardV1((contract) => {
        const committed = guarded(contract);
        bindingCommitted = true;
        return committed;
      });
      const transientListener = vi.fn(() => {
        expect(bindingCommitted).toBe(true);
        expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
          .toEqual([]);
      });
      const stateListener = vi.fn(() => {
        expect(bindingCommitted).toBe(true);
        expect(fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
          .toMatchObject({
            kind: "ready_instance",
            instance: { phase: "active" },
          });
      });
      fixture.kernel.subscribeTransientInternalV1(transientListener);
      fixture.kernel.subscribeStateInternalV1(stateListener);

      const result = fixture.lifecycleAuthority
        .closeExactParentTransientChildInternalV1(fixture.candidate, guard);

      expect(result).toEqual({ kind: "applied", code: "surface.closed" });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Reflect.ownKeys(result)).toEqual(["kind", "code"]);
      appliedResults.push(result);
      expect(guarded).toHaveBeenCalledTimes(1);
      expect(transientListener).toHaveBeenCalledTimes(1);
      expect(stateListener).toHaveBeenCalledTimes(1);
      const after = fixture.kernel.getStateInternalV1();
      expect(after.transientState.publication.topologyRevision).toBe(
        beforePublication.topologyRevision + 1,
      );
      expect(after.transientState.publication.publicationRevision).toBe(
        beforePublication.publicationRevision + 1,
      );
      expect(after.transientState.identitySequenceHighWater).toBe(
        before.transientState.identitySequenceHighWater,
      );
    }
    expect(appliedResults[1]).toBe(appliedResults[0]);
  });

  it("routes all four dismiss kinds in both phases and keeps locked policy guard-unread", () => {
    const dismissKinds = [
      "back",
      "escape",
      "backdrop",
      "routed_cancel",
    ] as const satisfies readonly ManagedSurfaceDismissKindV1[];
    let dismissedIdentity:
      | ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1
      | null = null;
    let lockedIdentity:
      | ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1
      | null = null;
    for (const phase of ["preparing", "ready"] as const) {
      for (const dismissKind of dismissKinds) {
        const fixture = exactParentTransientChildLifecycleFixtureV1(phase);
        const before = fixture.kernel.getStateInternalV1();
        const guard = vi.fn(
          (contract: ManagedSurfacePreparedInputBindingContractInternalV1) => {
            expect(contract).not.toBeNull();
            expect(Reflect.ownKeys(contract)).toEqual([]);
            expect(fixture.kernel.getStateInternalV1()).toBe(before);
            return true;
          },
        );
        const result = fixture.lifecycleAuthority
          .dismissExactParentTransientChildInternalV1(
            fixture.candidate,
            dismissKind,
            lifecycleGuardV1(guard),
          );
        if (dismissKind === "backdrop") {
          expect(result).toEqual({ kind: "locked", code: "surface.dismiss_locked" });
          expect(guard).not.toHaveBeenCalled();
          expect(fixture.kernel.getStateInternalV1()).toBe(before);
          if (lockedIdentity === null) lockedIdentity = result;
          else expect(result).toBe(lockedIdentity);
          continue;
        }
        expect(result).toEqual({ kind: "applied", code: "surface.dismissed" });
        expect(guard).toHaveBeenCalledTimes(1);
        expect(fixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
          .toEqual([]);
        expect(fixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
          .toMatchObject({
            kind: "ready_instance",
            instance: { phase: "active" },
          });
        if (dismissedIdentity === null) dismissedIdentity = result;
        else expect(result).toBe(dismissedIdentity);
      }
    }
  });

  it("keeps stale precedence ahead of hostile kind and guard reads and canonicalizes guard failures", () => {
    const staleFixture = exactParentTransientChildLifecycleFixtureV1();
    expect(
      staleFixture.lifecycleAuthority.closeExactParentTransientChildInternalV1(
        staleFixture.candidate,
        lifecycleGuardV1(() => true),
      ),
    ).toEqual({ kind: "applied", code: "surface.closed" });
    const staleGuard = vi.fn(() => true);
    const staleResult = staleFixture.lifecycleAuthority
      .closeExactParentTransientChildInternalV1(
        staleFixture.candidate,
        lifecycleGuardV1(staleGuard),
      );
    expect(staleResult).toEqual({ kind: "stale" });
    expect(staleGuard).not.toHaveBeenCalled();

    const hostileKindTrap = vi.fn();
    const hostileKind = new Proxy(Object.freeze({}), {
      get() {
        hostileKindTrap();
        throw new Error("hostile dismiss kind read");
      },
      getOwnPropertyDescriptor() {
        hostileKindTrap();
        throw new Error("hostile dismiss kind descriptor read");
      },
      ownKeys() {
        hostileKindTrap();
        throw new Error("hostile dismiss kind keys read");
      },
    }) as unknown as ManagedSurfaceDismissKindV1;
    const hostileGuardTrap = vi.fn();
    const hostileGuard = new Proxy(Object.freeze({}), {
      get() {
        hostileGuardTrap();
        throw new Error("hostile lifecycle guard read");
      },
      getOwnPropertyDescriptor() {
        hostileGuardTrap();
        throw new Error("hostile lifecycle guard descriptor read");
      },
      ownKeys() {
        hostileGuardTrap();
        throw new Error("hostile lifecycle guard keys read");
      },
    }) as ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1;
    expect(
      staleFixture.lifecycleAuthority.dismissExactParentTransientChildInternalV1(
        staleFixture.candidate,
        hostileKind,
        hostileGuard,
      ),
    ).toBe(staleResult);
    expect(hostileKindTrap).not.toHaveBeenCalled();
    expect(hostileGuardTrap).not.toHaveBeenCalled();

    const invalidKindFixture = exactParentTransientChildLifecycleFixtureV1();
    const invalidBefore = invalidKindFixture.kernel.getStateInternalV1();
    const faultedResult = invalidKindFixture.lifecycleAuthority
      .dismissExactParentTransientChildInternalV1(
        invalidKindFixture.candidate,
        "invalid" as ManagedSurfaceDismissKindV1,
        hostileGuard,
      );
    expect(faultedResult).toEqual({ kind: "faulted" });
    expect(invalidKindFixture.kernel.getStateInternalV1()).toBe(invalidBefore);
    expect(hostileGuardTrap).not.toHaveBeenCalled();

    const guardedRows = [
      Object.freeze({
        phase: "preparing" as const,
        dismiss: false,
        guard: lifecycleGuardV1(() => false),
        expectedKind: "stale" as const,
      }),
      Object.freeze({
        phase: "ready" as const,
        dismiss: true,
        guard: lifecycleGuardV1(() => {
          throw new Error("lifecycle guard fault");
        }),
        expectedKind: "faulted" as const,
      }),
      Object.freeze({
        phase: "preparing" as const,
        dismiss: false,
        guard: lifecycleGuardV1(() => "true" as unknown as boolean),
        expectedKind: "faulted" as const,
      }),
    ];
    for (const row of guardedRows) {
      const fixture = exactParentTransientChildLifecycleFixtureV1(row.phase);
      const before = fixture.kernel.getStateInternalV1();
      const listener = vi.fn();
      fixture.kernel.subscribeStateInternalV1(listener);
      const result = row.dismiss
        ? fixture.lifecycleAuthority.dismissExactParentTransientChildInternalV1(
          fixture.candidate,
          "back",
          row.guard,
        )
        : fixture.lifecycleAuthority.closeExactParentTransientChildInternalV1(
          fixture.candidate,
          row.guard,
        );
      expect(result).toEqual({ kind: row.expectedKind });
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      if (row.expectedKind === "stale") expect(result).toBe(staleResult);
      else expect(result).toBe(faultedResult);
    }

    const extraCallback = vi.fn(() => true);
    const accessorCallback = vi.fn(() => () => true);
    const malformedGuards = [
      Object.freeze({ commitInternalV1: extraCallback, extra: true }),
      Object.freeze(
        Object.defineProperty({}, "commitInternalV1", {
          enumerable: true,
          get: accessorCallback,
        }),
      ),
      { commitInternalV1: vi.fn(() => true) },
    ];
    for (const malformedGuard of malformedGuards) {
      const fixture = exactParentTransientChildLifecycleFixtureV1();
      const before = fixture.kernel.getStateInternalV1();
      expect(
        fixture.lifecycleAuthority.closeExactParentTransientChildInternalV1(
          fixture.candidate,
          malformedGuard as ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
        ),
      ).toBe(faultedResult);
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
    }
    expect(extraCallback).not.toHaveBeenCalled();
    expect(accessorCallback).not.toHaveBeenCalled();
  });

  it("preserves a preparing root replacement and cannot retire a listener-reentrant fresh child", () => {
    const replacementFixture = exactParentTransientChildLifecycleFixtureV1();
    const retainedChild = replacementFixture.kernel.getStateInternalV1().transientState
      .publication.orderedInstances[0]!;
    const retainedParentId = retainedChild.parentInstanceId;
    const replacement = admitAndApplyStableTargetV1({
      harness: replacementFixture.harness,
      kernel: replacementFixture.kernel,
      publisher: replacementFixture.harness.workspace,
      target: replacementFixture.harness.workspaceReplacement,
      sourceRevision: replacementFixture.harness.workspaceReplacementRevision,
    });
    const beforeClose = replacementFixture.kernel.getStateInternalV1();
    const replacementBefore = beforeClose.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === replacement
    );
    expect(replacementBefore?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
      retainedSubtree: {
        root: {
          attempt: { identity: { surfaceInstanceId: retainedParentId } },
          phase: "suspended",
        },
      },
    });

    expect(
      replacementFixture.lifecycleAuthority.closeExactParentTransientChildInternalV1(
        replacementFixture.candidate,
        lifecycleGuardV1(() => true),
      ),
    ).toEqual({ kind: "applied", code: "surface.closed" });
    const afterClose = replacementFixture.kernel.getStateInternalV1();
    expect(afterClose.transientState.publication.orderedInstances).toEqual([]);
    expect(afterClose.transientState.identitySequenceHighWater).toBe(
      beforeClose.transientState.identitySequenceHighWater,
    );
    expect(
      afterClose.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget === replacement
      )?.binding,
    ).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
      retainedSubtree: {
        root: {
          attempt: { identity: { surfaceInstanceId: retainedParentId } },
          phase: "active",
        },
        descendants: [],
      },
    });

    const reentryFixture = exactParentTransientChildLifecycleFixtureV1();
    const oldChildId = reentryFixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!.surfaceInstanceId;
    const parentActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      reentryFixture.kernel,
    );
    let nested:
      | ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1
      | null = null;
    const unsubscribe = reentryFixture.kernel.subscribeStateInternalV1(() => {
      unsubscribe();
      const captured = parentActionAuthority.captureCurrentStableInputInternalV1();
      if (
        captured.kind !== "captured" || captured.targetProof === null ||
        captured.directTarget === null || captured.sourceRevision === null
      ) {
        throw new Error("expected restored exact parent during close notification");
      }
      nested = reentryFixture.authority.prepareExactParentTransientChildInternalV1(
        Object.freeze({
          parentProof: captured.targetProof,
          expectedParent: captured.directTarget,
          expectedSourceRevision: captured.sourceRevision,
          definition: reentryFixture.harness.historyDefinition,
          semanticOccurrenceId: null,
          commitGuard: Object.freeze({ commitInternalV1: () => true }),
        }),
      );
    });
    const historical = reentryFixture.lifecycleAuthority
      .closeExactParentTransientChildInternalV1(
        reentryFixture.candidate,
        lifecycleGuardV1(() => true),
      );
    expect(historical).toEqual({ kind: "applied", code: "surface.closed" });
    expect(nested).toMatchObject({ kind: "installed" });
    const [freshChild] = reentryFixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances;
    expect(freshChild?.surfaceInstanceId).not.toBe(oldChildId);
    expect(freshChild).toMatchObject({
      readiness: { kind: "preparing", transition: "child_open" },
    });
  });

  it("keeps ordinary protected-child fences while claimed readiness and structural cascades remain live", () => {
    const fixture = exactParentTransientChildLifecycleFixtureV1();
    const preparingState = fixture.kernel.getStateInternalV1();
    const preparingChild = preparingState.transientState.publication.orderedInstances[0]!;
    const preparingEvidence = Object.freeze({
      applicationEpoch: preparingState.transientState.publication.applicationEpoch,
      surfaceInstanceId: preparingChild.surfaceInstanceId,
    });
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "close_top",
      applicationEpoch: preparingEvidence.applicationEpoch,
    })).toMatchObject({ kind: "rejected", code: "surface.invalid_transition" });
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "readiness_failed",
      evidence: preparingEvidence,
    })).toMatchObject({ kind: "rejected", code: "surface.invalid_transition" });
    expect(fixture.kernel.getStateInternalV1()).toBe(preparingState);

    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const readyState = fixture.kernel.getStateInternalV1();
    const readyPublication = readyState.transientState.publication;
    const readyChild = readyPublication.orderedInstances[0]!;
    const readyEvidence = Object.freeze({
      applicationEpoch: readyPublication.applicationEpoch,
      topologyRevision: readyPublication.topologyRevision,
      surfaceInstanceId: readyChild.surfaceInstanceId,
    });
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: readyEvidence,
    })).toMatchObject({ kind: "rejected", code: "surface.invalid_transition" });
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "route_dismiss",
      dismissKind: "back",
      evidence: readyEvidence,
    })).toMatchObject({ kind: "rejected", code: "surface.invalid_transition" });
    expect(fixture.kernel.getStateInternalV1()).toBe(readyState);
    expect(
      fixture.lifecycleAuthority.dismissExactParentTransientChildInternalV1(
        fixture.candidate,
        "back",
        lifecycleGuardV1(() => true),
      ),
    ).toEqual({ kind: "applied", code: "surface.dismissed" });

    const failedFixture = exactParentTransientChildLifecycleFixtureV1();
    expect(
      failedFixture.readinessAuthority
        .settleExactParentTransientChildReadinessFailedInternalV1(
          failedFixture.candidate,
          Object.freeze({ commitInternalV1: () => true }),
        ),
    ).toEqual({ kind: "applied" });
    expect(failedFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toEqual([]);

    const cascadeFixture = exactParentTransientChildLifecycleFixtureV1("ready");
    applyEmptyStablePublicationV1({
      fixture: cascadeFixture,
      publisher: cascadeFixture.harness.workspace,
      sourceRevision: cascadeFixture.harness.workspace.issueSourceRevision(),
    });
    expect(cascadeFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(cascadeFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toEqual([]);
    const cascadeGuard = vi.fn(() => true);
    expect(
      cascadeFixture.lifecycleAuthority.closeExactParentTransientChildInternalV1(
        cascadeFixture.candidate,
        lifecycleGuardV1(cascadeGuard),
      ),
    ).toEqual({ kind: "stale" });
    expect(cascadeGuard).not.toHaveBeenCalled();
  });

  it("keeps 10,000 lifecycle cycles bounded to retained authorities and scalar high-water", () => {
    const fixture = exactParentTransientChildFixtureV1();
    const lifecycleAuthority =
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const readinessAuthority =
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      );
    const actionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.kernel,
    );
    const initialHighWater = fixture.kernel.getStateInternalV1().transientState
      .identitySequenceHighWater;
    let guardCalls = 0;
    const guard = lifecycleGuardV1((contract) => {
      expect(contract).not.toBeNull();
      guardCalls += 1;
      return true;
    });
    let closedIdentity:
      | ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1
      | null = null;
    let dismissedIdentity:
      | ManagedSurfaceStableExactParentTransientChildLifecycleResultInternalV1
      | null = null;

    for (let index = 0; index < 10_000; index += 1) {
      const captured = actionAuthority.captureCurrentStableInputInternalV1();
      if (
        captured.kind !== "captured" || captured.targetProof === null ||
        captured.directTarget === null || captured.sourceRevision === null
      ) {
        throw new Error(`expected fresh parent proof at lifecycle cycle ${index}`);
      }
      const installed = fixture.authority.prepareExactParentTransientChildInternalV1(
        Object.freeze({
          parentProof: captured.targetProof,
          expectedParent: captured.directTarget,
          expectedSourceRevision: captured.sourceRevision,
          definition: fixture.harness.historyDefinition,
          semanticOccurrenceId: null,
          commitGuard: Object.freeze({ commitInternalV1: () => true }),
        }),
      );
      if (installed.kind !== "installed") {
        throw new Error(`expected installed child at lifecycle cycle ${index}`);
      }
      if (index % 2 === 1) {
        const ready = readinessAuthority
          .settleExactParentTransientChildReadinessReadyInternalV1(
            installed.candidate,
            Object.freeze({ commitInternalV1: () => true }),
          );
        if (ready.kind !== "applied") {
          throw new Error(`expected ready child at lifecycle cycle ${index}`);
        }
      }
      const result = index % 4 < 2
        ? lifecycleAuthority.closeExactParentTransientChildInternalV1(
          installed.candidate,
          guard,
        )
        : lifecycleAuthority.dismissExactParentTransientChildInternalV1(
          installed.candidate,
          "back",
          guard,
        );
      if (index % 4 < 2) {
        expect(result).toEqual({ kind: "applied", code: "surface.closed" });
        if (closedIdentity === null) closedIdentity = result;
        else expect(result).toBe(closedIdentity);
      } else {
        expect(result).toEqual({ kind: "applied", code: "surface.dismissed" });
        if (dismissedIdentity === null) dismissedIdentity = result;
        else expect(result).toBe(dismissedIdentity);
      }
    }

    const finalState = fixture.kernel.getStateInternalV1();
    expect(guardCalls).toBe(10_000);
    expect(finalState.transientState.publication.orderedInstances).toEqual([]);
    expect(finalState.stableRuntimeBindings).toHaveLength(1);
    expect(finalState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
    expect(finalState.transientState.identitySequenceHighWater).toBe(
      initialHighWater + 10_000,
    );
    expect(
      claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(lifecycleAuthority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(readinessAuthority);
  }, 30_000);
});

describe("managed stable guarded readiness and cross-axis child routing", () => {
  it("freezes independent same-claimant readiness and action authority surfaces", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReadinessCommitGuardInternalV1>>()
      .toEqualTypeOf<"commitInternalV1">();
    expectTypeOf<ManagedSurfaceStableReadinessCommitGuardInternalV1["commitInternalV1"]>()
      .toEqualTypeOf<
        (contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) => boolean
      >();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1>
    >().toEqualTypeOf<
      | "settleExactParentTransientChildReadinessReadyInternalV1"
      | "settleExactParentTransientChildReadinessFailedInternalV1"
    >();
    expectTypeOf<ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1["kind"]>()
      .toEqualTypeOf<"applied" | "stale" | "faulted">();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1>
    >().toEqualTypeOf<"kind">();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1>
    >().toEqualTypeOf<
      | "captureCurrentExactParentTransientChildInputInternalV1"
      | "routeActionInternalV1"
    >();
    expectTypeOf<
      ExactKeysV1<ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1>
    >().toEqualTypeOf<
      | "kind"
      | "contract"
      | "parentDirectTarget"
      | "parentSourceRevision"
      | "parentTargetProof"
      | "code"
    >();

    const fixture = installedExactParentTransientHistoryV1();
    expect(Object.isFrozen(fixture.readinessAuthority)).toBe(true);
    expect(Reflect.ownKeys(fixture.readinessAuthority)).toEqual([
      "settleExactParentTransientChildReadinessReadyInternalV1",
      "settleExactParentTransientChildReadinessFailedInternalV1",
    ]);
    expect(Object.isFrozen(fixture.childActionAuthority)).toBe(true);
    expect(Reflect.ownKeys(fixture.childActionAuthority)).toEqual([
      "captureCurrentExactParentTransientChildInputInternalV1",
      "routeActionInternalV1",
    ]);
    expect(
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(fixture.readinessAuthority);
    expect(
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        fixture.claimant,
      ),
    ).toBe(fixture.childActionAuthority);

    const claimantTrap = vi.fn();
    const foreignClaimant = new Proxy(Object.freeze({}), {
      get() {
        claimantTrap();
        throw new Error("claimant read");
      },
      ownKeys() {
        claimantTrap();
        throw new Error("claimant enumerated");
      },
    });
    expect(() =>
      claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
        fixture.kernel,
        foreignClaimant,
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
    );
    expect(() =>
      claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
        fixture.kernel,
        foreignClaimant,
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
    );
    expect(claimantTrap).not.toHaveBeenCalled();

    const ready = fixture.readinessAuthority
      .settleExactParentTransientChildReadinessReadyInternalV1;
    expect(() =>
      Reflect.apply(ready, Object.freeze({}), [
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ])
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
    );
    const capture = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1;
    expect(() => Reflect.apply(capture, Object.freeze({}), [fixture.candidate])).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
    );
    expect(() =>
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        Object.freeze({}),
        Object.freeze({ commitInternalV1: () => true }),
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_readiness_claim_invalid",
    );
  });

  it("commits guarded root ready and initial failure before synchronous notification", () => {
    const readyFixture = stableActionFixtureV1();
    const readyTarget = admitAndApplyStableTargetV1({
      harness: readyFixture.harness,
      kernel: readyFixture.kernel,
      publisher: readyFixture.harness.workspace,
      target: readyFixture.harness.workspaceRoot,
      sourceRevision: readyFixture.harness.workspaceRevision,
    });
    const readyEnvelope = currentStableReadinessEnvelopeV1(readyFixture.kernel, readyTarget);
    const readyBefore = readyFixture.kernel.getStateInternalV1();
    let readyCommitted = false;
    const readyListener = vi.fn(() => {
      expect(readyCommitted).toBe(true);
      expect(readyFixture.kernel.getStateInternalV1()).not.toBe(readyBefore);
      expect(readyFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
        .toMatchObject({ kind: "ready_instance", instance: { phase: "active" } });
    });
    readyFixture.kernel.subscribeStateInternalV1(readyListener);
    const readyGuard = vi.fn(
      (contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) => {
        expect(readyFixture.kernel.getStateInternalV1()).toBe(readyBefore);
        expect(contract).not.toBeNull();
        expect(Object.isFrozen(contract)).toBe(true);
        expect(Reflect.ownKeys(contract!)).toEqual([]);
        readyCommitted = true;
        return true;
      },
    );

    expect(readyFixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
      readyEnvelope,
      Object.freeze({ commitInternalV1: readyGuard }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(readyGuard).toHaveBeenCalledTimes(1);
    expect(readyListener).toHaveBeenCalledTimes(1);
    const staleRootGuard = vi.fn(() => true);
    expect(readyFixture.kernel.settleStableReadinessFailedWithCommitGuardInternalV1(
      readyEnvelope,
      Object.freeze({ commitInternalV1: staleRootGuard }),
    )).toMatchObject({ kind: "stale", code: "surface.stale_readiness" });
    expect(staleRootGuard).not.toHaveBeenCalled();
    const staleRootGuardTrap = vi.fn();
    const staleRootTrappingGuard = new Proxy(Object.freeze({}), {
      getOwnPropertyDescriptor() {
        staleRootGuardTrap();
        throw new Error("stale root guard descriptor read");
      },
      ownKeys() {
        staleRootGuardTrap();
        throw new Error("stale root guard keys read");
      },
    });
    expect(readyFixture.kernel.settleStableReadinessFailedWithCommitGuardInternalV1(
      readyEnvelope,
      staleRootTrappingGuard as ManagedSurfaceStableReadinessCommitGuardInternalV1,
    )).toMatchObject({ kind: "stale", code: "surface.stale_readiness" });
    expect(staleRootGuardTrap).not.toHaveBeenCalled();

    const failedFixture = stableActionFixtureV1();
    const failedTarget = admitAndApplyStableTargetV1({
      harness: failedFixture.harness,
      kernel: failedFixture.kernel,
      publisher: failedFixture.harness.workspace,
      target: failedFixture.harness.workspaceRoot,
      sourceRevision: failedFixture.harness.workspaceRevision,
    });
    const failedEnvelope = currentStableReadinessEnvelopeV1(failedFixture.kernel, failedTarget);
    const failedBefore = failedFixture.kernel.getStateInternalV1();
    let failedCommitted = false;
    failedFixture.kernel.subscribeStateInternalV1(() => {
      expect(failedCommitted).toBe(true);
      expect(failedFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
        .toMatchObject({ kind: "gap", reason: "readiness_failed" });
    });
    const failedGuard = vi.fn(
      (contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null) => {
        expect(failedFixture.kernel.getStateInternalV1()).toBe(failedBefore);
        expect(contract).toBeNull();
        failedCommitted = true;
        return true;
      },
    );

    expect(failedFixture.kernel.settleStableReadinessFailedWithCommitGuardInternalV1(
      failedEnvelope,
      Object.freeze({ commitInternalV1: failedGuard }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(failedGuard).toHaveBeenCalledTimes(1);

    const replacementFixture = exactParentTransientChildFixtureV1();
    const replacement = admitAndApplyStableTargetV1({
      harness: replacementFixture.harness,
      kernel: replacementFixture.kernel,
      publisher: replacementFixture.harness.workspace,
      target: replacementFixture.harness.workspaceReplacement,
      sourceRevision: replacementFixture.harness.workspaceReplacementRevision,
    });
    const replacementEnvelope = currentStableReadinessEnvelopeV1(
      replacementFixture.kernel,
      replacement,
    );
    const replacementBefore = replacementFixture.kernel.getStateInternalV1();
    let replacementCommitted = false;
    replacementFixture.kernel.subscribeStateInternalV1(() => {
      expect(replacementCommitted).toBe(true);
      expect(replacementFixture.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
        .toMatchObject({
          kind: "gap",
          reason: "readiness_failed",
          retainedSubtree: { root: { phase: "active" } },
        });
    });
    expect(replacementFixture.kernel.settleStableReadinessFailedWithCommitGuardInternalV1(
      replacementEnvelope,
      Object.freeze({
        commitInternalV1(
          contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
        ) {
          expect(replacementFixture.kernel.getStateInternalV1()).toBe(replacementBefore);
          expect(contract).not.toBeNull();
          replacementCommitted = true;
          return true;
        },
      }),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });

    const guardRows = [
      Object.freeze({ commitInternalV1: () => false }),
      Object.freeze({
        commitInternalV1: () => {
          throw new Error("root guard fault");
        },
      }),
      Object.freeze({ commitInternalV1: () => "true" as unknown as boolean }),
    ];
    const expectedKinds = ["stale", "faulted", "faulted"] as const;
    for (const [index, guard] of guardRows.entries()) {
      const fixture = stableActionFixtureV1();
      const target = admitAndApplyStableTargetV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        target: fixture.harness.workspaceRoot,
        sourceRevision: fixture.harness.workspaceRevision,
      });
      const envelope = currentStableReadinessEnvelopeV1(fixture.kernel, target);
      const before = fixture.kernel.getStateInternalV1();
      const listener = vi.fn();
      fixture.kernel.subscribeStateInternalV1(listener);
      expect(
        fixture.kernel.settleStableReadinessFailedWithCommitGuardInternalV1(
          envelope,
          guard,
        ).kind,
      ).toBe(expectedKinds[index]);
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    }
    for (const [index, guard] of guardRows.entries()) {
      const fixture = stableActionFixtureV1();
      const target = admitAndApplyStableTargetV1({
        harness: fixture.harness,
        kernel: fixture.kernel,
        publisher: fixture.harness.workspace,
        target: fixture.harness.workspaceRoot,
        sourceRevision: fixture.harness.workspaceRevision,
      });
      const envelope = currentStableReadinessEnvelopeV1(fixture.kernel, target);
      const before = fixture.kernel.getStateInternalV1();
      expect(
        fixture.kernel.settleStableReadinessReadyWithCommitGuardInternalV1(
          envelope,
          guard,
        ).kind,
      ).toBe(expectedKinds[index]);
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
    }
  });

  it("settles History ready or failed once through the same nullable-token gate", () => {
    const readyFixture = installedExactParentTransientHistoryV1();
    const readyBefore = readyFixture.kernel.getStateInternalV1();
    let readyCommitted = false;
    readyFixture.kernel.subscribeStateInternalV1(() => {
      expect(readyCommitted).toBe(true);
      const state = readyFixture.kernel.getStateInternalV1();
      expect(state.transientState.publication.orderedInstances[0]).toMatchObject({
        readiness: { kind: "ready" },
        phase: "active",
      });
    });
    const ready = readyFixture.readinessAuthority
      .settleExactParentTransientChildReadinessReadyInternalV1(
        readyFixture.candidate,
        Object.freeze({
          commitInternalV1(
            contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
          ) {
            expect(readyFixture.kernel.getStateInternalV1()).toBe(readyBefore);
            expect(contract).not.toBeNull();
            readyCommitted = true;
            return true;
          },
        }),
      );
    expect(ready).toEqual({ kind: "applied" });
    expect(Object.isFrozen(ready)).toBe(true);
    const lateFailGuard = vi.fn(() => true);
    const lateFailed = readyFixture.readinessAuthority
      .settleExactParentTransientChildReadinessFailedInternalV1(
        readyFixture.candidate,
        Object.freeze({ commitInternalV1: lateFailGuard }),
      );
    expect(lateFailed).toEqual({ kind: "stale" });
    expect(
      readyFixture.readinessAuthority
        .settleExactParentTransientChildReadinessFailedInternalV1(
          readyFixture.candidate,
          Object.freeze({ commitInternalV1: lateFailGuard }),
        ),
    ).toBe(lateFailed);
    expect(lateFailGuard).not.toHaveBeenCalled();
    const staleHistoryGuardTrap = vi.fn();
    const staleHistoryTrappingGuard = new Proxy(Object.freeze({}), {
      getOwnPropertyDescriptor() {
        staleHistoryGuardTrap();
        throw new Error("stale History guard descriptor read");
      },
      ownKeys() {
        staleHistoryGuardTrap();
        throw new Error("stale History guard keys read");
      },
    });
    expect(
      readyFixture.readinessAuthority
        .settleExactParentTransientChildReadinessFailedInternalV1(
          readyFixture.candidate,
          staleHistoryTrappingGuard as ManagedSurfaceStableReadinessCommitGuardInternalV1,
        ),
    ).toBe(lateFailed);
    expect(staleHistoryGuardTrap).not.toHaveBeenCalled();

    const failedFixture = installedExactParentTransientHistoryV1();
    const failedBefore = failedFixture.kernel.getStateInternalV1();
    let failedCommitted = false;
    failedFixture.kernel.subscribeStateInternalV1(() => {
      expect(failedCommitted).toBe(true);
      const state = failedFixture.kernel.getStateInternalV1();
      expect(state.transientState.publication.orderedInstances).toEqual([]);
      expect(state.stableRuntimeBindings[0]?.binding).toMatchObject({
        kind: "ready_instance",
        instance: { phase: "active" },
      });
    });
    const failed = failedFixture.readinessAuthority
      .settleExactParentTransientChildReadinessFailedInternalV1(
        failedFixture.candidate,
        Object.freeze({
          commitInternalV1(
            contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
          ) {
            expect(failedFixture.kernel.getStateInternalV1()).toBe(failedBefore);
            expect(contract).not.toBeNull();
            failedCommitted = true;
            return true;
          },
        }),
      );
    expect(failed).toEqual({ kind: "applied" });
    expect(
      failedFixture.readinessAuthority
        .settleExactParentTransientChildReadinessReadyInternalV1(
          failedFixture.candidate,
          Object.freeze({ commitInternalV1: vi.fn(() => true) }),
        ),
    ).toEqual({ kind: "stale" });

    const guardedRows = [
      Object.freeze({ commitInternalV1: () => false }),
      Object.freeze({
        commitInternalV1: () => {
          throw new Error("guard fault");
        },
      }),
      Object.freeze({ commitInternalV1: () => "true" as unknown as boolean }),
    ];
    const expectedKinds = ["stale", "faulted", "faulted"] as const;
    const guardedResults: ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1[] =
      [];
    for (const [index, guard] of guardedRows.entries()) {
      const fixture = installedExactParentTransientHistoryV1();
      const before = fixture.kernel.getStateInternalV1();
      const listener = vi.fn();
      fixture.kernel.subscribeStateInternalV1(listener);
      const result = fixture.readinessAuthority
        .settleExactParentTransientChildReadinessReadyInternalV1(
          fixture.candidate,
          guard,
        );
      guardedResults.push(result);
      expect(result).toEqual({ kind: expectedKinds[index] });
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    }
    expect(guardedResults[2]).toBe(guardedResults[1]);

    const failedGuardedResults:
      ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1[] = [];
    for (const [index, guard] of guardedRows.entries()) {
      const fixture = installedExactParentTransientHistoryV1();
      const before = fixture.kernel.getStateInternalV1();
      const result = fixture.readinessAuthority
        .settleExactParentTransientChildReadinessFailedInternalV1(
          fixture.candidate,
          guard,
        );
      failedGuardedResults.push(result);
      expect(result).toEqual({ kind: expectedKinds[index] });
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
    }
    expect(failedGuardedResults[0]).toBe(guardedResults[0]);
    expect(failedGuardedResults[1]).toBe(guardedResults[1]);
    expect(failedGuardedResults[2]).toBe(guardedResults[1]);
  });

  it("rejects malformed readiness guards without invoking accessors or mutating state", () => {
    const guards: object[] = [];
    const extra = vi.fn(() => true);
    guards.push(Object.freeze({ commitInternalV1: extra, extra: true }));
    const getter = vi.fn(() => () => true);
    guards.push(Object.freeze(Object.defineProperty({}, "commitInternalV1", { get: getter })));
    guards.push({ commitInternalV1: vi.fn(() => true) });

    for (const guard of guards) {
      const fixture = installedExactParentTransientHistoryV1();
      const before = fixture.kernel.getStateInternalV1();
      expect(
        fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
          fixture.candidate,
          guard as ManagedSurfaceStableReadinessCommitGuardInternalV1,
        ),
      ).toEqual({ kind: "faulted" });
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
    }
    expect(extra).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it("returns historical applied after listener terminal reentry and preserves structural cascades", () => {
    const reentryFixture = installedExactParentTransientHistoryV1();
    let terminalReceipt:
      | ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1["transitionTransientInternalV1"]
      >
      | null = null;
    const unsubscribe = reentryFixture.kernel.subscribeStateInternalV1(() => {
      unsubscribe();
      terminalReceipt = reentryFixture.kernel.transitionTransientInternalV1({
        kind: "dispose_coordinator",
      });
    });
    const historical = reentryFixture.readinessAuthority
      .settleExactParentTransientChildReadinessReadyInternalV1(
        reentryFixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      );
    expect(historical).toEqual({ kind: "applied" });
    expect(terminalReceipt).toMatchObject({
      kind: "applied",
      code: "surface.coordinator_disposed",
    });
    expect(reentryFixture.kernel.getStateInternalV1().transientState.publication)
      .toMatchObject({ coordinatorDisposed: true, orderedInstances: [] });
    expect(reentryFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);

    const disposeFixture = installedExactParentTransientHistoryV1();
    expect(
      disposeFixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        disposeFixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    expect(
      disposeFixture.kernel.disposeStablePublisherLeaseInternalV1(
        disposeFixture.harness.workspace.lease,
      ),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publisher_disposed" });
    expect(disposeFixture.kernel.getStateInternalV1().transientState.publication.orderedInstances)
      .toEqual([]);
    expect(disposeFixture.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
  });

  it("captures only the exact current ready History action contract", () => {
    const fixture = installedExactParentTransientHistoryV1();
    expect(
      fixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        fixture.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });

    const captured = fixture.childActionAuthority
      .captureCurrentExactParentTransientChildInputInternalV1(fixture.candidate);
    expect(captured.kind).toBe("captured");
    if (captured.kind !== "captured") throw new Error("expected captured History input");
    const child = fixture.kernel.getStateInternalV1().transientState.publication
      .orderedInstances[0]!;
    expect(captured.contract).toMatchObject({
      applicationEpoch: applicationEpochV1,
      ownerId: workspaceOwnerIdV1,
      surfaceInstanceId: child.surfaceInstanceId,
      routingLeaseId: child.routingLeaseId,
      actionIds: [narrativeAdvanceActionIdV1, narrativeOtherActionIdV1],
    });
    expect(Object.isFrozen(captured.contract)).toBe(true);
    expect(Object.isFrozen(captured.contract.actionIds)).toBe(true);

    for (const actionId of [narrativeAdvanceActionIdV1, narrativeOtherActionIdV1]) {
      expect(fixture.childActionAuthority.routeActionInternalV1(Object.freeze({
        evidence: Object.freeze({
          applicationEpoch: captured.contract.applicationEpoch,
          topologyRevision: captured.contract.topologyRevision,
          surfaceInstanceId: captured.contract.surfaceInstanceId,
        }),
        actionId,
        routingLeaseId: captured.contract.routingLeaseId,
      }))).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    }
    expect(() =>
      fixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        Object.freeze({}),
      )
    ).toThrowError(
      "ui.managed_surface_stable_exact_parent_transient_child_action_claim_invalid",
    );

    applyEmptyStablePublicationV1({
      fixture,
      publisher: fixture.harness.workspace,
      sourceRevision: fixture.harness.workspace.issueSourceRevision(),
    });
    expect(
      fixture.childActionAuthority.captureCurrentExactParentTransientChildInputInternalV1(
        fixture.candidate,
      ),
    ).toEqual({ kind: "unavailable" });
  });

  it("fences ordinary current History mutation after stale evidence precedence", () => {
    const preparingFixture = installedExactParentTransientHistoryV1();
    const preparingState = preparingFixture.kernel.getStateInternalV1();
    const preparingChild = preparingState.transientState.publication.orderedInstances[0]!;
    const preparingEvidence = Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: preparingChild.surfaceInstanceId,
    });
    const preparingOperations = [
      Object.freeze({ kind: "readiness_ready" as const, evidence: preparingEvidence }),
      Object.freeze({ kind: "readiness_failed" as const, evidence: preparingEvidence }),
      Object.freeze({
        kind: "route_fallback_dismiss_exact_candidate" as const,
        dismissKind: "routed_cancel" as const,
        evidence: preparingEvidence,
      }),
      Object.freeze({
        kind: "route_fallback_dismiss_with_owner_preparation_cancel" as const,
        dismissKind: "routed_cancel" as const,
        evidence: preparingEvidence,
        ownerId: workspaceOwnerIdV1,
      }),
    ];
    for (const operation of preparingOperations) {
      expect(preparingFixture.kernel.transitionTransientInternalV1(operation)).toMatchObject({
        kind: "rejected",
        code: "surface.invalid_transition",
      });
      expect(preparingFixture.kernel.getStateInternalV1()).toBe(preparingState);
    }

    expect(preparingFixture.kernel.transitionTransientInternalV1({
      kind: "readiness_failed",
      evidence: Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(applicationEpochV1 + 1),
        surfaceInstanceId: preparingChild.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "stale", code: "surface.stale_application_epoch" });

    const fixture = installedExactParentTransientHistoryV1();
    expect(
      fixture.readinessAuthority.settleExactParentTransientChildReadinessReadyInternalV1(
        fixture.candidate,
        Object.freeze({ commitInternalV1: () => true }),
      ),
    ).toEqual({ kind: "applied" });
    const before = fixture.kernel.getStateInternalV1();
    const publication = before.transientState.publication;
    const child = publication.orderedInstances[0]!;
    const evidence = Object.freeze({
      applicationEpoch: publication.applicationEpoch,
      topologyRevision: publication.topologyRevision,
      surfaceInstanceId: child.surfaceInstanceId,
    });
    const replacementCandidate = fixture.kernel.peekTransientCandidateInternalV1({
      definition: fixture.harness.historyDefinition,
      semanticOccurrenceId: null,
    });
    const grandchildCandidate = fixture.kernel.peekTransientCandidateInternalV1({
      definition: definitionV1({
        definitionId: grandchildDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: grandchildSlotV1,
        placement: "child",
        layerOrder: 12,
      }).definition,
      semanticOccurrenceId: null,
    });
    const operations = [
      Object.freeze({
        kind: "prepare_child" as const,
        parentEvidence: evidence,
        candidate: grandchildCandidate,
      }),
      Object.freeze({ kind: "close_expected" as const, evidence }),
      Object.freeze({
        kind: "close_expected_with_owner_preparation_cancel" as const,
        evidence,
        ownerId: workspaceOwnerIdV1,
      }),
      Object.freeze({
        kind: "route_dismiss" as const,
        dismissKind: "routed_cancel" as const,
        evidence,
      }),
      Object.freeze({
        kind: "route_dismiss_with_owner_preparation_cancel" as const,
        dismissKind: "routed_cancel" as const,
        evidence,
        ownerId: workspaceOwnerIdV1,
      }),
      Object.freeze({
        kind: "route_action" as const,
        evidence,
        actionId: narrativeAdvanceActionIdV1,
        routingLeaseId: child.routingLeaseId,
      }),
      Object.freeze({
        kind: "route_action" as const,
        evidence,
        actionId: narrativeOtherActionIdV1,
        routingLeaseId: child.routingLeaseId,
      }),
      Object.freeze({
        kind: "close_owner" as const,
        evidence: Object.freeze({
          applicationEpoch: applicationEpochV1,
          topologyRevision: publication.topologyRevision,
          ownerId: workspaceOwnerIdV1,
        }),
      }),
      Object.freeze({
        kind: "dispose_owner" as const,
        applicationEpoch: publication.applicationEpoch,
        ownerId: workspaceOwnerIdV1,
      }),
      Object.freeze({
        kind: "close_top" as const,
        applicationEpoch: publication.applicationEpoch,
      }),
      Object.freeze({
        kind: "close_top_with_owner_preparation_cancel" as const,
        applicationEpoch: publication.applicationEpoch,
        ownerId: workspaceOwnerIdV1,
      }),
    ];
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    fixture.kernel.subscribeStateInternalV1(stateListener);
    fixture.kernel.subscribeTransientInternalV1(transientListener);
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "prepare_replacement",
      expected: evidence,
      candidate: replacementCandidate,
    })).toMatchObject({ kind: "rejected", code: "surface.slot_placement_mismatch" });
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
    for (const operation of operations) {
      const receipt = fixture.kernel.transitionTransientInternalV1(operation);
      expect(receipt, operation.kind).toMatchObject({
        kind: "rejected",
        code: "surface.invalid_transition",
        beforeTopologyRevision: publication.topologyRevision,
        afterTopologyRevision: publication.topologyRevision,
      });
      expect(fixture.kernel.getStateInternalV1()).toBe(before);
    }
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();

    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        ...evidence,
        topologyRevision: parseNonNegativeSafeInteger(evidence.topologyRevision + 1),
      }),
    })).toMatchObject({ kind: "stale", code: "surface.stale_topology_revision" });
    expect(fixture.kernel.transitionTransientInternalV1({
      kind: "route_action",
      evidence,
      actionId: narrativeAdvanceActionIdV1,
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(
        "surface-routing-lease.app-41.attempt-999",
      ),
    })).toMatchObject({ kind: "stale", code: "surface.stale_routing_lease" });
    expect(fixture.kernel.getStateInternalV1()).toBe(before);
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

  it("invalidates exact direct-target proof on source advance and preserves it through retention", () => {
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
    const replacement = admitAndApplyStableTargetV1({
      harness: fixture.harness,
      kernel: fixture.kernel,
      publisher: fixture.harness.workspace,
      target: fixture.harness.workspaceReplacement,
      sourceRevision: replacementRevision,
    });
    expect(fixture.authority.isCurrentDirectTargetInternalV1(sourceAdvanced.targetProof)).toBe(
      true,
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

    settleCurrentStablePreparationReadyV1(fixture.kernel, replacement);
    expect(fixture.authority.isCurrentDirectTargetInternalV1(sourceAdvanced.targetProof)).toBe(
      false,
    );
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

describe("stable composite state-install participant", () => {
  function claimFixtureV1() {
    const harness = harnessV1();
    const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: harness.authority,
      publisherLeaseRegistry: harness.registry,
      initialTransientState: transientStateV1(),
    });
    return Object.freeze({ harness, kernel });
  }

  function participantProbeV1() {
    let participant!: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1;
    const prepareStateInstallInternalV1 = vi.fn(function (
      this: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1,
      _previousState: ManagedSurfaceStableCompositeStateInternalV1,
      _nextState: ManagedSurfaceStableCompositeStateInternalV1,
    ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null {
      expect(this).toBe(participant);
      return null;
    });
    participant = Object.freeze({ prepareStateInstallInternalV1 });
    return Object.freeze({ participant, prepareStateInstallInternalV1 });
  }

  function lifecycleParticipantProbeV1(
    input: Readonly<{
      readonly trace?: string[] | null;
      readonly onComplete?: (
        context: Readonly<{
          readonly prepareIndex: number;
          readonly previousState: ManagedSurfaceStableCompositeStateInternalV1;
          readonly nextState: ManagedSurfaceStableCompositeStateInternalV1;
        }>,
      ) => void;
    }> = {},
  ) {
    const counts = {
      prepare: 0,
      validate: 0,
      commit: 0,
      abort: 0,
      complete: 0,
    };
    let activePrepared = 0;
    let maxActivePrepared = 0;
    const pushTrace = (entry: string): void => {
      input.trace?.push(entry);
    };
    let participant!: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1;
    const candidate = {
      prepareStateInstallInternalV1(
        this: unknown,
        previousState: ManagedSurfaceStableCompositeStateInternalV1,
        nextState: ManagedSurfaceStableCompositeStateInternalV1,
      ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
        expect(this).toBe(participant);
        counts.prepare += 1;
        const context = Object.freeze({
          prepareIndex: counts.prepare,
          previousState,
          nextState,
        });
        pushTrace(`prepare:${context.prepareIndex}`);
        let settled = false;
        let prepared!: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1;
        const settle = (): void => {
          if (settled) throw new Error("prepared participant settled twice");
          settled = true;
          activePrepared -= 1;
        };
        prepared = Object.freeze({
          validateInternalV1(this: unknown): boolean {
            expect(this).toBe(prepared);
            counts.validate += 1;
            pushTrace(`validate:${context.prepareIndex}`);
            return true;
          },
          commitLogicalInternalV1(this: unknown): void {
            expect(this).toBe(prepared);
            counts.commit += 1;
            pushTrace(`commit:${context.prepareIndex}`);
          },
          abortInternalV1(this: unknown): void {
            expect(this).toBe(prepared);
            counts.abort += 1;
            pushTrace(`abort:${context.prepareIndex}`);
            settle();
          },
          completeInstalledInternalV1(this: unknown): void {
            expect(this).toBe(prepared);
            counts.complete += 1;
            pushTrace(`complete:${context.prepareIndex}`);
            settle();
            input.onComplete?.(context);
          },
        });
        activePrepared += 1;
        maxActivePrepared = Math.max(maxActivePrepared, activePrepared);
        return prepared;
      },
    } satisfies ManagedSurfaceStableCompositeStateInstallParticipantInternalV1;
    participant = Object.freeze(candidate);
    return Object.freeze({
      participant,
      counts,
      getActivePrepared: (): number => activePrepared,
      getMaxActivePrepared: (): number => maxActivePrepared,
    });
  }

  function stableToggleCandidatesV1(harness: StableHarnessV1) {
    const desired = desiredV1(harness, harness.workspaceRoot, harness.workspaceRevision);
    return Object.freeze([
      stableDesiredCandidateV1(desired),
      gapRuntimeCandidateV1(desired),
    ]);
  }

  it("drives the participant through the wrapped direct state transition", () => {
    const { harness, kernel } = claimFixtureV1();
    const { participant, prepareStateInstallInternalV1 } = participantProbeV1();
    kernel.setStateInstallParticipantInternalV1(participant);
    const before = kernel.getStateInternalV1();
    const next = reconcileV1(before, stableToggleCandidatesV1(harness));

    expect(
      kernel.transitionStateInternalV1(() => Object.freeze({ state: next, result: "installed" })),
    ).toBe("installed");
    expect(kernel.getStateInternalV1()).toBe(next);
    expect(prepareStateInstallInternalV1).toHaveBeenCalledTimes(1);
    expect(prepareStateInstallInternalV1).toHaveBeenLastCalledWith(before, next);
  });

  it("drives the participant through the wrapped prepared install", () => {
    const { harness, kernel } = claimFixtureV1();
    const { participant, prepareStateInstallInternalV1 } = participantProbeV1();
    kernel.setStateInstallParticipantInternalV1(participant);
    const before = kernel.getStateInternalV1();
    const next = reconcileV1(before, stableToggleCandidatesV1(harness));
    const prepared = kernel.prepareStateInstallInternalV1(before, next);

    expect(kernel.commitPreparedStateInstallInternalV1(prepared, () => true)).toBe("installed");
    expect(kernel.getStateInternalV1()).toBe(next);
    expect(prepareStateInstallInternalV1).toHaveBeenCalledTimes(1);
    expect(prepareStateInstallInternalV1).toHaveBeenLastCalledWith(before, next);
  });

  it("drives the participant through the wrapped transient transition", () => {
    const { kernel } = claimFixtureV1();
    const { participant, prepareStateInstallInternalV1 } = participantProbeV1();
    kernel.setStateInstallParticipantInternalV1(participant);
    const before = kernel.getStateInternalV1();
    const coordinator = createManagedSurfaceCoordinatorFacadeInternalV1(kernel);

    const opened = coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
      }).definition,
      semanticOccurrenceId: null,
    });
    const next = kernel.getStateInternalV1();
    expect(opened.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
    });
    expect(next).not.toBe(before);
    expect(prepareStateInstallInternalV1).toHaveBeenCalledTimes(1);
    expect(prepareStateInstallInternalV1).toHaveBeenLastCalledWith(before, next);
  });

  it("completes the first terminal install once and permanently fences the participant", () => {
    const { kernel } = claimFixtureV1();
    const trace: string[] = [];
    const lifecycle = lifecycleParticipantProbeV1({ trace });
    kernel.setStateInstallParticipantInternalV1(lifecycle.participant);
    kernel.subscribeTransientInternalV1(() => trace.push("listener:transient"));
    kernel.subscribeStateInternalV1(() => trace.push("listener:state"));

    expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
    });
    expect(lifecycle.counts).toEqual({
      prepare: 1,
      validate: 1,
      commit: 1,
      abort: 0,
      complete: 1,
    });
    expect(trace).toEqual([
      "prepare:1",
      "validate:1",
      "commit:1",
      "listener:transient",
      "listener:state",
      "complete:1",
    ]);
    expect(lifecycle.getActivePrepared()).toBe(0);

    expect(() => kernel.setStateInstallParticipantInternalV1(lifecycle.participant))
      .toThrow(TypeError);

    expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: 1,
      afterTopologyRevision: 1,
    });
    expect(lifecycle.counts).toEqual({
      prepare: 1,
      validate: 1,
      commit: 1,
      abort: 0,
      complete: 1,
    });
  });

  it("completes a listener-installed successor before the historical outer install", () => {
    const { harness, kernel } = claimFixtureV1();
    const trace: string[] = [];
    const completionRows: Array<
      Readonly<{
        prepareIndex: number;
        currentState: ManagedSurfaceStableCompositeStateInternalV1;
        nextState: ManagedSurfaceStableCompositeStateInternalV1;
      }>
    > = [];
    const lifecycle = lifecycleParticipantProbeV1({
      trace,
      onComplete(context) {
        completionRows.push(Object.freeze({
          prepareIndex: context.prepareIndex,
          currentState: kernel.getStateInternalV1(),
          nextState: context.nextState,
        }));
      },
    });
    kernel.setStateInstallParticipantInternalV1(lifecycle.participant);
    const initial = kernel.getStateInternalV1();
    const outerNext = reconcileV1(initial, stableToggleCandidatesV1(harness));
    let nestedNext!: ManagedSurfaceStableCompositeStateInternalV1;
    let nestedResult: string | null = null;
    const unsubscribe = kernel.subscribeStateInternalV1(() => {
      unsubscribe();
      trace.push("listener:outer");
      expect(kernel.getStateInternalV1()).toBe(outerNext);
      nestedResult = kernel.transitionStateInternalV1((currentState) => {
        trace.push("plan:nested");
        nestedNext = reconcileV1(currentState, Object.freeze([]));
        return Object.freeze({ state: nestedNext, result: "nested" });
      });
    });

    const outerResult = kernel.transitionStateInternalV1(() => {
      trace.push("plan:outer");
      return Object.freeze({ state: outerNext, result: "outer" });
    });

    expect(outerResult).toBe("outer");
    expect(nestedResult).toBe("nested");
    expect(kernel.getStateInternalV1()).toBe(nestedNext);
    expect(lifecycle.counts).toEqual({
      prepare: 2,
      validate: 2,
      commit: 2,
      abort: 0,
      complete: 2,
    });
    expect(trace).toEqual([
      "plan:outer",
      "prepare:1",
      "validate:1",
      "commit:1",
      "listener:outer",
      "plan:nested",
      "prepare:2",
      "validate:2",
      "commit:2",
      "complete:2",
      "complete:1",
    ]);
    expect(completionRows).toEqual([
      {
        prepareIndex: 2,
        currentState: nestedNext,
        nextState: nestedNext,
      },
      {
        prepareIndex: 1,
        currentState: nestedNext,
        nextState: outerNext,
      },
    ]);
    expect(lifecycle.getMaxActivePrepared()).toBe(2);
    expect(lifecycle.getActivePrepared()).toBe(0);
  });

  it("keeps one active prepared participant across 10,000 installs", () => {
    const { harness, kernel } = claimFixtureV1();
    const lifecycle = lifecycleParticipantProbeV1({ trace: null });
    kernel.setStateInstallParticipantInternalV1(lifecycle.participant);
    const populated = stableToggleCandidatesV1(harness);
    const empty = Object.freeze([]);

    for (let index = 0; index < 10_000; index += 1) {
      kernel.transitionStateInternalV1((currentState) =>
        Object.freeze({
          state: reconcileV1(currentState, index % 2 === 0 ? populated : empty),
          result: undefined,
        })
      );
    }

    expect(lifecycle.counts).toEqual({
      prepare: 10_000,
      validate: 10_000,
      commit: 10_000,
      abort: 0,
      complete: 10_000,
    });
    expect(lifecycle.getMaxActivePrepared()).toBe(1);
    expect(lifecycle.getActivePrepared()).toBe(0);
    expect(kernel.getStateInternalV1().rootReservationContributors).toEqual([]);
  }, 120_000);
});
