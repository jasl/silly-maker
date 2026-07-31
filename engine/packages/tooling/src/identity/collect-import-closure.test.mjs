// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import {
  buildImportClosureRecordsV1,
  collectImportClosure,
  collectManagedPaths,
} from "./collect-import-closure.mjs";

// This module lives at engine/packages/tooling/src/identity/, five levels
// below the repository root the closure walker resolves against.
const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const cli = fileURLToPath(new URL("./collect-import-closure.mjs", import.meta.url));
const execFileAsync = promisify(execFile);
const reactSpecifierPattern = /^(?:react(?:\/|$)|react-dom(?:\/|$))/u;

async function collectFromCli(cwd, entries) {
  const { stdout } = await execFileAsync(process.execPath, ["run", "-A", cli, ...entries], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function assertNodeSafeStoryClosure(entry) {
  const closure = await collectImportClosure(root, [entry]);
  assert.deepEqual(closure.errors, [], entry);
  assert(!closure.paths.some((path) => path.endsWith(".tsx")), entry);
  assert(!closure.paths.some((path) => path.includes("/tooling-ui/")), entry);
  assert(!closure.paths.some((path) => path.startsWith("engine/packages/ui/")), entry);
  assert(
    !closure.externalImports.some(({ specifier }) => reactSpecifierPattern.test(specifier)),
    entry,
  );
  for (const path of closure.paths) {
    if (!/\.(?:ts|mts|mjs|js)$/u.test(path)) continue;
    const source = await readFile(join(root, path), "utf8");
    assert(!/\b(?:document|window|HTMLElement|HTML[A-Za-z]*Element)\b/u.test(source), path);
  }
}

test("direct CLI resolves the same workspace closure from the repository and application roots", async () => {
  const fromRepository = await collectFromCli(root, ["template/src/story.ts"]);
  const fromApplication = await collectFromCli(join(root, "template"), ["src/story.ts"]);

  assert.deepEqual(fromApplication, fromRepository);
  assert(fromApplication.includes("template/src/story.ts"));
  assert(fromApplication.includes("engine/packages/base/src/index.ts"));
});

test("keeps resolved external package exports outside the managed application closure", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "sillymaker-import-closure-"));
  const applicationRoot = join(fixtureRoot, "application");
  const packageRoot = join(applicationRoot, "node_modules", "@sillymaker", "fixture-engine");
  await mkdir(join(applicationRoot, "src"), { recursive: true });
  await mkdir(join(packageRoot, "src"), { recursive: true });
  await writeFile(
    join(applicationRoot, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        "@sillymaker/fixture-engine": "1.0.0",
      },
    }),
  );
  await writeFile(
    join(packageRoot, "package.json"),
    JSON.stringify({
      name: "@sillymaker/fixture-engine",
      version: "1.0.0",
      type: "module",
      exports: {
        "./public": {
          import: "./src/public.mjs",
        },
        "./fallback": {
          default: "./src/fallback.mjs",
        },
        "./feature/*": {
          import: "./src/features/*.mjs",
        },
        "./runtime": {
          deno: "./src/deno.mjs",
          import: "./src/node.mjs",
        },
      },
    }),
  );
  await writeFile(join(packageRoot, "src/public.mjs"), "export const publicValue = 1;\n");
  await writeFile(join(packageRoot, "src/fallback.mjs"), "export const fallbackValue = 2;\n");
  await writeFile(join(packageRoot, "src/deno.mjs"), 'export const runtime = "deno";\n');
  await writeFile(join(packageRoot, "src/node.mjs"), 'export const runtime = "node";\n');
  await mkdir(join(packageRoot, "src/features"), { recursive: true });
  await writeFile(
    join(packageRoot, "src/features/example.mjs"),
    "export const featureValue = 3;\n",
  );
  try {
    const runtimeEntry = join(applicationRoot, "src/runtime.mjs");
    await writeFile(
      runtimeEntry,
      [
        'import { publicValue } from "@sillymaker/fixture-engine/public";',
        'import { fallbackValue } from "@sillymaker/fixture-engine/fallback";',
        'import { featureValue } from "@sillymaker/fixture-engine/feature/example";',
        'import { runtime } from "@sillymaker/fixture-engine/runtime";',
        "console.log(JSON.stringify({ publicValue, fallbackValue, featureValue, runtime }));",
        "",
      ].join("\n"),
    );
    const { stdout: runtimeOutput } = await execFileAsync(
      process.execPath,
      ["run", "-A", runtimeEntry],
      { cwd: applicationRoot },
    );
    assert.deepEqual(JSON.parse(runtimeOutput), {
      publicValue: 1,
      fallbackValue: 2,
      featureValue: 3,
      runtime: "deno",
    });

    await writeFile(
      join(applicationRoot, "src/entry.ts"),
      [
        'import "@sillymaker/fixture-engine/public";',
        'import "@sillymaker/fixture-engine/fallback";',
        'import "@sillymaker/fixture-engine/feature/example";',
        'import "@sillymaker/fixture-engine/runtime";',
        "",
      ].join("\n"),
    );
    const closure = await collectImportClosure(applicationRoot, ["src/entry.ts"]);
    assert.deepEqual(closure.errors, []);
    assert.deepEqual(closure.paths, ["src/entry.ts"]);
    assert.deepEqual(closure.externalImports, [
      {
        owner: "src/entry.ts",
        specifier: "@sillymaker/fixture-engine/fallback",
      },
      {
        owner: "src/entry.ts",
        specifier: "@sillymaker/fixture-engine/feature/example",
      },
      {
        owner: "src/entry.ts",
        specifier: "@sillymaker/fixture-engine/public",
      },
      {
        owner: "src/entry.ts",
        specifier: "@sillymaker/fixture-engine/runtime",
      },
    ]);

    await writeFile(
      join(applicationRoot, "src/entry.ts"),
      'import "@sillymaker/fixture-engine/private";\n',
    );
    const privateClosure = await collectImportClosure(applicationRoot, ["src/entry.ts"]);
    assert.deepEqual(privateClosure.errors, [
      "src/entry.ts: unknown workspace import @sillymaker/fixture-engine/private",
    ]);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("collects the production application closure", async () => {
  const cases = [{ entry: "e2e/src/application/entry.tsx" }];

  for (const { entry } of cases) {
    const closure = await collectImportClosure(root, [entry]);
    assert.deepEqual(closure.errors, [], entry);
    const paths = await collectManagedPaths(root, [entry]);
    assert(paths.includes(entry));
    assert(paths.includes("engine/packages/web/src/index.ts"));
    assert(!paths.some((path) => path.includes("developer-entry")));
    assert(!paths.some((path) => path.includes("player-entry")));
    assert(!paths.some((path) => path.includes("/testkit/")));
    assert(!paths.some((path) => path.includes("/testing/")));
    assert(
      !closure.externalImports.some(({ specifier }) => specifier.startsWith("@sillymaker/ui/")),
    );
  }
});

test("maps declared UI package subpaths to production source", async () => {
  const fixture = "scripts/collect-import-closure-ui-package-fixture.mjs";
  const absoluteFixture = join(root, fixture);
  await writeFile(
    absoluteFixture,
    [
      'import "@sillymaker/ui/assets";',
      'import "@sillymaker/ui/debug";',
      'import "@sillymaker/ui/diagnostics";',
      "",
    ].join("\n"),
  );
  try {
    const closure = await collectImportClosure(root, [fixture]);
    assert.deepEqual(closure.errors, []);
    for (
      const path of [
        "engine/packages/ui/src/assets/index.ts",
        "engine/packages/ui/src/debug/index.ts",
        "engine/packages/ui/src/diagnostics/index.ts",
      ]
    ) {
      assert(closure.paths.includes(path), path);
    }
    assert(
      !closure.externalImports.some(
        ({ specifier }) =>
          specifier.startsWith("@sillymaker/ui/") || specifier.endsWith("/tooling-ui"),
      ),
    );
  } finally {
    await rm(absoluteFixture, { force: true });
  }
});

test("rejects unknown internal workspace package subpaths instead of treating them as external", async () => {
  const fixture = "scripts/collect-import-closure-unknown-workspace-fixture.mjs";
  const absoluteFixture = join(root, fixture);
  await writeFile(
    absoluteFixture,
    'import "@silly-maker/story-e2e/private";\nimport "@sillymaker/ui/private";\n',
  );
  try {
    const closure = await collectImportClosure(root, [fixture]);
    assert.deepEqual(closure.errors, [
      `${fixture}: unknown workspace import @silly-maker/story-e2e/private`,
      `${fixture}: unknown workspace import @sillymaker/ui/private`,
    ]);
    assert(
      !closure.externalImports.some(
        ({ specifier }) =>
          specifier.startsWith("@sillymaker/") || specifier.startsWith("@silly-maker/"),
      ),
    );
  } finally {
    await rm(absoluteFixture, { force: true });
  }
});

test("keeps the default Story closure free of tooling and Web renderers", async () => {
  for (const entry of ["e2e/src/story.ts"]) {
    const closure = await collectImportClosure(root, [entry]);
    assert.deepEqual(closure.errors, []);
    assert(!closure.paths.some((path) => path.endsWith("e2e-renderers.tsx")));
    assert(!closure.paths.some((path) => path.endsWith(".tsx")));
    assert(!closure.paths.some((path) => path.includes("/tooling/")));
    assert(!closure.paths.some((path) => path.endsWith("/tooling.ts")));
    assert(
      !closure.externalImports.some(
        ({ specifier }) => specifier === "react" || specifier.startsWith("react/"),
      ),
    );
  }
});

test("keeps the default Story and Node-safe tooling closures free of TSX, React, and DOM", async () => {
  for (const entry of ["e2e/src/story.ts", "e2e/src/tooling/simulation-target.ts"]) {
    await assertNodeSafeStoryClosure(entry);
  }
});

test("builds sorted live records from an explicit managed path set", async () => {
  const paths = [
    "vite.config.ts",
    "engine/packages/tooling/src/identity/collect-import-closure.mjs",
  ];
  const records = await buildImportClosureRecordsV1(root, paths, "application");
  assert(Object.isFrozen(records));
  assert.deepEqual(
    records.map(({ path }) => path),
    [...paths].sort(),
  );
  for (const record of records) {
    assert(Object.isFrozen(record));
    assert.equal(record.facet, "application");
    assert.equal(
      record.sha256,
      `sha256:${
        createHash("sha256")
          .update(await readFile(`${root}/${record.path}`))
          .digest("hex")
      }`,
    );
  }
  await assert.rejects(
    buildImportClosureRecordsV1(root, [paths[0], paths[0]], "application"),
    /duplicate import closure path/u,
  );
});
