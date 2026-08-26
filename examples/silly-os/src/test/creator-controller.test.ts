// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createCreatorControllerV1,
  type CreatorControllerV1,
  type CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import {
  createMemoryProgramRepositoryBackingV2,
  createMemoryProgramRepositoryV2,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV2,
  type ProgramRepositoryCreateInputV2,
  type ProgramRepositorySettleAgentRunInputV2,
  type ProgramRepositoryV2,
} from "../product/program-repository.ts";
import type { CreatorAgentTerminalRunV1 } from "../product/contracts.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

const intentV1 = "Create a focused writing workspace.";
const workspaceIdV1 = "workspace.controller.test";

interface DeferredV1<TValue> {
  readonly promise: Promise<TValue>;
  resolve(value: TValue): void;
}

function createDeferredV1<TValue>(): DeferredV1<TValue> {
  let resolvePromise: ((value: TValue) => void) | undefined;
  const promise = new Promise<TValue>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value): void {
      if (resolvePromise === undefined) throw new Error("deferred resolver unavailable");
      resolvePromise(value);
    },
  };
}

function proxyRepositoryV1(
  delegate: ProgramRepositoryV2,
  overrides: Partial<ProgramRepositoryV2> = {},
): ProgramRepositoryV2 {
  return {
    initialize: overrides.initialize ?? (() => delegate.initialize()),
    list: overrides.list ?? (() => delegate.list()),
    load: overrides.load ?? ((programId) => delegate.load(programId)),
    create: overrides.create ?? ((input) => delegate.create(input)),
    applyRevision: overrides.applyRevision ?? ((input) => delegate.applyRevision(input)),
    settleAgentRun: overrides.settleAgentRun ?? ((input) => delegate.settleAgentRun(input)),
    decide: overrides.decide ?? ((input) => delegate.decide(input)),
    dispose: overrides.dispose ?? (() => delegate.dispose()),
  };
}

function createControllerV1(input: {
  readonly createRepository: () => ProgramRepositoryV2;
  readonly createWorkspaceId?: () => string;
  readonly createAgentRunId?: () => string;
  readonly now?: () => number;
}): CreatorControllerV1 {
  return createCreatorControllerV1({
    creator: createDeterministicFakeCreatorV1(),
    createRepository: input.createRepository,
    createWorkspaceId: input.createWorkspaceId ?? (() => workspaceIdV1),
    createAgentRunId: input.createAgentRunId ?? (() => "agent.run.controller.1"),
    now: input.now ?? (() => 100),
  });
}

function completedTerminalV1(
  controller: CreatorControllerV1,
): Extract<CreatorAgentTerminalRunV1, { readonly outcome: "completed" }> {
  const prepared = controller.prepareAgentRun("Make the review checkpoint explicit.");
  if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
    throw new Error("expected a prepared Agent run");
  }
  const { run } = prepared.value;
  return {
    run,
    outcome: "completed",
    candidate: {
      revision: 1,
      proposalId: run.proposalId,
      programId: run.programId,
      baseProgramRevision: run.baseProgramRevision,
      text: run.text,
      requirement: "Require an explicit human review checkpoint.",
    },
    finalAssistantReply: "I prepared Program proposal v2 for review.",
  };
}

function durabilityPhasesV1(
  controller: CreatorControllerV1,
): {
  readonly phases: CreatorDurabilityStateV1["phase"][];
  readonly sessionRoutes: string[];
  readonly unsubscribe: () => void;
} {
  const phases: CreatorDurabilityStateV1["phase"][] = [];
  const sessionRoutes: string[] = [];
  const unsubscribe = controller.subscribe(() => {
    const snapshot = controller.getSnapshot();
    phases.push(snapshot.durability.phase);
    sessionRoutes.push(snapshot.session.route);
  });
  return { phases, sessionRoutes, unsubscribe };
}

describe("SillyOS durable Creator controller", () => {
  it("publishes saving while retaining the old session until the commit receipt arrives", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const delegate = createMemoryProgramRepositoryV2({ backing });
    const receiptGate = createDeferredV1<void>();
    const createInputs: ProgramRepositoryCreateInputV2[] = [];
    const repository = proxyRepositoryV1(delegate, {
      async create(input) {
        createInputs.push(input);
        const result = await delegate.create(input);
        await receiptGate.promise;
        return result;
      },
    });
    const controller = createControllerV1({ createRepository: () => repository });
    await controller.initialize();
    const before = controller.getSnapshot().session;
    const observed = durabilityPhasesV1(controller);

    const pending = controller.submitIntent(intentV1);

    expect(controller.getSnapshot().durability).toEqual({ phase: "saving", operation: "create" });
    expect(controller.getSnapshot().session).toBe(before);
    expect(controller.getSnapshot().session.route).toBe("home");
    expect(controller.getSnapshot().recentPrograms).toEqual([]);
    expect(createInputs).toHaveLength(1);

    receiptGate.resolve(undefined);
    await expect(pending).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "created", workspaceId: workspaceIdV1 },
    });

    expect(observed.phases).toEqual(["saving", "ready"]);
    expect(observed.sessionRoutes).toEqual(["home", "workspace"]);
    expect(controller.getSnapshot().session.route).toBe("workspace");
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    expect(controller.getSnapshot().recentPrograms).toHaveLength(1);
    observed.unsubscribe();
    await controller.dispose();
  });

  it("projects the UI proposal onto the exact durable decision reference", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const repository = createMemoryProgramRepositoryV2({ backing });
    const controller = createControllerV1({ createRepository: () => repository });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const proposal = controller.getSnapshot().session.proposal;
    if (proposal === null) throw new Error("expected a current proposal");

    await expect(controller.acceptProposal(proposal)).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "applied", status: "accepted" },
    });

    expect(controller.getSnapshot().durability).toEqual({ phase: "ready" });
    expect(controller.getSnapshot().session.proposal?.status).toBe("accepted");
    expect((await repository.load("program.workspace.controller.test"))?.decisions).toEqual([
      expect.objectContaining({
        proposalId: proposal.proposalId,
        programRevision: proposal.programRevision,
        status: "accepted",
      }),
    ]);
    await controller.dispose();
  });

  it("retains the old snapshot after an explicit failure and retries the exact same Agent terminal", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const delegate = createMemoryProgramRepositoryV2({ backing });
    const terminalInputs: ProgramRepositorySettleAgentRunInputV2[] = [];
    let failFirstTerminal = true;
    const repository = proxyRepositoryV1(delegate, {
      async settleAgentRun(input) {
        terminalInputs.push(input);
        if (failFirstTerminal) {
          failFirstTerminal = false;
          throw createProgramRepositoryFailureV2("transaction_aborted", "settle_agent_run");
        }
        return await delegate.settleAgentRun(input);
      },
    });
    let instant = 100;
    const controller = createControllerV1({
      createRepository: () => repository,
      now: () => instant++,
    });
    await controller.initialize();
    await expect(controller.submitIntent(intentV1)).resolves.toMatchObject({ kind: "completed" });
    const before = controller.getSnapshot().session;
    const observedSessions: typeof before[] = [];
    const unsubscribe = controller.subscribe(() => {
      observedSessions.push(controller.getSnapshot().session);
    });

    const terminal = {
      ...completedTerminalV1(controller),
      finalAssistantReply: "  I prepared Program proposal v2 for review.  ",
    } satisfies CreatorAgentTerminalRunV1;
    await expect(controller.recordAgentRunTerminal(terminal)).resolves
      .toEqual({ kind: "failed", code: "transaction_aborted" });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "agent_run",
      code: "transaction_aborted",
      recovery: "retry",
    });
    expect(controller.getSnapshot().session).toBe(before);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    expect(observedSessions.every((snapshot) => snapshot === before)).toBe(true);
    expect(terminalInputs).toHaveLength(1);

    await expect(controller.retry()).resolves.toBe(true);

    expect(terminalInputs).toHaveLength(2);
    expect(terminalInputs[1]).toEqual(terminalInputs[0]);
    expect(terminalInputs[1]?.snapshot).toBe(terminalInputs[0]?.snapshot);
    expect(terminalInputs[1]?.updatedAt).toBe(101);
    expect(controller.getSnapshot().durability).toEqual({ phase: "ready" });
    expect(controller.getSnapshot().session.program?.revision).toBe(2);
    expect(controller.getSnapshot().session.messages.at(-1)?.text).toBe(
      "I prepared Program proposal v2 for review.",
    );
    expect(backing.programs.get(terminal.run.programId)?.agentRunReceipts).toEqual([
      expect.objectContaining({ agentRunId: terminal.run.agentRunId, outcome: "completed" }),
    ]);
    unsubscribe();
    await controller.dispose();
  });

  it("reconciles outcome_unknown as committed without exposing the successor early", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const firstDelegate = createMemoryProgramRepositoryV2({ backing });
    const secondDelegate = createMemoryProgramRepositoryV2({ backing });
    const firstRepository = proxyRepositoryV1(firstDelegate, {
      async create(input) {
        await firstDelegate.create(input);
        throw createProgramRepositoryFailureV2("outcome_unknown", "create");
      },
    });
    const repositories = [firstRepository, secondDelegate];
    let repositoryIndex = 0;
    const controller = createControllerV1({
      createRepository: () => {
        const repository = repositories[repositoryIndex++];
        if (repository === undefined) throw new Error("unexpected repository replacement");
        return repository;
      },
    });
    await controller.initialize();
    const observed = durabilityPhasesV1(controller);

    await expect(controller.submitIntent(intentV1)).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "created" },
    });

    expect(repositoryIndex).toBe(2);
    expect(observed.phases).toEqual(["saving", "reconciling", "ready"]);
    expect(observed.sessionRoutes).toEqual(["home", "home", "workspace"]);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    expect(backing.programs).toHaveLength(1);
    observed.unsubscribe();
    await controller.dispose();
  });

  it("reconciles outcome_unknown as not committed and retries the original create", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const firstDelegate = createMemoryProgramRepositoryV2({ backing });
    const secondDelegate = createMemoryProgramRepositoryV2({ backing });
    const firstInputs: ProgramRepositoryCreateInputV2[] = [];
    const retryInputs: ProgramRepositoryCreateInputV2[] = [];
    const firstRepository = proxyRepositoryV1(firstDelegate, {
      create(input) {
        firstInputs.push(input);
        return Promise.reject(createProgramRepositoryFailureV2("outcome_unknown", "create"));
      },
    });
    const secondRepository = proxyRepositoryV1(secondDelegate, {
      async create(input) {
        retryInputs.push(input);
        return await secondDelegate.create(input);
      },
    });
    const repositories = [firstRepository, secondRepository];
    let repositoryIndex = 0;
    let workspaceIdCalls = 0;
    let nowCalls = 0;
    const controller = createControllerV1({
      createRepository: () => {
        const repository = repositories[repositoryIndex++];
        if (repository === undefined) throw new Error("unexpected repository replacement");
        return repository;
      },
      createWorkspaceId: () => {
        workspaceIdCalls += 1;
        return workspaceIdV1;
      },
      now: () => {
        nowCalls += 1;
        return 100;
      },
    });
    await controller.initialize();

    await expect(controller.submitIntent(intentV1)).resolves.toEqual({
      kind: "failed",
      code: "not_committed",
    });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "create",
      code: "not_committed",
      recovery: "retry",
    });
    expect(controller.getSnapshot().session.route).toBe("home");
    expect(backing.programs).toHaveLength(0);

    await expect(controller.retry()).resolves.toBe(true);

    expect(firstInputs).toHaveLength(1);
    expect(retryInputs).toHaveLength(1);
    expect(retryInputs[0]).toEqual(firstInputs[0]);
    expect(retryInputs[0]?.snapshot).toBe(firstInputs[0]?.snapshot);
    expect(workspaceIdCalls).toBe(1);
    expect(nowCalls).toBe(1);
    expect(controller.getSnapshot().session.workspace?.workspaceId).toBe(workspaceIdV1);
    expect(controller.getSnapshot().session.route).toBe("workspace");
    await controller.dispose();
  });

  it("binds a product run to the exact Program and repository base without mutating it", async () => {
    const repository = createMemoryProgramRepositoryV2();
    const controller = createControllerV1({ createRepository: () => repository });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const before = controller.getSnapshot();

    const prepared = controller.prepareAgentRun("  Make review explicit.  ");

    expect(prepared).toEqual({
      kind: "completed",
      value: {
        kind: "prepared",
        run: {
          agentRunId: "agent.run.controller.1",
          proposalId: before.session.proposal?.proposalId,
          programId: before.session.program?.programId,
          baseProgramRevision: 1,
          baseRepositoryRevision: 1,
          text: "Make review explicit.",
        },
      },
    });
    expect(controller.getSnapshot()).toBe(before);
    await controller.dispose();
  });

  it("commits failed, cancelled, and replaced runs without advancing the Program", async () => {
    const cases = [
      {
        outcome: "failed" as const,
        activityKind: "agent_run_failed",
        terminal: (
          run: ReturnType<typeof completedTerminalV1>["run"],
        ): CreatorAgentTerminalRunV1 => ({ run, outcome: "failed", diagnosticCode: "run_failed" }),
      },
      {
        outcome: "cancelled" as const,
        activityKind: "agent_run_cancelled",
        terminal: (
          run: ReturnType<typeof completedTerminalV1>["run"],
        ): CreatorAgentTerminalRunV1 => ({ run, outcome: "cancelled" }),
      },
      {
        outcome: "replaced" as const,
        activityKind: "agent_run_replaced",
        terminal: (
          run: ReturnType<typeof completedTerminalV1>["run"],
        ): CreatorAgentTerminalRunV1 => ({ run, outcome: "replaced" }),
      },
    ];
    for (const testCase of cases) {
      const backing = createMemoryProgramRepositoryBackingV2();
      const repository = createMemoryProgramRepositoryV2({ backing });
      const controller = createControllerV1({ createRepository: () => repository });
      await controller.initialize();
      await controller.submitIntent(intentV1);
      const completed = completedTerminalV1(controller);

      await expect(controller.recordAgentRunTerminal(testCase.terminal(completed.run))).resolves
        .toEqual({
          kind: "completed",
          value: { kind: "applied", outcome: testCase.outcome },
        });

      const current = controller.getSnapshot().session;
      expect(current.program?.revision).toBe(1);
      expect(current.messages.at(-1)).toMatchObject({ role: "user", text: completed.run.text });
      expect(current.activity.at(-1)?.kind).toBe(testCase.activityKind);
      expect(backing.programs.get(completed.run.programId)?.agentRunReceipts).toEqual([
        expect.objectContaining({
          agentRunId: completed.run.agentRunId,
          outcome: testCase.outcome,
        }),
      ]);
      await controller.dispose();
    }
  });

  it("reconciles an exact Agent terminal receipt after a lost commit response", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const firstDelegate = createMemoryProgramRepositoryV2({ backing });
    const secondDelegate = createMemoryProgramRepositoryV2({ backing });
    let terminalCalls = 0;
    const firstRepository = proxyRepositoryV1(firstDelegate, {
      async settleAgentRun(input) {
        terminalCalls += 1;
        await firstDelegate.settleAgentRun(input);
        throw createProgramRepositoryFailureV2("outcome_unknown", "settle_agent_run");
      },
    });
    const repositories = [firstRepository, secondDelegate];
    let repositoryIndex = 0;
    const controller = createControllerV1({
      createRepository: () => {
        const repository = repositories[repositoryIndex++];
        if (repository === undefined) throw new Error("unexpected repository replacement");
        return repository;
      },
    });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const terminal = completedTerminalV1(controller);
    const observed = durabilityPhasesV1(controller);

    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    expect(terminalCalls).toBe(1);
    expect(repositoryIndex).toBe(2);
    expect(observed.phases).toEqual(["saving", "reconciling", "ready"]);
    expect(controller.getSnapshot().session.program?.revision).toBe(2);
    expect(backing.programs.get(terminal.run.programId)?.agentRunReceipts).toHaveLength(1);
    observed.unsubscribe();
    const otherProgramId = `${terminal.run.programId}.other`;
    await expect(controller.recordAgentRunTerminal({
      ...terminal,
      run: { ...terminal.run, programId: otherProgramId },
      candidate: { ...terminal.candidate, programId: otherProgramId },
    })).resolves.toEqual({ kind: "failed", code: "conflict" });
    expect(terminalCalls).toBe(1);
    await controller.dispose();
  });

  it("surfaces a conflict without retaining a blind retry command", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const delegate = createMemoryProgramRepositoryV2({ backing });
    let terminalCalls = 0;
    const repository = proxyRepositoryV1(delegate, {
      async settleAgentRun(input) {
        terminalCalls += 1;
        return { kind: "conflict", current: await delegate.load(input.programId) };
      },
    });
    const controller = createControllerV1({ createRepository: () => repository });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const before = controller.getSnapshot().session;

    await expect(controller.recordAgentRunTerminal(completedTerminalV1(controller))).resolves
      .toEqual({ kind: "failed", code: "conflict" });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "agent_run",
      code: "conflict",
      recovery: null,
    });
    expect(controller.getSnapshot().session).toEqual(before);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    await expect(controller.retry()).resolves.toBe(false);
    expect(terminalCalls).toBe(1);
    await controller.dispose();
  });

  it("returns busy for a concurrent mutation while the first commit is unsettled", async () => {
    const backing = createMemoryProgramRepositoryBackingV2();
    const delegate = createMemoryProgramRepositoryV2({ backing });
    const receiptGate = createDeferredV1<void>();
    let createCalls = 0;
    let workspaceIdCalls = 0;
    const repository = proxyRepositoryV1(delegate, {
      async create(input) {
        createCalls += 1;
        const result = await delegate.create(input);
        await receiptGate.promise;
        return result;
      },
    });
    const controller = createControllerV1({
      createRepository: () => repository,
      createWorkspaceId: () => {
        workspaceIdCalls += 1;
        return workspaceIdV1;
      },
    });
    await controller.initialize();

    const pending = controller.submitIntent(intentV1);
    await expect(controller.submitIntent("A competing request")).resolves.toEqual({
      kind: "busy",
    });
    await expect(controller.openProgram("program.workspace.other")).resolves.toEqual({
      kind: "busy",
    });

    expect(createCalls).toBe(1);
    expect(workspaceIdCalls).toBe(1);
    expect(controller.getSnapshot().session.route).toBe("home");

    receiptGate.resolve(undefined);
    await expect(pending).resolves.toMatchObject({ kind: "completed" });
    expect(controller.getSnapshot().session.route).toBe("workspace");
    await controller.dispose();
  });
});
