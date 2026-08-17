// SPDX-License-Identifier: MIT
// Tuning slice: schema, validation, and execution of debug commands. Same atomic
// commit path as normal commands, log entries marked source:"debug"; replay routes through the debug executor.
import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1, drawFromEventPoolV1 } from "@sillymaker/base";

import { catcafeDailyPettingV1, catcafeDailyStaminaV1 } from "../../state.ts";
import { catcafeEncountersV1 } from "../../content.ts";
import type {
  CatcafeAttemptV1,
  CatcafeDebugCommandV1,
  CatcafeDebugValidationErrorV1,
  CatcafeSnapshotV1,
} from "../../kernel.ts";
import { applyStatEffectsV1, catcafeDebugStatsV1, clampV1 } from "../../kernel.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { calendarModuleV1 } from "../calendar/module.ts";
import { catModuleV1 } from "../cat/module.ts";
import { catcafeGrowthMutationV1 } from "../cat/growth.ts";
import { shopModuleV1 } from "../shop/module.ts";
import { stageModuleV1 } from "../stage/module.ts";

export const catcafeDebugCommandSchemaV1: RuntimeSchemaV1<CatcafeDebugCommandV1> = Object.freeze({
  parse(value: unknown): CatcafeDebugCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid catcafe debug command");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).toSorted().join("\u0000");
    switch (record.kind) {
      case "cc.debug.set_stat":
        if (
          keys !== "kind\u0000stat\u0000value" ||
          typeof record.stat !== "string" ||
          typeof record.value !== "number" ||
          !Number.isSafeInteger(record.value)
        ) {
          throw new TypeError("invalid catcafe debug set_stat command");
        }
        return Object.freeze({ kind: record.kind, stat: record.stat, value: record.value });
      case "cc.debug.advance_days":
        if (
          keys !== "days\u0000kind" ||
          typeof record.days !== "number" ||
          !Number.isSafeInteger(record.days)
        ) {
          throw new TypeError("invalid catcafe debug advance_days command");
        }
        return Object.freeze({ kind: record.kind, days: record.days });
      case "cc.debug.force_encounter":
        if (keys !== "encounterId\u0000kind" || typeof record.encounterId !== "string") {
          throw new TypeError("invalid catcafe debug force_encounter command");
        }
        return Object.freeze({ kind: record.kind, encounterId: record.encounterId });
      default:
        throw new TypeError("invalid catcafe debug command kind");
    }
  },
});

export interface CatcafeDebugCommandExecutorV1 {
  validate(
    snapshot: CatcafeSnapshotV1,
    command: CatcafeDebugCommandV1,
    context: undefined,
  ):
    | { readonly kind: "allowed" }
    | {
      readonly kind: "validation_failed";
      readonly errors: readonly CatcafeDebugValidationErrorV1[];
    };
  executeAttempt(
    snapshot: CatcafeSnapshotV1,
    command: CatcafeDebugCommandV1,
    context: undefined,
  ): CatcafeAttemptV1;
}

export const catcafeDebugCommandExecutorV1: CatcafeDebugCommandExecutorV1 = Object.freeze({
  validate(snapshot: CatcafeSnapshotV1, command: CatcafeDebugCommandV1) {
    const errors: CatcafeDebugValidationErrorV1[] = [];
    switch (command.kind) {
      case "cc.debug.set_stat": {
        if (!catcafeDebugStatsV1.includes(command.stat as never)) {
          errors.push({ code: "cc.debug.unknown_stat", detail: command.stat });
        }
        const max = command.stat === "shop.money" ? Number.MAX_SAFE_INTEGER : 100;
        if (command.value < 0 || command.value > max) {
          errors.push({ code: "cc.debug.value_out_of_range", detail: String(command.value) });
        }
        break;
      }
      case "cc.debug.advance_days":
        if (command.days < 1 || command.days > 48) {
          errors.push({ code: "cc.debug.days_out_of_range", detail: String(command.days) });
        }
        break;
      case "cc.debug.force_encounter": {
        const row = catcafeEncountersV1.byId(command.encounterId);
        if (row === null || row.textId === null) {
          errors.push({ code: "cc.debug.unknown_encounter", detail: command.encounterId });
        }
        break;
      }
      default: {
        const exhaustive: never = command;
        errors.push({ code: "cc.debug.unknown_command", detail: String(exhaustive) });
      }
    }
    if (snapshot.state.simulation.narrative.phase !== "completed") {
      errors.push({ code: "cc.debug.opening_incomplete" });
    }
    return errors.length === 0
      ? Object.freeze({ kind: "allowed" as const })
      : Object.freeze({ kind: "validation_failed" as const, errors: Object.freeze(errors) });
  },
  executeAttempt(snapshot: CatcafeSnapshotV1, command: CatcafeDebugCommandV1) {
    const rng = createTransactionalRngV1(snapshot.rng);
    const state = snapshot.state.simulation;
    if (command.kind === "cc.debug.set_stat") {
      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        const [scope, field] = command.stat.split(".") as [string, string];
        if (scope === "cat") {
          transaction.propose(catModuleV1, {
            kind: "apply",
            ...state.cat,
            [field]: command.value,
          });
        } else {
          transaction.propose(shopModuleV1, {
            kind: "apply",
            ...state.shop,
            [field]: command.value,
          });
        }
        return transaction.complete();
      });
    }
    if (command.kind === "cc.debug.advance_days") {
      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Fast-forward N days: the calendar lands directly on the morning N days out
        // (tuning semantics: approximate, no per-slot replay); tidiness decays per day, stamina and petting allowance reset.
        const total = state.calendar.day + command.days;
        const week = clampV1(state.calendar.week + Math.floor(total / 7), 1, 9999);
        const day = total % 7;
        transaction.propose(calendarModuleV1, {
          kind: "set",
          next: Object.freeze({ week, day, slot: 0, stamina: catcafeDailyStaminaV1 }),
        });
        transaction.propose(shopModuleV1, {
          kind: "apply",
          ...state.shop,
          tidiness: clampV1(state.shop.tidiness - 10 * command.days, 0, 100),
        });
        transaction.propose(catModuleV1, {
          kind: "apply",
          ...state.cat,
          pettingLeft: catcafeDailyPettingV1,
          facts: [Object.freeze({ kind: "cc.slot_advanced" as const, week, day, slot: 0 })],
        });
        if (state.narrative.phase === "completed") {
          transaction.propose(stageModuleV1, {
            kind: "apply",
            mutations: [catcafeGrowthMutationV1(week, "/debug/appearance")],
          });
        }
        return transaction.complete();
      });
    }
    if (command.kind === "cc.debug.force_encounter") {
      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        const draw = drawFromEventPoolV1({
          candidates: catcafeEncountersV1.rows().map((row) => ({
            eventId: row.id,
            weight: row.weight,
            condition: null, // Tuning preview: skip eligibility (force here means "named preview").
          })),
          context: { numbers: {}, flags: [], labels: {} },
          rng,
          purpose: "check:cc.debug_encounter",
          force: command.encounterId,
        });
        if (draw.kind !== "drawn") throw new TypeError("forced draw must resolve");
        const row = catcafeEncountersV1.byId(draw.eventId);
        if (row === null) throw new TypeError("validated encounter must exist");
        const cat = { ...state.cat };
        const shop = { ...state.shop };
        applyStatEffectsV1(cat, shop, row.effects, { fishBuffDoublesTrust: false });
        transaction.propose(catModuleV1, {
          kind: "apply",
          ...cat,
          facts: [
            Object.freeze({
              kind: "cc.encounter" as const,
              encounterId: draw.eventId,
              textId: row.textId,
              explanation: draw.explanation,
            }),
          ],
        });
        transaction.propose(shopModuleV1, { kind: "apply", ...shop });
        return transaction.complete();
      });
    }
    const exhaustive: never = command;
    throw new TypeError(`unknown catcafe debug command ${String(exhaustive)}`);
  },
});
