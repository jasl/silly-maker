// SPDX-License-Identifier: MIT
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";

import type { DeepReadonly, RuntimeCapabilityPortV1 } from "@sillymaker/base";

import { DevDockV1, createDevDockContributionSetV1 } from "../debug/DevDock.tsx";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "../debug/DevDock.tsx";
import type { InputRouterV1 } from "../input/contracts.ts";
import type { GamepadActionMapV1 } from "../input/gamepad-adapter.ts";
import { installGamepadAdapterV1 } from "../input/gamepad-adapter.ts";
import type { KeyboardActionMapV1 } from "../input/keyboard-adapter.ts";
import { installKeyboardAdapterV1 } from "../input/keyboard-adapter.ts";
import { installPointerButtonAdapterV1 } from "../input/pointer-button-adapter.ts";
import type { PointerActionMapV1 } from "../input/pointer-button-adapter.ts";
import type { PresentationIntentRouterV1 } from "../interaction/presentation-intent-router.ts";
import { OverlayHostV1 } from "../overlays/overlay-host.tsx";
import type { OverlayRendererResolverV1 } from "../overlays/overlay-host.tsx";
import type {
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
} from "../persistence/save-overlay.tsx";
import { useReadonlyViewV1 } from "../runtime/create-view-bridge.ts";
import type { RuntimePresentationPublicationV1 } from "../runtime/runtime-presentation-store.ts";
import { GameShell } from "../shell/game-shell.tsx";
import type { GameShellViewportOptionsV1 } from "../shell/game-shell.tsx";
import { BootSplashV1 } from "../system/boot-splash.tsx";
import type { BootSplashDefinitionV1 } from "../system/boot-splash.tsx";
import { SavesLauncherV1 } from "../system/saves-launcher.tsx";
import { SettingsLauncherV1 } from "../system/settings-launcher.tsx";
import { DefaultSettingsSectionsV1 } from "../system/default-settings-sections.tsx";
import { TitleScreenV1 } from "../system/title-screen.tsx";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { SystemDialogHostV1 } from "../system/system-dialog-host.tsx";
import type { InteractionSessionStoreV1 } from "../interaction/interaction-session-store.ts";
import type {
  GameUiCompositionV1,
  GameUiCueRegistryV1,
  GameUiOverlayIdV1,
} from "./create-game-ui-composition.ts";
import styles from "./default-game-root.module.css";

/** Player-facing labels of the default surfaces; Stories override per locale. */
export interface DefaultGameRootLabelsV1 {
  readonly systemMenuLabel: string;
  readonly saveLabel: string;
  readonly settingsLabel: string;
  readonly settingsTitle: string;
  readonly settingsEmptyText: string;
  readonly settingsBgmVolumeLabel: string;
  readonly settingsVoiceVolumeLabel: string;
  readonly settingsSfxVolumeLabel: string;
  readonly settingsMutedLabel: string;
  readonly settingsTextSpeedLabel: string;
  readonly settingsAutoWaitLabel: string;
  readonly settingsFullscreenLabel: string;
  readonly settingsDeveloperToolsLabel: string;
  readonly titleNewGameLabel: string;
  readonly titleContinueLabel: string;
  readonly titleLoadGameLabel: string;
  readonly closeLabel: string;
}

export const defaultGameRootLabelsV1: DefaultGameRootLabelsV1 = Object.freeze({
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  settingsBgmVolumeLabel: "Music volume",
  settingsVoiceVolumeLabel: "Voice volume",
  settingsSfxVolumeLabel: "Effects volume",
  settingsMutedLabel: "Mute",
  settingsTextSpeedLabel: "Text speed",
  settingsAutoWaitLabel: "Auto-forward wait",
  settingsFullscreenLabel: "Toggle fullscreen",
  settingsDeveloperToolsLabel: "Developer tools",
  titleNewGameLabel: "New game",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
});

export interface DefaultGameRootSlotContextV1<TPublication, TSemantic> {
  readonly publication: DeepReadonly<TPublication>;
  readonly semantic: TSemantic;
  readonly intents: PresentationIntentRouterV1;
  /** The composition input router: Story surfaces register action handlers. */
  readonly input: InputRouterV1;
  /** Updates the composition's Story UI state (routes, spatial sessions…). */
  updateStoryUiState(updater: (current: unknown) => unknown): void;
  /** Read access to the composition overlay session for Story projections. */
  readonly overlays: {
    getSnapshot(): { readonly primaryId: string | null; readonly detailIds: readonly string[] };
    subscribe(listener: () => void): () => void;
  };
  /** The live presentation store (snapshot + subscribe) for Story controllers. */
  readonly presentation: {
    getSnapshot(): DeepReadonly<TPublication>;
    subscribe(listener: () => void): () => void;
  };
  /** The composition-owned spatial interaction session. */
  readonly interactionSession: InteractionSessionStoreV1;
  /** The cue registry a mounted semantic stage binds its timelines to. */
  readonly cues: GameUiCueRegistryV1;
}

/**
 * Story extension points. Every slot receives the current presentation
 * publication plus the semantic port; adding a Story overlay or layer
 * contribution never modifies the composer.
 */
export interface DefaultGameRootSlotsV1<TPublication, TSemantic, TOverlayId extends string> {
  background?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  character?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  sceneInteraction?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  hud?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  narrative?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  systemMenuExtras?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  /** Story sections for the default Settings dialog (language, volume…). */
  settingsSections?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic>,
  ): readonly ReactNode[];
  overlayResolver?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic>,
  ): OverlayRendererResolverV1<TOverlayId>;
}

export interface DefaultGameRootPropsV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
  TSemantic,
> {
  readonly composition: GameUiCompositionV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >;
  readonly semantic: TSemantic;
  readonly accessibleName: string;
  /** Optional live stage label (current scene name) for the shell main region. */
  resolveStageAccessibleName?(
    publication: DeepReadonly<
      RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>
    >,
  ): string;
  readonly applicationId: string;
  readonly viewport: GameShellViewportOptionsV1;
  readonly capabilities?: RuntimeCapabilityPortV1;
  /** Enables the engine-baseline Settings sections (volume, fullscreen…). */
  readonly playerProfile?: PlayerProfileStoreV1;
  /** Shows the default title screen before gameplay; New game restarts. */
  readonly titleScreen?: {
    readonly title: string;
    readonly backgroundUrl?: string;
    /** Front card before the title (studio marks, AI-generation notice…). */
    readonly splash?: BootSplashDefinitionV1;
  };
  readonly lifecycle?: { restart(): Promise<unknown> };
  readonly saveUi?: {
    readonly port: SaveOverlayPortV1;
    readonly labels: SaveOverlayLabelsV1;
    /**
     * Story safepoint over the live publication: manual saves are disabled
     * (with the reason shown) when it returns allowed: false.
     */
    evaluateGuard?(publication: unknown): SaveOverlayGuardV1;
  };
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  readonly devDockContributions?: DevDockContributionSetV1;
  /**
   * Optional DevDock extensions: a capability-gated lazy contribution
   * loader (tooling UI stays out of the player bundle) and an open-state
   * observer feeding diagnostics UI context.
   */
  readonly devDock?: {
    load?(): Promise<DevDockContributionSetV1>;
    observeOpenState?(state: DevDockOpenStateV1): void;
  };
  /** Optional keyboard/gamepad adapters routed through the composition. */
  readonly inputMaps?: {
    readonly keyboard?: KeyboardActionMapV1;
    readonly pointer?: PointerActionMapV1;
    readonly gamepad?: GamepadActionMapV1;
  };
}

const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({ panels: [] });

function createDefaultOverlayResolverV1<TOverlayId extends string>(input: {
  readonly storyResolver: OverlayRendererResolverV1<TOverlayId> | null;
}): OverlayRendererResolverV1<GameUiOverlayIdV1<TOverlayId>> {
  return Object.freeze({
    resolve(overlayId: DeepReadonly<GameUiOverlayIdV1<TOverlayId>>) {
      return input.storyResolver?.resolve(overlayId as DeepReadonly<TOverlayId>) ?? null;
    },
  });
}

function DefaultDevDockV1(props: {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly load?: () => Promise<DevDockContributionSetV1>;
  readonly observeOpenState?: (state: DevDockOpenStateV1) => void;
  readonly composition: {
    readonly input: GameUiCompositionV1<never, never, never, never, never>["input"];
  };
}): ReactElement | null {
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const [openState, setOpenStateRaw] = useState<DevDockOpenStateV1>(closedDevDockStateV1);
  const { observeOpenState, load } = props;
  const setOpenState = (next: DevDockOpenStateV1): void => {
    setOpenStateRaw(next);
    observeOpenState?.(next);
  };
  // Lazy tooling contributions: loaded only once the capability is live, so
  // debug tooling never enters the player bundle or the resident DOM.
  const [loaded, setLoaded] = useState<DevDockContributionSetV1 | null>(null);
  const debugTools = capabilities.debugTools;
  useEffect(() => {
    if (!debugTools || load === undefined) return () => {};
    let active = true;
    void load()
      .then((contributions) => {
        if (active) setLoaded(contributions);
      })
      .catch(() => {
        if (active) setLoaded(null);
      });
    return () => {
      active = false;
    };
  }, [debugTools, load]);
  if (!debugTools) return null;
  return (
    <DevDockV1
      capabilities={props.capabilities}
      contributions={loaded ?? props.contributions}
      inputRouter={props.composition.input}
      openState={openState}
      onOpenStateChange={setOpenState}
    />
  );
}

/**
 * The default GameRoot: a complete playable shell over a composed UI with
 * zero Story React code. The stage renders inside a managed GameViewport;
 * default surfaces (Save, Settings, dialogs) satisfy the designed baseline;
 * the resident player DOM carries no debug vocabulary — DevDock is the only
 * debug host and appears solely behind the `debug_tools` capability.
 */
export function DefaultGameRootV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
  TSemantic,
>(
  props: DefaultGameRootPropsV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId,
    TSemantic
  >,
): ReactElement {
  type PublicationV1 = RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>;
  const labels = Object.freeze({ ...defaultGameRootLabelsV1, ...props.labels });
  const [titleDismissed, setTitleDismissed] = useState(props.titleScreen === undefined);
  const [splashDismissed, setSplashDismissed] = useState(props.titleScreen?.splash === undefined);
  const publication = useSyncExternalStore(
    props.composition.presentation.subscribe,
    props.composition.presentation.getSnapshot,
    props.composition.presentation.getSnapshot,
  ) as DeepReadonly<PublicationV1>;
  const anchor = useReadonlyViewV1(props.composition.anchor);
  const saveGuard = props.saveUi?.evaluateGuard?.(publication);

  // Loading (or importing) a save from the title screen's Load-game dialog
  // enters gameplay: the anchored epoch origin is the authoritative signal.
  const anchorOrigin = anchor.origin;
  useEffect(() => {
    if (anchorOrigin === "load" || anchorOrigin === "import") setTitleDismissed(true);
  }, [anchorOrigin]);

  // Composition-backed members stay referentially stable across renders so
  // Story lifecycle effects can depend on them without re-subscribing.
  const updateStoryUiState = props.composition.updateUiState as (
    updater: (current: unknown) => unknown,
  ) => void;
  const slotContext: DefaultGameRootSlotContextV1<PublicationV1, TSemantic> = Object.freeze({
    publication,
    semantic: props.semantic,
    intents: props.composition.intents,
    input: props.composition.input,
    updateStoryUiState,
    overlays: props.composition.overlaySession as never,
    presentation: props.composition.presentation as never,
    interactionSession: props.composition.interactionSession,
    cues: props.composition.cues,
  });

  // Optional keyboard/gamepad adapters: installed for the root's lifetime,
  // removed on unmount so disposal and page teardown leave no listener or
  // poll loop behind.
  const inputMaps = props.inputMaps;
  useEffect(() => {
    if (inputMaps?.keyboard === undefined) return () => {};
    return installKeyboardAdapterV1({
      router: props.composition.input,
      map: inputMaps.keyboard,
    });
  }, [props.composition.input, inputMaps]);
  useEffect(() => {
    if (inputMaps?.pointer === undefined) return () => {};
    return installPointerButtonAdapterV1({
      router: props.composition.input,
      map: inputMaps.pointer,
    });
  }, [props.composition.input, inputMaps]);
  useEffect(() => {
    if (inputMaps?.gamepad === undefined) return () => {};
    const adapter = installGamepadAdapterV1({
      router: props.composition.input,
      map: inputMaps.gamepad,
    });
    return () => adapter.dispose();
  }, [props.composition.input, inputMaps]);
  const slots = props.slots ?? {};
  const overlayResolver = createDefaultOverlayResolverV1<TOverlayId>({
    storyResolver: slots.overlayResolver?.(slotContext) ?? null,
  });

  const layers = Object.freeze({
    background: (
      <div
        className={styles["default-root__stage-slot"]}
        key={`background:${String(anchor.epoch)}`}
      >
        {slots.background?.(slotContext) ?? null}
      </div>
    ),
    character: (
      <div className={styles["default-root__stage-slot"]} key={`character:${String(anchor.epoch)}`}>
        {slots.character?.(slotContext) ?? null}
      </div>
    ),
    sceneInteraction: slots.sceneInteraction?.(slotContext) ?? null,
    hud: slots.hud?.(slotContext) ?? null,
    workspaceOverlay: (
      <OverlayHostV1
        store={props.composition.overlaySession}
        rendererResolver={overlayResolver}
        inputRouter={props.composition.input}
        closeLabel={labels.closeLabel}
      />
    ),
    narrative: slots.narrative?.(slotContext) ?? null,
    system: (
      <SystemDialogHostV1
        inputRouter={props.composition.input}
        store={props.composition.systemDialogSession}
        {...(props.saveUi === undefined
          ? {}
          : {
              saves: Object.freeze({
                port: props.saveUi.port,
                labels: props.saveUi.labels,
                ...(saveGuard === undefined ? {} : { guard: saveGuard }),
              }),
            })}
        settings={Object.freeze({
          title: labels.settingsTitle,
          closeLabel: labels.closeLabel,
          sections: Object.freeze([
            ...(props.playerProfile === undefined || props.capabilities === undefined
              ? []
              : [
                  <DefaultSettingsSectionsV1
                    key="sillymaker-default-settings"
                    playerProfile={props.playerProfile}
                    capabilities={props.capabilities}
                    labels={Object.freeze({
                      bgmVolumeLabel: labels.settingsBgmVolumeLabel,
                      voiceVolumeLabel: labels.settingsVoiceVolumeLabel,
                      sfxVolumeLabel: labels.settingsSfxVolumeLabel,
                      mutedLabel: labels.settingsMutedLabel,
                      textSpeedLabel: labels.settingsTextSpeedLabel,
                      autoWaitLabel: labels.settingsAutoWaitLabel,
                      fullscreenLabel: labels.settingsFullscreenLabel,
                      developerToolsLabel: labels.settingsDeveloperToolsLabel,
                    })}
                  />,
                ]),
            ...(slots.settingsSections?.(slotContext) ?? []),
          ]),
          emptyText: labels.settingsEmptyText,
        })}
      >
        {props.titleScreen?.splash === undefined || splashDismissed || titleDismissed ? null : (
          <BootSplashV1
            splash={props.titleScreen.splash}
            onDismiss={() => setSplashDismissed(true)}
          />
        )}
        {props.titleScreen === undefined || titleDismissed || !splashDismissed ? null : (
          <TitleScreenV1
            title={props.titleScreen.title}
            {...(props.titleScreen.backgroundUrl === undefined
              ? {}
              : { backgroundUrl: props.titleScreen.backgroundUrl })}
            labels={Object.freeze({
              newGameLabel: labels.titleNewGameLabel,
              continueLabel: labels.titleContinueLabel,
              loadGameLabel: labels.titleLoadGameLabel,
              settingsLabel: labels.settingsLabel,
            })}
            onNewGame={() => {
              const restart = props.lifecycle?.restart();
              void (restart ?? Promise.resolve()).finally(() => setTitleDismissed(true));
            }}
            onContinue={() => setTitleDismissed(true)}
            showLoadGame={props.saveUi !== undefined}
          />
        )}
        <div
          role="group"
          aria-label={labels.systemMenuLabel}
          className={styles["default-root__system-menu"]}
          data-default-system-menu="true"
        >
          {props.saveUi === undefined ? null : <SavesLauncherV1 label={labels.saveLabel} />}
          <SettingsLauncherV1 label={labels.settingsLabel} />
          {slots.systemMenuExtras?.(slotContext) ?? null}
        </div>
      </SystemDialogHostV1>
    ),
  });

  const semanticWitness = (
    publication as {
      readonly semantic?: { readonly revision?: number; readonly status?: string };
    }
  ).semantic;
  const semanticRevision = semanticWitness?.revision;
  const semanticStatus = semanticWitness?.status;
  return (
    <div
      role="application"
      aria-label={props.accessibleName}
      data-application-id={props.applicationId}
      data-presentation-epoch={anchor.epoch}
      data-presentation-origin={anchor.origin}
      data-presentation-revision={publication.revision}
      {...(semanticRevision === undefined ? {} : { "data-semantic-revision": semanticRevision })}
      {...(semanticStatus === undefined ? {} : { "data-semantic-status": semanticStatus })}
      className={styles["default-root"]}
    >
      <GameShell
        accessibleName={props.resolveStageAccessibleName?.(publication) ?? props.accessibleName}
        layers={layers}
        inputRouter={props.composition.input}
        viewport={props.viewport}
        devDock={
          props.capabilities === undefined ? null : (
            <DefaultDevDockV1
              capabilities={props.capabilities}
              contributions={props.devDockContributions ?? emptyDevDockContributionsV1}
              {...(props.devDock?.load === undefined ? {} : { load: props.devDock.load })}
              {...(props.devDock?.observeOpenState === undefined
                ? {}
                : { observeOpenState: props.devDock.observeOpenState })}
              composition={props.composition}
            />
          )
        }
      />
    </div>
  );
}
