// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import type { SemanticStageState } from "@sillymaker/base/story";
import {
  createSemanticStageState,
  parseNarrativeHistory,
  parsePendingInteraction,
  parseSemanticStageState,
} from "@sillymaker/base/story";
import { createRuntimeSchemaV1, fromStandardSchemaV1 } from "@sillymaker/base/authoring";

import type { CatcafeNarrativeStateV1 } from "./features/dialogue/script.ts";
import {
  createInitialCatcafeNarrativeStateV1,
  catcafeLayersV1,
  catcafeNodeIdsV1,
} from "./features/dialogue/script.ts";

/**
 * Dynamic state: everything mutable produced while the game runs, all inside modules
 * (atomic commits, saves, rollback). Static definitions (activities/reactions/moves/
 * opponents/album) live in the content database of `content.ts`, read-only at runtime — this boundary is the example's first design principle.
 *
 * Save-compatibility discipline: loads re-parse old Save bytes with THESE
 * schemas, so additive `.optional()`/`.default()` fields are free. A
 * breaking shape change must, in the same commit, bump the revisions in
 * `simulation-definition.ts` (aggregate `stateContractRevision` + the
 * touched module's manifest entry) and register an adjacent migration
 * step (`defineSaveStateMigrationRegistryV1`; pattern:
 * `e2e/src/save-state-migrations.ts`) so existing saves keep loading.
 */

/** Calendar: week (1–7), weekday (0–6, 0=Monday), slot index, today's stamina. */
export interface CatcafeCalendarStateV1 {
  readonly week: number;
  readonly day: number;
  readonly slot: number;
  readonly stamina: number;
}

/** 小雨: trust/vigor/skill 0–100, fresh-fish bonus stacks, today's petting allowance. */
export interface CatcafeCatStateV1 {
  readonly trust: number;
  readonly vigor: number;
  readonly skill: number;
  readonly fishBuff: number;
  readonly pettingLeft: number;
}

/** Shop: reputation/tidiness 0–100, money, trophy count, confirmed mainline ending. */
export interface CatcafeShopStateV1 {
  readonly reputation: number;
  readonly tidiness: number;
  readonly money: number;
  readonly trophies: number;
  /** Postgame begins once the mainline ending is confirmed; null = mainline in progress. */
  readonly epilogue: string | null;
}

/** Contest turn state: null = not in a contest; transient but saveable (mid-contest saves allowed). */
export interface CatcafeContestStateV1 {
  readonly rivalId: string;
  readonly round: number;
  readonly morale: number;
  readonly rivalMorale: number;
  readonly feintActive: boolean;
}

export interface CatcafeGameStateV1 {
  readonly simulation: {
    readonly calendar: CatcafeCalendarStateV1;
    readonly cat: CatcafeCatStateV1;
    readonly contest: CatcafeContestStateV1 | null;
    readonly narrative: CatcafeNarrativeStateV1;
    readonly shop: CatcafeShopStateV1;
    readonly stage: SemanticStageState;
  };
}

export const catcafeDailyStaminaV1 = 6;
export const catcafeDailyPettingV1 = 3;

const calendarZodV1 = z.strictObject({
  week: z.number().int().min(1).max(9999),
  day: z.number().int().min(0).max(6),
  slot: z.number().int().min(0).max(3),
  stamina: z.number().int().min(0).max(catcafeDailyStaminaV1),
});

const catZodV1 = z.strictObject({
  trust: z.number().int().min(0).max(100),
  vigor: z.number().int().min(0).max(100),
  skill: z.number().int().min(0).max(100),
  fishBuff: z.number().int().min(0).max(3),
  pettingLeft: z.number().int().min(0).max(catcafeDailyPettingV1),
});

const shopZodV1 = z.strictObject({
  reputation: z.number().int().min(0).max(100),
  tidiness: z.number().int().min(0).max(100),
  money: z.number().int().min(0),
  trophies: z.number().int().min(0),
  epilogue: z.string().nullable().default(null),
});

const contestZodV1 = z
  .strictObject({
    rivalId: z.string(),
    round: z.number().int().min(1).max(3),
    morale: z.number().int().min(0),
    rivalMorale: z.number().int().min(0),
    feintActive: z.boolean(),
  })
  .nullable();

export const catcafeCalendarStateSchemaV1: RuntimeSchemaV1<CatcafeCalendarStateV1> =
  fromStandardSchemaV1(calendarZodV1, { subject: { kind: "module", id: "catcafe.calendar" } });

export const catcafeCatStateSchemaV1: RuntimeSchemaV1<CatcafeCatStateV1> = fromStandardSchemaV1(
  catZodV1,
  { subject: { kind: "module", id: "catcafe.cat" } },
);

export const catcafeShopStateSchemaV1: RuntimeSchemaV1<CatcafeShopStateV1> = fromStandardSchemaV1(
  shopZodV1,
  { subject: { kind: "module", id: "catcafe.shop" } },
);

export const catcafeContestStateSchemaV1: RuntimeSchemaV1<CatcafeContestStateV1 | null> =
  fromStandardSchemaV1(contestZodV1, { subject: { kind: "module", id: "catcafe.contest" } });

export const catcafeStageStateSchemaV1: RuntimeSchemaV1<SemanticStageState> = createRuntimeSchemaV1(
  { parse: (value) => parseSemanticStageState(value) },
  { subject: { kind: "module", id: "catcafe.stage" } },
);

const narrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const catcafeNarrativeStateSchemaV1: RuntimeSchemaV1<CatcafeNarrativeStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): CatcafeNarrativeStateV1 {
        const record = z
          .strictObject({
            phase: z.string(),
            cursor: z.string().nullable(),
            pending: z.unknown().nullable(),
            sequence: z.number().int().nonnegative(),
            flags: z.array(z.string()),
            history: z.unknown(),
          })
          .parse(value);
        if (!narrativePhaseValuesV1.has(record.phase)) {
          throw new TypeError("invalid catcafe narrative phase");
        }
        if (record.cursor !== null && !catcafeNodeIdsV1.includes(record.cursor)) {
          throw new TypeError("unknown catcafe narrative cursor");
        }
        const pending = record.pending === null || record.pending === undefined
          ? null
          : parsePendingInteraction(record.pending);
        if ((record.phase === "active") !== (record.cursor !== null)) {
          throw new TypeError("catcafe narrative cursor must match active phase");
        }
        if (pending !== null && record.phase !== "active") {
          throw new TypeError("catcafe narrative pending requires active phase");
        }
        const flags = [...record.flags];
        if (flags.some((flag, index) => index > 0 && flag <= (flags[index - 1] as string))) {
          throw new TypeError("catcafe narrative flags must be sorted and unique");
        }
        return ({
          phase: record.phase as CatcafeNarrativeStateV1["phase"],
          cursor: record.cursor,
          pending,
          sequence: record.sequence,
          flags: flags,
          history: parseNarrativeHistory(record.history),
        });
      },
    },
    { subject: { kind: "module", id: "catcafe.narrative" } },
  );

export const catcafeGameStateSchemaV1: RuntimeSchemaV1<CatcafeGameStateV1> = createRuntimeSchemaV1(
  {
    parse(value: unknown): CatcafeGameStateV1 {
      const root = z.strictObject({ simulation: z.record(z.string(), z.unknown()) }).parse(value);
      const simulation = z
        .strictObject({
          calendar: z.unknown(),
          cat: z.unknown(),
          contest: z.unknown().nullable(),
          narrative: z.unknown(),
          shop: z.unknown(),
          stage: z.unknown(),
        })
        .parse(root.simulation);
      return ({
        simulation: {
          calendar: catcafeCalendarStateSchemaV1.parse(simulation.calendar),
          cat: catcafeCatStateSchemaV1.parse(simulation.cat),
          contest: catcafeContestStateSchemaV1.parse(simulation.contest ?? null),
          narrative: catcafeNarrativeStateSchemaV1.parse(simulation.narrative),
          shop: catcafeShopStateSchemaV1.parse(simulation.shop),
          stage: catcafeStageStateSchemaV1.parse(simulation.stage),
        },
      });
    },
  },
  { subject: { kind: "story", id: "story.example.cat-cafe" } },
);

export function createInitialCatcafeStageStateV1(): SemanticStageState {
  return createSemanticStageState({
    stageId: "stage.catcafe.main",
    layerIds: [catcafeLayersV1.background, catcafeLayersV1.characters],
  });
}

export function createInitialCatcafeGameStateV1(): CatcafeGameStateV1 {
  return ({
    simulation: {
      calendar: { week: 1, day: 0, slot: 0, stamina: catcafeDailyStaminaV1 },
      cat: {
        trust: 10,
        vigor: 60,
        skill: 0,
        fishBuff: 0,
        pettingLeft: catcafeDailyPettingV1,
      },
      contest: null,
      narrative: createInitialCatcafeNarrativeStateV1(),
      shop: {
        reputation: 10,
        tidiness: 60,
        money: 50,
        trophies: 0,
        epilogue: null,
      },
      stage: createInitialCatcafeStageStateV1(),
    },
  });
}
