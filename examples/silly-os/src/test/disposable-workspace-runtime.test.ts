// SPDX-License-Identifier: MIT

import {
  type AgentTool,
  createReadTool,
  createWriteTool,
  type FileInfo,
} from "../agent/pi-workspace-runtime-bridge.js";
import { describe, expect, it, vi } from "vitest";

import {
  bindPiWorkspaceReadToolV1,
  bindPiWorkspaceWriteToolV1,
} from "../agent/pi-workspace-tool-binder.ts";
import {
  createDisposableWorkspaceRuntimeV1,
  type DisposableWorkspaceRuntimeV1,
  type WorkspaceAgentRunV1,
  type WorkspaceExecutionDescriptorV1,
  WorkspaceToolCallAdmissionErrorV1,
  workspaceFileMaximumBytesV1,
  workspaceMutationReceiptMaximumV1,
  workspacePathMaximumPartsV1,
  workspacePathMaximumUtf8BytesV1,
  workspaceVolumeMaximumBytesV1,
  workspaceVolumeMaximumFilesV1,
} from "../workspace/index.ts";

function openedWorkspaceV1(
  runtime: DisposableWorkspaceRuntimeV1,
  programId = "program.one",
  workspaceId = "workspace.one",
): WorkspaceExecutionDescriptorV1 {
  const result = runtime.openWorkspace({ programId, workspaceId });
  if (result.kind === "rejected") throw new Error(`Workspace open failed: ${result.code}`);
  return result.descriptor;
}

function startedRunV1(
  runtime: DisposableWorkspaceRuntimeV1,
  descriptor: WorkspaceExecutionDescriptorV1,
  ordinal = 1,
): WorkspaceAgentRunV1 {
  const result = runtime.beginAgentRun({
    binding: {
      revision: 1,
      programId: descriptor.programId,
      workspaceId: descriptor.workspaceId,
      workspaceSessionId: descriptor.workspaceSessionId,
      expectedGeneration: descriptor.generation,
    },
    piSessionId: `pi.session.${String(ordinal)}`,
    piRunId: `pi.run.${String(ordinal)}`,
  });
  if (result.kind === "rejected") throw new Error(`Workspace run failed: ${result.code}`);
  return result.run;
}

async function fileInfoV1(
  run: WorkspaceAgentRunV1,
  toolCallId: string,
  path: string,
): Promise<FileInfo> {
  const result = await run.executeReadCall({
    toolCallId,
    invoke: (signal) => run.env.fileInfo(path, signal),
  });
  if (!result.ok) throw result.error;
  return result.value;
}

describe("DisposableWorkspaceRuntimeV1", () => {
  it("binds the native Pi read/write factories to one stable environment without changing schemas or results", async () => {
    let now = 100;
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.one",
      now: () => now++,
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const readFactory = createReadTool();
    const writeFactory = createWriteTool();
    const read = bindPiWorkspaceReadToolV1(readFactory, run);
    const write = bindPiWorkspaceWriteToolV1(writeFactory, run);
    const lowLevelTools: AgentTool[] = [read, write];

    expect(lowLevelTools.map(({ name }) => name)).toEqual(["read", "write"]);
    expect(read).not.toBe(readFactory);
    expect(write).not.toBe(writeFactory);
    expect(read.parameters).toBe(readFactory.parameters);
    expect(write.parameters).toBe(writeFactory.parameters);
    expect(read).toMatchObject({
      name: readFactory.name,
      label: readFactory.label,
      description: readFactory.description,
    });
    expect(write).toMatchObject({
      name: writeFactory.name,
      label: writeFactory.label,
      description: writeFactory.description,
    });

    await expect(
      write.execute("tool.write.1", { path: "artifacts/result.txt", content: "hello" }, undefined),
    ).resolves.toEqual({
      content: [{ type: "text", text: "Successfully wrote 5 bytes to artifacts/result.txt" }],
      details: undefined,
    });
    expect(run.getGenerationCursor()).toBe(2);
    const firstInfo = await fileInfoV1(run, "tool.meta.1", "artifacts/result.txt");

    await expect(
      read.execute("tool.read.1", { path: "artifacts/result.txt" }, undefined),
    ).resolves.toEqual({
      content: [{ type: "text", text: "hello" }],
      details: undefined,
    });
    await expect(
      write.execute("tool.write.2", { path: "artifacts/result.txt", content: "hello" }, undefined),
    ).resolves.toMatchObject({ content: [{ type: "text" }] });
    const secondInfo = await fileInfoV1(run, "tool.meta.2", "artifacts/result.txt");
    expect(secondInfo.mtimeMs).toBe(firstInfo.mtimeMs);
    expect(run.getGenerationCursor()).toBe(2);

    const records = runtime.queryMutationRecords(opened.workspaceSessionId);
    expect(records).toEqual([
      {
        revision: 1,
        sequence: 1,
        programId: opened.programId,
        workspaceId: opened.workspaceId,
        workspaceSessionId: opened.workspaceSessionId,
        piSessionId: "pi.session.1",
        piRunId: "pi.run.1",
        toolCallId: "tool.write.1",
        tool: "write",
        expectedGeneration: 1,
        baseGeneration: 1,
        resultingGeneration: 2,
        outcome: "succeeded",
        effect: "changed",
        changedPaths: ["artifacts/result.txt"],
        diagnosticCode: null,
      },
      {
        revision: 1,
        sequence: 2,
        programId: opened.programId,
        workspaceId: opened.workspaceId,
        workspaceSessionId: opened.workspaceSessionId,
        piSessionId: "pi.session.1",
        piRunId: "pi.run.1",
        toolCallId: "tool.write.2",
        tool: "write",
        expectedGeneration: 1,
        baseGeneration: 2,
        resultingGeneration: 2,
        outcome: "succeeded",
        effect: "none",
        changedPaths: [],
        diagnosticCode: null,
      },
    ]);
    expect(records[0]).not.toHaveProperty("agentRunId");

    const stableEnvironment = run.env;
    run.finish();
    const next = startedRunV1(runtime, runtime.getCurrentDescriptor()!, 2);
    expect(next.env).toBe(stableEnvironment);
  });

  it("keeps a run-local generation cursor and rejects stale, duplicate, nested, and concurrent scopes before effect", async () => {
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.scopes",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);
    await write.execute("tool.write.cursor.1", { path: "one.txt", content: "one" }, undefined);
    await write.execute("tool.write.cursor.2", { path: "two.txt", content: "two" }, undefined);
    expect(run.getGenerationCursor()).toBe(3);

    let release!: () => void;
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => (entered = resolve));
    const held = new Promise<void>((resolve) => (release = resolve));
    const active = run.executeReadCall({
      toolCallId: "tool.read.held",
      invoke: async () => {
        entered();
        await held;
      },
    });
    await enteredPromise;
    await expect(
      run.executeReadCall({ toolCallId: "tool.read.other", invoke: async () => undefined }),
    ).rejects.toMatchObject({ code: "scope_busy" });
    release();
    await active;
    await expect(
      run.executeReadCall({ toolCallId: "tool.read.held", invoke: async () => undefined }),
    ).rejects.toMatchObject({ code: "duplicate_tool_call" });

    await run.abortAndDrain();
    await expect(
      run.executeReadCall({ toolCallId: "tool.read.after-abort", invoke: async () => undefined }),
    ).rejects.toMatchObject({ code: "run_not_current" });
    const current = runtime.getCurrentDescriptor();
    if (current === null) throw new Error("expected current Workspace");
    expect(
      runtime.beginAgentRun({
        binding: { ...opened, expectedGeneration: opened.generation },
        piSessionId: "pi.session.stale",
        piRunId: "pi.run.stale",
      }),
    ).toMatchObject({ kind: "rejected", code: "stale_generation", current });
    expect(
      runtime.beginAgentRun({
        binding: { ...current, expectedGeneration: current.generation },
        piSessionId: "pi.session.1",
        piRunId: "pi.run.1",
      }),
    ).toMatchObject({ kind: "rejected", code: "duplicate_run" });
    expect(runtime.queryMutationRecords(opened.workspaceSessionId)).toHaveLength(2);
  });

  it("enforces path, per-file, volume, file-count, and shell boundaries with typed Results", async () => {
    const sessionIds = ["workspace.session.capacity.one", "workspace.session.capacity.two"];
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => sessionIds.shift() ?? "workspace.session.unexpected",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);

    const rejectedPaths = [
      "../escape.txt",
      Array.from({ length: workspacePathMaximumPartsV1 + 1 }, (_, index) => `p${index}`).join("/"),
      `${"x".repeat(workspacePathMaximumUtf8BytesV1 + 1)}.txt`,
    ];
    for (const [index, path] of rejectedPaths.entries()) {
      await expect(
        write.execute(`tool.write.path.${String(index)}`, { path, content: "x" }, undefined),
      ).rejects.toBeInstanceOf(Error);
    }
    await expect(
      write.execute(
        "tool.write.file.capacity",
        { path: "large.txt", content: "x".repeat(workspaceFileMaximumBytesV1 + 1) },
        undefined,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(
      runtime.queryMutationRecords(opened.workspaceSessionId).map((record) =>
        record.diagnosticCode
      ),
    )
      .toEqual(["path_rejected", "path_rejected", "path_rejected", "capacity_exceeded"]);

    const unavailable = await run.executeReadCall({
      toolCallId: "tool.read.unsupported",
      invoke: async (signal) => ({
        join: await run.env.joinPath(["one", "two"], signal),
        text: await run.env.readTextFile("missing.txt", signal),
        lines: await run.env.readTextLines("missing.txt", { abortSignal: signal }),
        append: await run.env.appendFile("missing.txt", "x", signal),
        rename: await run.env.renameFile("missing.txt", "other.txt", signal),
        list: await run.env.listDir(".", signal),
        create: await run.env.createDir("dir", { abortSignal: signal }),
        remove: await run.env.remove("missing.txt", { abortSignal: signal }),
        tempDir: await run.env.createTempDir("tmp", signal),
        tempFile: await run.env.createTempFile({ abortSignal: signal }),
      }),
    });
    for (const result of Object.values(unavailable)) {
      expect(result).toMatchObject({ ok: false, error: { code: "not_supported" } });
    }
    await expect(run.env.exec("echo must-not-run")).resolves.toMatchObject({
      ok: false,
      error: { code: "shell_unavailable" },
    });

    run.finish();
    await runtime.closeWorkspace(opened.workspaceSessionId);
    const fileCountOpened = openedWorkspaceV1(runtime, "program.two", "workspace.two");
    const fileCountRun = startedRunV1(runtime, fileCountOpened, 2);
    const fileCountWrite = bindPiWorkspaceWriteToolV1(createWriteTool(), fileCountRun);
    for (let index = 1; index <= workspaceVolumeMaximumFilesV1; index += 1) {
      await fileCountWrite.execute(
        `tool.write.file.${String(index)}`,
        { path: `files/${String(index)}.txt`, content: "" },
        undefined,
      );
      expect(
        runtime.acknowledgeMutationRecords({
          workspaceSessionId: fileCountOpened.workspaceSessionId,
          throughSequence: index,
        }).kind,
      ).toBe("acknowledged");
    }
    await expect(
      fileCountWrite.execute(
        "tool.write.file.overflow",
        { path: "files/overflow.txt", content: "" },
        undefined,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(runtime.queryMutationRecords(fileCountOpened.workspaceSessionId)).toMatchObject([
      { sequence: workspaceVolumeMaximumFilesV1 + 1, diagnosticCode: "capacity_exceeded" },
    ]);
  });

  it("admits the exact aggregate byte ceiling and rejects the next byte", async () => {
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.volume",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);
    const fullFile = "x".repeat(workspaceFileMaximumBytesV1);
    const fullFiles = workspaceVolumeMaximumBytesV1 / workspaceFileMaximumBytesV1;

    for (let index = 1; index <= fullFiles; index += 1) {
      await write.execute(
        `tool.write.volume.${String(index)}`,
        { path: `volume/${String(index)}.txt`, content: fullFile },
        undefined,
      );
    }
    expect(run.getGenerationCursor()).toBe(fullFiles + 1);
    await expect(
      write.execute(
        "tool.write.volume.overflow",
        { path: "volume/overflow.txt", content: "x" },
        undefined,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(runtime.queryMutationRecords(opened.workspaceSessionId).at(-1)).toMatchObject({
      baseGeneration: fullFiles + 1,
      resultingGeneration: fullFiles + 1,
      outcome: "failed",
      effect: "none",
      diagnosticCode: "capacity_exceeded",
    });
  });

  it("reserves a bounded per-session mutation queue and acknowledges only a contiguous session prefix", async () => {
    const sessionIds = ["workspace.session.old", "workspace.session.new"];
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => sessionIds.shift() ?? "workspace.session.unexpected",
    });
    const oldWorkspace = openedWorkspaceV1(runtime);
    const oldRun = startedRunV1(runtime, oldWorkspace);
    const oldWrite = bindPiWorkspaceWriteToolV1(createWriteTool(), oldRun);
    await oldWrite.execute("tool.write.old", { path: "old.txt", content: "old" }, undefined);
    oldRun.finish();
    await runtime.closeWorkspace(oldWorkspace.workspaceSessionId);

    const current = openedWorkspaceV1(runtime, "program.new", "workspace.new");
    const run = startedRunV1(runtime, current, 2);
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);
    for (let index = 1; index <= workspaceMutationReceiptMaximumV1; index += 1) {
      await write.execute(
        `tool.write.queue.${String(index)}`,
        { path: "queue.txt", content: String(index) },
        undefined,
      );
    }
    await expect(
      write.execute(
        "tool.write.queue.full",
        { path: "must-not-exist.txt", content: "x" },
        undefined,
      ),
    ).rejects.toEqual(
      new WorkspaceToolCallAdmissionErrorV1(
        "receipt_queue_full",
        "Workspace mutation receipt queue is full",
      ),
    );
    expect(runtime.queryMutationRecords(current.workspaceSessionId)).toHaveLength(32);

    expect(
      runtime.acknowledgeMutationRecords({
        workspaceSessionId: current.workspaceSessionId,
        throughSequence: 16,
      }),
    ).toEqual({
      kind: "acknowledged",
      workspaceSessionId: current.workspaceSessionId,
      throughSequence: 16,
    });
    expect(runtime.queryMutationRecords(current.workspaceSessionId).map(({ sequence }) => sequence))
      .toEqual(Array.from({ length: 16 }, (_, index) => index + 17));
    expect(
      runtime.acknowledgeMutationRecords({
        workspaceSessionId: current.workspaceSessionId,
        throughSequence: 16,
      }),
    ).toMatchObject({ kind: "unchanged", throughSequence: 16 });
    expect(
      runtime.acknowledgeMutationRecords({
        workspaceSessionId: current.workspaceSessionId,
        throughSequence: 99,
      }),
    ).toEqual({ kind: "rejected", code: "sequence_unavailable" });

    expect(runtime.queryMutationRecords(oldWorkspace.workspaceSessionId)).toHaveLength(1);
    expect(
      runtime.acknowledgeMutationRecords({
        workspaceSessionId: current.workspaceSessionId,
        throughSequence: 32,
      }).kind,
    ).toBe("acknowledged");
    expect(runtime.queryMutationRecords(oldWorkspace.workspaceSessionId)).toHaveLength(1);
    await write.execute(
      "tool.write.queue.after-ack",
      { path: "after-ack.txt", content: "ok" },
      undefined,
    );
  });

  it("records abort-before-effect and native Pi cancel-after-effect without losing the changed generation", async () => {
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.cancel",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);

    const before = new AbortController();
    before.abort();
    await expect(
      write.execute(
        "tool.write.cancel.before",
        { path: "before.txt", content: "no" },
        before.signal,
      ),
    ).rejects.toBeInstanceOf(Error);

    const after = new AbortController();
    const nativeWrite = run.env.writeFile.bind(run.env);
    const spy = vi.spyOn(run.env, "writeFile").mockImplementation(async (...args) => {
      const result = await nativeWrite(...args);
      after.abort();
      return result;
    });
    await expect(
      write.execute("tool.write.cancel.after", { path: "after.txt", content: "yes" }, after.signal),
    ).rejects.toThrow("Operation aborted");
    spy.mockRestore();

    expect(runtime.queryMutationRecords(opened.workspaceSessionId)).toMatchObject([
      {
        sequence: 1,
        baseGeneration: 1,
        resultingGeneration: 1,
        outcome: "cancelled",
        effect: "none",
        diagnosticCode: "cancelled",
      },
      {
        sequence: 2,
        baseGeneration: 1,
        resultingGeneration: 2,
        outcome: "cancelled",
        effect: "changed",
        changedPaths: ["after.txt"],
        diagnosticCode: "cancelled",
      },
    ]);
    expect(run.getGenerationCursor()).toBe(2);
    await expect(
      bindPiWorkspaceReadToolV1(createReadTool(), run).execute(
        "tool.read.after-cancel",
        { path: "after.txt" },
        undefined,
      ),
    ).resolves.toMatchObject({ content: [{ text: "yes" }] });
  });

  it("drains an active scope before close, retains records through close, and abandons them on Forget", async () => {
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.close",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const cleanup = vi.spyOn(run.env, "cleanup");
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => (entered = resolve));
    const active = run.executeWriteCall({
      toolCallId: "tool.write.close",
      invoke: async (signal) => {
        entered();
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true })
        );
        throw new Error("cancelled by close");
      },
    });
    await enteredPromise;

    await expect(runtime.closeWorkspace(opened.workspaceSessionId)).resolves.toMatchObject({
      kind: "closed",
    });
    await expect(active).rejects.toThrow("cancelled by close");
    expect(runtime.queryMutationRecords(opened.workspaceSessionId)).toMatchObject([
      { outcome: "cancelled", effect: "none", diagnosticCode: "cancelled" },
    ]);
    expect(cleanup).toHaveBeenCalledTimes(1);
    await expect(runtime.closeWorkspace(opened.workspaceSessionId)).resolves.toMatchObject({
      kind: "unchanged",
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
    await expect(run.env.absolutePath("closed.txt")).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid" },
    });
    await expect(
      run.executeReadCall({ toolCallId: "tool.read.closed", invoke: async () => undefined }),
    ).rejects.toMatchObject({ code: "workspace_closed" });

    await runtime.forget();
    expect(runtime.queryMutationRecords(opened.workspaceSessionId)).toEqual([]);
    expect(runtime.openWorkspace({ programId: "program.next", workspaceId: "workspace.next" }))
      .toEqual({ kind: "rejected", code: "forgotten", current: null });
  });

  it("makes Forget await an already-started close drain before abandoning the session", async () => {
    const runtime = createDisposableWorkspaceRuntimeV1({
      createWorkspaceSessionId: () => "workspace.session.concurrent-close",
    });
    const opened = openedWorkspaceV1(runtime);
    const run = startedRunV1(runtime, opened);
    const cleanup = vi.spyOn(run.env, "cleanup");
    let abortObserved!: () => void;
    let release!: () => void;
    const abortPromise = new Promise<void>((resolve) => (abortObserved = resolve));
    const releasePromise = new Promise<void>((resolve) => (release = resolve));
    const active = run.executeWriteCall({
      toolCallId: "tool.write.concurrent-close",
      invoke: async (signal) => {
        await new Promise<void>((resolve) =>
          signal.addEventListener(
            "abort",
            () => {
              abortObserved();
              resolve();
            },
            { once: true },
          )
        );
        await releasePromise;
        throw new Error("cancelled by concurrent close");
      },
    });
    const activeSettlement = active.then(
      () => {
        throw new Error("expected active scope rejection");
      },
      () => undefined,
    );
    const closing = runtime.closeWorkspace(opened.workspaceSessionId);
    await abortPromise;
    let forgetSettled = false;
    const forgetting = runtime.forget().then(() => {
      forgetSettled = true;
    });
    await Promise.resolve();
    expect(forgetSettled).toBe(false);

    release();
    await Promise.all([closing, activeSettlement, forgetting]);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runtime.queryMutationRecords(opened.workspaceSessionId)).toEqual([]);
  });
});
