// SPDX-License-Identifier: MIT
/**
 * The Story authoring prelude: the current generation of every commonly
 * authored contract under unversioned names, so Story code (and the agents
 * writing it) can say `SemanticStageState` instead of tracking which
 * family is on V1 and which is on V1.
 *
 * Rules of this module:
 * - It only aliases; every symbol remains exported under its versioned
 *   name from `@sillymaker/base` and its subpaths, and versioned names
 *   stay the source of truth in engine code and engine tests.
 * - When a family gains a new generation, this prelude moves to it in the
 *   same change, and the release notes call out the behavioral break.
 * - Engine internals must not import this module; it exists for Stories.
 */

// ---------------------------------------------------------------------------
// Story packaging and simulation authoring.
// ---------------------------------------------------------------------------
export {
  defineGamePackage,
  defineGameSimulation,
  resolveGamePackageV1 as resolveGamePackage,
} from "../index.ts";
export { createGameAuthoringKitV1 as createGameAuthoringKit } from "../index.ts";
export type {
  GamePackageV1 as GamePackage,
  GameSimulationV1 as GameSimulation,
  GameSimulationTypeMapV1 as GameSimulationTypeMap,
  StateContractManifestV1 as StateContractManifest,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Semantic stage (current generation: V1).
// ---------------------------------------------------------------------------
export {
  createSemanticStageStateV1 as createSemanticStageState,
  parseSemanticStageStateV1 as parseSemanticStageState,
  parseStageMutationV1 as parseStageMutation,
  reduceStageMutationsV1 as reduceStageMutations,
  projectStageRenderTargetV1 as projectStageRenderTarget,
  parseStageTransitionDefinitionV1 as parseStageTransitionDefinition,
} from "../index.ts";
export type {
  SemanticStageStateV1 as SemanticStageState,
  StageLayerV1 as StageLayer,
  StageEntryV1 as StageEntry,
  StagePlacementV1 as StagePlacement,
  StageAppearanceV1 as StageAppearance,
  StageCameraV1 as StageCamera,
  StageMutationV1 as StageMutation,
  StageMutationBatchOutcomeV1 as StageMutationBatchOutcome,
  StageContentCatalogV1 as StageContentCatalog,
  StageContentResolutionV1 as StageContentResolution,
  StageRenderTargetV1 as StageRenderTarget,
  StageTransitionDefinitionV1 as StageTransitionDefinition,
  StageTransitionCatalogV1 as StageTransitionCatalog,
  StageTargetChangeV1 as StageTargetChange,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Pending interactions (current generation: V1).
// ---------------------------------------------------------------------------
export {
  evaluateInteractionResolutionV1 as evaluateInteractionResolution,
  interactionOccurrenceIdV1 as interactionOccurrenceId,
  parseInteractionOccurrenceIdV1 as parseInteractionOccurrenceId,
  parseInteractionResolutionV1 as parseInteractionResolution,
  parsePendingInteractionV1 as parsePendingInteraction,
} from "../index.ts";
export type {
  PendingInteractionV1 as PendingInteraction,
  InteractionResolutionV1 as InteractionResolution,
  InteractionResolutionContextV1 as InteractionResolutionContext,
  InteractionResolutionOutcomeV1 as InteractionResolutionOutcome,
  InteractionRejectionCodeV1 as InteractionRejectionCode,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Narrative history, graph lint, and bounded prediction (current: V1).
// ---------------------------------------------------------------------------
export {
  appendNarrativeHistoryV1 as appendNarrativeHistory,
  emptyNarrativeHistoryV1 as emptyNarrativeHistory,
  parseNarrativeHistoryV1 as parseNarrativeHistory,
  createNarrativeGraphBuilderV1 as createNarrativeGraphBuilder,
  lintNarrativeGraphV1 as lintNarrativeGraph,
  parseNarrativeGraphV1 as parseNarrativeGraph,
  predictNarrativeDependenciesV1 as predictNarrativeDependencies,
  narrativePredictionToDemandPlanV1 as narrativePredictionToDemandPlan,
} from "../index.ts";
export type {
  NarrativeHistoryV1 as NarrativeHistory,
  NarrativeHistoryEntryV1 as NarrativeHistoryEntry,
  NarrativeGraphV1 as NarrativeGraph,
  NarrativeGraphNodeV1 as NarrativeGraphNode,
  NarrativeGraphBuilderV1 as NarrativeGraphBuilder,
  NarrativePredictionV1 as NarrativePrediction,
  NarrativePredictionBudgetV1 as NarrativePredictionBudget,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Audio intent and asset demand (current: V1).
// ---------------------------------------------------------------------------
export {
  parseAudioIntentV1 as parseAudioIntent,
  resolveAudioManifestV1 as resolveAudioManifest,
  createAssetDemandPlanV1 as createAssetDemandPlan,
} from "../index.ts";
export type {
  AudioIntentV1 as AudioIntent,
  ResolvedAudioManifestV1 as ResolvedAudioManifest,
  AssetDemandPlanV1 as AssetDemandPlan,
  TransientEffectV1 as TransientEffect,
  TransientEffectRequestV1 as TransientEffectRequest,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Content database (current: V1).
// ---------------------------------------------------------------------------
export {
  createContentDatabaseV1 as createContentDatabase,
  defineContentTableV1 as defineContentTable,
} from "../index.ts";
export type {
  ContentDatabaseV1 as ContentDatabase,
  ContentQueryV1 as ContentQuery,
  ContentTableDefinitionV1 as ContentTableDefinition,
  ContentTableViewV1 as ContentTableView,
  ContentWhereV1 as ContentWhere,
} from "../index.ts";

// ---------------------------------------------------------------------------
// Application composition (current: V1).
// ---------------------------------------------------------------------------
export { defineCoreGameApplicationV1 as defineCoreGameApplication } from "../runtime/index.ts";
export type {
  CoreSemanticAdapterV1 as CoreSemanticAdapter,
  CoreGameApplicationDefinitionV1 as CoreGameApplicationDefinition,
  CoreGameApplicationInstanceV1 as CoreGameApplicationInstance,
} from "../runtime/index.ts";
