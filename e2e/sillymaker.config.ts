// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

/** Engine Lab conformance Story: an engine test rig, never a release. */
export const sillymakerAppConfigV1 = {
  applicationId: "e2e",
  label: "Engine Lab conformance Story (headless)",
  storyEntry: {
    module: "src/story.ts",
    exportName: "labStoryEntryV1",
  },
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createLabSimulationTargetV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: {
      module: "tools/build-identity.mjs",
      collectExport: "collectE2eBuildIdentityV1",
      createPluginExport: "createE2eBuildIdentityVirtualPluginV1",
    },
  },
} as const satisfies SillymakerAppConfigV1;
