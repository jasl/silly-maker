// SPDX-License-Identifier: MIT
import type { SillymakerProjectConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The SillyMaker application registry. Vite target resolution, runtime
 * asset verification, and the `deno task story` commands all consume this one
 * declaration set; adding a Story application means adding one entry here.
 *
 * This file stays runtime-dependency-free (type-only imports) because Vite
 * loads it through plain Node without the repository's TypeScript resolution
 * hooks. Command entrypoints validate it with `defineSillymakerProjectV1`.
 */
export const sillyMakerConfigV1 = {
  projectId: "silly-maker",
  applications: [
    {
      applicationId: "e2e",
      label: "Engine Lab conformance Story (headless)",
      storyEntry: {
        module: "e2e/src/story.ts",
        exportName: "labStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "e2e/src/tooling/simulation-target.ts",
        exportName: "createLabSimulationTargetV1",
      },
      // A build of this Story is an engine test Artifact, never a Project
      // Tavern release.
      web: {
        storyRoot: "e2e",
        applicationHtml: "e2e/index.html",
        applicationEntry: "e2e/src/application/entry.tsx",
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
        module: "template/src/story.ts",
        exportName: "templateStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "template/src/tooling/simulation-target.ts",
        exportName: "createTemplateSimulationTargetV1",
      },
      web: {
        storyRoot: "template",
        applicationHtml: "template/index.html",
        applicationEntry: "template/src/application/entry.tsx",
        outDir: "dist/template",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-template-identity.mjs",
          collectExport: "collectTemplateBuildIdentityV1",
          createPluginExport: "createTemplateBuildIdentityVirtualPluginV1",
        },
        desktop: {
          name: "SillyMakerStarter",
          identifier: "dev.sillymaker.template",
        },
      },
      releaseArtifact: false,
    },
    {
      applicationId: "example-bookshop",
      label: "Example Story: the closing-time bookshop vignette",
      storyEntry: {
        module: "examples/bookshop/src/story.ts",
        exportName: "bookshopStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "examples/bookshop/src/tooling/simulation-target.ts",
        exportName: "createBookshopSimulationTargetV1",
      },
      web: {
        storyRoot: "examples/bookshop",
        applicationHtml: "examples/bookshop/index.html",
        applicationEntry: "examples/bookshop/src/application/entry.tsx",
        outDir: "dist/example-bookshop",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-bookshop-identity.mjs",
          collectExport: "collectBookshopBuildIdentityV1",
          createPluginExport: "createBookshopBuildIdentityVirtualPluginV1",
        },
        desktop: {
          name: "Bookshop",
          identifier: "dev.sillymaker.example.bookshop",
        },
      },
      releaseArtifact: false,
    },
    {
      applicationId: "example-silly-os",
      label: "Example Story: SillyOS 98 retro desktop shell",
      storyEntry: {
        module: "examples/silly-os/src/story.ts",
        exportName: "osStoryEntryV1",
      },
      assetVerification: false,
      simulate: {
        module: "examples/silly-os/src/tooling/simulation-target.ts",
        exportName: "createOsSimulationTargetV1",
      },
      web: {
        storyRoot: "examples/silly-os",
        applicationHtml: "examples/silly-os/index.html",
        applicationEntry: "examples/silly-os/src/application/entry.tsx",
        outDir: "dist/example-silly-os",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-silly-os-identity.mjs",
          collectExport: "collectSillyOsBuildIdentityV1",
          createPluginExport: "createSillyOsBuildIdentityVirtualPluginV1",
        },
        desktop: {
          name: "SillyOS98",
          identifier: "dev.sillymaker.example.silly-os",
        },
      },
      releaseArtifact: false,
    },
    {
      applicationId: "example-cat-cafe",
      label: "Example Story: the rainy-alley cat cafe sim",
      storyEntry: {
        module: "examples/cat-cafe/src/story.ts",
        exportName: "catcafeStoryEntryV1",
      },
      assetVerification: true,
      simulate: {
        module: "examples/cat-cafe/src/tooling/simulation-target.ts",
        exportName: "createCatcafeSimulationTargetV1",
      },
      web: {
        storyRoot: "examples/cat-cafe",
        applicationHtml: "examples/cat-cafe/index.html",
        applicationEntry: "examples/cat-cafe/src/application/entry.tsx",
        outDir: "dist/example-cat-cafe",
        base: "./",
        sourcemap: false,
        identity: {
          module: "scripts/build-catcafe-identity.mjs",
          collectExport: "collectCatcafeBuildIdentityV1",
          createPluginExport: "createCatcafeBuildIdentityVirtualPluginV1",
        },
        desktop: {
          name: "RainyAlleyCatHouse",
          identifier: "dev.sillymaker.example.cat-cafe",
          icon: "examples/cat-cafe/icon.png",
        },
      },
      releaseArtifact: false,
    },
  ],
} as const satisfies SillymakerProjectConfigV1;
