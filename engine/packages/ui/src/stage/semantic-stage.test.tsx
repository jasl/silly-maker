// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssetId, StageContentCatalogV1, StageTransitionCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.js";
import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.js";
import { SemanticStageV1 } from "./semantic-stage.js";

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({}),
    }),
};

const crossfadeV1 = parseStageTransitionDefinitionV1({
  transitionId: "transition.test.fade",
  kind: "crossfade",
  durationMs: 100,
  easing: "linear",
  inputPolicy: "block",
  interruption: "settle_and_retarget",
  reducedMotion: { kind: "settle" },
  readiness: { kind: "immediate" },
  acknowledge: true,
  slide: null,
});

const transitionCatalogV1: StageTransitionCatalogV1 = {
  resolveTransition: (change) => (change.kind === "replace" ? crossfadeV1 : null),
};

function targetWithContentV1(contentId: string) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.component",
    layerIds: ["layer.test.back"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    { kind: "show", layerId: "layer.test.back", tag: "tag.test.bg", contentId },
  ]);
  if (outcome.kind !== "applied") throw new Error("component fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

afterEach(cleanup);

describe("SemanticStageV1", () => {
  it("plays committed edges, acknowledges, and disposes cleanly on unmount", async () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const stageProps = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "组件舞台",
      clock,
      onAcknowledgment,
    };

    const { container, rerender, unmount } = render(
      <SemanticStageV1
        {...stageProps}
        target={targetWithContentV1("content.test.a")}
        revision={1}
        epoch={0}
      />,
    );
    const root = () => container.querySelector("[data-semantic-stage]");
    await act(async () => {});
    expect(root()?.getAttribute("data-stage-settled")).toBe("true");

    // A committed replace starts a crossfade: ghost retained, gate blocked.
    rerender(
      <SemanticStageV1
        {...stageProps}
        target={targetWithContentV1("content.test.b")}
        revision={2}
        epoch={0}
      />,
    );
    await act(async () => {});
    expect(root()?.getAttribute("data-stage-settled")).toBe("false");
    expect(root()?.getAttribute("data-stage-input-blocked")).toBe("true");
    expect(container.querySelector("[data-stage-exiting]")).not.toBeNull();
    expect(
      container
        .querySelector('[data-stage-key="layer.test.back:tag.test.bg"]')
        ?.getAttribute("data-stage-content"),
    ).toBe("content.test.b");

    await act(async () => {
      clock.advance(100);
    });
    expect(root()?.getAttribute("data-stage-settled")).toBe("true");
    expect(container.querySelector("[data-stage-exiting]")).toBeNull();
    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ transitionId: "transition.test.fade", outcome: "completed" }),
    );

    // Re-render with the same revision: commit-only, nothing replays.
    rerender(
      <SemanticStageV1
        {...stageProps}
        target={targetWithContentV1("content.test.b")}
        revision={2}
        epoch={0}
      />,
    );
    await act(async () => {});
    expect(root()?.getAttribute("data-stage-settled")).toBe("true");

    unmount();
    expect(clock.pendingTickCount()).toBe(0);
  });

  it("suppresses edges across epoch changes (load restores a stable target)", async () => {
    const clock = createManualPresentationClockV1();
    const stageProps = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "组件舞台",
      clock,
    };
    const { container, rerender } = render(
      <SemanticStageV1
        {...stageProps}
        target={targetWithContentV1("content.test.a")}
        revision={5}
        epoch={0}
      />,
    );
    await act(async () => {});

    rerender(
      <SemanticStageV1
        {...stageProps}
        target={targetWithContentV1("content.test.b")}
        revision={6}
        epoch={1}
      />,
    );
    await act(async () => {});
    const root = container.querySelector("[data-semantic-stage]");
    expect(root?.getAttribute("data-stage-settled")).toBe("true");
    expect(container.querySelector("[data-stage-exiting]")).toBeNull();
  });
});
