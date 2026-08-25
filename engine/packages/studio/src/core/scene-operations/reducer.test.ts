// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneObjectV1,
} from "@sillymaker/base/authoring/scene";

import { admitSceneAuthoringOperationV1 } from "./admission.ts";
import type { SceneAuthoringOperationV1 } from "./contract.ts";
import { reduceSceneAuthoringOperationV1 } from "./reducer.ts";

const placementV1 = (x = 0, y = 0) => ({
  x,
  y,
  scalePermille: 1_000,
  opacityPermille: 1_000,
  mirrored: false,
});

function sceneV1(): AdmittedAuthoringSceneV1 {
  return admitAuthoringSceneDocumentV1({
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.inspector",
    label: "Inspector",
    canvas: { width: 1_600, height: 1_000 },
    layers: [
      {
        layerId: "layer.test.background",
        label: "Background",
        roots: [{
          objectId: "tag.test.background",
          label: "Background",
          visual: { contentId: "content.test.background" },
        }],
      },
      {
        layerId: "layer.test.actors",
        label: "Actors",
        roots: [
          {
            objectId: "tag.test.group-a",
            label: "Group A",
            children: [
              {
                objectId: "tag.test.alpha",
                label: "Alpha",
                localTransform: placementV1(1_000_000, 100),
                visual: {
                  contentId: "content.test.alpha",
                  appearance: { expression: "neutral" },
                },
              },
              {
                objectId: "tag.test.beta",
                label: "Beta",
                localTransform: placementV1(200, 100),
                visual: { contentId: "content.test.beta" },
              },
            ],
          },
          {
            objectId: "tag.test.group-b",
            label: "Group B",
            children: [{
              objectId: "tag.test.gamma",
              label: "Gamma",
              visual: { contentId: "content.test.gamma" },
            }],
          },
        ],
      },
      {
        layerId: "layer.test.overlay",
        label: "Overlay",
        roots: [],
      },
    ],
    cues: [],
  });
}

function operationV1(value: unknown): SceneAuthoringOperationV1 {
  const admitted = admitSceneAuthoringOperationV1(value);
  if (admitted.kind === "rejected") throw new TypeError(admitted.diagnostic.code);
  return admitted.operation;
}

function reducedV1(
  current: AdmittedAuthoringSceneV1,
  operation: SceneAuthoringOperationV1,
): AdmittedAuthoringSceneV1 {
  const result = reduceSceneAuthoringOperationV1(current, operation);
  if (result.kind === "rejected") throw new TypeError(result.diagnostic.code);
  return result.scene;
}

function objectV1(scene: AdmittedAuthoringSceneV1, objectId: string): AuthoringSceneObjectV1 {
  const pending = scene.document.layers.flatMap((layer) => layer.roots).toReversed();
  while (pending.length > 0) {
    const object = pending.pop()!;
    if ((object.objectId as string) === objectId) return object;
    pending.push(...object.children.toReversed());
  }
  throw new TypeError(`missing object ${objectId}`);
}

describe("reduceSceneAuthoringOperationV1", () => {
  it("edits nested local transforms and re-runs deterministic compilation", () => {
    const current = sceneV1();
    const result = reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_local_transform",
        objectId: "tag.test.beta",
        localTransform: { ...placementV1(320, 240), mirrored: true },
      }),
    );
    if (result.kind === "rejected") throw new TypeError(result.diagnostic.code);
    const next = result.scene;

    expect(objectV1(next, "tag.test.beta").localTransform).toEqual({
      ...placementV1(320, 240),
      mirrored: true,
    });
    expect(objectV1(current, "tag.test.beta").localTransform).toEqual(placementV1(200, 100));
  });

  it("edits only an existing Visual's content and appearance", () => {
    let current = sceneV1();
    current = reducedV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_visual_content",
        objectId: "tag.test.beta",
        contentId: "content.test.beta-alt",
      }),
    );
    current = reducedV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_appearance",
        objectId: "tag.test.beta",
        key: "expression",
        value: "happy",
      }),
    );
    expect(objectV1(current, "tag.test.beta").visual).toMatchObject({
      contentId: "content.test.beta-alt",
      appearance: { expression: "happy" },
    });

    const cleared = reducedV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_appearance",
        objectId: "tag.test.beta",
        key: "expression",
        value: null,
      }),
    );
    expect(objectV1(cleared, "tag.test.beta").visual?.appearance).toEqual({});
  });

  it("rejects Visual edits against a group without changing the source", () => {
    const current = sceneV1();
    const before = JSON.stringify(current);
    expect(reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_visual_content",
        objectId: "tag.test.group-a",
        contentId: "content.test.group",
      }),
    )).toEqual({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.target_conflict", path: "/operation/objectId" },
    });
    expect(JSON.stringify(current)).toBe(before);
  });

  it("moves objects only inside their existing sibling list", () => {
    const current = sceneV1();
    const reordered = reducedV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.beta",
        beforeObjectId: "tag.test.alpha",
      }),
    );
    expect(objectV1(reordered, "tag.test.group-a").children.map((entry) => entry.objectId)).toEqual(
      [
        "tag.test.beta",
        "tag.test.alpha",
      ],
    );
    expect(reordered.sourceMap.objects.find((entry) => entry.objectId === "tag.test.beta"))
      .toMatchObject({ jsonPointer: "/layers/1/roots/0/children/0" });
    expect(reordered.sourceMap.objects.find((entry) => entry.objectId === "tag.test.alpha"))
      .toMatchObject({ jsonPointer: "/layers/1/roots/0/children/1" });

    const toEnd = reducedV1(
      reordered,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.beta",
        beforeObjectId: null,
      }),
    );
    expect(objectV1(toEnd, "tag.test.group-a").children.map((entry) => entry.objectId)).toEqual([
      "tag.test.alpha",
      "tag.test.beta",
    ]);

    expect(reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.beta",
        beforeObjectId: "tag.test.gamma",
      }),
    )).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "scene_authoring.target_conflict",
        path: "/operation/beforeObjectId",
      },
    });
  });

  it("moves ordered layers without deriving paint order from imports", () => {
    const current = sceneV1();
    const next = reducedV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.layer.move_before",
        layerId: "layer.test.overlay",
        beforeLayerId: "layer.test.actors",
      }),
    );
    expect(next.document.layers.map((layer) => layer.layerId)).toEqual([
      "layer.test.background",
      "layer.test.overlay",
      "layer.test.actors",
    ]);
  });

  it("rejects missing targets and no-ops atomically", () => {
    const current = sceneV1();
    expect(reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_local_transform",
        objectId: "tag.test.missing",
        localTransform: placementV1(),
      }),
    )).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.target_missing" },
    });
    expect(reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_visual_content",
        objectId: "tag.test.alpha",
        contentId: "content.test.alpha",
      }),
    )).toEqual({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.no_change", path: "/operation" },
    });
    expect(reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.layer.move_before",
        layerId: "layer.test.background",
        beforeLayerId: "layer.test.background",
      }),
    )).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.no_change" },
    });
  });

  it("rejects a locally valid edit whose compiled world transform overflows", () => {
    const current = sceneV1();
    const result = reduceSceneAuthoringOperationV1(
      current,
      operationV1({
        schemaRevision: 2,
        kind: "scene.object.set_local_transform",
        objectId: "tag.test.group-a",
        localTransform: {
          x: 0,
          y: 0,
          scalePermille: 100_000,
          opacityPermille: 1_000,
          mirrored: false,
        },
      }),
    );
    expect(result).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.result_invalid" },
    });
    expect(objectV1(current, "tag.test.group-a").localTransform).toEqual(placementV1());
  });

  it("is byte-stable for the same admitted document and operation", () => {
    const current = sceneV1();
    const operation = operationV1({
      schemaRevision: 2,
      kind: "scene.object.set_appearance",
      objectId: "tag.test.alpha",
      key: "expression",
      value: "surprised",
    });
    expect(JSON.stringify(reducedV1(current, operation))).toBe(
      JSON.stringify(reducedV1(current, operation)),
    );
  });
});
