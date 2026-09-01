// SPDX-License-Identifier: MIT

import type { BundledProgramPackageSourceV1 } from "../../../src/program-platform/installation/program-package-service.ts";
import type { ProgramPackageManifestV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import programManifestV1 from "../package/program.json" with { type: "json" };

export const creatorProgramIdV1 = "sillyos.creator" as const;

export const creatorProgramPackageSourceV1: BundledProgramPackageSourceV1 = {
  programId: creatorProgramIdV1,
  metadata: {
    reference: {
      programId: creatorProgramIdV1,
      packageVersion: "1.0.0",
      contentDigest: "84870aab0bd6def2aed78c2cf933dfc974e30aae34f7545d34cb02f332987764",
    },
    manifest: programManifestV1 as ProgramPackageManifestV1,
    byteLength: 1_922,
    initialUiSurfaceId: null,
  },
  loadArchive: async () =>
    await (await import("./bundled-package-body.ts")).loadCreatorProgramPackageArchiveV1(),
};
