// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  BootstrapEntropyV1,
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createTransactionalRngV1, drawFromEventPoolV1 } from "@sillymaker/base";
import type { EventPoolDrawExplanationV1 } from "@sillymaker/base";
import type {
  GameSimulation,
  InteractionRejectionCode,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageMutation,
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  defineGameSimulation,
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseStageMutation,
  reduceStageMutations,
} from "@sillymaker/base/story";

import type { CatcafeCalendarStateV1, CatcafeContestStateV1, CatcafeGameStateV1 } from "./state.ts";
import {
  catcafeCalendarStateSchemaV1,
  catcafeCatStateSchemaV1,
  catcafeContestStateSchemaV1,
  catcafeDailyPettingV1,
  catcafeDailyStaminaV1,
  catcafeGameStateSchemaV1,
  catcafeNarrativeStateSchemaV1,
  catcafeShopStateSchemaV1,
  catcafeStageStateSchemaV1,
  createInitialCatcafeGameStateV1,
  createInitialCatcafeStageStateV1,
} from "./state.ts";
import type { CatcafeNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialCatcafeNarrativeStateV1,
  runCatcafeNarrativeUntilInteractionV1,
  catcafeInteractionContextV1,
  catcafeNarrativeAfterResolutionV1,
  catcafeNarrativeAtBeginV1,
} from "./narrative.ts";
import {
  catcafeActivitiesV1,
  catcafeEncounterConditionsV1,
  catcafeEncountersV1,
  catcafeMovesV1,
  catcafePettingV1,
  catcafeRivalsV1,
  catcafeSlotsV1,
  catcafeStageForWeekV1,
} from "./content.ts";

/**
 * 《雨巷猫舍》的模拟：六个模块（日历/猫/竞赛/叙事/店铺/舞台）与一个
 * 内容表驱动的命令执行器。规则读内容数据库（只读静态定义），效果经
 * 模块 owner 原子提交（动态状态）。
 */

export type CatcafeCommandV1 =
  | { readonly kind: "cc.begin_story" }
  | { readonly kind: "cc.advance_slot" }
  | { readonly kind: "cc.do_activity"; readonly activityId: string }
  | { readonly kind: "cc.pet"; readonly zone: string }
  | { readonly kind: "cc.enter_contest" }
  | { readonly kind: "cc.contest_move"; readonly moveId: string }
  | {
      readonly kind: "cc.narrative_resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type CatcafeFactV1 =
  | {
      readonly kind: "cc.slot_advanced";
      readonly week: number;
      readonly day: number;
      readonly slot: number;
    }
  | { readonly kind: "cc.activity_done"; readonly activityId: string }
  | {
      readonly kind: "cc.petted";
      readonly zone: string;
      readonly reactionId: string;
      readonly trustDelta: number;
    }
  | { readonly kind: "cc.contest_started"; readonly rivalId: string }
  | {
      readonly kind: "cc.contest_resolved";
      readonly moveId: string;
      readonly rivalMorale: number;
      readonly morale: number;
    }
  | { readonly kind: "cc.contest_won"; readonly rivalId: string; readonly albumId: string }
  | { readonly kind: "cc.contest_lost"; readonly rivalId: string }
  | { readonly kind: "cc.album_unlocked"; readonly albumId: string }
  | {
      readonly kind: "cc.encounter";
      readonly encounterId: string;
      readonly textId: string | null;
      readonly explanation: EventPoolDrawExplanationV1;
    }
  | { readonly kind: "cc.stage_changed"; readonly mutations: number }
  | {
      readonly kind: "cc.interaction_resolved";
      readonly definitionId: string;
      readonly occurrenceId: string;
    };

export type CatcafeRejectionCodeV1 =
  | "cc.narrative_busy"
  | "cc.stage_rejected"
  | "cc.activity_unknown"
  | "cc.activity_wrong_slot"
  | "cc.activity_locked"
  | "cc.stamina_exhausted"
  | "cc.money_short"
  | "cc.petting_exhausted"
  | "cc.petting_zone_unknown"
  | "cc.contest_not_today"
  | "cc.contest_already_running"
  | "cc.contest_not_running"
  | "cc.contest_move_unknown"
  | InteractionRejectionCode;

export interface CatcafeRejectionV1 {
  readonly code: CatcafeRejectionCodeV1;
}

export interface CatcafeFaultV1 {
  readonly code: "cc.executor_failed";
}

/** 调参命令：与正常命令同一原子提交路径，日志按 source:"debug" 标记。 */
export type CatcafeDebugCommandV1 =
  | { readonly kind: "cc.debug.set_stat"; readonly stat: string; readonly value: number }
  | { readonly kind: "cc.debug.advance_days"; readonly days: number }
  | { readonly kind: "cc.debug.force_encounter"; readonly encounterId: string };

export interface CatcafeDebugValidationErrorV1 {
  readonly code: string;
  readonly detail?: string;
}

export const catcafeDebugStatsV1 = [
  "cat.trust",
  "cat.vigor",
  "cat.skill",
  "shop.reputation",
  "shop.tidiness",
  "shop.money",
] as const;

export interface CatcafeQueriesV1 {
  readonly calendar: CatcafeGameStateV1["simulation"]["calendar"];
  readonly cat: CatcafeGameStateV1["simulation"]["cat"];
  readonly shop: CatcafeGameStateV1["simulation"]["shop"];
  readonly contest: CatcafeContestStateV1 | null;
  readonly stage: SemanticStageState;
  readonly narrative: CatcafeNarrativeStateV1;
}

export interface CatcafeChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: null;
}

export interface CatcafeNarrativeViewV1 {
  readonly phase: CatcafeNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly CatcafeChoiceOptionViewV1[] | null;
  readonly flags: readonly string[];
  readonly history: NarrativeHistory;
}

export interface CatcafeGameViewV1 {
  readonly calendar: CatcafeGameStateV1["simulation"]["calendar"];
  readonly cat: CatcafeGameStateV1["simulation"]["cat"];
  readonly shop: CatcafeGameStateV1["simulation"]["shop"];
  readonly contest: CatcafeContestStateV1 | null;
  readonly catStage: number;
  readonly ending: string | null;
  readonly stage: SemanticStageState;
}

export interface CatcafeBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface CatcafeSimulationTypesV1 extends GameSimulationTypeMapV1<
  CatcafeBootstrapInputV1,
  CatcafeGameStateV1,
  RngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<CatcafeGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: CatcafeCommandV1;
  readonly fact: CatcafeFactV1;
  readonly rejection: CatcafeRejectionV1;
  readonly fault: CatcafeFaultV1;
  readonly debugCommand: CatcafeDebugCommandV1;
  readonly debugValidationError: CatcafeDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: CatcafeQueriesV1;
  readonly viewModel: CatcafeGameViewV1;
}

export type CatcafeSnapshotV1 = CatcafeSimulationTypesV1["snapshot"];
export type CatcafeAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  CatcafeSnapshotV1,
  CatcafeFactV1,
  CatcafeRejectionV1,
  CatcafeFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

// ---------------------------------------------------------------------------
// 模块操作与 schema。
// ---------------------------------------------------------------------------

type CalendarOperationV1 =
  | { readonly kind: "advance" }
  | { readonly kind: "spend"; readonly stamina: number }
  | { readonly kind: "set"; readonly next: CatcafeCalendarStateV1 };

type CatOperationV1 = {
  readonly kind: "apply";
  readonly trust: number;
  readonly vigor: number;
  readonly skill: number;
  readonly fishBuff: number;
  readonly pettingLeft: number;
  readonly facts?: readonly CatcafeFactV1[];
};

type ShopOperationV1 = {
  readonly kind: "apply";
  readonly reputation: number;
  readonly tidiness: number;
  readonly money: number;
  readonly trophies: number;
  readonly facts?: readonly CatcafeFactV1[];
};

type ContestOperationV1 = {
  readonly kind: "set";
  readonly next: CatcafeContestStateV1 | null;
  readonly facts?: readonly CatcafeFactV1[];
};

type StageOperationV1 = { readonly kind: "apply"; readonly mutations: readonly StageMutation[] };

type NarrativeOperationV1 =
  | { readonly kind: "begin"; readonly next: CatcafeNarrativeStateV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
      readonly next: CatcafeNarrativeStateV1;
    };

const commandSchemaV1: RuntimeSchemaV1<CatcafeCommandV1> = Object.freeze({
  parse(value: unknown): CatcafeCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid catcafe command");
    }
    const record = value as Record<string, unknown>;
    const kind = record.kind;
    const keys = Object.keys(record).toSorted().join("\u0000");
    if (kind === "cc.narrative_resolve") {
      if (keys !== "expectedOccurrenceId\u0000kind\u0000resolution") {
        throw new TypeError("invalid catcafe narrative resolve command");
      }
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    }
    if (kind === "cc.do_activity") {
      if (keys !== "activityId\u0000kind" || typeof record.activityId !== "string") {
        throw new TypeError("invalid catcafe activity command");
      }
      return Object.freeze({ kind, activityId: record.activityId });
    }
    if (kind === "cc.pet") {
      if (keys !== "kind\u0000zone" || typeof record.zone !== "string") {
        throw new TypeError("invalid catcafe pet command");
      }
      return Object.freeze({ kind, zone: record.zone });
    }
    if (kind === "cc.contest_move") {
      if (keys !== "kind\u0000moveId" || typeof record.moveId !== "string") {
        throw new TypeError("invalid catcafe contest command");
      }
      return Object.freeze({ kind, moveId: record.moveId });
    }
    if (keys !== "kind") throw new TypeError("invalid catcafe command");
    if (kind !== "cc.begin_story" && kind !== "cc.advance_slot" && kind !== "cc.enter_contest") {
      throw new TypeError("invalid catcafe command kind");
    }
    return Object.freeze({ kind });
  },
});

function operationSchemaV1<T>(label: string): RuntimeSchemaV1<T> {
  return Object.freeze({
    parse(value: unknown): T {
      if (value === null || typeof value !== "object") {
        throw new TypeError(`invalid catcafe ${label} operation`);
      }
      return value as T;
    },
  });
}

function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<CatcafeDebugCommandV1> = Object.freeze({
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
          throw new TypeError("invalid catcafe debug set_stat");
        }
        return Object.freeze({ kind: "cc.debug.set_stat", stat: record.stat, value: record.value });
      case "cc.debug.advance_days":
        if (
          keys !== "days\u0000kind" ||
          typeof record.days !== "number" ||
          !Number.isSafeInteger(record.days)
        ) {
          throw new TypeError("invalid catcafe debug advance_days");
        }
        return Object.freeze({ kind: "cc.debug.advance_days", days: record.days });
      case "cc.debug.force_encounter":
        if (keys !== "encounterId\u0000kind" || typeof record.encounterId !== "string") {
          throw new TypeError("invalid catcafe debug force_encounter");
        }
        return Object.freeze({ kind: "cc.debug.force_encounter", encounterId: record.encounterId });
      default:
        throw new TypeError("invalid catcafe debug command kind");
    }
  },
});

const kit = createGameAuthoringKit<CatcafeSimulationTypesV1>();

const clampV1 = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const calendarModuleV1 = kit.defineStatefulModule({
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

function applyCalendarV1(
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
    week: clampV1(rollWeek ? state.week + 1 : state.week, 1, 7),
    day: rollWeek ? 0 : nextDay,
    slot: 0,
    stamina: catcafeDailyStaminaV1,
  });
}

const catModuleV1 = kit.defineStatefulModule({
  id: "catcafe.cat",
  contractRevision: 1,
  state: {
    slot: "simulation.cat",
    schema: catcafeCatStateSchemaV1,
    initial: () =>
      Object.freeze({
        trust: 10,
        vigor: 60,
        skill: 0,
        fishBuff: 0,
        pettingLeft: catcafeDailyPettingV1,
      }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<CatOperationV1>("cat"),
    propose: (_state, operation) =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      }),
    apply: (_state, proposal) => {
      const next = proposal.payload;
      return Object.freeze({
        trust: clampV1(next.trust, 0, 100),
        vigor: clampV1(next.vigor, 0, 100),
        skill: clampV1(next.skill, 0, 100),
        fishBuff: clampV1(next.fishBuff, 0, 3),
        pettingLeft: clampV1(next.pettingLeft, 0, catcafeDailyPettingV1),
      });
    },
  },
});

const shopModuleV1 = kit.defineStatefulModule({
  id: "catcafe.shop",
  contractRevision: 1,
  state: {
    slot: "simulation.shop",
    schema: catcafeShopStateSchemaV1,
    initial: () => Object.freeze({ reputation: 10, tidiness: 60, money: 50, trophies: 0 }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<ShopOperationV1>("shop"),
    propose(state, operation) {
      if (operation.money < 0) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "cc.money_short" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      });
    },
    apply: (_state, proposal) => {
      const next = proposal.payload;
      return Object.freeze({
        reputation: clampV1(next.reputation, 0, 100),
        tidiness: clampV1(next.tidiness, 0, 100),
        money: next.money,
        trophies: clampV1(next.trophies, 0, 3),
      });
    },
  },
});

const contestModuleV1 = kit.defineStatefulModule({
  id: "catcafe.contest",
  contractRevision: 1,
  state: {
    slot: "simulation.contest",
    schema: catcafeContestStateSchemaV1,
    initial: () => null,
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<ContestOperationV1>("contest"),
    propose: (_state, operation) =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      }),
    apply: (_state, proposal) => proposal.payload.next,
  },
});

const narrativeModuleV1 = kit.defineStatefulModule({
  id: "catcafe.narrative",
  contractRevision: 1,
  state: {
    slot: "simulation.narrative",
    schema: catcafeNarrativeStateSchemaV1,
    initial: () => createInitialCatcafeNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<NarrativeOperationV1>("narrative"),
    propose(state, operation) {
      if (operation.kind === "begin") {
        if (state.pending !== null) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "cc.narrative_busy" as const }),
          });
        }
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({ payload: operation, facts: Object.freeze([]) }),
        });
      }
      const outcome = evaluateInteractionResolution(
        state.pending,
        operation.expectedOccurrenceId,
        operation.resolution,
        catcafeInteractionContextV1(state.pending, Number.MAX_SAFE_INTEGER),
      );
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: outcome.code }),
        });
      }
      const pending = state.pending;
      if (pending === null) throw new TypeError("accepted resolution without pending");
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "cc.interaction_resolved" as const,
              definitionId: pending.definitionId,
              occurrenceId: pending.occurrenceId,
            }),
          ]),
        }),
      });
    },
    apply: (_state, proposal) => proposal.payload.next,
  },
});

const stageModuleV1 = kit.defineStatefulModule({
  id: "catcafe.stage",
  contractRevision: 1,
  state: {
    slot: "simulation.stage",
    schema: catcafeStageStateSchemaV1,
    initial: () => createInitialCatcafeStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<StageOperationV1>("stage"),
    propose(state, operation) {
      const mutations = operation.mutations.map((mutation, index) =>
        parseStageMutation(mutation, `/mutations/${String(index)}`),
      );
      const outcome = reduceStageMutations(state, mutations);
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "cc.stage_rejected" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({ kind: "cc.stage_changed" as const, mutations: mutations.length }),
          ]),
        }),
      });
    },
    apply: (state, proposal) => {
      const outcome = reduceStageMutations(state, proposal.payload.mutations);
      if (outcome.kind !== "applied") throw new TypeError("validated catcafe stage must apply");
      return outcome.state;
    },
  },
});

const compositionV1 = kit.composeModules([
  calendarModuleV1,
  catModuleV1,
  contestModuleV1,
  narrativeModuleV1,
  shopModuleV1,
  stageModuleV1,
]);

type CatcafeModulesV1 = typeof compositionV1.modules;

type CatcafeCommandExecutorV1 = {
  executeAttempt(
    snapshot: CatcafeSnapshotV1,
    command: CatcafeCommandV1,
    context: undefined,
  ): CatcafeAttemptV1;
};

type CatcafeDebugCommandExecutorV1 = {
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
};

export type CatcafeGameSimulationV1 = GameSimulation<
  CatcafeSimulationTypesV1,
  CatcafeModulesV1,
  CatcafeCommandExecutorV1,
  CatcafeDebugCommandExecutorV1
>;

const transactionRunnerV1 = compositionV1.createTransactionRunner({
  stateSchema: catcafeGameStateSchemaV1,
  createFault: () => Object.freeze({ code: "cc.executor_failed" as const }),
});

/**
 * 结局判定：第 7 周运动会结束（周日夜时段）后结算。
 * 冠军线（三奖杯）> 招牌线（信任+声誉）> 领养线（低信任高声誉）> 默认线。
 */
export type CatcafeEndingV1 = "champion" | "signboard" | "adopted" | "ordinary";

export function catcafeEndingForV1(
  state: CatcafeGameStateV1["simulation"],
): CatcafeEndingV1 | null {
  const calendar = state.calendar;
  const afterFinal =
    calendar.week === 7 && calendar.day === 6 && catcafeSlotsV1[calendar.slot] === "night";
  if (!afterFinal || state.contest !== null) return null;
  if (state.shop.trophies >= 3) return "champion";
  if (state.cat.trust >= 80 && state.shop.reputation >= 60) return "signboard";
  if (state.cat.trust < 50 && state.shop.reputation >= 60) return "adopted";
  return "ordinary";
}

/** 把内容表效果行叠加到猫/店铺草稿上；活动路径启用鲜鱼加成特例。 */
function applyStatEffectsV1(
  cat: { trust: number; vigor: number; skill: number; fishBuff: number; pettingLeft: number },
  shop: { reputation: number; tidiness: number; money: number; trophies: number },
  effects: readonly { readonly stat: string; readonly delta: number }[],
  options: { readonly fishBuffDoublesTrust: boolean },
): void {
  for (const effect of effects) {
    switch (effect.stat) {
      case "cat.trust": {
        const doubled = options.fishBuffDoublesTrust && effect.delta > 0 && cat.fishBuff > 0;
        cat.trust += doubled ? effect.delta * 2 : effect.delta;
        if (doubled) cat.fishBuff -= 1;
        break;
      }
      case "cat.vigor":
        cat.vigor += effect.delta;
        break;
      case "cat.skill":
        cat.skill += effect.delta;
        break;
      case "cat.fishBuff":
        cat.fishBuff += effect.delta;
        break;
      case "shop.reputation":
        shop.reputation += effect.delta;
        break;
      case "shop.tidiness":
        shop.tidiness += effect.delta;
        break;
      case "shop.money":
        shop.money += effect.delta;
        break;
      default:
        break;
    }
  }
}

/** 今天是否运动会日：3/5/7 周的周日暮时段。 */
export function catcafeContestTodayV1(
  calendar: CatcafeGameStateV1["simulation"]["calendar"],
): string | null {
  if (calendar.day !== 6 || catcafeSlotsV1[calendar.slot] !== "dusk") return null;
  const rival = catcafeRivalsV1.findFirst({ where: { week: calendar.week } });
  return rival?.id ?? null;
}

export function createCatcafeGameSimulationV1(): CatcafeGameSimulationV1 {
  const commandExecutor: CatcafeCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      if (command.kind === "cc.begin_story") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "cc.narrative_busy" });
          }
          const run = runCatcafeNarrativeUntilInteractionV1(
            catcafeNarrativeAtBeginV1(state.narrative),
            state.stage,
          );
          transaction.propose(narrativeModuleV1, { kind: "begin", next: run.narrative });
          if (run.stageMutations.length > 0) {
            transaction.propose(stageModuleV1, { kind: "apply", mutations: run.stageMutations });
          }
          return transaction.complete();
        });
      }

      if (command.kind === "cc.narrative_resolve") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          const outcome = evaluateInteractionResolution(
            state.narrative.pending,
            command.expectedOccurrenceId,
            command.resolution,
            catcafeInteractionContextV1(state.narrative.pending, state.shop.money),
          );
          if (outcome.kind === "rejected") return transaction.reject({ code: outcome.code });
          const run = runCatcafeNarrativeUntilInteractionV1(
            catcafeNarrativeAfterResolutionV1(state.narrative, command.resolution),
            state.stage,
          );
          transaction.propose(narrativeModuleV1, {
            kind: "resolve",
            expectedOccurrenceId: command.expectedOccurrenceId,
            resolution: command.resolution,
            next: run.narrative,
          });
          if (run.stageMutations.length > 0) {
            transaction.propose(stageModuleV1, { kind: "apply", mutations: run.stageMutations });
          }
          return transaction.complete();
        });
      }

      if (command.kind === "cc.advance_slot") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // 日常玩法在开场叙事完成后解锁。
          if (state.narrative.phase !== "completed") {
            return transaction.reject({ code: "cc.narrative_busy" });
          }
          transaction.propose(calendarModuleV1, { kind: "advance" });
          const next = applyCalendarV1(state.calendar, { kind: "advance" });
          // 跨日：整洁自然下降、抚摸余量重置。
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
          }
          return transaction.complete();
        });
      }

      if (command.kind === "cc.do_activity") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
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

            // 常客事件池：条件对照当前状态，抽取走快照 RNG（重放一致），
            // 效果并入同一事务，解释数据随 fact 落进日志与瞬态效果。
            const draw = drawFromEventPoolV1({
              candidates: catcafeEncountersV1.rows().map((row) => ({
                eventId: row.id,
                weight: row.weight,
                condition: catcafeEncounterConditionsV1.get(row.id) ?? null,
              })),
              context: {
                numbers: {
                  "cat.trust": state.cat.trust,
                  "cat.skill": state.cat.skill,
                  "shop.reputation": state.shop.reputation,
                  "shop.tidiness": state.shop.tidiness,
                  "calendar.week": state.calendar.week,
                },
                flags: state.narrative.flags,
                labels: { slot: catcafeSlotsV1[state.calendar.slot] ?? "morning" },
              },
              rng,
              purpose: "check:cc.encounter",
            });
            if (draw.kind === "drawn") {
              const row = catcafeEncountersV1.byId(draw.eventId);
              if (row !== null && row.textId !== null) {
                applyStatEffectsV1(cat, shop, row.effects, { fishBuffDoublesTrust: false });
                encounterFacts = Object.freeze([
                  Object.freeze({
                    kind: "cc.encounter" as const,
                    encounterId: draw.eventId,
                    textId: row.textId,
                    explanation: draw.explanation,
                  }),
                ]);
              }
            }
          }
          if (shop.money < 0) return transaction.reject({ code: "cc.money_short" });

          transaction.propose(calendarModuleV1, { kind: "spend", stamina: activity.stamina });
          transaction.propose(catModuleV1, { kind: "apply", ...cat, facts: encounterFacts });
          transaction.propose(shopModuleV1, { kind: "apply", ...shop });
          return transaction.complete();
        });
      }

      if (command.kind === "cc.pet") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // 日常玩法在开场叙事完成后解锁。
          if (state.narrative.phase !== "completed") {
            return transaction.reject({ code: "cc.narrative_busy" });
          }
          if (state.cat.pettingLeft < 1)
            return transaction.reject({ code: "cc.petting_exhausted" });
          // 反应查表：(部位, 信任段位) 决定反应与效果。
          const reaction = catcafePettingV1.findFirst({
            where: {
              zone: command.zone,
              minTrust: { lte: state.cat.trust },
              maxTrust: { gte: state.cat.trust },
            },
          });
          if (reaction === null) return transaction.reject({ code: "cc.petting_zone_unknown" });
          transaction.propose(catModuleV1, {
            kind: "apply",
            ...state.cat,
            trust: state.cat.trust + reaction.trustDelta,
            pettingLeft: state.cat.pettingLeft - 1,
            facts: [
              Object.freeze({
                kind: "cc.petted" as const,
                zone: command.zone,
                reactionId: reaction.id,
                trustDelta: reaction.trustDelta,
              }),
            ],
          });
          transaction.propose(stageModuleV1, {
            kind: "apply",
            mutations: [
              parseStageMutation(
                {
                  kind: "setAppearance",
                  layerId: "layer.catcafe.characters",
                  tag: "tag.xiaoyu",
                  appearance: {
                    stage: ["kitten", "junior", "adolescent"][
                      catcafeStageForWeekV1(state.calendar.week)
                    ] as string,
                    expression: reaction.expression,
                  },
                },
                "/pet/appearance",
              ),
            ],
          });
          return transaction.complete();
        });
      }

      if (command.kind === "cc.enter_contest") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // 日常玩法在开场叙事完成后解锁。
          if (state.narrative.phase !== "completed") {
            return transaction.reject({ code: "cc.narrative_busy" });
          }
          if (state.contest !== null) {
            return transaction.reject({ code: "cc.contest_already_running" });
          }
          const rivalId = catcafeContestTodayV1(state.calendar);
          if (rivalId === null) return transaction.reject({ code: "cc.contest_not_today" });
          const rival = catcafeRivalsV1.byId(rivalId);
          if (rival === null) return transaction.reject({ code: "cc.contest_not_today" });
          transaction.propose(contestModuleV1, {
            kind: "set",
            next: Object.freeze({
              rivalId,
              round: 1,
              morale: 30 + Math.floor(state.cat.skill / 2),
              rivalMorale: rival.morale,
              feintActive: false,
            }),
            facts: [Object.freeze({ kind: "cc.contest_started" as const, rivalId })],
          });
          return transaction.complete();
        });
      }

      if (command.kind === "cc.contest_move") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          const contest = state.contest;
          if (contest === null) return transaction.reject({ code: "cc.contest_not_running" });
          const move = catcafeMovesV1.byId(command.moveId);
          if (move === null) return transaction.reject({ code: "cc.contest_move_unknown" });
          const rival = catcafeRivalsV1.byId(contest.rivalId);
          if (rival === null) return transaction.reject({ code: "cc.contest_not_running" });

          // 我方出招：威力 + 技艺加成 + 少量随机。
          const variance = rng.nextInt(
            Object.freeze({ purpose: "check:cc.contest_variance", exclusiveMax: 5 }),
          );
          const damage =
            move.kind === "charm" ? 0 : move.power + Math.floor(state.cat.skill / 10) + variance;
          const selfHeal = move.kind === "charm" ? 12 : 0;
          let rivalMorale = Math.max(0, contest.rivalMorale - damage);
          let morale = contest.morale + selfHeal;

          // 对手回击（按行为模式），佯动可闪避。
          if (rivalMorale > 0) {
            const rivalHit =
              rival.pattern === "aggressive"
                ? rival.power + 3
                : rival.pattern === "steady"
                  ? rival.power
                  : contest.round === 3
                    ? rival.power + 5
                    : Math.max(0, rival.power - 3);
            morale = Math.max(0, morale - (contest.feintActive ? 0 : rivalHit));
          }

          const round = contest.round + 1;
          const finished = rivalMorale === 0 || morale === 0 || round > 3;
          const won = rivalMorale === 0 || (finished && morale > rivalMorale);

          if (!finished) {
            transaction.propose(contestModuleV1, {
              kind: "set",
              next: Object.freeze({
                rivalId: contest.rivalId,
                round,
                morale,
                rivalMorale,
                feintActive: move.kind === "feint",
              }),
              facts: [
                Object.freeze({
                  kind: "cc.contest_resolved" as const,
                  moveId: move.id,
                  rivalMorale,
                  morale,
                }),
              ],
            });
            return transaction.complete();
          }

          if (won) {
            transaction.propose(contestModuleV1, {
              kind: "set",
              next: null,
              facts: [
                Object.freeze({
                  kind: "cc.contest_won" as const,
                  rivalId: contest.rivalId,
                  albumId: rival.trophyAlbumId,
                }),
                Object.freeze({
                  kind: "cc.album_unlocked" as const,
                  albumId: rival.trophyAlbumId,
                }),
              ],
            });
            transaction.propose(shopModuleV1, {
              kind: "apply",
              reputation: clampV1(state.shop.reputation + 10, 0, 100),
              tidiness: state.shop.tidiness,
              money: state.shop.money + 40,
              trophies: clampV1(state.shop.trophies + 1, 0, 3),
            });
            return transaction.complete();
          }
          transaction.propose(contestModuleV1, {
            kind: "set",
            next: null,
            facts: [Object.freeze({ kind: "cc.contest_lost" as const, rivalId: contest.rivalId })],
          });
          return transaction.complete();
        });
      }

      const exhaustive: never = command;
      throw new TypeError(`unknown catcafe command ${String(exhaustive)}`);
    },
  });

  const debugCommandExecutor: CatcafeDebugCommandExecutorV1 = Object.freeze({
    validate(snapshot, command) {
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
    executeAttempt(snapshot, command) {
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
          // 快进 N 天：日历直接落到 N 天后的清晨（调参语义：近似，不重放
          // 每个时段），整洁按天衰减，体力与抚摸余量重置。
          const total = state.calendar.day + command.days;
          const week = clampV1(state.calendar.week + Math.floor(total / 7), 1, 7);
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
          return transaction.complete();
        });
      }
      if (command.kind === "cc.debug.force_encounter") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          const draw = drawFromEventPoolV1({
            candidates: catcafeEncountersV1.rows().map((row) => ({
              eventId: row.id,
              weight: row.weight,
              condition: null, // 调参预览：跳过资格（force 语义在此处是"点名预览"）
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

  return defineGameSimulation<CatcafeSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: catcafeGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    factSchema: passthroughSchemaV1<CatcafeFactV1>(),
    rejectionSchema: passthroughSchemaV1<CatcafeRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<CatcafeDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialCatcafeGameStateV1();
    },
    createQueries(state: CatcafeGameStateV1) {
      return Object.freeze({
        calendar: state.simulation.calendar,
        cat: state.simulation.cat,
        shop: state.simulation.shop,
        contest: state.simulation.contest,
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: CatcafeQueriesV1) {
      return Object.freeze({
        calendar: queries.calendar,
        cat: queries.cat,
        shop: queries.shop,
        contest: queries.contest,
        catStage: catcafeStageForWeekV1(queries.calendar.week),
        ending: catcafeEndingForV1(queries),
        stage: queries.stage,
      });
    },
  });
}
