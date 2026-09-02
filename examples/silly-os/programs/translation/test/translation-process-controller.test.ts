// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import type {
  BrowserProcessWorkspaceCreateInputV1,
  BrowserProcessWorkspaceImportFileResultV1,
  BrowserProcessWorkspaceInspectionV1,
  BrowserProcessWorkspaceReadFileResultV1,
} from "../../../src/application/workspace/browser-program-workspace-authority.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import type {
  TranslationAgentRunRequestV1,
  TranslationBatchAgentRunRequestV1,
} from "../runtime/translation-agent-contracts.ts";
import type { TranslationBatchBudgetV1 } from "../runtime/translation-batch-planner.ts";
import {
  createTranslationProcessControllerV1 as createTranslationProcessControllerImplementationV1,
  type TranslationProcessControllerWorkspacePortV1,
} from "../runtime/translation-process-controller.ts";
import type {
  AdmittedProgramPackageArchiveV1,
  InstalledProgramPackageReferenceV1,
} from "../../../src/program-platform/package/program-package-archive.ts";
import {
  operationalStructuredPayloadMaximumBytesV1,
  transcriptEntryUtf8ByteLengthV1,
  type TranscriptEntryV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  createTranslationPersistenceTestAdapterV1,
  type TranslationPersistenceTestAdapterV1,
} from "./translation-persistence-test-adapter.ts";

type TestRepositoryV1 = TranslationPersistenceTestAdapterV1;

const translationProgramPackageReferenceV1: InstalledProgramPackageReferenceV1 = {
  programId: "sillyos.translation",
  packageVersion: "1.0.0",
  contentDigest: "d".repeat(64),
};
const translationDifferentContentPackageReferenceV1: InstalledProgramPackageReferenceV1 = {
  ...translationProgramPackageReferenceV1,
  contentDigest: "a".repeat(64),
};

function programPackageV1(
  reference: InstalledProgramPackageReferenceV1,
  name = "Translation",
): AdmittedProgramPackageArchiveV1 {
  const instructions = new TextEncoder().encode("Translate the Process source.");
  return {
    reference: { ...reference },
    manifest: {
      schemaVersion: 1,
      programId: reference.programId,
      packageVersion: reference.packageVersion,
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: "agent.translation.v1",
      name,
      summary: "A test Translation Program.",
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: null,
      scripts: [],
      capabilityIds: ["translation.batch"],
    },
    files: [{
      path: "PROGRAM.md",
      mediaType: "text/markdown",
      bytes: instructions.buffer,
    }],
    byteLength: instructions.byteLength,
  };
}

function settingsProgramPackageV1(): AdmittedProgramPackageArchiveV1 {
  const base = programPackageV1(translationProgramPackageReferenceV1);
  const defaults = textEncoderV1.encode(JSON.stringify({
    targetLocale: "ja",
    defaultStyle: "Preserve the source voice.",
  }));
  return {
    ...base,
    manifest: {
      ...base.manifest,
      settingsDefaultsPath: "settings.defaults.json",
    },
    files: [
      ...base.files,
      {
        path: "settings.defaults.json",
        mediaType: "application/json",
        bytes: defaults.buffer,
      },
    ],
    byteLength: base.byteLength + defaults.byteLength,
  };
}

const translationProgramPackageV1 = programPackageV1(
  translationProgramPackageReferenceV1,
);

function createTranslationProcessControllerV1(
  input:
    & Omit<
      Parameters<typeof createTranslationProcessControllerImplementationV1>[0],
      "programPackage"
    >
    & { readonly programPackage?: AdmittedProgramPackageArchiveV1 },
) {
  return createTranslationProcessControllerImplementationV1({
    ...input,
    programPackage: input.programPackage ?? translationProgramPackageV1,
  });
}

function createRepositoryV1(indexedDB = new IDBFactory()): TestRepositoryV1 {
  return createTranslationPersistenceTestAdapterV1({
    indexedDB,
    keyRange: IDBKeyRange,
  });
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
    readonly captureHead?: (
      input: Parameters<
        TranslationProcessControllerWorkspacePortV1["captureProcessWorkspaceHead"]
      >[0],
      head: { readonly checkpointId: string; readonly generation: number },
    ) => Promise<{ readonly checkpointId: string; readonly generation: number }>;
    readonly importFile?: (
      input: Parameters<
        TranslationProcessControllerWorkspacePortV1["importProcessWorkspaceFile"]
      >[0],
      commit: () => Promise<BrowserProcessWorkspaceImportFileResultV1>,
    ) => Promise<BrowserProcessWorkspaceImportFileResultV1>;
    readonly readFile?: (
      input: Parameters<
        TranslationProcessControllerWorkspacePortV1["readProcessWorkspaceFile"]
      >[0],
      read: () => Promise<BrowserProcessWorkspaceReadFileResultV1>,
    ) => Promise<BrowserProcessWorkspaceReadFileResultV1>;
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
  const importedBytesByPath = new Map<string, Uint8Array>();
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
    async captureProcessWorkspaceHead(input) {
      const [process, binding] = await Promise.all([
        repository.loadProcess(input.processId),
        repository.loadProcessWorkspaceBinding(input.processId),
      ]);
      const checkpoint = process?.checkpoint ?? null;
      if (
        checkpoint === null || binding === null ||
        binding.workspaceId !== input.workspaceId ||
        checkpoint.workspaceId !== input.workspaceId
      ) throw new Error("missing Process Workspace head");
      const head = {
        checkpointId: checkpoint.workspaceCheckpointId,
        generation: checkpoint.workspaceGeneration,
      };
      return options.captureHead === undefined ? head : await options.captureHead(input, head);
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
        importedBytesByPath.set(input.path, new Uint8Array(input.bytes));
        return result;
      };
      return options.importFile === undefined
        ? await commit()
        : await options.importFile(input, commit);
    },
    async readProcessWorkspaceFile(input) {
      const read = async (): Promise<BrowserProcessWorkspaceReadFileResultV1> => {
        const binding = await repository.loadProcessWorkspaceBinding(input.processId);
        const imported = importedByPath.get(input.path);
        const bytes = importedBytesByPath.get(input.path);
        if (
          binding === null || binding.workspaceId !== input.workspaceId || imported === undefined ||
          bytes === undefined
        ) throw new Error("missing imported Process Workspace file");
        return {
          bytes: new Uint8Array(bytes),
          source: {
            ...imported.source,
            checkpointId: `read-checkpoint.${input.workspaceId}`,
            generation: imported.source.generation + 1,
          },
        };
      };
      return options.readFile === undefined ? await read() : await options.readFile(input, read);
    },
  };
  return port;
}

function deterministicIdsV1(prefix = "test"): (purpose: string) => string {
  let sequence = 0;
  return (purpose) => `${prefix}.${purpose}.${String(++sequence)}`;
}

const textEncoderV1 = new TextEncoder();
const translationInstructionV1 = "Translate the next batch and preserve every meaning fact.";

async function appendConversationEntryV1(
  repository: TestRepositoryV1,
  processId: string,
  body: string,
): Promise<TranscriptEntryV1> {
  const process = await repository.loadProcess(processId);
  if (process === null) throw new Error("missing test Process");
  const sequence = process.transcriptFrontier + 1;
  const entryId = `entry.translation.page.${String(sequence)}`;
  const entry: TranscriptEntryV1 = {
    schemaVersion: 1,
    processId,
    sequence,
    entryId,
    role: sequence % 2 === 0 ? "user" : "assistant",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${entryId}.text`,
      markdown: body,
    }],
  };
  const result = await repository.appendProcessTranscript({
    processId,
    expectedProcessRevision: process.revision,
    expectedTranscriptFrontier: process.transcriptFrontier,
    commitId: `commit.translation.page.${String(sequence)}`,
    attemptBinding: null,
    entries: [entry],
    checkpoint: null,
    terminalAttemptReceipt: null,
    updatedAt: process.updatedAt + 1,
  });
  if (result.kind === "conflict") throw new Error("test transcript append conflicted");
  return entry;
}

function subtitleDocumentV1(count: number): string {
  return Array.from({ length: count }, (_, index) => {
    const cue = index + 1;
    const second = String(index % 60).padStart(2, "0");
    return `${String(cue)}\n00:00:${second},000 --> 00:00:${second},900\n字幕 ${
      String(cue)
    }，保持原意。`;
  }).join("\n\n") + "\n";
}

async function sha256HexV1(bytes: Uint8Array): Promise<string> {
  const digestSource = new Uint8Array(bytes.byteLength);
  digestSource.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", digestSource));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function candidateForRunV1(run: TranslationAgentRunRequestV1) {
  if (run.kind !== "batch") throw new TypeError("expected Translation batch run");
  return {
    targets: run.batch.units.map((unit) => ({
      unitId: unit.unitId,
      target: `Translated: ${unit.source}`,
    })),
    ambiguities: [],
  };
}

function requireTranslationBatchRunV1(
  run: TranslationAgentRunRequestV1,
): TranslationBatchAgentRunRequestV1 {
  if (run.kind !== "batch") throw new TypeError("expected Translation batch run");
  return run;
}

function translationBatchBudgetV1(): TranslationBatchBudgetV1 {
  return {
    maximumRequestBytes: 64 * 1_024,
    maximumOutputTokens: 8_192,
    outputEnvelope: {
      fixedCandidateReserveTokens: 128,
      perUnitCandidateReserveTokens: 64,
      targetTokensPerSourceCodePoint: { numerator: 2, denominator: 1 },
    },
  };
}

describe("Translation Process Controller", () => {
  it("initializes without acquiring a Workspace", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({ repository, workspace });

    await controller.initialize();

    expect(workspace.createCalls).toEqual([]);
    expect(controller.getSnapshot()).toMatchObject({
      route: "home",
      activeProcess: null,
      durability: { phase: "ready" },
    });
  });

  it("uses immutable package defaults and persists only a complete valid Process override", async () => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      programPackage: settingsProgramPackageV1(),
      createId: deterministicIdsV1("settings"),
      now: () => 10,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    expect(controller.getSnapshot().activeProcess?.programPackage.settings).toMatchObject({
      effectiveSource: "program_defaults",
      effective: { targetLocale: "ja" },
      admittedProcessOverrideJson: null,
    });
    expect(await controller.updateSettingsOverride('{"targetLocale":"fr"}')).toMatchObject({
      kind: "completed",
      value: {
        kind: "invalid",
        settings: { effective: { targetLocale: "fr" }, admittedProcessOverrideJson: null },
      },
    });
    expect(await repository.loadProcessSettingsOverride(processId)).toMatchObject({
      revision: 1,
      overrideJson: null,
    });

    const completeOverride = JSON.stringify({
      targetLocale: "fr",
      defaultStyle: "Natural French prose.",
    });
    expect(await controller.updateSettingsOverride(completeOverride)).toMatchObject({
      kind: "completed",
      value: {
        kind: "saved",
        settings: {
          effectiveSource: "process_override",
          effective: { targetLocale: "fr", defaultStyle: "Natural French prose." },
        },
      },
    });
    expect(await repository.loadProcessSettingsOverride(processId)).toMatchObject({
      revision: 2,
      overrideJson: JSON.stringify(JSON.parse(completeOverride)),
    });
    expect(controller.getSnapshot().activeProcess?.programPackage.settings.effective).toMatchObject(
      {
        targetLocale: "fr",
        defaultStyle: "Natural French prose.",
      },
    );

    expect(await controller.updateSettingsOverride(null)).toMatchObject({
      kind: "completed",
      value: {
        kind: "saved",
        settings: { effectiveSource: "program_defaults", effective: { targetLocale: "ja" } },
      },
    });
    expect(await repository.loadProcessSettingsOverride(processId)).toMatchObject({
      revision: 3,
      overrideJson: null,
    });
  });

  it("creates one package-pinned Translation Process with an isolated Workspace checkpoint", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1(),
      now: () => 10,
    });
    await controller.initialize();

    expect(await controller.createProcess()).toEqual({
      kind: "completed",
      value: true,
    });

    const active = controller.getSnapshot().activeProcess!;
    expect(active).toMatchObject({
      process: {
        programPackage: translationProgramPackageReferenceV1,
        subjectProgramId: null,
        transcriptFrontier: 1,
      },
      programPackage: {
        reference: translationProgramPackageReferenceV1,
        manifest: { name: "Translation" },
      },
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

  it("pages older Conversation entries into a byte-bounded mounted window", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const seed = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("transcript-pages"),
      now: () => 10,
    });
    await seed.initialize();
    await seed.createProcess();
    const processId = seed.getSnapshot().activeProcess!.process.processId;
    const body = "A".repeat(4_096);
    const appended: TranscriptEntryV1[] = [];
    for (let index = 0; index < 4; index += 1) {
      appended.push(await appendConversationEntryV1(repository, processId, body));
    }
    const pageMaximumBytes = Math.max(...appended.map(transcriptEntryUtf8ByteLengthV1));
    seed.dispose();

    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      budgets: {
        transcriptPageMaximumBytes: pageMaximumBytes,
        transcriptWindowMaximumBytes: pageMaximumBytes * 2,
        importAppendMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
      },
    });
    await controller.initialize();
    await controller.openProcess(processId);
    expect(controller.getSnapshot().activeProcess?.transcript).toMatchObject({
      entries: [appended[3]],
      nextBeforeSequence: appended[3]!.sequence,
      newerOmitted: false,
      phase: "ready",
    });

    expect(await controller.loadOlderTranscript()).toEqual({ kind: "completed", value: true });
    expect(controller.getSnapshot().activeProcess?.transcript).toMatchObject({
      entries: [appended[2], appended[3]],
      newerOmitted: false,
      phase: "ready",
    });

    expect(await controller.loadOlderTranscript()).toEqual({ kind: "completed", value: true });
    expect(controller.getSnapshot().activeProcess?.transcript).toMatchObject({
      entries: [appended[1], appended[2]],
      nextBeforeSequence: appended[1]!.sequence,
      newerOmitted: true,
      phase: "ready",
    });

    expect(await controller.reloadLatestTranscript()).toEqual({
      kind: "completed",
      value: true,
    });
    expect(controller.getSnapshot().activeProcess?.transcript).toMatchObject({
      entries: [appended[3]],
      nextBeforeSequence: appended[3]!.sequence,
      newerOmitted: false,
      phase: "ready",
    });
  });

  it("opens the Conversation when the optional Translation facet is invalid", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const seed = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("facet-degradation"),
      now: () => 10,
    });
    await seed.initialize();
    await seed.createProcess();
    const processId = seed.getSnapshot().activeProcess!.process.processId;
    seed.dispose();

    repository.loadTranslationWorksetHead = () =>
      Promise.reject(createProgramDataRepositoryFailureV1(
        "schema_invalid",
        "invoke_program_persistence_facet",
      ));
    const controller = createTranslationProcessControllerV1({ repository, workspace });
    await controller.initialize();

    expect(await controller.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: {
        process: { processId },
        transcript: { entries: [{ role: "system", sequence: 1 }], phase: "ready" },
        workset: null,
        pendingCandidate: null,
      },
      sourceImport: { phase: "failed", code: "schema_invalid" },
      durability: { phase: "ready" },
    });
  });

  it("does not publish an older Conversation page after its route is superseded", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const seed = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("transcript-stale"),
      now: () => 10,
    });
    await seed.initialize();
    await seed.createProcess();
    const processId = seed.getSnapshot().activeProcess!.process.processId;
    const newest = await appendConversationEntryV1(repository, processId, "A".repeat(4_096));
    const pageMaximumBytes = transcriptEntryUtf8ByteLengthV1(newest);
    seed.dispose();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      budgets: {
        transcriptPageMaximumBytes: pageMaximumBytes,
        transcriptWindowMaximumBytes: pageMaximumBytes * 2,
        importAppendMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
      },
    });
    await controller.initialize();
    await controller.openProcess(processId);

    const loadTranscriptPage = repository.loadTranscriptPage.bind(repository);
    let releaseOlderPage = (): void => {};
    const olderPageGate = new Promise<void>((resolve) => {
      releaseOlderPage = resolve;
    });
    repository.loadTranscriptPage = async (input) => {
      if (input.beforeSequence !== null) await olderPageGate;
      return await loadTranscriptPage(input);
    };

    const pending = controller.loadOlderTranscript();
    expect(controller.getSnapshot().activeProcess?.transcript.phase).toBe("loading_older");
    expect(controller.openHome()).toBe(true);
    releaseOlderPage();

    expect(await pending).toEqual({ kind: "failed", code: "superseded" });
    expect(controller.getSnapshot()).toMatchObject({ route: "home", activeProcess: null });
  });

  it("creates fresh isolated Processes for reusable launches and reopens only an exact recent Process", async () => {
    const repository = createRepositoryV1();
    const firstWorkspace = createWorkspacePortV1(repository);
    const longIdentifierPrefix = `first.${"segment".repeat(24)}`;
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1(longIdentifierPrefix),
      now: () => 10,
    });
    await first.initialize();
    expect(await first.createProcess()).toEqual({ kind: "completed", value: true });
    const firstActive = first.getSnapshot().activeProcess!;
    expect(
      await first.importSource({
        source: {
          kind: "bytes",
          fileName: "first.txt",
          mediaType: "text/plain",
          bytes: textEncoderV1.encode("First Process domain state.\n"),
        },
        sourceLocale: "en",
        targetLocale: "fr",
      }),
    ).toMatchObject({ kind: "completed", value: { phase: "ready" } });

    const secondWorkspace = createWorkspacePortV1(repository);
    const second = createTranslationProcessControllerV1({
      repository,
      workspace: secondWorkspace,
      createId: deterministicIdsV1("second"),
      now: () => 20,
    });
    await second.initialize();
    expect(await second.createProcess()).toEqual({ kind: "completed", value: true });
    const secondActive = second.getSnapshot().activeProcess!;

    expect(secondActive.process.processId).not.toBe(firstActive.process.processId);
    expect(secondActive.workspace.workspaceId).not.toBe(firstActive.workspace.workspaceId);
    expect(secondActive.workset).toBeNull();
    const firstWorkset = await repository.loadTranslationWorksetHead(
      firstActive.process.processId,
    );
    expect(firstWorkset).toMatchObject({ phase: "ready", targetLocale: "fr" });
    expect(firstWorkset!.importOperationId.length).toBeGreaterThan(128);
    expect(await repository.loadTranslationWorksetHead(secondActive.process.processId)).toBeNull();
    expect(firstWorkspace.createCalls).toEqual([firstActive.process.processId]);
    expect(secondWorkspace.createCalls).toEqual([secondActive.process.processId]);

    const recentWorkspace = createWorkspacePortV1(repository);
    const recent = createTranslationProcessControllerV1({
      repository,
      workspace: recentWorkspace,
      createId: deterministicIdsV1("recent"),
      now: () => 30,
    });
    await recent.initialize();
    expect(await recent.openProcess(firstActive.process.processId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect(recent.getSnapshot().activeProcess).toMatchObject({
      process: { processId: firstActive.process.processId },
      workspace: { workspaceId: firstActive.workspace.workspaceId },
      workset: { phase: "ready", targetLocale: "fr" },
    });
    expect(recentWorkspace.createCalls).toEqual([]);
  });

  it("creates and reopens Processes by their exact immutable Translation package", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1(),
      now: () => 10,
    });
    await first.initialize();
    await first.createProcess();
    const translationProcessId = first.getSnapshot().activeProcess!.process.processId;
    const successorWorkspace = createWorkspacePortV1(repository);
    const successor = createTranslationProcessControllerV1({
      repository,
      workspace: successorWorkspace,
      programPackage: programPackageV1(
        translationDifferentContentPackageReferenceV1,
        "Translation successor",
      ),
      createId: deterministicIdsV1("successor"),
      now: () => 21,
    });
    await successor.initialize();
    expect(await successor.createProcess()).toEqual({ kind: "completed", value: true });
    const successorProcessId = successor.getSnapshot().activeProcess!.process.processId;
    expect(successorProcessId).not.toBe(translationProcessId);
    expect(await first.openProcess(successorProcessId)).toEqual({
      kind: "failed",
      code: "process_workspace_mismatch",
    });

    const coldWorkspace = createWorkspacePortV1(repository);
    const cold = createTranslationProcessControllerV1({ repository, workspace: coldWorkspace });
    await cold.initialize();
    expect(await cold.openProcess(translationProcessId)).toEqual({
      kind: "completed",
      value: true,
    });

    expect(cold.getSnapshot().activeProcess?.process.processId).toBe(translationProcessId);
    expect(coldWorkspace.createCalls).toEqual([]);

    const coldSuccessorWorkspace = createWorkspacePortV1(repository);
    const coldSuccessor = createTranslationProcessControllerV1({
      repository,
      workspace: coldSuccessorWorkspace,
      programPackage: programPackageV1(translationDifferentContentPackageReferenceV1),
    });
    await coldSuccessor.initialize();
    expect(await coldSuccessor.openProcess(successorProcessId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect(coldSuccessor.getSnapshot().activeProcess?.process.processId).toBe(successorProcessId);
    expect(coldSuccessorWorkspace.createCalls).toEqual([]);
  });

  it("reconciles an exact durable Process after a lost create response", async () => {
    const repository = createRepositoryV1();
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

    expect(await controller.createProcess()).toEqual({
      kind: "completed",
      value: true,
    });
    expect(controller.getSnapshot()).toMatchObject({
      route: "process",
      activeProcess: { process: { subjectProgramId: null } },
      durability: { phase: "ready" },
    });
  });

  it("does not retry an unresolved unknown create outcome or admit a mismatched binding", async () => {
    const repository = createRepositoryV1();
    const unknownWorkspace = createWorkspacePortV1(repository, {
      create() {
        return Promise.reject(createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "create_process_with_workspace",
        ));
      },
    });
    const unknown = createTranslationProcessControllerV1({
      repository,
      workspace: unknownWorkspace,
      createId: deterministicIdsV1(),
    });
    await unknown.initialize();
    expect(await unknown.createProcess()).toEqual({
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
    await healthy.createProcess();
    const processId = healthy.getSnapshot().activeProcess!.process.processId;
    const mismatchedWorkspace = createWorkspacePortV1(repository, {
      inspect(_processId, inspection) {
        return Promise.resolve(
          inspection === null ? null : {
            ...inspection,
            workspace: { ...inspection.workspace, workspaceId: "workspace.mismatched" },
          },
        );
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

  it("imports a small SRT into the bound Process Workspace and projects its ready work set", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("srt"),
      now: () => 20,
    });
    await controller.initialize();
    await controller.createProcess();
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
        path: `translation-processes/${active.process.processId}/source.srt`,
        checkpointId: `import-checkpoint.${active.workspace.workspaceId}`,
        generation: 2,
      },
    });
    expect(imported.value.source.workspacePath).toMatch(
      /^translation-processes\/[a-zA-Z0-9._:-]+\/source\.srt$/u,
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
        workset: { phase: "ready", stagedUnitCount: 2 },
      },
    });

    const page = await repository.loadTranslationWorksetUnitPage({
      processId: active.process.processId,
      expectedWorksetRevision: imported.value.revision,
      fromOrder: 0,
      maximumRows: 20,
      maximumBytes: 128 * 1_024,
    });
    expect(page.kind).toBe("page");
    if (page.kind === "page") {
      expect(page.page.rows.map((row) => row.order)).toEqual([0, 1]);
      expect(page.page.rows.map((row) => row.source)).toEqual([
        "字幕 1，保持原意。",
        "字幕 2，保持原意。",
      ]);
      expect(page.page.rows.map((row) => row.protectedSegments)).toEqual([
        [],
        [],
      ]);
    }
    await expect(controller.loadTranslationRowWindow({
      processId: active.process.processId,
      expectedWorksetRevision: imported.value.revision,
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
        lineBreakPolicy: "forbidden",
        source: "字幕 2，保持原意。",
        protectedSegments: [],
        target: null,
      }],
      nextOffset: null,
    });
  });

  it("persists a timed-text speaker and dialogue as separate translatable units", async () => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("speaker-units"),
      now: () => 20,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;

    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "speaker.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(
          "1\n00:00:01,000 --> 00:00:03,000\nMina: Keep the receiver close.\n",
        ),
      },
      sourceLocale: "en",
      targetLocale: "zh-CN",
    });
    expect(imported).toMatchObject({
      kind: "completed",
      value: { expectedUnitCount: 2, stagedUnitCount: 2 },
    });
    if (imported.kind !== "completed") throw new Error("expected completed import");

    const page = await repository.loadTranslationWorksetUnitPage({
      processId,
      expectedWorksetRevision: imported.value.revision,
      fromOrder: 0,
      maximumRows: 20,
      maximumBytes: 128 * 1_024,
    });
    expect(page).toMatchObject({
      kind: "page",
      page: {
        rows: [
          {
            order: 0,
            locator: "cue/1/line/1/speaker",
            context: "Timed-text speaker name.",
            source: "Mina",
            protectedSegments: [],
          },
          {
            order: 1,
            locator: "cue/1/line/1/text",
            context: "Spoken by Mina.",
            source: "Keep the receiver close.",
            protectedSegments: [],
          },
        ],
      },
    });
  });

  it("canonicalizes a valid target locale and rejects source-only or malformed targets", async () => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("canonical-target"),
      now: () => 20,
    });
    await controller.initialize();
    await controller.createProcess();

    const source = {
      kind: "bytes" as const,
      fileName: "source.txt",
      mediaType: "text/plain",
      bytes: textEncoderV1.encode("Source text.\n"),
    };
    expect(
      await controller.importSource({ source, sourceLocale: "auto", targetLocale: "zh-tw" }),
    ).toMatchObject({ kind: "completed", value: { targetLocale: "zh-TW" } });

    for (const [index, targetLocale] of ["auto", "not a locale"].entries()) {
      const isolatedRepository = createRepositoryV1();
      const next = createTranslationProcessControllerV1({
        repository: isolatedRepository,
        workspace: createWorkspacePortV1(isolatedRepository),
        createId: deterministicIdsV1(`invalid-target-${String(index)}`),
        now: () => 30,
      });
      await next.initialize();
      await next.createProcess();
      expect(await next.importSource({ source, sourceLocale: "auto", targetLocale })).toEqual({
        kind: "failed",
        code: "invalid_target_locale",
      });
    }
  });

  it("publishes one pending-review candidate with the Process terminal without accepting rows", async () => {
    const repository = createRepositoryV1();
    let settledHead: { readonly checkpointId: string; readonly generation: number } | null = null;
    const workspace = createWorkspacePortV1(repository, {
      captureHead: async (_input, current) => settledHead ?? current,
    });
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("candidate"),
      now: () => 20,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "candidate.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(2)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");

    const prepared = await controller.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error(`expected prepared Translation Agent batch: ${JSON.stringify(prepared)}`);
    }
    const { run } = prepared.value;
    if (run.kind !== "batch") throw new Error("expected Translation batch run");
    expect(run.programPackage).toEqual(translationProgramPackageReferenceV1);
    expect(run.programId).toBe(translationProgramPackageReferenceV1.programId);
    expect(run.replacesCandidateId).toBeNull();
    expect(run.instruction).toBe(translationInstructionV1);
    expect(run.batch.units.map((unit) => unit.order)).toEqual([0, 1]);
    expect(controller.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "user",
      parts: [{ kind: "text_markdown", markdown: translationInstructionV1 }],
    });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      workset: { acceptedUnitCount: 0, acceptedBatchCount: 0, pendingCandidateId: null },
      pendingCandidate: null,
    });

    settledHead = {
      checkpointId: `workspace-checkpoint.${processId}.memory`,
      generation: run.workspaceGeneration + 1,
    };
    const persisted = await controller.recordAgentRunTerminal({
      run,
      outcome: "completed",
      candidate: candidateForRunV1(run),
    });
    expect(persisted).toMatchObject({
      kind: "completed",
      value: { kind: "persisted", candidateId: expect.any(String) },
    });
    if (
      persisted.kind !== "completed" || persisted.value.kind !== "persisted" ||
      persisted.value.candidateId === null
    ) throw new Error("expected durable pending-review candidate");

    const active = controller.getSnapshot().activeProcess!;
    expect(active).toMatchObject({
      process: {
        activeAttempt: null,
        checkpoint: {
          workspaceCheckpointId: settledHead.checkpointId,
          workspaceGeneration: settledHead.generation,
        },
        lastTerminalAttempt: {
          attemptId: run.agentRunId,
          generation: run.processAttemptGeneration,
          outcome: "completed",
        },
      },
      workset: {
        acceptedUnitCount: 0,
        acceptedBatchCount: 0,
        pendingCandidateId: persisted.value.candidateId,
      },
      pendingCandidate: {
        candidateId: persisted.value.candidateId,
        attemptId: run.agentRunId,
        generation: run.processAttemptGeneration,
        targets: candidateForRunV1(run).targets,
      },
    });
    const rowWindow = await controller.loadTranslationRowWindow({
      processId,
      expectedWorksetRevision: active.workset!.revision,
      offset: 0,
      limit: 2,
    });
    expect(rowWindow.rows).toEqual([
      expect.objectContaining({ order: 0, target: null }),
      expect.objectContaining({ order: 1, target: null }),
    ]);
    expect(
      await controller.prepareAgentBatch(translationBatchBudgetV1(), translationInstructionV1),
    ).toEqual({
      kind: "completed",
      value: { kind: "pending_review" },
    });

    controller.dispose();
    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("candidate-cold"),
      now: () => 21,
    });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot().activeProcess).toMatchObject({
      workset: {
        acceptedUnitCount: 0,
        acceptedBatchCount: 0,
        pendingCandidateId: persisted.value.candidateId,
      },
      pendingCandidate: {
        candidateId: persisted.value.candidateId,
        targets: candidateForRunV1(run).targets,
      },
    });

    const pending = cold.getSnapshot().activeProcess!;
    const editedTargets = candidateForRunV1(run).targets.map((target) => ({
      ...target,
      target: `Reviewed: ${target.target}`,
    }));
    expect(
      await cold.acceptPendingCandidate({
        expectedWorksetRevision: pending.workset!.revision - 1,
        candidateId: persisted.value.candidateId,
        targets: editedTargets,
      }),
    ).toMatchObject({
      kind: "completed",
      value: {
        kind: "stale",
        currentWorkset: { pendingCandidateId: persisted.value.candidateId },
      },
    });
    expect(
      await cold.acceptPendingCandidate({
        expectedWorksetRevision: pending.workset!.revision,
        candidateId: `${persisted.value.candidateId}.stale`,
        targets: editedTargets,
      }),
    ).toMatchObject({
      kind: "completed",
      value: {
        kind: "stale",
        currentWorkset: { pendingCandidateId: persisted.value.candidateId },
      },
    });
    expect(
      await cold.acceptPendingCandidate({
        expectedWorksetRevision: pending.workset!.revision,
        candidateId: persisted.value.candidateId,
        targets: editedTargets,
      }),
    ).toMatchObject({
      kind: "completed",
      value: {
        kind: "accepted",
        workset: {
          acceptedUnitCount: 2,
          acceptedBatchCount: 1,
          pendingCandidateId: null,
        },
      },
    });
    const accepted = cold.getSnapshot().activeProcess!;
    expect(accepted).toMatchObject({
      workset: {
        acceptedUnitCount: 2,
        acceptedBatchCount: 1,
        pendingCandidateId: null,
      },
      pendingCandidate: null,
    });
    expect(
      await repository.loadTranslationBatchCandidate(
        processId,
        persisted.value.candidateId,
      ),
    ).toBeNull();
    expect(
      (await cold.loadTranslationRowWindow({
        processId,
        expectedWorksetRevision: accepted.workset!.revision,
        offset: 0,
        limit: 2,
      })).rows,
    ).toEqual([
      expect.objectContaining({ order: 0, target: editedTargets[0]!.target }),
      expect.objectContaining({ order: 1, target: editedTargets[1]!.target }),
    ]);
    const worksetBeforeFollowUp = await repository.loadTranslationWorksetHead(processId);
    const followUp = await cold.prepareAgentBatch(
      translationBatchBudgetV1(),
      "Summarize the completed Translation Process.",
    );
    expect(followUp).toMatchObject({
      kind: "completed",
      value: { kind: "prepared", run: { kind: "follow_up" } },
    });
    if (
      followUp.kind !== "completed" || followUp.value.kind !== "prepared" ||
      followUp.value.run.kind !== "follow_up"
    ) throw new Error("expected completed Translation Process follow-up");
    expect(followUp.value.run.context).toMatchObject({
      worksetRevision: worksetBeforeFollowUp?.revision,
      sourceFileName: "candidate.srt",
      documentFormat: "subrip",
      sourceLocale: "ja",
      targetLocale: "en",
      translatedUnitCount: 2,
      acceptedBatchCount: 1,
    });
    expect(followUp.value.run.context).not.toHaveProperty("units");
    expect(followUp.value.run.context).not.toHaveProperty("transcript");
    expect(cold.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "user",
      parts: [{
        kind: "text_markdown",
        markdown: "Summarize the completed Translation Process.",
      }],
    });
    expect(
      await cold.recordAgentRunTerminal({
        run: followUp.value.run,
        outcome: "completed",
        assistantReply: "The translation is complete and ready to discuss.",
      }),
    ).toMatchObject({ kind: "completed", value: { kind: "persisted", candidateId: null } });
    expect(await repository.loadTranslationWorksetHead(processId)).toEqual(worksetBeforeFollowUp);
    expect(cold.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "assistant",
      parts: [{
        kind: "text_markdown",
        markdown: "The translation is complete and ready to discuss.",
      }],
    });
    const secondFollowUp = await cold.prepareAgentBatch(
      translationBatchBudgetV1(),
      "What did I ask you previously?",
    );
    if (
      secondFollowUp.kind !== "completed" || secondFollowUp.value.kind !== "prepared" ||
      secondFollowUp.value.run.kind !== "follow_up"
    ) throw new Error("expected a second conversational Translation follow-up");
    expect(
      secondFollowUp.value.run.context.recentConversation.slice(-2).map((turn) => ({
        role: turn.role,
        markdown: turn.markdown,
      })),
    ).toEqual([
      { role: "user", markdown: "Summarize the completed Translation Process." },
      { role: "assistant", markdown: "The translation is complete and ready to discuss." },
    ]);
    expect(
      await cold.recordAgentRunTerminal({
        run: secondFollowUp.value.run,
        outcome: "cancelled",
      }),
    ).toMatchObject({ kind: "completed", value: { kind: "persisted" } });
  });

  it("cold-reopens after the first accepted batch and completes non-zero global orders before export", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const sourceBytes = textEncoderV1.encode(subtitleDocumentV1(4));
    const singleUnitBudget: TranslationBatchBudgetV1 = {
      maximumRequestBytes: 64 * 1_024,
      maximumOutputTokens: 220,
      outputEnvelope: {
        fixedCandidateReserveTokens: 128,
        perUnitCandidateReserveTokens: 64,
        targetTokensPerSourceCodePoint: { numerator: 2, denominator: 1 },
      },
    };
    const first = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("multi-batch-first"),
      now: () => 30,
    });
    await first.initialize();
    await first.createProcess();
    const processId = first.getSnapshot().activeProcess!.process.processId;
    expect(
      await first.importSource({
        source: {
          kind: "bytes",
          fileName: "multi-batch.srt",
          mediaType: "application/x-subrip",
          bytes: sourceBytes,
        },
        sourceLocale: "ja",
        targetLocale: "en",
      }),
    ).toMatchObject({ kind: "completed", value: { expectedUnitCount: 4 } });

    const acceptedOrders: number[][] = [];
    const completeOneBatchV1 = async (
      controller: ReturnType<typeof createTranslationProcessControllerV1>,
    ): Promise<void> => {
      const prepared = await controller.prepareAgentBatch(
        singleUnitBudget,
        translationInstructionV1,
      );
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        throw new Error(`expected prepared Translation Agent batch: ${JSON.stringify(prepared)}`);
      }
      const { run } = prepared.value;
      if (run.kind !== "batch") throw new Error("expected Translation batch before completion");
      acceptedOrders.push(run.batch.units.map((unit) => unit.order));
      const terminal = await controller.recordAgentRunTerminal({
        run,
        outcome: "completed",
        candidate: candidateForRunV1(run),
      });
      if (
        terminal.kind !== "completed" || terminal.value.kind !== "persisted" ||
        terminal.value.candidateId === null
      ) throw new Error(`expected durable pending candidate: ${JSON.stringify(terminal)}`);
      const active = controller.getSnapshot().activeProcess!;
      expect(
        await controller.acceptPendingCandidate({
          expectedWorksetRevision: active.workset!.revision,
          candidateId: terminal.value.candidateId,
          targets: candidateForRunV1(run).targets,
        }),
      ).toMatchObject({ kind: "completed", value: { kind: "accepted" } });
    };

    await completeOneBatchV1(first);
    expect(first.getSnapshot().activeProcess?.workset).toMatchObject({
      acceptedUnitCount: 1,
      acceptedBatchCount: 1,
      pendingCandidateId: null,
    });
    first.dispose();

    const cold = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("multi-batch-cold"),
      now: () => 31,
    });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot().activeProcess?.workset).toMatchObject({
      acceptedUnitCount: 1,
      acceptedBatchCount: 1,
    });

    await completeOneBatchV1(cold);
    await completeOneBatchV1(cold);
    await completeOneBatchV1(cold);
    expect(acceptedOrders).toEqual([[0], [1], [2], [3]]);
    const active = cold.getSnapshot().activeProcess!;
    expect(active.workset).toMatchObject({
      acceptedUnitCount: 4,
      acceptedBatchCount: 4,
      pendingCandidateId: null,
    });
    const rows = await cold.loadTranslationRowWindow({
      processId,
      expectedWorksetRevision: active.workset!.revision,
      offset: 0,
      limit: 4,
    });
    expect(rows.rows.map((row) => row.order)).toEqual([0, 1, 2, 3]);
    expect(rows.rows.every((row) => row.target !== null)).toBe(true);
    const exportResult = await cold.exportCompletedTranslation();
    if (exportResult.kind !== "completed" || exportResult.value.kind !== "exported") {
      throw new Error(`expected completed Translation export: ${JSON.stringify(exportResult)}`);
    }
    const exported = exportResult.value;
    expect(exported.artifact.fileName).toBe("multi-batch.en.srt");
    expect(new TextDecoder().decode(exported.artifact.bytes)).toContain(
      "Translated: 字幕 4，保持原意。",
    );
    const followUp = await cold.prepareAgentBatch(singleUnitBudget, translationInstructionV1);
    expect(followUp).toMatchObject({
      kind: "completed",
      value: { kind: "prepared", run: { kind: "follow_up" } },
    });
  });

  it("retries one exact pending batch as explicit successor attempts without losing its predecessor", async () => {
    const repository = createRepositoryV1();
    let observedAt = 30;
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("candidate-successor"),
      now: () => observedAt,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "successor.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(2)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");

    const prepared = await controller.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected initial Translation Agent batch");
    }
    const initialRun = requireTranslationBatchRunV1(prepared.value.run);
    expect(initialRun.replacesCandidateId).toBeNull();
    const mechanicallyWrongCandidate = {
      targets: candidateForRunV1(initialRun).targets.map((target) => ({
        ...target,
        target: target.target.replaceAll(/\d+/gu, "missing"),
      })),
      ambiguities: [],
    };
    const initialTerminal = await controller.recordAgentRunTerminal({
      run: initialRun,
      outcome: "completed",
      candidate: mechanicallyWrongCandidate,
    });
    if (
      initialTerminal.kind !== "completed" || initialTerminal.value.kind !== "persisted" ||
      initialTerminal.value.candidateId === null
    ) throw new Error("expected initial pending candidate");
    const predecessorId = initialTerminal.value.candidateId;
    const predecessor = await repository.loadTranslationBatchCandidate(processId, predecessorId);
    if (predecessor === null) throw new Error("expected durable predecessor candidate");
    expect(predecessor.findings.map((finding) => finding.code)).toContain(
      "number_tokens_changed",
    );
    const reviewTargets = candidateForRunV1(initialRun).targets;

    const activeBeforeInvalidDraft = controller.getSnapshot().activeProcess!;
    expect(
      await controller.preparePendingCandidateRetranslation(
        translationBatchBudgetV1(),
        {
          expectedWorksetRevision: activeBeforeInvalidDraft.workset!.revision,
          candidateId: predecessorId,
          targets: reviewTargets.map((target, index) =>
            index === 0 ? { ...target, target: `${target.target}\nforbidden` } : target
          ),
          instruction: null,
        },
      ),
    ).toEqual({
      kind: "completed",
      value: { kind: "rejected", reason: "candidate_invalid" },
    });
    expect(await repository.loadProcess(processId)).toMatchObject({ activeAttempt: null });
    expect(await repository.loadTranslationBatchCandidate(processId, predecessorId)).toEqual(
      predecessor,
    );

    const prepareSuccessorV1 = async () => {
      observedAt += 1;
      const active = controller.getSnapshot().activeProcess;
      if (active?.workset === null || active?.workset === undefined) {
        throw new Error("expected active Translation workset");
      }
      const next = await controller.preparePendingCandidateRetranslation(
        translationBatchBudgetV1(),
        {
          expectedWorksetRevision: active.workset.revision,
          candidateId: predecessorId,
          targets: reviewTargets,
          instruction: null,
        },
      );
      if (next.kind !== "completed" || next.value.kind !== "prepared") {
        throw new Error(`expected candidate successor attempt: ${JSON.stringify(next)}`);
      }
      if (next.value.run.kind !== "batch") {
        throw new Error("expected Translation batch successor");
      }
      return next.value.run;
    };

    const failedRun = await prepareSuccessorV1();
    expect(failedRun).toMatchObject({
      processId,
      replacesCandidateId: predecessorId,
      processAttemptGeneration: initialRun.processAttemptGeneration + 1,
    });
    expect(failedRun.agentRunId).not.toBe(initialRun.agentRunId);
    expect(failedRun.batch).toEqual(initialRun.batch);
    expect(failedRun.instruction).not.toBe(translationInstructionV1);
    expect(failedRun.instruction).toContain('"summary":{}');
    expect(failedRun.instruction).not.toContain("number_tokens_changed");
    expect(await repository.loadTranslationBatchCandidate(processId, predecessorId)).toEqual(
      predecessor,
    );
    expect((await repository.loadTranslationWorksetHead(processId))?.pendingCandidateId).toBe(
      predecessorId,
    );
    observedAt += 1;
    expect(
      await controller.recordAgentRunTerminal({
        run: failedRun,
        outcome: "failed",
        diagnosticCode: "output_limit",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
    expect(await repository.loadTranslationBatchCandidate(processId, predecessorId)).toEqual(
      predecessor,
    );
    expect(controller.getSnapshot().activeProcess?.pendingCandidate?.candidateId).toBe(
      predecessorId,
    );
    expect(controller.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "system",
      parts: [{
        kind: "text_markdown",
        markdown:
          "Retranslation exhausted the model output budget. The previous review candidate remains available.",
      }],
    });

    const cancelledRun = await prepareSuccessorV1();
    expect(cancelledRun).toMatchObject({
      replacesCandidateId: predecessorId,
      processAttemptGeneration: failedRun.processAttemptGeneration + 1,
      batch: initialRun.batch,
    });
    observedAt += 1;
    expect(
      await controller.recordAgentRunTerminal({
        run: cancelledRun,
        outcome: "cancelled",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
    expect(await repository.loadTranslationBatchCandidate(processId, predecessorId)).toEqual(
      predecessor,
    );
    expect((await repository.loadTranslationWorksetHead(processId))?.pendingCandidateId).toBe(
      predecessorId,
    );

    const successfulRun = await prepareSuccessorV1();
    expect(successfulRun).toMatchObject({
      replacesCandidateId: predecessorId,
      processAttemptGeneration: cancelledRun.processAttemptGeneration + 1,
      batch: initialRun.batch,
    });
    const successorCandidate = {
      targets: successfulRun.batch.units.map((unit) => ({
        unitId: unit.unitId,
        target: `Revised: ${unit.source}`,
      })),
      ambiguities: [],
    };
    observedAt += 1;
    const successfulTerminal = await controller.recordAgentRunTerminal({
      run: successfulRun,
      outcome: "completed",
      candidate: successorCandidate,
    });
    if (
      successfulTerminal.kind !== "completed" ||
      successfulTerminal.value.kind !== "persisted" ||
      successfulTerminal.value.candidateId === null
    ) throw new Error("expected replacement candidate");
    const successorId = successfulTerminal.value.candidateId;
    expect(successorId).not.toBe(predecessorId);
    expect(await repository.loadTranslationBatchCandidate(processId, predecessorId)).toBeNull();
    expect(await repository.loadTranslationBatchCandidate(processId, successorId)).toMatchObject({
      candidateId: successorId,
      baseWorksetRevision: predecessor.baseWorksetRevision + 1,
      request: initialRun.batch,
      targets: successorCandidate.targets,
      attemptId: successfulRun.agentRunId,
      generation: successfulRun.processAttemptGeneration,
    });
    expect(controller.getSnapshot().activeProcess).toMatchObject({
      workset: { pendingCandidateId: successorId },
      pendingCandidate: { candidateId: successorId, targets: successorCandidate.targets },
    });

    expect(
      await controller.preparePendingCandidateRetranslation(
        translationBatchBudgetV1(),
        {
          expectedWorksetRevision: predecessor.baseWorksetRevision + 1,
          candidateId: predecessorId,
          targets: reviewTargets,
          instruction: null,
        },
      ),
    ).toEqual({ kind: "completed", value: { kind: "unavailable" } });

    const successorSnapshot = controller.getSnapshot().activeProcess!;
    const editedReplacementTargets = successorCandidate.targets.map((target, index) =>
      index === 0 ? { ...target, target: `${target.target} Human edit 999.` } : target
    );
    const expiring = await controller.preparePendingCandidateRetranslation(
      translationBatchBudgetV1(),
      {
        expectedWorksetRevision: successorSnapshot.workset!.revision,
        candidateId: successorId,
        targets: editedReplacementTargets,
        instruction: null,
      },
    );
    if (expiring.kind !== "completed" || expiring.value.kind !== "prepared") {
      throw new Error("expected expiring replacement attempt");
    }
    const expiredRun = requireTranslationBatchRunV1(expiring.value.run);
    expect(expiredRun.instruction).toContain("Human edit 999.");
    const expiredTrigger = (await repository.loadProcess(processId))?.activeAttempt;
    if (expiredTrigger === null || expiredTrigger === undefined) {
      throw new Error("expected durable replacement trigger");
    }
    const expiredLease = await repository.loadProcessExecutionLease(processId);
    if (expiredLease === null) throw new Error("expected replacement execution lease");
    observedAt = expiredLease.expiresAt + 1;

    const recovered = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("candidate-successor-recovered"),
      ownerInstanceId: "owner.candidate-successor-recovered",
      now: () => observedAt,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await recovered.initialize();
    expect(await recovered.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(recovered.getSnapshot().activeProcess).toMatchObject({
      process: {
        status: "interrupted_retryable",
        activeAttempt: null,
        lastTerminalAttempt: {
          attemptId: expiredRun.agentRunId,
          generation: expiredRun.processAttemptGeneration,
          outcome: "interrupted",
          interruptionDisposition: "retryable",
        },
      },
      workset: { pendingCandidateId: successorId },
      pendingCandidate: { candidateId: successorId, targets: successorCandidate.targets },
    });
    expect(await repository.loadTranslationBatchCandidate(processId, successorId)).not.toBeNull();

    const recoveredSnapshot = recovered.getSnapshot().activeProcess!;
    const retried = await recovered.preparePendingCandidateRetranslation(
      translationBatchBudgetV1(),
      {
        expectedWorksetRevision: recoveredSnapshot.workset!.revision,
        candidateId: successorId,
        targets: successorCandidate.targets,
        instruction: null,
      },
    );
    if (retried.kind !== "completed" || retried.value.kind !== "prepared") {
      throw new Error(
        `expected explicit retry after expired replacement: ${JSON.stringify(retried)}`,
      );
    }
    expect(retried.value.run).toMatchObject({
      replacesCandidateId: successorId,
      processAttemptGeneration: expiredRun.processAttemptGeneration + 1,
      batch: expiredRun.batch,
      instruction: expiredRun.instruction,
    });
    expect((await repository.loadProcess(processId))?.activeAttempt).toMatchObject({
      triggerEntryId: expiredTrigger.triggerEntryId,
      triggerSequence: expiredTrigger.triggerSequence,
    });
    observedAt += 1;
    expect(
      await recovered.recordAgentRunTerminal({
        run: retried.value.run,
        outcome: "cancelled",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
  });

  it("rejects an exact pending candidate without accepting its rows", async () => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("candidate-reject"),
      now: () => 25,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "reject.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");
    const prepared = await controller.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Translation Agent batch");
    }
    const batchRun = requireTranslationBatchRunV1(prepared.value.run);
    const persisted = await controller.recordAgentRunTerminal({
      run: batchRun,
      outcome: "completed",
      candidate: candidateForRunV1(batchRun),
    });
    if (
      persisted.kind !== "completed" || persisted.value.kind !== "persisted" ||
      persisted.value.candidateId === null
    ) throw new Error("expected pending-review candidate");
    const pending = controller.getSnapshot().activeProcess!;

    expect(
      await controller.rejectPendingCandidate({
        expectedWorksetRevision: pending.workset!.revision,
        candidateId: persisted.value.candidateId,
      }),
    ).toMatchObject({
      kind: "completed",
      value: {
        kind: "rejected",
        workset: {
          acceptedUnitCount: 0,
          acceptedBatchCount: 0,
          pendingCandidateId: null,
        },
      },
    });
    const rejected = controller.getSnapshot().activeProcess!;
    expect(rejected).toMatchObject({
      workset: {
        acceptedUnitCount: 0,
        acceptedBatchCount: 0,
        pendingCandidateId: null,
      },
      pendingCandidate: null,
    });
    expect(
      await repository.loadTranslationBatchCandidate(
        processId,
        persisted.value.candidateId,
      ),
    ).toBeNull();
    expect(
      (await controller.loadTranslationRowWindow({
        processId,
        expectedWorksetRevision: rejected.workset!.revision,
        offset: 0,
        limit: 1,
      })).rows,
    ).toEqual([
      expect.objectContaining({ order: 0, target: null }),
    ]);
    expect(
      await controller.prepareAgentBatch(translationBatchBudgetV1(), translationInstructionV1),
    ).toMatchObject({
      kind: "completed",
      value: { kind: "prepared" },
    });
  });

  it.each(["failed", "cancelled"] as const)(
    "does not publish a candidate when the Translation Agent terminal is %s",
    async (outcome) => {
      const repository = createRepositoryV1();
      const controller = createTranslationProcessControllerV1({
        repository,
        workspace: createWorkspacePortV1(repository),
        createId: deterministicIdsV1(`terminal-${outcome}`),
        now: () => 30,
      });
      await controller.initialize();
      await controller.createProcess();
      const processId = controller.getSnapshot().activeProcess!.process.processId;
      const imported = await controller.importSource({
        source: {
          kind: "bytes",
          fileName: `${outcome}.srt`,
          mediaType: "application/x-subrip",
          bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
        },
        sourceLocale: "ja",
        targetLocale: "en",
      });
      if (imported.kind !== "completed") throw new Error("expected ready Process work set");
      const prepared = await controller.prepareAgentBatch(
        translationBatchBudgetV1(),
        translationInstructionV1,
      );
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        throw new Error(`expected prepared Translation Agent batch: ${JSON.stringify(prepared)}`);
      }
      const terminal = outcome === "failed"
        ? {
          run: prepared.value.run,
          outcome,
          diagnosticCode: "run_failed" as const,
        }
        : { run: prepared.value.run, outcome };

      expect(await controller.recordAgentRunTerminal(terminal)).toEqual({
        kind: "completed",
        value: { kind: "persisted", candidateId: null },
      });
      expect(controller.getSnapshot().activeProcess).toMatchObject({
        process: { activeAttempt: null, lastTerminalAttempt: { outcome } },
        workset: {
          acceptedUnitCount: 0,
          acceptedBatchCount: 0,
          pendingCandidateId: null,
        },
        pendingCandidate: null,
      });
      expect(await repository.loadTranslationWorksetHead(processId)).toMatchObject({
        pendingCandidateId: null,
      });
    },
  );

  it("serializes an in-flight monitor renewal before terminal renewal", async () => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("terminal-renewal-race"),
      now: () => 30,
    });
    await controller.initialize();
    await controller.createProcess();
    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: "terminal-renewal-race.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");
    const prepared = await controller.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Translation Agent batch");
    }

    const renewProcessExecutionLease = repository.renewProcessExecutionLease.bind(repository);
    let releaseMonitorRenewal!: () => void;
    const monitorRenewalReleased = new Promise<void>((resolve) => {
      releaseMonitorRenewal = resolve;
    });
    let observeMonitorRenewal!: () => void;
    const monitorRenewalObserved = new Promise<void>((resolve) => {
      observeMonitorRenewal = resolve;
    });
    let renewalCount = 0;
    repository.renewProcessExecutionLease = async (input) => {
      renewalCount += 1;
      if (renewalCount === 1) {
        observeMonitorRenewal();
        await monitorRenewalReleased;
      }
      return await renewProcessExecutionLease(input);
    };

    const monitorRenewal = controller.renewAgentRunLease(prepared.value.run);
    await monitorRenewalObserved;
    const terminal = controller.recordAgentRunTerminal({
      run: prepared.value.run,
      outcome: "cancelled",
    });
    releaseMonitorRenewal();

    expect(await monitorRenewal).toEqual({ kind: "completed", value: "idle" });
    expect(await terminal).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
    expect(renewalCount).toBe(2);
  });

  it.each([
    [
      "candidate_structure_invalid" as const,
      "Translation returned a malformed candidate envelope. No translation content was published.",
    ],
    [
      "candidate_invalid" as const,
      "Translation returned a candidate that did not satisfy the exact batch constraints. No translation content was published.",
    ],
    [
      "output_limit" as const,
      "Translation exhausted the model output budget before a review candidate was published.",
    ],
  ])("records an explainable %s terminal without publishing a candidate", async (
    diagnosticCode,
    expectedMessage,
  ) => {
    const repository = createRepositoryV1();
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1(`terminal-${diagnosticCode}`),
      now: () => 35,
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const imported = await controller.importSource({
      source: {
        kind: "bytes",
        fileName: `${diagnosticCode}.srt`,
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");
    const prepared = await controller.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      throw new Error("expected prepared Translation Agent batch");
    }

    expect(
      await controller.recordAgentRunTerminal({
        run: prepared.value.run,
        outcome: "failed",
        diagnosticCode,
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
    expect(controller.getSnapshot().activeProcess?.transcript.entries.at(-1)).toMatchObject({
      role: "system",
      parts: [{ kind: "text_markdown", markdown: expectedMessage }],
    });
    expect(await repository.loadTranslationWorksetHead(processId)).toMatchObject({
      acceptedUnitCount: 0,
      pendingCandidateId: null,
    });
  });

  it("recovers an expired ready-workset batch as retryable and fences its stale generation", async () => {
    const repository = createRepositoryV1();
    let observedAt = 40;
    const predecessor = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("batch-predecessor"),
      ownerInstanceId: "owner.batch.predecessor",
      now: () => observedAt,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await predecessor.initialize();
    await predecessor.createProcess();
    const imported = await predecessor.importSource({
      source: {
        kind: "bytes",
        fileName: "retry.srt",
        mediaType: "application/x-subrip",
        bytes: textEncoderV1.encode(subtitleDocumentV1(1)),
      },
      sourceLocale: "ja",
      targetLocale: "en",
    });
    if (imported.kind !== "completed") throw new Error("expected ready Process work set");
    const firstPrepared = await predecessor.prepareAgentBatch(
      translationBatchBudgetV1(),
      translationInstructionV1,
    );
    if (firstPrepared.kind !== "completed" || firstPrepared.value.kind !== "prepared") {
      throw new Error(
        `expected predecessor Translation Agent batch: ${JSON.stringify(firstPrepared)}`,
      );
    }
    const firstRun = requireTranslationBatchRunV1(firstPrepared.value.run);
    const frontierBeforeRecovery = (await repository.loadProcess(firstRun.processId))!
      .transcriptFrontier;
    const settledWorkspaceHead = {
      checkpointId: `${firstRun.workspaceCheckpointId}.memory`,
      generation: firstRun.workspaceGeneration + 1,
    };

    observedAt = 61;
    const successor = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository, {
        captureHead: async () => settledWorkspaceHead,
      }),
      createId: deterministicIdsV1("batch-successor"),
      ownerInstanceId: "owner.batch.successor",
      now: () => observedAt,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await successor.initialize();
    expect(await successor.openProcess(firstRun.processId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect(successor.getSnapshot().activeProcess?.process).toMatchObject({
      status: "interrupted_retryable",
      transcriptFrontier: frontierBeforeRecovery + 1,
      activeAttempt: null,
      checkpoint: {
        workspaceCheckpointId: settledWorkspaceHead.checkpointId,
        workspaceGeneration: settledWorkspaceHead.generation,
      },
      lastTerminalAttempt: {
        attemptId: firstRun.agentRunId,
        generation: firstRun.processAttemptGeneration,
        outcome: "interrupted",
        interruptionDisposition: "retryable",
      },
    });
    expect(successor.getSnapshot().activeProcess).toMatchObject({
      workset: { phase: "ready", pendingCandidateId: null },
      pendingCandidate: null,
    });

    const retried = await successor.prepareAgentBatch(
      translationBatchBudgetV1(),
      "This replacement text must not replace the durable retry instruction.",
    );
    if (retried.kind !== "completed" || retried.value.kind !== "prepared") {
      throw new Error("expected retryable successor Translation Agent batch");
    }
    expect(retried.value.run).toMatchObject({
      processId: firstRun.processId,
      processAttemptGeneration: firstRun.processAttemptGeneration + 1,
      instruction: translationInstructionV1,
      workspaceCheckpointId: settledWorkspaceHead.checkpointId,
      workspaceGeneration: settledWorkspaceHead.generation,
    });
    expect(
      await predecessor.recordAgentRunTerminal({
        run: firstRun,
        outcome: "completed",
        candidate: candidateForRunV1(firstRun),
      }),
    ).toEqual({ kind: "completed", value: { kind: "stale" } });
    expect((await repository.loadTranslationWorksetHead(firstRun.processId))?.pendingCandidateId)
      .toBeNull();

    expect(
      await successor.recordAgentRunTerminal({
        run: retried.value.run,
        outcome: "cancelled",
      }),
    ).toEqual({
      kind: "completed",
      value: { kind: "persisted", candidateId: null },
    });
  });

  it("fences two controllers so an old import generation cannot publish after takeover", async () => {
    const repository = createRepositoryV1();
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
    await first.createProcess();
    const processId = first.getSnapshot().activeProcess!.process.processId;
    expect(await second.openProcess(processId)).toEqual({ kind: "completed", value: true });
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
    expect((await repository.loadTranslationWorksetHead(processId))?.source.fileName).toBe(
      "second.srt",
    );
  });

  it("does not acquire a stale import after another controller completes the work set", async () => {
    const repository = createRepositoryV1();
    const staleAcquireEntered = Promise.withResolvers<void>();
    const releaseStaleAcquire = Promise.withResolvers<void>();
    const acquire = repository.acquireTranslationWorksetImportExecution.bind(repository);
    repository.acquireTranslationWorksetImportExecution = async (input) => {
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
    await winner.createProcess();
    const processId = winner.getSnapshot().activeProcess!.process.processId;
    expect(await stale.openProcess(processId)).toEqual({ kind: "completed", value: true });
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
      code: "translation_workset_exists",
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
    await controller.createProcess();
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

  it("keeps an expired staging import unrecoverable without blocking a fresh Translation Process", async () => {
    const repository = createRepositoryV1();
    let currentTime = 20;
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const append = repository.appendTranslationWorksetImport.bind(repository);
    repository.appendTranslationWorksetImport = async (input) => {
      entered.resolve();
      await release.promise;
      return await append(input);
    };
    const firstWorkspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("expired"),
      ownerInstanceId: "owner.expired",
      now: () => currentTime,
      processExecutionLeaseDurationMilliseconds: 20,
    });
    await first.initialize();
    await first.createProcess();
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
    expect(await repository.loadTranslationWorksetHead(processId)).toMatchObject({
      phase: "staging",
      stagedUnitCount: 0,
      pendingCandidateId: null,
    });
    const checkpointBeforeRecovery = (await repository.loadProcess(processId))?.checkpoint;
    currentTime = 50;

    const restart = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository, {
        captureHead: () => Promise.reject(new Error("Workspace is still held by predecessor")),
      }),
      createId: deterministicIdsV1("restart-after-expiry"),
      now: () => currentTime + 1,
    });
    await restart.initialize();
    expect(await restart.openProcess(processId)).toEqual({
      kind: "completed",
      value: true,
    });
    expect(await repository.loadProcessExecutionLease(processId)).toBeNull();
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      status: "interrupted_unrecoverable",
      checkpoint: checkpointBeforeRecovery,
      lastTerminalAttempt: { outcome: "interrupted" },
    });
    expect(await restart.createProcess()).toEqual({
      kind: "completed",
      value: true,
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
    expect(await importing).toEqual({ kind: "failed", code: "translation_workset_conflict" });
  });

  it("renews the Process lease while a Workspace import exceeds one lease window", async () => {
    const repository = createRepositoryV1();
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
    await controller.createProcess();

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
    await controller.createProcess();

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

  it("reconciles a lost atomic work-set finalize and Process-terminal response", async () => {
    const repository = createRepositoryV1();
    const commit = repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal = async (input) => {
      await commit(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "invoke_program_persistence_facet",
      );
    };
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("unknown-atomic-finalize"),
    });
    await controller.initialize();
    await controller.createProcess();

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
      workset: { phase: "ready" },
    });
  });

  it("refreshes the completed Process and transcript when retry observes a ready work set", async () => {
    const repository = createRepositoryV1();
    const commit = repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    const query = repository.queryTranslationWorksetOperation.bind(repository);
    let loseQueryResponse = true;
    repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal = async (input) => {
      await commit(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "invoke_program_persistence_facet",
      );
    };
    repository.queryTranslationWorksetOperation = async (input) => {
      if (loseQueryResponse) {
        loseQueryResponse = false;
        throw createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "invoke_program_persistence_facet",
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
    await controller.createProcess();
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
      workset: { phase: "staging" },
    });
    expect(await repository.loadTranslationWorksetHead(processId)).toMatchObject({
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
      workset: { phase: "ready" },
    });
  });

  it("does not republish a completed import after its route is superseded", async () => {
    const repository = createRepositoryV1();
    const committed = Promise.withResolvers<void>();
    const releaseResponse = Promise.withResolvers<void>();
    const commit = repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal.bind(
      repository,
    );
    repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal = async (input) => {
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
    await controller.createProcess();
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
    expect(await repository.loadTranslationWorksetHead(processId)).toMatchObject({
      phase: "ready",
    });
    expect(await repository.loadProcess(processId)).toMatchObject({
      activeAttempt: null,
      lastTerminalAttempt: { outcome: "completed" },
    });
  });

  it("plans and commits a large import in actual byte-bounded append pages", async () => {
    const repository = createRepositoryV1();
    const appendInputs: Parameters<TestRepositoryV1["appendTranslationWorksetImport"]>[0][] = [];
    const append = repository.appendTranslationWorksetImport.bind(repository);
    repository.appendTranslationWorksetImport = async (input) => {
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
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: appendMaximumBytes,
      },
    });
    await controller.initialize();
    await controller.createProcess();

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
        page.expectedWorksetRevision === appendInputs[index]!.expectedWorksetRevision + 1
      ),
    ).toBe(true);
  });

  it("reconciles a lost append response only through its exact operation receipt", async () => {
    const repository = createRepositoryV1();
    const appendInputs: Parameters<TestRepositoryV1["appendTranslationWorksetImport"]>[0][] = [];
    const queried: Parameters<TestRepositoryV1["queryTranslationWorksetOperation"]>[0][] = [];
    const append = repository.appendTranslationWorksetImport.bind(repository);
    const query = repository.queryTranslationWorksetOperation.bind(repository);
    repository.appendTranslationWorksetImport = async (input) => {
      appendInputs.push(structuredClone(input));
      await append(input);
      throw createProgramDataRepositoryFailureV1(
        "outcome_unknown",
        "invoke_program_persistence_facet",
      );
    };
    repository.queryTranslationWorksetOperation = async (input) => {
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
    await controller.createProcess();

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

  it("cold-reopens the durable Translation Process work set without acquiring its Workspace", async () => {
    const repository = createRepositoryV1();
    const firstWorkspace = createWorkspacePortV1(repository);
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: firstWorkspace,
      createId: deterministicIdsV1("persisted"),
      now: () => 50,
    });
    await first.initialize();
    await first.createProcess();
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
        workset: { phase: "ready", document: { format: "markdown" } },
      },
    });
    expect(coldWorkspace.createCalls).toEqual([]);
    expect(coldWorkspace.importCalls).toEqual([]);
  });

  it("does not begin a work set when the Process Workspace source write has a known failure", async () => {
    const repository = createRepositoryV1();
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
    await controller.createProcess();
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
      activeProcess: { workset: null },
    });
    expect(await repository.loadTranslationWorksetHead(processId)).toBeNull();
    controller.dispose();

    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
    });
    await cold.initialize();
    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot()).toMatchObject({
      sourceImport: { phase: "idle" },
      activeProcess: { workset: null },
    });
  });

  it("resumes an exact staging import from its durable row frontier and source binding", async () => {
    const repository = createRepositoryV1();
    const append = repository.appendTranslationWorksetImport.bind(repository);
    let appendAttempt = 0;
    repository.appendTranslationWorksetImport = async (input) => {
      appendAttempt += 1;
      if (appendAttempt === 2) {
        throw createProgramDataRepositoryFailureV1(
          "request_failed",
          "invoke_program_persistence_facet",
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
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: 1_100,
      },
    });
    await controller.initialize();
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "resume.srt",
      mediaType: "text/srt",
      bytes: textEncoderV1.encode(subtitleDocumentV1(30)),
    };

    expect(await controller.importSource({ source, sourceLocale: "ja", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "request_failed" });
    const staging = await repository.loadTranslationWorksetHead(processId);
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

    const rows = await repository.loadTranslationWorksetUnitPage({
      processId,
      expectedWorksetRevision: resumed.value.revision,
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
    const append = repository.appendTranslationWorksetImport.bind(repository);
    let failAppend = true;
    repository.appendTranslationWorksetImport = async (input) => {
      if (failAppend) {
        failAppend = false;
        throw createProgramDataRepositoryFailureV1(
          "request_failed",
          "invoke_program_persistence_facet",
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
    await controller.createProcess();
    const processId = controller.getSnapshot().activeProcess!.process.processId;
    const source = {
      kind: "bytes" as const,
      fileName: "binding.txt",
      mediaType: "text/plain",
      bytes: textEncoderV1.encode("Exact binding required.\n"),
    };

    expect(await controller.importSource({ source, sourceLocale: "en", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "request_failed" });
    const staging = await repository.loadTranslationWorksetHead(processId);
    expect(staging).toMatchObject({ phase: "staging", stagedUnitCount: 0 });
    changeBinding = true;
    expect(await controller.importSource({ source, sourceLocale: "en", targetLocale: "zh-Hans" }))
      .toEqual({ kind: "failed", code: "translation_source_binding_mismatch" });
    expect(await repository.loadTranslationWorksetHead(processId)).toEqual(staging);
  });

  it("reopens an existing package-pinned Process without a Creator catalog authority", async () => {
    const repository = createRepositoryV1();
    const first = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
      createId: deterministicIdsV1("retained"),
    });
    await first.initialize();
    await first.createProcess();
    const processId = first.getSnapshot().activeProcess!.process.processId;
    first.dispose();

    const cold = createTranslationProcessControllerV1({
      repository,
      workspace: createWorkspacePortV1(repository),
    });
    await cold.initialize();

    expect(await cold.openProcess(processId)).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot().activeProcess).toMatchObject({
      process: {
        processId,
        subjectProgramId: null,
        programPackage: translationProgramPackageReferenceV1,
      },
      programPackage: { manifest: { name: "Translation" } },
    });
    expect(await cold.createProcess()).toEqual({ kind: "completed", value: true });
    expect(cold.getSnapshot().activeProcess?.process.processId).not.toBe(processId);
  });

  it("rejects an oversized source row before writing either source authority", async () => {
    const repository = createRepositoryV1();
    const workspace = createWorkspacePortV1(repository);
    const controller = createTranslationProcessControllerV1({
      repository,
      workspace,
      createId: deterministicIdsV1("rejected"),
      budgets: {
        transcriptPageMaximumBytes: 128 * 1_024,
        importAppendMaximumBytes: 512,
      },
    });
    await controller.initialize();
    await controller.createProcess();
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
    expect(await repository.loadTranslationWorksetHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });

  it("lazily imports a born-digital PDF text projection without claiming OCR or round-trip", async () => {
    const repository = createRepositoryV1();
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
              lineBreakPolicy: "forbidden",
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
    await controller.createProcess();
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
    const page = await repository.loadTranslationWorksetUnitPage({
      processId: imported.value.processId,
      expectedWorksetRevision: imported.value.revision,
      fromOrder: 0,
      maximumRows: 1,
      maximumBytes: 4_096,
    });
    expect(page).toMatchObject({
      kind: "page",
      page: { rows: [{ source: "Born-digital source text" }] },
    });
  });

  it("reports a born-digital PDF rejection without writing the Workspace or work set", async () => {
    const repository = createRepositoryV1();
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
    await controller.createProcess();
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
    expect(await repository.loadTranslationWorksetHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });

  it("rejects a partially extracted PDF instead of publishing a silently incomplete work set", async () => {
    const repository = createRepositoryV1();
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
              lineBreakPolicy: "forbidden",
              source: "Only the first page was extracted.",
              protectedSegments: [],
            }],
            sourceMap: [],
            pageDiagnostics: [{ pageNumber: 2, reason: "text_extraction_failed" }],
          },
        }),
    });
    await controller.initialize();
    await controller.createProcess();
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
    expect(await repository.loadTranslationWorksetHead(processId)).toBeNull();
    expect(workspace.importCalls).toEqual([]);
  });
});
