// SPDX-License-Identifier: MIT

import {
  admitBrowserProgramContinuationManifestV1,
  admitProgramRepositoryAggregateV2,
  admitProgramRepositoryCommitResultV2,
  admitProgramRepositorySummaryV2,
  admitProgramRepositoryWorkspaceContinuationInsertResultV1,
  normalizeProgramRepositoryApplyRevisionInputV2,
  normalizeProgramRepositoryCreateInputV2,
  normalizeProgramRepositoryDecideInputV2,
  normalizeProgramRepositoryProgramIdV2,
  normalizeProgramRepositorySettleAgentRunInputV2,
  normalizeProgramRepositoryWorkspaceContinuationInsertV1,
  programRepositoryMaximumProgramsV2,
  type ProgramRepositoryAdmissionResultV2,
  type ProgramRepositoryApplyRevisionInputV2,
  type ProgramRepositoryCommitResultV2,
  type ProgramRepositoryCreateInputV2,
  type ProgramRepositoryDecideInputV2,
  type ProgramRepositorySettleAgentRunInputV2,
  type ProgramRepositoryFailureCodeV2,
  type ProgramRepositoryOperationV2,
  type ProgramRepositorySummaryV2,
  type ProgramRepositoryAggregateV2,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryWorkspaceContinuationInsertResultV1,
} from "./program-repository.ts";

export type ProgramRepositoryWorkerMethodV3 =
  | "initialize"
  | "list"
  | "load"
  | "load_workspace_continuation"
  | "create"
  | "apply_revision"
  | "settle_agent_run"
  | "decide"
  | "insert_workspace_continuation"
  | "dispose";

export type ProgramRepositoryWorkerRequestV3 =
  | { readonly method: "initialize" }
  | { readonly method: "list" }
  | { readonly method: "load"; readonly programId: string }
  | { readonly method: "load_workspace_continuation"; readonly programId: string }
  | { readonly method: "create"; readonly input: ProgramRepositoryCreateInputV2 }
  | {
    readonly method: "apply_revision";
    readonly input: ProgramRepositoryApplyRevisionInputV2;
  }
  | {
    readonly method: "settle_agent_run";
    readonly input: ProgramRepositorySettleAgentRunInputV2;
  }
  | { readonly method: "decide"; readonly input: ProgramRepositoryDecideInputV2 }
  | {
    readonly method: "insert_workspace_continuation";
    readonly continuation: BrowserProgramContinuationManifestV1;
  }
  | { readonly method: "dispose" };

export interface ProgramRepositoryWorkerRequestEnvelopeV3 {
  readonly revision: 3;
  readonly kind: "rpc_request";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerRequestV3;
}

export type ProgramRepositoryWorkerSuccessV3 =
  | { readonly kind: "success"; readonly method: "initialize"; readonly value: null }
  | {
    readonly kind: "success";
    readonly method: "list";
    readonly value: readonly ProgramRepositorySummaryV2[];
  }
  | {
    readonly kind: "success";
    readonly method: "load";
    readonly value: ProgramRepositoryAggregateV2 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "load_workspace_continuation";
    readonly value: BrowserProgramContinuationManifestV1 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "create" | "apply_revision" | "settle_agent_run" | "decide";
    readonly value: ProgramRepositoryCommitResultV2;
  }
  | {
    readonly kind: "success";
    readonly method: "insert_workspace_continuation";
    readonly value: ProgramRepositoryWorkspaceContinuationInsertResultV1;
  }
  | { readonly kind: "success"; readonly method: "dispose"; readonly value: null };

export interface ProgramRepositoryWorkerFailureV3 {
  readonly kind: "failure";
  readonly method: ProgramRepositoryWorkerMethodV3;
  readonly code: ProgramRepositoryFailureCodeV2;
  readonly operation: ProgramRepositoryOperationV2;
}

export interface ProgramRepositoryWorkerResponseEnvelopeV3 {
  readonly revision: 3;
  readonly kind: "rpc_response";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerSuccessV3 | ProgramRepositoryWorkerFailureV3;
}

type ExactRecordV2 = Readonly<Record<string, unknown>>;

function exactRecordV2(value: unknown, keys: readonly string[]): ExactRecordV2 | null {
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
        descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function rejectedV2<TValue>(path: string): ProgramRepositoryAdmissionResultV2<TValue> {
  return { kind: "rejected", path };
}

function admittedV2<TValue>(value: TValue): ProgramRepositoryAdmissionResultV2<TValue> {
  return { kind: "admitted", value };
}

function requestIdV2(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value);
}

function failureCodeV2(value: unknown): value is ProgramRepositoryFailureCodeV2 {
  return value === "unavailable" || value === "database_newer" || value === "upgrade_blocked" ||
    value === "quota_exceeded" || value === "transaction_aborted" ||
    value === "request_failed" || value === "schema_invalid" || value === "disposed" ||
    value === "wire_invalid" || value === "outcome_unknown";
}

export function operationForProgramRepositoryWorkerMethodV3(
  method: ProgramRepositoryWorkerMethodV3,
): ProgramRepositoryOperationV2 {
  return method;
}

function admitRequestRecordV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryWorkerRequestV3> {
  const unit = exactRecordV2(value, ["method"]);
  if (
    unit !== null &&
    (unit.method === "initialize" || unit.method === "list" || unit.method === "dispose")
  ) {
    return admittedV2({ method: unit.method });
  }
  const load = exactRecordV2(value, ["method", "programId"]);
  if (
    load !== null &&
    (load.method === "load" || load.method === "load_workspace_continuation")
  ) {
    try {
      return admittedV2({
        method: load.method,
        programId: normalizeProgramRepositoryProgramIdV2(load.programId),
      });
    } catch {
      return rejectedV2("/record/programId");
    }
  }
  const continuationInsert = exactRecordV2(value, ["method", "continuation"]);
  if (
    continuationInsert !== null && continuationInsert.method === "insert_workspace_continuation"
  ) {
    try {
      return admittedV2({
        method: "insert_workspace_continuation",
        continuation: normalizeProgramRepositoryWorkspaceContinuationInsertV1(
          continuationInsert.continuation,
        ),
      });
    } catch {
      return rejectedV2("/record/continuation");
    }
  }
  const call = exactRecordV2(value, ["method", "input"]);
  if (call === null) return rejectedV2("/record");
  try {
    if (call.method === "create") {
      return admittedV2({
        method: "create",
        input: normalizeProgramRepositoryCreateInputV2(call.input),
      });
    }
    if (call.method === "apply_revision") {
      return admittedV2({
        method: "apply_revision",
        input: normalizeProgramRepositoryApplyRevisionInputV2(call.input),
      });
    }
    if (call.method === "settle_agent_run") {
      return admittedV2({
        method: "settle_agent_run",
        input: normalizeProgramRepositorySettleAgentRunInputV2(call.input),
      });
    }
    if (call.method === "decide") {
      return admittedV2({
        method: "decide",
        input: normalizeProgramRepositoryDecideInputV2(call.input),
      });
    }
  } catch {
    return rejectedV2("/record/input");
  }
  return rejectedV2("/record/method");
}

export function admitProgramRepositoryWorkerRequestEnvelopeV3(
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryWorkerRequestEnvelopeV3> {
  const envelope = exactRecordV2(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV2("/");
  if (envelope.revision !== 3) return rejectedV2("/revision");
  if (envelope.kind !== "rpc_request") return rejectedV2("/kind");
  if (!requestIdV2(envelope.requestId)) return rejectedV2("/requestId");
  const record = admitRequestRecordV3(envelope.record);
  if (record.kind === "rejected") return record;
  return admittedV2({
    revision: 3,
    kind: "rpc_request",
    requestId: envelope.requestId,
    record: record.value,
  });
}

function admitSuccessValueV3(
  method: ProgramRepositoryWorkerMethodV3,
  value: unknown,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryWorkerSuccessV3> {
  if (method === "initialize" || method === "dispose") {
    return value === null
      ? admittedV2({ kind: "success", method, value: null })
      : rejectedV2("/record/value");
  }
  if (method === "list") {
    if (!Array.isArray(value) || value.length > programRepositoryMaximumProgramsV2) {
      return rejectedV2("/record/value");
    }
    const summaries: ProgramRepositorySummaryV2[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const summary = admitProgramRepositorySummaryV2(value[index]);
      if (summary.kind === "rejected") {
        return rejectedV2(`/record/value/${String(index)}${summary.path}`);
      }
      summaries.push(summary.value);
    }
    return admittedV2({ kind: "success", method: "list", value: summaries });
  }
  if (method === "load") {
    if (value === null) return admittedV2({ kind: "success", method: "load", value: null });
    const aggregate = admitProgramRepositoryAggregateV2(value);
    return aggregate.kind === "rejected"
      ? rejectedV2(`/record/value${aggregate.path}`)
      : admittedV2({ kind: "success", method: "load", value: aggregate.value });
  }
  if (method === "load_workspace_continuation") {
    if (value === null) {
      return admittedV2({
        kind: "success",
        method: "load_workspace_continuation",
        value: null,
      });
    }
    const continuation = admitBrowserProgramContinuationManifestV1(value);
    return continuation.kind === "rejected"
      ? rejectedV2(`/record/value${continuation.path}`)
      : admittedV2({
        kind: "success",
        method: "load_workspace_continuation",
        value: continuation.value,
      });
  }
  if (method === "insert_workspace_continuation") {
    const result = admitProgramRepositoryWorkspaceContinuationInsertResultV1(value);
    return result.kind === "rejected"
      ? rejectedV2(`/record/value${result.path}`)
      : admittedV2({ kind: "success", method, value: result.value });
  }
  const result = admitProgramRepositoryCommitResultV2(value);
  if (result.kind === "rejected") return rejectedV2(`/record/value${result.path}`);
  return admittedV2({ kind: "success", method, value: result.value });
}

export function admitProgramRepositoryWorkerResponseEnvelopeV3(
  value: unknown,
  expectedMethod: ProgramRepositoryWorkerMethodV3,
): ProgramRepositoryAdmissionResultV2<ProgramRepositoryWorkerResponseEnvelopeV3> {
  const envelope = exactRecordV2(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV2("/");
  if (envelope.revision !== 3) return rejectedV2("/revision");
  if (envelope.kind !== "rpc_response") return rejectedV2("/kind");
  if (!requestIdV2(envelope.requestId)) return rejectedV2("/requestId");
  const success = exactRecordV2(envelope.record, ["kind", "method", "value"]);
  if (success !== null && success.kind === "success") {
    if (success.method !== expectedMethod) return rejectedV2("/record/method");
    const admitted = admitSuccessValueV3(expectedMethod, success.value);
    if (admitted.kind === "rejected") return admitted;
    return admittedV2({
      revision: 3,
      kind: "rpc_response",
      requestId: envelope.requestId,
      record: admitted.value,
    });
  }
  const failure = exactRecordV2(envelope.record, ["kind", "method", "code", "operation"]);
  const operation = operationForProgramRepositoryWorkerMethodV3(expectedMethod);
  if (
    failure === null || failure.kind !== "failure" || failure.method !== expectedMethod ||
    !failureCodeV2(failure.code) || failure.operation !== operation
  ) return rejectedV2("/record");
  return admittedV2({
    revision: 3,
    kind: "rpc_response",
    requestId: envelope.requestId,
    record: {
      kind: "failure",
      method: expectedMethod,
      code: failure.code,
      operation,
    },
  });
}
