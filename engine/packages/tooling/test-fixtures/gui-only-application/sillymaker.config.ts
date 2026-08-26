// SPDX-License-Identifier: MIT
import type { SillymakerAppConfigV1 } from "@sillymaker/tooling/project/config-types";

export const sillymakerAppConfigV1 = {
  applicationId: "conformance-gui-only",
  label: "GUI-only conformance fixture",
  storyEntry: null,
  assetVerification: false,
  web: {
    applicationHtml: "index.html",
    applicationEntry: "src/entry.tsx",
    base: "./",
    sourcemap: false,
    identity: null,
  },
} as const satisfies SillymakerAppConfigV1;
