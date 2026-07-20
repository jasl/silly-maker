// SPDX-License-Identifier: MIT
import type { StageSceneGraphV1, TextCatalogSetV1 } from "@sillymaker/base";
import {
  definePresentationPatchSurface,
  parsePositiveSafeInteger,
  parseStageSceneGraphV1,
  parseTextCatalogSetV1,
} from "@sillymaker/base";

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

export const labPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface LabPresentationProgramV1 {
  readonly kind: "e2e-lab-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeLabPresentationV1(): LabPresentationProgramV1 {
  return Object.freeze({ kind: "e2e-lab-presentation", textCatalogs: labTextCatalogsV1 });
}
