// SPDX-License-Identifier: MIT
import { defineConfig } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";

import { sillymakerAppConfigV1 } from "./sillymaker.config.ts";

export default defineConfig(async () => {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: import.meta.dirname,
    config: sillymakerAppConfigV1,
  });
  return {
    ...config,
    publicDir: "public",
    optimizeDeps: {
      ...config.optimizeDeps,
      // Stabilize the first lazy Agent Worker load in dev/E2E. Production
      // chunking and Browser qualification remain independently verified.
      include: [
        ...(config.optimizeDeps?.include ?? []),
        "@earendil-works/pi-agent-core",
        "@earendil-works/pi-ai",
        "@earendil-works/pi-ai/providers/all",
      ],
    },
    resolve: {
      ...config.resolve,
      alias: {
        "node:zlib": new URL(
          "./src/workspace/browser-node-zlib-unavailable.ts",
          import.meta.url,
        ).pathname,
      },
    },
  };
});
