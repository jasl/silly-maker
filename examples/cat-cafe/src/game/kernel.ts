// SPDX-License-Identifier: MIT
// Simulation kernel: shared command/event/verdict types, schema helpers, and effect-row rules.
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
  StageMutation,
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseStageMutation,
} from "@sillymaker/base/story";

import type {
  CatcafeCalendarStateV1,
  CatcafeCatStateV1,
  CatcafeContestStateV1,
  CatcafeGameStateV1,
  CatcafeShopStateV1,
} from "./state.ts";
import {
  catcafeCalendarStateSchemaV1,
  catcafeContestStateSchemaV1,
  catcafeNarrativeStateSchemaV1,
} from "./state.ts";
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

/**
 * The cafe's domain-event union: the only internal authoritative update
 * channel. The `*_set` / `advanced` / `stage_changed` events fold module
 * state; the broadcast events (slot/petted/contest/postgame/encounter/
 * interaction) are journal-only evidence for UI/tests — no module reduces
 * them.
 */
export type CatcafeEventV1 =
  // ---- State-folding events (exactly one per stateful slice).
  | { readonly kind: "cc.calendar_set"; readonly next: CatcafeCalendarStateV1 }
  | { readonly kind: "cc.cat_set"; readonly next: CatcafeCatStateV1 }
  | { readonly kind: "cc.shop_set"; readonly next: CatcafeShopStateV1 }
  | { readonly kind: "cc.contest_set"; readonly next: CatcafeContestStateV1 | null }
  | { readonly kind: "cc.narrative_advanced"; readonly next: CatcafeNarrativeStateV1 }
  | { readonly kind: "cc.stage_changed"; readonly mutations: readonly StageMutation[] }
  // ---- Journal-only broadcast events.
  | {
    readonly kind: "cc.slot_advanced";
    readonly week: number;
    readonly day: number;
    readonly slot: number;
  }
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
  readonly event: CatcafeEventV1;
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
  CatcafeEventV1,
  CatcafeRejectionV1,
  CatcafeFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const kit = createGameAuthoringKit<CatcafeSimulationTypesV1>();

export const clampV1 = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return ({ parse: (value: unknown) => value as T });
}

function keysV1(record: Record<string, unknown>): string {
  return Object.keys(record).toSorted().join("\u0000");
}

function parseIntegerV1(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`invalid catcafe event: ${label} must be a safe integer`);
  }
  return value;
}

/**
 * Runtime admission for the domain-event journal. Folding events with
 * pre-clamp payloads (cat/shop) check field shape only — the reducers clamp;
 * folding events that carry already-valid state (calendar/contest/narrative)
 * reuse the slice schemas.
 */
export const catcafeEventSchemaV1: RuntimeSchemaV1<CatcafeEventV1> = {
  parse(value: unknown): CatcafeEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid catcafe event");
    }
    const record = value as Record<string, unknown>;
    switch (record.kind) {
      case "cc.calendar_set": {
        if (keysV1(record) !== "kind\u0000next") throw new TypeError("invalid cc.calendar_set");
        return ({
          kind: record.kind,
          next: catcafeCalendarStateSchemaV1.parse(record.next),
        });
      }
      case "cc.cat_set": {
        if (
          keysV1(record) !== "kind\u0000next" || record.next === null ||
          typeof record.next !== "object"
        ) {
          throw new TypeError("invalid cc.cat_set");
        }
        const next = record.next as Record<string, unknown>;
        return ({
          kind: record.kind,
          next: {
            trust: parseIntegerV1(next.trust, "cat.trust"),
            vigor: parseIntegerV1(next.vigor, "cat.vigor"),
            skill: parseIntegerV1(next.skill, "cat.skill"),
            fishBuff: parseIntegerV1(next.fishBuff, "cat.fishBuff"),
            pettingLeft: parseIntegerV1(next.pettingLeft, "cat.pettingLeft"),
          },
        });
      }
      case "cc.shop_set": {
        if (
          keysV1(record) !== "kind\u0000next" || record.next === null ||
          typeof record.next !== "object"
        ) {
          throw new TypeError("invalid cc.shop_set");
        }
        const next = record.next as Record<string, unknown>;
        if (next.epilogue !== null && typeof next.epilogue !== "string") {
          throw new TypeError("invalid cc.shop_set epilogue");
        }
        return ({
          kind: record.kind,
          next: {
            reputation: parseIntegerV1(next.reputation, "shop.reputation"),
            tidiness: parseIntegerV1(next.tidiness, "shop.tidiness"),
            money: parseIntegerV1(next.money, "shop.money"),
            trophies: parseIntegerV1(next.trophies, "shop.trophies"),
            epilogue: next.epilogue,
          },
        });
      }
      case "cc.contest_set": {
        if (keysV1(record) !== "kind\u0000next") throw new TypeError("invalid cc.contest_set");
        return ({
          kind: record.kind,
          next: catcafeContestStateSchemaV1.parse(record.next),
        });
      }
      case "cc.narrative_advanced": {
        if (keysV1(record) !== "kind\u0000next") {
          throw new TypeError("invalid cc.narrative_advanced");
        }
        return ({
          kind: record.kind,
          next: catcafeNarrativeStateSchemaV1.parse(record.next),
        });
      }
      case "cc.stage_changed": {
        if (keysV1(record) !== "kind\u0000mutations" || !Array.isArray(record.mutations)) {
          throw new TypeError("invalid cc.stage_changed");
        }
        return ({
          kind: record.kind,
          mutations: record.mutations.map((mutation, index) =>
            parseStageMutation(mutation, `/mutations/${String(index)}`)
          ),
        });
      }
      case "cc.slot_advanced": {
        if (keysV1(record) !== "day\u0000kind\u0000slot\u0000week") {
          throw new TypeError("invalid cc.slot_advanced");
        }
        return ({
          kind: record.kind,
          week: parseIntegerV1(record.week, "week"),
          day: parseIntegerV1(record.day, "day"),
          slot: parseIntegerV1(record.slot, "slot"),
        });
      }
      case "cc.petted": {
        if (
          keysV1(record) !== "kind\u0000reactionId\u0000trustDelta\u0000zone" ||
          typeof record.zone !== "string" || typeof record.reactionId !== "string"
        ) {
          throw new TypeError("invalid cc.petted");
        }
        return ({
          kind: record.kind,
          zone: record.zone,
          reactionId: record.reactionId,
          trustDelta: parseIntegerV1(record.trustDelta, "trustDelta"),
        });
      }
      case "cc.contest_started": {
        if (keysV1(record) !== "kind\u0000rivalId" || typeof record.rivalId !== "string") {
          throw new TypeError("invalid cc.contest_started");
        }
        return ({ kind: record.kind, rivalId: record.rivalId });
      }
      case "cc.contest_resolved": {
        if (
          keysV1(record) !== "kind\u0000morale\u0000moveId\u0000rivalMorale" ||
          typeof record.moveId !== "string"
        ) {
          throw new TypeError("invalid cc.contest_resolved");
        }
        return ({
          kind: record.kind,
          moveId: record.moveId,
          rivalMorale: parseIntegerV1(record.rivalMorale, "rivalMorale"),
          morale: parseIntegerV1(record.morale, "morale"),
        });
      }
      case "cc.contest_won": {
        if (
          keysV1(record) !== "albumId\u0000kind\u0000rivalId" ||
          typeof record.rivalId !== "string" || typeof record.albumId !== "string"
        ) {
          throw new TypeError("invalid cc.contest_won");
        }
        return ({
          kind: record.kind,
          rivalId: record.rivalId,
          albumId: record.albumId,
        });
      }
      case "cc.contest_lost": {
        if (keysV1(record) !== "kind\u0000rivalId" || typeof record.rivalId !== "string") {
          throw new TypeError("invalid cc.contest_lost");
        }
        return ({ kind: record.kind, rivalId: record.rivalId });
      }
      case "cc.album_unlocked": {
        if (keysV1(record) !== "albumId\u0000kind" || typeof record.albumId !== "string") {
          throw new TypeError("invalid cc.album_unlocked");
        }
        return ({ kind: record.kind, albumId: record.albumId });
      }
      case "cc.postgame_entered": {
        if (keysV1(record) !== "ending\u0000kind" || typeof record.ending !== "string") {
          throw new TypeError("invalid cc.postgame_entered");
        }
        return ({ kind: record.kind, ending: record.ending });
      }
      case "cc.encounter": {
        if (
          keysV1(record) !== "encounterId\u0000explanation\u0000kind\u0000textId" ||
          typeof record.encounterId !== "string" ||
          (record.textId !== null && typeof record.textId !== "string") ||
          record.explanation === null || typeof record.explanation !== "object"
        ) {
          throw new TypeError("invalid cc.encounter");
        }
        // The explanation is produced by the engine's own event-pool draw in
        // the same commit; a structural check is sufficient at this boundary.
        return ({
          kind: record.kind,
          encounterId: record.encounterId,
          textId: record.textId,
          explanation: record.explanation as EventPoolDrawExplanationV1,
        });
      }
      case "cc.interaction_resolved": {
        if (
          keysV1(record) !== "definitionId\u0000kind\u0000occurrenceId" ||
          typeof record.definitionId !== "string" || typeof record.occurrenceId !== "string"
        ) {
          throw new TypeError("invalid cc.interaction_resolved");
        }
        return ({
          kind: record.kind,
          definitionId: record.definitionId,
          occurrenceId: record.occurrenceId,
        });
      }
      default:
        throw new TypeError("invalid catcafe event kind");
    }
  },
};

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

export const commandSchemaV1: RuntimeSchemaV1<CatcafeCommandV1> = {
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
      return ({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    }
    if (kind === "cc.do_activity") {
      if (keys !== "activityId\u0000kind" || typeof record.activityId !== "string") {
        throw new TypeError("invalid catcafe activity command");
      }
      return ({ kind, activityId: record.activityId });
    }
    if (kind === "cc.pet") {
      if (keys !== "kind\u0000zone" || typeof record.zone !== "string") {
        throw new TypeError("invalid catcafe pet command");
      }
      return ({ kind, zone: record.zone });
    }
    if (kind === "cc.contest_move") {
      if (keys !== "kind\u0000moveId" || typeof record.moveId !== "string") {
        throw new TypeError("invalid catcafe contest command");
      }
      return ({ kind, moveId: record.moveId });
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
    return ({ kind });
  },
};
