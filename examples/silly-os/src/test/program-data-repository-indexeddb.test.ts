// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  programDataDatabaseVersionV1,
  programDataStoreNamesV1,
} from "../product/indexeddb-program-data-repository.ts";
import type { ProgramCatalogContinuationV1 } from "../product/program-catalog-repository.ts";
import type {
  ProgramProcessCreateBundleInputV1,
  ProgramProcessDecisionBundleInputV1,
  ProgramProcessExecutionRevisionBundleInputV1,
  ProgramProcessRevisionBundleInputV1,
  ProcessWorkspaceCreateBundleInputV1,
  TranslationWorksetFinalizeExecutionBundleInputV1,
} from "../product/program-data-repository.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseV1,
  ProcessExecutionTerminalInputV1,
} from "../product/process-execution-repository.ts";
import { admitProgramDataRepositoryWorkerRequestEnvelopeV1 } from "../product/program-data-repository-worker-protocol.ts";
import {
  createBundledCreatorProgramDefinitionRevisionV1,
  type ProcessAttemptBeginInputV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramDefinitionRevisionV1,
  type TranscriptEntryV1,
} from "../product/program-process-repository.ts";
import type { PreviewProgramV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";
import { createIndexedDbProgramDataRepositoryTestAdapterV1 } from "./indexeddb-program-data-repository-test-adapter.ts";

const databaseNameV1 = "sillymaker.example-silly-os.programs";

function repositoryV1(indexedDB: IDBFactory) {
  return createIndexedDbProgramDataRepositoryTestAdapterV1({
    indexedDB,
    keyRange: IDBKeyRange,
  });
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
  repository: ReturnType<typeof createIndexedDbProgramDataRepositoryTestAdapterV1>,
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
  const definition = createBundledCreatorProgramDefinitionRevisionV1();
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

function translationDefinitionV1(): ProgramDefinitionRevisionV1 {
  return nonCreatorDefinitionV1("translation");
}

function nonCreatorDefinitionV1(
  kind: "translation" | "writing" | "roleplay" | "general",
): ProgramDefinitionRevisionV1 {
  return {
    schemaVersion: 1,
    programId: `sillyos.builtin.${kind}`,
    revision: 1,
    kind,
    name: kind,
    purpose: `Run one admitted ${kind} Process Workspace.`,
    harnessReference: `sillyos.harness.${kind}@1`,
    capabilityIds: [],
  };
}

function processWorkspaceBundleV1(
  programId: string,
  processId: string,
  definition = translationDefinitionV1(),
): ProcessWorkspaceCreateBundleInputV1 {
  const workspaceId = `workspace.${programId}`;
  return {
    process: {
      processId,
      programDefinition: { programId: definition.programId, revision: definition.revision },
      subjectProgramId: programId,
      createdAt: 1,
    },
    workspace: {
      revision: 1,
      processId,
      workspaceId,
      volumeId: `volume.${processId}`,
      workspaceFormat: 1,
    },
    transcript: {
      processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: `commit.${processId}.create-workspace`,
      attemptBinding: null,
      entries: [entryV1(processId, 1, "system", "Source imported.")],
      checkpoint: {
        checkpointId: `process-checkpoint.${processId}.1`,
        throughSequence: 1,
        workspaceId,
        workspaceCheckpointId: `workspace-checkpoint.${processId}.1`,
        workspaceGeneration: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: 2,
    },
  };
}

function translationSourceBindingV1(
  programId: string,
  processId: string,
  path: string,
) {
  return {
    revision: 1 as const,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${processId}`,
    workspaceFormat: 1 as const,
    path,
    checkpointId: `workspace-checkpoint.${processId}.1`,
    generation: 1,
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

function translationExecutionAcquireV1(
  programId: string,
  processId: string,
  ownerInstanceId = `owner.${processId}`,
): ProcessExecutionAcquireInputV1 {
  const attemptId = `attempt.${processId}.translation-import`;
  return {
    ownerInstanceId,
    observedAt: 3,
    expiresAt: 1_000_000,
    attempt: {
      processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: `commit.${processId}.translation-import.acquire`,
      attemptId,
      generation: 1,
      trigger: { kind: "new_entry", entry: entryV1(processId, 2, "user", "Import source") },
      startingCheckpoint: {
        checkpointId: `process-checkpoint.${processId}.2`,
        throughSequence: 2,
        workspaceId: `workspace.${programId}`,
        workspaceCheckpointId: `workspace-checkpoint.${processId}.1`,
        workspaceGeneration: 1,
      },
      updatedAt: 3,
    },
  };
}

async function acquireTranslationLeaseV1(
  repository: ReturnType<typeof createIndexedDbProgramDataRepositoryTestAdapterV1>,
  programId: string,
  processId: string,
  ownerInstanceId = `owner.${processId}`,
): Promise<ProcessExecutionLeaseV1> {
  const acquired = await repository.acquireTranslationWorksetImportExecution({
    expectedWorksetRevision: null,
    execution: translationExecutionAcquireV1(programId, processId, ownerInstanceId),
  });
  if (acquired.kind === "conflict") throw new Error("expected Translation import lease");
  return acquired.lease;
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

describe("IndexedDB Program data repository V13", () => {
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
    const workspaceVolumeIndex = transaction.objectStore("process_workspace_bindings").index(
      "by_volume_id",
    );
    expect(workspaceVolumeIndex.keyPath).toBe("volumeId");
    expect(workspaceVolumeIndex.unique).toBe(true);
    database.close();
  });

  for (const previousVersion of [3, 7, 9, 10, 11, 12]) {
    it(`row-blind resets arbitrary V${String(previousVersion)} preview storage`, async () => {
      const indexedDB = new IDBFactory();
      const old = await openRawV1(indexedDB, previousVersion, (database) => {
        database.createObjectStore("legacy_preview_rows", { keyPath: "id" });
      });
      const write = old.transaction("legacy_preview_rows", "readwrite");
      write.objectStore("legacy_preview_rows").put({ id: "old", impossible: true });
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

  it("fails closed for future and blocked databases", async () => {
    const futureFactory = new IDBFactory();
    (await openRawV1(futureFactory, 14, (database) => database.createObjectStore("future")))
      .close();
    await expect(
      repositoryV1(futureFactory).initialize(),
    ).rejects.toMatchObject({ code: "database_newer" });

    const blockedFactory = new IDBFactory();
    const blocker = await openRawV1(blockedFactory, 12, (database) => {
      database.createObjectStore("legacy_preview_rows", { keyPath: "id" });
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
    const definition = createBundledCreatorProgramDefinitionRevisionV1();
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

  it("atomically creates isolated translation Process Workspace bindings", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(repository, "program.translation");
    const first = processWorkspaceBundleV1("program.translation", "process.translation.one");
    expect(await repository.createProcessWithWorkspace(first)).toMatchObject({
      kind: "committed",
      process: { revision: 2, transcriptFrontier: 1, checkpoint: { throughSequence: 1 } },
      workspace: {
        processId: "process.translation.one",
        volumeId: "volume.process.translation.one",
      },
      entries: [{ sequence: 1 }],
    });
    expect(await repository.createProcessWithWorkspace(first)).toMatchObject({
      kind: "unchanged",
      process: { revision: 2 },
      workspace: { volumeId: "volume.process.translation.one" },
    });
    expect(await repository.loadProcessWorkspaceBinding("process.translation.one")).toEqual(
      first.workspace,
    );

    const second = processWorkspaceBundleV1("program.translation", "process.translation.two");
    expect(await repository.createProcessWithWorkspace(second)).toMatchObject({
      kind: "committed",
      workspace: { volumeId: "volume.process.translation.two" },
    });
    expect(await repository.loadProcessWorkspaceBinding("process.translation.two")).toEqual(
      second.workspace,
    );
    expect(
      await repository.createProcessWithWorkspace({
        ...first,
        workspace: { ...first.workspace, volumeId: "volume.changed" },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentProcess: { processId: "process.translation.one" },
      currentWorkspace: { volumeId: "volume.process.translation.one" },
    });
    await repository.dispose();
  });

  it("admits one Process owner for a Workspace volume under concurrent creation", async () => {
    const indexedDB = new IDBFactory();
    const firstRepository = repositoryV1(indexedDB);
    const secondRepository = repositoryV1(indexedDB);
    await firstRepository.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(firstRepository, "program.volume-contention");
    const first = processWorkspaceBundleV1(
      "program.volume-contention",
      "process.volume-contention.one",
    );
    const secondBase = processWorkspaceBundleV1(
      "program.volume-contention",
      "process.volume-contention.two",
    );
    const second = {
      ...secondBase,
      workspace: { ...secondBase.workspace, volumeId: first.workspace.volumeId },
    } satisfies ProcessWorkspaceCreateBundleInputV1;

    const results = await Promise.all([
      firstRepository.createProcessWithWorkspace(first),
      secondRepository.createProcessWithWorkspace(second),
    ]);
    const committed = results.find((result) => result.kind === "committed");
    const rejected = results.find((result) => result.kind === "workspace_volume_owned");
    expect(committed?.kind).toBe("committed");
    expect(rejected).toMatchObject({
      kind: "workspace_volume_owned",
      owner: {
        processId: committed?.kind === "committed" ? committed.process.processId : "",
        volumeId: first.workspace.volumeId,
      },
    });
    const losingProcessId = committed?.kind === "committed" &&
        committed.process.processId === first.process.processId
      ? second.process.processId
      : first.process.processId;
    expect(await firstRepository.loadProcess(losingProcessId)).toBeNull();
    expect(await firstRepository.loadProcessWorkspaceBinding(losingProcessId)).toBeNull();
    await Promise.all([firstRepository.dispose(), secondRepository.dispose()]);
  });

  it("requires the Process subject Program to exist before publishing its Workspace", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    const bundle = processWorkspaceBundleV1(
      "program.subject-missing",
      "process.subject-missing",
    );
    expect(await repository.createProcessWithWorkspace(bundle)).toEqual({
      kind: "subject_program_missing",
      subjectProgramId: "program.subject-missing",
    });
    expect(await repository.loadProcess(bundle.process.processId)).toBeNull();
    expect(await repository.loadProcessWorkspaceBinding(bundle.process.processId)).toBeNull();
    await repository.dispose();
  });

  it("keeps Creator Process creation on the Program-successor composite path", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const creatorDefinition = createBundledCreatorProgramDefinitionRevisionV1();
    await repository.publishProgramDefinitionRevision(creatorDefinition);
    await createProgramV1(repository, "program.creator-workspace");
    const bundle = processWorkspaceBundleV1(
      "program.creator-workspace",
      "process.creator-workspace",
      creatorDefinition,
    );
    await expect(repository.createProcessWithWorkspace(bundle)).rejects.toThrow(
      "Process Workspace creation requires a non-Creator definition",
    );
    expect(await repository.loadProcess(bundle.process.processId)).toBeNull();
    expect(await repository.loadProcessWorkspaceBinding(bundle.process.processId)).toBeNull();
    await repository.dispose();
  });

  it("rolls back Process, transcript, and Workspace binding together", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    const bundle = processWorkspaceBundleV1(
      "program.translation-rollback",
      "process.translation-rollback",
    );
    await createProgramV1(repository, "program.translation-rollback");
    const originalAdd = FakeIDBObjectStore.prototype.add;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      if (this.name === "process_commits") {
        throw new DOMException("synthetic quota", "QuotaExceededError");
      }
      return originalAdd.apply(this, args);
    });
    try {
      await expect(repository.createProcessWithWorkspace(bundle)).rejects.toMatchObject({
        code: "quota_exceeded",
        operation: "create_process_with_workspace",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await repository.loadProcess(bundle.process.processId)).toBeNull();
    expect(await repository.loadProcessWorkspaceBinding(bundle.process.processId)).toBeNull();
    expect(
      await repository.loadTranscriptPage({
        processId: bundle.process.processId,
        beforeSequence: null,
        maximumBytes: 4_096,
      }),
    ).toBeNull();
    expect(await repository.createProcessWithWorkspace(bundle)).toMatchObject({
      kind: "committed",
    });
    await repository.dispose();
  });

  it("allows persisted non-Creator Process-only completion but keeps Creator composite-only", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const writingDefinition = nonCreatorDefinitionV1("writing");
    await repository.publishProgramDefinitionRevision(writingDefinition);
    await createProgramV1(repository, "program.translation");
    await repository.createProcessWithWorkspace(
      processWorkspaceBundleV1(
        "program.translation",
        "process.translation",
        writingDefinition,
      ),
    );
    const translationAcquireInput = executionAcquireV1(
      "program.translation",
      "process.translation",
    );
    const translationAcquire = await repository.acquireProcessExecution({
      ...translationAcquireInput,
      attempt: {
        ...translationAcquireInput.attempt,
        startingCheckpoint: {
          ...translationAcquireInput.attempt.startingCheckpoint,
          workspaceCheckpointId: "workspace-checkpoint.process.translation.1",
        },
      },
    });
    if (translationAcquire.kind === "conflict") throw new Error("expected translation lease");
    const translationTerminal = executionTerminalV1({
      processId: "process.translation",
      lease: translationAcquire.lease,
      observedAt: 20,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: "workspace-checkpoint.process.translation.2",
      workspaceGeneration: 2,
    });
    expect(await repository.commitProcessExecutionTerminal(translationTerminal)).toMatchObject({
      kind: "committed",
      process: { activeAttempt: null, lastTerminalAttempt: { outcome: "completed" } },
      operationReceipt: { terminalOutcome: "completed", programId: null },
    });

    await repository.publishProgramDefinitionRevision(
      createBundledCreatorProgramDefinitionRevisionV1(),
    );
    await repository.createProgramWithProcess(
      createBundleV1("program.creator-terminal", "process.creator-terminal"),
    );
    const creatorAcquire = await repository.acquireProcessExecution(
      executionAcquireV1("program.creator-terminal", "process.creator-terminal"),
    );
    if (creatorAcquire.kind === "conflict") throw new Error("expected Creator lease");
    const creatorTerminal = executionTerminalV1({
      processId: "process.creator-terminal",
      lease: creatorAcquire.lease,
      observedAt: 20,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: "checkpoint.program.creator-terminal.1",
      workspaceGeneration: 1,
    });
    await expect(repository.commitProcessExecutionTerminal(creatorTerminal)).rejects.toThrow(
      "A Creator Process must publish a completed terminal with its Program successor",
    );
    await repository.dispose();
  });

  it("fences Process execution leases across tabs and settles expiry before explicit retry", async () => {
    const indexedDB = new IDBFactory();
    const first = repositoryV1(indexedDB);
    const second = repositoryV1(indexedDB);
    await first.publishProgramDefinitionRevision(createBundledCreatorProgramDefinitionRevisionV1());
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
      "A Creator Process must publish a completed terminal with its Program successor",
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
      createBundledCreatorProgramDefinitionRevisionV1(),
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
      createBundledCreatorProgramDefinitionRevisionV1(),
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
    const definition = createBundledCreatorProgramDefinitionRevisionV1();
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
    const definition = createBundledCreatorProgramDefinitionRevisionV1();
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
    const definition = createBundledCreatorProgramDefinitionRevisionV1();
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

  it("rejects a Translation workset beneath a non-Translation Process", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const writingDefinition = nonCreatorDefinitionV1("writing");
    await repository.publishProgramDefinitionRevision(writingDefinition);
    await createProgramV1(repository, "program.translation-wrong-process");
    await repository.createProcessWithWorkspace(
      processWorkspaceBundleV1(
        "program.translation-wrong-process",
        "process.translation-wrong-process",
        writingDefinition,
      ),
    );
    const acquired = await repository.acquireProcessExecution(
      translationExecutionAcquireV1(
        "program.translation-wrong-process",
        "process.translation-wrong-process",
      ),
    );
    if (acquired.kind === "conflict") throw new Error("expected writing Process lease");
    const lease = acquired.lease;

    await expect(repository.beginTranslationWorksetImport({
      processId: "process.translation-wrong-process",
      operationId: "translation.begin.wrong-process",
      lease,
      title: "Wrong process",
      document: {
        format: "plain_text",
        capabilityGrade: "round_trip_supported",
        capabilityReason: "known_format",
      },
      source: {
        fileName: "source.txt",
        mediaType: "text/plain",
        workspacePath: "input/source.txt",
        byteLength: 6,
        sha256: "a".repeat(64),
      },
      sourceBinding: translationSourceBindingV1(
        "program.translation-wrong-process",
        "process.translation-wrong-process",
        "input/source.txt",
      ),
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
      documentPurpose: "test",
      style: "faithful",
      expectedUnitCount: 1,
      expectedGlossaryCount: 0,
      updatedAt: 3,
    })).resolves.toEqual({ kind: "conflict", current: null });
    await repository.dispose();
  });

  it("fences every Translation import publication by the exact Process lease generation", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const programId = "program.translation.fenced";
    const processId = "process.translation.fenced";
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(repository, programId);
    await repository.createProcessWithWorkspace(processWorkspaceBundleV1(programId, processId));
    const predecessorLease = await acquireTranslationLeaseV1(repository, programId, processId);
    const begin = {
      processId,
      operationId: "translation.begin.fenced",
      lease: predecessorLease,
      title: "Fenced translation",
      document: {
        format: "plain_text" as const,
        capabilityGrade: "round_trip_supported" as const,
        capabilityReason: "known_format" as const,
      },
      source: {
        fileName: "fenced.txt",
        mediaType: "text/plain",
        workspacePath: "input/fenced.txt",
        byteLength: 6,
        sha256: "f".repeat(64),
      },
      sourceBinding: translationSourceBindingV1(programId, processId, "input/fenced.txt"),
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
      documentPurpose: "test",
      style: "faithful",
      expectedUnitCount: 1,
      expectedGlossaryCount: 0,
      updatedAt: 4,
    };
    expect(await repository.beginTranslationWorksetImport(begin)).toMatchObject({
      kind: "committed",
      head: { revision: 1, phase: "staging" },
    });

    const released = await repository.releaseProcessExecutionLease({
      lease: predecessorLease,
      observedAt: 5,
    });
    if (released.kind === "conflict") throw new Error("expected predecessor release");
    const interrupted = executionTerminalV1({
      processId,
      lease: released.lease,
      observedAt: 6,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "interrupted",
      interruptionDisposition: "retryable",
      workspaceCheckpointId: `workspace-checkpoint.${processId}.1`,
      workspaceGeneration: 1,
    });
    const settled = await repository.commitProcessExecutionTerminal(interrupted);
    if (settled.kind === "conflict" || settled.process.checkpoint === null) {
      throw new Error("expected interrupted predecessor terminal");
    }
    const successor = await repository.acquireTranslationWorksetImportExecution({
      expectedWorksetRevision: 1,
      execution: {
        ownerInstanceId: "owner.translation.successor",
        observedAt: 7,
        expiresAt: 1_000_001,
        attempt: {
          processId,
          expectedProcessRevision: settled.process.revision,
          expectedTranscriptFrontier: settled.process.transcriptFrontier,
          commitId: "commit.translation.successor.acquire",
          attemptId: "attempt.translation.successor",
          generation: 2,
          trigger: {
            kind: "existing_entry",
            entryId: `entry.${processId}.2`,
            sequence: 2,
          },
          startingCheckpoint: settled.process.checkpoint,
          updatedAt: 7,
        },
      },
    });
    if (successor.kind === "conflict") throw new Error("expected successor lease");

    // Receipt replay remains historical evidence and does not grant the old
    // owner authority for a new publication.
    expect(await repository.beginTranslationWorksetImport(begin)).toMatchObject({
      kind: "unchanged",
      head: { revision: 1 },
    });
    const append = {
      processId,
      operationId: "translation.append.fenced",
      expectedWorksetRevision: 1,
      units: [{
        unitId: "unit.fenced.0",
        order: 0,
        locator: "line:1",
        context: null,
        durationMilliseconds: null,
        source: "Source",
        protectedSegments: [],
      }],
      glossaryEntries: [],
      updatedAt: 8,
    };
    expect(
      await repository.appendTranslationWorksetImport({
        ...append,
        operationId: "translation.append.predecessor",
        lease: predecessorLease,
        updatedAt: 4,
      }),
    ).toMatchObject({ kind: "conflict", current: { revision: 1 } });
    expect(
      await repository.appendTranslationWorksetImport({ ...append, lease: successor.lease }),
    ).toMatchObject({ kind: "committed", head: { revision: 2, stagedUnitCount: 1 } });
    const predecessorTerminal = executionTerminalV1({
      processId,
      lease: predecessorLease,
      observedAt: 4,
      expectedProcessRevision: 5,
      expectedTranscriptFrontier: 3,
      sequence: 4,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: begin.sourceBinding.checkpointId,
      workspaceGeneration: begin.sourceBinding.generation,
      commitId: "commit.translation.finalize.predecessor.terminal",
    });
    expect(
      await repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
        workset: {
          processId,
          operationId: "translation.finalize.predecessor",
          lease: predecessorLease,
          expectedWorksetRevision: 2,
          sourceBinding: begin.sourceBinding,
          updatedAt: 4,
        },
        terminal: predecessorTerminal,
      }),
    ).toMatchObject({
      kind: "conflict",
      currentWorkset: { revision: 2, phase: "staging" },
    });
    const successorTerminal = executionTerminalV1({
      processId,
      lease: successor.lease,
      observedAt: 9,
      expectedProcessRevision: 5,
      expectedTranscriptFrontier: 3,
      sequence: 4,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: begin.sourceBinding.checkpointId,
      workspaceGeneration: begin.sourceBinding.generation,
      commitId: "commit.translation.finalize.successor.terminal",
    });
    expect(
      await repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
        workset: {
          processId,
          operationId: "translation.finalize.successor",
          lease: successor.lease,
          expectedWorksetRevision: 2,
          sourceBinding: begin.sourceBinding,
          updatedAt: 9,
        },
        terminal: successorTerminal,
      }),
    ).toMatchObject({
      kind: "committed",
      head: { revision: 3, phase: "ready" },
      process: { activeAttempt: null, lastTerminalAttempt: { outcome: "completed" } },
    });
    await repository.dispose();
  });

  it("binds the exact Translation workset expectation into the acquire receipt", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const programId = "program.translation.acquire-receipt";
    const processId = "process.translation.acquire-receipt";
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(repository, programId);
    await repository.createProcessWithWorkspace(processWorkspaceBundleV1(programId, processId));
    const input = {
      expectedWorksetRevision: null,
      execution: translationExecutionAcquireV1(programId, processId),
    };
    const committed = await repository.acquireTranslationWorksetImportExecution(input);
    expect(committed).toMatchObject({
      kind: "committed",
      operationReceipt: { operation: "translation_workset_import_execution_acquire" },
    });
    expect(await repository.acquireTranslationWorksetImportExecution(input)).toMatchObject({
      kind: "unchanged",
      operationReceipt: committed.kind === "conflict" ? null : committed.operationReceipt,
    });
    expect(
      await repository.queryProcessOperation({
        operation: "translation_workset_import_execution_acquire",
        input,
      }),
    ).toMatchObject({
      kind: "committed",
      receipt: { operation: "translation_workset_import_execution_acquire" },
    });
    expect(
      await repository.queryProcessOperation({
        operation: "translation_workset_import_execution_acquire",
        input: { ...input, expectedWorksetRevision: 1 },
      }),
    ).toMatchObject({ kind: "mismatch" });
    await repository.dispose();
  });

  it("atomically rejects a stale Translation acquire after another tab finalizes ready", async () => {
    const indexedDB = new IDBFactory();
    const first = repositoryV1(indexedDB);
    const second = repositoryV1(indexedDB);
    const programId = "program.translation.ready-race";
    const processId = "process.translation.ready-race";
    await first.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(first, programId);
    await first.createProcessWithWorkspace(processWorkspaceBundleV1(programId, processId));
    const lease = await acquireTranslationLeaseV1(first, programId, processId);
    const sourceBinding = translationSourceBindingV1(programId, processId, "input/source.txt");
    const begin = {
      processId,
      operationId: "translation.begin.ready-race",
      lease,
      title: "Ready race",
      document: {
        format: "plain_text" as const,
        capabilityGrade: "round_trip_supported" as const,
        capabilityReason: "known_format" as const,
      },
      source: {
        fileName: "source.txt",
        mediaType: "text/plain",
        workspacePath: sourceBinding.path,
        byteLength: 0,
        sha256: "a".repeat(64),
      },
      sourceBinding,
      sourceLocale: "ja",
      targetLocale: "en",
      documentPurpose: "test",
      style: "faithful",
      expectedUnitCount: 0,
      expectedGlossaryCount: 0,
      updatedAt: 4,
    };
    expect(await first.beginTranslationWorksetImport(begin)).toMatchObject({
      kind: "committed",
      head: { revision: 1, phase: "staging" },
    });
    const terminal = executionTerminalV1({
      processId,
      lease,
      observedAt: 5,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      sequence: 3,
      outcome: "completed",
      interruptionDisposition: null,
      workspaceCheckpointId: sourceBinding.checkpointId,
      workspaceGeneration: sourceBinding.generation,
      commitId: "translation.terminal.ready-race",
    });
    const finalized = await first
      .commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
        workset: {
          processId,
          operationId: "translation.finalize.ready-race",
          lease,
          expectedWorksetRevision: 1,
          sourceBinding,
          updatedAt: 5,
        },
        terminal,
      });
    if (finalized.kind === "conflict" || finalized.process.checkpoint === null) {
      throw new Error("expected ready Translation workset");
    }
    const beforeProcess = await first.loadProcess(processId);
    const beforeTranscript = await first.loadTranscriptPage({
      processId,
      beforeSequence: null,
      maximumBytes: 8_192,
    });
    const staleAcquire = {
      expectedWorksetRevision: 1,
      execution: {
        ownerInstanceId: "owner.translation.ready-race.stale",
        observedAt: 6,
        expiresAt: 1_000,
        attempt: {
          processId,
          expectedProcessRevision: finalized.process.revision,
          expectedTranscriptFrontier: finalized.process.transcriptFrontier,
          commitId: "translation.acquire.ready-race.stale",
          attemptId: "translation.attempt.ready-race.stale",
          generation: 2,
          trigger: {
            kind: "new_entry" as const,
            entry: entryV1(processId, 4, "user", "Import source again"),
          },
          startingCheckpoint: {
            ...finalized.process.checkpoint,
            checkpointId: "process-checkpoint.translation.ready-race.4",
            throughSequence: 4,
          },
          updatedAt: 6,
        },
      },
    };
    expect(await second.acquireTranslationWorksetImportExecution(staleAcquire)).toMatchObject({
      kind: "conflict",
      currentWorkset: { revision: 2, phase: "ready" },
      currentProcess: { lastTerminalAttempt: { outcome: "completed", generation: 1 } },
      currentLease: null,
    });
    expect(
      await second.queryProcessOperation({
        operation: "translation_workset_import_execution_acquire",
        input: staleAcquire,
      }),
    ).toEqual({ kind: "absent" });
    await expect(second.acquireProcessExecution(staleAcquire.execution)).rejects.toThrow(
      "A Translation Process must acquire execution with its workset expectation",
    );
    expect(await second.loadProcess(processId)).toEqual(beforeProcess);
    expect(
      await second.loadTranscriptPage({
        processId,
        beforeSequence: null,
        maximumBytes: 8_192,
      }),
    ).toEqual(beforeTranscript);
    expect(await second.loadProcessExecutionLease(processId)).toBeNull();
    await first.dispose();
    await second.dispose();
  });

  it("pages 10k Translation units across cold readers and reconciles exact operation receipts", async () => {
    const indexedDB = new IDBFactory();
    const writer = repositoryV1(indexedDB);
    await writer.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(writer, "program.translation.large");
    await writer.createProcessWithWorkspace(
      processWorkspaceBundleV1("program.translation.large", "process.translation.large"),
    );
    const lease = await acquireTranslationLeaseV1(
      writer,
      "program.translation.large",
      "process.translation.large",
    );
    const begin = {
      processId: "process.translation.large",
      operationId: "translation.begin.large",
      lease,
      title: "Large translation",
      document: {
        format: "plain_text" as const,
        capabilityGrade: "round_trip_supported" as const,
        capabilityReason: "known_format" as const,
      },
      source: {
        fileName: "large.txt",
        mediaType: "text/plain",
        workspacePath: "input/large.txt",
        byteLength: 100_000,
        sha256: "a".repeat(64),
      },
      sourceBinding: translationSourceBindingV1(
        "program.translation.large",
        "process.translation.large",
        "input/large.txt",
      ),
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
      documentPurpose: "VN script",
      style: "faithful",
      expectedUnitCount: 10_000,
      expectedGlossaryCount: 0,
      updatedAt: 3,
    };
    expect(await writer.beginTranslationWorksetImport(begin)).toMatchObject({
      kind: "committed",
      head: { phase: "staging", sourceBinding: begin.sourceBinding },
    });
    let revision = 1;
    for (let offset = 0; offset < 10_000; offset += 500) {
      const result = await writer.appendTranslationWorksetImport({
        processId: begin.processId,
        operationId: `translation.append.${String(offset)}`,
        lease,
        expectedWorksetRevision: revision,
        units: Array.from({ length: 500 }, (_, index) => {
          const order = offset + index;
          return {
            unitId: `unit.${String(order)}`,
            order,
            locator: `line:${String(order + 1)}`,
            context: null,
            durationMilliseconds: null,
            source: `Source ${String(order)}`,
            protectedSegments: [],
          };
        }),
        glossaryEntries: [],
        updatedAt: 4 + offset,
      });
      expect(result.kind).toBe("committed");
      if (result.kind === "committed") revision = result.head.revision;
    }
    const terminalV1 = (input: {
      readonly observedAt: number;
      readonly operationId: string;
      readonly sourceBinding: typeof begin.sourceBinding;
    }) =>
      executionTerminalV1({
        processId: begin.processId,
        lease,
        observedAt: input.observedAt,
        expectedProcessRevision: 3,
        expectedTranscriptFrontier: 2,
        sequence: 3,
        outcome: "completed",
        interruptionDisposition: null,
        workspaceCheckpointId: input.sourceBinding.checkpointId,
        workspaceGeneration: input.sourceBinding.generation,
        commitId: input.operationId,
      });
    const mismatchedBinding = { ...begin.sourceBinding, generation: 2 };
    expect(
      await writer.commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
        workset: {
          processId: begin.processId,
          operationId: "translation.finalize.mismatched-binding",
          lease,
          expectedWorksetRevision: revision,
          sourceBinding: mismatchedBinding,
          updatedAt: 20_004,
        },
        terminal: terminalV1({
          observedAt: 20_004,
          operationId: "translation.terminal.mismatched-binding",
          sourceBinding: mismatchedBinding,
        }),
      }),
    ).toMatchObject({
      kind: "conflict",
      currentWorkset: { phase: "staging", sourceBinding: begin.sourceBinding },
    });
    const finalizeBundle: TranslationWorksetFinalizeExecutionBundleInputV1 = {
      workset: {
        processId: begin.processId,
        operationId: "translation.finalize.large",
        lease,
        expectedWorksetRevision: revision,
        sourceBinding: begin.sourceBinding,
        updatedAt: 20_005,
      },
      terminal: terminalV1({
        observedAt: 20_005,
        operationId: "translation.terminal.large",
        sourceBinding: begin.sourceBinding,
      }),
    };
    await expect(writer.commitProcessExecutionTerminal(finalizeBundle.terminal)).rejects.toThrow(
      "A Translation Process must publish a completed terminal with its workset finalize",
    );
    const originalAdd = FakeIDBObjectStore.prototype.add;
    vi.spyOn(FakeIDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof originalAdd>
    ) {
      if (this.name === "process_commits") {
        throw new DOMException("synthetic quota", "QuotaExceededError");
      }
      return originalAdd.apply(this, args);
    });
    try {
      await expect(
        writer.commitTranslationWorksetFinalizeWithProcessExecutionTerminal(finalizeBundle),
      ).rejects.toMatchObject({
        code: "quota_exceeded",
        operation: "commit_translation_workset_finalize_with_process_execution_terminal",
      });
    } finally {
      vi.restoreAllMocks();
    }
    expect(await writer.loadTranslationWorksetHead(begin.processId)).toMatchObject({
      revision,
      phase: "staging",
    });
    expect(await writer.loadProcess(begin.processId)).toMatchObject({
      revision: 3,
      activeAttempt: { attemptId: lease.attemptId, generation: lease.generation },
    });
    expect(await writer.loadProcessExecutionLease(begin.processId)).toEqual(lease);
    expect(
      await writer.queryTranslationWorksetOperation({
        operation: "finalize",
        input: finalizeBundle.workset,
      }),
    ).toEqual({ kind: "absent" });
    expect(
      await writer.queryProcessOperation({
        operation: "execution_terminal",
        input: finalizeBundle.terminal,
      }),
    ).toEqual({ kind: "absent" });
    const finalized = await writer
      .commitTranslationWorksetFinalizeWithProcessExecutionTerminal(finalizeBundle);
    expect(finalized).toMatchObject({
      kind: "committed",
      head: { phase: "ready", stagedUnitCount: 10_000 },
      process: { activeAttempt: null, lastTerminalAttempt: { outcome: "completed" } },
      worksetOperationReceipt: { operation: "finalize" },
      processOperationReceipt: { operation: "execution_terminal" },
    });
    if (finalized.kind !== "committed") throw new Error("expected finalized Translation workset");
    expect(
      await writer.commitTranslationWorksetFinalizeWithProcessExecutionTerminal(finalizeBundle),
    ).toMatchObject({
      kind: "unchanged",
      worksetOperationReceipt: finalized.worksetOperationReceipt,
      processOperationReceipt: finalized.processOperationReceipt,
    });
    await writer.dispose();

    const readers = [repositoryV1(indexedDB), repositoryV1(indexedDB), repositoryV1(indexedDB)];
    const windows = await Promise.all(
      [0, 4_000, 9_990].map((fromOrder, index) =>
        readers[index]!.loadTranslationWorksetUnitPage({
          processId: begin.processId,
          expectedWorksetRevision: finalized.head.revision,
          fromOrder,
          maximumRows: 20,
          maximumBytes: 16_384,
        })
      ),
    );
    expect(windows.map((result) =>
      result.kind === "page"
        ? {
          firstOrder: result.page.rows[0]?.order,
          lastOrder: result.page.rows.at(-1)?.order,
          rowCount: result.page.rows.length,
          nextOrder: result.page.nextOrder,
        }
        : null
    )).toEqual([
      { firstOrder: 0, lastOrder: 19, rowCount: 20, nextOrder: 20 },
      { firstOrder: 4_000, lastOrder: 4_019, rowCount: 20, nextOrder: 4_020 },
      { firstOrder: 9_990, lastOrder: 9_999, rowCount: 10, nextOrder: null },
    ]);
    await expect(readers[0]!.loadTranslationWorksetUnitPage({
      processId: begin.processId,
      expectedWorksetRevision: finalized.head.revision,
      fromOrder: 0,
      maximumRows: 20,
      maximumBytes: 1,
    })).rejects.toMatchObject({
      code: "page_budget_too_small",
      operation: "load_translation_workset_unit_page",
    });
    expect(await readers[0]!.queryTranslationWorksetOperation({ operation: "begin", input: begin }))
      .toMatchObject({ kind: "committed", receipt: { worksetRevision: 1 } });
    expect(
      await readers[0]!.queryTranslationWorksetOperation({
        operation: "begin",
        input: { ...begin, title: "Different" },
      }),
    ).toMatchObject({ kind: "mismatch" });
    await Promise.all(readers.map((reader) => reader.dispose()));
  });

  it("atomically accepts one edited Translation candidate with exact CAS and protected tokens", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    const programId = "program.translation.review";
    const processId = "process.translation.review";
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    await createProgramV1(repository, programId);
    await repository.createProcessWithWorkspace(processWorkspaceBundleV1(programId, processId));
    const importLease = await acquireTranslationLeaseV1(repository, programId, processId);
    const sourceBinding = translationSourceBindingV1(programId, processId, "input/review.txt");
    const begin = await repository.beginTranslationWorksetImport({
      processId,
      operationId: "translation.review.begin",
      lease: importLease,
      title: "Review candidate",
      document: {
        format: "plain_text",
        capabilityGrade: "round_trip_supported",
        capabilityReason: "known_format",
      },
      source: {
        fileName: "review.txt",
        mediaType: "text/plain",
        workspacePath: sourceBinding.path,
        byteLength: 32,
        sha256: "c".repeat(64),
      },
      sourceBinding,
      sourceLocale: "en",
      targetLocale: "zh-Hans",
      documentPurpose: "test",
      style: "faithful",
      expectedUnitCount: 3,
      expectedGlossaryCount: 1_000,
      updatedAt: 4,
    });
    if (begin.kind === "conflict") throw new Error("expected Translation begin");
    const sourceUnits = [{
      unitId: "unit.review.0",
      order: 0,
      locator: "line:1",
      context: null,
      durationMilliseconds: null,
      source: "Hello ⟦SM:0⟧",
      protectedSegments: [{ token: "⟦SM:0⟧", kind: "placeholder" as const, source: "{name}" }],
    }, {
      unitId: "unit.review.1",
      order: 1,
      locator: "line:2",
      context: null,
      durationMilliseconds: null,
      source: "Good night",
      protectedSegments: [],
    }, {
      unitId: "unit.review.2",
      order: 2,
      locator: "line:3",
      context: null,
      durationMilliseconds: null,
      source: "See you",
      protectedSegments: [],
    }];
    const appended = await repository.appendTranslationWorksetImport({
      processId,
      operationId: "translation.review.append",
      lease: importLease,
      expectedWorksetRevision: begin.head.revision,
      units: sourceUnits,
      glossaryEntries: Array.from({ length: 1_000 }, (_, order) => ({
        entryId: `glossary.review.${String(order)}`,
        order,
        source: order === 0 ? "Hello" : `Absent term ${String(order)}`,
        target: order === 0 ? "你好" : `Unused target ${String(order)}`,
        note: null,
        locked: true,
      })),
      updatedAt: 5,
    });
    if (appended.kind === "conflict") throw new Error("expected Translation append");
    const imported = await repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
      workset: {
        processId,
        operationId: "translation.review.finalize",
        lease: importLease,
        expectedWorksetRevision: appended.head.revision,
        sourceBinding,
        updatedAt: 6,
      },
      terminal: executionTerminalV1({
        processId,
        lease: importLease,
        observedAt: 6,
        expectedProcessRevision: 3,
        expectedTranscriptFrontier: 2,
        sequence: 3,
        outcome: "completed",
        interruptionDisposition: null,
        workspaceCheckpointId: sourceBinding.checkpointId,
        workspaceGeneration: sourceBinding.generation,
        commitId: "translation.review.import-terminal",
      }),
    });
    if (imported.kind === "conflict" || imported.process.checkpoint === null) {
      throw new Error("expected ready Translation workset");
    }
    const batchAcquireInput = {
      expectedWorksetRevision: imported.head.revision,
      expectedFirstPendingOrder: 0,
      expectedPendingCandidateId: null,
      execution: {
        ownerInstanceId: "owner.translation.review",
        observedAt: 7,
        expiresAt: 1_000_007,
        attempt: {
          processId,
          expectedProcessRevision: imported.process.revision,
          expectedTranscriptFrontier: imported.process.transcriptFrontier,
          commitId: "translation.review.batch-acquire",
          attemptId: "attempt.translation.review.batch",
          generation: 2,
          trigger: {
            kind: "new_entry" as const,
            entry: entryV1(processId, 4, "user", "Translate the next batch"),
          },
          startingCheckpoint: {
            ...imported.process.checkpoint,
            checkpointId: "process-checkpoint.translation.review.4",
            throughSequence: 4,
          },
          updatedAt: 7,
        },
      },
    };
    const batchAcquired = await repository.acquireTranslationBatchExecution(batchAcquireInput);
    if (batchAcquired.kind === "conflict") throw new Error("expected Translation batch lease");
    const request = {
      sourceLocale: "en",
      targetLocale: "zh-Hans",
      documentPurpose: "test",
      style: "faithful",
      glossary: [{
        entryId: "glossary.review.0",
        source: "Hello",
        target: "你好",
        note: null,
        locked: true,
        appliesToUnitIds: ["unit.review.0"],
      }],
      confirmedMeaningFacts: [],
      neighboringUnits: { preceding: null, following: sourceUnits[2]! },
      units: sourceUnits.slice(0, 2),
    };
    const candidateTargets = [{ unitId: "unit.review.0", target: "你好 ⟦SM:0⟧" }, {
      unitId: "unit.review.1",
      target: "晚安",
    }];
    const mismatchedReference = await repository
      .commitTranslationBatchCandidateWithProcessExecutionTerminal({
        workset: {
          processId,
          operationId: "translation.review.candidate.mismatched-glossary",
          lease: batchAcquired.lease,
          expectedWorksetRevision: imported.head.revision,
          expectedFirstPendingOrder: 0,
          request: {
            ...request,
            glossary: [{
              ...request.glossary[0]!,
              target: "不匹配的术语",
            }],
          },
          candidate: {
            targets: [{ ...candidateTargets[0]!, target: "不匹配的术语 ⟦SM:0⟧" }, {
              ...candidateTargets[1]!,
            }],
            ambiguities: [],
          },
          updatedAt: 8,
        },
        terminal: executionTerminalV1({
          processId,
          lease: batchAcquired.lease,
          observedAt: 8,
          expectedProcessRevision: batchAcquired.process.revision,
          expectedTranscriptFrontier: batchAcquired.process.transcriptFrontier,
          sequence: 5,
          outcome: "completed",
          interruptionDisposition: null,
          workspaceCheckpointId: sourceBinding.checkpointId,
          workspaceGeneration: sourceBinding.generation,
          commitId: "translation.review.batch-terminal.mismatched-glossary",
        }),
      });
    expect(mismatchedReference).toMatchObject({
      kind: "conflict",
      currentWorkset: { revision: imported.head.revision, pendingCandidateId: null },
    });

    const originalOpenCursor = FakeIDBObjectStore.prototype.openCursor;
    let glossaryCursorScanCount = 0;
    const openCursor = vi.spyOn(FakeIDBObjectStore.prototype, "openCursor").mockImplementation(
      function (
        this: IDBObjectStore,
        query?: IDBValidKey | IDBKeyRange | null,
        direction?: IDBCursorDirection,
      ) {
        if (this.name === "translation_glossary_entries") glossaryCursorScanCount += 1;
        return originalOpenCursor.call(this, query, direction);
      },
    );
    const candidate = await repository.commitTranslationBatchCandidateWithProcessExecutionTerminal({
      workset: {
        processId,
        operationId: "translation.review.candidate",
        lease: batchAcquired.lease,
        expectedWorksetRevision: imported.head.revision,
        expectedFirstPendingOrder: 0,
        request,
        candidate: { targets: candidateTargets, ambiguities: [] },
        updatedAt: 8,
      },
      terminal: executionTerminalV1({
        processId,
        lease: batchAcquired.lease,
        observedAt: 8,
        expectedProcessRevision: batchAcquired.process.revision,
        expectedTranscriptFrontier: batchAcquired.process.transcriptFrontier,
        sequence: 5,
        outcome: "completed",
        interruptionDisposition: null,
        workspaceCheckpointId: sourceBinding.checkpointId,
        workspaceGeneration: sourceBinding.generation,
        commitId: "translation.review.batch-terminal",
      }),
    }).finally(() => openCursor.mockRestore());
    expect(glossaryCursorScanCount).toBe(0);
    if (candidate.kind === "conflict") throw new Error("expected pending Translation candidate");

    const invalidAccept = {
      processId,
      operationId: "translation.review.accept.invalid",
      expectedWorksetRevision: candidate.head.revision,
      candidateId: candidate.candidate.candidateId,
      targets: [{ unitId: "unit.review.0", target: "你好" }, candidateTargets[1]!],
      updatedAt: 9,
    };
    expect(await repository.acceptTranslationBatchCandidate(invalidAccept)).toMatchObject({
      kind: "conflict",
      current: {
        revision: candidate.head.revision,
        acceptedUnitCount: 0,
        pendingCandidateId: candidate.candidate.candidateId,
      },
    });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "accept_candidate",
        input: invalidAccept,
      }),
    ).toEqual({ kind: "absent" });

    const reorderedAccept = {
      ...invalidAccept,
      operationId: "translation.review.accept.reordered",
      targets: [candidateTargets[1]!, candidateTargets[0]!],
    };
    expect(await repository.acceptTranslationBatchCandidate(reorderedAccept)).toMatchObject({
      kind: "conflict",
      current: {
        revision: candidate.head.revision,
        acceptedUnitCount: 0,
        pendingCandidateId: candidate.candidate.candidateId,
      },
    });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "accept_candidate",
        input: reorderedAccept,
      }),
    ).toEqual({ kind: "absent" });

    const accept = {
      ...invalidAccept,
      operationId: "translation.review.accept",
      targets: [{ unitId: "unit.review.0", target: "您好，⟦SM:0⟧" }, candidateTargets[1]!],
    };
    const accepted = await repository.acceptTranslationBatchCandidate(accept);
    expect(accepted).toMatchObject({
      kind: "committed",
      head: {
        acceptedUnitCount: 2,
        acceptedBatchCount: 1,
        pendingCandidateId: null,
      },
      operationReceipt: {
        operation: "accept_candidate",
        candidateId: candidate.candidate.candidateId,
      },
    });
    if (accepted.kind === "conflict") throw new Error("expected accepted Translation candidate");
    expect(await repository.acceptTranslationBatchCandidate(accept)).toMatchObject({
      kind: "unchanged",
      head: accepted.head,
      operationReceipt: accepted.operationReceipt,
    });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "accept_candidate",
        input: accept,
      }),
    ).toMatchObject({ kind: "committed", receipt: accepted.operationReceipt });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "accept_candidate",
        input: { ...accept, targets: candidateTargets },
      }),
    ).toMatchObject({ kind: "mismatch" });
    expect(
      await repository.loadTranslationWorksetUnitPage({
        processId,
        expectedWorksetRevision: accepted.head.revision,
        fromOrder: 0,
        maximumRows: 3,
        maximumBytes: 8_192,
      }),
    ).toMatchObject({
      kind: "page",
      page: {
        rows: [{ unitId: "unit.review.0", target: "您好，⟦SM:0⟧" }, {
          unitId: "unit.review.1",
          target: "晚安",
        }, {
          unitId: "unit.review.2",
          target: null,
        }],
      },
    });
    expect(
      await repository.loadTranslationBatchCandidate(processId, candidate.candidate.candidateId),
    ).toBeNull();

    const processAfterAcceptance = await repository.loadProcess(processId);
    if (processAfterAcceptance?.checkpoint === null || processAfterAcceptance === null) {
      throw new Error("expected durable Translation Process checkpoint");
    }
    const secondTriggerSequence = processAfterAcceptance.transcriptFrontier + 1;
    const secondAcquire = await repository.acquireTranslationBatchExecution({
      expectedWorksetRevision: accepted.head.revision,
      expectedFirstPendingOrder: 2,
      expectedPendingCandidateId: null,
      execution: {
        ownerInstanceId: "owner.translation.review.second",
        observedAt: 10,
        expiresAt: 1_000_010,
        attempt: {
          processId,
          expectedProcessRevision: processAfterAcceptance.revision,
          expectedTranscriptFrontier: processAfterAcceptance.transcriptFrontier,
          commitId: "translation.review.second.acquire",
          attemptId: "attempt.translation.review.second",
          generation: 3,
          trigger: {
            kind: "new_entry",
            entry: entryV1(processId, secondTriggerSequence, "user", "Translate one more batch"),
          },
          startingCheckpoint: {
            ...processAfterAcceptance.checkpoint,
            checkpointId: "process-checkpoint.translation.review.second",
            throughSequence: secondTriggerSequence,
          },
          updatedAt: 10,
        },
      },
    });
    if (secondAcquire.kind === "conflict") throw new Error("expected second Translation batch");
    const secondRequest = {
      ...request,
      glossary: [],
      neighboringUnits: { preceding: sourceUnits[1]!, following: null },
      units: [sourceUnits[2]!],
    };
    const secondCandidate = await repository
      .commitTranslationBatchCandidateWithProcessExecutionTerminal({
        workset: {
          processId,
          operationId: "translation.review.second.candidate",
          lease: secondAcquire.lease,
          expectedWorksetRevision: accepted.head.revision,
          expectedFirstPendingOrder: 2,
          request: secondRequest,
          candidate: {
            targets: [{ unitId: "unit.review.2", target: "再见" }],
            ambiguities: [],
          },
          updatedAt: 11,
        },
        terminal: executionTerminalV1({
          processId,
          lease: secondAcquire.lease,
          observedAt: 11,
          expectedProcessRevision: secondAcquire.process.revision,
          expectedTranscriptFrontier: secondAcquire.process.transcriptFrontier,
          sequence: secondAcquire.process.transcriptFrontier + 1,
          outcome: "completed",
          interruptionDisposition: null,
          workspaceCheckpointId: sourceBinding.checkpointId,
          workspaceGeneration: sourceBinding.generation,
          commitId: "translation.review.second.terminal",
        }),
      });
    if (secondCandidate.kind === "conflict") {
      throw new Error("expected second pending Translation candidate");
    }
    const reject = {
      processId,
      operationId: "translation.review.reject",
      expectedWorksetRevision: secondCandidate.head.revision,
      candidateId: secondCandidate.candidate.candidateId,
      updatedAt: 12,
    };
    const rejected = await repository.rejectTranslationBatchCandidate(reject);
    expect(rejected).toMatchObject({
      kind: "committed",
      head: {
        acceptedUnitCount: 2,
        acceptedBatchCount: 1,
        pendingCandidateId: null,
      },
      operationReceipt: {
        operation: "reject_candidate",
        candidateId: secondCandidate.candidate.candidateId,
      },
    });
    if (rejected.kind === "conflict") throw new Error("expected rejected candidate");
    expect(await repository.rejectTranslationBatchCandidate(reject)).toMatchObject({
      kind: "unchanged",
      head: rejected.head,
      operationReceipt: rejected.operationReceipt,
    });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "reject_candidate",
        input: reject,
      }),
    ).toMatchObject({ kind: "committed", receipt: rejected.operationReceipt });
    expect(
      await repository.queryTranslationWorksetOperation({
        operation: "reject_candidate",
        input: { ...reject, updatedAt: 13 },
      }),
    ).toMatchObject({ kind: "mismatch" });
    expect(
      await repository.loadTranslationWorksetUnitPage({
        processId,
        expectedWorksetRevision: rejected.head.revision,
        fromOrder: 2,
        maximumRows: 1,
        maximumBytes: 8_192,
      }),
    ).toMatchObject({ kind: "page", page: { rows: [{ target: null }] } });
    expect(
      await repository.loadTranslationBatchCandidate(
        processId,
        secondCandidate.candidate.candidateId,
      ),
    ).toBeNull();
    await repository.dispose();
  });

  it("keeps Translation Process worksets isolated and rolls back a failed append transaction", async () => {
    const indexedDB = new IDBFactory();
    const repository = repositoryV1(indexedDB);
    await repository.publishProgramDefinitionRevision(translationDefinitionV1());
    const leases = new Map<string, ProcessExecutionLeaseV1>();
    for (const suffix of ["one", "two"] as const) {
      await createProgramV1(repository, `program.translation.${suffix}`);
      await repository.createProcessWithWorkspace(
        processWorkspaceBundleV1(`program.translation.${suffix}`, `process.translation.${suffix}`),
      );
      const lease = await acquireTranslationLeaseV1(
        repository,
        `program.translation.${suffix}`,
        `process.translation.${suffix}`,
      );
      leases.set(suffix, lease);
      await repository.beginTranslationWorksetImport({
        processId: `process.translation.${suffix}`,
        operationId: `translation.begin.${suffix}`,
        lease,
        title: suffix,
        document: {
          format: "plain_text",
          capabilityGrade: "round_trip_supported",
          capabilityReason: "known_format",
        },
        source: {
          fileName: `${suffix}.txt`,
          mediaType: "text/plain",
          workspacePath: `input/${suffix}.txt`,
          byteLength: 1,
          sha256: suffix === "one" ? "1".repeat(64) : "2".repeat(64),
        },
        sourceBinding: translationSourceBindingV1(
          `program.translation.${suffix}`,
          `process.translation.${suffix}`,
          `input/${suffix}.txt`,
        ),
        sourceLocale: "ja",
        targetLocale: "zh-Hans",
        documentPurpose: "test",
        style: "faithful",
        expectedUnitCount: 2,
        expectedGlossaryCount: 0,
        updatedAt: 3,
      });
    }
    const failed = {
      processId: "process.translation.one",
      operationId: "translation.append.failed",
      lease: leases.get("one")!,
      expectedWorksetRevision: 1,
      units: [0, 1].map((order) => ({
        unitId: "duplicate.unit",
        order,
        locator: "line",
        context: null,
        durationMilliseconds: null,
        source: "x",
        protectedSegments: [],
      })),
      glossaryEntries: [],
      updatedAt: 4,
    };
    await expect(repository.appendTranslationWorksetImport(failed)).rejects.toMatchObject({
      operation: "append_translation_workset_import",
    });
    expect(await repository.loadTranslationWorksetHead("process.translation.one")).toMatchObject({
      revision: 1,
      stagedUnitCount: 0,
    });
    expect(await repository.loadTranslationWorksetHead("process.translation.two")).toMatchObject({
      revision: 1,
    });
    expect(
      await repository.queryTranslationWorksetOperation({ operation: "append", input: failed }),
    ).toEqual({ kind: "absent" });
    await repository.dispose();
  });
});
