// SPDX-License-Identifier: MIT

import { createIndexedDbProgramPackageInstallationRepositoryV1 } from "../program-platform/installation/indexeddb-program-package-installation-repository.ts";
import {
  createProgramPackageServiceV1,
  type ProgramPackageServiceV1,
} from "../program-platform/installation/program-package-service.ts";
import { sillyOsProgramHarnessCompatibilityV1 } from "../program-platform/package/program-package-archive.ts";
import type { DecodeProgramPackageZipOptionsV1 } from "../program-platform/package/program-package-zip.ts";
import { creatorProgramRuntimeProfileDescriptorV1 } from "../../programs/creator/runtime-profile/creator-runtime-profile-descriptor.ts";
import { translationProgramRuntimeProfileDescriptorV1 } from "../../programs/translation/runtime-profile/translation-runtime-profile-descriptor.ts";
import { creatorProgramPackageSourceV1 } from "../../programs/creator/distribution/bundled-package-source.ts";
import { translationProgramPackageSourceV1 } from "../../programs/translation/distribution/bundled-package-source.ts";

/**
 * User-selected packages are trusted local inputs. The Browser/IndexedDB and
 * allocator limits remain the physical capacity boundary; SillyOS does not
 * invent a smaller product quota.
 */
export const sillyOsProgramPackageZipDecodeOptionsV1: DecodeProgramPackageZipOptionsV1 = {
  budgets: {
    maximumCompressedBytes: Number.MAX_SAFE_INTEGER,
    maximumUncompressedBytes: Number.MAX_SAFE_INTEGER,
    maximumEntries: Number.MAX_SAFE_INTEGER,
  },
  archiveLimits: {
    maximumManifestBytes: Number.MAX_SAFE_INTEGER,
    maximumFiles: Number.MAX_SAFE_INTEGER,
    maximumPathBytes: Number.MAX_SAFE_INTEGER,
    maximumFileBytes: Number.MAX_SAFE_INTEGER,
    maximumPackageBytes: Number.MAX_SAFE_INTEGER,
  },
};

const bundledSourcesV1 = [
  creatorProgramPackageSourceV1,
  translationProgramPackageSourceV1,
] as const;

/** IndexedDB and the host filesystem own physical capacity; this is not a content quota. */
export function createBrowserProgramPackageServiceV1(): ProgramPackageServiceV1 {
  const resourceCeiling = Number.MAX_SAFE_INTEGER;
  return createProgramPackageServiceV1({
    repository: createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: globalThis.indexedDB,
      limits: {
        maximumManifestBytes: resourceCeiling,
        maximumFiles: Number.MAX_SAFE_INTEGER,
        maximumPathBytes: resourceCeiling,
        maximumFileBytes: resourceCeiling,
        maximumPackageBytes: resourceCeiling,
      },
    }),
    bundledSources: bundledSourcesV1,
    supportedHarnesses: new Set([sillyOsProgramHarnessCompatibilityV1]),
    runtimeProfileDescriptors: [
      creatorProgramRuntimeProfileDescriptorV1,
      translationProgramRuntimeProfileDescriptorV1,
    ],
  });
}
