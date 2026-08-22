// SPDX-License-Identifier: MIT
import { resolve } from "node:path";

export const ar5MinimumPairCountV1 = 5;
export const ar5FirstActionableRegressionPercentV1 = 10;
export const ar5FirstActionableRegressionMsV1 = 50;
export const ar5StableCommandRegressionPercentV1 = 10;

export type Ar5RevisionV1 = "baseline" | "candidate";

export interface Ar5LocalPromotionOptionsV1 {
  readonly baselineRoot: string;
  readonly candidateRoot: string;
  readonly pairs: number;
  readonly output?: string;
}

export interface Ar5RunSlotV1 {
  readonly pairIndex: number;
  readonly orderIndex: 0 | 1;
  readonly revision: Ar5RevisionV1;
}

export interface Ar5PairedRawMetricV1 {
  readonly pairIndex: number;
  readonly baselineMs: number;
  readonly candidateMs: number;
}

export interface Ar5PairedMetricSummaryV1 {
  readonly raw: readonly Readonly<
    Ar5PairedRawMetricV1 & {
      readonly deltaMs: number;
      readonly deltaPercent: number;
    }
  >[];
  readonly median: Readonly<{
    readonly baselineMs: number;
    readonly candidateMs: number;
    readonly deltaMs: number;
    readonly deltaPercent: number;
  }>;
}

export interface Ar5StopJudgmentV1 {
  readonly decision: "continue" | "repeat_required" | "stop";
  readonly stop: boolean;
  readonly firstActionable: Readonly<{
    readonly thresholdExceeded: boolean;
    readonly independentReproductionRequired: true;
    readonly percentThreshold: number;
    readonly millisecondsThreshold: number;
  }>;
  readonly stableCommand: Readonly<{
    readonly thresholdExceeded: boolean;
    readonly percentThreshold: number;
  }>;
}

const valueFlagsV1 = new Set([
  "--baseline-root",
  "--candidate-root",
  "--pairs",
  "--output",
]);

function optionErrorV1(message: string): never {
  throw new TypeError(message);
}

/** Parses the deliberately small local-only AR5 runner interface. */
export function parseAr5LocalPromotionOptionsV1(
  argv: readonly string[],
  cwd: string,
): Ar5LocalPromotionOptionsV1 {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    if (!valueFlagsV1.has(flag)) optionErrorV1(`unknown argument: ${flag}`);
    if (values.has(flag)) optionErrorV1(`${flag} may only be provided once`);

    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      optionErrorV1(`${flag} requires a value`);
    }
    values.set(flag, value);
  }

  const baselineRoot = values.get("--baseline-root");
  const candidateRoot = values.get("--candidate-root");
  if (baselineRoot === undefined) optionErrorV1("--baseline-root is required");
  if (candidateRoot === undefined) optionErrorV1("--candidate-root is required");

  const pairsText = values.get("--pairs") ?? String(ar5MinimumPairCountV1);
  if (!/^[1-9][0-9]*$/u.test(pairsText)) {
    optionErrorV1("--pairs must be a positive integer");
  }
  const pairs = Number(pairsText);
  if (!Number.isSafeInteger(pairs) || pairs < ar5MinimumPairCountV1) {
    optionErrorV1(`--pairs must be at least ${String(ar5MinimumPairCountV1)}`);
  }

  const resolvedBaselineRoot = resolve(cwd, baselineRoot);
  const resolvedCandidateRoot = resolve(cwd, candidateRoot);
  if (resolvedBaselineRoot === resolvedCandidateRoot) {
    optionErrorV1("--baseline-root and --candidate-root must differ");
  }

  const output = values.get("--output");
  return Object.freeze({
    baselineRoot: resolvedBaselineRoot,
    candidateRoot: resolvedCandidateRoot,
    pairs,
    ...(output === undefined ? {} : { output: resolve(cwd, output) }),
  });
}

/** Alternates B/C then C/B so monotonic machine drift does not favor one revision. */
export function ar5InterleavedRunOrderV1(pairCount: number): readonly Ar5RunSlotV1[] {
  if (!Number.isSafeInteger(pairCount) || pairCount < ar5MinimumPairCountV1) {
    optionErrorV1(`pairCount must be at least ${String(ar5MinimumPairCountV1)}`);
  }
  const slots: Ar5RunSlotV1[] = [];
  for (let pairIndex = 1; pairIndex <= pairCount; pairIndex += 1) {
    const revisions: readonly Ar5RevisionV1[] = pairIndex % 2 === 1
      ? ["baseline", "candidate"]
      : ["candidate", "baseline"];
    slots.push(
      Object.freeze({ pairIndex, orderIndex: 0, revision: revisions[0] as Ar5RevisionV1 }),
      Object.freeze({ pairIndex, orderIndex: 1, revision: revisions[1] as Ar5RevisionV1 }),
    );
  }
  return Object.freeze(slots);
}

export function medianV1(values: readonly number[]): number {
  if (values.length === 0) optionErrorV1("median requires at least one value");
  if (values.some((value) => !Number.isFinite(value))) {
    optionErrorV1("median values must be finite");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/** Summarizes pair-local deltas; positive values always mean candidate regression. */
export function summarizeAr5PairedMetricV1(
  pairs: readonly Ar5PairedRawMetricV1[],
): Ar5PairedMetricSummaryV1 {
  if (pairs.length === 0) optionErrorV1("paired metric requires at least one pair");
  const pairIndexes = new Set<number>();
  const raw = pairs.map((pair) => {
    if (!Number.isSafeInteger(pair.pairIndex) || pair.pairIndex < 1) {
      optionErrorV1("pairIndex must be a positive integer");
    }
    if (pairIndexes.has(pair.pairIndex)) optionErrorV1("pairIndex must be unique");
    pairIndexes.add(pair.pairIndex);
    if (
      !Number.isFinite(pair.baselineMs) || pair.baselineMs <= 0 ||
      !Number.isFinite(pair.candidateMs) || pair.candidateMs <= 0
    ) {
      optionErrorV1("paired timings must be finite positive numbers");
    }
    const deltaMs = pair.candidateMs - pair.baselineMs;
    return Object.freeze({
      pairIndex: pair.pairIndex,
      baselineMs: pair.baselineMs,
      candidateMs: pair.candidateMs,
      deltaMs,
      deltaPercent: deltaMs / pair.baselineMs * 100,
    });
  });
  return Object.freeze({
    raw: Object.freeze(raw),
    median: Object.freeze({
      baselineMs: medianV1(raw.map((pair) => pair.baselineMs)),
      candidateMs: medianV1(raw.map((pair) => pair.candidateMs)),
      deltaMs: medianV1(raw.map((pair) => pair.deltaMs)),
      deltaPercent: medianV1(raw.map((pair) => pair.deltaPercent)),
    }),
  });
}

/** Applies the accepted AR5 local stop rules without turning them into a CI gate. */
export function judgeAr5LocalPromotionV1(input: {
  readonly firstActionable: Ar5PairedMetricSummaryV1;
  readonly stableCommand: Ar5PairedMetricSummaryV1;
}): Ar5StopJudgmentV1 {
  const firstActionableThresholdExceeded =
    input.firstActionable.median.deltaPercent > ar5FirstActionableRegressionPercentV1 &&
    input.firstActionable.median.deltaMs > ar5FirstActionableRegressionMsV1;
  const stableCommandThresholdExceeded =
    input.stableCommand.median.deltaPercent > ar5StableCommandRegressionPercentV1;
  return Object.freeze({
    decision: stableCommandThresholdExceeded
      ? "stop"
      : firstActionableThresholdExceeded
      ? "repeat_required"
      : "continue",
    stop: stableCommandThresholdExceeded,
    firstActionable: Object.freeze({
      thresholdExceeded: firstActionableThresholdExceeded,
      independentReproductionRequired: true,
      percentThreshold: ar5FirstActionableRegressionPercentV1,
      millisecondsThreshold: ar5FirstActionableRegressionMsV1,
    }),
    stableCommand: Object.freeze({
      thresholdExceeded: stableCommandThresholdExceeded,
      percentThreshold: ar5StableCommandRegressionPercentV1,
    }),
  });
}
