// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramRepositoryV3,
  type ProgramRepositoryWorkerLikeV6,
} from "../product/browser-program-repository.ts";
import {
  createMemoryProgramRepositoryBackingV3,
  createMemoryProgramRepositoryV3,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryCreateInputV3,
  type ProgramRepositoryDecideInputV3,
  type ProgramRepositorySettleAgentRunInputV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "../product/program-repository.ts";
import { admitProgramRepositoryWorkerRequestEnvelopeV6 } from "../product/program-repository-worker-protocol.ts";
import { createProgramRepositoryWorkerRuntimeV6 } from "../product/program-repository-worker-runtime.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

interface WorkerMessageEventV4 {
  readonly data: unknown;
}

class FakeProgramRepositoryWorkerV4 implements ProgramRepositoryWorkerLikeV6 {
  readonly messageListeners = new Set<(event: WorkerMessageEventV4) => void>();
  readonly errorListeners = new Set<() => void>();
  readonly messageErrorListeners = new Set<() => void>();
  readonly postMessageSpy = vi.fn<(message: unknown) => void>();
  terminated = false;
  receive: (message: unknown) => void = () => undefined;
  onTerminate: () => void = () => undefined;

  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV4) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: WorkerMessageEventV4) => void);
    } else if (type === "error") this.errorListeners.add(listener as () => void);
    else this.messageErrorListeners.add(listener as () => void);
  }

  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: ((event: WorkerMessageEventV4) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: WorkerMessageEventV4) => void);
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

function createLoopbackWorkerV4(input: {
  readonly repository: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly throwResponse?: () => boolean;
}) {
  const worker = new FakeProgramRepositoryWorkerV4();
  const runtime = createProgramRepositoryWorkerRuntimeV6({
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

function createProgramFixtureV3(workspaceId: string) {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const result = session.submitIntent("Create a focused writing workspace.");
  if (result.kind !== "created") throw new Error("expected Program creation");
  const snapshot = session.getSnapshot();
  const program = snapshot.program;
  const proposal = snapshot.proposal;
  const workspace = snapshot.workspace;
  if (program === null || proposal === null || workspace === null) {
    throw new Error("expected Program workspace");
  }
  const continuation = {
    revision: 1,
    programId: program.programId,
    workspaceId: workspace.workspaceId,
    volumeId: `${program.programId}.volume.1`,
    workspaceFormat: 1,
    programRevision: 1,
    repositoryRevision: 1,
  } satisfies BrowserProgramContinuationManifestV1;
  const reviewedHead = {
    checkpointId: `${workspaceId}.checkpoint.1`,
    generation: 1,
  } as const;
  const createInput = {
    snapshot,
    updatedAt: 10,
    continuation,
    reviewedHead,
  } satisfies ProgramRepositoryCreateInputV3;
  return { session, snapshot, program, proposal, continuation, reviewedHead, createInput };
}

function completedAgentRunV3(workspaceId: string) {
  const fixture = createProgramFixtureV3(workspaceId);
  const text = "Add an explicit review gate.";
  const terminal = {
    run: {
      agentRunId: `${workspaceId}.agent-run.1`,
      proposalId: fixture.proposal.proposalId,
      programId: fixture.program.programId,
      baseProgramRevision: fixture.program.revision,
      baseRepositoryRevision: 1,
      text,
    },
    outcome: "completed" as const,
    candidate: {
      revision: 1 as const,
      proposalId: fixture.proposal.proposalId,
      programId: fixture.program.programId,
      baseProgramRevision: fixture.program.revision,
      text,
      requirement: "Require an explicit review gate.",
    },
    finalAssistantReply: "The revised proposal is ready for review.",
  };
  const applied = fixture.session.applyAgentRunTerminal(terminal);
  if (applied.kind !== "applied") throw new Error("expected terminal Program revision");
  const settled = fixture.session.getSnapshot();
  const settleInput = {
    programId: fixture.program.programId,
    expectedRepositoryRevision: 1,
    terminal,
    snapshot: settled,
    continuation: fixture.continuation,
    reviewedHead: {
      checkpointId: `${workspaceId}.checkpoint.2`,
      generation: 2,
    },
    updatedAt: 11,
  } satisfies ProgramRepositorySettleAgentRunInputV3;
  return { ...fixture, terminal, settled, settleInput };
}

function acceptedProgramV3(workspaceId: string) {
  const fixture = createProgramFixtureV3(workspaceId);
  const decision = fixture.session.acceptProposal({
    proposalId: fixture.proposal.proposalId,
    programRevision: fixture.proposal.programRevision,
  });
  if (decision.kind !== "applied") throw new Error("expected accepted proposal");
  const accepted = fixture.session.getSnapshot();
  const snapshotReceipt = {
    revision: 1,
    snapshotId: `${fixture.program.programId}.snapshot.1`,
    programId: fixture.program.programId,
    workspaceId: fixture.continuation.workspaceId,
    volumeId: fixture.continuation.volumeId,
    workspaceFormat: 1,
    proposalId: fixture.proposal.proposalId,
    programRevision: fixture.program.revision,
    baseRepositoryRevision: 1,
    checkpointId: fixture.reviewedHead.checkpointId,
    generation: fixture.reviewedHead.generation,
    fileCount: 2,
    archiveBytes: 1_024,
  } as const;
  const decideInput = {
    programId: fixture.program.programId,
    expectedRepositoryRevision: 1,
    expectedProposal: {
      proposalId: fixture.proposal.proposalId,
      programRevision: fixture.proposal.programRevision,
    },
    status: "accepted",
    snapshot: accepted,
    continuation: fixture.continuation,
    snapshotReceipt,
    updatedAt: 12,
  } satisfies ProgramRepositoryDecideInputV3;
  return { ...fixture, accepted, snapshotReceipt, decideInput };
}

describe("Browser ProgramRepositoryV3 Worker V6 boundary", () => {
  it("rejects retired envelopes and the detached continuation mutation", () => {
    const fixture = acceptedProgramV3("workspace.worker.protocol");
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV6({
        revision: 3,
        kind: "rpc_request",
        requestId: "program-repository.rpc.legacy",
        record: { method: "initialize" },
      }),
    ).toEqual({ kind: "rejected", path: "/revision" });
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV6({
        revision: 6,
        kind: "rpc_request",
        requestId: "program-repository.rpc.continuation-load",
        record: {
          method: "load_workspace_continuation",
          programId: fixture.program.programId,
        },
      }),
    ).toMatchObject({
      kind: "admitted",
      value: { record: { method: "load_workspace_continuation" } },
    });
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV6({
        revision: 6,
        kind: "rpc_request",
        requestId: "program-repository.rpc.retired-continuation-insert",
        record: {
          method: "insert_workspace_continuation",
          continuation: fixture.continuation,
        },
      }),
    ).toMatchObject({ kind: "rejected" });
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV6({
        revision: 6,
        kind: "rpc_request",
        requestId: "program-repository.rpc.accepted-decision",
        record: { method: "decide", input: fixture.decideInput },
      }),
    ).toMatchObject({
      kind: "admitted",
      value: {
        record: {
          method: "decide",
          input: { status: "accepted", snapshotReceipt: fixture.snapshotReceipt },
        },
      },
    });
    expect(
      admitProgramRepositoryWorkerRequestEnvelopeV6({
        revision: 6,
        kind: "rpc_request",
        requestId: "program-repository.rpc.invalid-rejected-decision",
        record: {
          method: "decide",
          input: { ...fixture.decideInput, status: "rejected" },
        },
      }),
    ).toEqual({ kind: "rejected", path: "/record/input" });
  });

  it("round-trips the atomic Program and continuation methods", async () => {
    const backing = createMemoryProgramRepositoryBackingV3();
    const worker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
    });
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = completedAgentRunV3("workspace.worker.roundtrip");

    await repository.initialize();
    const created = await repository.create(fixture.createInput);
    expect(created).toMatchObject({
      kind: "committed",
      aggregate: {
        repositoryRevision: 1,
        reviewBinding: {
          checkpointId: fixture.reviewedHead.checkpointId,
          generation: 1,
        },
      },
    });
    await expect(repository.loadWorkspaceContinuation(fixture.program.programId)).resolves.toEqual(
      fixture.continuation,
    );
    await expect(repository.loadProgramNetworkAccess(fixture.program.programId)).resolves.toEqual({
      revision: 1,
      programId: fixture.program.programId,
      enabled: false,
    });
    await expect(repository.setProgramNetworkAccess({
      programId: fixture.program.programId,
      enabled: true,
    })).resolves.toMatchObject({ kind: "committed", value: { enabled: true } });
    await expect(repository.loadProgramNetworkAccess(fixture.program.programId)).resolves
      .toMatchObject({ enabled: true });
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ updatedAt: 10, repositoryRevision: 1 }),
    ]);
    await expect(repository.settleAgentRun(fixture.settleInput)).resolves.toMatchObject({
      kind: "committed",
      aggregate: {
        repositoryRevision: 2,
        reviewBinding: {
          checkpointId: fixture.settleInput.reviewedHead.checkpointId,
          generation: 2,
        },
        agentRunReceipts: [{
          agentRunId: fixture.terminal.run.agentRunId,
          outcome: "completed",
          resultingProgramRevision: 2,
        }],
      },
    });
    await expect(repository.load(fixture.program.programId)).resolves.toMatchObject({
      repositoryRevision: 2,
      agentRunReceipts: [{ agentRunId: fixture.terminal.run.agentRunId }],
    });
    await expect(repository.loadWorkspaceContinuation(fixture.program.programId)).resolves
      .toMatchObject({ programRevision: 2, repositoryRevision: 2 });
    await expect(repository.reset()).resolves.toBeUndefined();
    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.load(fixture.program.programId)).resolves.toBeNull();
    await expect(repository.loadWorkspaceContinuation(fixture.program.programId)).resolves
      .toBeNull();
    await expect(repository.loadProgramNetworkAccess(fixture.program.programId)).resolves
      .toBeNull();
    await repository.dispose();

    expect(worker.terminated).toBe(true);
    await expect(repository.list()).rejects.toMatchObject({ code: "disposed" });
  });

  it("reports outcome_unknown when atomic create committed but response publication failed", async () => {
    const backing = createMemoryProgramRepositoryBackingV3();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = createProgramFixtureV3("workspace.worker.create-unknown");

    await repository.initialize();
    throwNextResponse = true;
    await expect(repository.create(fixture.createInput)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create",
    });
    expect(worker.terminated).toBe(true);
    expect(backing.programs.get(fixture.program.programId)).toMatchObject({
      repositoryRevision: 1,
    });
    expect(backing.workspaceContinuations.get(fixture.program.programId)).toEqual(
      fixture.continuation,
    );
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("retains a committed network disable when its response is lost", async () => {
    const backing = createMemoryProgramRepositoryBackingV3();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = createProgramFixtureV3("workspace.worker.network-disable-unknown");

    await repository.initialize();
    await repository.create(fixture.createInput);
    await repository.setProgramNetworkAccess({
      programId: fixture.program.programId,
      enabled: true,
    });
    throwNextResponse = true;
    await expect(repository.setProgramNetworkAccess({
      programId: fixture.program.programId,
      enabled: false,
    })).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "set_program_network_access",
    });

    expect(worker.terminated).toBe(true);
    expect(backing.programNetworkAccess.has(fixture.program.programId)).toBe(false);
    const reconciler = createBrowserProgramRepositoryV3({
      createWorker: () =>
        createLoopbackWorkerV4({ repository: createMemoryProgramRepositoryV3({ backing }) }),
    });
    await expect(reconciler.loadProgramNetworkAccess(fixture.program.programId)).resolves.toEqual({
      revision: 1,
      programId: fixture.program.programId,
      enabled: false,
    });
    await reconciler.dispose();
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("retains an exact terminal receipt when its post-commit response is lost", async () => {
    const backing = createMemoryProgramRepositoryBackingV3();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = completedAgentRunV3("workspace.worker.terminal-unknown");

    await repository.initialize();
    await repository.create(fixture.createInput);
    throwNextResponse = true;
    await expect(repository.settleAgentRun(fixture.settleInput)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "settle_agent_run",
    });

    expect(worker.terminated).toBe(true);
    expect(backing.programs.get(fixture.program.programId)).toMatchObject({
      repositoryRevision: 2,
      agentRunReceipts: [{
        agentRunId: fixture.terminal.run.agentRunId,
        outcome: "completed",
        resultingProgramRevision: 2,
      }],
    });
    expect(backing.workspaceContinuations.get(fixture.program.programId)).toMatchObject({
      programRevision: 2,
      repositoryRevision: 2,
    });
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("reconciles a lost accepted snapshot decision by exact V4 replay", async () => {
    const backing = createMemoryProgramRepositoryBackingV3();
    let throwNextResponse = false;
    const worker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
      throwResponse: () => {
        if (!throwNextResponse) return false;
        throwNextResponse = false;
        return true;
      },
    });
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = acceptedProgramV3("workspace.worker.accepted-unknown");

    await repository.initialize();
    await repository.create(fixture.createInput);
    throwNextResponse = true;
    await expect(repository.decide(fixture.decideInput)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "decide",
    });
    expect(worker.terminated).toBe(true);
    expect(backing.programs.get(fixture.program.programId)).toMatchObject({
      repositoryRevision: 2,
      reviewBinding: null,
      decisions: [{
        status: "accepted",
        snapshot: fixture.snapshotReceipt,
      }],
    });

    const reconcilerWorker = createLoopbackWorkerV4({
      repository: createMemoryProgramRepositoryV3({ backing }),
    });
    const reconciler = createBrowserProgramRepositoryV3({
      createWorker: () => reconcilerWorker,
    });
    await expect(reconciler.decide(fixture.decideInput)).resolves.toMatchObject({
      kind: "unchanged",
      aggregate: {
        decisions: [{ status: "accepted", snapshot: fixture.snapshotReceipt }],
      },
    });
    await expect(reconciler.load(fixture.program.programId)).resolves.toMatchObject({
      decisions: [{ status: "accepted", snapshot: fixture.snapshotReceipt }],
    });
    await reconciler.dispose();
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("terminates on a matching-id invalid response and settles every pending call", async () => {
    const worker = new FakeProgramRepositoryWorkerV4();
    let firstRequest = true;
    worker.receive = (message) => {
      if (!firstRequest) return;
      firstRequest = false;
      const requestId = (message as { readonly requestId: string }).requestId;
      queueMicrotask(() => {
        worker.emitMessage({
          revision: 6,
          kind: "rpc_response",
          requestId,
          record: { kind: "success", method: "create", value: null },
        });
      });
    };
    const repository = createBrowserProgramRepositoryV3({ createWorker: () => worker });
    const fixture = createProgramFixtureV3("workspace.worker.invalid-response");

    const mutation = repository.create(fixture.createInput);
    const read = repository.list();
    await expect(mutation).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create",
    });
    await expect(read).rejects.toMatchObject({ code: "unavailable", operation: "list" });
    expect(worker.terminated).toBe(true);
    await expect(repository.dispose()).resolves.toBeUndefined();
  });

  it("keeps pre-delivery failure retry-safe and admits known Worker failures", async () => {
    const fixture = createProgramFixtureV3("workspace.worker.failures");
    const postFailureWorker = new FakeProgramRepositoryWorkerV4();
    postFailureWorker.postMessageSpy.mockImplementationOnce(() => {
      throw new Error("synthetic clone failure");
    });
    const unavailable = createBrowserProgramRepositoryV3({
      createWorker: () => postFailureWorker,
    });
    await expect(unavailable.create(fixture.createInput)).rejects.toMatchObject({
      code: "unavailable",
      operation: "create",
    });
    postFailureWorker.terminate();

    const failureWorker = createLoopbackWorkerV4({
      repository: {
        ...createMemoryProgramRepositoryV3(),
        create: async () => {
          throw createProgramRepositoryFailureV3("quota_exceeded", "create");
        },
      },
    });
    const knownFailure = createBrowserProgramRepositoryV3({ createWorker: () => failureWorker });
    await expect(knownFailure.create(fixture.createInput)).rejects.toMatchObject({
      code: "quota_exceeded",
      operation: "create",
    });
    await knownFailure.dispose();
  });
});
