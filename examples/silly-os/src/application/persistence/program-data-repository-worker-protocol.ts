// SPDX-License-Identifier: MIT

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";
import {
  admitProcessHeadV1,
  admitProcessSettingsOverrideV1,
  admitProcessSummaryV1,
  admitTranscriptEntryV1,
  normalizeProcessIdV1,
  normalizeProcessSettingsOverrideMutationInputV1,
  normalizeProcessSummaryListInputV1,
  normalizeRecentProcessSummaryListInputV1,
  normalizeTranscriptPageRequestV1,
  processSummaryUtf8ByteLengthV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessHeadV1,
  type ProcessSettingsOverrideMutationInputV1,
  type ProcessSettingsOverrideMutationResultV1,
  type ProcessSettingsOverrideV1,
  type ProcessSummaryListInputV1,
  type ProcessSummaryPageV1,
  type RecentProcessSummaryListInputV1,
  type RecentProcessSummaryPageV1,
  type TranscriptEntryV1,
  type TranscriptPageV1,
} from "../../program-platform/process/program-process-repository.ts";
import {
  admitProcessNetworkAccessMutationResultV1,
  admitProcessNetworkAccessMutationV1,
  admitProcessNetworkAccessV1,
  type ProcessNetworkAccessMutationResultV1,
  type ProcessNetworkAccessMutationV1,
  type ProcessNetworkAccessV1,
} from "../../program-platform/capabilities/process-network-access.ts";
import {
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionLeaseReleaseInputV1,
  normalizeProcessExecutionLeaseRenewInputV1,
  normalizeProcessExecutionLeaseV1,
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
  type ProcessOperationReceiptQueryResultV1,
  type ProcessOperationReceiptV1,
} from "../../program-platform/process/process-execution-repository.ts";
import {
  cloneProcessWorkspaceBindingV1,
  normalizeProcessWorkspaceCreateBundleInputV1,
  type ProcessWorkspaceBindingV1,
  type ProcessWorkspaceCreateBundleInputV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryFailureCodeV1,
  type ProgramDataRepositoryOperationV1,
} from "./program-data-repository.ts";
import {
  normalizeProgramPersistenceFacetInvocationV1,
  type ProgramPersistenceFacetInvocationV1,
} from "./program-persistence-facet.ts";

export type ProgramDataRepositoryWorkerRequestV1 =
  | { readonly method: "initialize" | "reset" | "dispose" }
  | {
    readonly method: "create_process_with_workspace";
    readonly input: ProcessWorkspaceCreateBundleInputV1;
  }
  | { readonly method: "load_process_workspace_binding"; readonly processId: string }
  | { readonly method: "load_process"; readonly processId: string }
  | { readonly method: "load_process_settings_override"; readonly processId: string }
  | {
    readonly method: "set_process_settings_override";
    readonly input: ProcessSettingsOverrideMutationInputV1;
  }
  | { readonly method: "list_process_summaries"; readonly input: ProcessSummaryListInputV1 }
  | {
    readonly method: "list_recent_process_summaries";
    readonly input: RecentProcessSummaryListInputV1;
  }
  | { readonly method: "acquire_process_execution"; readonly input: ProcessExecutionAcquireInputV1 }
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
    readonly method: "query_process_operation";
    readonly input: ProgramDataProcessOperationExpectationV1;
  }
  | {
    readonly method: "invoke_program_persistence_facet";
    readonly input: ProgramPersistenceFacetInvocationV1;
  }
  | { readonly method: "load_transcript_page"; readonly input: TranscriptPageRequestV1 }
  | { readonly method: "load_process_network_access"; readonly processId: string }
  | {
    readonly method: "set_process_network_access";
    readonly input: ProcessNetworkAccessMutationV1;
  };

interface TranscriptPageRequestV1 {
  readonly processId: string;
  readonly beforeSequence: number | null;
  readonly maximumBytes: number;
}

export type ProgramDataRepositoryWorkerMethodV1 = ProgramDataRepositoryWorkerRequestV1["method"];

const programDataRepositoryWorkerMethodsV1 = {
  initialize: true,
  create_process_with_workspace: true,
  load_process_workspace_binding: true,
  load_process: true,
  load_process_settings_override: true,
  set_process_settings_override: true,
  list_process_summaries: true,
  list_recent_process_summaries: true,
  acquire_process_execution: true,
  renew_process_execution_lease: true,
  release_process_execution_lease: true,
  load_process_execution_lease: true,
  commit_process_execution_terminal: true,
  query_process_operation: true,
  invoke_program_persistence_facet: true,
  load_transcript_page: true,
  load_process_network_access: true,
  set_process_network_access: true,
  reset: true,
  dispose: true,
} as const satisfies Readonly<Record<ProgramDataRepositoryWorkerMethodV1, true>>;

function isProgramDataRepositoryWorkerMethodV1(
  value: unknown,
): value is ProgramDataRepositoryWorkerMethodV1 {
  return typeof value === "string" && Object.hasOwn(programDataRepositoryWorkerMethodsV1, value);
}

export interface ProgramDataRepositoryWorkerRequestEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: string;
  readonly record: ProgramDataRepositoryWorkerRequestV1;
}

interface TranscriptExpectationV1 {
  readonly processId: string;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly operationId: string;
  readonly entryCount: number;
  readonly firstSequence: number | null;
  readonly lastSequence: number | null;
  readonly terminal: {
    readonly attemptId: string;
    readonly generation: number;
    readonly outcome: string;
  } | null;
}

interface AcquireExpectationV1 {
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

interface TerminalExpectationV1 {
  readonly lease: ProcessExecutionLeaseV1;
  readonly transcript: TranscriptExpectationV1;
}

type ResponseBindingV1 =
  | { readonly kind: "none" }
  | { readonly kind: "process"; readonly processId: string }
  | {
    readonly kind: "process_workspace_create";
    readonly process: ProcessWorkspaceCreateBundleInputV1["process"];
    readonly workspace: ProcessWorkspaceBindingV1;
    readonly transcript: TranscriptExpectationV1;
  }
  | { readonly kind: "process_summary_list"; readonly input: ProcessSummaryListInputV1 }
  | {
    readonly kind: "recent_process_summary_list";
    readonly input: RecentProcessSummaryListInputV1;
  }
  | { readonly kind: "acquire"; readonly input: AcquireExpectationV1 }
  | {
    readonly kind: "lease_mutation";
    readonly method: "renew_process_execution_lease" | "release_process_execution_lease";
    readonly lease: ProcessExecutionLeaseV1;
    readonly expiresAt: number | null;
    readonly observedAt: number;
  }
  | { readonly kind: "terminal"; readonly input: TerminalExpectationV1 }
  | {
    readonly kind: "operation_query";
    readonly processId: string;
    readonly operationId: string;
    readonly receipt:
      | { readonly kind: "acquire"; readonly input: AcquireExpectationV1 }
      | { readonly kind: "terminal"; readonly input: TerminalExpectationV1 };
  }
  | { readonly kind: "facet"; readonly facetId: string; readonly operation: string }
  | { readonly kind: "transcript"; readonly input: TranscriptPageRequestV1 }
  | { readonly kind: "network_mutation"; readonly processId: string; readonly enabled: boolean }
  | {
    readonly kind: "settings_mutation";
    readonly processId: string;
    readonly expectedRevision: number;
    readonly admittedOverrideJson: string | null;
  };

export interface ProgramDataRepositoryWorkerResponseExpectationV1 {
  readonly method: ProgramDataRepositoryWorkerMethodV1;
  readonly binding: ResponseBindingV1;
}

function transcriptExpectationV1(
  input: ProcessExecutionTerminalInputV1["transcript"],
): TranscriptExpectationV1 {
  return {
    processId: input.processId,
    expectedProcessRevision: input.expectedProcessRevision,
    expectedTranscriptFrontier: input.expectedTranscriptFrontier,
    operationId: input.commitId,
    entryCount: input.entries.length,
    firstSequence: input.entries.at(0)?.sequence ?? null,
    lastSequence: input.entries.at(-1)?.sequence ?? null,
    terminal: input.terminalAttemptReceipt === null ? null : {
      attemptId: input.terminalAttemptReceipt.attemptId,
      generation: input.terminalAttemptReceipt.generation,
      outcome: input.terminalAttemptReceipt.outcome,
    },
  };
}

function acquireExpectationV1(input: ProcessExecutionAcquireInputV1): AcquireExpectationV1 {
  const trigger = input.attempt.trigger;
  return {
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
    startingCheckpoint: { ...input.attempt.startingCheckpoint },
  };
}

function operationKeyV1(input: ProgramDataProcessOperationExpectationV1) {
  return input.operation === "execution_acquire"
    ? { processId: input.input.attempt.processId, operationId: input.input.attempt.commitId }
    : { processId: input.input.transcript.processId, operationId: input.input.transcript.commitId };
}

export function createProgramDataRepositoryWorkerResponseExpectationV1(
  request: ProgramDataRepositoryWorkerRequestV1,
): ProgramDataRepositoryWorkerResponseExpectationV1 {
  const method = request.method;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return { method, binding: { kind: "none" } };
  }
  if (method === "create_process_with_workspace") {
    return {
      method,
      binding: {
        kind: "process_workspace_create",
        process: request.input.process,
        workspace: request.input.workspace,
        transcript: transcriptExpectationV1(request.input.transcript),
      },
    };
  }
  if (
    method === "load_process_workspace_binding" || method === "load_process" ||
    method === "load_process_settings_override" || method === "load_process_execution_lease" ||
    method === "load_process_network_access"
  ) return { method, binding: { kind: "process", processId: request.processId } };
  if (method === "list_process_summaries") {
    return { method, binding: { kind: "process_summary_list", input: request.input } };
  }
  if (method === "list_recent_process_summaries") {
    return { method, binding: { kind: "recent_process_summary_list", input: request.input } };
  }
  if (method === "acquire_process_execution") {
    return { method, binding: { kind: "acquire", input: acquireExpectationV1(request.input) } };
  }
  if (method === "renew_process_execution_lease" || method === "release_process_execution_lease") {
    return {
      method,
      binding: {
        kind: "lease_mutation",
        method,
        lease: request.input.lease,
        expiresAt: method === "renew_process_execution_lease" ? request.input.expiresAt : null,
        observedAt: request.input.observedAt,
      },
    };
  }
  if (method === "commit_process_execution_terminal") {
    return {
      method,
      binding: {
        kind: "terminal",
        input: {
          lease: request.input.lease,
          transcript: transcriptExpectationV1(request.input.transcript),
        },
      },
    };
  }
  if (method === "query_process_operation") {
    const key = operationKeyV1(request.input);
    return {
      method,
      binding: {
        kind: "operation_query",
        ...key,
        receipt: request.input.operation === "execution_acquire"
          ? { kind: "acquire", input: acquireExpectationV1(request.input.input) }
          : {
            kind: "terminal",
            input: {
              lease: request.input.input.lease,
              transcript: transcriptExpectationV1(request.input.input.transcript),
            },
          },
      },
    };
  }
  if (method === "invoke_program_persistence_facet") {
    return {
      method,
      binding: {
        kind: "facet",
        facetId: request.input.facetId,
        operation: request.input.operation,
      },
    };
  }
  if (method === "load_transcript_page") {
    return { method, binding: { kind: "transcript", input: request.input } };
  }
  if (method === "set_process_network_access") {
    return {
      method,
      binding: {
        kind: "network_mutation",
        processId: request.input.processId,
        enabled: request.input.enabled,
      },
    };
  }
  if (method === "set_process_settings_override") {
    return {
      method,
      binding: {
        kind: "settings_mutation",
        processId: request.input.processId,
        expectedRevision: request.input.expectedRevision,
        admittedOverrideJson: request.input.admittedOverrideJson,
      },
    };
  }
  return method satisfies never;
}

interface SuccessValueMapV1 {
  readonly initialize: null;
  readonly create_process_with_workspace: ProcessWorkspaceCreateCompositeCommitResultV1;
  readonly load_process_workspace_binding: ProcessWorkspaceBindingV1 | null;
  readonly load_process: ProcessHeadV1 | null;
  readonly load_process_settings_override: ProcessSettingsOverrideV1 | null;
  readonly set_process_settings_override: ProcessSettingsOverrideMutationResultV1;
  readonly list_process_summaries: ProcessSummaryPageV1;
  readonly list_recent_process_summaries: RecentProcessSummaryPageV1;
  readonly acquire_process_execution: ProcessExecutionAcquireResultV1;
  readonly renew_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly release_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly load_process_execution_lease: ProcessExecutionLeaseV1 | null;
  readonly commit_process_execution_terminal: ProcessExecutionTerminalResultV1;
  readonly query_process_operation: ProcessOperationReceiptQueryResultV1;
  readonly invoke_program_persistence_facet: unknown;
  readonly load_transcript_page: TranscriptPageV1 | null;
  readonly load_process_network_access: ProcessNetworkAccessV1 | null;
  readonly set_process_network_access: ProcessNetworkAccessMutationResultV1;
  readonly reset: null;
  readonly dispose: null;
}

export type ProgramDataRepositoryWorkerSuccessV1 = {
  readonly [T in ProgramDataRepositoryWorkerMethodV1]: {
    readonly kind: "success";
    readonly method: T;
    readonly value: SuccessValueMapV1[T];
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

export type ProgramDataRepositoryWorkerAdmissionResultV1<T> =
  | { readonly kind: "admitted"; readonly value: T }
  | { readonly kind: "rejected"; readonly path: string };

type ExactRecordV1 = Readonly<Record<string, unknown>>;

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function admittedV1<T>(value: T): ProgramDataRepositoryWorkerAdmissionResultV1<T> {
  return { kind: "admitted", value };
}

function rejectedV1<T>(path: string): ProgramDataRepositoryWorkerAdmissionResultV1<T> {
  return { kind: "rejected", path };
}

function exactDataEqualV1(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => exactDataEqualV1(value, right[index]));
  }
  const keys = Object.keys(right);
  const record = exactRecordV1(left, keys);
  return record !== null &&
    keys.every((key) => exactDataEqualV1(record[key], (right as Record<string, unknown>)[key]));
}

function normalizeExactV1<T>(value: unknown, normalize: (value: T) => T): T | null {
  try {
    const normalized = normalize(value as T);
    return exactDataEqualV1(value, normalized) ? normalized : null;
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

function normalizeOperationExpectationV1(
  value: unknown,
): ProgramDataProcessOperationExpectationV1 | null {
  const row = exactRecordV1(value, ["operation", "input"]);
  if (row?.operation === "execution_acquire") {
    const input = normalizeExactV1(row.input, normalizeProcessExecutionAcquireInputV1);
    return input === null ? null : { operation: "execution_acquire", input };
  }
  if (row?.operation === "execution_terminal") {
    const input = normalizeExactV1(row.input, normalizeProcessExecutionTerminalInputV1);
    return input === null ? null : { operation: "execution_terminal", input };
  }
  return null;
}

function admitRequestRecordV1(value: unknown): ProgramDataRepositoryWorkerRequestV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const method = (value as { readonly method?: unknown }).method;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return exactRecordV1(value, ["method"]) === null ? null : { method };
  }
  const inputRow = exactRecordV1(value, ["method", "input"]);
  const processRow = exactRecordV1(value, ["method", "processId"]);
  if (method === "create_process_with_workspace" && inputRow !== null) {
    const input = normalizeExactV1(inputRow.input, normalizeProcessWorkspaceCreateBundleInputV1);
    return input === null ? null : { method, input };
  }
  if (
    (method === "load_process_workspace_binding" || method === "load_process" ||
      method === "load_process_settings_override" || method === "load_process_execution_lease" ||
      method === "load_process_network_access") && processRow !== null
  ) {
    const processId = normalizeProcessIdWireV1(processRow.processId);
    return processId === null ? null : { method, processId };
  }
  if (inputRow === null) return null;
  const normalizer = method === "set_process_settings_override"
    ? normalizeProcessSettingsOverrideMutationInputV1
    : method === "list_process_summaries"
    ? normalizeProcessSummaryListInputV1
    : method === "list_recent_process_summaries"
    ? normalizeRecentProcessSummaryListInputV1
    : method === "acquire_process_execution"
    ? normalizeProcessExecutionAcquireInputV1
    : method === "renew_process_execution_lease"
    ? normalizeProcessExecutionLeaseRenewInputV1
    : method === "release_process_execution_lease"
    ? normalizeProcessExecutionLeaseReleaseInputV1
    : method === "commit_process_execution_terminal"
    ? normalizeProcessExecutionTerminalInputV1
    : method === "query_process_operation"
    ? normalizeOperationExpectationV1
    : method === "invoke_program_persistence_facet"
    ? normalizeProgramPersistenceFacetInvocationV1
    : method === "load_transcript_page"
    ? normalizeTranscriptPageRequestV1
    : null;
  if (method === "set_process_network_access") {
    const admitted = admitProcessNetworkAccessMutationV1(inputRow.input);
    return admitted.kind === "admitted" ? { method, input: admitted.value } : null;
  }
  if (normalizer === null) return null;
  const input = normalizeExactV1(inputRow.input, normalizer as (value: unknown) => unknown);
  return input === null ? null : { method, input } as ProgramDataRepositoryWorkerRequestV1;
}

export function admitProgramDataRepositoryWorkerRequestEnvelopeV1(
  value: unknown,
): ProgramDataRepositoryWorkerAdmissionResultV1<ProgramDataRepositoryWorkerRequestEnvelopeV1> {
  const row = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (row === null) return rejectedV1("/");
  if (row.revision !== 1) return rejectedV1("/revision");
  if (row.kind !== "rpc_request") return rejectedV1("/kind");
  if (!isProgramPlatformIdentifierV1(row.requestId)) {
    return rejectedV1("/requestId");
  }
  const record = admitRequestRecordV1(row.record);
  return record === null
    ? rejectedV1("/record")
    : admittedV1({ revision: 1, kind: "rpc_request", requestId: row.requestId, record });
}

export interface ProgramDataRepositoryWorkerRequestCorrelationV1 {
  readonly requestId: string;
  readonly method: ProgramDataRepositoryWorkerMethodV1;
}

/**
 * Recovers only the page-owned correlation fields from a rejected request.
 * Payload admission remains exclusively owned by the Worker receive boundary.
 */
export function correlateProgramDataRepositoryWorkerRequestV1(
  value: unknown,
): ProgramDataRepositoryWorkerRequestCorrelationV1 | null {
  const row = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (
    row === null || row.revision !== 1 || row.kind !== "rpc_request" ||
    !isProgramPlatformIdentifierV1(row.requestId) || row.record === null ||
    typeof row.record !== "object" || Array.isArray(row.record)
  ) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(row.record, "method");
    if (
      descriptor === undefined || !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value") ||
      !isProgramDataRepositoryWorkerMethodV1(descriptor.value)
    ) return null;
    return { requestId: row.requestId, method: descriptor.value };
  } catch {
    return null;
  }
}

function nonNegativeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function transcriptEntriesV1(
  value: unknown,
  expected: TranscriptExpectationV1,
): readonly TranscriptEntryV1[] | null {
  if (!Array.isArray(value) || value.length !== expected.entryCount) return null;
  const entries: TranscriptEntryV1[] = [];
  for (const candidate of value) {
    const entry = admitTranscriptEntryV1(candidate);
    if (entry.kind === "rejected" || entry.value.processId !== expected.processId) return null;
    entries.push(entry.value);
  }
  return (entries.at(0)?.sequence ?? null) === expected.firstSequence &&
      (entries.at(-1)?.sequence ?? null) === expected.lastSequence
    ? entries
    : null;
}

function executionConflictV1(
  value: unknown,
  processId: string,
): {
  readonly kind: "conflict";
  readonly currentProcess: ProcessHeadV1 | null;
  readonly currentLease: ProcessExecutionLeaseV1 | null;
} | null {
  const row = exactRecordV1(value, ["kind", "currentProcess", "currentLease"]);
  if (row?.kind !== "conflict") return null;
  const process = row.currentProcess === null ? null : admitProcessHeadV1(row.currentProcess);
  const lease = row.currentLease === null
    ? null
    : normalizeExactV1(row.currentLease, normalizeProcessExecutionLeaseV1);
  if (
    process !== null && (process.kind === "rejected" || process.value.processId !== processId) ||
    row.currentLease !== null && (lease === null || lease.processId !== processId)
  ) return null;
  return {
    kind: "conflict",
    currentProcess: process?.kind === "admitted" ? process.value : null,
    currentLease: lease,
  };
}

function workspaceCreateResultV1(
  value: unknown,
  binding: Extract<ResponseBindingV1, { readonly kind: "process_workspace_create" }>,
): ProcessWorkspaceCreateCompositeCommitResultV1 | null {
  const success = exactRecordV1(value, ["kind", "process", "workspace", "entries"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const process = admitProcessHeadV1(success.process);
    const workspace = normalizeExactV1(success.workspace, cloneProcessWorkspaceBindingV1);
    const entries = transcriptEntriesV1(success.entries, binding.transcript);
    if (
      process.kind === "rejected" || process.value.processId !== binding.process.processId ||
      !exactDataEqualV1(process.value.programPackage, binding.process.programPackage) ||
      process.value.subjectProgramId !== binding.process.subjectProgramId ||
      process.value.createdAt !== binding.process.createdAt || workspace === null ||
      !exactDataEqualV1(workspace, binding.workspace) || entries === null
    ) return null;
    return { kind: success.kind, process: process.value, workspace, entries };
  }
  const conflict = exactRecordV1(value, ["kind", "currentProcess", "currentWorkspace"]);
  if (conflict?.kind === "conflict") {
    const process = conflict.currentProcess === null
      ? null
      : admitProcessHeadV1(conflict.currentProcess);
    const workspace = conflict.currentWorkspace === null
      ? null
      : normalizeExactV1(conflict.currentWorkspace, cloneProcessWorkspaceBindingV1);
    if (
      process !== null &&
        (process.kind === "rejected" || process.value.processId !== binding.process.processId) ||
      conflict.currentWorkspace !== null &&
        (workspace === null || workspace.processId !== binding.process.processId)
    ) return null;
    return {
      kind: "conflict",
      currentProcess: process?.kind === "admitted" ? process.value : null,
      currentWorkspace: workspace,
    };
  }
  const owned = exactRecordV1(value, ["kind", "owner"]);
  if (owned?.kind !== "workspace_volume_owned") return null;
  const owner = normalizeExactV1(owned.owner, cloneProcessWorkspaceBindingV1);
  return owner !== null && owner.volumeId === binding.workspace.volumeId &&
      owner.processId !== binding.process.processId
    ? { kind: "workspace_volume_owned", owner }
    : null;
}

function leaseIdentityV1(left: ProcessExecutionLeaseV1, right: ProcessExecutionLeaseV1): boolean {
  return left.processId === right.processId && left.ownerInstanceId === right.ownerInstanceId &&
    left.attemptId === right.attemptId && left.generation === right.generation;
}

function acquireReceiptV1(
  receipt: ProcessOperationReceiptV1,
  expected: AcquireExpectationV1,
): boolean {
  return receipt.processId === expected.processId && receipt.operationId === expected.operationId &&
    receipt.operation === "execution_acquire" && receipt.attemptId === expected.attemptId &&
    receipt.generation === expected.generation &&
    receipt.processRevision === expected.expectedProcessRevision + 1 &&
    receipt.transcriptFrontier ===
      expected.expectedTranscriptFrontier + (expected.publishesTriggerEntry ? 1 : 0) &&
    receipt.terminalOutcome === null && receipt.lease !== null &&
    leaseIdentityV1(receipt.lease, {
      processId: expected.processId,
      ownerInstanceId: expected.ownerInstanceId,
      attemptId: expected.attemptId,
      generation: expected.generation,
      expiresAt: expected.expiresAt,
    });
}

function terminalReceiptV1(
  receipt: ProcessOperationReceiptV1,
  expected: TerminalExpectationV1,
): boolean {
  const terminal = expected.transcript.terminal;
  return terminal !== null && receipt.processId === expected.transcript.processId &&
    receipt.operationId === expected.transcript.operationId &&
    receipt.operation === "execution_terminal" &&
    receipt.attemptId === terminal.attemptId && receipt.generation === terminal.generation &&
    receipt.processRevision === expected.transcript.expectedProcessRevision + 1 &&
    receipt.transcriptFrontier === expected.transcript.lastSequence &&
    receipt.terminalOutcome === terminal.outcome &&
    receipt.lease === null;
}

function acquireResultV1(
  value: unknown,
  expected: AcquireExpectationV1,
): ProcessExecutionAcquireResultV1 | null {
  const success = exactRecordV1(value, ["kind", "process", "entries", "lease", "operationReceipt"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const process = admitProcessHeadV1(success.process);
    const lease = normalizeExactV1(success.lease, normalizeProcessExecutionLeaseV1);
    const receipt = normalizeExactV1(success.operationReceipt, normalizeProcessOperationReceiptV1);
    if (
      process.kind === "rejected" || lease === null || receipt === null ||
      process.value.processId !== expected.processId || !acquireReceiptV1(receipt, expected) ||
      receipt.lease === null || !leaseIdentityV1(lease, receipt.lease) ||
      process.value.revision !== receipt.processRevision ||
      process.value.transcriptFrontier !== receipt.transcriptFrontier ||
      process.value.activeAttempt?.attemptId !== expected.attemptId ||
      process.value.activeAttempt.generation !== expected.generation ||
      process.value.activeAttempt.triggerEntryId !== expected.triggerEntryId ||
      process.value.activeAttempt.triggerSequence !== expected.triggerSequence ||
      !exactDataEqualV1(
        process.value.activeAttempt.startingCheckpoint,
        expected.startingCheckpoint,
      ) ||
      !Array.isArray(success.entries)
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of success.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== expected.processId) return null;
      entries.push(entry.value);
    }
    if (entries.length !== (expected.publishesTriggerEntry ? 1 : 0)) return null;
    if (
      entries[0] !== undefined &&
      (entries[0].entryId !== expected.triggerEntryId ||
        entries[0].sequence !== expected.triggerSequence)
    ) return null;
    return {
      kind: success.kind,
      process: process.value,
      entries,
      lease,
      operationReceipt: receipt,
    };
  }
  return executionConflictV1(value, expected.processId);
}

function terminalResultV1(
  value: unknown,
  expected: TerminalExpectationV1,
): ProcessExecutionTerminalResultV1 | null {
  const success = exactRecordV1(value, ["kind", "process", "entries", "operationReceipt"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const process = admitProcessHeadV1(success.process);
    const receipt = normalizeExactV1(success.operationReceipt, normalizeProcessOperationReceiptV1);
    const entries = transcriptEntriesV1(success.entries, expected.transcript);
    if (
      process.kind === "rejected" || receipt === null || entries === null ||
      process.value.processId !== expected.transcript.processId ||
      !terminalReceiptV1(receipt, expected) ||
      process.value.revision < receipt.processRevision ||
      process.value.transcriptFrontier < receipt.transcriptFrontier
    ) return null;
    return { kind: success.kind, process: process.value, entries, operationReceipt: receipt };
  }
  return executionConflictV1(value, expected.transcript.processId);
}

function leaseMutationResultV1(
  value: unknown,
  binding: Extract<ResponseBindingV1, { readonly kind: "lease_mutation" }>,
): ProcessExecutionLeaseMutationResultV1 | null {
  const success = exactRecordV1(value, ["kind", "lease"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const lease = normalizeExactV1(success.lease, normalizeProcessExecutionLeaseV1);
    const expiryMatches = binding.method === "renew_process_execution_lease"
      ? lease?.expiresAt === binding.expiresAt
      : lease !== null && lease.expiresAt <= binding.observedAt;
    return lease !== null && leaseIdentityV1(lease, binding.lease) && expiryMatches
      ? { kind: success.kind, lease }
      : null;
  }
  return executionConflictV1(value, binding.lease.processId);
}

function operationQueryResultV1(
  value: unknown,
  binding: Extract<ResponseBindingV1, { readonly kind: "operation_query" }>,
): ProcessOperationReceiptQueryResultV1 | null {
  const absent = exactRecordV1(value, ["kind"]);
  if (absent?.kind === "absent") return { kind: "absent" };
  const row = exactRecordV1(value, ["kind", "receipt"]);
  if (row === null || (row.kind !== "committed" && row.kind !== "mismatch")) return null;
  if (row.receipt === null) {
    return row.kind === "mismatch" ? { kind: "mismatch", receipt: null } : null;
  }
  const receipt = normalizeExactV1(row.receipt, normalizeProcessOperationReceiptV1);
  if (
    receipt === null || receipt.processId !== binding.processId ||
    receipt.operationId !== binding.operationId ||
    row.kind === "committed" &&
      !(binding.receipt.kind === "acquire"
        ? acquireReceiptV1(receipt, binding.receipt.input)
        : terminalReceiptV1(receipt, binding.receipt.input))
  ) return null;
  return { kind: row.kind, receipt };
}

function compareProcessPositionV1(
  left: { readonly updatedAt: number; readonly processId: string },
  right: { readonly updatedAt: number; readonly processId: string },
): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
  return left.processId === right.processId ? 0 : left.processId > right.processId ? -1 : 1;
}

function processSummaryPageV1(
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
    !exactDataEqualV1(row.before, input.before) ||
    !Array.isArray(row.summaries) || !nonNegativeIntegerV1(row.byteLength) ||
    row.byteLength > input.maximumBytes
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
    ) return null;
    summaries.push(summary.value);
    byteLength += processSummaryUtf8ByteLengthV1(summary.value);
    previous = summary.value;
  }
  if (byteLength !== row.byteLength) return null;
  const normalizedCursor = row.nextCursor === null ? null : normalizeExactV1(
    {
      subjectProgramId: input.subjectProgramId,
      before: row.nextCursor,
      maximumBytes: input.maximumBytes,
    },
    normalizeProcessSummaryListInputV1,
  )?.before ?? undefined;
  if (normalizedCursor === undefined) return null;
  const last = summaries.at(-1);
  if (
    normalizedCursor !== null &&
    (last === undefined || normalizedCursor.updatedAt !== last.updatedAt ||
      normalizedCursor.processId !== last.processId)
  ) return null;
  return {
    subjectProgramId: input.subjectProgramId,
    before: input.before,
    summaries,
    byteLength,
    nextCursor: normalizedCursor,
  };
}

function recentProcessSummaryPageV1(
  value: unknown,
  input: RecentProcessSummaryListInputV1,
): RecentProcessSummaryPageV1 | null {
  const row = exactRecordV1(value, ["before", "summaries", "byteLength", "nextCursor"]);
  if (
    row === null || !exactDataEqualV1(row.before, input.before) || !Array.isArray(row.summaries) ||
    !nonNegativeIntegerV1(row.byteLength) || row.byteLength > input.maximumBytes
  ) return null;
  const summaries: RecentProcessSummaryPageV1["summaries"][number][] = [];
  let byteLength = 0;
  let previous: RecentProcessSummaryPageV1["summaries"][number] | null = null;
  for (const candidate of row.summaries) {
    const summary = admitProcessSummaryV1(candidate);
    if (
      summary.kind === "rejected" ||
      input.before !== null && compareProcessPositionV1(summary.value, input.before) <= 0 ||
      previous !== null && compareProcessPositionV1(previous, summary.value) >= 0
    ) return null;
    summaries.push(summary.value);
    byteLength += processSummaryUtf8ByteLengthV1(summary.value);
    previous = summary.value;
  }
  if (byteLength !== row.byteLength) return null;
  const normalizedCursor = row.nextCursor === null ? null : normalizeExactV1(
    { before: row.nextCursor, maximumBytes: input.maximumBytes },
    normalizeRecentProcessSummaryListInputV1,
  )?.before ?? undefined;
  if (normalizedCursor === undefined) return null;
  const last = summaries.at(-1);
  if (
    normalizedCursor !== null &&
    (last === undefined || normalizedCursor.updatedAt !== last.updatedAt ||
      normalizedCursor.processId !== last.processId)
  ) return null;
  return { before: input.before, summaries, byteLength, nextCursor: normalizedCursor };
}

function transcriptPageV1(value: unknown, input: TranscriptPageRequestV1): TranscriptPageV1 | null {
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
    row.nextBeforeSequence !== null && !positiveIntegerV1(row.nextBeforeSequence)
  ) return null;
  const entries: TranscriptEntryV1[] = [];
  const entryIds = new Set<string>();
  let byteLength = 0;
  let previousSequence = 0;
  for (const candidate of row.entries) {
    const entry = admitTranscriptEntryV1(candidate);
    const normalizedEntry = entry.kind === "admitted" ? entry.value : null;
    if (
      normalizedEntry === null || normalizedEntry.processId !== input.processId ||
      previousSequence !== 0 && normalizedEntry.sequence !== previousSequence + 1 ||
      entryIds.has(normalizedEntry.entryId) ||
      input.beforeSequence !== null && normalizedEntry.sequence >= input.beforeSequence
    ) return null;
    entries.push(normalizedEntry);
    entryIds.add(normalizedEntry.entryId);
    previousSequence = normalizedEntry.sequence;
    byteLength += transcriptEntryUtf8ByteLengthV1(normalizedEntry);
  }
  const expectedNext = entries[0] !== undefined && entries[0].sequence > 1
    ? entries[0].sequence
    : null;
  return row.byteLength === byteLength && row.nextBeforeSequence === expectedNext
    ? {
      processId: input.processId,
      beforeSequence: input.beforeSequence,
      entries,
      byteLength,
      nextBeforeSequence: expectedNext,
    }
    : null;
}

function successRecordV1(
  expectation: ProgramDataRepositoryWorkerResponseExpectationV1,
  value: unknown,
): ProgramDataRepositoryWorkerSuccessV1 | null {
  const { method, binding } = expectation;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return binding.kind === "none" && value === null
      ? { kind: "success", method, value: null }
      : null;
  }
  if (method === "create_process_with_workspace") {
    if (binding.kind !== "process_workspace_create") return null;
    const result = workspaceCreateResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_workspace_binding") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const workspace = normalizeExactV1(value, cloneProcessWorkspaceBindingV1);
    return workspace?.processId === binding.processId
      ? { kind: "success", method, value: workspace }
      : null;
  }
  if (method === "load_process") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const process = admitProcessHeadV1(value);
    return process.kind === "admitted" && process.value.processId === binding.processId
      ? { kind: "success", method, value: process.value }
      : null;
  }
  if (method === "list_process_summaries") {
    if (binding.kind !== "process_summary_list") return null;
    const page = processSummaryPageV1(value, binding.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "list_recent_process_summaries") {
    if (binding.kind !== "recent_process_summary_list") return null;
    const page = recentProcessSummaryPageV1(value, binding.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "acquire_process_execution") {
    if (binding.kind !== "acquire") return null;
    const result = acquireResultV1(value, binding.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "renew_process_execution_lease" || method === "release_process_execution_lease") {
    if (binding.kind !== "lease_mutation") return null;
    const result = leaseMutationResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_execution_lease") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const lease = normalizeExactV1(value, normalizeProcessExecutionLeaseV1);
    return lease?.processId === binding.processId
      ? { kind: "success", method, value: lease }
      : null;
  }
  if (method === "commit_process_execution_terminal") {
    if (binding.kind !== "terminal") return null;
    const result = terminalResultV1(value, binding.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "query_process_operation") {
    if (binding.kind !== "operation_query") return null;
    const result = operationQueryResultV1(value, binding);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "invoke_program_persistence_facet") {
    return binding.kind === "facet" ? { kind: "success", method, value } : null;
  }
  if (method === "load_transcript_page") {
    if (binding.kind !== "transcript") return null;
    const page = transcriptPageV1(value, binding.input);
    return value !== null && page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_process_settings_override") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const settings = admitProcessSettingsOverrideV1(value);
    return settings.kind === "admitted" && settings.value.processId === binding.processId
      ? { kind: "success", method, value: settings.value }
      : null;
  }
  if (method === "set_process_settings_override") {
    if (binding.kind !== "settings_mutation") return null;
    const success = exactRecordV1(value, ["kind", "settings"]);
    if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
      const settings = admitProcessSettingsOverrideV1(success.settings);
      const revision = success.kind === "committed"
        ? binding.expectedRevision + 1
        : binding.expectedRevision;
      if (
        settings.kind === "rejected" || settings.value.processId !== binding.processId ||
        settings.value.revision !== revision ||
        settings.value.overrideJson !== binding.admittedOverrideJson
      ) return null;
      return { kind: "success", method, value: { kind: success.kind, settings: settings.value } };
    }
    const conflict = exactRecordV1(value, ["kind", "current"]);
    if (conflict?.kind !== "conflict") return null;
    if (conflict.current === null) {
      return { kind: "success", method, value: { kind: "conflict", current: null } };
    }
    const current = admitProcessSettingsOverrideV1(conflict.current);
    return current.kind === "admitted" && current.value.processId === binding.processId
      ? { kind: "success", method, value: { kind: "conflict", current: current.value } }
      : null;
  }
  if (method === "load_process_network_access") {
    if (binding.kind !== "process") return null;
    if (value === null) return { kind: "success", method, value: null };
    const access = admitProcessNetworkAccessV1(value);
    return access.kind === "admitted" && access.value.processId === binding.processId
      ? { kind: "success", method, value: access.value }
      : null;
  }
  if (method !== "set_process_network_access" || binding.kind !== "network_mutation") return null;
  const mutation = admitProcessNetworkAccessMutationResultV1(value);
  return mutation.kind === "admitted" &&
      (mutation.value.kind === "missing" ||
        mutation.value.value.processId === binding.processId &&
          mutation.value.value.enabled === binding.enabled)
    ? { kind: "success", method, value: mutation.value }
    : null;
}

function failureCodeV1(value: unknown): value is ProgramDataRepositoryFailureCodeV1 {
  return value === "unavailable" || value === "database_newer" || value === "upgrade_blocked" ||
    value === "quota_exceeded" || value === "transaction_aborted" || value === "request_failed" ||
    value === "schema_invalid" || value === "disposed" || value === "wire_invalid" ||
    value === "outcome_unknown" || value === "page_budget_too_small";
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
  if (!isProgramPlatformIdentifierV1(envelope.requestId)) {
    return rejectedV1("/requestId");
  }
  const success = exactRecordV1(envelope.record, ["kind", "method", "value"]);
  if (success?.kind === "success" && success.method === expectation.method) {
    const record = successRecordV1(expectation, success.value);
    return record === null
      ? rejectedV1("/record/value")
      : admittedV1({ revision: 1, kind: "rpc_response", requestId: envelope.requestId, record });
  }
  const failure = exactRecordV1(envelope.record, ["kind", "method", "code", "operation"]);
  const operation = operationForProgramDataRepositoryWorkerMethodV1(expectation.method);
  if (
    failure?.kind !== "failure" || failure.method !== expectation.method ||
    !failureCodeV1(failure.code) || failure.operation !== operation
  ) return rejectedV1("/record");
  return admittedV1({
    revision: 1,
    kind: "rpc_response",
    requestId: envelope.requestId,
    record: { kind: "failure", method: expectation.method, code: failure.code, operation },
  });
}
