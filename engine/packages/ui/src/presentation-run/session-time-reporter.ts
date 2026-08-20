// SPDX-License-Identifier: MIT
import type { PresentationClockV1 } from "./presentation-clock.ts";

/**
 * The session time reporter: the Host-side metronome that feeds unfenced
 * session time (`TimeTickV1` without a hold fence) to the authoritative
 * session so monitors accumulate while ordinary interactions — say lines,
 * choice menus, free navigation — are pending. It reads elapsed time from
 * the composed presentation clock (rate-scaled, freeze-aware), batches it
 * into quantum-sized integer reports, and hands each report to the story's
 * time dispatch. Wall-clock timestamps never leave this module; only whole
 * elapsed milliseconds reach a command.
 *
 * One elapsed span must enter authority exactly once. Hold pendings already
 * report their own time through the hold expiry controller's fenced ticks
 * (which settle monitors too), so the gate that drives `setEnabled` MUST be
 * false while a hold is pending — the composer owns that conjunction. The
 * same gate is the stop-the-clock hook: disabling drops the sub-quantum
 * tail and re-enabling re-anchors at the current instant, so time that
 * passes while reporting is off (gate closed, document hidden) is never
 * reported.
 *
 * A rejected dispatch latches the reporter faulted: session time is
 * unconditionally admissible, so a rejection means the story's time command
 * is miswired, and re-reporting every quantum would only spam the command
 * log. `dispose` (or a new reporter) is the only way out of the latch.
 */
export interface SessionTimeReporterV1 {
  /**
   * Open or close the reporting gate. Enabling anchors at the current
   * scaled instant; disabling cancels the pending tick and drops any
   * accumulated sub-quantum remainder. Redundant calls are no-ops (a
   * repeated enable does not re-anchor).
   */
  setEnabled(enabled: boolean): void;
  /** Stop permanently and release the pending tick. Idempotent. */
  dispose(): void;
}

export function createSessionTimeReporterV1(input: {
  readonly clock: PresentationClockV1;
  /**
   * Minimum report batch in scaled milliseconds: a report is dispatched
   * once at least this much time has accumulated since the anchor. Must be
   * a finite number >= 1 so every report floors to a positive integer.
   */
  readonly quantumMs: number;
  /**
   * Deliver one unfenced session time report. Returns whether the dispatch
   * was accepted; `false` latches the reporter faulted.
   */
  readonly dispatch: (elapsedMs: number) => boolean;
  /** Observes the fault latch engaging; called at most once. */
  readonly onFault?: () => void;
}): SessionTimeReporterV1 {
  if (!Number.isFinite(input.quantumMs) || input.quantumMs < 1) {
    throw new TypeError("session time reporter quantumMs must be a finite number >= 1");
  }
  const { clock, quantumMs, dispatch } = input;
  let enabled = false;
  let faulted = false;
  let disposed = false;
  let anchor = 0;
  let cancelTick: (() => void) | null = null;

  const stopTicking = (): void => {
    if (cancelTick !== null) {
      cancelTick();
      cancelTick = null;
    }
  };

  const step = (now: number): void => {
    cancelTick = null;
    if (!enabled || faulted || disposed) return;
    const elapsed = now - anchor;
    if (elapsed >= quantumMs) {
      const wholeMs = Math.floor(elapsed);
      // Advance the anchor by exactly the reported amount so fractional
      // remainders carry into the next batch instead of being lost.
      anchor += wholeMs;
      if (!dispatch(wholeMs)) {
        faulted = true;
        input.onFault?.();
        return;
      }
      // The dispatch may have closed the gate reentrantly (a commit that
      // deactivates the reporting predicate); respect it before rescheduling.
      if (!enabled || disposed) return;
    }
    cancelTick = clock.requestTick(step);
  };

  return Object.freeze({
    setEnabled(next: boolean): void {
      if (disposed || faulted || next === enabled) return;
      enabled = next;
      if (next) {
        anchor = clock.now();
        cancelTick = clock.requestTick(step);
        return;
      }
      stopTicking();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      enabled = false;
      stopTicking();
    },
  });
}
