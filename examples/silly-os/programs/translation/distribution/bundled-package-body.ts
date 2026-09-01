// SPDX-License-Identifier: MIT

import { loadUrlProgramPackageArchiveV1 } from "../../../src/program-platform/package/url-program-package-source.ts";

/** Loads the bundled body only after this exact Translation package is opened. */
export function loadTranslationProgramPackageArchiveV1() {
  return loadUrlProgramPackageArchiveV1({
    manifestUrl: new URL("../package/program.json", import.meta.url),
    files: [
      {
        path: "PROGRAM.md",
        mediaType: "text/markdown",
        url: new URL("../package/PROGRAM.md", import.meta.url),
      },
      {
        path: "initial-ui.json",
        mediaType: "application/json",
        url: new URL("../package/initial-ui.json", import.meta.url),
      },
      {
        path: "prompts/translate.md",
        mediaType: "text/markdown",
        url: new URL("../package/prompts/translate.md", import.meta.url),
      },
      {
        path: "references/translation-rules.md",
        mediaType: "text/markdown",
        url: new URL("../package/references/translation-rules.md", import.meta.url),
      },
      {
        path: "settings.defaults.json",
        mediaType: "application/json",
        url: new URL("../package/settings.defaults.json", import.meta.url),
      },
    ],
  });
}
