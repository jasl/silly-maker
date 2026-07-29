// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The starter application project: copy this whole directory to begin a new
 * game, then rename the applicationId/label and point the dependencies in
 * `package.json` at the engine (relative `file:` paths until the packages
 * are published). Every path in here is relative to this directory, so the
 * copy builds anywhere.
 */
export const sillymakerAppConfigV1 = {
  applicationId: "template",
  label: "Starter template Story (copy me to begin a new game)",
  storyEntry: {
    module: "src/story.ts",
    exportName: "templateStoryEntryV1",
  },
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createTemplateSimulationTargetV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    // No build-identity collector: the starter runs on the default composer
    // identity so a copied project has zero repository-coupled machinery.
    // In-repo applications may add one as a structural facet gate.
    identity: null,
    desktop: {
      name: "SillyMakerStarter",
      identifier: "dev.sillymaker.template",
    },
  },
  releaseArtifact: false,
} as const satisfies SillymakerAppConfigV1;
