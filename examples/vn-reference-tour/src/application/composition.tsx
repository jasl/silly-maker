// SPDX-License-Identifier: MIT
// Composition layer: assembles the script, rules, and UI into a bootable game
// application (browser and desktop webview share one declaration); orchestration only, owns no gameplay.
import { useEffect } from "react";
import type {
  AudioIntentV1,
  AssetId,
  DeepReadonly,
  ResolvedAssetManifestV1,
  TextContentSessionV1,
  TextId,
} from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  DefineNarrativeSurfaceInputV1,
  GameUiProjectorV1,
  HeldInputPortV1,
  NarrativeSurfaceSelectionV1,
  PresentationFreezePortV1,
  RuntimePresentationPublicationV1,
  AssetRegistryV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import {
  createAssetRegistryV1,
  defineNarrativeSurfaceV1,
  GameAudioV1,
  SemanticStageV1,
} from "@sillymaker/ui";
import { createDefaultVnPlayerV1 } from "@sillymaker/ui/narrative-player";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

import type {
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourActionResultV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
} from "./semantic.ts";
import type {
  VnReferenceTourApplicationInstanceV1,
  VnReferenceTourExtensionsV1,
} from "./core-definition.ts";
import { vnReferenceTourCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourSimulationTypesV1,
} from "../game/simulation.ts";
import {
  createVnReferenceTourSaveOverlayCopyV1,
  createVnReferenceTourStageContentCatalogV1,
  vnReferenceTourStageAmbientCatalogV1,
  vnReferenceTourStageTransitionCatalogV1,
  vnReferenceTourTextCatalogsV1,
} from "../content/presentation.ts";
import {
  vnReferenceTourArchiveTextPackIdV1,
  vnReferenceTourPresentTextPackIdV1,
  vnReferenceTourSharedTextPackIdV1,
  vnReferenceTourTextContentManifestV1,
} from "../content/text-content.ts";
import {
  resolveVnReferenceTourEffectAssetV1,
  vnReferenceTourAudioManifestV1,
} from "../content/audio.ts";
import type { VnReferenceTourNarrativeStateV1 } from "../story/narrative.ts";
import { VnReferenceTourEndingSurfaceV1 } from "../ui/ending-surface.tsx";
import { createVnReferenceTourStageRenderersV1 } from "../ui/stage-renderers.tsx";

/** The logical canvas: a 16:9 design resolution the viewport letterboxes. */
export const vnReferenceTourViewportCanvasV1 = { width: 1600, height: 900 };

type VnReferenceTourSemanticPublicationV1 = ReturnType<
  VnReferenceTourApplicationInstanceV1["semantic"]["observe"]
>;
type VnReferenceTourSemanticPortV1 = VnReferenceTourApplicationInstanceV1["semantic"];
type VnReferenceTourAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type VnReferenceTourAssetRegistryV1 = AssetRegistryV1<
  AssetId,
  VnReferenceTourAssetUsageV1,
  string
>;

const selectVnReferenceTourAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const noNarrativeChoiceReasonsV1: readonly string[] = [];
function vnReferenceTourRouteTextPackV1(
  narrative: DeepReadonly<VnReferenceTourNarrativeStateV1>,
) {
  return narrative.signalChoice === "archive"
    ? vnReferenceTourArchiveTextPackIdV1
    : narrative.signalChoice === "present"
    ? vnReferenceTourPresentTextPackIdV1
    : null;
}

/** Pure Story projection consumed by the public Narrative definition. */
export function projectVnReferenceTourNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<VnReferenceTourSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null
    ? null
    : (narrative.choiceOptions.map((option) => {
      if (option.enabled !== (option.blockedBy === null)) {
        throw new TypeError("vn-reference-tour.narrative_choice_availability_inconsistent");
      }
      return ({
        choiceId: option.choiceId,
        status: option.enabled ? ("enabled" as const) : ("disabled" as const),
        reasonTextIds: noNarrativeChoiceReasonsV1,
      });
    }));
  return ({
    pending: narrative.pending,
    history: narrative.history,
    choiceAvailability,
    voiceReplayAvailable: narrative.pending?.kind === "say" &&
      publication.game.audio.voice?.occurrenceId === narrative.pending.occurrenceId,
  });
}

export interface VnReferenceTourPresentationViewV1 {
  readonly anchorEpoch: number;
  readonly stageTarget: StageRenderTarget;
}

export type VnReferenceTourUiPublicationV1 = RuntimePresentationPublicationV1<
  VnReferenceTourSemanticPublicationV1,
  VnReferenceTourPresentationViewV1,
  AssetId
>;

export type VnReferenceTourUiOverlayIdV1 = never;

function createVnReferenceTourUiProjectorV1(
  textContent: TextContentSessionV1,
): GameUiProjectorV1<
  VnReferenceTourSemanticPublicationV1,
  null,
  Record<never, never>,
  VnReferenceTourPresentationViewV1,
  AssetId
> {
  const stageContentCatalog = createVnReferenceTourStageContentCatalogV1(
    (textId) => textContent.resolveText(textId as TextId),
  );
  return {
    resolvedCatalog: null,
    initialUiState: {},
    project: (input) => {
      const projection = projectStageRenderTarget(
        input.semantic.game.stage,
        stageContentCatalog,
      );
      return ({
        view: {
          anchorEpoch: input.uiState.anchor.epoch,
          stageTarget: projection.target,
        },
        requiredAssetIds: projection.target.requiredAssetIds,
      });
    },
  };
}

type VnReferenceTourStageContextV1 = Parameters<
  NonNullable<
    DefaultGameRootSlotsV1<
      VnReferenceTourUiPublicationV1,
      VnReferenceTourSemanticPortV1,
      VnReferenceTourUiOverlayIdV1
    >["background"]
  >
>[0];

function VnReferenceTourStageSurfaceV1(props: {
  readonly accessibleName: string;
  readonly context: VnReferenceTourStageContextV1;
  readonly instance: VnReferenceTourApplicationInstanceV1;
  readonly presentationFreeze: PresentationFreezePortV1;
  readonly registry: VnReferenceTourAssetRegistryV1;
  readonly renderers: ReturnType<typeof createVnReferenceTourStageRenderersV1>;
  reportFailure(code: string, error: unknown): void;
}) {
  const { requiredAssetIds, revision } = props.context.publication;
  const { registry, reportFailure } = props;
  useEffect(() => {
    const controller = new AbortController();
    void registry
      .preload(requiredAssetIds, controller.signal)
      .catch((error: unknown) => reportFailure("vn-reference-tour.asset_preload_failed", error));
    return () => controller.abort();
  }, [registry, reportFailure, requiredAssetIds, revision]);

  return (
    <section
      data-vn-reference-tour-stage="true"
      aria-label={props.accessibleName}
    >
      <SemanticStageV1
        target={props.context.publication.view.stageTarget}
        revision={props.context.publication.semantic.revision}
        epoch={props.context.publication.view.anchorEpoch}
        dispatches={props.instance.stageCueDispatches()}
        catalog={vnReferenceTourStageTransitionCatalogV1}
        ambient={vnReferenceTourStageAmbientCatalogV1}
        renderers={props.renderers}
        assets={props.registry}
        accessibleName={props.accessibleName}
        clock={props.presentationFreeze.clock}
      />
    </section>
  );
}

function createVnReferenceTourUiSlotsV1(
  instance: VnReferenceTourApplicationInstanceV1,
  presentationFreeze: PresentationFreezePortV1,
  textContent: TextContentSessionV1,
  registry: VnReferenceTourAssetRegistryV1,
  renderers: ReturnType<typeof createVnReferenceTourStageRenderersV1>,
  playerProfile: PlayerProfileStoreV1,
  registerReplayVoice: (replay: (() => boolean) | null) => void,
  registerCurrentVoicePlaying: (query: (() => boolean) | null) => void,
  reportFailure: (code: string, error: unknown) => void,
): DefaultGameRootSlotsV1<
  VnReferenceTourUiPublicationV1,
  VnReferenceTourSemanticPortV1,
  VnReferenceTourUiOverlayIdV1
> {
  const uiText = (textId: string): string => textContent.resolveText(textId as TextId);
  const createAudioHost = () =>
    createWebAudioHostV1({
      manifest: vnReferenceTourAudioManifestV1,
      resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
      reportDiagnostic: (diagnostic) =>
        reportFailure(
          "vn-reference-tour.audio_fault",
          new Error(`${diagnostic.code}: ${diagnostic.detail}`),
        ),
    });
  return {
    background: (context) => (
      <VnReferenceTourStageSurfaceV1
        accessibleName={uiText("text.vn-reference-tour.stage.name")}
        context={context}
        instance={instance}
        presentationFreeze={presentationFreeze}
        registry={registry}
        renderers={renderers}
        reportFailure={reportFailure}
      />
    ),
    hud: (context) => {
      const narrative = context.publication.semantic.narrative;
      return (
        <>
          <GameAudioV1
            ports={instance}
            createHost={createAudioHost}
            selectIntent={selectVnReferenceTourAudioIntentV1}
            resolveEffectAsset={resolveVnReferenceTourEffectAssetV1}
            playerProfile={playerProfile}
            registerReplayVoice={registerReplayVoice}
            registerCurrentVoicePlaying={registerCurrentVoicePlaying}
          />
          {narrative.phase !== "completed" || narrative.signalChoice === null
            ? null
            : (
              <VnReferenceTourEndingSurfaceV1
                title={textContent.resolveText(
                  `text.vn-reference-tour.${narrative.signalChoice}.ending.title` as TextId,
                )}
                kicker={uiText("text.vn-reference-tour.ending.kicker")}
                summary={uiText("text.vn-reference-tour.ending.summary")}
                backLabel={uiText("text.vn-reference-tour.playback.back")}
                returnLabel={uiText("text.vn-reference-tour.ending.return")}
                returningLabel={uiText("text.vn-reference-tour.ending.returning")}
                returnFailure={uiText("text.vn-reference-tour.ending.return-failed")}
                input={context.input}
                rollback={instance.rollback}
                onReturnToTitle={context.systemDialogs.returnToTitle}
              />
            )}
        </>
      );
    },
  };
}

const vnReferenceTourVnPlayerLabelTextIdsV1 = {
  advance: "text.vn-reference-tour.narrative.advance",
  playbackControls: "text.vn-reference-tour.playback.controls",
  back: "text.vn-reference-tour.playback.back",
  forward: "text.vn-reference-tour.playback.forward",
  history: "text.vn-reference-tour.playback.history",
  voice: "text.vn-reference-tour.playback.voice",
  skip: "text.vn-reference-tour.playback.skip",
  auto: "text.vn-reference-tour.playback.auto",
  showUi: "text.vn-reference-tour.playback.show-ui",
  historyTitle: "text.vn-reference-tour.playback.history.title",
  historyEmpty: "text.vn-reference-tour.playback.history.empty",
  historyClose: "text.vn-reference-tour.playback.history.close",
  menu: "text.vn-reference-tour.playback.menu",
  resume: "text.vn-reference-tour.playback.resume",
  save: "text.vn-reference-tour.playback.save",
  quickSave: "text.vn-reference-tour.playback.quick-save",
  quickLoad: "text.vn-reference-tour.playback.quick-load",
  settings: "text.vn-reference-tour.playback.settings",
  returnToTitle: "text.vn-reference-tour.playback.return-title",
  quickSaveComplete: "text.vn-reference-tour.playback.quick-save-complete",
  quickLoadDescription: "text.vn-reference-tour.playback.quick-load-description",
  confirm: "text.vn-reference-tour.playback.confirm-load",
  cancel: "text.vn-reference-tour.playback.cancel",
  operationFailed: "text.vn-reference-tour.playback.operation-failed",
  quickLoadUnavailable: "text.vn-reference-tour.playback.quick-load-unavailable",
};

function createVnReferenceTourRootLabelsV1(
  textContent: TextContentSessionV1,
): Partial<DefaultGameRootLabelsV1> {
  const resolve = (textId: string): string => textContent.resolveText(textId as TextId);
  return {
    systemMenuLabel: resolve("text.vn-reference-tour.system.label"),
    saveLabel: resolve("text.vn-reference-tour.system.save"),
    settingsLabel: resolve("text.vn-reference-tour.system.settings"),
    settingsTitle: resolve("text.vn-reference-tour.system.settings"),
    settingsEmptyText: resolve("text.vn-reference-tour.system.settings-empty"),
    settingsMutedLabel: resolve("text.vn-reference-tour.system.mute"),
    titleNewGameLabel: resolve("text.vn-reference-tour.title.new-game"),
    titleNewGameFailedText: resolve("text.vn-reference-tour.title.new-game-failed"),
    titleContinueLabel: resolve("text.vn-reference-tour.title.continue"),
    titleLoadGameLabel: resolve("text.vn-reference-tour.title.load"),
    closeLabel: resolve("text.vn-reference-tour.system.close"),
  };
}

function createVnReferenceTourSaveOverlayLabelsV1(
  textContent: TextContentSessionV1,
): SaveOverlayLabelsV1 {
  return createVnReferenceTourSaveOverlayCopyV1(textContent.currentLocale());
}

/**
 * The complete browser application: one declaration consumed by
 * `startWebGameApplicationV1` in `entry.tsx`. The composers own Session,
 * persistence, capability session, input adapters, automation, and HMR.
 */
export const vnReferenceTourGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
  VnReferenceTourActionResultV1,
  null,
  Record<never, never>,
  VnReferenceTourPresentationViewV1,
  AssetId,
  VnReferenceTourUiOverlayIdV1
> = {
  applicationId: "example-vn-reference-tour",
  accessibleName: "最后一次试音",
  viewport: {
    canvas: vnReferenceTourViewportCanvasV1,
    fallbackSize: { width: 1600, height: 900 },
    layoutVariants: [
      {
        id: "vn-portrait",
        when: { maxAspectRatio: 0.8 },
        mode: "expand-height",
      },
    ],
    // Scale up proportionally to fill the window (fit scaling keeps the aspect ratio, letterboxing as needed).
    maxScale: 4,
  },
  textContent: {
    manifest: vnReferenceTourTextContentManifestV1,
    bootstrapCatalogs: vnReferenceTourTextCatalogsV1.catalogs,
    initialPackIds: [vnReferenceTourSharedTextPackIdV1],
    requiredPackIdsForInvocation: (invocation: DeepReadonly<VnReferenceTourInvocationV1>) => {
      if (invocation.kind !== "resolve" || invocation.resolution.kind !== "choose") return [];
      return invocation.resolution.choiceId === "choice.vn-reference-tour.archive-voice"
        ? [vnReferenceTourArchiveTextPackIdV1]
        : invocation.resolution.choiceId === "choice.vn-reference-tour.present-voice"
        ? [vnReferenceTourPresentTextPackIdV1]
        : [];
    },
    requiredPackIdsForSnapshot: (
      snapshot: DeepReadonly<VnReferenceTourSimulationTypesV1["snapshot"]>,
    ) => {
      const routePack = vnReferenceTourRouteTextPackV1(snapshot.state.simulation.narrative);
      return routePack === null
        ? [vnReferenceTourSharedTextPackIdV1]
        : [vnReferenceTourSharedTextPackIdV1, routePack];
    },
  },
  core: vnReferenceTourCoreApplicationDefinitionV1,
  ui: (
    {
      assetLoader,
      heldInput,
      instance,
      playerProfile,
      presentationFreeze,
      reportFailure,
      textContent,
    }: {
      readonly assetLoader: Parameters<typeof createAssetRegistryV1>[1];
      readonly heldInput: HeldInputPortV1;
      readonly instance: VnReferenceTourApplicationInstanceV1;
      readonly playerProfile: PlayerProfileStoreV1;
      readonly presentationFreeze: PresentationFreezePortV1;
      readonly textContent: TextContentSessionV1 | null;
      reportFailure(code: string, error: unknown): void;
    },
  ) => {
    if (textContent === null) throw new TypeError("vn-reference-tour.text_content_session_missing");
    const manifest = (instance.extensions as VnReferenceTourExtensionsV1).assets;
    const registry = createAssetRegistryV1(
      manifest,
      assetLoader,
      (diagnostic) => reportFailure("vn-reference-tour.asset_fault", diagnostic),
    ) as VnReferenceTourAssetRegistryV1;
    const renderers = createVnReferenceTourStageRenderersV1(registry);
    const replayVoiceRef: { current: (() => boolean) | null } = { current: null };
    const registerReplayVoice = (replay: (() => boolean) | null): void => {
      replayVoiceRef.current = replay;
    };
    const currentVoicePlayingRef: { current: (() => boolean) | null } = { current: null };
    const registerCurrentVoicePlaying = (query: (() => boolean) | null): void => {
      currentVoicePlayingRef.current = query;
    };
    const vnPlayer = createDefaultVnPlayerV1({
      heldInput,
      rollback: instance.rollback,
      labelTextIds: vnReferenceTourVnPlayerLabelTextIdsV1,
    });
    return ({
      dispose: () => {
        registerCurrentVoicePlaying(null);
        registerReplayVoice(null);
        registry.dispose();
      },
      titleScreen: {
        title: textContent.resolveText("text.vn-reference-tour.app.name" as TextId),
        beginNewGame: () =>
          instance.semantic.dispatch({
            kind: "invoke",
            actionId: "vn-reference-tour.begin_story",
          }),
      },
      accessibleName: textContent.resolveText("text.vn-reference-tour.app.name" as TextId),
      projector: createVnReferenceTourUiProjectorV1(textContent),
      narrative: defineNarrativeSurfaceV1<VnReferenceTourSemanticPublicationV1>(
        {
          selectNarrative: projectVnReferenceTourNarrativeSurfaceSelectionV1,
          dispatchResolution: (request) =>
            instance.semantic.dispatch(
              ({
                kind: "resolve" as const,
                expectedOccurrenceId: request.expectedOccurrenceId,
                resolution: request.resolution,
              }) as never,
            ),
          // The session-level time verb: hold cadence ticks, expiry, and
          // skippable folds all arrive here as hold-fenced elapsed
          // milliseconds and route to the Story's time command.
          dispatchTime: (tick) =>
            instance.semantic.dispatch(
              ({ kind: "time" as const, tick }) as never,
            ),
          renderer: vnPlayer.renderer,
          resolveText: (_locale, textId) => textContent.resolveText(textId as TextId),
          replayCurrentVoice: () => replayVoiceRef.current?.() ?? false,
          isCurrentVoicePlaying: () => currentVoicePlayingRef.current?.() ?? false,
        } satisfies DefineNarrativeSurfaceInputV1<VnReferenceTourSemanticPublicationV1>,
      ),
      slots: createVnReferenceTourUiSlotsV1(
        instance,
        presentationFreeze,
        textContent,
        registry,
        renderers,
        playerProfile,
        registerReplayVoice,
        registerCurrentVoicePlaying,
        reportFailure,
      ),
      labels: createVnReferenceTourRootLabelsV1(textContent),
      saveLabels: createVnReferenceTourSaveOverlayLabelsV1(textContent),
      // M2 owns compact VN player chrome. The generic floating
      // Save/Settings/Mute cluster returns through product UI in M3.
      hideSystemMenu: true,
      input: vnPlayer.input,
      // Game-shell feel is the engine default: no browser context menu, text
      // selection, or hover-cursor changes; editable controls and
      // data-native-menu / data-native-text subtrees stay native. Declare
      // `input: { nativeBehavior: false }` only for a browser-native page.
    });
  },
};
