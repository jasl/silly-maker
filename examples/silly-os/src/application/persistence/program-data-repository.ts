// SPDX-License-Identifier: MIT

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";
import {
  normalizeProcessCreateInputV1,
  normalizeProcessTranscriptAppendInputV1,
  type ProcessCreateInputV1,
  type ProcessHeadV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "../../program-platform/process/program-process-repository.ts";
import type {
  ProcessNetworkAccessMutationResultV1,
  ProcessNetworkAccessMutationV1,
  ProcessNetworkAccessV1,
} from "../../program-platform/capabilities/process-network-access.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionAcquireResultV1,
  ProcessExecutionLeaseMutationResultV1,
  ProcessExecutionLeaseReleaseInputV1,
  ProcessExecutionLeaseRenewInputV1,
  ProcessExecutionLeaseV1,
  ProcessExecutionTerminalInputV1,
  ProcessExecutionTerminalResultV1,
  ProcessOperationReceiptQueryResultV1,
} from "../../program-platform/process/process-execution-repository.ts";
import type { ProgramPersistenceFacetInvocationV1 } from "./program-persistence-facet.ts";

export {
  createProgramDataRepositoryFailureV1,
  isProgramDataRepositoryFailureV1,
} from "./program-data-repository-failure.ts";
export type {
  ProgramDataRepositoryFailureCodeV1,
  ProgramDataRepositoryFailureV1,
  ProgramDataRepositoryOperationV1,
} from "./program-data-repository-failure.ts";

/**
 * Product-neutral persistence core. Program-specific state and composite
 * operations enter only through build-known persistence facets.
 */
export interface ProgramDataRepositoryV1 extends
  Pick<
    ProgramProcessRepositoryV1,
    | "loadProcess"
    | "loadProcessSettingsOverride"
    | "listProcessSummaries"
    | "listRecentProcessSummaries"
    | "loadTranscriptPage"
    | "setProcessSettingsOverride"
    | "reset"
    | "dispose"
  > {
  initialize(): Promise<void>;
  createProcessWithWorkspace(
    input: ProcessWorkspaceCreateBundleInputV1,
  ): Promise<ProcessWorkspaceCreateCompositeCommitResultV1>;
  loadProcessWorkspaceBinding(processId: string): Promise<ProcessWorkspaceBindingV1 | null>;
  acquireProcessExecution(
    input: ProcessExecutionAcquireInputV1,
  ): Promise<ProcessExecutionAcquireResultV1>;
  renewProcessExecutionLease(
    input: ProcessExecutionLeaseRenewInputV1,
  ): Promise<ProcessExecutionLeaseMutationResultV1>;
  releaseProcessExecutionLease(
    input: ProcessExecutionLeaseReleaseInputV1,
  ): Promise<ProcessExecutionLeaseMutationResultV1>;
  loadProcessExecutionLease(processId: string): Promise<ProcessExecutionLeaseV1 | null>;
  commitProcessExecutionTerminal(
    input: ProcessExecutionTerminalInputV1,
  ): Promise<ProcessExecutionTerminalResultV1>;
  queryProcessOperation(
    expectation: ProgramDataProcessOperationExpectationV1,
  ): Promise<ProcessOperationReceiptQueryResultV1>;
  /** Invokes one build-known Program-owned persistence facet through an opaque envelope. */
  invokeProgramPersistenceFacet(input: ProgramPersistenceFacetInvocationV1): Promise<unknown>;
  loadProcessNetworkAccess(processId: string): Promise<ProcessNetworkAccessV1 | null>;
  setProcessNetworkAccess(
    input: ProcessNetworkAccessMutationV1,
  ): Promise<ProcessNetworkAccessMutationResultV1>;
}

/** Durable identity of the Workspace volume owned by one Process. */
export interface ProcessWorkspaceBindingV1 {
  readonly revision: 1;
  readonly processId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
}

export interface ProcessWorkspaceCreateBundleInputV1 {
  readonly process: ProcessCreateInputV1;
  readonly workspace: ProcessWorkspaceBindingV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export type ProgramDataProcessOperationExpectationV1 =
  | { readonly operation: "execution_acquire"; readonly input: ProcessExecutionAcquireInputV1 }
  | { readonly operation: "execution_terminal"; readonly input: ProcessExecutionTerminalInputV1 };

export function cloneProcessWorkspaceBindingV1(
  value: ProcessWorkspaceBindingV1,
): ProcessWorkspaceBindingV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 5 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" &&
      ["revision", "processId", "workspaceId", "volumeId", "workspaceFormat"].includes(key)
    ) || value.revision !== 1 || value.workspaceFormat !== 1 ||
    !isProgramPlatformIdentifierV1(value.processId) ||
    !isProgramPlatformIdentifierV1(value.workspaceId) ||
    !isProgramPlatformIdentifierV1(value.volumeId)
  ) throw new TypeError("invalid Process Workspace binding");
  return {
    revision: 1,
    processId: value.processId,
    workspaceId: value.workspaceId,
    volumeId: value.volumeId,
    workspaceFormat: 1,
  };
}

export function normalizeProcessWorkspaceCreateBundleInputV1(
  value: ProcessWorkspaceCreateBundleInputV1,
): ProcessWorkspaceCreateBundleInputV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 3 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" && ["process", "workspace", "transcript"].includes(key)
    )
  ) throw new TypeError("invalid Process/Workspace create bundle");
  const process = normalizeProcessCreateInputV1(value.process);
  const workspace = cloneProcessWorkspaceBindingV1(value.workspace);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  const checkpoint = transcript.checkpoint;
  const lastEntry = transcript.entries.at(-1)!;
  if (
    workspace.processId !== process.processId || transcript.processId !== process.processId ||
    transcript.expectedProcessRevision !== 1 || transcript.expectedTranscriptFrontier !== 0 ||
    transcript.attemptBinding !== null || transcript.terminalAttemptReceipt !== null ||
    transcript.entries[0]?.sequence !== 1 || checkpoint === null ||
    checkpoint.workspaceId !== workspace.workspaceId ||
    checkpoint.throughSequence !== lastEntry.sequence || process.createdAt > transcript.updatedAt
  ) throw new TypeError("invalid Process/Workspace create bundle");
  return { process, workspace, transcript };
}

export type ProcessWorkspaceCreateCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly process: ProcessHeadV1;
    readonly workspace: ProcessWorkspaceBindingV1;
    readonly entries: readonly TranscriptEntryV1[];
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentWorkspace: ProcessWorkspaceBindingV1 | null;
  }
  | { readonly kind: "workspace_volume_owned"; readonly owner: ProcessWorkspaceBindingV1 };
