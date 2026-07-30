// SPDX-License-Identifier: MIT
import { existsSync, realpathSync } from "node:fs";
import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/**
 * A Story-computed selection over a large source payload (for example a
 * legacy engine export being ported): which files the built application can
 * actually reach, plus scanner findings worth surfacing at build time
 * (references to files absent from the payload, and similar data bugs).
 *
 * The scanner that produces a plan is domain knowledge and stays in the
 * Story; this module only owns the safe materialization of a plan.
 */
export interface AssetSelectionPlanV1 {
  /** Source-root-relative POSIX file paths to materialize. */
  readonly files: readonly string[];
  /** Human-readable scanner findings; callers decide how loudly to report. */
  readonly warnings: readonly string[];
}

export interface MaterializeAssetSelectionResultV1 {
  /** Distinct files copied (the plan is de-duplicated first). */
  readonly fileCount: number;
  /** Total source bytes materialized. */
  readonly totalBytes: number;
}

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

/**
 * Copies exactly the planned files from a source payload into an output
 * directory, preserving relative structure.
 *
 * Contract, chosen for ported-payload builds:
 * - The source root MAY be (or contain) symbolic links — research payloads
 *   often live behind one. Every copied file is dereferenced, so the output
 *   contains only regular files and static hosts that fail closed on
 *   symlinks (the desktop shell) serve it verbatim.
 * - Every plan path must resolve to a regular file inside the source root;
 *   traversal, absolute paths, backslashes, and NUL bytes throw.
 * - A planned file missing from the payload throws: the plan was computed
 *   from the same tree, so absence means the payload changed mid-build.
 * - The output directory's lifecycle belongs to the caller (this function
 *   creates parents but never deletes existing content).
 */
export async function materializeAssetSelectionV1(input: {
  readonly sourceRoot: string;
  readonly outputDirectory: string;
  readonly plan: AssetSelectionPlanV1;
}): Promise<MaterializeAssetSelectionResultV1> {
  if (!existsSync(input.sourceRoot)) {
    throw new TypeError(`asset selection source root does not exist: ${input.sourceRoot}`);
  }
  const realRoot = realpathSync(input.sourceRoot);

  const files = [...new Set(input.plan.files)].sort();
  let totalBytes = 0;
  const madeDirectories = new Set<string>();
  for (const relativePath of files) {
    if (
      relativePath.length === 0 ||
      relativePath.includes("\0") ||
      relativePath.includes("\\") ||
      relativePath.startsWith("/")
    ) {
      throw new TypeError(`invalid asset selection path: ${JSON.stringify(relativePath)}`);
    }
    const source = resolve(realRoot, relativePath);
    if (escapesRootV1(realRoot, source)) {
      throw new TypeError(`asset selection path escapes the source root: ${relativePath}`);
    }
    let sourceStat;
    try {
      sourceStat = await stat(source);
    } catch {
      throw new TypeError(`asset selection lists a file missing from the payload: ${relativePath}`);
    }
    if (!sourceStat.isFile()) {
      throw new TypeError(`asset selection path is not a regular file: ${relativePath}`);
    }
    const realSource = realpathSync(source);
    if (escapesRootV1(realRoot, realSource)) {
      throw new TypeError(`asset selection path escapes the source root: ${relativePath}`);
    }

    const target = join(input.outputDirectory, relativePath);
    const parent = dirname(target);
    if (!madeDirectories.has(parent)) {
      await mkdir(parent, { recursive: true });
      madeDirectories.add(parent);
    }
    await cp(source, target, { dereference: true });
    totalBytes += sourceStat.size;
  }

  return Object.freeze({ fileCount: files.length, totalBytes });
}
