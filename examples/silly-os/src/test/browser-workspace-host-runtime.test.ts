// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  BrowserWorkspaceHostCleanupErrorV1,
  BrowserWorkspaceHostStorageErrorV1,
  createBrowserWorkspaceHostRuntimeV1,
  type BrowserWorkspaceHostBootstrapPortV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostFileMetadataV1,
  type BrowserWorkspaceHostMessagePortV1,
  type BrowserWorkspaceHostPortableArchiveInputV1,
  type BrowserWorkspaceHostPortableArchiveV1,
  type BrowserWorkspaceHostReplaceFileInputV1,
  type BrowserWorkspaceHostReplaceFileResultV1,
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
  readonly metadataSizes: Map<string, number>;
  statCalls: number;
  readonly readFileRangeRequests: FakeRangeRequestV1[];
  readonly sourceReadRequests: FakeSourceRequestV1[];
  leaseCloseCalls: number;
  holdNextChangedWrite: boolean;
  heldWriteEntered: (() => void) | null;
  replaceError: Error | null;
  archiveProgress: BrowserWorkspaceHostExportProgressWireV1[];
  archiveReleaseCalls: number;
  archiveFailure: Error | null;
  holdArchiveUntilAbort: boolean;
  archiveStarted: (() => void) | null;
}

const programIdV1 = "program.preview.1";
const workspaceIdV1 = "workspace.preview.1";
const fileMtimeMsV1 = 1_700_000_000_000;

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
    const file = this.volume.files.get(path);
    if (file !== undefined) return { kind: "file", size: file.byteLength, mtimeMs: fileMtimeMsV1 };
    const size = this.volume.metadataSizes.get(path);
    return size === undefined
      ? { kind: "missing", size: 0, mtimeMs: 0 }
      : { kind: "file", size, mtimeMs: fileMtimeMsV1 };
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

  async close(): Promise<void> {
    if (!this.closed) this.volume.leaseCloseCalls += 1;
    this.closed = true;
  }
}

class FakeBootstrapV1 implements BrowserWorkspaceHostBootstrapPortV1 {
  readonly volumes = new Map<string, FakeVolumeV1>();
  readonly discardedVolumeIds: string[] = [];
  private nextVolumeId = 1;

  async createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserWorkspaceVolumeAnchorWireV1> {
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
      metadataSizes: new Map(),
      statCalls: 0,
      readFileRangeRequests: [],
      sourceReadRequests: [],
      leaseCloseCalls: 0,
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
    });
    return anchor;
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

  async dispose(): Promise<void> {}
}

type MessageListenerV1 = (event: Readonly<{ data: unknown }>) => void;

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

  send(message: unknown): void {
    for (const listener of this.listeners) listener({ data: message });
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
    workspaceSessionId,
    expectedCheckpointId,
    expectedGeneration: 1,
    programRevision: 1,
    repositoryRevision: 1,
  });
}

async function flushEnvironmentV1(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function lastV1<T>(values: readonly T[]): T {
  const value = values.at(-1);
  if (value === undefined) throw new Error("expected a message");
  return value;
}

describe("SillyOS Browser Workspace Host runtime", () => {
  it("projects a wrapped storage quota failure as capacity_exceeded without advancing the head", async () => {
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
    const anchor =
      (candidate as { readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 } })
        .response.anchor;

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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    })
      .response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    })
      .response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    })
      .response.anchor;
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
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-protocol",
      createObjectUrl: () => "blob:workspace.export-protocol",
      revokeObjectUrl: (url) => revokedUrls.push(url),
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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

    exportPort.send({
      revision: 1,
      kind: "workspace_export_release",
      exportId: "export.wrong",
    });
    await flushEnvironmentV1();
    expect(lastV1(exportPort.messages as unknown as BrowserWorkspaceHostExportOutboundMessageV1[]))
      .toMatchObject({
        kind: "workspace_export_failed",
        sequence: 5,
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
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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

  it("treats release as the commit point and ignores a later cancel record", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const revokedUrls: string[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-committed",
      createObjectUrl: () => "blob:workspace.export-committed",
      revokeObjectUrl: (url) => revokedUrls.push(url),
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      kind: "workspace_export_release",
      exportId: "export.committed.1",
    });
    exportPort.send({
      revision: 1,
      kind: "workspace_export_cancel",
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

  it("treats initially zero export totals as immutable", async () => {
    const bootstrap = new FakeBootstrapV1();
    const controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-zero",
      createObjectUrl: () => "blob:workspace.export-zero",
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
    const runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap,
      postControlMessage: (message) => controls.push(message),
      createWorkspaceSessionId: () => "workspace-session.export-timeout",
      createObjectUrl: () => "blob:workspace.export-timeout",
      revokeObjectUrl: (url) => revokedUrls.push(url),
      exportReadyTimeoutMilliseconds: 1,
    });
    await runtime.receiveControl(controlRequestV1(1, {
      method: "create_candidate",
      programId: programIdV1,
      workspaceId: workspaceIdV1,
    }));
    const anchor = (lastV1(controls) as {
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
      readonly response: { readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };
    }).response.anchor;
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
});
