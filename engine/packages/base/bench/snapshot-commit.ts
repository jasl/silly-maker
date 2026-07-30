// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  snapshotCommitCommandClassesV1,
  snapshotCommitEntityCountsV1,
} from "@sillymaker/base/testkit";
import type {
  SnapshotCommitCommandClassV1,
  SnapshotCommitEntityCountV1,
  SnapshotCommitWorkloadRunV1,
  SnapshotSessionWorkCountsV1,
} from "@sillymaker/base/testkit";
import { prepareTimedSnapshotCommitWorkloadV1 } from "../src/testkit/snapshot-commit-workload.ts";

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
  readonly commandClasses: readonly SnapshotCommitCommandClassV1[];
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

interface ConsistentRunV1 {
  readonly counts: SnapshotSessionWorkCountsV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  readonly outcome: SnapshotCommitWorkloadRunV1["outcome"];
}

interface WorkloadBaselineV1 extends ConsistentRunV1 {
  readonly workloadId: string;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
  readonly samples: number;
  readonly durationMs: {
    readonly p50: number;
    readonly p95: number;
  };
}

const usageV1 =
  "usage: deno task bench:snapshot " +
  "[--entity-count <100|1000|10000|100000>]... " +
  "[--command-class <single_field_committed|multi_slice_committed|rejected|faulted>]... " +
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

function parseCommandClassV1(value: string): SnapshotCommitCommandClassV1 {
  const commandClass = snapshotCommitCommandClassesV1.find((candidate) => candidate === value);
  if (commandClass === undefined) {
    return argumentErrorV1(`unsupported --command-class: ${value}`);
  }
  return commandClass;
}

function parseOptionsV1(argv: readonly string[]): BenchmarkOptionsV1 {
  const selectedEntityCounts = new Set<SnapshotCommitEntityCountV1>();
  const selectedCommandClasses = new Set<SnapshotCommitCommandClassV1>();
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

  const entityCounts =
    selectedEntityCounts.size === 0
      ? snapshotCommitEntityCountsV1
      : snapshotCommitEntityCountsV1.filter((entityCount) => selectedEntityCounts.has(entityCount));
  const commandClasses =
    selectedCommandClasses.size === 0
      ? snapshotCommitCommandClassesV1
      : snapshotCommitCommandClassesV1.filter((commandClass) =>
          selectedCommandClasses.has(commandClass),
        );
  return {
    entityCounts,
    commandClasses,
    warmup,
    samples,
    ...(output === undefined ? {} : { output }),
  };
}

function consistencySignatureV1(run: ConsistentRunV1): string {
  return JSON.stringify(run);
}

function verifyConsistentRunV1(
  workloadId: string,
  expected: ConsistentRunV1 | undefined,
  actual: ConsistentRunV1,
): ConsistentRunV1 {
  if (
    expected !== undefined &&
    consistencySignatureV1(actual) !== consistencySignatureV1(expected)
  ) {
    throw new Error(`non-deterministic counts, setupCounts, or outcome for workload ${workloadId}`);
  }
  return expected ?? actual;
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

async function runWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
  readonly warmup: number;
  readonly samples: number;
}): Promise<WorkloadBaselineV1> {
  const workloadId = `snapshot-commit-v1/${String(input.entityCount)}/${input.commandClass}`;
  let expectedRun: ConsistentRunV1 | undefined;

  const runFreshV1 = async (measure: boolean): Promise<number | undefined> => {
    const prepared = prepareTimedSnapshotCommitWorkloadV1({
      entityCount: input.entityCount,
      commandClass: input.commandClass,
    });
    if (prepared.descriptor.workloadId !== workloadId) {
      throw new Error(`unexpected workload descriptor: ${prepared.descriptor.workloadId}`);
    }
    const outcome = await prepared.runOnce();
    expectedRun = verifyConsistentRunV1(workloadId, expectedRun, {
      counts: outcome.counts,
      setupCounts: prepared.setupCounts,
      outcome: outcome.outcome,
    });
    const durationMs = measure ? outcome.dispatchDurationMs : undefined;
    if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs < 0)) {
      throw new Error(`invalid duration for workload ${workloadId}`);
    }
    return durationMs;
  };

  for (let index = 0; index < input.warmup; index += 1) {
    await runFreshV1(false);
  }
  const durations: number[] = [];
  for (let index = 0; index < input.samples; index += 1) {
    const durationMs = await runFreshV1(true);
    if (durationMs === undefined) {
      throw new TypeError("measured run did not produce a duration");
    }
    durations.push(durationMs);
  }
  if (expectedRun === undefined) throw new TypeError("workload did not run");

  return {
    workloadId,
    entityCount: input.entityCount,
    commandClass: input.commandClass,
    samples: input.samples,
    durationMs: {
      p50: percentileV1(durations, 0.5),
      p95: percentileV1(durations, 0.95),
    },
    ...expectedRun,
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

  const report = {
    schemaVersion: 1,
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
