// SPDX-License-Identifier: MIT

import type { ProgramDataRepositoryV1 } from "../../../src/application/persistence/program-data-repository.ts";
import {
  cloneProcessWorkspaceBindingV1,
  type ProcessWorkspaceBindingV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import {
  normalizeProcessCreateInputV1,
  normalizeProcessTranscriptAppendInputV1,
  type ProcessCreateInputV1,
  type ProcessHeadV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type TranscriptEntryV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  normalizeProcessExecutionCompletedTerminalInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
  type ProcessOperationReceiptQueryResultV1,
  type ProcessOperationReceiptV1,
} from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  normalizeProgramCatalogApplyRevisionInputV1,
  normalizeProgramCatalogCreateInputV1,
  normalizeProgramCatalogDecideInputV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogCreateInputV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogRepositoryV1,
} from "../runtime/program-catalog-repository.ts";

export const creatorPersistenceFacetIdV1 = "sillyos.creator.persistence.v1" as const;

export interface CreatorProgramProcessCreateBundleInputV1 {
  readonly catalog: ProgramCatalogCreateInputV1;
  readonly process: ProcessCreateInputV1;
  readonly workspace: ProcessWorkspaceBindingV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface CreatorProgramProcessRevisionBundleInputV1 {
  readonly catalog: ProgramCatalogApplyRevisionInputV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface CreatorProgramProcessDecisionBundleInputV1 {
  readonly catalog: ProgramCatalogDecideInputV1;
  readonly transcript: ProcessTranscriptAppendInputV1;
}

export interface CreatorProgramProcessExecutionRevisionBundleInputV1
  extends ProcessExecutionTerminalInputV1 {
  readonly catalog: ProgramCatalogApplyRevisionInputV1;
}

export type CreatorProcessOperationExpectationV1 = {
  readonly operation: "program_revision_terminal";
  readonly input: CreatorProgramProcessExecutionRevisionBundleInputV1;
};

export type CreatorProgramProcessCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly record: ProgramCatalogRecordV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  }
  | {
    readonly kind: "conflict";
    readonly currentProgram: ProgramCatalogRecordV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
  };

export type CreatorProgramProcessCreateCompositeCommitResultV1 =
  | CreatorProgramProcessCompositeCommitResultV1
  | { readonly kind: "workspace_volume_owned"; readonly owner: ProcessWorkspaceBindingV1 };

export type CreatorProgramProcessExecutionCompositeCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly record: ProgramCatalogRecordV1;
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProgram: ProgramCatalogRecordV1 | null;
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  };

export interface CreatorProgramDataRepositoryV1
  extends ProgramDataRepositoryV1, ProgramCatalogRepositoryV1 {
  createProgramWithProcess(
    input: CreatorProgramProcessCreateBundleInputV1,
  ): Promise<CreatorProgramProcessCreateCompositeCommitResultV1>;
  applyProgramRevisionWithProcessTranscript(
    input: CreatorProgramProcessRevisionBundleInputV1,
  ): Promise<CreatorProgramProcessCompositeCommitResultV1>;
  decideProgramWithProcessTranscript(
    input: CreatorProgramProcessDecisionBundleInputV1,
  ): Promise<CreatorProgramProcessCompositeCommitResultV1>;
  commitProgramRevisionWithProcessExecutionTerminal(
    input: CreatorProgramProcessExecutionRevisionBundleInputV1,
  ): Promise<CreatorProgramProcessExecutionCompositeCommitResultV1>;
  queryCreatorProcessOperation(
    expectation: CreatorProcessOperationExpectationV1,
  ): Promise<ProcessOperationReceiptQueryResultV1>;
}

export function normalizeCreatorProgramProcessCreateBundleInputV1(
  value: CreatorProgramProcessCreateBundleInputV1,
): CreatorProgramProcessCreateBundleInputV1 {
  const catalog = normalizeProgramCatalogCreateInputV1(value.catalog);
  const process = normalizeProcessCreateInputV1(value.process);
  const workspace = cloneProcessWorkspaceBindingV1(value.workspace);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  const checkpoint = transcript.checkpoint;
  const lastEntry = transcript.entries.at(-1)!;
  const reviewedWorkspace = catalog.reviewedWorkspace;
  if (
    process.subjectProgramId !== catalog.program.programId ||
    workspace.processId !== process.processId ||
    reviewedWorkspace.processId !== process.processId ||
    reviewedWorkspace.workspaceId !== workspace.workspaceId ||
    reviewedWorkspace.volumeId !== workspace.volumeId ||
    reviewedWorkspace.workspaceFormat !== workspace.workspaceFormat ||
    transcript.processId !== process.processId ||
    transcript.expectedProcessRevision !== 1 || transcript.expectedTranscriptFrontier !== 0 ||
    transcript.attemptBinding !== null || checkpoint === null ||
    checkpoint.workspaceId !== workspace.workspaceId ||
    checkpoint.throughSequence !== lastEntry.sequence ||
    checkpoint.workspaceCheckpointId !== reviewedWorkspace.checkpointId ||
    checkpoint.workspaceGeneration !== reviewedWorkspace.generation ||
    transcript.terminalAttemptReceipt !== null || transcript.entries[0]?.sequence !== 1 ||
    process.createdAt > transcript.updatedAt || catalog.updatedAt > transcript.updatedAt
  ) throw new TypeError("invalid Creator Program/Process create bundle");
  return { catalog, process, workspace, transcript };
}

export function normalizeCreatorProgramProcessRevisionBundleInputV1(
  value: CreatorProgramProcessRevisionBundleInputV1,
): CreatorProgramProcessRevisionBundleInputV1 {
  const catalog = normalizeProgramCatalogApplyRevisionInputV1(value.catalog);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  const checkpoint = transcript.checkpoint;
  const reviewedWorkspace = catalog.reviewedWorkspace;
  if (
    catalog.updatedAt > transcript.updatedAt || transcript.attemptBinding !== null ||
    checkpoint === null || reviewedWorkspace.processId !== transcript.processId ||
    checkpoint.workspaceId !== reviewedWorkspace.workspaceId ||
    checkpoint.workspaceCheckpointId !== reviewedWorkspace.checkpointId ||
    checkpoint.workspaceGeneration !== reviewedWorkspace.generation ||
    transcript.terminalAttemptReceipt !== null
  ) throw new TypeError("invalid Creator Program/Process revision bundle");
  return { catalog, transcript };
}

export function normalizeCreatorProgramProcessDecisionBundleInputV1(
  value: CreatorProgramProcessDecisionBundleInputV1,
): CreatorProgramProcessDecisionBundleInputV1 {
  const catalog = normalizeProgramCatalogDecideInputV1(value.catalog);
  const transcript = normalizeProcessTranscriptAppendInputV1(value.transcript);
  if (
    catalog.updatedAt > transcript.updatedAt || transcript.attemptBinding !== null ||
    transcript.checkpoint !== null || transcript.terminalAttemptReceipt !== null
  ) throw new TypeError("invalid Creator Program/Process decision bundle");
  return { catalog, transcript };
}

export function normalizeCreatorProgramProcessExecutionRevisionBundleInputV1(
  value: CreatorProgramProcessExecutionRevisionBundleInputV1,
): CreatorProgramProcessExecutionRevisionBundleInputV1 {
  const terminal = normalizeProcessExecutionCompletedTerminalInputV1({
    lease: value.lease,
    observedAt: value.observedAt,
    transcript: value.transcript,
  });
  const catalog = normalizeProgramCatalogApplyRevisionInputV1(value.catalog);
  const checkpoint = terminal.transcript.checkpoint;
  const reviewedWorkspace = catalog.reviewedWorkspace;
  if (
    catalog.updatedAt > terminal.transcript.updatedAt || checkpoint === null ||
    reviewedWorkspace.processId !== terminal.transcript.processId ||
    checkpoint.workspaceId !== reviewedWorkspace.workspaceId ||
    checkpoint.workspaceCheckpointId !== reviewedWorkspace.checkpointId ||
    checkpoint.workspaceGeneration !== reviewedWorkspace.generation
  ) throw new TypeError("invalid Creator Program/Process execution revision bundle");
  return { ...terminal, catalog };
}
