// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import { stageBrowserProgramWorkspaceScriptsV1 } from "../agent/browser-program-workspace-scripts.ts";
import type { WorkspaceAgentRunV1 } from "../workspace/contracts.ts";

describe("Browser Program workspace script hydration", () => {
  it("writes exact package bytes below the Process-scoped Program directory", async () => {
    const directories: string[] = [];
    const writes: { readonly path: string; readonly bytes: Uint8Array }[] = [];
    const run = {
      env: {
        async createDir(path: string) {
          directories.push(path);
          return { ok: true, value: undefined };
        },
        async writeFile(path: string, bytes: Uint8Array) {
          writes.push({ path, bytes: bytes.slice() });
          return { ok: true, value: undefined };
        },
      },
      executeWriteCall: vi.fn(async (input: {
        readonly toolCallId: string;
        readonly invoke: (signal: AbortSignal) => Promise<void>;
      }) => await input.invoke(new AbortController().signal)),
    } as unknown as WorkspaceAgentRunV1;
    const bytes = new TextEncoder().encode("print('ready')");

    await stageBrowserProgramWorkspaceScriptsV1({
      run,
      scripts: [{
        packagePath: "scripts/prepare.js",
        workspacePath: "/workspace/.sillyos/program/scripts/prepare.js",
        runtime: "quickjs",
        bytes,
      }],
    });

    expect(run.executeWriteCall).toHaveBeenCalledTimes(1);
    expect(directories).toEqual(["/workspace/.sillyos/program/scripts"]);
    expect(writes).toEqual([{
      path: "/workspace/.sillyos/program/scripts/prepare.js",
      bytes,
    }]);
  });

  it("does not mutate the Workspace when the package declares no scripts", async () => {
    const executeWriteCall = vi.fn();
    const run = { executeWriteCall } as unknown as WorkspaceAgentRunV1;

    await stageBrowserProgramWorkspaceScriptsV1({ run, scripts: [] });

    expect(executeWriteCall).not.toHaveBeenCalled();
  });
});
