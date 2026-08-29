// SPDX-License-Identifier: MIT

import {
  admitBrowserProgramContinuationManifestV1,
  admitProgramRepositoryAggregateV3,
  admitProgramRepositoryCommitResultV3,
  admitProgramRepositorySummaryV3,
  normalizeProgramRepositoryApplyRevisionInputV3,
  normalizeProgramRepositoryCreateInputV3,
  normalizeProgramRepositoryDecideInputV3,
  normalizeProgramRepositoryProgramIdV3,
  normalizeProgramRepositorySettleAgentRunInputV3,
  programRepositoryMaximumProgramsV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAdmissionResultV3,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryApplyRevisionInputV3,
  type ProgramRepositoryCommitResultV3,
  type ProgramRepositoryCreateInputV3,
  type ProgramRepositoryDecideInputV3,
  type ProgramRepositoryFailureCodeV3,
  type ProgramRepositoryOperationV3,
  type ProgramRepositorySettleAgentRunInputV3,
  type ProgramRepositorySummaryV3,
} from "./program-repository.ts";
import {
  admitProgramNetworkAccessMutationResultV1,
  admitProgramNetworkAccessV1,
  normalizeProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessMutationResultV1,
  type ProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessV1,
} from "./program-network-access.ts";

export type ProgramRepositoryWorkerMethodV6 =
  | "initialize"
  | "list"
  | "load"
  | "load_workspace_continuation"
  | "load_program_network_access"
  | "create"
  | "apply_revision"
  | "settle_agent_run"
  | "decide"
  | "set_program_network_access"
  | "dispose";

export type ProgramRepositoryWorkerRequestV6 =
  | { readonly method: "initialize" }
  | { readonly method: "list" }
  | { readonly method: "load"; readonly programId: string }
  | { readonly method: "load_workspace_continuation"; readonly programId: string }
  | { readonly method: "load_program_network_access"; readonly programId: string }
  | { readonly method: "create"; readonly input: ProgramRepositoryCreateInputV3 }
  | {
    readonly method: "apply_revision";
    readonly input: ProgramRepositoryApplyRevisionInputV3;
  }
  | {
    readonly method: "settle_agent_run";
    readonly input: ProgramRepositorySettleAgentRunInputV3;
  }
  | { readonly method: "decide"; readonly input: ProgramRepositoryDecideInputV3 }
  | {
    readonly method: "set_program_network_access";
    readonly input: ProgramNetworkAccessMutationV1;
  }
  | { readonly method: "dispose" };

export interface ProgramRepositoryWorkerRequestEnvelopeV6 {
  readonly revision: 6;
  readonly kind: "rpc_request";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerRequestV6;
}

export type ProgramRepositoryWorkerSuccessV6 =
  | { readonly kind: "success"; readonly method: "initialize"; readonly value: null }
  | {
    readonly kind: "success";
    readonly method: "list";
    readonly value: readonly ProgramRepositorySummaryV3[];
  }
  | {
    readonly kind: "success";
    readonly method: "load";
    readonly value: ProgramRepositoryAggregateV3 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "load_workspace_continuation";
    readonly value: BrowserProgramContinuationManifestV1 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "load_program_network_access";
    readonly value: ProgramNetworkAccessV1 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "create" | "apply_revision" | "settle_agent_run" | "decide";
    readonly value: ProgramRepositoryCommitResultV3;
  }
  | {
    readonly kind: "success";
    readonly method: "set_program_network_access";
    readonly value: ProgramNetworkAccessMutationResultV1;
  }
  | { readonly kind: "success"; readonly method: "dispose"; readonly value: null };

export interface ProgramRepositoryWorkerFailureV6 {
  readonly kind: "failure";
  readonly method: ProgramRepositoryWorkerMethodV6;
  readonly code: ProgramRepositoryFailureCodeV3;
  readonly operation: ProgramRepositoryOperationV3;
}

export interface ProgramRepositoryWorkerResponseEnvelopeV6 {
  readonly revision: 6;
  readonly kind: "rpc_response";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerSuccessV6 | ProgramRepositoryWorkerFailureV6;
}

type ExactRecordV4 = Readonly<Record<string, unknown>>;

function exactRecordV4(value: unknown, keys: readonly string[]): ExactRecordV4 | null {
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

function rejectedV4<TValue>(path: string): ProgramRepositoryAdmissionResultV3<TValue> {
  return { kind: "rejected", path };
}

function admittedV4<TValue>(value: TValue): ProgramRepositoryAdmissionResultV3<TValue> {
  return { kind: "admitted", value };
}

function requestIdV4(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value);
}

function failureCodeV4(value: unknown): value is ProgramRepositoryFailureCodeV3 {
  return value === "unavailable" || value === "database_newer" || value === "upgrade_blocked" ||
    value === "quota_exceeded" || value === "transaction_aborted" ||
    value === "request_failed" || value === "schema_invalid" || value === "disposed" ||
    value === "wire_invalid" || value === "outcome_unknown";
}

export function operationForProgramRepositoryWorkerMethodV6(
  method: ProgramRepositoryWorkerMethodV6,
): ProgramRepositoryOperationV3 {
  return method;
}

function admitRequestRecordV4(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryWorkerRequestV6> {
  const unit = exactRecordV4(value, ["method"]);
  if (
    unit !== null &&
    (unit.method === "initialize" || unit.method === "list" || unit.method === "dispose")
  ) {
    return admittedV4({ method: unit.method });
  }
  const load = exactRecordV4(value, ["method", "programId"]);
  if (
    load !== null &&
    (load.method === "load" || load.method === "load_workspace_continuation" ||
      load.method === "load_program_network_access")
  ) {
    try {
      return admittedV4({
        method: load.method,
        programId: normalizeProgramRepositoryProgramIdV3(load.programId),
      });
    } catch {
      return rejectedV4("/record/programId");
    }
  }
  const call = exactRecordV4(value, ["method", "input"]);
  if (call === null) return rejectedV4("/record");
  try {
    if (call.method === "create") {
      return admittedV4({
        method: "create",
        input: normalizeProgramRepositoryCreateInputV3(call.input),
      });
    }
    if (call.method === "apply_revision") {
      return admittedV4({
        method: "apply_revision",
        input: normalizeProgramRepositoryApplyRevisionInputV3(call.input),
      });
    }
    if (call.method === "settle_agent_run") {
      return admittedV4({
        method: "settle_agent_run",
        input: normalizeProgramRepositorySettleAgentRunInputV3(call.input),
      });
    }
    if (call.method === "decide") {
      return admittedV4({
        method: "decide",
        input: normalizeProgramRepositoryDecideInputV3(call.input),
      });
    }
    if (call.method === "set_program_network_access") {
      return admittedV4({
        method: "set_program_network_access",
        input: normalizeProgramNetworkAccessMutationV1(
          call.input as ProgramNetworkAccessMutationV1,
        ),
      });
    }
  } catch {
    return rejectedV4("/record/input");
  }
  return rejectedV4("/record/method");
}

export function admitProgramRepositoryWorkerRequestEnvelopeV6(
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryWorkerRequestEnvelopeV6> {
  const envelope = exactRecordV4(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV4("/");
  if (envelope.revision !== 6) return rejectedV4("/revision");
  if (envelope.kind !== "rpc_request") return rejectedV4("/kind");
  if (!requestIdV4(envelope.requestId)) return rejectedV4("/requestId");
  const record = admitRequestRecordV4(envelope.record);
  if (record.kind === "rejected") return record;
  return admittedV4({
    revision: 6,
    kind: "rpc_request",
    requestId: envelope.requestId,
    record: record.value,
  });
}

function admitSuccessValueV4(
  method: ProgramRepositoryWorkerMethodV6,
  value: unknown,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryWorkerSuccessV6> {
  if (method === "initialize" || method === "dispose") {
    return value === null
      ? admittedV4({ kind: "success", method, value: null })
      : rejectedV4("/record/value");
  }
  if (method === "list") {
    if (!Array.isArray(value) || value.length > programRepositoryMaximumProgramsV3) {
      return rejectedV4("/record/value");
    }
    const summaries: ProgramRepositorySummaryV3[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const summary = admitProgramRepositorySummaryV3(value[index]);
      if (summary.kind === "rejected") {
        return rejectedV4(`/record/value/${String(index)}${summary.path}`);
      }
      summaries.push(summary.value);
    }
    return admittedV4({ kind: "success", method: "list", value: summaries });
  }
  if (method === "load") {
    if (value === null) return admittedV4({ kind: "success", method: "load", value: null });
    const aggregate = admitProgramRepositoryAggregateV3(value);
    return aggregate.kind === "rejected"
      ? rejectedV4(`/record/value${aggregate.path}`)
      : admittedV4({ kind: "success", method: "load", value: aggregate.value });
  }
  if (method === "load_workspace_continuation") {
    if (value === null) {
      return admittedV4({
        kind: "success",
        method: "load_workspace_continuation",
        value: null,
      });
    }
    const continuation = admitBrowserProgramContinuationManifestV1(value);
    return continuation.kind === "rejected"
      ? rejectedV4(`/record/value${continuation.path}`)
      : admittedV4({
        kind: "success",
        method: "load_workspace_continuation",
        value: continuation.value,
      });
  }
  if (method === "load_program_network_access") {
    if (value === null) {
      return admittedV4({
        kind: "success",
        method: "load_program_network_access",
        value: null,
      });
    }
    const access = admitProgramNetworkAccessV1(value);
    return access.kind === "rejected" ? rejectedV4(`/record/value${access.path}`) : admittedV4({
      kind: "success",
      method: "load_program_network_access",
      value: access.value,
    });
  }
  if (method === "set_program_network_access") {
    const result = admitProgramNetworkAccessMutationResultV1(value);
    return result.kind === "rejected" ? rejectedV4(`/record/value${result.path}`) : admittedV4({
      kind: "success",
      method: "set_program_network_access",
      value: result.value,
    });
  }
  const result = admitProgramRepositoryCommitResultV3(value);
  if (result.kind === "rejected") return rejectedV4(`/record/value${result.path}`);
  return admittedV4({ kind: "success", method, value: result.value });
}

export function admitProgramRepositoryWorkerResponseEnvelopeV6(
  value: unknown,
  expectedMethod: ProgramRepositoryWorkerMethodV6,
): ProgramRepositoryAdmissionResultV3<ProgramRepositoryWorkerResponseEnvelopeV6> {
  const envelope = exactRecordV4(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV4("/");
  if (envelope.revision !== 6) return rejectedV4("/revision");
  if (envelope.kind !== "rpc_response") return rejectedV4("/kind");
  if (!requestIdV4(envelope.requestId)) return rejectedV4("/requestId");
  const success = exactRecordV4(envelope.record, ["kind", "method", "value"]);
  if (success !== null && success.kind === "success") {
    if (success.method !== expectedMethod) return rejectedV4("/record/method");
    const admitted = admitSuccessValueV4(expectedMethod, success.value);
    if (admitted.kind === "rejected") return admitted;
    return admittedV4({
      revision: 6,
      kind: "rpc_response",
      requestId: envelope.requestId,
      record: admitted.value,
    });
  }
  const failure = exactRecordV4(envelope.record, ["kind", "method", "code", "operation"]);
  const operation = operationForProgramRepositoryWorkerMethodV6(expectedMethod);
  if (
    failure === null || failure.kind !== "failure" || failure.method !== expectedMethod ||
    !failureCodeV4(failure.code) || failure.operation !== operation
  ) return rejectedV4("/record");
  return admittedV4({
    revision: 6,
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
