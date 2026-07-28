// SPDX-License-Identifier: MIT
// 店铺切片·内容表：日程活动定义（时段/体力/效果/收入/解锁）。
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentTableDefinition } from "@sillymaker/base/story";
import { defineContentTable } from "@sillymaker/base/story";
import { catcafeSlotsV1 } from "../calendar/content.ts";

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
