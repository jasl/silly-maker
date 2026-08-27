// SPDX-License-Identifier: MIT
import { createElement } from "react";
import type { ReactNode } from "react";

import type {
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  ReadonlyViewSourceV1,
  SessionAnchorResultV1,
} from "@sillymaker/base";
import { parseContentMaturityFlagsV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import { inputIgnoredV1 } from "../input/contracts.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import {
  bindManagedInputRouterFacadeInternalV1,
  createInputRouterV1,
} from "../input/input-router.ts";
import type { InteractionSessionStoreV1 } from "../interaction/interaction-session-store.ts";
import {
  createInteractionSessionStoreV1,
  initialInteractionSessionStateV1,
} from "../interaction/interaction-session-store.ts";
import type { PresentationIntentRouterV1 } from "../interaction/presentation-intent-router.ts";
import { createPresentationIntentRouterV1 } from "../interaction/presentation-intent-router.ts";
import type {
  OverlaySessionStoreV1,
  WorkspaceOverlayDefinitionV1,
  WorkspaceOverlayPortBindingV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
  type CreateManagedSurfaceCompositionRuntimeInternalInputV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type {
  ManagedSurfaceApplicationEpochAllocatorV1,
  ManagedSurfaceCoordinatorRecipeV1,
  ManagedSurfaceCoordinatorSuccessorKindV1,
} from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import { createViewSourceV1 } from "../runtime/create-view-bridge.ts";
import type {
  PresentationRuntimeFailureV1,
  RuntimePresentationProjectionInputV1,
  RuntimePresentationProjectionV1,
  RuntimePresentationPublicationV1,
  RuntimePresentationStoreV1,
} from "../runtime/runtime-presentation-store.ts";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { createRuntimePresentationStoreV1 } from "../runtime/runtime-presentation-store.ts";
import { createSemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.ts";
import { BootSplashV1 } from "../system/boot-splash.tsx";
import { TitleScreenV1 } from "../system/title-screen.tsx";
import {
  systemDialogManagedContractInternalV1,
  type SystemDialogSessionV1,
} from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
} from "../system/system-dialog-managed-session.ts";
import {
  appendNarrativeManagedSurfaceRecipeInternalV1,
  createNarrativeSurfaceCompositionRuntimeInternalV1,
  type NarrativeSurfaceCompositionDefinitionInternalV1,
  type NarrativeSurfaceCompositionRuntimeInternalV1,
  type NarrativeSurfaceDefinitionV1,
} from "../narrative/narrative-surface-composition.tsx";
import { createNarrativeManagedSurfaceFamilyContractInternalV1 } from "../narrative/narrative-managed-surface-family.ts";
import {
  bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1,
  claimWholeCanvasSurfaceHostedAdapterInternalV1,
  createWholeCanvasSurfaceCompositionDefinitionInternalV1,
  createWholeCanvasSurfaceCompositionRuntimeInternalV1,
  resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1,
  type WholeCanvasSurfaceCompositionDefinitionInternalV1,
  type WholeCanvasSurfaceCompositionRuntimeInternalV1,
  type WholeCanvasSurfaceDefinitionV1,
  type WholeCanvasSurfaceHostedAdapterInternalV1,
  type WholeCanvasSurfaceRendererPropsInternalV1,
} from "../whole-canvas/whole-canvas-surface-composition.tsx";
import type {
  WholeCanvasManagedSurfaceActionIntentInternalV1,
  WholeCanvasManagedSurfaceRenderEntryInternalV1,
  WholeCanvasManagedSurfaceResolvedTargetInternalV1,
  WholeCanvasManagedSurfaceRootDesiredInternalV1,
} from "../whole-canvas/whole-canvas-managed-surface-session.ts";

/**
 * The instance-local presentation anchor as the UI consumes it. It mirrors
 * the core application's anchor (epoch plus origin label) and never flows
 * back into SemanticPublication or Agent parity surfaces.
 */
export interface GameUiPresentationAnchorV1 {
  readonly epoch: number;
  readonly origin: string;
}

export interface GameUiAnchorSourceV1 {
  current(): GameUiPresentationAnchorV1;
  subscribe(listener: () => void): () => void;
}

/** @internal Opaque Core publication-context identity; compared only by object identity. */
export type GameUiPresentationAnchorTokenInternalV1 = object;

/** @internal Exact producer event; `null` marks a replacement with no armed consumer. */
export interface GameUiPresentationAnchorEventInternalV1 {
  readonly anchor: GameUiPresentationAnchorV1;
  readonly token: GameUiPresentationAnchorTokenInternalV1 | null;
}

/** @internal Hosted-only exact event source. It never expands the public anchor source. */
export interface GameUiPresentationAnchorEventSourceInternalV1 {
  current(): GameUiPresentationAnchorV1;
  subscribe(
    listener: (event: GameUiPresentationAnchorEventInternalV1) => void,
  ): () => void;
}

/** @internal Web-owned acknowledgment producer for exact application-operation tokens. */
export interface GameUiPresentationSuccessorProducerInternalV1 {
  installed(outcome: {
    readonly anchor: GameUiPresentationAnchorV1;
    readonly token: GameUiPresentationAnchorTokenInternalV1;
    readonly managedSurfaceApplicationEpoch: number;
  }): void;
  failed(outcome: {
    readonly anchor: GameUiPresentationAnchorV1;
    readonly token: GameUiPresentationAnchorTokenInternalV1 | null;
    readonly error: unknown;
  }): void;
}

/** The combined UI state every projector receives. */
export interface GameUiStateV1<TStoryUiState> {
  readonly anchor: GameUiPresentationAnchorV1;
  readonly story: DeepReadonly<TStoryUiState>;
}

export interface GameUiSemanticSourceV1<TSemanticPublication> {
  observe(): DeepReadonly<TSemanticPublication>;
  subscribe(listener: () => void): () => void;
}

export interface GameUiProjectorV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
> {
  readonly resolvedCatalog: DeepReadonly<TResolvedCatalog>;
  readonly initialUiState: DeepReadonly<TStoryUiState>;
  project(
    input: RuntimePresentationProjectionInputV1<
      TSemanticPublication,
      TResolvedCatalog,
      GameUiStateV1<TStoryUiState>
    >,
  ): RuntimePresentationProjectionV1<TView, TAssetId>;
}

export interface CreateGameUiCompositionInputV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
> {
  readonly semantic: GameUiSemanticSourceV1<TSemanticPublication>;
  readonly projector: GameUiProjectorV1<
    TSemanticPublication,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId
  >;
  /** Instance-local presentation anchor; a static bootstrap anchor without one. */
  readonly anchor?: GameUiAnchorSourceV1;
  readonly contentPreference?: ContentPreferencePortV1;
  /** Resolved Workspace Overlay definitions accepted by the intent router. */
  readonly overlayDefinitions?: readonly WorkspaceOverlayDefinitionV1<TOverlayId>[];
  /** Concrete composition ports available to definitions during Overlay admission. */
  readonly overlayPorts?: readonly WorkspaceOverlayPortBindingV1[];
  /** Cue IDs the intent router accepts for `presentation.play_cue`. */
  readonly cueIds?: readonly string[];
  /** Spatial interaction surface IDs the intent router accepts. */
  readonly interactionSurfaceIds?: readonly string[];
  reportFailure?(failure: DeepReadonly<PresentationRuntimeFailureV1>): void;
}

/** The Workspace Overlay ID space of a composed UI. System dialogs remain a separate family. */
export type GameUiOverlayIdV1<TOverlayId extends string> = TOverlayId;

/** A mounted stage's timeline controller; play returns handled-or-not. */
export interface GameUiCueControllerV1 {
  play(cueId: string): boolean;
}

export interface GameUiCueRegistryV1 {
  register(controller: GameUiCueControllerV1 | null): void;
  play(cueId: string): boolean;
}

export interface GameUiCompositionV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
> {
  readonly presentation: RuntimePresentationStoreV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>
  >;
  readonly anchor: ReadonlyViewSourceV1<GameUiPresentationAnchorV1>;
  readonly input: InputRouterV1;
  readonly intents: PresentationIntentRouterV1;
  /** The cue registry: the mounted stage registers its timeline controller. */
  readonly cues: GameUiCueRegistryV1;
  readonly overlaySession: OverlaySessionStoreV1<GameUiOverlayIdV1<TOverlayId>>;
  readonly systemDialogSession: SystemDialogSessionV1;
  /** The composition-owned spatial interaction session (UI transient). */
  readonly interactionSession: InteractionSessionStoreV1;
  updateUiState(
    updater: (
      current: DeepReadonly<TStoryUiState>,
    ) => DeepReadonly<TStoryUiState>,
  ): void;
  isDisposed(): boolean;
  dispose(): void;
}

/** @internal Managed Surface authority shared by the public family facades. */
export interface GameUiManagedSurfaceCompositionInternalV1 {
  readonly runtime: ManagedSurfaceCompositionRuntimeInternalV1;
  readonly narrative: NarrativeSurfaceCompositionRuntimeInternalV1;
  readonly wholeCanvas: WholeCanvasSurfaceCompositionRuntimeInternalV1;
  readonly systemDialogSession: SystemDialogSessionV1;
  returnToTitleInternalV1(): Promise<void>;
  sealTerminalInternalV1(): void;
  isTerminalInternalV1(): boolean;
}

const gameUiManagedSurfaceCompositionInternalsV1 = new WeakMap<
  object,
  GameUiManagedSurfaceCompositionInternalV1
>();

/** @internal Relative-source composition/test seam for managed-family Host integration. */
export function resolveGameUiManagedSurfaceCompositionInternalV1(
  composition: object,
): GameUiManagedSurfaceCompositionInternalV1 {
  const internal = gameUiManagedSurfaceCompositionInternalsV1.get(composition);
  if (internal === undefined) {
    throw new TypeError("ui.game_ui_managed_surface_composition_required");
  }
  return internal;
}

/** @internal Narrow Host fence; it does not expose managed-family authority. */
export function sealHostedGameUiCompositionTerminalInternalV1(
  composition: object,
): void {
  resolveGameUiManagedSurfaceCompositionInternalV1(
    composition,
  ).sealTerminalInternalV1();
}

function combineManagedSurfaceRecipeInternalV1(
  overlay: ManagedSurfaceCoordinatorRecipeV1,
): ManagedSurfaceCoordinatorRecipeV1 {
  return ({
    resolvedOwnerIds: [
      ...overlay.resolvedOwnerIds,
      ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
    ],
    resolvedSlotDescriptors: [
      ...overlay.resolvedSlotDescriptors,
      ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    ],
    ...(overlay.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: overlay.reportSubscriberFailure }),
  });
}

function appendWholeCanvasManagedSurfaceRecipeInternalV1(
  recipe: ManagedSurfaceCoordinatorRecipeV1,
  family: ReturnType<
    typeof resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1
  >,
): ManagedSurfaceCoordinatorRecipeV1 {
  return ({
    resolvedOwnerIds: [
      ...recipe.resolvedOwnerIds,
      ...family.resolvedOwnerIds,
    ],
    resolvedSlotDescriptors: [
      ...recipe.resolvedSlotDescriptors,
      ...family.resolvedSlotDescriptors,
    ],
    ...(recipe.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: recipe.reportSubscriberFailure }),
  });
}

const bootstrapAnchorV1: GameUiPresentationAnchorV1 = {
  epoch: 0,
  origin: "bootstrap",
};

const staticAnchorSourceV1: GameUiAnchorSourceV1 = {
  current: () => bootstrapAnchorV1,
  subscribe: () => () => undefined,
};

type NarrativeSurfaceCompositionEnvironmentInputInternalV1 = Readonly<{
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly prefersReducedMotion: () => boolean;
}>;

type HostedWholeCanvasTitleScreenInternalV1 = Readonly<{
  readonly title: string;
  readonly backgroundUrl: string | null;
  readonly splash:
    | Readonly<{
      readonly lines: readonly string[];
      readonly durationMs: number | null;
    }>
    | null;
  readonly beginNewGame: (() => void | Promise<unknown>) | null;
}>;

type HostedWholeCanvasInputInternalV1<TSemanticPublication> = Readonly<{
  readonly definition: WholeCanvasSurfaceDefinitionV1<TSemanticPublication> | null;
  readonly titleScreen: HostedWholeCanvasTitleScreenInternalV1 | null;
  readonly lifecycle: Readonly<{
    readonly restart: () => Promise<SessionAnchorResultV1>;
    readonly flushAutoSave: () => Promise<void>;
  }>;
  readonly savePort: SaveOverlayPortV1 | null;
  readonly customSavesConfigured: boolean;
  readonly labels: Readonly<{
    readonly newGame: string;
    readonly newGameFailed: string;
    readonly continue: string;
    readonly load: string;
    readonly settings: string;
  }>;
}>;

type HostedSurfaceCompositionInputInternalV1<TSemanticPublication> = Readonly<{
  readonly narrative: NarrativeSurfaceDefinitionV1<TSemanticPublication> | null;
  readonly wholeCanvas: HostedWholeCanvasInputInternalV1<TSemanticPublication> | null;
  readonly environment: NarrativeSurfaceCompositionEnvironmentInputInternalV1;
}>;

const wholeCanvasBuiltinTargetIdsInternalV1 = {
  bootSplash: "whole-canvas.builtin.splash",
  title: "whole-canvas.builtin.title",
};

const wholeCanvasBuiltinTextIdsInternalV1 = {
  splash: "text.whole-canvas.splash",
  title: "text.whole-canvas.title",
};

const wholeCanvasEmptyParametersInternalV1 = {};
const wholeCanvasNoReasonsInternalV1 = [] as string[];
const wholeCanvasOwnerPayloadInternalV1 = {};

type HostedWholeCanvasBuiltinStateInternalV1 = Readonly<{
  readonly bootSplash:
    | NonNullable<
      WholeCanvasManagedSurfaceRootDesiredInternalV1["bootSplash"]
    >
    | null;
  readonly title:
    | NonNullable<
      WholeCanvasManagedSurfaceRootDesiredInternalV1["title"]
    >
    | null;
  readonly story: WholeCanvasManagedSurfaceRootDesiredInternalV1["story"];
  readonly continueAvailable: boolean;
  readonly loadAvailable: boolean;
  readonly newGameFailure: boolean;
}>;

interface HostedWholeCanvasBridgeInternalV1<TSemanticPublication> {
  readonly definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>;
  bindPublicationInternalV1(
    publication: Readonly<{
      getSnapshot(): Readonly<{
        readonly semantic: DeepReadonly<TSemanticPublication>;
      }>;
      subscribe(listener: () => void): () => void;
    }>,
  ): void;
  bindSystemDialogsInternalV1(session: SystemDialogSessionV1): void;
  prepareSuccessorInternalV1(origin: string): void;
  onAnchorInstalledInternalV1(origin: string): void;
  returnToTitleInternalV1(): Promise<void>;
  commitClaimInternalV1(): void;
  rollbackInternalV1(): void;
  terminalizeInternalV1(): void;
}

function wholeCanvasTargetInternalV1(
  targetId: string,
): NonNullable<WholeCanvasManagedSurfaceRootDesiredInternalV1["bootSplash"]> {
  return ({
    targetId,
    parameters: wholeCanvasEmptyParametersInternalV1,
  });
}

function wholeCanvasOwnerIntentInternalV1(): WholeCanvasManagedSurfaceActionIntentInternalV1 {
  return ({
    kind: "owner" as const,
    payload: wholeCanvasOwnerPayloadInternalV1,
  });
}

function wholeCanvasBuiltinActionInternalV1(
  actionId: string,
  status: "enabled" | "disabled" = "enabled",
): Readonly<{
  readonly actionId: string;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
  readonly intent: WholeCanvasManagedSurfaceActionIntentInternalV1;
}> {
  return ({
    actionId,
    status,
    reasonTextIds: status === "enabled"
      ? wholeCanvasNoReasonsInternalV1
      : ["text.whole-canvas.action-unavailable"],
    intent: wholeCanvasOwnerIntentInternalV1(),
  });
}

function continueAvailableFromSlotsInternalV1(
  slots: readonly { readonly slotId: string; readonly health: string }[],
): boolean {
  const autosave = slots.find((slot) => slot.slotId === "auto.current");
  return (
    autosave !== undefined &&
    (autosave.health === "valid" || autosave.health === "recovery_candidate")
  );
}

function loadAvailableFromSlotsInternalV1(
  slots: readonly { readonly health: string }[],
): boolean {
  return slots.some(
    (slot) => slot.health === "valid" || slot.health === "recovery_candidate",
  );
}

function isHostedNarrativeCallableInternalV1(
  value: unknown,
): value is (...args: never[]) => unknown {
  return typeof value === "function";
}

function releaseHostedSubscriptionInternalV1(release: () => void): unknown {
  try {
    release();
    return null;
  } catch (error) {
    return error;
  }
}

function captureHostedSurfaceCompositionInputInternalV1<TSemanticPublication>(
  input: HostedSurfaceCompositionInputInternalV1<TSemanticPublication>,
): HostedSurfaceCompositionInputInternalV1<TSemanticPublication> {
  if (input.narrative === null && input.wholeCanvas === null) {
    throw new TypeError("ui.hosted_surface_composition_environment_invalid");
  }
  if (
    input.wholeCanvas !== null && input.wholeCanvas.definition === null &&
    input.wholeCanvas.titleScreen === null
  ) {
    throw new TypeError("ui.whole_canvas_hosted_input_invalid");
  }
  return input;
}

function resolveNarrativeSurfaceDefinitionInternalV1<TSemanticPublication>(
  definition: NarrativeSurfaceDefinitionV1<TSemanticPublication> | null,
): NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication> | null {
  return definition as NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication> | null;
}

function createHostedWholeCanvasBridgeInternalV1<TSemanticPublication>(
  input: HostedWholeCanvasInputInternalV1<TSemanticPublication>,
  environment: NarrativeSurfaceCompositionEnvironmentInputInternalV1,
): HostedWholeCanvasBridgeInternalV1<TSemanticPublication> {
  const storyAdapter: WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication> | null =
    input.definition === null
      ? null
      : claimWholeCanvasSurfaceHostedAdapterInternalV1(input.definition);
  try {
    const listeners = new Set<() => void>();
    const bootSplash = input.titleScreen?.splash === null || input.titleScreen === null
      ? null
      : wholeCanvasTargetInternalV1(
        wholeCanvasBuiltinTargetIdsInternalV1.bootSplash,
      );
    const title = input.titleScreen === null ? null : wholeCanvasTargetInternalV1(
      wholeCanvasBuiltinTargetIdsInternalV1.title,
    );
    let state: HostedWholeCanvasBuiltinStateInternalV1 = {
      bootSplash,
      title,
      story: null,
      continueAvailable: false,
      loadAvailable: false,
      newGameFailure: false,
    };
    let publication:
      | Readonly<{
        getSnapshot(): Readonly<{
          readonly semantic: DeepReadonly<TSemanticPublication>;
        }>;
        subscribe(listener: () => void): () => void;
      }>
      | null = null;
    let systemDialogs: SystemDialogSessionV1 | null = null;
    let sourceUnsubscribe: (() => void) | null = null;
    let disposed = false;
    let claimCommitted = false;
    let mutationGeneration = 0;
    let returningToTitle = false;
    let reconciling = false;
    let dirty = false;

    const notify = (): void => {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch {
          // The aggregate desired state is already committed.
        }
      }
    };
    const publishState = (
      next: HostedWholeCanvasBuiltinStateInternalV1,
    ): void => {
      if (disposed || Object.is(next, state)) return;
      state = next;
      notify();
    };
    const refreshStory = (): void => {
      if (disposed || storyAdapter === null) return;
      if (reconciling) {
        dirty = true;
        return;
      }
      reconciling = true;
      try {
        do {
          if (disposed) break;
          dirty = false;
          const story = storyAdapter.getStoryDesiredInternalV1();
          if (!Object.is(story, state.story)) {
            state = { ...state, story };
            notify();
          }
        } while (dirty);
      } finally {
        reconciling = false;
      }
    };
    const closeTitle = (): void => {
      if (
        state.title === null &&
        state.bootSplash === null &&
        !state.newGameFailure
      ) {
        return;
      }
      mutationGeneration += 1;
      publishState(
        {
          ...state,
          bootSplash: null,
          title: null,
          newGameFailure: false,
        },
      );
    };
    const resolveBuiltin = (
      rootKind: WholeCanvasManagedSurfaceRenderEntryInternalV1["rootKind"],
    ): WholeCanvasManagedSurfaceResolvedTargetInternalV1 => {
      if (rootKind === "boot_splash") {
        return ({
          accessibleNameTextId: wholeCanvasBuiltinTextIdsInternalV1.splash,
          view: { kind: "boot_splash" },
          actions: [
            wholeCanvasBuiltinActionInternalV1("whole-canvas.dismiss-splash"),
          ],
        });
      }
      if (rootKind !== "title") {
        throw new TypeError("ui.whole_canvas_surface_resolution_invalid");
      }
      const continueStatus = state.continueAvailable ? "enabled" : "disabled";
      const loadStatus = !input.customSavesConfigured || state.loadAvailable
        ? "enabled"
        : "disabled";
      return ({
        accessibleNameTextId: wholeCanvasBuiltinTextIdsInternalV1.title,
        view: {
          kind: "title",
          continueAvailable: state.continueAvailable,
          loadAvailable: state.loadAvailable,
          newGameFailure: state.newGameFailure,
        },
        actions: [
          wholeCanvasBuiltinActionInternalV1("whole-canvas.title.new-game"),
          wholeCanvasBuiltinActionInternalV1(
            "whole-canvas.title.continue",
            continueStatus,
          ),
          wholeCanvasBuiltinActionInternalV1(
            "whole-canvas.title.open-load",
            loadStatus,
          ),
          wholeCanvasBuiltinActionInternalV1(
            "whole-canvas.title.open-settings",
          ),
        ],
      });
    };
    const resolveText = (textId: string): string => {
      if (textId === wholeCanvasBuiltinTextIdsInternalV1.splash) {
        return input.titleScreen?.splash?.lines[0] ?? "";
      }
      if (textId === wholeCanvasBuiltinTextIdsInternalV1.title) {
        return input.titleScreen?.title ?? "";
      }
      if (textId === "text.whole-canvas.action-unavailable") {
        return input.labels.continue;
      }
      return storyAdapter?.resolveTextInternalV1(textId) ?? textId;
    };
    const renderBuiltin = (
      props: WholeCanvasSurfaceRendererPropsInternalV1,
    ): ReactNode => {
      const { entry } = props;
      if (entry.rootKind === "boot_splash") {
        const splash = input.titleScreen?.splash;
        if (splash === null || splash === undefined) return null;
        return createElement(BootSplashV1, {
          splash: {
            lines: splash.lines,
            ...(splash.durationMs === null ? {} : { durationMs: splash.durationMs }),
          },
          onDismiss: () => props.onAction("whole-canvas.dismiss-splash"),
        });
      }
      if (entry.rootKind !== "title" || input.titleScreen === null) return null;
      const view = entry.resolved.view as Readonly<{
        readonly continueAvailable: boolean;
        readonly loadAvailable: boolean;
        readonly newGameFailure: boolean;
      }>;
      return createElement(
        "div",
        { "data-whole-canvas-title-frame": "true" },
        createElement(TitleScreenV1, {
          title: input.titleScreen.title,
          ...(input.titleScreen.backgroundUrl === null
            ? {}
            : { backgroundUrl: input.titleScreen.backgroundUrl }),
          labels: {
            newGameLabel: input.labels.newGame,
            continueLabel: input.labels.continue,
            loadGameLabel: input.labels.load,
            settingsLabel: input.labels.settings,
          },
          onNewGame: () => props.onAction("whole-canvas.title.new-game"),
          middleAction: input.customSavesConfigured
            ? ({
              kind: "load" as const,
              available: view.loadAvailable,
              onActivate: () => props.onAction("whole-canvas.title.open-load"),
            })
            : ({
              kind: "continue" as const,
              available: view.continueAvailable,
              onActivate: () => props.onAction("whole-canvas.title.continue"),
            }),
          showLoadGame: input.savePort !== null && !input.customSavesConfigured,
          onLoadGame: () => props.onAction("whole-canvas.title.open-load"),
          onSettings: () => props.onAction("whole-canvas.title.open-settings"),
        }),
        view.newGameFailure
          ? createElement(
            "p",
            {
              role: "alert",
              "data-title-lifecycle-failure": "true",
            },
            input.labels.newGameFailed,
          )
          : null,
      );
    };
    const runNewGame = async (): Promise<void> => {
      const generation = ++mutationGeneration;
      try {
        const result = await input.lifecycle.restart();
        if (disposed || generation !== mutationGeneration) return;
        if (result.kind !== "anchored") {
          throw new TypeError("ui.lifecycle_restart_rejected");
        }
        if (
          input.titleScreen?.beginNewGame !== null &&
          input.titleScreen !== null
        ) {
          await input.titleScreen.beginNewGame();
        }
        if (disposed || generation !== mutationGeneration) return;
        closeTitle();
      } catch {
        if (disposed || generation !== mutationGeneration) return;
        publishState({ ...state, newGameFailure: true });
      }
    };
    const dispatchOwner = async (
      request: Parameters<
        NonNullable<
          WholeCanvasSurfaceHostedAdapterInternalV1<
            TSemanticPublication
          >["dispatchStoryOwnerActionInternalV1"]
        >
      >[0],
    ): Promise<void> => {
      if (request.sourceKind !== "builtin") {
        const storyDispatcher = storyAdapter?.dispatchStoryOwnerActionInternalV1;
        if (storyDispatcher === null || storyDispatcher === undefined) {
          throw new TypeError("ui.whole_canvas_surface_action_fault");
        }
        await storyDispatcher(request);
        return;
      }
      switch (request.actionId) {
        case "whole-canvas.dismiss-splash":
          publishState({ ...state, bootSplash: null });
          return;
        case "whole-canvas.title.new-game":
          await runNewGame();
          return;
        case "whole-canvas.title.continue":
          if (!state.continueAvailable || input.savePort === null) return;
          await input.savePort.load("auto.current");
          return;
        case "whole-canvas.title.open-load":
          if (input.customSavesConfigured && !state.loadAvailable) return;
          systemDialogs?.openSaves();
          return;
        case "whole-canvas.title.open-settings":
          systemDialogs?.openSettings();
          return;
        default:
          throw new TypeError("ui.whole_canvas_surface_action_fault");
      }
    };
    const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      {
        catalog: storyAdapter?.catalogInternalV1 ?? [],
        getSnapshotInternalV1: (): WholeCanvasManagedSurfaceRootDesiredInternalV1 => ({
          bootSplash: state.bootSplash,
          title: state.title,
          story: state.story,
        }),
        subscribeInternalV1(listener: () => void): () => void {
          listeners.add(listener);
          return (() => listeners.delete(listener));
        },
        resolveTargetInternalV1: (
          request: Parameters<
            NonNullable<
              WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication>
            >["resolveStoryTargetInternalV1"]
          >[0],
        ): unknown =>
          request.sourceKind === "builtin"
            ? resolveBuiltin(request.rootKind)
            : (storyAdapter?.resolveStoryTargetInternalV1(request) ?? null),
        dispatchOwnerActionInternalV1: dispatchOwner as never,
        prepareTargetInternalV1: (
          entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
        ): Promise<unknown> =>
          entry.sourceKind === "builtin"
            ? entry.rootKind === "title" && input.savePort !== null
              ? input.savePort.listSlots().then((slots) => {
                if (!disposed) {
                  publishState(
                    {
                      ...state,
                      continueAvailable: continueAvailableFromSlotsInternalV1(slots),
                      loadAvailable: loadAvailableFromSlotsInternalV1(slots),
                    },
                  );
                }
              })
              : Promise.resolve()
            : (storyAdapter?.prepareStoryTargetInternalV1(
              entry,
              state.story?.target ?? null,
            ) ?? Promise.resolve()),
        renderInternalV1: (
          props: WholeCanvasSurfaceRendererPropsInternalV1,
        ): ReactNode =>
          props.entry.sourceKind === "builtin"
            ? renderBuiltin(props)
            : (storyAdapter?.renderStoryInternalV1(
              props,
              state.story?.target ?? null,
            ) ?? null),
      },
    );
    if (storyAdapter === null) {
      bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1(
        definition,
        {
          resolveTextInternalV1: resolveText,
          applyAcceptedNavigationInternalV1: () => undefined,
        },
      );
    } else {
      storyAdapter.bindCompositionDefinitionInternalV1(definition, resolveText);
    }
    return ({
      definition,
      bindPublicationInternalV1(
        nextPublication: Parameters<
          HostedWholeCanvasBridgeInternalV1<TSemanticPublication>["bindPublicationInternalV1"]
        >[0],
      ): void {
        if (disposed || publication !== null) {
          throw new TypeError(
            "ui.whole_canvas_surface_publication_binding_invalid",
          );
        }
        publication = nextPublication;
        storyAdapter?.bindPublicationInternalV1(
          {
            getSnapshotInternalV1: () => ({
              semantic: nextPublication.getSnapshot().semantic,
              locale: environment.playerProfile.current().preferences.locale,
            }),
            subscribeInternalV1(listener: () => void): () => void {
              const releasePresentation = nextPublication.subscribe(listener);
              if (!isHostedNarrativeCallableInternalV1(releasePresentation)) {
                throw new TypeError(
                  "ui.whole_canvas_surface_subscription_invalid",
                );
              }
              let releaseProfile: unknown;
              try {
                releaseProfile = environment.playerProfile.subscribe(listener);
              } catch (error) {
                releaseHostedSubscriptionInternalV1(releasePresentation);
                throw error;
              }
              if (!isHostedNarrativeCallableInternalV1(releaseProfile)) {
                releaseHostedSubscriptionInternalV1(releasePresentation);
                throw new TypeError(
                  "ui.whole_canvas_surface_subscription_invalid",
                );
              }
              let subscribed = true;
              return (() => {
                if (!subscribed) return;
                subscribed = false;
                const profileFailure = releaseHostedSubscriptionInternalV1(releaseProfile);
                const presentationFailure = releaseHostedSubscriptionInternalV1(
                  releasePresentation,
                );
                if (profileFailure !== null) throw profileFailure;
                if (presentationFailure !== null) throw presentationFailure;
              });
            },
          },
        );
        if (storyAdapter !== null) {
          sourceUnsubscribe = storyAdapter.subscribeStoryInternalV1(refreshStory);
          refreshStory();
        }
      },
      bindSystemDialogsInternalV1(session: SystemDialogSessionV1): void {
        systemDialogs = session;
      },
      prepareSuccessorInternalV1(origin: string): void {
        if (disposed) return;
        state = {
          ...state,
          bootSplash: null,
          title: returningToTitle
            ? title
            : origin !== "load" && origin !== "import"
            ? state.title
            : null,
        };
      },
      onAnchorInstalledInternalV1(origin: string): void {
        if ((origin === "load" || origin === "import") && state.title !== null) {
          closeTitle();
        }
      },
      async returnToTitleInternalV1(): Promise<void> {
        const generation = ++mutationGeneration;
        returningToTitle = true;
        try {
          await input.lifecycle.flushAutoSave();
          if (disposed || generation !== mutationGeneration) return;
          const result = await input.lifecycle.restart();
          if (disposed || generation !== mutationGeneration) return;
          if (result.kind !== "anchored") {
            throw new TypeError("ui.lifecycle_restart_rejected");
          }
          publishState(
            {
              ...state,
              bootSplash: null,
              title,
              newGameFailure: false,
            },
          );
        } finally {
          if (generation === mutationGeneration) returningToTitle = false;
        }
      },
      commitClaimInternalV1(): void {
        if (disposed || claimCommitted) {
          throw new TypeError("ui.whole_canvas_surface_hosted_adapter_invalid");
        }
        claimCommitted = true;
      },
      rollbackInternalV1(): void {
        if (claimCommitted || disposed) return;
        disposed = true;
        mutationGeneration += 1;
        sourceUnsubscribe?.();
        sourceUnsubscribe = null;
        listeners.clear();
        storyAdapter?.rollbackClaimInternalV1();
      },
      terminalizeInternalV1(): void {
        if (disposed) return;
        disposed = true;
        mutationGeneration += 1;
        sourceUnsubscribe?.();
        sourceUnsubscribe = null;
        listeners.clear();
        if (claimCommitted) storyAdapter?.terminalizeInternalV1();
        else storyAdapter?.rollbackClaimInternalV1();
      },
    });
  } catch (error) {
    storyAdapter?.rollbackClaimInternalV1();
    throw error;
  }
}

function createStaticContentPreferencePortV1(): ContentPreferencePortV1 {
  const preference: DeepReadonly<ContentPreferenceV1> = {
    allowedFlags: parseContentMaturityFlagsV1(0),
  };
  return ({
    observe: () => preference,
    subscribe: () => () => undefined,
    set: async (): Promise<ContentPreferenceSetResultV1> => ({
      kind: "updated" as const,
      preference,
    }),
  });
}

/**
 * Composes the generic presentation runtime of an application UI: the
 * runtime presentation store (semantic projection plus instance anchor and
 * Story UI state), input router, intent router, and overlay/system dialog
 * sessions. Disposal revokes every subscription the composition created.
 */
export function createGameUiCompositionWithEpochAllocatorInternalV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
>(
  input: CreateGameUiCompositionInputV1<
    TSemanticPublication,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >,
  managedSurfaceEpochAllocator: ManagedSurfaceApplicationEpochAllocatorV1,
  managedSurfaceReportFailure?: (code: string, error: unknown) => void,
  managedSurfaceRegisterManagedInputHandler?:
    CreateManagedSurfaceCompositionRuntimeInternalInputV1["registerManagedInputHandler"],
  hostedSuccessor?: {
    readonly anchorEvents: GameUiPresentationAnchorEventSourceInternalV1;
    readonly producer: GameUiPresentationSuccessorProducerInternalV1;
  },
  narrativeDefinitionInternalV1:
    | NarrativeSurfaceDefinitionV1<TSemanticPublication>
    | null = null,
  narrativeEnvironmentInternalV1: NarrativeSurfaceCompositionEnvironmentInputInternalV1 | null =
    null,
  wholeCanvasDefinitionInternalV1:
    | WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>
    | null = null,
  wholeCanvasHostedBridgeInternalV1:
    | HostedWholeCanvasBridgeInternalV1<TSemanticPublication>
    | null = null,
): GameUiCompositionV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId
> {
  const narrativeFamily = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const wholeCanvasFamily = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
    wholeCanvasDefinitionInternalV1,
  );
  type OverlayIdV1 = GameUiOverlayIdV1<TOverlayId>;
  const anchorSource = input.anchor ?? staticAnchorSourceV1;
  const initialAnchor = hostedSuccessor?.anchorEvents.current() ?? anchorSource.current();
  const reportFailure = input.reportFailure ?? (() => undefined);
  const inputRouter = createInputRouterV1();

  // Admit the complete Overlay configuration before establishing any
  // upstream presentation subscription. A rejected composition must not
  // leave a partially constructed semantic bridge behind.
  const overlayConfiguration = createWorkspaceOverlaySessionConfigurationInternalV1<OverlayIdV1>({
    definitions: (input.overlayDefinitions ?? []) as readonly WorkspaceOverlayDefinitionV1<
      OverlayIdV1
    >[],
    ...(input.overlayPorts === undefined ? {} : { availablePorts: input.overlayPorts }),
    ...(managedSurfaceReportFailure === undefined
      ? {}
      : { reportFailure: managedSurfaceReportFailure }),
  });
  const knownOverlayIds = [...overlayConfiguration.knownOverlayIds];
  const managedSurfaceRecipe = appendWholeCanvasManagedSurfaceRecipeInternalV1(
    appendNarrativeManagedSurfaceRecipeInternalV1(
      combineManagedSurfaceRecipeInternalV1(
        overlayConfiguration.recipeContribution,
      ),
    ),
    wholeCanvasFamily,
  );
  const managedSurfaceDefinitionSidecars = [
    ...narrativeFamily.stableDefinitionSidecars,
    ...wholeCanvasFamily.stableDefinitionSidecars,
  ];
  let latestManagedSurfaceKernelBundle: ManagedSurfaceCompositeKernelBundleInternalV1 | null = null;
  const managedSurfaceRuntime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: managedSurfaceEpochAllocator,
    inputRouter,
    recipe: managedSurfaceRecipe,
    createCoordinator: (coordinatorInput) => {
      const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(
        {
          applicationEpoch: coordinatorInput.applicationEpoch,
          recipe: managedSurfaceRecipe,
          definitionSidecars: managedSurfaceDefinitionSidecars,
        },
      );
      latestManagedSurfaceKernelBundle = bundle;
      return bundle.coordinator;
    },
    ...(managedSurfaceRegisterManagedInputHandler === undefined ? {} : {
      registerManagedInputHandler: managedSurfaceRegisterManagedInputHandler,
    }),
  });
  const initialManagedSurfaceRuntime = managedSurfaceRuntime.getCurrent();
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
    runtime: initialManagedSurfaceRuntime,
    configuration: overlayConfiguration,
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);
  const managedSystemDialogInternal = createSystemDialogManagedSessionInternalV1({
    runtime: initialManagedSurfaceRuntime,
    ...(managedSurfaceReportFailure === undefined
      ? {}
      : { reportFailure: managedSurfaceReportFailure }),
  });
  const managedSystemDialogSession = createSystemDialogSessionFacadeInternalV1(
    managedSystemDialogInternal,
  );
  let disposed = false;
  let terminal = false;
  let unsubscribeAnchor = (): void => undefined;
  const ingressOpen = (): boolean => !disposed && !terminal;
  const noThrowV1 = (operation: () => void): void => {
    try {
      operation();
    } catch {
      // Terminal fencing is best effort per resource but never abandons the
      // remaining synchronous ingress fences.
    }
  };
  const uiState = createViewSourceV1<GameUiStateV1<TStoryUiState>>(
    ({
      anchor: initialAnchor,
      story: input.projector.initialUiState,
    }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
  );
  const semanticBridge = createSemanticPublicationBridgeV1<TSemanticPublication>({
    observe: () => input.semantic.observe(),
    subscribe: (
      listener: Parameters<
        GameUiSemanticSourceV1<TSemanticPublication>["subscribe"]
      >[0],
    ) =>
      input.semantic.subscribe(() => {
        if (ingressOpen()) listener();
      }),
  });
  const rawContentPreference = input.contentPreference ?? createStaticContentPreferencePortV1();
  const presentationContentPreference: ContentPreferencePortV1 = {
    observe: rawContentPreference.observe,
    subscribe: (
      listener: Parameters<ContentPreferencePortV1["subscribe"]>[0],
    ) =>
      rawContentPreference.subscribe(() => {
        if (ingressOpen()) listener();
      }),
    set: (preference: Parameters<ContentPreferencePortV1["set"]>[0]) =>
      rawContentPreference.set(preference),
  };

  const presentation = createRuntimePresentationStoreV1<
    TSemanticPublication,
    TResolvedCatalog,
    GameUiStateV1<TStoryUiState>,
    TView,
    TAssetId
  >({
    semantic: semanticBridge,
    resolvedCatalog: input.projector.resolvedCatalog,
    contentPreference: presentationContentPreference,
    uiState,
    project: (projectionInput) => input.projector.project(projectionInput),
    reportFailure,
  });

  // Narrative consumes the already-composed presentation publication. It
  // therefore shares the presentation bridge's sole upstream semantic
  // subscription instead of subscribing to the Story source independently.
  const narrativeStageClaimant = {};
  let bootstrapManagedSurfaceFailure: { readonly error: unknown } | null = null;
  let sealCompositionFromManagedSurfaceFailure = (error: unknown): void => {
    bootstrapManagedSurfaceFailure ??= { error };
    if (terminal) return;
    terminal = true;
    noThrowV1(() => presentation.dispose());
    noThrowV1(() => semanticBridge.dispose());
    noThrowV1(() => overlayInternal.sealTerminalDisposalInternalV1());
    noThrowV1(() => managedSystemDialogInternal.sealTerminalDisposalInternalV1());
    noThrowV1(() => overlayInternal.detachRuntimeInternalV1());
    noThrowV1(() => managedSystemDialogInternal.detachRuntimeInternalV1());
    noThrowV1(() => managedSurfaceRuntime.dispose());
  };
  const narrativeInternal = createNarrativeSurfaceCompositionRuntimeInternalV1({
    definition: resolveNarrativeSurfaceDefinitionInternalV1(narrativeDefinitionInternalV1),
    environment: narrativeEnvironmentInternalV1,
    presentation: {
      getSnapshotInternalV1: () =>
        presentation.getSnapshot()
          .semantic as DeepReadonly<TSemanticPublication>,
      subscribeInternalV1: (listener: () => void) => presentation.subscribe(listener),
    },
    resolveKernelBundleInternalV1: (runtime) => {
      const bundle = latestManagedSurfaceKernelBundle;
      if (
        bundle === null ||
        bundle.applicationEpoch !== runtime.applicationEpoch
      ) {
        throw new TypeError("ui.narrative_surface_composition_kernel_invalid");
      }
      return bundle;
    },
    stageClaimant: narrativeStageClaimant,
    sealCompositionOnFailure: (error: unknown) => sealCompositionFromManagedSurfaceFailure(error),
    ...(managedSurfaceReportFailure === undefined ? {} : {
      reportObservation: (code: "narrative.barrier_replay_unsupported") =>
        managedSurfaceReportFailure(code, null),
      reportFailure: (error: unknown) =>
        managedSurfaceReportFailure(
          "ui.narrative_surface_composition_failed",
          error,
        ),
    }),
  });
  const wholeCanvasInternal = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
    definition: wholeCanvasDefinitionInternalV1,
    resolveKernelBundleInternalV1: (runtime) => {
      const bundle = latestManagedSurfaceKernelBundle;
      if (
        bundle === null ||
        bundle.applicationEpoch !== runtime.applicationEpoch
      ) {
        throw new TypeError(
          "ui.whole_canvas_surface_composition_kernel_invalid",
        );
      }
      return bundle;
    },
    sealCompositionOnFailure: (error: unknown) => sealCompositionFromManagedSurfaceFailure(error),
    ...(managedSurfaceReportFailure === undefined ? {} : {
      reportActionFailure: (error: unknown) =>
        managedSurfaceReportFailure(
          "ui.whole_canvas_surface_action_fault",
          error,
        ),
      reportFailure: (error: unknown) =>
        managedSurfaceReportFailure(
          "ui.whole_canvas_surface_composition_failed",
          error,
        ),
    }),
  });
  const initialFamilyActivation = { open: false };
  const initialFamilyActivationGate = {
    isOpen: (): boolean => initialFamilyActivation.open,
  };
  try {
    narrativeInternal.prepareRuntimeAttachmentInternalV1(
      initialManagedSurfaceRuntime,
      initialFamilyActivationGate,
    );
    wholeCanvasInternal.prepareRuntimeAttachmentInternalV1(
      initialManagedSurfaceRuntime,
      initialFamilyActivationGate,
    );
    const notifyNarrativeActivation = narrativeInternal.activateRuntimeAttachmentInternalV1();
    const notifyWholeCanvasActivation = wholeCanvasInternal.activateRuntimeAttachmentInternalV1();
    initialFamilyActivation.open = true;
    notifyNarrativeActivation();
    notifyWholeCanvasActivation();
    const capturedBootstrapManagedSurfaceFailure = bootstrapManagedSurfaceFailure as {
      readonly error: unknown;
    } | null;
    if (capturedBootstrapManagedSurfaceFailure !== null) {
      throw capturedBootstrapManagedSurfaceFailure.error;
    }
  } catch (error) {
    wholeCanvasInternal.disposeInternalV1();
    narrativeInternal.disposeInternalV1();
    presentation.dispose();
    semanticBridge.dispose();
    overlayInternal.detachRuntimeInternalV1();
    managedSystemDialogInternal.detachRuntimeInternalV1();
    managedSurfaceRuntime.dispose();
    throw error;
  }

  const systemDialogSession = managedSystemDialogSession;

  // Composition-owned spatial interaction session: UI transient state that
  // never enters the Story UI state, publications, or Saves.
  const interactionState = createViewSourceV1(initialInteractionSessionStateV1);
  const rawInteractionSession = createInteractionSessionStoreV1({
    getSnapshot: () => interactionState.getCurrent(),
    subscribe: interactionState.subscribe,
    update(reducer) {
      interactionState.publish(reducer(interactionState.getCurrent()));
    },
  });
  const interactionSession: InteractionSessionStoreV1 = {
    getSnapshot: rawInteractionSession.getSnapshot,
    subscribe: rawInteractionSession.subscribe,
    open(
      surfaceId: Parameters<InteractionSessionStoreV1["open"]>[0],
      returnFocusId: Parameters<InteractionSessionStoreV1["open"]>[1],
    ): void {
      if (ingressOpen()) rawInteractionSession.open(surfaceId, returnFocusId);
    },
    openChoice(
      surfaceId: Parameters<InteractionSessionStoreV1["openChoice"]>[0],
      targetId: Parameters<InteractionSessionStoreV1["openChoice"]>[1],
      returnFocusId: Parameters<InteractionSessionStoreV1["openChoice"]>[2],
    ): void {
      if (ingressOpen()) {
        rawInteractionSession.openChoice(surfaceId, targetId, returnFocusId);
      }
    },
    leave(): string | null {
      return ingressOpen() ? rawInteractionSession.leave() : null;
    },
    cleanup(reason: Parameters<InteractionSessionStoreV1["cleanup"]>[0]): void {
      if (ingressOpen()) rawInteractionSession.cleanup(reason);
    },
  };

  // The cue registry: presentation-only. The mounted semantic stage
  // registers a controller; `presentation.play_cue` intents route to it and
  // are ignored (never queued) while no stage is mounted.
  let cueController: GameUiCueControllerV1 | null = null;
  const cues: GameUiCueRegistryV1 = {
    register(controller: GameUiCueControllerV1 | null): void {
      if (ingressOpen()) cueController = controller;
    },
    play: (cueId: string) => ingressOpen() && (cueController?.play(cueId) ?? false),
  };

  const rawIntents = createPresentationIntentRouterV1({
    knownOverlayIds,
    knownSurfaceIds: [...(input.interactionSurfaceIds ?? [])] as never,
    knownCueIds: [...(input.cueIds ?? [])],
    overlay: {
      open: (overlayId: string) => overlaySession.openPrimary(overlayId as OverlayIdV1),
    },
    session: interactionSession,
    cue: {
      play: (cueId: string) => {
        cues.play(cueId);
      },
    },
  });
  const terminalIntentResultV1 = {
    kind: "rejected" as const,
    code: "presentation.intent_unknown" as const,
  };
  const intents: PresentationIntentRouterV1 = {
    execute(
      intent: Parameters<PresentationIntentRouterV1["execute"]>[0],
      context?: Parameters<PresentationIntentRouterV1["execute"]>[1],
    ) {
      return ingressOpen() ? rawIntents.execute(intent, context) : terminalIntentResultV1;
    },
  };

  const publicInputRouter: InputRouterV1 = {
    register(registration: Parameters<InputRouterV1["register"]>[0]) {
      return ingressOpen() ? inputRouter.register(registration) : () => undefined;
    },
    route(event: Parameters<InputRouterV1["route"]>[0]) {
      return ingressOpen() ? inputRouter.route(event) : inputIgnoredV1;
    },
    clearTransientInput(): void {
      if (ingressOpen()) inputRouter.clearTransientInput();
    },
  };
  const releaseManagedInputRouterFacadeInternalV1 = bindManagedInputRouterFacadeInternalV1(
    {
      facade: publicInputRouter,
      target: inputRouter,
      isIngressOpen: ingressOpen,
    },
  );

  const anchorQueue: GameUiPresentationAnchorEventInternalV1[] = [];
  let anchorTransitionActive = false;
  const sealTerminalInternalV1 = (): void => {
    if (terminal) return;
    terminal = true;
    noThrowV1(() => wholeCanvasHostedBridgeInternalV1?.terminalizeInternalV1());
    noThrowV1(releaseManagedInputRouterFacadeInternalV1);
    anchorQueue.splice(0);
    cueController = null;
    noThrowV1(unsubscribeAnchor);
    noThrowV1(() => presentation.dispose());
    noThrowV1(() => semanticBridge.dispose());
    noThrowV1(() => overlayInternal.sealTerminalDisposalInternalV1());
    noThrowV1(() => managedSystemDialogInternal.sealTerminalDisposalInternalV1());
    noThrowV1(() => wholeCanvasInternal.disposeInternalV1());
    noThrowV1(() => narrativeInternal.disposeInternalV1());
    noThrowV1(() => overlayInternal.detachRuntimeInternalV1());
    noThrowV1(() => managedSystemDialogInternal.detachRuntimeInternalV1());
    noThrowV1(() => managedSurfaceRuntime.dispose());
  };
  sealCompositionFromManagedSurfaceFailure = (): void => sealTerminalInternalV1();

  const failSuccessorV1 = (
    event: GameUiPresentationAnchorEventInternalV1,
    error: unknown,
  ): never => {
    if (hostedSuccessor !== undefined) {
      sealTerminalInternalV1();
      noThrowV1(() =>
        hostedSuccessor.producer.failed(
          {
            anchor: event.anchor,
            token: event.token,
            error,
          },
        )
      );
    }
    throw error;
  };

  const processAnchorEventV1 = (
    event: GameUiPresentationAnchorEventInternalV1,
  ): void => {
    const { anchor } = event;
    const successorKind: ManagedSurfaceCoordinatorSuccessorKindV1 = anchor.origin === "load"
      ? "load_rebootstrap"
      : anchor.origin === "import"
      ? "import_rebootstrap"
      : "coordinator_successor";
    try {
      wholeCanvasHostedBridgeInternalV1?.prepareSuccessorInternalV1(
        anchor.origin,
      );
      // The shared authority closes every predecessor adapter, binds all four
      // families to one successor, then opens one activation gate.
      const successorRuntime = managedSurfaceRuntime.replace(successorKind, [
        overlayInternal,
        managedSystemDialogInternal,
        narrativeInternal,
        wholeCanvasInternal,
      ]);
      if (disposed || terminal) {
        if (hostedSuccessor === undefined) return;
        throw new TypeError("ui.presentation_successor_activation_failed");
      }
      uiState.publish(
        ({
          anchor,
          story: uiState.getCurrent().story,
        }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
      );
      if (hostedSuccessor === undefined) return;
      const currentRuntime = managedSurfaceRuntime.getCurrent();
      if (
        disposed ||
        terminal ||
        currentRuntime !== successorRuntime ||
        !currentRuntime.isIngressOpen() ||
        !overlayInternal.isRuntimeAttachmentCurrentInternalV1(
          successorRuntime,
        ) ||
        !managedSystemDialogInternal.isRuntimeAttachmentCurrentInternalV1(
          successorRuntime,
        ) ||
        !narrativeInternal.isCurrentRuntimeAttachmentInternalV1(
          successorRuntime,
        ) ||
        !wholeCanvasInternal.isCurrentRuntimeAttachmentInternalV1(
          successorRuntime,
        ) ||
        uiState.getCurrent().anchor !== anchor
      ) {
        throw new TypeError("ui.presentation_successor_activation_failed");
      }
      wholeCanvasHostedBridgeInternalV1?.onAnchorInstalledInternalV1(
        anchor.origin,
      );
      if (event.token !== null) {
        hostedSuccessor?.producer.installed(
          {
            anchor,
            token: event.token,
            managedSurfaceApplicationEpoch: currentRuntime.applicationEpoch,
          },
        );
      }
    } catch (error) {
      failSuccessorV1(event, error);
    }
  };

  const enqueueAnchorEventV1 = (
    event: GameUiPresentationAnchorEventInternalV1,
  ): void => {
    if (!ingressOpen()) return;
    anchorQueue.push(
      { anchor: event.anchor, token: event.token },
    );
    if (anchorTransitionActive) return;
    anchorTransitionActive = true;
    try {
      while (ingressOpen() && anchorQueue.length > 0) {
        processAnchorEventV1(anchorQueue.shift()!);
      }
    } finally {
      if (!ingressOpen()) anchorQueue.splice(0);
      anchorTransitionActive = false;
    }
  };

  const anchorView: ReadonlyViewSourceV1<GameUiPresentationAnchorV1> = {
    getCurrent: () => uiState.getCurrent().anchor,
    subscribe: (listener: () => void) => uiState.subscribe(listener),
  };

  const composition: GameUiCompositionV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  > = {
    presentation,
    anchor: anchorView,
    input: publicInputRouter,
    intents,
    cues,
    overlaySession,
    systemDialogSession,
    interactionSession,
    updateUiState: (
      updater: (
        current: DeepReadonly<TStoryUiState>,
      ) => DeepReadonly<TStoryUiState>,
    ) => {
      if (!ingressOpen()) return;
      const current = uiState.getCurrent();
      const nextStory = updater(current.story as DeepReadonly<TStoryUiState>);
      // Identity-stable story state never republishes: mirroring effects
      // (route/overlay observers) can run safely on every render without
      // feeding a projection loop.
      if (Object.is(nextStory, current.story)) return;
      uiState.publish(
        ({
          anchor: current.anchor,
          story: nextStory,
        }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
      );
    },
    isDisposed: () => disposed,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      noThrowV1(() => wholeCanvasHostedBridgeInternalV1?.terminalizeInternalV1());
      noThrowV1(releaseManagedInputRouterFacadeInternalV1);
      noThrowV1(unsubscribeAnchor);
      overlayInternal.detachRuntimeInternalV1();
      managedSystemDialogInternal.detachRuntimeInternalV1();
      narrativeInternal.detachRuntimeInternalV1();
      wholeCanvasInternal.detachRuntimeInternalV1();
      noThrowV1(() => managedSurfaceRuntime.dispose());
      overlayInternal.disposeInternalV1();
      managedSystemDialogInternal.disposeInternalV1();
      narrativeInternal.disposeInternalV1();
      wholeCanvasInternal.disposeInternalV1();
      presentation.dispose();
      semanticBridge.dispose();
    },
  };
  gameUiManagedSurfaceCompositionInternalsV1.set(
    composition,
    {
      runtime: managedSurfaceRuntime,
      narrative: narrativeInternal,
      wholeCanvas: wholeCanvasInternal,
      systemDialogSession: managedSystemDialogSession,
      returnToTitleInternalV1: () =>
        wholeCanvasHostedBridgeInternalV1?.returnToTitleInternalV1() ??
          Promise.reject(new Error("ui.whole_canvas_front_door_unavailable")),
      sealTerminalInternalV1,
      isTerminalInternalV1: () => terminal,
    },
  );
  try {
    unsubscribeAnchor = hostedSuccessor === undefined
      ? anchorSource.subscribe(() =>
        enqueueAnchorEventV1(
          { anchor: anchorSource.current(), token: null },
        )
      )
      : hostedSuccessor.anchorEvents.subscribe(enqueueAnchorEventV1);
    if (terminal) noThrowV1(unsubscribeAnchor);
  } catch (error) {
    composition.dispose();
    throw error;
  }
  return composition;
}

export function createGameUiCompositionV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
>(
  input: CreateGameUiCompositionInputV1<
    TSemanticPublication,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >,
): GameUiCompositionV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId
> {
  return createGameUiCompositionWithEpochAllocatorInternalV1(
    input,
    createLocalManagedSurfaceEpochAllocatorInternalV1(),
  );
}

/** @internal Host-only entry point; Story authors never allocate application epochs. */
export function createHostedGameUiCompositionInternalV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
>(
  input: CreateGameUiCompositionInputV1<
    TSemanticPublication,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >,
  host: {
    readonly managedSurfaceEpochAllocator: ManagedSurfaceApplicationEpochAllocatorV1;
    readonly reportFailure?: (code: string, error: unknown) => void;
    readonly anchorEvents: GameUiPresentationAnchorEventSourceInternalV1;
    readonly successorProducer: GameUiPresentationSuccessorProducerInternalV1;
  },
  hostedSurfaceInputInternalV1:
    | HostedSurfaceCompositionInputInternalV1<TSemanticPublication>
    | null = null,
): GameUiCompositionV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId
> {
  const hostedSurfaces = hostedSurfaceInputInternalV1 === null
    ? null
    : captureHostedSurfaceCompositionInputInternalV1(
      hostedSurfaceInputInternalV1,
    );
  const wholeCanvasBridge = hostedSurfaces?.wholeCanvas === null ||
      hostedSurfaces?.wholeCanvas === undefined ||
      hostedSurfaces.environment === undefined
    ? null
    : createHostedWholeCanvasBridgeInternalV1(
      hostedSurfaces.wholeCanvas,
      hostedSurfaces.environment,
    );
  let composition:
    | GameUiCompositionV1<
      TSemanticPublication,
      TStoryUiState,
      TView,
      TAssetId,
      TOverlayId
    >
    | null = null;
  try {
    composition = createGameUiCompositionWithEpochAllocatorInternalV1(
      input,
      host.managedSurfaceEpochAllocator,
      host.reportFailure,
      undefined,
      {
        anchorEvents: host.anchorEvents,
        producer: host.successorProducer,
      },
      hostedSurfaces?.narrative ?? null,
      hostedSurfaces?.environment ?? null,
      wholeCanvasBridge?.definition ?? null,
      wholeCanvasBridge,
    );
    if (wholeCanvasBridge !== null) {
      wholeCanvasBridge.bindSystemDialogsInternalV1(
        composition.systemDialogSession,
      );
      wholeCanvasBridge.bindPublicationInternalV1(
        {
          getSnapshot: () => ({
            semantic: composition!.presentation.getSnapshot()
              .semantic as DeepReadonly<TSemanticPublication>,
          }),
          subscribe: (listener: () => void) => composition!.presentation.subscribe(listener),
        },
      );
      wholeCanvasBridge.commitClaimInternalV1();
    }
    return composition;
  } catch (error) {
    wholeCanvasBridge?.rollbackInternalV1();
    composition?.dispose();
    throw error;
  }
}
