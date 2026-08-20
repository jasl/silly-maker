// SPDX-License-Identifier: MIT
// Calendar slice · module: week/day/slot/stamina state; handlers compute the
// next calendar (advance rule below) and fold it via cc.calendar_set.

import type { CatcafeGameStateV1 } from "../../state.ts";
import { catcafeCalendarStateSchemaV1, catcafeDailyStaminaV1 } from "../../state.ts";
import { catcafeSlotsV1 } from "../../content.ts";
import { clampV1, commandSchemaV1, kit } from "../../kernel.ts";

export const calendarModuleV1 = kit.defineStatefulModule({
  id: "catcafe.calendar",
  contractRevision: 1,
  state: {
    slot: "simulation.calendar",
    schema: catcafeCalendarStateSchemaV1,
    initial: () => Object.freeze({ week: 1, day: 0, slot: 0, stamina: catcafeDailyStaminaV1 }),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "cc.calendar_set": (_state, event) => event.next,
  },
});

/** The one calendar rule: advance a slot, rolling day/week and refilling stamina. */
export function advanceCalendarV1(
  state: CatcafeGameStateV1["simulation"]["calendar"],
): CatcafeGameStateV1["simulation"]["calendar"] {
  const nextSlot = state.slot + 1;
  if (nextSlot < catcafeSlotsV1.length) return Object.freeze({ ...state, slot: nextSlot });
  const nextDay = state.day + 1;
  const rollWeek = nextDay > 6;
  return Object.freeze({
    week: clampV1(rollWeek ? state.week + 1 : state.week, 1, 9999),
    day: rollWeek ? 0 : nextDay,
    slot: 0,
    stamina: catcafeDailyStaminaV1,
  });
}
