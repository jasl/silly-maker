// SPDX-License-Identifier: MIT
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  collectImportSpecifiersV1,
  findForbiddenImportSpecifiersV1,
} from "../testing/import-guard.ts";

const packageSourceRootV1 = fileURLToPath(new URL("../", import.meta.url));

async function listSourceFilesV1(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  return entries
    .filter(
      (entry) => entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")),
    )
    .map((entry) => join(entry.parentPath, entry.name))
    .toSorted();
}

describe("public import boundary", () => {
  it("collects static, bare, and dynamic import specifiers", () => {
    const source = [
      'import { a } from "@sillymaker/base";',
      'import type { B } from "@sillymaker/base/runtime";',
      'export { c } from "./local.ts";',
      'import "./side-effect.ts";',
      'const lazy = await import("./lazy.ts");',
    ].join("\n");

    expect(collectImportSpecifiersV1(source)).toEqual([
      "@sillymaker/base",
      "@sillymaker/base/runtime",
      "./local.ts",
      "./side-effect.ts",
      "./lazy.ts",
    ]);
  });

  it("fails on deliberate deep imports, cross-Story reaches, and archive reaches", () => {
    const violations = findForbiddenImportSpecifiersV1(
      [
        'import { internal } from "@sillymaker/base/src/runtime/session/game-session.ts";',
        'import { glue } from "@project-tavern/story-poc";',
        'import { old } from "../../../engine/packages/base/src/index.ts";',
        'import { crossStory } from "../../../examples/bookshop/src/index.ts";',
        'import { archived } from "../../../docs/archive/2026-07-first-poc-goal/file.ts";',
        'import { allowed } from "@sillymaker/base";',
      ].join("\n"),
    );

    expect(violations).toEqual([
      "@sillymaker/base/src/runtime/session/game-session.ts",
      "@project-tavern/story-poc",
      "../../../engine/packages/base/src/index.ts",
      "../../../examples/bookshop/src/index.ts",
      "../../../docs/archive/2026-07-first-poc-goal/file.ts",
    ]);
  });

  it("keeps every source file of this package inside the public boundary", async () => {
    const files = await listSourceFilesV1(packageSourceRootV1);
    expect(files.length).toBeGreaterThan(0);

    const violations: Record<string, readonly string[]> = {};
    for (const file of files) {
      const found = findForbiddenImportSpecifiersV1(await readFile(file, "utf8"));
      if (found.length > 0) violations[file] = found;
    }
    expect(violations).toEqual({});
  });
});
