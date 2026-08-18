// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  createNeutralStateMemoryReportV1,
  neutralStateGcCellsV1,
  neutralStateSaveClassesV1,
  neutralStateTouchedModuleCountsV1,
  runNeutralStateMemoryCellV1,
  type NeutralStateSaveClassV1,
  type NeutralStateTouchedModuleCountV1,
} from "./composition-state-workload.ts";

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
  memoryUsage(): {
    readonly rss: number;
    readonly heapTotal: number;
    readonly heapUsed: number;
    readonly external: number;
  };
};

interface MemoryOptionsV1 {
  readonly saveClass: NeutralStateSaveClassV1;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly output?: string;
}

const usageV1 = "usage: deno task bench:composition-state:memory --save-class " +
  "<10kib|100kib|1mib> --touched-modules <1|4|16> [--output <path>]";

function argumentErrorV1(message: string): never {
  throw new TypeError(`${message}\n${usageV1}`);
}

function parseSaveClassV1(value: string): NeutralStateSaveClassV1 {
  const saveClass = neutralStateSaveClassesV1.find((candidate) => candidate === value);
  if (saveClass === undefined) return argumentErrorV1(`unsupported --save-class: ${value}`);
  return saveClass;
}

function parseTouchedModulesV1(value: string): NeutralStateTouchedModuleCountV1 {
  const parsed = Number(value);
  const touchedModules = neutralStateTouchedModuleCountsV1.find((candidate) =>
    candidate === parsed
  );
  if (touchedModules === undefined) {
    return argumentErrorV1(`unsupported --touched-modules: ${value}`);
  }
  return touchedModules;
}

function parseOptionsV1(argv: readonly string[]): MemoryOptionsV1 {
  let saveClass: NeutralStateSaveClassV1 | undefined;
  let touchedModules: NeutralStateTouchedModuleCountV1 | undefined;
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
    if (flag === "--save-class") saveClass = parseSaveClassV1(value);
    else if (flag === "--touched-modules") touchedModules = parseTouchedModulesV1(value);
    else if (flag === "--output") output = value;
    else return argumentErrorV1(`unknown argument: ${flag}`);
  }
  if (saveClass === undefined) return argumentErrorV1("--save-class is required");
  if (touchedModules === undefined) return argumentErrorV1("--touched-modules is required");
  const cell = neutralStateGcCellsV1.find((candidate) =>
    candidate.saveClass === saveClass && candidate.touchedModules === touchedModules
  );
  if (cell === undefined) {
    return argumentErrorV1(
      `${saveClass}/${String(touchedModules)} is not one of the five declared GC cells`,
    );
  }
  return { saveClass, touchedModules, ...(output === undefined ? {} : { output }) };
}

function requireExplicitGarbageCollectorV1(): () => void {
  const gc = (globalThis as typeof globalThis & { readonly gc?: () => void }).gc;
  if (gc === undefined) {
    throw new Error(
      "neutral composition/State memory benchmark requires globalThis.gc; " +
        "run through bench:composition-state:memory",
    );
  }
  return gc;
}

async function outputPathV1(requested: string | undefined): Promise<string> {
  if (requested !== undefined) return resolve(requested);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-composition-state-memory-" });
  return join(directory, "baseline.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const gc = requireExplicitGarbageCollectorV1();
  const cell = neutralStateGcCellsV1.find((candidate) =>
    candidate.saveClass === options.saveClass &&
    candidate.touchedModules === options.touchedModules
  )!;
  const run = await runNeutralStateMemoryCellV1({
    cell,
    async collectGarbage() {
      gc();
    },
    async yieldMacrotask() {
      await new Promise<void>((resolveTimer) => setTimeout(resolveTimer, 0));
    },
    readMemoryUsage() {
      const usage = Deno.memoryUsage();
      return Object.freeze({
        rssBytes: usage.rss,
        heapTotalBytes: usage.heapTotal,
        heapUsedBytes: usage.heapUsed,
        externalBytes: usage.external,
      });
    },
  });
  const report = createNeutralStateMemoryReportV1({
    generatedAt: new Date().toISOString(),
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    cell,
    checkpoints: run.checkpoints,
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
