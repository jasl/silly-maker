// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  bookshopPresentationPatchSurfaceV1,
  bookshopTextCatalogsV1,
  materializeBookshopPresentationV1,
} from "./presentation.ts";
import { bookshopSimulationDefinitionV1 } from "./simulation-definition.ts";

export type { BookshopSimulationProgramV1 } from "./simulation-definition.ts";
export {
  bookshopSimulationPatchSurfaceV1,
  bookshopStateContractManifestV1,
} from "./simulation-definition.ts";

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
const bookshopStoryDefinitionV1 = Object.freeze({
  simulation: bookshopSimulationDefinitionV1,
  presentation: Object.freeze({
    textCatalogs: bookshopTextCatalogsV1,
    assetSlots: Object.freeze([]) as readonly [],
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: bookshopPresentationPatchSurfaceV1,
    materializePresentation: materializeBookshopPresentationV1,
  }),
});

export const bookshopStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.bookshop",
    revision: parsePositiveSafeInteger(2),
  },
  define: () => bookshopStoryDefinitionV1,
});
