// SPDX-License-Identifier: MIT
// 结局切片·命令：确认结局并跨入后日谈（无限日常）。
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
        // 只有主线结局刚刚结算（第 7 周周日夜、未确认过）才能进入后日谈。
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
        // 直接跨入第 8 周周一清晨：确认结局的同时新的一天开始。
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
