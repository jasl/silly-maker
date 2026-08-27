// SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement, ReactNode } from "react";

import type { DeepReadonly } from "@sillymaker/base";
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
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { SystemDialogHostV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogCustomSavesV1 } from "../system/system-dialog-host.tsx";
import type { SystemDialogOpenResultV1 } from "../system/system-dialog-managed-contract.ts";
import { PlayerSystemControllerProviderInternalV1 } from "../system/player-system-controller-internal.tsx";
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
import { resolveGameUiManagedSurfaceCompositionInternalV1 } from "./create-game-ui-composition.ts";
import { SemanticStageCompositionClaimantProviderInternalV1 } from "../stage/semantic-stage.tsx";
import styles from "./default-game-root.module.css";

/** Player-facing labels of the default surfaces; Stories override per locale. */
export interface DefaultGameRootLabelsV1 {
  readonly systemMenuLabel: string;
  readonly saveLabel: string;
  readonly settingsLabel: string;
  readonly settingsTitle: string;
  readonly settingsEmptyText: string;
  readonly settingsMutedLabel: string;
  readonly titleNewGameLabel: string;
  readonly titleNewGameFailedText: string;
  readonly titleContinueLabel: string;
  readonly titleLoadGameLabel: string;
  /** Title Settings control; omitted means `settingsLabel`. */
  readonly titleSettingsLabel?: string;
  readonly closeLabel: string;
}

export const defaultGameRootLabelsV1: DefaultGameRootLabelsV1 = {
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  settingsMutedLabel: "Mute",
  titleNewGameLabel: "New game",
  titleNewGameFailedText: "Unable to start a new game.",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
};

/**
 * Product copy that follows the active PlayerProfile locale. The Web Host
 * activates Text content before publishing the locale preference, so this
 * projection reads one already-current localization authority.
 */
export interface DefaultGameRootLocalizedCopyV1 {
  readonly accessibleName?: string;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly saveLabels?: SaveOverlayLabelsV1;
}

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
  /** Optional shell chrome kept outside the authoritative stage. */
  auxiliarySurface?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic, TOverlayId>,
  ): ReactNode;
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
  /** Enables the default mute control in the floating system menu. */
  readonly playerProfile?: PlayerProfileStoreV1;
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
  /** Pure copy projection re-read after the active PlayerProfile locale changes. */
  resolveLocalizedCopy?(activeLocale: string | null): DefaultGameRootLocalizedCopyV1;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  /** Optional keyboard/gamepad adapters routed through the composition. */
  readonly inputMaps?: {
    readonly keyboard?: KeyboardActionMapV1;
    readonly pointer?: PointerActionMapV1;
    readonly gamepad?: GamepadActionMapV1;
  };
}

function createDefaultOverlayResolverV1<TOverlayId extends string>(input: {
  readonly storyResolver: OverlayRendererResolverV1<TOverlayId> | null;
}): OverlayRendererResolverV1<GameUiOverlayIdV1<TOverlayId>> {
  return {
    resolve(overlayId: DeepReadonly<GameUiOverlayIdV1<TOverlayId>>) {
      return (
        input.storyResolver?.resolve(overlayId as DeepReadonly<TOverlayId>) ??
          null
      );
    },
  };
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
      {
        session,
        portalContainer,
        inputRouter,
      },
    );
    const binding = { session, portalContainer, inputRouter };
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
      {
        portalContainer,
        inputRouter,
      },
    );
    const next = { binding, portalContainer, inputRouter };
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

const gameplayVisibleLayerStyleInternalV1 = {
  display: "contents" as const,
};

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
 * default surfaces (Save, Settings, dialogs) satisfy the designed baseline.
 * Optional authoring or developer chrome enters through the neutral auxiliary
 * surface slot and is not part of this root's required graph.
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
  const subscribeProfile = useCallback(
    (listener: () => void) =>
      props.resolveLocalizedCopy === undefined
        ? () => undefined
        : props.playerProfile?.subscribe(listener) ?? (() => undefined),
    [props.playerProfile, props.resolveLocalizedCopy],
  );
  const readProfileLocale = useCallback(
    () =>
      props.resolveLocalizedCopy === undefined
        ? null
        : props.playerProfile?.current().preferences.locale ?? null,
    [props.playerProfile, props.resolveLocalizedCopy],
  );
  const profileLocale = useSyncExternalStore(
    subscribeProfile,
    readProfileLocale,
    readProfileLocale,
  );
  const resolveLocalizedCopy = props.resolveLocalizedCopy;
  const localizedCopy = useMemo(
    () => resolveLocalizedCopy?.(profileLocale) ?? null,
    [profileLocale, resolveLocalizedCopy],
  );
  const labels = useMemo(
    () => ({
      ...defaultGameRootLabelsV1,
      ...props.labels,
      ...localizedCopy?.labels,
    }),
    [localizedCopy, props.labels],
  );
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
    return {
      port: props.saveUi.port,
      labels: localizedCopy?.saveLabels ?? props.saveUi.labels,
      ...(evaluateGuard === undefined ? {} : {
        guardProjection: {
          getSnapshot: props.composition.presentation.getSnapshot,
          subscribe: props.composition.presentation.subscribe,
          evaluate: evaluateGuard,
        },
      }),
    };
  }, [localizedCopy?.saveLabels, props.composition.presentation, props.customSaves, props.saveUi]);

  // Composition-backed members stay referentially stable across renders so
  // Story lifecycle effects can depend on them without re-subscribing.
  const updateStoryUiState = props.composition.updateUiState as (
    updater: (current: unknown) => unknown,
  ) => void;
  const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(
    props.composition,
  );
  const playerSaveUi = props.saveUi;
  const playerSystemController = useMemo(
    () => ({
      savesAvailable: systemSaves !== undefined,
      quickSave: playerSaveUi === undefined ? null : async () => {
        const guard = playerSaveUi.evaluateGuard?.(
          props.composition.presentation.getSnapshot(),
        );
        if (guard?.allowed === false) {
          return {
            kind: "guarded" as const,
            ...(guard.reasonText === undefined ? {} : { reasonText: guard.reasonText }),
          };
        }
        return await playerSaveUi.port.save("quick");
      },
      quickLoad: playerSaveUi === undefined ? null : () => playerSaveUi.port.load("quick"),
      openSettings: () => props.composition.systemDialogSession.openSettings(),
      openSaves: () => props.composition.systemDialogSession.openSaves(),
      returnToTitle: () => managedComposition.returnToTitleInternalV1(),
    }),
    [
      managedComposition,
      playerSaveUi,
      props.composition.presentation,
      props.composition.systemDialogSession,
      systemSaves,
    ],
  );
  const slotContext: DefaultGameRootSlotContextV1<
    PublicationV1,
    TSemantic,
    TOverlayId
  > = {
    publication,
    semantic: props.semantic,
    intents: props.composition.intents,
    input: props.composition.input,
    updateStoryUiState,
    systemDialogs: {
      openSettings: () => props.composition.systemDialogSession.openSettings(),
      openSaves: () => props.composition.systemDialogSession.openSaves(),
      returnToTitle: () => managedComposition.returnToTitleInternalV1(),
    },
    overlays: props.composition.overlaySession,
    presentation: props.composition.presentation as never,
    interactionSession: props.composition.interactionSession,
    cues: props.composition.cues,
  };

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
  const narrativeComposition = managedComposition.narrative;
  const wholeCanvasComposition = managedComposition.wholeCanvas;
  const frontDoorExclusive = useWholeCanvasFrontDoorExclusiveInternalV1(
    wholeCanvasComposition,
  );

  const layers = {
    background: concealGameplayWhileFrontDoorInternalV1(
      frontDoorExclusive,
      <SemanticStageCompositionClaimantProviderInternalV1
        claimant={narrativeComposition.getStageClaimantInternalV1()}
        onBindInternalV1={narrativeComposition.bindStageReconcilerInternalV1}
      >
        <div className={styles["default-root__stage-slot"]}>
          {slots.background?.(slotContext) ?? null}
        </div>
      </SemanticStageCompositionClaimantProviderInternalV1>,
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
      narrativeComposition.isHostEnabledInternalV1()
        ? (
          <DefaultNarrativeSurfaceHostInternalV1
            narrative={narrativeComposition}
            inputRouter={props.composition.input}
          />
        )
        : null,
    ),
    wholeCanvas: !wholeCanvasComposition.isHostEnabledInternalV1()
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
        settings={{
          title: labels.settingsTitle,
          closeLabel: labels.closeLabel,
          sections: slots.settingsSections?.(slotContext) ?? [],
          emptyText: labels.settingsEmptyText,
        }}
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
  };

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
  const localizedApplicationName = localizedCopy?.accessibleName ?? props.accessibleName;
  return (
    <div
      role="application"
      aria-label={localizedApplicationName}
      data-application-id={props.applicationId}
      data-presentation-epoch={anchor.epoch}
      data-presentation-origin={anchor.origin}
      data-presentation-revision={publication.revision}
      data-front-door-exclusive={frontDoorExclusive ? "true" : "false"}
      {...(semanticRevision === undefined ? {} : { "data-semantic-revision": semanticRevision })}
      {...(semanticStatus === undefined ? {} : { "data-semantic-status": semanticStatus })}
      className={styles["default-root"]}
    >
      <PlayerSystemControllerProviderInternalV1 controller={playerSystemController}>
        <GameShell
          accessibleName={props.resolveStageAccessibleName?.(publication) ??
            localizedApplicationName}
          layers={layers}
          inputRouter={props.composition.input}
          viewport={props.viewport}
          auxiliarySurface={slots.auxiliarySurface?.(slotContext) ?? null}
        />
      </PlayerSystemControllerProviderInternalV1>
    </div>
  );
}
