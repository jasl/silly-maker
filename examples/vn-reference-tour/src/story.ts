// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  vnReferenceTourPresentationPatchSurfaceV1,
  vnReferenceTourTextCatalogsV1,
  materializeVnReferenceTourPresentationV1,
} from "./content/presentation.ts";
import { vnReferenceTourSimulationDefinitionV1 } from "./game/simulation-definition.ts";

export type { VnReferenceTourSimulationProgramV1 } from "./game/simulation-definition.ts";
export {
  vnReferenceTourSimulationPatchSurfaceV1,
  vnReferenceTourStateContractManifestV1,
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
const vnReferenceTourStoryDefinitionV1 = {
  simulation: vnReferenceTourSimulationDefinitionV1,
  presentation: {
    textCatalogs: vnReferenceTourTextCatalogsV1,
    assetSlots: [] as readonly [],
    assetPacks: [] as readonly [],
    patchSurface: vnReferenceTourPresentationPatchSurfaceV1,
    materializePresentation: materializeVnReferenceTourPresentationV1,
  },
};

export const vnReferenceTourStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.vn-reference-tour",
    revision: parsePositiveSafeInteger(2),
  },
  define: () => vnReferenceTourStoryDefinitionV1,
});
