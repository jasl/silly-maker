// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "../agent/browser-workspace-environment-client.ts";
import { createBashTool, createEditTool } from "../agent/pi-workspace-runtime-bridge.js";
import {
  bindPiWorkspaceBashToolV1,
  bindPiWorkspaceEditToolV1,
} from "../agent/pi-workspace-tool-binder.ts";
import type {
  BrowserWorkspaceHostEnvironmentRequestV1,
  BrowserWorkspaceHostEnvironmentSuccessV1,
} from "../workspace/browser-workspace-host-protocol.ts";

type MessageListenerV1 = (event: { readonly data: unknown }) => void;
type ShellSuccessV1 = Extract<
  BrowserWorkspaceHostEnvironmentSuccessV1,
  { readonly method: "execute_shell" }
>;

class LoopbackWorkspaceEnvironmentPortV1 implements BrowserWorkspaceEnvironmentMessagePortV1 {
  readonly requests: BrowserWorkspaceHostEnvironmentRequestV1[] = [];
  private readonly messageListeners = new Set<MessageListenerV1>();
  private readonly errorListeners = new Set<() => void>();
  private readonly files = new Map<string, Uint8Array>();
  private readonly shellResponse: ShellSuccessV1;
  private readonly holdShellUntilCancel: boolean;
  private generation = 1;
  private sequence = 0;
  private activeRun: { readonly sessionId: string; readonly runId: string } | null = null;
  private activeTool: {
    readonly toolCallId: string;
    readonly tool: "read" | "write" | "edit" | "bash";
  } | null = null;
  private writeChanged = false;
  private changedPaths: string[] = [];
  private heldShellRequest: BrowserWorkspaceHostEnvironmentRequestV1 | null = null;

  constructor(options?: {
    readonly shellResponse?: ShellSuccessV1;
    readonly holdShellUntilCancel?: boolean;
  }) {
    this.shellResponse = options?.shellResponse ?? {
      method: "execute_shell",
      termination: "completed",
      stdout: "",
      stderr: "",
      exitCode: 0,
    };
    this.holdShellUntilCancel = options?.holdShellUntilCancel ?? false;
  }

  postMessage(message: unknown): void {
    const request = message as BrowserWorkspaceHostEnvironmentRequestV1;
    this.requests.push(request);
    queueMicrotask(() => this.respond(request));
  }

  addEventListener(type: "message" | "messageerror", listener: MessageListenerV1 | (() => void)) {
    if (type === "message") this.messageListeners.add(listener as MessageListenerV1);
    else this.errorListeners.add(listener as () => void);
  }

  removeEventListener(
    type: "message" | "messageerror",
    listener: MessageListenerV1 | (() => void),
  ) {
    if (type === "message") this.messageListeners.delete(listener as MessageListenerV1);
    else this.errorListeners.delete(listener as () => void);
  }

  start(): void {}
  close(): void {}

  async waitForRequest(
    method: BrowserWorkspaceHostEnvironmentRequestV1["record"]["method"],
  ): Promise<BrowserWorkspaceHostEnvironmentRequestV1> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const request = this.requests.find((candidate) => candidate.record.method === method);
      if (request !== undefined) return request;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    }
    throw new Error(`expected ${method} request`);
  }

  private emit(data: unknown): void {
    for (const listener of this.messageListeners) listener({ data });
  }

  private success(
    request: BrowserWorkspaceHostEnvironmentRequestV1,
    response: BrowserWorkspaceHostEnvironmentSuccessV1,
  ): void {
    this.emit({
      revision: 1,
      kind: "environment_response",
      requestId: request.requestId,
      ok: true,
      response,
    });
  }

  private respond(request: BrowserWorkspaceHostEnvironmentRequestV1): void {
    const record = request.record;
    if (record.method === "begin_run") {
      this.activeRun = { sessionId: record.sessionId, runId: record.runId };
      this.success(request, { method: "begin_run", generation: this.generation });
      return;
    }
    if (record.method === "begin_tool") {
      this.activeTool = { toolCallId: record.toolCallId, tool: record.tool };
      this.writeChanged = false;
      this.changedPaths = [];
      this.success(request, { method: "begin_tool", baseGeneration: this.generation });
      return;
    }
    if (record.method === "absolute_path" || record.method === "canonical_path") {
      const relative = record.path.replace(/^\/workspace\/?/u, "");
      this.success(request, { method: record.method, value: `/workspace/${relative}` });
      return;
    }
    if (record.method === "exists") {
      this.success(request, { method: "exists", value: this.files.has(record.path) });
      return;
    }
    if (record.method === "file_info") {
      const name = record.path.slice(record.path.lastIndexOf("/") + 1);
      this.success(request, {
        method: "file_info",
        value: {
          name,
          path: record.path,
          kind: "file",
          size: this.files.get(record.path)?.byteLength ?? 0,
          mtimeMs: 1_725_235_200_000,
        },
      });
      return;
    }
    if (record.method === "write_file") {
      const previous = this.files.get(record.path);
      this.writeChanged = previous === undefined ||
        previous.byteLength !== record.bytes.byteLength ||
        previous.some((value, index) => value !== record.bytes[index]);
      if (this.writeChanged) {
        this.files.set(record.path, record.bytes.slice());
        this.changedPaths.push(record.path.replace(/^\/workspace\/?/u, ""));
      }
      this.success(request, { method: "write_file", value: null });
      return;
    }
    if (record.method === "append_file") {
      const previous = this.files.get(record.path) ?? new Uint8Array();
      this.writeChanged ||= record.bytes.byteLength > 0;
      if (record.bytes.byteLength > 0) {
        const next = new Uint8Array(previous.byteLength + record.bytes.byteLength);
        next.set(previous);
        next.set(record.bytes, previous.byteLength);
        this.files.set(record.path, next);
        const relative = record.path.replace(/^\/workspace\/?/u, "");
        if (!this.changedPaths.includes(relative)) this.changedPaths.push(relative);
      }
      this.success(request, { method: "append_file", value: null });
      return;
    }
    if (record.method === "create_temp_file") {
      this.success(request, {
        method: "create_temp_file",
        value: "/workspace/.sillyos/tmp/bash-loopback.log",
      });
      return;
    }
    if (record.method === "execute_shell") {
      if (this.holdShellUntilCancel) {
        this.heldShellRequest = request;
      } else {
        this.success(request, this.shellResponse);
      }
      return;
    }
    if (record.method === "cancel_tool") {
      this.success(request, { method: "cancel_tool", value: null });
      const held = this.heldShellRequest;
      this.heldShellRequest = null;
      if (held !== null) this.success(held, this.shellResponse);
      return;
    }
    if (record.method === "read_binary_file") {
      this.success(request, {
        method: "read_binary_file",
        value: this.files.get(record.path)?.slice() ?? new Uint8Array(),
      });
      return;
    }
    if (record.method === "end_tool") {
      const run = this.activeRun;
      const tool = this.activeTool;
      if (
        run !== null &&
        (tool?.tool === "write" || tool?.tool === "edit" || tool?.tool === "bash")
      ) {
        const baseGeneration = this.generation;
        if (this.writeChanged) this.generation += 1;
        this.sequence += 1;
        this.emit({
          revision: 1,
          kind: "workspace_receipt",
          receipt: {
            revision: 1,
            sequence: this.sequence,
            programId: "program.preview.1",
            workspaceId: "workspace.preview.1",
            workspaceSessionId: "workspace.session.preview.1",
            sessionId: run.sessionId,
            runId: run.runId,
            toolCallId: tool.toolCallId,
            tool: tool.tool,
            expectedGeneration: 1,
            baseGeneration,
            resultingGeneration: this.generation,
            outcome: record.outcome,
            effect: this.writeChanged ? "changed" : "none",
            changedPaths: this.writeChanged ? this.changedPaths : [],
            diagnosticCode: record.outcome === "succeeded"
              ? null
              : record.outcome === "cancelled"
              ? "cancelled"
              : "execution_failed",
          },
        });
      }
      this.activeTool = null;
      this.success(request, { method: "end_tool", generation: this.generation });
      return;
    }
    if (record.method === "acknowledge_receipts") {
      this.success(request, {
        method: "acknowledge_receipts",
        throughSequence: record.throughSequence,
      });
      return;
    }
    if (record.method === "query_receipts") {
      this.success(request, { method: "query_receipts", receipts: [] });
      return;
    }
    if (record.method === "abort_run" || record.method === "end_run") {
      this.activeRun = null;
      this.success(request, { method: record.method, generation: this.generation });
      return;
    }
    throw new TypeError(`Unhandled loopback request: ${JSON.stringify(record)}`);
  }
}

const descriptorV1 = {
  revision: 1,
  programId: "program.preview.1",
  workspaceId: "workspace.preview.1",
  workspaceSessionId: "workspace.session.preview.1",
  generation: 1,
} as const;

async function startLoopbackRun(
  port: LoopbackWorkspaceEnvironmentPortV1,
  identity: string,
) {
  const client = createBrowserWorkspaceEnvironmentClientV1({ port, descriptor: descriptorV1 });
  const begun = await client.beginAgentRun({
    binding: { ...descriptorV1, expectedGeneration: 1 },
    piSessionId: `pi.session.${identity}`,
    piRunId: `pi.run.${identity}`,
  });
  if (begun.kind !== "started") throw new Error("expected remote Workspace run");
  return { client, run: begun.run };
}

describe("SillyOS Browser Workspace environment client", () => {
  it("keeps Pi's run/tool scope remote and preserves receipt sequence after acknowledgement", async () => {
    const records: number[] = [];
    const client = createBrowserWorkspaceEnvironmentClientV1({
      port: new LoopbackWorkspaceEnvironmentPortV1(),
      descriptor: descriptorV1,
      onMutationRecord: (record) => records.push(record.sequence),
    });
    const begun = await client.beginAgentRun({
      binding: { ...descriptorV1, expectedGeneration: 1 },
      piSessionId: "pi.session.preview.1",
      piRunId: "pi.run.preview.1",
    });
    if (begun.kind !== "started") throw new Error("expected remote Workspace run");

    await begun.run.executeWriteCall({
      toolCallId: "pi.tool.write.1",
      invoke: async (signal) => {
        const absolute = await begun.run.env.absolutePath("artifact.txt", signal);
        if (!absolute.ok) throw absolute.error;
        const written = await begun.run.env.writeFile(
          absolute.value,
          new TextEncoder().encode("first"),
          signal,
        );
        if (!written.ok) throw written.error;
      },
    });

    expect(client.getDescriptor().generation).toBe(2);
    expect(client.queryMutationRecords()).toMatchObject([{ sequence: 1, effect: "changed" }]);
    await client.acknowledgeMutationRecords(1);
    expect(client.queryMutationRecords()).toEqual([]);

    await begun.run.executeWriteCall({
      toolCallId: "pi.tool.write.2",
      invoke: async (signal) => {
        const written = await begun.run.env.writeFile(
          "/workspace/artifact.txt",
          "\ufefffirst\r\nsecond\r\n",
          signal,
        );
        if (!written.ok) throw written.error;
      },
    });

    expect(records).toEqual([1, 2]);
    expect(client.getDescriptor().generation).toBe(3);
    expect(client.queryMutationRecords()).toMatchObject([{ sequence: 2, effect: "changed" }]);

    const edit = bindPiWorkspaceEditToolV1(createEditTool(), begun.run);
    const edited = await edit.execute("pi.tool.edit.1", {
      path: "artifact.txt",
      edits: [{ oldText: "second", newText: "third" }],
    });
    expect(edited).toMatchObject({
      content: [{ type: "text", text: "Successfully replaced 1 block(s) in artifact.txt." }],
      details: { firstChangedLine: 2 },
    });
    expect(records).toEqual([1, 2, 3]);
    expect(client.getDescriptor().generation).toBe(4);
    expect(client.queryMutationRecords()).toMatchObject([
      { sequence: 2, tool: "write", effect: "changed" },
      { sequence: 3, tool: "edit", effect: "changed" },
    ]);

    await begun.run.executeReadCall({
      toolCallId: "pi.tool.read.after-edit.1",
      invoke: async (signal) => {
        await expect(begun.run.env.fileInfo("/workspace/artifact.txt", signal)).resolves.toEqual({
          ok: true,
          value: {
            name: "artifact.txt",
            path: "/workspace/artifact.txt",
            kind: "file",
            size: 17,
            mtimeMs: 1_725_235_200_000,
          },
        });
        await expect(begun.run.env.readTextFile("/workspace/artifact.txt", signal)).resolves
          .toEqual(
            { ok: true, value: "\ufefffirst\r\nthird\r\n" },
          );
      },
    });

    await expect(edit.execute("pi.tool.edit.no-change.1", {
      path: "artifact.txt",
      edits: [{ oldText: "third", newText: "third" }],
    })).rejects.toThrow("No changes made to artifact.txt");
    expect(client.getDescriptor().generation).toBe(4);
    expect(client.queryMutationRecords().at(-1)).toMatchObject({
      sequence: 4,
      tool: "edit",
      outcome: "failed",
      effect: "none",
      resultingGeneration: 4,
      diagnosticCode: "execution_failed",
    });

    await begun.run.executeWriteCall({
      toolCallId: "pi.tool.write.invalid-utf8.1",
      invoke: async (signal) => {
        const written = await begun.run.env.writeFile(
          "/workspace/artifact.txt",
          new Uint8Array([0xff]),
          signal,
        );
        if (!written.ok) throw written.error;
      },
    });
    await begun.run.executeReadCall({
      toolCallId: "pi.tool.read.invalid-utf8.1",
      invoke: async (signal) => {
        const read = await begun.run.env.readTextFile("/workspace/artifact.txt", signal);
        expect(read.ok).toBe(false);
        if (!read.ok) expect(read.error.code).toBe("invalid");
      },
    });
    await begun.run.abortAndDrain();
    client.dispose();
  });

  it("keeps native Pi bash authoritative over one terminal-aggregate shell request", async () => {
    const port = new LoopbackWorkspaceEnvironmentPortV1({
      shellResponse: {
        method: "execute_shell",
        termination: "completed",
        stdout: "stdout aggregate\n",
        stderr: "stderr aggregate\n",
        exitCode: 124,
      },
    });
    const { client, run } = await startLoopbackRun(port, "bash.native.1");
    const signal = new AbortController();
    const bash = bindPiWorkspaceBashToolV1(createBashTool(), run);

    let failure: unknown;
    try {
      await bash.execute(
        "pi.tool.bash.native.1",
        { command: "exit 124", timeout: 2 },
        signal.signal,
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("stdout aggregate\nstderr aggregate");
    expect((failure as Error).message).toContain("Command exited with code 124");

    const beginTool = port.requests.find((request) => request.record.method === "begin_tool");
    expect(beginTool?.record).toEqual({
      method: "begin_tool",
      toolCallId: "pi.tool.bash.native.1",
      tool: "bash",
    });
    const shellRequests = port.requests.filter((request) =>
      request.record.method === "execute_shell"
    );
    expect(shellRequests).toHaveLength(1);
    expect(shellRequests[0]?.record).toEqual({
      method: "execute_shell",
      command: "exit 124",
      cwd: "/workspace",
      env: {},
      inheritEnv: true,
      timeoutMilliseconds: 2_000,
    });
    expect(client.queryMutationRecords()).toMatchObject([{
      toolCallId: "pi.tool.bash.native.1",
      tool: "bash",
      outcome: "failed",
      effect: "none",
    }]);

    signal.abort();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(port.requests.filter((request) => request.record.method === "cancel_tool")).toEqual([]);
    await run.abortAndDrain();
    client.dispose();
  });

  it("fails an oversized requested timeout before shell RPC and admits only Pi overflow logs", async () => {
    const port = new LoopbackWorkspaceEnvironmentPortV1();
    const { client, run } = await startLoopbackRun(port, "bash.bounds.1");

    await expect(run.executeBashCall({
      toolCallId: "pi.tool.bash.timeout-limit.1",
      invoke: async (signal) => {
        const result = await run.env.exec("echo too-late", {
          timeout: 30.001,
          abortSignal: signal,
        });
        if (!result.ok) throw result.error;
        return result.value;
      },
    })).rejects.toMatchObject({
      name: "ExecutionError",
      code: "unknown",
      message: "Browser Local shell timeout cannot exceed 30 seconds",
    });
    expect(port.requests.filter((request) => request.record.method === "execute_shell")).toEqual(
      [],
    );

    await run.executeBashCall({
      toolCallId: "pi.tool.bash.overflow-log.1",
      invoke: async (signal) => {
        const unsupported = await run.env.createTempFile({
          prefix: "other-",
          suffix: ".log",
          abortSignal: signal,
        });
        expect(unsupported).toMatchObject({ ok: false, error: { code: "not_supported" } });
        const created = await run.env.createTempFile({
          prefix: "bash-",
          suffix: ".log",
          abortSignal: signal,
        });
        if (!created.ok) throw created.error;
        const appended = await run.env.appendFile(created.value, "complete output", signal);
        if (!appended.ok) throw appended.error;
      },
    });

    expect(port.requests.filter((request) => request.record.method === "create_temp_file"))
      .toHaveLength(1);
    expect(port.requests.filter((request) => request.record.method === "append_file"))
      .toMatchObject([{
        record: {
          method: "append_file",
          path: "/workspace/.sillyos/tmp/bash-loopback.log",
        },
      }]);
    expect(client.queryMutationRecords().at(-1)).toMatchObject({
      toolCallId: "pi.tool.bash.overflow-log.1",
      tool: "bash",
      effect: "changed",
      changedPaths: [".sillyos/tmp/bash-loopback.log"],
    });
    await run.abortAndDrain();
    client.dispose();
  });

  it("calls terminal stdout then stderr and maps callback failure without hiding either callback", async () => {
    const port = new LoopbackWorkspaceEnvironmentPortV1({
      shellResponse: {
        method: "execute_shell",
        termination: "completed",
        stdout: "stdout aggregate",
        stderr: "stderr aggregate",
        exitCode: 0,
      },
    });
    const { client, run } = await startLoopbackRun(port, "bash.callback.1");
    const callbacks: string[] = [];
    const result = await run.executeBashCall({
      toolCallId: "pi.tool.bash.callback.1",
      invoke: (signal) =>
        run.env.exec("printf output", {
          abortSignal: signal,
          onStdout: (chunk) => {
            callbacks.push(`stdout:${chunk}`);
            throw new Error("stdout consumer failed");
          },
          onStderr: (chunk) => callbacks.push(`stderr:${chunk}`),
        }),
    });

    expect(callbacks).toEqual(["stdout:stdout aggregate", "stderr:stderr aggregate"]);
    expect(result).toMatchObject({
      ok: false,
      error: { name: "ExecutionError", code: "callback_error" },
    });
    await run.abortAndDrain();
    client.dispose();
  });

  it("maps an observed requested timeout independently of shell exit codes", async () => {
    const port = new LoopbackWorkspaceEnvironmentPortV1({
      shellResponse: {
        method: "execute_shell",
        termination: "timeout",
        stdout: "partial stdout",
        stderr: "partial stderr",
        exitCode: null,
      },
    });
    const { client, run } = await startLoopbackRun(port, "bash.timeout.1");
    const result = await run.executeBashCall({
      toolCallId: "pi.tool.bash.timeout.1",
      invoke: (signal) => run.env.exec("long-running", { timeout: 0.25, abortSignal: signal }),
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        name: "ExecutionError",
        code: "timeout",
        message: "Workspace shell request timed out after 0.25 seconds",
      },
    });
    expect(port.requests.find((request) => request.record.method === "execute_shell")?.record)
      .toMatchObject({ timeoutMilliseconds: 250 });
    expect(port.requests.filter((request) => request.record.method === "cancel_tool")).toEqual([]);
    await run.abortAndDrain();
    client.dispose();
  });

  it("uses the stable active tool identity to cancel and preserves the first observed abort", async () => {
    const port = new LoopbackWorkspaceEnvironmentPortV1({
      holdShellUntilCancel: true,
      shellResponse: {
        method: "execute_shell",
        termination: "completed",
        stdout: "late stdout",
        stderr: "late stderr",
        exitCode: 124,
      },
    });
    const { client, run } = await startLoopbackRun(port, "bash.abort.1");
    const abort = new AbortController();
    const execution = run.executeBashCall({
      toolCallId: "pi.tool.bash.abort.1",
      signal: abort.signal,
      invoke: (signal) => run.env.exec("long-running", { abortSignal: signal }),
    });
    await port.waitForRequest("execute_shell");
    abort.abort();

    await expect(execution).resolves.toMatchObject({
      ok: false,
      error: { name: "ExecutionError", code: "aborted" },
    });
    expect(port.requests.filter((request) => request.record.method === "cancel_tool"))
      .toMatchObject([{
        record: { method: "cancel_tool", toolCallId: "pi.tool.bash.abort.1" },
      }]);
    expect(client.queryMutationRecords()).toMatchObject([{
      toolCallId: "pi.tool.bash.abort.1",
      tool: "bash",
      outcome: "cancelled",
      effect: "none",
    }]);
    await run.abortAndDrain();
    client.dispose();
  });
});
