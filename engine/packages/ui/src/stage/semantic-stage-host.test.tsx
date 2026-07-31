// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StageContentCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.tsx";
import { SemanticStageTargetHostV1 } from "./semantic-stage-host.tsx";

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
