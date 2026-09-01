// SPDX-License-Identifier: MIT

import {
  admitWorkspaceImmutableSnapshotReceiptV1,
  type WorkspaceImmutableSnapshotReceiptV1,
} from "../../../src/workspace/contracts.ts";

/** Creator-owned semantic binding layered over the generic immutable snapshot receipt. */
export interface CreatorWorkspaceSnapshotReceiptV1 extends WorkspaceImmutableSnapshotReceiptV1 {
  readonly proposalId: string;
  readonly programRevision: number;
  readonly baseRepositoryRevision: number;
}

export function creatorWorkspaceSnapshotReceiptCoreV1(
  receipt: WorkspaceImmutableSnapshotReceiptV1,
): WorkspaceImmutableSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: receipt.snapshotId,
    programId: receipt.programId,
    workspaceId: receipt.workspaceId,
    volumeId: receipt.volumeId,
    workspaceFormat: 1,
    publicationId: receipt.publicationId,
    sourceRevision: receipt.sourceRevision,
    baseRevision: receipt.baseRevision,
    checkpointId: receipt.checkpointId,
    generation: receipt.generation,
    fileCount: receipt.fileCount,
    archiveBytes: receipt.archiveBytes,
  };
}

export function bindCreatorWorkspaceSnapshotReceiptV1(
  receipt: WorkspaceImmutableSnapshotReceiptV1,
  binding: {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly repositoryRevision: number;
  },
): CreatorWorkspaceSnapshotReceiptV1 {
  if (
    receipt.publicationId !== binding.proposalId ||
    receipt.sourceRevision !== binding.programRevision ||
    receipt.baseRevision !== binding.repositoryRevision
  ) throw new TypeError("Creator Workspace publication binding mismatch");
  return {
    ...receipt,
    proposalId: binding.proposalId,
    programRevision: binding.programRevision,
    baseRepositoryRevision: binding.repositoryRevision,
  };
}

export function admitCreatorWorkspaceSnapshotReceiptV1(
  value: unknown,
): CreatorWorkspaceSnapshotReceiptV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const generic = admitWorkspaceImmutableSnapshotReceiptV1({
    revision: Reflect.get(value, "revision"),
    snapshotId: Reflect.get(value, "snapshotId"),
    programId: Reflect.get(value, "programId"),
    workspaceId: Reflect.get(value, "workspaceId"),
    volumeId: Reflect.get(value, "volumeId"),
    workspaceFormat: Reflect.get(value, "workspaceFormat"),
    publicationId: Reflect.get(value, "publicationId"),
    sourceRevision: Reflect.get(value, "sourceRevision"),
    baseRevision: Reflect.get(value, "baseRevision"),
    checkpointId: Reflect.get(value, "checkpointId"),
    generation: Reflect.get(value, "generation"),
    fileCount: Reflect.get(value, "fileCount"),
    archiveBytes: Reflect.get(value, "archiveBytes"),
  });
  const proposalId = Reflect.get(value, "proposalId");
  const programRevision = Reflect.get(value, "programRevision");
  const baseRepositoryRevision = Reflect.get(value, "baseRepositoryRevision");
  if (
    generic === null || typeof proposalId !== "string" || proposalId.length === 0 ||
    !Number.isSafeInteger(programRevision) || (programRevision as number) <= 0 ||
    !Number.isSafeInteger(baseRepositoryRevision) || (baseRepositoryRevision as number) <= 0 ||
    generic.publicationId !== proposalId || generic.sourceRevision !== programRevision ||
    generic.baseRevision !== baseRepositoryRevision
  ) return null;
  return {
    ...generic,
    proposalId,
    programRevision: programRevision as number,
    baseRepositoryRevision: baseRepositoryRevision as number,
  };
}

export type CreatorWorkspaceReviewStatusV1 = "matches" | "changed" | "unavailable";

/** Creator-owned projection of Catalog review anchors against the mutable Workspace head. */
export interface CreatorWorkspaceReviewProjectionV1 {
  readonly revision: 1;
  readonly latestAccepted: {
    readonly snapshotId: string;
    readonly programRevision: number;
    readonly checkpointId: string;
    readonly generation: number;
    readonly fileCount: number;
    readonly archiveBytes: number;
  } | null;
  readonly pendingReview: {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly checkpointId: string;
    readonly generation: number;
  } | null;
  readonly mutableHead: {
    readonly checkpointId: string;
    readonly generation: number;
  } | null;
  readonly acceptedStatus: CreatorWorkspaceReviewStatusV1 | null;
  readonly pendingStatus: CreatorWorkspaceReviewStatusV1 | null;
}
