// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { PetSceneDocumentV1, PetSceneRuntimeModelPlanV1 } from "./contract.ts";
import { admitPetSceneDocumentV1, compilePetSceneDocumentV1 } from "./document.ts";
import { electronicPetM1SceneDocumentV1 } from "./default-document.ts";

function compiledDefaultV1() {
  const result = compilePetSceneDocumentV1(electronicPetM1SceneDocumentV1);
  if (result.kind !== "compiled") throw new TypeError(result.diagnostic.code);
  return result.plan;
}

describe("PetSceneDocumentV1", () => {
  it("admits and compiles the current object and mapping denominator", () => {
    const admitted = admitPetSceneDocumentV1(electronicPetM1SceneDocumentV1);
    expect(admitted).toMatchObject({ kind: "admitted" });

    const plan = compiledDefaultV1();
    expect(plan.sceneId).toBe("scene.electronic-pet.home");
    expect(plan.activeCameraId).toBe("pet.camera.main");
    expect(plan.objects.map((object) => [object.objectId, object.kind])).toEqual([
      ["pet.home", "group"],
      ["pet.room", "model"],
      ["pet.cat", "model"],
      ["pet.toy", "model"],
      ["pet.camera.main", "camera"],
      ["pet.light.key", "light"],
      ["pet.interaction.face", "interaction-volume"],
      ["pet.interaction.neck", "interaction-volume"],
      ["pet.interaction.back", "interaction-volume"],
    ]);

    const cat = plan.objectById.get("pet.cat") as PetSceneRuntimeModelPlanV1;
    expect(cat.parentObjectId).toBe("pet.home");
    expect(cat.sourcePath).toBe("/objects/0/children/1");
    expect(cat.model.nodeSourceById.get("cat.body")).toBe("CatBody");
    expect(cat.model.boneSourceById.get("cat.spine")).toBe("Spine");
    expect(cat.model.socketById.get("cat.neck")).toMatchObject({
      boneId: "cat.spine",
      sourceName: "NeckSocket",
    });
    expect(cat.model.socketById.get("cat.face")).toMatchObject({
      boneId: "cat.head",
      sourceName: "FaceSocket",
    });
    expect(cat.model.socketById.get("cat.back")).toMatchObject({
      boneId: "cat.spine",
      sourceName: "BackSocket",
    });
    expect(cat.model.clipSourceById.get("cat.idle")).toBe("Idle");
    expect(cat.model.appearance).toEqual({
      primaryMaterialSourceName: "CatFurPrimary",
      primaryColor: "#d9b38c",
    });
    expect(cat.model.animation).toEqual({
      idleClipId: "cat.idle",
      speed: 1,
      blendDurationMs: 180,
    });

    expect(plan.objectById.get("pet.interaction.neck")).toMatchObject({
      kind: "interaction-volume",
      interaction: {
        interactionId: "interaction.pet.neck",
        preferredStrokeDirection: { x: 0, y: 0, z: -1 },
        attachment: { modelObjectId: "pet.cat", socketId: "cat.neck" },
      },
    });
  });

  it("keeps strict shape validation at the document boundary", () => {
    expect(admitPetSceneDocumentV1({
      ...electronicPetM1SceneDocumentV1,
      unexpected: true,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.document_invalid" },
    });

    const invalidScale = structuredClone(electronicPetM1SceneDocumentV1) as PetSceneDocumentV1;
    const home = invalidScale.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    (home.transform.scale as { x: number }).x = 0;
    expect(admitPetSceneDocumentV1(invalidScale)).toMatchObject({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.document_invalid",
        path: "/objects/0/transform/scale/x",
      },
    });

    const invalidDirection = structuredClone(
      electronicPetM1SceneDocumentV1,
    ) as PetSceneDocumentV1;
    const invalidHome = invalidDirection.objects[0];
    if (invalidHome?.kind !== "group") throw new TypeError("missing home group");
    const volume = invalidHome.children.find((object) => object.kind === "interaction-volume");
    if (volume?.kind !== "interaction-volume") throw new TypeError("missing interaction volume");
    (volume.interaction.preferredStrokeDirection as { x: number; y: number; z: number }).x = 0;
    (volume.interaction.preferredStrokeDirection as { x: number; y: number; z: number }).y = 0;
    (volume.interaction.preferredStrokeDirection as { x: number; y: number; z: number }).z = 0;
    expect(admitPetSceneDocumentV1(invalidDirection)).toMatchObject({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.document_invalid",
        path: "/objects/0/children/5/interaction/preferredStrokeDirection",
      },
    });
  });

  it("normalizes the authored fur direction once in the cold runtime plan", () => {
    const home = electronicPetM1SceneDocumentV1.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    const neck = home.children.find((object) => object.objectId === "pet.interaction.neck");
    if (neck?.kind !== "interaction-volume") throw new TypeError("missing neck volume");
    const source = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === neck.objectId
            ? {
              ...neck,
              interaction: {
                ...neck.interaction,
                preferredStrokeDirection: { x: 0, y: 3, z: -4 },
              },
            }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    const result = compilePetSceneDocumentV1(source);
    expect(result.kind).toBe("compiled");
    if (result.kind !== "compiled") return;
    const compiledNeck = result.plan.objectById.get(neck.objectId);
    expect(compiledNeck?.kind).toBe("interaction-volume");
    if (compiledNeck?.kind !== "interaction-volume") return;
    expect(compiledNeck.interaction.preferredStrokeDirection).toEqual({ x: 0, y: 0.6, z: -0.8 });
    expect(neck.interaction.preferredStrokeDirection).toEqual({ x: 0, y: 0, z: -1 });
  });

  it("rejects duplicate identities and unresolved model mappings semantically", () => {
    const home = electronicPetM1SceneDocumentV1.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    const duplicate = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{ ...home, children: [...home.children, home.children[1]!] }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(duplicate)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.object_id_duplicate" },
    });

    const cat = home.children[1];
    if (cat?.kind !== "model") throw new TypeError("missing cat model");
    const missingBone = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === cat.objectId
            ? {
              ...cat,
              model: {
                ...cat.model,
                sockets: [{ ...cat.model.sockets[0]!, boneId: "cat.missing" }],
              },
            }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(missingBone)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.mapping_target_missing" },
    });
  });

  it("keeps authored model and interaction declarations paired with product code owners", () => {
    const home = electronicPetM1SceneDocumentV1.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    const cat = home.children.find((object) => object.objectId === "pet.cat");
    const toy = home.children.find((object) => object.objectId === "pet.toy");
    const volume = home.children.find((object) => object.objectId === "pet.interaction.neck");
    if (cat?.kind !== "model" || toy?.kind !== "model") {
      throw new TypeError("missing model fixtures");
    }
    if (volume?.kind !== "interaction-volume") {
      throw new TypeError("missing interaction fixture");
    }

    const modelConflict = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === cat.objectId
            ? { ...cat, model: { ...cat.model, modelId: "electronic-pet.cat.unknown" } }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(modelConflict)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.runtime_binding_conflict",
        path: "/objects/0/children/1/model/modelId",
      },
    });

    const interactionConflict = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === volume.objectId
            ? {
              ...volume,
              interaction: { ...volume.interaction, interactionId: "interaction.pet.unknown" },
            }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(interactionConflict)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.runtime_binding_conflict",
        path: "/objects/0/children/6/interaction/interactionId",
      },
    });

    const undeclaredInCode = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: [
          ...home.children,
          {
            ...toy,
            objectId: "pet.extra",
            label: "Unbound decoration",
            model: { ...toy.model, modelId: "electronic-pet.decoration.extra" },
          },
        ],
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(undeclaredInCode)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.runtime_binding_missing",
        path: "/objects/0/children/8/model/modelId",
      },
    });

    const missingAuthoredObject = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.filter((object) => object.objectId !== toy.objectId),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(missingAuthoredObject)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.runtime_binding_orphan",
        path: "/runtimeBindings/models/2",
      },
    });

    const proceduralAnimation = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === toy.objectId
            ? {
              ...toy,
              model: {
                ...toy.model,
                clips: [{ clipId: "toy.bounce", sourceName: "Bounce" }],
                animation: {
                  idleClipId: "toy.bounce",
                  speed: 1,
                  blendDurationMs: 120,
                },
              },
            }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(proceduralAnimation)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.runtime_binding_conflict",
        path: "/objects/0/children/2/model/clips",
      },
    });
  });

  it("rejects invalid active-camera and interaction attachment references", () => {
    const wrongCamera = {
      ...electronicPetM1SceneDocumentV1,
      activeCameraId: "pet.cat",
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(wrongCamera)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.active_camera_invalid" },
    });

    const home = electronicPetM1SceneDocumentV1.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    const volume = home.children.at(-1);
    if (volume?.kind !== "interaction-volume") throw new TypeError("missing interaction volume");
    const missingSocket = {
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === volume.objectId
            ? {
              ...volume,
              interaction: {
                ...volume.interaction,
                attachment: {
                  ...volume.interaction.attachment,
                  socketId: "cat.missing",
                },
              },
            }
            : object
        ),
      }],
    } satisfies PetSceneDocumentV1;
    expect(compilePetSceneDocumentV1(missingSocket)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.interaction_socket_missing" },
    });
  });

  it("validates public model parameters and resolves the idle clip", () => {
    const home = electronicPetM1SceneDocumentV1.objects[0];
    if (home?.kind !== "group") throw new TypeError("missing home group");
    const cat = home.children.find((object) => object.objectId === "pet.cat");
    if (cat?.kind !== "model") {
      throw new TypeError("missing cat model");
    }
    const animation = cat.model.animation;
    if (animation === undefined) {
      throw new TypeError("missing cat animation");
    }

    const withCatModelV1 = (model: typeof cat.model): PetSceneDocumentV1 => ({
      ...electronicPetM1SceneDocumentV1,
      objects: [{
        ...home,
        children: home.children.map((object) =>
          object.objectId === cat.objectId ? { ...cat, model } : object
        ),
      }],
    });
    for (
      const model of [
        { ...cat.model, appearance: { ...cat.model.appearance, primaryColor: "orange" } },
        { ...cat.model, animation: { ...animation, speed: 0 } },
        { ...cat.model, animation: { ...animation, blendDurationMs: -1 } },
      ]
    ) {
      expect(admitPetSceneDocumentV1(withCatModelV1(model))).toMatchObject({
        kind: "rejected",
        diagnostic: { code: "pet_scene.document_invalid" },
      });
    }

    const missingIdleClip = withCatModelV1({
      ...cat.model,
      animation: { ...animation, idleClipId: "cat.missing" },
    });
    expect(compilePetSceneDocumentV1(missingIdleClip)).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.mapping_target_missing",
        path: "/objects/0/children/1/model/animation/idleClipId",
      },
    });
  });
});
