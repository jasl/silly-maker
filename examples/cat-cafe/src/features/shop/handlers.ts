// SPDX-License-Identifier: MIT
// 店铺切片·命令：日常活动。规则读内容表；营业收入触发常客相遇抽取。
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { catcafeActivitiesV1, catcafeSlotsV1, catcafeStageForWeekV1 } from "../../content.ts";
import type { CatcafeFactV1 } from "../../kernel.ts";
import { applyStatEffectsV1 } from "../../kernel.ts";
import { shopModuleV1 } from "./module.ts";
import { calendarModuleV1 } from "../calendar/module.ts";
import { catModuleV1 } from "../cat/module.ts";
import { drawCatcafeEncounterV1 } from "../encounters/draw.ts";

export const shopCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.do_activity"> =
  Object.freeze({
    "cc.do_activity": ({ snapshot, rng, state, command }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // 日常玩法在开场叙事完成后解锁。
        if (state.narrative.phase !== "completed") {
          return transaction.reject({ code: "cc.narrative_busy" });
        }
        // 规则读内容表；效果写模块状态。
        const activity = catcafeActivitiesV1.byId(command.activityId);
        if (activity === null) return transaction.reject({ code: "cc.activity_unknown" });
        const slotName = catcafeSlotsV1[state.calendar.slot];
        if (activity.slots.length > 0 && !activity.slots.includes(slotName ?? "")) {
          return transaction.reject({ code: "cc.activity_wrong_slot" });
        }
        const stage = catcafeStageForWeekV1(state.calendar.week);
        if (activity.unlockStage !== null && stage < activity.unlockStage) {
          return transaction.reject({ code: "cc.activity_locked" });
        }
        if (state.calendar.stamina < activity.stamina) {
          return transaction.reject({ code: "cc.stamina_exhausted" });
        }

        const cat = { ...state.cat };
        const shop = { ...state.shop };
        // 鲜鱼加成：下一次信任增益翻倍并消耗（仅活动路径）。
        applyStatEffectsV1(cat, shop, activity.effects, { fishBuffDoublesTrust: true });
        let encounterFacts: readonly CatcafeFactV1[] = Object.freeze([]);
        if (activity.income === "business") {
          shop.money +=
            10 + Math.floor(state.shop.reputation / 10) + Math.floor(state.shop.tidiness / 20);
          encounterFacts = drawCatcafeEncounterV1({ state, rng, cat, shop });
        }
        if (shop.money < 0) return transaction.reject({ code: "cc.money_short" });

        transaction.propose(calendarModuleV1, { kind: "spend", stamina: activity.stamina });
        transaction.propose(catModuleV1, { kind: "apply", ...cat, facts: encounterFacts });
        transaction.propose(shopModuleV1, { kind: "apply", ...shop });
        return transaction.complete();
      }),
  });
