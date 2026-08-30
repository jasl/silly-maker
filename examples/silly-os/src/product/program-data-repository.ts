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
  builtinCreatorProgramIdV1,
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
  > {
  /**
   * Narrow product transaction for the first durable Program and its Creator
   * Process. This is not a general transaction API: the subject, pinned
   * definition and initial transcript must describe one cohesive unit.
   */
  createProgramWithProcess(
    input: ProgramProcessCreateBundleInputV1,
  ): Promise<ProgramProcessCreateCompositeCommitResultV1>;
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

export type ProgramDataProcessOperationExpectationV1 =
  | { readonly operation: "execution_acquire"; readonly input: ProcessExecutionAcquireInputV1 }
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
    process.programDefinition.programId !== builtinCreatorProgramIdV1 ||
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
  | "renew_process_execution_lease"
  | "release_process_execution_lease"
  | "load_process_execution_lease"
  | "commit_process_execution_terminal"
  | "commit_program_revision_with_process_execution_terminal"
  | "query_process_operation"
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
