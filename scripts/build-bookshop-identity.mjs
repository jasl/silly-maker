// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const bookshopBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/bookshop-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleBookshop",
  storySourceRoot: "game/stories/examples/bookshop/src/",
  simulation: {
    entry: "game/stories/examples/bookshop/src/simulation.ts",
    forbiddenPrefixes: ["game/stories/examples/bookshop/src/presentation"],
  },
  presentation: {
    entry: "game/stories/examples/bookshop/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "game/stories/examples/bookshop/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-template-identity.mjs",
    "vite.config.ts",
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
  return ownerV1.createVirtualPluginV1(input);
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
