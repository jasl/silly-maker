// SPDX-License-Identifier: MIT

import type { BundledProgramPackageSourceV1 } from "../../../src/program-platform/installation/program-package-service.ts";
import type { ProgramPackageManifestV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import programManifestV1 from "../package/program.json" with { type: "json" };

export const translationProgramIdV1 = "sillyos.translation" as const;

export const translationProgramPackageSourceV1: BundledProgramPackageSourceV1 = {
  programId: translationProgramIdV1,
  metadata: {
    reference: {
      programId: translationProgramIdV1,
      packageVersion: "1.0.0",
      contentDigest: "f758d1a81abfe7cff288b769746ff0f9e57a0e7f782393c80f4f106b40722aa7",
    },
    manifest: programManifestV1 as ProgramPackageManifestV1,
    byteLength: 12_355,
    initialUiSurfaceId: "translation.workspace.v1",
  },
  loadArchive: async () =>
    await (await import("./bundled-package-body.ts")).loadTranslationProgramPackageArchiveV1(),
};
