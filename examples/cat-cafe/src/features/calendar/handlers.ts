// SPDX-License-Identifier: MIT
// 日历切片·命令：时段推进；跨日联动整洁衰减、抚摸重置与立绘成长。
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { catcafeDailyPettingV1 } from "../../state.ts";
import { clampV1 } from "../../kernel.ts";
import { applyCalendarV1, calendarModuleV1 } from "./module.ts";
import { catModuleV1 } from "../cat/module.ts";
import { catcafeGrowthMutationV1 } from "../cat/growth.ts";
import { shopModuleV1 } from "../shop/module.ts";
import { stageModuleV1 } from "../stage/module.ts";

export const calendarCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.advance_slot"> =
  Object.freeze({
    "cc.advance_slot": ({ snapshot, rng, state }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // 日常玩法在开场叙事完成后解锁。
        if (state.narrative.phase !== "completed") {
          return transaction.reject({ code: "cc.narrative_busy" });
        }
        transaction.propose(calendarModuleV1, { kind: "advance" });
        const next = applyCalendarV1(state.calendar, { kind: "advance" });
        // 跨日：整洁自然下降、抚摸余量重置、立绘按周龄同步成长。
        if (next.slot === 0) {
          transaction.propose(shopModuleV1, {
            kind: "apply",
            reputation: state.shop.reputation,
            tidiness: clampV1(state.shop.tidiness - 10, 0, 100),
            money: state.shop.money,
            trophies: state.shop.trophies,
          });
          transaction.propose(catModuleV1, {
            kind: "apply",
            ...state.cat,
            pettingLeft: catcafeDailyPettingV1,
          });
          transaction.propose(stageModuleV1, {
            kind: "apply",
            mutations: [catcafeGrowthMutationV1(next.week, "/advance/appearance")],
          });
        }
        return transaction.complete();
      }),
  });
