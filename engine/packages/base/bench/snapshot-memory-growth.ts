// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  createSnapshotMemoryGrowthReportV1,
  prepareSnapshotMemoryGrowthWorkloadV1,
  snapshotMemoryGrowthBenchmarkConfigV1,
  type SnapshotMemoryUsageV1,
} from "../src/testkit/snapshot-memory-growth-workload.ts";

// This executable runs under Deno; tsc checks it without Deno lib types.
declare const Deno: {
  readonly args: readonly string[];
  readonly build: {
    readonly target: string;
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
  memoryUsage(): {
    readonly rss: number;
    readonly heapTotal: number;
    readonly heapUsed: number;
    readonly external: number;
  };
};

interface BenchmarkOptionsV1 {
  readonly output?: string;
}

const usageV1 = "usage: deno task bench:snapshot:memory [--output <path>]";

function argumentErrorV1(message: string): never {
  throw new TypeError(`${message}\n${usageV1}`);
}

function parseOptionsV1(argv: readonly string[]): BenchmarkOptionsV1 {
  let output: string | undefined;
  let outputSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex < 0 ? argument : argument.slice(0, equalsIndex);
    let value = equalsIndex < 0 ? undefined : argument.slice(equalsIndex + 1);

    if (flag !== "--output") {
      return argumentErrorV1(`unknown argument: ${flag}`);
    }
    if (outputSeen) {
      return argumentErrorV1("--output may only be provided once");
    }
    outputSeen = true;
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return argumentErrorV1("--output requires a value");
    }
    output = value;
  }

  return output === undefined ? {} : { output };
}

function requireExplicitGarbageCollectorV1(): () => void {
  const gc = (
    globalThis as typeof globalThis & {
      readonly gc?: () => void;
    }
  ).gc;
  if (gc === undefined) {
    throw new Error(
      "snapshot memory-growth benchmark requires globalThis.gc; " +
        "run with --v8-flags=--expose-gc",
    );
  }
  return gc;
}

function readMemoryUsageV1(): SnapshotMemoryUsageV1 {
  const usage = Deno.memoryUsage();
  return Object.freeze({
    rssBytes: usage.rss,
    heapTotalBytes: usage.heapTotal,
    heapUsedBytes: usage.heapUsed,
    externalBytes: usage.external,
  });
}

function collectGarbageV1(gc: () => void): () => Promise<void> {
  return async () => {
    gc();
    await new Promise<void>((resolveTimer) => {
      setTimeout(resolveTimer, 0);
    });
    gc();
  };
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const outputDirectory = await Deno.makeTempDir({
    prefix: "sillymaker-snapshot-memory-growth-",
  });
  return join(outputDirectory, "baseline.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const gc = requireExplicitGarbageCollectorV1();
  const prepared = prepareSnapshotMemoryGrowthWorkloadV1({
    ...snapshotMemoryGrowthBenchmarkConfigV1,
    readMemoryUsage: readMemoryUsageV1,
    collectGarbage: collectGarbageV1(gc),
    now: () => performance.now(),
  });
  const run = await prepared.runOnce();
  const report = createSnapshotMemoryGrowthReportV1({
    generatedAt: new Date().toISOString(),
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      target: Deno.build.target,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    gcPassesPerCheckpoint: 2,
    descriptor: prepared.descriptor,
    setupCounts: prepared.setupCounts,
    run,
  });
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
