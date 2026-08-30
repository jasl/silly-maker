// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramDataRepositoryV1,
  type ProgramDataRepositoryWorkerLikeV1,
} from "../product/browser-program-data-repository.ts";
import { createIndexedDbProgramDataRepositoryV1 } from "../product/indexeddb-program-data-repository.ts";
import type {
  ProgramCatalogContinuationV1,
  ProgramCatalogCreateInputV1,
} from "../product/program-catalog-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
  type ProgramProcessCreateBundleInputV1,
  type ProgramProcessDecisionBundleInputV1,
  type ProgramProcessRevisionBundleInputV1,
} from "../product/program-data-repository.ts";
import {
  admitProgramDataRepositoryWorkerRequestEnvelopeV1,
  admitProgramDataRepositoryWorkerResponseEnvelopeV1,
  type ProgramDataRepositoryWorkerRequestV1,
  type ProgramDataRepositoryWorkerResponseEnvelopeV1,
} from "../product/program-data-repository-worker-protocol.ts";
import { createProgramDataRepositoryWorkerRuntimeV1 } from "../product/program-data-repository-worker-runtime.ts";
import type { ProcessExecutionAcquireInputV1 } from "../product/process-execution-repository.ts";
import {
  createBuiltinCreatorProgramDefinitionRevisionV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessCheckpointV1,
  type TranscriptEntryV1,
} from "../product/program-process-repository.ts";
import type { PreviewProgramV1 } from "../product/contracts.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";
import {
  createIndexedDbProgramDataRepositoryTestAdapterV1,
  type IndexedDbProgramDataRepositoryTestAdapterV1,
} from "./indexeddb-program-data-repository-test-adapter.ts";

interface WorkerMessageEventV1 {
  readonly data: unknown;
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
  const repository = createIndexedDbProgramDataRepositoryTestAdapterV1({
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

function createInputV1(programId: string): ProgramCatalogCreateInputV1 {
  return {
    commitId: `commit.${programId}.create`,
    program: programV1(programId),
    proposalId: `proposal.${programId}.1`,
    continuation: continuationV1(programId),
    reviewedHead: { checkpointId: `checkpoint.${programId}.1`, generation: 1 },
    updatedAt: 1,
  };
}

function createBundleV1(
  programId: string,
  processId: string,
): ProgramProcessCreateBundleInputV1 {
  const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
  return {
    catalog: createInputV1(programId),
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
      entries: [entryV1({ processId, sequence: 1, role: "user" })],
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
      entries: [entryV1({ processId, sequence: 2 })],
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
      continuation: { ...continuationV1(programId), programRevision: 2, repositoryRevision: 2 },
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
): ProgramProcessDecisionBundleInputV1 {
  return {
    catalog: {
      programId,
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: `proposal.${programId}.1`, programRevision: 1 },
      commitId: `commit.${programId}.accept.1`,
      continuation: continuationV1(programId),
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

function acceptedReceiptV1(programId: string): ProgramWorkspaceSnapshotReceiptV1 {
  return {
    revision: 1,
    snapshotId: `snapshot.${programId}.1`,
    programId,
    workspaceId: `workspace.${programId}`,
    volumeId: `volume.${programId}`,
    workspaceFormat: 1,
    proposalId: `proposal.${programId}.1`,
    programRevision: 1,
    baseRepositoryRevision: 1,
    checkpointId: `checkpoint.${programId}.1`,
    generation: 1,
    fileCount: 2,
    archiveBytes: 128,
  };
}

function checkpointV1(sequence: number): ProcessCheckpointV1 {
  return {
    checkpointId: `process.checkpoint.${String(sequence)}`,
    throughSequence: sequence,
    workspaceId: "workspace.process",
    workspaceCheckpointId: `workspace.checkpoint.${String(sequence)}`,
    workspaceGeneration: sequence,
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
  }, request);
}

async function seedProcessV1(
  repository: IndexedDbProgramDataRepositoryTestAdapterV1,
  processId: string,
) {
  const definition = createBuiltinCreatorProgramDefinitionRevisionV1();
  await repository.publishProgramDefinitionRevision(definition);
  const created = await repository.createProcess({
    processId,
    programDefinition: { programId: definition.programId, revision: definition.revision },
    subjectProgramId: "program.worker",
    createdAt: 1,
  });
  if (created.kind !== "committed") throw new Error("expected Process creation");
  return created.process;
}

describe("Program data repository Worker boundary", () => {
  it("round-trips Catalog pages, accepted decisions, rich Process transcript, and network state", async () => {
    const loopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1(),
    });
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => loopback.worker,
    });
    await repository.initialize();

    const creatorDefinition = createBuiltinCreatorProgramDefinitionRevisionV1();
    await repository.publishProgramDefinitionRevision(creatorDefinition);
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
    expect(await repository.loadContinuation("program.worker"))
      .toMatchObject({ repositoryRevision: 2 });

    const process = created.kind === "conflict" || created.kind === "program_definition_missing"
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
        startingCheckpoint: checkpointV1(3),
        updatedAt: 5,
      },
    } satisfies ProcessExecutionAcquireInputV1;
    const acquired = await repository.acquireProcessExecution(acquireInput);
    if (acquired.kind !== "committed") throw new Error("expected Process execution acquire");
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
        checkpoint: checkpointV1(4),
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
    expect(await repository.loadProcess(process.processId)).toMatchObject({
      transcriptFrontier: 4,
    });
    expect(await repository.loadProgramDefinitionRevision("sillyos.builtin.creator", 1))
      .toMatchObject({ kind: "creator" });

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
        startingCheckpoint: checkpointV1(2),
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
        checkpoint: checkpointV1(3),
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

    expect(await repository.loadProgramNetworkAccess("program.worker"))
      .toEqual({ revision: 1, programId: "program.worker", enabled: false });
    expect(await repository.setProgramNetworkAccess({ programId: "program.worker", enabled: true }))
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

  it("keeps malformed repository output admission at the page-side receiver", async () => {
    const delegate = createTestProgramDataRepositoryV1();
    const repository: ProgramDataRepositoryV1 = {
      ...delegate,
      loadProcess: async () => ({ impossible: true }) as never,
    };
    const loopback = createLoopbackWorkerV1({ repository });
    const browser = createBrowserProgramDataRepositoryV1({ createWorker: () => loopback.worker });

    await expect(browser.loadProcess("process.malformed-worker-output")).rejects.toMatchObject({
      code: "wire_invalid",
      operation: "load_process",
    });
    expect(loopback.worker.terminated).toBe(true);
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
    const wrongProgramRevision = admitSuccessResponseV1({
      method: "load_program_revision",
      programId: "program.requested",
      revision: 2,
    }, programV1("program.other", 2));
    expect(wrongProgramRevision.kind).toBe("rejected");

    const wrongDecisionSnapshot = admitSuccessResponseV1({
      method: "load_program_decision",
      programId: "program.requested",
      proposalId: "proposal.program.requested.1",
      programRevision: 1,
    }, {
      programId: "program.requested",
      proposalId: "proposal.program.requested.1",
      programRevision: 1,
      status: "accepted",
      repositoryRevision: 1,
      snapshot: acceptedReceiptV1("program.other"),
    });
    expect(wrongDecisionSnapshot.kind).toBe("rejected");

    const wrongNetworkMutation = admitSuccessResponseV1({
      method: "set_program_network_access",
      input: { programId: "program.requested", enabled: true },
    }, {
      kind: "committed",
      value: { revision: 1, programId: "program.other", enabled: true },
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
    ).toBe("rejected");
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
    expect(
      admitSuccessResponseV1(
        { method: "create_program_with_process", input: compositeInput },
        compositeResult,
      ).kind,
    ).toBe("admitted");
    expect(
      admitSuccessResponseV1(
        { method: "create_program_with_process", input: compositeInput },
        {
          ...compositeResult,
          process: { ...compositeResult.process, processId: "process.other" },
        },
      ).kind,
    ).toBe("rejected");
    const impossibleMissingDefinition = {
      kind: "program_definition_missing",
      programDefinition: compositeInput.process.programDefinition,
    };
    expect(
      admitSuccessResponseV1(
        {
          method: "apply_program_revision_with_process_transcript",
          input: revisionBundleV1("program.wire-binding", "process.wire-binding"),
        },
        impossibleMissingDefinition,
      ).kind,
    ).toBe("rejected");
    expect(
      admitSuccessResponseV1(
        {
          method: "decide_program_with_process_transcript",
          input: decisionBundleV1("program.wire-binding", "process.wire-binding"),
        },
        impossibleMissingDefinition,
      ).kind,
    ).toBe("rejected");
    await repository.dispose();
  });

  it("round-trips an exact Program-successor terminal operation query", async () => {
    const repository = createTestProgramDataRepositoryV1();
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
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
        continuation: continuationV1(programId),
        reviewedHead: {
          checkpointId: terminalCheckpoint.workspaceCheckpointId,
          generation: terminalCheckpoint.workspaceGeneration,
        },
        updatedAt: 4,
      },
    };
    expect(
      admitProgramDataRepositoryWorkerRequestEnvelopeV1({
        revision: 1,
        kind: "rpc_request",
        requestId: "request.non-completed-program-successor",
        record: {
          method: "commit_program_revision_with_process_execution_terminal",
          input: {
            ...input,
            transcript: {
              ...input.transcript,
              terminalAttemptReceipt: {
                ...input.transcript.terminalAttemptReceipt,
                outcome: "failed",
              },
            },
          },
        },
      }).kind,
    ).toBe("rejected");
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
    const queried = await repository.queryProcessOperation(expectation);
    expect(queried).toMatchObject({
      kind: "committed",
      receipt: {
        operation: "program_revision_terminal",
        programId,
        programRevision: 2,
        repositoryRevision: 2,
      },
    });
    expect(
      admitSuccessResponseV1(
        { method: "query_process_operation", input: expectation },
        queried,
      ).kind,
    ).toBe("admitted");
    if (queried.kind !== "committed") throw new Error("expected committed query receipt");
    expect(
      admitSuccessResponseV1(
        { method: "query_process_operation", input: expectation },
        {
          kind: "committed",
          receipt: { ...queried.receipt, programRevision: 1 },
        },
      ).kind,
    ).toBe("rejected");
    await repository.dispose();
  });

  it("rejects unordered pages and cursors that cannot resume exact traversal", async () => {
    const repository = createTestProgramDataRepositoryV1();
    await repository.create(createInputV1("program.alpha"));
    await repository.create(createInputV1("program.beta"));
    const programInput = { before: null, maximumBytes: 4 * 1024 } as const;
    const programs = await repository.listPrograms(programInput);
    expect(programs.summaries).toHaveLength(2);
    expect(
      admitSuccessResponseV1(
        { method: "list_programs", input: programInput },
        { ...programs, summaries: programs.summaries.toReversed() },
      ).kind,
    ).toBe("rejected");
    const firstProgram = programs.summaries[0]!;
    expect(
      admitSuccessResponseV1(
        { method: "list_programs", input: programInput },
        {
          ...programs,
          nextCursor: { updatedAt: firstProgram.updatedAt, programId: firstProgram.programId },
        },
      ).kind,
    ).toBe("rejected");

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
      repository: createIndexedDbProgramDataRepositoryV1({ indexedDB, keyRange: IDBKeyRange }),
      throwResponse: (message) => message.record.method === "acquire_process_execution",
    });
    const secondLoopback = createLoopbackWorkerV1({
      repository: createIndexedDbProgramDataRepositoryV1({ indexedDB, keyRange: IDBKeyRange }),
    });
    const workers = [firstLoopback.worker, secondLoopback.worker];
    const repository = createBrowserProgramDataRepositoryV1({
      createWorker: () => {
        const worker = workers.shift();
        if (worker === undefined) throw new Error("unexpected Worker generation");
        return worker;
      },
    });
    await repository.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    await repository.createProgramWithProcess(
      createBundleV1("program.execution-query", "process.execution-query"),
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
        startingCheckpoint: checkpointV1(2),
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

  it("fences a delivered composite and exact-replays both authorities through a new Worker", async () => {
    const indexedDB = new IDBFactory();
    const firstLoopback = createLoopbackWorkerV1({
      repository: createTestProgramDataRepositoryV1({ indexedDB }),
      throwResponse: (message) => message.record.method === "create_program_with_process",
    });
    const first = createBrowserProgramDataRepositoryV1({
      createWorker: () => firstLoopback.worker,
    });
    await first.publishProgramDefinitionRevision(
      createBuiltinCreatorProgramDefinitionRevisionV1(),
    );
    const bundle = createBundleV1("program.composite-replay", "process.composite-replay");
    await expect(first.createProgramWithProcess(bundle)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create_program_with_process",
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
