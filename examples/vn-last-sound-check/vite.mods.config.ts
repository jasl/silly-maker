// SPDX-License-Identifier: MIT
import { resolve } from "node:path";

import { defineConfig, type Plugin } from "vite";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";

import { sillymakerAppConfigV1 } from "./sillymaker.config.ts";

const modEnabledConfigV1 = {
  ...sillymakerAppConfigV1,
  web: {
    ...sillymakerAppConfigV1.web,
    applicationEntry: "src/mods/production-entry.tsx",
    outDir: "dist-web-mods",
  },
} as const;

const defaultEntryTagV1 = '<script type="module" src="./src/application/entry.tsx"></script>';
const modEntryTagV1 = '<script type="module" src="./src/mods/production-entry.tsx"></script>';

function modEnabledHtmlEntryPluginV1(): Plugin {
  return {
    name: "vn-last-sound-check:mod-enabled-html-entry",
    enforce: "pre",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const first = html.indexOf(defaultEntryTagV1);
        if (first === -1 || html.indexOf(defaultEntryTagV1, first + 1) !== -1) {
          throw new TypeError("Mod-enabled HTML requires exactly one default application entry");
        }
        return html.replace(defaultEntryTagV1, modEntryTagV1);
      },
    },
  };
}

export default defineConfig(async () => {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: import.meta.dirname,
    config: modEnabledConfigV1,
  });
  return {
    ...config,
    // Explicit product configuration only. The ordinary build keeps publicDir
    // disabled and never copies this selection surface.
    publicDir: resolve(import.meta.dirname, "mod-artifacts"),
    plugins: [...(config.plugins ?? []), modEnabledHtmlEntryPluginV1()],
  };
});
