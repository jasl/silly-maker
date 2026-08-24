// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";

import type { Plugin } from "vite";

/**
 * Build-time collection of the human-facing version stamp: the application's
 * and the engine's `package.json` versions plus their git commits (suffixed
 * `-dirty` when the checkout has uncommitted changes). Injected into the
 * page as `globalThis.__SILLYMAKER_VERSIONS__` and read at runtime through
 * `readVersionStampV1` (`@sillymaker/base`).
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
const versionStampFieldMaxCodePointsV1 = 128;
const nonPrintableVersionStampPatternV1 = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
const fullGitCommitPatternV1 = /^(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?$/u;

/**
 * @internal One immutable Desktop build receipt crosses the process boundary
 * through this key so Vite injection and artifact naming cannot observe
 * different package/Git state.
 */
export const versionStampReceiptEnvironmentKeyInternalV1 = "SILLYMAKER_BUILD_VERSION_STAMP_V1";

const defaultRunGitV1: RunGitV1 = (args, cwd) =>
  execFileSync("git", [...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

function boundedPrintableFieldV1(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  let codePointCount = 0;
  const codePoints = trimmed[Symbol.iterator]();
  while (!codePoints.next().done) {
    codePointCount += 1;
    if (codePointCount > versionStampFieldMaxCodePointsV1) return null;
  }
  return nonPrintableVersionStampPatternV1.test(trimmed) ? null : trimmed;
}

/**
 * @internal Normalizes one parsed process-boundary receipt with ordinary field reads.
 */
export function normalizeCollectedVersionStampInternalV1(
  source: unknown,
): CollectedVersionStampV1 | null {
  if (source === null || typeof source !== "object" || Array.isArray(source)) return null;
  const fields = source as Readonly<Record<string, unknown>>;
  const versionV1 = (key: "applicationVersion" | "engineVersion"): string | null => {
    const value = fields[key];
    return typeof value === "string" ? boundedPrintableFieldV1(value) : null;
  };
  const commitV1 = (key: "applicationCommit" | "engineCommit"): string | null => {
    const value = fields[key];
    return typeof value === "string" && fullGitCommitPatternV1.test(value) ? value : null;
  };
  try {
    return Object.freeze({
      applicationVersion: versionV1("applicationVersion"),
      applicationCommit: commitV1("applicationCommit"),
      engineVersion: versionV1("engineVersion"),
      engineCommit: commitV1("engineCommit"),
    });
  } catch {
    return null;
  }
}

/** @internal Serializes one already-collected Desktop build receipt. */
export function serializeVersionStampReceiptInternalV1(stamp: CollectedVersionStampV1): string {
  return JSON.stringify(
    normalizeCollectedVersionStampInternalV1(stamp) ?? {
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    },
  );
}

/** @internal Reads a Desktop receipt; malformed ambient input is ignored. */
export function parseVersionStampReceiptInternalV1(
  serialized: string | undefined,
): CollectedVersionStampV1 | null {
  if (serialized === undefined) return null;
  try {
    return normalizeCollectedVersionStampInternalV1(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}

function packageVersionV1(packageJsonPath: string): string | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    if (parsed === null || typeof parsed !== "object") return null;
    const version = Reflect.get(parsed, "version") as unknown;
    if (typeof version !== "string") return null;
    return boundedPrintableFieldV1(version);
  } catch {
    return null;
  }
}

function gitCommitV1(directory: string, runGit: RunGitV1): string | null {
  try {
    const commit = runGit(["rev-parse", "--verify", "HEAD"], directory).trim();
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commit)) return null;
    const status = runGit(
      ["status", "--porcelain=v1", "--untracked-files=normal"],
      directory,
    ).trim();
    return `${commit}${status === "" ? "" : "-dirty"}`;
  } catch {
    // A commit without a successful cleanliness probe would falsely look
    // clean. Diagnostic metadata fails closed to "unknown" instead.
    return null;
  }
}

function isWithinV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

/**
 * The engine side reads `@sillymaker/base` as installed by the application
 * (a `file:` link resolves to the engine checkout, where git metadata exists;
 * a registry install resolves to an extracted tarball, where it does not).
 */
function enginePackageV1(
  appRoot: string,
): { readonly packageJson: string; readonly commitDirectory: string | null } | null {
  const installed = join(appRoot, "node_modules", "@sillymaker", "base", "package.json");
  try {
    if (!existsSync(installed)) return null;
    const packageJson = realpathSync(installed);
    const nodeModules = realpathSync(join(appRoot, "node_modules"));
    return Object.freeze({
      packageJson,
      // A physical registry extraction can otherwise let `git rev-parse`
      // walk upward into the consuming application's repository. Only a
      // linked checkout outside node_modules owns usable engine git identity.
      commitDirectory: isWithinV1(nodeModules, packageJson) ? null : dirname(packageJson),
    });
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
  const enginePackage = enginePackageV1(input.appRoot);
  return Object.freeze({
    applicationVersion: packageVersionV1(join(input.appRoot, "package.json")),
    applicationCommit: gitCommitV1(input.appRoot, runGit),
    engineVersion: enginePackage === null ? null : packageVersionV1(enginePackage.packageJson),
    engineCommit:
      enginePackage?.commitDirectory === null || enginePackage?.commitDirectory === undefined
        ? null
        : gitCommitV1(enginePackage.commitDirectory, runGit),
  });
}

function inlineJsonV1(value: unknown): string {
  return JSON.stringify(value).replace(/[<&\u2028\u2029]/gu, (character) => {
    switch (character) {
      case "<":
        return "\\u003c";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      default:
        return "\\u2029";
    }
  });
}

function versionStampAssignmentV1(stamp: CollectedVersionStampV1): string {
  return `globalThis.__SILLYMAKER_VERSIONS__ = ${inlineJsonV1(stamp)};`;
}

/** Head script carrying the stamp; consumed by `readVersionStampV1`. */
export function versionStampScriptV1(stamp: CollectedVersionStampV1): string {
  return `<script>${versionStampAssignmentV1(stamp)}</script>`;
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
            children: versionStampAssignmentV1(stamp),
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}
