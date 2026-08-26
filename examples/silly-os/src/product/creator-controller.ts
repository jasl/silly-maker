// SPDX-License-Identifier: MIT

import type {
  CreatorFollowUpResultV1,
  CreatorPreviewPortV1,
  CreatorProgramRevisionApplyResultV1,
  CreatorProgramRevisionCandidateV1,
  CreatorProposalDecisionResultV1,
  CreatorSessionSnapshotV1,
  CreatorSubmitResultV1,
  ProgramProposalReferenceV1,
} from "./contracts.ts";
import { createCreatorSessionV1, createEmptyCreatorSessionSnapshotV1 } from "./creator-session.ts";
import type {
  ProgramRepositoryAggregateV1,
  ProgramRepositoryCommitResultV1,
  ProgramRepositorySummaryV1,
  ProgramRepositoryV1,
} from "./program-repository.ts";

export type CreatorDurabilityOperationV1 =
  | "catalog"
  | "open"
  | "create"
  | "revision"
  | "decision";

export type CreatorDurabilityStateV1 =
  | { readonly phase: "loading"; readonly operation: "catalog" | "open" }
  | { readonly phase: "ready" }
  | {
    readonly phase: "saving";
    readonly operation: "create" | "revision" | "decision";
  }
  | {
    readonly phase: "reconciling";
    readonly operation: "create" | "revision" | "decision";
  }
  | {
    readonly phase: "failed";
    readonly operation: CreatorDurabilityOperationV1;
    readonly code: string;
    readonly recovery: "retry" | "reconcile" | null;
  }
  | { readonly phase: "disposed" };

export interface CreatorControllerSnapshotV1 {
  readonly revision: number;
  readonly session: CreatorSessionSnapshotV1;
  readonly recentPrograms: readonly ProgramRepositorySummaryV1[];
  readonly durability: CreatorDurabilityStateV1;
}

export type CreatorControllerResultV1<T> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "busy" }
  | { readonly kind: "failed"; readonly code: string };

export interface CreatorControllerV1 {
  getSnapshot(): CreatorControllerSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  openProgram(programId: string): Promise<CreatorControllerResultV1<boolean>>;
  submitIntent(intent: string): Promise<CreatorControllerResultV1<CreatorSubmitResultV1>>;
  sendFollowUp(text: string): Promise<CreatorControllerResultV1<CreatorFollowUpResultV1>>;
  applyProgramRevisionCandidate(input: {
    readonly candidate: CreatorProgramRevisionCandidateV1;
    readonly finalAssistantReply: string;
  }): Promise<CreatorControllerResultV1<CreatorProgramRevisionApplyResultV1>>;
  acceptProposal(
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>>;
  rejectProposal(
    expected: ProgramProposalReferenceV1,
  ): Promise<CreatorControllerResultV1<CreatorProposalDecisionResultV1>>;
  openHome(): boolean;
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

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0 && code.length <= 128) return code;
  }
  return "repository_failed";
}

function sameSnapshotV1(
  left: CreatorSessionSnapshotV1,
  right: CreatorSessionSnapshotV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function summaryFromAggregateV1(
  aggregate: ProgramRepositoryAggregateV1,
): ProgramRepositorySummaryV1 {
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
  current: readonly ProgramRepositorySummaryV1[],
  aggregate: ProgramRepositoryAggregateV1,
): readonly ProgramRepositorySummaryV1[] {
  const summary = summaryFromAggregateV1(aggregate);
  return [summary, ...current.filter((candidate) => candidate.programId !== summary.programId)]
    .toSorted((left, right) =>
      right.updatedAt - left.updatedAt || left.programId.localeCompare(right.programId)
    );
}

function isMutationBusyV1(state: CreatorDurabilityStateV1): boolean {
  return state.phase === "saving" || state.phase === "reconciling";
}

export function createCreatorControllerV1(input: {
  readonly creator: CreatorPreviewPortV1;
  readonly createRepository: () => ProgramRepositoryV1;
  readonly createWorkspaceId?: () => string;
  readonly now?: () => number;
}): CreatorControllerV1 {
  const listeners = new Set<() => void>();
  const createWorkspaceId = input.createWorkspaceId ?? defaultWorkspaceIdV1;
  const now = input.now ?? Date.now;
  let repository = input.createRepository();
  let activeAggregate: ProgramRepositoryAggregateV1 | null = null;
  let retryCommand: RetryCommandV1 | null = null;
  let disposed = false;
  let snapshot: CreatorControllerSnapshotV1 = {
    revision: 0,
    session: createEmptyCreatorSessionSnapshotV1(input.creator.source),
    recentPrograms: [],
    durability: { phase: "loading", operation: "catalog" },
  };

  const publish = (next: Omit<CreatorControllerSnapshotV1, "revision">): void => {
    if (disposed) return;
    snapshot = { revision: snapshot.revision + 1, ...next };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Product observers cannot change repository/controller precedence.
      }
    }
  };

  const publishDurability = (durability: CreatorDurabilityStateV1): void => {
    publish({
      session: snapshot.session,
      recentPrograms: snapshot.recentPrograms,
      durability,
    });
  };

  const installAggregate = (aggregate: ProgramRepositoryAggregateV1): void => {
    if (disposed) return;
    activeAggregate = aggregate;
    retryCommand = null;
    publish({
      session: aggregate.snapshot,
      recentPrograms: upsertRecentV1(snapshot.recentPrograms, aggregate),
      durability: { phase: "ready" },
    });
  };

  const replaceRepository = async (): Promise<void> => {
    if (disposed) throw new TypeError("sillyos.creator_controller.disposed");
    const predecessor = repository;
    const successor = input.createRepository();
    await Promise.resolve(predecessor.dispose()).catch(() => undefined);
    if (disposed) {
      await Promise.resolve(successor.dispose()).catch(() => undefined);
      throw new TypeError("sillyos.creator_controller.disposed");
    }
    repository = successor;
    await successor.initialize();
  };

  const fail = (
    operation: CreatorDurabilityOperationV1,
    code: string,
    recovery: "retry" | "reconcile" | null,
    retry: RetryCommandV1 | null,
  ): CreatorControllerResultV1<never> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    retryCommand = retry;
    publishDurability({ phase: "failed", operation, code, recovery });
    return { kind: "failed", code };
  };

  const reconcileMutation = async (mutation: {
    readonly operation: "create" | "revision" | "decision";
    readonly programId: string;
    readonly previous: ProgramRepositoryAggregateV1 | null;
    readonly desiredSnapshot: CreatorSessionSnapshotV1;
    readonly retryMutation: RetryCommandV1;
  }): Promise<CreatorControllerResultV1<void>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    publishDurability({ phase: "reconciling", operation: mutation.operation });
    try {
      await replaceRepository();
      const durable = await repository.load(mutation.programId);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (durable !== null && sameSnapshotV1(durable.snapshot, mutation.desiredSnapshot)) {
        installAggregate(durable);
        return { kind: "completed", value: undefined };
      }
      if (
        (durable === null && mutation.previous === null) ||
        (durable !== null && mutation.previous !== null &&
          durable.repositoryRevision === mutation.previous.repositoryRevision &&
          sameSnapshotV1(durable.snapshot, mutation.previous.snapshot))
      ) {
        return fail(
          mutation.operation,
          "not_committed",
          "retry",
          mutation.retryMutation,
        );
      }
      if (durable !== null) installAggregate(durable);
      return fail(mutation.operation, "conflict", null, null);
    } catch (error) {
      if (disposed) return { kind: "failed", code: "disposed" };
      const code = failureCodeV1(error);
      const retryReconcile = () =>
        reconcileMutation(mutation).then((result) => result.kind === "completed");
      return fail(mutation.operation, code, "reconcile", retryReconcile);
    }
  };

  const runCommit = async <T>(mutation: {
    readonly operation: "create" | "revision" | "decision";
    readonly programId: string;
    readonly previous: ProgramRepositoryAggregateV1 | null;
    readonly desiredSnapshot: CreatorSessionSnapshotV1;
    readonly domainResult: T;
    readonly commit: (repository: ProgramRepositoryV1) => Promise<ProgramRepositoryCommitResultV1>;
  }): Promise<CreatorControllerResultV1<T>> => {
    if (disposed || isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
    const retryMutation = async (): Promise<boolean> => {
      const result = await runCommit(mutation);
      return result.kind === "completed";
    };
    publishDurability({ phase: "saving", operation: mutation.operation });
    try {
      const result = await mutation.commit(repository);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (result.kind === "conflict") {
        if (result.current !== null) installAggregate(result.current);
        return fail(mutation.operation, "conflict", null, null);
      }
      installAggregate(result.aggregate);
      return { kind: "completed", value: mutation.domainResult };
    } catch (error) {
      if (disposed) return { kind: "failed", code: "disposed" };
      const code = failureCodeV1(error);
      if (code === "outcome_unknown") {
        const reconciled = await reconcileMutation({
          operation: mutation.operation,
          programId: mutation.programId,
          previous: mutation.previous,
          desiredSnapshot: mutation.desiredSnapshot,
          retryMutation,
        });
        return reconciled.kind === "completed"
          ? { kind: "completed", value: mutation.domainResult }
          : reconciled;
      }
      return fail(mutation.operation, code, "retry", retryMutation);
    }
  };

  const initialize = async (): Promise<void> => {
    if (disposed) return;
    retryCommand = null;
    publishDurability({ phase: "loading", operation: "catalog" });
    try {
      await repository.initialize();
      const recentPrograms = await repository.list();
      if (disposed) return;
      publish({
        session: snapshot.session,
        recentPrograms,
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
    const previous = activeAggregate;
    if (previous === null) {
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    if (isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
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
      previous,
      desiredSnapshot,
      domainResult,
      commit: (candidateRepository) =>
        candidateRepository.decide({
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
    if (disposed || isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
    retryCommand = null;
    publishDurability({ phase: "loading", operation: "open" });
    try {
      const aggregate = await repository.load(programId);
      if (disposed) return { kind: "failed", code: "disposed" };
      if (aggregate === null) return fail("open", "not_found", null, null);
      installAggregate(aggregate);
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
      if (disposed || isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
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
        previous: null,
        desiredSnapshot,
        domainResult,
        commit: (candidateRepository) =>
          candidateRepository.create({ snapshot: desiredSnapshot, updatedAt }),
      });
    },
    async sendFollowUp(text) {
      const previous = activeAggregate;
      if (previous === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      if (isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
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
        previous,
        desiredSnapshot,
        domainResult,
        commit: (candidateRepository) =>
          candidateRepository.applyRevision({
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
    async applyProgramRevisionCandidate(candidateInput) {
      const previous = activeAggregate;
      if (previous === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      if (isMutationBusyV1(snapshot.durability)) return { kind: "busy" };
      const staged = createCreatorSessionV1({
        creator: input.creator,
        initialSnapshot: previous.snapshot,
      });
      const domainResult = staged.applyProgramRevisionCandidate(candidateInput);
      if (domainResult.kind !== "applied") {
        return { kind: "completed", value: domainResult };
      }
      const desiredSnapshot = staged.getSnapshot();
      const updatedAt = now();
      return runCommit({
        operation: "revision",
        programId: candidateInput.candidate.programId,
        previous,
        desiredSnapshot,
        domainResult,
        commit: (candidateRepository) =>
          candidateRepository.applyRevision({
            programId: candidateInput.candidate.programId,
            expectedRepositoryRevision: previous.repositoryRevision,
            expectedBase: {
              proposalId: candidateInput.candidate.proposalId,
              programId: candidateInput.candidate.programId,
              baseProgramRevision: candidateInput.candidate.baseProgramRevision,
            },
            snapshot: desiredSnapshot,
            updatedAt,
          }),
      });
    },
    acceptProposal: (expected) => decide("accepted", expected),
    rejectProposal: (expected) => decide("rejected", expected),
    openHome() {
      if (disposed || isMutationBusyV1(snapshot.durability)) return false;
      activeAggregate = null;
      retryCommand = null;
      publish({
        session: createEmptyCreatorSessionSnapshotV1(input.creator.source),
        recentPrograms: snapshot.recentPrograms,
        durability: { phase: "ready" },
      });
      return true;
    },
    async retry() {
      if (disposed || retryCommand === null || isMutationBusyV1(snapshot.durability)) return false;
      const command = retryCommand;
      retryCommand = null;
      return command();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      retryCommand = null;
      await Promise.resolve(repository.dispose()).catch(() => undefined);
      snapshot = {
        revision: snapshot.revision + 1,
        session: snapshot.session,
        recentPrograms: snapshot.recentPrograms,
        durability: { phase: "disposed" },
      };
      listeners.clear();
    },
  };
}
