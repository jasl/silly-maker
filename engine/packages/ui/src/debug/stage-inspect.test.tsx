// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AssetId, StageContentCatalogV1, StageTransitionCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  motionStageTransitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";
import { SemanticStageV1 } from "../stage/semantic-stage.tsx";
import { createMotionSourceIndexV1 } from "./motion-sources.ts";
import { createStageInspectControllerV1 } from "./stage-inspect.ts";
import { StageProvenancePanelV1 } from "./stage-provenance-panel.tsx";

const motionJsonV1 = {
  format: "sillymaker.motion",
  version: 1,
  motionId: "motion.test.enter",
  label: "登场",
  durationMs: 200,
  delayMs: 0,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [
        { atPermille: 0, value: 80 },
        { atPermille: 1000, value: 0 },
      ],
    },
  ],
} as const;

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({}),
    }),
};

const transitionCatalogV1: StageTransitionCatalogV1 = {
  resolveTransition: (change) =>
    change.kind === "enter"
      ? motionStageTransitionV1({ transitionId: "transition.test.enter", motion: motionJsonV1 })
      : null,
};

function targetV1(mutations: readonly unknown[]) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.inspect",
    layerIds: ["layer.test.back"],
  });
  const outcome = reduceStageMutationsV1(empty, mutations);
  if (outcome.kind !== "applied") throw new Error("inspect fixture stage must apply");
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

afterEach(cleanup);

describe("createStageInspectControllerV1", () => {
  it("records provenance from mounted frames and keeps the last identity after settle", () => {
    const clock = createManualPresentationClockV1();
    const inspect = createStageInspectControllerV1();
    const shared = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "检视舞台",
      clock,
      inspect,
    } as const;
    const { rerender } = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...shared} />,
    );
    act(() => {
      rerender(<SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...shared} />);
    });

    const entering = inspect.observe().entries;
    expect(entering).toHaveLength(1);
    expect(entering[0]?.phase).toBe("entering");
    expect(entering[0]?.transitionId).toBe("transition.test.enter");
    expect(entering[0]?.motionId).toBe("motion.test.enter");

    act(() => {
      clock.advance(200);
      clock.advance(1);
    });
    const settled = inspect.observe().entries;
    expect(settled[0]?.phase).toBe("settled");
    expect(settled[0]?.transitionId).toBeNull();
    // Reverse lookup survives settlement through the last-identity memory.
    expect(settled[0]?.lastTransitionId).toBe("transition.test.enter");
    expect(settled[0]?.lastMotionId).toBe("motion.test.enter");
  });

  it("captures the live rendering as a detached settled target", () => {
    const clock = createManualPresentationClockV1();
    const inspect = createStageInspectControllerV1();
    const shared = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "检视舞台",
      clock,
      inspect,
    } as const;
    const { rerender } = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...shared} />,
    );
    expect(inspect.capture()).not.toBeNull();

    act(() => {
      rerender(<SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...shared} />);
    });
    act(() => inspect.select("layer.test.back:tag.test.actor"));

    const capture = inspect.capture();
    if (capture === null) throw new Error("capture missing");
    expect(capture.entryKey).toBe("layer.test.back:tag.test.actor");
    expect(capture.target.stageId).toBe("stage.test.inspect");
    const layer = capture.target.layers.find((candidate) =>
      candidate.layerId === "layer.test.back"
    );
    expect(layer?.entries.map((entry) => entry.key)).toEqual(["layer.test.back:tag.test.actor"]);
    // The captured target matches the settled projection of the same state.
    expect(layer?.entries[0]?.contentId).toBe("content.test.actor");
  });

  it("enables click-to-inspect surfaces that select entries and never render otherwise", () => {
    const clock = createManualPresentationClockV1();
    const inspect = createStageInspectControllerV1();
    const shared = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "检视舞台",
      clock,
      inspect,
    } as const;
    const { container, rerender } = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...shared} />,
    );
    act(() => {
      rerender(<SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...shared} />);
    });
    expect(container.querySelector("[data-stage-inspect-hit]")).toBeNull();

    act(() => inspect.setEnabled(true));
    const hit = container.querySelector(
      '[data-stage-inspect-hit="layer.test.back:tag.test.actor"]',
    );
    if (!(hit instanceof HTMLElement)) throw new Error("inspect hit surface missing");
    fireEvent.click(hit);
    expect(inspect.observe().selectedKey).toBe("layer.test.back:tag.test.actor");

    act(() => inspect.setEnabled(false));
    expect(container.querySelector("[data-stage-inspect-hit]")).toBeNull();
  });
});

describe("createMotionSourceIndexV1", () => {
  it("maps motion ids to project-relative source paths", () => {
    const index = createMotionSourceIndexV1(
      { "./motions/enter.motion.json": motionJsonV1 },
      { sourceRoot: "src" },
    );
    expect(index.get("motion.test.enter")?.path).toBe("src/motions/enter.motion.json");
    expect(index.get("motion.test.other")).toBeNull();
    expect(index.list()).toHaveLength(1);
  });

  it("rejects duplicate motion ids across files", () => {
    expect(() =>
      createMotionSourceIndexV1({
        "./a.motion.json": motionJsonV1,
        "./b.motion.json": motionJsonV1,
      })
    ).toThrow(/motion_source_duplicate/u);
  });
});

describe("StageProvenancePanelV1", () => {
  it("lists entries, shows provenance details, and opens the motion source", async () => {
    const clock = createManualPresentationClockV1();
    const inspect = createStageInspectControllerV1();
    const stageShared = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "检视舞台",
      clock,
      inspect,
    } as const;
    const stage = render(
      <SemanticStageV1 target={emptyTargetV1()} revision={1} epoch={0} {...stageShared} />,
    );
    act(() => {
      stage.rerender(
        <SemanticStageV1 target={shownTargetV1()} revision={2} epoch={0} {...stageShared} />,
      );
    });

    const opened: string[] = [];
    const panel = render(
      <StageProvenancePanelV1
        controller={inspect}
        motionSources={createMotionSourceIndexV1(
          { "./motions/enter.motion.json": motionJsonV1 },
          { sourceRoot: "src" },
        )}
        openSource={(path) => {
          opened.push(path);
          return Promise.resolve(true);
        }}
      />,
    );

    const toggle = panel.container.querySelector("[data-stage-inspect-toggle]");
    if (!(toggle instanceof HTMLElement)) throw new Error("toggle missing");
    expect(toggle.textContent).toBe("开始点击检视");
    expect(panel.container.textContent).toContain("点舞台上的角色或背景");
    fireEvent.click(toggle);
    expect(inspect.observe().enabled).toBe(true);

    const row = panel.container.querySelector(
      '[data-stage-provenance-entry="layer.test.back:tag.test.actor"]',
    );
    if (!(row instanceof HTMLElement)) throw new Error("entry row missing");
    fireEvent.click(row);

    const field = (name: string): string =>
      panel.container.querySelector(`[data-stage-provenance-field="${name}"]`)?.textContent ?? "";
    expect(field("transition")).toBe("transition.test.enter");
    expect(field("motion")).toBe("motion.test.enter");
    expect(field("source")).toBe("src/motions/enter.motion.json");

    const open = panel.container.querySelector("[data-stage-provenance-open]");
    if (!(open instanceof HTMLElement)) throw new Error("open source button missing");
    await act(async () => {
      fireEvent.click(open);
      await Promise.resolve();
    });
    expect(opened).toEqual(["src/motions/enter.motion.json"]);
  });
});
