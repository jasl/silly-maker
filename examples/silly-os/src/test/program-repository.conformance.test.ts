// SPDX-License-Identifier: MIT

import { IDBFactory as FakeIDBFactory, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createIndexedDbProgramRepositoryV4,
  programRepositoryDatabaseVersionV4,
  programRepositoryProgramObjectStoreNameV4,
  programRepositoryWorkspaceContinuationObjectStoreNameV4,
} from "../product/indexeddb-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV3,
  createMemoryProgramRepositoryV3,
} from "../product/memory-program-repository.ts";
import {
  admitBrowserProgramContinuationManifestV1,
  admitProgramRepositoryAggregateV3,
  browserProgramContinuationMatchesAggregateV1,
  programRepositoryMaximumAgentRunReceiptsV3,
  programRepositoryMaximumProgramsV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryApplyRevisionInputV3,
  type ProgramRepositoryDecideInputV3,
  type ProgramRepositoryReviewedHeadV3,
  type ProgramRepositorySettleAgentRunInputV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "../product/program-repository.ts";
import type {
  CreatorAgentRunOutcomeV1,
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalRunV1,
  CreatorSessionSnapshotV1,
  CreatorSessionV1,
  ProgramProposalReferenceV1,
} from "../product/contracts.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";

interface RepositoryHarnessV3 {
  open(): ProgramRepositoryWithWorkspaceContinuationV1;
}

interface ProgramFixtureV1 {
  readonly session: CreatorSessionV1;
  readonly initial: CreatorSessionSnapshotV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3;
}

function createMemoryHarnessV3(): RepositoryHarnessV3 {
  const backing = createMemoryProgramRepositoryBackingV3();
  return { open: () => createMemoryProgramRepositoryV3({ backing }) };
}

function createIndexedDbHarnessV4(): RepositoryHarnessV3 {
  const indexedDB = new FakeIDBFactory();
  return {
    open: () =>
      createIndexedDbProgramRepositoryV4({
        indexedDB,
        databaseName: "sillyos-program-repository-conformance",
      }),
  };
}

function requireCurrentProgramV1(snapshot: CreatorSessionSnapshotV1) {
  const program = snapshot.program;
  const proposal = snapshot.proposal;
  const workspace = snapshot.workspace;
  if (program === null || proposal === null || workspace === null) {
    throw new Error("expected current Program workspace");
  }
  return { program, proposal, workspace };
}

function createProgramFixtureV1(workspaceId: string): ProgramFixtureV1 {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const created = session.submitIntent("Draft a short story with an explicit review step.");
  if (created.kind !== "created") throw new Error("expected Program creation");
  const initial = session.getSnapshot();
  const { program, workspace } = requireCurrentProgramV1(initial);
  return {
    session,
    initial,
    continuation: {
      revision: 1,
      programId: program.programId,
      workspaceId: workspace.workspaceId,
      volumeId: `${workspaceId}.volume.1`,
      workspaceFormat: 1,
      programRevision: 1,
      repositoryRevision: 1,
    },
    reviewedHead: {
      checkpointId: `${workspaceId}.checkpoint.1`,
      generation: 1,
    },
  };
}

function createInputV1(fixture: ProgramFixtureV1, updatedAt = 1) {
  return {
    snapshot: fixture.initial,
    updatedAt,
    continuation: fixture.continuation,
    reviewedHead: fixture.reviewedHead,
  } as const;
}

function expectedProposalV1(snapshot: CreatorSessionSnapshotV1): ProgramProposalReferenceV1 {
  const { proposal } = requireCurrentProgramV1(snapshot);
  return {
    proposalId: proposal.proposalId,
    programRevision: proposal.programRevision,
  };
}

function snapshotReceiptV1(
  binding: NonNullable<ProgramRepositoryAggregateV3["reviewBinding"]>,
  ordinal: number,
): ProgramWorkspaceSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: `snapshot.${String(ordinal)}`,
    programId: binding.programId,
    workspaceId: binding.workspaceId,
    volumeId: binding.volumeId,
    workspaceFormat: binding.workspaceFormat,
    proposalId: binding.proposalId,
    programRevision: binding.programRevision,
    baseRepositoryRevision: binding.repositoryRevision,
    checkpointId: binding.checkpointId,
    generation: binding.generation,
    fileCount: ordinal,
    archiveBytes: ordinal * 100,
  };
}

async function requireContinuationV1(
  repository: ProgramRepositoryWithWorkspaceContinuationV1,
  programId: string,
): Promise<BrowserProgramContinuationManifestV1> {
  const continuation = await repository.loadWorkspaceContinuation(programId);
  if (continuation === null) throw new Error("expected Program continuation");
  return continuation;
}

async function applyFollowUpV1(input: {
  readonly repository: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly session: CreatorSessionV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly text: string;
  readonly reviewedHead: ProgramRepositoryReviewedHeadV3;
  readonly updatedAt: number;
}): Promise<ProgramRepositoryAggregateV3> {
  const before = input.session.getSnapshot();
  const { program, proposal } = requireCurrentProgramV1(before);
  const followUp = input.session.sendFollowUp(input.text);
  if (followUp.kind !== "sent") throw new Error("expected Program revision");
  const mutation = {
    programId: program.programId,
    expectedRepositoryRevision: input.continuation.repositoryRevision,
    expectedBase: {
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
    },
    snapshot: input.session.getSnapshot(),
    continuation: input.continuation,
    reviewedHead: input.reviewedHead,
    updatedAt: input.updatedAt,
  } satisfies ProgramRepositoryApplyRevisionInputV3;
  const result = await input.repository.applyRevision(mutation);
  if (result.kind !== "committed") throw new Error("expected committed Program revision");
  return result.aggregate;
}

async function decideV1(input: {
  readonly repository: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly session: CreatorSessionV1;
  readonly continuation: BrowserProgramContinuationManifestV1;
  readonly aggregate: ProgramRepositoryAggregateV3;
  readonly status: "accepted" | "rejected";
  readonly updatedAt: number;
  readonly receiptOrdinal?: number;
}): Promise<{
  readonly aggregate: ProgramRepositoryAggregateV3;
  readonly mutation: ProgramRepositoryDecideInputV3;
}> {
  const before = input.session.getSnapshot();
  const { program } = requireCurrentProgramV1(before);
  const expectedProposal = expectedProposalV1(before);
  const decision = input.status === "accepted"
    ? input.session.acceptProposal(expectedProposal)
    : input.session.rejectProposal(expectedProposal);
  if (decision.kind !== "applied") throw new Error(`expected ${input.status} decision`);
  const base = {
    programId: program.programId,
    expectedRepositoryRevision: input.continuation.repositoryRevision,
    expectedProposal,
    snapshot: input.session.getSnapshot(),
    continuation: input.continuation,
    updatedAt: input.updatedAt,
  } as const;
  const binding = input.aggregate.reviewBinding;
  if (binding === null) throw new Error("expected review binding");
  const mutation: ProgramRepositoryDecideInputV3 = input.status === "accepted"
    ? {
      ...base,
      status: "accepted",
      snapshotReceipt: snapshotReceiptV1(binding, input.receiptOrdinal ?? 1),
    }
    : { ...base, status: "rejected" };
  const result = await input.repository.decide(mutation);
  if (result.kind !== "committed") throw new Error(`expected committed ${input.status} decision`);
  return { aggregate: result.aggregate, mutation };
}

function currentAgentRunV1(input: {
  readonly session: CreatorSessionV1;
  readonly agentRunId: string;
  readonly baseRepositoryRevision: number;
}): CreatorAgentRunRequestV1 {
  const { program, proposal } = requireCurrentProgramV1(input.session.getSnapshot());
  return {
    agentRunId: input.agentRunId,
    proposalId: proposal.proposalId,
    programId: program.programId,
    baseProgramRevision: program.revision,
    baseRepositoryRevision: input.baseRepositoryRevision,
    text: `Apply Agent run ${input.agentRunId}.`,
  };
}

function agentTerminalV1(
  run: CreatorAgentRunRequestV1,
  outcome: CreatorAgentRunOutcomeV1,
): CreatorAgentTerminalRunV1 {
  if (outcome === "completed") {
    return {
      run,
      outcome,
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: `Requirement from ${run.agentRunId}.`,
      },
      finalAssistantReply: `Completed ${run.agentRunId}.`,
    };
  }
  if (outcome === "failed") return { run, outcome, diagnosticCode: "request_failed" };
  return { run, outcome };
}

function applyAgentTerminalV1(
  session: CreatorSessionV1,
  terminal: CreatorAgentTerminalRunV1,
): void {
  const result = session.applyAgentRunTerminal(terminal);
  if (result.kind !== "applied" || result.outcome !== terminal.outcome) {
    throw new Error(`expected applied ${terminal.outcome} Agent terminal`);
  }
}

for (
  const [name, createHarness] of [
    ["memory", createMemoryHarnessV3],
    ["IndexedDB", createIndexedDbHarnessV4],
  ] as const
) {
  describe(`ProgramRepositoryV3 ${name} conformance`, () => {
    it("creates and reopens one mandatory aggregate/continuation/review-head unit", async () => {
      const harness = createHarness();
      const first = harness.open();
      const second = harness.open();
      const fixture = createProgramFixtureV1(`workspace.${name.toLowerCase()}.create`);
      const { program } = requireCurrentProgramV1(fixture.initial);
      const input = createInputV1(fixture, 100);

      await Promise.all([first.initialize(), second.initialize()]);
      const created = await first.create(input);
      expect(created).toMatchObject({
        kind: "committed",
        aggregate: {
          schemaVersion: 3,
          repositoryRevision: 1,
          reviewBinding: {
            baseAcceptedProgramRevision: null,
            repositoryRevision: 1,
            checkpointId: fixture.reviewedHead.checkpointId,
            generation: 1,
          },
        },
      });
      await expect(second.loadWorkspaceContinuation(program.programId)).resolves.toEqual(
        fixture.continuation,
      );
      await expect(second.create(input)).resolves.toMatchObject({ kind: "unchanged" });
      await expect(second.list()).resolves.toEqual([
        expect.objectContaining({
          programId: program.programId,
          programRevision: 1,
          proposalStatus: "pending",
          repositoryRevision: 1,
        }),
      ]);

      if (created.kind !== "committed") throw new Error("expected commit");
      (created.aggregate as { snapshot: { revision: number } }).snapshot.revision = 999;
      (fixture.continuation as { volumeId: string }).volumeId = "mutated.volume";
      expect((await first.load(program.programId))?.snapshot.revision).toBe(1);
      expect((await first.loadWorkspaceContinuation(program.programId))?.volumeId).not.toBe(
        "mutated.volume",
      );

      await Promise.all([first.dispose(), second.dispose()]);
      const reopened = harness.open();
      await expect(reopened.load(program.programId)).resolves.toMatchObject({
        repositoryRevision: 1,
        reviewBinding: { checkpointId: fixture.reviewedHead.checkpointId },
      });
      await reopened.dispose();
    });

    it("replays one exact revision and rejects stale two-client or altered predecessor CAS", async () => {
      const harness = createHarness();
      const first = harness.open();
      const second = harness.open();
      const fixture = createProgramFixtureV1(`workspace.${name.toLowerCase()}.revision-replay`);
      const created = await first.create(createInputV1(fixture, 100));
      if (created.kind !== "committed") throw new Error("expected create");
      const before = fixture.session.getSnapshot();
      const { program, proposal } = requireCurrentProgramV1(before);
      if (fixture.session.sendFollowUp("Use a compact outline.").kind !== "sent") {
        throw new Error("expected follow-up");
      }
      const mutation = {
        programId: program.programId,
        expectedRepositoryRevision: 1,
        expectedBase: {
          proposalId: proposal.proposalId,
          programId: program.programId,
          baseProgramRevision: program.revision,
        },
        snapshot: fixture.session.getSnapshot(),
        continuation: fixture.continuation,
        reviewedHead: { checkpointId: "checkpoint.replay.2", generation: 2 },
        updatedAt: 200,
      } satisfies ProgramRepositoryApplyRevisionInputV3;
      const revised = await second.applyRevision(mutation);
      if (revised.kind !== "committed") throw new Error("expected revision");
      await expect(first.applyRevision(mutation)).resolves.toEqual({
        kind: "unchanged",
        aggregate: revised.aggregate,
      });
      await expect(first.applyRevision({
        ...mutation,
        updatedAt: 201,
      })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
      await expect(first.applyRevision({
        ...mutation,
        reviewedHead: { checkpointId: "checkpoint.replay.wrong", generation: 2 },
      })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
      await expect(first.applyRevision({
        ...mutation,
        continuation: { ...mutation.continuation, volumeId: "volume.wrong" },
      })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
      await Promise.all([first.dispose(), second.dispose()]);
    });

    it("advances accepted/rejected review state without letting Reject advance the accepted base", async () => {
      const repository = createHarness().open();
      const fixture = createProgramFixtureV1(`workspace.${name.toLowerCase()}.state`);
      const createInput = createInputV1(fixture, 100);
      const created = await repository.create(createInput);
      if (created.kind !== "committed") throw new Error("expected create");
      const programId = created.aggregate.programId;

      let continuation = await requireContinuationV1(repository, programId);
      const revision2 = await applyFollowUpV1({
        repository,
        session: fixture.session,
        continuation,
        text: "Start with a three-act outline.",
        reviewedHead: { checkpointId: "checkpoint.revision.2", generation: 2 },
        updatedAt: 200,
      });
      expect(revision2.reviewBinding).toMatchObject({
        programRevision: 2,
        baseAcceptedProgramRevision: null,
        repositoryRevision: 2,
        checkpointId: "checkpoint.revision.2",
        generation: 2,
      });

      continuation = await requireContinuationV1(repository, programId);
      const accepted = await decideV1({
        repository,
        session: fixture.session,
        continuation,
        aggregate: revision2,
        status: "accepted",
        updatedAt: 300,
      });
      expect(accepted.aggregate.reviewBinding).toBeNull();
      const acceptedDecision = accepted.aggregate.decisions[0];
      expect(acceptedDecision).toEqual({
        proposalId: revision2.reviewBinding?.proposalId,
        programRevision: 2,
        status: "accepted",
        repositoryRevision: 3,
        snapshot: snapshotReceiptV1(
          revision2.reviewBinding ?? (() => {
            throw new Error("expected binding");
          })(),
          1,
        ),
      });
      await expect(repository.decide(accepted.mutation)).resolves.toEqual({
        kind: "unchanged",
        aggregate: accepted.aggregate,
      });
      if (accepted.mutation.status !== "accepted") throw new Error("expected accepted mutation");
      await expect(repository.decide({
        ...accepted.mutation,
        snapshotReceipt: { ...accepted.mutation.snapshotReceipt, archiveBytes: 101 },
      })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 3 } });

      continuation = await requireContinuationV1(repository, programId);
      const revision3 = await applyFollowUpV1({
        repository,
        session: fixture.session,
        continuation,
        text: "Make the ending hopeful.",
        reviewedHead: { checkpointId: "checkpoint.revision.3", generation: 3 },
        updatedAt: 400,
      });
      expect(revision3.reviewBinding?.baseAcceptedProgramRevision).toBe(2);

      continuation = await requireContinuationV1(repository, programId);
      const rejected = await decideV1({
        repository,
        session: fixture.session,
        continuation,
        aggregate: revision3,
        status: "rejected",
        updatedAt: 500,
      });
      expect(rejected.aggregate.reviewBinding).toBeNull();
      const rejectedDecision = rejected.aggregate.decisions.at(-1);
      expect(rejectedDecision).toEqual({
        proposalId: revision3.reviewBinding?.proposalId,
        programRevision: 3,
        status: "rejected",
        repositoryRevision: 5,
      });
      expect(Object.hasOwn(rejectedDecision ?? {}, "snapshot")).toBe(false);

      continuation = await requireContinuationV1(repository, programId);
      const staleVolumeContinuation = { ...continuation, volumeId: "volume.wrong" };
      const beforeRejectedFollowUp = fixture.session.getSnapshot();
      const { program: rejectedProgram, proposal: rejectedProposal } = requireCurrentProgramV1(
        beforeRejectedFollowUp,
      );
      if (fixture.session.sendFollowUp("Use a tighter opening.").kind !== "sent") {
        throw new Error("expected follow-up");
      }
      const revision4Input = {
        programId,
        expectedRepositoryRevision: continuation.repositoryRevision,
        expectedBase: {
          proposalId: rejectedProposal.proposalId,
          programId,
          baseProgramRevision: rejectedProgram.revision,
        },
        snapshot: fixture.session.getSnapshot(),
        continuation: staleVolumeContinuation,
        reviewedHead: { checkpointId: "checkpoint.revision.4", generation: 4 },
        updatedAt: 600,
      } satisfies ProgramRepositoryApplyRevisionInputV3;
      await expect(repository.applyRevision(revision4Input)).resolves.toMatchObject({
        kind: "conflict",
        current: { repositoryRevision: 5 },
      });
      const revision4 = await repository.applyRevision({
        ...revision4Input,
        continuation,
      });
      if (revision4.kind !== "committed") throw new Error("expected revision 4");
      expect(revision4.aggregate.reviewBinding).toMatchObject({
        programRevision: 4,
        baseAcceptedProgramRevision: 2,
        repositoryRevision: 6,
      });
      await expect(repository.loadWorkspaceContinuation(programId)).resolves.toMatchObject({
        programRevision: 4,
        repositoryRevision: 6,
        volumeId: createInput.continuation.volumeId,
      });
      await repository.dispose();
    });

    it("keeps first-Reject volume ownership in the continuation and replays Reject exactly", async () => {
      const repository = createHarness().open();
      const fixture = createProgramFixtureV1(`workspace.${name.toLowerCase()}.first-reject`);
      const created = await repository.create(createInputV1(fixture, 1));
      if (created.kind !== "committed") throw new Error("expected create");
      const rejected = await decideV1({
        repository,
        session: fixture.session,
        continuation: fixture.continuation,
        aggregate: created.aggregate,
        status: "rejected",
        updatedAt: 2,
      });
      await expect(repository.decide(rejected.mutation)).resolves.toEqual({
        kind: "unchanged",
        aggregate: rejected.aggregate,
      });
      await expect(repository.decide({
        ...rejected.mutation,
        continuation: { ...rejected.mutation.continuation, volumeId: "volume.wrong" },
      })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });

      const continuation = await requireContinuationV1(repository, created.aggregate.programId);
      const before = fixture.session.getSnapshot();
      const { program, proposal } = requireCurrentProgramV1(before);
      if (fixture.session.sendFollowUp("Try a different direction.").kind !== "sent") {
        throw new Error("expected post-Reject follow-up");
      }
      const mutation = {
        programId: program.programId,
        expectedRepositoryRevision: 2,
        expectedBase: {
          proposalId: proposal.proposalId,
          programId: program.programId,
          baseProgramRevision: program.revision,
        },
        snapshot: fixture.session.getSnapshot(),
        continuation: { ...continuation, volumeId: "volume.wrong" },
        reviewedHead: { checkpointId: "checkpoint.after-reject.2", generation: 2 },
        updatedAt: 3,
      } satisfies ProgramRepositoryApplyRevisionInputV3;
      await expect(repository.applyRevision(mutation)).resolves.toMatchObject({
        kind: "conflict",
        current: { repositoryRevision: 2 },
      });
      await expect(repository.load(created.aggregate.programId)).resolves.toEqual(
        rejected.aggregate,
      );
      await expect(repository.loadWorkspaceContinuation(created.aggregate.programId)).resolves
        .toEqual(continuation);
      await repository.dispose();
    });

    it("replaces reviewed heads only for producing Agent outcomes and fences exact replays", async () => {
      for (
        const outcome of [
          "completed",
          "failed",
          "cancelled",
          "replaced",
        ] as const satisfies readonly CreatorAgentRunOutcomeV1[]
      ) {
        const repository = createHarness().open();
        const fixture = createProgramFixtureV1(
          `workspace.${name.toLowerCase()}.agent.${outcome}`,
        );
        const created = await repository.create(createInputV1(fixture, 1));
        if (created.kind !== "committed") throw new Error("expected create");
        const run = currentAgentRunV1({
          session: fixture.session,
          agentRunId: `agent-run.${name.toLowerCase()}.${outcome}`,
          baseRepositoryRevision: 1,
        });
        const terminal = agentTerminalV1(run, outcome);
        applyAgentTerminalV1(fixture.session, terminal);
        const reviewedHead = outcome === "completed"
          ? { checkpointId: `checkpoint.agent.${outcome}`, generation: 2 }
          : null;
        const mutation = {
          programId: run.programId,
          expectedRepositoryRevision: 1,
          terminal,
          snapshot: fixture.session.getSnapshot(),
          continuation: fixture.continuation,
          reviewedHead,
          updatedAt: 2,
        } satisfies ProgramRepositorySettleAgentRunInputV3;
        const settled = await repository.settleAgentRun(mutation);
        if (settled.kind !== "committed") throw new Error("expected Agent settlement");
        expect(settled.aggregate.repositoryRevision).toBe(2);
        expect(settled.aggregate.reviewBinding).toMatchObject({
          programRevision: outcome === "completed" ? 2 : 1,
          repositoryRevision: 2,
          checkpointId: reviewedHead?.checkpointId ?? fixture.reviewedHead.checkpointId,
          generation: reviewedHead?.generation ?? fixture.reviewedHead.generation,
        });
        await expect(repository.loadWorkspaceContinuation(run.programId)).resolves.toMatchObject({
          programRevision: outcome === "completed" ? 2 : 1,
          repositoryRevision: 2,
          volumeId: fixture.continuation.volumeId,
        });
        await expect(repository.settleAgentRun(mutation)).resolves.toEqual({
          kind: "unchanged",
          aggregate: settled.aggregate,
        });
        await expect(repository.settleAgentRun({
          ...mutation,
          continuation: { ...mutation.continuation, volumeId: "volume.wrong" },
        })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
        await expect(repository.settleAgentRun({
          ...mutation,
          expectedRepositoryRevision: 2,
          continuation: { ...mutation.continuation, repositoryRevision: 2 },
        })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
        if (outcome === "completed") {
          await expect(repository.settleAgentRun({
            ...mutation,
            reviewedHead: { checkpointId: "checkpoint.agent.wrong", generation: 2 },
          })).resolves.toMatchObject({ kind: "conflict", current: { repositoryRevision: 2 } });
        }
        await repository.dispose();
      }
    });

    it("enforces receipt and Program bounds without partially advancing the pair", async () => {
      const repository = createHarness().open();
      const fixture = createProgramFixtureV1(`workspace.${name.toLowerCase()}.receipt-bound`);
      const created = await repository.create(createInputV1(fixture, 1));
      if (created.kind !== "committed") throw new Error("expected create");
      const programId = created.aggregate.programId;
      for (let index = 0; index < programRepositoryMaximumAgentRunReceiptsV3; index += 1) {
        const continuation = await requireContinuationV1(repository, programId);
        const run = currentAgentRunV1({
          session: fixture.session,
          agentRunId: `agent-run.bound.${name.toLowerCase()}.${String(index + 1)}`,
          baseRepositoryRevision: continuation.repositoryRevision,
        });
        const terminal = agentTerminalV1(run, "cancelled");
        applyAgentTerminalV1(fixture.session, terminal);
        await expect(repository.settleAgentRun({
          programId,
          expectedRepositoryRevision: continuation.repositoryRevision,
          terminal,
          snapshot: fixture.session.getSnapshot(),
          continuation,
          reviewedHead: null,
          updatedAt: index + 2,
        })).resolves.toMatchObject({ kind: "committed" });
      }
      const beforeOverflow = await repository.load(programId);
      const continuationBeforeOverflow = await requireContinuationV1(repository, programId);
      if (beforeOverflow === null) throw new Error("expected bounded Program");
      const overflowRun = currentAgentRunV1({
        session: fixture.session,
        agentRunId: `agent-run.bound.${name.toLowerCase()}.overflow`,
        baseRepositoryRevision: continuationBeforeOverflow.repositoryRevision,
      });
      const overflowTerminal = agentTerminalV1(overflowRun, "cancelled");
      applyAgentTerminalV1(fixture.session, overflowTerminal);
      await expect(repository.settleAgentRun({
        programId,
        expectedRepositoryRevision: continuationBeforeOverflow.repositoryRevision,
        terminal: overflowTerminal,
        snapshot: fixture.session.getSnapshot(),
        continuation: continuationBeforeOverflow,
        reviewedHead: null,
        updatedAt: continuationBeforeOverflow.repositoryRevision + 1,
      })).rejects.toBeInstanceOf(TypeError);
      expect(await repository.load(programId)).toEqual(beforeOverflow);
      expect(await repository.loadWorkspaceContinuation(programId)).toEqual(
        continuationBeforeOverflow,
      );
      await repository.dispose();

      const capacityRepository = createHarness().open();
      let firstInput: ReturnType<typeof createInputV1> | undefined;
      for (let index = 0; index < programRepositoryMaximumProgramsV3; index += 1) {
        const capacityFixture = createProgramFixtureV1(
          `workspace.${name.toLowerCase()}.capacity.${String(index + 1)}`,
        );
        const input = createInputV1(capacityFixture, index + 1);
        firstInput ??= input;
        await expect(capacityRepository.create(input)).resolves.toMatchObject({
          kind: "committed",
        });
      }
      if (firstInput === undefined) throw new Error("expected first capacity input");
      await expect(capacityRepository.create(firstInput)).resolves.toMatchObject({
        kind: "unchanged",
      });
      const overflowFixture = createProgramFixtureV1(
        `workspace.${name.toLowerCase()}.capacity.overflow`,
      );
      await expect(capacityRepository.create(createInputV1(overflowFixture, 100))).rejects
        .toMatchObject({ code: "quota_exceeded", operation: "create" });
      expect(await capacityRepository.list()).toHaveLength(programRepositoryMaximumProgramsV3);
      await capacityRepository.dispose();
    });

    it("returns a stable disposed failure", async () => {
      const repository = createHarness().open();
      await repository.dispose();
      await expect(repository.list()).rejects.toMatchObject({
        code: "disposed",
        operation: "list",
      });
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

class OneShotThrowingMapV1<TKey, TValue> extends Map<TKey, TValue> {
  #armed = false;

  arm(): void {
    this.#armed = true;
  }

  override set(key: TKey, value: TValue): this {
    if (this.#armed) {
      this.#armed = false;
      throw new Error("synthetic memory write failure");
    }
    return super.set(key, value);
  }
}

describe("ProgramRepositoryV3 strict admission and pair integrity", () => {
  it("rejects schema, binding, and accepted/rejected decision shape mutations", async () => {
    const repository = createMemoryProgramRepositoryV3();
    const fixture = createProgramFixtureV1("workspace.admission.state");
    const created = await repository.create(createInputV1(fixture, 1));
    if (created.kind !== "committed" || created.aggregate.reviewBinding === null) {
      throw new Error("expected pending Program");
    }
    expect(admitProgramRepositoryAggregateV3(created.aggregate).kind).toBe("admitted");
    expect(admitProgramRepositoryAggregateV3({
      ...created.aggregate,
      schemaVersion: 2,
    })).toEqual({ kind: "rejected", path: "/schemaVersion" });
    expect(admitProgramRepositoryAggregateV3({
      ...created.aggregate,
      reviewBinding: null,
    })).toEqual({ kind: "rejected", path: "/reviewBinding" });
    expect(admitProgramRepositoryAggregateV3({
      ...created.aggregate,
      reviewBinding: { ...created.aggregate.reviewBinding, repositoryRevision: 2 },
    })).toEqual({ kind: "rejected", path: "/reviewBinding" });
    expect(admitProgramRepositoryAggregateV3({
      ...created.aggregate,
      reviewBinding: { ...created.aggregate.reviewBinding, baseAcceptedProgramRevision: 1 },
    })).toEqual({ kind: "rejected", path: "/reviewBinding" });

    const impossibleFixture = createProgramFixtureV1("workspace.admission.unreachable");
    const impossibleCreated = await repository.create(createInputV1(impossibleFixture, 1));
    if (impossibleCreated.kind !== "committed") throw new Error("expected second create");
    const impossibleExpected = expectedProposalV1(impossibleFixture.initial);
    if (impossibleFixture.session.rejectProposal(impossibleExpected).kind !== "applied") {
      throw new Error("expected reject");
    }
    const impossibleDecision = {
      proposalId: impossibleExpected.proposalId,
      programRevision: impossibleExpected.programRevision,
      status: "rejected" as const,
      repositoryRevision: 1,
    };
    expect(admitProgramRepositoryAggregateV3({
      ...impossibleCreated.aggregate,
      snapshot: impossibleFixture.session.getSnapshot(),
      decisions: [impossibleDecision],
      reviewBinding: null,
    })).toEqual({
      kind: "rejected",
      path: "/decisions/0/repositoryRevision",
    });
    expect(admitProgramRepositoryAggregateV3({
      ...impossibleCreated.aggregate,
      repositoryRevision: 3,
      snapshot: impossibleFixture.session.getSnapshot(),
      decisions: [{ ...impossibleDecision, repositoryRevision: 2 }],
      reviewBinding: null,
    })).toEqual({ kind: "rejected", path: "/snapshot/proposal/status" });

    const expected = expectedProposalV1(fixture.session.getSnapshot());
    const decision = fixture.session.acceptProposal(expected);
    if (decision.kind !== "applied") throw new Error("expected accept");
    const receipt = snapshotReceiptV1(created.aggregate.reviewBinding, 1);
    const accepted = await repository.decide({
      programId: created.aggregate.programId,
      expectedRepositoryRevision: 1,
      expectedProposal: expected,
      status: "accepted",
      snapshot: fixture.session.getSnapshot(),
      continuation: fixture.continuation,
      snapshotReceipt: receipt,
      updatedAt: 2,
    });
    if (accepted.kind !== "committed") throw new Error("expected accept commit");
    const acceptedDecision = accepted.aggregate.decisions[0];
    expect(admitProgramRepositoryAggregateV3({
      ...accepted.aggregate,
      reviewBinding: created.aggregate.reviewBinding,
    })).toEqual({ kind: "rejected", path: "/reviewBinding" });
    expect(admitProgramRepositoryAggregateV3({
      ...accepted.aggregate,
      decisions: [{
        proposalId: acceptedDecision?.proposalId,
        programRevision: acceptedDecision?.programRevision,
        status: "accepted",
        repositoryRevision: acceptedDecision?.repositoryRevision,
      }],
    })).toEqual({ kind: "rejected", path: "/decisions/0/status" });
    expect(admitProgramRepositoryAggregateV3({
      ...accepted.aggregate,
      decisions: [{ ...acceptedDecision, status: "rejected" }],
    })).toEqual({ kind: "rejected", path: "/decisions/0/status" });
    expect(admitProgramRepositoryAggregateV3({
      ...accepted.aggregate,
      decisions: [{
        ...acceptedDecision,
        snapshot: { ...receipt, baseRepositoryRevision: 2 },
      }],
    })).toEqual({ kind: "rejected", path: "/decisions/0/snapshot" });
    await repository.dispose();
  });

  it("admits only exact continuations and fails closed for every broken memory pair", async () => {
    const fixture = createProgramFixtureV1("workspace.memory.pair");
    expect(admitBrowserProgramContinuationManifestV1(fixture.continuation)).toEqual({
      kind: "admitted",
      value: fixture.continuation,
    });
    expect(admitBrowserProgramContinuationManifestV1({
      ...fixture.continuation,
      unexpected: true,
    })).toEqual({ kind: "rejected", path: "/" });

    const missingBacking = createMemoryProgramRepositoryBackingV3();
    const missingWriter = createMemoryProgramRepositoryV3({ backing: missingBacking });
    const created = await missingWriter.create(createInputV1(fixture, 1));
    if (created.kind !== "committed") throw new Error("expected create");
    await missingWriter.dispose();
    missingBacking.workspaceContinuations.delete(created.aggregate.programId);
    const missing = createMemoryProgramRepositoryV3({ backing: missingBacking });
    await expect(missing.load(created.aggregate.programId)).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load",
    });
    await expect(missing.loadWorkspaceContinuation(created.aggregate.programId)).rejects
      .toMatchObject({ code: "schema_invalid", operation: "load_workspace_continuation" });
    await expect(missing.list()).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "list",
    });
    await expect(missing.create(createInputV1(fixture, 1))).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "create",
    });
    await missing.dispose();

    const orphanBacking = createMemoryProgramRepositoryBackingV3();
    orphanBacking.workspaceContinuations.set(
      fixture.continuation.programId,
      fixture.continuation,
    );
    const orphan = createMemoryProgramRepositoryV3({ backing: orphanBacking });
    await expect(orphan.loadWorkspaceContinuation(fixture.continuation.programId)).rejects
      .toMatchObject({ code: "schema_invalid" });
    await orphan.dispose();

    const mismatchBacking = createMemoryProgramRepositoryBackingV3();
    mismatchBacking.programs.set(created.aggregate.programId, created.aggregate);
    mismatchBacking.workspaceContinuations.set(created.aggregate.programId, {
      ...fixture.continuation,
      repositoryRevision: 2,
    });
    const mismatch = createMemoryProgramRepositoryV3({ backing: mismatchBacking });
    await expect(mismatch.load(created.aggregate.programId)).rejects.toMatchObject({
      code: "schema_invalid",
    });
    expect(browserProgramContinuationMatchesAggregateV1(
      { ...fixture.continuation, repositoryRevision: 2 },
      created.aggregate,
    )).toBe(false);
    await mismatch.dispose();
  });

  it("rolls back both memory rows when create or mutation loses its second write", async () => {
    const continuationRows = new OneShotThrowingMapV1<
      string,
      BrowserProgramContinuationManifestV1
    >();
    const backing = {
      programs: new Map<string, ProgramRepositoryAggregateV3>(),
      workspaceContinuations: continuationRows,
    };
    const repository = createMemoryProgramRepositoryV3({ backing });
    const fixture = createProgramFixtureV1("workspace.memory.atomic");
    const createInput = createInputV1(fixture, 1);
    continuationRows.arm();
    await expect(repository.create(createInput)).rejects.toMatchObject({
      code: "transaction_aborted",
      operation: "create",
    });
    expect(backing.programs.size).toBe(0);
    expect(backing.workspaceContinuations.size).toBe(0);

    const created = await repository.create(createInput);
    if (created.kind !== "committed") throw new Error("expected retry create");
    const continuation = await requireContinuationV1(repository, created.aggregate.programId);
    const before = fixture.session.getSnapshot();
    const { program, proposal } = requireCurrentProgramV1(before);
    if (fixture.session.sendFollowUp("Add one concise scene.").kind !== "sent") {
      throw new Error("expected follow-up");
    }
    const mutation = {
      programId: program.programId,
      expectedRepositoryRevision: 1,
      expectedBase: {
        proposalId: proposal.proposalId,
        programId: program.programId,
        baseProgramRevision: program.revision,
      },
      snapshot: fixture.session.getSnapshot(),
      continuation,
      reviewedHead: { checkpointId: "checkpoint.memory.atomic.2", generation: 2 },
      updatedAt: 2,
    } satisfies ProgramRepositoryApplyRevisionInputV3;
    continuationRows.arm();
    await expect(repository.applyRevision(mutation)).rejects.toMatchObject({
      code: "transaction_aborted",
      operation: "apply_revision",
    });
    expect(await repository.load(program.programId)).toEqual(created.aggregate);
    expect(await repository.loadWorkspaceContinuation(program.programId)).toEqual(continuation);
    await expect(repository.applyRevision(mutation)).resolves.toMatchObject({
      kind: "committed",
      aggregate: { repositoryRevision: 2 },
    });
    await repository.dispose();
  });

  it("rejects decided-current drift and cross-event repository revision collisions", async () => {
    const repository = createMemoryProgramRepositoryV3();
    const fixture = createProgramFixtureV1("workspace.admission.event-collision");
    const created = await repository.create(createInputV1(fixture, 1));
    if (created.kind !== "committed") throw new Error("expected create");
    const run = currentAgentRunV1({
      session: fixture.session,
      agentRunId: "agent-run.event-collision.1",
      baseRepositoryRevision: 1,
    });
    const terminal = agentTerminalV1(run, "cancelled");
    applyAgentTerminalV1(fixture.session, terminal);
    const settled = await repository.settleAgentRun({
      programId: run.programId,
      expectedRepositoryRevision: 1,
      terminal,
      snapshot: fixture.session.getSnapshot(),
      continuation: fixture.continuation,
      reviewedHead: null,
      updatedAt: 2,
    });
    if (settled.kind !== "committed") throw new Error("expected settlement");
    const continuation2 = await requireContinuationV1(repository, run.programId);
    const rejected = await decideV1({
      repository,
      session: fixture.session,
      continuation: continuation2,
      aggregate: settled.aggregate,
      status: "rejected",
      updatedAt: 3,
    });
    const rejectedDecision = rejected.aggregate.decisions[0];
    expect(admitProgramRepositoryAggregateV3({
      ...rejected.aggregate,
      decisions: [{ ...rejectedDecision, repositoryRevision: 2 }],
    })).toEqual({ kind: "rejected", path: "/snapshot/proposal/status" });

    const continuation3 = await requireContinuationV1(repository, run.programId);
    const pending = await applyFollowUpV1({
      repository,
      session: fixture.session,
      continuation: continuation3,
      text: "Open a successor proposal.",
      reviewedHead: { checkpointId: "checkpoint.event-collision.2", generation: 2 },
      updatedAt: 4,
    });
    expect(admitProgramRepositoryAggregateV3({
      ...pending,
      decisions: [{ ...pending.decisions[0], repositoryRevision: 2 }],
    })).toEqual({
      kind: "rejected",
      path: "/agentRunReceipts/0/baseRepositoryRevision",
    });
    expect(admitProgramRepositoryAggregateV3({
      ...pending,
      repositoryRevision: pending.repositoryRevision + 1,
      reviewBinding: pending.reviewBinding === null ? null : {
        ...pending.reviewBinding,
        repositoryRevision: pending.reviewBinding.repositoryRevision + 1,
      },
    })).toEqual({ kind: "rejected", path: "/repositoryRevision" });
    await repository.dispose();
  });

  it("rejects a completed receipt reordered after its Program decision", async () => {
    const repository = createMemoryProgramRepositoryV3();
    const fixture = createProgramFixtureV1("workspace.admission.completed-order");
    const created = await repository.create(createInputV1(fixture, 1));
    if (created.kind !== "committed") throw new Error("expected create");
    const run = currentAgentRunV1({
      session: fixture.session,
      agentRunId: "agent-run.completed-order.1",
      baseRepositoryRevision: 1,
    });
    const terminal = agentTerminalV1(run, "completed");
    applyAgentTerminalV1(fixture.session, terminal);
    const completed = await repository.settleAgentRun({
      programId: run.programId,
      expectedRepositoryRevision: 1,
      terminal,
      snapshot: fixture.session.getSnapshot(),
      continuation: fixture.continuation,
      reviewedHead: { checkpointId: "checkpoint.completed-order.2", generation: 2 },
      updatedAt: 2,
    });
    if (completed.kind !== "committed") throw new Error("expected completed settlement");
    const continuation2 = await requireContinuationV1(repository, run.programId);
    const rejected = await decideV1({
      repository,
      session: fixture.session,
      continuation: continuation2,
      aggregate: completed.aggregate,
      status: "rejected",
      updatedAt: 3,
    });
    const continuation3 = await requireContinuationV1(repository, run.programId);
    const pending = await applyFollowUpV1({
      repository,
      session: fixture.session,
      continuation: continuation3,
      text: "Create Program revision three.",
      reviewedHead: { checkpointId: "checkpoint.completed-order.3", generation: 3 },
      updatedAt: 4,
    });
    expect(rejected.aggregate.repositoryRevision).toBe(3);
    expect(admitProgramRepositoryAggregateV3({
      ...pending,
      agentRunReceipts: [{
        ...pending.agentRunReceipts[0],
        baseRepositoryRevision: 3,
      }],
    })).toEqual({ kind: "rejected", path: "/repositoryRevision" });
    await repository.dispose();
  });
});

function openRawDatabaseV1(
  indexedDB: IDBFactory,
  name: string,
  version: number,
  upgrade?: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.addEventListener("upgradeneeded", () => upgrade?.(request.result));
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function completeTransactionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new DOMException("transaction aborted", "AbortError")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new DOMException("transaction failed", "UnknownError")),
      { once: true },
    );
  });
}

function createExactPhysicalV3StoresV1(database: IDBDatabase): void {
  database.createObjectStore(programRepositoryProgramObjectStoreNameV4, {
    keyPath: "programId",
  });
  database.createObjectStore(programRepositoryWorkspaceContinuationObjectStoreNameV4, {
    keyPath: "programId",
  });
}

describe("IndexedDB ProgramRepository physical V4 contract", () => {
  it("creates a fresh exact V4 two-store catalog", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-v4-fresh";
    const repository = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    await repository.initialize();
    const database = await openRawDatabaseV1(
      indexedDB,
      databaseName,
      programRepositoryDatabaseVersionV4,
    );
    expect([...database.objectStoreNames]).toEqual([
      programRepositoryProgramObjectStoreNameV4,
      programRepositoryWorkspaceContinuationObjectStoreNameV4,
    ]);
    for (
      const storeName of [
        programRepositoryProgramObjectStoreNameV4,
        programRepositoryWorkspaceContinuationObjectStoreNameV4,
      ]
    ) {
      const store = database.transaction(storeName).objectStore(storeName);
      expect(store.keyPath).toBe("programId");
      expect(store.autoIncrement).toBe(false);
      expect(store.indexNames).toHaveLength(0);
    }
    database.close();
    await repository.dispose();
  });

  it("clean-resets only exact physical V3 without reading or converting its rows", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-v3-reset";
    const legacy = await openRawDatabaseV1(indexedDB, databaseName, 3, (database) => {
      createExactPhysicalV3StoresV1(database);
    });
    const transaction = legacy.transaction(
      [
        programRepositoryProgramObjectStoreNameV4,
        programRepositoryWorkspaceContinuationObjectStoreNameV4,
      ],
      "readwrite",
    );
    const completion = completeTransactionV1(transaction);
    transaction.objectStore(programRepositoryProgramObjectStoreNameV4).put({
      programId: "program.legacy",
      deliberatelyUnreadable: true,
    });
    transaction.objectStore(programRepositoryWorkspaceContinuationObjectStoreNameV4).put({
      programId: "program.legacy",
      deliberatelyUnreadable: true,
    });
    await completion;
    legacy.close();

    const repository = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    await repository.initialize();
    await expect(repository.list()).resolves.toEqual([]);
    const current = await openRawDatabaseV1(
      indexedDB,
      databaseName,
      programRepositoryDatabaseVersionV4,
    );
    for (
      const storeName of [
        programRepositoryProgramObjectStoreNameV4,
        programRepositoryWorkspaceContinuationObjectStoreNameV4,
      ]
    ) {
      const store = current.transaction(storeName).objectStore(storeName);
      await expect(
        new Promise((resolve, reject) => {
          const request = store.count();
          request.addEventListener("success", () => resolve(request.result));
          request.addEventListener("error", () => reject(request.error));
        }),
      ).resolves.toBe(0);
    }
    current.close();
    await repository.dispose();
  });

  it("fails closed for unknown, malformed, future, and blocked physical schemas", async () => {
    const oldFactory = new FakeIDBFactory();
    const oldName = "sillyos-program-repository-v2-invalid";
    (await openRawDatabaseV1(oldFactory, oldName, 2, (database) => {
      database.createObjectStore(programRepositoryProgramObjectStoreNameV4, {
        keyPath: "programId",
      });
    })).close();
    await expect(
      createIndexedDbProgramRepositoryV4({
        indexedDB: oldFactory,
        databaseName: oldName,
      }).initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid", operation: "initialize" });

    const malformedFactory = new FakeIDBFactory();
    const malformedName = "sillyos-program-repository-v3-malformed";
    (await openRawDatabaseV1(malformedFactory, malformedName, 3, (database) => {
      createExactPhysicalV3StoresV1(database);
      database.createObjectStore("unexpected");
    })).close();
    await expect(
      createIndexedDbProgramRepositoryV4({
        indexedDB: malformedFactory,
        databaseName: malformedName,
      }).initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid", operation: "initialize" });

    const futureFactory = new FakeIDBFactory();
    const futureName = "sillyos-program-repository-v5-future";
    (await openRawDatabaseV1(futureFactory, futureName, 5, (database) => {
      database.createObjectStore("future");
    })).close();
    await expect(
      createIndexedDbProgramRepositoryV4({
        indexedDB: futureFactory,
        databaseName: futureName,
      }).initialize(),
    ).rejects.toMatchObject({ code: "database_newer", operation: "initialize" });

    const blockedFactory = new FakeIDBFactory();
    const blockedName = "sillyos-program-repository-v3-blocked";
    const blocker = await openRawDatabaseV1(blockedFactory, blockedName, 3, (database) => {
      createExactPhysicalV3StoresV1(database);
    });
    const blocked = createIndexedDbProgramRepositoryV4({
      indexedDB: blockedFactory,
      databaseName: blockedName,
    });
    await expect(blocked.initialize()).rejects.toMatchObject({
      code: "upgrade_blocked",
      operation: "initialize",
    });
    blocker.close();
    await blocked.dispose();
  });

  it("fails closed for corrupt or orphan pair rows", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-v4-corrupt-pair";
    const repository = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    await repository.initialize();
    await repository.dispose();
    const database = await openRawDatabaseV1(
      indexedDB,
      databaseName,
      programRepositoryDatabaseVersionV4,
    );
    const transaction = database.transaction(
      programRepositoryWorkspaceContinuationObjectStoreNameV4,
      "readwrite",
    );
    const completion = completeTransactionV1(transaction);
    transaction.objectStore(programRepositoryWorkspaceContinuationObjectStoreNameV4).put({
      revision: 1,
      programId: "program.orphan",
      workspaceId: "workspace.orphan",
      volumeId: "volume.orphan",
      workspaceFormat: 1,
      programRevision: 1,
      repositoryRevision: 1,
    });
    await completion;
    database.close();
    const reopened = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    await expect(reopened.load("program.orphan")).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load",
    });
    await expect(reopened.list()).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "list",
    });
    await reopened.dispose();
  });

  it("atomically rejects initial create when the continuation add fails", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-v4-atomic-create";
    const repository = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    const fixture = createProgramFixtureV1("workspace.atomic.create");
    const originalAdd = FakeIDBObjectStore.prototype.add;
    let addCount = 0;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      addCount += 1;
      if (addCount === 2) {
        throw new DOMException("synthetic quota", "QuotaExceededError");
      }
      return originalAdd.apply(this, args);
    });
    await expect(repository.create(createInputV1(fixture, 1))).rejects.toMatchObject({
      code: "quota_exceeded",
      operation: "create",
    });
    vi.restoreAllMocks();
    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.load(fixture.continuation.programId)).resolves.toBeNull();
    await expect(repository.loadWorkspaceContinuation(fixture.continuation.programId)).resolves
      .toBeNull();
    await expect(repository.create(createInputV1(fixture, 1))).resolves.toMatchObject({
      kind: "committed",
      aggregate: { repositoryRevision: 1 },
    });
    await repository.dispose();
  });

  it("atomically retains both rows when a revision write throws or aborts", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-v4-atomic-failure";
    const repository = createIndexedDbProgramRepositoryV4({ indexedDB, databaseName });
    const fixture = createProgramFixtureV1("workspace.atomic.failure");
    const created = await repository.create(createInputV1(fixture, 1));
    if (created.kind !== "committed") throw new Error("expected create");
    const continuation = await requireContinuationV1(repository, created.aggregate.programId);
    const before = fixture.session.getSnapshot();
    const { program, proposal } = requireCurrentProgramV1(before);
    if (fixture.session.sendFollowUp("Add a clear midpoint.").kind !== "sent") {
      throw new Error("expected follow-up");
    }
    const mutation = {
      programId: program.programId,
      expectedRepositoryRevision: 1,
      expectedBase: {
        proposalId: proposal.proposalId,
        programId: program.programId,
        baseProgramRevision: program.revision,
      },
      snapshot: fixture.session.getSnapshot(),
      continuation,
      reviewedHead: { checkpointId: "checkpoint.atomic.2", generation: 2 },
      updatedAt: 2,
    } satisfies ProgramRepositoryApplyRevisionInputV3;

    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("synthetic quota", "QuotaExceededError");
    });
    await expect(repository.applyRevision(mutation)).rejects.toMatchObject({
      code: "quota_exceeded",
      operation: "apply_revision",
    });
    vi.restoreAllMocks();
    expect((await repository.load(program.programId))?.repositoryRevision).toBe(1);
    expect(await repository.loadWorkspaceContinuation(program.programId)).toEqual(continuation);

    const originalPut = FakeIDBObjectStore.prototype.put;
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalPut>
    ) {
      const request = originalPut.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    });
    await expect(repository.applyRevision(mutation)).rejects.toMatchObject({
      code: "transaction_aborted",
      operation: "apply_revision",
    });
    vi.restoreAllMocks();
    expect((await repository.load(program.programId))?.repositoryRevision).toBe(1);
    expect(await repository.loadWorkspaceContinuation(program.programId)).toEqual(continuation);
    await repository.dispose();
  });
});
