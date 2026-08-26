// SPDX-License-Identifier: MIT
import type { StageContentCatalogV1 } from "@sillymaker/base";
import type { InspectorBindingV1 } from "@sillymaker/studio";
import {
  defineEmbeddedAuthoringCompanionInternalV1,
} from "@sillymaker/studio/internal/authoring-companion";

import {
  createElectronicPetAuthoringCompanionOwnerV1,
  ElectronicPetSceneInspectorV1,
} from "./pet-scene-inspector.tsx";
import type { ElectronicPetAuthoringCompanionOwnerV1 } from "./pet-scene-inspector.tsx";

const emptyStageCatalogV1: StageContentCatalogV1 = {
  resolveContent: () => null,
};

const bindingV1: InspectorBindingV1 = {
  catalog: emptyStageCatalogV1,
  renderers: {},
};

export const electronicPetInspectorBindingV1 = defineEmbeddedAuthoringCompanionInternalV1(
  bindingV1,
  {
    compatibilityId: "electronic-pet.authoring-companion.v1",
    contentSignature: "electronic-pet.pet-scene.v1",
    surfacePlacement: "replace-inspector",
    createOwner: createElectronicPetAuthoringCompanionOwnerV1,
    render(owner, input) {
      return (
        <ElectronicPetSceneInspectorV1
          owner={owner as ElectronicPetAuthoringCompanionOwnerV1}
          publicationRole={input.publicationRole}
        />
      );
    },
  },
);
