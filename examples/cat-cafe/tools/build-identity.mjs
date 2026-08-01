// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "@sillymaker/tooling/identity/story-build-identity";

export const catcafeBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/catcafe-build-identity";

const repositoryRootV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleCatcafe",
  storySourceRoot: "examples/cat-cafe/src/",
  simulation: {
    entry: "examples/cat-cafe/src/simulation-definition.ts",
    forbiddenPrefixes: ["examples/cat-cafe/src/presentation"],
  },
  presentation: {
    entry: "examples/cat-cafe/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "examples/cat-cafe/src/application/entry.tsx",
    "engine/packages/tooling/src/identity/story-build-identity.mjs",
    "engine/packages/tooling/src/identity/collect-import-closure.mjs",
    "examples/cat-cafe/tools/build-identity.mjs",
    "examples/cat-cafe/vite.config.ts",
    "examples/cat-cafe/sillymaker.config.ts",
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
  return ownerV1.createVirtualPluginV1({
    root: repositoryRootV1,
    initialIdentity: input.initialIdentity,
  });
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
