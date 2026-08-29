// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * Product-owned application shell. M1 replaced the temporary Story/Scene
 * scaffold with the complete author data frozen in DESIGN.md; M2 delivered
 * the playable VN presentation and product UI matrix.
 */
export const sillymakerAppConfigV1 = {
  applicationId: "example-vn-last-sound-check",
  label: "最后一次试音 / One Last Sound Check",
  storyEntry: {
    module: "src/story.ts",
    exportName: "vnLastSoundCheckStoryEntryV1",
  },
  sceneSources: [
    {
      sceneId: "scene.vn-last-sound-check.control-room",
      specifier: "#sillymaker/scene/control-room",
      sourceKind: "authoring_scene",
      source: "src/scenes/control-room/control-room.authoring-scene.json",
    },
    {
      sceneId: "scene.vn-last-sound-check.rooftop-antenna",
      specifier: "#sillymaker/scene/rooftop-antenna",
      sourceKind: "authoring_scene",
      source: "src/scenes/rooftop-antenna/rooftop-antenna.authoring-scene.json",
    },
  ],
  assetVerification: true,
  simulate: {
    module: "src/tooling/simulation-target.ts",
    exportName: "createVnLastSoundCheckSimulationTargetV1",
  },
  inspector: {
    module: "src/tooling/inspector-binding.ts",
    exportName: "vnLastSoundCheckInspectorBindingV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    // No build-identity collector: this product uses the default composer identity.
    identity: null,
    desktop: {
      name: "OneLastSoundCheck",
      identifier: "dev.sillymaker.example.vnlastsoundcheck",
      // Optional app icon for darwin desktop packages: an app-root-relative
      // `.png`/`.icns`, forwarded to `deno desktop --icon` (see
      // docs/engine/build-and-release.md).
      // icon: "icon.png",
    },
  },
} as const satisfies SillymakerAppConfigV1;
