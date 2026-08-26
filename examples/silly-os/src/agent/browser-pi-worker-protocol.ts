// SPDX-License-Identifier: MIT

import { admitCreatorAgentSubmitTextV1 } from "../product/creator-agent-admission.ts";
import { isBrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import type { BrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";

export type BrowserPiWorkerRuntimeV1 = "deterministic_test" | "openai_direct";

export interface BrowserPiWorkerInitializeV1 {
  readonly revision: 1;
  readonly kind: "initialize";
  readonly requestId: number;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly credential: {
    readonly kind: "api_key";
    readonly value: string;
  };
}

export interface BrowserPiWorkerRpcRequestV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: number;
  readonly record: unknown;
}

export type BrowserPiWorkerInboundMessageV1 =
  | BrowserPiWorkerInitializeV1
  | BrowserPiWorkerRpcRequestV1;

export interface BrowserPiWorkerReadyV1 {
  readonly revision: 1;
  readonly kind: "ready";
  readonly requestId: number;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly distribution: BrowserPiDistributionIdentityV1;
}

export interface BrowserPiWorkerRpcResponseV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: unknown;
}

export interface BrowserPiWorkerRpcFailureV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: "not_initialized" | "invalid_request" | "session_mismatch";
}

export interface BrowserPiWorkerRpcRecordV1 {
  readonly revision: 1;
  readonly kind: "rpc_record";
  readonly record: unknown;
}

export interface BrowserPiWorkerProtocolFailureV1 {
  readonly revision: 1;
  readonly kind: "protocol_failure";
  readonly code: "invalid_message" | "already_initialized" | "distribution_mismatch";
}

export type BrowserPiWorkerOutboundMessageV1 =
  | BrowserPiWorkerReadyV1
  | BrowserPiWorkerRpcResponseV1
  | BrowserPiWorkerRpcFailureV1
  | BrowserPiWorkerRpcRecordV1
  | BrowserPiWorkerProtocolFailureV1;

export type BrowserPiEngineRequestV1 =
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "start";
  }
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "submit";
    readonly params: {
      readonly sessionId: string;
      readonly text: string;
    };
  }
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "cancel";
    readonly params: {
      readonly sessionId: string;
      readonly runId: string;
    };
  };

type DataRecordV1 = Readonly<Record<string, unknown>>;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const credentialMaximumCharactersV1 = 64 * 1024;

function exactDataRecordV1(value: unknown, keys: readonly string[]): DataRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Object.keys(descriptors);
    if (
      actual.length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function isRequestIdV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

export function admitBrowserPiWorkerInboundMessageV1(
  value: unknown,
): BrowserPiWorkerInboundMessageV1 | null {
  const discriminator = exactDataRecordV1(value, ["revision", "kind", "requestId", "record"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "runtime", "credential"]);
  if (
    discriminator === null || discriminator.revision !== 1 ||
    !isRequestIdV1(discriminator.requestId)
  ) return null;
  if (discriminator.kind === "rpc_request") {
    if (!Object.hasOwn(discriminator, "record")) return null;
    return {
      revision: 1,
      kind: "rpc_request",
      requestId: discriminator.requestId,
      record: discriminator.record,
    };
  }
  if (
    discriminator.kind !== "initialize" ||
    (discriminator.runtime !== "deterministic_test" &&
      discriminator.runtime !== "openai_direct")
  ) {
    return null;
  }
  const credential = exactDataRecordV1(discriminator.credential, ["kind", "value"]);
  if (
    credential === null || credential.kind !== "api_key" ||
    typeof credential.value !== "string" || credential.value.length === 0 ||
    credential.value.length > credentialMaximumCharactersV1
  ) return null;
  return {
    revision: 1,
    kind: "initialize",
    requestId: discriminator.requestId,
    runtime: discriminator.runtime,
    credential: { kind: "api_key", value: credential.value },
  };
}

export function admitBrowserPiWorkerOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerOutboundMessageV1 | null {
  const base = exactDataRecordV1(value, ["revision", "kind", "code"]) ??
    exactDataRecordV1(value, ["revision", "kind", "record"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "runtime", "distribution"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "ok", "response"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "ok", "code"]);
  if (base === null || base.revision !== 1) return null;
  if (base.kind === "protocol_failure") {
    if (
      base.code !== "invalid_message" && base.code !== "already_initialized" &&
      base.code !== "distribution_mismatch"
    ) return null;
    return { revision: 1, kind: "protocol_failure", code: base.code };
  }
  if (base.kind === "rpc_record") {
    return { revision: 1, kind: "rpc_record", record: base.record };
  }
  if (!isRequestIdV1(base.requestId)) return null;
  if (base.kind === "ready") {
    if (
      (base.runtime !== "deterministic_test" && base.runtime !== "openai_direct") ||
      !isBrowserPiDistributionIdentityV1(base.distribution)
    ) return null;
    return {
      revision: 1,
      kind: "ready",
      requestId: base.requestId,
      runtime: base.runtime,
      distribution: base.distribution,
    };
  }
  if (base.kind !== "rpc_response") return null;
  if (base.ok === true && Object.hasOwn(base, "response")) {
    return {
      revision: 1,
      kind: "rpc_response",
      requestId: base.requestId,
      ok: true,
      response: base.response,
    };
  }
  if (
    base.ok === false &&
    (base.code === "not_initialized" || base.code === "invalid_request" ||
      base.code === "session_mismatch")
  ) {
    return {
      revision: 1,
      kind: "rpc_response",
      requestId: base.requestId,
      ok: false,
      code: base.code,
    };
  }
  return null;
}

export function admitBrowserPiEngineRequestV1(value: unknown): BrowserPiEngineRequestV1 | null {
  const base = exactDataRecordV1(value, ["revision", "requestId", "method"]) ??
    exactDataRecordV1(value, ["revision", "requestId", "method", "params"]);
  if (
    base === null || base.revision !== 1 || !isRequestIdV1(base.requestId) ||
    (base.method !== "start" && base.method !== "submit" && base.method !== "cancel")
  ) return null;
  if (base.method === "start") {
    if (Object.hasOwn(base, "params")) return null;
    return { revision: 1, requestId: base.requestId, method: "start" };
  }
  if (base.method === "submit") {
    const params = exactDataRecordV1(base.params, ["sessionId", "text"]);
    if (params === null || !isIdentifierV1(params.sessionId)) return null;
    const submit = admitCreatorAgentSubmitTextV1(params.text);
    if (submit.kind === "rejected") return null;
    return {
      revision: 1,
      requestId: base.requestId,
      method: "submit",
      params: {
        sessionId: params.sessionId,
        text: params.text as string,
      },
    };
  }
  const params = exactDataRecordV1(base.params, ["sessionId", "runId"]);
  if (
    params === null || !isIdentifierV1(params.sessionId) || !isIdentifierV1(params.runId)
  ) return null;
  return {
    revision: 1,
    requestId: base.requestId,
    method: "cancel",
    params: { sessionId: params.sessionId, runId: params.runId },
  };
}
