// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import type {
  BrowserProcessWorkspaceCreateInputV1,
  BrowserProcessWorkspaceImportFileResultV1,
  BrowserProcessWorkspaceInspectionV1,
} from "../product/browser-program-workspace-authority.ts";
import type { ProgramCatalogContinuationV1 } from "../product/program-catalog-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
} from "../product/program-data-repository.ts";
import { createBuiltinCreatorProgramDefinitionRevisionV1 } from "../product/program-process-repository.ts";
import {
  createTranslationProcessControllerV1,
  type TranslationProcessControllerWorkspacePortV1,
} from "../product/translation/translation-process-controller.ts";
import { createBuiltinTranslationProgramDefinitionRevisionV1 } from "../product/translation/translation-program-definition.ts";
import {
  createIndexedDbProgramDataRepositoryTestAdapterV1,
  type IndexedDbProgramDataRepositoryTestAdapterV1,
} from "./indexeddb-program-data-repository-test-adapter.ts";

type TestRepositoryV1 = IndexedDbProgramDataRepositoryTestAdapterV1;

function createRepositoryV1(): TestRepositoryV1 {
  return createIndexedDbProgramDataRepositoryTestAdapterV1({
    indexedDB: new IDBFactory(),
    keyRange: IDBKeyRange,
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

async function seedProgramV1(input: {
  readonly repository: TestRepositoryV1;
  readonly programId: string;
  readonly kind?: "translation" | "writing";
  readonly accepted?: boolean;
  readonly updatedAt?: number;
}): Promise<void> {
  const kind = input.kind ?? "translation";
  const continuation = continuationV1(input.programId);
  const proposalId = `proposal.${input.programId}.1`;
  const checkpointId = `checkpoint.${input.programId}.1`;
  const created = await input.repository.create({
    commitId: `commit.${input.programId}.create`,
    program: {
      programId: input.programId,
      revision: 1,
      kind,
      name: `Program ${input.programId}`,
      purpose: "Exercise a reusable Program Process.",
      requirements: ["Keep the Process Workspace isolated."],
      suggestedCapabilities: [],
    },
    proposalId,
    continuation,
    reviewedHead: { checkpointId, generation: 1 },
    updatedAt: input.updatedAt ?? 1,
  });
  if (created.kind !== "committed") throw new Error("expected Program creation");
  if (input.accepted === false) return;
  const binding = created.record.head.pendingReviewBinding!;
  const decision = await input.repository.decide({
    programId: input.programId,
    expectedRepositoryRevision: 1,
    expectedProposal: { proposalId, programRevision: 1 },
    commitId: `commit.${input.programId}.accept`,
    status: "accepted",
    continuation,
    snapshotReceipt: {
      revision: 1,
      snapshotId: `snapshot.${input.programId}.1`,
      programId: input.programId,
      workspaceId: binding.workspaceId,
      volumeId: binding.volumeId,
      workspaceFormat: 1,
      proposalId,
      programRevision: 1,
      baseRepositoryRevision: 1,
      checkpointId: binding.checkpointId,
      generation: binding.generation,
      fileCount: 0,
      archiveBytes: 1,
    },
    updatedAt: (input.updatedAt ?? 1) + 1,
  });
  if (decision.kind !== "committed") throw new Error("expected Program acceptance");
}

function createWorkspacePortV1(
  repository: TestRepositoryV1,
  options: {
    readonly create?: (
      input: BrowserProcessWorkspaceCreateInputV1,
      commit: () => Promise<ProcessWorkspaceCreateCompositeCommitResultV1>,
    ) => Promise<ProcessWorkspaceCreateCompositeCommitResultV1>;
    readonly inspect?: (
      processId: string,
      inspection: BrowserProcessWorkspaceInspectionV1 | null,
    ) => Promise<BrowserProcessWorkspaceInspectionV1 | null>;
    readonly importFile?: (
      input: Parameters<
        TranslationProcessControllerWorkspacePortV1["importProcessWorkspaceFile"]
      >[0],
      commit: () => Promise<BrowserProcessWorkspaceImportFileResultV1>,
    ) => Promise<BrowserProcessWorkspaceImportFileResultV1>;
  } = {},
): TranslationProcessControllerWorkspacePortV1 & {
  readonly createCalls: string[];
  readonly importCalls: readonly Parameters<
    TranslationProcessControllerWorkspacePortV1["importProcessWorkspaceFile"]
  >[0][];
} {
  const createCalls: string[] = [];
  const importCalls: Parameters<
    TranslationProcessControllerWorkspacePortV1["importProcessWorkspaceFile"]
  >[0][] = [];
  const importedByPath = new Map<string, BrowserProcessWorkspaceImportFileResultV1>();
  const port: TranslationProcessControllerWorkspacePortV1 & {
    readonly createCalls: string[];
    readonly importCalls: readonly Parameters<
      TranslationProcessControllerWorkspacePortV1["importProcessWorkspaceFile"]
    >[0][];
  } = {
    createCalls,
    importCalls,
    async createProcessWorkspace(input) {
      createCalls.push(input.process.processId);
      const commit = async (): Promise<ProcessWorkspaceCreateCompositeCommitResultV1> =>
        await repository.createProcessWithWorkspace({
          process: input.process,
          workspace: {
            revision: 1,
            processId: input.process.processId,
            workspaceId: input.workspaceId,
            volumeId: `volume.${input.workspaceId}`,
            workspaceFormat: 1,
          },
          transcript: {
            ...input.transcript,
            checkpoint: {
              ...input.transcript.checkpoint,
              workspaceId: input.workspaceId,
              workspaceCheckpointId: `workspace-checkpoint.${input.workspaceId}`,
              workspaceGeneration: 1,
            },
          },
        });
      return options.create === undefined ? await commit() : await options.create(input, commit);
    },
    async inspectProcessWorkspace(processId) {
      const [process, workspace] = await Promise.all([
        repository.loadProcess(processId),
        repository.loadProcessWorkspaceBinding(processId),
      ]);
      const inspection = process === null || workspace === null ? null : {
        process,
        workspace,
        mutableHead: null,
      } satisfies BrowserProcessWorkspaceInspectionV1;
      return options.inspect === undefined
        ? inspection
        : await options.inspect(processId, inspection);
    },
    async importProcessWorkspaceFile(input) {
      importCalls.push({ ...input, bytes: new Uint8Array(input.bytes) });
      const commit = async (): Promise<BrowserProcessWorkspaceImportFileResultV1> => {
        const currentLease = await repository.loadProcessExecutionLease(input.processId);
        if (
          currentLease === null || currentLease.ownerInstanceId !== input.lease.ownerInstanceId ||
          currentLease.attemptId !== input.lease.attemptId ||
          currentLease.generation !== input.lease.generation ||
          currentLease.expiresAt < input.lease.expiresAt ||
          input.observedAt >= input.lease.expiresAt
        ) {
          const error = new Error("stale Process execution lease");
          Object.defineProperty(error, "code", {
            value: "process_execution_stale",
            enumerable: true,
          });
          throw error;
        }
        const existing = importedByPath.get(input.path);
        if (existing !== undefined) return { ...existing, changed: false };
        const binding = await repository.loadProcessWorkspaceBinding(input.processId);
        if (binding === null || binding.workspaceId !== input.workspaceId) {
          throw new Error("missing Process Workspace binding");
        }
        const result: BrowserProcessWorkspaceImportFileResultV1 = {
          changed: true,
          source: {
            revision: 1,
            processId: input.processId,
            workspaceId: binding.workspaceId,
            volumeId: binding.volumeId,
            workspaceFormat: binding.workspaceFormat,
            path: input.path,
            checkpointId: `import-checkpoint.${input.workspaceId}`,
            generation: 2,
          },
        };
        importedByPath.set(input.path, result);
        return result;
      };
      return options.importFile === undefined
        ? await commit()
        : await options.importFile(input, commit);
    },
  };
  return port;
}

function deterministicIdsV1(prefix = "test"): (purpose: string) => string {
  let sequence = 0;
  return (purpose) => `${prefix}.${purpose}.${String(++sequence)}`;
}

const textEncoderV1 = new TextEncoder();

function subtitleDocumentV1(count: number): string {
  return Array.from({ length: count }, (_, index) => {
    const cue = index + 1;
    const second = String(index % 60).padStart(2, "0");
    return `${String(cue)}\n00:00:${second},000 --> 00:00:${second},900\n字幕 ${
      String(cue)
    }：保持原意。`;
  }).join("\n\n") + "\n";
}

async function sha256HexV1(bytes: Uint8Array): Promise<string> {
  const digestSource = new Uint8Array(bytes.byteLength);
  digestSource.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", digestSource));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("Translation Process Controller", () => {
  it("publishes the built-in Translation definition without acquiring a Workspace", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({ repository, workspace });

    await controller.initialize();

    expect(await repository.loadProgramDefinitionRevision("sillyos.builtin.translation", 1))
      .toEqual(createBuiltinTranslationProgramDefinitionRevisionV1());
    expect(workspace.createCalls).toEqual([]);
    expect(controller.getSnapshot()).toMatchObject({
      route: "home",
      activeProcess: null,
      durability: { phase: "ready" },
    });
  });

  it("creates one accepted Translation Program Process with an isolated Workspace checkpoint", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1(),
      now: () => 10,
    });
    await controller.initialize();

    expect(await controller.startOrOpen("program.translation")).toEqual({
      kind: "completed",
      value: true,
    });

    const active = controller.getSnapshot().activeProcess!;
    expect(active).toMatchObject({
      process: {
        programDefinition: { programId: "sillyos.builtin.translation", revision: 1 },
        subjectProgramId: "program.translation",
        transcriptFrontier: 1,
      },
      subject: { head: { programId: "program.translation" } },
      workspace: { processId: active.process.processId },
      transcript: { entries: [{ role: "system", sequence: 1 }] },
    });
    expect(active.process.checkpoint).toMatchObject({
      throughSequence: 1,
      workspaceId: active.workspace.workspaceId,
      workspaceCheckpointId: `workspace-checkpoint.${active.workspace.workspaceId}`,
      workspaceGeneration: 1,
    });
    expect(workspace.createCalls).toEqual([active.process.processId]);
  });

  it("cold-opens the newest matching Translation Process without creating or opening another Workspace", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const firstWorkspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("first"),
      now: () => 10,
    });
    await first.initialize();
    await first.startOrOpen("program.translation");
    const processId = first.getSnapshot().activeProcess!.process.processId;
    first.dispose();

    const coldWorkspace = createWorkspacePortV1(repository);
    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: coldWorkspace,
      createId: deterministicIdsV1("cold"),
      now: () => 20,
    });
    await cold.initialize();

    expect(await cold.startOrOpen("program.translation")).toEqual({
      kind: "completed",
      value: true,
    });
    expect(cold.getSnapshot().activeProcess?.process.processId).toBe(processId);
    expect(coldWorkspace.createCalls).toEqual([]);
  });

  it("ignores a newer Creator Process when selecting the Translation gameplay Process", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1(),
      now: () => 10,
    });
    await first.initialize();
    await first.startOrOpen("program.translation");
    const translationProcessId = first.getSnapshot().activeProcess!.process.processId;
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await repository.createProcess({
      processId: "process.creator.newer",
      programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
      subjectProgramId: "program.translation",
      createdAt: 20,
    });

    const coldWorkspace = createWorkspacePortV1(repository);
    const cold = createTranslationProcessControllerV1({ repository, workspace: coldWorkspace });
    await cold.initialize();
    await cold.startOrOpen("program.translation");

    expect(cold.getSnapshot().activeProcess?.process.processId).toBe(translationProcessId);
    expect(coldWorkspace.createCalls).toEqual([]);
  });

  it("rejects missing, pending, and non-Translation Programs before Process creation", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({
      repository,
      programId: "program.pending",
      accepted: false,
    });
    await seedProgramV1({
      repository,
      programId: "program.writing",
      kind: "writing",
    });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({ repository, workspace });
    await controller.initialize();

    expect(await controller.startOrOpen("program.missing")).toEqual({
      kind: "failed",
      code: "subject_program_missing",
    });
    expect(await controller.startOrOpen("program.pending")).toEqual({
      kind: "failed",
      code: "program_not_accepted",
    });
    expect(await controller.startOrOpen("program.writing")).toEqual({
      kind: "failed",
      code: "program_not_accepted",
    });
    expect(workspace.createCalls).toEqual([]);
  });

  it("reconciles an exact durable Process after a lost create response", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository, {
      async create(_input, commit) {
        await commit();
        throw createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "create_process_with_workspace",
        );
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1(),
      now: () => 10,
    });
    await controller.initialize();

    expect(await controller.startOrOpen("program.translation")).toEqual({
      kind: "completed",
      value: true,
    });
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: { process: { subjectProgramId: "program.translation" } },
      durability: { phase: "ready" },
    });
  });

  it("does not retry an unresolved unknown create outcome or admit a mismatched binding", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const unknownWorkspace = createWorkspacePortV1(repository, {
      async create() {
        throw createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "create_process_with_workspace",
        );
      },
    });
    const unknown = createTranslationProcessControllerV1({
      repository,
      workspace: unknownWorkspace,
      createId: deterministicIdsV1(),
    });
    await unknown.initialize();
    expect(await unknown.startOrOpen("program.translation")).toEqual({
      kind: "failed",
      code: "outcome_unknown",
    });
    expect(await unknown.retry()).toBe(false);
    expect(unknownWorkspace.createCalls).toHaveLength(1);

    const healthyWorkspace = createWorkspacePortV1(repository);
    const healthy = createTranslationProcessControllerV1({
      repository,
      workspace: healthyWorkspace,
      createId: deterministicIdsV1("healthy"),
    });
    await healthy.initialize();
    await healthy.startOrOpen("program.translation");
    const processId = healthy.getSnapshot().activeProcess!.process.processId;
    const mismatchedWorkspace = createWorkspacePortV1(repository, {
      async inspect(_processId, inspection) {
        return inspection === null ? null : {
          ...inspection,
          workspace: { ...inspection.workspace, workspaceId: "workspace.mismatched" },
        };
      },
    });
    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: mismatchedWorkspace,
    });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({
      kind: "failed",
      code: "process_workspace_mismatch",
    });
  });

  it("imports a small SRT into the bound Process Workspace and projects its ready Project", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("srt"),
      now: () => 20,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const active = controller.getSnapshot().activeProcess!;
    const bytes = textEncoderV1.encode(subtitleDocumentV1(2));

    const imported = await controller.importSource({
      source: {
        kind: "file",
        file: new File([bytes], "opening.srt", { type: "application/x-subrip" }),
      },
      sourceLocale: "ja-JP",
      targetLocale: "zh-CN",
      title: "Opening subtitles",
    });

    expect(imported.kind).toBe("completed");
    if (imported.kind !== "completed") return;
    expect(imported.value).toMatchObject({
      processId: active.process.processId,
      phase: "ready",
      title: "Opening subtitles",
      document: { format: "subrip", capabilityGrade: "round_trip_supported" },
      source: {
        fileName: "opening.srt",
        mediaType: "application/x-subrip",
        byteLength: bytes.byteLength,
        sha256: await sha256HexV1(bytes),
      },
      sourceLocale: "ja-JP",
      targetLocale: "zh-CN",
      expectedUnitCount: 2,
      stagedUnitCount: 2,
      sourceBinding: {
        revision: 1,
        workspaceId: active.workspace.workspaceId,
        volumeId: active.workspace.volumeId,
        workspaceFormat: active.workspace.workspaceFormat,
        path: expect.stringMatching(
          /^translation-projects\/[a-zA-Z0-9._:-]+\/source\.srt$/u,
        ),
        checkpointId: `import-checkpoint.${active.workspace.workspaceId}`,
        generation: 2,
      },
    });
    expect(imported.value.source.workspacePath).toMatch(
      /^translation-projects\/[a-zA-Z0-9._:-]+\/source\.srt$/u,
    );
    expect(imported.value.source.workspacePath.startsWith("/")).toBe(false);
    expect(workspace.importCalls).toHaveLength(1);
    expect(workspace.importCalls[0]).toMatchObject({
      processId: active.process.processId,
      workspaceId: active.workspace.workspaceId,
      path: imported.value.source.workspacePath,
    });
    expect([...workspace.importCalls[0]!.bytes]).toEqual([...bytes]);
    expect(controller.getSnapshot()).toMatchObject({
      sourceImport: { phase: "idle" },
      activeProcess: {
        process: { transcriptFrontier: 3 },
        transcript: {
          entries: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }],
        },
        project: { phase: "ready", stagedUnitCount: 2 },
      },
    });

    const page = await repository.loadTranslationProjectUnitPage({
      processId: active.process.processId,
      expectedProjectRevision: imported.value.revision,
      fromOrder: 0,
      maximumRows: 20,
      maximumBytes: 128 * 1_024,
    });
    expect(page.kind).toBe("page");
    if (page.kind === "page") {
      expect(page.page.rows.map((row) => row.order)).toEqual([0, 1]);
      expect(page.page.rows.map((row) => row.source)).toEqual([
        "字幕 1：保持原意。",
        "字幕 2：保持原意。",
      ]);
    }
    await expect(controller.loadProjectRowWindow({
      processId: active.process.processId,
      expectedProjectRevision: imported.value.revision,
      offset: 1,
      limit: 1,
    })).resolves.toEqual({
      offset: 1,
      limit: 1,
      totalRowCount: 2,
      rows: [{
        unitId: expect.any(String),
        order: 1,
        locator: expect.any(String),
        context: null,
        durationMilliseconds: 900,
        source: "字幕 2：保持原意。",
        protectedSegments: [],
        target: null,
        committedBatchId: null,
      }],
      nextOffset: null,
    });
  });

  it("fences two controllers so an old import generation cannot publish after takeover", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const firstWorkspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        entered.resolve();
        await release.promise;
        return await commit();
      },
    });
    const secondWorkspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("first-import"),
      ownerInstanceId: "owner.first",
      now: () => 20,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    const second = createTranslationProcessControllerV1({
      repository,
      workspace: secondWorkspace,
      createId: deterministicIdsV1("second-import"),
      ownerInstanceId: "owner.second",
      now: () => 22,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await Promise.all([first.initialize(), second.initialize()]);
    await first.startOrOpen("program.translation");
    await second.startOrOpen("program.translation");
    const processId = first.getSnapshot().activeProcess!.process.processId;
    const firstImport = first.importSource({
      source: {
        kind: "bytes",
        fileName: "first.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    await entered.promise;

    expect(
      await second.importSource({
        source: {
          kind: "bytes",
          fileName: "second.srt",
          mediaType: "application/x-subrip",
          bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
        },
        sourceLocale: "ja",
        targetLocale: "en",
      }),
    ).toEqual({ kind: "failed", code: "process_execution_busy" });
    expect(secondWorkspace.importCalls).toEqual([]);

    const oldLease = await repository.loadProcessExecutionLease(processId);
    const oldProcess = await repository.loadProcess(processId);
    expect(oldLease).not.toBeNull();
    expect(oldProcess?.activeAttempt).not.toBeNull();
    const terminalSequence = oldProcess!.transcriptFrontier + 1;
    const terminalEntryId = "test.takeover.failed";
    const terminal = await repository.commitProcessExecutionTerminal({
      lease: oldLease!,
      observedAt: 21,
      transcript: {
        processId,
        expectedProcessRevision: oldProcess!.revision,
        expectedTranscriptFrontier: oldProcess!.transcriptFrontier,
        commitId: "test.takeover.terminal",
        attemptBinding: {
          attemptId: oldLease!.attemptId,
          generation: oldLease!.generation,
        },
        entries: [{
          schemaVersion: 1,
          processId,
          sequence: terminalSequence,
          entryId: terminalEntryId,
          role: "system",
          state: "committed",
          parts: [{
            kind: "text_markdown",
            partId: `${terminalEntryId}.text`,
            markdown: "The predecessor import was interrupted.",
          }],
        }],
        checkpoint: null,
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId,
          attemptId: oldLease!.attemptId,
          generation: oldLease!.generation,
          outcome: "failed",
          terminalSequence,
          terminalEntryId,
          interruptionDisposition: null,
        },
        updatedAt: 21,
      },
    });
    expect(terminal.kind).not.toBe("conflict");

    const successor = await second.importSource({
      source: {
        kind: "bytes",
        fileName: "second.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    expect(successor.kind).toBe("completed");
    release.resolve();
    expect(await firstImport).toEqual({ kind: "failed", code: "process_execution_stale" });
    expect((await repository.loadTranslationProjectHead(processId))?.source.fileName).toBe(
      "second.srt",
    );
  });

  it("does not acquire a stale import after another controller completes the Project", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const staleAcquireEntered = Promise.withResolvers<void>();
    const releaseStaleAcquire = Promise.withResolvers<void>();
    const acquire = repository.acquireTranslationProjectImportExecution.bind(repository);
    repository.acquireTranslationProjectImportExecution = async (input) => {
      if (input.execution.ownerInstanceId === "owner.stale") {
        staleAcquireEntered.resolve();
        await releaseStaleAcquire.promise;
      }
      return await acquire(input);
    };
    const winnerWorkspace = createWorkspacePortV1(repository);
    const staleWorkspace = createWorkspacePortV1(repository);
    const winner = createTranslationProcessControllerV1({
      repository,
      workspace: winnerWorkspace,
      createId: deterministicIdsV1("winner"),
      ownerInstanceId: "owner.winner",
      now: () => 20,
    });
    const stale = createTranslationProcessControllerV1({
      repository,
      workspace: staleWorkspace,
      createId: deterministicIdsV1("stale"),
      ownerInstanceId: "owner.stale",
      now: () => 21,
    });
    await Promise.all([winner.initialize(), stale.initialize()]);
    await winner.startOrOpen("program.translation");
    await stale.startOrOpen("program.translation");
    const processId = winner.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "source.srt",
      mediaType: "application/x-subrip",
      bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
    };
    const staleImport = stale.importSource({ source, sourceLocale: "ja", targetLocale: "en" });
    await staleAcquireEntered.promise;

    expect(
      await winner.importSource({ source, sourceLocale: "ja", targetLocale: "en" }),
    ).toMatchObject({ kind: "completed", value: { phase: "ready" } });
    releaseStaleAcquire.resolve();

    expect(await staleImport).toEqual({
      kind: "failed",
      code: "translation_project_exists",
    });
    expect(staleWorkspace.importCalls).toEqual([]);
    expect(await repository.loadProcessExecutionLease(processId)).toBeNull();
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      transcriptFrontier: 3,
      lastTerminalAttempt: { outcome: "completed" },
    });
  });

  it("terminalizes an acquired import when navigation supersedes the controller route", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const workspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        entered.resolve();
        await release.promise;
        return await commit();
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("superseded"),
      processExecutionLeaseDurationMilliseconds: 30,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const importing = controller.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    await entered.promise;
    const leaseBeforeRenewal = await repository.loadProcessExecutionLease(processId);
    expect(leaseBeforeRenewal).not.toBeNull();
    await new Promise<void>((resolve) => setTimeout(resolve, 45));
    expect((await repository.loadProcessExecutionLease(processId))?.expiresAt).toBeGreaterThan(
      leaseBeforeRenewal!.expiresAt,
    );
    controller.openHome();
    release.resolve();

    expect(await importing).toEqual({ kind: "failed", code: "superseded" });
    expect(await repository.loadProcessExecutionLease(processId)).toBeNull();
    expect((await repository.loadProcess(processId))?.lastTerminalAttempt?.outcome).toBe("failed");
  });

  it("preserves an expired import for review without blocking a fresh Translation Process", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    let currentTime = 20;
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const firstWorkspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        entered.resolve();
        await release.promise;
        return await commit();
      },
    });
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("expired"),
      ownerInstanceId: "owner.expired",
      now: () => currentTime,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await first.initialize();
    await first.startOrOpen("program.translation");
    const processId = first.getSnapshot().activeProcess!.process.processId;
    const importing = first.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    await entered.promise;
    currentTime = 50;

    const restart = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("restart-after-expiry"),
      now: () => currentTime + 1,
    });
    await restart.initialize();
    expect(await restart.startOrOpen("program.translation")).toEqual({
      kind: "completed",
      value: true,
    });
    expect(await repository.loadProcessExecutionLease(processId)).toBeNull();
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      status: "interrupted_unrecoverable",
      lastTerminalAttempt: { outcome: "interrupted" },
    });
    expect(restart.getSnapshot().activeProcess?.process).toMatchObject({
      status: "active",
      activeAttempt: null,
    });
    expect(restart.getSnapshot().activeProcess?.process.processId).not.toBe(processId);

    const review = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("review-expired"),
      now: () => currentTime + 2,
    });
    await review.initialize();
    expect(await review.openProcess(processId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect(review.getSnapshot().activeProcess?.process.processId).toBe(processId);

    release.resolve();
    expect(await importing).toEqual({ kind: "failed", code: "process_execution_stale" });
  });

  it("renews the Process lease while a Workspace import exceeds one lease window", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        await new Promise<void>((resolve) => setTimeout(resolve, 90));
        return await commit();
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("slow-workspace-import"),
      processExecutionLeaseDurationMilliseconds: 30,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });

    expect(imported.kind).toBe("completed");
    expect(controller.getSnapshot().activeProcess?.process).toMatchObject({
      activeAttempt: null,
      lastTerminalAttempt: { outcome: "completed" },
    });
  });

  it("retries an unknown slow Workspace import with the latest renewed lease", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    let calls = 0;
    const workspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        calls += 1;
        await new Promise<void>((resolve) => setTimeout(resolve, 45));
        if (calls === 1) {
          const error = new Error("lost Workspace import response");
          Object.defineProperty(error, "code", { value: "outcome_unknown" });
          throw error;
        }
        return await commit();
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("slow-unknown-workspace-import"),
      processExecutionLeaseDurationMilliseconds: 30,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });

    expect(imported.kind).toBe("completed");
    expect(calls).toBe(2);
    expect(controller.getSnapshot().activeProcess?.process.activeAttempt).toBeNull();
  });

  it("reconciles a lost atomic Project-finalize and Process-terminal response", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const commit = repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal = async (input) => {
      await commit(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "commit_translation_project_finalize_with_process_execution_terminal",
      );
    };
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("unknown-atomic-finalize"),
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });

    expect(imported.kind).toBe("completed");
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      process: {
        activeAttempt: null,
        transcriptFrontier: 3,
        lastTerminalAttempt: { outcome: "completed" },
      },
      transcript: {
        entries: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }],
      },
      project: { phase: "ready" },
    });
  });

  it("refreshes the completed Process and transcript when retry observes a ready Project", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const commit = repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    const query = repository.queryTranslationProjectOperation.bind(repository);
    let loseQueryResponse = true;
    repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal = async (input) => {
      await commit(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "commit_translation_project_finalize_with_process_execution_terminal",
      );
    };
    repository.queryTranslationProjectOperation = async (input) => {
      if (loseQueryResponse) {
        loseQueryResponse = false;
        throw createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "query_translation_project_operation",
        );
      }
      return await query(input);
    };
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("ready-retry"),
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "source.srt",
      mediaType: "application/x-subrip",
      bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
    };

    expect(await controller.importSource({ source, sourceLocale: "ja", targetLocale: "en" }))
      .toEqual({ kind: "failed", code: "outcome_unknown" });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      process: { transcriptFrontier: 1 },
      transcript: { entries: [{ sequence: 1 }] },
      project: { phase: "staging" },
    });
    expect(await repository.loadTranslationProjectHead(processId)).toMatchObject({
      phase: "ready",
    });

    expect(await controller.importSource({ source, sourceLocale: "ja", targetLocale: "en" }))
      .toMatchObject({ kind: "completed", value: { phase: "ready" } });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      process: {
        activeAttempt: null,
        transcriptFrontier: 3,
        lastTerminalAttempt: { outcome: "completed" },
      },
      transcript: {
        entries: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }],
      },
      project: { phase: "ready" },
    });
  });

  it("does not republish a completed import after its route is superseded", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const committed = Promise.withResolvers<void>();
    const releaseResponse = Promise.withResolvers<void>();
    const commit = repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    repository.commitTranslationProjectFinalizeWithProcessExecutionTerminal = async (input) => {
      const result = await commit(input);
      committed.resolve();
      await releaseResponse.promise;
      return result;
    };
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("superseded-atomic-finalize"),
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const importing = controller.importSource({
      source: {
        kind: "bytes",
        fileName: "source.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    await committed.promise;
    controller.openHome();
    releaseResponse.resolve();

    expect(await importing).toEqual({ kind: "failed", code: "superseded" });
    expect(controller.getSnapshot()).toMatchObject({ route: "home", activeProcess: null });
    expect(await repository.loadTranslationProjectHead(processId)).toMatchObject({
      phase: "ready",
    });
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      lastTerminalAttempt: { outcome: "completed" },
    });
  });

  it("plans and commits a large import in actual byte-bounded append pages", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const appendInputs: Parameters<TestRepositoryV1["appendTranslationProjectImport"]>[0][] = [];
    const append = repository.appendTranslationProjectImport.bind(repository);
    repository.appendTranslationProjectImport = async (input) => {
      appendInputs.push(structuredClone(input));
      return await append(input);
    };
    const workspace = createWorkspacePortV1(repository);
    const appendMaximumBytes = 1_100;
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("paged"),
      now: () => 30,
      budgets: {
        processSummaryPageMaximumBytes: 128 * 1_024,
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: appendMaximumBytes,
      },
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "long.srt",
        mediaType: "text/srt",
        bytes: textEncoderV1.encode(subtitleDocumentV1(30)),
      },
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
    });

    expect(imported.kind).toBe("completed");
    expect(appendInputs.length).toBeGreaterThan(1);
    expect(appendInputs.flatMap((page) => page.units.map((unit) => unit.order))).toEqual(
      Array.from({ length: 30 }, (_, index) => index),
    );
    for (const page of appendInputs) {
      expect(textEncoderV1.encode(JSON.stringify(page)).byteLength).toBeLessThanOrEqual(
        appendMaximumBytes,
      );
    }
    expect(
      appendInputs.slice(1).every((page, index) =>
        page.expectedProjectRevision === appendInputs[index]!.expectedProjectRevision + 1
      ),
    ).toBe(true);
  });

  it("reconciles a lost append response only through its exact operation receipt", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const appendInputs: Parameters<TestRepositoryV1["appendTranslationProjectImport"]>[0][] = [];
    const queried: Parameters<TestRepositoryV1["queryTranslationProjectOperation"]>[0][] = [];
    const append = repository.appendTranslationProjectImport.bind(repository);
    const query = repository.queryTranslationProjectOperation.bind(repository);
    repository.appendTranslationProjectImport = async (input) => {
      appendInputs.push(structuredClone(input));
      await append(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "append_translation_project_import",
      );
    };
    repository.queryTranslationProjectOperation = async (input) => {
      queried.push(structuredClone(input));
      return await query(input);
    };
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("unknown"),
      now: () => 40,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "one.srt",
        mediaType: "text/srt",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
    });

    expect(imported.kind).toBe("completed");
    expect(appendInputs).toHaveLength(1);
    expect(queried).toEqual([{ operation: "append", input: appendInputs[0] }]);
  });

  it("cold-reopens the durable Translation Project without acquiring its Workspace", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const firstWorkspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("persisted"),
      now: () => 50,
    });
    await first.initialize();
    await first.startOrOpen("program.translation");
    const processId = first.getSnapshot().activeProcess!.process.processId;
    const imported = await first.importSource({
      source: {
        kind: "bytes",
        fileName: "persisted.md",
        mediaType: "text/markdown",
        bytes: textEncoderV1.encode("# 标题\n\n保留 `code`。\n"),
      },
      sourceLocale: "zh-Hans",
      targetLocale: "en",
    });
    expect(imported.kind).toBe("completed");
    first.dispose();

    const coldWorkspace = createWorkspacePortV1(repository);
    const cold = createTranslationProcessControllerV1({ repository, workspace: coldWorkspace });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot()).toMatchObject({
      route: "process",
      sourceImport: { phase: "idle" },
      activeProcess: {
        project: { phase: "ready", document: { format: "markdown" } },
      },
    });
    expect(coldWorkspace.createCalls).toEqual([]);
    expect(coldWorkspace.importCalls).toEqual([]);
  });

  it("does not begin a Project when the Process Workspace source write has a known failure", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository, {
      async importFile() {
        await Promise.resolve();
        throw Object.assign(new Error("synthetic Workspace failure"), {
          code: "workspace_write_failed",
        });
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("binding"),
      now: () => 55,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    expect(
      await controller.importSource({
        source: {
          kind: "bytes",
          fileName: "binding.txt",
          mediaType: "text/plain",
          bytes: textEncoderV1.encode("Exact binding required.\n"),
        },
        sourceLocale: "en",
        targetLocale: "zh-Hans",
      }),
    ).toEqual({ kind: "failed", code: "workspace_write_failed" });
    expect(controller.getSnapshot()).toMatchObject({
      sourceImport: { phase: "failed", code: "workspace_write_failed" },
      activeProcess: { project: null },
    });
    expect(await repository.loadTranslationProjectHead(processId)).toBeNull();
    controller.dispose();

    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
    });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot()).toMatchObject({
      sourceImport: { phase: "idle" },
      activeProcess: { project: null },
    });
  });

  it("resumes an exact staging import from its durable row frontier and source binding", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const append = repository.appendTranslationProjectImport.bind(repository);
    let appendAttempt = 0;
    repository.appendTranslationProjectImport = async (input) => {
      appendAttempt += 1;
      if (appendAttempt === 2) {
        throw createProgramDataRepositoryFailureV1(
          "request_failed",
          "append_translation_project_import",
        );
      }
      return await append(input);
    };
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("resume"),
      now: () => 57,
      budgets: {
        processSummaryPageMaximumBytes: 128 * 1_024,
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: 1_100,
      },
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "resume.srt",
      mediaType: "text/srt",
      bytes: textEncoderV1.encode(subtitleDocumentV1(30)),
    };

    expect(await controller.importSource({ source, sourceLocale: "ja", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "request_failed" });
    const staging = await repository.loadTranslationProjectHead(processId);
    expect(staging).toMatchObject({
      phase: "staging",
      stagedGlossaryCount: 0,
      sourceBinding: {
        revision: 1,
        workspaceId: controller.getSnapshot().activeProcess!.workspace.workspaceId,
        path: expect.stringMatching(/\/source\.srt$/u),
      },
    });
    expect(staging!.stagedUnitCount).toBeGreaterThan(0);
    expect(staging!.stagedUnitCount).toBeLessThan(30);

    const resumed = await controller.importSource({
      source,
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
    });
    expect(resumed.kind).toBe("completed");
    if (resumed.kind !== "completed") return;
    expect(resumed.value).toMatchObject({ phase: "ready", stagedUnitCount: 30 });
    expect(resumed.value.sourceBinding).toEqual(staging!.sourceBinding);
    expect(workspace.importCalls).toHaveLength(2);

    const rows = await repository.loadTranslationProjectUnitPage({
      processId,
      expectedProjectRevision: resumed.value.revision,
      fromOrder: 0,
      maximumRows: 30,
      maximumBytes: 128 * 1_024,
    });
    expect(rows.kind).toBe("page");
    if (rows.kind === "page") {
      expect(rows.page.rows.map((row) => row.order)).toEqual(
        Array.from({ length: 30 }, (_, order) => order),
      );
    }
  });

  it("retains staging and rejects resume when the Workspace exact binding changed", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const append = repository.appendTranslationProjectImport.bind(repository);
    let failAppend = true;
    repository.appendTranslationProjectImport = async (input) => {
      if (failAppend) {
        failAppend = false;
        throw createProgramDataRepositoryFailureV1(
          "request_failed",
          "append_translation_project_import",
        );
      }
      return await append(input);
    };
    let changeBinding = false;
    const workspace = createWorkspacePortV1(repository, {
      async importFile(_input, commit) {
        const imported = await commit();
        return changeBinding
          ? {
            ...imported,
            source: {
              ...imported.source,
              checkpointId: "workspace.checkpoint.changed",
              generation: imported.source.generation + 1,
            },
          }
          : imported;
      },
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("binding"),
      now: () => 58,
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "binding.txt",
      mediaType: "text/plain",
      bytes: textEncoderV1.encode("Exact binding required.\n"),
    };

    expect(await controller.importSource({ source, sourceLocale: "en", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "request_failed" });
    const staging = await repository.loadTranslationProjectHead(processId);
    expect(staging).toMatchObject({ phase: "staging", stagedUnitCount: 0 });
    changeBinding = true;
    expect(await controller.importSource({ source, sourceLocale: "en", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "translation_source_binding_mismatch" });
    expect(await repository.loadTranslationProjectHead(processId)).toEqual(staging);
  });

  it("keeps an existing Process reopenable when its subject Program is no longer cataloged", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("retained"),
    });
    await first.initialize();
    await first.startOrOpen("program.translation");
    const processId = first.getSnapshot().activeProcess!.process.processId;
    first.dispose();

    const load = repository.load.bind(repository);
    repository.load = async (programId) =>
      programId === "program.translation" ? null : await load(programId);
    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
    });
    await cold.initialize();

    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot().activeProcess).toMatchObject({
      process: { processId, subjectProgramId: "program.translation" },
      definition: { name: "Translation" },
      subject: null,
    });
    expect(await cold.startOrOpen("program.translation")).toEqual({
      kind: "failed",
      code: "subject_program_missing",
    });
  });

  it("rejects an oversized source row before writing either source authority", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("rejected"),
      budgets: {
        processSummaryPageMaximumBytes: 128 * 1_024,
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: 512,
      },
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    expect(
      await controller.importSource({
        source: {
          kind: "bytes",
          fileName: "oversized.txt",
          mediaType: "text/plain",
          bytes: textEncoderV1.encode("长".repeat(2_000)),
        },
        sourceLocale: "zh-Hans",
        targetLocale: "en",
      }),
    ).toEqual({ kind: "failed", code: "translation_unit_exceeds_operation_budget" });
    expect(await repository.loadTranslationProjectHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });

  it("lazily imports a born-digital PDF text projection without claiming OCR or round-trip", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const pdfInputs: Uint8Array[] = [];
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("pdf"),
      importBornDigitalPdf: (input) => {
        pdfInputs.push(new Uint8Array(input.bytes));
        return Promise.resolve({
          kind: "ready",
          document: {
            projection: "pdf_text_reflow",
            pageCount: 1,
            sourceUnits: [{
              unitId: "translation.unit.000001",
              order: 0,
              locator: "pdf/page/0001/line/0001",
              context: null,
              durationMilliseconds: null,
              source: "Born-digital source text",
              protectedSegments: [],
            }],
            sourceMap: [],
            pageDiagnostics: [],
          },
        });
      },
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    expect(pdfInputs).toEqual([]);
    const bytes = textEncoderV1.encode("%PDF-synthetic-born-digital");

    const imported = await controller.importSource({
      source: { kind: "bytes", fileName: "source.PDF", bytes },
      sourceLocale: "en",
      targetLocale: "zh-Hans",
    });
    expect(imported.kind).toBe("completed");
    if (imported.kind !== "completed") return;
    expect(pdfInputs).toEqual([bytes]);
    expect(imported.value).toMatchObject({
      phase: "ready",
      document: {
        format: "pdf_text_reflow",
        capabilityGrade: "generic_text_only",
        capabilityReason: "born_digital_pdf_text",
      },
      source: {
        fileName: "source.PDF",
        workspacePath: expect.stringMatching(/\/source\.pdf$/u),
      },
      expectedUnitCount: 1,
      stagedUnitCount: 1,
    });
    const page = await repository.loadTranslationProjectUnitPage({
      processId: imported.value.processId,
      expectedProjectRevision: imported.value.revision,
      fromOrder: 0,
      maximumRows: 1,
      maximumBytes: 4_096,
    });
    expect(page).toMatchObject({
      kind: "page",
      page: { rows: [{ source: "Born-digital source text" }] },
    });
  });

  it("reports a born-digital PDF rejection without writing the Workspace or Project", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("pdf-rejected"),
      importBornDigitalPdf: () =>
        Promise.resolve({
          kind: "rejected",
          reason: "no_extractable_text",
          pageCount: 2,
          pageDiagnostics: [],
        }),
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    expect(
      await controller.importSource({
        source: {
          kind: "bytes",
          fileName: "source.pdf",
          mediaType: "application/pdf",
          bytes: textEncoderV1.encode("%PDF-image-only\n"),
        },
        sourceLocale: "en",
        targetLocale: "zh-Hans",
      }),
    ).toEqual({
      kind: "failed",
      code: "pdf_no_extractable_text",
    });
    expect(await repository.loadTranslationProjectHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });

  it("rejects a partially extracted PDF instead of publishing a silently incomplete Project", async () => {
    const repository = createRepositoryV1();
    await seedProgramV1({ repository, programId: "program.translation" });
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("pdf-partial"),
      importBornDigitalPdf: () =>
        Promise.resolve({
          kind: "ready",
          document: {
            projection: "pdf_text_reflow",
            pageCount: 2,
            sourceUnits: [{
              unitId: "translation.unit.000001",
              order: 0,
              locator: "pdf/page/0001/line/0001",
              context: null,
              durationMilliseconds: null,
              source: "Only the first page was extracted.",
              protectedSegments: [],
            }],
            sourceMap: [],
            pageDiagnostics: [{ pageNumber: 2, reason: "text_extraction_failed" }],
          },
        }),
    });
    await controller.initialize();
    await controller.startOrOpen("program.translation");
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    expect(
      await controller.importSource({
        source: {
          kind: "bytes",
          fileName: "partial.pdf",
          mediaType: "application/pdf",
          bytes: textEncoderV1.encode("%PDF-partial\n"),
        },
        sourceLocale: "en",
        targetLocale: "zh-Hans",
      }),
    ).toEqual({ kind: "failed", code: "pdf_partial_text_extraction" });
    expect(await repository.loadTranslationProjectHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });
});
