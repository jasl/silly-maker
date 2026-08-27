// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type {
  BrowserProgramWorkspaceApplyRevisionInputV1,
  BrowserProgramWorkspaceCreateInputV1,
  BrowserProgramWorkspaceDecideInputV1,
  BrowserProgramWorkspaceSettleAgentRunInputV1,
} from "../product/browser-program-workspace-authority.ts";
import {
  createCreatorControllerV1,
  type CreatorControllerAuthorityV1,
  type CreatorControllerV1,
  type CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { CreatorAgentTerminalRunV1 } from "../product/contracts.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import {
  createMemoryProgramRepositoryBackingV3,
  createMemoryProgramRepositoryV3,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryCommitResultV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "../product/program-repository.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";

const intentV1 = "Create a focused writing workspace.";
const workspaceIdV1 = "workspace.controller.test";

interface DeferredV1<TValue> {
  readonly promise: Promise<TValue>;
  resolve(value: TValue): void;
}

interface AuthorityCallsV1 {
  readonly create: BrowserProgramWorkspaceCreateInputV1[];
  readonly applyRevision: BrowserProgramWorkspaceApplyRevisionInputV1[];
  readonly settleAgentRun: BrowserProgramWorkspaceSettleAgentRunInputV1[];
  readonly decide: BrowserProgramWorkspaceDecideInputV1[];
}

interface TestAuthorityHarnessV1 {
  readonly authority: CreatorControllerAuthorityV1 & { dispose(): Promise<void> };
  readonly calls: AuthorityCallsV1;
  readonly acceptedReceipts: ProgramWorkspaceSnapshotReceiptV1[];
  readonly disposeCalls: () => number;
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

async function requirePairV1(
  repository: ProgramRepositoryWithWorkspaceContinuationV1,
  programId: string,
): Promise<{
  readonly aggregate: ProgramRepositoryAggregateV3;
  readonly continuation: BrowserProgramContinuationManifestV1;
}> {
  const [aggregate, continuation] = await Promise.all([
    repository.load(programId),
    repository.loadWorkspaceContinuation(programId),
  ]);
  if (aggregate === null || continuation === null) throw new Error("expected durable Program pair");
  return { aggregate, continuation };
}

function predecessorContinuationV1(
  stored: BrowserProgramContinuationManifestV1,
  programRevision: number,
  repositoryRevision: number,
): BrowserProgramContinuationManifestV1 {
  return { ...stored, programRevision, repositoryRevision };
}

function reviewedHeadV1(programId: string, programRevision: number) {
  return {
    checkpointId: `checkpoint.${programId}.${String(programRevision)}`,
    generation: programRevision,
  } as const;
}

function createTestAuthorityV1(): TestAuthorityHarnessV1 {
  const backing = createMemoryProgramRepositoryBackingV3();
  const repository = createMemoryProgramRepositoryV3({ backing });
  const calls: AuthorityCallsV1 = {
    create: [],
    applyRevision: [],
    settleAgentRun: [],
    decide: [],
  };
  const acceptedReceipts: ProgramWorkspaceSnapshotReceiptV1[] = [];
  let disposeCalls = 0;

  const authority: TestAuthorityHarnessV1["authority"] = {
    initialize: () => repository.initialize(),
    list: () => repository.list(),
    load: (programId) => repository.load(programId),
    async create(input) {
      calls.create.push(input);
      const program = input.snapshot.program;
      const workspace = input.snapshot.workspace;
      if (program === null || workspace === null) throw new Error("expected created Program");
      return await repository.create({
        ...input,
        continuation: {
          revision: 1,
          programId: program.programId,
          workspaceId: workspace.workspaceId,
          volumeId: `${workspace.workspaceId}.volume.1`,
          workspaceFormat: 1,
          programRevision: program.revision,
          repositoryRevision: 1,
        },
        reviewedHead: reviewedHeadV1(program.programId, program.revision),
      });
    },
    async applyRevision(input) {
      calls.applyRevision.push(input);
      const pair = await requirePairV1(repository, input.programId);
      const nextProgram = input.snapshot.program;
      if (nextProgram === null) throw new Error("expected revised Program");
      return await repository.applyRevision({
        ...input,
        continuation: predecessorContinuationV1(
          pair.continuation,
          input.expectedBase.baseProgramRevision,
          input.expectedRepositoryRevision,
        ),
        reviewedHead: reviewedHeadV1(input.programId, nextProgram.revision),
      });
    },
    async settleAgentRun(input) {
      calls.settleAgentRun.push(input);
      const pair = await requirePairV1(repository, input.programId);
      const nextProgram = input.snapshot.program;
      if (nextProgram === null) throw new Error("expected settled Program");
      return await repository.settleAgentRun({
        ...input,
        continuation: predecessorContinuationV1(
          pair.continuation,
          input.terminal.run.baseProgramRevision,
          input.expectedRepositoryRevision,
        ),
        reviewedHead: input.terminal.outcome === "completed"
          ? reviewedHeadV1(input.programId, nextProgram.revision)
          : null,
      });
    },
    async decide(input) {
      calls.decide.push(input);
      const pair = await requirePairV1(repository, input.programId);
      const continuation = predecessorContinuationV1(
        pair.continuation,
        input.expectedProposal.programRevision,
        input.expectedRepositoryRevision,
      );
      if (input.status === "rejected") {
        return await repository.decide({ ...input, continuation });
      }
      const existing = pair.aggregate.decisions.find((decision) =>
        decision.proposalId === input.expectedProposal.proposalId &&
        decision.programRevision === input.expectedProposal.programRevision &&
        decision.status === "accepted"
      );
      const binding = pair.aggregate.reviewBinding;
      const snapshotReceipt = existing?.status === "accepted"
        ? existing.snapshot
        : binding === null
        ? null
        : {
          revision: 1 as const,
          snapshotId: `snapshot.${input.programId}.${
            String(input.expectedProposal.programRevision)
          }`,
          programId: binding.programId,
          workspaceId: binding.workspaceId,
          volumeId: binding.volumeId,
          workspaceFormat: binding.workspaceFormat,
          proposalId: binding.proposalId,
          programRevision: binding.programRevision,
          baseRepositoryRevision: binding.repositoryRevision,
          checkpointId: binding.checkpointId,
          generation: binding.generation,
          fileCount: 0,
          archiveBytes: 1,
        };
      if (snapshotReceipt === null) throw new Error("expected accepted review binding");
      if (existing === undefined) acceptedReceipts.push(snapshotReceipt);
      return await repository.decide({ ...input, continuation, snapshotReceipt });
    },
    async closeActiveWorkspace() {
      return null;
    },
    async dispose() {
      disposeCalls += 1;
      await repository.dispose();
    },
  };
  return {
    authority,
    calls,
    acceptedReceipts,
    disposeCalls: () => disposeCalls,
  };
}

function proxyAuthorityV1(
  delegate: CreatorControllerAuthorityV1,
  overrides: Partial<CreatorControllerAuthorityV1> = {},
): CreatorControllerAuthorityV1 {
  return {
    initialize: overrides.initialize ?? (() => delegate.initialize()),
    list: overrides.list ?? (() => delegate.list()),
    load: overrides.load ?? ((programId) => delegate.load(programId)),
    create: overrides.create ?? ((input) => delegate.create(input)),
    applyRevision: overrides.applyRevision ?? ((input) => delegate.applyRevision(input)),
    settleAgentRun: overrides.settleAgentRun ?? ((input) => delegate.settleAgentRun(input)),
    decide: overrides.decide ?? ((input) => delegate.decide(input)),
    closeActiveWorkspace: overrides.closeActiveWorkspace ?? (() => delegate.closeActiveWorkspace()),
  };
}

function createControllerV1(input: {
  readonly authority: CreatorControllerAuthorityV1;
  readonly createWorkspaceId?: () => string;
  readonly createAgentRunId?: () => string;
  readonly now?: () => number;
}): CreatorControllerV1 {
  return createCreatorControllerV1({
    creator: createDeterministicFakeCreatorV1(),
    authority: input.authority,
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

function durabilityPhasesV1(controller: CreatorControllerV1): {
  readonly phases: CreatorDurabilityStateV1["phase"][];
  readonly routes: string[];
  readonly unsubscribe: () => void;
} {
  const phases: CreatorDurabilityStateV1["phase"][] = [];
  const routes: string[] = [];
  const unsubscribe = controller.subscribe(() => {
    const snapshot = controller.getSnapshot();
    phases.push(snapshot.durability.phase);
    routes.push(snapshot.session.route);
  });
  return { phases, routes, unsubscribe };
}

describe("SillyOS durable Creator controller", () => {
  it("retains Home while Authority creates and sends only product-owned fields", async () => {
    const harness = createTestAuthorityV1();
    const receiptGate = createDeferredV1<void>();
    const createInputs: BrowserProgramWorkspaceCreateInputV1[] = [];
    const authority = proxyAuthorityV1(harness.authority, {
      async create(input) {
        createInputs.push(input);
        const result = await harness.authority.create(input);
        await receiptGate.promise;
        return result;
      },
    });
    const controller = createControllerV1({ authority });
    await controller.initialize();
    const before = controller.getSnapshot().session;
    const observed = durabilityPhasesV1(controller);

    const pending = controller.submitIntent(intentV1);

    expect(controller.getSnapshot().durability).toEqual({ phase: "saving", operation: "create" });
    expect(controller.getSnapshot().session).toBe(before);
    expect(controller.getSnapshot().recentPrograms).toEqual([]);
    expect(createInputs).toHaveLength(1);
    expect(Object.keys(createInputs[0] ?? {}).toSorted()).toEqual(["snapshot", "updatedAt"]);

    receiptGate.resolve(undefined);
    await expect(pending).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "created", workspaceId: workspaceIdV1 },
    });

    expect(observed.phases).toEqual(["saving", "ready"]);
    expect(observed.routes).toEqual(["home", "workspace"]);
    expect(controller.getSnapshot().session.program?.revision).toBe(1);
    expect(controller.getSnapshot().recentPrograms).toHaveLength(1);
    observed.unsubscribe();
    await controller.dispose();
  });

  it("keeps accepted snapshot receipts inside Authority and does not own its lifecycle", async () => {
    const harness = createTestAuthorityV1();
    const controller = createControllerV1({ authority: harness.authority });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const proposal = controller.getSnapshot().session.proposal;
    if (proposal === null) throw new Error("expected current proposal");

    await expect(controller.acceptProposal(proposal)).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "applied", status: "accepted" },
    });

    expect(harness.calls.decide).toHaveLength(1);
    expect(Object.keys(harness.calls.decide[0] ?? {}).toSorted()).toEqual([
      "expectedProposal",
      "expectedRepositoryRevision",
      "programId",
      "snapshot",
      "status",
      "updatedAt",
    ]);
    expect(harness.acceptedReceipts).toHaveLength(1);
    const programId = controller.getSnapshot().session.program?.programId;
    if (programId === undefined) throw new Error("expected Program id");
    const durable = await harness.authority.load(programId);
    expect(durable?.decisions).toEqual([
      expect.objectContaining({
        proposalId: proposal.proposalId,
        programRevision: proposal.programRevision,
        status: "accepted",
        snapshot: harness.acceptedReceipts[0],
      }),
    ]);

    await controller.dispose();
    expect(harness.disposeCalls()).toBe(0);
    expect((await harness.authority.load(programId))?.snapshot.proposal?.status).toBe("accepted");

    const secondController = createControllerV1({ authority: harness.authority });
    await secondController.initialize();
    await expect(secondController.openProgram(programId)).resolves.toEqual({
      kind: "completed",
      value: true,
    });
    expect(secondController.getSnapshot().session.proposal?.status).toBe("accepted");
    await secondController.dispose();
    expect(harness.disposeCalls()).toBe(0);
    await harness.authority.dispose();
  });

  it("keeps rejected decisions repository-only and never requests a snapshot receipt", async () => {
    const harness = createTestAuthorityV1();
    const controller = createControllerV1({ authority: harness.authority });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const proposal = controller.getSnapshot().session.proposal;
    const programId = controller.getSnapshot().session.program?.programId;
    if (proposal === null || programId === undefined) throw new Error("expected current proposal");

    await expect(controller.rejectProposal(proposal)).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "applied", status: "rejected" },
    });

    expect(harness.calls.decide[0]?.status).toBe("rejected");
    expect(Object.hasOwn(harness.calls.decide[0] ?? {}, "snapshotReceipt")).toBe(false);
    expect(harness.acceptedReceipts).toEqual([]);
    const decision = (await harness.authority.load(programId))?.decisions[0];
    expect(decision).toMatchObject({ status: "rejected" });
    expect(Object.hasOwn(decision ?? {}, "snapshot")).toBe(false);
    await controller.dispose();
  });

  it("delegates proposal-producing revisions and Agent terminals without Host heads", async () => {
    const harness = createTestAuthorityV1();
    let instant = 100;
    const controller = createControllerV1({
      authority: harness.authority,
      now: () => instant++,
    });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const firstProposal = controller.getSnapshot().session.proposal;
    if (firstProposal === null) throw new Error("expected first proposal");
    await controller.rejectProposal(firstProposal);

    await expect(controller.sendFollowUp("Use a three-act structure.")).resolves.toMatchObject({
      kind: "completed",
      value: { kind: "sent", programRevision: 2 },
    });
    expect(Object.keys(harness.calls.applyRevision[0] ?? {}).toSorted()).toEqual([
      "expectedBase",
      "expectedRepositoryRevision",
      "programId",
      "snapshot",
      "updatedAt",
    ]);

    const terminal = completedTerminalV1(controller);
    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    expect(Object.keys(harness.calls.settleAgentRun[0] ?? {}).toSorted()).toEqual([
      "expectedRepositoryRevision",
      "programId",
      "snapshot",
      "terminal",
      "updatedAt",
    ]);
    expect(controller.getSnapshot().session.program?.revision).toBe(3);
    expect(controller.getSnapshot().session.messages.at(-1)?.text).toBe(
      "I prepared Program proposal v2 for review.",
    );
    await controller.dispose();
  });

  it("retains the old snapshot and retries the exact same Authority terminal input", async () => {
    const harness = createTestAuthorityV1();
    const terminalInputs: BrowserProgramWorkspaceSettleAgentRunInputV1[] = [];
    let failFirstTerminal = true;
    const authority = proxyAuthorityV1(harness.authority, {
      async settleAgentRun(input) {
        terminalInputs.push(input);
        if (failFirstTerminal) {
          failFirstTerminal = false;
          throw createProgramRepositoryFailureV3("transaction_aborted", "settle_agent_run");
        }
        return await harness.authority.settleAgentRun(input);
      },
    });
    let instant = 100;
    const controller = createControllerV1({ authority, now: () => instant++ });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const before = controller.getSnapshot().session;
    const terminal = {
      ...completedTerminalV1(controller),
      finalAssistantReply: "  I prepared Program proposal v2 for review.  ",
    } satisfies CreatorAgentTerminalRunV1;

    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({
      kind: "failed",
      code: "transaction_aborted",
    });
    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "agent_run",
      code: "transaction_aborted",
      recovery: "retry",
    });
    expect(controller.getSnapshot().session).toBe(before);

    await expect(controller.retry()).resolves.toBe(true);

    expect(terminalInputs).toHaveLength(2);
    expect(terminalInputs[1]).toEqual(terminalInputs[0]);
    expect(terminalInputs[1]?.snapshot).toBe(terminalInputs[0]?.snapshot);
    expect(terminalInputs[1]?.updatedAt).toBe(101);
    expect(controller.getSnapshot().session.program?.revision).toBe(2);
    expect(controller.getSnapshot().session.messages.at(-1)?.text).toBe(
      "I prepared Program proposal v2 for review.",
    );
    await controller.dispose();
  });

  it("surfaces unresolved outcome_unknown for retry without detached reconciliation", async () => {
    const harness = createTestAuthorityV1();
    const createInputs: BrowserProgramWorkspaceCreateInputV1[] = [];
    let createAttempts = 0;
    let loadCalls = 0;
    const authority = proxyAuthorityV1(harness.authority, {
      async load(programId) {
        loadCalls += 1;
        return await harness.authority.load(programId);
      },
      async create(input) {
        createInputs.push(input);
        createAttempts += 1;
        if (createAttempts === 1) {
          throw createProgramRepositoryFailureV3("outcome_unknown", "create");
        }
        return await harness.authority.create(input);
      },
    });
    const controller = createControllerV1({ authority });
    await controller.initialize();
    const observed = durabilityPhasesV1(controller);

    await expect(controller.submitIntent(intentV1)).resolves.toEqual({
      kind: "failed",
      code: "outcome_unknown",
    });

    expect(controller.getSnapshot().durability).toEqual({
      phase: "failed",
      operation: "create",
      code: "outcome_unknown",
      recovery: "retry",
    });
    expect(observed.phases).toEqual(["saving", "failed"]);
    expect(loadCalls).toBe(0);
    expect(controller.getSnapshot().session.route).toBe("home");

    await expect(controller.retry()).resolves.toBe(true);
    expect(createInputs).toHaveLength(2);
    expect(createInputs[1]).toEqual(createInputs[0]);
    expect(createInputs[1]?.snapshot).toBe(createInputs[0]?.snapshot);
    expect(observed.phases).toEqual(["saving", "failed", "saving", "ready"]);
    observed.unsubscribe();
    await controller.dispose();
  });

  it("treats Authority-internal outcome recovery as an ordinary commit result", async () => {
    const harness = createTestAuthorityV1();
    const authority = proxyAuthorityV1(harness.authority, {
      async create(input): Promise<ProgramRepositoryCommitResultV3> {
        const committed = await harness.authority.create(input);
        if (committed.kind === "conflict") return committed;
        return { kind: "unchanged", aggregate: committed.aggregate };
      },
    });
    const controller = createControllerV1({ authority });
    await controller.initialize();
    const observed = durabilityPhasesV1(controller);

    await expect(controller.submitIntent(intentV1)).resolves.toMatchObject({ kind: "completed" });

    expect(observed.phases).toEqual(["saving", "ready"]);
    expect(controller.getSnapshot().session.route).toBe("workspace");
    observed.unsubscribe();
    await controller.dispose();
  });

  it("surfaces an Authority conflict without retaining a blind retry", async () => {
    const harness = createTestAuthorityV1();
    let terminalCalls = 0;
    const authority = proxyAuthorityV1(harness.authority, {
      async settleAgentRun(input) {
        terminalCalls += 1;
        return { kind: "conflict", current: await harness.authority.load(input.programId) };
      },
    });
    const controller = createControllerV1({ authority });
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
    await expect(controller.retry()).resolves.toBe(false);
    expect(terminalCalls).toBe(1);
    await controller.dispose();
  });

  it("awaits Authority workspace close before Home and retains the workspace on close failure", async () => {
    const harness = createTestAuthorityV1();
    const closeGate = createDeferredV1<null>();
    let closeCalls = 0;
    const authority = proxyAuthorityV1(harness.authority, {
      async closeActiveWorkspace() {
        closeCalls += 1;
        return await closeGate.promise;
      },
    });
    const controller = createControllerV1({ authority });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const before = controller.getSnapshot().session;

    const pendingHome = controller.openHome();

    expect(closeCalls).toBe(1);
    expect(controller.getSnapshot().session).toBe(before);
    await expect(controller.sendFollowUp("A concurrent edit")).resolves.toEqual({ kind: "busy" });
    closeGate.resolve(null);
    await expect(pendingHome).resolves.toBe(true);
    expect(controller.getSnapshot().session.route).toBe("home");

    const reopened = await controller.openProgram(before.program?.programId ?? "missing");
    expect(reopened).toEqual({ kind: "completed", value: true });
    const reopenedSnapshot = controller.getSnapshot().session;
    const failingAuthority = proxyAuthorityV1(harness.authority, {
      closeActiveWorkspace: () => Promise.reject(new Error("close failed")),
    });
    const failingController = createControllerV1({ authority: failingAuthority });
    await failingController.initialize();
    await failingController.openProgram(reopenedSnapshot.program?.programId ?? "missing");

    await expect(failingController.openHome()).resolves.toBe(false);
    expect(failingController.getSnapshot().session).toEqual(reopenedSnapshot);
    expect(failingController.getSnapshot().durability).toEqual({ phase: "ready" });
    await failingController.dispose();
    await controller.dispose();
  });

  it("binds runs to the exact Authority-backed repository base and gates concurrent mutations", async () => {
    const harness = createTestAuthorityV1();
    const receiptGate = createDeferredV1<void>();
    let createCalls = 0;
    let workspaceIdCalls = 0;
    const authority = proxyAuthorityV1(harness.authority, {
      async create(input) {
        createCalls += 1;
        const result = await harness.authority.create(input);
        await receiptGate.promise;
        return result;
      },
    });
    const controller = createControllerV1({
      authority,
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

    receiptGate.resolve(undefined);
    await pending;
    const before = controller.getSnapshot();
    expect(controller.prepareAgentRun("  Make review explicit.  ")).toEqual({
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

  it("stops every Controller admission path after disposal", async () => {
    const harness = createTestAuthorityV1();
    let initializeCalls = 0;
    let agentRunIdCalls = 0;
    const authority = proxyAuthorityV1(harness.authority, {
      async initialize() {
        initializeCalls += 1;
        await harness.authority.initialize();
      },
    });
    const controller = createControllerV1({
      authority,
      createAgentRunId: () => {
        agentRunIdCalls += 1;
        return `agent.run.controller.${String(agentRunIdCalls)}`;
      },
    });
    await controller.initialize();
    await controller.submitIntent(intentV1);
    const terminal = completedTerminalV1(controller);
    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({
      kind: "completed",
      value: { kind: "applied", outcome: "completed" },
    });
    const programId = controller.getSnapshot().session.program?.programId;
    const proposal = controller.getSnapshot().session.proposal;
    if (programId === undefined || proposal === null) throw new Error("expected current Program");

    await controller.dispose();
    const disposedSnapshot = controller.getSnapshot();

    expect(controller.prepareAgentRun("This must not mint another run.")).toEqual({ kind: "busy" });
    expect(agentRunIdCalls).toBe(1);
    await expect(controller.recordAgentRunTerminal(terminal)).resolves.toEqual({ kind: "busy" });
    await expect(controller.sendFollowUp("")).resolves.toEqual({ kind: "busy" });
    await expect(controller.acceptProposal({ ...proposal, proposalId: "proposal.stale" })).resolves
      .toEqual({ kind: "busy" });
    await expect(controller.rejectProposal({ ...proposal, proposalId: "proposal.stale" })).resolves
      .toEqual({ kind: "busy" });
    await expect(controller.submitIntent("A new Program")).resolves.toEqual({ kind: "busy" });
    await expect(controller.openProgram(programId)).resolves.toEqual({ kind: "busy" });
    await expect(controller.openHome()).resolves.toBe(false);
    await expect(controller.retry()).resolves.toBe(false);
    await controller.initialize();

    expect(initializeCalls).toBe(1);
    expect(controller.getSnapshot()).toBe(disposedSnapshot);
    expect(controller.getSnapshot().durability).toEqual({ phase: "disposed" });
  });
});
