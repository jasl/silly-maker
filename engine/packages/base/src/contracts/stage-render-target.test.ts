// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { AssetId } from "./presentation-ids.ts";
import { createSemanticStageStateV1 } from "./semantic-stage.ts";
import { reduceStageMutationsV1 } from "./semantic-stage-reducer.ts";
import type { StageContentCatalogV1 } from "./stage-render-target.ts";
import { projectStageRenderTargetV1, stageFallbackRendererIdV1 } from "./stage-render-target.ts";

function stageWithContentV1() {
  const outcome = reduceStageMutationsV1(
    createSemanticStageStateV1({
      stageId: "stage.test.lab",
      layerIds: ["layer.background", "layer.characters"],
    }),
    [
      { kind: "show", layerId: "layer.background", tag: "tag.bg", contentId: "content.bg.lab" },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.alpha",
        contentId: "content.char.alpha",
        appearance: { expression: "smile" },
      },
      {
        kind: "show",
        layerId: "layer.characters",
        tag: "tag.ghost",
        contentId: "content.char.unknown",
        zOrder: 1,
      },
    ],
  );
  if (outcome.kind !== "applied") throw new Error("fixture stage must apply");
  return outcome.state;
}

const catalogV1: StageContentCatalogV1 = {
  resolveContent(contentId, appearance) {
    if (contentId === "content.bg.lab") {
      return Object.freeze({
        rendererId: "renderer.test.background",
        assetIds: Object.freeze(["asset.test.bg" as AssetId]),
        accessibleName: "实验室背景",
        props: Object.freeze({ tone: "warm" }),
      });
    }
    if (contentId === "content.char.alpha") {
      return Object.freeze({
        rendererId: "renderer.test.character",
        assetIds: Object.freeze([
          "asset.test.alpha.base" as AssetId,
          `asset.test.alpha.${appearance.expression ?? "neutral"}` as AssetId,
        ]),
        accessibleName: "角色甲",
        props: Object.freeze({}),
      });
    }
    return null;
  },
};

describe("projectStageRenderTargetV1", () => {
  it("rebuilds the same render target deterministically from state and catalog", () => {
    const state = stageWithContentV1();
    const first = projectStageRenderTargetV1(state, catalogV1);
    const second = projectStageRenderTargetV1(state, catalogV1);

    expect(JSON.parse(JSON.stringify(second.target))).toEqual(
      JSON.parse(JSON.stringify(first.target)),
    );
    expect(first.target.requiredAssetIds).toEqual([
      "asset.test.alpha.base",
      "asset.test.alpha.smile",
      "asset.test.bg",
    ]);

    // Appearance flows into resolution: the projected assets follow the
    // semantic appearance without touching authoritative State.
    const entry = first.target.layers[1]?.entries[0];
    expect(entry?.key).toBe("layer.characters:tag.alpha");
    expect(entry?.rendererId).toBe("renderer.test.character");
    expect(entry?.accessibleName).toBe("角色甲");
  });

  it("binds unresolved content to the fallback renderer with a structured diagnostic", () => {
    const projection = projectStageRenderTargetV1(stageWithContentV1(), catalogV1);
    const ghost = projection.target.layers[1]?.entries.find(
      (candidate) => candidate.tag === "tag.ghost",
    );
    expect(ghost?.fallback).toBe(true);
    expect(ghost?.rendererId).toBe(stageFallbackRendererIdV1);
    expect(ghost?.assetIds).toEqual([]);
    expect(projection.diagnostics).toMatchObject([
      { code: "stage.content_unresolved", phase: "presentation" },
    ]);
  });

  it("passes valid geometry through and drops invalid geometry with a diagnostic", () => {
    const geometryCatalog = (geometry: unknown): StageContentCatalogV1 =>
      Object.freeze({
        resolveContent: () =>
          Object.freeze({
            rendererId: "renderer.test.character",
            assetIds: Object.freeze([]),
            accessibleName: "角色",
            props: Object.freeze({}),
            geometry: geometry as never,
          }),
      });

    const valid = projectStageRenderTargetV1(
      stageWithContentV1(),
      geometryCatalog({ width: 220, height: 420, anchorXPermille: 500, anchorYPermille: 1000 }),
    );
    expect(valid.diagnostics).toEqual([]);
    expect(valid.target.layers[0]?.entries[0]?.geometry).toEqual({
      width: 220,
      height: 420,
      anchorXPermille: 500,
      anchorYPermille: 1000,
    });

    for (
      const broken of [
        { width: 0, height: 420, anchorXPermille: 500, anchorYPermille: 1000 },
        { width: 220, height: 420.5, anchorXPermille: 500, anchorYPermille: 1000 },
        { width: 220, height: 420, anchorXPermille: -1, anchorYPermille: 1000 },
        { width: 220, height: 420, anchorXPermille: 500, anchorYPermille: 1001 },
      ]
    ) {
      const projection = projectStageRenderTargetV1(stageWithContentV1(), geometryCatalog(broken));
      expect(projection.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "stage.geometry_invalid",
      );
      expect(projection.target.layers[0]?.entries[0]?.geometry).toBeUndefined();
    }
  });

  it("passes valid frame sets into the entry and preload set, and drops malformed ones", () => {
    const frameCatalog = (frameAssetIds: unknown): StageContentCatalogV1 =>
      Object.freeze({
        resolveContent: () =>
          Object.freeze({
            rendererId: "renderer.test.character",
            assetIds: Object.freeze(["asset.test.base" as AssetId]),
            accessibleName: "角色",
            props: Object.freeze({}),
            frameAssetIds: frameAssetIds as never,
          }),
      });

    const valid = projectStageRenderTargetV1(
      stageWithContentV1(),
      frameCatalog(["asset.test.eyes-open", "asset.test.eyes-closed"]),
    );
    expect(valid.diagnostics).toEqual([]);
    expect(valid.target.layers[0]?.entries[0]?.frameAssetIds).toEqual([
      "asset.test.eyes-open",
      "asset.test.eyes-closed",
    ]);
    // Frames join the preload set so a swap never flashes.
    expect(valid.target.requiredAssetIds).toContain("asset.test.eyes-open");
    expect(valid.target.requiredAssetIds).toContain("asset.test.eyes-closed");

    const generatedFrames = Array.from(
      { length: 96 },
      (_ignored, index) => `asset.test.frame-${String(index)}`,
    );
    const generated = projectStageRenderTargetV1(
      stageWithContentV1(),
      frameCatalog(generatedFrames),
    );
    expect(generated.diagnostics).toEqual([]);
    expect(generated.target.layers[0]?.entries[0]?.frameAssetIds).toEqual(generatedFrames);
    expect(generated.target.requiredAssetIds).toContain(generatedFrames.at(-1));

    for (const broken of [["asset.test.eyes-open", ""]]) {
      const projection = projectStageRenderTargetV1(stageWithContentV1(), frameCatalog(broken));
      expect(projection.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "stage.frame_assets_invalid",
      );
      expect(projection.target.layers[0]?.entries[0]?.frameAssetIds).toEqual([]);
    }
  });

  it("passes shaped hit regions through and adds hover assets to the preload set", () => {
    const regionCatalog = (hitRegions: unknown): StageContentCatalogV1 =>
      Object.freeze({
        resolveContent: () =>
          Object.freeze({
            rendererId: "renderer.test.character",
            assetIds: Object.freeze([]),
            accessibleName: "角色",
            props: Object.freeze({}),
            hitRegions: hitRegions as never,
          }),
      });

    const projection = projectStageRenderTargetV1(
      stageWithContentV1(),
      regionCatalog([
        {
          regionId: "region.head",
          accessibleNameText: "头",
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          polygonPoints: [{ x: 60, y: 20 }, { x: 110, y: 100 }, { x: 10, y: 100 }],
          hoverAssetId: "asset.test.head-glow",
        },
      ]),
    );
    expect(projection.diagnostics).toEqual([]);
    const region = projection.target.layers[0]?.entries[0]?.hitRegions[0];
    expect(region?.polygonPoints).toEqual([
      { x: 60, y: 20 },
      { x: 110, y: 100 },
      { x: 10, y: 100 },
    ]);
    expect(region?.hoverAssetId).toBe("asset.test.head-glow");
    // The reveal asset preloads with the entry so hover never flashes.
    expect(projection.target.requiredAssetIds).toContain("asset.test.head-glow");
  });

  it("projects a large generated hit-region list without truncation", () => {
    const hitRegions = Array.from({ length: 96 }, (_, index) => ({
      regionId: `region.generated-${String(index)}`,
      accessibleNameText: `Generated ${String(index)}`,
      x: index,
      y: index,
      width: 10,
      height: 10,
    }));
    const projection = projectStageRenderTargetV1(stageWithContentV1(), {
      resolveContent: () => ({
        rendererId: "renderer.test.character",
        assetIds: [],
        accessibleName: "角色",
        props: {},
        hitRegions,
      }),
    });
    expect(projection.diagnostics).toEqual([]);
    expect(projection.target.layers[0]?.entries[0]?.hitRegions).toHaveLength(hitRegions.length);
    expect(projection.target.layers[0]?.entries[0]?.hitRegions.at(-1)?.regionId).toBe(
      "region.generated-95",
    );
  });

  it("degrades invalid polygons to the bounding box and drops invalid hover assets", () => {
    const regionCatalog = (region: Record<string, unknown>): StageContentCatalogV1 =>
      Object.freeze({
        resolveContent: () =>
          Object.freeze({
            rendererId: "renderer.test.character",
            assetIds: Object.freeze([]),
            accessibleName: "角色",
            props: Object.freeze({}),
            hitRegions: [
              {
                regionId: "region.zone",
                accessibleNameText: "区域",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                ...region,
              },
            ] as never,
          }),
      });

    const brokenPolygons: readonly unknown[] = [
      // Too few vertices.
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      // Over the vertex budget.
      Array.from({ length: 65 }, (_ignored, index) => ({ x: index, y: index % 2 })),
      // A vertex escapes the bounding box.
      [{ x: 0, y: 0 }, { x: 101, y: 0 }, { x: 0, y: 100 }],
      // Non-integer vertex.
      [{ x: 0.5, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }],
      // Zero area (collinear).
      [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
    ];
    for (const polygonPoints of brokenPolygons) {
      const projection = projectStageRenderTargetV1(
        stageWithContentV1(),
        regionCatalog({ polygonPoints }),
      );
      expect(projection.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "stage.hit_region_polygon_invalid",
      );
      const region = projection.target.layers[0]?.entries[0]?.hitRegions[0];
      // The region survives as its bounding box: activation never dies to a shape typo.
      expect(region?.regionId).toBe("region.zone");
      expect(region?.polygonPoints).toBeUndefined();
    }

    const hoverProjection = projectStageRenderTargetV1(
      stageWithContentV1(),
      regionCatalog({ hoverAssetId: "" }),
    );
    expect(hoverProjection.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "stage.hit_region_hover_invalid",
    );
    const hoverRegion = hoverProjection.target.layers[0]?.entries[0]?.hitRegions[0];
    expect(hoverRegion?.regionId).toBe("region.zone");
    expect(hoverRegion?.hoverAssetId).toBeUndefined();
  });

  it("reports resolutions that omit renderers or accessible names", () => {
    const sparseCatalog: StageContentCatalogV1 = Object.freeze({
      resolveContent: () =>
        Object.freeze({
          rendererId: "",
          assetIds: Object.freeze([]),
          accessibleName: "",
          props: Object.freeze({}),
        }),
    });
    const projection = projectStageRenderTargetV1(stageWithContentV1(), sparseCatalog);
    const codes = projection.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("stage.renderer_missing");
    expect(codes).toContain("stage.accessibility_missing");
    const entry = projection.target.layers[0]?.entries[0];
    expect(entry?.rendererId).toBe(stageFallbackRendererIdV1);
    expect(entry?.accessibleName).toBe("content.bg.lab");
  });
});
