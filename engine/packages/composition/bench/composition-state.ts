// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  createNeutralStatePerformanceReportV1,
  neutralStateMatrixCellsV1,
  neutralStateSaveClassesV1,
  neutralStateTouchedModuleCountsV1,
  runNeutralStateColdSampleV1,
  runNeutralStateCorrectnessV1,
  runNeutralStateSteadySampleV1,
  type NeutralStateCorrectnessObservationV1,
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
};

interface BenchmarkOptionsV1 {
  readonly saveClasses: readonly NeutralStateSaveClassV1[];
  readonly touchedModuleCounts: readonly NeutralStateTouchedModuleCountV1[];
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

const usageV1 = "usage: deno task bench:composition-state " +
  "[--save-class <10kib|100kib|1mib>]... [--touched-modules <1|4|16>]... " +
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

function parseOptionsV1(argv: readonly string[]): BenchmarkOptionsV1 {
  const saveClasses = new Set<NeutralStateSaveClassV1>();
  const touchedModuleCounts = new Set<NeutralStateTouchedModuleCountV1>();
  let warmup = 1;
  let samples = 5;
  let output: string | undefined;
  const singletons = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return argumentErrorV1(`${flag} requires a value`);
    }
    if (flag === "--save-class") saveClasses.add(parseSaveClassV1(value));
    else if (flag === "--touched-modules") {
      touchedModuleCounts.add(parseTouchedModulesV1(value));
    } else {
      if (singletons.has(flag)) return argumentErrorV1(`${flag} may only be provided once`);
      singletons.add(flag);
      if (flag === "--warmup") warmup = parseIntegerV1(value, flag, 0);
      else if (flag === "--samples") samples = parseIntegerV1(value, flag, 1);
      else if (flag === "--output") output = value;
      else return argumentErrorV1(`unknown argument: ${flag}`);
    }
  }
  return {
    saveClasses: saveClasses.size === 0
      ? neutralStateSaveClassesV1
      : neutralStateSaveClassesV1.filter((value) => saveClasses.has(value)),
    touchedModuleCounts: touchedModuleCounts.size === 0
      ? neutralStateTouchedModuleCountsV1
      : neutralStateTouchedModuleCountsV1.filter((value) => touchedModuleCounts.has(value)),
    warmup,
    samples,
    ...(output === undefined ? {} : { output }),
  };
}

function percentileV1(values: readonly number[], percentile: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentile / 100) * ordered.length) - 1),
  );
  return ordered[index]!;
}

function distributionV1(values: readonly number[]) {
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError("neutral benchmark recorded an invalid duration");
  }
  return Object.freeze({ p50: percentileV1(values, 50), p95: percentileV1(values, 95) });
}

function correctnessSemanticV1(observation: NeutralStateCorrectnessObservationV1) {
  const { durationMs: _durationMs, ...semantic } = observation;
  return semantic;
}

function requireConsistentV1(expected: unknown, actual: unknown, subject: string): unknown {
  if (expected !== null && JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new TypeError(`${subject} changed between benchmark samples`);
  }
  return expected ?? actual;
}

async function outputPathV1(requested: string | undefined): Promise<string> {
  if (requested !== undefined) return resolve(requested);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-composition-state-" });
  return join(directory, "baseline.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  for (let index = 0; index < options.warmup; index += 1) {
    await runNeutralStateColdSampleV1();
  }
  const coldRuns = [];
  for (let index = 0; index < options.samples; index += 1) {
    coldRuns.push(await runNeutralStateColdSampleV1());
  }
  const cold = Object.freeze([Object.freeze({
    workloadId: "neutral-composition-state-v1/cold-activation/16-modules",
    samples: options.samples,
    moduleCount: coldRuns[0]!.moduleCount,
    sessionStatus: coldRuns[0]!.sessionStatus,
    durationMs: Object.freeze({
      mount: distributionV1(coldRuns.map((run) => run.durationMs.mount)),
      directPlanCompile: distributionV1(
        coldRuns.map((run) => run.durationMs.directPlanCompile),
      ),
      sessionCreate: distributionV1(coldRuns.map((run) => run.durationMs.sessionCreate)),
      dispose: distributionV1(coldRuns.map((run) => run.durationMs.dispose)),
    }),
  })]);

  const selectedCells = neutralStateMatrixCellsV1.filter((cell) =>
    options.saveClasses.includes(cell.saveClass) &&
    options.touchedModuleCounts.includes(cell.touchedModules)
  );
  const cells = [];
  for (const cell of selectedCells) {
    for (let index = 0; index < options.warmup; index += 1) {
      await runNeutralStateCorrectnessV1(cell);
      await runNeutralStateSteadySampleV1(cell);
    }
    const correctnessRuns: NeutralStateCorrectnessObservationV1[] = [];
    const steadyRuns = [];
    let semantic: unknown = null;
    for (let index = 0; index < options.samples; index += 1) {
      const correctness = await runNeutralStateCorrectnessV1(cell);
      correctnessRuns.push(correctness);
      semantic = requireConsistentV1(
        semantic,
        correctnessSemanticV1(correctness),
        `${cell.saveClass}/${String(cell.touchedModules)} correctness`,
      );
      steadyRuns.push(await runNeutralStateSteadySampleV1(cell));
    }
    cells.push(Object.freeze({
      workloadId: `neutral-composition-state-v1/${cell.saveClass}/${String(cell.touchedModules)}`,
      ...cell,
      samples: options.samples,
      correctness: semantic,
      durationMs: Object.freeze({
        retentionCrossingTranscript: distributionV1(
          correctnessRuns.map((run) => run.durationMs.retentionCrossingTranscript),
        ),
        saveRoundtrip: distributionV1(
          correctnessRuns.map((run) => run.durationMs.saveRoundtrip),
        ),
        authoritativeReplay: distributionV1(
          correctnessRuns.map((run) => run.durationMs.authoritativeReplay),
        ),
        steadyDispatch: distributionV1(steadyRuns.map((run) => run.durationMs)),
        steadyDispatchPerCommand: distributionV1(
          steadyRuns.map((run) => run.durationMsPerCommand),
        ),
      }),
      steadyBoundary: Object.freeze({
        prefillCommands: steadyRuns[0]!.prefillCommands,
        measuredCommands: steadyRuns[0]!.measuredCommands,
        retainedBeforeMeasurement: steadyRuns[0]!.retainedBeforeMeasurement,
        replayBaseCommandSequenceBeforeMeasurement:
          steadyRuns[0]!.replayBaseCommandSequenceBeforeMeasurement,
      }),
    }));
  }
  const report = createNeutralStatePerformanceReportV1({
    generatedAt: new Date().toISOString(),
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    warmup: options.warmup,
    samples: options.samples,
    cold,
    cells,
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
