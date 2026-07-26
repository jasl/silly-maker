// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createManualPresentationClockV1 } from "./presentation-clock.js";
import { createPresentationRunV1, easeInOutV1 } from "./presentation-run.js";

function runFixtureV1(durationMs = 100) {
  const clock = createManualPresentationClockV1();
  const onFinished = vi.fn();
  const run = createPresentationRunV1({
    runId: "run.test.1",
    definitionId: "transition.test",
    epoch: 0,
    durationMs,
    clock,
    onFinished,
  });
  return { clock, run, onFinished };
}

describe("createPresentationRunV1", () => {
  it("drives start, progress, and completion from the manual clock", () => {
    const { clock, run, onFinished } = runFixtureV1(100);
    expect(run.status()).toBe("pending");
    expect(run.progress()).toBe(0);

    run.start();
    expect(run.status()).toBe("running");
    clock.advance(25);
    expect(run.progress()).toBeCloseTo(0.25);
    clock.advance(50);
    expect(run.progress()).toBeCloseTo(0.75);
    expect(onFinished).not.toHaveBeenCalled();

    clock.advance(25);
    expect(run.status()).toBe("settled");
    expect(run.progress()).toBe(1);
    expect(onFinished).toHaveBeenCalledExactlyOnceWith("completed");

    // Late ticks after settle change nothing.
    clock.advance(500);
    expect(run.progress()).toBe(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(clock.pendingTickCount()).toBe(0);
  });

  it("pauses and resumes without losing elapsed time", () => {
    const { clock, run } = runFixtureV1(100);
    run.start();
    clock.advance(40);
    run.pause();
    expect(run.status()).toBe("paused");
    const frozen = run.progress();
    clock.advance(500);
    expect(run.progress()).toBe(frozen);
    expect(clock.pendingTickCount()).toBe(0);

    run.resume();
    clock.advance(60);
    expect(run.status()).toBe("settled");
  });

  it("skip, settle, and cancel finish exactly once with their outcome", () => {
    const skip = runFixtureV1(100);
    skip.run.start();
    skip.clock.advance(10);
    skip.run.skipToEnd();
    expect(skip.run.status()).toBe("settled");
    expect(skip.run.progress()).toBe(1);
    expect(skip.onFinished).toHaveBeenCalledExactlyOnceWith("skipped");
    skip.run.cancel();
    expect(skip.onFinished).toHaveBeenCalledTimes(1);

    const interrupted = runFixtureV1(100);
    interrupted.run.start();
    interrupted.run.settleNow();
    expect(interrupted.onFinished).toHaveBeenCalledExactlyOnceWith("interrupted");

    const cancelled = runFixtureV1(100);
    cancelled.run.start();
    cancelled.clock.advance(30);
    cancelled.run.cancel();
    expect(cancelled.run.status()).toBe("cancelled");
    expect(cancelled.run.progress()).toBeCloseTo(0.3);
    expect(cancelled.onFinished).toHaveBeenCalledExactlyOnceWith("cancelled");
  });

  it("zero-duration runs settle on start", () => {
    const { run, onFinished } = runFixtureV1(0);
    run.start();
    expect(run.status()).toBe("settled");
    expect(onFinished).toHaveBeenCalledExactlyOnceWith("completed");
  });

  it("dispose drops ticks and suppresses outcome callbacks", () => {
    const { clock, run, onFinished } = runFixtureV1(100);
    run.start();
    clock.advance(10);
    run.dispose();
    expect(clock.pendingTickCount()).toBe(0);
    clock.advance(500);
    expect(onFinished).not.toHaveBeenCalled();
    expect(run.status()).toBe("cancelled");
  });

  it("applies the configured easing to progress", () => {
    const clock = createManualPresentationClockV1();
    const run = createPresentationRunV1({
      runId: "run.test.eased",
      definitionId: "transition.test",
      epoch: 0,
      durationMs: 100,
      clock,
      easing: easeInOutV1,
    });
    run.start();
    clock.advance(50);
    expect(run.progress()).toBeCloseTo(0.5);
    clock.advance(25);
    expect(run.progress()).toBeCloseTo(easeInOutV1(0.75));
  });
});
