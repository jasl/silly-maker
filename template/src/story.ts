// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import {
  templatePresentationPatchSurfaceV1,
  templateTextCatalogsV1,
  materializeTemplatePresentationV1,
} from "./content/presentation.ts";
import { templateSimulationDefinitionV1 } from "./game/simulation-definition.ts";

export type { TemplateSimulationProgramV1 } from "./game/simulation-definition.ts";
export {
  templateSimulationPatchSurfaceV1,
  templateStateContractManifestV1,
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
const templateStoryDefinitionV1 = Object.freeze({
  simulation: templateSimulationDefinitionV1,
  presentation: Object.freeze({
    textCatalogs: templateTextCatalogsV1,
    assetSlots: Object.freeze([]) as readonly [],
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: templatePresentationPatchSurfaceV1,
    materializePresentation: materializeTemplatePresentationV1,
  }),
});

export const templateStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.template.starter",
    revision: parsePositiveSafeInteger(3),
  },
  define: () => templateStoryDefinitionV1,
});
