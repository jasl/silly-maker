// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.js";
import { createPlaybackControllerV1 } from "./playback-controller.js";
import type { PlaybackBoundaryV1 } from "./playback-controller.js";
import { createTextRevealV1 } from "./text-reveal.js";

function sayBoundaryV1(input: {
  readonly occurrence: number;
  readonly definitionId?: string;
  readonly revealed?: boolean;
}): PlaybackBoundaryV1 {
  return Object.freeze({
    kind: "say" as const,
    occurrenceId: `interaction-occurrence.${String(input.occurrence)}`,
    definitionId: input.definitionId ?? "interaction.test.line",
    seenRevision: 1,
    textRevealComplete: input.revealed ?? true,
  });
}

function controllerV1(input: {
  readonly seen?: readonly string[];
  readonly skipPolicy?: "skip_read" | "skip_all";
}) {
  const clock = createManualPresentationClockV1();
  const advance = vi.fn();
  const seen = new Set(input.seen ?? []);
  const controller = createPlaybackControllerV1({
    clock,
    policy: Object.freeze({
      autoWaitMs: 600,
      skipStepMs: 50,
      skipPolicy: input.skipPolicy ?? "skip_read",
    }),
    isSeen: (definitionId) => seen.has(definitionId),
    advance,
  });
  return { clock, advance, controller };
}

describe("createTextRevealV1", () => {
  it("reveals characters over the clock, all-at-once on demand, instantly under reduced motion", () => {
    const clock = createManualPresentationClockV1();
    const reveal = createTextRevealV1({ textLength: 20, charactersPerSecond: 10, clock });
    expect(reveal.revealedCharacters()).toBe(0);
    clock.advance(500);
    expect(reveal.revealedCharacters()).toBe(5);
    clock.advance(500);
    expect(reveal.revealedCharacters()).toBe(10);

    // The first confirm reveals everything and stops the ticks.
    reveal.revealAll();
    expect(reveal.isComplete()).toBe(true);
    clock.advance(5000);
    expect(clock.pendingTickCount()).toBe(0);
    reveal.dispose();

    const reduced = createTextRevealV1({
      textLength: 20,
      charactersPerSecond: 10,
      clock,
      reducedMotion: true,
    });
    expect(reduced.isComplete()).toBe(true);
    reduced.dispose();
  });
});

describe("createPlaybackControllerV1", () => {
  it("auto advances a fully revealed say after the wait, through the shared dispatch", () => {
    const { clock, advance, controller } = controllerV1({});
    controller.setMode("auto");
    controller.observeBoundary(sayBoundaryV1({ occurrence: 1, revealed: false }));
    clock.advance(1000);
    expect(advance).not.toHaveBeenCalled();

    // Reveal completes; the auto wait elapses; exactly one advance fires
    // with the exact occurrence.
    controller.observeBoundary(sayBoundaryV1({ occurrence: 1, revealed: true }));
    clock.advance(599);
    expect(advance).not.toHaveBeenCalled();
    clock.advance(1);
    clock.advance(0);
    expect(advance).toHaveBeenCalledExactlyOnceWith("interaction-occurrence.1");

    // The boundary moves to the next say; auto keeps going per occurrence.
    controller.observeBoundary(sayBoundaryV1({ occurrence: 2 }));
    clock.advance(600);
    clock.advance(0);
    expect(advance).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it("stops at choices and drops back to normal", () => {
    const { clock, advance, controller } = controllerV1({});
    controller.setMode("auto");
    controller.observeBoundary(
      Object.freeze({
        kind: "choice" as const,
        occurrenceId: "interaction-occurrence.3",
        definitionId: "interaction.test.approach",
        seenRevision: 1,
        textRevealComplete: true,
      }),
    );
    clock.advance(10_000);
    expect(advance).not.toHaveBeenCalled();
    expect(controller.mode()).toBe("normal");
    controller.dispose();
  });

  it("skip_read skips seen lines and stops at the first unread line", () => {
    const { clock, advance, controller } = controllerV1({
      seen: ["interaction.test.read1", "interaction.test.read2"],
    });
    controller.setMode("skip");
    controller.observeBoundary(
      sayBoundaryV1({ occurrence: 1, definitionId: "interaction.test.read1", revealed: false }),
    );
    clock.advance(50);
    clock.advance(0);
    expect(advance).toHaveBeenCalledExactlyOnceWith("interaction-occurrence.1");

    controller.observeBoundary(
      sayBoundaryV1({ occurrence: 2, definitionId: "interaction.test.read2" }),
    );
    clock.advance(50);
    clock.advance(0);
    expect(advance).toHaveBeenCalledTimes(2);

    // Unread: stop skipping, stay on the line, drop to normal.
    controller.observeBoundary(
      sayBoundaryV1({ occurrence: 3, definitionId: "interaction.test.unread" }),
    );
    clock.advance(10_000);
    expect(advance).toHaveBeenCalledTimes(2);
    expect(controller.mode()).toBe("normal");
    controller.dispose();
  });

  it("skip_all skips unread lines but still stops at non-say boundaries", () => {
    const { clock, advance, controller } = controllerV1({ skipPolicy: "skip_all" });
    controller.setMode("skip");
    controller.observeBoundary(
      sayBoundaryV1({ occurrence: 1, definitionId: "interaction.test.unread", revealed: false }),
    );
    clock.advance(50);
    clock.advance(0);
    expect(advance).toHaveBeenCalledExactlyOnceWith("interaction-occurrence.1");

    // A non-skippable presentation barrier stops skip.
    controller.observeBoundary(
      Object.freeze({
        kind: "presentation_barrier" as const,
        occurrenceId: "interaction-occurrence.2",
        definitionId: "interaction.test.flash",
        seenRevision: 1,
        textRevealComplete: true,
      }),
    );
    clock.advance(10_000);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(controller.mode()).toBe("normal");
    controller.dispose();
  });

  it("mode changes and disposal cancel pending timers without stray advances", () => {
    const { clock, advance, controller } = controllerV1({});
    controller.setMode("auto");
    controller.observeBoundary(sayBoundaryV1({ occurrence: 1 }));
    clock.advance(300);
    controller.setMode("normal");
    clock.advance(10_000);
    expect(advance).not.toHaveBeenCalled();

    controller.setMode("auto");
    controller.observeBoundary(sayBoundaryV1({ occurrence: 1 }));
    controller.dispose();
    clock.advance(10_000);
    expect(advance).not.toHaveBeenCalled();
    expect(clock.pendingTickCount()).toBe(0);
  });
});
