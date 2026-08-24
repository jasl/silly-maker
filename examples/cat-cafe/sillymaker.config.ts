// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-cat-cafe",
  label: "Example Story: the rainy-alley cat cafe sim",
  storyEntry: {
    module: "src/story.ts",
    exportName: "catcafeStoryEntryV1",
  },
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createCatcafeSimulationTargetV1",
  },
  sceneSources: [
    {
      sceneId: "scene.catcafe.opening",
      specifier: "#sillymaker/scene/opening",
      sourceKind: "low_level_scene",
    },
  ],
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: {
      module: "tools/build-identity.mjs",
      collectExport: "collectCatcafeBuildIdentityV1",
      createPluginExport: "createCatcafeBuildIdentityVirtualPluginV1",
    },
    desktop: {
      name: "RainyAlleyCatHouse",
      identifier: "dev.sillymaker.example.cat-cafe",
      icon: "icon.png",
    },
  },
} as const satisfies SillymakerAppConfigV1;
