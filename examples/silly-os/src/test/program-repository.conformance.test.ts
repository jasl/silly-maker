// SPDX-License-Identifier: MIT

import {
  IDBFactory as FakeIDBFactory,
  IDBObjectStore as FakeIDBObjectStore,
  IDBVersionChangeEvent as FakeIDBVersionChangeEvent,
} from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createIndexedDbProgramRepositoryV1,
  programRepositoryDatabaseVersionV1,
  programRepositoryObjectStoreNameV1,
} from "../product/indexeddb-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV1,
  createMemoryProgramRepositoryV1,
} from "../product/memory-program-repository.ts";
import {
  admitProgramRepositoryAggregateV1,
  programRepositoryMaximumProgramsV1,
  type ProgramRepositoryApplyRevisionInputV1,
  type ProgramRepositoryDecideInputV1,
  type ProgramRepositoryV1,
} from "../product/program-repository.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

interface RepositoryHarnessV1 {
  open(): ProgramRepositoryV1;
}

function createMemoryHarnessV1(): RepositoryHarnessV1 {
  const backing = createMemoryProgramRepositoryBackingV1();
  return { open: () => createMemoryProgramRepositoryV1({ backing }) };
}

function createIndexedDbHarnessV1(): RepositoryHarnessV1 {
  const indexedDB = new FakeIDBFactory();
  return {
    open: () =>
      createIndexedDbProgramRepositoryV1({
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
    } satisfies ProgramRepositoryApplyRevisionInputV1,
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
    } satisfies ProgramRepositoryDecideInputV1,
  };
}

for (
  const [name, createHarness] of [
    ["memory", createMemoryHarnessV1],
    ["IndexedDB", createIndexedDbHarnessV1],
  ] as const
) {
  describe(`ProgramRepositoryV1 ${name} conformance`, () => {
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

    it("enforces the 64-Program origin bound atomically without blocking exact replay", async () => {
      const repository = createHarness().open();
      let firstSnapshot: ReturnType<typeof createSnapshotSequenceV1>["initial"] | null = null;
      for (let index = 0; index < programRepositoryMaximumProgramsV1; index += 1) {
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
      expect(await repository.list()).toHaveLength(programRepositoryMaximumProgramsV1);
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

describe("ProgramRepositoryV1 strict admission", () => {
  it("rejects unknown keys and an aggregate larger than 512 KiB", () => {
    const repository = createMemoryProgramRepositoryV1();
    const { initial } = createSnapshotSequenceV1("workspace.admission.one");
    return repository.create({ snapshot: initial, updatedAt: 1 }).then((result) => {
      if (result.kind !== "committed") throw new Error("expected Program aggregate");
      expect(
        admitProgramRepositoryAggregateV1({ ...result.aggregate, unexpected: true }),
      ).toEqual({ kind: "rejected", path: "/" });
      const messages = Array.from({ length: 96 }, (_, index) => ({
        messageId: `workspace.admission.one.message.large.${String(index + 1)}`,
        role: index % 2 === 0 ? "user" as const : "creator" as const,
        text: "界".repeat(8_192),
      }));
      expect(
        admitProgramRepositoryAggregateV1({
          ...result.aggregate,
          snapshot: { ...result.aggregate.snapshot, messages },
        }),
      ).toEqual({ kind: "rejected", path: "/" });
    });
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

describe("IndexedDB ProgramRepositoryV1 physical contract", () => {
  it("owns exactly the v1 programs store and refuses newer or malformed schemas", async () => {
    const currentFactory = new FakeIDBFactory();
    const currentName = "sillyos-program-repository-schema-current";
    const repository = createIndexedDbProgramRepositoryV1({
      indexedDB: currentFactory,
      databaseName: currentName,
    });
    await repository.initialize();
    const current = await openRawDatabaseV1(
      currentFactory,
      currentName,
      programRepositoryDatabaseVersionV1,
    );
    expect([...current.objectStoreNames]).toEqual([programRepositoryObjectStoreNameV1]);
    expect(
      current.transaction(programRepositoryObjectStoreNameV1).objectStore(
        programRepositoryObjectStoreNameV1,
      ).keyPath,
    ).toBe("programId");
    current.close();
    await repository.dispose();

    const futureFactory = new FakeIDBFactory();
    const futureName = "sillyos-program-repository-schema-future";
    const future = await openRawDatabaseV1(futureFactory, futureName, 2, (database) => {
      database.createObjectStore("future");
    });
    future.close();
    await expect(
      createIndexedDbProgramRepositoryV1({ indexedDB: futureFactory, databaseName: futureName })
        .initialize(),
    ).rejects.toMatchObject({ code: "database_newer" });

    const invalidFactory = new FakeIDBFactory();
    const invalidName = "sillyos-program-repository-schema-invalid";
    const invalid = await openRawDatabaseV1(invalidFactory, invalidName, 1, (database) => {
      database.createObjectStore(programRepositoryObjectStoreNameV1, { keyPath: "wrong" });
    });
    invalid.close();
    await expect(
      createIndexedDbProgramRepositoryV1({ indexedDB: invalidFactory, databaseName: invalidName })
        .initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid" });
  });

  it("fails closed for unavailable IndexedDB and a corrupt aggregate row", async () => {
    await expect(
      createIndexedDbProgramRepositoryV1({
        indexedDB: undefined as unknown as IDBFactory,
        databaseName: "sillyos-program-repository-unavailable",
      }).initialize(),
    ).rejects.toMatchObject({ code: "unavailable", operation: "initialize" });

    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-corrupt-row";
    const initialized = createIndexedDbProgramRepositoryV1({ indexedDB, databaseName });
    await initialized.initialize();
    await initialized.dispose();
    const database = await openRawDatabaseV1(indexedDB, databaseName, 1);
    const transaction = database.transaction(programRepositoryObjectStoreNameV1, "readwrite");
    const completion = completeTransactionV1(transaction);
    transaction.objectStore(programRepositoryObjectStoreNameV1).put({
      programId: "program.corrupt",
      schemaVersion: 1,
    });
    await completion;
    database.close();

    const reopened = createIndexedDbProgramRepositoryV1({ indexedDB, databaseName });
    await expect(reopened.load("program.corrupt")).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load",
    });
    await reopened.dispose();
  });

  it("maps blocked open, quota, and post-request abort without retaining a successor", async () => {
    const rawFactory = new FakeIDBFactory();
    const blockedFactory = new Proxy(rawFactory, {
      get(target, property, receiver) {
        if (property !== "open") return Reflect.get(target, property, receiver) as unknown;
        return (name: string, version?: number) => {
          const request = target.open(name, version);
          queueMicrotask(() => {
            request.dispatchEvent(
              new FakeIDBVersionChangeEvent("blocked", {
                oldVersion: 0,
                newVersion: version ?? null,
              }),
            );
          });
          return request;
        };
      },
    }) as IDBFactory;
    await expect(
      createIndexedDbProgramRepositoryV1({
        indexedDB: blockedFactory,
        databaseName: "sillyos-program-repository-blocked",
      }).initialize(),
    ).rejects.toMatchObject({ code: "upgrade_blocked" });

    const indexedDB = new FakeIDBFactory();
    const databaseName = "sillyos-program-repository-commit-failures";
    const repository = createIndexedDbProgramRepositoryV1({ indexedDB, databaseName });
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
