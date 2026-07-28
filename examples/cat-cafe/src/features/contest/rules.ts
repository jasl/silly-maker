// SPDX-License-Identifier: MIT
// 竞赛切片·规则：运动会日程（主线 3/5/7 周；后日谈每周日暮友谊赛）。
import type { CatcafeGameStateV1 } from "../../state.ts";
import { catcafeRivalsV1, catcafeSlotsV1 } from "../../content.ts";

/**
 * 今天是否运动会日：主线 3/5/7 周的周日暮；后日谈（第 8 周起）每个
 * 周日暮都有友谊赛，对手按周轮换。
 */
export function catcafeContestTodayV1(
  calendar: CatcafeGameStateV1["simulation"]["calendar"],
): string | null {
  if (calendar.day !== 6 || catcafeSlotsV1[calendar.slot] !== "dusk") return null;
  if (calendar.week > 7) {
    const rivals = catcafeRivalsV1.rows();
    return rivals[(calendar.week - 8) % rivals.length]?.id ?? null;
  }
  const rival = catcafeRivalsV1.findFirst({ where: { week: calendar.week } });
  return rival?.id ?? null;
}
