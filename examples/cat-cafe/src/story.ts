// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  catcafeAssetPacksV1,
  catcafeAssetSlotsV1,
  catcafePresentationPatchSurfaceV1,
  catcafeTextCatalogsV1,
  materializeCatcafePresentationV1,
} from "./presentation.ts";
import { catcafeSimulationDefinitionV1 } from "./simulation-definition.ts";

export type { CatcafeSimulationProgramV1 } from "./simulation-definition.ts";
export {
  catcafeSimulationPatchSurfaceV1,
  catcafeStateContractManifestV1,
} from "./simulation-definition.ts";

const catcafeStoryDefinitionV1 = Object.freeze({
  simulation: catcafeSimulationDefinitionV1,
  presentation: Object.freeze({
    textCatalogs: catcafeTextCatalogsV1,
    assetSlots: catcafeAssetSlotsV1,
    assetPacks: catcafeAssetPacksV1,
    patchSurface: catcafePresentationPatchSurfaceV1,
    materializePresentation: materializeCatcafePresentationV1,
  }),
});

export const catcafeStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.cat-cafe",
    revision: parsePositiveSafeInteger(2),
  },
  define: () => catcafeStoryDefinitionV1,
});
