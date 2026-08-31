// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceHostPagePortV1,
  type BrowserWorkspaceHostExportReadyV1,
  type BrowserWorkspaceHostExportResultV1,
  type BrowserWorkspaceHostFatalV1,
  type BrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import { createBrowserWorkspaceSandboxFrameTransportV1 } from "../workspace/browser-workspace-sandbox-frame-transport.ts";
import type {
  BrowserWorkspaceHostExportProgressWireV1,
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceHostStorageInspectionWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
  BrowserWorkspaceVolumeCandidateWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceReviewProjectionV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "../workspace/contracts.ts";
import { createBrowserProgramDataRepositoryV1 } from "./browser-program-data-repository.ts";
import {
  programCatalogOperationalPayloadMaximumBytesV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogContinuationV1,
  type ProgramCatalogCreateInputV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogReviewBindingV1,
} from "./program-catalog-repository.ts";
import type {
  ProcessWorkspaceBindingV1,
  ProcessWorkspaceCreateBundleInputV1,
  ProcessWorkspaceCreateCompositeCommitResultV1,
  ProgramDataRepositoryV1,
  ProgramProcessCompositeCommitResultV1,
  ProgramProcessCreateCompositeCommitResultV1,
  ProgramProcessCreateBundleInputV1,
  ProgramProcessDecisionBundleInputV1,
  ProgramProcessExecutionCompositeCommitResultV1,
  ProgramProcessRevisionBundleInputV1,
} from "./program-data-repository.ts";
import type { ProcessExecutionLeaseV1 } from "./process-execution-repository.ts";
import type { ProcessCheckpointV1, ProcessHeadV1 } from "./program-process-repository.ts";
import type {
  ProgramNetworkAccessMutationResultV1,
  ProgramNetworkAccessMutationV1,
  ProgramNetworkAccessV1,
} from "./program-network-access.ts";

interface DurableProgramPairV1 {
  readonly record: ProgramCatalogRecordV1;
  readonly continuation: ProgramCatalogContinuationV1;
}

interface DurableProcessWorkspacePairV1 {
  readonly process: ProcessHeadV1;
  readonly workspace: ProcessWorkspaceBindingV1;
}

type ActiveWorkspaceOwnerV1 =
  | { readonly kind: "program"; readonly programId: string }
  | {
    readonly kind: "process";
    readonly processId: string;
    readonly subjectProgramId: string;
  };

interface ActiveWorkspaceV1 {
  readonly owner: ActiveWorkspaceOwnerV1;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly environmentAttached: boolean;
}

export interface BrowserProgramWorkspaceOpenResultV1 {
  readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
  readonly environmentPort: MessagePort;
}

export type BrowserProgramWorkspaceFatalV1 = BrowserWorkspaceHostFatalV1;
export type BrowserProgramWorkspaceExportProgressV1 = BrowserWorkspaceHostExportProgressWireV1;
export type BrowserProgramWorkspaceExportReadyV1 = BrowserWorkspaceHostExportReadyV1;
export type BrowserProgramWorkspaceExportResultV1 = BrowserWorkspaceHostExportResultV1;

export type BrowserProgramWorkspaceDataResetStateV1 =
  | { readonly kind: "cleared" }
  | { readonly kind: "retained" }
  | { readonly kind: "failed"; readonly diagnosticCode: string };

export interface BrowserProgramWorkspaceDataResetResultV1 {
  readonly productRepository: BrowserProgramWorkspaceDataResetStateV1;
  readonly workspaceVolumes: BrowserProgramWorkspaceDataResetStateV1;
}

export interface BrowserProgramWorkspaceCreateInputV1 {
  readonly workspaceId: string;
  readonly catalog: Omit<ProgramCatalogCreateInputV1, "continuation" | "reviewedHead">;
  readonly process: ProgramProcessCreateBundleInputV1["process"];
  readonly transcript: ProgramProcessCreateBundleInputV1["transcript"];
}

type BrowserProcessWorkspaceCreateTranscriptV1 =
  & Omit<ProcessWorkspaceCreateBundleInputV1["transcript"], "checkpoint">
  & {
    /**
     * Process-semantic identity. The Authority binds the Workspace fields to
     * the candidate volume's exact mutable head before the atomic commit.
     */
    readonly checkpoint: Pick<ProcessCheckpointV1, "checkpointId" | "throughSequence">;
  };

export interface BrowserProcessWorkspaceCreateInputV1 {
  readonly workspaceId: string;
  readonly process: ProcessWorkspaceCreateBundleInputV1["process"];
  readonly transcript: BrowserProcessWorkspaceCreateTranscriptV1;
}

export interface BrowserProcessWorkspaceInspectionV1 {
  readonly process: ProcessHeadV1;
  readonly workspace: ProcessWorkspaceBindingV1;
  /** Null when this Process Workspace is not already active in this page. */
  readonly mutableHead: {
    readonly checkpointId: string;
    readonly generation: number;
  } | null;
}

export interface BrowserProcessWorkspaceFileSourceBindingV1 {
  readonly revision: 1;
  readonly processId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly path: string;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface BrowserProcessWorkspaceImportFileResultV1 {
  readonly changed: boolean;
  readonly source: BrowserProcessWorkspaceFileSourceBindingV1;
}

type ProgramProcessRevisionTranscriptV1 = ProgramProcessRevisionBundleInputV1["transcript"];

type BrowserProgramWorkspaceDeterministicRevisionTranscriptV1 =
  & Omit<ProgramProcessRevisionTranscriptV1, "attemptBinding" | "terminalAttemptReceipt">
  & {
    readonly attemptBinding: null;
    readonly terminalAttemptReceipt: null;
  };

type BrowserProgramWorkspaceAttemptRevisionTranscriptV1 =
  & Omit<ProgramProcessRevisionTranscriptV1, "attemptBinding" | "checkpoint">
  & {
    readonly attemptBinding: NonNullable<ProgramProcessRevisionTranscriptV1["attemptBinding"]>;
    readonly checkpoint: NonNullable<ProgramProcessRevisionTranscriptV1["checkpoint"]>;
  };

type BrowserProgramWorkspaceRevisionTranscriptV1 =
  | BrowserProgramWorkspaceDeterministicRevisionTranscriptV1
  | BrowserProgramWorkspaceAttemptRevisionTranscriptV1;

export interface BrowserProgramWorkspaceApplyRevisionInputV1 {
  readonly catalog: Omit<
    ProgramCatalogApplyRevisionInputV1,
    "continuation" | "reviewedHead"
  >;
  readonly transcript: BrowserProgramWorkspaceRevisionTranscriptV1;
}

export interface BrowserProgramWorkspaceApplyAgentRevisionInputV1 {
  readonly lease: ProcessExecutionLeaseV1;
  readonly observedAt: number;
  readonly catalog: BrowserProgramWorkspaceApplyRevisionInputV1["catalog"];
  readonly transcript: BrowserProgramWorkspaceAttemptRevisionTranscriptV1;
}

type BrowserProgramWorkspaceAcceptedDecisionCatalogInputV1 = Omit<
  Extract<ProgramCatalogDecideInputV1, { readonly status: "accepted" }>,
  "continuation" | "snapshotReceipt"
>;

type BrowserProgramWorkspaceRejectedDecisionCatalogInputV1 = Omit<
  Extract<ProgramCatalogDecideInputV1, { readonly status: "rejected" }>,
  "continuation"
>;

export type BrowserProgramWorkspaceDecideInputV1 =
  | {
    readonly catalog: BrowserProgramWorkspaceAcceptedDecisionCatalogInputV1;
    readonly transcript: ProgramProcessDecisionBundleInputV1["transcript"];
  }
  | {
    readonly catalog: BrowserProgramWorkspaceRejectedDecisionCatalogInputV1;
    readonly transcript: ProgramProcessDecisionBundleInputV1["transcript"];
  };

export interface BrowserProgramWorkspaceAuthorityV1 {
  initialize(): Promise<void>;
  inspectProgramWorkspace(
    programId: string,
    options?: { readonly hostAccess?: "required" | "active_only" },
  ): Promise<ProgramWorkspaceReviewProjectionV1 | null>;
  create(
    input: BrowserProgramWorkspaceCreateInputV1,
  ): Promise<ProgramProcessCreateCompositeCommitResultV1>;
  applyRevision(
    input: BrowserProgramWorkspaceApplyRevisionInputV1,
  ): Promise<ProgramProcessCompositeCommitResultV1>;
  applyAgentRevision(
    input: BrowserProgramWorkspaceApplyAgentRevisionInputV1,
  ): Promise<ProgramProcessExecutionCompositeCommitResultV1>;
  decide(
    input: BrowserProgramWorkspaceDecideInputV1,
  ): Promise<ProgramProcessCompositeCommitResultV1>;
  loadProgramNetworkAccess(programId: string): Promise<ProgramNetworkAccessV1 | null>;
  setProgramNetworkAccess(
    input: ProgramNetworkAccessMutationV1,
  ): Promise<ProgramNetworkAccessMutationResultV1>;
  withAgentSubmitAdmission<T>(input: {
    readonly programId: string;
    readonly workspaceSessionId: string;
    readonly expectedProgramRevision: number;
    readonly expectedRepositoryRevision: number;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly operation: (access: ProgramNetworkAccessV1) => Promise<T>;
  }): Promise<T>;
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramWorkspaceOpenResultV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly fileName: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      startDownload: () => Promise<void>,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<BrowserProgramWorkspaceExportResultV1>;
  detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  closeActiveWorkspace(): Promise<BrowserWorkspaceHostSnapshotWireV1 | null>;
  inspectStorage(): Promise<BrowserWorkspaceHostStorageInspectionWireV1>;
  resetStoredData(): Promise<BrowserProgramWorkspaceDataResetResultV1>;
  subscribeFatal(listener: (fatal: BrowserProgramWorkspaceFatalV1) => void): () => void;
  dispose(): Promise<void>;
}

/**
 * Process-scoped facet of the same single Browser Workspace Authority. Keeping
 * it separate prevents Creator-only clients and fakes from pretending to own
 * a Process Workspace lifecycle they never use.
 */
export interface BrowserProcessWorkspaceAuthorityV1 {
  createProcessWorkspace(
    input: BrowserProcessWorkspaceCreateInputV1,
  ): Promise<ProcessWorkspaceCreateCompositeCommitResultV1>;
  /** Pure inspection: never opens or otherwise pre-acquires an idle Workspace. */
  inspectProcessWorkspace(processId: string): Promise<BrowserProcessWorkspaceInspectionV1 | null>;
  importProcessWorkspaceFile(input: {
    readonly processId: string;
    readonly workspaceId: string;
    readonly lease: ProcessExecutionLeaseV1;
    readonly observedAt: number;
    readonly path: string;
    readonly bytes: Uint8Array;
  }): Promise<BrowserProcessWorkspaceImportFileResultV1>;
  openProcessWorkspace(input: {
    readonly processId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramWorkspaceOpenResultV1>;
}

export type BrowserProgramAndProcessWorkspaceAuthorityV1 =
  & BrowserProgramWorkspaceAuthorityV1
  & BrowserProcessWorkspaceAuthorityV1;

export interface BrowserProgramWorkspaceAuthorityOptionsV1 {
  readonly repository?: ProgramDataRepositoryV1;
  readonly host?: BrowserWorkspaceHostPagePortV1;
  readonly createSnapshotId?: () => string;
  readonly operationFence?: BrowserProgramWorkspaceOperationFenceV1;
}

export interface BrowserProgramWorkspaceOperationFenceV1 {
  run<T>(mode: "shared" | "exclusive", operation: () => Promise<T>): Promise<T>;
}

const browserProgramWorkspaceOperationFenceNameV1 =
  "sillymaker.example-silly-os.program-workspace-maintenance.v1";

function createBrowserProgramWorkspaceOperationFenceV1(): BrowserProgramWorkspaceOperationFenceV1 {
  return {
    run(mode, operation) {
      return navigator.locks.request(
        browserProgramWorkspaceOperationFenceNameV1,
        { mode },
        operation,
      );
    },
  };
}

function defaultSnapshotIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw authorityErrorV1("snapshot_identity_unavailable");
  }
  return `snapshot.local.${crypto.randomUUID()}`;
}

export class BrowserProgramWorkspaceAuthorityErrorV1 extends TypeError {
  readonly #code: string;

  constructor(code: string) {
    super(`sillyos.browser_program_workspace.${code}`);
    this.name = "BrowserProgramWorkspaceAuthorityErrorV1";
    this.#code = code;
  }

  get code(): string {
    return this.#code;
  }
}

function authorityErrorV1(code: string): BrowserProgramWorkspaceAuthorityErrorV1 {
  return new BrowserProgramWorkspaceAuthorityErrorV1(code);
}

function failureCodeV1(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : null;
}

function processExecutionLeaseIdentityMatchesV1(
  left: ProcessExecutionLeaseV1,
  right: ProcessExecutionLeaseV1,
): boolean {
  return left.processId === right.processId &&
    left.ownerInstanceId === right.ownerInstanceId &&
    left.attemptId === right.attemptId && left.generation === right.generation;
}

function cancelledExportV1(): BrowserProgramWorkspaceExportResultV1 {
  return {
    kind: "cancelled",
    filesCompleted: 0,
    filesTotal: 0,
    bytesWritten: 0,
    bytesTotal: 0,
  };
}

function recordsShareVersionV1(
  left: ProgramCatalogRecordV1,
  right: ProgramCatalogRecordV1,
): boolean {
  return left.head.programId === right.head.programId &&
    left.head.repositoryRevision === right.head.repositoryRevision;
}

function continuationsEqualV1(
  left: ProgramCatalogContinuationV1,
  right: ProgramCatalogContinuationV1,
): boolean {
  return left.revision === right.revision && left.programId === right.programId &&
    left.workspaceId === right.workspaceId && left.volumeId === right.volumeId &&
    left.workspaceFormat === right.workspaceFormat &&
    left.programRevision === right.programRevision &&
    left.repositoryRevision === right.repositoryRevision;
}

function anchorFromContinuationV1(
  continuation: ProgramCatalogContinuationV1,
): BrowserWorkspaceVolumeAnchorWireV1 {
  return {
    revision: 1,
    programId: continuation.programId,
    workspaceId: continuation.workspaceId,
    volumeId: continuation.volumeId,
    workspaceFormat: continuation.workspaceFormat,
  };
}

function anchorFromProcessWorkspaceV1(
  pair: DurableProcessWorkspacePairV1,
): BrowserWorkspaceVolumeAnchorWireV1 {
  const subjectProgramId = pair.process.subjectProgramId;
  if (subjectProgramId === null) throw authorityErrorV1("process_subject_missing");
  return {
    revision: 1,
    programId: subjectProgramId,
    workspaceId: pair.workspace.workspaceId,
    volumeId: pair.workspace.volumeId,
    workspaceFormat: pair.workspace.workspaceFormat,
  };
}

function processWorkspaceFromCandidateV1(
  input: BrowserProcessWorkspaceCreateInputV1,
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
): ProcessWorkspaceBindingV1 {
  const subjectProgramId = input.process.subjectProgramId;
  if (subjectProgramId === null) throw authorityErrorV1("process_subject_missing");
  if (
    candidate.anchor.programId !== subjectProgramId ||
    candidate.anchor.workspaceId !== input.workspaceId
  ) throw authorityErrorV1("candidate_identity_mismatch");
  return {
    revision: 1,
    processId: input.process.processId,
    workspaceId: input.workspaceId,
    volumeId: candidate.anchor.volumeId,
    workspaceFormat: candidate.anchor.workspaceFormat,
  };
}

function processWorkspaceBundleV1(
  input: BrowserProcessWorkspaceCreateInputV1,
  workspace: ProcessWorkspaceBindingV1,
  mutableHead: { readonly checkpointId: string; readonly generation: number },
): ProcessWorkspaceCreateBundleInputV1 {
  return {
    process: input.process,
    workspace,
    transcript: {
      ...input.transcript,
      checkpoint: {
        ...input.transcript.checkpoint,
        workspaceId: workspace.workspaceId,
        workspaceCheckpointId: mutableHead.checkpointId,
        workspaceGeneration: mutableHead.generation,
      },
    },
  };
}

function continuationFromCandidateV1(
  input: BrowserProgramWorkspaceCreateInputV1,
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
): ProgramCatalogContinuationV1 {
  if (
    candidate.anchor.programId !== input.catalog.program.programId ||
    candidate.anchor.workspaceId !== input.workspaceId
  ) throw authorityErrorV1("candidate_identity_mismatch");
  return {
    revision: 1,
    programId: input.catalog.program.programId,
    workspaceId: input.workspaceId,
    volumeId: candidate.anchor.volumeId,
    workspaceFormat: candidate.anchor.workspaceFormat,
    programRevision: input.catalog.program.revision,
    repositoryRevision: 1,
  };
}

function predecessorContinuationV1(
  stored: ProgramCatalogContinuationV1,
  programRevision: number,
  repositoryRevision: number,
): ProgramCatalogContinuationV1 {
  return { ...stored, programRevision, repositoryRevision };
}

function transcriptAtReviewedHeadV1(
  transcript: BrowserProgramWorkspaceApplyRevisionInputV1["transcript"],
  reviewedHead: { readonly checkpointId: string; readonly generation: number },
): ProgramProcessRevisionBundleInputV1["transcript"] {
  if (transcript.checkpoint === null) return transcript;
  return {
    ...transcript,
    checkpoint: {
      ...transcript.checkpoint,
      workspaceCheckpointId: reviewedHead.checkpointId,
      workspaceGeneration: reviewedHead.generation,
    },
  };
}

function pairWorkspaceV1(
  pair: DurableProgramPairV1,
  programId: string,
  workspaceId?: string,
): DurableProgramPairV1 {
  if (
    pair.record.head.programId !== programId ||
    pair.record.currentProgram.programId !== programId ||
    pair.continuation.programId !== programId ||
    pair.continuation.workspaceId !== pair.record.head.workspaceId ||
    pair.continuation.programRevision !== pair.record.head.currentProgramRevision ||
    pair.continuation.repositoryRevision !== pair.record.head.repositoryRevision ||
    (workspaceId !== undefined && pair.record.head.workspaceId !== workspaceId)
  ) throw authorityErrorV1("program_workspace_mismatch");
  return pair;
}

function pairProcessWorkspaceV1(
  pair: DurableProcessWorkspacePairV1,
  processId: string,
  workspaceId?: string,
): DurableProcessWorkspacePairV1 {
  const checkpoint = pair.process.checkpoint;
  if (
    pair.process.processId !== processId || pair.workspace.processId !== processId ||
    pair.process.subjectProgramId === null || checkpoint === null ||
    checkpoint.workspaceId !== pair.workspace.workspaceId ||
    (workspaceId !== undefined && pair.workspace.workspaceId !== workspaceId)
  ) throw authorityErrorV1("process_workspace_mismatch");
  return pair;
}

function processWorkspacePairsEqualV1(
  left: DurableProcessWorkspacePairV1,
  right: DurableProcessWorkspacePairV1,
): boolean {
  return left.process.processId === right.process.processId &&
    left.process.revision === right.process.revision &&
    left.process.transcriptFrontier === right.process.transcriptFrontier &&
    left.workspace.processId === right.workspace.processId &&
    left.workspace.workspaceId === right.workspace.workspaceId &&
    left.workspace.volumeId === right.workspace.volumeId &&
    left.workspace.workspaceFormat === right.workspace.workspaceFormat;
}

function processWorkspacePairOwnsCandidateV1(
  pair: DurableProcessWorkspacePairV1,
  input: BrowserProcessWorkspaceCreateInputV1,
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
): boolean {
  const checkpoint = pair.process.checkpoint;
  return pair.process.processId === input.process.processId &&
    pair.process.programDefinition.programId === input.process.programDefinition.programId &&
    pair.process.programDefinition.revision === input.process.programDefinition.revision &&
    pair.process.subjectProgramId === input.process.subjectProgramId &&
    pair.process.status === "active" && pair.process.activeAttempt === null &&
    pair.process.lastTerminalAttempt === null &&
    pair.process.transcriptFrontier === input.transcript.checkpoint.throughSequence &&
    pair.process.createdAt === input.process.createdAt &&
    pair.process.updatedAt === input.transcript.updatedAt &&
    pair.workspace.processId === input.process.processId &&
    pair.workspace.workspaceId === input.workspaceId &&
    pair.workspace.volumeId === candidate.anchor.volumeId &&
    pair.workspace.workspaceFormat === candidate.anchor.workspaceFormat &&
    checkpoint !== null && checkpoint.checkpointId === input.transcript.checkpoint.checkpointId &&
    checkpoint.throughSequence === input.transcript.checkpoint.throughSequence &&
    checkpoint.workspaceId === input.workspaceId &&
    checkpoint.workspaceCheckpointId === candidate.checkpointId &&
    checkpoint.workspaceGeneration === candidate.generation;
}

function pairsEqualV1(left: DurableProgramPairV1, right: DurableProgramPairV1): boolean {
  return recordsShareVersionV1(left.record, right.record) &&
    continuationsEqualV1(left.continuation, right.continuation);
}

function receiptMatchesBindingV1(
  receipt: ProgramWorkspaceSnapshotReceiptV1,
  binding: ProgramCatalogReviewBindingV1,
): boolean {
  return receipt.programId === binding.programId && receipt.workspaceId === binding.workspaceId &&
    receipt.volumeId === binding.volumeId &&
    receipt.workspaceFormat === binding.workspaceFormat &&
    receipt.proposalId === binding.proposalId &&
    receipt.programRevision === binding.programRevision &&
    receipt.baseRepositoryRevision === binding.repositoryRevision &&
    receipt.checkpointId === binding.checkpointId && receipt.generation === binding.generation;
}

function acceptedInputMatchesCurrentReviewV1(
  pair: DurableProgramPairV1,
  input: BrowserProgramWorkspaceAcceptedDecisionCatalogInputV1,
): boolean {
  const head = pair.record.head;
  const binding = head.pendingReviewBinding;
  return head.repositoryRevision === input.expectedRepositoryRevision && binding !== null &&
    head.proposal.status === "pending" &&
    head.proposal.proposalId === input.expectedProposal.proposalId &&
    head.proposal.programRevision === input.expectedProposal.programRevision &&
    head.currentProgramRevision === input.expectedProposal.programRevision &&
    binding.programId === input.programId &&
    binding.proposalId === input.expectedProposal.proposalId &&
    binding.programRevision === input.expectedProposal.programRevision &&
    binding.repositoryRevision === input.expectedRepositoryRevision;
}

function reviewProjectionV1(
  record: ProgramCatalogRecordV1,
  accepted: ProgramWorkspaceSnapshotReceiptV1 | null,
  mutableHead: { readonly checkpointId: string; readonly generation: number } | null,
): ProgramWorkspaceReviewProjectionV1 {
  const pending = record.head.pendingReviewBinding;
  const statusV1 = (
    anchor: { readonly checkpointId: string; readonly generation: number } | null,
  ): "matches" | "changed" | "unavailable" | null => {
    if (anchor === null) return null;
    if (mutableHead === null) return "unavailable";
    return anchor.checkpointId === mutableHead.checkpointId &&
        anchor.generation === mutableHead.generation
      ? "matches"
      : "changed";
  };
  return {
    revision: 1,
    latestAccepted: accepted === null ? null : {
      snapshotId: accepted.snapshotId,
      programRevision: accepted.programRevision,
      checkpointId: accepted.checkpointId,
      generation: accepted.generation,
      fileCount: accepted.fileCount,
      archiveBytes: accepted.archiveBytes,
    },
    pendingReview: pending === null ? null : {
      proposalId: pending.proposalId,
      programRevision: pending.programRevision,
      checkpointId: pending.checkpointId,
      generation: pending.generation,
    },
    mutableHead,
    acceptedStatus: statusV1(accepted),
    pendingStatus: statusV1(pending),
  };
}

/**
 * Owns the only product composition between Catalog currentness and Browser
 * Workspace Host publication. Process attempts remain a separate product
 * authority; callers must commit them before requesting Agent admission.
 */
export function createBrowserProgramWorkspaceAuthorityV1(
  options: BrowserProgramWorkspaceAuthorityOptionsV1 = {},
): BrowserProgramAndProcessWorkspaceAuthorityV1 {
  const repository = options.repository ?? createBrowserProgramDataRepositoryV1();
  const createSnapshotId = options.createSnapshotId ?? defaultSnapshotIdV1;
  const host = options.host ?? createBrowserWorkspaceHostPagePortV1({
    transport: createBrowserWorkspaceSandboxFrameTransportV1(),
  });
  const operationFence = options.operationFence ?? createBrowserProgramWorkspaceOperationFenceV1();
  let initialized: Promise<void> | null = null;
  let activeWorkspace: ActiveWorkspaceV1 | null = null;
  let operationTail: Promise<void> = Promise.resolve();
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let disposePromise: Promise<void> | null = null;
  const fatalListeners = new Set<(fatal: BrowserProgramWorkspaceFatalV1) => void>();

  const unsubscribeHostFatal = host.subscribeFatal((fatal) => {
    if (lifecycle === "disposed") return;
    activeWorkspace = null;
    for (const listener of [...fatalListeners]) {
      try {
        listener(fatal);
      } catch {
        // Fatal observers are observational and cannot alter Authority lifecycle.
      }
    }
  });

  const serializeV1 = <T>(
    operation: () => Promise<T>,
    fenceMode: "shared" | "exclusive" = "shared",
  ): Promise<T> => {
    if (lifecycle !== "active") return Promise.reject(authorityErrorV1("disposed"));
    const settled = operationTail.then(() => operationFence.run(fenceMode, operation));
    operationTail = settled.then(() => undefined, () => undefined);
    return settled;
  };

  const initializeRepositoryV1 = (): Promise<void> => {
    initialized ??= repository.initialize();
    return initialized;
  };

  const loadPairV1 = async (programId: string): Promise<DurableProgramPairV1 | null> => {
    await initializeRepositoryV1();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [record, continuation] = await Promise.all([
        repository.load(programId),
        repository.loadContinuation(programId),
      ]);
      if (record === null && continuation === null) return null;
      if (record !== null && continuation !== null) {
        try {
          return pairWorkspaceV1({ record, continuation }, programId);
        } catch {
          // A concurrent Catalog successor may have split the two read calls.
        }
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const requirePairV1 = async (
    programId: string,
    workspaceId?: string,
  ): Promise<DurableProgramPairV1> => {
    const pair = await loadPairV1(programId);
    if (pair === null) throw authorityErrorV1("program_unavailable");
    return pairWorkspaceV1(pair, programId, workspaceId);
  };

  const loadProcessWorkspacePairV1 = async (
    processId: string,
  ): Promise<DurableProcessWorkspacePairV1 | null> => {
    await initializeRepositoryV1();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [process, workspace] = await Promise.all([
        repository.loadProcess(processId),
        repository.loadProcessWorkspaceBinding(processId),
      ]);
      if (process === null && workspace === null) return null;
      if (process !== null && workspace !== null) {
        try {
          return pairProcessWorkspaceV1({ process, workspace }, processId);
        } catch {
          // A concurrent Process successor may have split the two read calls.
        }
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const requireProcessWorkspacePairV1 = async (
    processId: string,
    workspaceId?: string,
  ): Promise<DurableProcessWorkspacePairV1> => {
    const pair = await loadProcessWorkspacePairV1(processId);
    if (pair === null) throw authorityErrorV1("process_workspace_unavailable");
    return pairProcessWorkspaceV1(pair, processId, workspaceId);
  };

  const matchingActiveSessionForPairV1 = (pair: DurableProgramPairV1): string | null => {
    const active = activeWorkspace;
    if (active === null) return null;
    if (
      active.owner.kind !== "program" ||
      active.owner.programId !== pair.record.head.programId ||
      active.workspaceId !== pair.record.head.workspaceId
    ) throw authorityErrorV1("workspace_busy");
    return active.workspaceSessionId;
  };

  const matchingActiveSessionForProcessWorkspaceV1 = (
    pair: DurableProcessWorkspacePairV1,
  ): string | null => {
    const active = activeWorkspace;
    if (active === null) return null;
    if (
      active.owner.kind !== "process" ||
      active.owner.processId !== pair.process.processId ||
      active.owner.subjectProgramId !== pair.process.subjectProgramId ||
      active.workspaceId !== pair.workspace.workspaceId
    ) throw authorityErrorV1("workspace_busy");
    return active.workspaceSessionId;
  };

  const validateHostSnapshotV1 = (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
    pair: DurableProgramPairV1,
    workspaceSessionId: string,
  ): BrowserWorkspaceHostSnapshotWireV1 => {
    if (
      snapshot.phase !== "open" ||
      snapshot.descriptor.programId !== pair.record.head.programId ||
      snapshot.descriptor.workspaceId !== pair.record.head.workspaceId ||
      snapshot.descriptor.workspaceSessionId !== workspaceSessionId ||
      snapshot.volumeId !== pair.continuation.volumeId ||
      snapshot.anchor.programId !== pair.continuation.programId ||
      snapshot.anchor.workspaceId !== pair.continuation.workspaceId ||
      snapshot.anchor.volumeId !== pair.continuation.volumeId ||
      snapshot.anchor.workspaceFormat !== pair.continuation.workspaceFormat
    ) throw authorityErrorV1("workspace_snapshot_mismatch");
    return snapshot;
  };

  const ensureHostSessionForPairV1 = async (pair: DurableProgramPairV1): Promise<string> => {
    const matching = matchingActiveSessionForPairV1(pair);
    if (matching !== null) return matching;
    return await host.withBootstrapLease({
      programId: pair.record.head.programId,
      workspaceId: pair.record.head.workspaceId,
      operation: async () => {
        const opened = await host.openWorkspace(anchorFromContinuationV1(pair.continuation));
        try {
          validateHostSnapshotV1(opened, pair, opened.descriptor.workspaceSessionId);
          activeWorkspace = {
            owner: { kind: "program", programId: pair.record.head.programId },
            workspaceId: pair.record.head.workspaceId,
            workspaceSessionId: opened.descriptor.workspaceSessionId,
            environmentAttached: false,
          };
          return opened.descriptor.workspaceSessionId;
        } catch (error) {
          await host.closeWorkspace(opened.descriptor.workspaceSessionId).catch(() => undefined);
          throw error;
        }
      },
    });
  };

  const validateProcessWorkspaceHostSnapshotV1 = (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
    pair: DurableProcessWorkspacePairV1,
    workspaceSessionId: string,
  ): BrowserWorkspaceHostSnapshotWireV1 => {
    const subjectProgramId = pair.process.subjectProgramId;
    if (
      subjectProgramId === null || snapshot.phase !== "open" ||
      snapshot.descriptor.programId !== subjectProgramId ||
      snapshot.descriptor.workspaceId !== pair.workspace.workspaceId ||
      snapshot.descriptor.workspaceSessionId !== workspaceSessionId ||
      snapshot.volumeId !== pair.workspace.volumeId ||
      snapshot.anchor.programId !== subjectProgramId ||
      snapshot.anchor.workspaceId !== pair.workspace.workspaceId ||
      snapshot.anchor.volumeId !== pair.workspace.volumeId ||
      snapshot.anchor.workspaceFormat !== pair.workspace.workspaceFormat
    ) throw authorityErrorV1("workspace_snapshot_mismatch");
    return snapshot;
  };

  const ensureHostSessionForProcessWorkspaceV1 = async (
    pair: DurableProcessWorkspacePairV1,
  ): Promise<string> => {
    const matching = matchingActiveSessionForProcessWorkspaceV1(pair);
    if (matching !== null) return matching;
    const subjectProgramId = pair.process.subjectProgramId;
    if (subjectProgramId === null) throw authorityErrorV1("process_subject_missing");
    return await host.withBootstrapLease({
      programId: subjectProgramId,
      workspaceId: pair.workspace.workspaceId,
      operation: async () => {
        const opened = await host.openWorkspace(anchorFromProcessWorkspaceV1(pair));
        try {
          validateProcessWorkspaceHostSnapshotV1(
            opened,
            pair,
            opened.descriptor.workspaceSessionId,
          );
          activeWorkspace = {
            owner: {
              kind: "process",
              processId: pair.process.processId,
              subjectProgramId,
            },
            workspaceId: pair.workspace.workspaceId,
            workspaceSessionId: opened.descriptor.workspaceSessionId,
            environmentAttached: false,
          };
          return opened.descriptor.workspaceSessionId;
        } catch (error) {
          await host.closeWorkspace(opened.descriptor.workspaceSessionId).catch(() => undefined);
          throw error;
        }
      },
    });
  };

  const captureReviewedHeadV1 = async (
    pair: DurableProgramPairV1,
  ): Promise<{ readonly checkpointId: string; readonly generation: number }> => {
    const workspaceSessionId = await ensureHostSessionForPairV1(pair);
    const snapshot = validateHostSnapshotV1(
      await host.captureReviewHead(workspaceSessionId),
      pair,
      workspaceSessionId,
    );
    return {
      checkpointId: snapshot.checkpointId,
      generation: snapshot.descriptor.generation,
    };
  };

  const latestAcceptedReceiptV1 = async (
    programId: string,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> => {
    const decision = await repository.loadLatestAcceptedDecision(programId);
    return decision?.snapshot ?? null;
  };

  const acceptedReceiptsV1 = async (
    programId: string,
  ): Promise<readonly ProgramWorkspaceSnapshotReceiptV1[]> => {
    const receipts: ProgramWorkspaceSnapshotReceiptV1[] = [];
    let beforeProgramRevision: number | null = null;
    do {
      const page = await repository.listAcceptedDecisions({
        programId,
        beforeProgramRevision,
        maximumBytes: programCatalogOperationalPayloadMaximumBytesV1,
      });
      receipts.push(...page.decisions.map((decision) => decision.snapshot));
      beforeProgramRevision = page.nextCursor;
    } while (beforeProgramRevision !== null);
    return receipts;
  };

  const decisionReferencesReceiptV1 = async (
    receipt: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<boolean> => {
    const decision = await repository.loadDecision(
      receipt.programId,
      receipt.proposalId,
      receipt.programRevision,
    );
    return decision?.status === "accepted" &&
      programWorkspaceSnapshotReceiptsEqualV1(decision.snapshot, receipt);
  };

  const ensureAcceptedSnapshotAvailableV1 = async (
    workspaceSessionId: string,
    receipt: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<void> => {
    try {
      const retained = await host.queryRetainedSnapshot({ workspaceSessionId, expected: receipt });
      if (retained !== null && programWorkspaceSnapshotReceiptsEqualV1(retained, receipt)) return;
      const candidate = await host.querySnapshotCandidate(workspaceSessionId);
      if (candidate !== null && programWorkspaceSnapshotReceiptsEqualV1(candidate, receipt)) {
        try {
          await host.adoptSnapshot({ workspaceSessionId, expected: receipt });
          return;
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") throw error;
        }
      }
      const reconciled = await host.queryRetainedSnapshot({
        workspaceSessionId,
        expected: receipt,
      });
      if (reconciled !== null && programWorkspaceSnapshotReceiptsEqualV1(reconciled, receipt)) {
        return;
      }
    } catch {
      // Durable acceptance converts unavailable or mismatched Host state into recovery.
    }
    throw authorityErrorV1("recovery_required");
  };

  const reconcileAcceptedSnapshotsV1 = async (pair: DurableProgramPairV1): Promise<void> => {
    const receipts = await acceptedReceiptsV1(pair.record.head.programId);
    if (receipts.length === 0) return;
    const workspaceSessionId = await ensureHostSessionForPairV1(pair);
    for (const receipt of receipts) {
      await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
    }
  };

  const inspectProgramWorkspaceV1 = async (
    programId: string,
    hostAccess: "required" | "active_only",
  ): Promise<ProgramWorkspaceReviewProjectionV1 | null> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const initial = await loadPairV1(programId);
      if (initial === null) return null;
      const accepted = await latestAcceptedReceiptV1(programId);
      if (hostAccess === "required" && accepted !== null) {
        await reconcileAcceptedSnapshotsV1(initial);
      }

      let workspaceSessionId: string | null = null;
      if (
        activeWorkspace?.owner.kind === "program" &&
        activeWorkspace.owner.programId === programId &&
        activeWorkspace.workspaceId === initial.record.head.workspaceId
      ) {
        workspaceSessionId = activeWorkspace.workspaceSessionId;
      } else if (hostAccess === "required") {
        workspaceSessionId = await ensureHostSessionForPairV1(initial);
      }

      let mutableHead: { readonly checkpointId: string; readonly generation: number } | null = null;
      if (workspaceSessionId !== null) {
        const hostSnapshot = validateHostSnapshotV1(
          await host.queryWorkspace(workspaceSessionId),
          initial,
          workspaceSessionId,
        );
        mutableHead = {
          checkpointId: hostSnapshot.checkpointId,
          generation: hostSnapshot.descriptor.generation,
        };
      }

      const current = await loadPairV1(programId);
      if (current !== null && pairsEqualV1(initial, current)) {
        const currentAccepted = await latestAcceptedReceiptV1(programId);
        if (
          (accepted === null && currentAccepted === null) ||
          (accepted !== null && currentAccepted !== null &&
            programWorkspaceSnapshotReceiptsEqualV1(accepted, currentAccepted))
        ) return reviewProjectionV1(current.record, currentAccepted, mutableHead);
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const inspectProcessWorkspaceV1 = async (
    processId: string,
  ): Promise<BrowserProcessWorkspaceInspectionV1 | null> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const initial = await loadProcessWorkspacePairV1(processId);
      if (initial === null) return null;
      let mutableHead: BrowserProcessWorkspaceInspectionV1["mutableHead"] = null;
      const active = activeWorkspace;
      if (
        active?.owner.kind === "process" && active.owner.processId === processId &&
        active.owner.subjectProgramId === initial.process.subjectProgramId &&
        active.workspaceId === initial.workspace.workspaceId
      ) {
        const snapshot = validateProcessWorkspaceHostSnapshotV1(
          await host.queryWorkspace(active.workspaceSessionId),
          initial,
          active.workspaceSessionId,
        );
        mutableHead = {
          checkpointId: snapshot.checkpointId,
          generation: snapshot.descriptor.generation,
        };
      }
      const current = await loadProcessWorkspacePairV1(processId);
      if (current !== null && processWorkspacePairsEqualV1(initial, current)) {
        return { process: current.process, workspace: current.workspace, mutableHead };
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const discardUnreferencedSnapshotV1 = async (
    workspaceSessionId: string,
    receipt: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<void> => {
    if (await decisionReferencesReceiptV1(receipt)) {
      await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
      return;
    }
    const result = await host.discardSnapshot({ workspaceSessionId, expected: receipt });
    if (result === "retained") throw authorityErrorV1("recovery_required");
  };

  const prepareAcceptedSnapshotV1 = async (
    pair: DurableProgramPairV1,
    input: BrowserProgramWorkspaceAcceptedDecisionCatalogInputV1,
  ): Promise<{
    readonly workspaceSessionId: string;
    readonly receipt: ProgramWorkspaceSnapshotReceiptV1;
  }> => {
    const binding = pair.record.head.pendingReviewBinding;
    if (
      binding === null || binding.proposalId !== input.expectedProposal.proposalId ||
      binding.programRevision !== input.expectedProposal.programRevision ||
      binding.repositoryRevision !== input.expectedRepositoryRevision
    ) throw authorityErrorV1("decision_conflict");
    const workspaceSessionId = await ensureHostSessionForPairV1(pair);
    const candidate = await host.querySnapshotCandidate(workspaceSessionId);
    let receipt: ProgramWorkspaceSnapshotReceiptV1;
    if (candidate === null) {
      receipt = await host.prepareSnapshot({
        workspaceSessionId,
        snapshotId: createSnapshotId(),
        proposalId: binding.proposalId,
        expectedCheckpointId: binding.checkpointId,
        expectedGeneration: binding.generation,
        programRevision: binding.programRevision,
        baseRepositoryRevision: binding.repositoryRevision,
      });
    } else {
      if (!receiptMatchesBindingV1(candidate, binding)) {
        throw authorityErrorV1("snapshot_mismatch");
      }
      receipt = await host.resumeSnapshotPublication({ workspaceSessionId, expected: candidate });
      if (!programWorkspaceSnapshotReceiptsEqualV1(receipt, candidate)) {
        throw authorityErrorV1("snapshot_mismatch");
      }
    }
    if (!receiptMatchesBindingV1(receipt, binding)) throw authorityErrorV1("snapshot_mismatch");
    return { workspaceSessionId, receipt };
  };

  const loadExportContinuationV1 = async (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
  ): Promise<ProgramCatalogContinuationV1> => {
    const pair = await requirePairV1(
      snapshot.descriptor.programId,
      snapshot.descriptor.workspaceId,
    );
    if (
      snapshot.volumeId !== pair.continuation.volumeId ||
      snapshot.anchor.workspaceFormat !== pair.continuation.workspaceFormat
    ) throw authorityErrorV1("export_anchor_changed");
    return pair.continuation;
  };

  const compositeConflictV1 = async (
    currentProgram: ProgramCatalogRecordV1 | null,
    processId: string,
  ): Promise<Extract<ProgramProcessCompositeCommitResultV1, { readonly kind: "conflict" }>> => ({
    kind: "conflict",
    currentProgram,
    currentProcess: await repository.loadProcess(processId),
  });

  const executionCompositeConflictV1 = async (
    currentProgram: ProgramCatalogRecordV1 | null,
    processId: string,
  ): Promise<
    Extract<ProgramProcessExecutionCompositeCommitResultV1, { readonly kind: "conflict" }>
  > => ({
    kind: "conflict",
    currentProgram,
    currentProcess: await repository.loadProcess(processId),
    currentLease: await repository.loadProcessExecutionLease(processId),
  });

  const requireCurrentProcessExecutionLeaseV1 = async (
    lease: ProcessExecutionLeaseV1,
    observedAt: number,
  ): Promise<void> => {
    const [process, currentLease] = await Promise.all([
      repository.loadProcess(lease.processId),
      repository.loadProcessExecutionLease(lease.processId),
    ]);
    if (
      !Number.isSafeInteger(observedAt) || observedAt < 0 || observedAt >= lease.expiresAt ||
      process === null || currentLease === null ||
      !processExecutionLeaseIdentityMatchesV1(currentLease, lease) ||
      currentLease.expiresAt < lease.expiresAt ||
      process.activeAttempt?.attemptId !== lease.attemptId ||
      process.activeAttempt.generation !== lease.generation
    ) throw authorityErrorV1("process_execution_stale");
  };

  return {
    initialize() {
      return serializeV1(async () => await initializeRepositoryV1());
    },

    inspectProgramWorkspace(programId, inspectionOptions) {
      return serializeV1(async () =>
        await inspectProgramWorkspaceV1(
          programId,
          inspectionOptions?.hostAccess ?? "required",
        )
      );
    },

    inspectProcessWorkspace(processId) {
      return serializeV1(async () => await inspectProcessWorkspaceV1(processId));
    },

    create(input) {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        const catalog = input.catalog;
        if (
          activeWorkspace !== null &&
          (activeWorkspace.owner.kind !== "program" ||
            activeWorkspace.owner.programId !== catalog.program.programId)
        ) {
          throw authorityErrorV1("workspace_busy");
        }
        return await host.withBootstrapLease({
          programId: catalog.program.programId,
          workspaceId: input.workspaceId,
          operation: async () => {
            const existing = await loadPairV1(catalog.program.programId);
            if (existing !== null) {
              const binding = existing.record.head.pendingReviewBinding;
              if (
                existing.record.head.repositoryRevision !== 1 || binding === null ||
                binding.programRevision !== 1 ||
                existing.record.head.workspaceId !== input.workspaceId
              ) return await compositeConflictV1(existing.record, input.process.processId);
              return await repository.createProgramWithProcess({
                catalog: {
                  ...catalog,
                  continuation: existing.continuation,
                  reviewedHead: {
                    checkpointId: binding.checkpointId,
                    generation: binding.generation,
                  },
                },
                process: input.process,
                transcript: input.transcript,
              });
            }

            const candidate = await host.createCandidate({
              programId: catalog.program.programId,
              workspaceId: input.workspaceId,
            });
            const continuation = continuationFromCandidateV1(input, candidate);
            const repositoryInput: ProgramCatalogCreateInputV1 = {
              ...catalog,
              continuation,
              reviewedHead: {
                checkpointId: candidate.checkpointId,
                generation: candidate.generation,
              },
            };
            try {
              const settled = await repository.createProgramWithProcess({
                catalog: repositoryInput,
                process: input.process,
                transcript: input.transcript,
              });
              if (settled.kind === "conflict" || settled.kind === "program_definition_missing") {
                await host.discardCandidate(candidate.anchor.volumeId);
                return settled;
              }
              const binding = settled.record.head.pendingReviewBinding;
              const ownsCandidate = settled.record.head.programId === catalog.program.programId &&
                settled.record.currentProgram.programId === catalog.program.programId &&
                settled.record.currentProgram.revision === catalog.program.revision &&
                settled.record.head.repositoryRevision === 1 &&
                settled.record.head.currentProgramRevision === catalog.program.revision &&
                settled.record.head.workspaceId === input.workspaceId && binding !== null &&
                binding.workspaceId === input.workspaceId &&
                binding.volumeId === continuation.volumeId &&
                binding.checkpointId === candidate.checkpointId &&
                binding.generation === candidate.generation;
              if (!ownsCandidate) throw authorityErrorV1("repository_response_mismatch");
              return settled;
            } catch (error) {
              const code = failureCodeV1(error);
              if (code === "outcome_unknown" || code === "repository_response_mismatch") {
                // The candidate may be the committed durable volume. Preserve it
                // until application recovery rebuilds the single Repository owner.
                throw error;
              }
              await host.discardCandidate(candidate.anchor.volumeId);
              throw error;
            }
          },
        });
      });
    },

    createProcessWorkspace(input) {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        const subjectProgramId = input.process.subjectProgramId;
        if (subjectProgramId === null) throw authorityErrorV1("process_subject_missing");
        const active = activeWorkspace;
        if (
          active !== null &&
          (active.owner.kind !== "process" ||
            active.owner.processId !== input.process.processId ||
            active.owner.subjectProgramId !== subjectProgramId ||
            active.workspaceId !== input.workspaceId)
        ) throw authorityErrorV1("workspace_busy");

        return await host.withBootstrapLease({
          programId: subjectProgramId,
          workspaceId: input.workspaceId,
          operation: async () => {
            const existing = await loadProcessWorkspacePairV1(input.process.processId);
            if (existing !== null) {
              const checkpoint = existing.process.checkpoint;
              if (checkpoint === null) throw authorityErrorV1("process_workspace_mismatch");
              return await repository.createProcessWithWorkspace(
                processWorkspaceBundleV1(input, existing.workspace, {
                  checkpointId: checkpoint.workspaceCheckpointId,
                  generation: checkpoint.workspaceGeneration,
                }),
              );
            }

            const candidate = await host.createCandidate({
              programId: subjectProgramId,
              workspaceId: input.workspaceId,
            });
            let workspace: ProcessWorkspaceBindingV1;
            try {
              workspace = processWorkspaceFromCandidateV1(input, candidate);
            } catch (error) {
              await host.discardCandidate(candidate.anchor.volumeId);
              throw error;
            }
            const bundle = processWorkspaceBundleV1(input, workspace, {
              checkpointId: candidate.checkpointId,
              generation: candidate.generation,
            });
            let candidateDiscarded = false;
            let candidatePreserved = false;
            const discardCandidateV1 = async (): Promise<void> => {
              if (candidateDiscarded) return;
              await host.discardCandidate(candidate.anchor.volumeId);
              candidateDiscarded = true;
            };
            try {
              let settled: ProcessWorkspaceCreateCompositeCommitResultV1;
              try {
                settled = await repository.createProcessWithWorkspace(bundle);
              } catch (error) {
                if (failureCodeV1(error) !== "outcome_unknown") {
                  await discardCandidateV1();
                  throw error;
                }
                try {
                  // The composite commit is idempotent by Process commit ID.
                  // Replaying the exact bundle settles both pre-commit and
                  // post-commit response-loss windows without a second receipt.
                  settled = await repository.createProcessWithWorkspace(bundle);
                } catch (reconcileError) {
                  if (failureCodeV1(reconcileError) !== "outcome_unknown") {
                    let ownsCandidate = false;
                    try {
                      const durable = await loadProcessWorkspacePairV1(input.process.processId);
                      ownsCandidate = durable !== null &&
                        processWorkspacePairOwnsCandidateV1(durable, input, candidate);
                    } catch {
                      // An unreadable Repository cannot prove the candidate disposable.
                      ownsCandidate = true;
                    }
                    if (ownsCandidate) candidatePreserved = true;
                    else await discardCandidateV1();
                  } else {
                    candidatePreserved = true;
                  }
                  throw reconcileError;
                }
              }

              if (settled.kind === "committed" || settled.kind === "unchanged") {
                let pair: DurableProcessWorkspacePairV1;
                try {
                  pair = pairProcessWorkspaceV1(
                    { process: settled.process, workspace: settled.workspace },
                    input.process.processId,
                    input.workspaceId,
                  );
                } catch {
                  throw authorityErrorV1("repository_response_mismatch");
                }
                if (!processWorkspacePairOwnsCandidateV1(pair, input, candidate)) {
                  throw authorityErrorV1("repository_response_mismatch");
                }
                return settled;
              }

              const durablyOwnsCandidate = settled.kind === "conflict" &&
                settled.currentWorkspace?.volumeId === candidate.anchor.volumeId;
              if (!durablyOwnsCandidate) await discardCandidateV1();
              return settled;
            } catch (error) {
              const code = failureCodeV1(error);
              if (
                !candidateDiscarded && !candidatePreserved && code !== "outcome_unknown" &&
                code !== "repository_response_mismatch"
              ) await discardCandidateV1();
              throw error;
            }
          },
        });
      });
    },

    applyRevision(input) {
      return serializeV1(async () => {
        const catalog = input.catalog;
        if (
          (input.transcript.attemptBinding !== null ||
            input.transcript.terminalAttemptReceipt !== null) &&
          input.transcript.checkpoint === null
        ) {
          throw authorityErrorV1("process_checkpoint_missing");
        }
        const current = await requirePairV1(catalog.programId);
        const continuation = predecessorContinuationV1(
          current.continuation,
          catalog.expectedProposal.programRevision,
          catalog.expectedRepositoryRevision,
        );
        if (
          input.transcript.checkpoint !== null &&
          input.transcript.checkpoint.workspaceId !== current.continuation.workspaceId
        ) {
          throw authorityErrorV1("process_checkpoint_workspace_mismatch");
        }
        let reviewedHead: { readonly checkpointId: string; readonly generation: number };
        if (current.record.head.repositoryRevision === catalog.expectedRepositoryRevision) {
          reviewedHead = await captureReviewedHeadV1(current);
        } else if (current.record.head.pendingReviewBinding !== null) {
          reviewedHead = {
            checkpointId: current.record.head.pendingReviewBinding.checkpointId,
            generation: current.record.head.pendingReviewBinding.generation,
          };
        } else {
          return await compositeConflictV1(current.record, input.transcript.processId);
        }
        return await repository.applyProgramRevisionWithProcessTranscript({
          catalog: { ...catalog, continuation, reviewedHead },
          transcript: transcriptAtReviewedHeadV1(
            input.transcript,
            reviewedHead,
          ),
        });
      });
    },

    applyAgentRevision(input) {
      return serializeV1(async () => {
        const catalog = input.catalog;
        const current = await requirePairV1(catalog.programId);
        const continuation = predecessorContinuationV1(
          current.continuation,
          catalog.expectedProposal.programRevision,
          catalog.expectedRepositoryRevision,
        );
        if (input.transcript.checkpoint.workspaceId !== current.continuation.workspaceId) {
          throw authorityErrorV1("process_checkpoint_workspace_mismatch");
        }
        let reviewedHead: { readonly checkpointId: string; readonly generation: number };
        if (current.record.head.repositoryRevision === catalog.expectedRepositoryRevision) {
          reviewedHead = await captureReviewedHeadV1(current);
        } else if (current.record.head.pendingReviewBinding !== null) {
          reviewedHead = {
            checkpointId: current.record.head.pendingReviewBinding.checkpointId,
            generation: current.record.head.pendingReviewBinding.generation,
          };
        } else {
          return await executionCompositeConflictV1(
            current.record,
            input.transcript.processId,
          );
        }
        const operationInput = {
          lease: input.lease,
          observedAt: input.observedAt,
          catalog: { ...catalog, continuation, reviewedHead },
          transcript: transcriptAtReviewedHeadV1(input.transcript, reviewedHead),
        };
        try {
          return await repository.commitProgramRevisionWithProcessExecutionTerminal(
            operationInput,
          );
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") throw error;
          const queried = await repository.queryProcessOperation({
            operation: "program_revision_terminal",
            input: operationInput,
          });
          if (queried.kind === "absent") throw error;
          if (queried.kind === "mismatch") {
            throw authorityErrorV1("repository_response_mismatch");
          }
          const [record, process] = await Promise.all([
            repository.load(catalog.programId),
            repository.loadProcess(input.transcript.processId),
          ]);
          const receipt = queried.receipt;
          if (
            record === null || process === null ||
            receipt.programId !== catalog.programId ||
            receipt.programRevision !== record.currentProgram.revision ||
            receipt.repositoryRevision !== record.head.repositoryRevision ||
            receipt.processId !== process.processId ||
            receipt.processRevision !== process.revision ||
            receipt.transcriptFrontier !== process.transcriptFrontier
          ) throw authorityErrorV1("repository_response_mismatch");
          return {
            kind: "unchanged",
            record,
            process,
            entries: operationInput.transcript.entries,
            operationReceipt: receipt,
          };
        }
      });
    },

    decide(input) {
      return serializeV1(async () => {
        const catalog = input.catalog;
        const initial = await requirePairV1(catalog.programId);
        const continuation = predecessorContinuationV1(
          initial.continuation,
          catalog.expectedProposal.programRevision,
          catalog.expectedRepositoryRevision,
        );
        if (catalog.status === "rejected") {
          const settled = await repository.decideProgramWithProcessTranscript({
            catalog: { ...catalog, continuation },
            transcript: input.transcript,
          });
          if (settled.kind === "conflict") return settled;
          const durable = await requirePairV1(catalog.programId);
          const workspaceSessionId = await ensureHostSessionForPairV1(durable);
          const candidate = await host.querySnapshotCandidate(workspaceSessionId);
          if (candidate !== null) {
            await discardUnreferencedSnapshotV1(workspaceSessionId, candidate);
          }
          return settled;
        }

        const existing = await repository.loadDecision(
          catalog.programId,
          catalog.expectedProposal.proposalId,
          catalog.expectedProposal.programRevision,
        );
        if (existing?.status === "rejected") {
          return await compositeConflictV1(initial.record, input.transcript.processId);
        }
        if (existing === null && !acceptedInputMatchesCurrentReviewV1(initial, catalog)) {
          return await compositeConflictV1(initial.record, input.transcript.processId);
        }
        let workspaceSessionId: string;
        let receipt: ProgramWorkspaceSnapshotReceiptV1;
        if (existing?.status === "accepted") {
          workspaceSessionId = await ensureHostSessionForPairV1(initial);
          receipt = existing.snapshot;
        } else {
          const prepared = await prepareAcceptedSnapshotV1(initial, catalog);
          workspaceSessionId = prepared.workspaceSessionId;
          receipt = prepared.receipt;
          const rechecked = await requirePairV1(catalog.programId);
          if (!pairsEqualV1(initial, rechecked)) {
            await discardUnreferencedSnapshotV1(workspaceSessionId, receipt);
            return await compositeConflictV1(rechecked.record, input.transcript.processId);
          }
        }
        const settled = await repository.decideProgramWithProcessTranscript({
          catalog: {
            ...catalog,
            continuation,
            snapshotReceipt: receipt,
          },
          transcript: input.transcript,
        });
        if (settled.kind === "conflict") {
          await discardUnreferencedSnapshotV1(workspaceSessionId, receipt);
          return settled;
        }
        await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
        return settled;
      });
    },

    loadProgramNetworkAccess(programId) {
      return serializeV1(() => repository.loadProgramNetworkAccess(programId));
    },

    setProgramNetworkAccess(input) {
      return serializeV1(() => repository.setProgramNetworkAccess(input));
    },

    withAgentSubmitAdmission(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.programId);
        const access = await repository.loadProgramNetworkAccess(input.programId);
        const active = activeWorkspace;
        if (
          pair.record.head.currentProgramRevision !== input.expectedProgramRevision ||
          pair.record.head.repositoryRevision !== input.expectedRepositoryRevision
        ) throw authorityErrorV1("agent_submit_stale");
        if (
          active === null || active.owner.kind !== "program" ||
          active.owner.programId !== input.programId ||
          active.workspaceSessionId !== input.workspaceSessionId ||
          !active.environmentAttached
        ) throw authorityErrorV1("workspace_mismatch");
        const snapshot = validateHostSnapshotV1(
          await host.queryWorkspace(input.workspaceSessionId),
          pair,
          input.workspaceSessionId,
        );
        if (
          snapshot.checkpointId !== input.expectedCheckpointId ||
          snapshot.descriptor.generation !== input.expectedGeneration
        ) {
          throw authorityErrorV1("agent_submit_stale");
        }
        if (access === null || access.programId !== input.programId) {
          throw authorityErrorV1("network_access_missing");
        }
        return await input.operation(access);
      });
    },

    openWorkspace(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.programId, input.workspaceId);
        await reconcileAcceptedSnapshotsV1(pair);
        const workspaceSessionId = await ensureHostSessionForPairV1(pair);
        if (activeWorkspace?.environmentAttached === true) throw authorityErrorV1("workspace_busy");
        const attached = await host.attachEnvironment({ workspaceSessionId });
        validateHostSnapshotV1(attached.snapshot, pair, workspaceSessionId);
        activeWorkspace = {
          owner: { kind: "program", programId: input.programId },
          workspaceId: input.workspaceId,
          workspaceSessionId,
          environmentAttached: true,
        };
        return { snapshot: attached.snapshot, environmentPort: attached.environmentPort };
      });
    },

    openProcessWorkspace(input) {
      return serializeV1(async () => {
        const pair = await requireProcessWorkspacePairV1(input.processId, input.workspaceId);
        const workspaceSessionId = await ensureHostSessionForProcessWorkspaceV1(pair);
        if (activeWorkspace?.environmentAttached === true) throw authorityErrorV1("workspace_busy");
        const attached = await host.attachEnvironment({ workspaceSessionId });
        validateProcessWorkspaceHostSnapshotV1(attached.snapshot, pair, workspaceSessionId);
        const subjectProgramId = pair.process.subjectProgramId;
        if (subjectProgramId === null) throw authorityErrorV1("process_subject_missing");
        activeWorkspace = {
          owner: {
            kind: "process",
            processId: input.processId,
            subjectProgramId,
          },
          workspaceId: input.workspaceId,
          workspaceSessionId,
          environmentAttached: true,
        };
        return { snapshot: attached.snapshot, environmentPort: attached.environmentPort };
      });
    },

    importProcessWorkspaceFile(input) {
      return serializeV1(async () => {
        await requireCurrentProcessExecutionLeaseV1(input.lease, input.observedAt);
        const pair = await requireProcessWorkspacePairV1(input.processId, input.workspaceId);
        if (activeWorkspace?.environmentAttached === true) {
          throw authorityErrorV1("workspace_busy");
        }
        const workspaceSessionId = await ensureHostSessionForProcessWorkspaceV1(pair);
        const closeImportSessionV1 = async (): Promise<void> => {
          await host.closeWorkspace(workspaceSessionId);
          if (activeWorkspace?.workspaceSessionId === workspaceSessionId) {
            activeWorkspace = null;
          }
        };
        let imported: Awaited<ReturnType<BrowserWorkspaceHostPagePortV1["importFile"]>>;
        let snapshot: BrowserWorkspaceHostSnapshotWireV1;
        try {
          const initial = validateProcessWorkspaceHostSnapshotV1(
            await host.queryWorkspace(workspaceSessionId),
            pair,
            workspaceSessionId,
          );
          imported = await host.importFile({
            workspaceSessionId,
            expectedCheckpointId: initial.checkpointId,
            expectedGeneration: initial.descriptor.generation,
            path: input.path,
            bytes: input.bytes,
          });
          snapshot = validateProcessWorkspaceHostSnapshotV1(
            imported.snapshot,
            pair,
            workspaceSessionId,
          );
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") {
            // A known non-commit result can release the UI-only session. Keep
            // the original import failure if release itself also fails.
            await closeImportSessionV1().catch(() => undefined);
          }
          throw error;
        }
        const result: BrowserProcessWorkspaceImportFileResultV1 = {
          changed: imported.changed,
          source: {
            revision: 1,
            processId: pair.process.processId,
            workspaceId: pair.workspace.workspaceId,
            volumeId: pair.workspace.volumeId,
            workspaceFormat: pair.workspace.workspaceFormat,
            path: input.path,
            checkpointId: snapshot.checkpointId,
            generation: snapshot.descriptor.generation,
          },
        };
        // Success is reported only after the transient UI session releases its
        // volume lease. If close is lost/failed, retrying the same bytes/path
        // observes the durable head and Host replaceFile remains idempotent.
        await closeImportSessionV1();
        await requireCurrentProcessExecutionLeaseV1(input.lease, input.observedAt);
        return result;
      });
    },

    queryWorkspace(workspaceSessionId) {
      return serializeV1(async () => {
        if (activeWorkspace?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        return await host.queryWorkspace(workspaceSessionId);
      });
    },

    exportWorkspace(input) {
      return serializeV1(async () => {
        if (activeWorkspace?.workspaceSessionId !== input.workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (input.signal.aborted) return cancelledExportV1();
        const initialSnapshot = await host.queryWorkspace(input.workspaceSessionId);
        if (input.signal.aborted) return cancelledExportV1();
        if (initialSnapshot.phase !== "open") throw authorityErrorV1("workspace_not_open");
        const initialContinuation = await loadExportContinuationV1(initialSnapshot);
        if (input.signal.aborted) return cancelledExportV1();
        return await host.exportWorkspace({
          workspaceSessionId: input.workspaceSessionId,
          expectedCheckpointId: initialSnapshot.checkpointId,
          expectedGeneration: initialSnapshot.descriptor.generation,
          programRevision: initialContinuation.programRevision,
          repositoryRevision: initialContinuation.repositoryRevision,
          fileName: input.fileName,
          signal: input.signal,
          ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
          onReady: async (ready, startDownload) => {
            const assertCurrentExportV1 = async (): Promise<boolean> => {
              if (input.signal.aborted) return false;
              const currentSnapshot = await host.queryWorkspace(input.workspaceSessionId);
              if (
                currentSnapshot.phase !== "open" ||
                currentSnapshot.checkpointId !== initialSnapshot.checkpointId ||
                currentSnapshot.descriptor.generation !== initialSnapshot.descriptor.generation ||
                currentSnapshot.volumeId !== initialSnapshot.volumeId
              ) throw authorityErrorV1("export_anchor_changed");
              const currentContinuation = await loadExportContinuationV1(currentSnapshot);
              if (input.signal.aborted) return false;
              if (!continuationsEqualV1(currentContinuation, initialContinuation)) {
                throw authorityErrorV1("export_anchor_changed");
              }
              return true;
            };
            if (!(await assertCurrentExportV1())) return "cancel";
            let startPromise: Promise<void> | null = null;
            const startCurrentDownloadV1 = (): Promise<void> => {
              if (startPromise !== null) return startPromise;
              startPromise = (async () => {
                if (!(await assertCurrentExportV1())) {
                  throw new DOMException("Workspace export was aborted", "AbortError");
                }
                await startDownload();
              })();
              return startPromise;
            };
            return await input.onReady(ready, startCurrentDownloadV1);
          },
        });
      });
    },

    detachWorkspaceEnvironment(workspaceSessionId) {
      return serializeV1(() => {
        if (activeWorkspace?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (!activeWorkspace.environmentAttached) return Promise.resolve();
        activeWorkspace = { ...activeWorkspace, environmentAttached: false };
        return Promise.resolve();
      });
    },

    closeWorkspace(workspaceSessionId) {
      return serializeV1(async () => {
        if (activeWorkspace?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (activeWorkspace.environmentAttached) throw authorityErrorV1("workspace_busy");
        const closed = await host.closeWorkspace(workspaceSessionId);
        activeWorkspace = null;
        return closed;
      });
    },

    closeActiveWorkspace() {
      const workspaceSessionId = activeWorkspace?.workspaceSessionId ?? null;
      return serializeV1(async () => {
        if (
          workspaceSessionId === null ||
          activeWorkspace?.workspaceSessionId !== workspaceSessionId
        ) return null;
        if (activeWorkspace.environmentAttached) throw authorityErrorV1("workspace_busy");
        const closed = await host.closeWorkspace(workspaceSessionId);
        activeWorkspace = null;
        return closed;
      });
    },

    inspectStorage() {
      return serializeV1(() => host.inspectStorage());
    },

    resetStoredData() {
      return serializeV1(async () => {
        if (activeWorkspace?.environmentAttached === true) {
          return {
            productRepository: { kind: "retained" },
            workspaceVolumes: { kind: "failed", diagnosticCode: "workspace_busy" },
          };
        }
        await initializeRepositoryV1();
        try {
          await repository.reset();
        } catch (error) {
          return {
            productRepository: {
              kind: "failed",
              diagnosticCode: failureCodeV1(error) ?? "repository_reset_failed",
            },
            workspaceVolumes: { kind: "retained" },
          };
        }

        if (activeWorkspace !== null) {
          try {
            await host.closeWorkspace(activeWorkspace.workspaceSessionId);
            activeWorkspace = null;
          } catch (error) {
            return {
              productRepository: { kind: "cleared" },
              workspaceVolumes: {
                kind: "failed",
                diagnosticCode: failureCodeV1(error) ?? "workspace_close_failed",
              },
            };
          }
        }
        try {
          await host.purgeAllWorkspaces();
          return {
            productRepository: { kind: "cleared" },
            workspaceVolumes: { kind: "cleared" },
          };
        } catch (error) {
          return {
            productRepository: { kind: "cleared" },
            workspaceVolumes: {
              kind: "failed",
              diagnosticCode: failureCodeV1(error) ?? "workspace_purge_failed",
            },
          };
        }
      }, "exclusive");
    },

    subscribeFatal(listener) {
      if (lifecycle !== "active") return () => {};
      fatalListeners.add(listener);
      return () => fatalListeners.delete(listener);
    },

    async dispose() {
      if (lifecycle === "disposed") return;
      if (disposePromise !== null) return await disposePromise;
      lifecycle = "disposing";
      disposePromise = (async () => {
        await operationTail;
        unsubscribeHostFatal();
        fatalListeners.clear();
        const sessionId = activeWorkspace?.workspaceSessionId ?? null;
        activeWorkspace = null;
        if (sessionId !== null) await host.closeWorkspace(sessionId).catch(() => undefined);
        host.dispose();
        await repository.dispose().catch(() => undefined);
        lifecycle = "disposed";
      })();
      return await disposePromise;
    },
  };
}
