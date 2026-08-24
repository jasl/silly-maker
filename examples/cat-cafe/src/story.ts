// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  catcafeAssetPacksV1,
  catcafeAssetSlotsV1,
  catcafePresentationPatchSurfaceV1,
  catcafeTextCatalogsV1,
  materializeCatcafePresentationV1,
} from "./content/presentation.ts";
import { catcafeSimulationDefinitionV1 } from "./game/simulation-definition.ts";

export type { CatcafeSimulationProgramV1 } from "./game/simulation-definition.ts";
export {
  catcafeSimulationPatchSurfaceV1,
  catcafeStateContractManifestV1,
} from "./game/simulation-definition.ts";

const catcafeStoryDefinitionV1 = {
  simulation: catcafeSimulationDefinitionV1,
  presentation: {
    textCatalogs: catcafeTextCatalogsV1,
    assetSlots: catcafeAssetSlotsV1,
    assetPacks: catcafeAssetPacksV1,
    patchSurface: catcafePresentationPatchSurfaceV1,
    materializePresentation: materializeCatcafePresentationV1,
  },
};

export const catcafeStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.cat-cafe",
    revision: parsePositiveSafeInteger(2),
  },
  define: () => catcafeStoryDefinitionV1,
});
