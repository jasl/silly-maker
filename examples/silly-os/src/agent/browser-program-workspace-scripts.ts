// SPDX-License-Identifier: MIT

import type { WorkspaceAgentRunV1 } from "../workspace/contracts.ts";
import type { BrowserProgramWorkspaceScriptV1 } from "./browser-program-runtime-profile.ts";

/**
 * Copies exact package scripts into the current Process VFS. The package stays
 * immutable; only the fixed Host performs this hydration, and later execution
 * still goes through the runtime profile's admitted qjs/python harness.
 */
export async function stageBrowserProgramWorkspaceScriptsV1(input: {
  readonly run: WorkspaceAgentRunV1;
  readonly scripts: readonly BrowserProgramWorkspaceScriptV1[];
}): Promise<void> {
  if (input.scripts.length === 0) return;
  await input.run.executeWriteCall({
    toolCallId: "sillyos.program.stage_scripts",
    invoke: async (signal) => {
      for (const script of input.scripts) {
        const parent = script.workspacePath.slice(0, script.workspacePath.lastIndexOf("/"));
        const created = await input.run.env.createDir(parent, {
          recursive: true,
          abortSignal: signal,
        });
        if (!created.ok) throw created.error;
        const written = await input.run.env.writeFile(script.workspacePath, script.bytes, signal);
        if (!written.ok) throw written.error;
      }
    },
  });
}
