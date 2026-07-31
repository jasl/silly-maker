// SPDX-License-Identifier: MIT
import { digestCanonical } from "../contracts/digest.ts";
import {
  createSnapshotWorkCounterV1,
  type SnapshotWorkCountsV1,
} from "../internal/snapshot-work-instrumentation.ts";
import type { SnapshotCommitEntityCountV1 } from "./snapshot-commit-workload.ts";
import { createSnapshotTransactionWorkloadV1 } from "./snapshot-transaction-workload.ts";

export interface SnapshotMemoryUsageV1 {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
}

export interface SnapshotMemoryGrowthConfigV1 {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandCount: number;
  readonly checkpointCommandSequences: readonly number[];
  readonly steadyStateStartCommandSequence: number;
}

export interface SnapshotMemoryGrowthDescriptorV1 extends SnapshotMemoryGrowthConfigV1 {
  readonly workloadId: string;
  readonly commandClass: "cross_owner_atomic_committed";
}

export interface SnapshotMemoryGrowthSampleV1 {
  readonly afterCommandCount: number;
  readonly beforeGc: SnapshotMemoryUsageV1;
  readonly afterGc: SnapshotMemoryUsageV1;
}

interface SnapshotMemoryMetricTrendV1 {
  readonly start: number;
  readonly end: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly delta: number;
}

interface SnapshotMemoryUsageTrendV1 {
  readonly rssBytes: SnapshotMemoryMetricTrendV1;
  readonly heapTotalBytes: SnapshotMemoryMetricTrendV1;
  readonly heapUsedBytes: SnapshotMemoryMetricTrendV1;
  readonly externalBytes: SnapshotMemoryMetricTrendV1;
}

interface SnapshotMemoryGrowthSummaryV1 {
  readonly fullRun: {
    readonly afterGc: SnapshotMemoryUsageTrendV1;
  };
  readonly steadyState: {
    readonly startCommandSequence: number;
    readonly afterGc: SnapshotMemoryUsageTrendV1;
  };
  readonly beforeGcPeak: SnapshotMemoryUsageV1;
  readonly afterGcPeak: SnapshotMemoryUsageV1;
}

interface SnapshotMemoryBatchDurationV1 {
  readonly batchCount: number;
  readonly commandCount: number;
  readonly total: number;
  readonly batchAveragePerCommand: {
    readonly p50: number;
    readonly p95: number;
  };
}

interface SnapshotMemoryGrowthFinalV1 {
  readonly status: "ready";
  readonly currentCommandSequence: number;
  readonly crossOwnerCommitCount: number;
  readonly targetEntityId: number;
  readonly targetEntityValue: number;
  readonly retainedCommandCount: number;
  readonly replayBaseCommandSequence: number;
  readonly firstRetainedLogOrdinal: number;
  readonly lastRetainedLogOrdinal: number;
  readonly replayBaseStateDigest: string;
  readonly recomputedReplayBaseStateDigest: string;
  readonly lastPostStateDigest: string;
  readonly recomputedCurrentStateDigest: string;
}

export interface SnapshotMemoryGrowthRunV1 {
  readonly counts: SnapshotWorkCountsV1;
  readonly batchDurationMs: SnapshotMemoryBatchDurationV1;
  readonly memory: {
    readonly samples: readonly SnapshotMemoryGrowthSampleV1[];
    readonly summary: SnapshotMemoryGrowthSummaryV1;
  };
  readonly final: SnapshotMemoryGrowthFinalV1;
}

export const snapshotMemoryGrowthBenchmarkConfigV1 = Object.freeze(
  {
    entityCount: 1_000,
    commandCount: 1_200,
    checkpointCommandSequences: Object.freeze([0, 200, 400, 800, 1_200]),
    steadyStateStartCommandSequence: 400,
  } as const satisfies SnapshotMemoryGrowthConfigV1,
);

interface MemoryBuffersV1 {
  readonly beforeRss: Float64Array;
  readonly beforeHeapTotal: Float64Array;
  readonly beforeHeapUsed: Float64Array;
  readonly beforeExternal: Float64Array;
  readonly afterRss: Float64Array;
  readonly afterHeapTotal: Float64Array;
  readonly afterHeapUsed: Float64Array;
  readonly afterExternal: Float64Array;
}

interface UsageBufferSetV1 {
  readonly rss: Float64Array;
  readonly heapTotal: Float64Array;
  readonly heapUsed: Float64Array;
  readonly external: Float64Array;
}

function validatePositiveIntegerV1(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
}

function validateNonNegativeIntegerV1(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
}

function validateConfigV1(config: SnapshotMemoryGrowthConfigV1): void {
  validatePositiveIntegerV1(config.commandCount, "Snapshot memory-growth command count");
  if (config.checkpointCommandSequences.length < 2) {
    throw new TypeError("Snapshot memory-growth workload requires at least two checkpoints");
  }
  let previous = -1;
  for (const checkpoint of config.checkpointCommandSequences) {
    validateNonNegativeIntegerV1(checkpoint, "Snapshot memory-growth checkpoint");
    if (checkpoint <= previous) {
      throw new TypeError("Snapshot memory-growth checkpoints must be strictly increasing");
    }
    previous = checkpoint;
  }
  if (config.checkpointCommandSequences[0] !== 0) {
    throw new TypeError("Snapshot memory-growth checkpoints must begin at zero");
  }
  if (config.checkpointCommandSequences.at(-1) !== config.commandCount) {
    throw new TypeError("Snapshot memory-growth checkpoints must end at command count");
  }
  if (!config.checkpointCommandSequences.includes(config.steadyStateStartCommandSequence)) {
    throw new TypeError("Snapshot memory-growth steady-state start must be one of the checkpoints");
  }
}

function descriptorV1(config: SnapshotMemoryGrowthConfigV1): SnapshotMemoryGrowthDescriptorV1 {
  return Object.freeze({
    workloadId: `snapshot-memory-growth-v1/${String(config.entityCount)}/` +
      `cross_owner_atomic_committed/${String(config.commandCount)}`,
    entityCount: config.entityCount,
    commandClass: "cross_owner_atomic_committed",
    commandCount: config.commandCount,
    checkpointCommandSequences: Object.freeze([...config.checkpointCommandSequences]),
    steadyStateStartCommandSequence: config.steadyStateStartCommandSequence,
  });
}

function createMemoryBuffersV1(length: number): MemoryBuffersV1 {
  return Object.freeze({
    beforeRss: new Float64Array(length),
    beforeHeapTotal: new Float64Array(length),
    beforeHeapUsed: new Float64Array(length),
    beforeExternal: new Float64Array(length),
    afterRss: new Float64Array(length),
    afterHeapTotal: new Float64Array(length),
    afterHeapUsed: new Float64Array(length),
    afterExternal: new Float64Array(length),
  });
}

function beforeBuffersV1(buffers: MemoryBuffersV1): UsageBufferSetV1 {
  return {
    rss: buffers.beforeRss,
    heapTotal: buffers.beforeHeapTotal,
    heapUsed: buffers.beforeHeapUsed,
    external: buffers.beforeExternal,
  };
}

function afterBuffersV1(buffers: MemoryBuffersV1): UsageBufferSetV1 {
  return {
    rss: buffers.afterRss,
    heapTotal: buffers.afterHeapTotal,
    heapUsed: buffers.afterHeapUsed,
    external: buffers.afterExternal,
  };
}

function validateUsageMetricV1(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Snapshot memory-growth ${label} must be a non-negative safe integer`);
  }
  return value;
}

function writeUsageV1(target: UsageBufferSetV1, index: number, usage: SnapshotMemoryUsageV1): void {
  target.rss[index] = validateUsageMetricV1(usage.rssBytes, "rssBytes");
  target.heapTotal[index] = validateUsageMetricV1(usage.heapTotalBytes, "heapTotalBytes");
  target.heapUsed[index] = validateUsageMetricV1(usage.heapUsedBytes, "heapUsedBytes");
  target.external[index] = validateUsageMetricV1(usage.externalBytes, "externalBytes");
}

function readUsageV1(source: UsageBufferSetV1, index: number): SnapshotMemoryUsageV1 {
  return Object.freeze({
    rssBytes: source.rss[index] ?? 0,
    heapTotalBytes: source.heapTotal[index] ?? 0,
    heapUsedBytes: source.heapUsed[index] ?? 0,
    externalBytes: source.external[index] ?? 0,
  });
}

function metricTrendV1(values: readonly number[]): SnapshotMemoryMetricTrendV1 {
  const start = values[0];
  const end = values.at(-1);
  if (start === undefined || end === undefined) {
    throw new TypeError("Snapshot memory-growth trend requires at least one sample");
  }
  return Object.freeze({
    start,
    end,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    delta: end - start,
  });
}

function usageTrendV1(
  samples: readonly SnapshotMemoryGrowthSampleV1[],
): SnapshotMemoryUsageTrendV1 {
  return Object.freeze({
    rssBytes: metricTrendV1(samples.map(({ afterGc }) => afterGc.rssBytes)),
    heapTotalBytes: metricTrendV1(samples.map(({ afterGc }) => afterGc.heapTotalBytes)),
    heapUsedBytes: metricTrendV1(samples.map(({ afterGc }) => afterGc.heapUsedBytes)),
    externalBytes: metricTrendV1(samples.map(({ afterGc }) => afterGc.externalBytes)),
  });
}

function peakUsageV1(
  samples: readonly SnapshotMemoryGrowthSampleV1[],
  phase: "beforeGc" | "afterGc",
): SnapshotMemoryUsageV1 {
  return Object.freeze({
    rssBytes: Math.max(...samples.map((sample) => sample[phase].rssBytes)),
    heapTotalBytes: Math.max(...samples.map((sample) => sample[phase].heapTotalBytes)),
    heapUsedBytes: Math.max(...samples.map((sample) => sample[phase].heapUsedBytes)),
    externalBytes: Math.max(...samples.map((sample) => sample[phase].externalBytes)),
  });
}

function memorySummaryV1(
  samples: readonly SnapshotMemoryGrowthSampleV1[],
  steadyStateStartCommandSequence: number,
): SnapshotMemoryGrowthSummaryV1 {
  const steadyStateSamples = samples.filter(
    ({ afterCommandCount }) => afterCommandCount >= steadyStateStartCommandSequence,
  );
  if (steadyStateSamples.length === 0) {
    throw new TypeError("Snapshot memory-growth steady-state sample is missing");
  }
  return Object.freeze({
    fullRun: Object.freeze({
      afterGc: usageTrendV1(samples),
    }),
    steadyState: Object.freeze({
      startCommandSequence: steadyStateStartCommandSequence,
      afterGc: usageTrendV1(steadyStateSamples),
    }),
    beforeGcPeak: peakUsageV1(samples, "beforeGc"),
    afterGcPeak: peakUsageV1(samples, "afterGc"),
  });
}

function percentileV1(values: readonly number[], percentile: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  const selected = sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)];
  if (selected === undefined) {
    throw new TypeError("Snapshot memory-growth percentile requires a sample");
  }
  return selected;
}

function batchDurationV1(
  durations: Float64Array,
  checkpointCommandSequences: readonly number[],
): SnapshotMemoryBatchDurationV1 {
  const values = [...durations];
  const perCommandValues = values.map((duration, index) => {
    const start = checkpointCommandSequences[index];
    const end = checkpointCommandSequences[index + 1];
    if (start === undefined || end === undefined || end <= start) {
      throw new TypeError("Snapshot memory-growth duration interval is invalid");
    }
    return duration / (end - start);
  });
  return Object.freeze({
    batchCount: values.length,
    commandCount: checkpointCommandSequences.at(-1) ?? 0,
    total: values.reduce((total, value) => total + value, 0),
    batchAveragePerCommand: Object.freeze({
      p50: percentileV1(perCommandValues, 0.5),
      p95: percentileV1(perCommandValues, 0.95),
    }),
  });
}

function snapshotCountsV1(counts: SnapshotWorkCountsV1): SnapshotWorkCountsV1 {
  return Object.freeze({ ...counts });
}

/**
 * @internal Direct-file-only retained-memory workload. Memory and GC hooks are
 * injected so ordinary tests never depend on host timing or heap values.
 */
export function prepareSnapshotMemoryGrowthWorkloadV1(
  input: SnapshotMemoryGrowthConfigV1 & {
    readMemoryUsage(): SnapshotMemoryUsageV1;
    collectGarbage(): void | Promise<void>;
    now(): number;
  },
) {
  validateConfigV1(input);
  const descriptor = descriptorV1(input);
  const counter = createSnapshotWorkCounterV1();
  const workload = createSnapshotTransactionWorkloadV1({
    entityCount: input.entityCount,
    instrumentation: counter.instrumentation,
  });
  const setupCounts = snapshotCountsV1(counter.snapshot());
  counter.reset();
  const buffers = createMemoryBuffersV1(descriptor.checkpointCommandSequences.length);
  const before = beforeBuffersV1(buffers);
  const after = afterBuffersV1(buffers);
  const durations = new Float64Array(descriptor.checkpointCommandSequences.length - 1);
  let ran = false;

  async function sampleCheckpointV1(index: number): Promise<void> {
    writeUsageV1(before, index, input.readMemoryUsage());
    await input.collectGarbage();
    writeUsageV1(after, index, input.readMemoryUsage());
  }

  return Object.freeze({
    descriptor,
    setupCounts,
    snapshot: workload.snapshot,
    commandLog: workload.commandLog,
    replayBase: workload.replayBase,
    async runOnce(): Promise<SnapshotMemoryGrowthRunV1> {
      if (ran) {
        throw new TypeError("Snapshot memory-growth workload can only run once");
      }
      ran = true;
      let completedCommands = 0;
      await sampleCheckpointV1(0);
      for (
        let checkpointIndex = 1;
        checkpointIndex < descriptor.checkpointCommandSequences.length;
        checkpointIndex += 1
      ) {
        const checkpoint = descriptor.checkpointCommandSequences[checkpointIndex];
        if (checkpoint === undefined) {
          throw new TypeError("Snapshot memory-growth checkpoint disappeared");
        }
        const startedAt = input.now();
        if (!Number.isFinite(startedAt)) {
          throw new TypeError("Snapshot memory-growth clock returned a non-finite value");
        }
        while (completedCommands < checkpoint) {
          const result = await workload.dispatch("cross_owner_atomic_committed");
          if (result.kind !== "executed" || result.execution.kind !== "committed") {
            throw new TypeError("Snapshot memory-growth command did not commit");
          }
          completedCommands += 1;
        }
        const endedAt = input.now();
        const duration = endedAt - startedAt;
        if (!Number.isFinite(endedAt) || !Number.isFinite(duration) || duration < 0) {
          throw new TypeError("Snapshot memory-growth clock returned an invalid duration");
        }
        durations[checkpointIndex - 1] = duration;
        await sampleCheckpointV1(checkpointIndex);
      }

      const samples = Object.freeze(
        descriptor.checkpointCommandSequences.map((afterCommandCount, index) =>
          Object.freeze({
            afterCommandCount,
            beforeGc: readUsageV1(before, index),
            afterGc: readUsageV1(after, index),
          })
        ),
      );
      const entries = workload.commandLog();
      const first = entries[0];
      const last = entries.at(-1);
      if (first === undefined || last === undefined) {
        throw new TypeError("Snapshot memory-growth CommandLog is empty");
      }
      const currentSnapshot = workload.snapshot();
      const replayBase = workload.replayBase();
      const targetEntityId = Math.floor(input.entityCount / 2);
      const targetEntity = currentSnapshot.state.simulation.entities
        .chunks[Math.floor(targetEntityId / 1_000)]?.[
          targetEntityId % 1_000
        ];
      if (targetEntity === undefined) {
        throw new TypeError("Snapshot memory-growth target entity is missing");
      }
      if (workload.status() !== "ready") {
        throw new TypeError("Snapshot memory-growth Session did not remain ready");
      }
      const counts = snapshotCountsV1(counter.snapshot());
      return Object.freeze({
        counts,
        batchDurationMs: batchDurationV1(durations, descriptor.checkpointCommandSequences),
        memory: Object.freeze({
          samples,
          summary: memorySummaryV1(samples, descriptor.steadyStateStartCommandSequence),
        }),
        final: Object.freeze({
          status: "ready",
          currentCommandSequence: currentSnapshot.commandSequence,
          crossOwnerCommitCount: currentSnapshot.state.simulation.audit.crossOwnerCommitCount,
          targetEntityId,
          targetEntityValue: targetEntity.value,
          retainedCommandCount: entries.length,
          replayBaseCommandSequence: replayBase.commandSequence,
          firstRetainedLogOrdinal: first.logOrdinal,
          lastRetainedLogOrdinal: last.logOrdinal,
          replayBaseStateDigest: workload.replayBaseStateDigest(),
          recomputedReplayBaseStateDigest: digestCanonical("sillymaker:state:v1", replayBase),
          lastPostStateDigest: last.postStateDigest,
          recomputedCurrentStateDigest: digestCanonical("sillymaker:state:v1", currentSnapshot),
        }),
      });
    },
  });
}

export interface SnapshotMemoryGrowthReportEnvironmentV1 {
  readonly deno: string;
  readonly v8: string;
  readonly typescript: string;
  readonly target: string;
  readonly os: string;
  readonly arch: string;
}

/** @internal Direct-file-only stable JSON report builder for the memory bench. */
export function createSnapshotMemoryGrowthReportV1(input: {
  readonly generatedAt: string;
  readonly environment: SnapshotMemoryGrowthReportEnvironmentV1;
  readonly gcPassesPerCheckpoint: number;
  readonly descriptor: SnapshotMemoryGrowthDescriptorV1;
  readonly setupCounts: SnapshotWorkCountsV1;
  readonly run: SnapshotMemoryGrowthRunV1;
}) {
  if (input.generatedAt.length === 0) {
    throw new TypeError("Snapshot memory-growth report requires generatedAt");
  }
  validatePositiveIntegerV1(
    input.gcPassesPerCheckpoint,
    "Snapshot memory-growth GC passes per checkpoint",
  );
  return Object.freeze({
    schemaVersion: 1,
    reportKind: "snapshot_memory_growth_baseline_v1",
    generatedAt: input.generatedAt,
    environment: Object.freeze({
      ...input.environment,
      memoryMeasurement: Object.freeze({
        api: "Deno.memoryUsage",
        unit: "bytes",
        fields: Object.freeze(["rss", "heapTotal", "heapUsed", "external"]),
        processIsolation: "dedicated_process",
        gc: Object.freeze({
          mode: "forced_v8",
          passesPerCheckpoint: input.gcPassesPerCheckpoint,
          collectionCycles: input.run.memory.samples.length,
        }),
      }),
    }),
    workload: Object.freeze({
      descriptor: input.descriptor,
      setupCounts: input.setupCounts,
      counts: input.run.counts,
      batchDurationMs: input.run.batchDurationMs,
      memory: input.run.memory,
      final: input.run.final,
    }),
  });
}
