// SPDX-License-Identifier: MIT
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type StaticFilePathResolutionV1 =
  | { readonly kind: "file"; readonly filePath: string }
  | { readonly kind: "bad_request" | "not_found" };

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

async function rejectSymlinkedPathV1(root: string, candidate: string): Promise<boolean> {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return true;

  const path = relative(root, candidate);
  if (path === "") return false;
  let current = root;
  for (const segment of path.split(sep)) {
    current = resolve(current, segment);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) return true;
    if (current !== candidate && !stat.isDirectory()) return true;
  }
  return false;
}

/**
 * Resolves one URL pathname below a built Player directory. The local desktop
 * server has broad filesystem read permission, so malformed paths, traversal,
 * and every symlinked component fail closed rather than becoming a file-read
 * capability after an application-side XSS.
 */
export async function resolveStaticFilePathV1(
  rootDirectory: string,
  encodedPathname: string,
): Promise<StaticFilePathResolutionV1> {
  let pathname: string;
  try {
    pathname = decodeURIComponent(encodedPathname);
  } catch {
    return { kind: "bad_request" };
  }

  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\0") ||
    pathname.includes("\\")
  ) {
    return { kind: "bad_request" };
  }

  const root = resolve(rootDirectory);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let candidate = resolve(root, relativePath);
  if (escapesRootV1(root, candidate)) return { kind: "not_found" };

  try {
    if (await rejectSymlinkedPathV1(root, candidate)) {
      return { kind: "not_found" };
    }
    const candidateStat = await lstat(candidate);
    if (candidateStat.isDirectory()) {
      candidate = resolve(candidate, "index.html");
      if (await rejectSymlinkedPathV1(root, candidate)) {
        return { kind: "not_found" };
      }
    }
    const fileStat = await lstat(candidate);
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
      return { kind: "not_found" };
    }

    const realRoot = await realpath(root);
    const realFile = await realpath(candidate);
    if (escapesRootV1(realRoot, realFile)) return { kind: "not_found" };
    return { kind: "file", filePath: candidate };
  } catch {
    return { kind: "not_found" };
  }
}
