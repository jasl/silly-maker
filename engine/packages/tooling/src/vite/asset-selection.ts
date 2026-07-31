// SPDX-License-Identifier: MIT
import { randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, open, realpath, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, posix, relative, resolve, sep } from "node:path";

const windowsReservedNamePatternV1 = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu;
const windowsInvalidFilenameCharacterPatternV1 = /[<>:"|?*]/u;

/**
 * A Story-computed selection over a caller-owned source payload: which files
 * the built application can actually reach, plus scanner findings worth
 * surfacing at build time (references to absent files and similar data bugs).
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

function isMissingPathErrorV1(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

function containsAsciiControlCharacterV1(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

/**
 * Mirrors the project-config portable comparison key: locale-independent
 * Unicode NFC, uppercase, lowercase, then NFC again. This catches the
 * normalization and case aliases of supported case-insensitive hosts while
 * preserving the author's spelling when there is no collision.
 */
function portablePathComparisonKeyV1(value: string): string {
  return value.normalize("NFC").toUpperCase().toLowerCase().normalize("NFC");
}

async function lstatIfPresentV1(path: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissingPathErrorV1(error)) return null;
    throw error;
  }
}

function assertCanonicalAssetPathV1(relativePath: string): readonly string[] {
  const segments = relativePath.split("/");
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    posix.isAbsolute(relativePath) ||
    posix.normalize(relativePath) !== relativePath ||
    containsAsciiControlCharacterV1(relativePath) ||
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        segment !== segment.trim() ||
        segment.endsWith(".") ||
        windowsInvalidFilenameCharacterPatternV1.test(segment) ||
        windowsReservedNamePatternV1.test(segment),
    )
  ) {
    throw new TypeError(`invalid asset selection path: ${JSON.stringify(relativePath)}`);
  }
  return segments;
}

async function resolveSourceFileV1(
  realRoot: string,
  relativePath: string,
  segments: readonly string[],
): Promise<{
  readonly realSource: string;
  readonly size: number;
}> {
  const source = resolve(realRoot, ...segments);
  if (escapesRootV1(realRoot, source)) {
    throw new TypeError(`asset selection path escapes the source root: ${relativePath}`);
  }

  let realSource: string;
  try {
    realSource = await realpath(source);
  } catch (error) {
    if (isMissingPathErrorV1(error)) {
      throw new TypeError(
        `asset selection lists a file missing from the payload: ${relativePath}`,
        { cause: error },
      );
    }
    throw error;
  }
  if (escapesRootV1(realRoot, realSource)) {
    throw new TypeError(`asset selection path escapes the source root: ${relativePath}`);
  }

  const sourceStat = await stat(realSource);
  if (!sourceStat.isFile()) {
    throw new TypeError(`asset selection path is not a regular file: ${relativePath}`);
  }
  return Object.freeze({ realSource, size: sourceStat.size });
}

async function pinOutputRootV1(outputDirectory: string): Promise<string> {
  const outputRoot = resolve(outputDirectory);
  let outputStat = await lstatIfPresentV1(outputRoot);
  if (outputStat === null) {
    await mkdir(outputRoot, { recursive: true });
    outputStat = await lstat(outputRoot);
  }
  if (outputStat.isSymbolicLink()) {
    throw new TypeError(`asset selection output root must not be a symbolic link: ${outputRoot}`);
  }
  if (!outputStat.isDirectory()) {
    throw new TypeError(`asset selection output root is not a directory: ${outputRoot}`);
  }

  const realOutputRoot = await realpath(outputRoot);
  const confirmedStat = await lstat(outputRoot);
  if (confirmedStat.isSymbolicLink()) {
    throw new TypeError(`asset selection output root must not be a symbolic link: ${outputRoot}`);
  }
  if (!confirmedStat.isDirectory()) {
    throw new TypeError(`asset selection output root is not a directory: ${outputRoot}`);
  }
  return realOutputRoot;
}

async function ensureOutputParentV1(
  realOutputRoot: string,
  directorySegments: readonly string[],
): Promise<string> {
  let parent = realOutputRoot;
  for (const segment of directorySegments) {
    const candidate = resolve(parent, segment);
    if (escapesRootV1(realOutputRoot, candidate)) {
      throw new TypeError(`asset selection output path escapes the output root`);
    }

    let candidateStat = await lstatIfPresentV1(candidate);
    if (candidateStat === null) {
      try {
        await mkdir(candidate);
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      }
      candidateStat = await lstat(candidate);
    }
    if (candidateStat.isSymbolicLink()) {
      throw new TypeError(
        `asset selection output path component must not be a symbolic link: ${candidate}`,
      );
    }
    if (!candidateStat.isDirectory()) {
      throw new TypeError(`asset selection output path component is not a directory: ${candidate}`);
    }
    parent = candidate;
  }
  return parent;
}

async function assertOutputParentStableV1(realOutputRoot: string, parent: string): Promise<void> {
  const parentStat = await lstat(parent);
  if (parentStat.isSymbolicLink()) {
    throw new TypeError(
      `asset selection output path component must not be a symbolic link: ${parent}`,
    );
  }
  if (!parentStat.isDirectory()) {
    throw new TypeError(`asset selection output path component is not a directory: ${parent}`);
  }
  const realParent = await realpath(parent);
  if (escapesRootV1(realOutputRoot, realParent)) {
    throw new TypeError(`asset selection output path escapes the output root`);
  }
}

async function assertOutputLeafAcceptedV1(target: string): Promise<void> {
  const targetStat = await lstatIfPresentV1(target);
  if (targetStat?.isSymbolicLink()) {
    throw new TypeError(`asset selection output file must not be a symbolic link: ${target}`);
  }
  if (targetStat !== null && !targetStat.isFile()) {
    throw new TypeError(`asset selection output path is not a regular file: ${target}`);
  }
}

async function verifyCopiedOutputV1(input: {
  readonly realOutputRoot: string;
  readonly relativePath: string;
  readonly path: string;
  readonly size: number;
}): Promise<void> {
  const copiedStat = await lstat(input.path);
  if (copiedStat.isSymbolicLink() || !copiedStat.isFile()) {
    throw new TypeError(`asset selection copied output is not a regular file: ${input.path}`);
  }
  if (copiedStat.size !== input.size) {
    throw new TypeError(`asset selection copied output size changed: ${input.relativePath}`);
  }
  const realCopiedPath = await realpath(input.path);
  if (escapesRootV1(input.realOutputRoot, realCopiedPath)) {
    throw new TypeError(
      `asset selection output path escapes the output root: ${input.relativePath}`,
    );
  }
}

async function reserveTemporaryOutputFileV1(parent: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const temporaryPath = resolve(parent, `.sillymaker-asset-selection-${randomUUID()}.temporary`);
    try {
      const temporaryHandle = await open(temporaryPath, "wx");
      await temporaryHandle.close();
      return temporaryPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error(`could not reserve a unique asset selection temporary file in ${parent}`);
}

async function unlinkIfPresentV1(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (isMissingPathErrorV1(error)) return;
    throw error;
  }
}

/**
 * Copies exactly the planned files from a source payload into an output
 * directory, preserving relative structure.
 *
 * Contract:
 * - Every plan entry is one canonical source-root-relative POSIX file path in
 *   the repository's portable POSIX/Windows filename intersection. Exact
 *   duplicates are de-duplicated; portable case/Unicode aliases throw.
 * - A source root or selected source path may resolve through symbolic links,
 *   but the selected real file must remain inside the pinned real source root.
 * - The output root, its selected directory components, and existing output
 *   leaves must not be symbolic links. Output leaves are regular files.
 * - A planned file missing from the payload throws: the plan was computed
 *   from the same tree, so absence means the payload changed mid-build.
 * - The output directory's lifecycle belongs to the caller (this function
 *   creates parents but never deletes existing content).
 * - Source and output trees are caller-owned and must remain stable during
 *   this operation; this helper is not a synchronization primitive.
 */
export async function materializeAssetSelectionV1(input: {
  readonly sourceRoot: string;
  readonly outputDirectory: string;
  readonly plan: AssetSelectionPlanV1;
}): Promise<MaterializeAssetSelectionResultV1> {
  let sourceRootStat;
  try {
    sourceRootStat = await stat(input.sourceRoot);
  } catch (error) {
    if (isMissingPathErrorV1(error)) {
      throw new TypeError(`asset selection source root does not exist: ${input.sourceRoot}`, {
        cause: error,
      });
    }
    throw error;
  }
  if (!sourceRootStat.isDirectory()) {
    throw new TypeError(`asset selection source root is not a directory: ${input.sourceRoot}`);
  }
  const realRoot = await realpath(input.sourceRoot);
  const portablePaths = new Map<string, string>();
  const files = [...new Set(input.plan.files)].sort().map((relativePath) => {
    const segments = assertCanonicalAssetPathV1(relativePath);
    const comparisonKey = portablePathComparisonKeyV1(relativePath);
    const previous = portablePaths.get(comparisonKey);
    if (previous !== undefined) {
      throw new TypeError(
        `asset selection portable path collision: ${JSON.stringify(previous)} and ${JSON.stringify(
          relativePath,
        )}`,
      );
    }
    portablePaths.set(comparisonKey, relativePath);
    return { relativePath, segments };
  });
  const sourceFiles = await Promise.all(
    files.map(async ({ relativePath, segments }) => ({
      relativePath,
      segments,
      ...(await resolveSourceFileV1(realRoot, relativePath, segments)),
    })),
  );
  const realOutputRoot = await pinOutputRootV1(input.outputDirectory);

  let totalBytes = 0;
  for (const { realSource, relativePath, segments, size } of sourceFiles) {
    const parent = await ensureOutputParentV1(realOutputRoot, segments.slice(0, -1));
    const target = resolve(parent, segments.at(-1)!);
    if (escapesRootV1(realOutputRoot, target)) {
      throw new TypeError(`asset selection output path escapes the output root: ${relativePath}`);
    }

    await assertOutputLeafAcceptedV1(target);

    const temporaryPath = await reserveTemporaryOutputFileV1(parent);
    let replacedTarget = false;
    try {
      await copyFile(realSource, temporaryPath);
      await verifyCopiedOutputV1({
        realOutputRoot,
        relativePath,
        path: temporaryPath,
        size,
      });
      await assertOutputParentStableV1(realOutputRoot, parent);
      await assertOutputLeafAcceptedV1(target);
      await rename(temporaryPath, target);
      replacedTarget = true;
      await verifyCopiedOutputV1({
        realOutputRoot,
        relativePath,
        path: target,
        size,
      });
    } finally {
      if (!replacedTarget) await unlinkIfPresentV1(temporaryPath);
    }
    totalBytes += size;
  }

  return Object.freeze({ fileCount: sourceFiles.length, totalBytes });
}
