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
import type {
  DevDockContributionSetV1,
  DevDockOpenStateV1,
  DevDockPositionV1,
} from "../debug/dev-dock.tsx";
import type { DevDockControlV1 } from "../debug/dev-dock-control.ts";
import { createDevDockControlV1 } from "../debug/dev-dock-control.ts";
import { StoryDebugDockV1 } from "../debug/story-debug-dock.tsx";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
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
import { MuteToggleV1 } from "../system/mute-toggle.tsx";
import { SavesLauncherV1 } from "../system/saves-launcher.tsx";
import { SettingsLauncherV1 } from "../system/settings-launcher.tsx";
import { DefaultSettingsSectionsV1 } from "../system/default-settings-sections.tsx";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { SystemDialogHostV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogCustomSavesV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogOpenResultV1 } from "../system/system-dialog-managed-contract.ts";
import type { InteractionSessionStoreV1 } from "../interaction/interaction-session-store.ts";
import { NarrativeSurfaceHostInternalV1 } from "../narrative/narrative-surface-host.tsx";
import { WholeCanvasSurfaceHostInternalV1 } from "../whole-canvas/whole-canvas-surface-host.tsx";
import type {
  WholeCanvasSurfaceCompositionRuntimeInternalV1,
  WholeCanvasSurfaceHostBindingInternalV1,
} from "../whole-canvas/whole-canvas-surface-composition.tsx";
import type {
  GameUiCompositionV1,
  GameUiCueRegistryV1,
  GameUiManagedSurfaceCompositionInternalV1,
  GameUiOverlayIdV1,
} from "./create-game-ui-composition.ts";
import { resolveOptionalGameUiManagedSurfaceCompositionInternalV1 } from "./create-game-ui-composition.ts";
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
  /** Title Settings control; omitted means `settingsLabel`. */
  readonly titleSettingsLabel?: string;
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
export interface DefaultGameRootSlotsV1<
  TPublication,
  TSemantic,
  TOverlayId extends string,
> {
  background?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  character?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  sceneInteraction?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
  hud?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
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
  /**
   * Removes the developer-tools switch from the default Settings sections.
   * For Stories that ship their own tooling surface; the
   * `?capability=debug_tools` URL opt-in for the DevDock keeps working.
   */
  readonly hideDeveloperToolsToggle?: boolean;
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
   * loader (tooling UI stays out of the player bundle), an open-state
   * observer feeding diagnostics UI context, the launcher/window corner
   * (default `top_right`; applications reposition when it occludes their
   * chrome — bottom corners expand upward), a launcher visibility switch
   * (a Story whose own dock drives the control port hides the built-in
   * entry), and the shared window control port.
   */
  readonly devDock?: {
    load?(): Promise<DevDockContributionSetV1>;
    observeOpenState?(state: DevDockOpenStateV1): void;
    readonly position?: DevDockPositionV1;
    readonly chip?: boolean;
    readonly control?: DevDockControlV1;
    readonly freeze?: PresentationFreezePortV1;
    /** Story-owned live stats rendered in the engine launcher `info` slot. */
    readonly info?: ReactNode;
  };
  /**
   * Persistence ports inlined into the engine debug launcher (export /
   * import / Core wipe). Not registered as a floating tool window.
   */
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

const closedDevDockStateV1 = Object.freeze({ open: false }) satisfies DevDockOpenStateV1;
const openedDevDockStateV1 = Object.freeze({ open: true }) satisfies DevDockOpenStateV1;
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({
  panels: [],
});

function createDefaultOverlayResolverV1<TOverlayId extends string>(input: {
  readonly storyResolver: OverlayRendererResolverV1<TOverlayId> | null;
}): OverlayRendererResolverV1<GameUiOverlayIdV1<TOverlayId>> {
  return Object.freeze({
    resolve(overlayId: DeepReadonly<GameUiOverlayIdV1<TOverlayId>>) {
      return (
        input.storyResolver?.resolve(overlayId as DeepReadonly<TOverlayId>) ??
          null
      );
    },
  });
}

/** Story tooling panel host: launcher + floating windows, kept orthogonal. */
function DefaultDevDockV1(props: {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly load?: () => Promise<DevDockContributionSetV1>;
  readonly observeOpenState?: (state: DevDockOpenStateV1) => void;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
  readonly control?: DevDockControlV1;
  readonly freeze?: PresentationFreezePortV1;
  readonly info?: ReactNode;
  readonly savePort?: SaveOverlayPortV1;
  readonly clearAllSaves?: () => Promise<void>;
  readonly onReinitialize?: () => void | Promise<unknown>;
  readonly composition: {
    readonly input: GameUiCompositionV1<
      never,
      never,
      never,
      never,
      never
    >["input"];
  };
}): ReactElement | null {
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const [launcherState, setLauncherState] = useState<DevDockOpenStateV1>(
    closedDevDockStateV1,
  );
  const { observeOpenState, load } = props;
  const localControlRef = useRef<DevDockControlV1 | null>(null);
  if (props.control === undefined && localControlRef.current === null) {
    localControlRef.current = createDevDockControlV1();
  }
  const control = props.control ?? localControlRef.current as DevDockControlV1;
  const openWindowCount = useSyncExternalStore(
    control.openPanelIds.subscribe,
    () => control.openPanelIds.getCurrent().length,
    () => control.openPanelIds.getCurrent().length,
  );
  // The observed open state covers both surfaces: the launcher and any
  // floating panel window.
  const observedOpenRef = useRef(false);
  useEffect(() => {
    const open = launcherState.open || openWindowCount > 0;
    if (observedOpenRef.current === open) return;
    observedOpenRef.current = open;
    observeOpenState?.(open ? openedDevDockStateV1 : closedDevDockStateV1);
  }, [launcherState.open, observeOpenState, openWindowCount]);
  // Lazy tooling contributions: loaded only once the capability is live, so
  // debug tooling never enters the player bundle or the resident DOM.
  const [loaded, setLoaded] = useState<DevDockContributionSetV1 | null>(null);
  const debugTools = capabilities.debugTools;
  // A runtime capability grant (a Story dock/tools button) opens the
  // launcher immediately; a boot-time grant (URL/persisted preference)
  // keeps the collapsed chip so tooling never greets the player unasked.
  // Stories that hide the launcher open specific windows through the
  // control instead.
  const chip = props.chip !== false;
  const previousDebugToolsRef = useRef(debugTools);
  useEffect(() => {
    const was = previousDebugToolsRef.current;
    previousDebugToolsRef.current = debugTools;
    if (!was && debugTools && chip) setLauncherState(openedDevDockStateV1);
  }, [chip, debugTools]);
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
  const contributions = loaded ?? props.contributions;
  return (
    <>
      {chip
        ? (
          <StoryDebugDockV1
            visible
            capabilities={props.capabilities}
            control={control}
            grantCapabilitiesOnOpen={false}
            expanded={launcherState.open}
            onExpandedChange={(next) =>
              setLauncherState(next ? openedDevDockStateV1 : closedDevDockStateV1)}
            {...(props.position === undefined ? {} : { position: props.position })}
            {...(props.freeze === undefined ? {} : { presentationFreeze: props.freeze })}
            {...(props.savePort === undefined ? {} : { savePort: props.savePort })}
            {...(props.clearAllSaves === undefined ? {} : { clearAllSaves: props.clearAllSaves })}
            {...(props.onReinitialize === undefined
              ? {}
              : { onReinitialize: props.onReinitialize })}
            {...(props.info === undefined ? {} : { info: props.info })}
          />
        )
        : null}
      <DevDockV1
        capabilities={props.capabilities}
        contributions={contributions}
        inputRouter={props.composition.input}
        control={control}
        {...(props.position === undefined ? {} : { position: props.position })}
        {...(props.freeze === undefined ? {} : { freeze: props.freeze })}
      />
    </>
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
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
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
    const release = narrative.registerHostPhysicalIngressInternalV1(
      Object.freeze({
        session,
        portalContainer,
        inputRouter,
      }),
    );
    const binding = Object.freeze({ session, portalContainer, inputRouter });
    setRegistered(binding);
    return () => {
      release();
      setRegistered((current) => (current === binding ? null : current));
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

function DefaultWholeCanvasSurfaceHostInternalV1(props: {
  readonly wholeCanvas: WholeCanvasSurfaceCompositionRuntimeInternalV1;
  readonly inputRouter: InputRouterV1;
}): ReactElement | null {
  const { wholeCanvas, inputRouter } = props;
  const binding = useSyncExternalStore(
    wholeCanvas.subscribeInternalV1,
    wholeCanvas.getCurrentHostBindingInternalV1,
    wholeCanvas.getCurrentHostBindingInternalV1,
  );
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [registered, setRegistered] = useState<
    Readonly<{
      readonly binding: WholeCanvasSurfaceHostBindingInternalV1;
      readonly portalContainer: HTMLDivElement;
      readonly inputRouter: InputRouterV1;
    }> | null
  >(null);
  const capturePortal = useCallback((next: HTMLDivElement | null): void => {
    setPortalContainer(next);
  }, []);

  useLayoutEffect(() => {
    if (binding === null || portalContainer === null) return undefined;
    const release = wholeCanvas.registerHostPhysicalIngressInternalV1(
      Object.freeze({
        portalContainer,
        inputRouter,
      }),
    );
    const next = Object.freeze({ binding, portalContainer, inputRouter });
    setRegistered(next);
    return () => {
      release();
      setRegistered((current) => (current === next ? null : current));
    };
  }, [binding, inputRouter, portalContainer, wholeCanvas]);

  if (binding === null) return null;
  return (
    <>
      <div
        ref={capturePortal}
        data-default-whole-canvas-surface-portal="true"
        style={{ pointerEvents: "none" }}
      />
      {registered === null ? null : (
        <WholeCanvasSurfaceHostInternalV1
          binding={registered.binding}
          portalContainer={registered.portalContainer}
          inputRouter={registered.inputRouter}
        />
      )}
    </>
  );
}

const subscribeNothingInternalV1 = (_listener: () => void): () => void => () => {};

function readFrontDoorNotExclusiveInternalV1(): boolean {
  return false;
}

/** Splash/Title occupy the canvas as their own scene; gameplay chrome stays off-stage. */
function useWholeCanvasFrontDoorExclusiveInternalV1(
  wholeCanvas: WholeCanvasSurfaceCompositionRuntimeInternalV1 | null,
): boolean {
  const subscribe = wholeCanvas?.subscribeInternalV1 ?? subscribeNothingInternalV1;
  const getExclusive = wholeCanvas?.isFrontDoorExclusiveInternalV1 ??
    readFrontDoorNotExclusiveInternalV1;
  return useSyncExternalStore(subscribe, getExclusive, getExclusive);
}

const gameplayVisibleLayerStyleInternalV1 = Object.freeze({
  display: "contents" as const,
});

function isEmptyGameplayLayerContentInternalV1(content: ReactNode): boolean {
  return content === null || content === undefined || content === false;
}

function concealGameplayWhileFrontDoorInternalV1(
  exclusive: boolean,
  content: ReactNode,
): ReactNode {
  // GameStage omits empty pointer layers; a wrapper around null would eat hits.
  if (isEmptyGameplayLayerContentInternalV1(content)) return content;
  return (
    <div
      hidden={exclusive}
      data-gameplay-concealed={exclusive ? "true" : "false"}
      style={exclusive ? undefined : gameplayVisibleLayerStyleInternalV1}
    >
      {content}
    </div>
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
  type PublicationV1 = RuntimePresentationPublicationV1<
    TSemanticPublication,
    TView,
    TAssetId
  >;
  const labels = Object.freeze({ ...defaultGameRootLabelsV1, ...props.labels });
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

  // Composition-backed members stay referentially stable across renders so
  // Story lifecycle effects can depend on them without re-subscribing.
  const updateStoryUiState = props.composition.updateUiState as (
    updater: (current: unknown) => unknown,
  ) => void;
  const slotContext: DefaultGameRootSlotContextV1<
    PublicationV1,
    TSemantic,
    TOverlayId
  > = Object.freeze({
    publication,
    semantic: props.semantic,
    intents: props.composition.intents,
    input: props.composition.input,
    updateStoryUiState,
    systemDialogs: Object.freeze({
      openSettings: () => props.composition.systemDialogSession.openSettings(),
      openSaves: () => props.composition.systemDialogSession.openSaves(),
      returnToTitle: () => {
        const managed = resolveOptionalGameUiManagedSurfaceCompositionInternalV1(
          props.composition,
        );
        return managed === null
          ? Promise.reject(new Error("ui.whole_canvas_front_door_unavailable"))
          : managed.returnToTitleInternalV1();
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
  const wholeCanvasComposition = managedComposition?.wholeCanvas ?? null;
  const frontDoorExclusive = useWholeCanvasFrontDoorExclusiveInternalV1(
    wholeCanvasComposition,
  );

  const layers = Object.freeze({
    background: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      narrativeComposition === null
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
    ),
    character: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      <div
        className={styles["default-root__stage-slot"]}
        key={`character:${String(anchor.epoch)}`}
      >
        {slots.character?.(slotContext) ?? null}
      </div>,
    ),
    sceneInteraction: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      slots.sceneInteraction?.(slotContext) ?? null,
    ),
    hud: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      slots.hud?.(slotContext) ?? null,
    ),
    workspaceOverlay: (
      <OverlayHostV1
        session={resolveWorkspaceOverlaySessionInternalV1(
          props.composition.overlaySession,
        )}
        rendererResolver={overlayResolver}
        inputRouter={props.composition.input}
        closeLabel={labels.closeLabel}
      />
    ),
    narrative: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      narrativeComposition?.isHostEnabledInternalV1() === true
        ? (
          <DefaultNarrativeSurfaceHostInternalV1
            narrative={narrativeComposition}
            inputRouter={props.composition.input}
          />
        )
        : null,
    ),
    wholeCanvas: wholeCanvasComposition?.isHostEnabledInternalV1() !== true
      ? null
      : (
        <DefaultWholeCanvasSurfaceHostInternalV1
          wholeCanvas={wholeCanvasComposition}
          inputRouter={props.composition.input}
        />
      ),
    system: (
      <SystemDialogHostV1
        inputRouter={props.composition.input}
        session={props.composition.systemDialogSession}
        {...(systemSaves === undefined ? {} : { saves: systemSaves })}
        settings={Object.freeze({
          title: labels.settingsTitle,
          closeLabel: labels.closeLabel,
          sections: Object.freeze([
            ...(props.playerProfile === undefined ||
                props.capabilities === undefined
              ? []
              : [
                <DefaultSettingsSectionsV1
                  key="sillymaker-default-settings"
                  playerProfile={props.playerProfile}
                  capabilities={props.capabilities}
                  showDeveloperTools={props.hideDeveloperToolsToggle !== true}
                  labels={Object.freeze({
                    bgmVolumeLabel: labels.settingsBgmVolumeLabel,
                    voiceVolumeLabel: labels.settingsVoiceVolumeLabel,
                    sfxVolumeLabel: labels.settingsSfxVolumeLabel,
                    mutedLabel: labels.settingsMutedLabel,
                    ...(labels.settingsSkipCutscenesLabel === undefined ? {} : {
                      skipCutscenesLabel: labels.settingsSkipCutscenesLabel,
                    }),
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
        {props.hideSystemMenu === true || frontDoorExclusive ? null : (
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
  const chip = props.devDock?.chip !== false;
  const hasStoryTools = props.devDockContributions !== undefined ||
    props.devDock?.load !== undefined;
  const hasMaintenance = props.sessionMaintenance !== undefined;
  const mountDevDock = props.capabilities !== undefined && (
    (chip && (hasMaintenance || hasStoryTools)) ||
    (!chip && hasStoryTools)
  );
  return (
    <div
      role="application"
      aria-label={props.accessibleName}
      data-application-id={props.applicationId}
      data-presentation-epoch={anchor.epoch}
      data-presentation-origin={anchor.origin}
      data-presentation-revision={publication.revision}
      data-front-door-exclusive={frontDoorExclusive ? "true" : "false"}
      {...(semanticRevision === undefined ? {} : { "data-semantic-revision": semanticRevision })}
      {...(semanticStatus === undefined ? {} : { "data-semantic-status": semanticStatus })}
      className={styles["default-root"]}
    >
      <GameShell
        accessibleName={props.resolveStageAccessibleName?.(publication) ??
          props.accessibleName}
        layers={layers}
        inputRouter={props.composition.input}
        viewport={props.viewport}
        devDock={!mountDevDock || props.capabilities === undefined ? null : (
          <DefaultDevDockV1
            capabilities={props.capabilities}
            contributions={props.devDockContributions ?? emptyDevDockContributionsV1}
            composition={props.composition}
            {...(props.devDock?.load === undefined ? {} : { load: props.devDock.load })}
            {...(props.devDock?.observeOpenState === undefined
              ? {}
              : { observeOpenState: props.devDock.observeOpenState })}
            {...(props.devDock?.position === undefined ? {} : { position: props.devDock.position })}
            {...(props.devDock?.chip === undefined ? {} : { chip: props.devDock.chip })}
            {...(props.devDock?.control === undefined ? {} : { control: props.devDock.control })}
            {...(props.devDock?.freeze === undefined ? {} : { freeze: props.devDock.freeze })}
            {...(props.devDock?.info === undefined ? {} : { info: props.devDock.info })}
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
        )}
      />
    </div>
  );
}
