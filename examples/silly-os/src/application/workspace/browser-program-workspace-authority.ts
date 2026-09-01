// SPDX-License-Identifier: MIT

import type {
  BrowserWorkspaceHostExportReadyV1,
  BrowserWorkspaceHostExportResultV1,
  BrowserWorkspaceHostFatalV1,
} from "../../workspace/browser-workspace-host-port.ts";
import {
  createBrowserWorkspaceHostPagePortV1,
  type BrowserWorkspaceHostPagePortV1,
} from "../../workspace/browser-workspace-host-port.ts";
import { createBrowserWorkspaceSandboxFrameTransportV1 } from "../../workspace/browser-workspace-sandbox-frame-transport.ts";
import type {
  BrowserWorkspaceHostExportProgressWireV1,
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceHostStorageInspectionWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
  BrowserWorkspaceVolumeCandidateWireV1,
} from "../../workspace/browser-workspace-host-protocol.ts";
import type { WorkspaceImmutableSnapshotReceiptV1 } from "../../workspace/contracts.ts";
import { createBrowserProgramDataRepositoryV1 } from "../persistence/browser-program-data-repository.ts";
import type {
  ProcessWorkspaceBindingV1,
  ProcessWorkspaceCreateBundleInputV1,
  ProcessWorkspaceCreateCompositeCommitResultV1,
  ProgramDataRepositoryV1,
} from "../persistence/program-data-repository.ts";
import type { ProcessExecutionLeaseV1 } from "../../program-platform/process/process-execution-repository.ts";
import type {
  ProcessCheckpointV1,
  ProcessHeadV1,
} from "../../program-platform/process/program-process-repository.ts";
import type { InstalledProgramPackageReferenceV1 } from "../../program-platform/package/program-package-archive.ts";
import type {
  ProcessNetworkAccessMutationResultV1,
  ProcessNetworkAccessMutationV1,
  ProcessNetworkAccessV1,
} from "../../program-platform/capabilities/process-network-access.ts";

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
  readonly programDataRepository: BrowserProgramWorkspaceDataResetStateV1;
  readonly workspaceVolumes: BrowserProgramWorkspaceDataResetStateV1;
}

type BrowserProcessWorkspaceCreateTranscriptV1 =
  & Omit<ProcessWorkspaceCreateBundleInputV1["transcript"], "checkpoint">
  & {
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

export interface BrowserProcessWorkspaceReadFileResultV1 {
  readonly bytes: Uint8Array;
  readonly source: BrowserProcessWorkspaceFileSourceBindingV1;
}

/** Product-neutral Process/VFS/Workspace authority consumed by every Program. */
export interface BrowserProgramWorkspaceAuthorityV1 {
  initialize(): Promise<void>;
  createProcessWorkspace(
    input: BrowserProcessWorkspaceCreateInputV1,
  ): Promise<ProcessWorkspaceCreateCompositeCommitResultV1>;
  inspectProcessWorkspace(
    processId: string,
    options?: { readonly hostAccess?: "required" | "active_only" },
  ): Promise<BrowserProcessWorkspaceInspectionV1 | null>;
  /**
   * Verifies that the exact durable volume bound to a Process can be opened.
   * A session acquired only for this probe is closed before the operation
   * settles; the probe never attaches an execution environment.
   */
  probeProcessWorkspace(processId: string): Promise<boolean>;
  importProcessWorkspaceFile(input: {
    readonly processId: string;
    readonly workspaceId: string;
    readonly lease: ProcessExecutionLeaseV1;
    readonly observedAt: number;
    readonly path: string;
    readonly bytes: Uint8Array;
  }): Promise<BrowserProcessWorkspaceImportFileResultV1>;
  readProcessWorkspaceFile(input: {
    readonly processId: string;
    readonly workspaceId: string;
    readonly path: string;
  }): Promise<BrowserProcessWorkspaceReadFileResultV1>;
  openProcessWorkspace(input: {
    readonly processId: string;
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
  loadProcessNetworkAccess(processId: string): Promise<ProcessNetworkAccessV1 | null>;
  setProcessNetworkAccess(
    input: ProcessNetworkAccessMutationV1,
  ): Promise<ProcessNetworkAccessMutationResultV1>;
  withAgentSubmitAdmission<T>(input: {
    readonly agentRunId: string;
    readonly processAttemptGeneration: number;
    readonly processId: string;
    readonly programId: string;
    readonly programPackage: InstalledProgramPackageReferenceV1;
    readonly workspaceSessionId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly operation: (access: ProcessNetworkAccessV1) => Promise<T>;
  }): Promise<T>;
  resetStoredData(): Promise<BrowserProgramWorkspaceDataResetResultV1>;
  subscribeFatal(listener: (fatal: BrowserProgramWorkspaceFatalV1) => void): () => void;
  dispose(): Promise<void>;
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

/** Package-private pair used by Program-specific persistence adapters. */
export interface BrowserProcessWorkspacePairV1 {
  readonly process: ProcessHeadV1;
  readonly workspace: ProcessWorkspaceBindingV1;
}

/**
 * Narrow package-private capability for a Program persistence adapter that must
 * bind its own metadata to the same Workspace candidate/publication. The
 * shared authority remains the only Host/session/volume owner.
 */
export interface BrowserProgramWorkspaceInternalCapabilityV1 {
  readonly repository: ProgramDataRepositoryV1;
  loadPair(processId: string): Promise<BrowserProcessWorkspacePairV1 | null>;
  requirePair(
    processId: string,
    workspaceId?: string,
  ): Promise<BrowserProcessWorkspacePairV1>;
  ensureHostSession(pair: BrowserProcessWorkspacePairV1): Promise<string>;
  inspectMutableHead(
    pair: BrowserProcessWorkspacePairV1,
    hostAccess: "required" | "active_only",
  ): Promise<{ readonly checkpointId: string; readonly generation: number } | null>;
  openPair(pair: BrowserProcessWorkspacePairV1): Promise<BrowserProgramWorkspaceOpenResultV1>;
  requireActiveEnvironment(input: {
    readonly pair: BrowserProcessWorkspacePairV1;
    readonly workspaceSessionId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
  }): Promise<void>;
  captureStableHead(pair: BrowserProcessWorkspacePairV1): Promise<{
    readonly checkpointId: string;
    readonly generation: number;
  }>;
  withBootstrapCandidate<T>(input: {
    readonly process: Pick<ProcessHeadV1, "programPackage" | "subjectProgramId">;
    readonly workspaceId: string;
    readonly operation: (candidate: BrowserWorkspaceVolumeCandidateWireV1) => Promise<T>;
  }): Promise<T>;
  discardCandidate(volumeId: string): Promise<void>;
  querySnapshotCandidate(
    workspaceSessionId: string,
  ): Promise<WorkspaceImmutableSnapshotReceiptV1 | null>;
  prepareSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly snapshotId: string;
    readonly publicationId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly sourceRevision: number;
    readonly baseRevision: number;
  }): Promise<WorkspaceImmutableSnapshotReceiptV1>;
  resumeSnapshotPublication(input: {
    readonly workspaceSessionId: string;
    readonly expected: WorkspaceImmutableSnapshotReceiptV1;
  }): Promise<WorkspaceImmutableSnapshotReceiptV1>;
  queryRetainedSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: WorkspaceImmutableSnapshotReceiptV1;
  }): Promise<WorkspaceImmutableSnapshotReceiptV1 | null>;
  adoptSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: WorkspaceImmutableSnapshotReceiptV1;
  }): Promise<"adopted" | "already_retained">;
  discardSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: WorkspaceImmutableSnapshotReceiptV1;
  }): Promise<"discarded" | "absent" | "retained">;
}

export interface BrowserProgramWorkspaceAuthorityHostV1 extends BrowserProgramWorkspaceAuthorityV1 {
  runWithInternalCapability<T>(
    operation: (capability: BrowserProgramWorkspaceInternalCapabilityV1) => Promise<T>,
  ): Promise<T>;
}

export interface BrowserProgramWorkspaceAuthorityOptionsV1 {
  readonly repository?: ProgramDataRepositoryV1;
  readonly host?: BrowserWorkspaceHostPagePortV1;
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

function authorityErrorV1(code: string): BrowserProgramWorkspaceAuthorityErrorV1 {
  return new BrowserProgramWorkspaceAuthorityErrorV1(code);
}

function failureCodeV1(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : null;
}

function processWorkspaceProgramIdV1(
  process: Pick<ProcessHeadV1, "programPackage" | "subjectProgramId">,
): string {
  return process.subjectProgramId ?? process.programPackage.programId;
}

function anchorFromPairV1(
  pair: BrowserProcessWorkspacePairV1,
): BrowserWorkspaceVolumeAnchorWireV1 {
  return {
    revision: 1,
    programId: processWorkspaceProgramIdV1(pair.process),
    workspaceId: pair.workspace.workspaceId,
    volumeId: pair.workspace.volumeId,
    workspaceFormat: pair.workspace.workspaceFormat,
  };
}

function pairV1(
  pair: BrowserProcessWorkspacePairV1,
  processId: string,
  workspaceId?: string,
): BrowserProcessWorkspacePairV1 {
  const checkpoint = pair.process.checkpoint;
  if (
    pair.process.processId !== processId || pair.workspace.processId !== processId ||
    checkpoint === null || checkpoint.workspaceId !== pair.workspace.workspaceId ||
    checkpoint.workspaceCheckpointId.length === 0 || checkpoint.workspaceGeneration <= 0 ||
    (workspaceId !== undefined && pair.workspace.workspaceId !== workspaceId)
  ) throw authorityErrorV1("process_workspace_mismatch");
  return pair;
}

function pairsEqualV1(
  left: BrowserProcessWorkspacePairV1,
  right: BrowserProcessWorkspacePairV1,
): boolean {
  return left.process.processId === right.process.processId &&
    left.process.revision === right.process.revision &&
    left.process.transcriptFrontier === right.process.transcriptFrontier &&
    left.workspace.processId === right.workspace.processId &&
    left.workspace.workspaceId === right.workspace.workspaceId &&
    left.workspace.volumeId === right.workspace.volumeId &&
    left.workspace.workspaceFormat === right.workspace.workspaceFormat;
}

function workspaceFromCandidateV1(
  input: BrowserProcessWorkspaceCreateInputV1,
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
): ProcessWorkspaceBindingV1 {
  const programId = processWorkspaceProgramIdV1(input.process);
  if (
    candidate.anchor.programId !== programId ||
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

function createBundleV1(
  input: BrowserProcessWorkspaceCreateInputV1,
  workspace: ProcessWorkspaceBindingV1,
  head: { readonly checkpointId: string; readonly generation: number },
): ProcessWorkspaceCreateBundleInputV1 {
  return {
    process: input.process,
    workspace,
    transcript: {
      ...input.transcript,
      checkpoint: {
        ...input.transcript.checkpoint,
        workspaceId: workspace.workspaceId,
        workspaceCheckpointId: head.checkpointId,
        workspaceGeneration: head.generation,
      },
    },
  };
}

function pairOwnsCandidateV1(
  pair: BrowserProcessWorkspacePairV1,
  input: BrowserProcessWorkspaceCreateInputV1,
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
): boolean {
  const checkpoint = pair.process.checkpoint;
  return pair.process.processId === input.process.processId &&
    pair.process.programPackage.programId === input.process.programPackage.programId &&
    pair.process.programPackage.packageVersion === input.process.programPackage.packageVersion &&
    pair.process.programPackage.contentDigest === input.process.programPackage.contentDigest &&
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

function leaseMatchesV1(left: ProcessExecutionLeaseV1, right: ProcessExecutionLeaseV1): boolean {
  return left.processId === right.processId &&
    left.ownerInstanceId === right.ownerInstanceId &&
    left.attemptId === right.attemptId && left.generation === right.generation;
}

function cancelledExportV1(): BrowserProgramWorkspaceExportResultV1 {
  return { kind: "cancelled", filesCompleted: 0, filesTotal: 0, bytesWritten: 0, bytesTotal: 0 };
}

interface ActiveWorkspaceV1 {
  readonly processId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly environmentAttached: boolean;
}

/** The sole Browser Host/VFS/session owner shared by every Program. */
export function createBrowserProgramWorkspaceAuthorityV1(
  options: BrowserProgramWorkspaceAuthorityOptionsV1 = {},
): BrowserProgramWorkspaceAuthorityHostV1 {
  const repository = options.repository ?? createBrowserProgramDataRepositoryV1();
  const host = options.host ?? createBrowserWorkspaceHostPagePortV1({
    transport: createBrowserWorkspaceSandboxFrameTransportV1(),
  });
  const operationFence = options.operationFence ?? createBrowserProgramWorkspaceOperationFenceV1();
  let initialized: Promise<void> | null = null;
  let active: ActiveWorkspaceV1 | null = null;
  let tail: Promise<void> = Promise.resolve();
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let disposePromise: Promise<void> | null = null;
  const fatalListeners = new Set<(fatal: BrowserProgramWorkspaceFatalV1) => void>();

  const unsubscribeFatal = host.subscribeFatal((fatal) => {
    if (lifecycle === "disposed") return;
    active = null;
    for (const listener of [...fatalListeners]) {
      try {
        listener(fatal);
      } catch {
        // Observers cannot alter authority lifecycle.
      }
    }
  });

  const serializeV1 = <T>(
    operation: () => Promise<T>,
    mode: "shared" | "exclusive" = "shared",
  ): Promise<T> => {
    if (lifecycle !== "active") return Promise.reject(authorityErrorV1("disposed"));
    const settled = tail.then(() => operationFence.run(mode, operation));
    tail = settled.then(() => undefined, () => undefined);
    return settled;
  };

  const initializeRepositoryV1 = (): Promise<void> => {
    initialized ??= repository.initialize();
    return initialized;
  };

  const loadPairV1 = async (processId: string): Promise<BrowserProcessWorkspacePairV1 | null> => {
    await initializeRepositoryV1();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [process, workspace] = await Promise.all([
        repository.loadProcess(processId),
        repository.loadProcessWorkspaceBinding(processId),
      ]);
      if (process === null && workspace === null) return null;
      if (process !== null && workspace !== null) {
        try {
          return pairV1({ process, workspace }, processId);
        } catch {
          // A concurrent Process successor can split the two read calls.
        }
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const requirePairV1 = async (
    processId: string,
    workspaceId?: string,
  ): Promise<BrowserProcessWorkspacePairV1> => {
    const pair = await loadPairV1(processId);
    if (pair === null) throw authorityErrorV1("process_workspace_unavailable");
    return pairV1(pair, processId, workspaceId);
  };

  const validateSnapshotV1 = (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
    pair: BrowserProcessWorkspacePairV1,
    workspaceSessionId: string,
  ): BrowserWorkspaceHostSnapshotWireV1 => {
    const programId = processWorkspaceProgramIdV1(pair.process);
    if (
      snapshot.phase !== "open" || snapshot.descriptor.programId !== programId ||
      snapshot.descriptor.workspaceId !== pair.workspace.workspaceId ||
      snapshot.descriptor.workspaceSessionId !== workspaceSessionId ||
      snapshot.volumeId !== pair.workspace.volumeId || snapshot.anchor.programId !== programId ||
      snapshot.anchor.workspaceId !== pair.workspace.workspaceId ||
      snapshot.anchor.volumeId !== pair.workspace.volumeId ||
      snapshot.anchor.workspaceFormat !== pair.workspace.workspaceFormat
    ) throw authorityErrorV1("workspace_snapshot_mismatch");
    return snapshot;
  };

  const matchingSessionV1 = (pair: BrowserProcessWorkspacePairV1): string | null => {
    if (active === null) return null;
    if (
      active.processId !== pair.process.processId ||
      active.programId !== processWorkspaceProgramIdV1(pair.process) ||
      active.workspaceId !== pair.workspace.workspaceId
    ) throw authorityErrorV1("workspace_busy");
    return active.workspaceSessionId;
  };

  const ensureSessionV1 = async (pair: BrowserProcessWorkspacePairV1): Promise<string> => {
    const matching = matchingSessionV1(pair);
    if (matching !== null) return matching;
    const programId = processWorkspaceProgramIdV1(pair.process);
    return await host.withBootstrapLease({
      programId,
      workspaceId: pair.workspace.workspaceId,
      operation: async () => {
        const opened = await host.openWorkspace(anchorFromPairV1(pair));
        try {
          validateSnapshotV1(opened, pair, opened.descriptor.workspaceSessionId);
          active = {
            processId: pair.process.processId,
            programId,
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

  const captureStableHeadV1 = async (pair: BrowserProcessWorkspacePairV1) => {
    const sessionId = await ensureSessionV1(pair);
    const snapshot = validateSnapshotV1(await host.captureStableHead(sessionId), pair, sessionId);
    return { checkpointId: snapshot.checkpointId, generation: snapshot.descriptor.generation };
  };

  const inspectMutableHeadV1 = async (
    pair: BrowserProcessWorkspacePairV1,
    hostAccess: "required" | "active_only",
  ): Promise<{ readonly checkpointId: string; readonly generation: number } | null> => {
    let sessionId: string | null = null;
    if (
      active?.processId === pair.process.processId &&
      active.programId === processWorkspaceProgramIdV1(pair.process) &&
      active.workspaceId === pair.workspace.workspaceId
    ) sessionId = active.workspaceSessionId;
    else if (hostAccess === "required") sessionId = await ensureSessionV1(pair);
    if (sessionId === null) return null;
    const snapshot = validateSnapshotV1(await host.queryWorkspace(sessionId), pair, sessionId);
    return { checkpointId: snapshot.checkpointId, generation: snapshot.descriptor.generation };
  };

  const openPairV1 = async (
    pair: BrowserProcessWorkspacePairV1,
  ): Promise<BrowserProgramWorkspaceOpenResultV1> => {
    const sessionId = await ensureSessionV1(pair);
    if (active?.environmentAttached === true) throw authorityErrorV1("workspace_busy");
    const attached = await host.attachEnvironment({ workspaceSessionId: sessionId });
    validateSnapshotV1(attached.snapshot, pair, sessionId);
    active = { ...active!, environmentAttached: true };
    return { snapshot: attached.snapshot, environmentPort: attached.environmentPort };
  };

  const requireLeaseV1 = async (lease: ProcessExecutionLeaseV1, observedAt: number) => {
    const [process, currentLease] = await Promise.all([
      repository.loadProcess(lease.processId),
      repository.loadProcessExecutionLease(lease.processId),
    ]);
    if (
      !Number.isSafeInteger(observedAt) || observedAt < 0 || observedAt >= lease.expiresAt ||
      process === null || currentLease === null || !leaseMatchesV1(currentLease, lease) ||
      currentLease.expiresAt < lease.expiresAt ||
      process.activeAttempt?.attemptId !== lease.attemptId ||
      process.activeAttempt.generation !== lease.generation
    ) throw authorityErrorV1("process_execution_stale");
  };

  const capability: BrowserProgramWorkspaceInternalCapabilityV1 = {
    repository,
    loadPair: loadPairV1,
    requirePair: requirePairV1,
    ensureHostSession: ensureSessionV1,
    inspectMutableHead: inspectMutableHeadV1,
    openPair: openPairV1,
    async requireActiveEnvironment(input) {
      if (
        active === null || active.processId !== input.pair.process.processId ||
        active.programId !== processWorkspaceProgramIdV1(input.pair.process) ||
        active.workspaceId !== input.pair.workspace.workspaceId ||
        active.workspaceSessionId !== input.workspaceSessionId || !active.environmentAttached
      ) throw authorityErrorV1("workspace_mismatch");
      const snapshot = validateSnapshotV1(
        await host.queryWorkspace(input.workspaceSessionId),
        input.pair,
        input.workspaceSessionId,
      );
      if (
        snapshot.checkpointId !== input.expectedCheckpointId ||
        snapshot.descriptor.generation !== input.expectedGeneration
      ) throw authorityErrorV1("agent_submit_stale");
    },
    captureStableHead: captureStableHeadV1,
    withBootstrapCandidate(input) {
      const programId = processWorkspaceProgramIdV1(input.process);
      return host.withBootstrapLease({
        programId,
        workspaceId: input.workspaceId,
        operation: async () => {
          const candidate = await host.createCandidate({
            programId,
            workspaceId: input.workspaceId,
          });
          return await input.operation(candidate);
        },
      });
    },
    discardCandidate: (volumeId) => host.discardCandidate(volumeId),
    querySnapshotCandidate: (workspaceSessionId) => host.querySnapshotCandidate(workspaceSessionId),
    prepareSnapshot: (input) => host.prepareSnapshot(input),
    resumeSnapshotPublication: (input) => host.resumeSnapshotPublication(input),
    queryRetainedSnapshot: (input) => host.queryRetainedSnapshot(input),
    adoptSnapshot: (input) => host.adoptSnapshot(input),
    discardSnapshot: (input) => host.discardSnapshot(input),
  };

  const authority: BrowserProgramWorkspaceAuthorityHostV1 = {
    initialize() {
      return serializeV1(initializeRepositoryV1);
    },

    runWithInternalCapability(operation) {
      return serializeV1(() => operation(capability));
    },

    createProcessWorkspace(input) {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        const programId = processWorkspaceProgramIdV1(input.process);
        if (
          active !== null &&
          (active.processId !== input.process.processId || active.programId !== programId ||
            active.workspaceId !== input.workspaceId)
        ) throw authorityErrorV1("workspace_busy");
        return await host.withBootstrapLease({
          programId,
          workspaceId: input.workspaceId,
          operation: async () => {
            const existing = await loadPairV1(input.process.processId);
            if (existing !== null) {
              const checkpoint = existing.process.checkpoint;
              if (checkpoint === null) throw authorityErrorV1("process_workspace_mismatch");
              return await repository.createProcessWithWorkspace(
                createBundleV1(input, existing.workspace, {
                  checkpointId: checkpoint.workspaceCheckpointId,
                  generation: checkpoint.workspaceGeneration,
                }),
              );
            }
            const candidate = await host.createCandidate({
              programId,
              workspaceId: input.workspaceId,
            });
            let workspace: ProcessWorkspaceBindingV1;
            try {
              workspace = workspaceFromCandidateV1(input, candidate);
            } catch (error) {
              await host.discardCandidate(candidate.anchor.volumeId);
              throw error;
            }
            const bundle = createBundleV1(input, workspace, candidate);
            let preserveCandidate = false;
            let discarded = false;
            const discardV1 = async () => {
              if (discarded) return;
              await host.discardCandidate(candidate.anchor.volumeId);
              discarded = true;
            };
            try {
              let settled: ProcessWorkspaceCreateCompositeCommitResultV1;
              try {
                settled = await repository.createProcessWithWorkspace(bundle);
              } catch (error) {
                if (failureCodeV1(error) !== "outcome_unknown") {
                  await discardV1();
                  throw error;
                }
                try {
                  settled = await repository.createProcessWithWorkspace(bundle);
                } catch (reconcileError) {
                  if (failureCodeV1(reconcileError) === "outcome_unknown") preserveCandidate = true;
                  else {
                    try {
                      const durable = await loadPairV1(input.process.processId);
                      preserveCandidate = durable !== null &&
                        pairOwnsCandidateV1(durable, input, candidate);
                    } catch {
                      preserveCandidate = true;
                    }
                    if (!preserveCandidate) await discardV1();
                  }
                  throw reconcileError;
                }
              }
              if (settled.kind === "committed" || settled.kind === "unchanged") {
                const current = pairV1(
                  { process: settled.process, workspace: settled.workspace },
                  input.process.processId,
                  input.workspaceId,
                );
                if (!pairOwnsCandidateV1(current, input, candidate)) {
                  throw authorityErrorV1("repository_response_mismatch");
                }
                // A committed volume is no longer a disposable bootstrap
                // candidate. Open and close it while the bootstrap lease is
                // still held so the Host releases its candidate bookkeeping;
                // otherwise a second Process cannot create its own Workspace
                // until this one happens to run an Agent.
                const opened = await host.openWorkspace(candidate.anchor);
                try {
                  validateSnapshotV1(
                    opened,
                    current,
                    opened.descriptor.workspaceSessionId,
                  );
                } finally {
                  await host.closeWorkspace(opened.descriptor.workspaceSessionId);
                }
                return settled;
              }
              if (
                settled.kind !== "conflict" ||
                settled.currentWorkspace?.volumeId !== candidate.anchor.volumeId
              ) await discardV1();
              return settled;
            } catch (error) {
              const code = failureCodeV1(error);
              if (
                !discarded && !preserveCandidate && code !== "outcome_unknown" &&
                code !== "repository_response_mismatch"
              ) await discardV1();
              throw error;
            }
          },
        });
      });
    },

    inspectProcessWorkspace(processId, inspectionOptions) {
      return serializeV1(async () => {
        const hostAccess = inspectionOptions?.hostAccess ?? "active_only";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const initial = await loadPairV1(processId);
          if (initial === null) return null;
          const mutableHead = await inspectMutableHeadV1(initial, hostAccess);
          const current = await loadPairV1(processId);
          if (current !== null && pairsEqualV1(initial, current)) {
            return { process: current.process, workspace: current.workspace, mutableHead };
          }
        }
        throw authorityErrorV1("repository_pair_changed");
      });
    },

    probeProcessWorkspace(processId) {
      return serializeV1(async () => {
        const pair = await loadPairV1(processId);
        if (pair === null) return false;
        const predecessorSessionId = matchingSessionV1(pair);
        const sessionId = predecessorSessionId ?? await ensureSessionV1(pair);
        try {
          validateSnapshotV1(await host.queryWorkspace(sessionId), pair, sessionId);
          return true;
        } finally {
          if (predecessorSessionId === null) {
            await host.closeWorkspace(sessionId);
            if (active?.workspaceSessionId === sessionId) active = null;
          }
        }
      });
    },

    openProcessWorkspace(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.processId, input.workspaceId);
        return await openPairV1(pair);
      });
    },

    importProcessWorkspaceFile(input) {
      return serializeV1(async () => {
        await requireLeaseV1(input.lease, input.observedAt);
        const pair = await requirePairV1(input.processId, input.workspaceId);
        if (active?.environmentAttached === true) throw authorityErrorV1("workspace_busy");
        const sessionId = await ensureSessionV1(pair);
        const closeV1 = async () => {
          await host.closeWorkspace(sessionId);
          if (active?.workspaceSessionId === sessionId) active = null;
        };
        let imported: Awaited<ReturnType<BrowserWorkspaceHostPagePortV1["importFile"]>>;
        let snapshot: BrowserWorkspaceHostSnapshotWireV1;
        try {
          const initial = validateSnapshotV1(await host.queryWorkspace(sessionId), pair, sessionId);
          imported = await host.importFile({
            workspaceSessionId: sessionId,
            expectedCheckpointId: initial.checkpointId,
            expectedGeneration: initial.descriptor.generation,
            path: input.path,
            bytes: input.bytes,
          });
          snapshot = validateSnapshotV1(imported.snapshot, pair, sessionId);
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") await closeV1().catch(() => undefined);
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
        await closeV1();
        await requireLeaseV1(input.lease, input.observedAt);
        return result;
      });
    },

    readProcessWorkspaceFile(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.processId, input.workspaceId);
        const predecessorSessionId = matchingSessionV1(pair);
        const sessionId = predecessorSessionId ?? await ensureSessionV1(pair);
        try {
          const initial = validateSnapshotV1(
            await host.queryWorkspace(sessionId),
            pair,
            sessionId,
          );
          const read = await host.readFile({
            workspaceSessionId: sessionId,
            expectedCheckpointId: initial.checkpointId,
            expectedGeneration: initial.descriptor.generation,
            path: input.path,
          });
          const snapshot = validateSnapshotV1(read.snapshot, pair, sessionId);
          if (
            snapshot.checkpointId !== initial.checkpointId ||
            snapshot.descriptor.generation !== initial.descriptor.generation
          ) throw authorityErrorV1("workspace_snapshot_mismatch");
          return {
            bytes: read.bytes,
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
        } finally {
          if (predecessorSessionId === null) {
            await host.closeWorkspace(sessionId);
            if (active?.workspaceSessionId === sessionId) active = null;
          }
        }
      });
    },

    queryWorkspace(workspaceSessionId) {
      return serializeV1(async () => {
        if (active?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        return await host.queryWorkspace(workspaceSessionId);
      });
    },

    exportWorkspace(input) {
      return serializeV1(async () => {
        if (active?.workspaceSessionId !== input.workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (input.signal.aborted) return cancelledExportV1();
        const activeProcessId = active.processId;
        const activeWorkspaceId = active.workspaceId;
        const [snapshot, pair] = await Promise.all([
          host.queryWorkspace(input.workspaceSessionId),
          requirePairV1(activeProcessId, activeWorkspaceId),
        ]);
        if (snapshot.phase !== "open") throw authorityErrorV1("workspace_not_open");
        validateSnapshotV1(snapshot, pair, input.workspaceSessionId);
        const sourceRevision = pair.process.revision;
        const baseRevision = pair.process.transcriptFrontier + 1;
        return await host.exportWorkspace({
          workspaceSessionId: input.workspaceSessionId,
          expectedCheckpointId: snapshot.checkpointId,
          expectedGeneration: snapshot.descriptor.generation,
          sourceRevision,
          baseRevision,
          fileName: input.fileName,
          signal: input.signal,
          ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
          onReady: async (ready, startDownload) => {
            if (input.signal.aborted) return "cancel";
            const [currentSnapshot, currentPair] = await Promise.all([
              host.queryWorkspace(input.workspaceSessionId),
              requirePairV1(activeProcessId, activeWorkspaceId),
            ]);
            if (
              currentSnapshot.checkpointId !== snapshot.checkpointId ||
              currentSnapshot.descriptor.generation !== snapshot.descriptor.generation ||
              currentPair.process.revision !== sourceRevision ||
              currentPair.process.transcriptFrontier + 1 !== baseRevision
            ) throw authorityErrorV1("export_anchor_changed");
            return await input.onReady(ready, async () => {
              const [latestSnapshot, latestPair] = await Promise.all([
                host.queryWorkspace(input.workspaceSessionId),
                requirePairV1(activeProcessId, activeWorkspaceId),
              ]);
              if (input.signal.aborted) {
                throw new DOMException("Workspace export was aborted", "AbortError");
              }
              if (
                latestSnapshot.checkpointId !== snapshot.checkpointId ||
                latestSnapshot.descriptor.generation !== snapshot.descriptor.generation ||
                latestPair.process.revision !== sourceRevision ||
                latestPair.process.transcriptFrontier + 1 !== baseRevision
              ) throw authorityErrorV1("export_anchor_changed");
              await startDownload();
            });
          },
        });
      });
    },

    detachWorkspaceEnvironment(workspaceSessionId) {
      return serializeV1(async () => {
        if (active?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (!active.environmentAttached) return;
        active = { ...active, environmentAttached: false };
      });
    },

    closeWorkspace(workspaceSessionId) {
      return serializeV1(async () => {
        if (active?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (active.environmentAttached) throw authorityErrorV1("workspace_busy");
        const closed = await host.closeWorkspace(workspaceSessionId);
        active = null;
        return closed;
      });
    },

    closeActiveWorkspace() {
      const sessionId = active?.workspaceSessionId ?? null;
      return serializeV1(async () => {
        if (sessionId === null || active?.workspaceSessionId !== sessionId) return null;
        if (active.environmentAttached) throw authorityErrorV1("workspace_busy");
        const closed = await host.closeWorkspace(sessionId);
        active = null;
        return closed;
      });
    },

    inspectStorage() {
      return serializeV1(() => host.inspectStorage());
    },

    loadProcessNetworkAccess(processId) {
      return serializeV1(() => repository.loadProcessNetworkAccess(processId));
    },

    setProcessNetworkAccess(input) {
      return serializeV1(() => repository.setProcessNetworkAccess(input));
    },

    withAgentSubmitAdmission(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.processId);
        const attempt = pair.process.activeAttempt;
        if (
          processWorkspaceProgramIdV1(pair.process) !== input.programId ||
          pair.process.programPackage.programId !== input.programPackage.programId ||
          pair.process.programPackage.packageVersion !== input.programPackage.packageVersion ||
          pair.process.programPackage.contentDigest !== input.programPackage.contentDigest ||
          attempt === null || attempt.attemptId !== input.agentRunId ||
          attempt.generation !== input.processAttemptGeneration ||
          attempt.startingCheckpoint.workspaceCheckpointId !== input.expectedCheckpointId ||
          attempt.startingCheckpoint.workspaceGeneration !== input.expectedGeneration
        ) throw authorityErrorV1("agent_submit_stale");
        await capability.requireActiveEnvironment({
          pair,
          workspaceSessionId: input.workspaceSessionId,
          expectedCheckpointId: input.expectedCheckpointId,
          expectedGeneration: input.expectedGeneration,
        });
        const access = await repository.loadProcessNetworkAccess(input.processId);
        if (access === null) throw authorityErrorV1("network_access_missing");
        return await input.operation(access);
      });
    },

    resetStoredData() {
      return serializeV1(async () => {
        if (active?.environmentAttached === true) {
          return {
            programDataRepository: { kind: "retained" },
            workspaceVolumes: { kind: "failed", diagnosticCode: "workspace_busy" },
          };
        }
        await initializeRepositoryV1();
        try {
          await repository.reset();
        } catch (error) {
          return {
            programDataRepository: {
              kind: "failed",
              diagnosticCode: failureCodeV1(error) ?? "repository_reset_failed",
            },
            workspaceVolumes: { kind: "retained" },
          };
        }
        if (active !== null) {
          try {
            await host.closeWorkspace(active.workspaceSessionId);
            active = null;
          } catch (error) {
            return {
              programDataRepository: { kind: "cleared" },
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
            programDataRepository: { kind: "cleared" },
            workspaceVolumes: { kind: "cleared" },
          };
        } catch (error) {
          return {
            programDataRepository: { kind: "cleared" },
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
        await tail;
        unsubscribeFatal();
        fatalListeners.clear();
        const sessionId = active?.workspaceSessionId ?? null;
        active = null;
        if (sessionId !== null) await host.closeWorkspace(sessionId).catch(() => undefined);
        host.dispose();
        await repository.dispose().catch(() => undefined);
        lifecycle = "disposed";
      })();
      return await disposePromise;
    },
  };
  return authority;
}
