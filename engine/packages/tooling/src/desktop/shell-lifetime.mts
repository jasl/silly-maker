// SPDX-License-Identifier: MIT

/**
 * Shell lifetime watchdog: the `ln` runtime owns the window, but the shell
 * process is a plain `Deno.serve` loop that would outlive a closed window
 * forever. The served page heartbeats this prefix and sends a goodbye beacon
 * on `pagehide`; the shell exits when the page is gone.
 *
 * Running the shell headless (no page ever contacted it) never exits — the
 * watchdog only arms after the first request.
 */
export const desktopLifetimePathPrefixV1 = "/sillymaker/lifetime";

export interface ShellLifetimeWatchdogV1 {
  /** Any HTTP request from the page (including heartbeats). */
  markRequest(): void;
  /** `pagehide` goodbye beacon; a follow-up request (reload) disarms it. */
  markGoodbye(): void;
  /** Evaluate exit conditions once; driven by the shell's interval. */
  tick(): void;
}

export interface CreateShellLifetimeWatchdogOptionsV1 {
  readonly exit: () => void;
  readonly now?: () => number;
  /** Exit when no request arrived for this long (after first contact). */
  readonly staleMs?: number;
  /** Exit this long after an unanswered goodbye beacon. */
  readonly goodbyeGraceMs?: number;
  /** Expected tick cadence; a wall-clock jump beyond 4x means suspend. */
  readonly tickMs?: number;
}

export function createShellLifetimeWatchdogV1(
  options: CreateShellLifetimeWatchdogOptionsV1,
): ShellLifetimeWatchdogV1 {
  const now = options.now ?? ((): number => Date.now());
  // Hidden webviews throttle page timers down to about one beat per minute;
  // the stale window must comfortably out-wait that.
  const staleMs = options.staleMs ?? 120_000;
  // Must exceed the page heartbeat interval so a BFCache resume or reload
  // can disarm a goodbye before the grace elapses.
  const goodbyeGraceMs = options.goodbyeGraceMs ?? 10_000;
  const tickMs = options.tickMs ?? 5_000;
  let lastSeenAt: number | null = null;
  let goodbyeAt: number | null = null;
  let lastTickAt: number | null = null;
  let exited = false;
  const exitOnce = (): void => {
    if (exited) return;
    exited = true;
    options.exit();
  };
  return Object.freeze({
    markRequest(): void {
      lastSeenAt = now();
      goodbyeAt = null;
    },
    markGoodbye(): void {
      if (lastSeenAt === null) return;
      if (goodbyeAt === null) goodbyeAt = now();
    },
    tick(): void {
      const at = now();
      const previousTickAt = lastTickAt;
      lastTickAt = at;
      // System suspend pauses this process and the page's timers together; a
      // wall-clock jump must re-arm instead of exiting underneath a live page.
      if (previousTickAt !== null && at - previousTickAt > tickMs * 4) {
        if (lastSeenAt !== null) lastSeenAt = at;
        goodbyeAt = null;
        return;
      }
      if (goodbyeAt !== null && at - goodbyeAt >= goodbyeGraceMs) {
        exitOnce();
        return;
      }
      if (lastSeenAt !== null && at - lastSeenAt >= staleMs) exitOnce();
    },
  });
}
