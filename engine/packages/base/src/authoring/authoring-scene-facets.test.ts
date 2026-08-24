// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseMotionDefinitionV1 } from "../contracts/motion.ts";
import { PresentationDataError } from "../contracts/presentation-data.ts";
import type { StageContentCatalogV1 } from "../contracts/stage-render-target.ts";
import { parseTimelineDefinitionV1, type TimelineCatalogV1 } from "../contracts/timeline.ts";
import {
  admitAuthoringSceneDocumentV1,
  compileAuthoringSceneV1,
  projectAuthoringSceneFacetsV1,
} from "./scene.ts";

function transformV1(
  x: number,
  opacityPermille = 1000,
): Record<string, unknown> {
  return { x, y: 0, scalePermille: 1000, opacityPermille, mirrored: false };
}

function facetSceneV1(): Record<string, unknown> {
  return {
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.facets",
    label: "Facet join",
    canvas: { width: 100, height: 100 },
    layers: [
      {
        layerId: "layer.test.back",
        label: "Back",
        roots: [
          {
            objectId: "tag.test.bottom",
            label: "Bottom",
            localTransform: transformV1(0),
            visual: { contentId: "content.test.bottom" },
            bindings: {
              hitRegionIds: ["body"],
              motionIds: ["motion.test.fade"],
              timelineIds: ["cue.test.parallel"],
              interactions: [{ regionId: "body", intentId: "intent.test.bottom" }],
              guiControls: [
                { controlId: "control.test.left", intentId: "intent.test.left" },
                { controlId: "control.test.right", intentId: "intent.test.right" },
              ],
            },
          },
          {
            objectId: "tag.test.group",
            label: "Non-visual group",
            bindings: {
              motionIds: ["motion.test.fade"],
              timelineIds: ["cue.test.parallel"],
            },
          },
        ],
      },
      {
        layerId: "layer.test.front",
        label: "Front",
        roots: [
          {
            objectId: "tag.test.top",
            label: "Transparent off-canvas top",
            localTransform: transformV1(-5, 0),
            visual: { contentId: "content.test.top" },
            bindings: {
              hitRegionIds: ["body", "missing"],
              motionIds: ["motion.test.missing"],
              timelineIds: ["cue.test.missing"],
              interactions: [{ regionId: "missing", intentId: "intent.test.missing" }],
            },
          },
        ],
      },
    ],
    cues: [],
  };
}

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent(contentId) {
    if (contentId === "content.test.bottom") {
      return {
        rendererId: "renderer.test.sprite",
        assetIds: [],
        accessibleName: "bottom",
        props: {},
        geometry: { width: 20, height: 20, anchorXPermille: 0, anchorYPermille: 0 },
        hitRegions: [
          {
            regionId: "body",
            accessibleNameText: "bottom body",
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            polygonPoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }],
          },
          {
            regionId: "catalog-only",
            accessibleNameText: "catalog only",
            x: 2,
            y: 2,
            width: 4,
            height: 4,
          },
        ],
      };
    }
    if (contentId === "content.test.top") {
      return {
        rendererId: "renderer.test.sprite",
        assetIds: [],
        accessibleName: "top",
        props: {},
        geometry: { width: 20, height: 20, anchorXPermille: 0, anchorYPermille: 0 },
        hitRegions: [{
          regionId: "body",
          accessibleNameText: "top body",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        }],
      };
    }
    return null;
  },
};

const fadeMotionV1 = parseMotionDefinitionV1({
  motionId: "motion.test.fade",
  durationMs: 100,
  delayMs: 0,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 10 }],
    },
    {
      channel: "opacityPermille",
      keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 1000 }],
    },
  ],
});

function parallelTimelineCatalogV1(tag = "tag.test.top"): TimelineCatalogV1 {
  const definition = parseTimelineDefinitionV1({
    timelineId: "cue.test.parallel",
    root: {
      kind: "parallel",
      steps: [
        {
          kind: "tween",
          target: { kind: "entry", layerId: "layer.test.back", tag: "tag.test.bottom" },
          property: "offsetX",
          to: 10,
          durationMs: 100,
          easing: "linear",
        },
        {
          kind: "tween",
          target: { kind: "entry", layerId: "layer.test.front", tag },
          property: "opacityPermille",
          to: 0,
          durationMs: 100,
          easing: "linear",
        },
      ],
    },
  });
  return {
    resolveTimeline(timelineId) {
      return timelineId === "cue.test.parallel" ? definition : null;
    },
  };
}

function compiledFacetSceneV1() {
  return compileAuthoringSceneV1(admitAuthoringSceneDocumentV1(facetSceneV1()));
}

describe("Authoring Scene authoring-only facet projection", () => {
  it("joins real catalog regions and derives topmost-first pointer order", () => {
    const projection = projectAuthoringSceneFacetsV1(
      compiledFacetSceneV1(),
      contentCatalogV1,
    );
    const bottom = projection.objects["tag.test.bottom"];
    const top = projection.objects["tag.test.top"];

    expect(projection.previewTarget.stageId).toBe("stage.authoring.preview");
    expect(
      projection.previewTarget.layers.map((layer) => ({
        layerId: layer.layerId,
        entryTags: layer.entries.map((entry) => entry.tag),
      })),
    ).toEqual([
      { layerId: "layer.test.back", entryTags: ["tag.test.bottom"] },
      { layerId: "layer.test.front", entryTags: ["tag.test.top"] },
    ]);
    expect(bottom?.hitRegions).toEqual([
      {
        regionId: "body",
        status: "resolved",
        declared: true,
        accessibleNameText: "bottom body",
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        polygonPoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }],
        hoverAssetId: null,
        intentId: "intent.test.bottom",
      },
      {
        regionId: "catalog-only",
        status: "resolved",
        declared: false,
        accessibleNameText: "catalog only",
        bounds: { x: 2, y: 2, width: 4, height: 4 },
        polygonPoints: null,
        hoverAssetId: null,
        intentId: null,
      },
    ]);
    expect(top?.inspection.visual).toMatchObject({
      transparent: true,
      anchorOutsideCanvas: true,
    });
    expect(top?.hitRegions.map(({ regionId, status }) => [regionId, status])).toEqual([
      ["body", "resolved"],
      ["missing", "unresolved"],
    ]);
    expect(projection.pointerPickOrder.map(({ objectId, regionId }) => [objectId, regionId]))
      .toEqual([
        ["tag.test.top", "body"],
        ["tag.test.bottom", "catalog-only"],
        ["tag.test.bottom", "body"],
      ]);
    expect(projection.renderDiagnostics).toEqual([]);
  });

  it("keeps dual GUI controls external and resolves Motion and Timeline channels", () => {
    const compiled = compiledFacetSceneV1();
    const projection = projectAuthoringSceneFacetsV1(compiled, contentCatalogV1, {
      motionDefinitions: [fadeMotionV1],
      timelineCatalog: parallelTimelineCatalogV1(),
    });
    const bottom = projection.objects["tag.test.bottom"];
    const top = projection.objects["tag.test.top"];

    expect(bottom?.guiControls).toEqual([
      { controlId: "control.test.left", intentId: "intent.test.left", status: "external" },
      { controlId: "control.test.right", intentId: "intent.test.right", status: "external" },
    ]);
    expect(bottom?.interactions).toEqual([
      { regionId: "body", intentId: "intent.test.bottom", status: "resolved" },
    ]);
    expect(top?.interactions).toEqual([
      { regionId: "missing", intentId: "intent.test.missing", status: "unresolved" },
    ]);
    expect(bottom?.motions).toEqual([{
      motionId: "motion.test.fade",
      status: "resolved",
      channels: ["offsetX", "opacityPermille"],
    }]);
    expect(top?.motions).toEqual([{
      motionId: "motion.test.missing",
      status: "unresolved",
      channels: [],
    }]);
    expect(projection.objects["tag.test.group"]?.motions).toEqual([{
      motionId: "motion.test.fade",
      status: "unresolved",
      channels: [],
    }]);
    expect(bottom?.timelines).toEqual([{
      timelineId: "cue.test.parallel",
      status: "resolved",
      channels: [
        {
          target: { kind: "entry", layerId: "layer.test.back", tag: "tag.test.bottom" },
          targetObjectId: "tag.test.bottom",
          property: "offsetX",
        },
        {
          target: { kind: "entry", layerId: "layer.test.front", tag: "tag.test.top" },
          targetObjectId: "tag.test.top",
          property: "opacityPermille",
        },
      ],
    }]);
    expect(top?.timelines).toEqual([{
      timelineId: "cue.test.missing",
      status: "unresolved",
      channels: [],
    }]);
    expect(projection.objects["tag.test.group"]?.timelines).toEqual([{
      timelineId: "cue.test.parallel",
      status: "unresolved",
      channels: [],
    }]);

    const runtimeText = JSON.stringify(compiled.runtimePlan);
    expect(runtimeText).not.toContain("control.test.left");
    expect(runtimeText).not.toContain("intent.test.left");
  });

  it("distinguishes omitted resolvers from provided-but-missing references", () => {
    const projection = projectAuthoringSceneFacetsV1(
      compiledFacetSceneV1(),
      contentCatalogV1,
    );
    expect(projection.objects["tag.test.bottom"]?.motions[0]?.status).toBe("external");
    expect(projection.objects["tag.test.bottom"]?.timelines[0]?.status).toBe("external");
    expect(projection.objects["tag.test.top"]?.motions[0]?.status).toBe("external");
    expect(projection.objects["tag.test.top"]?.timelines[0]?.status).toBe("external");
  });

  it("fails a resolved Timeline whose entry target is outside the compiled scene", () => {
    expect(() =>
      projectAuthoringSceneFacetsV1(compiledFacetSceneV1(), contentCatalogV1, {
        timelineCatalog: parallelTimelineCatalogV1("tag.test.unknown"),
      })
    ).toThrowError(
      new PresentationDataError(
        "/timelines/cue.test.parallel/channels/1/target",
        "authoring_scene_timeline_target_unknown",
      ),
    );
  });

  it("rejects duplicate GUI control identities during source admission", () => {
    const source = facetSceneV1();
    const layers = source.layers as Record<string, unknown>[];
    const roots = layers[0]?.roots as Record<string, unknown>[];
    const bottom = roots[0]!;
    const bindings = bottom.bindings as Record<string, unknown>;
    bindings.guiControls = [
      { controlId: "control.test.same", intentId: "intent.test.first" },
      { controlId: "control.test.same", intentId: "intent.test.second" },
    ];
    expect(() => admitAuthoringSceneDocumentV1(source)).toThrowError(
      new PresentationDataError(
        "/layers/0/roots/0/bindings/guiControls/1/controlId",
        "authoring_scene_gui_control_duplicate",
      ),
    );
  });
});
