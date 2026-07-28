// SPDX-License-Identifier: MIT
// Contest slice · rules: the contest schedule (mainline weeks 3/5/7; postgame friendly every Sunday dusk).
import type { CatcafeGameStateV1 } from "../../state.ts";
import { catcafeRivalsV1, catcafeSlotsV1 } from "../../content.ts";

/**
 * Is today a contest day: Sunday dusk of mainline weeks 3/5/7; in postgame (week 8+)
 * every Sunday dusk holds a friendly, with opponents rotating by week.
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
