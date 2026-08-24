// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { moduleResolve } from "import-meta-resolve";

const posix = (root, path) => relative(root, path).split(sep).join("/");
const internalWorkspaceSpecifierPattern = /^@(?:silly-maker|sillymaker)\//u;
const esmImportConditions = new Set(["deno", "node", "import", "module-sync"]);
const invalidDynamicImportReasonCodes = new Set([
  "ImportCallArity",
  "ImportCallSpreadArgument",
]);
const buildIdentityFacetsV1 = new Set([
  "engine",
  "story_simulation",
  "story_presentation",
  "application",
]);

function parserPlugins(path) {
  const plugins = ["decorators", "decoratorAutoAccessors"];
  if (/\.(?:ts|tsx|mts|cts)$/u.test(path)) plugins.push("typescript");
  if (/\.(?:jsx|tsx)$/u.test(path)) plugins.push("jsx");
  return plugins;
}

function stringLiteralValue(node) {
  return node?.type === "StringLiteral" && typeof node.value === "string" ? node.value : null;
}

function parserOptions(relativePath, createImportExpressions) {
  return {
    sourceType: "unambiguous",
    plugins: parserPlugins(relativePath),
    allowAwaitOutsideFunction: true,
    createImportExpressions,
    errorRecovery: true,
  };
}

function hasInvalidDynamicImportReason(error) {
  return invalidDynamicImportReasonCodes.has(error?.reasonCode);
}

function parseEsmSource(source, relativePath) {
  try {
    const program = parse(source, parserOptions(relativePath, true));
    const invalidDynamicImport = program.errors.some(hasInvalidDynamicImportReason);
    const otherError = program.errors.find((error) => !hasInvalidDynamicImportReason(error));
    if (otherError !== undefined) throw otherError;
    return { program, invalidDynamicImport };
  } catch (error) {
    try {
      // Babel cannot build an ImportExpression for zero-argument or spread import() calls.
      // Its recovery parser still assigns those failures import-specific reason codes. The
      // recovered CallExpression tree is deliberately not used for dependency discovery.
      const recovery = parse(source, parserOptions(relativePath, false));
      if (
        recovery.errors.length > 0 &&
        recovery.errors.every(hasInvalidDynamicImportReason)
      ) {
        return { program: null, invalidDynamicImport: true };
      }
    } catch {
      // Preserve the primary parser failure below.
    }
    throw error;
  }
}

function hasRuntimeImportEdge(node) {
  if (node.importKind === "type") return false;
  return node.specifiers.length === 0 ||
    node.specifiers.some((specifier) => specifier.importKind !== "type");
}

function hasRuntimeExportEdge(node) {
  if (node.exportKind === "type") return false;
  if (node.type === "ExportAllDeclaration") return true;
  return node.specifiers.length === 0 ||
    node.specifiers.some((specifier) => specifier.exportKind !== "type");
}

function collectEsmSpecifiers(source, relativePath) {
  const parsed = parseEsmSource(source, relativePath);
  const specifiers = [];
  let hasInvalidDynamicImport = parsed.invalidDynamicImport;

  const visit = (node) => {
    if (node === null || typeof node !== "object") return;
    if (node.type === "ImportDeclaration" && hasRuntimeImportEdge(node)) {
      const specifier = stringLiteralValue(node.source);
      if (specifier !== null) specifiers.push(specifier);
    } else if (
      (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
      hasRuntimeExportEdge(node)
    ) {
      const specifier = stringLiteralValue(node.source);
      if (specifier !== null) specifiers.push(specifier);
    } else if (node.type === "ImportExpression") {
      const specifier = node.source?.extra?.parenthesized === true
        ? null
        : stringLiteralValue(node.source);
      if (specifier === null || node.options !== null) hasInvalidDynamicImport = true;
      else specifiers.push(specifier);
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === "loc" || key === "comments" || key === "tokens" || key === "leadingComments" ||
        key === "trailingComments" || key === "innerComments"
      ) continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else visit(value);
    }
  };

  visit(parsed.program);
  return {
    specifiers,
    hasInvalidDynamicImport,
  };
}

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
    } catch {
      // Try the next supported source extension.
    }
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

function resolveRelativeSpecifier(owner, specifier) {
  const raw = resolve(dirname(owner), specifier);
  const extension = extname(raw);
  const candidates = extension === ".js"
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
  } catch (error) {
    return { kind: "unknown", reason: resolutionReason(error) };
  }
  let actual;
  try {
    actual = await realpath(fileURLToPath(resolved));
  } catch (error) {
    return { kind: "unknown", reason: resolutionReason(error) };
  }
  const managedPath = isWithin(repository, actual) ? posix(repository, actual) : null;
  return managedPath !== null && !managedPath.split("/").includes("node_modules")
    ? { kind: "managed", path: actual }
    : { kind: "external" };
}

function resolutionReason(error) {
  const code = error !== null && typeof error === "object" && typeof error.code === "string"
    ? error.code
    : null;
  const message = error instanceof Error ? error.message : String(error);
  return code === null ? message : `${code}: ${message}`;
}

function addExternalImport(externalImports, relativePath, specifier) {
  const key = `${relativePath}\0${specifier}`;
  externalImports.set(
    key,
    {
      owner: relativePath,
      specifier,
    },
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
    if (!/\.(?:ts|tsx|mts|cts|mjs|cjs|js|jsx)$/u.test(relativePath)) continue;
    const source = await readFile(actual, "utf8");
    let imports;
    try {
      imports = collectEsmSpecifiers(source, relativePath);
    } catch {
      errors.push(`${relativePath}: import syntax cannot be analyzed`);
      continue;
    }
    if (imports.hasInvalidDynamicImport) {
      errors.push(`${relativePath}: determinism.import_closure.dynamic_specifier`);
    }
    for (const specifier of imports.specifiers) {
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
          errors.push(
            `${relativePath}: unknown workspace import ${specifier} (${resolution.reason})`,
          );
        }
        continue;
      }
      addExternalImport(externalImports, relativePath, specifier);
    }
  }
  return {
    paths: [...paths].sort(compareUtf16CodeUnits),
    errors: errors.sort(compareUtf16CodeUnits),
    externalImports: [...externalImports.values()].sort((left, right) =>
      compareUtf16CodeUnits(
        `${left.owner}\0${left.specifier}`,
        `${right.owner}\0${right.specifier}`,
      )
    ),
  };
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
      return {
        path,
        facet,
        sha256: `sha256:${
          createHash("sha256")
            .update(await readFile(actual))
            .digest("hex")
        }`,
      };
    }),
  );
  return records;
}
