// SPDX-License-Identifier: MIT

import {
  admitProgramRepositoryAggregateV1,
  admitProgramRepositoryCommitResultV1,
  admitProgramRepositorySummaryV1,
  normalizeProgramRepositoryApplyRevisionInputV1,
  normalizeProgramRepositoryCreateInputV1,
  normalizeProgramRepositoryDecideInputV1,
  normalizeProgramRepositoryProgramIdV1,
  programRepositoryMaximumProgramsV1,
  type ProgramRepositoryAdmissionResultV1,
  type ProgramRepositoryApplyRevisionInputV1,
  type ProgramRepositoryCommitResultV1,
  type ProgramRepositoryCreateInputV1,
  type ProgramRepositoryDecideInputV1,
  type ProgramRepositoryFailureCodeV1,
  type ProgramRepositoryOperationV1,
  type ProgramRepositorySummaryV1,
  type ProgramRepositoryAggregateV1,
} from "./program-repository.ts";

export type ProgramRepositoryWorkerMethodV1 =
  | "initialize"
  | "list"
  | "load"
  | "create"
  | "apply_revision"
  | "decide"
  | "dispose";

export type ProgramRepositoryWorkerRequestV1 =
  | { readonly method: "initialize" }
  | { readonly method: "list" }
  | { readonly method: "load"; readonly programId: string }
  | { readonly method: "create"; readonly input: ProgramRepositoryCreateInputV1 }
  | {
    readonly method: "apply_revision";
    readonly input: ProgramRepositoryApplyRevisionInputV1;
  }
  | { readonly method: "decide"; readonly input: ProgramRepositoryDecideInputV1 }
  | { readonly method: "dispose" };

export interface ProgramRepositoryWorkerRequestEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerRequestV1;
}

export type ProgramRepositoryWorkerSuccessV1 =
  | { readonly kind: "success"; readonly method: "initialize"; readonly value: null }
  | {
    readonly kind: "success";
    readonly method: "list";
    readonly value: readonly ProgramRepositorySummaryV1[];
  }
  | {
    readonly kind: "success";
    readonly method: "load";
    readonly value: ProgramRepositoryAggregateV1 | null;
  }
  | {
    readonly kind: "success";
    readonly method: "create" | "apply_revision" | "decide";
    readonly value: ProgramRepositoryCommitResultV1;
  }
  | { readonly kind: "success"; readonly method: "dispose"; readonly value: null };

export interface ProgramRepositoryWorkerFailureV1 {
  readonly kind: "failure";
  readonly method: ProgramRepositoryWorkerMethodV1;
  readonly code: ProgramRepositoryFailureCodeV1;
  readonly operation: ProgramRepositoryOperationV1;
}

export interface ProgramRepositoryWorkerResponseEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: string;
  readonly record: ProgramRepositoryWorkerSuccessV1 | ProgramRepositoryWorkerFailureV1;
}

type ExactRecordV1 = Readonly<Record<string, unknown>>;

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

function rejectedV1<TValue>(path: string): ProgramRepositoryAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function admittedV1<TValue>(value: TValue): ProgramRepositoryAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function requestIdV1(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(value);
}

function failureCodeV1(value: unknown): value is ProgramRepositoryFailureCodeV1 {
  return value === "unavailable" || value === "database_newer" || value === "upgrade_blocked" ||
    value === "quota_exceeded" || value === "transaction_aborted" ||
    value === "request_failed" || value === "schema_invalid" || value === "disposed" ||
    value === "wire_invalid" || value === "outcome_unknown";
}

export function operationForProgramRepositoryWorkerMethodV1(
  method: ProgramRepositoryWorkerMethodV1,
): ProgramRepositoryOperationV1 {
  return method;
}

function admitRequestRecordV1(
  value: unknown,
): ProgramRepositoryAdmissionResultV1<ProgramRepositoryWorkerRequestV1> {
  const unit = exactRecordV1(value, ["method"]);
  if (
    unit !== null &&
    (unit.method === "initialize" || unit.method === "list" || unit.method === "dispose")
  ) {
    return admittedV1({ method: unit.method });
  }
  const load = exactRecordV1(value, ["method", "programId"]);
  if (load !== null && load.method === "load") {
    try {
      return admittedV1({
        method: "load",
        programId: normalizeProgramRepositoryProgramIdV1(load.programId),
      });
    } catch {
      return rejectedV1("/record/programId");
    }
  }
  const call = exactRecordV1(value, ["method", "input"]);
  if (call === null) return rejectedV1("/record");
  try {
    if (call.method === "create") {
      return admittedV1({
        method: "create",
        input: normalizeProgramRepositoryCreateInputV1(call.input),
      });
    }
    if (call.method === "apply_revision") {
      return admittedV1({
        method: "apply_revision",
        input: normalizeProgramRepositoryApplyRevisionInputV1(call.input),
      });
    }
    if (call.method === "decide") {
      return admittedV1({
        method: "decide",
        input: normalizeProgramRepositoryDecideInputV1(call.input),
      });
    }
  } catch {
    return rejectedV1("/record/input");
  }
  return rejectedV1("/record/method");
}

export function admitProgramRepositoryWorkerRequestEnvelopeV1(
  value: unknown,
): ProgramRepositoryAdmissionResultV1<ProgramRepositoryWorkerRequestEnvelopeV1> {
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

function admitSuccessValueV1(
  method: ProgramRepositoryWorkerMethodV1,
  value: unknown,
): ProgramRepositoryAdmissionResultV1<ProgramRepositoryWorkerSuccessV1> {
  if (method === "initialize" || method === "dispose") {
    return value === null
      ? admittedV1({ kind: "success", method, value: null })
      : rejectedV1("/record/value");
  }
  if (method === "list") {
    if (!Array.isArray(value) || value.length > programRepositoryMaximumProgramsV1) {
      return rejectedV1("/record/value");
    }
    const summaries: ProgramRepositorySummaryV1[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const summary = admitProgramRepositorySummaryV1(value[index]);
      if (summary.kind === "rejected") {
        return rejectedV1(`/record/value/${String(index)}${summary.path}`);
      }
      summaries.push(summary.value);
    }
    return admittedV1({ kind: "success", method: "list", value: summaries });
  }
  if (method === "load") {
    if (value === null) return admittedV1({ kind: "success", method: "load", value: null });
    const aggregate = admitProgramRepositoryAggregateV1(value);
    return aggregate.kind === "rejected"
      ? rejectedV1(`/record/value${aggregate.path}`)
      : admittedV1({ kind: "success", method: "load", value: aggregate.value });
  }
  const result = admitProgramRepositoryCommitResultV1(value);
  if (result.kind === "rejected") return rejectedV1(`/record/value${result.path}`);
  return admittedV1({ kind: "success", method, value: result.value });
}

export function admitProgramRepositoryWorkerResponseEnvelopeV1(
  value: unknown,
  expectedMethod: ProgramRepositoryWorkerMethodV1,
): ProgramRepositoryAdmissionResultV1<ProgramRepositoryWorkerResponseEnvelopeV1> {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (envelope === null) return rejectedV1("/");
  if (envelope.revision !== 1) return rejectedV1("/revision");
  if (envelope.kind !== "rpc_response") return rejectedV1("/kind");
  if (!requestIdV1(envelope.requestId)) return rejectedV1("/requestId");
  const success = exactRecordV1(envelope.record, ["kind", "method", "value"]);
  if (success !== null && success.kind === "success") {
    if (success.method !== expectedMethod) return rejectedV1("/record/method");
    const admitted = admitSuccessValueV1(expectedMethod, success.value);
    if (admitted.kind === "rejected") return admitted;
    return admittedV1({
      revision: 1,
      kind: "rpc_response",
      requestId: envelope.requestId,
      record: admitted.value,
    });
  }
  const failure = exactRecordV1(envelope.record, ["kind", "method", "code", "operation"]);
  const operation = operationForProgramRepositoryWorkerMethodV1(expectedMethod);
  if (
    failure === null || failure.kind !== "failure" || failure.method !== expectedMethod ||
    !failureCodeV1(failure.code) || failure.operation !== operation
  ) return rejectedV1("/record");
  return admittedV1({
    revision: 1,
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
