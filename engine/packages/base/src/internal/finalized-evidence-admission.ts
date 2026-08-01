// SPDX-License-Identifier: MIT
import { CanonicalJsonError, canonicalJsonBytesInternalV1 } from "../contracts/canonical-json.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import type { DeepReadonly, Digest } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "./snapshot-work-instrumentation.ts";

interface SnapshotWithCommandEvidenceV1 {
  readonly rng: unknown;
  readonly commandSequence: number;
}

export interface FinalizedEvidencePolicyInternalV1<
  TFact,
  TRejection,
  TRngState,
  TRngDrawTrace,
  TDebugValidationError,
> {
  readonly validateCandidateSnapshot?: (value: unknown) => void;
  readonly parseFact?: (value: unknown) => TFact;
  readonly parseRejection?: (value: unknown) => TRejection;
  readonly parseRngState?: (value: unknown) => TRngState;
  readonly parseRngDrawTrace?: (value: unknown) => TRngDrawTrace;
  readonly parseDebugValidationError?: (value: unknown) => TDebugValidationError;
}

export type FinalizedEvidenceResultConstraintInternalV1 =
  | {
    readonly kind: "require";
    readonly resultKind: "faulted";
    readonly message: string;
  }
  | {
    readonly kind: "forbid";
    readonly resultKind: "rejected";
    readonly message: string;
  };

export type DeferredSimulationEvidenceTargetInternalV1 =
  | "simulation_game_execute"
  | "simulation_debug_validate"
  | "simulation_debug_execute";

interface ActiveSimulationEvidenceDeferralInternalV1 {
  readonly target: DeferredSimulationEvidenceTargetInternalV1;
  consumed: boolean;
}

const activeSimulationEvidenceDeferralsInternalV1: ActiveSimulationEvidenceDeferralInternalV1[] =
  [];

/** @internal Distinguishes the public executor's opaque generic results from attempt evidence. */
export function isCommandAttemptEnvelopeCandidateInternalV1(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const names = Object.getOwnPropertyNames(value);
  return names.includes("result") && names.includes("diagnostics");
}

/** @internal Lets Standard Core preserve candidate-RNG precedence before Session finalization. */
export function withDeferredSimulationEvidenceAdmissionInternalV1<TResult>(
  target: DeferredSimulationEvidenceTargetInternalV1,
  callback: () => TResult,
): TResult {
  const deferral: ActiveSimulationEvidenceDeferralInternalV1 = { target, consumed: false };
  activeSimulationEvidenceDeferralsInternalV1.push(deferral);
  let outcome:
    | { readonly kind: "returned"; readonly value: TResult }
    | { readonly kind: "threw"; readonly error: unknown };
  try {
    outcome = { kind: "returned", value: callback() };
  } catch (error) {
    outcome = { kind: "threw", error };
  }
  const popped = activeSimulationEvidenceDeferralsInternalV1.pop();
  if (popped !== deferral) throw new TypeError("Simulation evidence deferral scope was corrupted");
  if (outcome.kind === "threw") throw outcome.error;
  return outcome.value;
}

/** @internal Exact-target one-shot check used only by resolved Simulation wrappers. */
export function consumeSimulationEvidenceDeferralInternalV1(
  target: DeferredSimulationEvidenceTargetInternalV1,
): boolean {
  const deferral = activeSimulationEvidenceDeferralsInternalV1.at(-1);
  if (deferral === undefined || deferral.consumed || deferral.target !== target) return false;
  deferral.consumed = true;
  return true;
}

type AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace> =
  CommandExecutionAttemptEnvelopeV1<
    TSnapshot,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >;

type FinalizedAttemptV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> = DeepReadonly<AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>> & {
  readonly preSnapshot: DeepReadonly<TSnapshot>;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
};

type DataDescriptorsV1 = Readonly<Record<string, PropertyDescriptor>>;

function pointerSegmentV1(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function compareCodePointsV1(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function captureExactRecordV1(
  value: unknown,
  label: string,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
  path = "",
): DataDescriptorsV1 {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new CanonicalJsonError("value.custom_prototype", path);
  }
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new CanonicalJsonError("value.unrepresented_property", path);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(descriptors);
  if (
    requiredKeys.some((key) => !Object.hasOwn(descriptors, key)) ||
    keys.some((key) => !allowed.has(key))
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new CanonicalJsonError(
        "value.getter",
        `${path}/${pointerSegmentV1(key)}`,
      );
    }
    if (descriptor.enumerable !== true) throw new TypeError(`${label} fields must be enumerable`);
  }
  return descriptors;
}

function captureDenseArrayV1(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path || "value"} must be an array`);
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new CanonicalJsonError("value.custom_prototype", path);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new CanonicalJsonError("value.unrepresented_property", path);
  }
  const names = Object.getOwnPropertyNames(value);
  const extra = names.filter((name) => {
    if (name === "length") return false;
    const index = Number(name);
    return !(
      Number.isInteger(index) &&
      index >= 0 &&
      index < value.length &&
      String(index) === name
    );
  }).sort(compareCodePointsV1);
  if (extra[0] !== undefined) {
    throw new CanonicalJsonError(
      "value.unrepresented_property",
      `${path}/${pointerSegmentV1(extra[0])}`,
    );
  }
  const captured: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined) {
      throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new CanonicalJsonError("value.getter", `${path}/${index}`);
    }
    captured.push(descriptor.value);
  }
  return captured;
}

function normalizeItemsV1<T>(
  values: readonly unknown[],
  parser: ((value: unknown) => T) | undefined,
): readonly T[] {
  return values.map((value) => parser === undefined ? value as T : parser(value));
}

function deepFreezeEvidenceV1(
  value: unknown,
  instrumentation?: SnapshotWorkInstrumentationV1,
): void {
  recordSnapshotWorkV1(instrumentation, "deep_freeze_traversal", "evidence_admission");
  const visited = new Set<object>();
  const freeze = (current: unknown): void => {
    if (current === null || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(current))) {
      if (descriptor.get === undefined && descriptor.set === undefined) freeze(descriptor.value);
    }
    Object.freeze(current);
  };
  freeze(value);
}

function readAttemptPartsV1(candidate: unknown): {
  readonly result: unknown;
  readonly diagnostics: unknown;
} {
  const descriptors = captureExactRecordV1(candidate, "Command attempt", [
    "result",
    "diagnostics",
  ]);
  return {
    result: descriptors.result?.value,
    diagnostics: descriptors.diagnostics?.value,
  };
}

function prepareAttemptEvidenceV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
  TDebugValidationError,
>(
  before: DeepReadonly<TSnapshot>,
  candidate: AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>,
  policy: FinalizedEvidencePolicyInternalV1<
    TFact,
    TRejection,
    TRngState,
    TRngDrawTrace,
    TDebugValidationError
  >,
  instrumentation?: SnapshotWorkInstrumentationV1,
  receipt?: Readonly<{ readonly preStateDigest: Digest; readonly postStateDigest: Digest }>,
  resultConstraint?: FinalizedEvidenceResultConstraintInternalV1,
): DeepReadonly<AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>> {
  const attempt = readAttemptPartsV1(candidate);
  const resultBase = captureExactRecordV1(
    attempt.result,
    "Command attempt result",
    [
      "kind",
      "snapshot",
    ],
    ["facts", "reasons", "fault"],
    "/result",
  );
  const kind = resultBase.kind?.value;
  const snapshot = resultBase.snapshot?.value as TSnapshot;
  const diagnosticsBase = captureExactRecordV1(
    attempt.diagnostics,
    "Command attempt diagnostics",
    ["committedRngBefore", "attemptedDraws", "committedRngAfter"],
    ["candidateRngAfter"],
    "/diagnostics",
  );

  policy.validateCandidateSnapshot?.(snapshot);
  if (
    (resultConstraint?.kind === "require" && kind !== resultConstraint.resultKind) ||
    (resultConstraint?.kind === "forbid" && kind === resultConstraint.resultKind)
  ) {
    throw new TypeError(resultConstraint.message);
  }

  let evidenceResult: Readonly<Record<string, unknown>>;
  let result: AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>["result"];
  if (kind === "committed") {
    captureExactRecordV1(
      attempt.result,
      "Committed command result",
      ["kind", "snapshot", "facts"],
      [],
      "/result",
    );
    const facts = normalizeItemsV1<TFact>(
      captureDenseArrayV1(resultBase.facts?.value, "/result/facts"),
      policy.parseFact,
    );
    evidenceResult = { kind, facts };
    result = { kind, snapshot, facts };
  } else if (kind === "rejected") {
    captureExactRecordV1(
      attempt.result,
      "Rejected command result",
      ["kind", "snapshot", "reasons"],
      [],
      "/result",
    );
    if (snapshot !== before) {
      throw new TypeError("Non-committed command attempt changed the Snapshot");
    }
    const reasons = normalizeItemsV1<TRejection>(
      captureDenseArrayV1(resultBase.reasons?.value, "/result/reasons"),
      policy.parseRejection,
    );
    evidenceResult = { kind, reasons };
    result = { kind, snapshot, reasons };
  } else if (kind === "faulted") {
    captureExactRecordV1(
      attempt.result,
      "Faulted command result",
      ["kind", "snapshot", "fault"],
      [],
      "/result",
    );
    if (snapshot !== before) {
      throw new TypeError("Non-committed command attempt changed the Snapshot");
    }
    const fault = resultBase.fault?.value as TFault;
    evidenceResult = { kind, fault };
    result = { kind, snapshot, fault };
  } else {
    throw new TypeError("Command attempt result has an invalid kind");
  }

  const parseRngState = policy.parseRngState;
  const committedRngBefore = parseRngState === undefined
    ? diagnosticsBase.committedRngBefore?.value as TRngState
    : parseRngState(diagnosticsBase.committedRngBefore?.value);
  const attemptedDraws = normalizeItemsV1<TRngDrawTrace>(
    captureDenseArrayV1(diagnosticsBase.attemptedDraws?.value, "/diagnostics/attemptedDraws"),
    policy.parseRngDrawTrace,
  );
  const hasCandidateRngAfter = Object.hasOwn(diagnosticsBase, "candidateRngAfter");
  const candidateRngAfter = hasCandidateRngAfter
    ? parseRngState === undefined
      ? diagnosticsBase.candidateRngAfter?.value as TRngState
      : parseRngState(diagnosticsBase.candidateRngAfter?.value)
    : undefined;
  const committedRngAfter = parseRngState === undefined
    ? diagnosticsBase.committedRngAfter?.value as TRngState
    : parseRngState(diagnosticsBase.committedRngAfter?.value);
  const diagnostics = {
    committedRngBefore,
    attemptedDraws,
    ...(hasCandidateRngAfter ? { candidateRngAfter } : {}),
    committedRngAfter,
  };
  const projection = {
    result: evidenceResult,
    diagnostics,
    ...(receipt === undefined ? {} : { receipt }),
  };
  canonicalJsonBytesInternalV1(
    projection,
    instrumentation,
    "evidence_admission",
    { requireFullyRepresentedOwnData: true },
  );
  deepFreezeEvidenceV1(projection, instrumentation);

  return Object.freeze({
    result: Object.freeze(result),
    diagnostics: projection.diagnostics,
  }) as DeepReadonly<AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>>;
}

/** @internal Session/Simulation candidate admission; intentionally absent from package barrels. */
export function admitCommandAttemptEvidenceInternalV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
  TDebugValidationError = unknown,
>(
  before: DeepReadonly<TSnapshot>,
  candidate: AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>,
  policy: FinalizedEvidencePolicyInternalV1<
    TFact,
    TRejection,
    TRngState,
    TRngDrawTrace,
    TDebugValidationError
  > = {},
  instrumentation?: SnapshotWorkInstrumentationV1,
  resultConstraint?: FinalizedEvidenceResultConstraintInternalV1,
): DeepReadonly<AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>> {
  return prepareAttemptEvidenceV1(
    before,
    candidate,
    policy,
    instrumentation,
    undefined,
    resultConstraint,
  );
}

/** @internal Debug validation evidence admission; intentionally absent from package barrels. */
export function admitDebugValidationErrorsInternalV1<TValidationError>(
  errors: readonly TValidationError[],
  parse: ((value: unknown) => TValidationError) | undefined,
  instrumentation?: SnapshotWorkInstrumentationV1,
): readonly DeepReadonly<TValidationError>[] {
  const normalized = normalizeItemsV1<TValidationError>(
    captureDenseArrayV1(errors, "/errors"),
    parse,
  );
  const projection = { errors: normalized };
  canonicalJsonBytesInternalV1(
    projection,
    instrumentation,
    "evidence_admission",
    { requireFullyRepresentedOwnData: true },
  );
  deepFreezeEvidenceV1(projection, instrumentation);
  return projection.errors as readonly DeepReadonly<TValidationError>[];
}

/** @internal Exact outer validation plus admission for a Debug validator result. */
export function admitDebugValidationResultInternalV1<TValidationError>(
  validation: unknown,
  parse: ((value: unknown) => TValidationError) | undefined,
  instrumentation?: SnapshotWorkInstrumentationV1,
):
  | { readonly kind: "allowed" }
  | {
    readonly kind: "validation_failed";
    readonly errors: readonly DeepReadonly<TValidationError>[];
  } {
  const descriptors = captureExactRecordV1(
    validation,
    "DebugCommand validation result",
    ["kind"],
    ["errors"],
  );
  const kind = descriptors.kind?.value;
  if (kind === "allowed") {
    captureExactRecordV1(validation, "Allowed DebugCommand validation result", ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind !== "validation_failed") {
    throw new TypeError("DebugCommand validation returned an invalid result");
  }
  captureExactRecordV1(validation, "Failed DebugCommand validation result", ["kind", "errors"]);
  const errors = captureDenseArrayV1(descriptors.errors?.value, "/errors");
  if (errors.length === 0) {
    throw new TypeError("DebugCommand validation failure must contain errors");
  }
  return Object.freeze({
    kind,
    errors: admitDebugValidationErrorsInternalV1(
      errors as readonly TValidationError[],
      parse,
      instrumentation,
    ),
  });
}

interface ActiveFinalizedEvidenceHandoffV1 {
  readonly attempt: object;
  consumed: boolean;
}

const activeFinalizedEvidenceHandoffsV1: ActiveFinalizedEvidenceHandoffV1[] = [];

/** @internal Descriptor-only preflight for CommandLog source/outcome precedence. */
export function captureFinalizedCommandAttemptResultKindInternalV1(
  finalizedAttempt: unknown,
): unknown {
  const descriptors = captureExactRecordV1(finalizedAttempt, "Finalized command attempt", [
    "result",
    "diagnostics",
    "preSnapshot",
    "preStateDigest",
    "postStateDigest",
  ]);
  const result = captureExactRecordV1(
    descriptors.result?.value,
    "Finalized command result",
    ["kind", "snapshot"],
    ["facts", "reasons", "fault"],
    "/result",
  );
  return result.kind?.value;
}

/** @internal Offers one finalized attempt to one exact synchronous CommandLog append. */
export function withFinalizedEvidenceHandoffInternalV1<TResult>(
  attempt: object,
  callback: () => TResult,
): TResult {
  const handoff: ActiveFinalizedEvidenceHandoffV1 = { attempt, consumed: false };
  activeFinalizedEvidenceHandoffsV1.push(handoff);
  let outcome:
    | { readonly kind: "returned"; readonly value: TResult }
    | { readonly kind: "threw"; readonly error: unknown };
  try {
    outcome = { kind: "returned", value: callback() };
  } catch (error) {
    outcome = { kind: "threw", error };
  }
  const popped = activeFinalizedEvidenceHandoffsV1.pop();
  if (popped !== handoff) throw new TypeError("Finalized evidence handoff scope was corrupted");
  if (outcome.kind === "threw") throw outcome.error;
  return outcome.value;
}

/** @internal CommandLog admission with exact-identity one-shot Session reuse. */
export function admitFinalizedCommandAttemptEvidenceInternalV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TFact,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  finalizedAttempt: FinalizedAttemptV1<
    TSnapshot,
    TFact,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
  instrumentation?: SnapshotWorkInstrumentationV1,
): FinalizedAttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace> {
  const handoff = activeFinalizedEvidenceHandoffsV1.at(-1);
  if (handoff !== undefined && !handoff.consumed && handoff.attempt === finalizedAttempt) {
    handoff.consumed = true;
    return finalizedAttempt;
  }

  const descriptors = captureExactRecordV1(finalizedAttempt, "Finalized command attempt", [
    "result",
    "diagnostics",
    "preSnapshot",
    "preStateDigest",
    "postStateDigest",
  ]);
  const preSnapshot = descriptors.preSnapshot?.value as DeepReadonly<TSnapshot>;
  const preStateDigest = descriptors.preStateDigest?.value as Digest;
  const postStateDigest = descriptors.postStateDigest?.value as Digest;
  const admitted = prepareAttemptEvidenceV1(
    preSnapshot,
    {
      result: descriptors.result?.value,
      diagnostics: descriptors.diagnostics?.value,
    } as AttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>,
    {},
    instrumentation,
    Object.freeze({ preStateDigest, postStateDigest }),
  );
  return Object.freeze({
    ...admitted,
    preSnapshot,
    preStateDigest,
    postStateDigest,
  }) as FinalizedAttemptV1<TSnapshot, TFact, TRejection, TFault, TRngState, TRngDrawTrace>;
}
