// SPDX-License-Identifier: MIT
import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import { createAnimationFramePresentationClockV1 } from "./presentation-clock.ts";
import type { PresentationClockV1 } from "./presentation-clock.ts";

/**
 * Presentation freeze: a developer-tool pause for the presentation plane.
 * Freezing holds the shared presentation clock (in-flight stage motions,
 * timeline cues, and the typewriter reveal all halt mid-frame) and swallows
 * gameplay input through the InputRouter, while dev surfaces (tool windows,
 * inspect hit regions) keep working. Resuming offsets the clock by the
 * frozen duration so time stays continuous and monotonic — transitions
 * continue from the exact held frame instead of jumping or replaying.
 *
 * This is presentation-only: the authoritative core is command-driven and
 * never reads this clock, so Saves, replay, and determinism are untouched.
 * Stages freeze only when they render with the shared `clock` (mounted
 * stages default to a private animation-frame clock otherwise).
 */
export interface PresentationFreezeStateV1 {
  readonly frozen: boolean;
}

export interface PresentationFreezePortV1 {
  /** The shared pausable clock; pass it to `SemanticStageV1 clock=`. */
  readonly clock: PresentationClockV1;
  readonly state: {
    getCurrent(): PresentationFreezeStateV1;
    subscribe(listener: () => void): () => void;
  };
  /** Idempotent. */
  pause(): void;
  /** Idempotent. */
  resume(): void;
  /** Engine-internal: attach the composition's InputRouter once it exists. */
  bindInputRouterInternalV1(router: InputRouterV1): () => void;
}

const frozenStateV1 = Object.freeze({ frozen: true }) satisfies PresentationFreezeStateV1;
const liveStateV1 = Object.freeze({ frozen: false }) satisfies PresentationFreezeStateV1;

export function createPresentationFreezePortV1(input?: {
  readonly inner?: PresentationClockV1;
}): PresentationFreezePortV1 {
  const inner = input?.inner ?? createAnimationFramePresentationClockV1();
  let pausedAt: number | null = null;
  let offset = 0;
  let parked = new Map<number, (now: number) => void>();
  let nextHandle = 1;
  let router: InputRouterV1 | null = null;
  let unregisterInput: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const park = (callback: (now: number) => void): () => void => {
    const handle = nextHandle;
    nextHandle += 1;
    parked.set(handle, callback);
    return () => {
      parked.delete(handle);
    };
  };

  const requestInner = (callback: (now: number) => void): () => void => {
    let cancelled = false;
    let cancelParked: (() => void) | null = null;
    const cancelInner = inner.requestTick((timestamp) => {
      if (cancelled) return;
      // A tick that lands while frozen parks until resume; the callback
      // then sees continuous offset-corrected time.
      if (pausedAt !== null) {
        cancelParked = park(callback);
        return;
      }
      callback(timestamp - offset);
    });
    return () => {
      cancelled = true;
      cancelInner();
      cancelParked?.();
    };
  };

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const registerInputSwallow = (): void => {
    if (router === null || unregisterInput !== null) return;
    unregisterInput = router.register({
      context: "debug",
      handle(event) {
        return event.kind === "focus_loss" || event.kind === "pointer_cancel"
          ? inputIgnoredV1
          : inputHandledV1;
      },
    });
  };
  const releaseInputSwallow = (): void => {
    unregisterInput?.();
    unregisterInput = null;
  };

  return Object.freeze({
    clock: Object.freeze({
      now: () => (pausedAt ?? inner.now()) - offset,
      requestTick(callback: (now: number) => void): () => void {
        if (pausedAt !== null) return park(callback);
        return requestInner(callback);
      },
    }),
    state: Object.freeze({
      getCurrent: () => (pausedAt === null ? liveStateV1 : frozenStateV1),
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    }),
    pause(): void {
      if (pausedAt !== null) return;
      pausedAt = inner.now();
      registerInputSwallow();
      notify();
    },
    resume(): void {
      if (pausedAt === null) return;
      offset += inner.now() - pausedAt;
      pausedAt = null;
      releaseInputSwallow();
      // Parked ticks re-enter the live clock and fire on the next frame.
      const waiting = parked;
      parked = new Map();
      for (const callback of waiting.values()) requestInner(callback);
      notify();
    },
    bindInputRouterInternalV1(nextRouter: InputRouterV1): () => void {
      router = nextRouter;
      if (pausedAt !== null) registerInputSwallow();
      return () => {
        releaseInputSwallow();
        router = null;
      };
    },
  });
}
