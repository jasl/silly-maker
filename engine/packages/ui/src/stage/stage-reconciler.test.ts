// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type {
  AssetId,
  SemanticStageStateV1,
  StageContentCatalogV1,
  StageTransitionCatalogV1,
  StageTransitionDefinitionV1,
} from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createStageReconcilerV1 } from "./stage-reconciler.ts";
import type { StageRenderFrameV1 } from "./stage-reconciler.ts";

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([`asset.for.${contentId}` as AssetId]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({}),
    }),
};

function stateWithV1(mutations: readonly unknown[]): SemanticStageStateV1 {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.reconciler",
    layerIds: ["layer.test.back", "layer.test.front"],
  });
  const outcome = reduceStageMutationsV1(empty, mutations);
  if (outcome.kind !== "applied") throw new Error("reconciler fixture stage must apply");
  return outcome.state;
}

function targetOfV1(mutations: readonly unknown[]) {
  return projectStageRenderTargetV1(stateWithV1(mutations), contentCatalogV1).target;
}

function definitionV1(
  overrides: Partial<StageTransitionDefinitionV1> & { readonly transitionId: string },
): StageTransitionDefinitionV1 {
  return parseStageTransitionDefinitionV1({
    kind: "crossfade",
    durationMs: 100,
    easing: "linear",
    inputPolicy: "target_active",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: false,
    slide: null,
    ...overrides,
  });
}

function catalogV1(
  resolve: (kind: string) => StageTransitionDefinitionV1 | null,
  byId: Readonly<Record<string, StageTransitionDefinitionV1>> = {},
): StageTransitionCatalogV1 {
  return {
    resolveTransition: (change) => resolve(change.kind),
    resolveTransitionById: (transitionId) => byId[transitionId] ?? null,
  };
}

const showBackV1 = {
  kind: "show",
  layerId: "layer.test.back",
  tag: "tag.test.bg",
  contentId: "content.test.a",
} as const;

const entryKeysV1 = (frame: StageRenderFrameV1): readonly string[] =>
  frame.layers.flatMap((layer) => layer.entries.map((entry) => entry.frameKey));

describe("createStageReconcilerV1", () => {
  it("bootstraps a settled frame and derives commit-only edges afterwards", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => definitionV1({ transitionId: "transition.test.fade" })),
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    expect(reconciler.frame().settled).toBe(true);

    // Re-projection of the same committed revision is not a new edge.
    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    expect(reconciler.frame().settled).toBe(true);

    // A new committed revision with a replace starts a run with a ghost.
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    const frame = reconciler.frame();
    expect(frame.settled).toBe(false);
    expect(entryKeysV1(frame)).toEqual([
      "layer.test.back:tag.test.bg",
      expect.stringMatching(/^layer\.test\.back:tag\.test\.bg:exit:/u),
    ]);

    // Retained exit keeps the superseded asset demanded until it settles.
    expect(frame.requiredAssetIds).toEqual([
      "asset.for.content.test.a",
      "asset.for.content.test.b",
    ]);

    clock.advance(50);
    expect(reconciler.frame().layers[0]?.entries[0]?.progress).toBeCloseTo(0.5);
    clock.advance(50);
    const settledFrame = reconciler.frame();
    expect(settledFrame.settled).toBe(true);
    expect(entryKeysV1(settledFrame)).toEqual(["layer.test.back:tag.test.bg"]);
    expect(settledFrame.requiredAssetIds).toEqual(["asset.for.content.test.b"]);
    reconciler.dispose();
  });

  it("acknowledges exactly once for acknowledge transitions, never for others", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1((kind) =>
        kind === "replace"
          ? definitionV1({ transitionId: "transition.test.ack", acknowledge: true })
          : definitionV1({ transitionId: "transition.test.silent" })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([
        { ...showBackV1, contentId: "content.test.b" },
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.new",
          contentId: "content.test.c",
        },
      ]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(100);
    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith({
      occurrenceId: expect.stringMatching(/^stage-transition\.0\./u),
      transitionId: "transition.test.ack",
      epoch: 0,
      outcome: "completed",
    });
    clock.advance(100);
    expect(onAcknowledgment).toHaveBeenCalledTimes(1);
    reconciler.dispose();
  });

  it("settle_and_retarget interrupts instantly and never flashes the old target", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({
          transitionId: "transition.test.settle",
          acknowledge: true,
          interruption: "settle_and_retarget",
        })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(30);
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
      revision: 3,
      epoch: 0,
    });

    // The interrupted run acknowledged; the new edge runs from B, not A.
    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "interrupted" }),
    );
    const frame = reconciler.frame();
    const contents = frame.layers[0]?.entries.map((entry) => entry.entry.contentId);
    expect(contents).toEqual(["content.test.c", "content.test.b"]);
    expect(contents).not.toContain("content.test.a");

    clock.advance(100);
    expect(onAcknowledgment).toHaveBeenCalledTimes(2);
    expect(onAcknowledgment).toHaveBeenLastCalledWith(
      expect.objectContaining({ outcome: "completed" }),
    );
    reconciler.dispose();
  });

  it("cancel_to_target drops the run and jumps the entry straight to the target", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({
          transitionId: "transition.test.cancel",
          acknowledge: true,
          interruption: "cancel_to_target",
        })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(30);
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
      revision: 3,
      epoch: 0,
    });

    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "cancelled" }),
    );
    const frame = reconciler.frame();
    expect(frame.settled).toBe(true);
    expect(entryKeysV1(frame)).toEqual(["layer.test.back:tag.test.bg"]);
    expect(frame.layers[0]?.entries[0]?.entry.contentId).toBe("content.test.c");
    reconciler.dispose();
  });

  it("epoch changes restore a stable target with no edges and no late acks", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({ transitionId: "transition.test.epoch", acknowledge: true })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(30);

    // Load: epoch advances; the in-flight edge is dropped silently.
    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 3, epoch: 1 });
    const frame = reconciler.frame();
    expect(frame.settled).toBe(true);
    expect(entryKeysV1(frame)).toEqual(["layer.test.back:tag.test.bg"]);
    clock.advance(500);
    expect(onAcknowledgment).not.toHaveBeenCalled();
    expect(clock.pendingTickCount()).toBe(0);
    reconciler.dispose();
  });

  it("reflects input policies and skips all runs on demand", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1((kind) =>
        kind === "replace"
          ? definitionV1({ transitionId: "transition.test.block", inputPolicy: "block" })
          : definitionV1({
            transitionId: "transition.test.skip",
            inputPolicy: "skip_to_end",
            acknowledge: true,
          })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([
        { ...showBackV1, contentId: "content.test.b" },
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.new",
          contentId: "content.test.c",
        },
      ]),
      revision: 2,
      epoch: 0,
    });

    expect(reconciler.frame().inputGate).toEqual({ blocked: true, skipOnInput: true });
    reconciler.skipAll();
    const frame = reconciler.frame();
    expect(frame.settled).toBe(true);
    expect(frame.inputGate).toEqual({ blocked: false, skipOnInput: false });
    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "skipped" }),
    );
    reconciler.dispose();
  });

  it("instant settles still emit the completion acknowledgment", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({
          transitionId: "transition.test.ack-reduced",
          acknowledge: true,
          reducedMotion: { kind: "settle" },
        })
      ),
      prefersReducedMotion: () => true,
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });

    // No run played, but the acknowledged edge completed instantly: the
    // frame is settled and the acknowledgment fired exactly once.
    expect(reconciler.frame().settled).toBe(true);
    expect(onAcknowledgment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        transitionId: "transition.test.ack-reduced",
        outcome: "completed",
      }),
    );
    reconciler.dispose();
  });

  it("reduced motion settles directly or plays the resolvable fallback", () => {
    const clock = createManualPresentationClockV1();
    const fallback = definitionV1({ transitionId: "transition.test.short", durationMs: 10 });
    const reportFailure = vi.fn();
    let reduced = true;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(
        (kind) =>
          kind === "replace"
            ? definitionV1({
              transitionId: "transition.test.rich",
              reducedMotion: { kind: "fallback", transitionId: "transition.test.short" },
            })
            : definitionV1({
              transitionId: "transition.test.settle-only",
              reducedMotion: { kind: "settle" },
            }),
        { "transition.test.short": fallback },
      ),
      prefersReducedMotion: () => reduced,
      reportFailure,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });

    // settle-kind reduced motion: the enter lands instantly, no run.
    reconciler.retarget({
      target: targetOfV1([
        showBackV1,
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.new",
          contentId: "content.test.c",
        },
      ]),
      revision: 2,
      epoch: 0,
    });
    expect(reconciler.frame().settled).toBe(true);

    // fallback-kind reduced motion plays the shorter catalog fallback.
    reconciler.retarget({
      target: targetOfV1([
        { ...showBackV1, contentId: "content.test.b" },
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.new",
          contentId: "content.test.c",
        },
      ]),
      revision: 3,
      epoch: 0,
    });
    expect(reconciler.frame().settled).toBe(false);
    clock.advance(10);
    expect(reconciler.frame().settled).toBe(true);
    expect(reportFailure).not.toHaveBeenCalled();

    // Full motion resumes when the preference clears.
    reduced = false;
    reconciler.retarget({
      target: targetOfV1([
        showBackV1,
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.new",
          contentId: "content.test.c",
        },
      ]),
      revision: 4,
      epoch: 0,
    });
    expect(reconciler.frame().settled).toBe(false);
    clock.advance(100);
    reconciler.dispose();
  });

  it("waits for asset readiness within the bounded window, then degrades", () => {
    const clock = createManualPresentationClockV1();
    const reportFailure = vi.fn();
    let ready = false;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({
          transitionId: "transition.test.wait",
          readiness: { kind: "wait_for_assets", timeoutMs: 50 },
        })
      ),
      assetsReady: () => ready,
      reportFailure,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });

    // Held: no progress while assets are pending.
    clock.advance(20);
    expect(reconciler.frame().settled).toBe(false);
    expect(reconciler.frame().layers[0]?.entries[0]?.progress).toBe(0);

    // Ready inside the window: the run starts and plays fully.
    ready = true;
    clock.advance(0);
    clock.advance(100);
    expect(reconciler.frame().settled).toBe(true);
    expect(reportFailure).not.toHaveBeenCalled();

    // Timeout path: never ready, bounded wait degrades to the end state.
    ready = false;
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
      revision: 3,
      epoch: 0,
    });
    clock.advance(50);
    clock.advance(0);
    expect(reconciler.frame().settled).toBe(true);
    expect(reportFailure).toHaveBeenCalledWith(
      "stage.transition_readiness_timeout",
      expect.stringContaining("transition.test.wait"),
    );
    reconciler.dispose();
  });

  it("suspends and resumes runs for page visibility", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => definitionV1({ transitionId: "transition.test.visible" })),
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(30);
    reconciler.suspend();
    const frozen = reconciler.frame().layers[0]?.entries[0]?.progress;
    clock.advance(500);
    expect(reconciler.frame().layers[0]?.entries[0]?.progress).toBe(frozen);
    expect(reconciler.frame().settled).toBe(false);

    reconciler.resume();
    clock.advance(70);
    expect(reconciler.frame().settled).toBe(true);
    reconciler.dispose();
  });

  it("dispose leaves no ticks and drops late acknowledgments", () => {
    const clock = createManualPresentationClockV1();
    const onAcknowledgment = vi.fn();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({ transitionId: "transition.test.dispose", acknowledge: true })
      ),
      onAcknowledgment,
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    clock.advance(30);
    reconciler.dispose();
    expect(clock.pendingTickCount()).toBe(0);
    clock.advance(500);
    expect(onAcknowledgment).not.toHaveBeenCalled();
  });
});
