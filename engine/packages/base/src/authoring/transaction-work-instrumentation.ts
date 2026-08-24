// SPDX-License-Identifier: MIT

export type TransactionWorkEventV1 =
  | "reducer_plan_visit"
  | "slot_materialization"
  | "aggregate_materialization";

export interface TransactionWorkInstrumentationV1 {
  record(event: TransactionWorkEventV1): unknown;
}

export interface TransactionWorkCountsV1 {
  readonly reducerPlanVisits: number;
  readonly slotMaterializations: number;
  readonly aggregateMaterializations: number;
}

/** @internal Optional test/bench observation; intentionally absent from package barrels. */
export function recordTransactionWorkV1(
  instrumentation: TransactionWorkInstrumentationV1 | undefined,
  event: TransactionWorkEventV1,
): void {
  try {
    const result = instrumentation?.record(event);
    if (result !== undefined) void Promise.resolve(result).catch(() => undefined);
  } catch {
    // Observation must never change authoritative transaction behavior.
  }
}

/** @internal Deterministic structural counter; intentionally absent from package barrels. */
export function createTransactionWorkCounterV1(): {
  readonly instrumentation: TransactionWorkInstrumentationV1;
  reset(): void;
  snapshot(): TransactionWorkCountsV1;
} {
  let reducerPlanVisits = 0;
  let slotMaterializations = 0;
  let aggregateMaterializations = 0;
  return Object.freeze({
    instrumentation: Object.freeze({
      record(event: TransactionWorkEventV1) {
        switch (event) {
          case "reducer_plan_visit":
            reducerPlanVisits += 1;
            return;
          case "slot_materialization":
            slotMaterializations += 1;
            return;
          case "aggregate_materialization":
            aggregateMaterializations += 1;
            return;
        }
      },
    }),
    reset() {
      reducerPlanVisits = 0;
      slotMaterializations = 0;
      aggregateMaterializations = 0;
    },
    snapshot() {
      return Object.freeze({
        reducerPlanVisits,
        slotMaterializations,
        aggregateMaterializations,
      });
    },
  });
}
