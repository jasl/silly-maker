// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { RuntimeSchemaV1, SemanticStageStateV2 } from "@sillymaker/base";
import { parseSemanticStageStateV2 } from "@sillymaker/base";
import { createRuntimeSchemaV1, fromStandardSchemaV1 } from "@sillymaker/base/authoring";

import { createInitialLabStageStateV1 } from "./stage.js";

export interface LabSamplesStateV1 {
  readonly collected: number;
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
    readonly stage: SemanticStageStateV2;
  };
}

const labSamplesZodV1 = z.strictObject({
  collected: z.number().int().nonnegative(),
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

export const labProcedureStateSchemaV1: RuntimeSchemaV1<LabProcedureStateV1> = fromStandardSchemaV1(
  labProcedureZodV1,
  {
    subject: { kind: "module", id: "lab.procedure" },
  },
);

export const labStageStateSchemaV1: RuntimeSchemaV1<SemanticStageStateV2> = createRuntimeSchemaV1(
  { parse: (value) => parseSemanticStageStateV2(value) },
  { subject: { kind: "module", id: "lab.stage" } },
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
        })
        .parse(root.simulation);
      return Object.freeze({
        simulation: Object.freeze({
          samples: labSamplesStateSchemaV1.parse(simulation.samples),
          procedure: labProcedureStateSchemaV1.parse(simulation.procedure),
          stage: labStageStateSchemaV1.parse(simulation.stage),
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
    }),
  });
}
