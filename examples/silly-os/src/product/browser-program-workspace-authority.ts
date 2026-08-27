// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceHostPagePortV1,
  type BrowserWorkspaceHostExportReadyV1,
  type BrowserWorkspaceHostExportResultV1,
  type BrowserWorkspaceHostFatalV1,
  type BrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostExportProgressWireV1,
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
  BrowserWorkspaceVolumeCandidateWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "../workspace/contracts.ts";
import { createBrowserProgramRepositoryV3 } from "./browser-program-repository.ts";
import {
  advanceBrowserProgramContinuationV1,
  applyProgramRepositoryAgentRunTerminalV3,
  applyProgramRepositoryDecisionV3,
  applyProgramRepositoryRevisionV3,
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  buildProgramRepositoryCreateV3,
  programRepositoryAggregatesEqualV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryApplyRevisionInputV3,
  type ProgramRepositoryCommitResultV3,
  type ProgramRepositoryCreateInputV3,
  type ProgramRepositoryDecideInputV3,
  type ProgramRepositoryReviewBindingV3,
  type ProgramRepositorySettleAgentRunInputV3,
  type ProgramRepositorySummaryV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";

interface BrowserWorkspaceHostWorkerLikeV1 {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  removeEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  terminate(): void;
}

interface DurableProgramPairV1 {
  readonly aggregate: ProgramRepositoryAggregateV3;
  readonly continuation: BrowserProgramContinuationManifestV1;
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

export type BrowserProgramWorkspaceCreateInputV1 = Pick<
  ProgramRepositoryCreateInputV3,
  "snapshot" | "updatedAt"
>;

export type BrowserProgramWorkspaceApplyRevisionInputV1 = Omit<
  ProgramRepositoryApplyRevisionInputV3,
  "continuation" | "reviewedHead"
>;

export type BrowserProgramWorkspaceSettleAgentRunInputV1 = Omit<
  ProgramRepositorySettleAgentRunInputV3,
  "continuation" | "reviewedHead"
>;

interface BrowserProgramWorkspaceDecisionInputBaseV1 {
  readonly programId: ProgramRepositoryDecideInputV3["programId"];
  readonly expectedRepositoryRevision: ProgramRepositoryDecideInputV3["expectedRepositoryRevision"];
  readonly expectedProposal: ProgramRepositoryDecideInputV3["expectedProposal"];
  readonly snapshot: ProgramRepositoryDecideInputV3["snapshot"];
  readonly updatedAt: ProgramRepositoryDecideInputV3["updatedAt"];
}

export type BrowserProgramWorkspaceDecideInputV1 =
  | (BrowserProgramWorkspaceDecisionInputBaseV1 & { readonly status: "accepted" })
  | (BrowserProgramWorkspaceDecisionInputBaseV1 & { readonly status: "rejected" });

export interface BrowserProgramWorkspaceAuthorityV1 {
  initialize(): Promise<void>;
  list(): Promise<readonly ProgramRepositorySummaryV3[]>;
  load(programId: string): Promise<ProgramRepositoryAggregateV3 | null>;
  create(
    input: BrowserProgramWorkspaceCreateInputV1,
  ): Promise<ProgramRepositoryCommitResultV3>;
  applyRevision(
    input: BrowserProgramWorkspaceApplyRevisionInputV1,
  ): Promise<ProgramRepositoryCommitResultV3>;
  settleAgentRun(
    input: BrowserProgramWorkspaceSettleAgentRunInputV1,
  ): Promise<ProgramRepositoryCommitResultV3>;
  decide(input: BrowserProgramWorkspaceDecideInputV1): Promise<ProgramRepositoryCommitResultV3>;
  withAgentSubmitAdmission<T>(input: {
    readonly programId: string;
    readonly workspaceSessionId: string;
    readonly expectedProgramRevision: number;
    readonly expectedRepositoryRevision: number;
    readonly expectedGeneration: number;
    readonly operation: () => Promise<T>;
  }): Promise<T>;
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramWorkspaceOpenResultV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      commitRelease: () => boolean,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<BrowserProgramWorkspaceExportResultV1>;
  detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  closeActiveWorkspace(): Promise<BrowserWorkspaceHostSnapshotWireV1 | null>;
  subscribeFatal(listener: (fatal: BrowserProgramWorkspaceFatalV1) => void): () => void;
  dispose(): Promise<void>;
}

export interface BrowserProgramWorkspaceAuthorityOptionsV1 {
  readonly repository?: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly createRepository?: () => ProgramRepositoryWithWorkspaceContinuationV1;
  readonly host?: BrowserWorkspaceHostPagePortV1;
  readonly createHostWorker?: () => BrowserWorkspaceHostWorkerLikeV1;
  readonly createSnapshotId?: () => string;
}

function defaultHostWorkerV1(): BrowserWorkspaceHostWorkerLikeV1 {
  return new Worker(new URL("../workspace/browser-workspace-host.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-browser-workspace-host",
  }) as unknown as BrowserWorkspaceHostWorkerLikeV1;
}

function defaultSnapshotIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw authorityErrorV1("snapshot_identity_unavailable");
  }
  return `snapshot.local.${crypto.randomUUID()}`;
}

function authorityErrorV1(code: string): TypeError {
  return new TypeError(`sillyos.browser_program_workspace.${code}`);
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

function anchorFromContinuationV1(
  continuation: BrowserProgramContinuationManifestV1,
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
): BrowserProgramContinuationManifestV1 {
  const program = input.snapshot.program;
  const workspace = input.snapshot.workspace;
  if (
    program === null || workspace === null ||
    candidate.anchor.programId !== program.programId ||
    candidate.anchor.workspaceId !== workspace.workspaceId
  ) throw authorityErrorV1("candidate_identity_mismatch");
  return {
    revision: 1,
    programId: program.programId,
    workspaceId: workspace.workspaceId,
    volumeId: candidate.anchor.volumeId,
    workspaceFormat: candidate.anchor.workspaceFormat,
    programRevision: program.revision,
    repositoryRevision: 1,
  };
}

function predecessorContinuationV1(
  stored: BrowserProgramContinuationManifestV1,
  programRevision: number,
  repositoryRevision: number,
): BrowserProgramContinuationManifestV1 {
  return {
    ...stored,
    programRevision,
    repositoryRevision,
  };
}

function pairWorkspaceV1(
  pair: DurableProgramPairV1,
  programId: string,
  workspaceId?: string,
): DurableProgramPairV1 {
  const program = pair.aggregate.snapshot.program;
  const workspace = pair.aggregate.snapshot.workspace;
  if (
    pair.aggregate.programId !== programId || program?.programId !== programId ||
    workspace === null || pair.continuation.programId !== programId ||
    pair.continuation.workspaceId !== workspace.workspaceId ||
    (workspaceId !== undefined && workspace.workspaceId !== workspaceId)
  ) throw authorityErrorV1("program_workspace_mismatch");
  return pair;
}

function pairsEqualV1(left: DurableProgramPairV1, right: DurableProgramPairV1): boolean {
  return programRepositoryAggregatesEqualV3(left.aggregate, right.aggregate) &&
    browserProgramContinuationManifestsEqualV1(left.continuation, right.continuation);
}

function successAggregateV1(
  result: ProgramRepositoryCommitResultV3,
): ProgramRepositoryAggregateV3 | null {
  return result.kind === "conflict" ? null : result.aggregate;
}

function acceptedDecisionReferencesReceiptV1(
  aggregate: ProgramRepositoryAggregateV3,
  receipt: ProgramWorkspaceSnapshotReceiptV1,
): boolean {
  return aggregate.decisions.some((decision) =>
    decision.status === "accepted" &&
    programWorkspaceSnapshotReceiptsEqualV1(decision.snapshot, receipt)
  );
}

function acceptedDecisionForInputV1(
  aggregate: ProgramRepositoryAggregateV3,
  input: BrowserProgramWorkspaceDecisionInputBaseV1,
): ProgramWorkspaceSnapshotReceiptV1 | null {
  const decision = aggregate.decisions.find((candidate) =>
    candidate.proposalId === input.expectedProposal.proposalId &&
    candidate.programRevision === input.expectedProposal.programRevision
  );
  return decision?.status === "accepted" ? decision.snapshot : null;
}

function acceptedDecisionReceiptsV1(
  aggregate: ProgramRepositoryAggregateV3,
): readonly ProgramWorkspaceSnapshotReceiptV1[] {
  return aggregate.decisions.flatMap((decision) =>
    decision.status === "accepted" ? [decision.snapshot] : []
  );
}

function receiptMatchesBindingV1(
  receipt: ProgramWorkspaceSnapshotReceiptV1,
  binding: ProgramRepositoryReviewBindingV3,
): boolean {
  return receipt.programId === binding.programId && receipt.workspaceId === binding.workspaceId &&
    receipt.volumeId === binding.volumeId &&
    receipt.workspaceFormat === binding.workspaceFormat &&
    receipt.proposalId === binding.proposalId &&
    receipt.programRevision === binding.programRevision &&
    receipt.baseRepositoryRevision === binding.repositoryRevision &&
    receipt.checkpointId === binding.checkpointId &&
    receipt.generation === binding.generation;
}

/**
 * Owns the only product composition between Repository currentness and Browser
 * Workspace Host publication. The Controller supplies product-domain successors;
 * continuation, review-head, snapshot, and recovery facts remain private here.
 */
export function createBrowserProgramWorkspaceAuthorityV1(
  options: BrowserProgramWorkspaceAuthorityOptionsV1 = {},
): BrowserProgramWorkspaceAuthorityV1 {
  const createRepository = options.createRepository ?? createBrowserProgramRepositoryV3;
  const createSnapshotId = options.createSnapshotId ?? defaultSnapshotIdV1;
  let repository = options.repository ?? createRepository();
  const host = options.host ?? createBrowserWorkspaceHostPagePortV1({
    worker: (options.createHostWorker ?? defaultHostWorkerV1)(),
  });
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

  const serializeV1 = <T>(operation: () => Promise<T>): Promise<T> => {
    if (lifecycle !== "active") return Promise.reject(authorityErrorV1("disposed"));
    const settled = operationTail.then(operation);
    operationTail = settled.then(() => undefined, () => undefined);
    return settled;
  };

  const initializeRepositoryV1 = (): Promise<void> => {
    initialized ??= repository.initialize();
    return initialized;
  };

  const replaceRepositoryAfterUnknownV1 = async (): Promise<void> => {
    const predecessor = repository;
    const successor = createRepository();
    await successor.initialize();
    repository = successor;
    initialized = Promise.resolve();
    await predecessor.dispose().catch(() => undefined);
  };

  const loadPairV1 = async (programId: string): Promise<DurableProgramPairV1 | null> => {
    await initializeRepositoryV1();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [aggregate, continuation] = await Promise.all([
        repository.load(programId),
        repository.loadWorkspaceContinuation(programId),
      ]);
      if (aggregate === null && continuation === null) return null;
      if (
        aggregate !== null && continuation !== null &&
        browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
      ) return { aggregate, continuation };
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
    const workspace = pair.aggregate.snapshot.workspace;
    const active = activeWorkspace;
    if (workspace === null) throw authorityErrorV1("program_workspace_mismatch");
    if (active === null) return null;
    if (
      active.programId !== pair.aggregate.programId ||
      active.workspaceId !== workspace.workspaceId
    ) throw authorityErrorV1("workspace_busy");
    return active.workspaceSessionId;
  };

  const validateHostSnapshotV1 = (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
    pair: DurableProgramPairV1,
    workspaceSessionId: string,
  ): BrowserWorkspaceHostSnapshotWireV1 => {
    const workspace = pair.aggregate.snapshot.workspace;
    if (
      workspace === null || snapshot.phase !== "open" ||
      snapshot.descriptor.programId !== pair.aggregate.programId ||
      snapshot.descriptor.workspaceId !== workspace.workspaceId ||
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
    const workspace = pair.aggregate.snapshot.workspace;
    if (workspace === null) throw authorityErrorV1("program_workspace_mismatch");
    return await host.withBootstrapLease({
      programId: pair.aggregate.programId,
      workspaceId: workspace.workspaceId,
      operation: async () => {
        const opened = await host.openWorkspace(anchorFromContinuationV1(pair.continuation));
        try {
          validateHostSnapshotV1(opened, pair, opened.descriptor.workspaceSessionId);
          activeWorkspace = {
            programId: pair.aggregate.programId,
            workspaceId: workspace.workspaceId,
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

  const settleRepositoryMutationV1 = async (input: {
    readonly programId: string;
    readonly current: DurableProgramPairV1;
    readonly expected: ProgramRepositoryCommitResultV3;
    readonly commit: (
      target: ProgramRepositoryWithWorkspaceContinuationV1,
    ) => Promise<ProgramRepositoryCommitResultV3>;
  }): Promise<ProgramRepositoryCommitResultV3> => {
    const expectedAggregate = successAggregateV1(input.expected);
    const expectedContinuation = expectedAggregate === null
      ? null
      : advanceBrowserProgramContinuationV1(input.current.continuation, expectedAggregate);
    try {
      const settled = await input.commit(repository);
      if (settled.kind === "conflict") return settled;
      if (
        expectedAggregate === null ||
        !programRepositoryAggregatesEqualV3(settled.aggregate, expectedAggregate)
      ) throw authorityErrorV1("repository_response_mismatch");
      return settled;
    } catch (error) {
      if (failureCodeV1(error) !== "outcome_unknown") throw error;
      await replaceRepositoryAfterUnknownV1();
      const reconciled = await loadPairV1(input.programId);
      if (
        reconciled !== null && expectedAggregate !== null && expectedContinuation !== null &&
        programRepositoryAggregatesEqualV3(reconciled.aggregate, expectedAggregate) &&
        browserProgramContinuationManifestsEqualV1(
          reconciled.continuation,
          expectedContinuation,
        )
      ) {
        return { kind: "unchanged", aggregate: reconciled.aggregate };
      }
      throw error;
    }
  };

  const ensureAcceptedSnapshotAvailableV1 = async (
    workspaceSessionId: string,
    receipt: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<void> => {
    try {
      const retained = await host.queryRetainedSnapshot({
        workspaceSessionId,
        expected: receipt,
      });
      if (
        retained !== null && programWorkspaceSnapshotReceiptsEqualV1(retained, receipt)
      ) return;
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
      if (
        reconciled !== null && programWorkspaceSnapshotReceiptsEqualV1(reconciled, receipt)
      ) return;
    } catch {
      // Durable acceptance converts every unavailable/mismatched Host state into recovery.
    }
    throw authorityErrorV1("recovery_required");
  };

  const reconcileAcceptedSnapshotsV1 = async (pair: DurableProgramPairV1): Promise<void> => {
    const receipts = acceptedDecisionReceiptsV1(pair.aggregate);
    if (receipts.length === 0) return;
    const workspaceSessionId = await ensureHostSessionForPairV1(pair);
    for (const receipt of receipts) {
      await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
    }
  };

  const discardUnreferencedSnapshotV1 = async (
    workspaceSessionId: string,
    receipt: ProgramWorkspaceSnapshotReceiptV1,
    current: ProgramRepositoryAggregateV3 | null,
  ): Promise<void> => {
    if (current !== null && acceptedDecisionReferencesReceiptV1(current, receipt)) {
      await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
      return;
    }
    const result = await host.discardSnapshot({ workspaceSessionId, expected: receipt });
    if (result === "retained") throw authorityErrorV1("recovery_required");
  };

  const prepareAcceptedSnapshotV1 = async (
    pair: DurableProgramPairV1,
    input: BrowserProgramWorkspaceDecisionInputBaseV1,
  ): Promise<
    { readonly workspaceSessionId: string; readonly receipt: ProgramWorkspaceSnapshotReceiptV1 }
  > => {
    const binding = pair.aggregate.reviewBinding;
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
      receipt = await host.resumeSnapshotPublication({
        workspaceSessionId,
        expected: candidate,
      });
      if (!programWorkspaceSnapshotReceiptsEqualV1(receipt, candidate)) {
        throw authorityErrorV1("snapshot_mismatch");
      }
    }
    if (!receiptMatchesBindingV1(receipt, binding)) {
      throw authorityErrorV1("snapshot_mismatch");
    }
    return { workspaceSessionId, receipt };
  };

  const decideAcceptedV1 = async (
    input: Extract<BrowserProgramWorkspaceDecideInputV1, { readonly status: "accepted" }>,
  ): Promise<ProgramRepositoryCommitResultV3> => {
    const initial = await requirePairV1(input.programId);
    const existingReceipt = acceptedDecisionForInputV1(initial.aggregate, input);
    let workspaceSessionId: string;
    let receipt: ProgramWorkspaceSnapshotReceiptV1;
    if (existingReceipt !== null) {
      workspaceSessionId = await ensureHostSessionForPairV1(initial);
      receipt = existingReceipt;
    } else {
      const prepared = await prepareAcceptedSnapshotV1(initial, input);
      workspaceSessionId = prepared.workspaceSessionId;
      receipt = prepared.receipt;
      const rechecked = await requirePairV1(input.programId);
      if (!pairsEqualV1(initial, rechecked)) {
        if (acceptedDecisionReferencesReceiptV1(rechecked.aggregate, receipt)) {
          await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
        } else {
          await discardUnreferencedSnapshotV1(workspaceSessionId, receipt, rechecked.aggregate);
        }
        return { kind: "conflict", current: rechecked.aggregate };
      }
    }

    const continuation = predecessorContinuationV1(
      initial.continuation,
      input.expectedProposal.programRevision,
      input.expectedRepositoryRevision,
    );
    const repositoryInput: ProgramRepositoryDecideInputV3 = {
      ...input,
      continuation,
      snapshotReceipt: receipt,
    };
    const expected = applyProgramRepositoryDecisionV3(initial.aggregate, repositoryInput);
    const expectedAggregate = successAggregateV1(expected);
    const expectedContinuation = expectedAggregate === null
      ? null
      : advanceBrowserProgramContinuationV1(initial.continuation, expectedAggregate);
    try {
      const settled = await repository.decide(repositoryInput);
      if (settled.kind === "conflict") {
        if (
          settled.current !== null && acceptedDecisionReferencesReceiptV1(settled.current, receipt)
        ) {
          await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
        } else {
          await discardUnreferencedSnapshotV1(workspaceSessionId, receipt, settled.current);
        }
        return settled;
      }
      if (
        expectedAggregate === null ||
        !programRepositoryAggregatesEqualV3(settled.aggregate, expectedAggregate) ||
        !acceptedDecisionReferencesReceiptV1(settled.aggregate, receipt)
      ) throw authorityErrorV1("repository_response_mismatch");
      await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
      return settled;
    } catch (error) {
      if (failureCodeV1(error) !== "outcome_unknown") throw error;
      await replaceRepositoryAfterUnknownV1();
      const reconciled = await loadPairV1(input.programId);
      if (
        reconciled !== null && acceptedDecisionReferencesReceiptV1(reconciled.aggregate, receipt)
      ) {
        await ensureAcceptedSnapshotAvailableV1(workspaceSessionId, receipt);
        if (
          expectedAggregate !== null && expectedContinuation !== null &&
          programRepositoryAggregatesEqualV3(reconciled.aggregate, expectedAggregate) &&
          browserProgramContinuationManifestsEqualV1(
            reconciled.continuation,
            expectedContinuation,
          )
        ) return { kind: "unchanged", aggregate: reconciled.aggregate };
        return { kind: "conflict", current: reconciled.aggregate };
      }
      throw error;
    }
  };

  const loadExportContinuationV1 = async (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
  ): Promise<BrowserProgramContinuationManifestV1> => {
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

  return {
    initialize() {
      return serializeV1(async () => await initializeRepositoryV1());
    },

    list() {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        return await repository.list();
      });
    },

    load(programId) {
      return serializeV1(async () => {
        const pair = await loadPairV1(programId);
        if (pair === null) return null;
        matchingActiveSessionForPairV1(pair);
        await reconcileAcceptedSnapshotsV1(pair);
        return pair.aggregate;
      });
    },

    create(input) {
      return serializeV1(async () => {
        await initializeRepositoryV1();
        const program = input.snapshot.program;
        const workspace = input.snapshot.workspace;
        if (program === null || workspace === null) throw authorityErrorV1("program_unavailable");
        if (activeWorkspace !== null && activeWorkspace.programId !== program.programId) {
          throw authorityErrorV1("workspace_busy");
        }
        return await host.withBootstrapLease({
          programId: program.programId,
          workspaceId: workspace.workspaceId,
          operation: async () => {
            const existing = await loadPairV1(program.programId);
            if (existing !== null) {
              const binding = existing.aggregate.reviewBinding;
              if (
                existing.aggregate.repositoryRevision !== 1 || binding === null ||
                binding.programRevision !== 1
              ) return { kind: "conflict", current: existing.aggregate };
              return await repository.create({
                ...input,
                continuation: existing.continuation,
                reviewedHead: {
                  checkpointId: binding.checkpointId,
                  generation: binding.generation,
                },
              });
            }

            const candidate = await host.createCandidate({
              programId: program.programId,
              workspaceId: workspace.workspaceId,
            });
            const continuation = continuationFromCandidateV1(input, candidate);
            const repositoryInput: ProgramRepositoryCreateInputV3 = {
              ...input,
              continuation,
              reviewedHead: {
                checkpointId: candidate.checkpointId,
                generation: candidate.generation,
              },
            };
            const expectedAggregate = buildProgramRepositoryCreateV3(repositoryInput);
            const ownsCandidateV1 = (pair: DurableProgramPairV1 | null): boolean =>
              pair !== null &&
              programRepositoryAggregatesEqualV3(pair.aggregate, expectedAggregate) &&
              browserProgramContinuationManifestsEqualV1(
                pair.continuation,
                continuation,
              );
            const discardKnownUnownedCandidateV1 = async (): Promise<void> => {
              await host.discardCandidate(candidate.anchor.volumeId);
            };
            try {
              const settled = await repository.create(repositoryInput);
              if (settled.kind === "conflict") {
                await discardKnownUnownedCandidateV1();
                return settled;
              }
              if (!programRepositoryAggregatesEqualV3(settled.aggregate, expectedAggregate)) {
                const mismatch = authorityErrorV1("repository_response_mismatch");
                let durable: DurableProgramPairV1 | null;
                try {
                  durable = await loadPairV1(program.programId);
                } catch {
                  throw mismatch;
                }
                if (!ownsCandidateV1(durable)) {
                  await discardKnownUnownedCandidateV1();
                }
                throw mismatch;
              }
              return settled;
            } catch (error) {
              if (failureCodeV1(error) === "outcome_unknown") {
                try {
                  await replaceRepositoryAfterUnknownV1();
                  const reconciled = await loadPairV1(program.programId);
                  if (reconciled !== null && ownsCandidateV1(reconciled)) {
                    return { kind: "unchanged", aggregate: reconciled.aggregate };
                  }
                  await discardKnownUnownedCandidateV1();
                } catch {
                  // Unknown durable truth preserves the candidate for exact reconciliation.
                }
                throw error;
              }
              if (
                error instanceof TypeError &&
                error.message === "sillyos.browser_program_workspace.repository_response_mismatch"
              ) throw error;
              await discardKnownUnownedCandidateV1();
              throw error;
            }
          },
        });
      });
    },

    applyRevision(input) {
      return serializeV1(async () => {
        const current = await requirePairV1(input.programId);
        const continuation = predecessorContinuationV1(
          current.continuation,
          input.expectedBase.baseProgramRevision,
          input.expectedRepositoryRevision,
        );
        let reviewedHead: { readonly checkpointId: string; readonly generation: number };
        if (current.aggregate.repositoryRevision === input.expectedRepositoryRevision) {
          reviewedHead = await captureReviewedHeadV1(current);
        } else if (current.aggregate.reviewBinding !== null) {
          reviewedHead = {
            checkpointId: current.aggregate.reviewBinding.checkpointId,
            generation: current.aggregate.reviewBinding.generation,
          };
        } else {
          return { kind: "conflict", current: current.aggregate };
        }
        const repositoryInput: ProgramRepositoryApplyRevisionInputV3 = {
          ...input,
          continuation,
          reviewedHead,
        };
        return await settleRepositoryMutationV1({
          programId: input.programId,
          current,
          expected: applyProgramRepositoryRevisionV3(current.aggregate, repositoryInput),
          commit: (target) => target.applyRevision(repositoryInput),
        });
      });
    },

    settleAgentRun(input) {
      return serializeV1(async () => {
        const current = await requirePairV1(input.programId);
        const continuation = predecessorContinuationV1(
          current.continuation,
          input.terminal.run.baseProgramRevision,
          input.expectedRepositoryRevision,
        );
        let reviewedHead: { readonly checkpointId: string; readonly generation: number } | null =
          null;
        if (input.terminal.outcome === "completed") {
          if (current.aggregate.repositoryRevision === input.expectedRepositoryRevision) {
            reviewedHead = await captureReviewedHeadV1(current);
          } else if (current.aggregate.reviewBinding !== null) {
            reviewedHead = {
              checkpointId: current.aggregate.reviewBinding.checkpointId,
              generation: current.aggregate.reviewBinding.generation,
            };
          } else {
            return { kind: "conflict", current: current.aggregate };
          }
        }
        const repositoryInput: ProgramRepositorySettleAgentRunInputV3 = {
          ...input,
          continuation,
          reviewedHead,
        };
        return await settleRepositoryMutationV1({
          programId: input.programId,
          current,
          expected: applyProgramRepositoryAgentRunTerminalV3(current.aggregate, repositoryInput),
          commit: (target) => target.settleAgentRun(repositoryInput),
        });
      });
    },

    decide(input) {
      return serializeV1(async () => {
        if (input.status === "accepted") return await decideAcceptedV1(input);
        const current = await requirePairV1(input.programId);
        const repositoryInput: ProgramRepositoryDecideInputV3 = {
          ...input,
          continuation: predecessorContinuationV1(
            current.continuation,
            input.expectedProposal.programRevision,
            input.expectedRepositoryRevision,
          ),
        };
        const settled = await settleRepositoryMutationV1({
          programId: input.programId,
          current,
          expected: applyProgramRepositoryDecisionV3(current.aggregate, repositoryInput),
          commit: (target) => target.decide(repositoryInput),
        });
        if (settled.kind === "conflict") return settled;
        const durable = await requirePairV1(input.programId);
        const workspaceSessionId = await ensureHostSessionForPairV1(durable);
        const candidate = await host.querySnapshotCandidate(workspaceSessionId);
        if (candidate !== null) {
          await discardUnreferencedSnapshotV1(
            workspaceSessionId,
            candidate,
            durable.aggregate,
          );
        }
        return settled;
      });
    },

    withAgentSubmitAdmission(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.programId);
        const program = pair.aggregate.snapshot.program;
        const active = activeWorkspace;
        if (
          program === null || program.revision !== input.expectedProgramRevision ||
          pair.aggregate.repositoryRevision !== input.expectedRepositoryRevision
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
        if (snapshot.descriptor.generation !== input.expectedGeneration) {
          throw authorityErrorV1("agent_submit_stale");
        }
        return await input.operation();
      });
    },

    openWorkspace(input) {
      return serializeV1(async () => {
        const pair = await requirePairV1(input.programId, input.workspaceId);
        await reconcileAcceptedSnapshotsV1(pair);
        const workspaceSessionId = await ensureHostSessionForPairV1(pair);
        if (activeWorkspace?.environmentAttached === true) {
          throw authorityErrorV1("workspace_busy");
        }
        const attached = await host.attachEnvironment({ workspaceSessionId });
        validateHostSnapshotV1(attached.snapshot, pair, workspaceSessionId);
        activeWorkspace = {
          programId: input.programId,
          workspaceId: input.workspaceId,
          workspaceSessionId,
          environmentAttached: true,
        };
        return {
          snapshot: attached.snapshot,
          environmentPort: attached.environmentPort,
        };
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
          signal: input.signal,
          ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
          onReady: async (ready, commitRelease) => {
            if (input.signal.aborted) return "cancel";
            const currentSnapshot = await host.queryWorkspace(input.workspaceSessionId);
            if (
              currentSnapshot.phase !== "open" ||
              currentSnapshot.checkpointId !== initialSnapshot.checkpointId ||
              currentSnapshot.descriptor.generation !== initialSnapshot.descriptor.generation ||
              currentSnapshot.volumeId !== initialSnapshot.volumeId
            ) throw authorityErrorV1("export_anchor_changed");
            const currentContinuation = await loadExportContinuationV1(currentSnapshot);
            if (input.signal.aborted) return "cancel";
            if (
              !browserProgramContinuationManifestsEqualV1(
                currentContinuation,
                initialContinuation,
              )
            ) throw authorityErrorV1("export_anchor_changed");
            return await input.onReady(ready, commitRelease);
          },
        });
      });
    },

    detachWorkspaceEnvironment(workspaceSessionId) {
      return serializeV1(async () => {
        if (activeWorkspace?.workspaceSessionId !== workspaceSessionId) {
          throw authorityErrorV1("workspace_mismatch");
        }
        if (!activeWorkspace.environmentAttached) return;
        activeWorkspace = { ...activeWorkspace, environmentAttached: false };
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
        if (sessionId !== null) {
          await host.closeWorkspace(sessionId).catch(() => undefined);
        }
        host.dispose();
        await repository.dispose().catch(() => undefined);
        lifecycle = "disposed";
      })();
      return await disposePromise;
    },
  };
}
