// SPDX-License-Identifier: MIT
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { parseMotionDocumentV1, parseSceneDocumentV1 } from "@sillymaker/base";

/**
 * The Project Authoring Index (Authoring Architecture S2): one
 * directory-convention scan constructs the authoring-source enumeration
 * every tooling consumer shares — the `story check` source lints walk the
 * same files through `listAuthoringSourceFilesV1`, and the dev-server list
 * endpoints (and through them Studio's scene navigator and motion catalog)
 * consume `buildAuthoringProjectIndexV1`. The index is built at
 * dev/build/check time and never written to disk. It is discovery
 * infrastructure, not a second configuration authority: narrative code
 * keeps referencing scene and motion documents through explicit imports,
 * so the deterministic closure and build identity still see the documents
 * themselves. Files that fail admission are named with a structured
 * reason instead of silently disappearing.
 */

export type AuthoringSourceSuffixV1 = ".scene.json" | ".motion.json";

export interface AuthoringSourceFileV1 {
  /** Root-relative posix path (the id every port and lint reports). */
  readonly path: string;
  readonly filePath: string;
}

export interface AuthoringSceneSourceV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
}

export interface AuthoringMotionSourceV1 {
  readonly path: string;
  readonly motionId: string;
  readonly label: string;
}

export interface AuthoringIndexSkipV1 {
  readonly path: string;
  readonly kind: "scene" | "motion";
  readonly reason: string;
}

export interface AuthoringProjectIndexV1 {
  readonly scenes: readonly AuthoringSceneSourceV1[];
  readonly motions: readonly AuthoringMotionSourceV1[];
  /** Convention-matched files the index could not admit, with the reason. */
  readonly skipped: readonly AuthoringIndexSkipV1[];
}

function walkFilesV1(root: string, suffix: string, collected: string[]): void {
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = resolve(root, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      walkFilesV1(path, suffix, collected);
      continue;
    }
    if (stat.isFile() && name.endsWith(suffix)) collected.push(path);
  }
}

/**
 * Every convention-matched source file under the root, in deterministic
 * (codepoint) order of its root-relative posix path. Skips `node_modules`,
 * dot-prefixed names, and symlinked segments — the same walk the CAS ports'
 * path resolution enforces.
 */
export function listAuthoringSourceFilesV1(
  sourceRoot: string,
  suffix: AuthoringSourceSuffixV1,
): readonly AuthoringSourceFileV1[] {
  const root = resolve(sourceRoot);
  const files: string[] = [];
  walkFilesV1(root, suffix, files);
  const entries = files.map((filePath) =>
    Object.freeze({ path: relative(root, filePath).split(sep).join("/"), filePath })
  );
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze(entries);
}

function reasonV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Scans one source root into the unified scene + motion enumeration. */
export function buildAuthoringProjectIndexV1(sourceRoot: string): AuthoringProjectIndexV1 {
  const scenes: AuthoringSceneSourceV1[] = [];
  const motions: AuthoringMotionSourceV1[] = [];
  const skipped: AuthoringIndexSkipV1[] = [];

  for (const file of listAuthoringSourceFilesV1(sourceRoot, ".scene.json")) {
    try {
      const sceneDocument = parseSceneDocumentV1(
        JSON.parse(readFileSync(file.filePath, "utf8")) as unknown,
        `/${file.path}`,
      );
      scenes.push(
        Object.freeze({
          path: file.path,
          sceneId: sceneDocument.sceneId,
          label: sceneDocument.label,
        }),
      );
    } catch (error) {
      skipped.push(Object.freeze({ path: file.path, kind: "scene", reason: reasonV1(error) }));
    }
  }

  for (const file of listAuthoringSourceFilesV1(sourceRoot, ".motion.json")) {
    try {
      const motionDocument = parseMotionDocumentV1(
        JSON.parse(readFileSync(file.filePath, "utf8")) as unknown,
        `/${file.path}`,
      );
      motions.push(
        Object.freeze({
          path: file.path,
          motionId: motionDocument.motionId,
          label: motionDocument.label,
        }),
      );
    } catch (error) {
      skipped.push(Object.freeze({ path: file.path, kind: "motion", reason: reasonV1(error) }));
    }
  }

  return Object.freeze({
    scenes: Object.freeze(scenes),
    motions: Object.freeze(motions),
    skipped: Object.freeze(skipped),
  });
}
