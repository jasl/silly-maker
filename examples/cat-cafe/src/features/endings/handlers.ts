// SPDX-License-Identifier: MIT
// Endings slice · commands: confirm the ending and cross into postgame (endless daily play).
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { catcafeDailyPettingV1 } from "../../state.ts";
import { catcafeEndingForV1 } from "./rules.ts";
import { applyCalendarV1, calendarModuleV1 } from "../calendar/module.ts";
import { catModuleV1 } from "../cat/module.ts";
import { catcafeGrowthMutationV1 } from "../cat/growth.ts";
import { shopModuleV1 } from "../shop/module.ts";
import { stageModuleV1 } from "../stage/module.ts";

export const endingsCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.enter_postgame"> =
  Object.freeze({
    "cc.enter_postgame": ({ snapshot, rng, state }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Postgame opens only while the mainline ending has just settled (week 7 Sunday night, unconfirmed).
        const ending = catcafeEndingForV1(state);
        if (ending === null) {
          return transaction.reject({ code: "cc.no_ending_pending" });
        }
        transaction.propose(shopModuleV1, {
          kind: "apply",
          reputation: state.shop.reputation,
          tidiness: state.shop.tidiness,
          money: state.shop.money,
          trophies: state.shop.trophies,
          epilogue: ending,
          facts: [Object.freeze({ kind: "cc.postgame_entered" as const, ending })],
        });
        // Step directly into week 8 Monday morning: confirming the ending starts the new day.
        transaction.propose(calendarModuleV1, { kind: "advance" });
        transaction.propose(catModuleV1, {
          kind: "apply",
          ...state.cat,
          pettingLeft: catcafeDailyPettingV1,
        });
        const next = applyCalendarV1(state.calendar, { kind: "advance" });
        transaction.propose(stageModuleV1, {
          kind: "apply",
          mutations: [catcafeGrowthMutationV1(next.week, "/postgame/appearance")],
        });
        return transaction.complete();
      }),
  });
