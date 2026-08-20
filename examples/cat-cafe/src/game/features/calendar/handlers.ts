// SPDX-License-Identifier: MIT
// Calendar slice · commands: slot advancement; day rollover chains tidiness decay, petting reset, and character-art growth.
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { emitCatcafeStageV1, transactionRunnerV1 } from "../../runtime.ts";
import { catcafeDailyPettingV1 } from "../../state.ts";
import { clampV1 } from "../../kernel.ts";
import { advanceCalendarV1 } from "./module.ts";
import { catcafeGrowthMutationV1 } from "../cat/growth.ts";

export const calendarCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.advance_slot"> = Object
  .freeze({
    "cc.advance_slot": ({ snapshot, rng, state }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Daily gameplay unlocks after the opening narrative completes.
        if (state.narrative.phase !== "completed") {
          return transaction.reject({ code: "cc.narrative_busy" });
        }
        const next = advanceCalendarV1(state.calendar);
        transaction.emit({ kind: "cc.calendar_set", next });
        transaction.emit({
          kind: "cc.slot_advanced",
          week: next.week,
          day: next.day,
          slot: next.slot,
        });
        // Day rollover: tidiness decays naturally, petting allowance resets, character art grows by week age.
        if (next.slot === 0) {
          transaction.emit({
            kind: "cc.shop_set",
            next: Object.freeze({
              ...state.shop,
              tidiness: clampV1(state.shop.tidiness - 10, 0, 100),
            }),
          });
          transaction.emit({
            kind: "cc.cat_set",
            next: Object.freeze({ ...state.cat, pettingLeft: catcafeDailyPettingV1 }),
          });
          const blocked = emitCatcafeStageV1(transaction, state.stage, [
            catcafeGrowthMutationV1(next.week, "/advance/appearance"),
          ]);
          if (blocked !== null) return transaction.reject({ code: blocked });
        }
        return transaction.complete();
      }),
  });
