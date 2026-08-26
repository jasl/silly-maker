// SPDX-License-Identifier: MIT
import { z } from "zod";

import type {
  PetInteractionVolumeV1,
  PetLightV1,
  PetModelBindingV1,
  PetModelSocketMappingV1,
  PetPerspectiveCameraV1,
  PetSceneCompileResultV1,
  PetSceneDiagnosticCodeV1,
  PetSceneDiagnosticV1,
  PetSceneDocumentAdmissionResultV1,
  PetSceneDocumentV1,
  PetSceneObjectV1,
  PetSceneOperationV1,
  PetSceneRuntimeModelBindingV1,
  PetSceneRuntimeObjectPlanV1,
  PetSceneRuntimePlanV1,
  PetTransformV1,
  PetVec3V1,
} from "./contract.ts";
import { petSceneDocumentFormatV1, petSceneDocumentVersionV1 } from "./contract.ts";
import {
  electronicPetInteractionBindingsV1,
  electronicPetRuntimeModelBindingsV1,
  findElectronicPetInteractionBindingV1,
  findElectronicPetModelBindingV1,
} from "../content/runtime-bindings.ts";

const idPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const colorPatternV1 = /^#[0-9a-f]{6}$/u;
const idSchemaV1 = z.string().min(1).regex(idPatternV1);
const sourceNameSchemaV1 = z.string().trim().min(1);
const labelSchemaV1 = z.string().trim().min(1);
const coordinateSchemaV1 = z.number().finite();
const rotationSchemaV1 = z.number().finite();
const scaleSchemaV1 = z.number().finite().positive();

const positionSchemaV1 = z.strictObject({
  x: coordinateSchemaV1,
  y: coordinateSchemaV1,
  z: coordinateSchemaV1,
});

const rotationVectorSchemaV1 = z.strictObject({
  x: rotationSchemaV1,
  y: rotationSchemaV1,
  z: rotationSchemaV1,
});

const scaleVectorSchemaV1 = z.strictObject({
  x: scaleSchemaV1,
  y: scaleSchemaV1,
  z: scaleSchemaV1,
});

const transformSchemaV1 = z.strictObject({
  position: positionSchemaV1,
  rotation: rotationVectorSchemaV1,
  scale: scaleVectorSchemaV1,
});

const modelBindingSchemaV1 = z.strictObject({
  modelId: idSchemaV1,
  appearance: z.strictObject({
    primaryMaterialSourceName: sourceNameSchemaV1,
    primaryColor: z.string().regex(colorPatternV1),
  }),
  animation: z.strictObject({
    idleClipId: idSchemaV1,
    speed: z.number().finite().min(0.1).max(4),
    blendDurationMs: z.number().finite().min(0).max(1_000),
  }).optional(),
  nodes: z.array(z.strictObject({
    nodeId: idSchemaV1,
    sourceName: sourceNameSchemaV1,
  })),
  bones: z.array(z.strictObject({
    boneId: idSchemaV1,
    sourceName: sourceNameSchemaV1,
  })),
  sockets: z.array(z.strictObject({
    socketId: idSchemaV1,
    sourceName: sourceNameSchemaV1,
    boneId: idSchemaV1,
    transform: transformSchemaV1,
  })),
  clips: z.array(z.strictObject({
    clipId: idSchemaV1,
    sourceName: sourceNameSchemaV1,
  })),
});

const cameraSchemaV1 = z.strictObject({
  projection: z.literal("perspective"),
  fovDegrees: z.number().finite().min(1).max(179),
  near: z.number().finite().positive(),
  far: z.number().finite().positive(),
}).refine((camera) => camera.far > camera.near, { path: ["far"] });

const lightSchemaV1 = z.strictObject({
  lightKind: z.enum(["ambient", "directional", "point"]),
  color: z.string().regex(colorPatternV1),
  intensity: z.number().finite().min(0),
});

const interactionSchemaV1 = z.strictObject({
  interactionId: idSchemaV1,
  shape: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("sphere"),
      radius: z.number().finite().positive(),
    }),
    z.strictObject({
      kind: z.literal("box"),
      size: z.strictObject({
        x: z.number().finite().positive(),
        y: z.number().finite().positive(),
        z: z.number().finite().positive(),
      }),
    }),
  ]),
  preferredStrokeDirection: positionSchemaV1.refine(
    (direction) => {
      const magnitude = Math.hypot(direction.x, direction.y, direction.z);
      return Number.isFinite(magnitude) && magnitude > 0;
    },
  ),
  attachment: z.strictObject({
    modelObjectId: idSchemaV1,
    socketId: idSchemaV1,
  }),
});

const objectBaseShapeV1 = {
  objectId: idSchemaV1,
  label: labelSchemaV1,
  transform: transformSchemaV1,
};

const sceneObjectSchemaV1: z.ZodType<PetSceneObjectV1> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({
      ...objectBaseShapeV1,
      kind: z.literal("group"),
      children: z.array(sceneObjectSchemaV1),
    }),
    z.strictObject({
      ...objectBaseShapeV1,
      kind: z.literal("model"),
      model: modelBindingSchemaV1,
    }),
    z.strictObject({
      ...objectBaseShapeV1,
      kind: z.literal("camera"),
      camera: cameraSchemaV1,
    }),
    z.strictObject({
      ...objectBaseShapeV1,
      kind: z.literal("light"),
      light: lightSchemaV1,
    }),
    z.strictObject({
      ...objectBaseShapeV1,
      kind: z.literal("interaction-volume"),
      interaction: interactionSchemaV1,
    }),
  ])
);

const documentSchemaV1: z.ZodType<PetSceneDocumentV1> = z.strictObject({
  format: z.literal(petSceneDocumentFormatV1),
  version: z.literal(petSceneDocumentVersionV1),
  sceneId: idSchemaV1,
  label: labelSchemaV1,
  activeCameraId: idSchemaV1,
  objects: z.array(sceneObjectSchemaV1).min(1),
});

function jsonPointerV1(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "/";
  return `/${
    path.map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")
  }`;
}

/** One strict boundary from untrusted authoring data to package-trusted typed data. */
export function admitPetSceneDocumentV1(value: unknown): PetSceneDocumentAdmissionResultV1 {
  const result = documentSchemaV1.safeParse(value);
  if (!result.success) {
    return {
      kind: "rejected",
      diagnostic: {
        code: "pet_scene.document_invalid",
        path: jsonPointerV1(result.error.issues[0]?.path ?? []),
      },
    };
  }
  return { kind: "admitted", document: result.data };
}

type PetSceneOperationAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly operation: PetSceneOperationV1 }
  | { readonly kind: "rejected"; readonly diagnostic: PetSceneDiagnosticV1 };

/** Admits and normalizes one replacement value at the structured-operation boundary. */
export function admitPetSceneOperationReplacementV1(
  operation: PetSceneOperationV1,
): PetSceneOperationAdmissionResultV1 {
  const diagnosticV1 = (
    field: string,
    error: { readonly issues: readonly { readonly path: readonly PropertyKey[] }[] },
  ): PetSceneDiagnosticV1 => {
    const valuePath = jsonPointerV1(error.issues[0]?.path ?? []);
    return {
      code: "pet_scene.operation_invalid",
      path: valuePath === "/" ? `/operation/${field}` : `/operation/${field}${valuePath}`,
    };
  };

  switch (operation.kind) {
    case "pet_scene.object.set_transform": {
      const result = transformSchemaV1.safeParse(operation.transform);
      return result.success
        ? { kind: "admitted", operation: { ...operation, transform: result.data } }
        : { kind: "rejected", diagnostic: diagnosticV1("transform", result.error) };
    }
    case "pet_scene.model.set_binding": {
      const result = modelBindingSchemaV1.safeParse(operation.model);
      return result.success
        ? { kind: "admitted", operation: { ...operation, model: result.data } }
        : { kind: "rejected", diagnostic: diagnosticV1("model", result.error) };
    }
    case "pet_scene.camera.set": {
      const result = cameraSchemaV1.safeParse(operation.camera);
      return result.success
        ? { kind: "admitted", operation: { ...operation, camera: result.data } }
        : { kind: "rejected", diagnostic: diagnosticV1("camera", result.error) };
    }
    case "pet_scene.light.set": {
      const result = lightSchemaV1.safeParse(operation.light);
      return result.success
        ? { kind: "admitted", operation: { ...operation, light: result.data } }
        : { kind: "rejected", diagnostic: diagnosticV1("light", result.error) };
    }
    case "pet_scene.interaction_volume.set": {
      const result = interactionSchemaV1.safeParse(operation.interaction);
      return result.success
        ? { kind: "admitted", operation: { ...operation, interaction: result.data } }
        : { kind: "rejected", diagnostic: diagnosticV1("interaction", result.error) };
    }
  }
  throw new TypeError("Unsupported PetScene operation");
}

class PetSceneCompileFailureV1 extends Error {
  readonly diagnostic: PetSceneDiagnosticV1;

  constructor(code: PetSceneDiagnosticCodeV1, path: string) {
    super(code);
    this.diagnostic = { code, path };
  }
}

function failV1(code: PetSceneDiagnosticCodeV1, path: string): never {
  throw new PetSceneCompileFailureV1(code, path);
}

function mappedStringsV1<TEntry>(
  entries: readonly TEntry[],
  idOf: (entry: TEntry) => string,
  sourceOf: (entry: TEntry) => string,
  path: string,
): ReadonlyMap<string, string> {
  const mapped = new Map<string, string>();
  for (const [index, entry] of entries.entries()) {
    const id = idOf(entry);
    if (mapped.has(id)) failV1("pet_scene.mapping_id_duplicate", `${path}/${index}`);
    mapped.set(id, sourceOf(entry));
  }
  return mapped;
}

function compileModelBindingV1(
  model: PetModelBindingV1,
  path: string,
): PetSceneRuntimeModelBindingV1 {
  const nodeSourceById = mappedStringsV1(
    model.nodes,
    (entry) => entry.nodeId,
    (entry) => entry.sourceName,
    `${path}/nodes`,
  );
  const boneSourceById = mappedStringsV1(
    model.bones,
    (entry) => entry.boneId,
    (entry) => entry.sourceName,
    `${path}/bones`,
  );
  const clipSourceById = mappedStringsV1(
    model.clips,
    (entry) => entry.clipId,
    (entry) => entry.sourceName,
    `${path}/clips`,
  );
  if (model.animation !== undefined && !clipSourceById.has(model.animation.idleClipId)) {
    failV1("pet_scene.mapping_target_missing", `${path}/animation/idleClipId`);
  }
  const socketById = new Map<string, PetModelSocketMappingV1>();
  for (const [index, socket] of model.sockets.entries()) {
    const socketPath = `${path}/sockets/${index}`;
    if (socketById.has(socket.socketId)) {
      failV1("pet_scene.mapping_id_duplicate", `${socketPath}/socketId`);
    }
    if (!boneSourceById.has(socket.boneId)) {
      failV1("pet_scene.mapping_target_missing", `${socketPath}/boneId`);
    }
    socketById.set(socket.socketId, socket);
  }
  return {
    modelId: model.modelId,
    appearance: model.appearance,
    animation: model.animation ?? null,
    nodeSourceById,
    boneSourceById,
    socketById,
    clipSourceById,
  };
}

interface PendingInteractionV1 {
  readonly object: PetSceneRuntimeObjectPlanV1 & {
    readonly kind: "interaction-volume";
    readonly interaction: PetInteractionVolumeV1;
  };
}

/**
 * Pure cold compiler. The input already crossed admission; this only resolves
 * product semantics and builds the direct runtime lookup plan.
 */
export function compilePetSceneDocumentV1(
  document: PetSceneDocumentV1,
): PetSceneCompileResultV1 {
  try {
    const objects: PetSceneRuntimeObjectPlanV1[] = [];
    const objectById = new Map<string, PetSceneRuntimeObjectPlanV1>();
    const pendingInteractions: PendingInteractionV1[] = [];

    const visit = (
      object: PetSceneObjectV1,
      parentObjectId: string | null,
      sourcePath: string,
    ): void => {
      if (objectById.has(object.objectId)) {
        failV1("pet_scene.object_id_duplicate", `${sourcePath}/objectId`);
      }
      const base = {
        objectId: object.objectId,
        label: object.label,
        parentObjectId,
        sourcePath,
        transform: object.transform,
      };
      let runtimeObject: PetSceneRuntimeObjectPlanV1;
      switch (object.kind) {
        case "group":
          runtimeObject = { ...base, kind: "group" };
          break;
        case "model":
          runtimeObject = {
            ...base,
            kind: "model",
            model: compileModelBindingV1(object.model, `${sourcePath}/model`),
          };
          break;
        case "camera":
          runtimeObject = { ...base, kind: "camera", camera: object.camera };
          break;
        case "light":
          runtimeObject = { ...base, kind: "light", light: object.light };
          break;
        case "interaction-volume": {
          const direction = object.interaction.preferredStrokeDirection;
          const magnitude = Math.hypot(direction.x, direction.y, direction.z);
          runtimeObject = {
            ...base,
            kind: "interaction-volume",
            interaction: {
              ...object.interaction,
              preferredStrokeDirection: {
                x: direction.x / magnitude,
                y: direction.y / magnitude,
                z: direction.z / magnitude,
              },
            },
          };
          pendingInteractions.push({ object: runtimeObject });
          break;
        }
      }
      objects.push(runtimeObject);
      objectById.set(object.objectId, runtimeObject);
      if (object.kind === "group") {
        for (const [index, child] of object.children.entries()) {
          visit(child, object.objectId, `${sourcePath}/children/${index}`);
        }
      }
    };

    for (const [index, object] of document.objects.entries()) {
      visit(object, null, `/objects/${index}`);
    }

    const activeCamera = objectById.get(document.activeCameraId);
    if (activeCamera === undefined) {
      failV1("pet_scene.active_camera_missing", "/activeCameraId");
    }
    if (activeCamera.kind !== "camera") {
      failV1("pet_scene.active_camera_invalid", "/activeCameraId");
    }

    for (const { object } of pendingInteractions) {
      const attachment = object.interaction.attachment;
      const model = objectById.get(attachment.modelObjectId);
      if (model === undefined) {
        failV1(
          "pet_scene.interaction_target_missing",
          `${object.sourcePath}/interaction/attachment/modelObjectId`,
        );
      }
      if (model.kind !== "model") {
        failV1(
          "pet_scene.interaction_target_invalid",
          `${object.sourcePath}/interaction/attachment/modelObjectId`,
        );
      }
      if (!model.model.socketById.has(attachment.socketId)) {
        failV1(
          "pet_scene.interaction_socket_missing",
          `${object.sourcePath}/interaction/attachment/socketId`,
        );
      }
    }

    for (const object of objects) {
      if (object.kind === "model") {
        const binding = findElectronicPetModelBindingV1(object.objectId);
        if (binding === null) {
          failV1("pet_scene.runtime_binding_missing", `${object.sourcePath}/model/modelId`);
        }
        if (binding.modelId !== object.model.modelId) {
          failV1("pet_scene.runtime_binding_conflict", `${object.sourcePath}/model/modelId`);
        }
        if (binding.runtimeKind !== "gltf") {
          if (object.model.boneSourceById.size > 0) {
            failV1("pet_scene.runtime_binding_conflict", `${object.sourcePath}/model/bones`);
          }
          if (object.model.socketById.size > 0) {
            failV1("pet_scene.runtime_binding_conflict", `${object.sourcePath}/model/sockets`);
          }
          if (object.model.clipSourceById.size > 0) {
            failV1("pet_scene.runtime_binding_conflict", `${object.sourcePath}/model/clips`);
          }
          if (object.model.animation !== null) {
            failV1("pet_scene.runtime_binding_conflict", `${object.sourcePath}/model/animation`);
          }
        }
      }
      if (object.kind === "interaction-volume") {
        const binding = findElectronicPetInteractionBindingV1(object.objectId);
        if (binding === null) {
          failV1(
            "pet_scene.runtime_binding_missing",
            `${object.sourcePath}/interaction/interactionId`,
          );
        }
        if (binding.interactionId !== object.interaction.interactionId) {
          failV1(
            "pet_scene.runtime_binding_conflict",
            `${object.sourcePath}/interaction/interactionId`,
          );
        }
      }
    }
    for (const [index, binding] of electronicPetRuntimeModelBindingsV1.entries()) {
      const object = objectById.get(binding.objectId);
      if (object?.kind !== "model") {
        failV1("pet_scene.runtime_binding_orphan", `/runtimeBindings/models/${index}`);
      }
    }
    for (const [index, binding] of electronicPetInteractionBindingsV1.entries()) {
      const object = objectById.get(binding.objectId);
      if (object?.kind !== "interaction-volume") {
        failV1("pet_scene.runtime_binding_orphan", `/runtimeBindings/interactions/${index}`);
      }
    }

    const plan: PetSceneRuntimePlanV1 = {
      sceneId: document.sceneId,
      label: document.label,
      activeCameraId: document.activeCameraId,
      objects,
      objectById,
    };
    return { kind: "compiled", plan };
  } catch (error) {
    if (error instanceof PetSceneCompileFailureV1) {
      return { kind: "rejected", diagnostic: error.diagnostic };
    }
    throw error;
  }
}

export type {
  PetInteractionVolumeV1,
  PetLightV1,
  PetPerspectiveCameraV1,
  PetTransformV1,
  PetVec3V1,
};
