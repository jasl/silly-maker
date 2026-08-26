// SPDX-License-Identifier: MIT
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import { electronicPetPresentationDefinitionV1 } from "./content/presentation.ts";
import { electronicPetSimulationDefinitionV1 } from "./game/simulation-definition.ts";

export const electronicPetStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.electronic-pet",
    revision: parsePositiveSafeInteger(1),
  },
  define: () => ({
    simulation: electronicPetSimulationDefinitionV1,
    presentation: electronicPetPresentationDefinitionV1,
  }),
});
