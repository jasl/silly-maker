// SPDX-License-Identifier: MIT

import type { ExecutionEnv } from "../agent/pi-workspace-runtime-bridge.js";

export const workspaceRootV1 = "/workspace" as const;
export const workspacePathMaximumUtf8BytesV1 = 512;
export const workspacePathMaximumPartsV1 = 32;
export const workspaceFileMaximumBytesV1 = 256 * 1024;
export const workspaceVolumeMaximumBytesV1 = 2 * 1024 * 1024;
export const workspaceVolumeMaximumFilesV1 = 256;
export const workspaceMutationReceiptMaximumV1 = 32;

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
  readonly tool: "write";
  readonly expectedGeneration: number;
  readonly baseGeneration: number;
  readonly resultingGeneration: number;
  readonly outcome: WorkspaceMutationOutcomeV1;
  readonly effect: WorkspaceMutationEffectV1;
  readonly changedPaths: readonly string[];
  readonly diagnosticCode: WorkspaceMutationDiagnosticCodeV1 | null;
}

/** Worker-local mutation fact emitted by the disposable execution runtime. */
export interface WorkspaceMutationRecordV1 {
  readonly revision: 1;
  readonly sequence: number;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly piSessionId: string;
  readonly piRunId: string;
  readonly toolCallId: string;
  readonly tool: "write";
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

export interface WorkspaceAgentRunV1 {
  readonly env: ExecutionEnv;
  getGenerationCursor(): number;
  executeReadCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
  executeWriteCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue>;
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
