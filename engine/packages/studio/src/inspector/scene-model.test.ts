// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { AuthoringSceneObjectFacetsV1 } from "@sillymaker/base/authoring/scene";
import { parseStageTagV1 } from "@sillymaker/base";

import {
  flattenInspectorTreeV1,
  inspectorObjectOrderingV1,
  inspectorPreviewBoundsV1,
  inspectorPreviewBoxV1,
} from "./scene-model.ts";

function transformV1(x: number, y: number, mirrored = false) {
  return { x, y, scalePermille: 1_000, opacityPermille: 1_000, mirrored };
}

const admittedV1 = admitAuthoringSceneDocumentV1({
  format: "sillymaker.authoring-scene",
  version: 1,
  sceneId: "scene.test.inspector",
  label: "Inspector model",
  canvas: { width: 100, height: 80 },
  layers: [{
    layerId: "layer.test.main",
    label: "Main",
    roots: [{
      objectId: "tag.test.group",
      label: "Group",
      localTransform: transformV1(0, 0),
      children: [
        {
          objectId: "tag.test.first",
          label: "First",
          localTransform: transformV1(-20, 20),
          visual: { contentId: "content.test.first" },
        },
        {
          objectId: "tag.test.second",
          label: "Second",
          localTransform: transformV1(40, 20),
          visual: { contentId: "content.test.second" },
        },
        {
          objectId: "tag.test.third",
          label: "Third",
          localTransform: transformV1(60, 20),
          visual: { contentId: "content.test.third" },
        },
      ],
    }],
  }],
  cues: [],
});

function facetsV1(x: number, mirrored = false): AuthoringSceneObjectFacetsV1 {
  return {
    inspection: {} as AuthoringSceneObjectFacetsV1["inspection"],
    placement: transformV1(x, 20, mirrored),
    geometry: { width: 20, height: 10, anchorXPermille: 500, anchorYPermille: 1_000 },
    hitRegions: [],
    motions: [],
    timelines: [],
    guiControls: [],
    interactions: [],
  };
}

describe("Inspector scene model", () => {
  it("flattens explicit layer and child order without losing hierarchy depth", () => {
    expect(
      flattenInspectorTreeV1(admittedV1.document).map((row) => [
        row.kind,
        row.kind === "layer" ? row.layerId : row.objectId,
        row.depth,
      ]),
    ).toEqual([
      ["layer", "layer.test.main", 0],
      ["object", "tag.test.group", 1],
      ["object", "tag.test.first", 2],
      ["object", "tag.test.second", 2],
      ["object", "tag.test.third", 2],
    ]);
  });

  it("derives the existing move-before vocabulary for one sibling list", () => {
    const group = admittedV1.document.layers[0]!.roots[0]!;
    const [first, second, third] = group.children;
    expect(inspectorObjectOrderingV1(admittedV1.document, first!.objectId)).toEqual({
      previousObjectId: null,
      canMoveLater: true,
      laterBeforeObjectId: "tag.test.third",
    });
    expect(inspectorObjectOrderingV1(admittedV1.document, second!.objectId)).toEqual({
      previousObjectId: "tag.test.first",
      canMoveLater: true,
      laterBeforeObjectId: null,
    });
    expect(inspectorObjectOrderingV1(admittedV1.document, third!.objectId)).toEqual({
      previousObjectId: "tag.test.second",
      canMoveLater: false,
      laterBeforeObjectId: null,
    });
    expect(
      inspectorObjectOrderingV1(admittedV1.document, parseStageTagV1("tag.test.missing")),
    ).toBeNull();
  });

  it("keeps mirrored geometry and off-canvas objects inside authoring overscan", () => {
    expect(inspectorPreviewBoxV1(facetsV1(30, true))).toEqual({
      left: 20,
      top: 10,
      width: 20,
      height: 10,
    });
    const bounds = inspectorPreviewBoundsV1(
      admittedV1.document,
      { first: facetsV1(-20), second: facetsV1(40) },
      10,
    );
    expect(bounds).toEqual({ minX: -40, minY: -10, width: 150, height: 100 });
  });
});
