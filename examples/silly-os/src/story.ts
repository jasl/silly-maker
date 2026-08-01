// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  materializeOsPresentationV1,
  osPresentationPatchSurfaceV1,
  osTextCatalogsV1,
} from "./presentation.ts";
import { osSimulationDefinitionV1 } from "./simulation-definition.ts";

export type { OsSimulationProgramV1 } from "./simulation-definition.ts";
export { osSimulationPatchSurfaceV1, osStateContractManifestV1 } from "./simulation-definition.ts";

const osStoryDefinitionV1 = Object.freeze({
  simulation: osSimulationDefinitionV1,
  presentation: Object.freeze({
    textCatalogs: osTextCatalogsV1,
    assetSlots: Object.freeze([]) as readonly [],
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: osPresentationPatchSurfaceV1,
    materializePresentation: materializeOsPresentationV1,
  }),
});

export const osStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.silly-os",
    revision: parsePositiveSafeInteger(1),
  },
  define: () => osStoryDefinitionV1,
});
