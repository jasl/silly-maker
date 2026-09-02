// SPDX-License-Identifier: MIT
/// <reference lib="dom" />
import type { Frame, Locator, Page, Route } from "@playwright/test";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { zipSync } from "fflate";

import { operationalStructuredPayloadMaximumBytesV1 } from "../silly-os/src/program-platform/process/program-process-repository.ts";
import {
  consumeExpectedDurableProgramConsoleErrorsV1,
  expect,
  sillyOsNetworkBrokerTargetV1,
  sillyOsTargetUrlV1,
  sillyOsWorkspaceSandboxTargetV1,
  test,
} from "./fixtures.ts";
import { readZipCentralDirectoryV1 } from "./silly-os-workspace-zip.ts";

const translationIntentV1 =
  "Translate this visual novel and keep every character's voice consistent.";
const deterministicEditProbePrefixV1 = "Exercise the pinned native Pi edit tool with exact text: ";
const deterministicBashProbePrefixV1 = "Exercise the pinned native Pi bash tool with exact text: ";
const deterministicFileOpsProbePrefixV1 =
  "Exercise the pinned native Pi workspace file operations lifecycle: ";
const deterministicFetchUrlProbePrefixV1 =
  "Exercise the product-fixed Pi fetch_url tool for exact URL: ";
const deterministicDownloadProbePrefixV1 =
  "Exercise the product-fixed Pi download tool for exact URL: ";
const deterministicDownloadRelativePathV1 = ".sillyos/n2-download.bin";
const p4aTranscriptWindowQualificationBytesV1 = 384 * 1024;
const externalTranslationProgramIdV1 = "community.translation-review";
const externalTranslationRuntimeProfileV1 = "agent.translation.v1";
const externalTranslationInitialTitleV1 = "External translation intake";

function externalTranslationProgramZipV1(): Buffer {
  const encode = (value: string): Uint8Array => Buffer.from(value, "utf8");
  return Buffer.from(zipSync({
    "program.json": encode(JSON.stringify({
      schemaVersion: 1,
      programId: externalTranslationProgramIdV1,
      packageVersion: "1.0.0",
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: externalTranslationRuntimeProfileV1,
      name: "External Translation Review",
      summary: "An imported package using the fixed Translation runtime.",
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: "settings.defaults.json",
      initialUiPath: "initial-ui.json",
      scripts: [],
      capabilityIds: [
        "agent.text",
        "program.resource.read",
        "translation.batch",
        "workspace.read",
        "workspace.search",
        "workspace.write",
      ],
    })),
    "PROGRAM.md": encode([
      "# External Translation Review",
      "",
      "Follow skills/translate/SKILL.md and prompts/translate.md for every admitted batch.",
    ].join("\n")),
    "skills/translate/SKILL.md": encode([
      "# Translate",
      "",
      "Read prompts/translate.md, translate the complete admitted batch, then call the completion tool once.",
    ].join("\n")),
    "prompts/translate.md": encode([
      "# Translation rules",
      "",
      "Preserve meaning, voice, relationships, placeholders, markup, and locked terminology.",
    ].join("\n")),
    "settings.defaults.json": encode(JSON.stringify({
      targetLocale: "en",
      defaultStyle: "Faithful natural prose with preserved voice and placeholders.",
    })),
    "initial-ui.json": encode(JSON.stringify({
      schemaVersion: 3,
      surface: "translation.workspace.v1",
      defaultLocale: "en",
      locales: {
        en: {
          intakeDocument: {
            schemaVersion: 1,
            documentId: "external-translation.intake",
            revision: 1,
            source: [
              'root = Stack([heading, description], "regular")',
              `heading = Heading("${externalTranslationInitialTitleV1}", 1)`,
              'description = Text("This copy came from the imported Program package.", "muted")',
            ].join("\n"),
          },
          workbenchDocument: {
            schemaVersion: 1,
            documentId: "external-translation.workbench",
            revision: 1,
            source: [
              'root = Stack([heading], "regular")',
              'heading = Heading("External review workbench", 2)',
            ].join("\n"),
          },
          dropLabel: "Drop a source document for this imported Program",
          formatNote: "SillyOS still owns file admission and the runtime container.",
          chooseFileLabel: "Choose source file",
          sourceLanguageLabel: "Source language",
          targetLanguageLabel: "Target language",
        },
      },
    })),
  }));
}

interface P4aTranscriptFixtureReceiptV1 {
  readonly appendedByteLength: number;
  readonly appendedEntryCount: number;
  readonly attemptGeneration: number;
  readonly attemptId: string;
  readonly olderEntryId: string;
  readonly processRevision: number;
  readonly richEntryId: string;
  readonly terminalOperationId: string;
  readonly transcriptFrontier: number;
}

interface P4aProcessLeaseRaceBaseV1 {
  readonly processId: string;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly generation: number;
  readonly observedAt: number;
  readonly startingCheckpoint: {
    readonly checkpointId: string;
    readonly throughSequence: number;
    readonly workspaceId: string;
    readonly workspaceCheckpointId: string;
    readonly workspaceGeneration: number;
  };
}

interface P4aProcessLeaseContenderV1 {
  readonly ownerInstanceId: string;
  readonly attemptId: string;
  readonly operationId: string;
  readonly triggerEntryId: string;
}

interface P4aProcessLeaseRaceResultV1 {
  readonly kind: "committed" | "unchanged" | "conflict";
  readonly contender: P4aProcessLeaseContenderV1;
  readonly processRevision: number | null;
  readonly transcriptFrontier: number | null;
  readonly lease: {
    readonly processId: string;
    readonly ownerInstanceId: string;
    readonly attemptId: string;
    readonly generation: number;
    readonly expiresAt: number;
  } | null;
}

interface P4aProcessExecutionLeaseProjectionV1 {
  readonly processId: string;
  readonly ownerInstanceId: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly expiresAt: number;
}

async function readP4aProcessExecutionLeaseV1(
  page: Page,
  processId: string,
): Promise<P4aProcessExecutionLeaseProjectionV1 | null> {
  return await page.evaluate(async ({ requestedProcessId, repositoryModuleUrl }) => {
    interface RepositoryV1 {
      initialize(): Promise<void>;
      loadProcessExecutionLease(
        processId: string,
      ): Promise<P4aProcessExecutionLeaseProjectionV1 | null>;
      dispose(): Promise<void>;
    }
    interface RepositoryModuleV1 {
      createIndexedDbProgramDataRepositoryV1(options: {
        readonly indexedDB: IDBFactory;
      }): RepositoryV1;
    }
    const module = await import(repositoryModuleUrl) as RepositoryModuleV1;
    const repository = module.createIndexedDbProgramDataRepositoryV1({ indexedDB });
    try {
      await repository.initialize();
      return await repository.loadProcessExecutionLease(requestedProcessId);
    } finally {
      await repository.dispose();
    }
  }, {
    requestedProcessId: processId,
    repositoryModuleUrl: "/src/application/persistence/indexeddb-program-data-repository.ts",
  });
}

async function readP4aProcessLeaseRaceBaseV1(
  page: Page,
  processId: string,
): Promise<P4aProcessLeaseRaceBaseV1> {
  return await page.evaluate(async ({
    creatorFacetModuleUrl,
    creatorRepositoryModuleUrl,
    requestedProcessId,
    repositoryModuleUrl,
  }) => {
    interface ProcessHeadV1 {
      readonly processId: string;
      readonly subjectProgramId: string | null;
      readonly revision: number;
      readonly transcriptFrontier: number;
      readonly lastTerminalAttempt: { readonly generation: number } | null;
      readonly checkpoint: {
        readonly checkpointId: string;
        readonly throughSequence: number;
        readonly workspaceId: string;
        readonly workspaceCheckpointId: string;
        readonly workspaceGeneration: number;
      } | null;
      readonly updatedAt: number;
    }
    interface CoreRepositoryV1 {
      initialize(): Promise<void>;
      loadProcess(processId: string): Promise<ProcessHeadV1 | null>;
      dispose(): Promise<void>;
    }
    interface RepositoryV1 extends CoreRepositoryV1 {
      load(programId: string): Promise<
        {
          readonly head: {
            readonly pendingReviewBinding: {
              readonly workspaceId: string;
              readonly checkpointId: string;
              readonly generation: number;
            } | null;
          };
        } | null
      >;
    }
    interface RepositoryModuleV1 {
      createIndexedDbProgramDataRepositoryV1(options: {
        readonly indexedDB: IDBFactory;
        readonly facets: readonly unknown[];
      }): CoreRepositoryV1;
    }
    interface CreatorRepositoryModuleV1 {
      createCreatorProgramDataRepositoryV1(repository: CoreRepositoryV1): RepositoryV1;
    }
    interface CreatorFacetModuleV1 {
      readonly indexedDbCreatorPersistenceFacetV1: unknown;
    }
    const [module, creatorRepositoryModule, creatorFacetModule] = await Promise.all([
      import(repositoryModuleUrl) as Promise<RepositoryModuleV1>,
      import(creatorRepositoryModuleUrl) as Promise<CreatorRepositoryModuleV1>,
      import(creatorFacetModuleUrl) as Promise<CreatorFacetModuleV1>,
    ]);
    const repository = creatorRepositoryModule.createCreatorProgramDataRepositoryV1(
      module.createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        facets: [creatorFacetModule.indexedDbCreatorPersistenceFacetV1],
      }),
    );
    try {
      await repository.initialize();
      const process = await repository.loadProcess(requestedProcessId);
      if (process === null || process.subjectProgramId === null) {
        throw new Error("P4-A lease race requires one durable subject Program");
      }
      const catalog = await repository.load(process.subjectProgramId);
      const workspaceBinding = catalog?.head.pendingReviewBinding ?? null;
      const checkpoint = process.checkpoint ?? (workspaceBinding === null ? null : {
        checkpointId: workspaceBinding.checkpointId,
        throughSequence: process.transcriptFrontier,
        workspaceId: workspaceBinding.workspaceId,
        workspaceCheckpointId: workspaceBinding.checkpointId,
        workspaceGeneration: workspaceBinding.generation,
      });
      if (checkpoint === null) {
        throw new Error("P4-A lease race requires one durable Workspace checkpoint");
      }
      const triggerSequence = process.transcriptFrontier + 1;
      return {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        generation: (process.lastTerminalAttempt?.generation ?? 0) + 1,
        observedAt: Math.max(Date.now(), process.updatedAt) + 1,
        startingCheckpoint: {
          ...checkpoint,
          checkpointId: "checkpoint.p4a.multitab-acquire",
          throughSequence: triggerSequence,
        },
      };
    } finally {
      await repository.dispose();
    }
  }, {
    creatorFacetModuleUrl: "/programs/creator/persistence/creator-persistence-facet-descriptor.ts",
    creatorRepositoryModuleUrl: "/programs/creator/persistence/creator-program-data-repository.ts",
    requestedProcessId: processId,
    repositoryModuleUrl: "/src/application/persistence/indexeddb-program-data-repository.ts",
  });
}

async function acquireP4aProcessLeaseV1(
  page: Page,
  base: P4aProcessLeaseRaceBaseV1,
  contender: P4aProcessLeaseContenderV1,
  leaseDurationMilliseconds = 60_000,
): Promise<P4aProcessLeaseRaceResultV1> {
  return await page.evaluate(async (evaluationInput) => {
    const {
      base: raceBase,
      contender: raceContender,
      leaseDurationMilliseconds: requestedLeaseDurationMilliseconds,
      repositoryModuleUrl,
    } = evaluationInput;
    interface ProcessHeadV1 {
      readonly revision: number;
      readonly transcriptFrontier: number;
    }
    interface ProcessExecutionLeaseV1 {
      readonly processId: string;
      readonly ownerInstanceId: string;
      readonly attemptId: string;
      readonly generation: number;
      readonly expiresAt: number;
    }
    interface ExecutionAcquireResultV1 {
      readonly kind: "committed" | "unchanged" | "conflict";
      readonly process?: ProcessHeadV1;
      readonly currentProcess?: ProcessHeadV1 | null;
      readonly lease?: ProcessExecutionLeaseV1;
      readonly currentLease?: ProcessExecutionLeaseV1 | null;
    }
    interface RepositoryV1 {
      initialize(): Promise<void>;
      acquireProcessExecution(
        input: Readonly<Record<string, unknown>>,
      ): Promise<ExecutionAcquireResultV1>;
      dispose(): Promise<void>;
    }
    interface RepositoryModuleV1 {
      createIndexedDbProgramDataRepositoryV1(options: {
        readonly indexedDB: IDBFactory;
      }): RepositoryV1;
    }
    const module = await import(repositoryModuleUrl) as RepositoryModuleV1;
    const repository = module.createIndexedDbProgramDataRepositoryV1({ indexedDB });
    try {
      await repository.initialize();
      const triggerSequence = raceBase.expectedTranscriptFrontier + 1;
      const result = await repository.acquireProcessExecution({
        ownerInstanceId: raceContender.ownerInstanceId,
        observedAt: raceBase.observedAt,
        expiresAt: raceBase.observedAt + requestedLeaseDurationMilliseconds,
        attempt: {
          processId: raceBase.processId,
          expectedProcessRevision: raceBase.expectedProcessRevision,
          expectedTranscriptFrontier: raceBase.expectedTranscriptFrontier,
          commitId: raceContender.operationId,
          attemptId: raceContender.attemptId,
          generation: raceBase.generation,
          trigger: {
            kind: "new_entry",
            entry: {
              schemaVersion: 1,
              processId: raceBase.processId,
              sequence: triggerSequence,
              entryId: raceContender.triggerEntryId,
              role: "user",
              state: "committed",
              parts: [{
                kind: "text_markdown",
                partId: `${raceContender.triggerEntryId}.text`,
                markdown: `P4-A multi-tab contender ${raceContender.ownerInstanceId}`,
              }],
            },
          },
          startingCheckpoint: raceBase.startingCheckpoint,
          updatedAt: raceBase.observedAt,
        },
      });
      const process = result.process ?? result.currentProcess ?? null;
      const lease = result.lease ?? result.currentLease ?? null;
      return {
        kind: result.kind,
        contender: raceContender,
        processRevision: process?.revision ?? null,
        transcriptFrontier: process?.transcriptFrontier ?? null,
        lease,
      };
    } finally {
      await repository.dispose();
    }
  }, {
    base,
    contender,
    leaseDurationMilliseconds,
    repositoryModuleUrl: "/src/application/persistence/indexeddb-program-data-repository.ts",
  });
}

async function holdP4aWorkspaceV1(
  page: Page,
  input: {
    readonly processId: string;
    readonly workspaceId: string;
  },
): Promise<string> {
  return await page.evaluate(async ({ authorityModuleUrl, processId, workspaceId }) => {
    interface WorkspaceAuthorityV1 {
      initialize(): Promise<void>;
      openProcessWorkspace(input: {
        readonly processId: string;
        readonly workspaceId: string;
      }): Promise<{
        readonly snapshot: {
          readonly descriptor: { readonly workspaceSessionId: string };
        };
        readonly environmentPort: MessagePort;
      }>;
      detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void>;
      closeWorkspace(workspaceSessionId: string): Promise<unknown>;
      dispose(): Promise<void>;
    }
    interface AuthorityModuleV1 {
      createBrowserProgramWorkspaceAuthorityV1(): WorkspaceAuthorityV1;
    }
    interface WorkspaceHoldV1 {
      readonly authority: WorkspaceAuthorityV1;
      readonly environmentPort: MessagePort;
      readonly workspaceSessionId: string;
    }
    const owner = globalThis as typeof globalThis & {
      sillyOsP4aWorkspaceHoldV1?: WorkspaceHoldV1;
    };
    if (owner.sillyOsP4aWorkspaceHoldV1 !== undefined) {
      throw new Error("P4-A Workspace hold already exists");
    }
    const module = await import(authorityModuleUrl) as AuthorityModuleV1;
    const authority = module.createBrowserProgramWorkspaceAuthorityV1();
    try {
      await authority.initialize();
      const opened = await authority.openProcessWorkspace({ processId, workspaceId });
      owner.sillyOsP4aWorkspaceHoldV1 = {
        authority,
        environmentPort: opened.environmentPort,
        workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      };
      return opened.snapshot.descriptor.workspaceSessionId;
    } catch (error) {
      await authority.dispose().catch(() => undefined);
      throw error;
    }
  }, {
    authorityModuleUrl: "/src/application/workspace/browser-program-workspace-authority.ts",
    ...input,
  });
}

async function releaseP4aWorkspaceHoldV1(page: Page): Promise<void> {
  await page.evaluate(async () => {
    interface WorkspaceAuthorityV1 {
      detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void>;
      closeWorkspace(workspaceSessionId: string): Promise<unknown>;
      dispose(): Promise<void>;
    }
    interface WorkspaceHoldV1 {
      readonly authority: WorkspaceAuthorityV1;
      readonly environmentPort: MessagePort;
      readonly workspaceSessionId: string;
    }
    const owner = globalThis as typeof globalThis & {
      sillyOsP4aWorkspaceHoldV1?: WorkspaceHoldV1;
    };
    const hold = owner.sillyOsP4aWorkspaceHoldV1;
    if (hold === undefined) throw new Error("P4-A Workspace hold is absent");
    delete owner.sillyOsP4aWorkspaceHoldV1;
    try {
      await hold.authority.detachWorkspaceEnvironment(hold.workspaceSessionId);
      hold.environmentPort.close();
      await hold.authority.closeWorkspace(hold.workspaceSessionId);
    } finally {
      await hold.authority.dispose();
    }
  });
}

/**
 * Extends one real Process through the concrete repository implementation used
 * only as an E2E seeder. The product-facing Worker client intentionally exposes
 * composite writes only; this test-only path still exercises the same V9 schema
 * while qualifying a Conversation materially larger than one UI page/window.
 */
async function appendP4aTranscriptFixtureV1(
  page: Page,
  processId: string,
): Promise<P4aTranscriptFixtureReceiptV1> {
  return await page.evaluate(async ({
    creatorFacetModuleUrl,
    creatorRepositoryModuleUrl,
    requestedProcessId,
    repositoryModuleUrl,
  }) => {
    interface ProcessHeadV1 {
      readonly processId: string;
      readonly subjectProgramId: string | null;
      readonly revision: number;
      readonly transcriptFrontier: number;
      readonly checkpoint: {
        readonly checkpointId: string;
        readonly throughSequence: number;
        readonly workspaceId: string;
        readonly workspaceCheckpointId: string;
        readonly workspaceGeneration: number;
      } | null;
      readonly lastTerminalAttempt: {
        readonly generation: number;
      } | null;
      readonly updatedAt: number;
    }
    interface TranscriptEntryV1 {
      readonly schemaVersion: 1;
      readonly processId: string;
      readonly sequence: number;
      readonly entryId: string;
      readonly role: "assistant" | "system" | "tool" | "user";
      readonly state: "committed";
      readonly parts: readonly Readonly<Record<string, unknown>>[];
    }
    interface AppendResultV1 {
      readonly kind: "committed" | "unchanged" | "conflict";
      readonly process?: ProcessHeadV1;
      readonly current?: ProcessHeadV1 | null;
    }
    interface ProcessExecutionLeaseV1 {
      readonly processId: string;
      readonly ownerInstanceId: string;
      readonly attemptId: string;
      readonly generation: number;
      readonly expiresAt: number;
    }
    interface ExecutionAcquireResultV1 {
      readonly kind: "committed" | "unchanged" | "conflict";
      readonly process?: ProcessHeadV1;
      readonly lease?: ProcessExecutionLeaseV1;
    }
    interface ExecutionTerminalResultV1 {
      readonly kind: "committed" | "unchanged" | "conflict";
      readonly process?: ProcessHeadV1;
      readonly operationReceipt?: {
        readonly operationId: string;
        readonly operation: "execution_terminal";
        readonly attemptId: string;
        readonly generation: number;
        readonly processRevision: number;
        readonly transcriptFrontier: number;
        readonly terminalOutcome: "failed";
      };
    }
    interface CoreRepositoryV1 {
      initialize(): Promise<void>;
      loadProcess(processId: string): Promise<ProcessHeadV1 | null>;
      appendProcessTranscript(input: Readonly<Record<string, unknown>>): Promise<AppendResultV1>;
      acquireProcessExecution(
        input: Readonly<Record<string, unknown>>,
      ): Promise<ExecutionAcquireResultV1>;
      commitProcessExecutionTerminal(
        input: Readonly<Record<string, unknown>>,
      ): Promise<ExecutionTerminalResultV1>;
      dispose(): Promise<void>;
    }
    interface RepositoryV1 extends CoreRepositoryV1 {
      load(programId: string): Promise<
        {
          readonly head: {
            readonly pendingReviewBinding: {
              readonly workspaceId: string;
              readonly checkpointId: string;
              readonly generation: number;
            } | null;
          };
        } | null
      >;
    }
    interface RepositoryModuleV1 {
      createIndexedDbProgramDataRepositoryV1(options: {
        readonly indexedDB: IDBFactory;
        readonly facets: readonly unknown[];
      }): CoreRepositoryV1;
    }
    interface CreatorRepositoryModuleV1 {
      createCreatorProgramDataRepositoryV1(repository: CoreRepositoryV1): RepositoryV1;
    }
    interface CreatorFacetModuleV1 {
      readonly indexedDbCreatorPersistenceFacetV1: unknown;
    }
    const [repositoryModule, creatorRepositoryModule, creatorFacetModule] = await Promise.all([
      import(repositoryModuleUrl) as Promise<RepositoryModuleV1>,
      import(creatorRepositoryModuleUrl) as Promise<CreatorRepositoryModuleV1>,
      import(creatorFacetModuleUrl) as Promise<CreatorFacetModuleV1>,
    ]);
    const repository = creatorRepositoryModule.createCreatorProgramDataRepositoryV1(
      repositoryModule.createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        facets: [creatorFacetModule.indexedDbCreatorPersistenceFacetV1],
      }),
    );
    const encoder = new TextEncoder();
    const attemptId = "attempt.p4a.rich-terminal";
    const olderEntryId = "entry.p4a.older";
    const richEntryId = "entry.p4a.rich";
    const terminalOperationId = "commit.p4a.rich-terminal";
    try {
      await repository.initialize();
      let process = await repository.loadProcess(requestedProcessId);
      if (process === null) throw new Error("P4-A Process is unavailable");
      const entries: TranscriptEntryV1[] = [];
      let sequence = process.transcriptFrontier + 1;
      entries.push({
        schemaVersion: 1,
        processId: requestedProcessId,
        sequence,
        entryId: olderEntryId,
        role: "system",
        state: "committed",
        parts: [{
          kind: "text_markdown",
          partId: "part.p4a.older",
          markdown: "P4-A durable earlier-page sentinel",
        }],
      });
      sequence += 1;

      // Collapsed tool results keep the rendered DOM representative and small
      // while the transcript still carries realistic rich payload pressure.
      for (let index = 0; index < 22; index += 1) {
        const ordinal = index + 1;
        const toolCallId = `tool.p4a.${String(ordinal)}`;
        entries.push({
          schemaVersion: 1,
          processId: requestedProcessId,
          sequence,
          entryId: `entry.p4a.tool.${String(ordinal)}`,
          role: "tool",
          state: "committed",
          parts: [{
            kind: "tool_status",
            partId: `part.p4a.status.${String(ordinal)}`,
            toolCallId,
            status: "succeeded",
            message: `Finished qualification tool step ${String(ordinal)}.`,
          }, {
            kind: "tool_result",
            partId: `part.p4a.result.${String(ordinal)}`,
            toolCallId,
            outcome: "succeeded",
            resultJson: JSON.stringify({
              ordinal,
              excerpt: "qualification-result ".repeat(1_100),
            }),
            summaryMarkdown: `Qualification tool result ${String(ordinal)}`,
          }],
        });
        sequence += 1;
      }

      const richEntryParts: readonly Readonly<Record<string, unknown>>[] = [{
        kind: "text_markdown",
        partId: "part.p4a.rich.text",
        markdown: "P4-A rich transcript sentinel",
      }, {
        kind: "reasoning_summary",
        partId: "part.p4a.rich.reasoning",
        summaryMarkdown: "Compared the requested terminology with the durable project context.",
      }, {
        kind: "tool_call",
        partId: "part.p4a.rich.call",
        toolCallId: "tool.p4a.rich",
        toolName: "inspect_glossary",
        argumentsJson: JSON.stringify({ path: "glossary.json" }),
      }, {
        kind: "tool_status",
        partId: "part.p4a.rich.status",
        toolCallId: "tool.p4a.rich",
        status: "succeeded",
        message: "Glossary inspected.",
      }, {
        kind: "tool_result",
        partId: "part.p4a.rich.result",
        toolCallId: "tool.p4a.rich",
        outcome: "succeeded",
        resultJson: JSON.stringify({ terms: 12, conflicts: 0 }),
        summaryMarkdown: "The glossary is internally consistent.",
      }, {
        kind: "artifact_reference",
        partId: "part.p4a.rich.artifact",
        artifactId: "artifact.p4a.glossary",
        label: "Reviewed glossary",
        mediaType: "application/json",
        reference: "workspace://artifacts/glossary.json",
      }];

      let appendedByteLength = 0;
      for (let offset = 0; offset < entries.length; offset += 8) {
        const batch = entries.slice(offset, offset + 8);
        appendedByteLength += batch.reduce(
          (total, entry) => total + encoder.encode(JSON.stringify(entry)).byteLength,
          0,
        );
        const result = await repository.appendProcessTranscript({
          processId: requestedProcessId,
          expectedProcessRevision: process.revision,
          expectedTranscriptFrontier: process.transcriptFrontier,
          commitId: `commit.p4a.${String(offset)}`,
          attemptBinding: null,
          entries: batch,
          checkpoint: null,
          terminalAttemptReceipt: null,
          updatedAt: Math.max(Date.now(), process.updatedAt) + offset + 1,
        });
        if (result.kind === "conflict") {
          throw new Error("P4-A transcript append conflicted");
        }
        if (result.process === undefined) {
          throw new Error("P4-A transcript append omitted its Process head");
        }
        process = result.process;
      }
      const subjectProgramId = process.subjectProgramId;
      if (subjectProgramId === null) throw new Error("P4-A Process omitted its subject Program");
      const catalog = await repository.load(subjectProgramId);
      const workspaceBinding = catalog?.head.pendingReviewBinding ?? null;
      if (workspaceBinding === null) {
        throw new Error("P4-A subject Program omitted its durable Workspace binding");
      }
      const startingCheckpoint = {
        checkpointId: "checkpoint.p4a.predecessor",
        throughSequence: process.transcriptFrontier,
        workspaceId: workspaceBinding.workspaceId,
        workspaceCheckpointId: workspaceBinding.checkpointId,
        workspaceGeneration: workspaceBinding.generation,
      };
      const generation = (process.lastTerminalAttempt?.generation ?? 0) + 1;
      const triggerSequence = process.transcriptFrontier + 1;
      const triggerEntry: TranscriptEntryV1 = {
        schemaVersion: 1,
        processId: requestedProcessId,
        sequence: triggerSequence,
        entryId: "entry.p4a.trigger",
        role: "user",
        state: "committed",
        parts: [{
          kind: "text_markdown",
          partId: "part.p4a.trigger",
          markdown: "Qualify the durable rich Conversation terminal.",
        }],
      };
      const observedAt = Math.max(Date.now(), process.updatedAt) + 1;
      const acquired = await repository.acquireProcessExecution({
        ownerInstanceId: "owner.p4a.fixture",
        observedAt,
        expiresAt: observedAt + 60_000,
        attempt: {
          processId: requestedProcessId,
          expectedProcessRevision: process.revision,
          expectedTranscriptFrontier: process.transcriptFrontier,
          commitId: "commit.p4a.rich-acquire",
          attemptId,
          generation,
          trigger: { kind: "new_entry", entry: triggerEntry },
          startingCheckpoint: {
            ...startingCheckpoint,
            checkpointId: "checkpoint.p4a.rich-acquire",
            throughSequence: triggerSequence,
          },
          updatedAt: observedAt,
        },
      });
      if (
        acquired.kind === "conflict" || acquired.process === undefined ||
        acquired.lease === undefined
      ) {
        throw new Error("P4-A execution acquire conflicted");
      }
      process = acquired.process;
      const terminalSequence = process.transcriptFrontier + 1;
      const terminalEntry: TranscriptEntryV1 = {
        schemaVersion: 1,
        processId: requestedProcessId,
        sequence: terminalSequence,
        entryId: richEntryId,
        role: "assistant",
        state: "committed",
        parts: richEntryParts,
      };
      const terminalInput = {
        lease: acquired.lease,
        observedAt: observedAt + 1,
        transcript: {
          processId: requestedProcessId,
          expectedProcessRevision: process.revision,
          expectedTranscriptFrontier: process.transcriptFrontier,
          commitId: terminalOperationId,
          attemptBinding: { attemptId, generation },
          entries: [terminalEntry],
          checkpoint: null,
          terminalAttemptReceipt: {
            schemaVersion: 1,
            processId: requestedProcessId,
            attemptId,
            generation,
            outcome: "failed",
            terminalSequence,
            terminalEntryId: richEntryId,
            interruptionDisposition: null,
          },
          updatedAt: observedAt + 1,
        },
      };
      const terminal = await repository.commitProcessExecutionTerminal(terminalInput);
      if (
        terminal.kind === "conflict" || terminal.process === undefined ||
        terminal.operationReceipt === undefined
      ) {
        throw new Error("P4-A execution terminal conflicted");
      }
      process = terminal.process;
      const receipt = terminal.operationReceipt;
      if (
        receipt.operationId !== terminalOperationId ||
        receipt.operation !== "execution_terminal" ||
        receipt.attemptId !== attemptId || receipt.generation !== generation ||
        receipt.terminalOutcome !== "failed" ||
        receipt.processRevision !== process.revision ||
        receipt.transcriptFrontier !== process.transcriptFrontier
      ) {
        throw new Error("P4-A execution terminal receipt does not match the Process frontier");
      }
      appendedByteLength += encoder.encode(JSON.stringify(triggerEntry)).byteLength +
        encoder.encode(JSON.stringify(terminalEntry)).byteLength;
      return {
        appendedByteLength,
        appendedEntryCount: entries.length + 2,
        attemptGeneration: generation,
        attemptId,
        olderEntryId,
        processRevision: process.revision,
        richEntryId,
        terminalOperationId,
        transcriptFrontier: process.transcriptFrontier,
      };
    } finally {
      await repository.dispose();
    }
  }, {
    creatorFacetModuleUrl: "/programs/creator/persistence/creator-persistence-facet-descriptor.ts",
    creatorRepositoryModuleUrl: "/programs/creator/persistence/creator-program-data-repository.ts",
    requestedProcessId: processId,
    repositoryModuleUrl: "/src/application/persistence/indexeddb-program-data-repository.ts",
  });
}

async function expectCreatorStorageReadyV1(page: Page): Promise<void> {
  await expect(page.locator('[data-program-storage-state="ready"]')).toBeVisible();
}

async function expectProgramLibraryV1(page: Page): Promise<Locator> {
  const library = page.locator('[data-silly-os-view="program-library"]');
  await expect(library).toBeVisible();
  await expect(library.getByRole("heading", { name: "Programs", level: 2 })).toBeVisible();
  return library;
}

async function launchProgramFromLibraryV1(page: Page, name: string): Promise<void> {
  const library = await expectProgramLibraryV1(page);
  const row = library.locator(".program-library__package").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Open", exact: true }).click();
}

async function launchCreatorFromLibraryV1(page: Page): Promise<void> {
  await launchProgramFromLibraryV1(page, "Program Creator");
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(
    page.getByRole("heading", { name: "What would you like to make?", level: 1 }),
  ).toBeVisible();
}

async function returnToProgramLibraryV1(page: Page): Promise<Locator> {
  const directReturn = page.getByRole("button", { name: "Program library", exact: true });
  if (await directReturn.isVisible()) {
    await directReturn.click();
  } else {
    await page.getByRole("button", { name: "SillyOS menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Program library", exact: true }).click();
  }
  return await expectProgramLibraryV1(page);
}

async function returnToCreatorHomeV1(page: Page): Promise<void> {
  await returnToProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
}

async function openCreatorHomeV1(page: Page): Promise<void> {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(page);
  await expect.poll(() => page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);
  await launchCreatorFromLibraryV1(page);
}

async function openTranslationWorkspaceV1(page: Page): Promise<Locator> {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "silly-os-e2e-key");
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", /^(dual|single)-pane$/);
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Translation Workshop", { exact: true }).first()).toBeVisible();
  return workspace;
}

async function readProgramIdV1(workspace: Locator): Promise<string> {
  const programId = await workspace.getAttribute("data-program-id");
  if (programId === null) throw new Error("SillyOS workspace has no Program identity");
  return programId;
}

async function readWorkspaceSessionIdV1(workspace: Locator): Promise<string> {
  const workspaceSessionId = await workspace.getAttribute("data-execution-workspace-session");
  if (workspaceSessionId === null) {
    throw new Error("SillyOS workspace has no execution session identity");
  }
  return workspaceSessionId;
}

interface ProgramWorkspaceSnapshotReceiptV1 {
  readonly revision: 1;
  readonly snapshotId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly baseRepositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
  readonly fileCount: number;
  readonly archiveBytes: number;
}

type ProgramCatalogDecisionProjectionV1 =
  | {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly status: "accepted";
    readonly repositoryRevision: number;
    readonly snapshot: ProgramWorkspaceSnapshotReceiptV1;
  }
  | {
    readonly proposalId: string;
    readonly programRevision: number;
    readonly status: "rejected";
    readonly repositoryRevision: number;
  };

interface ProgramCatalogReviewBindingProjectionV1 {
  readonly proposalId: string;
  readonly programId: string;
  readonly programRevision: number;
  readonly baseAcceptedProgramRevision: number | null;
  readonly repositoryRevision: number;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly checkpointId: string;
  readonly generation: number;
}

interface ProgramCatalogRecordProjectionV1 {
  readonly head: {
    readonly schemaVersion: 1;
    readonly programId: string;
    readonly repositoryRevision: number;
    readonly currentProgramRevision: number;
    readonly pendingReviewBinding: ProgramCatalogReviewBindingProjectionV1 | null;
  };
  readonly latestDecision: ProgramCatalogDecisionProjectionV1 | null;
}

interface ProgramWorkspaceContinuationProjectionV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly programRevision: number;
  readonly repositoryRevision: number;
}

interface ProcessHeadProjectionV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly revision: number;
  readonly status: "active" | "interrupted_retryable" | "interrupted_unrecoverable";
  readonly transcriptFrontier: number;
  readonly activeAttempt: Readonly<Record<string, unknown>> | null;
  readonly lastTerminalAttempt: {
    readonly attemptId: string;
    readonly generation: number;
    readonly outcome: "completed" | "failed" | "cancelled" | "replaced" | "interrupted";
    readonly triggerEntryId: string;
    readonly triggerSequence: number;
    readonly interruptionDisposition: "retryable" | "unrecoverable" | null;
  } | null;
}

interface TranscriptEntryProjectionV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly sequence: number;
  readonly entryId: string;
  readonly role: "assistant" | "system" | "tool" | "user";
  readonly state: "committed" | "interrupted_partial";
  readonly parts: readonly Readonly<Record<string, unknown>>[];
}

interface ProcessNetworkAccessProjectionV1 {
  readonly revision: 1;
  readonly processId: string;
  readonly enabled: boolean;
}

interface ProgramDataProjectionV1 {
  readonly catalog: ProgramCatalogRecordProjectionV1 | null;
  readonly continuation: ProgramWorkspaceContinuationProjectionV1 | null;
  readonly process: ProcessHeadProjectionV1 | null;
  readonly transcriptEntries: readonly TranscriptEntryProjectionV1[];
  readonly networkAccess: ProcessNetworkAccessProjectionV1 | null;
}

const workspaceExportManifestNameV1 = "sillyos-workspace.json";

async function initializePiTestV1(page: Page, key: string): Promise<void> {
  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(key);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();
}

async function expectSillyOsCheckboxRecipeV1(control: Locator): Promise<void> {
  await expect(control).toHaveClass(/\bsos-checkbox\b/u);
  const recipe = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      inlineSize: style.inlineSize,
      blockSize: style.blockSize,
      margin: style.margin,
      accentColor: style.accentColor,
      width: bounds.width,
      height: bounds.height,
    };
  });

  expect(recipe).toMatchObject({
    inlineSize: "16px",
    blockSize: "16px",
    margin: "0px",
    width: 16,
    height: 16,
  });
  expect(recipe.accentColor).not.toBe("");
  expect(recipe.accentColor).not.toBe("auto");
}

async function readProgramDataProjectionV1(
  page: Page,
  programId: string,
  processId: string | null = null,
): Promise<ProgramDataProjectionV1> {
  return await page.evaluate(async ({
    creatorRepositoryModuleUrl,
    operationalMaximumBytes,
    requestedProcessId,
    requestedProgramId,
    repositoryModuleUrl,
  }) => {
    interface CoreRepositoryV1 {
      initialize(): Promise<void>;
      loadProcess(processId: string): Promise<ProcessHeadProjectionV1 | null>;
      loadProcessWorkspaceBinding(processId: string): Promise<
        {
          readonly revision: 1;
          readonly processId: string;
          readonly workspaceId: string;
          readonly volumeId: string;
          readonly workspaceFormat: 1;
        } | null
      >;
      loadTranscriptPage(input: {
        readonly processId: string;
        readonly beforeSequence: number | null;
        readonly maximumBytes: number;
      }): Promise<
        {
          readonly entries: readonly TranscriptEntryProjectionV1[];
          readonly nextBeforeSequence: number | null;
        } | null
      >;
      loadProcessNetworkAccess(
        processId: string,
      ): Promise<ProcessNetworkAccessProjectionV1 | null>;
      dispose(): Promise<void>;
    }
    interface RepositoryV1 extends CoreRepositoryV1 {
      load(programId: string): Promise<ProgramCatalogRecordProjectionV1 | null>;
    }
    interface RepositoryModuleV1 {
      createBrowserProgramDataRepositoryV1(): CoreRepositoryV1;
    }
    interface CreatorRepositoryModuleV1 {
      createCreatorProgramDataRepositoryV1(repository: CoreRepositoryV1): RepositoryV1;
    }
    const [module, creatorRepositoryModule] = await Promise.all([
      import(repositoryModuleUrl) as Promise<RepositoryModuleV1>,
      import(creatorRepositoryModuleUrl) as Promise<CreatorRepositoryModuleV1>,
    ]);
    const repository = creatorRepositoryModule.createCreatorProgramDataRepositoryV1(
      module.createBrowserProgramDataRepositoryV1(),
    );
    try {
      await repository.initialize();
      const [catalog, process, workspaceBinding, networkAccess] = await Promise.all([
        repository.load(requestedProgramId),
        requestedProcessId === null ? null : repository.loadProcess(requestedProcessId),
        requestedProcessId === null
          ? null
          : repository.loadProcessWorkspaceBinding(requestedProcessId),
        requestedProcessId === null
          ? null
          : repository.loadProcessNetworkAccess(requestedProcessId),
      ]);
      const continuation = catalog === null || workspaceBinding === null ? null : {
        revision: 1 as const,
        programId: requestedProgramId,
        workspaceId: workspaceBinding.workspaceId,
        volumeId: workspaceBinding.volumeId,
        workspaceFormat: workspaceBinding.workspaceFormat,
        programRevision: catalog.head.currentProgramRevision,
        repositoryRevision: catalog.head.repositoryRevision,
      };
      const transcriptEntries: TranscriptEntryProjectionV1[] = [];
      let beforeSequence: number | null = null;
      if (requestedProcessId !== null) {
        do {
          const transcriptPage = await repository.loadTranscriptPage({
            processId: requestedProcessId,
            beforeSequence,
            maximumBytes: operationalMaximumBytes,
          });
          if (transcriptPage === null) break;
          transcriptEntries.unshift(...transcriptPage.entries);
          beforeSequence = transcriptPage.nextBeforeSequence;
        } while (beforeSequence !== null);
      }
      return { catalog, continuation, process, transcriptEntries, networkAccess };
    } finally {
      await repository.dispose();
    }
  }, {
    creatorRepositoryModuleUrl: "/programs/creator/persistence/creator-program-data-repository.ts",
    operationalMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
    repositoryModuleUrl: "/src/application/persistence/browser-program-data-repository.ts",
    requestedProcessId: processId,
    requestedProgramId: programId,
  });
}

async function readWorkspaceContinuationV1(
  page: Page,
  programId: string,
): Promise<ProgramWorkspaceContinuationProjectionV1 | null> {
  return await page.evaluate(async ({
    creatorRepositoryModuleUrl,
    operationalMaximumBytes,
    requestedProgramId,
    repositoryModuleUrl,
  }) => {
    interface CoreRepositoryV1 {
      initialize(): Promise<void>;
      listProcessSummaries(input: {
        readonly subjectProgramId: string | null;
        readonly before: null;
        readonly maximumBytes: number;
      }): Promise<{
        readonly summaries: readonly { readonly processId: string }[];
      }>;
      loadProcessWorkspaceBinding(processId: string): Promise<
        {
          readonly workspaceId: string;
          readonly volumeId: string;
          readonly workspaceFormat: 1;
        } | null
      >;
      dispose(): Promise<void>;
    }
    interface RepositoryV1 extends CoreRepositoryV1 {
      load(programId: string): Promise<ProgramCatalogRecordProjectionV1 | null>;
    }
    interface RepositoryModuleV1 {
      createBrowserProgramDataRepositoryV1(): CoreRepositoryV1;
    }
    interface CreatorRepositoryModuleV1 {
      createCreatorProgramDataRepositoryV1(repository: CoreRepositoryV1): RepositoryV1;
    }
    const [module, creatorRepositoryModule] = await Promise.all([
      import(repositoryModuleUrl) as Promise<RepositoryModuleV1>,
      import(creatorRepositoryModuleUrl) as Promise<CreatorRepositoryModuleV1>,
    ]);
    const repository = creatorRepositoryModule.createCreatorProgramDataRepositoryV1(
      module.createBrowserProgramDataRepositoryV1(),
    );
    try {
      await repository.initialize();
      const [catalog, processes] = await Promise.all([
        repository.load(requestedProgramId),
        repository.listProcessSummaries({
          subjectProgramId: requestedProgramId,
          before: null,
          maximumBytes: operationalMaximumBytes,
        }),
      ]);
      const processId = processes.summaries[0]?.processId;
      if (catalog === null || processId === undefined) return null;
      const binding = await repository.loadProcessWorkspaceBinding(processId);
      if (binding === null) return null;
      return {
        revision: 1 as const,
        programId: requestedProgramId,
        workspaceId: binding.workspaceId,
        volumeId: binding.volumeId,
        workspaceFormat: binding.workspaceFormat,
        programRevision: catalog.head.currentProgramRevision,
        repositoryRevision: catalog.head.repositoryRevision,
      };
    } finally {
      await repository.dispose();
    }
  }, {
    creatorRepositoryModuleUrl: "/programs/creator/persistence/creator-program-data-repository.ts",
    operationalMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
    repositoryModuleUrl: "/src/application/persistence/browser-program-data-repository.ts",
    requestedProgramId: programId,
  });
}

const ordinaryWorkspaceRoundTripPathV1 = ".sillyos/p3a-round-trip.txt";
const ordinaryWorkspaceBashRoundTripPathV1 = ".sillyos/p3a-bash-round-trip.txt";

function workspaceSandboxDevelopmentOriginV1(): string {
  return `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
    String(sillyOsWorkspaceSandboxTargetV1.port)
  }`;
}

async function currentOrdinaryWorkspaceSandboxFrameV1(page: Page): Promise<Frame> {
  const expectedOrigin = workspaceSandboxDevelopmentOriginV1();
  await expect.poll(() =>
    page.frames().filter((frame) => {
      const frameUrl = frame.url();
      if (!URL.canParse(frameUrl)) return false;
      const url = new URL(frameUrl);
      return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
    }).length
  ).toBe(1);
  const frame = page.frames().find((candidate) => {
    const frameUrl = candidate.url();
    if (!URL.canParse(frameUrl)) return false;
    const url = new URL(frameUrl);
    return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
  });
  if (frame === undefined) throw new Error("Ordinary Workspace Sandbox frame is unavailable");
  return frame;
}

async function controlOriginHasWorkspaceVolumeV1(page: Page, volumeId: string): Promise<boolean> {
  return await page.evaluate(async (requestedVolumeId) => {
    try {
      let directory = await navigator.storage.getDirectory();
      for (const name of [".sillyos-workspace-host-v1", "volumes", requestedVolumeId]) {
        directory = await directory.getDirectoryHandle(name);
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return false;
      throw error;
    }
  }, volumeId);
}

async function readSandboxWorkspaceTextV1(
  frame: Frame,
  volumeId: string,
  relativePath: string,
): Promise<string> {
  return await frame.evaluate(async ({ requestedVolumeId, requestedRelativePath }) => {
    const path = requestedRelativePath.split("/");
    const fileName = path.pop();
    if (fileName === undefined || fileName.length === 0 || path.some((part) => part.length === 0)) {
      throw new Error("Invalid E2E workspace path");
    }
    let directory = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        requestedVolumeId,
        "workspace",
        ...path,
      ]
    ) {
      directory = await directory.getDirectoryHandle(name);
    }
    return await (await (await directory.getFileHandle(fileName)).getFile()).text();
  }, { requestedVolumeId: volumeId, requestedRelativePath: relativePath });
}

interface SandboxWorkspaceEntryInspectionV1 {
  readonly kind: "missing" | "file" | "directory";
  readonly size: number;
  readonly text: string | null;
}

async function inspectSandboxWorkspaceEntriesV1(
  page: Page,
  continuation: ProgramWorkspaceContinuationProjectionV1,
  relativePaths: readonly string[],
): Promise<Readonly<Record<string, SandboxWorkspaceEntryInspectionV1>>> {
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  return await frame.evaluate(async ({ volumeId, paths }) => {
    let workspace = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        volumeId,
        "workspace",
      ]
    ) {
      workspace = await workspace.getDirectoryHandle(name);
    }
    const absentV1 = (error: unknown): boolean =>
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError");
    const inspected: Record<string, SandboxWorkspaceEntryInspectionV1> = {};
    for (const path of paths) {
      const parts = path.split("/");
      const name = parts.pop();
      if (
        name === undefined || name.length === 0 ||
        parts.some((part) => part.length === 0 || part === "." || part === "..")
      ) throw new Error("Invalid E2E workspace inspection path");
      let parent = workspace;
      let missingParent = false;
      for (const part of parts) {
        try {
          parent = await parent.getDirectoryHandle(part);
        } catch (error) {
          if (!absentV1(error)) throw error;
          missingParent = true;
          break;
        }
      }
      if (missingParent) {
        inspected[path] = { kind: "missing", size: 0, text: null };
        continue;
      }
      try {
        const file = await (await parent.getFileHandle(name)).getFile();
        inspected[path] = { kind: "file", size: file.size, text: await file.text() };
        continue;
      } catch (error) {
        if (!absentV1(error)) throw error;
      }
      try {
        await parent.getDirectoryHandle(name);
        inspected[path] = { kind: "directory", size: 0, text: null };
      } catch (error) {
        if (!absentV1(error)) throw error;
        inspected[path] = { kind: "missing", size: 0, text: null };
      }
    }
    return inspected;
  }, { volumeId: continuation.volumeId, paths: [...relativePaths] });
}

async function inspectSandboxWorkspaceFileDigestV1(
  page: Page,
  continuation: ProgramWorkspaceContinuationProjectionV1,
  relativePath: string,
): Promise<{ readonly size: number; readonly sha256: string }> {
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  return await frame.evaluate(async ({ volumeId, path }) => {
    const parts = path.split("/");
    const fileName = parts.pop();
    if (
      fileName === undefined || fileName.length === 0 ||
      parts.some((part) => part.length === 0 || part === "." || part === "..")
    ) throw new Error("Invalid E2E workspace digest path");
    let directory = await navigator.storage.getDirectory();
    for (
      const name of [
        ".sillyos-workspace-host-v1",
        "volumes",
        volumeId,
        "workspace",
        ...parts,
      ]
    ) {
      directory = await directory.getDirectoryHandle(name);
    }
    const file = await (await directory.getFileHandle(fileName)).getFile();
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    );
    return {
      size: file.size,
      sha256: [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
  }, { volumeId: continuation.volumeId, path: relativePath });
}

async function expectOrdinaryWorkspaceSandboxV1(
  page: Page,
  continuation: ProgramWorkspaceContinuationProjectionV1,
  expectedText: string,
  relativePath = ordinaryWorkspaceRoundTripPathV1,
): Promise<void> {
  const expectedSandboxOrigin = workspaceSandboxDevelopmentOriginV1();
  expect(await page.evaluate(() => location.origin)).toBe("http://127.0.0.1:41739");
  const iframe = page.locator("iframe[data-silly-os-workspace-sandbox='active']");
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute("src", new RegExp(`^${expectedSandboxOrigin}/`));
  await expect(iframe).toHaveAttribute("sandbox", /allow-downloads/u);
  const frame = await currentOrdinaryWorkspaceSandboxFrameV1(page);
  expect(new URL(frame.url()).origin).toBe(expectedSandboxOrigin);
  expect(
    page.workers().some((worker) =>
      /(?:^|\/)browser-workspace-host\.worker(?:\.[cm]?[jt]s)?(?:\?|$)/u.test(worker.url())
    ),
  ).toBe(false);
  expect(await controlOriginHasWorkspaceVolumeV1(page, continuation.volumeId)).toBe(false);
  expect(
    await readSandboxWorkspaceTextV1(
      frame,
      continuation.volumeId,
      relativePath,
    ),
  ).toBe(expectedText);
}

function assertOrdinaryWorkspaceArchiveV1(
  archiveBytes: Uint8Array,
  expected: {
    readonly programId: string;
    readonly workspaceId: string;
    readonly generation: number;
    readonly text: string;
  },
): void {
  const fileName = `workspace/${ordinaryWorkspaceRoundTripPathV1}`;
  const entries = readZipCentralDirectoryV1(archiveBytes);
  expect(entries.map((entry) => entry.name)).toEqual([workspaceExportManifestNameV1, fileName]);
  expect(entries.every((entry) => entry.compressionMethod === 0)).toBe(true);
  const extracted = new Map(entries.map((entry) => [entry.name, entry.bytes]));
  const manifestBytes = extracted.get(workspaceExportManifestNameV1);
  const workspaceBytes = extracted.get(fileName);
  if (manifestBytes === undefined || workspaceBytes === undefined) {
    throw new Error("Ordinary Workspace ZIP omitted its manifest or Pi-written file");
  }
  const manifest = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes),
  ) as Readonly<Record<string, unknown>>;
  expect(manifest).toMatchObject({
    revision: 1,
    kind: "sillyos-workspace",
    exportFormat: 1,
    workspaceFormat: 1,
    programId: expected.programId,
    workspaceId: expected.workspaceId,
    generation: expected.generation,
  });
  expect(new TextDecoder("utf-8", { fatal: true }).decode(workspaceBytes)).toBe(expected.text);
}

async function readProgramCatalogSummariesV1(
  page: Page,
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  return await page.evaluate(async ({
    creatorRepositoryModuleUrl,
    maximumBytes,
    repositoryModuleUrl,
  }) => {
    interface CoreRepositoryV1 {
      initialize(): Promise<void>;
      dispose(): Promise<void>;
    }
    interface RepositoryV1 extends CoreRepositoryV1 {
      listPrograms(input: {
        readonly before: null;
        readonly maximumBytes: number;
      }): Promise<{ readonly summaries: readonly Readonly<Record<string, unknown>>[] }>;
    }
    interface RepositoryModuleV1 {
      createBrowserProgramDataRepositoryV1(): CoreRepositoryV1;
    }
    interface CreatorRepositoryModuleV1 {
      createCreatorProgramDataRepositoryV1(repository: CoreRepositoryV1): RepositoryV1;
    }
    const [module, creatorRepositoryModule] = await Promise.all([
      import(repositoryModuleUrl) as Promise<RepositoryModuleV1>,
      import(creatorRepositoryModuleUrl) as Promise<CreatorRepositoryModuleV1>,
    ]);
    const repository = creatorRepositoryModule.createCreatorProgramDataRepositoryV1(
      module.createBrowserProgramDataRepositoryV1(),
    );
    try {
      await repository.initialize();
      return (await repository.listPrograms({ before: null, maximumBytes }))
        .summaries;
    } finally {
      await repository.dispose();
    }
  }, {
    creatorRepositoryModuleUrl: "/programs/creator/persistence/creator-program-data-repository.ts",
    maximumBytes: operationalStructuredPayloadMaximumBytesV1,
    repositoryModuleUrl: "/src/application/persistence/browser-program-data-repository.ts",
  });
}

function creatorProgramCardV1(page: Page, name: string): Locator {
  return page.locator(".creator-home__program").filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function openRecentTranslationProgramV1(
  page: Page,
  expected: {
    readonly programId: string;
    readonly revision: number;
    readonly status: "Program accepted" | "Preview" | "Proposal rejected";
  },
): Promise<Locator> {
  const recentProgram = creatorProgramCardV1(page, "Translation Workshop");
  const editProgram = recentProgram.getByRole("button", {
    name: "Edit program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toBeVisible();
  await expect(recentProgram).toHaveAttribute("data-program-id", expected.programId);
  await expect(recentProgram).toContainText(
    `v${String(expected.revision)} · ${expected.status}`,
  );
  await editProgram.click();

  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-program-id", expected.programId);
  await expect(workspace).toHaveAttribute("data-program-revision", String(expected.revision));
  return workspace;
}

async function expectNoPageOverflowV1(page: Page): Promise<void> {
  const overflow = await page.evaluate<{ body: number; document: number }>(
    `({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })`,
  );
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

async function expectInsideVisualViewportV1(page: Page, locator: Locator): Promise<void> {
  const [boxV1, viewportV1] = await Promise.all([
    locator.boundingBox(),
    page.evaluate(() => ({ height: innerHeight, width: innerWidth })),
  ]);
  expect(boxV1).not.toBeNull();
  expect(boxV1?.x ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(-1);
  expect(boxV1?.y ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(-1);
  expect((boxV1?.x ?? 0) + (boxV1?.width ?? 0)).toBeLessThanOrEqual(viewportV1.width + 1);
  expect((boxV1?.y ?? 0) + (boxV1?.height ?? 0)).toBeLessThanOrEqual(viewportV1.height + 1);
}

async function settleVisualFixtureV1(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.scrollTo({ left: 0, top: 0 });
    await document.fonts.ready;
    await new Promise<void>((resolveV1) => requestAnimationFrame(() => resolveV1()));
    await new Promise<void>((resolveV1) => requestAnimationFrame(() => resolveV1()));
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

async function expectVisualSnapshotV1(page: Page, nameV1: string): Promise<void> {
  const screenshotV1 = await page.screenshot({
    animations: "allow",
    caret: "initial",
    scale: "css",
  });
  expect(screenshotV1).toMatchSnapshot(nameV1);
}

const openAIResponsesProbeUrlV1 = "https://api.openai.com/v1/responses";
const browserProviderSettingsStorageKeyV3 = "sillymaker.example-silly-os.provider-settings.v3";
const browserProductPreferencesStorageKeyV1 = "sillymaker.example-silly-os.product-preferences.v1";
const webkitScreenshotStyleCspErrorV1 =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";
const webkitScreenshotDefaultStyleCspErrorV1 =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' appears in neither the style-src directive nor the default-src directive of the Content Security Policy.";

interface OpenAIResponsesProbeRequestV1 {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

function successfulOpenAIResponsesProbeSseV1(): string {
  const completedMessage = {
    id: "msg_sillyos_provider_probe",
    type: "message",
    status: "completed",
    role: "assistant",
    content: [{ type: "output_text", text: "OK", annotations: [], logprobs: [] }],
  };
  const events = [
    {
      type: "response.created",
      sequence_number: 0,
      response: { id: "resp_sillyos_provider_probe", status: "in_progress" },
    },
    {
      type: "response.output_item.added",
      sequence_number: 1,
      output_index: 0,
      item: { ...completedMessage, status: "in_progress", content: [] },
    },
    {
      type: "response.output_text.delta",
      sequence_number: 2,
      item_id: completedMessage.id,
      output_index: 0,
      content_index: 0,
      delta: "OK",
      logprobs: [],
    },
    {
      type: "response.output_item.done",
      sequence_number: 3,
      output_index: 0,
      item: completedMessage,
    },
    {
      type: "response.completed",
      sequence_number: 4,
      response: {
        id: "resp_sillyos_provider_probe",
        status: "completed",
        output: [completedMessage],
        usage: {
          input_tokens: 4,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 1,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 5,
        },
      },
    },
  ];
  return `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
}

function successfulCreatorProgramToolCallSseV1(): string {
  const argumentsJson = JSON.stringify({
    requirement: "Keep the review workflow concise.",
  });
  const completedCall = {
    id: "fc_sillyos_creator_completion",
    type: "function_call",
    status: "completed",
    call_id: "call_sillyos_creator_completion",
    name: "sillyos_propose_program_revision",
    arguments: argumentsJson,
  };
  const events = [
    {
      type: "response.created",
      sequence_number: 0,
      response: { id: "resp_sillyos_creator_completion", status: "in_progress" },
    },
    {
      type: "response.output_item.added",
      sequence_number: 1,
      output_index: 0,
      item: { ...completedCall, status: "in_progress", arguments: "" },
    },
    {
      type: "response.function_call_arguments.delta",
      sequence_number: 2,
      item_id: completedCall.id,
      output_index: 0,
      delta: argumentsJson,
    },
    {
      type: "response.function_call_arguments.done",
      sequence_number: 3,
      item_id: completedCall.id,
      output_index: 0,
      arguments: argumentsJson,
    },
    {
      type: "response.output_item.done",
      sequence_number: 4,
      output_index: 0,
      item: completedCall,
    },
    {
      type: "response.completed",
      sequence_number: 5,
      response: {
        id: "resp_sillyos_creator_completion",
        status: "completed",
        output: [completedCall],
        usage: {
          input_tokens: 8,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 8,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 16,
        },
      },
    },
  ];
  return `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
}

async function routeSuccessfulOpenAIResponsesProbeV1(
  page: Page,
  probeUrl = openAIResponsesProbeUrlV1,
  creatorCompletion = false,
): Promise<OpenAIResponsesProbeRequestV1[]> {
  const observed: OpenAIResponsesProbeRequestV1[] = [];
  const appOrigin = new URL(sillyOsTargetUrlV1()).origin;
  await page.context().route(probeUrl, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": appOrigin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] ??
            "authorization, content-type",
          vary: "Origin",
        },
      });
      return;
    }
    const body = request.postData() ?? "";
    observed.push({
      method: request.method(),
      headers: request.headers(),
      body,
    });
    const isConnectionProbe = body.includes("Reply with OK.");
    const isCreatorToolContinuation = body.includes("function_call_output");
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": appOrigin,
        "access-control-expose-headers": "request-id",
        "cache-control": "no-store",
        "content-type": "text/event-stream; charset=utf-8",
        "request-id": "req_sillyos_provider_probe",
        vary: "Origin",
      },
      body: creatorCompletion && !isConnectionProbe && !isCreatorToolContinuation
        ? successfulCreatorProgramToolCallSseV1()
        : successfulOpenAIResponsesProbeSseV1(),
    });
  });
  return observed;
}

test("Program Library is the product home and launches bundled Programs through ordinary routes", async ({ durableProgramPage: page }) => {
  await page.goto(sillyOsTargetUrlV1("?locale=en"));

  const library = await expectProgramLibraryV1(page);
  await expect(library.getByRole("heading", { name: "Program Creator", exact: true }))
    .toBeVisible();
  await expect(library.getByRole("heading", { name: "Translation", exact: true }))
    .toBeVisible();
  await expect(library.getByLabel("Import Program ZIP")).toBeVisible();

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator('[data-silly-os-view="settings"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "General", level: 1 })).toBeVisible();
  await page.locator(".silly-os-settings__back").click();
  await expectProgramLibraryV1(page);

  await launchCreatorFromLibraryV1(page);
  await returnToProgramLibraryV1(page);

  await launchProgramFromLibraryV1(page, "Translation");
  const translation = page.locator('[data-silly-os-view="translation-workspace"]');
  await expect(translation).toBeVisible();
  await expect(translation).toHaveAttribute("data-program-id", "sillyos.translation");
  await returnToProgramLibraryV1(page);
});

test(
  "@program-package an external Program ZIP persists, creates distinct Processes, and reopens each through the current compatible implementation",
  async ({ durableProgramPage: page }) => {
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    let library = await expectProgramLibraryV1(page);

    await library.getByLabel("Import Program ZIP").setInputFiles({
      name: "external-translation-review.zip",
      mimeType: "application/zip",
      buffer: externalTranslationProgramZipV1(),
    });
    await expect(library.getByText("Imported external-translation-review.zip", { exact: true }))
      .toBeVisible();

    const externalPackageRowV1 = () =>
      library.locator(".program-library__package").filter({
        has: page.getByRole("heading", { name: "External Translation Review", exact: true }),
      });
    await expect(externalPackageRowV1()).toHaveCount(1);
    await expect(externalPackageRowV1()).toContainText(externalTranslationProgramIdV1);
    await expect(externalPackageRowV1()).toContainText(externalTranslationRuntimeProfileV1);

    const expectExternalProcessV1 = async (): Promise<string> => {
      const workspace = page.locator('[data-silly-os-view="translation-workspace"]');
      await expect(workspace).toBeVisible();
      await expect(workspace).toHaveAttribute("data-program-id", externalTranslationProgramIdV1);
      const processId = await workspace.getAttribute("data-process-id");
      if (processId === null) throw new Error("External Program omitted its Process identity");
      const runtimeSurface = page.locator(
        `[data-program-runtime-profile="${externalTranslationRuntimeProfileV1}"]`,
      );
      await expect(runtimeSurface).toBeVisible();
      await expect(runtimeSurface.locator("[data-program-ui-container]")).toHaveAttribute(
        "data-program-ui-process-id",
        processId,
      );
      await expect(page.getByRole("heading", { name: externalTranslationInitialTitleV1 }))
        .toBeVisible();
      return processId;
    };

    const firstProcessId =
      await test.step("open the imported Program as a first Process", async () => {
        await externalPackageRowV1().getByRole("button", { name: "Open", exact: true }).click();
        return await expectExternalProcessV1();
      });

    library = await returnToProgramLibraryV1(page);
    const secondProcessId = await test.step(
      "open the imported Program as a distinct second Process",
      async () => {
        await externalPackageRowV1().getByRole("button", { name: "Open", exact: true }).click();
        return await expectExternalProcessV1();
      },
    );
    expect(secondProcessId).not.toBe(firstProcessId);

    library = await returnToProgramLibraryV1(page);
    await page.reload();
    library = await expectProgramLibraryV1(page);
    await expect(externalPackageRowV1()).toHaveCount(1);

    const recentProcessRowV1 = (processId: string): Locator =>
      library.locator(".program-library__process").filter({
        has: page.getByText(processId, { exact: true }),
      });
    await expect(recentProcessRowV1(firstProcessId)).toHaveCount(1);
    await expect(recentProcessRowV1(secondProcessId)).toHaveCount(1);

    await recentProcessRowV1(firstProcessId).getByRole("button", {
      name: "View Conversation",
      exact: true,
    }).click();
    await expect(page.locator('[data-silly-os-view="translation-workspace"]')).toHaveAttribute(
      "data-process-id",
      firstProcessId,
    );
    await expectExternalProcessV1();

    library = await returnToProgramLibraryV1(page);
    await recentProcessRowV1(secondProcessId).getByRole("button", {
      name: "View Conversation",
      exact: true,
    }).click();
    await expect(page.locator('[data-silly-os-view="translation-workspace"]')).toHaveAttribute(
      "data-process-id",
      secondProcessId,
    );
    await expectExternalProcessV1();
  },
);

test("SillyOS binds the shared UI foundation without leaking into Tool Theme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  const application = page.locator('[data-application-id="example-silly-os"]');
  await expect(application).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);

  const theme = await application.evaluate((root) => {
    const productSurface = root.querySelector<HTMLElement>(".silly-os");
    if (productSurface === null) throw new TypeError("SillyOS product surface is unavailable");

    const normalButton = document.createElement("button");
    normalButton.className = "silly-button sos-button";
    normalButton.dataset.variant = "secondary";
    normalButton.dataset.size = "base";
    normalButton.textContent = "Normal";
    productSurface.append(normalButton);
    const compactButton = document.createElement("button");
    compactButton.className = "silly-button sos-button";
    compactButton.dataset.variant = "secondary";
    compactButton.dataset.size = "sm";
    compactButton.textContent = "Compact";
    productSurface.append(compactButton);

    const toolSurface = document.createElement("section");
    toolSurface.dataset.sillyToolSurface = "true";
    const toolButton = document.createElement("button");
    toolButton.className = "silly-button";
    toolButton.textContent = "Tool";
    toolSurface.append(toolButton);
    root.append(toolSurface);

    compactButton.focus();
    const rootStyle = getComputedStyle(root);
    const productStyle = getComputedStyle(productSurface);
    const normalStyle = getComputedStyle(normalButton);
    const compactStyle = getComputedStyle(compactButton);
    const toolStyle = getComputedStyle(toolSurface);
    const toolButtonStyle = getComputedStyle(toolButton);
    const result = {
      product: {
        canvas: rootStyle.getPropertyValue("--silly-color-canvas").trim(),
        accent: rootStyle.getPropertyValue("--silly-color-accent").trim(),
        fontFamily: productStyle.fontFamily,
        fontSize: productStyle.fontSize,
        normalBlockSize: normalStyle.blockSize,
        normalMinBlockSize: normalStyle.minBlockSize,
        compactBlockSize: compactStyle.blockSize,
        compactMinBlockSize: compactStyle.minBlockSize,
        focusOutlineColor: compactStyle.outlineColor,
        transitionDuration: compactStyle.transitionDuration,
      },
      tool: {
        canvas: toolStyle.getPropertyValue("--silly-color-canvas").trim(),
        text: toolStyle.getPropertyValue("--silly-color-text").trim(),
        fontFamily: toolStyle.fontFamily,
        fontSize: toolStyle.fontSize,
        controlBlockSize: toolButtonStyle.blockSize,
        controlMinBlockSize: toolButtonStyle.minBlockSize,
        colorScheme: toolStyle.colorScheme,
      },
    };
    normalButton.remove();
    compactButton.remove();
    toolSurface.remove();
    return result;
  });

  expect(theme.product.canvas).toBe("#f6f6f4");
  expect(theme.product.accent).toBe("#496bdf");
  expect(theme.product.fontFamily.toLowerCase()).toContain("inter");
  expect(theme.product.fontSize).toBe("14px");
  expect(theme.product.normalBlockSize).toBe("36px");
  expect(theme.product.normalMinBlockSize).toBe("36px");
  expect(theme.product.compactBlockSize).toBe("28px");
  expect(theme.product.compactMinBlockSize).toBe("28px");
  expect(theme.product.focusOutlineColor).toBe("rgb(49, 95, 197)");
  expect(theme.product.transitionDuration).toBe("0s");
  expect(theme.tool.canvas).toBe("#101014");
  expect(theme.tool.text).toBe("#e7e9ee");
  expect(theme.tool.fontFamily).not.toBe(theme.product.fontFamily);
  expect(theme.tool.fontSize).toBe("14px");
  expect(Number.parseFloat(theme.tool.controlBlockSize)).toBeGreaterThanOrEqual(28);
  expect(Number.parseFloat(theme.tool.controlBlockSize)).toBeLessThan(30);
  expect(theme.tool.controlMinBlockSize).toBe("28px");
  expect(theme.tool.colorScheme).toBe("dark");
});

test("SillyOS restores a saved dark theme before the application entry mounts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(({ storageKey }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ revision: 1, locale: "en", theme: "dark" }),
    );
  }, { storageKey: browserProductPreferencesStorageKeyV1 });

  let releaseEntryV1: (() => void) | undefined;
  const entryGateV1 = new Promise<void>((resolve) => {
    releaseEntryV1 = resolve;
  });
  await page.route("**/src/application/entry.tsx", async (route) => {
    await entryGateV1;
    await route.continue();
  });

  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"), { waitUntil: "commit" });
  try {
    await expect(
      page.locator('#sillymaker-application-boot-shell [data-sillymaker-boot-shell="pending"]'),
    ).toBeVisible();
    const beforeMount = await page.evaluate(() => ({
      colorScheme: document.documentElement.style.colorScheme,
      bootstrapScheme: document.documentElement.dataset.sillyOsColorScheme,
      productMounted: document.querySelector(".silly-os") !== null,
      themeColors: [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
        .map((meta) => meta.content),
    }));
    expect(beforeMount).toEqual({
      colorScheme: "dark",
      bootstrapScheme: "dark",
      productMounted: false,
      themeColors: ["#101210"],
    });
  } finally {
    releaseEntryV1?.();
  }

  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
});

test("an explicit URL locale does not replace the stored cross-tab preference", async ({ page }) => {
  await page.addInitScript(({ storageKey }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ revision: 1, locale: "en", theme: "system" }),
    );
  }, { storageKey: browserProductPreferencesStorageKeyV1 });

  await page.goto(sillyOsTargetUrlV1("?locale=zh-CN&agent=pi-test"));
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  expect(
    await page.evaluate((storageKey) => {
      const serialized = localStorage.getItem(storageKey);
      return serialized === null ? null : JSON.parse(serialized).locale;
    }, browserProductPreferencesStorageKeyV1),
  ).toBe("en");

  const sibling = await page.context().newPage();
  try {
    await sibling.goto(sillyOsTargetUrlV1("?agent=pi-test"));
    await expect(sibling.locator(".silly-os")).toHaveAttribute("data-locale", "en");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  } finally {
    await sibling.close();
  }
});

test("mounted tabs follow system theme and live product-preference changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(sillyOsTargetUrlV1("?agent=pi-test"));
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "system");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "light");

  const explicitLocalePage = await page.context().newPage();
  const writerPage = await page.context().newPage();
  try {
    await explicitLocalePage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await writerPage.goto(sillyOsTargetUrlV1("?agent=pi-test"));
    await writerPage.evaluate((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ revision: 1, locale: "zh-CN", theme: "dark" }),
      );
    }, browserProductPreferencesStorageKeyV1);

    await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
    await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");
    await expect(explicitLocalePage.locator(".silly-os")).toHaveAttribute("data-locale", "en");
    await expect(explicitLocalePage.locator(".silly-os")).toHaveAttribute(
      "data-theme-mode",
      "dark",
    );
  } finally {
    await explicitLocalePage.close();
    await writerPage.close();
  }
});

test("ordinary Browser Settings verifies a built-in Pi connection and preserves mobile navigation", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  const sentinel = "sillyos-provider-settings-session-key";
  const vaultPassword = "sillyos-browser-vault-password";
  const observedNetwork: string[] = [];
  const observedConsole: string[] = [];
  const providerProbeRequests = await routeSuccessfulOpenAIResponsesProbeV1(
    page,
    openAIResponsesProbeUrlV1,
    true,
  );
  page.on("request", (request) => {
    if (request.url() === openAIResponsesProbeUrlV1) return;
    observedNetwork.push(
      `${request.url()}\n${request.postData() ?? ""}\n${JSON.stringify(request.headers())}`,
    );
  });
  page.on("console", (message) => observedConsole.push(message.text()));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  const creatorReadiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(creatorReadiness).toContainText("API key required");
  await expect(creatorReadiness).toContainText("Open Providers");
  const homeModelControl = page.locator('[data-program-agent-model-selector="true"]');
  await expect(homeModelControl).toHaveCount(0);
  const providerWarningBox = await creatorReadiness.boundingBox();
  const creatorComposerBox = await page.locator(".program-agent-composer").boundingBox();
  expect(
    (creatorComposerBox?.y ?? 0) -
      ((providerWarningBox?.y ?? 0) + (providerWarningBox?.height ?? 0)),
  ).toBeGreaterThanOrEqual(13);
  const composerControlRadii = await page.locator(
    ".program-agent-composer .sos-textarea, .program-agent-composer__actions .sos-button",
  ).evaluateAll((elements) => elements.map((element) => getComputedStyle(element).borderRadius));
  expect(new Set(composerControlRadii)).toEqual(new Set(["12px"]));
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();

  const settings = page.locator('[data-silly-os-view="settings"]');
  const globalBack = page.getByRole("button", { name: "Back to Program Agent" });
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  const settingsGeneral = page.getByRole("button", { name: "General", exact: true });
  const settingsProviders = page.getByRole("button", { name: "Providers", exact: true });
  const settingsVault = page.getByRole("button", { name: "Credential Vault", exact: true });
  await expect(settingsProviders).toHaveAttribute("aria-current", "page");
  await settingsGeneral.click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "General", level: 1 })).toBeVisible();
  const generalLocaleSelect = page.getByRole("combobox", { name: "Language" });
  await expect(generalLocaleSelect).toHaveCount(1);
  const generalLocaleSelectBox = await generalLocaleSelect.boundingBox();
  expect(generalLocaleSelectBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const clearAllDataButton = page.getByRole("button", { name: "Clear all data" });
  await clearAllDataButton.click();
  const clearAllDataDialog = page.getByRole("alertdialog", {
    name: "Clear all SillyOS data?",
  });
  await expect(clearAllDataDialog).toBeVisible();
  const clearAllWarning = clearAllDataDialog.locator('[data-slot="status-title"]');
  await expect(clearAllWarning).toBeVisible();
  const clearAllWarningLayout = await clearAllWarning.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(clearAllWarningLayout.whiteSpace).not.toBe("nowrap");
  expect(clearAllWarningLayout.scrollWidth).toBeLessThanOrEqual(clearAllWarningLayout.clientWidth);
  await expect(clearAllDataDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.setViewportSize({ width: 1_024, height: 520 });
  await expectInsideVisualViewportV1(page, clearAllDataDialog);
  await expectInsideVisualViewportV1(
    page,
    clearAllDataDialog.getByRole("button", { name: "Clear all data" }),
  );
  await expectNoPageOverflowV1(page);
  await page.keyboard.press("Escape");
  await expect(clearAllDataDialog).toHaveCount(0);
  await expect(clearAllDataButton).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await settingsVault.click();
  const vaultPanel = page.locator('[data-vault-phase="unlocked"]');
  await expect(vaultPanel).toBeVisible();
  await expect(page.locator('[data-vault-mode="device"]')).toContainText("Automatic");
  await expect(page.getByText("No Provider API key is saved.", { exact: true })).toBeVisible();
  await settingsProviders.click();
  await expect(page.locator('[data-settings-section="providers"]')).toBeVisible();
  await expect(page.locator('[data-provider-id="openai"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  await expect(page.locator('[data-provider-id="anthropic"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  for (const providerId of ["google", "deepseek", "xai"]) {
    await expect(page.locator(`[data-provider-id="${providerId}"]`)).toHaveAttribute(
      "data-credential-status",
      "unset",
    );
  }
  await expect(page.locator('[data-provider-id="openrouter"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  const globalBackBox = await globalBack.boundingBox();
  expect(globalBackBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(globalBackBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const productMenuTrigger = page.getByRole("button", { name: "SillyOS menu" });
  const productMenuTriggerBox = await productMenuTrigger.boundingBox();
  expect(productMenuTriggerBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(productMenuTriggerBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await productMenuTrigger.click();
  const productMenu = page.getByRole("menu", { name: "SillyOS menu" });
  await expect(productMenu).toBeVisible();
  const themeMenuItem = productMenu.getByRole("menuitem", { name: "Theme" });
  await themeMenuItem.focus();
  await themeMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "Dark" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "dark");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-color-scheme", "dark");

  await settingsGeneral.click();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(generalLocaleSelect).toHaveValue("en");
  await productMenuTrigger.click();
  const languageMenuItem = productMenu.getByRole("menuitem", { name: "Language" });
  await languageMenuItem.focus();
  await languageMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "简体中文" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "zh-CN");
  await expect(page.getByRole("heading", { name: "通用", level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "语言" })).toHaveValue("zh-CN");
  expect(new URL(page.url()).searchParams.get("locale")).toBe("zh-CN");

  const localizedProductMenuTrigger = page.getByRole("button", { name: "SillyOS 菜单" });
  await localizedProductMenuTrigger.click();
  const localizedProductMenu = page.getByRole("menu", { name: "SillyOS 菜单" });
  const localizedLanguageMenuItem = localizedProductMenu.getByRole("menuitem", { name: "语言" });
  await localizedLanguageMenuItem.focus();
  await localizedLanguageMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "English" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("lang", "en");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-locale", "en");
  await expect(page.getByRole("heading", { name: "General", level: 1 })).toBeVisible();
  await expect(generalLocaleSelect).toHaveValue("en");
  expect(new URL(page.url()).searchParams.get("locale")).toBe("en");

  await productMenuTrigger.click();
  await themeMenuItem.focus();
  await themeMenuItem.press("ArrowRight");
  await page.getByRole("menuitemradio", { name: "System" }).press("Enter");
  await expect(page.locator(".silly-os")).toHaveAttribute("data-theme-mode", "system");
  await settingsProviders.click();
  await expectNoPageOverflowV1(page);

  await expect(page.getByRole("heading", { name: "Built-in Providers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom Endpoints" })).toBeVisible();
  await page.locator('[data-provider-id="anthropic"]').click();
  const anthropicAliasRow = page.locator('[data-model-id="claude-sonnet-4-5"]');
  const anthropicAlias = anthropicAliasRow.locator("input");
  await expect(anthropicAlias).toBeEnabled();
  await expectSillyOsCheckboxRecipeV1(anthropicAlias);
  if (!await anthropicAlias.isChecked()) await anthropicAliasRow.click();
  await expect(anthropicAlias).toBeChecked();
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openrouter"]').click();
  await expect(
    page.locator('[data-model-id="google/gemini-2.5-flash"] input'),
  ).toBeEnabled();
  const connectionModelSelect = page.locator(".provider-settings__connection-model select");
  await expect(connectionModelSelect).toBeEnabled();
  await expect(connectionModelSelect.locator('option[value="google/gemini-2.5-flash"]'))
    .toHaveCount(1);
  await page.getByRole("button", { name: "Back to Providers" }).click();

  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByRole("button", { name: "Back to Providers" })).toBeFocused();
  const modelCount = page.locator(".provider-settings__model-count");
  await expect(modelCount).toHaveText(/^\d+ \/ 38$/u);
  const modelCountLayout = await modelCount.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(modelCountLayout.whiteSpace).toBe("nowrap");
  expect(modelCountLayout.scrollHeight).toBeLessThanOrEqual(modelCountLayout.clientHeight);
  const selectedModel = page.locator('[data-model-id="gpt-5.3-chat-latest"] input');
  const fallbackModel = page.locator('[data-model-id="gpt-4.1-mini"] input');
  const siblingModel = page.locator('[data-model-id="gpt-4.1-nano"] input');
  if (!await selectedModel.isChecked()) await selectedModel.check();
  if (!await fallbackModel.isChecked()) await fallbackModel.check();
  if (!await siblingModel.isChecked()) await siblingModel.check();
  await expect(selectedModel).toBeChecked();
  await expect(fallbackModel).toBeChecked();
  await expect(siblingModel).toBeChecked();
  const endpoint = page.locator(".provider-settings__endpoint input").first();
  await expect(endpoint).toHaveValue("https://api.openai.com/v1");
  await expect(endpoint).toHaveAttribute("data-endpoint-editable", "false");
  await expect(endpoint).not.toBeEditable();
  expect(
    await page.locator(
      '[data-connection-target="builtin:openai:https://api.openai.com/v1"]',
    ).evaluate(
      (connection) => {
        const models = document.querySelector("#models-title")?.closest("section");
        return models !== null && models !== undefined &&
          (connection.compareDocumentPosition(models) & 4) !== 0;
      },
    ),
  ).toBe(true);
  const keyInput = page.getByLabel("API key", { exact: true });
  await expect(keyInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show API key" }).click();
  await expect(keyInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide API key" }).click();
  await keyInput.fill(sentinel);
  await expect(page.getByRole("button", { name: "Test connection" })).toBeDisabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(keyInput).toHaveValue("");
  const credentialSaveReceipt = page.getByText(
    "API key saved in Credential Vault",
    { exact: true },
  );
  await expect(credentialSaveReceipt).toBeVisible();
  const credentialSaveStatus = credentialSaveReceipt.locator("..");
  await expect(credentialSaveStatus.locator("small")).toHaveCount(0);
  await expect(credentialSaveStatus).not.toContainText("OpenAI");
  await expect(credentialSaveStatus).not.toContainText("gpt-4.1-nano");
  await expect(credentialSaveReceipt).toHaveCount(0, { timeout: 4_000 });
  expect(providerProbeRequests).toHaveLength(0);
  await globalBack.click();
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "model_required",
  );
  const homeModelSelector = homeModelControl.getByRole("combobox", {
    name: "Program Agent model",
  });
  await expect(homeModelControl).toHaveAttribute("data-model-state", "required");
  await homeModelSelector.click();
  await expect(homeModelSelector).toHaveAttribute("aria-expanded", "true");
  const readyModelListbox = page.getByRole("listbox", { name: "Program Agent model" });
  await expect(readyModelListbox).toBeVisible();
  await expect(readyModelListbox.getByRole("option", { name: /GPT-5\.3 Chat/u })).toBeVisible();
  const fallbackModelOption = readyModelListbox.getByRole("option", { name: /GPT-4\.1 mini/u });
  const siblingModelOption = readyModelListbox.getByRole("option", { name: /GPT-4\.1 nano/u });
  await expect(fallbackModelOption).toBeVisible();
  await expect(siblingModelOption).toBeVisible();
  await expect(readyModelListbox.getByRole("option", { name: /Anthropic/u })).toHaveCount(0);
  await siblingModelOption.dispatchEvent("click");
  await expect(creatorReadiness).toHaveCount(0);
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );
  const modelSettingsAction = homeModelControl.getByRole("button", { name: "Model settings" });

  await homeModelSelector.click();
  await expect(modelSettingsAction).toBeVisible();
  await homeModelSelector.press("Tab");
  await expect(modelSettingsAction).toBeFocused();
  await modelSettingsAction.press("Enter");
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toHaveCount(0);
  await connectionModelSelect.selectOption("gpt-4.1-nano");
  const testConnectionButton = page.getByRole("button", { name: "Test connection" });
  await expect(testConnectionButton).toBeEnabled();
  await testConnectionButton.click();
  await expect(page.getByText("Last connection test passed", { exact: true })).toBeVisible();
  expect(providerProbeRequests).toHaveLength(1);
  expect(providerProbeRequests[0]?.method).toBe("POST");
  expect(providerProbeRequests[0]?.headers.authorization).toBe(`Bearer ${sentinel}`);
  const probeBody = JSON.parse(providerProbeRequests[0]?.body ?? "null") as {
    readonly model?: unknown;
    readonly stream?: unknown;
    readonly store?: unknown;
    readonly tool_choice?: unknown;
    readonly max_output_tokens?: unknown;
    readonly input?: unknown;
  };
  expect(probeBody).toMatchObject({
    model: "gpt-4.1-nano",
    stream: true,
    store: false,
    max_output_tokens: 16,
  });
  expect(probeBody.tool_choice).toBeUndefined();
  expect(JSON.stringify(probeBody.input)).toContain("Reply with OK.");

  await settingsVault.click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();
  await expect(page.locator('[data-vault-mode="device"]')).toContainText("Automatic");
  await expect(page.getByText("builtin:openai", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByLabel("Confirm password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Use Password mode" }).click();
  await expect(page.locator('[data-vault-mode="password"]')).toContainText("Password");
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
  const lockVaultButton = page.getByRole("button", { name: "Lock", exact: true });
  await lockVaultButton.click();
  await expect(page.locator('[data-vault-phase="locked"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Forget builtin:openai" }).first())
    .toBeDisabled();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();

  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(creatorReadiness).toHaveAttribute("data-creator-readiness", "vault_locked");
  await expect(homeModelControl).toHaveCount(0);
  await page.locator('[data-open-settings="home"]').click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await page.getByRole("button", { name: "Credential Vault", exact: true }).click();
  await expect(page.locator('[data-vault-phase="locked"]')).toBeVisible();
  await expect(page.locator('[data-vault-mode="password"]')).toContainText("Password");
  await expect(page.getByText("builtin:openai", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("https://api.openai.com/v1", { exact: true }).first())
    .toBeVisible();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  const savedCredentialControls = page.locator(".provider-settings__credential-controls");
  await expect(
    savedCredentialControls.getByRole("button", { name: "Update", exact: true }),
  ).toBeVisible();
  await expect(
    savedCredentialControls.getByRole("button", {
      name: "Delete saved API key",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".provider-settings__connection-actions").getByRole("button", {
      name: "Delete saved API key",
      exact: true,
    }),
  ).toHaveCount(0);
  await globalBack.click();
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "model_required",
  );
  await expect(homeModelControl).toHaveAttribute("data-model-state", "required");
  await homeModelSelector.click();
  await expect(readyModelListbox).toBeVisible();
  await siblingModelOption.dispatchEvent("click");
  await expect(creatorReadiness).toHaveCount(0);
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await expect(creatorIntent).toHaveClass(/\bsos-textarea\b/u);
  const createProgramButton = page.getByRole("button", { name: "Create program" });
  await expect(createProgramButton).toBeDisabled();
  await creatorIntent.fill(translationIntentV1);
  await expect(createProgramButton).toBeEnabled();
  expect(providerProbeRequests).toHaveLength(1);

  const modelSelectorBox = await homeModelSelector.boundingBox();
  const createProgramBox = await createProgramButton.boundingBox();
  const composerActionsBox = await page.locator(".program-agent-composer__actions").boundingBox();
  expect(modelSelectorBox).not.toBeNull();
  expect(createProgramBox).not.toBeNull();
  expect(composerActionsBox).not.toBeNull();
  expect((modelSelectorBox?.x ?? 0) + (modelSelectorBox?.width ?? 0)).toBeLessThanOrEqual(
    createProgramBox?.x ?? 0,
  );
  expect(createProgramBox?.x ?? 0).toBeGreaterThanOrEqual(composerActionsBox?.x ?? 0);
  expect((createProgramBox?.x ?? 0) + (createProgramBox?.width ?? 0)).toBeLessThanOrEqual(
    (composerActionsBox?.x ?? 0) + (composerActionsBox?.width ?? 0),
  );

  await createProgramButton.click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  const programId = await readProgramIdV1(workspace);
  const workspaceModelControl = page.locator('[data-model-picker-surface="workspace"]');
  const workspaceModelSelector = workspaceModelControl.getByRole("combobox", {
    name: "Program Agent model",
  });
  await expect(workspaceModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(workspaceModelSelector).toBeEnabled();
  await expect(workspaceModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );
  await expect(page.getByText("Model Provider", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Forget Provider key" })).toHaveCount(0);
  await expect(
    page.locator(
      '[data-pi-agent-runtime="pi_provider"][data-pi-agent-run-status="ready"]',
    ),
  ).toHaveCount(0);

  const chatFeed = page.locator(".chat-pane__feed");
  const chatComposer = page.locator(".chat-composer");
  await expect(chatComposer.getByRole("textbox", { name: "Ask for a change…" }))
    .toHaveClass(/\bsos-textarea\b/u);
  const proposalCard = page.locator(".program-proposal");
  const workspaceReviewCard = page.locator(".program-workspace-review");
  const workpieceLink = page.locator(".workpiece-link");
  const [chatFeedBox, chatComposerBox, proposalCardBox, workspaceReviewCardBox, workpieceLinkBox] =
    await Promise.all([
      chatFeed.boundingBox(),
      chatComposer.boundingBox(),
      proposalCard.boundingBox(),
      workspaceReviewCard.boundingBox(),
      workpieceLink.boundingBox(),
    ]);
  expect(chatFeedBox).not.toBeNull();
  expect(chatComposerBox).not.toBeNull();
  expect(proposalCardBox).not.toBeNull();
  expect(workspaceReviewCardBox).not.toBeNull();
  expect(workpieceLinkBox).not.toBeNull();
  expect(
    Math.abs(
      (chatComposerBox?.x ?? 0) - ((chatFeedBox?.x ?? 0) + 14),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      ((chatComposerBox?.x ?? 0) + (chatComposerBox?.width ?? 0)) -
        ((chatFeedBox?.x ?? 0) + (chatFeedBox?.width ?? 0) - 14),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (workspaceReviewCardBox?.y ?? 0) -
      ((proposalCardBox?.y ?? 0) + (proposalCardBox?.height ?? 0)),
    "proposal-to-review gap",
  ).toBeGreaterThanOrEqual(15);
  expect(
    (workpieceLinkBox?.y ?? 0) -
      ((workspaceReviewCardBox?.y ?? 0) + (workspaceReviewCardBox?.height ?? 0)),
    "review-to-workpiece gap",
  ).toBeGreaterThanOrEqual(15);
  expect(
    (chatComposerBox?.y ?? 0) -
      ((chatFeedBox?.y ?? 0) + (chatFeedBox?.height ?? 0)),
    "feed-to-composer gap",
  ).toBeGreaterThanOrEqual(9);

  const workspaceSendButton = chatComposer.getByRole("button", { name: "Send" });
  const [workspaceModelSelectorBox, workspaceSendBox] = await Promise.all([
    workspaceModelSelector.boundingBox(),
    workspaceSendButton.boundingBox(),
  ]);
  expect(workspaceModelSelectorBox).not.toBeNull();
  expect(workspaceSendBox).not.toBeNull();
  for (const controlBox of [workspaceModelSelectorBox, workspaceSendBox]) {
    expect(controlBox?.height ?? 0).toBeGreaterThanOrEqual(42);
  }
  expect(
    (workspaceModelSelectorBox?.x ?? 0) + (workspaceModelSelectorBox?.width ?? 0),
  ).toBeLessThanOrEqual(workspaceSendBox?.x ?? 0);

  await workspaceModelSelector.click();
  const workspaceModelListbox = page.getByRole("listbox", { name: "Program Agent model" });
  await expect(workspaceModelListbox).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-5\.3 Chat/u })).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-4\.1 mini/u })).toBeVisible();
  await expect(workspaceModelListbox.getByRole("option", { name: /GPT-4\.1 nano/u }))
    .toHaveAttribute("aria-selected", "true");
  const workspaceModelSettingsAction = workspaceModelControl.getByRole("button", {
    name: "Model settings",
  });
  await workspaceModelSelector.press("Tab");
  await expect(workspaceModelSettingsAction).toBeFocused();
  await workspaceModelSettingsAction.press("Enter");
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await globalBack.click();
  await expect(workspace).toHaveAttribute("data-program-id", programId);
  await expect(workspaceModelSelector).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");
  await expect(
    page.getByRole("heading", { name: "No visual workpiece has been published yet" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: "Project progress" })).toHaveCount(0);
  const desktopChatShell = page.locator(".program-workspace__chat-shell");
  const desktopSeparator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  await desktopSeparator.focus();
  await desktopSeparator.press("Home");
  await expect(desktopSeparator).toHaveAttribute("aria-valuenow", "280");
  const desktopChatShellBox = await desktopChatShell.boundingBox();
  expect(desktopChatShellBox).not.toBeNull();
  expect(Math.round(desktopChatShellBox?.width ?? 0)).toBe(280);

  await workspaceModelSelector.click();
  await expect(workspaceModelListbox).toBeVisible();
  const workspaceModelPopover = workspaceModelControl.locator(
    ".program-agent-composer__model-popover",
  );
  const desktopComposerActions = chatComposer.locator(".chat-composer__actions");
  await expect(workspaceModelPopover).toBeVisible();
  const [workspaceModelPopoverBox, desktopComposerActionsBox] = await Promise.all([
    workspaceModelPopover.boundingBox(),
    desktopComposerActions.boundingBox(),
  ]);
  expect(workspaceModelPopoverBox).not.toBeNull();
  expect(desktopComposerActionsBox).not.toBeNull();
  expect(
    (workspaceModelPopoverBox?.x ?? Number.NEGATIVE_INFINITY) + 1,
  ).toBeGreaterThanOrEqual(desktopChatShellBox?.x ?? Number.POSITIVE_INFINITY);
  expect(
    (workspaceModelPopoverBox?.x ?? 0) + (workspaceModelPopoverBox?.width ?? 0),
  ).toBeLessThanOrEqual(
    (desktopChatShellBox?.x ?? 0) + (desktopChatShellBox?.width ?? 0) + 1,
  );
  expect(
    (workspaceModelPopoverBox?.x ?? Number.NEGATIVE_INFINITY) + 1,
  ).toBeGreaterThanOrEqual(desktopComposerActionsBox?.x ?? Number.POSITIVE_INFINITY);
  expect(
    (workspaceModelPopoverBox?.x ?? 0) + (workspaceModelPopoverBox?.width ?? 0),
  ).toBeLessThanOrEqual(
    (desktopComposerActionsBox?.x ?? 0) + (desktopComposerActionsBox?.width ?? 0) + 1,
  );
  await workspaceModelSelector.press("Escape");
  await expect(workspaceModelPopover).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");
  await expectNoPageOverflowV1(page);

  const workspaceSettings = page.locator('[data-open-settings="workspace"]');
  await workspaceSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(settings).toBeVisible();
  await expect(globalBack).toBeFocused();
  await globalBack.click();
  await expect(workspace).toHaveAttribute("data-program-id", programId);
  await expect(workspaceSettings).toBeFocused();

  await chatComposer.getByRole("textbox", { name: "Ask for a change…" }).fill(
    "Keep the review workflow concise.",
  );
  await workspaceSendButton.click();
  await expect.poll(() => providerProbeRequests.length).toBeGreaterThan(1);
  await expect.poll(async () => {
    return await page.evaluate((storageKey) => {
      const serialized = localStorage.getItem(storageKey);
      if (serialized === null) return null;
      const parsed = JSON.parse(serialized) as { readonly lastSuccessfulModel?: unknown };
      return parsed.lastSuccessfulModel ?? null;
    }, browserProviderSettingsStorageKeyV3);
  }).toEqual({
    kind: "builtin",
    providerId: "openai",
    modelId: "gpt-4.1-nano",
  });

  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(creatorReadiness).toHaveAttribute("data-creator-readiness", "vault_locked");
  await expect(homeModelControl).toHaveCount(0);
  const homeSettings = page.locator('[data-open-settings="home"]');
  await homeSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await settingsVault.click();
  await page.getByLabel("Vault password", { exact: true }).fill(vaultPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-vault-phase="unlocked"]')).toBeVisible();
  await globalBack.click();
  await expect(creatorReadiness).toHaveCount(0);
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );

  await homeSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  await page.locator('[data-provider-id="openai"]').click();
  const requestCountBeforeAlternateModelTest = providerProbeRequests.length;
  await connectionModelSelect.selectOption("gpt-4.1-mini");
  await testConnectionButton.click();
  await expect(page.getByText("Last connection test passed", { exact: true })).toBeVisible();
  await expect.poll(() => providerProbeRequests.length).toBe(
    requestCountBeforeAlternateModelTest + 1,
  );
  await globalBack.click();
  await expect(creatorReadiness).toHaveCount(0);
  await expect(homeModelControl).toHaveAttribute("data-model-state", "ready");
  await expect(homeModelSelector).toHaveAttribute(
    "data-selected-value",
    JSON.stringify(["builtin", "openai", "gpt-4.1-nano"]),
  );

  await homeSettings.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  await page.locator('[data-provider-id="openai"]').click();
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toHaveCount(0);
  const mobileCredentialActions = page.locator(".provider-settings__credential-actions");
  const mobileUpdateButton = mobileCredentialActions.getByRole("button", {
    name: "Update",
    exact: true,
  });
  const mobileDeleteButton = mobileCredentialActions.getByRole("button", {
    name: "Delete saved API key",
    exact: true,
  });
  const mobileUpdateBox = await mobileUpdateButton.boundingBox();
  const mobileDeleteBox = await mobileDeleteButton.boundingBox();
  expect(mobileUpdateBox).not.toBeNull();
  expect(mobileDeleteBox).not.toBeNull();
  expect(mobileUpdateBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(mobileDeleteBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(mobileDeleteBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(Math.abs((mobileUpdateBox?.y ?? 0) - (mobileDeleteBox?.y ?? 0))).toBeLessThan(1);
  await mobileDeleteButton.click();
  await expect(page.getByLabel("API key", { exact: true })).toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="false"]'))
    .toBeVisible();
  await expect.poll(async () => {
    return await page.evaluate((storageKey) => {
      const serialized = localStorage.getItem(storageKey);
      if (serialized === null) return null;
      const parsed = JSON.parse(serialized) as { readonly lastSuccessfulModel?: unknown };
      return parsed.lastSuccessfulModel ?? null;
    }, browserProviderSettingsStorageKeyV3);
  }).toEqual({
    kind: "builtin",
    providerId: "openai",
    modelId: "gpt-4.1-nano",
  });
  await settingsVault.click();
  await expect(page.getByText("No Provider API key is saved.", { exact: true })).toBeVisible();
  await settingsProviders.click();
  await expect(page.locator('[data-provider-id="openai"]')).toHaveAttribute(
    "data-credential-status",
    "unset",
  );
  await globalBack.click();
  await expect(homeSettings).toBeFocused();
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(creatorReadiness).toContainText("API key required");
  await expect(homeModelControl).toHaveCount(0);
  await expectNoPageOverflowV1(page);

  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);
  expect(await page.content()).not.toContain(sentinel);
  expect(observedNetwork.join("\n")).not.toContain(vaultPassword);
  expect(observedConsole.join("\n")).not.toContain(vaultPassword);
  expect(await page.content()).not.toContain(vaultPassword);
  const persistentBrowserState = await page.evaluate(() => {
    const entries: [string, string | null][] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) entries.push([key, localStorage.getItem(key)]);
    }
    return entries;
  });
  expect(JSON.stringify(persistentBrowserState)).not.toContain(sentinel);
  expect(JSON.stringify(persistentBrowserState)).not.toContain(vaultPassword);
});

test("ordinary Browser Settings adds, reloads, and removes a non-secret custom endpoint profile", async ({ durableProgramPage: page }) => {
  const customName = "Team inference gateway";
  const customEndpoint = "https://inference.example.test/v1";
  const customModel = "team-model-v2";
  const customSentinel = "sillyos-custom-provider-session-key";
  const customProbeRequests = await routeSuccessfulOpenAIResponsesProbeV1(
    page,
    `${customEndpoint}/responses`,
  );

  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  const creatorReadiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();
  await expect(page.locator('[data-silly-os-view="settings"]')).toBeVisible();
  await page.locator('[data-add-custom-endpoint="true"]').click();

  await page.getByLabel("Name").fill(customName);
  await page.getByLabel("API format").selectOption("openai-responses");
  await page.locator('.provider-settings__custom-form input[name="baseUrl"]').fill(
    `${customEndpoint}/`,
  );
  await page.getByLabel("Model ID").fill(customModel);
  await page.getByLabel("Context window").fill("131072");
  await page.getByLabel("Maximum output tokens").fill("8192");
  await page.getByRole("button", { name: "Save endpoint" }).click();

  const customProfile = page.locator("[data-custom-profile-id]");
  await expect(customProfile).toHaveCount(1);
  await expect(customProfile).toContainText(customName);
  await expect(customProfile).toHaveAttribute("data-connection-status", "available");
  await expect(page.getByRole("heading", { name: customName })).toBeVisible();
  const savedEndpoint = page.locator(
    '.provider-settings__endpoint input[aria-label="Endpoint"]',
  );
  await expect(savedEndpoint).toHaveValue(customEndpoint);
  await expect(savedEndpoint).toHaveAttribute(
    "data-endpoint-editable",
    "custom-profile",
  );
  await expect(savedEndpoint).not.toBeEditable();
  await expect(page.getByText(customModel, { exact: true }).first()).toBeVisible();

  const customKeyInput = page.getByLabel("API key", { exact: true });
  await customKeyInput.fill(customSentinel);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(customKeyInput).toHaveValue("");
  await expect(page.getByText("API key saved in Credential Vault", { exact: true }))
    .toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  expect(customProbeRequests).toHaveLength(0);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(customKeyInput).toHaveValue("");
  const customConnection = page.locator(
    `.provider-settings__credential-form[data-key-saved="true"]`,
  );
  await expect(customConnection).toContainText("Last connection test passed");
  await expect(customConnection).toContainText(customModel);
  await expect(customConnection).not.toContainText(customName);
  await expect(customProfile).toHaveAttribute("data-connection-status", "available");
  expect(customProbeRequests).toHaveLength(1);
  expect(customProbeRequests[0]?.method).toBe("POST");
  expect(customProbeRequests[0]?.headers.authorization).toBe(`Bearer ${customSentinel}`);
  const customProbeBody = JSON.parse(customProbeRequests[0]?.body ?? "null") as {
    readonly tool_choice?: unknown;
  };
  expect(customProbeBody).toMatchObject({
    model: customModel,
    stream: true,
    store: false,
    max_output_tokens: 16,
  });
  expect(customProbeBody.tool_choice).toBeUndefined();

  const savedProfile = await page.evaluate((storageKey) => {
    const serialized = localStorage.getItem(storageKey);
    return serialized === null ? null : JSON.parse(serialized) as unknown;
  }, browserProviderSettingsStorageKeyV3);
  expect(savedProfile).toMatchObject({
    revision: 3,
    customProfiles: [{
      displayName: customName,
      api: "openai-responses",
      baseUrl: customEndpoint,
      modelId: customModel,
      contextWindow: 131_072,
      maxTokens: 8_192,
    }],
    lastSuccessfulModel: null,
  });
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("api_key");
  expect(JSON.stringify(savedProfile).toLocaleLowerCase()).not.toContain("apikey");
  expect(JSON.stringify(savedProfile)).not.toContain(customSentinel);
  expect(await page.content()).not.toContain(customSentinel);

  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "model_required",
  );
  const customModelControl = page.locator('[data-program-agent-model-selector="true"]');
  await expect(customModelControl).toHaveAttribute("data-model-state", "required");
  const customModelSelector = customModelControl.getByRole("combobox", {
    name: "Program Agent model",
  });
  await customModelSelector.click();
  await page.getByRole("listbox", { name: "Program Agent model" }).getByRole("option", {
    name: new RegExp(customModel, "u"),
  }).dispatchEvent("click");
  await expect(creatorReadiness).toHaveCount(0);
  await expect(customModelControl).toHaveAttribute("data-model-state", "ready");
  await page.locator('[data-open-settings="home"]').click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.locator('[data-settings-section="general"]')).toBeVisible();
  await page.getByRole("button", { name: "Providers", exact: true }).click();
  const reloadedProfile = page.locator("[data-custom-profile-id]");
  await expect(reloadedProfile).toHaveCount(1);
  await expect(reloadedProfile).toContainText(customName);
  await expect(reloadedProfile).toHaveAttribute("data-connection-status", "available");
  await reloadedProfile.click();
  await expect(
    page.locator('.provider-settings__endpoint input[aria-label="Endpoint"]'),
  ).toHaveValue(customEndpoint);
  await expect(page.getByText("131,072", { exact: true })).toBeVisible();
  await expect(page.getByText("8,192", { exact: true })).toBeVisible();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="true"]'))
    .toBeVisible();
  await expect(
    page.locator(".provider-settings__credential-controls").getByRole("button", {
      name: "Update",
      exact: true,
    }),
  ).toBeVisible();

  const customCredentialActions = page.locator(".provider-settings__credential-actions");
  const customUpdateBox = await customCredentialActions.getByRole("button", {
    name: "Update",
    exact: true,
  }).boundingBox();
  const customDeleteBox = await customCredentialActions.getByRole("button", {
    name: "Delete saved API key",
    exact: true,
  }).boundingBox();
  expect(customUpdateBox).not.toBeNull();
  expect(customDeleteBox).not.toBeNull();
  expect(Math.abs((customUpdateBox?.y ?? 0) - (customDeleteBox?.y ?? 0))).toBeLessThan(1);

  await page.getByRole("button", { name: "Delete saved API key" }).click();
  await expect(page.locator('.provider-settings__credential-form[data-key-saved="false"]'))
    .toBeVisible();
  await expect(reloadedProfile).toHaveAttribute("data-connection-status", "available");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(reloadedProfile).toHaveCount(0);
  expect(
    JSON.parse(
      await page.evaluate(
        (storageKey) => localStorage.getItem(storageKey) ?? "null",
        browserProviderSettingsStorageKeyV3,
      ),
    ),
  ).toMatchObject({
    revision: 3,
    customProfiles: [],
    lastSuccessfulModel: null,
  });

  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(creatorReadiness).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await creatorReadiness.getByRole("button", { name: "Open Providers" }).click();
  await expect(page.locator("[data-custom-profile-id]")).toHaveCount(0);
  await expect(page.getByText("Add an HTTPS endpoint", { exact: true })).toBeVisible();
});

test("Creator Home persists and reopens an exact accepted Program", async ({ durableProgramPage: page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(workspace);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");

  await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expectCreatorStorageReadyV1(page);
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);

  await expect(page.getByRole("tab", { name: "View" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "No visual workpiece has been published yet" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expect(page.getByText("Deterministic test wiring", { exact: true })).toBeVisible();

  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Proposal v1 accepted. Follow-up requests will create a new revision for review.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoPageOverflowV1(page);

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      browserProviderSettingsStorageKeyV3,
    ),
  ).toBeNull();
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(page.locator('[data-creator-readiness-surface="home"]')).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 1,
    status: "Program accepted",
  });
  await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
  await expect(page.getByText(translationIntentV1, { exact: true })).toBeVisible();
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept program" })).toHaveCount(0);
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Proposal v1 accepted. Follow-up requests will create a new revision for review.",
      { exact: true },
    ),
  ).toBeVisible();
});

test(
  "the bundled Translation Program imports, exports, and continues one durable Process Conversation",
  async ({ durableProgramPage: page }, testInfo) => {
    await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramLibraryV1(page);
    await launchCreatorFromLibraryV1(page);
    await initializePiTestV1(page, "sillyos-translation-workset-key");
    await returnToProgramLibraryV1(page);
    await launchProgramFromLibraryV1(page, "Translation");

    const processWorkspace = page.locator('[data-silly-os-view="translation-workspace"]');
    await expect(processWorkspace).toBeVisible();
    await expect(processWorkspace).toHaveAttribute("data-program-id", "sillyos.translation");
    const processId = await processWorkspace.getAttribute("data-process-id");
    expect(processId).not.toBeNull();

    await processWorkspace.locator('input[type="file"]').setInputFiles({
      name: "sound-check.srt",
      mimeType: "application/x-subrip",
      buffer: Buffer.from([
        "1",
        "00:00:00,000 --> 00:00:01,500",
        "第一句，保持原意。",
        "",
        "2",
        "00:00:02,000 --> 00:00:04,000",
        "Second line with {name}.",
        "",
      ].join("\n")),
    });
    await expect(page.getByRole("heading", { name: "sound-check.srt" })).toBeVisible();
    await expect(page.getByRole("button", {
      name: /^1 第一句，保持原意。 — Pending$/u,
    })).toBeVisible();
    await expect(page.getByRole("button", {
      name: /^2 Second line with ⟦SM:\d+⟧\. — Pending$/u,
    })).toBeVisible();

    await page.getByRole("button", { name: "Translate next batch" }).click();
    await expect(page.getByRole("heading", { name: "Review this batch" })).toBeVisible();
    const targetEditor = page.getByRole("textbox", { name: "Target" });
    await expect(targetEditor).toHaveValue("[deterministic] 第一句，保持原意。");
    await targetEditor.fill("First line, preserve the original meaning.");
    await page.getByRole("button", { name: "Accept batch" }).click();
    await expect(page.getByText("2 / 2 translated", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review this batch" })).toHaveCount(0);
    await expect(page.getByRole("button", {
      name: /^1 第一句，保持原意。 First line, preserve the original meaning\. Committed$/u,
    })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sound-check.en.srt");
    const exportPath = testInfo.outputPath("sound-check.en.srt");
    await download.saveAs(exportPath);
    expect(await download.failure()).toBeNull();
    expect(await readFile(exportPath, "utf8")).toBe([
      "1",
      "00:00:00,000 --> 00:00:01,500",
      "First line, preserve the original meaning.",
      "",
      "2",
      "00:00:02,000 --> 00:00:04,000",
      "[deterministic] Second line with {name}.",
      "",
    ].join("\n"));

    await page.getByRole("tab", { name: "Conversation" }).click();
    const followUp = "Summarize the completion status for this Process.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.locator('[data-chat-role="user"]').getByText(followUp, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-chat-role="assistant"]').getByText(
        "The translation is complete. How else can I help with this Process?",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(processWorkspace).toHaveAttribute("data-process-id", processId!);

    await page.getByRole("tab", { name: "Simple" }).click();
    await expect(page.getByText("2 / 2 translated", { exact: false })).toBeVisible();

    await page.reload();
    await expectProgramLibraryV1(page);
    const library = await expectProgramLibraryV1(page);
    const recentConversation = library.locator(".program-library__process").filter({
      has: page.getByText(processId!, { exact: true }),
    });
    await expect(recentConversation).toHaveCount(1);
    await expect(recentConversation.getByRole("heading", { name: "sillyos.translation" }))
      .toBeVisible();
    await recentConversation.getByRole("button", { name: "View Conversation" }).click();
    const reopened = page.locator('[data-silly-os-view="translation-workspace"]');
    await expect(reopened).toHaveAttribute("data-process-id", processId!);
    await expect(page.getByRole("heading", { name: "sound-check.srt" })).toBeVisible();
    await expect(page.getByRole("button", {
      name: /^1 第一句，保持原意。 First line, preserve the original meaning\. Committed$/u,
    })).toBeVisible();
    await page.getByRole("tab", { name: "Conversation" }).click();
    await expect(
      page.locator('[data-chat-role="user"]').getByText(followUp, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-chat-role="assistant"]').getByText(
        "The translation is complete. How else can I help with this Process?",
        { exact: true },
      ),
    ).toBeVisible();
  },
);

test("a pending Program remains locally reviewable without a Provider credential", async ({ durableProgramPage: page }) => {
  const initialWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(initialWorkspace);

  await returnToCreatorHomeV1(page);
  await expectCreatorStorageReadyV1(page);
  await page.goto(sillyOsTargetUrlV1("?locale=en"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);

  const readiness = page.locator('[data-creator-readiness-surface="home"]');
  await expect(readiness).toHaveAttribute("data-creator-readiness", "credential_required");
  const recentProgram = creatorProgramCardV1(page, "Translation Workshop");
  const editProgram = recentProgram.getByRole("button", {
    name: "Edit program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(editProgram).toBeEnabled();
  await editProgram.click();

  await expect(page.locator('[data-creator-readiness-surface="workspace"]')).toHaveAttribute(
    "data-creator-readiness",
    "credential_required",
  );
  const followUp = page.getByRole("textbox", { name: "Ask for a change…" });
  await expect(followUp).toBeEnabled();
  await followUp.fill("Keep this local draft until a Provider is configured.");
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Accept program" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reject proposal" })).toBeEnabled();
  await page.getByRole("button", { name: "Accept program" }).click();
  await expectCreatorStorageReadyV1(page);
  await expect(page.getByText("Program accepted", { exact: true }).first()).toBeVisible();
});

test(
  "a follow-up creates a new Program definition revision for review",
  async ({ durableProgramPage: page }) => {
    await openTranslationWorkspaceV1(page);

    await page.getByRole("button", { name: "Reject proposal" }).click();
    await expect(page.getByText("Proposal rejected", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject proposal" })).toHaveCount(0);

    const followUp = "Use a warmer voice for the protagonist.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.locator('[data-chat-role="user"]').getByText(followUp, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-chat-role="assistant"]').getByText(
        "Deterministic test proposal ready.",
        { exact: true },
      ).last(),
    ).toBeVisible();
    await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
    await expect(page.getByRole("button", { name: "Accept program" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject proposal" })).toBeVisible();

    await expect(page.getByRole("main", { name: "SillyOS program workspace" }))
      .toHaveAttribute("data-program-revision", "2");
    await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);

    await expect(
      page.locator('[data-chat-role="assistant"]').getByText(
        "Proposal v1 rejected. Add context to create a new revision for review, or return home to start again.",
        { exact: true },
      ),
    ).toBeVisible();
  },
);

test(
  "@p4a a pageable rich Conversation keeps one active Process subtree and cold-reopens",
  async ({ durableProgramPage: page }, testInfo) => {
    const firstWorkspace = await openTranslationWorkspaceV1(page);
    const firstProgramId = await readProgramIdV1(firstWorkspace);
    const firstProcessId = await firstWorkspace.getAttribute("data-process-id");
    if (firstProcessId === null) throw new Error("first Program omitted its Process identity");

    const fixture = await appendP4aTranscriptFixtureV1(page, firstProcessId);
    expect(fixture.appendedByteLength).toBeGreaterThan(
      p4aTranscriptWindowQualificationBytesV1,
    );
    expect(fixture.transcriptFrontier).toBe(2 + fixture.appendedEntryCount);

    // Recreate the application and repository Workers before reading the
    // externally appended durable Process through the ordinary product route.
    await page.reload();
    await expectProgramLibraryV1(page);
    await launchCreatorFromLibraryV1(page);
    await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
    await initializePiTestV1(page, "silly-os-p4a-key");
    await page.locator(`[data-program-id="${firstProgramId}"]`).getByRole("button", {
      name: "Edit program: Translation Workshop",
      exact: true,
    }).click();

    const activeWorkspace = page.getByRole("main", { name: "SillyOS program workspace" });
    await expect(activeWorkspace).toHaveAttribute("data-process-id", firstProcessId);
    await expect(activeWorkspace).toHaveAttribute("data-transcript-phase", "ready");
    const terminalProjection = await readProgramDataProjectionV1(
      page,
      firstProgramId,
      firstProcessId,
    );
    expect(terminalProjection.process).toMatchObject({
      revision: fixture.processRevision,
      transcriptFrontier: fixture.transcriptFrontier,
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: fixture.attemptId,
        generation: fixture.attemptGeneration,
        outcome: "failed",
        triggerEntryId: "entry.p4a.trigger",
        triggerSequence: fixture.transcriptFrontier - 1,
        interruptionDisposition: null,
      },
    });
    await expect(
      page.locator(`[data-transcript-entry-id="${fixture.richEntryId}"]`),
    ).toBeVisible();
    await expect(page.getByText("P4-A rich transcript sentinel", { exact: true })).toBeVisible();
    await expect(page.getByText("Reviewed glossary", { exact: true })).toBeVisible();
    await expect(page.locator(".transcript-part--reasoning")).toHaveCount(1);
    await expect(page.locator(".transcript-part--tool-call")).toHaveCount(1);
    await expect(page.locator('[data-tool-status="succeeded"]')).not.toHaveCount(0);
    await expect(page.locator('[data-tool-outcome="succeeded"]')).not.toHaveCount(0);

    const feed = page.locator(".chat-pane__feed");
    const mountedEntries = feed.locator("[data-transcript-entry-id]");
    const mountedBeforeOlder = await mountedEntries.count();
    expect(mountedBeforeOlder).toBeLessThan(fixture.transcriptFrontier);
    await feed.evaluate((element) => {
      element.scrollTop = 0;
    });
    const prependAnchor = mountedEntries.first();
    const prependAnchorEntryId = await prependAnchor.getAttribute("data-transcript-entry-id");
    const firstSequenceBeforeOlder = Number(
      await prependAnchor.getAttribute("data-transcript-sequence"),
    );
    if (prependAnchorEntryId === null || !Number.isSafeInteger(firstSequenceBeforeOlder)) {
      throw new Error("initial transcript page omitted its stable anchor");
    }
    const anchorTopBeforeOlder = await prependAnchor.evaluate((element) => {
      const ownerFeed = element.closest(".chat-pane__feed");
      if (!(ownerFeed instanceof HTMLElement)) throw new Error("transcript feed unavailable");
      return element.getBoundingClientRect().top - ownerFeed.getBoundingClientRect().top;
    });
    await page.getByRole("button", { name: "Load earlier messages" }).click();
    await expect.poll(async () =>
      Number(await mountedEntries.first().getAttribute("data-transcript-sequence"))
    ).toBeLessThan(firstSequenceBeforeOlder);
    const retainedAnchor = feed.locator(
      `[data-transcript-entry-id="${prependAnchorEntryId}"]`,
    );
    await expect(retainedAnchor).toHaveCount(1);
    const anchorTopAfterOlder = await retainedAnchor.evaluate((element) => {
      const ownerFeed = element.closest(".chat-pane__feed");
      if (!(ownerFeed instanceof HTMLElement)) throw new Error("transcript feed unavailable");
      return element.getBoundingClientRect().top - ownerFeed.getBoundingClientRect().top;
    });
    expect(
      Math.abs(anchorTopAfterOlder - anchorTopBeforeOlder),
      "loading an older transcript page should retain the prepend anchor",
    ).toBeLessThanOrEqual(2);
    const processSwitchAnchor = await feed.evaluate((element) => {
      const feedRect = element.getBoundingClientRect();
      const entries = Array.from(
        element.querySelectorAll<HTMLElement>("[data-transcript-entry-id]"),
      );
      const entry = entries.find((candidate) =>
        candidate.getBoundingClientRect().bottom > feedRect.top
      ) ?? entries.at(-1);
      if (entry === undefined) throw new Error("loaded transcript omitted its stable anchor");
      return {
        entryId: entry.dataset.transcriptEntryId ?? null,
        sequence: Number(entry.dataset.transcriptSequence),
        top: entry.getBoundingClientRect().top - feedRect.top,
      };
    });
    if (
      processSwitchAnchor.entryId === null ||
      !Number.isSafeInteger(processSwitchAnchor.sequence) ||
      processSwitchAnchor.sequence >= fixture.transcriptFrontier
    ) throw new Error("loaded transcript omitted its non-latest Process anchor");

    const preservedDraft = "Keep this Process-local draft while another Process is active.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(preservedDraft);
    await returnToCreatorHomeV1(page);
    await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();

    const secondIntent = "Create a concise writing workspace for a product launch outline.";
    await page.getByRole("textbox", { name: "What would you like to make?" }).fill(secondIntent);
    await page.getByRole("button", { name: "Create program" }).click();
    await expect(activeWorkspace).toBeVisible();
    const secondProgramId = await readProgramIdV1(activeWorkspace);
    const secondProcessId = await activeWorkspace.getAttribute("data-process-id");
    if (secondProcessId === null) throw new Error("second Program omitted its Process identity");
    expect(secondProgramId).not.toBe(firstProgramId);
    expect(secondProcessId).not.toBe(firstProcessId);
    await expect(page.locator(`[data-process-id="${firstProcessId}"]`)).toHaveCount(0);
    await expect(
      page.locator(`[data-transcript-entry-id="${fixture.richEntryId}"]`),
    ).toHaveCount(0);
    await expect(page.locator("[data-transcript-entry-id]")).toHaveCount(2);

    await returnToCreatorHomeV1(page);
    await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
    const switchStartedAt = Date.now();
    await page.locator(`[data-program-id="${firstProgramId}"]`).getByRole("button", {
      name: "Edit program: Translation Workshop",
      exact: true,
    }).click();
    await expect(activeWorkspace).toHaveAttribute("data-process-id", firstProcessId);
    const switchDurationMs = Date.now() - switchStartedAt;
    await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toHaveValue(
      preservedDraft,
    );
    await expect(page.locator(`[data-process-id="${secondProcessId}"]`)).toHaveCount(0);
    const restoredAnchor = feed.locator(
      `[data-transcript-entry-id="${processSwitchAnchor.entryId}"]`,
    );
    await expect(restoredAnchor).toHaveCount(1);
    const anchorTopAfterSwitch = await restoredAnchor.evaluate((element) => {
      const ownerFeed = element.closest(".chat-pane__feed");
      if (!(ownerFeed instanceof HTMLElement)) throw new Error("transcript feed unavailable");
      return element.getBoundingClientRect().top - ownerFeed.getBoundingClientRect().top;
    });
    expect(
      Math.abs(anchorTopAfterSwitch - processSwitchAnchor.top),
      "switching back to a Process should restore its retained Conversation anchor",
    ).toBeLessThanOrEqual(2);

    const mountedMeasurement = await page.evaluate(() => ({
      documentNodes: document.getElementsByTagName("*").length,
      resourceEntries: performance.getEntriesByType("resource").length,
      transcriptEntries: document.querySelectorAll("[data-transcript-entry-id]").length,
      transcriptParts: document.querySelectorAll(".transcript-part").length,
    }));
    expect(mountedMeasurement.transcriptEntries).toBeLessThan(fixture.transcriptFrontier);
    await testInfo.attach("p4a-single-active-measurement", {
      body: JSON.stringify(
        {
          fixture,
          mountedMeasurement,
          switchDurationMs,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });

    // A controlled document discard must reconstruct the latest bounded
    // transcript window from the persistent profile in a successor document,
    // not from the old Page's retained React or repository Workers.
    const successorPage = await page.context().newPage();
    await page.close();
    await successorPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramLibraryV1(successorPage);
    await launchCreatorFromLibraryV1(successorPage);
    await expect(successorPage.locator('[data-silly-os-view="home"]')).toBeVisible();
    await successorPage.locator(`[data-program-id="${firstProgramId}"]`).getByRole("button", {
      name: "Edit program: Translation Workshop",
      exact: true,
    }).click();
    const successorWorkspace = successorPage.getByRole("main", {
      name: "SillyOS program workspace",
    });
    await expect(successorWorkspace).toHaveAttribute("data-process-id", firstProcessId);
    await expect(
      successorPage.locator(`[data-transcript-entry-id="${fixture.richEntryId}"]`),
    ).toBeVisible();
    await expect(
      successorPage.locator(
        `[data-transcript-sequence="${String(fixture.transcriptFrontier)}"]`,
      ),
    ).toHaveCount(1);
    await expect(
      successorPage.locator(`[data-transcript-entry-id="${fixture.olderEntryId}"]`),
    ).toHaveCount(0);
    await expect(
      successorPage.getByRole("button", { name: "Load earlier messages" }),
    ).toBeVisible();
    const successorProjection = await readProgramDataProjectionV1(
      successorPage,
      firstProgramId,
      firstProcessId,
    );
    expect(successorProjection.process).toMatchObject({
      revision: fixture.processRevision,
      transcriptFrontier: fixture.transcriptFrontier,
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: fixture.attemptId,
        generation: fixture.attemptGeneration,
        outcome: "failed",
      },
    });
  },
);

test(
  "@p4a two idle pages race through the real Send UI and only one owns execution",
  async ({ durableProgramPage: page }) => {
    test.setTimeout(120_000);
    const firstWorkspace = await openTranslationWorkspaceV1(page);
    const programId = await readProgramIdV1(firstWorkspace);
    const processId = await firstWorkspace.getAttribute("data-process-id");
    if (processId === null) throw new Error("P4-A Program omitted its Process identity");

    const contenderPage = await page.context().newPage();
    await contenderPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramLibraryV1(contenderPage);
    await launchCreatorFromLibraryV1(contenderPage);
    await initializePiTestV1(contenderPage, "sillyos-p4a-process-contender");
    const secondWorkspace = await openRecentTranslationProgramV1(contenderPage, {
      programId,
      revision: 1,
      status: "Preview",
    });
    await expect(secondWorkspace).toHaveAttribute("data-process-id", processId);

    const first = { page, workspace: firstWorkspace };
    const second = { page: contenderPage, workspace: secondWorkspace };
    const composerForV1 = (target: Page) =>
      target.getByRole("textbox", { name: "Ask for a change…" });
    for (const idle of [first, second]) {
      await expect(idle.workspace).toHaveAttribute("data-execution-workspace-state", "closed");
      await expect(idle.workspace).not.toHaveAttribute(
        "data-execution-workspace-session",
        /.+/u,
      );
      await expect(composerForV1(idle.page)).toBeEnabled();
    }
    const baseProcess = (await readProgramDataProjectionV1(page, programId, processId)).process;
    if (baseProcess === null) throw new Error("P4-A UI race omitted its durable Process");
    const candidates = [{
      page,
      workspace: firstWorkspace,
      composer: composerForV1(page),
      send: page.getByRole("button", { name: "Send" }),
      draft: "Hold this deterministic run until cancelled: P4-A first page owns this exact draft.",
    }, {
      page: contenderPage,
      workspace: secondWorkspace,
      composer: composerForV1(contenderPage),
      send: contenderPage.getByRole("button", { name: "Send" }),
      draft: "Hold this deterministic run until cancelled: P4-A second page owns this exact draft.",
    }] as const;
    await Promise.all(candidates.map(({ composer, draft }) => composer.fill(draft)));
    await Promise.all(candidates.map(({ send }) => expect(send).toBeEnabled()));

    // HTMLElement.click() keeps the real form/onSend path while avoiding a
    // Playwright actionability race if the other page's commit disables this
    // button between the two near-simultaneous dispatches.
    await Promise.all(
      candidates.map(({ send }) => send.evaluate((button) => (button as HTMLElement).click())),
    );
    await expect.poll(async () => {
      const process = (await readProgramDataProjectionV1(page, programId, processId)).process;
      return process === null ? null : {
        revision: process.revision,
        transcriptFrontier: process.transcriptFrontier,
        activeAttempt: process.activeAttempt,
      };
    }).toMatchObject({
      revision: baseProcess.revision + 1,
      transcriptFrontier: baseProcess.transcriptFrontier + 1,
      activeAttempt: {
        generation: (baseProcess.lastTerminalAttempt?.generation ?? 0) + 1,
        triggerSequence: baseProcess.transcriptFrontier + 1,
      },
    });
    const activeProcess = (await readProgramDataProjectionV1(page, programId, processId)).process;
    const activeAttempt = activeProcess?.activeAttempt ?? null;
    if (activeAttempt === null) throw new Error("P4-A UI race omitted its active attempt");
    const activeLease = await readP4aProcessExecutionLeaseV1(page, processId);
    expect(activeLease).toMatchObject({
      processId,
      attemptId: activeAttempt.attemptId,
      generation: activeAttempt.generation,
    });

    const triggerSelector = `[data-transcript-entry-id="${activeAttempt.triggerEntryId}"]`;
    await Promise.all([
      expect(page.locator(triggerSelector)).toBeVisible({ timeout: 25_000 }),
      expect(contenderPage.locator(triggerSelector)).toBeVisible({ timeout: 25_000 }),
    ]);
    const winnerFlags = await Promise.all(
      candidates.map(({ draft }) =>
        page.locator(triggerSelector).getByText(draft, { exact: true }).count()
      ),
    );
    expect(winnerFlags.filter((count) => count === 1)).toHaveLength(1);
    expect(winnerFlags.filter((count) => count === 0)).toHaveLength(1);
    const winnerIndex = winnerFlags[0] === 1 ? 0 : 1;
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    const winner = candidates[winnerIndex];
    const loser = candidates[loserIndex];

    // The live product admission order is Workspace first, then Process. The
    // losing page therefore fails the exclusive Workspace acquisition before
    // Process CAS, retains its draft, and owns no session to leak or close.
    await expect(winner.page.locator('[data-pi-agent-run-status="running"]')).toBeVisible();
    await expect(winner.workspace).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(winner.workspace).toHaveAttribute("data-execution-workspace-session", /.+/u);
    await expect(winner.composer).toHaveValue("");
    await expect(loser.page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
    await expect(loser.workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    await expect(loser.workspace).not.toHaveAttribute(
      "data-execution-workspace-session",
      /.+/u,
    );
    await expect(loser.composer).toHaveValue(loser.draft);

    await winner.page.getByRole("button", { name: "Cancel run" }).click();
    await expect.poll(async () => {
      const process = (await readProgramDataProjectionV1(page, programId, processId)).process;
      return process === null ? null : {
        activeAttempt: process.activeAttempt,
        lastTerminalAttempt: process.lastTerminalAttempt,
      };
    }).toMatchObject({
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: activeAttempt.attemptId,
        generation: activeAttempt.generation,
        outcome: "cancelled",
      },
    });
    for (const idle of candidates) {
      await expect(idle.composer).toBeEnabled({ timeout: 25_000 });
      await expect(idle.workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    }
    // The former winner intentionally retains its closed receipt descriptor;
    // the admission loser still has no session because it never ran.
    await expect(loser.workspace).not.toHaveAttribute(
      "data-execution-workspace-session",
      /.+/u,
    );
    await expect(loser.composer).toHaveValue(loser.draft);

    // The exact losing draft is still actionable after the winner's terminal.
    await loser.send.click();
    await expect(loser.page.locator('[data-pi-agent-run-status="running"]')).toBeVisible({
      timeout: 25_000,
    });
    await expect(loser.workspace).toHaveAttribute("data-execution-workspace-state", "open");
    await expect(loser.workspace).toHaveAttribute("data-execution-workspace-session", /.+/u);
    await expect(loser.composer).toHaveValue("");
    await expect(
      loser.page.locator('[data-chat-role="user"]').getByText(loser.draft, { exact: true }),
    ).toBeVisible();
    await loser.page.getByRole("button", { name: "Cancel run" }).click();
    await expect(loser.workspace).toHaveAttribute("data-execution-workspace-state", "closed", {
      timeout: 25_000,
    });
    await contenderPage.close();
  },
);

test(
  "@p4a a held Workspace prevents false expiry settlement and release recovers passively",
  async ({ durableProgramPage: page }) => {
    test.setTimeout(150_000);
    const firstWorkspace = await openTranslationWorkspaceV1(page);
    const programId = await readProgramIdV1(firstWorkspace);
    const processId = await firstWorkspace.getAttribute("data-process-id");
    if (processId === null) throw new Error("P4-A Program omitted its Process identity");

    const passivePage = await page.context().newPage();
    await passivePage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramLibraryV1(passivePage);
    await launchCreatorFromLibraryV1(passivePage);
    await initializePiTestV1(passivePage, "sillyos-p4a-expired-passive");
    const passiveWorkspace = await openRecentTranslationProgramV1(passivePage, {
      programId,
      revision: 1,
      status: "Preview",
    });
    for (const workspace of [firstWorkspace, passiveWorkspace]) {
      await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    }

    const base = await readP4aProcessLeaseRaceBaseV1(page, processId);
    const holderSessionId = await holdP4aWorkspaceV1(page, {
      processId,
      workspaceId: base.startingCheckpoint.workspaceId,
    });
    expect(holderSessionId.length).toBeGreaterThan(0);
    let holdReleased = false;
    try {
      const contender: P4aProcessLeaseContenderV1 = {
        ownerInstanceId: "owner.p4a.expired",
        attemptId: "attempt.p4a.expired",
        operationId: "commit.p4a.expired",
        triggerEntryId: "entry.p4a.expired",
      };
      const acquired = await acquireP4aProcessLeaseV1(page, base, contender, 1_500);
      expect(acquired).toMatchObject({
        kind: "committed",
        processRevision: base.expectedProcessRevision + 1,
        transcriptFrontier: base.expectedTranscriptFrontier + 1,
      });
      if (acquired.lease === null) throw new Error("expired lease fixture omitted its lease");

      const trigger = `[data-transcript-entry-id="${contender.triggerEntryId}"]`;
      await Promise.all([
        expect(page.locator(trigger)).toBeVisible({ timeout: 25_000 }),
        expect(passivePage.locator(trigger)).toBeVisible({ timeout: 25_000 }),
      ]);
      const passiveMonitorIntervalMilliseconds = await page.evaluate(async (moduleUrl) => {
        const module = await import(moduleUrl) as {
          readonly creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1: number;
        };
        return module.creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1;
      }, "/programs/creator/runtime/creator-controller.ts");
      await page.waitForTimeout(
        Math.max(0, acquired.lease.expiresAt - Date.now()) +
          passiveMonitorIntervalMilliseconds + 1_000,
      );

      // Lease expiry itself is deliberately not a Process revision. Controller
      // unit coverage proves that an expired monitor pass receives
      // workspace_busy here; E2E deliberately makes no claim about a hidden
      // poll count. It proves the user-visible invariants across that busy
      // window: no false terminal, and automatic recovery after release.
      const stillPending = await readProgramDataProjectionV1(page, programId, processId);
      expect(stillPending.process).toMatchObject({
        revision: base.expectedProcessRevision + 1,
        transcriptFrontier: base.expectedTranscriptFrontier + 1,
        status: "active",
        activeAttempt: {
          attemptId: contender.attemptId,
          generation: base.generation,
          triggerEntryId: contender.triggerEntryId,
        },
      });

      await releaseP4aWorkspaceHoldV1(page);
      holdReleased = true;
      const interruptedEntryId = `${contender.attemptId}.interrupted`;
      for (const productPage of [page, passivePage]) {
        const workspace = productPage === page ? firstWorkspace : passiveWorkspace;
        await expect(workspace).toHaveAttribute(
          "data-process-status",
          "interrupted_retryable",
          { timeout: 25_000 },
        );
        await expect(
          productPage.locator(`[data-transcript-entry-id="${interruptedEntryId}"]`),
        ).toBeVisible({ timeout: 25_000 });
        await expect(
          productPage.getByRole("button", { name: "Retry interrupted run" }),
        ).toBeVisible();
        await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
      }
      const recovered = await readProgramDataProjectionV1(page, programId, processId);
      expect(recovered.process).toMatchObject({
        revision: base.expectedProcessRevision + 2,
        transcriptFrontier: base.expectedTranscriptFrontier + 2,
        status: "interrupted_retryable",
        activeAttempt: null,
        lastTerminalAttempt: {
          attemptId: contender.attemptId,
          generation: base.generation,
          outcome: "interrupted",
          interruptionDisposition: "retryable",
        },
      });
    } finally {
      if (!holdReleased) await releaseP4aWorkspaceHoldV1(page).catch(() => undefined);
      await passivePage.close();
    }
  },
);

test("a second page cold-reopens the durable winner without preclaiming its Workspace", async ({ durableProgramPage: page }) => {
  const firstWorkspace = await openTranslationWorkspaceV1(page);
  const programId = await readProgramIdV1(firstWorkspace);

  const secondPage = await page.context().newPage();
  await secondPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(secondPage);
  await launchCreatorFromLibraryV1(secondPage);
  await initializePiTestV1(secondPage, "sillyos-workspace-contender-key");
  const secondWorkspace = await openRecentTranslationProgramV1(secondPage, {
    programId,
    revision: 1,
    status: "Preview",
  });

  const first = { page, workspace: firstWorkspace };
  const second = { page: secondPage, workspace: secondWorkspace };
  for (const idle of [first, second]) {
    await expect(idle.workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    await expect(idle.page.getByRole("textbox", { name: "Ask for a change…" })).toBeEnabled();
  }

  const winningFollowUp = "Preserve the winner selected by the first page.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(winningFollowUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expectCreatorStorageReadyV1(page);
  await expect(firstWorkspace).toHaveAttribute("data-program-revision", "2");
  await expect(firstWorkspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(secondWorkspace).toHaveAttribute("data-program-revision", "2", {
    timeout: 25_000,
  });
  await expect(secondPage.getByText(winningFollowUp, { exact: true })).toBeVisible({
    timeout: 25_000,
  });

  await secondPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(secondPage);
  await launchCreatorFromLibraryV1(secondPage);
  await initializePiTestV1(secondPage, "sillyos-stale-contender-reopen-key");
  const reopened = await openRecentTranslationProgramV1(secondPage, {
    programId,
    revision: 2,
    status: "Preview",
  });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(secondPage.getByRole("textbox", { name: "Ask for a change…" })).toBeEnabled();
  await expect(secondPage.getByText(winningFollowUp, { exact: true })).toBeVisible();
  await secondPage.close();
});

test("@s1a-ordinary the query-gated Browser Pi Worker uses and cold-reopens the independent Workspace Sandbox without retaining its test key", async ({ durableProgramPage: page }) => {
  const sentinel = "sillyos-browser-pi-sentinel-key";
  const observedNetwork: string[] = [];
  const observedConsole: string[] = [];
  page.on("request", (request) => {
    observedNetwork.push(
      `${request.url()}\n${request.postData() ?? ""}\n${JSON.stringify(request.headers())}`,
    );
  });
  page.on("console", (message) => observedConsole.push(message.text()));

  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(page.getByRole("heading", { name: "What would you like to make?", level: 1 }))
    .toBeVisible();
  await expect(page.getByText("Browser Pi wiring check", { exact: true })).toBeVisible();

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await expect(page.getByRole("button", { name: "Create program" })).toBeDisabled();
  await creatorIntent.press("Enter");
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "SillyOS program workspace" })).toHaveCount(0);

  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(keyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  const programId = await readProgramIdV1(workspace);
  const processId = await workspace.getAttribute("data-process-id");
  if (processId === null) throw new Error("Ordinary Program omitted its Process identity");

  const followUp = "Make every review decision explicit.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(followUp);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ).last(),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceRoundTripPathV1,
  );
  const firstWorkspaceSessionId = await readWorkspaceSessionIdV1(workspace);
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Ordinary Program lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);

  await expect(workspace).toHaveAttribute("data-program-revision", "2");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Deterministic test wiring", { exact: true })).toBeVisible();
  await expect(page.getByText("Program workspace checkpoint", { exact: true })).toBeVisible();
  await expect(page.getByText("Closed · generation 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Last write: succeeded / changed", { exact: false })).toBeVisible();

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await expect(page.getByRole("heading", { name: "Recent programs", level: 2 })).toBeVisible();

  const recentProgram = creatorProgramCardV1(page, "Translation Workshop");
  const editProgram = recentProgram.getByRole("button", {
    name: "Edit program: Translation Workshop",
    exact: true,
  });
  await expect(recentProgram).toHaveAttribute("data-program-id", programId);
  await expect(recentProgram).toContainText("v2 · Preview");
  await expect(editProgram).toBeEnabled();

  const reloadedKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await reloadedKeyInput.fill(sentinel);
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(reloadedKeyInput).toHaveValue("");
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopenedWorkspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(page.getByText(followUp, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  const persistenceProbe = `Verify the persisted workspace contains exactly: ${followUp}`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(persistenceProbe);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(persistenceProbe, { exact: true })).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopenedWorkspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(reopenedWorkspace).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  const reopenedWorkspaceSessionId = await readWorkspaceSessionIdV1(reopenedWorkspace);
  expect(reopenedWorkspaceSessionId).not.toBe(firstWorkspaceSessionId);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, followUp);

  await expect(reopenedWorkspace).toHaveAttribute("data-program-revision", "3");
  await expect(page.getByRole("tab", { name: "Source" })).toHaveCount(0);

  const completedProjection = await readProgramDataProjectionV1(page, programId, processId);
  expect(completedProjection.catalog?.head).toMatchObject({
    schemaVersion: 1,
    programId,
    currentProgramRevision: 3,
  });
  expect(completedProjection.process).toMatchObject({
    schemaVersion: 1,
    processId,
    status: "active",
    activeAttempt: null,
    lastTerminalAttempt: {
      generation: 2,
      outcome: "completed",
      interruptionDisposition: null,
    },
  });
  const textTranscript = completedProjection.transcriptEntries.flatMap((entry) =>
    entry.parts.flatMap((part) =>
      part.kind === "text_markdown" && typeof part.markdown === "string"
        ? [{ role: entry.role, text: part.markdown }]
        : []
    )
  );
  expect(textTranscript).toContainEqual({ role: "user", text: followUp });
  expect(textTranscript).toContainEqual({
    role: "assistant",
    text: "Deterministic test proposal ready.",
  });
  expect(textTranscript).toContainEqual({ role: "user", text: persistenceProbe });

  const browserVisibleProjection = await page.evaluate(async () => {
    const storageValues = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    const cacheValues: string[] = [];
    if ("caches" in globalThis) {
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const request of await cache.keys()) {
          cacheValues.push(request.url);
          const response = await cache.match(request);
          if (response !== undefined) cacheValues.push(await response.clone().text());
        }
      }
    }
    return JSON.stringify({
      url: location.href,
      document: document.documentElement.outerHTML,
      storageValues,
      cacheValues,
    });
  });
  expect(JSON.stringify(completedProjection)).not.toContain(sentinel);
  expect(browserVisibleProjection).not.toContain(sentinel);
  expect(observedNetwork.join("\n")).not.toContain(sentinel);
  expect(observedConsole.join("\n")).not.toContain(sentinel);

  await page.getByRole("button", { name: "Forget test key" }).click();
  await expect(page.getByRole("button", { name: "Forget test key" })).toHaveCount(0);

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  const replacementKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await replacementKeyInput.fill("sillyos-browser-pi-reinitialize-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();
  const replacedWorkspace = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 3,
    status: "Preview",
  });
  await expect(replacedWorkspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(replacedWorkspace).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  await returnToCreatorHomeV1(page);
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
});

test("@s1b-edit the pinned native Pi edit tool changes and cold-reopens exact Sandbox bytes", async ({ durableProgramPage: page }) => {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-edit-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);

  const editText = `${deterministicEditProbePrefixV1}keep this exact edited file.`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(editText);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(editText, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "3");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "edit");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceRoundTripPathV1,
  );
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Edit proof lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, editText);

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-edit-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, editText);
});

test("@s1b-bash the pinned native Pi bash tool changes and cold-reopens exact Sandbox bytes", async ({ durableProgramPage: page }) => {
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-bash-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);

  const bashPrompt = `${deterministicBashProbePrefixV1}write and search one exact file.`;
  const bashText = "SillyOS native bash checkpoint\n";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(bashPrompt);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(bashPrompt, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "3");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    ordinaryWorkspaceBashRoundTripPathV1,
  );
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Bash proof lost its Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(
    page,
    continuation,
    bashText,
    ordinaryWorkspaceBashRoundTripPathV1,
  );

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-bash-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expectOrdinaryWorkspaceSandboxV1(
    page,
    continuation,
    bashText,
    ordinaryWorkspaceBashRoundTripPathV1,
  );
});

test("@s2-file-ops Pi native bash preserves the exact workspace file lifecycle across cold reopen", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-file-ops-sentinel-key");

  const creatorIntent = page.getByRole("textbox", { name: "What would you like to make?" });
  await creatorIntent.fill(translationIntentV1);
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);

  const fileOpsPrompt =
    `${deterministicFileOpsProbePrefixV1}prove mkdir, touch, cp, mv, rm, and find-delete.`;
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(fileOpsPrompt);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(fileOpsPrompt, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "22");
  await expect(workspace).toHaveAttribute("data-execution-workspace-receipt", "1");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "bash");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-path", ".sillyos");
  await expect(workspace).toHaveAttribute("data-workspace-review-pending-generation", "22");

  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) {
    throw new Error("File-operations proof lost its Workspace continuation");
  }
  const inspectedPaths = [
    ".sillyos/file-ops/moved.txt",
    ".sillyos/file-ops/kept-empty.txt",
    ".sillyos/file-ops/copied-tree/nested",
    ".sillyos/file-ops/source",
    ".sillyos/file-ops/copied-tree/nested/source.txt",
    ".sillyos/file-ops/copied-tree/nested/empty.txt",
  ] as const;
  const expectedEntries = {
    ".sillyos/file-ops/moved.txt": {
      kind: "file",
      size: new TextEncoder().encode("SillyOS workspace file operations\n").byteLength,
      text: "SillyOS workspace file operations\n",
    },
    ".sillyos/file-ops/kept-empty.txt": { kind: "file", size: 0, text: "" },
    ".sillyos/file-ops/copied-tree/nested": { kind: "directory", size: 0, text: null },
    ".sillyos/file-ops/source": { kind: "missing", size: 0, text: null },
    ".sillyos/file-ops/copied-tree/nested/source.txt": {
      kind: "missing",
      size: 0,
      text: null,
    },
    ".sillyos/file-ops/copied-tree/nested/empty.txt": {
      kind: "missing",
      size: 0,
      text: null,
    },
  } satisfies Readonly<Record<string, SandboxWorkspaceEntryInspectionV1>>;
  await expect.poll(() => inspectSandboxWorkspaceEntriesV1(page, continuation, inspectedPaths))
    .toEqual(expectedEntries);

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, "sillyos-browser-pi-file-ops-sentinel-key");
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  const reopened = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  await expect(reopened).toHaveAttribute("data-workspace-review-pending-generation", "22");
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expect.poll(() => inspectSandboxWorkspaceEntriesV1(page, continuation, inspectedPaths))
    .toEqual(expectedEntries);
});

test("@s1a-ordinary an active Process becomes read-only in another page and its successor reopens exact Sandbox bytes", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  await openCreatorHomeV1(page);
  await initializePiTestV1(page, "sillyos-first-owner-bootstrap");
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const initialWorkspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(initialWorkspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(initialWorkspace);
  const initialContinuation = await readWorkspaceContinuationV1(page, programId);
  if (initialContinuation === null) {
    throw new Error("Initial Program has no Workspace continuation");
  }
  expect(initialContinuation).toMatchObject({
    revision: 1,
    programId,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  });
  await returnToCreatorHomeV1(page);

  const contenderPage = await page.context().newPage();
  await Promise.all([
    page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test")),
    contenderPage.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test")),
  ]);
  await Promise.all([
    expectProgramLibraryV1(page),
    expectProgramLibraryV1(contenderPage),
  ]);
  await Promise.all([
    launchCreatorFromLibraryV1(page),
    launchCreatorFromLibraryV1(contenderPage),
  ]);
  await Promise.all([
    initializePiTestV1(page, "sillyos-first-owner-a"),
    initializePiTestV1(contenderPage, "sillyos-first-owner-b"),
  ]);

  const firstRecent = creatorProgramCardV1(page, "Translation Workshop").getByRole("button", {
    name: "Edit program: Translation Workshop",
    exact: true,
  });
  const secondRecent = creatorProgramCardV1(contenderPage, "Translation Workshop").getByRole(
    "button",
    {
      name: "Edit program: Translation Workshop",
      exact: true,
    },
  );
  await Promise.all([expect(firstRecent).toBeEnabled(), expect(secondRecent).toBeEnabled()]);
  await Promise.all([firstRecent.click(), secondRecent.click()]);

  const first = {
    page,
    workspace: page.getByRole("main", { name: "SillyOS program workspace" }),
  };
  const second = {
    page: contenderPage,
    workspace: contenderPage.getByRole("main", { name: "SillyOS program workspace" }),
  };
  await Promise.all([
    expect(first.workspace).toBeVisible(),
    expect(second.workspace).toBeVisible(),
  ]);
  for (const idle of [first, second]) {
    await expect(idle.workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    await expect(idle.page.getByRole("textbox", { name: "Ask for a change…" })).toBeEnabled();
  }

  const durableText =
    "Hold this deterministic run until cancelled: retain exact bytes for Sandbox handoff.";
  await first.page.getByRole("textbox", { name: "Ask for a change…" }).fill(durableText);
  await first.page.getByRole("button", { name: "Send" }).click();
  await expect(first.page.locator('[data-pi-agent-run-status="running"]')).toBeVisible();
  await expect(first.workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(first.workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(first.workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(first.workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  const ownerSessionId = await readWorkspaceSessionIdV1(first.workspace);
  await expect(second.page.getByText(durableText, { exact: true })).toBeVisible({
    timeout: 25_000,
  });
  // The second page is read-only because it observes the active Process. The
  // real two-Send Workspace admission race is qualified by the P4-A test above.
  await expect(second.page.getByRole("textbox", { name: "Ask for a change…" })).toBeDisabled();
  await expectOrdinaryWorkspaceSandboxV1(first.page, initialContinuation, durableText);

  await first.page.getByRole("button", { name: "Cancel run" }).click();
  await expect(first.workspace).toHaveAttribute("data-execution-workspace-state", "closed", {
    timeout: 25_000,
  });
  await expect(second.page.getByRole("textbox", { name: "Ask for a change…" })).toBeEnabled({
    timeout: 25_000,
  });
  expect(await readWorkspaceContinuationV1(first.page, programId)).toEqual(initialContinuation);

  await second.page.reload();
  await expectProgramLibraryV1(second.page);
  await launchCreatorFromLibraryV1(second.page);
  await initializePiTestV1(second.page, "sillyos-recovery-successor");
  const recovered = await openRecentTranslationProgramV1(second.page, {
    programId,
    revision: 1,
    status: "Preview",
  });
  await expect(recovered).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  expect(await readWorkspaceContinuationV1(second.page, programId)).toEqual(initialContinuation);
  await expectOrdinaryWorkspaceSandboxV1(second.page, initialContinuation, durableText);

  const verify = "Verify the persisted workspace contains exactly: " + durableText;
  await second.page.getByRole("textbox", { name: "Ask for a change…" }).fill(verify);
  await second.page.getByRole("button", { name: "Send" }).click();
  await expect(second.page.getByText(verify, { exact: true })).toBeVisible();
  await expect(second.page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(recovered).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(recovered).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(recovered).not.toHaveAttribute("data-execution-workspace-receipt", /.+/u);
  expect(await readWorkspaceSessionIdV1(recovered)).not.toBe(ownerSessionId);
  await expectOrdinaryWorkspaceSandboxV1(second.page, initialContinuation, durableText);
  await contenderPage.close();
});

test("Playwright WebKit's non-persistent context reports unavailable OPFS without substituting a workspace", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "This is a WebKit runner-context characterization.");
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, "sillyos-webkit-nonpersistent-context");

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const failedProgramSurface = page.locator('[data-program-storage-state="failed"]');
  await expect(failedProgramSurface).toBeVisible();
  await expect(failedProgramSurface).toHaveAttribute(
    "data-program-storage-operation",
    "create",
  );
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.getByRole("main", { name: "SillyOS program workspace" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit program: Translation Workshop", exact: true }),
  ).toHaveCount(0);
  await expect(readProgramCatalogSummariesV1(page)).resolves.toEqual([]);
});

test(
  "@s1a-ordinary an accepted Program cancels before download authorization, then exports its generation 2 snapshot",
  async ({ durableProgramPage: page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
    await expectProgramLibraryV1(page);
    await launchCreatorFromLibraryV1(page);
    await initializePiTestV1(page, "sillyos-ordinary-snapshot-export");
    await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
      translationIntentV1,
    );
    await page.getByRole("button", { name: "Create program" }).click();
    const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
    await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    const programId = await readProgramIdV1(workspace);

    const snapshotText = "Put these exact ordinary Program bytes into the accepted snapshot.";
    await page.getByRole("textbox", { name: "Ask for a change…" }).fill(snapshotText);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator('[data-pi-agent-run-status="running"]')).toHaveCount(0);
    await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
    await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
    const continuation = await readWorkspaceContinuationV1(page, programId);
    if (continuation === null) throw new Error("Snapshot Program has no Workspace continuation");
    await expectOrdinaryWorkspaceSandboxV1(page, continuation, snapshotText);

    await page.getByRole("button", { name: "Accept program" }).click();
    await expectCreatorStorageReadyV1(page);
    await expect(page.locator('[data-proposal-status="accepted"]')).toBeVisible();
    const accepted = (await readProgramDataProjectionV1(page, programId)).catalog
      ?.latestDecision;
    if (accepted?.status !== "accepted") {
      throw new Error("Ordinary Program has no accepted Workspace snapshot");
    }
    expect(accepted.snapshot).toMatchObject({
      programId,
      workspaceId: continuation.workspaceId,
      volumeId: continuation.volumeId,
      workspaceFormat: 1,
      programRevision: 2,
      generation: 2,
      fileCount: 1,
    });
    await expect(workspace).toHaveAttribute("data-workspace-review-accepted-generation", "2");
    await expect(workspace).toHaveAttribute("data-workspace-review-accepted-file-count", "1");
    await expect(workspace).toHaveAttribute(
      "data-workspace-review-accepted-status",
      "unavailable",
    );

    const exportStatus = page.locator("[data-workspace-export-status]");
    const exportStart = page.locator('[data-workspace-export-action="start"]');
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "idle");
    await expect(exportStart).toBeEnabled();

    let downloadsBeforeAuthorization = 0;
    const captureUnexpectedDownload = (): void => {
      downloadsBeforeAuthorization += 1;
    };
    page.on("download", captureUnexpectedDownload);
    try {
      await page.evaluate(() => {
        const observer = new MutationObserver(() => {
          const cancel = document.querySelector<HTMLButtonElement>(
            '[data-workspace-export-action="cancel"]',
          );
          if (cancel === null || cancel.disabled) return;
          observer.disconnect();
          cancel.click();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      await exportStart.click();
      await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "cancelled");
      await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
      expect(downloadsBeforeAuthorization).toBe(0);
    } finally {
      page.off("download", captureUnexpectedDownload);
    }
    await expect(exportStart).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await exportStart.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("translation-workshop.sillyos.zip");
    await expect(exportStatus).toHaveAttribute(
      "data-workspace-export-status",
      /^(finalizing|download-started)$/,
    );
    const archivePath = testInfo.outputPath("translation-workshop.sillyos.zip");
    await download.saveAs(archivePath);
    expect(await download.failure()).toBeNull();
    await expect(exportStatus).toHaveAttribute("data-workspace-export-status", "download-started");
    await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-completed", "1");
    await expect(exportStatus).toHaveAttribute("data-workspace-export-files-total", "1");
    assertOrdinaryWorkspaceArchiveV1(new Uint8Array(await readFile(archivePath)), {
      programId,
      workspaceId: continuation.workspaceId,
      generation: 2,
      text: snapshotText,
    });
    await expectOrdinaryWorkspaceSandboxV1(page, continuation, snapshotText);

    await returnToCreatorHomeV1(page);
    await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
  },
);

test("@s1a-ordinary a cancelled Browser Pi run retains its Sandbox write and remains terminal across reload", async ({ durableProgramPage: page }) => {
  await page.goto(sillyOsTargetUrlV1("?locale=en&agent=pi-test"));
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  const keyInput = page.getByLabel("Synthetic test key (memory only)");
  await keyInput.fill("sillyos-browser-pi-cancel-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);
  const processId = await workspace.getAttribute("data-process-id");
  if (processId === null) throw new Error("Cancelled Program omitted its Process identity");
  const cancelledText =
    "Hold this deterministic run until cancelled: preserve cancellation as a product receipt.";

  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(cancelledText);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-pi-agent-run-status="running"]')).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "open");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "write");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Cancelled Program has no Workspace continuation");
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, cancelledText);
  await page.getByRole("button", { name: "Cancel run" }).click();

  await expectCreatorStorageReadyV1(page);
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-program-revision", "1");
  await expect(page.getByText(cancelledText, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Creator Agent run was cancelled. The committed request remains in this Process.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(page.getByText("Last write: succeeded / changed", { exact: false })).toBeVisible();
  const cancelledContinuation = await readWorkspaceContinuationV1(page, programId);
  expect(cancelledContinuation).toEqual(continuation);

  await returnToCreatorHomeV1(page);
  await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();
  await expect(page.locator(".silly-os")).toHaveAttribute("data-agent-workspace-state", "closed");
  await expect(page.locator("iframe[data-silly-os-workspace-sandbox='active']")).toHaveCount(1);
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  const reloadedKeyInput = page.getByLabel("Synthetic test key (memory only)");
  await reloadedKeyInput.fill("sillyos-browser-pi-cancel-key");
  await page.getByRole("button", { name: "Initialize Pi test" }).click();
  await expect(page.getByText("Pi test ready", { exact: true })).toBeVisible();

  const reopened = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 1,
    status: "Preview",
  });
  await expect(reopened).toHaveAttribute("data-program-revision", "1");
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-session", /.+/u);
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(cancelledContinuation);
  await expectOrdinaryWorkspaceSandboxV1(page, continuation, cancelledText);
  await expect(page.getByText(cancelledText, { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Creator Agent run was cancelled. The committed request remains in this Process.",
      { exact: true },
    ),
  ).toBeVisible();

  const cancelledProjection = await readProgramDataProjectionV1(page, programId, processId);
  expect(cancelledProjection.process).toMatchObject({
    schemaVersion: 1,
    processId,
    status: "active",
    activeAttempt: null,
    lastTerminalAttempt: {
      generation: 1,
      outcome: "cancelled",
      interruptionDisposition: null,
    },
  });
  expect(cancelledProjection.transcriptEntries).toContainEqual(
    expect.objectContaining({
      role: "assistant",
      state: "committed",
      parts: [
        expect.objectContaining({
          kind: "text_markdown",
          markdown:
            "Creator Agent run was cancelled. The committed request remains in this Process.",
        }),
      ],
    }),
  );
});

test("desktop workspace keeps its minimum geometry and keyboard-resizable split", async ({ durableProgramPage: page }) => {
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "dual-pane");

  const topbar = page.locator(".program-workspace__topbar");
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const separator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  const topbarBox = await topbar.boundingBox();
  const chatBox = await chat.boundingBox();
  const workpieceBox = await workpiece.boundingBox();

  expect(Math.round(topbarBox?.height ?? 0)).toBe(56);
  expect(chatBox?.width ?? 0).toBeGreaterThanOrEqual(280);
  expect(workpieceBox?.width ?? 0).toBeGreaterThanOrEqual(400);

  const initialWidth = Number(await separator.getAttribute("aria-valuenow"));
  const separatorBox = await separator.boundingBox();
  if (separatorBox === null) throw new TypeError("expected visible Workspace separator");
  await page.mouse.move(
    separatorBox.x + separatorBox.width / 2,
    separatorBox.y + separatorBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(separatorBox.x + 32, separatorBox.y + separatorBox.height / 2);
  await page.mouse.up();
  await expect.poll(async () => Number(await separator.getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(initialWidth + 24);
  const pointerWidth = Number(await separator.getAttribute("aria-valuenow"));
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(pointerWidth + 8));
  await separator.press("Shift+ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(pointerWidth + 40));
  await separator.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "280");

  const resizedWorkpiece = await workpiece.boundingBox();
  expect(resizedWorkpiece?.width ?? 0).toBeGreaterThanOrEqual(400);
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("workspace preserves its responsive geometry across the DS1 viewport matrix", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  const workspace = await openTranslationWorkspaceV1(page);
  const topbar = page.locator(".program-workspace__topbar");
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const toolbar = page.locator(".workpiece-pane__toolbar");
  const separator = page.getByRole("separator", {
    name: "Resize conversation and workpiece panes",
  });
  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  const composer = page.locator(".chat-composer");
  const casesV1 = [
    { width: 1_600, height: 1_000, layout: "dual-pane", topbarHeight: 56 },
    { width: 1_280, height: 800, layout: "dual-pane", topbarHeight: 56 },
    { width: 1_024, height: 520, layout: "dual-pane", topbarHeight: 56 },
    // Half the CSS-pixel viewport is the maintained 200% reflow proxy.
    { width: 800, height: 500, layout: "dual-pane", topbarHeight: 56 },
    { width: 768, height: 700, layout: "dual-pane", topbarHeight: 56 },
    { width: 767, height: 700, layout: "single-pane", topbarHeight: 52 },
    { width: 390, height: 844, layout: "single-pane", topbarHeight: 52 },
    { width: 320, height: 568, layout: "single-pane", topbarHeight: 52 },
  ] as const;

  for (const fixtureV1 of casesV1) {
    await page.setViewportSize({ width: fixtureV1.width, height: fixtureV1.height });
    await expect(workspace).toHaveAttribute("data-workspace-layout", fixtureV1.layout);
    expect(Math.round((await topbar.boundingBox())?.height ?? 0)).toBe(fixtureV1.topbarHeight);
    await expectNoPageOverflowV1(page);

    if (fixtureV1.layout === "dual-pane") {
      await expect(chat).toBeVisible();
      await expect(workpiece).toBeVisible();
      await expect(separator).toBeVisible();
      expect((await chat.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(280);
      expect((await workpiece.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(400);
      expect(Math.round((await separator.boundingBox())?.width ?? 0)).toBe(1);
      expect(Math.round((await toolbar.boundingBox())?.height ?? 0)).toBe(48);
    } else {
      await expect(navigation).toBeVisible();
      await navigation.getByRole("button", { name: "Chat" }).click();
      await expect(chat).toBeVisible();
      await expect(workpiece).toBeHidden();
      for (const buttonV1 of await navigation.getByRole("button").all()) {
        expect((await buttonV1.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await navigation.getByRole("button", { name: "View" }).click();
      await expect(workpiece).toBeVisible();
      expect(Math.round((await toolbar.boundingBox())?.height ?? 0)).toBe(48);
      await expectInsideVisualViewportV1(page, workpiece);
      await navigation.getByRole("button", { name: "Chat" }).click();
    }

    await expectInsideVisualViewportV1(page, composer);
    await expectNoPageOverflowV1(page);
  }
});

test("long bilingual Creator follow-up remains readable and contained", async ({ durableProgramPage: page }) => {
  await page.setViewportSize({ width: 1_280, height: 800 });
  await openTranslationWorkspaceV1(page);
  const textV1 =
    "Keep the English character voice consistent across a deliberately long instruction, 保持中文角色语气和术语一致，and preserve mixed-script identifiers such as station_海边-42 without clipping or forcing page-level horizontal scrolling.";
  await page.getByRole("textbox", { name: "Ask for a change…" }).fill(textV1);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(textV1, { exact: true })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("@ds1-visual Workspace keeps its representative desktop and phone compositions", async (
  { durableProgramPage: page },
  testInfo,
) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(
    ([storageKeyV1, serializedV1]) => {
      localStorage.setItem(storageKeyV1, serializedV1);
    },
    [
      browserProductPreferencesStorageKeyV1,
      JSON.stringify({ revision: 1, locale: "en", theme: "dark" }),
    ] as const,
  );
  await page.setViewportSize({ width: 1_600, height: 1_000 });
  await openTranslationWorkspaceV1(page);
  await page.locator("[data-workspace-review] code").evaluateAll((elementsV1) => {
    for (const elementV1 of elementsV1) {
      elementV1.textContent = "sillyos.fixture.00000000-0000-4000-8000-000000000000";
    }
  });

  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(page, "ds1-desktop-workspace.png");

  await page.setViewportSize({ width: 390, height: 844 });
  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  await navigation.getByRole("button", { name: "Chat" }).click();
  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(page, "ds1-phone-chat.png");

  await navigation.getByRole("button", { name: "View" }).click();
  await settleVisualFixtureV1(page);
  await expectVisualSnapshotV1(page, "ds1-phone-view.png");

  if (testInfo.project.name === "webkit") {
    expect(
      consumeExpectedDurableProgramConsoleErrorsV1(page, webkitScreenshotStyleCspErrorV1),
      "WebKit must report each rejected Playwright screenshot stylesheet",
    ).toBe(3);
    expect(
      consumeExpectedDurableProgramConsoleErrorsV1(
        page,
        webkitScreenshotDefaultStyleCspErrorV1,
      ),
      "WebKit must report both fallback refusals for each screenshot stylesheet",
    ).toBe(6);
  }
});

test("full-screen workpiece exits with Escape and restores focus", async ({ durableProgramPage: page }) => {
  await openTranslationWorkspaceV1(page);
  const enterFullscreen = page.getByRole("button", { name: "Open full screen" });
  await enterFullscreen.focus();
  await enterFullscreen.press("Enter");

  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  const viewport = page.viewportSize();
  const fullscreenBox = await workpiece.boundingBox();
  await expect(page.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  expect(fullscreenBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(fullscreenBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.width ?? 0) - (viewport?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((fullscreenBox?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open full screen" })).toBeFocused();
  await expectNoPageOverflowV1(page);
});

test("@mobile portrait uses one navigable pane without page overflow", async (
  { durableProgramPage: page },
  testInfo,
) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (testInfo.project.name === "mobile-portrait") {
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
  }
  const workspace = await openTranslationWorkspaceV1(page);
  await expect(workspace).toHaveAttribute("data-workspace-layout", "single-pane");

  const navigation = page.getByRole("navigation", { name: "Workspace views" });
  const chat = page.locator('[data-workspace-pane="chat"]');
  const workpiece = page.locator('[data-workspace-pane="workpiece"]');
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "View" }).click();
  await expect(chat).toBeHidden();
  await expect(workpiece).toBeVisible();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "view");
  await expectNoPageOverflowV1(page);

  await page.getByRole("tab", { name: "Capabilities" }).click();
  await expect(workpiece).toHaveAttribute("data-workpiece-tab", "capabilities");
  await expect(page.getByRole("heading", { name: "Capabilities" })).toBeVisible();
  await expectNoPageOverflowV1(page);

  await navigation.getByRole("button", { name: "Chat" }).click();
  await expect(chat).toBeVisible();
  await expect(workpiece).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Ask for a change…" })).toBeVisible();
  await expectNoPageOverflowV1(page);
});

test("the Process network toggle gates fixed Pi fetch_url without per-request approval", async ({ durableProgramPage: page }) => {
  test.setTimeout(120_000);
  const sentinelKey = "sillyos-network-key-must-not-cross-broker";
  const blockedUrl = "https://network-target.test/assets/blocked.txt?source=silly-os";
  const targetUrl = "https://network-target.test/assets/notes.txt?source=silly-os";
  const secondOriginUrl = "https://second-network-target.test/assets/second.txt";
  const coldUrl = "https://second-network-target.test/assets/cold.txt";
  const disabledAgainUrl = "https://network-target.test/assets/disabled-again.txt";
  const targetBody = "SillyOS Browser Broker physical response\n";
  const brokerOrigin = "http://" + sillyOsNetworkBrokerTargetV1.host + ":" +
    String(sillyOsNetworkBrokerTargetV1.port);
  type CapturedBrokerRequestV1 = {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly postData: string | null;
  };
  const targetRequests: CapturedBrokerRequestV1[] = [];

  const fulfillTargetV1 = async (route: Route): Promise<void> => {
    const request = route.request();
    targetRequests.push({
      method: request.method(),
      url: request.url(),
      headers: await request.allHeaders(),
      postData: request.postData(),
    });
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: {
        "access-control-allow-origin": brokerOrigin,
        "cache-control": "no-store",
      },
      body: targetBody,
    });
  };
  await page.route("https://network-target.test/**", fulfillTargetV1);
  await page.route("https://second-network-target.test/**", fulfillTargetV1);
  // Playwright route.fulfill synthesizes a terminal Response and bypasses the
  // Browser's redirect and CORS enforcement. Those negative paths stay in the
  // fetch-adapter contracts until a controlled real HTTPS target is available.

  await openCreatorHomeV1(page);
  await initializePiTestV1(page, sentinelKey);
  await expect(page.locator("iframe[data-silly-os-network-broker='active']")).toHaveCount(1);

  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);
  const processId = await workspace.getAttribute("data-process-id");
  if (processId === null) throw new Error("expected active Process identity");
  const workspaceSessionIds = new Set<string>();
  const rememberWorkspaceSessionV1 = async (): Promise<void> => {
    workspaceSessionIds.add(await readWorkspaceSessionIdV1(workspace));
  };
  const accessToggle = page.getByRole("checkbox", { name: "Allow network access" });
  const composer = page.getByRole("textbox", { name: "Ask for a change…" });

  await expect(accessToggle).not.toBeChecked();
  await expectSillyOsCheckboxRecipeV1(accessToggle);
  await composer.fill(`${deterministicFetchUrlProbePrefixV1}${blockedUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await rememberWorkspaceSessionV1();
  expect(targetRequests).toHaveLength(0);
  await expect(composer).toBeEnabled();

  await accessToggle.click();
  await expect(accessToggle).toBeChecked();
  await expect(accessToggle).toBeEnabled();

  const fetchRequirement = `${deterministicFetchUrlProbePrefixV1}${targetUrl}`;
  await composer.fill(fetchRequirement);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(1);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v3");
  await rememberWorkspaceSessionV1();
  await expect(
    page.locator('[data-chat-role="assistant"]').getByText(
      "Deterministic test proposal ready.",
      { exact: true },
    ).last(),
  ).toBeVisible();

  const [request] = targetRequests;
  expect(request).toBeDefined();
  expect(request).toMatchObject({
    method: "GET",
    url: targetUrl,
    postData: null,
  });
  expect(request?.headers.origin).toBe(brokerOrigin);
  expect(request?.headers.authorization).toBeUndefined();
  expect(request?.headers.cookie).toBeUndefined();
  expect(request?.headers.referer).toBeUndefined();
  expect(JSON.stringify(request)).not.toContain(sentinelKey);

  const afterAllowed = await readProgramDataProjectionV1(page, programId);
  if (afterAllowed.catalog === null) {
    throw new Error("expected durable Program after enabled fetch");
  }
  if (afterAllowed.catalog.head.pendingReviewBinding === null) {
    throw new Error("expected current Workspace identity after enabled fetch");
  }
  const protectedIdentities = [
    programId,
    ...workspaceSessionIds,
    afterAllowed.catalog.head.pendingReviewBinding.workspaceId,
    afterAllowed.catalog.head.pendingReviewBinding.volumeId,
  ];
  for (const identity of protectedIdentities) {
    expect(JSON.stringify(request)).not.toContain(identity);
  }

  await composer.fill(`${deterministicFetchUrlProbePrefixV1}${secondOriginUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(2);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v4");
  await rememberWorkspaceSessionV1();

  const rawAccess = (await readProgramDataProjectionV1(page, programId, processId)).networkAccess;
  expect(rawAccess).toEqual({ revision: 1, processId, enabled: true });
  expect(JSON.stringify(rawAccess)).not.toContain(targetUrl);
  expect(JSON.stringify(rawAccess)).not.toContain(sentinelKey);

  await returnToCreatorHomeV1(page);
  await expectCreatorStorageReadyV1(page);
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, sentinelKey);
  await openRecentTranslationProgramV1(page, {
    programId,
    revision: 4,
    status: "Preview",
  });

  await expect(accessToggle).toBeChecked();
  const reopenedComposer = page.getByRole("textbox", { name: "Ask for a change…" });
  await reopenedComposer.fill(`${deterministicFetchUrlProbePrefixV1}${coldUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => targetRequests.length).toBe(3);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v5");
  await rememberWorkspaceSessionV1();

  await expect(accessToggle).toBeEnabled();
  await accessToggle.click();
  await expect(accessToggle).not.toBeChecked();
  await reopenedComposer.fill(`${deterministicFetchUrlProbePrefixV1}${disabledAgainUrl}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v6");
  await rememberWorkspaceSessionV1();
  expect(targetRequests).toHaveLength(3);

  const allProtectedIdentities = [
    programId,
    ...workspaceSessionIds,
    afterAllowed.catalog.head.pendingReviewBinding.workspaceId,
    afterAllowed.catalog.head.pendingReviewBinding.volumeId,
  ];
  for (const capturedRequest of targetRequests) {
    expect(capturedRequest.method).toBe("GET");
    expect(capturedRequest.postData).toBeNull();
    expect(capturedRequest.headers.origin).toBe(brokerOrigin);
    expect(capturedRequest.headers.authorization).toBeUndefined();
    expect(capturedRequest.headers.cookie).toBeUndefined();
    expect(capturedRequest.headers.referer).toBeUndefined();
    expect(JSON.stringify(capturedRequest)).not.toContain(sentinelKey);
    for (const identity of allProtectedIdentities) {
      expect(JSON.stringify(capturedRequest)).not.toContain(identity);
    }
  }
});
test("@s2-n2 the fixed Pi download streams a 32 MiB response into the durable Program volume", async ({ durableProgramPage: page }) => {
  test.setTimeout(180_000);
  const sentinelKey = "sillyos-download-key-must-not-cross-broker";
  const targetUrl = "https://network-target.test/assets/archive.bin?source=silly-os";
  const targetBytes = Buffer.alloc(32 * 1024 * 1024);
  for (let offset = 0; offset < targetBytes.length; offset += 1) {
    targetBytes[offset] = (offset * 31 + Math.floor(offset / 65_536) * 17 + 7) & 0xff;
  }
  const targetSha256 = createHash("sha256").update(targetBytes).digest("hex");
  const brokerOrigin = "http://" + sillyOsNetworkBrokerTargetV1.host + ":" +
    String(sillyOsNetworkBrokerTargetV1.port);
  const capturedRequests: Array<{
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly postData: string | null;
  }> = [];

  await page.route("https://network-target.test/**", async (route) => {
    const request = route.request();
    capturedRequests.push({
      method: request.method(),
      url: request.url(),
      headers: await request.allHeaders(),
      postData: request.postData(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/octet-stream",
      headers: {
        "access-control-allow-origin": brokerOrigin,
        "cache-control": "no-store",
      },
      body: targetBytes,
    });
  });

  await openCreatorHomeV1(page);
  await initializePiTestV1(page, sentinelKey);
  await page.getByRole("textbox", { name: "What would you like to make?" }).fill(
    translationIntentV1,
  );
  await page.getByRole("button", { name: "Create program" }).click();
  const workspace = page.getByRole("main", { name: "SillyOS program workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  const programId = await readProgramIdV1(workspace);
  const processId = await workspace.getAttribute("data-process-id");
  if (processId === null) throw new Error("expected active Process identity");
  const accessToggle = page.getByRole("checkbox", { name: "Allow network access" });
  await expect(accessToggle).not.toBeChecked();
  await accessToggle.click();
  await expect(accessToggle).toBeChecked();
  await expect(accessToggle).toBeEnabled();

  const requirement = `${deterministicDownloadProbePrefixV1}${targetUrl}`;
  const composer = page.getByRole("textbox", { name: "Ask for a change…" });
  await composer.fill(requirement);
  await page.getByRole("button", { name: "Send" }).click();
  await expect.poll(() => capturedRequests.length).toBe(1);
  await expect(page.locator('[data-proposal-status="pending"]')).toContainText("v2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(workspace).toHaveAttribute("data-execution-workspace-generation", "2");
  await expect(workspace).toHaveAttribute("data-execution-workspace-receipt", "1");
  await expect(workspace).toHaveAttribute("data-execution-workspace-tool", "download");
  await expect(workspace).toHaveAttribute("data-execution-workspace-effect", "changed");
  await expect(workspace).toHaveAttribute(
    "data-execution-workspace-path",
    deterministicDownloadRelativePathV1,
  );
  const workspaceSessionId = await readWorkspaceSessionIdV1(workspace);

  const continuation = await readWorkspaceContinuationV1(page, programId);
  if (continuation === null) throw new Error("Downloaded Program lost its Workspace continuation");
  await expect.poll(() =>
    inspectSandboxWorkspaceFileDigestV1(
      page,
      continuation,
      deterministicDownloadRelativePathV1,
    )
  ).toEqual({ size: targetBytes.length, sha256: targetSha256 });

  const [request] = capturedRequests;
  expect(request).toMatchObject({ method: "GET", url: targetUrl, postData: null });
  expect(request?.headers.origin).toBe(brokerOrigin);
  expect(request?.headers.authorization).toBeUndefined();
  expect(request?.headers.cookie).toBeUndefined();
  expect(request?.headers.referer).toBeUndefined();
  expect(JSON.stringify(request)).not.toContain(sentinelKey);
  expect(JSON.stringify(request)).not.toContain(programId);
  expect(JSON.stringify(request)).not.toContain(workspaceSessionId);

  const rawAccess = (await readProgramDataProjectionV1(page, programId, processId)).networkAccess;
  expect(rawAccess).toEqual({ revision: 1, processId, enabled: true });
  expect(JSON.stringify(rawAccess)).not.toContain(targetUrl);
  expect(JSON.stringify(rawAccess)).not.toContain(sentinelKey);

  await returnToCreatorHomeV1(page);
  await expectCreatorStorageReadyV1(page);
  await page.reload();
  await expectProgramLibraryV1(page);
  await launchCreatorFromLibraryV1(page);
  await initializePiTestV1(page, sentinelKey);
  const reopened = await openRecentTranslationProgramV1(page, {
    programId,
    revision: 2,
    status: "Preview",
  });
  await expect(reopened).toHaveAttribute("data-execution-workspace-state", "closed");
  await expect(reopened).not.toHaveAttribute("data-execution-workspace-generation", /.+/u);
  await expect(accessToggle).toBeChecked();
  expect(await readWorkspaceContinuationV1(page, programId)).toEqual(continuation);
  await expect.poll(() =>
    inspectSandboxWorkspaceFileDigestV1(
      page,
      continuation,
      deterministicDownloadRelativePathV1,
    )
  ).toEqual({ size: targetBytes.length, sha256: targetSha256 });
});
