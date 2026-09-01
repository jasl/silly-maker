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
      contentDigest: "c0bf6c31ec92d86f095952181dd87de8f601fe705fefede24bd2b83669e0be53",
    },
    manifest: programManifestV1 as ProgramPackageManifestV1,
    byteLength: 10_295,
    initialUiSurfaceId: "translation.intake.v1",
  },
  loadArchive: async () =>
    await (await import("./bundled-package-body.ts")).loadTranslationProgramPackageArchiveV1(),
};
