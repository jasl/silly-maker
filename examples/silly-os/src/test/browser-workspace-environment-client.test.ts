// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "../agent/browser-workspace-environment-client.ts";
import type {
  BrowserWorkspaceHostEnvironmentRequestV1,
  BrowserWorkspaceHostEnvironmentSuccessV1,
} from "../workspace/browser-workspace-host-protocol.ts";

type MessageListenerV1 = (event: { readonly data: unknown }) => void;

class LoopbackWorkspaceEnvironmentPortV1 implements BrowserWorkspaceEnvironmentMessagePortV1 {
  private readonly messageListeners = new Set<MessageListenerV1>();
  private readonly errorListeners = new Set<() => void>();
  private readonly files = new Map<string, Uint8Array>();
  private generation = 1;
  private sequence = 0;
  private activeRun: { readonly sessionId: string; readonly runId: string } | null = null;
  private activeTool: { readonly toolCallId: string; readonly tool: "read" | "write" } | null =
    null;
  private writeChanged = false;

  postMessage(message: unknown): void {
    const request = message as BrowserWorkspaceHostEnvironmentRequestV1;
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
    if (record.method === "write_file") {
      const previous = this.files.get(record.path);
      this.writeChanged = previous === undefined ||
        previous.byteLength !== record.bytes.byteLength ||
        previous.some((value, index) => value !== record.bytes[index]);
      if (this.writeChanged) this.files.set(record.path, record.bytes.slice());
      this.success(request, { method: "write_file", value: null });
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
      if (run !== null && tool?.tool === "write") {
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
            tool: "write",
            expectedGeneration: 1,
            baseGeneration,
            resultingGeneration: this.generation,
            outcome: record.outcome,
            effect: this.writeChanged ? "changed" : "none",
            changedPaths: this.writeChanged ? ["artifact.txt"] : [],
            diagnosticCode: null,
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
    this.activeRun = null;
    this.success(request, { method: record.method, generation: this.generation });
  }
}

const descriptorV1 = {
  revision: 1,
  programId: "program.preview.1",
  workspaceId: "workspace.preview.1",
  workspaceSessionId: "workspace.session.preview.1",
  generation: 1,
} as const;

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
        const written = await begun.run.env.writeFile("/workspace/artifact.txt", "second", signal);
        if (!written.ok) throw written.error;
      },
    });

    expect(records).toEqual([1, 2]);
    expect(client.getDescriptor().generation).toBe(3);
    expect(client.queryMutationRecords()).toMatchObject([{ sequence: 2, effect: "changed" }]);
    await begun.run.abortAndDrain();
    client.dispose();
  });
});
