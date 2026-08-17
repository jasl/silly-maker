// SPDX-License-Identifier: MIT
// Simulation kernel: shared command/fact/verdict types, schema helpers, and effect-row rules.
// Feature slices (features/*) take shared shapes from here; aggregation in simulation.ts.
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import type { EventPoolDrawExplanationV1 } from "@sillymaker/base";
import type { AudioIntentV1 } from "@sillymaker/base";
import type {
  InteractionRejectionCode,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
} from "@sillymaker/base/story";

import type { CatcafeContestStateV1, CatcafeGameStateV1 } from "./state.ts";
import type { CatcafeNarrativeStateV1 } from "./features/dialogue/script.ts";

export type CatcafeCommandV1 =
  | { readonly kind: "cc.begin_story" }
  | { readonly kind: "cc.advance_slot" }
  | { readonly kind: "cc.enter_postgame" }
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
  | { readonly kind: "cc.postgame_entered"; readonly ending: string }
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
  | "cc.no_ending_pending"
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

/** Tuning commands: the same atomic commit path as normal commands; log entries marked source:"debug". */
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
  /** Continuous audio intent (BGM/ambient rain): a pure view projection; a load restores it. */
  readonly audio: AudioIntentV1;
}

export interface CatcafeBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface CatcafeSimulationTypesV1 extends
  GameSimulationTypeMapV1<
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

export const kit = createGameAuthoringKit<CatcafeSimulationTypesV1>();

export const clampV1 = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function operationSchemaV1<T>(label: string): RuntimeSchemaV1<T> {
  return Object.freeze({
    parse(value: unknown): T {
      if (value === null || typeof value !== "object") {
        throw new TypeError(`invalid catcafe ${label} operation`);
      }
      return value as T;
    },
  });
}

export function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

/** Apply content-table effect rows onto the cat/shop drafts; the activity path enables the fresh-fish special case. */
export function applyStatEffectsV1(
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

export const commandSchemaV1: RuntimeSchemaV1<CatcafeCommandV1> = Object.freeze({
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
    if (
      kind !== "cc.begin_story" &&
      kind !== "cc.advance_slot" &&
      kind !== "cc.enter_contest" &&
      kind !== "cc.enter_postgame"
    ) {
      throw new TypeError("invalid catcafe command kind");
    }
    return Object.freeze({ kind });
  },
});
