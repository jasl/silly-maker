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
} from "./program-data-repository.ts";
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
  type ProcessOperationReceiptV1,
  type ProcessOperationReceiptQueryResultV1,
} from "./process-execution-repository.ts";

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
  readonly renew_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly release_process_execution_lease: ProcessExecutionLeaseMutationResultV1;
  readonly load_process_execution_lease: ProcessExecutionLeaseV1 | null;
  readonly commit_process_execution_terminal: ProcessExecutionTerminalResultV1;
  readonly commit_program_revision_with_process_execution_terminal:
    ProgramProcessExecutionCompositeCommitResultV1;
  readonly query_process_operation: ProcessOperationReceiptQueryResultV1;
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
      processLoad.method === "load_process_workspace_binding")
  ) {
    const processId = normalizeProcessIdWireV1(processLoad.processId);
    return processId === null
      ? rejectedV1("/record/processId")
      : admittedV1({ method: processLoad.method, processId });
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
  expected: ProgramDefinitionRevisionV1,
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
  request: Extract<
    ProgramDataRepositoryWorkerRequestV1,
    {
      readonly method:
        | "create_program_with_process"
        | "apply_program_revision_with_process_transcript"
        | "decide_program_with_process_transcript";
    }
  >,
): ProgramProcessCreateCompositeCommitResultV1 | null {
  const programId = request.method === "create_program_with_process"
    ? request.input.catalog.program.programId
    : request.input.catalog.programId;
  const processId = request.input.transcript.processId;
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
      request.method === "create_program_with_process" &&
      (process.value.createdAt !== request.input.process.createdAt ||
        !exactDataEqualV1(
          process.value.programDefinition,
          request.input.process.programDefinition,
        ))
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of result.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== processId) return null;
      entries.push(entry.value);
    }
    const receipt = result.terminalAttemptReceipt === null
      ? null
      : admitProcessTerminalAttemptReceiptV1(result.terminalAttemptReceipt);
    if (receipt !== null && receipt.kind === "rejected") return null;
    const terminalAttemptReceipt = receipt?.kind === "admitted" ? receipt.value : null;
    if (
      !exactDataEqualV1(entries, request.input.transcript.entries) ||
      !exactDataEqualV1(
        terminalAttemptReceipt,
        request.input.transcript.terminalAttemptReceipt,
      )
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
    request.method !== "create_program_with_process" || missing === null ||
    missing.kind !== "program_definition_missing"
  ) return null;
  const definition = exactRecordV1(missing.programDefinition, ["programId", "revision"]);
  const missingProgramId = normalizeProgramIdWireV1(definition?.programId);
  const missingRevision = normalizeRevisionWireV1(definition?.revision);
  return missingProgramId === null || missingRevision === null ||
      missingProgramId !== request.input.process.programDefinition.programId ||
      missingRevision !== request.input.process.programDefinition.revision
    ? null
    : {
      kind: "program_definition_missing",
      programDefinition: { programId: missingProgramId, revision: missingRevision },
    };
}

function cloneProcessWorkspaceCreateResultV1(
  value: unknown,
  request: Extract<
    ProgramDataRepositoryWorkerRequestV1,
    { readonly method: "create_process_with_workspace" }
  >,
): ProcessWorkspaceCreateCompositeCommitResultV1 | null {
  const processId = request.input.process.processId;
  const result = exactRecordV1(value, ["kind", "process", "workspace", "entries"]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const process = admitProcessHeadV1(result.process);
    const workspace = cloneExactV1(result.workspace, cloneProcessWorkspaceBindingV1);
    if (
      process.kind === "rejected" || process.value.processId !== processId ||
      !exactDataEqualV1(
        process.value.programDefinition,
        request.input.process.programDefinition,
      ) ||
      process.value.subjectProgramId !== request.input.process.subjectProgramId ||
      process.value.createdAt !== request.input.process.createdAt ||
      workspace === null || workspace.processId !== processId ||
      !exactDataEqualV1(workspace, request.input.workspace) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of result.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== processId) return null;
      entries.push(entry.value);
    }
    return !exactDataEqualV1(entries, request.input.transcript.entries)
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
    return programId === request.input.process.programDefinition.programId &&
        revision === request.input.process.programDefinition.revision
      ? { kind: "program_definition_missing", programDefinition: { programId, revision } }
      : null;
  }
  const subjectMissing = exactRecordV1(value, ["kind", "subjectProgramId"]);
  if (subjectMissing?.kind === "subject_program_missing") {
    const subjectProgramId = normalizeProgramIdWireV1(subjectMissing.subjectProgramId);
    return subjectProgramId !== null &&
        subjectProgramId === request.input.process.subjectProgramId
      ? { kind: "subject_program_missing", subjectProgramId }
      : null;
  }
  const volumeOwned = exactRecordV1(value, ["kind", "owner"]);
  if (volumeOwned?.kind !== "workspace_volume_owned") return null;
  const owner = cloneExactV1(volumeOwned.owner, cloneProcessWorkspaceBindingV1);
  return owner !== null && owner.volumeId === request.input.workspace.volumeId &&
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
  return expectation.operation === "execution_acquire"
    ? {
      processId: expectation.input.attempt.processId,
      operationId: expectation.input.attempt.commitId,
    }
    : {
      processId: expectation.input.transcript.processId,
      operationId: expectation.input.transcript.commitId,
    };
}

function operationReceiptMatchesExpectationV1(
  receipt: ProcessOperationReceiptV1,
  expectation: ProgramDataProcessOperationExpectationV1,
): boolean {
  const key = operationExpectationKeyV1(expectation);
  if (receipt.processId !== key.processId || receipt.operationId !== key.operationId) return false;
  if (expectation.operation === "execution_acquire") {
    const input = expectation.input;
    const expectedLease: ProcessExecutionLeaseV1 = {
      processId: input.attempt.processId,
      ownerInstanceId: input.ownerInstanceId,
      attemptId: input.attempt.attemptId,
      generation: input.attempt.generation,
      expiresAt: input.expiresAt,
    };
    return receipt.operation === "execution_acquire" &&
      receipt.attemptId === input.attempt.attemptId &&
      receipt.generation === input.attempt.generation &&
      receipt.processRevision === input.attempt.expectedProcessRevision + 1 &&
      receipt.transcriptFrontier === input.attempt.expectedTranscriptFrontier +
          (input.attempt.trigger.kind === "new_entry" ? 1 : 0) &&
      receipt.terminalOutcome === null && receipt.programId === null &&
      receipt.lease !== null && exactDataEqualV1(receipt.lease, expectedLease);
  }
  const input = expectation.input;
  const terminal = input.transcript.terminalAttemptReceipt!;
  const frontier = input.transcript.entries.at(-1)!.sequence;
  if (
    receipt.operation !== expectation.operation ||
    receipt.attemptId !== terminal.attemptId || receipt.generation !== terminal.generation ||
    receipt.processRevision !== input.transcript.expectedProcessRevision + 1 ||
    receipt.transcriptFrontier !== frontier || receipt.terminalOutcome !== terminal.outcome ||
    receipt.lease !== null
  ) return false;
  if (expectation.operation === "execution_terminal") return receipt.programId === null;
  return receipt.programId === expectation.input.catalog.programId &&
    receipt.programRevision === expectation.input.catalog.program.revision &&
    receipt.repositoryRevision === expectation.input.catalog.expectedRepositoryRevision + 1;
}

function cloneExecutionAcquireResultV1(
  value: unknown,
  request: Extract<ProgramDataRepositoryWorkerRequestV1, { method: "acquire_process_execution" }>,
): ProcessExecutionAcquireResultV1 | null {
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
    const trigger = request.input.attempt.trigger;
    if (
      process.kind === "rejected" || lease === null || receipt === null ||
      process.value.processId !== request.input.attempt.processId ||
      !operationReceiptMatchesExpectationV1(receipt, {
        operation: "execution_acquire",
        input: request.input,
      }) || receipt.lease === null ||
      !executionLeaseIdentityMatchesV1(lease, receipt.lease) ||
      lease.expiresAt < receipt.lease.expiresAt ||
      process.value.revision !== receipt.processRevision ||
      process.value.transcriptFrontier !== receipt.transcriptFrontier ||
      process.value.status !== "active" ||
      activeAttempt?.attemptId !== request.input.attempt.attemptId ||
      activeAttempt.generation !== request.input.attempt.generation ||
      activeAttempt.triggerEntryId !==
        (trigger.kind === "new_entry" ? trigger.entry.entryId : trigger.entryId) ||
      activeAttempt.triggerSequence !==
        (trigger.kind === "new_entry" ? trigger.entry.sequence : trigger.sequence) ||
      !exactDataEqualV1(
        activeAttempt.startingCheckpoint,
        request.input.attempt.startingCheckpoint,
      ) ||
      !exactDataEqualV1(process.value.checkpoint, request.input.attempt.startingCheckpoint) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of result.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== process.value.processId) {
        return null;
      }
      entries.push(entry.value);
    }
    const expected = request.input.attempt.trigger.kind === "new_entry"
      ? [request.input.attempt.trigger.entry]
      : [];
    return exactDataEqualV1(entries, expected)
      ? {
        kind: result.kind,
        process: process.value,
        entries,
        lease,
        operationReceipt: receipt,
      }
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
    process !== null && (process.kind === "rejected" ||
        process.value.processId !== request.input.attempt.processId) ||
    conflict.currentLease !== null &&
      (lease === null || lease.processId !== request.input.attempt.processId)
  ) return null;
  return {
    kind: "conflict",
    currentProcess: process?.kind === "admitted" ? process.value : null,
    currentLease: lease,
  };
}

function cloneExecutionTerminalResultV1(
  value: unknown,
  input: ProcessExecutionTerminalInputV1,
  expectation: ProgramDataProcessOperationExpectationV1 = {
    operation: "execution_terminal",
    input,
  },
): ProcessExecutionTerminalResultV1 | null {
  const result = exactRecordV1(value, ["kind", "process", "entries", "operationReceipt"]);
  if (result !== null && (result.kind === "committed" || result.kind === "unchanged")) {
    const process = admitProcessHeadV1(result.process);
    const receipt = cloneExactV1(result.operationReceipt, normalizeProcessOperationReceiptV1);
    if (
      process.kind === "rejected" || process.value.processId !== input.transcript.processId ||
      receipt === null ||
      !operationReceiptMatchesExpectationV1(receipt, expectation) ||
      process.value.revision < receipt.processRevision ||
      process.value.transcriptFrontier < receipt.transcriptFrontier ||
      (process.value.revision === receipt.processRevision &&
        (process.value.activeAttempt !== null ||
          process.value.lastTerminalAttempt?.attemptId !== receipt.attemptId ||
          process.value.lastTerminalAttempt.generation !== receipt.generation ||
          process.value.lastTerminalAttempt.outcome !== receipt.terminalOutcome)) ||
      !Array.isArray(result.entries)
    ) return null;
    const entries: TranscriptEntryV1[] = [];
    for (const candidate of result.entries) {
      const entry = admitTranscriptEntryV1(candidate);
      if (entry.kind === "rejected" || entry.value.processId !== input.transcript.processId) {
        return null;
      }
      entries.push(entry.value);
    }
    return exactDataEqualV1(entries, input.transcript.entries)
      ? { kind: result.kind, process: process.value, entries, operationReceipt: receipt }
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
    process !== null && (process.kind === "rejected" ||
        process.value.processId !== input.transcript.processId) ||
    conflict.currentLease !== null &&
      (lease === null || lease.processId !== input.transcript.processId)
  ) return null;
  return {
    kind: "conflict",
    currentProcess: process?.kind === "admitted" ? process.value : null,
    currentLease: lease,
  };
}

function cloneExecutionLeaseMutationResultV1(
  value: unknown,
  request: Extract<
    ProgramDataRepositoryWorkerRequestV1,
    { readonly method: "renew_process_execution_lease" | "release_process_execution_lease" }
  >,
): ProcessExecutionLeaseMutationResultV1 | null {
  const processId = request.input.lease.processId;
  const success = exactRecordV1(value, ["kind", "lease"]);
  if (success !== null && (success.kind === "committed" || success.kind === "unchanged")) {
    const lease = cloneExecutionLeaseV1(success.lease);
    const exactExpiry = request.method === "renew_process_execution_lease"
      ? lease?.expiresAt === request.input.expiresAt
      : lease !== null && lease.expiresAt <= request.input.observedAt;
    return lease !== null && executionLeaseIdentityMatchesV1(lease, request.input.lease) &&
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
  request: Extract<
    ProgramDataRepositoryWorkerRequestV1,
    { method: "commit_program_revision_with_process_execution_terminal" }
  >,
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
      request.input,
      { operation: "program_revision_terminal", input: request.input },
    );
    return record === null || terminal === null || terminal.kind === "conflict" ||
        record.head.programId !== request.input.catalog.programId ||
        terminal.operationReceipt.operation !== "program_revision_terminal" ||
        !operationReceiptMatchesExpectationV1(terminal.operationReceipt, {
          operation: "program_revision_terminal",
          input: request.input,
        })
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
        currentProgram.head.programId !== request.input.catalog.programId) ||
    currentProcess !== null && (currentProcess.kind === "rejected" ||
        currentProcess.value.processId !== request.input.transcript.processId) ||
    conflict.currentLease !== null &&
      (currentLease === null || currentLease.processId !== request.input.transcript.processId)
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
  expectation: ProgramDataProcessOperationExpectationV1,
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
  const key = operationExpectationKeyV1(expectation);
  if (receipt.processId !== key.processId || receipt.operationId !== key.operationId) return null;
  if (result.kind === "committed" && !operationReceiptMatchesExpectationV1(receipt, expectation)) {
    return null;
  }
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
  request: ProgramDataRepositoryWorkerRequestV1,
  value: unknown,
): ProgramDataRepositoryWorkerSuccessV1 | null {
  const method = request.method;
  if (method === "initialize" || method === "reset" || method === "dispose") {
    return value === null ? { kind: "success", method, value: null } : null;
  }
  if (method === "list_programs") {
    const page = cloneCatalogListPageV1(value, request.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_program") {
    const record = value === null ? null : cloneExactV1(value, cloneProgramCatalogRecordV1);
    return value !== null &&
        (record === null || !catalogRecordMatchesProgramV1(record, request.programId))
      ? null
      : { kind: "success", method, value: record };
  }
  if (method === "load_program_revision") {
    const program = value === null ? null : cloneExactV1(value, clonePreviewProgramForCatalogV1);
    return value !== null &&
        (program === null || program.programId !== request.programId ||
          program.revision !== request.revision)
      ? null
      : { kind: "success", method, value: program };
  }
  if (method === "load_program_decision") {
    const decision = value === null ? null : cloneExactV1(value, cloneProgramCatalogDecisionV1);
    if (
      value !== null &&
      (decision === null || decision.programId !== request.programId ||
        decision.proposalId !== request.proposalId ||
        decision.programRevision !== request.programRevision ||
        decision.status === "accepted" &&
          !acceptedDecisionMatchesProgramV1(decision, request.programId))
    ) return null;
    return { kind: "success", method, value: decision };
  }
  if (method === "load_latest_accepted_program_decision") {
    if (value === null) return { kind: "success", method, value: null };
    const decision = cloneExactV1(value, cloneProgramCatalogDecisionV1);
    return decision?.status !== "accepted" ||
        !acceptedDecisionMatchesProgramV1(decision, request.programId)
      ? null
      : { kind: "success", method, value: decision };
  }
  if (method === "list_accepted_program_decisions") {
    const page = cloneAcceptedDecisionListPageV1(value, request.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_workspace_continuation") {
    const continuation = value === null
      ? null
      : cloneExactV1(value, cloneProgramCatalogContinuationV1);
    return value !== null &&
        (continuation === null || continuation.programId !== request.programId)
      ? null
      : { kind: "success", method, value: continuation };
  }
  if (method === "create_program_with_process") {
    const result = cloneProgramProcessCompositeResultV1(value, request);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "create_process_with_workspace") {
    const result = cloneProcessWorkspaceCreateResultV1(value, request);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_workspace_binding") {
    if (value === null) return { kind: "success", method, value: null };
    const workspace = cloneExactV1(value, cloneProcessWorkspaceBindingV1);
    return workspace?.processId === request.processId
      ? { kind: "success", method, value: workspace }
      : null;
  }
  if (
    method === "apply_program_revision_with_process_transcript" ||
    method === "decide_program_with_process_transcript"
  ) {
    const result = cloneProgramProcessCompositeResultV1(value, request);
    return result === null || result.kind === "program_definition_missing"
      ? null
      : { kind: "success", method, value: result };
  }
  if (method === "publish_program_definition_revision") {
    const result = cloneDefinitionPublishResultV1(value, request.definition);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_program_definition_revision") {
    if (value === null) return { kind: "success", method, value: null };
    const definition = admitProgramDefinitionRevisionV1(value);
    return definition.kind === "rejected" || definition.value.programId !== request.programId ||
        definition.value.revision !== request.revision
      ? null
      : { kind: "success", method, value: definition.value };
  }
  if (method === "load_process") {
    if (value === null) return { kind: "success", method, value: null };
    const process = admitProcessHeadV1(value);
    return process.kind === "rejected" || process.value.processId !== request.processId
      ? null
      : { kind: "success", method, value: process.value };
  }
  if (method === "list_process_summaries") {
    const page = cloneProcessSummaryPageV1(value, request.input);
    return page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "acquire_process_execution") {
    const result = cloneExecutionAcquireResultV1(value, request);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (
    method === "renew_process_execution_lease" ||
    method === "release_process_execution_lease"
  ) {
    const result = cloneExecutionLeaseMutationResultV1(value, request);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_process_execution_lease") {
    if (value === null) return { kind: "success", method, value: null };
    const lease = cloneExecutionLeaseV1(value);
    return lease?.processId === request.processId
      ? { kind: "success", method, value: lease }
      : null;
  }
  if (method === "commit_process_execution_terminal") {
    const result = cloneExecutionTerminalResultV1(value, request.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "commit_program_revision_with_process_execution_terminal") {
    const result = cloneProgramExecutionTerminalResultV1(value, request);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "query_process_operation") {
    const result = cloneOperationQueryResultV1(value, request.input);
    return result === null ? null : { kind: "success", method, value: result };
  }
  if (method === "load_transcript_page") {
    const page = cloneTranscriptPageV1(value, request.input);
    return value !== null && page === null ? null : { kind: "success", method, value: page };
  }
  if (method === "load_program_network_access") {
    if (value === null) return { kind: "success", method, value: null };
    const access = admitProgramNetworkAccessV1(value);
    return access.kind === "rejected" || access.value.programId !== request.programId
      ? null
      : { kind: "success", method, value: access.value };
  }
  if (request.method !== "set_program_network_access") return null;
  const mutation = admitProgramNetworkAccessMutationResultV1(value);
  return mutation.kind === "rejected" ||
      mutation.value.kind !== "missing" &&
        (mutation.value.value.programId !== request.input.programId ||
          mutation.value.value.enabled !== request.input.enabled)
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
  expectedRequest: ProgramDataRepositoryWorkerRequestV1,
): ProgramDataRepositoryWorkerAdmissionResultV1<ProgramDataRepositoryWorkerResponseEnvelopeV1> {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV1("/");
  if (envelope.revision !== 1) return rejectedV1("/revision");
  if (envelope.kind !== "rpc_response") return rejectedV1("/kind");
  if (!requestIdV1(envelope.requestId)) return rejectedV1("/requestId");
  const success = exactRecordV1(envelope.record, ["kind", "method", "value"]);
  if (success !== null && success.kind === "success" && success.method === expectedRequest.method) {
    const admitted = admitSuccessValueV1(expectedRequest, success.value);
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
    failure.method !== expectedRequest.method || !failureCodeV1(failure.code) ||
    failure.operation !== operationForProgramDataRepositoryWorkerMethodV1(expectedRequest.method)
  ) return rejectedV1("/record");
  return admittedV1({
    revision: 1,
    kind: "rpc_response",
    requestId: envelope.requestId,
    record: {
      kind: "failure",
      method: expectedRequest.method,
      code: failure.code,
      operation: operationForProgramDataRepositoryWorkerMethodV1(expectedRequest.method),
    },
  });
}
