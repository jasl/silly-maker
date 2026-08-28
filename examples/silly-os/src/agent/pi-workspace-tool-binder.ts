// SPDX-License-Identifier: MIT

import type {
  AgentHarnessTool,
  AgentTool,
  ExecutionToolContext,
} from "./pi-workspace-runtime-bridge.js";
import { Type } from "./pi-workspace-runtime-bridge.js";

import {
  createWorkspaceGrepQueryV1,
  type WorkspaceAgentRunV1,
  type WorkspaceGrepInputV1,
  type WorkspaceGrepResultV1,
  workspaceRootV1,
} from "../workspace/contracts.ts";

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
  kind: "read" | "write" | "edit" | "bash",
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
        case "bash":
          return run.executeBashCall(input);
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

export function bindPiWorkspaceBashToolV1<TTool extends WorkspaceHarnessToolV1>(
  tool: TTool,
  run: WorkspaceAgentRunV1,
): BoundPiWorkspaceToolV1<TTool> {
  return bindPiWorkspaceToolV1(tool, run, "bash");
}

export type PiWorkspaceGrepParametersV1 = WorkspaceGrepInputV1;

const piWorkspaceGrepSchemaV1 = Type.Object(
  {
    pattern: Type.String({
      minLength: 1,
      maxLength: 4 * 1024,
      description: "Text or regular expression to search for.",
    }),
    path: Type.Optional(Type.String({
      minLength: 1,
      maxLength: 1024,
      description: "One workspace-relative path, or an absolute path below /workspace.",
    })),
    glob: Type.Optional(Type.String({
      minLength: 1,
      maxLength: 512,
      description: "One optional rg-style file glob.",
    })),
    ignoreCase: Type.Optional(Type.Boolean()),
    literal: Type.Optional(Type.Boolean()),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  },
  { additionalProperties: false },
);

function normalizedPiWorkspaceGrepPathV1(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  if (path === "." || path === "./" || path === workspaceRootV1 || path === `${workspaceRootV1}/`) {
    return workspaceRootV1;
  }
  let relative: string;
  if (path.startsWith(`${workspaceRootV1}/`)) relative = path.slice(workspaceRootV1.length + 1);
  else {
    if (path.startsWith("/")) return path;
    relative = path.startsWith("./") ? path.slice(2) : path;
  }
  if (relative.endsWith("/")) relative = relative.slice(0, -1);
  return `${workspaceRootV1}/${relative}`;
}

function piWorkspaceGrepTextV1(result: WorkspaceGrepResultV1): string {
  const lines = result.matches.map(({ path, line, text }) => `${path}:${String(line)}:${text}`);
  if (lines.length === 0) lines.push("No matches found.");
  if (result.truncated) {
    lines.push("Results were truncated; narrow the path, glob, pattern, or limit.");
  }
  return lines.join("\n");
}

/**
 * Product-shipped Pi AgentTool backed by the explicit read-only Workspace grep
 * operation. Pi remains the sole tool dispatcher; this adapter contributes no
 * generic command or plugin framework.
 */
export function createPiWorkspaceGrepToolV1(
  run: WorkspaceAgentRunV1,
): AgentTool<PiWorkspaceGrepParametersV1, WorkspaceGrepResultV1> {
  return {
    name: "grep",
    label: "Search workspace",
    description:
      "Search text in the current Program workspace. Prefer this bounded structured search over bash rg when a pipeline is not required.",
    parameters: piWorkspaceGrepSchemaV1,
    executionMode: "sequential",
    async execute(toolCallId, params, signal) {
      const path = normalizedPiWorkspaceGrepPathV1(params.path);
      const query = createWorkspaceGrepQueryV1({
        ...params,
        ...(path === undefined ? {} : { path }),
      });
      const result = await run.executeGrepCall({
        toolCallId,
        query,
        ...(signal === undefined ? {} : { signal }),
      });
      return {
        content: [{ type: "text", text: piWorkspaceGrepTextV1(result) }],
        details: result,
      };
    },
  };
}
