// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "conformance-narrative-player-core",
  label: "Narrative Player core conformance fixture",
  storyEntry: null,
  assetVerification: false,
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/entry.ts",
    base: "./",
    sourcemap: false,
    identity: null,
  },
} as const satisfies SillymakerAppConfigV1;
