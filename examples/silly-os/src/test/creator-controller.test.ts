// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createCreatorControllerV1,
  type CreatorControllerV1,
  type CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import {
  createMemoryProgramRepositoryBackingV1,
  createMemoryProgramRepositoryV1,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV1,
  type ProgramRepositoryApplyRevisionInputV1,
  type ProgramRepositoryCreateInputV1,
  type ProgramRepositoryV1,
} from "../product/program-repository.ts";
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
  delegate: ProgramRepositoryV1,
  overrides: Partial<ProgramRepositoryV1> = {},
): ProgramRepositoryV1 {
  return {
    initialize: overrides.initialize ?? (() => delegate.initialize()),
    list: overrides.list ?? (() => delegate.list()),
    load: overrides.load ?? ((programId) => delegate.load(programId)),
    create: overrides.create ?? ((input) => delegate.create(input)),
    applyRevision: overrides.applyRevision ?? ((input) => delegate.applyRevision(input)),
    decide: overrides.decide ?? ((input) => delegate.decide(input)),
    dispose: overrides.dispose ?? (() => delegate.dispose()),
  };
}

function createControllerV1(input: {
  readonly createRepository: () => ProgramRepositoryV1;
  readonly createWorkspaceId?: () => string;
  readonly now?: () => number;
}): CreatorControllerV1 {
  return createCreatorControllerV1({
    creator: createDeterministicFakeCreatorV1(),
    createRepository: input.createRepository,
    createWorkspaceId: input.createWorkspaceId ?? (() => workspaceIdV1),
    now: input.now ?? (() => 100),
  });
}

type ProgramRevisionCandidateInputV1 = Parameters<
  CreatorControllerV1["applyProgramRevisionCandidate"]
>[0];

function currentCandidateV1(controller: CreatorControllerV1): ProgramRevisionCandidateInputV1 {
  const session = controller.getSnapshot().session;
  const proposal = session.proposal;
  const program = session.program;
  if (proposal === null || program === null) throw new Error("expected a current Program");
  return {
    candidate: {
      revision: 1,
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
      text: "Make the review checkpoint explicit.",
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
    const backing = createMemoryProgramRepositoryBackingV1();
    const delegate = createMemoryProgramRepositoryV1({ backing });
    const receiptGate = createDeferredV1<void>();
    const createInputs: ProgramRepositoryCreateInputV1[] = [];
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
    const backing = createMemoryProgramRepositoryBackingV1();
    const repository = createMemoryProgramRepositoryV1({ backing });
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

  it("retains the old snapshot after an explicit failure and retries the exact same Agent candidate", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    const delegate = createMemoryProgramRepositoryV1({ backing });
    const applyInputs: ProgramRepositoryApplyRevisionInputV1[] = [];
    let failFirstApply = true;
    const repository = proxyRepositoryV1(delegate, {
      async applyRevision(input) {
        applyInputs.push(input);
        if (failFirstApply) {
          failFirstApply = false;
          throw createProgramRepositoryFailureV1("transaction_aborted", "apply_revision");
        }
        return await delegate.applyRevision(input);
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

    await expect(controller.applyProgramRevisionCandidate(currentCandidateV1(controller))).resolves
      .toEqual({ kind: "failed", code: "transaction_aborted" });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "revision",
      code: "transaction_aborted",
      recovery: "retry",
    });
    expect(controller.getSnapshot().session).toBe(before);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    expect(observedSessions.every((snapshot) => snapshot === before)).toBe(true);
    expect(applyInputs).toHaveLength(1);

    await expect(controller.retry()).resolves.toBe(true);

    expect(applyInputs).toHaveLength(2);
    expect(applyInputs[1]).toEqual(applyInputs[0]);
    expect(applyInputs[1]?.snapshot).toBe(applyInputs[0]?.snapshot);
    expect(applyInputs[1]?.updatedAt).toBe(101);
    expect(controller.getSnapshot().durability).toEqual({ phase: "ready" });
    expect(controller.getSnapshot().session.program?.revision).toBe(2);
    expect(controller.getSnapshot().session.messages.at(-1)?.text).toBe(
      "I prepared Program proposal v2 for review.",
    );
    unsubscribe();
    await controller.dispose();
  });

  it("reconciles outcome_unknown as committed without exposing the successor early", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    const firstDelegate = createMemoryProgramRepositoryV1({ backing });
    const secondDelegate = createMemoryProgramRepositoryV1({ backing });
    const firstRepository = proxyRepositoryV1(firstDelegate, {
      async create(input) {
        await firstDelegate.create(input);
        throw createProgramRepositoryFailureV1("outcome_unknown", "create");
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
    const backing = createMemoryProgramRepositoryBackingV1();
    const firstDelegate = createMemoryProgramRepositoryV1({ backing });
    const secondDelegate = createMemoryProgramRepositoryV1({ backing });
    const firstInputs: ProgramRepositoryCreateInputV1[] = [];
    const retryInputs: ProgramRepositoryCreateInputV1[] = [];
    const firstRepository = proxyRepositoryV1(firstDelegate, {
      create(input) {
        firstInputs.push(input);
        return Promise.reject(createProgramRepositoryFailureV1("outcome_unknown", "create"));
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

  it("surfaces a conflict without retaining a blind retry command", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    const delegate = createMemoryProgramRepositoryV1({ backing });
    let applyCalls = 0;
    const repository = proxyRepositoryV1(delegate, {
      async applyRevision(input) {
        applyCalls += 1;
        return { kind: "conflict", current: await delegate.load(input.programId) };
      },
    });
    const controller = createControllerV1({ createRepository: () => repository });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const before = controller.getSnapshot().session;

    await expect(controller.applyProgramRevisionCandidate(currentCandidateV1(controller))).resolves
      .toEqual({ kind: "failed", code: "conflict" });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "revision",
      code: "conflict",
      recovery: null,
    });
    expect(controller.getSnapshot().session).toEqual(before);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    await expect(controller.retry()).resolves.toBe(false);
    expect(applyCalls).toBe(1);
    await controller.dispose();
  });

  it("returns busy for a concurrent mutation while the first commit is unsettled", async () => {
    const backing = createMemoryProgramRepositoryBackingV1();
    const delegate = createMemoryProgramRepositoryV1({ backing });
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
