// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";

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

const labGameStateZodV1 = z.strictObject({
  simulation: z.strictObject({
    samples: labSamplesZodV1,
    procedure: labProcedureZodV1,
  }),
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

export const labGameStateSchemaV1: RuntimeSchemaV1<LabGameStateV1> = fromStandardSchemaV1(
  labGameStateZodV1,
  { subject: { kind: "story", id: "story.e2e.engine-lab" } },
);

export function createInitialLabGameStateV1(): LabGameStateV1 {
  return Object.freeze({
    simulation: Object.freeze({
      samples: Object.freeze({ collected: 0 }),
      procedure: Object.freeze({ phase: "idle" as const, stepsTaken: 0 }),
    }),
  });
}
