// SPDX-License-Identifier: MIT
// Composition layer: assembles the script, rules, and UI into a bootable game
// application (browser and desktop webview share one declaration); orchestration only, owns no gameplay.
import { useEffect } from "react";
import type {
  AudioIntentV1,
  AssetId,
  DeepReadonly,
  ResolvedAssetManifestV1,
  RuntimeCapabilityPortV1,
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
  NarrativeSurfaceHistoryFeatureV1,
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
  useLocaleTextV1,
} from "@sillymaker/ui";
import { DefaultSettingsSectionsV1 } from "@sillymaker/ui/reference/settings";
import type { DefaultVnPlayerCoreV1 } from "@sillymaker/vn/ui";
import type { WebGameApplicationV1, WebGameOuterUiV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

import type {
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckActionResultV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
} from "./semantic.ts";
import type {
  VnLastSoundCheckApplicationInstanceV1,
  VnLastSoundCheckExtensionsV1,
} from "./core-definition.ts";
import { vnLastSoundCheckCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckSimulationTypesV1,
} from "../game/simulation.ts";
import {
  createVnLastSoundCheckSaveOverlayCopyV1,
  createVnLastSoundCheckStageContentCatalogV1,
  vnLastSoundCheckStageAmbientCatalogV1,
  vnLastSoundCheckStageTransitionCatalogV1,
  vnLastSoundCheckTextCatalogsV1,
} from "../content/presentation.ts";
import {
  vnLastSoundCheckArchiveTextPackIdV1,
  vnLastSoundCheckPresentTextPackIdV1,
  vnLastSoundCheckSharedTextPackIdV1,
  vnLastSoundCheckTextContentManifestV1,
} from "../content/text-content.ts";
import {
  resolveVnLastSoundCheckEffectAssetV1,
  vnLastSoundCheckAudioManifestV1,
} from "../content/audio.ts";
import type { VnLastSoundCheckNarrativeStateV1 } from "../story/narrative.ts";
import { VnLastSoundCheckEndingSurfaceV1 } from "../ui/ending-surface.tsx";
import { createVnLastSoundCheckStageRenderersV1 } from "../ui/stage-renderers.tsx";

/** The logical canvas: a 16:9 design resolution the viewport letterboxes. */
export const vnLastSoundCheckViewportCanvasV1 = { width: 1600, height: 900 };

type VnLastSoundCheckSemanticPublicationV1 = ReturnType<
  VnLastSoundCheckApplicationInstanceV1["semantic"]["observe"]
>;
type VnLastSoundCheckSemanticPortV1 = VnLastSoundCheckApplicationInstanceV1["semantic"];
type VnLastSoundCheckAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type VnLastSoundCheckAssetRegistryV1 = AssetRegistryV1<
  AssetId,
  VnLastSoundCheckAssetUsageV1,
  string
>;

const selectVnLastSoundCheckAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const noNarrativeChoiceReasonsV1: readonly string[] = [];
function vnLastSoundCheckRouteTextPackV1(
  narrative: DeepReadonly<VnLastSoundCheckNarrativeStateV1>,
) {
  return narrative.signalChoice === "archive"
    ? vnLastSoundCheckArchiveTextPackIdV1
    : narrative.signalChoice === "present"
    ? vnLastSoundCheckPresentTextPackIdV1
    : null;
}

/** Pure Story projection consumed by the public Narrative definition. */
export function projectVnLastSoundCheckNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<VnLastSoundCheckSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null
    ? null
    : (narrative.choiceOptions.map((option) => ({
      choiceId: option.choiceId,
      status: "enabled" as const,
      reasonTextIds: noNarrativeChoiceReasonsV1,
    })));
  return ({
    pending: narrative.pending,
    history: narrative.history,
    choiceAvailability,
    voiceReplayAvailable: narrative.pending?.kind === "say" &&
      publication.game.audio.voice?.occurrenceId === narrative.pending.occurrenceId,
  });
}

export interface VnLastSoundCheckPresentationViewV1 {
  readonly anchorEpoch: number;
  readonly stageTarget: StageRenderTarget;
}

export type VnLastSoundCheckUiPublicationV1 = RuntimePresentationPublicationV1<
  VnLastSoundCheckSemanticPublicationV1,
  VnLastSoundCheckPresentationViewV1,
  AssetId
>;

export type VnLastSoundCheckUiOverlayIdV1 = never;

function createVnLastSoundCheckUiProjectorV1(
  textContent: TextContentSessionV1,
): GameUiProjectorV1<
  VnLastSoundCheckSemanticPublicationV1,
  null,
  Record<never, never>,
  VnLastSoundCheckPresentationViewV1,
  AssetId
> {
  const stageContentCatalog = createVnLastSoundCheckStageContentCatalogV1(
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

type VnLastSoundCheckStageContextV1 = Parameters<
  NonNullable<
    DefaultGameRootSlotsV1<
      VnLastSoundCheckUiPublicationV1,
      VnLastSoundCheckSemanticPortV1,
      VnLastSoundCheckUiOverlayIdV1
    >["background"]
  >
>[0];

function VnLastSoundCheckStageSurfaceV1(props: {
  readonly accessibleName: string;
  readonly context: VnLastSoundCheckStageContextV1;
  readonly instance: VnLastSoundCheckApplicationInstanceV1;
  readonly presentationFreeze: PresentationFreezePortV1;
  readonly registry: VnLastSoundCheckAssetRegistryV1;
  readonly renderers: ReturnType<typeof createVnLastSoundCheckStageRenderersV1>;
  reportFailure(code: string, error: unknown): void;
}) {
  const { requiredAssetIds, revision } = props.context.publication;
  const { registry, reportFailure } = props;
  useEffect(() => {
    const controller = new AbortController();
    void registry
      .preload(requiredAssetIds, controller.signal)
      .catch((error: unknown) => reportFailure("vn-last-sound-check.asset_preload_failed", error));
    return () => controller.abort();
  }, [registry, reportFailure, requiredAssetIds, revision]);

  return (
    <section
      data-vn-last-sound-check-stage="true"
      aria-label={props.accessibleName}
    >
      <SemanticStageV1
        target={props.context.publication.view.stageTarget}
        revision={props.context.publication.semantic.revision}
        epoch={props.context.publication.view.anchorEpoch}
        dispatches={props.instance.stageCueDispatches()}
        catalog={vnLastSoundCheckStageTransitionCatalogV1}
        ambient={vnLastSoundCheckStageAmbientCatalogV1}
        renderers={props.renderers}
        assets={props.registry}
        accessibleName={props.accessibleName}
        clock={props.presentationFreeze.clock}
      />
    </section>
  );
}

function createVnLastSoundCheckUiSlotsV1(
  instance: VnLastSoundCheckApplicationInstanceV1,
  presentationFreeze: PresentationFreezePortV1,
  textContent: TextContentSessionV1,
  registry: VnLastSoundCheckAssetRegistryV1,
  renderers: ReturnType<typeof createVnLastSoundCheckStageRenderersV1>,
  playerProfile: PlayerProfileStoreV1,
  capabilities: RuntimeCapabilityPortV1,
  registerReplayVoice: (replay: (() => boolean) | null) => void,
  registerCurrentVoicePlaying: (query: (() => boolean) | null) => void,
  reportFailure: (code: string, error: unknown) => void,
): DefaultGameRootSlotsV1<
  VnLastSoundCheckUiPublicationV1,
  VnLastSoundCheckSemanticPortV1,
  VnLastSoundCheckUiOverlayIdV1
> {
  const uiText = (textId: string): string => textContent.resolveText(textId as TextId);
  const createAudioHost = () =>
    createWebAudioHostV1({
      manifest: vnLastSoundCheckAudioManifestV1,
      resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
      reportDiagnostic: (diagnostic) =>
        reportFailure(
          "vn-last-sound-check.audio_fault",
          new Error(`${diagnostic.code}: ${diagnostic.detail}`),
        ),
    });
  return {
    background: (context) => (
      <VnLastSoundCheckStageSurfaceV1
        accessibleName={uiText("text.vn-last-sound-check.stage.name")}
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
            selectIntent={selectVnLastSoundCheckAudioIntentV1}
            resolveEffectAsset={resolveVnLastSoundCheckEffectAssetV1}
            playerProfile={playerProfile}
            registerReplayVoice={registerReplayVoice}
            registerCurrentVoicePlaying={registerCurrentVoicePlaying}
          />
          {narrative.phase !== "completed" || narrative.signalChoice === null
            ? null
            : (
              <VnLastSoundCheckEndingSurfaceV1
                title={textContent.resolveText(
                  `text.vn-last-sound-check.${narrative.signalChoice}.ending.title` as TextId,
                )}
                kicker={uiText("text.vn-last-sound-check.ending.kicker")}
                summary={uiText("text.vn-last-sound-check.ending.summary")}
                backLabel={uiText("text.vn-last-sound-check.playback.back")}
                returnLabel={uiText("text.vn-last-sound-check.ending.return")}
                returningLabel={uiText("text.vn-last-sound-check.ending.returning")}
                returnFailure={uiText("text.vn-last-sound-check.ending.return-failed")}
                input={context.input}
                rollback={instance.rollback}
                onReturnToTitle={context.systemDialogs.returnToTitle}
              />
            )}
        </>
      );
    },
    settingsSections: () => [
      <VnLastSoundCheckSettingsSectionsV1
        key="player"
        playerProfile={playerProfile}
        capabilities={capabilities}
        textContent={textContent}
      />,
    ],
  };
}

function VnLastSoundCheckSettingsSectionsV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly textContent: TextContentSessionV1;
}) {
  const text = useLocaleTextV1(
    props.playerProfile,
    (_locale, textId) => props.textContent.resolveText(textId as TextId),
  );
  return (
    <DefaultSettingsSectionsV1
      playerProfile={props.playerProfile}
      capabilities={props.capabilities}
      showDeveloperTools={false}
      labels={{
        bgmVolumeLabel: text("text.vn-last-sound-check.settings.bgm"),
        voiceVolumeLabel: text("text.vn-last-sound-check.settings.voice"),
        sfxVolumeLabel: text("text.vn-last-sound-check.settings.sfx"),
        mutedLabel: text("text.vn-last-sound-check.system.mute"),
        textSpeedLabel: text("text.vn-last-sound-check.settings.text-speed"),
        autoWaitLabel: text("text.vn-last-sound-check.settings.auto-wait"),
        fullscreenLabel: text("text.vn-last-sound-check.settings.fullscreen"),
        developerToolsLabel: text("text.vn-last-sound-check.settings.developer-tools"),
      }}
      locale={{
        label: text("text.vn-last-sound-check.settings.language"),
        options: [
          { locale: null, label: "简体中文" },
          { locale: "en", label: "English" },
        ],
      }}
    />
  );
}

export const vnLastSoundCheckVnPlayerCoreLabelTextIdsV1 = {
  advance: "text.vn-last-sound-check.narrative.advance",
  playbackControls: "text.vn-last-sound-check.playback.controls",
  back: "text.vn-last-sound-check.playback.back",
  forward: "text.vn-last-sound-check.playback.forward",
  voice: "text.vn-last-sound-check.playback.voice",
  skip: "text.vn-last-sound-check.playback.skip",
  auto: "text.vn-last-sound-check.playback.auto",
  showUi: "text.vn-last-sound-check.playback.show-ui",
  menu: "text.vn-last-sound-check.playback.menu",
  resume: "text.vn-last-sound-check.playback.resume",
  save: "text.vn-last-sound-check.playback.save",
  quickSave: "text.vn-last-sound-check.playback.quick-save",
  quickLoad: "text.vn-last-sound-check.playback.quick-load",
  settings: "text.vn-last-sound-check.playback.settings",
  returnToTitle: "text.vn-last-sound-check.playback.return-title",
  quickSaveComplete: "text.vn-last-sound-check.playback.quick-save-complete",
  quickLoadDescription: "text.vn-last-sound-check.playback.quick-load-description",
  confirm: "text.vn-last-sound-check.playback.confirm-load",
  cancel: "text.vn-last-sound-check.playback.cancel",
  operationFailed: "text.vn-last-sound-check.playback.operation-failed",
  quickLoadUnavailable: "text.vn-last-sound-check.playback.quick-load-unavailable",
};

export const vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1 = {
  history: "text.vn-last-sound-check.playback.history",
  historyTitle: "text.vn-last-sound-check.playback.history.title",
  historyEmpty: "text.vn-last-sound-check.playback.history.empty",
  historyClose: "text.vn-last-sound-check.playback.history.close",
};

function createVnLastSoundCheckRootLabelsV1(
  textContent: TextContentSessionV1,
): Partial<DefaultGameRootLabelsV1> {
  const resolve = (textId: string): string => textContent.resolveText(textId as TextId);
  return {
    systemMenuLabel: resolve("text.vn-last-sound-check.system.label"),
    saveLabel: resolve("text.vn-last-sound-check.system.save"),
    settingsLabel: resolve("text.vn-last-sound-check.system.settings"),
    settingsTitle: resolve("text.vn-last-sound-check.system.settings"),
    settingsEmptyText: resolve("text.vn-last-sound-check.system.settings-empty"),
    settingsMutedLabel: resolve("text.vn-last-sound-check.system.mute"),
    titleNewGameLabel: resolve("text.vn-last-sound-check.title.new-game"),
    titleNewGameFailedText: resolve("text.vn-last-sound-check.title.new-game-failed"),
    titleContinueLabel: resolve("text.vn-last-sound-check.title.continue"),
    titleLoadGameLabel: resolve("text.vn-last-sound-check.title.load"),
    closeLabel: resolve("text.vn-last-sound-check.system.close"),
  };
}

function createVnLastSoundCheckSaveOverlayLabelsV1(
  textContent: TextContentSessionV1,
): SaveOverlayLabelsV1 {
  return createVnLastSoundCheckSaveOverlayCopyV1(textContent.currentLocale());
}

/**
 * The complete browser application: one declaration consumed by
 * `startWebGameApplicationV1` in `entry.tsx`. The composers own Session,
 * persistence, capability session, input adapters, automation, and HMR.
 */
export type VnLastSoundCheckGameApplicationV1 = WebGameApplicationV1<
  unknown,
  unknown,
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
  VnLastSoundCheckActionResultV1,
  null,
  Record<never, never>,
  VnLastSoundCheckPresentationViewV1,
  AssetId,
  VnLastSoundCheckUiOverlayIdV1
>;

export interface VnLastSoundCheckPresentationSelectionV1 {
  readonly player:
    & DefaultVnPlayerCoreV1
    & Readonly<{
      readonly history: NarrativeSurfaceHistoryFeatureV1 | null;
    }>;
  readonly outerUi?: WebGameOuterUiV1;
  dispose?(): void | PromiseLike<void>;
}

export interface VnLastSoundCheckPresentationSelectionInputV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly heldInput: HeldInputPortV1;
  readonly instance: VnLastSoundCheckApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationFreeze: PresentationFreezePortV1;
  readonly presentationRate: Parameters<
    VnLastSoundCheckGameApplicationV1["ui"]
  >[0]["presentationRate"];
  readonly reportFailure: (code: string, error: unknown) => void;
}

export type SelectVnLastSoundCheckPresentationV1 = (
  input: VnLastSoundCheckPresentationSelectionInputV1,
) => VnLastSoundCheckPresentationSelectionV1;

/**
 * Product core composition. Optional presentation capabilities are selected by
 * the production or development entry without entering gameplay authority.
 */
export function createVnLastSoundCheckGameApplicationV1(
  selectPresentation: SelectVnLastSoundCheckPresentationV1,
): VnLastSoundCheckGameApplicationV1 {
  return {
    applicationId: "example-vn-last-sound-check",
    accessibleName: "最后一次试音",
    viewport: {
      canvas: vnLastSoundCheckViewportCanvasV1,
      fallbackSize: { width: 1600, height: 900 },
      layoutVariants: [
        {
          id: "vn-portrait",
          when: { maxAspectRatio: 0.8 },
          mode: "expand-height",
        },
      ],
    },
    textContent: {
      manifest: vnLastSoundCheckTextContentManifestV1,
      bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
      initialPackIds: [vnLastSoundCheckSharedTextPackIdV1],
      requiredPackIdsForInvocation: (invocation: DeepReadonly<VnLastSoundCheckInvocationV1>) => {
        if (invocation.kind !== "resolve" || invocation.resolution.kind !== "choose") return [];
        return invocation.resolution.choiceId === "choice.vn-last-sound-check.archive-voice"
          ? [vnLastSoundCheckArchiveTextPackIdV1]
          : invocation.resolution.choiceId === "choice.vn-last-sound-check.present-voice"
          ? [vnLastSoundCheckPresentTextPackIdV1]
          : [];
      },
      requiredPackIdsForSnapshot: (
        snapshot: DeepReadonly<VnLastSoundCheckSimulationTypesV1["snapshot"]>,
      ) => {
        const routePack = vnLastSoundCheckRouteTextPackV1(snapshot.state.simulation.narrative);
        return routePack === null
          ? [vnLastSoundCheckSharedTextPackIdV1]
          : [vnLastSoundCheckSharedTextPackIdV1, routePack];
      },
    },
    core: vnLastSoundCheckCoreApplicationDefinitionV1,
    ui: (
      {
        assetLoader,
        capabilities,
        heldInput,
        instance,
        playerProfile,
        presentationFreeze,
        presentationRate,
        reportFailure,
        textContent,
      }: Parameters<VnLastSoundCheckGameApplicationV1["ui"]>[0],
    ) => {
      if (textContent === null) {
        throw new TypeError("vn-last-sound-check.text_content_session_missing");
      }
      const manifest = (instance.extensions as VnLastSoundCheckExtensionsV1).assets;
      const registry = createAssetRegistryV1(
        manifest,
        assetLoader,
        (diagnostic) => reportFailure("vn-last-sound-check.asset_fault", diagnostic),
      ) as VnLastSoundCheckAssetRegistryV1;
      const renderers = createVnLastSoundCheckStageRenderersV1(registry);
      const replayVoiceRef: { current: (() => boolean) | null } = { current: null };
      const registerReplayVoice = (replay: (() => boolean) | null): void => {
        replayVoiceRef.current = replay;
      };
      const currentVoicePlayingRef: { current: (() => boolean) | null } = { current: null };
      const registerCurrentVoicePlaying = (query: (() => boolean) | null): void => {
        currentVoicePlayingRef.current = query;
      };
      const selectedPresentation = selectPresentation({
        capabilities,
        heldInput,
        instance,
        playerProfile,
        presentationFreeze,
        presentationRate,
        reportFailure,
      });
      const vnPlayer = selectedPresentation.player;
      return ({
        dispose: async () => {
          registerCurrentVoicePlaying(null);
          registerReplayVoice(null);
          try {
            await selectedPresentation.dispose?.();
          } finally {
            registry.dispose();
          }
        },
        titleScreen: {
          title: textContent.resolveText("text.vn-last-sound-check.app.name" as TextId),
          beginNewGame: () =>
            instance.semantic.dispatch({
              kind: "invoke",
              actionId: "vn-last-sound-check.begin_story",
            }),
        },
        accessibleName: textContent.resolveText("text.vn-last-sound-check.app.name" as TextId),
        resolveLocalizedCopy: () => ({
          accessibleName: textContent.resolveText("text.vn-last-sound-check.app.name" as TextId),
          titleScreenTitle: textContent.resolveText("text.vn-last-sound-check.app.name" as TextId),
          labels: createVnLastSoundCheckRootLabelsV1(textContent),
          saveLabels: createVnLastSoundCheckSaveOverlayLabelsV1(textContent),
        }),
        projector: createVnLastSoundCheckUiProjectorV1(textContent),
        narrative: defineNarrativeSurfaceV1<VnLastSoundCheckSemanticPublicationV1>(
          {
            selectNarrative: projectVnLastSoundCheckNarrativeSurfaceSelectionV1,
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
            history: vnPlayer.history,
            resolveText: (_locale, textId) => textContent.resolveText(textId as TextId),
            replayCurrentVoice: () => replayVoiceRef.current?.() ?? false,
            isCurrentVoicePlaying: () => currentVoicePlayingRef.current?.() ?? false,
          } satisfies DefineNarrativeSurfaceInputV1<VnLastSoundCheckSemanticPublicationV1>,
        ),
        slots: createVnLastSoundCheckUiSlotsV1(
          instance,
          presentationFreeze,
          textContent,
          registry,
          renderers,
          playerProfile,
          capabilities,
          registerReplayVoice,
          registerCurrentVoicePlaying,
          reportFailure,
        ),
        // M2 owns compact VN player chrome. The generic floating
        // Save/Settings/Mute cluster returns through product UI in M3.
        hideSystemMenu: true,
        input: vnPlayer.input,
        ...(selectedPresentation.outerUi === undefined
          ? {}
          : { outerUi: selectedPresentation.outerUi }),
        // Game-shell feel is the engine default: no browser context menu, text
        // selection, or hover-cursor changes; editable controls and
        // data-native-menu / data-native-text subtrees stay native. Declare
        // `input: { nativeBehavior: false }` only for a browser-native page.
      });
    },
  };
}
