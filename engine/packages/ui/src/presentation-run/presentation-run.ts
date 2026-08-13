// SPDX-License-Identifier: MIT
import type { PresentationClockV1 } from "./presentation-clock.ts";

/**
 * The minimal reusable presentation-run lifecycle. The Transition Player is
 * the first consumer; the future Timeline must reuse this same clock,
 * lifecycle, interruption, and completion fencing instead of growing a
 * second player. A run never touches gameplay State.
 */

export type PresentationRunStatusV1 = "pending" | "running" | "paused" | "settled" | "cancelled";

export type PresentationRunOutcomeV1 = "completed" | "skipped" | "interrupted" | "cancelled";

export interface PresentationRunV1 {
  readonly runId: string;
  readonly definitionId: string;
  readonly epoch: number;
  status(): PresentationRunStatusV1;
  /** Eased progress in [0, 1]; exactly 1 once settled. */
  progress(): number;
  start(): void;
  pause(): void;
  resume(): void;
  /** Jump to the end state and finish with outcome "skipped". */
  skipToEnd(): void;
  /** Finish instantly at the end state with outcome "interrupted". */
  settleNow(): void;
  /** Abandon the run with outcome "cancelled"; progress freezes. */
  cancel(): void;
  /**
   * Scrubs the run to an elapsed time in [0, durationMs] without finishing
   * it: a pending run becomes paused at that offset, a paused run stays
   * paused, and a running run continues from there. Parking at the end
   * never fires completion — only running playback that reaches the end
   * (or an explicit skip/settle) finishes the run. Settled and cancelled
   * runs ignore seeks.
   */
  seek(elapsedMs: number): void;
  subscribe(listener: () => void): () => void;
  /** Silently drop the run: no outcome callback, no further ticks. */
  dispose(): void;
}

export interface CreatePresentationRunOptionsV1 {
  readonly runId: string;
  readonly definitionId: string;
  readonly epoch: number;
  readonly durationMs: number;
  readonly clock: PresentationClockV1;
  readonly easing?: (linearProgress: number) => number;
  /** Fires exactly once per run, never after dispose. */
  onFinished?(outcome: PresentationRunOutcomeV1): void;
}

const identityEasingV1 = (value: number): number => value;

export function createPresentationRunV1(
  options: CreatePresentationRunOptionsV1,
): PresentationRunV1 {
  const easing = options.easing ?? identityEasingV1;
  const listeners = new Set<() => void>();

  let status: PresentationRunStatusV1 = "pending";
  let startedAt = 0;
  let pausedElapsed = 0;
  let finalLinearProgress = 0;
  let cancelTick: (() => void) | undefined;
  let disposed = false;

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const linearProgress = (): number => {
    if (status === "settled") return 1;
    if (status === "cancelled") return finalLinearProgress;
    if (status === "pending") return 0;
    if (options.durationMs <= 0) return 1;
    const elapsed = status === "paused"
      ? pausedElapsed
      : pausedElapsed + (options.clock.now() - startedAt);
    return Math.min(1, Math.max(0, elapsed / options.durationMs));
  };

  const stopTicking = (): void => {
    cancelTick?.();
    cancelTick = undefined;
  };

  const finish = (outcome: PresentationRunOutcomeV1): void => {
    stopTicking();
    finalLinearProgress = outcome === "cancelled" ? linearProgress() : 1;
    status = outcome === "cancelled" ? "cancelled" : "settled";
    notify();
    if (!disposed) options.onFinished?.(outcome);
  };

  const tick = (): void => {
    if (status !== "running") return;
    if (linearProgress() >= 1) {
      finish("completed");
      return;
    }
    notify();
    scheduleTick();
  };

  const scheduleTick = (): void => {
    stopTicking();
    cancelTick = options.clock.requestTick(() => {
      cancelTick = undefined;
      tick();
    });
  };

  return Object.freeze({
    runId: options.runId,
    definitionId: options.definitionId,
    epoch: options.epoch,
    status: () => status,
    progress: () => easing(linearProgress()),
    start(): void {
      if (status !== "pending") return;
      status = "running";
      startedAt = options.clock.now();
      pausedElapsed = 0;
      if (options.durationMs <= 0) {
        finish("completed");
        return;
      }
      notify();
      scheduleTick();
    },
    pause(): void {
      if (status !== "running") return;
      pausedElapsed += options.clock.now() - startedAt;
      status = "paused";
      stopTicking();
      notify();
    },
    resume(): void {
      if (status !== "paused") return;
      status = "running";
      startedAt = options.clock.now();
      notify();
      scheduleTick();
    },
    skipToEnd(): void {
      if (status === "settled" || status === "cancelled") return;
      finish("skipped");
    },
    settleNow(): void {
      if (status === "settled" || status === "cancelled") return;
      finish("interrupted");
    },
    cancel(): void {
      if (status === "settled" || status === "cancelled") return;
      finish("cancelled");
    },
    seek(elapsedMs: number): void {
      if (status === "settled" || status === "cancelled") return;
      if (!Number.isFinite(elapsedMs)) return;
      const clamped = options.durationMs <= 0
        ? 0
        : Math.min(options.durationMs, Math.max(0, elapsedMs));
      if (status === "running") {
        startedAt = options.clock.now();
        pausedElapsed = clamped;
      } else {
        // pending and paused both park at the offset; resume() continues.
        status = "paused";
        pausedElapsed = clamped;
        stopTicking();
      }
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose(): void {
      disposed = true;
      stopTicking();
      listeners.clear();
      if (status !== "settled" && status !== "cancelled") {
        finalLinearProgress = linearProgress();
        status = "cancelled";
      }
    },
  });
}

/** The smooth-step curve used for `ease_in_out` transition definitions. */
export function easeInOutV1(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}
