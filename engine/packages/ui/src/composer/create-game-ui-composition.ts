// SPDX-License-Identifier: MIT
import type {
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  ReadonlyViewSourceV1,
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
  snapshotWorkspaceOverlayDefinitionsInternalV1,
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
import { createRuntimePresentationStoreV1 } from "../runtime/runtime-presentation-store.ts";
import { createSemanticPublicationBridgeV1 } from "../runtime/semantic-publication-bridge.ts";
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
  assertNarrativeSurfaceCompositionDefinitionInternalV1,
  createNarrativeSurfaceCompositionRuntimeInternalV1,
  type NarrativeSurfaceCompositionDefinitionInternalV1,
  type NarrativeSurfaceCompositionRuntimeInternalV1,
} from "../narrative/narrative-surface-composition.tsx";
import { createNarrativeManagedSurfaceFamilyContractInternalV1 } from "../narrative/narrative-managed-surface-family.ts";
import {
  createWholeCanvasSurfaceCompositionRuntimeInternalV1,
  resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1,
  type WholeCanvasSurfaceCompositionDefinitionInternalV1,
  type WholeCanvasSurfaceCompositionRuntimeInternalV1,
} from "../whole-canvas/whole-canvas-surface-composition.tsx";

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
  subscribe(listener: (event: GameUiPresentationAnchorEventInternalV1) => void): () => void;
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
    updater: (current: DeepReadonly<TStoryUiState>) => DeepReadonly<TStoryUiState>,
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

/** @internal Nullable render seam for structurally typed legacy/test compositions. */
export function resolveOptionalGameUiManagedSurfaceCompositionInternalV1(
  composition: object,
): GameUiManagedSurfaceCompositionInternalV1 | null {
  return gameUiManagedSurfaceCompositionInternalsV1.get(composition) ?? null;
}

/** @internal Narrow Host fence; it does not expose managed-family authority. */
export function sealHostedGameUiCompositionTerminalInternalV1(composition: object): void {
  resolveGameUiManagedSurfaceCompositionInternalV1(composition).sealTerminalInternalV1();
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

function appendWholeCanvasManagedSurfaceRecipeInternalV1(
  recipe: ManagedSurfaceCoordinatorRecipeV1,
  family: ReturnType<typeof resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1>,
): ManagedSurfaceCoordinatorRecipeV1 {
  return Object.freeze({
    resolvedOwnerIds: Object.freeze([
      ...recipe.resolvedOwnerIds,
      ...family.resolvedOwnerIds,
    ]),
    resolvedSlotDescriptors: Object.freeze([
      ...recipe.resolvedSlotDescriptors,
      ...family.resolvedSlotDescriptors,
    ]),
    ...(recipe.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: recipe.reportSubscriberFailure }),
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

type NarrativeSurfaceCompositionEnvironmentInputInternalV1 = Readonly<{
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly prefersReducedMotion: () => boolean;
}>;

type HostedNarrativeSurfaceCompositionInputInternalV1<TSemanticPublication> = Readonly<{
  readonly definition: NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication>;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly prefersReducedMotion: () => boolean;
}>;

const hostedNarrativeSurfaceCompositionKeysInternalV1 = Object.freeze(
  [
    "definition",
    "playerProfile",
    "presentationClock",
    "prefersReducedMotion",
  ] as const,
);

function isHostedNarrativeCallableInternalV1(
  value: unknown,
): value is (...args: never[]) => unknown {
  if (typeof value !== "function") return false;
  try {
    return Reflect.get(value, "then") === undefined;
  } catch {
    return false;
  }
}

function hasHostedNarrativeCallablesInternalV1(
  value: unknown,
  keys: readonly string[],
): boolean {
  if (typeof value !== "object" || value === null) return false;
  try {
    return Object.isFrozen(value) &&
      keys.every((key) => isHostedNarrativeCallableInternalV1(Reflect.get(value, key)));
  } catch {
    return false;
  }
}

function captureHostedNarrativeSurfaceCompositionInputInternalV1<TSemanticPublication>(
  input: HostedNarrativeSurfaceCompositionInputInternalV1<TSemanticPublication>,
): Readonly<{
  readonly definition: NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication>;
  readonly environment: NarrativeSurfaceCompositionEnvironmentInputInternalV1;
}> {
  let values: Readonly<Record<string, unknown>> | null = null;
  try {
    if (
      typeof input === "object" && input !== null && !Array.isArray(input) &&
      Reflect.getPrototypeOf(input) === Object.prototype && Object.isFrozen(input)
    ) {
      const ownKeys = Reflect.ownKeys(input);
      if (ownKeys.length === hostedNarrativeSurfaceCompositionKeysInternalV1.length) {
        const captured: Record<string, unknown> = Object.create(null);
        let exact = true;
        for (const key of hostedNarrativeSurfaceCompositionKeysInternalV1) {
          const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
          if (
            descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable ||
            descriptor.configurable || descriptor.writable
          ) {
            exact = false;
            break;
          }
          captured[key] = descriptor.value;
        }
        if (
          exact && ownKeys.every((key) => typeof key === "string" && Object.hasOwn(captured, key))
        ) values = Object.freeze(captured);
      }
    }
  } catch {
    values = null;
  }
  if (
    values === null ||
    !hasHostedNarrativeCallablesInternalV1(values.playerProfile, [
      "current",
      "subscribe",
      "markSeen",
      "markMeta",
      "updatePreferences",
    ]) ||
    !hasHostedNarrativeCallablesInternalV1(values.presentationClock, ["now", "requestTick"]) ||
    !isHostedNarrativeCallableInternalV1(values.prefersReducedMotion)
  ) {
    throw new TypeError("ui.narrative_surface_composition_environment_invalid");
  }
  assertNarrativeSurfaceCompositionDefinitionInternalV1(
    values.definition as NarrativeSurfaceCompositionDefinitionInternalV1<unknown>,
  );
  return Object.freeze({
    definition: values.definition as NarrativeSurfaceCompositionDefinitionInternalV1<
      TSemanticPublication
    >,
    environment: Object.freeze({
      playerProfile: values.playerProfile as PlayerProfileStoreV1,
      presentationClock: values.presentationClock as PresentationClockV1,
      prefersReducedMotion: values.prefersReducedMotion as () => boolean,
    }),
  });
}

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
  hostedSuccessor?: {
    readonly anchorEvents: GameUiPresentationAnchorEventSourceInternalV1;
    readonly producer: GameUiPresentationSuccessorProducerInternalV1;
  },
  narrativeDefinitionInternalV1:
    | NarrativeSurfaceCompositionDefinitionInternalV1<
      TSemanticPublication
    >
    | null = null,
  narrativeEnvironmentInternalV1: NarrativeSurfaceCompositionEnvironmentInputInternalV1 | null =
    null,
  wholeCanvasDefinitionInternalV1:
    | WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>
    | null = null,
): GameUiCompositionV1<TSemanticPublication, TStoryUiState, TView, TAssetId, TOverlayId> {
  if (narrativeDefinitionInternalV1 !== null) {
    assertNarrativeSurfaceCompositionDefinitionInternalV1(
      narrativeDefinitionInternalV1 as NarrativeSurfaceCompositionDefinitionInternalV1<unknown>,
    );
  }
  const narrativeFamily = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const wholeCanvasFamily = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
    wholeCanvasDefinitionInternalV1,
  );
  type OverlayIdV1 = GameUiOverlayIdV1<TOverlayId>;
  const anchorSource = input.anchor ?? staticAnchorSourceV1;
  const initialAnchor = hostedSuccessor?.anchorEvents.current() ?? anchorSource.current();
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
  const managedSurfaceRecipe = appendWholeCanvasManagedSurfaceRecipeInternalV1(
    appendNarrativeManagedSurfaceRecipeInternalV1(
      combineManagedSurfaceRecipeInternalV1(
        overlayConfiguration.recipeContribution,
      ),
    ),
    wholeCanvasFamily,
  );
  const managedSurfaceDefinitionSidecars = Object.freeze([
    ...narrativeFamily.stableDefinitionSidecars,
    ...wholeCanvasFamily.stableDefinitionSidecars,
  ]);
  let latestManagedSurfaceKernelBundle: ManagedSurfaceCompositeKernelBundleInternalV1 | null = null;
  const managedSurfaceRuntime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: managedSurfaceEpochAllocator,
    inputRouter,
    recipe: managedSurfaceRecipe,
    createCoordinator: (coordinatorInput) => {
      const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: coordinatorInput.applicationEpoch,
        recipe: managedSurfaceRecipe,
        definitionSidecars: managedSurfaceDefinitionSidecars,
      }));
      latestManagedSurfaceKernelBundle = bundle;
      return bundle.coordinator;
    },
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
    Object.freeze({
      anchor: initialAnchor,
      story: input.projector.initialUiState,
    }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
  );
  const semanticBridge = createSemanticPublicationBridgeV1<TSemanticPublication>({
    observe: () => input.semantic.observe(),
    subscribe: (
      listener: Parameters<GameUiSemanticSourceV1<TSemanticPublication>["subscribe"]>[0],
    ) =>
      input.semantic.subscribe(() => {
        if (ingressOpen()) listener();
      }),
  });
  const rawContentPreference = input.contentPreference ?? createStaticContentPreferencePortV1();
  const presentationContentPreference: ContentPreferencePortV1 = Object.freeze({
    observe: rawContentPreference.observe,
    subscribe: (listener: Parameters<ContentPreferencePortV1["subscribe"]>[0]) =>
      rawContentPreference.subscribe(() => {
        if (ingressOpen()) listener();
      }),
    set: (preference: Parameters<ContentPreferencePortV1["set"]>[0]) =>
      rawContentPreference.set(preference),
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
    contentPreference: presentationContentPreference,
    uiState,
    project: (projectionInput) => input.projector.project(projectionInput),
    reportFailure,
  });

  // Narrative consumes the already-composed presentation publication. It
  // therefore shares the presentation bridge's sole upstream semantic
  // subscription instead of subscribing to the Story source independently.
  const narrativeStageClaimant = Object.freeze({});
  let bootstrapManagedSurfaceFailure: { readonly error: unknown } | null = null;
  let sealCompositionFromManagedSurfaceFailure = (error: unknown): void => {
    bootstrapManagedSurfaceFailure ??= Object.freeze({ error });
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
    definition: narrativeDefinitionInternalV1,
    environment: narrativeEnvironmentInternalV1,
    presentation: Object.freeze({
      getSnapshotInternalV1: () =>
        presentation.getSnapshot().semantic as DeepReadonly<TSemanticPublication>,
      subscribeInternalV1: (listener: () => void) => presentation.subscribe(listener),
    }),
    resolveKernelBundleInternalV1: (runtime) => {
      const bundle = latestManagedSurfaceKernelBundle;
      if (bundle === null || bundle.applicationEpoch !== runtime.applicationEpoch) {
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
      if (bundle === null || bundle.applicationEpoch !== runtime.applicationEpoch) {
        throw new TypeError("ui.whole_canvas_surface_composition_kernel_invalid");
      }
      return bundle;
    },
    sealCompositionOnFailure: (error: unknown) => sealCompositionFromManagedSurfaceFailure(error),
    ...(managedSurfaceReportFailure === undefined ? {} : {
      reportFailure: (error: unknown) =>
        managedSurfaceReportFailure("ui.whole_canvas_surface_composition_failed", error),
    }),
  });
  const initialFamilyActivation = { open: false };
  const initialFamilyActivationGate = Object.freeze({
    isOpen: (): boolean => initialFamilyActivation.open,
  });
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
    const notifyWholeCanvasActivation = wholeCanvasInternal
      .activateRuntimeAttachmentInternalV1();
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
  const interactionSession: InteractionSessionStoreV1 = Object.freeze({
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
      if (ingressOpen()) rawInteractionSession.openChoice(surfaceId, targetId, returnFocusId);
    },
    leave(): string | null {
      return ingressOpen() ? rawInteractionSession.leave() : null;
    },
    cleanup(reason: Parameters<InteractionSessionStoreV1["cleanup"]>[0]): void {
      if (ingressOpen()) rawInteractionSession.cleanup(reason);
    },
  });

  // The cue registry: presentation-only. The mounted semantic stage
  // registers a controller; `presentation.play_cue` intents route to it and
  // are ignored (never queued) while no stage is mounted.
  let cueController: GameUiCueControllerV1 | null = null;
  const cues: GameUiCueRegistryV1 = Object.freeze({
    register(controller: GameUiCueControllerV1 | null): void {
      if (ingressOpen()) cueController = controller;
    },
    play: (cueId: string) => ingressOpen() && (cueController?.play(cueId) ?? false),
  });

  const rawIntents = createPresentationIntentRouterV1({
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
  const terminalIntentResultV1 = Object.freeze({
    kind: "rejected" as const,
    code: "presentation.intent_unknown" as const,
  });
  const intents: PresentationIntentRouterV1 = Object.freeze({
    execute(
      intent: Parameters<PresentationIntentRouterV1["execute"]>[0],
      context?: Parameters<PresentationIntentRouterV1["execute"]>[1],
    ) {
      return ingressOpen() ? rawIntents.execute(intent, context) : terminalIntentResultV1;
    },
  });

  const publicInputRouter: InputRouterV1 = Object.freeze({
    register(registration: Parameters<InputRouterV1["register"]>[0]) {
      return ingressOpen() ? inputRouter.register(registration) : () => undefined;
    },
    route(event: Parameters<InputRouterV1["route"]>[0]) {
      return ingressOpen() ? inputRouter.route(event) : inputIgnoredV1;
    },
    clearTransientInput(): void {
      if (ingressOpen()) inputRouter.clearTransientInput();
    },
  });
  const releaseManagedInputRouterFacadeInternalV1 = bindManagedInputRouterFacadeInternalV1(
    Object.freeze({
      facade: publicInputRouter,
      target: inputRouter,
      isIngressOpen: ingressOpen,
    }),
  );

  const anchorQueue: GameUiPresentationAnchorEventInternalV1[] = [];
  let anchorTransitionActive = false;
  const sealTerminalInternalV1 = (): void => {
    if (terminal) return;
    terminal = true;
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
        hostedSuccessor.producer.failed(Object.freeze({
          anchor: event.anchor,
          token: event.token,
          error,
        }))
      );
    }
    throw error;
  };

  const processAnchorEventV1 = (event: GameUiPresentationAnchorEventInternalV1): void => {
    const { anchor } = event;
    const successorKind: ManagedSurfaceCoordinatorSuccessorKindV1 = anchor.origin === "load"
      ? "load_rebootstrap"
      : anchor.origin === "import"
      ? "import_rebootstrap"
      : "coordinator_successor";
    try {
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
        Object.freeze({
          anchor,
          story: uiState.getCurrent().story,
        }) as DeepReadonly<GameUiStateV1<TStoryUiState>>,
      );
      if (hostedSuccessor === undefined) return;
      const currentRuntime = managedSurfaceRuntime.getCurrent();
      if (
        disposed || terminal || currentRuntime !== successorRuntime ||
        !currentRuntime.isIngressOpen() ||
        !overlayInternal.isRuntimeAttachmentCurrentInternalV1(successorRuntime) ||
        !managedSystemDialogInternal.isRuntimeAttachmentCurrentInternalV1(successorRuntime) ||
        !narrativeInternal.isCurrentRuntimeAttachmentInternalV1(successorRuntime) ||
        !wholeCanvasInternal.isCurrentRuntimeAttachmentInternalV1(successorRuntime) ||
        uiState.getCurrent().anchor !== anchor
      ) {
        throw new TypeError("ui.presentation_successor_activation_failed");
      }
      if (event.token !== null) {
        hostedSuccessor?.producer.installed(Object.freeze({
          anchor,
          token: event.token,
          managedSurfaceApplicationEpoch: currentRuntime.applicationEpoch,
        }));
      }
    } catch (error) {
      failSuccessorV1(event, error);
    }
  };

  const enqueueAnchorEventV1 = (event: GameUiPresentationAnchorEventInternalV1): void => {
    if (!ingressOpen()) return;
    anchorQueue.push(Object.freeze({ anchor: event.anchor, token: event.token }));
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
    input: publicInputRouter,
    intents,
    cues,
    overlaySession,
    systemDialogSession,
    interactionSession,
    updateUiState: (
      updater: (current: DeepReadonly<TStoryUiState>) => DeepReadonly<TStoryUiState>,
    ) => {
      if (!ingressOpen()) return;
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
  });
  gameUiManagedSurfaceCompositionInternalsV1.set(
    composition,
    Object.freeze({
      runtime: managedSurfaceRuntime,
      narrative: narrativeInternal,
      wholeCanvas: wholeCanvasInternal,
      systemDialogSession: managedSystemDialogSession,
      sealTerminalInternalV1,
      isTerminalInternalV1: () => terminal,
    }),
  );
  try {
    unsubscribeAnchor = hostedSuccessor === undefined
      ? anchorSource.subscribe(() =>
        enqueueAnchorEventV1(Object.freeze({ anchor: anchorSource.current(), token: null }))
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
    readonly anchorEvents: GameUiPresentationAnchorEventSourceInternalV1;
    readonly successorProducer: GameUiPresentationSuccessorProducerInternalV1;
  },
  narrativeInputInternalV1:
    | HostedNarrativeSurfaceCompositionInputInternalV1<TSemanticPublication>
    | null = null,
): GameUiCompositionV1<TSemanticPublication, TStoryUiState, TView, TAssetId, TOverlayId> {
  const narrative = narrativeInputInternalV1 === null
    ? null
    : captureHostedNarrativeSurfaceCompositionInputInternalV1(narrativeInputInternalV1);
  return createGameUiCompositionWithEpochAllocatorInternalV1(
    input,
    host.managedSurfaceEpochAllocator,
    host.reportFailure,
    undefined,
    Object.freeze({
      anchorEvents: host.anchorEvents,
      producer: host.successorProducer,
    }),
    narrative?.definition ?? null,
    narrative?.environment ?? null,
  );
}
