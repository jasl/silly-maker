// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { RuntimeSchemaV1, SemanticStageStateV1 } from "@sillymaker/base";
import {
  parseNarrativeHistoryV1,
  parsePendingInteractionV1,
  parseSemanticStageStateV1,
} from "@sillymaker/base";
import { createRuntimeSchemaV1, fromStandardSchemaV1 } from "@sillymaker/base/authoring";

import type { LabNarrativeStateV1 } from "./narrative.ts";
import { createInitialLabNarrativeStateV1, labNarrativeNodeIdsV1 } from "./narrative.ts";
import { createInitialLabStageStateV1 } from "./stage.ts";

export interface LabSamplesStateV1 {
  readonly collected: number;
}

export interface LabWalletStateV1 {
  readonly credits: number;
}

export type LabProcedurePhaseV1 = "idle" | "running" | "complete";

export interface LabProcedureStateV1 {
  readonly phase: LabProcedurePhaseV1;
  readonly stepsTaken: number;
}

export interface LabGameStateV1 {
  readonly simulation: {
    readonly samples: LabSamplesStateV1;
    readonly procedure: LabProcedureStateV1;
    readonly stage: SemanticStageStateV1;
    readonly narrative: LabNarrativeStateV1;
    readonly wallet: LabWalletStateV1;
  };
}

const labSamplesZodV1 = z.strictObject({
  collected: z.number().int().nonnegative(),
});

const labWalletZodV1 = z.strictObject({
  credits: z.number().int().nonnegative(),
});

const labProcedureZodV1 = z
  .strictObject({
    phase: z.enum(["idle", "running", "complete"]),
    stepsTaken: z.number().int().nonnegative(),
  })
  .refine((state) => state.phase !== "idle" || state.stepsTaken === 0, {
    message: "idle lab procedure must have zero steps",
    path: ["stepsTaken"],
  });

export const labSamplesStateSchemaV1: RuntimeSchemaV1<LabSamplesStateV1> = fromStandardSchemaV1(
  labSamplesZodV1,
  { subject: { kind: "module", id: "lab.samples" } },
);

export const labWalletStateSchemaV1: RuntimeSchemaV1<LabWalletStateV1> = fromStandardSchemaV1(
  labWalletZodV1,
  { subject: { kind: "module", id: "lab.wallet" } },
);

export const labProcedureStateSchemaV1: RuntimeSchemaV1<LabProcedureStateV1> = fromStandardSchemaV1(
  labProcedureZodV1,
  {
    subject: { kind: "module", id: "lab.procedure" },
  },
);

export const labStageStateSchemaV1: RuntimeSchemaV1<SemanticStageStateV1> = createRuntimeSchemaV1(
  { parse: (value) => parseSemanticStageStateV1(value) },
  { subject: { kind: "module", id: "lab.stage" } },
);

const labNarrativePhaseValuesV1 = new Set(["idle", "active", "completed"]);

export const labNarrativeStateSchemaV1: RuntimeSchemaV1<LabNarrativeStateV1> =
  createRuntimeSchemaV1(
    {
      parse(value: unknown): LabNarrativeStateV1 {
        const record = z
          .strictObject({
            phase: z.string(),
            cursor: z.string().nullable(),
            pending: z.unknown().nullable(),
            sequence: z.number().int().nonnegative(),
            calibration: z.number().int().nullable(),
            rapport: z.number().int().nonnegative(),
            history: z.unknown(),
          })
          .parse(value);
        if (!labNarrativePhaseValuesV1.has(record.phase)) {
          throw new TypeError("invalid lab narrative phase");
        }
        if (record.cursor !== null && !labNarrativeNodeIdsV1.includes(record.cursor)) {
          throw new TypeError("unknown lab narrative cursor");
        }
        const pending = record.pending === null || record.pending === undefined
          ? null
          : parsePendingInteractionV1(record.pending);
        if ((record.phase === "active") !== (record.cursor !== null)) {
          throw new TypeError("lab narrative cursor must match active phase");
        }
        if (pending !== null && record.phase !== "active") {
          throw new TypeError("lab narrative pending requires active phase");
        }
        return Object.freeze({
          phase: record.phase as LabNarrativeStateV1["phase"],
          cursor: record.cursor,
          pending,
          sequence: record.sequence,
          calibration: record.calibration,
          rapport: record.rapport,
          history: parseNarrativeHistoryV1(record.history),
        });
      },
    },
    { subject: { kind: "module", id: "lab.narrative" } },
  );

export const labGameStateSchemaV1: RuntimeSchemaV1<LabGameStateV1> = createRuntimeSchemaV1(
  {
    parse(value: unknown): LabGameStateV1 {
      const root = z.strictObject({ simulation: z.record(z.string(), z.unknown()) }).parse(value);
      const simulation = z
        .strictObject({
          samples: z.unknown(),
          procedure: z.unknown(),
          stage: z.unknown(),
          narrative: z.unknown(),
          wallet: z.unknown(),
        })
        .parse(root.simulation);
      return Object.freeze({
        simulation: Object.freeze({
          samples: labSamplesStateSchemaV1.parse(simulation.samples),
          procedure: labProcedureStateSchemaV1.parse(simulation.procedure),
          stage: labStageStateSchemaV1.parse(simulation.stage),
          narrative: labNarrativeStateSchemaV1.parse(simulation.narrative),
          wallet: labWalletStateSchemaV1.parse(simulation.wallet),
        }),
      });
    },
  },
  { subject: { kind: "story", id: "story.e2e.engine-lab" } },
);

export function createInitialLabGameStateV1(): LabGameStateV1 {
  return Object.freeze({
    simulation: Object.freeze({
      samples: Object.freeze({ collected: 0 }),
      procedure: Object.freeze({ phase: "idle" as const, stepsTaken: 0 }),
      stage: createInitialLabStageStateV1(),
      narrative: createInitialLabNarrativeStateV1(),
      wallet: Object.freeze({ credits: 0 }),
    }),
  });
}
