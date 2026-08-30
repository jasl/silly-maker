// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  createCreatorControllerV1,
  type CreatorControllerBudgetsV1,
  type CreatorControllerWorkspacePortV1,
} from "../product/creator-controller.ts";
import { createIndexedDbProgramDataRepositoryV1 } from "../product/indexeddb-program-data-repository.ts";
import type { ProgramCatalogContinuationV1 } from "../product/program-catalog-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
} from "../product/program-data-repository.ts";
import {
  createBuiltinCreatorProgramDefinitionRevisionV1,
  transcriptEntryUtf8ByteLengthV1,
  type TranscriptEntryV1,
} from "../product/program-process-repository.ts";
import type { CreatorAgentTerminalRunV1, PreviewProgramV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";

type TestProgramDataRepositoryV1 = ReturnType<typeof createIndexedDbProgramDataRepositoryV1>;

function createMemoryProgramDataRepositoryV1(): TestProgramDataRepositoryV1 {
  return createIndexedDbProgramDataRepositoryV1({
    indexedDB: new IDBFactory(),
    keyRange: IDBKeyRange,
  });
}

function workspaceReviewV1(
  record: Awaited<ReturnType<ProgramDataRepositoryV1["load"]>>,
): ProgramWorkspaceReviewProjectionV1 | null {
  if (record === null) return null;
  const pending = record.head.pendingReviewBinding;
  const mutableHead = pending === null ? null : {
    checkpointId: pending.checkpointId,
    generation: pending.generation,
  };
  return {
    revision: 1,
    latestAccepted: null,
    pendingReview: pending === null ? null : {
      proposalId: pending.proposalId,
      programRevision: pending.programRevision,
      checkpointId: pending.checkpointId,
      generation: pending.generation,
    },
    mutableHead,
    acceptedStatus: null,
    pendingStatus: pending === null ? null : "matches",
  };
}

function createControllerWorkspaceV1(
  repository: ProgramDataRepositoryV1,
): CreatorControllerWorkspacePortV1 {
  return {
    async inspectProgramWorkspace(programId) {
      return workspaceReviewV1(await repository.load(programId));
    },
    async closeActiveWorkspace() {},
    async create(input) {
      const programId = input.catalog.program.programId;
      return await repository.createProgramWithProcess({
        catalog: {
          ...input.catalog,
          continuation: {
            ...continuationV1(programId),
            workspaceId: input.workspaceId,
            volumeId: `volume.${input.workspaceId}`,
          },
          reviewedHead: {
            checkpointId: `checkpoint.${programId}.1`,
            generation: 1,
          },
        },
        process: input.process,
        transcript: input.transcript,
      });
    },
    async applyRevision(input) {
      const current = await repository.load(input.catalog.programId);
      const continuation = await repository.loadContinuation(input.catalog.programId);
      const binding = current?.head.pendingReviewBinding ?? null;
      if (current === null || continuation === null || binding === null) {
        return {
          kind: "conflict",
          currentProgram: current,
          currentProcess: await repository.loadProcess(input.transcript.processId),
        };
      }
      const reviewedHead = {
        checkpointId: binding.checkpointId,
        generation: binding.generation,
      };
      return await repository.applyProgramRevisionWithProcessTranscript({
        catalog: { ...input.catalog, continuation, reviewedHead },
        transcript: input.transcript.checkpoint === null ? input.transcript : {
          ...input.transcript,
          checkpoint: {
            ...input.transcript.checkpoint,
            workspaceCheckpointId: reviewedHead.checkpointId,
            workspaceGeneration: reviewedHead.generation,
          },
        },
      });
    },
    async applyAgentRevision(input) {
      const current = await repository.load(input.catalog.programId);
      const continuation = await repository.loadContinuation(input.catalog.programId);
      const binding = current?.head.pendingReviewBinding ?? null;
      if (current === null || continuation === null || binding === null) {
        return {
          kind: "conflict",
          currentProgram: current,
          currentProcess: await repository.loadProcess(input.transcript.processId),
          currentLease: await repository.loadProcessExecutionLease(input.transcript.processId),
        };
      }
      const reviewedHead = {
        checkpointId: binding.checkpointId,
        generation: binding.generation,
      };
      return await repository.commitProgramRevisionWithProcessExecutionTerminal({
        lease: input.lease,
        observedAt: input.observedAt,
        catalog: { ...input.catalog, continuation, reviewedHead },
        transcript: {
          ...input.transcript,
          checkpoint: {
            ...input.transcript.checkpoint,
            workspaceCheckpointId: reviewedHead.checkpointId,
            workspaceGeneration: reviewedHead.generation,
          },
        },
      });
    },
    async decide(input) {
      const current = await repository.load(input.catalog.programId);
      const continuation = await repository.loadContinuation(input.catalog.programId);
      if (current === null || continuation === null) {
        return {
          kind: "conflict",
          currentProgram: current,
          currentProcess: await repository.loadProcess(input.transcript.processId),
        };
      }
      if (input.catalog.status === "accepted") {
        const binding = current.head.pendingReviewBinding;
        if (binding === null) {
          return {
            kind: "conflict",
            currentProgram: current,
            currentProcess: await repository.loadProcess(input.transcript.processId),
          };
        }
        return await repository.decideProgramWithProcessTranscript({
          catalog: {
            ...input.catalog,
            continuation,
            snapshotReceipt: {
              revision: 1,
              snapshotId: `snapshot.${input.catalog.programId}.${String(binding.programRevision)}`,
              programId: input.catalog.programId,
              workspaceId: binding.workspaceId,
              volumeId: binding.volumeId,
              workspaceFormat: 1,
              proposalId: binding.proposalId,
              programRevision: binding.programRevision,
              baseRepositoryRevision: binding.repositoryRevision,
              checkpointId: binding.checkpointId,
              generation: binding.generation,
              fileCount: 0,
              archiveBytes: 0,
            },
          },
          transcript: input.transcript,
        });
      }
      return await repository.decideProgramWithProcessTranscript({
        catalog: { ...input.catalog, continuation },
        transcript: input.transcript,
      });
    },
  };
}

function createControllerV1(
  repository: ProgramDataRepositoryV1,
  options: Omit<
    Parameters<typeof createCreatorControllerV1>[0],
    "repository" | "workspace"
  > = {},
) {
  return createCreatorControllerV1({
    ...options,
    ownerInstanceId: options.ownerInstanceId ?? "test.controller.owner",
    repository,
    workspace: createControllerWorkspaceV1(repository),
  });
}

function continuationV1(programId: string): ProgramCatalogContinuationV1 {
  return {
    revision: 1,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  };
}

function programV1(programId: string): PreviewProgramV1 {
  return {
    programId,
    revision: 1,
    kind: "general",
    name: `Program ${programId}`,
    purpose: "Exercise the single-active Process projection.",
    requirements: ["Keep the Process transcript pageable."],
    suggestedCapabilities: [],
  };
}

function entryV1(processId: string, sequence: number, bytes = 64): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId,
    sequence,
    entryId: `${processId}.entry.${String(sequence)}`,
    role: sequence % 2 === 0 ? "assistant" : "user",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${processId}.part.${String(sequence)}`,
      markdown: `${String(sequence)}:${"x".repeat(bytes)}`,
    }],
  };
}

function createDeterministicIdV1(): (purpose: string) => string {
  let sequence = 0;
  return (purpose) => {
    sequence += 1;
    return `test.${purpose}.${String(sequence)}`;
  };
}

async function seedProgramV1(input: {
  readonly repository: TestProgramDataRepositoryV1;
  readonly programId: string;
  readonly updatedAt: number;
}): Promise<void> {
  const created = await input.repository.create({
    commitId: `commit.${input.programId}.create`,
    program: programV1(input.programId),
    proposalId: `proposal.${input.programId}.1`,
    continuation: continuationV1(input.programId),
    reviewedHead: { checkpointId: `checkpoint.${input.programId}.1`, generation: 1 },
    updatedAt: input.updatedAt,
  });
  if (created.kind !== "committed") throw new Error("expected Program creation");
}

async function seedProcessV1(input: {
  readonly repository: TestProgramDataRepositoryV1;
  readonly programId: string;
  readonly processId: string;
  readonly createdAt: number;
  readonly entries?: number;
  readonly entryBytes?: number;
}): Promise<void> {
  const created = await input.repository.createProcess({
    processId: input.processId,
    programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
    subjectProgramId: input.programId,
    createdAt: input.createdAt,
  });
  if (created.kind !== "committed") throw new Error("expected Process creation");
  const entries = Array.from(
    { length: input.entries ?? 1 },
    (_, index) => entryV1(input.processId, index + 1, input.entryBytes),
  );
  if (entries.length === 0) return;
  const appended = await input.repository.appendProcessTranscript({
    processId: input.processId,
    expectedProcessRevision: 1,
    expectedTranscriptFrontier: 0,
    commitId: `commit.${input.processId}.transcript`,
    attemptBinding: null,
    entries,
    checkpoint: null,
    terminalAttemptReceipt: null,
    updatedAt: input.createdAt,
  });
  if (appended.kind !== "committed") throw new Error("expected transcript append");
}

const ordinaryBudgetsV1: CreatorControllerBudgetsV1 = {
  programCatalogPageMaximumBytes: 1_024,
  processSummaryPageMaximumBytes: 1_024,
  transcriptPageMaximumBytes: 1_024,
  transcriptWindowMaximumBytes: 2_048,
};

describe("Creator Controller Program/Process projection", () => {
  it("publishes Creator rev1 and pages Program summaries without a total count cap", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    for (let index = 0; index < 12; index += 1) {
      await seedProgramV1({
        repository,
        programId: `program.catalog.${String(index)}`,
        updatedAt: index + 1,
      });
    }
    const controller = createControllerV1(repository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();
    expect(
      await repository.loadProgramDefinitionRevision("sillyos.builtin.creator", 1),
    ).toEqual(createBuiltinCreatorProgramDefinitionRevisionV1());
    expect(controller.getSnapshot().catalog.phase).toBe("ready");
    expect(controller.getSnapshot().catalog.summaries.length).toBeLessThan(12);

    while (controller.getSnapshot().catalog.nextCursor !== null) {
      expect((await controller.loadMorePrograms()).kind).toBe("completed");
    }
    expect(controller.getSnapshot().catalog.summaries).toHaveLength(12);
    expect(new Set(controller.getSnapshot().catalog.summaries.map(({ programId }) => programId)))
      .toHaveLength(12);
  });

  it("fences a late catalog page after a newer catalog initialization wins", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    for (let index = 0; index < 12; index += 1) {
      await seedProgramV1({
        repository,
        programId: `program.catalog.${String(index)}`,
        updatedAt: index + 1,
      });
    }
    const baseListPrograms = repository.listPrograms;
    let releaseMore!: () => void;
    const moreBlocked = new Promise<void>((resolve) => {
      releaseMore = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async listPrograms(input) {
        if (input.before !== null) await moreBlocked;
        return await baseListPrograms(input);
      },
    };
    const controller = createControllerV1(fencedRepository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();
    const firstPage = controller.getSnapshot().catalog.summaries.map(({ programId }) => programId);
    const more = controller.loadMorePrograms();

    await controller.initialize();
    releaseMore();

    expect(await more).toEqual({ kind: "failed", code: "superseded" });
    expect(controller.getSnapshot().catalog.summaries.map(({ programId }) => programId)).toEqual(
      firstPage,
    );
  });

  it("opens the newest Process for one Program and loads only its pinned rich projection", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await seedProgramV1({ repository, programId: "program.subject", updatedAt: 1 });
    await seedProcessV1({
      repository,
      programId: "program.subject",
      processId: "process.older",
      createdAt: 2,
    });
    await seedProcessV1({
      repository,
      programId: "program.subject",
      processId: "process.newer",
      createdAt: 3,
    });
    const controller = createControllerV1(repository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();

    expect(await controller.openProgram("program.subject")).toEqual({
      kind: "completed",
      value: true,
    });
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: {
        process: { processId: "process.newer" },
        definition: { programId: "sillyos.builtin.creator", revision: 1 },
        subject: { head: { programId: "program.subject" } },
      },
    });
    expect(
      controller.getSnapshot().activeProcess?.transcript.entries.map(({ processId }) => processId),
    ).toEqual(["process.newer"]);
  });

  it("loads older transcript pages while keeping the mounted window byte-bounded", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await seedProgramV1({ repository, programId: "program.long", updatedAt: 1 });
    await seedProcessV1({
      repository,
      programId: "program.long",
      processId: "process.long",
      createdAt: 2,
      entries: 10,
      entryBytes: 180,
    });
    const latestPageBytes = transcriptEntryUtf8ByteLengthV1(
      entryV1("process.long", 9, 180),
    ) + transcriptEntryUtf8ByteLengthV1(entryV1("process.long", 10, 180));
    const olderPageBytes = transcriptEntryUtf8ByteLengthV1(
      entryV1("process.long", 7, 180),
    ) + transcriptEntryUtf8ByteLengthV1(entryV1("process.long", 8, 180));
    const oneOlderEntryBytes = transcriptEntryUtf8ByteLengthV1(
      entryV1("process.long", 8, 180),
    );
    const pageMaximumBytes = Math.max(latestPageBytes, olderPageBytes);
    const budgets: CreatorControllerBudgetsV1 = {
      ...ordinaryBudgetsV1,
      transcriptPageMaximumBytes: pageMaximumBytes,
      transcriptWindowMaximumBytes: pageMaximumBytes + oneOlderEntryBytes,
    };
    const controller = createControllerV1(repository, { budgets });
    await controller.initialize();
    await controller.openProcess("process.long");
    const latest = controller.getSnapshot().activeProcess?.transcript;
    expect(latest?.entries.map(({ sequence }) => sequence)).toEqual([9, 10]);
    expect(latest?.nextBeforeSequence).toBe(9);

    expect(await controller.loadOlderTranscript()).toEqual({ kind: "completed", value: true });
    const older = controller.getSnapshot().activeProcess?.transcript;
    expect(older?.entries.map(({ sequence }) => sequence)).toEqual([7, 8]);
    expect(older?.newerOmitted).toBe(true);
    expect(older?.byteLength).toBeLessThanOrEqual(budgets.transcriptWindowMaximumBytes);

    expect(await controller.reloadLatestTranscript()).toEqual({ kind: "completed", value: true });
    expect(
      controller.getSnapshot().activeProcess?.transcript.entries.map(({ sequence }) => sequence),
    ).toEqual([9, 10]);

    expect(await controller.restoreTranscriptAround(4)).toEqual({
      kind: "completed",
      value: true,
    });
    const restored = controller.getSnapshot().activeProcess?.transcript;
    expect(restored?.entries.map(({ sequence }) => sequence)).toEqual([3, 4]);
    expect(restored?.nextBeforeSequence).toBe(3);
    expect(restored?.newerOmitted).toBe(true);
    expect(restored?.byteLength).toBeLessThanOrEqual(budgets.transcriptPageMaximumBytes);
  });

  it("fences a late Process load after a newer Process wins", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await seedProgramV1({ repository, programId: "program.first", updatedAt: 1 });
    await seedProgramV1({ repository, programId: "program.second", updatedAt: 2 });
    await seedProcessV1({
      repository,
      programId: "program.first",
      processId: "process.first",
      createdAt: 3,
    });
    await seedProcessV1({
      repository,
      programId: "program.second",
      processId: "process.second",
      createdAt: 4,
    });
    const baseLoadProcess = repository.loadProcess;
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async loadProcess(processId) {
        if (processId === "process.first") await firstBlocked;
        return await baseLoadProcess(processId);
      },
    };
    const controller = createControllerV1(fencedRepository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();
    const first = controller.openProcess("process.first");
    const second = await controller.openProcess("process.second");
    releaseFirst();

    expect(second).toEqual({ kind: "completed", value: true });
    expect(await first).toEqual({ kind: "failed", code: "superseded" });
    expect(controller.getSnapshot().activeProcess?.process.processId).toBe("process.second");
  });

  it("fences a late older-page load after switching the active Process", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await seedProgramV1({ repository, programId: "program.first", updatedAt: 1 });
    await seedProgramV1({ repository, programId: "program.second", updatedAt: 2 });
    await seedProcessV1({
      repository,
      programId: "program.first",
      processId: "process.first",
      createdAt: 3,
      entries: 8,
      entryBytes: 180,
    });
    await seedProcessV1({
      repository,
      programId: "program.second",
      processId: "process.second",
      createdAt: 4,
    });
    const baseLoadTranscriptPage = repository.loadTranscriptPage;
    let releaseOlder!: () => void;
    const olderBlocked = new Promise<void>((resolve) => {
      releaseOlder = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async loadTranscriptPage(input) {
        if (input.processId === "process.first" && input.beforeSequence !== null) {
          await olderBlocked;
        }
        return await baseLoadTranscriptPage(input);
      },
    };
    const controller = createControllerV1(fencedRepository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();
    await controller.openProcess("process.first");
    expect(controller.getSnapshot().activeProcess?.transcript.nextBeforeSequence).not.toBeNull();

    const older = controller.loadOlderTranscript();
    expect(await controller.openProcess("process.second")).toEqual({
      kind: "completed",
      value: true,
    });
    releaseOlder();

    expect(await older).toEqual({ kind: "failed", code: "superseded" });
    expect(controller.getSnapshot().activeProcess?.process.processId).toBe("process.second");
  });

  it("commits real create, follow-up, and proposal decision bundles", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const controller = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 10,
    });
    await controller.initialize();

    expect(await controller.submitIntent("Translate this script with a glossary.")).toEqual({
      kind: "completed",
      value: { kind: "created", workspaceId: "test.workspace.1" },
    });
    const created = controller.getSnapshot().activeProcess;
    expect(created).toMatchObject({
      process: { processId: "test.process.2", transcriptFrontier: 2 },
      subject: {
        currentProgram: { revision: 1, kind: "translation" },
        head: { proposal: { status: "pending", programRevision: 1 } },
      },
      transcript: {
        entries: [{ role: "user" }, { role: "assistant" }],
      },
    });

    expect(await controller.sendFollowUp("Preserve every speaker name.")).toEqual({
      kind: "completed",
      value: { kind: "sent", programRevision: 2 },
    });
    const revised = controller.getSnapshot().activeProcess;
    expect(revised).toMatchObject({
      process: { processId: "test.process.2", transcriptFrontier: 4 },
      subject: {
        currentProgram: {
          revision: 2,
          requirements: [
            "Translate this script with a glossary.",
            "Preserve every speaker name.",
          ],
        },
        head: { proposal: { status: "pending", programRevision: 2 } },
      },
    });
    const expectedProposal = revised?.subject?.head.proposal;
    if (expectedProposal === undefined) throw new Error("expected revised proposal");
    expect(await controller.rejectProposal(expectedProposal)).toEqual({
      kind: "completed",
      value: {
        kind: "applied",
        status: "rejected",
        proposal: {
          proposalId: expectedProposal.proposalId,
          programRevision: 2,
        },
      },
    });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      process: { processId: "test.process.2", transcriptFrontier: 5 },
      subject: {
        head: { proposal: { status: "rejected", programRevision: 2 } },
        latestDecision: { status: "rejected", programRevision: 2 },
      },
      transcript: {
        entries: [
          { role: "user" },
          { role: "assistant" },
          { role: "assistant" },
        ],
      },
    });
    expect(
      (await repository.loadTranscriptPage({
        processId: "test.process.2",
        beforeSequence: null,
        maximumBytes: 4_096,
      }))?.entries.map(({ role }) => role),
    ).toEqual(["user", "assistant", "user", "assistant", "assistant"]);
  });

  it("does not release a Pi run until its user entry and starting checkpoint are durable", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const acquireExecution = repository.acquireProcessExecution;
    let announceBegin!: () => void;
    const began = new Promise<void>((resolve) => {
      announceBegin = resolve;
    });
    let releaseBegin!: () => void;
    const blocked = new Promise<void>((resolve) => {
      releaseBegin = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async acquireProcessExecution(input) {
        announceBegin();
        await blocked;
        return await acquireExecution(input);
      },
    };
    const controller = createControllerV1(fencedRepository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 20,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const processId = controller.getSnapshot().activeProcess?.process.processId;
    if (processId === undefined) throw new Error("expected active Process");
    const observedRoutes: string[] = [];
    const unsubscribe = controller.subscribe(() => {
      observedRoutes.push(controller.getSnapshot().route);
    });

    let settled = false;
    const preparing = controller.prepareAgentRun("Draft the opening scene.").then((result) => {
      settled = true;
      return result;
    });
    await began;
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(controller.getSnapshot().durability).toEqual({
      phase: "saving",
      operation: "agent_run",
    });
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      transcriptFrontier: 2,
    });

    releaseBegin();
    const prepared = await preparing;
    expect(prepared).toMatchObject({
      kind: "completed",
      value: {
        kind: "prepared",
        run: {
          processId,
          processAttemptGeneration: 1,
          workspaceCheckpointId: expect.any(String),
          workspaceGeneration: 1,
          text: "Draft the opening scene.",
        },
      },
    });
    const run = prepared.kind === "completed" && prepared.value.kind === "prepared"
      ? prepared.value.run
      : null;
    if (run === null) throw new Error("expected prepared run");
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        triggerSequence: 3,
        startingCheckpoint: {
          throughSequence: 3,
          workspaceId: "test.workspace.1",
          workspaceCheckpointId: run.workspaceCheckpointId,
          workspaceGeneration: run.workspaceGeneration,
        },
      },
      transcriptFrontier: 3,
    });
    expect(
      (await repository.loadTranscriptPage({
        processId,
        beforeSequence: null,
        maximumBytes: ordinaryBudgetsV1.transcriptPageMaximumBytes,
      }))?.entries.at(-1),
    ).toMatchObject({ role: "user", parts: [{ markdown: "Draft the opening scene." }] });
    expect(observedRoutes).not.toContain("process_loading");
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: { process: { processId } },
    });
    unsubscribe();
  });

  it("refreshes a passive tab immediately when its execution acquire loses to another tab", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const owner = createControllerV1(repository, {
      ownerInstanceId: "test.controller.owner-a",
      createId: createDeterministicIdV1(),
      now: () => 25,
    });
    await owner.initialize();
    await owner.submitIntent("Create a shared writing workspace.");
    const processId = owner.getSnapshot().activeProcess?.process.processId;
    if (processId === undefined) throw new Error("expected active Process");

    const passive = createControllerV1(repository, {
      ownerInstanceId: "test.controller.owner-b",
      createId: createDeterministicIdV1(),
      now: () => 26,
    });
    await passive.initialize();
    await passive.openProcess(processId);
    expect(passive.getSnapshot().activeProcess?.process.activeAttempt).toBeNull();

    const acquired = await owner.prepareAgentRun("Draft the shared opening scene.");
    if (acquired.kind !== "completed" || acquired.value.kind !== "prepared") {
      throw new Error("expected owner to acquire Process execution");
    }
    expect(passive.getSnapshot().activeProcess?.process.activeAttempt).toBeNull();

    expect(await passive.prepareAgentRun("Competing stale request.")).toEqual({
      kind: "completed",
      value: { kind: "unavailable" },
    });
    expect(passive.getSnapshot()).toMatchObject({
      route: "process",
      durability: { phase: "ready" },
      activeProcess: {
        process: {
          processId,
          activeAttempt: {
            attemptId: acquired.value.run.agentRunId,
            generation: acquired.value.run.processAttemptGeneration,
          },
        },
      },
    });
    expect(
      passive.getSnapshot().activeProcess?.transcript.entries.at(-1),
    ).toMatchObject({
      role: "user",
      parts: [{ kind: "text_markdown", markdown: "Draft the shared opening scene." }],
    });
  });

  it("commits an exact Agent terminal once and fences replayed or unrelated runs", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const controller = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 30,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Add a scene outline.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const run = prepared.value.run;
    const terminal: CreatorAgentTerminalRunV1 = {
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: "Keep the scene outline in the workpiece.",
      },
      finalAssistantReply: "The scene outline is ready for review.",
    };

    expect(
      await controller.recordAgentRunTerminal({
        ...terminal,
        run: { ...run, workspaceCheckpointId: "checkpoint.other" },
      }),
    ).toMatchObject({
      kind: "completed",
      value: { kind: "stale" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      activeAttempt: { attemptId: run.agentRunId },
    });

    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    expect((await repository.loadProcess(run.processId))?.lastTerminalAttempt).toMatchObject({
      attemptId: run.agentRunId,
      generation: run.processAttemptGeneration,
      outcome: "completed",
    });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      process: { activeAttempt: null, transcriptFrontier: 4 },
      subject: {
        currentProgram: {
          revision: 2,
          requirements: [
            "Create a writing workspace.",
            "Keep the scene outline in the workpiece.",
          ],
        },
      },
    });
    expect(
      controller.getSnapshot().activeProcess?.transcript.entries.slice(-2).map(({ role }) => role),
    ).toEqual(["user", "assistant"]);
    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: {
        kind: "stale",
        current: expect.objectContaining({ baseProgramRevision: 2 }),
      },
    });
    expect(
      await controller.recordAgentRunTerminal({
        ...terminal,
        run: { ...run, agentRunId: "agent-run.stale" },
      }),
    ).toMatchObject({
      kind: "completed",
      value: {
        kind: "stale",
        current: { programId: run.programId, baseProgramRevision: 2 },
      },
    });
    expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(4);
  });

  it("accepts the exact composite replay returned by the Workspace authority", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const workspace = createControllerWorkspaceV1(repository);
    let hideFirstCommit = true;
    const controller = createCreatorControllerV1({
      ownerInstanceId: "test.controller.owner",
      repository,
      workspace: {
        ...workspace,
        async applyAgentRevision(input) {
          const result = await workspace.applyAgentRevision(input);
          if (hideFirstCommit) {
            hideFirstCommit = false;
            if (result.kind === "committed") return { ...result, kind: "unchanged" };
          }
          return result;
        },
      },
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 32,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Add a scene outline.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    const terminal: CreatorAgentTerminalRunV1 = {
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: "Keep the scene outline in the workpiece.",
      },
      finalAssistantReply: "The scene outline is ready for review.",
    };

    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    expect(controller.getSnapshot().durability).toEqual({ phase: "ready" });
    expect((await repository.loadProcess(run.processId))?.lastTerminalAttempt).toMatchObject({
      attemptId: run.agentRunId,
      generation: run.processAttemptGeneration,
      outcome: "completed",
    });
    expect((await repository.load(run.programId))?.currentProgram.revision).toBe(2);
    expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(4);
  });

  it("commits once after Workspace progress advances the reviewed head", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const workspace = createControllerWorkspaceV1(repository);
    const reviewedHead = {
      checkpointId: "checkpoint.workspace.after-tools",
      generation: 2,
    };
    const controller = createCreatorControllerV1({
      ownerInstanceId: "test.controller.owner",
      repository,
      workspace: {
        ...workspace,
        async applyAgentRevision(input) {
          const continuation = await repository.loadContinuation(input.catalog.programId);
          if (continuation === null) {
            return {
              kind: "conflict" as const,
              currentProgram: await repository.load(input.catalog.programId),
              currentProcess: await repository.loadProcess(input.transcript.processId),
              currentLease: await repository.loadProcessExecutionLease(
                input.transcript.processId,
              ),
            };
          }
          return await repository.commitProgramRevisionWithProcessExecutionTerminal({
            lease: input.lease,
            observedAt: input.observedAt,
            catalog: { ...input.catalog, continuation, reviewedHead },
            transcript: {
              ...input.transcript,
              checkpoint: {
                ...input.transcript.checkpoint,
                workspaceCheckpointId: reviewedHead.checkpointId,
                workspaceGeneration: reviewedHead.generation,
              },
            },
          });
        },
      },
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 32,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Use tools, then update the Program.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    expect(run.workspaceGeneration).toBe(1);
    const terminal: CreatorAgentTerminalRunV1 = {
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: "Keep the tool-produced Workspace changes.",
      },
      finalAssistantReply: "The tool-produced changes are ready for review.",
    };

    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      transcriptFrontier: 4,
      checkpoint: {
        throughSequence: 4,
        workspaceCheckpointId: reviewedHead.checkpointId,
        workspaceGeneration: reviewedHead.generation,
      },
    });
    expect((await repository.load(run.programId))?.head.pendingReviewBinding).toMatchObject({
      checkpointId: reviewedHead.checkpointId,
      generation: reviewedHead.generation,
    });
    expect(controller.getSnapshot().durability).toEqual({ phase: "ready" });
    expect((await repository.load(run.programId))?.currentProgram.revision).toBe(2);
    expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(4);
  });

  it("reconciles an outcome-unknown non-revision terminal without appending it twice", async () => {
    const durableRepository = createMemoryProgramDataRepositoryV1();
    let hideFirstTerminalCommit = true;
    let operationQueries = 0;
    const repository: ProgramDataRepositoryV1 = {
      ...durableRepository,
      async commitProcessExecutionTerminal(input) {
        const result = await durableRepository.commitProcessExecutionTerminal(input);
        if (hideFirstTerminalCommit) {
          hideFirstTerminalCommit = false;
          throw createProgramDataRepositoryFailureV1(
            "outcome_unknown",
            "commit_process_execution_terminal",
          );
        }
        return result;
      },
      async queryProcessOperation(input) {
        operationQueries += 1;
        return await durableRepository.queryProcessOperation(input);
      },
    };
    const controller = createCreatorControllerV1({
      ownerInstanceId: "test.controller.owner",
      repository,
      workspace: createControllerWorkspaceV1(repository),
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 33,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Attempt a draft.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    const terminal: CreatorAgentTerminalRunV1 = {
      run,
      outcome: "failed",
      diagnosticCode: "request_failed",
    };

    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "failed" },
    });
    const frontier = (await repository.loadProcess(run.processId))?.transcriptFrontier;
    expect(frontier).toBe(4);
    expect(operationQueries).toBe(1);
    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: expect.objectContaining({ kind: "stale" }),
    });
    expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(frontier);
  });

  it("terminalizes an invalid completed projection instead of stranding its attempt", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const controller = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 34,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Continue this draft.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;

    expect(
      await controller.recordAgentRunTerminal({
        run,
        outcome: "completed",
        candidate: {
          revision: 1,
          proposalId: run.proposalId,
          programId: run.programId,
          baseProgramRevision: run.baseProgramRevision,
          text: run.text,
          requirement: "",
        },
        finalAssistantReply: "This invalid candidate must not strand the Process.",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "failed" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      status: "active",
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        outcome: "failed",
      },
    });
    expect((await repository.load(run.programId))?.currentProgram.revision).toBe(1);
    expect(controller.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "assistant",
      parts: [{ markdown: expect.stringContaining("candidate_invalid") }],
    });
  });

  it("durably terminalizes a prepared attempt when Pi submission becomes unavailable", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const controller = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 35,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Continue this draft.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;

    expect(
      await controller.recordAgentRunTerminal({
        run,
        outcome: "failed",
        diagnosticCode: "connection_failed",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "failed" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      status: "active",
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        outcome: "failed",
        interruptionDisposition: null,
      },
    });
  });

  it("terminalizes an exact active attempt as replaced when Program currentness advances", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const controller = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 36,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Continue this draft.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    const current = await repository.load(run.programId);
    const continuation = await repository.loadContinuation(run.programId);
    if (current === null || continuation === null) throw new Error("expected current Program");
    expect(
      await repository.applyRevision({
        programId: run.programId,
        expectedRepositoryRevision: current.head.repositoryRevision,
        expectedProposal: current.head.proposal,
        commitId: "commit.agent-currentness-drift",
        program: {
          ...current.currentProgram,
          revision: current.currentProgram.revision + 1,
          requirements: [...current.currentProgram.requirements, "Concurrent owner edit."],
        },
        proposalId: "proposal.agent-currentness-drift",
        continuation,
        reviewedHead: {
          checkpointId: "checkpoint.agent-currentness-drift",
          generation: run.workspaceGeneration + 1,
        },
        updatedAt: 36,
      }),
    ).toMatchObject({ kind: "committed" });
    expect(await controller.renewAgentRunLease(run)).toEqual({
      kind: "completed",
      value: "renewed",
    });

    const terminal: CreatorAgentTerminalRunV1 = {
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: "The stale candidate must not publish.",
      },
      finalAssistantReply: "A stale reply.",
    };
    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "replaced" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      status: "active",
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        outcome: "replaced",
      },
    });
    expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
      kind: "completed",
      value: {
        kind: "stale",
        current: expect.objectContaining({ baseProgramRevision: 2 }),
      },
    });
    const successor = await controller.prepareAgentRun("Continue from the owner edit.");
    expect(successor).toMatchObject({
      kind: "completed",
      value: { kind: "prepared", run: { processAttemptGeneration: 2 } },
    });
  });

  it("serializes an in-flight lease renewal before the exact terminal commit", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const renewLease = repository.renewProcessExecutionLease;
    let announceRenewal!: () => void;
    const renewalStarted = new Promise<void>((resolve) => {
      announceRenewal = resolve;
    });
    let releaseRenewal!: () => void;
    const renewalBlocked = new Promise<void>((resolve) => {
      releaseRenewal = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async renewProcessExecutionLease(input) {
        announceRenewal();
        await renewalBlocked;
        return await renewLease(input);
      },
    };
    let observedAt = 37;
    const controller = createControllerV1(fencedRepository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => observedAt,
    });
    await controller.initialize();
    await controller.submitIntent("Create a writing workspace.");
    const prepared = await controller.prepareAgentRun("Continue this draft.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;

    observedAt = 38;
    const renewal = controller.renewAgentRunLease(run);
    await renewalStarted;
    let terminalSettled = false;
    const terminal = controller.recordAgentRunTerminal({
      run,
      outcome: "failed",
      diagnosticCode: "connection_failed",
    }).then((result) => {
      terminalSettled = true;
      return result;
    });
    await Promise.resolve();
    expect(terminalSettled).toBe(false);

    releaseRenewal();
    expect(await renewal).toEqual({ kind: "completed", value: "renewed" });
    expect(await terminal).toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "failed" },
    });
    expect(await repository.loadProcessExecutionLease(run.processId)).toBeNull();
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        outcome: "failed",
      },
    });
  });

  it("marks an abandoned attempt retryable only when its durable Workspace head still matches", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const predecessor = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 40,
    });
    await predecessor.initialize();
    await predecessor.submitIntent("Create a writing workspace.");
    const prepared = await predecessor.prepareAgentRun("Draft the next scene.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    const abandoned = await repository.loadProcess(run.processId);
    if (abandoned?.activeAttempt === null || abandoned?.activeAttempt === undefined) {
      throw new Error("expected durable active attempt");
    }
    const predecessorFrontier = abandoned.transcriptFrontier;
    await predecessor.dispose();

    const successor = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      ownerInstanceId: "test.controller.successor",
      now: () => 30_041,
    });
    await successor.initialize();
    expect(await successor.openProcess(run.processId)).toEqual({
      kind: "completed",
      value: true,
    });

    const settled = await repository.loadProcess(run.processId);
    expect(settled).toMatchObject({
      status: "interrupted_retryable",
      transcriptFrontier: predecessorFrontier + 1,
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        outcome: "interrupted",
        interruptionDisposition: "retryable",
      },
    });
    const transcript = await repository.loadTranscriptPage({
      processId: run.processId,
      beforeSequence: null,
      maximumBytes: 4_096,
    });
    expect(transcript?.entries.at(-1)).toMatchObject({
      role: "system",
      state: "interrupted_partial",
      sequence: predecessorFrontier + 1,
      parts: [{
        kind: "text_markdown",
        markdown: expect.stringContaining("can be retried"),
      }],
    });

    // Reopening a settled Process never replays its trigger or adds another terminal.
    expect(await successor.openProcess(run.processId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(
      predecessorFrontier + 1,
    );

    const retried = await successor.retryInterruptedAgentRun();
    if (retried.kind !== "completed" || retried.value.kind !== "prepared") {
      throw new Error("expected retryable attempt to prepare a successor run");
    }
    expect(retried.value.run).toMatchObject({
      processId: run.processId,
      processAttemptGeneration: run.processAttemptGeneration + 1,
      text: run.text,
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      status: "active",
      transcriptFrontier: predecessorFrontier + 1,
      activeAttempt: {
        attemptId: retried.value.run.agentRunId,
        generation: run.processAttemptGeneration + 1,
        triggerEntryId: abandoned.activeAttempt.triggerEntryId,
        triggerSequence: abandoned.activeAttempt.triggerSequence,
      },
    });
    const afterRetry = await repository.loadTranscriptPage({
      processId: run.processId,
      beforeSequence: null,
      maximumBytes: 4_096,
    });
    expect(
      afterRetry?.entries.filter((entry) =>
        entry.role === "user" &&
        entry.parts.some((part) => part.kind === "text_markdown" && part.markdown === run.text)
      ),
    ).toHaveLength(1);
  });

  it("declines retry after Workspace evidence drifts without rewriting the settled terminal", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    const predecessor = createControllerV1(repository, {
      budgets: ordinaryBudgetsV1,
      createId: createDeterministicIdV1(),
      now: () => 45,
    });
    await predecessor.initialize();
    await predecessor.submitIntent("Create a writing workspace.");
    const prepared = await predecessor.prepareAgentRun("Draft the next scene.");
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Agent run");
    }
    const { run } = prepared.value;
    await predecessor.dispose();

    const baseWorkspace = createControllerWorkspaceV1(repository);
    let workspaceDrifted = false;
    const successor = createCreatorControllerV1({
      ownerInstanceId: "test.controller.successor",
      repository,
      workspace: {
        ...baseWorkspace,
        async inspectProgramWorkspace(programId) {
          const review = await baseWorkspace.inspectProgramWorkspace(programId);
          return !workspaceDrifted || review === null ? review : {
            ...review,
            mutableHead: {
              checkpointId: "checkpoint.changed-after-interruption",
              generation: run.workspaceGeneration + 1,
            },
          };
        },
      },
      budgets: ordinaryBudgetsV1,
      now: () => 30_046,
    });
    await successor.initialize();
    await successor.openProcess(run.processId);
    const settledBeforeDrift = await repository.loadProcess(run.processId);
    expect(settledBeforeDrift).toMatchObject({
      status: "interrupted_retryable",
      lastTerminalAttempt: { interruptionDisposition: "retryable" },
    });

    workspaceDrifted = true;
    expect(await successor.retryInterruptedAgentRun()).toEqual({
      kind: "completed",
      value: { kind: "unavailable" },
    });
    expect(await repository.loadProcess(run.processId)).toMatchObject({
      revision: settledBeforeDrift?.revision,
      updatedAt: settledBeforeDrift?.updatedAt,
      status: "interrupted_retryable",
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        interruptionDisposition: "retryable",
      },
    });
    expect(successor.getSnapshot().activeProcess).toMatchObject({
      process: { status: "interrupted_retryable" },
      workspaceReview: {
        mutableHead: {
          checkpointId: "checkpoint.changed-after-interruption",
          generation: run.workspaceGeneration + 1,
        },
      },
    });
    expect(await successor.retryInterruptedAgentRun()).toEqual({
      kind: "completed",
      value: { kind: "unavailable" },
    });
  });

  it.each([
    {
      evidence: "mismatched" as const,
      mutableHead: { checkpointId: "checkpoint.changed", generation: 9 },
    },
    { evidence: "missing" as const, mutableHead: null },
  ])(
    "marks an abandoned attempt unrecoverable when Workspace evidence is $evidence",
    async ({ mutableHead }) => {
      const repository = createMemoryProgramDataRepositoryV1();
      const predecessor = createControllerV1(repository, {
        budgets: ordinaryBudgetsV1,
        createId: createDeterministicIdV1(),
        now: () => 50,
      });
      await predecessor.initialize();
      await predecessor.submitIntent("Create a translation workspace.");
      const prepared = await predecessor.prepareAgentRun("Translate the first chapter.");
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        throw new Error("expected prepared Agent run");
      }
      const { run } = prepared.value;
      const abandoned = await repository.loadProcess(run.processId);
      if (abandoned?.activeAttempt === null || abandoned?.activeAttempt === undefined) {
        throw new Error("expected durable active attempt");
      }
      const predecessorFrontier = abandoned.transcriptFrontier;
      await predecessor.dispose();

      const workspace = createControllerWorkspaceV1(repository);
      const successor = createCreatorControllerV1({
        ownerInstanceId: "test.controller.successor",
        repository,
        workspace: {
          ...workspace,
          async inspectProgramWorkspace(programId) {
            const review = await workspace.inspectProgramWorkspace(programId);
            return review === null ? null : { ...review, mutableHead };
          },
        },
        budgets: ordinaryBudgetsV1,
        now: () => 30_051,
      });
      await successor.initialize();
      expect(await successor.openProcess(run.processId)).toEqual({
        kind: "completed",
        value: true,
      });

      expect(await repository.loadProcess(run.processId)).toMatchObject({
        status: "interrupted_unrecoverable",
        transcriptFrontier: predecessorFrontier + 1,
        activeAttempt: null,
        lastTerminalAttempt: {
          attemptId: run.agentRunId,
          generation: run.processAttemptGeneration,
          outcome: "interrupted",
          interruptionDisposition: "unrecoverable",
        },
      });
      const transcript = await repository.loadTranscriptPage({
        processId: run.processId,
        beforeSequence: null,
        maximumBytes: 4_096,
      });
      expect(transcript?.entries.at(-1)).toMatchObject({
        role: "system",
        state: "interrupted_partial",
        sequence: predecessorFrontier + 1,
        parts: [{
          kind: "text_markdown",
          markdown: expect.stringContaining("will not replay it automatically"),
        }],
      });

      expect(await successor.openProcess(run.processId)).toEqual({
        kind: "completed",
        value: true,
      });
      expect((await repository.loadProcess(run.processId))?.transcriptFrontier).toBe(
        predecessorFrontier + 1,
      );
      expect(await successor.retryInterruptedAgentRun()).toEqual({
        kind: "completed",
        value: { kind: "unavailable" },
      });
      expect(await repository.loadProcess(run.processId)).toMatchObject({
        status: "interrupted_unrecoverable",
        activeAttempt: null,
      });
    },
  );

  it("clears the predecessor projection while switching the single active Process", async () => {
    const repository = createMemoryProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await seedProgramV1({ repository, programId: "program.first", updatedAt: 1 });
    await seedProgramV1({ repository, programId: "program.second", updatedAt: 2 });
    await seedProcessV1({
      repository,
      programId: "program.first",
      processId: "process.first",
      createdAt: 3,
    });
    await seedProcessV1({
      repository,
      programId: "program.second",
      processId: "process.second",
      createdAt: 4,
    });
    const loadProcess = repository.loadProcess;
    let announceSecond!: () => void;
    const secondStarted = new Promise<void>((resolve) => {
      announceSecond = resolve;
    });
    let releaseSecond!: () => void;
    const secondBlocked = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const fencedRepository: ProgramDataRepositoryV1 = {
      ...repository,
      async loadProcess(processId) {
        if (processId === "process.second") {
          announceSecond();
          await secondBlocked;
        }
        return await loadProcess(processId);
      },
    };
    const controller = createControllerV1(fencedRepository, { budgets: ordinaryBudgetsV1 });
    await controller.initialize();
    await controller.openProcess("process.first");
    expect(controller.getSnapshot().activeProcess?.process.processId).toBe("process.first");

    const switching = controller.openProcess("process.second");
    await secondStarted;
    expect(controller.getSnapshot()).toMatchObject({
      route: "process_loading",
      activeProcess: null,
    });
    releaseSecond();
    expect(await switching).toEqual({ kind: "completed", value: true });
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: { process: { processId: "process.second" } },
    });
    expect(
      controller.getSnapshot().activeProcess?.transcript.entries.map(({ processId }) => processId),
    ).toEqual(["process.second"]);
  });
});
