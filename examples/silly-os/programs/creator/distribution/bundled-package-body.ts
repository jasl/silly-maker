// SPDX-License-Identifier: MIT

import { loadUrlProgramPackageArchiveV1 } from "../../../src/program-platform/package/url-program-package-source.ts";

/** Loads the bundled body only after this exact Creator package is opened. */
export function loadCreatorProgramPackageArchiveV1() {
  return loadUrlProgramPackageArchiveV1({
    manifestUrl: new URL("../package/program.json", import.meta.url),
    files: [{
      path: "PROGRAM.md",
      mediaType: "text/markdown",
      url: new URL("../package/PROGRAM.md", import.meta.url),
    }],
  });
}
