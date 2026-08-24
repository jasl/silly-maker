// SPDX-License-Identifier: MIT
import { createAnimationFramePresentationClockV1 } from "./presentation-clock.ts";
import type { PresentationClockV1 } from "./presentation-clock.ts";

/**
 * Presentation rate: a playback-rate multiplier for the shared presentation
 * clock (the `Time.timeScale` / media `playbackRate` idiom). Scaled time is
 * continuous and monotonic across rate changes: every effective-rate change
 * re-anchors at the current scaled instant instead of rescaling history, so
 * in-flight motions, hold ticks, typewriter reveal, and auto/skip dwells
 * simply run faster or slower from that instant on.
 *
 * Two inputs compose into the effective rate:
 *
 * - `setRate` — the requested multiplier (debug dock knob, story
 *   fast-forward). Owned by whoever drives playback speed.
 * - `pinRealtime` — the fairness pin for realtime pace windows (declared by
 *   `pace: "realtime"` holds and monitors): while at least one pin is
 *   outstanding the clock runs at exactly 1x, so a reaction window's
 *   presented duration matches wall time no matter what rate was requested.
 *   Pins count; the requested rate resumes when every release has run.
 *
 * This is presentation-only: the authoritative core consumes reported
 * milliseconds (already scaled by the time they reach a command), so Saves,
 * digests, replay, and determinism are untouched. Neither the rate nor the
 * pin ever enters State.
 *
 * Composition order: the rate port wraps the raw host clock, and the freeze
 * port wraps the rate port (`createPresentationFreezePortV1({ inner:
 * rate.clock })`) — freezing pauses scaled time, resuming continues it.
 */
export interface PresentationRateStateV1 {
  /** The requested multiplier, as set by `setRate`. */
  readonly rate: number;
  /** The multiplier actually applied to the clock: 1 while pinned. */
  readonly effectiveRate: number;
  /** Whether at least one realtime pace pin is outstanding. */
  readonly pinned: boolean;
}

export interface PresentationRatePortV1 {
  /** The scaled clock; pass it as the freeze port's `inner`. */
  readonly clock: PresentationClockV1;
  readonly state: {
    getCurrent(): PresentationRateStateV1;
    subscribe(listener: () => void): () => void;
  };
  /** Set the requested multiplier; must be finite and > 0. Idempotent per value. */
  setRate(rate: number): void;
  /**
   * Pin the effective rate to exactly 1x for the duration of a realtime pace
   * window. Returns the release; releasing is idempotent. Concurrent windows
   * stack — the requested rate resumes only when all pins are released.
   */
  pinRealtime(): () => void;
}

export function createPresentationRatePortV1(input?: {
  readonly inner?: PresentationClockV1;
}): PresentationRatePortV1 {
  const inner = input?.inner ?? createAnimationFramePresentationClockV1();
  let requestedRate = 1;
  let effectiveRate = 1;
  let pinCount = 0;
  let anchorBase = inner.now();
  let anchorScaled = anchorBase;
  let current: PresentationRateStateV1 = {
    rate: 1,
    effectiveRate: 1,
    pinned: false,
  };
  const listeners = new Set<() => void>();

  const scaledNow = (): number => anchorScaled + (inner.now() - anchorBase) * effectiveRate;

  const commit = (): void => {
    const nextEffective = pinCount > 0 ? 1 : requestedRate;
    if (nextEffective !== effectiveRate) {
      anchorScaled = scaledNow();
      anchorBase = inner.now();
      effectiveRate = nextEffective;
    }
    const next: PresentationRateStateV1 = {
      rate: requestedRate,
      effectiveRate,
      pinned: pinCount > 0,
    };
    if (
      next.rate === current.rate &&
      next.effectiveRate === current.effectiveRate &&
      next.pinned === current.pinned
    ) {
      return;
    }
    current = next;
    for (const listener of [...listeners]) listener();
  };

  return {
    clock: {
      now: scaledNow,
      requestTick: (callback: (now: number) => void) =>
        inner.requestTick(() => callback(scaledNow())),
    },
    state: {
      getCurrent: () => current,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    setRate(next: number): void {
      if (!Number.isFinite(next) || next <= 0) {
        throw new TypeError("presentation rate must be a finite number > 0");
      }
      if (next === requestedRate) return;
      requestedRate = next;
      commit();
    },
    pinRealtime(): () => void {
      pinCount += 1;
      commit();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        pinCount -= 1;
        commit();
      };
    },
  };
}
