// SPDX-License-Identifier: MIT
// Shop slice · commands: daily activities. Rules read content tables; business income triggers a regulars-encounter draw.
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { catcafeActivitiesV1, catcafeSlotsV1, catcafeStageForWeekV1 } from "../../content.ts";
import type { CatcafeEventV1 } from "../../kernel.ts";
import { applyStatEffectsV1 } from "../../kernel.ts";
import { drawCatcafeEncounterV1 } from "../encounters/draw.ts";

export const shopCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.do_activity"> = Object
  .freeze({
    "cc.do_activity": ({ snapshot, rng, state, command }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Daily gameplay unlocks after the opening narrative completes.
        if (state.narrative.phase !== "completed") {
          return transaction.reject({ code: "cc.narrative_busy" });
        }
        // Rules read the content tables; effects fold into module state via events.
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
        // Fresh-fish bonus: the next trust gain doubles and is consumed (activity path only).
        applyStatEffectsV1(cat, shop, activity.effects, { fishBuffDoublesTrust: true });
        let encounterEvents: readonly CatcafeEventV1[] = Object.freeze([]);
        if (activity.income === "business") {
          shop.money += 10 + Math.floor(state.shop.reputation / 10) +
            Math.floor(state.shop.tidiness / 20);
          encounterEvents = drawCatcafeEncounterV1({ state, rng, cat, shop });
        }
        if (shop.money < 0) return transaction.reject({ code: "cc.money_short" });

        transaction.emit({
          kind: "cc.calendar_set",
          next: Object.freeze({
            ...state.calendar,
            stamina: state.calendar.stamina - activity.stamina,
          }),
        });
        transaction.emit({ kind: "cc.cat_set", next: Object.freeze(cat) });
        transaction.emit({ kind: "cc.shop_set", next: Object.freeze(shop) });
        for (const event of encounterEvents) transaction.emit(event);
        return transaction.complete();
      }),
  });
