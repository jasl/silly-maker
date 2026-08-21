// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { createManualPresentationClockV1 } from "./presentation-clock.ts";
import { createPresentationRatePortV1 } from "./presentation-rate.ts";
import { createSessionTimeReporterV1 } from "./session-time-reporter.ts";

describe("createSessionTimeReporterV1", () => {
  it("rejects a quantum below one millisecond", () => {
    const clock = createManualPresentationClockV1();
    for (const bad of [0, 0.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createSessionTimeReporterV1({ clock, quantumMs: bad, dispatch: () => true }))
        .toThrow(TypeError);
    }
  });

  it("stays silent until enabled and batches reports by the quantum", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 250, dispatch });

    clock.advance(1_000);
    expect(dispatch).not.toHaveBeenCalled();

    reporter.setEnabled(true);
    clock.advance(100);
    clock.advance(100);
    expect(dispatch).not.toHaveBeenCalled();
    clock.advance(100);
    expect(dispatch.mock.calls).toEqual([[300]]);

    clock.advance(250);
    expect(dispatch.mock.calls).toEqual([[300], [250]]);
  });

  it("floors reports to whole milliseconds and carries the fraction forward", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 50, dispatch });
    reporter.setEnabled(true);

    clock.advance(75.5);
    expect(dispatch.mock.calls).toEqual([[75]]);

    clock.advance(49.5);
    expect(dispatch.mock.calls).toEqual([[75], [50]]);
  });

  it("drops the sub-quantum tail on disable and re-anchors on enable", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 250, dispatch });

    reporter.setEnabled(true);
    clock.advance(100);
    reporter.setEnabled(false);
    expect(clock.pendingTickCount()).toBe(0);

    // Time passing while the gate is closed (hold pending, document hidden)
    // is never reported.
    clock.advance(10_000);

    reporter.setEnabled(true);
    clock.advance(250);
    expect(dispatch.mock.calls).toEqual([[250]]);
  });

  it("drops a stalled span and re-anchors instead of delivering one giant tick", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 100, dispatch });
    reporter.setEnabled(true);

    // Just below the default threshold (max(5000, 4×quantum)) still reports.
    clock.advance(4_999);
    expect(dispatch.mock.calls).toEqual([[4999]]);

    // An at-threshold span means the clock was suspended (occluded window,
    // OS sleep, main-thread stall): dropped entirely, anchor moves to now.
    clock.advance(5_000);
    expect(dispatch.mock.calls).toEqual([[4999]]);

    // Reporting resumes at the normal cadence from the new anchor.
    clock.advance(100);
    expect(dispatch.mock.calls).toEqual([[4999], [100]]);
    reporter.dispose();
  });

  it("honors an explicit stall threshold and validates it against the quantum", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    for (const bad of [50, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createSessionTimeReporterV1({ clock, quantumMs: 100, stallThresholdMs: bad, dispatch })
      ).toThrow(TypeError);
    }

    const reporter = createSessionTimeReporterV1({
      clock,
      quantumMs: 100,
      stallThresholdMs: 1_000,
      dispatch,
    });
    reporter.setEnabled(true);
    clock.advance(999);
    expect(dispatch.mock.calls).toEqual([[999]]);
    clock.advance(1_000);
    expect(dispatch.mock.calls).toEqual([[999]]);
    clock.advance(100);
    expect(dispatch.mock.calls).toEqual([[999], [100]]);
    reporter.dispose();
  });

  it("ignores a redundant enable instead of re-anchoring", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 250, dispatch });

    reporter.setEnabled(true);
    clock.advance(100);
    reporter.setEnabled(true);
    clock.advance(150);
    expect(dispatch.mock.calls).toEqual([[250]]);
  });

  it("latches faulted when the dispatch rejects", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => false);
    const onFault = vi.fn();
    const reporter = createSessionTimeReporterV1({
      clock,
      quantumMs: 100,
      dispatch,
      onFault,
    });

    reporter.setEnabled(true);
    clock.advance(100);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onFault).toHaveBeenCalledTimes(1);
    expect(clock.pendingTickCount()).toBe(0);

    reporter.setEnabled(true);
    clock.advance(1_000);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onFault).toHaveBeenCalledTimes(1);
  });

  it("stops rescheduling when the dispatch closes the gate reentrantly", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn((_elapsedMs: number) => {
      reporter.setEnabled(false);
      return true;
    });
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 100, dispatch });

    reporter.setEnabled(true);
    clock.advance(100);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(clock.pendingTickCount()).toBe(0);

    clock.advance(1_000);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("dispose cancels the pending tick and ignores later toggles", () => {
    const clock = createManualPresentationClockV1();
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({ clock, quantumMs: 100, dispatch });

    reporter.setEnabled(true);
    expect(clock.pendingTickCount()).toBe(1);
    reporter.dispose();
    expect(clock.pendingTickCount()).toBe(0);

    reporter.setEnabled(true);
    clock.advance(1_000);
    expect(dispatch).not.toHaveBeenCalled();
    reporter.dispose();
  });

  it("reads scaled time so rate and realtime pins shape what gets reported", () => {
    const inner = createManualPresentationClockV1();
    const rate = createPresentationRatePortV1({ inner });
    const dispatch = vi.fn(() => true);
    const reporter = createSessionTimeReporterV1({
      clock: rate.clock,
      quantumMs: 200,
      dispatch,
    });

    reporter.setEnabled(true);
    rate.setRate(2);
    inner.advance(100);
    expect(dispatch.mock.calls).toEqual([[200]]);

    const release = rate.pinRealtime();
    inner.advance(100);
    expect(dispatch.mock.calls).toEqual([[200]]);
    inner.advance(100);
    expect(dispatch.mock.calls).toEqual([[200], [200]]);

    release();
    inner.advance(100);
    expect(dispatch.mock.calls).toEqual([[200], [200], [200]]);
  });
});
