// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-electronic-pet",
  label: "Electronic Pet Reference Product (WIP)",
  storyEntry: {
    module: "src/story.ts",
    exportName: "electronicPetStoryEntryV1",
  },
  assetVerification: true,
  inspector: {
    module: "src/authoring/inspector-binding.tsx",
    exportName: "electronicPetInspectorBindingV1",
  },
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: null,
    desktop: {
      name: "ElectronicPet",
      identifier: "dev.sillymaker.example.electronic-pet",
    },
  },
} as const satisfies SillymakerAppConfigV1;
