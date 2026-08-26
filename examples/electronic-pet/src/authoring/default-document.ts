// SPDX-License-Identifier: MIT
import sceneSourceV1 from "./home.pet-scene.json" with { type: "json" };

import type { PetSceneDocumentV1 } from "./contract.ts";
import { admitPetSceneDocumentV1 } from "./document.ts";

/**
 * Project-owned M1 authoring source. The room and toy resolve to product-local
 * procedural renderers, while the cat modelId resolves to the shipped original
 * GLB. Stable Object and semantic mapping identities do not depend on either
 * rendering representation.
 */
const admissionV1 = admitPetSceneDocumentV1(sceneSourceV1);
if (admissionV1.kind === "rejected") {
  throw new TypeError(
    `electronic pet M1 scene is invalid: ${admissionV1.diagnostic.code} at ${admissionV1.diagnostic.path}`,
  );
}

export const electronicPetM1SceneDocumentV1: PetSceneDocumentV1 = admissionV1.document;
