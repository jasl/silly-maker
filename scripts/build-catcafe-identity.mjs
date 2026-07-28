// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const catcafeBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/catcafe-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleCatcafe",
  storySourceRoot: "examples/cat-cafe/src/",
  simulation: {
    entry: "examples/cat-cafe/src/simulation.ts",
    forbiddenPrefixes: ["examples/cat-cafe/src/presentation"],
  },
  presentation: {
    entry: "examples/cat-cafe/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "examples/cat-cafe/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-template-identity.mjs",
    "vite.config.ts",
  ],
  virtual: {
    specifier: catcafeBuildIdentityVirtualSpecifierV1,
    exportName: "catcafeBuildIdentityV1",
    pluginName: "sillymaker-catcafe-build-identity",
  },
});

/** Collects the starter template BuildIdentity input from live source bytes. */
export async function collectCatcafeBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Creates the Vite plugin without making the collector depend on Vite. */
export function createCatcafeBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1(input);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectCatcafeBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
