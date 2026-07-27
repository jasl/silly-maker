// SPDX-License-Identifier: MIT
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.js";

/**
 * Clock-driven typewriter reveal for one line occurrence. The reveal cursor
 * is UI transient state: it is never persisted, and a load or occurrence
 * change simply builds a fresh controller. Reduced motion or a zero
 * chars-per-second preference reveals instantly.
 */

export interface TextRevealV1 {
  /** Characters currently visible, in [0, textLength]. */
  revealedCharacters(): number;
  isComplete(): boolean;
  /** Jump to the full text (the first confirm of two-step advancing). */
  revealAll(): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface CreateTextRevealOptionsV1 {
  readonly textLength: number;
  /** 0 reveals instantly. */
  readonly charactersPerSecond: number;
  readonly clock: PresentationClockV1;
  readonly reducedMotion?: boolean;
}

export function createTextRevealV1(options: CreateTextRevealOptionsV1): TextRevealV1 {
  const listeners = new Set<() => void>();
  const instant =
    options.reducedMotion === true || options.charactersPerSecond <= 0 || options.textLength === 0;
  let revealed = instant ? options.textLength : 0;
  let cancelTick: (() => void) | undefined;
  let disposed = false;
  const startedAt = options.clock.now();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const stopTicking = (): void => {
    cancelTick?.();
    cancelTick = undefined;
  };

  const tick = (): void => {
    if (disposed || revealed >= options.textLength) return;
    const elapsedSeconds = (options.clock.now() - startedAt) / 1000;
    const next = Math.min(
      options.textLength,
      Math.floor(elapsedSeconds * options.charactersPerSecond),
    );
    if (next !== revealed) {
      revealed = next;
      notify();
    }
    if (revealed < options.textLength) schedule();
  };

  const schedule = (): void => {
    stopTicking();
    cancelTick = options.clock.requestTick(() => {
      cancelTick = undefined;
      tick();
    });
  };

  if (!instant) schedule();

  return Object.freeze({
    revealedCharacters: () => revealed,
    isComplete: () => revealed >= options.textLength,
    revealAll(): void {
      if (disposed || revealed >= options.textLength) return;
      revealed = options.textLength;
      stopTicking();
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
    },
  });
}
