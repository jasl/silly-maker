// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramRepositoryV1,
  type ProgramRepositoryWorkerLikeV1,
} from "../product/browser-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV1,
  createMemoryProgramRepositoryV1,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV1,
  type ProgramRepositoryV1,
} from "../product/program-repository.ts";
import { createProgramRepositoryWorkerRuntimeV1 } from "../product/program-repository-worker-runtime.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

interface WorkerMessageEventV1 {
  readonly data: unknown;
}

class FakeProgramRepositoryWorkerV1 implements ProgramRepositoryWorkerLikeV1 {
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

function createLoopbackWorkerV1(input: {
  readonly repository: ProgramRepositoryV1;
  readonly throwResponse?: () => boolean;
}) {
  const worker = new FakeProgramRepositoryWorkerV1();
  const runtime = createProgramRepositoryWorkerRuntimeV1({
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

describe("Browser ProgramRepositoryV1 Worker boundary", () => {
  it("round-trips admitted product methods and disposes the Dedicated Worker", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    const worker = createLoopbackWorkerV1({
      repository: createMemoryProgramRepositoryV1({ backing }),
    });
    const repository = createBrowserProgramRepositoryV1({ createWorker: () => worker });
    const snapshot = initialSnapshotV1("workspace.worker.roundtrip");

    await repository.initialize();
    await expect(repository.create({ snapshot, updatedAt: 10 })).resolves.toMatchObject({
      kind: "committed",
      aggregate: { repositoryRevision: 1 },
    });
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ updatedAt: 10, repositoryRevision: 1 }),
    ]);
    await repository.dispose();

    expect(worker.terminated).toBe(true);
    await expect(repository.list()).rejects.toMatchObject({ code: "disposed" });
  });

  it("reports outcome_unknown when commit succeeded but Worker response publication failed", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV1({
      repository: createMemoryProgramRepositoryV1({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV1({ createWorker: () => worker });
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

  it("terminates on a matching-id invalid response and settles every pending call", async () => {
    const worker = new FakeProgramRepositoryWorkerV1();
    let firstRequest = true;
    worker.receive = (message) => {
      if (!firstRequest) return;
      firstRequest = false;
      const requestId = (message as { readonly requestId: string }).requestId;
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 1,
          kind: "rpc_response",
          requestId,
          record: { kind: "success", method: "create", value: null },
        });
      });
    };
    const repository = createBrowserProgramRepositoryV1({ createWorker: () => worker });
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
    const postFailureWorker = new FakeProgramRepositoryWorkerV1();
    postFailureWorker.postMessageSpy.mockImplementationOnce(() => {
      throw new Error("synthetic clone failure");
    });
    const unavailable = createBrowserProgramRepositoryV1({
      createWorker: () => postFailureWorker,
    });
    await expect(
      unavailable.create({
        snapshot: initialSnapshotV1("workspace.worker.pre-delivery"),
        updatedAt: 40,
      }),
    ).rejects.toMatchObject({ code: "unavailable", operation: "create" });
    postFailureWorker.terminate();

    const failureWorker = createLoopbackWorkerV1({
      repository: {
        ...createMemoryProgramRepositoryV1(),
        create: async () => {
          throw createProgramRepositoryFailureV1("quota_exceeded", "create");
        },
      },
    });
    const knownFailure = createBrowserProgramRepositoryV1({ createWorker: () => failureWorker });
    await expect(
      knownFailure.create({
        snapshot: initialSnapshotV1("workspace.worker.known-failure"),
        updatedAt: 50,
      }),
    ).rejects.toMatchObject({ code: "quota_exceeded", operation: "create" });
    await knownFailure.dispose();
  });
});
