// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssetId, MotionSampleV1, StageContentCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseMotionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.tsx";
import { SemanticStageHostV1, SemanticStageTargetHostV1 } from "./semantic-stage-host.tsx";
import { settledStageFrameV1 } from "./stage-reconciler.ts";

const catalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId, appearance) =>
    Object.freeze({
      rendererId: contentId === "content.test.ghost"
        ? "renderer.test.unregistered"
        : "renderer.test.box",
      assetIds: Object.freeze([]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({ expression: appearance.expression ?? "neutral" }),
    }),
};

function targetForMutationsV1(mutations: readonly unknown[]) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.host",
    layerIds: ["layer.test.back", "layer.test.front"],
  });
  const outcome = reduceStageMutationsV1(empty, mutations);
  if (outcome.kind !== "applied") throw new Error("host fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, catalogV1).target;
}

const boxRendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-box={entry.contentId} data-test-expression={String(entry.props.expression)} />
);

afterEach(cleanup);

describe("SemanticStageHostV1", () => {
  it("renders layers and entries with stable identities, placement, and camera", () => {
    const target = targetForMutationsV1([
      {
        kind: "show",
        layerId: "layer.test.back",
        tag: "tag.test.bg",
        contentId: "content.test.bg",
      },
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.alpha",
        contentId: "content.test.alpha",
        zOrder: 7,
        placement: { x: 480, y: 620, scalePermille: 1250, opacityPermille: 800, mirrored: true },
        appearance: { expression: "smile" },
      },
      { kind: "setCamera", camera: { x: 40, y: -20, zoomPermille: 1500 } },
      {
        kind: "setLayerTransform",
        layerId: "layer.test.back",
        transform: { x: 10, y: 0, scalePermille: 1000, visible: true },
      },
    ]);

    const { container } = render(
      <SemanticStageTargetHostV1
        target={target}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
      />,
    );

    expect(screen.getByRole("group", { name: "测试舞台" })).toBeTruthy();

    const alpha = container.querySelector('[data-stage-key="layer.test.front:tag.test.alpha"]');
    expect(alpha).not.toBeNull();
    expect(alpha?.getAttribute("data-stage-tag")).toBe("tag.test.alpha");
    expect(alpha?.getAttribute("data-stage-renderer")).toBe("renderer.test.box");
    expect(alpha?.getAttribute("aria-label")).toBe("内容 content.test.alpha");
    expect((alpha as HTMLElement).style.transform).toBe(
      "translate3d(480px, 620px, 0) scale(1.25) scaleX(-1)",
    );
    expect((alpha as HTMLElement).style.zIndex).toBe("7");
    // Placement opacity is authoritative settled data and reaches the DOM.
    expect((alpha as HTMLElement).style.opacity).toBe("0.8");

    // A fully opaque entry does not emit an opacity style at all.
    const bg = container.querySelector(
      '[data-stage-key="layer.test.back:tag.test.bg"]',
    ) as HTMLElement;
    expect(bg.style.opacity).toBe("");
    expect(
      alpha?.querySelector("[data-test-expression]")?.getAttribute("data-test-expression"),
    ).toBe("smile");

    const camera = container.querySelector('[data-stage-camera="true"]') as HTMLElement;
    expect(camera.style.transform).toBe("translate3d(-40px, 20px, 0) scale(1.5)");

    const backLayer = container.querySelector(
      '[data-stage-layer="layer.test.back"]',
    ) as HTMLElement;
    expect(backLayer.style.transform).toBe("translate3d(10px, 0px, 0) scale(1)");
    expect(backLayer.hidden).toBe(false);
  });

  it("owns the anchor transform for geometry-declaring content", () => {
    const geometryCatalog: StageContentCatalogV1 = {
      resolveContent: (contentId) =>
        Object.freeze({
          rendererId: "renderer.test.box",
          assetIds: Object.freeze([]),
          accessibleName: `内容 ${contentId}`,
          props: Object.freeze({ expression: "neutral" }),
          ...(contentId === "content.test.bg" ? {} : {
            geometry: Object.freeze({
              width: 240,
              height: 320,
              anchorXPermille: contentId === "content.test.corner" ? 0 : 500,
              anchorYPermille: contentId === "content.test.corner" ? 250 : 1000,
            }),
            hitRegions: Object.freeze([
              Object.freeze({
                regionId: "zone.test",
                accessibleNameText: "碰一下",
                x: -120,
                y: -320,
                width: 240,
                height: 320,
              }),
            ]),
          }),
        }),
    };
    const empty = createSemanticStageStateV1({
      stageId: "stage.test.host",
      layerIds: ["layer.test.back", "layer.test.front"],
    });
    const outcome = reduceStageMutationsV1(empty, [
      {
        kind: "show",
        layerId: "layer.test.back",
        tag: "tag.test.bg",
        contentId: "content.test.bg",
      },
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.alpha",
        contentId: "content.test.alpha",
        placement: { x: 920, y: 600, scalePermille: 1000, opacityPermille: 1000, mirrored: true },
      },
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.corner",
        contentId: "content.test.corner",
      },
    ]);
    if (outcome.kind !== "applied") throw new Error("host fixture stage must apply");
    const target = projectStageRenderTargetV1(outcome.state, geometryCatalog).target;

    const { container } = render(
      <SemanticStageHostV1
        frame={settledStageFrameV1(target)}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
        onHitRegionActivate={() => undefined}
      />,
    );

    // Bottom-center anchor: the engine content box carries the offset that
    // renderer CSS used to hand-roll; the wrapper transform is unchanged.
    const alpha = container.querySelector(
      '[data-stage-key="layer.test.front:tag.test.alpha"]',
    ) as HTMLElement;
    expect(alpha.style.transform).toBe("translate3d(920px, 600px, 0) scale(1) scaleX(-1)");
    const alphaBox = alpha.querySelector("[data-stage-content-box]") as HTMLElement;
    expect(alphaBox.style.width).toBe("240px");
    expect(alphaBox.style.height).toBe("320px");
    expect(alphaBox.style.transform).toBe("translate(-120px, -320px)");
    expect(alphaBox.querySelector("[data-test-box]")).not.toBeNull();

    // Hit regions stay siblings of the content box in anchor space.
    const region = alpha.querySelector('[data-stage-hit-region="zone.test"]') as HTMLElement;
    expect(region.parentElement).toBe(alpha);
    expect(region.style.left).toBe("-120px");
    expect(region.style.top).toBe("-320px");

    // Arbitrary anchors resolve proportionally (0‰ left edge, 250‰ height).
    const corner = container.querySelector(
      '[data-stage-key="layer.test.front:tag.test.corner"]',
    ) as HTMLElement;
    const cornerBox = corner.querySelector("[data-stage-content-box]") as HTMLElement;
    expect(cornerBox.style.transform).toBe("translate(0px, -80px)");

    // Geometry-free content keeps its renderer output unwrapped.
    const bg = container.querySelector(
      '[data-stage-key="layer.test.back:tag.test.bg"]',
    ) as HTMLElement;
    expect(bg.querySelector("[data-stage-content-box]")).toBeNull();
  });

  it("hides invisible layers while keeping their entries in the DOM", () => {
    const target = targetForMutationsV1([
      {
        kind: "show",
        layerId: "layer.test.back",
        tag: "tag.test.bg",
        contentId: "content.test.bg",
      },
      {
        kind: "setLayerTransform",
        layerId: "layer.test.back",
        transform: { x: 0, y: 0, scalePermille: 1000, visible: false },
      },
    ]);
    const { container } = render(
      <SemanticStageTargetHostV1
        target={target}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
      />,
    );
    const layer = container.querySelector('[data-stage-layer="layer.test.back"]') as HTMLElement;
    expect(layer.hidden).toBe(true);
    expect(layer.querySelector('[data-stage-key="layer.test.back:tag.test.bg"]')).not.toBeNull();
  });

  it("falls back and reports a diagnostic for unregistered renderers", () => {
    const target = targetForMutationsV1([
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.ghost",
        contentId: "content.test.ghost",
      },
    ]);
    const reportDiagnostic = vi.fn();
    const { container } = render(
      <SemanticStageTargetHostV1
        target={target}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
        reportDiagnostic={reportDiagnostic}
      />,
    );
    const ghost = container.querySelector('[data-stage-key="layer.test.front:tag.test.ghost"]');
    expect(ghost?.getAttribute("data-stage-fallback")).toBe("true");
    expect(ghost?.textContent).toBe("内容 content.test.ghost");
    expect(reportDiagnostic).toHaveBeenCalledWith({
      code: "stage.renderer_unregistered",
      entryKey: "layer.test.front:tag.test.ghost",
      rendererId: "renderer.test.unregistered",
    });
  });

  it("keeps DOM identity for replace-style content changes on the same tag", () => {
    const first = targetForMutationsV1([
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.alpha",
        contentId: "content.test.alpha",
      },
    ]);
    const second = targetForMutationsV1([
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.alpha",
        contentId: "content.test.beta",
      },
    ]);

    const { container, rerender } = render(
      <SemanticStageTargetHostV1
        target={first}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
      />,
    );
    const before = container.querySelector('[data-stage-key="layer.test.front:tag.test.alpha"]');
    rerender(
      <SemanticStageTargetHostV1
        target={second}
        renderers={{ "renderer.test.box": boxRendererV1 }}
        accessibleName="测试舞台"
      />,
    );
    const after = container.querySelector('[data-stage-key="layer.test.front:tag.test.alpha"]');
    expect(after).toBe(before);
    expect(after?.getAttribute("data-stage-content")).toBe("content.test.beta");
  });
});

describe("frame channel delivery (authorable frame set)", () => {
  const frameCatalogV1: StageContentCatalogV1 = {
    resolveContent: (contentId) =>
      Object.freeze({
        rendererId: "renderer.test.box",
        assetIds: Object.freeze([] as readonly AssetId[]),
        accessibleName: `内容 ${contentId}`,
        props: Object.freeze({}),
        ...(contentId === "content.test.plain" ? {} : {
          frameAssetIds: Object.freeze([
            "asset.test.frame-0" as AssetId,
            "asset.test.frame-1" as AssetId,
          ]),
        }),
      }),
  };

  function frameTargetV1(contentId: string) {
    const empty = createSemanticStageStateV1({
      stageId: "stage.test.frames",
      layerIds: ["layer.test.front"],
    });
    const outcome = reduceStageMutationsV1(empty, [
      { kind: "show", layerId: "layer.test.front", tag: "tag.test.actor", contentId },
    ]);
    if (outcome.kind !== "applied") throw new Error("frame fixture stage must apply");
    return projectStageRenderTargetV1(outcome.state, frameCatalogV1).target;
  }

  const frameRendererV1: SemanticStageEntryRendererV1 = ({ frameIndex }) => (
    <span data-test-frame={frameIndex === null ? "none" : String(frameIndex)} />
  );
  const frameRenderersV1 = { "renderer.test.box": frameRendererV1 };

  function ambientSampleV1(frameIndex: number | null): MotionSampleV1 {
    return Object.freeze({
      offsetX: 0,
      offsetY: 0,
      scalePermille: 1000,
      opacityPermille: 1000,
      frameIndex,
    });
  }

  it("delivers the ambient frame index to the renderer and the entry attribute", () => {
    const target = frameTargetV1("content.test.actor");
    const { container } = render(
      <SemanticStageHostV1
        frame={settledStageFrameV1(target)}
        renderers={frameRenderersV1}
        accessibleName="测试舞台"
        ambient={new Map([["layer.test.front:tag.test.actor", ambientSampleV1(1)]])}
      />,
    );
    const entry = container.querySelector('[data-stage-key="layer.test.front:tag.test.actor"]');
    expect(entry?.getAttribute("data-stage-frame")).toBe("1");
    expect(entry?.querySelector("[data-test-frame]")?.getAttribute("data-test-frame")).toBe("1");
  });

  it("clamps a sampled index beyond the declared frame set", () => {
    const target = frameTargetV1("content.test.actor");
    const { container } = render(
      <SemanticStageHostV1
        frame={settledStageFrameV1(target)}
        renderers={frameRenderersV1}
        accessibleName="测试舞台"
        ambient={new Map([["layer.test.front:tag.test.actor", ambientSampleV1(9)]])}
      />,
    );
    const entry = container.querySelector('[data-stage-key="layer.test.front:tag.test.actor"]');
    expect(entry?.getAttribute("data-stage-frame")).toBe("1");
  });

  it("reports null when the content declares no frame set", () => {
    const target = frameTargetV1("content.test.plain");
    const { container } = render(
      <SemanticStageHostV1
        frame={settledStageFrameV1(target)}
        renderers={frameRenderersV1}
        accessibleName="测试舞台"
        ambient={new Map([["layer.test.front:tag.test.actor", ambientSampleV1(1)]])}
      />,
    );
    const entry = container.querySelector('[data-stage-key="layer.test.front:tag.test.actor"]');
    expect(entry?.getAttribute("data-stage-frame")).toBeNull();
    expect(entry?.querySelector("[data-test-frame]")?.getAttribute("data-test-frame")).toBe(
      "none",
    );
  });

  it("delivers the in-flight one-shot motion frame", () => {
    // A word-float style one-shot: frame 0 until 500‰, then frame 1.
    const oneShot = parseMotionDefinitionV1({
      motionId: "motion.test.one-shot-frames",
      durationMs: 1000,
      delayMs: 0,
      tracks: [
        {
          channel: "frame",
          keyframes: [
            { atPermille: 0, value: 0 },
            { atPermille: 500, value: 1 },
            { atPermille: 1000, value: 1 },
          ],
        },
      ],
    });
    const target = frameTargetV1("content.test.actor");
    const settled = settledStageFrameV1(target);
    const inFlight = Object.freeze({
      ...settled,
      layers: settled.layers.map((layer) =>
        Object.freeze({
          ...layer,
          entries: Object.freeze(
            layer.entries.map((frameEntry) =>
              Object.freeze({
                ...frameEntry,
                phase: "entering" as const,
                transitionKind: "motion" as const,
                transitionId: null,
                progress: 0.75,
                motion: oneShot,
              })
            ),
          ),
        })
      ),
    });
    const { container } = render(
      <SemanticStageHostV1
        frame={inFlight}
        renderers={frameRenderersV1}
        accessibleName="测试舞台"
      />,
    );
    const entry = container.querySelector('[data-stage-key="layer.test.front:tag.test.actor"]');
    expect(entry?.getAttribute("data-stage-frame")).toBe("1");
    expect(entry?.querySelector("[data-test-frame]")?.getAttribute("data-test-frame")).toBe("1");
  });
});
