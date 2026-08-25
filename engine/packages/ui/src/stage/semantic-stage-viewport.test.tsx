// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSemanticStageStateV1,
  parseStageMutationV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";
import type { StageContentCatalogV1 } from "@sillymaker/base";

import { GameViewportV1 } from "../viewport/game-viewport.tsx";
import { SemanticStageV1 } from "./semantic-stage.tsx";

afterEach(cleanup);

const catalogV1: StageContentCatalogV1 = {
  resolveContent: () =>
    Object.freeze({
      rendererId: "renderer.test",
      assetIds: Object.freeze([]),
      accessibleName: "测试内容",
      props: Object.freeze({}),
      hitRegions: Object.freeze([
        { regionId: "zone.a", accessibleNameText: "区域A", x: -40, y: -80, width: 80, height: 80 },
      ]),
    }),
};

function targetV1(x = 640) {
  const base = createSemanticStageStateV1({
    stageId: "stage.test",
    layerIds: ["layer.test.main"],
  });
  const outcome = reduceStageMutationsV1(base, [
    parseStageMutationV1(
      {
        kind: "show",
        layerId: "layer.test.main",
        tag: "tag.hero",
        contentId: "content.test.hero",
        zOrder: 0,
        placement: { x, y: 360, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
      },
      "/test",
    ),
  ]);
  if (outcome.kind !== "applied") throw new Error("fixture must apply");
  return projectStageRenderTargetV1(outcome.state, catalogV1).target;
}

describe("semantic stage under a managed viewport", () => {
  it("scales the stage root uniformly on the logical canvas", () => {
    render(
      <GameViewportV1
        canvas={{ width: 1280, height: 720 }}
        fallbackSize={{ width: 640, height: 360 }}
      >
        <SemanticStageV1
          target={targetV1()}
          revision={1}
          epoch={1}
          catalog={{ resolveTransition: () => null, resolveTransitionById: () => null }}
          renderers={{}}
          accessibleName="缩放舞台"
          onHitRegionActivate={() => {}}
        />
      </GameViewportV1>,
    );
    const root = document.querySelector("[data-semantic-stage]") as HTMLElement;
    expect(root.dataset.stageScale).toBe("0.5000");
    expect(root.style.transform).toBe("scale(0.5)");
    expect(root.style.inlineSize).toBe("1280px");
    expect(root.style.blockSize).toBe("720px");
    // Hit regions stay authored in logical pixels; the transform scales them.
    const region = document.querySelector("[data-stage-hit-region]") as HTMLElement;
    expect(region.style.width).toBe("80px");
  });

  it("centers the authored Stage origin inside an expanded live canvas", () => {
    render(
      <GameViewportV1
        canvas={{ width: 1280, height: 720 }}
        fallbackSize={{ width: 640, height: 720 }}
        mode="expand-height"
      >
        <SemanticStageV1
          target={targetV1()}
          revision={1}
          epoch={1}
          catalog={{ resolveTransition: () => null, resolveTransitionById: () => null }}
          renderers={{}}
          accessibleName="扩展舞台"
          onHitRegionActivate={() => {}}
        />
      </GameViewportV1>,
    );

    const root = document.querySelector("[data-semantic-stage]") as HTMLElement;
    expect(root.style.inlineSize).toBe("1280px");
    expect(root.style.blockSize).toBe("1440px");
    expect(root.style.transform).toBe("scale(0.5)");

    const origin = document.querySelector("[data-stage-coordinate-origin]") as HTMLElement;
    expect(origin.style.insetInlineStart).toBe("0px");
    expect(origin.style.insetBlockStart).toBe("360px");
    expect(origin.style.inlineSize).toBe("1280px");
    expect(origin.style.blockSize).toBe("720px");
  });

  it("wires the inline authored origin and an off-authored hit through expand-width", () => {
    const onHitRegionActivate = vi.fn();
    render(
      <GameViewportV1
        canvas={{ width: 1280, height: 720 }}
        fallbackSize={{ width: 1440, height: 360 }}
        mode="expand-width"
      >
        <SemanticStageV1
          target={targetV1(-120)}
          revision={1}
          epoch={1}
          catalog={{ resolveTransition: () => null, resolveTransitionById: () => null }}
          renderers={{}}
          accessibleName="横向扩展舞台"
          onHitRegionActivate={onHitRegionActivate}
        />
      </GameViewportV1>,
    );

    const root = document.querySelector("[data-semantic-stage]") as HTMLElement;
    expect(root.style.inlineSize).toBe("2880px");
    expect(root.style.blockSize).toBe("720px");
    expect(root.style.transform).toBe("scale(0.5)");

    const origin = document.querySelector("[data-stage-coordinate-origin]") as HTMLElement;
    expect(origin.style.insetInlineStart).toBe("800px");
    expect(origin.style.insetBlockStart).toBe("0px");
    const region = document.querySelector("[data-stage-hit-region='zone.a']") as HTMLElement;
    fireEvent.click(region);
    expect(onHitRegionActivate).toHaveBeenCalledWith(
      expect.objectContaining({ regionId: "zone.a" }),
    );
  });

  it("renders 1:1 without a viewport (bare hosts and tests)", () => {
    render(
      <SemanticStageV1
        target={targetV1()}
        revision={1}
        epoch={1}
        catalog={{ resolveTransition: () => null, resolveTransitionById: () => null }}
        renderers={{}}
        accessibleName="裸舞台"
      />,
    );
    const root = document.querySelector("[data-semantic-stage]") as HTMLElement;
    expect(root.dataset.stageScale).toBeUndefined();
    expect(root.style.transform).toBe("");
  });
});
