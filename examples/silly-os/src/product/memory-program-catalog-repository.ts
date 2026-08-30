// SPDX-License-Identifier: MIT

import {
  clonePreviewProgramForCatalogV1,
  cloneProgramCatalogContinuationV1,
  cloneProgramCatalogDecisionV1,
  cloneProgramCatalogRecordV1,
  normalizeProgramCatalogApplyRevisionInputV1,
  normalizeProgramCatalogAcceptedDecisionListInputV1,
  normalizeProgramCatalogCreateInputV1,
  normalizeProgramCatalogDecideInputV1,
  normalizeProgramCatalogListInputV1,
  normalizeProgramCatalogProgramIdV1,
  normalizeProgramCatalogProposalIdV1,
  normalizeProgramCatalogRevisionV1,
  programCatalogListPageMinimumBytesV1,
  programCatalogDecisionPageMinimumBytesV1,
  type ProgramCatalogAcceptedDecisionV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogCommitResultV1,
  type ProgramCatalogContinuationV1,
  type ProgramCatalogDecisionV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogRepositoryV1,
} from "./program-catalog-repository.ts";
import type { PreviewProgramV1 } from "./contracts.ts";

interface StoredCommitV1 {
  readonly fingerprint: string;
  readonly operation: "create" | "apply_revision" | "decide";
}

interface DecisionReferenceV1 {
  readonly proposalId: string;
  readonly programRevision: number;
}

export interface MemoryProgramCatalogRepositoryBackingV1 {
  readonly records: Map<string, ProgramCatalogRecordV1>;
  readonly revisions: Map<string, PreviewProgramV1>;
  readonly decisions: Map<string, ProgramCatalogDecisionV1>;
  readonly continuations: Map<string, ProgramCatalogContinuationV1>;
  readonly commits: Map<string, StoredCommitV1>;
  /** Summary-only ordering index; full Program records remain normalized per Program. */
  readonly listOrder: string[];
  /** Per-Program decision identity index, newest Program revision first. */
  readonly decisionOrder: Map<string, DecisionReferenceV1[]>;
}

export function createMemoryProgramCatalogRepositoryBackingV1(): MemoryProgramCatalogRepositoryBackingV1 {
  return {
    records: new Map(),
    revisions: new Map(),
    decisions: new Map(),
    continuations: new Map(),
    commits: new Map(),
    listOrder: [],
    decisionOrder: new Map(),
  };
}

function revisionKeyV1(programId: string, revision: number): string {
  return `${programId}\u0000${String(revision)}`;
}

function decisionKeyV1(programId: string, proposalId: string, programRevision: number): string {
  return `${programId}\u0000${proposalId}\u0000${String(programRevision)}`;
}

function commitKeyV1(programId: string, commitId: string): string {
  return `${programId}\u0000${commitId}`;
}

function fingerprintV1(value: unknown): string {
  return JSON.stringify(value);
}

function compareListPositionV1(
  left: { readonly updatedAt: number; readonly programId: string },
  right: { readonly updatedAt: number; readonly programId: string },
): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
  if (left.programId === right.programId) return 0;
  return left.programId > right.programId ? -1 : 1;
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

function currentResultV1(
  backing: MemoryProgramCatalogRepositoryBackingV1,
  programId: string,
): ProgramCatalogCommitResultV1 {
  const current = backing.records.get(programId);
  return current === undefined
    ? { kind: "conflict", current: null }
    : { kind: "unchanged", record: cloneProgramCatalogRecordV1(current) };
}

function checkCommitV1(
  backing: MemoryProgramCatalogRepositoryBackingV1,
  programId: string,
  commitId: string,
  operation: StoredCommitV1["operation"],
  fingerprint: string,
): ProgramCatalogCommitResultV1 | null {
  const stored = backing.commits.get(commitKeyV1(programId, commitId));
  if (stored === undefined) return null;
  if (stored.operation !== operation || stored.fingerprint !== fingerprint) {
    const current = backing.records.get(programId);
    return {
      kind: "conflict",
      current: current === undefined ? null : cloneProgramCatalogRecordV1(current),
    };
  }
  return currentResultV1(backing, programId);
}

function pairIsCurrentV1(
  record: ProgramCatalogRecordV1,
  continuation: ProgramCatalogContinuationV1,
  expectedRepositoryRevision: number,
): boolean {
  return record.head.repositoryRevision === expectedRepositoryRevision &&
    continuation.programId === record.head.programId &&
    continuation.workspaceId === record.head.workspaceId &&
    continuation.programRevision === record.head.currentProgramRevision &&
    continuation.repositoryRevision === expectedRepositoryRevision;
}

function proposalMatchesV1(
  record: ProgramCatalogRecordV1,
  proposal: { readonly proposalId: string; readonly programRevision: number },
): boolean {
  return record.head.proposal.proposalId === proposal.proposalId &&
    record.head.proposal.programRevision === proposal.programRevision;
}

export function createMemoryProgramCatalogRepositoryV1(options: {
  readonly backing?: MemoryProgramCatalogRepositoryBackingV1;
} = {}): ProgramCatalogRepositoryV1 {
  const backing = options.backing ?? createMemoryProgramCatalogRepositoryBackingV1();
  let disposed = false;
  const availableV1 = (): void => {
    if (disposed) throw new Error("Program catalog repository is disposed");
  };

  const loadRecordV1 = (programId: string): ProgramCatalogRecordV1 | null => {
    const record = backing.records.get(programId);
    if (record === undefined) return null;
    const continuation = backing.continuations.get(programId);
    const revision = backing.revisions.get(
      revisionKeyV1(programId, record.head.currentProgramRevision),
    );
    if (continuation === undefined || revision === undefined) {
      throw new Error("Program catalog backing is incomplete");
    }
    const admitted = cloneProgramCatalogRecordV1(record);
    if (
      fingerprintV1(admitted.currentProgram) !== fingerprintV1(revision) ||
      !pairIsCurrentV1(admitted, continuation, admitted.head.repositoryRevision)
    ) throw new Error("Program catalog backing is inconsistent");
    return admitted;
  };

  const commitV1 = (
    programId: string,
    commitId: string,
    operation: StoredCommitV1["operation"],
    fingerprint: string,
    record: ProgramCatalogRecordV1,
    continuation: ProgramCatalogContinuationV1,
    program: PreviewProgramV1,
    decision: ProgramCatalogDecisionV1 | null,
  ): ProgramCatalogCommitResultV1 => {
    const stored = cloneProgramCatalogRecordV1(record);
    backing.records.set(programId, stored);
    backing.continuations.set(programId, cloneProgramCatalogContinuationV1(continuation));
    backing.revisions.set(
      revisionKeyV1(programId, program.revision),
      clonePreviewProgramForCatalogV1(program),
    );
    if (decision !== null) {
      backing.decisions.set(
        decisionKeyV1(programId, decision.proposalId, decision.programRevision),
        cloneProgramCatalogDecisionV1(decision),
      );
      const order = backing.decisionOrder.get(programId) ?? [];
      if (!order.some((entry) => entry.programRevision === decision.programRevision)) {
        const nextOrder = [...order, {
          proposalId: decision.proposalId,
          programRevision: decision.programRevision,
        }].sort((left, right) => right.programRevision - left.programRevision);
        backing.decisionOrder.set(programId, nextOrder);
      }
    }
    backing.commits.set(commitKeyV1(programId, commitId), { operation, fingerprint });
    const previousIndex = backing.listOrder.indexOf(programId);
    if (previousIndex >= 0) backing.listOrder.splice(previousIndex, 1);
    let low = 0;
    let high = backing.listOrder.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const otherId = backing.listOrder[middle];
      const other = otherId === undefined ? undefined : backing.records.get(otherId);
      if (other === undefined || compareListPositionV1(stored.head, other.head) < 0) high = middle;
      else low = middle + 1;
    }
    backing.listOrder.splice(low, 0, programId);
    return { kind: "committed", record: cloneProgramCatalogRecordV1(stored) };
  };

  return {
    async initialize() {
      availableV1();
    },
    async listPrograms(rawInput) {
      availableV1();
      const input = normalizeProgramCatalogListInputV1(rawInput);
      let start = 0;
      if (input.before !== null) {
        let low = 0;
        let high = backing.listOrder.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          const programId = backing.listOrder[middle];
          const record = programId === undefined ? undefined : backing.records.get(programId);
          if (record === undefined || compareListPositionV1(record.head, input.before) <= 0) {
            low = middle + 1;
          } else high = middle;
        }
        start = low;
      }
      const summaries: Array<{
        readonly programId: string;
        readonly name: string;
        readonly kind: PreviewProgramV1["kind"];
        readonly programRevision: number;
        readonly proposalStatus: ProgramCatalogRecordV1["head"]["proposal"]["status"];
        readonly repositoryRevision: number;
        readonly updatedAt: number;
      }> = [];
      let bytes = 0;
      let index = start;
      for (; index < backing.listOrder.length; index += 1) {
        const programId = backing.listOrder[index];
        const value = programId === undefined ? undefined : backing.records.get(programId);
        if (value === undefined) throw new Error("Program catalog list index is inconsistent");
        const record = cloneProgramCatalogRecordV1(value);
        const summary = {
          programId: record.head.programId,
          name: record.currentProgram.name,
          kind: record.currentProgram.kind,
          programRevision: record.head.currentProgramRevision,
          proposalStatus: record.head.proposal.status,
          repositoryRevision: record.head.repositoryRevision,
          updatedAt: record.head.updatedAt,
        };
        const nextBytes = new TextEncoder().encode(JSON.stringify(summary)).byteLength;
        if (bytes + nextBytes > input.maximumBytes) break;
        summaries.push(summary);
        bytes += nextBytes;
      }
      if (summaries.length === 0 && start < backing.listOrder.length) {
        throw new Error(
          `Program summary exceeds ${String(programCatalogListPageMinimumBytesV1)} bytes`,
        );
      }
      const last = summaries.at(-1);
      const nextCursor = index < backing.listOrder.length && last !== undefined
        ? { updatedAt: last.updatedAt, programId: last.programId }
        : null;
      return { summaries, nextCursor };
    },
    async load(programId) {
      availableV1();
      return loadRecordV1(normalizeProgramCatalogProgramIdV1(programId));
    },
    async loadProgramRevision(programId, revision) {
      availableV1();
      const normalizedProgramId = normalizeProgramCatalogProgramIdV1(programId);
      const normalizedRevision = normalizeProgramCatalogRevisionV1(revision);
      const value = backing.revisions.get(revisionKeyV1(normalizedProgramId, normalizedRevision));
      return value === undefined ? null : clonePreviewProgramForCatalogV1(value);
    },
    async loadDecision(programId, proposalId, programRevision) {
      availableV1();
      const normalizedProgramId = normalizeProgramCatalogProgramIdV1(programId);
      const normalizedProposalId = normalizeProgramCatalogProposalIdV1(proposalId);
      const normalizedRevision = normalizeProgramCatalogRevisionV1(programRevision);
      const value = backing.decisions.get(
        decisionKeyV1(normalizedProgramId, normalizedProposalId, normalizedRevision),
      );
      return value === undefined ? null : cloneProgramCatalogDecisionV1(value);
    },
    async loadLatestAcceptedDecision(programId) {
      availableV1();
      const normalizedProgramId = normalizeProgramCatalogProgramIdV1(programId);
      const record = loadRecordV1(normalizedProgramId);
      const reference = record?.head.latestAccepted ?? null;
      if (reference === null) return null;
      const value = backing.decisions.get(
        decisionKeyV1(normalizedProgramId, reference.proposalId, reference.programRevision),
      );
      if (value === undefined || value.status !== "accepted") {
        throw new Error("Program latest accepted decision index is inconsistent");
      }
      return cloneProgramCatalogDecisionV1(value) as ProgramCatalogAcceptedDecisionV1;
    },
    async listAcceptedDecisions(rawInput) {
      availableV1();
      const input = normalizeProgramCatalogAcceptedDecisionListInputV1(rawInput);
      const order = backing.decisionOrder.get(input.programId) ?? [];
      let start = 0;
      if (input.beforeProgramRevision !== null) {
        let low = 0;
        let high = order.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          const entry = order[middle];
          if (entry === undefined || entry.programRevision >= input.beforeProgramRevision) {
            low = middle + 1;
          } else high = middle;
        }
        start = low;
      }
      const decisions: ProgramCatalogAcceptedDecisionV1[] = [];
      let bytes = 0;
      let index = start;
      let lastScannedRevision: number | null = null;
      for (; index < order.length; index += 1) {
        const reference = order[index];
        if (reference === undefined) break;
        const decision = backing.decisions.get(
          decisionKeyV1(input.programId, reference.proposalId, reference.programRevision),
        );
        if (decision === undefined) throw new Error("Program decision index is inconsistent");
        const nextBytes = new TextEncoder().encode(JSON.stringify(decision)).byteLength;
        if (bytes + nextBytes > input.maximumBytes) break;
        bytes += nextBytes;
        lastScannedRevision = reference.programRevision;
        if (decision.status === "accepted") {
          decisions.push(
            cloneProgramCatalogDecisionV1(decision) as ProgramCatalogAcceptedDecisionV1,
          );
        }
      }
      if (lastScannedRevision === null && start < order.length) {
        throw new Error(
          `Program decision exceeds ${String(programCatalogDecisionPageMinimumBytesV1)} bytes`,
        );
      }
      return {
        decisions,
        nextCursor: index < order.length ? lastScannedRevision : null,
      };
    },
    async loadContinuation(programId) {
      availableV1();
      const value = backing.continuations.get(normalizeProgramCatalogProgramIdV1(programId));
      return value === undefined ? null : cloneProgramCatalogContinuationV1(value);
    },
    async create(rawInput) {
      availableV1();
      const normalized = normalizeProgramCatalogCreateInputV1(rawInput);
      const fingerprint = fingerprintV1(normalized);
      const duplicate = checkCommitV1(
        backing,
        normalized.program.programId,
        normalized.commitId,
        "create",
        fingerprint,
      );
      if (duplicate !== null) return duplicate;
      if (loadRecordV1(normalized.program.programId) !== null) {
        const current = loadRecordV1(normalized.program.programId);
        return { kind: "conflict", current };
      }
      const binding = {
        proposalId: normalized.proposalId,
        programId: normalized.program.programId,
        programRevision: 1,
        baseAcceptedProgramRevision: null,
        repositoryRevision: 1,
        workspaceId: normalized.continuation.workspaceId,
        volumeId: normalized.continuation.volumeId,
        workspaceFormat: 1 as const,
        checkpointId: normalized.reviewedHead.checkpointId,
        generation: normalized.reviewedHead.generation,
      };
      const record: ProgramCatalogRecordV1 = {
        head: {
          schemaVersion: 1,
          programId: normalized.program.programId,
          repositoryRevision: 1,
          currentProgramRevision: 1,
          proposal: { proposalId: normalized.proposalId, programRevision: 1, status: "pending" },
          latestAccepted: null,
          workspaceId: normalized.continuation.workspaceId,
          updatedAt: normalized.updatedAt,
          pendingReviewBinding: binding,
        },
        currentProgram: normalized.program,
        latestDecision: null,
      };
      return commitV1(
        normalized.program.programId,
        normalized.commitId,
        "create",
        fingerprint,
        record,
        normalized.continuation,
        normalized.program,
        null,
      );
    },
    async applyRevision(rawInput: ProgramCatalogApplyRevisionInputV1) {
      availableV1();
      const normalized = normalizeProgramCatalogApplyRevisionInputV1(rawInput);
      const fingerprint = fingerprintV1(normalized);
      const duplicate = checkCommitV1(
        backing,
        normalized.programId,
        normalized.commitId,
        "apply_revision",
        fingerprint,
      );
      if (duplicate !== null) return duplicate;
      const current = loadRecordV1(normalized.programId);
      const storedContinuation = backing.continuations.get(normalized.programId);
      if (
        current === null || storedContinuation === undefined ||
        !pairIsCurrentV1(current, normalized.continuation, normalized.expectedRepositoryRevision) ||
        !continuationsEqualV1(storedContinuation, normalized.continuation) ||
        !proposalMatchesV1(current, normalized.expectedProposal) ||
        normalized.program.revision !== current.head.currentProgramRevision + 1 ||
        normalized.proposalId.length === 0 || normalized.updatedAt < current.head.updatedAt
      ) return { kind: "conflict", current };
      const nextRepositoryRevision = current.head.repositoryRevision + 1;
      const baseAcceptedProgramRevision = current.head.latestAccepted?.programRevision ?? null;
      const nextContinuation = {
        ...normalized.continuation,
        programRevision: normalized.program.revision,
        repositoryRevision: nextRepositoryRevision,
      };
      const record: ProgramCatalogRecordV1 = {
        head: {
          ...current.head,
          repositoryRevision: nextRepositoryRevision,
          currentProgramRevision: normalized.program.revision,
          proposal: {
            proposalId: normalized.proposalId,
            programRevision: normalized.program.revision,
            status: "pending",
          },
          updatedAt: normalized.updatedAt,
          pendingReviewBinding: {
            proposalId: normalized.proposalId,
            programId: normalized.programId,
            programRevision: normalized.program.revision,
            baseAcceptedProgramRevision,
            repositoryRevision: nextRepositoryRevision,
            workspaceId: normalized.continuation.workspaceId,
            volumeId: normalized.continuation.volumeId,
            workspaceFormat: 1,
            checkpointId: normalized.reviewedHead.checkpointId,
            generation: normalized.reviewedHead.generation,
          },
        },
        currentProgram: normalized.program,
        latestDecision: null,
      };
      return commitV1(
        normalized.programId,
        normalized.commitId,
        "apply_revision",
        fingerprint,
        record,
        nextContinuation,
        normalized.program,
        null,
      );
    },
    async decide(rawInput: ProgramCatalogDecideInputV1) {
      availableV1();
      const normalized = normalizeProgramCatalogDecideInputV1(rawInput);
      const fingerprint = fingerprintV1(normalized);
      const duplicate = checkCommitV1(
        backing,
        normalized.programId,
        normalized.commitId,
        "decide",
        fingerprint,
      );
      if (duplicate !== null) return duplicate;
      const current = loadRecordV1(normalized.programId);
      const storedContinuation = backing.continuations.get(normalized.programId);
      const binding = current?.head.pendingReviewBinding ?? null;
      if (
        current === null || storedContinuation === undefined || binding === null ||
        current.head.proposal.status !== "pending" ||
        !pairIsCurrentV1(current, normalized.continuation, normalized.expectedRepositoryRevision) ||
        !continuationsEqualV1(storedContinuation, normalized.continuation) ||
        !proposalMatchesV1(current, normalized.expectedProposal) ||
        normalized.updatedAt < current.head.updatedAt
      ) return { kind: "conflict", current };
      if (normalized.status === "accepted") {
        const receipt = normalized.snapshotReceipt;
        if (
          receipt.programId !== normalized.programId ||
          receipt.workspaceId !== current.head.workspaceId ||
          receipt.volumeId !== binding.volumeId ||
          receipt.workspaceFormat !== binding.workspaceFormat ||
          receipt.proposalId !== binding.proposalId ||
          receipt.programRevision !== binding.programRevision ||
          receipt.baseRepositoryRevision !== current.head.repositoryRevision ||
          receipt.checkpointId !== binding.checkpointId || receipt.generation !== binding.generation
        ) return { kind: "conflict", current };
      }
      const nextRepositoryRevision = current.head.repositoryRevision + 1;
      const decision: ProgramCatalogDecisionV1 = normalized.status === "accepted"
        ? {
          programId: normalized.programId,
          proposalId: normalized.expectedProposal.proposalId,
          programRevision: normalized.expectedProposal.programRevision,
          status: "accepted",
          repositoryRevision: nextRepositoryRevision,
          snapshot: normalized.snapshotReceipt,
        }
        : {
          programId: normalized.programId,
          proposalId: normalized.expectedProposal.proposalId,
          programRevision: normalized.expectedProposal.programRevision,
          status: "rejected",
          repositoryRevision: nextRepositoryRevision,
        };
      const nextContinuation = {
        ...normalized.continuation,
        repositoryRevision: nextRepositoryRevision,
      };
      const record: ProgramCatalogRecordV1 = {
        head: {
          ...current.head,
          repositoryRevision: nextRepositoryRevision,
          proposal: { ...current.head.proposal, status: normalized.status },
          latestAccepted: normalized.status === "accepted"
            ? { ...normalized.expectedProposal }
            : current.head.latestAccepted,
          updatedAt: normalized.updatedAt,
          pendingReviewBinding: null,
        },
        currentProgram: current.currentProgram,
        latestDecision: decision,
      };
      return commitV1(
        normalized.programId,
        normalized.commitId,
        "decide",
        fingerprint,
        record,
        nextContinuation,
        current.currentProgram,
        decision,
      );
    },
    async reset() {
      availableV1();
      backing.records.clear();
      backing.revisions.clear();
      backing.decisions.clear();
      backing.continuations.clear();
      backing.commits.clear();
      backing.listOrder.splice(0);
      backing.decisionOrder.clear();
    },
    async dispose() {
      disposed = true;
    },
  };
}
