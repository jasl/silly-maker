// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserProgramWorkspaceAuthorityV1,
} from "../product/browser-program-workspace-authority.ts";
import {
  createMemoryProgramRepositoryBackingV2,
  createMemoryProgramRepositoryV2,
} from "../product/memory-program-repository.ts";
import {
  createProgramRepositoryFailureV2,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "../product/program-repository.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import type {
  BrowserWorkspaceHostFatalV1,
  BrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";

interface FakeHostBackingV1 {
  readonly volumes: Map<string, BrowserWorkspaceVolumeAnchorWireV1>;
  nextVolume: number;
  nextSession: number;
}

function fakeHostBackingV1(): FakeHostBackingV1 {
  return { volumes: new Map(), nextVolume: 1, nextSession: 1 };
}

function fakeHostV1(
  backing: FakeHostBackingV1,
  beforeExportReady?: () => void | Promise<void>,
  beforeQuery?: () => void | Promise<void>,
): BrowserWorkspaceHostPagePortV1 & {
  readonly created: string[];
  readonly discarded: string[];
  fail(fatal: BrowserWorkspaceHostFatalV1): void;
} {
  const created: string[] = [];
  const discarded: string[] = [];
  const sessions = new Map<string, BrowserWorkspaceHostSnapshotWireV1>();
  const channels = new Map<string, MessageChannel>();
  const fatalListeners = new Set<(fatal: BrowserWorkspaceHostFatalV1) => void>();
  return {
    created,
    discarded,
    withBootstrapLease: ({ operation }) => operation(),
    async createCandidate(input) {
      const volumeId = `sillyos.volume.test.${String(backing.nextVolume++)}`;
      const anchor: BrowserWorkspaceVolumeAnchorWireV1 = {
        revision: 1,
        ...input,
        volumeId,
        workspaceFormat: 1,
      };
      backing.volumes.set(volumeId, anchor);
      created.push(volumeId);
      return anchor;
    },
    async discardCandidate(volumeId) {
      backing.volumes.delete(volumeId);
      discarded.push(volumeId);
    },
    async openWorkspace(anchor) {
      expect(backing.volumes.get(anchor.volumeId)).toEqual(anchor);
      const workspaceSessionId = `sillyos.workspace.session.${String(backing.nextSession++)}`;
      const snapshot: BrowserWorkspaceHostSnapshotWireV1 = {
        revision: 1,
        phase: "open",
        volumeId: anchor.volumeId,
        checkpointId: `sillyos.checkpoint.${anchor.volumeId}`,
        descriptor: {
          revision: 1,
          programId: anchor.programId,
          workspaceId: anchor.workspaceId,
          workspaceSessionId,
          generation: 1,
        },
        anchor,
      };
      sessions.set(workspaceSessionId, snapshot);
      return snapshot;
    },
    async queryWorkspace(workspaceSessionId) {
      await beforeQuery?.();
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw new Error("workspace mismatch");
      return snapshot;
    },
    async attachEnvironment({ workspaceSessionId }) {
      const snapshot = sessions.get(workspaceSessionId);
      if (snapshot === undefined) throw new Error("workspace mismatch");
      const channel = new MessageChannel();
      channels.set(workspaceSessionId, channel);
      return { snapshot, environmentPort: channel.port2 };
    },
    async exportWorkspace(input) {
      const snapshot = sessions.get(input.workspaceSessionId);
      if (snapshot === undefined) throw new Error("workspace mismatch");
      const progress = {
        filesCompleted: 1,
        filesTotal: 1,
        bytesWritten: 128,
        bytesTotal: 128,
      };
      input.onProgress?.(progress);
      await beforeExportReady?.();
      const decision = await input.onReady({
        ...progress,
        downloadUrl: "blob:sillyos-authority-test",
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
    async closeWorkspace(workspaceSessionId) {
      const current = sessions.get(workspaceSessionId);
      if (current === undefined) throw new Error("workspace mismatch");
      const snapshot = { ...current, phase: "closed" as const };
      sessions.set(workspaceSessionId, snapshot);
      const channel = channels.get(workspaceSessionId);
      channel?.port1.close();
      channel?.port2.close();
      channels.delete(workspaceSessionId);
      return snapshot;
    },
    subscribeFatal(listener) {
      fatalListeners.add(listener);
      return () => fatalListeners.delete(listener);
    },
    fail(fatal) {
      for (const listener of [...fatalListeners]) listener(fatal);
    },
    dispose() {
      for (const channel of channels.values()) {
        channel.port1.close();
        channel.port2.close();
      }
      channels.clear();
      fatalListeners.clear();
    },
  };
}

async function seedProgramV1(repository: ProgramRepositoryWithWorkspaceContinuationV1): Promise<{
  readonly programId: string;
  readonly workspaceId: string;
}> {
  const workspaceId = "workspace.authority.test";
  const session = createCreatorSessionV1({
    creator: createDeterministicFakeCreatorV1(),
    createWorkspaceId: () => workspaceId,
  });
  const submitted = session.submitIntent("Build a durable Browser workspace.");
  if (submitted.kind !== "created") throw new Error("expected Program creation");
  const programId = session.getSnapshot().program?.programId;
  if (programId === undefined) throw new Error("expected Program identity");
  await repository.initialize();
  const created = await repository.create({ snapshot: session.getSnapshot(), updatedAt: 1 });
  if (created.kind !== "committed") throw new Error("expected Program commit");
  return { programId, workspaceId };
}

describe("Browser Program workspace authority", () => {
  it("publishes one manifest and reopens its exact volume under a fresh session", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV2();
    const hostBacking = fakeHostBackingV1();
    const firstRepository = createMemoryProgramRepositoryV2({ backing: repositoryBacking });
    const identity = await seedProgramV1(firstRepository);
    const firstHost = fakeHostV1(hostBacking);
    const first = createBrowserProgramWorkspaceAuthorityV1({
      repository: firstRepository,
      createRepository: () => createMemoryProgramRepositoryV2({ backing: repositoryBacking }),
      host: firstHost,
    });

    const opened = await first.openWorkspace(identity);
    const firstSessionId = opened.snapshot.descriptor.workspaceSessionId;
    expect(firstHost.created).toHaveLength(1);
    await first.closeWorkspace(firstSessionId);
    await first.dispose();

    const secondRepository = createMemoryProgramRepositoryV2({ backing: repositoryBacking });
    const secondHost = fakeHostV1(hostBacking);
    const second = createBrowserProgramWorkspaceAuthorityV1({
      repository: secondRepository,
      createRepository: () => createMemoryProgramRepositoryV2({ backing: repositoryBacking }),
      host: secondHost,
    });
    const reopened = await second.openWorkspace(identity);

    expect(reopened.snapshot.volumeId).toBe(opened.snapshot.volumeId);
    expect(reopened.snapshot.descriptor.workspaceSessionId).not.toBe(firstSessionId);
    expect(reopened.snapshot.descriptor.generation).toBe(1);
    expect(secondHost.created).toEqual([]);
    await second.dispose();
  });

  it("reconciles a committed insert through a fresh repository before retaining its candidate", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV2();
    const hostBacking = fakeHostBackingV1();
    const delegate = createMemoryProgramRepositoryV2({ backing: repositoryBacking });
    const identity = await seedProgramV1(delegate);
    let loseFirstInsertResponse = true;
    const lossy: ProgramRepositoryWithWorkspaceContinuationV1 = {
      ...delegate,
      async insertWorkspaceContinuation(continuation) {
        const settled = await delegate.insertWorkspaceContinuation(continuation);
        if (loseFirstInsertResponse) {
          loseFirstInsertResponse = false;
          throw createProgramRepositoryFailureV2(
            "outcome_unknown",
            "insert_workspace_continuation",
          );
        }
        return settled;
      },
    };
    let replacementCount = 0;
    const host = fakeHostV1(hostBacking);
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository: lossy,
      createRepository: () => {
        replacementCount += 1;
        return createMemoryProgramRepositoryV2({ backing: repositoryBacking });
      },
      host,
    });

    const opened = await authority.openWorkspace(identity);
    expect(replacementCount).toBe(1);
    expect(host.discarded).toEqual([]);
    expect(hostBacking.volumes.has(opened.snapshot.volumeId)).toBe(true);
    await authority.dispose();
  });

  it("fences the active session and forwards one Host fatal without reporting normal disposal", async () => {
    const repositoryBacking = createMemoryProgramRepositoryBackingV2();
    const repository = createMemoryProgramRepositoryV2({ backing: repositoryBacking });
    const identity = await seedProgramV1(repository);
    const host = fakeHostV1(fakeHostBackingV1());
    const authority = createBrowserProgramWorkspaceAuthorityV1({ repository, host });
    const fatals: unknown[] = [];
    authority.subscribeFatal(() => {
      throw new Error("fatal observation must remain observational");
    });
    authority.subscribeFatal((fatal) => fatals.push(fatal));
    const opened = await authority.openWorkspace(identity);

    host.fail({ code: "outcome_unknown" });

    expect(fatals).toEqual([{ code: "outcome_unknown" }]);
    await expect(authority.queryWorkspace(opened.snapshot.descriptor.workspaceSessionId)).rejects
      .toThrow("sillyos.browser_program_workspace.workspace_mismatch");
    await expect(authority.closeWorkspace(opened.snapshot.descriptor.workspaceSessionId)).rejects
      .toThrow("sillyos.browser_program_workspace.workspace_mismatch");
    await authority.dispose();
    expect(fatals).toEqual([{ code: "outcome_unknown" }]);
  });

  it("exports only the exact durable head and matching Program continuation", async () => {
    const repository = createMemoryProgramRepositoryV2();
    const identity = await seedProgramV1(repository);
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host: fakeHostV1(fakeHostBackingV1()),
    });
    const opened = await authority.openWorkspace(identity);
    const progress: unknown[] = [];

    const result = await authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      signal: new AbortController().signal,
      onProgress: (value) => progress.push(value),
      onReady: (ready) => {
        expect(ready).toMatchObject({
          checkpointId: opened.snapshot.checkpointId,
          generation: opened.snapshot.descriptor.generation,
        });
        return "release";
      },
    });

    expect(result).toMatchObject({
      kind: "released",
      checkpointId: opened.snapshot.checkpointId,
      generation: opened.snapshot.descriptor.generation,
    });
    expect(progress).toHaveLength(1);
    await authority.dispose();
  });

  it("suppresses ready consumption when the continuation drifts after archive creation", async () => {
    const delegate = createMemoryProgramRepositoryV2();
    const identity = await seedProgramV1(delegate);
    let drift = false;
    const repository: ProgramRepositoryWithWorkspaceContinuationV1 = {
      ...delegate,
      async loadWorkspaceContinuation(programId) {
        const current = await delegate.loadWorkspaceContinuation(programId);
        return drift && current !== null
          ? { ...current, repositoryRevision: current.repositoryRevision + 1 }
          : current;
      },
    };
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host: fakeHostV1(fakeHostBackingV1(), () => {
        drift = true;
      }),
    });
    const opened = await authority.openWorkspace(identity);
    let downloadConsumed = false;

    await expect(authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      signal: new AbortController().signal,
      onReady: () => {
        downloadConsumed = true;
        return "release";
      },
    })).rejects.toThrow("sillyos.browser_program_workspace.export_anchor_changed");
    expect(downloadConsumed).toBe(false);
    await authority.dispose();
  });

  it("suppresses ready consumption when export aborts during the final continuation recheck", async () => {
    const delegate = createMemoryProgramRepositoryV2();
    const identity = await seedProgramV1(delegate);
    let deferContinuation = false;
    let continuationReadStarted = () => {};
    const readStarted = new Promise<void>((resolve) => {
      continuationReadStarted = resolve;
    });
    let resumeContinuation = () => {};
    const continuationGate = new Promise<void>((resolve) => {
      resumeContinuation = resolve;
    });
    const repository: ProgramRepositoryWithWorkspaceContinuationV1 = {
      ...delegate,
      async loadWorkspaceContinuation(programId) {
        if (deferContinuation) {
          continuationReadStarted();
          await continuationGate;
        }
        return await delegate.loadWorkspaceContinuation(programId);
      },
    };
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host: fakeHostV1(fakeHostBackingV1(), () => {
        deferContinuation = true;
      }),
    });
    const opened = await authority.openWorkspace(identity);
    const controller = new AbortController();
    let downloadConsumed = false;
    const operation = authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      signal: controller.signal,
      onReady: () => {
        downloadConsumed = true;
        return "release";
      },
    });

    await readStarted;
    controller.abort(new DOMException("cancelled by test", "AbortError"));
    resumeContinuation();
    await expect(operation).resolves.toMatchObject({ kind: "cancelled" });
    expect(downloadConsumed).toBe(false);
    await authority.dispose();
  });

  it("returns a zero-progress cancellation when export aborts during initial Host preflight", async () => {
    const repository = createMemoryProgramRepositoryV2();
    const identity = await seedProgramV1(repository);
    let queryStarted = () => {};
    const started = new Promise<void>((resolve) => {
      queryStarted = resolve;
    });
    let resumeQuery = () => {};
    const queryGate = new Promise<void>((resolve) => {
      resumeQuery = resolve;
    });
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host: fakeHostV1(fakeHostBackingV1(), undefined, async () => {
        queryStarted();
        await queryGate;
      }),
    });
    const opened = await authority.openWorkspace(identity);
    const controller = new AbortController();
    let downloadConsumed = false;
    const operation = authority.exportWorkspace({
      workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      signal: controller.signal,
      onReady: () => {
        downloadConsumed = true;
        return "release";
      },
    });

    await started;
    controller.abort(new DOMException("cancelled by test", "AbortError"));
    resumeQuery();
    await expect(operation).resolves.toEqual({
      kind: "cancelled",
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });
    expect(downloadConsumed).toBe(false);
    await authority.dispose();
  });
});
