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
  ProgramDataRepositoryV1,
  ProgramProcessCompositeCommitResultV1,
  ProgramProcessCreateCompositeCommitResultV1,
  ProgramProcessCreateBundleInputV1,
  ProgramProcessDecisionBundleInputV1,
  ProgramProcessExecutionCompositeCommitResultV1,
  ProgramProcessRevisionBundleInputV1,
} from "./program-data-repository.ts";
import type { ProcessExecutionLeaseV1 } from "./process-execution-repository.ts";
import type {
  ProgramNetworkAccessMutationResultV1,
  ProgramNetworkAccessMutationV1,
  ProgramNetworkAccessV1,
} from "./program-network-access.ts";

interface DurableProgramPairV1 {
  readonly record: ProgramCatalogRecordV1;
  readonly continuation: ProgramCatalogContinuationV1;
}

interface ActiveWorkspaceV1 {
  readonly programId: string;
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
): BrowserProgramWorkspaceAuthorityV1 {
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

  const matchingActiveSessionForPairV1 = (pair: DurableProgramPairV1): string | null => {
    const active = activeWorkspace;
    if (active === null) return null;
    if (
      active.programId !== pair.record.head.programId ||
      active.workspaceId !== pair.record.head.workspaceId
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
            programId: pair.record.head.programId,
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
        activeWorkspace?.programId === programId &&
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

    create(input) {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        const catalog = input.catalog;
        if (
          activeWorkspace !== null && activeWorkspace.programId !== catalog.program.programId
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
          active === null || active.programId !== input.programId ||
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
          programId: input.programId,
          workspaceId: input.workspaceId,
          workspaceSessionId,
          environmentAttached: true,
        };
        return { snapshot: attached.snapshot, environmentPort: attached.environmentPort };
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
      return serializeV1(async () => {
        if (activeWorkspace === null) return null;
        if (activeWorkspace.environmentAttached) throw authorityErrorV1("workspace_busy");
        const closed = await host.closeWorkspace(activeWorkspace.workspaceSessionId);
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
