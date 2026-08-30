// SPDX-License-Identifier: MIT

import type {
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalApplyResultV1,
  CreatorAgentTerminalRunV1,
  CreatorFollowUpResultV1,
  CreatorProposalDecisionResultV1,
  CreatorSubmitResultV1,
  ProgramProposalReferenceV1,
  CreatorPreviewPortV1,
} from "./contracts.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  creatorAgentTextMaximumCharactersV1,
} from "./contracts.ts";
import { admitCreatorProgramRevisionCandidateV1 } from "./creator-agent-admission.ts";
import { createDeterministicFakeCreatorV1 } from "./fake-creator.ts";
import {
  programCatalogOperationalPayloadMaximumBytesV1,
  type ProgramCatalogListCursorV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogSummaryV1,
} from "./program-catalog-repository.ts";
import {
  isProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
  type ProgramProcessCompositeCommitResultV1,
  type ProgramProcessCreateCompositeCommitResultV1,
  type ProgramProcessExecutionCompositeCommitResultV1,
} from "./program-data-repository.ts";
import {
  builtinCreatorProgramIdV1,
  createBuiltinCreatorProgramDefinitionRevisionV1,
  operationalStructuredPayloadMaximumBytesV1,
  type ProcessHeadV1,
  type ProgramDefinitionRevisionV1,
  type TranscriptEntryV1,
  type TranscriptPageV1,
  type ProcessCheckpointV1,
} from "./program-process-repository.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";
import type {
  BrowserProgramWorkspaceApplyRevisionInputV1,
  BrowserProgramWorkspaceApplyAgentRevisionInputV1,
  BrowserProgramWorkspaceCreateInputV1,
  BrowserProgramWorkspaceDecideInputV1,
} from "./browser-program-workspace-authority.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseV1,
  ProcessExecutionTerminalInputV1,
} from "./process-execution-repository.ts";

export type CreatorDurabilityOperationV1 =
  | "catalog"
  | "catalog_more"
  | "open"
  | "transcript_older"
  | "transcript_restore"
  | "create"
  | "revision"
  | "decision"
  | "agent_run";

export type CreatorDurabilityStateV1 =
  | { readonly phase: "ready" }
  | {
    readonly phase: "saving";
    readonly operation: "create" | "revision" | "decision" | "agent_run";
  }
  | {
    readonly phase: "failed";
    readonly operation: CreatorDurabilityOperationV1;
    readonly code: string;
    readonly recovery: "retry" | null;
  }
  | { readonly phase: "disposed" };

export interface CreatorProgramCatalogProjectionV1 {
  readonly phase: "loading" | "loading_more" | "ready" | "failed";
  readonly summaries: readonly ProgramCatalogSummaryV1[];
  readonly nextCursor: ProgramCatalogListCursorV1 | null;
}

export interface CreatorTranscriptWindowProjectionV1 {
  /** Chronological entries in the currently mounted window only. */
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
  /** True when a newer page was evicted to keep the mounted window bounded. */
  readonly newerOmitted: boolean;
  readonly phase: "loading" | "loading_older" | "ready" | "failed";
}

export interface CreatorActiveProcessProjectionV1 {
  readonly process: ProcessHeadV1;
  readonly definition: ProgramDefinitionRevisionV1;
  readonly subject: ProgramCatalogRecordV1 | null;
  readonly transcript: CreatorTranscriptWindowProjectionV1;
  readonly workspaceReview: ProgramWorkspaceReviewProjectionV1 | null;
}

export interface CreatorControllerSnapshotV1 {
  readonly revision: number;
  readonly route: "home" | "process_loading" | "process";
  readonly catalog: CreatorProgramCatalogProjectionV1;
  readonly activeProcess: CreatorActiveProcessProjectionV1 | null;
  readonly durability: CreatorDurabilityStateV1;
}

export type CreatorControllerResultV1<T> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "busy" }
  | { readonly kind: "failed"; readonly code: string };

export type CreatorAgentRunPreparationResultV1 =
  | { readonly kind: "prepared"; readonly run: CreatorAgentRunRequestV1 }
  | { readonly kind: "rejected"; readonly reason: "empty_message" | "message_too_long" }
  | { readonly kind: "unavailable" };

export type CreatorAgentLeaseRenewalResultV1 = "renewed" | "lost" | "idle";

export interface CreatorControllerV1 {
  getSnapshot(): CreatorControllerSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  loadMorePrograms(): Promise<CreatorControllerResultV1<boolean>>;
  openProgram(programId: string): Promise<CreatorControllerResultV1<boolean>>;
  openProcess(processId: string): Promise<CreatorControllerResultV1<boolean>>;
  loadOlderTranscript(): Promise<CreatorControllerResultV1<boolean>>;
  restoreTranscriptAround(sequence: number): Promise<CreatorControllerResultV1<boolean>>;
  reloadLatestTranscript(): Promise<CreatorControllerResultV1<boolean>>;
  /** Refreshes the routed Process in place so passive tabs can invalidate stale projections. */
  refreshActiveProcess(): Promise<CreatorControllerResultV1<boolean>>;
  submitIntent(intent: string): Promise<CreatorControllerResultV1<CreatorSubmitResultV1>>;
  sendFollowUp(text: string): Promise<CreatorControllerResultV1<CreatorFollowUpResultV1>>;
  prepareAgentRun(
    text: string,
  ): Promise<CreatorControllerResultV1<CreatorAgentRunPreparationResultV1>>;
  retryInterruptedAgentRun(): Promise<
    CreatorControllerResultV1<CreatorAgentRunPreparationResultV1>
  >;
  renewAgentRunLease(
    run: CreatorAgentRunRequestV1,
  ): Promise<CreatorControllerResultV1<CreatorAgentLeaseRenewalResultV1>>;
  recordAgentRunTerminal(
    terminal: CreatorAgentTerminalRunV1,
  ): Promise<CreatorControllerResultV1<CreatorAgentTerminalApplyResultV1>>;
  acceptProposal(
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>>;
  rejectProposal(
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>>;
  openHome(): Promise<boolean>;
  retry(): Promise<boolean>;
  dispose(): Promise<void>;
}

export interface CreatorControllerBudgetsV1 {
  readonly programCatalogPageMaximumBytes: number;
  readonly processSummaryPageMaximumBytes: number;
  readonly transcriptPageMaximumBytes: number;
  readonly transcriptWindowMaximumBytes: number;
}

export interface CreatorControllerWorkspacePortV1 {
  inspectProgramWorkspace(
    programId: string,
    options?: { readonly hostAccess?: "required" | "active_only" },
  ): Promise<ProgramWorkspaceReviewProjectionV1 | null>;
  closeActiveWorkspace(): Promise<unknown>;
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
}

interface TranscriptWindowPageV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
}

interface TranscriptWindowV1 {
  readonly processId: string;
  readonly pages: readonly TranscriptWindowPageV1[];
  readonly newerOmitted: boolean;
}

type RetryCommandV1 = () => Promise<boolean>;

/**
 * UI working-set budgets, not semantic history limits. Durable rows remain
 * pageable without a total ceiling; the mounted Conversation keeps three
 * ordinary pages so prepending one page cannot evict the user's current anchor.
 */
const creatorDefaultListPageMaximumBytesV1 = 128 * 1_024;
const creatorDefaultTranscriptPageMaximumBytesV1 = 128 * 1_024;
const creatorDefaultTranscriptWindowMaximumBytesV1 = creatorDefaultTranscriptPageMaximumBytesV1 * 3;

/**
 * A foreground owner renews every ten seconds and therefore gets three missed
 * renewal opportunities before another page may recover the Process. Browser
 * suspension may still exceed this window; correctness comes from fencing,
 * not from timer delivery.
 */
export const creatorProcessExecutionLeaseDurationMillisecondsV1 = 30_000;
export const creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1 =
  creatorProcessExecutionLeaseDurationMillisecondsV1 / 3;

const defaultBudgetsV1: CreatorControllerBudgetsV1 = {
  programCatalogPageMaximumBytes: creatorDefaultListPageMaximumBytesV1,
  processSummaryPageMaximumBytes: creatorDefaultListPageMaximumBytesV1,
  transcriptPageMaximumBytes: creatorDefaultTranscriptPageMaximumBytesV1,
  transcriptWindowMaximumBytes: creatorDefaultTranscriptWindowMaximumBytesV1,
};

export const creatorIntentMaximumCharactersV1 = creatorAgentTextMaximumCharactersV1;

function usesChineseV1(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function transcriptTextEntryV1(input: {
  readonly processId: string;
  readonly sequence: number;
  readonly entryId: string;
  readonly role: TranscriptEntryV1["role"];
  readonly text: string;
  readonly state?: TranscriptEntryV1["state"];
}): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId: input.processId,
    sequence: input.sequence,
    entryId: input.entryId,
    role: input.role,
    state: input.state ?? "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${input.entryId}.text`,
      markdown: input.text,
    }],
  };
}

function decisionMessageV1(
  status: "accepted" | "rejected",
  programRevision: number,
  chinese: boolean,
): string {
  if (status === "accepted") {
    return chinese
      ? `方案 v${String(programRevision)} 已接受。你可以继续补充要求，形成新的待审版本。`
      : `Proposal v${
        String(programRevision)
      } accepted. Follow-up requests will create a new revision for review.`;
  }
  return chinese
    ? `方案 v${
      String(programRevision)
    } 已拒绝。你可以补充背景，形成新的待审版本，或者返回首页重新开始。`
    : `Proposal v${
      String(programRevision)
    } rejected. Add context to create a new revision for review, or return home to start again.`;
}

function terminalMessageV1(terminal: CreatorAgentTerminalRunV1): {
  readonly text: string;
  readonly state: TranscriptEntryV1["state"];
} {
  if (terminal.outcome === "completed") {
    return { text: terminal.finalAssistantReply.trim(), state: "committed" };
  }
  if (terminal.outcome === "failed") {
    return {
      text:
        `Creator Agent run failed (${terminal.diagnosticCode}). The committed request remains in this Process.`,
      state: "committed",
    };
  }
  return {
    text: terminal.outcome === "cancelled"
      ? "Creator Agent run was cancelled. The committed request remains in this Process."
      : "Creator Agent run was replaced. The committed request remains in this Process.",
    state: "committed",
  };
}

function effectiveAgentTerminalV1(
  terminal: CreatorAgentTerminalRunV1,
): CreatorAgentTerminalRunV1 {
  if (terminal.outcome !== "completed") return terminal;
  const candidate = admitCreatorProgramRevisionCandidateV1(terminal.candidate);
  if (candidate.kind === "rejected") {
    return {
      run: terminal.run,
      outcome: "failed",
      diagnosticCode: "candidate_invalid",
    };
  }
  if (
    terminal.finalAssistantReply.trim().length === 0 ||
    terminal.finalAssistantReply.length > creatorAgentFinalReplyMaximumCharactersV1 ||
    candidate.value.proposalId !== terminal.run.proposalId ||
    candidate.value.programId !== terminal.run.programId ||
    candidate.value.baseProgramRevision !== terminal.run.baseProgramRevision ||
    candidate.value.text !== terminal.run.text
  ) {
    return {
      run: terminal.run,
      outcome: "failed",
      diagnosticCode: "protocol_invalid",
    };
  }
  return terminal;
}

function triggerTextV1(entry: TranscriptEntryV1): string | null {
  if (entry.role !== "user" || entry.state !== "committed" || entry.parts.length !== 1) {
    return null;
  }
  const part = entry.parts[0];
  if (part?.kind !== "text_markdown") return null;
  const text = part.markdown.trim();
  return text.length > 0 && text.length <= creatorAgentTextMaximumCharactersV1 ? text : null;
}

function positiveSafeIntegerV1(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateBudgetsV1(
  input: CreatorControllerBudgetsV1 | undefined,
): CreatorControllerBudgetsV1 {
  const budgets = input ?? defaultBudgetsV1;
  if (
    !positiveSafeIntegerV1(budgets.programCatalogPageMaximumBytes) ||
    budgets.programCatalogPageMaximumBytes > programCatalogOperationalPayloadMaximumBytesV1 ||
    !positiveSafeIntegerV1(budgets.processSummaryPageMaximumBytes) ||
    budgets.processSummaryPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !positiveSafeIntegerV1(budgets.transcriptPageMaximumBytes) ||
    budgets.transcriptPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !positiveSafeIntegerV1(budgets.transcriptWindowMaximumBytes) ||
    budgets.transcriptWindowMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    budgets.transcriptWindowMaximumBytes < budgets.transcriptPageMaximumBytes
  ) throw new TypeError("sillyos.creator_controller.invalid_budgets");
  return { ...budgets };
}

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0 && code.length <= 128) return code;
  }
  return "repository_failed";
}

function transcriptPageV1(page: TranscriptPageV1): TranscriptWindowPageV1 {
  return {
    entries: page.entries,
    byteLength: page.byteLength,
    nextBeforeSequence: page.nextBeforeSequence,
  };
}

function transcriptProjectionV1(
  window: TranscriptWindowV1,
  phase: CreatorTranscriptWindowProjectionV1["phase"],
): CreatorTranscriptWindowProjectionV1 {
  return {
    entries: window.pages.flatMap((page) => page.entries),
    byteLength: window.pages.reduce((sum, page) => sum + page.byteLength, 0),
    nextBeforeSequence: window.pages[0]?.nextBeforeSequence ?? null,
    newerOmitted: window.newerOmitted,
    phase,
  };
}

function prependTranscriptPageV1(input: {
  readonly current: TranscriptWindowV1;
  readonly page: TranscriptPageV1;
  readonly maximumBytes: number;
}): TranscriptWindowV1 {
  const pages = [transcriptPageV1(input.page), ...input.current.pages];
  let byteLength = pages.reduce((sum, page) => sum + page.byteLength, 0);
  let newerOmitted = input.current.newerOmitted;
  while (pages.length > 1 && byteLength > input.maximumBytes) {
    const removed = pages.pop();
    if (removed !== undefined) byteLength -= removed.byteLength;
    newerOmitted = true;
  }
  return { processId: input.current.processId, pages, newerOmitted };
}

function activeWithTranscriptV1(
  active: CreatorActiveProcessProjectionV1,
  transcript: CreatorTranscriptWindowProjectionV1,
): CreatorActiveProcessProjectionV1 {
  return { ...active, transcript };
}

export function createCreatorControllerV1(input: {
  readonly repository: ProgramDataRepositoryV1;
  readonly workspace: CreatorControllerWorkspacePortV1;
  readonly creator?: CreatorPreviewPortV1;
  readonly createId?: (purpose: string) => string;
  readonly now?: () => number;
  readonly budgets?: CreatorControllerBudgetsV1;
  readonly ownerInstanceId?: string;
  readonly processExecutionLeaseDurationMilliseconds?: number;
}): CreatorControllerV1 {
  const repository = input.repository;
  const creator = input.creator ?? createDeterministicFakeCreatorV1();
  const now = input.now ?? Date.now;
  let fallbackId = 0;
  const createId = input.createId ?? ((purpose: string): string => {
    fallbackId += 1;
    const random = typeof crypto === "undefined" || typeof crypto.randomUUID !== "function"
      ? String(fallbackId)
      : crypto.randomUUID();
    return `local.${purpose}.${random}`;
  });
  const ownerInstanceId = input.ownerInstanceId ?? createId("process-owner");
  const processExecutionLeaseDurationMilliseconds =
    input.processExecutionLeaseDurationMilliseconds ??
      creatorProcessExecutionLeaseDurationMillisecondsV1;
  if (
    !Number.isSafeInteger(processExecutionLeaseDurationMilliseconds) ||
    processExecutionLeaseDurationMilliseconds <= 0
  ) throw new TypeError("invalid Process execution lease duration");
  const budgets = validateBudgetsV1(input.budgets);
  const listeners = new Set<() => void>();
  let disposed = false;
  let retryCommand: RetryCommandV1 | null = null;
  let catalogEpoch = 0;
  let processEpoch = 0;
  let transcriptEpoch = 0;
  let ownedExecutionLease: ProcessExecutionLeaseV1 | null = null;
  let executionOperationTail: Promise<void> = Promise.resolve();
  let terminalizingAttemptId: string | null = null;
  let transcriptWindow: TranscriptWindowV1 | null = null;
  let snapshot: CreatorControllerSnapshotV1 = {
    revision: 0,
    route: "home",
    catalog: { phase: "loading", summaries: [], nextCursor: null },
    activeProcess: null,
    durability: { phase: "ready" },
  };

  const serializeExecutionOperationV1 = <T>(operation: () => Promise<T>): Promise<T> => {
    const settlement = executionOperationTail.then(operation);
    executionOperationTail = settlement.then(() => undefined, () => undefined);
    return settlement;
  };

  const leaseExpirationV1 = (observedAt: number): number => {
    const expiresAt = observedAt + processExecutionLeaseDurationMilliseconds;
    if (!Number.isSafeInteger(expiresAt)) {
      throw new TypeError("invalid Process execution lease expiration");
    }
    return expiresAt;
  };

  const leaseMatchesRunV1 = (
    lease: ProcessExecutionLeaseV1,
    run: CreatorAgentRunRequestV1,
  ): boolean =>
    lease.ownerInstanceId === ownerInstanceId && lease.processId === run.processId &&
    lease.attemptId === run.agentRunId && lease.generation === run.processAttemptGeneration;

  const publish = (next: Omit<CreatorControllerSnapshotV1, "revision">): void => {
    if (disposed) return;
    snapshot = { revision: snapshot.revision + 1, ...next };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Observers cannot change Controller publication precedence.
      }
    }
  };

  const publishCatalog = (catalog: CreatorProgramCatalogProjectionV1): void => {
    publish({
      route: snapshot.route,
      catalog,
      activeProcess: snapshot.activeProcess,
      durability: snapshot.durability,
    });
  };

  const fail = (
    operation: CreatorDurabilityOperationV1,
    code: string,
    recovery: "retry" | null,
    retry: RetryCommandV1 | null,
  ): CreatorControllerResultV1<never> => {
    retryCommand = retry;
    if (!disposed) {
      publish({
        route: snapshot.route,
        catalog: operation === "catalog" || operation === "catalog_more"
          ? { ...snapshot.catalog, phase: "failed" }
          : snapshot.catalog,
        activeProcess: snapshot.activeProcess,
        durability: { phase: "failed", operation, code, recovery },
      });
    }
    return { kind: "failed", code };
  };

  const loadInitialCatalogV1 = async (): Promise<void> => {
    if (disposed) return;
    const epoch = ++catalogEpoch;
    retryCommand = null;
    publishCatalog({ phase: "loading", summaries: [], nextCursor: null });
    try {
      await repository.initialize();
      const creatorDefinition = await repository.publishProgramDefinitionRevision(
        createBuiltinCreatorProgramDefinitionRevisionV1(),
      );
      if (creatorDefinition.kind === "conflict") {
        throw new TypeError("sillyos.creator_controller.creator_definition_conflict");
      }
      const page = await repository.listPrograms({
        before: null,
        maximumBytes: budgets.programCatalogPageMaximumBytes,
      });
      if (disposed || epoch !== catalogEpoch) return;
      publish({
        route: snapshot.route,
        catalog: {
          phase: "ready",
          summaries: page.summaries,
          nextCursor: page.nextCursor,
        },
        activeProcess: snapshot.activeProcess,
        durability: { phase: "ready" },
      });
    } catch (error) {
      if (disposed || epoch !== catalogEpoch) return;
      fail("catalog", failureCodeV1(error), "retry", async () => {
        await loadInitialCatalogV1();
        return snapshot.catalog.phase === "ready";
      });
    }
  };

  const loadMoreProgramsV1 = async (): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.catalog.phase === "loading" || snapshot.catalog.phase === "loading_more") {
      return { kind: "busy" };
    }
    const before = snapshot.catalog.nextCursor;
    if (before === null) return { kind: "completed", value: false };
    const epoch = ++catalogEpoch;
    const predecessor = snapshot.catalog;
    retryCommand = null;
    publishCatalog({ ...predecessor, phase: "loading_more" });
    try {
      const page = await repository.listPrograms({
        before,
        maximumBytes: budgets.programCatalogPageMaximumBytes,
      });
      if (disposed || epoch !== catalogEpoch) return { kind: "failed", code: "superseded" };
      const known = new Set(predecessor.summaries.map((summary) => summary.programId));
      const appended = page.summaries.filter((summary) => !known.has(summary.programId));
      publish({
        route: snapshot.route,
        catalog: {
          phase: "ready",
          summaries: [...predecessor.summaries, ...appended],
          nextCursor: page.nextCursor,
        },
        activeProcess: snapshot.activeProcess,
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: appended.length > 0 };
    } catch (error) {
      if (disposed || epoch !== catalogEpoch) return { kind: "failed", code: "superseded" };
      return fail("catalog_more", failureCodeV1(error), "retry", async () => {
        const result = await loadMoreProgramsV1();
        return result.kind === "completed";
      });
    }
  };

  const settleExpiredAttemptV1 = async (
    process: ProcessHeadV1,
    lease: ProcessExecutionLeaseV1,
    review: ProgramWorkspaceReviewProjectionV1 | null,
  ): Promise<ProcessHeadV1> => {
    const attempt = process.activeAttempt;
    if (
      attempt === null || lease.processId !== process.processId ||
      lease.attemptId !== attempt.attemptId || lease.generation !== attempt.generation
    ) return process;
    const mutableHead = review?.mutableHead ?? null;
    const retryable = mutableHead !== null &&
      mutableHead.checkpointId === attempt.startingCheckpoint.workspaceCheckpointId &&
      mutableHead.generation === attempt.startingCheckpoint.workspaceGeneration;
    const terminalSequence = process.transcriptFrontier + 1;
    const entryId = `${attempt.attemptId}.interrupted`;
    const entry = transcriptTextEntryV1({
      processId: process.processId,
      sequence: terminalSequence,
      entryId,
      role: "system",
      state: "interrupted_partial",
      text: retryable
        ? "The previous Creator run was interrupted. Its committed request can be retried from the last durable Workspace checkpoint."
        : "The previous Creator run was interrupted after its durable Workspace evidence changed or became unavailable. SillyOS will not replay it automatically.",
    });
    const observedAt = Math.max(now(), lease.expiresAt, process.updatedAt);
    const terminalInput: ProcessExecutionTerminalInputV1 = {
      lease,
      observedAt,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        commitId: `${attempt.attemptId}.terminal`,
        attemptBinding: { attemptId: attempt.attemptId, generation: attempt.generation },
        entries: [entry],
        checkpoint: null,
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: process.processId,
          attemptId: attempt.attemptId,
          generation: attempt.generation,
          outcome: "interrupted",
          terminalSequence,
          terminalEntryId: entryId,
          interruptionDisposition: retryable ? "retryable" : "unrecoverable",
        },
        updatedAt: observedAt,
      },
    };
    try {
      const settled = await repository.commitProcessExecutionTerminal(terminalInput);
      if (settled.kind !== "conflict") return settled.process;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation({
        operation: "execution_terminal",
        input: terminalInput,
      });
      if (queried.kind === "committed") {
        const committed = await repository.loadProcess(process.processId);
        if (committed !== null) return committed;
      }
      if (queried.kind === "mismatch") {
        throw new TypeError("sillyos.creator_controller.interrupted_operation_mismatch", {
          cause: error,
        });
      }
      throw error;
    }
    const current = await repository.loadProcess(process.processId);
    if (current !== null && current.activeAttempt === null) return current;
    throw new TypeError("sillyos.creator_controller.interrupted_attempt_conflict");
  };

  const openProcessAtEpochV1 = async (
    processId: string,
    epoch: number,
  ): Promise<CreatorControllerResultV1<boolean>> => {
    try {
      let process = await repository.loadProcess(processId);
      if (disposed || epoch !== processEpoch) return { kind: "failed", code: "superseded" };
      if (process === null) return fail("open", "process_not_found", null, null);
      const [definition, subject, executionLease, passiveWorkspaceReview] = await Promise.all([
        repository.loadProgramDefinitionRevision(
          process.programDefinition.programId,
          process.programDefinition.revision,
        ),
        process.subjectProgramId === null
          ? Promise.resolve(null)
          : repository.load(process.subjectProgramId),
        process.activeAttempt === null
          ? Promise.resolve(null)
          : repository.loadProcessExecutionLease(process.processId),
        process.subjectProgramId === null
          ? Promise.resolve(null)
          : input.workspace.inspectProgramWorkspace(process.subjectProgramId, {
            hostAccess: "active_only",
          }),
      ]);
      if (disposed || epoch !== processEpoch) return { kind: "failed", code: "superseded" };
      if (definition === null) return fail("open", "program_definition_not_found", null, null);
      if (process.subjectProgramId !== null && subject === null) {
        return fail("open", "subject_program_not_found", null, null);
      }
      let workspaceReview = passiveWorkspaceReview;
      if (
        process.activeAttempt !== null && executionLease !== null &&
        executionLease.expiresAt <= now() && process.subjectProgramId !== null
      ) {
        try {
          workspaceReview = await input.workspace.inspectProgramWorkspace(
            process.subjectProgramId,
            { hostAccess: "required" },
          );
          process = await settleExpiredAttemptV1(process, executionLease, workspaceReview);
        } catch (error) {
          const code = failureCodeV1(error);
          if (code !== "workspace_busy" && code !== "volume_busy") throw error;
          // A frozen predecessor may still own the orthogonal Workspace volume.
          // Keep this Process readable and recovery-pending until that owner exits.
        }
      }
      const page = await repository.loadTranscriptPage({
        processId,
        beforeSequence: null,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      if (page === null) return fail("open", "process_transcript_not_found", null, null);
      transcriptWindow = {
        processId,
        pages: [transcriptPageV1(page)],
        newerOmitted: false,
      };
      retryCommand = null;
      publish({
        route: "process",
        catalog: snapshot.catalog,
        activeProcess: {
          process,
          definition,
          subject,
          transcript: transcriptProjectionV1(transcriptWindow, "ready"),
          workspaceReview,
        },
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || epoch !== processEpoch) return { kind: "failed", code: "superseded" };
      return fail("open", failureCodeV1(error), "retry", async () => {
        const result = await openProcessV1(processId);
        return result.kind === "completed";
      });
    }
  };

  const beginProcessLoadV1 = (): number => {
    const epoch = ++processEpoch;
    transcriptEpoch += 1;
    transcriptWindow = null;
    retryCommand = null;
    publish({
      route: "process_loading",
      catalog: snapshot.catalog,
      activeProcess: null,
      durability: { phase: "ready" },
    });
    return epoch;
  };

  const openProcessV1 = async (
    processId: string,
  ): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    return await openProcessAtEpochV1(processId, beginProcessLoadV1());
  };

  const openProgramV1 = async (
    programId: string,
  ): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const epoch = beginProcessLoadV1();
    try {
      const page = await repository.listProcessSummaries({
        subjectProgramId: programId,
        before: null,
        maximumBytes: budgets.processSummaryPageMaximumBytes,
      });
      if (disposed || epoch !== processEpoch) return { kind: "failed", code: "superseded" };
      const process = page.summaries[0];
      if (process === undefined) return fail("open", "process_not_found", null, null);
      return await openProcessAtEpochV1(process.processId, epoch);
    } catch (error) {
      if (disposed || epoch !== processEpoch) return { kind: "failed", code: "superseded" };
      return fail("open", failureCodeV1(error), "retry", async () => {
        const result = await openProgramV1(programId);
        return result.kind === "completed";
      });
    }
  };

  const loadOlderTranscriptV1 = async (): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    const currentWindow = transcriptWindow;
    if (
      snapshot.route !== "process" || active === null || currentWindow === null ||
      currentWindow.processId !== active.process.processId
    ) return { kind: "completed", value: false };
    if (active.transcript.phase === "loading_older") return { kind: "busy" };
    const beforeSequence = active.transcript.nextBeforeSequence;
    if (beforeSequence === null) return { kind: "completed", value: false };
    const epoch = ++transcriptEpoch;
    publish({
      route: "process",
      catalog: snapshot.catalog,
      activeProcess: activeWithTranscriptV1(
        active,
        transcriptProjectionV1(currentWindow, "loading_older"),
      ),
      durability: snapshot.durability,
    });
    try {
      const page = await repository.loadTranscriptPage({
        processId: active.process.processId,
        beforeSequence,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      if (
        disposed || epoch !== transcriptEpoch || snapshot.activeProcess?.process.processId !==
          active.process.processId
      ) return { kind: "failed", code: "superseded" };
      if (page === null) {
        retryCommand = null;
        publish({
          route: "process",
          catalog: snapshot.catalog,
          activeProcess: activeWithTranscriptV1(
            active,
            transcriptProjectionV1(currentWindow, "failed"),
          ),
          durability: {
            phase: "failed",
            operation: "transcript_older",
            code: "process_transcript_not_found",
            recovery: null,
          },
        });
        return { kind: "failed", code: "process_transcript_not_found" };
      }
      transcriptWindow = prependTranscriptPageV1({
        current: currentWindow,
        page,
        maximumBytes: budgets.transcriptWindowMaximumBytes,
      });
      publish({
        route: "process",
        catalog: snapshot.catalog,
        activeProcess: activeWithTranscriptV1(
          active,
          transcriptProjectionV1(transcriptWindow, "ready"),
        ),
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: page.entries.length > 0 };
    } catch (error) {
      if (disposed || epoch !== transcriptEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      publish({
        route: "process",
        catalog: snapshot.catalog,
        activeProcess: activeWithTranscriptV1(
          active,
          transcriptProjectionV1(currentWindow, "failed"),
        ),
        durability: {
          phase: "failed",
          operation: "transcript_older",
          code,
          recovery: "retry",
        },
      });
      retryCommand = async () => {
        const result = await loadOlderTranscriptV1();
        return result.kind === "completed";
      };
      return { kind: "failed", code };
    }
  };

  const restoreTranscriptAroundV1 = async (
    sequence: number,
  ): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (!Number.isSafeInteger(sequence) || sequence < 1) {
      return { kind: "completed", value: false };
    }
    const active = snapshot.activeProcess;
    const currentWindow = transcriptWindow;
    if (
      snapshot.route !== "process" || active === null || currentWindow === null ||
      currentWindow.processId !== active.process.processId ||
      sequence > active.process.transcriptFrontier
    ) return { kind: "completed", value: false };
    if (active.transcript.entries.some((entry) => entry.sequence === sequence)) {
      return { kind: "completed", value: true };
    }
    const epoch = ++transcriptEpoch;
    publish({
      route: "process",
      catalog: snapshot.catalog,
      activeProcess: activeWithTranscriptV1(
        active,
        transcriptProjectionV1(currentWindow, "loading"),
      ),
      durability: snapshot.durability,
    });
    try {
      const page = await repository.loadTranscriptPage({
        processId: active.process.processId,
        beforeSequence: sequence < active.process.transcriptFrontier ? sequence + 1 : null,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      if (
        disposed || epoch !== transcriptEpoch || snapshot.activeProcess?.process.processId !==
          active.process.processId
      ) return { kind: "failed", code: "superseded" };
      if (page === null || !page.entries.some((entry) => entry.sequence === sequence)) {
        publish({
          route: "process",
          catalog: snapshot.catalog,
          activeProcess: activeWithTranscriptV1(
            active,
            transcriptProjectionV1(currentWindow, "ready"),
          ),
          durability: { phase: "ready" },
        });
        return { kind: "completed", value: false };
      }
      const newest = page.entries.at(-1);
      transcriptWindow = {
        processId: active.process.processId,
        pages: [transcriptPageV1(page)],
        newerOmitted: newest !== undefined && newest.sequence < active.process.transcriptFrontier,
      };
      publish({
        route: "process",
        catalog: snapshot.catalog,
        activeProcess: activeWithTranscriptV1(
          active,
          transcriptProjectionV1(transcriptWindow, "ready"),
        ),
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || epoch !== transcriptEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      retryCommand = null;
      publish({
        route: "process",
        catalog: snapshot.catalog,
        activeProcess: activeWithTranscriptV1(
          active,
          transcriptProjectionV1(currentWindow, "ready"),
        ),
        durability: {
          phase: "failed",
          operation: "transcript_restore",
          code,
          recovery: null,
        },
      });
      return { kind: "failed", code };
    }
  };

  const publishSavingV1 = (
    operation: Extract<
      CreatorDurabilityOperationV1,
      "create" | "revision" | "decision" | "agent_run"
    >,
  ): void => {
    retryCommand = null;
    publish({
      route: snapshot.route,
      catalog: snapshot.catalog,
      activeProcess: snapshot.activeProcess,
      durability: { phase: "saving", operation },
    });
  };

  const refreshCatalogV1 = async (): Promise<void> => {
    const page = await repository.listPrograms({
      before: null,
      maximumBytes: budgets.programCatalogPageMaximumBytes,
    });
    if (disposed) return;
    publish({
      route: snapshot.route,
      catalog: { phase: "ready", summaries: page.summaries, nextCursor: page.nextCursor },
      activeProcess: snapshot.activeProcess,
      durability: { phase: "ready" },
    });
  };

  const refreshProcessIfCurrentV1 = async (processId: string): Promise<void> => {
    if (snapshot.activeProcess?.process.processId === processId) {
      // A mutation refreshes the already-routed Process in place. Publishing
      // `process_loading` here would transiently remove the route-owned
      // Program/Workspace identity, causing the Browser Pi workspace effect to
      // close and reopen the execution session between durable attempt
      // admission and submit.
      const epoch = ++processEpoch;
      transcriptEpoch += 1;
      retryCommand = null;
      await openProcessAtEpochV1(processId, epoch);
    }
  };

  const submitIntentV1 = async (
    rawIntent: string,
  ): Promise<CreatorControllerResultV1<CreatorSubmitResultV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.durability.phase === "saving") return { kind: "busy" };
    const intent = rawIntent.trim();
    if (intent.length === 0) {
      return { kind: "completed", value: { kind: "rejected", reason: "empty_intent" } };
    }
    if (intent.length > creatorIntentMaximumCharactersV1) {
      return { kind: "completed", value: { kind: "rejected", reason: "intent_too_long" } };
    }
    const workspaceId = createId("workspace");
    const processId = createId("process");
    const proposalId = createId("proposal");
    const preview = creator.create({ intent, workspaceId });
    const updatedAt = now();
    const userEntry = transcriptTextEntryV1({
      processId,
      sequence: 1,
      entryId: createId("entry"),
      role: "user",
      text: intent,
    });
    const assistantEntry = transcriptTextEntryV1({
      processId,
      sequence: 2,
      entryId: createId("entry"),
      role: "assistant",
      text: preview.creatorReply,
    });
    publishSavingV1("create");
    try {
      const result = await input.workspace.create({
        workspaceId,
        catalog: {
          commitId: createId("catalog-create"),
          program: preview.program,
          proposalId,
          updatedAt,
        },
        process: {
          processId,
          programDefinition: { programId: builtinCreatorProgramIdV1, revision: 1 },
          subjectProgramId: preview.program.programId,
          createdAt: updatedAt,
        },
        transcript: {
          processId,
          expectedProcessRevision: 1,
          expectedTranscriptFrontier: 0,
          commitId: createId("process-create-transcript"),
          attemptBinding: null,
          entries: [userEntry, assistantEntry],
          checkpoint: null,
          terminalAttemptReceipt: null,
          updatedAt,
        },
      });
      if (result.kind === "conflict") {
        return fail("create", "conflict", null, null);
      }
      if (result.kind === "program_definition_missing") {
        return fail("create", "program_definition_missing", null, null);
      }
      await refreshCatalogV1();
      const opened = await openProcessV1(processId);
      if (opened.kind !== "completed") return opened;
      return { kind: "completed", value: { kind: "created", workspaceId } };
    } catch (error) {
      return fail("create", failureCodeV1(error), null, null);
    }
  };

  const sendFollowUpV1 = async (
    rawText: string,
  ): Promise<CreatorControllerResultV1<CreatorFollowUpResultV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.durability.phase === "saving") return { kind: "busy" };
    const active = snapshot.activeProcess;
    const subject = active?.subject;
    if (active === null || active === undefined || subject === null || subject === undefined) {
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    const text = rawText.trim();
    if (text.length === 0) {
      return { kind: "completed", value: { kind: "rejected", reason: "empty_message" } };
    }
    if (text.length > creatorAgentTextMaximumCharactersV1) {
      return { kind: "completed", value: { kind: "rejected", reason: "message_too_long" } };
    }
    const currentProgram = subject.currentProgram;
    const updatedAt = now();
    const creatorReply = creator.followUp({
      workspace: {
        workspaceId: subject.head.workspaceId,
        intent: currentProgram.requirements[0]!,
        title: currentProgram.name,
      },
      program: currentProgram,
      text,
    });
    const nextProgram = {
      ...currentProgram,
      revision: currentProgram.revision + 1,
      requirements: [...currentProgram.requirements, text],
    };
    const firstSequence = active.process.transcriptFrontier + 1;
    publishSavingV1("revision");
    try {
      const result = await input.workspace.applyRevision({
        catalog: {
          programId: currentProgram.programId,
          expectedRepositoryRevision: subject.head.repositoryRevision,
          expectedProposal: {
            proposalId: subject.head.proposal.proposalId,
            programRevision: subject.head.proposal.programRevision,
          },
          commitId: createId("catalog-revision"),
          program: nextProgram,
          proposalId: createId("proposal"),
          updatedAt,
        },
        transcript: {
          processId: active.process.processId,
          expectedProcessRevision: active.process.revision,
          expectedTranscriptFrontier: active.process.transcriptFrontier,
          commitId: createId("process-follow-up"),
          attemptBinding: null,
          entries: [
            transcriptTextEntryV1({
              processId: active.process.processId,
              sequence: firstSequence,
              entryId: createId("entry"),
              role: "user",
              text,
            }),
            transcriptTextEntryV1({
              processId: active.process.processId,
              sequence: firstSequence + 1,
              entryId: createId("entry"),
              role: "assistant",
              text: creatorReply,
            }),
          ],
          checkpoint: null,
          terminalAttemptReceipt: null,
          updatedAt,
        },
      });
      if (result.kind === "conflict") {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      await refreshCatalogV1();
      await refreshProcessIfCurrentV1(active.process.processId);
      return {
        kind: "completed",
        value: { kind: "sent", programRevision: result.record.currentProgram.revision },
      };
    } catch (error) {
      return fail("revision", failureCodeV1(error), null, null);
    }
  };

  const decideProposalV1 = async (
    status: "accepted" | "rejected",
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.durability.phase === "saving") return { kind: "busy" };
    const active = snapshot.activeProcess;
    const subject = active?.subject;
    if (active === null || active === undefined || subject === null || subject === undefined) {
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    const current = {
      proposalId: subject.head.proposal.proposalId,
      programRevision: subject.head.proposal.programRevision,
    };
    if (
      expected.proposalId !== current.proposalId ||
      expected.programRevision !== current.programRevision
    ) return { kind: "completed", value: { kind: "stale", current } };
    if (subject.head.proposal.status !== "pending") {
      return {
        kind: "completed",
        value: {
          kind: "unchanged",
          status: subject.head.proposal.status,
          proposal: current,
        },
      };
    }
    const updatedAt = now();
    const sequence = active.process.transcriptFrontier + 1;
    publishSavingV1("decision");
    try {
      const transcript = {
        processId: active.process.processId,
        expectedProcessRevision: active.process.revision,
        expectedTranscriptFrontier: active.process.transcriptFrontier,
        commitId: createId("process-decision"),
        attemptBinding: null,
        entries: [transcriptTextEntryV1({
          processId: active.process.processId,
          sequence,
          entryId: createId("entry"),
          role: "assistant",
          text: decisionMessageV1(
            status,
            current.programRevision,
            usesChineseV1(subject.currentProgram.requirements.join("\n")),
          ),
        })],
        checkpoint: null,
        terminalAttemptReceipt: null,
        updatedAt,
      } as const;
      const catalogBase = {
        programId: subject.currentProgram.programId,
        expectedRepositoryRevision: subject.head.repositoryRevision,
        expectedProposal: current,
        commitId: createId("catalog-decision"),
        updatedAt,
      } as const;
      const result = status === "accepted"
        ? await input.workspace.decide({
          catalog: { ...catalogBase, status: "accepted" },
          transcript,
        })
        : await input.workspace.decide({
          catalog: { ...catalogBase, status: "rejected" },
          transcript,
        });
      if (result.kind === "conflict") {
        const proposal = result.currentProgram?.head.proposal;
        return {
          kind: "completed",
          value: proposal === undefined ? { kind: "unavailable" } : {
            kind: "stale",
            current: {
              proposalId: proposal.proposalId,
              programRevision: proposal.programRevision,
            },
          },
        };
      }
      await refreshCatalogV1();
      await refreshProcessIfCurrentV1(active.process.processId);
      return {
        kind: "completed",
        value: {
          kind: result.kind === "unchanged" ? "unchanged" : "applied",
          status,
          proposal: current,
        },
      };
    } catch (error) {
      return fail("decision", failureCodeV1(error), null, null);
    }
  };

  const acquireExecutionV1 = async (
    acquireInput: ProcessExecutionAcquireInputV1,
  ): Promise<ProcessExecutionLeaseV1 | null> => {
    try {
      const result = await repository.acquireProcessExecution(acquireInput);
      if (result.kind === "conflict") return null;
      const currentLease = await repository.loadProcessExecutionLease(
        acquireInput.attempt.processId,
      );
      if (
        currentLease === null || currentLease.ownerInstanceId !== ownerInstanceId ||
        currentLease.attemptId !== acquireInput.attempt.attemptId ||
        currentLease.generation !== acquireInput.attempt.generation ||
        currentLease.expiresAt < result.lease.expiresAt
      ) return null;
      return currentLease;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation({
        operation: "execution_acquire",
        input: acquireInput,
      });
      if (queried.kind === "mismatch") {
        throw new TypeError("sillyos.creator_controller.execution_acquire_mismatch", {
          cause: error,
        });
      }
      if (queried.kind === "absent") throw error;
      const currentLease = await repository.loadProcessExecutionLease(
        acquireInput.attempt.processId,
      );
      const committedLease = queried.receipt.lease;
      if (
        committedLease === null || currentLease === null ||
        currentLease.ownerInstanceId !== ownerInstanceId ||
        currentLease.attemptId !== acquireInput.attempt.attemptId ||
        currentLease.generation !== acquireInput.attempt.generation ||
        currentLease.expiresAt < committedLease.expiresAt
      ) return null;
      return currentLease;
    }
  };

  const controller: CreatorControllerV1 = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: loadInitialCatalogV1,
    loadMorePrograms: loadMoreProgramsV1,
    openProgram: openProgramV1,
    openProcess: openProcessV1,
    loadOlderTranscript: loadOlderTranscriptV1,
    restoreTranscriptAround: restoreTranscriptAroundV1,
    async reloadLatestTranscript() {
      const processId = snapshot.activeProcess?.process.processId;
      if (processId === undefined) return { kind: "completed", value: false };
      return await openProcessV1(processId);
    },
    async refreshActiveProcess() {
      const projected = snapshot.activeProcess?.process;
      if (projected === undefined) return { kind: "completed", value: false };
      try {
        const durable = await repository.loadProcess(projected.processId);
        if (durable === null) return fail("open", "process_not_found", null, null);
        if (durable.revision === projected.revision) {
          return { kind: "completed", value: false };
        }
        await refreshProcessIfCurrentV1(projected.processId);
        return { kind: "completed", value: true };
      } catch (error) {
        return fail("open", failureCodeV1(error), null, null);
      }
    },
    submitIntent: submitIntentV1,
    sendFollowUp: sendFollowUpV1,
    async prepareAgentRun(rawText) {
      if (disposed) return { kind: "failed", code: "disposed" };
      if (snapshot.durability.phase === "saving") return { kind: "busy" };
      const active = snapshot.activeProcess;
      const subject = active?.subject;
      if (active === null || active === undefined || subject === null || subject === undefined) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      const text = rawText.trim();
      if (text.length === 0) {
        return { kind: "completed", value: { kind: "rejected", reason: "empty_message" } };
      }
      if (text.length > creatorAgentTextMaximumCharactersV1) {
        return { kind: "completed", value: { kind: "rejected", reason: "message_too_long" } };
      }
      if (active.process.activeAttempt !== null || active.process.status !== "active") {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      publishSavingV1("agent_run");
      try {
        const review = await input.workspace.inspectProgramWorkspace(
          subject.currentProgram.programId,
        );
        const mutableHead = review?.mutableHead ?? null;
        if (mutableHead === null) {
          publish({
            route: snapshot.route,
            catalog: snapshot.catalog,
            activeProcess: snapshot.activeProcess,
            durability: { phase: "ready" },
          });
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        const attemptId = createId("agent-run");
        const generation = (active.process.lastTerminalAttempt?.generation ?? 0) + 1;
        const triggerSequence = active.process.transcriptFrontier + 1;
        const observedAt = Math.max(now(), active.process.updatedAt);
        const startingCheckpoint: ProcessCheckpointV1 = {
          checkpointId: `${attemptId}.start`,
          throughSequence: triggerSequence,
          workspaceId: subject.head.workspaceId,
          workspaceCheckpointId: mutableHead.checkpointId,
          workspaceGeneration: mutableHead.generation,
        };
        const acquireInput: ProcessExecutionAcquireInputV1 = {
          ownerInstanceId,
          observedAt,
          expiresAt: leaseExpirationV1(observedAt),
          attempt: {
            processId: active.process.processId,
            expectedProcessRevision: active.process.revision,
            expectedTranscriptFrontier: active.process.transcriptFrontier,
            commitId: `${attemptId}.acquire`,
            attemptId,
            generation,
            trigger: {
              kind: "new_entry",
              entry: transcriptTextEntryV1({
                processId: active.process.processId,
                sequence: triggerSequence,
                entryId: `${attemptId}.user`,
                role: "user",
                text,
              }),
            },
            startingCheckpoint,
            updatedAt: observedAt,
          },
        };
        const lease = await serializeExecutionOperationV1(() => acquireExecutionV1(acquireInput));
        if (lease === null) {
          // Another tab may have acquired this idle Process after our local
          // projection was read. Refresh immediately so this tab becomes
          // read-only without waiting for the passive invalidation poll.
          await refreshProcessIfCurrentV1(active.process.processId);
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        ownedExecutionLease = lease;
        await refreshProcessIfCurrentV1(active.process.processId);
        return {
          kind: "completed",
          value: {
            kind: "prepared",
            run: {
              agentRunId: attemptId,
              processId: active.process.processId,
              processAttemptGeneration: generation,
              workspaceCheckpointId: startingCheckpoint.workspaceCheckpointId,
              workspaceGeneration: startingCheckpoint.workspaceGeneration,
              proposalId: subject.head.proposal.proposalId,
              programId: subject.currentProgram.programId,
              baseProgramRevision: subject.currentProgram.revision,
              baseRepositoryRevision: subject.head.repositoryRevision,
              text,
            },
          },
        };
      } catch (error) {
        return fail("agent_run", failureCodeV1(error), null, null);
      }
    },
    async retryInterruptedAgentRun() {
      if (disposed) return { kind: "failed", code: "disposed" };
      if (snapshot.durability.phase === "saving") return { kind: "busy" };
      const active = snapshot.activeProcess;
      const process = active?.process;
      const subject = active?.subject;
      const terminal = process?.lastTerminalAttempt;
      const checkpoint = process?.checkpoint;
      const projectedWorkspaceHead = active?.workspaceReview?.mutableHead;
      if (
        active === null || active === undefined || process === undefined ||
        subject === null || subject === undefined || checkpoint === null ||
        checkpoint === undefined ||
        process.status !== "interrupted_retryable" || process.activeAttempt !== null ||
        terminal?.outcome !== "interrupted" ||
        terminal.interruptionDisposition !== "retryable" || projectedWorkspaceHead === null ||
        projectedWorkspaceHead === undefined ||
        checkpoint.workspaceId !== subject.head.workspaceId ||
        projectedWorkspaceHead.checkpointId !== checkpoint.workspaceCheckpointId ||
        projectedWorkspaceHead.generation !== checkpoint.workspaceGeneration
      ) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      publishSavingV1("agent_run");
      try {
        const review = await input.workspace.inspectProgramWorkspace(
          subject.currentProgram.programId,
        );
        if (
          snapshot.route === "process" &&
          snapshot.activeProcess?.process.processId === process.processId
        ) {
          publish({
            route: "process",
            catalog: snapshot.catalog,
            activeProcess: { ...snapshot.activeProcess, workspaceReview: review },
            durability: snapshot.durability,
          });
        }
        const mutableHead = review?.mutableHead ?? null;
        if (
          mutableHead === null || checkpoint.workspaceId !== subject.head.workspaceId ||
          mutableHead.checkpointId !== checkpoint.workspaceCheckpointId ||
          mutableHead.generation !== checkpoint.workspaceGeneration
        ) {
          if (
            snapshot.route === "process" &&
            snapshot.activeProcess?.process.processId === process.processId
          ) {
            publish({
              route: "process",
              catalog: snapshot.catalog,
              activeProcess: snapshot.activeProcess,
              durability: { phase: "ready" },
            });
          }
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        const page = await repository.loadTranscriptPage({
          processId: process.processId,
          beforeSequence: terminal.triggerSequence + 1,
          maximumBytes: operationalStructuredPayloadMaximumBytesV1,
        });
        const trigger = page?.entries.find((entry) =>
          entry.sequence === terminal.triggerSequence && entry.entryId === terminal.triggerEntryId
        ) ?? null;
        const text = trigger === null ? null : triggerTextV1(trigger);
        if (text === null) {
          if (
            snapshot.route === "process" &&
            snapshot.activeProcess?.process.processId === process.processId
          ) {
            publish({
              route: "process",
              catalog: snapshot.catalog,
              activeProcess: snapshot.activeProcess,
              durability: { phase: "ready" },
            });
          }
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        const attemptId = createId("agent-run");
        const generation = terminal.generation + 1;
        const observedAt = Math.max(now(), process.updatedAt);
        const startingCheckpoint: ProcessCheckpointV1 = {
          checkpointId: `${attemptId}.start`,
          throughSequence: process.transcriptFrontier,
          workspaceId: checkpoint.workspaceId,
          workspaceCheckpointId: mutableHead.checkpointId,
          workspaceGeneration: mutableHead.generation,
        };
        const acquireInput: ProcessExecutionAcquireInputV1 = {
          ownerInstanceId,
          observedAt,
          expiresAt: leaseExpirationV1(observedAt),
          attempt: {
            processId: process.processId,
            expectedProcessRevision: process.revision,
            expectedTranscriptFrontier: process.transcriptFrontier,
            commitId: `${attemptId}.acquire`,
            attemptId,
            generation,
            trigger: {
              kind: "existing_entry",
              entryId: terminal.triggerEntryId,
              sequence: terminal.triggerSequence,
            },
            startingCheckpoint,
            updatedAt: observedAt,
          },
        };
        const lease = await serializeExecutionOperationV1(() =>
          acquireExecutionV1(acquireInput)
        );
        if (lease === null) {
          await refreshProcessIfCurrentV1(process.processId);
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        ownedExecutionLease = lease;
        await refreshProcessIfCurrentV1(process.processId);
        return {
          kind: "completed",
          value: {
            kind: "prepared",
            run: {
              agentRunId: attemptId,
              processId: process.processId,
              processAttemptGeneration: generation,
              workspaceCheckpointId: startingCheckpoint.workspaceCheckpointId,
              workspaceGeneration: startingCheckpoint.workspaceGeneration,
              proposalId: subject.head.proposal.proposalId,
              programId: subject.currentProgram.programId,
              baseProgramRevision: subject.currentProgram.revision,
              baseRepositoryRevision: subject.head.repositoryRevision,
              text,
            },
          },
        };
      } catch (error) {
        return fail("agent_run", failureCodeV1(error), null, null);
      }
    },
    async renewAgentRunLease(run) {
      if (disposed) return { kind: "failed", code: "disposed" };
      if (terminalizingAttemptId === run.agentRunId) {
        return { kind: "completed", value: "idle" };
      }
      return await serializeExecutionOperationV1(async () => {
        const lease = ownedExecutionLease;
        if (lease === null || !leaseMatchesRunV1(lease, run)) {
          return { kind: "completed", value: "lost" };
        }
        const observedAt = now();
        if (observedAt >= lease.expiresAt) {
          ownedExecutionLease = null;
          return { kind: "completed", value: "lost" };
        }
        const ordinaryExpiration = leaseExpirationV1(observedAt);
        const expiresAt = Math.max(ordinaryExpiration, lease.expiresAt + 1);
        if (!Number.isSafeInteger(expiresAt)) {
          ownedExecutionLease = null;
          return { kind: "completed", value: "lost" };
        }
        try {
          const renewed = await repository.renewProcessExecutionLease({
            lease,
            observedAt,
            expiresAt,
          });
          if (renewed.kind === "conflict") {
            ownedExecutionLease = null;
            return { kind: "completed", value: "lost" };
          }
          ownedExecutionLease = renewed.lease;
          return { kind: "completed", value: "renewed" };
        } catch (error) {
          if (isProgramDataRepositoryFailureV1(error) && error.code === "outcome_unknown") {
            const current = await repository.loadProcessExecutionLease(run.processId).catch(
              () => null,
            );
            if (
              current !== null && leaseMatchesRunV1(current, run) &&
              current.expiresAt >= expiresAt
            ) {
              ownedExecutionLease = current;
              return { kind: "completed", value: "renewed" };
            }
          }
          ownedExecutionLease = null;
          return { kind: "failed", code: failureCodeV1(error) };
        }
      });
    },
    async recordAgentRunTerminal(terminal) {
      if (disposed) return { kind: "failed", code: "disposed" };
      if (snapshot.durability.phase === "saving" || terminalizingAttemptId !== null) {
        return { kind: "busy" };
      }
      const effectiveTerminal = effectiveAgentTerminalV1(terminal);
      terminalizingAttemptId = terminal.run.agentRunId;
      try {
        return await serializeExecutionOperationV1(async () => {
          const process = await repository.loadProcess(terminal.run.processId);
          const attempt = process?.activeAttempt ?? null;
          const subjectProgramId = process?.subjectProgramId ?? null;
          const subject = subjectProgramId === null
            ? null
            : await repository.load(subjectProgramId);
          const currentBase = subject === null ? null : {
            proposalId: subject.head.proposal.proposalId,
            programId: subject.currentProgram.programId,
            baseProgramRevision: subject.currentProgram.revision,
          };
          const lease = ownedExecutionLease;
          const exactAttempt = process !== null && attempt !== null && lease !== null &&
            leaseMatchesRunV1(lease, terminal.run) &&
            terminal.run.processId === process.processId &&
            terminal.run.agentRunId === attempt.attemptId &&
            terminal.run.processAttemptGeneration === attempt.generation &&
            terminal.run.workspaceCheckpointId ===
              attempt.startingCheckpoint.workspaceCheckpointId &&
            terminal.run.workspaceGeneration === attempt.startingCheckpoint.workspaceGeneration &&
            process.subjectProgramId === terminal.run.programId;
          if (!exactAttempt || process === null || attempt === null || lease === null) {
            return {
              kind: "completed",
              value: currentBase === null
                ? { kind: "unavailable" }
                : { kind: "stale", current: currentBase },
            };
          }
          const observedAt = now();
          if (observedAt >= lease.expiresAt) {
            ownedExecutionLease = null;
            return {
              kind: "completed",
              value: currentBase === null
                ? { kind: "unavailable" }
                : { kind: "stale", current: currentBase },
            };
          }
          const exactCurrentBase = subject !== null &&
            terminal.run.programId === subject.currentProgram.programId &&
            terminal.run.proposalId === subject.head.proposal.proposalId &&
            terminal.run.baseProgramRevision === subject.currentProgram.revision &&
            terminal.run.baseRepositoryRevision === subject.head.repositoryRevision;
          const terminalProjection: CreatorAgentTerminalRunV1 = exactCurrentBase
            ? effectiveTerminal
            : { run: terminal.run, outcome: "replaced" };
          const terminalSequence = process.transcriptFrontier + 1;
          const terminalEntry = transcriptTextEntryV1({
            processId: process.processId,
            sequence: terminalSequence,
            entryId: `${attempt.attemptId}.terminal.entry`,
            role: "assistant",
            ...terminalMessageV1(terminalProjection),
          });
          const terminalInput: ProcessExecutionTerminalInputV1 = {
            lease,
            observedAt,
            transcript: {
              processId: process.processId,
              expectedProcessRevision: process.revision,
              expectedTranscriptFrontier: process.transcriptFrontier,
              commitId: `${attempt.attemptId}.terminal`,
              attemptBinding: { attemptId: attempt.attemptId, generation: attempt.generation },
              entries: [terminalEntry],
              checkpoint: terminalProjection.outcome === "completed" && subject !== null
                ? {
                  checkpointId: `${attempt.attemptId}.terminal-checkpoint`,
                  throughSequence: terminalSequence,
                  workspaceId: subject.head.workspaceId,
                  workspaceCheckpointId: attempt.startingCheckpoint.workspaceCheckpointId,
                  workspaceGeneration: attempt.startingCheckpoint.workspaceGeneration,
                }
                : null,
              terminalAttemptReceipt: {
                schemaVersion: 1,
                processId: process.processId,
                attemptId: attempt.attemptId,
                generation: attempt.generation,
                outcome: terminalProjection.outcome,
                terminalSequence,
                terminalEntryId: terminalEntry.entryId,
                interruptionDisposition: null,
              },
              updatedAt: observedAt,
            },
          };
          publishSavingV1("agent_run");
          try {
            if (terminalProjection.outcome === "completed" && subject !== null) {
              const nextProgram = {
                ...subject.currentProgram,
                revision: subject.currentProgram.revision + 1,
                requirements: [
                  ...subject.currentProgram.requirements,
                  terminalProjection.candidate.requirement,
                ],
              };
              const committed = await input.workspace.applyAgentRevision({
                lease,
                observedAt,
                catalog: {
                  programId: subject.currentProgram.programId,
                  expectedRepositoryRevision: subject.head.repositoryRevision,
                  expectedProposal: {
                    proposalId: subject.head.proposal.proposalId,
                    programRevision: subject.head.proposal.programRevision,
                  },
                  commitId: `${attempt.attemptId}.catalog-terminal`,
                  program: nextProgram,
                  proposalId: `${attempt.attemptId}.proposal`,
                  updatedAt: observedAt,
                },
                transcript: {
                  ...terminalInput.transcript,
                  attemptBinding: terminalInput.transcript.attemptBinding!,
                  checkpoint: terminalInput.transcript.checkpoint!,
                },
              });
              if (committed.kind === "conflict") {
                if (
                  committed.currentLease === null ||
                  !leaseMatchesRunV1(committed.currentLease, terminal.run)
                ) ownedExecutionLease = null;
                throw new TypeError("sillyos.creator_controller.agent_terminal_conflict");
              }
              if (committed.kind === "program_definition_missing") {
                return { kind: "completed", value: { kind: "unavailable" } };
              }
              await refreshCatalogV1();
            } else {
              const committed = await repository.commitProcessExecutionTerminal(terminalInput);
              if (committed.kind === "conflict") {
                if (
                  committed.currentLease === null ||
                  !leaseMatchesRunV1(committed.currentLease, terminal.run)
                ) ownedExecutionLease = null;
                throw new TypeError("sillyos.creator_controller.agent_terminal_conflict");
              }
            }
            ownedExecutionLease = null;
            await refreshProcessIfCurrentV1(process.processId);
            return {
              kind: "completed",
              value: { kind: "applied", outcome: terminalProjection.outcome },
            };
          } catch (error) {
            if (isProgramDataRepositoryFailureV1(error) && error.code === "outcome_unknown") {
              if (terminalProjection.outcome === "completed" && subject !== null) {
                // Workspace authority owns the final reviewed-head fields and
                // therefore performs the exact composite receipt query.
                throw error;
              }
              const queried = await repository.queryProcessOperation({
                operation: "execution_terminal",
                input: terminalInput,
              });
              if (queried.kind === "committed") {
                ownedExecutionLease = null;
                await refreshProcessIfCurrentV1(process.processId);
                return {
                  kind: "completed",
                  value: { kind: "applied", outcome: terminalProjection.outcome },
                };
              }
              if (queried.kind === "mismatch") {
                ownedExecutionLease = null;
                return {
                  kind: "completed",
                  value: currentBase === null
                    ? { kind: "unavailable" }
                    : { kind: "stale", current: currentBase },
                };
              }
            }
            return fail("agent_run", failureCodeV1(error), "retry", async () => {
              const retried = await controller.recordAgentRunTerminal(terminal);
              return retried.kind === "completed" && retried.value.kind === "applied";
            });
          }
        });
      } finally {
        terminalizingAttemptId = null;
      }
    },
    async acceptProposal(expected) {
      return await decideProposalV1("accepted", expected);
    },
    async rejectProposal(expected) {
      return await decideProposalV1("rejected", expected);
    },
    async openHome() {
      if (disposed) return false;
      processEpoch += 1;
      transcriptEpoch += 1;
      transcriptWindow = null;
      retryCommand = null;
      ownedExecutionLease = null;
      publish({
        route: "home",
        catalog: snapshot.catalog,
        activeProcess: null,
        durability: { phase: "ready" },
      });
      try {
        await input.workspace.closeActiveWorkspace();
      } catch {
        return false;
      }
      if (disposed) return false;
      return true;
    },
    async retry() {
      if (disposed || retryCommand === null) return false;
      const retry = retryCommand;
      retryCommand = null;
      return await retry();
    },
    dispose() {
      if (disposed) return Promise.resolve();
      disposed = true;
      catalogEpoch += 1;
      processEpoch += 1;
      transcriptEpoch += 1;
      transcriptWindow = null;
      retryCommand = null;
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        activeProcess: null,
        durability: { phase: "disposed" },
      };
      listeners.clear();
      return Promise.resolve();
    },
  };
  return controller;
}
