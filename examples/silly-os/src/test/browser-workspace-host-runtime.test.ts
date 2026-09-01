// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "../agent/browser-workspace-environment-client.ts";
import { bindPiWorkspaceBashToolV1 } from "../agent/pi-workspace-tool-binder.ts";
import { createBashTool } from "../agent/pi-workspace-runtime-bridge.js";
import {
  BrowserWorkspaceHostCleanupErrorV1,
  BrowserWorkspaceHostStorageErrorV1,
  createBrowserWorkspaceHostRuntimeV1 as createBrowserWorkspaceHostRuntimeWithoutShellV1,
  type BrowserWorkspaceHostBootstrapPortV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostDownloadStageV1,
  type BrowserWorkspaceHostEntryMutationInputV1,
  type BrowserWorkspaceHostFileMetadataV1,
  type BrowserWorkspaceHostMessagePortV1,
  type BrowserWorkspaceHostPortableArchiveInputV1,
  type BrowserWorkspaceHostPortableArchiveV1,
  type BrowserWorkspaceHostReplaceFileInputV1,
  type BrowserWorkspaceHostReplaceFileResultV1,
  type BrowserWorkspaceHostRuntimeOptionsV1,
  type BrowserWorkspaceHostStorageManagementPortV1,
  type BrowserWorkspaceHostVolumeLeasePortV1,
} from "../workspace/browser-workspace-host-runtime.ts";
import {
  browserWorkspaceHostReceiptMaximumV1,
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
  type BrowserWorkspaceHostControlOutboundMessageV1,
  type BrowserWorkspaceHostEnvironmentOutboundMessageV1,
  type BrowserWorkspaceHostExportOutboundMessageV1,
  type BrowserWorkspaceHostExportProgressWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  createWorkspaceGrepQueryV1,
  workspaceImmutableSnapshotReceiptsEqualV1,
  type WorkspaceImmutableSnapshotReceiptV1,
} from "../workspace/contracts.ts";

interface FakeRangeRequestV1 {
  readonly path: string;
  readonly offset: number;
  readonly length: number;
}

interface FakeSourceRequestV1 extends FakeRangeRequestV1 {
  readonly byteLength: number;
}

interface FakeVolumeV1 {
  head: BrowserWorkspaceHostDurableHeadV1;
  readonly files: Map<string, Uint8Array>;
  readonly directories: Set<string>;
  readonly metadataSizes: Map<string, number>;
  statCalls: number;
  readonly readFileRangeRequests: FakeRangeRequestV1[];
  readonly sourceReadRequests: FakeSourceRequestV1[];
  leaseCloseCalls: number;
  holdNextListUntilAbort: boolean;
  heldListEntered: (() => void) | null;
  holdNextChangedWrite: boolean;
  heldWriteEntered: (() => void) | null;
  replaceError: Error | null;
  archiveProgress: BrowserWorkspaceHostExportProgressWireV1[];
  archiveReleaseCalls: number;
  archiveFailure: Error | null;
  holdArchiveUntilAbort: boolean;
  archiveStarted: (() => void) | null;
  preparedSnapshot: WorkspaceImmutableSnapshotReceiptV1 | null;
  readonly retainedSnapshots: Map<string, WorkspaceImmutableSnapshotReceiptV1>;
  snapshotPrepareStarted: (() => void) | null;
  snapshotPrepareGate: Promise<void> | null;
}

const programIdV1 = "program.preview.1";
const workspaceIdV1 = "workspace.preview.1";
const fileMtimeMsV1 = 1_700_000_000_000;

function createBrowserWorkspaceHostRuntimeV1(options: BrowserWorkspaceHostRuntimeOptionsV1) {
  return createBrowserWorkspaceHostRuntimeWithoutShellV1({
    ...options,
    loadShellRuntime: () => import("../workspace/browser-workspace-just-bash-runtime.ts"),
  });
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

class FakeLeaseV1 implements BrowserWorkspaceHostVolumeLeasePortV1 {
  private closed = false;

  constructor(
    readonly anchor: BrowserWorkspaceVolumeAnchorWireV1,
    private readonly volume: FakeVolumeV1,
  ) {}

  async readHead(): Promise<BrowserWorkspaceHostDurableHeadV1> {
    return { ...this.volume.head };
  }

  async stat(path: string): Promise<BrowserWorkspaceHostFileMetadataV1> {
    this.volume.statCalls += 1;
    if (path.length === 0) return { kind: "directory", size: 0, mtimeMs: 0 };
    if (this.volume.directories.has(path)) return { kind: "directory", size: 0, mtimeMs: 0 };
    const file = this.volume.files.get(path);
    if (file !== undefined) return { kind: "file", size: file.byteLength, mtimeMs: fileMtimeMsV1 };
    const size = this.volume.metadataSizes.get(path);
    if (
      [...this.volume.files.keys(), ...this.volume.metadataSizes.keys()].some((candidate) =>
        candidate.startsWith(`${path}/`)
      )
    ) return { kind: "directory", size: 0, mtimeMs: 0 };
    return size === undefined
      ? { kind: "missing", size: 0, mtimeMs: 0 }
      : { kind: "file", size, mtimeMs: fileMtimeMsV1 };
  }

  async listDirectory(input: { readonly path: string; readonly signal: AbortSignal }) {
    if (input.signal.aborted) throw new DOMException("Workspace listing aborted", "AbortError");
    if (this.volume.holdNextListUntilAbort) {
      this.volume.holdNextListUntilAbort = false;
      this.volume.heldListEntered?.();
      await new Promise<void>((resolve) => {
        if (input.signal.aborted) resolve();
        else input.signal.addEventListener("abort", () => resolve(), { once: true });
      });
      if (input.signal.aborted) throw new DOMException("Workspace listing aborted", "AbortError");
    }
    const prefix = input.path.length === 0 ? "" : `${input.path}/`;
    const entries = new Map<string, "file" | "directory">();
    for (
      const path of new Set([
        ...this.volume.files.keys(),
        ...this.volume.metadataSizes.keys(),
        ...this.volume.directories,
      ])
    ) {
      if (!path.startsWith(prefix)) continue;
      const remainder = path.slice(prefix.length);
      if (remainder.length === 0) continue;
      const separator = remainder.indexOf("/");
      entries.set(
        separator < 0 ? remainder : remainder.slice(0, separator),
        separator < 0 ? "file" : "directory",
      );
    }
    return [...entries].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(
      ([name, kind]) => ({
        name,
        kind,
        size: kind === "file"
          ? (this.volume.files.get(`${prefix}${name}`)?.byteLength ??
            this.volume.metadataSizes.get(`${prefix}${name}`) ?? 0)
          : 0,
        mtimeMs: kind === "file" ? fileMtimeMsV1 : 0,
      }),
    );
  }

  async readFileRange(input: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<Uint8Array> {
    if (input.signal.aborted) throw new DOMException("Workspace read aborted", "AbortError");
    this.volume.readFileRangeRequests.push({
      path: input.path,
      offset: input.offset,
      length: input.length,
    });
    return this.volume.files.get(input.path)?.slice(
      input.offset,
      input.offset + input.length,
    ) ?? new Uint8Array();
  }

  async replaceFile(
    input: BrowserWorkspaceHostReplaceFileInputV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1> {
    if (this.closed) throw new Error("lease closed");
    if (this.volume.replaceError !== null) throw this.volume.replaceError;
    this.volume.sourceReadRequests.push({
      path: input.path,
      offset: 0,
      length: input.source.byteLength,
      byteLength: input.source.byteLength,
    });
    const bytes = await input.source.readRange({
      offset: 0,
      length: input.source.byteLength,
      signal: input.signal,
    });
    if (bytes.byteLength !== input.source.byteLength) {
      throw new Error("fake source returned an inexact range");
    }
    const existing = this.volume.files.get(input.path);
    if (existing !== undefined && bytesEqualV1(existing, bytes)) {
      return { changed: false, head: { ...this.volume.head } };
    }
    if (
      input.expectedHead.generation !== this.volume.head.generation ||
      input.expectedHead.checkpointId !== this.volume.head.checkpointId
    ) throw new Error("stale head");
    this.volume.files.set(input.path, bytes.slice());
    for (let parent = input.path.slice(0, input.path.lastIndexOf("/")); parent.length > 0;) {
      this.volume.directories.add(parent);
      const separator = parent.lastIndexOf("/");
      parent = separator < 0 ? "" : parent.slice(0, separator);
    }
    this.volume.head = {
      ...this.volume.head,
      checkpointId: input.nextCheckpointId,
      generation: this.volume.head.generation + 1,
    };
    if (this.volume.holdNextChangedWrite) {
      this.volume.holdNextChangedWrite = false;
      this.volume.heldWriteEntered?.();
      await new Promise<void>((resolve) => {
        input.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    }
    return { changed: true, head: { ...this.volume.head } };
  }

  createDownloadStage(input: {
    readonly maximumBytes: number;
    readonly signal: AbortSignal;
  }): Promise<BrowserWorkspaceHostDownloadStageV1> {
    let bytes = new Uint8Array();
    let sealed = false;
    let released = false;
    return Promise.resolve({
      get byteLength() {
        return bytes.byteLength;
      },
      append: ({ offset, bytes: chunk, signal }) => {
        if (
          released || sealed || signal.aborted || input.signal.aborted ||
          offset !== bytes.byteLength || bytes.byteLength + chunk.byteLength > input.maximumBytes
        ) return Promise.reject(new Error("invalid fake download stage append"));
        const next = new Uint8Array(bytes.byteLength + chunk.byteLength);
        next.set(bytes);
        next.set(chunk, bytes.byteLength);
        bytes = next;
        return Promise.resolve();
      },
      seal: (signal) => {
        if (released || signal.aborted || input.signal.aborted) {
          return Promise.reject(new Error("invalid fake download stage seal"));
        }
        sealed = true;
        return Promise.resolve();
      },
      readRange: ({ offset, length, signal }) => {
        if (released || !sealed || signal.aborted || offset + length > bytes.byteLength) {
          return Promise.reject(new Error("invalid fake download stage read"));
        }
        return Promise.resolve(bytes.slice(offset, offset + length));
      },
      release: () => {
        released = true;
        return Promise.resolve();
      },
    });
  }

  async mutateEntry(
    input: BrowserWorkspaceHostEntryMutationInputV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1> {
    if (this.closed) throw new Error("lease closed");
    if (
      input.expectedHead.generation !== this.volume.head.generation ||
      input.expectedHead.checkpointId !== this.volume.head.checkpointId
    ) throw new Error("stale head");
    const separator = input.path.lastIndexOf("/");
    const parent = separator < 0 ? "" : input.path.slice(0, separator);
    if (!this.volume.directories.has(parent)) throw new Error("missing parent");
    if (input.operation === "create_directory") {
      if (this.volume.directories.has(input.path) || this.volume.files.has(input.path)) {
        throw new Error("entry exists");
      }
      this.volume.directories.add(input.path);
    } else if (input.operation === "remove_file") {
      if (!this.volume.files.delete(input.path)) throw new Error("missing file");
    } else {
      if (!this.volume.directories.has(input.path)) throw new Error("missing directory");
      if (
        [...this.volume.files.keys(), ...this.volume.directories]
          .some((candidate) => candidate.startsWith(`${input.path}/`))
      ) throw new Error("directory not empty");
      this.volume.directories.delete(input.path);
    }
    this.volume.head = {
      ...this.volume.head,
      checkpointId: input.nextCheckpointId,
      generation: this.volume.head.generation + 1,
    };
    return { changed: true, head: { ...this.volume.head } };
  }

  async createPortableArchive(
    input: BrowserWorkspaceHostPortableArchiveInputV1,
  ): Promise<BrowserWorkspaceHostPortableArchiveV1> {
    this.volume.archiveStarted?.();
    if (this.volume.holdArchiveUntilAbort) {
      await new Promise<void>((resolve) => {
        if (input.signal.aborted) resolve();
        else input.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    }
    if (this.volume.archiveFailure !== null) throw this.volume.archiveFailure;
    for (const progress of this.volume.archiveProgress) input.onProgress(progress);
    const progress = this.volume.archiveProgress.at(-1) ?? {
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    };
    return {
      file: new File([new Uint8Array(progress.bytesTotal)], "workspace.zip"),
      progress,
      release: async () => {
        this.volume.archiveReleaseCalls += 1;
      },
    };
  }

  async prepareImmutableSnapshot(
    input: Parameters<BrowserWorkspaceHostVolumeLeasePortV1["prepareImmutableSnapshot"]>[0],
  ): ReturnType<BrowserWorkspaceHostVolumeLeasePortV1["prepareImmutableSnapshot"]> {
    this.volume.snapshotPrepareStarted?.();
    if (this.volume.snapshotPrepareGate !== null) await this.volume.snapshotPrepareGate;
    if (this.volume.retainedSnapshots.has(input.snapshotId)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "snapshot identity is already retained",
      );
    }
    const receipt: WorkspaceImmutableSnapshotReceiptV1 = {
      revision: 1,
      snapshotId: input.snapshotId,
      programId: this.anchor.programId,
      workspaceId: this.anchor.workspaceId,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      publicationId: input.publicationId,
      sourceRevision: input.sourceRevision,
      baseRevision: input.baseRevision,
      checkpointId: input.expectedHead.checkpointId,
      generation: input.expectedHead.generation,
      fileCount: this.volume.files.size,
      archiveBytes: Math.max(
        1,
        [...this.volume.files.values()].reduce(
          (total, bytes) => total + bytes.byteLength,
          0,
        ),
      ),
    };
    if (
      this.volume.preparedSnapshot !== null &&
      !workspaceImmutableSnapshotReceiptsEqualV1(this.volume.preparedSnapshot, receipt)
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
    if (
      this.volume.preparedSnapshot === null &&
      (input.expectedHead.checkpointId !== this.volume.head.checkpointId ||
        input.expectedHead.generation !== this.volume.head.generation)
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_stale", "snapshot stale");
    this.volume.preparedSnapshot = receipt;
    return receipt;
  }

  queryCurrentImmutableSnapshotCandidate(): Promise<WorkspaceImmutableSnapshotReceiptV1 | null> {
    return Promise.resolve(this.volume.preparedSnapshot);
  }

  queryRetainedImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<WorkspaceImmutableSnapshotReceiptV1 | null> {
    const retained = this.volume.retainedSnapshots.get(expected.snapshotId) ?? null;
    if (retained !== null && !workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)) {
      return Promise.reject(
        new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch"),
      );
    }
    return Promise.resolve(retained);
  }

  async resumeImmutableSnapshotPublication(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<WorkspaceImmutableSnapshotReceiptV1> {
    if (
      this.volume.preparedSnapshot === null ||
      !workspaceImmutableSnapshotReceiptsEqualV1(this.volume.preparedSnapshot, expected)
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
    if (
      this.volume.head.checkpointId !== expected.checkpointId ||
      this.volume.head.generation !== expected.generation
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_stale", "snapshot stale");
    return expected;
  }

  async adoptImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<"adopted" | "already_retained"> {
    const retained = this.volume.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)) {
        throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
      }
      return "already_retained";
    }
    if (
      this.volume.preparedSnapshot === null ||
      !workspaceImmutableSnapshotReceiptsEqualV1(this.volume.preparedSnapshot, expected)
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
    this.volume.retainedSnapshots.set(expected.snapshotId, expected);
    this.volume.preparedSnapshot = null;
    return "adopted";
  }

  async discardImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<"discarded" | "absent" | "retained"> {
    const retained = this.volume.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)) {
        throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
      }
      return "retained";
    }
    if (this.volume.preparedSnapshot === null) return "absent";
    if (
      !workspaceImmutableSnapshotReceiptsEqualV1(this.volume.preparedSnapshot, expected)
    ) throw new BrowserWorkspaceHostStorageErrorV1("snapshot_mismatch", "snapshot mismatch");
    this.volume.preparedSnapshot = null;
    return "discarded";
  }

  async close(): Promise<void> {
    if (!this.closed) this.volume.leaseCloseCalls += 1;
    this.closed = true;
  }
}

class FakeBootstrapV1
  implements BrowserWorkspaceHostBootstrapPortV1, BrowserWorkspaceHostStorageManagementPortV1 {
  readonly volumes = new Map<string, FakeVolumeV1>();
  readonly discardedVolumeIds: string[] = [];
  purgeCalls = 0;
  private nextVolumeId = 1;

  async createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }) {
    const volumeId = `volume.preview.${String(this.nextVolumeId++)}`;
    const anchor = {
      revision: 1,
      programId: input.programId,
      workspaceId: input.workspaceId,
      volumeId,
      workspaceFormat: 1,
    } as const;
    this.volumes.set(volumeId, {
      head: {
        revision: 1,
        volumeId,
        workspaceFormat: 1,
        checkpointId: "checkpoint.1",
        generation: 1,
      },
      files: new Map(),
      directories: new Set([""]),
      metadataSizes: new Map(),
      statCalls: 0,
      readFileRangeRequests: [],
      sourceReadRequests: [],
      leaseCloseCalls: 0,
      holdNextListUntilAbort: false,
      heldListEntered: null,
      holdNextChangedWrite: false,
      heldWriteEntered: null,
      replaceError: null,
      archiveProgress: [{
        filesCompleted: 0,
        filesTotal: 0,
        bytesWritten: 0,
        bytesTotal: 0,
      }],
      archiveReleaseCalls: 0,
      archiveFailure: null,
      holdArchiveUntilAbort: false,
      archiveStarted: null,
      preparedSnapshot: null,
      retainedSnapshots: new Map(),
      snapshotPrepareStarted: null,
      snapshotPrepareGate: null,
    });
    return {
      revision: 1,
      anchor,
      checkpointId: "checkpoint.1",
      generation: 1,
    } as const;
  }

  async discardCandidate(volumeId: string): Promise<void> {
    this.discardedVolumeIds.push(volumeId);
    this.volumes.delete(volumeId);
  }

  async openVolume(
    anchor: BrowserWorkspaceVolumeAnchorWireV1,
  ): Promise<BrowserWorkspaceHostVolumeLeasePortV1> {
    const volume = this.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("missing fake volume");
    return new FakeLeaseV1(anchor, volume);
  }

  async inspectStorage() {
    return {
      revision: 1,
      scope: "sandbox_origin_advisory",
      persisted: true,
      usageBytes: 128,
      quotaBytes: 512,
    } as const;
  }

  async purgeAllWorkspaces() {
    this.purgeCalls += 1;
    this.volumes.clear();
    return { revision: 1, kind: "purged" } as const;
  }

  async dispose(): Promise<void> {}
}

type MessageListenerV1 = (
  event: Readonly<{
    data: unknown;
    ports?: readonly BrowserWorkspaceHostMessagePortV1[];
  }>,
) => void;

class FakeMessagePortV1 implements BrowserWorkspaceHostMessagePortV1 {
  readonly messages: BrowserWorkspaceHostEnvironmentOutboundMessageV1[] = [];
  readonly listeners = new Set<MessageListenerV1>();
  startCalls = 0;
  closeCalls = 0;

  postMessage(message: unknown): void {
    this.messages.push(message as BrowserWorkspaceHostEnvironmentOutboundMessageV1);
  }

  addEventListener(type: "message", listener: MessageListenerV1): void {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: "message", listener: MessageListenerV1): void {
    if (type === "message") this.listeners.delete(listener);
  }

  start(): void {
    this.startCalls += 1;
  }

  close(): void {
    this.closeCalls += 1;
  }

  send(message: unknown, ports: readonly BrowserWorkspaceHostMessagePortV1[] = []): void {
    for (const listener of this.listeners) listener({ data: message, ports });
  }
}

function controlRequestV1(requestId: number, record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "control_request", requestId, record };
}

function environmentRequestV1(requestId: number, record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "environment_request", requestId, record };
}

function startExportRequestV1(
  requestId: number,
  workspaceSessionId: string,
  exportId: string,
  expectedCheckpointId = "checkpoint.1",
): Record<string, unknown> {
  return controlRequestV1(requestId, {
    method: "start_export",
    exportId,
    fileName: "sillyos-workspace.zip",
    workspaceSessionId,
    expectedCheckpointId,
    expectedGeneration: 1,
    sourceRevision: 1,
    baseRevision: 1,
  });
}

function prepareSnapshotRequestV1(
  requestId: number,
  workspaceSessionId: string,
  overrides: Readonly<
    Partial<{
      snapshotId: string;
      publicationId: string;
      expectedCheckpointId: string;
      expectedGeneration: number;
      sourceRevision: number;
      baseRevision: number;
    }>
  > = {},
): Record<string, unknown> {
  return controlRequestV1(requestId, {
    method: "prepare_snapshot",
    workspaceSessionId,
    snapshotId: overrides.snapshotId ?? "snapshot.preview.1",
    publicationId: overrides.publicationId ?? "proposal.preview.1",
    expectedCheckpointId: overrides.expectedCheckpointId ?? "checkpoint.1",
    expectedGeneration: overrides.expectedGeneration ?? 1,
    sourceRevision: overrides.sourceRevision ?? 2,
    baseRevision: overrides.baseRevision ?? 1,
  });
}

async function flushEnvironmentV1(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

async function waitForEnvironmentResponseV1(
  port: FakeMessagePortV1,
  requestId: number,
): Promise<
  Extract<
    BrowserWorkspaceHostEnvironmentOutboundMessageV1,
    { readonly kind: "environment_response" }
  >
> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = port.messages.findLast(
      (
        message,
      ): message is Extract<
        BrowserWorkspaceHostEnvironmentOutboundMessageV1,
        { readonly kind: "environment_response" }
      > => message.kind === "environment_response" && message.requestId === requestId,
    );
    if (response !== undefined) return response;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Timed out waiting for environment response ${String(requestId)}`);
}

function lastV1<T>(values: readonly T[]): T {
  const value = values.at(-1);
  if (value === undefined) throw new Error("expected a message");
  return value;
}

async function openDownloadWorkspaceV1(workspaceSessionId: string) {
  const bootstrap = new FakeBootstrapV1();
  const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
  const runtime = createBrowserWorkspaceHostRuntimeV1({
    bootstrap,
    postControlMessage: (message) => controls.push(message),
    createWorkspaceSessionId: () => workspaceSessionId,
    createCheckpointId: () => "checkpoint.download.2",
  });
  await runtime.receiveControl(controlRequestV1(1, {
    method: "create_candidate",
    programId: programIdV1,
    workspaceId: workspaceIdV1,
  }));
  const anchor = (lastV1(controls) as {
    readonly response: {
      readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    };
  }).response.candidate.anchor;
  await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
  const port = new FakeMessagePortV1();
  await runtime.receiveControl(
    controlRequestV1(3, {
      method: "attach_environment",
      workspaceSessionId,
    }),
    [port],
  );
  port.send(environmentRequestV1(4, {
    method: "begin_run",
    binding: {
      revision: 1,
      programId: programIdV1,
      workspaceId: workspaceIdV1,
      workspaceSessionId,
      expectedGeneration: 1,
    },
    sessionId: "pi-session.download",
    runId: "pi-run.download",
  }));
  port.send(environmentRequestV1(5, {
    method: "begin_tool",
    toolCallId: "pi-tool.download.1",
    tool: "download",
  }));
  await waitForEnvironmentResponseV1(port, 5);
  const volume = bootstrap.volumes.get(anchor.volumeId);
  if (volume === undefined) throw new Error("expected fake download volume");
  return { bootstrap, runtime, port, volume };
}

describe("SillyOS Browser Workspace Host runtime", () => {
  it("reports advisory Sandbox storage and purges idempotently only while idle", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      storageManagement: bootstrap,
      postControlMessage: (message) => controls.push(message),
    });

    await runtime.receiveControl(controlRequestV1(1, { method: "inspect_storage" }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "inspect_storage",
        storage: {
          scope: "sandbox_origin_advisory",
          persisted: true,
          usageBytes: 128,
          quotaBytes: 512,
        },
      },
    });
    for (const requestId of [2, 3]) {
      await runtime.receiveControl(controlRequestV1(requestId, {
        method: "purge_all_workspaces",
      }));
      expect(lastV1(controls)).toMatchObject({
        ok: true,
        response: { method: "purge_all_workspaces", result: { kind: "purged" } },
      });
    }
    expect(bootstrap.purgeCalls).toBe(2);

    await runtime.receiveControl(controlRequestV1(4, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    await runtime.receiveControl(controlRequestV1(5, { method: "purge_all_workspaces" }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_busy" });
    expect(bootstrap.purgeCalls).toBe(2);

    const created = controls.at(-2);
    if (created?.kind !== "control_response" || !created.ok) {
      throw new Error("expected candidate response");
    }
    if (created.response.method !== "create_candidate") {
      throw new Error("expected candidate response method");
    }
    await runtime.receiveControl(controlRequestV1(6, {
      method: "open_workspace",
      anchor: created.response.candidate.anchor,
    }));
    const opened = lastV1(controls);
    if (!opened.ok || !("snapshot" in opened.response)) {
      throw new Error("expected open workspace response");
    }
    await runtime.receiveControl(controlRequestV1(7, { method: "purge_all_workspaces" }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_busy" });
    await runtime.receiveControl(controlRequestV1(8, {
      method: "close_workspace",
      workspaceSessionId: opened.response.snapshot.descriptor.workspaceSessionId,
    }));
    await runtime.receiveControl(controlRequestV1(9, { method: "purge_all_workspaces" }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: { method: "purge_all_workspaces" },
    });
    expect(bootstrap.purgeCalls).toBe(3);
    await runtime.dispose();
  });

  it("imports an admitted binary file into the open candidate without a Pi payload ceiling", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let checkpointOrdinal = 1;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.import.1",
      createCheckpointId: () => `checkpoint.import.${String(++checkpointOrdinal)}`,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const created = lastV1(controls);
    if (!created.ok || created.response.method !== "create_candidate") {
      throw new Error("expected candidate response");
    }
    const anchor = created.response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));

    const bytes = new Uint8Array(1024 * 1024 + 1);
    bytes[0] = 17;
    bytes[bytes.byteLength - 1] = 23;
    await runtime.receiveControl(controlRequestV1(3, {
      method: "import_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.1",
      expectedGeneration: 1,
      path: "imports/source.bin",
      bytes,
    }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "import_file",
        changed: true,
        snapshot: {
          checkpointId: "checkpoint.import.2",
          descriptor: { generation: 2 },
        },
      },
    });
    const volume = bootstrap.volumes.get(anchor.volumeId);
    const imported = volume?.files.get("imports/source.bin");
    expect(imported).toBeInstanceOf(Uint8Array);
    expect(imported?.byteLength).toBe(bytes.byteLength);
    expect(imported?.[0]).toBe(17);
    expect(imported?.at(-1)).toBe(23);

    await runtime.receiveControl(controlRequestV1(4, {
      method: "import_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.import.2",
      expectedGeneration: 2,
      path: "imports/source.bin",
      bytes,
    }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "import_file",
        changed: false,
        snapshot: {
          checkpointId: "checkpoint.import.2",
          descriptor: { generation: 2 },
        },
      },
    });

    await runtime.receiveControl(controlRequestV1(5, {
      method: "read_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.import.2",
      expectedGeneration: 2,
      path: "imports/source.bin",
    }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "read_file",
        bytes,
        snapshot: {
          checkpointId: "checkpoint.import.2",
          descriptor: { generation: 2 },
        },
      },
    });

    await runtime.receiveControl(controlRequestV1(6, {
      method: "read_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.1",
      expectedGeneration: 1,
      path: "imports/source.bin",
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_mismatch" });

    await runtime.receiveControl(controlRequestV1(7, {
      method: "import_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.1",
      expectedGeneration: 1,
      path: "imports/stale.bin",
      bytes: new Uint8Array(),
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_mismatch" });
    expect(volume?.files.has("imports/stale.bin")).toBe(false);

    await runtime.receiveControl(controlRequestV1(8, {
      method: "import_file",
      workspaceSessionId: "workspace-session.import.1",
      expectedCheckpointId: "checkpoint.import.2",
      expectedGeneration: 2,
      path: "../escape.bin",
      bytes: new Uint8Array(),
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "invalid_request" });
    await runtime.dispose();
  });

  it("stages Broker chunks before publishing one current download mutation", async () => {
    const opened = await openDownloadWorkspaceV1("workspace-session.download");
    const sink = new FakeMessagePortV1();
    opened.port.send(
      environmentRequestV1(6, {
        method: "open_download_sink",
        brokerRequestId: "network-download.1",
        destination: "/workspace/assets/item.bin",
        overwrite: false,
      }),
      [sink],
    );
    for (let attempt = 0; attempt < 50 && sink.messages.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    expect(sink.messages).toEqual([{
      revision: 1,
      kind: "network_broker_download_sink_ready",
      requestId: "network-download.1",
    }]);
    expect(opened.volume.files.has("assets/item.bin")).toBe(false);

    const bytes = new Uint8Array([1, 2, 3, 4]);
    sink.send({
      revision: 1,
      kind: "network_broker_download_response",
      requestId: "network-download.1",
      status: 200,
      contentType: "application/octet-stream",
      declaredBytes: bytes.byteLength,
    });
    await Promise.resolve();
    sink.send({
      revision: 1,
      kind: "network_broker_download_chunk",
      requestId: "network-download.1",
      sequence: 1,
      offset: 0,
      bytes: bytes.byteLength,
      chunk: bytes.buffer,
    });
    for (let attempt = 0; attempt < 50 && sink.messages.length < 2; attempt += 1) {
      await Promise.resolve();
    }
    expect(sink.messages.at(-1)).toEqual({
      revision: 1,
      kind: "network_broker_download_chunk_ack",
      requestId: "network-download.1",
      sequence: 1,
    });
    expect(opened.volume.files.has("assets/item.bin")).toBe(false);
    await Promise.resolve();

    sink.send({
      revision: 1,
      kind: "network_broker_download_complete",
      requestId: "network-download.1",
      bytes: bytes.byteLength,
      chunks: 1,
    });
    expect(await waitForEnvironmentResponseV1(opened.port, 6)).toMatchObject({
      ok: true,
      response: {
        method: "open_download_sink",
        result: {
          status: 200,
          bytes: bytes.byteLength,
          destination: "/workspace/assets/item.bin",
          generation: 2,
          effect: "changed",
        },
      },
    });
    expect(opened.volume.files.get("assets/item.bin")).toEqual(bytes);

    opened.port.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.download.1",
      outcome: "succeeded",
    }));
    await waitForEnvironmentResponseV1(opened.port, 7);
    expect(opened.port.messages.find((message) => message.kind === "workspace_receipt"))
      .toMatchObject({
        receipt: {
          tool: "download",
          effect: "changed",
          resultingGeneration: 2,
          changedPaths: ["assets/item.bin"],
        },
      });
    await opened.runtime.dispose();
  });

  it("does not publish a destination when the Broker reports a non-success response", async () => {
    const opened = await openDownloadWorkspaceV1("workspace-session.download-http");
    const sink = new FakeMessagePortV1();
    opened.port.send(
      environmentRequestV1(6, {
        method: "open_download_sink",
        brokerRequestId: "network-download.http",
        destination: "/workspace/assets/missing.bin",
        overwrite: false,
      }),
      [sink],
    );
    for (let attempt = 0; attempt < 50 && sink.messages.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    sink.send({
      revision: 1,
      kind: "network_broker_download_http_error",
      requestId: "network-download.http",
      status: 404,
      contentType: "text/plain",
      declaredBytes: null,
    });
    expect(await waitForEnvironmentResponseV1(opened.port, 6)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    expect(opened.volume.files.has("assets/missing.bin")).toBe(false);
    await opened.runtime.dispose();
  });

  it("rejects a Broker burst before the prior chunk is staged and acknowledged", async () => {
    const opened = await openDownloadWorkspaceV1("workspace-session.download-backpressure");
    const sink = new FakeMessagePortV1();
    opened.port.send(
      environmentRequestV1(6, {
        method: "open_download_sink",
        brokerRequestId: "network-download.backpressure",
        destination: "/workspace/assets/burst.bin",
        overwrite: false,
      }),
      [sink],
    );
    for (let attempt = 0; attempt < 50 && sink.messages.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    sink.send({
      revision: 1,
      kind: "network_broker_download_response",
      requestId: "network-download.backpressure",
      status: 200,
      contentType: "application/octet-stream",
      declaredBytes: 2,
    });
    await Promise.resolve();
    sink.send({
      revision: 1,
      kind: "network_broker_download_chunk",
      requestId: "network-download.backpressure",
      sequence: 1,
      offset: 0,
      bytes: 1,
      chunk: new Uint8Array([1]).buffer,
    });
    sink.send({
      revision: 1,
      kind: "network_broker_download_chunk",
      requestId: "network-download.backpressure",
      sequence: 2,
      offset: 1,
      bytes: 1,
      chunk: new Uint8Array([2]).buffer,
    });

    expect(await waitForEnvironmentResponseV1(opened.port, 6)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    expect(sink.messages).toContainEqual({
      revision: 1,
      kind: "network_broker_download_sink_abort",
      requestId: "network-download.backpressure",
      code: "sink_failed",
    });
    expect(
      sink.messages.some((message) =>
        (message as unknown as Readonly<Record<string, unknown>>).kind ===
          "network_broker_download_chunk_ack"
      ),
    ).toBe(false);
    expect(opened.volume.files.has("assets/burst.bin")).toBe(false);
    await opened.runtime.dispose();
  });

  it("rejects and closes unexpected authority transferred with a Broker record", async () => {
    const opened = await openDownloadWorkspaceV1("workspace-session.download-extra-port");
    const sink = new FakeMessagePortV1();
    const unexpectedPort = new FakeMessagePortV1();
    opened.port.send(
      environmentRequestV1(6, {
        method: "open_download_sink",
        brokerRequestId: "network-download.extra-port",
        destination: "/workspace/assets/extra-port.bin",
        overwrite: false,
      }),
      [sink],
    );
    for (let attempt = 0; attempt < 50 && sink.messages.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    sink.send({
      revision: 1,
      kind: "network_broker_download_response",
      requestId: "network-download.extra-port",
      status: 200,
      contentType: "application/octet-stream",
      declaredBytes: 1,
    }, [unexpectedPort]);

    expect(await waitForEnvironmentResponseV1(opened.port, 6)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    expect(unexpectedPort.closeCalls).toBe(1);
    expect(sink.messages).toContainEqual({
      revision: 1,
      kind: "network_broker_download_sink_abort",
      requestId: "network-download.extra-port",
      code: "sink_failed",
    });
    expect(opened.volume.files.has("assets/extra-port.bin")).toBe(false);
    await opened.runtime.dispose();
  });

  it("prepares, discovers, adopts, and protects one immutable snapshot without advancing the head", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.snapshot";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.files.set("AGENTS.md", new TextEncoder().encode("snapshot instructions"));
    volume.files.set("src/main.ts", new TextEncoder().encode("export const value = 1;"));
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));

    await runtime.receiveControl(prepareSnapshotRequestV1(3, workspaceSessionId));
    const receipt = (lastV1(controls) as {
      readonly response: {
        readonly method: "prepare_snapshot";
        readonly receipt: WorkspaceImmutableSnapshotReceiptV1;
      };
    }).response.receipt;
    expect(receipt).toEqual({
      revision: 1,
      snapshotId: "snapshot.preview.1",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
      volumeId: anchor.volumeId,
      workspaceFormat: 1,
      publicationId: "proposal.preview.1",
      sourceRevision: 2,
      baseRevision: 1,
      checkpointId: "checkpoint.1",
      generation: 1,
      fileCount: 2,
      archiveBytes: 44,
    });
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.1", generation: 1 });

    await runtime.receiveControl(controlRequestV1(4, {
      method: "query_snapshot_candidate",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toEqual({
      revision: 1,
      kind: "control_response",
      requestId: 4,
      ok: true,
      response: { method: "query_snapshot_candidate", receipt },
    });

    await runtime.receiveControl(prepareSnapshotRequestV1(5, workspaceSessionId));
    expect(lastV1(controls)).toMatchObject({
      requestId: 5,
      ok: true,
      response: { method: "prepare_snapshot", receipt },
    });
    await runtime.receiveControl(prepareSnapshotRequestV1(6, workspaceSessionId, {
      publicationId: "proposal.preview.conflict",
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 6,
      ok: false,
      code: "snapshot_mismatch",
    });

    const mismatchedReceipt = { ...receipt, sourceRevision: receipt.sourceRevision + 1 };
    await runtime.receiveControl(controlRequestV1(7, {
      method: "discard_snapshot",
      workspaceSessionId,
      expected: mismatchedReceipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 7,
      ok: false,
      code: "snapshot_mismatch",
    });
    expect(volume.preparedSnapshot).toEqual(receipt);

    await runtime.receiveControl(controlRequestV1(8, {
      method: "adopt_snapshot",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toEqual({
      revision: 1,
      kind: "control_response",
      requestId: 8,
      ok: true,
      response: {
        method: "adopt_snapshot",
        result: "adopted",
        snapshotId: receipt.snapshotId,
      },
    });
    await runtime.receiveControl(controlRequestV1(9, {
      method: "query_snapshot_candidate",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 9,
      ok: true,
      response: { method: "query_snapshot_candidate", receipt: null },
    });
    await runtime.receiveControl(controlRequestV1(10, {
      method: "query_retained_snapshot",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 10,
      ok: true,
      response: { method: "query_retained_snapshot", receipt },
    });
    await runtime.receiveControl(controlRequestV1(11, {
      method: "adopt_snapshot",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 11,
      ok: true,
      response: { method: "adopt_snapshot", result: "already_retained" },
    });
    await runtime.receiveControl(controlRequestV1(12, {
      method: "discard_snapshot",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 12,
      ok: true,
      response: { method: "discard_snapshot", result: "retained" },
    });
    await runtime.receiveControl(controlRequestV1(13, {
      method: "query_workspace",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 13,
      ok: true,
      response: {
        method: "query_workspace",
        snapshot: {
          checkpointId: "checkpoint.1",
          descriptor: { generation: 1 },
        },
      },
    });
    await runtime.dispose();
  });

  it("rejects a stale immutable snapshot head when no exact candidate exists", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.snapshot-stale";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));

    await runtime.receiveControl(prepareSnapshotRequestV1(3, workspaceSessionId, {
      expectedGeneration: 2,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 3,
      ok: false,
      code: "snapshot_stale",
    });
    expect(volume.preparedSnapshot).toBeNull();
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.1", generation: 1 });
    await runtime.dispose();
  });

  it("reopens an exact candidate without a fence and rejects stale publication resume", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.snapshot-idempotent";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    await runtime.receiveControl(prepareSnapshotRequestV1(3, workspaceSessionId));
    const prepared = lastV1(controls) as {
      readonly response: { readonly receipt: WorkspaceImmutableSnapshotReceiptV1 };
    };
    expect(prepared).toMatchObject({ requestId: 3, ok: true });

    await runtime.receiveControl(controlRequestV1(4, {
      method: "close_workspace",
      workspaceSessionId,
    }));

    volume.head = {
      ...volume.head,
      checkpointId: "checkpoint.after-snapshot.1",
      generation: 2,
    };
    await runtime.receiveControl(controlRequestV1(5, { method: "open_workspace", anchor }));
    await runtime.receiveControl(prepareSnapshotRequestV1(6, workspaceSessionId));
    expect(lastV1(controls)).toEqual({ ...prepared, requestId: 6 });

    const environmentPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(7, { method: "attach_environment", workspaceSessionId }),
      [environmentPort],
    );
    environmentPort.send(environmentRequestV1(8, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 2,
      },
      sessionId: "pi-session.snapshot-reopen.1",
      runId: "pi-run.snapshot-reopen.1",
    }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 8)).toMatchObject({ ok: true });
    environmentPort.send(environmentRequestV1(9, { method: "end_run" }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 9)).toMatchObject({ ok: true });

    await runtime.receiveControl(controlRequestV1(10, {
      method: "resume_snapshot_publication",
      workspaceSessionId,
      expected: prepared.response.receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 10,
      ok: false,
      code: "snapshot_stale",
    });
    await runtime.dispose();
  });

  it("captures an exact review head and reacquires the publication fence after a head-equal reopen", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.snapshot-resume";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));

    await runtime.receiveControl(controlRequestV1(3, {
      method: "capture_stable_head",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 3,
      ok: true,
      response: {
        method: "capture_stable_head",
        snapshot: { checkpointId: "checkpoint.1", descriptor: { generation: 1 } },
      },
    });

    await runtime.receiveControl(prepareSnapshotRequestV1(4, workspaceSessionId));
    const receipt = (lastV1(controls) as {
      readonly response: { readonly receipt: WorkspaceImmutableSnapshotReceiptV1 };
    }).response.receipt;
    await runtime.receiveControl(controlRequestV1(5, {
      method: "capture_stable_head",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 5,
      ok: false,
      code: "workspace_busy",
    });

    await runtime.receiveControl(controlRequestV1(6, {
      method: "close_workspace",
      workspaceSessionId,
    }));
    await runtime.receiveControl(controlRequestV1(7, { method: "open_workspace", anchor }));
    await runtime.receiveControl(prepareSnapshotRequestV1(8, workspaceSessionId));
    expect(lastV1(controls)).toMatchObject({
      requestId: 8,
      ok: true,
      response: { method: "prepare_snapshot", receipt },
    });

    await runtime.receiveControl(controlRequestV1(9, {
      method: "resume_snapshot_publication",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toEqual({
      revision: 1,
      kind: "control_response",
      requestId: 9,
      ok: true,
      response: { method: "resume_snapshot_publication", receipt },
    });
    await runtime.receiveControl(controlRequestV1(10, {
      method: "capture_stable_head",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 10,
      ok: false,
      code: "workspace_busy",
    });

    await runtime.receiveControl(controlRequestV1(11, {
      method: "discard_snapshot",
      workspaceSessionId,
      expected: receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 11,
      ok: true,
      response: { method: "discard_snapshot", result: "discarded" },
    });
    await runtime.receiveControl(controlRequestV1(12, {
      method: "capture_stable_head",
      workspaceSessionId,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 12,
      ok: true,
      response: { method: "capture_stable_head" },
    });
    await runtime.dispose();
  });

  it("fences immutable snapshot preparation against Pi runs and portable exports", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.snapshot-fence";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
      createObjectUrl: () => "blob:workspace.snapshot-fence",
      startDownload: async () => {},
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const environmentPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId }),
      [environmentPort],
    );
    environmentPort.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.snapshot-fence.1",
      runId: "pi-run.snapshot-fence.1",
    }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 4)).toMatchObject({ ok: true });
    await runtime.receiveControl(prepareSnapshotRequestV1(5, workspaceSessionId));
    expect(lastV1(controls)).toMatchObject({
      requestId: 5,
      ok: false,
      code: "workspace_busy",
    });
    environmentPort.send(environmentRequestV1(6, { method: "end_run" }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 6)).toMatchObject({ ok: true });

    let signalSnapshotStarted!: () => void;
    const snapshotStarted = new Promise<void>((resolve) => (signalSnapshotStarted = resolve));
    let releaseSnapshot!: () => void;
    volume.snapshotPrepareStarted = signalSnapshotStarted;
    volume.snapshotPrepareGate = new Promise<void>((resolve) => (releaseSnapshot = resolve));
    const prepare = runtime.receiveControl(prepareSnapshotRequestV1(7, workspaceSessionId));
    await snapshotStarted;
    environmentPort.send(environmentRequestV1(8, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.snapshot-fence.2",
      runId: "pi-run.snapshot-fence.2",
    }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 8)).toMatchObject({
      ok: false,
      code: "run_busy",
    });
    volume.snapshotPrepareGate = null;
    releaseSnapshot();
    await prepare;
    const prepared = lastV1(controls) as {
      readonly response: { readonly receipt: WorkspaceImmutableSnapshotReceiptV1 };
    };
    expect(prepared).toMatchObject({
      requestId: 7,
      ok: true,
      response: { method: "prepare_snapshot" },
    });

    environmentPort.send(environmentRequestV1(9, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.snapshot-fence.3",
      runId: "pi-run.snapshot-fence.3",
    }));
    expect(await waitForEnvironmentResponseV1(environmentPort, 9)).toMatchObject({
      ok: false,
      code: "run_busy",
    });

    const fencedExportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(10, workspaceSessionId, "export.snapshot-fence.blocked"),
      [fencedExportPort],
    );
    expect(lastV1(controls)).toMatchObject({
      requestId: 10,
      ok: false,
      code: "workspace_busy",
    });
    expect(fencedExportPort.closeCalls).toBe(1);

    await runtime.receiveControl(controlRequestV1(11, {
      method: "adopt_snapshot",
      workspaceSessionId,
      expected: prepared.response.receipt,
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 11,
      ok: true,
      response: { method: "adopt_snapshot", result: "adopted" },
    });

    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(12, workspaceSessionId, "export.snapshot-fence.1"),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });
    await runtime.receiveControl(prepareSnapshotRequestV1(13, workspaceSessionId, {
      snapshotId: "snapshot.preview.2",
    }));
    expect(lastV1(controls)).toMatchObject({
      requestId: 13,
      ok: false,
      code: "workspace_busy",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.snapshot-fence.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_download_started",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.snapshot-fence.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_released" });
    await runtime.dispose();
  });

  it("projects native and shell volume capacity failures without advancing the head", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.capacity",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.replaceError = new BrowserWorkspaceHostStorageErrorV1(
      "capacity_exceeded",
      "Workspace capacity was exhausted",
    );
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.capacity",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.capacity",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.capacity",
      runId: "pi-run.capacity",
    }));
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.capacity",
      tool: "write",
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(6, {
      method: "write_file",
      path: "capacity.md",
      bytes: new TextEncoder().encode("will not fit"),
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 6,
      ok: false,
      code: "request_failed",
    });
    port.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.capacity",
      outcome: "failed",
    }));
    await flushEnvironmentV1();
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          outcome: "failed",
          effect: "none",
          resultingGeneration: 1,
          diagnosticCode: "capacity_exceeded",
        },
      },
    );
    expect(volume.head.generation).toBe(1);
    expect(volume.files.has("capacity.md")).toBe(false);
    port.send(environmentRequestV1(8, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash-capacity",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 8);
    port.send(environmentRequestV1(9, {
      method: "execute_shell",
      command: "printf blocked | tee bash-capacity.md > /dev/null",
      cwd: "/workspace",
      env: {},
      inheritEnv: true,
      timeoutMilliseconds: null,
    }));
    expect(await waitForEnvironmentResponseV1(port, 9)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    port.send(environmentRequestV1(10, {
      method: "end_tool",
      toolCallId: "pi-tool.bash-capacity",
      outcome: "failed",
    }));
    await waitForEnvironmentResponseV1(port, 10);
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          outcome: "failed",
          effect: "none",
          resultingGeneration: 1,
          diagnosticCode: "capacity_exceeded",
        },
      },
    );
    expect(volume.files.has("bash-capacity.md")).toBe(false);
    volume.replaceError = null;
    volume.metadataSizes.set("oversized-shell-read.bin", 16 * 1024 * 1024 + 1);
    port.send(environmentRequestV1(11, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash-read-capacity",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 11);
    port.send(environmentRequestV1(12, {
      method: "execute_shell",
      command: "cat oversized-shell-read.bin",
      cwd: "/workspace",
      env: {},
      inheritEnv: true,
      timeoutMilliseconds: null,
    }));
    expect(await waitForEnvironmentResponseV1(port, 12)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    port.send(environmentRequestV1(13, {
      method: "end_tool",
      toolCallId: "pi-tool.bash-read-capacity",
      outcome: "failed",
    }));
    await waitForEnvironmentResponseV1(port, 13);
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          outcome: "failed",
          effect: "none",
          resultingGeneration: 1,
          diagnosticCode: "capacity_exceeded",
        },
      },
    );
    await runtime.dispose();
  });

  it("keeps candidates session-free, publishes changed receipts before end_tool, and cold-reopens retained bytes", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let sessionCalls = 0;
    let checkpointCalls = 1;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => `workspace-session.${String(++sessionCalls)}`,
      createCheckpointId: () => `checkpoint.${String(++checkpointCalls)}`,
    });

    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    expect(sessionCalls).toBe(0);
    const candidate = lastV1(controls);
    expect(candidate).toMatchObject({ response: { method: "create_candidate" } });
    const anchor = (candidate as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;

    await runtime.receiveControl(
      controlRequestV1(2, { method: "open_workspace", anchor }),
    );
    expect(lastV1(controls)).toMatchObject({
      response: {
        method: "open_workspace",
        snapshot: { checkpointId: "checkpoint.1", descriptor: { generation: 1 } },
      },
    });
    const workspaceSessionId = "workspace-session.1";
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId }),
      [port],
    );
    expect(port.startCalls).toBe(1);
    const firstBytes = new TextEncoder().encode("first");

    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.1",
      runId: "pi-run.1",
    }));
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.write.1",
      tool: "write",
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(6, {
      method: "write_file",
      path: "program.md",
      bytes: firstBytes,
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.write.1",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();
    const receiptIndex = port.messages.findIndex((message) => message.kind === "workspace_receipt");
    const endToolIndex = port.messages.findIndex((message) =>
      message.kind === "environment_response" && message.ok &&
      message.response.method === "end_tool"
    );
    expect(receiptIndex).toBeGreaterThanOrEqual(0);
    expect(receiptIndex).toBeLessThan(endToolIndex);
    expect(port.messages[receiptIndex]).toMatchObject({
      receipt: { outcome: "succeeded", effect: "changed", resultingGeneration: 2 },
    });

    port.send(environmentRequestV1(8, {
      method: "begin_tool",
      toolCallId: "pi-tool.write.2",
      tool: "write",
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(9, {
      method: "write_file",
      path: "program.md",
      bytes: firstBytes,
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(10, {
      method: "end_tool",
      toolCallId: "pi-tool.write.2",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      response: { method: "end_tool", generation: 2 },
    });

    port.send(environmentRequestV1(101, {
      method: "begin_tool",
      toolCallId: "pi-tool.read.1",
      tool: "read",
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(102, {
      method: "read_binary_file",
      path: "program.md",
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 102,
      ok: true,
      response: { method: "read_binary_file", value: firstBytes },
    });
    port.send(environmentRequestV1(103, {
      method: "end_tool",
      toolCallId: "pi-tool.read.1",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();

    const volume = bootstrap.volumes.get(anchor.volumeId);
    expect(volume?.readFileRangeRequests).toEqual([{
      path: "program.md",
      offset: 0,
      length: firstBytes.byteLength,
    }]);
    expect(volume?.sourceReadRequests).toEqual([
      {
        path: "program.md",
        offset: 0,
        length: firstBytes.byteLength,
        byteLength: firstBytes.byteLength,
      },
      {
        path: "program.md",
        offset: 0,
        length: firstBytes.byteLength,
        byteLength: firstBytes.byteLength,
      },
    ]);
    expect(
      volume?.sourceReadRequests.every(({ length }) =>
        length <= browserWorkspaceNativePiToolPayloadMaximumBytesV1
      ),
    ).toBe(true);

    await runtime.receiveControl(
      controlRequestV1(11, { method: "close_workspace", workspaceSessionId }),
    );
    port.send(environmentRequestV1(11, {
      method: "acknowledge_receipts",
      throughSequence: 2,
    }));
    await flushEnvironmentV1();
    await runtime.receiveControl(controlRequestV1(12, { method: "open_workspace", anchor }));
    expect(lastV1(controls)).toMatchObject({
      response: {
        method: "open_workspace",
        snapshot: {
          checkpointId: "checkpoint.2",
          descriptor: { workspaceSessionId: "workspace-session.2", generation: 2 },
        },
      },
    });
    expect(bootstrap.volumes.get(anchor.volumeId)?.files.get("program.md")).toEqual(
      firstBytes,
    );
    await runtime.dispose();
  });

  it("projects addressed file metadata and one edit replacement into an exact edit receipt", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.edit",
      createCheckpointId: () => "checkpoint.edit.2",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    const before = new TextEncoder().encode("before\n");
    const after = new TextEncoder().encode("after\n");
    volume.files.set("program.md", before);

    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.edit",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.edit",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.edit",
      runId: "pi-run.edit",
    }));
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.edit.1",
      tool: "edit",
    }));
    await flushEnvironmentV1();

    port.send(environmentRequestV1(6, { method: "file_info", path: "program.md" }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 6,
      ok: true,
      response: {
        method: "file_info",
        value: {
          name: "program.md",
          path: "/workspace/program.md",
          kind: "file",
          size: before.byteLength,
          mtimeMs: fileMtimeMsV1,
        },
      },
    });
    port.send(environmentRequestV1(7, { method: "read_binary_file", path: "program.md" }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 7,
      ok: true,
      response: { method: "read_binary_file", value: before },
    });
    port.send(environmentRequestV1(8, {
      method: "write_file",
      path: "program.md",
      bytes: after,
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 8,
      ok: true,
      response: { method: "write_file", value: null },
    });
    port.send(environmentRequestV1(9, {
      method: "end_tool",
      toolCallId: "pi-tool.edit.1",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();

    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          toolCallId: "pi-tool.edit.1",
          tool: "edit",
          baseGeneration: 1,
          resultingGeneration: 2,
          outcome: "succeeded",
          effect: "changed",
          changedPaths: ["program.md"],
          diagnosticCode: null,
        },
      },
    );
    expect(volume.files.get("program.md")).toEqual(after);
    expect(volume.sourceReadRequests).toEqual([{
      path: "program.md",
      offset: 0,
      length: after.byteLength,
      byteLength: after.byteLength,
    }]);
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.edit.2", generation: 2 });
    await runtime.dispose();
  });

  it("executes just-bash through the shell protocol against the sole volume and one multi-effect receipt", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let checkpointCalls = 1;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.bash",
      createCheckpointId: () => `checkpoint.bash.${String(++checkpointCalls)}`,
      createShellTempFileId: () => "overflow.1",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.bash",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.bash",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.bash",
      runId: "pi-run.bash",
    }));
    await waitForEnvironmentResponseV1(port, 4);
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash.1",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 5);
    port.send(environmentRequestV1(6, {
      method: "execute_shell",
      command: "printf 'alpha\\nbeta\\n' | grep beta > result.txt; cat result.txt",
      cwd: "/workspace",
      env: { SILLY_VALUE: "admitted" },
      inheritEnv: true,
      timeoutMilliseconds: null,
    }));
    expect(await waitForEnvironmentResponseV1(port, 6)).toMatchObject({
      ok: true,
      response: {
        method: "execute_shell",
        termination: "completed",
        stdout: "beta\n",
        stderr: "",
        exitCode: 0,
      },
    });
    port.send(environmentRequestV1(7, {
      method: "create_temp_file",
      prefix: "bash-",
      suffix: ".log",
    }));
    expect(await waitForEnvironmentResponseV1(port, 7)).toMatchObject({
      ok: true,
      response: {
        method: "create_temp_file",
        value: "/workspace/.sillyos/tmp/bash-overflow.1.log",
      },
    });
    port.send(environmentRequestV1(8, {
      method: "append_file",
      path: "/workspace/.sillyos/tmp/bash-overflow.1.log",
      bytes: new TextEncoder().encode("complete output\n"),
    }));
    await waitForEnvironmentResponseV1(port, 8);
    port.send(environmentRequestV1(9, {
      method: "end_tool",
      toolCallId: "pi-tool.bash.1",
      outcome: "succeeded",
    }));
    const ended = await waitForEnvironmentResponseV1(port, 9);
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    expect(ended).toMatchObject({
      ok: true,
      response: { method: "end_tool", generation: volume.head.generation },
    });
    expect(new TextDecoder().decode(volume.files.get("result.txt"))).toBe("beta\n");
    expect(
      new TextDecoder().decode(volume.files.get(".sillyos/tmp/bash-overflow.1.log")),
    ).toBe("complete output\n");
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          baseGeneration: 1,
          resultingGeneration: volume.head.generation,
          outcome: "succeeded",
          effect: "changed",
          changedPaths: ["result.txt", ".sillyos/tmp/bash-overflow.1.log"],
          diagnosticCode: null,
        },
      },
    );
    expect(volume.head.generation).toBeGreaterThan(3);
    await runtime.dispose();
  });

  it("applies one requested timeout across the Host path view before effects", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.bash-path-timeout";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
      createCheckpointId: () => "checkpoint.bash-path-timeout.unexpected",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.holdNextListUntilAbort = true;
    let notifyListEntered: (() => void) | null = null;
    const listEntered = new Promise<void>((resolve) => {
      notifyListEntered = resolve;
    });
    volume.heldListEntered = () => notifyListEntered?.();

    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.bash-path-timeout",
      runId: "pi-run.bash-path-timeout",
    }));
    await waitForEnvironmentResponseV1(port, 4);
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash-path-timeout.1",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 5);
    port.send(environmentRequestV1(6, {
      method: "execute_shell",
      command: "printf too-late > should-not-exist.txt",
      cwd: "/workspace",
      env: {},
      inheritEnv: true,
      timeoutMilliseconds: 100,
    }));
    await listEntered;
    expect(await waitForEnvironmentResponseV1(port, 6)).toMatchObject({
      ok: true,
      response: {
        method: "execute_shell",
        termination: "timeout",
        stdout: "",
        stderr: "",
        exitCode: null,
      },
    });
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.1", generation: 1 });
    expect(volume.files.has("should-not-exist.txt")).toBe(false);

    port.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.bash-path-timeout.1",
      outcome: "failed",
    }));
    await waitForEnvironmentResponseV1(port, 7);
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          baseGeneration: 1,
          resultingGeneration: 1,
          outcome: "failed",
          effect: "none",
          changedPaths: [],
          diagnosticCode: "execution_failed",
        },
      },
    );
    await runtime.dispose();
  });

  it("persists completed native Pi bash overflow through the real Host environment", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let checkpointCalls = 1;
    const workspaceSessionId = "workspace-session.native-overflow";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
      createCheckpointId: () => `checkpoint.native-overflow.${String(++checkpointCalls)}`,
      createShellTempFileId: () => "native-overflow.1",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));

    const channel = new MessageChannel();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId }),
      [channel.port1 as unknown as BrowserWorkspaceHostMessagePortV1],
    );
    const client = createBrowserWorkspaceEnvironmentClientV1({
      port: channel.port2 as unknown as BrowserWorkspaceEnvironmentMessagePortV1,
      descriptor: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        generation: 1,
      },
    });
    const begun = await client.beginAgentRun({
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      piSessionId: "pi-session.native-overflow",
      piRunId: "pi-run.native-overflow",
    });
    expect(begun.kind).toBe("started");
    if (begun.kind !== "started") throw new Error("expected native Pi run to start");

    const bash = bindPiWorkspaceBashToolV1(createBashTool(), begun.run);
    const result = await bash.execute(
      "pi-tool.native-overflow.1",
      { command: "printf '%060000d' 0" },
    );
    const overflowPath = "/workspace/.sillyos/tmp/bash-native-overflow.1.log";
    expect(result.details).toMatchObject({
      fullOutputPath: overflowPath,
      truncation: { truncated: true },
    });
    expect(client.getDescriptor().generation).toBe(3);
    expect(client.queryMutationRecords()).toEqual([expect.objectContaining({
      revision: 1,
      sequence: 1,
      programId: programIdV1,
      workspaceId: workspaceIdV1,
      workspaceSessionId,
      piSessionId: "pi-session.native-overflow",
      piRunId: "pi-run.native-overflow",
      toolCallId: "pi-tool.native-overflow.1",
      tool: "bash",
      expectedGeneration: 1,
      baseGeneration: 1,
      resultingGeneration: 3,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [".sillyos/tmp/bash-native-overflow.1.log"],
      diagnosticCode: null,
    })]);
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    const persisted = volume.files.get(".sillyos/tmp/bash-native-overflow.1.log");
    expect(persisted).toBeDefined();
    expect(new TextDecoder().decode(persisted)).toBe("0".repeat(60_000));

    begun.run.finish();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    client.dispose();
    await runtime.dispose();
  });

  it("lets native Pi drain its bounded overflow file after bash cancellation", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let checkpointCalls = 1;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.bash-cancel-overflow",
      createCheckpointId: () => `checkpoint.bash-cancel.${String(++checkpointCalls)}`,
      createShellTempFileId: () => "cancelled.1",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.bash-cancel-overflow",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.bash-cancel-overflow",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.bash-cancel-overflow",
      runId: "pi-run.bash-cancel-overflow",
    }));
    await waitForEnvironmentResponseV1(port, 4);
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash-cancel-overflow.1",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 5);
    port.send(environmentRequestV1(6, {
      method: "cancel_tool",
      toolCallId: "pi-tool.bash-cancel-overflow.1",
    }));
    await waitForEnvironmentResponseV1(port, 6);
    port.send(environmentRequestV1(7, {
      method: "append_file",
      path: "/workspace/not-an-overflow.log",
      bytes: new TextEncoder().encode("must not land\n"),
    }));
    expect(await waitForEnvironmentResponseV1(port, 7)).toMatchObject({
      ok: false,
      code: "workspace_closed",
    });
    port.send(environmentRequestV1(8, {
      method: "create_temp_file",
      prefix: "bash-",
      suffix: ".log",
    }));
    expect(await waitForEnvironmentResponseV1(port, 8)).toMatchObject({
      ok: true,
      response: {
        method: "create_temp_file",
        value: "/workspace/.sillyos/tmp/bash-cancelled.1.log",
      },
    });
    port.send(environmentRequestV1(9, {
      method: "append_file",
      path: "/workspace/.sillyos/tmp/bash-cancelled.1.log",
      bytes: new TextEncoder().encode("cancelled aggregate\n"),
    }));
    await waitForEnvironmentResponseV1(port, 9);
    port.send(environmentRequestV1(10, {
      method: "end_tool",
      toolCallId: "pi-tool.bash-cancel-overflow.1",
      outcome: "cancelled",
    }));
    await waitForEnvironmentResponseV1(port, 10);

    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    expect(
      new TextDecoder().decode(volume.files.get(".sillyos/tmp/bash-cancelled.1.log")),
    ).toBe("cancelled aggregate\n");
    expect(volume.files.has("not-an-overflow.log")).toBe(false);
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          baseGeneration: 1,
          resultingGeneration: volume.head.generation,
          outcome: "cancelled",
          effect: "changed",
          changedPaths: [".sillyos/tmp/bash-cancelled.1.log"],
          diagnosticCode: "cancelled",
        },
      },
    );
    await runtime.dispose();
  });

  it("reconciles facade-rejected attempts before a Pi overflow request", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let checkpointCalls = 1;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.bash-capacity",
      createCheckpointId: () => `checkpoint.bash-capacity.${String(++checkpointCalls)}`,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.bash-capacity",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.bash-capacity",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.bash-capacity",
      runId: "pi-run.bash-capacity",
    }));
    await waitForEnvironmentResponseV1(port, 4);
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.bash-capacity.1",
      tool: "bash",
    }));
    await waitForEnvironmentResponseV1(port, 5);
    port.send(environmentRequestV1(6, {
      method: "execute_shell",
      command: Array.from(
        { length: 128 },
        () => "printf x | tee missing/blocked.log > /dev/null",
      ).join("; "),
      cwd: "/workspace",
      env: {},
      inheritEnv: true,
      timeoutMilliseconds: null,
    }));
    expect(await waitForEnvironmentResponseV1(port, 6)).toMatchObject({
      ok: true,
      response: {
        method: "execute_shell",
        termination: "completed",
      },
    });
    port.send(environmentRequestV1(7, {
      method: "create_temp_file",
      prefix: "bash-",
      suffix: ".log",
    }));
    expect(await waitForEnvironmentResponseV1(port, 7)).toMatchObject({
      ok: false,
      code: "request_failed",
    });
    port.send(environmentRequestV1(8, {
      method: "end_tool",
      toolCallId: "pi-tool.bash-capacity.1",
      outcome: "failed",
    }));
    await waitForEnvironmentResponseV1(port, 8);

    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    expect([...volume.files.keys()].some((path) => path.startsWith(".sillyos/tmp/"))).toBe(false);
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          tool: "bash",
          baseGeneration: 1,
          resultingGeneration: 1,
          outcome: "failed",
          effect: "none",
          changedPaths: [],
          diagnosticCode: "capacity_exceeded",
        },
      },
    );
    await runtime.dispose();
  });

  it("holds edit admission behind the bounded receipt queue until an acknowledgement frees capacity", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.edit-backpressure",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.edit-backpressure",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.edit-backpressure",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.edit-backpressure",
      runId: "pi-run.edit-backpressure",
    }));
    await flushEnvironmentV1();

    let requestId = 5;
    for (let index = 0; index < browserWorkspaceHostReceiptMaximumV1; index += 1) {
      const toolCallId = `pi-tool.edit.backpressure.${String(index + 1)}`;
      port.send(environmentRequestV1(requestId++, {
        method: "begin_tool",
        toolCallId,
        tool: "edit",
      }));
      await flushEnvironmentV1();
      port.send(environmentRequestV1(requestId++, {
        method: "end_tool",
        toolCallId,
        outcome: "failed",
      }));
      await flushEnvironmentV1();
    }
    expect(
      port.messages.filter((message) => message.kind === "workspace_receipt"),
    ).toHaveLength(browserWorkspaceHostReceiptMaximumV1);

    port.send(environmentRequestV1(requestId++, {
      method: "begin_tool",
      toolCallId: "pi-tool.edit.queue-full",
      tool: "edit",
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      ok: false,
      code: "receipt_queue_full",
    });

    port.send(environmentRequestV1(requestId++, {
      method: "acknowledge_receipts",
      throughSequence: 1,
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      ok: true,
      response: { method: "acknowledge_receipts", throughSequence: 1 },
    });
    port.send(environmentRequestV1(requestId, {
      method: "begin_tool",
      toolCallId: "pi-tool.edit.after-ack",
      tool: "edit",
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      ok: true,
      response: { method: "begin_tool", baseGeneration: 1 },
    });
    await runtime.dispose();
  });

  it("uses fresh collision-resistant session and changed-checkpoint identities after a Host restart", async () => {
    const bootstrap = new FakeBootstrapV1();
    const firstControls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const first = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => firstControls.push(message),
    });
    await first.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(firstControls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await first.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const firstOpened = (lastV1(firstControls) as {
      readonly response: {
        readonly snapshot: {
          readonly checkpointId: string;
          readonly descriptor: { readonly workspaceSessionId: string; readonly generation: number };
        };
      };
    }).response.snapshot;
    const firstPort = new FakeMessagePortV1();
    await first.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: firstOpened.descriptor.workspaceSessionId,
      }),
      [firstPort],
    );
    firstPort.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: firstOpened.descriptor.workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.restart.1",
      runId: "pi-run.restart.1",
    }));
    firstPort.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.restart.1",
      tool: "write",
    }));
    await flushEnvironmentV1();
    firstPort.send(environmentRequestV1(6, {
      method: "write_file",
      path: "restart.md",
      bytes: new TextEncoder().encode("first"),
    }));
    await flushEnvironmentV1();
    firstPort.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.restart.1",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();
    await first.receiveControl(controlRequestV1(8, {
      method: "query_workspace",
      workspaceSessionId: firstOpened.descriptor.workspaceSessionId,
    }));
    const firstChanged = (lastV1(firstControls) as {
      readonly response: { readonly snapshot: { readonly checkpointId: string } };
    }).response.snapshot;
    await first.receiveControl(controlRequestV1(9, {
      method: "close_workspace",
      workspaceSessionId: firstOpened.descriptor.workspaceSessionId,
    }));
    await first.dispose();

    const secondControls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const second = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => secondControls.push(message),
    });
    await second.receiveControl(controlRequestV1(10, { method: "open_workspace", anchor }));
    const reopened = (lastV1(secondControls) as {
      readonly response: {
        readonly snapshot: {
          readonly checkpointId: string;
          readonly descriptor: { readonly workspaceSessionId: string; readonly generation: number };
        };
      };
    }).response.snapshot;
    expect(reopened.descriptor.workspaceSessionId).not.toBe(
      firstOpened.descriptor.workspaceSessionId,
    );
    expect(reopened).toMatchObject({
      checkpointId: firstChanged.checkpointId,
      descriptor: { generation: 2 },
    });

    const secondPort = new FakeMessagePortV1();
    await second.receiveControl(
      controlRequestV1(11, {
        method: "attach_environment",
        workspaceSessionId: reopened.descriptor.workspaceSessionId,
      }),
      [secondPort],
    );
    secondPort.send(environmentRequestV1(12, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: reopened.descriptor.workspaceSessionId,
        expectedGeneration: 2,
      },
      sessionId: "pi-session.restart.2",
      runId: "pi-run.restart.2",
    }));
    secondPort.send(environmentRequestV1(13, {
      method: "begin_tool",
      toolCallId: "pi-tool.restart.2",
      tool: "write",
    }));
    await flushEnvironmentV1();
    secondPort.send(environmentRequestV1(14, {
      method: "write_file",
      path: "restart.md",
      bytes: new TextEncoder().encode("second"),
    }));
    await flushEnvironmentV1();
    secondPort.send(environmentRequestV1(15, {
      method: "end_tool",
      toolCallId: "pi-tool.restart.2",
      outcome: "succeeded",
    }));
    await flushEnvironmentV1();
    await second.receiveControl(controlRequestV1(16, {
      method: "query_workspace",
      workspaceSessionId: reopened.descriptor.workspaceSessionId,
    }));
    expect(lastV1(secondControls)).toMatchObject({
      response: {
        snapshot: {
          descriptor: { generation: 3 },
        },
      },
    });
    const secondChanged = (lastV1(secondControls) as {
      readonly response: { readonly snapshot: { readonly checkpointId: string } };
    }).response.snapshot;
    expect(secondChanged.checkpointId).not.toBe(firstChanged.checkpointId);
    await second.dispose();
  });

  it("returns a FileError after metadata-only oversized reads without requesting a range", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.oversized",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    })
      .response.candidate.anchor;
    bootstrap.volumes.get(anchor.volumeId)?.metadataSizes.set("large.bin", 16 * 1024 * 1024);
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.oversized",
      }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.oversized",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.oversized",
      runId: "pi-run.oversized",
    }));
    port.send(environmentRequestV1(31, {
      method: "begin_tool",
      toolCallId: "pi-tool.write.backslash",
      tool: "write",
    }));
    await flushEnvironmentV1();
    port.send(environmentRequestV1(32, {
      method: "write_file",
      path: "artifacts\\large.bin",
      bytes: new Uint8Array(),
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 32,
      ok: false,
      code: "request_failed",
      fileError: { code: "invalid", path: "artifacts\\large.bin" },
    });
    port.send(environmentRequestV1(33, {
      method: "end_tool",
      toolCallId: "pi-tool.write.backslash",
      outcome: "failed",
    }));
    await flushEnvironmentV1();
    expect(port.messages.findLast((message) => message.kind === "workspace_receipt")).toMatchObject(
      {
        receipt: {
          toolCallId: "pi-tool.write.backslash",
          outcome: "failed",
          effect: "none",
          diagnosticCode: "path_rejected",
        },
      },
    );
    port.send(
      environmentRequestV1(5, { method: "begin_tool", toolCallId: "pi-tool.read.1", tool: "read" }),
    );
    await flushEnvironmentV1();
    port.send(environmentRequestV1(6, { method: "read_binary_file", path: "large.bin" }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 6,
      ok: false,
      code: "request_failed",
      fileError: { code: "invalid", path: "/workspace/large.bin" },
    });
    expect(bootstrap.volumes.get(anchor.volumeId)).toMatchObject({
      statCalls: 1,
      readFileRangeRequests: [],
    });
    await runtime.dispose();
  });

  it("releases an empty-receipt session immediately and permits a fresh reopen", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let sessionOrdinal = 0;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => `workspace-session.empty.${String(++sessionOrdinal)}`,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const firstSessionId = "workspace-session.empty.1";
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId: firstSessionId }),
      [port],
    );
    await runtime.receiveControl(
      controlRequestV1(4, { method: "close_workspace", workspaceSessionId: firstSessionId }),
    );
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "close_workspace",
        snapshot: { phase: "closed", descriptor: { workspaceSessionId: firstSessionId } },
      },
    });
    expect(bootstrap.volumes.get(anchor.volumeId)).toMatchObject({ leaseCloseCalls: 1 });
    expect(port).toMatchObject({ closeCalls: 1 });
    expect(port.listeners.size).toBe(0);

    await runtime.receiveControl(
      controlRequestV1(5, { method: "query_workspace", workspaceSessionId: firstSessionId }),
    );
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_mismatch" });
    await runtime.receiveControl(controlRequestV1(6, { method: "open_workspace", anchor }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "open_workspace",
        snapshot: { descriptor: { workspaceSessionId: "workspace-session.empty.2" } },
      },
    });
    await runtime.dispose();
  });

  it("drains an aborted changed edit and permits discard only before a candidate is opened", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionIds = [
      "workspace-session.close",
      "workspace-session.after-ack",
    ];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionIds.shift() ?? "workspace-session.unexpected",
      createCheckpointId: () => "checkpoint.2",
    });

    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const discardable = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    })
      .response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, {
      method: "discard_candidate",
      volumeId: discardable.volumeId,
    }));
    expect(bootstrap.discardedVolumeIds).toEqual([discardable.volumeId]);

    await runtime.receiveControl(controlRequestV1(3, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    })
      .response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(4, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(5, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.close",
      }),
      [port],
    );
    await runtime.receiveControl(controlRequestV1(6, {
      method: "discard_candidate",
      volumeId: anchor.volumeId,
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "candidate_mismatch" });
    expect(bootstrap.discardedVolumeIds).toEqual([discardable.volumeId]);

    port.send(environmentRequestV1(7, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: "workspace-session.close",
        expectedGeneration: 1,
      },
      sessionId: "pi-session.close",
      runId: "pi-run.close",
    }));
    port.send(environmentRequestV1(8, {
      method: "begin_tool",
      toolCallId: "pi-tool.edit.close",
      tool: "edit",
    }));
    await flushEnvironmentV1();
    let changedWriteEntered!: () => void;
    const changedWriteEnteredPromise = new Promise<void>((
      resolve,
    ) => (changedWriteEntered = resolve));
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.holdNextChangedWrite = true;
    volume.heldWriteEntered = changedWriteEntered;
    port.send(environmentRequestV1(9, {
      method: "write_file",
      path: "close.md",
      bytes: new TextEncoder().encode("changed before close"),
    }));
    await changedWriteEnteredPromise;
    await runtime.receiveControl(controlRequestV1(10, {
      method: "close_workspace",
      workspaceSessionId: "workspace-session.close",
    }));
    expect(port.messages.find((message) => message.kind === "workspace_receipt")).toMatchObject({
      receipt: {
        tool: "edit",
        outcome: "cancelled",
        effect: "changed",
        resultingGeneration: 2,
        diagnosticCode: "cancelled",
      },
    });
    expect(volume.leaseCloseCalls).toBe(1);
    expect(port.closeCalls).toBe(0);
    expect(port.listeners.size).toBe(1);
    await runtime.receiveControl(controlRequestV1(11, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_busy" });
    await runtime.receiveControl(controlRequestV1(12, {
      method: "open_workspace",
      anchor,
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_busy" });
    expect(volume.leaseCloseCalls).toBe(1);

    port.send(environmentRequestV1(13, {
      method: "acknowledge_receipts",
      throughSequence: 1,
    }));
    await flushEnvironmentV1();
    expect(lastV1(port.messages)).toMatchObject({
      requestId: 13,
      ok: true,
      response: { method: "acknowledge_receipts", throughSequence: 1 },
    });
    expect(port.closeCalls).toBe(1);
    expect(port.listeners.size).toBe(0);
    await runtime.receiveControl(controlRequestV1(14, { method: "open_workspace", anchor }));
    expect(lastV1(controls)).toMatchObject({
      ok: true,
      response: {
        method: "open_workspace",
        snapshot: {
          descriptor: {
            workspaceSessionId: "workspace-session.after-ack",
            generation: 2,
          },
        },
      },
    });
    await runtime.receiveControl(controlRequestV1(15, {
      method: "query_workspace",
      workspaceSessionId: "workspace-session.close",
    }));
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "workspace_mismatch" });
    await runtime.dispose();
  });

  it("coalesces export progress and fails closed when the release channel violates protocol", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const revokedUrls: string[] = [];
    const downloadStarts: Array<
      Readonly<{
        exportId: string;
        downloadUrl: string;
        fileName: string;
      }>
    > = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-protocol",
      createObjectUrl: () => "blob:workspace.export-protocol",
      revokeObjectUrl: (url) => revokedUrls.push(url),
      startDownload: async ({ exportId, downloadUrl, fileName }) => {
        downloadStarts.push({ exportId, downloadUrl, fileName });
      },
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    const bytesTotal = 2 * 1024 * 1024;
    volume.archiveProgress = [
      { filesCompleted: 0, filesTotal: 128, bytesWritten: 0, bytesTotal },
      { filesCompleted: 1, filesTotal: 128, bytesWritten: 512 * 1024, bytesTotal },
      { filesCompleted: 64, filesTotal: 128, bytesWritten: 1024 * 1024, bytesTotal },
      { filesCompleted: 128, filesTotal: 128, bytesWritten: bytesTotal, bytesTotal },
    ];
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-protocol",
        "export.protocol.1",
      ),
      [exportPort],
    );
    await flushEnvironmentV1();
    const beforeRelease = exportPort
      .messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[];
    expect(beforeRelease.filter((message) => message.kind === "workspace_export_progress")).toEqual(
      [
        expect.objectContaining({ sequence: 1, filesCompleted: 0, bytesWritten: 0 }),
        expect.objectContaining({ sequence: 2, filesCompleted: 64, bytesWritten: 1024 * 1024 }),
        expect.objectContaining({ sequence: 3, filesCompleted: 128, bytesWritten: bytesTotal }),
      ],
    );
    expect(lastV1(beforeRelease)).toMatchObject({
      kind: "workspace_export_ready",
      sequence: 4,
      filesCompleted: 128,
      filesTotal: 128,
      bytesWritten: bytesTotal,
      bytesTotal,
    });
    expect(downloadStarts).toEqual([]);
    expect(lastV1(beforeRelease)).not.toHaveProperty("downloadUrl");

    exportPort.send({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.protocol.1",
    });
    await flushEnvironmentV1();
    expect(downloadStarts).toEqual([{
      exportId: "export.protocol.1",
      downloadUrl: "blob:workspace.export-protocol",
      fileName: "sillyos-workspace.zip",
    }]);
    expect(lastV1(exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]))
      .toMatchObject({
        kind: "workspace_export_download_started",
        sequence: 5,
      });
    expect(lastV1(exportPort.messages)).not.toHaveProperty("downloadUrl");

    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.wrong",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]))
      .toMatchObject({
        kind: "workspace_export_failed",
        sequence: 6,
        code: "request_failed",
      });
    expect(
      (exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]).some(
        (message) => message.kind === "workspace_export_released",
      ),
    ).toBe(false);
    expect(volume.archiveReleaseCalls).toBe(1);
    expect(revokedUrls).toEqual(["blob:workspace.export-protocol"]);
    expect(exportPort).toMatchObject({ closeCalls: 1 });
    await runtime.dispose();
  });

  it("does not hide portable archive cleanup failure behind cancellation", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-cleanup",
      startDownload: async () => {},
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.holdArchiveUntilAbort = true;
    volume.archiveFailure = new BrowserWorkspaceHostCleanupErrorV1(
      "synthetic portable archive cleanup failure",
      new Error("synthetic remove failure"),
    );
    let archiveStarted = () => {};
    const started = new Promise<void>((resolve) => {
      archiveStarted = resolve;
    });
    volume.archiveStarted = archiveStarted;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-cleanup",
        "export.cleanup.1",
      ),
      [exportPort],
    );
    await started;
    exportPort.send({
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.cleanup.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_failed",
      code: "request_failed",
    });
    expect(
      (exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]).some(
        (message) => message.kind === "workspace_export_released",
      ),
    ).toBe(false);
    await runtime.dispose();
  });

  it("cancels a sealed archive before authorization without invoking the download broker", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const revokedUrls: string[] = [];
    let downloadStarts = 0;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-preauth-cancel",
      createObjectUrl: () => "blob:workspace.export-preauth-cancel",
      revokeObjectUrl: (url) => revokedUrls.push(url),
      startDownload: async () => {
        downloadStarts += 1;
      },
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-preauth-cancel",
        "export.preauth-cancel.1",
      ),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });
    expect(downloadStarts).toBe(0);

    exportPort.send({
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.preauth-cancel.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_failed",
      code: "cancelled",
    });
    expect(downloadStarts).toBe(0);
    expect(volume.archiveReleaseCalls).toBe(1);
    expect(revokedUrls).toEqual(["blob:workspace.export-preauth-cancel"]);
    await runtime.dispose();
  });

  it("rejects release before authorization without invoking the download broker", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let downloadStarts = 0;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-early-release",
      createObjectUrl: () => "blob:workspace.export-early-release",
      startDownload: async () => {
        downloadStarts += 1;
      },
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-early-release",
        "export.early-release.1",
      ),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.early-release.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_failed",
      code: "request_failed",
    });
    expect(downloadStarts).toBe(0);
    await runtime.dispose();
  });

  it("treats download start as the commit point and ignores a later cancel record", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const revokedUrls: string[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-committed",
      createObjectUrl: () => "blob:workspace.export-committed",
      revokeObjectUrl: (url) => revokedUrls.push(url),
      startDownload: async () => {},
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-committed",
        "export.committed.1",
      ),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.committed.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_download_started",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_cancel",
      exportId: "export.committed.1",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.committed.1",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_released",
    });
    expect(volume.archiveReleaseCalls).toBe(1);
    expect(revokedUrls).toEqual(["blob:workspace.export-committed"]);
    await runtime.dispose();
  });

  it("drains an authorized download before closing its workspace", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    let brokerEntered = () => {};
    const brokerStarted = new Promise<void>((resolve) => {
      brokerEntered = resolve;
    });
    let finishBroker = () => {};
    const brokerGate = new Promise<void>((resolve) => {
      finishBroker = resolve;
    });
    const brokerState: { signal?: AbortSignal } = {};
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-close-drain",
      createObjectUrl: () => "blob:workspace.export-close-drain",
      startDownload: async ({ signal }) => {
        brokerState.signal = signal;
        brokerEntered();
        await brokerGate;
      },
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        3,
        "workspace-session.export-close-drain",
        "export.close-drain.1",
      ),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_start_download",
      exportId: "export.close-drain.1",
    });
    await brokerStarted;

    const close = runtime.receiveControl(controlRequestV1(4, {
      method: "close_workspace",
      workspaceSessionId: "workspace-session.export-close-drain",
    }));
    await flushEnvironmentV1();
    expect(brokerState.signal?.aborted).toBe(false);
    expect(controls.some((message) => message.requestId === 4)).toBe(false);

    finishBroker();
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_download_started",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.close-drain.1",
    });
    await close;
    expect(
      (exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]).map(
        (message) => message.kind,
      ).slice(-2),
    ).toEqual(["workspace_export_download_started", "workspace_export_released"]);
    expect(lastV1(controls)).toMatchObject({
      requestId: 4,
      ok: true,
      response: { method: "close_workspace", snapshot: { phase: "closed" } },
    });
    await runtime.dispose();
  });

  it("treats initially zero export totals as immutable", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-zero",
      createObjectUrl: () => "blob:workspace.export-zero",
      startDownload: async () => {},
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.archiveProgress = [
      { filesCompleted: 0, filesTotal: 0, bytesWritten: 0, bytesTotal: 0 },
      { filesCompleted: 0, filesTotal: 1, bytesWritten: 0, bytesTotal: 1 },
    ];
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(3, "workspace-session.export-zero", "export.zero.1"),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(exportPort.messages).toHaveLength(2);
    expect(exportPort.messages[0]).toMatchObject({
      kind: "workspace_export_progress",
      filesTotal: 0,
      bytesTotal: 0,
    });
    expect(exportPort.messages[1]).toMatchObject({
      kind: "workspace_export_failed",
      code: "request_failed",
    });
    expect(volume.archiveReleaseCalls).toBe(1);
    await runtime.dispose();
  });

  it("times out an unacknowledged ready export and still releases Host-owned resources", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const revokedUrls: string[] = [];
    let downloadStarts = 0;
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-timeout",
      createObjectUrl: () => "blob:workspace.export-timeout",
      revokeObjectUrl: (url) => revokedUrls.push(url),
      startDownload: async () => {
        downloadStarts += 1;
      },
      exportReadyTimeoutMilliseconds: 1,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const exportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(3, "workspace-session.export-timeout", "export.timeout.1"),
      [exportPort],
    );
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({ kind: "workspace_export_ready" });

    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages)).toMatchObject({
      kind: "workspace_export_failed",
      code: "request_failed",
    });
    expect(volume.archiveReleaseCalls).toBe(1);
    expect(revokedUrls).toEqual(["blob:workspace.export-timeout"]);
    expect(downloadStarts).toBe(0);
    expect(exportPort).toMatchObject({ closeCalls: 1 });
    await runtime.dispose();
  });

  it("closes every transferred port rejected before protocol ownership", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.rejected-port",
      startDownload: async () => {},
    });
    const malformedPort = new FakeMessagePortV1();
    await runtime.receiveControl({ requestId: 1 }, [malformedPort]);
    expect(malformedPort.closeCalls).toBe(1);

    await runtime.receiveControl(controlRequestV1(2, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    await runtime.receiveControl(controlRequestV1(3, { method: "open_workspace", anchor }));

    const staleExportPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      startExportRequestV1(
        4,
        "workspace-session.rejected-port",
        "export.stale.1",
        "checkpoint.stale",
      ),
      [staleExportPort],
    );
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "export_stale" });
    expect(staleExportPort.closeCalls).toBe(1);

    const environmentPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(5, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.rejected-port",
      }),
      [environmentPort],
    );
    const duplicateEnvironmentPort = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(6, {
        method: "attach_environment",
        workspaceSessionId: "workspace-session.rejected-port",
      }),
      [duplicateEnvironmentPort],
    );
    expect(lastV1(controls)).toMatchObject({ ok: false, code: "environment_attached" });
    expect(duplicateEnvironmentPort.closeCalls).toBe(1);
    expect(environmentPort.closeCalls).toBe(0);
    await runtime.dispose();
  });

  it("runs structured grep read-only and discards an aborted Host result without advancing generation", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const workspaceSessionId = "workspace-session.structured-grep";
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => workspaceSessionId,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: {
        readonly candidate: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
      };
    }).response.candidate.anchor;
    const volume = bootstrap.volumes.get(anchor.volumeId);
    if (volume === undefined) throw new Error("expected fake volume");
    volume.files.set("src/a.ts", new TextEncoder().encode("const TODO = true;\n"));
    volume.files.set("src/b.js", new TextEncoder().encode("// TODO js\n"));
    await runtime.receiveControl(controlRequestV1(2, { method: "open_workspace", anchor }));
    const port = new FakeMessagePortV1();
    await runtime.receiveControl(
      controlRequestV1(3, { method: "attach_environment", workspaceSessionId }),
      [port],
    );
    port.send(environmentRequestV1(4, {
      method: "begin_run",
      binding: {
        revision: 1,
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId,
        expectedGeneration: 1,
      },
      sessionId: "pi-session.structured-grep",
      runId: "pi-run.structured-grep",
    }));
    await waitForEnvironmentResponseV1(port, 4);
    port.send(environmentRequestV1(5, {
      method: "begin_tool",
      toolCallId: "pi-tool.structured-grep.1",
      tool: "grep",
    }));
    await waitForEnvironmentResponseV1(port, 5);
    port.send(environmentRequestV1(6, {
      method: "grep_workspace",
      query: createWorkspaceGrepQueryV1({
        pattern: "todo",
        path: "/workspace/src",
        glob: "*.ts",
        ignoreCase: true,
        literal: true,
      }),
    }));
    expect(await waitForEnvironmentResponseV1(port, 6)).toMatchObject({
      ok: true,
      response: {
        method: "grep_workspace",
        termination: "completed",
        result: {
          generation: 1,
          matches: [{ path: "/workspace/src/a.ts", line: 1, text: "const TODO = true;" }],
          truncated: false,
        },
      },
    });
    port.send(environmentRequestV1(7, {
      method: "end_tool",
      toolCallId: "pi-tool.structured-grep.1",
      outcome: "succeeded",
    }));
    expect(await waitForEnvironmentResponseV1(port, 7)).toMatchObject({
      ok: true,
      response: { method: "end_tool", generation: 1 },
    });
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.1", generation: 1 });
    expect(port.messages.some((message) => message.kind === "workspace_receipt")).toBe(false);

    port.send(environmentRequestV1(8, {
      method: "begin_tool",
      toolCallId: "pi-tool.structured-grep.cancel.1",
      tool: "grep",
    }));
    await waitForEnvironmentResponseV1(port, 8);
    let signalListEntered!: () => void;
    const listEntered = new Promise<void>((resolve) => (signalListEntered = resolve));
    volume.holdNextListUntilAbort = true;
    volume.heldListEntered = signalListEntered;
    port.send(environmentRequestV1(9, {
      method: "grep_workspace",
      query: createWorkspaceGrepQueryV1({ pattern: "TODO" }),
    }));
    await listEntered;
    port.send(environmentRequestV1(10, {
      method: "cancel_tool",
      toolCallId: "pi-tool.structured-grep.cancel.1",
    }));
    await waitForEnvironmentResponseV1(port, 10);
    expect(await waitForEnvironmentResponseV1(port, 9)).toMatchObject({
      ok: true,
      response: { method: "grep_workspace", termination: "aborted" },
    });
    port.send(environmentRequestV1(11, {
      method: "end_tool",
      toolCallId: "pi-tool.structured-grep.cancel.1",
      outcome: "cancelled",
    }));
    expect(await waitForEnvironmentResponseV1(port, 11)).toMatchObject({
      ok: true,
      response: { method: "end_tool", generation: 1 },
    });
    expect(volume.head).toMatchObject({ checkpointId: "checkpoint.1", generation: 1 });
    expect(port.messages.some((message) => message.kind === "workspace_receipt")).toBe(false);
    await runtime.dispose();
  });
});
