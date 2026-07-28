// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const templateBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/template-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "Template",
  storySourceRoot: "template/src/",
  simulation: {
    entry: "template/src/simulation.ts",
    forbiddenPrefixes: ["template/src/presentation"],
  },
  presentation: {
    entry: "template/src/presentation.ts",
    forbiddenPrefixes: [],
  },
  applicationEntries: [
    "template/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-template-identity.mjs",
    "vite.config.ts",
  ],
  virtual: {
    specifier: templateBuildIdentityVirtualSpecifierV1,
    exportName: "templateBuildIdentityV1",
    pluginName: "sillymaker-template-build-identity",
  },
});

/** Collects the starter template BuildIdentity input from live source bytes. */
export async function collectTemplateBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Creates the Vite plugin without making the collector depend on Vite. */
export function createTemplateBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1(input);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectTemplateBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
