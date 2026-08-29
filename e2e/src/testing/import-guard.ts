// SPDX-License-Identifier: MIT

/**
 * The Engine Conformance Story must consume the engine only through declared
 * package exports. These patterns reject deep imports into engine package
 * sources, cross-Story reaches (one Story importing another Story's src),
 * Tavern-scoped packages, and reaches into the historical archive. The
 * guard inspects import/export specifiers textually; it is a boundary test
 * helper, not a runtime security mechanism.
 */
const forbiddenSpecifierPatternsV1: readonly RegExp[] = Object.freeze([
  /^@silly-maker\//u,
  /^@sillymaker\/(?:base|ui|vn|web)\/src(?:\/|$)/u,
  /(?:^|\/)engine\/packages\/[^/]+\/src(?:\/|$)/u,
  /(?:^|\/)(?:e2e|examples|template)\/(?:[^/]+\/)*src(?:\/|$)/u,
]);

const importSpecifierPatternV1 =
  /(?:^|\n)\s*(?:import|export)[^"'`\n]*?from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/gu;

export function collectImportSpecifiersV1(source: string): readonly string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(importSpecifierPatternV1)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return Object.freeze(specifiers);
}

export function findForbiddenImportSpecifiersV1(source: string): readonly string[] {
  return Object.freeze(
    collectImportSpecifiersV1(source).filter((specifier) =>
      forbiddenSpecifierPatternsV1.some((pattern) => pattern.test(specifier))
    ),
  );
}
