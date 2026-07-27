// SPDX-License-Identifier: MIT
import type { TextCatalogSetV1 } from "@sillymaker/base";
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";
import type {
  StageContentCatalog,
  StageContentResolution,
  StageTargetChange,
  StageTransitionCatalog,
  StageTransitionDefinition,
} from "@sillymaker/base/story";
import { parseStageTransitionDefinition } from "@sillymaker/base/story";

import { bookshopContentIdsV1 } from "./narrative.js";

/**
 * Every player-visible string lives here, keyed by textId. The script
 * references textIds only; a missing entry fails loudly in tests.
 */
export const bookshopTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.bookshop.app.name", text: "打烊前的旧书店" },
        { textId: "text.bookshop.stage.name", text: "旧书店" },
        { textId: "text.bookshop.hud.coins", text: "硬币" },
        { textId: "text.bookshop.action.begin", text: "开始故事" },
        { textId: "text.bookshop.action.earn", text: "捡起硬币" },
        { textId: "text.bookshop.narrative.advance", text: "继续" },
        { textId: "text.bookshop.narrative.completed", text: "（本段落已结束）" },
        { textId: "text.bookshop.speaker.zhou", text: "老周" },
        { textId: "text.bookshop.speaker.cheng", text: "阿澄" },
        {
          textId: "text.bookshop.line.opening-narration",
          text: "雨还在下。旧书店的灯昏黄，墙上的钟指向九点差一刻。",
        },
        { textId: "text.bookshop.line.opening-zhou", text: "……该收摊了。" },
        {
          textId: "text.bookshop.line.cheng-asks",
          text: "周叔！就五分钟——那本绝版诗集，您上次说还在架子顶上。",
        },
        {
          textId: "text.bookshop.line.zhou-replies",
          text: "架子顶上那本？雨天爬梯子，你倒是想得美。",
        },
        { textId: "text.bookshop.choice.first-prompt", text: "打烊前，你……" },
        { textId: "text.bookshop.choice.help", text: "帮阿澄找那本绝版诗集" },
        { textId: "text.bookshop.choice.usher", text: "催他们打烊前离开" },
        {
          textId: "text.bookshop.line.help-1",
          text: "真的？周叔您人真好！我踩稳凳子，您递一下手电。",
        },
        { textId: "text.bookshop.line.help-2", text: "别晃。掉下来我不赔医药费。" },
        { textId: "text.bookshop.line.usher-1", text: "明天再来。灯关了，梯子也收了。" },
        {
          textId: "text.bookshop.line.usher-2",
          text: "诶——行吧行吧，我记着明天第一节课后再过来。",
        },
        {
          textId: "text.bookshop.line.yard",
          text: "你们绕到后院收晾着的雨布。雨小了些，铁皮檐沟滴答作响。",
        },
        { textId: "text.bookshop.choice.second-prompt", text: "后院门廊上，还摊着那本诗集。" },
        { textId: "text.bookshop.choice.buy", text: "花一枚硬币买下它" },
        { textId: "text.bookshop.choice.leave-book", text: "只是摸了摸封面，先不买" },
        {
          textId: "text.bookshop.line.after-buy",
          text: "收好。别再弄湿了——书皮已经卷边了。",
        },
        {
          textId: "text.bookshop.line.after-leave-book",
          text: "没事，明天我还来。您别先卖给别人啊。",
        },
        {
          textId: "text.bookshop.line.ending-helped",
          text: "难得有人真找。伞在门后，拿一把再走。",
        },
        {
          textId: "text.bookshop.line.ending-plain",
          text: "店门上了锁。雨夜里，旧书店的灯一盏一盏熄灭。",
        },
      ],
    },
  ],
});

/**
 * The stage content catalog: the only place that knows renderer IDs and
 * accessible names for stage content. Authoritative stage state stores
 * contentIds only.
 */
export const bookshopStageContentCatalogV1: StageContentCatalog = {
  resolveContent(contentId, appearance): StageContentResolution | null {
    switch (contentId as string) {
      case bookshopContentIdsV1.backgroundShop:
        return Object.freeze({
          rendererId: "renderer.bookshop.background",
          assetIds: Object.freeze([]),
          accessibleName: "雨夜的旧书店",
          props: Object.freeze({ surface: "shop" }),
        });
      case bookshopContentIdsV1.backgroundYard:
        return Object.freeze({
          rendererId: "renderer.bookshop.background",
          assetIds: Object.freeze([]),
          accessibleName: "书店后院",
          props: Object.freeze({ surface: "yard" }),
        });
      case bookshopContentIdsV1.characterZhou:
        return Object.freeze({
          rendererId: "renderer.bookshop.character",
          assetIds: Object.freeze([]),
          accessibleName: "老周",
          props: Object.freeze({
            expression: typeof appearance.expression === "string" ? appearance.expression : "calm",
          }),
        });
      case bookshopContentIdsV1.characterCheng:
        return Object.freeze({
          rendererId: "renderer.bookshop.character",
          assetIds: Object.freeze([]),
          accessibleName: "阿澄",
          props: Object.freeze({
            expression: typeof appearance.expression === "string" ? appearance.expression : "eager",
          }),
        });
      default:
        return null;
    }
  },
};

const transitionDefinitionsV1: readonly StageTransitionDefinition[] = Object.freeze(
  [
    {
      transitionId: "transition.bookshop.crossfade",
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
    {
      transitionId: "transition.bookshop.enter",
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
  ].map((definition, index) =>
    parseStageTransitionDefinition(definition, `/transitions/${String(index)}`),
  ),
);

const transitionByIdV1: ReadonlyMap<string, StageTransitionDefinition> = new Map(
  transitionDefinitionsV1.map((definition) => [definition.transitionId, definition]),
);

/** Backgrounds crossfade; characters slide in; everything else cuts. */
export const bookshopStageTransitionCatalogV1: StageTransitionCatalog = {
  resolveTransition(change: StageTargetChange): StageTransitionDefinition | null {
    if (change.kind === "replace") {
      return transitionByIdV1.get("transition.bookshop.crossfade") ?? null;
    }
    if (change.kind === "enter") {
      return transitionByIdV1.get("transition.bookshop.enter") ?? null;
    }
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinition | null {
    return transitionByIdV1.get(transitionId) ?? null;
  },
};

export const bookshopPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface BookshopPresentationProgramV1 {
  readonly kind: "bookshop-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeBookshopPresentationV1(): BookshopPresentationProgramV1 {
  return Object.freeze({ kind: "bookshop-presentation", textCatalogs: bookshopTextCatalogsV1 });
}
