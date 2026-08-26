// SPDX-License-Identifier: MIT
import { defineConfig } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";

import { sillymakerAppConfigV1 } from "./sillymaker.config.ts";
import { createPetSceneSourcePluginV1 } from "./src/tooling/pet-scene-source-server.ts";

export default defineConfig(async () => {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: import.meta.dirname,
    config: sillymakerAppConfigV1,
  });
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      createPetSceneSourcePluginV1(import.meta.dirname),
    ],
  };
});
