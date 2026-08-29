// SPDX-License-Identifier: MIT
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  collectImportSpecifiersV1,
  findForbiddenImportSpecifiersV1,
} from "../testing/import-guard.ts";

const repositoryRootV1 = fileURLToPath(new URL("../../..", import.meta.url));
const guardedSourceRootsV1 = [
  join(repositoryRootV1, "e2e", "src"),
  join(repositoryRootV1, "examples", "e2e"),
  join(repositoryRootV1, "examples", "vn-last-sound-check", "src"),
] as const;

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

  it("fails on deliberate deep imports and cross-Story reaches", () => {
    const violations = findForbiddenImportSpecifiersV1(
      [
        'import { internal } from "@sillymaker/base/src/runtime/session/game-session.ts";',
        'import { compiler } from "@sillymaker/vn/src/base/interaction-document.ts";',
        'import { glue } from "@silly-maker/story-poc";',
        'import { old } from "../../../engine/packages/base/src/index.ts";',
        'import { crossStory } from "../../../examples/silly-os/src/index.ts";',
        'import { allowed } from "@sillymaker/base";',
      ].join("\n"),
    );

    expect(violations).toEqual([
      "@sillymaker/base/src/runtime/session/game-session.ts",
      "@sillymaker/vn/src/base/interaction-document.ts",
      "@silly-maker/story-poc",
      "../../../engine/packages/base/src/index.ts",
      "../../../examples/silly-os/src/index.ts",
    ]);
  });

  it("keeps Engine Lab and product example sources inside the public boundary", async () => {
    const files = (
      await Promise.all(guardedSourceRootsV1.map((root) => listSourceFilesV1(root)))
    ).flat().toSorted();
    expect(files.length).toBeGreaterThan(0);

    const violations: Record<string, readonly string[]> = {};
    for (const file of files) {
      const found = findForbiddenImportSpecifiersV1(await readFile(file, "utf8"));
      if (found.length > 0) violations[file] = found;
    }
    expect(violations).toEqual({});
  });
});
