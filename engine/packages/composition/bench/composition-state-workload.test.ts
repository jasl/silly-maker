// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";

import {
  createNeutralStateDurationDistributionV1,
  createNeutralStateMemoryReportV1,
  createNeutralStatePerformanceReportV1,
  neutralStateGcCellsV1,
  neutralStateMatrixCellsV1,
  neutralStateModuleCountV1,
  neutralStateModuleCountsV1,
  neutralStateRetainedCommandCountV1,
  neutralStateTranscriptCommandCountV1,
  neutralStateScaleCellsV1,
  requireNeutralStateCorrectnessV1,
  runNeutralStateCorrectnessV1,
  runNeutralStateMemoryScheduleV1,
} from "./composition-state-workload.ts";

declare const Deno: {
  test(name: string, test: () => void | Promise<void>): void;
};

Deno.test("neutral matrix retains the 16-module history and adds the M0 scale cells", () => {
  assert.equal(neutralStateModuleCountV1, 16);
  assert.deepEqual(neutralStateModuleCountsV1, [16, 160]);
  assert.deepEqual(neutralStateMatrixCellsV1, [
    { moduleCount: 16, saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 1 },
    { moduleCount: 16, saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 4 },
    { moduleCount: 16, saveClass: "10kib", targetSaveBytes: 10 * 1024, touchedModules: 16 },
    { moduleCount: 16, saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 1 },
    { moduleCount: 16, saveClass: "100kib", targetSaveBytes: 100 * 1024, touchedModules: 4 },
    {
      moduleCount: 16,
      saveClass: "100kib",
      targetSaveBytes: 100 * 1024,
      touchedModules: 16,
    },
    { moduleCount: 16, saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 1 },
    { moduleCount: 16, saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 4 },
    { moduleCount: 16, saveClass: "1mib", targetSaveBytes: 1024 * 1024, touchedModules: 16 },
  ]);
  assert.deepEqual(
    neutralStateScaleCellsV1.map(({ moduleCount, saveClass, touchedModules }) => ({
      moduleCount,
      saveClass,
      touchedModules,
    })),
    [
      { moduleCount: 16, saveClass: "100kib", touchedModules: 1 },
      { moduleCount: 16, saveClass: "100kib", touchedModules: 16 },
      { moduleCount: 16, saveClass: "1mib", touchedModules: 1 },
      { moduleCount: 16, saveClass: "1mib", touchedModules: 16 },
      { moduleCount: 160, saveClass: "100kib", touchedModules: 1 },
      { moduleCount: 160, saveClass: "100kib", touchedModules: 16 },
      { moduleCount: 160, saveClass: "1mib", touchedModules: 1 },
      { moduleCount: 160, saveClass: "1mib", touchedModules: 16 },
    ],
  );
  assert.deepEqual(
    neutralStateGcCellsV1.map(({ moduleCount, saveClass, touchedModules }) => ({
      moduleCount,
      saveClass,
      touchedModules,
    })),
    [
      { moduleCount: 16, saveClass: "10kib", touchedModules: 1 },
      { moduleCount: 16, saveClass: "10kib", touchedModules: 16 },
      { moduleCount: 16, saveClass: "100kib", touchedModules: 4 },
      { moduleCount: 16, saveClass: "1mib", touchedModules: 1 },
      { moduleCount: 16, saveClass: "1mib", touchedModules: 16 },
      { moduleCount: 16, saveClass: "100kib", touchedModules: 1 },
      { moduleCount: 16, saveClass: "100kib", touchedModules: 16 },
      { moduleCount: 160, saveClass: "100kib", touchedModules: 1 },
      { moduleCount: 160, saveClass: "100kib", touchedModules: 16 },
      { moduleCount: 160, saveClass: "1mib", touchedModules: 1 },
      { moduleCount: 160, saveClass: "1mib", touchedModules: 16 },
    ],
  );
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
    assert.equal(observation.ownerCountersMatch, true);
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
    assert.throws(
      () =>
        requireNeutralStateCorrectnessV1(
          { ...observation, ownerCountersMatch: false },
          10 * 1024,
        ),
      /correctness invariant failed/,
    );
  },
);

Deno.test("neutral correctness preserves the 160-module State shape", async () => {
  const observation = await runNeutralStateCorrectnessV1({
    moduleCount: 160,
    saveClass: "100kib",
    touchedModules: 16,
  });

  assert.equal(observation.moduleCount, 160);
  assert.equal(observation.saveBytes, 100 * 1024);
  assert.equal(observation.stateDigestMatch, true);
  assert.equal(observation.ownerCountersMatch, true);
  assert.equal(observation.roundtripBytesMatch, true);
  assert.equal(observation.replay.matches, true);
});

Deno.test("neutral performance report is portable and trend-only", () => {
  assert.deepEqual(createNeutralStateDurationDistributionV1([3, 1, 5, 2, 4]), {
    raw: [3, 1, 5, 2, 4],
    p50: 3,
    p95: 5,
  });
  const report = createNeutralStatePerformanceReportV1({
    generatedAt: "2026-08-18T00:00:00.000Z",
    repository: {
      revision: "0123456789abcdef",
      workingTreeModified: true,
    },
    environment: {
      deno: "2.test",
      v8: "test-v8",
      typescript: "test-ts",
      os: "darwin",
      arch: "aarch64",
    },
    moduleCounts: [16, 160],
    saveClasses: ["100kib", "1mib"],
    touchedModuleCounts: [1, 16],
    warmup: 1,
    samples: 2,
    cold: [],
    cells: [],
  });

  assert.deepEqual(report, {
    schemaVersion: 2,
    generatedAt: "2026-08-18T00:00:00.000Z",
    repository: {
      revision: "0123456789abcdef",
      workingTreeModified: true,
    },
    environment: {
      deno: "2.test",
      v8: "test-v8",
      typescript: "test-ts",
      os: "darwin",
      arch: "aarch64",
    },
    matrix: {
      moduleCounts: [16, 160],
      saveClasses: ["100kib", "1mib"],
      touchedModuleCounts: [1, 16],
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
});

Deno.test("neutral memory report exposes the isolated two-pass GC protocol", () => {
  const report = createNeutralStateMemoryReportV1({
    generatedAt: "2026-08-18T00:00:00.000Z",
    repository: {
      revision: "0123456789abcdef",
      workingTreeModified: true,
    },
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
});

Deno.test("neutral memory schedule runs gc-macrotask-gc before every read", async () => {
  const events: string[] = [];
  const dispatchCalls: number[] = [];
  const checkpoints = await runNeutralStateMemoryScheduleV1({
    checkpoints: [0, 2, 4],
    collectGarbage() {
      events.push("gc");
      return Promise.resolve();
    },
    yieldMacrotask() {
      events.push("yield");
      return Promise.resolve();
    },
    readMemoryUsage() {
      events.push("read");
      return { rssBytes: 1, heapTotalBytes: 2, heapUsedBytes: 3, externalBytes: 4 };
    },
    dispatchUntil(commandCount) {
      dispatchCalls.push(commandCount);
      events.push(`dispatch:${String(commandCount)}`);
      return Promise.resolve();
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
