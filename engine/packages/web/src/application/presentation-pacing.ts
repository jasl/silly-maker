// SPDX-License-Identifier: MIT
import { createSessionTimeReporterV1 } from "@sillymaker/ui";
import type { PresentationClockV1 } from "@sillymaker/ui";

/**
 * Host-side presentation pacing: the one place that turns declared pacing
 * intent into live behavior. It owns two composed duties:
 *
 * - the **session time reporter** gate — unfenced session time flows only
 *   while the Story's `timeReporting.enabledWhen` predicate holds over the
 *   live publication, no hold is pending (hold time arrives through the
 *   narrative surface's fenced ticks; one elapsed span never enters
 *   authority twice), and the document is visible (hidden time is dropped,
 *   not accumulated);
 * - the **realtime rate pin** — while a `pace: "realtime"` hold is pending
 *   (engine-typed, automatic) or the Story's `realtimeWindow` predicate
 *   reports an active reaction window (Story-shaped monitor state), the
 *   presentation rate is pinned to exactly 1x.
 *
 * A throwing predicate or a rejected time dispatch is a wiring defect, not
 * a player-recoverable state: pacing reports the failure once and latches
 * the affected duty off (reporting stops; a declared-window pin is treated
 * as inactive) instead of retrying every publication.
 */
export interface PresentationPacingTimeReportingInternalV1 {
  readonly quantumMs: number;
  readonly enabledWhen: (publication: unknown) => boolean;
  readonly dispatch: (elapsedMs: number) => Promise<unknown>;
}

interface PresentationPacingPendingInternalV1 {
  readonly kind: string;
  readonly pace?: string;
}

export interface InstallPresentationPacingInputInternalV1 {
  readonly presentation: {
    getSnapshot(): unknown;
    subscribe(listener: () => void): () => void;
  };
  readonly narrative: {
    getCurrentSelectionInternalV1():
      | { readonly pending: PresentationPacingPendingInternalV1 | null }
      | null;
    subscribeInternalV1(listener: () => void): () => void;
  } | null;
  readonly rate: { pinRealtime(): () => void };
  readonly clock: PresentationClockV1;
  readonly timeReporting: PresentationPacingTimeReportingInternalV1 | null;
  readonly realtimeWindow: ((publication: unknown) => boolean) | null;
  /** Visibility source; null skips the visibility gate (headless hosts). */
  readonly visibility: {
    isHidden(): boolean;
    subscribe(listener: () => void): () => void;
  } | null;
  readonly reportFailure: (code: string, error: unknown) => void;
}

export function installPresentationPacingInternalV1(
  input: InstallPresentationPacingInputInternalV1,
): { dispose(): void } {
  const unsubscribes: (() => void)[] = [];
  let disposed = false;
  let releasePin: (() => void) | null = null;
  let realtimePredicateFaulted = false;
  let reporterFaulted = false;

  const currentPending = (): PresentationPacingPendingInternalV1 | null =>
    input.narrative?.getCurrentSelectionInternalV1()?.pending ?? null;

  const realtimeActive = (): boolean => {
    const pending = currentPending();
    if (pending !== null && pending.kind === "hold" && pending.pace === "realtime") {
      return true;
    }
    if (input.realtimeWindow === null || realtimePredicateFaulted) return false;
    try {
      return input.realtimeWindow(input.presentation.getSnapshot());
    } catch (error) {
      realtimePredicateFaulted = true;
      input.reportFailure("pacing.realtime_predicate_failed", error);
      return false;
    }
  };

  const reporter = input.timeReporting === null ? null : createSessionTimeReporterV1({
    clock: input.clock,
    quantumMs: input.timeReporting.quantumMs,
    dispatch: (elapsedMs) => {
      const reporting = input.timeReporting;
      if (reporting === null) return false;
      // Dispatch synchronously so the tick command enqueues in the same
      // frame as other inputs; an asynchronous rejection latches reporting
      // off out-of-band since the batch has already left the reporter.
      try {
        const outcome = reporting.dispatch(elapsedMs);
        void Promise.resolve(outcome).then(undefined, (error: unknown) => {
          // Several reports may be in flight before the first rejection
          // lands; the latch reports once and swallows the rest (including
          // rejections arriving after dispose against a torn-down host).
          if (reporterFaulted || disposed) return;
          reporterFaulted = true;
          input.reportFailure("pacing.time_report_failed", error);
          refresh();
        });
        return true;
      } catch (error) {
        reporterFaulted = true;
        input.reportFailure("pacing.time_report_failed", error);
        return false;
      }
    },
  });

  const reportingEnabled = (): boolean => {
    const reporting = input.timeReporting;
    if (reporting === null || reporterFaulted) return false;
    if (input.visibility !== null && input.visibility.isHidden()) return false;
    if (currentPending()?.kind === "hold") return false;
    try {
      return reporting.enabledWhen(input.presentation.getSnapshot());
    } catch (error) {
      reporterFaulted = true;
      input.reportFailure("pacing.reporting_predicate_failed", error);
      return false;
    }
  };

  const refresh = (): void => {
    if (disposed) return;
    const active = realtimeActive();
    if (active && releasePin === null) {
      releasePin = input.rate.pinRealtime();
    } else if (!active && releasePin !== null) {
      releasePin();
      releasePin = null;
    }
    reporter?.setEnabled(reportingEnabled());
  };

  unsubscribes.push(input.presentation.subscribe(refresh));
  if (input.narrative !== null) {
    unsubscribes.push(input.narrative.subscribeInternalV1(refresh));
  }
  if (input.visibility !== null) {
    unsubscribes.push(input.visibility.subscribe(refresh));
  }
  refresh();

  return ({
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
      reporter?.dispose();
      if (releasePin !== null) {
        releasePin();
        releasePin = null;
      }
    },
  });
}
