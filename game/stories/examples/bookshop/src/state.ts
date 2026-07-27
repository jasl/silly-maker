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

import type { BookshopNarrativeStateV1 } from "./narrative.js";
import {
  createInitialBookshopNarrativeStateV1,
  bookshopLayersV1,
  bookshopNodeIdsV1,
} from "./narrative.js";

/**
 * Authoritative Story state: three modules, all plain versioned data.
 * Adding a gameplay module means one interface + schema + initial value
 * here, one module in `simulation.ts`, and one manifest entry in
 * `story.ts` (module IDs sorted ascending).
 */

/** The empty-shell gameplay module: a coin purse. Rename or replace it. */
export interface BookshopInventoryStateV1 {
  readonly coins: number;
}

export interface BookshopGameStateV1 {
  readonly simulation: {
    readonly inventory: BookshopInventoryStateV1;
    readonly narrative: BookshopNarrativeStateV1;
    readonly stage: SemanticStageState;
  };
}

const inventoryZodV1 = z.strictObject({
  coins: z.number().int().nonnegative(),
});

export const bookshopInventoryStateSchemaV1: RuntimeSchemaV1<BookshopInventoryStateV1> =
  fromStandardSchemaV1(inventoryZodV1, {
    subject: { kind: "module", id: "bookshop.inventory" },
  });

export const bookshopStageStateSchemaV1: RuntimeSchemaV1<SemanticStageState> =
  createRuntimeSchemaV1(
    { parse: (value) => parseSemanticStageState(value) },
    { subject: { kind: "module", id: "bookshop.stage" } },
  );

const narrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const bookshopNarrativeStateSchemaV1: RuntimeSchemaV1<BookshopNarrativeStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): BookshopNarrativeStateV1 {
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
          throw new TypeError("invalid bookshop narrative phase");
        }
        if (record.cursor !== null && !bookshopNodeIdsV1.includes(record.cursor)) {
          throw new TypeError("unknown bookshop narrative cursor");
        }
        const pending =
          record.pending === null || record.pending === undefined
            ? null
            : parsePendingInteraction(record.pending);
        if ((record.phase === "active") !== (record.cursor !== null)) {
          throw new TypeError("bookshop narrative cursor must match active phase");
        }
        if (pending !== null && record.phase !== "active") {
          throw new TypeError("bookshop narrative pending requires active phase");
        }
        const flags = [...record.flags];
        if (flags.some((flag, index) => index > 0 && flag <= (flags[index - 1] as string))) {
          throw new TypeError("bookshop narrative flags must be sorted and unique");
        }
        return Object.freeze({
          phase: record.phase as BookshopNarrativeStateV1["phase"],
          cursor: record.cursor,
          pending,
          sequence: record.sequence,
          flags: Object.freeze(flags),
          history: parseNarrativeHistory(record.history),
        });
      },
    },
    { subject: { kind: "module", id: "bookshop.narrative" } },
  );

export const bookshopGameStateSchemaV1: RuntimeSchemaV1<BookshopGameStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): BookshopGameStateV1 {
        const root = z.strictObject({ simulation: z.record(z.string(), z.unknown()) }).parse(value);
        const simulation = z
          .strictObject({
            inventory: z.unknown(),
            narrative: z.unknown(),
            stage: z.unknown(),
          })
          .parse(root.simulation);
        return Object.freeze({
          simulation: Object.freeze({
            inventory: bookshopInventoryStateSchemaV1.parse(simulation.inventory),
            narrative: bookshopNarrativeStateSchemaV1.parse(simulation.narrative),
            stage: bookshopStageStateSchemaV1.parse(simulation.stage),
          }),
        });
      },
    },
    { subject: { kind: "story", id: "story.example.bookshop" } },
  );

export function createInitialBookshopStageStateV1(): SemanticStageState {
  return createSemanticStageState({
    stageId: "stage.bookshop.main",
    layerIds: [bookshopLayersV1.background, bookshopLayersV1.characters],
  });
}

export function createInitialBookshopGameStateV1(): BookshopGameStateV1 {
  return Object.freeze({
    simulation: Object.freeze({
      inventory: Object.freeze({ coins: 0 }),
      narrative: createInitialBookshopNarrativeStateV1(),
      stage: createInitialBookshopStageStateV1(),
    }),
  });
}
