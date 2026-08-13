// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AssetId, StageContentCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createMotionSourceIndexV1 } from "./motion-sources.ts";
import {
  MotionWorkbenchLauncherV1,
  createMotionWorkbenchStoreV1,
} from "./motion-workbench-launcher.tsx";
import type { MotionWorkbenchPreviewV1 } from "./motion-workbench.tsx";
import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";

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
  resolveContent: () =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: "角色",
      props: Object.freeze({}),
    }),
};

function targetV1(x: number) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.launcher",
    layerIds: ["layer.test.chars"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    {
      kind: "show",
      layerId: "layer.test.chars",
      tag: "tag.test.actor",
      contentId: "content.test.actor",
      placement: { x, y: 0, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
    },
  ]);
  if (outcome.kind !== "applied") throw new Error("launcher fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

const sourcesV1 = createMotionSourceIndexV1(
  { "./motions/enter.motion.json": motionJsonV1 },
  { sourceRoot: "src" },
);

function previewV1(x: number): MotionWorkbenchPreviewV1 {
  return Object.freeze({
    target: targetV1(x),
    renderers: { "renderer.test.box": rendererV1 },
    entryKey: "layer.test.chars:tag.test.actor",
    canvas: { width: 960, height: 540 },
  });
}

function mainEntryTransformV1(container: HTMLElement): string {
  const entries = [
    ...container.querySelectorAll('[data-stage-key="layer.test.chars:tag.test.actor"]'),
  ].filter((entry) => entry.closest("[data-workbench-ghost]") === null);
  const [entry] = entries;
  if (!(entry instanceof HTMLElement)) throw new Error("launcher main entry missing");
  return entry.style.transform;
}

afterEach(cleanup);

describe("MotionWorkbenchLauncherV1", () => {
  it("opens preview cases and plain sources from the empty state", () => {
    const store = createMotionWorkbenchStoreV1();
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
        cases={[
          {
            caseId: "case.test.enter",
            label: "入场案例",
            motionId: "motion.test.enter",
            preview: previewV1(500),
          },
        ]}
      />,
    );

    const caseButton = container.querySelector('[data-motion-workbench-case="case.test.enter"]');
    if (!(caseButton instanceof HTMLElement)) throw new Error("case button missing");
    fireEvent.click(caseButton);

    // The case preview places the actor at x=500; t=0 holds offset 80 → 580.
    expect(
      container
        .querySelector("[data-motion-workbench-context]")
        ?.getAttribute("data-motion-workbench-context"),
    ).toBe("case.test.enter");
    expect(mainEntryTransformV1(container)).toContain("translate3d(580px");

    const close = container.querySelector("[data-motion-workbench-close]");
    if (!(close instanceof HTMLElement)) throw new Error("close missing");
    fireEvent.click(close);
    expect(container.querySelector('[data-motion-workbench-launcher="empty"]')).not.toBeNull();
  });

  it("prefers a live capture over the fallback preview", () => {
    const store = createMotionWorkbenchStoreV1();
    const source = sourcesV1.get("motion.test.enter");
    if (source === null) throw new Error("source missing");
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
      />,
    );

    act(() =>
      store.open(source, {
        target: targetV1(300),
        entryKey: "layer.test.chars:tag.test.actor",
      })
    );
    expect(
      container
        .querySelector("[data-motion-workbench-context]")
        ?.getAttribute("data-motion-workbench-context"),
    ).toBe("capture");
    // Captured placement x=300 + start offset 80.
    expect(mainEntryTransformV1(container)).toContain("translate3d(380px");

    // Without a capture the fallback context renders (x=100 + 80).
    act(() => store.open(source));
    expect(mainEntryTransformV1(container)).toContain("translate3d(180px");
  });
});
