// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  createSemanticStageStateV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  type AssetId,
  type SemanticStageStateV1,
  type StageContentCatalogV1,
  type StageRenderTargetV1,
  type StageTransitionCatalogV1,
  type StageTransitionDefinitionV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

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
  StageReconcilerV1,
  StageRetargetInputV1,
  StageTransitionAcknowledgmentV1,
} from "../stage/stage-reconciler.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
  parseManagedSurfaceSlotIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
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
  createNarrativeStableSayRevealControllerInternalV1,
  type CreateNarrativeStablePhysicalActionAdmissionInputInternalV1,
  type CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1,
  type CreateNarrativeStableSayRevealControllerInputInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableCandidatePreflightRejectionCodeInternalV1,
  type NarrativeStableCandidatePreflightResultInternalV1,
  type NarrativeStableChoiceActionAttemptInternalV1,
  type NarrativeStableBarrierAcknowledgmentControllerInternalV1,
  type NarrativeStableBarrierStageRetargetResultInternalV1,
  type NarrativeStableBarrierTerminalDispatchResultInternalV1,
  type NarrativeStableCustomActionAttemptInternalV1,
  type NarrativeStablePauseResumeActionAttemptInternalV1,
  type NarrativeStablePauseExpiryControllerAttemptInternalV1,
  type NarrativeStablePauseExpiryControllerInternalV1,
  type NarrativeStablePauseExpiryDispatchResultInternalV1,
  type NarrativeStablePhysicalActionAdmissionInternalV1,
  type NarrativeStablePhysicalActionDispatchResultInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStablePublisherBridgeResultInternalV1,
  type NarrativeStableRequiredPortIdInternalV1,
  type NarrativeStableSayActivationAttemptInternalV1,
  type NarrativeStableSayContentAutoAttemptInternalV1,
  type NarrativeStableSayContentAutoDispatchResultInternalV1,
  type NarrativeStableSayRevealControllerInternalV1,
  type NarrativeStableSayRevealGenerationPortInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
} from "./narrative-managed-surface-family.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(91);
const narrativeChooseActionIdV1 = parseManagedSurfaceActionIdV1("narrative.choose");
const narrativeConfirmActionIdV1 = parseManagedSurfaceActionIdV1("ui.confirm");
const narrativeAdvanceActionIdV1 = parseManagedSurfaceActionIdV1("narrative.advance");
const narrativeResumeActionIdV1 = parseManagedSurfaceActionIdV1("narrative.resume");
const narrativeCustomActionIdV1 = parseManagedSurfaceActionIdV1("narrative.custom");
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
const defaultCandidateSnapshotV1 = Object.freeze({
  rendererComponent: Object.freeze({ kind: "dialogue-renderer" }),
  visualConfig: Object.freeze({ skin: "test" }),
  semanticDispatchPort: defaultSemanticDispatchPortV1,
  historyObservationPort: Object.freeze({ kind: "history-observation" }),
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
  readonly playerProfile?: unknown;
  readonly presentationClock?: unknown;
} = {}) {
  const semanticDispatchPort = input.semanticDispatchPort ?? defaultSemanticDispatchPortV1;
  const harness = harnessV1({
    candidatePreflight: Object.freeze({
      preflightCandidateInternalV1: () =>
        capturedCandidatePreflightResultV1(Object.freeze({
          ...defaultCandidateSnapshotV1,
          semanticDispatchPort,
          playerProfile: input.playerProfile ?? defaultCandidateSnapshotV1.playerProfile,
          presentationClock: input.presentationClock ??
            defaultCandidateSnapshotV1.presentationClock,
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
      contractRevision: 1,
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
        "player.toggle_ui",
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
    });
    expect(Object.isFrozen(captured)).toBe(true);
    expect(captured?.rendererComponent).toBe(defaultCandidateSnapshotV1.rendererComponent);
    expect(captured?.semanticDispatchPort).not.toBe(defaultSemanticDispatchPortV1);
    expect(Object.isFrozen(captured?.semanticDispatchPort)).toBe(true);
    expect(Reflect.ownKeys(captured?.semanticDispatchPort as object)).toEqual([]);

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
    expect(snapshotDescriptorReads).toBe(9);
    expect(snapshotValueReads).toBe(0);
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
      },
    });
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame?.pending)).toBe(true);
    expect(frame?.candidateSnapshot.semanticDispatchPort).not.toBe(
      defaultSemanticDispatchPortV1,
    );
    expect(Reflect.ownKeys(frame?.candidateSnapshot.semanticDispatchPort as object)).toEqual([]);
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

  it("claims one exact current Barrier controller without burning construction failure", () => {
    expectTypeOf<NarrativeStableBarrierAcknowledgmentControllerInternalV1>().toMatchTypeOf<{
      retargetCurrentBarrierStageInternalV1(
        retarget: StageRetargetInputV1,
      ): NarrativeStableBarrierStageRetargetResultInternalV1;
      flushRetainedTerminalInternalV1():
        | NarrativeStableBarrierTerminalDispatchResultInternalV1
        | null;
      disposeInternalV1(): void;
    }>();

    const noBarrier = harnessV1();
    const noBarrierStage = createBarrierStageHarnessV1({});
    expect(() =>
      createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
        bridge: noBarrier.bridge,
        stageReconciler: noBarrierStage.reconciler,
      })
    ).toThrow(TypeError);

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
});
