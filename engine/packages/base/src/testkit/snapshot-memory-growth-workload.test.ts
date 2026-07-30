// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { createSnapshotTransactionWorkloadV1 } from "./snapshot-transaction-workload.ts";
import {
  createSnapshotMemoryGrowthReportV1,
  prepareSnapshotMemoryGrowthWorkloadV1,
  snapshotMemoryGrowthBenchmarkConfigV1,
  type SnapshotMemoryUsageV1,
} from "./snapshot-memory-growth-workload.ts";

function memoryUsageV1(input: {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
}): SnapshotMemoryUsageV1 {
  return Object.freeze(input);
}

const zeroSaveCountsV1 = Object.freeze({
  saveCanonicalSerializations: 0,
  strictJsonParses: 0,
  strictJsonPreflights: 0,
});

describe("Snapshot memory-growth workload", () => {
  it("locks checkpoint sampling, work counts, GC isolation, and the report schema", async () => {
    const memoryReadings = [
      memoryUsageV1({
        rssBytes: 1_000,
        heapTotalBytes: 800,
        heapUsedBytes: 150,
        externalBytes: 40,
      }),
      memoryUsageV1({
        rssBytes: 900,
        heapTotalBytes: 700,
        heapUsedBytes: 100,
        externalBytes: 30,
      }),
      memoryUsageV1({
        rssBytes: 1_100,
        heapTotalBytes: 900,
        heapUsedBytes: 160,
        externalBytes: 50,
      }),
      memoryUsageV1({
        rssBytes: 1_000,
        heapTotalBytes: 800,
        heapUsedBytes: 110,
        externalBytes: 40,
      }),
      memoryUsageV1({
        rssBytes: 1_200,
        heapTotalBytes: 1_000,
        heapUsedBytes: 170,
        externalBytes: 60,
      }),
      memoryUsageV1({
        rssBytes: 1_100,
        heapTotalBytes: 900,
        heapUsedBytes: 130,
        externalBytes: 50,
      }),
      memoryUsageV1({
        rssBytes: 1_300,
        heapTotalBytes: 1_100,
        heapUsedBytes: 180,
        externalBytes: 70,
      }),
      memoryUsageV1({
        rssBytes: 1_200,
        heapTotalBytes: 1_000,
        heapUsedBytes: 120,
        externalBytes: 60,
      }),
    ];
    const clockReadings = [0, 10, 10, 30, 30, 60];
    let memoryReads = 0;
    let collectionCycles = 0;
    let clockReads = 0;
    const prepared = prepareSnapshotMemoryGrowthWorkloadV1({
      entityCount: 100,
      commandCount: 5,
      checkpointCommandSequences: [0, 2, 4, 5],
      steadyStateStartCommandSequence: 4,
      readMemoryUsage() {
        const reading = memoryReadings[memoryReads];
        if (reading === undefined) throw new TypeError("unexpected memory read");
        memoryReads += 1;
        return reading;
      },
      async collectGarbage() {
        collectionCycles += 1;
      },
      now() {
        const reading = clockReadings[clockReads];
        if (reading === undefined) throw new TypeError("unexpected clock read");
        clockReads += 1;
        return reading;
      },
    });

    expect(prepared.descriptor).toEqual({
      workloadId: "snapshot-memory-growth-v1/100/cross_owner_atomic_committed/5",
      entityCount: 100,
      commandClass: "cross_owner_atomic_committed",
      commandCount: 5,
      checkpointCommandSequences: [0, 2, 4, 5],
      steadyStateStartCommandSequence: 4,
    });
    expect(prepared.setupCounts).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
      ...zeroSaveCountsV1,
    });

    const run = await prepared.runOnce();

    expect(memoryReads).toBe(8);
    expect(collectionCycles).toBe(4);
    expect(clockReads).toBe(6);
    expect(run.counts).toEqual({
      canonicalTraversals: 20,
      canonicalDigests: 20,
      deepFreezeTraversals: 5,
      commandLogContinuityVerifications: 5,
      ...zeroSaveCountsV1,
    });
    expect(run.memory.samples.map(({ afterCommandCount }) => afterCommandCount)).toEqual([
      0, 2, 4, 5,
    ]);
    expect(run.memory.summary.steadyState.afterGc.heapUsedBytes).toEqual({
      start: 130,
      end: 120,
      minimum: 120,
      maximum: 130,
      delta: -10,
    });
    expect(run.memory.summary.beforeGcPeak).toEqual({
      rssBytes: 1_300,
      heapTotalBytes: 1_100,
      heapUsedBytes: 180,
      externalBytes: 70,
    });
    expect(run.batchDurationMs).toEqual({
      batchCount: 3,
      commandCount: 5,
      total: 60,
      batchAveragePerCommand: {
        p50: 10,
        p95: 30,
      },
    });
    expect(run.final).toMatchObject({
      status: "ready",
      currentCommandSequence: 5,
      crossOwnerCommitCount: 5,
      targetEntityId: 50,
      targetEntityValue: 55,
      retainedCommandCount: 5,
      replayBaseCommandSequence: 0,
      firstRetainedLogOrdinal: 1,
      lastRetainedLogOrdinal: 5,
    });
    expect(run.final.recomputedReplayBaseStateDigest).toBe(run.final.replayBaseStateDigest);
    expect(run.final.recomputedCurrentStateDigest).toBe(run.final.lastPostStateDigest);

    const report = createSnapshotMemoryGrowthReportV1({
      generatedAt: "2026-07-30T00:00:00.000Z",
      environment: {
        deno: "2.9.test",
        v8: "15.test",
        typescript: "6.test",
        target: "test-target",
        os: "test-os",
        arch: "test-arch",
      },
      gcPassesPerCheckpoint: 2,
      descriptor: prepared.descriptor,
      setupCounts: prepared.setupCounts,
      run,
    });
    expect(report).toMatchObject({
      schemaVersion: 1,
      reportKind: "snapshot_memory_growth_baseline_v1",
      generatedAt: "2026-07-30T00:00:00.000Z",
      environment: {
        deno: "2.9.test",
        v8: "15.test",
        typescript: "6.test",
        target: "test-target",
        os: "test-os",
        arch: "test-arch",
        memoryMeasurement: {
          api: "Deno.memoryUsage",
          unit: "bytes",
          fields: ["rss", "heapTotal", "heapUsed", "external"],
          processIsolation: "dedicated_process",
          gc: {
            mode: "forced_v8",
            passesPerCheckpoint: 2,
            collectionCycles: 4,
          },
        },
      },
      workload: {
        descriptor: prepared.descriptor,
        setupCounts: prepared.setupCounts,
        counts: run.counts,
        batchDurationMs: run.batchDurationMs,
        memory: run.memory,
        final: run.final,
      },
    });
    await expect(prepared.runOnce()).rejects.toThrow(
      "Snapshot memory-growth workload can only run once",
    );
  });

  it("crosses CommandLog retention without changing Session or log bytes", async () => {
    const constantMemory = memoryUsageV1({
      rssBytes: 1,
      heapTotalBytes: 1,
      heapUsedBytes: 1,
      externalBytes: 1,
    });
    let now = 0;
    const measured = prepareSnapshotMemoryGrowthWorkloadV1({
      entityCount: 100,
      commandCount: 201,
      checkpointCommandSequences: [0, 200, 201],
      steadyStateStartCommandSequence: 200,
      readMemoryUsage: () => constantMemory,
      collectGarbage: () => undefined,
      now: () => now++,
    });
    const reference = createSnapshotTransactionWorkloadV1({ entityCount: 100 });

    const measuredRun = await measured.runOnce();
    for (let command = 0; command < 201; command += 1) {
      const result = await reference.dispatch("cross_owner_atomic_committed");
      expect(result.kind).toBe("executed");
      if (result.kind === "executed") expect(result.execution.kind).toBe("committed");
    }

    expect(measuredRun.counts).toEqual({
      canonicalTraversals: 804,
      canonicalDigests: 804,
      deepFreezeTraversals: 201,
      commandLogContinuityVerifications: 201,
      ...zeroSaveCountsV1,
    });
    expect(measuredRun.final).toMatchObject({
      currentCommandSequence: 201,
      crossOwnerCommitCount: 201,
      retainedCommandCount: 200,
      replayBaseCommandSequence: 1,
      firstRetainedLogOrdinal: 2,
      lastRetainedLogOrdinal: 201,
    });
    expect(measuredRun.final.recomputedReplayBaseStateDigest).toBe(
      measuredRun.final.replayBaseStateDigest,
    );
    expect(canonicalJsonBytes(measured.snapshot())).toEqual(
      canonicalJsonBytes(reference.snapshot()),
    );
    expect(canonicalJsonBytes(measured.commandLog())).toEqual(
      canonicalJsonBytes(reference.commandLog()),
    );
    expect(canonicalJsonBytes(measured.replayBase())).toEqual(
      canonicalJsonBytes(reference.replayBase()),
    );
  });

  it("rejects invalid schedules and host memory readings before dispatch", async () => {
    expect(() =>
      prepareSnapshotMemoryGrowthWorkloadV1({
        entityCount: 100,
        commandCount: 2,
        checkpointCommandSequences: [1, 2],
        steadyStateStartCommandSequence: 1,
        readMemoryUsage: () =>
          memoryUsageV1({
            rssBytes: 1,
            heapTotalBytes: 1,
            heapUsedBytes: 1,
            externalBytes: 1,
          }),
        collectGarbage: () => undefined,
        now: () => 0,
      }),
    ).toThrow("Snapshot memory-growth checkpoints must begin at zero");

    const prepared = prepareSnapshotMemoryGrowthWorkloadV1({
      entityCount: 100,
      commandCount: 1,
      checkpointCommandSequences: [0, 1],
      steadyStateStartCommandSequence: 0,
      readMemoryUsage: () => ({
        rssBytes: 1,
        heapTotalBytes: 1,
        heapUsedBytes: -1,
        externalBytes: 1,
      }),
      collectGarbage: () => undefined,
      now: () => 0,
    });

    await expect(prepared.runOnce()).rejects.toThrow(
      "Snapshot memory-growth heapUsedBytes must be a non-negative safe integer",
    );
    expect(prepared.snapshot().commandSequence).toBe(0);
  });

  it("publishes a fixed long-lived benchmark descriptor without exporting it", () => {
    expect(snapshotMemoryGrowthBenchmarkConfigV1).toEqual({
      entityCount: 1_000,
      commandCount: 1_200,
      checkpointCommandSequences: [0, 200, 400, 800, 1_200],
      steadyStateStartCommandSequence: 400,
    });
  });
});
