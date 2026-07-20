// SPDX-License-Identifier: MIT
import type {
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  ReadonlyViewSourceV1,
} from "@sillymaker/base";
import { parseContentMaturityFlagsV1 } from "@sillymaker/base";

import type { InputRouterV1 } from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import type { PresentationIntentRouterV1 } from "../interaction/presentation-intent-router.js";
import { createPresentationIntentRouterV1 } from "../interaction/presentation-intent-router.js";
import type { OverlaySessionStoreV1 } from "../overlays/overlay-session-store.js";
import { createOverlaySessionStoreV1 } from "../overlays/overlay-session-store.js";
import { createViewSourceV1 } from "../runtime/create-view-bridge.js";
import type {
  PresentationRuntimeFailureV1,
  RuntimePresentationProjectionInputV1,
  RuntimePresentationProjectionV1,
  RuntimePresentationPublicationV1,
  RuntimePresentationStoreV1,
} from "../runtime/runtime-presentation-store.js";
import { createRuntimePresentationStoreV1 } from "../runtime/runtime-presentation-store.js";
import { createSemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.js";
import type { SystemDialogSessionStoreV1 } from "../system/system-dialog-session-store.js";
import { createSystemDialogSessionStoreV1 } from "../system/system-dialog-session-store.js";

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
  /** Story overlay IDs the intent router accepts (system overlays are added). */
  readonly overlayIds?: readonly TOverlayId[];
  reportFailure?(failure: DeepReadonly<PresentationRuntimeFailureV1>): void;
}

/** The overlay ID space of a composed UI: Story overlays plus system surfaces. */
export type GameUiOverlayIdV1<TOverlayId extends string> = TOverlayId | "system.save";

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
  readonly overlaySession: OverlaySessionStoreV1<GameUiOverlayIdV1<TOverlayId>>;
  readonly systemDialogSession: SystemDialogSessionStoreV1;
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
  type OverlayIdV1 = GameUiOverlayIdV1<TOverlayId>;
  const anchorSource = input.anchor ?? staticAnchorSourceV1;
  const reportFailure = input.reportFailure ?? (() => undefined);

  const uiState = createViewSourceV1<GameUiStateV1<TStoryUiState>>(
    Object.freeze({
      anchor: anchorSource.current(),
      story: input.projector.initialUiState,
    }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
  );
  const unsubscribeAnchor = anchorSource.subscribe(() => {
    uiState.publish(
      Object.freeze({
        anchor: anchorSource.current(),
        story: uiState.getCurrent().story,
      }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
    );
  });

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

  const overlaySession = createOverlaySessionStoreV1<OverlayIdV1>();
  const systemDialogSession = createSystemDialogSessionStoreV1();
  const inputRouter = createInputRouterV1();
  const intents = createPresentationIntentRouterV1({
    knownOverlayIds: [...(input.overlayIds ?? []), "system.save"],
    knownSurfaceIds: [],
    knownCueIds: [],
    overlay: Object.freeze({
      open: (overlayId: string) => overlaySession.openPrimary(overlayId as OverlayIdV1),
    }),
    session: Object.freeze({
      open: () => undefined,
      leave: () => undefined,
    }),
    cue: Object.freeze({ play: () => undefined }),
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
    overlaySession,
    systemDialogSession,
    updateUiState: (
      updater: (current: DeepReadonly<TStoryUiState>) => DeepReadonly<TStoryUiState>,
    ) => {
      if (disposed) return;
      const current = uiState.getCurrent();
      uiState.publish(
        Object.freeze({
          anchor: current.anchor,
          story: updater(current.story as DeepReadonly<TStoryUiState>),
        }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
      );
    },
    isDisposed: () => disposed,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribeAnchor();
      presentation.dispose();
      semanticBridge.dispose();
    },
  });
}
