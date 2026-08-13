// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AssetId, StageContentCatalogV1, StageTransitionCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  motionStageTransitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.tsx";
import { SemanticStageV1 } from "./semantic-stage.tsx";

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({}),
    }),
};

// Entrance: hold invisible 120px right for 100ms, then ease back and fade
// in over 300ms — the sampled overlay composes over the settled placement.
const enterTransitionV1 = motionStageTransitionV1({
  transitionId: "transition.test.motion-enter",
  motion: {
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.enter",
    label: "登场",
    durationMs: 300,
    delayMs: 100,
    tracks: [
      {
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 120, easing: "ease_out_cubic" },
          { atPermille: 1000, value: 0 },
        ],
      },
      {
        channel: "opacityPermille",
        keyframes: [
          { atPermille: 0, value: 0 },
          { atPermille: 500, value: 1000 },
          { atPermille: 1000, value: 1000 },
        ],
      },
    ],
  },
});

// Exit: the motion owns the whole envelope, including the fade-out.
const exitTransitionV1 = motionStageTransitionV1({
  transitionId: "transition.test.motion-exit",
  motion: {
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.exit",
    label: "退场",
    durationMs: 200,
    delayMs: 0,
    tracks: [
      {
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 0 },
          { atPermille: 1000, value: 100 },
        ],
      },
      {
        channel: "opacityPermille",
        keyframes: [
          { atPermille: 0, value: 1000 },
          { atPermille: 1000, value: 0 },
        ],
      },
    ],
  },
});

const transitionCatalogV1: StageTransitionCatalogV1 = {
  resolveTransition: (change) => {
    if (change.kind === "enter") return enterTransitionV1;
    if (change.kind === "exit") return exitTransitionV1;
    return null;
  },
};

function targetV1(mutations: readonly unknown[]) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.motion",
    layerIds: ["layer.test.back"],
  });
  const outcome = reduceStageMutationsV1(empty, mutations);
  if (outcome.kind !== "applied") throw new Error("motion fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const emptyTargetV1 = () => targetV1([]);
const shownTargetV1 = () =>
  targetV1([
    {
      kind: "show",
      layerId: "layer.test.back",
      tag: "tag.test.actor",
      contentId: "content.test.actor",
    },
  ]);

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

function stagePropsV1(clock: ReturnType<typeof createManualPresentationClockV1>) {
  return {
    catalog: transitionCatalogV1,
    renderers: { "renderer.test.box": rendererV1 },
    accessibleName: "Motion 舞台",
    clock,
  } as const;
}

afterEach(cleanup);

describe("SemanticStageV1 motion transitions", () => {
  it("an entrance motion holds its delay, eases keyframes, and settles to identity", () => {
    const clock = createManualPresentationClockV1();
    const shared = stagePropsV1(clock);
    const { container, rerender } = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...shared} />,
    );
    const entry = (): HTMLElement => {
      const element = container.querySelector(
        '[data-stage-key="layer.test.back:tag.test.actor"]',
      );
      if (!(element instanceof HTMLElement)) throw new Error("stage entry missing");
      return element;
    };
    const root = (): HTMLElement => {
      const element = container.querySelector("[data-semantic-stage]");
      if (!(element instanceof HTMLElement)) throw new Error("stage root missing");
      return element;
    };

    act(() => {
      rerender(<SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...shared} />);
    });

    // Delay hold: the entry sits at the first keyframes (120px right, invisible).
    expect(entry().dataset.stagePhase).toBe("entering");
    expect(entry().style.transform).toContain("translate3d(120px");
    expect(entry().style.opacity).toBe("0");
    expect(root().dataset.stageSettled).toBe("false");

    act(() => clock.advance(99));
    expect(entry().style.transform).toContain("translate3d(120px");
    expect(entry().style.opacity).toBe("0");

    // Midpoint of the animated span: ease_out_cubic has covered 87.5% of the
    // travel (120 -> 15) and the opacity ramp finished at its 500‰ keyframe.
    act(() => clock.advance(151));
    expect(entry().style.transform).toContain("translate3d(15px");
    expect(entry().style.opacity).toBe("");

    // Completion clears the overlay back to the settled placement identity.
    act(() => {
      clock.advance(150);
      clock.advance(1);
    });
    expect(entry().dataset.stagePhase).toBe("settled");
    expect(entry().style.transform).toContain("translate3d(0px");
    expect(entry().style.opacity).toBe("");
    expect(root().dataset.stageSettled).toBe("true");
  });

  it("an exit motion owns the ghost's travel and fade envelope", () => {
    const clock = createManualPresentationClockV1();
    const shared = stagePropsV1(clock);
    const { container, rerender } = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...shared} />,
    );
    act(() => {
      rerender(<SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...shared} />);
    });
    act(() => {
      clock.advance(400);
      clock.advance(1);
    });

    act(() => {
      rerender(<SemanticStageV1 target={emptyTargetV1()} revision={3} epoch={0} {...shared} />);
    });
    const ghost = container.querySelector(
      '[data-stage-exiting-key="layer.test.back:tag.test.actor"]',
    );
    expect(ghost instanceof HTMLElement).toBe(true);

    act(() => clock.advance(100));
    const midGhost = container.querySelector(
      '[data-stage-exiting-key="layer.test.back:tag.test.actor"]',
    );
    if (!(midGhost instanceof HTMLElement)) throw new Error("exit ghost missing mid-flight");
    expect(midGhost.style.transform).toContain("translate3d(50px");
    expect(midGhost.style.opacity).toBe("0.5");

    act(() => {
      clock.advance(100);
      clock.advance(1);
    });
    expect(
      container.querySelector('[data-stage-exiting-key="layer.test.back:tag.test.actor"]'),
    ).toBeNull();
  });
});
