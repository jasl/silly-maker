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
