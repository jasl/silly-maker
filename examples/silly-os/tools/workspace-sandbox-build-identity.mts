// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";

export const workspaceSandboxDevelopmentBuildIdentityV1 = "sillyos.workspace-sandbox.development";

function runGitV1(argumentsV1: readonly string[], cwd: string): string {
  return execFileSync("git", [...argumentsV1], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/** One product-owned identity is embedded into both control and Sandbox builds. */
export function collectWorkspaceSandboxBuildIdentityV1(input: {
  readonly appRoot: string;
  readonly command: "build" | "serve";
}): string {
  if (input.command === "serve") return workspaceSandboxDevelopmentBuildIdentityV1;

  let commit: string;
  let status: string;
  try {
    commit = runGitV1(["rev-parse", "--verify", "HEAD"], input.appRoot);
    status = runGitV1(["status", "--porcelain=v1", "--untracked-files=normal"], input.appRoot);
  } catch {
    throw new TypeError("sillyos.workspace_sandbox.build_identity_unavailable");
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commit)) {
    throw new TypeError("sillyos.workspace_sandbox.build_identity_invalid");
  }
  return `sillyos.workspace-sandbox.${commit}${status === "" ? "" : "-dirty"}`;
}
