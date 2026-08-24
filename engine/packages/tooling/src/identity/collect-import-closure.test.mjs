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
  // `--node-modules-dir=none` keeps the spawned deno from re-materializing
  // the workspace's node_modules symlinks: every managed `deno run` briefly
  // unlinks/relinks workspace members, which races any concurrently running
  // test that realpath-resolves through those links (observed as transient
  // ENOENT in the determinism authority-map under full-suite load). The
  // walker itself resolves via the on-disk node_modules tree, which this
  // flag leaves untouched.
  const { stdout } = await execFileAsync(
    process.execPath,
    ["run", "--node-modules-dir=none", "-A", cli, ...entries],
    {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
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
    // The unknown classification carries the resolver's reason so transient
    // host failures are distinguishable from genuinely-missing exports.
    assert.equal(privateClosure.errors.length, 1);
    assert(
      privateClosure.errors[0].startsWith(
        "src/entry.ts: unknown workspace import @sillymaker/fixture-engine/private (",
      ),
      privateClosure.errors[0],
    );
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
    assert.equal(closure.errors.length, 2);
    assert(
      closure.errors[0].startsWith(
        `${fixture}: unknown workspace import @silly-maker/story-e2e/private (`,
      ),
      closure.errors[0],
    );
    assert(
      closure.errors[1].startsWith(
        `${fixture}: unknown workspace import @sillymaker/ui/private (`,
      ),
      closure.errors[1],
    );
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

test("extracts ESM imports from syntax instead of comments or source-text prefixes", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "sillymaker-import-closure-"));
  await writeFile(join(fixtureRoot, "dependency.ts"), "export const value = 1;\n");
  const entry = join(fixtureRoot, "entry.ts");
  const dynamicSpecifierError = "entry.ts: determinism.import_closure.dynamic_specifier";
  try {
    for (
      const source of [
        'const specifier = "./dependency.ts"; await import(specifier);\n',
        'await import/*comment*/("./" + "dependency.ts");\n',
        'await import("./" + dependencyName);\n',
        'await import(new URL("./dependency.ts", import.meta.url).href);\n',
        "await import(`./dependency.ts`);\n",
        "await import(`./${dependencyName}.ts`);\n",
        'await import("./dependency.ts" as string);\n',
        'await import((("./dependency.ts")));\n',
        'await import("./dependency.ts", { with: { type: "json" } });\n',
        "await import();\n",
        'await import("./dependency.ts", {}, 1);\n',
        "await import(...specifiers);\n",
      ]
    ) {
      await writeFile(entry, source);
      const closure = await collectImportClosure(fixtureRoot, ["entry.ts"]);
      assert.deepEqual(closure.paths, ["entry.ts"]);
      assert.deepEqual(closure.errors, [dynamicSpecifierError]);
    }

    await writeFile(
      entry,
      [
        'const text = "import(dynamicSpecifier)";',
        "// import(commentSpecifier)",
        'await import("./dependency.ts");',
        "",
      ].join("\n"),
    );
    const literalClosure = await collectImportClosure(fixtureRoot, ["entry.ts"]);
    assert.deepEqual(literalClosure.errors, []);
    assert.deepEqual(literalClosure.paths, ["dependency.ts", "entry.ts"]);

    await writeFile(
      entry,
      [
        'const specifier = "./dependency.ts";',
        "await import(specifier);",
        "await import(`./dependency.ts`);",
        "",
      ].join("\n"),
    );
    const repeatedUnsupportedClosure = await collectImportClosure(fixtureRoot, ["entry.ts"]);
    assert.deepEqual(repeatedUnsupportedClosure.paths, ["entry.ts"]);
    assert.deepEqual(repeatedUnsupportedClosure.errors, [dynamicSpecifierError]);

    await writeFile(entry, 'await import("./dependency.js");\n');
    const resolvedLiteralClosure = await collectImportClosure(fixtureRoot, ["entry.ts"]);
    assert.deepEqual(resolvedLiteralClosure.errors, []);
    assert.deepEqual(resolvedLiteralClosure.paths, ["dependency.ts", "entry.ts"]);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("excludes type-only ESM edges while retaining runtime-bearing ESM edges", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "sillymaker-import-closure-types-"));
  await writeFile(
    join(fixtureRoot, "dependency.ts"),
    "export interface TypeOnly {}\nexport const value = 1;\n",
  );
  const entry = join(fixtureRoot, "entry.ts");
  try {
    for (
      const source of [
        'import type { TypeOnly } from "./dependency.ts";\n',
        'import { type TypeOnly } from "./dependency.ts";\n',
        'export type { TypeOnly } from "./dependency.ts";\n',
        'export { type TypeOnly } from "./dependency.ts";\n',
        'export type * from "./dependency.ts";\n',
        'type Imported = import("./dependency.ts").TypeOnly;\n',
        'import type Dependency = require("./dependency.ts");\n',
      ]
    ) {
      await writeFile(entry, source);
      assert.deepEqual(await collectImportClosure(fixtureRoot, ["entry.ts"]), {
        paths: ["entry.ts"],
        errors: [],
        externalImports: [],
      });
    }

    for (
      const source of [
        'import "./dependency.ts";\n',
        'import {} from "./dependency.ts";\n',
        'export {} from "./dependency.ts";\n',
        'import { type TypeOnly, value } from "./dependency.ts"; void value;\n',
        'export { type TypeOnly, value } from "./dependency.ts";\n',
      ]
    ) {
      await writeFile(entry, source);
      assert.deepEqual(await collectImportClosure(fixtureRoot, ["entry.ts"]), {
        paths: ["dependency.ts", "entry.ts"],
        errors: [],
        externalImports: [],
      });
    }
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("analyzes ESM imports embedded in CommonJS and TypeScript CommonJS files", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "sillymaker-import-closure-commonjs-"));
  try {
    await writeFile(join(fixtureRoot, "dependency.mjs"), "export const value = Math.random();\n");
    await writeFile(join(fixtureRoot, "dependency.ts"), "export const value = Math.random();\n");
    await writeFile(
      join(fixtureRoot, "entry.cjs"),
      'void import("./dependency.mjs");\n',
    );
    await writeFile(
      join(fixtureRoot, "entry.cts"),
      'import { value } from "./dependency.ts"; export { value };\n',
    );

    assert.deepEqual(await collectImportClosure(fixtureRoot, ["entry.cjs"]), {
      paths: ["dependency.mjs", "entry.cjs"],
      errors: [],
      externalImports: [],
    });
    assert.deepEqual(await collectImportClosure(fixtureRoot, ["entry.cts"]), {
      paths: ["dependency.ts", "entry.cts"],
      errors: [],
      externalImports: [],
    });

    await writeFile(
      join(fixtureRoot, "entry.cts"),
      'import dependency = require("./dependency.ts"); export { dependency };\n',
    );
    assert.deepEqual(await collectImportClosure(fixtureRoot, ["entry.cts"]), {
      paths: ["entry.cts"],
      errors: [],
      externalImports: [],
    });

    for (const entry of ["entry.cjs", "entry.cts"]) {
      await writeFile(join(fixtureRoot, entry), "void import(dynamicSpecifier);\n");
      const closure = await collectImportClosure(fixtureRoot, [entry]);
      assert.deepEqual(closure.paths, [entry]);
      assert.deepEqual(closure.errors, [
        `${entry}: determinism.import_closure.dynamic_specifier`,
      ]);
    }
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
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

test("keeps the default Story and Node-safe tooling closures free of UI and React", async () => {
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
