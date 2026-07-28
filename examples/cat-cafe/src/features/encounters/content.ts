// SPDX-License-Identifier: MIT
// 相遇切片·内容表：营业事件池候选（受限可序列化条件 + 权重）。
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentTableDefinition, EventCondition } from "@sillymaker/base/story";
import { defineContentTable, parseEventCondition } from "@sillymaker/base/story";

export interface CatcafeEncounterRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  /** null = 无事发生（不显示、不发 fact）。 */
  readonly textId: string | null;
  readonly weight: number;
  /** JSON 条件；null = 恒可用。运行时经 parseEventCondition 解析。 */
  readonly condition: Readonly<Record<string, unknown>> | null;
  readonly effects: readonly { readonly stat: string; readonly delta: number }[];
}

const encounterSchemaV1: RuntimeSchemaV1<CatcafeEncounterRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    textId: z.string().nullable(),
    weight: z.number().int().positive(),
    condition: z.record(z.string(), z.unknown()).nullable(),
    effects: z.array(z.strictObject({ stat: z.string(), delta: z.number().int() })),
  }),
  { subject: { kind: "module", id: "catcafe.content.encounters" } },
);

export const catcafeEncountersTableV1: ContentTableDefinition<CatcafeEncounterRowV1> =
  defineContentTable({
    tableId: "table.catcafe.encounters",
    schema: encounterSchemaV1,
    primaryKey: "id",
    textColumns: ["textId"],
    rows: [
      { id: "encounter.quiet", textId: null, weight: 12, condition: null, effects: [] },
      {
        id: "encounter.stray",
        textId: "text.cc.encounter.stray",
        weight: 4,
        condition: null,
        effects: [{ stat: "shop.tidiness", delta: -5 }],
      },
      {
        id: "encounter.baker",
        textId: "text.cc.encounter.baker",
        weight: 3,
        condition: { kind: "number", key: "calendar.week", op: "gte", value: 2 },
        effects: [{ stat: "shop.money", delta: 5 }],
      },
      {
        id: "encounter.sketch-girl",
        textId: "text.cc.encounter.sketch",
        weight: 3,
        condition: {
          kind: "all",
          conditions: [
            { kind: "number", key: "shop.reputation", op: "gte", value: 30 },
            { kind: "number", key: "cat.trust", op: "gte", value: 20 },
          ],
        },
        effects: [{ stat: "shop.reputation", delta: 2 }],
      },
      {
        id: "encounter.mechanic",
        textId: "text.cc.encounter.mechanic",
        weight: 2,
        condition: {
          kind: "all",
          conditions: [
            { kind: "number", key: "cat.trust", op: "gte", value: 40 },
            { kind: "label", key: "slot", anyOf: ["dusk"] },
          ],
        },
        effects: [{ stat: "cat.trust", delta: 2 }],
      },
      {
        id: "encounter.critic",
        textId: "text.cc.encounter.critic",
        weight: 2,
        condition: { kind: "number", key: "shop.reputation", op: "gte", value: 50 },
        effects: [{ stat: "shop.reputation", delta: 5 }],
      },
    ],
  });

/** 解析期把条件列固化为受校验的条件树（authoring 错误立即失败）。 */
export const catcafeEncounterConditionsV1: ReadonlyMap<string, EventCondition | null> = new Map(
  catcafeEncountersTableV1.rows.map((row) => [
    row.id,
    row.condition === null ? null : parseEventCondition(row.condition, `/${row.id}/condition`),
  ]),
);
