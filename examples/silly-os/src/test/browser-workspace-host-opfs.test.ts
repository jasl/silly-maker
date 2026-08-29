// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  BrowserWorkspaceHostIoBudgetV1,
  browserWorkspaceHostControlFileMaximumBytesV1,
  browserWorkspaceHostDirectoryListChildMaximumV1,
  browserWorkspaceHostExportDirectoryChildMaximumV1,
  browserWorkspaceHostExportDirectoryMaximumV1,
  browserWorkspaceHostIoBytesInFlightMaximumV1,
  browserWorkspaceHostIoChunkMaximumBytesV1,
  createBrowserWorkspaceHostOpfsBootstrapV1,
  type BrowserWorkspaceHostLockLeaseV1,
  type BrowserWorkspaceHostLockPortV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import {
  BrowserWorkspaceHostCleanupErrorV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostReplaceFileInputV1,
  type BrowserWorkspaceHostVolumeLeasePortV1,
} from "../workspace/browser-workspace-host-runtime.ts";

type FakeEntryV1 = FakeDirectoryV1 | FakeFileV1;
type FakeCloseFailureV1 = "before_commit" | "after_commit" | "corrupt_then_fail" | "quota";

class FakeFaultsV1 {
  readonly closeFailures = new Map<string, FakeCloseFailureV1>();
  readonly persistentQuotaCloseFailures = new Set<string>();
  readonly removeFailures = new Set<string>();
  readonly fileSliceReads: Array<{
    readonly name: string;
    readonly start: number;
    readonly end: number;
  }> = [];
  readonly writableCreates: string[] = [];
  readonly writeChunkBytes: number[] = [];
  readonly directoryEnumerations: string[] = [];
  readonly directoryIterationFailures = new Map<string, DOMException>();
  dynamicCloseFailure: ((name: string) => FakeCloseFailureV1 | null) | null = null;
  afterCloseFailure: ((name: string, failure: FakeCloseFailureV1) => void) | null = null;
  afterFileSlice: ((name: string) => void) | null = null;
  afterRemove: ((name: string) => void) | null = null;
  beforeFileMetadata: ((name: string) => Promise<void> | void) | null = null;
}

class FakeFileV1 {
  bytes = new Uint8Array();
  readonly lastModified = 1_700_000_000_000;

  constructor(readonly name: string, private readonly faults: FakeFaultsV1) {}

  handle(): FileSystemFileHandle {
    return {
      kind: "file",
      name: this.name,
      isSameEntry: async () => false,
      getFile: async () => {
        await this.faults.beforeFileMetadata?.(this.name);
        const file = new File([this.bytes], this.name, { lastModified: this.lastModified });
        const slice = file.slice.bind(file);
        Object.defineProperty(file, "slice", {
          configurable: true,
          value: (start = 0, end = file.size, contentType = "") => {
            this.faults.fileSliceReads.push({ name: this.name, start, end });
            this.faults.afterFileSlice?.(this.name);
            return slice(start, end, contentType);
          },
        });
        return file;
      },
      createWritable: async () => {
        this.faults.writableCreates.push(this.name);
        let next = new Uint8Array();
        return {
          write: async (value: FileSystemWriteChunkType) => {
            let chunk: Uint8Array;
            if (typeof value === "string") chunk = new TextEncoder().encode(value);
            else if (value instanceof ArrayBuffer) chunk = new Uint8Array(value.slice(0));
            else if (ArrayBuffer.isView(value)) {
              chunk = new Uint8Array(
                value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
              );
            } else throw new Error("unsupported fake write chunk");
            this.faults.writeChunkBytes.push(chunk.byteLength);
            const appended = new Uint8Array(next.byteLength + chunk.byteLength);
            appended.set(next);
            appended.set(chunk, next.byteLength);
            next = appended;
          },
          close: async () => {
            if (this.faults.persistentQuotaCloseFailures.has(this.name)) {
              throw new DOMException(
                `injected persistent ${this.name} quota failure`,
                "QuotaExceededError",
              );
            }
            const failure = this.faults.closeFailures.get(this.name) ??
              this.faults.dynamicCloseFailure?.(this.name) ?? null;
            this.faults.closeFailures.delete(this.name);
            if (failure === "quota") {
              this.faults.afterCloseFailure?.(this.name, failure);
              throw new DOMException(`injected ${this.name} quota failure`, "QuotaExceededError");
            }
            if (failure === "before_commit") {
              this.faults.afterCloseFailure?.(this.name, failure);
              throw new Error(`injected ${this.name} close failure`);
            }
            if (failure === "corrupt_then_fail") {
              this.bytes = new TextEncoder().encode("{corrupt");
              this.faults.afterCloseFailure?.(this.name, failure);
              throw new Error(`injected ${this.name} corrupt close failure`);
            }
            this.bytes = next;
            if (failure === "after_commit") {
              this.faults.afterCloseFailure?.(this.name, failure);
              throw new Error(`injected ${this.name} close failure`);
            }
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

  async *iterateEntries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    this.faults.directoryEnumerations.push(this.name);
    const failure = this.faults.directoryIterationFailures.get(this.name);
    if (failure !== undefined) throw failure;
    for (const [name, entry] of this.entries) yield [name, entry.handle()];
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
      entries: this.iterateEntries.bind(this),
    } as unknown as FileSystemDirectoryHandle;
  }
}

class FakeLockPortV1 implements BrowserWorkspaceHostLockPortV1 {
  private readonly held = new Map<string, { exclusive: boolean; shared: number }>();

  async acquire(
    name: string,
    options: {
      readonly mode?: "exclusive" | "shared";
      readonly ifAvailable: boolean;
    },
  ): Promise<BrowserWorkspaceHostLockLeaseV1 | null> {
    const mode = options.mode ?? "exclusive";
    const current = this.held.get(name) ?? { exclusive: false, shared: 0 };
    if (current.exclusive || (mode === "exclusive" && current.shared !== 0)) return null;
    if (mode === "exclusive") current.exclusive = true;
    else current.shared += 1;
    this.held.set(name, current);
    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        const held = this.held.get(name);
        if (held === undefined) return;
        if (mode === "exclusive") held.exclusive = false;
        else held.shared -= 1;
        if (!held.exclusive && held.shared === 0) this.held.delete(name);
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
  return replacePathInputV1("program.md", head, bytes, nextCheckpointId);
}

function replacePathInputV1(
  path: string,
  head: BrowserWorkspaceHostDurableHeadV1,
  bytes: Uint8Array,
  nextCheckpointId: string,
): BrowserWorkspaceHostReplaceFileInputV1 {
  return {
    path,
    source: {
      byteLength: bytes.byteLength,
      async readRange({ offset, length, signal }) {
        if (signal.aborted) throw new DOMException("aborted", "AbortError");
        return bytes.slice(offset, offset + length);
      },
    },
    expectedHead: head,
    nextCheckpointId,
    signal: new AbortController().signal,
  };
}

async function readWorkspaceFileV1(
  lease: BrowserWorkspaceHostVolumeLeasePortV1,
  path: string,
): Promise<Uint8Array> {
  const metadata = await lease.stat(path);
  if (metadata.kind !== "file") throw new Error(`expected test file ${path}`);
  const result = new Uint8Array(metadata.size);
  const signal = new AbortController().signal;
  for (
    let offset = 0;
    offset < metadata.size;
    offset += browserWorkspaceHostIoChunkMaximumBytesV1
  ) {
    const length = Math.min(
      browserWorkspaceHostIoChunkMaximumBytesV1,
      metadata.size - offset,
    );
    result.set(await lease.readFileRange({ path, offset, length, signal }), offset);
  }
  return result;
}

interface ParsedStoredZipEntryV1 {
  readonly name: string;
  readonly bytes: Uint8Array;
}

function uint32V1(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function parseStoredZipV1(bytes: Uint8Array): readonly ParsedStoredZipEntryV1[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEndOffset = Math.max(0, bytes.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumEndOffset; offset -= 1) {
    if (uint32V1(view, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("missing test ZIP end record");

  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = uint32V1(view, endOffset + 16);
  const decoder = new TextDecoder();
  const entries: ParsedStoredZipEntryV1[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (uint32V1(view, centralOffset) !== 0x02014b50) {
      throw new Error("missing test ZIP central entry");
    }
    if (view.getUint16(centralOffset + 10, true) !== 0) {
      throw new Error("test ZIP entry is not stored");
    }
    const compressedSize = uint32V1(view, centralOffset + 20);
    const uncompressedSize = uint32V1(view, centralOffset + 24);
    if (compressedSize !== uncompressedSize) throw new Error("test ZIP entry size mismatch");
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = uint32V1(view, centralOffset + 42);
    const name = decoder.decode(
      bytes.subarray(centralOffset + 46, centralOffset + 46 + nameLength),
    );
    if (uint32V1(view, localOffset) !== 0x04034b50) {
      throw new Error("missing test ZIP local entry");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({
      name,
      bytes: bytes.slice(dataOffset, dataOffset + uncompressedSize),
    });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
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
  const { anchor } = await bootstrap.createCandidate({
    programId: "program.preview.1",
    workspaceId: "workspace.preview.1",
  });
  return { root, bootstrap, lease: await bootstrap.openVolume(anchor) };
}

describe("SillyOS Browser Workspace OPFS bootstrap", () => {
  it("reports advisory origin storage and purges only its private root idempotently", async () => {
    const root = new FakeDirectoryV1("root");
    const lockPort = new FakeLockPortV1();
    await root.handle().getDirectoryHandle("unrelated-origin-data", { create: true });
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.storage-management.1",
      createInitialCheckpointId: () => "checkpoint.storage-management.1",
      estimateStorage: async () => ({ usage: 128, quota: 512 }),
      persistedStorage: async () => true,
    });
    await expect(bootstrap.inspectStorage()).resolves.toEqual({
      revision: 1,
      scope: "sandbox_origin_advisory",
      persisted: true,
      usageBytes: 128,
      quotaBytes: 512,
    });

    const candidate = await bootstrap.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await expect(bootstrap.purgeAllWorkspaces()).rejects.toMatchObject({
      code: "workspace_busy",
    });
    await bootstrap.discardCandidate(candidate.anchor.volumeId);
    await expect(bootstrap.purgeAllWorkspaces()).resolves.toEqual({
      revision: 1,
      kind: "purged",
    });
    await expect(
      root.handle().getDirectoryHandle(".sillyos-workspace-host-v1"),
    ).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(root.handle().getDirectoryHandle("unrelated-origin-data")).resolves.toBeDefined();
    await expect(bootstrap.purgeAllWorkspaces()).resolves.toEqual({
      revision: 1,
      kind: "purged",
    });
    await bootstrap.dispose();
  });

  it("uses a cross-Host maintenance lease to reject purge while another tab owns a workspace", async () => {
    const root = new FakeDirectoryV1("root");
    const lockPort = new FakeLockPortV1();
    const first = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.cross-tab.1",
      createInitialCheckpointId: () => "checkpoint.cross-tab.1",
    });
    const second = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
    });
    const candidate = await first.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await expect(second.purgeAllWorkspaces()).rejects.toMatchObject({
      code: "volume_busy",
    });
    const lease = await first.openVolume(candidate.anchor);
    await expect(second.purgeAllWorkspaces()).rejects.toMatchObject({
      code: "volume_busy",
    });
    await lease.close();
    await expect(second.purgeAllWorkspaces()).resolves.toEqual({
      revision: 1,
      kind: "purged",
    });
    await first.dispose();
    await second.dispose();
  });

  it("keeps different Program volumes independent while retaining same-volume and purge fences", async () => {
    const root = new FakeDirectoryV1("root");
    const lockPort = new FakeLockPortV1();
    const first = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.multi-tab.first.1",
      createInitialCheckpointId: () => "checkpoint.multi-tab.first.1",
    });
    const second = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.multi-tab.second.1",
      createInitialCheckpointId: () => "checkpoint.multi-tab.second.1",
    });
    const purger = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
    });
    const [firstCandidate, secondCandidate] = await Promise.all([
      first.createCandidate({
        programId: "program.multi-tab.first.1",
        workspaceId: "workspace.multi-tab.first.1",
      }),
      second.createCandidate({
        programId: "program.multi-tab.second.1",
        workspaceId: "workspace.multi-tab.second.1",
      }),
    ]);
    const [firstLease, secondLease] = await Promise.all([
      first.openVolume(firstCandidate.anchor),
      second.openVolume(secondCandidate.anchor),
    ]);

    const firstBytes = new TextEncoder().encode("first Program volume");
    const secondBytes = new TextEncoder().encode("second Program volume");
    const [firstHead, secondHead] = await Promise.all([
      firstLease.readHead(),
      secondLease.readHead(),
    ]);
    await Promise.all([
      firstLease.replaceFile(
        replaceInputV1(firstHead, firstBytes, "checkpoint.multi-tab.first.2"),
      ),
      secondLease.replaceFile(
        replaceInputV1(secondHead, secondBytes, "checkpoint.multi-tab.second.2"),
      ),
    ]);
    await expect(Promise.all([
      readWorkspaceFileV1(firstLease, "program.md"),
      readWorkspaceFileV1(secondLease, "program.md"),
    ])).resolves.toEqual([firstBytes, secondBytes]);

    await expect(second.openVolume(firstCandidate.anchor)).rejects.toMatchObject({
      code: "volume_busy",
    });
    await expect(purger.purgeAllWorkspaces()).rejects.toMatchObject({
      code: "volume_busy",
    });
    await firstLease.close();
    await expect(purger.purgeAllWorkspaces()).rejects.toMatchObject({
      code: "volume_busy",
    });
    await secondLease.close();
    await expect(purger.purgeAllWorkspaces()).resolves.toEqual({
      revision: 1,
      kind: "purged",
    });

    await first.dispose();
    await second.dispose();
    await purger.dispose();
  });

  it("fences cross-tab create and cold open while purge owns the maintenance lease", async () => {
    const root = new FakeDirectoryV1("root");
    const lockPort = new FakeLockPortV1();
    const seed = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.before-purge.1",
      createInitialCheckpointId: () => "checkpoint.before-purge.1",
    });
    const { anchor } = await seed.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    await seed.dispose();

    let releasePurge!: () => void;
    const purgeGate = new Promise<void>((resolve) => {
      releasePurge = resolve;
    });
    let markPurgeEntered!: () => void;
    const purgeEntered = new Promise<void>((resolve) => {
      markPurgeEntered = resolve;
    });
    const purger = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => {
        markPurgeEntered();
        await purgeGate;
        return root.handle();
      },
      lockPort,
    });
    const competing = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort,
      createVolumeId: () => "volume.after-purge.1",
      createInitialCheckpointId: () => "checkpoint.after-purge.1",
    });

    const purge = purger.purgeAllWorkspaces();
    await purgeEntered;
    await expect(competing.openVolume(anchor)).rejects.toMatchObject({
      code: "workspace_busy",
    });
    await expect(competing.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.2",
    })).rejects.toMatchObject({ code: "workspace_busy" });
    releasePurge();
    await expect(purge).resolves.toEqual({ revision: 1, kind: "purged" });

    const next = await competing.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.2",
    });
    await competing.discardCandidate(next.anchor.volumeId);
    await competing.dispose();
    await purger.dispose();
  });

  it("stages bounded download chunks privately and replays them through replaceFile", async () => {
    const opened = await openedOpfsV1("volume.download-stage.1");
    const signal = new AbortController().signal;
    const createStage = opened.lease.createDownloadStage;
    if (createStage === undefined) throw new Error("expected OPFS download staging capability");
    const stage = await createStage.call(opened.lease, { maximumBytes: 8, signal });
    await stage.append({ offset: 0, bytes: new Uint8Array([1, 2]), signal });
    await stage.append({ offset: 2, bytes: new Uint8Array([3, 4]), signal });
    await stage.seal(signal);
    expect(stage.byteLength).toBe(4);
    expect(await stage.readRange({ offset: 1, length: 2, signal })).toEqual(
      new Uint8Array([2, 3]),
    );

    const head = await opened.lease.readHead();
    await expect(opened.lease.replaceFile({
      path: "assets/download.bin",
      source: stage,
      expectedHead: head,
      nextCheckpointId: "checkpoint.download-stage.2",
      signal,
    })).resolves.toMatchObject({ changed: true, head: { generation: 2 } });
    await stage.release();
    expect(await readWorkspaceFileV1(opened.lease, "assets/download.bin")).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("aborts a blocked shared I/O reservation without leaking its waiter", async () => {
    const observations: Array<{ readonly chunkBytes: number; readonly bytesInFlight: number }> = [];
    const budget = new BrowserWorkspaceHostIoBudgetV1((observation) => {
      observations.push(observation);
    });
    const holder = await budget.acquire(
      browserWorkspaceHostIoBytesInFlightMaximumV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    const controller = new AbortController();
    const waiting = budget.acquire(
      2 * browserWorkspaceHostIoChunkMaximumBytesV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
      controller.signal,
    );
    let settled = false;
    waiting.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await Promise.resolve();
    expect(settled).toBe(false);

    controller.abort(new DOMException("cancelled by test", "AbortError"));
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
    holder.release();

    const fresh = await budget.acquire(
      browserWorkspaceHostIoBytesInFlightMaximumV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    fresh.release();
    expect(observations.at(-1)).toEqual({ chunkBytes: 0, bytesInFlight: 0 });
  });

  it("recognizes directory leaves, overwrites existing files, and retains the exact head on same-byte cold reopen", async () => {
    const root = new FakeDirectoryV1("root");
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.preview.1",
      createInitialCheckpointId: () => "checkpoint.1",
    });
    const { anchor } = await bootstrap.createCandidate({
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
    await expect(lease.stat("")).resolves.toEqual({
      kind: "directory",
      size: 0,
      mtimeMs: 0,
    });
    await expect(lease.stat("assets")).resolves.toEqual({
      kind: "directory",
      size: 0,
      mtimeMs: 0,
    });
    await expect(lease.listDirectory({
      path: "",
      signal: new AbortController().signal,
    })).resolves.toEqual([
      { name: "assets", kind: "directory", size: 0, mtimeMs: 0 },
      { name: "large.bin", kind: "file", size: 16 * 1024 * 1024, mtimeMs: 1_700_000_000_000 },
      { name: "program.md", kind: "file", size: 3, mtimeMs: 1_700_000_000_000 },
    ]);
    await expect(lease.listDirectory({
      path: "assets",
      signal: new AbortController().signal,
    })).resolves.toEqual([]);
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
    expect(await readWorkspaceFileV1(reopened, "program.md")).toEqual(
      new TextEncoder().encode("new"),
    );
    await expect(reopened.stat("large.bin")).resolves.toEqual({
      kind: "file",
      size: 16 * 1024 * 1024,
      mtimeMs: 1_700_000_000_000,
    });
    await reopened.close();
    await bootstrap.dispose();
  });

  it("publishes exact single-entry namespace successors and retains them across cold reopen", async () => {
    const opened = await openedOpfsV1("volume.namespace.1");
    const signal = new AbortController().signal;
    let head = await opened.lease.readHead();

    for (
      const [operation, path, checkpointId] of [
        ["create_directory", "assets", "checkpoint.namespace.2"],
        ["create_directory", "assets/empty", "checkpoint.namespace.3"],
      ] as const
    ) {
      const changed = await opened.lease.mutateEntry({
        operation,
        path,
        expectedHead: head,
        nextCheckpointId: checkpointId,
        signal,
      });
      expect(changed).toEqual({
        changed: true,
        head: { ...head, checkpointId, generation: head.generation + 1 },
      });
      head = changed.head;
    }
    const removedEmpty = await opened.lease.mutateEntry({
      operation: "remove_directory",
      path: "assets/empty",
      expectedHead: head,
      nextCheckpointId: "checkpoint.namespace.4",
      signal,
    });
    head = removedEmpty.head;
    const file = await opened.lease.replaceFile(
      replacePathInputV1(
        "assets/note.txt",
        head,
        new TextEncoder().encode("durable"),
        "checkpoint.namespace.5",
      ),
    );
    head = file.head;
    const removedFile = await opened.lease.mutateEntry({
      operation: "remove_file",
      path: "assets/note.txt",
      expectedHead: head,
      nextCheckpointId: "checkpoint.namespace.6",
      signal,
    });
    head = removedFile.head;
    expect(head).toMatchObject({ checkpointId: "checkpoint.namespace.6", generation: 6 });
    await expect(opened.lease.listDirectory({ path: "assets", signal })).resolves.toEqual([]);
    await opened.lease.close();

    const cold = await opened.bootstrap.openVolume(opened.lease.anchor);
    await expect(cold.readHead()).resolves.toEqual(head);
    await expect(cold.stat("assets")).resolves.toMatchObject({ kind: "directory" });
    await expect(cold.stat("assets/empty")).resolves.toMatchObject({ kind: "missing" });
    await expect(cold.stat("assets/note.txt")).resolves.toMatchObject({ kind: "missing" });
    await cold.close();
    await opened.bootstrap.dispose();
  });

  it("keeps namespace targets unchanged when the primary pending record never publishes", async () => {
    for (
      const [operation, path, expectedKind] of [
        ["create_directory", "created", "missing"],
        ["remove_file", "kept.txt", "file"],
        ["remove_directory", "kept", "directory"],
      ] as const
    ) {
      const opened = await openedOpfsV1(`volume.namespace-pending-${operation}.1`);
      const workspace = await fakeDirectoryV1(opened.root, [
        ".sillyos-workspace-host-v1",
        "volumes",
        opened.lease.anchor.volumeId,
        "workspace",
      ]);
      if (operation === "remove_file") {
        await putBytesV1(workspace, path, new TextEncoder().encode("kept"));
      } else if (operation === "remove_directory") {
        await workspace.getDirectoryHandle(path, { create: true });
      }
      const base = await opened.lease.readHead();
      opened.root.faults.closeFailures.set("pending.json", "before_commit");

      await expect(opened.lease.mutateEntry({
        operation,
        path,
        expectedHead: base,
        nextCheckpointId: `checkpoint.namespace-pending-${operation}.2`,
        signal: new AbortController().signal,
      })).rejects.toMatchObject({ code: "request_failed" });

      await expect(opened.lease.readHead()).resolves.toEqual(base);
      await expect(opened.lease.stat(path)).resolves.toMatchObject({ kind: expectedKind });
      if (operation === "remove_file") {
        await expect(readWorkspaceFileV1(opened.lease, path)).resolves.toEqual(
          new TextEncoder().encode("kept"),
        );
      }
      await opened.lease.close();
      await opened.bootstrap.dispose();
    }
  });

  it("cold-recovers namespace effects on both sides of exact head publication", async () => {
    for (
      const [operation, path] of [
        ["create_directory", "created"],
        ["remove_file", "kept.txt"],
        ["remove_directory", "kept"],
      ] as const
    ) {
      for (const headFailure of ["before_commit", "after_commit"] as const) {
        const opened = await openedOpfsV1(
          `volume.namespace-cold-${operation}-${headFailure}.1`,
        );
        const workspace = await fakeDirectoryV1(opened.root, [
          ".sillyos-workspace-host-v1",
          "volumes",
          opened.lease.anchor.volumeId,
          "workspace",
        ]);
        if (operation === "remove_file") {
          await putBytesV1(workspace, path, new TextEncoder().encode("kept"));
        } else if (operation === "remove_directory") {
          await workspace.getDirectoryHandle(path, { create: true });
        }
        const base = await opened.lease.readHead();
        const nextCheckpointId = `checkpoint.namespace-cold-${operation}-${headFailure}.2`;
        let snapshot: FakeDirectoryV1 | null = null;
        opened.root.faults.afterCloseFailure = (name) => {
          if (name === "head.json" && snapshot === null) snapshot = opened.root.clone();
        };
        opened.root.faults.closeFailures.set("head.json", headFailure);
        const mutation = opened.lease.mutateEntry({
          operation,
          path,
          expectedHead: base,
          nextCheckpointId,
          signal: new AbortController().signal,
        });
        if (headFailure === "before_commit") {
          await expect(mutation).rejects.toMatchObject({ code: "request_failed" });
        } else {
          await expect(mutation).resolves.toEqual({
            changed: true,
            head: {
              ...base,
              checkpointId: nextCheckpointId,
              generation: base.generation + 1,
            },
          });
        }
        opened.root.faults.afterCloseFailure = null;
        if (snapshot === null) throw new Error("namespace head boundary was not captured");

        const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
          getRootDirectory: async () => snapshot!.handle(),
          lockPort: new FakeLockPortV1(),
        });
        const recovered = await cold.openVolume(opened.lease.anchor);
        const committed = headFailure === "after_commit";
        await expect(recovered.readHead()).resolves.toEqual(
          committed
            ? {
              ...base,
              checkpointId: nextCheckpointId,
              generation: base.generation + 1,
            }
            : base,
        );
        const expectedKind = operation === "create_directory"
          ? committed ? "directory" : "missing"
          : committed
          ? "missing"
          : operation === "remove_file"
          ? "file"
          : "directory";
        await expect(recovered.stat(path)).resolves.toMatchObject({ kind: expectedKind });
        if (operation === "remove_file" && !committed) {
          await expect(readWorkspaceFileV1(recovered, path)).resolves.toEqual(
            new TextEncoder().encode("kept"),
          );
        }
        await recovered.close();
        await cold.dispose();
        await opened.lease.close();
        await opened.bootstrap.dispose();
      }
    }
  });

  it("refuses to remove a non-empty directory before publishing a successor", async () => {
    const opened = await openedOpfsV1("volume.namespace-nonempty.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const directory = await workspace.getDirectoryHandle("tree", { create: true });
    await putBytesV1(directory, "child.txt", new TextEncoder().encode("child"));
    const base = await opened.lease.readHead();

    await expect(opened.lease.mutateEntry({
      operation: "remove_directory",
      path: "tree",
      expectedHead: base,
      nextCheckpointId: "checkpoint.namespace-nonempty.2",
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "request_failed" });
    await expect(opened.lease.readHead()).resolves.toEqual(base);
    await expect(readWorkspaceFileV1(opened.lease, "tree/child.txt")).resolves.toEqual(
      new TextEncoder().encode("child"),
    );
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("streams multi-megabyte replacements through bounded ranges and keeps same bytes at the same head", async () => {
    const root = new FakeDirectoryV1("root");
    const observations: Array<{ readonly chunkBytes: number; readonly bytesInFlight: number }> = [];
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.bounded-ranges.1",
      createInitialCheckpointId: () => "checkpoint.bounded-ranges.1",
      observeIo: (observation) => observations.push(observation),
    });
    const { anchor } = await bootstrap.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    const lease = await bootstrap.openVolume(anchor);
    const byteLength = 5 * browserWorkspaceHostIoChunkMaximumBytesV1 + 137;
    const sourceRangeLengths: number[] = [];
    const source = {
      byteLength,
      async readRange(input: {
        readonly offset: number;
        readonly length: number;
        readonly signal: AbortSignal;
      }): Promise<Uint8Array> {
        if (input.signal.aborted) throw new DOMException("aborted", "AbortError");
        sourceRangeLengths.push(input.length);
        return Uint8Array.from(
          { length: input.length },
          (_, index) => (input.offset + index) % 251,
        );
      },
    };
    const head = await lease.readHead();
    const changed = await lease.replaceFile({
      path: "large.bin",
      source,
      expectedHead: head,
      nextCheckpointId: "checkpoint.bounded-ranges.2",
      signal: new AbortController().signal,
    });
    expect(changed).toMatchObject({ changed: true, head: { generation: 2 } });
    expect(sourceRangeLengths).toEqual([
      browserWorkspaceHostIoChunkMaximumBytesV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
      browserWorkspaceHostIoChunkMaximumBytesV1,
      137,
    ]);
    await expect(lease.stat("large.bin")).resolves.toEqual({
      kind: "file",
      size: byteLength,
      mtimeMs: 1_700_000_000_000,
    });
    await expect(lease.readFileRange({
      path: "large.bin",
      offset: browserWorkspaceHostIoChunkMaximumBytesV1 - 23,
      length: 71,
      signal: new AbortController().signal,
    })).resolves.toEqual(
      Uint8Array.from(
        { length: 71 },
        (_, index) => (browserWorkspaceHostIoChunkMaximumBytesV1 - 23 + index) % 251,
      ),
    );

    sourceRangeLengths.length = 0;
    await expect(lease.replaceFile({
      path: "large.bin",
      source,
      expectedHead: changed.head,
      nextCheckpointId: "checkpoint.bounded-ranges.3",
      signal: new AbortController().signal,
    })).resolves.toEqual({ changed: false, head: changed.head });
    expect(
      sourceRangeLengths.every((length) => length <= browserWorkspaceHostIoChunkMaximumBytesV1),
    )
      .toBe(true);
    expect(Math.max(...root.faults.writeChunkBytes)).toBeLessThanOrEqual(
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    expect(Math.max(...observations.map(({ chunkBytes }) => chunkBytes))).toBeLessThanOrEqual(
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    expect(Math.max(...observations.map(({ bytesInFlight }) => bytesInFlight))).toBeLessThanOrEqual(
      browserWorkspaceHostIoBytesInFlightMaximumV1,
    );
    await expect(lease.readHead()).resolves.toEqual(changed.head);
    await lease.close();
    await bootstrap.dispose();
  });

  it("exports deterministic nested Unicode and empty VFS files with the exact bounded manifest", async () => {
    const opened = await openedOpfsV1("volume.portable-exact.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const unicode = await workspace.getDirectoryHandle("资料", { create: true });
    const nested = await unicode.getDirectoryHandle("嵌套", { create: true });
    await nested.getDirectoryHandle("空目录", { create: true });
    const programBytes = new TextEncoder().encode("# Portable workspace\n");
    const unicodeBytes = new TextEncoder().encode("猫和人一起创作。\n");
    await putBytesV1(workspace, "program.md", programBytes);
    await putBytesV1(workspace, "empty.bin", new Uint8Array());
    await putBytesV1(unicode, "猫.txt", unicodeBytes);
    await putBytesV1(nested, "零字节.txt", new Uint8Array());

    const head = await opened.lease.readHead();
    const progress: Array<{
      readonly filesCompleted: number;
      readonly filesTotal: number;
      readonly bytesWritten: number;
      readonly bytesTotal: number;
    }> = [];
    const exportOnce = async (): Promise<Uint8Array> => {
      const archive = await opened.lease.createPortableArchive({
        programRevision: 4,
        repositoryRevision: 7,
        expectedHead: head,
        signal: new AbortController().signal,
        onProgress: (next) => progress.push(next),
      });
      const bytes = new Uint8Array(await archive.file.arrayBuffer());
      expect(archive.progress).toEqual(progress.at(-1));
      await archive.release();
      return bytes;
    };

    const first = await exportOnce();
    progress.length = 0;
    const second = await exportOnce();
    expect(second).toEqual(first);
    expect(await opened.lease.readHead()).toEqual(head);

    const entries = parseStoredZipV1(first);
    expect(entries.map(({ name }) => name)).toEqual([
      "sillyos-workspace.json",
      "workspace/empty.bin",
      "workspace/program.md",
      "workspace/资料/嵌套/零字节.txt",
      "workspace/资料/猫.txt",
    ]);
    expect(new TextDecoder().decode(entries[0]?.bytes)).toBe(`${
      JSON.stringify({
        revision: 1,
        kind: "sillyos-workspace",
        exportFormat: 1,
        workspaceFormat: 1,
        programId: opened.lease.anchor.programId,
        workspaceId: opened.lease.anchor.workspaceId,
        programRevision: 4,
        repositoryRevision: 7,
        checkpointId: head.checkpointId,
        generation: head.generation,
      })
    }\n`);
    expect(entries[1]?.bytes).toEqual(new Uint8Array());
    expect(entries[2]?.bytes).toEqual(programBytes);
    expect(entries[3]?.bytes).toEqual(new Uint8Array());
    expect(entries[4]?.bytes).toEqual(unicodeBytes);
    expect(entries.some(({ name }) => name.includes("空目录"))).toBe(false);

    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("cold-resumes and adopts one exact immutable snapshot while preserving its retained package", async () => {
    const opened = await openedOpfsV1("volume.snapshot-exact.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const originalBytes = new TextEncoder().encode("# reviewed candidate\n");
    await putBytesV1(workspace, "program.md", originalBytes);

    const preparedHead = await opened.lease.readHead();
    const prepareInput = {
      snapshotId: "snapshot.exact.1",
      proposalId: "proposal.exact.1",
      programRevision: 8,
      baseRepositoryRevision: 13,
      expectedHead: preparedHead,
      signal: new AbortController().signal,
    } as const;
    const receipt = await opened.lease.prepareImmutableSnapshot(prepareInput);
    expect(receipt).toMatchObject({
      revision: 1,
      snapshotId: prepareInput.snapshotId,
      programId: opened.lease.anchor.programId,
      workspaceId: opened.lease.anchor.workspaceId,
      volumeId: opened.lease.anchor.volumeId,
      workspaceFormat: 1,
      proposalId: prepareInput.proposalId,
      programRevision: prepareInput.programRevision,
      baseRepositoryRevision: prepareInput.baseRepositoryRevision,
      checkpointId: preparedHead.checkpointId,
      generation: preparedHead.generation,
    });
    expect(receipt.fileCount).toBe(1);
    expect(receipt.archiveBytes).toBeGreaterThan(originalBytes.byteLength);
    await expect(opened.lease.queryCurrentImmutableSnapshotCandidate()).resolves.toEqual(receipt);
    await expect(opened.lease.queryRetainedImmutableSnapshot(receipt)).resolves.toBeNull();
    await expect(opened.lease.resumeImmutableSnapshotPublication(receipt)).resolves.toEqual(
      receipt,
    );
    await expect(opened.lease.prepareImmutableSnapshot(prepareInput)).resolves.toEqual(receipt);

    const snapshotDirectory = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "snapshots",
      prepareInput.snapshotId,
    ]);
    const snapshotArchive = snapshotDirectory.entries.get("workspace.zip");
    if (!(snapshotArchive instanceof FakeFileV1)) {
      throw new Error("missing immutable snapshot archive");
    }
    const archiveBeforeMutation = snapshotArchive.bytes.slice();
    expect(archiveBeforeMutation.byteLength).toBe(receipt.archiveBytes);
    const snapshotEntries = parseStoredZipV1(archiveBeforeMutation);
    expect(snapshotEntries.map(({ name }) => name)).toEqual([
      "sillyos-workspace.json",
      "workspace/program.md",
    ]);
    expect(snapshotEntries[1]?.bytes).toEqual(originalBytes);

    const anchor = opened.lease.anchor;
    await opened.lease.close();
    await opened.bootstrap.dispose();
    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const reopened = await cold.openVolume(anchor);
    await expect(reopened.queryCurrentImmutableSnapshotCandidate()).resolves.toEqual(receipt);
    await expect(reopened.resumeImmutableSnapshotPublication(receipt)).resolves.toEqual(receipt);
    await expect(reopened.adoptImmutableSnapshot({
      ...receipt,
      archiveBytes: receipt.archiveBytes + 1,
    })).rejects.toMatchObject({ code: "snapshot_mismatch" });
    const adoptionRemovals: string[] = [];
    opened.root.faults.afterRemove = (name) => adoptionRemovals.push(name);
    await expect(reopened.adoptImmutableSnapshot(receipt)).resolves.toBe("adopted");
    opened.root.faults.afterRemove = null;
    expect(adoptionRemovals).toEqual(["snapshot-candidate.json"]);
    await expect(reopened.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(reopened.queryRetainedImmutableSnapshot(receipt)).resolves.toEqual(receipt);
    await expect(reopened.adoptImmutableSnapshot(receipt)).resolves.toBe("already_retained");
    await expect(reopened.discardImmutableSnapshot(receipt)).resolves.toBe("retained");

    const changed = await reopened.replaceFile(
      replaceInputV1(
        preparedHead,
        new TextEncoder().encode("# later workspace state\n"),
        "checkpoint.after-snapshot.1",
      ),
    );
    expect(changed.changed).toBe(true);
    await expect(reopened.queryRetainedImmutableSnapshot(receipt)).resolves.toEqual(receipt);
    expect(snapshotArchive.bytes).toEqual(archiveBeforeMutation);

    const portable = await reopened.createPortableArchive({
      programRevision: 9,
      repositoryRevision: 14,
      expectedHead: changed.head,
      signal: new AbortController().signal,
      onProgress() {},
    });
    const portableEntries = parseStoredZipV1(
      new Uint8Array(await portable.file.arrayBuffer()),
    );
    expect(portableEntries.map(({ name }) => name)).toEqual([
      "sillyos-workspace.json",
      "workspace/program.md",
    ]);
    expect(
      portableEntries.some(({ name }) => name.includes("snapshot") || name.includes("commit.json")),
    ).toBe(false);
    await portable.release();
    await reopened.close();
    await cold.dispose();

    const retainedCold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const retained = await retainedCold.openVolume(anchor);
    await expect(retained.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(retained.queryRetainedImmutableSnapshot(receipt)).resolves.toEqual(receipt);
    expect(snapshotArchive.bytes).toEqual(archiveBeforeMutation);
    await retained.close();
    await retainedCold.dispose();
  });

  it("rejects a retained snapshot identity collision without overwriting its package", async () => {
    const opened = await openedOpfsV1("volume.snapshot-collision.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    await putBytesV1(workspace, "program.md", new TextEncoder().encode("retained bytes\n"));
    const head = await opened.lease.readHead();
    const receipt = await opened.lease.prepareImmutableSnapshot({
      snapshotId: "snapshot.collision.1",
      proposalId: "proposal.collision.1",
      programRevision: 2,
      baseRepositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
    });
    await expect(opened.lease.adoptImmutableSnapshot(receipt)).resolves.toBe("adopted");
    const snapshotDirectory = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "snapshots",
      receipt.snapshotId,
    ]);
    const archive = snapshotDirectory.entries.get("workspace.zip");
    if (!(archive instanceof FakeFileV1)) throw new Error("missing retained archive");
    const retainedBytes = archive.bytes.slice();

    await expect(opened.lease.prepareImmutableSnapshot({
      snapshotId: receipt.snapshotId,
      proposalId: "proposal.collision.2",
      programRevision: 3,
      baseRepositoryRevision: 4,
      expectedHead: head,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "snapshot_mismatch" });
    expect(archive.bytes).toEqual(retainedBytes);
    await expect(opened.lease.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(opened.lease.queryRetainedImmutableSnapshot(receipt)).resolves.toEqual(receipt);
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("rejects stale resume and discards only the exact current unpublished package", async () => {
    const opened = await openedOpfsV1("volume.snapshot-discard.1");
    const head = await opened.lease.readHead();
    const receipt = await opened.lease.prepareImmutableSnapshot({
      snapshotId: "snapshot.discard.1",
      proposalId: "proposal.discard.1",
      programRevision: 2,
      baseRepositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
    });
    await expect(opened.lease.discardImmutableSnapshot({
      ...receipt,
      archiveBytes: receipt.archiveBytes + 1,
    })).rejects.toMatchObject({ code: "snapshot_mismatch" });
    await expect(opened.lease.queryCurrentImmutableSnapshotCandidate()).resolves.toEqual(receipt);

    await opened.lease.replaceFile(
      replaceInputV1(
        head,
        new TextEncoder().encode("new durable head\n"),
        "checkpoint.snapshot-discard.2",
      ),
    );
    await expect(opened.lease.resumeImmutableSnapshotPublication(receipt)).rejects.toMatchObject({
      code: "snapshot_stale",
    });
    const discardRemovals: string[] = [];
    opened.root.faults.afterRemove = (name) => discardRemovals.push(name);
    await expect(opened.lease.discardImmutableSnapshot(receipt)).resolves.toBe("discarded");
    opened.root.faults.afterRemove = null;
    expect(discardRemovals).toEqual([receipt.snapshotId, "snapshot-candidate.json"]);
    await expect(opened.lease.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(opened.lease.queryRetainedImmutableSnapshot(receipt)).resolves.toBeNull();
    await expect(opened.lease.discardImmutableSnapshot(receipt)).resolves.toBe("absent");
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("fails closed when discard removes the package but cannot remove its pointer, then cold-cleans the debris", async () => {
    const opened = await openedOpfsV1("volume.snapshot-discard-recovery.1");
    const head = await opened.lease.readHead();
    const anchor = opened.lease.anchor;
    const receipt = await opened.lease.prepareImmutableSnapshot({
      snapshotId: "snapshot.discard-recovery.1",
      proposalId: "proposal.discard-recovery.1",
      programRevision: 2,
      baseRepositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
    });
    opened.root.faults.removeFailures.add("snapshot-candidate.json");

    await expect(opened.lease.discardImmutableSnapshot(receipt)).rejects.toThrow(
      "injected snapshot-candidate.json remove failure",
    );
    await expect(opened.lease.discardImmutableSnapshot(receipt)).rejects.toMatchObject({
      code: "snapshot_mismatch",
    });

    await opened.lease.close();
    await opened.bootstrap.dispose();
    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const reopened = await cold.openVolume(anchor);
    await expect(reopened.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(reopened.discardImmutableSnapshot(receipt)).resolves.toBe("absent");
    await reopened.close();
    await cold.dispose();
  });

  it("isolates the same snapshot identity across two Program volumes", async () => {
    const root = new FakeDirectoryV1("root");
    let nextVolume = 0;
    let nextCheckpoint = 0;
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => `volume.snapshot-isolation.${String(++nextVolume)}`,
      createInitialCheckpointId: () => `checkpoint.snapshot-isolation.${String(++nextCheckpoint)}`,
    });
    const { anchor: firstAnchor } = await bootstrap.createCandidate({
      programId: "program.snapshot-isolation.1",
      workspaceId: "workspace.snapshot-isolation.1",
    });
    const { anchor: secondAnchor } = await bootstrap.createCandidate({
      programId: "program.snapshot-isolation.2",
      workspaceId: "workspace.snapshot-isolation.2",
    });
    const first = await bootstrap.openVolume(firstAnchor);
    const second = await bootstrap.openVolume(secondAnchor);
    const snapshotId = "snapshot.shared-opaque-id.1";
    const prepare = async (lease: BrowserWorkspaceHostVolumeLeasePortV1, proposalId: string) => {
      const head = await lease.readHead();
      return await lease.prepareImmutableSnapshot({
        snapshotId,
        proposalId,
        programRevision: 2,
        baseRepositoryRevision: 3,
        expectedHead: head,
        signal: new AbortController().signal,
      });
    };
    const [firstReceipt, secondReceipt] = await Promise.all([
      prepare(first, "proposal.snapshot-isolation.1"),
      prepare(second, "proposal.snapshot-isolation.2"),
    ]);

    expect(firstReceipt).toMatchObject({
      snapshotId,
      programId: firstAnchor.programId,
      volumeId: firstAnchor.volumeId,
    });
    expect(secondReceipt).toMatchObject({
      snapshotId,
      programId: secondAnchor.programId,
      volumeId: secondAnchor.volumeId,
    });
    await expect(first.queryCurrentImmutableSnapshotCandidate()).resolves.toEqual(firstReceipt);
    await expect(second.queryCurrentImmutableSnapshotCandidate()).resolves.toEqual(secondReceipt);
    await Promise.all([first.close(), second.close()]);
    await bootstrap.dispose();
  });

  it("cold-cleans a snapshot candidate whose prepare marker never reached commit", async () => {
    const opened = await openedOpfsV1("volume.snapshot-partial.1");
    const head = await opened.lease.readHead();
    const anchor = opened.lease.anchor;
    const control = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "control",
    ]);
    const snapshots = await control.getDirectoryHandle("snapshots");
    const snapshotId = "snapshot.partial.1";
    const partial = await snapshots.getDirectoryHandle(snapshotId, { create: true });
    await putBytesV1(partial, "workspace.zip", new Uint8Array([80, 75, 3, 4]));
    await putBytesV1(partial, "commit.json", new TextEncoder().encode('{"revision":1'));
    await putBytesV1(
      control,
      "snapshot-candidate.json",
      new TextEncoder().encode(`${
        JSON.stringify({
          revision: 1,
          snapshotId,
          programId: anchor.programId,
          workspaceId: anchor.workspaceId,
          volumeId: anchor.volumeId,
          workspaceFormat: anchor.workspaceFormat,
          proposalId: "proposal.partial.1",
          programRevision: 2,
          baseRepositoryRevision: 3,
          checkpointId: head.checkpointId,
          generation: head.generation,
        })
      }\n`),
    );
    await opened.lease.close();
    await opened.bootstrap.dispose();

    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const reopened = await cold.openVolume(anchor);
    await expect(reopened.queryCurrentImmutableSnapshotCandidate()).resolves.toBeNull();
    await expect(control.getFileHandle("snapshot-candidate.json")).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await expect(snapshots.getDirectoryHandle(snapshotId)).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await reopened.close();
    await cold.dispose();
  });

  it("cleans a failed prepare-marker write without poisoning the live volume", async () => {
    const opened = await openedOpfsV1("volume.snapshot-marker-failure.1");
    const head = await opened.lease.readHead();
    opened.root.faults.closeFailures.set("snapshot-candidate.json", "before_commit");

    await expect(opened.lease.prepareImmutableSnapshot({
      snapshotId: "snapshot.marker-failure.1",
      proposalId: "proposal.marker-failure.1",
      programRevision: 2,
      baseRepositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
    })).rejects.toThrow("injected snapshot-candidate.json close failure");
    await expect(
      opened.lease.queryCurrentImmutableSnapshotCandidate(),
    ).resolves.toBeNull();
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("cold-cleans an invalid unmaterialized prepare marker", async () => {
    const opened = await openedOpfsV1("volume.snapshot-marker-crash.1");
    const anchor = opened.lease.anchor;
    const control = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "control",
    ]);
    await putBytesV1(control, "snapshot-candidate.json", new Uint8Array());
    await opened.lease.close();
    await opened.bootstrap.dispose();

    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const reopened = await cold.openVolume(anchor);
    await expect(
      control.getFileHandle("snapshot-candidate.json"),
    ).rejects.toMatchObject({ name: "NotFoundError" });
    await reopened.close();
    await cold.dispose();
  });

  it("rejects a complete insufficient quota estimate before source reads or temp creation", async () => {
    const root = new FakeDirectoryV1("root");
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.portable-quota.1",
      createInitialCheckpointId: () => "checkpoint.portable-quota.1",
      estimateStorage: async () => ({ quota: 1, usage: 1 }),
    });
    const { anchor } = await bootstrap.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    const workspace = await fakeDirectoryV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "workspace",
    ]);
    await putBytesV1(workspace, "payload.bin", new Uint8Array([1, 2, 3, 4]));
    const lease = await bootstrap.openVolume(anchor);
    const head = await lease.readHead();
    root.faults.fileSliceReads.length = 0;
    root.faults.writableCreates.length = 0;

    await expect(lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    })).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(root.faults.fileSliceReads.filter(({ name }) => name === "payload.bin")).toEqual([]);
    expect(root.faults.writableCreates).not.toContain("portable-export.zip");
    const staging = fakeDirectoryNodeV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "control",
      "staging",
    ]);
    expect(staging.entries.has("portable-export.zip")).toBe(false);
    expect(await lease.readHead()).toEqual(head);

    root.faults.writableCreates.length = 0;
    await expect(lease.prepareImmutableSnapshot({
      snapshotId: "snapshot.quota.1",
      proposalId: "proposal.quota.1",
      programRevision: 2,
      baseRepositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(root.faults.fileSliceReads.filter(({ name }) => name === "payload.bin")).toEqual([]);
    expect(root.faults.writableCreates).not.toContain("workspace.zip");
    const control = fakeDirectoryNodeV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "control",
    ]);
    expect(control.entries.has("snapshot-candidate.json")).toBe(false);
    const snapshots = control.entries.get("snapshots");
    if (!(snapshots instanceof FakeDirectoryV1)) throw new Error("missing snapshots directory");
    expect(snapshots.entries.has("snapshot.quota.1")).toBe(false);

    await lease.close();
    await bootstrap.dispose();
  });

  it("cancels a live export, removes its temp file, and preserves the durable head", async () => {
    const opened = await openedOpfsV1("volume.portable-cancel.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    await putBytesV1(
      workspace,
      "payload.bin",
      new Uint8Array(browserWorkspaceHostIoChunkMaximumBytesV1 + 17),
    );
    const head = await opened.lease.readHead();
    const controller = new AbortController();
    opened.root.faults.fileSliceReads.length = 0;
    opened.root.faults.writableCreates.length = 0;
    opened.root.faults.afterFileSlice = (name) => {
      if (name === "payload.bin" && !controller.signal.aborted) {
        controller.abort(new DOMException("cancelled by test", "AbortError"));
      }
    };

    await expect(opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: controller.signal,
      onProgress() {},
    })).rejects.toMatchObject({ name: "AbortError" });
    opened.root.faults.afterFileSlice = null;
    expect(opened.root.faults.writableCreates).toContain("portable-export.zip");
    expect(
      opened.root.faults.fileSliceReads.filter(({ name }) => name === "payload.bin"),
    ).toHaveLength(1);
    const staging = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "staging",
    ]);
    expect(staging.entries.has("portable-export.zip")).toBe(false);
    expect(await opened.lease.readHead()).toEqual(head);

    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("surfaces failed cancellation cleanup and removes the debris on the next export", async () => {
    const opened = await openedOpfsV1("volume.portable-cleanup.1");
    const workspace = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    await putBytesV1(
      workspace,
      "payload.bin",
      new Uint8Array(browserWorkspaceHostIoChunkMaximumBytesV1 + 17),
    );
    const head = await opened.lease.readHead();
    const controller = new AbortController();
    opened.root.faults.afterFileSlice = (name) => {
      if (name !== "payload.bin" || controller.signal.aborted) return;
      opened.root.faults.removeFailures.add("portable-export.zip");
      controller.abort(new DOMException("cancelled by test", "AbortError"));
    };

    await expect(opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: controller.signal,
      onProgress() {},
    })).rejects.toBeInstanceOf(BrowserWorkspaceHostCleanupErrorV1);
    opened.root.faults.afterFileSlice = null;
    const staging = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "staging",
    ]);
    expect(staging.entries.has("portable-export.zip")).toBe(true);
    const retry = await opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    });
    expect(await opened.lease.readHead()).toEqual(head);
    await retry.release();
    expect(staging.entries.has("portable-export.zip")).toBe(false);

    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("rejects directory breadth before retaining an unbounded child list", async () => {
    const opened = await openedOpfsV1("volume.portable-child-limit.1");
    const workspace = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    for (
      let index = 0;
      index <= browserWorkspaceHostExportDirectoryChildMaximumV1;
      index += 1
    ) {
      const name = `child-${String(index).padStart(5, "0")}`;
      workspace.entries.set(name, new FakeDirectoryV1(name, opened.root.faults));
    }
    const head = await opened.lease.readHead();
    await expect(opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    })).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(await opened.lease.readHead()).toEqual(head);
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("lists more than the portable-export child cap within the shell traversal cap", async () => {
    const opened = await openedOpfsV1("volume.shell-directory-list-limit.1");
    const workspace = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const childCount = browserWorkspaceHostExportDirectoryChildMaximumV1 + 1;
    expect(childCount).toBeLessThanOrEqual(browserWorkspaceHostDirectoryListChildMaximumV1);
    for (let index = 0; index < childCount; index += 1) {
      const name = `child-${String(index).padStart(5, "0")}`;
      workspace.entries.set(name, new FakeDirectoryV1(name, opened.root.faults));
    }

    const children = await opened.lease.listDirectory({
      path: "",
      signal: new AbortController().signal,
    });

    expect(children).toHaveLength(childCount);
    expect(children[0]?.name).toBe("child-00000");
    expect(children.at(-1)?.name).toBe(`child-${String(childCount - 1).padStart(5, "0")}`);
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("rejects a directory listing aborted during final file metadata", async () => {
    const opened = await openedOpfsV1("volume.shell-directory-metadata-abort.1");
    const workspace = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    workspace.entries.set("slow.txt", new FakeFileV1("slow.txt", opened.root.faults));
    const controller = new AbortController();
    let notifyMetadataStarted: (() => void) | null = null;
    const metadataStarted = new Promise<void>((resolve) => {
      notifyMetadataStarted = resolve;
    });
    opened.root.faults.beforeFileMetadata = async (name) => {
      if (name !== "slow.txt") return;
      notifyMetadataStarted?.();
      await new Promise<void>((resolve) => {
        if (controller.signal.aborted) resolve();
        else controller.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    };

    const listing = opened.lease.listDirectory({ path: "", signal: controller.signal });
    await metadataStarted;
    controller.abort();

    await expect(listing).rejects.toMatchObject({
      code: "request_failed",
      fileError: { code: "aborted", path: "/workspace" },
    });
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("rejects discovered directories before the pending traversal exceeds its bound", async () => {
    const opened = await openedOpfsV1("volume.portable-directory-limit.1");
    const workspace = fakeDirectoryNodeV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "workspace",
    ]);
    const roots: FakeDirectoryV1[] = [];
    for (let index = 0; index < browserWorkspaceHostExportDirectoryChildMaximumV1; index += 1) {
      const name = `root-${String(index).padStart(4, "0")}`;
      const directory = new FakeDirectoryV1(name, opened.root.faults);
      roots.push(directory);
      workspace.entries.set(name, directory);
    }
    const nestedParents = Math.ceil(
      (browserWorkspaceHostExportDirectoryMaximumV1 - roots.length) /
        browserWorkspaceHostExportDirectoryChildMaximumV1,
    );
    for (let parentIndex = 0; parentIndex < nestedParents; parentIndex += 1) {
      const parent = roots[parentIndex]!;
      for (
        let index = 0;
        index < browserWorkspaceHostExportDirectoryChildMaximumV1;
        index += 1
      ) {
        const name = `nested-${String(index).padStart(4, "0")}`;
        parent.entries.set(name, new FakeDirectoryV1(name, opened.root.faults));
      }
    }
    const head = await opened.lease.readHead();
    await expect(opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    })).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(opened.root.faults.directoryEnumerations).toContain("root-0002");
    expect(opened.root.faults.directoryEnumerations).not.toContain("root-0003");
    expect(await opened.lease.readHead()).toEqual(head);
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("removes a stale portable export temp before reopening the durable volume", async () => {
    const opened = await openedOpfsV1("volume.portable-reopen.1");
    const head = await opened.lease.readHead();
    const staging = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "staging",
    ]);
    await putBytesV1(staging, "portable-export.zip", new Uint8Array([80, 75, 3, 4]));
    await opened.lease.close();
    await opened.bootstrap.dispose();

    const cold = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => opened.root.handle(),
      lockPort: new FakeLockPortV1(),
    });
    const reopened = await cold.openVolume(opened.lease.anchor);
    await expect(staging.getFileHandle("portable-export.zip")).rejects.toMatchObject({
      name: "NotFoundError",
    });
    expect(await reopened.readHead()).toEqual(head);
    await reopened.close();
    await cold.dispose();
  });

  it("maps unavailable workspace enumeration during portable export without changing the head", async () => {
    const opened = await openedOpfsV1("volume.portable-unavailable.1");
    const head = await opened.lease.readHead();
    opened.root.faults.directoryIterationFailures.set(
      "workspace",
      new DOMException("denied", "SecurityError"),
    );

    await expect(opened.lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    })).rejects.toMatchObject({ code: "storage_unavailable" });
    expect(await opened.lease.readHead()).toEqual(head);
    const staging = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
      "staging",
    ]);
    await expect(staging.getFileHandle("portable-export.zip")).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await opened.lease.close();
    await opened.bootstrap.dispose();
  });

  it("keeps portable export source and destination I/O inside the existing shared budget", async () => {
    const root = new FakeDirectoryV1("root");
    const observations: Array<{ readonly chunkBytes: number; readonly bytesInFlight: number }> = [];
    const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createVolumeId: () => "volume.portable-budget.1",
      createInitialCheckpointId: () => "checkpoint.portable-budget.1",
      estimateStorage: async () => ({ quota: 64 * 1024 * 1024, usage: 0 }),
      observeIo: (observation) => observations.push(observation),
    });
    const { anchor } = await bootstrap.createCandidate({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
    });
    const workspace = await fakeDirectoryV1(root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      anchor.volumeId,
      "workspace",
    ]);
    const payload = new Uint8Array(2 * browserWorkspaceHostIoChunkMaximumBytesV1 + 17);
    payload.forEach((_byte, index) => {
      payload[index] = index % 251;
    });
    await putBytesV1(workspace, "payload.bin", payload);
    const lease = await bootstrap.openVolume(anchor);
    const head = await lease.readHead();
    observations.length = 0;
    root.faults.fileSliceReads.length = 0;
    root.faults.writeChunkBytes.length = 0;
    const archive = await lease.createPortableArchive({
      programRevision: 2,
      repositoryRevision: 3,
      expectedHead: head,
      signal: new AbortController().signal,
      onProgress() {},
    });

    expect(
      Math.max(
        ...root.faults.fileSliceReads
          .filter(({ name }) => name === "payload.bin")
          .map(({ start, end }) => end - start),
      ),
    ).toBeLessThanOrEqual(browserWorkspaceHostIoChunkMaximumBytesV1);
    expect(Math.max(...root.faults.writeChunkBytes)).toBeLessThanOrEqual(
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    expect(Math.max(...observations.map(({ chunkBytes }) => chunkBytes))).toBeLessThanOrEqual(
      browserWorkspaceHostIoChunkMaximumBytesV1,
    );
    expect(Math.max(...observations.map(({ bytesInFlight }) => bytesInFlight))).toBeLessThanOrEqual(
      browserWorkspaceHostIoBytesInFlightMaximumV1,
    );
    expect(archive.progress).toMatchObject({
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: archive.file.size,
      bytesTotal: archive.file.size,
    });
    expect(await lease.readHead()).toEqual(head);
    await archive.release();
    await lease.close();
    await bootstrap.dispose();
  });

  it("rejects oversized or out-of-bounds ranges and oversized control files", async () => {
    const opened = await openedOpfsV1("volume.range-admission.1");
    const head = await opened.lease.readHead();
    await opened.lease.replaceFile(
      replaceInputV1(head, new Uint8Array([1, 2, 3]), "checkpoint.range-admission.2"),
    );
    await expect(opened.lease.readFileRange({
      path: "program.md",
      offset: 0,
      length: browserWorkspaceHostIoChunkMaximumBytesV1 + 1,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "request_failed" });
    await expect(opened.lease.readFileRange({
      path: "program.md",
      offset: 2,
      length: 2,
      signal: new AbortController().signal,
    })).rejects.toMatchObject({ code: "volume_corrupt" });

    const control = await fakeDirectoryV1(opened.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      opened.lease.anchor.volumeId,
      "control",
    ]);
    await putBytesV1(
      control,
      "head.json",
      new Uint8Array(browserWorkspaceHostControlFileMaximumBytesV1 + 1),
    );
    await expect(opened.lease.readHead()).rejects.toMatchObject({ code: "volume_corrupt" });
    await opened.lease.close();
    await opened.bootstrap.dispose();
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
    const firstCandidate = await first.createCandidate(input);
    const firstAnchor = firstCandidate.anchor;
    expect(firstAnchor.volumeId).toMatch(/^sillyos\.volume\.[a-f0-9]{64}$/u);
    expect(firstCandidate).toEqual({
      revision: 1,
      anchor: firstAnchor,
      checkpointId: "checkpoint.stable.1",
      generation: 1,
    });
    await first.dispose();

    const second = createBrowserWorkspaceHostOpfsBootstrapV1({
      getRootDirectory: async () => root.handle(),
      lockPort: new FakeLockPortV1(),
      createInitialCheckpointId: () => "checkpoint.must-not-replace.1",
    });
    const resumedCandidate = await second.createCandidate(input);
    expect(resumedCandidate).toEqual(firstCandidate);
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

    const lease = await second.openVolume(resumedCandidate.anchor);
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
    expect(other.anchor.volumeId).not.toBe(firstAnchor.volumeId);
    expect(volumesNode.entries.size).toBe(2);
    await second.discardCandidate(other.anchor.volumeId);
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
    const { anchor: missingAnchor } = await missingFirst.createCandidate({
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
    const { anchor: corruptAnchor } = await corruptFirst.createCandidate({
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
    const { anchor } = await first.createCandidate({
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
    await expect(readWorkspaceFileV1(recovered, "program.md")).resolves.toEqual(
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
      await expect(readWorkspaceFileV1(recovered, "program.md")).resolves.toEqual(
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
      await expect(readWorkspaceFileV1(recovered, "program.md")).resolves.toEqual(
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
        mtimeMs: 0,
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
    expect(await readWorkspaceFileV1(targetFault.lease, "program.md")).toEqual(
      new TextEncoder().encode("old"),
    );
    await expect(
      targetFault.lease.replaceFile(
        replaceInputV1(targetHead, new TextEncoder().encode("retry"), "checkpoint.target.3"),
      ),
    ).resolves.toMatchObject({ changed: true, head: { generation: 2 } });
    await targetFault.lease.close();
    await targetFault.bootstrap.dispose();

    const persistentQuota = await openedOpfsV1("volume.persistent-target-quota.1");
    const persistentQuotaHead = await persistentQuota.lease.readHead();
    const persistentQuotaWorkspace = await fakeDirectoryV1(persistentQuota.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      "volume.persistent-target-quota.1",
      "workspace",
    ]);
    await putBytesV1(
      persistentQuotaWorkspace,
      "program.md",
      new TextEncoder().encode("old"),
    );
    persistentQuota.root.faults.persistentQuotaCloseFailures.add("program.md");
    await expect(
      persistentQuota.lease.replaceFile(
        replaceInputV1(
          persistentQuotaHead,
          new TextEncoder().encode("new"),
          "checkpoint.persistent-target-quota.2",
        ),
      ),
    ).rejects.toMatchObject({ code: "capacity_exceeded" });
    await expect(persistentQuota.lease.readHead()).resolves.toEqual(persistentQuotaHead);
    await expect(persistentQuota.lease.stat("program.md")).resolves.toEqual({
      kind: "file",
      size: 3,
      mtimeMs: 1_700_000_000_000,
    });
    await expect(readWorkspaceFileV1(persistentQuota.lease, "program.md")).resolves.toEqual(
      new TextEncoder().encode("old"),
    );
    persistentQuota.root.faults.persistentQuotaCloseFailures.delete("program.md");
    await expect(
      persistentQuota.lease.replaceFile(
        replaceInputV1(
          persistentQuotaHead,
          new TextEncoder().encode("retry"),
          "checkpoint.persistent-target-quota.3",
        ),
      ),
    ).resolves.toMatchObject({ changed: true, head: { generation: 2 } });
    await persistentQuota.lease.close();
    await persistentQuota.bootstrap.dispose();

    const headQuotaRollback = await openedOpfsV1("volume.head-quota-rollback.1");
    const headQuotaBase = await headQuotaRollback.lease.readHead();
    const headQuotaWorkspace = await fakeDirectoryV1(headQuotaRollback.root, [
      ".sillyos-workspace-host-v1",
      "volumes",
      "volume.head-quota-rollback.1",
      "workspace",
    ]);
    await putBytesV1(headQuotaWorkspace, "program.md", new TextEncoder().encode("old"));
    let rollbackCapacityGate = false;
    let stagedSuccessorRemoved = false;
    let unpublishedTargetRemoved = false;
    headQuotaRollback.root.faults.afterCloseFailure = (name, failure) => {
      if (name === "head.json" && failure === "quota") rollbackCapacityGate = true;
    };
    headQuotaRollback.root.faults.afterRemove = (name) => {
      if (!rollbackCapacityGate) return;
      if (name === "next.bin") stagedSuccessorRemoved = true;
      if (name === "program.md") unpublishedTargetRemoved = true;
    };
    headQuotaRollback.root.faults.dynamicCloseFailure = (name) =>
      rollbackCapacityGate && name === "program.md" &&
        (!stagedSuccessorRemoved || !unpublishedTargetRemoved)
        ? "quota"
        : null;
    headQuotaRollback.root.faults.closeFailures.set("head.json", "quota");
    await expect(
      headQuotaRollback.lease.replaceFile(
        replaceInputV1(
          headQuotaBase,
          new TextEncoder().encode("a larger unpublished successor"),
          "checkpoint.head-quota-rollback.2",
        ),
      ),
    ).rejects.toMatchObject({ code: "capacity_exceeded" });
    expect(stagedSuccessorRemoved).toBe(true);
    expect(unpublishedTargetRemoved).toBe(true);
    await expect(headQuotaRollback.lease.readHead()).resolves.toEqual(headQuotaBase);
    await expect(readWorkspaceFileV1(headQuotaRollback.lease, "program.md")).resolves.toEqual(
      new TextEncoder().encode("old"),
    );
    headQuotaRollback.root.faults.afterCloseFailure = null;
    headQuotaRollback.root.faults.afterRemove = null;
    headQuotaRollback.root.faults.dynamicCloseFailure = null;
    await expect(
      headQuotaRollback.lease.replaceFile(
        replaceInputV1(
          headQuotaBase,
          new TextEncoder().encode("retry"),
          "checkpoint.head-quota-rollback.3",
        ),
      ),
    ).resolves.toMatchObject({ changed: true, head: { generation: 2 } });
    await headQuotaRollback.lease.close();
    await headQuotaRollback.bootstrap.dispose();

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
    expect(await readWorkspaceFileV1(headFault.lease, "program.md")).toEqual(
      new TextEncoder().encode("new"),
    );
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
    expect(await readWorkspaceFileV1(cleanupFault.lease, "program.md")).toEqual(
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
    await expect(nested.lease.stat("nested")).resolves.toEqual({
      kind: "missing",
      size: 0,
      mtimeMs: 0,
    });
    await nested.lease.close();
    await nested.bootstrap.dispose();
  });
});
