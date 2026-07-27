// SPDX-License-Identifier: MIT
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";

/**
 * The explicit playback policy machine: normal, auto, and skip. The
 * controller never invents gameplay: every advance goes through the exact
 * same Story-provided resolution dispatch (the shared interaction
 * resolution contract), and the queue front rejects anything stale. Its
 * mode and timers are UI transient state — nothing here persists or writes
 * authoritative State.
 */

export type PlaybackModeV1 = "normal" | "auto" | "skip";

export interface PlaybackBoundaryV1 {
  /** The pending interaction kind, or null when nothing is pending. */
  readonly kind: "say" | "choice" | "pause" | "presentation_barrier" | "custom" | null;
  readonly occurrenceId: string | null;
  readonly definitionId: string | null;
  readonly seenRevision: number;
  /** Say lines only advance automatically once the text fully revealed. */
  readonly textRevealComplete: boolean;
}

export interface PlaybackPolicyInputV1 {
  readonly autoWaitMs: number;
  readonly skipStepMs: number;
  readonly skipPolicy: "skip_read" | "skip_all";
}

export interface CreatePlaybackControllerOptionsV1 {
  readonly clock: PresentationClockV1;
  readonly policy: PlaybackPolicyInputV1;
  isSeen(definitionId: string, seenRevision: number): boolean;
  /** Dispatches the say advance through the shared resolution contract. */
  advance(occurrenceId: string): void;
}

export interface PlaybackControllerV1 {
  mode(): PlaybackModeV1;
  setMode(mode: PlaybackModeV1): void;
  /**
   * Reports the current boundary. Auto advances a revealed say after the
   * configured wait; skip advances says immediately (read-only under
   * skip_read) and both stop at choices, barriers, pauses, custom
   * surfaces, and — for skip_read — unread lines, dropping back to normal.
   */
  observeBoundary(boundary: PlaybackBoundaryV1): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export function createPlaybackControllerV1(
  options: CreatePlaybackControllerOptionsV1,
): PlaybackControllerV1 {
  const listeners = new Set<() => void>();
  let mode: PlaybackModeV1 = "normal";
  let boundary: PlaybackBoundaryV1 | null = null;
  let cancelTimer: (() => void) | undefined;
  let timerFor: string | null = null;
  let disposed = false;

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const stopTimer = (): void => {
    cancelTimer?.();
    cancelTimer = undefined;
    timerFor = null;
  };

  const dropToNormal = (): void => {
    if (mode === "normal") return;
    mode = "normal";
    stopTimer();
    notify();
  };

  const scheduleAdvance = (occurrenceId: string, delayMs: number): void => {
    if (timerFor === occurrenceId) return;
    stopTimer();
    timerFor = occurrenceId;
    const deadline = options.clock.now() + delayMs;
    const tick = (): void => {
      cancelTimer = undefined;
      if (disposed || timerFor !== occurrenceId) return;
      if (options.clock.now() >= deadline) {
        timerFor = null;
        // The queue front re-validates the occurrence; a stale advance from
        // this timer is rejected there, never double-applied.
        options.advance(occurrenceId);
        return;
      }
      cancelTimer = options.clock.requestTick(tick);
    };
    cancelTimer = options.clock.requestTick(tick);
  };

  const evaluate = (): void => {
    if (disposed || boundary === null) return;
    if (mode === "normal") {
      stopTimer();
      return;
    }
    const { kind, occurrenceId, definitionId, seenRevision, textRevealComplete } = boundary;
    if (kind === null || occurrenceId === null) {
      stopTimer();
      return;
    }
    if (kind !== "say") {
      // Choices, pauses, barriers, and custom surfaces stop playback.
      stopTimer();
      dropToNormal();
      return;
    }
    if (mode === "skip") {
      const seen = definitionId !== null && options.isSeen(definitionId, seenRevision);
      if (options.policy.skipPolicy === "skip_read" && !seen) {
        // Unread line under skip-read: stop skipping, keep the line.
        stopTimer();
        dropToNormal();
        return;
      }
      scheduleAdvance(occurrenceId, options.policy.skipStepMs);
      return;
    }
    // Auto: wait for the full reveal, then the configured beat.
    if (!textRevealComplete) {
      stopTimer();
      return;
    }
    scheduleAdvance(occurrenceId, options.policy.autoWaitMs);
  };

  return Object.freeze({
    mode: () => mode,
    setMode(next: PlaybackModeV1): void {
      if (disposed || next === mode) return;
      mode = next;
      stopTimer();
      notify();
      evaluate();
    },
    observeBoundary(next: PlaybackBoundaryV1): void {
      if (disposed) return;
      const previousOccurrence = boundary?.occurrenceId ?? null;
      boundary = next;
      if (previousOccurrence !== next.occurrenceId) stopTimer();
      evaluate();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose(): void {
      disposed = true;
      stopTimer();
      listeners.clear();
    },
  });
}
