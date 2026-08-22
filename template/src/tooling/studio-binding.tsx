// SPDX-License-Identifier: MIT
// The Studio binding: only what a file scan cannot discover — the content
// catalog, the real stage renderers, and the content authoring manifest
// (what the Studio Content browser offers for scene construction). Scene
// and motion documents are enumerated by the Project Authoring Index over
// the dev-server ports, so a new `*.scene.json` or `*.motion.json` needs
// no registration here. Loaded only by the dev-server studio entry
// (`sillymaker.config.ts` `studio`); never part of the player bundle or
// the application composition.
import type { DeepReadonly } from "@sillymaker/base";
import type { ChromeLayoutDocument } from "@sillymaker/base/story";
import type { StudioBindingV1, StudioChromeFixtureV1 } from "@sillymaker/studio";

import { TemplateHudV1 } from "../application/ui.tsx";
import type { TemplateUiPublicationV1 } from "../application/composition.tsx";
import type { TemplateApplicationInstanceV1 } from "../application/core-definition.ts";
import { templateStageContentCatalogV1, templateTextForLocaleV1 } from "../content/presentation.ts";
import { templateFlowGraphV1 } from "../story/narrative.ts";
import { templateStageRenderersV1 } from "../ui/stage-renderers.tsx";

/**
 * The chrome fixture's frozen sample: exactly the publication fields the
 * HUD reads (coins, narrative phase, action list), representative values.
 * The Studio preview is presentation-only — pointer events are disabled
 * — so the semantic stub can never actually dispatch.
 */
const templateHudFixturePublicationV1 = Object.freeze({
  view: Object.freeze({ coins: 3 }),
  semantic: Object.freeze({
    narrative: Object.freeze({ phase: "running" }),
    actions: Object.freeze([
      Object.freeze({ actionId: "template.begin_story", enabled: false }),
      Object.freeze({ actionId: "template.earn_coin", enabled: true }),
    ]),
  }),
}) as unknown as DeepReadonly<TemplateUiPublicationV1>;

const templateHudFixtureSemanticV1 = Object.freeze({
  dispatch: () => Promise.reject(new Error("template.studio_fixture_semantic_stub")),
}) as unknown as TemplateApplicationInstanceV1["semantic"];

// Chrome workspace preview: the real HUD component over the frozen sample
// above, geometry read from the workspace's live draft (q3 — the Story
// declares what renders; the engine never guesses a publication shape).
const templateHudChromeFixtureV1: StudioChromeFixtureV1 = Object.freeze({
  layoutId: "layout.template.hud",
  label: "模板 HUD",
  render: (layout: ChromeLayoutDocument) => (
    <TemplateHudV1
      publication={templateHudFixturePublicationV1}
      semantic={templateHudFixtureSemanticV1}
      layout={layout}
    />
  ),
});

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
  chrome: Object.freeze([templateHudChromeFixtureV1]),
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
