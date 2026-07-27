// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
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

import { catcafeContentIdsV1 } from "./narrative.ts";
import { catcafeContentV1 } from "./content.ts";

/**
 * 文本目录：界面/叙事文案 + 内容表引用的全部 textId。测试会把
 * `catcafeContentV1.collectTextIds()` 与本目录做 join 校验。
 */
export const catcafeTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.cc.app.name", text: "雨巷猫舍" },
        { textId: "text.cc.stage.name", text: "猫舍" },
        // —— 叙事开场 ——
        {
          textId: "text.cc.line.rain",
          text: "雨下了整整一周。盘下这间巷尾小店的第一晚，屋檐还在滴水。",
        },
        {
          textId: "text.cc.line.box",
          text: "门口的纸箱动了一下。里面是一只湿透的奶猫，正用尽全力朝你叫。",
        },
        {
          textId: "text.cc.line.meet",
          text: "她在你的掌心里安静下来，爪子勾住你的袖口，不肯松开。",
        },
        { textId: "text.cc.choice.name", text: "给她取个名字吧。" },
        { textId: "text.cc.choice.name.xiaoyu", text: "就叫「小雨」" },
        { textId: "text.cc.choice.name.later", text: "再想想" },
        { textId: "text.cc.line.named", text: "「小雨。」她耳朵动了动，像是应了一声。" },
        { textId: "text.cc.line.unnamed", text: "名字先欠着。她不在意，已经把你的围裙当成了床。" },
        {
          textId: "text.cc.line.tutorial",
          text: "七周后是街区的猫咪运动会。先把店开起来，再把这只小家伙养大——白天营业、打扫、陪她玩，周日傍晚记得去赛场看看。",
        },
        // —— 活动（内容表引用） ——
        { textId: "text.cc.activity.business", text: "开门营业" },
        { textId: "text.cc.activity.clean", text: "打扫店面" },
        { textId: "text.cc.activity.play", text: "陪小雨玩" },
        { textId: "text.cc.activity.agility", text: "敏捷训练" },
        { textId: "text.cc.activity.fish", text: "采购鲜鱼" },
        { textId: "text.cc.activity.nap", text: "陪她午睡" },
        // —— 抚摸反应（内容表引用） ——
        { textId: "text.cc.pet.head.low", text: "她警惕地缩了缩，但没有躲开。" },
        { textId: "text.cc.pet.head.high", text: "她主动把头顶进你的掌心。" },
        { textId: "text.cc.pet.chin.low", text: "下巴被碰到时她愣了一下，尾巴尖轻轻摆动。" },
        { textId: "text.cc.pet.chin.high", text: "呼噜声像小马达一样响起来。" },
        { textId: "text.cc.pet.back.any", text: "她顺着你的手拱起背，很舒服的样子。" },
        { textId: "text.cc.pet.tail.low", text: "炸毛了！她跳开两步，尾巴甩得像鞭子。" },
        { textId: "text.cc.pet.tail.high", text: "只有你可以碰这里——她慷慨地允许了。" },
        // —— 运动会（内容表引用） ——
        { textId: "text.cc.move.pounce", text: "扑跃" },
        { textId: "text.cc.move.feint", text: "佯动" },
        { textId: "text.cc.move.charm", text: "卖萌" },
        { textId: "text.cc.rival.mochi", text: "糯米（隔壁面包店的白猫）" },
        { textId: "text.cc.rival.smoke", text: "烟灰（修车行的灰猫）" },
        { textId: "text.cc.rival.general", text: "将军（巷口的橘色老大）" },
        // —— 图鉴（内容表引用） ——
        { textId: "text.cc.album.rescue", text: "雨夜相遇" },
        { textId: "text.cc.album.rescue.caption", text: "纸箱、雨声，和一只不肯放弃的奶猫。" },
        { textId: "text.cc.album.purr", text: "第一次呼噜" },
        { textId: "text.cc.album.purr.caption", text: "小马达初次启动，你差点感动得打翻茶杯。" },
        { textId: "text.cc.album.leap", text: "学会跳跃" },
        { textId: "text.cc.album.leap.caption", text: "从吧台到书架，一气呵成，打翻了三个杯垫。" },
        { textId: "text.cc.album.trophy3", text: "第三周·初赛奖杯" },
        { textId: "text.cc.album.trophy3.caption", text: "战胜糯米。面包店老板娘请你吃了可颂。" },
        { textId: "text.cc.album.trophy5", text: "第五周·复赛奖杯" },
        { textId: "text.cc.album.trophy5.caption", text: "烟灰输得心服口服，修车行从此免费打气。" },
        { textId: "text.cc.album.trophy7", text: "第七周·决赛奖杯" },
        {
          textId: "text.cc.album.trophy7.caption",
          text: "巷口易主。将军把最好的晒太阳位置让了出来。",
        },
        { textId: "text.cc.album.regular", text: "常客的秘密" },
        { textId: "text.cc.album.regular.caption", text: "总坐窗边的女孩，画了一整本小雨的速写。" },
        // —— HUD 与界面 ——
        { textId: "text.cc.hud.week", text: "第" },
        { textId: "text.cc.hud.stamina", text: "行动力" },
        { textId: "text.cc.hud.money", text: "金钱" },
        { textId: "text.cc.hud.reputation", text: "声誉" },
        { textId: "text.cc.hud.tidiness", text: "整洁" },
        { textId: "text.cc.hud.trust", text: "信任" },
        { textId: "text.cc.hud.vigor", text: "活力" },
        { textId: "text.cc.hud.skill", text: "技艺" },
        { textId: "text.cc.action.begin", text: "开始故事" },
        { textId: "text.cc.action.advance", text: "下一时段" },
        { textId: "text.cc.action.contest", text: "参加运动会" },
        { textId: "text.cc.narrative.advance", text: "继续" },
        { textId: "text.cc.narrative.completed", text: "（开场结束——猫舍的日子开始了）" },
        { textId: "text.cc.slot.morning", text: "清晨" },
        { textId: "text.cc.slot.noon", text: "午间" },
        { textId: "text.cc.slot.dusk", text: "傍晚" },
        { textId: "text.cc.slot.night", text: "夜里" },
        { textId: "text.cc.day.0", text: "周一" },
        { textId: "text.cc.day.1", text: "周二" },
        { textId: "text.cc.day.2", text: "周三" },
        { textId: "text.cc.day.3", text: "周四" },
        { textId: "text.cc.day.4", text: "周五" },
        { textId: "text.cc.day.5", text: "周六" },
        { textId: "text.cc.day.6", text: "周日" },
        { textId: "text.cc.contest.round", text: "回合" },
        { textId: "text.cc.contest.morale", text: "士气" },
        { textId: "text.cc.contest.won", text: "小雨赢下了这一场！" },
        { textId: "text.cc.contest.lost", text: "这次没能赢，回去多练练吧。" },
      ],
    },
  ],
});

/** 内容表引用的 textId 必须全部登记；启动时校验。 */
{
  const catalog = catcafeTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
  );
  const known = new Set(catalog?.entries.map((entry) => entry.textId as string));
  for (const textId of catcafeContentV1.collectTextIds()) {
    if (!known.has(textId)) throw new TypeError(`catcafe.content_text_missing:${textId}`);
  }
}

export const catcafeStageContentCatalogV1: StageContentCatalog = {
  resolveContent(contentId, appearance): StageContentResolution | null {
    switch (contentId as string) {
      case catcafeContentIdsV1.backgroundShopfront:
        return Object.freeze({
          rendererId: "renderer.catcafe.background",
          assetIds: Object.freeze([]),
          accessibleName: "猫舍店面",
          props: Object.freeze({ surface: "shopfront" }),
        });
      case catcafeContentIdsV1.backgroundBackyard:
        return Object.freeze({
          rendererId: "renderer.catcafe.background",
          assetIds: Object.freeze([]),
          accessibleName: "后院",
          props: Object.freeze({ surface: "backyard" }),
        });
      case catcafeContentIdsV1.characterXiaoyu:
        return Object.freeze({
          rendererId: "renderer.catcafe.cat",
          assetIds: Object.freeze([]),
          accessibleName: "小雨",
          props: Object.freeze({
            stage: typeof appearance.stage === "string" ? appearance.stage : "kitten",
            expression: typeof appearance.expression === "string" ? appearance.expression : "calm",
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
      transitionId: "transition.catcafe.crossfade",
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
      transitionId: "transition.catcafe.enter",
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

export const catcafeStageTransitionCatalogV1: StageTransitionCatalog = {
  resolveTransition(change: StageTargetChange): StageTransitionDefinition | null {
    if (change.kind === "replace") {
      return transitionByIdV1.get("transition.catcafe.crossfade") ?? null;
    }
    if (change.kind === "enter") return transitionByIdV1.get("transition.catcafe.enter") ?? null;
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinition | null {
    return transitionByIdV1.get(transitionId) ?? null;
  },
};

export const catcafePresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface CatcafePresentationProgramV1 {
  readonly kind: "catcafe-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeCatcafePresentationV1(): CatcafePresentationProgramV1 {
  return Object.freeze({ kind: "catcafe-presentation", textCatalogs: catcafeTextCatalogsV1 });
}
