// SPDX-License-Identifier: MIT
// Endings slice · rules: mainline ending determination (settled after the week-7 contest).
import type { CatcafeGameStateV1 } from "../../state.ts";
import { catcafeSlotsV1 } from "../../content.ts";

/**
 * Ending determination: settles after the week-7 contest (Sunday night slot).
 * Champion route (three trophies) > signboard route (trust+reputation) > adoption route (low trust, high reputation) > default route.
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
