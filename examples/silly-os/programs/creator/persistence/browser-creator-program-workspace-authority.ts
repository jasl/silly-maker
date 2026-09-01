// SPDX-License-Identifier: MIT

import type { BrowserWorkspaceHostPagePortV1 } from "../../../src/workspace/browser-workspace-host-port.ts";
import {
  workspaceImmutableSnapshotReceiptsEqualV1,
  type WorkspaceImmutableSnapshotReceiptV1,
} from "../../../src/workspace/contracts.ts";
import {
  createBrowserProgramWorkspaceAuthorityV1,
  type BrowserProcessWorkspaceCreateInputV1,
  type BrowserProcessWorkspaceInspectionV1,
  type BrowserProcessWorkspacePairV1,
  type BrowserProgramWorkspaceAuthorityHostV1,
  type BrowserProgramWorkspaceAuthorityOptionsV1,
  type BrowserProgramWorkspaceAuthorityV1,
  BrowserProgramWorkspaceAuthorityErrorV1,
} from "../../../src/application/workspace/browser-program-workspace-authority.ts";
import type { ProgramDataRepositoryV1 } from "../../../src/application/persistence/program-data-repository.ts";
import type { ProcessExecutionLeaseV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import type { ProcessHeadV1 } from "../../../src/program-platform/process/program-process-repository.ts";
import {
  programCatalogOperationalPayloadMaximumBytesV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogCreateInputV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogReviewBindingV1,
} from "../runtime/program-catalog-repository.ts";
import {
  bindCreatorWorkspaceSnapshotReceiptV1,
  creatorWorkspaceSnapshotReceiptCoreV1,
  type CreatorWorkspaceReviewProjectionV1,
  type CreatorWorkspaceSnapshotReceiptV1,
} from "../runtime/creator-workspace-review.ts";
import type {
  CreatorProgramDataRepositoryV1,
  CreatorProgramProcessCompositeCommitResultV1,
  CreatorProgramProcessCreateBundleInputV1,
  CreatorProgramProcessCreateCompositeCommitResultV1,
  CreatorProgramProcessDecisionBundleInputV1,
  CreatorProgramProcessExecutionCompositeCommitResultV1,
  CreatorProgramProcessRevisionBundleInputV1,
} from "./creator-persistence-contract.ts";
import { createCreatorProgramDataRepositoryV1 } from "./creator-program-data-repository.ts";

interface DurableCreatorWorkspaceV1 extends BrowserProcessWorkspacePairV1 {
  readonly record: ProgramCatalogRecordV1;
}

export interface BrowserProgramWorkspaceCreateInputV1 {
  readonly workspaceId: string;
  readonly catalog: Omit<ProgramCatalogCreateInputV1, "reviewedWorkspace">;
  readonly process: CreatorProgramProcessCreateBundleInputV1["process"];
  readonly transcript: BrowserProcessWorkspaceCreateInputV1["transcript"];
}

type ProgramProcessRevisionTranscriptV1 = CreatorProgramProcessRevisionBundleInputV1["transcript"];

type BrowserProgramWorkspaceDeterministicRevisionTranscriptV1 =
  & Omit<ProgramProcessRevisionTranscriptV1, "attemptBinding" | "terminalAttemptReceipt">
  & { readonly attemptBinding: null; readonly terminalAttemptReceipt: null };

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
  readonly catalog: Omit<ProgramCatalogApplyRevisionInputV1, "reviewedWorkspace">;
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
  "snapshotReceipt"
>;
type BrowserProgramWorkspaceRejectedDecisionCatalogInputV1 = Extract<
  ProgramCatalogDecideInputV1,
  { readonly status: "rejected" }
>;

export type BrowserProgramWorkspaceDecideInputV1 =
  | {
    readonly catalog: BrowserProgramWorkspaceAcceptedDecisionCatalogInputV1;
    readonly transcript: CreatorProgramProcessDecisionBundleInputV1["transcript"];
  }
  | {
    readonly catalog: BrowserProgramWorkspaceRejectedDecisionCatalogInputV1;
    readonly transcript: CreatorProgramProcessDecisionBundleInputV1["transcript"];
  };

export interface CreatorBrowserProcessWorkspaceInspectionV1
  extends BrowserProcessWorkspaceInspectionV1 {
  readonly review: CreatorWorkspaceReviewProjectionV1 | null;
}

export interface CreatorBrowserProgramWorkspaceAuthorityV1
  extends BrowserProgramWorkspaceAuthorityV1 {
  create(
    input: BrowserProgramWorkspaceCreateInputV1,
  ): Promise<CreatorProgramProcessCreateCompositeCommitResultV1>;
  applyRevision(
    input: BrowserProgramWorkspaceApplyRevisionInputV1,
  ): Promise<CreatorProgramProcessCompositeCommitResultV1>;
  applyAgentRevision(
    input: BrowserProgramWorkspaceApplyAgentRevisionInputV1,
  ): Promise<CreatorProgramProcessExecutionCompositeCommitResultV1>;
  decide(
    input: BrowserProgramWorkspaceDecideInputV1,
  ): Promise<CreatorProgramProcessCompositeCommitResultV1>;
  inspectProcessWorkspace(
    processId: string,
    options?: { readonly hostAccess?: "required" | "active_only" },
  ): Promise<CreatorBrowserProcessWorkspaceInspectionV1 | null>;
}

export interface BrowserCreatorProgramWorkspaceAuthorityOptionsV1
  extends BrowserProgramWorkspaceAuthorityOptionsV1 {
  readonly authorityHost?: BrowserProgramWorkspaceAuthorityHostV1;
  readonly repository?: ProgramDataRepositoryV1 | CreatorProgramDataRepositoryV1;
  readonly host?: BrowserWorkspaceHostPagePortV1;
  readonly createSnapshotId?: () => string;
}

function authorityErrorV1(code: string): BrowserProgramWorkspaceAuthorityErrorV1 {
  return new BrowserProgramWorkspaceAuthorityErrorV1(code);
}

function failureCodeV1(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : null;
}

function defaultSnapshotIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw authorityErrorV1("snapshot_identity_unavailable");
  }
  return `snapshot.local.${crypto.randomUUID()}`;
}

function processWorkspaceProgramIdV1(
  process: Pick<ProcessHeadV1, "programPackage" | "subjectProgramId">,
): string {
  return process.subjectProgramId ?? process.programPackage.programId;
}

function workspaceFromCandidateV1(
  input: BrowserProgramWorkspaceCreateInputV1,
  candidate: Parameters<
    Parameters<
      BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]
    >[0]
  >[0] extends infer _Unused ? {
      readonly anchor: {
        readonly programId: string;
        readonly workspaceId: string;
        readonly volumeId: string;
        readonly workspaceFormat: 1;
      };
      readonly checkpointId: string;
      readonly generation: number;
    }
    : never,
): CreatorProgramProcessCreateBundleInputV1["workspace"] {
  const programId = processWorkspaceProgramIdV1(input.process);
  if (
    candidate.anchor.programId !== programId || candidate.anchor.workspaceId !== input.workspaceId
  ) {
    throw authorityErrorV1("candidate_identity_mismatch");
  }
  return {
    revision: 1,
    processId: input.process.processId,
    workspaceId: input.workspaceId,
    volumeId: candidate.anchor.volumeId,
    workspaceFormat: candidate.anchor.workspaceFormat,
  };
}

function createBundleV1(
  input: BrowserProgramWorkspaceCreateInputV1,
  workspace: CreatorProgramProcessCreateBundleInputV1["workspace"],
  head: { readonly checkpointId: string; readonly generation: number },
): CreatorProgramProcessCreateBundleInputV1 {
  return {
    catalog: {
      ...input.catalog,
      reviewedWorkspace: {
        processId: input.process.processId,
        workspaceId: workspace.workspaceId,
        volumeId: workspace.volumeId,
        workspaceFormat: workspace.workspaceFormat,
        checkpointId: head.checkpointId,
        generation: head.generation,
      },
    },
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

function transcriptAtReviewedWorkspaceV1(
  transcript: BrowserProgramWorkspaceApplyRevisionInputV1["transcript"],
  reviewed: ProgramCatalogCreateInputV1["reviewedWorkspace"],
): CreatorProgramProcessRevisionBundleInputV1["transcript"] {
  if (transcript.checkpoint === null) return transcript;
  return {
    ...transcript,
    checkpoint: {
      ...transcript.checkpoint,
      workspaceId: reviewed.workspaceId,
      workspaceCheckpointId: reviewed.checkpointId,
      workspaceGeneration: reviewed.generation,
    },
  };
}

function receiptMatchesBindingV1(
  receipt: WorkspaceImmutableSnapshotReceiptV1,
  binding: ProgramCatalogReviewBindingV1,
): boolean {
  return receipt.programId === binding.programId && receipt.workspaceId === binding.workspaceId &&
    receipt.volumeId === binding.volumeId && receipt.workspaceFormat === binding.workspaceFormat &&
    receipt.publicationId === binding.proposalId &&
    receipt.sourceRevision === binding.programRevision &&
    receipt.baseRevision === binding.repositoryRevision &&
    receipt.checkpointId === binding.checkpointId && receipt.generation === binding.generation;
}

function receiptBelongsToPairV1(
  receipt: WorkspaceImmutableSnapshotReceiptV1,
  pair: BrowserProcessWorkspacePairV1,
): boolean {
  return pair.process.subjectProgramId === receipt.programId &&
    pair.workspace.workspaceId === receipt.workspaceId &&
    pair.workspace.volumeId === receipt.volumeId &&
    pair.workspace.workspaceFormat === receipt.workspaceFormat;
}

function pendingBelongsToPairV1(
  binding: ProgramCatalogReviewBindingV1,
  pair: BrowserProcessWorkspacePairV1,
): boolean {
  return pair.process.subjectProgramId === binding.programId &&
    pair.process.processId === binding.processId &&
    pair.workspace.workspaceId === binding.workspaceId &&
    pair.workspace.volumeId === binding.volumeId &&
    pair.workspace.workspaceFormat === binding.workspaceFormat;
}

function creatorUnitV1(
  record: ProgramCatalogRecordV1,
  pair: BrowserProcessWorkspacePairV1,
  programId: string,
): DurableCreatorWorkspaceV1 {
  if (
    record.head.programId !== programId || record.currentProgram.programId !== programId ||
    pair.process.subjectProgramId !== programId
  ) throw authorityErrorV1("program_workspace_mismatch");
  const pending = record.head.pendingReviewBinding;
  if (pending !== null && !pendingBelongsToPairV1(pending, pair)) {
    throw authorityErrorV1("program_workspace_mismatch");
  }
  return { ...pair, record };
}

function ownsReviewV1(
  record: ProgramCatalogRecordV1,
  accepted: CreatorWorkspaceSnapshotReceiptV1 | null,
  pair: BrowserProcessWorkspacePairV1,
): boolean {
  const pending = record.head.pendingReviewBinding;
  return pending === null
    ? accepted !== null && receiptBelongsToPairV1(accepted, pair)
    : pendingBelongsToPairV1(pending, pair);
}

function reviewProjectionV1(
  record: ProgramCatalogRecordV1,
  accepted: CreatorWorkspaceSnapshotReceiptV1 | null,
  mutableHead: CreatorWorkspaceReviewProjectionV1["mutableHead"],
): CreatorWorkspaceReviewProjectionV1 {
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

/** Creator-only Catalog/review adapter layered over the single shared Workspace authority. */
export function createBrowserCreatorProgramWorkspaceAuthorityV1(
  options: BrowserCreatorProgramWorkspaceAuthorityOptionsV1 = {},
): CreatorBrowserProgramWorkspaceAuthorityV1 {
  const repositoryBase = options.repository as ProgramDataRepositoryV1 | undefined;
  const ownsHostAuthority = options.authorityHost === undefined;
  const hostAuthority = options.authorityHost ?? createBrowserProgramWorkspaceAuthorityV1({
    ...(repositoryBase === undefined ? {} : { repository: repositoryBase }),
    ...(options.host === undefined ? {} : { host: options.host }),
    ...(options.operationFence === undefined ? {} : { operationFence: options.operationFence }),
  });
  let resolvedCoreRepository: ProgramDataRepositoryV1 | null = repositoryBase ?? null;
  const creatorRepository =
    options.repository !== undefined && "createProgramWithProcess" in options.repository
      ? options.repository as CreatorProgramDataRepositoryV1
      : null;
  const createSnapshotId = options.createSnapshotId ?? defaultSnapshotIdV1;

  const runV1 = <T>(
    operation: (input: {
      readonly capability: Parameters<
        Parameters<BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]>[0]
      >[0];
      readonly repository: CreatorProgramDataRepositoryV1;
    }) => Promise<T>,
  ): Promise<T> =>
    hostAuthority.runWithInternalCapability(async (capability) => {
      resolvedCoreRepository ??= capability.repository;
      const repository = creatorRepository ?? createCreatorProgramDataRepositoryV1(
        resolvedCoreRepository,
      );
      return await operation({ capability, repository });
    });

  const loadCreatorV1 = async (
    capability: Parameters<
      Parameters<BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]>[0]
    >[0],
    repository: CreatorProgramDataRepositoryV1,
    programId: string,
    processId: string,
  ): Promise<DurableCreatorWorkspaceV1 | null> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [record, pair] = await Promise.all([
        repository.load(programId),
        capability.loadPair(processId),
      ]);
      if (record === null && pair === null) return null;
      if (record !== null && pair !== null) {
        try {
          return creatorUnitV1(record, pair, programId);
        } catch {
          // Concurrent Catalog/Process successors can split independent reads.
        }
      }
    }
    throw authorityErrorV1("repository_pair_changed");
  };

  const requireCreatorV1 = async (
    capability: Parameters<
      Parameters<BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]>[0]
    >[0],
    repository: CreatorProgramDataRepositoryV1,
    programId: string,
    processId: string,
  ): Promise<DurableCreatorWorkspaceV1> => {
    const unit = await loadCreatorV1(capability, repository, programId, processId);
    if (unit === null) throw authorityErrorV1("program_workspace_unavailable");
    return unit;
  };

  const acceptedReceiptsV1 = async (
    repository: CreatorProgramDataRepositoryV1,
    programId: string,
  ): Promise<readonly CreatorWorkspaceSnapshotReceiptV1[]> => {
    const receipts: CreatorWorkspaceSnapshotReceiptV1[] = [];
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

  const ensureAcceptedV1 = async (
    capability: Parameters<
      Parameters<BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]>[0]
    >[0],
    workspaceSessionId: string,
    receipt: CreatorWorkspaceSnapshotReceiptV1,
  ): Promise<void> => {
    const coreReceipt = creatorWorkspaceSnapshotReceiptCoreV1(receipt);
    const retained = await capability.queryRetainedSnapshot({
      workspaceSessionId,
      expected: coreReceipt,
    });
    if (retained !== null && workspaceImmutableSnapshotReceiptsEqualV1(retained, receipt)) return;
    const candidate = await capability.querySnapshotCandidate(workspaceSessionId);
    if (candidate !== null && workspaceImmutableSnapshotReceiptsEqualV1(candidate, receipt)) {
      try {
        await capability.adoptSnapshot({ workspaceSessionId, expected: coreReceipt });
        return;
      } catch (error) {
        if (failureCodeV1(error) !== "outcome_unknown") throw error;
      }
    }
    const reconciled = await capability.queryRetainedSnapshot({
      workspaceSessionId,
      expected: coreReceipt,
    });
    if (reconciled !== null && workspaceImmutableSnapshotReceiptsEqualV1(reconciled, receipt)) {
      return;
    }
    throw authorityErrorV1("recovery_required");
  };

  const reconcileAcceptedV1 = async (
    capability: Parameters<
      Parameters<BrowserProgramWorkspaceAuthorityHostV1["runWithInternalCapability"]>[0]
    >[0],
    repository: CreatorProgramDataRepositoryV1,
    unit: DurableCreatorWorkspaceV1,
  ): Promise<void> => {
    const receipts = (await acceptedReceiptsV1(repository, unit.record.head.programId)).filter(
      (receipt) => receiptBelongsToPairV1(receipt, unit),
    );
    if (receipts.length === 0) return;
    const sessionId = await capability.ensureHostSession(unit);
    for (const receipt of receipts) await ensureAcceptedV1(capability, sessionId, receipt);
  };

  const conflictV1 = async (
    repository: CreatorProgramDataRepositoryV1,
    currentProgram: ProgramCatalogRecordV1 | null,
    processId: string,
  ): Promise<
    Extract<CreatorProgramProcessCompositeCommitResultV1, { readonly kind: "conflict" }>
  > => ({
    kind: "conflict",
    currentProgram,
    currentProcess: await repository.loadProcess(processId),
  });

  const executionConflictV1 = async (
    repository: CreatorProgramDataRepositoryV1,
    currentProgram: ProgramCatalogRecordV1 | null,
    processId: string,
  ): Promise<
    Extract<CreatorProgramProcessExecutionCompositeCommitResultV1, { readonly kind: "conflict" }>
  > => ({
    kind: "conflict",
    currentProgram,
    currentProcess: await repository.loadProcess(processId),
    currentLease: await repository.loadProcessExecutionLease(processId),
  });

  return {
    initialize: () => hostAuthority.initialize(),
    createProcessWorkspace: (input) => hostAuthority.createProcessWorkspace(input),
    probeProcessWorkspace: (processId) => hostAuthority.probeProcessWorkspace(processId),
    importProcessWorkspaceFile: (input) => hostAuthority.importProcessWorkspaceFile(input),
    queryWorkspace: (sessionId) => hostAuthority.queryWorkspace(sessionId),
    exportWorkspace: (input) => hostAuthority.exportWorkspace(input),
    detachWorkspaceEnvironment: (sessionId) => hostAuthority.detachWorkspaceEnvironment(sessionId),
    closeWorkspace: (sessionId) => hostAuthority.closeWorkspace(sessionId),
    closeActiveWorkspace: () => hostAuthority.closeActiveWorkspace(),
    inspectStorage: () => hostAuthority.inspectStorage(),
    loadProcessNetworkAccess: (processId) => hostAuthority.loadProcessNetworkAccess(processId),
    setProcessNetworkAccess: (input) => hostAuthority.setProcessNetworkAccess(input),
    withAgentSubmitAdmission: (input) => hostAuthority.withAgentSubmitAdmission(input),
    resetStoredData: () => hostAuthority.resetStoredData(),
    subscribeFatal: (listener) => hostAuthority.subscribeFatal(listener),
    dispose: () => ownsHostAuthority ? hostAuthority.dispose() : Promise.resolve(),

    create(input) {
      return runV1(async ({ capability, repository }) => {
        if (input.process.subjectProgramId !== input.catalog.program.programId) {
          throw authorityErrorV1("process_subject_mismatch");
        }
        const existing = await loadCreatorV1(
          capability,
          repository,
          input.catalog.program.programId,
          input.process.processId,
        );
        if (existing !== null) {
          const binding = existing.record.head.pendingReviewBinding;
          if (
            existing.record.head.repositoryRevision !== 1 || binding === null ||
            binding.programRevision !== 1 || binding.processId !== input.process.processId ||
            binding.workspaceId !== input.workspaceId
          ) return await conflictV1(repository, existing.record, input.process.processId);
          return await repository.createProgramWithProcess(
            createBundleV1(input, existing.workspace, binding),
          );
        }
        return await capability.withBootstrapCandidate({
          process: input.process,
          workspaceId: input.workspaceId,
          operation: async (candidate) => {
            let workspace: CreatorProgramProcessCreateBundleInputV1["workspace"];
            try {
              workspace = workspaceFromCandidateV1(input, candidate);
            } catch (error) {
              await capability.discardCandidate(candidate.anchor.volumeId);
              throw error;
            }
            const bundle = createBundleV1(input, workspace, candidate);
            try {
              const settled = await repository.createProgramWithProcess(bundle);
              if (settled.kind === "conflict" || settled.kind === "workspace_volume_owned") {
                await capability.discardCandidate(candidate.anchor.volumeId);
              }
              return settled;
            } catch (error) {
              if (failureCodeV1(error) !== "outcome_unknown") {
                await capability.discardCandidate(candidate.anchor.volumeId);
              }
              throw error;
            }
          },
        });
      });
    },

    inspectProcessWorkspace(processId, inspectionOptions) {
      return runV1(async ({ capability, repository }) => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const pair = await capability.loadPair(processId);
          if (pair === null) return null;
          const programId = pair.process.subjectProgramId;
          const mutableHead = await capability.inspectMutableHead(
            pair,
            inspectionOptions?.hostAccess ?? "active_only",
          );
          if (programId === null) return { ...pair, mutableHead, review: null };
          const record = await repository.load(programId);
          if (record === null) return { ...pair, mutableHead, review: null };
          const acceptedDecision = await repository.loadLatestAcceptedDecision(programId);
          const accepted = acceptedDecision?.snapshot ?? null;
          if (!ownsReviewV1(record, accepted, pair)) {
            return { ...pair, mutableHead, review: null };
          }
          const unit = creatorUnitV1(record, pair, programId);
          if (inspectionOptions?.hostAccess === "required") {
            await reconcileAcceptedV1(capability, repository, unit);
          }
          const currentPair = await capability.loadPair(processId);
          const currentRecord = await repository.load(programId);
          if (
            currentPair !== null && currentPair.process.revision === pair.process.revision &&
            currentPair.process.transcriptFrontier === pair.process.transcriptFrontier &&
            currentPair.workspace.volumeId === pair.workspace.volumeId && currentRecord !== null &&
            currentRecord.head.repositoryRevision === record.head.repositoryRevision
          ) {
            return {
              ...currentPair,
              mutableHead,
              review: ownsReviewV1(currentRecord, accepted, currentPair)
                ? reviewProjectionV1(currentRecord, accepted, mutableHead)
                : null,
            };
          }
        }
        throw authorityErrorV1("repository_pair_changed");
      });
    },

    openProcessWorkspace(input) {
      return runV1(async ({ capability, repository }) => {
        const pair = await capability.requirePair(input.processId, input.workspaceId);
        const programId = pair.process.subjectProgramId;
        if (programId !== null) {
          const record = await repository.load(programId);
          const accepted = (await repository.loadLatestAcceptedDecision(programId))?.snapshot ??
            null;
          if (record !== null && ownsReviewV1(record, accepted, pair)) {
            await reconcileAcceptedV1(
              capability,
              repository,
              creatorUnitV1(record, pair, programId),
            );
          }
        }
        return await capability.openPair(pair);
      });
    },

    applyRevision(input) {
      return runV1(async ({ capability, repository }) => {
        if (
          (input.transcript.attemptBinding !== null ||
            input.transcript.terminalAttemptReceipt !== null) &&
          input.transcript.checkpoint === null
        ) throw authorityErrorV1("process_checkpoint_missing");
        const current = await requireCreatorV1(
          capability,
          repository,
          input.catalog.programId,
          input.transcript.processId,
        );
        if (
          input.transcript.checkpoint !== null &&
          input.transcript.checkpoint.workspaceId !== current.workspace.workspaceId
        ) throw authorityErrorV1("process_checkpoint_workspace_mismatch");
        let reviewed: ProgramCatalogCreateInputV1["reviewedWorkspace"];
        if (current.record.head.repositoryRevision === input.catalog.expectedRepositoryRevision) {
          const head = await capability.captureStableHead(current);
          reviewed = {
            processId: current.process.processId,
            workspaceId: current.workspace.workspaceId,
            volumeId: current.workspace.volumeId,
            workspaceFormat: current.workspace.workspaceFormat,
            ...head,
          };
        } else if (current.record.head.pendingReviewBinding !== null) {
          reviewed = current.record.head.pendingReviewBinding;
        } else return await conflictV1(repository, current.record, input.transcript.processId);
        return await repository.applyProgramRevisionWithProcessTranscript({
          catalog: { ...input.catalog, reviewedWorkspace: reviewed },
          transcript: transcriptAtReviewedWorkspaceV1(input.transcript, reviewed),
        });
      });
    },

    applyAgentRevision(input) {
      return runV1(async ({ capability, repository }) => {
        const current = await requireCreatorV1(
          capability,
          repository,
          input.catalog.programId,
          input.transcript.processId,
        );
        if (input.transcript.checkpoint.workspaceId !== current.workspace.workspaceId) {
          throw authorityErrorV1("process_checkpoint_workspace_mismatch");
        }
        let reviewed: ProgramCatalogCreateInputV1["reviewedWorkspace"];
        if (current.record.head.repositoryRevision === input.catalog.expectedRepositoryRevision) {
          reviewed = {
            processId: current.process.processId,
            workspaceId: current.workspace.workspaceId,
            volumeId: current.workspace.volumeId,
            workspaceFormat: current.workspace.workspaceFormat,
            ...(await capability.captureStableHead(current)),
          };
        } else if (current.record.head.pendingReviewBinding !== null) {
          reviewed = current.record.head.pendingReviewBinding;
        } else {
          return await executionConflictV1(repository, current.record, input.transcript.processId);
        }
        const operationInput = {
          lease: input.lease,
          observedAt: input.observedAt,
          catalog: { ...input.catalog, reviewedWorkspace: reviewed },
          transcript: transcriptAtReviewedWorkspaceV1(input.transcript, reviewed),
        };
        try {
          return await repository.commitProgramRevisionWithProcessExecutionTerminal(operationInput);
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") throw error;
          const queried = await repository.queryCreatorProcessOperation({
            operation: "program_revision_terminal",
            input: operationInput,
          });
          if (queried.kind === "absent") throw error;
          if (queried.kind === "mismatch") throw authorityErrorV1("repository_response_mismatch");
          const [record, process] = await Promise.all([
            repository.load(input.catalog.programId),
            repository.loadProcess(input.transcript.processId),
          ]);
          if (record === null || process === null) {
            throw authorityErrorV1("repository_response_mismatch");
          }
          return {
            kind: "unchanged",
            record,
            process,
            entries: operationInput.transcript.entries,
            operationReceipt: queried.receipt,
          };
        }
      });
    },

    decide(input) {
      return runV1(async ({ capability, repository }) => {
        const current = await requireCreatorV1(
          capability,
          repository,
          input.catalog.programId,
          input.transcript.processId,
        );
        if (input.catalog.status === "rejected") {
          const settled = await repository.decideProgramWithProcessTranscript({
            catalog: input.catalog,
            transcript: input.transcript,
          });
          if (settled.kind === "conflict") return settled;
          const sessionId = await capability.ensureHostSession(current);
          const candidate = await capability.querySnapshotCandidate(sessionId);
          if (candidate !== null) {
            const disposition = await capability.discardSnapshot({
              workspaceSessionId: sessionId,
              expected: candidate,
            });
            if (disposition === "retained") throw authorityErrorV1("recovery_required");
          }
          return settled;
        }
        const binding = current.record.head.pendingReviewBinding;
        if (
          binding === null || binding.proposalId !== input.catalog.expectedProposal.proposalId ||
          binding.programRevision !== input.catalog.expectedProposal.programRevision ||
          binding.repositoryRevision !== input.catalog.expectedRepositoryRevision
        ) return await conflictV1(repository, current.record, input.transcript.processId);
        const sessionId = await capability.ensureHostSession(current);
        const candidate = await capability.querySnapshotCandidate(sessionId);
        let genericReceipt: WorkspaceImmutableSnapshotReceiptV1;
        if (candidate === null) {
          genericReceipt = await capability.prepareSnapshot({
            workspaceSessionId: sessionId,
            snapshotId: createSnapshotId(),
            publicationId: binding.proposalId,
            expectedCheckpointId: binding.checkpointId,
            expectedGeneration: binding.generation,
            sourceRevision: binding.programRevision,
            baseRevision: binding.repositoryRevision,
          });
        } else {
          if (!receiptMatchesBindingV1(candidate, binding)) {
            throw authorityErrorV1("snapshot_mismatch");
          }
          genericReceipt = await capability.resumeSnapshotPublication({
            workspaceSessionId: sessionId,
            expected: candidate,
          });
        }
        const receipt = bindCreatorWorkspaceSnapshotReceiptV1(genericReceipt, binding);
        const settled = await repository.decideProgramWithProcessTranscript({
          catalog: { ...input.catalog, snapshotReceipt: receipt },
          transcript: input.transcript,
        });
        if (settled.kind === "conflict") {
          await capability.discardSnapshot({
            workspaceSessionId: sessionId,
            expected: creatorWorkspaceSnapshotReceiptCoreV1(receipt),
          });
          return settled;
        }
        await ensureAcceptedV1(capability, sessionId, receipt);
        return settled;
      });
    },
  };
}
