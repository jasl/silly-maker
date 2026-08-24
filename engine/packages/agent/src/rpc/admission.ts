// SPDX-License-Identifier: MIT
import {
  type BoundedCanonicalJsonLimitsInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "@sillymaker/base/runtime/internal";

import type { AgentRpcDiagnosticInternalV1, AgentRpcStreamEventInternalV1 } from "./contracts.ts";

type CanonicalRecordInternalV1 = Readonly<Record<string, unknown>>;

const rpcProjectionLimitsInternalV1: BoundedCanonicalJsonLimitsInternalV1 = {
  maxBytes: 65_536 as BoundedCanonicalJsonLimitsInternalV1["maxBytes"],
  maxDepth: 16 as BoundedCanonicalJsonLimitsInternalV1["maxDepth"],
  maxNodes: 2_048 as BoundedCanonicalJsonLimitsInternalV1["maxNodes"],
};

const identifierPatternInternalV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const maxChunkLengthInternalV1 = 8_192;
const maxSubmitLengthInternalV1 = 8_192;

export type AgentRpcAdmissionResultInternalV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly diagnostic: AgentRpcDiagnosticInternalV1 };

function diagnosticInternalV1(
  code: AgentRpcDiagnosticInternalV1["code"],
  path: string,
): AgentRpcDiagnosticInternalV1 {
  return { code, path };
}

function rejectionInternalV1<TValue>(
  code: AgentRpcDiagnosticInternalV1["code"],
  path: string,
): AgentRpcAdmissionResultInternalV1<TValue> {
  return { kind: "rejected", diagnostic: diagnosticInternalV1(code, path) };
}

function exactRecordInternalV1(
  value: unknown,
  keys: readonly string[],
): CanonicalRecordInternalV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return null;
  return value as CanonicalRecordInternalV1;
}

function projectRecordInternalV1(
  value: unknown,
): AgentRpcAdmissionResultInternalV1<unknown> {
  let projected: ReturnType<typeof projectBoundedCanonicalJsonInternalV1>;
  try {
    projected = projectBoundedCanonicalJsonInternalV1(value, rpcProjectionLimitsInternalV1);
  } catch {
    return rejectionInternalV1("rpc.record_invalid", "/");
  }
  if (projected.kind === "rejected") {
    return rejectionInternalV1(
      projected.code === "limit.bytes" ? "rpc.record_too_large" : "rpc.record_invalid",
      "/",
    );
  }
  return { kind: "admitted", value: projected.value };
}

function validIdentifierInternalV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternInternalV1.test(value);
}

function validSequenceInternalV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export type AgentRpcAdmittedResponseInternalV1 =
  | { readonly kind: "started"; readonly sessionId: string }
  | { readonly kind: "submitted"; readonly runId: string }
  | { readonly kind: "cancel_requested" };

export function admitAgentRpcResponseInternalV1(
  method: "start" | "submit" | "cancel",
  value: unknown,
): AgentRpcAdmissionResultInternalV1<AgentRpcAdmittedResponseInternalV1> {
  const projection = projectRecordInternalV1(value);
  if (projection.kind === "rejected") return projection;
  switch (method) {
    case "start": {
      const record = exactRecordInternalV1(projection.value, ["kind", "sessionId"]);
      if (
        record === null || record.kind !== "started" ||
        !validIdentifierInternalV1(record.sessionId)
      ) {
        return rejectionInternalV1("rpc.record_invalid", "/response");
      }
      return {
        kind: "admitted",
        value: { kind: "started", sessionId: record.sessionId },
      };
    }
    case "submit": {
      const record = exactRecordInternalV1(projection.value, ["kind", "runId"]);
      if (
        record === null || record.kind !== "submitted" ||
        !validIdentifierInternalV1(record.runId)
      ) {
        return rejectionInternalV1("rpc.record_invalid", "/response");
      }
      return {
        kind: "admitted",
        value: { kind: "submitted", runId: record.runId },
      };
    }
    case "cancel": {
      const record = exactRecordInternalV1(projection.value, ["kind"]);
      if (record === null || record.kind !== "cancel_requested") {
        return rejectionInternalV1("rpc.record_invalid", "/response");
      }
      return {
        kind: "admitted",
        value: { kind: "cancel_requested" },
      };
    }
  }
  const exhaustive: never = method;
  throw new TypeError(`Unknown Agent RPC method ${String(exhaustive)}`);
}

export function admitAgentRpcStreamRecordInternalV1(
  value: unknown,
  connectionGeneration: number,
): AgentRpcAdmissionResultInternalV1<AgentRpcStreamEventInternalV1> {
  const projection = projectRecordInternalV1(value);
  if (projection.kind === "rejected") return projection;
  if (
    projection.value === null || typeof projection.value !== "object" ||
    Array.isArray(projection.value)
  ) {
    return rejectionInternalV1("rpc.record_invalid", "/");
  }
  const discriminator = projection.value as CanonicalRecordInternalV1;
  if (typeof discriminator.kind !== "string") {
    return rejectionInternalV1("rpc.record_invalid", "/kind");
  }
  const common = (keys: readonly string[]): CanonicalRecordInternalV1 | null => {
    const record = exactRecordInternalV1(projection.value, keys);
    if (
      record === null || !validIdentifierInternalV1(record.sessionId) ||
      !validIdentifierInternalV1(record.runId) || !validSequenceInternalV1(record.sequence)
    ) return null;
    return record;
  };
  switch (discriminator.kind) {
    case "artifact_chunk": {
      const record = common(["kind", "sessionId", "runId", "sequence", "text"]);
      if (
        record === null || typeof record.text !== "string" ||
        record.text.length > maxChunkLengthInternalV1
      ) return rejectionInternalV1("rpc.record_invalid", "/text");
      return {
        kind: "admitted",
        value: {
          kind: "artifact_chunk",
          connectionGeneration,
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          text: record.text,
        },
      };
    }
    case "artifact_complete": {
      const record = common(["kind", "sessionId", "runId", "sequence", "candidate"]);
      if (record === null) return rejectionInternalV1("rpc.record_invalid", "/");
      return {
        kind: "admitted",
        value: {
          kind: "artifact_complete" as const,
          connectionGeneration,
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          candidate: record.candidate,
        },
      };
    }
    case "run_completed": {
      const record = common(["kind", "sessionId", "runId", "sequence"]);
      if (record === null) return rejectionInternalV1("rpc.record_invalid", "/");
      return {
        kind: "admitted",
        value: {
          kind: "run_completed",
          connectionGeneration,
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
        },
      };
    }
    case "run_failed": {
      const record = common(["kind", "sessionId", "runId", "sequence", "code"]);
      if (
        record === null || !validIdentifierInternalV1(record.code)
      ) return rejectionInternalV1("rpc.record_invalid", "/code");
      return {
        kind: "admitted",
        value: {
          kind: "run_failed",
          connectionGeneration,
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          diagnostic: diagnosticInternalV1("rpc.request_failed", `/remote/${record.code}`),
        },
      };
    }
    default:
      return rejectionInternalV1("rpc.record_invalid", "/kind");
  }
}

export function createAgentRpcRequestInternalV1(
  requestId: number,
  method: "start" | "submit" | "cancel",
  params?: Readonly<Record<string, unknown>>,
): AgentRpcAdmissionResultInternalV1<unknown> {
  if (
    params?.text !== undefined &&
    (typeof params.text !== "string" || params.text.length === 0 ||
      params.text.length > maxSubmitLengthInternalV1)
  ) return rejectionInternalV1("rpc.record_invalid", "/params/text");
  return projectRecordInternalV1({
    revision: 1,
    requestId,
    method,
    ...(params === undefined ? {} : { params }),
  });
}
