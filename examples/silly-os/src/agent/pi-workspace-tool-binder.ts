// SPDX-License-Identifier: MIT

import type {
  AgentHarnessTool,
  AgentTool,
  ExecutionToolContext,
} from "./pi-workspace-runtime-bridge.js";

import type { WorkspaceAgentRunV1 } from "../workspace/contracts.ts";

type WorkspaceHarnessToolV1 = AgentHarnessTool<ExecutionToolContext>;

export type BoundPiWorkspaceToolV1<TTool extends WorkspaceHarnessToolV1> =
  & Omit<TTool, "execute">
  & AgentTool
  & {
    execute(
      toolCallId: string,
      params: Parameters<TTool["execute"]>[1],
      signal?: AbortSignal,
      onUpdate?: Parameters<TTool["execute"]>[3],
    ): ReturnType<TTool["execute"]>;
  };

function bindPiWorkspaceToolV1<TTool extends WorkspaceHarnessToolV1>(
  tool: TTool,
  run: WorkspaceAgentRunV1,
  kind: "read" | "write",
): BoundPiWorkspaceToolV1<TTool> {
  const context = Object.freeze({ env: run.env });
  const bound: AgentTool = {
    ...tool,
    execute(toolCallId, params, signal, onUpdate) {
      const execute = (effectiveSignal: AbortSignal) =>
        tool.execute(
          toolCallId,
          // Pi Agent admits arguments against the unchanged factory schema before execution.
          params as Parameters<TTool["execute"]>[1],
          effectiveSignal,
          onUpdate as Parameters<TTool["execute"]>[3],
          context,
        );
      const input = signal === undefined
        ? { toolCallId, invoke: execute }
        : { toolCallId, signal, invoke: execute };
      return kind === "read" ? run.executeReadCall(input) : run.executeWriteCall(input);
    },
  };
  return bound as BoundPiWorkspaceToolV1<TTool>;
}

export function bindPiWorkspaceReadToolV1<TTool extends WorkspaceHarnessToolV1>(
  tool: TTool,
  run: WorkspaceAgentRunV1,
): BoundPiWorkspaceToolV1<TTool> {
  return bindPiWorkspaceToolV1(tool, run, "read");
}

export function bindPiWorkspaceWriteToolV1<TTool extends WorkspaceHarnessToolV1>(
  tool: TTool,
  run: WorkspaceAgentRunV1,
): BoundPiWorkspaceToolV1<TTool> {
  return bindPiWorkspaceToolV1(tool, run, "write");
}
