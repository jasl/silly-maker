// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentDatabase, ContentTableDefinition } from "@sillymaker/base/story";
import { createContentDatabase, defineContentTable } from "@sillymaker/base/story";

/**
 * 《雨巷猫舍》的静态内容：全部游戏数据定义为内容数据库表。
 * 运行时只读；数值/进度等动态状态在 `state.ts` 的模块里。
 * 这是内容数据库引擎件的第一个真实消费者。
 */

// ---------------------------------------------------------------------------
// 时段与成长阶段：小而闭合的枚举，作为普通常量而非表。
// ---------------------------------------------------------------------------

export const catcafeSlotsV1 = ["morning", "noon", "dusk", "night"] as const;
export type CatcafeSlotV1 = (typeof catcafeSlotsV1)[number];

/** 成长阶段：0 奶猫 / 1 幼猫 / 2 少年猫（按周推进：1–2 / 3–4 / 5–7）。 */
export const catcafeStageForWeekV1 = (week: number): number => (week >= 5 ? 2 : week >= 3 ? 1 : 0);

// ---------------------------------------------------------------------------
// 活动表：日程玩法的全部定义。
// ---------------------------------------------------------------------------

export interface CatcafeActivityRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  /** 允许的时段；空数组 = 任意时段。 */
  readonly slots: readonly string[];
  readonly stamina: number;
  /** 数值效果：目标数值 id -> 增减。 */
  readonly effects: readonly { readonly stat: string; readonly delta: number }[];
  /** 金钱收入公式挂钩：null 或 "business"（营业收入按声誉/整洁折算）。 */
  readonly income: string | null;
  /** 解锁所需成长阶段；null = 始终可用。 */
  readonly unlockStage: number | null;
}

const activitySchemaV1: RuntimeSchemaV1<CatcafeActivityRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    slots: z.array(z.enum(catcafeSlotsV1)),
    stamina: z.number().int().nonnegative(),
    effects: z.array(z.strictObject({ stat: z.string(), delta: z.number().int() })),
    income: z.enum(["business"]).nullable(),
    unlockStage: z.number().int().nullable(),
  }),
  { subject: { kind: "module", id: "catcafe.content.activities" } },
);

export const catcafeActivitiesTableV1: ContentTableDefinition<CatcafeActivityRowV1> =
  defineContentTable({
    tableId: "table.catcafe.activities",
    schema: activitySchemaV1,
    primaryKey: "id",
    textColumns: ["nameTextId"],
    rows: [
      {
        id: "activity.business",
        nameTextId: "text.cc.activity.business",
        slots: ["noon", "dusk"],
        stamina: 2,
        effects: [{ stat: "shop.reputation", delta: 1 }],
        income: "business",
        unlockStage: null,
      },
      {
        id: "activity.clean",
        nameTextId: "text.cc.activity.clean",
        slots: [],
        stamina: 1,
        effects: [{ stat: "shop.tidiness", delta: 25 }],
        income: null,
        unlockStage: null,
      },
      {
        id: "activity.play",
        nameTextId: "text.cc.activity.play",
        slots: [],
        stamina: 1,
        effects: [
          { stat: "cat.trust", delta: 3 },
          { stat: "cat.vigor", delta: -10 },
          { stat: "cat.skill", delta: 1 },
        ],
        income: null,
        unlockStage: null,
      },
      {
        id: "activity.agility",
        nameTextId: "text.cc.activity.agility",
        slots: ["morning", "noon"],
        stamina: 2,
        effects: [
          { stat: "cat.skill", delta: 4 },
          { stat: "cat.vigor", delta: -20 },
          { stat: "cat.trust", delta: -1 },
        ],
        income: null,
        unlockStage: 1,
      },
      {
        id: "activity.fish",
        nameTextId: "text.cc.activity.fish",
        slots: ["noon"],
        stamina: 1,
        effects: [
          { stat: "shop.money", delta: -15 },
          { stat: "cat.fishBuff", delta: 1 },
        ],
        income: null,
        unlockStage: null,
      },
      {
        id: "activity.nap",
        nameTextId: "text.cc.activity.nap",
        slots: ["dusk"],
        stamina: 1,
        effects: [
          { stat: "cat.vigor", delta: 30 },
          { stat: "cat.trust", delta: 1 },
        ],
        income: null,
        unlockStage: null,
      },
    ],
  });

// ---------------------------------------------------------------------------
// 部位反应表：抚摸玩法的规则（命中区域引擎件的消费者）。
// ---------------------------------------------------------------------------

export interface CatcafePettingRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly zone: string;
  /** 信任段位（含端点）。 */
  readonly minTrust: number;
  readonly maxTrust: number;
  readonly reactionTextId: string;
  readonly trustDelta: number;
  readonly expression: string;
}

const pettingSchemaV1: RuntimeSchemaV1<CatcafePettingRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    zone: z.enum(["head", "chin", "back", "tail"]),
    minTrust: z.number().int().min(0).max(100),
    maxTrust: z.number().int().min(0).max(100),
    reactionTextId: z.string(),
    trustDelta: z.number().int(),
    expression: z.enum(["calm", "happy", "purring", "grumpy", "hissing"]),
  }),
  { subject: { kind: "module", id: "catcafe.content.petting" } },
);

export const catcafePettingTableV1: ContentTableDefinition<CatcafePettingRowV1> =
  defineContentTable({
    tableId: "table.catcafe.petting",
    schema: pettingSchemaV1,
    primaryKey: "id",
    textColumns: ["reactionTextId"],
    rows: [
      {
        id: "pet.head.low",
        zone: "head",
        minTrust: 0,
        maxTrust: 39,
        reactionTextId: "text.cc.pet.head.low",
        trustDelta: 1,
        expression: "calm",
      },
      {
        id: "pet.head.high",
        zone: "head",
        minTrust: 40,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.head.high",
        trustDelta: 2,
        expression: "happy",
      },
      {
        id: "pet.chin.low",
        zone: "chin",
        minTrust: 0,
        maxTrust: 29,
        reactionTextId: "text.cc.pet.chin.low",
        trustDelta: 0,
        expression: "calm",
      },
      {
        id: "pet.chin.high",
        zone: "chin",
        minTrust: 30,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.chin.high",
        trustDelta: 3,
        expression: "purring",
      },
      {
        id: "pet.back.any",
        zone: "back",
        minTrust: 0,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.back.any",
        trustDelta: 1,
        expression: "happy",
      },
      {
        id: "pet.tail.low",
        zone: "tail",
        minTrust: 0,
        maxTrust: 59,
        reactionTextId: "text.cc.pet.tail.low",
        trustDelta: -3,
        expression: "hissing",
      },
      {
        id: "pet.tail.high",
        zone: "tail",
        minTrust: 60,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.tail.high",
        trustDelta: 2,
        expression: "purring",
      },
    ],
  });

// ---------------------------------------------------------------------------
// 运动会：技能表与对手表。
// ---------------------------------------------------------------------------

export interface CatcafeMoveRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  /** 基础威力（对手士气伤害）。 */
  readonly power: number;
  readonly vigorCost: number;
  /** feint = 下回合闪避；charm = 回复自身士气并取悦观众。 */
  readonly kind: string;
}

const moveSchemaV1: RuntimeSchemaV1<CatcafeMoveRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    power: z.number().int().nonnegative(),
    vigorCost: z.number().int().nonnegative(),
    kind: z.enum(["strike", "feint", "charm"]),
  }),
  { subject: { kind: "module", id: "catcafe.content.moves" } },
);

export const catcafeMovesTableV1: ContentTableDefinition<CatcafeMoveRowV1> = defineContentTable({
  tableId: "table.catcafe.moves",
  schema: moveSchemaV1,
  primaryKey: "id",
  textColumns: ["nameTextId"],
  rows: [
    {
      id: "move.pounce",
      nameTextId: "text.cc.move.pounce",
      power: 12,
      vigorCost: 15,
      kind: "strike",
    },
    { id: "move.feint", nameTextId: "text.cc.move.feint", power: 5, vigorCost: 5, kind: "feint" },
    { id: "move.charm", nameTextId: "text.cc.move.charm", power: 0, vigorCost: 0, kind: "charm" },
  ],
});

export interface CatcafeRivalRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  /** 参赛周（3/5/7）。 */
  readonly week: number;
  readonly morale: number;
  readonly power: number;
  /** aggressive = 总是强攻；steady = 交替；showy = 表演优先。 */
  readonly pattern: string;
  /** 击败后解锁的图鉴条目。 */
  readonly trophyAlbumId: string;
}

const rivalSchemaV1: RuntimeSchemaV1<CatcafeRivalRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    week: z.number().int(),
    morale: z.number().int().positive(),
    power: z.number().int().positive(),
    pattern: z.enum(["aggressive", "steady", "showy"]),
    trophyAlbumId: z.string(),
  }),
  { subject: { kind: "module", id: "catcafe.content.rivals" } },
);

export const catcafeRivalsTableV1: ContentTableDefinition<CatcafeRivalRowV1> = defineContentTable({
  tableId: "table.catcafe.rivals",
  schema: rivalSchemaV1,
  primaryKey: "id",
  textColumns: ["nameTextId"],
  references: [{ column: "trophyAlbumId", tableId: "table.catcafe.album" }],
  rows: [
    {
      id: "rival.mochi",
      nameTextId: "text.cc.rival.mochi",
      week: 3,
      morale: 30,
      power: 6,
      pattern: "showy",
      trophyAlbumId: "album.trophy.week3",
    },
    {
      id: "rival.smoke",
      nameTextId: "text.cc.rival.smoke",
      week: 5,
      morale: 45,
      power: 9,
      pattern: "steady",
      trophyAlbumId: "album.trophy.week5",
    },
    {
      id: "rival.general",
      nameTextId: "text.cc.rival.general",
      week: 7,
      morale: 60,
      power: 12,
      pattern: "aggressive",
      trophyAlbumId: "album.trophy.week7",
    },
  ],
});

// ---------------------------------------------------------------------------
// 图鉴条目表：元进度（跨存档）内容定义。
// ---------------------------------------------------------------------------

export interface CatcafeAlbumRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  readonly captionTextId: string;
  /** growth / trophy / memory。 */
  readonly kind: string;
}

const albumSchemaV1: RuntimeSchemaV1<CatcafeAlbumRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    captionTextId: z.string(),
    kind: z.enum(["growth", "trophy", "memory"]),
  }),
  { subject: { kind: "module", id: "catcafe.content.album" } },
);

export const catcafeAlbumTableV1: ContentTableDefinition<CatcafeAlbumRowV1> = defineContentTable({
  tableId: "table.catcafe.album",
  schema: albumSchemaV1,
  primaryKey: "id",
  textColumns: ["nameTextId", "captionTextId"],
  rows: [
    {
      id: "album.growth.rescue",
      nameTextId: "text.cc.album.rescue",
      captionTextId: "text.cc.album.rescue.caption",
      kind: "growth",
    },
    {
      id: "album.growth.purr",
      nameTextId: "text.cc.album.purr",
      captionTextId: "text.cc.album.purr.caption",
      kind: "growth",
    },
    {
      id: "album.growth.leap",
      nameTextId: "text.cc.album.leap",
      captionTextId: "text.cc.album.leap.caption",
      kind: "growth",
    },
    {
      id: "album.trophy.week3",
      nameTextId: "text.cc.album.trophy3",
      captionTextId: "text.cc.album.trophy3.caption",
      kind: "trophy",
    },
    {
      id: "album.trophy.week5",
      nameTextId: "text.cc.album.trophy5",
      captionTextId: "text.cc.album.trophy5.caption",
      kind: "trophy",
    },
    {
      id: "album.trophy.week7",
      nameTextId: "text.cc.album.trophy7",
      captionTextId: "text.cc.album.trophy7.caption",
      kind: "trophy",
    },
    {
      id: "album.memory.regular",
      nameTextId: "text.cc.album.regular",
      captionTextId: "text.cc.album.regular.caption",
      kind: "memory",
    },
  ],
});

// ---------------------------------------------------------------------------
// 数据库实例：解析期做主键/外键/文本列校验。
// ---------------------------------------------------------------------------

export const catcafeContentV1: ContentDatabase = createContentDatabase({
  tables: [
    catcafeAlbumTableV1,
    catcafeActivitiesTableV1,
    catcafePettingTableV1,
    catcafeMovesTableV1,
    catcafeRivalsTableV1,
  ],
});

export const catcafeActivitiesV1 = catcafeContentV1.table(catcafeActivitiesTableV1);
export const catcafePettingV1 = catcafeContentV1.table(catcafePettingTableV1);
export const catcafeMovesV1 = catcafeContentV1.table(catcafeMovesTableV1);
export const catcafeRivalsV1 = catcafeContentV1.table(catcafeRivalsTableV1);
export const catcafeAlbumV1 = catcafeContentV1.table(catcafeAlbumTableV1);
