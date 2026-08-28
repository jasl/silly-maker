// SPDX-License-Identifier: MIT

import {
  admitProgramWorkspaceSnapshotReceiptV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "./contracts.ts";

export const browserWorkspaceHostProtocolRevisionV1 = 1 as const;
export const browserWorkspaceFormatRevisionV1 = 1 as const;
/** Current Pi 0.84.3 whole-value read/write payload guard, never an OPFS file or volume limit. */
export const browserWorkspaceNativePiToolPayloadMaximumBytesV1 = 256 * 1024;
export const browserWorkspaceHostReceiptMaximumV1 = 32;
export const browserWorkspaceHostPathMaximumUtf8BytesV1 = 512;
export const browserWorkspaceHostPathMaximumPartsV1 = 32;
export const browserWorkspaceBashMutationAttemptMaximumV1 = 128;
export const browserWorkspaceBashChangedPathMaximumV1 = 64;
export const browserWorkspaceShellCommandMaximumUtf8BytesV1 = 16 * 1024;
export const browserWorkspaceShellEnvironmentMaximumEntriesV1 = 32;
export const browserWorkspaceShellEnvironmentMaximumUtf8BytesV1 = 8 * 1024;
export const browserWorkspaceShellOutputMaximumUtf8BytesV1 = 256 * 1024;
export const browserWorkspaceShellRequestedTimeoutMaximumMillisecondsV1 = 30_000;
export const browserWorkspaceDownloadFileNameMaximumUtf8BytesV1 = 255;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const shellEnvironmentKeyPatternV1 = /^[a-zA-Z_][a-zA-Z0-9_]*$/u;

export function validBrowserWorkspaceDownloadFileNameV1(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value === "." || value === "..") {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined || codePoint <= 0x1f || codePoint === 0x7f || character === "/" ||
      character === "\\"
    ) return false;
  }
  return new TextEncoder().encode(value).byteLength <=
    browserWorkspaceDownloadFileNameMaximumUtf8BytesV1;
}

export interface BrowserWorkspaceVolumeAnchorWireV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
}

export interface BrowserWorkspaceVolumeCandidateWireV1 {
  readonly revision: 1;
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface BrowserWorkspaceExecutionDescriptorWireV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
}

export interface BrowserWorkspaceHostSnapshotWireV1 {
  readonly revision: 1;
  readonly phase: "open" | "closed";
  readonly volumeId: string;
  readonly checkpointId: string;
  readonly descriptor: BrowserWorkspaceExecutionDescriptorWireV1;
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
}

export interface BrowserWorkspaceHostExportProgressWireV1 {
  readonly filesCompleted: number;
  readonly filesTotal: number;
  readonly bytesWritten: number;
  readonly bytesTotal: number;
}

export type BrowserWorkspaceHostExportInboundMessageV1 =
  | {
    readonly revision: 1;
    readonly kind: "workspace_export_cancel";
    readonly exportId: string;
  }
  | {
    readonly revision: 1;
    readonly kind: "workspace_export_start_download";
    readonly exportId: string;
  }
  | {
    readonly revision: 1;
    readonly kind: "workspace_export_release";
    readonly exportId: string;
  };

export type BrowserWorkspaceHostExportFailureCodeV1 =
  | "cancelled"
  | "capacity_exceeded"
  | "storage_unavailable"
  | "request_failed";

export type BrowserWorkspaceHostExportOutboundMessageV1 =
  | ({
    readonly revision: 1;
    readonly kind: "workspace_export_progress";
    readonly exportId: string;
    readonly sequence: number;
  } & BrowserWorkspaceHostExportProgressWireV1)
  | ({
    readonly revision: 1;
    readonly kind: "workspace_export_ready";
    readonly exportId: string;
    readonly sequence: number;
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserWorkspaceHostExportProgressWireV1)
  | ({
    readonly revision: 1;
    readonly kind: "workspace_export_download_started";
    readonly exportId: string;
    readonly sequence: number;
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserWorkspaceHostExportProgressWireV1)
  | ({
    readonly revision: 1;
    readonly kind: "workspace_export_released";
    readonly exportId: string;
    readonly sequence: number;
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserWorkspaceHostExportProgressWireV1)
  | ({
    readonly revision: 1;
    readonly kind: "workspace_export_failed";
    readonly exportId: string;
    readonly sequence: number;
    readonly code: BrowserWorkspaceHostExportFailureCodeV1;
  } & BrowserWorkspaceHostExportProgressWireV1);

export interface BrowserWorkspaceHostMutationReceiptWireV1 {
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

export type BrowserWorkspaceHostControlRequestRecordV1 =
  | {
    readonly method: "create_candidate";
    readonly programId: string;
    readonly workspaceId: string;
  }
  | { readonly method: "open_workspace"; readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 }
  | { readonly method: "discard_candidate"; readonly volumeId: string }
  | {
    readonly method: "start_export";
    readonly exportId: string;
    readonly workspaceSessionId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly programRevision: number;
    readonly repositoryRevision: number;
    readonly fileName: string;
  }
  | {
    readonly method: "prepare_snapshot";
    readonly workspaceSessionId: string;
    readonly snapshotId: string;
    readonly proposalId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly programRevision: number;
    readonly baseRepositoryRevision: number;
  }
  | {
    readonly method: "query_snapshot_candidate";
    readonly workspaceSessionId: string;
  }
  | {
    readonly method:
      | "query_retained_snapshot"
      | "resume_snapshot_publication"
      | "adopt_snapshot"
      | "discard_snapshot";
    readonly workspaceSessionId: string;
    readonly expected: ProgramWorkspaceSnapshotReceiptV1;
  }
  | {
    readonly method:
      | "close_workspace"
      | "query_workspace"
      | "attach_environment"
      | "capture_review_head";
    readonly workspaceSessionId: string;
  };

export interface BrowserWorkspaceHostControlRequestV1 {
  readonly revision: 1;
  readonly kind: "control_request";
  readonly requestId: number;
  readonly record: BrowserWorkspaceHostControlRequestRecordV1;
}

export type BrowserWorkspaceHostControlFailureCodeV1 =
  | "invalid_request"
  | "workspace_busy"
  | "workspace_mismatch"
  | "volume_busy"
  | "volume_missing"
  | "volume_corrupt"
  | "candidate_mismatch"
  | "environment_attached"
  | "export_stale"
  | "snapshot_stale"
  | "snapshot_mismatch"
  | "storage_unavailable"
  | "capacity_exceeded"
  | "request_failed"
  | "disposed";

export interface BrowserWorkspaceHostControlSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "control_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response:
    | {
      readonly method:
        | "open_workspace"
        | "close_workspace"
        | "query_workspace"
        | "attach_environment"
        | "capture_review_head";
      readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
    }
    | {
      readonly method: "start_export";
      readonly exportId: string;
      readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
    }
    | {
      readonly method: "prepare_snapshot" | "resume_snapshot_publication";
      readonly receipt: ProgramWorkspaceSnapshotReceiptV1;
    }
    | {
      readonly method: "query_snapshot_candidate" | "query_retained_snapshot";
      readonly receipt: ProgramWorkspaceSnapshotReceiptV1 | null;
    }
    | {
      readonly method: "adopt_snapshot";
      readonly result: "adopted" | "already_retained";
      readonly snapshotId: string;
    }
    | {
      readonly method: "discard_snapshot";
      readonly result: "discarded" | "absent" | "retained";
      readonly snapshotId: string;
    }
    | {
      readonly method: "create_candidate";
      readonly candidate: BrowserWorkspaceVolumeCandidateWireV1;
    }
    | { readonly method: "discard_candidate"; readonly volumeId: string };
}

export interface BrowserWorkspaceHostControlFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "control_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: BrowserWorkspaceHostControlFailureCodeV1;
}

export type BrowserWorkspaceHostControlOutboundMessageV1 =
  | BrowserWorkspaceHostControlSuccessResponseV1
  | BrowserWorkspaceHostControlFailureResponseV1;

export interface BrowserWorkspaceHostExecutionBindingWireV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly expectedGeneration: number;
}

export interface BrowserWorkspaceHostFileInfoWireV1 {
  readonly name: string;
  readonly path: string;
  readonly kind: "file" | "directory";
  readonly size: number;
  readonly mtimeMs: number;
}

export type BrowserWorkspaceHostEnvironmentRequestRecordV1 =
  | {
    readonly method: "begin_run";
    readonly binding: BrowserWorkspaceHostExecutionBindingWireV1;
    readonly sessionId: string;
    readonly runId: string;
  }
  | { readonly method: "abort_run" | "end_run" }
  | {
    readonly method: "begin_tool";
    readonly toolCallId: string;
    readonly tool: "read" | "write" | "edit" | "bash";
  }
  | {
    readonly method: "end_tool";
    readonly toolCallId: string;
    readonly outcome: "succeeded" | "failed" | "cancelled";
  }
  | {
    readonly method: "absolute_path" | "exists" | "canonical_path" | "file_info";
    readonly path: string;
  }
  | { readonly method: "read_binary_file"; readonly path: string }
  | { readonly method: "write_file"; readonly path: string; readonly bytes: Uint8Array }
  | { readonly method: "append_file"; readonly path: string; readonly bytes: Uint8Array }
  | {
    readonly method: "create_temp_file";
    readonly prefix: "bash-";
    readonly suffix: ".log";
  }
  | {
    readonly method: "execute_shell";
    readonly command: string;
    readonly cwd: string;
    readonly env: Readonly<Record<string, string>>;
    readonly inheritEnv: boolean;
    readonly timeoutMilliseconds: number | null;
  }
  | { readonly method: "cancel_tool"; readonly toolCallId: string }
  | { readonly method: "query_receipts" }
  | { readonly method: "acknowledge_receipts"; readonly throughSequence: number };

export interface BrowserWorkspaceHostEnvironmentRequestV1 {
  readonly revision: 1;
  readonly kind: "environment_request";
  readonly requestId: number;
  readonly record: BrowserWorkspaceHostEnvironmentRequestRecordV1;
}

export type BrowserWorkspaceHostEnvironmentSuccessV1 =
  | { readonly method: "begin_run" | "end_run" | "abort_run"; readonly generation: number }
  | { readonly method: "begin_tool"; readonly baseGeneration: number }
  | { readonly method: "end_tool"; readonly generation: number }
  | { readonly method: "absolute_path" | "canonical_path"; readonly value: string }
  | { readonly method: "exists"; readonly value: boolean }
  | { readonly method: "file_info"; readonly value: BrowserWorkspaceHostFileInfoWireV1 }
  | { readonly method: "read_binary_file"; readonly value: Uint8Array }
  | { readonly method: "write_file" | "append_file" | "cancel_tool"; readonly value: null }
  | { readonly method: "create_temp_file"; readonly value: string }
  | {
    readonly method: "execute_shell";
    readonly termination: "completed" | "aborted" | "timeout";
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | null;
  }
  | {
    readonly method: "query_receipts";
    readonly receipts: readonly BrowserWorkspaceHostMutationReceiptWireV1[];
  }
  | { readonly method: "acknowledge_receipts"; readonly throughSequence: number };

export type BrowserWorkspaceHostFileErrorCodeV1 =
  | "aborted"
  | "not_found"
  | "permission_denied"
  | "not_directory"
  | "is_directory"
  | "invalid"
  | "not_supported"
  | "unknown";

export interface BrowserWorkspaceHostFileErrorWireV1 {
  readonly kind: "file_error";
  readonly code: BrowserWorkspaceHostFileErrorCodeV1;
  readonly message: string;
  readonly path: string | null;
}

export type BrowserWorkspaceHostEnvironmentFailureCodeV1 =
  | "invalid_request"
  | "invalid_binding"
  | "workspace_closed"
  | "run_busy"
  | "run_not_current"
  | "duplicate_run"
  | "duplicate_tool_call"
  | "scope_busy"
  | "scope_missing"
  | "cursor_mismatch"
  | "receipt_queue_full"
  | "request_failed"
  | "disposed";

export interface BrowserWorkspaceHostEnvironmentSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "environment_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: BrowserWorkspaceHostEnvironmentSuccessV1;
}

export interface BrowserWorkspaceHostEnvironmentFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "environment_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: BrowserWorkspaceHostEnvironmentFailureCodeV1;
  readonly fileError: BrowserWorkspaceHostFileErrorWireV1 | null;
}

export interface BrowserWorkspaceHostEnvironmentReceiptEventV1 {
  readonly revision: 1;
  readonly kind: "workspace_receipt";
  readonly receipt: BrowserWorkspaceHostMutationReceiptWireV1;
}

export type BrowserWorkspaceHostEnvironmentOutboundMessageV1 =
  | BrowserWorkspaceHostEnvironmentSuccessResponseV1
  | BrowserWorkspaceHostEnvironmentFailureResponseV1
  | BrowserWorkspaceHostEnvironmentReceiptEventV1;

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

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function requestIdV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function boundedMessageV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

function exactArrayV1(value: unknown, maximumLength: number): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length > maximumLength) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).length !== value.length + 1) return null;
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

function utf8LengthV1(value: string): number | null {
  try {
    return new TextEncoder().encode(value).byteLength;
  } catch {
    return null;
  }
}

function admittedShellEnvironmentV1(value: unknown): Readonly<Record<string, string>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (keys.length > browserWorkspaceShellEnvironmentMaximumEntriesV1) return null;
    let byteLength = 0;
    const admitted: Record<string, string> = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "string" ||
        !shellEnvironmentKeyPatternV1.test(key)
      ) return null;
      const keyBytes = utf8LengthV1(key);
      const valueBytes = utf8LengthV1(descriptor.value);
      if (keyBytes === null || valueBytes === null) return null;
      byteLength += keyBytes + valueBytes;
      if (byteLength > browserWorkspaceShellEnvironmentMaximumUtf8BytesV1) return null;
      admitted[key] = descriptor.value;
    }
    return admitted;
  } catch {
    return null;
  }
}

function isWorkspaceAbsolutePathV1(value: unknown): value is string {
  return typeof value === "string" &&
    (value === "/workspace" ||
      (value.startsWith("/workspace/") &&
        isBrowserWorkspaceHostNormalizedPathV1(value.slice("/workspace/".length))));
}

export function isBrowserWorkspaceHostNormalizedPathV1(value: unknown): value is string {
  if (
    typeof value !== "string" || value.length === 0 || value.startsWith("/") ||
    value.endsWith("/") || value.includes("\0") || value.includes("\\")
  ) return false;
  const parts = value.split("/");
  const byteLength = utf8LengthV1(value);
  return byteLength !== null && byteLength <= browserWorkspaceHostPathMaximumUtf8BytesV1 &&
    parts.length <= browserWorkspaceHostPathMaximumPartsV1 &&
    parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

export function admitBrowserWorkspaceVolumeAnchorWireV1(
  value: unknown,
): BrowserWorkspaceVolumeAnchorWireV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "volumeId",
    "workspaceFormat",
  ]);
  if (
    record === null || record.revision !== 1 || !identifierV1(record.programId) ||
    !identifierV1(record.workspaceId) || !identifierV1(record.volumeId) ||
    record.workspaceFormat !== 1
  ) return null;
  return {
    revision: 1,
    programId: record.programId,
    workspaceId: record.workspaceId,
    volumeId: record.volumeId,
    workspaceFormat: 1,
  };
}

export function admitBrowserWorkspaceVolumeCandidateWireV1(
  value: unknown,
): BrowserWorkspaceVolumeCandidateWireV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "anchor",
    "checkpointId",
    "generation",
  ]);
  if (
    record === null || record.revision !== 1 || !identifierV1(record.checkpointId) ||
    !positiveSafeIntegerV1(record.generation)
  ) return null;
  const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(record.anchor);
  if (anchor === null) return null;
  return {
    revision: 1,
    anchor,
    checkpointId: record.checkpointId,
    generation: record.generation,
  };
}

function admitExecutionBindingV1(
  value: unknown,
): BrowserWorkspaceHostExecutionBindingWireV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "expectedGeneration",
  ]);
  if (
    record === null || record.revision !== 1 || !identifierV1(record.programId) ||
    !identifierV1(record.workspaceId) || !identifierV1(record.workspaceSessionId) ||
    !positiveSafeIntegerV1(record.expectedGeneration)
  ) return null;
  return {
    revision: 1,
    programId: record.programId,
    workspaceId: record.workspaceId,
    workspaceSessionId: record.workspaceSessionId,
    expectedGeneration: record.expectedGeneration,
  };
}

export function admitBrowserWorkspaceHostControlRequestV1(
  value: unknown,
): BrowserWorkspaceHostControlRequestV1 | null {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (
    envelope === null || envelope.revision !== 1 || envelope.kind !== "control_request" ||
    !requestIdV1(envelope.requestId)
  ) return null;
  const create = exactRecordV1(envelope.record, ["method", "programId", "workspaceId"]);
  if (
    create !== null && create.method === "create_candidate" && identifierV1(create.programId) &&
    identifierV1(create.workspaceId)
  ) {
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: {
        method: "create_candidate",
        programId: create.programId,
        workspaceId: create.workspaceId,
      },
    };
  }
  const open = exactRecordV1(envelope.record, ["method", "anchor"]);
  if (open !== null && open.method === "open_workspace") {
    const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(open.anchor);
    if (anchor === null) return null;
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: { method: "open_workspace", anchor },
    };
  }
  const discard = exactRecordV1(envelope.record, ["method", "volumeId"]);
  if (
    discard !== null && discard.method === "discard_candidate" &&
    identifierV1(discard.volumeId)
  ) {
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: { method: "discard_candidate", volumeId: discard.volumeId },
    };
  }
  const startExport = exactRecordV1(envelope.record, [
    "method",
    "exportId",
    "workspaceSessionId",
    "expectedCheckpointId",
    "expectedGeneration",
    "programRevision",
    "repositoryRevision",
    "fileName",
  ]);
  if (
    startExport !== null && startExport.method === "start_export" &&
    identifierV1(startExport.exportId) && identifierV1(startExport.workspaceSessionId) &&
    identifierV1(startExport.expectedCheckpointId) &&
    positiveSafeIntegerV1(startExport.expectedGeneration) &&
    positiveSafeIntegerV1(startExport.programRevision) &&
    positiveSafeIntegerV1(startExport.repositoryRevision) &&
    validBrowserWorkspaceDownloadFileNameV1(startExport.fileName)
  ) {
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: {
        method: "start_export",
        exportId: startExport.exportId,
        workspaceSessionId: startExport.workspaceSessionId,
        expectedCheckpointId: startExport.expectedCheckpointId,
        expectedGeneration: startExport.expectedGeneration,
        programRevision: startExport.programRevision,
        repositoryRevision: startExport.repositoryRevision,
        fileName: startExport.fileName,
      },
    };
  }
  const prepareSnapshot = exactRecordV1(envelope.record, [
    "method",
    "workspaceSessionId",
    "snapshotId",
    "proposalId",
    "expectedCheckpointId",
    "expectedGeneration",
    "programRevision",
    "baseRepositoryRevision",
  ]);
  if (
    prepareSnapshot !== null && prepareSnapshot.method === "prepare_snapshot" &&
    identifierV1(prepareSnapshot.workspaceSessionId) &&
    identifierV1(prepareSnapshot.snapshotId) && identifierV1(prepareSnapshot.proposalId) &&
    identifierV1(prepareSnapshot.expectedCheckpointId) &&
    positiveSafeIntegerV1(prepareSnapshot.expectedGeneration) &&
    positiveSafeIntegerV1(prepareSnapshot.programRevision) &&
    positiveSafeIntegerV1(prepareSnapshot.baseRepositoryRevision)
  ) {
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: {
        method: "prepare_snapshot",
        workspaceSessionId: prepareSnapshot.workspaceSessionId,
        snapshotId: prepareSnapshot.snapshotId,
        proposalId: prepareSnapshot.proposalId,
        expectedCheckpointId: prepareSnapshot.expectedCheckpointId,
        expectedGeneration: prepareSnapshot.expectedGeneration,
        programRevision: prepareSnapshot.programRevision,
        baseRepositoryRevision: prepareSnapshot.baseRepositoryRevision,
      },
    };
  }
  const scopedSnapshot = exactRecordV1(envelope.record, ["method", "workspaceSessionId"]);
  if (
    scopedSnapshot !== null &&
    scopedSnapshot.method === "query_snapshot_candidate" &&
    identifierV1(scopedSnapshot.workspaceSessionId)
  ) {
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: {
        method: scopedSnapshot.method,
        workspaceSessionId: scopedSnapshot.workspaceSessionId,
      },
    };
  }
  const receiptBoundSnapshot = exactRecordV1(envelope.record, [
    "method",
    "workspaceSessionId",
    "expected",
  ]);
  if (
    receiptBoundSnapshot !== null &&
    (receiptBoundSnapshot.method === "query_retained_snapshot" ||
      receiptBoundSnapshot.method === "resume_snapshot_publication" ||
      receiptBoundSnapshot.method === "adopt_snapshot" ||
      receiptBoundSnapshot.method === "discard_snapshot") &&
    identifierV1(receiptBoundSnapshot.workspaceSessionId)
  ) {
    const expected = admitProgramWorkspaceSnapshotReceiptV1(
      receiptBoundSnapshot.expected,
    );
    if (expected === null) return null;
    return {
      revision: 1,
      kind: "control_request",
      requestId: envelope.requestId,
      record: {
        method: receiptBoundSnapshot.method,
        workspaceSessionId: receiptBoundSnapshot.workspaceSessionId,
        expected,
      },
    };
  }
  const scoped = exactRecordV1(envelope.record, ["method", "workspaceSessionId"]);
  if (
    scoped === null ||
    (scoped.method !== "close_workspace" && scoped.method !== "query_workspace" &&
      scoped.method !== "attach_environment" && scoped.method !== "capture_review_head") ||
    !identifierV1(scoped.workspaceSessionId)
  ) return null;
  return {
    revision: 1,
    kind: "control_request",
    requestId: envelope.requestId,
    record: { method: scoped.method, workspaceSessionId: scoped.workspaceSessionId },
  };
}

export function admitBrowserWorkspaceHostEnvironmentRequestV1(
  value: unknown,
): BrowserWorkspaceHostEnvironmentRequestV1 | null {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (
    envelope === null || envelope.revision !== 1 || envelope.kind !== "environment_request" ||
    !requestIdV1(envelope.requestId)
  ) return null;
  const unit = exactRecordV1(envelope.record, ["method"]);
  if (
    unit !== null &&
    (unit.method === "abort_run" || unit.method === "end_run" ||
      unit.method === "query_receipts")
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: { method: unit.method },
    };
  }
  const beginRun = exactRecordV1(envelope.record, ["method", "binding", "sessionId", "runId"]);
  if (
    beginRun !== null && beginRun.method === "begin_run" && identifierV1(beginRun.sessionId) &&
    identifierV1(beginRun.runId)
  ) {
    const binding = admitExecutionBindingV1(beginRun.binding);
    if (binding === null) return null;
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: {
        method: "begin_run",
        binding,
        sessionId: beginRun.sessionId,
        runId: beginRun.runId,
      },
    };
  }
  const beginTool = exactRecordV1(envelope.record, ["method", "toolCallId", "tool"]);
  if (
    beginTool !== null && beginTool.method === "begin_tool" &&
    identifierV1(beginTool.toolCallId) &&
    (beginTool.tool === "read" || beginTool.tool === "write" || beginTool.tool === "edit" ||
      beginTool.tool === "bash")
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: {
        method: "begin_tool",
        toolCallId: beginTool.toolCallId,
        tool: beginTool.tool,
      },
    };
  }
  const endTool = exactRecordV1(envelope.record, ["method", "toolCallId", "outcome"]);
  if (
    endTool !== null && endTool.method === "end_tool" && identifierV1(endTool.toolCallId) &&
    (endTool.outcome === "succeeded" || endTool.outcome === "failed" ||
      endTool.outcome === "cancelled")
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: {
        method: "end_tool",
        toolCallId: endTool.toolCallId,
        outcome: endTool.outcome,
      },
    };
  }
  const pathCall = exactRecordV1(envelope.record, ["method", "path"]);
  if (
    pathCall !== null && typeof pathCall.path === "string" &&
    (pathCall.method === "absolute_path" || pathCall.method === "exists" ||
      pathCall.method === "canonical_path" || pathCall.method === "file_info" ||
      pathCall.method === "read_binary_file")
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: { method: pathCall.method, path: pathCall.path },
    };
  }
  const write = exactRecordV1(envelope.record, ["method", "path", "bytes"]);
  if (
    write !== null && (write.method === "write_file" || write.method === "append_file") &&
    typeof write.path === "string" &&
    write.bytes instanceof Uint8Array &&
    write.bytes.byteLength <= browserWorkspaceNativePiToolPayloadMaximumBytesV1
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: { method: write.method, path: write.path, bytes: write.bytes },
    };
  }
  const createTemp = exactRecordV1(envelope.record, ["method", "prefix", "suffix"]);
  if (
    createTemp !== null && createTemp.method === "create_temp_file" &&
    createTemp.prefix === "bash-" && createTemp.suffix === ".log"
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: { method: "create_temp_file", prefix: "bash-", suffix: ".log" },
    };
  }
  const executeShell = exactRecordV1(envelope.record, [
    "method",
    "command",
    "cwd",
    "env",
    "inheritEnv",
    "timeoutMilliseconds",
  ]);
  if (
    executeShell !== null && executeShell.method === "execute_shell" &&
    typeof executeShell.command === "string" &&
    (utf8LengthV1(executeShell.command) ?? Number.POSITIVE_INFINITY) <=
      browserWorkspaceShellCommandMaximumUtf8BytesV1 &&
    isWorkspaceAbsolutePathV1(executeShell.cwd) &&
    typeof executeShell.inheritEnv === "boolean" &&
    (executeShell.timeoutMilliseconds === null ||
      (typeof executeShell.timeoutMilliseconds === "number" &&
        Number.isFinite(executeShell.timeoutMilliseconds) &&
        executeShell.timeoutMilliseconds > 0 &&
        executeShell.timeoutMilliseconds <=
          browserWorkspaceShellRequestedTimeoutMaximumMillisecondsV1))
  ) {
    const env = admittedShellEnvironmentV1(executeShell.env);
    if (env === null) return null;
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: {
        method: "execute_shell",
        command: executeShell.command,
        cwd: executeShell.cwd,
        env,
        inheritEnv: executeShell.inheritEnv,
        timeoutMilliseconds: executeShell.timeoutMilliseconds,
      },
    };
  }
  const cancelTool = exactRecordV1(envelope.record, ["method", "toolCallId"]);
  if (
    cancelTool !== null && cancelTool.method === "cancel_tool" &&
    identifierV1(cancelTool.toolCallId)
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: { method: "cancel_tool", toolCallId: cancelTool.toolCallId },
    };
  }
  const acknowledge = exactRecordV1(envelope.record, ["method", "throughSequence"]);
  if (
    acknowledge !== null && acknowledge.method === "acknowledge_receipts" &&
    positiveSafeIntegerV1(acknowledge.throughSequence)
  ) {
    return {
      revision: 1,
      kind: "environment_request",
      requestId: envelope.requestId,
      record: {
        method: "acknowledge_receipts",
        throughSequence: acknowledge.throughSequence,
      },
    };
  }
  return null;
}

function admitReceiptV1(value: unknown): BrowserWorkspaceHostMutationReceiptWireV1 | null {
  const record = exactRecordV1(value, [
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
    record === null || record.revision !== 1 || !positiveSafeIntegerV1(record.sequence) ||
    !identifierV1(record.programId) || !identifierV1(record.workspaceId) ||
    !identifierV1(record.workspaceSessionId) || !identifierV1(record.sessionId) ||
    !identifierV1(record.runId) || !identifierV1(record.toolCallId) ||
    (record.tool !== "write" && record.tool !== "edit" && record.tool !== "bash") ||
    !positiveSafeIntegerV1(record.expectedGeneration) ||
    !positiveSafeIntegerV1(record.baseGeneration) ||
    !positiveSafeIntegerV1(record.resultingGeneration) ||
    (record.outcome !== "succeeded" && record.outcome !== "failed" &&
      record.outcome !== "cancelled") ||
    (record.effect !== "none" && record.effect !== "changed") ||
    (record.diagnosticCode !== null && record.diagnosticCode !== "cancelled" &&
      record.diagnosticCode !== "path_rejected" &&
      record.diagnosticCode !== "capacity_exceeded" &&
      record.diagnosticCode !== "execution_failed")
  ) return null;
  const changedPaths = exactArrayV1(
    record.changedPaths,
    record.tool === "bash" ? browserWorkspaceBashChangedPathMaximumV1 : 1,
  );
  const normalizedPaths = changedPaths !== null && changedPaths.every(
    isBrowserWorkspaceHostNormalizedPathV1,
  );
  const uniquePaths = changedPaths !== null && new Set(changedPaths).size === changedPaths.length;
  const bashChanged = record.tool === "bash" && record.effect === "changed" &&
    changedPaths !== null && changedPaths.length > 0 && normalizedPaths && uniquePaths &&
    record.resultingGeneration > record.baseGeneration &&
    record.resultingGeneration - record.baseGeneration <=
      browserWorkspaceBashMutationAttemptMaximumV1;
  const nativeChanged = record.tool !== "bash" && record.effect === "changed" &&
    changedPaths !== null && changedPaths.length === 1 && normalizedPaths &&
    record.resultingGeneration === record.baseGeneration + 1;
  if (
    changedPaths === null ||
    (record.effect === "none" &&
      (changedPaths.length !== 0 || record.resultingGeneration !== record.baseGeneration)) ||
    (record.effect === "changed" && !nativeChanged && !bashChanged)
  ) return null;
  if (
    (record.outcome === "succeeded" && record.diagnosticCode !== null) ||
    (record.outcome === "cancelled" && record.diagnosticCode !== "cancelled") ||
    (record.outcome === "failed" &&
      (record.diagnosticCode === null || record.diagnosticCode === "cancelled"))
  ) return null;
  return record as unknown as BrowserWorkspaceHostMutationReceiptWireV1;
}

function admitDescriptorV1(value: unknown): BrowserWorkspaceExecutionDescriptorWireV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "generation",
  ]);
  if (
    record === null || record.revision !== 1 || !identifierV1(record.programId) ||
    !identifierV1(record.workspaceId) || !identifierV1(record.workspaceSessionId) ||
    !positiveSafeIntegerV1(record.generation)
  ) return null;
  return record as unknown as BrowserWorkspaceExecutionDescriptorWireV1;
}

function admitSnapshotV1(value: unknown): BrowserWorkspaceHostSnapshotWireV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "phase",
    "volumeId",
    "checkpointId",
    "descriptor",
    "anchor",
  ]);
  if (
    record === null || record.revision !== 1 ||
    (record.phase !== "open" && record.phase !== "closed") || !identifierV1(record.volumeId) ||
    !identifierV1(record.checkpointId)
  ) return null;
  const descriptor = admitDescriptorV1(record.descriptor);
  const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(record.anchor);
  if (
    descriptor === null || anchor === null || record.volumeId !== anchor.volumeId ||
    descriptor.programId !== anchor.programId || descriptor.workspaceId !== anchor.workspaceId
  ) return null;
  return {
    revision: 1,
    phase: record.phase,
    volumeId: record.volumeId,
    checkpointId: record.checkpointId,
    descriptor,
    anchor,
  };
}

export function admitBrowserWorkspaceHostControlOutboundMessageV1(
  value: unknown,
): BrowserWorkspaceHostControlOutboundMessageV1 | null {
  const success = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "response",
  ]);
  if (
    success !== null && success.revision === 1 && success.kind === "control_response" &&
    requestIdV1(success.requestId) && success.ok === true
  ) {
    const response = exactRecordV1(success.response, ["method", "snapshot"]);
    const snapshot = response === null ? null : admitSnapshotV1(response.snapshot);
    if (
      response !== null && snapshot !== null &&
      (response.method === "open_workspace" || response.method === "close_workspace" ||
        response.method === "query_workspace" || response.method === "attach_environment" ||
        response.method === "capture_review_head")
    ) {
      return {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: { method: response.method, snapshot },
      };
    }
    const startedExport = exactRecordV1(success.response, [
      "method",
      "exportId",
      "snapshot",
    ]);
    const exportSnapshot = startedExport === null ? null : admitSnapshotV1(startedExport.snapshot);
    if (
      startedExport !== null && startedExport.method === "start_export" &&
      identifierV1(startedExport.exportId) && exportSnapshot !== null
    ) {
      return {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "start_export",
          exportId: startedExport.exportId,
          snapshot: exportSnapshot,
        },
      };
    }
    const preparedSnapshot = exactRecordV1(success.response, ["method", "receipt"]);
    if (
      preparedSnapshot !== null &&
      (preparedSnapshot.method === "prepare_snapshot" ||
        preparedSnapshot.method === "resume_snapshot_publication")
    ) {
      const receipt = admitProgramWorkspaceSnapshotReceiptV1(preparedSnapshot.receipt);
      return receipt === null ? null : {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: { method: preparedSnapshot.method, receipt },
      };
    }
    const queriedSnapshot = exactRecordV1(success.response, ["method", "receipt"]);
    if (
      queriedSnapshot !== null &&
      (queriedSnapshot.method === "query_snapshot_candidate" ||
        queriedSnapshot.method === "query_retained_snapshot")
    ) {
      const receipt = queriedSnapshot.receipt === null
        ? null
        : admitProgramWorkspaceSnapshotReceiptV1(queriedSnapshot.receipt);
      return queriedSnapshot.receipt !== null && receipt === null ? null : {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: { method: queriedSnapshot.method, receipt },
      };
    }
    const adoptedSnapshot = exactRecordV1(success.response, [
      "method",
      "result",
      "snapshotId",
    ]);
    if (
      adoptedSnapshot !== null && adoptedSnapshot.method === "adopt_snapshot" &&
      (adoptedSnapshot.result === "adopted" ||
        adoptedSnapshot.result === "already_retained") &&
      identifierV1(adoptedSnapshot.snapshotId)
    ) {
      return {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "adopt_snapshot",
          result: adoptedSnapshot.result,
          snapshotId: adoptedSnapshot.snapshotId,
        },
      };
    }
    const discardedSnapshot = exactRecordV1(success.response, [
      "method",
      "result",
      "snapshotId",
    ]);
    if (
      discardedSnapshot !== null && discardedSnapshot.method === "discard_snapshot" &&
      (discardedSnapshot.result === "discarded" || discardedSnapshot.result === "absent" ||
        discardedSnapshot.result === "retained") &&
      identifierV1(discardedSnapshot.snapshotId)
    ) {
      return {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "discard_snapshot",
          result: discardedSnapshot.result,
          snapshotId: discardedSnapshot.snapshotId,
        },
      };
    }
    const candidate = exactRecordV1(success.response, ["method", "candidate"]);
    if (candidate !== null && candidate.method === "create_candidate") {
      const admittedCandidate = admitBrowserWorkspaceVolumeCandidateWireV1(
        candidate.candidate,
      );
      return admittedCandidate === null ? null : {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "create_candidate", candidate: admittedCandidate },
      };
    }
    const discarded = exactRecordV1(success.response, ["method", "volumeId"]);
    if (
      discarded !== null && discarded.method === "discard_candidate" &&
      identifierV1(discarded.volumeId)
    ) {
      return {
        revision: 1,
        kind: "control_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "discard_candidate", volumeId: discarded.volumeId },
      };
    }
    return null;
  }
  const failure = exactRecordV1(value, ["revision", "kind", "requestId", "ok", "code"]);
  if (
    failure === null || failure.revision !== 1 || failure.kind !== "control_response" ||
    !requestIdV1(failure.requestId) || failure.ok !== false ||
    (failure.code !== "invalid_request" && failure.code !== "workspace_busy" &&
      failure.code !== "workspace_mismatch" && failure.code !== "volume_busy" &&
      failure.code !== "volume_missing" && failure.code !== "volume_corrupt" &&
      failure.code !== "environment_attached" &&
      failure.code !== "export_stale" &&
      failure.code !== "snapshot_stale" &&
      failure.code !== "snapshot_mismatch" &&
      failure.code !== "candidate_mismatch" &&
      failure.code !== "storage_unavailable" && failure.code !== "capacity_exceeded" &&
      failure.code !== "request_failed" &&
      failure.code !== "disposed")
  ) return null;
  return failure as unknown as BrowserWorkspaceHostControlFailureResponseV1;
}

function admitExportProgressV1(
  value: Readonly<Record<string, unknown>>,
): BrowserWorkspaceHostExportProgressWireV1 | null {
  if (
    !nonNegativeSafeIntegerV1(value.filesCompleted) ||
    !nonNegativeSafeIntegerV1(value.filesTotal) ||
    value.filesCompleted > value.filesTotal ||
    !nonNegativeSafeIntegerV1(value.bytesWritten) ||
    !nonNegativeSafeIntegerV1(value.bytesTotal) ||
    value.bytesWritten > value.bytesTotal
  ) return null;
  return {
    filesCompleted: value.filesCompleted,
    filesTotal: value.filesTotal,
    bytesWritten: value.bytesWritten,
    bytesTotal: value.bytesTotal,
  };
}

export function admitBrowserWorkspaceHostExportInboundMessageV1(
  value: unknown,
): BrowserWorkspaceHostExportInboundMessageV1 | null {
  const record = exactRecordV1(value, ["revision", "kind", "exportId"]);
  if (
    record === null || record.revision !== 1 || !identifierV1(record.exportId) ||
    (record.kind !== "workspace_export_cancel" &&
      record.kind !== "workspace_export_start_download" &&
      record.kind !== "workspace_export_release")
  ) return null;
  return record as unknown as BrowserWorkspaceHostExportInboundMessageV1;
}

export function admitBrowserWorkspaceHostExportOutboundMessageV1(
  value: unknown,
): BrowserWorkspaceHostExportOutboundMessageV1 | null {
  const progress = exactRecordV1(value, [
    "revision",
    "kind",
    "exportId",
    "sequence",
    "filesCompleted",
    "filesTotal",
    "bytesWritten",
    "bytesTotal",
  ]);
  if (
    progress !== null && progress.revision === 1 &&
    progress.kind === "workspace_export_progress" && identifierV1(progress.exportId) &&
    positiveSafeIntegerV1(progress.sequence)
  ) {
    const admittedProgress = admitExportProgressV1(progress);
    return admittedProgress === null ? null : {
      revision: 1,
      kind: "workspace_export_progress",
      exportId: progress.exportId,
      sequence: progress.sequence,
      ...admittedProgress,
    };
  }
  const ready = exactRecordV1(value, [
    "revision",
    "kind",
    "exportId",
    "sequence",
    "checkpointId",
    "generation",
    "filesCompleted",
    "filesTotal",
    "bytesWritten",
    "bytesTotal",
  ]);
  if (
    ready !== null && ready.revision === 1 && ready.kind === "workspace_export_ready" &&
    identifierV1(ready.exportId) && positiveSafeIntegerV1(ready.sequence) &&
    identifierV1(ready.checkpointId) && positiveSafeIntegerV1(ready.generation)
  ) {
    const admittedProgress = admitExportProgressV1(ready);
    return admittedProgress === null ? null : {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: ready.exportId,
      sequence: ready.sequence,
      checkpointId: ready.checkpointId,
      generation: ready.generation,
      ...admittedProgress,
    };
  }
  const downloadStarted = exactRecordV1(value, [
    "revision",
    "kind",
    "exportId",
    "sequence",
    "checkpointId",
    "generation",
    "filesCompleted",
    "filesTotal",
    "bytesWritten",
    "bytesTotal",
  ]);
  if (
    downloadStarted !== null && downloadStarted.revision === 1 &&
    downloadStarted.kind === "workspace_export_download_started" &&
    identifierV1(downloadStarted.exportId) && positiveSafeIntegerV1(downloadStarted.sequence) &&
    identifierV1(downloadStarted.checkpointId) &&
    positiveSafeIntegerV1(downloadStarted.generation)
  ) {
    const admittedProgress = admitExportProgressV1(downloadStarted);
    return admittedProgress === null ? null : {
      revision: 1,
      kind: "workspace_export_download_started",
      exportId: downloadStarted.exportId,
      sequence: downloadStarted.sequence,
      checkpointId: downloadStarted.checkpointId,
      generation: downloadStarted.generation,
      ...admittedProgress,
    };
  }
  const released = exactRecordV1(value, [
    "revision",
    "kind",
    "exportId",
    "sequence",
    "checkpointId",
    "generation",
    "filesCompleted",
    "filesTotal",
    "bytesWritten",
    "bytesTotal",
  ]);
  if (
    released !== null && released.revision === 1 &&
    released.kind === "workspace_export_released" && identifierV1(released.exportId) &&
    positiveSafeIntegerV1(released.sequence) && identifierV1(released.checkpointId) &&
    positiveSafeIntegerV1(released.generation)
  ) {
    const admittedProgress = admitExportProgressV1(released);
    return admittedProgress === null ? null : {
      revision: 1,
      kind: "workspace_export_released",
      exportId: released.exportId,
      sequence: released.sequence,
      checkpointId: released.checkpointId,
      generation: released.generation,
      ...admittedProgress,
    };
  }
  const failed = exactRecordV1(value, [
    "revision",
    "kind",
    "exportId",
    "sequence",
    "code",
    "filesCompleted",
    "filesTotal",
    "bytesWritten",
    "bytesTotal",
  ]);
  if (
    failed === null || failed.revision !== 1 || failed.kind !== "workspace_export_failed" ||
    !identifierV1(failed.exportId) || !positiveSafeIntegerV1(failed.sequence) ||
    (failed.code !== "cancelled" && failed.code !== "capacity_exceeded" &&
      failed.code !== "storage_unavailable" && failed.code !== "request_failed")
  ) return null;
  const admittedProgress = admitExportProgressV1(failed);
  return admittedProgress === null ? null : {
    revision: 1,
    kind: "workspace_export_failed",
    exportId: failed.exportId,
    sequence: failed.sequence,
    code: failed.code,
    ...admittedProgress,
  };
}

function admitFileErrorV1(value: unknown): BrowserWorkspaceHostFileErrorWireV1 | null {
  const record = exactRecordV1(value, ["kind", "code", "message", "path"]);
  if (
    record === null || record.kind !== "file_error" || !boundedMessageV1(record.message) ||
    (record.path !== null && typeof record.path !== "string") ||
    (record.code !== "aborted" && record.code !== "not_found" &&
      record.code !== "permission_denied" && record.code !== "not_directory" &&
      record.code !== "is_directory" && record.code !== "invalid" &&
      record.code !== "not_supported" && record.code !== "unknown")
  ) return null;
  return record as unknown as BrowserWorkspaceHostFileErrorWireV1;
}

export function admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(
  value: unknown,
): BrowserWorkspaceHostEnvironmentOutboundMessageV1 | null {
  const receiptEvent = exactRecordV1(value, ["revision", "kind", "receipt"]);
  if (
    receiptEvent !== null && receiptEvent.revision === 1 &&
    receiptEvent.kind === "workspace_receipt"
  ) {
    const receipt = admitReceiptV1(receiptEvent.receipt);
    return receipt === null ? null : { revision: 1, kind: "workspace_receipt", receipt };
  }
  const success = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "response",
  ]);
  if (
    success !== null && success.revision === 1 && success.kind === "environment_response" &&
    requestIdV1(success.requestId) && success.ok === true
  ) {
    const generation = exactRecordV1(success.response, ["method", "generation"]);
    if (
      generation !== null && positiveSafeIntegerV1(generation.generation) &&
      (generation.method === "begin_run" || generation.method === "end_run" ||
        generation.method === "abort_run" || generation.method === "end_tool")
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: generation.method, generation: generation.generation },
      };
    }
    const beginTool = exactRecordV1(success.response, ["method", "baseGeneration"]);
    if (
      beginTool !== null && beginTool.method === "begin_tool" &&
      positiveSafeIntegerV1(beginTool.baseGeneration)
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "begin_tool", baseGeneration: beginTool.baseGeneration },
      };
    }
    const path = exactRecordV1(success.response, ["method", "value"]);
    if (
      path !== null && typeof path.value === "string" && path.value.startsWith("/workspace") &&
      (path.method === "absolute_path" || path.method === "canonical_path")
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: path.method, value: path.value },
      };
    }
    if (path !== null && path.method === "exists" && typeof path.value === "boolean") {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "exists", value: path.value },
      };
    }
    if (path !== null && path.method === "file_info") {
      const fileInfo = exactRecordV1(path.value, ["name", "path", "kind", "size", "mtimeMs"]);
      const expectedName = typeof fileInfo?.path === "string"
        ? fileInfo.path === "/workspace"
          ? "workspace"
          : fileInfo.path.slice(fileInfo.path.lastIndexOf("/") + 1)
        : null;
      if (
        fileInfo === null || fileInfo.name !== expectedName ||
        typeof fileInfo.path !== "string" ||
        (fileInfo.path !== "/workspace" &&
          (!fileInfo.path.startsWith("/workspace/") ||
            !isBrowserWorkspaceHostNormalizedPathV1(
              fileInfo.path.slice("/workspace/".length),
            ))) ||
        (fileInfo.kind !== "file" && fileInfo.kind !== "directory") ||
        !nonNegativeSafeIntegerV1(fileInfo.size) ||
        !nonNegativeSafeIntegerV1(fileInfo.mtimeMs)
      ) return null;
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "file_info",
          value: fileInfo as unknown as BrowserWorkspaceHostFileInfoWireV1,
        },
      };
    }
    if (
      path !== null && path.method === "read_binary_file" &&
      path.value instanceof Uint8Array &&
      path.value.byteLength <= browserWorkspaceNativePiToolPayloadMaximumBytesV1
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "read_binary_file", value: path.value },
      };
    }
    if (
      path !== null &&
      (path.method === "write_file" || path.method === "append_file" ||
        path.method === "cancel_tool") &&
      path.value === null
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: path.method, value: null },
      };
    }
    if (
      path !== null && path.method === "create_temp_file" &&
      isWorkspaceAbsolutePathV1(path.value) &&
      path.value.startsWith("/workspace/.sillyos/tmp/bash-") && path.value.endsWith(".log")
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: { method: "create_temp_file", value: path.value },
      };
    }
    const executeShell = exactRecordV1(success.response, [
      "method",
      "termination",
      "stdout",
      "stderr",
      "exitCode",
    ]);
    const shellOutputBytes = typeof executeShell?.stdout === "string" &&
        typeof executeShell.stderr === "string"
      ? (utf8LengthV1(executeShell.stdout) ?? Number.POSITIVE_INFINITY) +
        (utf8LengthV1(executeShell.stderr) ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    if (
      executeShell !== null && executeShell.method === "execute_shell" &&
      typeof executeShell.stdout === "string" && typeof executeShell.stderr === "string" &&
      shellOutputBytes <= browserWorkspaceShellOutputMaximumUtf8BytesV1 &&
      ((executeShell.termination === "completed" &&
        nonNegativeSafeIntegerV1(executeShell.exitCode) && executeShell.exitCode <= 255) ||
        ((executeShell.termination === "aborted" || executeShell.termination === "timeout") &&
          executeShell.exitCode === null))
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "execute_shell",
          termination: executeShell.termination,
          stdout: executeShell.stdout,
          stderr: executeShell.stderr,
          exitCode: executeShell.exitCode,
        },
      };
    }
    const query = exactRecordV1(success.response, ["method", "receipts"]);
    if (query !== null && query.method === "query_receipts") {
      const values = exactArrayV1(query.receipts, browserWorkspaceHostReceiptMaximumV1);
      if (values === null) return null;
      const receipts = values.map(admitReceiptV1);
      if (receipts.some((receipt) => receipt === null)) return null;
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "query_receipts",
          receipts: receipts as readonly BrowserWorkspaceHostMutationReceiptWireV1[],
        },
      };
    }
    const acknowledge = exactRecordV1(success.response, ["method", "throughSequence"]);
    if (
      acknowledge !== null && acknowledge.method === "acknowledge_receipts" &&
      positiveSafeIntegerV1(acknowledge.throughSequence)
    ) {
      return {
        revision: 1,
        kind: "environment_response",
        requestId: success.requestId,
        ok: true,
        response: {
          method: "acknowledge_receipts",
          throughSequence: acknowledge.throughSequence,
        },
      };
    }
    return null;
  }
  const failure = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "code",
    "fileError",
  ]);
  if (
    failure === null || failure.revision !== 1 || failure.kind !== "environment_response" ||
    !requestIdV1(failure.requestId) || failure.ok !== false ||
    (failure.fileError !== null && admitFileErrorV1(failure.fileError) === null) ||
    (failure.code !== "invalid_request" && failure.code !== "invalid_binding" &&
      failure.code !== "workspace_closed" && failure.code !== "run_busy" &&
      failure.code !== "run_not_current" && failure.code !== "duplicate_run" &&
      failure.code !== "duplicate_tool_call" && failure.code !== "scope_busy" &&
      failure.code !== "scope_missing" && failure.code !== "cursor_mismatch" &&
      failure.code !== "receipt_queue_full" && failure.code !== "request_failed" &&
      failure.code !== "disposed")
  ) return null;
  return failure as unknown as BrowserWorkspaceHostEnvironmentFailureResponseV1;
}
