// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Plugin } from "vite";

/**
 * Build-time collection of the human-facing version stamp: the application's
 * and the engine's `package.json` versions plus their git commits. Injected
 * into the page as `globalThis.__SILLYMAKER_VERSIONS__` and read at runtime
 * through `readVersionStampV1` (`@sillymaker/base`).
 *
 * Every field degrades independently to `null` — no package version, no git
 * binary, a non-git checkout (e.g. a published engine package), or a detached
 * layout must never fail the build.
 */

export interface CollectedVersionStampV1 {
  readonly applicationVersion: string | null;
  readonly applicationCommit: string | null;
  readonly engineVersion: string | null;
  readonly engineCommit: string | null;
}

type RunGitV1 = (args: readonly string[], cwd: string) => string;

const defaultRunGitV1: RunGitV1 = (args, cwd) =>
  execFileSync("git", [...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

function packageVersionV1(packageJsonPath: string): string | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    if (parsed === null || typeof parsed !== "object") return null;
    const version = Reflect.get(parsed, "version") as unknown;
    if (typeof version !== "string") return null;
    const trimmed = version.trim();
    return trimmed === "" ? null : trimmed;
  } catch {
    return null;
  }
}

function gitCommitV1(directory: string, runGit: RunGitV1): string | null {
  try {
    const commit = runGit(["rev-parse", "--short", "HEAD"], directory).trim();
    return /^[0-9a-f]{4,40}$/u.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

/**
 * The engine side reads `@sillymaker/base` as installed by the application
 * (a `file:` link resolves to the engine checkout, where git metadata exists;
 * a registry install resolves to an extracted tarball, where it does not).
 */
function enginePackageJsonPathV1(appRoot: string): string | null {
  const installed = join(appRoot, "node_modules", "@sillymaker", "base", "package.json");
  try {
    if (existsSync(installed)) return realpathSync(installed);
  } catch {
    // Fall through to "unknown engine".
  }
  return null;
}

export function collectVersionStampV1(input: {
  readonly appRoot: string;
  readonly runGit?: RunGitV1;
}): CollectedVersionStampV1 {
  const runGit = input.runGit ?? defaultRunGitV1;
  const enginePackageJson = enginePackageJsonPathV1(input.appRoot);
  return Object.freeze({
    applicationVersion: packageVersionV1(join(input.appRoot, "package.json")),
    applicationCommit: gitCommitV1(input.appRoot, runGit),
    engineVersion: enginePackageJson === null ? null : packageVersionV1(enginePackageJson),
    engineCommit:
      enginePackageJson === null ? null : gitCommitV1(dirname(enginePackageJson), runGit),
  });
}

/** Head script carrying the stamp; consumed by `readVersionStampV1`. */
export function versionStampScriptV1(stamp: CollectedVersionStampV1): string {
  return `<script>globalThis.__SILLYMAKER_VERSIONS__ = ${JSON.stringify(stamp)};</script>`;
}

/** Injects the stamp into the page at dev and build time. */
export function versionStampPluginV1(stamp: CollectedVersionStampV1): Plugin {
  return {
    name: "sillymaker:version-stamp",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "script",
            children: `globalThis.__SILLYMAKER_VERSIONS__ = ${JSON.stringify(stamp)};`,
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}
