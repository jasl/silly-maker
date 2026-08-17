// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "@sillymaker/tooling/identity/story-build-identity";

export const sillyOsBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/silly-os-build-identity";

const repositoryRootV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleSillyOS",
  storySourceRoot: "examples/silly-os/src/",
  simulation: {
    entry: "examples/silly-os/src/game/simulation-definition.ts",
    forbiddenPrefixes: ["examples/silly-os/src/content/presentation"],
  },
  presentation: {
    entry: "examples/silly-os/src/content/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "examples/silly-os/src/application/entry.tsx",
    "engine/packages/tooling/src/identity/story-build-identity.mjs",
    "engine/packages/tooling/src/identity/collect-import-closure.mjs",
    "examples/silly-os/tools/build-identity.mjs",
    "examples/silly-os/vite.config.ts",
    "examples/silly-os/sillymaker.config.ts",
  ],
  virtual: {
    specifier: sillyOsBuildIdentityVirtualSpecifierV1,
    exportName: "sillyOsBuildIdentityV1",
    pluginName: "sillymaker-silly-os-build-identity",
  },
});

/** Collects the SillyOS BuildIdentity input from live source bytes. */
export async function collectSillyOsBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Creates the Vite plugin without making the collector depend on Vite. */
export function createSillyOsBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1({
    root: repositoryRootV1,
    initialIdentity: input.initialIdentity,
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectSillyOsBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
