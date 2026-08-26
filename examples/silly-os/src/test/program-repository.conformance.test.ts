// SPDX-License-Identifier: MIT

import { IDBFactory as FakeIDBFactory, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createIndexedDbProgramRepositoryV2,
  programRepositoryDatabaseVersionV2,
  programRepositoryObjectStoreNameV2,
} from "../product/indexeddb-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV2,
  createMemoryProgramRepositoryV2,
} from "../product/memory-program-repository.ts";
import {
  admitProgramRepositoryAggregateV2,
  programRepositoryMaximumAgentRunReceiptsV2,
  programRepositoryMaximumProgramsV2,
  type ProgramRepositoryApplyRevisionInputV2,
  type ProgramRepositoryDecideInputV2,
  type ProgramRepositorySettleAgentRunInputV2,
  type ProgramRepositoryV2,
} from "../product/program-repository.ts";
import type {
  CreatorAgentRunOutcomeV1,
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalRunV1,
  CreatorSessionV1,
} from "../product/contracts.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

interface RepositoryHarnessV2 {
  open(): ProgramRepositoryV2;
}

function createMemoryHarnessV2(): RepositoryHarnessV2 {
  const backing = createMemoryProgramRepositoryBackingV2();
  return { open: () => createMemoryProgramRepositoryV2({ backing }) };
}

function createIndexedDbHarnessV2(): RepositoryHarnessV2 {
  const indexedDB = new FakeIDBFactory();
  return {
    open: () =>
      createIndexedDbProgramRepositoryV2({
        indexedDB,
        databaseName: "sillyos-program-repository-conformance",
      }),
  };
}

function createSnapshotSequenceV1(workspaceId: string) {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const created = session.submitIntent("Draft a short story with an explicit review step.");
  if (created.kind !== "created") throw new Error("expected Program creation");
  const initial = session.getSnapshot();
  const initialProgram = initial.program;
  const initialProposal = initial.proposal;
  if (initialProgram === null || initialProposal === null) {
    throw new Error("expected initial Program");
  }
  const followUp = session.sendFollowUp("Start with a three-act outline.");
  if (followUp.kind !== "sent") throw new Error("expected Program revision");
  const revised = session.getSnapshot();
  const revisedProposal = revised.proposal;
  if (revisedProposal === null) throw new Error("expected revised proposal");
  const decision = session.acceptProposal({
    proposalId: revisedProposal.proposalId,
    programRevision: revisedProposal.programRevision,
  });
  if (decision.kind !== "applied") throw new Error("expected accepted proposal");
  const accepted = session.getSnapshot();
  return {
    initial,
    revised,
    accepted,
    applyInput: {
      programId: initialProgram.programId,
      expectedRepositoryRevision: 1,
      expectedBase: {
        proposalId: initialProposal.proposalId,
        programId: initialProgram.programId,
        baseProgramRevision: initialProgram.revision,
      },
      snapshot: revised,
      updatedAt: 200,
    } satisfies ProgramRepositoryApplyRevisionInputV2,
    decideInput: {
      programId: initialProgram.programId,
      expectedRepositoryRevision: 2,
      expectedProposal: {
        proposalId: revisedProposal.proposalId,
        programRevision: revisedProposal.programRevision,
      },
      status: "accepted",
      snapshot: accepted,
      updatedAt: 300,
    } satisfies ProgramRepositoryDecideInputV2,
  };
}

function createAgentSessionV1(workspaceId: string): CreatorSessionV1 {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const created = session.submitIntent("Draft a short story with an explicit review step.");
  if (created.kind !== "created") throw new Error("expected Program creation");
  return session;
}

function currentAgentRunV1(input: {
  readonly session: CreatorSessionV1;
  readonly agentRunId: string;
  readonly baseRepositoryRevision: number;
  readonly text?: string;
}): CreatorAgentRunRequestV1 {
  const snapshot = input.session.getSnapshot();
  const program = snapshot.program;
  const proposal = snapshot.proposal;
  if (program === null || proposal === null) throw new Error("expected current Program");
  return {
    agentRunId: input.agentRunId,
    proposalId: proposal.proposalId,
    programId: program.programId,
    baseProgramRevision: program.revision,
    baseRepositoryRevision: input.baseRepositoryRevision,
    text: input.text ?? `Apply Agent run ${input.agentRunId}.`,
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
  if (outcome === "failed") {
    return { run, outcome, diagnosticCode: "request_failed" };
  }
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
    ["memory", createMemoryHarnessV2],
    ["IndexedDB", createIndexedDbHarnessV2],
  ] as const
) {
  describe(`ProgramRepositoryV2 ${name} conformance`, () => {
    it("creates, reopens, appends immutable revisions, decides exactly, and rejects stale CAS", async () => {
      const harness = createHarness();
      const first = harness.open();
      const second = harness.open();
      const snapshots = createSnapshotSequenceV1(`workspace.${name.toLowerCase()}.one`);
      const programId = snapshots.initial.program?.programId;
      if (programId === undefined) throw new Error("expected Program id");

      await Promise.all([first.initialize(), second.initialize()]);
      const created = await first.create({ snapshot: snapshots.initial, updatedAt: 100 });
      expect(created).toMatchObject({ kind: "committed", aggregate: { repositoryRevision: 1 } });
      await expect(first.create({ snapshot: snapshots.initial, updatedAt: 100 })).resolves
        .toMatchObject({ kind: "unchanged", aggregate: { repositoryRevision: 1 } });
      expect(await first.list()).toEqual([
        expect.objectContaining({
          programId,
          programRevision: 1,
          proposalStatus: "pending",
          updatedAt: 100,
        }),
      ]);

      const revised = await second.applyRevision(snapshots.applyInput);
      expect(revised).toMatchObject({
        kind: "committed",
        aggregate: { repositoryRevision: 2, updatedAt: 200 },
      });
      await expect(second.applyRevision(snapshots.applyInput)).resolves.toMatchObject({
        kind: "unchanged",
        aggregate: { repositoryRevision: 2 },
      });
      await expect(
        first.applyRevision({ ...snapshots.applyInput, updatedAt: 201 }),
      ).resolves.toMatchObject({
        kind: "conflict",
        current: { repositoryRevision: 2 },
      });

      const afterRevision = await first.load(programId);
      expect(afterRevision?.programRevisions.map(({ revision }) => revision)).toEqual([1, 2]);
      expect(afterRevision?.programRevisions[0]?.requirements).toEqual([
        "Draft a short story with an explicit review step.",
      ]);
      expect(afterRevision?.snapshot).toEqual(snapshots.revised);

      const accepted = await first.decide(snapshots.decideInput);
      expect(accepted).toMatchObject({
        kind: "committed",
        aggregate: {
          repositoryRevision: 3,
          decisions: [{ programRevision: 2, status: "accepted", repositoryRevision: 3 }],
        },
      });
      await expect(first.decide(snapshots.decideInput)).resolves.toMatchObject({
        kind: "unchanged",
        aggregate: { repositoryRevision: 3 },
      });
      await expect(
        second.decide({ ...snapshots.decideInput, status: "rejected" }),
      ).resolves.toMatchObject({
        kind: "conflict",
        current: { repositoryRevision: 3 },
      });

      await Promise.all([first.dispose(), second.dispose()]);
      const reopened = harness.open();
      await expect(reopened.load(programId)).resolves.toMatchObject({
        repositoryRevision: 3,
        snapshot: { proposal: { status: "accepted" } },
        programRevisions: [{ revision: 1 }, { revision: 2 }],
      });
      await reopened.dispose();
    });

    it("settles all four Agent outcomes once, replays receipts, rejects stale runs, and reopens", async () => {
      const harness = createHarness();
      for (
        const outcome of [
          "completed",
          "failed",
          "cancelled",
          "replaced",
        ] as const satisfies readonly CreatorAgentRunOutcomeV1[]
      ) {
        const session = createAgentSessionV1(
          `workspace.${name.toLowerCase()}.agent.${outcome}`,
        );
        const initial = session.getSnapshot();
        const program = initial.program;
        if (program === null) throw new Error("expected initial Program");
        const repository = harness.open();
        await repository.initialize();
        await expect(repository.create({ snapshot: initial, updatedAt: 1 })).resolves
          .toMatchObject({ kind: "committed", aggregate: { repositoryRevision: 1 } });

        const run = currentAgentRunV1({
          session,
          agentRunId: `agent-run.${name.toLowerCase()}.${outcome}`,
          baseRepositoryRevision: 1,
        });
        const terminal = agentTerminalV1(run, outcome);
        applyAgentTerminalV1(session, terminal);
        const settledSnapshot = session.getSnapshot();
        const input = {
          programId: program.programId,
          expectedRepositoryRevision: 1,
          terminal,
          snapshot: settledSnapshot,
          updatedAt: 2,
        } satisfies ProgramRepositorySettleAgentRunInputV2;

        const settled = await repository.settleAgentRun(input);
        expect(settled).toMatchObject({
          kind: "committed",
          aggregate: { repositoryRevision: 2, updatedAt: 2 },
        });
        if (settled.kind !== "committed") throw new Error("expected Agent run commit");
        const userMessage = settledSnapshot.messages[initial.messages.length];
        const creatorMessage = outcome === "completed"
          ? settledSnapshot.messages[initial.messages.length + 1]
          : undefined;
        expect(settled.aggregate.agentRunReceipts).toEqual([
          {
            agentRunId: run.agentRunId,
            sequence: 1,
            proposalId: run.proposalId,
            userMessageId: userMessage?.messageId,
            creatorMessageId: creatorMessage?.messageId ?? null,
            baseProgramRevision: run.baseProgramRevision,
            baseRepositoryRevision: run.baseRepositoryRevision,
            resultingProgramRevision: outcome === "completed" ? 2 : null,
            outcome,
            diagnosticCode: outcome === "failed" ? "request_failed" : null,
          },
        ]);
        expect(settled.aggregate.programRevisions.map(({ revision }) => revision)).toEqual(
          outcome === "completed" ? [1, 2] : [1],
        );

        await expect(repository.settleAgentRun(input)).resolves.toEqual({
          kind: "unchanged",
          aggregate: settled.aggregate,
        });
        const crossProgramTerminal = agentTerminalV1(
          { ...run, programId: `${run.programId}.other` },
          outcome,
        );
        await expect(
          repository.settleAgentRun({ ...input, terminal: crossProgramTerminal }),
        ).resolves.toMatchObject({
          kind: "conflict",
          current: { repositoryRevision: 2 },
        });
        const mismatchedTerminal = agentTerminalV1(
          { ...run, text: `${run.text} Mismatch.` },
          outcome,
        );
        await expect(
          repository.settleAgentRun({ ...input, terminal: mismatchedTerminal }),
        ).resolves.toMatchObject({
          kind: "conflict",
          current: { repositoryRevision: 2 },
        });
        const staleTerminal = agentTerminalV1(
          { ...run, agentRunId: `${run.agentRunId}.stale` },
          outcome,
        );
        await expect(
          repository.settleAgentRun({ ...input, terminal: staleTerminal }),
        ).resolves.toMatchObject({
          kind: "conflict",
          current: { repositoryRevision: 2 },
        });
        expect(await repository.load(program.programId)).toEqual(settled.aggregate);

        await repository.dispose();
        const reopened = harness.open();
        await expect(reopened.load(program.programId)).resolves.toEqual(settled.aggregate);
        await reopened.dispose();
      }
    });

    it("enforces the 32-receipt aggregate bound atomically and preserves it across reopen", async () => {
      const harness = createHarness();
      const repository = harness.open();
      const session = createAgentSessionV1(`workspace.${name.toLowerCase()}.receipt-bound`);
      const initial = session.getSnapshot();
      const program = initial.program;
      if (program === null) throw new Error("expected initial Program");
      await repository.create({ snapshot: initial, updatedAt: 1 });

      for (let index = 0; index < programRepositoryMaximumAgentRunReceiptsV2; index += 1) {
        const repositoryRevision = index + 1;
        const run = currentAgentRunV1({
          session,
          agentRunId: `agent-run.receipt.${String(index + 1)}`,
          baseRepositoryRevision: repositoryRevision,
        });
        const terminal = agentTerminalV1(run, "cancelled");
        applyAgentTerminalV1(session, terminal);
        await expect(repository.settleAgentRun({
          programId: program.programId,
          expectedRepositoryRevision: repositoryRevision,
          terminal,
          snapshot: session.getSnapshot(),
          updatedAt: repositoryRevision + 1,
        })).resolves.toMatchObject({
          kind: "committed",
          aggregate: {
            repositoryRevision: repositoryRevision + 1,
            agentRunReceipts: { length: index + 1 },
          },
        });
      }

      const beforeOverflow = await repository.load(program.programId);
      if (beforeOverflow === null) throw new Error("expected bounded aggregate");
      const overflowRun = currentAgentRunV1({
        session,
        agentRunId: "agent-run.receipt.overflow",
        baseRepositoryRevision: beforeOverflow.repositoryRevision,
      });
      const overflowTerminal = agentTerminalV1(overflowRun, "cancelled");
      applyAgentTerminalV1(session, overflowTerminal);
      await expect(repository.settleAgentRun({
        programId: program.programId,
        expectedRepositoryRevision: beforeOverflow.repositoryRevision,
        terminal: overflowTerminal,
        snapshot: session.getSnapshot(),
        updatedAt: beforeOverflow.updatedAt + 1,
      })).rejects.toThrow("sillyos.program_repository.aggregate.invalid/agentRunReceipts");
      expect(await repository.load(program.programId)).toEqual(beforeOverflow);

      await repository.dispose();
      const reopened = harness.open();
      await expect(reopened.load(program.programId)).resolves.toEqual(beforeOverflow);
      await reopened.dispose();
    });

    it("enforces the 64-Program origin bound atomically without blocking exact replay", async () => {
      const repository = createHarness().open();
      let firstSnapshot: ReturnType<typeof createSnapshotSequenceV1>["initial"] | null = null;
      for (let index = 0; index < programRepositoryMaximumProgramsV2; index += 1) {
        const snapshot = createSnapshotSequenceV1(`workspace.bound.${String(index + 1)}`).initial;
        firstSnapshot ??= snapshot;
        await expect(repository.create({ snapshot, updatedAt: index + 1 })).resolves.toMatchObject({
          kind: "committed",
        });
      }
      if (firstSnapshot === null) throw new Error("expected bounded Program fixture");
      await expect(repository.create({ snapshot: firstSnapshot, updatedAt: 1 })).resolves
        .toMatchObject({
          kind: "unchanged",
        });
      const overflow = createSnapshotSequenceV1("workspace.bound.overflow").initial;
      await expect(repository.create({ snapshot: overflow, updatedAt: 100 })).rejects.toMatchObject(
        {
          code: "quota_exceeded",
          operation: "create",
        },
      );
      expect(await repository.list()).toHaveLength(programRepositoryMaximumProgramsV2);
      await repository.dispose();
    });

    it("returns detached values and a stable disposed failure", async () => {
      const repository = createHarness().open();
      const { initial } = createSnapshotSequenceV1(`workspace.${name.toLowerCase()}.detached`);
      const created = await repository.create({ snapshot: initial, updatedAt: 1 });
      if (created.kind !== "committed") throw new Error("expected commit");
      const mutable = created.aggregate as { snapshot: { revision: number } };
      mutable.snapshot.revision = 999;
      expect((await repository.load(created.aggregate.programId))?.snapshot.revision).toBe(1);
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

describe("ProgramRepositoryV2 strict admission", () => {
  it("rejects unknown keys and an aggregate larger than 512 KiB", () => {
    const repository = createMemoryProgramRepositoryV2();
    const { initial } = createSnapshotSequenceV1("workspace.admission.one");
    return repository.create({ snapshot: initial, updatedAt: 1 }).then((result) => {
      if (result.kind !== "committed") throw new Error("expected Program aggregate");
      expect(
        admitProgramRepositoryAggregateV2({ ...result.aggregate, unexpected: true }),
      ).toEqual({ kind: "rejected", path: "/" });
      const messages = Array.from({ length: 96 }, (_, index) => ({
        messageId: `workspace.admission.one.message.large.${String(index + 1)}`,
        role: "creator" as const,
        text: "界".repeat(8_192),
      }));
      expect(
        admitProgramRepositoryAggregateV2({
          ...result.aggregate,
          snapshot: { ...result.aggregate.snapshot, messages },
        }),
      ).toEqual({ kind: "rejected", path: "/" });
    });
  });

  it("admits exact receipts and rejects malformed receipt identity and linkage", async () => {
    const repository = createMemoryProgramRepositoryV2();
    const session = createAgentSessionV1("workspace.admission.receipts");
    const initial = session.getSnapshot();
    const program = initial.program;
    if (program === null) throw new Error("expected initial Program");
    await repository.create({ snapshot: initial, updatedAt: 1 });

    for (let index = 0; index < 2; index += 1) {
      const repositoryRevision = index + 1;
      const run = currentAgentRunV1({
        session,
        agentRunId: `agent-run.admission.${String(index + 1)}`,
        baseRepositoryRevision: repositoryRevision,
      });
      const terminal = agentTerminalV1(run, "failed");
      applyAgentTerminalV1(session, terminal);
      await repository.settleAgentRun({
        programId: program.programId,
        expectedRepositoryRevision: repositoryRevision,
        terminal,
        snapshot: session.getSnapshot(),
        updatedAt: repositoryRevision + 1,
      });
    }

    const aggregate = await repository.load(program.programId);
    if (aggregate === null) throw new Error("expected receipt aggregate");
    const [first, second] = aggregate.agentRunReceipts;
    if (first === undefined || second === undefined) throw new Error("expected two receipts");
    expect(admitProgramRepositoryAggregateV2(aggregate)).toEqual({
      kind: "admitted",
      value: aggregate,
    });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [{ ...first, unexpected: true }, second],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts/0" });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [first, { ...second, sequence: 1 }],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts/1/sequence" });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [first, { ...second, userMessageId: first.userMessageId }],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts/1/userMessageId" });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [first, { ...second, agentRunId: first.agentRunId }],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts" });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [first, { ...second, diagnosticCode: null }],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts/1/diagnosticCode" });
    expect(admitProgramRepositoryAggregateV2({
      ...aggregate,
      agentRunReceipts: [
        first,
        { ...second, baseRepositoryRevision: aggregate.repositoryRevision + 1 },
      ],
    })).toEqual({ kind: "rejected", path: "/agentRunReceipts/1/baseRepositoryRevision" });
    await repository.dispose();
  });
});

function openRawDatabaseV2(
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

function completeTransactionV2(transaction: IDBTransaction): Promise<void> {
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

describe("IndexedDB ProgramRepositoryV2 physical contract", () => {
  it("creates a fresh exact v2 programs store", async () => {
    const currentFactory = new FakeIDBFactory();
    const currentName = "sillyos-program-repository-schema-current";
    const repository = createIndexedDbProgramRepositoryV2({
      indexedDB: currentFactory,
      databaseName: currentName,
    });
    await repository.initialize();
    await expect(repository.list()).resolves.toEqual([]);
    const current = await openRawDatabaseV2(
      currentFactory,
      currentName,
      programRepositoryDatabaseVersionV2,
    );
    expect([...current.objectStoreNames]).toEqual([programRepositoryObjectStoreNameV2]);
    expect(
      current.transaction(programRepositoryObjectStoreNameV2).objectStore(
        programRepositoryObjectStoreNameV2,
      ).keyPath,
    ).toBe("programId");
    expect(
      current.transaction(programRepositoryObjectStoreNameV2).objectStore(
        programRepositoryObjectStoreNameV2,
      ).autoIncrement,
    ).toBe(false);
    expect(
      current.transaction(programRepositoryObjectStoreNameV2).objectStore(
        programRepositoryObjectStoreNameV2,
      ).indexNames,
    ).toHaveLength(0);
    current.close();
    await repository.dispose();
  });

  it("destructively resets the exact v1 store and rejects malformed v1 or v2 schemas", async () => {
    const legacyFactory = new FakeIDBFactory();
    const legacyName = "sillyos-program-repository-schema-v1-reset";
    const legacy = await openRawDatabaseV2(legacyFactory, legacyName, 1, (database) => {
      database.createObjectStore(programRepositoryObjectStoreNameV2, { keyPath: "programId" });
    });
    const transaction = legacy.transaction(programRepositoryObjectStoreNameV2, "readwrite");
    const completion = completeTransactionV2(transaction);
    transaction.objectStore(programRepositoryObjectStoreNameV2).put({
      schemaVersion: 1,
      programId: "program.legacy",
    });
    await completion;
    legacy.close();

    const reset = createIndexedDbProgramRepositoryV2({
      indexedDB: legacyFactory,
      databaseName: legacyName,
    });
    await reset.initialize();
    await expect(reset.list()).resolves.toEqual([]);
    await expect(reset.load("program.legacy")).resolves.toBeNull();
    await reset.dispose();

    const malformedLegacyFactory = new FakeIDBFactory();
    const malformedLegacyName = "sillyos-program-repository-schema-v1-malformed";
    const malformedLegacy = await openRawDatabaseV2(
      malformedLegacyFactory,
      malformedLegacyName,
      1,
      (database) => {
        database.createObjectStore(programRepositoryObjectStoreNameV2, { keyPath: "programId" });
        database.createObjectStore("unexpected");
      },
    );
    malformedLegacy.close();
    await expect(
      createIndexedDbProgramRepositoryV2({
        indexedDB: malformedLegacyFactory,
        databaseName: malformedLegacyName,
      }).initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid", operation: "initialize" });

    const invalidFactory = new FakeIDBFactory();
    const invalidName = "sillyos-program-repository-schema-invalid";
    const invalid = await openRawDatabaseV2(invalidFactory, invalidName, 2, (database) => {
      database.createObjectStore(programRepositoryObjectStoreNameV2, { keyPath: "wrong" });
    });
    invalid.close();
    await expect(
      createIndexedDbProgramRepositoryV2({ indexedDB: invalidFactory, databaseName: invalidName })
        .initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid" });
  });

  it("reports a blocked v1 upgrade and a newer database without fallback", async () => {
    const blockedFactory = new FakeIDBFactory();
    const blockedName = "sillyos-program-repository-schema-blocked";
    const blocker = await openRawDatabaseV2(blockedFactory, blockedName, 1, (database) => {
      database.createObjectStore(programRepositoryObjectStoreNameV2, { keyPath: "programId" });
    });
    const blockedRepository = createIndexedDbProgramRepositoryV2({
      indexedDB: blockedFactory,
      databaseName: blockedName,
    });
    await expect(blockedRepository.initialize()).rejects.toMatchObject({
      code: "upgrade_blocked",
      operation: "initialize",
    });
    blocker.close();
    await blockedRepository.dispose();

    const futureFactory = new FakeIDBFactory();
    const futureName = "sillyos-program-repository-schema-future";
    const future = await openRawDatabaseV2(futureFactory, futureName, 3, (database) => {
      database.createObjectStore("future");
    });
    future.close();
    await expect(
      createIndexedDbProgramRepositoryV2({ indexedDB: futureFactory, databaseName: futureName })
        .initialize(),
    ).rejects.toMatchObject({ code: "database_newer", operation: "initialize" });
  });

  it("fails closed for unavailable IndexedDB and a corrupt aggregate row", async () => {
    await expect(
      createIndexedDbProgramRepositoryV2({
        indexedDB: undefined as unknown as IDBFactory,
        databaseName: "sillyos-program-repository-unavailable",
      }).initialize(),
    ).rejects.toMatchObject({ code: "unavailable", operation: "initialize" });

    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-corrupt-row";
    const initialized = createIndexedDbProgramRepositoryV2({ indexedDB, databaseName });
    await initialized.initialize();
    await initialized.dispose();
    const database = await openRawDatabaseV2(indexedDB, databaseName, 2);
    const transaction = database.transaction(programRepositoryObjectStoreNameV2, "readwrite");
    const completion = completeTransactionV2(transaction);
    transaction.objectStore(programRepositoryObjectStoreNameV2).put({
      programId: "program.corrupt",
      schemaVersion: 1,
    });
    await completion;
    database.close();

    const reopened = createIndexedDbProgramRepositoryV2({ indexedDB, databaseName });
    await expect(reopened.load("program.corrupt")).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load",
    });
    await reopened.dispose();
  });

  it("maps quota and post-request abort without retaining a successor", async () => {
    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-commit-failures";
    const repository = createIndexedDbProgramRepositoryV2({ indexedDB, databaseName });
    const snapshots = createSnapshotSequenceV1("workspace.commit.failure");
    const created = await repository.create({ snapshot: snapshots.initial, updatedAt: 100 });
    if (created.kind !== "committed") throw new Error("expected initial commit");

    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("synthetic quota", "QuotaExceededError");
    });
    await expect(repository.applyRevision(snapshots.applyInput)).rejects.toMatchObject({
      code: "quota_exceeded",
      operation: "apply_revision",
    });
    vi.restoreAllMocks();
    expect((await repository.load(created.aggregate.programId))?.repositoryRevision).toBe(1);

    const originalPut = FakeIDBObjectStore.prototype.put;
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalPut>
    ) {
      const request = originalPut.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    });
    await expect(repository.applyRevision(snapshots.applyInput)).rejects.toMatchObject({
      code: "transaction_aborted",
      operation: "apply_revision",
    });
    vi.restoreAllMocks();
    expect((await repository.load(created.aggregate.programId))?.repositoryRevision).toBe(1);
    await repository.dispose();
  });
});
