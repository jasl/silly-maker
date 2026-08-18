// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";

import {
  createNeutralStateMemoryReportV1,
  createNeutralStatePerformanceReportV1,
  neutralStateGcCellsV1,
  neutralStateMatrixCellsV1,
  neutralStateModuleCountV1,
  neutralStateRetainedCommandCountV1,
  neutralStateTranscriptCommandCountV1,
  requireNeutralStateCorrectnessV1,
  runNeutralStateCorrectnessV1,
  runNeutralStateMemoryScheduleV1,
} from "./composition-state-workload.ts";

declare const Deno: {
  test(name: string, test: () => void | Promise<void>): void;
};

Deno.test("neutral matrix defines 16 modules, nine cells, and only five GC cells", () => {
  assert.equal(neutralStateModuleCountV1, 16);
  assert.deepEqual(neutralStateMatrixCellsV1, [
    { saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 1 },
    { saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 4 },
    { saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 16 },
    { saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 1 },
    { saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 4 },
    { saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 16 },
    { saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 1 },
    { saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 4 },
    { saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 16 },
  ]);
  assert.deepEqual(neutralStateGcCellsV1, [
    { saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 1 },
    { saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 16 },
    { saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 4 },
    { saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 1 },
    { saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 16 },
  ]);
});

Deno.test(
  "neutral correctness crosses retention and preserves Save, digest, and replay",
  async () => {
    const observation = await runNeutralStateCorrectnessV1({
      saveClass: "10kib",
      touchedModules: 16,
    });

    assert.equal(neutralStateTranscriptCommandCountV1, 256);
    assert.equal(neutralStateRetainedCommandCountV1, 200);
    assert.equal(observation.moduleCount, 16);
    assert.equal(observation.committedCommands, 256);
    assert.equal(observation.retainedCommands, 200);
    assert.equal(observation.replayBaseCommandSequence, 56);
    assert.equal(observation.firstRetainedOrdinal, 57);
    assert.equal(observation.lastRetainedOrdinal, 256);
    assert.equal(observation.retainedSequenceContinuity, true);
    assert.equal(observation.saveBytes, 10 * 1024);
    assert.equal(observation.saveDigestMatch, true);
    assert.equal(observation.stateDigestMatch, true);
    assert.equal(observation.roundtripBytesMatch, true);
    assert.equal(observation.importedCommandSequence, 256);
    assert.deepEqual(observation.replay, {
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 200,
      mismatches: [],
    });
    assert.ok(observation.maximumPayloadStringBytes <= 262_144);
    assert.throws(
      () =>
        requireNeutralStateCorrectnessV1(
          { ...observation, saveDigestMatch: false },
          10 * 1024,
        ),
      /correctness invariant failed/,
    );
  },
);

Deno.test("neutral performance report is portable and trend-only", () => {
  const report = createNeutralStatePerformanceReportV1({
    generatedAt: "2026-08-18T00:00:00.000Z",
    environment: {
      deno: "2.test",
      v8: "test-v8",
      typescript: "test-ts",
      os: "darwin",
      arch: "aarch64",
    },
    warmup: 1,
    samples: 2,
    cold: [],
    cells: [],
  });

  assert.deepEqual(report, {
    schemaVersion: 1,
    generatedAt: "2026-08-18T00:00:00.000Z",
    environment: {
      deno: "2.test",
      v8: "test-v8",
      typescript: "test-ts",
      os: "darwin",
      arch: "aarch64",
    },
    matrix: {
      moduleCount: 16,
      saveClasses: ["10kib", "100kib", "1mib"],
      touchedModuleCounts: [1, 4, 16],
      transcriptCommands: 256,
      retainedCommands: 200,
      steadyPrefillCommands: 256,
      steadyMeasuredCommands: 64,
    },
    warmup: 1,
    samples: 2,
    cold: [],
    cells: [],
    interpretation: {
      status: "trend_only",
      machineBoundHardGate: false,
      correctnessIsRequired: true,
      timingsArePortableBudgets: false,
    },
  });
  assert.doesNotMatch(JSON.stringify(report), /hostname|cwd|path|repository/i);
});

Deno.test("neutral memory report exposes the isolated two-pass GC protocol", () => {
  const report = createNeutralStateMemoryReportV1({
    generatedAt: "2026-08-18T00:00:00.000Z",
    environment: {
      deno: "2.test",
      v8: "test-v8",
      typescript: "test-ts",
      os: "darwin",
      arch: "aarch64",
    },
    cell: neutralStateGcCellsV1[0]!,
    checkpoints: [],
  });
  assert.deepEqual(report.protocol, {
    processCells: 1,
    checkpoints: [0, 200, 400, 800, 1_200],
    gcPassesPerCheckpoint: 2,
    macrotaskBetweenGcPasses: true,
  });
  assert.equal(report.interpretation.status, "trend_only");
  assert.doesNotMatch(JSON.stringify(report), /hostname|cwd|path|repository/i);
});

Deno.test("neutral memory schedule runs gc-macrotask-gc before every read", async () => {
  const events: string[] = [];
  const dispatchCalls: number[] = [];
  const checkpoints = await runNeutralStateMemoryScheduleV1({
    checkpoints: [0, 2, 4],
    async collectGarbage() {
      events.push("gc");
    },
    async yieldMacrotask() {
      events.push("yield");
    },
    readMemoryUsage() {
      events.push("read");
      return { rssBytes: 1, heapTotalBytes: 2, heapUsedBytes: 3, externalBytes: 4 };
    },
    async dispatchUntil(commandCount) {
      dispatchCalls.push(commandCount);
      events.push(`dispatch:${String(commandCount)}`);
    },
    now: (() => {
      let value = 0;
      return () => value++;
    })(),
  });

  assert.deepEqual(dispatchCalls, [0, 2, 4]);
  assert.deepEqual(events, [
    "dispatch:0",
    "gc",
    "yield",
    "gc",
    "read",
    "dispatch:2",
    "gc",
    "yield",
    "gc",
    "read",
    "dispatch:4",
    "gc",
    "yield",
    "gc",
    "read",
  ]);
  assert.deepEqual(
    checkpoints.map(({ commandCount, dispatchDurationMs }) => ({
      commandCount,
      dispatchDurationMs,
    })),
    [
      { commandCount: 0, dispatchDurationMs: 1 },
      { commandCount: 2, dispatchDurationMs: 1 },
      { commandCount: 4, dispatchDurationMs: 1 },
    ],
  );
});
