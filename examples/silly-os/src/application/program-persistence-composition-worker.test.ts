// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramDataRepositoryV1 as createBrowserCoreProgramDataRepositoryV1,
  type ProgramDataRepositoryWorkerLikeV1,
} from "./persistence/browser-program-data-repository.ts";
import { createIndexedDbProgramDataRepositoryV1 } from "./persistence/indexeddb-program-data-repository.ts";
import { indexedDbCreatorPersistenceFacetV1 } from "../../programs/creator/persistence/creator-persistence-facet-descriptor.ts";
import { indexedDbTranslationPersistenceFacetV1 } from "../../programs/translation/persistence/translation-persistence-facet-descriptor.ts";
import {
  normalizeTranslationWorksetFinalizeExecutionBundleInputV1,
  type TranslationProgramDataRepositoryV1,
  type TranslationWorksetFinalizeExecutionBundleInputV1,
} from "../../programs/translation/persistence/translation-persistence-contract.ts";
import { createTranslationProgramDataRepositoryV1 } from "../../programs/translation/persistence/translation-program-data-repository.ts";
import type {
  ProgramCatalogCreateInputV1,
  ProgramCatalogReviewedWorkspaceV1,
} from "../../programs/creator/runtime/program-catalog-repository.ts";
import { createCreatorProgramDataRepositoryV1 } from "../../programs/creator/persistence/creator-program-data-repository.ts";
import type {
  CreatorProgramDataRepositoryV1,
  CreatorProgramProcessCreateBundleInputV1,
  CreatorProgramProcessDecisionBundleInputV1,
  CreatorProgramProcessRevisionBundleInputV1,
} from "../../programs/creator/persistence/creator-persistence-contract.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
  type ProcessWorkspaceCreateBundleInputV1,
} from "./persistence/program-data-repository.ts";
import {
  admitProgramDataRepositoryWorkerRequestEnvelopeV1,
  admitProgramDataRepositoryWorkerResponseEnvelopeV1,
  createProgramDataRepositoryWorkerResponseExpectationV1,
  type ProgramDataRepositoryWorkerRequestV1,
  type ProgramDataRepositoryWorkerResponseEnvelopeV1,
} from "./persistence/program-data-repository-worker-protocol.ts";
import { createProgramDataRepositoryWorkerRuntimeV1 } from "./persistence/program-data-repository-worker-runtime.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseV1,
} from "../program-platform/process/process-execution-repository.ts";
import {
  transcriptEntryUtf8ByteLengthV1,
  type ProcessCheckpointV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "../program-platform/process/program-process-repository.ts";
import type { InstalledProgramPackageReferenceV1 } from "../program-platform/package/program-package-archive.ts";
import type { PreviewProgramV1 } from "../../programs/creator/runtime/contracts.ts";
import type { CreatorWorkspaceSnapshotReceiptV1 } from "../../programs/creator/runtime/creator-workspace-review.ts";

type ProgramPersistenceCompositionTestRepositoryV1 =
  & TranslationProgramDataRepositoryV1
  & CreatorProgramDataRepositoryV1
  & ProgramProcessRepositoryV1;

function createProgramPersistenceCompositionTestRepositoryV1(
  options: Parameters<typeof createIndexedDbProgramDataRepositoryV1>[0],
): ProgramPersistenceCompositionTestRepositoryV1 {
  const repository = createIndexedDbProgramDataRepositoryV1({
    ...options,
    facets: [indexedDbCreatorPersistenceFacetV1, indexedDbTranslationPersistenceFacetV1],
  });
  return createTranslationProgramDataRepositoryV1(
    createCreatorProgramDataRepositoryV1(repository),
  ) as ProgramPersistenceCompositionTestRepositoryV1;
}

interface WorkerMessageEventV1 {
  readonly data: unknown;
}

function createBrowserProgramDataRepositoryV1(
  options: Parameters<typeof createBrowserCoreProgramDataRepositoryV1>[0],
) {
  return createTranslationProgramDataRepositoryV1(
    createCreatorProgramDataRepositoryV1(createBrowserCoreProgramDataRepositoryV1(options)),
  ) as TranslationProgramDataRepositoryV1 & CreatorProgramDataRepositoryV1;
}

class FakeProgramDataRepositoryWorkerV1 implements ProgramDataRepositoryWorkerLikeV1 {
  readonly messageListeners = new Set<(event: WorkerMessageEventV1) => void>();
  readonly errorListeners = new Set<() => void>();
  readonly messageErrorListeners = new Set<() => void>();
  readonly postMessageSpy = vi.fn<(message: unknown) => void>();
  terminated = false;
  receive: (message: unknown) => void = () => undefined;
  onTerminate: () => void = () => undefined;

  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV1) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: WorkerMessageEventV1) => void);
    } else if (type === "error") this.errorListeners.add(listener as () => void);
    else this.messageErrorListeners.add(listener as () => void);
  }

  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV1) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: WorkerMessageEventV1) => void);
    } else if (type === "error") this.errorListeners.delete(listener as () => void);
    else this.messageErrorListeners.delete(listener as () => void);
  }

  postMessage(message: unknown): void {
    this.postMessageSpy(message);
    this.receive(message);
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.onTerminate();
  }

  emitMessage(message: unknown): void {
    for (const listener of this.messageListeners) listener({ data: message });
  }

  emitError(): void {
    for (const listener of this.errorListeners) listener();
  }
}

function createTestProgramDataRepositoryV1(input: {
  readonly indexedDB?: IDBFactory;
  readonly databaseName?: string;
  readonly beforeDispose?: () => Promise<void>;
} = {}) {
  const repository = createProgramPersistenceCompositionTestRepositoryV1({
    indexedDB: input.indexedDB ?? new IDBFactory(),
    keyRange: IDBKeyRange,
    databaseName: input.databaseName ?? "sillyos.program-data.worker-test",
  });
  if (input.beforeDispose === undefined) return repository;
  return {
    ...repository,
    async dispose() {
      await input.beforeDispose?.();
      await repository.dispose();
    },
  };
}

function createLoopbackWorkerV1(input: {
  readonly repository: ProgramDataRepositoryV1;
  readonly throwResponse?: (message: ProgramDataRepositoryWorkerResponseEnvelopeV1) => boolean;
}) {
  const worker = new FakeProgramDataRepositoryWorkerV1();
  const runtime = createProgramDataRepositoryWorkerRuntimeV1({
    repository: input.repository,
    postMessage: (message) => {
      if (input.throwResponse?.(message) === true) throw new Error("synthetic response loss");
      queueMicrotask(() => worker.emitMessage(message));
    },
    onFatalError: () => queueMicrotask(() => worker.emitError()),
  });
  worker.receive = (message) => runtime.receive(message);
  worker.onTerminate = () => {
    void runtime.dispose();
  };
  return { worker, runtime };
}

function programV1(programId: string, revision = 1): PreviewProgramV1 {
  return {
    programId,
    revision,
    kind: "translation",
    name: `Translator ${String(revision)}`,
    purpose: "Translate workspace content with review.",
    requirements: ["Preserve terminology."],
    suggestedCapabilities: [{
      capabilityId: "capability.translate",
      label: "Translate",
      description: "Translate admitted workspace content.",
    }],
  };
}

function packageReferenceV1(programId: string): InstalledProgramPackageReferenceV1 {
  return {
    programId,
    packageVersion: "1.0.0",
    contentDigest: "a".repeat(64),
  };
}

function reviewedWorkspaceV1(
  programId: string,
  processId = `process.${programId}`,
  generation = 1,
): ProgramCatalogReviewedWorkspaceV1 {
  return {
    processId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    checkpointId: `checkpoint.${programId}.${String(generation)}`,
    generation,
  };
}

function createInputV1(programId: string): ProgramCatalogCreateInputV1 {
  return {
    commitId: `commit.${programId}.create`,
    program: programV1(programId),
    proposalId: `proposal.${programId}.1`,
    reviewedWorkspace: reviewedWorkspaceV1(programId),
    updatedAt: 1,
  };
}

function createBundleV1(
  programId: string,
  processId: string,
): CreatorProgramProcessCreateBundleInputV1 {
  const workspace = {
    revision: 1 as const,
    processId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1 as const,
  };
  return {
    catalog: {
      ...createInputV1(programId),
      reviewedWorkspace: reviewedWorkspaceV1(programId, processId),
    },
    process: {
      processId,
      programPackage: packageReferenceV1("sillyos.creator"),
      subjectProgramId: programId,
      createdAt: 1,
    },
    workspace,
    transcript: {
      processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: `commit.${processId}.create-transcript`,
      attemptBinding: null,
      entries: [entryV1({ processId, sequence: 1, role: "user" })],
      checkpoint: {
        checkpointId: `process-checkpoint.${processId}.1`,
        throughSequence: 1,
        workspaceId: workspace.workspaceId,
        workspaceCheckpointId: `checkpoint.${programId}.1`,
        workspaceGeneration: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: 2,
    },
  };
}

function processWorkspaceBundleV1(
  processId: string,
  subjectProgramId = "program.translation",
): ProcessWorkspaceCreateBundleInputV1 {
  return {
    process: {
      processId,
      programPackage: packageReferenceV1("sillyos.translation"),
      subjectProgramId,
      createdAt: 1,
    },
    workspace: {
      revision: 1,
      processId,
      workspaceId: `workspace.${processId}`,
      volumeId: `volume.${processId}`,
      workspaceFormat: 1,
    },
    transcript: {
      processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: `commit.${processId}.create-workspace`,
      attemptBinding: null,
      entries: [entryV1({ processId, sequence: 1, role: "system" })],
      checkpoint: {
        checkpointId: `process.checkpoint.${processId}.1`,
        throughSequence: 1,
        workspaceId: `workspace.${processId}`,
        workspaceCheckpointId: `workspace.checkpoint.${processId}.1`,
        workspaceGeneration: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: 2,
    },
  };
}

async function acquireTranslationLeaseV1(
  repository: TranslationProgramDataRepositoryV1,
  processId: string,
): Promise<ProcessExecutionLeaseV1> {
  const acquired = await repository.acquireTranslationWorksetImportExecution({
    expectedWorksetRevision: null,
    execution: {
      ownerInstanceId: `owner.${processId}`,
      observedAt: 3,
      expiresAt: 1_000_000,
      attempt: {
        processId,
        expectedProcessRevision: 2,
        expectedTranscriptFrontier: 1,
        commitId: `commit.${processId}.translation-import.acquire`,
        attemptId: `attempt.${processId}.translation-import`,
        generation: 1,
        trigger: {
          kind: "new_entry",
          entry: entryV1({ processId, sequence: 2, role: "user" }),
        },
        startingCheckpoint: {
          checkpointId: `process.checkpoint.${processId}.2`,
          throughSequence: 2,
          workspaceId: `workspace.${processId}`,
          workspaceCheckpointId: `workspace.checkpoint.${processId}.1`,
          workspaceGeneration: 1,
        },
        updatedAt: 3,
      },
    },
  });
  if (acquired.kind === "conflict") throw new Error("expected Translation import lease");
  return acquired.lease;
}

function translationSourceBindingV1(processId: string, path: string) {
  return {
    revision: 1 as const,
    workspaceId: `workspace.${processId}`,
    volumeId: `volume.${processId}`,
    workspaceFormat: 1 as const,
    path,
    checkpointId: `workspace.checkpoint.${processId}.1`,
    generation: 1,
  };
}

function revisionBundleV1(
  programId: string,
  processId: string,
): CreatorProgramProcessRevisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
      commitId: `commit.${programId}.revision.2`,
      program: programV1(programId, 2),
      proposalId: `proposal.${programId}.2`,
      reviewedWorkspace: reviewedWorkspaceV1(programId, processId, 2),
      updatedAt: 3,
    },
    transcript: {
      processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: `commit.${processId}.revision.2`,
      attemptBinding: null,
      entries: [entryV1({ processId, sequence: 2 })],
      checkpoint: {
        checkpointId: `process-checkpoint.${processId}.2`,
        throughSequence: 2,
        workspaceId: `workspace.${programId}`,
        workspaceCheckpointId: `checkpoint.${programId}.2`,
        workspaceGeneration: 2,
      },
      terminalAttemptReceipt: null,
      updatedAt: 4,
    },
  };
}

function decisionBundleV1(
  programId: string,
  processId: string,
): CreatorProgramProcessDecisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 2,
      expectedProposal: { proposalId: `proposal.${programId}.2`, programRevision: 2 },
      commitId: `commit.${programId}.reject.2`,
      status: "rejected",
      updatedAt: 5,
    },
    transcript: {
      processId,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      commitId: `commit.${processId}.reject.2`,
      attemptBinding: null,
      entries: [entryV1({ processId, sequence: 3 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 6,
    },
  };
}

function acceptedDecisionBundleV1(
  programId: string,
  processId: string,
): CreatorProgramProcessDecisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
      commitId: `commit.${programId}.accept.1`,
      status: "accepted",
      snapshotReceipt: acceptedReceiptV1(programId),
      updatedAt: 3,
    },
    transcript: {
      processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: `commit.${processId}.accept.1`,
      attemptBinding: null,
      entries: [entryV1({ processId, sequence: 2 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 4,
    },
  };
}

function acceptedReceiptV1(programId: string): CreatorWorkspaceSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: `snapshot.${programId}.1`,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    publicationId: `proposal.${programId}.1`,
    sourceRevision: 1,
    baseRevision: 1,
    proposalId: `proposal.${programId}.1`,
    programRevision: 1,
    baseRepositoryRevision: 1,
    checkpointId: `checkpoint.${programId}.1`,
    generation: 1,
    fileCount: 2,
    archiveBytes: 128,
  };
}

function checkpointV1(sequence: number, programId?: string): ProcessCheckpointV1 {
  return {
    checkpointId: `process.checkpoint.${String(sequence)}`,
    throughSequence: sequence,
    workspaceId: programId === undefined ? "workspace.process" : `workspace.${programId}`,
    workspaceCheckpointId: programId === undefined
      ? `workspace.checkpoint.${String(sequence)}`
      : `checkpoint.${programId}.1`,
    workspaceGeneration: programId === undefined ? sequence : 1,
  };
}

function entryV1(input: {
  readonly processId: string;
  readonly sequence: number;
  readonly role?: TranscriptEntryV1["role"];
  readonly rich?: boolean;
}): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId: input.processId,
    sequence: input.sequence,
    entryId: `${input.processId}.entry.${String(input.sequence)}`,
    role: input.role ?? "assistant",
    state: "committed",
    parts: input.rich
      ? [
        {
          kind: "reasoning_summary",
          partId: "part.reasoning",
          summaryMarkdown: "Parsed the source.",
        },
        {
          kind: "tool_call",
          partId: "part.call",
          toolCallId: "tool.1",
          toolName: "workspace.read",
          argumentsJson: "{}",
        },
        {
          kind: "tool_status",
          partId: "part.status",
          toolCallId: "tool.1",
          status: "succeeded",
          message: null,
        },
        {
          kind: "tool_result",
          partId: "part.result",
          toolCallId: "tool.1",
          outcome: "succeeded",
          resultJson: '{"lines":12}',
          summaryMarkdown: "Read 12 lines.",
        },
        {
          kind: "artifact_reference",
          partId: "part.artifact",
          artifactId: "artifact.1",
          label: "Translation",
          mediaType: "text/markdown",
          reference: "workspace:/translation.md",
        },
      ]
      : [{
        kind: "text_markdown",
        partId: `${input.processId}.part.${String(input.sequence)}`,
        markdown: input.role === "user" ? "Translate the attached script." : "Done.",
      }],
  };
}

function admitSuccessResponseV1(
  request: ProgramDataRepositoryWorkerRequestV1,
  value: unknown,
) {
  return admitProgramDataRepositoryWorkerResponseEnvelopeV1({
    revision: 1,
    kind: "rpc_response",
    requestId: "request.adversarial",
    record: { kind: "success", method: request.method, value },
  }, createProgramDataRepositoryWorkerResponseExpectationV1(request));
}

async function seedProcessV1(
  repository: ProgramPersistenceCompositionTestRepositoryV1,
  processId: string,
) {
  const created = await repository.createProcess({
    processId,
    programPackage: packageReferenceV1("sillyos.creator"),
    subjectProgramId: "program.worker",
    createdAt: 1,
  });
  if (created.kind !== "committed") throw new Error("expected Process creation");
  return created.process;
}

describe("Program data repository Worker boundary", () => {
  it("round-trips an atomic translation Process Workspace creation", async () => {
    const loopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1(),
    });
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => loopback.worker,
    });
    await repository.initialize();
    await repository.createProgramWithProcess(
      createBundleV1("program.translation", "process.translation-creator-wire"),
    );
    const bundle = processWorkspaceBundleV1("process.translation-wire");
    expect(await repository.createProcessWithWorkspace(bundle)).toMatchObject({
      kind: "committed",
      process: { revision: 2, checkpoint: { throughSequence: 1 } },
      workspace: { volumeId: "volume.process.translation-wire" },
      entries: [{ sequence: 1 }],
    });
    expect(await repository.createProcessWithWorkspace(bundle)).toMatchObject({
      kind: "unchanged",
      workspace: { processId: "process.translation-wire" },
    });
    expect(await repository.loadProcessWorkspaceBinding("process.translation-wire")).toEqual(
      bundle.workspace,
    );
    await repository.dispose();
    await loopback.runtime.dispose();
  });

  it("round-trips Catalog pages, accepted decisions, rich Process transcript, and network state", async () => {
    const loopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1(),
    });
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => loopback.worker,
    });
    await repository.initialize();

    const createBundle = createBundleV1("program.composite-wire", "process.composite-wire");
    expect(await repository.createProgramWithProcess(createBundle)).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 1 } },
      process: { revision: 2, transcriptFrontier: 1 },
    });
    expect(
      await repository.applyProgramRevisionWithProcessTranscript(
        revisionBundleV1("program.composite-wire", "process.composite-wire"),
      ),
    ).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 2 } },
      process: { revision: 3, transcriptFrontier: 2 },
    });
    expect(
      await repository.decideProgramWithProcessTranscript(
        decisionBundleV1("program.composite-wire", "process.composite-wire"),
      ),
    ).toMatchObject({
      kind: "committed",
      record: { head: { repositoryRevision: 3, proposal: { status: "rejected" } } },
      process: { revision: 4, transcriptFrontier: 3 },
    });
    expect(await repository.createProgramWithProcess(createBundle)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 3 } },
      process: { revision: 4, transcriptFrontier: 3 },
      entries: [{ sequence: 1 }],
    });

    const workerBundle = createBundleV1("program.worker", "process.worker");
    const created = await repository.createProgramWithProcess(workerBundle);
    expect(created.kind).toBe("committed");
    const accepted = await repository.decideProgramWithProcessTranscript(
      acceptedDecisionBundleV1("program.worker", "process.worker"),
    );
    expect(accepted.kind).toBe("committed");
    expect(
      (await repository.listPrograms({ before: null, maximumBytes: 1024 })).summaries.map((entry) =>
        entry.programId
      ),
    ).toEqual(expect.arrayContaining(["program.composite-wire", "program.worker"]));
    expect(
      (await repository.listAcceptedDecisions({
        programId: "program.worker",
        beforeProgramRevision: null,
        maximumBytes: 4 * 1024,
      })).decisions[0]?.status,
    ).toBe("accepted");
    expect(await repository.loadProgramRevision("program.worker", 1)).toEqual(
      programV1("program.worker"),
    );
    expect(await repository.loadDecision("program.worker", "proposal.program.worker.1", 1))
      .toMatchObject({ status: "accepted" });
    expect(await repository.loadLatestAcceptedDecision("program.worker"))
      .toMatchObject({ status: "accepted" });
    const process = created.kind === "conflict" || created.kind === "workspace_volume_owned"
      ? null
      : created.process;
    if (process === null) throw new Error("expected Process creation");
    const acquireInput = {
      ownerInstanceId: "owner.worker",
      observedAt: 5,
      expiresAt: 100,
      attempt: {
        processId: process.processId,
        expectedProcessRevision: 3,
        expectedTranscriptFrontier: 2,
        commitId: "commit.worker.acquire",
        attemptId: "attempt.1",
        generation: 1,
        trigger: {
          kind: "new_entry" as const,
          entry: entryV1({ processId: process.processId, sequence: 3, role: "user" }),
        },
        startingCheckpoint: checkpointV1(3, "program.worker"),
        updatedAt: 5,
      },
    } satisfies ProcessExecutionAcquireInputV1;
    const acquired = await repository.acquireProcessExecution(acquireInput);
    if (acquired.kind !== "committed") {
      throw new Error(`expected Process execution acquire: ${JSON.stringify(acquired)}`);
    }
    const terminalEntry = entryV1({ processId: process.processId, sequence: 4, rich: true });
    const terminalInput = {
      lease: acquired.lease,
      observedAt: 6,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: 4,
        expectedTranscriptFrontier: 3,
        commitId: "commit.worker.terminal",
        attemptBinding: { attemptId: "attempt.1", generation: 1 },
        entries: [terminalEntry],
        checkpoint: checkpointV1(4, "program.worker"),
        terminalAttemptReceipt: {
          schemaVersion: 1 as const,
          processId: process.processId,
          attemptId: "attempt.1",
          generation: 1,
          outcome: "failed" as const,
          terminalSequence: 4,
          terminalEntryId: terminalEntry.entryId,
          interruptionDisposition: null,
        },
        updatedAt: 6,
      },
    };
    const terminal = await repository.commitProcessExecutionTerminal(terminalInput);
    expect(terminal.kind).toBe("committed");
    if (terminal.kind === "committed" || terminal.kind === "unchanged") {
      expect(terminal.entries[0]?.parts.map((part) => part.kind)).toEqual([
        "reasoning_summary",
        "tool_call",
        "tool_status",
        "tool_result",
        "artifact_reference",
      ]);
    }
    expect(
      await repository.queryProcessOperation({
        operation: "execution_terminal",
        input: terminalInput,
      }),
    ).toMatchObject({ kind: "committed", receipt: { terminalOutcome: "failed" } });
    expect(
      (await repository.loadTranscriptPage({
        processId: process.processId,
        beforeSequence: null,
        maximumBytes: 4 * 1024 * 1024,
      }))?.entries,
    ).toHaveLength(4);
    expect(
      (await repository.listProcessSummaries({
        subjectProgramId: "program.worker",
        before: null,
        maximumBytes: 4 * 1024 * 1024,
      })).summaries[0]?.transcriptFrontier,
    ).toBe(4);
    expect(
      (await repository.listRecentProcessSummaries({
        before: null,
        maximumBytes: 4 * 1024 * 1024,
      })).summaries[0],
    ).toMatchObject({ processId: process.processId, transcriptFrontier: 4 });
    expect(await repository.loadProcess(process.processId)).toMatchObject({
      transcriptFrontier: 4,
    });
    const retryCreated = await repository.createProgramWithProcess(
      createBundleV1("program.worker-retry", "process.worker-retry"),
    );
    if (retryCreated.kind !== "committed") throw new Error("expected retry Process creation");
    const retryProcess = retryCreated.process;
    const retryAcquire = await repository.acquireProcessExecution({
      ownerInstanceId: "owner.worker-retry",
      observedAt: 3,
      expiresAt: 100,
      attempt: {
        processId: retryProcess.processId,
        expectedProcessRevision: 2,
        expectedTranscriptFrontier: 1,
        commitId: "commit.worker-retry.acquire",
        attemptId: "attempt.worker-retry.1",
        generation: 1,
        trigger: {
          kind: "new_entry",
          entry: entryV1({ processId: retryProcess.processId, sequence: 2, role: "user" }),
        },
        startingCheckpoint: checkpointV1(2, "program.worker-retry"),
        updatedAt: 3,
      },
    });
    if (retryAcquire.kind !== "committed") throw new Error("expected retry execution acquire");
    const interruptedEntry = {
      ...entryV1({ processId: retryProcess.processId, sequence: 3 }),
      state: "interrupted_partial" as const,
    };
    const interrupted = await repository.commitProcessExecutionTerminal({
      lease: retryAcquire.lease,
      observedAt: 4,
      transcript: {
        processId: retryProcess.processId,
        expectedProcessRevision: 3,
        expectedTranscriptFrontier: 2,
        commitId: "commit.worker-retry.interrupted",
        attemptBinding: { attemptId: "attempt.worker-retry.1", generation: 1 },
        entries: [interruptedEntry],
        checkpoint: checkpointV1(3, "program.worker-retry"),
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: retryProcess.processId,
          attemptId: "attempt.worker-retry.1",
          generation: 1,
          outcome: "interrupted",
          terminalSequence: 3,
          terminalEntryId: interruptedEntry.entryId,
          interruptionDisposition: "retryable",
        },
        updatedAt: 4,
      },
    });
    expect(interrupted.kind).toBe("committed");
    expect(await repository.loadProcess(retryProcess.processId)).toMatchObject({
      status: "interrupted_retryable",
      lastTerminalAttempt: {
        attemptId: "attempt.worker-retry.1",
        interruptionDisposition: "retryable",
      },
    });

    expect(await repository.loadProcessNetworkAccess("process.worker"))
      .toEqual({ revision: 1, processId: "process.worker", enabled: false });
    expect(
      await repository.setProcessNetworkAccess({ processId: "process.worker", enabled: true }),
    )
      .toMatchObject({ kind: "committed", value: { enabled: true } });
    await repository.dispose();
  });

  it("preserves a known failure code and operation", async () => {
    const delegate = createTestProgramDataRepositoryV1();
    const repository: ProgramDataRepositoryV1 = {
      ...delegate,
      loadProcess: () =>
        Promise.reject(createProgramDataRepositoryFailureV1("schema_invalid", "load_process")),
    };
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });
    await expect(browser.loadProcess("process.missing")).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load_process",
    });
    await browser.dispose();
  });

  it("executes repository calls in Worker arrival order", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const order: string[] = [];
    const delegate = createTestProgramDataRepositoryV1();
    const repository: ProgramDataRepositoryV1 = {
      ...delegate,
      async loadProcess(processId) {
        order.push(`start:${processId}`);
        if (processId === "process.first") await firstGate;
        order.push(`finish:${processId}`);
        return null;
      },
    };
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });
    const first = browser.loadProcess("process.first");
    const second = browser.loadProcess("process.second");
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(["start:process.first"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual([
      "start:process.first",
      "finish:process.first",
      "start:process.second",
      "finish:process.second",
    ]);
    await browser.dispose();
  });

  it("rejects extra request fields and terminates on malformed response wire", async () => {
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.1",
        record: { method: "load_process", processId: "process.1", extra: true },
      }).kind,
    ).toBe("rejected");
    for (
      const record of [
        { method: "create_program", input: createInputV1("program.raw") },
        { method: "create_process", input: {} },
        { method: "begin_process_attempt", input: {} },
        { method: "append_process_transcript", input: {} },
      ]
    ) {
      expect(
        admitProgramDataRepositoryWorkerRequestEnvelopeV1({
          revision: 1,
          kind: "rpc_request",
          requestId: "request.raw-write",
          record,
        }).kind,
      ).toBe("rejected");
    }

    const worker = new FakeProgramDataRepositoryWorkerV1();
    worker.receive = (message) => {
      const request = message as { requestId: string; record: { method: string } };
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 1,
          kind: "rpc_response",
          requestId: request.requestId,
          record: { kind: "success", method: request.record.method, value: null, extra: true },
        });
      });
    };
    const repository = createBrowserProgramDataRepositoryV1({ createWorker: () => worker });
    await expect(repository.loadProcess("process.1")).rejects.toMatchObject({
      code: "wire_invalid",
      operation: "load_process",
    });
    expect(worker.terminated).toBe(true);
  });

  it("settles a correlatable invalid request without executing the repository", async () => {
    const delegate = createTestProgramDataRepositoryV1();
    const listProcessSummaries = vi.fn(delegate.listProcessSummaries);
    const repository: ProgramDataRepositoryV1 = {
      ...delegate,
      listProcessSummaries,
    };
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });

    await expect(browser.listProcessSummaries({
      subjectProgramId: null,
      before: null,
      maximumBytes: Number.MAX_SAFE_INTEGER,
    })).rejects.toMatchObject({
      code: "wire_invalid",
      operation: "list_process_summaries",
    });
    expect(listProcessSummaries).not.toHaveBeenCalled();
    expect(loopback.worker.terminated).toBe(false);
    await browser.dispose();
  });

  it("turns an uncorrelatable invalid request into fatal transport loss", async () => {
    const repository = createTestProgramDataRepositoryV1();
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });

    loopback.runtime.receive({
      revision: 1,
      kind: "rpc_request",
      requestId: "request.uncorrelatable",
      record: { method: "unknown" },
    });
    const pending = browser.loadProcess("process.pending-after-invalid-wire");

    await expect(pending).rejects.toMatchObject({
      code: "unavailable",
      operation: "load_process",
    });
    expect(loopback.worker.terminated).toBe(true);
    await loopback.runtime.dispose();
  });

  it("keeps malformed repository output admission at the page-side receiver", async () => {
    const delegate = createTestProgramDataRepositoryV1();
    const repository: ProgramDataRepositoryV1 = {
      ...delegate,
      loadProcess: () => Promise.resolve(({ impossible: true }) as never),
    };
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });

    await expect(browser.loadProcess("process.malformed-worker-output")).rejects.toMatchObject({
      code: "wire_invalid",
      operation: "load_process",
    });
    expect(loopback.worker.terminated).toBe(true);
  });

  it("does not re-admit or retain a large Translation import payload on the page", async () => {
    const largeRequest = {
      method: "invoke_program_persistence_facet" as const,
      input: {
        revision: 1 as const,
        facetId: "sillyos.translation.persistence.v1",
        operation: "append_workset_import",
        input: {
          processId: "process.large-expectation",
          operationId: "operation.large-expectation.1",
          lease: {
            processId: "process.large-expectation",
            ownerInstanceId: "owner.large-expectation",
            attemptId: "attempt.large-expectation",
            generation: 1,
            expiresAt: 1_000,
          },
          expectedWorksetRevision: 1,
          units: [{
            unitId: "unit.large-expectation.1",
            order: 0,
            locator: "line:1",
            context: null,
            durationMilliseconds: null,
            source: "x".repeat(4 * 1024 * 1024),
            protectedSegments: [],
          }],
          glossaryEntries: [],
          updatedAt: 2,
        },
      },
    };
    expect(createProgramDataRepositoryWorkerResponseExpectationV1(largeRequest)).toEqual({
      method: largeRequest.method,
      binding: {
        kind: "facet",
        facetId: largeRequest.input.facetId,
        operation: largeRequest.input.operation,
      },
    });

    const worker = new FakeProgramDataRepositoryWorkerV1();
    worker.receive = (message) => {
      const request = message as {
        requestId: string;
        record: {
          method: string;
          input: { input: { processId: string; operationId: string } };
        };
      };
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 1,
          kind: "rpc_response",
          requestId: request.requestId,
          record: {
            kind: "success",
            method: request.record.method,
            value: request.record.method === "dispose" ? null : {
              kind: "committed",
              head: { processId: request.record.input.input.processId, revision: 2 },
              operationReceipt: {
                processId: request.record.input.input.processId,
                operationId: request.record.input.input.operationId,
                operation: "append",
                operationDigest: "a".repeat(64),
                worksetRevision: 2,
                candidateId: null,
              },
            },
          },
        });
      });
    };
    let payloadReads = 0;
    const input = {
      processId: "process.large-import",
      operationId: "operation.large-import.1",
      lease: {
        processId: "process.large-import",
        ownerInstanceId: "owner.large-import",
        attemptId: "attempt.large-import",
        generation: 1,
        expiresAt: 1_000,
      },
      expectedWorksetRevision: 1,
      get units(): never {
        payloadReads += 1;
        throw new Error("page must not inspect the import units");
      },
      get glossaryEntries(): never {
        payloadReads += 1;
        throw new Error("page must not inspect the import glossary");
      },
      updatedAt: 2,
    };
    const repository = createBrowserProgramDataRepositoryV1({ createWorker: () => worker });

    await expect(repository.appendTranslationWorksetImport(input)).resolves.toMatchObject({
      kind: "committed",
      head: { processId: input.processId, revision: 2 },
    });
    expect(payloadReads).toBe(0);
    const posted = worker.postMessageSpy.mock.calls[0]?.[0] as {
      record: { input: unknown };
    };
    expect((posted.record.input as { input: unknown }).input).toBe(input);
    await repository.dispose();
  });

  it("terminates when a valid response entity belongs to another request", async () => {
    const repository = createTestProgramDataRepositoryV1();
    const other = await seedProcessV1(repository, "process.other");
    const worker = new FakeProgramDataRepositoryWorkerV1();
    worker.receive = (message) => {
      const request = message as { requestId: string; record: { method: string } };
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 1,
          kind: "rpc_response",
          requestId: request.requestId,
          record: { kind: "success", method: request.record.method, value: other },
        });
      });
    };
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => worker });
    await expect(browser.loadProcess("process.requested")).rejects.toMatchObject({
      code: "wire_invalid",
      operation: "load_process",
    });
    expect(worker.terminated).toBe(true);
    await repository.dispose();
  });

  it("binds success entities and mutation receipts to the exact request", async () => {
    const wrongNetworkMutation = admitSuccessResponseV1({
      method: "set_process_network_access",
      input: { processId: "process.requested", enabled: true },
    }, {
      kind: "committed",
      value: { revision: 1, processId: "process.other", enabled: true },
    });
    expect(wrongNetworkMutation.kind).toBe("rejected");

    const repository = createTestProgramDataRepositoryV1();
    const process = await seedProcessV1(repository, "process.mutation");
    const trigger = entryV1({ processId: process.processId, sequence: 1, role: "user" });
    const input = {
      ownerInstanceId: "owner.mutation",
      observedAt: 2,
      expiresAt: 100,
      attempt: {
        processId: process.processId,
        expectedProcessRevision: 1,
        expectedTranscriptFrontier: 0,
        commitId: "commit.mutation.acquire",
        attemptId: "attempt.mutation.1",
        generation: 1,
        trigger: { kind: "new_entry" as const, entry: trigger },
        startingCheckpoint: checkpointV1(1),
        updatedAt: 2,
      },
    } satisfies ProcessExecutionAcquireInputV1;
    const result = await repository.acquireProcessExecution(input);
    if (result.kind !== "committed") throw new Error("expected Process execution acquire");
    expect(
      admitSuccessResponseV1(
        { method: "acquire_process_execution", input },
        result,
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        { method: "acquire_process_execution", input },
        { ...result, entries: [] },
      ).kind,
    ).toBe("rejected");
    expect(
      admitSuccessResponseV1(
        { method: "acquire_process_execution", input },
        {
          ...result,
          operationReceipt: {
            ...result.operationReceipt,
            operationId: "commit.other.acquire",
          },
        },
      ).kind,
    ).toBe("rejected");
    expect(
      admitSuccessResponseV1(
        {
          method: "query_process_operation",
          input: { operation: "execution_acquire", input },
        },
        { kind: "committed", receipt: result.operationReceipt },
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        {
          method: "query_process_operation",
          input: { operation: "execution_acquire", input },
        },
        {
          kind: "committed",
          receipt: { ...result.operationReceipt, operationId: "commit.other.acquire" },
        },
      ).kind,
    ).toBe("rejected");

    const terminalEntry = entryV1({
      processId: process.processId,
      sequence: 2,
    });
    const terminalInput = {
      lease: result.lease,
      observedAt: 3,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: 2,
        expectedTranscriptFrontier: 1,
        commitId: "commit.mutation.terminal",
        attemptBinding: { attemptId: input.attempt.attemptId, generation: 1 },
        entries: [terminalEntry],
        checkpoint: checkpointV1(2),
        terminalAttemptReceipt: {
          schemaVersion: 1 as const,
          processId: process.processId,
          attemptId: input.attempt.attemptId,
          generation: 1,
          outcome: "failed" as const,
          terminalSequence: 2,
          terminalEntryId: terminalEntry.entryId,
          interruptionDisposition: null,
        },
        updatedAt: 3,
      },
    };
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.completed-without-program-successor",
        record: {
          method: "commit_process_execution_terminal",
          input: {
            ...terminalInput,
            transcript: {
              ...terminalInput.transcript,
              terminalAttemptReceipt: {
                ...terminalInput.transcript.terminalAttemptReceipt,
                outcome: "completed",
              },
            },
          },
        },
      }).kind,
    ).toBe("admitted");
    const terminal = await repository.commitProcessExecutionTerminal(terminalInput);
    if (terminal.kind !== "committed") throw new Error("expected Process execution terminal");
    expect(
      admitSuccessResponseV1(
        { method: "commit_process_execution_terminal", input: terminalInput },
        terminal,
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        { method: "commit_process_execution_terminal", input: terminalInput },
        {
          ...terminal,
          operationReceipt: { ...terminal.operationReceipt, terminalOutcome: "completed" },
        },
      ).kind,
    ).toBe("rejected");
    expect(
      admitSuccessResponseV1(
        {
          method: "query_process_operation",
          input: { operation: "execution_terminal", input: terminalInput },
        },
        { kind: "committed", receipt: terminal.operationReceipt },
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        {
          method: "query_process_operation",
          input: { operation: "execution_terminal", input: terminalInput },
        },
        {
          kind: "mismatch",
          receipt: { ...terminal.operationReceipt, operationId: "commit.other.terminal" },
        },
      ).kind,
    ).toBe("rejected");

    const compositeInput = createBundleV1("program.wire-binding", "process.wire-binding");
    const compositeResult = await repository.createProgramWithProcess(compositeInput);
    if (compositeResult.kind !== "committed") throw new Error("expected composite commit");
    const processWorkspaceInput = processWorkspaceBundleV1(
      "process.workspace-wire-binding",
      "program.wire-binding",
    );
    const processWorkspaceResult = await repository.createProcessWithWorkspace(
      processWorkspaceInput,
    );
    if (processWorkspaceResult.kind !== "committed") {
      throw new Error("expected Process Workspace commit");
    }
    expect(
      admitSuccessResponseV1(
        { method: "create_process_with_workspace", input: processWorkspaceInput },
        processWorkspaceResult,
      ).kind,
    ).toBe("admitted");
    for (
      const candidateProcess of [
        {
          ...processWorkspaceResult.process,
          programPackage: packageReferenceV1("test.program.other"),
        },
        { ...processWorkspaceResult.process, subjectProgramId: "program.other" },
        { ...processWorkspaceResult.process, createdAt: 2 },
      ]
    ) {
      expect(
        admitSuccessResponseV1(
          { method: "create_process_with_workspace", input: processWorkspaceInput },
          { ...processWorkspaceResult, process: candidateProcess },
        ).kind,
      ).toBe("rejected");
    }
    await repository.dispose();
  });

  it("round-trips an exact Program-successor terminal operation query", async () => {
    const repository = createTestProgramDataRepositoryV1();
    const programId = "program.program-terminal-query";
    const processId = "process.program-terminal-query";
    const created = await repository.createProgramWithProcess(createBundleV1(programId, processId));
    if (created.kind !== "committed") throw new Error("expected Program/Process creation");
    const startingCheckpoint: ProcessCheckpointV1 = {
      checkpointId: "process.program-terminal-query.checkpoint.2",
      throughSequence: 2,
      workspaceId: `workspace.${programId}`,
      workspaceCheckpointId: "workspace.program-terminal-query.checkpoint.2",
      workspaceGeneration: 2,
    };
    const acquired = await repository.acquireProcessExecution({
      ownerInstanceId: "owner.program-terminal-query",
      observedAt: 3,
      expiresAt: 100,
      attempt: {
        processId,
        expectedProcessRevision: 2,
        expectedTranscriptFrontier: 1,
        commitId: "commit.program-terminal-query.acquire",
        attemptId: "attempt.program-terminal-query.1",
        generation: 1,
        trigger: { kind: "new_entry", entry: entryV1({ processId, sequence: 2, role: "user" }) },
        startingCheckpoint,
        updatedAt: 3,
      },
    });
    if (acquired.kind !== "committed") throw new Error("expected Process execution acquire");
    const terminalEntry = entryV1({ processId, sequence: 3 });
    const terminalCheckpoint: ProcessCheckpointV1 = {
      checkpointId: "process.program-terminal-query.checkpoint.3",
      throughSequence: 3,
      workspaceId: `workspace.${programId}`,
      workspaceCheckpointId: "workspace.program-terminal-query.checkpoint.3",
      workspaceGeneration: 3,
    };
    const input = {
      lease: acquired.lease,
      observedAt: 4,
      transcript: {
        processId,
        expectedProcessRevision: 3,
        expectedTranscriptFrontier: 2,
        commitId: "commit.program-terminal-query.terminal",
        attemptBinding: { attemptId: "attempt.program-terminal-query.1", generation: 1 },
        entries: [terminalEntry],
        checkpoint: terminalCheckpoint,
        terminalAttemptReceipt: {
          schemaVersion: 1 as const,
          processId,
          attemptId: "attempt.program-terminal-query.1",
          generation: 1,
          outcome: "completed" as const,
          terminalSequence: 3,
          terminalEntryId: terminalEntry.entryId,
          interruptionDisposition: null,
        },
        updatedAt: 4,
      },
      catalog: {
        programId,
        expectedRepositoryRevision: 1,
        expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
        commitId: "commit.program-terminal-query.revision.2",
        program: programV1(programId, 2),
        proposalId: `proposal.${programId}.2`,
        reviewedWorkspace: {
          ...reviewedWorkspaceV1(
            programId,
            processId,
            terminalCheckpoint.workspaceGeneration,
          ),
          checkpointId: terminalCheckpoint.workspaceCheckpointId,
        },
        updatedAt: 4,
      },
    };
    await expect(repository.commitProgramRevisionWithProcessExecutionTerminal({
      ...input,
      transcript: {
        ...input.transcript,
        terminalAttemptReceipt: {
          ...input.transcript.terminalAttemptReceipt,
          outcome: "failed",
        },
      },
    })).rejects.toThrow("invalid Process execution terminal input");
    const committed = await repository.commitProgramRevisionWithProcessExecutionTerminal(input);
    if (committed.kind !== "committed") {
      throw new Error("expected Program/Process execution terminal");
    }
    expect(await repository.commitProgramRevisionWithProcessExecutionTerminal(input)).toMatchObject(
      {
        kind: "unchanged",
        operationReceipt: committed.operationReceipt,
      },
    );
    const expectation = { operation: "program_revision_terminal" as const, input };
    const queried = await repository.queryCreatorProcessOperation(expectation);
    expect(queried).toMatchObject({
      kind: "committed",
      receipt: {
        operation: "execution_terminal",
      },
    });
    if (queried.kind !== "committed") throw new Error("expected committed query receipt");
    expect(
      await repository.queryCreatorProcessOperation({
        ...expectation,
        input: {
          ...expectation.input,
          catalog: {
            ...expectation.input.catalog,
            program: { ...expectation.input.catalog.program, name: "Different successor" },
          },
        },
      }),
    ).toMatchObject({ kind: "mismatch" });
    await repository.dispose();
  });

  it("rejects unordered pages and cursors that cannot resume exact traversal", async () => {
    const repository = createTestProgramDataRepositoryV1();
    await repository.create(createInputV1("program.alpha"));
    await repository.create(createInputV1("program.beta"));
    await seedProcessV1(repository, "process.alpha");
    await seedProcessV1(repository, "process.beta");
    const processInput = {
      subjectProgramId: "program.worker",
      before: null,
      maximumBytes: 4 * 1024,
    } as const;
    const processes = await repository.listProcessSummaries(processInput);
    expect(processes.summaries).toHaveLength(2);
    expect(
      admitSuccessResponseV1(
        { method: "list_process_summaries", input: processInput },
        { ...processes, summaries: processes.summaries.toReversed() },
      ).kind,
    ).toBe("rejected");
    const firstProcess = processes.summaries[0]!;
    expect(
      admitSuccessResponseV1(
        { method: "list_process_summaries", input: processInput },
        {
          ...processes,
          nextCursor: { updatedAt: firstProcess.updatedAt, processId: firstProcess.processId },
        },
      ).kind,
    ).toBe("rejected");

    const transcriptInput = {
      processId: "process.transcript",
      beforeSequence: 4,
      maximumBytes: 4 * 1024,
    } as const;
    const transcriptEntries = [
      entryV1({ processId: transcriptInput.processId, sequence: 2 }),
      entryV1({ processId: transcriptInput.processId, sequence: 3 }),
    ];
    const transcriptPage = {
      processId: transcriptInput.processId,
      beforeSequence: transcriptInput.beforeSequence,
      entries: transcriptEntries,
      byteLength: transcriptEntries.reduce(
        (total, entry) => total + transcriptEntryUtf8ByteLengthV1(entry),
        0,
      ),
      nextBeforeSequence: 2,
    };
    expect(
      admitSuccessResponseV1(
        { method: "load_transcript_page", input: transcriptInput },
        transcriptPage,
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        { method: "load_transcript_page", input: transcriptInput },
        { ...transcriptPage, nextBeforeSequence: 99 },
      ).kind,
    ).toBe("rejected");
    const gappedEntries = [
      transcriptEntries[0]!,
      entryV1({ processId: transcriptInput.processId, sequence: 4 }),
    ];
    expect(
      admitSuccessResponseV1(
        { method: "load_transcript_page", input: { ...transcriptInput, beforeSequence: 5 } },
        {
          ...transcriptPage,
          beforeSequence: 5,
          entries: gappedEntries,
          byteLength: gappedEntries.reduce(
            (total, entry) => total + transcriptEntryUtf8ByteLengthV1(entry),
            0,
          ),
        },
      ).kind,
    ).toBe("rejected");
    await repository.dispose();
  });

  it("recovers one fresh Worker solely through an exact execution-operation query", async () => {
    const indexedDB = new IDBFactory();
    const firstLoopback = createLoopbackWorkerV1({
      repository: createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        facets: [indexedDbTranslationPersistenceFacetV1],
      }),
      throwResponse: (message) => message.record.method === "acquire_process_execution",
    });
    const secondLoopback = createLoopbackWorkerV1({
      repository: createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        facets: [indexedDbTranslationPersistenceFacetV1],
      }),
    });
    const workers = [firstLoopback.worker, secondLoopback.worker];
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => {
        const worker = workers.shift();
        if (worker === undefined) throw new Error("unexpected Worker generation");
        return worker;
      },
    });
    await repository.createProcessWithWorkspace(
      processWorkspaceBundleV1("process.execution-query", "program.execution-query"),
    );
    const input = {
      ownerInstanceId: "owner.execution-query",
      observedAt: 10,
      expiresAt: 110,
      attempt: {
        processId: "process.execution-query",
        expectedProcessRevision: 2,
        expectedTranscriptFrontier: 1,
        commitId: "commit.process.execution-query.acquire",
        attemptId: "attempt.process.execution-query.1",
        generation: 1,
        trigger: {
          kind: "new_entry",
          entry: entryV1({
            processId: "process.execution-query",
            sequence: 2,
            role: "user",
          }),
        },
        startingCheckpoint: {
          checkpointId: "process.checkpoint.process.execution-query.2",
          throughSequence: 2,
          workspaceId: "workspace.process.execution-query",
          workspaceCheckpointId: "workspace.checkpoint.process.execution-query.1",
          workspaceGeneration: 1,
        },
        updatedAt: 10,
      },
    } satisfies ProcessExecutionAcquireInputV1;
    await expect(repository.acquireProcessExecution(input)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "acquire_process_execution",
    });
    expect(firstLoopback.worker.terminated).toBe(true);
    expect(
      await repository.queryProcessOperation({ operation: "execution_acquire", input }),
    ).toMatchObject({
      kind: "committed",
      receipt: { operation: "execution_acquire", attemptId: input.attempt.attemptId },
    });
    expect(await repository.loadProcessExecutionLease(input.attempt.processId)).toMatchObject({
      ownerInstanceId: input.ownerInstanceId,
      attemptId: input.attempt.attemptId,
    });
    await repository.dispose();
  });

  it("recovers an exact Translation workset-guarded acquire through a fresh Worker", async () => {
    const indexedDB = new IDBFactory();
    let hideFirstFacetResponse = true;
    const firstLoopback = createLoopbackWorkerV1({
      repository: createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        facets: [indexedDbTranslationPersistenceFacetV1],
      }),
      throwResponse: (message) => {
        if (
          !hideFirstFacetResponse ||
          message.record.method !== "invoke_program_persistence_facet"
        ) return false;
        hideFirstFacetResponse = false;
        return true;
      },
    });
    const secondLoopback = createLoopbackWorkerV1({
      repository: createIndexedDbProgramDataRepositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        facets: [indexedDbTranslationPersistenceFacetV1],
      }),
    });
    const workers = [firstLoopback.worker, secondLoopback.worker];
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => {
        const worker = workers.shift();
        if (worker === undefined) throw new Error("unexpected Worker generation");
        return worker;
      },
    });
    await repository.createProcessWithWorkspace(
      processWorkspaceBundleV1(
        "process.translation-acquire-query",
        "program.translation-acquire-query",
      ),
    );
    const processId = "process.translation-acquire-query";
    const input = {
      expectedWorksetRevision: null,
      execution: {
        ownerInstanceId: "owner.translation-acquire-query",
        observedAt: 3,
        expiresAt: 1_000,
        attempt: {
          processId,
          expectedProcessRevision: 2,
          expectedTranscriptFrontier: 1,
          commitId: "commit.translation-acquire-query",
          attemptId: "attempt.translation-acquire-query",
          generation: 1,
          trigger: {
            kind: "new_entry" as const,
            entry: entryV1({ processId, sequence: 2, role: "user" }),
          },
          startingCheckpoint: {
            checkpointId: "process.checkpoint.translation-acquire-query.2",
            throughSequence: 2,
            workspaceId: `workspace.${processId}`,
            workspaceCheckpointId: `workspace.checkpoint.${processId}.1`,
            workspaceGeneration: 1,
          },
          updatedAt: 3,
        },
      },
    };
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.translation-acquire-query.invalid",
        record: {
          method: "invoke_program_persistence_facet",
          input: {
            revision: 1,
            facetId: "sillyos.translation.persistence.v1",
            operation: "acquire_workset_import_execution",
            input: { ...input, expectedWorksetRevision: 0 },
          },
        },
      }).kind,
    ).toBe("admitted");
    await expect(repository.acquireTranslationWorksetImportExecution(input)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "invoke_program_persistence_facet",
    });
    expect(firstLoopback.worker.terminated).toBe(true);
    expect(
      await repository.queryTranslationProcessOperation({
        operation: "workset_import_execution_acquire",
        input,
      }),
    ).toMatchObject({
      kind: "committed",
      receipt: {
        operation: "program_facet_execution_acquire",
        attemptId: input.execution.attempt.attemptId,
      },
    });
    expect(
      await repository.queryTranslationProcessOperation({
        operation: "workset_import_execution_acquire",
        input: { ...input, expectedWorksetRevision: 1 },
      }),
    ).toMatchObject({ kind: "mismatch" });
    expect(await repository.loadProcessExecutionLease(processId)).toMatchObject({
      ownerInstanceId: input.execution.ownerInstanceId,
      attemptId: input.execution.attempt.attemptId,
    });
    expect(
      await repository.acquireTranslationWorksetImportExecution({
        ...input,
        execution: {
          ...input.execution,
          ownerInstanceId: "owner.translation-acquire-query.competing",
          attempt: {
            ...input.execution.attempt,
            commitId: "commit.translation-acquire-query.competing",
            attemptId: "attempt.translation-acquire-query.competing",
          },
        },
      }),
    ).toMatchObject({
      kind: "conflict",
      currentWorkset: null,
      currentLease: { attemptId: input.execution.attempt.attemptId },
    });
    await repository.dispose();
  });

  it("fences a delivered composite and exact-replays both authorities through a new Worker", async () => {
    const indexedDB = new IDBFactory();
    const firstLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
      throwResponse: (message) => message.record.method === "invoke_program_persistence_facet",
    });
    const first = createBrowserProgramDataRepositoryV1({
      createWorker: () => firstLoopback.worker,
    });
    const bundle = createBundleV1("program.composite-replay", "process.composite-replay");
    await expect(first.createProgramWithProcess(bundle)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "invoke_program_persistence_facet",
    });

    const secondLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
    });
    const second = createBrowserProgramDataRepositoryV1({
      createWorker: () => secondLoopback.worker,
    });
    expect(await second.createProgramWithProcess(bundle)).toMatchObject({
      kind: "unchanged",
      record: { head: { repositoryRevision: 1 } },
      process: { revision: 2, transcriptFrontier: 1 },
    });
    await second.dispose();
  });

  it("fences a delivered Process Workspace and exact-replays it through a new Worker", async () => {
    const indexedDB = new IDBFactory();
    const firstLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
      throwResponse: (message) => message.record.method === "create_process_with_workspace",
    });
    const first = createBrowserProgramDataRepositoryV1({
      createWorker: () => firstLoopback.worker,
    });
    await first.createProgramWithProcess(
      createBundleV1("program.workspace-replay", "process.workspace-replay-creator"),
    );
    const bundle = processWorkspaceBundleV1(
      "process.workspace-replay",
      "program.workspace-replay",
    );
    await expect(first.createProcessWithWorkspace(bundle)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create_process_with_workspace",
    });

    const secondLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
    });
    const second = createBrowserProgramDataRepositoryV1({
      createWorker: () => secondLoopback.worker,
    });
    expect(await second.createProcessWithWorkspace(bundle)).toMatchObject({
      kind: "unchanged",
      process: { processId: bundle.process.processId, revision: 2 },
      workspace: bundle.workspace,
    });
    await second.dispose();
  });

  it("round-trips Translation Process workset paging and receipt reconciliation through the Worker", async () => {
    const indexedDB = new IDBFactory();
    const physical = createTestProgramDataRepositoryV1({ indexedDB });
    const loopback = createLoopbackWorkerV1({
      repository: physical,
      throwResponse: (message) =>
        message.record.method === "invoke_program_persistence_facet" &&
        (message.record as { value?: { worksetOperationReceipt?: { operation?: string } } }).value
            ?.worksetOperationReceipt?.operation === "finalize",
    });
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => loopback.worker,
    });
    await repository.initialize();
    expect(
      await repository.createProgramWithProcess(
        createBundleV1("program.translation.worker", "process.creator.translation.worker"),
      ),
    ).toMatchObject({ kind: "committed" });
    expect(
      await repository.createProcessWithWorkspace(
        processWorkspaceBundleV1("process.translation.worker", "program.translation.worker"),
      ),
    ).toMatchObject({ kind: "committed" });
    const lease = await acquireTranslationLeaseV1(repository, "process.translation.worker");
    const begin = {
      processId: "process.translation.worker",
      operationId: "translation.begin.worker",
      lease,
      title: "Worker translation",
      document: {
        format: "plain_text" as const,
        capabilityGrade: "round_trip_supported" as const,
        capabilityReason: "known_format" as const,
      },
      source: {
        fileName: "worker.txt",
        mediaType: "text/plain",
        workspacePath: "input/worker.txt",
        byteLength: 7,
        sha256: "a".repeat(64),
      },
      sourceBinding: translationSourceBindingV1(
        "process.translation.worker",
        "input/worker.txt",
      ),
      sourceLocale: "ja",
      targetLocale: "zh-Hans",
      documentPurpose: "test",
      style: "faithful",
      expectedUnitCount: 3,
      expectedGlossaryCount: 2,
      updatedAt: 3,
    };
    const { lease: _omittedLease, ...beginWithoutLease } = begin;
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.translation-begin-without-lease",
        record: {
          method: "begin_translation_workset_import",
          input: beginWithoutLease,
        },
      }).kind,
    ).toBe("rejected");
    expect(await repository.beginTranslationWorksetImport(begin)).toMatchObject({
      kind: "committed",
      head: { revision: 1 },
    });
    expect(
      await repository.appendTranslationWorksetImport({
        processId: begin.processId,
        operationId: "translation.append.worker",
        lease,
        expectedWorksetRevision: 1,
        units: [0, 1, 2].map((order) => ({
          unitId: `unit.worker.${String(order)}`,
          order,
          locator: `line:${String(order + 1)}`,
          context: null,
          durationMilliseconds: null,
          source: `Source ${String(order)}`,
          protectedSegments: [],
        })),
        glossaryEntries: [0, 1].map((order) => ({
          entryId: `glossary.worker.${String(order)}`,
          order,
          source: `Source ${String(order)}`,
          target: `译文 ${String(order)}`,
          note: null,
          locked: true,
        })),
        updatedAt: 4,
      }),
    ).toMatchObject({
      kind: "committed",
      head: { revision: 2, stagedUnitCount: 3, stagedGlossaryCount: 2 },
    });
    expect(
      await repository.loadTranslationWorksetUnitPage({
        processId: begin.processId,
        expectedWorksetRevision: 2,
        fromOrder: 0,
        maximumRows: 1,
        maximumBytes: 4_096,
      }),
    ).toMatchObject({
      kind: "page",
      page: { rows: [{ unitId: "unit.worker.0" }], nextOrder: 1 },
    });
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.translation-page-without-row-window",
        record: {
          method: "load_translation_workset_unit_page",
          input: {
            processId: begin.processId,
            expectedWorksetRevision: 2,
            fromOrder: 0,
            maximumBytes: 4_096,
          },
        },
      }).kind,
    ).toBe("rejected");
    expect(
      await repository.loadTranslationWorksetGlossaryPage({
        processId: begin.processId,
        expectedWorksetRevision: 2,
        fromOrder: 0,
        maximumRows: 1,
        maximumBytes: 4_096,
      }),
    ).toMatchObject({
      kind: "page",
      page: { rows: [{ entryId: "glossary.worker.0" }], nextOrder: 1 },
    });
    expect(await repository.queryTranslationWorksetOperation({ operation: "begin", input: begin }))
      .toMatchObject({ kind: "committed", receipt: { worksetRevision: 1 } });
    const terminalEntry = entryV1({ processId: begin.processId, sequence: 3, role: "system" });
    const finalizeBundle: TranslationWorksetFinalizeExecutionBundleInputV1 = {
      workset: {
        processId: begin.processId,
        operationId: "translation.finalize.worker",
        lease,
        expectedWorksetRevision: 2,
        sourceBinding: begin.sourceBinding,
        updatedAt: 5,
      },
      terminal: {
        lease,
        observedAt: 5,
        transcript: {
          processId: begin.processId,
          expectedProcessRevision: 3,
          expectedTranscriptFrontier: 2,
          commitId: "translation.terminal.worker",
          attemptBinding: { attemptId: lease.attemptId, generation: lease.generation },
          entries: [terminalEntry],
          checkpoint: {
            checkpointId: "process.checkpoint.translation.worker.3",
            throughSequence: 3,
            workspaceId: begin.sourceBinding.workspaceId,
            workspaceCheckpointId: begin.sourceBinding.checkpointId,
            workspaceGeneration: begin.sourceBinding.generation,
          },
          terminalAttemptReceipt: {
            schemaVersion: 1,
            processId: begin.processId,
            attemptId: lease.attemptId,
            generation: lease.generation,
            outcome: "completed",
            terminalSequence: 3,
            terminalEntryId: terminalEntry.entryId,
            interruptionDisposition: null,
          },
          updatedAt: 5,
        },
      },
    };
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.translation-finalize-time-mismatch",
        record: {
          method: "invoke_program_persistence_facet",
          input: {
            revision: 1,
            facetId: "sillyos.translation.persistence.v1",
            operation: "finalize_workset_with_execution_terminal",
            input: {
              ...finalizeBundle,
              workset: { ...finalizeBundle.workset, updatedAt: 4 },
            },
          },
        },
      }).kind,
    ).toBe("admitted");
    const admittedFinalize = admitProgramDataRepositoryWorkerRequestEnvelopeV1({
      revision: 1,
      kind: "rpc_request",
      requestId: "request.translation-finalize",
      record: {
        method: "invoke_program_persistence_facet",
        input: {
          revision: 1,
          facetId: "sillyos.translation.persistence.v1",
          operation: "finalize_workset_with_execution_terminal",
          input: finalizeBundle,
        },
      },
    });
    normalizeTranslationWorksetFinalizeExecutionBundleInputV1(finalizeBundle);
    if (admittedFinalize.kind === "rejected") throw new Error(admittedFinalize.path);
    await expect(
      repository.commitTranslationWorksetFinalizeWithProcessExecutionTerminal(finalizeBundle),
    ).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "invoke_program_persistence_facet",
    });
    expect(loopback.worker.terminated).toBe(true);

    const reopenedLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
    });
    const reopened = createBrowserProgramDataRepositoryV1({
      createWorker: () => reopenedLoopback.worker,
    });
    expect(
      await reopened.queryTranslationWorksetOperation({
        operation: "finalize",
        input: finalizeBundle.workset,
      }),
    ).toMatchObject({
      kind: "committed",
      receipt: { operation: "finalize", worksetRevision: 3 },
    });
    expect(await reopened.loadTranslationWorksetHead(begin.processId)).toMatchObject({
      revision: 3,
      phase: "ready",
    });
    expect(await reopened.loadProcess(begin.processId)).toMatchObject({
      revision: 4,
      activeAttempt: null,
      lastTerminalAttempt: { outcome: "completed" },
    });
    expect(
      await reopened.commitTranslationWorksetFinalizeWithProcessExecutionTerminal(finalizeBundle),
    ).toMatchObject({
      kind: "unchanged",
      head: { revision: 3, phase: "ready" },
      processOperationReceipt: { operation: "execution_terminal" },
    });
    await reopened.dispose();

    const candidateLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
    });
    const candidateRepository = createBrowserProgramDataRepositoryV1({
      createWorker: () => candidateLoopback.worker,
    });
    const [readyWorkset, readyProcess] = await Promise.all([
      candidateRepository.loadTranslationWorksetHead(begin.processId),
      candidateRepository.loadProcess(begin.processId),
    ]);
    if (readyWorkset === null || readyProcess?.checkpoint === null || readyProcess === null) {
      throw new Error("expected ready Translation Process");
    }
    const sourceUnits = [0, 1, 2].map((order) => ({
      unitId: `unit.worker.${String(order)}`,
      order,
      locator: `line:${String(order + 1)}`,
      context: null,
      durationMilliseconds: null,
      source: `Source ${String(order)}`,
      protectedSegments: [],
    }));
    const firstAcquire = await candidateRepository.acquireTranslationBatchExecution({
      expectedWorksetRevision: readyWorkset.revision,
      expectedFirstPendingOrder: 0,
      expectedPendingCandidateId: null,
      execution: {
        ownerInstanceId: "owner.translation.worker.batch.1",
        observedAt: 6,
        expiresAt: 1_000_006,
        attempt: {
          processId: begin.processId,
          expectedProcessRevision: readyProcess.revision,
          expectedTranscriptFrontier: readyProcess.transcriptFrontier,
          commitId: "translation.worker.batch.1.acquire",
          attemptId: "attempt.translation.worker.batch.1",
          generation: 2,
          trigger: {
            kind: "new_entry",
            entry: entryV1({
              processId: begin.processId,
              sequence: 4,
              role: "user",
            }),
          },
          startingCheckpoint: {
            ...readyProcess.checkpoint,
            checkpointId: "process.checkpoint.translation.worker.4",
            throughSequence: 4,
          },
          updatedAt: 6,
        },
      },
    });
    if (firstAcquire.kind === "conflict") throw new Error("expected first batch lease");
    const firstRequest = {
      sourceLocale: begin.sourceLocale,
      targetLocale: begin.targetLocale,
      documentPurpose: begin.documentPurpose,
      style: begin.style,
      glossary: [0, 1].map((order) => ({
        entryId: `glossary.worker.${String(order)}`,
        source: `Source ${String(order)}`,
        target: `译文 ${String(order)}`,
        note: null,
        locked: true,
        appliesToUnitIds: [`unit.worker.${String(order)}`],
      })),
      confirmedMeaningFacts: [],
      neighboringUnits: { preceding: null, following: sourceUnits[2]! },
      units: sourceUnits.slice(0, 2),
    };
    const firstCandidate = await candidateRepository
      .commitTranslationBatchCandidateWithProcessExecutionTerminal({
        workset: {
          processId: begin.processId,
          operationId: "translation.worker.batch.1.candidate",
          lease: firstAcquire.lease,
          expectedWorksetRevision: readyWorkset.revision,
          expectedFirstPendingOrder: 0,
          request: firstRequest,
          candidate: {
            targets: [0, 1].map((order) => ({
              unitId: `unit.worker.${String(order)}`,
              target: `译文 ${String(order)}`,
            })),
            ambiguities: [],
          },
          updatedAt: 7,
        },
        terminal: {
          lease: firstAcquire.lease,
          observedAt: 7,
          transcript: {
            processId: begin.processId,
            expectedProcessRevision: firstAcquire.process.revision,
            expectedTranscriptFrontier: firstAcquire.process.transcriptFrontier,
            commitId: "translation.worker.batch.1.terminal",
            attemptBinding: {
              attemptId: firstAcquire.lease.attemptId,
              generation: firstAcquire.lease.generation,
            },
            entries: [entryV1({ processId: begin.processId, sequence: 5, role: "assistant" })],
            checkpoint: {
              checkpointId: "process.checkpoint.translation.worker.5",
              throughSequence: 5,
              workspaceId: begin.sourceBinding.workspaceId,
              workspaceCheckpointId: begin.sourceBinding.checkpointId,
              workspaceGeneration: begin.sourceBinding.generation,
            },
            terminalAttemptReceipt: {
              schemaVersion: 1,
              processId: begin.processId,
              attemptId: firstAcquire.lease.attemptId,
              generation: firstAcquire.lease.generation,
              outcome: "completed",
              terminalSequence: 5,
              terminalEntryId: `${begin.processId}.entry.5`,
              interruptionDisposition: null,
            },
            updatedAt: 7,
          },
        },
      });
    if (firstCandidate.kind === "conflict") throw new Error("expected first candidate");
    await candidateRepository.dispose();

    const lostReviewLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
      throwResponse: (message) =>
        message.record.method === "invoke_program_persistence_facet" &&
        (message.record as { value?: { operationReceipt?: { operation?: string } } }).value
            ?.operationReceipt?.operation === "accept_candidate",
    });
    const recoveredReviewLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
    });
    const reviewWorkers = [lostReviewLoopback.worker, recoveredReviewLoopback.worker];
    const reviewRepository = createBrowserProgramDataRepositoryV1({
      createWorker: () => {
        const worker = reviewWorkers.shift();
        if (worker === undefined) throw new Error("unexpected review Worker generation");
        return worker;
      },
    });
    const accept = {
      processId: begin.processId,
      operationId: "translation.worker.batch.1.accept",
      expectedWorksetRevision: firstCandidate.head.revision,
      candidateId: firstCandidate.candidate.candidateId,
      targets: [{ unitId: "unit.worker.0", target: "审核译文 0" }, {
        unitId: "unit.worker.1",
        target: "审核译文 1",
      }],
      updatedAt: 8,
    };
    await expect(reviewRepository.acceptTranslationBatchCandidate(accept)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "invoke_program_persistence_facet",
    });
    expect(lostReviewLoopback.worker.terminated).toBe(true);
    expect(
      await reviewRepository.queryTranslationWorksetOperation({
        operation: "accept_candidate",
        input: accept,
      }),
    ).toMatchObject({
      kind: "committed",
      receipt: {
        operation: "accept_candidate",
        candidateId: firstCandidate.candidate.candidateId,
      },
    });
    const acceptedHead = await reviewRepository.loadTranslationWorksetHead(begin.processId);
    if (acceptedHead === null) throw new Error("expected accepted Translation workset");
    expect(acceptedHead).toMatchObject({
      acceptedUnitCount: 2,
      acceptedBatchCount: 1,
      pendingCandidateId: null,
    });
    expect(
      await reviewRepository.loadTranslationWorksetUnitPage({
        processId: begin.processId,
        expectedWorksetRevision: acceptedHead.revision,
        fromOrder: 0,
        maximumRows: 3,
        maximumBytes: 8_192,
      }),
    ).toMatchObject({
      kind: "page",
      page: {
        rows: [{ target: "审核译文 0" }, { target: "审核译文 1" }, { target: null }],
      },
    });

    const processAfterAccept = await reviewRepository.loadProcess(begin.processId);
    if (processAfterAccept?.checkpoint === null || processAfterAccept === null) {
      throw new Error("expected Process after acceptance");
    }
    const secondAcquire = await reviewRepository.acquireTranslationBatchExecution({
      expectedWorksetRevision: acceptedHead.revision,
      expectedFirstPendingOrder: 2,
      expectedPendingCandidateId: null,
      execution: {
        ownerInstanceId: "owner.translation.worker.batch.2",
        observedAt: 9,
        expiresAt: 1_000_009,
        attempt: {
          processId: begin.processId,
          expectedProcessRevision: processAfterAccept.revision,
          expectedTranscriptFrontier: processAfterAccept.transcriptFrontier,
          commitId: "translation.worker.batch.2.acquire",
          attemptId: "attempt.translation.worker.batch.2",
          generation: 3,
          trigger: {
            kind: "new_entry",
            entry: entryV1({
              processId: begin.processId,
              sequence: 6,
              role: "user",
            }),
          },
          startingCheckpoint: {
            ...processAfterAccept.checkpoint,
            checkpointId: "process.checkpoint.translation.worker.6",
            throughSequence: 6,
          },
          updatedAt: 9,
        },
      },
    });
    if (secondAcquire.kind === "conflict") throw new Error("expected second batch lease");
    const secondCandidate = await reviewRepository
      .commitTranslationBatchCandidateWithProcessExecutionTerminal({
        workset: {
          processId: begin.processId,
          operationId: "translation.worker.batch.2.candidate",
          lease: secondAcquire.lease,
          expectedWorksetRevision: acceptedHead.revision,
          expectedFirstPendingOrder: 2,
          request: {
            ...firstRequest,
            glossary: [],
            neighboringUnits: { preceding: sourceUnits[1]!, following: null },
            units: [sourceUnits[2]!],
          },
          candidate: {
            targets: [{ unitId: "unit.worker.2", target: "译文 2" }],
            ambiguities: [],
          },
          updatedAt: 10,
        },
        terminal: {
          lease: secondAcquire.lease,
          observedAt: 10,
          transcript: {
            processId: begin.processId,
            expectedProcessRevision: secondAcquire.process.revision,
            expectedTranscriptFrontier: secondAcquire.process.transcriptFrontier,
            commitId: "translation.worker.batch.2.terminal",
            attemptBinding: {
              attemptId: secondAcquire.lease.attemptId,
              generation: secondAcquire.lease.generation,
            },
            entries: [entryV1({ processId: begin.processId, sequence: 7, role: "assistant" })],
            checkpoint: {
              checkpointId: "process.checkpoint.translation.worker.7",
              throughSequence: 7,
              workspaceId: begin.sourceBinding.workspaceId,
              workspaceCheckpointId: begin.sourceBinding.checkpointId,
              workspaceGeneration: begin.sourceBinding.generation,
            },
            terminalAttemptReceipt: {
              schemaVersion: 1,
              processId: begin.processId,
              attemptId: secondAcquire.lease.attemptId,
              generation: secondAcquire.lease.generation,
              outcome: "completed",
              terminalSequence: 7,
              terminalEntryId: `${begin.processId}.entry.7`,
              interruptionDisposition: null,
            },
            updatedAt: 10,
          },
        },
      });
    if (secondCandidate.kind === "conflict") throw new Error("expected second candidate");
    const reject = {
      processId: begin.processId,
      operationId: "translation.worker.batch.2.reject",
      expectedWorksetRevision: secondCandidate.head.revision,
      candidateId: secondCandidate.candidate.candidateId,
      updatedAt: 11,
    };
    expect(await reviewRepository.rejectTranslationBatchCandidate(reject)).toMatchObject({
      kind: "committed",
      head: {
        acceptedUnitCount: 2,
        acceptedBatchCount: 1,
        pendingCandidateId: null,
      },
      operationReceipt: { operation: "reject_candidate" },
    });
    expect(await reviewRepository.rejectTranslationBatchCandidate(reject)).toMatchObject({
      kind: "unchanged",
      operationReceipt: { operation: "reject_candidate" },
    });
    expect(
      await reviewRepository.queryTranslationWorksetOperation({
        operation: "reject_candidate",
        input: reject,
      }),
    ).toMatchObject({ kind: "committed", receipt: { operation: "reject_candidate" } });
    await reviewRepository.dispose();
    await candidateLoopback.runtime.dispose();
    await recoveredReviewLoopback.runtime.dispose();
    await loopback.runtime.dispose();
  });

  it("waits for asynchronous repository disposal before acknowledging Browser disposal", async () => {
    let releaseDispose!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseDispose = resolve;
    });
    const loopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({
        beforeDispose: () => gate,
      }),
    });
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => loopback.worker,
    });
    let settled = false;
    const disposal = repository.dispose().then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    releaseDispose();
    await disposal;
    expect(settled).toBe(true);
    expect(loopback.worker.terminated).toBe(true);
  });
});
