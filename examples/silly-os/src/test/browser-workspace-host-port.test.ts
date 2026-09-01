// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  BrowserWorkspaceHostControlErrorV1,
  createBrowserWorkspaceHostPagePortV1,
  type BrowserWorkspaceHostExportReadyV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostLockLeaseV1,
  BrowserWorkspaceHostLockPortV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import type { WorkspaceImmutableSnapshotReceiptV1 } from "../workspace/contracts.ts";

type WorkerListenerV1 = (event: Readonly<{ data: unknown }>) => void;
type WorkerFailureListenerV1 = (event: Event) => void;

class FakeWorkerV1 {
  readonly listeners = new Set<WorkerListenerV1>();
  readonly failureListeners = new Map<"error" | "messageerror", Set<WorkerFailureListenerV1>>([
    ["error", new Set()],
    ["messageerror", new Set()],
  ]);
  readonly methods: string[] = [];
  readonly dropMethods = new Set<string>();
  readonly throwMethods = new Set<string>();
  readonly exportPorts = new Map<string, MessagePort>();
  readonly exportInbound: unknown[] = [];
  readonly importRecords: Readonly<Record<string, unknown>>[] = [];
  readonly importTransfers: Transferable[][] = [];
  startExportPhase: "open" | "closed" = "open";
  preparedSnapshot: WorkspaceImmutableSnapshotReceiptV1 | null = null;
  retainedSnapshot: WorkspaceImmutableSnapshotReceiptV1 | null = null;
  terminated = false;

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    const request = message as {
      readonly requestId: number;
      readonly record: Readonly<Record<string, unknown>>;
    };
    const anchor = {
      revision: 1,
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      volumeId: "volume.preview.1",
      workspaceFormat: 1,
    } as const;
    const descriptor = {
      revision: 1,
      programId: anchor.programId,
      workspaceId: anchor.workspaceId,
      workspaceSessionId: "workspace-session.preview.1",
      generation: 1,
    } as const;
    const method = request.record.method;
    if (typeof method !== "string") throw new Error("expected method");
    this.methods.push(method);
    if (method === "import_file") {
      this.importRecords.push(request.record);
      this.importTransfers.push(transfer);
    }
    if (this.throwMethods.has(method)) throw new Error("synthetic post failure");
    if (this.dropMethods.has(method)) return;
    const snapshot = {
      revision: 1,
      phase: method === "start_export"
        ? this.startExportPhase
        : method === "close_workspace"
        ? "closed"
        : "open",
      volumeId: anchor.volumeId,
      checkpointId: "checkpoint.preview.1",
      descriptor,
      anchor,
    } as const;
    if (method === "prepare_snapshot") {
      this.preparedSnapshot = {
        revision: 1,
        snapshotId: request.record.snapshotId as string,
        programId: anchor.programId,
        workspaceId: anchor.workspaceId,
        volumeId: anchor.volumeId,
        workspaceFormat: 1,
        publicationId: request.record.publicationId as string,
        sourceRevision: request.record.sourceRevision as number,
        baseRevision: request.record.baseRevision as number,
        checkpointId: request.record.expectedCheckpointId as string,
        generation: request.record.expectedGeneration as number,
        fileCount: 3,
        archiveBytes: 512,
      };
    }
    const expected = request.record.expected as WorkspaceImmutableSnapshotReceiptV1 | undefined;
    const exactPrepared = this.preparedSnapshot?.snapshotId === expected?.snapshotId;
    const exactRetained = this.retainedSnapshot?.snapshotId === expected?.snapshotId;
    const adoptResult = exactPrepared ? "adopted" : "already_retained";
    const discardResult = exactPrepared ? "discarded" : exactRetained ? "retained" : "absent";
    const response = method === "inspect_storage"
      ? {
        method,
        storage: {
          revision: 1,
          scope: "sandbox_origin_advisory",
          persisted: true,
          usageBytes: 128,
          quotaBytes: 512,
        },
      }
      : method === "purge_all_workspaces"
      ? { method, result: { revision: 1, kind: "purged" } }
      : method === "create_candidate"
      ? {
        method,
        candidate: {
          revision: 1,
          anchor,
          checkpointId: "checkpoint.preview.1",
          generation: 1,
        },
      }
      : method === "discard_candidate"
      ? { method, volumeId: anchor.volumeId }
      : method === "import_file"
      ? {
        method,
        changed: true,
        snapshot: {
          ...snapshot,
          checkpointId: "checkpoint.preview.2",
          descriptor: { ...descriptor, generation: 2 },
        },
      }
      : method === "prepare_snapshot"
      ? { method, receipt: this.preparedSnapshot }
      : method === "query_snapshot_candidate"
      ? { method, receipt: this.preparedSnapshot }
      : method === "query_retained_snapshot"
      ? {
        method,
        receipt: this.retainedSnapshot?.snapshotId === expected?.snapshotId
          ? this.retainedSnapshot
          : null,
      }
      : method === "resume_snapshot_publication"
      ? { method, receipt: this.preparedSnapshot }
      : method === "adopt_snapshot"
      ? { method, result: adoptResult, snapshotId: expected?.snapshotId }
      : method === "discard_snapshot"
      ? {
        method,
        result: discardResult,
        snapshotId: expected?.snapshotId,
      }
      : method === "start_export"
      ? {
        method,
        exportId: request.record.exportId,
        snapshot,
      }
      : {
        method,
        snapshot,
      };
    if (method === "start_export") {
      const exportId = request.record.exportId;
      const port = transfer[0];
      if (typeof exportId !== "string" || !(port instanceof MessagePort)) {
        throw new Error("expected export transfer");
      }
      this.exportPorts.set(exportId, port);
      port.addEventListener("message", (event) => this.exportInbound.push(event.data));
      port.start();
    }
    if (method === "adopt_snapshot" && exactPrepared && this.preparedSnapshot !== null) {
      this.retainedSnapshot = this.preparedSnapshot;
      this.preparedSnapshot = null;
    }
    if (method === "discard_snapshot" && discardResult === "discarded") {
      this.preparedSnapshot = null;
    }
    queueMicrotask(() => {
      for (const listener of this.listeners) {
        listener({
          data: {
            revision: 1,
            kind: "control_response",
            requestId: request.requestId,
            ok: true,
            response,
          },
        });
      }
    });
  }

  addEventListener(type: "message", listener: WorkerListenerV1): void;
  addEventListener(type: "error" | "messageerror", listener: WorkerFailureListenerV1): void;
  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: WorkerListenerV1 | WorkerFailureListenerV1,
  ): void {
    if (type === "message") this.listeners.add(listener as WorkerListenerV1);
    else this.failureListeners.get(type)?.add(listener as WorkerFailureListenerV1);
  }

  removeEventListener(type: "message", listener: WorkerListenerV1): void;
  removeEventListener(type: "error" | "messageerror", listener: WorkerFailureListenerV1): void;
  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: WorkerListenerV1 | WorkerFailureListenerV1,
  ): void {
    if (type === "message") this.listeners.delete(listener as WorkerListenerV1);
    else this.failureListeners.get(type)?.delete(listener as WorkerFailureListenerV1);
  }

  terminate(): void {
    this.terminated = true;
  }

  fail(type: "error" | "messageerror"): void {
    const event = new Event(type, { cancelable: true });
    for (const listener of this.failureListeners.get(type) ?? []) listener(event);
  }

  emit(data: unknown): void {
    for (const listener of this.listeners) listener({ data });
  }

  emitExport(exportId: string, data: unknown): void {
    const port = this.exportPorts.get(exportId);
    if (port === undefined) throw new Error("expected active export port");
    port.postMessage(data);
  }
}

class FakeBootstrapLockPortV1 implements BrowserWorkspaceHostLockPortV1 {
  active = false;
  acquisitions = 0;
  releases = 0;

  async acquire(): Promise<BrowserWorkspaceHostLockLeaseV1> {
    this.active = true;
    this.acquisitions += 1;
    return {
      release: async () => {
        this.active = false;
        this.releases += 1;
      },
    };
  }
}

async function flushPagePortV1(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function expectExportInboundV1(
  worker: FakeWorkerV1,
  expected: Readonly<Record<string, unknown>>,
): Promise<void> {
  await vi.waitFor(() => {
    expect(worker.exportInbound).toContainEqual(expected);
  });
}

function exportInputV1(
  signal: AbortSignal,
  onReady: (
    ready: BrowserWorkspaceHostExportReadyV1,
    startDownload: () => Promise<void>,
  ) => "release" | "cancel" | Promise<"release" | "cancel">,
) {
  return {
    workspaceSessionId: "workspace-session.preview.1",
    expectedCheckpointId: "checkpoint.preview.1",
    expectedGeneration: 1,
    sourceRevision: 1,
    baseRevision: 1,
    fileName: "workspace-test.sillyos.zip",
    signal,
    onReady,
  } as const;
}

describe("SillyOS Browser Workspace Host page port", () => {
  it("round-trips typed storage management and distinguishes read loss from purge uncertainty", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({ transport: worker });
    await expect(port.inspectStorage()).resolves.toEqual({
      revision: 1,
      scope: "sandbox_origin_advisory",
      persisted: true,
      usageBytes: 128,
      quotaBytes: 512,
    });
    await expect(port.purgeAllWorkspaces()).resolves.toEqual({
      revision: 1,
      kind: "purged",
    });
    expect(worker.methods).toEqual(["inspect_storage", "purge_all_workspaces"]);
    port.dispose();

    const lostReadWorker = new FakeWorkerV1();
    lostReadWorker.dropMethods.add("inspect_storage");
    const lostReadPort = createBrowserWorkspaceHostPagePortV1({ transport: lostReadWorker });
    const lostRead = lostReadPort.inspectStorage();
    lostReadWorker.fail("error");
    await expect(lostRead).rejects.toMatchObject({ code: "unavailable" });

    const lostPurgeWorker = new FakeWorkerV1();
    lostPurgeWorker.dropMethods.add("purge_all_workspaces");
    const lostPurgePort = createBrowserWorkspaceHostPagePortV1({ transport: lostPurgeWorker });
    const lostPurge = lostPurgePort.purgeAllWorkspaces();
    lostPurgeWorker.fail("error");
    await expect(lostPurge).rejects.toMatchObject({ code: "outcome_unknown" });
  });

  it("holds the exact page bootstrap lease across candidate creation, external CAS work, and open", async () => {
    const worker = new FakeWorkerV1();
    const lockPort = new FakeBootstrapLockPortV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: lockPort,
    });

    await expect(
      port.createCandidate({
        programId: "program.preview.1",
        workspaceId: "workspace.preview.1",
      }),
    ).rejects.toMatchObject(
      {
        code: "candidate_mismatch",
      } satisfies Partial<BrowserWorkspaceHostControlErrorV1>,
    );

    await port.withBootstrapLease({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      operation: async () => {
        expect(lockPort.active).toBe(true);
        const candidate = await port.createCandidate({
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
        });
        expect(candidate).toMatchObject({
          checkpointId: "checkpoint.preview.1",
          generation: 1,
        });
        await Promise.resolve(); // The caller's Program Repository CAS belongs here.
        expect(lockPort.active).toBe(true);
        await expect(port.openWorkspace(candidate.anchor)).resolves.toMatchObject({
          checkpointId: "checkpoint.preview.1",
          descriptor: { generation: 1 },
        });
        expect(lockPort.active).toBe(true);
      },
    });

    expect(lockPort).toMatchObject({ active: false, acquisitions: 1, releases: 1 });
    port.dispose();
    expect(worker.terminated).toBe(true);
  });

  it("transfers an owned file payload and returns the exact imported successor", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({ transport: worker });
    const source = new Uint8Array([0, 1, 2, 255]);

    await expect(port.importFile({
      workspaceSessionId: "workspace-session.preview.1",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
      path: "imports/source.bin",
      bytes: source,
    })).resolves.toMatchObject({
      changed: true,
      snapshot: {
        checkpointId: "checkpoint.preview.2",
        descriptor: { generation: 2 },
      },
    });

    const record = worker.importRecords[0];
    const transferred = worker.importTransfers[0];
    if (record === undefined || transferred === undefined) {
      throw new Error("expected imported file transfer");
    }
    expect(record).toMatchObject({
      method: "import_file",
      path: "imports/source.bin",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
    });
    expect(record.bytes).toBeInstanceOf(Uint8Array);
    expect(record.bytes).not.toBe(source);
    expect([...source]).toEqual([0, 1, 2, 255]);
    expect(transferred).toHaveLength(1);
    expect(transferred[0]).toBe((record.bytes as Uint8Array).buffer);
    port.dispose();

    const lostWorker = new FakeWorkerV1();
    lostWorker.dropMethods.add("import_file");
    const lostPort = createBrowserWorkspaceHostPagePortV1({ transport: lostWorker });
    const lost = lostPort.importFile({
      workspaceSessionId: "workspace-session.preview.1",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
      path: "imports/source.bin",
      bytes: source,
    });
    lostWorker.fail("messageerror");
    await expect(lost).rejects.toMatchObject({ code: "outcome_unknown" });
  });

  it("bounds lost mutation outcomes and distinguishes a lost query without deleting a candidate", async () => {
    const candidateWorker = new FakeWorkerV1();
    candidateWorker.dropMethods.add("create_candidate");
    const candidatePort = createBrowserWorkspaceHostPagePortV1({
      transport: candidateWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const candidateFatals: unknown[] = [];
    candidatePort.subscribeFatal((fatal) => candidateFatals.push(fatal));
    const candidate = candidatePort.withBootstrapLease({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      operation: () =>
        candidatePort.createCandidate({
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
        }),
    });
    await Promise.resolve();
    candidateWorker.fail("error");
    await expect(candidate).rejects.toMatchObject({ code: "outcome_unknown" });
    expect(candidateFatals).toEqual([{ code: "outcome_unknown" }]);
    expect(candidateWorker.methods).toEqual(["create_candidate"]);
    expect(candidateWorker.methods).not.toContain("discard_candidate");
    expect(candidateWorker.terminated).toBe(true);

    for (
      const [method, expectedCode] of [
        ["open_workspace", "outcome_unknown"],
        ["close_workspace", "outcome_unknown"],
        ["query_workspace", "unavailable"],
      ] as const
    ) {
      const worker = new FakeWorkerV1();
      worker.dropMethods.add(method);
      const port = createBrowserWorkspaceHostPagePortV1({
        transport: worker,
        bootstrapLockPort: new FakeBootstrapLockPortV1(),
      });
      const fatals: unknown[] = [];
      port.subscribeFatal((fatal) => fatals.push(fatal));
      const pending = method === "open_workspace"
        ? port.openWorkspace({
          revision: 1,
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
          volumeId: "volume.preview.1",
          workspaceFormat: 1,
        })
        : method === "close_workspace"
        ? port.closeWorkspace("workspace-session.preview.1")
        : port.queryWorkspace("workspace-session.preview.1");
      await Promise.resolve();
      worker.fail("messageerror");
      await expect(pending).rejects.toMatchObject({ code: expectedCode });
      expect(fatals).toEqual([{ code: expectedCode }]);
      expect(worker.terminated).toBe(true);
    }
  });

  it("roundtrips the exact immutable snapshot publication lifecycle", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const receipt = await port.prepareSnapshot({
      workspaceSessionId: "workspace-session.preview.1",
      snapshotId: "snapshot.preview.1",
      publicationId: "proposal.preview.1",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
      sourceRevision: 2,
      baseRevision: 4,
    });

    expect(receipt).toEqual({
      revision: 1,
      snapshotId: "snapshot.preview.1",
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      volumeId: "volume.preview.1",
      workspaceFormat: 1,
      publicationId: "proposal.preview.1",
      sourceRevision: 2,
      baseRevision: 4,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      fileCount: 3,
      archiveBytes: 512,
    });
    await expect(
      port.querySnapshotCandidate("workspace-session.preview.1"),
    ).resolves.toEqual(receipt);
    await expect(
      port.captureStableHead("workspace-session.preview.1"),
    ).resolves.toMatchObject({
      checkpointId: receipt.checkpointId,
      descriptor: { generation: receipt.generation },
    });
    await expect(
      port.resumeSnapshotPublication({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toEqual(receipt);
    await expect(
      port.queryRetainedSnapshot({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toBeNull();
    await expect(
      port.adoptSnapshot({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toBe("adopted");
    await expect(
      port.querySnapshotCandidate("workspace-session.preview.1"),
    ).resolves.toBeNull();
    await expect(
      port.queryRetainedSnapshot({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toEqual(receipt);
    await expect(
      port.adoptSnapshot({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toBe("already_retained");
    await expect(
      port.discardSnapshot({
        workspaceSessionId: "workspace-session.preview.1",
        expected: receipt,
      }),
    ).resolves.toBe("retained");
    expect(worker.methods).toEqual([
      "prepare_snapshot",
      "query_snapshot_candidate",
      "capture_stable_head",
      "resume_snapshot_publication",
      "query_retained_snapshot",
      "adopt_snapshot",
      "query_snapshot_candidate",
      "query_retained_snapshot",
      "adopt_snapshot",
      "discard_snapshot",
    ]);
    port.dispose();
  });

  it("returns typed unpublished discard settlements", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const receipt = await port.prepareSnapshot({
      workspaceSessionId: "workspace-session.preview.1",
      snapshotId: "snapshot.discard.1",
      publicationId: "proposal.preview.1",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
      sourceRevision: 2,
      baseRevision: 4,
    });
    await expect(port.discardSnapshot({
      workspaceSessionId: "workspace-session.preview.1",
      expected: receipt,
    })).resolves.toBe("discarded");
    await expect(port.discardSnapshot({
      workspaceSessionId: "workspace-session.preview.1",
      expected: receipt,
    })).resolves.toBe("absent");
    port.dispose();
  });

  it("classifies publication mutations as unknown and all linearized reads as unavailable", async () => {
    const input = {
      workspaceSessionId: "workspace-session.preview.1",
      snapshotId: "snapshot.preview.1",
      publicationId: "proposal.preview.1",
      expectedCheckpointId: "checkpoint.preview.1",
      expectedGeneration: 1,
      sourceRevision: 2,
      baseRevision: 4,
    } as const;
    const expected = {
      revision: 1,
      snapshotId: input.snapshotId,
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      volumeId: "volume.preview.1",
      workspaceFormat: 1,
      publicationId: input.publicationId,
      sourceRevision: input.sourceRevision,
      baseRevision: input.baseRevision,
      checkpointId: input.expectedCheckpointId,
      generation: input.expectedGeneration,
      fileCount: 3,
      archiveBytes: 512,
    } as const;

    for (
      const [method, expectedCode] of [
        ["prepare_snapshot", "outcome_unknown"],
        ["resume_snapshot_publication", "outcome_unknown"],
        ["adopt_snapshot", "outcome_unknown"],
        ["discard_snapshot", "outcome_unknown"],
        ["query_snapshot_candidate", "unavailable"],
        ["query_retained_snapshot", "unavailable"],
        ["capture_stable_head", "unavailable"],
      ] as const
    ) {
      const worker = new FakeWorkerV1();
      worker.dropMethods.add(method);
      const port = createBrowserWorkspaceHostPagePortV1({
        transport: worker,
        bootstrapLockPort: new FakeBootstrapLockPortV1(),
      });
      const fatals: unknown[] = [];
      port.subscribeFatal((fatal) => fatals.push(fatal));
      const pending = method === "prepare_snapshot"
        ? port.prepareSnapshot(input)
        : method === "resume_snapshot_publication"
        ? port.resumeSnapshotPublication({
          workspaceSessionId: input.workspaceSessionId,
          expected,
        })
        : method === "adopt_snapshot"
        ? port.adoptSnapshot({ workspaceSessionId: input.workspaceSessionId, expected })
        : method === "discard_snapshot"
        ? port.discardSnapshot({ workspaceSessionId: input.workspaceSessionId, expected })
        : method === "query_snapshot_candidate"
        ? port.querySnapshotCandidate(input.workspaceSessionId)
        : method === "query_retained_snapshot"
        ? port.queryRetainedSnapshot({ workspaceSessionId: input.workspaceSessionId, expected })
        : port.captureStableHead(input.workspaceSessionId);
      await Promise.resolve();
      worker.fail("messageerror");

      await expect(pending).rejects.toMatchObject({ code: expectedCode });
      expect(fatals).toEqual([{ code: expectedCode }]);
      expect(worker.terminated).toBe(true);
    }

    const throwingWorker = new FakeWorkerV1();
    throwingWorker.throwMethods.add("capture_stable_head");
    const throwingPort = createBrowserWorkspaceHostPagePortV1({
      transport: throwingWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const fatals: unknown[] = [];
    throwingPort.subscribeFatal((fatal) => fatals.push(fatal));
    await expect(throwingPort.captureStableHead(input.workspaceSessionId)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fatals).toEqual([{ code: "unavailable" }]);
    expect(throwingWorker.terminated).toBe(true);
  });

  it("publishes one invalid-response fatal while normal disposal stays silent", () => {
    const failedWorker = new FakeWorkerV1();
    const failedPort = createBrowserWorkspaceHostPagePortV1({
      transport: failedWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const fatals: unknown[] = [];
    failedPort.subscribeFatal(() => {
      throw new Error("fatal observation must stay observational");
    });
    failedPort.subscribeFatal((fatal) => fatals.push(fatal));

    failedWorker.emit({ revision: 1, kind: "invalid" });
    failedWorker.fail("error");

    expect(fatals).toEqual([{ code: "invalid_response" }]);
    expect(failedWorker.terminated).toBe(true);

    const disposedWorker = new FakeWorkerV1();
    const disposedPort = createBrowserWorkspaceHostPagePortV1({
      transport: disposedWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const disposedFatals: unknown[] = [];
    disposedPort.subscribeFatal((fatal) => disposedFatals.push(fatal));
    disposedPort.dispose();

    expect(disposedFatals).toEqual([]);
    expect(disposedWorker.terminated).toBe(true);
  });

  it("publishes a bounded fatal when posting to the Host Worker fails", async () => {
    const worker = new FakeWorkerV1();
    worker.throwMethods.add("query_workspace");
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const fatals: unknown[] = [];
    port.subscribeFatal((fatal) => fatals.push(fatal));

    await expect(port.queryWorkspace("workspace-session.preview.1")).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(fatals).toEqual([{ code: "unavailable" }]);
    expect(worker.terminated).toBe(true);
  });

  it.each(["poison", "dispose"] as const)(
    "rejects and closes an active export when the page transport is %s-ed",
    async (settlement) => {
      const worker = new FakeWorkerV1();
      const channel = new MessageChannel();
      const closeWorkerPort = vi.spyOn(channel.port1, "close");
      const closePagePort = vi.spyOn(channel.port2, "close");
      const port = createBrowserWorkspaceHostPagePortV1({
        transport: worker,
        bootstrapLockPort: new FakeBootstrapLockPortV1(),
        createMessageChannel: () => channel,
        createExportId: () => `export.${settlement}`,
      });
      const pendingExport = port.exportWorkspace(
        exportInputV1(new AbortController().signal, () => "release"),
      );
      await flushPagePortV1();

      if (settlement === "poison") worker.fail("error");
      else port.dispose();

      await expect(pendingExport).rejects.toMatchObject({
        code: settlement === "poison" ? "unavailable" : "disposed",
      });
      expect(closeWorkerPort).toHaveBeenCalledOnce();
      expect(closePagePort).toHaveBeenCalledOnce();
      expect(worker.terminated).toBe(true);
    },
  );

  it("does not let an unreturned ready callback authorize a released terminal", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.pending-ready",
    });
    let readyCalls = 0;
    const pendingExport = port.exportWorkspace(
      exportInputV1(
        new AbortController().signal,
        () => {
          readyCalls += 1;
          return new Promise<"release" | "cancel">(() => {});
        },
      ),
    );
    await flushPagePortV1();
    worker.emitExport("export.pending-ready", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.pending-ready",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });
    await flushPagePortV1();
    expect(readyCalls).toBe(1);
    worker.emitExport("export.pending-ready", {
      revision: 1,
      kind: "workspace_export_released",
      exportId: "export.pending-ready",
      sequence: 2,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });

    await expect(pendingExport).rejects.toMatchObject({ code: "invalid_response" });
    expect(worker.terminated).toBe(true);
  });

  it("cancels instead of releasing when the consumer aborts during an async ready callback", async () => {
    const worker = new FakeWorkerV1();
    const controller = new AbortController();
    let resolveReady = (_decision: "release" | "cancel") => {};
    const readyDecision = new Promise<"release" | "cancel">((resolve) => {
      resolveReady = resolve;
    });
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.aborted-ready",
    });
    const pendingExport = port.exportWorkspace(
      exportInputV1(controller.signal, () => readyDecision),
    );
    await flushPagePortV1();
    worker.emitExport("export.aborted-ready", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.aborted-ready",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 256,
      bytesTotal: 256,
    });
    await flushPagePortV1();
    controller.abort(new DOMException("cancelled by test", "AbortError"));
    resolveReady("release");
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.aborted-ready",
    });
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.aborted-ready",
    });
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.aborted-ready",
    });
    worker.emitExport("export.aborted-ready", {
      revision: 1,
      kind: "workspace_export_failed",
      exportId: "export.aborted-ready",
      sequence: 2,
      code: "cancelled",
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 256,
      bytesTotal: 256,
    });
    await expect(pendingExport).resolves.toMatchObject({ kind: "cancelled" });
    port.dispose();
  });

  it("does not authorize a download when the ready consumer returns release without starting it", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.unstarted-release",
    });
    const pendingExport = port.exportWorkspace(
      exportInputV1(new AbortController().signal, () => "release"),
    );
    await flushPagePortV1();
    worker.emitExport("export.unstarted-release", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.unstarted-release",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 64,
      bytesTotal: 64,
    });
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.unstarted-release",
    });
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.unstarted-release",
    });
    worker.emitExport("export.unstarted-release", {
      revision: 1,
      kind: "workspace_export_failed",
      exportId: "export.unstarted-release",
      sequence: 2,
      code: "cancelled",
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 64,
      bytesTotal: 64,
    });
    await expect(pendingExport).resolves.toMatchObject({ kind: "cancelled" });
    port.dispose();
  });

  it("cancels without authorization when the ready consumer throws", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.consumer-throw",
    });
    const pendingExport = port.exportWorkspace(
      exportInputV1(new AbortController().signal, () => {
        throw new Error("synthetic ready consumer failure");
      }),
    );
    await flushPagePortV1();
    worker.emitExport("export.consumer-throw", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.consumer-throw",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 64,
      bytesTotal: 64,
    });
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.consumer-throw",
    });
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.consumer-throw",
    });
    worker.emitExport("export.consumer-throw", {
      revision: 1,
      kind: "workspace_export_failed",
      exportId: "export.consumer-throw",
      sequence: 2,
      code: "cancelled",
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 64,
      bytesTotal: 64,
    });
    await expect(pendingExport).rejects.toThrow("synthetic ready consumer failure");
    port.dispose();
  });

  it("keeps a started browser handoff releasable when its signal aborts during the grace", async () => {
    const worker = new FakeWorkerV1();
    const controller = new AbortController();
    let finishHandoff = () => {};
    const handoff = new Promise<void>((resolve) => {
      finishHandoff = resolve;
    });
    let committed = () => {};
    const commitObserved = new Promise<void>((resolve) => {
      committed = resolve;
    });
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.committed-ready",
    });
    const pendingExport = port.exportWorkspace(
      exportInputV1(controller.signal, async (_ready, startDownload) => {
        await startDownload();
        committed();
        await handoff;
        return "release" as const;
      }),
    );
    await flushPagePortV1();
    worker.emitExport("export.committed-ready", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.committed-ready",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 256,
      bytesTotal: 256,
    });
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.committed-ready",
    });
    worker.emitExport("export.committed-ready", {
      revision: 1,
      kind: "workspace_export_download_started",
      exportId: "export.committed-ready",
      sequence: 2,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 256,
      bytesTotal: 256,
    });
    await commitObserved;
    controller.abort(new DOMException("route closed after download click", "AbortError"));
    await flushPagePortV1();
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.committed-ready",
    });
    finishHandoff();
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.committed-ready",
    });
    worker.emitExport("export.committed-ready", {
      revision: 1,
      kind: "workspace_export_released",
      exportId: "export.committed-ready",
      sequence: 3,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 256,
      bytesTotal: 256,
    });
    await expect(pendingExport).resolves.toMatchObject({ kind: "released" });
    port.dispose();
  });

  it("accepts a released terminal only after the ready callback explicitly releases it", async () => {
    const worker = new FakeWorkerV1();
    const port = createBrowserWorkspaceHostPagePortV1({
      transport: worker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.released",
    });
    const pendingExport = port.exportWorkspace(
      exportInputV1(new AbortController().signal, async (_ready, startDownload) => {
        await startDownload();
        return "release" as const;
      }),
    );
    await flushPagePortV1();
    worker.emitExport("export.released", {
      revision: 1,
      kind: "workspace_export_ready",
      exportId: "export.released",
      sequence: 1,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 2,
      filesTotal: 2,
      bytesWritten: 512,
      bytesTotal: 512,
    });
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.released",
    });
    expect(worker.exportInbound).not.toContainEqual({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.released",
    });
    worker.emitExport("export.released", {
      revision: 1,
      kind: "workspace_export_download_started",
      exportId: "export.released",
      sequence: 2,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 2,
      filesTotal: 2,
      bytesWritten: 512,
      bytesTotal: 512,
    });
    await flushPagePortV1();
    await expectExportInboundV1(worker, {
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.released",
    });
    worker.emitExport("export.released", {
      revision: 1,
      kind: "workspace_export_released",
      exportId: "export.released",
      sequence: 3,
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 2,
      filesTotal: 2,
      bytesWritten: 512,
      bytesTotal: 512,
    });
    await expect(pendingExport).resolves.toEqual({
      kind: "released",
      checkpointId: "checkpoint.preview.1",
      generation: 1,
      filesCompleted: 2,
      filesTotal: 2,
      bytesWritten: 512,
      bytesTotal: 512,
    });
    port.dispose();
  });

  it("keeps zero export totals immutable and requires an open start snapshot", async () => {
    const mutableWorker = new FakeWorkerV1();
    const mutablePort = createBrowserWorkspaceHostPagePortV1({
      transport: mutableWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.mutable-zero",
    });
    const mutableExport = mutablePort.exportWorkspace(
      exportInputV1(new AbortController().signal, () => "release"),
    );
    await flushPagePortV1();
    mutableWorker.emitExport("export.mutable-zero", {
      revision: 1,
      kind: "workspace_export_progress",
      exportId: "export.mutable-zero",
      sequence: 1,
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });
    mutableWorker.emitExport("export.mutable-zero", {
      revision: 1,
      kind: "workspace_export_progress",
      exportId: "export.mutable-zero",
      sequence: 2,
      filesCompleted: 0,
      filesTotal: 1,
      bytesWritten: 0,
      bytesTotal: 1,
    });
    await expect(mutableExport).rejects.toMatchObject({ code: "invalid_response" });

    const closedWorker = new FakeWorkerV1();
    closedWorker.startExportPhase = "closed";
    const closedPort = createBrowserWorkspaceHostPagePortV1({
      transport: closedWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
      createExportId: () => "export.closed",
    });
    await expect(
      closedPort.exportWorkspace(
        exportInputV1(new AbortController().signal, () => "release"),
      ),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(closedWorker.terminated).toBe(true);
  });
});
