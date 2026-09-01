// SPDX-License-Identifier: MIT

import type { ProgramDataRepositoryV1 } from "../../../src/application/persistence/program-data-repository.ts";
import type {
  ProcessHeadV1,
  TranscriptEntryV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionCompletedTerminalInputV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionAcquireResultV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
  type ProcessOperationReceiptQueryResultV1,
  type ProcessOperationReceiptV1,
} from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  normalizeTranslationBatchCandidatePublishInputV1,
  normalizeTranslationWorksetFinalizeImportInputV1,
  type TranslationBatchCandidatePublishInputV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationWorksetFinalizeImportInputV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetOperationReceiptV1,
  type TranslationWorksetRepositoryV1,
} from "../runtime/translation-workset-repository.ts";

export const translationPersistenceFacetIdV1 = "sillyos.translation.persistence.v1" as const;

export interface TranslationWorksetFinalizeExecutionBundleInputV1 {
  readonly workset: TranslationWorksetFinalizeImportInputV1;
  readonly terminal: ProcessExecutionTerminalInputV1;
}

export interface TranslationBatchCandidateExecutionBundleInputV1 {
  readonly workset: TranslationBatchCandidatePublishInputV1;
  readonly terminal: ProcessExecutionTerminalInputV1;
}

export interface TranslationWorksetImportExecutionAcquireInputV1 {
  /** `null` means that this Process must not have a workset head yet. */
  readonly expectedWorksetRevision: number | null;
  readonly execution: ProcessExecutionAcquireInputV1;
}

export interface TranslationBatchExecutionAcquireInputV1 {
  readonly expectedWorksetRevision: number;
  readonly expectedFirstPendingOrder: number;
  readonly expectedPendingCandidateId: null;
  readonly execution: ProcessExecutionAcquireInputV1;
}

export type TranslationWorksetImportExecutionAcquireResultV1 =
  | Exclude<ProcessExecutionAcquireResultV1, { readonly kind: "conflict" }>
  | {
    readonly kind: "conflict";
    readonly currentWorkset: TranslationWorksetHeadV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export type TranslationBatchExecutionAcquireResultV1 =
  TranslationWorksetImportExecutionAcquireResultV1;

export type TranslationProcessOperationExpectationV1 =
  | {
    readonly operation: "workset_import_execution_acquire";
    readonly input: TranslationWorksetImportExecutionAcquireInputV1;
  }
  | {
    readonly operation: "batch_execution_acquire";
    readonly input: TranslationBatchExecutionAcquireInputV1;
  };

export type TranslationWorksetFinalizeExecutionCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly worksetOperationReceipt: TranslationWorksetOperationReceiptV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly processOperationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentWorkset: TranslationWorksetHeadV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export type TranslationBatchCandidateExecutionCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly candidate: TranslationBatchCandidateRecordV1;
    readonly worksetOperationReceipt: TranslationWorksetOperationReceiptV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly processOperationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentWorkset: TranslationWorksetHeadV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export interface TranslationProgramDataRepositoryV1
  extends ProgramDataRepositoryV1, TranslationWorksetRepositoryV1 {
  acquireTranslationWorksetImportExecution(
    input: TranslationWorksetImportExecutionAcquireInputV1,
  ): Promise<TranslationWorksetImportExecutionAcquireResultV1>;
  acquireTranslationBatchExecution(
    input: TranslationBatchExecutionAcquireInputV1,
  ): Promise<TranslationBatchExecutionAcquireResultV1>;
  commitTranslationWorksetFinalizeWithProcessExecutionTerminal(
    input: TranslationWorksetFinalizeExecutionBundleInputV1,
  ): Promise<TranslationWorksetFinalizeExecutionCompositeCommitResultV1>;
  commitTranslationBatchCandidateWithProcessExecutionTerminal(
    input: TranslationBatchCandidateExecutionBundleInputV1,
  ): Promise<TranslationBatchCandidateExecutionCompositeCommitResultV1>;
  queryTranslationProcessOperation(
    expectation: TranslationProcessOperationExpectationV1,
  ): Promise<ProcessOperationReceiptQueryResultV1>;
}

export function normalizeTranslationWorksetFinalizeExecutionBundleInputV1(
  value: TranslationWorksetFinalizeExecutionBundleInputV1,
): TranslationWorksetFinalizeExecutionBundleInputV1 {
  const workset = normalizeTranslationWorksetFinalizeImportInputV1(value.workset);
  const terminal = normalizeProcessExecutionCompletedTerminalInputV1(value.terminal);
  const checkpoint = terminal.transcript.checkpoint;
  if (
    workset.processId !== terminal.transcript.processId ||
    workset.updatedAt !== terminal.observedAt || checkpoint === null ||
    checkpoint.workspaceId !== workset.sourceBinding.workspaceId ||
    checkpoint.workspaceCheckpointId !== workset.sourceBinding.checkpointId ||
    checkpoint.workspaceGeneration !== workset.sourceBinding.generation ||
    workset.lease.processId !== terminal.lease.processId ||
    workset.lease.ownerInstanceId !== terminal.lease.ownerInstanceId ||
    workset.lease.attemptId !== terminal.lease.attemptId ||
    workset.lease.generation !== terminal.lease.generation ||
    workset.lease.expiresAt !== terminal.lease.expiresAt
  ) throw new TypeError("invalid Translation workset/Process execution terminal bundle");
  return { workset, terminal };
}

export function normalizeTranslationWorksetImportExecutionAcquireInputV1(
  value: TranslationWorksetImportExecutionAcquireInputV1,
): TranslationWorksetImportExecutionAcquireInputV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 2 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" && ["expectedWorksetRevision", "execution"].includes(key)
    ) ||
    (value.expectedWorksetRevision !== null &&
      (!Number.isSafeInteger(value.expectedWorksetRevision) || value.expectedWorksetRevision < 1))
  ) throw new TypeError("invalid Translation workset execution acquire input");
  return {
    expectedWorksetRevision: value.expectedWorksetRevision,
    execution: normalizeProcessExecutionAcquireInputV1(value.execution),
  };
}

export function normalizeTranslationBatchExecutionAcquireInputV1(
  value: TranslationBatchExecutionAcquireInputV1,
): TranslationBatchExecutionAcquireInputV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 4 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" && [
        "expectedWorksetRevision",
        "expectedFirstPendingOrder",
        "expectedPendingCandidateId",
        "execution",
      ].includes(key)
    ) || !Number.isSafeInteger(value.expectedWorksetRevision) ||
    value.expectedWorksetRevision < 1 ||
    !Number.isSafeInteger(value.expectedFirstPendingOrder) ||
    value.expectedFirstPendingOrder < 0 || value.expectedPendingCandidateId !== null
  ) throw new TypeError("invalid Translation batch execution acquire input");
  return {
    expectedWorksetRevision: value.expectedWorksetRevision,
    expectedFirstPendingOrder: value.expectedFirstPendingOrder,
    expectedPendingCandidateId: null,
    execution: normalizeProcessExecutionAcquireInputV1(value.execution),
  };
}

export function normalizeTranslationBatchCandidateExecutionBundleInputV1(
  value: TranslationBatchCandidateExecutionBundleInputV1,
): TranslationBatchCandidateExecutionBundleInputV1 {
  const workset = normalizeTranslationBatchCandidatePublishInputV1(value.workset);
  const terminal = normalizeProcessExecutionCompletedTerminalInputV1(value.terminal);
  if (
    workset.processId !== terminal.transcript.processId ||
    workset.updatedAt !== terminal.observedAt ||
    workset.lease.processId !== terminal.lease.processId ||
    workset.lease.ownerInstanceId !== terminal.lease.ownerInstanceId ||
    workset.lease.attemptId !== terminal.lease.attemptId ||
    workset.lease.generation !== terminal.lease.generation ||
    workset.lease.expiresAt !== terminal.lease.expiresAt
  ) throw new TypeError("invalid Translation candidate/Process terminal bundle");
  return { workset, terminal };
}
