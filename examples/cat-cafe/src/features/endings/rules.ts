// SPDX-License-Identifier: MIT
// 结局切片·规则：主线结局判定（第 7 周运动会结束后结算）。
import type { CatcafeGameStateV1 } from "../../state.ts";
import { catcafeSlotsV1 } from "../../content.ts";

/**
 * 结局判定：第 7 周运动会结束（周日夜时段）后结算。
 * 冠军线（三奖杯）> 招牌线（信任+声誉）> 领养线（低信任高声誉）> 默认线。
 */
export type CatcafeEndingV1 = "champion" | "signboard" | "adopted" | "ordinary";

export function catcafeEndingForV1(
  state: CatcafeGameStateV1["simulation"],
): CatcafeEndingV1 | null {
  const calendar = state.calendar;
  const afterFinal =
    calendar.week === 7 && calendar.day === 6 && catcafeSlotsV1[calendar.slot] === "night";
  if (!afterFinal || state.contest !== null || state.shop.epilogue !== null) return null;
  if (state.shop.trophies >= 3) return "champion";
  if (state.cat.trust >= 80 && state.shop.reputation >= 60) return "signboard";
  if (state.cat.trust < 50 && state.shop.reputation >= 60) return "adopted";
  return "ordinary";
}
