// SPDX-License-Identifier: MIT
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectAuthorityClosureV1,
  collectDeterminismAuthorityMapV1,
  determinismAuthorityPolicyV1,
} from "./authority-map.mts";
import type { DeterminismAuthorityPolicyV1 } from "./authority-map.mts";
import { checkDeterminismPathsV1, runDeterminismCheckV1 } from "./check.mts";

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const syntheticMigrationPathV1 = "scripts/determinism/fixtures/synthetic-migration-authority.ts";
// Live-repository closure scans share worker CPU with the whole parallel
// suite; CI and loaded local runs need the generous budget.
const liveRepositoryScanTimeoutV1 = 120_000;
const temporaryDirectoriesV1: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectoriesV1.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    ),
  );
});

async function createTemporaryRootV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-determinism-check-"));
  temporaryDirectoriesV1.push(root);
  return root;
}

describe("authoritative determinism runner", () => {
  it(
    "checks the live authority map and its default synthetic migration entry cleanly",
    async () => {
      expect(await runDeterminismCheckV1({ repositoryRoot: repositoryRootV1 })).toEqual([]);
    },
    liveRepositoryScanTimeoutV1,
  );

  it(
    "reads every exact authority path once and excludes classified negative controls",
    async () => {
      const map = await collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        additionalAuthorities: Object.freeze([
          Object.freeze({
            id: "synthetic-migration-extension",
            entry: syntheticMigrationPathV1,
          }),
        ]),
      });
      const reads: string[] = [];

      const diagnostics = await checkDeterminismPathsV1({
        repositoryRoot: repositoryRootV1,
        paths: map.authoritativePaths,
        readSource: async (file) => {
          reads.push(file);
          return await readFile(resolve(repositoryRootV1, file), "utf8");
        },
      });

      expect(diagnostics).toEqual([]);
      expect(reads).toEqual(map.authoritativePaths);
      for (const negativeControl of map.negativeControls) {
        expect(reads).not.toContain(negativeControl.entry);
      }
    },
    liveRepositoryScanTimeoutV1,
  );

  it("recollects an added violation and drops it after the import is removed", async () => {
    const root = await createTemporaryRootV1();
    await writeFile(join(root, "clean.ts"), "export const clean = 1;\n");
    await writeFile(join(root, "violation.ts"), "export const draw = Math.random();\n");
    await writeFile(join(root, "entry.ts"), 'export { draw } from "./violation.ts";\n');

    const beforeClosure = await collectAuthorityClosureV1(root, ["entry.ts"]);
    const before = await checkDeterminismPathsV1({
      repositoryRoot: root,
      paths: beforeClosure.paths,
    });
    expect(before).toEqual([
      expect.objectContaining({
        code: "determinism.ambient_random",
        file: "violation.ts",
      }),
    ]);

    await writeFile(join(root, "entry.ts"), 'export { clean } from "./clean.ts";\n');
    const afterClosure = await collectAuthorityClosureV1(root, ["entry.ts"]);
    const after = await checkDeterminismPathsV1({
      repositoryRoot: root,
      paths: afterClosure.paths,
    });

    expect(afterClosure.paths).toEqual(["clean.ts", "entry.ts"]);
    expect(after).toEqual([]);
  });

  it("fails at an unshadowed CommonJS loader instead of trusting an uncollected dependency", async () => {
    const root = await createTemporaryRootV1();
    await writeFile(join(root, "hidden.cjs"), "export const draw = Math.random();\n");
    await writeFile(join(root, "entry.ts"), 'require("./hidden.cjs");\n');

    const closure = await collectAuthorityClosureV1(root, ["entry.ts"]);
    expect(closure.paths).toEqual(["entry.ts"]);
    expect(
      await checkDeterminismPathsV1({
        repositoryRoot: root,
        paths: closure.paths,
      }),
    ).toEqual([
      expect.objectContaining({
        code: "determinism.capability.dynamic_require",
        file: "entry.ts",
      }),
    ]);
  });

  it(
    "detects a violation supplied at the synthetic migration authority path",
    async () => {
      const map = await collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        additionalAuthorities: Object.freeze([
          Object.freeze({
            id: "synthetic-migration-extension",
            entry: syntheticMigrationPathV1,
          }),
        ]),
      });

      const diagnostics = await checkDeterminismPathsV1({
        repositoryRoot: repositoryRootV1,
        paths: map.authoritativePaths,
        readSource: async (file) =>
          file === syntheticMigrationPathV1
            ? "export const migrate = () => Math.random();\n"
            : await readFile(resolve(repositoryRootV1, file), "utf8"),
      });

      expect(diagnostics).toContainEqual(expect.objectContaining({
        code: "determinism.ambient_random",
        file: syntheticMigrationPathV1,
      }));
    },
    liveRepositoryScanTimeoutV1,
  );

  it("detects a transitive violation from a custom bounded Base authority", async () => {
    const transitiveAuthority = Object.freeze({
      id: "custom-base-transitive",
      entry: "engine/packages/base/src/runtime/application/core-game-application.ts",
      classification: "authoritative_runtime" as const,
      projection: "bounded_closure" as const,
    });
    const policy: DeterminismAuthorityPolicyV1 = Object.freeze({
      ...determinismAuthorityPolicyV1,
      baseAuthorities: Object.freeze([
        ...determinismAuthorityPolicyV1.baseAuthorities,
        transitiveAuthority,
      ]),
      negativeControls: Object.freeze(
        determinismAuthorityPolicyV1.negativeControls.filter(
          ({ classification }) => classification !== "base_non_authoritative",
        ),
      ),
    });

    const diagnostics = await runDeterminismCheckV1({
      repositoryRoot: repositoryRootV1,
      policy,
    });

    expect(diagnostics).toContainEqual(expect.objectContaining({
      code: "determinism.locale",
      file: "engine/packages/base/src/contracts/presentation-ids.ts",
    }));
  }, liveRepositoryScanTimeoutV1);

  it("reads each path once and gives read failure precedence over unsupported-source checks", async () => {
    const readSource = vi.fn(async (file: string) => {
      if (file === "unreadable.ts" || file === "missing.json") {
        throw new Error("host-specific secret path");
      }
      if (file === "unsupported.wasm") return "\0asm";
      return "export const clean = 1;\n";
    });

    const diagnostics = await checkDeterminismPathsV1({
      repositoryRoot: repositoryRootV1,
      paths: ["unreadable.ts", "invalid.json", "unsupported.wasm", "missing.json"],
      readSource,
    });

    expect(readSource.mock.calls.map(([file]) => file)).toEqual([
      "invalid.json",
      "missing.json",
      "unreadable.ts",
      "unsupported.wasm",
    ]);
    expect(diagnostics).toEqual([
      {
        code: "determinism.source_unsupported",
        file: "invalid.json",
        range: [0, 0],
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
        message: "Authoritative JSON data source is not valid JSON.",
        hint: "Fix the JSON document, then rerun the determinism check.",
      },
      {
        code: "determinism.source_read_failed",
        file: "missing.json",
        range: [0, 0],
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
        message: "Unable to read authoritative source.",
        hint: "Ensure the file exists and is readable, then rerun the determinism check.",
      },
      {
        code: "determinism.source_read_failed",
        file: "unreadable.ts",
        range: [0, 0],
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
        message: "Unable to read authoritative source.",
        hint: "Ensure the file exists and is readable, then rerun the determinism check.",
      },
      {
        code: "determinism.source_unsupported",
        file: "unsupported.wasm",
        range: [0, 0],
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
        message: "Unsupported authoritative source extension.",
        hint: "Use a JavaScript or TypeScript source file in the authoritative closure.",
      },
    ]);
  });

  it("accepts valid JSON data sources in the authoritative closure without syntax proofs", async () => {
    const diagnostics = await checkDeterminismPathsV1({
      repositoryRoot: repositoryRootV1,
      paths: ["scene.scene.json", "code.ts"],
      readSource: (file) =>
        file === "scene.scene.json"
          ? '{ "format": "sillymaker.scene", "version": 1 }\n'
          : "export const clean = 1;\n",
    });
    expect(diagnostics).toEqual([]);
  });

  it("deduplicates paths, reads supported sources in UTF-16 order, and sorts all diagnostics", async () => {
    const reads: string[] = [];
    const diagnostics = await checkDeterminismPathsV1({
      repositoryRoot: repositoryRootV1,
      paths: ["z.ts", "a.ts", "middle.json", "a.ts"],
      readSource: (file) => {
        reads.push(file);
        return file === "a.ts" ? "fetch(url); Math.random();" : "Math.random();";
      },
    });

    expect(reads).toEqual(["a.ts", "middle.json", "z.ts"]);
    // "Math.random();" is not JSON, so the data source still fails fast.
    expect(diagnostics.map(({ file, code }) => `${file}:${code}`)).toEqual([
      "a.ts:determinism.network",
      "a.ts:determinism.ambient_random",
      "middle.json:determinism.source_unsupported",
      "z.ts:determinism.ambient_random",
    ]);
  });

  it("verifies numeric exemption files and explicit focused-vector anchors", async () => {
    const root = await createTemporaryRootV1();
    await writeFile(
      join(root, "evidence.test.ts"),
      "// sillymaker-determinism-vector: negative-zero-admission\n",
    );
    const directive = (anchor: string) =>
      `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"recognize rejected input","bounds":"zero only","rounding":"exact reject","test":"evidence.test.ts#${anchor}"}\nconst value = -0;\n`;
    await writeFile(join(root, "authority.ts"), directive("negative-zero-admission"));

    expect(
      await checkDeterminismPathsV1({
        repositoryRoot: root,
        paths: ["authority.ts"],
      }),
    ).toEqual([]);

    await writeFile(join(root, "authority.ts"), directive("invented"));
    expect((await checkDeterminismPathsV1({
      repositoryRoot: root,
      paths: ["authority.ts"],
    })).map(({ code }) => code)).toEqual(expect.arrayContaining([
      "determinism.exemption_malformed",
      "determinism.numeric_fractional_literal",
    ]));
  });

  it("rejects missing or ambiguous focused-vector evidence", async () => {
    const root = await createTemporaryRootV1();
    const directive = (test: string) =>
      `// sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"recognize rejected input","bounds":"zero only","rounding":"exact reject","test":"${test}"}\nconst value = -0;\n`;
    await writeFile(
      join(root, "duplicate.test.ts"),
      "// sillymaker-determinism-vector: duplicate\n" +
        "// sillymaker-determinism-vector: duplicate\n",
    );
    await writeFile(
      join(root, "template.test.ts"),
      "const fixture = `\n// sillymaker-determinism-vector: template\n`;\n",
    );

    for (
      const reference of [
        "missing.test.ts#missing",
        "duplicate.test.ts#duplicate",
        "template.test.ts#template",
      ]
    ) {
      await writeFile(join(root, "authority.ts"), directive(reference));
      expect((await checkDeterminismPathsV1({
        repositoryRoot: root,
        paths: ["authority.ts"],
      })).map(({ code }) => code)).toEqual(expect.arrayContaining([
        "determinism.exemption_malformed",
        "determinism.numeric_fractional_literal",
      ]));
    }
  });
});
