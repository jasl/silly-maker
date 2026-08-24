// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { TimelineSampleV1 } from "@sillymaker/base";
import { timelineV1 } from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createTimelinePlayerV1 } from "./timeline-player.ts";

const beacon = timelineV1.entry("layer.test.props", "tag.beacon");

function pulseV1() {
  return timelineV1.define(
    "cue.test.pulse",
    timelineV1.sequence(
      timelineV1.event("event.test.start"),
      timelineV1.tween({
        target: beacon,
        property: "scalePermille",
        to: 1200,
        durationMs: 100,
        easing: "linear",
      }),
      timelineV1.event("event.test.done"),
    ),
  );
}

function createHarnessV1(input: { reduced?: boolean } = {}) {
  const clock = createManualPresentationClockV1();
  const player = createTimelinePlayerV1({
    clock,
    reducedMotion: () => input.reduced ?? false,
  });
  const samples: (TimelineSampleV1 | null)[] = [];
  const events: string[] = [];
  const outcomes: string[] = [];
  const play = (definition = pulseV1()) =>
    player.play({
      definition,
      epoch: 1,
      onSample: (sample) => samples.push(sample),
      onEvent: (eventId) => events.push(eventId),
      onFinished: (outcome) => outcomes.push(outcome),
    });
  return { clock, player, samples, events, outcomes, play };
}

describe("timeline player", () => {
  it("plays deterministically on the manual clock and clears on completion", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    expect(cue.status()).toBe("running");

    harness.clock.advance(50);
    expect(harness.events).toEqual(["event.test.start"]);
    const mid = harness.samples.at(-1);
    expect(mid?.values).toEqual([{ target: beacon, property: "scalePermille", value: 1100 }]);

    harness.clock.advance(50);
    harness.clock.advance(1);
    expect(cue.status()).toBe("settled");
    expect(harness.events).toEqual(["event.test.start", "event.test.done"]);
    expect(harness.outcomes).toEqual(["completed"]);
    // The final callback clears the overlay.
    expect(harness.samples.at(-1)).toBeNull();
  });

  it("pause freezes time and resume continues from the same point", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    harness.clock.advance(40);
    cue.pause();
    harness.clock.advance(500);
    expect(cue.observe()).toMatchObject({ status: "paused", elapsedMs: 40 });
    cue.resume();
    harness.clock.advance(60);
    harness.clock.advance(1);
    expect(cue.status()).toBe("settled");
    expect(harness.outcomes).toEqual(["completed"]);
  });

  it("skip settles instantly, fires remaining events exactly once, and clears", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    harness.clock.advance(10);
    cue.skipToEnd();
    expect(cue.status()).toBe("settled");
    expect(harness.events).toEqual(["event.test.start", "event.test.done"]);
    expect(harness.outcomes).toEqual(["skipped"]);
    expect(harness.samples.at(-1)).toBeNull();
    // No double delivery afterwards.
    harness.clock.advance(500);
    expect(harness.events).toHaveLength(2);
  });

  it("cancel stops mid-flight without firing later events and clears", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    harness.clock.advance(30);
    cue.cancel();
    expect(cue.status()).toBe("cancelled");
    expect(harness.events).toEqual(["event.test.start"]);
    expect(harness.outcomes).toEqual(["cancelled"]);
    expect(harness.samples.at(-1)).toBeNull();
  });

  it("fast-forward scales elapsed time", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    cue.setPlaybackRate(4);
    harness.clock.advance(25);
    harness.clock.advance(1);
    expect(cue.status()).toBe("settled");
    expect(harness.outcomes).toEqual(["completed"]);
  });

  it("reduced motion settles instantly with the full ordered event trail", () => {
    const harness = createHarnessV1({ reduced: true });
    const cue = harness.play();
    expect(cue.status()).toBe("settled");
    expect(harness.events).toEqual(["event.test.start", "event.test.done"]);
    expect(harness.outcomes).toEqual(["completed"]);
    expect(harness.samples.at(-1)).toBeNull();
  });

  it("delivers parallel events chronologically and exactly once", () => {
    const harness = createHarnessV1();
    const definition = timelineV1.define(
      "cue.test.parallel-events",
      timelineV1.parallel(
        timelineV1.sequence(
          timelineV1.wait(20),
          timelineV1.event("event.test.late"),
        ),
        timelineV1.sequence(
          timelineV1.wait(5),
          timelineV1.event("event.test.early"),
        ),
      ),
    );
    harness.play(definition);
    harness.clock.advance(5);
    expect(harness.events).toEqual(["event.test.early"]);
    harness.clock.advance(15);
    expect(harness.events).toEqual(["event.test.early", "event.test.late"]);
    harness.clock.advance(100);
    expect(harness.events).toEqual(["event.test.early", "event.test.late"]);
  });

  it("player disposal drops active cues without outcome callbacks", () => {
    const harness = createHarnessV1();
    const cue = harness.play();
    harness.clock.advance(10);
    harness.player.dispose();
    expect(harness.outcomes).toEqual([]);
    expect(cue.status()).toBe("cancelled");
    expect(() => harness.player.play({ definition: pulseV1(), epoch: 1 })).toThrowError(
      "timeline player is disposed",
    );
  });
});
