// SPDX-License-Identifier: MIT

/**
 * Closed, product-local Object-to-code bindings for the product room. This is not
 * an engine registry: the compiler, renderer, gameplay rule, and Inspector
 * share these few accepted identities so a source declaration cannot become
 * an unhandled runtime object.
 */
export const electronicPetRuntimeModelBindingsV1 = [
  {
    objectId: "pet.room",
    modelId: "electronic-pet.room.low-poly",
    runtimeKind: "procedural-room",
    runtimeAssetPath: null,
    rendererOwner: "pet.presentation.three",
  },
  {
    objectId: "pet.cat",
    modelId: "electronic-pet.cat.low-poly",
    runtimeKind: "gltf",
    runtimeAssetPath: "assets/models/electronic-pet-cat-m1.glb",
    rendererOwner: "pet.presentation.three",
  },
  {
    objectId: "pet.toy",
    modelId: "electronic-pet.toy.ball",
    runtimeKind: "procedural-toy",
    runtimeAssetPath: null,
    rendererOwner: "pet.presentation.three",
  },
  {
    objectId: "pet.tool.brush",
    modelId: "electronic-pet.tool.brush",
    runtimeKind: "procedural-brush",
    runtimeAssetPath: null,
    rendererOwner: "pet.presentation.three",
  },
] as const;

export const electronicPetFaceInteractionBindingV1 = {
  objectId: "pet.interaction.face",
  interactionId: "interaction.pet.face",
  actionId: "pet.stroke_face",
  interactionKind: "contact",
  behaviorOwner: "pet.game.companion",
} as const;

export const electronicPetNeckInteractionBindingV1 = {
  objectId: "pet.interaction.neck",
  interactionId: "interaction.pet.neck",
  actionId: "pet.stroke_neck",
  interactionKind: "contact",
  behaviorOwner: "pet.game.companion",
} as const;

export const electronicPetBackInteractionBindingV1 = {
  objectId: "pet.interaction.back",
  interactionId: "interaction.pet.back",
  actionId: "pet.stroke_back",
  interactionKind: "contact",
  behaviorOwner: "pet.game.companion",
} as const;

export const electronicPetDirectInteractionBindingsV1 = [
  electronicPetFaceInteractionBindingV1,
  electronicPetNeckInteractionBindingV1,
  electronicPetBackInteractionBindingV1,
] as const;

export const electronicPetGroomingInteractionBindingV1 = {
  objectId: "pet.interaction.groom.back",
  interactionId: "interaction.pet.groom.back",
  actionId: "care.groom.back",
  interactionKind: "grooming",
  behaviorOwner: "pet.game.companion",
} as const;

export const electronicPetInteractionBindingsV1 = [
  ...electronicPetDirectInteractionBindingsV1,
  electronicPetGroomingInteractionBindingV1,
] as const;

export type ElectronicPetRuntimeModelBindingV1 =
  (typeof electronicPetRuntimeModelBindingsV1)[number];
export type ElectronicPetInteractionBindingV1 = (typeof electronicPetInteractionBindingsV1)[number];

export function findElectronicPetModelBindingV1(
  objectId: string,
): ElectronicPetRuntimeModelBindingV1 | null {
  return electronicPetRuntimeModelBindingsV1.find((binding) => binding.objectId === objectId) ??
    null;
}

export function resolveElectronicPetModelAssetUrlV1(
  modelId: string,
  surface: "application" | "embedded-authoring",
  baseUrl: string,
): string | null {
  const binding = electronicPetRuntimeModelBindingsV1.find((entry) => entry.modelId === modelId);
  if (binding === undefined || binding.runtimeAssetPath === null) return null;
  const relativePath = surface === "embedded-authoring"
    ? `../../${binding.runtimeAssetPath}`
    : binding.runtimeAssetPath;
  return new URL(relativePath, baseUrl).href;
}

export function findElectronicPetInteractionBindingV1(
  objectId: string,
): ElectronicPetInteractionBindingV1 | null {
  return electronicPetInteractionBindingsV1.find((binding) => binding.objectId === objectId) ??
    null;
}
