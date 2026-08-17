// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { analyzeTypeScriptLocalityV1, parseTypeScriptLocalityOptionsV1 } from "./ts-locality.mts";

const temporaryDirectoriesV1: string[] = [];
const execFileV1 = promisify(execFileCallback);

afterEach(async () => {
  await Promise.all(
    temporaryDirectoriesV1.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    ),
  );
});

async function runGitV1(cwd: string, args: readonly string[]): Promise<void> {
  await execFileV1("git", [...args], { cwd });
}

async function createFixtureRepositoryV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-ts-locality-"));
  temporaryDirectoriesV1.push(root);
  await Promise.all([
    mkdir(join(root, "src", "alpha"), { recursive: true }),
    mkdir(join(root, "src", "beta"), { recursive: true }),
    mkdir(join(root, "src", "gamma"), { recursive: true }),
    mkdir(join(root, "src", "delta"), { recursive: true }),
    mkdir(join(root, "references"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(root, "src", "alpha", "a.ts"),
      [
        'import type { Beta } from "../beta/b.ts";',
        'import { runtime } from "../gamma/c.ts";',
        "export const alpha: Beta | number = runtime;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "src", "beta", "b.ts"),
      [
        'import { type Alpha } from "../alpha/a.ts";',
        "export interface Beta { readonly value: number }",
        'export type Alpha = typeof import("../alpha/a.ts").alpha;',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "src", "gamma", "c.ts"),
      "export const runtime = 1;\n",
    ),
    writeFile(
      join(root, "src", "delta", "d.tsx"),
      [
        'export { alpha } from "../alpha/a.ts";',
        "export const view = <div />;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "references", "must-not-be-read.ts"),
      "this is deliberately invalid TypeScript !!!\n",
    ),
  ]);
  await runGitV1(root, ["init", "-q"]);
  await runGitV1(root, ["add", "src", "references"]);
  return root;
}

describe("TypeScript locality research", () => {
  it("separates type-only SCCs and reports forward and reverse closures", async () => {
    const repositoryRoot = await createFixtureRepositoryV1();
    const report = await analyzeTypeScriptLocalityV1({
      repositoryRoot,
      entries: ["src/alpha/a.ts"],
      targets: ["src/alpha/a.ts"],
    });

    expect(report.files).toMatchObject({
      trackedTypeScript: 4,
      physicalLines: 9,
      astExports: 6,
    });
    expect(report.files.entries.map(({ path }) => path)).not.toContain(
      "references/must-not-be-read.ts",
    );
    expect(report.stronglyConnectedComponents.allStatic.cyclicComponents).toContainEqual([
      "src/alpha/a.ts",
      "src/beta/b.ts",
    ]);
    expect(report.stronglyConnectedComponents.runtimeOnly.cyclicComponents).toEqual([]);
    expect(report.closures.entries).toEqual([{
      path: "src/alpha/a.ts",
      allStatic: ["src/alpha/a.ts", "src/beta/b.ts", "src/gamma/c.ts"],
      runtimeOnly: ["src/alpha/a.ts", "src/gamma/c.ts"],
    }]);
    expect(report.closures.targets).toEqual([{
      path: "src/alpha/a.ts",
      allStatic: ["src/alpha/a.ts", "src/beta/b.ts", "src/delta/d.tsx"],
      runtimeOnly: ["src/alpha/a.ts", "src/delta/d.tsx"],
    }]);
    expect(report.domains.allStaticCrossDomainEdges).toHaveLength(4);
    expect(report.domains.runtimeCrossDomainEdges).toHaveLength(2);
    await expect(analyzeTypeScriptLocalityV1({
      repositoryRoot: join(repositoryRoot, "src"),
    })).rejects.toThrow(/explicit Git worktree root/u);
  });

  it("requires an explicit repository and preserves repeated closure seeds", () => {
    expect(() => parseTypeScriptLocalityOptionsV1([])).toThrow(/--repo is required/u);
    expect(
      parseTypeScriptLocalityOptionsV1([
        "--repo",
        "/tmp/example",
        "--entry",
        "src/a.ts",
        "--entry",
        "src/b.ts",
        "--target",
        "src/c.ts",
      ]),
    ).toEqual({
      repositoryRoot: "/tmp/example",
      entries: ["src/a.ts", "src/b.ts"],
      targets: ["src/c.ts"],
    });
  });
});
