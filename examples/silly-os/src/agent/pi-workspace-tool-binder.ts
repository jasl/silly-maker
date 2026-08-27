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
  kind: "read" | "write" | "edit",
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
      switch (kind) {
        case "read":
          return run.executeReadCall(input);
        case "write":
          return run.executeWriteCall(input);
        case "edit":
          return run.executeEditCall(input);
        default: {
          const exhaustive: never = kind;
          throw new TypeError(`Unsupported Pi workspace tool kind: ${String(exhaustive)}`);
        }
      }
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

export function bindPiWorkspaceEditToolV1<TTool extends WorkspaceHarnessToolV1>(
  tool: TTool,
  run: WorkspaceAgentRunV1,
): BoundPiWorkspaceToolV1<TTool> {
  return bindPiWorkspaceToolV1(tool, run, "edit");
}
