// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  createBrowserProgramWorkspaceAuthorityV1,
  type BrowserProgramWorkspaceOperationFenceV1,
} from "../product/browser-program-workspace-authority.ts";
import { createIndexedDbProgramDataRepositoryV1 } from "../product/indexeddb-program-data-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
} from "../product/program-data-repository.ts";
import {
  createBuiltinCreatorProgramDefinitionRevisionV1,
  type ProcessTranscriptAppendInputV1,
  type TranscriptEntryV1,
} from "../product/program-process-repository.ts";
import type { PreviewProgramV1 } from "../product/contracts.ts";
import type { BrowserWorkspaceHostPagePortV1 } from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "../workspace/contracts.ts";

interface MemoryProgramDataV1 {
  readonly repository: ReturnType<typeof createIndexedDbProgramDataRepositoryV1>;
}

function createMemoryProgramDataV1(): MemoryProgramDataV1 {
  return {
    repository: createIndexedDbProgramDataRepositoryV1({
      indexedDB: new IDBFactory(),
      keyRange: IDBKeyRange,
    }),
  };
}

interface FakeVolumeV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  checkpointId: string;
  generation: number;
  candidate: ProgramWorkspaceSnapshotReceiptV1 | null;
  readonly retained: Map<string, ProgramWorkspaceSnapshotReceiptV1>;
}

interface FakeHostV1 {
  readonly port: BrowserWorkspaceHostPagePortV1;
  readonly events: string[];
  readonly volumes: Map<string, FakeVolumeV1>;
  readonly discardedCandidates: string[];
  readonly prepared: ProgramWorkspaceSnapshotReceiptV1[];
  readonly adopted: ProgramWorkspaceSnapshotReceiptV1[];
  activeSessionId(): string | null;
  advanceHead(): void;
}

function fakeHostV1(): FakeHostV1 {
  const events: string[] = [];
  const volumes = new Map<string, FakeVolumeV1>();
  const sessions = new Map<string, BrowserWorkspaceHostSnapshotWireV1>();
  const channels = new Map<string, MessageChannel>();
  const discardedCandidates: string[] = [];
  const prepared: ProgramWorkspaceSnapshotReceiptV1[] = [];
  const adopted: ProgramWorkspaceSnapshotReceiptV1[] = [];
  const fatalListeners = new Set<(fatal: { readonly code: "unavailable" }) => void>();
  let nextVolume = 1;
  let nextSession = 1;

  const volumeForSessionV1 = (workspaceSessionId: string): FakeVolumeV1 => {
    const snapshot = sessions.get(workspaceSessionId);
    const volume = snapshot === undefined ? undefined : volumes.get(snapshot.volumeId);
    if (volume === undefined) throw new Error("fake.workspace_missing");
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

  const port: BrowserWorkspaceHostPagePortV1 = {
    async inspectStorage() {
      events.push("host:inspect");
      return {
        revision: 1,
        scope: "sandbox_origin_advisory",
        persisted: false,
        usageBytes: volumes.size * 1024,
      };
    },
    async purgeAllWorkspaces() {
      events.push("host:purge");
      if (sessions.size > 0) throw new Error("fake.workspace_busy");
      volumes.clear();
      return { revision: 1, kind: "purged" };
    },
    async withBootstrapLease({ operation }) {
      events.push("host:lease");
      return await operation();
    },
    async createCandidate(input) {
      events.push("host:create_candidate");
      const volumeId = `volume.test.${String(nextVolume++)}`;
      const anchor: BrowserWorkspaceVolumeAnchorWireV1 = {
        revision: 1,
        programId: input.programId,
        workspaceId: input.workspaceId,
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
      volumes.set(volumeId, volume);
      return {
        revision: 1,
        anchor,
        checkpointId: volume.checkpointId,
        generation: volume.generation,
      };
    },
    async discardCandidate(volumeId) {
      events.push("host:discard_candidate");
      volumes.delete(volumeId);
      discardedCandidates.push(volumeId);
    },
    async openWorkspace(anchor) {
      events.push("host:open");
      const volume = volumes.get(anchor.volumeId);
      if (volume === undefined) throw new Error("fake.volume_missing");
      const workspaceSessionId = `session.test.${String(nextSession++)}`;
      const snapshot = openSnapshotV1(volume, workspaceSessionId);
      sessions.set(workspaceSessionId, snapshot);
      return snapshot;
    },
    async importFile(input) {
      events.push("host:import");
      const volume = volumeForSessionV1(input.workspaceSessionId);
      if (
        volume.checkpointId !== input.expectedCheckpointId ||
        volume.generation !== input.expectedGeneration
      ) throw new Error("fake.workspace_stale");
      void input.path;
      void input.bytes;
      volume.generation += 1;
      volume.checkpointId = `checkpoint.${volume.anchor.volumeId}.${String(volume.generation)}`;
      const snapshot = openSnapshotV1(volume, input.workspaceSessionId);
      sessions.set(input.workspaceSessionId, snapshot);
      return { changed: true, snapshot };
    },
    async queryWorkspace(workspaceSessionId) {
      events.push("host:query");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw new Error("fake.workspace_missing");
      return snapshot;
    },
    async attachEnvironment({ workspaceSessionId }) {
      events.push("host:attach");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw new Error("fake.workspace_missing");
      const channel = new MessageChannel();
      channels.set(workspaceSessionId, channel);
      return { snapshot, environmentPort: channel.port2 };
    },
    async closeWorkspace(workspaceSessionId) {
      events.push("host:close");
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw new Error("fake.workspace_missing");
      sessions.delete(workspaceSessionId);
      const channel = channels.get(workspaceSessionId);
      channel?.port1.close();
      channel?.port2.close();
      channels.delete(workspaceSessionId);
      return { ...snapshot, phase: "closed" };
    },
    async exportWorkspace(input) {
      events.push("host:export");
      const snapshot = sessions.get(input.workspaceSessionId);
      if (snapshot === undefined) throw new Error("fake.workspace_missing");
      const ready = {
        checkpointId: snapshot.checkpointId,
        generation: snapshot.descriptor.generation,
        filesCompleted: 1,
        filesTotal: 1,
        bytesWritten: 32,
        bytesTotal: 32,
      };
      const disposition = await input.onReady(ready, async () => {
        events.push("host:download");
      });
      return disposition === "release"
        ? { kind: "released", ...ready }
        : { kind: "cancelled", ...ready };
    },
    async prepareSnapshot(input) {
      events.push("host:prepare");
      const volume = volumeForSessionV1(input.workspaceSessionId);
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
        fileCount: 2,
        archiveBytes: 64,
      };
      volume.candidate = receipt;
      prepared.push(receipt);
      return receipt;
    },
    async querySnapshotCandidate(workspaceSessionId) {
      events.push("host:query_candidate");
      return volumeForSessionV1(workspaceSessionId).candidate;
    },
    async queryRetainedSnapshot({ workspaceSessionId, expected }) {
      events.push("host:query_retained");
      return volumeForSessionV1(workspaceSessionId).retained.get(expected.snapshotId) ?? null;
    },
    async captureReviewHead(workspaceSessionId) {
      events.push("host:capture");
      const volume = volumeForSessionV1(workspaceSessionId);
      return openSnapshotV1(volume, workspaceSessionId);
    },
    async resumeSnapshotPublication({ workspaceSessionId, expected }) {
      events.push("host:resume");
      const candidate = volumeForSessionV1(workspaceSessionId).candidate;
      if (candidate?.snapshotId !== expected.snapshotId) throw new Error("fake.snapshot_missing");
      return candidate;
    },
    async adoptSnapshot({ workspaceSessionId, expected }) {
      events.push("host:adopt");
      const volume = volumeForSessionV1(workspaceSessionId);
      if (volume.retained.has(expected.snapshotId)) return "already_retained";
      if (volume.candidate?.snapshotId !== expected.snapshotId) {
        throw new Error("fake.snapshot_missing");
      }
      volume.retained.set(expected.snapshotId, expected);
      volume.candidate = null;
      adopted.push(expected);
      return "adopted";
    },
    async discardSnapshot({ workspaceSessionId, expected }) {
      events.push("host:discard_snapshot");
      const volume = volumeForSessionV1(workspaceSessionId);
      if (volume.retained.has(expected.snapshotId)) return "retained";
      if (volume.candidate?.snapshotId !== expected.snapshotId) return "absent";
      volume.candidate = null;
      return "discarded";
    },
    subscribeFatal(listener) {
      fatalListeners.add(listener);
      return () => fatalListeners.delete(listener);
    },
    dispose() {
      events.push("host:dispose");
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
    port,
    events,
    volumes,
    discardedCandidates,
    prepared,
    adopted,
    activeSessionId: () => [...sessions.keys()][0] ?? null,
    advanceHead() {
      const session = [...sessions.entries()][0];
      if (session === undefined) throw new Error("fake.workspace_missing");
      const [sessionId, snapshot] = session;
      const volume = volumes.get(snapshot.volumeId);
      if (volume === undefined) throw new Error("fake.volume_missing");
      volume.generation += 1;
      volume.checkpointId = `checkpoint.${volume.anchor.volumeId}.${String(volume.generation)}`;
      sessions.set(sessionId, openSnapshotV1(volume, sessionId));
    },
  };
}

const directFenceV1: BrowserProgramWorkspaceOperationFenceV1 = {
  async run(_mode, operation) {
    return await operation();
  },
};

function programV1(programId: string, revision = 1): PreviewProgramV1 {
  return {
    programId,
    revision,
    kind: "general",
    name: `Program ${programId}`,
    purpose: "Exercise the Catalog-backed Workspace authority.",
    requirements: [`Requirement ${String(revision)}`],
    suggestedCapabilities: [],
  };
}

function entryV1(processId: string, sequence: number, text: string): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId,
    sequence,
    entryId: `${processId}.entry.${String(sequence)}`,
    role: sequence % 2 === 0 ? "assistant" : "user",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${processId}.part.${String(sequence)}`,
      markdown: text,
    }],
  };
}

function appendV1(input: {
  readonly processId: string;
  readonly processRevision: number;
  readonly frontier: number;
  readonly sequence: number;
  readonly text: string;
  readonly commitId: string;
  readonly updatedAt: number;
  readonly checkpoint?: NonNullable<ProcessTranscriptAppendInputV1["checkpoint"]>;
}): ProcessTranscriptAppendInputV1 & {
  readonly attemptBinding: null;
  readonly terminalAttemptReceipt: null;
} {
  return {
    processId: input.processId,
    expectedProcessRevision: input.processRevision,
    expectedTranscriptFrontier: input.frontier,
    commitId: input.commitId,
    attemptBinding: null,
    entries: [entryV1(input.processId, input.sequence, input.text)],
    checkpoint: input.checkpoint ?? null,
    terminalAttemptReceipt: null,
    updatedAt: input.updatedAt,
  };
}

interface AuthorityHarnessV1 {
  readonly authority: ReturnType<typeof createBrowserProgramWorkspaceAuthorityV1>;
  readonly repository: ProgramDataRepositoryV1;
  readonly host: FakeHostV1;
}

async function authorityHarnessV1(
  repositoryOverride?: ProgramDataRepositoryV1,
): Promise<AuthorityHarnessV1> {
  const memory = repositoryOverride === undefined ? createMemoryProgramDataV1() : null;
  const repository = repositoryOverride ?? memory?.repository;
  if (repository === undefined) throw new Error("missing test repository");
  const host = fakeHostV1();
  let nextSnapshotId = 1;
  const authority = createBrowserProgramWorkspaceAuthorityV1({
    repository,
    host: host.port,
    createSnapshotId: () => `snapshot.test.${String(nextSnapshotId++)}`,
    operationFence: directFenceV1,
  });
  await authority.initialize();
  await repository.publishProgramDefinitionRevision(
    createBuiltinCreatorProgramDefinitionRevisionV1(),
  );
  return { authority, repository, host };
}

async function createProgramV1(input: {
  readonly harness: AuthorityHarnessV1;
  readonly programId?: string;
  readonly workspaceId?: string;
  readonly processId?: string;
}): Promise<{
  readonly programId: string;
  readonly workspaceId: string;
  readonly processId: string;
}> {
  const programId = input.programId ?? "program.test.one";
  const workspaceId = input.workspaceId ?? "workspace.test.one";
  const processId = input.processId ?? "process.test.one";
  const result = await input.harness.authority.create(createProgramInputV1({
    programId,
    workspaceId,
    processId,
  }));
  if (result.kind !== "committed" && result.kind !== "unchanged") {
    throw new Error(`unexpected create result ${result.kind}`);
  }
  return { programId, workspaceId, processId };
}

async function acquireExecutionV1(input: {
  readonly harness: AuthorityHarnessV1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly processId: string;
  readonly attemptId?: string;
  readonly observedAt?: number;
}) {
  const process = await input.harness.repository.loadProcess(input.processId);
  const review = await input.harness.authority.inspectProgramWorkspace(input.programId, {
    hostAccess: "required",
  });
  const mutableHead = review?.mutableHead ?? null;
  if (process === null || mutableHead === null) throw new Error("missing execution predecessor");
  const attemptId = input.attemptId ?? "attempt.test.one";
  const observedAt = input.observedAt ?? 2;
  const triggerSequence = process.transcriptFrontier + 1;
  const trigger = {
    ...entryV1(input.processId, triggerSequence, "Run the Creator."),
    entryId: `${attemptId}.user`,
    role: "user" as const,
  };
  const acquired = await input.harness.repository.acquireProcessExecution({
    ownerInstanceId: "owner.test.one",
    observedAt,
    expiresAt: observedAt + 30_000,
    attempt: {
      processId: input.processId,
      expectedProcessRevision: process.revision,
      expectedTranscriptFrontier: process.transcriptFrontier,
      commitId: `${attemptId}.acquire`,
      attemptId,
      generation: 1,
      trigger: { kind: "new_entry", entry: trigger },
      startingCheckpoint: {
        checkpointId: `${attemptId}.start`,
        throughSequence: triggerSequence,
        workspaceId: input.workspaceId,
        workspaceCheckpointId: mutableHead.checkpointId,
        workspaceGeneration: mutableHead.generation,
      },
      updatedAt: observedAt,
    },
  });
  if (acquired.kind === "conflict") throw new Error("execution acquire conflict");
  return acquired;
}

function createProgramInputV1(input: {
  readonly programId: string;
  readonly workspaceId: string;
  readonly processId: string;
}) {
  return {
    workspaceId: input.workspaceId,
    catalog: {
      commitId: `commit.${input.programId}.create`,
      program: programV1(input.programId),
      proposalId: `proposal.${input.programId}.1`,
      updatedAt: 1,
    },
    process: {
      processId: input.processId,
      programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
      subjectProgramId: input.programId,
      createdAt: 1,
    },
    transcript: appendV1({
      processId: input.processId,
      processRevision: 1,
      frontier: 0,
      sequence: 1,
      text: "Create this Program.",
      commitId: `commit.${input.processId}.initial`,
      updatedAt: 1,
    }),
  } as const;
}

async function acceptProposalV1(input: {
  readonly harness: AuthorityHarnessV1;
  readonly programId: string;
  readonly processId: string;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly repositoryRevision: number;
  readonly processRevision: number;
  readonly transcriptFrontier: number;
  readonly sequence: number;
  readonly updatedAt: number;
}): Promise<void> {
  const result = await input.harness.authority.decide({
    catalog: {
      status: "accepted",
      programId: input.programId,
      expectedRepositoryRevision: input.repositoryRevision,
      expectedProposal: {
        proposalId: input.proposalId,
        programRevision: input.programRevision,
      },
      commitId: `commit.${input.programId}.accept.${String(input.programRevision)}`,
      updatedAt: input.updatedAt,
    },
    transcript: appendV1({
      processId: input.processId,
      processRevision: input.processRevision,
      frontier: input.transcriptFrontier,
      sequence: input.sequence,
      text: `Accept revision ${String(input.programRevision)}.`,
      commitId: `commit.${input.processId}.accept.${String(input.programRevision)}`,
      updatedAt: input.updatedAt,
    }),
  });
  if (result.kind !== "committed" && result.kind !== "unchanged") {
    throw new Error(`unexpected decision result ${result.kind}`);
  }
}

describe("Browser Program Workspace authority V1", () => {
  it("creates one Catalog/Process/Workspace unit without reconstructing the retired aggregate", async () => {
    const harness = await authorityHarnessV1();
    const createComposite = vi.spyOn(harness.repository, "createProgramWithProcess");
    const identity = await createProgramV1({ harness });

    const [record, continuation, process, transcript, review] = await Promise.all([
      harness.repository.load(identity.programId),
      harness.repository.loadContinuation(identity.programId),
      harness.repository.loadProcess(identity.processId),
      harness.repository.loadTranscriptPage({
        processId: identity.processId,
        beforeSequence: null,
        maximumBytes: 4_096,
      }),
      harness.authority.inspectProgramWorkspace(identity.programId, {
        hostAccess: "active_only",
      }),
    ]);

    expect(record?.head).toMatchObject({
      programId: identity.programId,
      repositoryRevision: 1,
      currentProgramRevision: 1,
      workspaceId: identity.workspaceId,
    });
    expect(continuation).toMatchObject({
      programId: identity.programId,
      workspaceId: identity.workspaceId,
      programRevision: 1,
      repositoryRevision: 1,
    });
    expect(process).toMatchObject({
      processId: identity.processId,
      subjectProgramId: identity.programId,
      transcriptFrontier: 1,
    });
    expect(transcript?.entries.map(({ entryId }) => entryId)).toEqual([
      `${identity.processId}.entry.1`,
    ]);
    expect(review).toMatchObject({
      latestAccepted: null,
      mutableHead: null,
      acceptedStatus: null,
      pendingStatus: "unavailable",
    });
    expect(harness.host.events).not.toContain("host:open");
    expect(createComposite).toHaveBeenCalledWith({
      catalog: expect.objectContaining({
        continuation: expect.objectContaining({
          workspaceId: identity.workspaceId,
          programRevision: 1,
          repositoryRevision: 1,
        }),
        reviewedHead: expect.objectContaining({ generation: 1 }),
      }),
      process: expect.objectContaining({ processId: identity.processId }),
      transcript: expect.objectContaining({ processId: identity.processId }),
    });
    await harness.authority.dispose();
  });

  it("captures a successor review head and accepts it with the same Process transaction", async () => {
    const harness = await authorityHarnessV1();
    const identity = await createProgramV1({ harness });
    const applyComposite = vi.spyOn(
      harness.repository,
      "applyProgramRevisionWithProcessTranscript",
    );
    const decideComposite = vi.spyOn(
      harness.repository,
      "decideProgramWithProcessTranscript",
    );
    const applied = await harness.authority.applyRevision({
      catalog: {
        programId: identity.programId,
        expectedRepositoryRevision: 1,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.revision.2`,
        program: programV1(identity.programId, 2),
        proposalId: `proposal.${identity.programId}.2`,
        updatedAt: 2,
      },
      transcript: appendV1({
        processId: identity.processId,
        processRevision: 2,
        frontier: 1,
        sequence: 2,
        text: "Revise the Program.",
        commitId: `commit.${identity.processId}.revision.2`,
        updatedAt: 2,
      }),
    });
    expect(applied.kind).toBe("committed");
    expect(harness.host.events).toContain("host:capture");
    expect(applyComposite).toHaveBeenCalledWith({
      catalog: expect.objectContaining({
        continuation: expect.objectContaining({
          programRevision: 1,
          repositoryRevision: 1,
        }),
        reviewedHead: expect.objectContaining({ generation: 1 }),
      }),
      transcript: expect.objectContaining({ processId: identity.processId }),
    });
    expect(applyComposite.mock.calls[0]?.[0].transcript.checkpoint).toBeNull();

    const decided = await harness.authority.decide({
      catalog: {
        status: "accepted",
        programId: identity.programId,
        expectedRepositoryRevision: 2,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.2`,
          programRevision: 2,
        },
        commitId: `commit.${identity.programId}.accept.2`,
        updatedAt: 3,
      },
      transcript: appendV1({
        processId: identity.processId,
        processRevision: 3,
        frontier: 2,
        sequence: 3,
        text: "Accept the proposal.",
        commitId: `commit.${identity.processId}.accept.2`,
        updatedAt: 3,
      }),
    });
    expect(decided.kind).toBe("committed");
    expect(harness.host.prepared).toHaveLength(1);
    expect(harness.host.adopted).toHaveLength(1);

    const review = await harness.authority.inspectProgramWorkspace(identity.programId);
    expect(review).toMatchObject({
      latestAccepted: {
        snapshotId: "snapshot.test.1",
        programRevision: 2,
      },
      pendingReview: null,
      acceptedStatus: "matches",
    });
    expect((await harness.repository.loadProcess(identity.processId))?.transcriptFrontier).toBe(3);
    expect(decideComposite).toHaveBeenCalledWith({
      catalog: expect.objectContaining({
        continuation: expect.objectContaining({
          programRevision: 2,
          repositoryRevision: 2,
        }),
        snapshotReceipt: expect.objectContaining({ snapshotId: "snapshot.test.1" }),
      }),
      transcript: expect.objectContaining({ processId: identity.processId }),
    });
    await harness.authority.dispose();
  });

  it("rebinds an Agent terminal checkpoint to the exact captured review head", async () => {
    const memory = createMemoryProgramDataV1();
    const applyComposite = vi.fn(async (
      input: Parameters<
        ProgramDataRepositoryV1["commitProgramRevisionWithProcessExecutionTerminal"]
      >[0],
    ) => ({
      kind: "conflict" as const,
      currentProgram: await memory.repository.load(input.catalog.programId),
      currentProcess: await memory.repository.loadProcess(input.transcript.processId),
      currentLease: await memory.repository.loadProcessExecutionLease(input.transcript.processId),
    }));
    const repository: ProgramDataRepositoryV1 = {
      ...memory.repository,
      commitProgramRevisionWithProcessExecutionTerminal: applyComposite,
    };
    const harness = await authorityHarnessV1(repository);
    const identity = await createProgramV1({ harness });
    const acquired = await acquireExecutionV1({ harness, ...identity });
    const terminalSequence = acquired.process.transcriptFrontier + 1;
    const terminalEntry = entryV1(
      identity.processId,
      terminalSequence,
      "Agent completed the revision.",
    );

    await harness.authority.applyAgentRevision({
      lease: acquired.lease,
      observedAt: 3,
      catalog: {
        programId: identity.programId,
        expectedRepositoryRevision: 1,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.revision.2`,
        program: programV1(identity.programId, 2),
        proposalId: `proposal.${identity.programId}.2`,
        updatedAt: 3,
      },
      transcript: {
        processId: identity.processId,
        expectedProcessRevision: acquired.process.revision,
        expectedTranscriptFrontier: acquired.process.transcriptFrontier,
        commitId: `commit.${identity.processId}.terminal.2`,
        attemptBinding: { attemptId: "attempt.test.one", generation: 1 },
        entries: [terminalEntry],
        checkpoint: {
          checkpointId: "process.checkpoint.revision.2",
          throughSequence: terminalSequence,
          workspaceId: identity.workspaceId,
          workspaceCheckpointId: "caller.workspace.checkpoint",
          workspaceGeneration: 999,
        },
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: identity.processId,
          attemptId: "attempt.test.one",
          generation: 1,
          outcome: "completed",
          terminalSequence,
          terminalEntryId: terminalEntry.entryId,
          interruptionDisposition: null,
        },
        updatedAt: 3,
      },
    });

    expect(applyComposite.mock.calls[0]?.[0].transcript.checkpoint).toEqual({
      checkpointId: "process.checkpoint.revision.2",
      throughSequence: terminalSequence,
      workspaceId: identity.workspaceId,
      workspaceCheckpointId: "checkpoint.volume.test.1.1",
      workspaceGeneration: 1,
    });
    await harness.authority.dispose();
  });

  it("queries one exact composite operation when its terminal response is lost", async () => {
    const memory = createMemoryProgramDataV1();
    let hideCommittedResponse = true;
    let operationQueries = 0;
    const repository: ProgramDataRepositoryV1 = {
      ...memory.repository,
      async commitProgramRevisionWithProcessExecutionTerminal(input) {
        const result = await memory.repository
          .commitProgramRevisionWithProcessExecutionTerminal(input);
        if (hideCommittedResponse) {
          hideCommittedResponse = false;
          throw createProgramDataRepositoryFailureV1(
            "outcome_unknown",
            "commit_program_revision_with_process_execution_terminal",
          );
        }
        return result;
      },
      async queryProcessOperation(input) {
        operationQueries += 1;
        return await memory.repository.queryProcessOperation(input);
      },
    };
    const harness = await authorityHarnessV1(repository);
    const identity = await createProgramV1({ harness });
    const acquired = await acquireExecutionV1({ harness, ...identity });
    const terminalSequence = acquired.process.transcriptFrontier + 1;
    const terminalEntry = entryV1(
      identity.processId,
      terminalSequence,
      "Agent completed the revision.",
    );

    const result = await harness.authority.applyAgentRevision({
      lease: acquired.lease,
      observedAt: 3,
      catalog: {
        programId: identity.programId,
        expectedRepositoryRevision: 1,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.revision.2`,
        program: programV1(identity.programId, 2),
        proposalId: `proposal.${identity.programId}.2`,
        updatedAt: 3,
      },
      transcript: {
        processId: identity.processId,
        expectedProcessRevision: acquired.process.revision,
        expectedTranscriptFrontier: acquired.process.transcriptFrontier,
        commitId: `commit.${identity.processId}.terminal.2`,
        attemptBinding: { attemptId: "attempt.test.one", generation: 1 },
        entries: [terminalEntry],
        checkpoint: {
          checkpointId: "process.checkpoint.revision.2",
          throughSequence: terminalSequence,
          workspaceId: identity.workspaceId,
          workspaceCheckpointId: "caller.workspace.checkpoint",
          workspaceGeneration: 999,
        },
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: identity.processId,
          attemptId: "attempt.test.one",
          generation: 1,
          outcome: "completed",
          terminalSequence,
          terminalEntryId: terminalEntry.entryId,
          interruptionDisposition: null,
        },
        updatedAt: 3,
      },
    });

    expect(result).toMatchObject({
      kind: "unchanged",
      record: { currentProgram: { revision: 2 } },
      process: {
        activeAttempt: null,
        lastTerminalAttempt: { attemptId: "attempt.test.one", outcome: "completed" },
      },
    });
    expect(operationQueries).toBe(1);
    expect(await repository.loadProcessExecutionLease(identity.processId)).toBeNull();
    await harness.authority.dispose();
  });

  it("rejects a Process checkpoint for another Workspace before touching the Host", async () => {
    const harness = await authorityHarnessV1();
    const identity = await createProgramV1({ harness });
    const applyComposite = vi.spyOn(
      harness.repository,
      "applyProgramRevisionWithProcessTranscript",
    );

    await expect(harness.authority.applyRevision({
      catalog: {
        programId: identity.programId,
        expectedRepositoryRevision: 1,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.revision.2`,
        program: programV1(identity.programId, 2),
        proposalId: `proposal.${identity.programId}.2`,
        updatedAt: 2,
      },
      transcript: appendV1({
        processId: identity.processId,
        processRevision: 2,
        frontier: 1,
        sequence: 2,
        text: "Revise the Program.",
        commitId: `commit.${identity.processId}.revision.2`,
        updatedAt: 2,
        checkpoint: {
          checkpointId: "process.checkpoint.revision.2",
          throughSequence: 2,
          workspaceId: "workspace.test.other",
          workspaceCheckpointId: "caller.workspace.checkpoint",
          workspaceGeneration: 999,
        },
      }),
    })).rejects.toMatchObject({ code: "process_checkpoint_workspace_mismatch" });
    expect(applyComposite).not.toHaveBeenCalled();
    expect(harness.host.events).not.toContain("host:capture");
    await harness.authority.dispose();
  });

  it("requires every accepted Workspace snapshot, not only the latest decision", async () => {
    const harness = await authorityHarnessV1();
    const identity = await createProgramV1({ harness });
    await acceptProposalV1({
      harness,
      ...identity,
      proposalId: `proposal.${identity.programId}.1`,
      programRevision: 1,
      repositoryRevision: 1,
      processRevision: 2,
      transcriptFrontier: 1,
      sequence: 2,
      updatedAt: 2,
    });
    const applied = await harness.authority.applyRevision({
      catalog: {
        programId: identity.programId,
        expectedRepositoryRevision: 2,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.revision.2`,
        program: programV1(identity.programId, 2),
        proposalId: `proposal.${identity.programId}.2`,
        updatedAt: 3,
      },
      transcript: appendV1({
        processId: identity.processId,
        processRevision: 3,
        frontier: 2,
        sequence: 3,
        text: "Revise the Program.",
        commitId: `commit.${identity.processId}.revision.2`,
        updatedAt: 3,
      }),
    });
    expect(applied.kind).toBe("committed");
    await acceptProposalV1({
      harness,
      ...identity,
      proposalId: `proposal.${identity.programId}.2`,
      programRevision: 2,
      repositoryRevision: 3,
      processRevision: 4,
      transcriptFrontier: 3,
      sequence: 4,
      updatedAt: 4,
    });

    const volume = [...harness.host.volumes.values()][0];
    if (volume === undefined) throw new Error("missing test volume");
    expect([...volume.retained.keys()]).toEqual(["snapshot.test.1", "snapshot.test.2"]);
    volume.retained.delete("snapshot.test.1");

    await expect(
      harness.authority.inspectProgramWorkspace(identity.programId),
    ).rejects.toMatchObject({ code: "recovery_required" });
    await harness.authority.dispose();
  });

  it("retains a failed Accept candidate so a later Reject can clear it explicitly", async () => {
    const memory = createMemoryProgramDataV1();
    let failAcceptedOnce = true;
    const repository: ProgramDataRepositoryV1 = {
      ...memory.repository,
      async decideProgramWithProcessTranscript(input) {
        if (input.catalog.status === "accepted" && failAcceptedOnce) {
          failAcceptedOnce = false;
          throw createProgramDataRepositoryFailureV1(
            "transaction_aborted",
            "decide_program_with_process_transcript",
          );
        }
        return await memory.repository.decideProgramWithProcessTranscript(input);
      },
    };
    const harness = await authorityHarnessV1(repository);
    const identity = await createProgramV1({ harness });

    await expect(acceptProposalV1({
      harness,
      ...identity,
      proposalId: `proposal.${identity.programId}.1`,
      programRevision: 1,
      repositoryRevision: 1,
      processRevision: 2,
      transcriptFrontier: 1,
      sequence: 2,
      updatedAt: 2,
    })).rejects.toMatchObject({ code: "transaction_aborted" });
    const volume = [...harness.host.volumes.values()][0];
    if (volume === undefined) throw new Error("missing test volume");
    expect(volume.candidate).not.toBeNull();

    const rejected = await harness.authority.decide({
      catalog: {
        status: "rejected",
        programId: identity.programId,
        expectedRepositoryRevision: 1,
        expectedProposal: {
          proposalId: `proposal.${identity.programId}.1`,
          programRevision: 1,
        },
        commitId: `commit.${identity.programId}.reject.1`,
        updatedAt: 3,
      },
      transcript: appendV1({
        processId: identity.processId,
        processRevision: 2,
        frontier: 1,
        sequence: 2,
        text: "Reject the proposal.",
        commitId: `commit.${identity.processId}.reject.1`,
        updatedAt: 3,
      }),
    });
    expect(rejected.kind).toBe("committed");
    expect(volume.candidate).toBeNull();
    await harness.authority.dispose();
  });

  it("admits an Agent submit only for the exact attached Workspace and current Catalog head", async () => {
    const harness = await authorityHarnessV1();
    const identity = await createProgramV1({ harness });
    const opened = await harness.authority.openWorkspace(identity);
    const access = await harness.authority.setProgramNetworkAccess({
      programId: identity.programId,
      enabled: true,
    });
    expect(access).toMatchObject({ kind: "committed", value: { enabled: true } });

    const admitted = await harness.authority.withAgentSubmitAdmission({
      programId: identity.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 1,
      expectedCheckpointId: opened.snapshot.checkpointId,
      expectedGeneration: opened.snapshot.descriptor.generation,
      operation: async (value) => value.enabled,
    });
    expect(admitted).toBe(true);

    await expect(harness.authority.withAgentSubmitAdmission({
      programId: identity.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 1,
      expectedCheckpointId: "checkpoint.other",
      expectedGeneration: opened.snapshot.descriptor.generation,
      operation: async () => true,
    })).rejects.toMatchObject({ code: "agent_submit_stale" });

    await expect(harness.authority.withAgentSubmitAdmission({
      programId: identity.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 1,
      expectedCheckpointId: opened.snapshot.checkpointId,
      expectedGeneration: opened.snapshot.descriptor.generation + 1,
      operation: async () => true,
    })).rejects.toMatchObject({ code: "agent_submit_stale" });

    await expect(harness.authority.withAgentSubmitAdmission({
      programId: identity.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 2,
      expectedCheckpointId: opened.snapshot.checkpointId,
      expectedGeneration: opened.snapshot.descriptor.generation,
      operation: async () => true,
    })).rejects.toMatchObject({ code: "agent_submit_stale" });

    await harness.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );
    await expect(harness.authority.withAgentSubmitAdmission({
      programId: identity.programId,
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      expectedProgramRevision: 1,
      expectedRepositoryRevision: 1,
      expectedCheckpointId: opened.snapshot.checkpointId,
      expectedGeneration: opened.snapshot.descriptor.generation,
      operation: async () => true,
    })).rejects.toMatchObject({ code: "workspace_mismatch" });
    await harness.authority.dispose();
  });

  it("preserves an initial Workspace candidate when the composite outcome is unknown", async () => {
    const memory = createMemoryProgramDataV1();
    const dispose = vi.fn(() => memory.repository.dispose());
    const repository: ProgramDataRepositoryV1 = {
      ...memory.repository,
      async createProgramWithProcess(input) {
        await memory.repository.createProgramWithProcess(input);
        throw createProgramDataRepositoryFailureV1(
          "outcome_unknown",
          "create_program_with_process",
        );
      },
      dispose,
    };
    const harness = await authorityHarnessV1(repository);
    const input = createProgramInputV1({
      programId: "program.test.unknown",
      workspaceId: "workspace.test.unknown",
      processId: "process.test.unknown",
    });

    await expect(harness.authority.create(input)).rejects.toMatchObject({
      code: "outcome_unknown",
      operation: "create_program_with_process",
    });
    expect(harness.host.volumes.size).toBe(1);
    expect(harness.host.discardedCandidates).toEqual([]);
    expect(await memory.repository.load(input.catalog.program.programId)).not.toBeNull();

    await harness.authority.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("does not authorize export after the live Workspace head drifts", async () => {
    const harness = await authorityHarnessV1();
    const identity = await createProgramV1({ harness });
    const opened = await harness.authority.openWorkspace(identity);
    const controller = new AbortController();
    let startFailure: unknown = null;

    const result = await harness.authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      fileName: "workspace.zip",
      signal: controller.signal,
      onReady: async (_ready, startDownload) => {
        harness.host.advanceHead();
        try {
          await startDownload();
        } catch (error) {
          startFailure = error;
        }
        return "cancel" as const;
      },
    });

    expect(result.kind).toBe("cancelled");
    expect(startFailure).toMatchObject({ code: "export_anchor_changed" });
    expect(harness.host.events).not.toContain("host:download");
    await harness.authority.dispose();
  });

  it("resets Catalog/Process before purging detached Workspaces and disposes once", async () => {
    const memory = createMemoryProgramDataV1();
    const dispose = vi.fn(() => memory.repository.dispose());
    const repository: ProgramDataRepositoryV1 = { ...memory.repository, dispose };
    const harness = await authorityHarnessV1(repository);
    const identity = await createProgramV1({ harness });
    const opened = await harness.authority.openWorkspace(identity);
    await harness.authority.detachWorkspaceEnvironment(
      opened.snapshot.descriptor.workspaceSessionId,
    );

    await expect(harness.authority.resetStoredData()).resolves.toEqual({
      productRepository: { kind: "cleared" },
      workspaceVolumes: { kind: "cleared" },
    });
    expect(await repository.load(identity.programId)).toBeNull();
    expect(await repository.loadProcess(identity.processId)).toBeNull();
    expect(harness.host.volumes.size).toBe(0);
    expect(harness.host.events.indexOf("host:close")).toBeLessThan(
      harness.host.events.indexOf("host:purge"),
    );

    await Promise.all([harness.authority.dispose(), harness.authority.dispose()]);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(harness.host.events.at(-1)).toBe("host:dispose");
  });

  it("joins an in-flight serialized operation before disposing its Repository owner", async () => {
    const memory = createMemoryProgramDataV1();
    const started = Promise.withResolvers<void>();
    const loadGate = Promise.withResolvers<void>();
    const dispose = vi.fn(() => memory.repository.dispose());
    const repository: ProgramDataRepositoryV1 = {
      ...memory.repository,
      async loadProgramNetworkAccess(programId) {
        started.resolve();
        await loadGate.promise;
        return await memory.repository.loadProgramNetworkAccess(programId);
      },
      dispose,
    };
    const harness = await authorityHarnessV1(repository);

    const pendingLoad = harness.authority.loadProgramNetworkAccess("program.test.missing");
    await started.promise;
    const pendingDispose = harness.authority.dispose();
    await Promise.resolve();
    expect(dispose).not.toHaveBeenCalled();
    expect(harness.host.events).not.toContain("host:dispose");

    loadGate.resolve();
    await expect(pendingLoad).resolves.toBeNull();
    await pendingDispose;
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(harness.host.events).toContain("host:dispose");
  });
});
