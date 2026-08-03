// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { runAuthoritativeDeterminismTripwireV1 } from "../testing/ambient-tripwire-runner.ts";
import { authoritativeDeterminismTraceExpectedV1 } from "../testing/authoritative-determinism-driver.ts";
import {
  authoritativeDeterminismMatrixExpectedV1,
  collectAuthoritativeDeterminismMatrixV1,
  compareAuthoritativeDeterminismMatrixV1,
} from "../testing/authoritative-determinism-matrix.ts";
import { saveStateMigrationVectorExpectedV1 } from "../testing/save-state-migration-driver.ts";

const fixedBootstrapInputV1 = Object.freeze({ schemaVersion: 1 as const, rngSeed: 97 });

describe("authoritative determinism four-runtime matrix", () => {
  it("runs the Deno tripwire and complete parity vector twice", async () => {
    const tripwireRepeats = [];
    const matrixRepeats = [];
    for (let repeat = 1; repeat <= 2; repeat += 1) {
      tripwireRepeats.push(
        await runAuthoritativeDeterminismTripwireV1({
          bootstrapInput: fixedBootstrapInputV1,
          scenario: "trace",
        }),
      );
      matrixRepeats.push(await collectAuthoritativeDeterminismMatrixV1());
    }

    for (const receipt of tripwireRepeats) {
      expect(receipt.workerTerminations).toBe(1);
      expect(receipt.result.kind).toBe("passed");
      if (receipt.result.kind !== "passed") throw new TypeError("Deno tripwire did not pass");
      expect(receipt.result.value).toEqual(authoritativeDeterminismTraceExpectedV1);
    }
    for (const [index, matrix] of matrixRepeats.entries()) {
      expect(
        compareAuthoritativeDeterminismMatrixV1({
          project: "deno",
          repeat: index + 1,
          expected: authoritativeDeterminismMatrixExpectedV1,
          actual: matrix,
        }),
      ).toBeNull();
      expect(JSON.stringify(matrix)).toBe(JSON.stringify(authoritativeDeterminismMatrixExpectedV1));
    }
    expect(matrixRepeats[1]).toEqual(matrixRepeats[0]);
    expect(matrixRepeats[0]?.saveStateMigration).toEqual(
      saveStateMigrationVectorExpectedV1,
    );

    const rejectionSampling = matrixRepeats[0]?.transcript.commands[2];
    expect(rejectionSampling?.input).toEqual({
      command: { kind: "rng_committed" },
      rngSeed: 1_236_431_772,
      exclusiveMax: 7,
    });
    expect(rejectionSampling?.trace.rng.attemptedDraws).toHaveLength(2);
    const rejectionLimit = Math.floor(0x1_0000_0000 / 7) * 7;
    expect(rejectionSampling?.trace.rng.attemptedDraws[0]?.after[0]).toBeGreaterThanOrEqual(
      rejectionLimit,
    );
    expect(rejectionSampling?.trace.rng.attemptedDraws[1]?.after[0]).toBeLessThan(
      rejectionLimit,
    );
    expect(matrixRepeats[0]?.transcript.commands.map((command) => command.trace.log.ordinal))
      .toEqual(
        [1, 2, 3, 4],
      );
    expect(
      matrixRepeats[0]?.transcript.commands.map((command) => command.trace.snapshot.sequence),
    ).toEqual([
      { before: 0, after: 1 },
      { before: 1, after: 1 },
      { before: 1, after: 2 },
      { before: 2, after: 2 },
    ]);
    expect(matrixRepeats[0]?.transcript.replay).toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 4,
      mismatches: [],
    });
  }, 30_000);

  it("reports the first divergence with runtime and per-command context", () => {
    const expected = {
      transcript: {
        commands: [{
          ordinal: 1,
          input: { command: { kind: "rng_committed" } },
          trace: {
            snapshot: { sequence: { before: 4, after: 5 } },
            rng: { attemptedDraws: [{ result: 1 }] },
          },
        }],
      },
    };
    const actual = {
      transcript: {
        commands: [{
          ordinal: 1,
          input: { command: { kind: "rng_committed" } },
          trace: {
            snapshot: { sequence: { before: 4, after: 5 } },
            rng: { attemptedDraws: [{ result: 2 }] },
          },
        }],
      },
    };

    expect(
      compareAuthoritativeDeterminismMatrixV1({
        project: "firefox",
        repeat: 2,
        expected,
        actual,
      }),
    ).toEqual({
      project: "firefox",
      repeat: 2,
      vector: "transcript",
      commandOrdinal: 1,
      commandIdentity: "rng_committed",
      sequence: { before: 4, after: 5 },
      pointer: "/transcript/commands/0/trace/rng/attemptedDraws/0/result",
      expected: 1,
      actual: 2,
    });
  });

  it("maps an entry-scoped replay divergence back to its transcript command", () => {
    const commands = [
      {
        ordinal: 1,
        input: { command: { kind: "no_draw_committed" } },
        trace: { snapshot: { sequence: { before: 0, after: 1 } } },
      },
      {
        ordinal: 2,
        input: { command: { kind: "rejected" } },
        trace: { snapshot: { sequence: { before: 1, after: 1 } } },
      },
      {
        ordinal: 3,
        input: { command: { kind: "rng_committed" } },
        trace: { snapshot: { sequence: { before: 1, after: 2 } } },
      },
    ];
    const expected = {
      transcript: {
        commands,
        replay: { matches: true, mismatches: [] },
      },
    };
    const actual = {
      transcript: {
        commands,
        replay: {
          matches: false,
          mismatches: [{ scope: "entry", logOrdinal: 3, field: "attempted_draws" }],
        },
      },
    };

    expect(
      compareAuthoritativeDeterminismMatrixV1({
        project: "webkit",
        repeat: 1,
        expected,
        actual,
      }),
    ).toEqual({
      project: "webkit",
      repeat: 1,
      vector: "transcript",
      commandOrdinal: 3,
      commandIdentity: "rng_committed",
      sequence: { before: 1, after: 2 },
      pointer: "/transcript/replay/matches",
      expected: true,
      actual: false,
    });
  });
});
