// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { collectDeterminismAuthorityMapV1 } from "./authority-map.mts";
import type { AdditionalAuthorityEntryV1, DeterminismAuthorityPolicyV1 } from "./authority-map.mts";
import { analyzeDeterminismSourceV1, hasUniqueDeterminismVectorMarkerV1 } from "./rule-core.mts";
import type { DeterminismDiagnosticV1 } from "./rule-core.mts";

export type DeterminismSourceReaderV1 = (file: string) => string | Promise<string>;

const supportedSourceExtensionsV1 = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

/**
 * Inert data sources an authoritative module may import (scene/motion
 * documents enter the closure through JSON import attributes). JSON cannot
 * express calls, so there is no syntax to prove — the file only has to be
 * JSON at all; strict admission at the consuming contract does the rest.
 */
const dataSourceExtensionsV1 = new Set([".json"]);

const defaultAdditionalAuthoritiesV1 = Object.freeze(
  [
    Object.freeze({
      id: "synthetic-migration-extension",
      entry: "scripts/determinism/fixtures/synthetic-migration-authority.ts",
    }),
  ] satisfies readonly AdditionalAuthorityEntryV1[],
);

function compareCodeUnitsV1(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function compareDiagnosticsV1(
  left: DeterminismDiagnosticV1,
  right: DeterminismDiagnosticV1,
): number {
  return compareCodeUnitsV1(left.file, right.file) ||
    left.range[0] - right.range[0] ||
    left.range[1] - right.range[1] ||
    compareCodeUnitsV1(left.code, right.code) ||
    compareCodeUnitsV1(left.message, right.message) ||
    compareCodeUnitsV1(left.hint, right.hint);
}

function createSourceDiagnosticV1(options: {
  readonly code: string;
  readonly file: string;
  readonly message: string;
  readonly hint: string;
}): DeterminismDiagnosticV1 {
  return Object.freeze({
    ...options,
    range: Object.freeze([0, 0] as const),
    start: Object.freeze({ line: 1, column: 1 }),
    end: Object.freeze({ line: 1, column: 1 }),
  });
}

function createFocusedTestReferenceValidatorV1(
  repositoryRoot: string,
): (reference: string) => boolean {
  const evidenceByPath = new Map<string, string | null>();
  return (reference) => {
    const separator = reference.indexOf("#");
    if (separator <= 0 || separator === reference.length - 1) return false;
    const file = reference.slice(0, separator);
    const anchor = reference.slice(separator + 1);
    const absoluteFile = resolve(repositoryRoot, file);
    const relativeFile = relative(repositoryRoot, absoluteFile);
    if (
      relativeFile === "" || relativeFile === ".." ||
      relativeFile.startsWith(`..${sep}`) || isAbsolute(relativeFile)
    ) return false;

    let source = evidenceByPath.get(absoluteFile);
    if (source === undefined) {
      try {
        source = readFileSync(absoluteFile, "utf8");
      } catch {
        source = null;
      }
      evidenceByPath.set(absoluteFile, source);
    }
    const marker = `// sillymaker-determinism-vector: ${anchor}`;
    return source === null ? false : hasUniqueDeterminismVectorMarkerV1({ file, source, marker });
  };
}

export async function checkDeterminismPathsV1(options: {
  readonly repositoryRoot: string;
  readonly paths: readonly string[];
  readonly readSource?: DeterminismSourceReaderV1;
}): Promise<readonly DeterminismDiagnosticV1[]> {
  const repositoryRoot = resolve(options.repositoryRoot);
  const readSource = options.readSource ??
    ((file: string) => readFile(resolve(repositoryRoot, file), "utf8"));
  const paths = [...new Set(options.paths)].sort(compareCodeUnitsV1);
  const diagnostics: DeterminismDiagnosticV1[] = [];
  const isFocusedTestReference = createFocusedTestReferenceValidatorV1(repositoryRoot);

  for (const file of paths) {
    let source: string;
    try {
      source = await readSource(file);
      if (typeof source !== "string") throw new TypeError("source reader returned non-text");
    } catch {
      diagnostics.push(createSourceDiagnosticV1({
        code: "determinism.source_read_failed",
        file,
        message: "Unable to read authoritative source.",
        hint: "Ensure the file exists and is readable, then rerun the determinism check.",
      }));
      continue;
    }

    if (dataSourceExtensionsV1.has(extname(file))) {
      try {
        JSON.parse(source);
      } catch {
        diagnostics.push(createSourceDiagnosticV1({
          code: "determinism.source_unsupported",
          file,
          message: "Authoritative JSON data source is not valid JSON.",
          hint: "Fix the JSON document, then rerun the determinism check.",
        }));
      }
      continue;
    }

    if (!supportedSourceExtensionsV1.has(extname(file))) {
      diagnostics.push(createSourceDiagnosticV1({
        code: "determinism.source_unsupported",
        file,
        message: "Unsupported authoritative source extension.",
        hint: "Use a JavaScript or TypeScript source file in the authoritative closure.",
      }));
      continue;
    }

    diagnostics.push(...analyzeDeterminismSourceV1({
      file,
      source,
      isFocusedTestReference,
    }));
  }

  diagnostics.sort(compareDiagnosticsV1);
  return Object.freeze(diagnostics);
}

export async function runDeterminismCheckV1(options: {
  readonly repositoryRoot: string;
  readonly policy?: DeterminismAuthorityPolicyV1;
  readonly additionalAuthorities?: readonly AdditionalAuthorityEntryV1[];
}): Promise<readonly DeterminismDiagnosticV1[]> {
  const additionalAuthorities = Object.freeze([
    ...defaultAdditionalAuthoritiesV1,
    ...(options.additionalAuthorities ?? []),
  ]);
  const map = await collectDeterminismAuthorityMapV1({
    repositoryRoot: options.repositoryRoot,
    ...(options.policy === undefined ? {} : { policy: options.policy }),
    additionalAuthorities,
  });
  return await checkDeterminismPathsV1({
    repositoryRoot: options.repositoryRoot,
    paths: map.authoritativePaths,
  });
}

function formatDiagnosticV1(diagnostic: DeterminismDiagnosticV1): string {
  return `${diagnostic.file}:${diagnostic.start.line}:${diagnostic.start.column} ${diagnostic.code} ${diagnostic.message} ${diagnostic.hint}`;
}

async function mainV1(): Promise<void> {
  const repositoryRoot = resolve(import.meta.dirname, "../..");
  const diagnostics = await runDeterminismCheckV1({ repositoryRoot });
  if (diagnostics.length === 0) return;
  console.error(diagnostics.map(formatDiagnosticV1).join("\n"));
  process.exitCode = 1;
}

const isMainV1 = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    await mainV1();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown determinism checker failure.";
    console.error(`determinism.check_failed ${message}`);
    process.exitCode = 1;
  }
}
