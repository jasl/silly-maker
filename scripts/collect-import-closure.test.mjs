// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import {
  buildImportClosureRecordsV1,
  collectImportClosure,
  collectManagedPaths,
} from "./collect-import-closure.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reactSpecifierPattern = /^(?:react(?:\/|$)|react-dom(?:\/|$))/u;

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
    for (const path of [
      "engine/packages/ui/src/assets/index.ts",
      "engine/packages/ui/src/debug/index.ts",
      "engine/packages/ui/src/diagnostics/index.ts",
    ]) {
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
    'import "@project-tavern/story-e2e/private";\nimport "@sillymaker/ui/private";\n',
  );
  try {
    const closure = await collectImportClosure(root, [fixture]);
    assert.deepEqual(closure.errors, [
      `${fixture}: unknown workspace import @project-tavern/story-e2e/private`,
      `${fixture}: unknown workspace import @sillymaker/ui/private`,
    ]);
    assert(
      !closure.externalImports.some(
        ({ specifier }) =>
          specifier.startsWith("@sillymaker/") || specifier.startsWith("@project-tavern/"),
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
  const paths = ["vite.config.ts", "scripts/collect-import-closure.mjs"];
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
      `sha256:${createHash("sha256")
        .update(await readFile(`${root}/${record.path}`))
        .digest("hex")}`,
    );
  }
  await assert.rejects(
    buildImportClosureRecordsV1(root, [paths[0], paths[0]], "application"),
    /duplicate import closure path/u,
  );
});
