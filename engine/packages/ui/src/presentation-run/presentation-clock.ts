// SPDX-License-Identifier: MIT

/**
 * The Host-neutral presentation clock. Browser hosts anchor it to
 * requestAnimationFrame and performance.now(); unit and headless tests use
 * the deterministic manual clock. Ticks are one-shot like rAF: consumers
 * re-request while they remain active.
 */
export interface PresentationClockV1 {
  now(): number;
  /** Request one tick; returns a cancel function. */
  requestTick(callback: (now: number) => void): () => void;
}

export interface ManualPresentationClockV1 extends PresentationClockV1 {
  /** Advance time and fire the ticks that were pending before the call. */
  advance(milliseconds: number): void;
  /** Ticks currently waiting for the next advance. */
  pendingTickCount(): number;
}

export function createManualPresentationClockV1(): ManualPresentationClockV1 {
  let current = 0;
  let pending = new Map<number, (now: number) => void>();
  let nextHandle = 1;

  return {
    now: () => current,
    requestTick(callback: (now: number) => void): () => void {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, callback);
      return () => {
        pending.delete(handle);
      };
    },
    advance(milliseconds: number): void {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        throw new TypeError("manual clock can only advance forward");
      }
      current += milliseconds;
      // Callbacks re-requesting during the flush land in the NEXT advance,
      // mirroring requestAnimationFrame semantics.
      const flushing = pending;
      pending = new Map();
      for (const callback of flushing.values()) callback(current);
    },
    pendingTickCount: () => pending.size,
  };
}

export function createAnimationFramePresentationClockV1(): PresentationClockV1 {
  if (typeof requestAnimationFrame !== "function" || typeof performance === "undefined") {
    throw new TypeError("animation-frame presentation clock requires a browser host");
  }
  return {
    now: () => performance.now(),
    requestTick(callback: (now: number) => void): () => void {
      const handle = requestAnimationFrame((timestamp) => callback(timestamp));
      return () => cancelAnimationFrame(handle);
    },
  };
}
