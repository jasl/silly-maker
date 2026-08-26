// SPDX-License-Identifier: MIT
import sceneSourceV1 from "../src/authoring/home.pet-scene.json" with { type: "json" };

import { admitPetSceneDocumentV1, compilePetSceneDocumentV1 } from "../src/authoring/document.ts";

const admissionV1 = admitPetSceneDocumentV1(sceneSourceV1);
if (admissionV1.kind === "rejected") {
  throw new TypeError(
    `electronic pet scene is invalid: ${admissionV1.diagnostic.code} at ${admissionV1.diagnostic.path}`,
  );
}

const compiledV1 = compilePetSceneDocumentV1(admissionV1.document);
if (compiledV1.kind === "rejected") {
  throw new TypeError(
    `electronic pet scene cannot compile: ${compiledV1.diagnostic.code} at ${compiledV1.diagnostic.path}`,
  );
}

console.log(
  `Electronic Pet scene check passed (${String(compiledV1.plan.objects.length)} objects).`,
);
