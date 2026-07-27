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
        { textId: "text.cc.album.open", text: "成长相册" },
        { textId: "text.cc.album.title", text: "成长相册" },
        { textId: "text.cc.ending.champion", text: "结局·巷口传奇：三座奖杯在窗台上排成一排。" },
        {
          textId: "text.cc.ending.signboard",
          text: "结局·猫舍的女儿：她趴在招牌上，比招牌还醒目。",
        },
        {
          textId: "text.cc.ending.adopted",
          text: "结局·更好的家：富家小姐抱走她时，你们都没有回头。",
        },
        { textId: "text.cc.ending.ordinary", text: "结局·平凡的幸福：雨还会下，猫舍的灯总亮着。" },
        { textId: "text.cc.contest.won", text: "小雨赢下了这一场！" },
        { textId: "text.cc.contest.lost", text: "这次没能赢，回去多练练吧。" },
        { textId: "text.cc.settings.language", text: "语言" },
        { textId: "text.cc.settings.volume", text: "音量" },
        { textId: "text.cc.settings.muted", text: "静音" },
        { textId: "text.cc.settings.fullscreen", text: "切换全屏" },
        {
          textId: "text.cc.settings.resolution",
          text: "分辨率随窗口自适应：舞台按 1280×720 逻辑画布等比缩放。桌面渠道的窗口尺寸设置属后续工作。",
        },
      ],
    },
    {
      locale: "en",
      fallbackLocale: "zh-CN",
      entries: [
        { textId: "text.cc.app.name", text: "Rainy Alley Cat House" },
        { textId: "text.cc.stage.name", text: "The cat house" },
        {
          textId: "text.cc.line.rain",
          text: "It rained for a whole week. The eaves were still dripping on your first night in the little shop at the alley's end.",
        },
        {
          textId: "text.cc.line.box",
          text: "The cardboard box by the door stirred. Inside: a soaked kitten, crying at you with everything she had.",
        },
        {
          textId: "text.cc.line.meet",
          text: "She quieted in your palm, hooked a claw into your sleeve, and would not let go.",
        },
        { textId: "text.cc.choice.name", text: "Give her a name." },
        { textId: "text.cc.choice.name.xiaoyu", text: 'Call her "Drizzle"' },
        { textId: "text.cc.choice.name.later", text: "Think it over" },
        { textId: "text.cc.line.named", text: '"Drizzle." Her ears twitched, as if she answered.' },
        {
          textId: "text.cc.line.unnamed",
          text: "The name can wait. She doesn't mind — your apron is already her bed.",
        },
        {
          textId: "text.cc.line.tutorial",
          text: "The neighborhood cat games are seven weeks away. Open the shop, raise this little one — run the till by day, keep things clean, play with her, and check the arena on Sunday evenings.",
        },
        { textId: "text.cc.activity.business", text: "Open for business" },
        { textId: "text.cc.activity.clean", text: "Clean the shop" },
        { textId: "text.cc.activity.play", text: "Play with Drizzle" },
        { textId: "text.cc.activity.agility", text: "Agility training" },
        { textId: "text.cc.activity.fish", text: "Buy fresh fish" },
        { textId: "text.cc.activity.nap", text: "Nap together" },
        { textId: "text.cc.pet.head.low", text: "She flinches warily, but doesn't pull away." },
        { textId: "text.cc.pet.head.high", text: "She pushes her head into your palm." },
        { textId: "text.cc.pet.chin.low", text: "She freezes at the touch, tail tip flicking." },
        { textId: "text.cc.pet.chin.high", text: "The purring starts up like a little motor." },
        { textId: "text.cc.pet.back.any", text: "She arches into your hand, thoroughly pleased." },
        { textId: "text.cc.pet.tail.low", text: "Poof! She leaps away, tail lashing like a whip." },
        {
          textId: "text.cc.pet.tail.high",
          text: "Only you may touch there — graciously permitted.",
        },
        { textId: "text.cc.move.pounce", text: "Pounce" },
        { textId: "text.cc.move.feint", text: "Feint" },
        { textId: "text.cc.move.charm", text: "Charm" },
        { textId: "text.cc.rival.mochi", text: "Mochi (the bakery's white cat)" },
        { textId: "text.cc.rival.smoke", text: "Smoke (the garage's grey cat)" },
        { textId: "text.cc.rival.general", text: "The General (the alley's orange boss)" },
        { textId: "text.cc.album.rescue", text: "A rainy-night meeting" },
        {
          textId: "text.cc.album.rescue.caption",
          text: "A cardboard box, the sound of rain, and a kitten who wouldn't give up.",
        },
        { textId: "text.cc.album.purr", text: "First purr" },
        {
          textId: "text.cc.album.purr.caption",
          text: "The little motor's maiden run. You nearly knocked over your tea.",
        },
        { textId: "text.cc.album.leap", text: "Learning to jump" },
        {
          textId: "text.cc.album.leap.caption",
          text: "Counter to bookshelf in one bound, three coasters casualties.",
        },
        { textId: "text.cc.album.trophy3", text: "Week 3 · First trophy" },
        {
          textId: "text.cc.album.trophy3.caption",
          text: "Mochi defeated. The baker treated you to a croissant.",
        },
        { textId: "text.cc.album.trophy5", text: "Week 5 · Second trophy" },
        {
          textId: "text.cc.album.trophy5.caption",
          text: "Smoke lost fair and square; free tire pumps forever.",
        },
        { textId: "text.cc.album.trophy7", text: "Week 7 · Final trophy" },
        {
          textId: "text.cc.album.trophy7.caption",
          text: "New management in the alley. The General ceded the best sunbathing spot.",
        },
        { textId: "text.cc.album.regular", text: "The regular's secret" },
        {
          textId: "text.cc.album.regular.caption",
          text: "The girl by the window filled a whole sketchbook with Drizzle.",
        },
        { textId: "text.cc.hud.week", text: "Week " },
        { textId: "text.cc.hud.stamina", text: "Stamina " },
        { textId: "text.cc.hud.money", text: "Money " },
        { textId: "text.cc.hud.reputation", text: "Reputation " },
        { textId: "text.cc.hud.tidiness", text: "Tidiness " },
        { textId: "text.cc.hud.trust", text: "Trust " },
        { textId: "text.cc.hud.vigor", text: "Vigor " },
        { textId: "text.cc.hud.skill", text: "Skill " },
        { textId: "text.cc.action.begin", text: "Begin the story" },
        { textId: "text.cc.action.advance", text: "Next slot" },
        { textId: "text.cc.action.contest", text: "Enter the games" },
        { textId: "text.cc.narrative.advance", text: "Continue" },
        {
          textId: "text.cc.narrative.completed",
          text: "(The opening ends — cat-house days begin.)",
        },
        { textId: "text.cc.slot.morning", text: "Morning" },
        { textId: "text.cc.slot.noon", text: "Noon" },
        { textId: "text.cc.slot.dusk", text: "Dusk" },
        { textId: "text.cc.slot.night", text: "Night" },
        { textId: "text.cc.day.0", text: "Mon" },
        { textId: "text.cc.day.1", text: "Tue" },
        { textId: "text.cc.day.2", text: "Wed" },
        { textId: "text.cc.day.3", text: "Thu" },
        { textId: "text.cc.day.4", text: "Fri" },
        { textId: "text.cc.day.5", text: "Sat" },
        { textId: "text.cc.day.6", text: "Sun" },
        { textId: "text.cc.contest.round", text: "Round " },
        { textId: "text.cc.contest.morale", text: "Morale " },
        { textId: "text.cc.album.open", text: "Album" },
        { textId: "text.cc.album.title", text: "Growth album" },
        {
          textId: "text.cc.ending.champion",
          text: "Ending · Legend of the Alley: three trophies in a row on the windowsill.",
        },
        {
          textId: "text.cc.ending.signboard",
          text: "Ending · Daughter of the House: she lounges on the signboard, outshining it.",
        },
        {
          textId: "text.cc.ending.adopted",
          text: "Ending · A Better Home: when the young lady carried her away, neither of you looked back.",
        },
        {
          textId: "text.cc.ending.ordinary",
          text: "Ending · An Ordinary Happiness: the rain will come again, and the lights stay on.",
        },
        { textId: "text.cc.contest.won", text: "Drizzle takes the match!" },
        { textId: "text.cc.contest.lost", text: "Not this time. Back to training." },
        { textId: "text.cc.settings.language", text: "Language" },
        { textId: "text.cc.settings.volume", text: "Volume" },
        { textId: "text.cc.settings.muted", text: "Mute" },
        { textId: "text.cc.settings.fullscreen", text: "Toggle fullscreen" },
        {
          textId: "text.cc.settings.resolution",
          text: "Resolution follows the window: the stage letterboxes its 1280x720 canvas automatically. A desktop-channel window-size setting is a future concern.",
        },
      ],
    },
  ],
});

/** 支持的语言与 locale 感知查找：目录内逐级 fallback，最后落默认目录。 */
export const catcafeLocalesV1 = ["zh-CN", "en"] as const;
export type CatcafeLocaleV1 = (typeof catcafeLocalesV1)[number];

export function catcafeTextForLocaleV1(locale: string | null, textId: string): string {
  const chain: string[] = [];
  let cursor: string | null = locale ?? catcafeTextCatalogsV1.defaultLocale;
  while (cursor !== null && !chain.includes(cursor)) {
    chain.push(cursor);
    const catalog = catcafeTextCatalogsV1.catalogs.find((candidate) => candidate.locale === cursor);
    const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
    if (entry !== undefined) return entry.text;
    cursor = catalog?.fallbackLocale ?? null;
  }
  const fallback = catcafeTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
  );
  const entry = fallback?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`catcafe.text_missing:${textId}`);
  return entry.text;
}

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
      case catcafeContentIdsV1.characterXiaoyu: {
        const stage = typeof appearance.stage === "string" ? appearance.stage : "kitten";
        // 命中区域随成长阶段缩放；坐标相对条目锚点（底部中心）。
        const size = stage === "adolescent" ? 260 : stage === "junior" ? 210 : 160;
        const height = Math.round(size * 0.85);
        const half = Math.round(size / 2);
        const third = Math.round(height / 3);
        const zone = (
          regionId: string,
          accessibleNameText: string,
          x: number,
          y: number,
          width: number,
        ) => Object.freeze({ regionId, accessibleNameText, x, y, width, height: third });
        return Object.freeze({
          rendererId: "renderer.catcafe.cat",
          assetIds: Object.freeze([]),
          accessibleName: "小雨",
          props: Object.freeze({
            stage,
            expression: typeof appearance.expression === "string" ? appearance.expression : "calm",
          }),
          hitRegions: Object.freeze([
            zone("zone.head", "摸头", -half, -height, half),
            zone("zone.chin", "挠下巴", 0, -height, half),
            zone("zone.back", "顺背", -half, -height + third, size),
            zone("zone.tail", "碰尾巴", -half, -third, size),
          ]),
        });
      }
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
