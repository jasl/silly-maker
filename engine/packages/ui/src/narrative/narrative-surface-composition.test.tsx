// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import {
  appendNarrativeHistoryV1,
  createSemanticStageStateV1,
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  type AssetId,
  type DeepReadonly,
  type PendingInteractionV1,
  type SemanticStageStateV1,
  type StageContentCatalogV1,
  type StageRenderTargetV1,
  type StageTransitionDefinitionV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ManagedSurfaceCoordinatorRuntimeV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import { createWorkspaceOverlaySessionConfigurationInternalV1 } from "../overlays/workspace-overlay-session.ts";
import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";
import {
  createSemanticStageCompositionDriverInternalV1,
  SemanticStageCompositionClaimantProviderInternalV1,
  SemanticStageV1,
} from "../stage/semantic-stage.tsx";
import { createStageReconcilerV1 } from "../stage/stage-reconciler.ts";
import { systemDialogManagedContractInternalV1 } from "../system/system-dialog-managed-contract.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightResultInternalV1,
} from "./narrative-managed-surface-family.ts";
import * as narrativeSurfaceCompositionModuleInternalV1 from "./narrative-surface-composition.tsx";
import {
  appendNarrativeManagedSurfaceRecipeInternalV1,
  createNarrativeSurfaceCompositionDefinitionInternalV1,
  createNarrativeSurfaceCompositionRuntimeInternalV1,
  defineNarrativeSurfaceV1,
  type NarrativeSurfaceDialogueRendererPropsV1,
  type NarrativeSurfaceCompositionDefinitionInternalV1,
  type NarrativeSurfaceChoiceAvailabilityInternalV1,
  type NarrativeSurfaceSelectionInternalV1,
} from "./narrative-surface-composition.tsx";

afterEach(cleanup);

interface SemanticFixturePublicationV1 {
  readonly selection: NarrativeSurfaceSelectionInternalV1;
}

function sayPendingV1(sequence: number, textId = "text.test.line"): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "say",
    definitionId: "narrative.test.say",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    speakerTextId: "text.test.speaker",
    textId,
    advancePolicy: "confirm",
  });
}

function choicePendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "narrative.test.choice",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    promptTextId: "text.test.prompt",
    options: [
      { choiceId: "choice.test.first", textId: "text.test.first" },
      { choiceId: "choice.test.second", textId: "text.test.second" },
    ],
  });
}

function barrierPendingV1(
  sequence: number,
  loadRecovery: "settle" | "replay" = "settle",
): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "presentation_barrier",
    definitionId: "narrative.test.presentation-barrier",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    expectedTransitionId: "transition.test.fade",
    loadRecovery,
  });
}

function selectionV1(input: {
  readonly pending?: PendingInteractionV1 | null;
  readonly historySequence?: number;
  readonly choiceAvailability?: readonly NarrativeSurfaceChoiceAvailabilityInternalV1[] | null;
} = {}): NarrativeSurfaceSelectionInternalV1 {
  const history = input.historySequence === undefined
    ? emptyNarrativeHistoryV1
    : appendNarrativeHistoryV1(
      emptyNarrativeHistoryV1,
      Object.freeze({
        kind: "say" as const,
        occurrenceId: `interaction-occurrence.${String(input.historySequence + 100)}`,
        definitionId: "narrative.test.say",
        seenRevision: 1,
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        voiceAssetId: null,
      }),
    );
  return {
    pending: input.pending ?? null,
    history,
    choiceAvailability: input.choiceAvailability ?? null,
  };
}

function semanticSourceV1(initial: NarrativeSurfaceSelectionInternalV1) {
  let current: SemanticFixturePublicationV1 = Object.freeze({ selection: initial });
  const listeners = new Set<() => void>();
  return Object.freeze({
    source: Object.freeze({
      getSnapshotInternalV1: () => current,
      subscribeInternalV1(listener: () => void) {
        listeners.add(listener);
        return Object.freeze(() => listeners.delete(listener));
      },
    }),
    publish(selection: NarrativeSurfaceSelectionInternalV1): void {
      current = Object.freeze({ selection });
      for (const listener of [...listeners]) listener();
    },
    /** Models a lost publication: the snapshot advances, listeners never fire. */
    publishSilently(selection: NarrativeSurfaceSelectionInternalV1): void {
      current = Object.freeze({ selection });
    },
    listenerCount: () => listeners.size,
  });
}

function candidatePreflightV1(
  _pending: PendingInteractionV1,
  _rendererKey: string,
  selection: NarrativeSurfaceSelectionInternalV1,
  semanticDispatchPort: Readonly<{
    readonly dispatchResolutionInternalV1: (request: unknown) => unknown;
  }> = Object.freeze({
    dispatchResolutionInternalV1: () => Promise.resolve(undefined),
  }),
): NarrativeStableCandidatePreflightResultInternalV1 {
  const rendererComponent = Object.freeze(() => null);
  return Object.freeze({
    kind: "captured" as const,
    candidateSnapshot: Object.freeze({
      rendererComponent,
      visualConfig: Object.freeze({}),
      semanticDispatchPort,
      history: Object.freeze({
        rendererComponent,
        observationPort: Object.freeze({
          getSnapshotInternalV1: () => selection.history,
          subscribeInternalV1: () => Object.freeze(() => undefined),
        }),
        availabilityPort: Object.freeze({
          readHistoryAvailabilityInternalV1: () => selection.history.entries.length > 0,
        }),
      }),
      playerProfile: Object.freeze({
        getSnapshotInternalV1: () => defaultPlayerProfileV1,
        subscribeInternalV1: () => Object.freeze(() => undefined),
        markSeenInternalV1: () => undefined,
      }),
      presentationClock: Object.freeze({
        nowInternalV1: () => 0,
        requestTickInternalV1: () => Object.freeze(() => undefined),
        prefersReducedMotionInternalV1: () => false,
      }),
      textResolver: Object.freeze({
        resolveTextInternalV1: (textId: string) => textId,
      }),
      voiceReplayPort: null,
      quickMenuContribution: null,
    }),
  });
}

function definitionV1(): NarrativeSurfaceCompositionDefinitionInternalV1<
  SemanticFixturePublicationV1
> {
  return createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
    historyEnabledInternalV1: true,
    selectNarrativeInternalV1: (
      publication: DeepReadonly<SemanticFixturePublicationV1>,
    ) => publication.selection,
    preflightCandidateInternalV1: (
      pending: PendingInteractionV1,
      rendererKey: string,
      selection: NarrativeSurfaceSelectionInternalV1,
    ) => candidatePreflightV1(pending, rendererKey, selection),
  }));
}

function definitionWithDispatchV1(
  semanticDispatchPort: Readonly<{
    readonly dispatchResolutionInternalV1: (request: unknown) => unknown;
  }>,
): NarrativeSurfaceCompositionDefinitionInternalV1<SemanticFixturePublicationV1> {
  return createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
    historyEnabledInternalV1: true,
    selectNarrativeInternalV1: (
      publication: DeepReadonly<SemanticFixturePublicationV1>,
    ) => publication.selection,
    preflightCandidateInternalV1: (
      pending: PendingInteractionV1,
      rendererKey: string,
      selection: NarrativeSurfaceSelectionInternalV1,
    ) => candidatePreflightV1(pending, rendererKey, selection, semanticDispatchPort),
  }));
}

function runtimeHarnessV1(input: {
  readonly selection?: NarrativeSurfaceSelectionInternalV1;
  readonly definition?:
    | NarrativeSurfaceCompositionDefinitionInternalV1<
      SemanticFixturePublicationV1
    >
    | null;
  readonly createDefinition?: (
    semantic: ReturnType<typeof semanticSourceV1>,
  ) => NarrativeSurfaceCompositionDefinitionInternalV1<SemanticFixturePublicationV1>;
  readonly reportFailure?: (error: unknown) => void;
  readonly reportObservation?: (code: "narrative.barrier_replay_unsupported") => void;
  readonly sealCompositionOnFailure?: (error: unknown) => void;
} = {}) {
  const narrativeFamily = createNarrativeManagedSurfaceFamilyContractInternalV1({ history: true });
  const recipe = appendNarrativeManagedSurfaceRecipeInternalV1(
    Object.freeze({
      resolvedOwnerIds: Object.freeze([]),
      resolvedSlotDescriptors: Object.freeze([]),
    }),
    narrativeFamily,
  );
  const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
    applicationEpoch: parseNonNegativeSafeInteger(7),
    recipe,
    definitionSidecars: narrativeFamily.stableDefinitionSidecars,
  }));
  const bundles = new Map<number, ManagedSurfaceCompositeKernelBundleInternalV1>([[7, bundle]]);
  let activeBundle = bundle;
  const semantic = semanticSourceV1(input.selection ?? selectionV1());
  const createRuntime = (
    nextBundle: ManagedSurfaceCompositeKernelBundleInternalV1,
    activationKind: "initial" | "successor",
  ): ManagedSurfaceCoordinatorRuntimeV1 =>
    Object.freeze({
      applicationEpoch: nextBundle.applicationEpoch,
      activationKind,
      coordinator: nextBundle.coordinator,
      gestureLease: Object.freeze({
        begin: () => {
          throw new TypeError("unused");
        },
        isCurrent: () => false,
        revoke: () => undefined,
      }),
      bindCurrentInput: () => {
        throw new TypeError("unused");
      },
      isIngressOpen: () => true,
    }) as ManagedSurfaceCoordinatorRuntimeV1;
  const runtime = createRuntime(bundle, "initial");
  const stageClaimant = Object.freeze({});
  const composition = createNarrativeSurfaceCompositionRuntimeInternalV1({
    family: narrativeFamily,
    definition: input.createDefinition?.(semantic) ??
      (input.definition === undefined ? definitionV1() : input.definition),
    environment: null,
    presentation: semantic.source,
    resolveKernelBundleInternalV1: (candidateRuntime) => {
      const resolved = bundles.get(candidateRuntime.applicationEpoch);
      if (resolved === undefined) throw new TypeError("fixture.kernel_bundle_missing");
      return resolved;
    },
    stageClaimant,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
    ...(input.reportObservation === undefined
      ? {}
      : { reportObservation: input.reportObservation }),
    ...(input.sealCompositionOnFailure === undefined
      ? {}
      : { sealCompositionOnFailure: input.sealCompositionOnFailure }),
  });
  const activation = { open: false };
  composition.prepareRuntimeAttachmentInternalV1(
    runtime,
    Object.freeze({ isOpen: () => activation.open }),
  );
  const notify = composition.activateRuntimeAttachmentInternalV1();
  return Object.freeze({
    bundle,
    semantic,
    runtime,
    composition,
    stageClaimant,
    getCurrentBundle: () => activeBundle,
    open(): void {
      activation.open = true;
      notify();
    },
    successor(selection: NarrativeSurfaceSelectionInternalV1) {
      composition.detachRuntimeInternalV1();
      semantic.publish(selection);
      const nextEpoch = parseNonNegativeSafeInteger(activeBundle.applicationEpoch + 1);
      const nextBundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: nextEpoch,
        recipe,
        definitionSidecars: narrativeFamily.stableDefinitionSidecars,
      }));
      bundles.set(nextEpoch, nextBundle);
      const nextRuntime = createRuntime(nextBundle, "successor");
      const nextActivation = { open: false };
      composition.prepareRuntimeAttachmentInternalV1(
        nextRuntime,
        Object.freeze({ isOpen: () => nextActivation.open }),
      );
      const activate = composition.activateRuntimeAttachmentInternalV1();
      nextActivation.open = true;
      activate();
      activeBundle = nextBundle;
      return Object.freeze({ bundle: nextBundle, runtime: nextRuntime });
    },
  });
}

function currentNarrativeBaselineV1(harness: ReturnType<typeof runtimeHarnessV1>) {
  const baseline = harness.bundle.compositeRuntimeKernel.getStateInternalV1()
    .stableAcceptedBaselines[0];
  if (baseline === undefined) throw new Error("expected Narrative baseline");
  return baseline;
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

function barrierStageStateV1(contentId: string): SemanticStageStateV1 {
  const initial = createSemanticStageStateV1({
    stageId: "stage.test.barrier",
    layerIds: ["layer.test.barrier"],
  });
  const result = reduceStageMutationsV1(initial, [{
    kind: "show",
    layerId: "layer.test.barrier",
    tag: "tag.test.barrier",
    contentId,
  }]);
  if (result.kind !== "applied") throw new Error("expected Barrier Stage fixture");
  return result.state;
}

function barrierStageTargetV1(contentId: string): StageRenderTargetV1 {
  return projectStageRenderTargetV1(
    barrierStageStateV1(contentId),
    barrierStageContentCatalogV1,
  ).target;
}

function barrierTransitionV1(durationMs = 0): StageTransitionDefinitionV1 {
  return parseStageTransitionDefinitionV1({
    transitionId: "transition.test.fade",
    kind: durationMs === 0 ? "cut" : "crossfade",
    durationMs,
    easing: "linear",
    inputPolicy: "target_active",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: true,
    slide: null,
  });
}

const barrierStageRendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-barrier-stage-content={entry.contentId} />
);

function bindBarrierStageV1(
  harness: ReturnType<typeof runtimeHarnessV1>,
  durationMs = 0,
) {
  const clock = createManualPresentationClockV1();
  const transition = barrierTransitionV1(durationMs);
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: Object.freeze({
      resolveTransition: () => transition,
      resolveTransitionById: (transitionId: string) =>
        transitionId === transition.transitionId ? transition : null,
    }),
  });
  const driver = createSemanticStageCompositionDriverInternalV1(
    reconciler,
    harness.stageClaimant,
  );
  const release = harness.composition.bindStageReconcilerInternalV1(reconciler, driver);
  return Object.freeze({
    clock,
    reconciler,
    driver,
    release,
    initialTarget: barrierStageTargetV1("content.test.barrier-a"),
    nextTarget: barrierStageTargetV1("content.test.barrier-b"),
  });
}

function settleCurrentNarrativeReadyV1(harness: ReturnType<typeof runtimeHarnessV1>): void {
  const bundle = harness.getCurrentBundle();
  const entry = bundle.compositeRuntimeKernel.getStateInternalV1()
    .stableRuntimeBindings.find((candidate) => candidate.binding.kind === "preparing");
  if (entry?.binding.kind !== "preparing") throw new Error("expected Narrative preparation");
  expect(bundle.compositeRuntimeKernel.settleStableReadinessReadyInternalV1({
    readinessEvidence: Object.freeze({
      applicationEpoch: bundle.applicationEpoch,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  })).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
}

function deferredV1<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

describe("Narrative Surface composition definition", () => {
  it("admits ordinary public definition fields", () => {
    const valid = {
      selectNarrative: (publication: SemanticFixturePublicationV1) => publication.selection,
      dispatchResolution: async () => undefined,
      dispatchTime: null,
      renderer: (_props: NarrativeSurfaceDialogueRendererPropsV1) => null,
      history: null,
      resolveText: (locale: string | null, textId: string) => `${locale ?? "default"}:${textId}`,
      replayCurrentVoice: null,
    };
    const core = defineNarrativeSurfaceV1(valid);
    expect(
      (core as NarrativeSurfaceCompositionDefinitionInternalV1<SemanticFixturePublicationV1>)
        .historyEnabledInternalV1,
    ).toBe(false);
    const full = defineNarrativeSurfaceV1({
      ...valid,
      history: { renderer: (_props: unknown) => null },
    });
    expect(
      (full as NarrativeSurfaceCompositionDefinitionInternalV1<SemanticFixturePublicationV1>)
        .historyEnabledInternalV1,
    ).toBe(true);

    expect(() =>
      defineNarrativeSurfaceV1({
        ...valid,
        renderer: null,
      } as never)
    ).toThrowError(new TypeError("ui.narrative_surface_definition_invalid"));
  });
});

describe("Narrative Surface stable composite runtime", () => {
  it("does not retain a Narrative-named composite-kernel factory", () => {
    expect(
      Object.hasOwn(
        narrativeSurfaceCompositionModuleInternalV1,
        "createNarrativeSurfaceCompositeKernelBundleInternalV1",
      ),
    ).toBe(false);
  });

  it("builds the exact Overlay/System/Narrative owner and slot recipe", () => {
    const overlay = createWorkspaceOverlaySessionConfigurationInternalV1({
      definitions: Object.freeze([]),
    });
    const family = createNarrativeManagedSurfaceFamilyContractInternalV1({ history: true });
    const recipe = appendNarrativeManagedSurfaceRecipeInternalV1(
      Object.freeze({
        resolvedOwnerIds: Object.freeze([
          ...overlay.recipeContribution.resolvedOwnerIds,
          ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
        ]),
        resolvedSlotDescriptors: Object.freeze([
          ...overlay.recipeContribution.resolvedSlotDescriptors,
          ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
        ]),
      }),
      family,
    );
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe,
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const state = bundle.compositeRuntimeKernel.getStateInternalV1().transientState;

    expect(state.resolvedOwnerIds).toEqual([
      "surface-owner.workspace-overlay",
      "surface-owner.system",
      "surface-owner.narrative",
    ]);
    expect(state.resolvedSlotDescriptors).toEqual([
      {
        kind: "root",
        slotId: "surface-slot.workspace-overlay.primary",
        cardinality: "single",
      },
      {
        kind: "root",
        slotId: "surface-slot.system.root",
        cardinality: "single",
      },
      {
        kind: "child",
        parentDefinitionId: "surface.system.saves",
        slotId: "surface-slot.system.confirmation",
        cardinality: "single",
      },
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
  });

  it("registers initial null as unpublished on the shared composite kernel", () => {
    const harness = runtimeHarnessV1();
    expect(currentNarrativeBaselineV1(harness)).toMatchObject({ kind: "unpublished" });
    expect(harness.semantic.listenerCount()).toBe(1);
    harness.open();
    expect(harness.composition.getCurrentSessionInternalV1()).not.toBeNull();
    expect(harness.composition.getStageClaimantInternalV1()).toBe(harness.stageClaimant);
  });

  it("applies a fresh pending after setup and keeps passive observation churn on one target", () => {
    const reportFailure = vi.fn();
    const harness = runtimeHarnessV1({ reportFailure });
    harness.open();
    const firstPending = sayPendingV1(1);
    harness.semantic.publish(selectionV1({ pending: firstPending }));
    expect(reportFailure).not.toHaveBeenCalled();
    expect({
      baselines: harness.bundle.compositeRuntimeKernel.getStateInternalV1()
        .stableAcceptedBaselines.length,
      session: harness.composition.getCurrentSessionInternalV1() === null ? "null" : "current",
      listeners: harness.semantic.listenerCount(),
    }).toEqual({ baselines: 1, session: "current", listeners: 1 });
    const first = currentNarrativeBaselineV1(harness);
    expect(first).toMatchObject({ kind: "accepted", sourceRevision: 1 });
    if (first.kind !== "accepted") throw new Error("expected accepted baseline");
    const firstTarget = first.targets[0];

    harness.semantic.publish(selectionV1({ pending: firstPending, historySequence: 1 }));
    expect(reportFailure).not.toHaveBeenCalled();
    const passive = currentNarrativeBaselineV1(harness);
    expect(passive).toBe(first);
    expect(passive.kind === "accepted" ? passive.targets[0] : null).toBe(firstTarget);
    expect(harness.composition.getCurrentSelectionInternalV1()?.history.entries).toHaveLength(1);

    harness.semantic.publish(selectionV1({ pending: sayPendingV1(2) }));
    const successor = currentNarrativeBaselineV1(harness);
    expect(successor).toMatchObject({ kind: "accepted", sourceRevision: 2 });
    expect(successor.kind === "accepted" ? successor.targets[0] : null).not.toBe(firstTarget);
  });

  it("defers prepare-time publication churn until the shared gate opens", () => {
    const harness = runtimeHarnessV1();
    harness.semantic.publish(selectionV1({ pending: sayPendingV1(1) }));
    expect(currentNarrativeBaselineV1(harness)).toMatchObject({ kind: "unpublished" });
    harness.open();
    expect(currentNarrativeBaselineV1(harness)).toMatchObject({
      kind: "accepted",
      sourceRevision: 1,
    });
  });

  it("recaptures a publication advanced reentrantly by prepare-time preflight", () => {
    const first = sayPendingV1(1);
    const successor = sayPendingV1(2);
    let republished = false;
    const harness = runtimeHarnessV1({
      selection: selectionV1({ pending: first }),
      createDefinition: (semantic) =>
        createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
          historyEnabledInternalV1: true,
          selectNarrativeInternalV1: (
            publication: DeepReadonly<SemanticFixturePublicationV1>,
          ) => publication.selection,
          preflightCandidateInternalV1: (
            pending: PendingInteractionV1,
            rendererKey: string,
            selection: NarrativeSurfaceSelectionInternalV1,
          ) => {
            if (!republished && pending.occurrenceId === first.occurrenceId) {
              republished = true;
              semantic.publish(selectionV1({ pending: successor }));
            }
            return candidatePreflightV1(pending, rendererKey, selection);
          },
        })),
    });

    expect(harness.composition.getCurrentSelectionInternalV1()).toBeNull();
    harness.open();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending?.occurrenceId).toBe(
      successor.occurrenceId,
    );
    expect(currentNarrativeBaselineV1(harness)).toMatchObject({
      kind: "accepted",
      sourceRevision: 2,
    });
  });

  it("terminal-fences bounded prepare reentry that dirties the gate-open flush again", () => {
    let sequence = 1;
    const sealCompositionOnFailure = vi.fn();
    const harness = runtimeHarnessV1({
      selection: selectionV1({ pending: sayPendingV1(sequence) }),
      sealCompositionOnFailure,
      createDefinition: (semantic) =>
        createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
          historyEnabledInternalV1: true,
          selectNarrativeInternalV1: (
            publication: DeepReadonly<SemanticFixturePublicationV1>,
          ) => publication.selection,
          preflightCandidateInternalV1: (
            pending: PendingInteractionV1,
            rendererKey: string,
            selection: NarrativeSurfaceSelectionInternalV1,
          ) => {
            if (sequence < 4) {
              sequence += 1;
              semantic.publish(selectionV1({ pending: sayPendingV1(sequence) }));
            }
            return candidatePreflightV1(pending, rendererKey, selection);
          },
        })),
    });

    expect(() => harness.open()).not.toThrow();
    expect(sequence).toBe(4);
    expect(sealCompositionOnFailure).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSessionInternalV1()).toBeNull();
  });

  it("terminal-fences active preflight reentry instead of retaining a dirty snapshot", () => {
    let republished = false;
    const sealCompositionOnFailure = vi.fn();
    const harness = runtimeHarnessV1({
      sealCompositionOnFailure,
      createDefinition: (semantic) =>
        createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
          historyEnabledInternalV1: true,
          selectNarrativeInternalV1: (
            publication: DeepReadonly<SemanticFixturePublicationV1>,
          ) => publication.selection,
          preflightCandidateInternalV1: (
            pending: PendingInteractionV1,
            rendererKey: string,
            selection: NarrativeSurfaceSelectionInternalV1,
          ) => {
            if (!republished) {
              republished = true;
              semantic.publish(selectionV1({ pending: sayPendingV1(2) }));
            }
            return candidatePreflightV1(pending, rendererKey, selection);
          },
        })),
    });
    harness.open();

    expect(() => harness.semantic.publish(selectionV1({ pending: sayPendingV1(1) }))).not.toThrow();
    expect(sealCompositionOnFailure).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSessionInternalV1()).toBeNull();
  });

  it("updates same-occurrence Choice availability as passive observation only", () => {
    const pending = choicePendingV1(1);
    const enabled = [
      {
        choiceId: "choice.test.first",
        status: "enabled" as const,
        reasonTextIds: [],
      },
      {
        choiceId: "choice.test.second",
        status: "enabled" as const,
        reasonTextIds: [],
      },
    ];
    const harness = runtimeHarnessV1({
      selection: selectionV1({ pending, choiceAvailability: enabled }),
    });
    harness.open();
    const baseline = currentNarrativeBaselineV1(harness);
    if (baseline.kind !== "accepted") throw new Error("expected accepted Choice");
    const target = baseline.targets[0];

    harness.semantic.publish(selectionV1({
      pending,
      choiceAvailability: [
        {
          choiceId: "choice.test.first",
          status: "disabled" as const,
          reasonTextIds: ["text.test.unavailable"],
        },
        enabled[1]!,
      ],
    }));

    const passive = currentNarrativeBaselineV1(harness);
    expect(passive).toBe(baseline);
    expect(passive.kind === "accepted" ? passive.targets[0] : null).toBe(target);
    expect(harness.composition.getCurrentSelectionInternalV1()?.choiceAvailability?.[0])
      .toEqual({
        choiceId: "choice.test.first",
        status: "disabled",
        reasonTextIds: ["text.test.unavailable"],
      });
  });

  it("contains dirty activation faults and hostile failure reporters", () => {
    const reportFailure = vi.fn(() => {
      throw new Error("hostile reporter");
    });
    const sealCompositionOnFailure = vi.fn();
    const harness = runtimeHarnessV1({ reportFailure, sealCompositionOnFailure });
    harness.semantic.publish(Object.freeze({
      pending: sayPendingV1(1),
      history: emptyNarrativeHistoryV1,
      choiceAvailability: Object.freeze([]),
    }) as never);
    expect(() => harness.open()).not.toThrow();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(sealCompositionOnFailure).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSessionInternalV1()).toBeNull();
  });

  it("settles an initial coherent Barrier through presentation generation before retarget returns", async () => {
    let semantic!: ReturnType<typeof semanticSourceV1>;
    let retargetReturned = false;
    const dispatchResolution = vi.fn(() => {
      expect(retargetReturned).toBe(false);
      semantic.publish(selectionV1());
      return Promise.resolve("settled");
    });
    const harness = runtimeHarnessV1({
      selection: selectionV1({ pending: barrierPendingV1(1, "settle") }),
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    settleCurrentNarrativeReadyV1(harness);
    const stage = bindBarrierStageV1(harness);

    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    retargetReturned = true;

    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending).toBeNull();
    await Promise.resolve();
    stage.release();
    harness.composition.disposeInternalV1();
  });

  it("reports initial replay unsupported once across Stage mutation and StrictMode rebind", () => {
    const reportObservation = vi.fn();
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const harness = runtimeHarnessV1({
      selection: selectionV1({ pending: barrierPendingV1(1, "replay") }),
      reportObservation,
      definition: definitionWithDispatchV1(Object.freeze({
        dispatchResolutionInternalV1: dispatchResolution,
      })),
    });
    harness.open();
    settleCurrentNarrativeReadyV1(harness);
    const stage = bindBarrierStageV1(harness);
    const retarget = Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    });

    stage.driver.retargetInternalV1(retarget);
    stage.driver.resumeInternalV1();
    stage.driver.skipAllInternalV1();
    expect(reportObservation).toHaveBeenCalledTimes(1);
    expect(reportObservation).toHaveBeenCalledWith("narrative.barrier_replay_unsupported");
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending?.occurrenceId).toBe(
      barrierPendingV1(1).occurrenceId,
    );

    stage.release();
    const replayRelease = harness.composition.bindStageReconcilerInternalV1(
      stage.reconciler,
      stage.driver,
    );
    stage.driver.retargetInternalV1(retarget);
    expect(reportObservation).toHaveBeenCalledTimes(1);
    expect(dispatchResolution).not.toHaveBeenCalled();
    replayRelease();
    harness.composition.disposeInternalV1();
  });

  it("routes a later same-generation Barrier through acknowledged instant completion", async () => {
    let semantic!: ReturnType<typeof semanticSourceV1>;
    let retargetReturned = false;
    const dispatchResolution = vi.fn(() => {
      expect(retargetReturned).toBe(false);
      semantic.publish(selectionV1());
      return Promise.resolve("acknowledged");
    });
    const harness = runtimeHarnessV1({
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    const stage = bindBarrierStageV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    semantic.publish(selectionV1({ pending: barrierPendingV1(2, "settle") }));
    settleCurrentNarrativeReadyV1(harness);
    expect(dispatchResolution).not.toHaveBeenCalled();

    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    retargetReturned = true;

    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending).toBeNull();
    await Promise.resolve();
    stage.release();
    harness.composition.disposeInternalV1();
  });

  it("flushes an animated Barrier before the mounted Stage clock advance returns", async () => {
    const rawClock = createManualPresentationClockV1();
    let semantic!: ReturnType<typeof semanticSourceV1>;
    let advanceReturned = false;
    let observedAdvanceReturned: boolean | null = null;
    const dispatchResolution = vi.fn(() => {
      observedAdvanceReturned = advanceReturned;
      semantic.publish(selectionV1());
      return Promise.resolve("animated-acknowledged");
    });
    const harness = runtimeHarnessV1({
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    const transition = barrierTransitionV1(100);
    const catalog = Object.freeze({
      resolveTransition: () => transition,
      resolveTransitionById: (transitionId: string) =>
        transitionId === transition.transitionId ? transition : null,
    });
    const onBindInternalV1 = (
      reconciler: Parameters<
        NonNullable<
          Parameters<typeof SemanticStageCompositionClaimantProviderInternalV1>[0][
            "onBindInternalV1"
          ]
        >
      >[0],
      driver: Parameters<
        NonNullable<
          Parameters<typeof SemanticStageCompositionClaimantProviderInternalV1>[0][
            "onBindInternalV1"
          ]
        >
      >[1],
    ) => harness.composition.bindStageReconcilerInternalV1(reconciler, driver);
    const stage = (target: StageRenderTargetV1, revision: number) => (
      <SemanticStageCompositionClaimantProviderInternalV1
        claimant={harness.stageClaimant}
        onBindInternalV1={onBindInternalV1}
      >
        <SemanticStageV1
          target={target}
          revision={revision}
          epoch={7}
          catalog={catalog}
          renderers={{ "renderer.test.barrier-stage": barrierStageRendererV1 }}
          accessibleName="Narrative animated Barrier Stage"
          clock={rawClock}
        />
      </SemanticStageCompositionClaimantProviderInternalV1>
    );

    const initialTarget = barrierStageTargetV1("content.test.animated-a");
    const nextTarget = barrierStageTargetV1("content.test.animated-b");
    const mounted = render(stage(initialTarget, 1));
    await act(async () => {});
    act(() => semantic.publish(selectionV1({ pending: barrierPendingV1(3) })));
    settleCurrentNarrativeReadyV1(harness);
    mounted.rerender(stage(nextTarget, 2));
    await act(async () => {});
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(rawClock.pendingTickCount()).toBe(1);

    act(() => {
      rawClock.advance(100);
      advanceReturned = true;
    });

    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(observedAdvanceReturned).toBe(false);
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending).toBeNull();
    harness.composition.disposeInternalV1();
    mounted.unmount();
    await Promise.resolve();
  });

  it("settles a coherent application successor and fences its predecessor controller", async () => {
    let semantic!: ReturnType<typeof semanticSourceV1>;
    let successorRetargetReturned = false;
    const dispatchResolution = vi.fn((_request: unknown) => {
      expect(successorRetargetReturned).toBe(false);
      semantic.publish(selectionV1());
      return Promise.resolve("successor-settled");
    });
    const harness = runtimeHarnessV1({
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    const predecessorSession = harness.composition.getCurrentSessionInternalV1();
    if (predecessorSession === null) throw new Error("expected predecessor session");
    const predecessorHostLease = predecessorSession.attachHostInternalV1(Object.freeze({
      hostIdentity: Object.freeze({}),
    }));
    const stage = bindBarrierStageV1(harness, 100);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    semantic.publish(selectionV1({ pending: barrierPendingV1(10) }));
    settleCurrentNarrativeReadyV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    expect(stage.clock.pendingTickCount()).toBe(1);
    expect(dispatchResolution).not.toHaveBeenCalled();
    stage.driver.retargetInternalV1(Object.freeze({
      target: barrierStageTargetV1("content.test.barrier-b"),
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    expect(stage.clock.pendingTickCount()).toBe(1);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(harness.composition.getCurrentSessionInternalV1()).not.toBeNull();

    const successorPending = barrierPendingV1(11);
    const successor = harness.successor(selectionV1({ pending: successorPending }));
    settleCurrentNarrativeReadyV1(harness);
    expect(predecessorHostLease.isCurrentInternalV1()).toBe(false);
    expect(harness.composition.getCurrentSessionInternalV1()).not.toBe(predecessorSession);

    stage.driver.retargetInternalV1(Object.freeze({
      target: barrierStageTargetV1("content.test.barrier-successor"),
      revision: 3,
      epoch: successor.runtime.applicationEpoch,
    }));
    successorRetargetReturned = true;

    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution.mock.calls[0]?.[0]).toMatchObject({
      expectedOccurrenceId: successorPending.occurrenceId,
      resolution: { kind: "barrier_completed" },
    });
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending).toBeNull();
    expect(stage.driver.isCurrentInternalV1()).toBe(true);
    stage.clock.advance(100);
    expect(dispatchResolution).toHaveBeenCalledOnce();

    await Promise.resolve();
    stage.release();
    harness.composition.disposeInternalV1();
  });

  it("terminal-fences a current Barrier completion that rejects", async () => {
    const sealCompositionOnFailure = vi.fn();
    const harness = runtimeHarnessV1({
      sealCompositionOnFailure,
      definition: definitionWithDispatchV1(Object.freeze({
        dispatchResolutionInternalV1: () => Promise.reject(new Error("fixture.current-rejection")),
      })),
    });
    harness.open();
    const stage = bindBarrierStageV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    harness.semantic.publish(selectionV1({ pending: barrierPendingV1(1) }));
    settleCurrentNarrativeReadyV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));

    await Promise.resolve();
    await Promise.resolve();
    expect(sealCompositionOnFailure).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSessionInternalV1()).toBeNull();
    expect(stage.driver.isCurrentInternalV1()).toBe(false);
  });

  it("keeps a Story-rejected current Barrier acknowledgment as an unpublished no-op", async () => {
    const reportFailure = vi.fn();
    const sealCompositionOnFailure = vi.fn();
    const harness = runtimeHarnessV1({
      reportFailure,
      sealCompositionOnFailure,
      definition: definitionWithDispatchV1(Object.freeze({
        // The Story refuses the acknowledgment and leaves the session
        // unchanged: nothing publishes, the resolved completion is a no-op.
        dispatchResolutionInternalV1: () => Promise.resolve("fixture.story-rejection"),
      })),
    });
    harness.open();
    const stage = bindBarrierStageV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    harness.semantic.publish(selectionV1({ pending: barrierPendingV1(1) }));
    settleCurrentNarrativeReadyV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));

    await Promise.resolve();
    await Promise.resolve();
    expect(reportFailure).not.toHaveBeenCalled();
    expect(sealCompositionOnFailure).not.toHaveBeenCalled();
    expect(harness.composition.getCurrentSessionInternalV1()).not.toBeNull();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending?.occurrenceId).toBe(
      barrierPendingV1(1).occurrenceId,
    );
    stage.release();
    harness.composition.disposeInternalV1();
  });

  it("terminal-fences a current completion whose publication never reached the composition", async () => {
    const reportFailure = vi.fn();
    const sealCompositionOnFailure = vi.fn();
    let semantic!: ReturnType<typeof semanticSourceV1>;
    const dispatchResolution = vi.fn(() => {
      // The command commits and the source snapshot advances, but the
      // change notification is lost before it reaches this composition.
      semantic.publishSilently(selectionV1());
      return Promise.resolve("fixture.swallowed-publication");
    });
    const harness = runtimeHarnessV1({
      reportFailure,
      sealCompositionOnFailure,
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    const stage = bindBarrierStageV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    harness.semantic.publish(selectionV1({ pending: barrierPendingV1(1) }));
    settleCurrentNarrativeReadyV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));

    await Promise.resolve();
    await Promise.resolve();
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(
      reportFailure.mock.calls[0]?.[0] instanceof TypeError &&
        (reportFailure.mock.calls[0][0] as TypeError).message,
    ).toBe("ui.narrative_surface_completion_without_publication");
    expect(sealCompositionOnFailure).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSessionInternalV1()).toBeNull();
    expect(stage.driver.isCurrentInternalV1()).toBe(false);
  });

  it("ignores a late Barrier rejection after the exact source/frame advances", async () => {
    const pendingCompletion = deferredV1<unknown>();
    const reportFailure = vi.fn();
    const sealCompositionOnFailure = vi.fn();
    let semantic!: ReturnType<typeof semanticSourceV1>;
    const successor = barrierPendingV1(2);
    const dispatchResolution = vi.fn(() => {
      semantic.publish(selectionV1({ pending: successor }));
      return pendingCompletion.promise;
    });
    const harness = runtimeHarnessV1({
      reportFailure,
      sealCompositionOnFailure,
      createDefinition: (source) => {
        semantic = source;
        return definitionWithDispatchV1(Object.freeze({
          dispatchResolutionInternalV1: dispatchResolution,
        }));
      },
    });
    harness.open();
    const stage = bindBarrierStageV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.initialTarget,
      revision: 1,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    semantic.publish(selectionV1({ pending: barrierPendingV1(1) }));
    settleCurrentNarrativeReadyV1(harness);
    stage.driver.retargetInternalV1(Object.freeze({
      target: stage.nextTarget,
      revision: 2,
      epoch: parseNonNegativeSafeInteger(7),
    }));
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(harness.composition.getCurrentSelectionInternalV1()?.pending?.occurrenceId).toBe(
      successor.occurrenceId,
    );

    pendingCompletion.reject(new Error("fixture.stale-rejection"));
    await Promise.resolve();
    await Promise.resolve();
    expect(reportFailure).not.toHaveBeenCalled();
    expect(sealCompositionOnFailure).not.toHaveBeenCalled();
    expect(harness.composition.getCurrentSessionInternalV1()).not.toBeNull();
    stage.release();
    harness.composition.disposeInternalV1();
  });

  it("terminal-disposes the persistent claimed Stage driver before physical unmount", () => {
    const harness = runtimeHarnessV1();
    harness.open();
    const reconciler = createStageReconcilerV1({
      clock: Object.freeze({
        now: () => 0,
        requestTick: () => Object.freeze(() => undefined),
      }),
      catalog: Object.freeze({
        resolveTransition: () => null,
        resolveTransitionById: () => null,
      }),
    });
    const driver = createSemanticStageCompositionDriverInternalV1(
      reconciler,
      harness.stageClaimant,
    );
    const release = harness.composition.bindStageReconcilerInternalV1(reconciler, driver);
    expect(driver.isCurrentInternalV1()).toBe(true);

    harness.composition.disposeInternalV1();

    expect(driver.isCurrentInternalV1()).toBe(false);
    expect(() => release()).not.toThrow();
    expect(() => driver.resumeInternalV1()).not.toThrow();
  });
});
