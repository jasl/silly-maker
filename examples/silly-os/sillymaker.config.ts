// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-silly-os",
  label: "SillyOS creator-agent product preview",
  storyEntry: null,
  assetVerification: false,
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: null,
    desktop: {
      name: "SillyOS",
      identifier: "dev.sillymaker.example.silly-os",
      // Optional darwin app icon (app-root-relative `.png`/`.icns`; see
      // docs/engine/build-and-release.md).
      // icon: "icon.png",
    },
  },
} as const satisfies SillymakerAppConfigV1;
