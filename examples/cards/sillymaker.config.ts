// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "example-cards",
  label: "Example: Feature Cards GUI Reference Product",
  storyEntry: null,
  assetVerification: false,
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/application/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: null,
    desktop: {
      name: "SillyMakerFeatureCards",
      identifier: "dev.sillymaker.example.cards",
    },
  },
} as const satisfies SillymakerAppConfigV1;
