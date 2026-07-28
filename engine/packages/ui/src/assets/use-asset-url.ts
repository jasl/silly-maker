// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";

/**
 * Asset-consumption helpers every Story UI needs: resolve an asset ID to a
 * runtime image URL (or null for the code-native fallback). The hook form
 * subscribes to registry readiness so components re-render when bytes
 * arrive; the plain form serves renderer closures whose re-render is
 * already driven by the stage.
 */

/**
 * The variance-free registry surface these helpers need (typed Story
 * registries assign to it without contravariance friction — the same
 * pattern as AnyContentTableDefinitionV1).
 */
export interface AssetUrlRegistryV1 {
  resolve(assetId: never, usage: never): { readonly delivery: string; readonly url?: string };
  observe(): { readonly revision: number };
  subscribe(listener: () => void): () => void;
}

export function resolveAssetUrlV1(
  registry: AssetUrlRegistryV1 | null,
  assetId: unknown,
  usage: string,
): string | null {
  if (registry === null || typeof assetId !== "string") return null;
  const resolved = registry.resolve(assetId as never, usage as never);
  return resolved.delivery === "runtime_image" ? (resolved.url ?? null) : null;
}

export function useAssetUrlV1(
  registry: AssetUrlRegistryV1 | null,
  assetId: string | undefined,
  usage: string,
): string | null {
  const revision = useSyncExternalStore(
    (listener) => (registry === null ? () => {} : registry.subscribe(listener)),
    () => (registry === null ? 0 : registry.observe().revision),
    () => 0,
  );
  void revision;
  return resolveAssetUrlV1(registry, assetId, usage);
}
