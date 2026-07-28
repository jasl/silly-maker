// SPDX-License-Identifier: MIT
// Calendar slice · module: week/day/slot/stamina advancement and day-rollover rules.

import type { CatcafeCalendarStateV1, CatcafeGameStateV1 } from "../../state.ts";
import { catcafeCalendarStateSchemaV1, catcafeDailyStaminaV1 } from "../../state.ts";
import { catcafeSlotsV1 } from "../../content.ts";
import { clampV1, commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type CalendarOperationV1 =
  | { readonly kind: "advance" }
  | { readonly kind: "spend"; readonly stamina: number }
  | { readonly kind: "set"; readonly next: CatcafeCalendarStateV1 };

export const calendarModuleV1 = kit.defineStatefulModule({
  id: "catcafe.calendar",
  contractRevision: 1,
  state: {
    slot: "simulation.calendar",
    schema: catcafeCalendarStateSchemaV1,
    initial: () => Object.freeze({ week: 1, day: 0, slot: 0, stamina: catcafeDailyStaminaV1 }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<CalendarOperationV1>("calendar"),
    propose(state, operation) {
      if (operation.kind === "spend" && state.stamina < operation.stamina) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "cc.stamina_exhausted" as const }),
        });
      }
      const next = applyCalendarV1(state, operation);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts:
            operation.kind === "advance"
              ? Object.freeze([
                  Object.freeze({
                    kind: "cc.slot_advanced" as const,
                    week: next.week,
                    day: next.day,
                    slot: next.slot,
                  }),
                ])
              : Object.freeze([]),
        }),
      });
    },
    apply: (state, proposal) => applyCalendarV1(state, proposal.payload),
  },
});

export function applyCalendarV1(
  state: CatcafeGameStateV1["simulation"]["calendar"],
  operation: CalendarOperationV1,
): CatcafeGameStateV1["simulation"]["calendar"] {
  if (operation.kind === "set") return operation.next;
  if (operation.kind === "spend") {
    return Object.freeze({ ...state, stamina: state.stamina - operation.stamina });
  }
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
