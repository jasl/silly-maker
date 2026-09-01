// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  clonePreviewProgramForCatalogV1,
  cloneProgramCatalogDecisionV1,
  cloneProgramCatalogHeadV1,
  cloneProgramCatalogRecordV1,
  type ProgramCatalogApplyRevisionInputV1,
  type ProgramCatalogCreateInputV1,
  type ProgramCatalogDecideInputV1,
  type ProgramCatalogDecisionV1,
  type ProgramCatalogHeadV1,
  type ProgramCatalogRecordV1,
} from "../runtime/program-catalog-repository.ts";
import type { PreviewProgramV1 } from "../runtime/contracts.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryOperationV1,
} from "../../../src/application/persistence/program-data-repository-failure.ts";
import {
  digestIndexedDbOperationV1,
  requestIndexedDbResultV1,
} from "../../../src/application/persistence/indexeddb-process-execution-transaction-kernel.ts";
import {
  cloneProcessWorkspaceBindingV1,
  type ProcessWorkspaceBindingV1,
} from "../../../src/application/persistence/program-data-repository.ts";

export const creatorCatalogStoreNamesV1 = [
  "creator_catalog_commits",
  "creator_program_decisions",
  "creator_program_heads",
  "creator_program_revisions",
] as const;

interface StoredCreatorCatalogCommitV1 {
  readonly programId: string;
  readonly commitId: string;
  readonly operation: "create" | "apply_revision" | "decide";
  readonly digest: string;
}

export type PreparedCreatorCatalogMutationV1 =
  | { readonly kind: "unchanged"; readonly record: ProgramCatalogRecordV1 }
  | { readonly kind: "conflict"; readonly current: ProgramCatalogRecordV1 | null }
  | {
    readonly kind: "committed";
    readonly record: ProgramCatalogRecordV1;
    readonly write: () => Promise<void>;
  };

function programNameV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value &&
    new TextEncoder().encode(value).byteLength <= 256;
}

function encodeHeadV1(headValue: ProgramCatalogHeadV1, programValue: PreviewProgramV1): unknown {
  const head = cloneProgramCatalogHeadV1(headValue);
  const program = clonePreviewProgramForCatalogV1(programValue);
  if (head.programId !== program.programId || head.currentProgramRevision !== program.revision) {
    throw new TypeError("Creator Program head projection mismatch");
  }
  return { ...head, name: program.name, kind: program.kind };
}

export function decodeCreatorCatalogHeadProjectionV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): {
  readonly head: ProgramCatalogHeadV1;
  readonly name: string;
  readonly kind: PreviewProgramV1["kind"];
} {
  try {
    if (value === null || typeof value !== "object") throw new TypeError();
    const { name, kind, ...headValue } = value as ProgramCatalogHeadV1 & {
      readonly name: unknown;
      readonly kind: unknown;
    };
    if (
      !programNameV1(name) ||
      (kind !== "translation" && kind !== "writing" && kind !== "roleplay" &&
        kind !== "general")
    ) throw new TypeError();
    return { head: cloneProgramCatalogHeadV1(headValue), name, kind };
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function decodeCreatorProgramRevisionV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): PreviewProgramV1 {
  try {
    return clonePreviewProgramForCatalogV1(value as PreviewProgramV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function decodeCreatorCatalogDecisionV1(
  value: unknown,
  expectedProgramId: string,
  operation: ProgramDataRepositoryOperationV1,
): ProgramCatalogDecisionV1 {
  try {
    const decision = cloneProgramCatalogDecisionV1(value as ProgramCatalogDecisionV1);
    if (decision.programId !== expectedProgramId) throw new TypeError();
    return decision;
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function decodeCreatorCatalogCommitV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): StoredCreatorCatalogCommitV1 {
  if (
    value === null || typeof value !== "object" || !("programId" in value) ||
    !("commitId" in value) || !("operation" in value) || !("digest" in value)
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  const row = value as StoredCreatorCatalogCommitV1;
  if (
    typeof row.programId !== "string" || typeof row.commitId !== "string" ||
    (row.operation !== "create" && row.operation !== "apply_revision" &&
      row.operation !== "decide") ||
    typeof row.digest !== "string" || !/^[0-9a-f]{64}$/u.test(row.digest)
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  return { ...row };
}

export async function loadCreatorCatalogRecordTxV1(
  transaction: IDBTransaction,
  programId: string,
  operation: ProgramDataRepositoryOperationV1,
): Promise<ProgramCatalogRecordV1 | null> {
  const headRow = await requestIndexedDbResultV1(
    transaction.objectStore("creator_program_heads").get(programId),
  );
  if (headRow === undefined) return null;
  const projection = decodeCreatorCatalogHeadProjectionV1(headRow, operation);
  const head = projection.head;
  const revisionRow = await requestIndexedDbResultV1(
    transaction.objectStore("creator_program_revisions").get([
      programId,
      head.currentProgramRevision,
    ]),
  );
  if (revisionRow === undefined) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const currentProgram = decodeCreatorProgramRevisionV1(revisionRow, operation);
  if (projection.name !== currentProgram.name || projection.kind !== currentProgram.kind) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  let latestDecision: ProgramCatalogDecisionV1 | null = null;
  if (head.proposal.status !== "pending") {
    const decisionRow = await requestIndexedDbResultV1(
      transaction.objectStore("creator_program_decisions").get([
        programId,
        head.proposal.proposalId,
        head.proposal.programRevision,
      ]),
    );
    if (decisionRow === undefined) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
    }
    latestDecision = decodeCreatorCatalogDecisionV1(decisionRow, programId, operation);
  }
  return cloneProgramCatalogRecordV1({ head, currentProgram, latestDecision });
}

async function replayCreatorCatalogCommitV1(input: {
  readonly transaction: IDBTransaction;
  readonly programId: string;
  readonly commitId: string;
  readonly operation: StoredCreatorCatalogCommitV1["operation"];
  readonly digest: string;
  readonly repositoryOperation: ProgramDataRepositoryOperationV1;
}): Promise<Exclude<PreparedCreatorCatalogMutationV1, { readonly kind: "committed" }> | null> {
  const row = await requestIndexedDbResultV1(
    input.transaction.objectStore("creator_catalog_commits").get([
      input.programId,
      input.commitId,
    ]),
  );
  if (row === undefined) return null;
  const commit = decodeCreatorCatalogCommitV1(row, input.repositoryOperation);
  if (commit.programId !== input.programId || commit.commitId !== input.commitId) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
  }
  const current = await loadCreatorCatalogRecordTxV1(
    input.transaction,
    input.programId,
    input.repositoryOperation,
  );
  if (current === null) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
  }
  return commit.operation === input.operation && commit.digest === input.digest
    ? { kind: "unchanged", record: current }
    : { kind: "conflict", current };
}

function revisionMatchesV1(record: ProgramCatalogRecordV1, expectedRevision: number): boolean {
  return record.head.repositoryRevision === expectedRevision;
}

function proposalMatchesV1(
  record: ProgramCatalogRecordV1,
  proposal: { readonly proposalId: string; readonly programRevision: number },
): boolean {
  return record.head.proposal.proposalId === proposal.proposalId &&
    record.head.proposal.programRevision === proposal.programRevision;
}

export async function prepareCreatorCatalogCreateV1(input: {
  readonly transaction: IDBTransaction;
  readonly value: ProgramCatalogCreateInputV1;
  readonly digest?: string;
  readonly repositoryOperation: ProgramDataRepositoryOperationV1;
}): Promise<PreparedCreatorCatalogMutationV1> {
  const digest = input.digest ?? await digestIndexedDbOperationV1(input.value);
  const programId = input.value.program.programId;
  const replay = await replayCreatorCatalogCommitV1({
    transaction: input.transaction,
    programId,
    commitId: input.value.commitId,
    operation: "create",
    digest,
    repositoryOperation: input.repositoryOperation,
  });
  if (replay !== null) return replay;
  const current = await loadCreatorCatalogRecordTxV1(
    input.transaction,
    programId,
    input.repositoryOperation,
  );
  if (current !== null) return { kind: "conflict", current };
  const head: ProgramCatalogHeadV1 = {
    schemaVersion: 1,
    programId,
    repositoryRevision: 1,
    currentProgramRevision: 1,
    proposal: { proposalId: input.value.proposalId, programRevision: 1, status: "pending" },
    latestAccepted: null,
    updatedAt: input.value.updatedAt,
    pendingReviewBinding: {
      proposalId: input.value.proposalId,
      programId,
      programRevision: 1,
      baseAcceptedProgramRevision: null,
      repositoryRevision: 1,
      ...input.value.reviewedWorkspace,
    },
  };
  const record = cloneProgramCatalogRecordV1({
    head,
    currentProgram: input.value.program,
    latestDecision: null,
  });
  return {
    kind: "committed",
    record,
    write: async () => {
      await Promise.all([
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_heads").add(
            encodeHeadV1(head, input.value.program),
          ),
        ),
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_revisions").add(input.value.program),
        ),
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_catalog_commits").add(
            {
              programId,
              commitId: input.value.commitId,
              operation: "create",
              digest,
            } satisfies StoredCreatorCatalogCommitV1,
          ),
        ),
      ]);
    },
  };
}

export async function prepareCreatorCatalogApplyRevisionV1(input: {
  readonly transaction: IDBTransaction;
  readonly value: ProgramCatalogApplyRevisionInputV1;
  readonly digest?: string | null;
  readonly repositoryOperation: ProgramDataRepositoryOperationV1;
}): Promise<PreparedCreatorCatalogMutationV1> {
  const digest = input.digest === undefined
    ? await digestIndexedDbOperationV1(input.value)
    : input.digest;
  if (digest !== null) {
    const replay = await replayCreatorCatalogCommitV1({
      transaction: input.transaction,
      programId: input.value.programId,
      commitId: input.value.commitId,
      operation: "apply_revision",
      digest,
      repositoryOperation: input.repositoryOperation,
    });
    if (replay !== null) return replay;
  }
  const current = await loadCreatorCatalogRecordTxV1(
    input.transaction,
    input.value.programId,
    input.repositoryOperation,
  );
  if (current === null) return { kind: "conflict", current: null };
  const workspaceRow = await requestIndexedDbResultV1(
    input.transaction.objectStore("process_workspace_bindings").get(
      input.value.reviewedWorkspace.processId,
    ),
  );
  const workspace = workspaceRow === undefined
    ? null
    : cloneProcessWorkspaceBindingV1(workspaceRow as ProcessWorkspaceBindingV1);
  if (
    !revisionMatchesV1(current, input.value.expectedRepositoryRevision) ||
    workspace === null || workspace.workspaceId !== input.value.reviewedWorkspace.workspaceId ||
    workspace.volumeId !== input.value.reviewedWorkspace.volumeId ||
    workspace.workspaceFormat !== input.value.reviewedWorkspace.workspaceFormat ||
    !proposalMatchesV1(current, input.value.expectedProposal) ||
    input.value.program.revision !== current.head.currentProgramRevision + 1 ||
    input.value.updatedAt < current.head.updatedAt
  ) return { kind: "conflict", current };
  const repositoryRevision = current.head.repositoryRevision + 1;
  const head: ProgramCatalogHeadV1 = {
    ...current.head,
    repositoryRevision,
    currentProgramRevision: input.value.program.revision,
    proposal: {
      proposalId: input.value.proposalId,
      programRevision: input.value.program.revision,
      status: "pending",
    },
    updatedAt: input.value.updatedAt,
    pendingReviewBinding: {
      proposalId: input.value.proposalId,
      programId: input.value.programId,
      programRevision: input.value.program.revision,
      baseAcceptedProgramRevision: current.head.latestAccepted?.programRevision ?? null,
      repositoryRevision,
      ...input.value.reviewedWorkspace,
    },
  };
  const record = cloneProgramCatalogRecordV1({
    head,
    currentProgram: input.value.program,
    latestDecision: null,
  });
  return {
    kind: "committed",
    record,
    write: async () => {
      await Promise.all([
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_heads").put(
            encodeHeadV1(head, input.value.program),
          ),
        ),
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_revisions").add(input.value.program),
        ),
        ...(digest === null ? [] : [
          requestIndexedDbResultV1(
            input.transaction.objectStore("creator_catalog_commits").add(
              {
                programId: input.value.programId,
                commitId: input.value.commitId,
                operation: "apply_revision",
                digest,
              } satisfies StoredCreatorCatalogCommitV1,
            ),
          ),
        ]),
      ]);
    },
  };
}

export async function prepareCreatorCatalogDecisionV1(input: {
  readonly transaction: IDBTransaction;
  readonly value: ProgramCatalogDecideInputV1;
  readonly digest?: string;
  readonly repositoryOperation: ProgramDataRepositoryOperationV1;
}): Promise<PreparedCreatorCatalogMutationV1> {
  const digest = input.digest ?? await digestIndexedDbOperationV1(input.value);
  const replay = await replayCreatorCatalogCommitV1({
    transaction: input.transaction,
    programId: input.value.programId,
    commitId: input.value.commitId,
    operation: "decide",
    digest,
    repositoryOperation: input.repositoryOperation,
  });
  if (replay !== null) return replay;
  const current = await loadCreatorCatalogRecordTxV1(
    input.transaction,
    input.value.programId,
    input.repositoryOperation,
  );
  if (current === null) return { kind: "conflict", current: null };
  const binding = current.head.pendingReviewBinding;
  if (
    binding === null || current.head.proposal.status !== "pending" ||
    !revisionMatchesV1(current, input.value.expectedRepositoryRevision) ||
    !proposalMatchesV1(current, input.value.expectedProposal) ||
    input.value.updatedAt < current.head.updatedAt
  ) return { kind: "conflict", current };
  if (input.value.status === "accepted") {
    const receipt = input.value.snapshotReceipt;
    if (
      receipt.programId !== input.value.programId || receipt.workspaceId !== binding.workspaceId ||
      receipt.volumeId !== binding.volumeId ||
      receipt.workspaceFormat !== binding.workspaceFormat ||
      receipt.proposalId !== binding.proposalId ||
      receipt.programRevision !== binding.programRevision ||
      receipt.baseRepositoryRevision !== current.head.repositoryRevision ||
      receipt.checkpointId !== binding.checkpointId || receipt.generation !== binding.generation
    ) return { kind: "conflict", current };
  }
  const repositoryRevision = current.head.repositoryRevision + 1;
  const decision: ProgramCatalogDecisionV1 = input.value.status === "accepted"
    ? {
      programId: input.value.programId,
      proposalId: input.value.expectedProposal.proposalId,
      programRevision: input.value.expectedProposal.programRevision,
      status: "accepted",
      repositoryRevision,
      snapshot: input.value.snapshotReceipt,
    }
    : {
      programId: input.value.programId,
      proposalId: input.value.expectedProposal.proposalId,
      programRevision: input.value.expectedProposal.programRevision,
      status: "rejected",
      repositoryRevision,
    };
  const head: ProgramCatalogHeadV1 = {
    ...current.head,
    repositoryRevision,
    proposal: { ...current.head.proposal, status: input.value.status },
    latestAccepted: input.value.status === "accepted"
      ? { ...input.value.expectedProposal }
      : current.head.latestAccepted,
    updatedAt: input.value.updatedAt,
    pendingReviewBinding: null,
  };
  const record = cloneProgramCatalogRecordV1({
    head,
    currentProgram: current.currentProgram,
    latestDecision: decision,
  });
  return {
    kind: "committed",
    record,
    write: async () => {
      await Promise.all([
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_heads").put(
            encodeHeadV1(head, current.currentProgram),
          ),
        ),
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_program_decisions").add(decision),
        ),
        requestIndexedDbResultV1(
          input.transaction.objectStore("creator_catalog_commits").add(
            {
              programId: input.value.programId,
              commitId: input.value.commitId,
              operation: "decide",
              digest,
            } satisfies StoredCreatorCatalogCommitV1,
          ),
        ),
      ]);
    },
  };
}
