// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type {
  AssetId,
  StageContentCatalogV1,
  StageTransitionCatalogV1,
  TimelineCatalogV1,
} from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  timelineV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { GameUiCueControllerV1 } from "../composer/create-game-ui-composition.ts";
import { SemanticStageV1 } from "./semantic-stage.tsx";

// The regression that escaped to the browser suite: under reduced motion a
// cue finishes synchronously inside play(), which must not touch the
// still-uninitialized run handle and must not leave a stale active-cue probe.
it("reduced motion plays a cue synchronously without raising", () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

  try {
    const contentCatalog: StageContentCatalogV1 = {
      resolveContent: () =>
        Object.freeze({
          rendererId: "renderer.test.box",
          assetIds: Object.freeze([] as readonly AssetId[]),
          accessibleName: "内容",
          props: Object.freeze({}),
        }),
    };
    const transitionCatalog: StageTransitionCatalogV1 = { resolveTransition: () => null };
    const empty = createSemanticStageStateV1({
      stageId: "stage.test.reduced",
      layerIds: ["layer.test.back"],
    });
    const outcome = reduceStageMutationsV1(empty, [
      { kind: "show", layerId: "layer.test.back", tag: "tag.test.bg", contentId: "content.a" },
    ]);
    if (outcome.kind !== "applied") throw new Error("fixture must apply");
    const target = projectStageRenderTargetV1(outcome.state, contentCatalog).target;

    const cue = timelineV1.define(
      "cue.test.pulse",
      timelineV1.sequence(
        timelineV1.event("event.test.chime"),
        timelineV1.tween({
          target: timelineV1.entry("layer.test.back", "tag.test.bg"),
          property: "offsetX",
          to: 50,
          durationMs: 100,
          easing: "linear",
        }),
      ),
    );
    const timelines: TimelineCatalogV1 = {
      resolveTimeline: (cueId) => (cueId === "cue.test.pulse" ? cue : null),
    };
    let controller: GameUiCueControllerV1 | null = null;
    const registry = {
      register(next: GameUiCueControllerV1 | null): void {
        controller = next;
      },
    };
    const onTimelineEvent = vi.fn();

    const { container } = render(
      <SemanticStageV1
        target={target}
        revision={1}
        epoch={0}
        catalog={transitionCatalog}
        renderers={{}}
        accessibleName="降级舞台"
        clock={createManualPresentationClockV1()}
        timelines={timelines}
        cues={registry}
        onTimelineEvent={onTimelineEvent}
      />,
    );

    let handled = false;
    act(() => {
      handled = controller?.play("cue.test.pulse") ?? false;
    });
    expect(handled).toBe(true);
    expect(onTimelineEvent).toHaveBeenCalledExactlyOnceWith("event.test.chime");
    const root = container.querySelector("[data-semantic-stage]");
    expect(root instanceof HTMLElement && root.dataset.stageCue).toBeFalsy();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

afterEach(cleanup);
