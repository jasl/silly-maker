// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { RuntimeSchemaV1 } from "./values.ts";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  runIntegrityV1Schema,
} from "./snapshot.ts";

const counterStateSchema: RuntimeSchemaV1<{ readonly count: number }> = {
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join() !== "count" ||
      typeof (value as { count?: unknown }).count !== "number"
    ) {
      throw new TypeError("invalid counter state");
    }
    return { count: (value as { count: number }).count };
  },
};

const syntheticRngStateSchema: RuntimeSchemaV1<{ readonly cursor: number }> = {
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join() !== "cursor" ||
      typeof (value as { cursor?: unknown }).cursor !== "number"
    ) {
      throw new TypeError("invalid RNG state");
    }
    return { cursor: (value as { cursor: number }).cursor };
  },
};

describe("generic Snapshot envelope", () => {
  it("requires exact engine-owned integrity fields", () => {
    const schema = createGameSnapshotEnvelopeSchemaV1(counterStateSchema, syntheticRngStateSchema);
    const snapshot = schema.parse({
      state: { count: 0 },
      rng: { cursor: 1 },
      commandSequence: 0,
      integrity: {
        mode: "normal",
        mutationCount: 0,
        firstMutationSequence: null,
        reasons: [],
      },
    });
    expect(snapshot).toEqual({
      state: { count: 0 },
      rng: { cursor: 1 },
      commandSequence: 0,
      integrity: createPristineRunIntegrityV1(),
    });
    expect(() =>
      schema.parse({
        ...snapshot,
        integrity: { ...snapshot.integrity, injected: true },
      })
    ).toThrow();
    expect(() =>
      schema.parse({
        state: snapshot.state,
        rng: snapshot.rng,
        commandSequence: snapshot.commandSequence,
      })
    ).toThrow();
  });

  it("enforces the bidirectional RunIntegrity invariants", () => {
    expect(runIntegrityV1Schema.parse(createPristineRunIntegrityV1())).toEqual({
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    });

    for (
      const invalid of [
        {
          mode: "normal",
          mutationCount: 1,
          firstMutationSequence: 1,
          reasons: [{ kind: "debug_bundle_anchor", sequence: 1 }],
        },
        {
          mode: "modified",
          mutationCount: 0,
          firstMutationSequence: null,
          reasons: [],
        },
        {
          mode: "modified",
          mutationCount: 1,
          firstMutationSequence: -1,
          reasons: [{ kind: "debug_bundle_anchor", sequence: 1 }],
        },
        {
          mode: "modified",
          mutationCount: Number.NaN,
          firstMutationSequence: 1,
          reasons: [{ kind: "unknown", sequence: 1 }],
        },
        {
          mode: "modified",
          mutationCount: 1,
          firstMutationSequence: 1,
          reasons: [],
        },
        {
          mode: "modified",
          mutationCount: -0,
          firstMutationSequence: 1,
          reasons: [{ kind: "debug_bundle_anchor", sequence: 1 }],
        },
        {
          mode: "normal",
          mutationCount: 0,
          firstMutationSequence: null,
          reasons: [{ kind: "debug_bundle_anchor", sequence: 0 }],
        },
      ]
    ) {
      expect(() => runIntegrityV1Schema.parse(invalid)).toThrow();
    }
  });

  it("parses only the exact closed reason union", () => {
    const reasons = [
      {
        kind: "debug_command",
        commandKind: "debug.synthetic.increment",
        sequence: 1,
      },
      {
        kind: "fixture_anchor",
        fixtureId: "fixture.synthetic",
        sequence: 2,
      },
      { kind: "debug_bundle_anchor", sequence: 3 },
    ];
    expect(
      runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 3,
        firstMutationSequence: 1,
        reasons,
      }).reasons,
    ).toEqual(reasons);
    expect(() =>
      runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 1,
        firstMutationSequence: 1,
        reasons: [{ ...reasons[0], injected: true }],
      })
    ).toThrow();
    expect(() =>
      runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 1,
        firstMutationSequence: 1,
        reasons: [{ kind: "debug_bundle_anchor", sequence: 1, injected: true }],
      })
    ).toThrow();
    expect(() =>
      runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 2,
        firstMutationSequence: 1,
        reasons: [reasons[0], { ...reasons[0], commandKind: "debug.synthetic.other" }],
      })
    ).toThrow();
    expect(() =>
      runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 17,
        firstMutationSequence: 1,
        reasons: Array.from({ length: 17 }, (_, index) => ({
          kind: "debug_bundle_anchor",
          sequence: index + 1,
        })),
      })
    ).toThrow();
  });
});
