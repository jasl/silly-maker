// SPDX-License-Identifier: MIT
import type { AssetId, TextCatalogSetV1 } from "@sillymaker/base";
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";
import type {
  StageContentCatalog,
  StageContentResolution,
  StageTargetChange,
  StageTransitionCatalog,
  StageTransitionDefinition,
} from "@sillymaker/base/story";
import { parseStageTransitionDefinition } from "@sillymaker/base/story";

import { templateContentIdsV1, templateScriptTextEntriesV1 } from "../story/narrative.ts";
import { templateOpeningTransitionBindingsV1 } from "../scenes/opening/index.ts";

/**
 * UI copy lives here, keyed by textId; the script's dialogue entries come
 * inline from `narrative.ts` (builder-derived textIds) and merge below.
 * Other locales override any entry by the same textId.
 */
export const templateTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.template.app.name", text: "新故事" },
        { textId: "text.template.stage.name", text: "庭院" },
        { textId: "text.template.hud.coins", text: "硬币" },
        { textId: "text.template.action.begin", text: "开始故事" },
        { textId: "text.template.action.earn", text: "捡起硬币" },
        { textId: "text.template.narrative.advance", text: "继续" },
        { textId: "text.template.playback.auto", text: "自动" },
        { textId: "text.template.playback.skip", text: "快进" },
        { textId: "text.template.playback.history", text: "历史" },
        { textId: "text.template.playback.history.title", text: "对话历史" },
        { textId: "text.template.playback.history.empty", text: "还没有对话。" },
        { textId: "text.template.playback.history.close", text: "关闭历史" },
        { textId: "text.template.narrative.completed", text: "（本段落已结束）" },
        { textId: "text.template.choice.insufficient-coins", text: "硬币不足" },
        ...templateScriptTextEntriesV1,
      ],
    },
  ],
});

const templateTextByLocaleV1: ReadonlyMap<
  string,
  { readonly texts: ReadonlyMap<string, string>; readonly fallbackLocale: string | null }
> = new Map(
  templateTextCatalogsV1.catalogs.map((catalog) => [
    catalog.locale,
    Object.freeze({
      texts: new Map(catalog.entries.map((entry) => [entry.textId, entry.text])),
      fallbackLocale: catalog.fallbackLocale,
    }),
  ]),
);

/** Locale-aware Story text with a deterministic fallback to the default catalog. */
export function templateTextForLocaleV1(locale: string | null, textId: string): string {
  const visited: string[] = [];
  let cursor: string | null = locale ?? templateTextCatalogsV1.defaultLocale;
  while (cursor !== null && !visited.includes(cursor)) {
    visited.push(cursor);
    const catalog = templateTextByLocaleV1.get(cursor);
    const text = catalog?.texts.get(textId);
    if (text !== undefined) return text;
    cursor = catalog?.fallbackLocale ?? null;
  }
  const fallback = templateTextByLocaleV1.get(templateTextCatalogsV1.defaultLocale);
  const text = fallback?.texts.get(textId);
  if (text === undefined) throw new TypeError(`template.text_missing:${textId}`);
  return text;
}

/**
 * The stage content catalog: the only place that knows renderer IDs and
 * accessible names for stage content. Authoritative stage state stores
 * contentIds only.
 */
export const templateStageContentCatalogV1: StageContentCatalog = {
  resolveContent(contentId, appearance): StageContentResolution | null {
    switch (contentId as string) {
      case templateContentIdsV1.backgroundCourtyard:
        return Object.freeze({
          rendererId: "renderer.template.background",
          assetIds: Object.freeze([]),
          accessibleName: "雨后的庭院",
          props: Object.freeze({ surface: "courtyard" }),
        });
      case templateContentIdsV1.backgroundStudy:
        return Object.freeze({
          rendererId: "renderer.template.background",
          assetIds: Object.freeze([]),
          accessibleName: "书房",
          props: Object.freeze({ surface: "study" }),
        });
      case templateContentIdsV1.effectMist:
        return Object.freeze({
          rendererId: "renderer.template.mist",
          assetIds: Object.freeze([]),
          accessibleName: "雨后的薄雾",
          props: Object.freeze({}),
          // One texture period is 320px; the band is canvas width + two
          // periods so the sawtooth drift never exposes an edge.
          geometry: Object.freeze({
            width: 2240,
            height: 200,
            anchorXPermille: 0,
            anchorYPermille: 0,
          }),
        });
      case templateContentIdsV1.characterMei:
        return Object.freeze({
          rendererId: "renderer.template.character",
          assetIds: Object.freeze([]),
          accessibleName: "小梅",
          props: Object.freeze({
            expression: typeof appearance.expression === "string" ? appearance.expression : "calm",
          }),
          // The engine stage host anchors the content box at bottom center;
          // the renderer draws into it without its own translate.
          geometry: Object.freeze({
            width: 220,
            height: 420,
            anchorXPermille: 500,
            anchorYPermille: 1000,
          }),
          // The ordered frame set the blink ambient's `frame` track indexes
          // (0 = eyes open, the default pose; 1 = eyes closed). A real game
          // points these at image assets; the placeholder renderer draws
          // the swap procedurally.
          frameAssetIds: Object.freeze([
            "asset.template.mei-eyes-open" as AssetId,
            "asset.template.mei-eyes-closed" as AssetId,
          ]),
        });
      default:
        return null;
    }
  },
};

const transitionDefinitionsV1: readonly StageTransitionDefinition[] = Object.freeze(
  [
    {
      transitionId: "transition.template.crossfade",
      kind: "crossfade",
      durationMs: 400,
      easing: "ease_in_out",
      inputPolicy: "block",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: null,
    },
  ].map((definition, index) =>
    parseStageTransitionDefinition(definition, `/transitions/${String(index)}`)
  ),
);

/**
 * Cue-bound transitions come from the opening scene document: Mei's
 * entrance motion is bound to exactly her cue's enter edge (keyframes and
 * timing live in `scenes/opening/motions/mei-entrance.motion.json`). The
 * story-wide rule below only keeps content replaces on a crossfade; other
 * unbound edges cut instantly instead of inheriting a character motion.
 */
const transitionByIdV1: ReadonlyMap<string, StageTransitionDefinition> = new Map(
  [...transitionDefinitionsV1, ...templateOpeningTransitionBindingsV1.definitions].map(
    (definition) => [definition.transitionId, definition],
  ),
);

export const templateStageTransitionCatalogV1: StageTransitionCatalog = {
  resolveTransition(change: StageTargetChange): StageTransitionDefinition | null {
    const cueBound = templateOpeningTransitionBindingsV1.resolveTransition(change);
    if (cueBound !== null) return cueBound;
    if (change.kind === "replace") {
      return transitionByIdV1.get("transition.template.crossfade") ?? null;
    }
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinition | null {
    return transitionByIdV1.get(transitionId) ?? null;
  },
};

export const templatePresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface TemplatePresentationProgramV1 {
  readonly kind: "template-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeTemplatePresentationV1(): TemplatePresentationProgramV1 {
  return Object.freeze({ kind: "template-presentation", textCatalogs: templateTextCatalogsV1 });
}
