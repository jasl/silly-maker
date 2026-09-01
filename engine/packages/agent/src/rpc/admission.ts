// SPDX-License-Identifier: MIT
import {
  type BoundedCanonicalJsonLimitsInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "@sillymaker/base/runtime/internal";
import type { StrictJsonValueV1 } from "@sillymaker/base/strict-json";

import type {
  AgentSessionCancelInputV1,
  AgentSessionDiagnosticV1,
  AgentSessionStreamEventV1,
  AgentSessionSubmitInputV1,
} from "../session/contracts.ts";

type CanonicalRecordInternalV1 = Readonly<Record<string, unknown>>;

const projectionLimitsInternalV1: BoundedCanonicalJsonLimitsInternalV1 = {
  maxBytes: 65_536 as BoundedCanonicalJsonLimitsInternalV1["maxBytes"],
  maxDepth: 16 as BoundedCanonicalJsonLimitsInternalV1["maxDepth"],
  maxNodes: 2_048 as BoundedCanonicalJsonLimitsInternalV1["maxNodes"],
};
const identifierPatternInternalV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
const maxTextLengthInternalV1 = 8_192;

export type AgentSessionAdmissionResultInternalV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly diagnostic: AgentSessionDiagnosticV1 };

function diagnosticInternalV1(
  code: AgentSessionDiagnosticV1["code"],
  path: string,
): AgentSessionDiagnosticV1 {
  return { code, path };
}

function rejectionInternalV1<TValue>(
  code: AgentSessionDiagnosticV1["code"],
  path: string,
): AgentSessionAdmissionResultInternalV1<TValue> {
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

function projectInternalV1(value: unknown): AgentSessionAdmissionResultInternalV1<unknown> {
  let projected: ReturnType<typeof projectBoundedCanonicalJsonInternalV1>;
  try {
    projected = projectBoundedCanonicalJsonInternalV1(value, projectionLimitsInternalV1);
  } catch {
    return rejectionInternalV1("agent_session.record_invalid", "/");
  }
  if (projected.kind === "rejected") {
    return rejectionInternalV1(
      projected.code === "limit.bytes"
        ? "agent_session.record_too_large"
        : "agent_session.record_invalid",
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

function validTextInternalV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxTextLengthInternalV1;
}

export function admitAgentSessionSubmitInputInternalV1(
  value: AgentSessionSubmitInputV1,
): AgentSessionAdmissionResultInternalV1<AgentSessionSubmitInputV1> {
  const projection = projectInternalV1(value);
  if (projection.kind === "rejected") return projection;
  const record = exactRecordInternalV1(projection.value, ["sessionId", "text"]);
  if (record === null || !validIdentifierInternalV1(record.sessionId)) {
    return rejectionInternalV1("agent_session.record_invalid", "/sessionId");
  }
  if (!validTextInternalV1(record.text)) {
    return rejectionInternalV1("agent_session.record_invalid", "/text");
  }
  return { kind: "admitted", value: { sessionId: record.sessionId, text: record.text } };
}

export function admitAgentSessionCancelInputInternalV1(
  value: AgentSessionCancelInputV1,
): AgentSessionAdmissionResultInternalV1<AgentSessionCancelInputV1> {
  const projection = projectInternalV1(value);
  if (projection.kind === "rejected") return projection;
  const record = exactRecordInternalV1(projection.value, ["sessionId", "runId"]);
  if (record === null || !validIdentifierInternalV1(record.sessionId)) {
    return rejectionInternalV1("agent_session.record_invalid", "/sessionId");
  }
  if (!validIdentifierInternalV1(record.runId)) {
    return rejectionInternalV1("agent_session.record_invalid", "/runId");
  }
  return {
    kind: "admitted",
    value: { sessionId: record.sessionId, runId: record.runId },
  };
}

export type AgentSessionAdmittedResponseInternalV1 =
  | { readonly kind: "started"; readonly sessionId: string }
  | { readonly kind: "submitted"; readonly runId: string }
  | { readonly kind: "cancel_requested" };

export function admitAgentSessionResponseInternalV1(
  operation: "start" | "submit" | "cancel",
  value: unknown,
): AgentSessionAdmissionResultInternalV1<AgentSessionAdmittedResponseInternalV1> {
  const projection = projectInternalV1(value);
  if (projection.kind === "rejected") return projection;
  switch (operation) {
    case "start": {
      const record = exactRecordInternalV1(projection.value, ["kind", "sessionId"]);
      if (
        record === null || record.kind !== "started" ||
        !validIdentifierInternalV1(record.sessionId)
      ) return rejectionInternalV1("agent_session.record_invalid", "/response");
      return { kind: "admitted", value: { kind: "started", sessionId: record.sessionId } };
    }
    case "submit": {
      const record = exactRecordInternalV1(projection.value, ["kind", "runId"]);
      if (
        record === null || record.kind !== "submitted" ||
        !validIdentifierInternalV1(record.runId)
      ) return rejectionInternalV1("agent_session.record_invalid", "/response");
      return { kind: "admitted", value: { kind: "submitted", runId: record.runId } };
    }
    case "cancel": {
      const record = exactRecordInternalV1(projection.value, ["kind"]);
      if (record === null || record.kind !== "cancel_requested") {
        return rejectionInternalV1("agent_session.record_invalid", "/response");
      }
      return { kind: "admitted", value: { kind: "cancel_requested" } };
    }
  }
  const exhaustive: never = operation;
  throw new TypeError(`Unknown Agent Session operation ${String(exhaustive)}`);
}

export function admitAgentSessionStreamEventInternalV1(
  value: unknown,
): AgentSessionAdmissionResultInternalV1<AgentSessionStreamEventV1> {
  const projection = projectInternalV1(value);
  if (projection.kind === "rejected") return projection;
  if (
    projection.value === null || typeof projection.value !== "object" ||
    Array.isArray(projection.value)
  ) return rejectionInternalV1("agent_session.record_invalid", "/");
  const discriminator = projection.value as CanonicalRecordInternalV1;
  if (typeof discriminator.kind !== "string") {
    return rejectionInternalV1("agent_session.record_invalid", "/kind");
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
    case "output_text_delta": {
      const record = common(["kind", "sessionId", "runId", "sequence", "text"]);
      if (record === null || !validTextInternalV1(record.text)) {
        return rejectionInternalV1("agent_session.record_invalid", "/text");
      }
      return {
        kind: "admitted",
        value: {
          kind: "output_text_delta",
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          text: record.text,
        },
      };
    }
    case "output_data": {
      const record = common(["kind", "sessionId", "runId", "sequence", "value"]);
      if (record === null) return rejectionInternalV1("agent_session.record_invalid", "/");
      return {
        kind: "admitted",
        value: {
          kind: "output_data",
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          value: record.value as StrictJsonValueV1,
        },
      };
    }
    case "run_completed": {
      const record = common(["kind", "sessionId", "runId", "sequence"]);
      if (record === null) return rejectionInternalV1("agent_session.record_invalid", "/");
      return {
        kind: "admitted",
        value: {
          kind: "run_completed",
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
        },
      };
    }
    case "run_failed": {
      const record = common(["kind", "sessionId", "runId", "sequence", "code"]);
      if (record === null || !validIdentifierInternalV1(record.code)) {
        return rejectionInternalV1("agent_session.record_invalid", "/code");
      }
      return {
        kind: "admitted",
        value: {
          kind: "run_failed",
          sessionId: record.sessionId as string,
          runId: record.runId as string,
          sequence: record.sequence as number,
          diagnostic: diagnosticInternalV1(
            "agent_session.operation_failed",
            `/remote/${record.code}`,
          ),
        },
      };
    }
    default:
      return rejectionInternalV1("agent_session.record_invalid", "/kind");
  }
}
