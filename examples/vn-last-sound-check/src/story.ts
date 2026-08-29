// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  vnLastSoundCheckPresentationPatchSurfaceV1,
  vnLastSoundCheckTextCatalogsV1,
  materializeVnLastSoundCheckPresentationV1,
} from "./content/presentation.ts";
import { vnLastSoundCheckAssetPacksV1, vnLastSoundCheckAssetSlotsV1 } from "./content/assets.ts";
import { vnLastSoundCheckSimulationDefinitionV1 } from "./game/simulation-definition.ts";

export type { VnLastSoundCheckSimulationProgramV1 } from "./game/simulation-definition.ts";
export {
  vnLastSoundCheckSimulationPatchSurfaceV1,
  vnLastSoundCheckStateContractManifestV1,
} from "./game/simulation-definition.ts";

/**
 * The Story package: identity, the state contract manifest, and the two
 * facets (simulation + presentation).
 *
 * Version discipline (start-up diagnostics enforce it):
 * - change a module's state shape  -> bump that module's `stateSchema.revision`
 *   and its `moduleContractRevision`;
 * - change a module's rules only   -> bump `moduleContractRevision`;
 * - add/remove a module            -> new manifest entry (IDs sorted
 *   ascending) + bump `aggregateStateSchema.revision` and
 *   `stateContractRevision`;
 * - any of the above               -> bump `identity.revision`.
 */
const vnLastSoundCheckStoryDefinitionV1 = {
  simulation: vnLastSoundCheckSimulationDefinitionV1,
  presentation: {
    textCatalogs: vnLastSoundCheckTextCatalogsV1,
    assetSlots: vnLastSoundCheckAssetSlotsV1,
    assetPacks: vnLastSoundCheckAssetPacksV1,
    patchSurface: vnLastSoundCheckPresentationPatchSurfaceV1,
    materializePresentation: materializeVnLastSoundCheckPresentationV1,
  },
};

export const vnLastSoundCheckStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.vn-last-sound-check",
    revision: parsePositiveSafeInteger(4),
  },
  define: () => vnLastSoundCheckStoryDefinitionV1,
});
