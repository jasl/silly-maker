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

export interface BrowserPiWorkerExecutionBindingV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly expectedGeneration: number;
}

export interface BrowserPiWorkerRpcRequestWithoutExecutionV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: number;
  readonly record: unknown;
}

export interface BrowserPiWorkerRpcSubmitRequestV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: number;
  readonly record: unknown;
  readonly execution: BrowserPiWorkerExecutionBindingV1;
}

export type BrowserPiWorkerRpcRequestV1 =
  | BrowserPiWorkerRpcRequestWithoutExecutionV1
  | BrowserPiWorkerRpcSubmitRequestV1;

export type BrowserPiWorkspaceRequestRecordV1 =
  | {
    readonly method: "attach_workspace";
    readonly descriptor: BrowserPiWorkerExecutionBindingV1;
  }
  | {
    readonly method: "close_workspace" | "query_workspace";
    readonly workspaceSessionId: string;
  }
  | {
    readonly method: "acknowledge_workspace_receipts";
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  };

export interface BrowserPiWorkerWorkspaceRequestV1 {
  readonly revision: 1;
  readonly kind: "workspace_request";
  readonly requestId: number;
  readonly record: BrowserPiWorkspaceRequestRecordV1;
}

export type BrowserPiWorkerInboundMessageV1 =
  | BrowserPiWorkerInitializeV1
  | BrowserPiWorkerRpcRequestV1
  | BrowserPiWorkerWorkspaceRequestV1;

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

export interface BrowserPiWorkspaceMutationReceiptWireV1 {
  readonly revision: 1;
  readonly sequence: number;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly sessionId: string;
  readonly runId: string;
  readonly toolCallId: string;
  readonly tool: "write" | "edit" | "bash";
  readonly expectedGeneration: number;
  readonly baseGeneration: number;
  readonly resultingGeneration: number;
  readonly outcome: "succeeded" | "failed" | "cancelled";
  readonly effect: "none" | "changed";
  readonly changedPaths: readonly string[];
  readonly diagnosticCode:
    | null
    | "cancelled"
    | "path_rejected"
    | "capacity_exceeded"
    | "execution_failed";
}

export interface BrowserPiWorkspaceSnapshotWireV1 {
  readonly revision: 1;
  readonly phase: "open" | "closed";
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
  readonly receipts: readonly BrowserPiWorkspaceMutationReceiptWireV1[];
}

export type BrowserPiWorkspaceSuccessResponseV1 =
  | {
    readonly method: "attach_workspace" | "close_workspace" | "query_workspace";
    readonly snapshot: BrowserPiWorkspaceSnapshotWireV1;
  }
  | {
    readonly method: "acknowledge_workspace_receipts";
    readonly throughSequence: number;
    readonly snapshot: BrowserPiWorkspaceSnapshotWireV1;
  };

export type BrowserPiWorkspaceFailureCodeV1 =
  | "not_initialized"
  | "invalid_request"
  | "workspace_busy"
  | "workspace_mismatch"
  | "receipt_sequence_invalid"
  | "workspace_failed";

export interface BrowserPiWorkerWorkspaceSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: BrowserPiWorkspaceSuccessResponseV1;
}

export interface BrowserPiWorkerWorkspaceFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: BrowserPiWorkspaceFailureCodeV1;
}

export interface BrowserPiWorkerWorkspaceReceiptEventV1 {
  readonly revision: 1;
  readonly kind: "workspace_receipt";
  readonly receipt: BrowserPiWorkspaceMutationReceiptWireV1;
}

export type BrowserPiWorkerWorkspaceOutboundMessageV1 =
  | BrowserPiWorkerWorkspaceSuccessResponseV1
  | BrowserPiWorkerWorkspaceFailureResponseV1
  | BrowserPiWorkerWorkspaceReceiptEventV1;

export type BrowserPiWorkerOutboundMessageV1 =
  | BrowserPiWorkerReadyV1
  | BrowserPiWorkerRpcResponseV1
  | BrowserPiWorkerRpcFailureV1
  | BrowserPiWorkerRpcRecordV1
  | BrowserPiWorkerProtocolFailureV1;

export type BrowserPiWorkerAnyOutboundMessageV1 =
  | BrowserPiWorkerOutboundMessageV1
  | BrowserPiWorkerWorkspaceOutboundMessageV1;

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
const workspaceReceiptMaximumV1 = 32;
const workspacePathMaximumUtf8BytesV1 = 512;
const workspacePathMaximumComponentsV1 = 32;

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

function isPositiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function exactArrayV1(value: unknown, maximumLength: number): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length > maximumLength) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Object.keys(descriptors);
    if (
      names.length !== value.length + 1 || !Object.hasOwn(descriptors, "length") ||
      !Array.from({ length: value.length }, (_, index) => String(index)).every((key) =>
        Object.hasOwn(descriptors, key)
      )
    ) return null;
    const admitted: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      admitted.push(descriptor.value);
    }
    return admitted;
  } catch {
    return null;
  }
}

function utf8ByteLengthV1(value: string): number | null {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
      continue;
    }
    if (codeUnit <= 0x7ff) {
      byteLength += 2;
      continue;
    }
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return null;
      byteLength += 4;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return null;
    byteLength += 3;
  }
  return byteLength;
}

function isNormalizedWorkspacePathV1(value: unknown): value is string {
  const byteLength = typeof value === "string" ? utf8ByteLengthV1(value) : null;
  if (
    typeof value !== "string" || value.length === 0 || value.startsWith("/") ||
    value.endsWith("/") || value.includes("\0") ||
    byteLength === null || byteLength > workspacePathMaximumUtf8BytesV1
  ) return false;
  const components = value.split("/");
  return components.length <= workspacePathMaximumComponentsV1 &&
    components.every((component) =>
      component.length > 0 && component !== "." && component !== ".."
    );
}

function admitExecutionBindingV1(value: unknown): BrowserPiWorkerExecutionBindingV1 | null {
  const binding = exactDataRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "expectedGeneration",
  ]);
  if (
    binding === null || binding.revision !== 1 || !isIdentifierV1(binding.programId) ||
    !isIdentifierV1(binding.workspaceId) || !isIdentifierV1(binding.workspaceSessionId) ||
    !isPositiveSafeIntegerV1(binding.expectedGeneration)
  ) return null;
  return {
    revision: 1,
    programId: binding.programId,
    workspaceId: binding.workspaceId,
    workspaceSessionId: binding.workspaceSessionId,
    expectedGeneration: binding.expectedGeneration,
  };
}

function admitWorkspaceRequestRecordV1(value: unknown): BrowserPiWorkspaceRequestRecordV1 | null {
  const attach = exactDataRecordV1(value, ["method", "descriptor"]);
  if (attach !== null && attach.method === "attach_workspace") {
    const descriptor = admitExecutionBindingV1(attach.descriptor);
    if (descriptor === null) return null;
    return { method: "attach_workspace", descriptor };
  }
  const scoped = exactDataRecordV1(value, ["method", "workspaceSessionId"]);
  if (
    scoped !== null &&
    (scoped.method === "close_workspace" || scoped.method === "query_workspace") &&
    isIdentifierV1(scoped.workspaceSessionId)
  ) {
    return { method: scoped.method, workspaceSessionId: scoped.workspaceSessionId };
  }
  const acknowledge = exactDataRecordV1(value, [
    "method",
    "workspaceSessionId",
    "throughSequence",
  ]);
  if (
    acknowledge !== null && acknowledge.method === "acknowledge_workspace_receipts" &&
    isIdentifierV1(acknowledge.workspaceSessionId) &&
    isPositiveSafeIntegerV1(acknowledge.throughSequence)
  ) {
    return {
      method: "acknowledge_workspace_receipts",
      workspaceSessionId: acknowledge.workspaceSessionId,
      throughSequence: acknowledge.throughSequence,
    };
  }
  return null;
}

function isWorkspaceDiagnosticCodeV1(
  value: unknown,
): value is BrowserPiWorkspaceMutationReceiptWireV1["diagnosticCode"] {
  return value === null || value === "cancelled" || value === "path_rejected" ||
    value === "capacity_exceeded" || value === "execution_failed";
}

const browserPiWorkspaceBashChangedPathMaximumV1 = 64;
const browserPiWorkspaceBashGenerationDeltaMaximumV1 = 128;

export function admitBrowserPiWorkspaceMutationReceiptWireV1(
  value: unknown,
): BrowserPiWorkspaceMutationReceiptWireV1 | null {
  const receipt = exactDataRecordV1(value, [
    "revision",
    "sequence",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "sessionId",
    "runId",
    "toolCallId",
    "tool",
    "expectedGeneration",
    "baseGeneration",
    "resultingGeneration",
    "outcome",
    "effect",
    "changedPaths",
    "diagnosticCode",
  ]);
  if (
    receipt === null || receipt.revision !== 1 || !isPositiveSafeIntegerV1(receipt.sequence) ||
    !isIdentifierV1(receipt.programId) || !isIdentifierV1(receipt.workspaceId) ||
    !isIdentifierV1(receipt.workspaceSessionId) || !isIdentifierV1(receipt.sessionId) ||
    !isIdentifierV1(receipt.runId) || !isIdentifierV1(receipt.toolCallId) ||
    (receipt.tool !== "write" && receipt.tool !== "edit" && receipt.tool !== "bash") ||
    !isPositiveSafeIntegerV1(receipt.expectedGeneration) ||
    !isPositiveSafeIntegerV1(receipt.baseGeneration) ||
    !isPositiveSafeIntegerV1(receipt.resultingGeneration) ||
    receipt.expectedGeneration > receipt.baseGeneration ||
    (receipt.outcome !== "succeeded" && receipt.outcome !== "failed" &&
      receipt.outcome !== "cancelled") ||
    (receipt.effect !== "none" && receipt.effect !== "changed") ||
    !isWorkspaceDiagnosticCodeV1(receipt.diagnosticCode)
  ) return null;

  const changedPaths = exactArrayV1(
    receipt.changedPaths,
    receipt.tool === "bash" ? browserPiWorkspaceBashChangedPathMaximumV1 : 1,
  );
  if (changedPaths === null) return null;
  if (receipt.effect === "none") {
    if (changedPaths.length !== 0 || receipt.resultingGeneration !== receipt.baseGeneration) {
      return null;
    }
  } else {
    if (
      changedPaths.length === 0 ||
      changedPaths.some((path) => !isNormalizedWorkspacePathV1(path)) ||
      new Set(changedPaths).size !== changedPaths.length
    ) return null;
    const generationDelta = receipt.resultingGeneration - receipt.baseGeneration;
    if (
      receipt.tool === "bash"
        ? generationDelta < 1 ||
          generationDelta > browserPiWorkspaceBashGenerationDeltaMaximumV1
        : changedPaths.length !== 1 || generationDelta !== 1
    ) return null;
  }
  if (
    (receipt.outcome === "succeeded" && receipt.diagnosticCode !== null) ||
    (receipt.outcome === "cancelled" && receipt.diagnosticCode !== "cancelled") ||
    (receipt.outcome === "failed" &&
      (receipt.diagnosticCode === null || receipt.diagnosticCode === "cancelled"))
  ) return null;

  return {
    revision: 1,
    sequence: receipt.sequence,
    programId: receipt.programId,
    workspaceId: receipt.workspaceId,
    workspaceSessionId: receipt.workspaceSessionId,
    sessionId: receipt.sessionId,
    runId: receipt.runId,
    toolCallId: receipt.toolCallId,
    tool: receipt.tool,
    expectedGeneration: receipt.expectedGeneration,
    baseGeneration: receipt.baseGeneration,
    resultingGeneration: receipt.resultingGeneration,
    outcome: receipt.outcome,
    effect: receipt.effect,
    changedPaths: changedPaths as readonly string[],
    diagnosticCode: receipt.diagnosticCode,
  };
}

export function admitBrowserPiWorkspaceSnapshotWireV1(
  value: unknown,
): BrowserPiWorkspaceSnapshotWireV1 | null {
  const snapshot = exactDataRecordV1(value, [
    "revision",
    "phase",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "generation",
    "receipts",
  ]);
  if (
    snapshot === null || snapshot.revision !== 1 ||
    (snapshot.phase !== "open" && snapshot.phase !== "closed") ||
    !isIdentifierV1(snapshot.programId) || !isIdentifierV1(snapshot.workspaceId) ||
    !isIdentifierV1(snapshot.workspaceSessionId) ||
    !isPositiveSafeIntegerV1(snapshot.generation)
  ) return null;
  const rawReceipts = exactArrayV1(snapshot.receipts, workspaceReceiptMaximumV1);
  if (rawReceipts === null) return null;
  const receipts: BrowserPiWorkspaceMutationReceiptWireV1[] = [];
  for (const rawReceipt of rawReceipts) {
    const receipt = admitBrowserPiWorkspaceMutationReceiptWireV1(rawReceipt);
    const predecessor = receipts.at(-1);
    if (
      receipt === null || receipt.programId !== snapshot.programId ||
      receipt.workspaceId !== snapshot.workspaceId ||
      receipt.workspaceSessionId !== snapshot.workspaceSessionId ||
      receipt.resultingGeneration > snapshot.generation ||
      (predecessor !== undefined && receipt.sequence !== predecessor.sequence + 1)
    ) return null;
    receipts.push(receipt);
  }
  return {
    revision: 1,
    phase: snapshot.phase,
    programId: snapshot.programId,
    workspaceId: snapshot.workspaceId,
    workspaceSessionId: snapshot.workspaceSessionId,
    generation: snapshot.generation,
    receipts,
  };
}

export function admitBrowserPiWorkerInboundMessageV1(
  value: unknown,
): BrowserPiWorkerInboundMessageV1 | null {
  const discriminator = exactDataRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "record",
    "execution",
  ]) ?? exactDataRecordV1(value, ["revision", "kind", "requestId", "record"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "runtime", "credential"]);
  if (
    discriminator === null || discriminator.revision !== 1 ||
    !isRequestIdV1(discriminator.requestId)
  ) return null;
  if (discriminator.kind === "workspace_request") {
    if (Object.hasOwn(discriminator, "execution")) return null;
    const record = admitWorkspaceRequestRecordV1(discriminator.record);
    if (record === null) return null;
    return {
      revision: 1,
      kind: "workspace_request",
      requestId: discriminator.requestId,
      record,
    };
  }
  if (discriminator.kind === "rpc_request") {
    const request = admitBrowserPiEngineRequestV1(discriminator.record);
    if (request?.method === "submit") {
      const execution = admitExecutionBindingV1(discriminator.execution);
      const submit = admitCreatorAgentSubmitTextV1(request.params.text);
      if (
        execution === null || submit.kind === "rejected" ||
        execution.programId !== submit.value.programId
      ) return null;
      return {
        revision: 1,
        kind: "rpc_request",
        requestId: discriminator.requestId,
        record: discriminator.record,
        execution,
      };
    }
    // Invalid inner records still reach the existing inner admission and
    // `invalid_request` response. Only a valid submit may carry execution data.
    if (Object.hasOwn(discriminator, "execution")) return null;
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

function admitWorkspaceSuccessResponseV1(
  value: unknown,
): BrowserPiWorkspaceSuccessResponseV1 | null {
  const ordinary = exactDataRecordV1(value, ["method", "snapshot"]);
  if (
    ordinary !== null &&
    (ordinary.method === "attach_workspace" || ordinary.method === "close_workspace" ||
      ordinary.method === "query_workspace")
  ) {
    const snapshot = admitBrowserPiWorkspaceSnapshotWireV1(ordinary.snapshot);
    if (
      snapshot === null || (ordinary.method === "attach_workspace" && snapshot.phase !== "open") ||
      (ordinary.method === "close_workspace" && snapshot.phase !== "closed")
    ) return null;
    return { method: ordinary.method, snapshot };
  }
  const acknowledge = exactDataRecordV1(value, [
    "method",
    "throughSequence",
    "snapshot",
  ]);
  const throughSequence = acknowledge?.throughSequence;
  if (
    acknowledge === null || acknowledge.method !== "acknowledge_workspace_receipts" ||
    !isPositiveSafeIntegerV1(throughSequence)
  ) return null;
  const snapshot = admitBrowserPiWorkspaceSnapshotWireV1(acknowledge.snapshot);
  if (
    snapshot === null ||
    snapshot.receipts.some((receipt) => receipt.sequence <= throughSequence)
  ) return null;
  return {
    method: "acknowledge_workspace_receipts",
    throughSequence,
    snapshot,
  };
}

function isWorkspaceFailureCodeV1(value: unknown): value is BrowserPiWorkspaceFailureCodeV1 {
  return value === "not_initialized" || value === "invalid_request" ||
    value === "workspace_busy" || value === "workspace_mismatch" ||
    value === "receipt_sequence_invalid" || value === "workspace_failed";
}

export function admitBrowserPiWorkerWorkspaceOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerWorkspaceOutboundMessageV1 | null {
  const event = exactDataRecordV1(value, ["revision", "kind", "receipt"]);
  if (event !== null && event.revision === 1 && event.kind === "workspace_receipt") {
    const receipt = admitBrowserPiWorkspaceMutationReceiptWireV1(event.receipt);
    return receipt === null ? null : { revision: 1, kind: "workspace_receipt", receipt };
  }

  const success = exactDataRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "response",
  ]);
  if (
    success !== null && success.revision === 1 && success.kind === "workspace_response" &&
    isRequestIdV1(success.requestId) && success.ok === true
  ) {
    const response = admitWorkspaceSuccessResponseV1(success.response);
    if (response === null) return null;
    return {
      revision: 1,
      kind: "workspace_response",
      requestId: success.requestId,
      ok: true,
      response,
    };
  }

  const failure = exactDataRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "code",
  ]);
  if (
    failure === null || failure.revision !== 1 || failure.kind !== "workspace_response" ||
    !isRequestIdV1(failure.requestId) || failure.ok !== false ||
    !isWorkspaceFailureCodeV1(failure.code)
  ) return null;
  return {
    revision: 1,
    kind: "workspace_response",
    requestId: failure.requestId,
    ok: false,
    code: failure.code,
  };
}

export function admitBrowserPiWorkerAnyOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerAnyOutboundMessageV1 | null {
  return admitBrowserPiWorkerWorkspaceOutboundMessageV1(value) ??
    admitBrowserPiWorkerOutboundMessageV1(value);
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
