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

  it("passes a valid frame set into the entry and the preload set, drops invalid ones", () => {
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

    for (
      const broken of [
        ["asset.test.eyes-open", ""],
        Array.from({ length: 65 }, (_ignored, index) => `asset.test.frame-${String(index)}`),
      ]
    ) {
      const projection = projectStageRenderTargetV1(stageWithContentV1(), frameCatalog(broken));
      expect(projection.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        "stage.frame_assets_invalid",
      );
      expect(projection.target.layers[0]?.entries[0]?.frameAssetIds).toEqual([]);
    }
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
