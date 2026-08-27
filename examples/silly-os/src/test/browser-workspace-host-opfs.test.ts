// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceHostOpfsBootstrapV1,
  type BrowserWorkspaceHostExclusiveLeaseV1,
  type BrowserWorkspaceHostExclusiveLockPortV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import type {
  BrowserWorkspaceHostDurableHeadV1,
  BrowserWorkspaceHostReplaceFileInputV1,
  BrowserWorkspaceHostVolumeLeasePortV1,
} from "../workspace/browser-workspace-host-runtime.ts";

type FakeEntryV1 = FakeDirectoryV1 | FakeFileV1;
type FakeCloseFailureV1 = "before_commit" | "after_commit" | "corrupt_then_fail" | "quota";

class FakeFaultsV1 {
  readonly closeFailures = new Map<string, FakeCloseFailureV1>();
  readonly removeFailures = new Set<string>();
  afterRemove: ((name: string) => void) | null = null;
}

class FakeFileV1 {
  bytes = new Uint8Array();

  constructor(readonly name: string, private readonly faults: FakeFaultsV1) {}

  handle(): FileSystemFileHandle {
    return {
      kind: "file",
      name: this.name,
      isSameEntry: async () => false,
      getFile: async () => new File([this.bytes], this.name),
      createWritable: async () => {
        let next = new Uint8Array();
        return {
          write: async (value: FileSystemWriteChunkType) => {
            if (typeof value === "string") next = new TextEncoder().encode(value);
            else if (value instanceof ArrayBuffer) next = new Uint8Array(value.slice(0));
            else if (ArrayBuffer.isView(value)) {
              next = new Uint8Array(
                value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
              );
            } else throw new Error("unsupported fake write chunk");
          },
          close: async () => {
            const failure = this.faults.closeFailures.get(this.name);
            this.faults.closeFailures.delete(this.name);
            if (failure === "quota") {
              throw new DOMException(`injected ${this.name} quota failure`, "QuotaExceededError");
            }
            if (failure === "before_commit") throw new Error(`injected ${this.name} close failure`);
            if (failure === "corrupt_then_fail") {
              this.bytes = new TextEncoder().encode("{corrupt");
              throw new Error(`injected ${this.name} corrupt close failure`);
            }
            this.bytes = next;
            if (failure === "after_commit") throw new Error(`injected ${this.name} close failure`);
          },
          abort: async () => {},
        } as unknown as FileSystemWritableFileStream;
      },
    } as unknown as FileSystemFileHandle;
  }

  clone(faults: FakeFaultsV1): FakeFileV1 {
    const clone = new FakeFileV1(this.name, faults);
    clone.bytes = this.bytes.slice();
    return clone;
  }
}

class FakeDirectoryV1 {
  readonly entries = new Map<string, FakeEntryV1>();
  readonly faults: FakeFaultsV1;

  constructor(readonly name: string, faults = new FakeFaultsV1()) {
    this.faults = faults;
  }

  async getDirectoryHandle(
    name: string,
    options?: FileSystemGetDirectoryOptions,
  ): Promise<FileSystemDirectoryHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeDirectoryV1) return existing.handle();
    if (existing !== undefined) throw new DOMException("not a directory", "TypeMismatchError");
    if (!options?.create) throw new DOMException("missing directory", "NotFoundError");
    const directory = new FakeDirectoryV1(name, this.faults);
    this.entries.set(name, directory);
    return directory.handle();
  }

  async getFileHandle(
    name: string,
    options?: FileSystemGetFileOptions,
  ): Promise<FileSystemFileHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeFileV1) return existing.handle();
    if (existing !== undefined) throw new DOMException("not a file", "TypeMismatchError");
    if (!options?.create) throw new DOMException("missing file", "NotFoundError");
    const file = new FakeFileV1(name, this.faults);
    this.entries.set(name, file);
    return file.handle();
  }

  async removeEntry(name: string): Promise<void> {
    if (this.faults.removeFailures.delete(name)) {
      throw new Error(`injected ${name} remove failure`);
    }
    if (!this.entries.delete(name)) throw new DOMException("missing entry", "NotFoundError");
    this.faults.afterRemove?.(name);
  }

  clone(faults = new FakeFaultsV1()): FakeDirectoryV1 {
    const clone = new FakeDirectoryV1(this.name, faults);
    for (const [name, entry] of this.entries) {
      clone.entries.set(name, entry.clone(faults));
    }
    return clone;
  }

  handle(): FileSystemDirectoryHandle {
    return {
      kind: "directory",
      name: this.name,
      isSameEntry: async () => false,
      getDirectoryHandle: this.getDirectoryHandle.bind(this),
      getFileHandle: this.getFileHandle.bind(this),
      removeEntry: this.removeEntry.bind(this),
    } as unknown as FileSystemDirectoryHandle;
  }
}

class FakeLockPortV1 implements BrowserWorkspaceHostExclusiveLockPortV1 {
  private readonly held = new Set<string>();

  async acquire(
    name: string,
    _options: { readonly ifAvailable: boolean },
  ): Promise<BrowserWorkspaceHostExclusiveLeaseV1 | null> {
    if (this.held.has(name)) return null;
    this.held.add(name);
    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        this.held.delete(name);
      },
    };
  }
}

async function fakeDirectoryV1(
  root: FakeDirectoryV1,
  path: readonly string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root.handle();
  for (const part of path) current = await current.getDirectoryHandle(part);
  return current;
}

function fakeDirectoryNodeV1(
  root: FakeDirectoryV1,
  path: readonly string[],
): FakeDirectoryV1 {
  let current = root;
  for (const part of path) {
    const next = current.entries.get(part);
    if (!(next instanceof FakeDirectoryV1)) throw new Error(`missing fake directory ${part}`);
    current = next;
  }
  return current;
}

async function putBytesV1(
  directory: FileSystemDirectoryHandle,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  const writable = await (await directory.getFileHandle(name, { create: true })).createWritable();
  const owned = new Uint8Array(bytes.byteLength);
  owned.set(bytes);
  await writable.write(owned.buffer);
  await writable.close();
}

function replaceInputV1(
  head: BrowserWorkspaceHostDurableHeadV1,
  bytes: Uint8Array,
  nextCheckpointId: string,
): BrowserWorkspaceHostReplaceFileInputV1 {
  return {
    path: "program.md",
    bytes,
    expectedHead: head,
    nextCheckpointId,
    signal: new AbortController().signal,
  };
}

async function openedOpfsV1(volumeId: string): Promise<{
  readonly root: FakeDirectoryV1;
  readonly bootstrap: ReturnType<typeof createBrowserWorkspaceHostOpfsBootstrapV1>;
  readonly lease: BrowserWorkspaceHostVolumeLeasePortV1;
}> {
  const root = new FakeDirectoryV1("root");
  const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
    getRootDirectory: async () => root.handle(),
    lockPort: new FakeLockPortV1(),
    createVolumeId: () => volumeId,
    createInitialCheckpointId: () => `checkpoint.${volumeId}`,
  });
  const anchor = await bootstrap.createCandidate({
    programId: "program.preview.1",
    workspaceId: "workspace.preview.1",
  });
  return { root, bootstrap, lease: await bootstrap.openVolume(anchor) };
}

describe("SillyOS Browser Workspace OPFS bootstrap", () => {
  it("recognizes directory leaves, overwrites existing files, and retains the exact head on same-byte cold reopen", async () => {
    const root = new FakeDirectoryV1("root");
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.preview.1",
      createInitialCheckpointId: () => "checkpoint.1",
    });
    const anchor = await bootstrap.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    const workspace = await fakeDirectoryV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "workspace",
    ]);
    await workspace.getDirectoryHandle("assets", { create: true });
    await putBytesV1(workspace, "program.md", new TextEncoder().encode("old"));
    await putBytesV1(workspace, "large.bin", new Uint8Array(16 * 1024 * 1024));

    const lease = await bootstrap.openVolume(anchor);
    await expect(lease.stat("assets")).resolves.toEqual({ kind: "directory", size: 0 });
    const initialHead = await lease.readHead();
    const changed = await lease.replaceFile(
      replaceInputV1(initialHead, new TextEncoder().encode("new"), "checkpoint.2"),
    );
    expect(changed).toEqual({
      changed: true,
      head: { ...initialHead, checkpointId: "checkpoint.2", generation: 2 },
    });
    const unchanged = await lease.replaceFile(
      replaceInputV1(changed.head, new TextEncoder().encode("new"), "checkpoint.3"),
    );
    expect(unchanged).toEqual({ changed: false, head: changed.head });
    await lease.close();

    const reopened = await bootstrap.openVolume(anchor) as BrowserWorkspaceHostVolumeLeasePortV1;
    expect(await reopened.readHead()).toEqual(changed.head);
    expect(await reopened.readFile("program.md")).toEqual(new TextEncoder().encode("new"));
    await expect(reopened.stat("large.bin")).resolves.toEqual({
      kind: "file",
      size: 16 * 1024 * 1024,
    });
    await reopened.close();
    await bootstrap.dispose();
  });

  it("reuses one stable opaque candidate after Worker loss and clears its durable marker only on open", async () => {
    const root = new FakeDirectoryV1("root");
    const first = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createInitialCheckpointId: () => "checkpoint.stable.1",
    });
    const input = {
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    };
    const firstAnchor = await first.createCandidate(input);
    expect(firstAnchor.volumeId).toMatch(/^sillyos\.volume\.[a-f0-9]{64}$/u);
    await first.dispose();

    const second = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createInitialCheckpointId: () => "checkpoint.must-not-replace.1",
    });
    const resumedAnchor = await second.createCandidate(input);
    expect(resumedAnchor).toEqual(firstAnchor);
    const volumesNode = fakeDirectoryNodeV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
    ]);
    expect(volumesNode.entries.size).toBe(1);
    const volume = await fakeDirectoryV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      firstAnchor.volumeId,
    ]);
    const marker = await (await volume.getFileHandle("candidate.json")).getFile();
    expect(JSON.parse(await marker.text())).toEqual(firstAnchor);

    const lease = await second.openVolume(resumedAnchor);
    await expect(lease.readHead()).resolves.toEqual({
      revision: 1,
      volumeId: firstAnchor.volumeId,
      workspaceFormat: 1,
      checkpointId: "checkpoint.stable.1",
      generation: 1,
    });
    await expect(volume.getFileHandle("candidate.json")).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await lease.close();

    const other = await second.createCandidate({
      ...input,
      workspaceId: "workspace.preview.2",
    });
    expect(other.volumeId).not.toBe(firstAnchor.volumeId);
    expect(volumesNode.entries.size).toBe(2);
    await second.discardCandidate(other.volumeId);
    await second.dispose();
  });

  it("maps unavailable OPFS states once and reports quota exhaustion as capacity exceeded", async () => {
    for (
      const name of [
        "SecurityError",
        "UnknownError",
        "NotAllowedError",
        "InvalidStateError",
        "NotSupportedError",
      ]
    ) {
      let rootRequests = 0;
      const unavailable = createBrowserWorkspaceHostOpfsBootstrapV1({
        getRootDirectory: () => {
          rootRequests += 1;
          return Promise.reject(new DOMException(`injected ${name}`, name));
        },
        lockPort: new FakeLockPortV1(),
        createVolumeId: () => `volume.${name}.1`,
      });
      await expect(unavailable.createCandidate({
        programId: "program.preview.1",
        workspaceId: "workspace.preview.1",
      })).rejects.toMatchObject({ code: "storage_unavailable" });
      expect(rootRequests).toBe(1);
      await unavailable.dispose();
    }

    let quotaRootRequests = 0;
    const unavailableCapacity = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: () => {
        quotaRootRequests += 1;
        return Promise.reject(new DOMException("injected quota", "QuotaExceededError"));
      },
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.quota-root.1",
    });
    await expect(unavailableCapacity.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    })).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(quotaRootRequests).toBe(1);
    await unavailableCapacity.dispose();

    const mutationCapacity = await openedOpfsV1("volume.quota-mutation.1");
    const head = await mutationCapacity.lease.readHead();
    mutationCapacity.root.faults.closeFailures.set("next.bin", "quota");
    await expect(mutationCapacity.lease.replaceFile(
      replaceInputV1(head, new TextEncoder().encode("new"), "checkpoint.quota.2"),
    )).rejects.toMatchObject({ code: "capacity_exceeded" });
    await expect(mutationCapacity.lease.readHead()).resolves.toEqual(head);
    await mutationCapacity.lease.close();
    await mutationCapacity.bootstrap.dispose();
  });

  it("does not create a substitute for a manifest-known missing or corrupt volume", async () => {
    const missingRoot = new FakeDirectoryV1("root");
    const missingFirst = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => missingRoot.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.known-missing.1",
      createInitialCheckpointId: () => "checkpoint.known-missing.1",
    });
    const missingAnchor = await missingFirst.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await missingFirst.dispose();
    const missingVolumes = fakeDirectoryNodeV1(missingRoot, [
      ".sillyos-workspace-host-v1",
      "volumes",
    ]);
    missingVolumes.entries.delete(missingAnchor.volumeId);
    const missingReopen = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => missingRoot.handle(),
      lockPort: new FakeLockPortV1(),
    });
    await expect(missingReopen.openVolume(missingAnchor)).rejects.toMatchObject({
      code: "volume_missing",
    });
    expect(missingVolumes.entries.size).toBe(0);
    await missingReopen.dispose();

    const corruptRoot = new FakeDirectoryV1("root");
    const corruptFirst = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => corruptRoot.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.known-corrupt.1",
      createInitialCheckpointId: () => "checkpoint.known-corrupt.1",
    });
    const corruptAnchor = await corruptFirst.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await corruptFirst.dispose();
    const corruptControl = await fakeDirectoryV1(corruptRoot, [
      ".sillyos-workspace-host-v1",
      "volumes",
      corruptAnchor.volumeId,
      "control",
    ]);
    await putBytesV1(corruptControl, "head.json", new TextEncoder().encode("{corrupt"));
    const corruptReopen = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => corruptRoot.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const corruptLease = await corruptReopen.openVolume(corruptAnchor);
    await expect(corruptLease.readHead()).rejects.toMatchObject({ code: "volume_corrupt" });
    expect(
      fakeDirectoryNodeV1(corruptRoot, [
        ".sillyos-workspace-host-v1",
        "volumes",
      ]).entries.size,
    ).toBe(1);
    await corruptLease.close();
    await corruptReopen.dispose();
  });

  it("does not delete a candidate on dispose because an unknown Repository CAS may have published it", async () => {
    const root = new FakeDirectoryV1("root");
    const lockPort = new FakeLockPortV1();
    const first = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.unknown-cas.1",
      createInitialCheckpointId: () => "checkpoint.unknown-cas.1",
    });
    const anchor = await first.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await first.dispose();

    const reopenedBootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
    });
    const reopened = await reopenedBootstrap.openVolume(anchor);
    await expect(reopened.readHead()).resolves.toEqual({
      revision: 1,
      volumeId: anchor.volumeId,
      workspaceFormat: 1,
      checkpointId: "checkpoint.unknown-cas.1",
      generation: 1,
    });
    await reopened.close();
    await reopenedBootstrap.dispose();
  });

  it("treats a valid staged-only record as cleanup debris rather than replay authority", async () => {
    const opened = await openedOpfsV1("volume.staged-only.1");
    const head = await opened.lease.readHead();
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const staging = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "staging",
    ]);
    await putBytesV1(workspace, "program.md", new TextEncoder().encode("current"));
    await putBytesV1(staging, "next.bin", new TextEncoder().encode("unpublished"));
    await putBytesV1(staging, "previous.bin", new TextEncoder().encode("stale"));
    await putBytesV1(
      staging,
      "pending-stage.json",
      new TextEncoder().encode(JSON.stringify({
        revision: 1,
        volumeId: opened.lease.anchor.volumeId,
        workspaceFormat: 1,
        path: "program.md",
        baseCheckpointId: head.checkpointId,
        baseGeneration: head.generation,
        nextCheckpointId: "checkpoint.unpublished.2",
        nextGeneration: head.generation + 1,
        previous: "file",
        createdDirectories: [],
      })),
    );
    await opened.lease.close();

    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const recovered = await cold.openVolume(opened.lease.anchor);
    await expect(recovered.readHead()).resolves.toEqual(head);
    await expect(recovered.readFile("program.md")).resolves.toEqual(
      new TextEncoder().encode("current"),
    );
    for (const name of ["next.bin", "previous.bin", "pending-stage.json"]) {
      await expect(staging.getFileHandle(name)).rejects.toMatchObject({ name: "NotFoundError" });
    }
    await recovered.close();
    await cold.dispose();
    await opened.bootstrap.dispose();
  });

  it("cold-recovers every cleanup removal boundary after committed and rolled-back writes", async () => {
    const cleanupNames = [
      "pending.json",
      "next.bin",
      "previous.bin",
      "pending-stage.json",
    ] as const;

    for (const cleanupName of cleanupNames) {
      const committed = await openedOpfsV1(`volume.cold-commit-${cleanupName}.1`);
      const base = await committed.lease.readHead();
      const workspace = await fakeDirectoryV1(committed.root, [
        ".sillyos-workspace-host-v1",
        "volumes",
        committed.lease.anchor.volumeId,
        "workspace",
      ]);
      await putBytesV1(workspace, "program.md", new TextEncoder().encode("old"));
      let snapshot: FakeDirectoryV1 | null = null;
      committed.root.faults.afterRemove = (name) => {
        if (name === cleanupName && snapshot === null) snapshot = committed.root.clone();
      };
      const changed = await committed.lease.replaceFile(
        replaceInputV1(base, new TextEncoder().encode("new"), "checkpoint.cold-commit.2"),
      );
      committed.root.faults.afterRemove = null;
      if (snapshot === null) throw new Error(`cleanup boundary ${cleanupName} was not captured`);

      const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
        getRootDirectory: async () => snapshot!.handle(),
        lockPort: new FakeLockPortV1(),
      });
      const recovered = await cold.openVolume(committed.lease.anchor);
      await expect(recovered.readHead()).resolves.toEqual(changed.head);
      await expect(recovered.readFile("program.md")).resolves.toEqual(
        new TextEncoder().encode("new"),
      );
      await recovered.close();
      await cold.dispose();
      await committed.lease.close();
      await committed.bootstrap.dispose();
    }

    for (const cleanupName of cleanupNames) {
      const rolledBack = await openedOpfsV1(`volume.cold-rollback-${cleanupName}.1`);
      const base = await rolledBack.lease.readHead();
      const workspace = await fakeDirectoryV1(rolledBack.root, [
        ".sillyos-workspace-host-v1",
        "volumes",
        rolledBack.lease.anchor.volumeId,
        "workspace",
      ]);
      await putBytesV1(workspace, "program.md", new TextEncoder().encode("old"));
      let snapshot: FakeDirectoryV1 | null = null;
      rolledBack.root.faults.afterRemove = (name) => {
        if (name === cleanupName && snapshot === null) snapshot = rolledBack.root.clone();
      };
      rolledBack.root.faults.closeFailures.set("program.md", "before_commit");
      await expect(
        rolledBack.lease.replaceFile(
          replaceInputV1(base, new TextEncoder().encode("new"), "checkpoint.cold-rollback.2"),
        ),
      ).rejects.toMatchObject({ code: "request_failed" });
      rolledBack.root.faults.afterRemove = null;
      if (snapshot === null) throw new Error(`cleanup boundary ${cleanupName} was not captured`);

      const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
        getRootDirectory: async () => snapshot!.handle(),
        lockPort: new FakeLockPortV1(),
      });
      const recovered = await cold.openVolume(rolledBack.lease.anchor);
      await expect(recovered.readHead()).resolves.toEqual(base);
      await expect(recovered.readFile("program.md")).resolves.toEqual(
        new TextEncoder().encode("old"),
      );
      await recovered.close();
      await cold.dispose();
      await rolledBack.lease.close();
      await rolledBack.bootstrap.dispose();
    }
  });

  it("reconciles target, head, and cleanup faults before the live lease accepts more work", async () => {
    for (const pendingFailure of ["before_commit", "after_commit"] as const) {
      const pendingFault = await openedOpfsV1(`volume.pending-${pendingFailure}.1`);
      const pendingBase = await pendingFault.lease.readHead();
      pendingFault.root.faults.closeFailures.set("pending.json", pendingFailure);
      await expect(
        pendingFault.lease.replaceFile(
          replaceInputV1(
            pendingBase,
            new TextEncoder().encode("new"),
            `checkpoint.pending-${pendingFailure}.2`,
          ),
        ),
      ).rejects.toMatchObject({ code: "request_failed" });
      expect(await pendingFault.lease.readHead()).toEqual(pendingBase);
      await expect(pendingFault.lease.stat("program.md")).resolves.toEqual({
        kind: "missing",
        size: 0,
      });
      await pendingFault.lease.close();
      await pendingFault.bootstrap.dispose();
    }

    const targetFault = await openedOpfsV1("volume.target-fault.1");
    const targetHead = await targetFault.lease.readHead();
    const workspace = await fakeDirectoryV1(targetFault.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      "volume.target-fault.1",
      "workspace",
    ]);
    await putBytesV1(workspace, "program.md", new TextEncoder().encode("old"));
    targetFault.root.faults.closeFailures.set("program.md", "before_commit");
    await expect(
      targetFault.lease.replaceFile(
        replaceInputV1(targetHead, new TextEncoder().encode("new"), "checkpoint.target.2"),
      ),
    ).rejects.toMatchObject({ code: "request_failed" });
    expect(await targetFault.lease.readHead()).toEqual(targetHead);
    expect(await targetFault.lease.readFile("program.md")).toEqual(
      new TextEncoder().encode("old"),
    );
    await expect(
      targetFault.lease.replaceFile(
        replaceInputV1(targetHead, new TextEncoder().encode("retry"), "checkpoint.target.3"),
      ),
    ).resolves.toMatchObject({ changed: true, head: { generation: 2 } });
    await targetFault.lease.close();
    await targetFault.bootstrap.dispose();

    const headFault = await openedOpfsV1("volume.head-fault.1");
    const headBase = await headFault.lease.readHead();
    headFault.root.faults.closeFailures.set("head.json", "after_commit");
    const headReconciled = await headFault.lease.replaceFile(
      replaceInputV1(headBase, new TextEncoder().encode("new"), "checkpoint.head.2"),
    );
    expect(headReconciled).toMatchObject({
      changed: true,
      head: { checkpointId: "checkpoint.head.2", generation: 2 },
    });
    expect(await headFault.lease.readFile("program.md")).toEqual(new TextEncoder().encode("new"));
    await headFault.lease.close();
    await headFault.bootstrap.dispose();

    const cleanupFault = await openedOpfsV1("volume.cleanup-fault.1");
    const cleanupBase = await cleanupFault.lease.readHead();
    cleanupFault.root.faults.removeFailures.add("pending.json");
    await expect(
      cleanupFault.lease.replaceFile(
        replaceInputV1(
          cleanupBase,
          new TextEncoder().encode("new"),
          "checkpoint.cleanup.2",
        ),
      ),
    ).resolves.toMatchObject({
      changed: true,
      head: { checkpointId: "checkpoint.cleanup.2", generation: 2 },
    });
    expect(await cleanupFault.lease.readFile("program.md")).toEqual(
      new TextEncoder().encode("new"),
    );
    await cleanupFault.lease.close();
    await cleanupFault.bootstrap.dispose();
  });

  it("poisons an unreconciled lease and prunes new nested parents on a rolled-back write", async () => {
    const poisoned = await openedOpfsV1("volume.poisoned.1");
    const poisonBase = await poisoned.lease.readHead();
    poisoned.root.faults.closeFailures.set("head.json", "corrupt_then_fail");
    await expect(
      poisoned.lease.replaceFile(
        replaceInputV1(poisonBase, new TextEncoder().encode("new"), "checkpoint.poisoned.2"),
      ),
    ).rejects.toMatchObject({ code: "volume_corrupt" });
    await expect(poisoned.lease.stat("program.md")).rejects.toMatchObject({
      code: "volume_corrupt",
    });
    await poisoned.lease.close();
    await poisoned.bootstrap.dispose();

    const nested = await openedOpfsV1("volume.nested-fault.1");
    const nestedBase = await nested.lease.readHead();
    nested.root.faults.closeFailures.set("new.md", "before_commit");
    await expect(
      nested.lease.replaceFile({
        ...replaceInputV1(
          nestedBase,
          new TextEncoder().encode("new"),
          "checkpoint.nested.2",
        ),
        path: "nested/deep/new.md",
      }),
    ).rejects.toMatchObject({ code: "request_failed" });
    expect(await nested.lease.readHead()).toEqual(nestedBase);
    await expect(nested.lease.stat("nested")).resolves.toEqual({ kind: "missing", size: 0 });
    await nested.lease.close();
    await nested.bootstrap.dispose();
  });
});
