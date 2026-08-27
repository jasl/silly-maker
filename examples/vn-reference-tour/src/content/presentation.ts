// SPDX-License-Identifier: MIT
import type { AssetId, TextCatalogSetV1, TextContentManifestV1 } from "@sillymaker/base";
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";
import type {
  StageContentCatalog,
  StageContentResolution,
  StageTargetChange,
  StageTransitionCatalog,
  StageTransitionDefinition,
} from "@sillymaker/base/story";
import { parseStageTransitionDefinition } from "@sillymaker/base/story";

import { vnReferenceTourContentIdsV1 } from "../story/narrative.ts";
import { vnReferenceTourOpeningTransitionBindingsV1 } from "../scenes/opening/index.ts";
import { vnReferenceTourTextContentManifestV1 } from "./text-content.ts";

/**
 * Small bootstrap/UI copy stays resident. Narrative dialogue lives in
 * build-known text packs and is loaded through the Host before use.
 */
export const vnReferenceTourTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.vn-reference-tour.app.name", text: "最后一次试音" },
        { textId: "text.vn-reference-tour.stage.name", text: "庭院" },
        { textId: "text.vn-reference-tour.narrative.advance", text: "继续" },
        { textId: "text.vn-reference-tour.playback.auto", text: "自动" },
        { textId: "text.vn-reference-tour.playback.skip", text: "快进" },
        { textId: "text.vn-reference-tour.playback.history", text: "历史" },
        { textId: "text.vn-reference-tour.playback.history.title", text: "对话历史" },
        { textId: "text.vn-reference-tour.playback.history.empty", text: "还没有对话。" },
        { textId: "text.vn-reference-tour.playback.history.close", text: "关闭历史" },
      ],
    },
  ],
});

/** Resolves resident UI copy from the default-locale bootstrap catalog. */
export function vnReferenceTourUiTextV1(textId: string): string {
  const catalog = vnReferenceTourTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === vnReferenceTourTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`vn-reference-tour.ui_text_missing:${textId}`);
  return entry.text;
}

/**
 * The stage content catalog: the only place that knows renderer IDs and
 * accessible names for stage content. Authoritative stage state stores
 * contentIds only.
 */
export const vnReferenceTourStageContentCatalogV1: StageContentCatalog = {
  resolveContent(contentId, appearance): StageContentResolution | null {
    switch (contentId as string) {
      case vnReferenceTourContentIdsV1.backgroundCourtyard:
        return ({
          rendererId: "renderer.vn-reference-tour.background",
          assetIds: [],
          accessibleName: "雨后的庭院",
          props: { surface: "courtyard" },
        });
      case vnReferenceTourContentIdsV1.backgroundStudy:
        return ({
          rendererId: "renderer.vn-reference-tour.background",
          assetIds: [],
          accessibleName: "书房",
          props: { surface: "study" },
        });
      case vnReferenceTourContentIdsV1.effectMist:
        return ({
          rendererId: "renderer.vn-reference-tour.mist",
          assetIds: [],
          accessibleName: "雨后的薄雾",
          props: {},
          // One texture period is 320px; the band is canvas width + two
          // periods so the sawtooth drift never exposes an edge.
          geometry: {
            width: 2240,
            height: 200,
            anchorXPermille: 0,
            anchorYPermille: 0,
          },
        });
      case vnReferenceTourContentIdsV1.characterMei:
        return ({
          rendererId: "renderer.vn-reference-tour.character",
          assetIds: [],
          accessibleName: "小梅",
          props: {
            expression: typeof appearance.expression === "string" ? appearance.expression : "calm",
          },
          // The engine stage host anchors the content box at bottom center;
          // the renderer draws into it without its own translate.
          geometry: {
            width: 220,
            height: 420,
            anchorXPermille: 500,
            anchorYPermille: 1000,
          },
          // The ordered frame set the blink ambient's `frame` track indexes
          // (0 = eyes open, the default pose; 1 = eyes closed). A real game
          // points these at image assets; the placeholder renderer draws
          // the swap procedurally.
          frameAssetIds: [
            "asset.vn-reference-tour.mei-eyes-open" as AssetId,
            "asset.vn-reference-tour.mei-eyes-closed" as AssetId,
          ],
        });
      default:
        return null;
    }
  },
};

const transitionDefinitionsV1: readonly StageTransitionDefinition[] = [
  {
    transitionId: "transition.vn-reference-tour.crossfade",
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
);

/**
 * Cue-bound transitions come from the opening scene document: Mei's
 * entrance motion is bound to exactly her cue's enter edge (keyframes and
 * timing live in `scenes/opening/motions/mei-entrance.motion.json`). The
 * story-wide rule below only keeps content replaces on a crossfade; other
 * unbound edges cut instantly instead of inheriting a character motion.
 */
const transitionByIdV1: ReadonlyMap<string, StageTransitionDefinition> = new Map(
  [...transitionDefinitionsV1, ...vnReferenceTourOpeningTransitionBindingsV1.definitions].map(
    (definition) => [definition.transitionId, definition],
  ),
);

export const vnReferenceTourStageTransitionCatalogV1: StageTransitionCatalog = {
  resolveTransition(change: StageTargetChange): StageTransitionDefinition | null {
    const cueBound = vnReferenceTourOpeningTransitionBindingsV1.resolveTransition(change);
    if (cueBound !== null) return cueBound;
    if (change.kind === "replace") {
      return transitionByIdV1.get("transition.vn-reference-tour.crossfade") ?? null;
    }
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinition | null {
    return transitionByIdV1.get(transitionId) ?? null;
  },
};

export const vnReferenceTourPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface VnReferenceTourPresentationProgramV1 {
  readonly kind: "vn-reference-tour-presentation";
  readonly textCatalogs: TextCatalogSetV1;
  readonly textContentManifest: TextContentManifestV1;
}

export function materializeVnReferenceTourPresentationV1(): VnReferenceTourPresentationProgramV1 {
  return ({
    kind: "vn-reference-tour-presentation",
    textCatalogs: vnReferenceTourTextCatalogsV1,
    textContentManifest: vnReferenceTourTextContentManifestV1,
  });
}
