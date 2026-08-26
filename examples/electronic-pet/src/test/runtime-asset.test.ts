// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { compilePetSceneDocumentV1, electronicPetM1SceneDocumentV1 } from "../authoring/index.ts";
import { findElectronicPetModelBindingV1 } from "../content/runtime-bindings.ts";

describe("electronic pet runtime asset binding", () => {
  it("resolves the declared cat nodes, bones, and animation in the shipped GLB", async () => {
    const compiled = compilePetSceneDocumentV1(electronicPetM1SceneDocumentV1);
    expect(compiled.kind).toBe("compiled");
    if (compiled.kind !== "compiled") return;
    const cat = compiled.plan.objectById.get("pet.cat");
    expect(cat?.kind).toBe("model");
    if (cat?.kind !== "model") return;
    const binding = findElectronicPetModelBindingV1(cat.objectId);
    expect(binding).toMatchObject({
      modelId: cat.model.modelId,
      runtimeKind: "gltf",
    });
    if (binding === null || binding.runtimeAssetPath === null) return;

    const bytes = await readFile(
      new URL(`../../${binding.runtimeAssetPath}`, import.meta.url),
    );
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const gltf = await new Promise<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>(
      (resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject),
    );

    for (const sourceName of cat.model.nodeSourceById.values()) {
      expect(gltf.scene.getObjectByName(sourceName), `node ${sourceName}`).toBeDefined();
    }
    for (const sourceName of cat.model.boneSourceById.values()) {
      expect(gltf.scene.getObjectByName(sourceName), `bone ${sourceName}`).toBeDefined();
    }
    for (const sourceName of cat.model.clipSourceById.values()) {
      expect(
        gltf.animations.some((clip) => clip.name === sourceName),
        `clip ${sourceName}`,
      ).toBe(true);
    }
    const materialNames = new Set<string>();
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) materialNames.add(material.name);
    });
    expect(materialNames).toContain(cat.model.appearance.primaryMaterialSourceName);
    expect([...materialNames]).toEqual(expect.arrayContaining([
      "CatFurPrimary",
      "CatFeaturesDark",
      "CatMuzzleCream",
      "CatNosePink",
    ]));
  });
});
