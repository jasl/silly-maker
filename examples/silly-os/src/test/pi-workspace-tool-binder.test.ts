// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { bindPiWorkspaceEditToolV1 } from "../agent/pi-workspace-tool-binder.ts";
import type {
  AgentHarnessTool,
  ExecutionEnv,
  ExecutionToolContext,
} from "../agent/pi-workspace-runtime-bridge.js";
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
});
