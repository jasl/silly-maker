// SPDX-License-Identifier: MIT

import {
  normalizeProcessAttemptBeginInputV1,
  normalizeProcessTranscriptAppendInputV1,
  type ProcessAttemptBeginInputV1,
  type ProcessAttemptOutcomeV1,
  type ProcessHeadV1,
  type ProcessTranscriptAppendInputV1,
  type TranscriptEntryV1,
} from "./program-process-repository.ts";

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

/**
 * A foreground owner normally renews after one third of this window, leaving
 * two missed opportunities before another page may recover the Process.
 * Browser suspension can exceed the window; correctness comes from generation
 * fencing rather than from timer delivery.
 */
export const defaultProcessExecutionLeaseDurationMillisecondsV1 = 30_000;
export const defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1 =
  defaultProcessExecutionLeaseDurationMillisecondsV1 / 3;

export interface ProcessExecutionLeaseV1 {
  readonly processId: string;
  readonly ownerInstanceId: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly expiresAt: number;
}

export interface ProcessExecutionAcquireInputV1 {
  readonly ownerInstanceId: string;
  readonly observedAt: number;
  readonly expiresAt: number;
  readonly attempt: ProcessAttemptBeginInputV1;
}

export interface ProcessExecutionLeaseRenewInputV1 {
  readonly lease: ProcessExecutionLeaseV1;
  readonly observedAt: number;
  readonly expiresAt: number;
}

export interface ProcessExecutionLeaseReleaseInputV1 {
  readonly lease: ProcessExecutionLeaseV1;
  readonly observedAt: number;
}

export interface ProcessExecutionTerminalInputV1 {
  readonly lease: ProcessExecutionLeaseV1;
  readonly observedAt: number;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export type ProcessOperationKindV1 =
  | "execution_acquire"
  | "translation_workset_import_execution_acquire"
  | "translation_batch_execution_acquire"
  | "execution_terminal"
  | "program_revision_terminal";

/** Compact exact result of one committed product operation. */
export interface ProcessOperationReceiptV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly operation: ProcessOperationKindV1;
  /** SHA-256 of the complete admitted operation input. */
  readonly operationDigest: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly processRevision: number;
  readonly transcriptFrontier: number;
  readonly terminalOutcome: ProcessAttemptOutcomeV1 | null;
  readonly programId: string | null;
  readonly programRevision: number | null;
  readonly repositoryRevision: number | null;
  readonly lease: ProcessExecutionLeaseV1 | null;
}

export type ProcessOperationReceiptQueryResultV1 =
  | { readonly kind: "committed"; readonly receipt: ProcessOperationReceiptV1 }
  | { readonly kind: "mismatch"; readonly receipt: ProcessOperationReceiptV1 | null }
  | { readonly kind: "absent" };

export type ProcessExecutionAcquireResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly lease: ProcessExecutionLeaseV1;
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export type ProcessExecutionLeaseMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly lease: ProcessExecutionLeaseV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export type ProcessExecutionTerminalResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

function exactRecordV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid Process execution input");
  }
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== keys.length ||
    !actual.every((key) => typeof key === "string" && keys.includes(key))
  ) throw new TypeError("invalid Process execution input");
  return value as Readonly<Record<string, unknown>>;
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function nonNegativeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function attemptOutcomeV1(value: unknown): value is ProcessAttemptOutcomeV1 {
  return value === "completed" || value === "failed" || value === "cancelled" ||
    value === "replaced" || value === "interrupted";
}

export function normalizeProcessExecutionLeaseV1(value: ProcessExecutionLeaseV1) {
  const row = exactRecordV1(value, [
    "processId",
    "ownerInstanceId",
    "attemptId",
    "generation",
    "expiresAt",
  ]);
  if (
    !identifierV1(row.processId) || !identifierV1(row.ownerInstanceId) ||
    !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !nonNegativeIntegerV1(row.expiresAt)
  ) throw new TypeError("invalid Process execution lease");
  return {
    processId: row.processId,
    ownerInstanceId: row.ownerInstanceId,
    attemptId: row.attemptId,
    generation: row.generation,
    expiresAt: row.expiresAt,
  } satisfies ProcessExecutionLeaseV1;
}

export function normalizeProcessExecutionAcquireInputV1(
  value: ProcessExecutionAcquireInputV1,
): ProcessExecutionAcquireInputV1 {
  const row = exactRecordV1(value, ["ownerInstanceId", "observedAt", "expiresAt", "attempt"]);
  if (
    !identifierV1(row.ownerInstanceId) || !nonNegativeIntegerV1(row.observedAt) ||
    !nonNegativeIntegerV1(row.expiresAt) || row.expiresAt <= row.observedAt
  ) throw new TypeError("invalid Process execution acquire input");
  const attempt = normalizeProcessAttemptBeginInputV1(row.attempt as ProcessAttemptBeginInputV1);
  if (attempt.updatedAt !== row.observedAt) {
    throw new TypeError("Process execution acquire time does not match attempt time");
  }
  return {
    ownerInstanceId: row.ownerInstanceId,
    observedAt: row.observedAt,
    expiresAt: row.expiresAt,
    attempt,
  };
}

export function normalizeProcessExecutionLeaseRenewInputV1(
  value: ProcessExecutionLeaseRenewInputV1,
): ProcessExecutionLeaseRenewInputV1 {
  const row = exactRecordV1(value, ["lease", "observedAt", "expiresAt"]);
  const lease = normalizeProcessExecutionLeaseV1(row.lease as ProcessExecutionLeaseV1);
  if (
    !nonNegativeIntegerV1(row.observedAt) || !nonNegativeIntegerV1(row.expiresAt) ||
    row.observedAt >= lease.expiresAt ||
    row.expiresAt <= lease.expiresAt
  ) throw new TypeError("invalid Process execution lease renewal");
  return {
    lease,
    observedAt: row.observedAt,
    expiresAt: row.expiresAt,
  };
}

export function normalizeProcessExecutionLeaseReleaseInputV1(
  value: ProcessExecutionLeaseReleaseInputV1,
): ProcessExecutionLeaseReleaseInputV1 {
  const row = exactRecordV1(value, ["lease", "observedAt"]);
  if (!nonNegativeIntegerV1(row.observedAt)) {
    throw new TypeError("invalid Process execution lease release");
  }
  return {
    lease: normalizeProcessExecutionLeaseV1(row.lease as ProcessExecutionLeaseV1),
    observedAt: row.observedAt,
  };
}

function normalizeProcessExecutionTerminalInputWithOutcomeV1(
  value: ProcessExecutionTerminalInputV1,
  expectedOutcome: "completed" | "non_completed" | "any",
): ProcessExecutionTerminalInputV1 {
  const row = exactRecordV1(value, ["lease", "observedAt", "transcript"]);
  const lease = normalizeProcessExecutionLeaseV1(row.lease as ProcessExecutionLeaseV1);
  const transcript = normalizeProcessTranscriptAppendInputV1(
    row.transcript as ProcessTranscriptAppendInputV1,
  );
  const terminal = transcript.terminalAttemptReceipt;
  if (
    !nonNegativeIntegerV1(row.observedAt) ||
    transcript.updatedAt !== row.observedAt || transcript.processId !== lease.processId ||
    transcript.attemptBinding?.attemptId !== lease.attemptId ||
    transcript.attemptBinding.generation !== lease.generation ||
    terminal === null || terminal.attemptId !== lease.attemptId ||
    terminal.generation !== lease.generation ||
    (expectedOutcome === "completed" && terminal.outcome !== "completed") ||
    (expectedOutcome === "non_completed" && terminal.outcome === "completed") ||
    (row.observedAt >= lease.expiresAt && terminal.outcome !== "interrupted")
  ) throw new TypeError("invalid Process execution terminal input");
  return { lease, observedAt: row.observedAt, transcript };
}

/** Shape-only admission; the repository checks whether this Process kind may complete alone. */
export function normalizeProcessExecutionTerminalInputV1(
  value: ProcessExecutionTerminalInputV1,
): ProcessExecutionTerminalInputV1 {
  return normalizeProcessExecutionTerminalInputWithOutcomeV1(value, "any");
}

/** A Program-successor transaction requires a completed terminal. */
export function normalizeProcessExecutionCompletedTerminalInputV1(
  value: ProcessExecutionTerminalInputV1,
): ProcessExecutionTerminalInputV1 {
  return normalizeProcessExecutionTerminalInputWithOutcomeV1(value, "completed");
}

export function cloneProcessExecutionLeaseV1(
  value: ProcessExecutionLeaseV1,
): ProcessExecutionLeaseV1 {
  return normalizeProcessExecutionLeaseV1(value);
}

export function cloneProcessOperationReceiptV1(
  value: ProcessOperationReceiptV1,
): ProcessOperationReceiptV1 {
  return normalizeProcessOperationReceiptV1(value);
}

export function normalizeProcessOperationReceiptV1(
  value: ProcessOperationReceiptV1,
): ProcessOperationReceiptV1 {
  const row = exactRecordV1(value, [
    "processId",
    "operationId",
    "operation",
    "operationDigest",
    "attemptId",
    "generation",
    "processRevision",
    "transcriptFrontier",
    "terminalOutcome",
    "programId",
    "programRevision",
    "repositoryRevision",
    "lease",
  ]);
  const operation = row.operation;
  if (
    !identifierV1(row.processId) || !identifierV1(row.operationId) ||
    (operation !== "execution_acquire" &&
      operation !== "translation_workset_import_execution_acquire" &&
      operation !== "translation_batch_execution_acquire" &&
      operation !== "execution_terminal" && operation !== "program_revision_terminal") ||
    typeof row.operationDigest !== "string" || !/^[0-9a-f]{64}$/u.test(row.operationDigest) ||
    !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !positiveIntegerV1(row.processRevision) ||
    !nonNegativeIntegerV1(row.transcriptFrontier) ||
    (row.terminalOutcome !== null && !attemptOutcomeV1(row.terminalOutcome)) ||
    (row.programId !== null && !identifierV1(row.programId)) ||
    (row.programRevision !== null && !positiveIntegerV1(row.programRevision)) ||
    (row.repositoryRevision !== null && !positiveIntegerV1(row.repositoryRevision)) ||
    (row.programId === null) !== (row.programRevision === null) ||
    (row.programId === null) !== (row.repositoryRevision === null)
  ) throw new TypeError("invalid Process operation receipt");
  const lease = row.lease === null
    ? null
    : normalizeProcessExecutionLeaseV1(row.lease as ProcessExecutionLeaseV1);
  if (
    (lease !== null &&
      (lease.processId !== row.processId || lease.attemptId !== row.attemptId ||
        lease.generation !== row.generation)) ||
    ((operation === "execution_acquire" ||
      operation === "translation_workset_import_execution_acquire" ||
      operation === "translation_batch_execution_acquire") !== (lease !== null)) ||
    ((operation === "execution_terminal" || operation === "program_revision_terminal") !==
      (row.terminalOutcome !== null)) ||
    ((operation === "program_revision_terminal") !== (row.programId !== null))
  ) throw new TypeError("invalid Process operation receipt relationship");
  return {
    processId: row.processId,
    operationId: row.operationId,
    operation,
    operationDigest: row.operationDigest,
    attemptId: row.attemptId,
    generation: row.generation,
    processRevision: row.processRevision,
    transcriptFrontier: row.transcriptFrontier,
    terminalOutcome: row.terminalOutcome,
    programId: row.programId,
    programRevision: row.programRevision,
    repositoryRevision: row.repositoryRevision,
    lease,
  };
}
