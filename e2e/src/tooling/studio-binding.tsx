// SPDX-License-Identifier: MIT
// Engine Lab's dev-only Studio binding. The Project Authoring Index discovers
// the scene document over source IO; this file supplies only the catalog,
// renderers, and content-construction metadata that a file scan cannot infer.
import type { StudioBindingV1 } from "@sillymaker/studio";

import { labStageRenderersV1 } from "../application/shell-ui.tsx";
import { labStageContentCatalogV1 } from "../presentation.ts";

const labResearcherAppearanceFieldsV1 = Object.freeze([
  Object.freeze({
    key: "pose",
    label: "姿态",
    values: Object.freeze(["standing"]),
  }),
  Object.freeze({
    key: "expression",
    label: "表情",
    values: Object.freeze(["neutral", "focused", "pleased"]),
  }),
]);

export const labStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: labStageContentCatalogV1,
  renderers: labStageRenderersV1,
  contents: Object.freeze([
    {
      contentId: "content.e2e.bg.storeroom",
      label: "储藏室",
      category: "background" as const,
      defaultLayerId: "layer.e2e.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.e2e.char.alpha",
      label: "研究员甲",
      category: "character" as const,
      defaultLayerId: "layer.e2e.characters",
      defaultZOrder: 10,
      defaultPlacement: Object.freeze({
        x: 480,
        y: 620,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      }),
      defaultAppearance: Object.freeze({ pose: "standing", expression: "neutral" }),
      appearanceFields: labResearcherAppearanceFieldsV1,
    },
    {
      contentId: "content.e2e.char.beta",
      label: "研究员乙",
      category: "character" as const,
      defaultLayerId: "layer.e2e.characters",
      defaultZOrder: 10,
      defaultPlacement: Object.freeze({
        x: 1120,
        y: 620,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: true,
      }),
      defaultAppearance: Object.freeze({ pose: "standing", expression: "neutral" }),
      appearanceFields: labResearcherAppearanceFieldsV1,
    },
  ]),
});
