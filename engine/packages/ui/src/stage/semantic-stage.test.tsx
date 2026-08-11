// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";

import type { AssetId, StageContentCatalogV1, StageTransitionCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import type { SemanticStageEntryRendererV1 } from "./semantic-stage-host.tsx";
import {
  bindSemanticStageCompositionRetargetDelegateInternalV1,
  createSemanticStageCompositionDriverInternalV1,
  SemanticStageCompositionClaimantProviderInternalV1,
  SemanticStageV1,
} from "./semantic-stage.tsx";
import { createStageReconcilerV1 } from "./stage-reconciler.ts";

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
  it("routes a claimed reconciler only through the exact frozen composition driver", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: transitionCatalogV1,
      prefersReducedMotion: () => false,
    });
    const claimant = Object.freeze({});
    const driver = createSemanticStageCompositionDriverInternalV1(reconciler, claimant);
    const currentContent = () =>
      reconciler.frame().layers[0]!.entries.find((entry) => entry.phase !== "exiting")!.entry
        .contentId;

    expect(Object.isFrozen(driver)).toBe(true);
    expect(Object.keys(driver)).toEqual([
      "retargetInternalV1",
      "suspendInternalV1",
      "resumeInternalV1",
      "skipAllInternalV1",
      "disposeInternalV1",
      "isCurrentInternalV1",
    ]);
    expect(createSemanticStageCompositionDriverInternalV1(reconciler, claimant)).toBe(driver);
    expect(() => createSemanticStageCompositionDriverInternalV1(reconciler, Object.freeze({})))
      .toThrow("ui.stage_acknowledged_run_authority_invalid");

    // A claimed reconciler can only initialize through the private
    // presentation-generation authority; its public retarget is already inert.
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.a"),
      revision: 1,
      epoch: 0,
    });
    expect(currentContent()).toBe("content.test.a");

    // Public lifecycle methods are fail-closed after the claim.
    reconciler.retarget({
      target: targetWithContentV1("content.test.b"),
      revision: 2,
      epoch: 0,
    });
    reconciler.dispose();
    expect(currentContent()).toBe("content.test.a");
    expect(driver.isCurrentInternalV1()).toBe(true);

    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.b"),
      revision: 2,
      epoch: 0,
    });
    expect(currentContent()).toBe("content.test.b");
    expect(reconciler.frame().settled).toBe(false);
    expect(clock.pendingTickCount()).toBe(1);
    reconciler.skipAll();
    expect(reconciler.frame().settled).toBe(false);
    driver.skipAllInternalV1();
    expect(reconciler.frame().settled).toBe(true);

    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.c"),
      revision: 3,
      epoch: 0,
    });
    driver.suspendInternalV1();
    clock.advance(100);
    expect(reconciler.frame().settled).toBe(false);
    driver.resumeInternalV1();
    clock.advance(100);
    expect(reconciler.frame().settled).toBe(true);

    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.d"),
      revision: 4,
      epoch: 1,
    });
    expect(currentContent()).toBe("content.test.d");
    expect(reconciler.frame().settled).toBe(true);

    driver.disposeInternalV1();
    expect(driver.isCurrentInternalV1()).toBe(false);
    expect(clock.pendingTickCount()).toBe(0);
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.stale"),
      revision: 5,
      epoch: 1,
    });
    driver.suspendInternalV1();
    driver.resumeInternalV1();
    driver.skipAllInternalV1();
    driver.disposeInternalV1();
    expect(currentContent()).toBe("content.test.d");
  });

  it("token-fences a Barrier retarget delegate without widening the exact driver", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: transitionCatalogV1,
      prefersReducedMotion: () => false,
    });
    const driver = createSemanticStageCompositionDriverInternalV1(
      reconciler,
      Object.freeze({}),
    );
    const currentContent = () =>
      reconciler.frame().layers[0]!.entries.find((entry) => entry.phase !== "exiting")!.entry
        .contentId;
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.delegate-a"),
      revision: 1,
      epoch: 0,
    });

    let handledRetargetReturned = false;
    let handledObservedReturned: boolean | null = null;
    const handled = vi.fn(() => true);
    const afterHandledMutation = vi.fn(() => {
      handledObservedReturned = handledRetargetReturned;
    });
    const releaseHandled = bindSemanticStageCompositionRetargetDelegateInternalV1(
      driver,
      handled,
      afterHandledMutation,
    );
    expect(Object.keys(driver)).toEqual([
      "retargetInternalV1",
      "suspendInternalV1",
      "resumeInternalV1",
      "skipAllInternalV1",
      "disposeInternalV1",
      "isCurrentInternalV1",
    ]);
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.delegate-blocked"),
      revision: 2,
      epoch: 0,
    });
    handledRetargetReturned = true;
    expect(handled).toHaveBeenCalledOnce();
    expect(afterHandledMutation).toHaveBeenCalledOnce();
    expect(handledObservedReturned).toBe(false);
    expect(currentContent()).toBe("content.test.delegate-a");

    expect(() => bindSemanticStageCompositionRetargetDelegateInternalV1(driver, () => false))
      .toThrow("ui.semantic_stage_composition_retarget_delegate_invalid");
    releaseHandled();
    let fallbackRetargetReturned = false;
    let fallbackObservedReturned: boolean | null = null;
    let fallbackObservedContent: string | null = null;
    const fallback = vi.fn(() => false);
    const afterFallbackMutation = vi.fn(() => {
      fallbackObservedReturned = fallbackRetargetReturned;
      fallbackObservedContent = currentContent();
    });
    const releaseFallback = bindSemanticStageCompositionRetargetDelegateInternalV1(
      driver,
      fallback,
      afterFallbackMutation,
    );
    releaseHandled();
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.delegate-fallback"),
      revision: 3,
      epoch: 0,
    });
    fallbackRetargetReturned = true;
    expect(fallback).toHaveBeenCalledOnce();
    expect(afterFallbackMutation).toHaveBeenCalledOnce();
    expect(fallbackObservedReturned).toBe(false);
    expect(fallbackObservedContent).toBe("content.test.delegate-fallback");
    expect(currentContent()).toBe("content.test.delegate-fallback");
    afterFallbackMutation.mockClear();
    driver.suspendInternalV1();
    driver.resumeInternalV1();
    driver.skipAllInternalV1();
    expect(afterFallbackMutation).toHaveBeenCalledTimes(3);

    releaseFallback();
    const reentrant = vi.fn(() => {
      driver.retargetInternalV1({
        target: targetWithContentV1("content.test.delegate-reentrant"),
        revision: 4,
        epoch: 0,
      });
      return true;
    });
    const releaseReentrant = bindSemanticStageCompositionRetargetDelegateInternalV1(
      driver,
      reentrant,
    );
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.delegate-outer"),
      revision: 5,
      epoch: 0,
    });
    expect(reentrant).toHaveBeenCalledOnce();
    expect(currentContent()).toBe("content.test.delegate-fallback");
    releaseReentrant();

    const malformed = bindSemanticStageCompositionRetargetDelegateInternalV1(
      driver,
      (() => "false") as never,
    );
    driver.retargetInternalV1({
      target: targetWithContentV1("content.test.delegate-malformed"),
      revision: 6,
      epoch: 0,
    });
    expect(currentContent()).toBe("content.test.delegate-fallback");
    malformed();

    driver.disposeInternalV1();
    expect(() => bindSemanticStageCompositionRetargetDelegateInternalV1(driver, () => false))
      .toThrow("ui.semantic_stage_composition_retarget_delegate_invalid");
  });

  it("keeps one claimed driver across StrictMode replay and epoch retargets", async () => {
    const clock = createManualPresentationClockV1();
    const claimant = Object.freeze({});
    const release = vi.fn();
    type StageBindInputV1 = Parameters<
      NonNullable<
        Parameters<typeof SemanticStageCompositionClaimantProviderInternalV1>[0][
          "onBindInternalV1"
        ]
      >
    >;
    let bound: StageBindInputV1 | null = null;
    const bindings: StageBindInputV1[] = [];
    const retargetDelegate = vi.fn(() => false);
    const onBindInternalV1 = vi.fn((...input: StageBindInputV1) => {
      bound = input;
      bindings.push(input);
      const releaseDelegate = bindSemanticStageCompositionRetargetDelegateInternalV1(
        input[1],
        retargetDelegate,
      );
      return () => {
        releaseDelegate();
        release();
      };
    });
    const stageProps = {
      catalog: transitionCatalogV1,
      renderers: { "renderer.test.box": rendererV1 },
      accessibleName: "Claimed component stage",
      clock,
    };
    const renderStage = (contentId: string, revision: number, epoch: number) => (
      <SemanticStageCompositionClaimantProviderInternalV1
        claimant={claimant}
        onBindInternalV1={onBindInternalV1}
      >
        <SemanticStageV1
          {...stageProps}
          target={targetWithContentV1(contentId)}
          revision={revision}
          epoch={epoch}
        />
      </SemanticStageCompositionClaimantProviderInternalV1>
    );

    const renderStrictStage = (contentId: string, revision: number, epoch: number) => (
      <StrictMode>{renderStage(contentId, revision, epoch)}</StrictMode>
    );

    const { container, rerender, unmount } = render(renderStrictStage("content.test.a", 1, 0));
    await act(async () => {});
    expect(onBindInternalV1).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
    expect(bindings[0]![0]).toBe(bindings[1]![0]);
    expect(bindings[0]![1]).toBe(bindings[1]![1]);
    expect(bound).not.toBeNull();
    expect(bound![1].isCurrentInternalV1()).toBe(true);
    expect(retargetDelegate).toHaveBeenCalled();

    rerender(renderStrictStage("content.test.b", 2, 0));
    await act(async () => {});
    expect(onBindInternalV1).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-stage-exiting]")).not.toBeNull();

    const visibilityState = vi.spyOn(document, "visibilityState", "get");
    try {
      visibilityState.mockReturnValue("hidden");
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
      await act(async () => clock.advance(100));
      expect(container.querySelector('[data-stage-settled="false"]')).not.toBeNull();

      visibilityState.mockReturnValue("visible");
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
      await act(async () => clock.advance(100));
      expect(container.querySelector('[data-stage-settled="true"]')).not.toBeNull();
    } finally {
      visibilityState.mockRestore();
    }

    rerender(renderStrictStage("content.test.c", 3, 1));
    await act(async () => {});
    expect(onBindInternalV1).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('[data-stage-key="layer.test.back:tag.test.bg"]')?.getAttribute(
        "data-stage-content",
      ),
    ).toBe("content.test.c");
    expect(container.querySelector("[data-stage-exiting]")).toBeNull();

    rerender(renderStrictStage("content.test.d", 4, 1));
    await act(async () => {});
    expect(clock.pendingTickCount()).toBe(1);

    const staleDriver = bound![1];
    unmount();
    expect(release).toHaveBeenCalledTimes(2);
    expect(staleDriver.isCurrentInternalV1()).toBe(false);
    expect(() => {
      staleDriver.suspendInternalV1();
      staleDriver.resumeInternalV1();
      staleDriver.skipAllInternalV1();
    }).not.toThrow();
    expect(clock.pendingTickCount()).toBe(1);
    staleDriver.disposeInternalV1();
    expect(clock.pendingTickCount()).toBe(0);
    staleDriver.disposeInternalV1();
    expect(clock.pendingTickCount()).toBe(0);
    await act(async () => Promise.resolve());
    expect(clock.pendingTickCount()).toBe(0);
  });

  it("drains the claimed Stage delegate before a raw clock advance returns", async () => {
    const rawClock = createManualPresentationClockV1();
    let receiverClock!: PresentationClockV1;
    receiverClock = Object.freeze({
      now(this: PresentationClockV1): number {
        if (this !== receiverClock) throw new TypeError("raw clock receiver changed");
        return rawClock.now();
      },
      requestTick(
        this: PresentationClockV1,
        callback: (now: number) => void,
      ): () => void {
        if (this !== receiverClock) throw new TypeError("raw clock receiver changed");
        return rawClock.requestTick(callback);
      },
    });
    const claimant = Object.freeze({});
    let reconciler: ReturnType<typeof createStageReconcilerV1> | null = null;
    let advancing = false;
    let advanceReturned = false;
    let observedAdvanceReturned: boolean | null = null;
    let observedSettled: boolean | null = null;
    const afterMutation = vi.fn(() => {
      if (!advancing) return;
      observedAdvanceReturned = advanceReturned;
      observedSettled = reconciler!.frame().settled;
    });
    const onBindInternalV1 = (
      nextReconciler: Parameters<
        NonNullable<
          Parameters<typeof SemanticStageCompositionClaimantProviderInternalV1>[0][
            "onBindInternalV1"
          ]
        >
      >[0],
      driver: Parameters<
        NonNullable<
          Parameters<typeof SemanticStageCompositionClaimantProviderInternalV1>[0][
            "onBindInternalV1"
          ]
        >
      >[1],
    ) => {
      reconciler = nextReconciler;
      return bindSemanticStageCompositionRetargetDelegateInternalV1(
        driver,
        () => false,
        afterMutation,
      );
    };
    const stage = (contentId: string, revision: number) => (
      <SemanticStageCompositionClaimantProviderInternalV1
        claimant={claimant}
        onBindInternalV1={onBindInternalV1}
      >
        <SemanticStageV1
          target={targetWithContentV1(contentId)}
          revision={revision}
          epoch={0}
          catalog={transitionCatalogV1}
          renderers={{ "renderer.test.box": rendererV1 }}
          accessibleName="Same-stack drain Stage"
          clock={receiverClock}
        />
      </SemanticStageCompositionClaimantProviderInternalV1>
    );

    const { rerender } = render(stage("content.test.clock-a", 1));
    await act(async () => {});
    rerender(stage("content.test.clock-b", 2));
    await act(async () => {});
    expect(rawClock.pendingTickCount()).toBe(1);
    afterMutation.mockClear();

    advancing = true;
    act(() => {
      rawClock.advance(100);
      advanceReturned = true;
    });
    advancing = false;

    expect(afterMutation).toHaveBeenCalledOnce();
    expect(observedAdvanceReturned).toBe(false);
    expect(observedSettled).toBe(true);
    expect(reconciler!.frame().settled).toBe(true);
  });

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
