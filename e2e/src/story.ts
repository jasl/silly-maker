// SPDX-License-Identifier: MIT
import { defineGamePackage, parsePositiveSafeInteger } from "@sillymaker/base";

import {
  labAssetSlotsV1,
  labPresentationPatchSurfaceV1,
  labTextCatalogsV1,
  materializeLabPresentationV1,
} from "./presentation.ts";
import { labSimulationDefinitionV1 } from "./simulation-definition.ts";

export type { LabSimulationProgramV1 } from "./simulation-definition.ts";
export {
  labSimulationPatchSurfaceV1,
  labStateContractManifestV1,
} from "./simulation-definition.ts";

const labStoryDefinitionV1 = {
  simulation: labSimulationDefinitionV1,
  presentation: {
    textCatalogs: labTextCatalogsV1,
    assetSlots: labAssetSlotsV1,
    assetPacks: [] as readonly [],
    patchSurface: labPresentationPatchSurfaceV1,
    materializePresentation: materializeLabPresentationV1,
  },
};

export const labStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.e2e.engine-lab",
    // Revision 9: the monitor drill (authoritative monitors conformance).
    revision: parsePositiveSafeInteger(9),
  },
  define: () => labStoryDefinitionV1,
});
