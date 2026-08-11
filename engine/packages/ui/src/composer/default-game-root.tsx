// SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement, ReactNode } from "react";

import type {
  DeepReadonly,
  RuntimeCapabilityPortV1,
  SessionAnchorResultV1,
} from "@sillymaker/base";

import { createDevDockContributionSetV1, DevDockV1 } from "../debug/dev-dock.tsx";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "../debug/dev-dock.tsx";
import { SessionMaintenancePanelV1 } from "../debug/session-maintenance-panel.tsx";
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
import { resolveWorkspaceOverlaySessionInternalV1 } from "../overlays/workspace-overlay-session.ts";
import type { OverlaySessionStoreV1 } from "../overlays/workspace-overlay-session.ts";
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
import { MuteToggleV1 } from "../system/mute-toggle.tsx";
import type { BootSplashDefinitionV1 } from "../system/boot-splash.tsx";
import { SavesLauncherV1 } from "../system/saves-launcher.tsx";
import { SettingsLauncherV1 } from "../system/settings-launcher.tsx";
import { DefaultSettingsSectionsV1 } from "../system/default-settings-sections.tsx";
import { TitleScreenV1 } from "../system/title-screen.tsx";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { SystemDialogHostV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogCustomSavesV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogOpenResultV1 } from "../system/system-dialog-managed-contract.ts";
import type { InteractionSessionStoreV1 } from "../interaction/interaction-session-store.ts";
import { NarrativeSurfaceHostInternalV1 } from "../narrative/narrative-surface-host.tsx";
import type {
  GameUiCompositionV1,
  GameUiCueRegistryV1,
  GameUiManagedSurfaceCompositionInternalV1,
  GameUiOverlayIdV1,
} from "./create-game-ui-composition.ts";
import { resolveOptionalGameUiManagedSurfaceCompositionInternalV1 } from "./create-game-ui-composition.ts";
import { admitSettledSessionAnchorResultInternalV1 } from "./session-anchor-result-admission-internal.ts";
import { SemanticStageCompositionClaimantProviderInternalV1 } from "../stage/semantic-stage.tsx";
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
  /** Player preference for Story-owned skippable presentation dwells. */
  readonly settingsSkipCutscenesLabel?: string;
  readonly settingsTextSpeedLabel: string;
  readonly settingsAutoWaitLabel: string;
  readonly settingsFullscreenLabel: string;
  readonly settingsDeveloperToolsLabel: string;
  readonly titleNewGameLabel: string;
  readonly titleNewGameFailedText: string;
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
  titleNewGameFailedText: "Unable to start a new game.",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
});

export interface DefaultGameRootSlotContextV1<
  TPublication,
  TSemantic,
  TOverlayId extends string = string,
> {
  readonly publication: DeepReadonly<TPublication>;
  readonly semantic: TSemantic;
  readonly intents: PresentationIntentRouterV1;
  /** The composition input router: Story surfaces register action handlers. */
  readonly input: InputRouterV1;
  /** Updates the composition's Story UI state (routes, spatial sessions…). */
  updateStoryUiState(updater: (current: unknown) => unknown): void;
  /** Opens the engine system dialogs (custom shells: Start menu, pause menu…). */
  readonly systemDialogs: {
    openSettings(): SystemDialogOpenResultV1;
    openSaves(): SystemDialogOpenResultV1;
    /**
     * Return to the title front door: `lifecycle.restart()` then re-show
     * `TitleScreenV1` (skips splash). Used by Stories that wire MV Return to
     * Title / game-over endings to the host lifecycle.
     */
    returnToTitle(): Promise<void>;
  };
  /** Coordinator-backed Overlay intents plus its immutable compatibility publication. */
  readonly overlays: OverlaySessionStoreV1<TOverlayId>;
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
  background?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  character?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  sceneInteraction?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  hud?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>): ReactNode;
  systemMenuExtras?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  /** Story sections for the default Settings dialog (language, volume…). */
  settingsSections?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): readonly ReactNode[];
  overlayResolver?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
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
  /**
   * Hides the default floating system menu (Save/Settings/Mute). Fully
   * custom shells (e.g. a desktop metaphor) surface those entries in
   * their own UI through the slot context's `systemDialogs` intents instead.
   */
  readonly hideSystemMenu?: boolean;
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
    /**
     * After `lifecycle.restart()` on New game: Stories whose opening is an
     * explicit semantic command (not implied by the initial Snapshot) boot
     * here. Called before the title dismisses so the first frame is ready.
     */
    beginNewGame?(semantic: TSemantic): void | Promise<unknown>;
  };
  readonly lifecycle?: { restart(): Promise<SessionAnchorResultV1> };
  readonly saveUi?: {
    readonly port: SaveOverlayPortV1;
    readonly labels: SaveOverlayLabelsV1;
    /**
     * Story safepoint over the live publication: manual saves are disabled
     * (with the reason shown) when it returns allowed: false.
     */
    evaluateGuard?(publication: unknown): SaveOverlayGuardV1;
  };
  /**
   * Story-rendered Save UI hosted by the existing System modal authority.
   * Mutually exclusive with the engine `saveUi`.
   */
  readonly customSaves?: SystemDialogCustomSavesV1;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  /** Typed Story tooling panels, including `read_only` / `cheat` authority. */
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
  /** Engine-owned maintenance panel contributed to the sole DevDock host. */
  readonly sessionMaintenance?: {
    readonly savePort?: SaveOverlayPortV1;
    readonly clearAllSaves?: () => Promise<void>;
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
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({
  panels: [],
});

function lifecycleRestartFailureV1(
  result: Exclude<SessionAnchorResultV1, { readonly kind: "anchored" }>,
): Error {
  return new Error(`ui.lifecycle_restart_${result.kind}:${result.code}`);
}

function restartLifecycleV1(
  lifecycle: DefaultGameRootPropsV1<
    unknown,
    unknown,
    unknown,
    unknown,
    string,
    unknown
  >["lifecycle"],
): Promise<SessionAnchorResultV1> {
  return Promise.resolve()
    .then(() => {
      if (lifecycle === undefined) {
        throw new Error("ui.lifecycle_restart_unavailable");
      }
      return lifecycle.restart();
    })
    .then(admitSettledSessionAnchorResultInternalV1);
}

/** Continue is only available when the autosave slot can be loaded. */
function continueAvailableFromSlotsV1(
  slots: readonly { readonly slotId: string; readonly health: string }[],
): boolean {
  const autosave = slots.find((slot) => slot.slotId === "auto.current");
  return (
    autosave !== undefined &&
    (autosave.health === "valid" || autosave.health === "recovery_candidate")
  );
}

function createDefaultOverlayResolverV1<TOverlayId extends string>(input: {
  readonly storyResolver: OverlayRendererResolverV1<TOverlayId> | null;
}): OverlayRendererResolverV1<GameUiOverlayIdV1<TOverlayId>> {
  return Object.freeze({
    resolve(overlayId: DeepReadonly<GameUiOverlayIdV1<TOverlayId>>) {
      return input.storyResolver?.resolve(overlayId as DeepReadonly<TOverlayId>) ?? null;
    },
  });
}

/** Story tooling panel host; renders only for explicit contributions. */
function DefaultDevDockV1(props: {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly builtInContributions: DevDockContributionSetV1;
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
  const storyContributions = loaded ?? props.contributions;
  const contributions = createDevDockContributionSetV1({
    panels: [...props.builtInContributions.panels, ...storyContributions.panels],
  });
  return (
    <DevDockV1
      capabilities={props.capabilities}
      contributions={contributions}
      inputRouter={props.composition.input}
      openState={openState}
      onOpenStateChange={setOpenState}
    />
  );
}

function DefaultNarrativeSurfaceHostInternalV1(props: {
  readonly narrative: GameUiManagedSurfaceCompositionInternalV1["narrative"];
  readonly inputRouter: InputRouterV1;
}): ReactElement {
  const { narrative, inputRouter } = props;
  const session = useSyncExternalStore(
    narrative.subscribeInternalV1,
    narrative.getCurrentSessionInternalV1,
    narrative.getCurrentSessionInternalV1,
  );
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const [registered, setRegistered] = useState<
    Readonly<{
      readonly session: NonNullable<typeof session>;
      readonly portalContainer: HTMLDivElement;
      readonly inputRouter: InputRouterV1;
    }> | null
  >(null);
  const capturePortal = useCallback((next: HTMLDivElement | null): void => {
    setPortalContainer(next);
  }, []);

  // Register the exact tuple before mounting the inner Host. Across a
  // successor, the old Host remains mounted for this commit while the parent
  // swaps registrations; the next render updates the same Host instance only
  // after the successor tuple is ready.
  useLayoutEffect(() => {
    if (session === null || portalContainer === null) return undefined;
    const release = narrative.registerHostPhysicalIngressInternalV1(Object.freeze({
      session,
      portalContainer,
      inputRouter,
    }));
    const binding = Object.freeze({ session, portalContainer, inputRouter });
    setRegistered(binding);
    return () => {
      release();
      setRegistered((current) => current === binding ? null : current);
    };
  }, [inputRouter, narrative, portalContainer, session]);

  return (
    <>
      <div ref={capturePortal} data-default-narrative-surface-portal="true" />
      {registered === null ? null : narrative.provideHostActionContextInternalV1(
        <NarrativeSurfaceHostInternalV1
          session={registered.session}
          portalContainer={registered.portalContainer}
          inputRouter={registered.inputRouter}
          isGestureCurrent={narrative.isGestureCurrentInternalV1}
        />,
      )}
    </>
  );
}

/**
 * The default GameRoot: a complete playable shell over a composed UI with
 * zero Story React code. The stage renders inside a managed GameViewport;
 * default surfaces (Save, Settings, dialogs) satisfy the designed baseline;
 * DevDock remains the sole capability-gated debug UI host. Engine maintenance
 * and Story tooling both enter it as typed, authority-classified panels.
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
  if (props.saveUi !== undefined && props.customSaves !== undefined) {
    throw new TypeError("ui.system_saves_ambiguous");
  }
  type PublicationV1 = RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>;
  const labels = Object.freeze({ ...defaultGameRootLabelsV1, ...props.labels });
  const [titleDismissed, setTitleDismissed] = useState(props.titleScreen === undefined);
  const [splashDismissed, setSplashDismissed] = useState(props.titleScreen?.splash === undefined);
  const [titleLifecycleFailureCode, setTitleLifecycleFailureCode] = useState<string | null>(null);
  const titleLifecycleGenerationRef = useRef(0);
  const [continueAvailable, setContinueAvailable] = useState(false);
  const publication = useSyncExternalStore(
    props.composition.presentation.subscribe,
    props.composition.presentation.getSnapshot,
    props.composition.presentation.getSnapshot,
  ) as DeepReadonly<PublicationV1>;
  const anchor = useReadonlyViewV1(props.composition.anchor);
  const systemSaves = useMemo(() => {
    if (props.customSaves !== undefined) return props.customSaves;
    if (props.saveUi === undefined) return undefined;
    const { evaluateGuard } = props.saveUi;
    return Object.freeze({
      port: props.saveUi.port,
      labels: props.saveUi.labels,
      ...(evaluateGuard === undefined ? {} : {
        guardProjection: Object.freeze({
          getSnapshot: props.composition.presentation.getSnapshot,
          subscribe: props.composition.presentation.subscribe,
          evaluate: evaluateGuard,
        }),
      }),
    });
  }, [props.composition.presentation, props.customSaves, props.saveUi]);

  // Loading (or importing) a save from the title screen's Load-game dialog
  // enters gameplay: the anchored epoch origin is the authoritative signal.
  const anchorOrigin = anchor.origin;
  useEffect(() => {
    if (anchorOrigin === "load" || anchorOrigin === "import") {
      setTitleDismissed(true);
    }
  }, [anchorOrigin]);

  // Continue must stay disabled until a runnable autosave is confirmed.
  // Without a save UI port there is no slot inventory to consult.
  const savePort = props.saveUi?.port;
  useEffect(() => {
    let cancelled = false;
    if (savePort === undefined || titleDismissed) {
      setContinueAvailable(false);
    } else {
      void savePort
        .listSlots()
        .then((slots) => {
          if (!cancelled) {
            setContinueAvailable(continueAvailableFromSlotsV1(slots));
          }
        })
        .catch(() => {
          if (!cancelled) setContinueAvailable(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [savePort, titleDismissed, splashDismissed]);

  // Composition-backed members stay referentially stable across renders so
  // Story lifecycle effects can depend on them without re-subscribing.
  const updateStoryUiState = props.composition.updateUiState as (
    updater: (current: unknown) => unknown,
  ) => void;
  const slotContext: DefaultGameRootSlotContextV1<PublicationV1, TSemantic, TOverlayId> = Object
    .freeze({
      publication,
      semantic: props.semantic,
      intents: props.composition.intents,
      input: props.composition.input,
      updateStoryUiState,
      systemDialogs: Object.freeze({
        openSettings: () => props.composition.systemDialogSession.openSettings(),
        openSaves: () => props.composition.systemDialogSession.openSaves(),
        returnToTitle: () => {
          return restartLifecycleV1(props.lifecycle)
            .then((result) => {
              if (result.kind !== "anchored") {
                throw lifecycleRestartFailureV1(result);
              }
              titleLifecycleGenerationRef.current += 1;
              setTitleLifecycleFailureCode(null);
              setSplashDismissed(true);
              setTitleDismissed(false);
            });
        },
      }),
      overlays: props.composition.overlaySession,
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
  const managedComposition = resolveOptionalGameUiManagedSurfaceCompositionInternalV1(
    props.composition,
  );
  const narrativeComposition = managedComposition?.narrative ?? null;

  const layers = Object.freeze({
    background: narrativeComposition === null
      ? (
        <div
          className={styles["default-root__stage-slot"]}
          key={`background:${String(anchor.epoch)}`}
        >
          {slots.background?.(slotContext) ?? null}
        </div>
      )
      : (
        <SemanticStageCompositionClaimantProviderInternalV1
          claimant={narrativeComposition.getStageClaimantInternalV1()}
          onBindInternalV1={narrativeComposition.bindStageReconcilerInternalV1}
        >
          <div className={styles["default-root__stage-slot"]}>
            {slots.background?.(slotContext) ?? null}
          </div>
        </SemanticStageCompositionClaimantProviderInternalV1>
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
        session={resolveWorkspaceOverlaySessionInternalV1(props.composition.overlaySession)}
        rendererResolver={overlayResolver}
        inputRouter={props.composition.input}
        closeLabel={labels.closeLabel}
      />
    ),
    narrative: narrativeComposition?.isHostEnabledInternalV1() === true
      ? (
        <DefaultNarrativeSurfaceHostInternalV1
          narrative={narrativeComposition}
          inputRouter={props.composition.input}
        />
      )
      : null,
    system: (
      <SystemDialogHostV1
        inputRouter={props.composition.input}
        session={props.composition.systemDialogSession}
        {...(systemSaves === undefined ? {} : { saves: systemSaves })}
        settings={Object.freeze({
          title: labels.settingsTitle,
          closeLabel: labels.closeLabel,
          sections: Object.freeze([
            ...(props.playerProfile === undefined || props.capabilities === undefined ? [] : [
              <DefaultSettingsSectionsV1
                key="sillymaker-default-settings"
                playerProfile={props.playerProfile}
                capabilities={props.capabilities}
                labels={Object.freeze({
                  bgmVolumeLabel: labels.settingsBgmVolumeLabel,
                  voiceVolumeLabel: labels.settingsVoiceVolumeLabel,
                  sfxVolumeLabel: labels.settingsSfxVolumeLabel,
                  mutedLabel: labels.settingsMutedLabel,
                  ...(labels.settingsSkipCutscenesLabel === undefined
                    ? {}
                    : { skipCutscenesLabel: labels.settingsSkipCutscenesLabel }),
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
        {props.titleScreen?.splash === undefined || splashDismissed || titleDismissed
          ? null
          : (
            <BootSplashV1
              splash={props.titleScreen.splash}
              onDismiss={() => setSplashDismissed(true)}
            />
          )}
        {props.titleScreen === undefined || titleDismissed || !splashDismissed ? null : (
          <>
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
                const generation = titleLifecycleGenerationRef.current + 1;
                titleLifecycleGenerationRef.current = generation;
                setTitleLifecycleFailureCode(null);
                const begin = props.titleScreen?.beginNewGame;
                void restartLifecycleV1(props.lifecycle)
                  .then(async (result) => {
                    if (titleLifecycleGenerationRef.current !== generation) {
                      return;
                    }
                    if (result.kind !== "anchored") {
                      setTitleLifecycleFailureCode(`${result.kind}:${result.code}`);
                      return;
                    }
                    if (begin !== undefined) await begin(props.semantic);
                    if (titleLifecycleGenerationRef.current === generation) {
                      setTitleDismissed(true);
                    }
                  })
                  .catch((error: unknown) => {
                    if (titleLifecycleGenerationRef.current === generation) {
                      setTitleLifecycleFailureCode(
                        error instanceof Error &&
                          error.message === "ui.lifecycle_restart_unavailable"
                          ? "unavailable"
                          : "unexpected",
                      );
                    }
                  });
              }}
              middleAction={props.customSaves === undefined
                ? Object.freeze({
                  kind: "continue" as const,
                  available: continueAvailable,
                  onActivate: () => setTitleDismissed(true),
                })
                : Object.freeze({ kind: "load" as const })}
              showLoadGame={props.saveUi !== undefined}
            />
            {titleLifecycleFailureCode === null ? null : (
              <p
                role="alert"
                data-title-lifecycle-failure={titleLifecycleFailureCode}
                style={{
                  position: "absolute",
                  insetInline: "var(--silly-space-4)",
                  insetBlockEnd: "var(--silly-space-4)",
                  zIndex: "var(--silly-surface-z-front-door)",
                  margin: 0,
                  padding: "var(--silly-space-2)",
                  textAlign: "center",
                  color: "#fff",
                  background: "rgba(96, 24, 24, 0.94)",
                }}
              >
                {labels.titleNewGameFailedText}
              </p>
            )}
          </>
        )}
        {props.hideSystemMenu === true ? null : (
          <div
            role="group"
            aria-label={labels.systemMenuLabel}
            className={styles["default-root__system-menu"]}
            data-default-system-menu="true"
          >
            {systemSaves === undefined ? null : <SavesLauncherV1 label={labels.saveLabel} />}
            <SettingsLauncherV1 label={labels.settingsLabel} />
            {props.playerProfile === undefined ? null : (
              <MuteToggleV1
                playerProfile={props.playerProfile}
                label={labels.settingsMutedLabel}
              />
            )}
            {slots.systemMenuExtras?.(slotContext) ?? null}
          </div>
        )}
      </SystemDialogHostV1>
    ),
  });

  const semanticWitness = (
    publication as {
      readonly semantic?: {
        readonly revision?: number;
        readonly status?: string;
      };
    }
  ).semantic;
  const semanticRevision = semanticWitness?.revision;
  const semanticStatus = semanticWitness?.status;
  const builtInDevDockContributions = props.sessionMaintenance === undefined
    ? emptyDevDockContributionsV1
    : createDevDockContributionSetV1({
      panels: [
        {
          id: "engine.session_maintenance",
          side: "right",
          title: "Session maintenance",
          authority: "cheat",
          render: () => (
            <SessionMaintenancePanelV1
              {...(props.sessionMaintenance?.savePort === undefined
                ? {}
                : { savePort: props.sessionMaintenance.savePort })}
              {...(props.sessionMaintenance?.clearAllSaves === undefined
                ? {}
                : { clearAllSaves: props.sessionMaintenance.clearAllSaves })}
              {...(props.lifecycle === undefined
                ? {}
                : { onReinitialize: slotContext.systemDialogs.returnToTitle })}
            />
          ),
        },
      ],
    });
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
          // Story tooling keeps DevDock's input/focus and authority contract.
          props.capabilities === undefined ||
            (builtInDevDockContributions.panels.length === 0 &&
              props.devDockContributions === undefined &&
              props.devDock?.load === undefined)
            ? null
            : (
              <DefaultDevDockV1
                capabilities={props.capabilities}
                builtInContributions={builtInDevDockContributions}
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
