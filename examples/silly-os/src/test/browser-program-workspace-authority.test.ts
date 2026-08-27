// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserProgramWorkspaceAuthorityV1,
  type BrowserProgramWorkspaceAuthorityV1,
} from "../product/browser-program-workspace-authority.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import type {
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalRunV1,
  CreatorSessionSnapshotV1,
  CreatorSessionV1,
  ProgramProposalReferenceV1,
} from "../product/contracts.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import {
  createMemoryProgramRepositoryBackingV3,
  createMemoryProgramRepositoryV3,
  type MemoryProgramRepositoryBackingV3,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV3,
  buildProgramRepositoryCreateV3,
  type ProgramRepositoryCommitResultV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "../product/program-repository.ts";
import type {
  BrowserWorkspaceHostFatalV1,
  BrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "../workspace/contracts.ts";

interface DeferredV1<TValue> {
  readonly promise: Promise<TValue>;
  resolve(value: TValue): void;
}

function deferredV1<TValue>(): DeferredV1<TValue> {
  let resolvePromise: ((value: TValue) => void) | null = null;
  const promise = new Promise<TValue>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value) {
      if (resolvePromise === null) throw new Error("missing deferred resolver");
      resolvePromise(value);
    },
  };
}

function codedHostErrorV1(code: string): Error {
  const error = new Error(`fake.workspace_host.${code}`);
  Object.defineProperty(error, "code", { value: code, enumerable: true });
  return error;
}

interface FakeVolumeV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  checkpointId: string;
  generation: number;
  candidate: ProgramWorkspaceSnapshotReceiptV1 | null;
  readonly retained: Map<string, ProgramWorkspaceSnapshotReceiptV1>;
}

interface FakeHostBackingV1 {
  readonly volumes: Map<string, FakeVolumeV1>;
  nextVolume: number;
  nextSession: number;
}

function fakeHostBackingV1(): FakeHostBackingV1 {
  return { volumes: new Map(), nextVolume: 1, nextSession: 1 };
}

interface FakeHostHooksV1 {
  beforeCapture?: () => void | Promise<void>;
  beforeExportReady?: () => void | Promise<void>;
  beforeAdopt?: () => void | Promise<void>;
}

interface FakeHostControlV1 {
  readonly host: BrowserWorkspaceHostPagePortV1;
  readonly events: string[];
  readonly createdVolumes: string[];
  readonly discardedVolumes: string[];
  readonly prepared: ProgramWorkspaceSnapshotReceiptV1[];
  readonly adopted: ProgramWorkspaceSnapshotReceiptV1[];
  readonly discardedSnapshots: ProgramWorkspaceSnapshotReceiptV1[];
  readonly exportInputs: Array<{
    readonly programRevision: number;
    readonly repositoryRevision: number;
  }>;
  readonly activeSessionId: string | null;
  advanceHead(workspaceSessionId: string): BrowserWorkspaceHostSnapshotWireV1;
  currentVolume(volumeId: string): FakeVolumeV1;
  fail(fatal: BrowserWorkspaceHostFatalV1): void;
}

function fakeHostV1(
  backing: FakeHostBackingV1,
  hooks: FakeHostHooksV1 = {},
  sharedEvents: string[] = [],
): FakeHostControlV1 {
  const createdVolumes: string[] = [];
  const discardedVolumes: string[] = [];
  const prepared: ProgramWorkspaceSnapshotReceiptV1[] = [];
  const adopted: ProgramWorkspaceSnapshotReceiptV1[] = [];
  const discardedSnapshots: ProgramWorkspaceSnapshotReceiptV1[] = [];
  const exportInputs: Array<{
    readonly programRevision: number;
    readonly repositoryRevision: number;
  }> = [];
  const sessions = new Map<string, BrowserWorkspaceHostSnapshotWireV1>();
  const channels = new Map<string, MessageChannel>();
  const fatalListeners = new Set<(fatal: BrowserWorkspaceHostFatalV1) => void>();

  const volumeForSessionV1 = (workspaceSessionId: string): FakeVolumeV1 => {
    const snapshot = sessions.get(workspaceSessionId);
    if (snapshot === undefined) throw codedHostErrorV1("workspace_mismatch");
    const volume = backing.volumes.get(snapshot.volumeId);
    if (volume === undefined) throw codedHostErrorV1("volume_missing");
    return volume;
  };

  const openSnapshotV1 = (
    volume: FakeVolumeV1,
    workspaceSessionId: string,
  ): BrowserWorkspaceHostSnapshotWireV1 => ({
    revision: 1,
    phase: "open",
    volumeId: volume.anchor.volumeId,
    checkpointId: volume.checkpointId,
    descriptor: {
      revision: 1,
      programId: volume.anchor.programId,
      workspaceId: volume.anchor.workspaceId,
      workspaceSessionId,
      generation: volume.generation,
    },
    anchor: volume.anchor,
  });

  const host: BrowserWorkspaceHostPagePortV1 = {
    async withBootstrapLease({ operation }) {
      sharedEvents.push("host:lease");
      return await operation();
    },
    async createCandidate(input) {
      sharedEvents.push("host:create_candidate");
      const volumeId = `volume.authority.${String(backing.nextVolume++)}`;
      const anchor: BrowserWorkspaceVolumeAnchorWireV1 = {
        revision: 1,
        ...input,
        volumeId,
        workspaceFormat: 1,
      };
      const volume: FakeVolumeV1 = {
        anchor,
        checkpointId: `checkpoint.${volumeId}.1`,
        generation: 1,
        candidate: null,
        retained: new Map(),
      };
      backing.volumes.set(volumeId, volume);
      createdVolumes.push(volumeId);
      return {
        revision: 1,
        anchor,
        checkpointId: volume.checkpointId,
        generation: volume.generation,
      };
    },
    async discardCandidate(volumeId) {
      sharedEvents.push("host:discard_candidate");
      backing.volumes.delete(volumeId);
      discardedVolumes.push(volumeId);
    },
    async openWorkspace(anchor) {
      sharedEvents.push("host:open");
      const volume = backing.volumes.get(anchor.volumeId);
      if (volume === undefined || JSON.stringify(volume.anchor) !== JSON.stringify(anchor)) {
        throw codedHostErrorV1("volume_missing");
      }
      const workspaceSessionId = `workspace-session.${String(backing.nextSession++)}`;
      const snapshot = openSnapshotV1(volume, workspaceSessionId);
      sessions.set(workspaceSessionId, snapshot);
      return snapshot;
    },
    async queryWorkspace(workspaceSessionId) {
      sharedEvents.push("host:query");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw codedHostErrorV1("workspace_mismatch");
      return snapshot;
    },
    async attachEnvironment({ workspaceSessionId }) {
      sharedEvents.push("host:attach");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw codedHostErrorV1("workspace_mismatch");
      const predecessor = channels.get(workspaceSessionId);
      predecessor?.port1.close();
      predecessor?.port2.close();
      const channel = new MessageChannel();
      channels.set(workspaceSessionId, channel);
      return { snapshot, environmentPort: channel.port2 };
    },
    async closeWorkspace(workspaceSessionId) {
      sharedEvents.push("host:close");
      const current = sessions.get(workspaceSessionId);
      if (current === undefined) throw codedHostErrorV1("workspace_mismatch");
      const closed = { ...current, phase: "closed" as const };
      sessions.delete(workspaceSessionId);
      const channel = channels.get(workspaceSessionId);
      channel?.port1.close();
      channel?.port2.close();
      channels.delete(workspaceSessionId);
      return closed;
    },
    async exportWorkspace(input) {
      sharedEvents.push("host:export");
      const snapshot = sessions.get(input.workspaceSessionId);
      if (snapshot === undefined) throw codedHostErrorV1("workspace_mismatch");
      exportInputs.push({
        programRevision: input.programRevision,
        repositoryRevision: input.repositoryRevision,
      });
      const progress = {
        filesCompleted: 1,
        filesTotal: 1,
        bytesWritten: 64,
        bytesTotal: 64,
      };
      input.onProgress?.(progress);
      await hooks.beforeExportReady?.();
      const decision = await input.onReady({
        ...progress,
        downloadUrl: "blob:authority-test",
        checkpointId: snapshot.checkpointId,
        generation: snapshot.descriptor.generation,
      }, () => true);
      return decision === "release"
        ? {
          kind: "released",
          checkpointId: snapshot.checkpointId,
          generation: snapshot.descriptor.generation,
          ...progress,
        }
        : { kind: "cancelled", ...progress };
    },
    async prepareSnapshot(input) {
      sharedEvents.push("host:prepare");
      const volume = volumeForSessionV1(input.workspaceSessionId);
      if (
        volume.checkpointId !== input.expectedCheckpointId ||
        volume.generation !== input.expectedGeneration
      ) throw codedHostErrorV1("snapshot_stale");
      if (volume.candidate !== null || volume.retained.has(input.snapshotId)) {
        throw codedHostErrorV1("snapshot_mismatch");
      }
      const receipt: ProgramWorkspaceSnapshotReceiptV1 = {
        revision: 1,
        snapshotId: input.snapshotId,
        programId: volume.anchor.programId,
        workspaceId: volume.anchor.workspaceId,
        volumeId: volume.anchor.volumeId,
        workspaceFormat: 1,
        proposalId: input.proposalId,
        programRevision: input.programRevision,
        baseRepositoryRevision: input.baseRepositoryRevision,
        checkpointId: input.expectedCheckpointId,
        generation: input.expectedGeneration,
        fileCount: 3,
        archiveBytes: 512,
      };
      volume.candidate = receipt;
      prepared.push(receipt);
      return receipt;
    },
    async querySnapshotCandidate(workspaceSessionId) {
      sharedEvents.push("host:query_candidate");
      return volumeForSessionV1(workspaceSessionId).candidate;
    },
    async queryRetainedSnapshot({ workspaceSessionId, expected }) {
      sharedEvents.push("host:query_retained");
      const retained = volumeForSessionV1(workspaceSessionId).retained.get(expected.snapshotId) ??
        null;
      if (retained !== null && !programWorkspaceSnapshotReceiptsEqualV1(retained, expected)) {
        throw codedHostErrorV1("snapshot_mismatch");
      }
      return retained;
    },
    async captureReviewHead(workspaceSessionId) {
      sharedEvents.push("host:capture:start");
      await hooks.beforeCapture?.();
      sharedEvents.push("host:capture:end");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw codedHostErrorV1("workspace_mismatch");
      return snapshot;
    },
    async resumeSnapshotPublication({ workspaceSessionId, expected }) {
      sharedEvents.push("host:resume");
      const volume = volumeForSessionV1(workspaceSessionId);
      const candidate = volume.candidate;
      if (candidate === null || !programWorkspaceSnapshotReceiptsEqualV1(candidate, expected)) {
        throw codedHostErrorV1("snapshot_mismatch");
      }
      if (
        volume.checkpointId !== expected.checkpointId || volume.generation !== expected.generation
      ) throw codedHostErrorV1("snapshot_stale");
      return candidate;
    },
    async adoptSnapshot({ workspaceSessionId, expected }) {
      sharedEvents.push("host:adopt");
      await hooks.beforeAdopt?.();
      const volume = volumeForSessionV1(workspaceSessionId);
      const retained = volume.retained.get(expected.snapshotId) ?? null;
      if (retained !== null) {
        if (!programWorkspaceSnapshotReceiptsEqualV1(retained, expected)) {
          throw codedHostErrorV1("snapshot_mismatch");
        }
        return "already_retained";
      }
      if (
        volume.candidate === null ||
        !programWorkspaceSnapshotReceiptsEqualV1(volume.candidate, expected)
      ) throw codedHostErrorV1("snapshot_mismatch");
      volume.retained.set(expected.snapshotId, expected);
      volume.candidate = null;
      adopted.push(expected);
      return "adopted";
    },
    async discardSnapshot({ workspaceSessionId, expected }) {
      sharedEvents.push("host:discard_snapshot");
      const volume = volumeForSessionV1(workspaceSessionId);
      if (volume.retained.has(expected.snapshotId)) return "retained";
      if (volume.candidate === null) return "absent";
      if (!programWorkspaceSnapshotReceiptsEqualV1(volume.candidate, expected)) {
        throw codedHostErrorV1("snapshot_mismatch");
      }
      discardedSnapshots.push(expected);
      volume.candidate = null;
      return "discarded";
    },
    subscribeFatal(listener) {
      fatalListeners.add(listener);
      return () => fatalListeners.delete(listener);
    },
    dispose() {
      sharedEvents.push("host:dispose");
      for (const channel of channels.values()) {
        channel.port1.close();
        channel.port2.close();
      }
      channels.clear();
      sessions.clear();
      fatalListeners.clear();
    },
  };

  return {
    host,
    events: sharedEvents,
    createdVolumes,
    discardedVolumes,
    prepared,
    adopted,
    discardedSnapshots,
    exportInputs,
    get activeSessionId() {
      return [...sessions.keys()][0] ?? null;
    },
    advanceHead(workspaceSessionId) {
      const current = sessions.get(workspaceSessionId);
      if (current === undefined) throw codedHostErrorV1("workspace_mismatch");
      const volume = volumeForSessionV1(workspaceSessionId);
      volume.generation += 1;
      volume.checkpointId = `checkpoint.${volume.anchor.volumeId}.${String(volume.generation)}`;
      const next = openSnapshotV1(volume, workspaceSessionId);
      sessions.set(workspaceSessionId, next);
      return next;
    },
    currentVolume(volumeId) {
      const volume = backing.volumes.get(volumeId);
      if (volume === undefined) throw codedHostErrorV1("volume_missing");
      return volume;
    },
    fail(fatal) {
      for (const listener of [...fatalListeners]) listener(fatal);
    },
  };
}

function proxyRepositoryV1(
  delegate: ProgramRepositoryWithWorkspaceContinuationV1,
  overrides: Partial<ProgramRepositoryWithWorkspaceContinuationV1> = {},
): ProgramRepositoryWithWorkspaceContinuationV1 {
  return {
    initialize: overrides.initialize ?? (() => delegate.initialize()),
    list: overrides.list ?? (() => delegate.list()),
    load: overrides.load ?? ((programId) => delegate.load(programId)),
    loadWorkspaceContinuation: overrides.loadWorkspaceContinuation ??
      ((programId) => delegate.loadWorkspaceContinuation(programId)),
    create: overrides.create ?? ((input) => delegate.create(input)),
    applyRevision: overrides.applyRevision ?? ((input) => delegate.applyRevision(input)),
    settleAgentRun: overrides.settleAgentRun ?? ((input) => delegate.settleAgentRun(input)),
    decide: overrides.decide ?? ((input) => delegate.decide(input)),
    dispose: overrides.dispose ?? (() => delegate.dispose()),
  };
}

interface ProgramFixtureV1 {
  readonly session: CreatorSessionV1;
  readonly programId: string;
  readonly workspaceId: string;
}

function programFixtureV1(workspaceId: string): ProgramFixtureV1 {
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  if (session.submitIntent("Build a durable Browser Program.").kind !== "created") {
    throw new Error("expected Program creation");
  }
  const snapshot = session.getSnapshot();
  if (snapshot.program === null || snapshot.workspace === null) {
    throw new Error("expected Program identity");
  }
  return {
    session,
    programId: snapshot.program.programId,
    workspaceId: snapshot.workspace.workspaceId,
  };
}

function sessionFromSnapshotV1(snapshot: CreatorSessionSnapshotV1): CreatorSessionV1 {
  return createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    initialSnapshot: snapshot,
  });
}

function expectedProposalV1(session: CreatorSessionV1): ProgramProposalReferenceV1 {
  const proposal = session.getSnapshot().proposal;
  if (proposal === null) throw new Error("expected current proposal");
  return { proposalId: proposal.proposalId, programRevision: proposal.programRevision };
}

function currentProgramRevisionV1(session: CreatorSessionV1): number {
  const program = session.getSnapshot().program;
  if (program === null) throw new Error("expected current Program");
  return program.revision;
}

function currentRunV1(
  session: CreatorSessionV1,
  agentRunId: string,
  baseRepositoryRevision: number,
): CreatorAgentRunRequestV1 {
  const snapshot = session.getSnapshot();
  const proposal = snapshot.proposal;
  const program = snapshot.program;
  if (proposal === null || program === null) throw new Error("expected current Program proposal");
  return {
    agentRunId,
    proposalId: proposal.proposalId,
    programId: program.programId,
    baseProgramRevision: program.revision,
    baseRepositoryRevision,
    text: `Apply ${agentRunId}.`,
  };
}

function terminalV1(
  run: CreatorAgentRunRequestV1,
  outcome: "completed" | "failed" | "cancelled" | "replaced",
): CreatorAgentTerminalRunV1 {
  if (outcome === "completed") {
    return {
      run,
      outcome,
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: `Requirement from ${run.agentRunId}.`,
      },
      finalAssistantReply: `Completed ${run.agentRunId}.`,
    };
  }
  if (outcome === "failed") return { run, outcome, diagnosticCode: "request_failed" };
  return { run, outcome };
}

function applyTerminalV1(session: CreatorSessionV1, terminal: CreatorAgentTerminalRunV1): void {
  const applied = session.applyAgentRunTerminal(terminal);
  if (applied.kind !== "applied") throw new Error("expected applied Agent terminal");
}

interface AuthorityHarnessV1 {
  readonly authority: BrowserProgramWorkspaceAuthorityV1;
  readonly repositoryBacking: MemoryProgramRepositoryBackingV3;
  readonly hostBacking: FakeHostBackingV1;
  readonly host: FakeHostControlV1;
}

function authorityHarnessV1(input: {
  readonly repositoryBacking?: MemoryProgramRepositoryBackingV3;
  readonly hostBacking?: FakeHostBackingV1;
  readonly repository?: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly createRepository?: () => ProgramRepositoryWithWorkspaceContinuationV1;
  readonly hooks?: FakeHostHooksV1;
  readonly events?: string[];
} = {}): AuthorityHarnessV1 {
  const repositoryBacking = input.repositoryBacking ?? createMemoryProgramRepositoryBackingV3();
  const hostBacking = input.hostBacking ?? fakeHostBackingV1();
  const host = fakeHostV1(hostBacking, input.hooks, input.events);
  let nextSnapshot = 1;
  return {
    repositoryBacking,
    hostBacking,
    host,
    authority: createBrowserProgramWorkspaceAuthorityV1({
      repository: input.repository ??
        createMemoryProgramRepositoryV3({ backing: repositoryBacking }),
      createRepository: input.createRepository ??
        (() => createMemoryProgramRepositoryV3({ backing: repositoryBacking })),
      host: host.host,
      createSnapshotId: () => `snapshot.authority.${String(nextSnapshot++)}`,
    }),
  };
}

async function createProgramV1(
  harness: AuthorityHarnessV1,
  workspaceId: string,
): Promise<
  { readonly fixture: ProgramFixtureV1; readonly result: ProgramRepositoryCommitResultV3 }
> {
  const fixture = programFixtureV1(workspaceId);
  await harness.authority.initialize();
  const result = await harness.authority.create({
    snapshot: fixture.session.getSnapshot(),
    updatedAt: 1,
  });
  if (result.kind === "conflict") throw new Error("expected committed Program");
  return { fixture, result };
}

async function applyFollowUpV1(input: {
  readonly authority: BrowserProgramWorkspaceAuthorityV1;
  readonly fixture: ProgramFixtureV1;
  readonly expectedRepositoryRevision: number;
  readonly text: string;
  readonly updatedAt: number;
}): Promise<ProgramRepositoryCommitResultV3> {
  const expectedProposal = expectedProposalV1(input.fixture.session);
  const baseProgramRevision = currentProgramRevisionV1(input.fixture.session);
  if (input.fixture.session.sendFollowUp(input.text).kind !== "sent") {
    throw new Error("expected follow-up revision");
  }
  return await input.authority.applyRevision({
    programId: input.fixture.programId,
    expectedRepositoryRevision: input.expectedRepositoryRevision,
    expectedBase: {
      proposalId: expectedProposal.proposalId,
      programId: input.fixture.programId,
      baseProgramRevision,
    },
    snapshot: input.fixture.session.getSnapshot(),
    updatedAt: input.updatedAt,
  });
}

async function decideV1(input: {
  readonly authority: BrowserProgramWorkspaceAuthorityV1;
  readonly session: CreatorSessionV1;
  readonly fixture: Pick<ProgramFixtureV1, "programId">;
  readonly status: "accepted" | "rejected";
  readonly expectedRepositoryRevision: number;
  readonly updatedAt: number;
}): Promise<ProgramRepositoryCommitResultV3> {
  const expectedProposal = expectedProposalV1(input.session);
  const applied = input.status === "accepted"
    ? input.session.acceptProposal(expectedProposal)
    : input.session.rejectProposal(expectedProposal);
  if (applied.kind !== "applied") throw new Error(`expected applied ${input.status}`);
  return await input.authority.decide({
    status: input.status,
    programId: input.fixture.programId,
    expectedRepositoryRevision: input.expectedRepositoryRevision,
    expectedProposal,
    snapshot: input.session.getSnapshot(),
    updatedAt: input.updatedAt,
  });
}

describe("Browser Program workspace authority V1", () => {
  it("atomically creates the initial candidate/head pair and cold-reopens its exact volume", async () => {
    const first = authorityHarnessV1();
    const { fixture, result } = await createProgramV1(first, "workspace.authority.reopen");
    expect(result).toMatchObject({
      kind: "committed",
      aggregate: {
        repositoryRevision: 1,
        reviewBinding: { checkpointId: "checkpoint.volume.authority.1.1", generation: 1 },
      },
    });
    expect(await first.authority.list()).toEqual([
      expect.objectContaining({ programId: fixture.programId, repositoryRevision: 1 }),
    ]);
    expect(await first.authority.load(fixture.programId)).toMatchObject({ repositoryRevision: 1 });

    const opened = await first.authority.openWorkspace(fixture);
    expect(opened.snapshot.volumeId).toBe("volume.authority.1");
    opened.environmentPort.close();
    await first.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );
    await first.authority.closeActiveWorkspace();
    await first.authority.dispose();

    const second = authorityHarnessV1({
      repositoryBacking: first.repositoryBacking,
      hostBacking: first.hostBacking,
    });
    const reopened = await second.authority.openWorkspace(fixture);
    expect(reopened.snapshot.volumeId).toBe("volume.authority.1");
    reopened.environmentPort.close();
    await second.authority.detachWorkspaceEnvironment(
      reopened.snapshot.descriptor.workspaceSessionId,
    );
    await second.authority.dispose();
  });

  it("cleans a lost-create candidate only when fresh Repository truth is known-unowned", async () => {
    for (const durableTruth of ["null", "different", "unknown"] as const) {
      const repositoryBacking = createMemoryProgramRepositoryBackingV3();
      const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
      const repository = proxyRepositoryV1(delegate, {
        async create(input) {
          if (durableTruth === "different") {
            const continuation = {
              ...input.continuation,
              volumeId: `volume.concurrent.${durableTruth}`,
            };
            repositoryBacking.programs.set(
              input.continuation.programId,
              buildProgramRepositoryCreateV3({ ...input, continuation }),
            );
            repositoryBacking.workspaceContinuations.set(
              input.continuation.programId,
              continuation,
            );
          }
          throw createProgramRepositoryFailureV3("outcome_unknown", "create");
        },
      });
      const harness = authorityHarnessV1({
        repositoryBacking,
        repository,
        ...(durableTruth === "unknown"
          ? {
            createRepository: () =>
              proxyRepositoryV1(
                createMemoryProgramRepositoryV3({ backing: repositoryBacking }),
                {
                  load: () =>
                    Promise.reject(createProgramRepositoryFailureV3("unavailable", "load")),
                },
              ),
          }
          : {}),
      });
      const fixture = programFixtureV1(`workspace.authority.create-${durableTruth}`);
      await harness.authority.initialize();
      await expect(harness.authority.create({
        snapshot: fixture.session.getSnapshot(),
        updatedAt: 1,
      })).rejects.toMatchObject({ code: "outcome_unknown" });
      expect(harness.host.discardedVolumes).toEqual(
        durableTruth === "unknown" ? [] : ["volume.authority.1"],
      );
      expect(harness.hostBacking.volumes.size).toBe(durableTruth === "unknown" ? 1 : 0);
      await harness.authority.dispose();
    }
  });

  it("preserves exact initial ownership and reconciles a lost create response", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    const repository = proxyRepositoryV1(delegate, {
      async create(input) {
        await delegate.create(input);
        throw createProgramRepositoryFailureV3("outcome_unknown", "create");
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const fixture = programFixtureV1("workspace.authority.create-owned");
    await harness.authority.initialize();
    await expect(harness.authority.create({
      snapshot: fixture.session.getSnapshot(),
      updatedAt: 1,
    })).resolves.toMatchObject({ kind: "unchanged", aggregate: { repositoryRevision: 1 } });
    expect(harness.host.discardedVolumes).toHaveLength(0);
    expect(harness.hostBacking.volumes.size).toBe(1);
    await harness.authority.dispose();
  });

  it("cleans a response-mismatch candidate only when fresh Repository truth is known-unowned", async () => {
    for (const durableTruth of ["null", "different", "exact", "unknown"] as const) {
      const repositoryBacking = createMemoryProgramRepositoryBackingV3();
      const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
      let responseReturned = false;
      const repository = proxyRepositoryV1(delegate, {
        load(programId) {
          if (responseReturned && durableTruth === "unknown") {
            return Promise.reject(createProgramRepositoryFailureV3("unavailable", "load"));
          }
          return delegate.load(programId);
        },
        async create(input) {
          responseReturned = true;
          const committed = durableTruth === "exact" ? await delegate.create(input) : null;
          if (durableTruth === "different") {
            const continuation = {
              ...input.continuation,
              volumeId: "volume.concurrent.response-mismatch",
            };
            repositoryBacking.programs.set(
              input.continuation.programId,
              buildProgramRepositoryCreateV3({ ...input, continuation }),
            );
            repositoryBacking.workspaceContinuations.set(
              input.continuation.programId,
              continuation,
            );
          }
          const expected = committed === null || committed.kind === "conflict"
            ? buildProgramRepositoryCreateV3(input)
            : committed.aggregate;
          return {
            kind: "committed",
            aggregate: { ...expected, updatedAt: expected.updatedAt + 1 },
          };
        },
      });
      const harness = authorityHarnessV1({ repositoryBacking, repository });
      const fixture = programFixtureV1(`workspace.authority.mismatch-${durableTruth}`);
      await harness.authority.initialize();
      await expect(harness.authority.create({
        snapshot: fixture.session.getSnapshot(),
        updatedAt: 1,
      })).rejects.toThrow("sillyos.browser_program_workspace.repository_response_mismatch");
      const knownUnowned = durableTruth === "null" || durableTruth === "different";
      expect(harness.host.discardedVolumes).toHaveLength(knownUnowned ? 1 : 0);
      expect(harness.hostBacking.volumes.size).toBe(knownUnowned ? 0 : 1);
      await harness.authority.dispose();
    }
  });

  it("supports no-Pi create, follow-up, and Accept through one lazily opened Host session", async () => {
    const harness = authorityHarnessV1();
    const { fixture } = await createProgramV1(harness, "workspace.authority.no-pi");
    expect(harness.host.events).not.toContain("host:open");

    const revised = await applyFollowUpV1({
      authority: harness.authority,
      fixture,
      expectedRepositoryRevision: 1,
      text: "Add one verified review step.",
      updatedAt: 2,
    });
    expect(revised).toMatchObject({
      kind: "committed",
      aggregate: { repositoryRevision: 2, reviewBinding: { generation: 1 } },
    });
    expect(harness.host.events.filter((event) => event === "host:open")).toHaveLength(1);
    expect(harness.host.events).not.toContain("host:attach");

    const accepted = await decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 2,
      updatedAt: 3,
    });
    expect(accepted).toMatchObject({
      kind: "committed",
      aggregate: {
        repositoryRevision: 3,
        reviewBinding: null,
        decisions: [{ status: "accepted", snapshot: { generation: 1 } }],
      },
    });
    expect(harness.host.adopted).toHaveLength(1);
    expect(harness.host.events).not.toContain("host:attach");
    await harness.authority.dispose();
  });

  it("captures successor heads but retains the prior head for non-producing Agent terminals", async () => {
    const harness = authorityHarnessV1();
    const { fixture } = await createProgramV1(harness, "workspace.authority.terminals");
    const revised = await applyFollowUpV1({
      authority: harness.authority,
      fixture,
      expectedRepositoryRevision: 1,
      text: "Open revision two.",
      updatedAt: 2,
    });
    if (revised.kind === "conflict") throw new Error("expected revision");
    const workspaceSessionId = harness.host.activeSessionId;
    if (workspaceSessionId === null) throw new Error("expected internal Host session");
    const priorBinding = revised.aggregate.reviewBinding;
    if (priorBinding === null) throw new Error("expected binding");
    harness.host.advanceHead(workspaceSessionId);

    let repositoryRevision = revised.aggregate.repositoryRevision;
    for (const outcome of ["failed", "cancelled", "replaced"] as const) {
      const run = currentRunV1(
        fixture.session,
        `agent-run.${outcome}.${String(repositoryRevision)}`,
        repositoryRevision,
      );
      const terminal = terminalV1(run, outcome);
      applyTerminalV1(fixture.session, terminal);
      const settled = await harness.authority.settleAgentRun({
        programId: fixture.programId,
        expectedRepositoryRevision: repositoryRevision,
        terminal,
        snapshot: fixture.session.getSnapshot(),
        updatedAt: repositoryRevision + 1,
      });
      if (settled.kind === "conflict") throw new Error("expected terminal settlement");
      expect(settled.aggregate.reviewBinding).toMatchObject({
        checkpointId: priorBinding.checkpointId,
        generation: priorBinding.generation,
        programRevision: priorBinding.programRevision,
      });
      expect(settled.aggregate.reviewBinding?.repositoryRevision).toBe(
        settled.aggregate.repositoryRevision,
      );
      repositoryRevision = settled.aggregate.repositoryRevision;
    }

    const completedRun = currentRunV1(
      fixture.session,
      "agent-run.completed.1",
      repositoryRevision,
    );
    const completed = terminalV1(completedRun, "completed");
    applyTerminalV1(fixture.session, completed);
    const settled = await harness.authority.settleAgentRun({
      programId: fixture.programId,
      expectedRepositoryRevision: repositoryRevision,
      terminal: completed,
      snapshot: fixture.session.getSnapshot(),
      updatedAt: repositoryRevision + 1,
    });
    expect(settled).toMatchObject({
      kind: "committed",
      aggregate: { reviewBinding: { generation: 2 } },
    });
    expect(
      harness.host.events.filter((event) => event === "host:capture:start"),
    ).toHaveLength(2);
    await harness.authority.dispose();
  });

  it("keeps Reject repository-only and clears a proven-unreferenced failed-Accept candidate", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    let failAcceptedOnce = true;
    const repository = proxyRepositoryV1(delegate, {
      async decide(input) {
        if (input.status === "accepted" && failAcceptedOnce) {
          failAcceptedOnce = false;
          throw createProgramRepositoryFailureV3("transaction_aborted", "decide");
        }
        return await delegate.decide(input);
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const { fixture } = await createProgramV1(harness, "workspace.authority.reject-cleanup");
    const pendingSnapshot = fixture.session.getSnapshot();
    const attemptedAccept = sessionFromSnapshotV1(pendingSnapshot);

    await expect(decideV1({
      authority: harness.authority,
      session: attemptedAccept,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    })).rejects.toMatchObject({ code: "transaction_aborted" });
    const volumeId = harness.host.createdVolumes[0];
    if (volumeId === undefined) throw new Error("expected volume");
    expect(harness.host.currentVolume(volumeId).candidate).not.toBeNull();
    await harness.authority.closeActiveWorkspace();
    await harness.authority.dispose();

    const cold = authorityHarnessV1({
      repositoryBacking,
      hostBacking: harness.hostBacking,
    });

    const rejectedSession = sessionFromSnapshotV1(pendingSnapshot);
    const rejected = await decideV1({
      authority: cold.authority,
      session: rejectedSession,
      fixture,
      status: "rejected",
      expectedRepositoryRevision: 1,
      updatedAt: 3,
    });
    if (rejected.kind === "conflict") throw new Error("expected Reject commit");
    expect(rejected.aggregate.decisions).toEqual([
      expect.objectContaining({ status: "rejected" }),
    ]);
    expect("snapshot" in rejected.aggregate.decisions[0]!).toBe(false);
    expect(cold.host.currentVolume(volumeId).candidate).toBeNull();
    expect(cold.host.discardedSnapshots).toHaveLength(1);

    const successorFixture = { ...fixture, session: rejectedSession };
    const revised = await applyFollowUpV1({
      authority: cold.authority,
      fixture: successorFixture,
      expectedRepositoryRevision: 2,
      text: "Try a new revision after Reject.",
      updatedAt: 4,
    });
    if (revised.kind === "conflict") throw new Error("expected successor revision");
    await expect(decideV1({
      authority: cold.authority,
      session: rejectedSession,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: revised.aggregate.repositoryRevision,
      updatedAt: 5,
    })).resolves.toMatchObject({ kind: "committed" });
    expect(harness.host.prepared).toHaveLength(1);
    expect(cold.host.prepared).toHaveLength(1);
    expect(cold.host.adopted).toHaveLength(1);
    await cold.authority.dispose();
  });

  it("adopts an exact durable Accept after a lost Repository response", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    let loseDecision = true;
    const repository = proxyRepositoryV1(delegate, {
      async decide(input) {
        const result = await delegate.decide(input);
        if (loseDecision) {
          loseDecision = false;
          throw createProgramRepositoryFailureV3("outcome_unknown", "decide");
        }
        return result;
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const { fixture } = await createProgramV1(harness, "workspace.authority.lost-commit");
    const accepted = await decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    });
    expect(accepted).toMatchObject({ kind: "unchanged", aggregate: { repositoryRevision: 2 } });
    expect(harness.host.adopted).toHaveLength(1);
    expect(harness.host.discardedSnapshots).toHaveLength(0);
    await harness.authority.dispose();
  });

  it("preserves an Accept candidate when Repository truth remains unknown", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    const repository = proxyRepositoryV1(delegate, {
      decide() {
        return Promise.reject(createProgramRepositoryFailureV3("outcome_unknown", "decide"));
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const { fixture } = await createProgramV1(harness, "workspace.authority.lost-no-commit");
    await expect(decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    })).rejects.toMatchObject({ code: "outcome_unknown" });
    const volumeId = harness.host.createdVolumes[0];
    if (volumeId === undefined) throw new Error("expected volume");
    expect(harness.host.currentVolume(volumeId).candidate).not.toBeNull();
    expect(harness.host.discardedSnapshots).toHaveLength(0);
    await harness.authority.dispose();
  });

  it("exact-discards a candidate only after a known Repository conflict", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    const repository = proxyRepositoryV1(delegate, {
      async decide(input) {
        return { kind: "conflict", current: await delegate.load(input.programId) };
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const { fixture } = await createProgramV1(harness, "workspace.authority.known-conflict");
    await expect(decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    })).resolves.toMatchObject({ kind: "conflict" });
    expect(harness.host.discardedSnapshots).toHaveLength(1);
    await harness.authority.dispose();
  });

  it("validates retained accepted truth before ignoring an unrelated sole candidate", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    let acceptedCalls = 0;
    const repository = proxyRepositoryV1(delegate, {
      async decide(input) {
        if (input.status === "accepted" && ++acceptedCalls === 2) {
          throw createProgramRepositoryFailureV3("transaction_aborted", "decide");
        }
        return await delegate.decide(input);
      },
    });
    const harness = authorityHarnessV1({ repositoryBacking, repository });
    const { fixture } = await createProgramV1(harness, "workspace.authority.unrelated-candidate");
    const firstAccepted = await decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    });
    if (firstAccepted.kind === "conflict") throw new Error("expected first Accept");
    const revised = await applyFollowUpV1({
      authority: harness.authority,
      fixture,
      expectedRepositoryRevision: firstAccepted.aggregate.repositoryRevision,
      text: "Prepare an unrelated second candidate.",
      updatedAt: 3,
    });
    if (revised.kind === "conflict") throw new Error("expected successor");
    await expect(decideV1({
      authority: harness.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: revised.aggregate.repositoryRevision,
      updatedAt: 4,
    })).rejects.toMatchObject({ code: "transaction_aborted" });
    const volumeId = harness.host.createdVolumes[0];
    if (volumeId === undefined) throw new Error("expected volume");
    expect(harness.host.currentVolume(volumeId).candidate).toMatchObject({
      programRevision: 2,
    });

    const queryStart = harness.host.events.length;
    await expect(harness.authority.load(fixture.programId)).resolves.toMatchObject({
      repositoryRevision: revised.aggregate.repositoryRevision,
    });
    expect(harness.host.events.slice(queryStart, queryStart + 1)).toEqual([
      "host:query_retained",
    ]);
    expect(harness.host.currentVolume(volumeId).candidate).not.toBeNull();
    await harness.authority.dispose();
  });

  it("cold load validates every accepted snapshot reference, not only the latest", async () => {
    const first = authorityHarnessV1();
    const { fixture } = await createProgramV1(first, "workspace.authority.all-accepted");
    const acceptedOne = await decideV1({
      authority: first.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    });
    if (acceptedOne.kind === "conflict") throw new Error("expected first Accept");
    const revised = await applyFollowUpV1({
      authority: first.authority,
      fixture,
      expectedRepositoryRevision: acceptedOne.aggregate.repositoryRevision,
      text: "Create a second accepted revision.",
      updatedAt: 3,
    });
    if (revised.kind === "conflict") throw new Error("expected successor");
    const acceptedTwo = await decideV1({
      authority: first.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: revised.aggregate.repositoryRevision,
      updatedAt: 4,
    });
    if (acceptedTwo.kind === "conflict") throw new Error("expected second Accept");
    const receipts = acceptedTwo.aggregate.decisions.flatMap((decision) =>
      decision.status === "accepted" ? [decision.snapshot] : []
    );
    expect(receipts).toHaveLength(2);
    const volumeId = receipts[0]?.volumeId;
    if (volumeId === undefined) throw new Error("expected accepted volume");
    await first.authority.dispose();

    const volume = first.hostBacking.volumes.get(volumeId);
    const oldest = receipts[0];
    if (volume === undefined || oldest === undefined) throw new Error("expected retained history");
    volume.retained.set(oldest.snapshotId, {
      ...oldest,
      archiveBytes: oldest.archiveBytes + 1,
    });
    const cold = authorityHarnessV1({
      repositoryBacking: first.repositoryBacking,
      hostBacking: first.hostBacking,
    });
    await expect(cold.authority.load(fixture.programId)).rejects.toThrow(
      "sillyos.browser_program_workspace.recovery_required",
    );
    await cold.authority.dispose();
  });

  it("cold-loads accepted candidate and retained truth, but rejects missing or corrupt bytes", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const hostBacking = fakeHostBackingV1();
    let loseAdopt = true;
    const first = authorityHarnessV1({
      repositoryBacking,
      hostBacking,
      hooks: {
        beforeAdopt() {
          if (!loseAdopt) return;
          loseAdopt = false;
          throw codedHostErrorV1("outcome_unknown");
        },
      },
    });
    const { fixture } = await createProgramV1(first, "workspace.authority.cold-recovery");
    await expect(decideV1({
      authority: first.authority,
      session: fixture.session,
      fixture,
      status: "accepted",
      expectedRepositoryRevision: 1,
      updatedAt: 2,
    })).rejects.toThrow("sillyos.browser_program_workspace.recovery_required");
    const volumeId = first.host.createdVolumes[0];
    if (volumeId === undefined) throw new Error("expected volume");
    const coldVolume = first.host.currentVolume(volumeId);
    expect(coldVolume.candidate).not.toBeNull();
    await first.authority.dispose();

    coldVolume.generation += 1;
    coldVolume.checkpointId = `checkpoint.${volumeId}.${String(coldVolume.generation)}`;

    const candidateRecovery = authorityHarnessV1({ repositoryBacking, hostBacking });
    await expect(candidateRecovery.authority.load(fixture.programId)).resolves.toMatchObject({
      repositoryRevision: 2,
    });
    const retainedReceipt = candidateRecovery.host.currentVolume(volumeId).retained.values().next()
      .value as ProgramWorkspaceSnapshotReceiptV1 | undefined;
    if (retainedReceipt === undefined) throw new Error("expected retained snapshot");
    expect(candidateRecovery.host.adopted).toEqual([retainedReceipt]);
    expect(candidateRecovery.host.events).not.toContain("host:resume");
    await candidateRecovery.authority.dispose();

    const retainedRecovery = authorityHarnessV1({ repositoryBacking, hostBacking });
    await expect(retainedRecovery.authority.load(fixture.programId)).resolves.toMatchObject({
      repositoryRevision: 2,
    });
    expect(retainedRecovery.host.adopted).toHaveLength(0);
    await retainedRecovery.authority.dispose();

    hostBacking.volumes.get(volumeId)?.retained.delete(retainedReceipt.snapshotId);
    const missing = authorityHarnessV1({ repositoryBacking, hostBacking });
    await expect(missing.authority.load(fixture.programId)).rejects.toThrow(
      "sillyos.browser_program_workspace.recovery_required",
    );
    await missing.authority.dispose();

    const corruptVolume = hostBacking.volumes.get(volumeId);
    if (corruptVolume === undefined) throw new Error("expected retained volume");
    corruptVolume.retained.set(retainedReceipt.snapshotId, {
      ...retainedReceipt,
      archiveBytes: retainedReceipt.archiveBytes + 1,
    });
    const corrupt = authorityHarnessV1({ repositoryBacking, hostBacking });
    await expect(corrupt.authority.load(fixture.programId)).rejects.toThrow(
      "sillyos.browser_program_workspace.recovery_required",
    );
    await corrupt.authority.dispose();
  });

  it("serializes review capture, catalog reads, active close, and disposes Repository last", async () => {
    const events: string[] = [];
    const captureEntered = deferredV1<void>();
    const captureRelease = deferredV1<void>();
    const repositoryBacking = createMemoryProgramRepositoryBackingV3();
    const delegate = createMemoryProgramRepositoryV3({ backing: repositoryBacking });
    const repository = proxyRepositoryV1(delegate, {
      async list() {
        events.push("repository:list");
        return await delegate.list();
      },
      async applyRevision(input) {
        events.push("repository:apply");
        return await delegate.applyRevision(input);
      },
      async dispose() {
        events.push("repository:dispose");
        await delegate.dispose();
      },
    });
    const harness = authorityHarnessV1({
      repositoryBacking,
      repository,
      events,
      hooks: {
        async beforeCapture() {
          captureEntered.resolve(undefined);
          await captureRelease.promise;
        },
      },
    });
    const { fixture } = await createProgramV1(harness, "workspace.authority.serialization");
    const pendingRevision = applyFollowUpV1({
      authority: harness.authority,
      fixture,
      expectedRepositoryRevision: 1,
      text: "Serialize this review capture.",
      updatedAt: 2,
    });
    await captureEntered.promise;
    const pendingList = harness.authority.list();
    const pendingClose = harness.authority.closeActiveWorkspace();
    await Promise.resolve();
    expect(events).not.toContain("repository:list");
    expect(events).not.toContain("host:close");

    captureRelease.resolve(undefined);
    await pendingRevision;
    await pendingList;
    await pendingClose;
    expect(events.indexOf("host:capture:end")).toBeLessThan(events.indexOf("repository:apply"));
    expect(events.indexOf("repository:apply")).toBeLessThan(events.indexOf("repository:list"));
    expect(events.indexOf("repository:list")).toBeLessThan(events.indexOf("host:close"));

    const opened = await harness.authority.openWorkspace(fixture);
    opened.environmentPort.close();
    await harness.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );
    await harness.authority.dispose();
    const finalClose = events.lastIndexOf("host:close");
    expect(finalClose).toBeLessThan(events.indexOf("host:dispose"));
    expect(events.indexOf("host:dispose")).toBeLessThan(events.indexOf("repository:dispose"));
  });

  it("does not admit a new Agent submit between review-head capture and Repository CAS", async () => {
    const captureEntered = deferredV1<void>();
    const captureRelease = deferredV1<void>();
    const harness = authorityHarnessV1({
      hooks: {
        async beforeCapture() {
          captureEntered.resolve(undefined);
          await captureRelease.promise;
        },
      },
    });
    const { fixture } = await createProgramV1(harness, "workspace.authority.submit-fence");
    const opened = await harness.authority.openWorkspace(fixture);
    const pendingRevision = applyFollowUpV1({
      authority: harness.authority,
      fixture,
      expectedRepositoryRevision: 1,
      text: "Commit before admitting another Agent run.",
      updatedAt: 2,
    });
    await captureEntered.promise;

    let submitInvoked = false;
    const pendingSubmit = harness.authority.withAgentSubmitAdmission({
      programId: fixture.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 1,
      expectedGeneration: opened.snapshot.descriptor.generation,
      operation: () => {
        submitInvoked = true;
        return Promise.resolve("submitted" as const);
      },
    });
    await Promise.resolve();
    expect(submitInvoked).toBe(false);

    captureRelease.resolve(undefined);
    await expect(pendingRevision).resolves.toMatchObject({ kind: "committed" });
    await expect(pendingSubmit).rejects.toThrow(
      "sillyos.browser_program_workspace.agent_submit_stale",
    );
    expect(submitInvoked).toBe(false);
    opened.environmentPort.close();
    await harness.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );
    await harness.authority.dispose();
  });

  it("detaches and reattaches Pi without closing Host, then Home permits another Program", async () => {
    const harness = authorityHarnessV1();
    const first = await createProgramV1(harness, "workspace.authority.lifecycle-a");
    const second = await createProgramV1(harness, "workspace.authority.lifecycle-b");
    const opened = await harness.authority.openWorkspace(first.fixture);
    const workspaceSessionId = opened.snapshot.descriptor.workspaceSessionId;
    await expect(harness.authority.load(second.fixture.programId)).rejects.toThrow(
      "sillyos.browser_program_workspace.workspace_busy",
    );
    await expect(harness.authority.closeActiveWorkspace()).rejects.toThrow(
      "sillyos.browser_program_workspace.workspace_busy",
    );

    opened.environmentPort.close();
    await harness.authority.detachWorkspaceEnvironment(workspaceSessionId);
    const reattached = await harness.authority.openWorkspace(first.fixture);
    expect(reattached.snapshot.descriptor.workspaceSessionId).toBe(workspaceSessionId);
    expect(harness.host.events.filter((event) => event === "host:open")).toHaveLength(1);
    expect(harness.host.events.filter((event) => event === "host:attach")).toHaveLength(2);

    reattached.environmentPort.close();
    await harness.authority.detachWorkspaceEnvironment(workspaceSessionId);
    await expect(harness.authority.closeActiveWorkspace()).resolves.toMatchObject({
      phase: "closed",
    });
    await expect(harness.authority.closeActiveWorkspace()).resolves.toBeNull();
    await expect(harness.authority.load(second.fixture.programId)).resolves.toMatchObject({
      programId: second.fixture.programId,
    });
    await harness.authority.dispose();
  });

  it("exports only the exact durable continuation owned by the shared authority", async () => {
    const harness = authorityHarnessV1();
    const { fixture } = await createProgramV1(harness, "workspace.authority.export");
    const opened = await harness.authority.openWorkspace(fixture);
    const progress: number[] = [];
    const result = await harness.authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      signal: new AbortController().signal,
      onProgress: (value) => progress.push(value.bytesWritten),
      onReady: (_ready, commitRelease) => commitRelease() ? "release" : "cancel",
    });
    expect(result).toMatchObject({ kind: "released", bytesWritten: 64 });
    expect(progress).toEqual([64]);
    expect(harness.host.exportInputs).toEqual([{ programRevision: 1, repositoryRevision: 1 }]);
    opened.environmentPort.close();
    await harness.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );
    await harness.authority.dispose();
  });
});
