// SPDX-License-Identifier: MIT
import type {
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  ReadonlyViewSourceV1,
} from "@sillymaker/base";
import { parseContentMaturityFlagsV1 } from "@sillymaker/base";

import type { InputRouterV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
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
  snapshotWorkspaceOverlayDefinitionsInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
  type CreateManagedSurfaceCompositionRuntimeInternalInputV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
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
import { createRuntimePresentationStoreV1 } from "../runtime/runtime-presentation-store.ts";
import { createSemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.ts";
import type { SystemDialogSessionStoreV1 } from "../system/system-dialog-session-store.ts";
import { createSystemDialogSessionStoreV1 } from "../system/system-dialog-session-store.ts";
import {
  systemDialogManagedContractInternalV1,
  type SystemDialogSessionV1,
} from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
} from "../system/system-dialog-managed-session.ts";

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
  readonly systemDialogSession: SystemDialogSessionStoreV1;
  /** The composition-owned spatial interaction session (UI transient). */
  readonly interactionSession: InteractionSessionStoreV1;
  updateUiState(
    updater: (current: DeepReadonly<TStoryUiState>) => DeepReadonly<TStoryUiState>,
  ): void;
  isDisposed(): boolean;
  dispose(): void;
}

/** @internal Dormant S3b state; deliberately absent from package barrels and the public composition. */
export interface GameUiManagedSurfaceCompositionInternalV1 {
  readonly runtime: ManagedSurfaceCompositionRuntimeInternalV1;
  readonly systemDialogSession: SystemDialogSessionV1;
}

const gameUiManagedSurfaceCompositionInternalsV1 = new WeakMap<
  object,
  GameUiManagedSurfaceCompositionInternalV1
>();

/** @internal Relative-source composition/test seam for the dormant managed System family. */
export function resolveGameUiManagedSurfaceCompositionInternalV1(
  composition: object,
): GameUiManagedSurfaceCompositionInternalV1 {
  const internal = gameUiManagedSurfaceCompositionInternalsV1.get(composition);
  if (internal === undefined) {
    throw new TypeError("ui.game_ui_managed_surface_composition_required");
  }
  return internal;
}

function combineManagedSurfaceRecipeInternalV1(
  overlay: ManagedSurfaceCoordinatorRecipeV1,
): ManagedSurfaceCoordinatorRecipeV1 {
  return Object.freeze({
    resolvedOwnerIds: Object.freeze([
      ...overlay.resolvedOwnerIds,
      ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
    ]),
    resolvedSlotDescriptors: Object.freeze([
      ...overlay.resolvedSlotDescriptors,
      ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    ]),
    ...(overlay.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: overlay.reportSubscriberFailure }),
  });
}

const bootstrapAnchorV1: GameUiPresentationAnchorV1 = Object.freeze({
  epoch: 0,
  origin: "bootstrap",
});

const staticAnchorSourceV1: GameUiAnchorSourceV1 = Object.freeze({
  current: () => bootstrapAnchorV1,
  subscribe: () => () => undefined,
});

function createStaticContentPreferencePortV1(): ContentPreferencePortV1 {
  const preference: DeepReadonly<ContentPreferenceV1> = Object.freeze({
    allowedFlags: parseContentMaturityFlagsV1(0),
  });
  return Object.freeze({
    observe: () => preference,
    subscribe: () => () => undefined,
    set: async (): Promise<ContentPreferenceSetResultV1> =>
      Object.freeze({ kind: "updated" as const, preference }),
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
  managedSurfaceRegisterManagedInputHandler?: CreateManagedSurfaceCompositionRuntimeInternalInputV1[
    "registerManagedInputHandler"
  ],
): GameUiCompositionV1<TSemanticPublication, TStoryUiState, TView, TAssetId, TOverlayId> {
  type OverlayIdV1 = GameUiOverlayIdV1<TOverlayId>;
  const anchorSource = input.anchor ?? staticAnchorSourceV1;
  const reportFailure = input.reportFailure ?? (() => undefined);
  const overlayDefinitions = snapshotWorkspaceOverlayDefinitionsInternalV1(
    input.overlayDefinitions ?? [],
  );
  const knownOverlayIds: OverlayIdV1[] = [];
  for (const definition of overlayDefinitions) knownOverlayIds.push(definition.id);
  const inputRouter = createInputRouterV1();

  // Admit the complete Overlay configuration before establishing any
  // upstream presentation subscription. A rejected composition must not
  // leave a partially constructed semantic bridge behind.
  const overlayConfiguration = createWorkspaceOverlaySessionConfigurationInternalV1<OverlayIdV1>({
    definitions: overlayDefinitions as readonly WorkspaceOverlayDefinitionV1<OverlayIdV1>[],
    ...(input.overlayPorts === undefined ? {} : { availablePorts: input.overlayPorts }),
    ...(managedSurfaceReportFailure === undefined
      ? {}
      : { reportFailure: managedSurfaceReportFailure }),
  });
  const managedSurfaceRuntime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: managedSurfaceEpochAllocator,
    inputRouter,
    recipe: combineManagedSurfaceRecipeInternalV1(
      overlayConfiguration.recipeContribution,
    ),
    ...(managedSurfaceRegisterManagedInputHandler === undefined
      ? {}
      : { registerManagedInputHandler: managedSurfaceRegisterManagedInputHandler }),
  });
  const initialManagedSurfaceRuntime = managedSurfaceRuntime.getCurrent();
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
    runtime: initialManagedSurfaceRuntime,
    configuration: overlayConfiguration,
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);
  const managedSystemDialogInternal = createSystemDialogManagedSessionInternalV1({
    runtime: initialManagedSurfaceRuntime,
    catalog: null,
  });
  const managedSystemDialogSession = createSystemDialogSessionFacadeInternalV1(
    managedSystemDialogInternal,
  );

  const uiState = createViewSourceV1<GameUiStateV1<TStoryUiState>>(
    Object.freeze({
      anchor: anchorSource.current(),
      story: input.projector.initialUiState,
    }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
  );
  const semanticBridge = createSemanticPublicationBridgeV1<TSemanticPublication>({
    observe: () => input.semantic.observe(),
    subscribe: (listener) => input.semantic.subscribe(listener),
  });

  const presentation = createRuntimePresentationStoreV1<
    TSemanticPublication,
    TResolvedCatalog,
    GameUiStateV1<TStoryUiState>,
    TView,
    TAssetId
  >({
    semantic: semanticBridge,
    resolvedCatalog: input.projector.resolvedCatalog,
    contentPreference: input.contentPreference ?? createStaticContentPreferencePortV1(),
    uiState,
    project: (projectionInput) => input.projector.project(projectionInput),
    reportFailure,
  });

  const systemDialogSession = createSystemDialogSessionStoreV1();
  let disposed = false;
  let anchorTransitionActive = false;
  let anchorTransitionPending = false;
  const unsubscribeAnchor = anchorSource.subscribe(() => {
    if (disposed) return;
    anchorTransitionPending = true;
    if (anchorTransitionActive) return;
    anchorTransitionActive = true;
    try {
      while (anchorTransitionPending) {
        if (disposed) {
          anchorTransitionPending = false;
          break;
        }
        anchorTransitionPending = false;
        const anchor = anchorSource.current();
        const successorKind: ManagedSurfaceCoordinatorSuccessorKindV1 = anchor.origin === "load"
          ? "load_rebootstrap"
          : anchor.origin === "import"
          ? "import_rebootstrap"
          : "coordinator_successor";
        // The shared authority closes both predecessor adapters, binds both to one
        // successor, activates both, and only then flushes family notifications.
        managedSurfaceRuntime.replace(successorKind, [
          overlayInternal,
          managedSystemDialogInternal,
        ]);
        if (disposed) {
          anchorTransitionPending = false;
          break;
        }
        uiState.publish(
          Object.freeze({
            anchor,
            story: uiState.getCurrent().story,
          }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
        );
      }
    } finally {
      if (disposed) anchorTransitionPending = false;
      anchorTransitionActive = false;
    }
  });

  // Composition-owned spatial interaction session: UI transient state that
  // never enters the Story UI state, publications, or Saves.
  const interactionState = createViewSourceV1(initialInteractionSessionStateV1);
  const interactionSession = createInteractionSessionStoreV1({
    getSnapshot: () => interactionState.getCurrent(),
    subscribe: interactionState.subscribe,
    update(reducer) {
      interactionState.publish(reducer(interactionState.getCurrent()));
    },
  });

  // The cue registry: presentation-only. The mounted semantic stage
  // registers a controller; `presentation.play_cue` intents route to it and
  // are ignored (never queued) while no stage is mounted.
  let cueController: GameUiCueControllerV1 | null = null;
  const cues: GameUiCueRegistryV1 = Object.freeze({
    register(controller: GameUiCueControllerV1 | null): void {
      cueController = controller;
    },
    play: (cueId: string) => cueController?.play(cueId) ?? false,
  });

  const intents = createPresentationIntentRouterV1({
    knownOverlayIds,
    knownSurfaceIds: [...(input.interactionSurfaceIds ?? [])] as never,
    knownCueIds: [...(input.cueIds ?? [])],
    overlay: Object.freeze({
      open: (overlayId: string) => overlaySession.openPrimary(overlayId as OverlayIdV1),
    }),
    session: interactionSession,
    cue: Object.freeze({
      play: (cueId: string) => {
        cues.play(cueId);
      },
    }),
  });

  const anchorView: ReadonlyViewSourceV1<GameUiPresentationAnchorV1> = Object.freeze({
    getCurrent: () => uiState.getCurrent().anchor,
    subscribe: (listener: () => void) => uiState.subscribe(listener),
  });

  const composition: GameUiCompositionV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  > = Object.freeze({
    presentation,
    anchor: anchorView,
    input: inputRouter,
    intents,
    cues,
    overlaySession,
    systemDialogSession,
    interactionSession,
    updateUiState: (
      updater: (current: DeepReadonly<TStoryUiState>) => DeepReadonly<TStoryUiState>,
    ) => {
      if (disposed) return;
      const current = uiState.getCurrent();
      const nextStory = updater(current.story as DeepReadonly<TStoryUiState>);
      // Identity-stable story state never republishes: mirroring effects
      // (route/overlay observers) can run safely on every render without
      // feeding a projection loop.
      if (Object.is(nextStory, current.story)) return;
      uiState.publish(
        Object.freeze({
          anchor: current.anchor,
          story: nextStory,
        }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
      );
    },
    isDisposed: () => disposed,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribeAnchor();
      overlayInternal.detachRuntimeInternalV1();
      managedSystemDialogInternal.detachRuntimeInternalV1();
      managedSurfaceRuntime.dispose();
      overlayInternal.disposeInternalV1();
      managedSystemDialogInternal.disposeInternalV1();
      presentation.dispose();
      semanticBridge.dispose();
    },
  });
  gameUiManagedSurfaceCompositionInternalsV1.set(
    composition,
    Object.freeze({
      runtime: managedSurfaceRuntime,
      systemDialogSession: managedSystemDialogSession,
    }),
  );
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
): GameUiCompositionV1<TSemanticPublication, TStoryUiState, TView, TAssetId, TOverlayId> {
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
  },
): GameUiCompositionV1<TSemanticPublication, TStoryUiState, TView, TAssetId, TOverlayId> {
  return createGameUiCompositionWithEpochAllocatorInternalV1(
    input,
    host.managedSurfaceEpochAllocator,
    host.reportFailure,
  );
}
