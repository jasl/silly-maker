// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { SillymakerProjectConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The Project Tavern application registry. Vite target resolution, runtime
 * asset verification, and the `pnpm story` commands all consume this one
 * declaration set; adding a Story application means adding one entry here.
 *
 * This file stays runtime-dependency-free (type-only imports) because Vite
 * loads it through plain Node without the repository's TypeScript resolution
 * hooks. Command entrypoints validate it with `defineSillymakerProjectV1`.
 */
export const projectTavernConfigV1 = {
  projectId: "project-tavern",
  applications: [
    {
      applicationId: "poc-web",
      label: "Project Tavern PoC (browser player)",
      storyEntry: {
        module: "game/stories/poc/src/story-definition.ts",
        exportName: "pocStoryEntryV1",
      },
      assetVerification: true,
      // The PoC application still boots through Story-private composition;
      // it gains an Agent-port simulation target with the F3 migration.
      simulate: null,
      web: {
        storyRoot: "game/stories/poc",
        applicationHtml: "game/stories/poc/index.html",
        applicationEntry: "game/stories/poc/src/application/entry.tsx",
        outDir: "dist/poc",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-poc-identity.mjs",
          collectExport: "collectPocBuildIdentityV1",
          createPluginExport: "createPocBuildIdentityVirtualPluginV1",
        },
      },
      releaseArtifact: true,
    },
    {
      applicationId: "e2e",
      label: "Engine Lab conformance Story (headless)",
      storyEntry: {
        module: "game/stories/e2e/src/story.ts",
        exportName: "labStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "game/stories/e2e/src/tooling/simulation-target.ts",
        exportName: "createLabSimulationTargetV1",
      },
      // A build of this Story is an engine test Artifact, never a Project
      // Tavern release.
      web: {
        storyRoot: "game/stories/e2e",
        applicationHtml: "game/stories/e2e/index.html",
        applicationEntry: "game/stories/e2e/src/application/entry.tsx",
        outDir: "dist/e2e",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-e2e-identity.mjs",
          collectExport: "collectE2eBuildIdentityV1",
          createPluginExport: "createE2eBuildIdentityVirtualPluginV1",
        },
      },
      releaseArtifact: false,
    },
  ],
} as const satisfies SillymakerProjectConfigV1;
