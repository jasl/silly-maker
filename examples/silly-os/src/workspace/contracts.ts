// SPDX-License-Identifier: MIT

import type { ExecutionEnv } from "../agent/pi-workspace-runtime-bridge.js";

export const workspaceRootV1 = "/workspace" as const;
export const workspacePathMaximumUtf8BytesV1 = 512;
export const workspacePathMaximumPartsV1 = 32;
export const workspaceFileMaximumBytesV1 = 256 * 1024;
export const workspaceVolumeMaximumBytesV1 = 2 * 1024 * 1024;
export const workspaceVolumeMaximumFilesV1 = 256;
export const workspaceMutationReceiptMaximumV1 = 32;
export const workspaceGrepPatternMaximumUtf8BytesV1 = 4 * 1024;
export const workspaceGrepPathMaximumUtf8BytesV1 = 1024;
export const workspaceGrepGlobMaximumUtf8BytesV1 = 512;
export const workspaceGrepMatchMaximumV1 = 100;
export const workspaceGrepMatchTextMaximumCharactersV1 = 500;
export const workspaceGrepResultMaximumUtf8BytesV1 = 50 * 1024;
export const workspaceGrepDeadlineMillisecondsV1 = 5_000;

const workspaceIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

type ExactWorkspaceRecordV1 = Readonly<Record<string, unknown>>;

function exactWorkspaceRecordV1(
  value: unknown,
  keys: readonly string[],
): ExactWorkspaceRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Object.keys(descriptors);
    if (
      actualKeys.length !== keys.length ||
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

function workspaceIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && workspaceIdentifierPatternV1.test(value);
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function utf8LengthV1(value: string): number | null {
  try {
    return new TextEncoder().encode(value).byteLength;
  } catch {
    return null;
  }
}

function normalizedWorkspaceGrepPathV1(value: unknown): value is string {
  if (value === "/workspace") return true;
  if (
    typeof value !== "string" || !value.startsWith("/workspace/") || value.endsWith("/") ||
    value.includes("\0") || value.includes("\\")
  ) return false;
  const relative = value.slice("/workspace/".length);
  const bytes = utf8LengthV1(value);
  return relative.length > 0 && bytes !== null &&
    bytes <= workspaceGrepPathMaximumUtf8BytesV1 &&
    relative.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

export interface WorkspaceGrepInputV1 {
  readonly pattern: string;
  readonly path?: string;
  readonly glob?: string;
  readonly ignoreCase?: boolean;
  readonly literal?: boolean;
  readonly limit?: number;
}

/** Fully-defaulted read-only grep request carried across the Workspace boundary. */
export interface WorkspaceGrepQueryV1 {
  readonly pattern: string;
  readonly path: string;
  readonly glob: string | null;
  readonly ignoreCase: boolean;
  readonly literal: boolean;
  readonly limit: number;
}

export interface WorkspaceGrepMatchV1 {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

export interface WorkspaceGrepResultV1 {
  readonly revision: 1;
  readonly generation: number;
  readonly matches: readonly WorkspaceGrepMatchV1[];
  readonly truncated: boolean;
}

export type WorkspaceGrepFailureCodeV1 =
  | "invalid_query"
  | "cancelled"
  | "timeout"
  | "execution_failed";

export class WorkspaceGrepErrorV1 extends Error {
  readonly code: WorkspaceGrepFailureCodeV1;

  constructor(code: WorkspaceGrepFailureCodeV1, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WorkspaceGrepErrorV1";
    this.code = code;
  }
}

export function admitWorkspaceGrepQueryV1(value: unknown): WorkspaceGrepQueryV1 | null {
  const record = exactWorkspaceRecordV1(value, [
    "pattern",
    "path",
    "glob",
    "ignoreCase",
    "literal",
    "limit",
  ]);
  if (
    record === null || typeof record.pattern !== "string" || record.pattern.length === 0 ||
    record.pattern.includes("\0") ||
    (utf8LengthV1(record.pattern) ?? Number.POSITIVE_INFINITY) >
      workspaceGrepPatternMaximumUtf8BytesV1 ||
    !normalizedWorkspaceGrepPathV1(record.path) ||
    (record.glob !== null &&
      (typeof record.glob !== "string" || record.glob.length === 0 ||
        record.glob.includes("\0") ||
        (utf8LengthV1(record.glob) ?? Number.POSITIVE_INFINITY) >
          workspaceGrepGlobMaximumUtf8BytesV1)) ||
    typeof record.ignoreCase !== "boolean" || typeof record.literal !== "boolean" ||
    !positiveSafeIntegerV1(record.limit) || record.limit > workspaceGrepMatchMaximumV1
  ) return null;
  return {
    pattern: record.pattern,
    path: record.path,
    glob: record.glob,
    ignoreCase: record.ignoreCase,
    literal: record.literal,
    limit: record.limit,
  };
}

export function createWorkspaceGrepQueryV1(input: WorkspaceGrepInputV1): WorkspaceGrepQueryV1 {
  const query = admitWorkspaceGrepQueryV1({
    pattern: input.pattern,
    path: input.path ?? "/workspace",
    glob: input.glob ?? null,
    ignoreCase: input.ignoreCase ?? false,
    literal: input.literal ?? false,
    limit: input.limit ?? workspaceGrepMatchMaximumV1,
  });
  if (query === null) {
    throw new WorkspaceGrepErrorV1("invalid_query", "Workspace grep query is invalid");
  }
  return query;
}

export interface CreatorAgentExecutionBindingV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly expectedGeneration: number;
}

export interface WorkspaceExecutionDescriptorV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
}

/** Target-neutral immutable Program workspace bytes selected for one exact proposal decision. */
export interface ProgramWorkspaceSnapshotReceiptV1 {
  readonly revision: 1;
  readonly snapshotId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly baseRepositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
  readonly fileCount: number;
  readonly archiveBytes: number;
}

export type ProgramWorkspaceReviewStatusV1 = "matches" | "changed" | "unavailable";

/** Target-neutral projection of durable review anchors against the observable mutable head. */
export interface ProgramWorkspaceReviewProjectionV1 {
  readonly revision: 1;
  readonly latestAccepted: {
    readonly snapshotId: string;
    readonly programRevision: number;
    readonly checkpointId: string;
    readonly generation: number;
    readonly fileCount: number;
    readonly archiveBytes: number;
  } | null;
  readonly pendingReview: {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly checkpointId: string;
    readonly generation: number;
  } | null;
  readonly mutableHead: {
    readonly checkpointId: string;
    readonly generation: number;
  } | null;
  readonly acceptedStatus: ProgramWorkspaceReviewStatusV1 | null;
  readonly pendingStatus: ProgramWorkspaceReviewStatusV1 | null;
}

export function admitProgramWorkspaceSnapshotReceiptV1(
  value: unknown,
): ProgramWorkspaceSnapshotReceiptV1 | null {
  const record = exactWorkspaceRecordV1(value, [
    "revision",
    "snapshotId",
    "programId",
    "workspaceId",
    "volumeId",
    "workspaceFormat",
    "proposalId",
    "programRevision",
    "baseRepositoryRevision",
    "checkpointId",
    "generation",
    "fileCount",
    "archiveBytes",
  ]);
  if (
    record === null || record.revision !== 1 || !workspaceIdentifierV1(record.snapshotId) ||
    !workspaceIdentifierV1(record.programId) || !workspaceIdentifierV1(record.workspaceId) ||
    !workspaceIdentifierV1(record.volumeId) || record.workspaceFormat !== 1 ||
    !workspaceIdentifierV1(record.proposalId) ||
    !positiveSafeIntegerV1(record.programRevision) ||
    !positiveSafeIntegerV1(record.baseRepositoryRevision) ||
    !workspaceIdentifierV1(record.checkpointId) ||
    !positiveSafeIntegerV1(record.generation) ||
    !nonNegativeSafeIntegerV1(record.fileCount) ||
    !positiveSafeIntegerV1(record.archiveBytes)
  ) return null;
  return {
    revision: 1,
    snapshotId: record.snapshotId,
    programId: record.programId,
    workspaceId: record.workspaceId,
    volumeId: record.volumeId,
    workspaceFormat: 1,
    proposalId: record.proposalId,
    programRevision: record.programRevision,
    baseRepositoryRevision: record.baseRepositoryRevision,
    checkpointId: record.checkpointId,
    generation: record.generation,
    fileCount: record.fileCount,
    archiveBytes: record.archiveBytes,
  };
}

export function programWorkspaceSnapshotReceiptsEqualV1(
  left: ProgramWorkspaceSnapshotReceiptV1,
  right: ProgramWorkspaceSnapshotReceiptV1,
): boolean {
  return left.revision === right.revision && left.snapshotId === right.snapshotId &&
    left.programId === right.programId && left.workspaceId === right.workspaceId &&
    left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat &&
    left.proposalId === right.proposalId && left.programRevision === right.programRevision &&
    left.baseRepositoryRevision === right.baseRepositoryRevision &&
    left.checkpointId === right.checkpointId && left.generation === right.generation &&
    left.fileCount === right.fileCount && left.archiveBytes === right.archiveBytes;
}

export type WorkspaceMutationOutcomeV1 = "succeeded" | "failed" | "cancelled";
export type WorkspaceMutationEffectV1 = "none" | "changed";
export type WorkspaceMutationDiagnosticCodeV1 =
  | "cancelled"
  | "path_rejected"
  | "capacity_exceeded"
  | "execution_failed";

/** Product-port projection created only where the product Agent run identity is known. */
export interface WorkspaceMutationReceiptV1 {
  readonly revision: 1;
  readonly sequence: number;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly agentRunId: string;
  readonly toolCallId: string;
  readonly tool: "write" | "edit" | "bash" | "download";
  readonly expectedGeneration: number;
  readonly baseGeneration: number;
  readonly resultingGeneration: number;
  readonly outcome: WorkspaceMutationOutcomeV1;
  readonly effect: WorkspaceMutationEffectV1;
  readonly changedPaths: readonly string[];
  readonly diagnosticCode: WorkspaceMutationDiagnosticCodeV1 | null;
}

/** Session-local mutation fact emitted after a workspace tool operation settles. */
export interface WorkspaceMutationRecordV1 {
  readonly revision: 1;
  readonly sequence: number;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly piSessionId: string;
  readonly piRunId: string;
  readonly toolCallId: string;
  readonly tool: "write" | "edit" | "bash" | "download";
  readonly expectedGeneration: number;
  readonly baseGeneration: number;
  readonly resultingGeneration: number;
  readonly outcome: WorkspaceMutationOutcomeV1;
  readonly effect: WorkspaceMutationEffectV1;
  readonly changedPaths: readonly string[];
  readonly diagnosticCode: WorkspaceMutationDiagnosticCodeV1 | null;
}

export type WorkspaceOpenResultV1 =
  | { readonly kind: "opened"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | { readonly kind: "current"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | {
    readonly kind: "rejected";
    readonly code: "invalid_identity" | "workspace_busy" | "forgotten";
    readonly current: WorkspaceExecutionDescriptorV1 | null;
  };

export type WorkspaceBeginRunRejectionCodeV1 =
  | "invalid_binding"
  | "workspace_not_open"
  | "stale_generation"
  | "agent_run_busy"
  | "duplicate_run"
  | "forgotten";

export type WorkspaceToolCallAdmissionCodeV1 =
  | "invalid_identity"
  | "run_not_current"
  | "duplicate_tool_call"
  | "scope_busy"
  | "cursor_mismatch"
  | "receipt_queue_full"
  | "workspace_closed";

export class WorkspaceToolCallAdmissionErrorV1 extends Error {
  readonly code: WorkspaceToolCallAdmissionCodeV1;

  constructor(code: WorkspaceToolCallAdmissionCodeV1, message: string) {
    super(message);
    this.name = "WorkspaceToolCallAdmissionErrorV1";
    this.code = code;
  }
}

export interface WorkspaceToolCallInputV1<TValue> {
  readonly toolCallId: string;
  readonly signal?: AbortSignal;
  readonly invoke: (signal: AbortSignal) => Promise<TValue>;
}

export interface WorkspaceGrepCallInputV1 {
  readonly toolCallId: string;
  readonly query: WorkspaceGrepQueryV1;
  readonly signal?: AbortSignal;
}

export interface WorkspaceAgentRunV1 {
  readonly env: ExecutionEnv;
  getGenerationCursor(): number;
  executeReadCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
  executeWriteCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
  executeEditCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
  executeBashCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
  executeGrepCall(input: WorkspaceGrepCallInputV1): Promise<WorkspaceGrepResultV1>;
  abortAndDrain(): Promise<void>;
  finish(): void;
}

export type WorkspaceBeginRunResultV1 =
  | { readonly kind: "started"; readonly run: WorkspaceAgentRunV1 }
  | {
    readonly kind: "rejected";
    readonly code: WorkspaceBeginRunRejectionCodeV1;
    readonly current: WorkspaceExecutionDescriptorV1 | null;
  };

export type WorkspaceCloseResultV1 =
  | { readonly kind: "closed"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | { readonly kind: "unchanged"; readonly descriptor: WorkspaceExecutionDescriptorV1 }
  | {
    readonly kind: "rejected";
    readonly code: "invalid_identity" | "workspace_not_found" | "workspace_mismatch";
    readonly current: WorkspaceExecutionDescriptorV1 | null;
  };

export type WorkspaceMutationAcknowledgementResultV1 =
  | {
    readonly kind: "acknowledged";
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }
  | {
    readonly kind: "unchanged";
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }
  | {
    readonly kind: "rejected";
    readonly code: "invalid_identity" | "sequence_unavailable";
  };
