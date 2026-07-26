// SPDX-License-Identifier: MIT
import type {
  AssetId,
  StageContentCatalogV2,
  StageContentResolutionV2,
  StageSceneGraphV1,
  StageTargetChangeV2,
  StageTransitionCatalogV2,
  StageTransitionDefinitionV2,
  TextCatalogSetV1,
} from "@sillymaker/base";
import {
  definePresentationPatchSurface,
  parsePositiveSafeInteger,
  parseStageSceneGraphV1,
  parseStageTransitionDefinitionV2,
  parseTextCatalogSetV1,
} from "@sillymaker/base";

import { labStageContentIdsV1 } from "./stage-ids.js";

export function createLabStageSceneGraphV1(): StageSceneGraphV1 {
  return parseStageSceneGraphV1({
    stageScenes: [
      {
        stageSceneId: "stage_scene.e2e.lab",
        variantIds: ["stage_scene_variant.e2e.lab.default"],
        defaultVariantId: "stage_scene_variant.e2e.lab.default",
      },
    ],
    variants: [
      {
        stageSceneId: "stage_scene.e2e.lab",
        variantId: "stage_scene_variant.e2e.lab.default",
        rendererId: "renderer.e2e.lab.stage",
        accessibleNameTextId: "text.e2e.lab.stage.name",
        backgroundAssetId: "asset.e2e.lab.background",
        layout: { kind: "e2e_lab_stage" },
        actors: [],
        interactionSurfaces: [],
        content: { requiredFlags: 0 },
      },
    ],
    characters: [],
    characterRigs: [],
    hitMaps: [],
    interactionSurfaces: [],
    interactionTargets: [],
    interactionBehaviors: [],
    contentMaturityPolicy: {
      policyRevision: 1,
      flags: [],
      presets: [],
      defaultAllowedFlags: 0,
    },
  });
}

export const labTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.e2e.lab.stage.name", text: "引擎实验室" },
        { textId: "text.e2e.lab.action.collect_sample", text: "采集样本" },
        { textId: "text.e2e.lab.action.begin_procedure", text: "开始流程" },
        { textId: "text.e2e.lab.action.advance_procedure", text: "推进流程" },
        { textId: "text.e2e.lab.action.run_experiment", text: "进行实验" },
        { textId: "text.e2e.lab.hud.samples", text: "样本" },
        { textId: "text.e2e.lab.hud.steps", text: "流程进度" },
        { textId: "text.e2e.lab.overlay.journal.title", text: "实验日志" },
        { textId: "text.e2e.lab.overlay.journal.open", text: "实验日志" },
        { textId: "text.e2e.lab.narrative.completed", text: "全部流程已完成。" },
      ],
    },
  ],
});

export const labAssetSlotsV1 = Object.freeze([
  Object.freeze({
    assetId: "asset.e2e.lab.background",
    kind: "background" as const,
    usage: "scene_background" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.e2e.lab.background",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
]);

/**
 * Deterministic Story catalog resolving semantic stage content into renderer
 * bindings. Only this projection layer knows renderer IDs, asset IDs, and
 * accessible names; authoritative stage state never carries them.
 */
export const labStageContentCatalogV1: StageContentCatalogV2 = {
  resolveContent(contentId, appearance): StageContentResolutionV2 | null {
    switch (contentId as string) {
      case labStageContentIdsV1.backgroundLab:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-background",
          assetIds: Object.freeze(["asset.e2e.lab.background" as AssetId]),
          accessibleName: "引擎实验室",
          props: Object.freeze({ surface: "lab" }),
        });
      case labStageContentIdsV1.backgroundStoreroom:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-background",
          assetIds: Object.freeze([]),
          accessibleName: "储藏室",
          props: Object.freeze({ surface: "storeroom" }),
        });
      case labStageContentIdsV1.characterAlpha:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-character",
          assetIds: Object.freeze([]),
          accessibleName: "研究员甲",
          props: Object.freeze({
            pose: typeof appearance.pose === "string" ? appearance.pose : "standing",
            expression:
              typeof appearance.expression === "string" ? appearance.expression : "neutral",
          }),
        });
      case labStageContentIdsV1.characterBeta:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-character",
          assetIds: Object.freeze([]),
          accessibleName: "研究员乙",
          props: Object.freeze({
            pose: typeof appearance.pose === "string" ? appearance.pose : "standing",
            expression:
              typeof appearance.expression === "string" ? appearance.expression : "neutral",
          }),
        });
      case labStageContentIdsV1.propCrate:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-prop",
          assetIds: Object.freeze([]),
          accessibleName: "样本箱",
          props: Object.freeze({}),
        });
      default:
        return null;
    }
  },
};

const labTransitionDefinitionsV1: readonly StageTransitionDefinitionV2[] = Object.freeze(
  [
    {
      transitionId: "transition.e2e.bg-crossfade",
      kind: "crossfade",
      durationMs: 400,
      easing: "ease_in_out",
      inputPolicy: "block",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: true,
      slide: null,
    },
    {
      transitionId: "transition.e2e.char-enter",
      kind: "slide",
      durationMs: 300,
      easing: "ease_in_out",
      inputPolicy: "target_active",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: { x: 0, y: 120 },
    },
    {
      transitionId: "transition.e2e.entry-fade",
      kind: "crossfade",
      durationMs: 200,
      easing: "linear",
      inputPolicy: "skip_to_end",
      interruption: "cancel_to_target",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: null,
    },
    {
      transitionId: "transition.e2e.move",
      kind: "slide",
      durationMs: 250,
      easing: "ease_in_out",
      inputPolicy: "target_active",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: { x: 0, y: 0 },
    },
  ].map((definition, index) =>
    parseStageTransitionDefinitionV2(definition, `/transitions/${String(index)}`),
  ),
);

const labTransitionByIdV1: ReadonlyMap<string, StageTransitionDefinitionV2> = new Map(
  labTransitionDefinitionsV1.map((definition) => [definition.transitionId, definition]),
);

function requireLabTransitionV1(transitionId: string): StageTransitionDefinitionV2 {
  const definition = labTransitionByIdV1.get(transitionId);
  if (definition === undefined) throw new TypeError(`e2e.transition_missing:${transitionId}`);
  return definition;
}

/**
 * The Engine Lab transition catalog: background replaces crossfade (and
 * acknowledge on completion), characters slide in, exits fade out, moves
 * interpolate, appearance changes cut.
 */
export const labStageTransitionCatalogV1: StageTransitionCatalogV2 = {
  resolveTransition(change: StageTargetChangeV2): StageTransitionDefinitionV2 | null {
    if (change.kind === "replace") return requireLabTransitionV1("transition.e2e.bg-crossfade");
    if (change.kind === "enter") {
      return change.layerId === "layer.e2e.characters"
        ? requireLabTransitionV1("transition.e2e.char-enter")
        : requireLabTransitionV1("transition.e2e.entry-fade");
    }
    if (change.kind === "exit") return requireLabTransitionV1("transition.e2e.entry-fade");
    if (change.kind === "move") return requireLabTransitionV1("transition.e2e.move");
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinitionV2 | null {
    return labTransitionByIdV1.get(transitionId) ?? null;
  },
};

export const labPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface LabPresentationProgramV1 {
  readonly kind: "e2e-lab-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeLabPresentationV1(): LabPresentationProgramV1 {
  return Object.freeze({ kind: "e2e-lab-presentation", textCatalogs: labTextCatalogsV1 });
}
