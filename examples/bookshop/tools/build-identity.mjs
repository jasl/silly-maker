// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "@sillymaker/tooling/identity/story-build-identity";

export const bookshopBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/bookshop-build-identity";

const repositoryRootV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleBookshop",
  storySourceRoot: "examples/bookshop/src/",
  simulation: {
    entry: "examples/bookshop/src/simulation.ts",
    forbiddenPrefixes: ["examples/bookshop/src/presentation"],
  },
  presentation: {
    entry: "examples/bookshop/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "examples/bookshop/src/application/entry.tsx",
    "engine/packages/tooling/src/identity/story-build-identity.mjs",
    "engine/packages/tooling/src/identity/collect-import-closure.mjs",
    "examples/bookshop/tools/build-identity.mjs",
    "examples/bookshop/vite.config.ts",
    "examples/bookshop/sillymaker.config.ts",
  ],
  virtual: {
    specifier: bookshopBuildIdentityVirtualSpecifierV1,
    exportName: "bookshopBuildIdentityV1",
    pluginName: "sillymaker-bookshop-build-identity",
  },
});

/** Collects the starter template BuildIdentity input from live source bytes. */
export async function collectBookshopBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Creates the Vite plugin without making the collector depend on Vite. */
export function createBookshopBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1({
    root: repositoryRootV1,
    initialIdentity: input.initialIdentity,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectBookshopBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
