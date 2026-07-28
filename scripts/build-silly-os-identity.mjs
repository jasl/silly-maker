// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const sillyOsBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/silly-os-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "ExampleSillyOS",
  storySourceRoot: "examples/silly-os/src/",
  simulation: {
    entry: "examples/silly-os/src/simulation.ts",
    forbiddenPrefixes: ["examples/silly-os/src/presentation"],
  },
  presentation: {
    entry: "examples/silly-os/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "examples/silly-os/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-template-identity.mjs",
    "vite.config.ts",
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
  return ownerV1.createVirtualPluginV1(input);
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
