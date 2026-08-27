// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  bindPiWorkspaceBashToolV1,
  bindPiWorkspaceEditToolV1,
} from "../agent/pi-workspace-tool-binder.ts";
import type {
  AgentHarnessTool,
  ExecutionEnv,
  ExecutionToolContext,
} from "../agent/pi-workspace-runtime-bridge.js";
import { createBashTool, err, ExecutionError, ok } from "../agent/pi-workspace-runtime-bridge.js";
import type { WorkspaceAgentRunV1, WorkspaceToolCallInputV1 } from "../workspace/contracts.ts";

describe("SillyOS Pi Workspace tool binder", () => {
  it("binds edit to the run-owned edit scope while preserving Pi execution", async () => {
    const env = Object.freeze({}) as ExecutionEnv;
    const effectiveSignal = new AbortController().signal;
    const routedToolCalls: string[] = [];
    const run: WorkspaceAgentRunV1 = {
      env,
      getGenerationCursor: () => 1,
      executeReadCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected read scope")),
      executeWriteCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected write scope")),
      executeEditCall: <TValue>(input: WorkspaceToolCallInputV1<TValue>) => {
        routedToolCalls.push(input.toolCallId);
        return input.invoke(effectiveSignal);
      },
      executeBashCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected bash scope")),
      abortAndDrain: () => Promise.resolve(),
      finish: () => undefined,
    };
    const piTool: AgentHarnessTool<ExecutionToolContext> = {
      name: "edit",
      label: "edit",
      description: "Pi-owned edit",
      parameters: {},
      async execute(toolCallId, params, signal, _onUpdate, context) {
        expect(toolCallId).toBe("pi.tool.edit.1");
        expect(params).toEqual({ path: "artifact.txt" });
        expect(signal).toBe(effectiveSignal);
        expect(context.env).toBe(env);
        return { content: [], details: { edited: true } };
      },
    };

    const bound = bindPiWorkspaceEditToolV1(piTool, run);
    await expect(bound.execute("pi.tool.edit.1", { path: "artifact.txt" })).resolves.toEqual({
      content: [],
      details: { edited: true },
    });
    expect(routedToolCalls).toEqual(["pi.tool.edit.1"]);
  });

  it("binds the unchanged native Pi bash tool to the run-owned bash scope", async () => {
    const effectiveSignal = new AbortController().signal;
    const routedToolCalls: string[] = [];
    const updates: unknown[] = [];
    const env = {
      cwd: "/workspace",
      exec: async (
        command: string,
        options?: Parameters<ExecutionEnv["exec"]>[1],
      ): ReturnType<ExecutionEnv["exec"]> => {
        expect(command).toBe("printf native-pi-bash");
        expect(options).toMatchObject({
          cwd: "/workspace",
          env: {},
          inheritEnv: true,
          timeout: 2,
          abortSignal: effectiveSignal,
        });
        options?.onStdout?.("native stdout\n");
        options?.onStderr?.("native stderr\n");
        return {
          ok: true,
          value: {
            stdout: "native stdout\n",
            stderr: "native stderr\n",
            exitCode: 0,
          },
        };
      },
    } as ExecutionEnv;
    const run: WorkspaceAgentRunV1 = {
      env,
      getGenerationCursor: () => 1,
      executeReadCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected read scope")),
      executeWriteCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected write scope")),
      executeEditCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected edit scope")),
      executeBashCall: <TValue>(input: WorkspaceToolCallInputV1<TValue>) => {
        routedToolCalls.push(input.toolCallId);
        return input.invoke(effectiveSignal);
      },
      abortAndDrain: () => Promise.resolve(),
      finish: () => undefined,
    };
    const nativeTool = createBashTool();
    const bound = bindPiWorkspaceBashToolV1(nativeTool, run);

    expect(bound.name).toBe(nativeTool.name);
    expect(bound.label).toBe(nativeTool.label);
    expect(bound.description).toBe(nativeTool.description);
    expect(bound.parameters).toBe(nativeTool.parameters);
    await expect(
      bound.execute(
        "pi.tool.bash.1",
        { command: "printf native-pi-bash", timeout: 2 },
        undefined,
        (update) => updates.push(update),
      ),
    ).resolves.toEqual({
      content: [{ type: "text", text: "native stdout\nnative stderr\n" }],
      details: undefined,
    });
    expect(routedToolCalls).toEqual(["pi.tool.bash.1"]);
    expect(updates[0]).toEqual({ content: [], details: undefined });
    expect(updates.at(-1)).toEqual({
      content: [{ type: "text", text: "native stdout\nnative stderr\n" }],
      details: { truncation: undefined, fullOutputPath: undefined },
    });
  });

  it("preserves native Pi cancellation when its environment overflow write drains", async () => {
    const effectiveSignal = new AbortController();
    const overflowPath = "/workspace/.sillyos/tmp/bash-native-overflow.log";
    const appended: string[] = [];
    const env = {
      cwd: "/workspace",
      async exec(
        _command: string,
        options?: Parameters<ExecutionEnv["exec"]>[1],
      ): ReturnType<ExecutionEnv["exec"]> {
        options?.onStdout?.("x".repeat(60_000));
        effectiveSignal.abort();
        return err(new ExecutionError("aborted", "Workspace shell request was aborted"));
      },
      createTempFile: async () => ok(overflowPath),
      appendFile: async (_path: string, content: string | Uint8Array) => {
        appended.push(
          typeof content === "string" ? content : new TextDecoder().decode(content),
        );
        return ok(undefined);
      },
    } as ExecutionEnv;
    const run: WorkspaceAgentRunV1 = {
      env,
      getGenerationCursor: () => 1,
      executeReadCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected read scope")),
      executeWriteCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected write scope")),
      executeEditCall: <TValue>(_input: WorkspaceToolCallInputV1<TValue>) =>
        Promise.reject(new Error("unexpected edit scope")),
      executeBashCall: <TValue>(input: WorkspaceToolCallInputV1<TValue>) =>
        input.invoke(effectiveSignal.signal),
      abortAndDrain: () => Promise.resolve(),
      finish: () => undefined,
    };
    const bound = bindPiWorkspaceBashToolV1(createBashTool(), run);

    let failure: unknown;
    try {
      await bound.execute("pi.tool.bash.overflow-cancel.1", { command: "large-output" });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("Command aborted");
    expect((failure as Error).message).toContain(overflowPath);
    expect(appended.join("")).toHaveLength(60_000);
  });
});
