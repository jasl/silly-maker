// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

import {
  managedSurfaceLifecycleParameterClassesV1,
  managedSurfaceLifecycleScenarioClassesV1,
  managedSurfaceLifecycleTargetCountsV1,
  prepareManagedSurfaceLifecycleWorkloadV1,
  type ManagedSurfaceLifecycleSemanticObservationV1,
} from "../src/testkit/managed-surface-lifecycle-workload.ts";

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
  exitCode: number;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
};

interface BenchmarkOptionsV1 {
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

const execFile = promisify(execFileCallback);
const repositoryRootV1 = fileURLToPath(new URL("../../../..", import.meta.url));
const usageV1 = "usage: deno task bench:surfaces [--warmup <non-negative integer>] " +
  "[--samples <positive integer>] [--output <path>]";

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

function parseOptionsV1(argv: readonly string[]): BenchmarkOptionsV1 {
  let warmup = 2;
  let samples = 10;
  let output: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (seen.has(flag)) return argumentErrorV1(`${flag} may only be provided once`);
    seen.add(flag);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return argumentErrorV1(`${flag} requires a value`);
    }
    if (flag === "--warmup") warmup = parseIntegerV1(value, flag, 0);
    else if (flag === "--samples") samples = parseIntegerV1(value, flag, 1);
    else if (flag === "--output") output = value;
    else return argumentErrorV1(`unknown argument: ${flag}`);
  }
  return output === undefined ? { warmup, samples } : { warmup, samples, output };
}

function percentileV1(values: readonly number[], percentile: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * ordered.length) - 1),
  );
  return ordered[index]!;
}

async function repositoryStateV1(): Promise<Readonly<{ head: string; dirty: boolean }>> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd: repositoryRootV1 }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRootV1,
    }),
  ]);
  return {
    head: head.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-surface-lifecycle-" });
  return join(directory, "baseline.json");
}

function requireConsistentSemanticV1(
  expected: ManagedSurfaceLifecycleSemanticObservationV1 | null,
  actual: ManagedSurfaceLifecycleSemanticObservationV1,
): ManagedSurfaceLifecycleSemanticObservationV1 {
  if (expected !== null && JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error("managed surface lifecycle semantic observation changed between samples");
  }
  return expected ?? actual;
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const workloads = [];
  for (const targetCount of managedSurfaceLifecycleTargetCountsV1) {
    for (const parameterClass of managedSurfaceLifecycleParameterClassesV1) {
      for (const scenarioClass of managedSurfaceLifecycleScenarioClassesV1) {
        const workload = prepareManagedSurfaceLifecycleWorkloadV1({
          targetCount,
          parameterClass,
          scenarioClass,
        });
        for (let warmupIndex = 0; warmupIndex < options.warmup; warmupIndex += 1) {
          workload.runOnce();
        }
        const durations: number[] = [];
        let semantic: ManagedSurfaceLifecycleSemanticObservationV1 | null = null;
        for (let sampleIndex = 0; sampleIndex < options.samples; sampleIndex += 1) {
          const run = workload.runOnce();
          durations.push(run.durationMs);
          semantic = requireConsistentSemanticV1(semantic, run.semantic);
        }
        workloads.push({
          ...workload.descriptor,
          samples: options.samples,
          durationMs: {
            p50: percentileV1(durations, 50),
            p95: percentileV1(durations, 95),
          },
          semantic,
        });
      }
    }
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: await repositoryStateV1(),
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    warmup: options.warmup,
    samples: options.samples,
    workloads,
    interpretation: {
      status: "trend_only",
      semanticCountsAreJavaScriptAllocations: false,
      machineBoundHardGate: false,
    },
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
