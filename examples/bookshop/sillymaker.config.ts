// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-bookshop",
  label: "Example Story: the closing-time bookshop vignette",
  storyEntry: {
    module: "src/story.ts",
    exportName: "bookshopStoryEntryV1",
  },
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createBookshopSimulationTargetV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: {
      module: "tools/build-identity.mjs",
      collectExport: "collectBookshopBuildIdentityV1",
      createPluginExport: "createBookshopBuildIdentityVirtualPluginV1",
    },
    desktop: {
      name: "Bookshop",
      identifier: "dev.sillymaker.example.bookshop",
    },
  },
  releaseArtifact: false,
} as const satisfies SillymakerAppConfigV1;
