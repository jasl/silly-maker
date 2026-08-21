// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { commitAttemptV1 } from "../../contracts/execution.ts";
import { createTransactionalRngV1 } from "../../contracts/rng.ts";
import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.ts";
import type { RuntimeSchemaV1 } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger, parseNonZeroUint32 } from "../../contracts/values.ts";
import {
  engineDebugPatchErrorCodeV1,
  engineDebugPatchStateKindV1,
  executeEngineStatePatchV1,
  isEngineDebugPatchStateKindV1,
  parseEngineDebugPatchStateCommandV1,
  validateEngineStatePatchV1,
} from "./state-patch.ts";

interface CounterStateV1 {
  readonly simulation: { readonly counter: { readonly count: number } };
}

const counterStateSchemaV1: RuntimeSchemaV1<CounterStateV1> = Object.freeze({
  parse(value: unknown): CounterStateV1 {
    const count = (value as { simulation?: { counter?: { count?: unknown } } } | null)
      ?.simulation?.counter?.count;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      throw new TypeError("count must be a non-negative safe integer");
    }
    return Object.freeze({
      simulation: Object.freeze({
        counter: Object.freeze({ count: parseNonNegativeSafeInteger(count) }),
      }),
    });
  },
});

function snapshotV1(count: number) {
  return Object.freeze({
    state: Object.freeze({
      simulation: Object.freeze({ counter: Object.freeze({ count }) }),
    }),
    rng: createTransactionalRngV1(parseNonZeroUint32(0x0002_3049)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

const patchCountV1 = Object.freeze({
  kind: engineDebugPatchStateKindV1,
  path: Object.freeze(["simulation", "counter", "count"]),
  value: 7,
});

describe("engine debug state patch", () => {
  it("parses the reserved patch command and rejects extra keys", () => {
    expect(parseEngineDebugPatchStateCommandV1(patchCountV1)).toEqual(patchCountV1);
    expect(isEngineDebugPatchStateKindV1(patchCountV1)).toBe(true);
    expect(isEngineDebugPatchStateKindV1({ kind: "synthetic.increment" })).toBe(false);
    expect(() => parseEngineDebugPatchStateCommandV1({ ...patchCountV1, extra: true }))
      .toThrowError(/engine\.debug\.patch_invalid/u);
  });

  it("validates a leaf write against the aggregate state schema", () => {
    expect(validateEngineStatePatchV1(snapshotV1(0), patchCountV1, counterStateSchemaV1))
      .toEqual({ kind: "allowed" });
  });

  it("rejects a missing path, a non-leaf, and a schema violation without throwing", () => {
    const missing = validateEngineStatePatchV1(
      snapshotV1(0),
      { kind: engineDebugPatchStateKindV1, path: ["simulation", "missing"], value: 1 },
      counterStateSchemaV1,
    );
    expect(missing).toMatchObject({
      kind: "validation_failed",
      errors: [{ code: engineDebugPatchErrorCodeV1 }],
    });

    const nonLeaf = validateEngineStatePatchV1(
      snapshotV1(0),
      { kind: engineDebugPatchStateKindV1, path: ["simulation", "counter"], value: 1 },
      counterStateSchemaV1,
    );
    expect(nonLeaf.kind).toBe("validation_failed");

    const schema = validateEngineStatePatchV1(
      snapshotV1(0),
      { kind: engineDebugPatchStateKindV1, path: patchCountV1.path, value: -1 },
      counterStateSchemaV1,
    );
    expect(schema.kind).toBe("validation_failed");
  });

  it("commits a patched snapshot, bumps the sequence, and leaves rng and integrity alone", () => {
    const before = snapshotV1(0);
    const attempt = executeEngineStatePatchV1(before, patchCountV1, counterStateSchemaV1);
    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation.counter.count).toBe(7);
    expect(attempt.result.snapshot.commandSequence).toBe(1);
    expect(attempt.result.snapshot.rng).toEqual(before.rng);
    expect(attempt.result.snapshot.integrity).toBe(before.integrity);
    expect(attempt.result.events).toEqual([]);
    expect(attempt).toEqual(
      commitAttemptV1(
        before,
        attempt.result.snapshot,
        createTransactionalRngV1(before.rng),
        [],
      ),
    );
  });
});
