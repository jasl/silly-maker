// SPDX-License-Identifier: MIT
// Endings slice · commands: confirm the ending and cross into postgame (endless daily play).
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { emitCatcafeStageV1, transactionRunnerV1 } from "../../runtime.ts";
import { catcafeDailyPettingV1 } from "../../state.ts";
import { catcafeEndingForV1 } from "./rules.ts";
import { advanceCalendarV1 } from "../calendar/module.ts";
import { catcafeGrowthMutationV1 } from "../cat/growth.ts";

export const endingsCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.enter_postgame"> = {
  "cc.enter_postgame": ({ snapshot, rng, state }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      // Postgame opens only while the mainline ending has just settled (week 7 Sunday night, unconfirmed).
      const ending = catcafeEndingForV1(state);
      if (ending === null) {
        return transaction.reject({ code: "cc.no_ending_pending" });
      }
      transaction.emit({
        kind: "cc.shop_set",
        next: { ...state.shop, epilogue: ending },
      });
      transaction.emit({ kind: "cc.postgame_entered", ending });
      // Step directly into week 8 Monday morning: confirming the ending starts the new day.
      const next = advanceCalendarV1(state.calendar);
      transaction.emit({ kind: "cc.calendar_set", next });
      transaction.emit({
        kind: "cc.cat_set",
        next: { ...state.cat, pettingLeft: catcafeDailyPettingV1 },
      });
      const blocked = emitCatcafeStageV1(transaction, state.stage, [
        catcafeGrowthMutationV1(next.week, "/postgame/appearance"),
      ]);
      if (blocked !== null) return transaction.reject({ code: blocked });
      return transaction.complete();
    }),
};
