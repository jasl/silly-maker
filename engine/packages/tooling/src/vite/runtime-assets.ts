// SPDX-License-Identifier: MIT
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { cp, lstat, readdir } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

export type RuntimeAssetPathResolutionV1 =
  | { readonly kind: "file"; readonly filePath: string }
  | { readonly kind: "bad_request" | "not_found" };

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function isRegularFileBelowNonSymlinkRootV1(root: string, candidate: string): boolean {
  const rootStat = lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return false;

  const candidateRelativePath = relative(root, candidate);
  let current = root;
  for (const segment of candidateRelativePath.split(sep)) {
    current = resolve(current, segment);
    const currentStat = lstatSync(current);
    if (currentStat.isSymbolicLink()) return false;
    if (current !== candidate && !currentStat.isDirectory()) return false;
  }

  return lstatSync(candidate).isFile();
}

/**
 * Resolves one URL-encoded path below an application's runtime asset root.
 * Symlinks and non-files are rejected: the dev server must never turn a local
 * project link into an arbitrary file-read capability.
 */
export function resolveRuntimeAssetPathV1(
  assetsDirectory: string,
  encodedRelativePath: string,
): RuntimeAssetPathResolutionV1 {
  let decoded: string;
  try {
    decoded = decodeURIComponent(encodedRelativePath);
  } catch {
    return Object.freeze({ kind: "bad_request" });
  }

  if (
    decoded.length === 0 ||
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    decoded.startsWith("/")
  ) {
    return Object.freeze({ kind: "bad_request" });
  }

  const root = resolve(assetsDirectory);
  const candidate = resolve(root, decoded);
  if (escapesRootV1(root, candidate) || !existsSync(root) || !existsSync(candidate)) {
    return Object.freeze({ kind: "not_found" });
  }

  try {
    if (!isRegularFileBelowNonSymlinkRootV1(root, candidate)) {
      return Object.freeze({ kind: "not_found" });
    }

    // This remains a defence-in-depth containment check in case platform path
    // semantics differ from the lexical and component checks above.
    const realRoot = realpathSync(root);
    const realCandidate = realpathSync(candidate);
    if (escapesRootV1(realRoot, realCandidate)) {
      return Object.freeze({ kind: "not_found" });
    }
  } catch {
    // The asset tree may change while the dev server is running. A vanished or
    // inaccessible path is an ordinary miss, not a server error.
    return Object.freeze({ kind: "not_found" });
  }

  return Object.freeze({ kind: "file", filePath: candidate });
}

const runtimeAssetContentTypesV1 = Object.freeze({
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
} satisfies Readonly<Record<string, string>>);

const runtimeAssetExtensionPatternV1 = /^\.[a-z0-9]+$/u;
const mediaTypePatternV1 = /^[\x20-\x7e]+$/u;

/**
 * Validates one application-supplied content-type table (`".ext"` → media
 * type). Keys are normalized to lowercase and win over the engine defaults,
 * so an application can serve formats the engine does not know about without
 * waiting for an engine release.
 */
export function parseRuntimeAssetContentTypesV1(
  value: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {};
  for (const [extension, mediaType] of Object.entries(value)) {
    const key = extension.toLowerCase();
    if (!runtimeAssetExtensionPatternV1.test(key)) {
      throw new TypeError(
        `invalid runtime asset extension "${extension}" (expected ".ext" with letters/digits)`,
      );
    }
    if (
      typeof mediaType !== "string" ||
      mediaType.trim() === "" ||
      !mediaTypePatternV1.test(mediaType)
    ) {
      throw new TypeError(`invalid content type for runtime asset extension "${extension}"`);
    }
    normalized[key] = mediaType;
  }
  return Object.freeze(normalized);
}

export function runtimeAssetContentTypeV1(
  filePath: string,
  additionalContentTypes?: Readonly<Record<string, string>>,
): string {
  const extension = extname(filePath).toLowerCase();
  return (
    additionalContentTypes?.[extension] ??
    runtimeAssetContentTypesV1[extension as keyof typeof runtimeAssetContentTypesV1] ??
    "application/octet-stream"
  );
}

async function assertNoRuntimeAssetSymlinksV1(directory: string): Promise<void> {
  const directoryStat = await lstat(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new TypeError(`runtime asset root must be a real directory: ${directory}`);
  }
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    const entryStat = await lstat(entryPath);
    if (entryStat.isSymbolicLink()) {
      throw new TypeError(`runtime asset tree contains a symbolic link: ${entryPath}`);
    }
    if (entryStat.isDirectory()) await assertNoRuntimeAssetSymlinksV1(entryPath);
  }
}

/** Copies a verified runtime asset tree into a production Artifact. */
export async function copyRuntimeAssetsV1(
  assetsDirectory: string,
  outputDirectory: string,
): Promise<void> {
  if (!existsSync(assetsDirectory)) return;
  await assertNoRuntimeAssetSymlinksV1(assetsDirectory);
  await cp(assetsDirectory, outputDirectory, { recursive: true, dereference: false });
}
