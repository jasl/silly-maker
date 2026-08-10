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
import {
  claimStageAcknowledgedRunAuthorityInternalV1,
  createStageReconcilerV1,
} from "./stage-reconciler.ts";
import type {
  StageAcknowledgedRunAuthorityInternalV1,
  StageAcknowledgedRunCommitGuardInternalV1,
  StageAcknowledgedRunRetargetResultInternalV1,
  StageAcknowledgedRunTerminalPortInternalV1,
  StagePresentationGenerationCaptureResultInternalV1,
  StagePresentationGenerationRetargetResultInternalV1,
  StageRenderFrameV1,
} from "./stage-reconciler.ts";

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

type StageAcknowledgedTerminalInputV1 = Parameters<
  StageAcknowledgedRunTerminalPortInternalV1["deliverTerminalInternalV1"]
>[0];

function commitGuardV1(
  check: (receiverIsExact: boolean) => boolean,
): StageAcknowledgedRunCommitGuardInternalV1 {
  let guard!: StageAcknowledgedRunCommitGuardInternalV1;
  guard = Object.freeze({
    isCommitCurrentInternalV1(): boolean {
      return check(this === guard);
    },
  });
  return guard;
}

function terminalPortV1(
  deliver: (input: StageAcknowledgedTerminalInputV1, receiverIsExact: boolean) => void,
): StageAcknowledgedRunTerminalPortInternalV1 {
  let port!: StageAcknowledgedRunTerminalPortInternalV1;
  port = Object.freeze({
    deliverTerminalInternalV1(input: StageAcknowledgedTerminalInputV1): void {
      deliver(input, this === port);
    },
  });
  return port;
}

function expectExactAcknowledgedResultV1(
  result: StageAcknowledgedRunRetargetResultInternalV1,
): void {
  expect(Object.isFrozen(result)).toBe(true);
  if (result.kind === "armed") {
    expect(Object.keys(result)).toEqual(["kind", "proof"]);
    expect(Object.isFrozen(result.proof)).toBe(true);
    expect(Object.keys(result.proof)).toEqual([]);
    return;
  }
  expect(result.proof).toBeNull();
  expect(Object.keys(result)).toEqual(
    result.kind === "faulted" ? ["kind", "code", "proof"] : ["kind", "proof"],
  );
}

function expectExactPresentationGenerationCaptureV1(
  result: StagePresentationGenerationCaptureResultInternalV1,
): void {
  expect(Object.isFrozen(result)).toBe(true);
  if (result.kind === "captured") {
    expect(Reflect.ownKeys(result)).toEqual(["kind", "relation", "proof"]);
    expect(Object.isFrozen(result.proof)).toBe(true);
    expect(Reflect.ownKeys(result.proof)).toEqual([]);
    return;
  }
  expect(Reflect.ownKeys(result)).toEqual(["kind", "proof"]);
  expect(result.proof).toBeNull();
}

function expectExactPresentationGenerationRetargetV1(
  result: StagePresentationGenerationRetargetResultInternalV1,
): void {
  expect(Object.isFrozen(result)).toBe(true);
  expect(Reflect.ownKeys(result)).toEqual(["kind"]);
}

function installPresentationGenerationV1(
  authority: StageAcknowledgedRunAuthorityInternalV1,
  input: Parameters<
    StageAcknowledgedRunAuthorityInternalV1["retargetPresentationGenerationInternalV1"]
  >[0],
): void {
  const result = authority.retargetPresentationGenerationInternalV1(input);
  expectExactPresentationGenerationRetargetV1(result);
  expect(result).toEqual({ kind: "retargeted" });
}

function acknowledgedRetargetV1(
  authority: StageAcknowledgedRunAuthorityInternalV1,
  input: {
    readonly target: ReturnType<typeof targetOfV1>;
    readonly revision: number;
    readonly epoch?: number;
    readonly expectedTransitionId: string;
    readonly commitGuard?: StageAcknowledgedRunCommitGuardInternalV1;
    readonly terminalPort?: StageAcknowledgedRunTerminalPortInternalV1;
  },
): StageAcknowledgedRunRetargetResultInternalV1 {
  return authority.retargetWithAcknowledgedRunInternalV1({
    retarget: {
      target: input.target,
      revision: input.revision,
      epoch: input.epoch ?? 0,
    },
    expectedTransitionId: input.expectedTransitionId,
    commitGuard: input.commitGuard ?? commitGuardV1(() => true),
    terminalPort: input.terminalPort ?? terminalPortV1(() => {}),
  });
}

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

describe("Stage presentation-generation authority", () => {
  it("authenticates initial, equal, higher, lower, numeric-ABA, and foreign proof relations", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => null),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );

    const noCurrent = authority.captureCurrentPresentationGenerationInternalV1(null);
    expectExactPresentationGenerationCaptureV1(noCurrent);
    expect(noCurrent).toEqual({ kind: "stale", proof: null });

    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 10,
    });
    const initial = authority.captureCurrentPresentationGenerationInternalV1(null);
    expectExactPresentationGenerationCaptureV1(initial);
    if (initial.kind !== "captured") throw new Error("initial generation must capture");
    expect(initial.relation).toBe("initial");

    const equal1 = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    const equal2 = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    expectExactPresentationGenerationCaptureV1(equal1);
    expectExactPresentationGenerationCaptureV1(equal2);
    expect(equal1).toMatchObject({ kind: "captured", relation: "equal" });
    expect(equal2).toMatchObject({ kind: "captured", relation: "equal" });
    if (equal1.kind !== "captured" || equal2.kind !== "captured") {
      throw new Error("equal generation must capture");
    }
    expect(equal1.proof).toBe(initial.proof);
    expect(equal2.proof).toBe(initial.proof);

    installPresentationGenerationV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.higher" }]),
      revision: 2,
      epoch: 11,
    });
    const higher = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    expectExactPresentationGenerationCaptureV1(higher);
    if (higher.kind !== "captured") throw new Error("higher generation must capture");
    expect(higher.relation).toBe("higher");
    expect(higher.proof).not.toBe(initial.proof);

    installPresentationGenerationV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.lower" }]),
      revision: 3,
      epoch: 9,
    });
    const lower = authority.captureCurrentPresentationGenerationInternalV1(higher.proof);
    expectExactPresentationGenerationCaptureV1(lower);
    expect(lower).toEqual({ kind: "stale", proof: null });

    installPresentationGenerationV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.aba" }]),
      revision: 4,
      epoch: 10,
    });
    const aba = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    expectExactPresentationGenerationCaptureV1(aba);
    expect(aba).toEqual({ kind: "stale", proof: null });
    const freshAfterAba = authority.captureCurrentPresentationGenerationInternalV1(null);
    expectExactPresentationGenerationCaptureV1(freshAfterAba);
    if (freshAfterAba.kind !== "captured") throw new Error("ABA current must recapture");
    expect(freshAfterAba.relation).toBe("initial");
    expect(freshAfterAba.proof).not.toBe(initial.proof);

    const foreignReconciler = createStageReconcilerV1({
      clock: createManualPresentationClockV1(),
      catalog: catalogV1(() => null),
    });
    const foreignAuthority = claimStageAcknowledgedRunAuthorityInternalV1(
      foreignReconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(foreignAuthority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 10,
    });
    const foreign = foreignAuthority.captureCurrentPresentationGenerationInternalV1(null);
    if (foreign.kind !== "captured") throw new Error("foreign fixture must capture");
    const foreignResult = authority.captureCurrentPresentationGenerationInternalV1(
      foreign.proof,
    );
    expectExactPresentationGenerationCaptureV1(foreignResult);
    expect(foreignResult).toEqual({ kind: "faulted", proof: null });

    const clonedResult = authority.captureCurrentPresentationGenerationInternalV1(
      Object.freeze({ ...freshAfterAba.proof }),
    );
    expectExactPresentationGenerationCaptureV1(clonedResult);
    expect(clonedResult).toEqual({ kind: "faulted", proof: null });

    for (const malformed of [undefined, false, 0, -0, "", "proof", Object.freeze({})]) {
      const malformedResult = authority.captureCurrentPresentationGenerationInternalV1(malformed);
      expectExactPresentationGenerationCaptureV1(malformedResult);
      expect(malformedResult).toEqual({ kind: "faulted", proof: null });
    }

    let trapCalls = 0;
    const hostile = new Proxy(Object.freeze({}), {
      get: () => {
        trapCalls += 1;
        throw new Error("proof field read");
      },
      getOwnPropertyDescriptor: () => {
        trapCalls += 1;
        throw new Error("proof descriptor read");
      },
      ownKeys: () => {
        trapCalls += 1;
        throw new Error("proof keys read");
      },
    });
    const hostileResult = authority.captureCurrentPresentationGenerationInternalV1(hostile);
    expectExactPresentationGenerationCaptureV1(hostileResult);
    expect(hostileResult).toEqual({ kind: "faulted", proof: null });
    expect(trapCalls).toBe(0);

    const revoked = Proxy.revocable(Object.freeze({}), {});
    revoked.revoke();
    const revokedResult = authority.captureCurrentPresentationGenerationInternalV1(
      revoked.proxy,
    );
    expectExactPresentationGenerationCaptureV1(revokedResult);
    expect(revokedResult).toEqual({ kind: "faulted", proof: null });

    const capture = authority.captureCurrentPresentationGenerationInternalV1;
    expect(() => Reflect.apply(capture, Object.freeze({}), [hostile])).toThrow(TypeError);
    expect(trapCalls).toBe(0);
    foreignAuthority.disposeInternalV1();
    authority.disposeInternalV1();
  });

  it("makes generation retarget the sole claimed epoch writer without rotating same-epoch proof", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => null),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    let notifications = 0;
    reconciler.subscribe(() => {
      notifications += 1;
    });

    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 4 });
    authority.retargetInternalV1({
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 4,
    });
    expect(() => reconciler.frame()).toThrow(TypeError);
    expect(notifications).toBe(0);
    expect(authority.captureCurrentPresentationGenerationInternalV1(null)).toEqual({
      kind: "stale",
      proof: null,
    });

    const initialRetarget = authority.retargetPresentationGenerationInternalV1({
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 4,
    });
    expectExactPresentationGenerationRetargetV1(initialRetarget);
    expect(initialRetarget).toEqual({ kind: "retargeted" });
    expect(notifications).toBe(1);
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe("content.test.a");
    const initial = authority.captureCurrentPresentationGenerationInternalV1(null);
    if (initial.kind !== "captured") throw new Error("initial generation must capture");

    const beforeSameGeneration = reconciler.frame();
    const sameGeneration = authority.retargetPresentationGenerationInternalV1({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.forbidden" }]),
      revision: 2,
      epoch: 4,
    });
    expectExactPresentationGenerationRetargetV1(sameGeneration);
    expect(sameGeneration).toEqual({ kind: "stale" });
    expect(reconciler.frame()).toEqual(beforeSameGeneration);
    expect(notifications).toBe(1);

    authority.retargetInternalV1({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.ordinary" }]),
      revision: 2,
      epoch: 4,
    });
    expect(notifications).toBe(2);
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.ordinary",
    );
    const afterOrdinary = authority.captureCurrentPresentationGenerationInternalV1(
      initial.proof,
    );
    expectExactPresentationGenerationCaptureV1(afterOrdinary);
    if (afterOrdinary.kind !== "captured") throw new Error("same epoch must capture");
    expect(afterOrdinary.relation).toBe("equal");
    expect(afterOrdinary.proof).toBe(initial.proof);

    const beforeLegacyMismatch = reconciler.frame();
    authority.retargetInternalV1({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.raw-higher" }]),
      revision: 3,
      epoch: 8,
    });
    authority.retargetInternalV1({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.raw-lower" }]),
      revision: 4,
      epoch: 2,
    });
    expect(reconciler.frame()).toEqual(beforeLegacyMismatch);
    expect(notifications).toBe(2);
    const afterLegacyMismatch = authority.captureCurrentPresentationGenerationInternalV1(
      initial.proof,
    );
    if (afterLegacyMismatch.kind !== "captured") {
      throw new Error("legacy mismatch must preserve proof");
    }
    expect(afterLegacyMismatch.relation).toBe("equal");
    expect(afterLegacyMismatch.proof).toBe(initial.proof);

    installPresentationGenerationV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.real-higher" }]),
      revision: 3,
      epoch: 8,
    });
    expect(notifications).toBe(3);
    const higher = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    if (higher.kind !== "captured") throw new Error("higher generation must capture");
    expect(higher.relation).toBe("higher");
    expect(higher.proof).not.toBe(initial.proof);

    installPresentationGenerationV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.real-lower" }]),
      revision: 4,
      epoch: 2,
    });
    expect(notifications).toBe(4);
    const lower = authority.captureCurrentPresentationGenerationInternalV1(higher.proof);
    expectExactPresentationGenerationCaptureV1(lower);
    expect(lower).toEqual({ kind: "stale", proof: null });

    authority.disposeInternalV1();
    const disposedRetarget = authority.retargetPresentationGenerationInternalV1({
      target: targetOfV1([showBackV1]),
      revision: 5,
      epoch: 9,
    });
    expectExactPresentationGenerationRetargetV1(disposedRetarget);
    expect(disposedRetarget).toEqual({ kind: "stale" });
    const disposedCapture = authority.captureCurrentPresentationGenerationInternalV1(
      higher.proof,
    );
    expectExactPresentationGenerationCaptureV1(disposedCapture);
    expect(disposedCapture).toEqual({ kind: "stale", proof: null });
  });

  it("faults presentation-generation access during acknowledged planning and interruption", () => {
    let authority!: StageAcknowledgedRunAuthorityInternalV1;
    let currentProof: Extract<
      StagePresentationGenerationCaptureResultInternalV1,
      { readonly kind: "captured" }
    >["proof"];
    let planningCapture: StagePresentationGenerationCaptureResultInternalV1 | null = null;
    let planningRetarget: StagePresentationGenerationRetargetResultInternalV1 | null = null;
    let injectPlanning = false;
    const transitionId = "transition.test.generation-reentry";
    const reconciler = createStageReconcilerV1({
      clock: createManualPresentationClockV1(),
      catalog: catalogV1(() => {
        if (injectPlanning) {
          planningCapture = authority.captureCurrentPresentationGenerationInternalV1(
            currentProof,
          );
          planningRetarget = authority.retargetPresentationGenerationInternalV1({
            target: targetOfV1([{ ...showBackV1, contentId: "content.test.nested" }]),
            revision: 99,
            epoch: 2,
          });
        }
        return definitionV1({ transitionId, acknowledge: true });
      }),
    });
    authority = claimStageAcknowledgedRunAuthorityInternalV1(reconciler, Object.freeze({}));
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 1,
    });
    const captured = authority.captureCurrentPresentationGenerationInternalV1(null);
    if (captured.kind !== "captured") throw new Error("planning fixture must capture");
    currentProof = captured.proof;
    const beforePlanning = reconciler.frame();
    let planningNotifications = 0;
    const unsubscribePlanning = reconciler.subscribe(() => {
      planningNotifications += 1;
    });
    injectPlanning = true;
    const planning = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.planned" }]),
      revision: 2,
      epoch: 1,
      expectedTransitionId: transitionId,
    });
    expect(planning).toMatchObject({ kind: "faulted", code: "stage.acknowledged_run_faulted" });
    expect(planningCapture).toEqual({ kind: "faulted", proof: null });
    expect(planningRetarget).toEqual({ kind: "faulted" });
    expect(reconciler.frame()).toEqual(beforePlanning);
    expect(planningNotifications).toBe(0);
    unsubscribePlanning();

    injectPlanning = false;
    let interruptionCapture: StagePresentationGenerationCaptureResultInternalV1 | null = null;
    let interruptionRetarget: StagePresentationGenerationRetargetResultInternalV1 | null = null;
    const first = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.first" }]),
      revision: 3,
      epoch: 1,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1((_input) => {
        interruptionCapture = authority.captureCurrentPresentationGenerationInternalV1(
          currentProof,
        );
        interruptionRetarget = authority.retargetPresentationGenerationInternalV1({
          target: targetOfV1([{ ...showBackV1, contentId: "content.test.interrupt" }]),
          revision: 100,
          epoch: 2,
        });
      }),
    });
    if (first.kind !== "armed") throw new Error("interruption fixture must arm");
    const interrupted = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.second" }]),
      revision: 4,
      epoch: 1,
      expectedTransitionId: transitionId,
    });
    expect(interrupted).toMatchObject({
      kind: "faulted",
      code: "stage.acknowledged_run_faulted",
    });
    expect(interruptionCapture).toEqual({ kind: "faulted", proof: null });
    expect(interruptionRetarget).toEqual({ kind: "faulted" });
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.first",
    );
    const afterInterruption = authority.captureCurrentPresentationGenerationInternalV1(
      currentProof,
    );
    if (afterInterruption.kind !== "captured") {
      throw new Error("interruption must preserve presentation generation");
    }
    expect(afterInterruption.relation).toBe("equal");
    expect(afterInterruption.proof).toBe(currentProof);
    authority.disposeInternalV1();
  });

  it("fences subscriber reentry and exact receivers during generation replacement", () => {
    const transitionId = "transition.test.generation-mutation-reentry";
    const reconciler = createStageReconcilerV1({
      clock: createManualPresentationClockV1(),
      catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true, kind: "cut" })),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 1,
    });
    const initial = authority.captureCurrentPresentationGenerationInternalV1(null);
    if (initial.kind !== "captured") throw new Error("reentry fixture must capture");
    let nestedCapture: StagePresentationGenerationCaptureResultInternalV1 | null = null;
    let nestedRetarget: StagePresentationGenerationRetargetResultInternalV1 | null = null;
    let nestedAcknowledged: StageAcknowledgedRunRetargetResultInternalV1 | null = null;
    let terminalStackReadable: boolean | null = null;
    const nestedTerminal = vi.fn();
    let notifications = 0;
    const unsubscribe = reconciler.subscribe(() => {
      notifications += 1;
      if (notifications !== 1) return;
      terminalStackReadable = authority.isAcknowledgedRunTerminalStackActiveInternalV1(
        initial.proof,
      );
      nestedCapture = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
      nestedRetarget = authority.retargetPresentationGenerationInternalV1({
        target: targetOfV1([{ ...showBackV1, contentId: "content.test.nested" }]),
        revision: 3,
        epoch: 3,
      });
      nestedAcknowledged = acknowledgedRetargetV1(authority, {
        target: targetOfV1([{
          ...showBackV1,
          contentId: "content.test.nested-acknowledged",
        }]),
        revision: 3,
        epoch: 2,
        expectedTransitionId: transitionId,
        terminalPort: terminalPortV1((input) => nestedTerminal(input)),
      });
    });
    const outer = authority.retargetPresentationGenerationInternalV1({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.outer" }]),
      revision: 2,
      epoch: 2,
    });
    expectExactPresentationGenerationRetargetV1(outer);
    expect(outer).toEqual({ kind: "retargeted" });
    expect(nestedCapture).toEqual({ kind: "faulted", proof: null });
    expect(nestedRetarget).toEqual({ kind: "faulted" });
    expect(nestedAcknowledged).toEqual({
      kind: "faulted",
      code: "stage.acknowledged_run_faulted",
      proof: null,
    });
    expect(nestedTerminal).not.toHaveBeenCalled();
    expect(terminalStackReadable).toBe(false);
    expect(notifications).toBe(1);
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.outer",
    );
    const after = authority.captureCurrentPresentationGenerationInternalV1(initial.proof);
    if (after.kind !== "captured") throw new Error("outer generation must capture");
    expect(after.relation).toBe("higher");
    expect(after.proof).not.toBe(initial.proof);

    let inputTrapCalls = 0;
    const hostileInput = new Proxy(Object.freeze({}), {
      get: () => {
        inputTrapCalls += 1;
        throw new Error("retarget input read");
      },
      getOwnPropertyDescriptor: () => {
        inputTrapCalls += 1;
        throw new Error("retarget descriptor read");
      },
      ownKeys: () => {
        inputTrapCalls += 1;
        throw new Error("retarget keys read");
      },
    });
    const retarget = authority.retargetPresentationGenerationInternalV1;
    expect(() => Reflect.apply(retarget, Object.freeze({}), [hostileInput])).toThrow(TypeError);
    const capture = authority.captureCurrentPresentationGenerationInternalV1;
    expect(() => Reflect.apply(capture, Object.freeze({}), [hostileInput])).toThrow(TypeError);
    expect(inputTrapCalls).toBe(0);
    unsubscribe();
    authority.disposeInternalV1();
  });

  it("fences acknowledged retarget reentry from a skip terminal callback", () => {
    const transitionId = "transition.test.skip-mutation-reentry";
    const reconciler = createStageReconcilerV1({
      clock: createManualPresentationClockV1(),
      catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 1,
    });
    let nestedAcknowledged: StageAcknowledgedRunRetargetResultInternalV1 | null = null;
    let terminalStackReadable: boolean | null = null;
    const nestedTerminal = vi.fn();
    let outerProof: unknown = null;
    const outerTerminal = vi.fn((input: StageAcknowledgedTerminalInputV1) => {
      terminalStackReadable = authority.isAcknowledgedRunTerminalStackActiveInternalV1(
        input.proof,
      );
      nestedAcknowledged = acknowledgedRetargetV1(authority, {
        target: targetOfV1([{
          ...showBackV1,
          contentId: "content.test.skip-nested",
        }]),
        revision: 3,
        epoch: 1,
        expectedTransitionId: transitionId,
        terminalPort: terminalPortV1((nestedInput) => nestedTerminal(nestedInput)),
      });
    });
    const armed = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{
        ...showBackV1,
        contentId: "content.test.skip-outer",
      }]),
      revision: 2,
      epoch: 1,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1((input) => outerTerminal(input)),
    });
    if (armed.kind !== "armed") throw new Error("skip fixture must arm");
    outerProof = armed.proof;

    let notifications = 0;
    const unsubscribe = reconciler.subscribe(() => {
      notifications += 1;
    });

    authority.skipAllInternalV1();

    expect(outerTerminal).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ proof: outerProof, outcome: "skipped" }),
    );
    expect(nestedAcknowledged).toEqual({
      kind: "faulted",
      code: "stage.acknowledged_run_faulted",
      proof: null,
    });
    expect(nestedTerminal).not.toHaveBeenCalled();
    expect(terminalStackReadable).toBe(true);
    expect(authority.isAcknowledgedRunTerminalStackActiveInternalV1(outerProof)).toBe(false);
    expect(notifications).toBe(1);
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.skip-outer",
    );
    unsubscribe();
    authority.disposeInternalV1();
  });

  it("keeps one current proof across 10,000 accepted generation rotations", () => {
    const clock = createManualPresentationClockV1();
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => null),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    const authorityKeys = Reflect.ownKeys(authority);
    const observedProofs = new WeakSet<object>();
    const target = targetOfV1([showBackV1]);
    let previousProof: object | null = null;
    let notifications = 0;
    reconciler.subscribe(() => {
      notifications += 1;
    });

    for (let index = 0; index < 10_000; index += 1) {
      const retarget = authority.retargetPresentationGenerationInternalV1({
        target,
        revision: index + 1,
        epoch: index,
      });
      if (retarget.kind !== "retargeted" || !Object.isFrozen(retarget)) {
        throw new Error("every generation rotation must retarget exactly once");
      }
      const captured = authority.captureCurrentPresentationGenerationInternalV1(previousProof);
      if (
        captured.kind !== "captured" ||
        captured.relation !== (index === 0 ? "initial" : "higher") ||
        !Object.isFrozen(captured) || !Object.isFrozen(captured.proof) ||
        Reflect.ownKeys(captured.proof).length !== 0 ||
        observedProofs.has(captured.proof)
      ) {
        throw new Error("every accepted epoch must mint one fresh opaque proof");
      }
      observedProofs.add(captured.proof);
      previousProof = captured.proof;
    }

    const equal = authority.captureCurrentPresentationGenerationInternalV1(previousProof);
    expectExactPresentationGenerationCaptureV1(equal);
    if (equal.kind !== "captured") throw new Error("last generation must remain current");
    expect(equal.relation).toBe("equal");
    expect(equal.proof).toBe(previousProof);
    expect(notifications).toBe(10_000);
    expect(clock.pendingTickCount()).toBe(0);
    expect(reconciler.frame().settled).toBe(true);
    expect(Reflect.ownKeys(authority)).toEqual(authorityKeys);
    authority.disposeInternalV1();
  });
});

describe("Stage acknowledged-run authority", () => {
  it("preserves the unclaimed raw contract and makes one exact claimant the sole writer", () => {
    const rawClock = createManualPresentationClockV1();
    const rawAcknowledgments = vi.fn();
    const raw = createStageReconcilerV1({
      clock: rawClock,
      catalog: catalogV1(() =>
        definitionV1({ transitionId: "transition.test.raw", acknowledge: true })
      ),
      onAcknowledgment: rawAcknowledgments,
    });
    raw.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    raw.retarget({
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      epoch: 0,
    });
    raw.skipAll();
    expect(raw.frame().settled).toBe(true);
    expect(rawAcknowledgments).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "skipped" }),
    );

    const clock = createManualPresentationClockV1();
    const terminalInputs: StageAcknowledgedTerminalInputV1[] = [];
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({ transitionId: "transition.test.claimed", acknowledge: true })
      ),
    });
    const claimant = Object.freeze({});
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(reconciler, claimant);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(claimStageAcknowledgedRunAuthorityInternalV1(reconciler, claimant)).toBe(authority);
    expect(() => claimStageAcknowledgedRunAuthorityInternalV1(reconciler, Object.freeze({})))
      .toThrow(TypeError);

    // Every raw mutation entry is fenced once the authority is claimed.
    reconciler.retarget({ target: targetOfV1([showBackV1]), revision: 1, epoch: 0 });
    reconciler.skipAll();
    reconciler.suspend();
    reconciler.resume();
    reconciler.dispose();
    expect(() => reconciler.frame()).toThrow(TypeError);

    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: "transition.test.claimed",
      terminalPort: terminalPortV1((input, receiverIsExact) => {
        expect(receiverIsExact).toBe(true);
        terminalInputs.push(input);
      }),
    });
    expectExactAcknowledgedResultV1(result);
    expect(result.kind).toBe("armed");

    reconciler.skipAll();
    reconciler.suspend();
    reconciler.resume();
    reconciler.dispose();
    clock.advance(50);
    expect(reconciler.frame().settled).toBe(false);
    authority.skipAllInternalV1();
    expect(reconciler.frame().settled).toBe(true);
    expect(terminalInputs).toEqual([
      expect.objectContaining({ outcome: "skipped" }),
    ]);
    authority.disposeInternalV1();
    raw.dispose();
  });

  it.each(
    [
      { matching: 0, expectedKind: "faulted", expectedCode: "stage.acknowledged_run_unmatched" },
      { matching: 1, expectedKind: "armed", expectedCode: null },
      { matching: 2, expectedKind: "faulted", expectedCode: "stage.acknowledged_run_ambiguous" },
    ] as const,
  )(
    "full-plans two edges atomically when $matching logical definitions match",
    ({ matching, expectedKind, expectedCode }) => {
      const clock = createManualPresentationClockV1();
      const expectedTransitionId = "transition.test.barrier";
      const guard = vi.fn(() => true);
      const terminal = vi.fn();
      const reconciler = createStageReconcilerV1({
        clock,
        catalog: {
          resolveTransition: (change) => {
            const isBack = change.layerId === "layer.test.back";
            const matches = matching === 2 || (matching === 1 && isBack);
            return definitionV1({
              transitionId: matches
                ? expectedTransitionId
                : `transition.test.other.${change.layerId}`,
              acknowledge: true,
            });
          },
          resolveTransitionById: () => null,
        },
      });
      const authority = claimStageAcknowledgedRunAuthorityInternalV1(
        reconciler,
        Object.freeze({}),
      );
      installPresentationGenerationV1(authority, {
        target: targetOfV1([showBackV1]),
        revision: 1,
        epoch: 0,
      });
      const before = reconciler.frame();
      let notificationCount = 0;
      const unsubscribe = reconciler.subscribe(() => {
        notificationCount += 1;
      });
      const result = acknowledgedRetargetV1(authority, {
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
        expectedTransitionId,
        commitGuard: commitGuardV1((receiverIsExact) => {
          expect(receiverIsExact).toBe(true);
          return guard();
        }),
        terminalPort: terminalPortV1((input, receiverIsExact) => {
          expect(receiverIsExact).toBe(true);
          terminal(input);
        }),
      });

      expectExactAcknowledgedResultV1(result);
      expect(result.kind).toBe(expectedKind);
      if (result.kind === "faulted") expect(result.code).toBe(expectedCode);
      if (matching === 1) {
        expect(guard).toHaveBeenCalledTimes(1);
        expect(reconciler.frame().settled).toBe(false);
        expect(notificationCount).toBeGreaterThan(0);
      } else {
        expect(guard).not.toHaveBeenCalled();
        expect(terminal).not.toHaveBeenCalled();
        expect(notificationCount).toBe(0);
        expect(reconciler.frame()).toEqual(before);
      }
      unsubscribe();
      authority.disposeInternalV1();
    },
  );

  it.each(["throw", "reenter"] as const)(
    "fails an acknowledged full-plan closed on a catalog $case callback",
    (callbackCase) => {
      const clock = createManualPresentationClockV1();
      let authority!: StageAcknowledgedRunAuthorityInternalV1;
      const guard = vi.fn(() => true);
      const terminal = vi.fn();
      const reconciler = createStageReconcilerV1({
        clock,
        catalog: {
          resolveTransition: () => {
            if (callbackCase === "throw") throw new Error("catalog failed");
            authority.retargetInternalV1({
              target: targetOfV1([{ ...showBackV1, contentId: "content.test.nested" }]),
              revision: 99,
              epoch: 0,
            });
            return definitionV1({
              transitionId: "transition.test.plan-reentry",
              acknowledge: true,
            });
          },
          resolveTransitionById: () => null,
        },
      });
      authority = claimStageAcknowledgedRunAuthorityInternalV1(reconciler, Object.freeze({}));
      installPresentationGenerationV1(authority, {
        target: targetOfV1([showBackV1]),
        revision: 1,
        epoch: 0,
      });
      const before = reconciler.frame();
      let notificationCount = 0;
      const unsubscribe = reconciler.subscribe(() => {
        notificationCount += 1;
      });

      const result = acknowledgedRetargetV1(authority, {
        target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
        revision: 2,
        expectedTransitionId: "transition.test.plan-reentry",
        commitGuard: commitGuardV1(() => guard()),
        terminalPort: terminalPortV1((input) => terminal(input)),
      });

      expect(result).toEqual({
        kind: "faulted",
        code: "stage.acknowledged_run_faulted",
        proof: null,
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(guard).not.toHaveBeenCalled();
      expect(terminal).not.toHaveBeenCalled();
      expect(notificationCount).toBe(0);
      expect(reconciler.frame()).toEqual(before);
      unsubscribe();
      authority.disposeInternalV1();
    },
  );
});

it.each(["false", "throw", "invalid", "reenter"] as const)(
  "classifies a first commit-guard $case before any Stage mutation",
  (guardCase) => {
    const clock = createManualPresentationClockV1();
    const terminal = vi.fn();
    let authority!: StageAcknowledgedRunAuthorityInternalV1;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({ transitionId: "transition.test.guard", acknowledge: true })
      ),
    });
    authority = claimStageAcknowledgedRunAuthorityInternalV1(reconciler, Object.freeze({}));
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const before = reconciler.frame();
    let notificationCount = 0;
    const unsubscribe = reconciler.subscribe(() => {
      notificationCount += 1;
    });
    let guardCalls = 0;
    const guard = Object.freeze({
      isCommitCurrentInternalV1(): boolean {
        guardCalls += 1;
        if (guardCase === "throw") throw new Error("guard failed");
        if (guardCase === "invalid") return "current" as unknown as boolean;
        if (guardCase === "reenter") {
          authority.retargetInternalV1({
            target: targetOfV1([{ ...showBackV1, contentId: "content.test.nested" }]),
            revision: 99,
            epoch: 0,
          });
        }
        return guardCase !== "false";
      },
    }) satisfies StageAcknowledgedRunCommitGuardInternalV1;

    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: "transition.test.guard",
      commitGuard: guard,
      terminalPort: terminalPortV1((input) => terminal(input)),
    });

    expectExactAcknowledgedResultV1(result);
    if (guardCase === "false") {
      expect(result).toEqual({ kind: "stale", proof: null });
    } else {
      expect(result).toEqual({
        kind: "faulted",
        code: "stage.acknowledged_run_faulted",
        proof: null,
      });
    }
    expect(guardCalls).toBe(1);
    expect(terminal).not.toHaveBeenCalled();
    expect(notificationCount).toBe(0);
    expect(reconciler.frame()).toEqual(before);
    unsubscribe();
    authority.disposeInternalV1();
  },
);

it("matches the logical transition while preserving the effective fallback acknowledgment", () => {
  const clock = createManualPresentationClockV1();
  const logicalId = "transition.test.logical-barrier";
  const fallbackId = "transition.test.effective-short";
  const fallback = definitionV1({
    transitionId: fallbackId,
    durationMs: 10,
    acknowledge: true,
  });
  const publicAcknowledgments = vi.fn();
  const terminalInputs: StageAcknowledgedTerminalInputV1[] = [];
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(
      () =>
        definitionV1({
          transitionId: logicalId,
          acknowledge: true,
          reducedMotion: { kind: "fallback", transitionId: fallbackId },
        }),
      { [fallbackId]: fallback },
    ),
    prefersReducedMotion: () => true,
    onAcknowledgment: publicAcknowledgments,
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const nextTarget = targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]);

  const effectiveIdAttempt = acknowledgedRetargetV1(authority, {
    target: nextTarget,
    revision: 2,
    expectedTransitionId: fallbackId,
    terminalPort: terminalPortV1((input) => terminalInputs.push(input)),
  });
  expect(effectiveIdAttempt).toEqual({
    kind: "faulted",
    code: "stage.acknowledged_run_unmatched",
    proof: null,
  });
  expect(reconciler.frame().settled).toBe(true);

  const logicalAttempt = acknowledgedRetargetV1(authority, {
    target: nextTarget,
    revision: 2,
    expectedTransitionId: logicalId,
    terminalPort: terminalPortV1((input, receiverIsExact) => {
      expect(receiverIsExact).toBe(true);
      terminalInputs.push(input);
    }),
  });
  expectExactAcknowledgedResultV1(logicalAttempt);
  expect(logicalAttempt.kind).toBe("armed");
  expect(terminalInputs).toEqual([]);
  clock.advance(10);

  expect(terminalInputs).toHaveLength(1);
  if (logicalAttempt.kind !== "armed") throw new Error("logical attempt must arm");
  expect(terminalInputs[0]).toEqual({ proof: logicalAttempt.proof, outcome: "completed" });
  expect(Object.isFrozen(terminalInputs[0])).toBe(true);
  expect(publicAcknowledgments).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ transitionId: fallbackId, outcome: "completed" }),
  );
  authority.disposeInternalV1();
});

it.each(
  [
    { kind: "cut", durationMs: 100, reduced: false },
    { kind: "crossfade", durationMs: 0, reduced: false },
    { kind: "crossfade", durationMs: 100, reduced: true },
  ] as const,
)(
  "binds an opaque proof before synchronous $kind/$durationMs terminal delivery",
  ({ kind, durationMs, reduced }) => {
    const clock = createManualPresentationClockV1();
    const terminalInputs: StageAcknowledgedTerminalInputV1[] = [];
    const transitionId = `transition.test.instant.${kind}.${String(durationMs)}.${String(reduced)}`;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() =>
        definitionV1({
          kind,
          durationMs,
          transitionId,
          acknowledge: true,
          reducedMotion: { kind: "settle" },
        })
      ),
      prefersReducedMotion: () => reduced,
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1((input) => terminalInputs.push(input)),
    });

    expectExactAcknowledgedResultV1(result);
    if (result.kind !== "armed") throw new Error("instant transition must arm");
    expect(terminalInputs).toEqual([{ proof: result.proof, outcome: "completed" }]);
    expect(reconciler.frame().settled).toBe(true);
    expect(clock.pendingTickCount()).toBe(0);
    authority.disposeInternalV1();
  },
);

it("keeps only one observable target while alternating 10k instant acknowledged runs", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.instant-bounded-churn";
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() =>
      definitionV1({
        kind: "cut",
        durationMs: 0,
        transitionId,
        acknowledge: true,
      })
    ),
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  const authorityKeys = Reflect.ownKeys(authority);
  const targetA = targetOfV1([showBackV1]);
  const targetB = targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]);
  installPresentationGenerationV1(authority, { target: targetA, revision: 1, epoch: 0 });

  const observedProofs = new WeakSet<object>();
  let deliveredProof: unknown = null;
  let previousProof: unknown = null;
  let terminalCount = 0;
  let terminalStackFailures = 0;
  let notificationCount = 0;
  const unsubscribe = reconciler.subscribe(() => {
    notificationCount += 1;
  });
  const port = terminalPortV1((input) => {
    terminalCount += 1;
    deliveredProof = input.proof;
    if (input.outcome !== "completed") terminalStackFailures += 1;
    if (!authority.isAcknowledgedRunTerminalStackActiveInternalV1(input.proof)) {
      terminalStackFailures += 1;
    }
  });

  for (let index = 0; index < 10_000; index += 1) {
    deliveredProof = null;
    const result = acknowledgedRetargetV1(authority, {
      target: index % 2 === 0 ? targetB : targetA,
      revision: index + 2,
      expectedTransitionId: transitionId,
      terminalPort: port,
    });
    if (result.kind !== "armed") throw new Error("instant churn must arm");
    if (deliveredProof !== result.proof) {
      throw new Error("instant churn must deliver its exact current proof");
    }
    if (observedProofs.has(result.proof)) {
      throw new Error("instant churn must mint a fresh proof");
    }
    observedProofs.add(result.proof);
    if (previousProof !== null) {
      if (authority.isAcknowledgedRunTerminalStackActiveInternalV1(previousProof)) {
        throw new Error("completed proof must not remain terminal-stack active");
      }
    }
    previousProof = result.proof;
    if (clock.pendingTickCount() !== 0) {
      throw new Error("instant churn must not retain a clock ticket");
    }
  }

  expect(terminalCount).toBe(10_000);
  expect(terminalStackFailures).toBe(0);
  expect(notificationCount).toBe(10_000);
  expect(Reflect.ownKeys(authority)).toEqual(authorityKeys);
  expect(reconciler.frame().settled).toBe(true);
  expect(reconciler.frame().layers[0]?.entries).toHaveLength(1);
  expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
    "content.test.a",
  );
  expect(clock.pendingTickCount()).toBe(0);
  unsubscribe();
  authority.disposeInternalV1();
});

it("authenticates only the exact proof while its terminal callback stack is active", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.terminal-stack-proof";
  const privateObservations: boolean[][] = [];
  const publicObservations: boolean[] = [];
  const subscriberObservations: boolean[] = [];
  let expectedProof: unknown = null;
  let authority!: StageAcknowledgedRunAuthorityInternalV1;
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
    onAcknowledgment: () => {
      if (expectedProof !== null) {
        publicObservations.push(
          authority.isAcknowledgedRunTerminalStackActiveInternalV1(expectedProof),
        );
      }
    },
  });
  authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const result = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
    revision: 2,
    expectedTransitionId: transitionId,
    terminalPort: terminalPortV1((input) => {
      privateObservations.push([
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(input.proof),
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(Object.freeze({})),
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(
          Object.freeze({ ...input.proof }),
        ),
      ]);
    }),
  });
  if (result.kind !== "armed") throw new Error("animated transition must arm");
  expectedProof = result.proof;
  const unsubscribe = reconciler.subscribe(() => {
    subscriberObservations.push(
      authority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof),
    );
  });

  expect(authority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof)).toBe(false);
  clock.advance(100);
  expect(privateObservations).toEqual([[true, false, false]]);
  expect(publicObservations).toEqual([true]);
  expect(subscriberObservations).toEqual([true]);
  expect(authority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof)).toBe(false);

  let hostileProofReads = 0;
  const hostileProof = new Proxy(Object.freeze({}), {
    get(): never {
      hostileProofReads += 1;
      throw new Error("terminal-stack proof properties must not be read");
    },
    getOwnPropertyDescriptor(): never {
      hostileProofReads += 1;
      throw new Error("terminal-stack proof descriptors must not be read");
    },
    getPrototypeOf(): never {
      hostileProofReads += 1;
      throw new Error("terminal-stack proof prototype must not be read");
    },
    has(): never {
      hostileProofReads += 1;
      throw new Error("terminal-stack proof keys must not be read");
    },
    ownKeys(): never {
      hostileProofReads += 1;
      throw new Error("terminal-stack proof keys must not be enumerated");
    },
  });
  expect(authority.isAcknowledgedRunTerminalStackActiveInternalV1(hostileProof)).toBe(false);
  expect(hostileProofReads).toBe(0);

  const foreignReconciler = createStageReconcilerV1({
    clock: createManualPresentationClockV1(),
    catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
  });
  const foreignAuthority = claimStageAcknowledgedRunAuthorityInternalV1(
    foreignReconciler,
    Object.freeze({}),
  );
  expect(
    foreignAuthority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof),
  ).toBe(false);
  expect(
    authority.isAcknowledgedRunTerminalStackActiveInternalV1(Object.freeze({})),
  ).toBe(false);

  const queryTerminalStack = authority.isAcknowledgedRunTerminalStackActiveInternalV1;
  expect(() => Reflect.apply(queryTerminalStack, Object.freeze({}), [hostileProof])).toThrowError(
    "ui.stage_acknowledged_run_authority_invalid",
  );
  expect(hostileProofReads).toBe(0);

  foreignAuthority.disposeInternalV1();
  unsubscribe();
  authority.disposeInternalV1();
});

it("seals a readiness terminal once and isolates every throwing observer in its proof stack", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.throwing-readiness-observers";
  const events: string[] = [];
  const privateStackStates: boolean[] = [];
  const publicStackStates: boolean[] = [];
  const diagnosticStackStates: boolean[] = [];
  const subscriberStackStates: boolean[] = [];
  let assetsReady = true;
  let expectedProof: unknown = null;
  let authority!: StageAcknowledgedRunAuthorityInternalV1;
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() =>
      definitionV1({
        transitionId,
        acknowledge: true,
        readiness: { kind: "wait_for_assets", timeoutMs: 50 },
      })
    ),
    assetsReady: () => assetsReady,
    onAcknowledgment: () => {
      if (expectedProof === null) return;
      events.push("public");
      publicStackStates.push(
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(expectedProof),
      );
      throw new Error("public acknowledgment failed");
    },
    reportFailure: () => {
      if (expectedProof === null) return;
      events.push("diagnostic");
      diagnosticStackStates.push(
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(expectedProof),
      );
      throw new Error("diagnostic failed");
    },
  });
  authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  clock.advance(100);
  assetsReady = false;

  let terminalCount = 0;
  const result = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
    revision: 2,
    expectedTransitionId: transitionId,
    terminalPort: terminalPortV1((input) => {
      terminalCount += 1;
      events.push("private");
      privateStackStates.push(
        authority.isAcknowledgedRunTerminalStackActiveInternalV1(input.proof),
      );
      throw new Error("private terminal failed");
    }),
  });
  if (result.kind !== "armed") throw new Error("readiness transition must arm");
  expectedProof = result.proof;
  const unsubscribe = reconciler.subscribe(() => {
    events.push("subscriber");
    subscriberStackStates.push(
      authority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof),
    );
    throw new Error("subscriber failed");
  });

  expect(() => clock.advance(50)).not.toThrow();
  expect(events).toEqual([
    "private",
    "public",
    "subscriber",
    "diagnostic",
    "subscriber",
  ]);
  expect(privateStackStates).toEqual([true]);
  expect(publicStackStates).toEqual([true]);
  expect(diagnosticStackStates).toEqual([true]);
  expect(subscriberStackStates).toEqual([true, true]);
  expect(terminalCount).toBe(1);
  expect(authority.isAcknowledgedRunTerminalStackActiveInternalV1(result.proof)).toBe(false);
  expect(reconciler.frame().settled).toBe(true);
  expect(clock.pendingTickCount()).toBe(0);

  clock.advance(500);
  authority.skipAllInternalV1();
  expect(terminalCount).toBe(1);
  unsubscribe();
  authority.disposeInternalV1();
});

it.each(["public", "subscriber"] as const)(
  "contains a throwing $case observer and still reaches the next interruption guard",
  (throwingObserver) => {
    const clock = createManualPresentationClockV1();
    const transitionId = `transition.test.throwing-${throwingObserver}`;
    const events: string[] = [];
    let outerOperation = false;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
      onAcknowledgment: () => {
        if (!outerOperation) return;
        events.push("public");
        if (throwingObserver === "public") throw new Error("public observer failed");
      },
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const oldRun = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1(() => events.push("private")),
    });
    expect(oldRun.kind).toBe("armed");
    const unsubscribe = reconciler.subscribe(() => {
      if (!outerOperation) return;
      events.push("subscriber");
      if (throwingObserver === "subscriber") throw new Error("subscriber failed");
    });
    let guardCalls = 0;
    outerOperation = true;

    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
      revision: 3,
      expectedTransitionId: transitionId,
      commitGuard: commitGuardV1(() => {
        guardCalls += 1;
        events.push(`guard-${String(guardCalls)}`);
        return true;
      }),
    });
    outerOperation = false;

    expect(result.kind).toBe("armed");
    expect(guardCalls).toBe(2);
    expect(events.slice(0, 5)).toEqual([
      "guard-1",
      "private",
      "public",
      "subscriber",
      "guard-2",
    ]);
    unsubscribe();
    authority.disposeInternalV1();
  },
);

it("does not let a planning callback complete an old run before the first guard", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.planning-clock";
  const publicAcknowledgments = vi.fn();
  const oldTerminals = vi.fn();
  let advanceClockDuringPlan = false;
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() => {
      if (advanceClockDuringPlan) clock.advance(100);
      return definitionV1({ transitionId, acknowledge: true });
    }),
    onAcknowledgment: publicAcknowledgments,
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const oldRun = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
    revision: 2,
    expectedTransitionId: transitionId,
    terminalPort: terminalPortV1((input) => oldTerminals(input)),
  });
  expect(oldRun.kind).toBe("armed");
  clock.advance(30);
  expect(reconciler.frame().settled).toBe(false);
  expect(clock.pendingTickCount()).toBe(1);

  let notificationCount = 0;
  const unsubscribe = reconciler.subscribe(() => {
    notificationCount += 1;
  });
  advanceClockDuringPlan = true;
  const result = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
    revision: 3,
    expectedTransitionId: transitionId,
    commitGuard: commitGuardV1(() => false),
  });

  expect(result).toEqual({ kind: "stale", proof: null });
  expect(oldTerminals).not.toHaveBeenCalled();
  expect(publicAcknowledgments).not.toHaveBeenCalled();
  expect(notificationCount).toBe(0);
  expect(reconciler.frame().settled).toBe(false);
  expect(clock.pendingTickCount()).toBe(1);
  unsubscribe();
  authority.disposeInternalV1();
});

it.each([
  { guardCurrent: true, expectedKind: "armed" as const },
  { guardCurrent: false, expectedKind: "stale" as const },
])(
  "preserves the selected $expectedKind result when a deferred clock tick fails to rearm",
  ({ guardCurrent, expectedKind }) => {
    const rawClock = createManualPresentationClockV1();
    const rearmFailure = new Error("deferred clock rearm failed");
    let failNextRequest = false;
    const clock = Object.freeze({
      now: () => rawClock.now(),
      requestTick(callback: (now: number) => void): () => void {
        if (failNextRequest) {
          failNextRequest = false;
          throw rearmFailure;
        }
        return rawClock.requestTick(callback);
      },
    });
    const backTransitionId = "transition.test.rearm-back";
    const frontTransitionId = "transition.test.rearm-front";
    let advanceDuringPlan = false;
    let nextBackIsInstant = false;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: {
        resolveTransition: (change) => {
          if (advanceDuringPlan) {
            advanceDuringPlan = false;
            rawClock.advance(100);
            failNextRequest = true;
          }
          const back = change.layerId === "layer.test.back";
          return definitionV1({
            transitionId: back ? backTransitionId : frontTransitionId,
            acknowledge: true,
            ...(back && nextBackIsInstant ? { kind: "cut", durationMs: 0 } : {}),
          });
        },
        resolveTransitionById: () => null,
      },
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    const target = (backContentId: string, frontContentId: string) =>
      targetOfV1([
        { ...showBackV1, contentId: backContentId },
        {
          kind: "show",
          layerId: "layer.test.front",
          tag: "tag.test.front",
          contentId: frontContentId,
        },
      ]);
    installPresentationGenerationV1(authority, {
      target: target("content.test.a", "content.test.x"),
      revision: 1,
      epoch: 0,
    });
    const oldTerminals: StageAcknowledgedTerminalInputV1[] = [];
    const oldRun = acknowledgedRetargetV1(authority, {
      target: target("content.test.b", "content.test.y"),
      revision: 2,
      expectedTransitionId: backTransitionId,
      terminalPort: terminalPortV1((input) => oldTerminals.push(input)),
    });
    expect(oldRun.kind).toBe("armed");
    rawClock.advance(30);

    const nextTerminals: StageAcknowledgedTerminalInputV1[] = [];
    nextBackIsInstant = true;
    advanceDuringPlan = true;
    let result: StageAcknowledgedRunRetargetResultInternalV1 | undefined;
    expect(() => {
      result = acknowledgedRetargetV1(authority, {
        target: target("content.test.c", "content.test.y"),
        revision: 3,
        expectedTransitionId: backTransitionId,
        commitGuard: commitGuardV1(() => guardCurrent),
        terminalPort: terminalPortV1((input) => nextTerminals.push(input)),
      });
    }).not.toThrow();

    expect(result?.kind).toBe(expectedKind);
    expect(oldTerminals.map(({ outcome }) => outcome)).toEqual(
      guardCurrent ? ["interrupted"] : [],
    );
    expect(nextTerminals.map(({ outcome }) => outcome)).toEqual(
      guardCurrent ? ["completed"] : [],
    );
    authority.disposeInternalV1();
  },
);

it("cannot half-commit when a post-guard global freeze lookup becomes hostile", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.post-guard-freeze";
  const terminal = vi.fn();
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const nextTarget = targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]);
  const freezeDescriptor = Reflect.getOwnPropertyDescriptor(Object, "freeze");
  if (freezeDescriptor === undefined || !("value" in freezeDescriptor)) {
    throw new Error("Object.freeze descriptor must be available");
  }
  const originalFreeze = freezeDescriptor.value as typeof Object.freeze;
  let postGuardFreezeCount = 0;
  const guard = commitGuardV1(() => {
    const hostileFreeze = ((value: unknown): unknown => {
      postGuardFreezeCount += 1;
      if (postGuardFreezeCount === 2) throw new Error("post-guard freeze failed");
      return Reflect.apply(originalFreeze, Object, [value]);
    }) as typeof Object.freeze;
    Reflect.defineProperty(Object, "freeze", {
      ...freezeDescriptor,
      value: hostileFreeze,
    });
    return true;
  });

  let result: StageAcknowledgedRunRetargetResultInternalV1;
  try {
    result = acknowledgedRetargetV1(authority, {
      target: nextTarget,
      revision: 2,
      expectedTransitionId: transitionId,
      commitGuard: guard,
      terminalPort: terminalPortV1((input) => terminal(input)),
    });
  } finally {
    Reflect.defineProperty(Object, "freeze", freezeDescriptor);
  }

  expect(result!.kind).toBe("armed");
  expect(postGuardFreezeCount).toBe(0);
  expect(reconciler.frame().settled).toBe(false);
  expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
    "content.test.b",
  );
  expect(clock.pendingTickCount()).toBe(1);
  expect(terminal).not.toHaveBeenCalled();
  clock.advance(100);
  expect(terminal).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ outcome: "completed" }),
  );
  authority.disposeInternalV1();
});

it("does not dynamically consult Array.prototype.some after the final guard", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.post-guard-array-some";
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const someDescriptor = Reflect.getOwnPropertyDescriptor(Array.prototype, "some");
  if (someDescriptor === undefined || !("value" in someDescriptor)) {
    throw new Error("Array.prototype.some descriptor must be available");
  }
  const originalSome = someDescriptor.value as typeof Array.prototype.some;
  let postGuardSomeCalls = 0;
  const guard = commitGuardV1(() => {
    const hostileSome = function (
      this: readonly unknown[],
      callback: (value: unknown, index: number, array: readonly unknown[]) => unknown,
      thisArg?: unknown,
    ): boolean {
      postGuardSomeCalls += 1;
      return Reflect.apply(originalSome, this, [callback, thisArg]);
    } as typeof Array.prototype.some;
    Reflect.defineProperty(Array.prototype, "some", {
      ...someDescriptor,
      value: hostileSome,
    });
    return true;
  });

  let result: StageAcknowledgedRunRetargetResultInternalV1;
  try {
    result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      commitGuard: guard,
    });
  } finally {
    Reflect.defineProperty(Array.prototype, "some", someDescriptor);
  }

  expect(result!.kind).toBe("armed");
  expect(postGuardSomeCalls).toBe(0);
  expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
    "content.test.b",
  );
  authority.disposeInternalV1();
});

it("does not leak an acknowledged proof through a planning-time WeakMap.set replacement", () => {
  const clock = createManualPresentationClockV1();
  const transitionId = "transition.test.planning-weak-map-set";
  let replaceWeakMapSetDuringPlan = false;
  let weakMapSetDescriptor:
    | PropertyDescriptor
    | undefined;
  const leakedWeakMapWrites: Array<readonly [object, unknown]> = [];
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() => {
      if (replaceWeakMapSetDuringPlan) {
        weakMapSetDescriptor = Reflect.getOwnPropertyDescriptor(
          WeakMap.prototype,
          "set",
        );
        if (weakMapSetDescriptor === undefined || !("value" in weakMapSetDescriptor)) {
          throw new Error("WeakMap.prototype.set descriptor must be available");
        }
        const hostileSet = function (
          this: WeakMap<object, unknown>,
          key: object,
          value: unknown,
        ): WeakMap<object, unknown> {
          leakedWeakMapWrites.push([key, value]);
          return this;
        } as typeof WeakMap.prototype.set;
        Reflect.defineProperty(WeakMap.prototype, "set", {
          ...weakMapSetDescriptor,
          value: hostileSet,
        });
      }
      return definitionV1({ transitionId, acknowledge: true });
    }),
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });
  const before = reconciler.frame();
  const terminal = vi.fn();
  let notificationCount = 0;
  const unsubscribe = reconciler.subscribe(() => {
    notificationCount += 1;
  });
  replaceWeakMapSetDuringPlan = true;

  let result: StageAcknowledgedRunRetargetResultInternalV1;
  try {
    result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      commitGuard: commitGuardV1(() => false),
      terminalPort: terminalPortV1((input) => terminal(input)),
    });
  } finally {
    if (weakMapSetDescriptor !== undefined) {
      Reflect.defineProperty(WeakMap.prototype, "set", weakMapSetDescriptor);
    }
  }

  expect(result!).toEqual({ kind: "stale", proof: null });
  expect(leakedWeakMapWrites).toEqual([]);
  expect(terminal).not.toHaveBeenCalled();
  expect(notificationCount).toBe(0);
  expect(reconciler.frame()).toEqual(before);
  unsubscribe();
  authority.disposeInternalV1();
});

it.each(["stale", "faulted"] as const)(
  "rechecks an old terminal public callback and gives $case the documented precedence",
  (expectedKind) => {
    const clock = createManualPresentationClockV1();
    const transitionId = "transition.test.old-terminal-guard";
    const events: string[] = [];
    let outerOperation = false;
    let guardCurrent = true;
    let authority!: StageAcknowledgedRunAuthorityInternalV1;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true })),
      onAcknowledgment: () => {
        if (!outerOperation) return;
        events.push("public");
        guardCurrent = expectedKind !== "stale";
        authority.retargetInternalV1({
          target: targetOfV1([{ ...showBackV1, contentId: "content.test.nested" }]),
          revision: 99,
          epoch: 0,
        });
      },
    });
    authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const oldRun = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1(() => events.push("private")),
    });
    expect(oldRun.kind).toBe("armed");
    const unsubscribe = reconciler.subscribe(() => events.push("subscriber"));
    let guardCalls = 0;
    outerOperation = true;
    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
      revision: 3,
      expectedTransitionId: transitionId,
      commitGuard: commitGuardV1(() => {
        guardCalls += 1;
        events.push(`guard-${String(guardCalls)}`);
        return guardCurrent;
      }),
    });
    outerOperation = false;

    expect(result).toEqual(
      expectedKind === "stale" ? { kind: "stale", proof: null } : {
        kind: "faulted",
        code: "stage.acknowledged_run_faulted",
        proof: null,
      },
    );
    expect(events).toEqual([
      "guard-1",
      "private",
      "public",
      "subscriber",
      "guard-2",
    ]);
    expect(reconciler.frame().settled).toBe(true);
    expect(reconciler.frame().layers[0]?.entries[0]?.entry.contentId).toBe(
      "content.test.b",
    );
    expect(clock.pendingTickCount()).toBe(0);
    unsubscribe();
    authority.disposeInternalV1();
  },
);

it("defers a second old clock terminal until the first interruption guard completes", () => {
  const clock = createManualPresentationClockV1();
  const expectedTransitionId = "transition.test.ordered-old-run";
  const otherTransitionId = "transition.test.ordered-other";
  const events: string[] = [];
  let outerOperation = false;
  let advancedClock = false;
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: {
      resolveTransition: (change) =>
        definitionV1({
          transitionId: change.layerId === "layer.test.back"
            ? expectedTransitionId
            : otherTransitionId,
          acknowledge: true,
        }),
      resolveTransitionById: () => null,
    },
    onAcknowledgment: (acknowledgment) => {
      events.push(
        `public:${acknowledgment.transitionId}:${acknowledgment.outcome}`,
      );
      if (outerOperation && !advancedClock) {
        advancedClock = true;
        clock.advance(100);
      }
    },
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  const target = (backContentId: string, frontContentId: string) =>
    targetOfV1([
      { ...showBackV1, contentId: backContentId },
      {
        kind: "show",
        layerId: "layer.test.front",
        tag: "tag.test.front",
        contentId: frontContentId,
      },
    ]);
  installPresentationGenerationV1(authority, {
    target: target("content.test.a", "content.test.x"),
    revision: 1,
    epoch: 0,
  });
  const oldRun = acknowledgedRetargetV1(authority, {
    target: target("content.test.b", "content.test.y"),
    revision: 2,
    expectedTransitionId,
    terminalPort: terminalPortV1((input) => events.push(`private:${input.outcome}`)),
  });
  expect(oldRun.kind).toBe("armed");
  clock.advance(30);
  events.length = 0;
  let guardCalls = 0;
  outerOperation = true;

  const result = acknowledgedRetargetV1(authority, {
    target: target("content.test.c", "content.test.z"),
    revision: 3,
    expectedTransitionId,
    commitGuard: commitGuardV1(() => {
      guardCalls += 1;
      events.push(`guard-${String(guardCalls)}`);
      return true;
    }),
  });
  outerOperation = false;

  expect(result.kind).toBe("armed");
  expect(events).toEqual([
    "guard-1",
    "private:interrupted",
    `public:${expectedTransitionId}:interrupted`,
    "guard-2",
    `public:${otherTransitionId}:interrupted`,
    "guard-3",
  ]);
  expect(clock.pendingTickCount()).toBe(2);
  authority.disposeInternalV1();
});

it("retains one proof through asset readiness and reports completed or bounded skipped outcomes", () => {
  const clock = createManualPresentationClockV1();
  let ready = false;
  const terminalInputs: StageAcknowledgedTerminalInputV1[] = [];
  const transitionId = "transition.test.readiness";
  const reconciler = createStageReconcilerV1({
    clock,
    catalog: catalogV1(() =>
      definitionV1({
        transitionId,
        acknowledge: true,
        readiness: { kind: "wait_for_assets", timeoutMs: 50 },
      })
    ),
    assetsReady: () => ready,
  });
  const authority = claimStageAcknowledgedRunAuthorityInternalV1(
    reconciler,
    Object.freeze({}),
  );
  const port = terminalPortV1((input) => terminalInputs.push(input));
  installPresentationGenerationV1(authority, {
    target: targetOfV1([showBackV1]),
    revision: 1,
    epoch: 0,
  });

  const completed = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
    revision: 2,
    expectedTransitionId: transitionId,
    terminalPort: port,
  });
  if (completed.kind !== "armed") throw new Error("readiness transition must arm");
  clock.advance(20);
  expect(terminalInputs).toEqual([]);
  expect(reconciler.frame().layers[0]?.entries[0]?.progress).toBe(0);
  ready = true;
  clock.advance(0);
  clock.advance(100);
  expect(terminalInputs).toEqual([{ proof: completed.proof, outcome: "completed" }]);

  ready = false;
  const degraded = acknowledgedRetargetV1(authority, {
    target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
    revision: 3,
    expectedTransitionId: transitionId,
    terminalPort: port,
  });
  if (degraded.kind !== "armed") throw new Error("timeout transition must arm");
  clock.advance(50);
  clock.advance(0);
  expect(terminalInputs).toEqual([
    { proof: completed.proof, outcome: "completed" },
    { proof: degraded.proof, outcome: "skipped" },
  ]);
  authority.disposeInternalV1();
});

it.each(
  [
    { outcome: "completed", interruption: "settle_and_retarget" },
    { outcome: "skipped", interruption: "settle_and_retarget" },
    { outcome: "interrupted", interruption: "settle_and_retarget" },
    { outcome: "cancelled", interruption: "cancel_to_target" },
  ] as const,
)(
  "delivers one exact $outcome receipt for a claimed animated run",
  ({ outcome, interruption }) => {
    const clock = createManualPresentationClockV1();
    const terminalInputs: StageAcknowledgedTerminalInputV1[] = [];
    const transitionId = `transition.test.outcome.${outcome}`;
    const reconciler = createStageReconcilerV1({
      clock,
      catalog: catalogV1(() => definitionV1({ transitionId, acknowledge: true, interruption })),
    });
    const authority = claimStageAcknowledgedRunAuthorityInternalV1(
      reconciler,
      Object.freeze({}),
    );
    installPresentationGenerationV1(authority, {
      target: targetOfV1([showBackV1]),
      revision: 1,
      epoch: 0,
    });
    const result = acknowledgedRetargetV1(authority, {
      target: targetOfV1([{ ...showBackV1, contentId: "content.test.b" }]),
      revision: 2,
      expectedTransitionId: transitionId,
      terminalPort: terminalPortV1((input) => terminalInputs.push(input)),
    });
    if (result.kind !== "armed") throw new Error("animated transition must arm");

    if (outcome === "completed") clock.advance(100);
    else if (outcome === "skipped") authority.skipAllInternalV1();
    else {
      authority.retargetInternalV1({
        target: targetOfV1([{ ...showBackV1, contentId: "content.test.c" }]),
        revision: 3,
        epoch: 0,
      });
    }
    expect(terminalInputs).toEqual([{ proof: result.proof, outcome }]);
    clock.advance(500);
    expect(terminalInputs).toHaveLength(1);
    authority.disposeInternalV1();
  },
);
