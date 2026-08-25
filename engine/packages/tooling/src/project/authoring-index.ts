// SPDX-License-Identifier: MIT
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import {
  parseChromeLayoutDocumentV1,
  parseMotionDocumentV1,
  parseRegionsDocumentV1,
  parseSceneDocumentV1,
} from "@sillymaker/base";
import { admitAuthoringSceneSourceBytesV1 } from "@sillymaker/base/authoring/scene";

/**
 * The Project Authoring Index (Authoring Architecture S2): one
 * directory-convention scan constructs the authoring-source enumeration
 * every tooling consumer shares — the `app check` source lints retain their
 * source-family walk through `listAuthoringSourceFilesV1`, while one lazy
 * project owner serves every dev-server list endpoint and incrementally admits
 * watcher changes. One-shot CLI consumers use `buildAuthoringProjectIndexV1`.
 * The index is never written to disk. It is discovery
 * infrastructure, not a second configuration authority: narrative code
 * keeps referencing scene and motion documents through explicit imports,
 * so the deterministic closure and build identity still see the documents
 * themselves. Files that fail admission are named with a structured
 * reason instead of silently disappearing.
 */

export type AuthoringSourceSuffixV1 =
  | ".scene.json"
  | ".authoring-scene.json"
  | ".motion.json"
  | ".regions.json"
  | ".chrome-layout.json";

export interface AuthoringSourceFileV1 {
  /** Root-relative posix path (the id every port and lint reports). */
  readonly path: string;
  readonly filePath: string;
}

export type AuthoringSceneSourceKindV1 = "authoring_scene" | "low_level_scene";

export interface AuthoringSceneSourceV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
  /** Explicit source authority; tooling never infers one authority from admitted contents. */
  readonly sourceKind: AuthoringSceneSourceKindV1;
}

export interface AuthoringMotionSourceV1 {
  readonly path: string;
  readonly motionId: string;
  readonly label: string;
}

export interface AuthoringRegionsSourceV1 {
  readonly path: string;
  readonly regionsId: string;
  readonly label: string;
}

export interface AuthoringChromeLayoutSourceV1 {
  readonly path: string;
  readonly layoutId: string;
  readonly label: string;
}

export interface AuthoringIndexSkipV1 {
  readonly path: string;
  readonly kind: "scene" | "motion" | "regions" | "chrome-layout";
  readonly reason: string;
}

export interface AuthoringProjectIndexV1 {
  readonly scenes: readonly AuthoringSceneSourceV1[];
  readonly motions: readonly AuthoringMotionSourceV1[];
  readonly regions: readonly AuthoringRegionsSourceV1[];
  readonly chromeLayouts: readonly AuthoringChromeLayoutSourceV1[];
  /** Convention-matched files the index could not admit, with the reason. */
  readonly skipped: readonly AuthoringIndexSkipV1[];
}

/** Logical filesystem work performed by one project-scoped index owner. */
export interface AuthoringProjectIndexCountersV1 {
  readonly treeWalks: number;
  readonly fileReads: number;
  readonly parses: number;
  readonly invalidations: number;
}

/**
 * A lazy project-scoped metadata index. Dev-server list consumers share its
 * stable cached snapshot; watcher events invalidate one root-relative source path.
 */
export interface AuthoringProjectIndexOwnerV1 {
  snapshot(): AuthoringProjectIndexV1;
  invalidate(path: string): void;
  counters(): AuthoringProjectIndexCountersV1;
}

type AuthoringSourceKindV1 = AuthoringIndexSkipV1["kind"];

type AdmittedAuthoringRecordV1 =
  | { readonly kind: "scene"; readonly entry: AuthoringSceneSourceV1 }
  | { readonly kind: "motion"; readonly entry: AuthoringMotionSourceV1 }
  | { readonly kind: "regions"; readonly entry: AuthoringRegionsSourceV1 }
  | { readonly kind: "chrome-layout"; readonly entry: AuthoringChromeLayoutSourceV1 }
  | { readonly kind: "skipped"; readonly entry: AuthoringIndexSkipV1 };

interface MutableAuthoringProjectIndexCountersV1 {
  treeWalks: number;
  fileReads: number;
  parses: number;
  invalidations: number;
}

const authoringKindOrderV1: Readonly<Record<AuthoringSourceKindV1, number>> = {
  scene: 0,
  motion: 1,
  regions: 2,
  "chrome-layout": 3,
};

function authoringSourceKindV1(path: string): AuthoringSourceKindV1 | undefined {
  if (sceneSourceKindV1(path) !== undefined) return "scene";
  if (path.endsWith(".motion.json")) return "motion";
  if (path.endsWith(".regions.json")) return "regions";
  if (path.endsWith(".chrome-layout.json")) return "chrome-layout";
  return undefined;
}

function sceneSourceKindV1(path: string): AuthoringSceneSourceKindV1 | undefined {
  if (path.endsWith(".authoring-scene.json")) return "authoring_scene";
  if (path.endsWith(".scene.json")) return "low_level_scene";
  return undefined;
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
  const entries = files.map((filePath) => ({
    path: relative(root, filePath).split(sep).join("/"),
    filePath,
  }));
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

function reasonV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function skippedRecordV1(
  path: string,
  kind: AuthoringSourceKindV1,
  error: unknown,
): AdmittedAuthoringRecordV1 {
  return {
    kind: "skipped",
    entry: { path, kind, reason: reasonV1(error) },
  };
}

function admitAuthoringRecordV1(
  path: string,
  kind: AuthoringSourceKindV1,
  bytes: Uint8Array,
): AdmittedAuthoringRecordV1 {
  try {
    switch (kind) {
      case "scene": {
        const sourceKind = sceneSourceKindV1(path);
        if (sourceKind === undefined) throw new TypeError("unsupported scene source suffix");
        const document = sourceKind === "authoring_scene"
          ? admitAuthoringSceneSourceBytesV1(bytes).document
          : parseSceneDocumentV1(
            JSON.parse(new TextDecoder().decode(bytes)) as unknown,
            `/${path}`,
          );
        return {
          kind,
          entry: {
            path,
            sceneId: document.sceneId,
            label: document.label,
            sourceKind,
          },
        };
      }
      case "motion": {
        const document = parseMotionDocumentV1(
          JSON.parse(new TextDecoder().decode(bytes)) as unknown,
          `/${path}`,
        );
        return {
          kind,
          entry: { path, motionId: document.motionId, label: document.label },
        };
      }
      case "regions": {
        const document = parseRegionsDocumentV1(
          JSON.parse(new TextDecoder().decode(bytes)) as unknown,
          `/${path}`,
        );
        return {
          kind,
          entry: { path, regionsId: document.regionsId, label: document.label },
        };
      }
      case "chrome-layout": {
        const document = parseChromeLayoutDocumentV1(
          JSON.parse(new TextDecoder().decode(bytes)) as unknown,
          `/${path}`,
        );
        return {
          kind,
          entry: { path, layoutId: document.layoutId, label: document.label },
        };
      }
    }
    throw new TypeError("unsupported authoring source kind");
  } catch (error) {
    return skippedRecordV1(path, kind, error);
  }
}

function snapshotFromRecordsV1(
  records: ReadonlyMap<string, AdmittedAuthoringRecordV1>,
): AuthoringProjectIndexV1 {
  const scenes: AuthoringSceneSourceV1[] = [];
  const motions: AuthoringMotionSourceV1[] = [];
  const regions: AuthoringRegionsSourceV1[] = [];
  const chromeLayouts: AuthoringChromeLayoutSourceV1[] = [];
  const skipped: AuthoringIndexSkipV1[] = [];
  const ordered = [...records.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );

  for (const [, record] of ordered) {
    switch (record.kind) {
      case "scene":
        scenes.push(record.entry);
        break;
      case "motion":
        motions.push(record.entry);
        break;
      case "regions":
        regions.push(record.entry);
        break;
      case "chrome-layout":
        chromeLayouts.push(record.entry);
        break;
      case "skipped":
        skipped.push(record.entry);
        break;
    }
  }
  skipped.sort((left, right) => {
    const kindOrder = authoringKindOrderV1[left.kind] - authoringKindOrderV1[right.kind];
    if (kindOrder !== 0) return kindOrder;
    return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
  });

  return { scenes, motions, regions, chromeLayouts, skipped };
}

function normalizedInvalidationPathV1(path: string): string | undefined {
  const normalized = path.split("\\").join("/");
  if (normalized.length === 0 || normalized.startsWith("/")) return undefined;
  const segments = normalized.split("/");
  if (
    segments.some((segment) =>
      segment.length === 0 || segment === "." || segment === ".." || segment === "node_modules" ||
      segment.startsWith(".")
    )
  ) return undefined;
  return authoringSourceKindV1(normalized) === undefined ? undefined : normalized;
}

function readAuthoringRecordV1(
  root: string,
  path: string,
  kind: AuthoringSourceKindV1,
  counters: MutableAuthoringProjectIndexCountersV1,
): AdmittedAuthoringRecordV1 | undefined {
  const segments = path.split("/");
  let filePath = root;
  for (let index = 0; index < segments.length; index += 1) {
    filePath = resolve(filePath, segments[index]!);
    let stat;
    try {
      stat = lstatSync(filePath);
    } catch {
      return undefined;
    }
    if (stat.isSymbolicLink()) return undefined;
    const isLast = index === segments.length - 1;
    if (isLast ? !stat.isFile() : !stat.isDirectory()) return undefined;
  }

  counters.fileReads += 1;
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(filePath);
  } catch (error) {
    return skippedRecordV1(path, kind, error);
  }
  counters.parses += 1;
  return admitAuthoringRecordV1(path, kind, bytes);
}

function walkAllAuthoringSourceFilesV1(root: string): readonly AuthoringSourceFileV1[] {
  const files: string[] = [];
  walkFilesV1(root, ".json", files);
  const entries = files
    .map((filePath) => ({
      path: relative(root, filePath).split(sep).join("/"),
      filePath,
    }))
    .filter((entry) => authoringSourceKindV1(entry.path) !== undefined);
  entries.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return entries;
}

/**
 * Creates the dev-server/project owner. Construction is IO-free; the first
 * snapshot performs one all-family walk and admits each matching source once.
 */
export function createAuthoringProjectIndexOwnerV1(
  sourceRoot: string,
): AuthoringProjectIndexOwnerV1 {
  const root = resolve(sourceRoot);
  const records = new Map<string, AdmittedAuthoringRecordV1>();
  const pendingInvalidations = new Set<string>();
  const work: MutableAuthoringProjectIndexCountersV1 = {
    treeWalks: 0,
    fileReads: 0,
    parses: 0,
    invalidations: 0,
  };
  let initialized = false;
  let cachedSnapshot: AuthoringProjectIndexV1 | undefined;

  const initializeV1 = (): AuthoringProjectIndexV1 => {
    work.treeWalks += 1;
    for (const file of walkAllAuthoringSourceFilesV1(root)) {
      const kind = authoringSourceKindV1(file.path);
      if (kind === undefined) continue;
      const record = readAuthoringRecordV1(root, file.path, kind, work);
      if (record !== undefined) records.set(file.path, record);
    }
    pendingInvalidations.clear();
    initialized = true;
    cachedSnapshot = snapshotFromRecordsV1(records);
    return cachedSnapshot;
  };

  return {
    snapshot(): AuthoringProjectIndexV1 {
      if (!initialized) return initializeV1();
      if (cachedSnapshot !== undefined) return cachedSnapshot;

      const pending = [...pendingInvalidations].sort((left, right) =>
        left < right ? -1 : left > right ? 1 : 0
      );
      pendingInvalidations.clear();
      for (const path of pending) {
        const kind = authoringSourceKindV1(path);
        if (kind === undefined) continue;
        const record = readAuthoringRecordV1(root, path, kind, work);
        if (record === undefined) records.delete(path);
        else records.set(path, record);
      }
      cachedSnapshot = snapshotFromRecordsV1(records);
      return cachedSnapshot;
    },

    invalidate(path: string): void {
      const normalized = normalizedInvalidationPathV1(path);
      if (normalized === undefined) return;
      work.invalidations += 1;
      if (!initialized) return;
      pendingInvalidations.add(normalized);
      cachedSnapshot = undefined;
    },

    counters(): AuthoringProjectIndexCountersV1 {
      return { ...work };
    },
  };
}

/**
 * Scans one source root into the unified scene + motion + regions +
 * chrome-layout enumeration.
 */
export function buildAuthoringProjectIndexV1(sourceRoot: string): AuthoringProjectIndexV1 {
  return createAuthoringProjectIndexOwnerV1(sourceRoot).snapshot();
}
