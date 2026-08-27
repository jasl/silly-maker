// SPDX-License-Identifier: MIT

import type {
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalApplyResultV1,
  CreatorAgentTerminalRunV1,
  CreatorFollowUpResultV1,
  CreatorPreviewPortV1,
  CreatorProposalDecisionResultV1,
  CreatorSessionSnapshotV1,
  CreatorSubmitResultV1,
  ProgramProposalReferenceV1,
} from "./contracts.ts";
import { creatorAgentTextMaximumCharactersV1 } from "./contracts.ts";
import { createCreatorSessionV1, createEmptyCreatorSessionSnapshotV1 } from "./creator-session.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "./browser-program-workspace-authority.ts";
import { programRepositoryMaximumAgentRunReceiptsV3 } from "./program-repository.ts";
import type {
  ProgramRepositoryAggregateV3,
  ProgramRepositoryCommitResultV3,
  ProgramRepositorySummaryV3,
} from "./program-repository.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";

export type CreatorControllerAuthorityV1 = Pick<
  BrowserProgramWorkspaceAuthorityV1,
  | "initialize"
  | "list"
  | "load"
  | "create"
  | "applyRevision"
  | "settleAgentRun"
  | "decide"
  | "inspectProgramWorkspace"
  | "closeActiveWorkspace"
>;

export type CreatorDurabilityOperationV1 =
  | "catalog"
  | "open"
  | "create"
  | "revision"
  | "decision"
  | "agent_run";

export type CreatorDurabilityStateV1 =
  | { readonly phase: "loading"; readonly operation: "catalog" | "open" }
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

export interface CreatorControllerSnapshotV1 {
  readonly revision: number;
  readonly session: CreatorSessionSnapshotV1;
  readonly recentPrograms: readonly ProgramRepositorySummaryV3[];
  readonly workspaceReview: ProgramWorkspaceReviewProjectionV1 | null;
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

export interface CreatorControllerV1 {
  getSnapshot(): CreatorControllerSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  openProgram(programId: string): Promise<CreatorControllerResultV1<boolean>>;
  submitIntent(intent: string): Promise<CreatorControllerResultV1<CreatorSubmitResultV1>>;
  sendFollowUp(text: string): Promise<CreatorControllerResultV1<CreatorFollowUpResultV1>>;
  prepareAgentRun(text: string): CreatorControllerResultV1<CreatorAgentRunPreparationResultV1>;
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

type RetryCommandV1 = () => Promise<boolean>;

function defaultWorkspaceIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new TypeError("sillyos.program_identity.unavailable");
  }
  return `workspace.local.${crypto.randomUUID()}`;
}

function defaultAgentRunIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new TypeError("sillyos.agent_run_identity.unavailable");
  }
  return `agent.run.${crypto.randomUUID()}`;
}

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0 && code.length <= 128) return code;
  }
  return "authority_failed";
}

function aggregateHasTerminalV1(
  aggregate: ProgramRepositoryAggregateV3,
  terminal: CreatorAgentTerminalRunV1,
): boolean {
  const receipt = aggregate.agentRunReceipts.find(({ agentRunId }) =>
    agentRunId === terminal.run.agentRunId
  );
  if (
    aggregate.programId !== terminal.run.programId ||
    receipt === undefined || receipt.outcome !== terminal.outcome ||
    receipt.proposalId !== terminal.run.proposalId ||
    receipt.baseProgramRevision !== terminal.run.baseProgramRevision ||
    receipt.baseRepositoryRevision !== terminal.run.baseRepositoryRevision
  ) return false;
  const userMessage = aggregate.snapshot.messages.find(({ messageId }) =>
    messageId === receipt.userMessageId
  );
  if (userMessage?.role !== "user" || userMessage.text !== terminal.run.text) return false;
  if (terminal.outcome === "completed") {
    const creatorMessage = aggregate.snapshot.messages.find(({ messageId }) =>
      messageId === receipt.creatorMessageId
    );
    const resultingProgram = aggregate.programRevisions.find(({ revision }) =>
      revision === receipt.resultingProgramRevision
    );
    return terminal.candidate.proposalId === terminal.run.proposalId &&
      terminal.candidate.programId === terminal.run.programId &&
      terminal.candidate.baseProgramRevision === terminal.run.baseProgramRevision &&
      terminal.candidate.text === terminal.run.text && receipt.diagnosticCode === null &&
      receipt.resultingProgramRevision === terminal.run.baseProgramRevision + 1 &&
      creatorMessage?.role === "creator" &&
      creatorMessage.text === terminal.finalAssistantReply.trim() &&
      resultingProgram?.requirements.at(-1) === terminal.candidate.requirement;
  }
  return receipt.creatorMessageId === null && receipt.resultingProgramRevision === null &&
    receipt.diagnosticCode === (terminal.outcome === "failed" ? terminal.diagnosticCode : null);
}

function summaryFromAggregateV1(
  aggregate: ProgramRepositoryAggregateV3,
): ProgramRepositorySummaryV3 {
  const program = aggregate.snapshot.program;
  const proposal = aggregate.snapshot.proposal;
  if (program === null || proposal === null) {
    throw new TypeError("sillyos.program_repository.aggregate_unavailable");
  }
  return {
    programId: program.programId,
    name: program.name,
    kind: program.kind,
    programRevision: program.revision,
    proposalStatus: proposal.status,
    updatedAt: aggregate.updatedAt,
    repositoryRevision: aggregate.repositoryRevision,
  };
}

function upsertRecentV1(
  current: readonly ProgramRepositorySummaryV3[],
  aggregate: ProgramRepositoryAggregateV3,
): readonly ProgramRepositorySummaryV3[] {
  const summary = summaryFromAggregateV1(aggregate);
  return [summary, ...current.filter((candidate) => candidate.programId !== summary.programId)]
    .toSorted((left, right) =>
      right.updatedAt - left.updatedAt || left.programId.localeCompare(right.programId)
    );
}

function isMutationBusyV1(state: CreatorDurabilityStateV1): boolean {
  return state.phase === "saving";
}

function unavailableWorkspaceReviewV1(
  review: ProgramWorkspaceReviewProjectionV1 | null,
): ProgramWorkspaceReviewProjectionV1 | null {
  if (review === null) return null;
  return {
    ...review,
    mutableHead: null,
    acceptedStatus: review.latestAccepted === null ? null : "unavailable",
    pendingStatus: review.pendingReview === null ? null : "unavailable",
  };
}

export function createCreatorControllerV1(input: {
  readonly creator: CreatorPreviewPortV1;
  readonly authority: CreatorControllerAuthorityV1;
  readonly createWorkspaceId?: () => string;
  readonly createAgentRunId?: () => string;
  readonly now?: () => number;
}): CreatorControllerV1 {
  const listeners = new Set<() => void>();
  const createWorkspaceId = input.createWorkspaceId ?? defaultWorkspaceIdV1;
  const createAgentRunId = input.createAgentRunId ?? defaultAgentRunIdV1;
  const now = input.now ?? Date.now;
  const authority = input.authority;
  let activeAggregate: ProgramRepositoryAggregateV3 | null = null;
  let retryCommand: RetryCommandV1 | null = null;
  let homeTransitionPending = false;
  let disposed = false;
  let snapshot: CreatorControllerSnapshotV1 = {
    revision: 0,
    session: createEmptyCreatorSessionSnapshotV1(input.creator.source),
    recentPrograms: [],
    workspaceReview: null,
    durability: { phase: "loading", operation: "catalog" },
  };

  const publish = (next: Omit<CreatorControllerSnapshotV1, "revision">): void => {
    if (disposed) return;
    snapshot = { revision: snapshot.revision + 1, ...next };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Product observers cannot change authority/controller precedence.
      }
    }
  };

  const publishDurability = (durability: CreatorDurabilityStateV1): void => {
    publish({
      session: snapshot.session,
      recentPrograms: snapshot.recentPrograms,
      workspaceReview: snapshot.workspaceReview,
      durability,
    });
  };

  const isBusy = (): boolean => homeTransitionPending || isMutationBusyV1(snapshot.durability);

  const installProgram = (inspection: {
    readonly aggregate: ProgramRepositoryAggregateV3;
    readonly review: ProgramWorkspaceReviewProjectionV1;
  }): void => {
    if (disposed) return;
    const { aggregate, review } = inspection;
    activeAggregate = aggregate;
    retryCommand = null;
    publish({
      session: aggregate.snapshot,
      recentPrograms: upsertRecentV1(snapshot.recentPrograms, aggregate),
      workspaceReview: review,
      durability: { phase: "ready" },
    });
  };

  const fail = (
    operation: CreatorDurabilityOperationV1,
    code: string,
    recovery: "retry" | null,
    retry: RetryCommandV1 | null,
    workspaceReview: ProgramWorkspaceReviewProjectionV1 | null = snapshot.workspaceReview,
  ): CreatorControllerResultV1<never> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    retryCommand = retry;
    publish({
      session: snapshot.session,
      recentPrograms: snapshot.recentPrograms,
      workspaceReview,
      durability: { phase: "failed", operation, code, recovery },
    });
    return { kind: "failed", code };
  };

  const runCommit = async <T>(mutation: {
    readonly operation: "create" | "revision" | "decision" | "agent_run";
    readonly programId: string;
    readonly domainResult: T;
    readonly commit: (
      authority: CreatorControllerAuthorityV1,
    ) => Promise<ProgramRepositoryCommitResultV3>;
  }): Promise<CreatorControllerResultV1<T>> => {
    if (disposed || isBusy()) return { kind: "busy" };
    const retryMutation = async (): Promise<boolean> => {
      const result = await runCommit(mutation);
      return result.kind === "completed";
    };
    publishDurability({ phase: "saving", operation: mutation.operation });
    try {
      const result = await mutation.commit(authority);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (result.kind === "conflict") {
        if (result.current === null) return fail(mutation.operation, "conflict", null, null);
        let inspection: Awaited<
          ReturnType<CreatorControllerAuthorityV1["inspectProgramWorkspace"]>
        >;
        try {
          inspection = await authority.inspectProgramWorkspace(mutation.programId, {
            hostAccess: "active_only",
          });
        } catch {
          return fail(
            mutation.operation,
            "conflict",
            null,
            null,
            unavailableWorkspaceReviewV1(snapshot.workspaceReview),
          );
        }
        if (disposed) return { kind: "failed", code: "disposed" };
        if (inspection === null) {
          return fail(
            mutation.operation,
            "conflict",
            null,
            null,
            unavailableWorkspaceReviewV1(snapshot.workspaceReview),
          );
        }
        installProgram(inspection);
        return fail(mutation.operation, "conflict", null, null);
      }
      const inspection = await authority.inspectProgramWorkspace(mutation.programId);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (inspection === null) {
        return fail(
          mutation.operation,
          "workspace_inspection_unavailable",
          "retry",
          retryMutation,
          unavailableWorkspaceReviewV1(snapshot.workspaceReview),
        );
      }
      installProgram(inspection);
      return { kind: "completed", value: mutation.domainResult };
    } catch (error) {
      if (disposed) return { kind: "failed", code: "disposed" };
      const code = failureCodeV1(error);
      return fail(
        mutation.operation,
        code,
        "retry",
        retryMutation,
        unavailableWorkspaceReviewV1(snapshot.workspaceReview),
      );
    }
  };

  const initialize = async (): Promise<void> => {
    if (disposed || homeTransitionPending) return;
    retryCommand = null;
    publishDurability({ phase: "loading", operation: "catalog" });
    try {
      await authority.initialize();
      const recentPrograms = await authority.list();
      if (disposed) return;
      publish({
        session: snapshot.session,
        recentPrograms,
        workspaceReview: snapshot.workspaceReview,
        durability: { phase: "ready" },
      });
    } catch (error) {
      if (disposed) return;
      const retry = async (): Promise<boolean> => {
        await initialize();
        return snapshot.durability.phase === "ready";
      };
      fail("catalog", failureCodeV1(error), "retry", retry);
    }
  };

  const decide = async (
    status: "accepted" | "rejected",
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>> => {
    if (disposed) return { kind: "busy" };
    const previous = activeAggregate;
    if (previous === null) {
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    if (isBusy()) return { kind: "busy" };
    const staged = createCreatorSessionV1({
      creator: input.creator,
      initialSnapshot: previous.snapshot,
    });
    const expectedReference: ProgramProposalReferenceV1 = {
      proposalId: expected.proposalId,
      programRevision: expected.programRevision,
    };
    const domainResult = status === "accepted"
      ? staged.acceptProposal(expectedReference)
      : staged.rejectProposal(expectedReference);
    if (domainResult.kind !== "applied") {
      return { kind: "completed", value: domainResult };
    }
    const desiredSnapshot = staged.getSnapshot();
    const updatedAt = now();
    const program = desiredSnapshot.program;
    if (program === null) {
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    return runCommit({
      operation: "decision",
      programId: program.programId,
      domainResult,
      commit: (candidateAuthority) =>
        candidateAuthority.decide({
          programId: program.programId,
          expectedRepositoryRevision: previous.repositoryRevision,
          expectedProposal: expectedReference,
          status,
          snapshot: desiredSnapshot,
          updatedAt,
        }),
    });
  };

  const openProgram = async (
    programId: string,
  ): Promise<CreatorControllerResultV1<boolean>> => {
    if (disposed || isBusy()) return { kind: "busy" };
    retryCommand = null;
    publishDurability({ phase: "loading", operation: "open" });
    try {
      const inspection = await authority.inspectProgramWorkspace(programId);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (inspection === null) return fail("open", "not_found", null, null);
      installProgram(inspection);
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed) return { kind: "failed", code: "disposed" };
      const retry = async (): Promise<boolean> => {
        const result = await openProgram(programId);
        return result.kind === "completed";
      };
      return fail("open", failureCodeV1(error), "retry", retry);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    openProgram,
    async submitIntent(intent) {
      if (disposed || isBusy()) return { kind: "busy" };
      const workspaceId = createWorkspaceId();
      const staged = createCreatorSessionV1({
        creator: input.creator,
        createWorkspaceId: () => workspaceId,
      });
      const domainResult = staged.submitIntent(intent);
      if (domainResult.kind !== "created") {
        return { kind: "completed", value: domainResult };
      }
      const desiredSnapshot = staged.getSnapshot();
      const program = desiredSnapshot.program;
      if (program === null) throw new TypeError("sillyos.program_create.missing_program");
      const updatedAt = now();
      return runCommit({
        operation: "create",
        programId: program.programId,
        domainResult,
        commit: (candidateAuthority) =>
          candidateAuthority.create({ snapshot: desiredSnapshot, updatedAt }),
      });
    },
    async sendFollowUp(text) {
      if (disposed) return { kind: "busy" };
      const previous = activeAggregate;
      if (previous === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      if (isBusy()) return { kind: "busy" };
      const staged = createCreatorSessionV1({
        creator: input.creator,
        initialSnapshot: previous.snapshot,
      });
      const domainResult = staged.sendFollowUp(text);
      if (domainResult.kind !== "sent") return { kind: "completed", value: domainResult };
      const desiredSnapshot = staged.getSnapshot();
      const currentProgram = previous.snapshot.program;
      const currentProposal = previous.snapshot.proposal;
      if (currentProgram === null || currentProposal === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      const updatedAt = now();
      return runCommit({
        operation: "revision",
        programId: currentProgram.programId,
        domainResult,
        commit: (candidateAuthority) =>
          candidateAuthority.applyRevision({
            programId: currentProgram.programId,
            expectedRepositoryRevision: previous.repositoryRevision,
            expectedBase: {
              proposalId: currentProposal.proposalId,
              programId: currentProgram.programId,
              baseProgramRevision: currentProgram.revision,
            },
            snapshot: desiredSnapshot,
            updatedAt,
          }),
      });
    },
    prepareAgentRun(rawText) {
      if (disposed) return { kind: "busy" };
      const previous = activeAggregate;
      if (previous === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      if (isBusy()) return { kind: "busy" };
      if (previous.agentRunReceipts.length >= programRepositoryMaximumAgentRunReceiptsV3) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      const text = rawText.trim();
      if (text.length === 0) {
        return { kind: "completed", value: { kind: "rejected", reason: "empty_message" } };
      }
      if (text.length > creatorAgentTextMaximumCharactersV1) {
        return {
          kind: "completed",
          value: { kind: "rejected", reason: "message_too_long" },
        };
      }
      const program = previous.snapshot.program;
      const proposal = previous.snapshot.proposal;
      if (
        program === null || proposal === null || proposal.programRevision !== program.revision
      ) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      return {
        kind: "completed",
        value: {
          kind: "prepared",
          run: Object.freeze({
            agentRunId: createAgentRunId(),
            proposalId: proposal.proposalId,
            programId: program.programId,
            baseProgramRevision: program.revision,
            baseRepositoryRevision: previous.repositoryRevision,
            text,
          }),
        },
      };
    },
    async recordAgentRunTerminal(terminal) {
      if (disposed) return { kind: "busy" };
      const previous = activeAggregate;
      if (previous === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      if (aggregateHasTerminalV1(previous, terminal)) {
        return {
          kind: "completed",
          value: { kind: "applied", outcome: terminal.outcome },
        };
      }
      const existing = previous.agentRunReceipts.find(({ agentRunId }) =>
        agentRunId === terminal.run.agentRunId
      );
      if (existing !== undefined) return fail("agent_run", "conflict", null, null);
      if (isBusy()) return { kind: "busy" };
      const staged = createCreatorSessionV1({
        creator: input.creator,
        initialSnapshot: previous.snapshot,
      });
      const domainResult = staged.applyAgentRunTerminal(terminal);
      if (domainResult.kind !== "applied") {
        return { kind: "completed", value: domainResult };
      }
      const desiredSnapshot = staged.getSnapshot();
      const updatedAt = now();
      return runCommit({
        operation: "agent_run",
        programId: terminal.run.programId,
        domainResult,
        commit: (candidateAuthority) =>
          candidateAuthority.settleAgentRun({
            programId: terminal.run.programId,
            expectedRepositoryRevision: previous.repositoryRevision,
            terminal,
            snapshot: desiredSnapshot,
            updatedAt,
          }),
      });
    },
    acceptProposal: (expected) => decide("accepted", expected),
    rejectProposal: (expected) => decide("rejected", expected),
    async openHome() {
      if (disposed || isBusy()) return false;
      homeTransitionPending = true;
      try {
        await authority.closeActiveWorkspace();
        if (disposed) return false;
        activeAggregate = null;
        retryCommand = null;
        publish({
          session: createEmptyCreatorSessionSnapshotV1(input.creator.source),
          recentPrograms: snapshot.recentPrograms,
          workspaceReview: null,
          durability: { phase: "ready" },
        });
        return true;
      } catch {
        return false;
      } finally {
        homeTransitionPending = false;
      }
    },
    async retry() {
      if (disposed || retryCommand === null || isBusy()) return false;
      const command = retryCommand;
      retryCommand = null;
      return command();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      retryCommand = null;
      snapshot = {
        revision: snapshot.revision + 1,
        session: snapshot.session,
        recentPrograms: snapshot.recentPrograms,
        workspaceReview: null,
        durability: { phase: "disposed" },
      };
      listeners.clear();
    },
  };
}
