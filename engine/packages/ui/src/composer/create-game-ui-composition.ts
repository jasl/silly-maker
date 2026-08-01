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
  createLocalWorkspaceOverlayEpochAllocatorInternalV1,
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  snapshotWorkspaceOverlayDefinitionsInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import type { ManagedSurfaceApplicationEpochAllocatorV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
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
function createGameUiCompositionWithEpochAllocatorInternalV1<
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
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
    inputRouter,
    epochAllocator: managedSurfaceEpochAllocator,
    definitions: overlayDefinitions as readonly WorkspaceOverlayDefinitionV1<OverlayIdV1>[],
    ...(input.overlayPorts === undefined ? {} : { availablePorts: input.overlayPorts }),
    ...(managedSurfaceReportFailure === undefined
      ? {}
      : { reportFailure: managedSurfaceReportFailure }),
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);

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
  const unsubscribeAnchor = anchorSource.subscribe(() => {
    const anchor = anchorSource.current();
    overlayInternal.rotateEpochInternalV1(
      anchor.origin === "load"
        ? "load_rebootstrap"
        : anchor.origin === "import"
        ? "import_rebootstrap"
        : "coordinator_successor",
    );
    uiState.publish(
      Object.freeze({
        anchor,
        story: uiState.getCurrent().story,
      }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
    );
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

  let disposed = false;
  return Object.freeze({
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
      overlayInternal.disposeInternalV1();
      presentation.dispose();
      semanticBridge.dispose();
    },
  });
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
    createLocalWorkspaceOverlayEpochAllocatorInternalV1(),
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
