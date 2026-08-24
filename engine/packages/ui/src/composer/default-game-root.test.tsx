// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { StrictMode, useEffect, useState } from "react";
import type { ReactElement } from "react";

import {
  createSemanticStageStateV1,
  emptyNarrativeHistoryV1,
  parsePendingInteractionV1,
  parseStageTransitionDefinitionV1,
  parseNonNegativeSafeInteger,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  timelineV1,
} from "@sillymaker/base";
import type {
  AssetId,
  DeepReadonly,
  PendingInteractionV1,
  SessionAnchorResultV1,
  StageContentCatalogV1,
  StageTransitionCatalogV1,
  TimelineCatalogV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import { createInputRouterV1 } from "../input/input-router.ts";
import { systemInputActionIdsV1 } from "../input/contracts.ts";
import {
  createWholeCanvasSurfaceCompositionDefinitionInternalV1,
  type WholeCanvasSurfaceRendererPropsInternalV1,
} from "../whole-canvas/whole-canvas-surface-composition.tsx";
import {
  defineNarrativeSurfaceV1,
  type NarrativeSurfaceChoiceAvailabilityInternalV1,
  type NarrativeSurfaceRendererPropsV1,
  type NarrativeSurfaceSelectionInternalV1,
} from "../narrative/narrative-surface-composition.tsx";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  defineWorkspaceOverlayV1,
  resolveWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import type {
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SaveUiReadableSlotIdV1,
  SaveUiWritableSlotIdV1,
} from "../persistence/save-overlay.tsx";
import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { SemanticStageV1 } from "../stage/semantic-stage.tsx";
import { systemDialogManagedContractInternalV1 } from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
  resolveSystemDialogSessionInternalV1,
} from "../system/system-dialog-managed-session.ts";
import {
  createGameUiCompositionWithEpochAllocatorInternalV1,
  createHostedGameUiCompositionInternalV1,
  resolveGameUiManagedSurfaceCompositionInternalV1,
  type GameUiCueRegistryV1,
  type GameUiPresentationAnchorEventInternalV1,
  type GameUiPresentationAnchorEventSourceInternalV1,
  type GameUiPresentationAnchorV1,
  type GameUiPresentationSuccessorProducerInternalV1,
} from "./create-game-ui-composition.ts";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootPropsV1,
  DefaultGameRootSlotContextV1,
} from "./default-game-root.tsx";
import { DefaultGameRootV1 } from "./default-game-root.tsx";

afterEach(cleanup);

const anchoredV1 = Object.freeze({
  kind: "anchored" as const,
  commandSequence: parseNonNegativeSafeInteger(0),
}) satisfies SessionAnchorResultV1;

type LifecycleOverlayIdV1 = "lifecycle.primary" | "lifecycle.detail";

const lifecycleOverlayDefinitionsV1 = Object.freeze([
  defineWorkspaceOverlayV1({ id: "lifecycle.primary", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "lifecycle.detail", contractRevision: 1 }),
]);

const hostedSaveLabelsV1 = Object.freeze({
  accessibleName: "Hosted saves",
  title: "Hosted saves",
  storageLoading: "Loading saves",
  storageReady: "Storage ready",
  storageBusy: "Storage busy",
  storageUnavailable: "Storage unavailable",
  slotsUnavailable: "Slots unavailable",
  safelySaved: (sequence: number) => `Saved through ${String(sequence)}`,
  lastFailure: (code: string) => `Last failure ${code}`,
  slotNames: Object.freeze({
    "auto.current": "Current autosave",
    "auto.previous": "Previous autosave",
    quick: "Quick save",
    manualSlot: (index: number) => `Manual save ${String(index)}`,
  }),
  slotHealth: Object.freeze({
    empty: "Empty",
    valid: "Valid",
    invalid: "Invalid",
    recovery_candidate: "Recovery candidate",
    unavailable: "Unavailable",
  }),
  quickSave: "Quick save",
  manualSave: "Manual save",
  importSave: "Import save",
  exportCurrentSave: "Export current save",
  loadSlot: (slotName: string) => `Load ${slotName}`,
  clearSlot: (slotName: string) => `Clear ${slotName}`,
  exportSlot: (slotName: string) => `Export ${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `Load ${slotName} confirmation`,
    loadDescription: (slotName: string) => `Replace progress with ${slotName}.`,
    clearTitle: (slotName: string) => `Clear ${slotName} confirmation`,
    clearDescription: (slotName: string) => `Permanently clear ${slotName}.`,
    importTitle: "Import save confirmation",
    importDescription: "Replace progress with the imported save.",
    confirmLabel: "Confirm operation",
    cancelLabel: "Cancel operation",
    pendingText: "Operation pending",
    completedText: "Operation completed",
    failedText: "Operation failed",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `Saving ${slotName}`,
    loading: (slotName: string) => `Loading ${slotName}`,
    clearing: (slotName: string) => `Clearing ${slotName}`,
    importing: "Importing",
    exporting: (slotName: string) => `Exporting ${slotName}`,
    exportingCurrent: "Exporting current save",
    saved: (slotName: string) => `Saved ${slotName}`,
    cleared: (slotName: string) => `Cleared ${slotName}`,
    loadedExact: "Loaded exact save",
    loadedAdopted: "Loaded adopted save",
    importedExact: "Imported exact save",
    importedAdopted: "Imported adopted save",
    importCancelled: "Import cancelled",
    importFileRejected: Object.freeze({
      too_large: "Import too large",
      unsupported_type: "Import type unsupported",
    }),
    exported: (slotName: string) => `Exported ${slotName}`,
    exportedCurrent: "Exported current save",
    rejected: Object.freeze({
      busy: "Busy",
      unavailable: "Unavailable",
      empty_slot: "Empty slot",
      conflict: "Conflict",
      in_flight: "In flight",
      invalid_record: "Invalid record",
      invalid_note: "Invalid note",
      lineage_limit: "Lineage limit",
      migration_unavailable: "Migration unavailable",
      migration_rejected: "Migration rejected",
      incompatible: "Incompatible",
    }),
    exportRejected: Object.freeze({
      unavailable: "Unavailable",
      empty_slot: "Empty slot",
      conflict: "Conflict",
      invalid_record: "Invalid record",
    }),
    faulted: (code: string) => `Faulted ${code}`,
    unexpectedFailure: "Unexpected failure",
  }),
}) satisfies SaveOverlayLabelsV1;

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function StageLifetimeProbeV1(props: {
  readonly onMount: () => void;
  readonly onUnmount: () => void;
  readonly epoch: number;
  readonly clock: ReturnType<typeof createManualPresentationClockV1>;
  readonly cues?: GameUiCueRegistryV1;
}): ReactElement {
  const { onMount, onUnmount, epoch, clock, cues } = props;
  const [contentGeneration, setContentGeneration] = useState(0);
  useEffect(() => {
    onMount();
    return onUnmount;
  }, [onMount, onUnmount]);
  useEffect(() => {
    setContentGeneration(epoch + 1);
  }, [epoch]);
  return (
    <div data-stage-lifetime-probe="true">
      <SemanticStageV1
        target={stageLifetimeTargetV1(
          contentGeneration % 2 === 0 ? "content.test.lifetime-a" : "content.test.lifetime-b",
        )}
        revision={epoch * 10 + contentGeneration}
        epoch={epoch}
        catalog={stageLifetimeTransitionCatalogV1}
        renderers={stageLifetimeRenderersV1}
        accessibleName="Stage lifetime probe"
        clock={clock}
        timelines={stageLifetimeTimelinesV1}
        {...(cues === undefined ? {} : { cues })}
      />
    </div>
  );
}

function StrictBarrierStageProbeInternalV1(props: {
  readonly onMount: () => void;
  readonly onUnmount: () => void;
  readonly clock: ReturnType<typeof createManualPresentationClockV1>;
  readonly cues: GameUiCueRegistryV1;
}): ReactElement {
  const { onMount, onUnmount, clock, cues } = props;
  useEffect(() => {
    onMount();
    return onUnmount;
  }, [onMount, onUnmount]);
  return (
    <SemanticStageV1
      target={stageLifetimeTargetV1("content.test.strict-barrier")}
      revision={1}
      epoch={0}
      catalog={strictBarrierTransitionCatalogInternalV1}
      renderers={stageLifetimeRenderersV1}
      accessibleName="Strict coherent Barrier Stage"
      clock={clock}
      timelines={stageLifetimeTimelinesV1}
      cues={cues}
    />
  );
}

const stageLifetimeContentCatalogV1: StageContentCatalogV1 = Object.freeze({
  resolveContent: (
    contentId: Parameters<StageContentCatalogV1["resolveContent"]>[0],
  ) =>
    Object.freeze({
      rendererId: "renderer.test.default-root-lifetime",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: contentId,
      props: Object.freeze({}),
    }),
});
function stageLifetimeTargetV1(contentId: string) {
  const state = createSemanticStageStateV1({
    stageId: "stage.test.default-root-lifetime",
    layerIds: ["layer.test.default-root-lifetime"],
  });
  const outcome = reduceStageMutationsV1(state, [
    {
      kind: "show",
      layerId: "layer.test.default-root-lifetime",
      tag: "tag.test.default-root-lifetime",
      contentId,
    },
  ]);
  if (outcome.kind !== "applied") {
    throw new Error("Stage lifetime target must apply");
  }
  return projectStageRenderTargetV1(
    outcome.state,
    stageLifetimeContentCatalogV1,
  ).target;
}
const stageLifetimeTransitionV1 = parseStageTransitionDefinitionV1({
  transitionId: "transition.test.default-root-lifetime",
  kind: "crossfade",
  durationMs: 100,
  easing: "linear",
  inputPolicy: "block",
  interruption: "settle_and_retarget",
  reducedMotion: { kind: "settle" },
  readiness: { kind: "immediate" },
  acknowledge: true,
  slide: null,
});
const stageLifetimeTransitionCatalogV1: StageTransitionCatalogV1 = Object.freeze({
  resolveTransition: (
    change: Parameters<StageTransitionCatalogV1["resolveTransition"]>[0],
  ) => (change.kind === "replace" ? stageLifetimeTransitionV1 : null),
});
const strictBarrierTransitionInternalV1 = parseStageTransitionDefinitionV1({
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
});
const strictBarrierTransitionCatalogInternalV1: StageTransitionCatalogV1 = Object.freeze({
  resolveTransition: () => strictBarrierTransitionInternalV1,
  resolveTransitionById: (transitionId: string) =>
    transitionId === strictBarrierTransitionInternalV1.transitionId
      ? strictBarrierTransitionInternalV1
      : null,
});
const stageLifetimeRenderersV1 = Object.freeze({
  "renderer.test.default-root-lifetime": () => <span />,
});
const stageLifetimeCueV1 = timelineV1.define(
  "cue.test.default-root-lifetime",
  timelineV1.tween({
    target: timelineV1.entry(
      "layer.test.default-root-lifetime",
      "tag.test.default-root-lifetime",
    ),
    property: "offsetX",
    to: 10,
    durationMs: 100,
    easing: "linear",
  }),
);
const stageLifetimeTimelinesV1: TimelineCatalogV1 = Object.freeze({
  resolveTimeline: (
    cueId: Parameters<TimelineCatalogV1["resolveTimeline"]>[0],
  ) => (cueId === "cue.test.default-root-lifetime" ? stageLifetimeCueV1 : null),
});

function renderLifecycleRootV1(input: {
  readonly playerProfile?: PlayerProfileStoreV1;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly auxiliarySurface?: ReactElement;
  readonly stageLifetime?: {
    readonly onMount: () => void;
    readonly onUnmount: () => void;
    readonly clock: ReturnType<typeof createManualPresentationClockV1>;
  };
}) {
  let systemDialogs: DefaultGameRootSlotContextV1<unknown, unknown>["systemDialogs"] | undefined;
  const inputRouter = createInputRouterV1();
  const overlayFailures: Array<{
    readonly code: string;
    readonly error: unknown;
  }> = [];
  const preparations = new Map<
    LifecycleOverlayIdV1,
    ReturnType<typeof deferredV1>
  >([
    ["lifecycle.primary", deferredV1()],
    ["lifecycle.detail", deferredV1()],
  ]);
  const overlayConfiguration = createWorkspaceOverlaySessionConfigurationInternalV1({
    definitions: lifecycleOverlayDefinitionsV1,
    reportFailure: (code, error) => overlayFailures.push(Object.freeze({ code, error })),
  });
  const managedSurfaceRuntimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: Object.freeze([
        ...overlayConfiguration.recipeContribution.resolvedOwnerIds,
        ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
      ]),
      resolvedSlotDescriptors: Object.freeze([
        ...overlayConfiguration.recipeContribution.resolvedSlotDescriptors,
        ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
      ]),
    }),
  });
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<LifecycleOverlayIdV1>({
    runtime: managedSurfaceRuntimeOwner.getCurrent(),
    configuration: overlayConfiguration,
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);
  const overlayResolver = Object.freeze({
    resolve: (id: LifecycleOverlayIdV1) =>
      Object.freeze({
        accessibleName: id,
        content: <p>{id}</p>,
        prepare: () => preparations.get(id)!.promise,
      }),
  });
  const systemDialogInternal = createSystemDialogManagedSessionInternalV1({
    runtime: managedSurfaceRuntimeOwner.getCurrent(),
  });
  const systemDialogSession = createSystemDialogSessionFacadeInternalV1(systemDialogInternal);
  const publication = Object.freeze({ revision: 0 });
  let anchor: GameUiPresentationAnchorV1 = Object.freeze({
    epoch: 0,
    origin: "bootstrap",
  });
  const anchorListeners = new Set<() => void>();

  const renderRootV1 = (): ReactElement => (
    <DefaultGameRootV1
      composition={{
        presentation: Object.freeze({
          getSnapshot: () => publication,
          subscribe: () => () => undefined,
        }),
        anchor: Object.freeze({
          getCurrent: () => anchor,
          subscribe: (listener: () => void) => {
            anchorListeners.add(listener);
            return () => anchorListeners.delete(listener);
          },
        }),
        input: inputRouter,
        intents: Object.freeze({}),
        cues: Object.freeze({}),
        overlaySession,
        systemDialogSession,
        interactionSession: Object.freeze({}),
        updateUiState: () => undefined,
      } as never}
      semantic={Object.freeze({})}
      accessibleName="Lifecycle fixture"
      applicationId="lifecycle-fixture"
      viewport={undefined as never}
      {...(input.playerProfile === undefined ? {} : { playerProfile: input.playerProfile })}
      {...(input.labels === undefined ? {} : { labels: input.labels })}
      slots={Object.freeze({
        ...(input.stageLifetime === undefined ? {} : {
          background: () => (
            <StageLifetimeProbeV1
              onMount={input.stageLifetime!.onMount}
              onUnmount={input.stageLifetime!.onUnmount}
              epoch={anchor.epoch}
              clock={input.stageLifetime!.clock}
            />
          ),
        }),
        hud: (context: DefaultGameRootSlotContextV1<unknown, unknown>) => {
          systemDialogs = context.systemDialogs;
          return null;
        },
        ...(input.auxiliarySurface === undefined
          ? {}
          : { auxiliarySurface: () => input.auxiliarySurface }),
        overlayResolver: () => overlayResolver,
      })}
    />
  );
  render(renderRootV1());

  return Object.freeze({
    managedSurfaceRuntimeOwner,
    overlayInternal,
    overlaySession,
    overlayFailures,
    publishAnchor(next: GameUiPresentationAnchorV1): void {
      anchor = next;
      for (const listener of [...anchorListeners]) listener();
    },
    resolvePreparation(id: LifecycleOverlayIdV1) {
      preparations.get(id)!.resolve();
    },
    systemDialogSession,
    systemDialogInternal,
    openSettings: () => {
      if (systemDialogs === undefined) {
        throw new TypeError("missing System dialog fixture");
      }
      return systemDialogs.openSettings();
    },
    openSaves: () => {
      if (systemDialogs === undefined) {
        throw new TypeError("missing System dialog fixture");
      }
      return systemDialogs.openSaves();
    },
    returnToTitle: () => {
      if (systemDialogs === undefined) {
        throw new TypeError("missing returnToTitle fixture");
      }
      return systemDialogs.returnToTitle();
    },
  });
}

async function settleOverlayPreparationV1(
  fixture: ReturnType<typeof renderLifecycleRootV1>,
  id: LifecycleOverlayIdV1,
): Promise<void> {
  const candidate = fixture.overlayInternal
    .getRenderSnapshotInternalV1()
    .entries.find(
      (entry) => entry.overlayId === id && entry.readiness === "preparing",
    );
  expect(candidate).toBeDefined();
  const readiness = fixture.overlayInternal.beginCandidatePreparationInternalV1(
    candidate!.surfaceInstanceId,
  );
  await act(async () => {
    fixture.resolvePreparation(id);
    await expect(readiness).resolves.toEqual({ kind: "ready" });
  });
}

async function openActiveTopologyV1(
  fixture: ReturnType<typeof renderLifecycleRootV1>,
): Promise<
  Readonly<{
    system: { readonly active: "settings" };
    overlay: {
      readonly primaryId: "lifecycle.primary";
      readonly detailIds: readonly ["lifecycle.detail"];
    };
  }>
> {
  act(() => {
    expect(fixture.overlaySession.openPrimary("lifecycle.primary")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.primary");
  act(() => {
    expect(fixture.overlaySession.pushDetail("lifecycle.detail")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.detail");
  act(() => {
    expect(fixture.systemDialogSession.openSettings()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
  });
  await act(async () => {
    await new Promise<void>((complete) => queueMicrotask(complete));
  });
  expect(fixture.systemDialogSession.getSnapshot()).toEqual({
    active: "settings",
  });
  return Object.freeze({
    system: Object.freeze({ active: "settings" as const }),
    overlay: Object.freeze({
      primaryId: "lifecycle.primary" as const,
      detailIds: Object.freeze(["lifecycle.detail"] as const),
    }),
  });
}

function createExactLifecycleAnchorSourceV1() {
  let current: GameUiPresentationAnchorV1 = Object.freeze({
    epoch: 0,
    origin: "bootstrap",
  });
  const listeners = new Set<
    (event: GameUiPresentationAnchorEventInternalV1) => void
  >();
  const source: GameUiPresentationAnchorEventSourceInternalV1 = Object.freeze({
    current: () => current,
    subscribe(
      listener: Parameters<
        GameUiPresentationAnchorEventSourceInternalV1["subscribe"]
      >[0],
    ) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  return Object.freeze({
    source,
    publish(event: GameUiPresentationAnchorEventInternalV1): void {
      current = Object.freeze({ ...event.anchor });
      for (const listener of [...listeners]) {
        listener(Object.freeze({ anchor: current, token: event.token }));
      }
    },
  });
}

function choicePendingInternalV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "narrative.test.default-root-choice",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence + 1_000)}`,
    promptTextId: "text.test.default-root-prompt",
    options: [
      {
        choiceId: "choice.test.default-root-first",
        textId: "text.test.default-root-first",
      },
      {
        choiceId: "choice.test.default-root-second",
        textId: "text.test.default-root-second",
      },
    ],
  });
}

function choiceSelectionInternalV1(
  sequence: number,
): NarrativeSurfaceSelectionInternalV1 {
  const availability = Object.freeze([
    Object.freeze({
      choiceId: "choice.test.default-root-first",
      status: "enabled" as const,
      reasonTextIds: Object.freeze([]),
    }),
    Object.freeze({
      choiceId: "choice.test.default-root-second",
      status: "enabled" as const,
      reasonTextIds: Object.freeze([]),
    }),
  ]) satisfies readonly NarrativeSurfaceChoiceAvailabilityInternalV1[];
  return Object.freeze({
    pending: choicePendingInternalV1(sequence),
    history: emptyNarrativeHistoryV1,
    choiceAvailability: availability,
  });
}

function saySelectionInternalV1(
  sequence: number,
): NarrativeSurfaceSelectionInternalV1 {
  return Object.freeze({
    pending: parsePendingInteractionV1({
      kind: "say",
      definitionId: "narrative.test.default-root-say",
      seenRevision: 1,
      occurrenceId: `interaction-occurrence.${String(sequence + 1_000)}`,
      speakerTextId: null,
      textId: "text.test.default-root-say",
      advancePolicy: "confirm",
    }),
    history: emptyNarrativeHistoryV1,
    choiceAvailability: null,
  });
}

function strictBarrierSelectionInternalV1(
  pending: PendingInteractionV1 | null = parsePendingInteractionV1({
    kind: "presentation_barrier",
    definitionId: "narrative.test.default-root-strict-barrier",
    seenRevision: 1,
    occurrenceId: "interaction-occurrence.1001",
    expectedTransitionId: strictBarrierTransitionInternalV1.transitionId,
    loadRecovery: "settle",
  }),
): NarrativeSurfaceSelectionInternalV1 {
  return Object.freeze({
    pending,
    history: emptyNarrativeHistoryV1,
    choiceAvailability: null,
  });
}

function renderCompositionOwnedNarrativeRootInternalV1(
  options: {
    readonly completionMode?:
      | "publish_resolved"
      | "reject_current"
      | "resolve_without_publication"
      | "publish_pending";
    readonly initialStrictBarrier?: {
      readonly clock: ReturnType<typeof createManualPresentationClockV1>;
      readonly onMount: () => void;
      readonly onUnmount: () => void;
      readonly onDispatch?: () => void;
    };
    readonly initialSay?: boolean;
    readonly narrativeClock?: PresentationClockV1;
    readonly strictMode?: boolean;
    readonly wholeCanvas?: boolean;
  } = {},
) {
  interface SemanticPublicationInternalV1 {
    readonly selection: NarrativeSurfaceSelectionInternalV1;
  }
  const semanticListeners = new Set<() => void>();
  let occurrenceSequence = 1;
  let semanticPublication: SemanticPublicationInternalV1 = Object.freeze({
    selection: options.wholeCanvas === true
      ? strictBarrierSelectionInternalV1(null)
      : options.initialStrictBarrier === undefined
      ? options.initialSay === true
        ? saySelectionInternalV1(occurrenceSequence)
        : choiceSelectionInternalV1(occurrenceSequence)
      : strictBarrierSelectionInternalV1(),
  });
  const callbacks: Array<
    Readonly<{
      readonly occurrenceId: string;
      readonly callback: () => void;
    }>
  > = [];
  const dispatches: Array<
    Readonly<{
      readonly expectedOccurrenceId: string;
      readonly resolution: unknown;
    }>
  > = [];
  const failures: Array<
    Readonly<{
      readonly code: string;
      readonly error: unknown;
    }>
  > = [];
  let rejectPendingCompletion: ((error: unknown) => void) | null = null;
  const publishSelection = (
    selection: NarrativeSurfaceSelectionInternalV1,
  ): void => {
    semanticPublication = Object.freeze({ selection });
    for (const listener of [...semanticListeners]) listener();
  };
  const ChoiceRendererInternalV1 = Object.freeze(
    function ChoiceRendererInternalV1(
      props: NarrativeSurfaceRendererPropsV1,
    ): ReactElement {
      const pending = props.kind === "dialogue" ? props.pending : null;
      const occurrenceId = pending?.occurrenceId ?? "history";
      const choiceId = pending?.kind === "choice" ? pending.options[0]?.choiceId : undefined;
      useEffect(() => {
        if (props.kind !== "dialogue") return;
        if (pending?.kind === "say") {
          callbacks.push(
            Object.freeze({ occurrenceId, callback: props.onActivate }),
          );
          return;
        }
        if (choiceId !== undefined) {
          callbacks.push(
            Object.freeze({
              occurrenceId,
              callback: () => props.onChoose(choiceId),
            }),
          );
        }
      }, [choiceId, occurrenceId, pending?.kind, props]);
      if (pending?.kind === "say" && props.kind === "dialogue") {
        return (
          <output
            data-testid="default-root-narrative-say"
            data-player-kind={props.playerView.kind}
            data-player-phase={props.playerView.phase}
            data-revealed-characters={props.playerView.kind === "say"
              ? props.playerView.revealedCharacters
              : 0}
            data-reveal-complete={props.playerView.kind === "say"
              ? String(props.playerView.revealComplete)
              : "false"}
          />
        );
      }
      return choiceId === undefined
        ? <output data-testid="default-root-narrative-history" />
        : (
          <button
            type="button"
            data-testid="default-root-narrative-choice"
            data-occurrence-id={occurrenceId}
            onClick={() => props.kind === "dialogue" && props.onChoose(choiceId)}
          >
            Choose first
          </button>
        );
    },
  );
  const definition = defineNarrativeSurfaceV1(
    Object.freeze({
      selectNarrative: (
        publication: DeepReadonly<SemanticPublicationInternalV1>,
      ) => publication.selection,
      dispatchResolution: (
        request: Readonly<{
          readonly expectedOccurrenceId: string;
          readonly resolution: unknown;
        }>,
      ) => {
        dispatches.push(request);
        if (options.initialStrictBarrier !== undefined) {
          options.initialStrictBarrier.onDispatch?.();
          publishSelection(strictBarrierSelectionInternalV1(null));
          return Promise.resolve();
        }
        switch (options.completionMode ?? "publish_resolved") {
          case "reject_current":
            return Promise.reject(
              new Error("current Choice completion rejected"),
            );
          case "resolve_without_publication":
            return Promise.resolve();
          case "publish_pending": {
            const completion = new Promise<void>((_resolve, reject) => {
              rejectPendingCompletion = reject;
            });
            occurrenceSequence += 1;
            publishSelection(choiceSelectionInternalV1(occurrenceSequence));
            return completion;
          }
          case "publish_resolved":
            occurrenceSequence += 1;
            publishSelection(choiceSelectionInternalV1(occurrenceSequence));
            return Promise.resolve();
        }
        throw new TypeError("unexpected Narrative completion fixture mode");
      },
      dispatchTime: null,
      renderer: ChoiceRendererInternalV1,
      resolveText: (_locale: string | null, textId: string) => textId,
      replayCurrentVoice: null,
    }),
  );
  const anchorEvents = createExactLifecycleAnchorSourceV1();
  let managedEpoch = 0;
  const narrativePlayerProfile = Object.freeze({
    current: () => defaultPlayerProfileV1,
    subscribe: () => Object.freeze(() => undefined),
    markSeen: async () => undefined,
    markMeta: async () => undefined,
    updatePreferences: async () => undefined,
  }) satisfies PlayerProfileStoreV1;
  const narrativeClock = options.narrativeClock ??
    options.initialStrictBarrier?.clock ??
    createManualPresentationClockV1();
  const wholeCanvasTarget = Object.freeze({
    targetId: "test.whole-canvas.primary",
    parameters: Object.freeze({}),
  });
  const wholeCanvasDefinition = options.wholeCanvas === true
    ? createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      Object.freeze({
        catalog: Object.freeze([
          Object.freeze({
            targetId: wholeCanvasTarget.targetId,
            contractRevision: 1 as const,
            placements: Object.freeze(["primary" as const]),
            actionIds: Object.freeze(["test.action.primary"]),
            defaultActionId: null,
          }),
        ]),
        getSnapshotInternalV1: () =>
          Object.freeze({
            bootSplash: null,
            title: null,
            story: Object.freeze({
              sourceKind: "application" as const,
              target: wholeCanvasTarget,
            }),
          }),
        subscribeInternalV1: () => Object.freeze(() => undefined),
        resolveTargetInternalV1: () =>
          Object.freeze({
            accessibleNameTextId: "test.whole-canvas.primary-name",
            view: Object.freeze({ kind: "primary" }),
            actions: Object.freeze([
              Object.freeze({
                actionId: "test.action.primary",
                status: "enabled" as const,
                reasonTextIds: Object.freeze([]),
                intent: Object.freeze({ kind: "back" as const }),
              }),
            ]),
          }),
        dispatchOwnerActionInternalV1: null,
        prepareTargetInternalV1: null,
        renderInternalV1: Object.freeze(
          ({ entry }: WholeCanvasSurfaceRendererPropsInternalV1) => {
            return (
              <div
                data-testid="default-root-whole-canvas-primary"
                data-instance-id={entry.frame.primaryInstanceId}
              />
            );
          },
        ),
      }),
    )
    : null;
  const composition = createGameUiCompositionWithEpochAllocatorInternalV1(
    {
      semantic: Object.freeze({
        observe: () => semanticPublication,
        subscribe(listener: () => void) {
          semanticListeners.add(listener);
          return () => semanticListeners.delete(listener);
        },
      }),
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: (input: {
          readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 };
        }) =>
          Object.freeze({
            view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
      overlayDefinitions: Object.freeze([]),
    },
    Object.freeze({
      allocate: () => parseNonNegativeSafeInteger(++managedEpoch),
    }),
    (code: string, error: unknown) => {
      failures.push(Object.freeze({ code, error }));
    },
    undefined,
    Object.freeze({
      anchorEvents: anchorEvents.source,
      producer: Object.freeze({
        installed: () => undefined,
        failed: () => undefined,
      }),
    }),
    definition,
    Object.freeze({
      playerProfile: narrativePlayerProfile,
      presentationClock: narrativeClock,
      prefersReducedMotion: () => false,
    }),
    wholeCanvasDefinition,
  );
  const initialStrictBarrier = options.initialStrictBarrier;
  const root = (
    <DefaultGameRootV1
      composition={composition as never}
      semantic={Object.freeze({})}
      accessibleName="Composition Narrative fixture"
      applicationId="composition-narrative-fixture"
      viewport={undefined as never}
      inputMaps={Object.freeze({
        keyboard: Object.freeze({
          Escape: systemInputActionIdsV1.cancel,
          KeyN: systemInputActionIdsV1.confirm,
        }),
        gamepad: Object.freeze({ 0: systemInputActionIdsV1.confirm }),
      })}
      slots={Object.freeze({
        ...(initialStrictBarrier === undefined ? {} : {
          background: (
            context: DefaultGameRootSlotContextV1<unknown, unknown>,
          ) => (
            <StrictBarrierStageProbeInternalV1
              onMount={initialStrictBarrier.onMount}
              onUnmount={initialStrictBarrier.onUnmount}
              clock={initialStrictBarrier.clock}
              cues={context.cues}
            />
          ),
        }),
      })}
    />
  );
  const view = render(
    options.strictMode === true ? <StrictMode>{root}</StrictMode> : root,
  );
  return Object.freeze({
    ...view,
    anchorEvents,
    callbacks,
    composition,
    dispatches,
    failures,
    rejectPendingCompletion(error: unknown): void {
      const reject = rejectPendingCompletion;
      if (reject === null) {
        throw new Error("expected a pending Narrative completion");
      }
      rejectPendingCompletion = null;
      reject(error);
    },
  });
}

function renderHostedLifecycleRootV1(
  options: {
    readonly withSaveUi?: boolean;
    readonly withCustomSaves?: boolean;
    readonly saveSlotHealth?: "empty" | "valid";
    readonly withFrontDoor?: boolean;
    readonly withSplash?: boolean;
    readonly hudProbe?: boolean;
    readonly stageLifetime?: {
      readonly onMount: () => void;
      readonly onUnmount: () => void;
      readonly clock: ReturnType<typeof createManualPresentationClockV1>;
    };
    readonly strictMode?: boolean;
  } = {},
) {
  const anchorEvents = createExactLifecycleAnchorSourceV1();
  const installed: Parameters<
    GameUiPresentationSuccessorProducerInternalV1["installed"]
  >[0][] = [];
  const failed: Parameters<
    GameUiPresentationSuccessorProducerInternalV1["failed"]
  >[0][] = [];
  const allocatedEpochs: number[] = [];
  const epochSequence = [11, 17, 23] as const;
  let epochCursor = 0;
  const loadToken = Object.freeze({ kind: "hosted-load-test-token" });
  const load = vi.fn(async () => {
    anchorEvents.publish(
      Object.freeze({
        anchor: Object.freeze({ epoch: 1, origin: "load" }),
        token: loadToken,
      }),
    );
    if (installed.at(-1)?.token !== loadToken) {
      throw new TypeError(
        "missing exact load presentation successor acknowledgment",
      );
    }
    return Object.freeze({
      kind: "loaded" as const,
      compatibility: "exact" as const,
      commandSequence: parseNonNegativeSafeInteger(0),
    });
  });
  const savePort = Object.freeze({
    getStatus: () =>
      Object.freeze({
        available: true,
        busy: false,
        safelySavedCommandSequence: null,
        lastFailureCode: null,
      }),
    listSlots: async () => {
      const health = options.saveSlotHealth ?? "valid";
      const slotId = options.withCustomSaves === true
        ? ("quick" as const)
        : options.withSplash === true
        ? ("auto.current" as const)
        : ("quick" as const);
      return Object.freeze([
        Object.freeze({
          slotId,
          health,
          recordRevision: null,
          capturedCommandSequence: null,
          savedAt: null,
          annotation: null,
          warningCodes: Object.freeze([]),
        }),
      ]);
    },
    save: async (slotId: SaveUiWritableSlotIdV1) =>
      Object.freeze({ kind: "saved" as const, slotId }),
    load,
    clear: async (slotId: SaveUiReadableSlotIdV1) =>
      Object.freeze({ kind: "cleared" as const, slotId }),
    annotateSave: async (slotId: SaveUiWritableSlotIdV1, _note: string) =>
      Object.freeze({ kind: "saved" as const, slotId }),
    importSave: async () => Object.freeze({ kind: "cancelled" as const }),
    exportSave: async (_slotId: SaveUiReadableSlotIdV1) =>
      Object.freeze({
        kind: "rejected" as const,
        code: "unavailable" as const,
      }),
    exportCurrentSave: async () => {
      throw new TypeError("hosted save export is outside this fixture");
    },
  }) satisfies SaveOverlayPortV1;
  const restartToken = Object.freeze({ kind: "return-to-title-test-token" });
  const restart = vi.fn(async () => {
    anchorEvents.publish(
      Object.freeze({
        anchor: Object.freeze({ epoch: 2, origin: "restart" }),
        token: restartToken,
      }),
    );
    if (installed.at(-1)?.token !== restartToken) {
      throw new TypeError(
        "missing exact presentation successor acknowledgment",
      );
    }
    return anchoredV1;
  });
  const playerProfile = Object.freeze({
    current: () => defaultPlayerProfileV1,
    subscribe: () => Object.freeze(() => undefined),
    markSeen: async () => undefined,
    markMeta: async () => undefined,
    updatePreferences: async () => undefined,
  }) satisfies PlayerProfileStoreV1;
  const semanticPublication = Object.freeze({ revision: 0 });
  const composition = createHostedGameUiCompositionInternalV1(
    {
      semantic: Object.freeze({
        observe: () => semanticPublication,
        subscribe: () => () => undefined,
      }),
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: (input: {
          readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 };
        }) =>
          Object.freeze({
            view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
      overlayDefinitions: lifecycleOverlayDefinitionsV1,
    },
    {
      managedSurfaceEpochAllocator: Object.freeze({
        allocate() {
          const nextEpoch = epochSequence[epochCursor];
          if (nextEpoch === undefined) {
            throw new TypeError("hosted lifecycle epoch fixture exhausted");
          }
          const epoch = parseNonNegativeSafeInteger(nextEpoch);
          epochCursor += 1;
          allocatedEpochs.push(epoch);
          return epoch;
        },
      }),
      anchorEvents: anchorEvents.source,
      successorProducer: Object.freeze({
        installed(
          outcome: Parameters<
            GameUiPresentationSuccessorProducerInternalV1["installed"]
          >[0],
        ) {
          installed.push(outcome);
        },
        failed(
          outcome: Parameters<
            GameUiPresentationSuccessorProducerInternalV1["failed"]
          >[0],
        ) {
          failed.push(outcome);
        },
      }),
    },
    options.withFrontDoor === true
      ? Object.freeze({
        narrative: null,
        wholeCanvas: Object.freeze({
          definition: null,
          titleScreen: Object.freeze({
            title: "Hosted lifecycle fixture",
            backgroundUrl: null,
            splash: options.withSplash === true
              ? Object.freeze({
                lines: Object.freeze(["Hosted splash"]),
                durationMs: null,
              })
              : null,
            beginNewGame: null,
          }),
          lifecycle: Object.freeze({ restart }),
          savePort: options.withSaveUi === true || options.withCustomSaves === true
            ? savePort
            : null,
          customSavesConfigured: options.withCustomSaves === true,
          labels: Object.freeze({
            newGame: "New game",
            newGameFailed: "Unable to start a new game.",
            continue: "Continue",
            load: "Load game",
            settings: "Settings",
          }),
        }),
        environment: Object.freeze({
          playerProfile,
          presentationClock: createManualPresentationClockV1(),
          prefersReducedMotion: () => false,
        }),
      })
      : null,
  );
  let returnToTitle:
    | DefaultGameRootSlotContextV1<
      unknown,
      unknown
    >["systemDialogs"]["returnToTitle"]
    | undefined;
  const overlayResolver = Object.freeze({
    resolve: (id: LifecycleOverlayIdV1) =>
      Object.freeze({
        accessibleName: id,
        content: <p>{id}</p>,
      }),
  });

  const root = (
    <DefaultGameRootV1
      composition={composition as never}
      semantic={Object.freeze({})}
      accessibleName="Hosted lifecycle fixture"
      applicationId="hosted-lifecycle-fixture"
      viewport={undefined as never}
      {...(options.withSaveUi === true
        ? {
          saveUi: Object.freeze({
            port: savePort,
            labels: hostedSaveLabelsV1,
          }),
        }
        : {})}
      {...(options.withCustomSaves === true
        ? {
          customSaves: Object.freeze({
            kind: "custom" as const,
            accessibleName: "Load game",
            component: (intents: { readonly close: () => void }) => (
              <div data-testid="custom-saves-body">
                <button type="button" onClick={() => intents.close()}>
                  Close custom saves
                </button>
              </div>
            ),
          }),
        }
        : {})}
      slots={Object.freeze({
        ...(options.stageLifetime === undefined ? {} : {
          background: (
            context: DefaultGameRootSlotContextV1<unknown, unknown>,
          ) => (
            <StageLifetimeProbeV1
              onMount={options.stageLifetime!.onMount}
              onUnmount={options.stageLifetime!.onUnmount}
              epoch={(
                context.publication as {
                  readonly view: { readonly anchorEpoch: number };
                }
              ).view.anchorEpoch}
              clock={options.stageLifetime!.clock}
              cues={context.cues}
            />
          ),
        }),
        hud: (context: DefaultGameRootSlotContextV1<unknown, unknown>) => {
          returnToTitle = context.systemDialogs.returnToTitle;
          return options.hudProbe === true ? <div data-testid="hud-probe">HUD</div> : null;
        },
        overlayResolver: () => overlayResolver,
      })}
    />
  );
  render(options.strictMode === true ? <StrictMode>{root}</StrictMode> : root);

  return Object.freeze({
    allocatedEpochs,
    anchorEvents,
    composition,
    failed,
    installed,
    load,
    loadToken,
    restart,
    restartToken,
    returnToTitle: () => {
      if (returnToTitle === undefined) {
        throw new TypeError("missing hosted returnToTitle fixture");
      }
      return returnToTitle();
    },
  });
}

describe("DefaultGameRootV1 lifecycle result handling", () => {
  it("forwards optional outer chrome through the neutral auxiliary surface slot", () => {
    renderLifecycleRootV1({
      auxiliarySurface: <button type="button">Reference outer chrome</button>,
    });

    const stage = screen.getByRole("main", { name: "Lifecycle fixture" });
    const auxiliary = screen.getByRole("button", { name: "Reference outer chrome" });
    expect(auxiliary).toBeVisible();
    expect(stage).not.toContainElement(auxiliary);
  });

  it("promotes a saved-session Title after dismissing the package-owned Splash", async () => {
    const fixture = renderHostedLifecycleRootV1({
      withFrontDoor: true,
      withSaveUi: true,
      withSplash: true,
    });

    const splash = await waitFor(() => {
      const candidate = document.querySelector<HTMLElement>(
        "[data-boot-splash='true']",
      );
      expect(candidate).toBeVisible();
      return candidate!;
    });
    await userEvent.setup().click(splash);

    const title = await waitFor(() => {
      const candidate = document.querySelector<HTMLElement>(
        "[data-title-screen='true']",
      );
      expect(candidate).toBeVisible();
      return candidate!;
    });
    expect(title.closest("[data-whole-canvas-phase='current']")).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());

    fixture.composition.dispose();
  });

  it("replaces Continue with a Load launcher that stays disabled when no save can be loaded", async () => {
    const fixture = renderHostedLifecycleRootV1({
      withFrontDoor: true,
      withCustomSaves: true,
      saveSlotHealth: "empty",
    });

    await waitFor(() => {
      expect(
        document.querySelector<HTMLElement>("[data-title-screen='true']"),
      ).toBeVisible();
    });
    const loadButton = screen.getByRole("button", { name: "Load game" });
    expect(loadButton).toBeDisabled();
    expect(loadButton).toHaveAttribute(
      "data-title-load-game-available",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: "New game" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeEnabled();

    fixture.composition.dispose();
  });

  it("opens custom Saves from Title Load without dismissing the front door", async () => {
    const fixture = renderHostedLifecycleRootV1({
      withFrontDoor: true,
      withCustomSaves: true,
      saveSlotHealth: "valid",
    });

    const loadButton = await waitFor(() => {
      const candidate = screen.getByRole("button", { name: "Load game" });
      expect(candidate).toBeEnabled();
      return candidate;
    });
    expect(loadButton).toHaveAttribute(
      "data-title-load-game-available",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    await userEvent.setup().click(loadButton);
    expect(await screen.findByTestId("custom-saves-body")).toBeVisible();
    expect(document.querySelector("[data-title-screen='true']")).not.toBeNull();

    fixture.composition.dispose();
  });

  it("keeps Title and play as sequential scenes instead of masking live HUD chrome", async () => {
    const fixture = renderHostedLifecycleRootV1({
      withFrontDoor: true,
      withSaveUi: true,
      hudProbe: true,
    });

    await waitFor(() => {
      expect(
        document.querySelector<HTMLElement>("[data-title-screen='true']"),
      ).toBeVisible();
    });
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-front-door-exclusive",
      "true",
    );
    expect(screen.getByTestId("hud-probe")).not.toBeVisible();
    expect(document.querySelector("[data-default-system-menu]")).toBeNull();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() => {
      expect(document.querySelector("[data-title-screen='true']")).toBeNull();
    });
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-front-door-exclusive",
      "false",
    );
    expect(screen.getByTestId("hud-probe")).toBeVisible();
    expect(document.querySelector("[data-default-system-menu]")).not.toBeNull();
    expect(
      document.querySelector('[data-testid="stage-scene-interaction"]'),
    ).toBeNull();

    fixture.composition.dispose();
  });

  it("pre-registers the production Narrative Host and dual-fences device and renderer actions", async () => {
    const getGamepadsDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "getGamepads",
    );
    const requestAnimationFrameDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "requestAnimationFrame",
    );
    const cancelAnimationFrameDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "cancelAnimationFrame",
    );
    let connected = false;
    let pressed = false;
    let nextFrameId = 1;
    const frames = new Map<number, FrameRequestCallback>();
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () =>
        connected
          ? [
            Object.freeze({
              index: 0,
              connected: true,
              buttons: Object.freeze([{ pressed }]),
            }),
          ]
          : [],
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        frames.set(frameId, callback);
        return frameId;
      },
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: (frameId: number) => {
        frames.delete(frameId);
      },
    });
    let fixture:
      | ReturnType<
        typeof renderCompositionOwnedNarrativeRootInternalV1
      >
      | null = null;
    const runGamepadFrame = async (): Promise<void> => {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (entry === undefined) {
        throw new Error("expected a pending gamepad frame");
      }
      frames.delete(entry[0]);
      await act(async () => {
        entry[1](0);
        await Promise.resolve();
      });
    };

    try {
      fixture = renderCompositionOwnedNarrativeRootInternalV1();
      const currentChoice = async (sequence: number): Promise<HTMLElement> => {
        await screen.findByTestId("default-root-narrative-choice");
        await waitFor(() =>
          expect(
            screen.getByTestId("default-root-narrative-choice"),
          ).toHaveAttribute(
            "data-occurrence-id",
            `interaction-occurrence.${String(sequence + 1_000)}`,
          )
        );
        await act(async () => {
          await new Promise<void>((complete) => queueMicrotask(complete));
        });
        return screen.getByTestId("default-root-narrative-choice");
      };
      const firstChoice = await currentChoice(1);
      const portal = fixture.container.querySelector(
        '[data-default-narrative-surface-portal="true"]',
      );
      expect(portal).not.toBeNull();

      await userEvent.setup().click(firstChoice);
      await currentChoice(2);
      expect(fixture.dispatches).toHaveLength(1);

      const keyboard = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "KeyN",
      });
      act(() => {
        document.dispatchEvent(keyboard);
      });
      expect(keyboard.defaultPrevented).toBe(true);
      await currentChoice(3);
      expect(fixture.dispatches).toHaveLength(2);

      connected = true;
      act(() => {
        window.dispatchEvent(new Event("gamepadconnected"));
      });
      pressed = true;
      await runGamepadFrame();
      await currentChoice(4);
      expect(fixture.dispatches).toHaveLength(3);

      const oldPointerCallback = fixture.callbacks.findLast(
        (capture) => capture.occurrenceId === "interaction-occurrence.1004",
      )?.callback;
      if (oldPointerCallback === undefined) {
        throw new Error("expected the predecessor renderer callback");
      }

      await act(async () => {
        fixture!.anchorEvents.publish(
          Object.freeze({
            anchor: Object.freeze({ epoch: 1, origin: "load" }),
            token: null,
          }),
        );
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(screen.getByRole("application")).toHaveAttribute(
          "data-presentation-epoch",
          "1",
        )
      );
      expect(
        fixture.container.querySelector(
          '[data-default-narrative-surface-portal="true"]',
        ),
      ).toBe(portal);
      await waitFor(() =>
        expect(
          fixture!.callbacks.some(
            (capture) =>
              capture.occurrenceId === "interaction-occurrence.1004" &&
              capture.callback !== oldPointerCallback,
          ),
        ).toBe(true)
      );

      oldPointerCallback();
      expect(fixture.dispatches).toHaveLength(3);
      // The predecessor gamepad press remains physically held across the
      // successor; polling it again must not replay that old rising edge.
      await runGamepadFrame();
      expect(fixture.dispatches).toHaveLength(3);
      pressed = false;
      await runGamepadFrame();

      const freshPointerCallback = fixture.callbacks.findLast(
        (capture) =>
          capture.occurrenceId === "interaction-occurrence.1004" &&
          capture.callback !== oldPointerCallback,
      )?.callback;
      if (freshPointerCallback === undefined) {
        throw new Error("expected the successor renderer callback");
      }
      freshPointerCallback();
      await currentChoice(5);
      expect(fixture.dispatches).toHaveLength(4);

      const successorKeyboard = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "KeyN",
      });
      act(() => {
        document.dispatchEvent(successorKeyboard);
      });
      expect(successorKeyboard.defaultPrevented).toBe(true);
      await currentChoice(6);
      expect(fixture.dispatches).toHaveLength(5);

      pressed = true;
      await runGamepadFrame();
      await currentChoice(7);
      expect(fixture.dispatches).toHaveLength(6);
      expect(
        fixture.dispatches.map((request) => request.expectedOccurrenceId),
      ).toEqual([
        "interaction-occurrence.1001",
        "interaction-occurrence.1002",
        "interaction-occurrence.1003",
        "interaction-occurrence.1004",
        "interaction-occurrence.1005",
        "interaction-occurrence.1006",
      ]);
      expect(fixture.dispatches.map((request) => request.resolution)).toEqual(
        Array.from({ length: 6 }, () => ({
          kind: "choose",
          choiceId: "choice.test.default-root-first",
        })),
      );
    } finally {
      fixture?.unmount();
      fixture?.composition.dispose();
      if (getGamepadsDescriptor === undefined) {
        delete (navigator as { getGamepads?: unknown }).getGamepads;
      } else {
        Object.defineProperty(navigator, "getGamepads", getGamepadsDescriptor);
      }
      if (requestAnimationFrameDescriptor === undefined) {
        delete (globalThis as { requestAnimationFrame?: unknown })
          .requestAnimationFrame;
      } else {
        Object.defineProperty(
          globalThis,
          "requestAnimationFrame",
          requestAnimationFrameDescriptor,
        );
      }
      if (cancelAnimationFrameDescriptor === undefined) {
        delete (globalThis as { cancelAnimationFrame?: unknown })
          .cancelAnimationFrame;
      } else {
        Object.defineProperty(
          globalThis,
          "cancelAnimationFrame",
          cancelAnimationFrameDescriptor,
        );
      }
    }
  });

  it("normalizes a browser frame timestamp through the live Narrative clock", async () => {
    let currentNow = 783.5;
    const ticks: Array<{
      active: boolean;
      readonly callback: (nowMs: number) => void;
    }> = [];
    const clock = Object.freeze({
      now: () => currentNow,
      requestTick(callback: (nowMs: number) => void): () => void {
        const tick = { active: true, callback };
        ticks.push(tick);
        return Object.freeze((): void => {
          tick.active = false;
        });
      },
    }) satisfies PresentationClockV1;
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      initialSay: true,
      narrativeClock: clock,
    });
    try {
      await waitFor(() => {
        expect(
          screen.getByTestId("default-root-narrative-say"),
        ).toHaveAttribute("data-player-phase", "active");
      });
      const tick = ticks.findLast((candidate) => candidate.active);
      if (tick === undefined) {
        throw new Error("expected one active Narrative tick");
      }

      currentNow = 808.5;
      await act(() => tick.callback(783.4));

      await waitFor(() => {
        const player = screen.getByTestId("default-root-narrative-say");
        expect(player).toHaveAttribute("data-player-kind", "say");
        expect(player).toHaveAttribute("data-player-phase", "active");
        expect(player).toHaveAttribute("data-revealed-characters", "1");
      });
    } finally {
      fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("resumes the current revealed Say after a higher System dialog and advances exactly once", async () => {
    const clock = createManualPresentationClockV1();
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      initialSay: true,
      narrativeClock: clock,
    });
    try {
      const user = userEvent.setup();
      await waitFor(() => {
        expect(
          screen.getByTestId("default-root-narrative-say"),
        ).toHaveAttribute("data-player-phase", "active");
      });
      expect(fixture.composition.systemDialogSession.openSettings()).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      expect(
        await screen.findByRole("dialog", { name: "Settings" }),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByTestId("default-root-narrative-say"),
        ).toHaveAttribute("data-player-phase", "suspended");
      });
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
        expect(
          screen.getByTestId("default-root-narrative-say"),
        ).toHaveAttribute("data-player-phase", "active");
      });

      act(() => clock.advance(10_000));
      await waitFor(() => {
        expect(
          screen.getByTestId("default-root-narrative-say"),
        ).toHaveAttribute("data-reveal-complete", "true");
      });
      const activate = fixture.callbacks.findLast(
        (capture) => capture.occurrenceId === "interaction-occurrence.1001",
      )?.callback;
      if (activate === undefined) {
        throw new Error("expected current Say activation callback");
      }

      act(() => {
        activate();
      });
      await waitFor(() => expect(fixture.dispatches).toHaveLength(1));
      act(() => {
        activate();
        activate();
      });
      expect(fixture.dispatches).toEqual([
        {
          expectedOccurrenceId: "interaction-occurrence.1001",
          resolution: { kind: "advance" },
        },
      ]);
      await waitFor(() => {
        expect(
          screen.getByTestId("default-root-narrative-choice"),
        ).toHaveAttribute("data-occurrence-id", "interaction-occurrence.1002");
      });
    } finally {
      fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("retains one coherent Barrier across StrictMode bind replay and terminal-cleans true unmount", async () => {
    const clock = createManualPresentationClockV1();
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    let setupCountAtDispatch = -1;
    let cleanupCountAtDispatch = -1;
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      initialStrictBarrier: Object.freeze({
        clock,
        onMount,
        onUnmount,
        onDispatch: () => {
          setupCountAtDispatch = onMount.mock.calls.length;
          cleanupCountAtDispatch = onUnmount.mock.calls.length;
        },
      }),
      strictMode: true,
    });
    let unmounted = false;
    try {
      expect(onMount).toHaveBeenCalledTimes(2);
      expect(onUnmount).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(fixture.dispatches).toHaveLength(1));

      expect(fixture.dispatches[0]).toMatchObject({
        expectedOccurrenceId: "interaction-occurrence.1001",
        resolution: { kind: "barrier_completed" },
      });
      expect(setupCountAtDispatch).toBe(2);
      expect(cleanupCountAtDispatch).toBe(1);
      expect(fixture.failures).toEqual([]);
      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(
        fixture.composition,
      );
      expect(managed.isTerminalInternalV1()).toBe(false);
      expect(
        managed.narrative.getCurrentSelectionInternalV1()?.pending,
      ).toBeNull();

      expect(
        fixture.composition.cues.play("cue.test.default-root-lifetime"),
      ).toBe(true);
      expect(clock.pendingTickCount()).toBe(1);
      fixture.unmount();
      unmounted = true;
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onUnmount).toHaveBeenCalledTimes(2);
      expect(clock.pendingTickCount()).toBe(0);
      expect(
        fixture.composition.cues.play("cue.test.default-root-lifetime"),
      ).toBe(false);
      expect(fixture.dispatches).toHaveLength(1);
    } finally {
      if (!unmounted) fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("terminal-seals the composition when the current Choice completion rejects", async () => {
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      completionMode: "reject_current",
    });
    try {
      await userEvent
        .setup()
        .click(await screen.findByTestId("default-root-narrative-choice"));
      await waitFor(() => expect(fixture.failures).toHaveLength(1));

      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(
        fixture.composition,
      );
      expect(fixture.failures[0]?.code).toBe(
        "ui.narrative_surface_composition_failed",
      );
      expect(managed.isTerminalInternalV1()).toBe(true);
      expect(managed.narrative.getCurrentSessionInternalV1()).toBeNull();
      expect(
        fixture.composition.input.route(
          Object.freeze({
            kind: "action",
            actionId: systemInputActionIdsV1.confirm,
          }),
        ),
      ).toEqual({ kind: "ignored" });
    } finally {
      fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("keeps a Story-rejected Choice completion interactive as an unpublished no-op", async () => {
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      completionMode: "resolve_without_publication",
    });
    try {
      const user = userEvent.setup();
      await user.click(await screen.findByTestId("default-root-narrative-choice"));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // The Story refused the resolution and left the session unchanged:
      // not a Surface fault, and the same Choice must stay dispatchable.
      expect(fixture.dispatches).toHaveLength(1);
      expect(fixture.failures).toEqual([]);
      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(
        fixture.composition,
      );
      expect(managed.isTerminalInternalV1()).toBe(false);
      expect(managed.narrative.getCurrentSessionInternalV1()).not.toBeNull();

      await user.click(await screen.findByTestId("default-root-narrative-choice"));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(fixture.dispatches).toHaveLength(2);
      expect(fixture.failures).toEqual([]);
    } finally {
      fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("ignores a late rejected Choice completion after synchronous semantic publication", async () => {
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      completionMode: "publish_pending",
    });
    try {
      await userEvent
        .setup()
        .click(await screen.findByTestId("default-root-narrative-choice"));
      await waitFor(() =>
        expect(
          screen.getByTestId("default-root-narrative-choice"),
        ).toHaveAttribute("data-occurrence-id", "interaction-occurrence.1002")
      );
      expect(fixture.dispatches).toHaveLength(1);

      await act(async () => {
        fixture.rejectPendingCompletion(
          new Error("late predecessor completion rejected"),
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(
        fixture.composition,
      );
      expect(fixture.failures).toEqual([]);
      expect(managed.isTerminalInternalV1()).toBe(false);
      expect(
        managed.narrative.getCurrentSelectionInternalV1()?.pending
          ?.occurrenceId,
      ).toBe("interaction-occurrence.1002");
      expect(
        screen.getByTestId("default-root-narrative-choice"),
      ).toHaveAttribute("data-occurrence-id", "interaction-occurrence.1002");
    } finally {
      fixture.unmount();
      fixture.composition.dispose();
    }
  });

  it("renders no optional managed writer while retaining the required WholeCanvas layer", () => {
    type HasPublicTitleScreenIngressV1 = "titleScreen" extends keyof DefaultGameRootPropsV1<
      unknown,
      unknown,
      unknown,
      unknown,
      string,
      unknown
    > ? true
      : false;
    expectTypeOf<HasPublicTitleScreenIngressV1>().toEqualTypeOf<false>();

    const fixture = renderHostedLifecycleRootV1();

    expect(
      document.querySelector('[data-default-narrative-surface-portal="true"]'),
    ).toBeNull();
    expect(
      document.querySelector(
        '[data-default-whole-canvas-surface-portal="true"]',
      ),
    ).toBeNull();
    expect(
      document.querySelector('[data-stage-layer="whole_canvas"]'),
    ).toBeEmptyDOMElement();

    fixture.composition.dispose();
  });

  it("hosts one private WholeCanvas binding in its required layer across a successor", async () => {
    const fixture = renderCompositionOwnedNarrativeRootInternalV1({
      wholeCanvas: true,
      strictMode: true,
    });
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(
      fixture.composition,
    );
    const initialBinding = managed.wholeCanvas.getCurrentHostBindingInternalV1();
    const wholeCanvasLayer = document.querySelector(
      '[data-stage-layer="whole_canvas"]',
    );
    const portal = wholeCanvasLayer?.querySelector(
      '[data-default-whole-canvas-surface-portal="true"]',
    );

    expect(initialBinding).not.toBeNull();
    expect(wholeCanvasLayer).not.toBeNull();
    expect(portal).not.toBeNull();
    expect(portal).toHaveStyle({ pointerEvents: "none" });
    expect(
      document.querySelectorAll(
        '[data-default-whole-canvas-surface-portal="true"]',
      ),
    ).toHaveLength(1);
    expect(
      document
        .querySelector('[data-stage-layer="system"]')
        ?.querySelector('[data-default-whole-canvas-surface-portal="true"]'),
    ).toBeNull();
    const initialPrimary = await screen.findByTestId(
      "default-root-whole-canvas-primary",
    );
    expect(
      initialPrimary.closest("[data-whole-canvas-surface='primary']"),
    ).toHaveStyle({ pointerEvents: "auto" });
    const initialInstanceId = initialPrimary.getAttribute("data-instance-id");
    expect(initialInstanceId).not.toBeNull();
    expect(
      initialPrimary.closest('[data-whole-canvas-surface-host="true"]'),
    ).not.toBeNull();

    await act(async () => {
      fixture.anchorEvents.publish(
        Object.freeze({
          anchor: Object.freeze({ epoch: 1, origin: "load" }),
          token: null,
        }),
      );
      await Promise.resolve();
    });

    const successorRuntime = managed.runtime.getCurrent();
    const successorBinding = managed.wholeCanvas.getCurrentHostBindingInternalV1();
    expect(successorBinding).not.toBeNull();
    expect(successorBinding).not.toBe(initialBinding);
    expect(
      managed.wholeCanvas.isCurrentRuntimeAttachmentInternalV1(
        successorRuntime,
      ),
    ).toBe(true);
    expect(
      document.querySelector(
        '[data-default-whole-canvas-surface-portal="true"]',
      ),
    ).toBe(portal);
    await waitFor(() => {
      const successorPrimary = screen.getByTestId(
        "default-root-whole-canvas-primary",
      );
      expect(successorPrimary.getAttribute("data-instance-id")).not.toBe(
        initialInstanceId,
      );
    });

    fixture.unmount();
    fixture.composition.dispose();
    expect(managed.wholeCanvas.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("keeps the mounted Stage subtree across application epoch successors", async () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const clock = createManualPresentationClockV1();
    const fixture = renderHostedLifecycleRootV1({
      stageLifetime: Object.freeze({ onMount, onUnmount, clock }),
      strictMode: true,
    });

    expect(onMount).toHaveBeenCalledTimes(2);
    expect(onUnmount).toHaveBeenCalledTimes(1);
    expect(clock.pendingTickCount()).toBe(1);

    act(() => clock.advance(100));
    expect(clock.pendingTickCount()).toBe(0);

    await act(async () => {
      fixture.anchorEvents.publish(
        Object.freeze({
          anchor: Object.freeze({ epoch: 1, origin: "load" }),
          token: null,
        }),
      );
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole("application")).toHaveAttribute(
        "data-presentation-epoch",
        "1",
      )
    );

    expect(onMount).toHaveBeenCalledTimes(2);
    expect(onUnmount).toHaveBeenCalledTimes(1);
    expect(clock.pendingTickCount()).toBe(1);
    expect(
      fixture.composition.cues.play("cue.test.default-root-lifetime"),
    ).toBe(true);
    expect(clock.pendingTickCount()).toBe(2);

    // Composition terminal disposal reaches the bound private Stage driver
    // and its decorative timeline player even while React remains mounted.
    await act(async () => fixture.composition.dispose());
    expect(clock.pendingTickCount()).toBe(0);
    expect(onUnmount).toHaveBeenCalledTimes(1);

    cleanup();
    expect(onUnmount).toHaveBeenCalledTimes(2);
  });

  it("retains epoch remount semantics for structurally typed legacy compositions", () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const clock = createManualPresentationClockV1();
    const fixture = renderLifecycleRootV1({
      stageLifetime: Object.freeze({ onMount, onUnmount, clock }),
    });

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();

    act(() => {
      fixture.publishAnchor(Object.freeze({ epoch: 1, origin: "load" }));
    });

    expect(onMount).toHaveBeenCalledTimes(2);
    expect(onUnmount).toHaveBeenCalledTimes(1);
    cleanup();
    expect(onUnmount).toHaveBeenCalledTimes(2);
  });

  it("returns managed structured System results through the Story slot context", async () => {
    const fixture = renderLifecycleRootV1({});
    let settingsResult: ReturnType<typeof fixture.openSettings> | undefined;

    act(() => {
      settingsResult = fixture.openSettings();
    });

    expect(settingsResult).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(Object.isFrozen(settingsResult)).toBe(true);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: null });
    expect(fixture.openSettings()).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    expect(fixture.openSaves()).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_missing",
    });

    await act(async () => {
      await new Promise<void>((complete) => queueMicrotask(complete));
    });
    expect(fixture.systemDialogSession.getSnapshot()).toEqual({
      active: "settings",
    });
  });

  it("fails closed without composition-owned front-door authority", async () => {
    const fixture = renderLifecycleRootV1({});
    const topology = await openActiveTopologyV1(fixture);
    const before = fixture.managedSurfaceRuntimeOwner
      .getCurrent()
      .coordinator.getSnapshot();
    const systemNotifications = vi.fn();
    const overlayNotifications = vi.fn();
    fixture.systemDialogInternal.subscribeInternalV1(systemNotifications);
    fixture.overlaySession.subscribe(overlayNotifications);

    let outcome: Promise<void> | undefined;
    expect(() => {
      outcome = fixture.returnToTitle();
      void outcome.catch(() => undefined);
    }).not.toThrow();
    expect(outcome).toBeDefined();
    await expect(outcome).rejects.toThrow(
      "ui.whole_canvas_front_door_unavailable",
    );

    expect(
      fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot(),
    ).toBe(before);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(systemNotifications).not.toHaveBeenCalled();
    expect(overlayNotifications).not.toHaveBeenCalled();
  });

  it("preserves a fresh Overlay synchronously opened by the exact successor subscriber", async () => {
    const fixture = renderHostedLifecycleRootV1({ withFrontDoor: true });
    const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(
      fixture.composition,
    );
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(
      fixture.composition.overlaySession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    let notifications = 0;
    let unsubscribe: () => void = () => undefined;

    try {
      await act(async () => {
        fixture.anchorEvents.publish(
          Object.freeze({
            anchor: Object.freeze({ epoch: 1, origin: "load" }),
            token: null,
          }),
        );
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Hosted lifecycle fixture" }),
        ).toBeNull()
      );
      expect(managedComposition.runtime.getCurrent().applicationEpoch).toBe(17);

      unsubscribe = fixture.composition.overlaySession.subscribe(() => {
        notifications += 1;
        const publication = overlayInternal.getManagedSnapshotInternalV1();
        if (publication.applicationEpoch !== 23 || openAttempted) return;
        openAttempted = true;
        openResult = fixture.composition.intents.execute(
          Object.freeze({
            kind: "overlay.open" as const,
            overlayId: "lifecycle.primary",
          }),
        );
        freshInstanceId = overlayInternal.getManagedSnapshotInternalV1().orderedInstances[0]
          ?.surfaceInstanceId;
      });

      await act(async () => {
        await fixture.returnToTitle();
      });

      expect(fixture.restart).toHaveBeenCalledTimes(1);
      expect(openResult).toEqual({ kind: "executed" });
      expect(freshInstanceId).toBe("surface-instance.e23.n2");
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 2, origin: "restart" },
          token: fixture.restartToken,
          managedSurfaceApplicationEpoch: 23,
        },
      ]);
      expect(fixture.failed).toEqual([]);
      expect(fixture.allocatedEpochs).toEqual([11, 17, 23]);

      const afterReturn = overlayInternal.getManagedSnapshotInternalV1();
      expect(afterReturn.applicationEpoch).toBe(23);
      expect(
        afterReturn.orderedInstances.map(
          (instance) => instance.surfaceInstanceId,
        ),
      ).toEqual([freshInstanceId]);
      expect(
        document.querySelector(
          '[data-managed-surface-definition="surface.whole-canvas.title"]' +
            '[data-managed-surface-instance="surface-instance.e23.n1"]',
        ),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(fixture.composition.overlaySession.getSnapshot()).toEqual({
          primaryId: "lifecycle.primary",
          detailIds: [],
        })
      );
      expect(
        await screen.findByRole("dialog", { name: "lifecycle.primary" }),
      ).toBeInTheDocument();

      const stablePublication = overlayInternal.getManagedSnapshotInternalV1();
      const stableNotifications = notifications;
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(overlayInternal.getManagedSnapshotInternalV1()).toBe(
        stablePublication,
      );
      expect(notifications).toBe(stableNotifications);
      expect(stablePublication.orderedInstances[0]?.surfaceInstanceId).toBe(
        freshInstanceId,
      );
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });

  it("preserves a fresh System root synchronously opened by the exact restart successor subscriber", async () => {
    const fixture = renderHostedLifecycleRootV1({ withFrontDoor: true });
    const systemInternal = resolveSystemDialogSessionInternalV1(
      fixture.composition.systemDialogSession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    let notifications = 0;
    const unsubscribe = systemInternal.subscribeInternalV1(() => {
      notifications += 1;
      const publication = systemInternal.getManagedSnapshotInternalV1();
      if (publication.applicationEpoch !== 23 || openAttempted) return;
      openAttempted = true;
      openResult = fixture.composition.systemDialogSession.openSettings();
      freshInstanceId = systemInternal.getManagedSnapshotInternalV1().orderedInstances[0]
        ?.surfaceInstanceId;
    });

    try {
      await act(async () => {
        fixture.anchorEvents.publish(
          Object.freeze({
            anchor: Object.freeze({ epoch: 1, origin: "load" }),
            token: null,
          }),
        );
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Hosted lifecycle fixture" }),
        ).toBeNull()
      );

      await act(async () => {
        await fixture.returnToTitle();
      });

      expect(openResult).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      expect(fixture.restart).toHaveBeenCalledTimes(1);
      expect(freshInstanceId).toBe("surface-instance.e23.n2");
      expect(fixture.failed).toEqual([]);
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 2, origin: "restart" },
          token: fixture.restartToken,
          managedSurfaceApplicationEpoch: 23,
        },
      ]);
      await waitFor(() =>
        expect(fixture.composition.systemDialogSession.getSnapshot()).toEqual({
          active: "settings",
        })
      );
      expect(
        await screen.findByRole("dialog", { name: "Settings" }),
      ).toBeInTheDocument();

      const stablePublication = systemInternal.getManagedSnapshotInternalV1();
      const stableRenderSnapshot = systemInternal.getHostRenderSnapshotInternalV1();
      const stableNotifications = notifications;
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(systemInternal.getManagedSnapshotInternalV1()).toBe(
        stablePublication,
      );
      expect(systemInternal.getHostRenderSnapshotInternalV1()).toBe(
        stableRenderSnapshot,
      );
      expect(notifications).toBe(stableNotifications);
      expect(stablePublication.orderedInstances[0]?.surfaceInstanceId).toBe(
        freshInstanceId,
      );
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });

  it("keeps a fresh System root after the predecessor Saves load settles as successor", async () => {
    const fixture = renderHostedLifecycleRootV1({ withSaveUi: true });
    const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(
      fixture.composition,
    );
    const systemInternal = resolveSystemDialogSessionInternalV1(
      fixture.composition.systemDialogSession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    const unsubscribe = systemInternal.subscribeInternalV1(() => {
      const publication = systemInternal.getManagedSnapshotInternalV1();
      if (publication.applicationEpoch !== 17 || openAttempted) return;
      openAttempted = true;
      openResult = fixture.composition.systemDialogSession.openSettings();
      freshInstanceId = systemInternal.getManagedSnapshotInternalV1().orderedInstances[0]
        ?.surfaceInstanceId;
    });

    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(
        await screen.findByRole("dialog", { name: "Hosted saves" }),
      ).toBeInTheDocument();
      await user.click(
        await screen.findByRole("button", { name: "Load Quick save" }),
      );
      expect(
        await screen.findByRole("dialog", {
          name: "Load Quick save confirmation",
        }),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Confirm operation" }),
      );

      expect(fixture.load).toHaveBeenCalledExactlyOnceWith("quick");
      expect(openResult).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      expect(freshInstanceId).toBe("surface-instance.e17.n1");
      expect(fixture.failed).toEqual([]);
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 1, origin: "load" },
          token: fixture.loadToken,
          managedSurfaceApplicationEpoch: 17,
        },
      ]);
      await waitFor(() =>
        expect(fixture.composition.systemDialogSession.getSnapshot()).toEqual({
          active: "settings",
        })
      );
      expect(
        await screen.findByRole("dialog", { name: "Settings" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Hosted saves" })).toBeNull();
      expect(
        screen.queryByRole("dialog", {
          name: "Load Quick save confirmation",
        }),
      ).toBeNull();

      const stablePublication = systemInternal.getManagedSnapshotInternalV1();
      const stableRenderSnapshot = systemInternal.getHostRenderSnapshotInternalV1();
      const stableCoordinator = managedComposition.runtime
        .getCurrent()
        .coordinator.getSnapshot();
      let sessionNotifications = 0;
      let coordinatorNotifications = 0;
      const unsubscribeStableSession = systemInternal.subscribeInternalV1(
        () => (sessionNotifications += 1),
      );
      const unsubscribeCoordinator = managedComposition.runtime
        .getCurrent()
        .coordinator.subscribe(() => (coordinatorNotifications += 1));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(systemInternal.getManagedSnapshotInternalV1()).toBe(
        stablePublication,
      );
      expect(systemInternal.getHostRenderSnapshotInternalV1()).toBe(
        stableRenderSnapshot,
      );
      expect(
        managedComposition.runtime.getCurrent().coordinator.getSnapshot(),
      ).toBe(stableCoordinator);
      expect(sessionNotifications).toBe(0);
      expect(coordinatorNotifications).toBe(0);
      unsubscribeCoordinator();
      unsubscribeStableSession();
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });
});
