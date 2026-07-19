// SPDX-License-Identifier: MIT
import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";

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

function requireExactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).toSorted().join("\0") !== [...keys].toSorted().join("\0")
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

export const labSamplesStateSchemaV1: RuntimeSchemaV1<LabSamplesStateV1> = Object.freeze({
  parse(value: unknown): LabSamplesStateV1 {
    const record = requireExactRecord(value, ["collected"], "lab samples State");
    return Object.freeze({
      collected: parseNonNegativeSafeInteger(record.collected),
    });
  },
});

export const labProcedureStateSchemaV1: RuntimeSchemaV1<LabProcedureStateV1> = Object.freeze({
  parse(value: unknown): LabProcedureStateV1 {
    const record = requireExactRecord(value, ["phase", "stepsTaken"], "lab procedure State");
    const phase = record.phase;
    if (phase !== "idle" && phase !== "running" && phase !== "complete") {
      throw new TypeError("invalid lab procedure phase");
    }
    const stepsTaken = parseNonNegativeSafeInteger(record.stepsTaken);
    if (phase === "idle" && stepsTaken !== 0) {
      throw new TypeError("idle lab procedure must have zero steps");
    }
    return Object.freeze({ phase, stepsTaken });
  },
});

export const labGameStateSchemaV1: RuntimeSchemaV1<LabGameStateV1> = Object.freeze({
  parse(value: unknown): LabGameStateV1 {
    const record = requireExactRecord(value, ["simulation"], "lab aggregate State");
    const simulation = requireExactRecord(
      record.simulation,
      ["samples", "procedure"],
      "lab simulation State",
    );
    return Object.freeze({
      simulation: Object.freeze({
        samples: labSamplesStateSchemaV1.parse(simulation.samples),
        procedure: labProcedureStateSchemaV1.parse(simulation.procedure),
      }),
    });
  },
});

export function createInitialLabGameStateV1(): LabGameStateV1 {
  return Object.freeze({
    simulation: Object.freeze({
      samples: Object.freeze({ collected: 0 }),
      procedure: Object.freeze({ phase: "idle" as const, stepsTaken: 0 }),
    }),
  });
}
