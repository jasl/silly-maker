// SPDX-License-Identifier: MIT
/**
 * The Story authoring prelude must stay a pure alias layer: every
 * unversioned name is identical to the current-generation versioned
 * export, so code written against the prelude and code written against
 * the versioned surface interoperate without casts.
 */
import type {
  AssetDemandPlanV1,
  AudioIntentV1,
  InteractionResolutionV1,
  NarrativeGraphV1,
  NarrativeHistoryV1,
  PendingInteractionV1,
  SemanticStageStateV1,
  StageMutationV1,
  StageRenderTargetV1,
  StageTransitionDefinitionV1,
} from "@sillymaker/base";
import {
  evaluateInteractionResolutionV1,
  lintNarrativeGraphV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";
import type {
  AssetDemandPlan,
  AudioIntent,
  CoreSemanticAdapter,
  InteractionResolution,
  NarrativeGraph,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageMutation,
  StageRenderTarget,
  StageTransitionDefinition,
} from "@sillymaker/base/story";
import {
  evaluateInteractionResolution,
  lintNarrativeGraph,
  reduceStageMutations,
} from "@sillymaker/base/story";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

export type StageStateAliased = ExpectV1<EqualV1<SemanticStageState, SemanticStageStateV1>>;
export type StageMutationAliased = ExpectV1<EqualV1<StageMutation, StageMutationV1>>;
export type StageRenderTargetAliased = ExpectV1<EqualV1<StageRenderTarget, StageRenderTargetV1>>;
export type StageTransitionAliased = ExpectV1<
  EqualV1<StageTransitionDefinition, StageTransitionDefinitionV1>
>;
export type PendingInteractionAliased = ExpectV1<EqualV1<PendingInteraction, PendingInteractionV1>>;
export type InteractionResolutionAliased = ExpectV1<
  EqualV1<InteractionResolution, InteractionResolutionV1>
>;
export type NarrativeGraphAliased = ExpectV1<EqualV1<NarrativeGraph, NarrativeGraphV1>>;
export type NarrativeHistoryAliased = ExpectV1<EqualV1<NarrativeHistory, NarrativeHistoryV1>>;
export type AudioIntentAliased = ExpectV1<EqualV1<AudioIntent, AudioIntentV1>>;
export type AssetDemandPlanAliased = ExpectV1<EqualV1<AssetDemandPlan, AssetDemandPlanV1>>;

// Value aliases are the same functions, not wrappers.
export type ReduceAliased = ExpectV1<
  EqualV1<typeof reduceStageMutations, typeof reduceStageMutationsV1>
>;
export type EvaluateAliased = ExpectV1<
  EqualV1<typeof evaluateInteractionResolution, typeof evaluateInteractionResolutionV1>
>;
export type LintAliased = ExpectV1<EqualV1<typeof lintNarrativeGraph, typeof lintNarrativeGraphV1>>;

// The adapter type parameterizes exactly like its versioned original.
declare const adapter: CoreSemanticAdapter<never, never, never, never, never, never, never, never>;
export { adapter };
