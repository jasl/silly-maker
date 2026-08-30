// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  createIndexedDbProgramDataRepositoryV1,
  programDataDatabaseVersionV1,
  programDataStoreNamesV1,
} from "../product/indexeddb-program-data-repository.ts";
import type { ProgramCatalogContinuationV1 } from "../product/program-catalog-repository.ts";
import type {
  ProgramProcessCreateBundleInputV1,
  ProgramProcessDecisionBundleInputV1,
  ProgramProcessExecutionRevisionBundleInputV1,
  ProgramProcessRevisionBundleInputV1,
} from "../product/program-data-repository.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseV1,
  ProcessExecutionTerminalInputV1,
} from "../product/process-execution-repository.ts";
import { admitProgramDataRepositoryWorkerRequestEnvelopeV1 } from "../product/program-data-repository-worker-protocol.ts";
import {
  createBuiltinCreatorProgramDefinitionRevisionV1,
  type ProcessAttemptBeginInputV1,
  type ProcessTranscriptAppendInputV1,
  type TranscriptEntryV1,
} from "../product/program-process-repository.ts";
import type { PreviewProgramV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";

const databaseNameV1 = "sillymaker.example-silly-os.programs";

function repositoryV1(indexedDB: IDBFactory) {
  return createIndexedDbProgramDataRepositoryV1({ indexedDB, keyRange: IDBKeyRange });
}

function openRawV1(
  indexedDB: IDBFactory,
  version: number,
  upgrade?: (database: IDBDatabase, transaction: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseNameV1, version);
    request.addEventListener(
      "upgradeneeded",
      () => upgrade?.(request.result, request.transaction!),
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function requestV1<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionDoneV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
  });
}

function programV1(programId: string, revision: number): PreviewProgramV1 {
  return {
    programId,
    revision,
    kind: "translation",
    name: `Translator ${String(revision)}`,
    purpose: "Translate a reviewed workspace.",
    requirements: [`Requirement ${String(revision)}`],
    suggestedCapabilities: [],
  };
}

function continuationV1(
  programId: string,
  programRevision = 1,
  repositoryRevision = 1,
): ProgramCatalogContinuationV1 {
  return {
    revision: 1,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    programRevision,
    repositoryRevision,
  };
}

function snapshotV1(programId: string, programRevision = 1): ProgramWorkspaceSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: `snapshot.${programId}.${String(programRevision)}`,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    proposalId: `proposal.${programId}.${String(programRevision)}`,
    programRevision,
    baseRepositoryRevision: programRevision,
    checkpointId: `checkpoint.${programId}.${String(programRevision)}`,
    generation: programRevision,
    fileCount: 1,
    archiveBytes: 64,
  };
}

function entryV1(
  processId: string,
  sequence: number,
  role: TranscriptEntryV1["role"],
  markdown = `Entry ${String(sequence)}`,
): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId,
    sequence,
    entryId: `entry.${processId}.${String(sequence)}`,
    role,
    state: "committed",
    parts: [{ kind: "text_markdown", partId: `part.${String(sequence)}`, markdown }],
  };
}

function beginV1(processId: string): ProcessAttemptBeginInputV1 {
  return {
    processId,
    expectedProcessRevision: 1,
    expectedTranscriptFrontier: 0,
    commitId: `commit.${processId}.begin`,
    attemptId: `attempt.${processId}.1`,
    generation: 1,
    trigger: { kind: "new_entry", entry: entryV1(processId, 1, "user") },
    startingCheckpoint: {
      checkpointId: `checkpoint.${processId}.1`,
      throughSequence: 1,
      workspaceId: `workspace.${processId}`,
      workspaceCheckpointId: `workspace-checkpoint.${processId}.1`,
      workspaceGeneration: 1,
    },
    updatedAt: 2,
  };
}

function appendV1(processId: string): ProcessTranscriptAppendInputV1 {
  return {
    processId,
    expectedProcessRevision: 2,
    expectedTranscriptFrontier: 1,
    commitId: `commit.${processId}.append`,
    attemptBinding: { attemptId: `attempt.${processId}.1`, generation: 1 },
    entries: [entryV1(processId, 2, "assistant")],
    checkpoint: {
      checkpointId: `checkpoint.${processId}.2`,
      throughSequence: 2,
      workspaceId: `workspace.${processId}`,
      workspaceCheckpointId: `workspace-checkpoint.${processId}.2`,
      workspaceGeneration: 2,
    },
    terminalAttemptReceipt: {
      schemaVersion: 1,
      processId,
      attemptId: `attempt.${processId}.1`,
      generation: 1,
      outcome: "completed",
      terminalSequence: 2,
      terminalEntryId: `entry.${processId}.2`,
      interruptionDisposition: null,
    },
    updatedAt: 3,
  };
}

async function createProgramV1(
  repository: ReturnType<typeof createIndexedDbProgramDataRepositoryV1>,
  programId: string,
) {
  return await repository.create({
    commitId: `commit.${programId}.create`,
    program: programV1(programId, 1),
    proposalId: `proposal.${programId}.1`,
    continuation: continuationV1(programId),
    reviewedHead: { checkpointId: `checkpoint.${programId}.1`, generation: 1 },
    updatedAt: 1,
  });
}

function createBundleV1(
  programId: string,
  processId: string,
): ProgramProcessCreateBundleInputV1 {
  const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
  return {
    catalog: {
      commitId: `commit.${programId}.create`,
      program: programV1(programId, 1),
      proposalId: `proposal.${programId}.1`,
      continuation: continuationV1(programId),
      reviewedHead: { checkpointId: `checkpoint.${programId}.1`, generation: 1 },
      updatedAt: 1,
    },
    process: {
      processId,
      programDefinition: { programId: definition.programId, revision: definition.revision },
      subjectProgramId: programId,
      createdAt: 1,
    },
    transcript: {
      processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: `commit.${processId}.create-transcript`,
      attemptBinding: null,
      entries: [entryV1(processId, 1, "user")],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    },
  };
}

function revisionBundleV1(
  programId: string,
  processId: string,
): ProgramProcessRevisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
      commitId: `commit.${programId}.revision.2`,
      program: programV1(programId, 2),
      proposalId: `proposal.${programId}.2`,
      continuation: continuationV1(programId),
      reviewedHead: { checkpointId: `checkpoint.${programId}.2`, generation: 2 },
      updatedAt: 3,
    },
    transcript: {
      processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: `commit.${processId}.revision.2`,
      attemptBinding: null,
      entries: [entryV1(processId, 2, "assistant")],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 4,
    },
  };
}

function decisionBundleV1(
  programId: string,
  processId: string,
): ProgramProcessDecisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 2,
      expectedProposal: { proposalId: `proposal.${programId}.2`, programRevision: 2 },
      commitId: `commit.${programId}.reject.2`,
      continuation: continuationV1(programId, 2, 2),
      status: "rejected",
      updatedAt: 5,
    },
    transcript: {
      processId,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      commitId: `commit.${processId}.reject.2`,
      attemptBinding: null,
      entries: [entryV1(processId, 3, "system")],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 6,
    },
  };
}

function executionAcquireV1(
  programId: string,
  processId: string,
  ownerInstanceId = "owner.first",
  attemptId = `attempt.${processId}.1`,
  generation = 1,
  commitId = `commit.${processId}.execution.1`,
): ProcessExecutionAcquireInputV1 {
  return {
    ownerInstanceId,
    observedAt: 10,
    expiresAt: 110,
    attempt: {
      processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId,
      attemptId,
      generation,
      trigger: { kind: "new_entry", entry: entryV1(processId, 2, "user") },
      startingCheckpoint: {
        checkpointId: `process-checkpoint.${processId}.2`,
        throughSequence: 2,
        workspaceId: `workspace.${programId}`,
        workspaceCheckpointId: `checkpoint.${programId}.1`,
        workspaceGeneration: 1,
      },
      updatedAt: 10,
    },
  };
}

function executionTerminalV1(input: {
  readonly processId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly observedAt: number;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly sequence: number;
  readonly outcome: "completed" | "failed" | "cancelled" | "replaced" | "interrupted";
  readonly interruptionDisposition: "retryable" | "unrecoverable" | null;
  readonly workspaceCheckpointId: string;
  readonly workspaceGeneration: number;
  readonly commitId?: string;
}): ProcessExecutionTerminalInputV1 {
  const entry = entryV1(input.processId, input.sequence, "assistant");
  return {
    lease: input.lease,
    observedAt: input.observedAt,
    transcript: {
      processId: input.processId,
      expectedProcessRevision: input.expectedProcessRevision,
      expectedTranscriptFrontier: input.expectedTranscriptFrontier,
      commitId: input.commitId ?? `commit.${input.processId}.terminal.${String(input.sequence)}`,
      attemptBinding: {
        attemptId: input.lease.attemptId,
        generation: input.lease.generation,
      },
      entries: [entry],
      checkpoint: {
        checkpointId: `process-checkpoint.${input.processId}.${String(input.sequence)}`,
        throughSequence: input.sequence,
        workspaceId: `workspace.${input.processId.replace(/^process\./u, "program.")}`,
        workspaceCheckpointId: input.workspaceCheckpointId,
        workspaceGeneration: input.workspaceGeneration,
      },
      terminalAttemptReceipt: {
        schemaVersion: 1,
        processId: input.processId,
        attemptId: input.lease.attemptId,
        generation: input.lease.generation,
        outcome: input.outcome,
        terminalSequence: input.sequence,
        terminalEntryId: entry.entryId,
        interruptionDisposition: input.interruptionDisposition,
      },
      updatedAt: input.observedAt,
    },
  };
}

describe("IndexedDB Program data repository V9", () => {
  it("creates the exact normalized schema and indexes null subjects without scanning", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.initialize();
    await repository.dispose();

    const database = await openRawV1(indexedDB, programDataDatabaseVersionV1);
    expect([...database.objectStoreNames]).toEqual([...programDataStoreNamesV1]);
    const transaction = database.transaction([...programDataStoreNamesV1], "readonly");
    expect(transaction.objectStore("program_definitions").keyPath).toEqual([
      "programId",
      "revision",
    ]);
    const processIndex = transaction.objectStore("processes").index("by_subject_updated_at");
    expect(processIndex.keyPath).toEqual(["subjectKey", "updatedAt", "processId"]);
    expect(transaction.objectStore("transcript_entries").index("by_process_entry_id").unique)
      .toBe(true);
    expect(transaction.objectStore("program_decisions").index("by_program_revision").unique)
      .toBe(true);
    database.close();
  });

  for (
    const legacy of [
      { version: 4, stores: ["programs", "workspace_continuations"] },
      { version: 5, stores: ["programs", "workspace_continuations"] },
      { version: 6, stores: ["programs", "program_network_grants", "workspace_continuations"] },
      { version: 7, stores: ["program_network_access", "programs", "workspace_continuations"] },
    ]
  ) {
    it(`row-blind resets exact V${String(legacy.version)} storage`, async () => {
      const indexedDB = new IDBFactory();
      const old = await openRawV1(indexedDB, legacy.version, (database) => {
        for (const name of legacy.stores) {
          database.createObjectStore(name, { keyPath: "programId" });
        }
      });
      const write = old.transaction(legacy.stores, "readwrite");
      for (const name of legacy.stores) {
        write.objectStore(name).put({ programId: `poison.${name}`, impossible: true });
      }
      await transactionDoneV1(write);
      old.close();

      const repository = repositoryV1(indexedDB);
      await repository.initialize();
      await repository.dispose();
      const upgraded = await openRawV1(indexedDB, programDataDatabaseVersionV1);
      expect([...upgraded.objectStoreNames]).toEqual([...programDataStoreNamesV1]);
      const read = upgraded.transaction([...programDataStoreNamesV1], "readonly");
      for (const name of programDataStoreNamesV1) {
        expect(await requestV1(read.objectStore(name).count())).toBe(0);
      }
      upgraded.close();
    });
  }

  it("fails closed for unknown, malformed, future, and blocked databases", async () => {
    const unknownFactory = new IDBFactory();
    (await openRawV1(unknownFactory, 3, (database) => database.createObjectStore("unknown")))
      .close();
    await expect(
      repositoryV1(unknownFactory).initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid" });

    const malformedFactory = new IDBFactory();
    (await openRawV1(malformedFactory, 7, (database) => {
      database.createObjectStore("programs");
      database.createObjectStore("workspace_continuations", { keyPath: "programId" });
      database.createObjectStore("program_network_access", { keyPath: "programId" });
    })).close();
    await expect(
      repositoryV1(malformedFactory).initialize(),
    ).rejects.toMatchObject({ code: "schema_invalid" });

    const futureFactory = new IDBFactory();
    (await openRawV1(futureFactory, 10, (database) => database.createObjectStore("future")))
      .close();
    await expect(
      repositoryV1(futureFactory).initialize(),
    ).rejects.toMatchObject({ code: "database_newer" });

    const blockedFactory = new IDBFactory();
    const blocker = await openRawV1(blockedFactory, 7, (database) => {
      database.createObjectStore("programs", { keyPath: "programId" });
      database.createObjectStore("workspace_continuations", { keyPath: "programId" });
      database.createObjectStore("program_network_access", { keyPath: "programId" });
    });
    await expect(
      repositoryV1(blockedFactory).initialize(),
    ).rejects.toMatchObject({ code: "upgrade_blocked" });
    blocker.close();
  });

  it("persists normalized Catalog state across cold reopen and serializes competing CAS", async () => {
    const indexedDB = new IDBFactory();
    const first = repositoryV1(indexedDB);
    expect((await createProgramV1(first, "program.alpha")).kind).toBe("committed");
    expect(
      (await first.decide({
        programId: "program.alpha",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.alpha.1", programRevision: 1 },
        commitId: "commit.program.alpha.accept",
        continuation: continuationV1("program.alpha"),
        status: "accepted",
        snapshotReceipt: snapshotV1("program.alpha"),
        updatedAt: 2,
      })).kind,
    ).toBe("committed");
    await first.dispose();

    const left = repositoryV1(indexedDB);
    const right = repositoryV1(indexedDB);
    expect(await left.loadLatestAcceptedDecision("program.alpha")).toMatchObject({
      snapshot: { snapshotId: "snapshot.program.alpha.1" },
    });
    expect(await left.loadDecision("program.alpha", "proposal.program.alpha.1", 1)).toEqual({
      programId: "program.alpha",
      proposalId: "proposal.program.alpha.1",
      programRevision: 1,
      status: "accepted",
      repositoryRevision: 2,
      snapshot: snapshotV1("program.alpha"),
    });
    expect(
      await left.listAcceptedDecisions({
        programId: "program.alpha",
        beforeProgramRevision: null,
        maximumBytes: 4_096,
      }),
    ).toEqual({
      decisions: [{
        programId: "program.alpha",
        proposalId: "proposal.program.alpha.1",
        programRevision: 1,
        status: "accepted",
        repositoryRevision: 2,
        snapshot: snapshotV1("program.alpha"),
      }],
      nextCursor: null,
    });
    expect(await left.loadContinuation("program.alpha")).toMatchObject({ repositoryRevision: 2 });
    const base = {
      programId: "program.alpha",
      expectedRepositoryRevision: 2,
      expectedProposal: { proposalId: "proposal.program.alpha.1", programRevision: 1 },
      program: programV1("program.alpha", 2),
      proposalId: "proposal.program.alpha.2",
      reviewedHead: { checkpointId: "checkpoint.program.alpha.2", generation: 2 },
      updatedAt: 3,
    } as const;
    const [one, two] = await Promise.all([
      left.applyRevision({
        ...base,
        commitId: "commit.program.alpha.apply.left",
        continuation: continuationV1("program.alpha", 1, 2),
      }),
      right.applyRevision({
        ...base,
        commitId: "commit.program.alpha.apply.right",
        continuation: continuationV1("program.alpha", 1, 2),
      }),
    ]);
    expect([one.kind, two.kind].sort()).toEqual(["committed", "conflict"]);
    expect((await left.load("program.alpha"))?.head.repositoryRevision).toBe(3);
    await left.dispose();
    await right.dispose();
  });

  it("atomically rolls back Catalog creation when a later row write fails", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const originalAdd = FakeIDBObjectStore.prototype.add;
    let addCount = 0;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      addCount += 1;
      if (addCount === 2) throw new DOMException("synthetic quota", "QuotaExceededError");
      return originalAdd.apply(this, args);
    });
    try {
      await expect(createProgramV1(repository, "program.atomic-create")).rejects.toMatchObject({
        code: "quota_exceeded",
        operation: "create_program",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.listPrograms({ before: null, maximumBytes: 4_096 })).toEqual({
      summaries: [],
      nextCursor: null,
    });
    expect(await repository.load("program.atomic-create")).toBeNull();
    expect(await repository.loadContinuation("program.atomic-create")).toBeNull();
    expect((await createProgramV1(repository, "program.atomic-create")).kind).toBe("committed");
    await repository.dispose();
  });

  it("maps an explicit transaction abort and retains the complete Catalog predecessor", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    expect((await createProgramV1(repository, "program.explicit-abort")).kind).toBe("committed");
    const mutation = {
      programId: "program.explicit-abort",
      expectedRepositoryRevision: 1,
      expectedProposal: {
        proposalId: "proposal.program.explicit-abort.1",
        programRevision: 1,
      },
      commitId: "commit.program.explicit-abort.apply",
      program: programV1("program.explicit-abort", 2),
      proposalId: "proposal.program.explicit-abort.2",
      continuation: continuationV1("program.explicit-abort"),
      reviewedHead: { checkpointId: "checkpoint.program.explicit-abort.2", generation: 2 },
      updatedAt: 2,
    } as const;
    const originalPut = FakeIDBObjectStore.prototype.put;
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalPut>
    ) {
      const request = originalPut.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    });
    try {
      await expect(repository.applyRevision(mutation)).rejects.toMatchObject({
        code: "transaction_aborted",
        operation: "apply_program_revision",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect((await repository.load("program.explicit-abort"))?.head).toMatchObject({
      repositoryRevision: 1,
      currentProgramRevision: 1,
    });
    expect(await repository.loadContinuation("program.explicit-abort")).toEqual(
      continuationV1("program.explicit-abort"),
    );
    expect((await repository.applyRevision(mutation)).kind).toBe("committed");
    await repository.dispose();
  });

  it("atomically commits and exact-replays the three Program/Process composites", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
    await repository.publishProgramDefinitionRevision(definition);
    const create = createBundleV1("program.composite", "process.composite");
    expect(await repository.createProgramWithProcess(create)).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 1 } },
      process: { revision: 2, transcriptFrontier: 1 },
      entries: [{ entryId: "entry.process.composite.1" }],
    });
    expect(await repository.createProgramWithProcess(create)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 1 } },
      process: { revision: 2, transcriptFrontier: 1 },
    });
    expect(
      await repository.createProgramWithProcess({
        ...create,
        process: { ...create.process, createdAt: 2 },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentProgram: { head: { repositoryRevision: 1 } },
      currentProcess: { createdAt: 1, revision: 2, transcriptFrontier: 1 },
    });
    expect(
      await repository.createProgramWithProcess({
        ...create,
        transcript: {
          ...create.transcript,
          entries: [entryV1("process.composite", 1, "user", "different")],
        },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentProgram: { head: { repositoryRevision: 1 } },
      currentProcess: { revision: 2, transcriptFrontier: 1 },
    });

    const revision = revisionBundleV1("program.composite", "process.composite");
    expect(
      await repository.applyProgramRevisionWithProcessTranscript({
        ...revision,
        transcript: { ...revision.transcript, expectedProcessRevision: 99 },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentProgram: { head: { repositoryRevision: 1, currentProgramRevision: 1 } },
      currentProcess: { revision: 2, transcriptFrontier: 1 },
    });
    expect(await repository.loadProgramRevision("program.composite", 2)).toBeNull();
    expect(await repository.applyProgramRevisionWithProcessTranscript(revision)).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 2, currentProgramRevision: 2 } },
      process: { revision: 3, transcriptFrontier: 2 },
    });
    expect(await repository.applyProgramRevisionWithProcessTranscript(revision)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 2 } },
      process: { revision: 3, transcriptFrontier: 2 },
    });

    const decision = decisionBundleV1("program.composite", "process.composite");
    expect(
      await repository.decideProgramWithProcessTranscript({
        ...decision,
        transcript: { ...decision.transcript, expectedTranscriptFrontier: 99 },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentProgram: { head: { repositoryRevision: 2, proposal: { status: "pending" } } },
      currentProcess: { revision: 3, transcriptFrontier: 2 },
    });
    expect(await repository.loadDecision("program.composite", "proposal.program.composite.2", 2))
      .toBeNull();
    expect(await repository.decideProgramWithProcessTranscript(decision)).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 3, proposal: { status: "rejected" } } },
      process: { revision: 4, transcriptFrontier: 3 },
    });
    expect(await repository.decideProgramWithProcessTranscript(decision)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 3 } },
      process: { revision: 4, transcriptFrontier: 3 },
    });
    expect(
      (await repository.loadTranscriptPage({
        processId: "process.composite",
        beforeSequence: null,
        maximumBytes: 4_096,
      }))?.entries.map((entry) => entry.sequence),
    ).toEqual([1, 2, 3]);
    await repository.dispose();
  });

  it("fences Process execution leases across tabs and settles expiry before explicit retry", async () => {
    const indexedDB = new IDBFactory();
    const first = repositoryV1(indexedDB);
    const second = repositoryV1(indexedDB);
    await first.publishProgramDefinitionRevision(createBuiltinCreatorProgramDefinitionRevisionV1());
    await first.createProgramWithProcess(createBundleV1("program.execution", "process.execution"));

    const acquire = executionAcquireV1("program.execution", "process.execution");
    const competing = executionAcquireV1(
      "program.execution",
      "process.execution",
      "owner.competing",
      "attempt.process.execution.competing",
      1,
      "commit.process.execution.competing",
    );
    const committed = await first.acquireProcessExecution(acquire);
    expect(committed).toMatchObject({
      kind: "committed",
      process: { revision: 3, transcriptFrontier: 2 },
      lease: { ownerInstanceId: "owner.first", expiresAt: 110 },
    });
    const replayed = await second.acquireProcessExecution(acquire);
    const persistedTrigger = (await second.loadTranscriptPage({
      processId: "process.execution",
      beforeSequence: null,
      maximumBytes: 4_096,
    }))?.entries.at(-1);
    expect(replayed).toMatchObject({ kind: "unchanged", entries: [persistedTrigger] });
    if (replayed.kind === "conflict" || acquire.attempt.trigger.kind !== "new_entry") {
      throw new Error("expected exact execution-acquire replay");
    }
    expect(replayed.entries[0]).not.toBe(acquire.attempt.trigger.entry);
    expect(await second.acquireProcessExecution(competing)).toMatchObject({
      kind: "conflict",
      currentLease: { ownerInstanceId: "owner.first" },
    });
    if (committed.kind === "conflict") throw new Error("expected execution lease");

    const renewed = await second.renewProcessExecutionLease({
      lease: committed.lease,
      observedAt: 50,
      expiresAt: 210,
    });
    expect(renewed).toMatchObject({ kind: "committed", lease: { expiresAt: 210 } });
    expect(
      await first.renewProcessExecutionLease({
        lease: committed.lease,
        observedAt: 50,
        expiresAt: 210,
      }),
    ).toMatchObject({ kind: "unchanged", lease: { expiresAt: 210 } });
    if (renewed.kind === "conflict") throw new Error("expected renewed execution lease");
    const released = await first.releaseProcessExecutionLease({
      lease: renewed.lease,
      observedAt: 80,
    });
    expect(released).toMatchObject({ kind: "committed", lease: { expiresAt: 80 } });
    if (released.kind === "conflict") throw new Error("expected released execution lease");

    const interrupted = executionTerminalV1({
      processId: "process.execution",
      lease: released.lease,
      observedAt: 90,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "interrupted",
      interruptionDisposition: "retryable",
      workspaceCheckpointId: "checkpoint.program.execution.1",
      workspaceGeneration: 1,
    });
    expect(await second.commitProcessExecutionTerminal(interrupted)).toMatchObject({
      kind: "committed",
      process: { revision: 4, status: "interrupted_retryable", activeAttempt: null },
    });
    expect(await first.loadProcessExecutionLease("process.execution")).toBeNull();
    expect(
      await first.queryProcessOperation({ operation: "execution_terminal", input: interrupted }),
    ).toMatchObject({ kind: "committed", receipt: { operation: "execution_terminal" } });
    expect(
      await first.queryProcessOperation({
        operation: "execution_terminal",
        input: {
          ...interrupted,
          transcript: {
            ...interrupted.transcript,
            entries: [entryV1("process.execution", 3, "assistant", "changed")],
          },
        },
      }),
    ).toMatchObject({ kind: "mismatch" });

    const retry: ProcessExecutionAcquireInputV1 = {
      ownerInstanceId: "owner.retry",
      observedAt: 100,
      expiresAt: 200,
      attempt: {
        processId: "process.execution",
        expectedProcessRevision: 4,
        expectedTranscriptFrontier: 3,
        commitId: "commit.process.execution.retry",
        attemptId: "attempt.process.execution.2",
        generation: 2,
        trigger: {
          kind: "existing_entry",
          entryId: "entry.process.execution.2",
          sequence: 2,
        },
        startingCheckpoint: interrupted.transcript.checkpoint!,
        updatedAt: 100,
      },
    };
    const retried = await first.acquireProcessExecution(retry);
    expect(retried).toMatchObject({
      kind: "committed",
      process: { revision: 5, transcriptFrontier: 3 },
      entries: [],
      lease: { ownerInstanceId: "owner.retry", generation: 2 },
    });
    if (retried.kind === "conflict") throw new Error("expected retry execution lease");
    expect(
      await second.commitProcessExecutionTerminal({
        ...interrupted,
        transcript: {
          ...interrupted.transcript,
          commitId: "commit.process.execution.stale-terminal",
        },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentLease: { ownerInstanceId: "owner.retry", generation: 2 },
    });
    const completed = executionTerminalV1({
      processId: "process.execution",
      lease: retried.lease,
      observedAt: 120,
      expectedProcessRevision: 5,
      expectedTranscriptFrontier: 3,
      sequence: 4,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.execution.1",
      workspaceGeneration: 1,
    });
    await expect(second.commitProcessExecutionTerminal(completed)).rejects.toThrow(
      "invalid Process execution terminal input",
    );
    const failed = executionTerminalV1({
      processId: "process.execution",
      lease: retried.lease,
      observedAt: 120,
      expectedProcessRevision: 5,
      expectedTranscriptFrontier: 3,
      sequence: 4,
      outcome: "failed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.execution.1",
      workspaceGeneration: 1,
      commitId: "commit.process.execution.failed",
    });
    expect(await second.commitProcessExecutionTerminal(failed)).toMatchObject({
      kind: "committed",
      process: { revision: 6, activeAttempt: null },
      operationReceipt: { terminalOutcome: "failed" },
    });
    expect(await first.loadProcessExecutionLease("process.execution")).toBeNull();
    expect(
      await first.queryProcessOperation({ operation: "execution_acquire", input: competing }),
    ).toEqual({ kind: "absent" });
    await first.dispose();
    await second.dispose();
  });

  it("uses only the Process operation receipt for a Program successor terminal", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await repository.createProgramWithProcess(createBundleV1("program.bundle", "process.bundle"));
    const acquired = await repository.acquireProcessExecution(
      executionAcquireV1("program.bundle", "process.bundle"),
    );
    if (acquired.kind === "conflict") throw new Error("expected execution lease");
    const terminal = executionTerminalV1({
      processId: "process.bundle",
      lease: acquired.lease,
      observedAt: 20,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.bundle.2",
      workspaceGeneration: 2,
    });
    const bundle: ProgramProcessExecutionRevisionBundleInputV1 = {
      ...terminal,
      catalog: {
        programId: "program.bundle",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.bundle.1", programRevision: 1 },
        commitId: "commit.program.bundle.revision.2",
        program: programV1("program.bundle", 2),
        proposalId: "proposal.program.bundle.2",
        continuation: continuationV1("program.bundle"),
        reviewedHead: { checkpointId: "checkpoint.program.bundle.2", generation: 2 },
        updatedAt: 20,
      },
    };
    await expect(
      repository.commitProgramRevisionWithProcessExecutionTerminal({
        ...bundle,
        transcript: {
          ...bundle.transcript,
          terminalAttemptReceipt: {
            ...bundle.transcript.terminalAttemptReceipt!,
            outcome: "failed",
          },
        },
      }),
    ).rejects.toThrow("invalid Process execution terminal input");
    expect(await repository.commitProgramRevisionWithProcessExecutionTerminal(bundle))
      .toMatchObject({
        kind: "committed",
        record: { head: { repositoryRevision: 2, currentProgramRevision: 2 } },
        process: { revision: 4, activeAttempt: null },
        operationReceipt: {
          operation: "program_revision_terminal",
          programId: "program.bundle",
          programRevision: 2,
          repositoryRevision: 2,
        },
      });
    const database = await openRawV1(indexedDB, programDataDatabaseVersionV1);
    const receiptTransaction = database.transaction(
      ["catalog_commits", "process_commits"],
      "readonly",
    );
    const receiptDone = transactionDoneV1(receiptTransaction);
    const [catalogReceipt, processReceipt] = await Promise.all([
      requestV1(
        receiptTransaction.objectStore("catalog_commits").get([
          bundle.catalog.programId,
          bundle.catalog.commitId,
        ]),
      ),
      requestV1(
        receiptTransaction.objectStore("process_commits").get([
          bundle.transcript.processId,
          bundle.transcript.commitId,
        ]),
      ),
    ]);
    await receiptDone;
    database.close();
    expect(catalogReceipt).toBeUndefined();
    expect(processReceipt).toMatchObject({
      operation: "program_revision_terminal",
      programId: bundle.catalog.programId,
      programRevision: 2,
      repositoryRevision: 2,
    });
    expect(await repository.applyRevision(bundle.catalog)).toMatchObject({
      kind: "conflict",
      current: { head: { repositoryRevision: 2, currentProgramRevision: 2 } },
    });
    expect(await repository.commitProgramRevisionWithProcessExecutionTerminal(bundle))
      .toMatchObject({
        kind: "unchanged",
      });
    expect(
      await repository.queryProcessOperation({
        operation: "program_revision_terminal",
        input: bundle,
      }),
    ).toMatchObject({ kind: "committed" });
    expect(
      await repository.queryProcessOperation({
        operation: "program_revision_terminal",
        input: {
          ...bundle,
          catalog: {
            ...bundle.catalog,
            program: { ...bundle.catalog.program, name: "Changed successor" },
          },
        },
      }),
    ).toMatchObject({ kind: "mismatch" });
    await repository.dispose();
  });

  it("admits all three exact operation-query wire shapes", () => {
    const acquire = executionAcquireV1("program.wire", "process.wire");
    const lease: ProcessExecutionLeaseV1 = {
      processId: "process.wire",
      ownerInstanceId: acquire.ownerInstanceId,
      attemptId: acquire.attempt.attemptId,
      generation: acquire.attempt.generation,
      expiresAt: acquire.expiresAt,
    };
    const terminal = executionTerminalV1({
      processId: "process.wire",
      lease,
      observedAt: 20,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "failed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.wire.2",
      workspaceGeneration: 2,
    });
    const completedTerminal = executionTerminalV1({
      processId: "process.wire",
      lease,
      observedAt: 20,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.wire.2",
      workspaceGeneration: 2,
    });
    const programTerminal: ProgramProcessExecutionRevisionBundleInputV1 = {
      ...completedTerminal,
      catalog: {
        programId: "program.wire",
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: "proposal.program.wire.1", programRevision: 1 },
        commitId: "commit.program.wire.2",
        program: programV1("program.wire", 2),
        proposalId: "proposal.program.wire.2",
        continuation: continuationV1("program.wire"),
        reviewedHead: { checkpointId: "checkpoint.program.wire.2", generation: 2 },
        updatedAt: 20,
      },
    };
    const expectations = [
      { operation: "execution_acquire", input: acquire },
      { operation: "execution_terminal", input: terminal },
      { operation: "program_revision_terminal", input: programTerminal },
    ] as const;
    for (const [index, input] of expectations.entries()) {
      const admitted = admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: `request.query.${String(index)}`,
        record: { method: "query_process_operation", input },
      });
      expect(admitted).toMatchObject({
        kind: "admitted",
        value: { record: { method: "query_process_operation", input } },
      });
    }
  });

  it("does not create a Program when its bundled Process definition is missing", async () => {
    const repository = repositoryV1(new IDBFactory());
    const bundle = createBundleV1("program.missing-definition", "process.missing-definition");
    expect(await repository.createProgramWithProcess(bundle)).toEqual({
      kind: "program_definition_missing",
      programDefinition: bundle.process.programDefinition,
    });
    expect(await repository.load("program.missing-definition")).toBeNull();
    expect(await repository.loadContinuation("program.missing-definition")).toBeNull();
    expect(await repository.loadProcess("process.missing-definition")).toBeNull();
    await repository.dispose();
  });

  it("rolls back both authorities when any composite write aborts", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    const create = createBundleV1("program.composite-rollback", "process.composite-rollback");
    const originalAdd = FakeIDBObjectStore.prototype.add;
    let addCount = 0;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      addCount += 1;
      if (addCount === 6) throw new DOMException("synthetic quota", "QuotaExceededError");
      return originalAdd.apply(this, args);
    });
    try {
      await expect(repository.createProgramWithProcess(create)).rejects.toMatchObject({
        code: "quota_exceeded",
        operation: "create_program_with_process",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.load("program.composite-rollback")).toBeNull();
    expect(await repository.loadContinuation("program.composite-rollback")).toBeNull();
    expect(await repository.loadProcess("process.composite-rollback")).toBeNull();
    expect((await repository.createProgramWithProcess(create)).kind).toBe("committed");

    const revision = revisionBundleV1(
      "program.composite-rollback",
      "process.composite-rollback",
    );
    const originalPut = FakeIDBObjectStore.prototype.put;
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalPut>
    ) {
      const request = originalPut.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    });
    try {
      await expect(repository.applyProgramRevisionWithProcessTranscript(revision)).rejects
        .toMatchObject({
          code: "transaction_aborted",
          operation: "apply_program_revision_with_process_transcript",
        });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.load("program.composite-rollback")).toMatchObject({
      head: { repositoryRevision: 1, currentProgramRevision: 1 },
    });
    expect(await repository.loadProcess("process.composite-rollback")).toMatchObject({
      revision: 2,
      transcriptFrontier: 1,
    });
    expect((await repository.applyProgramRevisionWithProcessTranscript(revision)).kind)
      .toBe("committed");

    const decision = decisionBundleV1(
      "program.composite-rollback",
      "process.composite-rollback",
    );
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalPut>
    ) {
      const request = originalPut.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    });
    try {
      await expect(repository.decideProgramWithProcessTranscript(decision)).rejects.toMatchObject({
        code: "transaction_aborted",
        operation: "decide_program_with_process_transcript",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.load("program.composite-rollback")).toMatchObject({
      head: { repositoryRevision: 2, proposal: { status: "pending" } },
    });
    expect(await repository.loadProcess("process.composite-rollback")).toMatchObject({
      revision: 3,
      transcriptFrontier: 2,
    });
    expect((await repository.decideProgramWithProcessTranscript(decision)).kind).toBe("committed");
    await repository.dispose();
  });

  it("fails closed when the compact Program head projection is malformed", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await createProgramV1(repository, "program.bad-head");
    await repository.dispose();
    const database = await openRawV1(indexedDB, programDataDatabaseVersionV1);
    const transaction = database.transaction("program_heads", "readwrite");
    const store = transaction.objectStore("program_heads");
    const row = await requestV1(store.get("program.bad-head")) as Record<string, unknown>;
    store.put({ ...row, name: " " });
    await transactionDoneV1(transaction);
    database.close();

    const reopened = repositoryV1(indexedDB);
    await expect(reopened.listPrograms({ before: null, maximumBytes: 4_096 })).rejects
      .toMatchObject({ code: "schema_invalid", operation: "list_programs" });
    await expect(reopened.load("program.bad-head")).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load_program",
    });
    await reopened.dispose();
  });

  it("reconciles Process commits exactly, preserves predecessor on conflict, and pages losslessly", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
    expect((await repository.publishProgramDefinitionRevision(definition)).kind).toBe("committed");
    for (
      const [processId, subjectProgramId] of [
        ["process.alpha", null],
        ["process.beta", null],
        ["process.subject", "program.alpha"],
      ] as const
    ) {
      expect(
        (await repository.createProcess({
          processId,
          programDefinition: { programId: definition.programId, revision: definition.revision },
          subjectProgramId,
          createdAt: 1,
        })).kind,
      ).toBe("committed");
    }
    const nullSubjects = await repository.listProcessSummaries({
      subjectProgramId: null,
      before: null,
      maximumBytes: 4096,
    });
    expect(nullSubjects.summaries.map((row) => row.processId).sort()).toEqual([
      "process.alpha",
      "process.beta",
    ]);

    const begin = beginV1("process.alpha");
    expect((await repository.beginProcessAttempt(begin)).kind).toBe("committed");
    expect(await repository.beginProcessAttempt(begin)).toMatchObject({
      kind: "unchanged",
      entries: [{ entryId: "entry.process.alpha.1" }],
    });
    expect(
      await repository.beginProcessAttempt({
        ...begin,
        trigger: { kind: "new_entry", entry: entryV1("process.alpha", 1, "user", "changed") },
      }),
    ).toMatchObject({ kind: "conflict", current: { revision: 2, transcriptFrontier: 1 } });

    const append = appendV1("process.alpha");
    expect((await repository.appendProcessTranscript(append)).kind).toBe("committed");
    await repository.dispose();

    const reopened = repositoryV1(indexedDB);
    expect(await reopened.beginProcessAttempt(begin)).toMatchObject({
      kind: "unchanged",
      process: { revision: 3, activeAttempt: null },
      entries: [{ entryId: "entry.process.alpha.1" }],
    });
    expect(await reopened.appendProcessTranscript(append)).toMatchObject({
      kind: "unchanged",
      process: { revision: 3, transcriptFrontier: 2 },
      entries: [{ entryId: "entry.process.alpha.2" }],
      terminalAttemptReceipt: { outcome: "completed" },
    });
    const all: TranscriptEntryV1[] = [];
    let beforeSequence: number | null = null;
    do {
      const page = await reopened.loadTranscriptPage({
        processId: "process.alpha",
        beforeSequence,
        maximumBytes: 220,
      });
      expect(page).not.toBeNull();
      all.unshift(...page!.entries);
      beforeSequence = page!.nextBeforeSequence;
    } while (beforeSequence !== null);
    expect(all.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(new Set(all.map((entry) => entry.entryId)).size).toBe(2);
    await reopened.dispose();
  });

  it("atomically rolls back a terminal Process append when its commit-row write fails", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
    await repository.publishProgramDefinitionRevision(definition);
    await repository.createProcess({
      processId: "process.atomic-append",
      programDefinition: { programId: definition.programId, revision: definition.revision },
      subjectProgramId: null,
      createdAt: 1,
    });
    await repository.beginProcessAttempt(beginV1("process.atomic-append"));
    const append = appendV1("process.atomic-append");
    const originalAdd = FakeIDBObjectStore.prototype.add;
    let addCount = 0;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      addCount += 1;
      if (addCount === 2) throw new DOMException("synthetic quota", "QuotaExceededError");
      return originalAdd.apply(this, args);
    });
    try {
      await expect(repository.appendProcessTranscript(append)).rejects.toMatchObject({
        code: "quota_exceeded",
        operation: "append_process_transcript",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.loadProcess("process.atomic-append")).toMatchObject({
      revision: 2,
      transcriptFrontier: 1,
      activeAttempt: { attemptId: "attempt.process.atomic-append.1" },
    });
    expect(await repository.loadProcess("process.atomic-append")).toMatchObject({
      lastTerminalAttempt: null,
    });
    expect(
      (await repository.loadTranscriptPage({
        processId: "process.atomic-append",
        beforeSequence: null,
        maximumBytes: 4_096,
      }))?.entries.map((entry) => entry.sequence),
    ).toEqual([1]);
    expect((await repository.appendProcessTranscript(append)).kind).toBe("committed");
    await repository.dispose();
  });

  it("fails closed for impossible stored Process commit and receipt relationships", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
    await repository.publishProgramDefinitionRevision(definition);
    await repository.createProcess({
      processId: "process.malformed-commit",
      programDefinition: { programId: definition.programId, revision: definition.revision },
      subjectProgramId: null,
      createdAt: 1,
    });
    const begin = beginV1("process.malformed-commit");
    const append = appendV1("process.malformed-commit");
    await repository.beginProcessAttempt(begin);
    await repository.appendProcessTranscript(append);
    await repository.dispose();

    const database = await openRawV1(indexedDB, programDataDatabaseVersionV1);
    const transaction = database.transaction(["process_commits"], "readwrite");
    const commits = transaction.objectStore("process_commits");
    const beginRow = await requestV1(
      commits.get(["process.malformed-commit", begin.commitId]),
    ) as Record<string, unknown>;
    commits.put({
      ...beginRow,
      lastSequence: 2,
      terminalAttemptReceipt: append.terminalAttemptReceipt,
    });
    const appendRow = await requestV1(
      commits.get(["process.malformed-commit", append.commitId]),
    ) as Record<string, unknown>;
    commits.put({
      ...appendRow,
      terminalAttemptReceipt: {
        ...append.terminalAttemptReceipt,
        terminalSequence: 1,
        terminalEntryId: "entry.process.malformed-commit.1",
      },
    });
    await transactionDoneV1(transaction);
    database.close();

    const reopened = repositoryV1(indexedDB);
    await expect(reopened.beginProcessAttempt(begin)).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "begin_process_attempt",
    });
    await expect(reopened.appendProcessTranscript(append)).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "append_process_transcript",
    });
    await reopened.dispose();
  });

  it("persists network preference and reset atomically clears every authority", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await createProgramV1(repository, "program.reset");
    expect(await repository.loadProgramNetworkAccess("program.reset")).toEqual({
      revision: 1,
      programId: "program.reset",
      enabled: false,
    });
    expect(
      (await repository.setProgramNetworkAccess({
        programId: "program.reset",
        enabled: true,
      })).kind,
    ).toBe("committed");
    await repository.reset();
    expect(await repository.load("program.reset")).toBeNull();
    expect(await repository.loadProgramNetworkAccess("program.reset")).toBeNull();
    await repository.dispose();
  });
});
