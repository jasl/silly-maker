// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  snapshotCommitCommandClassesV1,
  snapshotCommitEntityCountsV1,
  snapshotCommitSequenceClassesV1,
  snapshotTransactionCommandClassesV1,
} from "@sillymaker/base/testkit";
import type {
  SnapshotCommitCommandClassV1,
  SnapshotCommitEntityCountV1,
  SnapshotCommitSequenceClassV1,
  SnapshotCommitWorkloadRunV1,
  SnapshotPersistenceWorkCountsV1,
  SnapshotPersistenceWorkloadStepV1,
  SnapshotSessionWorkCountsV1,
  SnapshotTransactionCommandClassV1,
} from "@sillymaker/base/testkit";
import { prepareTimedSnapshotCommitWorkloadV1 } from "../src/testkit/snapshot-commit-workload.ts";
import { prepareTimedSnapshotPersistenceWorkloadV1 } from "../src/testkit/snapshot-persistence-workload.ts";
import {
  prepareTimedSnapshotCommitSequenceWorkloadV1,
  prepareTimedSnapshotReplayWorkloadV1,
  prepareTimedSnapshotTransactionWorkloadV1,
} from "../src/testkit/snapshot-transaction-workload.ts";

// This executable runs under Deno; tsc checks it without Deno lib types.
declare const Deno: {
  readonly args: readonly string[];
  readonly build: {
    readonly os: string;
    readonly arch: string;
  };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
  exitCode: number;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
};

interface BenchmarkOptionsV1 {
  readonly entityCounts: readonly SnapshotCommitEntityCountV1[];
  readonly commandClasses: readonly SnapshotBenchmarkCommandClassV1[];
  readonly workloadClasses: readonly SnapshotBenchmarkWorkloadClassV1[];
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

const snapshotBenchmarkWorkloadClassesV1 = [
  "command",
  "sequence",
  "replay",
  "persistence",
] as const;
type SnapshotBenchmarkWorkloadClassV1 = (typeof snapshotBenchmarkWorkloadClassesV1)[number];

const snapshotBenchmarkCommandClassesV1 = [
  ...snapshotCommitCommandClassesV1,
  ...snapshotTransactionCommandClassesV1,
] as const;
type SnapshotBenchmarkCommandClassV1 =
  | SnapshotCommitCommandClassV1
  | SnapshotTransactionCommandClassV1;

interface ConsistentCommandRunV1 {
  readonly counts: SnapshotSessionWorkCountsV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  readonly outcome: SnapshotCommitWorkloadRunV1["outcome"];
}

interface WorkloadBaselineCommonV1 {
  readonly workloadId: string;
  readonly workloadClass: SnapshotBenchmarkWorkloadClassV1;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly samples: number;
  readonly counts: SnapshotSessionWorkCountsV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  readonly durationMs: {
    readonly p50: number;
    readonly p95: number;
  };
}

interface CommandWorkloadBaselineV1 extends WorkloadBaselineCommonV1, ConsistentCommandRunV1 {
  readonly workloadClass: "command";
  readonly commandClass: SnapshotBenchmarkCommandClassV1;
}

interface SequenceWorkloadBaselineV1 extends WorkloadBaselineCommonV1 {
  readonly workloadClass: "sequence";
  readonly sequenceClass: SnapshotCommitSequenceClassV1;
  readonly commandCount: number;
  readonly outcomeCounts: {
    readonly committed: number;
    readonly rejected: number;
    readonly faulted: number;
  };
}

interface ReplayWorkloadBaselineV1 extends WorkloadBaselineCommonV1 {
  readonly workloadClass: "replay";
  readonly sequenceClass: "mixed_long_retained";
  readonly commandCount: number;
  readonly recordingCounts: SnapshotSessionWorkCountsV1;
  readonly comparison: Awaited<
    ReturnType<Awaited<ReturnType<typeof prepareTimedSnapshotReplayWorkloadV1>>["runOnce"]>
  >["comparison"];
}

interface PersistenceWorkloadBaselineV1 extends WorkloadBaselineCommonV1 {
  readonly workloadClass: "persistence";
  readonly entityCount: 100;
  readonly counts: SnapshotPersistenceWorkCountsV1;
  readonly setupCounts: SnapshotPersistenceWorkCountsV1;
  readonly autosaveClass: "every_commit_auto_rotation";
  readonly commandCount: 2;
  readonly firstAutoSave: SnapshotPersistenceWorkloadStepV1;
  readonly rotation: SnapshotPersistenceWorkloadStepV1;
}

type WorkloadBaselineV1 =
  | CommandWorkloadBaselineV1
  | SequenceWorkloadBaselineV1
  | ReplayWorkloadBaselineV1
  | PersistenceWorkloadBaselineV1;

const usageV1 = "usage: deno task bench:snapshot " +
  "[--entity-count <100|1000|10000|100000>]... " +
  "[--workload-class <command|sequence|replay|persistence>]... " +
  "[--command-class <single_field_committed|multi_slice_committed|" +
  "cross_owner_atomic_committed|rejected|faulted>]... " +
  "[--warmup <non-negative integer>] [--samples <positive integer>] [--output <path>]";

function argumentErrorV1(message: string): never {
  throw new TypeError(`${message}\n${usageV1}`);
}

function parseIntegerV1(value: string, name: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    return argumentErrorV1(`${name} must be an integer >= ${String(minimum)}`);
  }
  return parsed;
}

function parseEntityCountV1(value: string): SnapshotCommitEntityCountV1 {
  const parsed = Number(value);
  const entityCount = snapshotCommitEntityCountsV1.find((candidate) => candidate === parsed);
  if (entityCount === undefined) {
    return argumentErrorV1(`unsupported --entity-count: ${value}`);
  }
  return entityCount;
}

function parseCommandClassV1(value: string): SnapshotBenchmarkCommandClassV1 {
  const commandClass = snapshotBenchmarkCommandClassesV1.find((candidate) => candidate === value);
  if (commandClass === undefined) {
    return argumentErrorV1(`unsupported --command-class: ${value}`);
  }
  return commandClass;
}

function parseWorkloadClassV1(value: string): SnapshotBenchmarkWorkloadClassV1 {
  const workloadClass = snapshotBenchmarkWorkloadClassesV1.find((candidate) => candidate === value);
  if (workloadClass === undefined) {
    return argumentErrorV1(`unsupported --workload-class: ${value}`);
  }
  return workloadClass;
}

function parseOptionsV1(argv: readonly string[]): BenchmarkOptionsV1 {
  const selectedEntityCounts = new Set<SnapshotCommitEntityCountV1>();
  const selectedCommandClasses = new Set<SnapshotBenchmarkCommandClassV1>();
  const selectedWorkloadClasses = new Set<SnapshotBenchmarkWorkloadClassV1>();
  let warmup = 1;
  let samples = 5;
  let output: string | undefined;
  let warmupSeen = false;
  let samplesSeen = false;
  let outputSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex < 0 ? argument : argument.slice(0, equalsIndex);
    let value = equalsIndex < 0 ? undefined : argument.slice(equalsIndex + 1);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return argumentErrorV1(`${flag} requires a value`);
    }

    switch (flag) {
      case "--entity-count":
        selectedEntityCounts.add(parseEntityCountV1(value));
        break;
      case "--command-class":
        selectedCommandClasses.add(parseCommandClassV1(value));
        break;
      case "--workload-class":
        selectedWorkloadClasses.add(parseWorkloadClassV1(value));
        break;
      case "--warmup":
        if (warmupSeen) {
          return argumentErrorV1("--warmup may only be provided once");
        }
        warmupSeen = true;
        warmup = parseIntegerV1(value, "--warmup", 0);
        break;
      case "--samples":
        if (samplesSeen) {
          return argumentErrorV1("--samples may only be provided once");
        }
        samplesSeen = true;
        samples = parseIntegerV1(value, "--samples", 1);
        break;
      case "--output":
        if (outputSeen) {
          return argumentErrorV1("--output may only be provided once");
        }
        outputSeen = true;
        output = value;
        break;
      default:
        return argumentErrorV1(`unknown argument: ${flag}`);
    }
  }

  const entityCounts = selectedEntityCounts.size === 0
    ? snapshotCommitEntityCountsV1
    : snapshotCommitEntityCountsV1.filter((entityCount) => selectedEntityCounts.has(entityCount));
  const commandClasses = selectedCommandClasses.size === 0
    ? snapshotBenchmarkCommandClassesV1
    : snapshotBenchmarkCommandClassesV1.filter((commandClass) =>
      selectedCommandClasses.has(commandClass)
    );
  const workloadClasses = selectedWorkloadClasses.size === 0
    ? selectedCommandClasses.size === 0
      ? snapshotBenchmarkWorkloadClassesV1
      : (["command"] as const)
    : snapshotBenchmarkWorkloadClassesV1.filter((workloadClass) =>
      selectedWorkloadClasses.has(workloadClass)
    );
  if (selectedCommandClasses.size > 0 && !workloadClasses.includes("command")) {
    return argumentErrorV1("--command-class requires the command workload class to be selected");
  }
  if (
    selectedWorkloadClasses.size > 0 &&
    [...selectedWorkloadClasses].some((workloadClass) => workloadClass !== "command") &&
    !entityCounts.includes(100)
  ) {
    return argumentErrorV1(
      "sequence, replay, and persistence workloads are admitted only for --entity-count 100",
    );
  }
  return {
    entityCounts,
    commandClasses,
    workloadClasses,
    warmup,
    samples,
    ...(output === undefined ? {} : { output }),
  };
}

function consistencySignatureV1(run: unknown): string {
  return JSON.stringify(run);
}

function verifyConsistentRunV1<TRun>(
  workloadId: string,
  expected: TRun | undefined,
  actual: TRun,
): TRun {
  if (
    expected !== undefined &&
    consistencySignatureV1(actual) !== consistencySignatureV1(expected)
  ) {
    throw new Error(`non-deterministic benchmark result for workload ${workloadId}`);
  }
  return expected ?? actual;
}

function validateDurationV1(workloadId: string, durationMs: number | undefined): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error(`invalid duration for workload ${workloadId}`);
  }
  return durationMs;
}

function percentileV1(values: readonly number[], percentile: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.max(0, Math.ceil(percentile * sorted.length) - 1);
  const selected = sorted[index];
  if (selected === undefined) {
    throw new TypeError("percentile requires at least one sample");
  }
  return selected;
}

async function measureFreshRunsV1<TRun>(input: {
  readonly workloadId: string;
  readonly warmup: number;
  readonly samples: number;
  runFresh(): Promise<{
    readonly consistentRun: TRun;
    readonly dispatchDurationMs: number;
  }>;
}): Promise<{
  readonly consistentRun: TRun;
  readonly durationMs: WorkloadBaselineCommonV1["durationMs"];
}> {
  let expectedRun: TRun | undefined;
  const durations: number[] = [];
  const totalRuns = input.warmup + input.samples;
  for (let index = 0; index < totalRuns; index += 1) {
    const run = await input.runFresh();
    expectedRun = verifyConsistentRunV1(input.workloadId, expectedRun, run.consistentRun);
    const durationMs = validateDurationV1(input.workloadId, run.dispatchDurationMs);
    if (index >= input.warmup) durations.push(durationMs);
  }
  if (expectedRun === undefined) throw new TypeError("workload did not run");

  return {
    consistentRun: expectedRun,
    durationMs: {
      p50: percentileV1(durations, 0.5),
      p95: percentileV1(durations, 0.95),
    },
  };
}

async function runWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotBenchmarkCommandClassV1;
  readonly warmup: number;
  readonly samples: number;
}): Promise<CommandWorkloadBaselineV1> {
  const workloadId = `snapshot-commit-v1/${String(input.entityCount)}/${input.commandClass}`;
  const measured = await measureFreshRunsV1({
    workloadId,
    warmup: input.warmup,
    samples: input.samples,
    async runFresh() {
      const prepared = input.commandClass === "cross_owner_atomic_committed"
        ? prepareTimedSnapshotTransactionWorkloadV1({
          entityCount: input.entityCount,
        })
        : prepareTimedSnapshotCommitWorkloadV1({
          entityCount: input.entityCount,
          commandClass: input.commandClass,
        });
      if (prepared.descriptor.workloadId !== workloadId) {
        throw new Error(`unexpected workload descriptor: ${prepared.descriptor.workloadId}`);
      }
      const outcome = await prepared.runOnce();
      return {
        consistentRun: {
          counts: outcome.counts,
          setupCounts: prepared.setupCounts,
          outcome: outcome.outcome,
        },
        dispatchDurationMs: outcome.dispatchDurationMs,
      };
    },
  });

  return {
    workloadId,
    workloadClass: "command",
    entityCount: input.entityCount,
    commandClass: input.commandClass,
    samples: input.samples,
    durationMs: measured.durationMs,
    ...measured.consistentRun,
  };
}

function outcomeCountsV1(
  outcomes: readonly ("committed" | "rejected" | "faulted")[],
): SequenceWorkloadBaselineV1["outcomeCounts"] {
  let committed = 0;
  let rejected = 0;
  let faulted = 0;
  for (const outcome of outcomes) {
    switch (outcome) {
      case "committed":
        committed += 1;
        break;
      case "rejected":
        rejected += 1;
        break;
      case "faulted":
        faulted += 1;
        break;
    }
  }
  return { committed, rejected, faulted };
}

async function runSequenceWorkloadV1(input: {
  readonly warmup: number;
  readonly samples: number;
}): Promise<SequenceWorkloadBaselineV1> {
  const entityCount = 100;
  const sequenceClass = snapshotCommitSequenceClassesV1[0];
  const workloadId = `snapshot-commit-sequence-v1/${String(entityCount)}/${sequenceClass}`;
  const measured = await measureFreshRunsV1({
    workloadId,
    warmup: input.warmup,
    samples: input.samples,
    async runFresh() {
      const prepared = prepareTimedSnapshotCommitSequenceWorkloadV1({
        entityCount,
        sequenceClass,
      });
      if (prepared.descriptor.workloadId !== workloadId) {
        throw new Error(`unexpected workload descriptor: ${prepared.descriptor.workloadId}`);
      }
      const outcome = await prepared.runOnce();
      return {
        consistentRun: {
          counts: outcome.counts,
          setupCounts: prepared.setupCounts,
          outcomes: outcome.outcomes,
          commandCount: prepared.descriptor.commandCount,
        },
        dispatchDurationMs: outcome.dispatchDurationMs,
      };
    },
  });

  return {
    workloadId,
    workloadClass: "sequence",
    entityCount,
    sequenceClass,
    commandCount: measured.consistentRun.commandCount,
    samples: input.samples,
    durationMs: measured.durationMs,
    counts: measured.consistentRun.counts,
    setupCounts: measured.consistentRun.setupCounts,
    outcomeCounts: outcomeCountsV1(measured.consistentRun.outcomes),
  };
}

async function runReplayWorkloadV1(input: {
  readonly warmup: number;
  readonly samples: number;
}): Promise<ReplayWorkloadBaselineV1> {
  const entityCount = 100;
  const workloadId = `snapshot-replay-v1/${String(entityCount)}/mixed_outcomes`;
  const measured = await measureFreshRunsV1({
    workloadId,
    warmup: input.warmup,
    samples: input.samples,
    async runFresh() {
      const prepared = await prepareTimedSnapshotReplayWorkloadV1({
        entityCount,
      });
      if (prepared.descriptor.workloadId !== workloadId) {
        throw new Error(`unexpected workload descriptor: ${prepared.descriptor.workloadId}`);
      }
      const outcome = await prepared.runOnce();
      return {
        consistentRun: {
          counts: outcome.counts,
          setupCounts: prepared.setupCounts,
          recordingCounts: prepared.recordingCounts,
          comparison: outcome.comparison,
          commandCount: prepared.descriptor.commandCount,
        },
        dispatchDurationMs: outcome.dispatchDurationMs,
      };
    },
  });

  return {
    workloadId,
    workloadClass: "replay",
    entityCount,
    sequenceClass: "mixed_long_retained",
    commandCount: measured.consistentRun.commandCount,
    samples: input.samples,
    durationMs: measured.durationMs,
    counts: measured.consistentRun.counts,
    setupCounts: measured.consistentRun.setupCounts,
    recordingCounts: measured.consistentRun.recordingCounts,
    comparison: measured.consistentRun.comparison,
  };
}

async function runPersistenceWorkloadV1(input: {
  readonly warmup: number;
  readonly samples: number;
}): Promise<PersistenceWorkloadBaselineV1> {
  const entityCount = 100;
  const workloadId = "snapshot-persistence-v1/100/every_commit_auto_rotation";
  const measured = await measureFreshRunsV1({
    workloadId,
    warmup: input.warmup,
    samples: input.samples,
    async runFresh() {
      const prepared = await prepareTimedSnapshotPersistenceWorkloadV1({
        entityCount,
      });
      if (prepared.descriptor.workloadId !== workloadId) {
        throw new Error(`unexpected workload descriptor: ${prepared.descriptor.workloadId}`);
      }
      const outcome = await prepared.runOnce();
      return {
        consistentRun: {
          counts: outcome.aggregateCounts,
          setupCounts: prepared.setupCounts,
          autosaveClass: prepared.descriptor.autosaveClass,
          commandCount: prepared.descriptor.commandCount,
          firstAutoSave: outcome.firstAutoSave,
          rotation: outcome.rotation,
        },
        dispatchDurationMs: outcome.dispatchDurationMs,
      };
    },
  });

  return {
    workloadId,
    workloadClass: "persistence",
    entityCount,
    samples: input.samples,
    durationMs: measured.durationMs,
    ...measured.consistentRun,
  };
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const outputDirectory = await Deno.makeTempDir({
    prefix: "sillymaker-snapshot-commit-",
  });
  return join(outputDirectory, "baseline.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const workloads: WorkloadBaselineV1[] = [];
  if (options.workloadClasses.includes("command")) {
    for (const entityCount of options.entityCounts) {
      for (const commandClass of options.commandClasses) {
        workloads.push(
          await runWorkloadV1({
            entityCount,
            commandClass,
            warmup: options.warmup,
            samples: options.samples,
          }),
        );
      }
    }
  }
  if (options.entityCounts.includes(100) && options.workloadClasses.includes("sequence")) {
    workloads.push(
      await runSequenceWorkloadV1({
        warmup: options.warmup,
        samples: options.samples,
      }),
    );
  }
  if (options.entityCounts.includes(100) && options.workloadClasses.includes("replay")) {
    workloads.push(
      await runReplayWorkloadV1({
        warmup: options.warmup,
        samples: options.samples,
      }),
    );
  }
  if (options.entityCounts.includes(100) && options.workloadClasses.includes("persistence")) {
    workloads.push(
      await runPersistenceWorkloadV1({
        warmup: options.warmup,
        samples: options.samples,
      }),
    );
  }

  const report = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    parameters: {
      warmup: options.warmup,
      samples: options.samples,
    },
    workloads,
  };
  const path = await outputPathV1(options.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path);
}

try {
  await mainV1();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exitCode = 1;
}
