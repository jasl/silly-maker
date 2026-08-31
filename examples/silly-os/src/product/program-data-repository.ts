// SPDX-License-Identifier: MIT

import {
  normalizeProgramCatalogApplyRevisionInputV1,
  normalizeProgramCatalogCreateInputV1,
  normalizeProgramCatalogDecideInputV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogCreateInputV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogRepositoryV1,
} from "./program-catalog-repository.ts";
import {
  bundledCreatorProgramIdV1,
  normalizeProcessCreateInputV1,
  normalizeProcessTranscriptAppendInputV1,
  type ProcessCreateInputV1,
  type ProcessHeadV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramDefinitionReferenceV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "./program-process-repository.ts";
import type {
  ProgramNetworkAccessMutationResultV1,
  ProgramNetworkAccessMutationV1,
  ProgramNetworkAccessV1,
} from "./program-network-access.ts";
import {
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionCompletedTerminalInputV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionAcquireResultV1,
  type ProcessExecutionLeaseMutationResultV1,
  type ProcessExecutionLeaseReleaseInputV1,
  type ProcessExecutionLeaseRenewInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
  type ProcessExecutionTerminalResultV1,
  type ProcessOperationReceiptQueryResultV1,
  type ProcessOperationReceiptV1,
} from "./process-execution-repository.ts";
import {
  normalizeTranslationBatchCandidatePublishInputV1,
  normalizeTranslationWorksetFinalizeImportInputV1,
  type TranslationBatchCandidatePublishInputV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationWorksetFinalizeImportInputV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetOperationReceiptV1,
  type TranslationWorksetRepositoryV1,
} from "./translation/translation-workset-repository.ts";

/**
 * The one product-side persistence boundary. Catalog, Process, transcript,
 * continuation, and network preference remain distinct logical authorities,
 * but one physical repository can commit their exact store sets atomically.
 */
export interface ProgramDataRepositoryV1 extends
  Pick<
    ProgramCatalogRepositoryV1,
    | "initialize"
    | "listPrograms"
    | "load"
    | "loadProgramRevision"
    | "loadDecision"
    | "loadLatestAcceptedDecision"
    | "listAcceptedDecisions"
    | "loadContinuation"
    | "reset"
    | "dispose"
  >,
  Pick<
    ProgramProcessRepositoryV1,
    | "publishProgramDefinitionRevision"
    | "loadProgramDefinitionRevision"
    | "loadProcess"
    | "listProcessSummaries"
    | "loadTranscriptPage"
  >,
  Pick<
    TranslationWorksetRepositoryV1,
    | "beginTranslationWorksetImport"
    | "appendTranslationWorksetImport"
    | "loadTranslationWorksetHead"
    | "loadTranslationWorksetUnitPage"
    | "loadTranslationWorksetGlossaryPage"
    | "loadTranslationBatchCandidate"
    | "acceptTranslationBatchCandidate"
    | "rejectTranslationBatchCandidate"
    | "queryTranslationWorksetOperation"
  > {
  /**
   * Narrow product transaction for the first durable Program and its Creator
   * Process. This is not a general transaction API: the subject, pinned
   * definition and initial transcript must describe one cohesive unit.
   */
  createProgramWithProcess(
    input: ProgramProcessCreateBundleInputV1,
  ): Promise<ProgramProcessCreateCompositeCommitResultV1>;
  /**
   * Atomically publishes a non-Creator Process, its first transcript checkpoint,
   * and the exact identity of the Workspace volume owned by that Process. The
   * Host creates and adopts the volume outside this IndexedDB transaction.
   */
  createProcessWithWorkspace(
    input: ProcessWorkspaceCreateBundleInputV1,
  ): Promise<ProcessWorkspaceCreateCompositeCommitResultV1>;
  loadProcessWorkspaceBinding(processId: string): Promise<ProcessWorkspaceBindingV1 | null>;
  /** Atomically publishes one Program revision and its exact Process transcript outcome. */
  applyProgramRevisionWithProcessTranscript(
    input: ProgramProcessRevisionBundleInputV1,
  ): Promise<ProgramProcessCompositeCommitResultV1>;
  /** Atomically records one review decision and its user-visible Process entry. */
  decideProgramWithProcessTranscript(
    input: ProgramProcessDecisionBundleInputV1,
  ): Promise<ProgramProcessCompositeCommitResultV1>;
  acquireProcessExecution(
    input: ProcessExecutionAcquireInputV1,
  ): Promise<ProcessExecutionAcquireResultV1>;
  /**
   * Atomically acquires one Translation import attempt only while the
   * Process-owned workset is absent or at the exact staging revision observed
   * by the caller.
   */
  acquireTranslationWorksetImportExecution(
    input: TranslationWorksetImportExecutionAcquireInputV1,
  ): Promise<TranslationWorksetImportExecutionAcquireResultV1>;
  /** Acquires an Agent batch only at the exact ready, candidate-free workset frontier. */
  acquireTranslationBatchExecution(
    input: TranslationBatchExecutionAcquireInputV1,
  ): Promise<TranslationBatchExecutionAcquireResultV1>;
  renewProcessExecutionLease(
    input: ProcessExecutionLeaseRenewInputV1,
  ): Promise<ProcessExecutionLeaseMutationResultV1>;
  releaseProcessExecutionLease(
    input: ProcessExecutionLeaseReleaseInputV1,
  ): Promise<ProcessExecutionLeaseMutationResultV1>;
  loadProcessExecutionLease(processId: string): Promise<ProcessExecutionLeaseV1 | null>;
  commitProcessExecutionTerminal(
    input: ProcessExecutionTerminalInputV1,
  ): Promise<ProcessExecutionTerminalResultV1>;
  commitProgramRevisionWithProcessExecutionTerminal(
    input: ProgramProcessExecutionRevisionBundleInputV1,
  ): Promise<ProgramProcessExecutionCompositeCommitResultV1>;
  /**
   * Atomically publishes a ready Translation workset and the completed
   * terminal of the exact Process attempt that imported it.
   */
  commitTranslationWorksetFinalizeWithProcessExecutionTerminal(
    input: TranslationWorksetFinalizeExecutionBundleInputV1,
  ): Promise<TranslationWorksetFinalizeExecutionCompositeCommitResultV1>;
  /** Atomically publishes one pending-review candidate and its completed Process terminal. */
  commitTranslationBatchCandidateWithProcessExecutionTerminal(
    input: TranslationBatchCandidateExecutionBundleInputV1,
  ): Promise<TranslationBatchCandidateExecutionCompositeCommitResultV1>;
  queryProcessOperation(
    expectation: ProgramDataProcessOperationExpectationV1,
  ): Promise<ProcessOperationReceiptQueryResultV1>;
  loadProgramNetworkAccess(programId: string): Promise<ProgramNetworkAccessV1 | null>;
  setProgramNetworkAccess(
    input: ProgramNetworkAccessMutationV1,
  ): Promise<ProgramNetworkAccessMutationResultV1>;
}

export interface ProgramProcessCreateBundleInputV1 {
  readonly catalog: ProgramCatalogCreateInputV1;
  readonly process: ProcessCreateInputV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

/** Durable identity of the Workspace volume owned by one Process. */
export interface ProcessWorkspaceBindingV1 {
  readonly revision: 1;
  readonly processId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
}

export interface ProcessWorkspaceCreateBundleInputV1 {
  readonly process: ProcessCreateInputV1;
  readonly workspace: ProcessWorkspaceBindingV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface ProgramProcessRevisionBundleInputV1 {
  readonly catalog: ProgramCatalogApplyRevisionInputV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface ProgramProcessDecisionBundleInputV1 {
  readonly catalog: ProgramCatalogDecideInputV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface ProgramProcessExecutionRevisionBundleInputV1
  extends ProcessExecutionTerminalInputV1 {
  readonly catalog: ProgramCatalogApplyRevisionInputV1;
}

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

export type ProgramDataProcessOperationExpectationV1 =
  | { readonly operation: "execution_acquire"; readonly input: ProcessExecutionAcquireInputV1 }
  | {
    readonly operation: "translation_workset_import_execution_acquire";
    readonly input: TranslationWorksetImportExecutionAcquireInputV1;
  }
  | {
    readonly operation: "translation_batch_execution_acquire";
    readonly input: TranslationBatchExecutionAcquireInputV1;
  }
  | { readonly operation: "execution_terminal"; readonly input: ProcessExecutionTerminalInputV1 }
  | {
    readonly operation: "program_revision_terminal";
    readonly input: ProgramProcessExecutionRevisionBundleInputV1;
  };

export function normalizeProgramProcessCreateBundleInputV1(
  value: ProgramProcessCreateBundleInputV1,
): ProgramProcessCreateBundleInputV1 {
  const catalog = normalizeProgramCatalogCreateInputV1(value.catalog);
  const process = normalizeProcessCreateInputV1(value.process);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  if (
    process.programDefinition.programId !== bundledCreatorProgramIdV1 ||
    process.programDefinition.revision !== 1 ||
    process.subjectProgramId !== catalog.program.programId ||
    transcript.processId !== process.processId ||
    transcript.expectedProcessRevision !== 1 || transcript.expectedTranscriptFrontier !== 0 ||
    transcript.attemptBinding !== null || transcript.checkpoint !== null ||
    transcript.terminalAttemptReceipt !== null || transcript.entries[0]?.sequence !== 1 ||
    process.createdAt > transcript.updatedAt || catalog.updatedAt > transcript.updatedAt
  ) throw new TypeError("invalid Program/Process create bundle");
  return { catalog, process, transcript };
}

const processWorkspaceIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export function cloneProcessWorkspaceBindingV1(
  value: ProcessWorkspaceBindingV1,
): ProcessWorkspaceBindingV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 5 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" &&
      ["revision", "processId", "workspaceId", "volumeId", "workspaceFormat"].includes(key)
    ) || value.revision !== 1 || value.workspaceFormat !== 1 ||
    !processWorkspaceIdentifierPatternV1.test(value.processId) ||
    !processWorkspaceIdentifierPatternV1.test(value.workspaceId) ||
    !processWorkspaceIdentifierPatternV1.test(value.volumeId)
  ) throw new TypeError("invalid Process Workspace binding");
  return {
    revision: 1,
    processId: value.processId,
    workspaceId: value.workspaceId,
    volumeId: value.volumeId,
    workspaceFormat: 1,
  };
}

export function normalizeProcessWorkspaceCreateBundleInputV1(
  value: ProcessWorkspaceCreateBundleInputV1,
): ProcessWorkspaceCreateBundleInputV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 3 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" && ["process", "workspace", "transcript"].includes(key)
    )
  ) throw new TypeError("invalid Process/Workspace create bundle");
  const process = normalizeProcessCreateInputV1(value.process);
  const workspace = cloneProcessWorkspaceBindingV1(value.workspace);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  const checkpoint = transcript.checkpoint;
  const lastEntry = transcript.entries.at(-1)!;
  if (
    process.subjectProgramId === null || workspace.processId !== process.processId ||
    transcript.processId !== process.processId || transcript.expectedProcessRevision !== 1 ||
    transcript.expectedTranscriptFrontier !== 0 || transcript.attemptBinding !== null ||
    transcript.terminalAttemptReceipt !== null || transcript.entries[0]?.sequence !== 1 ||
    checkpoint === null || checkpoint.workspaceId !== workspace.workspaceId ||
    checkpoint.throughSequence !== lastEntry.sequence || process.createdAt > transcript.updatedAt
  ) throw new TypeError("invalid Process/Workspace create bundle");
  return { process, workspace, transcript };
}

export function normalizeProgramProcessRevisionBundleInputV1(
  value: ProgramProcessRevisionBundleInputV1,
): ProgramProcessRevisionBundleInputV1 {
  const catalog = normalizeProgramCatalogApplyRevisionInputV1(value.catalog);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  if (
    catalog.updatedAt > transcript.updatedAt ||
    transcript.attemptBinding !== null || transcript.checkpoint !== null ||
    transcript.terminalAttemptReceipt !== null
  ) {
    throw new TypeError("invalid Program/Process revision bundle");
  }
  return { catalog, transcript };
}

export function normalizeProgramProcessDecisionBundleInputV1(
  value: ProgramProcessDecisionBundleInputV1,
): ProgramProcessDecisionBundleInputV1 {
  const catalog = normalizeProgramCatalogDecideInputV1(value.catalog);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  if (
    catalog.updatedAt > transcript.updatedAt || transcript.attemptBinding !== null ||
    transcript.checkpoint !== null || transcript.terminalAttemptReceipt !== null
  ) throw new TypeError("invalid Program/Process decision bundle");
  return { catalog, transcript };
}

export function normalizeProgramProcessExecutionRevisionBundleInputV1(
  value: ProgramProcessExecutionRevisionBundleInputV1,
): ProgramProcessExecutionRevisionBundleInputV1 {
  const terminal = normalizeProcessExecutionCompletedTerminalInputV1({
    lease: value.lease,
    observedAt: value.observedAt,
    transcript: value.transcript,
  });
  const catalog = normalizeProgramCatalogApplyRevisionInputV1(value.catalog);
  const checkpoint = terminal.transcript.checkpoint;
  if (
    catalog.updatedAt > terminal.transcript.updatedAt || checkpoint === null ||
    checkpoint.workspaceId !== catalog.continuation.workspaceId ||
    checkpoint.workspaceCheckpointId !== catalog.reviewedHead.checkpointId ||
    checkpoint.workspaceGeneration !== catalog.reviewedHead.generation
  ) throw new TypeError("invalid Program/Process execution revision bundle");
  return { ...terminal, catalog };
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

export type ProgramProcessCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly record: ProgramCatalogRecordV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  }
  | {
    readonly kind: "conflict";
    readonly currentProgram: ProgramCatalogRecordV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
  };

export type ProgramProcessCreateCompositeCommitResultV1 =
  | ProgramProcessCompositeCommitResultV1
  | {
    readonly kind: "program_definition_missing";
    readonly programDefinition: ProgramDefinitionReferenceV1;
  };

export type ProgramProcessExecutionCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly record: ProgramCatalogRecordV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProgram: ProgramCatalogRecordV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  }
  | {
    readonly kind: "program_definition_missing";
    readonly programDefinition: ProgramDefinitionReferenceV1;
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

export type ProcessWorkspaceCreateCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly process: ProcessHeadV1;
    readonly workspace: ProcessWorkspaceBindingV1;
    readonly entries: readonly TranscriptEntryV1[];
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentWorkspace: ProcessWorkspaceBindingV1 | null;
  }
  | {
    readonly kind: "program_definition_missing";
    readonly programDefinition: ProgramDefinitionReferenceV1;
  }
  | {
    readonly kind: "subject_program_missing";
    readonly subjectProgramId: string;
  }
  | {
    readonly kind: "workspace_volume_owned";
    readonly owner: ProcessWorkspaceBindingV1;
  };

export type ProgramDataRepositoryOperationV1 =
  | "initialize"
  | "list_programs"
  | "load_program"
  | "load_program_revision"
  | "load_program_decision"
  | "load_latest_accepted_program_decision"
  | "list_accepted_program_decisions"
  | "load_workspace_continuation"
  | "create_program"
  | "apply_program_revision"
  | "decide_program_proposal"
  | "create_program_with_process"
  | "create_process_with_workspace"
  | "load_process_workspace_binding"
  | "apply_program_revision_with_process_transcript"
  | "decide_program_with_process_transcript"
  | "publish_program_definition_revision"
  | "load_program_definition_revision"
  | "create_process"
  | "load_process"
  | "list_process_summaries"
  | "begin_process_attempt"
  | "append_process_transcript"
  | "acquire_process_execution"
  | "acquire_translation_workset_import_execution"
  | "acquire_translation_batch_execution"
  | "renew_process_execution_lease"
  | "release_process_execution_lease"
  | "load_process_execution_lease"
  | "commit_process_execution_terminal"
  | "commit_program_revision_with_process_execution_terminal"
  | "commit_translation_workset_finalize_with_process_execution_terminal"
  | "commit_translation_batch_candidate_with_process_execution_terminal"
  | "accept_translation_batch_candidate"
  | "reject_translation_batch_candidate"
  | "query_process_operation"
  | "begin_translation_workset_import"
  | "append_translation_workset_import"
  | "load_translation_workset_head"
  | "load_translation_workset_unit_page"
  | "load_translation_workset_glossary_page"
  | "load_translation_batch_candidate"
  | "query_translation_workset_operation"
  | "load_transcript_page"
  | "load_program_network_access"
  | "set_program_network_access"
  | "reset"
  | "dispose";

export type ProgramDataRepositoryFailureCodeV1 =
  | "unavailable"
  | "database_newer"
  | "upgrade_blocked"
  | "quota_exceeded"
  | "transaction_aborted"
  | "request_failed"
  | "schema_invalid"
  | "disposed"
  | "wire_invalid"
  | "outcome_unknown"
  | "page_budget_too_small";

export interface ProgramDataRepositoryFailureV1 extends Error {
  readonly code: ProgramDataRepositoryFailureCodeV1;
  readonly operation: ProgramDataRepositoryOperationV1;
}

export function createProgramDataRepositoryFailureV1(
  code: ProgramDataRepositoryFailureCodeV1,
  operation: ProgramDataRepositoryOperationV1,
): ProgramDataRepositoryFailureV1 {
  const failure = new Error(
    `sillyos.program_data_repository.${code}`,
  ) as ProgramDataRepositoryFailureV1;
  failure.name = "ProgramDataRepositoryFailureV1";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return failure;
}

export function isProgramDataRepositoryFailureV1(
  value: unknown,
): value is ProgramDataRepositoryFailureV1 {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ProgramDataRepositoryFailureV1>;
  return candidate.name === "ProgramDataRepositoryFailureV1" &&
    typeof candidate.code === "string" && typeof candidate.operation === "string";
}
