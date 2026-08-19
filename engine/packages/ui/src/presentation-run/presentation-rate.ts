// SPDX-License-Identifier: MIT
import { createAnimationFramePresentationClockV1 } from "./presentation-clock.ts";
import type { PresentationClockV1 } from "./presentation-clock.ts";

/**
 * Presentation rate: a playback-rate multiplier for the shared presentation
 * clock (the `Time.timeScale` / media `playbackRate` idiom). Scaled time is
 * continuous and monotonic across rate changes: `setRate` re-anchors at the
 * current scaled instant instead of rescaling history, so in-flight motions,
 * hold ticks, typewriter reveal, and auto/skip dwells simply run faster or
 * slower from that instant on.
 *
 * This is presentation-only: the authoritative core consumes reported
 * milliseconds (already scaled by the time they reach a command), so Saves,
 * digests, replay, and determinism are untouched. The rate itself never
 * enters State.
 *
 * Composition order: the rate port wraps the raw host clock, and the freeze
 * port wraps the rate port (`createPresentationFreezePortV1({ inner:
 * rate.clock })`) — freezing pauses scaled time, resuming continues it.
 */
export interface PresentationRateStateV1 {
  readonly rate: number;
}

export interface PresentationRatePortV1 {
  /** The scaled clock; pass it as the freeze port's `inner`. */
  readonly clock: PresentationClockV1;
  readonly state: {
    getCurrent(): PresentationRateStateV1;
    subscribe(listener: () => void): () => void;
  };
  /** Set the multiplier; must be finite and > 0. Idempotent per value. */
  setRate(rate: number): void;
}

export function createPresentationRatePortV1(input?: {
  readonly inner?: PresentationClockV1;
}): PresentationRatePortV1 {
  const inner = input?.inner ?? createAnimationFramePresentationClockV1();
  let rate = 1;
  let anchorBase = inner.now();
  let anchorScaled = anchorBase;
  let current: PresentationRateStateV1 = Object.freeze({ rate: 1 });
  const listeners = new Set<() => void>();

  const scaledNow = (): number => anchorScaled + (inner.now() - anchorBase) * rate;

  return Object.freeze({
    clock: Object.freeze({
      now: scaledNow,
      requestTick: (callback: (now: number) => void) =>
        inner.requestTick(() => callback(scaledNow())),
    }),
    state: Object.freeze({
      getCurrent: () => current,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    }),
    setRate(next: number): void {
      if (!Number.isFinite(next) || next <= 0) {
        throw new TypeError("presentation rate must be a finite number > 0");
      }
      if (next === rate) return;
      anchorScaled = scaledNow();
      anchorBase = inner.now();
      rate = next;
      current = Object.freeze({ rate: next });
      for (const listener of [...listeners]) listener();
    },
  });
}
