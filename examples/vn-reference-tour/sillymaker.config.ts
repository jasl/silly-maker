// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * M0 product-owned application shell. Temporary Story/Scene/media scaffold
 * remains only to prove wiring; M1 replaces it with the complete product data
 * frozen in DESIGN.md.
 */
export const sillymakerAppConfigV1 = {
  applicationId: "example-vn-reference-tour",
  label: "Example Story: 最后一次试音 (Product WIP · M0 complete)",
  storyEntry: {
    module: "src/story.ts",
    exportName: "vnReferenceTourStoryEntryV1",
  },
  // Temporary M0 scaffold source. It is not either of the two product Scenes
  // frozen in DESIGN.md and must be replaced, not retained, in M1.
  sceneSources: [
    {
      sceneId: "scene.vn-reference-tour.opening",
      specifier: "#sillymaker/scene/opening",
      sourceKind: "authoring_scene",
      source: "src/scenes/opening/opening.authoring-scene.json",
    },
  ],
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createVnReferenceTourSimulationTargetV1",
  },
  inspector: {
    module: "src/tooling/inspector-binding.ts",
    exportName: "vnReferenceTourInspectorBindingV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    // No build-identity collector: M0 uses the default composer identity.
    identity: null,
    desktop: {
      name: "OneLastSoundCheck",
      identifier: "dev.sillymaker.example.vnreferencetour",
      // Optional app icon for darwin desktop packages: an app-root-relative
      // `.png`/`.icns`, forwarded to `deno desktop --icon` (see
      // docs/engine/build-and-release.md).
      // icon: "icon.png",
    },
  },
} as const satisfies SillymakerAppConfigV1;
