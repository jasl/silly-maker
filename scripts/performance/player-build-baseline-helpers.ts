// SPDX-License-Identifier: MIT
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { BuildDependencyReceiptInternalV1 } from "../../engine/packages/tooling/src/vite/build-dependency-receipt.ts";

export type PlayerBuildAssetKindV1 = "javascript" | "css" | "runtime_asset";
export type PlayerBuildAssetRoleV1 = "entry" | "preload" | "lazy" | "runtime_asset";

export interface PlayerBuildAssetReferencesV1 {
  readonly entry: ReadonlySet<string>;
  readonly preload: ReadonlySet<string>;
}

/** Machine-independent path persisted in the build baseline report. */
export function repositoryRelativePlayerBuildPathV1(
  repositoryRoot: string,
  requestedPath: string,
): string {
  const root = resolve(repositoryRoot);
  const path = resolve(root, requestedPath);
  const repositoryPath = relative(root, path);
  if (
    repositoryPath.length === 0 || repositoryPath === ".." || isAbsolute(repositoryPath) ||
    repositoryPath.startsWith(`..${sep}`)
  ) {
    throw new TypeError("player build baseline outDir must be inside the repository");
  }
  return repositoryPath.split(sep).join("/");
}

/** Final HTML is the authority for what the browser receives eagerly. */
export function referencedPlayerBuildAssetsV1(html: string): PlayerBuildAssetReferencesV1 {
  const entry = new Set<string>();
  const preload = new Set<string>();
  const normalize = (value: string): string => value.replace(/^\.\//u, "").replace(/^\//u, "");
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)) {
    if (match[1] !== undefined) entry.add(normalize(match[1]));
  }
  for (const match of html.matchAll(/<link\b([^>]*)>/giu)) {
    const attributes = match[1] ?? "";
    const href = /\bhref=["']([^"']+)["']/iu.exec(attributes)?.[1];
    const rel = /\brel=["']([^"']+)["']/iu.exec(attributes)?.[1] ?? "";
    if (href === undefined) continue;
    const path = normalize(href);
    if (rel.split(/\s+/u).includes("modulepreload")) preload.add(path);
    else if (rel.split(/\s+/u).includes("stylesheet")) entry.add(path);
  }
  return Object.freeze({ entry, preload });
}

export function playerBuildAssetKindV1(path: string): PlayerBuildAssetKindV1 {
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "javascript";
  if (path.endsWith(".css")) return "css";
  return "runtime_asset";
}

export function playerBuildAssetRoleV1(
  path: string,
  kind: PlayerBuildAssetKindV1,
  references: PlayerBuildAssetReferencesV1,
): PlayerBuildAssetRoleV1 {
  if (kind === "runtime_asset") return "runtime_asset";
  if (references.entry.has(path)) return "entry";
  if (references.preload.has(path)) return "preload";
  return "lazy";
}

/**
 * Maps generated JS/CSS/assets back to every dynamic-entry facade whose static
 * chunk closure uses them, including final assets that replace CSS-only dynamic
 * chunks. Shared and application-mixed outputs retain all contribution IDs;
 * byte totals remain physical and are never duplicated.
 */
export function contributionIdsByPlayerBuildAssetV1(
  receipt: BuildDependencyReceiptInternalV1,
): ReadonlyMap<string, readonly string[]> {
  const idsByAsset = new Map<string, Set<string>>();
  for (const chunk of receipt.chunks) {
    for (const path of [chunk.fileName, ...chunk.importedCss, ...chunk.importedAssets]) {
      const ids = idsByAsset.get(path) ?? new Set<string>();
      for (const contributionId of chunk.contributionIds) ids.add(contributionId);
      idsByAsset.set(path, ids);
    }
  }
  for (const asset of receipt.assets) {
    const ids = idsByAsset.get(asset.fileName) ?? new Set<string>();
    for (const contributionId of asset.contributionIds) ids.add(contributionId);
    idsByAsset.set(asset.fileName, ids);
  }
  return new Map(
    [...idsByAsset].map(([path, ids]) => [path, Object.freeze([...ids].sort())] as const),
  );
}
