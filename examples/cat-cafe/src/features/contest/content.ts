// SPDX-License-Identifier: MIT
// 竞赛切片·内容表：技能与对手（外键指向图鉴奖杯条目）。
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentTableDefinition } from "@sillymaker/base/story";
import { defineContentTable } from "@sillymaker/base/story";

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
