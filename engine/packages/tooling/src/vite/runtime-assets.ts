// SPDX-License-Identifier: MIT
import { existsSync, statSync } from "node:fs";
import { cp } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";

export type RuntimeAssetPathResolutionV1 =
  | { readonly kind: "file"; readonly filePath: string }
  | { readonly kind: "bad_request" | "not_found" };

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

/**
 * Resolves one URL-encoded path below an application's runtime asset root.
 * The URL path must remain lexically contained; the application-owned asset
 * tree otherwise follows the host filesystem's ordinary file semantics.
 */
export function resolveRuntimeAssetPathV1(
  assetsDirectory: string,
  encodedRelativePath: string,
): RuntimeAssetPathResolutionV1 {
  let decoded: string;
  try {
    decoded = decodeURIComponent(encodedRelativePath);
  } catch {
    return { kind: "bad_request" };
  }

  if (
    decoded.length === 0 ||
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    decoded.startsWith("/")
  ) {
    return { kind: "bad_request" };
  }

  const root = resolve(assetsDirectory);
  const candidate = resolve(root, decoded);
  if (escapesRootV1(root, candidate)) {
    return { kind: "not_found" };
  }

  try {
    if (!statSync(candidate).isFile()) {
      return { kind: "not_found" };
    }
  } catch {
    // The asset tree may change while the dev server is running. A vanished or
    // inaccessible path is an ordinary miss, not a server error.
    return { kind: "not_found" };
  }

  return { kind: "file", filePath: candidate };
}

const runtimeAssetContentTypesV1 = {
  ".aac": "audio/aac",
  ".avif": "image/avif",
  ".flac": "audio/flac",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webp": "image/webp",
} satisfies Readonly<Record<string, string>>;

export function runtimeAssetContentTypeV1(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  return (
    runtimeAssetContentTypesV1[extension as keyof typeof runtimeAssetContentTypesV1] ??
      "application/octet-stream"
  );
}

/**
 * Finder / Explorer metadata that must never ship in a Player Artifact.
 * Matched by basename so a nested `assets/vendor/.DS_Store` is dropped.
 */
const ignoredRuntimeAssetNamesV1: ReadonlySet<string> = new Set([
  ".DS_Store",
  ".AppleDouble",
  ".LSOverride",
  "Thumbs.db",
  "ehthumbs.db",
  "Desktop.ini",
]);

function isIgnoredRuntimeAssetNameV1(name: string): boolean {
  return ignoredRuntimeAssetNamesV1.has(name) || name.startsWith("._");
}

/** Copies the application-owned runtime asset tree into a production Artifact. */
export async function copyRuntimeAssetsV1(
  assetsDirectory: string,
  outputDirectory: string,
): Promise<void> {
  if (!existsSync(assetsDirectory)) return;
  await cp(assetsDirectory, outputDirectory, {
    recursive: true,
    dereference: true,
    filter: (source) => !isIgnoredRuntimeAssetNameV1(basename(source)),
  });
}
