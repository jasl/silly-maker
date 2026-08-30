// SPDX-License-Identifier: MIT

import type {
  PreviewProgramV1,
  ProgramProposalReferenceV1,
  ProgramProposalStatusV1,
  ProgramProposalV1,
} from "./contracts.ts";
import {
  admitProgramWorkspaceSnapshotReceiptV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "../workspace/contracts.ts";

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const textEncoderV1 = new TextEncoder();

/** Bounds one Program revision or one catalog page, never total catalog history. */
export const programCatalogOperationalPayloadMaximumBytesV1 = 4 * 1024 * 1024;
/** Every bounded summary is guaranteed to fit, so a page always makes cursor progress. */
export const programCatalogListPageMinimumBytesV1 = 1024;
/** One bounded accepted decision always fits, including its Workspace snapshot receipt. */
export const programCatalogDecisionPageMinimumBytesV1 = 4 * 1024;

export interface ProgramCatalogReviewBindingV1 {
  readonly proposalId: string;
  readonly programId: string;
  readonly programRevision: number;
  readonly baseAcceptedProgramRevision: number | null;
  readonly repositoryRevision: number;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface ProgramCatalogHeadV1 {
  readonly schemaVersion: 1;
  readonly programId: string;
  readonly repositoryRevision: number;
  readonly currentProgramRevision: number;
  readonly proposal: ProgramProposalV1;
  readonly latestAccepted: ProgramProposalReferenceV1 | null;
  readonly workspaceId: string;
  readonly updatedAt: number;
  readonly pendingReviewBinding: ProgramCatalogReviewBindingV1 | null;
}

export interface ProgramCatalogAcceptedDecisionV1 {
  readonly programId: string;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly status: "accepted";
  readonly repositoryRevision: number;
  readonly snapshot: ProgramWorkspaceSnapshotReceiptV1;
}

export interface ProgramCatalogRejectedDecisionV1 {
  readonly programId: string;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly status: "rejected";
  readonly repositoryRevision: number;
}

export type ProgramCatalogDecisionV1 =
  | ProgramCatalogAcceptedDecisionV1
  | ProgramCatalogRejectedDecisionV1;

export interface ProgramCatalogContinuationV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly programRevision: number;
  readonly repositoryRevision: number;
}

export interface ProgramCatalogRecordV1 {
  readonly head: ProgramCatalogHeadV1;
  readonly currentProgram: PreviewProgramV1;
  readonly latestDecision: ProgramCatalogDecisionV1 | null;
}

export interface ProgramCatalogSummaryV1 {
  readonly programId: string;
  readonly name: string;
  readonly kind: PreviewProgramV1["kind"];
  readonly programRevision: number;
  readonly proposalStatus: ProgramProposalStatusV1;
  readonly repositoryRevision: number;
  readonly updatedAt: number;
}

export interface ProgramCatalogListCursorV1 {
  readonly updatedAt: number;
  readonly programId: string;
}

export interface ProgramCatalogListInputV1 {
  readonly before: ProgramCatalogListCursorV1 | null;
  readonly maximumBytes: number;
}

export interface ProgramCatalogListPageV1 {
  readonly summaries: readonly ProgramCatalogSummaryV1[];
  readonly nextCursor: ProgramCatalogListCursorV1 | null;
}

export interface ProgramCatalogAcceptedDecisionListInputV1 {
  readonly programId: string;
  /** Exclusive revision cursor. Null starts at the newest decision. */
  readonly beforeProgramRevision: number | null;
  readonly maximumBytes: number;
}

export interface ProgramCatalogAcceptedDecisionListPageV1 {
  readonly decisions: readonly ProgramCatalogAcceptedDecisionV1[];
  /** Last scanned revision, including rejected rows, when older rows remain. */
  readonly nextCursor: number | null;
}

export interface ProgramCatalogReviewedHeadV1 {
  readonly checkpointId: string;
  readonly generation: number;
}

export interface ProgramCatalogCreateInputV1 {
  readonly commitId: string;
  readonly program: PreviewProgramV1;
  readonly proposalId: string;
  readonly continuation: ProgramCatalogContinuationV1;
  readonly reviewedHead: ProgramCatalogReviewedHeadV1;
  readonly updatedAt: number;
}

export interface ProgramCatalogApplyRevisionInputV1 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedProposal: ProgramProposalReferenceV1;
  readonly commitId: string;
  readonly program: PreviewProgramV1;
  readonly proposalId: string;
  readonly continuation: ProgramCatalogContinuationV1;
  readonly reviewedHead: ProgramCatalogReviewedHeadV1;
  readonly updatedAt: number;
}

interface ProgramCatalogDecideInputBaseV1 {
  readonly programId: string;
  readonly expectedRepositoryRevision: number;
  readonly expectedProposal: ProgramProposalReferenceV1;
  readonly commitId: string;
  readonly continuation: ProgramCatalogContinuationV1;
  readonly updatedAt: number;
}

export type ProgramCatalogDecideInputV1 =
  | (ProgramCatalogDecideInputBaseV1 & {
    readonly status: "accepted";
    readonly snapshotReceipt: ProgramWorkspaceSnapshotReceiptV1;
  })
  | (ProgramCatalogDecideInputBaseV1 & {
    readonly status: "rejected";
  });

export type ProgramCatalogCommitResultV1 =
  | { readonly kind: "committed"; readonly record: ProgramCatalogRecordV1 }
  | { readonly kind: "unchanged"; readonly record: ProgramCatalogRecordV1 }
  | { readonly kind: "conflict"; readonly current: ProgramCatalogRecordV1 | null };

export interface ProgramCatalogRepositoryV1 {
  initialize(): Promise<void>;
  listPrograms(input: ProgramCatalogListInputV1): Promise<ProgramCatalogListPageV1>;
  load(programId: string): Promise<ProgramCatalogRecordV1 | null>;
  loadProgramRevision(programId: string, revision: number): Promise<PreviewProgramV1 | null>;
  loadDecision(
    programId: string,
    proposalId: string,
    programRevision: number,
  ): Promise<ProgramCatalogDecisionV1 | null>;
  loadLatestAcceptedDecision(programId: string): Promise<ProgramCatalogAcceptedDecisionV1 | null>;
  listAcceptedDecisions(
    input: ProgramCatalogAcceptedDecisionListInputV1,
  ): Promise<ProgramCatalogAcceptedDecisionListPageV1>;
  loadContinuation(programId: string): Promise<ProgramCatalogContinuationV1 | null>;
  create(input: ProgramCatalogCreateInputV1): Promise<ProgramCatalogCommitResultV1>;
  applyRevision(
    input: ProgramCatalogApplyRevisionInputV1,
  ): Promise<ProgramCatalogCommitResultV1>;
  decide(input: ProgramCatalogDecideInputV1): Promise<ProgramCatalogCommitResultV1>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function timestampV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function textV1(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function boundedTextV1(value: unknown, maximumBytes: number): value is string {
  return textV1(value) && textEncoderV1.encode(value).byteLength <= maximumBytes;
}

function jsonBytesV1(value: unknown): number {
  return textEncoderV1.encode(JSON.stringify(value)).byteLength;
}

export function clonePreviewProgramForCatalogV1(value: PreviewProgramV1): PreviewProgramV1 {
  if (
    !identifierV1(value.programId) || !positiveIntegerV1(value.revision) ||
    (value.kind !== "translation" && value.kind !== "writing" &&
      value.kind !== "roleplay" && value.kind !== "general") ||
    !boundedTextV1(value.name, 256) || !boundedTextV1(value.purpose, 4_000) ||
    !Array.isArray(value.requirements) || value.requirements.length === 0 ||
    value.requirements.some((entry) => !boundedTextV1(entry, 4_000)) ||
    !Array.isArray(value.suggestedCapabilities) ||
    value.suggestedCapabilities.some((entry) =>
      !identifierV1(entry.capabilityId) || !boundedTextV1(entry.label, 256) ||
      !boundedTextV1(entry.description, 2_048)
    ) ||
    new Set(value.suggestedCapabilities.map((entry) => entry.capabilityId)).size !==
      value.suggestedCapabilities.length ||
    jsonBytesV1(value) > programCatalogOperationalPayloadMaximumBytesV1
  ) throw new TypeError("invalid Preview Program");
  return {
    programId: value.programId,
    revision: value.revision,
    kind: value.kind,
    name: value.name,
    purpose: value.purpose,
    requirements: [...value.requirements],
    suggestedCapabilities: value.suggestedCapabilities.map((entry) => ({
      capabilityId: entry.capabilityId,
      label: entry.label,
      description: entry.description,
    })),
  };
}

export function cloneProgramCatalogContinuationV1(
  value: ProgramCatalogContinuationV1,
): ProgramCatalogContinuationV1 {
  if (
    value.revision !== 1 || !identifierV1(value.programId) ||
    !identifierV1(value.workspaceId) || !identifierV1(value.volumeId) ||
    value.workspaceFormat !== 1 || !positiveIntegerV1(value.programRevision) ||
    !positiveIntegerV1(value.repositoryRevision)
  ) throw new TypeError("invalid Program continuation");
  return {
    revision: 1,
    programId: value.programId,
    workspaceId: value.workspaceId,
    volumeId: value.volumeId,
    workspaceFormat: 1,
    programRevision: value.programRevision,
    repositoryRevision: value.repositoryRevision,
  };
}

export function cloneProgramCatalogReviewBindingV1(
  value: ProgramCatalogReviewBindingV1,
): ProgramCatalogReviewBindingV1 {
  if (
    !identifierV1(value.proposalId) || !identifierV1(value.programId) ||
    !positiveIntegerV1(value.programRevision) ||
    (value.baseAcceptedProgramRevision !== null &&
      !positiveIntegerV1(value.baseAcceptedProgramRevision)) ||
    !positiveIntegerV1(value.repositoryRevision) || !identifierV1(value.workspaceId) ||
    !identifierV1(value.volumeId) || value.workspaceFormat !== 1 ||
    !identifierV1(value.checkpointId) || !positiveIntegerV1(value.generation)
  ) throw new TypeError("invalid Program review binding");
  return {
    proposalId: value.proposalId,
    programId: value.programId,
    programRevision: value.programRevision,
    baseAcceptedProgramRevision: value.baseAcceptedProgramRevision,
    repositoryRevision: value.repositoryRevision,
    workspaceId: value.workspaceId,
    volumeId: value.volumeId,
    workspaceFormat: 1,
    checkpointId: value.checkpointId,
    generation: value.generation,
  };
}

export function cloneProgramCatalogDecisionV1(
  value: ProgramCatalogDecisionV1,
): ProgramCatalogDecisionV1 {
  if (
    !identifierV1(value.programId) || !identifierV1(value.proposalId) ||
    !positiveIntegerV1(value.programRevision) ||
    !positiveIntegerV1(value.repositoryRevision)
  ) throw new TypeError("invalid Program decision");
  if (value.status === "rejected") {
    return {
      programId: value.programId,
      proposalId: value.proposalId,
      programRevision: value.programRevision,
      status: "rejected",
      repositoryRevision: value.repositoryRevision,
    };
  }
  const snapshot = admitProgramWorkspaceSnapshotReceiptV1(value.snapshot);
  if (snapshot === null) throw new TypeError("invalid accepted Program decision");
  return {
    programId: value.programId,
    proposalId: value.proposalId,
    programRevision: value.programRevision,
    status: "accepted",
    repositoryRevision: value.repositoryRevision,
    snapshot,
  };
}

export function cloneProgramCatalogHeadV1(value: ProgramCatalogHeadV1): ProgramCatalogHeadV1 {
  if (
    value.schemaVersion !== 1 || !identifierV1(value.programId) ||
    !positiveIntegerV1(value.repositoryRevision) ||
    !positiveIntegerV1(value.currentProgramRevision) ||
    !identifierV1(value.proposal.proposalId) ||
    value.proposal.programRevision !== value.currentProgramRevision ||
    (value.proposal.status !== "pending" && value.proposal.status !== "accepted" &&
      value.proposal.status !== "rejected") ||
    !identifierV1(value.workspaceId) || !timestampV1(value.updatedAt)
  ) throw new TypeError("invalid Program head");
  const latestAccepted = value.latestAccepted === null ? null : { ...value.latestAccepted };
  if (
    latestAccepted !== null &&
    (!identifierV1(latestAccepted.proposalId) ||
      !positiveIntegerV1(latestAccepted.programRevision) ||
      latestAccepted.programRevision > value.currentProgramRevision ||
      value.proposal.status !== "accepted" &&
        latestAccepted.programRevision === value.currentProgramRevision)
  ) throw new TypeError("invalid latest accepted Program reference");
  const pendingReviewBinding = value.pendingReviewBinding === null
    ? null
    : cloneProgramCatalogReviewBindingV1(value.pendingReviewBinding);
  if (
    (value.proposal.status === "pending") !== (pendingReviewBinding !== null) ||
    (value.proposal.status === "accepted" &&
      (latestAccepted === null || latestAccepted.proposalId !== value.proposal.proposalId ||
        latestAccepted.programRevision !== value.proposal.programRevision)) ||
    (pendingReviewBinding !== null &&
      (pendingReviewBinding.programId !== value.programId ||
        pendingReviewBinding.proposalId !== value.proposal.proposalId ||
        pendingReviewBinding.programRevision !== value.currentProgramRevision ||
        pendingReviewBinding.repositoryRevision !== value.repositoryRevision ||
        pendingReviewBinding.baseAcceptedProgramRevision !==
          (latestAccepted?.programRevision ?? null) ||
        pendingReviewBinding.workspaceId !== value.workspaceId))
  ) throw new TypeError("Program head review binding mismatch");
  return {
    schemaVersion: 1,
    programId: value.programId,
    repositoryRevision: value.repositoryRevision,
    currentProgramRevision: value.currentProgramRevision,
    proposal: {
      proposalId: value.proposal.proposalId,
      programRevision: value.proposal.programRevision,
      status: value.proposal.status,
    },
    latestAccepted: latestAccepted === null ? null : {
      proposalId: latestAccepted.proposalId,
      programRevision: latestAccepted.programRevision,
    },
    workspaceId: value.workspaceId,
    updatedAt: value.updatedAt,
    pendingReviewBinding,
  };
}

export function cloneProgramCatalogRecordV1(value: ProgramCatalogRecordV1): ProgramCatalogRecordV1 {
  const head = cloneProgramCatalogHeadV1(value.head);
  const currentProgram = clonePreviewProgramForCatalogV1(value.currentProgram);
  const latestDecision = value.latestDecision === null
    ? null
    : cloneProgramCatalogDecisionV1(value.latestDecision);
  if (
    currentProgram.programId !== head.programId ||
    currentProgram.revision !== head.currentProgramRevision ||
    (head.proposal.status === "pending") !== (latestDecision === null) ||
    (latestDecision !== null &&
      (latestDecision.programId !== head.programId ||
        latestDecision.proposalId !== head.proposal.proposalId ||
        latestDecision.programRevision !== head.currentProgramRevision ||
        latestDecision.status !== head.proposal.status ||
        latestDecision.repositoryRevision !== head.repositoryRevision))
  ) throw new TypeError("Program catalog record mismatch");
  return { head, currentProgram, latestDecision };
}

export function normalizeProgramCatalogCreateInputV1(
  input: ProgramCatalogCreateInputV1,
): ProgramCatalogCreateInputV1 {
  const program = clonePreviewProgramForCatalogV1(input.program);
  const continuation = cloneProgramCatalogContinuationV1(input.continuation);
  if (
    !identifierV1(input.commitId) || program.revision !== 1 ||
    !identifierV1(input.proposalId) || continuation.programId !== program.programId ||
    continuation.programRevision !== 1 || continuation.repositoryRevision !== 1 ||
    !identifierV1(input.reviewedHead.checkpointId) ||
    !positiveIntegerV1(input.reviewedHead.generation) || !timestampV1(input.updatedAt)
  ) throw new TypeError("invalid Program catalog create");
  return {
    commitId: input.commitId,
    program,
    proposalId: input.proposalId,
    continuation,
    reviewedHead: {
      checkpointId: input.reviewedHead.checkpointId,
      generation: input.reviewedHead.generation,
    },
    updatedAt: input.updatedAt,
  };
}

export function normalizeProgramCatalogApplyRevisionInputV1(
  input: ProgramCatalogApplyRevisionInputV1,
): ProgramCatalogApplyRevisionInputV1 {
  const program = clonePreviewProgramForCatalogV1(input.program);
  const continuation = cloneProgramCatalogContinuationV1(input.continuation);
  if (
    !identifierV1(input.programId) || !positiveIntegerV1(input.expectedRepositoryRevision) ||
    !identifierV1(input.expectedProposal.proposalId) ||
    !positiveIntegerV1(input.expectedProposal.programRevision) ||
    !identifierV1(input.commitId) || !identifierV1(input.proposalId) ||
    program.programId !== input.programId || continuation.programId !== input.programId ||
    !identifierV1(input.reviewedHead.checkpointId) ||
    !positiveIntegerV1(input.reviewedHead.generation) || !timestampV1(input.updatedAt)
  ) throw new TypeError("invalid Program catalog revision");
  return {
    programId: input.programId,
    expectedRepositoryRevision: input.expectedRepositoryRevision,
    expectedProposal: {
      proposalId: input.expectedProposal.proposalId,
      programRevision: input.expectedProposal.programRevision,
    },
    commitId: input.commitId,
    program,
    proposalId: input.proposalId,
    continuation,
    reviewedHead: {
      checkpointId: input.reviewedHead.checkpointId,
      generation: input.reviewedHead.generation,
    },
    updatedAt: input.updatedAt,
  };
}

export function normalizeProgramCatalogDecideInputV1(
  input: ProgramCatalogDecideInputV1,
): ProgramCatalogDecideInputV1 {
  const continuation = cloneProgramCatalogContinuationV1(input.continuation);
  if (
    !identifierV1(input.programId) || !positiveIntegerV1(input.expectedRepositoryRevision) ||
    !identifierV1(input.expectedProposal.proposalId) ||
    !positiveIntegerV1(input.expectedProposal.programRevision) ||
    !identifierV1(input.commitId) || continuation.programId !== input.programId ||
    !timestampV1(input.updatedAt)
  ) throw new TypeError("invalid Program catalog decision");
  if (input.status === "accepted") {
    const snapshotReceipt = admitProgramWorkspaceSnapshotReceiptV1(input.snapshotReceipt);
    if (snapshotReceipt === null) throw new TypeError("invalid Program decision receipt");
    return {
      programId: input.programId,
      expectedRepositoryRevision: input.expectedRepositoryRevision,
      expectedProposal: {
        proposalId: input.expectedProposal.proposalId,
        programRevision: input.expectedProposal.programRevision,
      },
      commitId: input.commitId,
      continuation,
      updatedAt: input.updatedAt,
      status: "accepted",
      snapshotReceipt,
    };
  }
  return {
    programId: input.programId,
    expectedRepositoryRevision: input.expectedRepositoryRevision,
    expectedProposal: {
      proposalId: input.expectedProposal.proposalId,
      programRevision: input.expectedProposal.programRevision,
    },
    commitId: input.commitId,
    continuation,
    updatedAt: input.updatedAt,
    status: "rejected",
  };
}

export function normalizeProgramCatalogListInputV1(
  input: ProgramCatalogListInputV1,
): ProgramCatalogListInputV1 {
  if (
    !positiveIntegerV1(input.maximumBytes) ||
    input.maximumBytes < programCatalogListPageMinimumBytesV1 ||
    input.maximumBytes > programCatalogOperationalPayloadMaximumBytesV1 ||
    (input.before !== null &&
      (!timestampV1(input.before.updatedAt) || !identifierV1(input.before.programId)))
  ) throw new TypeError("invalid Program catalog list input");
  return {
    before: input.before === null ? null : { ...input.before },
    maximumBytes: input.maximumBytes,
  };
}

export function normalizeProgramCatalogAcceptedDecisionListInputV1(
  input: ProgramCatalogAcceptedDecisionListInputV1,
): ProgramCatalogAcceptedDecisionListInputV1 {
  if (
    !identifierV1(input.programId) ||
    (input.beforeProgramRevision !== null &&
      !positiveIntegerV1(input.beforeProgramRevision)) ||
    !positiveIntegerV1(input.maximumBytes) ||
    input.maximumBytes < programCatalogDecisionPageMinimumBytesV1 ||
    input.maximumBytes > programCatalogOperationalPayloadMaximumBytesV1
  ) throw new TypeError("invalid accepted Program decision list input");
  return {
    programId: input.programId,
    beforeProgramRevision: input.beforeProgramRevision,
    maximumBytes: input.maximumBytes,
  };
}

export function normalizeProgramCatalogProgramIdV1(value: string): string {
  if (!identifierV1(value)) throw new TypeError("invalid Program id");
  return value;
}

export function normalizeProgramCatalogProposalIdV1(value: string): string {
  if (!identifierV1(value)) throw new TypeError("invalid Program proposal id");
  return value;
}

export function normalizeProgramCatalogRevisionV1(value: number): number {
  if (!positiveIntegerV1(value)) throw new TypeError("invalid Program revision");
  return value;
}
