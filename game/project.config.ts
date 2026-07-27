// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { SillymakerProjectConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The SillyMaker application registry. Vite target resolution, runtime
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
    {
      applicationId: "template",
      label: "Starter template Story (copy me to begin a new game)",
      storyEntry: {
        module: "game/stories/template/src/story.ts",
        exportName: "templateStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "game/stories/template/src/tooling/simulation-target.ts",
        exportName: "createTemplateSimulationTargetV1",
      },
      web: {
        storyRoot: "game/stories/template",
        applicationHtml: "game/stories/template/index.html",
        applicationEntry: "game/stories/template/src/application/entry.tsx",
        outDir: "dist/template",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-template-identity.mjs",
          collectExport: "collectTemplateBuildIdentityV1",
          createPluginExport: "createTemplateBuildIdentityVirtualPluginV1",
        },
      },
      releaseArtifact: false,
    },
    {
      applicationId: "example-bookshop",
      label: "Example Story: the closing-time bookshop vignette",
      storyEntry: {
        module: "game/stories/examples/bookshop/src/story.ts",
        exportName: "bookshopStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "game/stories/examples/bookshop/src/tooling/simulation-target.ts",
        exportName: "createBookshopSimulationTargetV1",
      },
      web: {
        storyRoot: "game/stories/examples/bookshop",
        applicationHtml: "game/stories/examples/bookshop/index.html",
        applicationEntry: "game/stories/examples/bookshop/src/application/entry.tsx",
        outDir: "dist/example-bookshop",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-bookshop-identity.mjs",
          collectExport: "collectBookshopBuildIdentityV1",
          createPluginExport: "createBookshopBuildIdentityVirtualPluginV1",
        },
      },
      releaseArtifact: false,
    },
  ],
} as const satisfies SillymakerProjectConfigV1;
