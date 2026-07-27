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

import type { TemplateNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialTemplateNarrativeStateV1,
  templateLayersV1,
  templateNodeIdsV1,
} from "./narrative.ts";

/**
 * Authoritative Story state: three modules, all plain versioned data.
 * Adding a gameplay module means one interface + schema + initial value
 * here, one module in `simulation.ts`, and one manifest entry in
 * `story.ts` (module IDs sorted ascending).
 */

/** The empty-shell gameplay module: a coin purse. Rename or replace it. */
export interface TemplateInventoryStateV1 {
  readonly coins: number;
}

export interface TemplateGameStateV1 {
  readonly simulation: {
    readonly inventory: TemplateInventoryStateV1;
    readonly narrative: TemplateNarrativeStateV1;
    readonly stage: SemanticStageState;
  };
}

const inventoryZodV1 = z.strictObject({
  coins: z.number().int().nonnegative(),
});

export const templateInventoryStateSchemaV1: RuntimeSchemaV1<TemplateInventoryStateV1> =
  fromStandardSchemaV1(inventoryZodV1, {
    subject: { kind: "module", id: "template.inventory" },
  });

export const templateStageStateSchemaV1: RuntimeSchemaV1<SemanticStageState> =
  createRuntimeSchemaV1(
    { parse: (value) => parseSemanticStageState(value) },
    { subject: { kind: "module", id: "template.stage" } },
  );

const narrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const templateNarrativeStateSchemaV1: RuntimeSchemaV1<TemplateNarrativeStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): TemplateNarrativeStateV1 {
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
          throw new TypeError("invalid template narrative phase");
        }
        if (record.cursor !== null && !templateNodeIdsV1.includes(record.cursor)) {
          throw new TypeError("unknown template narrative cursor");
        }
        const pending =
          record.pending === null || record.pending === undefined
            ? null
            : parsePendingInteraction(record.pending);
        if ((record.phase === "active") !== (record.cursor !== null)) {
          throw new TypeError("template narrative cursor must match active phase");
        }
        if (pending !== null && record.phase !== "active") {
          throw new TypeError("template narrative pending requires active phase");
        }
        const flags = [...record.flags];
        if (flags.some((flag, index) => index > 0 && flag <= (flags[index - 1] as string))) {
          throw new TypeError("template narrative flags must be sorted and unique");
        }
        return Object.freeze({
          phase: record.phase as TemplateNarrativeStateV1["phase"],
          cursor: record.cursor,
          pending,
          sequence: record.sequence,
          flags: Object.freeze(flags),
          history: parseNarrativeHistory(record.history),
        });
      },
    },
    { subject: { kind: "module", id: "template.narrative" } },
  );

export const templateGameStateSchemaV1: RuntimeSchemaV1<TemplateGameStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): TemplateGameStateV1 {
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
            inventory: templateInventoryStateSchemaV1.parse(simulation.inventory),
            narrative: templateNarrativeStateSchemaV1.parse(simulation.narrative),
            stage: templateStageStateSchemaV1.parse(simulation.stage),
          }),
        });
      },
    },
    { subject: { kind: "story", id: "story.template.starter" } },
  );

export function createInitialTemplateStageStateV1(): SemanticStageState {
  return createSemanticStageState({
    stageId: "stage.template.main",
    layerIds: [templateLayersV1.background, templateLayersV1.characters],
  });
}

export function createInitialTemplateGameStateV1(): TemplateGameStateV1 {
  return Object.freeze({
    simulation: Object.freeze({
      inventory: Object.freeze({ coins: 0 }),
      narrative: createInitialTemplateNarrativeStateV1(),
      stage: createInitialTemplateStageStateV1(),
    }),
  });
}
