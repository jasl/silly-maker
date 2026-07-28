// SPDX-License-Identifier: MIT
// 相遇切片·规则：常客事件池抽取。条件对照当前状态，抽取走快照 RNG
// （重放一致），效果叠加到调用方的草稿上，解释数据随 fact 落日志。
import { drawFromEventPoolV1 } from "@sillymaker/base";

import type { CatcafeGameStateV1 } from "../../state.ts";
import {
  catcafeEncounterConditionsV1,
  catcafeEncountersV1,
  catcafeSlotsV1,
} from "../../content.ts";
import type { CatcafeFactV1 } from "../../kernel.ts";
import { applyStatEffectsV1 } from "../../kernel.ts";
import type { CatcafeTransactionalRngV1 } from "../../runtime.ts";

/** 抽一次常客相遇；命中时把效果并入草稿并返回 encounter facts。 */
export function drawCatcafeEncounterV1(input: {
  readonly state: CatcafeGameStateV1["simulation"];
  readonly rng: CatcafeTransactionalRngV1;
  readonly cat: {
    trust: number;
    vigor: number;
    skill: number;
    fishBuff: number;
    pettingLeft: number;
  };
  readonly shop: { reputation: number; tidiness: number; money: number; trophies: number };
}): readonly CatcafeFactV1[] {
  const { state, rng } = input;
  const draw = drawFromEventPoolV1({
    candidates: catcafeEncountersV1.rows().map((row) => ({
      eventId: row.id,
      weight: row.weight,
      condition: catcafeEncounterConditionsV1.get(row.id) ?? null,
    })),
    context: {
      numbers: {
        "cat.trust": state.cat.trust,
        "cat.skill": state.cat.skill,
        "shop.reputation": state.shop.reputation,
        "shop.tidiness": state.shop.tidiness,
        "calendar.week": state.calendar.week,
      },
      flags: state.narrative.flags,
      labels: { slot: catcafeSlotsV1[state.calendar.slot] ?? "morning" },
    },
    rng,
    purpose: "check:cc.encounter",
  });
  if (draw.kind !== "drawn") return Object.freeze([]);
  const row = catcafeEncountersV1.byId(draw.eventId);
  if (row === null || row.textId === null) return Object.freeze([]);
  applyStatEffectsV1(input.cat, input.shop, row.effects, { fishBuffDoublesTrust: false });
  return Object.freeze([
    Object.freeze({
      kind: "cc.encounter" as const,
      encounterId: draw.eventId,
      textId: row.textId,
      explanation: draw.explanation,
    }),
  ]);
}
