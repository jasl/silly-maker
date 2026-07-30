// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { moduleResolve } from "import-meta-resolve";

const posix = (root, path) => relative(root, path).split(sep).join("/");
const internalWorkspaceSpecifierPattern = /^@(?:silly-maker|sillymaker)\//u;
const esmImportConditions = new Set(["deno", "node", "import", "module-sync"]);
const buildIdentityFacetsV1 = new Set([
  "engine",
  "story_simulation",
  "story_presentation",
  "application",
]);

function compareUtf16CodeUnits(left, right) {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function validateManagedPath(path) {
  const parts = path.split("/");
  if (
    path.length === 0 ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    parts.some((part) => part === "" || part === "." || part === "..") ||
    parts.includes("references")
  ) {
    throw new TypeError(`invalid import closure path: ${path}`);
  }
}

async function existing(candidates) {
  for (const path of candidates) {
    try {
      if ((await lstat(path)).isFile()) return path;
    } catch {}
  }
  return null;
}

function isWithin(root, path) {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`))
  );
}

async function resolveRelativeSpecifier(owner, specifier) {
  const raw = resolve(dirname(owner), specifier);
  const extension = extname(raw);
  const candidates =
    extension === ".js"
      ? [raw, `${raw.slice(0, -3)}.ts`, `${raw.slice(0, -3)}.tsx`]
      : extension === ""
        ? [raw, `${raw}.ts`, `${raw}.tsx`, join(raw, "index.ts"), join(raw, "index.tsx")]
        : [raw];
  return existing(candidates);
}

async function resolveWorkspaceSpecifier(repository, owner, specifier) {
  let resolved;
  try {
    resolved = moduleResolve(specifier, pathToFileURL(owner), esmImportConditions, false);
  } catch {
    return Object.freeze({ kind: "unknown" });
  }
  let actual;
  try {
    actual = await realpath(fileURLToPath(resolved));
  } catch {
    return Object.freeze({ kind: "unknown" });
  }
  const managedPath = isWithin(repository, actual) ? posix(repository, actual) : null;
  return managedPath !== null && !managedPath.split("/").includes("node_modules")
    ? Object.freeze({ kind: "managed", path: actual })
    : Object.freeze({ kind: "external" });
}

function addExternalImport(externalImports, relativePath, specifier) {
  const key = `${relativePath}\0${specifier}`;
  externalImports.set(
    key,
    Object.freeze({
      owner: relativePath,
      specifier,
    }),
  );
}

export async function collectImportClosure(root, entries) {
  const repository = await realpath(root);
  const queue = entries.map((entry) => resolve(repository, entry));
  const paths = new Set();
  const errors = [];
  const externalImports = new Map();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) continue;
    let actual;
    try {
      actual = await realpath(path);
    } catch {
      errors.push(`missing import: ${posix(repository, path)}`);
      continue;
    }
    if (!isWithin(repository, actual)) {
      errors.push(`workspace-external import: ${path}`);
      continue;
    }
    const relativePath = posix(repository, actual);
    if (relativePath === "references" || relativePath.startsWith("references/")) {
      errors.push(`references import is forbidden: ${relativePath}`);
      continue;
    }
    if (paths.has(relativePath)) continue;
    paths.add(relativePath);
    if (!/\.(?:ts|tsx|mts|mjs|js|jsx)$/u.test(relativePath)) continue;
    const source = await readFile(actual, "utf8");
    if (/\bimport\s*\(\s*(?!["'])/u.test(source)) {
      errors.push(`${relativePath}: dynamic import path is not static`);
    }
    const specifiers = [];
    const staticPattern =
      /(?:\bimport|\bexport)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
    const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
    for (const match of source.matchAll(staticPattern)) if (match[1]) specifiers.push(match[1]);
    for (const match of source.matchAll(dynamicPattern)) if (match[1]) specifiers.push(match[1]);
    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) {
        const dependency = await resolveRelativeSpecifier(actual, specifier);
        if (dependency === null) {
          errors.push(`${relativePath}: missing import: ${specifier}`);
        } else {
          queue.push(dependency);
        }
        continue;
      }
      if (internalWorkspaceSpecifierPattern.test(specifier)) {
        const resolution = await resolveWorkspaceSpecifier(repository, actual, specifier);
        if (resolution.kind === "managed") {
          queue.push(resolution.path);
        } else if (resolution.kind === "external") {
          addExternalImport(externalImports, relativePath, specifier);
        } else {
          errors.push(`${relativePath}: unknown workspace import ${specifier}`);
        }
        continue;
      }
      addExternalImport(externalImports, relativePath, specifier);
    }
  }
  return Object.freeze({
    paths: Object.freeze([...paths].sort(compareUtf16CodeUnits)),
    errors: Object.freeze(errors.sort(compareUtf16CodeUnits)),
    externalImports: Object.freeze(
      [...externalImports.values()].sort((left, right) =>
        compareUtf16CodeUnits(
          `${left.owner}\0${left.specifier}`,
          `${right.owner}\0${right.specifier}`,
        ),
      ),
    ),
  });
}

export async function collectManagedPaths(root, entries) {
  const result = await collectImportClosure(root, entries);
  if (result.errors.length > 0) throw new TypeError(result.errors.join("\n"));
  return result.paths;
}

/**
 * Hashes an already resolved set of workspace-relative files without discovering any additional
 * imports. This keeps facet filtering in the caller while retaining one live-byte record format.
 */
export async function buildImportClosureRecordsV1(root, paths, facet) {
  if (!buildIdentityFacetsV1.has(facet)) {
    throw new TypeError(`invalid import closure facet: ${facet}`);
  }
  for (const path of paths) validateManagedPath(path);
  if (new Set(paths).size !== paths.length) {
    throw new TypeError("duplicate import closure path");
  }

  const repository = await realpath(root);
  const sortedPaths = [...paths].sort(compareUtf16CodeUnits);
  const records = await Promise.all(
    sortedPaths.map(async (path) => {
      const actual = await realpath(join(repository, path));
      if (!actual.startsWith(`${repository}${sep}`)) {
        throw new TypeError(`workspace-external import closure path: ${path}`);
      }
      const actualPath = posix(repository, actual);
      if (actualPath !== path) {
        throw new TypeError(`non-canonical import closure path: ${path}`);
      }
      return Object.freeze({
        path,
        facet,
        sha256: `sha256:${createHash("sha256")
          .update(await readFile(actual))
          .digest("hex")}`,
      });
    }),
  );
  return Object.freeze(records);
}

export async function buildImportClosureV1(root, entries, facet) {
  const paths = await collectManagedPaths(root, entries);
  return buildImportClosureRecordsV1(root, paths, facet);
}

async function readWorkspaceMembers(directory) {
  for (const configName of ["deno.json", "package.json"]) {
    let config;
    try {
      config = JSON.parse(await readFile(join(directory, configName), "utf8"));
    } catch {
      continue;
    }
    const workspace = config.workspace ?? config.workspaces;
    if (Array.isArray(workspace)) return workspace;
    if (Array.isArray(workspace?.members)) return workspace.members;
    if (Array.isArray(workspace?.packages)) return workspace.packages;
  }
  return null;
}

function workspaceMemberContains(workspaceRoot, member, target) {
  if (typeof member !== "string" || member.length === 0) return false;
  const wildcardIndex = member.search(/[*?[{\]]/u);
  const stablePrefix = wildcardIndex === -1 ? member : member.slice(0, wildcardIndex);
  return isWithin(resolve(workspaceRoot, stablePrefix), target);
}

async function findContainingWorkspaceRoot(start) {
  const invocationRoot = await realpath(start);
  let candidate = invocationRoot;
  while (true) {
    const members = await readWorkspaceMembers(candidate);
    if (
      members !== null &&
      (candidate === invocationRoot ||
        members.some((member) => workspaceMemberContains(candidate, member, invocationRoot)))
    ) {
      return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) return invocationRoot;
    candidate = parent;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const invocationRoot = process.cwd();
  void findContainingWorkspaceRoot(invocationRoot)
    .then(async (root) => {
      const entries = process.argv
        .slice(2)
        .map((entry) => relative(root, resolve(invocationRoot, entry)));
      return collectImportClosure(root, entries);
    })
    .then(
      (result) => {
        if (result.errors.length > 0) {
          console.error(result.errors.join("\n"));
          process.exitCode = 1;
        } else console.log(JSON.stringify(result.paths, null, 2));
      },
      (error) => {
        console.error(error);
        process.exitCode = 1;
      },
    );
}
