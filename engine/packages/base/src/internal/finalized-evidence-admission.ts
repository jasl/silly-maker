// SPDX-License-Identifier: MIT
import { projectCanonicalJsonInternalV1 } from "../contracts/canonical-json.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import type { DeepReadonly, Digest } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";

interface SnapshotWithCommandEvidenceV1 {
  readonly rng: unknown;
  readonly commandSequence: number;
}

export interface CoreTypedEvidencePolicyInternalV1<TRejection, TDebugValidationError> {
  readonly validateCandidateSnapshot?: (value: unknown) => void;
  readonly parseRejection: (value: unknown) => TRejection;
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

type AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace> =
  CommandExecutionAttemptEnvelopeV1<
    TSnapshot,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >;

type FinalizedAttemptV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
> = DeepReadonly<AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>> & {
  readonly preSnapshot: DeepReadonly<TSnapshot>;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
};

function requireRecordV1(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function admitAttemptEvidenceV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  before: DeepReadonly<TSnapshot>,
  candidate: AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  receipt?: Readonly<{ readonly preStateDigest: Digest; readonly postStateDigest: Digest }>,
  resultConstraint?: FinalizedEvidenceResultConstraintInternalV1,
): DeepReadonly<AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>> {
  const attempt = requireRecordV1(candidate, "Command attempt");
  const candidateResult = requireRecordV1(attempt.result, "Command attempt result");
  const candidateDiagnostics = requireRecordV1(
    attempt.diagnostics,
    "Command attempt diagnostics",
  );
  const kind = candidateResult.kind;
  const snapshot = candidateResult.snapshot as TSnapshot;

  if (
    (resultConstraint?.kind === "require" && kind !== resultConstraint.resultKind) ||
    (resultConstraint?.kind === "forbid" && kind === resultConstraint.resultKind)
  ) {
    throw new TypeError(resultConstraint.message);
  }

  let evidenceResult: Record<string, unknown>;
  if (kind === "committed") {
    evidenceResult = {
      kind,
      events: requireArrayV1(candidateResult.events, "Committed command events"),
    };
  } else if (kind === "rejected") {
    if (snapshot !== before) {
      throw new TypeError("Non-committed command attempt changed the Snapshot");
    }
    evidenceResult = {
      kind,
      reasons: requireArrayV1(candidateResult.reasons, "Rejected command reasons"),
    };
  } else if (kind === "faulted") {
    if (snapshot !== before) {
      throw new TypeError("Non-committed command attempt changed the Snapshot");
    }
    evidenceResult = { kind, fault: candidateResult.fault };
  } else {
    throw new TypeError("Command attempt result has an invalid kind");
  }

  const committedRngBefore = candidateDiagnostics.committedRngBefore as TRngState;
  const attemptedDraws = requireArrayV1(
    candidateDiagnostics.attemptedDraws,
    "Attempted RNG draws",
  ) as readonly TRngDrawTrace[];
  const hasCandidateRngAfter = Object.hasOwn(candidateDiagnostics, "candidateRngAfter");
  const candidateRngAfter = hasCandidateRngAfter
    ? candidateDiagnostics.candidateRngAfter as TRngState
    : undefined;
  const committedRngAfter = candidateDiagnostics.committedRngAfter as TRngState;
  const diagnostics = {
    committedRngBefore,
    attemptedDraws,
    ...(hasCandidateRngAfter ? { candidateRngAfter } : {}),
    committedRngAfter,
  };
  const admitted = projectCanonicalJsonInternalV1(
    {
      result: evidenceResult,
      diagnostics,
      ...(receipt === undefined ? {} : { receipt }),
    },
    instrumentation,
    "evidence_admission",
  ).value as {
    readonly result: Readonly<Record<string, unknown>>;
    readonly diagnostics: typeof diagnostics;
  };

  const result = kind === "committed"
    ? { kind, snapshot, events: admitted.result.events as readonly TEvent[] }
    : kind === "rejected"
    ? { kind, snapshot, reasons: admitted.result.reasons as readonly TRejection[] }
    : { kind: "faulted" as const, snapshot, fault: admitted.result.fault as TFault };

  return { result, diagnostics: admitted.diagnostics } as DeepReadonly<
    AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>
  >;
}

/** @internal Strict public Session boundary for arbitrary executor evidence. */
export function admitCommandAttemptEvidenceInternalV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  before: DeepReadonly<TSnapshot>,
  candidate: AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  resultConstraint?: FinalizedEvidenceResultConstraintInternalV1,
): DeepReadonly<AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>> {
  return admitAttemptEvidenceV1(
    before,
    candidate,
    instrumentation,
    undefined,
    resultConstraint,
  );
}

/**
 * @internal Trusts a resolved Core executor's typed attempt after real
 * invariants; rejected reasons cross the Story callback boundary here and are
 * normalized once through the declared schema.
 */
export function acceptCoreTypedCommandAttemptInternalV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  before: DeepReadonly<TSnapshot>,
  candidate: AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>,
  validateCandidateSnapshot: ((value: unknown) => void) | undefined,
  parseRejection: (value: unknown) => TRejection,
  resultConstraint?: FinalizedEvidenceResultConstraintInternalV1,
): DeepReadonly<AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>> {
  const result = candidate.result;
  validateCandidateSnapshot?.(result.snapshot);
  if (
    (resultConstraint?.kind === "require" && result.kind !== resultConstraint.resultKind) ||
    (resultConstraint?.kind === "forbid" && result.kind === resultConstraint.resultKind)
  ) {
    throw new TypeError(resultConstraint.message);
  }
  if (result.kind !== "committed" && result.kind !== "rejected" && result.kind !== "faulted") {
    throw new TypeError("Command attempt result has an invalid kind");
  }
  if (result.kind !== "committed" && result.snapshot !== before) {
    throw new TypeError("Non-committed command attempt changed the Snapshot");
  }
  if (result.kind === "rejected") {
    return {
      ...candidate,
      result: {
        ...result,
        reasons: result.reasons.map((reason) => parseRejection(reason)),
      },
    } as unknown as DeepReadonly<
      AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>
    >;
  }
  return candidate as DeepReadonly<
    AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>
  >;
}

/** @internal Admits Debug validation errors at the Session boundary. */
export function admitDebugValidationErrorsInternalV1<TValidationError>(
  errors: readonly TValidationError[],
  parse: ((value: unknown) => TValidationError) | undefined,
  instrumentation?: SnapshotWorkInstrumentationV1,
): readonly DeepReadonly<TValidationError>[] {
  const values = requireArrayV1(errors, "Debug validation errors");
  const normalized = parse === undefined
    ? values as readonly TValidationError[]
    : values.map((value) => parse(value));
  if (parse !== undefined) return normalized as readonly DeepReadonly<TValidationError>[];
  return projectCanonicalJsonInternalV1(
    { errors: normalized },
    instrumentation,
    "evidence_admission",
  ).value.errors as readonly DeepReadonly<TValidationError>[];
}

/** @internal Normalizes one Debug validator result at the Session boundary. */
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
  const record = requireRecordV1(validation, "DebugCommand validation result");
  if (record.kind === "allowed") return { kind: "allowed" };
  if (record.kind !== "validation_failed") {
    throw new TypeError("DebugCommand validation returned an invalid result");
  }
  const errors = requireArrayV1(record.errors, "Debug validation errors");
  if (errors.length === 0) {
    throw new TypeError("DebugCommand validation failure must contain errors");
  }
  return {
    kind: "validation_failed",
    errors: admitDebugValidationErrorsInternalV1(
      errors as readonly TValidationError[],
      parse,
      instrumentation,
    ),
  };
}

/** @internal Public CommandLog input admission. */
export function admitFinalizedCommandAttemptEvidenceInternalV1<
  TSnapshot extends SnapshotWithCommandEvidenceV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  finalizedAttempt: FinalizedAttemptV1<
    TSnapshot,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
  instrumentation?: SnapshotWorkInstrumentationV1,
): FinalizedAttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace> {
  const preSnapshot = finalizedAttempt.preSnapshot;
  const preStateDigest = finalizedAttempt.preStateDigest;
  const postStateDigest = finalizedAttempt.postStateDigest;
  const admitted = admitAttemptEvidenceV1(
    preSnapshot,
    {
      result: finalizedAttempt.result,
      diagnostics: finalizedAttempt.diagnostics,
    } as AttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>,
    instrumentation,
    { preStateDigest, postStateDigest },
  );
  return {
    ...admitted,
    preSnapshot,
    preStateDigest,
    postStateDigest,
  } as FinalizedAttemptV1<TSnapshot, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>;
}
