// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { startTransition, Suspense, useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AssetId,
  StageContentCatalogV1,
  StageTransitionCatalogV1,
  TimelineCatalogV1,
} from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  timelineV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { GameUiCueControllerV1 } from "../composer/create-game-ui-composition.ts";
import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.tsx";
import {
  type SemanticStageCompositionDriverInternalV1,
  SemanticStageCompositionClaimantProviderInternalV1,
  SemanticStageV1,
} from "./semantic-stage.tsx";

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
  resolveTransition: () => null,
};

const pulseCueV1 = timelineV1.define(
  "cue.test.pulse",
  timelineV1.sequence(
    timelineV1.event("event.test.chime"),
    timelineV1.tween({
      target: timelineV1.entry("layer.test.back", "tag.test.bg"),
      property: "offsetX",
      to: 100,
      durationMs: 100,
      easing: "linear",
    }),
  ),
);

const timelinesV1: TimelineCatalogV1 = {
  resolveTimeline: (cueId) => (cueId === "cue.test.pulse" ? pulseCueV1 : null),
};

function targetV1(contentId = "content.test.a") {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.timeline",
    layerIds: ["layer.test.back"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    { kind: "show", layerId: "layer.test.back", tag: "tag.test.bg", contentId },
  ]);
  if (outcome.kind !== "applied") throw new Error("timeline fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

function createRegistryV1() {
  let controller: GameUiCueControllerV1 | null = null;
  return {
    register(next: GameUiCueControllerV1 | null): void {
      controller = next;
    },
    play: (cueId: string): boolean => controller?.play(cueId) ?? false,
  };
}

afterEach(cleanup);

describe("SemanticStageV1 timeline integration", () => {
  it("keeps timeline and failure callbacks on the committed Stage during an abandoned successor", async () => {
    const originalMatchMedia = window.matchMedia;
    // deno-lint-ignore no-explicit-any
    (window as any).matchMedia = (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    try {
      const clock = createManualPresentationClockV1();
      const registry = createRegistryV1();
      const committedTimelineEvent = vi.fn();
      const successorTimelineEvent = vi.fn();
      const committedFailure = vi.fn();
      const successorFailure = vi.fn();
      const committedTimelines = {
        resolveTimeline: vi.fn((cueId: string) => cueId === "cue.test.pulse" ? pulseCueV1 : null),
      } satisfies TimelineCatalogV1;
      const successorCue = timelineV1.define(
        "cue.test.pulse",
        timelineV1.event("event.test.successor"),
      );
      const successorTimelines = {
        resolveTimeline: vi.fn((cueId: string) => cueId === "cue.test.pulse" ? successorCue : null),
      } satisfies TimelineCatalogV1;
      const transition = parseStageTransitionDefinitionV1({
        transitionId: "transition.test.missing-reduced-fallback",
        kind: "crossfade",
        durationMs: 100,
        easing: "linear",
        inputPolicy: "block",
        interruption: "settle_and_retarget",
        reducedMotion: {
          kind: "fallback",
          transitionId: "transition.test.missing-fallback",
        },
        readiness: { kind: "immediate" },
        acknowledge: false,
        slide: null,
      });
      const catalog: StageTransitionCatalogV1 = {
        resolveTransition: (change) => change.kind === "replace" ? transition : null,
        resolveTransitionById: () => null,
      };
      const committedRenderer = vi.fn(rendererV1);
      const successorRenderer = vi.fn(rendererV1);
      const claimant = Object.freeze({});
      const never = new Promise<void>(() => {});
      const suspendedRender = vi.fn();
      let driver: SemanticStageCompositionDriverInternalV1 | null = null;
      let attemptSuccessorRender: (() => void) | null = null;

      function SuspendSuccessorInternalV1(props: { readonly active: boolean }) {
        if (props.active) {
          suspendedRender();
          throw never;
        }
        return null;
      }

      function CurrentnessHarnessInternalV1() {
        const [successor, setSuccessor] = useState(false);
        useLayoutEffect(() => {
          attemptSuccessorRender = () => startTransition(() => setSuccessor(true));
          return () => {
            attemptSuccessorRender = null;
          };
        }, []);
        return (
          <Suspense fallback={null}>
            <SemanticStageCompositionClaimantProviderInternalV1
              claimant={claimant}
              onBindInternalV1={(_reconciler, nextDriver) => {
                driver = nextDriver;
                return () => {
                  driver = null;
                };
              }}
            >
              <SemanticStageV1
                target={targetV1()}
                revision={1}
                epoch={0}
                catalog={catalog}
                renderers={{
                  "renderer.test.box": successor ? successorRenderer : committedRenderer,
                }}
                accessibleName="时间线 currentness 舞台"
                clock={clock}
                timelines={successor ? successorTimelines : committedTimelines}
                cues={registry}
                onTimelineEvent={successor ? successorTimelineEvent : committedTimelineEvent}
                reportFailure={successor ? successorFailure : committedFailure}
              />
            </SemanticStageCompositionClaimantProviderInternalV1>
            <SuspendSuccessorInternalV1 active={successor} />
          </Suspense>
        );
      }

      const view = render(<CurrentnessHarnessInternalV1 />);
      expect(driver).not.toBeNull();
      expect(attemptSuccessorRender).not.toBeNull();
      act(() => attemptSuccessorRender!());
      await waitFor(() => {
        expect(suspendedRender).toHaveBeenCalled();
        expect(successorRenderer).toHaveBeenCalled();
      });

      let handled = false;
      act(() => {
        driver!.retargetInternalV1({
          target: targetV1("content.test.b"),
          revision: 2,
          epoch: 0,
        });
        handled = registry.play("cue.test.pulse");
      });

      expect(handled).toBe(true);
      expect(committedFailure).toHaveBeenCalledExactlyOnceWith(
        "stage.transition_fallback_missing",
        expect.stringContaining("transition.test.missing-fallback"),
      );
      expect(successorFailure).not.toHaveBeenCalled();
      expect(committedTimelines.resolveTimeline).toHaveBeenCalledExactlyOnceWith(
        "cue.test.pulse",
      );
      expect(successorTimelines.resolveTimeline).not.toHaveBeenCalled();
      expect(committedTimelineEvent).toHaveBeenCalledExactlyOnceWith("event.test.chime");
      expect(successorTimelineEvent).not.toHaveBeenCalled();

      view.unmount();
    } finally {
      // deno-lint-ignore no-explicit-any
      (window as any).matchMedia = originalMatchMedia;
    }
  });

  it("plays a cue: overlay applies, events fire once, and settling clears", () => {
    const clock = createManualPresentationClockV1();
    const registry = createRegistryV1();
    const onTimelineEvent = vi.fn();

    const { container, unmount } = render(
      <SemanticStageV1
        target={targetV1()}
        revision={1}
        epoch={0}
        catalog={transitionCatalogV1}
        renderers={{ "renderer.test.box": rendererV1 }}
        accessibleName="时间线舞台"
        clock={clock}
        timelines={timelinesV1}
        cues={registry}
        onTimelineEvent={onTimelineEvent}
      />,
    );

    const root = (): HTMLElement => {
      const element = container.querySelector("[data-semantic-stage]");
      if (!(element instanceof HTMLElement)) throw new Error("stage root missing");
      return element;
    };
    const entry = (): HTMLElement => {
      const element = container.querySelector('[data-stage-key="layer.test.back:tag.test.bg"]');
      if (!(element instanceof HTMLElement)) throw new Error("stage entry missing");
      return element;
    };

    expect(root().dataset.stageCue).toBeUndefined();

    let handled = false;
    act(() => {
      handled = registry.play("cue.test.pulse");
    });
    expect(handled).toBe(true);
    expect(root().dataset.stageCue).toBe("cue.test.pulse");
    expect(onTimelineEvent).toHaveBeenCalledExactlyOnceWith("event.test.chime");

    act(() => clock.advance(50));
    // Half way: the overlay shifts the settled placement by +50px.
    expect(entry().style.transform).toContain("translate3d(50px");

    act(() => {
      clock.advance(50);
      clock.advance(1);
    });
    // Finished: overlay cleared back to the settled rendering, cue probe gone.
    expect(entry().style.transform).toContain("translate3d(0px");
    expect(root().dataset.stageCue).toBeUndefined();
    expect(onTimelineEvent).toHaveBeenCalledTimes(1);

    // Unknown cues are reported unhandled.
    let unknownHandled = true;
    act(() => {
      unknownHandled = registry.play("cue.test.unknown");
    });
    expect(unknownHandled).toBe(false);

    unmount();
    // The unmount deregistered the controller.
    expect(registry.play("cue.test.pulse")).toBe(false);
  });

  it("a new cue cancels the previous one instead of stacking overlays", () => {
    const clock = createManualPresentationClockV1();
    const registry = createRegistryV1();
    const { container } = render(
      <SemanticStageV1
        target={targetV1()}
        revision={1}
        epoch={0}
        catalog={transitionCatalogV1}
        renderers={{ "renderer.test.box": rendererV1 }}
        accessibleName="时间线舞台"
        clock={clock}
        timelines={timelinesV1}
        cues={registry}
      />,
    );
    act(() => {
      registry.play("cue.test.pulse");
    });
    act(() => clock.advance(30));
    act(() => {
      registry.play("cue.test.pulse");
    });
    act(() => {
      clock.advance(100);
      clock.advance(1);
    });
    const root = container.querySelector("[data-semantic-stage]");
    expect(root instanceof HTMLElement && root.dataset.stageCue).toBeFalsy();
  });
});
