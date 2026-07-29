// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-silly-os",
  label: "Example Story: SillyOS 98 retro desktop shell",
  storyEntry: {
    module: "src/story.ts",
    exportName: "osStoryEntryV1",
  },
  assetVerification: false,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createOsSimulationTargetV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: {
      module: "tools/build-identity.mjs",
      collectExport: "collectSillyOsBuildIdentityV1",
      createPluginExport: "createSillyOsBuildIdentityVirtualPluginV1",
    },
    desktop: {
      name: "SillyOS98",
      identifier: "dev.sillymaker.example.silly-os",
    },
  },
  releaseArtifact: false,
} as const satisfies SillymakerAppConfigV1;
