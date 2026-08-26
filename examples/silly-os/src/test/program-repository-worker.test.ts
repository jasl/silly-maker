// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramRepositoryV2,
  type ProgramRepositoryWorkerLikeV2,
} from "../product/browser-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV2,
  createMemoryProgramRepositoryV2,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV2,
  type ProgramRepositoryV2,
} from "../product/program-repository.ts";
import { admitProgramRepositoryWorkerRequestEnvelopeV2 } from "../product/program-repository-worker-protocol.ts";
import { createProgramRepositoryWorkerRuntimeV2 } from "../product/program-repository-worker-runtime.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

interface WorkerMessageEventV2 {
  readonly data: unknown;
}

class FakeProgramRepositoryWorkerV2 implements ProgramRepositoryWorkerLikeV2 {
  readonly messageListeners = new Set<(event: WorkerMessageEventV2) => void>();
  readonly errorListeners = new Set<() => void>();
  readonly messageErrorListeners = new Set<() => void>();
  readonly postMessageSpy = vi.fn<(message: unknown) => void>();
  terminated = false;
  receive: (message: unknown) => void = () => undefined;
  onTerminate: () => void = () => undefined;

  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV2) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: WorkerMessageEventV2) => void);
    } else if (type === "error") this.errorListeners.add(listener as () => void);
    else this.messageErrorListeners.add(listener as () => void);
  }

  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV2) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: WorkerMessageEventV2) => void);
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

function createLoopbackWorkerV2(input: {
  readonly repository: ProgramRepositoryV2;
  readonly throwResponse?: () => boolean;
}) {
  const worker = new FakeProgramRepositoryWorkerV2();
  const runtime = createProgramRepositoryWorkerRuntimeV2({
    repository: input.repository,
    postMessage: (message) => {
      if (input.throwResponse?.() === true) throw new Error("synthetic Worker post failure");
      queueMicrotask(() => worker.emitMessage(message));
    },
    onFatalError: () => queueMicrotask(() => worker.emitError()),
  });
  worker.receive = (message) => runtime.receive(message);
  worker.onTerminate = () => runtime.dispose();
  return worker;
}

function initialSnapshotV1(workspaceId: string) {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const result = session.submitIntent("Create a focused writing workspace.");
  if (result.kind !== "created") throw new Error("expected Program creation");
  return session.getSnapshot();
}

function completedAgentRunV2(workspaceId: string) {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const created = session.submitIntent("Create a focused writing workspace.");
  if (created.kind !== "created") throw new Error("expected Program creation");
  const initial = session.getSnapshot();
  const proposal = initial.proposal;
  const program = initial.program;
  if (proposal === null || program === null) throw new Error("expected initial Program");
  const terminal = {
    run: {
      agentRunId: `${workspaceId}.agent-run.1`,
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
      baseRepositoryRevision: 1,
      text: "Add an explicit review gate.",
    },
    outcome: "completed" as const,
    candidate: {
      revision: 1 as const,
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
      text: "Add an explicit review gate.",
      requirement: "Require an explicit review gate.",
    },
    finalAssistantReply: "The revised proposal is ready for review.",
  };
  const applied = session.applyAgentRunTerminal(terminal);
  if (applied.kind !== "applied") throw new Error("expected terminal Program revision");
  return { initial, terminal, settled: session.getSnapshot() };
}

describe("Browser ProgramRepositoryV2 Worker boundary", () => {
  it("rejects the retired V1 request envelope", () => {
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV2({
        revision: 1,
        kind: "rpc_request",
        requestId: "program-repository.rpc.legacy",
        record: { method: "initialize" },
      }),
    ).toEqual({ kind: "rejected", path: "/revision" });
  });

  it("round-trips admitted product methods and disposes the Dedicated Worker", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const worker = createLoopbackWorkerV2({
      repository: createMemoryProgramRepositoryV2({ backing }),
    });
    const repository = createBrowserProgramRepositoryV2({ createWorker: () => worker });
    const fixture = completedAgentRunV2("workspace.worker.roundtrip");

    await repository.initialize();
    await expect(repository.create({ snapshot: fixture.initial, updatedAt: 10 })).resolves
      .toMatchObject({
        kind: "committed",
        aggregate: { repositoryRevision: 1 },
      });
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ updatedAt: 10, repositoryRevision: 1 }),
    ]);
    await expect(
      repository.settleAgentRun({
        programId: fixture.terminal.run.programId,
        expectedRepositoryRevision: 1,
        terminal: fixture.terminal,
        snapshot: fixture.settled,
        updatedAt: 11,
      }),
    ).resolves.toMatchObject({
      kind: "committed",
      aggregate: {
        repositoryRevision: 2,
        agentRunReceipts: [{
          agentRunId: fixture.terminal.run.agentRunId,
          outcome: "completed",
          resultingProgramRevision: 2,
        }],
      },
    });
    await expect(repository.load(fixture.terminal.run.programId)).resolves.toMatchObject({
      repositoryRevision: 2,
      agentRunReceipts: [{ agentRunId: fixture.terminal.run.agentRunId }],
    });
    await repository.dispose();

    expect(worker.terminated).toBe(true);
    await expect(repository.list()).rejects.toMatchObject({ code: "disposed" });
  });

  it("reports outcome_unknown when commit succeeded but Worker response publication failed", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV2({
      repository: createMemoryProgramRepositoryV2({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV2({ createWorker: () => worker });
    const snapshot = initialSnapshotV1("workspace.worker.unknown");
    const programId = snapshot.program?.programId;
    if (programId === undefined) throw new Error("expected Program id");

    await repository.initialize();
    throwNextResponse = true;
    await expect(repository.create({ snapshot, updatedAt: 20 })).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create",
    });
    expect(worker.terminated).toBe(true);
    expect(backing.programs.get(programId)).toMatchObject({ repositoryRevision: 1 });
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("retains an exact terminal receipt when its post-commit Worker response is lost", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV2({
      repository: createMemoryProgramRepositoryV2({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV2({ createWorker: () => worker });
    const fixture = completedAgentRunV2("workspace.worker.terminal-unknown");

    await repository.initialize();
    await repository.create({ snapshot: fixture.initial, updatedAt: 20 });
    throwNextResponse = true;
    await expect(
      repository.settleAgentRun({
        programId: fixture.terminal.run.programId,
        expectedRepositoryRevision: 1,
        terminal: fixture.terminal,
        snapshot: fixture.settled,
        updatedAt: 21,
      }),
    ).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "settle_agent_run",
    });

    expect(worker.terminated).toBe(true);
    expect(backing.programs.get(fixture.terminal.run.programId)).toMatchObject({
      repositoryRevision: 2,
      agentRunReceipts: [{
        agentRunId: fixture.terminal.run.agentRunId,
        outcome: "completed",
        resultingProgramRevision: 2,
      }],
    });
    const reconciler = createMemoryProgramRepositoryV2({ backing });
    await expect(reconciler.load(fixture.terminal.run.programId)).resolves.toMatchObject({
      repositoryRevision: 2,
      agentRunReceipts: [{ agentRunId: fixture.terminal.run.agentRunId }],
    });
    await reconciler.dispose();
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("terminates on a matching-id invalid response and settles every pending call", async () => {
    const worker = new FakeProgramRepositoryWorkerV2();
    let firstRequest = true;
    worker.receive = (message) => {
      if (!firstRequest) return;
      firstRequest = false;
      const requestId = (message as { readonly requestId: string }).requestId;
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 2,
          kind: "rpc_response",
          requestId,
          record: { kind: "success", method: "create", value: null },
        });
      });
    };
    const repository = createBrowserProgramRepositoryV2({ createWorker: () => worker });
    const snapshot = initialSnapshotV1("workspace.worker.invalid-response");

    const mutation = repository.create({ snapshot, updatedAt: 30 });
    const read = repository.list();
    await expect(mutation).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create",
    });
    await expect(read).rejects.toMatchObject({ code: "unavailable", operation: "list" });
    expect(worker.terminated).toBe(true);
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("keeps a pre-delivery postMessage failure retry-safe and admits known Worker failures", async () => {
    const postFailureWorker = new FakeProgramRepositoryWorkerV2();
    postFailureWorker.postMessageSpy.mockImplementationOnce(() => {
      throw new Error("synthetic clone failure");
    });
    const unavailable = createBrowserProgramRepositoryV2({
      createWorker: () => postFailureWorker,
    });
    await expect(
      unavailable.create({
        snapshot: initialSnapshotV1("workspace.worker.pre-delivery"),
        updatedAt: 40,
      }),
    ).rejects.toMatchObject({ code: "unavailable", operation: "create" });
    postFailureWorker.terminate();

    const failureWorker = createLoopbackWorkerV2({
      repository: {
        ...createMemoryProgramRepositoryV2(),
        create: async () => {
          throw createProgramRepositoryFailureV2("quota_exceeded", "create");
        },
      },
    });
    const knownFailure = createBrowserProgramRepositoryV2({ createWorker: () => failureWorker });
    await expect(
      knownFailure.create({
        snapshot: initialSnapshotV1("workspace.worker.known-failure"),
        updatedAt: 50,
      }),
    ).rejects.toMatchObject({ code: "quota_exceeded", operation: "create" });
    await knownFailure.dispose();
  });
});
