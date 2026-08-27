// SPDX-License-Identifier: MIT
import { reindexAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneAmbientV1,
  AuthoringSceneDocumentV1,
  AuthoringSceneObjectV1,
} from "@sillymaker/base/authoring/scene";

import type {
  SceneAuthoringDiagnosticCodeV1,
  SceneAuthoringDiagnosticV1,
  SceneAuthoringOperationV1,
  SceneAuthoringReductionResultV1,
} from "./contract.ts";
import { compileAuthoringSceneWithReceiptInternalV1 } from "../scene-compilation.ts";

function rejectedV1(
  code: SceneAuthoringDiagnosticCodeV1,
  path: string,
): SceneAuthoringReductionResultV1 {
  const diagnostic: SceneAuthoringDiagnosticV1 = { code, path };
  return { kind: "rejected", diagnostic };
}

function unreachableV1(value: never): never {
  void value;
  throw new TypeError("Unreachable Scene authoring operation");
}

interface ObjectLocationV1 {
  readonly layerIndex: number;
  /** Root index followed by zero or more child indexes. */
  readonly objectPath: readonly number[];
  readonly object: AuthoringSceneObjectV1;
}

function findObjectInSiblingsV1(
  siblings: readonly AuthoringSceneObjectV1[],
  objectId: string,
  layerIndex: number,
  parentPath: readonly number[],
): ObjectLocationV1 | null {
  for (const [index, object] of siblings.entries()) {
    const objectPath = [...parentPath, index];
    if ((object.objectId as string) === objectId) return { layerIndex, objectPath, object };
    const nested = findObjectInSiblingsV1(
      object.children,
      objectId,
      layerIndex,
      objectPath,
    );
    if (nested !== null) return nested;
  }
  return null;
}

function findObjectV1(
  document: AuthoringSceneDocumentV1,
  objectId: string,
): ObjectLocationV1 | null {
  for (const [layerIndex, layer] of document.layers.entries()) {
    const found = findObjectInSiblingsV1(layer.roots, objectId, layerIndex, []);
    if (found !== null) return found;
  }
  return null;
}

function samePathV1(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function replaceObjectAtPathV1(
  siblings: readonly AuthoringSceneObjectV1[],
  objectPath: readonly number[],
  replace: (object: AuthoringSceneObjectV1) => AuthoringSceneObjectV1,
): readonly AuthoringSceneObjectV1[] {
  const [index, ...childPath] = objectPath;
  if (index === undefined) throw new TypeError("Object path is empty");
  const object = siblings[index];
  if (object === undefined) throw new TypeError("Object path is invalid");
  const nextObject = childPath.length === 0
    ? replace(object)
    : { ...object, children: replaceObjectAtPathV1(object.children, childPath, replace) };
  const next = [...siblings];
  next[index] = nextObject;
  return next;
}

function replaceObjectV1(
  document: AuthoringSceneDocumentV1,
  location: ObjectLocationV1,
  replace: (object: AuthoringSceneObjectV1) => AuthoringSceneObjectV1,
): AuthoringSceneDocumentV1 {
  const layer = document.layers[location.layerIndex];
  if (layer === undefined) throw new TypeError("Object layer is invalid");
  const layers = [...document.layers];
  layers[location.layerIndex] = {
    ...layer,
    roots: replaceObjectAtPathV1(layer.roots, location.objectPath, replace),
  };
  return { ...document, layers };
}

function siblingsAtParentV1(
  document: AuthoringSceneDocumentV1,
  layerIndex: number,
  parentPath: readonly number[],
): readonly AuthoringSceneObjectV1[] {
  const layer = document.layers[layerIndex];
  if (layer === undefined) throw new TypeError("Object layer is invalid");
  if (parentPath.length === 0) return layer.roots;
  let siblings = layer.roots;
  let parent: AuthoringSceneObjectV1 | undefined;
  for (const index of parentPath) {
    parent = siblings[index];
    if (parent === undefined) throw new TypeError("Object parent path is invalid");
    siblings = parent.children;
  }
  return parent?.children ?? layer.roots;
}

function replaceSiblingsAtParentV1(
  document: AuthoringSceneDocumentV1,
  layerIndex: number,
  parentPath: readonly number[],
  siblings: readonly AuthoringSceneObjectV1[],
): AuthoringSceneDocumentV1 {
  const layer = document.layers[layerIndex];
  if (layer === undefined) throw new TypeError("Object layer is invalid");
  const layers = [...document.layers];
  layers[layerIndex] = parentPath.length === 0 ? { ...layer, roots: siblings } : {
    ...layer,
    roots: replaceObjectAtPathV1(layer.roots, parentPath, (parent) => ({
      ...parent,
      children: siblings,
    })),
  };
  return { ...document, layers };
}

function diagnosticPathV1(error: unknown): string {
  if (error !== null && typeof error === "object" && "path" in error) {
    const path = (error as { readonly path?: unknown }).path;
    if (typeof path === "string") return path;
  }
  return "/document";
}

function finalizeV1(
  candidate: AuthoringSceneDocumentV1,
): SceneAuthoringReductionResultV1 {
  let next: AdmittedAuthoringSceneV1;
  try {
    next = reindexAuthoringSceneDocumentV1(candidate);
    compileAuthoringSceneWithReceiptInternalV1(next);
    return { kind: "reduced", scene: next };
  } catch (error) {
    return rejectedV1("scene_authoring.result_invalid", diagnosticPathV1(error));
  }
}

function reorderV1<TValue>(
  values: readonly TValue[],
  fromIndex: number,
  beforeIndex: number | null,
): readonly TValue[] {
  const moved = values[fromIndex];
  if (moved === undefined) throw new TypeError("Move source is invalid");
  const remaining = values.filter((_, index) => index !== fromIndex);
  if (beforeIndex === null) return [...remaining, moved];
  const adjustedBeforeIndex = beforeIndex > fromIndex ? beforeIndex - 1 : beforeIndex;
  return [
    ...remaining.slice(0, adjustedBeforeIndex),
    moved,
    ...remaining.slice(adjustedBeforeIndex),
  ];
}

function orderUnchangedV1<TValue>(
  before: readonly TValue[],
  after: readonly TValue[],
): boolean {
  return before.length === after.length && before.every((value, index) => after[index] === value);
}

function transformUnchangedV1(
  before: AuthoringSceneObjectV1["localTransform"],
  after: AuthoringSceneObjectV1["localTransform"],
): boolean {
  return before.x === after.x && before.y === after.y &&
    before.scalePermille === after.scalePermille &&
    before.opacityPermille === after.opacityPermille && before.mirrored === after.mirrored;
}

function ambientUnchangedV1(
  before: AuthoringSceneAmbientV1 | undefined,
  after: AuthoringSceneAmbientV1 | null,
): boolean {
  if (before === undefined || after === null) return before === undefined && after === null;
  return before.motionId === after.motionId && before.phaseMs === after.phaseMs;
}

/**
 * Pure Authoring Scene reducer. It owns no Session, IO, save, HMR, clock,
 * runtime object, or alternate scene authority.
 */
export function reduceSceneAuthoringOperationV1(
  current: AdmittedAuthoringSceneV1,
  operation: SceneAuthoringOperationV1,
): SceneAuthoringReductionResultV1 {
  const document = current.document;
  switch (operation.kind) {
    case "scene.object.set_local_transform": {
      const location = findObjectV1(document, operation.objectId as string);
      if (location === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/objectId");
      }
      if (transformUnchangedV1(location.object.localTransform, operation.localTransform)) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1(
        replaceObjectV1(document, location, (object) => ({
          ...object,
          localTransform: operation.localTransform,
        })),
      );
    }
    case "scene.object.set_visual_content": {
      const location = findObjectV1(document, operation.objectId as string);
      if (location === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/objectId");
      }
      if (location.object.visual === undefined) {
        return rejectedV1("scene_authoring.target_conflict", "/operation/objectId");
      }
      if (location.object.visual.contentId === operation.contentId) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1(
        replaceObjectV1(document, location, (object) => ({
          ...object,
          visual: { ...object.visual!, contentId: operation.contentId },
        })),
      );
    }
    case "scene.object.set_appearance": {
      const location = findObjectV1(document, operation.objectId as string);
      if (location === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/objectId");
      }
      if (location.object.visual === undefined) {
        return rejectedV1("scene_authoring.target_conflict", "/operation/objectId");
      }
      const currentValue = location.object.visual.appearance[operation.key];
      if (
        currentValue === operation.value ||
        (currentValue === undefined && operation.value === null)
      ) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1(
        replaceObjectV1(document, location, (object) => {
          const appearance: Record<string, string> = { ...object.visual!.appearance };
          if (operation.value === null) delete appearance[operation.key];
          else appearance[operation.key] = operation.value;
          return {
            ...object,
            visual: { ...object.visual!, appearance },
          };
        }),
      );
    }
    case "scene.object.set_ambient": {
      const location = findObjectV1(document, operation.objectId as string);
      if (location === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/objectId");
      }
      if (location.object.visual === undefined) {
        return rejectedV1("scene_authoring.target_conflict", "/operation/objectId");
      }
      if (ambientUnchangedV1(location.object.visual.ambient, operation.ambient)) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1(
        replaceObjectV1(document, location, (object) => {
          const visual = { ...object.visual! };
          if (operation.ambient === null) delete visual.ambient;
          else visual.ambient = operation.ambient;
          return { ...object, visual };
        }),
      );
    }
    case "scene.object.move_before": {
      const location = findObjectV1(document, operation.objectId as string);
      if (location === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/objectId");
      }
      const parentPath = location.objectPath.slice(0, -1);
      const siblings = siblingsAtParentV1(document, location.layerIndex, parentPath);
      const fromIndex = location.objectPath.at(-1)!;
      let beforeIndex: number | null = null;
      if (operation.beforeObjectId !== null) {
        const before = findObjectV1(document, operation.beforeObjectId as string);
        if (before === null) {
          return rejectedV1(
            "scene_authoring.target_missing",
            "/operation/beforeObjectId",
          );
        }
        if (
          before.layerIndex !== location.layerIndex ||
          !samePathV1(before.objectPath.slice(0, -1), parentPath)
        ) {
          return rejectedV1(
            "scene_authoring.target_conflict",
            "/operation/beforeObjectId",
          );
        }
        beforeIndex = before.objectPath.at(-1)!;
      }
      const reordered = reorderV1(siblings, fromIndex, beforeIndex);
      if (orderUnchangedV1(siblings, reordered)) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1(
        replaceSiblingsAtParentV1(
          document,
          location.layerIndex,
          parentPath,
          reordered,
        ),
      );
    }
    case "scene.layer.move_before": {
      const fromIndex = document.layers.findIndex((layer) => layer.layerId === operation.layerId);
      if (fromIndex === -1) {
        return rejectedV1("scene_authoring.target_missing", "/operation/layerId");
      }
      let beforeIndex: number | null = null;
      if (operation.beforeLayerId !== null) {
        beforeIndex = document.layers.findIndex(
          (layer) => layer.layerId === operation.beforeLayerId,
        );
        if (beforeIndex === -1) {
          return rejectedV1(
            "scene_authoring.target_missing",
            "/operation/beforeLayerId",
          );
        }
      }
      const reordered = reorderV1(document.layers, fromIndex, beforeIndex);
      if (orderUnchangedV1(document.layers, reordered)) {
        return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return finalizeV1({
        ...document,
        layers: reordered,
      });
    }
  }
  return unreachableV1(operation);
}
