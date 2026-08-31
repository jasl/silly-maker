// SPDX-License-Identifier: MIT

import type { PreviewProgramV1 } from "./contracts.ts";
import {
  clonePreviewProgramForCatalogV1,
  cloneProgramCatalogContinuationV1,
  cloneProgramCatalogDecisionV1,
  cloneProgramCatalogRecordV1,
  normalizeProgramCatalogAcceptedDecisionListInputV1,
  normalizeProgramCatalogListInputV1,
  normalizeProgramCatalogProgramIdV1,
  normalizeProgramCatalogProposalIdV1,
  normalizeProgramCatalogRevisionV1,
  type ProgramCatalogAcceptedDecisionListInputV1,
  type ProgramCatalogAcceptedDecisionListPageV1,
  type ProgramCatalogAcceptedDecisionV1,
  type ProgramCatalogContinuationV1,
  type ProgramCatalogDecisionV1,
  type ProgramCatalogListInputV1,
  type ProgramCatalogListPageV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogSummaryV1,
} from "./program-catalog-repository.ts";
import {
  admitProcessHeadV1,
  admitProcessSummaryV1,
  admitProgramDefinitionRevisionV1,
  admitProcessTerminalAttemptReceiptV1,
  admitTranscriptEntryV1,
  normalizeProcessIdV1,
  normalizeProcessSummaryListInputV1,
  normalizeProgramIdV1,
  normalizeRevisionV1,
  normalizeTranscriptPageRequestV1,
  processSummaryUtf8ByteLengthV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessHeadV1,
  type ProcessSummaryListInputV1,
  type ProcessSummaryPageV1,
  type ProgramDefinitionPublishResultV1,
  type ProgramDefinitionRevisionV1,
  type TranscriptEntryV1,
  type TranscriptPageV1,
} from "./program-process-repository.ts";
import {
  admitProgramNetworkAccessMutationResultV1,
  admitProgramNetworkAccessV1,
  normalizeProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessMutationResultV1,
  type ProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessV1,
} from "./program-network-access.ts";
import {
  cloneProcessWorkspaceBindingV1,
  normalizeProgramProcessCreateBundleInputV1,
  normalizeProgramProcessDecisionBundleInputV1,
  normalizeProgramProcessExecutionRevisionBundleInputV1,
  normalizeProgramProcessRevisionBundleInputV1,
  normalizeProcessWorkspaceCreateBundleInputV1,
  normalizeTranslationBatchCandidateExecutionBundleInputV1,
  normalizeTranslationBatchExecutionAcquireInputV1,
  normalizeTranslationWorksetImportExecutionAcquireInputV1,
  normalizeTranslationWorksetFinalizeExecutionBundleInputV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryFailureCodeV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramProcessCompositeCommitResultV1,
  type ProgramProcessCreateCompositeCommitResultV1,
  type ProgramProcessCreateBundleInputV1,
  type ProgramProcessDecisionBundleInputV1,
  type ProgramProcessExecutionCompositeCommitResultV1,
  type ProgramProcessExecutionRevisionBundleInputV1,
  type ProgramProcessRevisionBundleInputV1,
  type ProcessWorkspaceBindingV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
  type ProcessWorkspaceCreateBundleInputV1,
  type TranslationBatchCandidateExecutionBundleInputV1,
  type TranslationBatchCandidateExecutionCompositeCommitResultV1,
  type TranslationBatchExecutionAcquireInputV1,
  type TranslationBatchExecutionAcquireResultV1,
  type TranslationWorksetFinalizeExecutionBundleInputV1,
  type TranslationWorksetFinalizeExecutionCompositeCommitResultV1,
  type TranslationWorksetImportExecutionAcquireInputV1,
  type TranslationWorksetImportExecutionAcquireResultV1,
} from "./program-data-repository.ts";
import {
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionLeaseReleaseInputV1,
  normalizeProcessExecutionLeaseRenewInputV1,
  normalizeProcessExecutionLeaseV1,
  normalizeProcessExecutionCompletedTerminalInputV1,
  normalizeProcessExecutionTerminalInputV1,
  normalizeProcessOperationReceiptV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionAcquireResultV1,
  type ProcessExecutionLeaseMutationResultV1,
  type ProcessExecutionLeaseReleaseInputV1,
  type ProcessExecutionLeaseRenewInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
  type ProcessExecutionTerminalResultV1,
  type ProcessOperationReceiptV1,
  type ProcessOperationReceiptQueryResultV1,
} from "./process-execution-repository.ts";
import {
  cloneTranslationBatchCandidateRecordV1,
  normalizeTranslationBatchCandidateAcceptInputV1,
  normalizeTranslationBatchCandidatePublishInputV1,
  normalizeTranslationBatchCandidateRejectInputV1,
  normalizeTranslationWorksetAppendImportInputV1,
  normalizeTranslationWorksetBeginImportInputV1,
  normalizeTranslationWorksetFinalizeImportInputV1,
  normalizeTranslationWorksetOperationExpectationV1,
  normalizeTranslationWorksetPageRequestV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationBatchCandidateAcceptInputV1,
  type TranslationBatchCandidateRejectInputV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetMutationResultV1,
  type TranslationWorksetOperationExpectationV1,
  type TranslationWorksetOperationQueryResultV1,
  type TranslationWorksetPageRequestV1,
  type TranslationWorksetPageResultV1,
  type TranslationWorksetGlossaryEntryV1,
  type TranslationWorksetUnitRecordV1,
  type TranslationWorksetUnitV1,
} from "./translation/translation-workset-repository.ts";

export type ProgramDataRepositoryWorkerRequestV1 =
  | { readonly method: "initialize" | "reset" | "dispose" }
  | { readonly method: "list_programs"; readonly input: ProgramCatalogListInputV1 }
  | { readonly method: "load_program"; readonly programId: string }
  | {
    readonly method: "load_program_revision";
    readonly programId: string;
    readonly revision: number;
  }
  | {
    readonly method: "load_program_decision";
    readonly programId: string;
    readonly proposalId: string;
    readonly programRevision: number;
  }
  | { readonly method: "load_latest_accepted_program_decision"; readonly programId: string }
  | {
    readonly method: "list_accepted_program_decisions";
    readonly input: ProgramCatalogAcceptedDecisionListInputV1;
  }
  | { readonly method: "load_workspace_continuation"; readonly programId: string }
  | {
    readonly method: "create_program_with_process";
    readonly input: ProgramProcessCreateBundleInputV1;
  }
  | {
    readonly method: "create_process_with_workspace";
    readonly input: ProcessWorkspaceCreateBundleInputV1;
  }
  | { readonly method: "load_process_workspace_binding"; readonly processId: string }
  | {
    readonly method: "apply_program_revision_with_process_transcript";
    readonly input: ProgramProcessRevisionBundleInputV1;
  }
  | {
    readonly method: "decide_program_with_process_transcript";
    readonly input: ProgramProcessDecisionBundleInputV1;
  }
  | {
    readonly method: "publish_program_definition_revision";
    readonly definition: ProgramDefinitionRevisionV1;
  }
  | {
    readonly method: "load_program_definition_revision";
    readonly programId: string;
    readonly revision: number;
  }
  | { readonly method: "load_process"; readonly processId: string }
  | { readonly method: "list_process_summaries"; readonly input: ProcessSummaryListInputV1 }
  | { readonly method: "acquire_process_execution"; readonly input: ProcessExecutionAcquireInputV1 }
  | {
    readonly method: "acquire_translation_workset_import_execution";
    readonly input: TranslationWorksetImportExecutionAcquireInputV1;
  }
  | {
    readonly method: "acquire_translation_batch_execution";
    readonly input: TranslationBatchExecutionAcquireInputV1;
  }
  | {
    readonly method: "renew_process_execution_lease";
    readonly input: ProcessExecutionLeaseRenewInputV1;
  }
  | {
    readonly method: "release_process_execution_lease";
    readonly input: ProcessExecutionLeaseReleaseInputV1;
  }
  | { readonly method: "load_process_execution_lease"; readonly processId: string }
  | {
    readonly method: "commit_process_execution_terminal";
    readonly input: ProcessExecutionTerminalInputV1;
  }
  | {
    readonly method: "commit_program_revision_with_process_execution_terminal";
    readonly input: ProgramProcessExecutionRevisionBundleInputV1;
  }
  | {
    readonly method: "query_process_operation";
    readonly input: ProgramDataProcessOperationExpectationV1;
  }
  | {
    readonly method: "begin_translation_workset_import";
    readonly input:
      import("./translation/translation-workset-repository.ts").TranslationWorksetBeginImportInputV1;
  }
  | {
    readonly method: "append_translation_workset_import";
    readonly input:
      import("./translation/translation-workset-repository.ts").TranslationWorksetAppendImportInputV1;
  }
  | {
    readonly method: "commit_translation_workset_finalize_with_process_execution_terminal";
    readonly input: TranslationWorksetFinalizeExecutionBundleInputV1;
  }
  | {
    readonly method: "commit_translation_batch_candidate_with_process_execution_terminal";
    readonly input: TranslationBatchCandidateExecutionBundleInputV1;
  }
  | { readonly method: "load_translation_workset_head"; readonly processId: string }
  | {
    readonly method: "load_translation_batch_candidate";
    readonly processId: string;
    readonly candidateId: string;
  }
  | {
    readonly method: "accept_translation_batch_candidate";
    readonly input: TranslationBatchCandidateAcceptInputV1;
  }
  | {
    readonly method: "reject_translation_batch_candidate";
    readonly input: TranslationBatchCandidateRejectInputV1;
  }
  | {
    readonly method: "load_translation_workset_unit_page";
    readonly input: TranslationWorksetPageRequestV1;
  }
  | {
    readonly method: "load_translation_workset_glossary_page";
    readonly input: TranslationWorksetPageRequestV1;
  }
  | {
    readonly method: "query_translation_workset_operation";
    readonly input: TranslationWorksetOperationExpectationV1;
  }
  | {
    readonly method: "load_transcript_page";
    readonly input: {
      readonly processId: string;
      readonly beforeSequence: number | null;
      readonly maximumBytes: number;
    };
  }
  | { readonly method: "load_program_network_access"; readonly programId: string }
  | {
    readonly method: "set_program_network_access";
    readonly input: ProgramNetworkAccessMutationV1;
  };

export type ProgramDataRepositoryWorkerMethodV1 = ProgramDataRepositoryWorkerRequestV1["method"];

export interface ProgramDataRepositoryWorkerRequestEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: string;
  readonly record: ProgramDataRepositoryWorkerRequestV1;
}

interface TranscriptResponseExpectationV1 {
  readonly processId: string;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly operationId: string;
  readonly entryCount: number;
  readonly firstSequence: number | null;
  readonly lastSequence: number | null;
  readonly terminalAttempt: {
    readonly attemptId: string;
    readonly generation: number;
    readonly outcome: string;
  } | null;
}

interface ExecutionResponseExpectationV1 {
  readonly operation:
    | "execution_acquire"
    | "translation_workset_import_execution_acquire"
    | "translation_batch_execution_acquire";
  readonly processId: string;
  readonly operationId: string;
  readonly ownerInstanceId: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly expiresAt: number;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly triggerEntryId: string;
  readonly triggerSequence: number;
  readonly publishesTriggerEntry: boolean;
  readonly startingCheckpoint: ProcessExecutionAcquireInputV1["attempt"]["startingCheckpoint"];
}

interface TerminalResponseExpectationV1 {
  readonly operation: "execution_terminal" | "program_revision_terminal";
  readonly lease: ProcessExecutionLeaseV1;
  readonly transcript: TranscriptResponseExpectationV1;
  readonly program: {
    readonly programId: string;
    readonly programRevision: number;
    readonly repositoryRevision: number;
  } | null;
}

type ProgramDataRepositoryWorkerResponseBindingV1 =
  | { readonly kind: "none" }
  | { readonly kind: "catalog_list"; readonly input: ProgramCatalogListInputV1 }
  | {
    readonly kind: "accepted_decision_list";
    readonly input: ProgramCatalogAcceptedDecisionListInputV1;
  }
  | { readonly kind: "program"; readonly programId: string }
  | {
    readonly kind: "program_revision";
    readonly programId: string;
    readonly revision: number;
  }
  | {
    readonly kind: "program_decision";
    readonly programId: string;
    readonly proposalId: string;
    readonly programRevision: number;
  }
  | {
    readonly kind: "program_process";
    readonly method:
      | "create_program_with_process"
      | "apply_program_revision_with_process_transcript"
      | "decide_program_with_process_transcript";
    readonly programId: string;
    readonly processId: string;
    readonly programDefinition: { readonly programId: string; readonly revision: number } | null;
    readonly createdAt: number | null;
    readonly transcript: TranscriptResponseExpectationV1;
  }
  | {
    readonly kind: "process_workspace_create";
    readonly processId: string;
    readonly subjectProgramId: string | null;
    readonly programDefinition: { readonly programId: string; readonly revision: number };
    readonly createdAt: number;
    readonly workspace: ProcessWorkspaceBindingV1;
    readonly transcript: TranscriptResponseExpectationV1;
  }
  | {
    readonly kind: "definition_publish";
    readonly programId: string;
    readonly revision: number;
  }
  | { readonly kind: "process"; readonly processId: string }
  | { readonly kind: "process_summary_list"; readonly input: ProcessSummaryListInputV1 }
  | { readonly kind: "execution_acquire"; readonly input: ExecutionResponseExpectationV1 }
  | {
    readonly kind: "execution_lease_mutation";
    readonly method: "renew_process_execution_lease" | "release_process_execution_lease";
    readonly lease: ProcessExecutionLeaseV1;
    readonly expiresAt: number | null;
    readonly observedAt: number;
  }
  | { readonly kind: "execution_terminal"; readonly input: TerminalResponseExpectationV1 }
  | {
    readonly kind: "translation_finalize_terminal";
    readonly processId: string;
    readonly operationId: string;
    readonly terminal: TerminalResponseExpectationV1;
  }
  | {
    readonly kind: "translation_candidate_terminal";
    readonly processId: string;
    readonly operationId: string;
    readonly expectedWorksetRevision: number;
    readonly expectedFirstPendingOrder: number;
    readonly unitCount: number;
    readonly attemptId: string;
    readonly generation: number;
    readonly updatedAt: number;
    readonly terminal: TerminalResponseExpectationV1;
  }
  | {
    readonly kind: "process_operation_query";
    readonly processId: string;
    readonly operationId: string;
    readonly receipt:
      | { readonly kind: "execution"; readonly input: ExecutionResponseExpectationV1 }
      | { readonly kind: "terminal"; readonly input: TerminalResponseExpectationV1 };
  }
  | {
    readonly kind: "workset_mutation";
    readonly processId: string;
    readonly operationId: string;
    readonly operation: "begin" | "append" | "accept_candidate" | "reject_candidate";
    readonly candidateId: string | null;
  }
  | {
    readonly kind: "translation_candidate";
    readonly processId: string;
    readonly candidateId: string;
  }
  | {
    readonly kind: "workset_page";
    readonly input: TranslationWorksetPageRequestV1;
  }
  | {
    readonly kind: "workset_operation_query";
    readonly processId: string;
    readonly operationId: string;
  }
  | {
    readonly kind: "transcript_page";
    readonly processId: string;
    readonly beforeSequence: number | null;
    readonly maximumBytes: number;
  }
  | {
    readonly kind: "network_mutation";
    readonly programId: string;
    readonly enabled: boolean;
  };

/**
 * Page-owned response binding. It intentionally contains only compact identity,
 * revision, cursor, and budget fields; request payloads stay owned by the one
 * structured-clone hop into the Worker and are not admitted or retained again.
 */
export interface ProgramDataRepositoryWorkerResponseExpectationV1 {
  readonly method: ProgramDataRepositoryWorkerMethodV1;
  readonly binding: ProgramDataRepositoryWorkerResponseBindingV1;
}

function transcriptResponseExpectationV1(
  input: ProcessExecutionTerminalInputV1["transcript"],
): TranscriptResponseExpectationV1 {
  const first = input.entries.at(0);
  const last = input.entries.at(-1);
  const terminal = input.terminalAttemptReceipt;
  return {
    processId: input.processId,
    expectedProcessRevision: input.expectedProcessRevision,
    expectedTranscriptFrontier: input.expectedTranscriptFrontier,
    operationId: input.commitId,
    entryCount: input.entries.length,
    firstSequence: first?.sequence ?? null,
    lastSequence: last?.sequence ?? null,
    terminalAttempt: terminal === null ? null : {
      attemptId: terminal.attemptId,
      generation: terminal.generation,
      outcome: terminal.outcome,
    },
  };
}

function executionResponseExpectationV1(
  operation: ExecutionResponseExpectationV1["operation"],
  input: ProcessExecutionAcquireInputV1,
): ExecutionResponseExpectationV1 {
  const trigger = input.attempt.trigger;
  return {
    operation,
    processId: input.attempt.processId,
    operationId: input.attempt.commitId,
    ownerInstanceId: input.ownerInstanceId,
    attemptId: input.attempt.attemptId,
    generation: input.attempt.generation,
    expiresAt: input.expiresAt,
    expectedProcessRevision: input.attempt.expectedProcessRevision,
    expectedTranscriptFrontier: input.attempt.expectedTranscriptFrontier,
    triggerEntryId: trigger.kind === "new_entry" ? trigger.entry.entryId : trigger.entryId,
    triggerSequence: trigger.kind === "new_entry" ? trigger.entry.sequence : trigger.sequence,
    publishesTriggerEntry: trigger.kind === "new_entry",
    startingCheckpoint: {
      checkpointId: input.attempt.startingCheckpoint.checkpointId,
      throughSequence: input.attempt.startingCheckpoint.throughSequence,
      workspaceId: input.attempt.startingCheckpoint.workspaceId,
      workspaceCheckpointId: input.attempt.startingCheckpoint.workspaceCheckpointId,
      workspaceGeneration: input.attempt.startingCheckpoint.workspaceGeneration,
    },
  };
}

function terminalResponseExpectationV1(
  operation: TerminalResponseExpectationV1["operation"],
  input: ProcessExecutionTerminalInputV1,
  program: TerminalResponseExpectationV1["program"] = null,
): TerminalResponseExpectationV1 {
  return {
    operation,
    lease: { ...input.lease },
    transcript: transcriptResponseExpectationV1(input.transcript),
    program,
  };
}

export function createProgramDataRepositoryWorkerResponseExpectationV1(
  request: ProgramDataRepositoryWorkerRequestV1,
): ProgramDataRepositoryWorkerResponseExpectationV1 {
  const method = request.method;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return { method, binding: { kind: "none" } };
  }
  if (method === "list_programs") {
    const before = request.input.before;
    return {
      method,
      binding: {
        kind: "catalog_list",
        input: {
          before: before === null ? null : { ...before },
          maximumBytes: request.input.maximumBytes,
        },
      },
    };
  }
  if (method === "list_accepted_program_decisions") {
    return {
      method,
      binding: { kind: "accepted_decision_list", input: { ...request.input } },
    };
  }
  if (
    method === "load_program" || method === "load_latest_accepted_program_decision" ||
    method === "load_workspace_continuation" || method === "load_program_network_access"
  ) {
    return { method, binding: { kind: "program", programId: request.programId } };
  }
  if (
    method === "load_program_revision" || method === "load_program_definition_revision"
  ) {
    return {
      method,
      binding: {
        kind: "program_revision",
        programId: request.programId,
        revision: request.revision,
      },
    };
  }
  if (method === "load_program_decision") {
    return {
      method,
      binding: {
        kind: "program_decision",
        programId: request.programId,
        proposalId: request.proposalId,
        programRevision: request.programRevision,
      },
    };
  }
  if (
    method === "create_program_with_process" ||
    method === "apply_program_revision_with_process_transcript" ||
    method === "decide_program_with_process_transcript"
  ) {
    const creating = method === "create_program_with_process";
    return {
      method,
      binding: {
        kind: "program_process",
        method,
        programId: creating
          ? request.input.catalog.program.programId
          : request.input.catalog.programId,
        processId: request.input.transcript.processId,
        programDefinition: creating ? { ...request.input.process.programDefinition } : null,
        createdAt: creating ? request.input.process.createdAt : null,
        transcript: transcriptResponseExpectationV1(request.input.transcript),
      },
    };
  }
  if (method === "create_process_with_workspace") {
    return {
      method,
      binding: {
        kind: "process_workspace_create",
        processId: request.input.process.processId,
        subjectProgramId: request.input.process.subjectProgramId,
        programDefinition: { ...request.input.process.programDefinition },
        createdAt: request.input.process.createdAt,
        workspace: { ...request.input.workspace },
        transcript: transcriptResponseExpectationV1(request.input.transcript),
      },
    };
  }
  if (method === "publish_program_definition_revision") {
    return {
      method,
      binding: {
        kind: "definition_publish",
        programId: request.definition.programId,
        revision: request.definition.revision,
      },
    };
  }
  if (
    method === "load_process_workspace_binding" || method === "load_process" ||
    method === "load_process_execution_lease" ||
    method === "load_translation_workset_head"
  ) {
    return { method, binding: { kind: "process", processId: request.processId } };
  }
  if (method === "list_process_summaries") {
    const before = request.input.before;
    return {
      method,
      binding: {
        kind: "process_summary_list",
        input: {
          subjectProgramId: request.input.subjectProgramId,
          before: before === null ? null : { ...before },
          maximumBytes: request.input.maximumBytes,
        },
      },
    };
  }
  if (
    method === "acquire_process_execution" ||
    method === "acquire_translation_workset_import_execution" ||
    method === "acquire_translation_batch_execution"
  ) {
    const input = method === "acquire_process_execution" ? request.input : request.input.execution;
    const operation = method === "acquire_process_execution"
      ? "execution_acquire"
      : method === "acquire_translation_workset_import_execution"
      ? "translation_workset_import_execution_acquire"
      : "translation_batch_execution_acquire";
    return {
      method,
      binding: {
        kind: "execution_acquire",
        input: executionResponseExpectationV1(operation, input),
      },
    };
  }
  if (
    method === "renew_process_execution_lease" ||
    method === "release_process_execution_lease"
  ) {
    return {
      method,
      binding: {
        kind: "execution_lease_mutation",
        method,
        lease: { ...request.input.lease },
        expiresAt: method === "renew_process_execution_lease" ? request.input.expiresAt : null,
        observedAt: request.input.observedAt,
      },
    };
  }
  if (method === "commit_process_execution_terminal") {
    return {
      method,
      binding: {
        kind: "execution_terminal",
        input: terminalResponseExpectationV1("execution_terminal", request.input),
      },
    };
  }
  if (method === "commit_program_revision_with_process_execution_terminal") {
    return {
      method,
      binding: {
        kind: "execution_terminal",
        input: terminalResponseExpectationV1("program_revision_terminal", request.input, {
          programId: request.input.catalog.programId,
          programRevision: request.input.catalog.program.revision,
          repositoryRevision: request.input.catalog.expectedRepositoryRevision,
        }),
      },
    };
  }
  if (method === "commit_translation_workset_finalize_with_process_execution_terminal") {
    return {
      method,
      binding: {
        kind: "translation_finalize_terminal",
        processId: request.input.workset.processId,
        operationId: request.input.workset.operationId,
        terminal: terminalResponseExpectationV1("execution_terminal", request.input.terminal),
      },
    };
  }
  if (method === "commit_translation_batch_candidate_with_process_execution_terminal") {
    return {
      method,
      binding: {
        kind: "translation_candidate_terminal",
        processId: request.input.workset.processId,
        operationId: request.input.workset.operationId,
        expectedWorksetRevision: request.input.workset.expectedWorksetRevision,
        expectedFirstPendingOrder: request.input.workset.expectedFirstPendingOrder,
        unitCount: request.input.workset.request.units.length,
        attemptId: request.input.workset.lease.attemptId,
        generation: request.input.workset.lease.generation,
        updatedAt: request.input.workset.updatedAt,
        terminal: terminalResponseExpectationV1("execution_terminal", request.input.terminal),
      },
    };
  }
  if (method === "query_process_operation") {
    const key = operationExpectationKeyV1(request.input);
    const receipt = request.input.operation === "execution_acquire"
      ? {
        kind: "execution" as const,
        input: executionResponseExpectationV1("execution_acquire", request.input.input),
      }
      : request.input.operation === "translation_workset_import_execution_acquire"
      ? {
        kind: "execution" as const,
        input: executionResponseExpectationV1(
          "translation_workset_import_execution_acquire",
          request.input.input.execution,
        ),
      }
      : request.input.operation === "translation_batch_execution_acquire"
      ? {
        kind: "execution" as const,
        input: executionResponseExpectationV1(
          "translation_batch_execution_acquire",
          request.input.input.execution,
        ),
      }
      : request.input.operation === "execution_terminal"
      ? {
        kind: "terminal" as const,
        input: terminalResponseExpectationV1("execution_terminal", request.input.input),
      }
      : {
        kind: "terminal" as const,
        input: terminalResponseExpectationV1(
          "program_revision_terminal",
          request.input.input,
          {
            programId: request.input.input.catalog.programId,
            programRevision: request.input.input.catalog.program.revision,
            repositoryRevision: request.input.input.catalog.expectedRepositoryRevision,
          },
        ),
      };
    return {
      method,
      binding: {
        kind: "process_operation_query",
        processId: key.processId,
        operationId: key.operationId,
        receipt,
      },
    };
  }
  if (
    method === "begin_translation_workset_import" ||
    method === "append_translation_workset_import" ||
    method === "accept_translation_batch_candidate" ||
    method === "reject_translation_batch_candidate"
  ) {
    return {
      method,
      binding: {
        kind: "workset_mutation",
        processId: request.input.processId,
        operationId: request.input.operationId,
        operation: method === "begin_translation_workset_import"
          ? "begin"
          : method === "append_translation_workset_import"
          ? "append"
          : method === "accept_translation_batch_candidate"
          ? "accept_candidate"
          : "reject_candidate",
        candidateId: method === "accept_translation_batch_candidate" ||
            method === "reject_translation_batch_candidate"
          ? request.input.candidateId
          : null,
      },
    };
  }
  if (method === "load_translation_batch_candidate") {
    return {
      method,
      binding: {
        kind: "translation_candidate",
        processId: request.processId,
        candidateId: request.candidateId,
      },
    };
  }
  if (
    method === "load_translation_workset_unit_page" ||
    method === "load_translation_workset_glossary_page"
  ) {
    return { method, binding: { kind: "workset_page", input: { ...request.input } } };
  }
  if (method === "query_translation_workset_operation") {
    return {
      method,
      binding: {
        kind: "workset_operation_query",
        processId: request.input.input.processId,
        operationId: request.input.input.operationId,
      },
    };
  }
  if (method === "load_transcript_page") {
    return {
      method,
      binding: {
        kind: "transcript_page",
        processId: request.input.processId,
        beforeSequence: request.input.beforeSequence,
        maximumBytes: request.input.maximumBytes,
      },
    };
  }
  if (method === "set_program_network_access") {
    return {
      method,
      binding: {
        kind: "network_mutation",
        programId: request.input.programId,
        enabled: request.input.enabled,
      },
    };
  }
  return method satisfies never;
}

interface ProgramDataRepositoryWorkerSuccessValueMapV1 {
  readonly initialize: null;
  readonly list_programs: ProgramCatalogListPageV1;
  readonly load_program: ProgramCatalogRecordV1 | null;
  readonly load_program_revision: PreviewProgramV1 | null;
  readonly load_program_decision: ProgramCatalogDecisionV1 | null;
  readonly load_latest_accepted_program_decision: ProgramCatalogAcceptedDecisionV1 | null;
  readonly list_accepted_program_decisions: ProgramCatalogAcceptedDecisionListPageV1;
  readonly load_workspace_continuation: ProgramCatalogContinuationV1 | null;
  readonly create_program_with_process: ProgramProcessCreateCompositeCommitResultV1;
  readonly create_process_with_workspace: ProcessWorkspaceCreateCompositeCommitResultV1;
  readonly load_process_workspace_binding: ProcessWorkspaceBindingV1 | null;
  readonly apply_program_revision_with_process_transcript: ProgramProcessCompositeCommitResultV1;
  readonly decide_program_with_process_transcript: ProgramProcessCompositeCommitResultV1;
  readonly publish_program_definition_revision: ProgramDefinitionPublishResultV1;
  readonly load_program_definition_revision: ProgramDefinitionRevisionV1 | null;
  readonly load_process: ProcessHeadV1 | null;
  readonly list_process_summaries: ProcessSummaryPageV1;
  readonly acquire_process_execution: ProcessExecutionAcquireResultV1;
  readonly acquire_translation_workset_import_execution:
    TranslationWorksetImportExecutionAcquireResultV1;
  readonly acquire_translation_batch_execution: TranslationBatchExecutionAcquireResultV1;
  readonly renew_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly release_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly load_process_execution_lease: ProcessExecutionLeaseV1 | null;
  readonly commit_process_execution_terminal: ProcessExecutionTerminalResultV1;
  readonly commit_program_revision_with_process_execution_terminal:
    ProgramProcessExecutionCompositeCommitResultV1;
  readonly query_process_operation: ProcessOperationReceiptQueryResultV1;
  readonly begin_translation_workset_import: TranslationWorksetMutationResultV1;
  readonly append_translation_workset_import: TranslationWorksetMutationResultV1;
  readonly commit_translation_workset_finalize_with_process_execution_terminal:
    TranslationWorksetFinalizeExecutionCompositeCommitResultV1;
  readonly commit_translation_batch_candidate_with_process_execution_terminal:
    TranslationBatchCandidateExecutionCompositeCommitResultV1;
  readonly load_translation_workset_head: TranslationWorksetHeadV1 | null;
  readonly load_translation_batch_candidate: TranslationBatchCandidateRecordV1 | null;
  readonly accept_translation_batch_candidate: TranslationWorksetMutationResultV1;
  readonly reject_translation_batch_candidate: TranslationWorksetMutationResultV1;
  readonly load_translation_workset_unit_page: TranslationWorksetPageResultV1<
    TranslationWorksetUnitRecordV1
  >;
  readonly load_translation_workset_glossary_page: TranslationWorksetPageResultV1<
    TranslationWorksetGlossaryEntryV1
  >;
  readonly query_translation_workset_operation: TranslationWorksetOperationQueryResultV1;
  readonly load_transcript_page: TranscriptPageV1 | null;
  readonly load_program_network_access: ProgramNetworkAccessV1 | null;
  readonly set_program_network_access: ProgramNetworkAccessMutationResultV1;
  readonly reset: null;
  readonly dispose: null;
}

export type ProgramDataRepositoryWorkerSuccessV1 = {
  readonly [TMethod in ProgramDataRepositoryWorkerMethodV1]: {
    readonly kind: "success";
    readonly method: TMethod;
    readonly value: ProgramDataRepositoryWorkerSuccessValueMapV1[TMethod];
  };
}[ProgramDataRepositoryWorkerMethodV1];

export interface ProgramDataRepositoryWorkerFailureV1 {
  readonly kind: "failure";
  readonly method: ProgramDataRepositoryWorkerMethodV1;
  readonly code: ProgramDataRepositoryFailureCodeV1;
  readonly operation: ProgramDataRepositoryOperationV1;
}

export interface ProgramDataRepositoryWorkerResponseEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: string;
  readonly record: ProgramDataRepositoryWorkerSuccessV1 | ProgramDataRepositoryWorkerFailureV1;
}

export type ProgramDataRepositoryWorkerAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

type ExactRecordV1 = Readonly<Record<string, unknown>>;
const textEncoderV1 = new TextEncoder();
const requestIdPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function admittedV1<TValue>(
  value: TValue,
): ProgramDataRepositoryWorkerAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function rejectedV1<TValue>(
  path: string,
): ProgramDataRepositoryWorkerAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function requestIdV1(value: unknown): value is string {
  return typeof value === "string" && requestIdPatternV1.test(value);
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && requestIdPatternV1.test(value);
}

function nonNegativeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function failureCodeV1(value: unknown): value is ProgramDataRepositoryFailureCodeV1 {
  return value === "unavailable" || value === "database_newer" ||
    value === "upgrade_blocked" || value === "quota_exceeded" ||
    value === "transaction_aborted" || value === "request_failed" ||
    value === "schema_invalid" || value === "disposed" || value === "wire_invalid" ||
    value === "outcome_unknown" || value === "page_budget_too_small";
}

function cloneExactV1<TValue>(value: unknown, clone: (value: TValue) => TValue): TValue | null {
  try {
    const cloned = clone(value as TValue);
    return exactDataEqualV1(value, cloned) ? cloned : null;
  } catch {
    return null;
  }
}

function exactDataEqualV1(left: unknown, right: unknown): boolean {
  const work: [unknown, unknown][] = [[left, right]];
  const seen = new WeakSet<Record<PropertyKey, unknown>>();
  while (work.length > 0) {
    const [candidate, normalized] = work.pop() as [unknown, unknown];
    if (Object.is(candidate, normalized)) continue;
    if (
      candidate === null || normalized === null || typeof candidate !== "object" ||
      typeof normalized !== "object" || Array.isArray(candidate) !== Array.isArray(normalized)
    ) return false;
    const candidateObject = candidate as Record<PropertyKey, unknown>;
    if (seen.has(candidateObject)) return false;
    seen.add(candidateObject);
    if (Array.isArray(candidate) && Array.isArray(normalized)) {
      if (candidate.length !== normalized.length) return false;
      for (let index = 0; index < candidate.length; index += 1) {
        work.push([candidate[index], normalized[index]]);
      }
      continue;
    }
    const candidateRecord = exactRecordV1(candidate, Object.keys(normalized));
    if (candidateRecord === null) return false;
    for (const key of Object.keys(normalized)) {
      work.push([candidateRecord[key], (normalized as Record<string, unknown>)[key]]);
    }
  }
  return true;
}

function compareCatalogPositionV1(
  left: { readonly updatedAt: number; readonly programId: string },
  right: { readonly updatedAt: number; readonly programId: string },
): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
  if (left.programId === right.programId) return 0;
  return left.programId > right.programId ? -1 : 1;
}

function compareProcessPositionV1(
  left: { readonly updatedAt: number; readonly processId: string },
  right: { readonly updatedAt: number; readonly processId: string },
): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
  if (left.processId === right.processId) return 0;
  return left.processId > right.processId ? -1 : 1;
}

function acceptedDecisionMatchesProgramV1(
  decision: ProgramCatalogAcceptedDecisionV1,
  programId: string,
): boolean {
  return decision.snapshot.programId === programId &&
    decision.snapshot.proposalId === decision.proposalId &&
    decision.snapshot.programRevision === decision.programRevision;
}

function catalogRecordMatchesProgramV1(
  record: ProgramCatalogRecordV1,
  programId: string,
): boolean {
  return record.head.programId === programId &&
    (record.latestDecision?.status !== "accepted" ||
      acceptedDecisionMatchesProgramV1(record.latestDecision, programId));
}

function normalizeExactV1<TValue>(
  value: unknown,
  normalize: (value: TValue) => TValue,
): TValue | null {
  return cloneExactV1(value, normalize);
}

function normalizeProgramIdWireV1(value: unknown): string | null {
  try {
    return normalizeProgramIdV1(value as string);
  } catch {
    return null;
  }
}

function normalizeCatalogProgramIdWireV1(value: unknown): string | null {
  try {
    return normalizeProgramCatalogProgramIdV1(value as string);
  } catch {
    return null;
  }
}

function normalizeCatalogProposalIdWireV1(value: unknown): string | null {
  try {
    return normalizeProgramCatalogProposalIdV1(value as string);
  } catch {
    return null;
  }
}

function normalizeCatalogRevisionWireV1(value: unknown): number | null {
  try {
    return normalizeProgramCatalogRevisionV1(value as number);
  } catch {
    return null;
  }
}

function normalizeProcessIdWireV1(value: unknown): string | null {
  try {
    return normalizeProcessIdV1(value as string);
  } catch {
    return null;
  }
}

function normalizeRevisionWireV1(value: unknown): number | null {
  try {
    return normalizeRevisionV1(value as number);
  } catch {
    return null;
  }
}

function admitRequestRecordV1(
  value: unknown,
): ProgramDataRepositoryWorkerAdmissionResultV1<ProgramDataRepositoryWorkerRequestV1> {
  const unit = exactRecordV1(value, ["method"]);
  if (
    unit !== null &&
    (unit.method === "initialize" || unit.method === "reset" || unit.method === "dispose")
  ) return admittedV1({ method: unit.method });

  const programLoad = exactRecordV1(value, ["method", "programId"]);
  if (
    programLoad !== null &&
    (programLoad.method === "load_program" ||
      programLoad.method === "load_latest_accepted_program_decision" ||
      programLoad.method === "load_workspace_continuation" ||
      programLoad.method === "load_program_network_access")
  ) {
    const programId = normalizeCatalogProgramIdWireV1(programLoad.programId);
    return programId === null
      ? rejectedV1("/record/programId")
      : admittedV1({ method: programLoad.method, programId });
  }

  const processLoad = exactRecordV1(value, ["method", "processId"]);
  if (
    processLoad !== null &&
    (processLoad.method === "load_process" ||
      processLoad.method === "load_process_execution_lease" ||
      processLoad.method === "load_process_workspace_binding" ||
      processLoad.method === "load_translation_workset_head")
  ) {
    const processId = normalizeProcessIdWireV1(processLoad.processId);
    return processId === null
      ? rejectedV1("/record/processId")
      : admittedV1({ method: processLoad.method, processId });
  }

  const translationCandidateLoad = exactRecordV1(value, [
    "method",
    "processId",
    "candidateId",
  ]);
  if (
    translationCandidateLoad !== null &&
    translationCandidateLoad.method === "load_translation_batch_candidate"
  ) {
    const processId = normalizeProcessIdWireV1(translationCandidateLoad.processId);
    return processId === null || !identifierV1(translationCandidateLoad.candidateId)
      ? rejectedV1("/record")
      : admittedV1({
        method: "load_translation_batch_candidate",
        processId,
        candidateId: translationCandidateLoad.candidateId,
      });
  }

  const revisionLoad = exactRecordV1(value, ["method", "programId", "revision"]);
  if (
    revisionLoad !== null &&
    (revisionLoad.method === "load_program_revision" ||
      revisionLoad.method === "load_program_definition_revision")
  ) {
    const programId = revisionLoad.method === "load_program_revision"
      ? normalizeCatalogProgramIdWireV1(revisionLoad.programId)
      : normalizeProgramIdWireV1(revisionLoad.programId);
    const revision = revisionLoad.method === "load_program_revision"
      ? normalizeCatalogRevisionWireV1(revisionLoad.revision)
      : normalizeRevisionWireV1(revisionLoad.revision);
    return programId === null || revision === null
      ? rejectedV1("/record")
      : admittedV1({ method: revisionLoad.method, programId, revision });
  }

  const decisionLoad = exactRecordV1(value, [
    "method",
    "programId",
    "proposalId",
    "programRevision",
  ]);
  if (decisionLoad !== null && decisionLoad.method === "load_program_decision") {
    const programId = normalizeCatalogProgramIdWireV1(decisionLoad.programId);
    const proposalId = normalizeCatalogProposalIdWireV1(decisionLoad.proposalId);
    const programRevision = normalizeCatalogRevisionWireV1(decisionLoad.programRevision);
    return programId === null || proposalId === null || programRevision === null
      ? rejectedV1("/record")
      : admittedV1({ method: "load_program_decision", programId, proposalId, programRevision });
  }

  const definition = exactRecordV1(value, ["method", "definition"]);
  if (definition !== null && definition.method === "publish_program_definition_revision") {
    const admitted = admitProgramDefinitionRevisionV1(definition.definition);
    return admitted.kind === "rejected"
      ? rejectedV1(`/record/definition${admitted.path}`)
      : admittedV1({ method: definition.method, definition: admitted.value });
  }

  const call = exactRecordV1(value, ["method", "input"]);
  if (call === null) return rejectedV1("/record");
  let normalized: unknown = null;
  if (call.method === "list_programs") {
    const row = exactRecordV1(call.input, ["before", "maximumBytes"]);
    const cursor = row?.before === null
      ? null
      : exactRecordV1(row?.before, ["updatedAt", "programId"]);
    normalized = row !== null && (row.before === null || cursor !== null)
      ? normalizeExactV1(call.input, normalizeProgramCatalogListInputV1)
      : null;
  } else if (call.method === "list_accepted_program_decisions") {
    normalized = normalizeExactV1(call.input, normalizeProgramCatalogAcceptedDecisionListInputV1);
  } else if (call.method === "create_program_with_process") {
    normalized = normalizeExactV1(call.input, normalizeProgramProcessCreateBundleInputV1);
  } else if (call.method === "create_process_with_workspace") {
    normalized = normalizeExactV1(call.input, normalizeProcessWorkspaceCreateBundleInputV1);
  } else if (call.method === "apply_program_revision_with_process_transcript") {
    normalized = normalizeExactV1(call.input, normalizeProgramProcessRevisionBundleInputV1);
  } else if (call.method === "decide_program_with_process_transcript") {
    normalized = normalizeExactV1(call.input, normalizeProgramProcessDecisionBundleInputV1);
  } else if (call.method === "list_process_summaries") {
    normalized = normalizeExactV1(call.input, normalizeProcessSummaryListInputV1);
  } else if (call.method === "acquire_process_execution") {
    normalized = normalizeExactV1(call.input, normalizeProcessExecutionAcquireInputV1);
  } else if (call.method === "acquire_translation_workset_import_execution") {
    normalized = normalizeExactV1(
      call.input,
      normalizeTranslationWorksetImportExecutionAcquireInputV1,
    );
  } else if (call.method === "acquire_translation_batch_execution") {
    normalized = normalizeExactV1(call.input, normalizeTranslationBatchExecutionAcquireInputV1);
  } else if (call.method === "renew_process_execution_lease") {
    normalized = normalizeExactV1(call.input, normalizeProcessExecutionLeaseRenewInputV1);
  } else if (call.method === "release_process_execution_lease") {
    normalized = normalizeExactV1(call.input, normalizeProcessExecutionLeaseReleaseInputV1);
  } else if (call.method === "commit_process_execution_terminal") {
    normalized = normalizeExactV1(call.input, normalizeProcessExecutionTerminalInputV1);
  } else if (call.method === "commit_program_revision_with_process_execution_terminal") {
    normalized = normalizeExactV1(
      call.input,
      normalizeProgramProcessExecutionRevisionBundleInputV1,
    );
  } else if (call.method === "query_process_operation") {
    const expectation = exactRecordV1(call.input, ["operation", "input"]);
    if (expectation?.operation === "execution_acquire") {
      const input = normalizeExactV1(
        expectation.input,
        normalizeProcessExecutionAcquireInputV1,
      );
      normalized = input === null ? null : { operation: expectation.operation, input };
    } else if (expectation?.operation === "translation_workset_import_execution_acquire") {
      const input = normalizeExactV1(
        expectation.input,
        normalizeTranslationWorksetImportExecutionAcquireInputV1,
      );
      normalized = input === null ? null : { operation: expectation.operation, input };
    } else if (expectation?.operation === "translation_batch_execution_acquire") {
      const input = normalizeExactV1(
        expectation.input,
        normalizeTranslationBatchExecutionAcquireInputV1,
      );
      normalized = input === null ? null : { operation: expectation.operation, input };
    } else if (expectation?.operation === "execution_terminal") {
      const input = normalizeExactV1(
        expectation.input,
        normalizeProcessExecutionTerminalInputV1,
      );
      normalized = input === null ? null : { operation: expectation.operation, input };
    } else if (expectation?.operation === "program_revision_terminal") {
      const input = normalizeExactV1(
        expectation.input,
        normalizeProgramProcessExecutionRevisionBundleInputV1,
      );
      normalized = input === null ? null : { operation: expectation.operation, input };
    }
  } else if (call.method === "begin_translation_workset_import") {
    normalized = normalizeExactV1(call.input, normalizeTranslationWorksetBeginImportInputV1);
  } else if (call.method === "append_translation_workset_import") {
    normalized = normalizeExactV1(call.input, normalizeTranslationWorksetAppendImportInputV1);
  } else if (
    call.method === "commit_translation_workset_finalize_with_process_execution_terminal"
  ) {
    const row = exactRecordV1(call.input, ["workset", "terminal"]);
    const workset = row === null
      ? null
      : normalizeExactV1(row.workset, normalizeTranslationWorksetFinalizeImportInputV1);
    const terminal = row === null
      ? null
      : normalizeExactV1(row.terminal, normalizeProcessExecutionTerminalInputV1);
    if (workset !== null && terminal !== null) {
      try {
        normalized = normalizeTranslationWorksetFinalizeExecutionBundleInputV1({
          workset,
          terminal,
        });
      } catch {
        normalized = null;
      }
    }
  } else if (
    call.method === "commit_translation_batch_candidate_with_process_execution_terminal"
  ) {
    const row = exactRecordV1(call.input, ["workset", "terminal"]);
    const workset = row === null
      ? null
      : normalizeExactV1(row.workset, normalizeTranslationBatchCandidatePublishInputV1);
    const terminal = row === null
      ? null
      : normalizeExactV1(row.terminal, normalizeProcessExecutionCompletedTerminalInputV1);
    if (workset !== null && terminal !== null) {
      try {
        normalized = normalizeTranslationBatchCandidateExecutionBundleInputV1({
          workset,
          terminal,
        });
      } catch {
        normalized = null;
      }
    }
  } else if (call.method === "accept_translation_batch_candidate") {
    normalized = normalizeExactV1(
      call.input,
      normalizeTranslationBatchCandidateAcceptInputV1,
    );
  } else if (call.method === "reject_translation_batch_candidate") {
    normalized = normalizeExactV1(
      call.input,
      normalizeTranslationBatchCandidateRejectInputV1,
    );
  } else if (
    call.method === "load_translation_workset_unit_page" ||
    call.method === "load_translation_workset_glossary_page"
  ) {
    normalized = normalizeExactV1(call.input, normalizeTranslationWorksetPageRequestV1);
  } else if (call.method === "query_translation_workset_operation") {
    normalized = normalizeExactV1(call.input, normalizeTranslationWorksetOperationExpectationV1);
  } else if (call.method === "load_transcript_page") {
    normalized = normalizeExactV1(call.input, normalizeTranscriptPageRequestV1);
  } else if (call.method === "set_program_network_access") {
    normalized = normalizeExactV1(call.input, normalizeProgramNetworkAccessMutationV1);
  } else {
    return rejectedV1("/record/method");
  }
  return normalized === null ? rejectedV1("/record/input") : admittedV1(
    { method: call.method, input: normalized } as ProgramDataRepositoryWorkerRequestV1,
  );
}

export function admitProgramDataRepositoryWorkerRequestEnvelopeV1(
  value: unknown,
): ProgramDataRepositoryWorkerAdmissionResultV1<ProgramDataRepositoryWorkerRequestEnvelopeV1> {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV1("/");
  if (envelope.revision !== 1) return rejectedV1("/revision");
  if (envelope.kind !== "rpc_request") return rejectedV1("/kind");
  if (!requestIdV1(envelope.requestId)) return rejectedV1("/requestId");
  const record = admitRequestRecordV1(envelope.record);
  if (record.kind === "rejected") return record;
  return admittedV1({
    revision: 1,
    kind: "rpc_request",
    requestId: envelope.requestId,
    record: record.value,
  });
}

function cloneCatalogSummaryV1(value: unknown): ProgramCatalogSummaryV1 | null {
  const row = exactRecordV1(value, [
    "programId",
    "name",
    "kind",
    "programRevision",
    "proposalStatus",
    "repositoryRevision",
    "updatedAt",
  ]);
  const programId = normalizeCatalogProgramIdWireV1(row?.programId);
  if (
    row === null || programId === null || typeof row.name !== "string" ||
    row.name.trim() !== row.name || row.name.length === 0 ||
    textEncoderV1.encode(row.name).byteLength > 256 ||
    (row.kind !== "translation" && row.kind !== "writing" && row.kind !== "roleplay" &&
      row.kind !== "general") ||
    !positiveIntegerV1(row.programRevision) ||
    (row.proposalStatus !== "pending" && row.proposalStatus !== "accepted" &&
      row.proposalStatus !== "rejected") ||
    !positiveIntegerV1(row.repositoryRevision) || !nonNegativeIntegerV1(row.updatedAt)
  ) return null;
  return {
    programId,
    name: row.name,
    kind: row.kind,
    programRevision: row.programRevision,
    proposalStatus: row.proposalStatus,
    repositoryRevision: row.repositoryRevision,
    updatedAt: row.updatedAt,
  };
}

function cloneCatalogListPageV1(
  value: unknown,
  input: ProgramCatalogListInputV1,
): ProgramCatalogListPageV1 | null {
  const row = exactRecordV1(value, ["summaries", "nextCursor"]);
  if (row === null || !Array.isArray(row.summaries)) return null;
  const summaries: ProgramCatalogSummaryV1[] = [];
  let byteLength = 0;
  let previous: ProgramCatalogSummaryV1 | null = null;
  for (const candidate of row.summaries) {
    const summary = cloneCatalogSummaryV1(candidate);
    if (
      summary === null ||
      input.before !== null && compareCatalogPositionV1(summary, input.before) <= 0 ||
      previous !== null && compareCatalogPositionV1(previous, summary) >= 0
    ) return null;
    byteLength += textEncoderV1.encode(JSON.stringify(summary)).byteLength;
    if (byteLength > input.maximumBytes) return null;
    summaries.push(summary);
    previous = summary;
  }
  let nextCursor: ProgramCatalogListPageV1["nextCursor"] = null;
  if (row.nextCursor !== null) {
    const cursorInput = normalizeExactV1(
      { before: row.nextCursor, maximumBytes: input.maximumBytes },
      normalizeProgramCatalogListInputV1,
    );
    if (cursorInput === null) return null;
    nextCursor = cursorInput.before;
  }
  const last = summaries.at(-1);
  if (
    nextCursor !== null &&
    (last === undefined || nextCursor.updatedAt !== last.updatedAt ||
      nextCursor.programId !== last.programId)
  ) return null;
  return { summaries, nextCursor };
}

function cloneAcceptedDecisionListPageV1(
  value: unknown,
  input: ProgramCatalogAcceptedDecisionListInputV1,
): ProgramCatalogAcceptedDecisionListPageV1 | null {
  const row = exactRecordV1(value, ["decisions", "nextCursor"]);
  if (row === null || !Array.isArray(row.decisions)) return null;
  const decisions: ProgramCatalogAcceptedDecisionV1[] = [];
  let byteLength = 0;
  let previousRevision: number | null = null;
  for (const candidate of row.decisions) {
    const decision = cloneExactV1(candidate, cloneProgramCatalogDecisionV1);
    if (
      decision?.status !== "accepted" ||
      !acceptedDecisionMatchesProgramV1(decision, input.programId) ||
      input.beforeProgramRevision !== null &&
        decision.programRevision >= input.beforeProgramRevision ||
      previousRevision !== null && decision.programRevision >= previousRevision
    ) return null;
    byteLength += textEncoderV1.encode(JSON.stringify(decision)).byteLength;
    if (byteLength > input.maximumBytes) return null;
    decisions.push(decision);
    previousRevision = decision.programRevision;
  }
  if (row.nextCursor !== null && !positiveIntegerV1(row.nextCursor)) return null;
  if (
    row.nextCursor !== null &&
    (input.beforeProgramRevision !== null && row.nextCursor >= input.beforeProgramRevision ||
      previousRevision !== null && row.nextCursor > previousRevision)
  ) return null;
  return { decisions, nextCursor: row.nextCursor as number | null };
}

function cloneDefinitionPublishResultV1(
  value: unknown,
  expected: { readonly programId: string; readonly revision: number },
): ProgramDefinitionPublishResultV1 | null {
  const row = exactRecordV1(value, ["kind", rowKindKeyV1(value)]);
  if (row === null) return null;
  if (row.kind === "committed" || row.kind === "unchanged") {
    const definition = admitProgramDefinitionRevisionV1(row.definition);
    return definition.kind === "rejected" ||
        definition.value.programId !== expected.programId ||
        definition.value.revision !== expected.revision
      ? null
      : { kind: row.kind, definition: definition.value };
  }
  if (row.kind === "conflict") {
    const current = admitProgramDefinitionRevisionV1(row.current);
    return current.kind === "rejected" || current.value.programId !== expected.programId ||
        current.value.revision !== expected.revision
      ? null
      : { kind: "conflict", current: current.value };
  }
  return null;
}

function rowKindKeyV1(value: unknown): string {
  const kind = exactRecordV1(value, ["kind", "definition"]);
  return kind !== null ? "definition" : "current";
}

function cloneProgramProcessCompositeResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "program_process" }
  >,
): ProgramProcessCreateCompositeCommitResultV1 | null {
  const { programId, processId } = expectation;
  const result = exactRecordV1(value, [
    "kind",
    "record",
    "process",
    "entries",
    "terminalAttemptReceipt",
  ]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const record = cloneExactV1(result.record, cloneProgramCatalogRecordV1);
    const process = admitProcessHeadV1(result.process);
    if (
      record === null || !catalogRecordMatchesProgramV1(record, programId) ||
      process.kind === "rejected" || process.value.processId !== processId ||
      process.value.subjectProgramId !== programId || !Array.isArray(result.entries)
    ) return null;
    if (
      expectation.method === "create_program_with_process" &&
      (process.value.createdAt !== expectation.createdAt ||
        !exactDataEqualV1(process.value.programDefinition, expectation.programDefinition))
    ) return null;
    const entries = responseEntriesV1(result.entries, expectation.transcript);
    if (entries === null) return null;
    const receipt = result.terminalAttemptReceipt === null
      ? null
      : admitProcessTerminalAttemptReceiptV1(result.terminalAttemptReceipt);
    if (receipt !== null && receipt.kind === "rejected") return null;
    const terminalAttemptReceipt = receipt?.kind === "admitted" ? receipt.value : null;
    if (
      !exactDataEqualV1(terminalAttemptReceipt, expectation.transcript.terminalAttempt)
    ) return null;
    return {
      kind: result.kind,
      record,
      process: process.value,
      entries,
      terminalAttemptReceipt,
    };
  }
  const conflict = exactRecordV1(value, ["kind", "currentProgram", "currentProcess"]);
  if (conflict !== null && conflict.kind === "conflict") {
    const currentProgram = conflict.currentProgram === null
      ? null
      : cloneExactV1(conflict.currentProgram, cloneProgramCatalogRecordV1);
    const currentProcess = conflict.currentProcess === null
      ? null
      : admitProcessHeadV1(conflict.currentProcess);
    if (
      conflict.currentProgram !== null &&
        (currentProgram === null || !catalogRecordMatchesProgramV1(currentProgram, programId)) ||
      conflict.currentProcess !== null &&
        (currentProcess === null || currentProcess.kind === "rejected" ||
          currentProcess.value.processId !== processId)
    ) return null;
    return {
      kind: "conflict",
      currentProgram,
      currentProcess: currentProcess?.kind === "admitted" ? currentProcess.value : null,
    };
  }
  const missing = exactRecordV1(value, ["kind", "programDefinition"]);
  if (
    expectation.method !== "create_program_with_process" || missing === null ||
    missing.kind !== "program_definition_missing"
  ) return null;
  const definition = exactRecordV1(missing.programDefinition, ["programId", "revision"]);
  const missingProgramId = normalizeProgramIdWireV1(definition?.programId);
  const missingRevision = normalizeRevisionWireV1(definition?.revision);
  return missingProgramId === null || missingRevision === null ||
      missingProgramId !== expectation.programDefinition?.programId ||
      missingRevision !== expectation.programDefinition.revision
    ? null
    : {
      kind: "program_definition_missing",
      programDefinition: { programId: missingProgramId, revision: missingRevision },
    };
}

function cloneProcessWorkspaceCreateResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "process_workspace_create" }
  >,
): ProcessWorkspaceCreateCompositeCommitResultV1 | null {
  const { processId } = expectation;
  const result = exactRecordV1(value, ["kind", "process", "workspace", "entries"]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const process = admitProcessHeadV1(result.process);
    const workspace = cloneExactV1(result.workspace, cloneProcessWorkspaceBindingV1);
    if (
      process.kind === "rejected" || process.value.processId !== processId ||
      !exactDataEqualV1(
        process.value.programDefinition,
        expectation.programDefinition,
      ) ||
      process.value.subjectProgramId !== expectation.subjectProgramId ||
      process.value.createdAt !== expectation.createdAt ||
      workspace === null || workspace.processId !== processId ||
      !exactDataEqualV1(workspace, expectation.workspace) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries = responseEntriesV1(result.entries, expectation.transcript);
    return entries === null
      ? null
      : { kind: result.kind, process: process.value, workspace, entries };
  }
  const conflict = exactRecordV1(value, ["kind", "currentProcess", "currentWorkspace"]);
  if (conflict?.kind === "conflict") {
    const currentProcess = conflict.currentProcess === null
      ? null
      : admitProcessHeadV1(conflict.currentProcess);
    const currentWorkspace = conflict.currentWorkspace === null
      ? null
      : cloneExactV1(conflict.currentWorkspace, cloneProcessWorkspaceBindingV1);
    if (
      currentProcess !== null &&
        (currentProcess.kind === "rejected" || currentProcess.value.processId !== processId) ||
      conflict.currentWorkspace !== null &&
        (currentWorkspace === null || currentWorkspace.processId !== processId)
    ) return null;
    return {
      kind: "conflict",
      currentProcess: currentProcess?.kind === "admitted" ? currentProcess.value : null,
      currentWorkspace,
    };
  }
  const missing = exactRecordV1(value, ["kind", "programDefinition"]);
  if (missing?.kind === "program_definition_missing") {
    const definition = exactRecordV1(missing.programDefinition, ["programId", "revision"]);
    const programId = normalizeProgramIdWireV1(definition?.programId);
    const revision = normalizeRevisionWireV1(definition?.revision);
    return programId === expectation.programDefinition.programId &&
        revision === expectation.programDefinition.revision
      ? { kind: "program_definition_missing", programDefinition: { programId, revision } }
      : null;
  }
  const subjectMissing = exactRecordV1(value, ["kind", "subjectProgramId"]);
  if (subjectMissing?.kind === "subject_program_missing") {
    const subjectProgramId = normalizeProgramIdWireV1(subjectMissing.subjectProgramId);
    return subjectProgramId !== null &&
        subjectProgramId === expectation.subjectProgramId
      ? { kind: "subject_program_missing", subjectProgramId }
      : null;
  }
  const volumeOwned = exactRecordV1(value, ["kind", "owner"]);
  if (volumeOwned?.kind !== "workspace_volume_owned") return null;
  const owner = cloneExactV1(volumeOwned.owner, cloneProcessWorkspaceBindingV1);
  return owner !== null && owner.volumeId === expectation.workspace.volumeId &&
      owner.processId !== processId
    ? { kind: "workspace_volume_owned", owner }
    : null;
}

function cloneExecutionLeaseV1(value: unknown): ProcessExecutionLeaseV1 | null {
  return cloneExactV1(value, normalizeProcessExecutionLeaseV1);
}

function executionLeaseIdentityMatchesV1(
  lease: ProcessExecutionLeaseV1,
  expected: ProcessExecutionLeaseV1,
): boolean {
  return lease.processId === expected.processId &&
    lease.ownerInstanceId === expected.ownerInstanceId &&
    lease.attemptId === expected.attemptId &&
    lease.generation === expected.generation;
}

function operationExpectationKeyV1(
  expectation: ProgramDataProcessOperationExpectationV1,
): { readonly processId: string; readonly operationId: string } {
  if (expectation.operation === "execution_acquire") {
    return {
      processId: expectation.input.attempt.processId,
      operationId: expectation.input.attempt.commitId,
    };
  }
  if (
    expectation.operation === "translation_workset_import_execution_acquire" ||
    expectation.operation === "translation_batch_execution_acquire"
  ) {
    return {
      processId: expectation.input.execution.attempt.processId,
      operationId: expectation.input.execution.attempt.commitId,
    };
  }
  return {
    processId: expectation.input.transcript.processId,
    operationId: expectation.input.transcript.commitId,
  };
}

function responseEntriesV1(
  value: unknown,
  expectation: TranscriptResponseExpectationV1,
): readonly TranscriptEntryV1[] | null {
  if (!Array.isArray(value) || value.length !== expectation.entryCount) return null;
  const entries: TranscriptEntryV1[] = [];
  for (const candidate of value) {
    const entry = admitTranscriptEntryV1(candidate);
    if (entry.kind === "rejected" || entry.value.processId !== expectation.processId) return null;
    entries.push(entry.value);
  }
  return (entries.at(0)?.sequence ?? null) === expectation.firstSequence &&
      (entries.at(-1)?.sequence ?? null) === expectation.lastSequence
    ? entries
    : null;
}

function operationReceiptMatchesExecutionResponseV1(
  receipt: ProcessOperationReceiptV1,
  expectation: ExecutionResponseExpectationV1,
): boolean {
  const expectedLease: ProcessExecutionLeaseV1 = {
    processId: expectation.processId,
    ownerInstanceId: expectation.ownerInstanceId,
    attemptId: expectation.attemptId,
    generation: expectation.generation,
    expiresAt: expectation.expiresAt,
  };
  return receipt.processId === expectation.processId &&
    receipt.operationId === expectation.operationId &&
    receipt.operation === expectation.operation &&
    receipt.attemptId === expectation.attemptId &&
    receipt.generation === expectation.generation &&
    receipt.processRevision === expectation.expectedProcessRevision + 1 &&
    receipt.transcriptFrontier === expectation.expectedTranscriptFrontier +
        (expectation.publishesTriggerEntry ? 1 : 0) &&
    receipt.terminalOutcome === null && receipt.programId === null &&
    receipt.lease !== null && exactDataEqualV1(receipt.lease, expectedLease);
}

function operationReceiptMatchesTerminalResponseV1(
  receipt: ProcessOperationReceiptV1,
  expectation: TerminalResponseExpectationV1,
): boolean {
  const terminal = expectation.transcript.terminalAttempt;
  if (
    terminal === null || receipt.processId !== expectation.transcript.processId ||
    receipt.operationId !== expectation.transcript.operationId ||
    receipt.operation !== expectation.operation || receipt.attemptId !== terminal.attemptId ||
    receipt.generation !== terminal.generation ||
    receipt.processRevision !== expectation.transcript.expectedProcessRevision + 1 ||
    receipt.transcriptFrontier !== expectation.transcript.lastSequence ||
    receipt.terminalOutcome !== terminal.outcome || receipt.lease !== null
  ) return false;
  const program = expectation.program;
  return program === null ? receipt.programId === null : receipt.programId === program.programId &&
    receipt.programRevision === program.programRevision &&
    receipt.repositoryRevision === program.repositoryRevision + 1;
}

function cloneExecutionAcquireResultV1(
  value: unknown,
  expectation: ExecutionResponseExpectationV1,
):
  | ProcessExecutionAcquireResultV1
  | TranslationWorksetImportExecutionAcquireResultV1
  | null {
  const result = exactRecordV1(value, [
    "kind",
    "process",
    "entries",
    "lease",
    "operationReceipt",
  ]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const process = admitProcessHeadV1(result.process);
    const lease = cloneExecutionLeaseV1(result.lease);
    const receipt = cloneExactV1(result.operationReceipt, normalizeProcessOperationReceiptV1);
    const activeAttempt = process.kind === "admitted" ? process.value.activeAttempt : null;
    if (
      process.kind === "rejected" || lease === null || receipt === null ||
      process.value.processId !== expectation.processId ||
      !operationReceiptMatchesExecutionResponseV1(receipt, expectation) || receipt.lease === null ||
      !executionLeaseIdentityMatchesV1(lease, receipt.lease) ||
      lease.expiresAt < receipt.lease.expiresAt ||
      process.value.revision !== receipt.processRevision ||
      process.value.transcriptFrontier !== receipt.transcriptFrontier ||
      process.value.status !== "active" ||
      activeAttempt?.attemptId !== expectation.attemptId ||
      activeAttempt.generation !== expectation.generation ||
      activeAttempt.triggerEntryId !== expectation.triggerEntryId ||
      activeAttempt.triggerSequence !== expectation.triggerSequence ||
      !exactDataEqualV1(activeAttempt.startingCheckpoint, expectation.startingCheckpoint) ||
      !exactDataEqualV1(process.value.checkpoint, expectation.startingCheckpoint) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of result.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== expectation.processId) {
        return null;
      }
      entries.push(entry.value);
    }
    return entries.length === (expectation.publishesTriggerEntry ? 1 : 0) &&
        (entries.length === 0 ||
          entries[0]?.entryId === expectation.triggerEntryId &&
            entries[0].sequence === expectation.triggerSequence)
      ? {
        kind: result.kind,
        process: process.value,
        entries,
        lease,
        operationReceipt: receipt,
      }
      : null;
  }
  const conflict = exactRecordV1(
    value,
    expectation.operation === "execution_acquire"
      ? ["kind", "currentProcess", "currentLease"]
      : ["kind", "currentWorkset", "currentProcess", "currentLease"],
  );
  if (conflict?.kind !== "conflict") return null;
  const process = conflict.currentProcess === null
    ? null
    : admitProcessHeadV1(conflict.currentProcess);
  const lease = conflict.currentLease === null
    ? null
    : cloneExecutionLeaseV1(conflict.currentLease);
  if (
    process !== null && (process.kind === "rejected" ||
        process.value.processId !== expectation.processId) ||
    conflict.currentLease !== null &&
      (lease === null || lease.processId !== expectation.processId)
  ) return null;
  const currentProcess = process?.kind === "admitted" ? process.value : null;
  if (expectation.operation === "execution_acquire") {
    return { kind: "conflict", currentProcess, currentLease: lease };
  }
  const currentWorkset = conflict.currentWorkset === null
    ? null
    : structuredClone(conflict.currentWorkset) as TranslationWorksetHeadV1;
  if (
    conflict.currentWorkset !== null &&
    (currentWorkset === null || typeof currentWorkset !== "object" ||
      currentWorkset.schemaVersion !== 2 || currentWorkset.processId !== expectation.processId)
  ) return null;
  return { kind: "conflict", currentWorkset, currentProcess, currentLease: lease };
}

function cloneExecutionTerminalResultV1(
  value: unknown,
  expectation: TerminalResponseExpectationV1,
): ProcessExecutionTerminalResultV1 | null {
  const result = exactRecordV1(value, ["kind", "process", "entries", "operationReceipt"]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const process = admitProcessHeadV1(result.process);
    const receipt = cloneExactV1(result.operationReceipt, normalizeProcessOperationReceiptV1);
    if (
      process.kind === "rejected" ||
      process.value.processId !== expectation.transcript.processId ||
      receipt === null ||
      !operationReceiptMatchesTerminalResponseV1(receipt, expectation) ||
      process.value.revision < receipt.processRevision ||
      process.value.transcriptFrontier < receipt.transcriptFrontier ||
      (process.value.revision === receipt.processRevision &&
        (process.value.activeAttempt !== null ||
          process.value.lastTerminalAttempt?.attemptId !== receipt.attemptId ||
          process.value.lastTerminalAttempt.generation !== receipt.generation ||
          process.value.lastTerminalAttempt.outcome !== receipt.terminalOutcome)) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries = responseEntriesV1(result.entries, expectation.transcript);
    return entries === null
      ? null
      : { kind: result.kind, process: process.value, entries, operationReceipt: receipt };
  }
  const conflict = exactRecordV1(value, ["kind", "currentProcess", "currentLease"]);
  if (conflict?.kind !== "conflict") return null;
  const process = conflict.currentProcess === null
    ? null
    : admitProcessHeadV1(conflict.currentProcess);
  const lease = conflict.currentLease === null
    ? null
    : cloneExecutionLeaseV1(conflict.currentLease);
  if (
    process !== null && (process.kind === "rejected" ||
        process.value.processId !== expectation.transcript.processId) ||
    conflict.currentLease !== null &&
      (lease === null || lease.processId !== expectation.transcript.processId)
  ) return null;
  return {
    kind: "conflict",
    currentProcess: process?.kind === "admitted" ? process.value : null,
    currentLease: lease,
  };
}

function cloneTranslationFinalizeExecutionResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "translation_finalize_terminal" }
  >,
): TranslationWorksetFinalizeExecutionCompositeCommitResultV1 | null {
  const result = exactRecordV1(value, [
    "kind",
    "head",
    "worksetOperationReceipt",
    "process",
    "entries",
    "processOperationReceipt",
  ]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const head = structuredClone(result.head) as TranslationWorksetHeadV1;
    const worksetReceipt = exactRecordV1(result.worksetOperationReceipt, [
      "processId",
      "operationId",
      "operation",
      "operationDigest",
      "worksetRevision",
      "candidateId",
    ]);
    const terminal = cloneExecutionTerminalResultV1(
      {
        kind: result.kind,
        process: result.process,
        entries: result.entries,
        operationReceipt: result.processOperationReceipt,
      },
      expectation.terminal,
    );
    if (
      head === null || typeof head !== "object" || head.schemaVersion !== 2 ||
      head.processId !== expectation.processId || head.phase !== "ready" ||
      worksetReceipt === null ||
      worksetReceipt.processId !== expectation.processId ||
      worksetReceipt.operationId !== expectation.operationId ||
      worksetReceipt.operation !== "finalize" ||
      typeof worksetReceipt.operationDigest !== "string" ||
      !/^[0-9a-f]{64}$/u.test(worksetReceipt.operationDigest) ||
      !positiveIntegerV1(worksetReceipt.worksetRevision) ||
      worksetReceipt.worksetRevision !== head.revision || worksetReceipt.candidateId !== null ||
      terminal === null ||
      terminal.kind === "conflict" || terminal.kind !== result.kind
    ) return null;
    return {
      kind: result.kind,
      head,
      worksetOperationReceipt: {
        processId: worksetReceipt.processId,
        operationId: worksetReceipt.operationId,
        operation: "finalize",
        operationDigest: worksetReceipt.operationDigest,
        worksetRevision: worksetReceipt.worksetRevision,
        candidateId: null,
      },
      process: terminal.process,
      entries: terminal.entries,
      processOperationReceipt: terminal.operationReceipt,
    };
  }
  const conflict = exactRecordV1(
    value,
    ["kind", "currentWorkset", "currentProcess", "currentLease"],
  );
  if (conflict?.kind !== "conflict") return null;
  const currentWorkset = conflict.currentWorkset === null
    ? null
    : structuredClone(conflict.currentWorkset) as TranslationWorksetHeadV1;
  const terminal = cloneExecutionTerminalResultV1(
    {
      kind: "conflict",
      currentProcess: conflict.currentProcess,
      currentLease: conflict.currentLease,
    },
    expectation.terminal,
  );
  if (
    terminal === null || terminal.kind !== "conflict" ||
    conflict.currentWorkset !== null &&
      (currentWorkset === null || typeof currentWorkset !== "object" ||
        currentWorkset.schemaVersion !== 2 ||
        currentWorkset.processId !== expectation.processId)
  ) return null;
  return {
    kind: "conflict",
    currentWorkset,
    currentProcess: terminal.currentProcess,
    currentLease: terminal.currentLease,
  };
}

function cloneTranslationBatchCandidateExecutionResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "translation_candidate_terminal" }
  >,
): TranslationBatchCandidateExecutionCompositeCommitResultV1 | null {
  const result = exactRecordV1(value, [
    "kind",
    "head",
    "candidate",
    "worksetOperationReceipt",
    "process",
    "entries",
    "processOperationReceipt",
  ]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const head = structuredClone(result.head) as TranslationWorksetHeadV1;
    const candidate = cloneExactV1(
      result.candidate,
      cloneTranslationBatchCandidateRecordV1,
    );
    const worksetReceipt = exactRecordV1(result.worksetOperationReceipt, [
      "processId",
      "operationId",
      "operation",
      "operationDigest",
      "worksetRevision",
      "candidateId",
    ]);
    const terminal = cloneExecutionTerminalResultV1(
      {
        kind: result.kind,
        process: result.process,
        entries: result.entries,
        operationReceipt: result.processOperationReceipt,
      },
      expectation.terminal,
    );
    if (
      head === null || typeof head !== "object" || head.schemaVersion !== 2 ||
      head.processId !== expectation.processId || head.phase !== "ready" ||
      candidate === null || candidate.processId !== expectation.processId ||
      candidate.candidateId !== expectation.operationId ||
      candidate.baseWorksetRevision !== expectation.expectedWorksetRevision ||
      candidate.firstOrder !== expectation.expectedFirstPendingOrder ||
      candidate.unitCount !== expectation.unitCount ||
      candidate.attemptId !== expectation.attemptId ||
      candidate.generation !== expectation.generation ||
      candidate.createdAt !== expectation.updatedAt ||
      head.pendingCandidateId !== candidate.candidateId ||
      head.revision !== expectation.expectedWorksetRevision + 1 ||
      worksetReceipt === null ||
      worksetReceipt.processId !== expectation.processId ||
      worksetReceipt.operationId !== expectation.operationId ||
      worksetReceipt.operation !== "publish_candidate" ||
      typeof worksetReceipt.operationDigest !== "string" ||
      !/^[0-9a-f]{64}$/u.test(worksetReceipt.operationDigest) ||
      worksetReceipt.worksetRevision !== head.revision ||
      worksetReceipt.candidateId !== candidate.candidateId || terminal === null ||
      terminal.kind === "conflict" || terminal.kind !== result.kind
    ) return null;
    return {
      kind: result.kind,
      head,
      candidate,
      worksetOperationReceipt: {
        processId: worksetReceipt.processId,
        operationId: worksetReceipt.operationId,
        operation: "publish_candidate",
        operationDigest: worksetReceipt.operationDigest,
        worksetRevision: worksetReceipt.worksetRevision,
        candidateId: candidate.candidateId,
      },
      process: terminal.process,
      entries: terminal.entries,
      processOperationReceipt: terminal.operationReceipt,
    };
  }
  const conflict = exactRecordV1(
    value,
    ["kind", "currentWorkset", "currentProcess", "currentLease"],
  );
  if (conflict?.kind !== "conflict") return null;
  const currentWorkset = conflict.currentWorkset === null
    ? null
    : structuredClone(conflict.currentWorkset) as TranslationWorksetHeadV1;
  const terminal = cloneExecutionTerminalResultV1(
    {
      kind: "conflict",
      currentProcess: conflict.currentProcess,
      currentLease: conflict.currentLease,
    },
    expectation.terminal,
  );
  if (
    terminal === null || terminal.kind !== "conflict" ||
    conflict.currentWorkset !== null &&
      (currentWorkset === null || typeof currentWorkset !== "object" ||
        currentWorkset.schemaVersion !== 2 ||
        currentWorkset.processId !== expectation.processId)
  ) return null;
  return {
    kind: "conflict",
    currentWorkset,
    currentProcess: terminal.currentProcess,
    currentLease: terminal.currentLease,
  };
}

function cloneExecutionLeaseMutationResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "execution_lease_mutation" }
  >,
): ProcessExecutionLeaseMutationResultV1 | null {
  const processId = expectation.lease.processId;
  const success = exactRecordV1(value, ["kind", "lease"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const lease = cloneExecutionLeaseV1(success.lease);
    const exactExpiry = expectation.method === "renew_process_execution_lease"
      ? lease?.expiresAt === expectation.expiresAt
      : lease !== null && lease.expiresAt <= expectation.observedAt;
    return lease !== null && executionLeaseIdentityMatchesV1(lease, expectation.lease) &&
        exactExpiry
      ? { kind: success.kind, lease }
      : null;
  }
  const conflict = exactRecordV1(value, ["kind", "currentProcess", "currentLease"]);
  if (conflict?.kind !== "conflict") return null;
  const process = conflict.currentProcess === null
    ? null
    : admitProcessHeadV1(conflict.currentProcess);
  const lease = conflict.currentLease === null
    ? null
    : cloneExecutionLeaseV1(conflict.currentLease);
  if (
    process !== null && (process.kind === "rejected" || process.value.processId !== processId) ||
    conflict.currentLease !== null && (lease === null || lease.processId !== processId)
  ) return null;
  return {
    kind: "conflict",
    currentProcess: process?.kind === "admitted" ? process.value : null,
    currentLease: lease,
  };
}

function cloneProgramExecutionTerminalResultV1(
  value: unknown,
  expectation: TerminalResponseExpectationV1,
): ProgramProcessExecutionCompositeCommitResultV1 | null {
  const result = exactRecordV1(value, [
    "kind",
    "record",
    "process",
    "entries",
    "operationReceipt",
  ]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const record = cloneExactV1(result.record, cloneProgramCatalogRecordV1);
    const terminal = cloneExecutionTerminalResultV1(
      {
        kind: result.kind,
        process: result.process,
        entries: result.entries,
        operationReceipt: result.operationReceipt,
      },
      expectation,
    );
    return record === null || terminal === null || terminal.kind === "conflict" ||
        record.head.programId !== expectation.program?.programId ||
        terminal.operationReceipt.operation !== "program_revision_terminal" ||
        !operationReceiptMatchesTerminalResponseV1(terminal.operationReceipt, expectation)
      ? null
      : { ...terminal, record };
  }
  const conflict = exactRecordV1(
    value,
    ["kind", "currentProgram", "currentProcess", "currentLease"],
  );
  if (conflict?.kind !== "conflict") return null;
  const currentProgram = conflict.currentProgram === null
    ? null
    : cloneExactV1(conflict.currentProgram, cloneProgramCatalogRecordV1);
  const currentProcess = conflict.currentProcess === null
    ? null
    : admitProcessHeadV1(conflict.currentProcess);
  const currentLease = conflict.currentLease === null
    ? null
    : cloneExecutionLeaseV1(conflict.currentLease);
  if (
    conflict.currentProgram !== null &&
      (currentProgram === null ||
        currentProgram.head.programId !== expectation.program?.programId) ||
    currentProcess !== null && (currentProcess.kind === "rejected" ||
        currentProcess.value.processId !== expectation.transcript.processId) ||
    conflict.currentLease !== null &&
      (currentLease === null || currentLease.processId !== expectation.transcript.processId)
  ) return null;
  return {
    kind: "conflict",
    currentProgram,
    currentProcess: currentProcess?.kind === "admitted" ? currentProcess.value : null,
    currentLease,
  };
}

function cloneOperationQueryResultV1(
  value: unknown,
  expectation: Extract<
    ProgramDataRepositoryWorkerResponseBindingV1,
    { readonly kind: "process_operation_query" }
  >,
): ProcessOperationReceiptQueryResultV1 | null {
  const absent = exactRecordV1(value, ["kind"]);
  if (absent?.kind === "absent") return { kind: "absent" };
  const result = exactRecordV1(value, ["kind", "receipt"]);
  if (result === null || (result.kind !== "committed" && result.kind !== "mismatch")) return null;
  if (result.receipt === null) {
    return result.kind === "mismatch" ? { kind: "mismatch", receipt: null } : null;
  }
  const receipt = cloneExactV1(result.receipt, normalizeProcessOperationReceiptV1);
  if (receipt === null) return null;
  if (
    receipt.processId !== expectation.processId ||
    receipt.operationId !== expectation.operationId
  ) return null;
  if (
    result.kind === "committed" &&
    !(expectation.receipt.kind === "execution"
      ? operationReceiptMatchesExecutionResponseV1(receipt, expectation.receipt.input)
      : operationReceiptMatchesTerminalResponseV1(receipt, expectation.receipt.input))
  ) return null;
  return { kind: result.kind, receipt };
}

function cloneProcessSummaryPageV1(
  value: unknown,
  input: ProcessSummaryListInputV1,
): ProcessSummaryPageV1 | null {
  const row = exactRecordV1(value, [
    "subjectProgramId",
    "before",
    "summaries",
    "byteLength",
    "nextCursor",
  ]);
  if (
    row === null || row.subjectProgramId !== input.subjectProgramId ||
    !exactDataEqualV1(row.before, input.before) || !Array.isArray(row.summaries) ||
    !nonNegativeIntegerV1(row.byteLength) || row.byteLength > input.maximumBytes
  ) return null;
  const summaries: ProcessSummaryPageV1["summaries"][number][] = [];
  let byteLength = 0;
  let previous: ProcessSummaryPageV1["summaries"][number] | null = null;
  for (const candidate of row.summaries) {
    const summary = admitProcessSummaryV1(candidate);
    if (
      summary.kind === "rejected" || summary.value.subjectProgramId !== input.subjectProgramId ||
      input.before !== null && compareProcessPositionV1(summary.value, input.before) <= 0 ||
      previous !== null && compareProcessPositionV1(previous, summary.value) >= 0
    ) {
      return null;
    }
    byteLength += processSummaryUtf8ByteLengthV1(summary.value);
    summaries.push(summary.value);
    previous = summary.value;
  }
  if (byteLength !== row.byteLength) return null;
  let nextCursor: ProcessSummaryPageV1["nextCursor"] = null;
  if (row.nextCursor !== null) {
    const normalized = normalizeExactV1(
      {
        subjectProgramId: input.subjectProgramId,
        before: row.nextCursor,
        maximumBytes: input.maximumBytes,
      },
      normalizeProcessSummaryListInputV1,
    );
    if (normalized === null) return null;
    nextCursor = normalized.before;
  }
  const last = summaries.at(-1);
  if (
    nextCursor !== null &&
    (last === undefined || nextCursor.updatedAt !== last.updatedAt ||
      nextCursor.processId !== last.processId)
  ) return null;
  return {
    subjectProgramId: input.subjectProgramId,
    before: input.before,
    summaries,
    byteLength,
    nextCursor,
  };
}

function cloneTranscriptPageV1(
  value: unknown,
  input: {
    readonly processId: string;
    readonly beforeSequence: number | null;
    readonly maximumBytes: number;
  },
): TranscriptPageV1 | null {
  if (value === null) return null;
  const row = exactRecordV1(value, [
    "processId",
    "beforeSequence",
    "entries",
    "byteLength",
    "nextBeforeSequence",
  ]);
  if (
    row === null || row.processId !== input.processId ||
    row.beforeSequence !== input.beforeSequence ||
    !Array.isArray(row.entries) || !nonNegativeIntegerV1(row.byteLength) ||
    row.byteLength > input.maximumBytes ||
    (row.nextBeforeSequence !== null && !positiveIntegerV1(row.nextBeforeSequence))
  ) return null;
  const entries: TranscriptEntryV1[] = [];
  const entryIds = new Set<string>();
  let byteLength = 0;
  let priorSequence = 0;
  for (const candidate of row.entries) {
    const entry = admitTranscriptEntryV1(candidate);
    if (
      entry.kind === "rejected" || entry.value.processId !== input.processId ||
      priorSequence !== 0 && entry.value.sequence !== priorSequence + 1 ||
      entryIds.has(entry.value.entryId) ||
      input.beforeSequence !== null && entry.value.sequence >= input.beforeSequence
    ) return null;
    priorSequence = entry.value.sequence;
    entryIds.add(entry.value.entryId);
    byteLength += transcriptEntryUtf8ByteLengthV1(entry.value);
    entries.push(entry.value);
  }
  const oldest = entries.at(0);
  const expectedNextBeforeSequence = oldest !== undefined && oldest.sequence > 1
    ? oldest.sequence
    : null;
  if (
    byteLength !== row.byteLength || row.nextBeforeSequence !== expectedNextBeforeSequence
  ) return null;
  return {
    processId: input.processId,
    beforeSequence: input.beforeSequence,
    entries,
    byteLength,
    nextBeforeSequence: row.nextBeforeSequence as number | null,
  };
}

function admitSuccessValueV1(
  expectation: ProgramDataRepositoryWorkerResponseExpectationV1,
  value: unknown,
): ProgramDataRepositoryWorkerSuccessV1 | null {
  const { method, binding } = expectation;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return value === null ? { kind: "success", method, value: null } : null;
  }
  if (method === "list_programs") {
    if (binding.kind !== "catalog_list") return null;
    const page = cloneCatalogListPageV1(value, binding.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_program") {
    if (binding.kind !== "program") return null;
    const record = value === null ? null : cloneExactV1(value, cloneProgramCatalogRecordV1);
    return value !== null &&
        (record === null || !catalogRecordMatchesProgramV1(record, binding.programId))
      ? null
      : { kind: "success", method, value: record };
  }
  if (method === "load_program_revision") {
    if (binding.kind !== "program_revision") return null;
    const program = value === null ? null : cloneExactV1(value, clonePreviewProgramForCatalogV1);
    return value !== null &&
        (program === null || program.programId !== binding.programId ||
          program.revision !== binding.revision)
      ? null
      : { kind: "success", method, value: program };
  }
  if (method === "load_program_decision") {
    if (binding.kind !== "program_decision") return null;
    const decision = value === null ? null : cloneExactV1(value, cloneProgramCatalogDecisionV1);
    if (
      value !== null &&
      (decision === null || decision.programId !== binding.programId ||
        decision.proposalId !== binding.proposalId ||
        decision.programRevision !== binding.programRevision ||
        decision.status === "accepted" &&
          !acceptedDecisionMatchesProgramV1(decision, binding.programId))
    ) return null;
    return { kind: "success", method, value: decision };
  }
  if (method === "load_latest_accepted_program_decision") {
    if (binding.kind !== "program") return null;
    if (value === null) return { kind: "success", method, value: null };
    const decision = cloneExactV1(value, cloneProgramCatalogDecisionV1);
    return decision?.status !== "accepted" ||
        !acceptedDecisionMatchesProgramV1(decision, binding.programId)
      ? null
      : { kind: "success", method, value: decision };
  }
  if (method === "list_accepted_program_decisions") {
    if (binding.kind !== "accepted_decision_list") return null;
    const page = cloneAcceptedDecisionListPageV1(value, binding.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_workspace_continuation") {
    if (binding.kind !== "program") return null;
    const continuation = value === null
      ? null
      : cloneExactV1(value, cloneProgramCatalogContinuationV1);
    return value !== null &&
        (continuation === null || continuation.programId !== binding.programId)
      ? null
      : { kind: "success", method, value: continuation };
  }
  if (method === "create_program_with_process") {
    if (binding.kind !== "program_process") return null;
    const result = cloneProgramProcessCompositeResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "create_process_with_workspace") {
    if (binding.kind !== "process_workspace_create") return null;
    const result = cloneProcessWorkspaceCreateResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_workspace_binding") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const workspace = cloneExactV1(value, cloneProcessWorkspaceBindingV1);
    return workspace?.processId === binding.processId
      ? { kind: "success", method, value: workspace }
      : null;
  }
  if (
    method === "apply_program_revision_with_process_transcript" ||
    method === "decide_program_with_process_transcript"
  ) {
    if (binding.kind !== "program_process") return null;
    const result = cloneProgramProcessCompositeResultV1(value, binding);
    return result === null || result.kind === "program_definition_missing"
      ? null
      : { kind: "success", method, value: result };
  }
  if (method === "publish_program_definition_revision") {
    if (binding.kind !== "definition_publish") return null;
    const result = cloneDefinitionPublishResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_program_definition_revision") {
    if (binding.kind !== "program_revision") return null;
    if (value === null) return { kind: "success", method, value: null };
    const definition = admitProgramDefinitionRevisionV1(value);
    return definition.kind === "rejected" || definition.value.programId !== binding.programId ||
        definition.value.revision !== binding.revision
      ? null
      : { kind: "success", method, value: definition.value };
  }
  if (method === "load_process") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const process = admitProcessHeadV1(value);
    return process.kind === "rejected" || process.value.processId !== binding.processId
      ? null
      : { kind: "success", method, value: process.value };
  }
  if (method === "list_process_summaries") {
    if (binding.kind !== "process_summary_list") return null;
    const page = cloneProcessSummaryPageV1(value, binding.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (
    method === "acquire_process_execution" ||
    method === "acquire_translation_workset_import_execution" ||
    method === "acquire_translation_batch_execution"
  ) {
    if (binding.kind !== "execution_acquire") return null;
    const result = cloneExecutionAcquireResultV1(value, binding.input);
    return result === null
      ? null
      : { kind: "success", method, value: result } as ProgramDataRepositoryWorkerSuccessV1;
  }
  if (
    method === "renew_process_execution_lease" ||
    method === "release_process_execution_lease"
  ) {
    if (binding.kind !== "execution_lease_mutation") return null;
    const result = cloneExecutionLeaseMutationResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_execution_lease") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const lease = cloneExecutionLeaseV1(value);
    return lease?.processId === binding.processId
      ? { kind: "success", method, value: lease }
      : null;
  }
  if (method === "commit_process_execution_terminal") {
    if (binding.kind !== "execution_terminal") return null;
    const result = cloneExecutionTerminalResultV1(value, binding.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "commit_program_revision_with_process_execution_terminal") {
    if (binding.kind !== "execution_terminal") return null;
    const result = cloneProgramExecutionTerminalResultV1(value, binding.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "commit_translation_workset_finalize_with_process_execution_terminal") {
    if (binding.kind !== "translation_finalize_terminal") return null;
    const result = cloneTranslationFinalizeExecutionResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "commit_translation_batch_candidate_with_process_execution_terminal") {
    if (binding.kind !== "translation_candidate_terminal") return null;
    const result = cloneTranslationBatchCandidateExecutionResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "query_process_operation") {
    if (binding.kind !== "process_operation_query") return null;
    const result = cloneOperationQueryResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (
    method === "begin_translation_workset_import" ||
    method === "append_translation_workset_import" ||
    method === "accept_translation_batch_candidate" ||
    method === "reject_translation_batch_candidate"
  ) {
    if (binding.kind !== "workset_mutation") return null;
    const result = structuredClone(value) as TranslationWorksetMutationResultV1;
    const valid = result !== null && typeof result === "object" &&
      (result.kind === "conflict"
        ? result.current === null || result.current.processId === binding.processId
        : (result.kind === "committed" || result.kind === "unchanged") &&
          result.head.processId === binding.processId &&
          result.operationReceipt.processId === binding.processId &&
          result.operationReceipt.operationId === binding.operationId &&
          result.operationReceipt.operation === binding.operation &&
          result.operationReceipt.candidateId === binding.candidateId &&
          result.operationReceipt.worksetRevision === result.head.revision);
    return valid
      ? { kind: "success", method, value: result } as ProgramDataRepositoryWorkerSuccessV1
      : null;
  }
  if (method === "load_translation_workset_head") {
    if (binding.kind !== "process") return null;
    const head = value === null ? null : structuredClone(value) as TranslationWorksetHeadV1;
    return head === null || head.schemaVersion === 2 && head.processId === binding.processId
      ? { kind: "success", method, value: head }
      : null;
  }
  if (method === "load_translation_batch_candidate") {
    if (binding.kind !== "translation_candidate") return null;
    if (value === null) return { kind: "success", method, value: null };
    const candidate = cloneExactV1(value, cloneTranslationBatchCandidateRecordV1);
    return candidate?.processId === binding.processId &&
        candidate.candidateId === binding.candidateId
      ? { kind: "success", method, value: candidate }
      : null;
  }
  if (
    method === "load_translation_workset_unit_page" ||
    method === "load_translation_workset_glossary_page"
  ) {
    if (binding.kind !== "workset_page") return null;
    const input = binding.input;
    const result = structuredClone(value) as TranslationWorksetPageResultV1<
      TranslationWorksetUnitV1 & TranslationWorksetGlossaryEntryV1
    >;
    const valid = result !== null && typeof result === "object" &&
      (result.kind === "conflict"
        ? result.current === null || result.current.processId === input.processId
        : result.kind === "page" &&
          result.page.processId === input.processId &&
          result.page.worksetRevision === input.expectedWorksetRevision &&
          result.page.fromOrder === input.fromOrder &&
          result.page.byteLength <= input.maximumBytes &&
          result.page.rows.length <= input.maximumRows &&
          (result.page.nextOrder === null ||
            result.page.rows.length > 0 &&
              result.page.nextOrder === input.fromOrder + result.page.rows.length) &&
          result.page.rows.every((row, index) =>
            row.processId === input.processId &&
            row.order === input.fromOrder + index
          ));
    return valid
      ? { kind: "success", method, value: result } as ProgramDataRepositoryWorkerSuccessV1
      : null;
  }
  if (method === "query_translation_workset_operation") {
    if (binding.kind !== "workset_operation_query") return null;
    const result = structuredClone(value) as TranslationWorksetOperationQueryResultV1;
    const valid = result !== null && typeof result === "object" &&
      (result.kind === "absent" ||
        (result.kind === "committed" || result.kind === "mismatch") &&
          result.receipt.processId === binding.processId &&
          result.receipt.operationId === binding.operationId);
    return valid ? { kind: "success", method, value: result } : null;
  }
  if (method === "load_transcript_page") {
    if (binding.kind !== "transcript_page") return null;
    const page = cloneTranscriptPageV1(value, binding);
    return value !== null && page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_program_network_access") {
    if (binding.kind !== "program") return null;
    if (value === null) return { kind: "success", method, value: null };
    const access = admitProgramNetworkAccessV1(value);
    return access.kind === "rejected" || access.value.programId !== binding.programId
      ? null
      : { kind: "success", method, value: access.value };
  }
  if (method !== "set_program_network_access" || binding.kind !== "network_mutation") return null;
  const mutation = admitProgramNetworkAccessMutationResultV1(value);
  return mutation.kind === "rejected" ||
      mutation.value.kind !== "missing" &&
        (mutation.value.value.programId !== binding.programId ||
          mutation.value.value.enabled !== binding.enabled)
    ? null
    : { kind: "success", method, value: mutation.value };
}

export function operationForProgramDataRepositoryWorkerMethodV1(
  method: ProgramDataRepositoryWorkerMethodV1,
): ProgramDataRepositoryOperationV1 {
  return method;
}

export function admitProgramDataRepositoryWorkerResponseEnvelopeV1(
  value: unknown,
  expectation: ProgramDataRepositoryWorkerResponseExpectationV1,
): ProgramDataRepositoryWorkerAdmissionResultV1<ProgramDataRepositoryWorkerResponseEnvelopeV1> {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV1("/");
  if (envelope.revision !== 1) return rejectedV1("/revision");
  if (envelope.kind !== "rpc_response") return rejectedV1("/kind");
  if (!requestIdV1(envelope.requestId)) return rejectedV1("/requestId");
  const success = exactRecordV1(envelope.record, ["kind", "method", "value"]);
  if (success !== null && success.kind === "success" && success.method === expectation.method) {
    const admitted = admitSuccessValueV1(expectation, success.value);
    if (admitted === null) return rejectedV1("/record/value");
    return admittedV1({
      revision: 1,
      kind: "rpc_response",
      requestId: envelope.requestId,
      record: admitted,
    });
  }
  const failure = exactRecordV1(envelope.record, ["kind", "method", "code", "operation"]);
  if (
    failure === null || failure.kind !== "failure" ||
    failure.method !== expectation.method || !failureCodeV1(failure.code) ||
    failure.operation !== operationForProgramDataRepositoryWorkerMethodV1(expectation.method)
  ) return rejectedV1("/record");
  return admittedV1({
    revision: 1,
    kind: "rpc_response",
    requestId: envelope.requestId,
    record: {
      kind: "failure",
      method: expectation.method,
      code: failure.code,
      operation: operationForProgramDataRepositoryWorkerMethodV1(expectation.method),
    },
  });
}
