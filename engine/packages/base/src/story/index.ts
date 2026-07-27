// SPDX-License-Identifier: MIT
/**
 * The Story authoring prelude: the current generation of every commonly
 * authored contract under unversioned names, so Story code (and the agents
 * writing it) can say `SemanticStageState` instead of tracking which
 * family is on V1 and which is on V2.
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
} from "../index.js";
export { createGameAuthoringKitV1 as createGameAuthoringKit } from "../index.js";
export type {
  GamePackageV1 as GamePackage,
  GameSimulationV1 as GameSimulation,
  GameSimulationTypeMapV1 as GameSimulationTypeMap,
  StateContractManifestV1 as StateContractManifest,
} from "../index.js";

// ---------------------------------------------------------------------------
// Semantic stage (current generation: V2).
// ---------------------------------------------------------------------------
export {
  createSemanticStageStateV2 as createSemanticStageState,
  parseSemanticStageStateV2 as parseSemanticStageState,
  parseStageMutationV2 as parseStageMutation,
  reduceStageMutationsV2 as reduceStageMutations,
  projectStageRenderTargetV2 as projectStageRenderTarget,
  parseStageTransitionDefinitionV2 as parseStageTransitionDefinition,
} from "../index.js";
export type {
  SemanticStageStateV2 as SemanticStageState,
  StageLayerV2 as StageLayer,
  StageEntryV2 as StageEntry,
  StagePlacementV2 as StagePlacement,
  StageAppearanceV2 as StageAppearance,
  StageCameraV2 as StageCamera,
  StageMutationV2 as StageMutation,
  StageMutationBatchOutcomeV2 as StageMutationBatchOutcome,
  StageContentCatalogV2 as StageContentCatalog,
  StageContentResolutionV2 as StageContentResolution,
  StageRenderTargetV2 as StageRenderTarget,
  StageTransitionDefinitionV2 as StageTransitionDefinition,
  StageTransitionCatalogV2 as StageTransitionCatalog,
  StageTargetChangeV2 as StageTargetChange,
} from "../index.js";

// ---------------------------------------------------------------------------
// Pending interactions (current generation: V2).
// ---------------------------------------------------------------------------
export {
  evaluateInteractionResolutionV2 as evaluateInteractionResolution,
  interactionOccurrenceIdV2 as interactionOccurrenceId,
  parseInteractionOccurrenceIdV2 as parseInteractionOccurrenceId,
  parseInteractionResolutionV2 as parseInteractionResolution,
  parsePendingInteractionV2 as parsePendingInteraction,
} from "../index.js";
export type {
  PendingInteractionV2 as PendingInteraction,
  InteractionResolutionV2 as InteractionResolution,
  InteractionResolutionContextV2 as InteractionResolutionContext,
  InteractionResolutionOutcomeV2 as InteractionResolutionOutcome,
  InteractionRejectionCodeV2 as InteractionRejectionCode,
} from "../index.js";

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
} from "../index.js";
export type {
  NarrativeHistoryV1 as NarrativeHistory,
  NarrativeHistoryEntryV1 as NarrativeHistoryEntry,
  NarrativeGraphV1 as NarrativeGraph,
  NarrativeGraphNodeV1 as NarrativeGraphNode,
  NarrativeGraphBuilderV1 as NarrativeGraphBuilder,
  NarrativePredictionV1 as NarrativePrediction,
  NarrativePredictionBudgetV1 as NarrativePredictionBudget,
} from "../index.js";

// ---------------------------------------------------------------------------
// Audio intent and asset demand (current: V1).
// ---------------------------------------------------------------------------
export {
  parseAudioIntentV1 as parseAudioIntent,
  resolveAudioManifestV1 as resolveAudioManifest,
  createAssetDemandPlanV1 as createAssetDemandPlan,
} from "../index.js";
export type {
  AudioIntentV1 as AudioIntent,
  ResolvedAudioManifestV1 as ResolvedAudioManifest,
  AssetDemandPlanV1 as AssetDemandPlan,
  TransientEffectV1 as TransientEffect,
  TransientEffectRequestV1 as TransientEffectRequest,
} from "../index.js";

// ---------------------------------------------------------------------------
// Application composition (current: V1).
// ---------------------------------------------------------------------------
export { defineCoreGameApplicationV1 as defineCoreGameApplication } from "../runtime/index.js";
export type {
  CoreSemanticAdapterV1 as CoreSemanticAdapter,
  CoreGameApplicationDefinitionV1 as CoreGameApplicationDefinition,
  CoreGameApplicationInstanceV1 as CoreGameApplicationInstance,
} from "../runtime/index.js";
