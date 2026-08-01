// SPDX-License-Identifier: MIT
import {
  createAuthoritativeAmbientGuardDefinitionsV1,
  createEmptyAmbientTripwireCountsV1,
  type AmbientTripwireCountsV1,
  type AmbientTripwireResultV1,
  type AmbientTripwireRuntimeV1,
} from "./ambient-tripwire.ts";
import type {
  AuthoritativeDeterminismBootstrapInputV1,
  AuthoritativeDeterminismTraceV1,
} from "./authoritative-determinism-driver.ts";

declare const Deno: unknown;

export type AuthoritativeDeterminismTripwireScenarioV1 =
  | "trace"
  | "ambient_random"
  | "ambient_crypto_prototype"
  | "ambient_invalid_date"
  | "ambient_local_date"
  | "ambient_invalid_date_constructor"
  | "ambient_local_date_constructor"
  | "ambient_environment_root"
  | "ambient_date_reflection"
  | "ambient_performance_json";

export interface AuthoritativeDeterminismTripwireRequestV1 {
  readonly schemaVersion: 1;
  readonly bootstrapInput: AuthoritativeDeterminismBootstrapInputV1;
  readonly scenario: AuthoritativeDeterminismTripwireScenarioV1;
}

interface TripwireMessageEventV1 {
  readonly data: unknown;
}

interface TripwireErrorEventV1 {
  readonly error?: unknown;
}

export interface TripwireWorkerLikeV1 {
  addEventListener(
    type: "message",
    listener: (event: TripwireMessageEventV1) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: TripwireErrorEventV1) => void,
  ): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface AuthoritativeDeterminismTripwireReceiptV1 {
  readonly result: AmbientTripwireResultV1<AuthoritativeDeterminismTraceV1>;
  readonly workerTerminations: 1;
}

type TripwireWorkerFactoryV1 = (
  url: URL,
  options: { readonly type: "module"; readonly name: string },
) => TripwireWorkerLikeV1;

function runtimeV1(): AmbientTripwireRuntimeV1 {
  return typeof Deno === "object" ? "deno" : "browser";
}

function driverFailedV1(
  runtime: AmbientTripwireRuntimeV1,
  phase: "protocol" | "worker",
): AmbientTripwireResultV1<AuthoritativeDeterminismTraceV1> {
  return Object.freeze({
    kind: "driver_failed",
    runtime,
    phase,
    coverage: Object.freeze([]),
    counts: createEmptyAmbientTripwireCountsV1(),
  });
}

function isRecordV1(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCountsV1(value: unknown): value is AmbientTripwireCountsV1 {
  const keys = [
    "declaredGuards",
    "installedGuards",
    "nativeAbsentGuards",
    "selfTests",
    "driverImports",
    "driverRuns",
    "violations",
  ] as const;
  if (!isRecordV1(value) || Reflect.ownKeys(value).length !== keys.length) return false;
  return keys.every((key) => Number.isSafeInteger(value[key]) && (value[key] as number) >= 0);
}

const ambientCategoriesV1 = new Set([
  "entropy",
  "clock",
  "host_timezone",
  "network",
  "environment",
  "locale_default",
  "dom",
  "capability_escape",
]);
const unavailableReasonsV1 = new Set([
  "target_resolution_failed",
  "descriptor_not_replaceable",
  "replacement_failed",
  "replacement_ineffective",
  "self_test_failed",
  "absence_probe_failed",
]);
const violationCategoriesV1: ReadonlyMap<string, string> = new Map([
  ["determinism.ambient_random", "entropy"],
  ["determinism.crypto_random", "entropy"],
  ["determinism.ambient_clock", "clock"],
  ["determinism.performance_clock", "clock"],
  ["determinism.host_timezone", "host_timezone"],
  ["determinism.date_input_unverified", "host_timezone"],
  ["determinism.network", "network"],
  ["determinism.environment", "environment"],
  ["determinism.locale", "locale_default"],
  ["determinism.dom_storage", "dom"],
  ["determinism.ambient_capability_escape", "capability_escape"],
]);
const authoritativeGuardDefinitionsV1 = createAuthoritativeAmbientGuardDefinitionsV1();

interface CoverageSummaryV1 {
  readonly entries: number;
  readonly installed: number;
  readonly nativeAbsent: number;
}

function coverageSummaryV1(value: unknown): CoverageSummaryV1 | null {
  if (!Array.isArray(value)) return null;
  let installed = 0;
  let nativeAbsent = 0;
  const guardIds = new Set<string>();
  for (const [index, entry] of value.entries()) {
    const expected = authoritativeGuardDefinitionsV1[index];
    if (
      !isRecordV1(entry) || Reflect.ownKeys(entry).length !== 3 ||
      typeof entry.guardId !== "string" || entry.guardId.length === 0 ||
      guardIds.has(entry.guardId) || !Array.isArray(entry.categories) ||
      entry.categories.length === 0 ||
      !entry.categories.every((item) =>
        typeof item === "string" && ambientCategoriesV1.has(item)
      ) ||
      (entry.state !== "installed" && entry.state !== "native_absent") ||
      expected === undefined || entry.guardId !== expected.guardId ||
      entry.categories.length !== expected.categories.length ||
      !entry.categories.every((category, categoryIndex) =>
        category === expected.categories[categoryIndex]
      )
    ) return null;
    guardIds.add(entry.guardId);
    if (entry.state === "installed") installed += 1;
    else nativeAbsent += 1;
  }
  return Object.freeze({ entries: value.length, installed, nativeAbsent });
}

function hasExactKeysV1(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecordV1(value)) return false;
  const actual = Reflect.ownKeys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isNonnegativeSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function validRngStateV1(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 &&
    Number.isInteger(value[0]) && value[0] > 0 && value[0] <= 0xffff_ffff &&
    isNonnegativeSafeIntegerV1(value[1]);
}

function validOutcomeV1(value: unknown, commandClass: string): boolean {
  if (!isRecordV1(value)) return false;
  if (commandClass === "no_draw_committed" || commandClass === "rng_committed") {
    if (
      !hasExactKeysV1(value, ["kind", "facts"]) || value.kind !== "committed" ||
      !Array.isArray(value.facts) || value.facts.length !== 1
    ) return false;
    const fact = value.facts[0];
    return hasExactKeysV1(fact, ["kind", "commandClass", "result"]) &&
      fact.kind === "determinism.committed" && fact.commandClass === commandClass &&
      (commandClass === "no_draw_committed"
        ? fact.result === null
        : isNonnegativeSafeIntegerV1(fact.result));
  }
  if (commandClass === "rejected") {
    return hasExactKeysV1(value, ["kind", "reasons"]) && value.kind === "rejected" &&
      Array.isArray(value.reasons) && value.reasons.length === 1 &&
      hasExactKeysV1(value.reasons[0], ["code"]) &&
      value.reasons[0].code === "determinism.rejected";
  }
  return commandClass === "faulted" && hasExactKeysV1(value, ["kind", "fault"]) &&
    value.kind === "faulted" && hasExactKeysV1(value.fault, ["code"]) &&
    value.fault.code === "determinism.faulted";
}

function validDrawV1(value: unknown): boolean {
  if (!hasExactKeysV1(value, ["ordinal", "purpose", "exclusiveMax", "result", "before", "after"])) {
    return false;
  }
  return Number.isSafeInteger(value.ordinal) && (value.ordinal as number) > 0 &&
    typeof value.purpose === "string" && value.purpose.length > 0 &&
    Number.isSafeInteger(value.exclusiveMax) && (value.exclusiveMax as number) > 0 &&
    isNonnegativeSafeIntegerV1(value.result) &&
    (value.result as number) < (value.exclusiveMax as number) && validRngStateV1(value.before) &&
    validRngStateV1(value.after);
}

function validCommandTraceV1(value: unknown, commandClass: string): boolean {
  if (
    !hasExactKeysV1(value, [
      "command",
      "dispatch",
      "outcome",
      "status",
      "snapshot",
      "rng",
      "log",
    ]) ||
    !hasExactKeysV1(value.command, ["kind"]) || value.command.kind !== commandClass ||
    value.dispatch !== "executed" || !validOutcomeV1(value.outcome, commandClass)
  ) return false;
  const expectedStatus = commandClass === "faulted" ? "fault_paused" : "ready";
  if (
    value.status !== expectedStatus ||
    !hasExactKeysV1(value.snapshot, ["retained", "digests", "sequence"]) ||
    typeof value.snapshot.retained !== "boolean" ||
    !hasExactKeysV1(value.snapshot.digests, ["before", "after"]) ||
    typeof value.snapshot.digests.before !== "string" ||
    typeof value.snapshot.digests.after !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(value.snapshot.digests.before) ||
    !/^sha256:[0-9a-f]{64}$/u.test(value.snapshot.digests.after) ||
    !hasExactKeysV1(value.snapshot.sequence, ["before", "after"]) ||
    !isNonnegativeSafeIntegerV1(value.snapshot.sequence.before) ||
    !isNonnegativeSafeIntegerV1(value.snapshot.sequence.after)
  ) return false;
  if (
    !hasExactKeysV1(value.rng, [
      "committedBefore",
      "attemptedDraws",
      "candidateAfter",
      "committedAfter",
    ]) ||
    !validRngStateV1(value.rng.committedBefore) || !Array.isArray(value.rng.attemptedDraws) ||
    !value.rng.attemptedDraws.every(validDrawV1) || !validRngStateV1(value.rng.candidateAfter) ||
    !validRngStateV1(value.rng.committedAfter)
  ) return false;
  return hasExactKeysV1(value.log, ["source", "ordinal", "outcome"]) &&
    value.log.source === "game" && Number.isSafeInteger(value.log.ordinal) &&
    (value.log.ordinal as number) > 0 && validOutcomeV1(value.log.outcome, commandClass);
}

function validTraceV1(value: unknown): value is AuthoritativeDeterminismTraceV1 {
  if (!hasExactKeysV1(value, ["schemaVersion", "workload", "rngAlgorithm", "commands"])) {
    return false;
  }
  const commands = value.commands;
  if (
    value.schemaVersion !== 1 || value.workload !== "authoritative-determinism-v1" ||
    value.rngAlgorithm !== "xorshift32-v1" || !Array.isArray(commands) || commands.length !== 4
  ) return false;
  const commandClasses = ["no_draw_committed", "rng_committed", "rejected", "faulted"] as const;
  return commandClasses.every((commandClass, index) =>
    validCommandTraceV1(commands[index], commandClass)
  );
}

function validTripwireResultV1(
  value: unknown,
  runtime: AmbientTripwireRuntimeV1,
): value is AmbientTripwireResultV1<AuthoritativeDeterminismTraceV1> {
  if (
    !isRecordV1(value) || value.runtime !== runtime || !validCountsV1(value.counts)
  ) return false;
  const coverage = coverageSummaryV1(value.coverage);
  const parentSideFailure = value.kind === "driver_failed" &&
    (value.phase === "protocol" || value.phase === "worker");
  const expectedDeclaredGuards = parentSideFailure ? 0 : authoritativeGuardDefinitionsV1.length;
  if (
    coverage === null || coverage.installed !== value.counts.installedGuards ||
    coverage.nativeAbsent !== value.counts.nativeAbsentGuards ||
    coverage.entries !== value.counts.selfTests ||
    value.counts.declaredGuards !== expectedDeclaredGuards ||
    coverage.entries > value.counts.declaredGuards
  ) return false;
  const fullCoverage = coverage.entries === value.counts.declaredGuards;
  switch (value.kind) {
    case "passed":
      return Reflect.ownKeys(value).length === 5 && fullCoverage &&
        value.counts.driverImports === 1 && value.counts.driverRuns === 1 &&
        value.counts.violations === 0 && validTraceV1(value.value);
    case "tripwire_unavailable":
      return Reflect.ownKeys(value).length === 6 && typeof value.guardId === "string" &&
        value.guardId.length > 0 && typeof value.reason === "string" &&
        unavailableReasonsV1.has(value.reason) && value.counts.driverImports === 0 &&
        value.counts.driverRuns === 0 && value.counts.violations === 0 &&
        authoritativeGuardDefinitionsV1[coverage.entries]?.guardId === value.guardId;
    case "tripwire_violation":
      return Reflect.ownKeys(value).length === 8 && fullCoverage &&
        typeof value.guardId === "string" && value.guardId.length > 0 &&
        typeof value.code === "string" && violationCategoriesV1.has(value.code) &&
        typeof value.category === "string" && ambientCategoriesV1.has(value.category) &&
        violationCategoriesV1.get(value.code) === value.category &&
        value.counts.driverImports === 1 && value.counts.violations >= 1 &&
        ((value.phase === "module_import" && value.counts.driverRuns === 0) ||
          (value.phase === "driver_run" && value.counts.driverRuns === 1));
    case "driver_failed":
      if (Reflect.ownKeys(value).length !== 5 || value.counts.violations !== 0) return false;
      if (value.phase === "module_import") {
        return fullCoverage && value.counts.driverImports === 1 && value.counts.driverRuns === 0;
      }
      if (value.phase === "driver_run") {
        return fullCoverage && value.counts.driverImports === 1 && value.counts.driverRuns === 1;
      }
      return (value.phase === "protocol" || value.phase === "worker") &&
        coverage.entries === 0 && value.counts.declaredGuards === 0 &&
        value.counts.driverImports === 0 && value.counts.driverRuns === 0;
    default:
      return false;
  }
}

function defaultWorkerFactoryV1(
  url: URL,
  options: { readonly type: "module"; readonly name: string },
): TripwireWorkerLikeV1 {
  return new Worker(url, options);
}

type TripwireTimeoutSchedulerV1 = (callback: () => void) => () => void;

function defaultTimeoutSchedulerV1(callback: () => void): () => void {
  const timeout = setTimeout(callback, 10_000);
  return () => clearTimeout(timeout);
}

export async function runAuthoritativeDeterminismTripwireV1(input: {
  readonly bootstrapInput: AuthoritativeDeterminismBootstrapInputV1;
  readonly scenario: AuthoritativeDeterminismTripwireScenarioV1;
  readonly createWorker?: TripwireWorkerFactoryV1;
  readonly scheduleTimeout?: TripwireTimeoutSchedulerV1;
}): Promise<AuthoritativeDeterminismTripwireReceiptV1> {
  const runtime = runtimeV1();
  const factory = input.createWorker ?? defaultWorkerFactoryV1;
  const worker = factory(
    new URL("./ambient-tripwire-worker.ts", import.meta.url),
    Object.freeze({ type: "module", name: "sillymaker-authoritative-tripwire" }),
  );
  const request: AuthoritativeDeterminismTripwireRequestV1 = Object.freeze({
    schemaVersion: 1,
    bootstrapInput: input.bootstrapInput,
    scenario: input.scenario,
  });
  let terminations = 0;
  let cancelTimeout = () => {};
  let result: AmbientTripwireResultV1<AuthoritativeDeterminismTraceV1>;
  try {
    result = await new Promise((resolve) => {
      let settled = false;
      const settle = (candidate: AmbientTripwireResultV1<AuthoritativeDeterminismTraceV1>) => {
        if (settled) return;
        settled = true;
        cancelTimeout();
        resolve(candidate);
      };
      worker.addEventListener("message", (event) => {
        settle(
          validTripwireResultV1(event.data, runtime)
            ? event.data
            : driverFailedV1(runtime, "protocol"),
        );
      });
      worker.addEventListener("error", () => {
        settle(driverFailedV1(runtime, "worker"));
      });
      const scheduledCancel = (input.scheduleTimeout ?? defaultTimeoutSchedulerV1)(() =>
        settle(driverFailedV1(runtime, "worker"))
      );
      cancelTimeout = scheduledCancel;
      if (settled) scheduledCancel();
      try {
        Reflect.apply(worker.postMessage, worker, [request]);
      } catch {
        settle(driverFailedV1(runtime, "protocol"));
      }
    });
  } finally {
    cancelTimeout();
    worker.terminate();
    terminations += 1;
  }
  if (terminations !== 1) throw new TypeError("tripwire Worker termination count changed");
  return Object.freeze({ result, workerTerminations: 1 });
}
