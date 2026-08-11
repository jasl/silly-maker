// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  createSemanticStageStateV1,
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  type AssetId,
  type DeepReadonly,
  type NarrativeHistoryV1,
  type SemanticStageStateV1,
  type StageContentCatalogV1,
  type StageRenderTargetV1,
  type StageTransitionCatalogV1,
  type StageTransitionDefinitionV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { ElementType } from "react";

import { inputHandledV1, playerInputActionIdsV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createManualPresentationClockV1,
  type ManualPresentationClockV1,
} from "../presentation-run/presentation-clock.ts";
import {
  claimStageAcknowledgedRunAuthorityInternalV1,
  createStageReconcilerV1,
} from "../stage/stage-reconciler.ts";
import type {
  StageAcknowledgedRunAuthorityInternalV1,
  StagePresentationGenerationRetargetResultInternalV1,
  StageReconcilerV1,
  StageRetargetInputV1,
  StageTransitionAcknowledgmentV1,
} from "../stage/stage-reconciler.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDismissKindV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  parseManagedSurfaceResolvedDefinitionV1,
} from "../managed-surfaces/managed-surface-definition.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStableBarrierAcknowledgmentControllerInternalV1,
  createNarrativeStablePauseExpiryControllerInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  createNarrativeStableSayRevealControllerInternalV1,
  createNarrativeStableHistoryChildLifecycleInternalV1,
  type CreateNarrativeStablePhysicalActionAdmissionInputInternalV1,
  type CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1,
  type CreateNarrativeStableSayRevealControllerInputInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableCandidatePreflightRejectionCodeInternalV1,
  type NarrativeStableCandidatePreflightResultInternalV1,
  type NarrativeStableChoiceActionAttemptInternalV1,
  type NarrativeStableBarrierAcknowledgmentControllerInternalV1,
  type NarrativeStableBarrierRecoveryAttemptInternalV1,
  type NarrativeStableBarrierRecoveryDispatchResultInternalV1,
  type NarrativeStableBarrierRecoveryGenerationInternalV1,
  type NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1,
  type NarrativeStableBarrierStageRetargetResultInternalV1,
  type NarrativeStableBarrierTerminalDispatchResultInternalV1,
  type NarrativeStableCustomActionAttemptInternalV1,
  type NarrativeStableCapturedHistoryAvailabilityPortInternalV1,
  type NarrativeStableCapturedHistoryObservationPortInternalV1,
  type NarrativeStableDialogueRendererPropsInternalV1,
  type NarrativeStableHistoryAvailabilityPortInternalV1,
  type NarrativeStableHistoryObservationPortInternalV1,
  type NarrativeStableHistoryRendererPropsInternalV1,
  type NarrativeStableHistoryRenderObservationInternalV1,
  type NarrativeStableHistoryOpenActionAttemptInternalV1,
  type NarrativeStableHistoryChildControllerInternalV1,
  type NarrativeStableHistoryChildLifecycleInternalV1,
  type NarrativeStableHistoryChildLifecycleResultInternalV1,
  type NarrativeStableHistoryChildPreparationInternalV1,
  type NarrativeStableHistoryChildPreparationResultInternalV1,
  type NarrativeStableHistoryOpenDispatchResultInternalV1,
  type NarrativeStableHistoryOpenIntentInternalV1,
  type NarrativeStablePauseResumeActionAttemptInternalV1,
  type NarrativeStablePauseExpiryControllerAttemptInternalV1,
  type NarrativeStablePauseExpiryControllerInternalV1,
  type NarrativeStablePauseExpiryDispatchResultInternalV1,
  type NarrativeStablePhysicalActionAdmissionInternalV1,
  type NarrativeStablePhysicalActionDispatchResultInternalV1,
  type NarrativeStablePlaybackModeInternalV1,
  type NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
  type NarrativeStablePlaybackModeToggleDispatchResultInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStablePublisherBridgeResultInternalV1,
  type NarrativeStableRendererComponentInternalV1,
  type NarrativeStableRendererPropsInternalV1,
  type NarrativeStableRequiredPortIdInternalV1,
  type NarrativeStableSayActivationAttemptInternalV1,
  type NarrativeStableSayContentAutoAttemptInternalV1,
  type NarrativeStableSayContentAutoDispatchResultInternalV1,
  type NarrativeStableSayRevealControllerInternalV1,
  type NarrativeStableSayRevealGenerationPortInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
  type NarrativeStableCapturedVoiceReplayPortInternalV1,
  type NarrativeStableVoiceReplayActionAttemptInternalV1,
  type NarrativeStableVoiceReplayDispatchResultInternalV1,
  type NarrativeStableVoiceReplayPortInternalV1,
} from "./narrative-managed-surface-family.ts";
import type {
  NarrativeStableReadinessEntryInternalV1,
  NarrativeStableReadinessSnapshotInternalV1,
} from "./narrative-managed-surface-session.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(91);
const narrativeChooseActionIdV1 = parseManagedSurfaceActionIdV1("narrative.choose");
const narrativeConfirmActionIdV1 = parseManagedSurfaceActionIdV1("ui.confirm");
const narrativeAdvanceActionIdV1 = parseManagedSurfaceActionIdV1("narrative.advance");
const narrativeResumeActionIdV1 = parseManagedSurfaceActionIdV1("narrative.resume");
const narrativeCustomActionIdV1 = parseManagedSurfaceActionIdV1("narrative.custom");
const narrativeReplayVoiceActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.replayVoice,
);
const narrativeToggleAutoActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleAuto,
);
const narrativeToggleSkipActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleSkip,
);
const narrativeToggleHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleHistory,
);
const narrativeUnknownActionIdV1 = parseManagedSurfaceActionIdV1("narrative.unknown");
const zeroDeltaV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});
const defaultSemanticDispatchPortV1 = Object.freeze({
  dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
}) satisfies NarrativeStableSemanticResolutionPortInternalV1;
const defaultHistoryAvailabilityPortV1 = Object.freeze({
  readHistoryAvailabilityInternalV1: () => true,
}) satisfies NarrativeStableHistoryAvailabilityPortInternalV1;
const defaultHistoryObservationPortV1 = Object.freeze({
  getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
  subscribeInternalV1: (_listener: () => void) => Object.freeze(() => {}),
}) satisfies NarrativeStableHistoryObservationPortInternalV1;
const defaultCandidateSnapshotV1 = Object.freeze({
  rendererComponent: Object.freeze({ kind: "dialogue-renderer" }),
  visualConfig: Object.freeze({ skin: "test" }),
  semanticDispatchPort: defaultSemanticDispatchPortV1,
  historyObservationPort: defaultHistoryObservationPortV1,
  historyAvailabilityPort: defaultHistoryAvailabilityPortV1,
  playerProfile: Object.freeze({ locale: "en" }),
  presentationClock: Object.freeze({ kind: "manual-clock" }),
  textResolver: Object.freeze({ kind: "text-resolver" }),
  voiceReplayPort: null,
  quickMenuContribution: null,
});
const capturedCandidatePreflightResultV1 = (
  candidateSnapshot: unknown = defaultCandidateSnapshotV1,
) =>
  Object.freeze({
    kind: "captured" as const,
    candidateSnapshot,
  });
const defaultCandidatePreflightV1: NarrativeStableCandidatePreflightInternalV1 = Object.freeze({
  preflightCandidateInternalV1: () => capturedCandidatePreflightResultV1(),
});

interface NarrativeHarnessV1 {
  readonly contract: NarrativeManagedSurfaceFamilyContractInternalV1;
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stateNotificationCount: () => number;
}

function createCompositionPartsV1(
  contract: NarrativeManagedSurfaceFamilyContractInternalV1,
) {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: contract.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: contract.stableDefinitionSidecars,
    resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      contract.resolvedOwnerIds,
      contract.resolvedSlotDescriptors,
    ),
  });
  return { registry, authority, kernel };
}

function harnessV1(input: {
  readonly candidatePreflight?: NarrativeStableCandidatePreflightInternalV1;
} = {}): NarrativeHarnessV1 {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const { registry, authority, kernel } = createCompositionPartsV1(contract);
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: registry,
    admissionAuthority: authority,
    compositeRuntimeKernel: kernel,
    candidatePreflight: input.candidatePreflight ?? defaultCandidatePreflightV1,
    exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  let stateNotifications = 0;
  kernel.subscribeStateInternalV1(() => {
    stateNotifications += 1;
  });
  return {
    contract,
    registry,
    authority,
    kernel,
    bridge,
    stateNotificationCount: () => stateNotifications,
  };
}

function narrativeBaselineV1(harness: NarrativeHarnessV1) {
  const baseline = harness.kernel.getStateInternalV1().stableAcceptedBaselines.find((candidate) =>
    candidate.kind === "accepted"
      ? candidate.ownerId === harness.contract.ownerId
      : harness.registry.inspectCurrentLease(candidate.publisherLease)?.ownerId ===
        harness.contract.ownerId
  );
  expect(baseline).toBeDefined();
  return baseline!;
}

function publisherSnapshotV1(harness: NarrativeHarnessV1) {
  const baseline = narrativeBaselineV1(harness);
  const snapshot = harness.registry.inspectCurrentLease(baseline.publisherLease);
  expect(snapshot).not.toBeNull();
  return snapshot!;
}

function occurrenceV1(sequence: number): string {
  return `interaction-occurrence.${String(sequence)}`;
}

function pendingV1(
  kind: "say" | "choice" | "pause" | "presentation_barrier" | "custom",
  sequence = 1,
): unknown {
  const base = {
    definitionId: `narrative.test.${kind.replace("_", "-")}`,
    seenRevision: 1,
    occurrenceId: occurrenceV1(sequence),
  };
  switch (kind) {
    case "say":
      return {
        kind,
        ...base,
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        advancePolicy: "confirm",
      };
    case "choice":
      return {
        kind,
        ...base,
        promptTextId: "text.test.prompt",
        options: [
          { choiceId: "choice.test.first", textId: "text.test.first" },
          { choiceId: "choice.test.second", textId: "text.test.second" },
        ],
      };
    case "pause":
      return { kind, ...base, durationMs: 250, skippable: true };
    case "presentation_barrier":
      return {
        kind,
        ...base,
        expectedTransitionId: "transition.test.fade",
        loadRecovery: "replay",
      };
    case "custom":
      return {
        kind,
        ...base,
        surfaceId: "narrative.custom.test",
        params: { z: 2, a: { enabled: true } },
      };
    default:
      throw new Error(`unsupported pending kind: ${String(kind)}`);
  }
}

const barrierStageContentCatalogV1: StageContentCatalogV1 = Object.freeze({
  resolveContent: (contentId: Parameters<StageContentCatalogV1["resolveContent"]>[0]) =>
    Object.freeze({
      rendererId: "renderer.test.barrier-stage",
      assetIds: Object.freeze([`asset.for.${contentId}` as AssetId]),
      accessibleName: `Barrier stage ${contentId}`,
      props: Object.freeze({}),
    }),
});

function barrierStageStateV1(contents: readonly string[]): SemanticStageStateV1 {
  const initial = createSemanticStageStateV1({
    stageId: "stage.test.barrier",
    layerIds: ["layer.test.barrier"],
  });
  const result = reduceStageMutationsV1(
    initial,
    contents.map((contentId, index) => ({
      kind: "show",
      layerId: "layer.test.barrier",
      tag: `tag.test.barrier-${String(index)}`,
      contentId,
    })),
  );
  if (result.kind !== "applied") throw new Error("barrier Stage fixture must apply");
  return result.state;
}

function barrierStageTargetV1(...contents: readonly string[]): StageRenderTargetV1 {
  return projectStageRenderTargetV1(
    barrierStageStateV1(contents),
    barrierStageContentCatalogV1,
  ).target;
}

function barrierTransitionDefinitionV1(
  overrides: Partial<StageTransitionDefinitionV1> = {},
): StageTransitionDefinitionV1 {
  return parseStageTransitionDefinitionV1({
    transitionId: "transition.test.fade",
    kind: "crossfade",
    durationMs: 100,
    easing: "linear",
    inputPolicy: "target_active",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: true,
    slide: null,
    ...overrides,
  });
}

function barrierTransitionCatalogV1(
  resolve: StageTransitionCatalogV1["resolveTransition"],
  byId: Readonly<Record<string, StageTransitionDefinitionV1>> = {},
): StageTransitionCatalogV1 {
  return Object.freeze({
    resolveTransition: resolve,
    resolveTransitionById: (
      transitionId: Parameters<NonNullable<StageTransitionCatalogV1["resolveTransitionById"]>>[0],
    ) => byId[transitionId] ?? null,
  });
}

interface BarrierStageHarnessV1 {
  readonly clock: ManualPresentationClockV1;
  readonly reconciler: StageReconcilerV1;
  readonly authority: StageAcknowledgedRunAuthorityInternalV1 | null;
  readonly initialTarget: StageRenderTargetV1;
  readonly nextTarget: StageRenderTargetV1;
  readonly thirdTarget: StageRenderTargetV1;
}

function createBarrierStageHarnessV1(input: {
  readonly claimant?: object;
  readonly transition?: StageTransitionDefinitionV1;
  readonly resolveTransition?: StageTransitionCatalogV1["resolveTransition"];
  readonly initialContents?: readonly string[];
  readonly nextContents?: readonly string[];
  readonly prefersReducedMotion?: () => boolean;
  readonly assetsReady?: (assetIds: readonly AssetId[]) => boolean;
  readonly onAcknowledgment?: (acknowledgment: StageTransitionAcknowledgmentV1) => void;
}): BarrierStageHarnessV1 {
  const clock = createManualPresentationClockV1();
  const transition = input.transition ?? barrierTransitionDefinitionV1();
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: barrierTransitionCatalogV1(
      input.resolveTransition ?? (() => transition),
      { [transition.transitionId]: transition },
    ),
    ...(input.prefersReducedMotion === undefined
      ? {}
      : { prefersReducedMotion: input.prefersReducedMotion }),
    ...(input.assetsReady === undefined ? {} : { assetsReady: input.assetsReady }),
    ...(input.onAcknowledgment === undefined ? {} : { onAcknowledgment: input.onAcknowledgment }),
  });
  const initialTarget = barrierStageTargetV1(
    ...(input.initialContents ?? ["content.test.barrier-a"]),
  );
  const nextTarget = barrierStageTargetV1(
    ...(input.nextContents ?? ["content.test.barrier-b"]),
  );
  const thirdTarget = barrierStageTargetV1("content.test.barrier-c");
  reconciler.retarget({ target: initialTarget, revision: 1, epoch: applicationEpochV1 });
  const authority = input.claimant === undefined
    ? null
    : claimStageAcknowledgedRunAuthorityInternalV1(reconciler, input.claimant);
  return { clock, reconciler, authority, initialTarget, nextTarget, thirdTarget };
}

function barrierRetargetInputV1(
  target: StageRenderTargetV1,
  revision: number,
): StageRetargetInputV1 {
  return Object.freeze({ target, revision, epoch: applicationEpochV1 });
}

function barrierPresentationRetargetInputV1(
  target: StageRenderTargetV1,
  revision: number,
  epoch: number,
): StageRetargetInputV1 {
  return Object.freeze({
    target,
    revision,
    epoch: parseNonNegativeSafeInteger(epoch),
  });
}

function barrierPendingWithRecoveryV1(
  loadRecovery: "settle" | "replay",
  sequence = 1,
): unknown {
  return {
    ...(pendingV1("presentation_barrier", sequence) as Record<string, unknown>),
    loadRecovery,
  };
}

interface MutableActivationGateV1 {
  readonly gate: ManagedSurfaceFamilyActivationGateInternalV1;
  readonly isOpen: () => boolean;
  open(): void;
  close(): void;
  fault(error: Error | null): void;
}

function mutableActivationGateV1(initiallyOpen = false): MutableActivationGateV1 {
  let open = initiallyOpen;
  let fault: Error | null = null;
  const isOpen = vi.fn(() => {
    if (fault !== null) throw fault;
    return open;
  });
  const gate = Object.freeze({ isOpen }) satisfies ManagedSurfaceFamilyActivationGateInternalV1;
  return {
    gate,
    isOpen,
    open: () => {
      open = true;
    },
    close: () => {
      open = false;
    },
    fault: (error) => {
      fault = error;
    },
  };
}

function expectZeroResultV1(
  value: unknown,
  kind: "unchanged" | "stale" | "rejected" | "faulted",
  code: string,
): void {
  expect(value).toEqual({ kind, code, delta: zeroDeltaV1 });
  expect(Object.isFrozen(value)).toBe(true);
}

function settleCurrentNarrativeReadyV1(harness: NarrativeHarnessV1): void {
  const entry = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
  if (entry?.binding.kind !== "preparing") throw new Error("expected Narrative preparation");
  expect(
    harness.kernel.settleStableReadinessReadyInternalV1({
      readinessEvidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
      }),
      publisherLease: entry.desiredTarget.publisherLease,
      sourceRevision: entry.desiredTarget.sourceRevision,
    }),
  ).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
}

function stableContributorCandidatesV1(
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[] {
  return Object.freeze(entries.flatMap((entry) => [
    Object.freeze({ kind: "stable_desired" as const, desiredTarget: entry.desiredTarget }),
    Object.freeze({
      kind: "stable_runtime" as const,
      desiredTarget: entry.desiredTarget,
      binding: entry.binding,
    }),
  ]));
}

function suspendCurrentNarrativeV1(harness: NarrativeHarnessV1): void {
  const current = harness.kernel.getStateInternalV1();
  const entry = current.stableRuntimeBindings[0];
  if (entry?.binding.kind !== "ready_instance") throw new Error("expected ready Narrative root");
  const suspended = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: entry.binding.instance.attempt,
    phase: "suspended",
  });
  const entries = Object.freeze(
    current.stableRuntimeBindings.map((candidate) =>
      candidate === entry ? Object.freeze({ ...candidate, binding: suspended }) : candidate
    ),
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: stableContributorCandidatesV1(entries),
  });
  const prepared = harness.kernel.prepareStateInstallInternalV1(current, next);
  expect(harness.kernel.commitPreparedStateInstallInternalV1(prepared, () => true)).toBe(
    "installed",
  );
}

function physicalChoiceHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly isGestureCurrent?: () => boolean;
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
        })),
    }),
  });
  expect(harness.bridge.reconcilePendingInternalV1(pendingV1("choice"))).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  settleCurrentNarrativeReadyV1(harness);
  const inputRouter = createInputRouterV1();
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
    harness.kernel,
  );
  const admissionInput = Object.freeze({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: input.isGestureCurrent ?? (() => true),
  }) satisfies CreateNarrativeStablePhysicalActionAdmissionInputInternalV1;
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1(admissionInput);
  return { harness, inputRouter, stableActionAuthority, admission, semanticDispatchPort };
}

function physicalPauseHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly isGestureCurrent?: () => boolean;
  readonly skippable?: boolean;
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
        })),
    }),
  });
  const pending = {
    ...(pendingV1("pause") as Record<string, unknown>),
    skippable: input.skippable ?? true,
  };
  expect(harness.bridge.reconcilePendingInternalV1(pending)).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  settleCurrentNarrativeReadyV1(harness);
  const inputRouter = createInputRouterV1();
  const admissionInput = Object.freeze({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: input.isGestureCurrent ?? (() => true),
  }) satisfies CreateNarrativeStablePhysicalActionAdmissionInputInternalV1;
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1(admissionInput);
  return { harness, inputRouter, admission, semanticDispatchPort };
}

function physicalCustomHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly isGestureCurrent?: () => boolean;
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
        })),
    }),
  });
  expect(harness.bridge.reconcilePendingInternalV1(pendingV1("custom"))).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  settleCurrentNarrativeReadyV1(harness);
  const inputRouter = createInputRouterV1();
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: input.isGestureCurrent ?? (() => true),
  });
  return { harness, inputRouter, admission, semanticDispatchPort };
}

function physicalSayHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly revealGenerationPort?: NarrativeStableSayRevealGenerationPortInternalV1;
  readonly isGestureCurrent?: () => boolean;
  readonly advancePolicy?: "confirm" | "auto";
  readonly historyAvailabilityPort?: unknown;
  readonly playerProfile?: unknown;
  readonly presentationClock?: unknown;
  readonly voiceReplayPort?: unknown;
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          historyAvailabilityPort: input.historyAvailabilityPort ??
            defaultCandidateSnapshotV1.historyAvailabilityPort,
          playerProfile: input.playerProfile ?? defaultCandidateSnapshotV1.playerProfile,
          presentationClock: input.presentationClock ??
            defaultCandidateSnapshotV1.presentationClock,
          voiceReplayPort: input.voiceReplayPort ?? defaultCandidateSnapshotV1.voiceReplayPort,
        })),
    }),
  });
  expect(
    harness.bridge.reconcilePendingInternalV1({
      ...(pendingV1("say") as Record<string, unknown>),
      advancePolicy: input.advancePolicy ?? "confirm",
    }),
  ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  settleCurrentNarrativeReadyV1(harness);
  const revealGenerationPort = input.revealGenerationPort ?? Object.freeze({
    capturePhaseInternalV1: () => "incomplete" as const,
    revealAllInternalV1: () => {},
  });
  const controllerInput = Object.freeze({
    bridge: harness.bridge,
    revealGenerationPort,
  }) satisfies CreateNarrativeStableSayRevealControllerInputInternalV1;
  const controller = createNarrativeStableSayRevealControllerInternalV1(controllerInput);
  const inputRouter = createInputRouterV1();
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: input.isGestureCurrent ?? (() => true),
  });
  return {
    harness,
    inputRouter,
    admission,
    controller,
    revealGenerationPort,
    semanticDispatchPort,
  };
}

function routePlaybackModeToggleV1(
  admission: NarrativeStablePhysicalActionAdmissionInternalV1,
  requestedMode: "auto" | "skip",
  attempt: unknown,
  gestureSuffix: string,
) {
  return admission.routeInternalV1(
    admission.createEnvelopeInternalV1({
      actionId: requestedMode === "auto"
        ? narrativeToggleAutoActionIdV1
        : narrativeToggleSkipActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        `gesture.narrative.playback-mode-${gestureSuffix}`,
      ),
    }),
    attempt,
  );
}

type NarrativeReadyPendingKindV1 =
  | "say"
  | "choice"
  | "pause"
  | "custom"
  | "presentation_barrier";

function historyAvailabilityPortV1(
  readHistoryAvailabilityInternalV1: () => boolean,
): NarrativeStableHistoryAvailabilityPortInternalV1 {
  return { readHistoryAvailabilityInternalV1 };
}

function physicalHistoryHarnessV1(input: {
  readonly kind?: NarrativeReadyPendingKindV1;
  readonly historyAvailabilityPort?: unknown;
  readonly historyObservationPort?: unknown;
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly isGestureCurrent?: () => boolean;
} = {}) {
  const kind = input.kind ?? "say";
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const historyObservationPort = input.historyObservationPort ??
    defaultCandidateSnapshotV1.historyObservationPort;
  const historyAvailabilityPort = input.historyAvailabilityPort ??
    defaultCandidateSnapshotV1.historyAvailabilityPort;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          historyObservationPort,
          historyAvailabilityPort,
        })),
    }),
  });
  expect(harness.bridge.reconcilePendingInternalV1(pendingV1(kind))).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  settleCurrentNarrativeReadyV1(harness);
  const inputRouter = createInputRouterV1();
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: input.isGestureCurrent ?? (() => true),
  });
  return { harness, inputRouter, admission, semanticDispatchPort };
}

function routeHistoryOpenV1(
  admission: NarrativeStablePhysicalActionAdmissionInternalV1,
  attempt: unknown,
  gestureSuffix: string,
) {
  return admission.routeInternalV1(
    admission.createEnvelopeInternalV1({
      actionId: narrativeToggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        `gesture.narrative.history-open-${gestureSuffix}`,
      ),
    }),
    attempt,
  );
}

function expectHistoryRouteConsumedV1(
  result: ReturnType<typeof routeHistoryOpenV1>,
): NarrativeStableHistoryOpenDispatchResultInternalV1 {
  expect(result.route).toMatchObject({
    input: { kind: "consumed", code: "input.managed_surface_consumed" },
    surface: { kind: "unchanged", code: "surface.action_routed" },
  });
  expect(result.consumerResult).not.toBeNull();
  return result.consumerResult as NarrativeStableHistoryOpenDispatchResultInternalV1;
}

function mintHistoryOpenIntentV1(
  admission: NarrativeStablePhysicalActionAdmissionInternalV1,
  gestureSuffix: string,
): NarrativeStableHistoryOpenIntentInternalV1 {
  const attempt = admission.issueHistoryOpenAttemptInternalV1();
  if (attempt === null) throw new Error("expected History-open attempt");
  const result = expectHistoryRouteConsumedV1(
    routeHistoryOpenV1(admission, attempt, gestureSuffix),
  );
  if (result.kind !== "requested") throw new Error("expected History-open intent");
  return result.intent;
}

function retireCurrentHistoryChildWithRootCutoverV1(
  harness: NarrativeHarnessV1,
  sequence: number,
): void {
  const publication = harness.kernel.getStateInternalV1().transientState.publication;
  const child = publication.orderedInstances.find((instance) =>
    instance.definition.definitionId === "surface.narrative.history"
  );
  if (child === undefined) throw new Error("expected current History child");
  expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", sequence)))
    .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  settleCurrentNarrativeReadyV1(harness);
  expect(
    harness.kernel.getStateInternalV1().transientState.publication.orderedInstances,
  ).toEqual([]);
}

function createNarrativeBridgeSuccessorV1(
  harness: NarrativeHarnessV1,
): NarrativeStablePublisherBridgeInternalV1 {
  return createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: harness.registry,
    admissionAuthority: harness.authority,
    compositeRuntimeKernel: harness.kernel,
    candidatePreflight: defaultCandidatePreflightV1,
    exactAggregateDefinitionSidecars: harness.contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
  });
}

function automaticPauseHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly skippable?: boolean;
  readonly presentationClock?: object | ((...args: never[]) => unknown);
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          presentationClock: input.presentationClock ??
            defaultCandidateSnapshotV1.presentationClock,
        })),
    }),
  });
  expect(
    harness.bridge.reconcilePendingInternalV1({
      ...(pendingV1("pause") as Record<string, unknown>),
      skippable: input.skippable ?? true,
    }),
  ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  settleCurrentNarrativeReadyV1(harness);
  const controller = createNarrativeStablePauseExpiryControllerInternalV1(harness.bridge);
  return { harness, controller, semanticDispatchPort };
}

interface NarrativeBarrierHarnessV1 {
  readonly harness: NarrativeHarnessV1;
  readonly stage: BarrierStageHarnessV1;
  readonly controller: NarrativeStableBarrierAcknowledgmentControllerInternalV1;
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
}

function narrativeBarrierHarnessV1(input: {
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly historyAvailabilityPort?: unknown;
  readonly transition?: StageTransitionDefinitionV1;
  readonly resolveTransition?: StageTransitionCatalogV1["resolveTransition"];
  readonly initialContents?: readonly string[];
  readonly nextContents?: readonly string[];
  readonly pending?: unknown;
  readonly settleReady?: boolean;
  readonly prefersReducedMotion?: () => boolean;
  readonly assetsReady?: (assetIds: readonly AssetId[]) => boolean;
  readonly onAcknowledgment?: (acknowledgment: StageTransitionAcknowledgmentV1) => void;
} = {}): NarrativeBarrierHarnessV1 {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          historyAvailabilityPort: input.historyAvailabilityPort ??
            defaultCandidateSnapshotV1.historyAvailabilityPort,
        })),
    }),
  });
  expect(
    harness.bridge.reconcilePendingInternalV1(
      input.pending ?? pendingV1("presentation_barrier"),
    ),
  ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  if (input.settleReady ?? true) settleCurrentNarrativeReadyV1(harness);
  const stage = createBarrierStageHarnessV1({
    ...(input.transition === undefined ? {} : { transition: input.transition }),
    ...(input.resolveTransition === undefined
      ? {}
      : { resolveTransition: input.resolveTransition }),
    ...(input.initialContents === undefined ? {} : { initialContents: input.initialContents }),
    ...(input.nextContents === undefined ? {} : { nextContents: input.nextContents }),
    ...(input.prefersReducedMotion === undefined
      ? {}
      : { prefersReducedMotion: input.prefersReducedMotion }),
    ...(input.assetsReady === undefined ? {} : { assetsReady: input.assetsReady }),
    ...(input.onAcknowledgment === undefined ? {} : { onAcknowledgment: input.onAcknowledgment }),
  });
  const controllerInput = Object.freeze({
    bridge: harness.bridge,
    stageReconciler: stage.reconciler,
  }) satisfies CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1;
  const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1(
    controllerInput,
  );
  return { harness, stage, controller, semanticDispatchPort };
}

function expectBarrierResultFrozenV1(
  result:
    | NarrativeStableBarrierStageRetargetResultInternalV1
    | NarrativeStableBarrierTerminalDispatchResultInternalV1,
): void {
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.keys(result)).toEqual(
    result.kind === "faulted" && "code" in result
      ? ["kind", "code", "completion"]
      : ["kind", "completion"],
  );
}

function nonBlockingNarrativeHarnessV1(
  semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1,
  layerOrder = 90,
  modality: "non_blocking" | "blocking" = "non_blocking",
  voiceReplayPort: unknown = defaultCandidateSnapshotV1.voiceReplayPort,
) {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const nonBlockingDefinition = parseManagedSurfaceResolvedDefinitionV1({
    definitionId: "surface.test.nonblocking-input",
    contractRevision: 1,
    ownerId: "surface-owner.test-nonblocking",
    slotId: "surface-slot.test-nonblocking",
    layerId: "surface-layer.test-nonblocking",
    layerOrder,
    placement: "root",
    modality,
    inputPolicy: { kind: "managed", inputContextId: "overlay" },
    dismissPolicy: { back: false, escape: false, backdrop: false, routedCancel: false },
    focusPolicy: { kind: "none" },
    navigationPolicy: { kind: "none" },
    actionIds: [],
    readiness: {
      initialOpen: "blocking_fallback",
      primaryReplacement: "retain_current",
      childOpen: "blocking_fallback",
    },
  });
  const extraSlot = Object.freeze({
    kind: "root" as const,
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.test-nonblocking"),
    cardinality: "single" as const,
  });
  const resolvedOwnerIds = Object.freeze([
    ...contract.resolvedOwnerIds,
    nonBlockingDefinition.ownerId,
  ]);
  const resolvedSlotDescriptors = Object.freeze([
    ...contract.resolvedSlotDescriptors,
    extraSlot,
  ]);
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: contract.stableDefinitionSidecars,
    resolvedSlotDescriptors,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      resolvedOwnerIds,
      resolvedSlotDescriptors,
    ),
  });
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: registry,
    admissionAuthority: authority,
    compositeRuntimeKernel: kernel,
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          voiceReplayPort,
        })),
    }),
    exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: resolvedSlotDescriptors,
  });
  let stateNotifications = 0;
  kernel.subscribeStateInternalV1(() => {
    stateNotifications += 1;
  });
  const harness: NarrativeHarnessV1 = {
    contract,
    registry,
    authority,
    kernel,
    bridge,
    stateNotificationCount: () => stateNotifications,
  };
  return { harness, nonBlockingDefinition };
}

function openNonBlockingSurfaceV1(
  harness: NarrativeHarnessV1,
  definition: ReturnType<typeof parseManagedSurfaceResolvedDefinitionV1>,
  expectedPreparationPhase: "active" | "suspended",
  expectedInputOwner: "narrative" | "candidate",
  duringPreparation: () => void = () => {},
  expectedReadyPhase: "active" | "suspended" = "active",
) {
  const before = harness.kernel.getStateInternalV1();
  const stableBefore = before.stableRuntimeBindings[0];
  if (stableBefore?.binding.kind !== "ready_instance") {
    throw new Error("expected ready Narrative root before nonblocking input owner");
  }
  expect(stableBefore.binding.instance.phase).toBe("active");
  const candidate = harness.kernel.peekTransientCandidateInternalV1({
    definition,
    semanticOccurrenceId: null,
  });
  expect(harness.kernel.transitionTransientInternalV1({
    kind: "prepare_initial",
    applicationEpoch: applicationEpochV1,
    candidate,
  })).toMatchObject({
    kind: "applied",
    code: "surface.preparation_started",
    surfaceInstanceId: candidate.surfaceInstanceId,
  });
  const preparingState = harness.kernel.getStateInternalV1();
  const preparingStable = preparingState.stableRuntimeBindings[0];
  if (preparingStable?.binding.kind !== "ready_instance") {
    throw new Error("expected ready Narrative root during nonblocking preparation");
  }
  expect(preparingStable.binding.instance.phase).toBe(expectedPreparationPhase);
  duringPreparation();
  expect(harness.kernel.transitionTransientInternalV1({
    kind: "readiness_ready",
    evidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: candidate.surfaceInstanceId,
    }),
  })).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
  const after = harness.kernel.getStateInternalV1();
  const stableAfter = after.stableRuntimeBindings[0];
  if (stableAfter?.binding.kind !== "ready_instance") {
    throw new Error("expected ready Narrative root after nonblocking input owner");
  }
  expect(stableAfter.binding.instance.phase).toBe(expectedReadyPhase);
  if (expectedInputOwner === "candidate") {
    expect(after.transientState.publication.inputOwner?.surfaceInstanceId).toBe(
      candidate.surfaceInstanceId,
    );
  } else {
    expect(after.transientState.publication.inputOwner?.surfaceInstanceId).not.toBe(
      candidate.surfaceInstanceId,
    );
  }
  return candidate;
}

describe("Narrative stable Managed Surface family", () => {
  it("freezes the source-relative candidate preflight result contract", () => {
    type ExpectedPreflightResultV1 =
      | Readonly<{ readonly kind: "captured"; readonly candidateSnapshot: unknown }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.renderer_missing";
      }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.required_port_missing";
        readonly portId: NarrativeStableRequiredPortIdInternalV1;
      }>
      | Readonly<{
        readonly kind: "faulted";
        readonly code: "narrative.candidate_preflight_faulted";
      }>;
    type ExpectedFamilyBridgeResultV1 =
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.renderer_missing";
        readonly delta: typeof zeroDeltaV1;
      }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.required_port_missing";
        readonly portId: NarrativeStableRequiredPortIdInternalV1;
        readonly delta: typeof zeroDeltaV1;
      }>
      | Readonly<{
        readonly kind: "faulted";
        readonly code: "narrative.candidate_preflight_faulted";
        readonly delta: typeof zeroDeltaV1;
      }>;

    expectTypeOf<NarrativeStableRequiredPortIdInternalV1>().toEqualTypeOf<
      | "narrative.semantic_dispatch"
      | "narrative.history_observation"
      | "narrative.history_availability"
      | "narrative.player_profile"
      | "narrative.presentation_clock"
      | "narrative.text_resolver"
    >();
    expectTypeOf<NarrativeStableCandidatePreflightRejectionCodeInternalV1>()
      .toEqualTypeOf<"narrative.renderer_missing" | "narrative.required_port_missing">();
    expectTypeOf<NarrativeStableCandidatePreflightResultInternalV1>()
      .toEqualTypeOf<ExpectedPreflightResultV1>();
    expectTypeOf<
      Extract<
        NarrativeStablePublisherBridgeResultInternalV1,
        { readonly code: `narrative.${string}` }
      >
    >().toEqualTypeOf<ExpectedFamilyBridgeResultV1>();
  });

  it("freezes the exact root/History catalog without making History a stable target", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();

    expect(Reflect.ownKeys(contract)).toEqual([
      "ownerId",
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
      "definitions",
      "stableDefinitionSidecars",
    ]);
    expect(contract.ownerId).toBe("surface-owner.narrative");
    expect(contract.resolvedOwnerIds).toEqual(["surface-owner.narrative"]);
    expect(contract.resolvedSlotDescriptors).toEqual([
      {
        kind: "root",
        slotId: "surface-slot.narrative.root",
        cardinality: "single",
      },
      {
        kind: "child",
        parentDefinitionId: "surface.narrative.dialogue",
        slotId: "surface-slot.narrative.history",
        cardinality: "single",
      },
    ]);
    expect(contract.definitions.dialogue).toEqual({
      definitionId: "surface.narrative.dialogue",
      contractRevision: 2,
      ownerId: "surface-owner.narrative",
      slotId: "surface-slot.narrative.root",
      layerId: "surface-layer.narrative",
      layerOrder: 40,
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "narrative" },
      dismissPolicy: { back: false, escape: false, backdrop: false, routedCancel: false },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.narrative.primary",
        trap: true,
        restore: "previous_owner",
      },
      navigationPolicy: { kind: "none" },
      actionIds: [
        "ui.confirm",
        "narrative.advance",
        "narrative.choose",
        "narrative.resume",
        "narrative.custom",
        "player.toggle_auto",
        "player.toggle_skip",
        "player.toggle_history",
        "player.replay_voice",
      ],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.history).toMatchObject({
      definitionId: "surface.narrative.history",
      contractRevision: 1,
      ownerId: "surface-owner.narrative",
      slotId: "surface-slot.narrative.history",
      layerId: "surface-layer.narrative",
      layerOrder: 41,
      placement: "child",
      modality: "blocking",
      dismissPolicy: { back: true, escape: true, backdrop: true, routedCancel: true },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.narrative.history-close",
        trap: true,
        restore: "opener",
      },
      navigationPolicy: { kind: "close" },
    });
    expect(contract.definitions.history.actionIds).toEqual([
      "ui.cancel",
      "player.toggle_history",
    ]);
    expect(playerInputActionIdsV1.toggleUi).toBe("player.toggle_ui");
    expect(contract.stableDefinitionSidecars).toHaveLength(1);
    expect(contract.stableDefinitionSidecars[0]?.definition).toBe(
      contract.definitions.dialogue,
    );
    expect(
      contract.stableDefinitionSidecars.some((sidecar) =>
        sidecar.definition === contract.definitions.history
      ),
    ).toBe(false);
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.resolvedSlotDescriptors)).toBe(true);
    expect(Object.isFrozen(contract.definitions.dialogue.actionIds)).toBe(true);
  });

  it("claims one exact composition configuration and rejects foreign or duplicate construction", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const exact = createCompositionPartsV1(contract);
    const foreign = createCompositionPartsV1(contract);
    let foreignPreflightReads = 0;
    const foreignPreflight = Object.defineProperty(
      {},
      "preflightCandidateInternalV1",
      {
        get() {
          foreignPreflightReads += 1;
          throw new Error("foreign composition must not inspect candidate preflight");
        },
      },
    ) as NarrativeStableCandidatePreflightInternalV1;

    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: foreign.authority,
        compositeRuntimeKernel: exact.kernel,
        candidatePreflight: foreignPreflight,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(foreignPreflightReads).toBe(0);
    expect(exact.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });
    expect(exact.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);

    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: exact.authority,
        compositeRuntimeKernel: foreign.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(exact.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });

    const bridge = createNarrativeStablePublisherBridgeInternalV1({
      publisherLeaseRegistry: exact.registry,
      admissionAuthority: exact.authority,
      compositeRuntimeKernel: exact.kernel,
      candidatePreflight: defaultCandidatePreflightV1,
      exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
      exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    expect(Object.isFrozen(bridge)).toBe(true);
    expect(exact.registry.getSnapshot().currentPublisherCount).toBe(1);
    expect(exact.kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    const state = exact.kernel.getStateInternalV1();
    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: exact.authority,
        compositeRuntimeKernel: exact.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.managed_surface_stable_publisher_owner_current");
    expect(exact.kernel.getStateInternalV1()).toBe(state);
  });

  it("cleans an issued publisher when registration throws inside the shared transition fence", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    const createBridge = (): NarrativeStablePublisherBridgeInternalV1 =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      });
    const state = parts.kernel.getStateInternalV1();

    expect(() =>
      parts.kernel.transitionStateInternalV1((currentState) => {
        createBridge();
        return Object.freeze({ state: currentState, result: null });
      })
    ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
    expect(parts.kernel.getStateInternalV1()).toBe(state);
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 1,
      currentPublisherCount: 0,
    });

    expect(Object.isFrozen(createBridge())).toBe(true);
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
  });

  it("rejects a synchronously retired registration without deleting its listener-installed successor", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    const createBridge = (): NarrativeStablePublisherBridgeInternalV1 =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      });
    let handled = false;
    let successorBridge: NarrativeStablePublisherBridgeInternalV1 | null = null;
    const unsubscribe = parts.kernel.subscribeStateInternalV1(() => {
      if (handled) return;
      handled = true;
      const baseline = parts.kernel.getStateInternalV1().stableAcceptedBaselines[0];
      if (baseline === undefined) throw new Error("expected registered baseline");
      expect(
        parts.kernel.disposeStablePublisherLeaseInternalV1(baseline.publisherLease).kind,
      ).toBe("applied");
      successorBridge = createBridge();
    });

    expect(createBridge).toThrowError("ui.narrative_stable_composition_invalid");
    unsubscribe();
    expect(handled).toBe(true);
    expect(successorBridge).not.toBeNull();
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
    expect(parts.kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    expect(
      (successorBridge as unknown as NarrativeStablePublisherBridgeInternalV1)
        .reconcilePendingInternalV1(pendingV1("say")),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  });

  it("keeps initial null registered-unpublished without issuing source or occurrence", () => {
    const harness = harnessV1();
    const before = harness.kernel.getStateInternalV1();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(null),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(narrativeBaselineV1(harness).kind).toBe("unpublished");
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });
    expect(harness.stateNotificationCount()).toBe(0);
  });

  it("captures exact candidate preflight once and rejects missing or throwing ports before issuance", () => {
    let preflightGetterReads = 0;
    let preflightCalls = 0;
    let exactPreflight: NarrativeStableCandidatePreflightInternalV1;
    exactPreflight = Object.defineProperty({}, "preflightCandidateInternalV1", {
      get() {
        preflightGetterReads += 1;
        return function (this: unknown, pending: unknown, rendererKey: unknown) {
          expect(this).toBe(exactPreflight);
          expect(pending).toMatchObject({ kind: "say", occurrenceId: occurrenceV1(1) });
          expect(rendererKey).toBe("narrative.renderer.say");
          preflightCalls += 1;
          return capturedCandidatePreflightResultV1();
        };
      },
    }) as NarrativeStableCandidatePreflightInternalV1;
    const accepted = harnessV1({ candidatePreflight: exactPreflight });
    expect(preflightGetterReads).toBe(1);
    expect(accepted.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(preflightCalls).toBe(1);
    expectZeroResultV1(
      accepted.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(preflightCalls).toBe(1);
    const acceptedBaseline = narrativeBaselineV1(accepted);
    if (acceptedBaseline.kind !== "accepted") throw new Error("expected accepted baseline");
    const captured = accepted.bridge.inspectAdmittedTargetFrameInternalV1(
      acceptedBaseline.targets[0]!,
    )?.candidateSnapshot;
    expect(captured).not.toBe(defaultCandidateSnapshotV1);
    expect(captured).toEqual({
      ...defaultCandidateSnapshotV1,
      semanticDispatchPort: captured?.semanticDispatchPort,
      historyAvailabilityPort: captured?.historyAvailabilityPort,
      historyObservationPort: captured?.historyObservationPort,
    });
    expect(Object.isFrozen(captured)).toBe(true);
    expect(captured?.rendererComponent).toBe(defaultCandidateSnapshotV1.rendererComponent);
    expect(captured?.semanticDispatchPort).not.toBe(defaultSemanticDispatchPortV1);
    expect(Object.isFrozen(captured?.semanticDispatchPort)).toBe(true);
    expect(Reflect.ownKeys(captured?.semanticDispatchPort as object)).toEqual([]);
    expect(captured?.historyAvailabilityPort).not.toBe(defaultHistoryAvailabilityPortV1);
    expectTypeOf(captured?.historyAvailabilityPort).toEqualTypeOf<
      NarrativeStableCapturedHistoryAvailabilityPortInternalV1 | undefined
    >();
    expect(Object.isFrozen(captured?.historyAvailabilityPort)).toBe(true);
    expect(Reflect.ownKeys(captured?.historyAvailabilityPort as object)).toEqual([]);
    expect(captured?.historyObservationPort).not.toBe(defaultHistoryObservationPortV1);
    expectTypeOf(captured?.historyObservationPort).toEqualTypeOf<
      NarrativeStableCapturedHistoryObservationPortInternalV1 | undefined
    >();
    expect(Object.isFrozen(captured?.historyObservationPort)).toBe(true);
    expect(Reflect.ownKeys(captured?.historyObservationPort as object)).toEqual([]);

    const missing = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          }),
      }),
    });
    const missingState = missing.kernel.getStateInternalV1();
    expectZeroResultV1(
      missing.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "rejected",
      "narrative.renderer_missing",
    );
    expect(missing.kernel.getStateInternalV1()).toBe(missingState);
    expect(publisherSnapshotV1(missing)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    const throwing = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          throw new Error("resolver failed");
        },
      }),
    });
    const throwingState = throwing.kernel.getStateInternalV1();
    expectZeroResultV1(
      throwing.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "faulted",
      "narrative.candidate_preflight_faulted",
    );
    expect(throwing.kernel.getStateInternalV1()).toBe(throwingState);
    expect(publisherSnapshotV1(throwing)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: Object.freeze({}) as NarrativeStableCandidatePreflightInternalV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });
  });

  it.each(
    [
      "narrative.semantic_dispatch",
      "narrative.history_observation",
      "narrative.history_availability",
      "narrative.player_profile",
      "narrative.presentation_clock",
      "narrative.text_resolver",
    ] as const,
  )("returns exact zero delta for missing required port %s", (portId) => {
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          Object.freeze({
            kind: "rejected" as const,
            code: "narrative.required_port_missing" as const,
            portId,
          }),
      }),
    });
    const state = harness.kernel.getStateInternalV1();
    const result = harness.bridge.reconcilePendingInternalV1(pendingV1("say"));
    expect(result).toEqual({
      kind: "rejected",
      code: "narrative.required_port_missing",
      portId,
      delta: zeroDeltaV1,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });
    expect(harness.stateNotificationCount()).toBe(0);
  });

  it("captures one exact tagged preflight record without invoking caller getters", () => {
    let resultPrototypeReads = 0;
    let resultOwnKeyReads = 0;
    let resultDescriptorReads = 0;
    let resultValueReads = 0;
    let snapshotPrototypeReads = 0;
    let snapshotOwnKeyReads = 0;
    let snapshotDescriptorReads = 0;
    let snapshotValueReads = 0;
    const rawSnapshot = new Proxy(defaultCandidateSnapshotV1, {
      getPrototypeOf() {
        snapshotPrototypeReads += 1;
        return Object.prototype;
      },
      ownKeys(target) {
        snapshotOwnKeyReads += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        snapshotDescriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      get() {
        snapshotValueReads += 1;
        throw new Error("candidate snapshot values must come from captured descriptors");
      },
    });
    const rawResult = new Proxy(
      {
        kind: "captured" as const,
        candidateSnapshot: rawSnapshot,
      },
      {
        getPrototypeOf() {
          resultPrototypeReads += 1;
          return Object.prototype;
        },
        ownKeys(target) {
          resultOwnKeyReads += 1;
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          resultDescriptorReads += 1;
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
        get() {
          resultValueReads += 1;
          throw new Error("preflight result values must come from captured descriptors");
        },
      },
    );
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => rawResult,
      }) as NarrativeStableCandidatePreflightInternalV1,
    });

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(resultPrototypeReads).toBe(1);
    expect(resultOwnKeyReads).toBe(1);
    expect(resultDescriptorReads).toBe(2);
    expect(resultValueReads).toBe(0);
    expect(snapshotPrototypeReads).toBe(1);
    expect(snapshotOwnKeyReads).toBe(1);
    expect(snapshotDescriptorReads).toBe(10);
    expect(snapshotValueReads).toBe(0);
  });

  it("validates the separate raw History availability descriptor before any allocation", () => {
    expectTypeOf<NarrativeStableHistoryAvailabilityPortInternalV1>().toEqualTypeOf<
      Readonly<{ readonly readHistoryAvailabilityInternalV1: () => boolean }>
    >();
    const inherited = Object.create({
      readHistoryAvailabilityInternalV1: () => true,
    });
    const accessor = Object.defineProperty({}, "readHistoryAvailabilityInternalV1", {
      get: () => () => true,
      enumerable: true,
    });
    const extraSymbol = Object.assign(
      { readHistoryAvailabilityInternalV1: () => true },
      { [Symbol("extra")]: true },
    );
    const trap = (name: "prototype" | "keys" | "descriptor") =>
      new Proxy(
        { readHistoryAvailabilityInternalV1: () => true },
        {
          ...(name === "prototype"
            ? {
              getPrototypeOf: () => {
                throw new Error("prototype trap");
              },
            }
            : {}),
          ...(name === "keys"
            ? {
              ownKeys: () => {
                throw new Error("keys trap");
              },
            }
            : {}),
          ...(name === "descriptor"
            ? {
              getOwnPropertyDescriptor: () => {
                throw new Error("descriptor trap");
              },
            }
            : {}),
        },
      );
    const malformedPorts: readonly unknown[] = [
      null,
      [],
      () => true,
      Object.create(null),
      Object.create({}),
      {},
      inherited,
      accessor,
      { readHistoryAvailabilityInternalV1: true },
      { readHistoryAvailabilityInternalV1: () => true, extra: true },
      extraSymbol,
      trap("prototype"),
      trap("keys"),
      trap("descriptor"),
    ];

    for (const historyAvailabilityPort of malformedPorts) {
      const harness = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () =>
            capturedCandidatePreflightResultV1(Object.freeze({
              ...defaultCandidateSnapshotV1,
              historyAvailabilityPort,
            })),
        }),
      });
      const state = harness.kernel.getStateInternalV1();
      expectZeroResultV1(
        harness.bridge.reconcilePendingInternalV1(pendingV1("say")),
        "faulted",
        "narrative.candidate_preflight_faulted",
      );
      expect(harness.kernel.getStateInternalV1()).toBe(state);
      expect(publisherSnapshotV1(harness)).toMatchObject({
        sourceRevisionIssuanceHighWater: 0,
        occurrenceIssuanceHighWater: 0,
      });
      expect(harness.stateNotificationCount()).toBe(0);
    }
  });

  it("freezes the exact History observation and renderer type surface", () => {
    expectTypeOf<keyof NarrativeStableHistoryObservationPortInternalV1>().toEqualTypeOf<
      "getSnapshotInternalV1" | "subscribeInternalV1"
    >();
    expectTypeOf<keyof NarrativeStableHistoryRenderObservationInternalV1>().toEqualTypeOf<
      "getSnapshotInternalV1" | "subscribeInternalV1"
    >();
    expectTypeOf<keyof NarrativeStableDialogueRendererPropsInternalV1>().toEqualTypeOf<
      | "kind"
      | "pending"
      | "visualConfig"
      | "playerProfile"
      | "textResolver"
      | "quickMenuContribution"
    >();
    expectTypeOf<keyof NarrativeStableHistoryRendererPropsInternalV1>().toEqualTypeOf<
      "kind" | "history" | "visualConfig" | "playerProfile" | "textResolver"
    >();
    expectTypeOf<NarrativeStableRendererPropsInternalV1>().toEqualTypeOf<
      NarrativeStableDialogueRendererPropsInternalV1 | NarrativeStableHistoryRendererPropsInternalV1
    >();
    expectTypeOf<NarrativeStableRendererComponentInternalV1>().toEqualTypeOf<
      ElementType<NarrativeStableRendererPropsInternalV1>
    >();
    expectTypeOf<
      NarrativeStableHistoryObservationPortInternalV1["getSnapshotInternalV1"]
    >().returns.toEqualTypeOf<DeepReadonly<NarrativeHistoryV1>>();
  });

  it("descriptor-captures the raw History observation and maps malformed ports to exact preflight fault", () => {
    let rawPort!: NarrativeStableHistoryObservationPortInternalV1;
    const getSnapshot = vi.fn(function (this: unknown) {
      expect(this).toBe(rawPort);
      return emptyNarrativeHistoryV1;
    });
    const subscribe = vi.fn(function (this: unknown, listener: () => void) {
      expect(this).toBe(rawPort);
      expect(listener).toEqual(expect.any(Function));
      return Object.freeze(() => {});
    });
    rawPort = {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
    };
    const accepted = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            historyObservationPort: rawPort,
          })),
      }),
    });
    expect(accepted.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const baseline = narrativeBaselineV1(accepted);
    if (baseline.kind !== "accepted") throw new Error("expected accepted baseline");
    const captured = accepted.bridge.inspectAdmittedTargetFrameInternalV1(
      baseline.targets[0]!,
    )?.candidateSnapshot.historyObservationPort;
    expect(captured).not.toBe(rawPort);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Reflect.ownKeys(captured as object)).toEqual([]);
    expect(getSnapshot).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();

    let accessorReads = 0;
    const accessor = Object.defineProperties({}, {
      getSnapshotInternalV1: {
        enumerable: true,
        get() {
          accessorReads += 1;
          return () => emptyNarrativeHistoryV1;
        },
      },
      subscribeInternalV1: {
        enumerable: true,
        value: () => Object.freeze(() => {}),
      },
    });
    const malformedPorts: readonly unknown[] = Object.freeze([
      null,
      [],
      () => emptyNarrativeHistoryV1,
      Object.create(null),
      Object.create({
        getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
        subscribeInternalV1: () => Object.freeze(() => {}),
      }),
      accessor,
      Object.freeze({
        getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
        subscribeInternalV1: () => Object.freeze(() => {}),
        extra: true,
      }),
      Object.freeze({
        getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
        subscribeInternalV1: () => Object.freeze(() => {}),
        [Symbol("extra")]: true,
      }),
      Object.freeze({
        getSnapshotInternalV1: true,
        subscribeInternalV1: () => Object.freeze(() => {}),
      }),
      new Proxy(
        Object.freeze({
          getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
          subscribeInternalV1: () => Object.freeze(() => {}),
        }),
        {
          getOwnPropertyDescriptor() {
            throw new Error("descriptor trap");
          },
        },
      ),
      new Proxy(
        Object.freeze({
          getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
          subscribeInternalV1: () => Object.freeze(() => {}),
        }),
        {
          getPrototypeOf() {
            throw new Error("prototype trap");
          },
        },
      ),
    ]);
    for (const historyObservationPort of malformedPorts) {
      const fixture = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () =>
            capturedCandidatePreflightResultV1(Object.freeze({
              ...defaultCandidateSnapshotV1,
              historyObservationPort,
            })),
        }),
      });
      const state = fixture.kernel.getStateInternalV1();
      expectZeroResultV1(
        fixture.bridge.reconcilePendingInternalV1(pendingV1("say")),
        "faulted",
        "narrative.candidate_preflight_faulted",
      );
      expect(fixture.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.stateNotificationCount()).toBe(0);
    }
    expect(accessorReads).toBe(0);
  });

  it("retains the original History availability callable and keeps captured observation dormant", () => {
    let rawPort!: NarrativeStableHistoryAvailabilityPortInternalV1;
    const original = vi.fn(function (this: unknown, ...args: readonly unknown[]) {
      expect(this).toBe(rawPort);
      expect(args).toEqual([]);
      return true;
    });
    const replacement = vi.fn(() => false);
    rawPort = {
      readHistoryAvailabilityInternalV1: original,
    };
    const observationReads = vi.fn(() => emptyNarrativeHistoryV1);
    const observationSubscriptions = vi.fn(() => Object.freeze(() => {}));
    const observationPort = Object.freeze({
      getSnapshotInternalV1: observationReads,
      subscribeInternalV1: observationSubscriptions,
    }) satisfies NarrativeStableHistoryObservationPortInternalV1;
    const fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: rawPort,
      historyObservationPort: observationPort,
    });
    const baseline = narrativeBaselineV1(fixture.harness);
    if (baseline.kind !== "accepted") throw new Error("expected History baseline");
    const captured = fixture.harness.bridge.inspectAdmittedTargetFrameInternalV1(
      baseline.targets[0]!,
    )?.candidateSnapshot.historyAvailabilityPort;
    expectTypeOf(captured).toEqualTypeOf<
      NarrativeStableCapturedHistoryAvailabilityPortInternalV1 | undefined
    >();
    expect(captured).not.toBe(rawPort);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Reflect.ownKeys(captured as object)).toEqual([]);

    Object.defineProperty(rawPort, "readHistoryAvailabilityInternalV1", {
      get() {
        throw new Error("captured availability must not re-read the raw member");
      },
      configurable: true,
    });
    const attempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const result = expectHistoryRouteConsumedV1(
      routeHistoryOpenV1(fixture.admission, attempt, "captured-original"),
    );
    expect(result.kind).toBe("requested");
    expect(original).toHaveBeenCalledOnce();
    expect(replacement).not.toHaveBeenCalled();
    expect(observationReads).not.toHaveBeenCalled();
    expect(observationSubscriptions).not.toHaveBeenCalled();
    fixture.admission.disposeInternalV1();
  });

  it("maps declared faults and malformed tagged results or snapshots to the family fault", () => {
    const accessorResult = Object.defineProperty(
      { kind: "rejected" },
      "code",
      { get: () => "narrative.renderer_missing", enumerable: true },
    );
    const customPrototypeResult = Object.assign(Object.create({}), {
      kind: "faulted",
      code: "narrative.candidate_preflight_faulted",
    });
    const candidateSnapshotMissingQuickMenu = Object.freeze({
      rendererComponent: defaultCandidateSnapshotV1.rendererComponent,
      visualConfig: defaultCandidateSnapshotV1.visualConfig,
      semanticDispatchPort: defaultCandidateSnapshotV1.semanticDispatchPort,
      historyObservationPort: defaultCandidateSnapshotV1.historyObservationPort,
      historyAvailabilityPort: defaultCandidateSnapshotV1.historyAvailabilityPort,
      playerProfile: defaultCandidateSnapshotV1.playerProfile,
      presentationClock: defaultCandidateSnapshotV1.presentationClock,
      textResolver: defaultCandidateSnapshotV1.textResolver,
      voiceReplayPort: defaultCandidateSnapshotV1.voiceReplayPort,
    });
    const candidateSnapshotAccessor = Object.defineProperty(
      { ...defaultCandidateSnapshotV1 },
      "textResolver",
      { get: () => defaultCandidateSnapshotV1.textResolver, enumerable: true },
    );
    const semanticDispatchPortAccessor = Object.defineProperty(
      {},
      "dispatchResolutionInternalV1",
      { get: () => () => Promise.resolve(undefined), enumerable: true },
    );
    const malformedResults: readonly unknown[] = Object.freeze([
      Object.freeze({}),
      Promise.resolve(capturedCandidatePreflightResultV1()),
      Object.freeze({
        kind: "faulted",
        code: "narrative.candidate_preflight_faulted",
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.required_port_missing",
        portId: "narrative.unknown",
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.renderer_missing",
        extra: true,
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.required_port_missing",
      }),
      Object.freeze({
        kind: "faulted",
        code: "narrative.candidate_preflight_faulted",
        [Symbol("extra")]: true,
      }),
      accessorResult,
      customPrototypeResult,
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        quickMenuContribution: "not-an-opaque-port",
      })),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        extra: true,
      })),
      capturedCandidatePreflightResultV1(candidateSnapshotMissingQuickMenu),
      capturedCandidatePreflightResultV1(candidateSnapshotAccessor),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        semanticDispatchPort: Object.freeze({
          ...defaultSemanticDispatchPortV1,
          extra: true,
        }),
      })),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        semanticDispatchPort: semanticDispatchPortAccessor,
      })),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: null }),
      })),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        semanticDispatchPort: Object.freeze(Object.assign(Object.create(null), {
          dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        })),
      })),
    ]);
    for (const rawResult of malformedResults) {
      const harness = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () => rawResult,
        }) as NarrativeStableCandidatePreflightInternalV1,
      });
      const before = harness.kernel.getStateInternalV1();
      expectZeroResultV1(
        harness.bridge.reconcilePendingInternalV1(pendingV1("say")),
        "faulted",
        "narrative.candidate_preflight_faulted",
      );
      expect(harness.kernel.getStateInternalV1()).toBe(before);
      expect(publisherSnapshotV1(harness)).toMatchObject({
        sourceRevisionIssuanceHighWater: 0,
        occurrenceIssuanceHighWater: 0,
      });
    }
  });

  it("keeps the accepted candidate on replacement preflight failure and fails closed on reentry", () => {
    let preflightCalls = 0;
    const replacementHarness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return preflightCalls === 1 ? capturedCandidatePreflightResultV1() : Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          });
        },
      }),
    });
    expect(
      replacementHarness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)).kind,
    ).toBe("applied");
    const acceptedState = replacementHarness.kernel.getStateInternalV1();
    const acceptedBaseline = narrativeBaselineV1(replacementHarness);
    const acceptedTarget = acceptedBaseline.kind === "accepted"
      ? acceptedBaseline.targets[0]
      : undefined;
    const acceptedFrame = acceptedTarget === undefined
      ? null
      : replacementHarness.bridge.inspectAdmittedTargetFrameInternalV1(acceptedTarget);
    expectZeroResultV1(
      replacementHarness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)),
      "rejected",
      "narrative.renderer_missing",
    );
    expect(replacementHarness.kernel.getStateInternalV1()).toBe(acceptedState);
    expect(narrativeBaselineV1(replacementHarness)).toBe(acceptedBaseline);
    expect(
      acceptedTarget === undefined
        ? null
        : replacementHarness.bridge.inspectAdmittedTargetFrameInternalV1(acceptedTarget),
    ).toBe(acceptedFrame);
    expect(publisherSnapshotV1(replacementHarness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });

    let reentered = false;
    let nestedResult: unknown = null;
    let reentrantBridge: NarrativeStablePublisherBridgeInternalV1;
    const reentrantHarness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          if (!reentered) {
            reentered = true;
            nestedResult = reentrantBridge.reconcilePendingInternalV1(pendingV1("say"));
            return Object.freeze({
              kind: "rejected" as const,
              code: "narrative.renderer_missing" as const,
            });
          }
          return capturedCandidatePreflightResultV1();
        },
      }),
    });
    reentrantBridge = reentrantHarness.bridge;
    expectZeroResultV1(
      reentrantBridge.reconcilePendingInternalV1(pendingV1("say")),
      "stale",
      "surface.stable_reconcile_precondition_stale",
    );
    expect(nestedResult).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(publisherSnapshotV1(reentrantHarness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("loses first-wins to synchronous preflight disposal without issuing on the stale lease", () => {
    let bridge: NarrativeStablePublisherBridgeInternalV1;
    let disposedState:
      | ReturnType<ManagedSurfaceStableCompositeRuntimeKernelInternalV1["getStateInternalV1"]>
      | null = null;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          expect(bridge.disposeInternalV1()).toMatchObject({
            kind: "applied",
            code: "surface.stable_publisher_disposed",
          });
          disposedState = harness.kernel.getStateInternalV1();
          return Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          });
        },
      }),
    });
    bridge = harness.bridge;

    expectZeroResultV1(
      bridge.reconcilePendingInternalV1(pendingV1("say")),
      "stale",
      "surface.stable_publisher_lease_stale",
    );
    expect(disposedState).not.toBeNull();
    expect(harness.kernel.getStateInternalV1()).toBe(disposedState);
    expect(harness.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 1,
      currentPublisherCount: 0,
    });
  });

  it.each(
    [
      ["say", "narrative.renderer.say"],
      ["choice", "narrative.renderer.choice"],
      ["pause", "narrative.renderer.pause"],
      ["presentation_barrier", "narrative.renderer.presentation_barrier"],
      ["custom", "narrative.custom.test"],
    ] as const,
  )("projects every %s interaction to one exact root", (kind, rendererKey) => {
    const harness = harnessV1();
    const pending = pendingV1(kind);

    expect(harness.bridge.reconcilePendingInternalV1(pending)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const baseline = narrativeBaselineV1(harness);
    expect(baseline.kind).toBe("accepted");
    if (baseline.kind !== "accepted") throw new Error("expected accepted baseline");
    expect(baseline.sourceRevision).toBe(1);
    expect(baseline.targets).toHaveLength(1);
    const target = baseline.targets[0]!;
    expect(target).toMatchObject({
      ownerId: "surface-owner.narrative",
      definitionId: "surface.narrative.dialogue",
      parentOccurrenceId: null,
      normalizedParameters: {
        semanticOccurrenceId: occurrenceV1(1),
        kind,
        definitionId: `narrative.test.${kind.replace("_", "-")}`,
        seenRevision: 1,
        rendererKey,
      },
    });
    expect(target.occurrenceId).not.toBe(occurrenceV1(1));
    const frame = harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    expect(frame).toEqual({
      semanticOccurrenceId: occurrenceV1(1),
      rendererKey,
      pending: parsePendingInteractionV1(pending),
      candidateSnapshot: {
        ...defaultCandidateSnapshotV1,
        semanticDispatchPort: frame?.candidateSnapshot.semanticDispatchPort,
        historyAvailabilityPort: frame?.candidateSnapshot.historyAvailabilityPort,
        historyObservationPort: frame?.candidateSnapshot.historyObservationPort,
      },
    });
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame?.pending)).toBe(true);
    expect(frame?.candidateSnapshot.semanticDispatchPort).not.toBe(
      defaultSemanticDispatchPortV1,
    );
    expect(Reflect.ownKeys(frame?.candidateSnapshot.semanticDispatchPort as object)).toEqual([]);
    expect(frame?.candidateSnapshot.historyAvailabilityPort).not.toBe(
      defaultHistoryAvailabilityPortV1,
    );
    expect(Reflect.ownKeys(frame?.candidateSnapshot.historyAvailabilityPort as object))
      .toEqual([]);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("keeps Base-valid full PendingInteraction proof above stable target canonical limits", () => {
    const harness = harnessV1();
    const params = Object.fromEntries(
      Array.from({ length: 64 }, (_outerValue, outerIndex) => [
        `group_${String(outerIndex)}`,
        Array.from(
          { length: 64 },
          (_innerValue, innerIndex) =>
            `value_${String(outerIndex)}_${String(innerIndex)}_${"x".repeat(24)}`,
        ),
      ]),
    );
    const pending = {
      kind: "custom",
      definitionId: "narrative.test.large-custom",
      seenRevision: 1,
      occurrenceId: occurrenceV1(1),
      surfaceId: "narrative.custom.large",
      params,
    };
    const normalized = parsePendingInteractionV1(pending);
    expect(canonicalJsonBytes(normalized).byteLength).toBeGreaterThan(65_536);

    expect(harness.bridge.reconcilePendingInternalV1(pending)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const baseline = narrativeBaselineV1(harness);
    if (baseline.kind !== "accepted") throw new Error("expected accepted baseline");
    expect(harness.bridge.inspectAdmittedTargetFrameInternalV1(baseline.targets[0]!)?.pending)
      .toEqual(normalized);
  });

  it("uses full normalized canonical equality while reusing exact accepted identity", () => {
    const harness = harnessV1();
    const first = pendingV1("custom") as Record<string, unknown>;
    const second = {
      ...first,
      params: { a: { enabled: true }, z: 2 },
    };
    expect(harness.bridge.reconcilePendingInternalV1(first).kind).toBe("applied");
    const state = harness.kernel.getStateInternalV1();
    const baseline = narrativeBaselineV1(harness);
    const target = baseline.kind === "accepted" ? baseline.targets[0] : undefined;
    const frame = target === undefined
      ? null
      : harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    const notifications = harness.stateNotificationCount();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(second),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(narrativeBaselineV1(harness)).toBe(baseline);
    expect(
      target === undefined ? null : harness.bridge.inspectAdmittedTargetFrameInternalV1(target),
    ).toBe(frame);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
    expect(harness.stateNotificationCount()).toBe(notifications);
  });

  it.each(
    [
      ["say text", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        textId: "text.test.changed",
      }],
      ["say speaker", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        speakerTextId: null,
      }],
      ["say advance policy", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        advancePolicy: "auto",
      }],
      ["choice prompt", pendingV1("choice"), {
        ...(pendingV1("choice") as Record<string, unknown>),
        promptTextId: "text.test.prompt-changed",
      }],
      ["choice options", pendingV1("choice"), {
        ...(pendingV1("choice") as Record<string, unknown>),
        options: [{ choiceId: "choice.test.changed", textId: "text.test.changed" }],
      }],
      ["pause duration", pendingV1("pause"), {
        ...(pendingV1("pause") as Record<string, unknown>),
        durationMs: 251,
      }],
      ["pause skippable", pendingV1("pause"), {
        ...(pendingV1("pause") as Record<string, unknown>),
        skippable: false,
      }],
      ["barrier transition", pendingV1("presentation_barrier"), {
        ...(pendingV1("presentation_barrier") as Record<string, unknown>),
        expectedTransitionId: "transition.test.changed",
      }],
      ["barrier recovery", pendingV1("presentation_barrier"), {
        ...(pendingV1("presentation_barrier") as Record<string, unknown>),
        loadRecovery: "settle",
      }],
      ["custom surface", pendingV1("custom"), {
        ...(pendingV1("custom") as Record<string, unknown>),
        surfaceId: "narrative.custom.changed",
      }],
      ["custom params", pendingV1("custom"), {
        ...(pendingV1("custom") as Record<string, unknown>),
        params: { z: 3, a: { enabled: true } },
      }],
      ["base definition", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        definitionId: "narrative.test.changed",
      }],
      ["base seen revision", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        seenRevision: 2,
      }],
      ["interaction kind", pendingV1("say"), pendingV1("choice")],
    ] as const,
  )("faults same-occurrence %s drift before issuing", (_name, initial, changed) => {
    const harness = harnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(initial).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    const snapshot = publisherSnapshotV1(harness);
    const notifications = harness.stateNotificationCount();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(changed),
      "faulted",
      "surface.stable_reconcile_faulted",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(publisherSnapshotV1(harness)).toBe(snapshot);
    expect(harness.stateNotificationCount()).toBe(notifications);
  });

  it("advances dedicated source and occurrence across replace, empty, and reopen", () => {
    const harness = harnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)).kind).toBe(
      "applied",
    );
    const first = narrativeBaselineV1(harness);
    if (first.kind !== "accepted") throw new Error("expected first baseline");
    const firstOccurrence = first.targets[0]!.occurrenceId;

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)).kind).toBe(
      "applied",
    );
    const second = narrativeBaselineV1(harness);
    if (second.kind !== "accepted") throw new Error("expected second baseline");
    expect(second.sourceRevision).toBe(2);
    expect(second.targets[0]!.occurrenceId).not.toBe(firstOccurrence);

    expect(harness.bridge.reconcilePendingInternalV1(null).kind).toBe("applied");
    const empty = narrativeBaselineV1(harness);
    if (empty.kind !== "accepted") throw new Error("expected empty baseline");
    expect(empty.sourceRevision).toBe(3);
    expect(empty.targets).toEqual([]);
    expect(publisherSnapshotV1(harness).occurrenceIssuanceHighWater).toBe(2);
    const emptyState = harness.kernel.getStateInternalV1();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(null),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(emptyState);

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 3)).kind).toBe(
      "applied",
    );
    const reopened = narrativeBaselineV1(harness);
    if (reopened.kind !== "accepted") throw new Error("expected reopened baseline");
    expect(reopened.sourceRevision).toBe(4);
    expect(reopened.targets[0]!.occurrenceId).not.toBe(second.targets[0]!.occurrenceId);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 4,
      occurrenceIssuanceHighWater: 3,
    });
  });

  it("re-preflights a readiness-failed target before allocating its fresh candidate", () => {
    const retryRenderer = Object.freeze({ kind: "dialogue-renderer-retry" });
    let preflightCalls = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return capturedCandidatePreflightResultV1(
            preflightCalls === 1 ? defaultCandidateSnapshotV1 : Object.freeze({
              ...defaultCandidateSnapshotV1,
              rendererComponent: retryRenderer,
            }),
          );
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")).kind).toBe("applied");
    expect(preflightCalls).toBe(1);
    const beforeFailure = harness.kernel.getStateInternalV1();
    const entry = beforeFailure.stableRuntimeBindings[0]!;
    if (entry.binding.kind !== "preparing") throw new Error("expected preparing binding");
    const originalInstanceId = entry.binding.attempt.identity.surfaceInstanceId;
    const targetOccurrenceId = entry.desiredTarget.admittedTarget.occurrenceId;
    expect(
      harness.kernel.settleStableReadinessFailedInternalV1({
        readinessEvidence: {
          applicationEpoch: applicationEpochV1,
          surfaceInstanceId: originalInstanceId,
        },
        publisherLease: entry.desiredTarget.publisherLease,
        sourceRevision: entry.desiredTarget.sourceRevision,
      }).kind,
    ).toBe("applied");

    expect(harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(preflightCalls).toBe(2);
    const retried = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    expect(retried.desiredTarget.admittedTarget.occurrenceId).toBe(targetOccurrenceId);
    expect(retried.desiredTarget.sourceRevision).toBe(2);
    expect(retried.binding.kind).toBe("preparing");
    if (retried.binding.kind !== "preparing") throw new Error("expected retried candidate");
    expect(retried.binding.attempt.identity.surfaceInstanceId).not.toBe(originalInstanceId);
    const retriedBaseline = narrativeBaselineV1(harness);
    if (retriedBaseline.kind !== "accepted") throw new Error("expected retried baseline");
    expect(
      harness.bridge.inspectAdmittedTargetFrameInternalV1(retriedBaseline.targets[0]!)
        ?.candidateSnapshot.rendererComponent,
    ).toBe(retryRenderer);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 2,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("keeps a readiness-failed gap exact when retry preflight rejects", () => {
    let preflightCalls = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return preflightCalls === 1 ? capturedCandidatePreflightResultV1() : Object.freeze({
            kind: "rejected" as const,
            code: "narrative.required_port_missing" as const,
            portId: "narrative.text_resolver" as const,
          });
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")).kind).toBe("applied");
    const preparing = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    if (preparing.binding.kind !== "preparing") throw new Error("expected preparing binding");
    expect(
      harness.kernel.settleStableReadinessFailedInternalV1({
        readinessEvidence: {
          applicationEpoch: applicationEpochV1,
          surfaceInstanceId: preparing.binding.attempt.identity.surfaceInstanceId,
        },
        publisherLease: preparing.desiredTarget.publisherLease,
        sourceRevision: preparing.desiredTarget.sourceRevision,
      }).kind,
    ).toBe("applied");
    const failedState = harness.kernel.getStateInternalV1();
    const failedBaseline = narrativeBaselineV1(harness);
    const failedSnapshot = publisherSnapshotV1(harness);

    const rejectedRetry = harness.bridge.retryCurrentPendingInternalV1();
    expect(rejectedRetry).toEqual({
      kind: "rejected",
      code: "narrative.required_port_missing",
      portId: "narrative.text_resolver",
      delta: zeroDeltaV1,
    });
    expect(Object.isFrozen(rejectedRetry)).toBe(true);
    expect(preflightCalls).toBe(2);
    expect(harness.kernel.getStateInternalV1()).toBe(failedState);
    expect(narrativeBaselineV1(harness)).toBe(failedBaseline);
    expect(publisherSnapshotV1(harness)).toBe(failedSnapshot);
  });

  it("publishes proof before synchronous state notification reentry", () => {
    const harness = harnessV1();
    const pending = pendingV1("say");
    let nested: unknown = null;
    let reentered = false;
    const unsubscribe = harness.kernel.subscribeStateInternalV1(() => {
      if (reentered) return;
      reentered = true;
      nested = harness.bridge.reconcilePendingInternalV1(pending);
    });

    expect(harness.bridge.reconcilePendingInternalV1(pending).kind).toBe("applied");
    unsubscribe();
    expectZeroResultV1(
      nested,
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("fails invalid hostile pending before issuance and reads nothing after disposal", () => {
    const harness = harnessV1();
    const before = harness.kernel.getStateInternalV1();
    const invalid = Object.defineProperty({}, "kind", {
      get: () => {
        throw new Error("must not invoke accessor");
      },
    });
    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(invalid),
      "rejected",
      "surface.stable_schema_invalid",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    expect(harness.bridge.disposeInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
    });
    const target = {};
    const { proxy, revoke } = Proxy.revocable(target, {});
    revoke();
    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(proxy),
      "stale",
      "surface.stable_publisher_lease_stale",
    );
    expectZeroResultV1(
      harness.bridge.disposeInternalV1(),
      "unchanged",
      "surface.stable_publisher_already_disposed",
    );

    const successor = createNarrativeStablePublisherBridgeInternalV1({
      publisherLeaseRegistry: harness.registry,
      admissionAuthority: harness.authority,
      compositeRuntimeKernel: harness.kernel,
      candidatePreflight: defaultCandidatePreflightV1,
      exactAggregateDefinitionSidecars: harness.contract.stableDefinitionSidecars,
      exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
    });
    expect(successor.reconcilePendingInternalV1(pendingV1("choice", 2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const successorBaseline = narrativeBaselineV1(harness);
    if (successorBaseline.kind !== "accepted") {
      throw new Error("expected accepted successor baseline");
    }
    expect(successor.inspectAdmittedTargetFrameInternalV1(successorBaseline.targets[0]!))
      .toMatchObject({ semanticOccurrenceId: occurrenceV1(2) });
    expect(harness.bridge.inspectAdmittedTargetFrameInternalV1(successorBaseline.targets[0]!))
      .toBeNull();
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
  });

  it("dispatches one authenticated current choice through the exact captured semantic port", async () => {
    const semanticReceipt = Object.freeze({ kind: "semantic-accepted" as const });
    let capturedRequest: unknown = null;
    let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
    const dispatchResolution = vi.fn(function (this: unknown, request: unknown) {
      expect(this).toBe(semanticPort);
      capturedRequest = request;
      return Promise.resolve(semanticReceipt);
    });
    semanticPort = Object.freeze({
      dispatchResolutionInternalV1: dispatchResolution,
    });
    const fixture = physicalChoiceHarnessV1({ semanticDispatchPort: semanticPort });
    const admission = fixture.admission;
    type ExpectedDispatchResultV1 =
      | Readonly<{ readonly kind: "dispatched"; readonly completion: Promise<unknown> }>
      | Readonly<{ readonly kind: "revealed"; readonly completion: null }>
      | Readonly<{ readonly kind: "handled"; readonly completion: null }>
      | Readonly<{ readonly kind: "ignored"; readonly completion: null }>
      | Readonly<{
        readonly kind: "toggled";
        readonly mode: NarrativeStablePlaybackModeInternalV1;
        readonly completion: null;
      }>
      | NarrativeStableHistoryOpenDispatchResultInternalV1
      | NarrativeStableHistoryChildLifecycleResultInternalV1
      | Readonly<{ readonly kind: "unmapped"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStablePhysicalActionDispatchResultInternalV1>()
      .toEqualTypeOf<ExpectedDispatchResultV1>();
    expectTypeOf(admission).toEqualTypeOf<NarrativeStablePhysicalActionAdmissionInternalV1>();
    expect(Object.isFrozen(admission)).toBe(true);
    expect(Reflect.ownKeys(admission)).toEqual([
      "createEnvelopeInternalV1",
      "issueChoiceAttemptInternalV1",
      "issuePauseResumeAttemptInternalV1",
      "issueCustomAttemptInternalV1",
      "issueSayActivationAttemptInternalV1",
      "issueVoiceReplayAttemptInternalV1",
      "issuePlaybackModeToggleAttemptInternalV1",
      "issueHistoryOpenAttemptInternalV1",
      "routeInternalV1",
      "disposeInternalV1",
    ]);
    expect(() =>
      createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: () => false,
      })
    ).toThrowError("ui.narrative_stable_action_admission_invalid");

    const attempt = admission.issueChoiceAttemptInternalV1("choice.test.first");
    expectTypeOf(attempt).toEqualTypeOf<NarrativeStableChoiceActionAttemptInternalV1 | null>();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    const envelope = admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-current"),
    });

    const result = admission.routeInternalV1(envelope, attempt);
    expectTypeOf(result.consumerResult).toEqualTypeOf<
      NarrativeStablePhysicalActionDispatchResultInternalV1 | null
    >();
    expect(Reflect.ownKeys(result)).toEqual(["route", "consumerResult"]);
    expect(result.route).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    expect(Object.isFrozen(result.consumerResult)).toBe(true);
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected semantic dispatch completion");
    }
    expect(result.consumerResult.completion).toBeInstanceOf(Promise);
    await expect(result.consumerResult.completion).resolves.toBe(semanticReceipt);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(Reflect.ownKeys(capturedRequest as object)).toEqual([
      "expectedOccurrenceId",
      "resolution",
    ]);
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: { kind: "choose", choiceId: "choice.test.first" },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(
      Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution),
    ).toBe(true);

    admission.disposeInternalV1();
    expect(
      fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(fixture.harness);
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    expect(successorAdmission).not.toBe(admission);
    expect(
      successorAdmission.issueChoiceAttemptInternalV1("choice.test.second"),
    ).not.toBeNull();
    successorAdmission.disposeInternalV1();
  });

  it("captures the semantic callable before candidate allocation and never re-reads it", async () => {
    const originalReceipt = Object.freeze({ kind: "original-semantic-receipt" as const });
    let semanticPort!: {
      dispatchResolutionInternalV1: (request: unknown) => Promise<unknown>;
    };
    const originalDispatch = vi.fn(function (this: unknown) {
      expect(this).toBe(semanticPort);
      return Promise.resolve(originalReceipt);
    });
    const replacementDispatch = vi.fn(() => Promise.resolve("replacement-must-not-run"));
    semanticPort = { dispatchResolutionInternalV1: originalDispatch };
    const fixture = physicalChoiceHarnessV1({ semanticDispatchPort: semanticPort });
    semanticPort.dispatchResolutionInternalV1 = replacementDispatch;
    const attempt = fixture.admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(attempt).not.toBeNull();
    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeChooseActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-captured-callable"),
      }),
      attempt,
    );
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected captured semantic dispatch completion");
    }
    await expect(result.consumerResult.completion).resolves.toBe(originalReceipt);
    expect(originalDispatch).toHaveBeenCalledOnce();
    expect(replacementDispatch).not.toHaveBeenCalled();
  });

  it("admits current ready choice and Say without burning preparing failures", () => {
    const harness = harnessV1();
    const inputRouter = createInputRouterV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("choice"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(() =>
      createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: harness.bridge,
        inputRouter,
        isGestureCurrent: () => true,
      })
    ).toThrowError("ui.narrative_stable_action_admission_unavailable");

    settleCurrentNarrativeReadyV1(harness);
    const first = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter,
      isGestureCurrent: () => true,
    });
    first.disposeInternalV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const sayAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter,
      isGestureCurrent: () => true,
    });
    expect(sayAdmission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();
    sayAdmission.disposeInternalV1();

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 3))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const successor = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter,
      isGestureCurrent: () => true,
    });
    expect(successor.issueChoiceAttemptInternalV1("choice.test.first")).not.toBeNull();
    successor.disposeInternalV1();
  });

  it("rejects unknown, spoofed, cloned, wrong-action, and repeated attempts without raw ingress", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("dispatched"));
    const fixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const admission = fixture.admission;
    expect(admission.issueChoiceAttemptInternalV1("choice.test.unknown")).toBeNull();
    const wrongActionAttempt = admission.issueChoiceAttemptInternalV1("choice.test.second");
    expect(wrongActionAttempt).not.toBeNull();

    const wrongAction = admission.createEnvelopeInternalV1({
      actionId: narrativeConfirmActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-wrong-action"),
    });
    expect(admission.routeInternalV1(wrongAction, wrongActionAttempt).consumerResult).toEqual({
      kind: "unmapped",
      completion: null,
    });
    const recoveryEnvelope = admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-after-wrong-action"),
    });
    const recovered = admission.routeInternalV1(recoveryEnvelope, wrongActionAttempt);
    expect(recovered.consumerResult).toMatchObject({ kind: "dispatched" });
    if (recovered.consumerResult?.kind !== "dispatched") {
      throw new Error("wrong action must not consume an authentic choice attempt");
    }
    await expect(recovered.consumerResult.completion).resolves.toBe("dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    dispatchResolution.mockClear();

    const spoof = Object.freeze({
      actionId: narrativeChooseActionIdV1,
      choiceId: "choice.test.second",
    });
    const validEnvelope = admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-valid"),
    });
    expect(admission.routeInternalV1(validEnvelope, spoof).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    const cloneAttempt = admission.issueChoiceAttemptInternalV1("choice.test.second");
    expect(cloneAttempt).not.toBeNull();
    expect(
      admission.routeInternalV1(validEnvelope, { ...(cloneAttempt as object) }).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const foreignDispatch = vi.fn(() => Promise.resolve("foreign-dispatched"));
    const foreignFixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: foreignDispatch,
      }),
    });
    const foreignAttempt = foreignFixture.admission.issueChoiceAttemptInternalV1(
      "choice.test.second",
    );
    expect(foreignAttempt).not.toBeNull();
    expect(admission.routeInternalV1(validEnvelope, foreignAttempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    const foreignResult = foreignFixture.admission.routeInternalV1(
      foreignFixture.admission.createEnvelopeInternalV1({
        actionId: narrativeChooseActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-foreign-owner"),
      }),
      foreignAttempt,
    );
    expect(foreignResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (foreignResult.consumerResult?.kind !== "dispatched") {
      throw new Error("foreign admission must retain its own authentic attempt");
    }
    await expect(foreignResult.consumerResult.completion).resolves.toBe("foreign-dispatched");
    expect(foreignDispatch).toHaveBeenCalledOnce();
    foreignFixture.admission.disposeInternalV1();

    const attempt = admission.issueChoiceAttemptInternalV1("choice.test.second");
    expect(attempt).not.toBeNull();
    const unpublished = admission.createEnvelopeInternalV1({
      actionId: narrativeUnknownActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-unpublished"),
    });
    const unpublishedResult = admission.routeInternalV1(unpublished, attempt);
    expect(unpublishedResult.route.surface).toMatchObject({
      kind: "rejected",
      code: "surface.action_unpublished",
    });
    expect(unpublishedResult.consumerResult).toBeNull();
    expect(dispatchResolution).not.toHaveBeenCalled();

    const accepted = admission.routeInternalV1(validEnvelope, attempt);
    expect(accepted.consumerResult).toMatchObject({ kind: "dispatched" });
    if (accepted.consumerResult?.kind !== "dispatched") {
      throw new Error("expected semantic dispatch completion");
    }
    await expect(accepted.consumerResult.completion).resolves.toBe("dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(admission.routeInternalV1(validEnvelope, attempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("consumes removed binding-origin toggle-ui as unpublished without lower fallthrough", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("dispatched"));
    const fixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const lower = vi.fn(() => inputHandledV1);
    fixture.inputRouter.register({ context: "gameplay", handle: lower });
    const attempt = fixture.admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(attempt).not.toBeNull();
    const beforeState = fixture.harness.kernel.getStateInternalV1();
    const beforeNotificationCount = fixture.harness.stateNotificationCount();

    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: parseManagedSurfaceActionIdV1(playerInputActionIdsV1.toggleUi),
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.toggle-ui-unpublished"),
      }),
      attempt,
    );

    expect(result).toMatchObject({
      route: {
        input: {
          kind: "consumed",
          code: "input.managed_surface_consumed",
        },
        surface: {
          kind: "rejected",
          code: "surface.action_unpublished",
        },
      },
      consumerResult: null,
    });
    expect(lower).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(beforeState);
    expect(fixture.harness.stateNotificationCount()).toBe(beforeNotificationCount);

    const accepted = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeChooseActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.toggle-ui-attempt-preserved",
        ),
      }),
      attempt,
    );
    expect(accepted.consumerResult).toMatchObject({ kind: "dispatched" });
    if (accepted.consumerResult?.kind !== "dispatched") {
      throw new Error("removed catalog action must not spend the authentic choice attempt");
    }
    await expect(accepted.consumerResult.completion).resolves.toBe("dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(lower).not.toHaveBeenCalled();
  });

  it("keeps gesture failure, source replacement, retained runtime, phase-wrapper change, and dispose at zero dispatch", () => {
    let gestureCurrent = false;
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      isGestureCurrent: () => gestureCurrent,
    });
    const admission = fixture.admission;
    const gestureAttempt = admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(gestureAttempt).not.toBeNull();
    const gestureEnvelope = admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-stale"),
    });
    expect(admission.routeInternalV1(gestureEnvelope, gestureAttempt)).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();

    gestureCurrent = true;
    const replacementAttempt = admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(replacementAttempt).not.toBeNull();
    expect(
      fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const replacementState = fixture.harness.kernel.getStateInternalV1();
    expect(replacementState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
    });
    if (replacementState.stableRuntimeBindings[0]?.binding.kind !== "preparing") {
      throw new Error("expected retained replacement");
    }
    expect(replacementState.stableRuntimeBindings[0].binding.retainedSubtree).not.toBeNull();
    expect(admission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();
    expect(admission.routeInternalV1(gestureEnvelope, replacementAttempt).consumerResult)
      .toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).not.toHaveBeenCalled();

    const suspendedFixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const suspendedAttempt = suspendedFixture.admission.issueChoiceAttemptInternalV1(
      "choice.test.first",
    );
    expect(suspendedAttempt).not.toBeNull();
    const suspendedEnvelope = suspendedFixture.admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-suspended"),
    });
    suspendCurrentNarrativeV1(suspendedFixture.harness);
    expect(
      suspendedFixture.admission.routeInternalV1(suspendedEnvelope, suspendedAttempt)
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).not.toHaveBeenCalled();

    const disposedFixture = physicalChoiceHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const disposedAttempt = disposedFixture.admission.issueChoiceAttemptInternalV1(
      "choice.test.first",
    );
    expect(disposedAttempt).not.toBeNull();
    const disposedEnvelope = disposedFixture.admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-disposed"),
    });
    disposedFixture.admission.disposeInternalV1();
    expect(
      disposedFixture.admission.routeInternalV1(disposedEnvelope, disposedAttempt),
    ).toMatchObject({
      route: { input: { code: "input.stale_publication" }, surface: null },
      consumerResult: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();
  });

  it("dispatches one authenticated skippable pause resume through the exact captured semantic port", async () => {
    const semanticReceipt = Object.freeze({ kind: "pause-resumed" as const });
    let capturedRequest: unknown = null;
    let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
    const dispatchResolution = vi.fn(function (this: unknown, request: unknown) {
      expect(this).toBe(semanticPort);
      capturedRequest = request;
      return Promise.resolve(semanticReceipt);
    });
    semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const fixture = physicalPauseHarnessV1({ semanticDispatchPort: semanticPort });
    const state = fixture.harness.kernel.getStateInternalV1();

    const attempt = fixture.admission.issuePauseResumeAttemptInternalV1();
    expectTypeOf(attempt).toEqualTypeOf<
      NarrativeStablePauseResumeActionAttemptInternalV1 | null
    >();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    expect(fixture.admission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();

    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeResumeActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-resume-current"),
      }),
      attempt,
    );
    expect(result.route).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected pause resume completion");
    }
    await expect(result.consumerResult.completion).resolves.toBe(semanticReceipt);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: { kind: "resume" },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(
      Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution),
    ).toBe(true);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-resume-repeat"),
        }),
        attempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("constructs for a ready pause but issues manual resume only when skippable", () => {
    const preparing = harnessV1();
    expect(preparing.bridge.reconcilePendingInternalV1(pendingV1("pause"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(() =>
      createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: preparing.bridge,
        inputRouter: createInputRouterV1(),
        isGestureCurrent: () => true,
      })
    ).toThrowError("ui.narrative_stable_action_admission_unavailable");

    const nonSkippableDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const nonSkippable = physicalPauseHarnessV1({
      skippable: false,
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: nonSkippableDispatch,
      }),
    });
    expect(() =>
      createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: nonSkippable.harness.bridge,
        inputRouter: nonSkippable.inputRouter,
        isGestureCurrent: () => true,
      })
    ).toThrowError("ui.narrative_stable_action_admission_invalid");
    expect(nonSkippable.admission.issuePauseResumeAttemptInternalV1()).toBeNull();
    expect(nonSkippable.admission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();
    expect(
      nonSkippable.admission.routeInternalV1(
        nonSkippable.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.pause-non-skippable",
          ),
        }),
        null,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(nonSkippableDispatch).not.toHaveBeenCalled();
    nonSkippable.admission.disposeInternalV1();
    const freshNonSkippable = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: nonSkippable.harness.bridge,
      inputRouter: nonSkippable.inputRouter,
      isGestureCurrent: () => true,
    });
    expect(freshNonSkippable).not.toBe(nonSkippable.admission);
    expect(freshNonSkippable.issuePauseResumeAttemptInternalV1()).toBeNull();
    freshNonSkippable.disposeInternalV1();
  });

  it("keeps wrong actions and foreign attempt kinds from consuming an authentic pause resume", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("pause-dispatched"));
    const fixture = physicalPauseHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const attempt = fixture.admission.issuePauseResumeAttemptInternalV1();
    expect(attempt).not.toBeNull();

    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeChooseActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.pause-choice-mapped-mismatch",
          ),
        }),
        attempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    for (
      const [actionId, gestureId] of [
        [narrativeConfirmActionIdV1, "gesture.narrative.pause-confirm-unmapped"],
        [narrativeAdvanceActionIdV1, "gesture.narrative.pause-advance-unmapped"],
      ] as const
    ) {
      expect(
        fixture.admission.routeInternalV1(
          fixture.admission.createEnvelopeInternalV1({
            actionId,
            gestureId: parseManagedSurfaceGestureIdV1(gestureId),
          }),
          attempt,
        ).consumerResult,
      ).toEqual({ kind: "unmapped", completion: null });
    }
    expect(dispatchResolution).not.toHaveBeenCalled();

    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-clone"),
        }),
        { ...(attempt as object) },
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const choiceFixture = physicalChoiceHarnessV1();
    const choiceAttempt = choiceFixture.admission.issueChoiceAttemptInternalV1(
      "choice.test.first",
    );
    expect(choiceAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-choice-attempt"),
        }),
        choiceAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const foreignPause = physicalPauseHarnessV1();
    const foreignPauseAttempt = foreignPause.admission.issuePauseResumeAttemptInternalV1();
    expect(foreignPauseAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-foreign"),
        }),
        foreignPauseAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const dispatched = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeResumeActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-after-unmapped"),
      }),
      attempt,
    );
    expect(dispatched.consumerResult).toMatchObject({ kind: "dispatched" });
    if (dispatched.consumerResult?.kind !== "dispatched") {
      throw new Error("expected authentic pause resume after unmapped actions");
    }
    await expect(dispatched.consumerResult.completion).resolves.toBe("pause-dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    choiceFixture.admission.disposeInternalV1();
    foreignPause.admission.disposeInternalV1();
  });

  it("keeps stale gesture, source replacement, suspension, and dispose at zero pause dispatch", async () => {
    let gestureCurrent = false;
    const dispatchResolution = vi.fn(() => Promise.resolve("pause-dispatched"));
    const fixture = physicalPauseHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      isGestureCurrent: () => gestureCurrent,
    });
    const staleGestureAttempt = fixture.admission.issuePauseResumeAttemptInternalV1();
    expect(staleGestureAttempt).not.toBeNull();
    const staleGestureEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeResumeActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-stale"),
    });
    expect(fixture.admission.routeInternalV1(staleGestureEnvelope, staleGestureAttempt))
      .toMatchObject({
        route: { input: { code: "input.stale_gesture" }, surface: null },
        consumerResult: null,
      });
    gestureCurrent = true;
    const recovered = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeResumeActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-recovered"),
      }),
      staleGestureAttempt,
    );
    expect(recovered.consumerResult).toMatchObject({ kind: "dispatched" });
    if (recovered.consumerResult?.kind !== "dispatched") {
      throw new Error("expected pause resume after stale gesture");
    }
    await expect(recovered.consumerResult.completion).resolves.toBe("pause-dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    const replacementAttempt = fixture.admission.issuePauseResumeAttemptInternalV1();
    expect(replacementAttempt).not.toBeNull();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("pause", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(fixture.admission.issuePauseResumeAttemptInternalV1()).toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-replaced"),
        }),
        replacementAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).toHaveBeenCalledOnce();

    const suspended = physicalPauseHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const suspendedAttempt = suspended.admission.issuePauseResumeAttemptInternalV1();
    expect(suspendedAttempt).not.toBeNull();
    suspendCurrentNarrativeV1(suspended.harness);
    expect(
      suspended.admission.routeInternalV1(
        suspended.admission.createEnvelopeInternalV1({
          actionId: narrativeResumeActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-suspended"),
        }),
        suspendedAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const disposed = physicalPauseHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const disposedAttempt = disposed.admission.issuePauseResumeAttemptInternalV1();
    expect(disposedAttempt).not.toBeNull();
    const disposedEnvelope = disposed.admission.createEnvelopeInternalV1({
      actionId: narrativeResumeActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-disposed"),
    });
    disposed.admission.disposeInternalV1();
    expect(disposed.admission.routeInternalV1(disposedEnvelope, disposedAttempt)).toMatchObject({
      route: { input: { code: "input.stale_publication" }, surface: null },
      consumerResult: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("normalizes a synchronous pause semantic-port throw without rolling back state", async () => {
    const sentinel = new Error("pause semantic dispatch failed");
    const dispatchResolution = vi.fn(() => {
      throw sentinel;
    });
    const fixture = physicalPauseHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const attempt = fixture.admission.issuePauseResumeAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeResumeActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.pause-throw"),
      }),
      attempt,
    );
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected rejected pause semantic completion");
    }
    await expect(result.consumerResult.completion).rejects.toBe(sentinel);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
  });

  it("dispatches one authenticated custom payload from a detached frozen Base projection", async () => {
    const semanticReceipt = Object.freeze({ kind: "custom-accepted" as const });
    let capturedRequest: unknown = null;
    let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
    const dispatchResolution = vi.fn(function (this: unknown, request: unknown) {
      expect(this).toBe(semanticPort);
      capturedRequest = request;
      return Promise.resolve(semanticReceipt);
    });
    semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const fixture = physicalCustomHarnessV1({ semanticDispatchPort: semanticPort });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const rawPayload = {
      z: 2,
      a: { list: [1, { label: "original" }], enabled: true },
      nil: null,
    };

    const attempt = fixture.admission.issueCustomAttemptInternalV1(rawPayload);
    expectTypeOf(attempt).toEqualTypeOf<
      NarrativeStableCustomActionAttemptInternalV1 | null
    >();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);

    rawPayload.z = 99;
    rawPayload.a.enabled = false;
    rawPayload.a.list[1] = { label: "mutated" };
    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-current"),
      }),
      attempt,
    );
    expect(result.route).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected custom semantic dispatch completion");
    }
    await expect(result.consumerResult.completion).resolves.toBe(semanticReceipt);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: {
        kind: "custom",
        payload: {
          a: { enabled: true, list: [1, { label: "original" }] },
          nil: null,
          z: 2,
        },
      },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    const capturedResolution = (capturedRequest as {
      readonly resolution: { readonly payload: Record<string, unknown> };
    }).resolution;
    expect(Object.isFrozen(capturedResolution)).toBe(true);
    expect(Object.isFrozen(capturedResolution.payload)).toBe(true);
    expect(Reflect.ownKeys(capturedResolution.payload)).toEqual(["a", "nil", "z"]);
    expect(
      Object.isFrozen(
        (capturedResolution.payload.a as { readonly list: readonly unknown[] }).list,
      ),
    ).toBe(true);
    expect([...canonicalJsonBytes(capturedResolution.payload)]).toEqual([
      ...canonicalJsonBytes({
        a: { enabled: true, list: [1, { label: "original" }] },
        nil: null,
        z: 2,
      }),
    ]);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-repeat"),
        }),
        attempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
  });

  it("keeps the custom attempt and semantic request frozen after payload getter reentry", async () => {
    const freeze = Object.freeze;
    const semanticReceipt = freeze({ kind: "custom-intrinsic-safe" as const });
    let capturedRequest: unknown = null;
    let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
    const dispatchResolution = vi.fn(function (this: unknown, request: unknown) {
      expect(this).toBe(semanticPort);
      capturedRequest = request;
      return Promise.resolve(semanticReceipt);
    });
    semanticPort = freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const fixture = physicalCustomHarnessV1({ semanticDispatchPort: semanticPort });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const envelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeCustomActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.custom-freeze-reentry",
      ),
    });
    const payload = Object.defineProperty({ b: [2] }, "a", {
      enumerable: true,
      get() {
        Object.freeze = ((value: object) => value) as typeof Object.freeze;
        return 1;
      },
    });
    let attempt: NarrativeStableCustomActionAttemptInternalV1 | null = null;
    let result:
      | ReturnType<
        NarrativeStablePhysicalActionAdmissionInternalV1["routeInternalV1"]
      >
      | null = null;

    try {
      attempt = fixture.admission.issueCustomAttemptInternalV1(payload);
      if (attempt === null) throw new Error("expected custom attempt");
      result = fixture.admission.routeInternalV1(envelope, attempt);
    } finally {
      Object.freeze = freeze;
    }

    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    expect(result?.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result?.consumerResult?.kind !== "dispatched") {
      throw new Error("expected intrinsic-safe custom dispatch");
    }
    expect(Object.isFrozen(result.consumerResult)).toBe(true);
    await expect(result.consumerResult.completion).resolves.toBe(semanticReceipt);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: {
        kind: "custom",
        payload: { a: 1, b: [2] },
      },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    const capturedResolution = (capturedRequest as {
      readonly resolution: { readonly payload: Record<string, unknown> };
    }).resolution;
    expect(Object.isFrozen(capturedResolution)).toBe(true);
    expect(Object.isFrozen(capturedResolution.payload)).toBe(true);
    expect(Object.isFrozen(capturedResolution.payload.b)).toBe(true);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
  });

  it("rejects invalid or hostile custom payloads before minting a capability", async () => {
    const fixture = physicalCustomHarnessV1();
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    let getterCalls = 0;
    const throwingGetter = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("custom payload getter failed");
      },
    });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    for (
      const invalid of [
        null,
        undefined,
        [],
        Object.freeze({ value: 1.5 }),
        Object.freeze({ value: Number.MAX_SAFE_INTEGER + 1 }),
        Object.freeze({ value: undefined }),
        Object.freeze({ value: new Date(0) }),
        throwingGetter,
        revoked.proxy,
      ]
    ) {
      expect(fixture.admission.issueCustomAttemptInternalV1(invalid)).toBeNull();
    }
    expect(getterCalls).toBe(1);
    expect(fixture.admission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();
    expect(fixture.admission.issuePauseResumeAttemptInternalV1()).toBeNull();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);

    const reentrant = physicalCustomHarnessV1();
    let nestedResult: unknown = null;
    let reentrantGetterCalls = 0;
    const reentrantPayload = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        reentrantGetterCalls += 1;
        nestedResult = reentrant.harness.bridge.reconcilePendingInternalV1(
          pendingV1("custom", 2),
        );
        return 3;
      },
    });
    expect(reentrant.admission.issueCustomAttemptInternalV1(reentrantPayload)).toBeNull();
    expect(reentrantGetterCalls).toBe(1);
    expect(nestedResult).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });

    const disposedDuringParse = physicalCustomHarnessV1();
    let successorAdmission: NarrativeStablePhysicalActionAdmissionInternalV1 | undefined;
    const disposingPayload = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        disposedDuringParse.admission.disposeInternalV1();
        successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
          bridge: disposedDuringParse.harness.bridge,
          inputRouter: disposedDuringParse.inputRouter,
          isGestureCurrent: () => true,
        });
        return 4;
      },
    });
    expect(disposedDuringParse.admission.issueCustomAttemptInternalV1(disposingPayload))
      .toBeNull();
    if (successorAdmission === undefined) throw new Error("expected successor admission");
    const successorAttempt = successorAdmission.issueCustomAttemptInternalV1({ value: 5 });
    expect(successorAttempt).not.toBeNull();
    const successorResult = successorAdmission.routeInternalV1(
      successorAdmission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.custom-dispose-reentry-successor",
        ),
      }),
      successorAttempt,
    );
    expect(successorResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (successorResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected successor custom dispatch");
    }
    await expect(successorResult.consumerResult.completion).resolves.toBeUndefined();
    successorAdmission.disposeInternalV1();

    const recovered = fixture.admission.issueCustomAttemptInternalV1({ value: 2 });
    expect(recovered).not.toBeNull();
  });

  it("does not spend a custom attempt on unmapped, cross-kind, clone, or foreign routes", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("custom-dispatched"));
    const fixture = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const attempt = fixture.admission.issueCustomAttemptInternalV1({ value: 2 });
    expect(attempt).not.toBeNull();

    for (
      const [actionId, gestureId] of [
        [narrativeConfirmActionIdV1, "gesture.narrative.custom-confirm-unmapped"],
        [narrativeAdvanceActionIdV1, "gesture.narrative.custom-advance-unmapped"],
      ] as const
    ) {
      expect(
        fixture.admission.routeInternalV1(
          fixture.admission.createEnvelopeInternalV1({
            actionId,
            gestureId: parseManagedSurfaceGestureIdV1(gestureId),
          }),
          attempt,
        ).consumerResult,
      ).toEqual({ kind: "unmapped", completion: null });
    }
    for (
      const [actionId, gestureId] of [
        [narrativeChooseActionIdV1, "gesture.narrative.custom-choice-cross-kind"],
        [narrativeResumeActionIdV1, "gesture.narrative.custom-resume-cross-kind"],
      ] as const
    ) {
      expect(
        fixture.admission.routeInternalV1(
          fixture.admission.createEnvelopeInternalV1({
            actionId,
            gestureId: parseManagedSurfaceGestureIdV1(gestureId),
          }),
          attempt,
        ).consumerResult,
      ).toEqual({ kind: "stale", completion: null });
    }
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-clone"),
        }),
        { ...(attempt as object) },
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const foreignDispatch = vi.fn(() => Promise.resolve("foreign-custom"));
    const foreign = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: foreignDispatch,
      }),
    });
    const foreignAttempt = foreign.admission.issueCustomAttemptInternalV1({ value: 3 });
    expect(foreignAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-foreign"),
        }),
        foreignAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).not.toHaveBeenCalled();

    const accepted = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-after-mismatch"),
      }),
      attempt,
    );
    expect(accepted.consumerResult).toMatchObject({ kind: "dispatched" });
    if (accepted.consumerResult?.kind !== "dispatched") {
      throw new Error("expected custom dispatch after non-consuming mismatches");
    }
    await expect(accepted.consumerResult.completion).resolves.toBe("custom-dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    const foreignAccepted = foreign.admission.routeInternalV1(
      foreign.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.custom-foreign-current",
        ),
      }),
      foreignAttempt,
    );
    expect(foreignAccepted.consumerResult).toMatchObject({ kind: "dispatched" });
    if (foreignAccepted.consumerResult?.kind !== "dispatched") {
      throw new Error("expected foreign custom attempt on its own authority");
    }
    await expect(foreignAccepted.consumerResult.completion).resolves.toBe("foreign-custom");
    expect(foreignDispatch).toHaveBeenCalledOnce();
    foreign.admission.disposeInternalV1();
  });

  it("keeps stale gesture, retained replacement, suspension, and disposal at zero custom dispatch", async () => {
    let gestureCurrent = false;
    const dispatchResolution = vi.fn(() => Promise.resolve("custom-dispatched"));
    const fixture = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      isGestureCurrent: () => gestureCurrent,
    });
    const gestureAttempt = fixture.admission.issueCustomAttemptInternalV1({ value: 1 });
    expect(gestureAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-stale"),
        }),
        gestureAttempt,
      ),
    ).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    gestureCurrent = true;
    const recovered = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-recovered"),
      }),
      gestureAttempt,
    );
    expect(recovered.consumerResult).toMatchObject({ kind: "dispatched" });
    if (recovered.consumerResult?.kind !== "dispatched") {
      throw new Error("expected custom dispatch after stale gesture");
    }
    await expect(recovered.consumerResult.completion).resolves.toBe("custom-dispatched");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    const replacementAttempt = fixture.admission.issueCustomAttemptInternalV1({ value: 2 });
    expect(replacementAttempt).not.toBeNull();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("custom", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const replacementState = fixture.harness.kernel.getStateInternalV1();
    expect(replacementState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "preparing",
      transition: "primary_replacement",
    });
    if (replacementState.stableRuntimeBindings[0]?.binding.kind !== "preparing") {
      throw new Error("expected retained custom replacement");
    }
    expect(replacementState.stableRuntimeBindings[0].binding.retainedSubtree).not.toBeNull();
    expect(fixture.admission.issueCustomAttemptInternalV1({ value: 3 })).toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-replaced"),
        }),
        replacementAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const suspended = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const suspendedAttempt = suspended.admission.issueCustomAttemptInternalV1({ value: 4 });
    expect(suspendedAttempt).not.toBeNull();
    suspendCurrentNarrativeV1(suspended.harness);
    expect(
      suspended.admission.routeInternalV1(
        suspended.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-suspended"),
        }),
        suspendedAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const publisherDisposed = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const publisherAttempt = publisherDisposed.admission.issueCustomAttemptInternalV1({
      value: 5,
    });
    expect(publisherAttempt).not.toBeNull();
    const publisherEnvelope = publisherDisposed.admission.createEnvelopeInternalV1({
      actionId: narrativeCustomActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.custom-publisher-disposed",
      ),
    });
    expect(publisherDisposed.harness.bridge.disposeInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
    });
    expect(
      publisherDisposed.admission.routeInternalV1(
        publisherEnvelope,
        publisherAttempt,
      ),
    ).toMatchObject({
      route: {
        input: { code: "input.managed_surface_consumed" },
        surface: { kind: "stale", code: "surface.stale_instance" },
      },
      consumerResult: null,
    });

    const admissionDisposed = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const disposedAttempt = admissionDisposed.admission.issueCustomAttemptInternalV1({ value: 6 });
    expect(disposedAttempt).not.toBeNull();
    const disposedEnvelope = admissionDisposed.admission.createEnvelopeInternalV1({
      actionId: narrativeCustomActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-disposed"),
    });
    admissionDisposed.admission.disposeInternalV1();
    expect(
      admissionDisposed.admission.routeInternalV1(disposedEnvelope, disposedAttempt),
    ).toMatchObject({
      route: { input: { code: "input.stale_publication" }, surface: null },
      consumerResult: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("spends custom attempts without rolling back Story rejection or synchronous throw", async () => {
    const semanticRejected = Object.freeze({
      kind: "rejected" as const,
      code: "interaction.payload_invalid" as const,
    });
    const sentinel = new Error("custom semantic dispatch failed");
    const dispatchResolution = vi.fn()
      .mockResolvedValueOnce(semanticRejected)
      .mockImplementationOnce(() => {
        throw sentinel;
      });
    const fixture = physicalCustomHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();

    const rejectedAttempt = fixture.admission.issueCustomAttemptInternalV1({ value: 99 });
    expect(rejectedAttempt).not.toBeNull();
    const rejected = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-rejected"),
      }),
      rejectedAttempt,
    );
    expect(rejected.consumerResult).toMatchObject({ kind: "dispatched" });
    if (rejected.consumerResult?.kind !== "dispatched") {
      throw new Error("expected custom rejection completion");
    }
    await expect(rejected.consumerResult.completion).resolves.toBe(semanticRejected);
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeCustomActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.custom-rejected-repeat",
          ),
        }),
        rejectedAttempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const throwingAttempt = fixture.admission.issueCustomAttemptInternalV1({ value: 2 });
    expect(throwingAttempt).not.toBeNull();
    const throwing = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeCustomActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.custom-throw"),
      }),
      throwingAttempt,
    );
    expect(throwing.consumerResult).toMatchObject({ kind: "dispatched" });
    if (throwing.consumerResult?.kind !== "dispatched") {
      throw new Error("expected rejected custom semantic completion");
    }
    await expect(throwing.consumerResult.completion).rejects.toBe(sentinel);
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
  });

  it("dispatches one clock-free automatic pause expiry for skippable and unskippable pauses", async () => {
    type ExpectedPauseExpiryResultV1 =
      | Readonly<{ readonly kind: "dispatched"; readonly completion: Promise<unknown> }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStablePauseExpiryDispatchResultInternalV1>()
      .toEqualTypeOf<ExpectedPauseExpiryResultV1>();

    for (const skippable of [true, false] as const) {
      let clockReads = 0;
      const presentationClock = new Proxy({}, {
        get() {
          clockReads += 1;
          throw new Error("the controller-attempt floor must not read a clock");
        },
      });
      const semanticReceipt = Object.freeze({ kind: "pause-expired" as const, skippable });
      let capturedRequest: unknown = null;
      let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
      const dispatchResolution = vi.fn(function (this: unknown, request: unknown) {
        expect(this).toBe(semanticPort);
        capturedRequest = request;
        return Promise.resolve(semanticReceipt);
      });
      semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
      const fixture = automaticPauseHarnessV1({
        semanticDispatchPort: semanticPort,
        skippable,
        presentationClock,
      });
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      const controller = fixture.controller;
      expectTypeOf(controller).toEqualTypeOf<NarrativeStablePauseExpiryControllerInternalV1>();
      expect(Object.isFrozen(controller)).toBe(true);
      expect(Reflect.ownKeys(controller)).toEqual([
        "issueAttemptInternalV1",
        "dispatchInternalV1",
        "disposeInternalV1",
      ]);

      const attempt = controller.issueAttemptInternalV1();
      expectTypeOf(attempt).toEqualTypeOf<
        NarrativeStablePauseExpiryControllerAttemptInternalV1 | null
      >();
      expect(attempt).not.toBeNull();
      expect(Object.isFrozen(attempt)).toBe(true);
      expect(Reflect.ownKeys(attempt as object)).toEqual([]);
      expect(controller.issueAttemptInternalV1()).toBeNull();

      const result = controller.dispatchInternalV1(attempt);
      expectTypeOf(result).toEqualTypeOf<NarrativeStablePauseExpiryDispatchResultInternalV1>();
      expect(result).toMatchObject({ kind: "dispatched" });
      expect(Object.isFrozen(result)).toBe(true);
      if (result.kind !== "dispatched") throw new Error("expected automatic pause dispatch");
      expect(result.completion).toBeInstanceOf(Promise);
      await expect(result.completion).resolves.toBe(semanticReceipt);
      expect(dispatchResolution).toHaveBeenCalledOnce();
      expect(capturedRequest).toEqual({
        expectedOccurrenceId: occurrenceV1(1),
        resolution: { kind: "resume" },
      });
      expect(Object.isFrozen(capturedRequest)).toBe(true);
      expect(
        Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution),
      ).toBe(true);
      expect(controller.dispatchInternalV1(attempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      expect(dispatchResolution).toHaveBeenCalledOnce();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      expect(clockReads).toBe(0);
      controller.disposeInternalV1();
    }
  });

  it("keeps attempts generation-bound across clones, foreign controllers, and A-to-B replacement", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("automatic-resumed"));
    const semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const fixture = automaticPauseHarnessV1({ semanticDispatchPort: semanticPort });
    const controllerA = fixture.controller;
    const attemptA = controllerA.issueAttemptInternalV1();
    expect(attemptA).not.toBeNull();
    expect(controllerA.dispatchInternalV1({ ...(attemptA as object) })).toEqual({
      kind: "stale",
      completion: null,
    });

    const foreign = automaticPauseHarnessV1();
    const foreignAttempt = foreign.controller.issueAttemptInternalV1();
    expect(foreignAttempt).not.toBeNull();
    expect(controllerA.dispatchInternalV1(foreignAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("pause", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(controllerA.dispatchInternalV1(attemptA)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(fixture.harness.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_unavailable");
    expect(dispatchResolution).not.toHaveBeenCalled();
    controllerA.disposeInternalV1();
    settleCurrentNarrativeReadyV1(fixture.harness);

    const controllerB = createNarrativeStablePauseExpiryControllerInternalV1(
      fixture.harness.bridge,
    );
    const attemptB = controllerB.issueAttemptInternalV1();
    expect(attemptB).not.toBeNull();
    const resultB = controllerB.dispatchInternalV1(attemptB);
    expect(resultB).toMatchObject({ kind: "dispatched" });
    if (resultB.kind !== "dispatched") throw new Error("expected B generation dispatch");
    await expect(resultB.completion).resolves.toBe("automatic-resumed");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(controllerB.dispatchInternalV1(attemptB)).toEqual({
      kind: "stale",
      completion: null,
    });

    controllerB.disposeInternalV1();
    foreign.controller.disposeInternalV1();
  });

  it("stales the old topology attempt but admits a fresh controller under a higher nonblocking input owner", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("nonblocking-resumed"));
    const semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const { harness, nonBlockingDefinition } = nonBlockingNarrativeHarnessV1(semanticPort);
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("pause"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const oldController = createNarrativeStablePauseExpiryControllerInternalV1(harness.bridge);
    const oldAttempt = oldController.issueAttemptInternalV1();
    expect(oldAttempt).not.toBeNull();

    openNonBlockingSurfaceV1(
      harness,
      nonBlockingDefinition,
      "suspended",
      "candidate",
      () => {
        expect(() => createNarrativeStablePauseExpiryControllerInternalV1(harness.bridge))
          .toThrowError("ui.narrative_stable_pause_expiry_controller_unavailable");
      },
    );
    expect(oldController.dispatchInternalV1(oldAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });

    const state = harness.kernel.getStateInternalV1();
    const notifications = harness.stateNotificationCount();
    const freshController = createNarrativeStablePauseExpiryControllerInternalV1(
      harness.bridge,
    );
    oldController.disposeInternalV1();
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(harness.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_invalid");
    const freshAttempt = freshController.issueAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    const result = freshController.dispatchInternalV1(freshAttempt);
    expect(result).toMatchObject({ kind: "dispatched" });
    if (result.kind !== "dispatched") throw new Error("expected nonblocking dispatch");
    await expect(result.completion).resolves.toBe("nonblocking-resumed");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(harness.stateNotificationCount()).toBe(notifications);
    expect(state.transientState.publication.inputOwner?.surfaceInstanceId).not.toBe(
      state.stableRuntimeBindings[0]?.binding.kind === "ready_instance"
        ? state.stableRuntimeBindings[0].binding.instance.attempt.identity.surfaceInstanceId
        : null,
    );
    freshController.disposeInternalV1();
  });

  it("reissues within the same generation after lower nonblocking topology changes without suspending Narrative", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("lower-nonblocking-resumed"));
    const semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const { harness, nonBlockingDefinition } = nonBlockingNarrativeHarnessV1(
      semanticPort,
      10,
    );
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("pause"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const controller = createNarrativeStablePauseExpiryControllerInternalV1(harness.bridge);
    const oldAttempt = controller.issueAttemptInternalV1();
    expect(oldAttempt).not.toBeNull();

    openNonBlockingSurfaceV1(harness, nonBlockingDefinition, "active", "narrative");
    expect(controller.dispatchInternalV1(oldAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();

    const state = harness.kernel.getStateInternalV1();
    const notifications = harness.stateNotificationCount();
    const freshAttempt = controller.issueAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    expect(freshAttempt).not.toBe(oldAttempt);
    const result = controller.dispatchInternalV1(freshAttempt);
    expect(result).toMatchObject({ kind: "dispatched" });
    if (result.kind !== "dispatched") {
      throw new Error("expected same-generation lower-topology dispatch");
    }
    await expect(result.completion).resolves.toBe("lower-nonblocking-resumed");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(harness.stateNotificationCount()).toBe(notifications);
    controller.disposeInternalV1();
  });

  it("fences suspension, empty, publisher disposal, controller disposal, and terminal disposal", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });

    const nonPause = physicalChoiceHarnessV1({ semanticDispatchPort: semanticPort });
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(nonPause.harness.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_unavailable");
    nonPause.admission.disposeInternalV1();

    const preparing = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            semanticDispatchPort: semanticPort,
          })),
      }),
    });
    expect(preparing.bridge.reconcilePendingInternalV1(pendingV1("pause"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(preparing.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_unavailable");

    const suspended = automaticPauseHarnessV1({ semanticDispatchPort: semanticPort });
    const suspendedAttempt = suspended.controller.issueAttemptInternalV1();
    expect(suspendedAttempt).not.toBeNull();
    suspendCurrentNarrativeV1(suspended.harness);
    expect(suspended.controller.dispatchInternalV1(suspendedAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });

    const emptied = automaticPauseHarnessV1({ semanticDispatchPort: semanticPort });
    const emptiedAttempt = emptied.controller.issueAttemptInternalV1();
    expect(emptiedAttempt).not.toBeNull();
    expect(emptied.harness.bridge.reconcilePendingInternalV1(null)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(emptied.controller.dispatchInternalV1(emptiedAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });

    const publisherDisposed = automaticPauseHarnessV1({
      semanticDispatchPort: semanticPort,
    });
    const publisherDisposedAttempt = publisherDisposed.controller.issueAttemptInternalV1();
    expect(publisherDisposedAttempt).not.toBeNull();
    expect(publisherDisposed.harness.bridge.disposeInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
    });
    expect(
      publisherDisposed.controller.dispatchInternalV1(publisherDisposedAttempt),
    ).toEqual({ kind: "stale", completion: null });

    const controllerDisposed = automaticPauseHarnessV1({
      semanticDispatchPort: semanticPort,
    });
    const controllerDisposedAttempt = controllerDisposed.controller.issueAttemptInternalV1();
    expect(controllerDisposedAttempt).not.toBeNull();
    controllerDisposed.controller.disposeInternalV1();
    expect(controllerDisposed.controller.dispatchInternalV1(controllerDisposedAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    const fresh = createNarrativeStablePauseExpiryControllerInternalV1(
      controllerDisposed.harness.bridge,
    );
    expect(fresh.issueAttemptInternalV1()).not.toBeNull();
    fresh.disposeInternalV1();

    const terminal = automaticPauseHarnessV1({ semanticDispatchPort: semanticPort });
    const terminalAttempt = terminal.controller.issueAttemptInternalV1();
    expect(terminalAttempt).not.toBeNull();
    expect(terminal.harness.kernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
    expect(terminal.controller.dispatchInternalV1(terminalAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();

    suspended.controller.disposeInternalV1();
    emptied.controller.disposeInternalV1();
    publisherDisposed.controller.disposeInternalV1();
    terminal.controller.disposeInternalV1();
  });

  it("normalizes semantic throw, spends before reentry, and preserves exact successor claims", async () => {
    const sentinel = new Error("automatic pause semantic dispatch failed");
    let controller!: NarrativeStablePauseExpiryControllerInternalV1;
    let attempt!: NarrativeStablePauseExpiryControllerAttemptInternalV1;
    let reentrantResult: NarrativeStablePauseExpiryDispatchResultInternalV1 | null = null;
    const dispatchResolution = vi.fn(() => {
      reentrantResult = controller.dispatchInternalV1(attempt);
      throw sentinel;
    });
    const fixture = automaticPauseHarnessV1({
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
    });
    controller = fixture.controller;
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(fixture.harness.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_invalid");
    const issued = controller.issueAttemptInternalV1();
    if (issued === null) throw new Error("expected automatic pause attempt");
    attempt = issued;
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const result = controller.dispatchInternalV1(attempt);
    expect(result).toMatchObject({ kind: "dispatched" });
    if (result.kind !== "dispatched") throw new Error("expected rejected completion");
    await expect(result.completion).rejects.toBe(sentinel);
    expect(reentrantResult).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);

    controller.disposeInternalV1();
    const successor = createNarrativeStablePauseExpiryControllerInternalV1(
      fixture.harness.bridge,
    );
    controller.disposeInternalV1();
    expect(() => createNarrativeStablePauseExpiryControllerInternalV1(fixture.harness.bridge))
      .toThrowError("ui.narrative_stable_pause_expiry_controller_invalid");
    expect(successor.issueAttemptInternalV1()).not.toBeNull();
    successor.disposeInternalV1();
  });

  it(
    "bounds ten-thousand controller rotations without timer, source, or runtime churn",
    () => {
      let activeController: NarrativeStablePauseExpiryControllerInternalV1 | null = null;
      let activeAttempt: NarrativeStablePauseExpiryControllerAttemptInternalV1 | null = null;
      let reentrantResult: NarrativeStablePauseExpiryDispatchResultInternalV1 | null = null;
      const dispatchResolution = vi.fn(() => {
        if (activeController === null || activeAttempt === null) {
          throw new Error("missing active automatic controller");
        }
        reentrantResult = activeController.dispatchInternalV1(activeAttempt);
        return Promise.resolve("bounded-resume");
      });
      const fixture = automaticPauseHarnessV1({
        semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
      });
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      const publisherBefore = publisherSnapshotV1(fixture.harness);
      let controller = fixture.controller;
      for (let index = 0; index < 10_000; index += 1) {
        const attempt = controller.issueAttemptInternalV1();
        if (attempt === null) throw new Error(`missing automatic attempt at rotation ${index}`);
        if (index === 0 || index === 9_999) {
          expect(Object.isFrozen(attempt)).toBe(true);
          expect(Reflect.ownKeys(attempt)).toEqual([]);
        }
        controller.disposeInternalV1();
        if (index < 9_999) {
          controller = createNarrativeStablePauseExpiryControllerInternalV1(
            fixture.harness.bridge,
          );
        }
      }

      activeController = createNarrativeStablePauseExpiryControllerInternalV1(
        fixture.harness.bridge,
      );
      activeAttempt = activeController.issueAttemptInternalV1();
      expect(activeAttempt).not.toBeNull();
      const result = activeController.dispatchInternalV1(activeAttempt);
      expect(result).toMatchObject({ kind: "dispatched" });
      expect(reentrantResult).toEqual({ kind: "stale", completion: null });
      expect(dispatchResolution).toHaveBeenCalledOnce();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      expect(publisherSnapshotV1(fixture.harness)).toMatchObject({
        sourceRevisionIssuanceHighWater: publisherBefore.sourceRevisionIssuanceHighWater,
        occurrenceIssuanceHighWater: publisherBefore.occurrenceIssuanceHighWater,
      });
      expect(fixture.harness.registry.getSnapshot()).toMatchObject({
        leaseSequenceHighWater: 1,
        currentPublisherCount: 1,
      });
      activeController.disposeInternalV1();
    },
    30_000,
  );

  it("normalizes a synchronous semantic-port throw to a rejected completion without rollback", async () => {
    const sentinel = new Error("semantic dispatch failed");
    let semanticPort!: NarrativeStableSemanticResolutionPortInternalV1;
    const dispatchResolution = vi.fn(function (this: unknown) {
      expect(this).toBe(semanticPort);
      throw sentinel;
    });
    semanticPort = Object.freeze({
      dispatchResolutionInternalV1: dispatchResolution,
    });
    const fixture = physicalChoiceHarnessV1({ semanticDispatchPort: semanticPort });
    const state = fixture.harness.kernel.getStateInternalV1();
    const attempt = fixture.admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(attempt).not.toBeNull();
    const envelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeChooseActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.choice-throw"),
    });

    const result = fixture.admission.routeInternalV1(envelope, attempt);
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected rejected semantic completion");
    }
    expect(result.consumerResult.completion).toBeInstanceOf(Promise);
    await expect(result.consumerResult.completion).rejects.toBe(sentinel);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(
      fixture.admission.routeInternalV1(envelope, attempt).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("captures one Say reveal generation and keeps attempt issuance phase-free", () => {
    let phaseReads = 0;
    let revealPort!: NarrativeStableSayRevealGenerationPortInternalV1;
    const capturePhase = vi.fn(function (this: unknown) {
      expect(this).toBe(revealPort);
      phaseReads += 1;
      return "incomplete" as const;
    });
    const revealAll = vi.fn(function (this: unknown) {
      expect(this).toBe(revealPort);
    });
    revealPort = Object.freeze({
      capturePhaseInternalV1: capturePhase,
      revealAllInternalV1: revealAll,
    });
    const fixture = physicalSayHarnessV1({ revealGenerationPort: revealPort });
    expectTypeOf(fixture.controller).toEqualTypeOf<
      NarrativeStableSayRevealControllerInternalV1
    >();
    expect(Object.isFrozen(fixture.controller)).toBe(true);
    expect(Reflect.ownKeys(fixture.controller)).toEqual([
      "issueContentAutoAttemptInternalV1",
      "dispatchContentAutoInternalV1",
      "disposeInternalV1",
    ]);
    expect(phaseReads).toBe(0);

    const attempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expectTypeOf(attempt).toEqualTypeOf<NarrativeStableSayActivationAttemptInternalV1 | null>();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    expect(phaseReads).toBe(0);
    expect(revealAll).not.toHaveBeenCalled();

    expect(() =>
      createNarrativeStableSayRevealControllerInternalV1({
        bridge: fixture.harness.bridge,
        revealGenerationPort: revealPort,
      })
    ).toThrowError("ui.narrative_stable_say_reveal_controller_invalid");
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("issues one phase-free content-auto attempt only for an auto Say", () => {
    type ExpectedContentAutoResultV1 =
      | Readonly<{ readonly kind: "dispatched"; readonly completion: Promise<unknown> }>
      | Readonly<{ readonly kind: "not_ready"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStableSayContentAutoDispatchResultInternalV1>()
      .toEqualTypeOf<ExpectedContentAutoResultV1>();

    const confirmPhase = vi.fn(() => "complete" as const);
    const confirm = physicalSayHarnessV1({
      advancePolicy: "confirm",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: confirmPhase,
        revealAllInternalV1: vi.fn(),
      }),
    });
    expect(confirm.controller.issueContentAutoAttemptInternalV1()).toBeNull();
    expect(confirmPhase).not.toHaveBeenCalled();
    confirm.controller.disposeInternalV1();
    confirm.admission.disposeInternalV1();

    const autoPhase = vi.fn(() => "complete" as const);
    const auto = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: autoPhase,
        revealAllInternalV1: vi.fn(),
      }),
    });
    const state = auto.harness.kernel.getStateInternalV1();
    const notifications = auto.harness.stateNotificationCount();
    const attempt = auto.controller.issueContentAutoAttemptInternalV1();
    expectTypeOf(attempt).toEqualTypeOf<NarrativeStableSayContentAutoAttemptInternalV1 | null>();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    expect(auto.controller.issueContentAutoAttemptInternalV1()).toBeNull();
    expect(autoPhase).not.toHaveBeenCalled();
    expect(auto.harness.kernel.getStateInternalV1()).toBe(state);
    expect(auto.harness.stateNotificationCount()).toBe(notifications);
    auto.controller.disposeInternalV1();
    auto.admission.disposeInternalV1();
  });

  it("classifies content-auto reveal phase after spend without revealing or dispatching", () => {
    let phase: unknown = "incomplete";
    let throwPhase = false;
    const capturePhase = vi.fn(() => {
      if (throwPhase) throw null;
      return phase as "incomplete" | "complete";
    });
    const revealAll = vi.fn();
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();

    const incompleteManual = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    const incomplete = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(incompleteManual).not.toBeNull();
    expect(incomplete).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(incomplete)).toEqual({
      kind: "not_ready",
      completion: null,
    });
    expect(
      fixture.controller.dispatchContentAutoInternalV1(incomplete),
    ).toEqual({ kind: "stale", completion: null });
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.say-auto-not-ready-retired-manual",
          ),
        }),
        incompleteManual,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    phase = "invalid";
    const invalidManual = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    const invalid = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(invalidManual).not.toBeNull();
    expect(invalid).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(invalid)).toEqual({
      kind: "faulted",
      completion: null,
    });
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.say-auto-fault-retired-manual",
          ),
        }),
        invalidManual,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    throwPhase = true;
    const throwing = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(throwing).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(throwing)).toEqual({
      kind: "faulted",
      completion: null,
    });
    expect(capturePhase).toHaveBeenCalledTimes(3);
    expect(revealAll).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("lets content-auto first-win the shared Say boundary and releases after drain", async () => {
    let settle!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settle = resolve;
    });
    let capturedRequest: unknown = null;
    const dispatchResolution = vi.fn((request: unknown) => {
      capturedRequest = request;
      return semanticCompletion;
    });
    let playerProfileReads = 0;
    let presentationClockReads = 0;
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      playerProfile: new Proxy(Object.freeze({ locale: "en" }), {
        get: (target, key, receiver) => {
          playerProfileReads += 1;
          return Reflect.get(target, key, receiver);
        },
      }),
      presentationClock: new Proxy({ kind: "manual-clock" }, {
        get: (target, key, receiver) => {
          presentationClockReads += 1;
          return Reflect.get(target, key, receiver);
        },
      }),
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const playerProfileReadsAfterPreflight = playerProfileReads;
    const presentationClockReadsAfterPreflight = presentationClockReads;
    const manual = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    const automatic = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(manual).not.toBeNull();
    expect(automatic).not.toBeNull();

    const automaticResult = fixture.controller.dispatchContentAutoInternalV1(automatic);
    expect(automaticResult).toMatchObject({ kind: "dispatched" });
    if (automaticResult.kind !== "dispatched") throw new Error("expected content-auto dispatch");
    expect(Object.isFrozen(automaticResult)).toBe(true);
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: { kind: "advance" },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-auto-won"),
        }),
        manual,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(fixture.controller.issueContentAutoAttemptInternalV1()).toBeNull();
    expect(
      fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
    ).toBeNull();

    settle("auto-drained");
    await expect(automaticResult.completion).resolves.toBe("auto-drained");
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.say-auto-old-manual-after-drain",
          ),
        }),
        manual,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(fixture.controller.issueContentAutoAttemptInternalV1()).not.toBeNull();
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(playerProfileReads).toBe(playerProfileReadsAfterPreflight);
    expect(presentationClockReads).toBe(presentationClockReadsAfterPreflight);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("lets physical Say first-win a presigned content-auto competitor", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("manual-drained"));
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const automatic = fixture.controller.issueContentAutoAttemptInternalV1();
    const manual = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(automatic).not.toBeNull();
    expect(manual).not.toBeNull();
    const manualResult = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-manual-won"),
      }),
      manual,
    );
    expect(manualResult.consumerResult).toMatchObject({ kind: "dispatched" });
    expect(fixture.controller.dispatchContentAutoInternalV1(automatic)).toEqual({
      kind: "stale",
      completion: null,
    });
    if (manualResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected manual Say dispatch");
    }
    await expect(manualResult.consumerResult.completion).resolves.toBe("manual-drained");
    expect(fixture.controller.dispatchContentAutoInternalV1(automatic)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("rejects cloned, foreign, and wrong-receiver content-auto attempts without phase reads", async () => {
    const capturePhase = vi.fn(() => "complete" as const);
    const dispatchResolution = vi.fn(() => Promise.resolve("content-auto-dispatched"));
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const attempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(attempt).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1({ ...(attempt as object) })).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(
      Reflect.apply(fixture.controller.dispatchContentAutoInternalV1, Object.freeze({}), [
        attempt,
      ]),
    ).toEqual({ kind: "stale", completion: null });

    const foreign = physicalSayHarnessV1({ advancePolicy: "auto" });
    const foreignAttempt = foreign.controller.issueContentAutoAttemptInternalV1();
    expect(foreignAttempt).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(foreignAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(capturePhase).not.toHaveBeenCalled();
    const result = fixture.controller.dispatchContentAutoInternalV1(attempt);
    expect(result).toMatchObject({ kind: "dispatched" });
    if (result.kind !== "dispatched") throw new Error("expected authentic content-auto dispatch");
    await expect(result.completion).resolves.toBe("content-auto-dispatched");
    expect(capturePhase).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledOnce();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
    foreign.controller.disposeInternalV1();
    foreign.admission.disposeInternalV1();
  });

  it("refreshes topology-bound auto proof without depending on the physical input owner", async () => {
    const revealGenerationPort = Object.freeze({
      capturePhaseInternalV1: () => "complete" as const,
      revealAllInternalV1: vi.fn(),
    });

    const lowerDispatch = vi.fn(() => Promise.resolve("lower-auto"));
    const lower = nonBlockingNarrativeHarnessV1(
      Object.freeze({ dispatchResolutionInternalV1: lowerDispatch }),
      10,
    );
    expect(
      lower.harness.bridge.reconcilePendingInternalV1({
        ...(pendingV1("say") as Record<string, unknown>),
        advancePolicy: "auto",
      }),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(lower.harness);
    const lowerController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: lower.harness.bridge,
      revealGenerationPort,
    });
    const lowerOld = lowerController.issueContentAutoAttemptInternalV1();
    expect(lowerOld).not.toBeNull();
    openNonBlockingSurfaceV1(
      lower.harness,
      lower.nonBlockingDefinition,
      "active",
      "narrative",
    );
    expect(lowerController.dispatchContentAutoInternalV1(lowerOld)).toEqual({
      kind: "stale",
      completion: null,
    });
    const lowerFresh = lowerController.issueContentAutoAttemptInternalV1();
    expect(lowerFresh).not.toBeNull();
    const lowerResult = lowerController.dispatchContentAutoInternalV1(lowerFresh);
    expect(lowerResult).toMatchObject({ kind: "dispatched" });
    if (lowerResult.kind !== "dispatched") throw new Error("expected lower auto dispatch");
    await expect(lowerResult.completion).resolves.toBe("lower-auto");
    expect(lowerDispatch).toHaveBeenCalledOnce();
    lowerController.disposeInternalV1();

    const higherDispatch = vi.fn(() => Promise.resolve("higher-auto"));
    const higher = nonBlockingNarrativeHarnessV1(
      Object.freeze({ dispatchResolutionInternalV1: higherDispatch }),
    );
    expect(
      higher.harness.bridge.reconcilePendingInternalV1({
        ...(pendingV1("say") as Record<string, unknown>),
        advancePolicy: "auto",
      }),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(higher.harness);
    const higherOld = createNarrativeStableSayRevealControllerInternalV1({
      bridge: higher.harness.bridge,
      revealGenerationPort,
    });
    const higherOldAttempt = higherOld.issueContentAutoAttemptInternalV1();
    expect(higherOldAttempt).not.toBeNull();
    openNonBlockingSurfaceV1(
      higher.harness,
      higher.nonBlockingDefinition,
      "suspended",
      "candidate",
    );
    expect(higherOld.dispatchContentAutoInternalV1(higherOldAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    const higherFresh = createNarrativeStableSayRevealControllerInternalV1({
      bridge: higher.harness.bridge,
      revealGenerationPort,
    });
    const higherFreshAttempt = higherFresh.issueContentAutoAttemptInternalV1();
    expect(higherFreshAttempt).not.toBeNull();
    const higherResult = higherFresh.dispatchContentAutoInternalV1(higherFreshAttempt);
    expect(higherResult).toMatchObject({ kind: "dispatched" });
    if (higherResult.kind !== "dispatched") throw new Error("expected higher auto dispatch");
    await expect(higherResult.completion).resolves.toBe("higher-auto");
    expect(higherDispatch).toHaveBeenCalledOnce();
    higherOld.disposeInternalV1();
    higherFresh.disposeInternalV1();
  });

  it("revokes a content-auto generation across a real blocking suspension", async () => {
    const capturePhase = vi.fn(() => "complete" as const);
    const dispatchResolution = vi.fn(() => Promise.resolve("resumed-auto"));
    const { harness, nonBlockingDefinition: blockingDefinition } = nonBlockingNarrativeHarnessV1(
      Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
      90,
      "blocking",
    );
    expect(
      harness.bridge.reconcilePendingInternalV1({
        ...(pendingV1("say") as Record<string, unknown>),
        advancePolicy: "auto",
      }),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(harness);
    const revealGenerationPort = Object.freeze({
      capturePhaseInternalV1: capturePhase,
      revealAllInternalV1: vi.fn(),
    });
    const oldController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: harness.bridge,
      revealGenerationPort,
    });
    const oldAttempt = oldController.issueContentAutoAttemptInternalV1();
    expect(oldAttempt).not.toBeNull();
    const blocker = openNonBlockingSurfaceV1(
      harness,
      blockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    expect(oldController.dispatchContentAutoInternalV1(oldAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(capturePhase).not.toHaveBeenCalled();

    const suspendedPublication = harness.kernel.getStateInternalV1().transientState.publication;
    expect(harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: suspendedPublication.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied" });
    const freshController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: harness.bridge,
      revealGenerationPort,
    });
    const freshAttempt = freshController.issueContentAutoAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    const result = freshController.dispatchContentAutoInternalV1(freshAttempt);
    expect(result).toMatchObject({ kind: "dispatched" });
    if (result.kind !== "dispatched") throw new Error("expected resumed auto dispatch");
    await expect(result.completion).resolves.toBe("resumed-auto");
    expect(capturePhase).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledOnce();
    oldController.disposeInternalV1();
    freshController.disposeInternalV1();
  });

  it("does not let an old content-auto completion clear a successor source claim", async () => {
    let settleOld!: (value: unknown) => void;
    let settleSuccessor!: (value: unknown) => void;
    const oldCompletion = new Promise<unknown>((resolve) => {
      settleOld = resolve;
    });
    const successorCompletion = new Promise<unknown>((resolve) => {
      settleSuccessor = resolve;
    });
    const dispatchResolution = vi.fn()
      .mockImplementationOnce(() => oldCompletion)
      .mockImplementationOnce(() => successorCompletion);
    const revealGenerationPort = Object.freeze({
      capturePhaseInternalV1: () => "complete" as const,
      revealAllInternalV1: vi.fn(),
    });
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort,
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const oldAttempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(oldAttempt).not.toBeNull();
    const oldResult = fixture.controller.dispatchContentAutoInternalV1(oldAttempt);
    expect(oldResult).toMatchObject({ kind: "dispatched" });
    if (oldResult.kind !== "dispatched") throw new Error("expected old auto dispatch");

    expect(
      fixture.harness.bridge.reconcilePendingInternalV1({
        ...(pendingV1("say", 2) as Record<string, unknown>),
        advancePolicy: "auto",
      }),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(fixture.harness);
    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort,
    });
    const successorAttempt = successorController.issueContentAutoAttemptInternalV1();
    expect(successorAttempt).not.toBeNull();
    const successorResult = successorController.dispatchContentAutoInternalV1(successorAttempt);
    expect(successorResult).toMatchObject({ kind: "dispatched" });
    if (successorResult.kind !== "dispatched") {
      throw new Error("expected successor auto dispatch");
    }

    settleOld("old-auto-drained");
    await expect(oldResult.completion).resolves.toBe("old-auto-drained");
    expect(successorController.issueContentAutoAttemptInternalV1()).toBeNull();
    settleSuccessor("successor-auto-drained");
    await expect(successorResult.completion).resolves.toBe("successor-auto-drained");
    expect(successorController.issueContentAutoAttemptInternalV1()).not.toBeNull();
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
    successorController.disposeInternalV1();
  });

  it("gives content-auto callback drift stale precedence over a phase fault", () => {
    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => {
          expect(
            fixture.harness.bridge.reconcilePendingInternalV1({
              ...(pendingV1("say", 2) as Record<string, unknown>),
              advancePolicy: "auto",
            }),
          ).toMatchObject({ kind: "applied" });
          throw null;
        },
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const attempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(attempt).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(attempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  for (
    const [actionId, label] of [
      [narrativeConfirmActionIdV1, "confirm"],
      [narrativeAdvanceActionIdV1, "advance"],
    ] as const
  ) {
    it(`routes ${label} through reveal-only without semantic fallthrough`, () => {
      let phase: "incomplete" | "complete" = "incomplete";
      let reentrantAttempt: NarrativeStableSayActivationAttemptInternalV1 | null | undefined;
      let attempt: NarrativeStableSayActivationAttemptInternalV1 | null = null;
      let envelope:
        | ReturnType<
          NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
        >
        | null = null;
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const revealPort = Object.freeze({
        capturePhaseInternalV1: vi.fn(() => phase),
        revealAllInternalV1: vi.fn(() => {
          phase = "complete";
          reentrantAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
            fixture.controller,
          );
        }),
      }) satisfies NarrativeStableSayRevealGenerationPortInternalV1;
      const fixture = physicalSayHarnessV1({
        revealGenerationPort: revealPort,
        semanticDispatchPort: Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }),
      });
      attempt = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
      expect(attempt).not.toBeNull();
      envelope = fixture.admission.createEnvelopeInternalV1({
        actionId,
        gestureId: parseManagedSurfaceGestureIdV1(`gesture.narrative.say-${label}`),
      });
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      const result = fixture.admission.routeInternalV1(envelope, attempt);
      expect(result.consumerResult).toEqual({ kind: "revealed", completion: null });
      expect(Object.isFrozen(result.consumerResult)).toBe(true);
      expect(revealPort.capturePhaseInternalV1).toHaveBeenCalledOnce();
      expect(revealPort.revealAllInternalV1).toHaveBeenCalledOnce();
      expect(reentrantAttempt).toBeNull();
      expect(dispatchResolution).not.toHaveBeenCalled();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      expect(
        fixture.admission.routeInternalV1(envelope, attempt).consumerResult,
      ).toEqual({ kind: "stale", completion: null });
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    });
  }

  it("seals complete Say advance until the drain-complete Promise releases the frame", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    let capturedRequest: unknown = null;
    const dispatchResolution = vi.fn((request: unknown) => {
      capturedRequest = request;
      return semanticCompletion;
    });
    const fixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const first = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(first).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeChooseActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.say-choice-unmapped",
          ),
        }),
        first,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    const firstResult = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-complete"),
      }),
      first,
    );
    expect(firstResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (firstResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected Say semantic dispatch");
    }
    expect(Object.isFrozen(firstResult.consumerResult)).toBe(true);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: { kind: "advance" },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution))
      .toBe(true);
    expect(
      fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
    ).toBeNull();

    settleSemantic("advanced");
    await expect(firstResult.consumerResult.completion).resolves.toBe("advanced");
    const fresh = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(fresh).not.toBeNull();
    const second = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-fresh"),
      }),
      fresh,
    );
    expect(second.consumerResult).toMatchObject({ kind: "dispatched" });
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("runs the physical fence before phase and closes invalid or throwing reveal callbacks", () => {
    let gestureCurrent = false;
    let phase: unknown = "invalid";
    const capturePhase = vi.fn(() => phase as "incomplete");
    const revealAll = vi.fn(() => {
      throw new Error("reveal failed");
    });
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalSayHarnessV1({
      isGestureCurrent: () => gestureCurrent,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const staleGestureAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(staleGestureAttempt).not.toBeNull();
    const staleEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeConfirmActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-stale"),
    });
    expect(fixture.admission.routeInternalV1(staleEnvelope, staleGestureAttempt)).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    expect(capturePhase).not.toHaveBeenCalled();

    gestureCurrent = true;
    expect(
      fixture.admission.routeInternalV1(staleEnvelope, staleGestureAttempt).consumerResult,
    ).toEqual({ kind: "faulted", completion: null });
    expect(capturePhase).toHaveBeenCalledOnce();
    expect(revealAll).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();

    phase = "incomplete";
    const throwingAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(throwingAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-reveal-throw"),
        }),
        throwingAttempt,
      ).consumerResult,
    ).toEqual({ kind: "faulted", completion: null });
    expect(revealAll).toHaveBeenCalledOnce();
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(
      fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
    ).not.toBeNull();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("captures exact reveal callables without burning the bridge claim on malformed ports", () => {
    const semanticDispatchPort = Object.freeze({
      dispatchResolutionInternalV1: vi.fn(() => Promise.resolve("must-not-dispatch")),
    });
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            semanticDispatchPort,
          })),
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);

    let accessorReads = 0;
    const malformed = Object.create(Object.prototype);
    Object.defineProperties(malformed, {
      capturePhaseInternalV1: {
        enumerable: true,
        get: () => {
          accessorReads += 1;
          return () => "incomplete";
        },
      },
      revealAllInternalV1: {
        enumerable: true,
        value: () => {},
      },
    });
    expect(() =>
      createNarrativeStableSayRevealControllerInternalV1({
        bridge: harness.bridge,
        revealGenerationPort: malformed,
      })
    ).toThrowError("ui.narrative_stable_say_reveal_controller_invalid");
    expect(accessorReads).toBe(0);

    const exactPortShape = {
      capturePhaseInternalV1: () => "incomplete" as const,
      revealAllInternalV1: () => {},
    };
    const malformedPorts = [
      { ...exactPortShape, extra: true },
      Object.assign({ ...exactPortShape }, { [Symbol("extra")]: true }),
      Object.assign(Object.create(null), exactPortShape),
      { ...exactPortShape, capturePhaseInternalV1: "not-callable" },
      { ...exactPortShape, revealAllInternalV1: 1 },
    ];
    for (const malformedPort of malformedPorts) {
      expect(() =>
        createNarrativeStableSayRevealControllerInternalV1({
          bridge: harness.bridge,
          revealGenerationPort:
            malformedPort as unknown as NarrativeStableSayRevealGenerationPortInternalV1,
        })
      ).toThrowError("ui.narrative_stable_say_reveal_controller_invalid");
    }

    const originalPhase = vi.fn(function (this: unknown) {
      expect(this).toBe(mutablePort);
      return "incomplete" as const;
    });
    const originalReveal = vi.fn(function (this: unknown) {
      expect(this).toBe(mutablePort);
    });
    const replacementPhase = vi.fn(() => "complete" as const);
    const replacementReveal = vi.fn();
    const mutablePort: {
      capturePhaseInternalV1: NarrativeStableSayRevealGenerationPortInternalV1[
        "capturePhaseInternalV1"
      ];
      revealAllInternalV1: NarrativeStableSayRevealGenerationPortInternalV1[
        "revealAllInternalV1"
      ];
    } = {
      capturePhaseInternalV1: originalPhase,
      revealAllInternalV1: originalReveal,
    };
    const controller = createNarrativeStableSayRevealControllerInternalV1({
      bridge: harness.bridge,
      revealGenerationPort: mutablePort,
    });
    mutablePort.capturePhaseInternalV1 = replacementPhase;
    mutablePort.revealAllInternalV1 = replacementReveal;
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const attempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(attempt).not.toBeNull();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-captured-port"),
        }),
        attempt,
      ).consumerResult,
    ).toEqual({ kind: "revealed", completion: null });
    expect(originalPhase).toHaveBeenCalledOnce();
    expect(originalReveal).toHaveBeenCalledOnce();
    expect(replacementPhase).not.toHaveBeenCalled();
    expect(replacementReveal).not.toHaveBeenCalled();
    controller.disposeInternalV1();
    admission.disposeInternalV1();
  });

  it("preserves the Say controller across physical binding churn and invalidates the old token", () => {
    const semanticDispatchPort = Object.freeze({
      dispatchResolutionInternalV1: vi.fn(() => Promise.resolve("must-not-dispatch")),
    });
    const { harness, nonBlockingDefinition } = nonBlockingNarrativeHarnessV1(
      semanticDispatchPort,
      10,
    );
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const capturePhase = vi.fn(() => "incomplete" as const);
    const revealAll = vi.fn();
    const controller = createNarrativeStableSayRevealControllerInternalV1({
      bridge: harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
    });
    const inputRouter = createInputRouterV1();
    const firstAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter,
      isGestureCurrent: () => true,
    });
    const oldAttempt = firstAdmission.issueSayActivationAttemptInternalV1(controller);
    expect(oldAttempt).not.toBeNull();
    const oldEnvelope = firstAdmission.createEnvelopeInternalV1({
      actionId: narrativeConfirmActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-old-topology"),
    });

    openNonBlockingSurfaceV1(harness, nonBlockingDefinition, "active", "narrative");
    expect(firstAdmission.routeInternalV1(oldEnvelope, oldAttempt).consumerResult).toBeNull();
    expect(capturePhase).not.toHaveBeenCalled();
    expect(() =>
      createNarrativeStableSayRevealControllerInternalV1({
        bridge: harness.bridge,
        revealGenerationPort: Object.freeze({
          capturePhaseInternalV1: () => "incomplete" as const,
          revealAllInternalV1: () => {},
        }),
      })
    ).toThrowError("ui.narrative_stable_say_reveal_controller_invalid");

    firstAdmission.disposeInternalV1();
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter,
      isGestureCurrent: () => true,
    });
    const freshAttempt = successorAdmission.issueSayActivationAttemptInternalV1(controller);
    expect(freshAttempt).not.toBeNull();
    expect(freshAttempt).not.toBe(oldAttempt);
    const freshResult = successorAdmission.routeInternalV1(
      successorAdmission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-fresh-topology"),
      }),
      freshAttempt,
    );
    expect(freshResult.consumerResult).toEqual({ kind: "revealed", completion: null });
    expect(capturePhase).toHaveBeenCalledOnce();
    expect(revealAll).toHaveBeenCalledOnce();
    controller.disposeInternalV1();
    successorAdmission.disposeInternalV1();
  });

  it("gives callback reentry stale precedence over phase and reveal faults", () => {
    for (const callback of ["phase", "reveal"] as const) {
      let fixture!: ReturnType<typeof physicalSayHarnessV1>;
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const replaceCurrent = () => {
        expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
          .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
      };
      fixture = physicalSayHarnessV1({
        revealGenerationPort: Object.freeze({
          capturePhaseInternalV1: () => {
            if (callback === "phase") {
              replaceCurrent();
              throw new Error("phase loses to replacement");
            }
            return "incomplete" as const;
          },
          revealAllInternalV1: () => {
            replaceCurrent();
            throw new Error("reveal loses to replacement");
          },
        }),
        semanticDispatchPort: Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }),
      });
      const attempt = fixture.admission.issueSayActivationAttemptInternalV1(
        fixture.controller,
      );
      expect(attempt).not.toBeNull();
      const result = fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            `gesture.narrative.say-${callback}-reentry`,
          ),
        }),
        attempt,
      );
      expect(result.consumerResult).toEqual({ kind: "stale", completion: null });
      expect(dispatchResolution).not.toHaveBeenCalled();
      expect(
        fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
        callback,
      ).toBeNull();
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("classifies nullish reveal throws as faults while the frame stays current", () => {
    for (const thrown of [null, undefined]) {
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const fixture = physicalSayHarnessV1({
        revealGenerationPort: Object.freeze({
          capturePhaseInternalV1: () => "incomplete" as const,
          revealAllInternalV1: () => {
            throw thrown;
          },
        }),
        semanticDispatchPort: Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }),
      });
      const attempt = fixture.admission.issueSayActivationAttemptInternalV1(
        fixture.controller,
      );
      expect(attempt).not.toBeNull();
      expect(
        fixture.admission.routeInternalV1(
          fixture.admission.createEnvelopeInternalV1({
            actionId: narrativeConfirmActionIdV1,
            gestureId: parseManagedSurfaceGestureIdV1(
              `gesture.narrative.say-nullish-${String(thrown)}`,
            ),
          }),
          attempt,
        ).consumerResult,
      ).toEqual({ kind: "faulted", completion: null });
      expect(dispatchResolution).not.toHaveBeenCalled();
      expect(
        fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
      ).not.toBeNull();
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("holds the bridge callback gate across reentrant controller replacement", () => {
    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    let nestedControllerCreation: unknown = null;
    const successorRevealPort = Object.freeze({
      capturePhaseInternalV1: () => "incomplete" as const,
      revealAllInternalV1: vi.fn(),
    });
    fixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => {
          fixture.controller.disposeInternalV1();
          fixture.admission.disposeInternalV1();
          try {
            nestedControllerCreation = createNarrativeStableSayRevealControllerInternalV1({
              bridge: fixture.harness.bridge,
              revealGenerationPort: successorRevealPort,
            });
          } catch (error) {
            nestedControllerCreation = error;
          }
          return "complete" as const;
        },
        revealAllInternalV1: vi.fn(),
      }),
    });
    const attempt = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(attempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.say-controller-reentry",
          ),
        }),
        attempt,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(nestedControllerCreation).toBeInstanceOf(TypeError);
    expect((nestedControllerCreation as TypeError).message).toBe(
      "ui.narrative_stable_say_reveal_controller_invalid",
    );

    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort: successorRevealPort,
    });
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).not.toBeNull();
    successorController.disposeInternalV1();
    successorAdmission.disposeInternalV1();
  });

  it("fails closed before reveal reads on suspension and raw registry divergence", () => {
    for (const failure of ["suspension", "registry_divergence"] as const) {
      const capturePhase = vi.fn(() => "incomplete" as const);
      const revealAll = vi.fn();
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const revealGenerationPort = Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      });
      const semanticDispatchPort = Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      });
      let blockingDefinition:
        | ReturnType<typeof parseManagedSurfaceResolvedDefinitionV1>
        | null = null;
      const fixture = failure === "suspension"
        ? (() => {
          const parts = nonBlockingNarrativeHarnessV1(
            semanticDispatchPort,
            90,
            "blocking",
          );
          blockingDefinition = parts.nonBlockingDefinition;
          expect(parts.harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
            .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
          settleCurrentNarrativeReadyV1(parts.harness);
          const controller = createNarrativeStableSayRevealControllerInternalV1({
            bridge: parts.harness.bridge,
            revealGenerationPort,
          });
          const inputRouter = createInputRouterV1();
          const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
            bridge: parts.harness.bridge,
            inputRouter,
            isGestureCurrent: () => true,
          });
          return { ...parts, inputRouter, admission, controller };
        })()
        : physicalSayHarnessV1({ revealGenerationPort, semanticDispatchPort });
      const attempt = fixture.admission.issueSayActivationAttemptInternalV1(
        fixture.controller,
      );
      expect(attempt).not.toBeNull();
      const envelope = fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          `gesture.narrative.say-${failure}`,
        ),
      });
      if (failure === "suspension") {
        if (blockingDefinition === null) throw new Error("expected blocking definition");
        openNonBlockingSurfaceV1(
          fixture.harness,
          blockingDefinition,
          "suspended",
          "candidate",
          () => {},
          "suspended",
        );
      } else {
        expect(
          fixture.harness.registry.disposePublisherLease(
            narrativeBaselineV1(fixture.harness).publisherLease,
          ),
        ).toBe("disposed");
      }
      const result = fixture.admission.routeInternalV1(envelope, attempt);
      expect(result.consumerResult).toBeNull();
      expect(capturePhase).not.toHaveBeenCalled();
      expect(revealAll).not.toHaveBeenCalled();
      expect(dispatchResolution).not.toHaveBeenCalled();
      expect(
        fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
        failure,
      ).toBeNull();
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("keeps the semantic boundary sealed across admission and controller replacement", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    const dispatchResolution = vi.fn(() => semanticCompletion);
    const fixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const oldAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(oldAttempt).not.toBeNull();
    const oldResult = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-pending-old"),
      }),
      oldAttempt,
    );
    expect(oldResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (oldResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected pending Say dispatch");
    }

    fixture.admission.disposeInternalV1();
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    fixture.controller.disposeInternalV1();
    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
    });
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).toBeNull();

    settleSemantic("drained");
    await expect(oldResult.consumerResult.completion).resolves.toBe("drained");
    const freshAttempt = successorAdmission.issueSayActivationAttemptInternalV1(
      successorController,
    );
    expect(freshAttempt).not.toBeNull();
    fixture.controller.disposeInternalV1();
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).toBeNull();
    successorController.disposeInternalV1();
    successorAdmission.disposeInternalV1();
    expect(dispatchResolution).toHaveBeenCalledOnce();
  });

  it("keeps a same-frame semantic claim sealed across suspension and resume", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    const revealGenerationPort = Object.freeze({
      capturePhaseInternalV1: () => "complete" as const,
      revealAllInternalV1: vi.fn(),
    });
    const semanticDispatchPort = Object.freeze({
      dispatchResolutionInternalV1: vi.fn(() => semanticCompletion),
    });
    const { harness, nonBlockingDefinition: blockingDefinition } = nonBlockingNarrativeHarnessV1(
      semanticDispatchPort,
      90,
      "blocking",
    );
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const inputRouter = createInputRouterV1();
    const fixture = {
      harness,
      inputRouter,
      controller: createNarrativeStableSayRevealControllerInternalV1({
        bridge: harness.bridge,
        revealGenerationPort,
      }),
      admission: createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: harness.bridge,
        inputRouter,
        isGestureCurrent: () => true,
      }),
    };
    const attempt = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(attempt).not.toBeNull();
    const pending = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-suspend-pending"),
      }),
      attempt,
    );
    expect(pending.consumerResult).toMatchObject({ kind: "dispatched" });
    if (pending.consumerResult?.kind !== "dispatched") {
      throw new Error("expected pending Say dispatch before suspension");
    }

    const blocker = openNonBlockingSurfaceV1(
      fixture.harness,
      blockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    const suspendedPublication = fixture.harness.kernel.getStateInternalV1().transientState
      .publication;
    expect(fixture.harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: suspendedPublication.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied" });
    fixture.admission.disposeInternalV1();
    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort,
    });
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).toBeNull();

    settleSemantic("resumed-drain");
    await expect(pending.consumerResult.completion).resolves.toBe("resumed-drain");
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).not.toBeNull();
    fixture.controller.disposeInternalV1();
    successorController.disposeInternalV1();
    successorAdmission.disposeInternalV1();
  });

  it("retires a changed-source claim without letting its old completion clear the successor", async () => {
    let settleOld!: (value: unknown) => void;
    let settleSuccessor!: (value: unknown) => void;
    const oldCompletion = new Promise<unknown>((resolve) => {
      settleOld = resolve;
    });
    const successorCompletion = new Promise<unknown>((resolve) => {
      settleSuccessor = resolve;
    });
    const dispatchResolution = vi.fn(() =>
      dispatchResolution.mock.calls.length === 1 ? oldCompletion : successorCompletion
    );
    const revealGenerationPort = Object.freeze({
      capturePhaseInternalV1: () => "complete" as const,
      revealAllInternalV1: vi.fn(),
    });
    const fixture = physicalSayHarnessV1({
      revealGenerationPort,
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const oldAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(oldAttempt).not.toBeNull();
    const oldResult = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-old-source"),
      }),
      oldAttempt,
    );
    expect(oldResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (oldResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected old-source Say dispatch");
    }

    fixture.controller.disposeInternalV1();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    fixture.admission.disposeInternalV1();
    settleCurrentNarrativeReadyV1(fixture.harness);
    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort,
    });
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    const successorAttempt = successorAdmission.issueSayActivationAttemptInternalV1(
      successorController,
    );
    expect(successorAttempt).not.toBeNull();
    const successorResult = successorAdmission.routeInternalV1(
      successorAdmission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-successor-source"),
      }),
      successorAttempt,
    );
    expect(successorResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (successorResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected successor-source Say dispatch");
    }

    settleOld("old-drained");
    await expect(oldResult.consumerResult.completion).resolves.toBe("old-drained");
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).toBeNull();
    settleSuccessor("successor-drained");
    await expect(successorResult.consumerResult.completion).resolves.toBe(
      "successor-drained",
    );
    expect(
      successorAdmission.issueSayActivationAttemptInternalV1(successorController),
    ).not.toBeNull();
    fixture.controller.disposeInternalV1();
    successorController.disposeInternalV1();
    successorAdmission.disposeInternalV1();
  });

  it("releases same-frame semantic rejection before exposing completion", async () => {
    const sentinel = new Error("semantic dispatch rejected after drain");
    const dispatchResolution = vi.fn(() => {
      throw sentinel;
    });
    const fixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const attempt = fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller);
    expect(attempt).not.toBeNull();
    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-rejected"),
      }),
      attempt,
    );
    expect(result.consumerResult).toMatchObject({ kind: "dispatched" });
    if (result.consumerResult?.kind !== "dispatched") {
      throw new Error("expected rejected Say completion");
    }
    await expect(result.consumerResult.completion).rejects.toBe(sentinel);
    expect(
      fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
    ).not.toBeNull();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("keeps 10k reveal-only rotations behaviorally bounded", () => {
    const capturePhase = vi.fn(() => "incomplete" as const);
    const revealAll = vi.fn();
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const envelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeConfirmActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.say-10k"),
    });
    let revealedResult: unknown = null;
    for (let index = 0; index < 10_000; index += 1) {
      const attempt = fixture.admission.issueSayActivationAttemptInternalV1(
        fixture.controller,
      );
      expect(attempt).not.toBeNull();
      const consumerResult = fixture.admission.routeInternalV1(envelope, attempt).consumerResult;
      expect(consumerResult).toEqual({ kind: "revealed", completion: null });
      if (revealedResult === null) revealedResult = consumerResult;
      else expect(consumerResult).toBe(revealedResult);
    }
    expect(capturePhase).toHaveBeenCalledTimes(10_000);
    expect(revealAll).toHaveBeenCalledTimes(10_000);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("keeps 10k content-auto not-ready rotations behaviorally bounded", () => {
    const capturePhase = vi.fn(() => "incomplete" as const);
    const revealAll = vi.fn();
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    let notReadyResult: unknown = null;
    for (let index = 0; index < 10_000; index += 1) {
      const attempt = fixture.controller.issueContentAutoAttemptInternalV1();
      expect(attempt).not.toBeNull();
      const result = fixture.controller.dispatchContentAutoInternalV1(attempt);
      expect(result).toEqual({ kind: "not_ready", completion: null });
      if (notReadyResult === null) notReadyResult = result;
      else expect(result).toBe(notReadyResult);
    }
    expect(capturePhase).toHaveBeenCalledTimes(10_000);
    expect(revealAll).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("captures one exact voice port handle and rejects every malformed raw shape", () => {
    type ExpectedVoiceResultV1 =
      | Readonly<{ readonly kind: "handled"; readonly completion: null }>
      | Readonly<{ readonly kind: "ignored"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStableVoiceReplayDispatchResultInternalV1>()
      .toEqualTypeOf<ExpectedVoiceResultV1>();

    const originalReplay = vi.fn(function (this: unknown) {
      expect(this).toBe(rawPort);
      expect(arguments).toHaveLength(0);
      return true;
    });
    const replacementReplay = vi.fn(() => false);
    const rawPort = {
      replayCurrentVoiceInternalV1: originalReplay,
    } satisfies NarrativeStableVoiceReplayPortInternalV1;
    const fixture = physicalSayHarnessV1({ voiceReplayPort: rawPort });
    const baseline = narrativeBaselineV1(fixture.harness);
    if (baseline.kind !== "accepted") throw new Error("expected accepted voice baseline");
    const frame = fixture.harness.bridge.inspectAdmittedTargetFrameInternalV1(
      baseline.targets[0],
    );
    if (frame === null) throw new Error("expected admitted voice frame");
    expectTypeOf(frame.candidateSnapshot.voiceReplayPort).toEqualTypeOf<
      NarrativeStableCapturedVoiceReplayPortInternalV1 | null
    >();
    const capturedHandle = frame.candidateSnapshot.voiceReplayPort;
    expect(capturedHandle).not.toBe(rawPort);
    expect(capturedHandle).not.toBeNull();
    expect(Object.isFrozen(capturedHandle)).toBe(true);
    expect(Reflect.ownKeys(capturedHandle as object)).toEqual([]);

    rawPort.replayCurrentVoiceInternalV1 = replacementReplay;
    const attempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expectTypeOf(attempt).toEqualTypeOf<
      NarrativeStableVoiceReplayActionAttemptInternalV1 | null
    >();
    expect(attempt).not.toBeNull();
    const result = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeReplayVoiceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-captured"),
      }),
      attempt,
    );
    expect(result.consumerResult).toEqual({ kind: "handled", completion: null });
    expect(originalReplay).toHaveBeenCalledOnce();
    expect(replacementReplay).not.toHaveBeenCalled();

    const proxyValueRead = vi.fn();
    let proxyPort!: NarrativeStableVoiceReplayPortInternalV1;
    const proxyReplay = vi.fn(function (this: unknown) {
      expect(this).toBe(proxyPort);
      expect(arguments).toHaveLength(0);
      return true;
    });
    proxyPort = new Proxy({ replayCurrentVoiceInternalV1: proxyReplay }, {
      get(target, key, receiver) {
        proxyValueRead(key);
        return Reflect.get(target, key, receiver);
      },
    });
    const proxyFixture = physicalSayHarnessV1({ voiceReplayPort: proxyPort });
    const proxyAttempt = proxyFixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(proxyAttempt).not.toBeNull();
    expect(
      proxyFixture.admission.routeInternalV1(
        proxyFixture.admission.createEnvelopeInternalV1({
          actionId: narrativeReplayVoiceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.voice-transparent-proxy",
          ),
        }),
        proxyAttempt,
      ).consumerResult,
    ).toEqual({ kind: "handled", completion: null });
    expect(proxyValueRead).not.toHaveBeenCalled();
    expect(proxyReplay).toHaveBeenCalledOnce();

    const inherited = Object.create({
      replayCurrentVoiceInternalV1: () => true,
    }) as object;
    const accessorRead = vi.fn(() => () => true);
    const accessor = Object.defineProperty({}, "replayCurrentVoiceInternalV1", {
      enumerable: true,
      get: accessorRead,
    });
    const extraSymbol = Object.assign(
      { replayCurrentVoiceInternalV1: () => true },
      { [Symbol("extra")]: true },
    );
    const malformedPorts: readonly unknown[] = Object.freeze([
      [],
      Object.assign(() => true, { replayCurrentVoiceInternalV1: () => true }),
      Object.assign(Object.create(null), { replayCurrentVoiceInternalV1: () => true }),
      Object.assign(Object.create({ foreign: true }), {
        replayCurrentVoiceInternalV1: () => true,
      }),
      { replayCurrentVoiceInternalV1: () => true, extra: true },
      extraSymbol,
      accessor,
      inherited,
      {},
      { replayCurrentVoiceInternalV1: false },
      new Proxy({ replayCurrentVoiceInternalV1: () => true }, {
        getPrototypeOf() {
          throw new Error("voice prototype trap");
        },
      }),
      new Proxy({ replayCurrentVoiceInternalV1: () => true }, {
        ownKeys() {
          throw new Error("voice ownKeys trap");
        },
      }),
      new Proxy({ replayCurrentVoiceInternalV1: () => true }, {
        getOwnPropertyDescriptor() {
          throw new Error("voice descriptor trap");
        },
      }),
    ]);
    for (const voiceReplayPort of malformedPorts) {
      const malformed = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () =>
            capturedCandidatePreflightResultV1(Object.freeze({
              ...defaultCandidateSnapshotV1,
              voiceReplayPort,
            })),
        }),
      });
      const before = malformed.kernel.getStateInternalV1();
      expectZeroResultV1(
        malformed.bridge.reconcilePendingInternalV1(pendingV1("say")),
        "faulted",
        "narrative.candidate_preflight_faulted",
      );
      expect(malformed.kernel.getStateInternalV1()).toBe(before);
      expect(malformed.stateNotificationCount()).toBe(0);
      expect(publisherSnapshotV1(malformed)).toMatchObject({
        sourceRevisionIssuanceHighWater: 0,
        occurrenceIssuanceHighWater: 0,
      });
    }
    expect(accessorRead).not.toHaveBeenCalled();
    proxyFixture.controller.disposeInternalV1();
    proxyFixture.admission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it.each(
    [
      ["absent", null, "ignored"],
      ["true", true, "handled"],
      ["false", false, "ignored"],
      ["throw", "throw", "faulted"],
      ["nonboolean", "invalid", "faulted"],
    ] as const,
  )("routes voice replay %s as one consumed exact result", (_label, outcome, kind) => {
    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    let rawPort: NarrativeStableVoiceReplayPortInternalV1 | null = null;
    const replay = vi.fn(function (this: unknown) {
      expect(this).toBe(rawPort);
      expect(arguments).toHaveLength(0);
      if (outcome === "throw") throw new Error("voice replay failed");
      return outcome;
    });
    if (outcome !== null) {
      rawPort = {
        replayCurrentVoiceInternalV1: replay,
      } as unknown as NarrativeStableVoiceReplayPortInternalV1;
    }
    const fixture = physicalSayHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
      voiceReplayPort: rawPort,
    });
    const lower = vi.fn(() => inputHandledV1);
    fixture.inputRouter.register({ context: "gameplay", handle: lower });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const attempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(attempt).not.toBeNull();
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt as object)).toEqual([]);
    const envelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(`gesture.narrative.voice-${_label}`),
    });
    const result = fixture.admission.routeInternalV1(envelope, attempt);
    expect(result).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult: { kind, completion: null },
    });
    expect(Object.isFrozen(result.consumerResult)).toBe(true);
    expect(replay).toHaveBeenCalledTimes(outcome === null ? 0 : 1);
    expect(lower).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    expect(fixture.admission.routeInternalV1(envelope, attempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(fixture.admission.issueVoiceReplayAttemptInternalV1()).not.toBeNull();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("runs generic fences and action mapping before spending an authentic voice attempt", () => {
    let gestureCurrent = false;
    const replay = vi.fn(() => true);
    const rawPort = {
      replayCurrentVoiceInternalV1: replay,
    } satisfies NarrativeStableVoiceReplayPortInternalV1;
    const fixture = physicalSayHarnessV1({
      isGestureCurrent: () => gestureCurrent,
      voiceReplayPort: rawPort,
    });
    const attempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const replayEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-generic-first"),
    });
    expect(fixture.admission.routeInternalV1(replayEnvelope, attempt)).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    gestureCurrent = true;
    expect(fixture.admission.routeInternalV1(replayEnvelope, attempt).consumerResult).toEqual({
      kind: "handled",
      completion: null,
    });

    const wrongActionAttempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(wrongActionAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-unmapped"),
        }),
        wrongActionAttempt,
      ).consumerResult,
    ).toEqual({ kind: "unmapped", completion: null });
    expect(fixture.admission.routeInternalV1(replayEnvelope, wrongActionAttempt).consumerResult)
      .toEqual({ kind: "handled", completion: null });

    const unpublishedAttempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(unpublishedAttempt).not.toBeNull();
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeUnknownActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-unpublished"),
        }),
        unpublishedAttempt,
      ),
    ).toMatchObject({
      route: { surface: { kind: "rejected", code: "surface.action_unpublished" } },
      consumerResult: null,
    });
    expect(fixture.admission.routeInternalV1(replayEnvelope, unpublishedAttempt).consumerResult)
      .toEqual({ kind: "handled", completion: null });

    const sayAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(sayAttempt).not.toBeNull();
    expect(fixture.admission.routeInternalV1(replayEnvelope, sayAttempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(replay).toHaveBeenCalledTimes(3);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("separates family-local pre-route drift from generic terminal fences", () => {
    const sourceReplay = vi.fn(() => true);
    const source = physicalSayHarnessV1({
      voiceReplayPort: {
        replayCurrentVoiceInternalV1: sourceReplay,
      } satisfies NarrativeStableVoiceReplayPortInternalV1,
    });
    const sourceAttempt = source.admission.issueVoiceReplayAttemptInternalV1();
    expect(sourceAttempt).not.toBeNull();
    const sourceEnvelope = source.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.voice-pre-route-source",
      ),
    });
    expect(source.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const replacement = source.harness.kernel.getStateInternalV1().stableRuntimeBindings[0]
      ?.binding;
    if (replacement?.kind !== "preparing") {
      throw new Error("expected retained voice replacement");
    }
    expect(replacement.retainedSubtree).not.toBeNull();
    expect(source.admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    const replacementState = source.harness.kernel.getStateInternalV1();
    const replacementNotifications = source.harness.stateNotificationCount();
    expect(source.admission.routeInternalV1(sourceEnvelope, sourceAttempt)).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult: { kind: "stale", completion: null },
    });
    expect(sourceReplay).not.toHaveBeenCalled();
    expect(source.harness.kernel.getStateInternalV1()).toBe(replacementState);
    expect(source.harness.stateNotificationCount()).toBe(replacementNotifications);
    expect(source.admission.routeInternalV1(sourceEnvelope, sourceAttempt).consumerResult)
      .toEqual({ kind: "stale", completion: null });
    expect(sourceReplay).not.toHaveBeenCalled();
    source.controller.disposeInternalV1();
    source.admission.disposeInternalV1();

    for (const terminal of ["admission", "coordinator"] as const) {
      const terminalReplay = vi.fn(() => true);
      const fixture = physicalSayHarnessV1({
        voiceReplayPort: {
          replayCurrentVoiceInternalV1: terminalReplay,
        } satisfies NarrativeStableVoiceReplayPortInternalV1,
      });
      const attempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
      expect(attempt).not.toBeNull();
      const envelope = fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeReplayVoiceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          `gesture.narrative.voice-pre-route-${terminal}`,
        ),
      });
      if (terminal === "admission") {
        fixture.admission.disposeInternalV1();
      } else {
        expect(fixture.harness.kernel.transitionTransientInternalV1({
          kind: "dispose_coordinator",
        })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
      }
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      expect(fixture.admission.routeInternalV1(envelope, attempt).consumerResult).toBeNull();
      expect(terminalReplay).not.toHaveBeenCalled();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("keeps voice attempts opaque, admission-bound, and isolated from Say attempts", () => {
    const replay = vi.fn(() => true);
    const revealAll = vi.fn();
    const fixture = physicalSayHarnessV1({
      voiceReplayPort: {
        replayCurrentVoiceInternalV1: replay,
      } satisfies NarrativeStableVoiceReplayPortInternalV1,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "incomplete" as const,
        revealAllInternalV1: revealAll,
      }),
    });
    const replayEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-authenticity"),
    });
    const voiceAttempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    if (voiceAttempt === null) throw new Error("expected authentic voice attempt");
    const borrowedRoute = fixture.admission.routeInternalV1;
    expect(() => Reflect.apply(borrowedRoute, Object.freeze({}), [replayEnvelope, voiceAttempt]))
      .toThrowError("ui.narrative_stable_action_admission_invalid");
    for (
      const spoof of [
        Object.freeze({ ...voiceAttempt }),
        Object.freeze({}),
      ]
    ) {
      expect(fixture.admission.routeInternalV1(replayEnvelope, spoof).consumerResult).toEqual({
        kind: "stale",
        completion: null,
      });
    }
    expect(replay).not.toHaveBeenCalled();
    expect(fixture.admission.routeInternalV1(replayEnvelope, voiceAttempt).consumerResult).toEqual({
      kind: "handled",
      completion: null,
    });

    const borrowedIssue = fixture.admission.issueVoiceReplayAttemptInternalV1;
    expect(Reflect.apply(borrowedIssue, Object.freeze({}), [])).toBeNull();

    const foreignReplay = vi.fn(() => true);
    const foreign = physicalSayHarnessV1({
      voiceReplayPort: {
        replayCurrentVoiceInternalV1: foreignReplay,
      } satisfies NarrativeStableVoiceReplayPortInternalV1,
    });
    const foreignAttempt = foreign.admission.issueVoiceReplayAttemptInternalV1();
    if (foreignAttempt === null) throw new Error("expected foreign voice attempt");
    expect(
      fixture.admission.routeInternalV1(replayEnvelope, foreignAttempt).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(foreignReplay).not.toHaveBeenCalled();
    expect(
      foreign.admission.routeInternalV1(
        foreign.admission.createEnvelopeInternalV1({
          actionId: narrativeReplayVoiceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.voice-authenticity-foreign",
          ),
        }),
        foreignAttempt,
      ).consumerResult,
    ).toEqual({ kind: "handled", completion: null });

    const sayAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    if (sayAttempt === null) throw new Error("expected authentic Say attempt");
    expect(fixture.admission.routeInternalV1(replayEnvelope, sayAttempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(
      fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeConfirmActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.voice-authenticity-say",
          ),
        }),
        sayAttempt,
      ).consumerResult,
    ).toEqual({ kind: "revealed", completion: null });
    expect(revealAll).toHaveBeenCalledOnce();
    expect(replay).toHaveBeenCalledOnce();
    expect(foreignReplay).toHaveBeenCalledOnce();

    foreign.controller.disposeInternalV1();
    foreign.admission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("issues only for current Say and spends before a shared content-auto claim", () => {
    const choice = physicalChoiceHarnessV1();
    const pause = physicalPauseHarnessV1();
    const custom = physicalCustomHarnessV1();
    expect(choice.admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    expect(pause.admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    expect(custom.admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    choice.admission.disposeInternalV1();
    pause.admission.disposeInternalV1();
    custom.admission.disposeInternalV1();

    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    let voiceAttempt: NarrativeStableVoiceReplayActionAttemptInternalV1 | null = null;
    let voiceEnvelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    let nestedVoiceResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    const replay = vi.fn(() => true);
    const capturePhase = vi.fn(() => {
      nestedVoiceResult = fixture.admission.routeInternalV1(
        voiceEnvelope,
        voiceAttempt,
      ).consumerResult;
      return "incomplete" as const;
    });
    fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: vi.fn(),
      }),
      voiceReplayPort: {
        replayCurrentVoiceInternalV1: replay,
      } satisfies NarrativeStableVoiceReplayPortInternalV1,
    });
    voiceAttempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(voiceAttempt).not.toBeNull();
    voiceEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-auto-first-win"),
    });
    const automaticAttempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(automaticAttempt).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(automaticAttempt)).toEqual({
      kind: "not_ready",
      completion: null,
    });
    expect(nestedVoiceResult).toEqual({ kind: "stale", completion: null });
    expect(fixture.admission.routeInternalV1(voiceEnvelope, voiceAttempt).consumerResult).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(replay).not.toHaveBeenCalled();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("distinguishes active-only topology churn from a real blocking suspension", () => {
    const active = physicalSayHarnessV1();
    const beforeChurn = active.admission.issueVoiceReplayAttemptInternalV1();
    expect(beforeChurn).not.toBeNull();
    suspendCurrentNarrativeV1(active.harness);
    const afterChurn = active.admission.issueVoiceReplayAttemptInternalV1();
    expect(afterChurn).not.toBeNull();
    expect(afterChurn).not.toBe(beforeChurn);
    active.controller.disposeInternalV1();
    active.admission.disposeInternalV1();

    const blocked = nonBlockingNarrativeHarnessV1(
      defaultSemanticDispatchPortV1,
      90,
      "blocking",
    );
    expect(blocked.harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(blocked.harness);
    const blockedController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: blocked.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "incomplete" as const,
        revealAllInternalV1: () => {},
      }),
    });
    const blockedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: blocked.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const suspendedAttempt = blockedAdmission.issueVoiceReplayAttemptInternalV1();
    expect(suspendedAttempt).not.toBeNull();
    const suspendedEnvelope = blockedAdmission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.voice-real-blocking-suspension",
      ),
    });
    openNonBlockingSurfaceV1(
      blocked.harness,
      blocked.nonBlockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    const suspendedBinding = blocked.harness.kernel.getStateInternalV1().stableRuntimeBindings[0]
      ?.binding;
    if (suspendedBinding?.kind !== "ready_instance") {
      throw new Error("expected ready Narrative root during blocking suspension");
    }
    expect(suspendedBinding.instance.phase).toBe("suspended");
    expect(blockedAdmission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    expect(
      blockedAdmission.routeInternalV1(suspendedEnvelope, suspendedAttempt).consumerResult,
    ).toBeNull();
    blockedController.disposeInternalV1();
    blockedAdmission.disposeInternalV1();
  });

  it("gives post-callback target, suspension, and disposal drift stale precedence", () => {
    for (
      const [drift, outcome] of [
        ["source", true],
        ["suspend", false],
        ["admission_dispose", "throw"],
        ["bridge_dispose", "invalid"],
      ] as const
    ) {
      let fixture!: ReturnType<typeof physicalSayHarnessV1>;
      let nestedState: unknown = null;
      let nestedNotifications: number | null = null;
      let rawPort!: NarrativeStableVoiceReplayPortInternalV1;
      let blockingDefinition:
        | ReturnType<typeof parseManagedSurfaceResolvedDefinitionV1>
        | null = null;
      const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const replay = vi.fn(function (this: unknown) {
        expect(this).toBe(rawPort);
        if (drift === "source") {
          expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
            .toMatchObject({ kind: "applied" });
        } else if (drift === "suspend") {
          if (blockingDefinition === null) throw new Error("expected blocking definition");
          openNonBlockingSurfaceV1(
            fixture.harness,
            blockingDefinition,
            "suspended",
            "candidate",
            () => {},
            "suspended",
          );
          const suspendedBinding = fixture.harness.kernel.getStateInternalV1()
            .stableRuntimeBindings[0]?.binding;
          if (suspendedBinding?.kind !== "ready_instance") {
            throw new Error("expected ready Narrative root after callback suspension");
          }
          expect(suspendedBinding.instance.phase).toBe("suspended");
        } else if (drift === "admission_dispose") {
          fixture.admission.disposeInternalV1();
        } else {
          expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({
            kind: "applied",
            code: "surface.stable_publisher_disposed",
          });
        }
        nestedState = fixture.harness.kernel.getStateInternalV1();
        nestedNotifications = fixture.harness.stateNotificationCount();
        if (outcome === "throw") throw new Error("voice callback drifted and threw");
        return outcome;
      });
      rawPort = {
        replayCurrentVoiceInternalV1: replay,
      } as unknown as NarrativeStableVoiceReplayPortInternalV1;
      const semanticDispatchPort = Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      });
      if (drift === "suspend") {
        const blocked = nonBlockingNarrativeHarnessV1(
          semanticDispatchPort,
          90,
          "blocking",
          rawPort,
        );
        blockingDefinition = blocked.nonBlockingDefinition;
        expect(blocked.harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
          .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
        settleCurrentNarrativeReadyV1(blocked.harness);
        const revealGenerationPort = Object.freeze({
          capturePhaseInternalV1: () => "incomplete" as const,
          revealAllInternalV1: () => {},
        });
        const controller = createNarrativeStableSayRevealControllerInternalV1({
          bridge: blocked.harness.bridge,
          revealGenerationPort,
        });
        const inputRouter = createInputRouterV1();
        const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
          bridge: blocked.harness.bridge,
          inputRouter,
          isGestureCurrent: () => true,
        });
        fixture = {
          harness: blocked.harness,
          inputRouter,
          admission,
          controller,
          revealGenerationPort,
          semanticDispatchPort,
        };
      } else {
        fixture = physicalSayHarnessV1({
          voiceReplayPort: rawPort,
          semanticDispatchPort,
        });
      }
      const attempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
      expect(attempt).not.toBeNull();
      const result = fixture.admission.routeInternalV1(
        fixture.admission.createEnvelopeInternalV1({
          actionId: narrativeReplayVoiceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(`gesture.narrative.voice-drift-${drift}`),
        }),
        attempt,
      );
      expect(result.consumerResult).toEqual({ kind: "stale", completion: null });
      expect(replay).toHaveBeenCalledOnce();
      expect(semanticDispatch).not.toHaveBeenCalled();
      expect(nestedState).not.toBeNull();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(nestedState);
      expect(fixture.harness.stateNotificationCount()).toBe(nestedNotifications);
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("shares the Say callback claim across dispose/recreate reentry and releases a fresh successor", () => {
    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    const successorHolder: {
      current: NarrativeStablePhysicalActionAdmissionInternalV1 | null;
    } = { current: null };
    let outerAttempt: NarrativeStableVoiceReplayActionAttemptInternalV1 | null = null;
    let outerEnvelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    let manualAttempt: NarrativeStableSayActivationAttemptInternalV1 | null = null;
    let manualEnvelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    let contentAutoAttempt: NarrativeStableSayContentAutoAttemptInternalV1 | null = null;
    let nestedRouteResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    let replayCalls = 0;
    const capturePhase = vi.fn(() => "incomplete" as const);
    const revealAll = vi.fn();
    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const replay = vi.fn(function (this: unknown) {
      expect(this).toBe(rawPort);
      replayCalls += 1;
      if (replayCalls !== 1) return true;
      expect(fixture.admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
      expect(
        fixture.admission.issueSayActivationAttemptInternalV1(fixture.controller),
      ).toBeNull();
      expect(fixture.controller.issueContentAutoAttemptInternalV1()).toBeNull();
      expect(() => fixture.admission.routeInternalV1(manualEnvelope, manualAttempt))
        .toThrowError("ui.managed_surface_action_route_in_progress");
      expect(fixture.controller.dispatchContentAutoInternalV1(contentAutoAttempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      expect(capturePhase).not.toHaveBeenCalled();
      expect(revealAll).not.toHaveBeenCalled();
      expect(semanticDispatch).not.toHaveBeenCalled();
      fixture.admission.disposeInternalV1();
      const successor = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: () => true,
      });
      successorHolder.current = successor;
      expect(successor.issueVoiceReplayAttemptInternalV1()).toBeNull();
      expect(successor.issueSayActivationAttemptInternalV1(fixture.controller)).toBeNull();
      nestedRouteResult = successor.routeInternalV1(
        successor.createEnvelopeInternalV1({
          actionId: narrativeReplayVoiceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.voice-successor-nested",
          ),
        }),
        outerAttempt,
      ).consumerResult;
      return true;
    });
    const rawPort = {
      replayCurrentVoiceInternalV1: replay,
    } satisfies NarrativeStableVoiceReplayPortInternalV1;
    fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      voiceReplayPort: rawPort,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: revealAll,
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    manualAttempt = fixture.admission.issueSayActivationAttemptInternalV1(
      fixture.controller,
    );
    expect(manualAttempt).not.toBeNull();
    manualEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeConfirmActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.voice-successor-manual",
      ),
    });
    contentAutoAttempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(contentAutoAttempt).not.toBeNull();
    outerAttempt = fixture.admission.issueVoiceReplayAttemptInternalV1();
    expect(outerAttempt).not.toBeNull();
    outerEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeReplayVoiceActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-successor-outer"),
    });
    const outer = fixture.admission.routeInternalV1(outerEnvelope, outerAttempt);
    expect(outer.consumerResult).toEqual({ kind: "stale", completion: null });
    expect(nestedRouteResult).toEqual({ kind: "stale", completion: null });
    expect(capturePhase).not.toHaveBeenCalled();
    expect(fixture.controller.dispatchContentAutoInternalV1(contentAutoAttempt)).toEqual({
      kind: "not_ready",
      completion: null,
    });
    expect(capturePhase).toHaveBeenCalledOnce();
    expect(revealAll).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();
    const successor = successorHolder.current;
    expect(successor).not.toBeNull();
    if (successor === null) throw new Error("expected successor voice admission");
    const freshAttempt = successor.issueVoiceReplayAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    expect(
      successor.routeInternalV1(
        successor.createEnvelopeInternalV1({
          actionId: narrativeReplayVoiceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.voice-successor-fresh"),
        }),
        freshAttempt,
      ).consumerResult,
    ).toEqual({ kind: "handled", completion: null });
    expect(replay).toHaveBeenCalledTimes(2);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    successor.disposeInternalV1();
  });

  it("owns one exact playback mode and applies the six toggle transitions without ABA", () => {
    expectTypeOf<NarrativeStablePublisherBridgeInternalV1>().toMatchTypeOf<{
      readPlaybackModeInternalV1(): NarrativeStablePlaybackModeInternalV1;
    }>();
    expectTypeOf<NarrativeStablePhysicalActionAdmissionInternalV1>().toMatchTypeOf<{
      issuePlaybackModeToggleAttemptInternalV1(
        requestedMode: "auto" | "skip",
      ): NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null;
    }>();
    expectTypeOf<NarrativeStablePlaybackModeToggleDispatchResultInternalV1>()
      .toMatchTypeOf<
        | Readonly<{
          readonly kind: "toggled";
          readonly mode: NarrativeStablePlaybackModeInternalV1;
          readonly completion: null;
        }>
        | Readonly<{
          readonly kind: "ignored" | "stale" | "faulted";
          readonly completion: null;
        }>
      >();

    const fixture = physicalSayHarnessV1();
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(Object.keys(fixture.harness.bridge)).toContain("readPlaybackModeInternalV1");
    expect(Object.keys(fixture.admission)).toContain(
      "issuePlaybackModeToggleAttemptInternalV1",
    );

    const staleFromInitial = fixture.admission.issuePlaybackModeToggleAttemptInternalV1(
      "skip",
    );
    expect(staleFromInitial).not.toBeNull();
    const transitions = [
      ["auto", "auto"],
      ["auto", "normal"],
      ["skip", "skip"],
      ["skip", "normal"],
      ["auto", "auto"],
      ["skip", "skip"],
      ["auto", "auto"],
    ] as const;
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    for (const [transitionIndex, [requestedMode, expectedMode]] of transitions.entries()) {
      const attempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1(
        requestedMode,
      );
      expect(attempt).not.toBeNull();
      const result = routePlaybackModeToggleV1(
        fixture.admission,
        requestedMode,
        attempt,
        `${requestedMode}-${expectedMode}`,
      );
      expect(result).toMatchObject({
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
        consumerResult: { kind: "toggled", mode: expectedMode, completion: null },
      });
      expect(Object.isFrozen(result.consumerResult)).toBe(true);
      expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe(expectedMode);
      if (transitionIndex === 1) {
        expect(
          routePlaybackModeToggleV1(
            fixture.admission,
            "skip",
            staleFromInitial,
            "aba-returned-to-normal",
          ).consumerResult,
        ).toEqual({ kind: "stale", completion: null });
      }
    }
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "skip",
        staleFromInitial,
        "aba-stale",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("consumes mode toggles as ignored on every ready-active non-Say kind", () => {
    for (
      const kind of [
        "choice",
        "pause",
        "custom",
      ] as const
    ) {
      const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const harness = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () =>
            capturedCandidatePreflightResultV1(Object.freeze({
              ...defaultCandidateSnapshotV1,
              semanticDispatchPort: Object.freeze({
                dispatchResolutionInternalV1: semanticDispatch,
              }),
            })),
        }),
      });
      expect(harness.bridge.reconcilePendingInternalV1(pendingV1(kind))).toMatchObject({
        kind: "applied",
        code: "surface.stable_publication_applied",
      });
      settleCurrentNarrativeReadyV1(harness);
      const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: harness.bridge,
        inputRouter: createInputRouterV1(),
        isGestureCurrent: () => true,
      });
      const attempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
      expect(attempt).not.toBeNull();
      const state = harness.kernel.getStateInternalV1();
      const notifications = harness.stateNotificationCount();
      const ignored = routePlaybackModeToggleV1(
        admission,
        "auto",
        attempt,
        `ignored-${kind}`,
      );
      expect(ignored).toMatchObject({
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
        consumerResult: { kind: "ignored", completion: null },
      });
      expect(Object.isFrozen(ignored.consumerResult)).toBe(true);
      expect(Reflect.ownKeys(ignored.consumerResult as object)).toEqual([
        "kind",
        "completion",
      ]);
      expect(
        routePlaybackModeToggleV1(admission, "auto", attempt, `ignored-repeat-${kind}`)
          .consumerResult,
      ).toEqual({ kind: "stale", completion: null });
      expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
      expect(semanticDispatch).not.toHaveBeenCalled();
      expect(harness.kernel.getStateInternalV1()).toBe(state);
      expect(harness.stateNotificationCount()).toBe(notifications);
      admission.disposeInternalV1();
    }

    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const barrier = narrativeBarrierHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
    });
    let stageNotifications = 0;
    const unsubscribeStage = barrier.stage.reconciler.subscribe(() => {
      stageNotifications += 1;
    });
    const stageFrame = barrier.stage.reconciler.frame();
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: barrier.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const attempt = admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(attempt).not.toBeNull();
    expect(admission.issueChoiceAttemptInternalV1("choice.test.first")).toBeNull();
    expect(admission.issuePauseResumeAttemptInternalV1()).toBeNull();
    expect(admission.issueCustomAttemptInternalV1(Object.freeze({}))).toBeNull();
    expect(admission.issueSayActivationAttemptInternalV1(barrier.controller)).toBeNull();
    expect(admission.issueVoiceReplayAttemptInternalV1()).toBeNull();
    const state = barrier.harness.kernel.getStateInternalV1();
    const notifications = barrier.harness.stateNotificationCount();
    expect(
      routePlaybackModeToggleV1(admission, "skip", attempt, "ignored-barrier"),
    ).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult: { kind: "ignored", completion: null },
    });
    expect(barrier.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(Object.isFrozen(
      routePlaybackModeToggleV1(
        admission,
        "skip",
        admission.issuePlaybackModeToggleAttemptInternalV1("skip"),
        "ignored-barrier-shape",
      ).consumerResult,
    )).toBe(true);
    expect(semanticDispatch).not.toHaveBeenCalled();
    expect(barrier.stage.reconciler.frame()).toEqual(stageFrame);
    expect(stageNotifications).toBe(0);
    expect(barrier.harness.kernel.getStateInternalV1()).toBe(state);
    expect(barrier.harness.stateNotificationCount()).toBe(notifications);
    unsubscribeStage();
    admission.disposeInternalV1();
    barrier.controller.disposeInternalV1();
  });

  it("resets before non-Say and empty publication notifications but preserves rejected replacement", () => {
    const nonSay = physicalSayHarnessV1();
    const autoAttempt = nonSay.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(nonSay.admission, "auto", autoAttempt, "reset-non-say")
        .consumerResult,
    ).toMatchObject({ kind: "toggled", mode: "auto" });
    const observedModes: NarrativeStablePlaybackModeInternalV1[] = [];
    const unsubscribe = nonSay.harness.kernel.subscribeStateInternalV1(() => {
      observedModes.push(nonSay.harness.bridge.readPlaybackModeInternalV1());
    });
    expect(nonSay.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(observedModes.length).toBeGreaterThan(0);
    expect(observedModes.every((mode) => mode === "normal")).toBe(true);
    expect(nonSay.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    unsubscribe();
    nonSay.admission.disposeInternalV1();
    expect(nonSay.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 3)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(nonSay.harness);
    const nonSaySuccessorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: nonSay.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const afterNonSayReset = nonSaySuccessorAdmission
      .issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        nonSaySuccessorAdmission,
        "auto",
        afterNonSayReset,
        "after-non-say-reset",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });
    nonSaySuccessorAdmission.disposeInternalV1();
    nonSay.controller.disposeInternalV1();

    const emptied = physicalSayHarnessV1();
    const skipAttempt = emptied.admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(emptied.admission, "skip", skipAttempt, "reset-empty")
        .consumerResult,
    ).toMatchObject({ kind: "toggled", mode: "skip" });
    const emptyModes: NarrativeStablePlaybackModeInternalV1[] = [];
    const unsubscribeEmpty = emptied.harness.kernel.subscribeStateInternalV1(() => {
      emptyModes.push(emptied.harness.bridge.readPlaybackModeInternalV1());
    });
    expect(emptied.harness.bridge.reconcilePendingInternalV1(null)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(emptyModes.length).toBeGreaterThan(0);
    expect(emptyModes.every((mode) => mode === "normal")).toBe(true);
    expect(emptied.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    unsubscribeEmpty();
    emptied.admission.disposeInternalV1();
    expect(emptied.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(emptied.harness);
    const emptySuccessorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: emptied.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const afterEmptyReset = emptySuccessorAdmission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(
        emptySuccessorAdmission,
        "skip",
        afterEmptyReset,
        "after-empty-reset",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });
    emptySuccessorAdmission.disposeInternalV1();
    emptied.controller.disposeInternalV1();

    let preflightCalls = 0;
    const rejected = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return preflightCalls === 1 ? capturedCandidatePreflightResultV1() : Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          });
        },
      }),
    });
    expect(rejected.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    settleCurrentNarrativeReadyV1(rejected);
    const rejectedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: rejected.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const rejectedAttempt = rejectedAdmission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        rejectedAdmission,
        "auto",
        rejectedAttempt,
        "rejected-retains",
      ).consumerResult,
    ).toMatchObject({ kind: "toggled", mode: "auto" });
    expect(rejected.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)))
      .toMatchObject({ kind: "rejected", code: "narrative.renderer_missing" });
    expect(rejected.bridge.readPlaybackModeInternalV1()).toBe("auto");
    rejectedAdmission.disposeInternalV1();
  });

  it("resets both active modes before every remaining non-Say boundary notification", () => {
    for (
      const [kind, mode] of [
        ["pause", "auto"],
        ["custom", "skip"],
        ["presentation_barrier", "auto"],
      ] as const
    ) {
      const fixture = physicalSayHarnessV1();
      const attempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1(mode);
      expect(
        routePlaybackModeToggleV1(
          fixture.admission,
          mode,
          attempt,
          `reset-${mode}-before-${kind}`,
        ).consumerResult,
      ).toEqual({ kind: "toggled", mode, completion: null });
      const observedModes: NarrativeStablePlaybackModeInternalV1[] = [];
      const unsubscribe = fixture.harness.kernel.subscribeStateInternalV1(() => {
        observedModes.push(fixture.harness.bridge.readPlaybackModeInternalV1());
      });
      expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1(kind, 2)))
        .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
      expect(observedModes.length).toBeGreaterThan(0);
      expect(observedModes.every((observed) => observed === "normal")).toBe(true);
      expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
      unsubscribe();
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("does not clobber a listener-installed Say successor after the outer reset commits", () => {
    const fixture = physicalSayHarnessV1();
    const enableAuto = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        enableAuto,
        "listener-successor-enable-auto",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });

    let handledOuterNotification = false;
    const successorAdmission: {
      current: NarrativeStablePhysicalActionAdmissionInternalV1 | null;
    } = { current: null };
    let nestedResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    const unsubscribe = fixture.harness.kernel.subscribeStateInternalV1(() => {
      if (handledOuterNotification) return;
      handledOuterNotification = true;
      expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
      fixture.admission.disposeInternalV1();
      expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 3)))
        .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
      settleCurrentNarrativeReadyV1(fixture.harness);
      const installedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: createInputRouterV1(),
        isGestureCurrent: () => true,
      });
      successorAdmission.current = installedAdmission;
      const skipAttempt = installedAdmission.issuePlaybackModeToggleAttemptInternalV1("skip");
      nestedResult = routePlaybackModeToggleV1(
        installedAdmission,
        "skip",
        skipAttempt,
        "listener-successor-toggle",
      ).consumerResult;
    });

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(nestedResult).toEqual({ kind: "toggled", mode: "skip", completion: null });
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("skip");
    unsubscribe();
    successorAdmission.current?.disposeInternalV1();
    fixture.controller.disposeInternalV1();
  });

  it("rolls provisional mode reset back by exact identity on non-applied and throwing apply", () => {
    for (
      const behavior of [
        "stale",
        "faulted",
        "throw_restore",
        "throw_after_successor",
      ] as const
    ) {
      const fixture = physicalSayHarnessV1();
      const enableAuto = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
      expect(
        routePlaybackModeToggleV1(
          fixture.admission,
          "auto",
          enableAuto,
          `rollback-enable-auto-${behavior}`,
        ).consumerResult,
      ).toEqual({ kind: "toggled", mode: "auto", completion: null });
      const predecessorAttempt = fixture.admission
        .issuePlaybackModeToggleAttemptInternalV1("skip");
      if (predecessorAttempt === null) throw new Error("expected predecessor mode attempt");

      const applyStableAdmissionProposal =
        fixture.harness.kernel.applyStableAdmissionProposalInternalV1;
      const originalReflectApply = Reflect.apply;
      const reflectApplyDescriptor = Object.getOwnPropertyDescriptor(Reflect, "apply");
      if (reflectApplyDescriptor === undefined) {
        throw new Error("expected Reflect.apply descriptor");
      }
      const injectedFailure = new Error("injected stable apply failure");
      const staleResult = Object.freeze({
        kind: "stale" as const,
        code: "surface.stable_reconcile_precondition_stale" as const,
        delta: zeroDeltaV1,
      });
      const faultedResult = Object.freeze({
        kind: "faulted" as const,
        code: "surface.stable_reconcile_faulted" as const,
        delta: zeroDeltaV1,
      });
      let intercepted = false;
      function hookedReflectApply<
        TThis,
        TArguments extends readonly unknown[],
        TResult,
      >(
        target: (this: TThis, ...args: TArguments) => TResult,
        thisArgument: TThis,
        argumentsList: TArguments,
      ): TResult {
        if (
          (target as unknown) === applyStableAdmissionProposal &&
          (thisArgument as unknown) === fixture.harness.kernel
        ) {
          intercepted = true;
          if (behavior === "throw_after_successor") {
            const successorAttempt = fixture.admission
              .issuePlaybackModeToggleAttemptInternalV1("skip");
            expect(successorAttempt).not.toBeNull();
            expect(
              routePlaybackModeToggleV1(
                fixture.admission,
                "skip",
                successorAttempt,
                "rollback-successor",
              ).consumerResult,
            ).toEqual({ kind: "toggled", mode: "skip", completion: null });
          }
          if (behavior === "throw_restore" || behavior === "throw_after_successor") {
            throw injectedFailure;
          }
          return (behavior === "faulted" ? faultedResult : staleResult) as TResult;
        }
        return originalReflectApply(target, thisArgument, argumentsList);
      }
      Object.defineProperty(Reflect, "apply", {
        ...reflectApplyDescriptor,
        value: hookedReflectApply,
      });

      try {
        if (behavior === "stale" || behavior === "faulted") {
          expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)))
            .toEqual(behavior === "stale" ? staleResult : faultedResult);
        } else {
          expect(() => fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)))
            .toThrow(injectedFailure);
        }
      } finally {
        Object.defineProperty(Reflect, "apply", reflectApplyDescriptor);
      }

      expect(intercepted).toBe(true);
      if (behavior !== "throw_after_successor") {
        expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
        expect(
          routePlaybackModeToggleV1(
            fixture.admission,
            "skip",
            predecessorAttempt,
            "rollback-predecessor-restored",
          ).consumerResult,
        ).toEqual({ kind: "toggled", mode: "skip", completion: null });
      } else {
        expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("skip");
        expect(
          routePlaybackModeToggleV1(
            fixture.admission,
            "skip",
            predecessorAttempt,
            "rollback-predecessor-stale",
          ).consumerResult,
        ).toEqual({ kind: "stale", completion: null });
      }
      fixture.controller.disposeInternalV1();
      fixture.admission.disposeInternalV1();
    }
  });

  it("retains mode across Say replacement and blocking suspension while retiring old attempts", () => {
    const replacement = physicalSayHarnessV1();
    const enableAuto = replacement.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        replacement.admission,
        "auto",
        enableAuto,
        "replacement-enable-auto",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });
    const oldReplacementAttempt = replacement.admission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(oldReplacementAttempt).not.toBeNull();
    expect(replacement.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(replacement.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    settleCurrentNarrativeReadyV1(replacement.harness);
    replacement.admission.disposeInternalV1();
    const replacementAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: replacement.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    expect(
      routePlaybackModeToggleV1(
        replacementAdmission,
        "skip",
        oldReplacementAttempt,
        "replacement-old-attempt",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    const replacementFresh = replacementAdmission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(
        replacementAdmission,
        "skip",
        replacementFresh,
        "replacement-fresh-attempt",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });
    replacementAdmission.disposeInternalV1();
    replacement.controller.disposeInternalV1();

    const suspended = nonBlockingNarrativeHarnessV1(
      defaultSemanticDispatchPortV1,
      90,
      "blocking",
    );
    expect(suspended.harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(suspended.harness);
    const suspendedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: suspended.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const suspendedAuto = suspendedAdmission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        suspendedAdmission,
        "auto",
        suspendedAuto,
        "suspension-enable-auto",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });
    const oldSuspendedAttempt = suspendedAdmission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(oldSuspendedAttempt).not.toBeNull();
    const blocker = openNonBlockingSurfaceV1(
      suspended.harness,
      suspended.nonBlockingDefinition,
      "suspended",
      "candidate",
      () => {
        expect(suspended.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
        expect(
          suspendedAdmission.issuePlaybackModeToggleAttemptInternalV1("skip"),
        ).toBeNull();
      },
      "suspended",
    );
    expect(suspended.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    const beforeClose = suspended.harness.kernel.getTransientSnapshotInternalV1();
    expect(suspended.harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: beforeClose.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied", code: "surface.closed" });
    expect(suspended.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    suspendedAdmission.disposeInternalV1();
    const resumedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: suspended.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    expect(
      routePlaybackModeToggleV1(
        resumedAdmission,
        "skip",
        oldSuspendedAttempt,
        "suspension-old-attempt",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    const afterSuspension = resumedAdmission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(
        resumedAdmission,
        "skip",
        afterSuspension,
        "suspension-fresh-attempt",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });
    resumedAdmission.disposeInternalV1();
  });

  it("retains mode through readiness failure and retry while rebinding the source frame", () => {
    const fixture = physicalSayHarnessV1();
    const enableSkip = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "skip",
        enableSkip,
        "retry-enable-skip",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });
    const oldAttempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(oldAttempt).not.toBeNull();

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const preparing = fixture.harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
    if (preparing?.binding.kind !== "preparing") {
      throw new Error("expected replacement Say preparation");
    }
    expect(fixture.harness.kernel.settleStableReadinessFailedInternalV1({
      readinessEvidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        surfaceInstanceId: preparing.binding.attempt.identity.surfaceInstanceId,
      }),
      publisherLease: preparing.desiredTarget.publisherLease,
      sourceRevision: preparing.desiredTarget.sourceRevision,
    })).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("skip");
    expect(fixture.harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(fixture.harness);
    fixture.admission.disposeInternalV1();
    const retriedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    expect(
      routePlaybackModeToggleV1(
        retriedAdmission,
        "auto",
        oldAttempt,
        "retry-old-source-attempt",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    const freshAttempt = retriedAdmission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        retriedAdmission,
        "auto",
        freshAttempt,
        "retry-fresh-source-attempt",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });
    retriedAdmission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
  });

  it("retains mode across physical admission and Say controller recreation", () => {
    const fixture = physicalSayHarnessV1();
    const enableAuto = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        enableAuto,
        "recreate-enable-auto",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });

    fixture.admission.disposeInternalV1();
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    fixture.controller.disposeInternalV1();
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");

    const successorController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "incomplete" as const,
        revealAllInternalV1: vi.fn(),
      }),
    });
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    const disableAuto = successorAdmission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        successorAdmission,
        "auto",
        disableAuto,
        "recreate-disable-auto",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "normal", completion: null });

    successorController.disposeInternalV1();
    successorAdmission.disposeInternalV1();
  });

  it("keeps 10k toggle attempts bounded and never revives a scalar-ABA predecessor", () => {
    const fixture = physicalSayHarnessV1();
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const predecessor = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(predecessor).not.toBeNull();
    let autoResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    let normalResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;

    for (let index = 0; index < 10_000; index += 1) {
      const attempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
      if (attempt === null) throw new Error("expected bounded mode attempt");
      const result = routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        attempt,
        `bounded-${String(index)}`,
      ).consumerResult;
      const expectedMode = index % 2 === 0 ? "auto" : "normal";
      expect(result).toEqual({ kind: "toggled", mode: expectedMode, completion: null });
      if (expectedMode === "auto") {
        autoResult ??= result;
        expect(result).toBe(autoResult);
      } else {
        normalResult ??= result;
        expect(result).toBe(normalResult);
      }
    }

    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        predecessor,
        "bounded-aba-predecessor",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("guards callback reentry while allowing a toggle during semantic completion", async () => {
    let callbackFixture!: ReturnType<typeof physicalSayHarnessV1>;
    let nestedResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    let presigned: NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null = null;
    let envelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    const capturePhase = vi.fn(() => {
      expect(
        callbackFixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto"),
      ).toBeNull();
      nestedResult = callbackFixture.admission.routeInternalV1(envelope, presigned)
        .consumerResult;
      return "incomplete" as const;
    });
    callbackFixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: vi.fn(),
      }),
    });
    presigned = callbackFixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(presigned).not.toBeNull();
    envelope = callbackFixture.admission.createEnvelopeInternalV1({
      actionId: narrativeToggleAutoActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.playback-mode-callback-guard",
      ),
    });
    const automaticAttempt = callbackFixture.controller.issueContentAutoAttemptInternalV1();
    expect(automaticAttempt).not.toBeNull();
    expect(callbackFixture.controller.dispatchContentAutoInternalV1(automaticAttempt)).toEqual({
      kind: "not_ready",
      completion: null,
    });
    expect(nestedResult).toEqual({ kind: "stale", completion: null });
    expect(callbackFixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(
      routePlaybackModeToggleV1(
        callbackFixture.admission,
        "auto",
        presigned,
        "callback-presigned-remains-spent",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    const fresh = callbackFixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        callbackFixture.admission,
        "auto",
        fresh,
        "callback-released",
      ).consumerResult,
    ).toMatchObject({ kind: "toggled", mode: "auto" });
    callbackFixture.controller.disposeInternalV1();
    callbackFixture.admission.disposeInternalV1();

    let resolveSemantic!: (value: unknown) => void;
    const pendingSemantic = new Promise<unknown>((resolve) => {
      resolveSemantic = resolve;
    });
    const pendingFixture = physicalSayHarnessV1({
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: () => pendingSemantic,
      }),
    });
    const sayAttempt = pendingFixture.admission.issueSayActivationAttemptInternalV1(
      pendingFixture.controller,
    );
    const dispatched = pendingFixture.admission.routeInternalV1(
      pendingFixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.playback-mode-semantic-pending",
        ),
      }),
      sayAttempt,
    );
    expect(dispatched.consumerResult).toMatchObject({ kind: "dispatched" });
    const duringPending = pendingFixture.admission.issuePlaybackModeToggleAttemptInternalV1(
      "skip",
    );
    expect(duringPending).not.toBeNull();
    expect(
      routePlaybackModeToggleV1(
        pendingFixture.admission,
        "skip",
        duringPending,
        "semantic-pending-allowed",
      ).consumerResult,
    ).toMatchObject({ kind: "toggled", mode: "skip" });
    resolveSemantic("drained");
    if (dispatched.consumerResult?.kind !== "dispatched") {
      throw new Error("expected pending semantic dispatch");
    }
    await expect(dispatched.consumerResult.completion).resolves.toBe("drained");
    pendingFixture.controller.disposeInternalV1();
    pendingFixture.admission.disposeInternalV1();
  });

  it("keeps mode attempts opaque and unspent across mapping and generic route fences", () => {
    const fixture = physicalSayHarnessV1();
    const admission = fixture.admission;
    const borrowedIssue = admission.issuePlaybackModeToggleAttemptInternalV1;
    expect(Reflect.apply(borrowedIssue, Object.freeze({}), ["auto"])).toBeNull();
    expect(Reflect.apply(borrowedIssue, admission, ["normal"])).toBeNull();

    const autoAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    if (autoAttempt === null) throw new Error("expected opaque Auto attempt");
    expect(Object.isFrozen(autoAttempt)).toBe(true);
    expect(Reflect.ownKeys(autoAttempt)).toEqual([]);
    for (
      const [forged, suffix] of [
        [Object.freeze({ ...autoAttempt }), "clone"],
        [Object.freeze({}), "spoof"],
      ] as const
    ) {
      expect(
        routePlaybackModeToggleV1(admission, "auto", forged, `forged-${suffix}`)
          .consumerResult,
      ).toEqual({ kind: "stale", completion: null });
    }
    expect(
      routePlaybackModeToggleV1(admission, "skip", autoAttempt, "auto-as-skip")
        .consumerResult,
    ).toEqual({ kind: "unmapped", completion: null });
    expect(
      routePlaybackModeToggleV1(admission, "auto", autoAttempt, "auto-after-skip-probe")
        .consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });

    const skipAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    if (skipAttempt === null) throw new Error("expected opaque Skip attempt");
    expect(
      routePlaybackModeToggleV1(admission, "auto", skipAttempt, "skip-as-auto")
        .consumerResult,
    ).toEqual({ kind: "unmapped", completion: null });
    expect(
      routePlaybackModeToggleV1(admission, "skip", skipAttempt, "skip-after-auto-probe")
        .consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });

    const crossKindAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    if (crossKindAttempt === null) throw new Error("expected cross-kind mode attempt");
    for (
      const [actionId, suffix] of [
        [narrativeChooseActionIdV1, "choice"],
        [narrativeConfirmActionIdV1, "say"],
        [narrativeReplayVoiceActionIdV1, "voice"],
      ] as const
    ) {
      const result = admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId,
          gestureId: parseManagedSurfaceGestureIdV1(
            `gesture.narrative.playback-mode-cross-kind-${suffix}`,
          ),
        }),
        crossKindAttempt,
      );
      expect(result).toMatchObject({
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
        consumerResult: { kind: "unmapped", completion: null },
      });
    }
    expect(
      routePlaybackModeToggleV1(
        admission,
        "auto",
        crossKindAttempt,
        "cross-kind-recovered",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });

    const unpublishedAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    if (unpublishedAttempt === null) throw new Error("expected unpublished-probe attempt");
    const unpublished = admission.routeInternalV1(
      admission.createEnvelopeInternalV1({
        actionId: narrativeUnknownActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.playback-mode-unpublished",
        ),
      }),
      unpublishedAttempt,
    );
    expect(unpublished).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "rejected", code: "surface.action_unpublished" },
      },
      consumerResult: null,
    });
    expect(
      routePlaybackModeToggleV1(
        admission,
        "auto",
        unpublishedAttempt,
        "unpublished-recovered",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "normal", completion: null });

    let gestureCurrent = false;
    const gestureFixture = physicalSayHarnessV1({
      isGestureCurrent: () => gestureCurrent,
    });
    const gestureAttempt = gestureFixture.admission
      .issuePlaybackModeToggleAttemptInternalV1("skip");
    if (gestureAttempt === null) throw new Error("expected gesture-fenced attempt");
    const gestureEnvelope = gestureFixture.admission.createEnvelopeInternalV1({
      actionId: narrativeToggleSkipActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.playback-mode-gesture-fence",
      ),
    });
    expect(
      gestureFixture.admission.routeInternalV1(gestureEnvelope, gestureAttempt),
    ).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    gestureCurrent = true;
    expect(
      gestureFixture.admission.routeInternalV1(gestureEnvelope, gestureAttempt)
        .consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });

    const foreign = physicalSayHarnessV1();
    const foreignAttempt = foreign.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(foreignAttempt).not.toBeNull();
    expect(
      routePlaybackModeToggleV1(
        admission,
        "auto",
        foreignAttempt,
        "foreign-on-local-admission",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(
      routePlaybackModeToggleV1(
        foreign.admission,
        "auto",
        foreignAttempt,
        "foreign-on-own-admission",
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });

    foreign.controller.disposeInternalV1();
    foreign.admission.disposeInternalV1();
    gestureFixture.controller.disposeInternalV1();
    gestureFixture.admission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("does not spend authentic non-mode capabilities when they probe a mode action", () => {
    const probeModeAction = (
      admission: NarrativeStablePhysicalActionAdmissionInternalV1,
      attempt: unknown,
      suffix: string,
    ): void => {
      expect(
        routePlaybackModeToggleV1(admission, "auto", attempt, `other-token-${suffix}`)
          .consumerResult,
      ).toEqual({ kind: "stale", completion: null });
    };
    const routeCorrect = (
      admission: NarrativeStablePhysicalActionAdmissionInternalV1,
      actionId: ReturnType<typeof parseManagedSurfaceActionIdV1>,
      attempt: unknown,
      suffix: string,
    ) =>
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId,
          gestureId: parseManagedSurfaceGestureIdV1(
            `gesture.narrative.playback-mode-other-token-correct-${suffix}`,
          ),
        }),
        attempt,
      ).consumerResult;

    const choice = physicalChoiceHarnessV1();
    const choiceAttempt = choice.admission.issueChoiceAttemptInternalV1("choice.test.first");
    expect(choiceAttempt).not.toBeNull();
    probeModeAction(choice.admission, choiceAttempt, "choice");
    expect(routeCorrect(choice.admission, narrativeChooseActionIdV1, choiceAttempt, "choice"))
      .toMatchObject({ kind: "dispatched" });
    choice.admission.disposeInternalV1();

    const pause = physicalPauseHarnessV1();
    const pauseAttempt = pause.admission.issuePauseResumeAttemptInternalV1();
    expect(pauseAttempt).not.toBeNull();
    probeModeAction(pause.admission, pauseAttempt, "pause");
    expect(routeCorrect(pause.admission, narrativeResumeActionIdV1, pauseAttempt, "pause"))
      .toMatchObject({ kind: "dispatched" });
    pause.admission.disposeInternalV1();

    const custom = physicalCustomHarnessV1();
    const customAttempt = custom.admission.issueCustomAttemptInternalV1({ value: 1 });
    expect(customAttempt).not.toBeNull();
    probeModeAction(custom.admission, customAttempt, "custom");
    expect(routeCorrect(custom.admission, narrativeCustomActionIdV1, customAttempt, "custom"))
      .toMatchObject({ kind: "dispatched" });
    custom.admission.disposeInternalV1();

    const say = physicalSayHarnessV1({
      voiceReplayPort: Object.freeze({
        replayCurrentVoiceInternalV1: () => true,
      }),
    });
    const sayAttempt = say.admission.issueSayActivationAttemptInternalV1(say.controller);
    expect(sayAttempt).not.toBeNull();
    probeModeAction(say.admission, sayAttempt, "say");
    expect(routeCorrect(say.admission, narrativeConfirmActionIdV1, sayAttempt, "say"))
      .toEqual({ kind: "revealed", completion: null });
    const voiceAttempt = say.admission.issueVoiceReplayAttemptInternalV1();
    expect(voiceAttempt).not.toBeNull();
    probeModeAction(say.admission, voiceAttempt, "voice");
    expect(routeCorrect(say.admission, narrativeReplayVoiceActionIdV1, voiceAttempt, "voice"))
      .toEqual({ kind: "handled", completion: null });
    say.controller.disposeInternalV1();
    say.admission.disposeInternalV1();
  });

  it("returns the canonical faulted mode result after a spent private capture fault", () => {
    const reflectApplyDescriptor = Object.getOwnPropertyDescriptor(Reflect, "apply");
    if (reflectApplyDescriptor === undefined) {
      throw new Error("expected Reflect.apply descriptor");
    }
    const originalReflectApply = Reflect.apply;
    let gestureReads = 0;
    let currentnessCallable: unknown = null;
    let hookInstalled = false;
    function hookedReflectApply<
      TThis,
      TArguments extends readonly unknown[],
      TResult,
    >(
      target: (this: TThis, ...args: TArguments) => TResult,
      thisArgument: TThis,
      argumentsList: TArguments,
    ): TResult {
      if ((target as unknown) === currentnessCallable) {
        throw new Error("injected direct-target capture fault");
      }
      return originalReflectApply(target, thisArgument, argumentsList);
    }

    const fixture = physicalSayHarnessV1({
      isGestureCurrent: () => {
        gestureReads += 1;
        if (gestureReads === 2) {
          Object.defineProperty(Reflect, "apply", {
            ...reflectApplyDescriptor,
            value: hookedReflectApply,
          });
          hookInstalled = true;
        }
        return true;
      },
    });
    currentnessCallable = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      fixture.harness.kernel,
    ).isCurrentDirectTargetInternalV1;
    const attempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(attempt).not.toBeNull();

    let result: ReturnType<typeof routePlaybackModeToggleV1>;
    try {
      result = routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        attempt,
        "faulted-private-capture",
      );
    } finally {
      Object.defineProperty(Reflect, "apply", reflectApplyDescriptor);
    }
    expect(hookInstalled).toBe(true);
    expect(result.consumerResult).toEqual({ kind: "faulted", completion: null });
    expect(Object.isFrozen(result.consumerResult)).toBe(true);
    expect(Reflect.ownKeys(result.consumerResult as object)).toEqual([
      "kind",
      "completion",
    ]);
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        attempt,
        "faulted-attempt-remains-spent",
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("first-wins one mode state and fails closed with canonical results after terminal fences", () => {
    const fixture = physicalSayHarnessV1();
    const autoAttempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    const skipCompetitor = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(autoAttempt).not.toBeNull();
    expect(skipCompetitor).not.toBeNull();

    const autoWinner = routePlaybackModeToggleV1(
      fixture.admission,
      "auto",
      autoAttempt,
      "same-state-auto-winner",
    ).consumerResult;
    expect(autoWinner).toEqual({ kind: "toggled", mode: "auto", completion: null });
    expect(Object.isFrozen(autoWinner)).toBe(true);
    expect(Reflect.ownKeys(autoWinner as object)).toEqual(["kind", "mode", "completion"]);
    const staleCompetitor = routePlaybackModeToggleV1(
      fixture.admission,
      "skip",
      skipCompetitor,
      "same-state-skip-loser",
    ).consumerResult;
    expect(staleCompetitor).toEqual({ kind: "stale", completion: null });
    expect(Object.isFrozen(staleCompetitor)).toBe(true);
    expect(Reflect.ownKeys(staleCompetitor as object)).toEqual(["kind", "completion"]);
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        autoAttempt,
        "same-state-winner-repeat",
      ).consumerResult,
    ).toBe(staleCompetitor);

    const toSkip = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(
      routePlaybackModeToggleV1(fixture.admission, "skip", toSkip, "canonical-to-skip")
        .consumerResult,
    ).toEqual({ kind: "toggled", mode: "skip", completion: null });
    const backToAuto = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(
      routePlaybackModeToggleV1(
        fixture.admission,
        "auto",
        backToAuto,
        "canonical-back-to-auto",
      ).consumerResult,
    ).toBe(autoWinner);
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();

    for (const terminal of ["bridge", "coordinator"] as const) {
      const terminalFixture = physicalSayHarnessV1();
      const enabled = terminalFixture.admission.issuePlaybackModeToggleAttemptInternalV1(
        "auto",
      );
      expect(
        routePlaybackModeToggleV1(
          terminalFixture.admission,
          "auto",
          enabled,
          `terminal-${terminal}-enable`,
        ).consumerResult,
      ).toEqual({ kind: "toggled", mode: "auto", completion: null });
      const presigned = terminalFixture.admission.issuePlaybackModeToggleAttemptInternalV1(
        "skip",
      );
      expect(presigned).not.toBeNull();
      const envelope = terminalFixture.admission.createEnvelopeInternalV1({
        actionId: narrativeToggleSkipActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          `gesture.narrative.playback-mode-terminal-${terminal}`,
        ),
      });
      const observedModes: NarrativeStablePlaybackModeInternalV1[] = [];
      const unsubscribe = terminalFixture.harness.kernel.subscribeStateInternalV1(() => {
        observedModes.push(
          terminalFixture.harness.bridge.readPlaybackModeInternalV1(),
        );
      });
      if (terminal === "bridge") {
        expect(terminalFixture.harness.bridge.disposeInternalV1()).toMatchObject({
          kind: "applied",
          code: "surface.stable_publisher_disposed",
        });
      } else {
        expect(terminalFixture.harness.kernel.transitionTransientInternalV1({
          kind: "dispose_coordinator",
        })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
      }
      expect(observedModes.length).toBeGreaterThan(0);
      expect(observedModes.every((mode) => mode === "normal")).toBe(true);
      expect(terminalFixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
      expect(
        terminalFixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto"),
      ).toBeNull();
      const state = terminalFixture.harness.kernel.getStateInternalV1();
      const notifications = terminalFixture.harness.stateNotificationCount();
      const terminalRoute = terminalFixture.admission.routeInternalV1(envelope, presigned);
      expect(terminalRoute.consumerResult).toBeNull();
      expect(terminalFixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
      expect(terminalFixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(terminalFixture.harness.stateNotificationCount()).toBe(notifications);
      unsubscribe();
      terminalFixture.controller.disposeInternalV1();
      terminalFixture.admission.disposeInternalV1();
    }
  });

  it("spends then returns stale when bridge terminal lands after the generic route gate", () => {
    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    let gestureReads = 0;
    fixture = physicalSayHarnessV1({
      isGestureCurrent: () => {
        gestureReads += 1;
        if (gestureReads === 2) {
          expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({
            kind: "applied",
            code: "surface.stable_publisher_disposed",
          });
        }
        return true;
      },
    });
    const attempt = fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(attempt).not.toBeNull();
    const result = routePlaybackModeToggleV1(
      fixture.admission,
      "auto",
      attempt,
      "terminal-after-generic-gate",
    );
    expect(gestureReads).toBe(2);
    expect(result).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult: { kind: "stale", completion: null },
    });
    expect(fixture.harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("claims one exact current Barrier controller without burning construction failure", () => {
    expectTypeOf<NarrativeStableBarrierAcknowledgmentControllerInternalV1>().toMatchTypeOf<{
      retargetCurrentBarrierStageInternalV1(
        retarget: StageRetargetInputV1,
      ): NarrativeStableBarrierStageRetargetResultInternalV1;
      retargetPresentationStageInternalV1(
        retarget: StageRetargetInputV1,
      ): StagePresentationGenerationRetargetResultInternalV1;
      synchronizeRecoveryGenerationInternalV1(
        activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
      ): NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1;
      issueSettleRecoveryAttemptInternalV1():
        | NarrativeStableBarrierRecoveryAttemptInternalV1
        | null;
      dispatchSettleRecoveryInternalV1(
        attempt: unknown,
      ): NarrativeStableBarrierRecoveryDispatchResultInternalV1;
      readReplayRecoveryUnsupportedInternalV1():
        | Readonly<{
          readonly kind: "unsupported";
          readonly code: "narrative.barrier_replay_unsupported";
          readonly completion: null;
        }>
        | null;
      flushRetainedTerminalInternalV1():
        | NarrativeStableBarrierTerminalDispatchResultInternalV1
        | null;
      disposeInternalV1(): void;
    }>();

    const noBarrier = harnessV1();
    const noBarrierStage = createBarrierStageHarnessV1({});
    const noBarrierController = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: noBarrier.bridge,
      stageReconciler: noBarrierStage.reconciler,
    });
    expect(
      noBarrierController.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(noBarrierStage.nextTarget, 2),
      ),
    ).toEqual({ kind: "stale", completion: null });
    expect(noBarrierController.flushRetainedTerminalInternalV1()).toBeNull();
    noBarrierController.disposeInternalV1();

    const nonBarrier = harnessV1();
    expect(nonBarrier.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    settleCurrentNarrativeReadyV1(nonBarrier);
    const nonBarrierStage = createBarrierStageHarnessV1({});
    const nonBarrierController = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: nonBarrier.bridge,
      stageReconciler: nonBarrierStage.reconciler,
    });
    expect(nonBarrierController.flushRetainedTerminalInternalV1()).toBeNull();
    nonBarrierController.disposeInternalV1();

    const harness = harnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("presentation_barrier")))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(harness);
    const foreignStage = createBarrierStageHarnessV1({ claimant: Object.freeze({}) });
    expect(foreignStage.authority).not.toBeNull();
    expect(() =>
      createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
        bridge: harness.bridge,
        stageReconciler: foreignStage.reconciler,
      })
    ).toThrow(TypeError);

    const stage = createBarrierStageHarnessV1({});
    const input = Object.freeze({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    }) satisfies CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1;
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1(input);
    expect(Object.isFrozen(controller)).toBe(true);
    expect(() => createNarrativeStableBarrierAcknowledgmentControllerInternalV1(input)).toThrow(
      TypeError,
    );
    controller.disposeInternalV1();

    const successor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1(input);
    expect(successor).not.toBe(controller);
    expect(controller.flushRetainedTerminalInternalV1()).toBeNull();
    successor.disposeInternalV1();
  });

  it("stores an instant Barrier terminal until explicit flush and seals its Promise", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    let capturedRequest: unknown = null;
    const dispatchResolution = vi.fn((request: unknown) => {
      capturedRequest = request;
      return semanticCompletion;
    });
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });

    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const armed = fixture.controller.retargetCurrentBarrierStageInternalV1(
      barrierRetargetInputV1(fixture.stage.nextTarget, 2),
    );
    expect(armed).toEqual({ kind: "armed", completion: null });
    expectBarrierResultFrozenV1(armed);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);

    const dispatched = fixture.controller.flushRetainedTerminalInternalV1();
    expect(dispatched).toMatchObject({ kind: "dispatched" });
    if (dispatched?.kind !== "dispatched") throw new Error("expected Barrier dispatch");
    expectBarrierResultFrozenV1(dispatched);
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: {
        kind: "barrier_completed",
        transitionId: "transition.test.fade",
      },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution))
      .toBe(true);
    expect(fixture.controller.flushRetainedTerminalInternalV1()).toBe(dispatched);
    expect(dispatchResolution).toHaveBeenCalledOnce();

    settleSemantic("barrier-drained");
    await expect(dispatched.completion).resolves.toBe("barrier-drained");
    const retried = fixture.controller.flushRetainedTerminalInternalV1();
    expect(retried).toMatchObject({ kind: "dispatched" });
    expect(retried).not.toBe(dispatched);
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    fixture.controller.disposeInternalV1();
  });

  it("retains eligible terminals while unavailable and seals cancelled runs at zero dispatch", () => {
    const preparingDispatch = vi.fn(() => new Promise<unknown>(() => {}));
    const preparing = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: preparingDispatch,
      }),
      settleReady: false,
    });
    expect(
      preparing.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(preparing.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const retained = preparing.controller.flushRetainedTerminalInternalV1();
    expect(retained).toEqual({ kind: "retained", completion: null });
    expectBarrierResultFrozenV1(retained!);
    expect(preparingDispatch).not.toHaveBeenCalled();
    settleCurrentNarrativeReadyV1(preparing.harness);
    expect(preparing.controller.flushRetainedTerminalInternalV1()).toMatchObject({
      kind: "dispatched",
    });
    expect(preparingDispatch).toHaveBeenCalledOnce();
    preparing.controller.disposeInternalV1();

    const cancelledDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const cancelled = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ interruption: "cancel_to_target" }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: cancelledDispatch,
      }),
    });
    expect(
      cancelled.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(cancelled.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(
      cancelled.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(cancelled.stage.thirdTarget, 3),
      ),
    ).toEqual({
      kind: "faulted",
      code: "stage.acknowledged_run_unmatched",
      completion: null,
    });
    expect(cancelled.controller.flushRetainedTerminalInternalV1()).toBeNull();
    expect(
      cancelled.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(
          barrierStageTargetV1(
            "content.test.barrier-c",
            "content.test.barrier-d",
          ),
          4,
        ),
      ),
    ).toEqual({ kind: "stale", completion: null });
    const cancelledResult = cancelled.controller.flushRetainedTerminalInternalV1();
    expect(cancelledResult).toEqual({ kind: "cancelled", completion: null });
    expectBarrierResultFrozenV1(cancelledResult!);
    expect(cancelledDispatch).not.toHaveBeenCalled();
    cancelled.controller.disposeInternalV1();
  });

  it("keeps the first cancelled terminal and rejects the successor acknowledged edge", () => {
    const animated = barrierTransitionDefinitionV1({ interruption: "cancel_to_target" });
    const instant = barrierTransitionDefinitionV1({
      kind: "cut",
      durationMs: 0,
      interruption: "settle_and_retarget",
    });
    let resolutionCount = 0;
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = narrativeBarrierHarnessV1({
      transition: animated,
      resolveTransition: () => {
        resolutionCount += 1;
        return resolutionCount === 1 ? animated : instant;
      },
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(
          barrierStageTargetV1(
            "content.test.barrier-c",
            "content.test.barrier-d",
          ),
          3,
        ),
      ),
    ).toEqual({ kind: "stale", completion: null });

    expect(fixture.stage.reconciler.frame().settled).toBe(true);
    expect(fixture.stage.reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.barrier-b",
    );

    const result = fixture.controller.flushRetainedTerminalInternalV1();
    expect(result).toEqual({ kind: "cancelled", completion: null });
    expectBarrierResultFrozenV1(result!);
    expect(dispatchResolution).not.toHaveBeenCalled();
    fixture.controller.disposeInternalV1();
  });

  it("lets an eligible old terminal first-win and rejects the successor Stage proof", async () => {
    const animated = barrierTransitionDefinitionV1({ interruption: "settle_and_retarget" });
    const instant = barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 });
    const other = barrierTransitionDefinitionV1({
      transitionId: "transition.test.other",
      kind: "cut",
      durationMs: 0,
    });
    let firstResolution = true;
    const publicAcknowledgments = vi.fn();
    const dispatchResolution = vi.fn(() => Promise.resolve("old-terminal-drained"));
    const fixture = narrativeBarrierHarnessV1({
      transition: animated,
      resolveTransition: (change) => {
        if (firstResolution) {
          firstResolution = false;
          return animated;
        }
        return change.kind === "enter" ? instant : other;
      },
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      onAcknowledgment: publicAcknowledgments,
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(
          barrierStageTargetV1(
            "content.test.barrier-c",
            "content.test.barrier-d",
          ),
          3,
        ),
      ),
    ).toEqual({ kind: "stale", completion: null });

    expect(publicAcknowledgments).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "interrupted" }),
    );
    expect(fixture.stage.reconciler.frame().settled).toBe(true);
    expect(fixture.stage.reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.barrier-b",
    );
    expect(fixture.stage.clock.pendingTickCount()).toBe(0);
    const retained = fixture.controller.flushRetainedTerminalInternalV1();
    expect(retained).toMatchObject({ kind: "dispatched" });
    if (retained?.kind !== "dispatched") throw new Error("expected old terminal dispatch");
    await expect(retained.completion).resolves.toBe("old-terminal-drained");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    fixture.controller.disposeInternalV1();
  });

  it("keeps a disposed controller's semantic claim until its Promise drains", async () => {
    let settleFirst!: (value: unknown) => void;
    const firstCompletion = new Promise<unknown>((resolve) => {
      settleFirst = resolve;
    });
    let dispatchCount = 0;
    const dispatchResolution = vi.fn(() => {
      dispatchCount += 1;
      return dispatchCount === 1 ? firstCompletion : Promise.resolve("successor-drained");
    });
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const first = fixture.controller.flushRetainedTerminalInternalV1();
    if (first?.kind !== "dispatched") throw new Error("expected first Barrier dispatch");
    fixture.controller.disposeInternalV1();

    const successor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: fixture.harness.bridge,
      stageReconciler: fixture.stage.reconciler,
    });
    const blocked = successor.retargetCurrentBarrierStageInternalV1(
      barrierRetargetInputV1(fixture.stage.thirdTarget, 3),
    );
    expect(blocked).toEqual({ kind: "stale", completion: null });
    expect(
      successor.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.thirdTarget, 3),
      ),
    ).toBe(blocked);
    expect(successor.flushRetainedTerminalInternalV1()).toBeNull();
    expect(dispatchResolution).toHaveBeenCalledOnce();

    settleFirst("first-drained");
    await expect(first.completion).resolves.toBe("first-drained");
    expect(
      successor.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.thirdTarget, 3),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const retried = successor.flushRetainedTerminalInternalV1();
    if (retried?.kind !== "dispatched") throw new Error("expected successor Barrier dispatch");
    await expect(retried.completion).resolves.toBe("successor-drained");
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    successor.disposeInternalV1();
  });

  it("defers public Stage callback flushes until the terminal stack exits", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("drained"));
    const nestedResults: Array<
      NarrativeStableBarrierTerminalDispatchResultInternalV1 | null
    > = [];
    let controller: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null = null;
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      onAcknowledgment: () => {
        if (controller !== null) {
          nestedResults.push(controller.flushRetainedTerminalInternalV1());
        }
      },
    });
    controller = fixture.controller;
    const unsubscribe = fixture.stage.reconciler.subscribe(() => {
      if (controller !== null) {
        nestedResults.push(controller.flushRetainedTerminalInternalV1());
      }
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(nestedResults).toEqual([
      { kind: "retained", completion: null },
      { kind: "retained", completion: null },
    ]);
    expect(dispatchResolution).not.toHaveBeenCalled();

    expect(fixture.controller.flushRetainedTerminalInternalV1()).toMatchObject({
      kind: "dispatched",
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    unsubscribe();
    fixture.controller.disposeInternalV1();
  });

  it("releases an animated terminal gate exactly when the Stage callback stack exits", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("drained"));
    const nestedResults: Array<
      NarrativeStableBarrierTerminalDispatchResultInternalV1 | null
    > = [];
    let controller: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null = null;
    const fixture = narrativeBarrierHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      }),
      onAcknowledgment: () => {
        if (controller !== null) {
          nestedResults.push(controller.flushRetainedTerminalInternalV1());
        }
      },
    });
    controller = fixture.controller;
    const unsubscribe = fixture.stage.reconciler.subscribe(() => {
      if (controller !== null) {
        nestedResults.push(controller.flushRetainedTerminalInternalV1());
      }
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(dispatchResolution).not.toHaveBeenCalled();
    nestedResults.length = 0;

    fixture.stage.clock.advance(100);
    expect(nestedResults).toEqual([
      { kind: "retained", completion: null },
      { kind: "retained", completion: null },
    ]);
    expect(dispatchResolution).not.toHaveBeenCalled();

    expect(fixture.controller.flushRetainedTerminalInternalV1()).toMatchObject({
      kind: "dispatched",
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    unsubscribe();
    fixture.controller.disposeInternalV1();
  });

  it("retains eligible Barrier evidence across a real blocking suspension and resumes fresh", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("barrier-resumed"));
    const semanticDispatchPort = Object.freeze({
      dispatchResolutionInternalV1: dispatchResolution,
    });
    const { harness, nonBlockingDefinition: blockingDefinition } = nonBlockingNarrativeHarnessV1(
      semanticDispatchPort,
      90,
      "blocking",
    );
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("presentation_barrier")))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(harness);
    const stage = createBarrierStageHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
    });
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    expect(
      controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });

    const retainedDuringPreparation: Array<
      NarrativeStableBarrierTerminalDispatchResultInternalV1 | null
    > = [];
    const blocker = openNonBlockingSurfaceV1(
      harness,
      blockingDefinition,
      "suspended",
      "candidate",
      () => retainedDuringPreparation.push(controller.flushRetainedTerminalInternalV1()),
      "suspended",
    );
    expect(retainedDuringPreparation).toEqual([{ kind: "retained", completion: null }]);
    expect(controller.flushRetainedTerminalInternalV1()).toBe(
      retainedDuringPreparation[0],
    );
    expect(dispatchResolution).not.toHaveBeenCalled();

    const suspendedPublication = harness.kernel.getStateInternalV1().transientState.publication;
    expect(harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: suspendedPublication.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied" });
    const resumed = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
    expect(resumed?.binding.kind).toBe("ready_instance");
    if (resumed?.binding.kind !== "ready_instance") {
      throw new Error("expected resumed Narrative Barrier");
    }
    expect(resumed.binding.instance.phase).toBe("active");

    const dispatched = controller.flushRetainedTerminalInternalV1();
    expect(dispatched).toMatchObject({ kind: "dispatched" });
    if (dispatched?.kind !== "dispatched") throw new Error("expected resumed Barrier dispatch");
    await expect(dispatched.completion).resolves.toBe("barrier-resumed");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    controller.disposeInternalV1();
  });

  it("rebinds retained Barrier evidence to the fresh frame and semantic port after readiness retry", async () => {
    const oldDispatch = vi.fn(() => Promise.resolve("old-port-must-not-run"));
    const freshDispatch = vi.fn(() => Promise.resolve("fresh-port-drained"));
    const oldPort = Object.freeze({ dispatchResolutionInternalV1: oldDispatch });
    const freshPort = Object.freeze({ dispatchResolutionInternalV1: freshDispatch });
    let preflightCount = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCount += 1;
          return capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            semanticDispatchPort: preflightCount === 1 ? oldPort : freshPort,
          }));
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("presentation_barrier")))
      .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    const initialBaseline = narrativeBaselineV1(harness);
    if (initialBaseline.kind !== "accepted") throw new Error("expected Barrier baseline");
    const target = initialBaseline.targets[0]!;
    const initialFrame = harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    if (initialFrame === null) throw new Error("expected initial Barrier frame");
    const initialSemanticPort = initialFrame.candidateSnapshot.semanticDispatchPort;
    expect(Object.isFrozen(initialSemanticPort)).toBe(true);

    const stage = createBarrierStageHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
    });
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    expect(
      controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });

    const preparing = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
    if (preparing?.binding.kind !== "preparing") throw new Error("expected Barrier preparation");
    expect(harness.kernel.settleStableReadinessFailedInternalV1({
      readinessEvidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        surfaceInstanceId: preparing.binding.attempt.identity.surfaceInstanceId,
      }),
      publisherLease: preparing.desiredTarget.publisherLease,
      sourceRevision: preparing.desiredTarget.sourceRevision,
    })).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(controller.flushRetainedTerminalInternalV1()).toEqual({
      kind: "retained",
      completion: null,
    });
    expect(oldDispatch).not.toHaveBeenCalled();

    expect(harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(preflightCount).toBe(2);
    const retriedBaseline = narrativeBaselineV1(harness);
    if (retriedBaseline.kind !== "accepted") throw new Error("expected retried baseline");
    expect(retriedBaseline.targets[0]).toBe(target);
    expect(retriedBaseline.sourceRevision).toBe(2);
    const retriedFrame = harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    if (retriedFrame === null) throw new Error("expected retried Barrier frame");
    expect(retriedFrame).not.toBe(initialFrame);
    expect(retriedFrame.candidateSnapshot.semanticDispatchPort).not.toBe(
      initialSemanticPort,
    );
    settleCurrentNarrativeReadyV1(harness);

    const dispatched = controller.flushRetainedTerminalInternalV1();
    expect(dispatched).toMatchObject({ kind: "dispatched" });
    if (dispatched?.kind !== "dispatched") throw new Error("expected retried Barrier dispatch");
    await expect(dispatched.completion).resolves.toBe("fresh-port-drained");
    expect(oldDispatch).not.toHaveBeenCalled();
    expect(freshDispatch).toHaveBeenCalledExactlyOnceWith({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: {
        kind: "barrier_completed",
        transitionId: "transition.test.fade",
      },
    });
    controller.disposeInternalV1();
  });

  it("keeps a source-successor tombstone until the old semantic Promise drains", async () => {
    let settleOld!: (value: unknown) => void;
    let settleFresh!: (value: unknown) => void;
    const oldCompletion = new Promise<unknown>((resolve) => {
      settleOld = resolve;
    });
    const freshCompletion = new Promise<unknown>((resolve) => {
      settleFresh = resolve;
    });
    const oldDispatch = vi.fn(() => oldCompletion);
    const freshDispatch = vi.fn(() => freshCompletion);
    const oldPort = Object.freeze({ dispatchResolutionInternalV1: oldDispatch });
    const freshPort = Object.freeze({ dispatchResolutionInternalV1: freshDispatch });
    let preflightCount = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCount += 1;
          return capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            semanticDispatchPort: preflightCount === 1 ? oldPort : freshPort,
          }));
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("presentation_barrier")))
      .toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(harness);
    const stage = createBarrierStageHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
    });
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    expect(
      controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const oldResult = controller.flushRetainedTerminalInternalV1();
    if (oldResult?.kind !== "dispatched") throw new Error("expected old Barrier dispatch");

    expect(
      harness.bridge.reconcilePendingInternalV1(pendingV1("presentation_barrier", 2)),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(harness);
    expect(controller.flushRetainedTerminalInternalV1()).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(
      controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(stage.thirdTarget, 3),
      ),
    ).toEqual({ kind: "stale", completion: null });
    expect(freshDispatch).not.toHaveBeenCalled();

    settleOld("old-source-drained");
    await Promise.resolve();
    expect(
      controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(stage.thirdTarget, 3),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const freshResult = controller.flushRetainedTerminalInternalV1();
    if (freshResult?.kind !== "dispatched") throw new Error("expected fresh Barrier dispatch");
    await expect(oldResult.completion).resolves.toBe("old-source-drained");
    expect(controller.flushRetainedTerminalInternalV1()).toBe(freshResult);
    expect(oldDispatch).toHaveBeenCalledOnce();
    expect(freshDispatch).toHaveBeenCalledExactlyOnceWith({
      expectedOccurrenceId: occurrenceV1(2),
      resolution: {
        kind: "barrier_completed",
        transitionId: "transition.test.fade",
      },
    });

    settleFresh("fresh-source-drained");
    await expect(freshResult.completion).resolves.toBe("fresh-source-drained");
    controller.disposeInternalV1();
  });

  it("preserves the semantic Promise outcome when target drift makes cleanup currentness throw", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: () => semanticCompletion,
      }),
    });

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const dispatched = fixture.controller.flushRetainedTerminalInternalV1();
    if (dispatched?.kind !== "dispatched") throw new Error("expected Barrier dispatch");
    expect(
      fixture.harness.bridge.reconcilePendingInternalV1(
        pendingV1("presentation_barrier", 2),
      ),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    expect(
      fixture.harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }),
    ).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });

    settleSemantic("preserved-outcome");
    await expect(dispatched.completion).resolves.toBe("preserved-outcome");
    fixture.controller.disposeInternalV1();
  });

  it("owns one recovery generation across empty bootstrap, exact gate reuse, and controller recreation", () => {
    const harness = harnessV1();
    const stage = createBarrierStageHarnessV1({});
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    const gate = mutableActivationGateV1();
    const installed = controller.synchronizeRecoveryGenerationInternalV1(gate.gate);
    expect(installed).toMatchObject({ kind: "installed" });
    expect(Object.isFrozen(installed)).toBe(true);
    if (installed.kind !== "installed") throw new Error("expected recovery generation");
    expectTypeOf(installed.generation).toEqualTypeOf<
      NarrativeStableBarrierRecoveryGenerationInternalV1
    >();
    expect(Object.isFrozen(installed.generation)).toBe(true);
    expect(Reflect.ownKeys(installed.generation)).toEqual([]);
    expect(gate.isOpen).toHaveBeenCalledTimes(2);

    const state = harness.kernel.getStateInternalV1();
    const notifications = harness.stateNotificationCount();
    gate.fault(new Error("equal must not re-read the stored gate"));
    const unchanged = controller.synchronizeRecoveryGenerationInternalV1(gate.gate);
    expect(unchanged).toEqual({ kind: "unchanged", generation: installed.generation });
    expect(Object.isFrozen(unchanged)).toBe(true);
    expect(gate.isOpen).toHaveBeenCalledTimes(2);
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(harness.stateNotificationCount()).toBe(notifications);

    const foreignGate = mutableActivationGateV1();
    expect(controller.synchronizeRecoveryGenerationInternalV1(foreignGate.gate)).toEqual({
      kind: "faulted",
      generation: null,
    });
    expect(foreignGate.isOpen).not.toHaveBeenCalled();

    gate.fault(null);
    gate.open();
    expect(
      harness.bridge.reconcilePendingInternalV1(barrierPendingWithRecoveryV1("settle")),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
    settleCurrentNarrativeReadyV1(harness);
    expect(controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    expect(controller.readReplayRecoveryUnsupportedInternalV1()).toBeNull();

    controller.disposeInternalV1();
    const successor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    expect(successor.synchronizeRecoveryGenerationInternalV1(gate.gate)).toEqual({
      kind: "unchanged",
      generation: installed.generation,
    });
    expect(gate.isOpen).toHaveBeenCalledTimes(2);
    successor.disposeInternalV1();

    const foreignStage = createBarrierStageHarnessV1({});
    const foreignController = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: foreignStage.reconciler,
    });
    expect(foreignController.synchronizeRecoveryGenerationInternalV1(gate.gate)).toEqual({
      kind: "faulted",
      generation: null,
    });
    expect(gate.isOpen).toHaveBeenCalledTimes(2);
    foreignController.disposeInternalV1();
  });

  it("rejects activation-gate descriptor drift before install, issue, or cached replay", () => {
    const settle = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    let settleOpen = false;
    let mutateSettleGate = false;
    let settleGate!: ManagedSurfaceFamilyActivationGateInternalV1;
    const settleReplacement = vi.fn(() => true);
    const settleIsOpen = vi.fn(() => {
      if (mutateSettleGate) {
        Object.defineProperty(settleGate, "isOpen", { value: settleReplacement });
      }
      return settleOpen;
    });
    settleGate = { isOpen: settleIsOpen };
    expect(settle.controller.synchronizeRecoveryGenerationInternalV1(settleGate))
      .toMatchObject({ kind: "installed" });
    settleOpen = true;
    mutateSettleGate = true;
    expect(settle.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    expect(settleReplacement).not.toHaveBeenCalled();
    settle.controller.disposeInternalV1();

    const bootstrap = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    let bootstrapReads = 0;
    let bootstrapGate!: ManagedSurfaceFamilyActivationGateInternalV1;
    const bootstrapReplacement = vi.fn(() => false);
    const bootstrapIsOpen = vi.fn(() => {
      bootstrapReads += 1;
      if (bootstrapReads === 2) {
        Object.defineProperty(bootstrapGate, "isOpen", { value: bootstrapReplacement });
      }
      return false;
    });
    bootstrapGate = { isOpen: bootstrapIsOpen };
    expect(bootstrap.controller.synchronizeRecoveryGenerationInternalV1(bootstrapGate)).toEqual({
      kind: "stale",
      generation: null,
    });
    expect(bootstrapReplacement).not.toHaveBeenCalled();
    expect(bootstrap.controller.synchronizeRecoveryGenerationInternalV1(bootstrapGate))
      .toMatchObject({ kind: "installed" });
    bootstrap.controller.disposeInternalV1();

    const replay = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("replay"),
    });
    let replayOpen = false;
    const replayIsOpen = vi.fn(() => replayOpen);
    const replayGate: ManagedSurfaceFamilyActivationGateInternalV1 = {
      isOpen: replayIsOpen,
    };
    expect(replay.controller.synchronizeRecoveryGenerationInternalV1(replayGate))
      .toMatchObject({ kind: "installed" });
    replayOpen = true;
    const cached = replay.controller.readReplayRecoveryUnsupportedInternalV1();
    expect(cached).not.toBeNull();
    const replayReplacement = vi.fn(() => true);
    Object.defineProperty(replayGate, "isOpen", { value: replayReplacement });
    expect(replay.controller.readReplayRecoveryUnsupportedInternalV1()).toBeNull();
    expect(replayReplacement).not.toHaveBeenCalled();
    replay.controller.disposeInternalV1();
  });

  it("transfers one recovery attempt across controller disposal and seals gate callback reentry", async () => {
    const directDispatch = vi.fn(() => Promise.resolve("successor-direct"));
    const direct = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: directDispatch }),
    });
    const directGate = mutableActivationGateV1();
    expect(direct.controller.synchronizeRecoveryGenerationInternalV1(directGate.gate))
      .toMatchObject({ kind: "installed" });
    directGate.open();
    const directAttempt = direct.controller.issueSettleRecoveryAttemptInternalV1();
    expect(directAttempt).not.toBeNull();
    direct.controller.disposeInternalV1();
    const directSuccessor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: direct.harness.bridge,
      stageReconciler: direct.stage.reconciler,
    });
    const directResult = directSuccessor.dispatchSettleRecoveryInternalV1(directAttempt);
    if (directResult.kind !== "dispatched") throw new Error("expected successor dispatch");
    await expect(directResult.completion).resolves.toBe("successor-direct");
    expect(directSuccessor.dispatchSettleRecoveryInternalV1(directAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    directSuccessor.disposeInternalV1();

    const reentrantDispatch = vi.fn(() => Promise.resolve("successor-reentrant"));
    const reentrant = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: reentrantDispatch }),
    });
    let gateReads = 0;
    let reenterOnGate = false;
    let reentrantAttempt: NarrativeStableBarrierRecoveryAttemptInternalV1 | null = null;
    let successor: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null = null;
    let nestedResult: NarrativeStableBarrierRecoveryDispatchResultInternalV1 | null = null;
    const reentrantGate: ManagedSurfaceFamilyActivationGateInternalV1 = {
      isOpen: vi.fn(() => {
        gateReads += 1;
        if (reenterOnGate) {
          reenterOnGate = false;
          reentrant.controller.disposeInternalV1();
          successor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
            bridge: reentrant.harness.bridge,
            stageReconciler: reentrant.stage.reconciler,
          });
          nestedResult = successor.dispatchSettleRecoveryInternalV1(reentrantAttempt);
        }
        return gateReads > 2;
      }),
    };
    expect(reentrant.controller.synchronizeRecoveryGenerationInternalV1(reentrantGate))
      .toMatchObject({ kind: "installed" });
    reentrantAttempt = reentrant.controller.issueSettleRecoveryAttemptInternalV1();
    expect(reentrantAttempt).not.toBeNull();
    reenterOnGate = true;
    expect(reentrant.controller.dispatchSettleRecoveryInternalV1(reentrantAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(nestedResult).toEqual({ kind: "stale", completion: null });
    if (successor === null) throw new Error("expected reentrant successor");
    const exactSuccessor =
      successor as unknown as NarrativeStableBarrierAcknowledgmentControllerInternalV1;
    const successorResult = exactSuccessor.dispatchSettleRecoveryInternalV1(reentrantAttempt);
    if (successorResult.kind !== "dispatched") throw new Error("expected transferred dispatch");
    await expect(successorResult.completion).resolves.toBe("successor-reentrant");
    expect(reentrantDispatch).toHaveBeenCalledOnce();
    exactSuccessor.disposeInternalV1();
  });

  it("keeps the generation observer alive without a controller and retires a suspended attempt", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("observer-fresh"));
    const semanticPort = Object.freeze({ dispatchResolutionInternalV1: dispatchResolution });
    const { harness, nonBlockingDefinition: blockingDefinition } = nonBlockingNarrativeHarnessV1(
      semanticPort,
      90,
      "blocking",
    );
    expect(
      harness.bridge.reconcilePendingInternalV1(barrierPendingWithRecoveryV1("settle")),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(harness);
    const stage = createBarrierStageHarnessV1({});
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    const gate = mutableActivationGateV1();
    expect(controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
      .toMatchObject({ kind: "installed" });
    gate.open();
    const retiredAttempt = controller.issueSettleRecoveryAttemptInternalV1();
    expect(retiredAttempt).not.toBeNull();
    controller.disposeInternalV1();

    const blocker = openNonBlockingSurfaceV1(
      harness,
      blockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    const blockedPublication = harness.kernel.getStateInternalV1().transientState.publication;
    expect(harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: blockedPublication.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied" });

    const successor = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    expect(successor.dispatchSettleRecoveryInternalV1(retiredAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    const freshAttempt = successor.issueSettleRecoveryAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    const fresh = successor.dispatchSettleRecoveryInternalV1(freshAttempt);
    if (fresh.kind !== "dispatched") throw new Error("expected observer-fresh dispatch");
    await expect(fresh.completion).resolves.toBe("observer-fresh");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    successor.disposeInternalV1();
  });

  it("binds an installed generation to one exact Stage authority before every retarget", () => {
    const fixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    const gate = mutableActivationGateV1();
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
      .toMatchObject({ kind: "installed" });
    const gateReads = (gate.isOpen as ReturnType<typeof vi.fn>).mock.calls.length;
    fixture.controller.disposeInternalV1();

    const foreignStage = createBarrierStageHarnessV1({});
    const foreignFrame = foreignStage.reconciler.frame();
    let foreignNotifications = 0;
    const unsubscribe = foreignStage.reconciler.subscribe(() => {
      foreignNotifications += 1;
    });
    const foreign = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: fixture.harness.bridge,
      stageReconciler: foreignStage.reconciler,
    });
    expect(
      foreign.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(foreignStage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "faulted" });
    expect(
      foreign.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(foreignStage.nextTarget, 2),
      ),
    ).toEqual({
      kind: "faulted",
      code: "stage.acknowledged_run_faulted",
      completion: null,
    });
    gate.fault(new Error("foreign Stage must not read the stored gate"));
    expect(foreign.synchronizeRecoveryGenerationInternalV1(gate.gate)).toEqual({
      kind: "faulted",
      generation: null,
    });
    expect((gate.isOpen as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(gateReads);
    expect(foreignStage.reconciler.frame()).toEqual(foreignFrame);
    expect(foreignNotifications).toBe(0);
    unsubscribe();
    foreign.disposeInternalV1();
  });

  it("keeps only the current attempt and observer across 10k higher-generation rotations", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
    });
    const stableState = fixture.harness.kernel.getStateInternalV1();
    const stableNotifications = fixture.harness.stateNotificationCount();
    let gateOpen = false;
    let gate: ManagedSurfaceFamilyActivationGateInternalV1 = {
      isOpen: () => gateOpen,
    };
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate))
      .toMatchObject({ kind: "installed" });
    gateOpen = true;
    let previousAttempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(previousAttempt).not.toBeNull();

    for (let index = 0; index < 10_000; index += 1) {
      expect(
        fixture.controller.retargetPresentationStageInternalV1(
          barrierPresentationRetargetInputV1(
            index % 2 === 0 ? fixture.stage.nextTarget : fixture.stage.thirdTarget,
            index + 2,
            index + 92,
          ),
        ),
      ).toEqual({ kind: "retargeted" });
      gateOpen = false;
      gate = { isOpen: () => gateOpen };
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate))
        .toMatchObject({ kind: "installed" });
      expect(fixture.controller.dispatchSettleRecoveryInternalV1(previousAttempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      gateOpen = true;
      previousAttempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(previousAttempt).not.toBeNull();
    }

    expect(fixture.harness.kernel.getStateInternalV1()).toBe(stableState);
    expect(fixture.harness.stateNotificationCount()).toBe(stableNotifications);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(previousAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    fixture.controller.disposeInternalV1();
  });

  it("advances presentation generations only through the claimed wrapper and fences equal or lower rows", () => {
    const fixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    const initialGate = mutableActivationGateV1();
    const initial = fixture.controller.synchronizeRecoveryGenerationInternalV1(
      initialGate.gate,
    );
    if (initial.kind !== "installed") throw new Error("expected initial generation");
    let stageNotifications = 0;
    const unsubscribe = fixture.stage.reconciler.subscribe(() => {
      stageNotifications += 1;
    });
    const frame = fixture.stage.reconciler.frame();

    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.thirdTarget, 2, 91),
      ),
    ).toEqual({ kind: "stale" });
    expect(fixture.stage.reconciler.frame()).toEqual(frame);
    expect(stageNotifications).toBe(0);

    initialGate.fault(new Error("equal generation must be zero-read"));
    expect(
      fixture.controller.synchronizeRecoveryGenerationInternalV1(initialGate.gate),
    ).toEqual({ kind: "unchanged", generation: initial.generation });
    expect(initialGate.isOpen).toHaveBeenCalledTimes(2);

    const higherGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(stageNotifications).toBe(1);
    const higher = fixture.controller.synchronizeRecoveryGenerationInternalV1(higherGate.gate);
    expect(higher).toMatchObject({ kind: "installed" });
    if (higher.kind !== "installed") throw new Error("expected higher generation");
    expect(higher.generation).not.toBe(initial.generation);
    expect(higherGate.isOpen).toHaveBeenCalledTimes(2);

    const lowerGate = mutableActivationGateV1();
    lowerGate.fault(new Error("lower generation must be zero-read"));
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.thirdTarget, 3, 90),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(stageNotifications).toBe(2);
    expect(
      fixture.controller.synchronizeRecoveryGenerationInternalV1(lowerGate.gate),
    ).toEqual({ kind: "stale", generation: null });
    expect(lowerGate.isOpen).not.toHaveBeenCalled();

    unsubscribe();
    fixture.controller.disposeInternalV1();
  });

  it("fences every recovery ingress before bridge disposal can reenter Stage", () => {
    const fixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    const gate = mutableActivationGateV1();
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
      .toMatchObject({ kind: "installed" });
    gate.open();
    const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(attempt).not.toBeNull();

    const stageFrame = fixture.stage.reconciler.frame();
    let stageNotifications = 0;
    const unsubscribe = fixture.stage.reconciler.subscribe(() => {
      stageNotifications += 1;
    });
    const gateReads = (gate.isOpen as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });

    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "stale" });
    expect(fixture.stage.reconciler.frame()).toEqual(stageFrame);
    expect(stageNotifications).toBe(0);
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate)).toEqual({
      kind: "stale",
      generation: null,
    });
    expect((gate.isOpen as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(gateReads);
    expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(attempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(fixture.controller.readReplayRecoveryUnsupportedInternalV1()).toBeNull();

    fixture.controller.disposeInternalV1();
    expect(() =>
      createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
        bridge: fixture.harness.bridge,
        stageReconciler: fixture.stage.reconciler,
      })
    ).toThrowError("ui.narrative_stable_barrier_controller_invalid");
    unsubscribe();
  });

  it("keeps same-epoch stale retarget current but fences unsynchronized higher and lower generations", async () => {
    const sameDispatch = vi.fn(() => Promise.resolve("same-epoch"));
    const same = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: sameDispatch }),
    });
    const sameGate = mutableActivationGateV1();
    expect(same.controller.synchronizeRecoveryGenerationInternalV1(sameGate.gate))
      .toMatchObject({ kind: "installed" });
    sameGate.open();
    const sameAttempt = same.controller.issueSettleRecoveryAttemptInternalV1();
    expect(sameAttempt).not.toBeNull();
    expect(
      same.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(same.stage.nextTarget, 2, 91),
      ),
    ).toEqual({ kind: "stale" });
    const sameResult = same.controller.dispatchSettleRecoveryInternalV1(sameAttempt);
    if (sameResult.kind !== "dispatched") throw new Error("expected same-epoch dispatch");
    await expect(sameResult.completion).resolves.toBe("same-epoch");
    expect(sameDispatch).toHaveBeenCalledOnce();
    same.controller.disposeInternalV1();

    for (const epoch of [92, 90]) {
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const fixture = narrativeBarrierHarnessV1({
        pending: barrierPendingWithRecoveryV1("settle"),
        semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
      });
      const gate = mutableActivationGateV1();
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
        .toMatchObject({ kind: "installed" });
      gate.open();
      const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(attempt).not.toBeNull();
      expect(
        fixture.controller.retargetPresentationStageInternalV1(
          barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 2, epoch),
        ),
      ).toEqual({ kind: "retargeted" });
      expect(fixture.controller.dispatchSettleRecoveryInternalV1(attempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
      expect(fixture.controller.readReplayRecoveryUnsupportedInternalV1()).toBeNull();
      expect(dispatchResolution).not.toHaveBeenCalled();
      fixture.controller.disposeInternalV1();
    }
  });

  it("dispatches one ready-active settle recovery behind the exact gate and one-shot attempt", async () => {
    let capturedRequest: unknown = null;
    const semanticReceipt = Object.freeze({ kind: "settled-recovery" as const });
    const dispatchResolution = vi.fn((request: unknown) => {
      capturedRequest = request;
      return Promise.resolve(semanticReceipt);
    });
    const fixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const gate = mutableActivationGateV1();
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate)).toMatchObject({
      kind: "installed",
    });
    expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();

    gate.open();
    const driftedAttempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(driftedAttempt).not.toBeNull();
    expect(Object.isFrozen(driftedAttempt)).toBe(true);
    expect(Reflect.ownKeys(driftedAttempt as object)).toEqual([]);
    expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    expect(
      fixture.controller.dispatchSettleRecoveryInternalV1({
        ...(driftedAttempt as object),
      }),
    ).toEqual({ kind: "stale", completion: null });
    gate.close();
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(driftedAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();

    const faultGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(faultGate.gate))
      .toMatchObject({ kind: "installed" });
    faultGate.open();
    const faultedAttempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(faultedAttempt).not.toBeNull();
    faultGate.fault(new Error("gate dispatch fault"));
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(faultedAttempt)).toEqual({
      kind: "faulted",
      completion: null,
    });

    const successGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 3, 93),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(successGate.gate))
      .toMatchObject({ kind: "installed" });
    successGate.open();
    const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const dispatched = fixture.controller.dispatchSettleRecoveryInternalV1(attempt);
    expect(dispatched).toMatchObject({ kind: "dispatched" });
    if (dispatched.kind !== "dispatched") throw new Error("expected settle dispatch");
    expect(Object.isFrozen(dispatched)).toBe(true);
    expect(capturedRequest).toEqual({
      expectedOccurrenceId: occurrenceV1(1),
      resolution: {
        kind: "barrier_completed",
        transitionId: "transition.test.fade",
      },
    });
    expect(Object.isFrozen(capturedRequest)).toBe(true);
    expect(Object.isFrozen((capturedRequest as { readonly resolution: object }).resolution))
      .toBe(true);
    await expect(dispatched.completion).resolves.toBe(semanticReceipt);
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(attempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.controller.disposeInternalV1();
  });

  it("shares first-win and Promise tombstones across normal, higher, and lower recovery paths", async () => {
    let settleOld!: (value: unknown) => void;
    const oldCompletion = new Promise<unknown>((resolve) => {
      settleOld = resolve;
    });
    let dispatchCount = 0;
    const dispatchResolution = vi.fn(() => {
      dispatchCount += 1;
      return dispatchCount === 1 ? oldCompletion : Promise.resolve("fresh-drained");
    });
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
    });
    const initialGate = mutableActivationGateV1();
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(initialGate.gate))
      .toMatchObject({ kind: "installed" });
    initialGate.open();
    const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const oldResult = fixture.controller.dispatchSettleRecoveryInternalV1(attempt);
    if (oldResult.kind !== "dispatched") throw new Error("expected old recovery dispatch");

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "stale", completion: null });

    const higherGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(higherGate.gate))
      .toMatchObject({ kind: "installed" });
    higherGate.open();
    const higherCompetitor = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(higherCompetitor).not.toBeNull();
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(higherCompetitor)).toEqual({
      kind: "stale",
      completion: null,
    });

    const lowerGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.thirdTarget, 3, 90),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(lowerGate.gate)).toEqual({
      kind: "stale",
      generation: null,
    });
    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 4, 90),
      ),
    ).toEqual({ kind: "stale", completion: null });

    const finalGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.nextTarget, 4, 93),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(finalGate.gate))
      .toMatchObject({ kind: "installed" });
    finalGate.open();
    const finalCompetitor = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(finalCompetitor).not.toBeNull();
    expect(fixture.controller.dispatchSettleRecoveryInternalV1(finalCompetitor)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();

    settleOld("old-drained");
    await expect(oldResult.completion).resolves.toBe("old-drained");
    const freshAttempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
    expect(freshAttempt).not.toBeNull();
    const freshResult = fixture.controller.dispatchSettleRecoveryInternalV1(freshAttempt);
    if (freshResult.kind !== "dispatched") throw new Error("expected fresh recovery dispatch");
    await expect(freshResult.completion).resolves.toBe("fresh-drained");
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    fixture.controller.disposeInternalV1();
  });

  it("first-wins normal evidence and invalidates recovery attempts on every target lifecycle fence", async () => {
    const normalDispatch = vi.fn(() => Promise.resolve("normal-first"));
    const normalFirst = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: normalDispatch }),
    });
    const normalGate = mutableActivationGateV1();
    expect(normalFirst.controller.synchronizeRecoveryGenerationInternalV1(normalGate.gate))
      .toMatchObject({ kind: "installed" });
    normalGate.open();
    const recoveryCompetitor = normalFirst.controller.issueSettleRecoveryAttemptInternalV1();
    expect(recoveryCompetitor).not.toBeNull();
    expect(
      normalFirst.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(normalFirst.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    expect(
      normalFirst.controller.dispatchSettleRecoveryInternalV1(recoveryCompetitor),
    ).toEqual({ kind: "stale", completion: null });
    const normalResult = normalFirst.controller.flushRetainedTerminalInternalV1();
    if (normalResult?.kind !== "dispatched") throw new Error("expected normal first-win");
    await expect(normalResult.completion).resolves.toBe("normal-first");
    expect(normalDispatch).toHaveBeenCalledOnce();
    normalFirst.controller.disposeInternalV1();

    const suspendedParts = nonBlockingNarrativeHarnessV1(
      defaultSemanticDispatchPortV1,
      90,
      "blocking",
    );
    expect(
      suspendedParts.harness.bridge.reconcilePendingInternalV1(
        barrierPendingWithRecoveryV1("settle"),
      ),
    ).toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(suspendedParts.harness);
    const suspendedStage = createBarrierStageHarnessV1({});
    const suspendedController = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: suspendedParts.harness.bridge,
      stageReconciler: suspendedStage.reconciler,
    });
    const suspendedGate = mutableActivationGateV1();
    expect(suspendedController.synchronizeRecoveryGenerationInternalV1(suspendedGate.gate))
      .toMatchObject({ kind: "installed" });
    suspendedGate.open();
    const suspendedAttempt = suspendedController.issueSettleRecoveryAttemptInternalV1();
    expect(suspendedAttempt).not.toBeNull();
    openNonBlockingSurfaceV1(
      suspendedParts.harness,
      suspendedParts.nonBlockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    expect(suspendedController.dispatchSettleRecoveryInternalV1(suspendedAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(suspendedController.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    suspendedController.disposeInternalV1();

    const sourceDispatch = vi.fn(() => Promise.resolve("source-rebound"));
    const sourceHarness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          capturedCandidatePreflightResultV1(Object.freeze({
            ...defaultCandidateSnapshotV1,
            semanticDispatchPort: Object.freeze({
              dispatchResolutionInternalV1: sourceDispatch,
            }),
          })),
      }),
    });
    expect(
      sourceHarness.bridge.reconcilePendingInternalV1(
        barrierPendingWithRecoveryV1("settle"),
      ),
    ).toMatchObject({ kind: "applied" });
    const sourceStage = createBarrierStageHarnessV1({});
    const sourceController = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: sourceHarness.bridge,
      stageReconciler: sourceStage.reconciler,
    });
    const sourceGate = mutableActivationGateV1();
    expect(sourceController.synchronizeRecoveryGenerationInternalV1(sourceGate.gate))
      .toMatchObject({ kind: "installed" });
    const preparing = sourceHarness.kernel.getStateInternalV1().stableRuntimeBindings[0];
    if (preparing?.binding.kind !== "preparing") throw new Error("expected source preparation");
    expect(sourceHarness.kernel.settleStableReadinessFailedInternalV1({
      readinessEvidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        surfaceInstanceId: preparing.binding.attempt.identity.surfaceInstanceId,
      }),
      publisherLease: preparing.desiredTarget.publisherLease,
      sourceRevision: preparing.desiredTarget.sourceRevision,
    })).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(sourceHarness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(sourceHarness);
    sourceGate.open();
    const freshSourceAttempt = sourceController.issueSettleRecoveryAttemptInternalV1();
    expect(freshSourceAttempt).not.toBeNull();
    const freshSource = sourceController.dispatchSettleRecoveryInternalV1(
      freshSourceAttempt,
    );
    if (freshSource.kind !== "dispatched") throw new Error("expected source rebound");
    await expect(freshSource.completion).resolves.toBe("source-rebound");
    sourceController.disposeInternalV1();

    for (const mutation of ["replacement", "empty", "application_dispose"] as const) {
      const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
      const fixture = narrativeBarrierHarnessV1({
        pending: barrierPendingWithRecoveryV1("settle"),
        semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
      });
      const gate = mutableActivationGateV1();
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
        .toMatchObject({ kind: "installed" });
      gate.open();
      const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(attempt).not.toBeNull();
      if (mutation === "replacement") {
        expect(
          fixture.harness.bridge.reconcilePendingInternalV1(
            barrierPendingWithRecoveryV1("settle", 2),
          ),
        ).toMatchObject({ kind: "applied" });
      } else if (mutation === "empty") {
        expect(fixture.harness.bridge.reconcilePendingInternalV1(null)).toMatchObject({
          kind: "applied",
        });
      } else {
        expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
      }
      expect(fixture.controller.dispatchSettleRecoveryInternalV1(attempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
      expect(dispatchResolution).not.toHaveBeenCalled();
      fixture.controller.disposeInternalV1();
    }
  });

  it("caches replay unsupported without taking the normal terminal claim across 10k reads", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("normal-drained"));
    const fixture = narrativeBarrierHarnessV1({
      transition: barrierTransitionDefinitionV1({ kind: "cut", durationMs: 0 }),
      pending: barrierPendingWithRecoveryV1("replay"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
    });
    const gate = mutableActivationGateV1();
    const installed = fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate);
    if (installed.kind !== "installed") throw new Error("expected replay generation");
    gate.open();
    const unsupported = fixture.controller.readReplayRecoveryUnsupportedInternalV1();
    expect(unsupported).toEqual({
      kind: "unsupported",
      code: "narrative.barrier_replay_unsupported",
      completion: null,
    });
    expect(Object.isFrozen(unsupported)).toBe(true);
    expect(fixture.controller.issueSettleRecoveryAttemptInternalV1()).toBeNull();
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const gateReads = (gate.isOpen as ReturnType<typeof vi.fn>).mock.calls.length;
    for (let index = 0; index < 10_000; index += 1) {
      expect(fixture.controller.readReplayRecoveryUnsupportedInternalV1()).toBe(unsupported);
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate)).toEqual({
        kind: "unchanged",
        generation: installed.generation,
      });
    }
    expect((gate.isOpen as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
      gateReads + 10_000,
    );
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    expect(dispatchResolution).not.toHaveBeenCalled();

    expect(
      fixture.controller.retargetCurrentBarrierStageInternalV1(
        barrierRetargetInputV1(fixture.stage.nextTarget, 2),
      ),
    ).toEqual({ kind: "armed", completion: null });
    const normal = fixture.controller.flushRetainedTerminalInternalV1();
    if (normal?.kind !== "dispatched") throw new Error("expected normal Barrier dispatch");
    await expect(normal.completion).resolves.toBe("normal-drained");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    const higherGate = mutableActivationGateV1();
    expect(
      fixture.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(fixture.stage.thirdTarget, 3, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(higherGate.gate))
      .toMatchObject({ kind: "installed" });
    higherGate.open();
    const freshUnsupported = fixture.controller.readReplayRecoveryUnsupportedInternalV1();
    expect(freshUnsupported).toEqual(unsupported);
    expect(freshUnsupported).not.toBe(unsupported);
    fixture.controller.disposeInternalV1();
  });

  it("admits only exact gates and rolls back a second-read target drift with nested sync", () => {
    let accessorReads = 0;
    const accessor = Object.defineProperty({}, "isOpen", {
      get() {
        accessorReads += 1;
        return () => false;
      },
    });
    const symbolKey = Symbol("extra-gate-key");
    const malformedGates: readonly unknown[] = [
      accessor,
      { isOpen: () => false, extra: true },
      { isOpen: () => false, [symbolKey]: true },
      Object.assign(Object.create({ inherited: true }), { isOpen: () => false }),
      Object.assign(Object.create(null), { isOpen: () => false }),
      { isOpen: false },
    ];
    for (const malformed of malformedGates) {
      const fixture = narrativeBarrierHarnessV1({
        pending: barrierPendingWithRecoveryV1("settle"),
      });
      expect(
        fixture.controller.synchronizeRecoveryGenerationInternalV1(
          malformed as ManagedSurfaceFamilyActivationGateInternalV1,
        ),
      ).toEqual({ kind: "faulted", generation: null });
      fixture.controller.disposeInternalV1();
    }
    expect(accessorReads).toBe(0);

    const invalidRows = [
      { expected: "stale", invoke: () => true },
      {
        expected: "faulted",
        invoke: () => {
          throw new Error("gate fault");
        },
      },
      { expected: "faulted", invoke: () => "not-boolean" },
    ] as const;
    for (const row of invalidRows) {
      const fixture = narrativeBarrierHarnessV1({
        pending: barrierPendingWithRecoveryV1("settle"),
      });
      const gate = {
        isOpen: row.invoke,
      } as unknown as ManagedSurfaceFamilyActivationGateInternalV1;
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate)).toEqual({
        kind: row.expected,
        generation: null,
      });
      fixture.controller.disposeInternalV1();
    }

    const receiverFixture = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    let receiverGate!: ManagedSurfaceFamilyActivationGateInternalV1;
    const receiver = vi.fn(function (this: unknown) {
      expect(this).toBe(receiverGate);
      return false;
    });
    receiverGate = { isOpen: receiver };
    expect(receiverFixture.controller.synchronizeRecoveryGenerationInternalV1(receiverGate))
      .toMatchObject({ kind: "installed" });
    expect(receiver).toHaveBeenCalledTimes(2);
    receiverFixture.controller.disposeInternalV1();

    const drift = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    const initialGate = mutableActivationGateV1();
    const initial = drift.controller.synchronizeRecoveryGenerationInternalV1(initialGate.gate);
    if (initial.kind !== "installed") throw new Error("expected initial generation");
    expect(
      drift.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(drift.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    let publicationResult: unknown = null;
    let driftReads = 0;
    const driftGate: ManagedSurfaceFamilyActivationGateInternalV1 = {
      isOpen: vi.fn(() => {
        driftReads += 1;
        if (driftReads === 2) {
          publicationResult = drift.harness.bridge.reconcilePendingInternalV1(
            barrierPendingWithRecoveryV1("settle", 2),
          );
        }
        return false;
      }),
    };
    expect(drift.controller.synchronizeRecoveryGenerationInternalV1(driftGate)).toEqual({
      kind: "stale",
      generation: null,
    });
    expect(publicationResult).toMatchObject({ kind: "applied" });
    const retryGate = mutableActivationGateV1();
    const retry = drift.controller.synchronizeRecoveryGenerationInternalV1(retryGate.gate);
    expect(retry).toMatchObject({ kind: "installed" });
    if (retry.kind !== "installed") throw new Error("expected retry generation");
    expect(retry.generation).not.toBe(initial.generation);
    drift.controller.disposeInternalV1();

    const nested = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
    });
    const nestedInitialGate = mutableActivationGateV1();
    const nestedInitial = nested.controller.synchronizeRecoveryGenerationInternalV1(
      nestedInitialGate.gate,
    );
    if (nestedInitial.kind !== "installed") throw new Error("expected nested initial");
    expect(
      nested.controller.retargetPresentationStageInternalV1(
        barrierPresentationRetargetInputV1(nested.stage.nextTarget, 2, 92),
      ),
    ).toEqual({ kind: "retargeted" });
    const rejectedNestedGate = mutableActivationGateV1();
    let rejectedNested:
      | NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1
      | null = null;
    let nestedReads = 0;
    const outerGate: ManagedSurfaceFamilyActivationGateInternalV1 = {
      isOpen: vi.fn(() => {
        nestedReads += 1;
        if (nestedReads === 2) {
          rejectedNested = nested.controller.synchronizeRecoveryGenerationInternalV1(
            rejectedNestedGate.gate,
          );
        }
        return false;
      }),
    };
    expect(nested.controller.synchronizeRecoveryGenerationInternalV1(outerGate)).toEqual({
      kind: "faulted",
      generation: null,
    });
    expect(rejectedNested).toEqual({ kind: "faulted", generation: null });
    expect(rejectedNestedGate.isOpen).not.toHaveBeenCalled();
    const nestedRetryGate = mutableActivationGateV1();
    const nestedRetry = nested.controller.synchronizeRecoveryGenerationInternalV1(
      nestedRetryGate.gate,
    );
    expect(nestedRetry).toMatchObject({ kind: "installed" });
    if (nestedRetry.kind !== "installed") throw new Error("expected nested retry");
    expect(nestedRetry.generation).not.toBe(nestedInitial.generation);
    nested.controller.disposeInternalV1();
  });

  it("keeps semantic throw and rejection attempts spent until their exact Promise drains", async () => {
    for (const mode of ["throw", "reject"] as const) {
      const failure = new Error(`semantic-${mode}`);
      const dispatchResolution = vi.fn(() => {
        if (mode === "throw") throw failure;
        return Promise.reject(failure);
      });
      const fixture = narrativeBarrierHarnessV1({
        pending: barrierPendingWithRecoveryV1("settle"),
        semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: dispatchResolution }),
      });
      const gate = mutableActivationGateV1();
      expect(fixture.controller.synchronizeRecoveryGenerationInternalV1(gate.gate))
        .toMatchObject({ kind: "installed" });
      gate.open();
      const attempt = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(attempt).not.toBeNull();
      const dispatched = fixture.controller.dispatchSettleRecoveryInternalV1(attempt);
      expect(dispatched).toMatchObject({ kind: "dispatched" });
      expect(Object.isFrozen(dispatched)).toBe(true);
      if (dispatched.kind !== "dispatched") throw new Error("expected rejected dispatch");
      const rejected = expect(dispatched.completion).rejects.toBe(failure);
      expect(fixture.controller.dispatchSettleRecoveryInternalV1(attempt)).toEqual({
        kind: "stale",
        completion: null,
      });
      const competitor = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(competitor).not.toBeNull();
      expect(fixture.controller.dispatchSettleRecoveryInternalV1(competitor)).toEqual({
        kind: "stale",
        completion: null,
      });
      expect(dispatchResolution).toHaveBeenCalledOnce();
      await rejected;

      const fresh = fixture.controller.issueSettleRecoveryAttemptInternalV1();
      expect(fresh).not.toBeNull();
      const freshResult = fixture.controller.dispatchSettleRecoveryInternalV1(fresh);
      if (freshResult.kind !== "dispatched") throw new Error("expected fresh dispatch");
      await expect(freshResult.completion).rejects.toBe(failure);
      expect(dispatchResolution).toHaveBeenCalledTimes(2);
      fixture.controller.disposeInternalV1();
    }
  });

  it("rejects old attempts across fresh bridge domains and mints fresh replay identities", () => {
    const oldSettleDispatch = vi.fn(() => Promise.resolve("old-must-not-dispatch"));
    const oldSettle = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: oldSettleDispatch,
      }),
    });
    const oldGate = mutableActivationGateV1();
    expect(oldSettle.controller.synchronizeRecoveryGenerationInternalV1(oldGate.gate))
      .toMatchObject({ kind: "installed" });
    oldGate.open();
    const oldAttempt = oldSettle.controller.issueSettleRecoveryAttemptInternalV1();
    expect(oldAttempt).not.toBeNull();

    const freshSettleDispatch = vi.fn(() => Promise.resolve("fresh-must-not-dispatch"));
    const freshSettle = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: freshSettleDispatch,
      }),
    });
    const freshGate = mutableActivationGateV1();
    expect(freshSettle.controller.synchronizeRecoveryGenerationInternalV1(freshGate.gate))
      .toMatchObject({ kind: "installed" });
    freshGate.open();
    expect(freshSettle.controller.dispatchSettleRecoveryInternalV1(oldAttempt)).toEqual({
      kind: "stale",
      completion: null,
    });
    expect(oldSettleDispatch).not.toHaveBeenCalled();
    expect(freshSettleDispatch).not.toHaveBeenCalled();

    const oldReplay = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("replay"),
    });
    const oldReplayGate = mutableActivationGateV1();
    expect(oldReplay.controller.synchronizeRecoveryGenerationInternalV1(oldReplayGate.gate))
      .toMatchObject({ kind: "installed" });
    oldReplayGate.open();
    const oldUnsupported = oldReplay.controller.readReplayRecoveryUnsupportedInternalV1();
    expect(oldUnsupported).not.toBeNull();

    const freshReplay = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("replay"),
    });
    const freshReplayGate = mutableActivationGateV1();
    expect(freshReplay.controller.synchronizeRecoveryGenerationInternalV1(freshReplayGate.gate))
      .toMatchObject({ kind: "installed" });
    freshReplayGate.open();
    const freshUnsupported = freshReplay.controller.readReplayRecoveryUnsupportedInternalV1();
    expect(freshUnsupported).toEqual(oldUnsupported);
    expect(freshUnsupported).not.toBe(oldUnsupported);

    oldSettle.controller.disposeInternalV1();
    freshSettle.controller.disposeInternalV1();
    oldReplay.controller.disposeInternalV1();
    freshReplay.controller.disposeInternalV1();
  });

  it("retires attempts before later state subscribers can reenter on replacement or suspension", () => {
    const replacementDispatch = vi.fn(() => Promise.resolve("replacement-must-not-dispatch"));
    const replacement = narrativeBarrierHarnessV1({
      pending: barrierPendingWithRecoveryV1("settle"),
      semanticDispatchPort: Object.freeze({ dispatchResolutionInternalV1: replacementDispatch }),
    });
    const replacementGate = mutableActivationGateV1();
    expect(
      replacement.controller.synchronizeRecoveryGenerationInternalV1(replacementGate.gate),
    ).toMatchObject({ kind: "installed" });
    replacementGate.open();
    const replacementAttempt = replacement.controller.issueSettleRecoveryAttemptInternalV1();
    expect(replacementAttempt).not.toBeNull();
    let replacementNested: NarrativeStableBarrierRecoveryDispatchResultInternalV1 | null = null;
    const unsubscribeReplacement = replacement.harness.kernel.subscribeStateInternalV1(() => {
      replacementNested = replacement.controller.dispatchSettleRecoveryInternalV1(
        replacementAttempt,
      );
    });
    expect(
      replacement.harness.bridge.reconcilePendingInternalV1(
        barrierPendingWithRecoveryV1("settle", 2),
      ),
    ).toMatchObject({ kind: "applied" });
    expect(replacementNested).toEqual({ kind: "stale", completion: null });
    expect(replacementDispatch).not.toHaveBeenCalled();
    unsubscribeReplacement();
    replacement.controller.disposeInternalV1();

    const suspendDispatch = vi.fn(() => Promise.resolve("suspend-must-not-dispatch"));
    const suspendPort = Object.freeze({ dispatchResolutionInternalV1: suspendDispatch });
    const { harness, nonBlockingDefinition: blockingDefinition } = nonBlockingNarrativeHarnessV1(
      suspendPort,
      90,
      "blocking",
    );
    expect(harness.bridge.reconcilePendingInternalV1(barrierPendingWithRecoveryV1("settle")))
      .toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(harness);
    const stage = createBarrierStageHarnessV1({});
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: harness.bridge,
      stageReconciler: stage.reconciler,
    });
    const suspendGate = mutableActivationGateV1();
    expect(controller.synchronizeRecoveryGenerationInternalV1(suspendGate.gate))
      .toMatchObject({ kind: "installed" });
    suspendGate.open();
    const suspendAttempt = controller.issueSettleRecoveryAttemptInternalV1();
    expect(suspendAttempt).not.toBeNull();
    const nestedSuspensionResults: NarrativeStableBarrierRecoveryDispatchResultInternalV1[] = [];
    const unsubscribeSuspension = harness.kernel.subscribeStateInternalV1(() => {
      nestedSuspensionResults.push(
        controller.dispatchSettleRecoveryInternalV1(suspendAttempt),
      );
    });
    const blocker = openNonBlockingSurfaceV1(
      harness,
      blockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    expect(nestedSuspensionResults.length).toBeGreaterThan(0);
    expect(nestedSuspensionResults).toEqual(
      nestedSuspensionResults.map(() => ({ kind: "stale", completion: null })),
    );
    expect(suspendDispatch).not.toHaveBeenCalled();
    unsubscribeSuspension();
    const publication = harness.kernel.getStateInternalV1().transientState.publication;
    expect(harness.kernel.transitionTransientInternalV1({
      kind: "close_expected",
      evidence: Object.freeze({
        applicationEpoch: applicationEpochV1,
        topologyRevision: publication.topologyRevision,
        surfaceInstanceId: blocker.surfaceInstanceId,
      }),
    })).toMatchObject({ kind: "applied" });
    controller.disposeInternalV1();
  });

  it("exposes only the exact bridge-bound History-child lifecycle and opaque preparation", () => {
    type ExpectedHistoryChildLifecycleResultV1 =
      | Readonly<{ readonly kind: "closed"; readonly completion: null }>
      | Readonly<{ readonly kind: "dismissed"; readonly completion: null }>
      | Readonly<{ readonly kind: "locked"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    type ExpectedHistoryChildPreparationResultV1 =
      | Readonly<{
        readonly kind: "preparing";
        readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
        readonly completion: null;
      }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStableHistoryChildPreparationResultInternalV1>()
      .toEqualTypeOf<ExpectedHistoryChildPreparationResultV1>();
    expectTypeOf<NarrativeStableHistoryChildLifecycleResultInternalV1>()
      .toEqualTypeOf<ExpectedHistoryChildLifecycleResultV1>();
    expectTypeOf<NarrativeStableHistoryChildLifecycleResultInternalV1>()
      .toMatchTypeOf<NarrativeStablePhysicalActionDispatchResultInternalV1>();
    expectTypeOf<keyof NarrativeStableHistoryChildControllerInternalV1>()
      .toEqualTypeOf<"closeInternalV1" | "dismissInternalV1">();
    expectTypeOf<
      NarrativeStableHistoryChildControllerInternalV1["closeInternalV1"]
    >().toEqualTypeOf<() => NarrativeStableHistoryChildLifecycleResultInternalV1>();
    expectTypeOf<
      NarrativeStableHistoryChildControllerInternalV1["dismissInternalV1"]
    >().toEqualTypeOf<
      (
        dismissKind: ManagedSurfaceDismissKindV1,
      ) => NarrativeStableHistoryChildLifecycleResultInternalV1
    >();
    expectTypeOf<keyof NarrativeStableHistoryChildLifecycleInternalV1>()
      .toEqualTypeOf<"redeemHistoryOpenIntentInternalV1">();
    expectTypeOf<
      NarrativeStableHistoryChildLifecycleInternalV1[
        "redeemHistoryOpenIntentInternalV1"
      ]
    >().toEqualTypeOf<
      (intent: unknown) => NarrativeStableHistoryChildPreparationResultInternalV1
    >();
    expectTypeOf<Parameters<typeof createNarrativeStableHistoryChildLifecycleInternalV1>>()
      .toEqualTypeOf<[
        Readonly<{ readonly bridge: NarrativeStablePublisherBridgeInternalV1 }>,
      ]>();

    const fixture = physicalHistoryHarnessV1();
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    expect(Object.isFrozen(lifecycle)).toBe(true);
    expect(Reflect.ownKeys(lifecycle)).toEqual(["redeemHistoryOpenIntentInternalV1"]);
    const intent = mintHistoryOpenIntentV1(fixture.admission, "child-lifecycle-shape");
    fixture.admission.disposeInternalV1();
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    const notifications = fixture.harness.stateNotificationCount();

    const result = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
    expect(result.kind).toBe("preparing");
    expect(result.completion).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Reflect.ownKeys(result)).toEqual(["kind", "preparation", "completion"]);
    if (result.kind !== "preparing") throw new Error("expected History preparation");
    expect(Object.isFrozen(result.preparation)).toBe(true);
    expect(Reflect.ownKeys(result.preparation)).toEqual([]);

    const state = fixture.harness.kernel.getStateInternalV1();
    const root = state.stableRuntimeBindings[0];
    if (root?.binding.kind !== "ready_instance") throw new Error("expected Dialogue root");
    expect(root.binding.instance.phase).toBe("suspended");
    expect(state.transientState.publication.orderedInstances).toHaveLength(1);
    expect(state.transientState.publication.orderedInstances[0]).toMatchObject({
      definition: { definitionId: "surface.narrative.history" },
      parentInstanceId: root.binding.instance.attempt.identity.surfaceInstanceId,
      semanticOccurrenceId: null,
      phase: "preparing",
      readiness: { kind: "preparing", transition: "child_open" },
    });
    expect(fixture.harness.stateNotificationCount()).toBe(notifications + 1);
    successorAdmission.disposeInternalV1();
  });

  it("spends only the first installed History intent and never revives an unspent loser", () => {
    const fixture = physicalHistoryHarnessV1();
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const session = createNarrativeStableSessionInternalV1({
      bridge: fixture.harness.bridge,
    });
    const winner = mintHistoryOpenIntentV1(fixture.admission, "child-first-winner");
    const loser = mintHistoryOpenIntentV1(fixture.admission, "child-first-loser");
    const notifications = fixture.harness.stateNotificationCount();

    const installed = lifecycle.redeemHistoryOpenIntentInternalV1(winner);
    expect(installed.kind).toBe("preparing");
    if (installed.kind !== "preparing") throw new Error("expected History preparation");
    const installedSnapshot = session.getReadinessSnapshotInternalV1();
    expect(installedSnapshot.entries).toEqual([{
      kind: "history",
      preparation: installed.preparation,
    }]);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications + 1);
    const installedState = fixture.harness.kernel.getStateInternalV1();
    const winnerRepeat = lifecycle.redeemHistoryOpenIntentInternalV1(winner);
    const occupiedLoser = lifecycle.redeemHistoryOpenIntentInternalV1(loser);
    expect(winnerRepeat).toEqual({ kind: "stale", completion: null });
    expect(occupiedLoser).toBe(winnerRepeat);
    expect(Reflect.ownKeys(occupiedLoser)).toEqual(["kind", "completion"]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(installedSnapshot);
    expect(session.getReadinessSnapshotInternalV1().entries[0]?.preparation)
      .toBe(installed.preparation);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(installedState);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications + 1);

    retireCurrentHistoryChildWithRootCutoverV1(fixture.harness, 2);
    const closedState = fixture.harness.kernel.getStateInternalV1();
    expect(closedState.transientState.publication.orderedInstances).toEqual([]);
    const root = closedState.stableRuntimeBindings[0];
    if (root?.binding.kind !== "ready_instance") throw new Error("expected resumed Dialogue");
    expect(root.binding.instance.phase).toBe("active");
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(loser)).toBe(occupiedLoser);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(closedState);

    fixture.admission.disposeInternalV1();
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: () => true,
    });
    const fresh = mintHistoryOpenIntentV1(successorAdmission, "child-fresh-vacancy");
    const freshResult = lifecycle.redeemHistoryOpenIntentInternalV1(fresh);
    expect(freshResult.kind).toBe("preparing");
    expect(freshResult).not.toBe(installed);
    successorAdmission.disposeInternalV1();
  });

  it("rejects clone, foreign, repeat, and wrong-receiver redemption without reads", () => {
    const fixture = physicalHistoryHarnessV1();
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const intent = mintHistoryOpenIntentV1(fixture.admission, "child-authentic");
    const foreign = physicalHistoryHarnessV1({ kind: "choice" });
    const foreignLifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: foreign.harness.bridge,
    });
    const foreignIntent = mintHistoryOpenIntentV1(foreign.admission, "child-foreign");
    const stale = lifecycle.redeemHistoryOpenIntentInternalV1(Object.freeze({}));
    expect(stale).toEqual({ kind: "stale", completion: null });
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(Object.freeze({ ...intent })))
      .toBe(stale);
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(foreignIntent)).toBe(stale);
    expect(foreignLifecycle.redeemHistoryOpenIntentInternalV1(intent)).toBe(stale);
    const redeem = lifecycle.redeemHistoryOpenIntentInternalV1;
    expect(Reflect.apply(redeem, Object.freeze({}), [intent])).toBe(stale);

    const installed = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
    expect(installed.kind).toBe("preparing");
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(intent)).toBe(stale);
    expect(foreignLifecycle.redeemHistoryOpenIntentInternalV1(foreignIntent).kind)
      .toBe("preparing");
    fixture.admission.disposeInternalV1();
    foreign.admission.disposeInternalV1();
  });

  it("reuses one family claimant for a same-kernel bridge successor while fencing the old bridge", () => {
    const fixture = physicalHistoryHarnessV1();
    const oldLifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const oldIntent = mintHistoryOpenIntentV1(fixture.admission, "child-old-bridge");
    fixture.admission.disposeInternalV1();
    fixture.harness.bridge.disposeInternalV1();
    expect(oldLifecycle.redeemHistoryOpenIntentInternalV1(oldIntent)).toEqual({
      kind: "stale",
      completion: null,
    });

    const successorBridge = createNarrativeBridgeSuccessorV1(fixture.harness);
    const successorHarness: NarrativeHarnessV1 = {
      ...fixture.harness,
      bridge: successorBridge,
    };
    expect(successorBridge.reconcilePendingInternalV1(pendingV1("custom", 2)))
      .toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(successorHarness);
    const successorLifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: successorBridge,
    });
    expect(successorLifecycle.redeemHistoryOpenIntentInternalV1(oldIntent)).toEqual({
      kind: "stale",
      completion: null,
    });
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: successorBridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const successorIntent = mintHistoryOpenIntentV1(
      successorAdmission,
      "child-successor-bridge",
    );
    expect(successorLifecycle.redeemHistoryOpenIntentInternalV1(successorIntent).kind)
      .toBe("preparing");
    expect(oldLifecycle.redeemHistoryOpenIntentInternalV1(successorIntent)).toEqual({
      kind: "stale",
      completion: null,
    });
    successorAdmission.disposeInternalV1();
    successorBridge.disposeInternalV1();
  });

  it("leaves a History intent unspent across callback and semantic in-flight claims", async () => {
    let lifecycle!: NarrativeStableHistoryChildLifecycleInternalV1;
    let callbackIntent!: NarrativeStableHistoryOpenIntentInternalV1;
    let nestedCallbackResult: NarrativeStableHistoryChildPreparationResultInternalV1 | null = null;
    let availabilityReads = 0;
    const fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(() => {
        availabilityReads += 1;
        if (availabilityReads === 2) {
          nestedCallbackResult = lifecycle.redeemHistoryOpenIntentInternalV1(callbackIntent);
        }
        return true;
      }),
    });
    lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    callbackIntent = mintHistoryOpenIntentV1(fixture.admission, "child-callback-before");
    const callbackCompetitor = mintHistoryOpenIntentV1(
      fixture.admission,
      "child-callback-owned",
    );
    expect(nestedCallbackResult).toEqual({ kind: "stale", completion: null });
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(callbackIntent).kind)
      .toBe("preparing");
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(callbackCompetitor)).toEqual({
      kind: "stale",
      completion: null,
    });
    fixture.admission.disposeInternalV1();

    let resolveSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      resolveSemantic = resolve;
    });
    const semanticFixture = physicalHistoryHarnessV1({
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: () => semanticCompletion,
      }),
    });
    const semanticLifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: semanticFixture.harness.bridge,
    });
    const semanticIntent = mintHistoryOpenIntentV1(
      semanticFixture.admission,
      "child-semantic-before",
    );
    const controller = createNarrativeStableSayRevealControllerInternalV1({
      bridge: semanticFixture.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
    });
    const sayAttempt = semanticFixture.admission.issueSayActivationAttemptInternalV1(
      controller,
    );
    const sayResult = semanticFixture.admission.routeInternalV1(
      semanticFixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.history-child-semantic",
        ),
      }),
      sayAttempt,
    ).consumerResult;
    expect(sayResult?.kind).toBe("dispatched");
    expect(semanticLifecycle.redeemHistoryOpenIntentInternalV1(semanticIntent))
      .toEqual({ kind: "stale", completion: null });
    resolveSemantic("complete");
    if (sayResult?.kind !== "dispatched") throw new Error("expected semantic dispatch");
    await expect(sayResult.completion).resolves.toBe("complete");
    expect(semanticLifecycle.redeemHistoryOpenIntentInternalV1(semanticIntent).kind)
      .toBe("preparing");
    controller.disposeInternalV1();
    semanticFixture.admission.disposeInternalV1();
  });

  it("publishes the complete prepared successor before synchronous listener reentry", () => {
    const fixture = physicalHistoryHarnessV1();
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const session = createNarrativeStableSessionInternalV1({
      bridge: fixture.harness.bridge,
    });
    expect(session.getHistoryChildLifecycleInternalV1()).toBe(lifecycle);
    const intent = mintHistoryOpenIntentV1(fixture.admission, "child-listener-reentry");
    let nested: NarrativeStableHistoryChildPreparationResultInternalV1 | null = null;
    const observedSnapshots: NarrativeStableReadinessSnapshotInternalV1[] = [];
    const listener = vi.fn(() => {
      const state = fixture.harness.kernel.getStateInternalV1();
      const root = state.stableRuntimeBindings[0];
      if (root?.binding.kind !== "ready_instance") {
        throw new Error("listener expected ready Dialogue root");
      }
      expect(root.binding.instance.phase).toBe("suspended");
      expect(state.transientState.publication.orderedInstances).toHaveLength(1);
      expect(state.transientState.publication.orderedInstances[0]).toMatchObject({
        definition: { definitionId: "surface.narrative.history" },
        parentInstanceId: root.binding.instance.attempt.identity.surfaceInstanceId,
        phase: "preparing",
      });
      const observedSnapshot = session.getReadinessSnapshotInternalV1();
      observedSnapshots.push(observedSnapshot);
      expect(
        observedSnapshot.entries.map((entry: NarrativeStableReadinessEntryInternalV1) =>
          entry.kind
        ),
      ).toEqual(["history"]);
      nested = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
    });
    const unsubscribe = session.subscribeInternalV1(listener);

    const outer = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
    expect(outer.kind).toBe("preparing");
    expect(listener).toHaveBeenCalledOnce();
    if (outer.kind !== "preparing") throw new Error("expected History preparation");
    const observedSnapshot = observedSnapshots[0];
    if (observedSnapshot === undefined) throw new Error("expected observed snapshot");
    expect(observedSnapshot.entries[0]).toEqual({
      kind: "history",
      preparation: outer.preparation,
    });
    expect(session.getReadinessSnapshotInternalV1()).toBe(observedSnapshot);
    expect(nested).toEqual({ kind: "stale", completion: null });
    expect(lifecycle.redeemHistoryOpenIntentInternalV1(intent)).toBe(nested);
    unsubscribe();
    fixture.admission.disposeInternalV1();
  });

  it("maps raw stable publisher divergence to one canonical fault without spending intent", () => {
    let canonicalFault: NarrativeStableHistoryChildPreparationResultInternalV1 | null = null;
    for (let index = 0; index < 2; index += 1) {
      const fixture = physicalHistoryHarnessV1();
      const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
        bridge: fixture.harness.bridge,
      });
      const intent = mintHistoryOpenIntentV1(fixture.admission, `child-fault-${index}`);
      expect(
        fixture.harness.registry.disposePublisherLease(
          narrativeBaselineV1(fixture.harness).publisherLease,
        ),
      ).toBe("disposed");
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      const result = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
      expect(result).toEqual({ kind: "faulted", completion: null });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Reflect.ownKeys(result)).toEqual(["kind", "completion"]);
      if (canonicalFault === null) canonicalFault = result;
      else expect(result).toBe(canonicalFault);
      expect(lifecycle.redeemHistoryOpenIntentInternalV1(intent)).toBe(result);
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      fixture.admission.disposeInternalV1();
    }
  });

  it("prepares Barrier History with exact Stage and semantic zero", () => {
    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = narrativeBarrierHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(() => true),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
    });
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const stageFrame = fixture.stage.reconciler.frame();
    let stageNotifications = 0;
    const unsubscribeStage = fixture.stage.reconciler.subscribe(() => {
      stageNotifications += 1;
    });
    const intent = mintHistoryOpenIntentV1(admission, "child-barrier-zero");
    const notifications = fixture.harness.stateNotificationCount();

    expect(lifecycle.redeemHistoryOpenIntentInternalV1(intent).kind).toBe("preparing");
    expect(fixture.stage.reconciler.frame()).toEqual(stageFrame);
    expect(stageNotifications).toBe(0);
    expect(semanticDispatch).not.toHaveBeenCalled();
    expect(fixture.harness.stateNotificationCount()).toBe(notifications + 1);
    unsubscribeStage();
    admission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
  });

  it("prepares then retires 10k History children without live-state growth", () => {
    let availabilityReads = 0;
    const fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(() => {
        availabilityReads += 1;
        return true;
      }),
    });
    const lifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: fixture.harness.bridge,
    });
    const notifications = fixture.harness.stateNotificationCount();
    const publisherBefore = publisherSnapshotV1(fixture.harness);
    let admission = fixture.admission;
    let previousPreparation: NarrativeStableHistoryChildPreparationInternalV1 | null = null;

    for (let index = 0; index < 10_000; index += 1) {
      const intent = mintHistoryOpenIntentV1(admission, `child-bounded-${String(index)}`);
      const result = lifecycle.redeemHistoryOpenIntentInternalV1(intent);
      if (result.kind !== "preparing") throw new Error("expected bounded preparation");
      if (result.preparation === previousPreparation) {
        throw new Error("expected fresh bounded preparation");
      }
      previousPreparation = result.preparation;
      retireCurrentHistoryChildWithRootCutoverV1(fixture.harness, index + 2);
      admission.disposeInternalV1();
      admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: () => true,
      });
    }

    const state = fixture.harness.kernel.getStateInternalV1();
    expect(state.transientState.publication.orderedInstances).toEqual([]);
    const root = state.stableRuntimeBindings[0];
    if (root?.binding.kind !== "ready_instance") throw new Error("expected final Dialogue root");
    expect(root.binding.instance.phase).toBe("active");
    expect(availabilityReads).toBe(10_000);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications + 30_000);
    expect(publisherSnapshotV1(fixture.harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: publisherBefore.sourceRevisionIssuanceHighWater + 10_000,
      occurrenceIssuanceHighWater: publisherBefore.occurrenceIssuanceHighWater + 10_000,
    });
    admission.disposeInternalV1();
  });

  it.each(
    (["say", "choice", "pause", "custom", "presentation_barrier"] as const).flatMap(
      (kind) =>
        [
          [kind, "true", (): boolean => true, "requested"],
          [kind, "false", (): boolean => false, "ignored"],
          [kind, "throw", (): boolean => {
            throw new Error("availability fault");
          }, "faulted"],
          [kind, "nonboolean", (): boolean => "yes" as unknown as boolean, "faulted"],
        ] as const,
    ),
  )("routes History on ready-active %s with %s", (
    kind,
    _label,
    outcome,
    expectedKind,
  ) => {
    type ExpectedHistoryResultV1 =
      | Readonly<{
        readonly kind: "requested";
        readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
        readonly completion: null;
      }>
      | Readonly<{ readonly kind: "ignored"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
    expectTypeOf<NarrativeStableHistoryOpenDispatchResultInternalV1>()
      .toEqualTypeOf<ExpectedHistoryResultV1>();
    expectTypeOf<NarrativeStablePhysicalActionAdmissionInternalV1>().toMatchTypeOf<{
      issueHistoryOpenAttemptInternalV1():
        | NarrativeStableHistoryOpenActionAttemptInternalV1
        | null;
    }>();

    const readAvailability = vi.fn(outcome);
    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = physicalHistoryHarnessV1({
      kind,
      historyAvailabilityPort: historyAvailabilityPortV1(readAvailability),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const attempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expectTypeOf(attempt).toEqualTypeOf<
      NarrativeStableHistoryOpenActionAttemptInternalV1 | null
    >();
    if (attempt === null) throw new Error("expected History attempt");
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Reflect.ownKeys(attempt)).toEqual([]);

    const result = expectHistoryRouteConsumedV1(
      routeHistoryOpenV1(fixture.admission, attempt, `${kind}-${_label}`),
    );
    expect(result.kind).toBe(expectedKind);
    expect(result.completion).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Reflect.ownKeys(result)).toEqual(
      expectedKind === "requested" ? ["kind", "intent", "completion"] : ["kind", "completion"],
    );
    if (result.kind === "requested") {
      expect(Object.isFrozen(result.intent)).toBe(true);
      expect(Reflect.ownKeys(result.intent)).toEqual([]);
    }
    expect(
      routeHistoryOpenV1(fixture.admission, attempt, `${kind}-${_label}-repeat`)
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(readAvailability).toHaveBeenCalledOnce();
    expect(semanticDispatch).not.toHaveBeenCalled();
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    fixture.admission.disposeInternalV1();
  });

  it("reuses canonical ignored, stale, and faulted History rows across fresh admissions", () => {
    for (
      const [expectedKind, outcome] of [
        ["ignored", (): boolean => false],
        ["faulted", (): boolean => {
          throw new Error("canonical History fault");
        }],
        ["stale", (): boolean => true],
      ] as const
    ) {
      let canonical: NarrativeStableHistoryOpenDispatchResultInternalV1 | null = null;
      for (let index = 0; index < 2; index += 1) {
        const fixture = physicalHistoryHarnessV1({
          historyAvailabilityPort: historyAvailabilityPortV1(outcome),
        });
        const attempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
        const first = expectHistoryRouteConsumedV1(
          routeHistoryOpenV1(fixture.admission, attempt, `canonical-${expectedKind}-${index}`),
        );
        const result = expectedKind === "stale"
          ? expectHistoryRouteConsumedV1(
            routeHistoryOpenV1(
              fixture.admission,
              attempt,
              `canonical-${expectedKind}-${index}-repeat`,
            ),
          )
          : first;
        expect(result.kind).toBe(expectedKind);
        if (canonical === null) canonical = result;
        else expect(result).toBe(canonical);
        fixture.admission.disposeInternalV1();
      }
    }
  });

  it("issues History only for a current ready-active Dialogue and retires every old attempt", () => {
    const replacement = physicalHistoryHarnessV1();
    const replacementAttempt = replacement.admission.issueHistoryOpenAttemptInternalV1();
    expect(replacementAttempt).not.toBeNull();
    expect(replacement.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied" });
    expect(replacement.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
    expect(
      routeHistoryOpenV1(replacement.admission, replacementAttempt, "replacement")
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const activeChurn = physicalHistoryHarnessV1({ kind: "choice" });
    const churnAttempt = activeChurn.admission.issueHistoryOpenAttemptInternalV1();
    suspendCurrentNarrativeV1(activeChurn.harness);
    expect(activeChurn.admission.issueHistoryOpenAttemptInternalV1()).not.toBeNull();
    expect(
      routeHistoryOpenV1(activeChurn.admission, churnAttempt, "active-churn").consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const blocked = nonBlockingNarrativeHarnessV1(
      defaultSemanticDispatchPortV1,
      90,
      "blocking",
    );
    expect(blocked.harness.bridge.reconcilePendingInternalV1(pendingV1("choice")))
      .toMatchObject({ kind: "applied" });
    settleCurrentNarrativeReadyV1(blocked.harness);
    const blockedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: blocked.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const blockedAttempt = blockedAdmission.issueHistoryOpenAttemptInternalV1();
    expect(blockedAttempt).not.toBeNull();
    openNonBlockingSurfaceV1(
      blocked.harness,
      blocked.nonBlockingDefinition,
      "suspended",
      "candidate",
      () => {},
      "suspended",
    );
    expect(blockedAdmission.issueHistoryOpenAttemptInternalV1()).toBeNull();
    expect(
      routeHistoryOpenV1(blockedAdmission, blockedAttempt, "blocking-suspension")
        .consumerResult,
    ).toBeNull();

    const emptied = physicalHistoryHarnessV1({ kind: "pause" });
    const emptiedAttempt = emptied.admission.issueHistoryOpenAttemptInternalV1();
    expect(emptied.harness.bridge.reconcilePendingInternalV1(null)).toMatchObject({
      kind: "applied",
    });
    expect(emptied.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
    expect(
      routeHistoryOpenV1(emptied.admission, emptiedAttempt, "empty").consumerResult,
    ).toBeNull();

    const disposed = physicalHistoryHarnessV1({ kind: "custom" });
    disposed.admission.disposeInternalV1();
    expect(disposed.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();

    const terminal = physicalHistoryHarnessV1({ kind: "presentation_barrier" });
    const terminalAttempt = terminal.admission.issueHistoryOpenAttemptInternalV1();
    expect(terminal.harness.kernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied" });
    expect(terminal.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
    expect(
      routeHistoryOpenV1(terminal.admission, terminalAttempt, "terminal").consumerResult,
    ).toBeNull();

    replacement.admission.disposeInternalV1();
    activeChurn.admission.disposeInternalV1();
    blockedAdmission.disposeInternalV1();
    emptied.admission.disposeInternalV1();
    terminal.admission.disposeInternalV1();
  });

  it("runs generic and action-mapping fences before spending authentic History capabilities", () => {
    let gestureCurrent = false;
    const fixture = physicalHistoryHarnessV1({
      isGestureCurrent: () => gestureCurrent,
    });
    const admission = fixture.admission;
    const borrowedIssue = admission.issueHistoryOpenAttemptInternalV1;
    expect(Reflect.apply(borrowedIssue, Object.freeze({}), [])).toBeNull();
    const attempt = admission.issueHistoryOpenAttemptInternalV1();
    expect(attempt).not.toBeNull();
    const envelope = admission.createEnvelopeInternalV1({
      actionId: narrativeToggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.history-generic"),
    });
    expect(admission.routeInternalV1(envelope, attempt)).toMatchObject({
      route: { input: { code: "input.stale_gesture" }, surface: null },
      consumerResult: null,
    });
    gestureCurrent = true;
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeUnknownActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.history-unpublished",
          ),
        }),
        attempt,
      ).consumerResult,
    ).toBeNull();
    expect(
      routePlaybackModeToggleV1(admission, "auto", attempt, "history-as-mode")
        .consumerResult,
    ).toEqual({ kind: "unmapped", completion: null });
    expect(
      routeHistoryOpenV1(admission, attempt, "after-generic-and-mapping").consumerResult,
    ).toMatchObject({ kind: "requested" });

    const modeAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(modeAttempt).not.toBeNull();
    expect(routeHistoryOpenV1(admission, modeAttempt, "mode-as-history").consumerResult)
      .toEqual({ kind: "unmapped", completion: null });
    expect(
      routePlaybackModeToggleV1(admission, "auto", modeAttempt, "mode-recovered")
        .consumerResult,
    ).toMatchObject({ kind: "toggled" });

    const authentic = admission.issueHistoryOpenAttemptInternalV1();
    if (authentic === null) throw new Error("expected authentic History attempt");
    expect(routeHistoryOpenV1(admission, Object.freeze({}), "spoof").consumerResult)
      .toEqual({ kind: "stale", completion: null });
    expect(
      routeHistoryOpenV1(admission, Object.freeze({ ...authentic }), "clone")
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(routeHistoryOpenV1(admission, authentic, "authentic").consumerResult)
      .toMatchObject({ kind: "requested" });
    expect(routeHistoryOpenV1(admission, authentic, "repeat").consumerResult)
      .toEqual({ kind: "stale", completion: null });

    const foreign = physicalHistoryHarnessV1();
    const foreignAttempt = foreign.admission.issueHistoryOpenAttemptInternalV1();
    expect(foreignAttempt).not.toBeNull();
    expect(routeHistoryOpenV1(admission, foreignAttempt, "foreign").consumerResult)
      .toEqual({ kind: "stale", completion: null });
    expect(
      routeHistoryOpenV1(foreign.admission, foreignAttempt, "foreign-own")
        .consumerResult,
    ).toMatchObject({ kind: "requested" });
    foreign.admission.disposeInternalV1();
    admission.disposeInternalV1();
  });

  it("spends a pre-signed History route while content-auto owns the shared callback claim", () => {
    let fixture!: ReturnType<typeof physicalSayHarnessV1>;
    let presigned: NarrativeStableHistoryOpenActionAttemptInternalV1 | null = null;
    let envelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    let nestedResult: NarrativeStablePhysicalActionDispatchResultInternalV1 | null = null;
    const availability = vi.fn(() => true);
    const capturePhase = vi.fn(() => {
      expect(fixture.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
      nestedResult = fixture.admission.routeInternalV1(envelope, presigned).consumerResult;
      return "incomplete" as const;
    });
    fixture = physicalSayHarnessV1({
      advancePolicy: "auto",
      historyAvailabilityPort: historyAvailabilityPortV1(availability),
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: capturePhase,
        revealAllInternalV1: vi.fn(),
      }),
    });
    presigned = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(presigned).not.toBeNull();
    envelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeToggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(
        "gesture.narrative.history-content-auto-claim",
      ),
    });
    const automaticAttempt = fixture.controller.issueContentAutoAttemptInternalV1();
    expect(automaticAttempt).not.toBeNull();
    expect(fixture.controller.dispatchContentAutoInternalV1(automaticAttempt)).toEqual({
      kind: "not_ready",
      completion: null,
    });
    expect(nestedResult).toEqual({ kind: "stale", completion: null });
    expect(availability).not.toHaveBeenCalled();
    expect(
      routeHistoryOpenV1(fixture.admission, presigned, "content-auto-spent").consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    const fresh = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(routeHistoryOpenV1(fixture.admission, fresh, "content-auto-released").consumerResult)
      .toMatchObject({ kind: "requested" });
    expect(availability).toHaveBeenCalledOnce();
    fixture.controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("reuses the shared callback claim across History reentry and releases unspent competitors", () => {
    let fixture!: ReturnType<typeof physicalHistoryHarnessV1>;
    let nestedAttempt: NarrativeStableHistoryOpenActionAttemptInternalV1 | null = null;
    let nestedEnvelope!: ReturnType<
      NarrativeStablePhysicalActionAdmissionInternalV1["createEnvelopeInternalV1"]
    >;
    const availability = vi.fn(() => {
      expect(fixture.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
      expect(fixture.admission.issuePlaybackModeToggleAttemptInternalV1("auto"))
        .toBeNull();
      expect(() => fixture.admission.routeInternalV1(nestedEnvelope, nestedAttempt))
        .toThrowError("ui.managed_surface_action_route_in_progress");
      return true;
    });
    fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(availability),
    });
    nestedAttempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
    const outerAttempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(nestedAttempt).not.toBeNull();
    expect(outerAttempt).not.toBeNull();
    nestedEnvelope = fixture.admission.createEnvelopeInternalV1({
      actionId: narrativeToggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1("gesture.narrative.history-nested"),
    });
    expect(routeHistoryOpenV1(fixture.admission, outerAttempt, "outer").consumerResult)
      .toMatchObject({ kind: "requested" });
    expect(
      routeHistoryOpenV1(fixture.admission, nestedAttempt, "nested-after-release")
        .consumerResult,
    ).toMatchObject({ kind: "requested" });
    expect(availability).toHaveBeenCalledTimes(2);
    fixture.admission.disposeInternalV1();
  });

  it("makes semantic in-flight first-win without installing or clearing that claim", async () => {
    let resolveSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      resolveSemantic = resolve;
    });
    const availability = vi.fn(() => true);
    const fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(availability),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: () => semanticCompletion,
      }),
    });
    const controller = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "complete" as const,
        revealAllInternalV1: vi.fn(),
      }),
    });
    const presignedHistory = fixture.admission.issueHistoryOpenAttemptInternalV1();
    const sayAttempt = fixture.admission.issueSayActivationAttemptInternalV1(controller);
    const sayResult = fixture.admission.routeInternalV1(
      fixture.admission.createEnvelopeInternalV1({
        actionId: narrativeConfirmActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.history-semantic-winner",
        ),
      }),
      sayAttempt,
    );
    expect(sayResult.consumerResult).toMatchObject({ kind: "dispatched" });
    expect(fixture.admission.issueHistoryOpenAttemptInternalV1()).toBeNull();
    expect(
      routeHistoryOpenV1(fixture.admission, presignedHistory, "semantic-pending")
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(availability).not.toHaveBeenCalled();

    resolveSemantic("complete");
    if (sayResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected semantic completion");
    }
    await expect(sayResult.consumerResult.completion).resolves.toBe("complete");
    const fresh = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(routeHistoryOpenV1(fixture.admission, fresh, "semantic-released").consumerResult)
      .toMatchObject({ kind: "requested" });
    expect(availability).toHaveBeenCalledOnce();
    controller.disposeInternalV1();
    fixture.admission.disposeInternalV1();
  });

  it("guards cross-admission callback reentry and CAS-releases only the owned claim", () => {
    let fixture!: ReturnType<typeof physicalHistoryHarnessV1>;
    let successor: NarrativeStablePhysicalActionAdmissionInternalV1 | null = null;
    let controller!: NarrativeStableSayRevealControllerInternalV1;
    let calls = 0;
    const availability = vi.fn(() => {
      calls += 1;
      if (calls !== 1) return true;
      fixture.admission.disposeInternalV1();
      successor = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: () => true,
      });
      expect(successor.issueHistoryOpenAttemptInternalV1()).toBeNull();
      expect(successor.issuePlaybackModeToggleAttemptInternalV1("auto")).toBeNull();
      expect(successor.issueSayActivationAttemptInternalV1(controller)).toBeNull();
      return true;
    });
    fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(availability),
    });
    controller = createNarrativeStableSayRevealControllerInternalV1({
      bridge: fixture.harness.bridge,
      revealGenerationPort: Object.freeze({
        capturePhaseInternalV1: () => "incomplete" as const,
        revealAllInternalV1: vi.fn(),
      }),
    });
    const outerAttempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
    expect(
      routeHistoryOpenV1(fixture.admission, outerAttempt, "dispose-recreate")
        .consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    if (successor === null) throw new Error("expected successor History admission");
    const installedSuccessor =
      successor as unknown as NarrativeStablePhysicalActionAdmissionInternalV1;
    const fresh = installedSuccessor.issueHistoryOpenAttemptInternalV1();
    expect(routeHistoryOpenV1(installedSuccessor, fresh, "successor-fresh").consumerResult)
      .toMatchObject({ kind: "requested" });
    expect(availability).toHaveBeenCalledTimes(2);
    controller.disposeInternalV1();
    installedSuccessor.disposeInternalV1();
  });

  it("gives every post-callback parent, source, suspension, and terminal drift stale precedence", () => {
    for (
      const drift of [
        "replacement",
        "readiness_retry",
        "suspension",
        "bridge_terminal",
        "coordinator_terminal",
      ] as const
    ) {
      let fixture!: ReturnType<typeof physicalHistoryHarnessV1>;
      const availability = vi.fn(() => {
        if (drift === "replacement") {
          expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
            .toMatchObject({ kind: "applied" });
          return true;
        }
        if (drift === "readiness_retry") {
          expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
            .toMatchObject({ kind: "applied" });
          const entry = fixture.harness.kernel.getStateInternalV1()
            .stableRuntimeBindings[0];
          if (entry?.binding.kind !== "preparing") {
            throw new Error("expected replacement preparation");
          }
          expect(fixture.harness.kernel.settleStableReadinessFailedInternalV1({
            readinessEvidence: Object.freeze({
              applicationEpoch: applicationEpochV1,
              surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
            }),
            publisherLease: entry.desiredTarget.publisherLease,
            sourceRevision: entry.desiredTarget.sourceRevision,
          })).toMatchObject({ kind: "applied" });
          expect(fixture.harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
            kind: "applied",
          });
          return false;
        }
        if (drift === "suspension") {
          suspendCurrentNarrativeV1(fixture.harness);
          return "not-boolean" as unknown as boolean;
        }
        if (drift === "bridge_terminal") {
          fixture.harness.bridge.disposeInternalV1();
          throw new Error("terminal callback fault must lose to stale");
        }
        fixture.harness.kernel.transitionTransientInternalV1({
          kind: "dispose_coordinator",
        });
        return true;
      });
      fixture = physicalHistoryHarnessV1({
        historyAvailabilityPort: historyAvailabilityPortV1(availability),
      });
      const attempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
      const result = expectHistoryRouteConsumedV1(
        routeHistoryOpenV1(fixture.admission, attempt, `post-call-${drift}`),
      );
      expect(result).toEqual({ kind: "stale", completion: null });
      expect(Reflect.ownKeys(result)).toEqual(["kind", "completion"]);
      expect(availability).toHaveBeenCalledOnce();
      fixture.admission.disposeInternalV1();
    }
  });

  it.each(
    [
      ["true", (): boolean => true, "requested"],
      ["false", (): boolean => false, "ignored"],
      ["throw", (): boolean => {
        throw new Error("barrier availability fault");
      }, "faulted"],
      ["nonboolean", (): boolean => 1 as unknown as boolean, "faulted"],
    ] as const,
  )("keeps Barrier Stage and semantic authority exact zero for %s", (
    label,
    outcome,
    expectedKind,
  ) => {
    const semanticDispatch = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const fixture = narrativeBarrierHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(outcome),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1: semanticDispatch,
      }),
    });
    let stageNotifications = 0;
    const unsubscribe = fixture.stage.reconciler.subscribe(() => {
      stageNotifications += 1;
    });
    const stageFrame = fixture.stage.reconciler.frame();
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const attempt = admission.issueHistoryOpenAttemptInternalV1();
    const result = expectHistoryRouteConsumedV1(
      routeHistoryOpenV1(admission, attempt, `barrier-${label}`),
    );
    expect(result.kind).toBe(expectedKind);
    expect(semanticDispatch).not.toHaveBeenCalled();
    expect(fixture.stage.reconciler.frame()).toEqual(stageFrame);
    expect(stageNotifications).toBe(0);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    unsubscribe();
    admission.disposeInternalV1();
    fixture.controller.disposeInternalV1();
  });

  it("mints fresh opaque History intents across 10k attempts without production state growth", () => {
    let availabilityReads = 0;
    const fixture = physicalHistoryHarnessV1({
      historyAvailabilityPort: historyAvailabilityPortV1(() => {
        availabilityReads += 1;
        return true;
      }),
    });
    const state = fixture.harness.kernel.getStateInternalV1();
    const notifications = fixture.harness.stateNotificationCount();
    const publisherBefore = publisherSnapshotV1(fixture.harness);
    let previousIntent: NarrativeStableHistoryOpenIntentInternalV1 | null = null;
    for (let index = 0; index < 10_000; index += 1) {
      const attempt = fixture.admission.issueHistoryOpenAttemptInternalV1();
      if (attempt === null) throw new Error("expected bounded History attempt");
      const result = expectHistoryRouteConsumedV1(
        routeHistoryOpenV1(fixture.admission, attempt, `bounded-${String(index)}`),
      );
      if (result.kind !== "requested") throw new Error("expected History intent");
      expect(result.intent).not.toBe(previousIntent);
      expect(Object.isFrozen(result.intent)).toBe(true);
      expect(Reflect.ownKeys(result.intent)).toEqual([]);
      previousIntent = result.intent;
    }
    expect(availabilityReads).toBe(10_000);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(fixture.harness.stateNotificationCount()).toBe(notifications);
    expect(publisherSnapshotV1(fixture.harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: publisherBefore.sourceRevisionIssuanceHighWater,
      occurrenceIssuanceHighWater: publisherBefore.occurrenceIssuanceHighWater,
    });
    fixture.admission.disposeInternalV1();
  });
});
