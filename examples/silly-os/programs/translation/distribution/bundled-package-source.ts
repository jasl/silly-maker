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
      contentDigest: "b2c5dfbaece47356027f8735133ac2111168ac745d0c329aed0a7f40f73ee884",
    },
    manifest: programManifestV1 as ProgramPackageManifestV1,
    byteLength: 12_832,
    initialUiSurfaceId: "translation.workspace.v1",
  },
  loadArchive: async () =>
    await (await import("./bundled-package-body.ts")).loadTranslationProgramPackageArchiveV1(),
};
