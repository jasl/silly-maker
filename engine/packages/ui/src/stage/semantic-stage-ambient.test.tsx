// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
// Presence-bound ambient loops (ambient-loop-motion, accepted 2026-08-15):
// settled entries sample their loop on the presentation clock, edges
// suspend and restart the phase, freeze holds it, reduced motion settles
// it — all purely presentational.
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { startTransition, Suspense, useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AssetId,
  StageAmbientCatalogV1,
  StageContentCatalogV1,
  StageTransitionCatalogV1,
} from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  motionStageTransitionV1,
  parseMotionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
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

// A 400ms breathing loop: drift right to 40px at the midpoint and back.
const breatheMotionV1 = parseMotionDefinitionV1({
  motionId: "motion.test.breathe",
  durationMs: 400,
  delayMs: 0,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [
        { atPermille: 0, value: 0 },
        { atPermille: 500, value: 40 },
        { atPermille: 1000, value: 0 },
      ],
    },
  ],
});

// A 400ms linear probe whose X offset equals the sampled millisecond.
const phaseProbeMotionV1 = parseMotionDefinitionV1({
  motionId: "motion.test.phase-probe",
  durationMs: 400,
  delayMs: 0,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [
        { atPermille: 0, value: 0 },
        { atPermille: 1000, value: 400 },
      ],
    },
  ],
});

function ambientCatalogV1(phaseMsByTag?: Readonly<Record<string, number>>): StageAmbientCatalogV1 {
  return {
    resolveAmbient: (_layerId, entry) =>
      Object.freeze({
        motion: breatheMotionV1,
        phaseMs: phaseMsByTag?.[entry.tag as string] ?? 0,
      }),
  };
}

const cutCatalogV1: StageTransitionCatalogV1 = { resolveTransition: () => null };

// A 300ms entrance so suspension and phase restart are observable.
const enterCatalogV1: StageTransitionCatalogV1 = {
  resolveTransition: (change) =>
    change.kind === "enter"
      ? motionStageTransitionV1({
        transitionId: "transition.test.enter",
        motion: {
          format: "sillymaker.motion",
          version: 1,
          motionId: "motion.test.enter",
          label: "登场",
          durationMs: 300,
          delayMs: 0,
          tracks: [
            {
              channel: "offsetX",
              keyframes: [
                { atPermille: 0, value: 120 },
                { atPermille: 1000, value: 0 },
              ],
            },
          ],
        },
      })
      : null,
};

function targetV1(tags: readonly string[]) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.ambient",
    layerIds: ["layer.test.back"],
  });
  const outcome = reduceStageMutationsV1(
    empty,
    tags.map((tag) => ({
      kind: "show",
      layerId: "layer.test.back",
      tag,
      contentId: "content.test.actor",
    })),
  );
  if (outcome.kind !== "applied") throw new Error("ambient fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);
const renderersV1 = { "renderer.test.box": rendererV1 };

function entryOf(container: HTMLElement, tag: string): HTMLElement {
  const element = container.querySelector(`[data-stage-key="layer.test.back:${tag}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`stage entry ${tag} missing`);
  return element;
}

afterEach(cleanup);

describe("SemanticStageV1 ambient loops", () => {
  it("starts a first ambient phase at commit after its earlier render was suspended", async () => {
    const clock = createManualPresentationClockV1();
    let releaseSuspension!: () => void;
    let suspensionReleased = false;
    const suspension = new Promise<void>((resolve) => {
      releaseSuspension = () => {
        suspensionReleased = true;
        resolve();
      };
    });
    const suspendedRender = vi.fn();
    const ambient = ambientCatalogV1();
    const resolveAmbient = vi.spyOn(ambient, "resolveAmbient");
    let enableAmbient: (() => void) | null = null;

    function SuspendFirstAmbientInternalV1(props: { readonly active: boolean }) {
      if (props.active && !suspensionReleased) {
        suspendedRender();
        throw suspension;
      }
      return null;
    }

    function AmbientCommitHarnessInternalV1() {
      const [enabled, setEnabled] = useState(false);
      useLayoutEffect(() => {
        enableAmbient = () => startTransition(() => setEnabled(true));
        return () => {
          enableAmbient = null;
        };
      }, []);
      return (
        <Suspense fallback={null}>
          <SemanticStageV1
            target={targetV1(["tag.test.actor"])}
            revision={1}
            epoch={0}
            catalog={cutCatalogV1}
            {...(enabled ? { ambient } : {})}
            renderers={renderersV1}
            accessibleName="Ambient commit 舞台"
            clock={clock}
          />
          <SuspendFirstAmbientInternalV1 active={enabled} />
        </Suspense>
      );
    }

    const view = render(<AmbientCommitHarnessInternalV1 />);
    const entry = () => entryOf(view.container, "tag.test.actor");
    expect(entry().dataset.stageAmbient).toBeUndefined();
    expect(enableAmbient).not.toBeNull();

    act(() => enableAmbient!());
    await waitFor(() => {
      expect(suspendedRender).toHaveBeenCalled();
      expect(resolveAmbient).toHaveBeenCalled();
    });
    act(() => clock.advance(100));
    await act(async () => {
      releaseSuspension();
      await suspension;
    });
    await waitFor(() => expect(entry().dataset.stageAmbient).toBe("true"));

    expect(entry().style.transform).toContain("translate3d(0px");
    view.unmount();
  });

  it("samples the loop on the presentation clock, wraps the phase, and keeps the stage settled", () => {
    const clock = createManualPresentationClockV1();
    const { container, rerender } = render(
      <SemanticStageV1
        target={targetV1([])}
        revision={1}
        epoch={0}
        catalog={cutCatalogV1}
        ambient={ambientCatalogV1()}
        renderers={renderersV1}
        accessibleName="Ambient 舞台"
        clock={clock}
      />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1(["tag.test.actor"])}
          revision={2}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambientCatalogV1()}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={clock}
        />,
      );
    });

    const entry = () => entryOf(container, "tag.test.actor");
    const root = container.querySelector("[data-semantic-stage]") as HTMLElement;

    // Settled instantly (no enter transition); the loop starts at phase 0
    // and the settled data signal stays true while it runs forever.
    expect(entry().dataset.stageAmbient).toBe("true");
    expect(entry().style.transform).toContain("translate3d(0px");
    expect(root.dataset.stageSettled).toBe("true");

    act(() => clock.advance(100));
    expect(entry().style.transform).toContain("translate3d(20px");
    act(() => clock.advance(100));
    expect(entry().style.transform).toContain("translate3d(40px");
    // Wrap: 400ms elapsed is phase 0 again; 500ms is 100ms into cycle two.
    act(() => clock.advance(200));
    expect(entry().style.transform).toContain("translate3d(0px");
    act(() => clock.advance(100));
    expect(entry().style.transform).toContain("translate3d(20px");
    expect(root.dataset.stageSettled).toBe("true");

    // Removing the entry stops the perpetual ticker.
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1([])}
          revision={3}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambientCatalogV1()}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={clock}
        />,
      );
    });
    expect(clock.pendingTickCount()).toBe(0);
  });

  it("swaps the ambient frame index stepwise on the presentation clock", () => {
    // A 400ms blink: open eyes (0), closed at 900‰ (360ms), open at 950‰.
    const blinkMotionV1 = parseMotionDefinitionV1({
      motionId: "motion.test.blink",
      durationMs: 400,
      delayMs: 0,
      tracks: [
        {
          channel: "frame",
          keyframes: [
            { atPermille: 0, value: 0 },
            { atPermille: 900, value: 1 },
            { atPermille: 950, value: 0 },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    });
    const frameContentCatalog: StageContentCatalogV1 = {
      resolveContent: (contentId) =>
        Object.freeze({
          rendererId: "renderer.test.box",
          assetIds: Object.freeze([] as readonly AssetId[]),
          accessibleName: `内容 ${contentId}`,
          props: Object.freeze({}),
          frameAssetIds: Object.freeze([
            "asset.test.eyes-open" as AssetId,
            "asset.test.eyes-closed" as AssetId,
          ]),
        }),
    };
    const blinkAmbient: StageAmbientCatalogV1 = {
      resolveAmbient: () => Object.freeze({ motion: blinkMotionV1, phaseMs: 0 }),
    };
    function blinkTargetV1(tags: readonly string[]) {
      const empty = createSemanticStageStateV1({
        stageId: "stage.test.ambient",
        layerIds: ["layer.test.back"],
      });
      const outcome = reduceStageMutationsV1(
        empty,
        tags.map((tag) => ({
          kind: "show",
          layerId: "layer.test.back",
          tag,
          contentId: "content.test.actor",
        })),
      );
      if (outcome.kind !== "applied") throw new Error("ambient fixture stage must apply");
      return projectStageRenderTargetV1(outcome.state, frameContentCatalog).target;
    }

    const clock = createManualPresentationClockV1();
    const shared = {
      catalog: cutCatalogV1,
      ambient: blinkAmbient,
      renderers: renderersV1,
      accessibleName: "Ambient 舞台",
      clock,
    } as const;
    const { container, rerender } = render(
      <SemanticStageV1 target={blinkTargetV1([])} revision={1} epoch={0} {...shared} />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={blinkTargetV1(["tag.test.actor"])}
          revision={2}
          epoch={0}
          {...shared}
        />,
      );
    });

    const entry = () => entryOf(container, "tag.test.actor");
    // Open eyes through the long hold — no interpolation midway.
    expect(entry().dataset.stageFrame).toBe("0");
    act(() => clock.advance(200));
    expect(entry().dataset.stageFrame).toBe("0");
    // Cross the 900‰ stop: closed-eye frame appears and holds.
    act(() => clock.advance(165));
    expect(entry().dataset.stageFrame).toBe("1");
    // Cross 950‰: back to open eyes; the loop wraps seamlessly after 400ms.
    act(() => clock.advance(20));
    expect(entry().dataset.stageFrame).toBe("0");
    act(() => clock.advance(400));
    expect(entry().dataset.stageFrame).toBe("0");
  });

  it("suspends during an entrance edge and restarts the phase at settle", () => {
    const clock = createManualPresentationClockV1();
    const shared = {
      catalog: enterCatalogV1,
      ambient: ambientCatalogV1(),
      renderers: renderersV1,
      accessibleName: "Ambient 舞台",
      clock,
    } as const;
    const { container, rerender } = render(
      <SemanticStageV1 target={targetV1([])} revision={1} epoch={0} {...shared} />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1(["tag.test.actor"])}
          revision={2}
          epoch={0}
          {...shared}
        />,
      );
    });

    const entry = () => entryOf(container, "tag.test.actor");
    // In flight: the transition owns the pose; no ambient contribution.
    expect(entry().dataset.stagePhase).toBe("entering");
    expect(entry().dataset.stageAmbient).toBeUndefined();
    act(() => clock.advance(150));
    expect(entry().style.transform).toContain("translate3d(60px");

    // Settle at t=301; the loop phase starts here, not at mount time.
    act(() => {
      clock.advance(150);
      clock.advance(1);
    });
    expect(entry().dataset.stagePhase).toBe("settled");
    expect(entry().dataset.stageAmbient).toBe("true");
    expect(entry().style.transform).toContain("translate3d(0px");
    act(() => clock.advance(100));
    expect(entry().style.transform).toContain("translate3d(20px");
  });

  it("holds the pose under presentation freeze and resumes phase-continuously", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const { container, rerender } = render(
      <SemanticStageV1
        target={targetV1([])}
        revision={1}
        epoch={0}
        catalog={cutCatalogV1}
        ambient={ambientCatalogV1()}
        renderers={renderersV1}
        accessibleName="Ambient 舞台"
        clock={freeze.clock}
      />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1(["tag.test.actor"])}
          revision={2}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambientCatalogV1()}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={freeze.clock}
        />,
      );
    });
    const entry = () => entryOf(container, "tag.test.actor");

    act(() => inner.advance(100));
    expect(entry().style.transform).toContain("translate3d(20px");

    // Frozen: inner time passes, the sampled pose does not move.
    act(() => freeze.pause());
    act(() => inner.advance(200));
    expect(entry().style.transform).toContain("translate3d(20px");

    // Resumed: the frozen 200ms is offset away — the next 100ms lands the
    // loop at phase 200 (peak), not at phase 400 (a wrap to identity).
    act(() => freeze.resume());
    act(() => inner.advance(100));
    expect(entry().style.transform).toContain("translate3d(40px");
  });

  it("settles the loops under reduced motion and requests no ticks", () => {
    const originalMatchMedia = window.matchMedia;
    // deno-lint-ignore no-explicit-any
    (window as any).matchMedia = (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    try {
      const clock = createManualPresentationClockV1();
      const { container, rerender } = render(
        <SemanticStageV1
          target={targetV1([])}
          revision={1}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambientCatalogV1()}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={clock}
        />,
      );
      act(() => {
        rerender(
          <SemanticStageV1
            target={targetV1(["tag.test.actor"])}
            revision={2}
            epoch={0}
            catalog={cutCatalogV1}
            ambient={ambientCatalogV1()}
            renderers={renderersV1}
            accessibleName="Ambient 舞台"
            clock={clock}
          />,
        );
      });
      const entry = entryOf(container, "tag.test.actor");
      expect(entry.dataset.stageAmbient).toBeUndefined();
      expect(entry.style.transform).toContain("translate3d(0px");
      expect(clock.pendingTickCount()).toBe(0);
    } finally {
      // deno-lint-ignore no-explicit-any
      (window as any).matchMedia = originalMatchMedia;
    }
  });

  it("phaseMs offsets entries sharing one loop document", () => {
    const clock = createManualPresentationClockV1();
    const ambient = ambientCatalogV1({ "tag.test.actor": 0, "tag.test.cloud": 100 });
    const { container, rerender } = render(
      <SemanticStageV1
        target={targetV1([])}
        revision={1}
        epoch={0}
        catalog={cutCatalogV1}
        ambient={ambient}
        renderers={renderersV1}
        accessibleName="Ambient 舞台"
        clock={clock}
      />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1(["tag.test.actor", "tag.test.cloud"])}
          revision={2}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambient}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={clock}
        />,
      );
    });

    // Both settle at the same instant (a scene open); the explicit offset
    // desynchronizes them anyway.
    act(() => clock.advance(100));
    expect(entryOf(container, "tag.test.actor").style.transform).toContain("translate3d(20px");
    expect(entryOf(container, "tag.test.cloud").style.transform).toContain("translate3d(40px");
  });

  it("composes a maximum safe phase without overflowing the loop addition", () => {
    const clock = createManualPresentationClockV1();
    const ambient: StageAmbientCatalogV1 = {
      resolveAmbient: () => ({
        motion: phaseProbeMotionV1,
        phaseMs: Number.MAX_SAFE_INTEGER,
      }),
    };
    const { container, rerender } = render(
      <SemanticStageV1
        target={targetV1([])}
        revision={1}
        epoch={0}
        catalog={cutCatalogV1}
        ambient={ambient}
        renderers={renderersV1}
        accessibleName="Ambient 舞台"
        clock={clock}
      />,
    );
    act(() => {
      rerender(
        <SemanticStageV1
          target={targetV1(["tag.test.actor"])}
          revision={2}
          epoch={0}
          catalog={cutCatalogV1}
          ambient={ambient}
          renderers={renderersV1}
          accessibleName="Ambient 舞台"
          clock={clock}
        />,
      );
    });
    act(() => clock.advance(100));

    // MAX_SAFE_INTEGER % 400 is 191; 100ms later the loop samples 291ms.
    expect(entryOf(container, "tag.test.actor").style.transform).toContain(
      "translate3d(291px",
    );
  });
});
