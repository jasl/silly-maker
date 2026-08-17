// SPDX-License-Identifier: MIT
// The Studio binding: only what a file scan cannot discover — the content
// catalog, the real stage renderers, and the content authoring manifest
// (what the Studio Content browser offers for scene construction). Scene
// and motion documents are enumerated by the Project Authoring Index over
// the dev-server ports, so a new `*.scene.json` or `*.motion.json` needs
// no registration here. Loaded only by the dev-server studio entry
// (`sillymaker.config.ts` `studio`); never part of the player bundle or
// the application composition.
import type { StudioBindingV1 } from "@sillymaker/studio";

import { templateStageContentCatalogV1, templateTextForLocaleV1 } from "../content/presentation.ts";
import { templateFlowGraphV1 } from "../story/narrative.ts";
import { templateStageRenderersV1 } from "../ui/stage-renderers.tsx";

export const templateStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: templateStageContentCatalogV1,
  renderers: templateStageRenderersV1,
  // The compiled narrative flow projection: the Flow workspace renders it
  // read-only (S5). Derived data from the interaction document — no layout,
  // no second authority.
  flow: templateFlowGraphV1,
  // Default-locale copy for Flow displays: summaries and choice labels that
  // reference shared textIds resolve to readable text (null when unknown).
  resolveText: (textId: string): string | null => {
    try {
      return templateTextForLocaleV1(null, textId);
    } catch {
      return null;
    }
  },
  contents: Object.freeze([
    {
      contentId: "content.template.background.courtyard",
      label: "雨后的庭院",
      category: "background" as const,
      defaultLayerId: "layer.template.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.template.background.study",
      label: "书房",
      category: "background" as const,
      defaultLayerId: "layer.template.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.template.effect.mist",
      label: "雨后的薄雾",
      category: "effect" as const,
      defaultLayerId: "layer.template.background",
      defaultZOrder: 1,
    },
    {
      contentId: "content.template.character.mei",
      label: "小梅",
      category: "character" as const,
      defaultLayerId: "layer.template.characters",
      defaultZOrder: 10,
      defaultAppearance: Object.freeze({ expression: "calm" }),
      appearanceFields: Object.freeze([
        Object.freeze({
          key: "expression",
          label: "表情",
          values: Object.freeze(["calm", "smiling"]),
        }),
      ]),
    },
  ]),
});
