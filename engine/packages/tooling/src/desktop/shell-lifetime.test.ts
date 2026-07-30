// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  adoptShellWindowV1,
  createShellLifetimeWatchdogV1,
  type ShellWindowLikeV1,
} from "./shell-lifetime.mts";

function fixtureV1(options?: { staleMs?: number; goodbyeGraceMs?: number; tickMs?: number }) {
  let at = 0;
  let exits = 0;
  const watchdog = createShellLifetimeWatchdogV1({
    exit: () => {
      exits += 1;
    },
    now: () => at,
    staleMs: options?.staleMs ?? 120_000,
    goodbyeGraceMs: options?.goodbyeGraceMs ?? 10_000,
    tickMs: options?.tickMs ?? 5_000,
  });
  const advance = (ms: number, step = 5_000): void => {
    const end = at + ms;
    while (at < end) {
      at = Math.min(at + step, end);
      watchdog.tick();
    }
  };
  return {
    watchdog,
    advance,
    setAt: (value: number) => {
      at = value;
    },
    exits: () => exits,
  };
}

describe("shell lifetime watchdog", () => {
  it("never exits before the page ever contacts the shell", () => {
    const fixture = fixtureV1();
    fixture.advance(600_000);
    expect(fixture.exits()).toBe(0);
  });

  it("stays alive while heartbeats keep arriving", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markRequest();
    for (let i = 0; i < 100; i += 1) {
      fixture.advance(30_000);
      fixture.watchdog.markRequest();
    }
    expect(fixture.exits()).toBe(0);
  });

  it("exits exactly once after the stale window with no requests", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markRequest();
    fixture.advance(119_000);
    expect(fixture.exits()).toBe(0);
    fixture.advance(60_000);
    expect(fixture.exits()).toBe(1);
    fixture.advance(60_000);
    expect(fixture.exits()).toBe(1);
  });

  it("exits after an unanswered goodbye grace", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markRequest();
    fixture.watchdog.markGoodbye();
    fixture.advance(9_000, 3_000);
    expect(fixture.exits()).toBe(0);
    fixture.advance(6_000, 3_000);
    expect(fixture.exits()).toBe(1);
  });

  it("a follow-up request (reload) disarms the goodbye", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markRequest();
    fixture.watchdog.markGoodbye();
    fixture.advance(5_000, 2_500);
    fixture.watchdog.markRequest();
    fixture.advance(60_000);
    expect(fixture.exits()).toBe(0);
  });

  it("ignores a goodbye before any request", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markGoodbye();
    fixture.advance(600_000);
    expect(fixture.exits()).toBe(0);
  });

  it("re-arms instead of exiting across a suspend wall-clock jump", () => {
    const fixture = fixtureV1();
    fixture.watchdog.markRequest();
    fixture.advance(10_000);
    // Machine sleeps for an hour: both the shell interval and page timers
    // were paused, so the first tick after wake must not treat it as stale.
    fixture.setAt(3_610_000);
    fixture.watchdog.tick();
    expect(fixture.exits()).toBe(0);
    // The page heartbeats again shortly after wake and the shell lives on.
    fixture.watchdog.markRequest();
    fixture.advance(60_000);
    expect(fixture.exits()).toBe(0);
  });
});

describe("shell window adoption", () => {
  it("adopts the startup window and exits on the native close request", () => {
    let exits = 0;
    const listeners: Record<string, () => void> = {};
    let constructed = 0;
    class FakeWindow implements ShellWindowLikeV1 {
      constructor() {
        constructed += 1;
      }
      addEventListener(type: "close", listener: () => void): void {
        listeners[type] = listener;
      }
    }
    const adopted = adoptShellWindowV1({
      browserWindow: FakeWindow,
      exit: () => {
        exits += 1;
      },
    });
    expect(adopted).toBe(true);
    expect(constructed).toBe(1);
    expect(exits).toBe(0);
    listeners["close"]?.();
    expect(exits).toBe(1);
  });

  it("returns false outside the desktop runtime (no BrowserWindow global)", () => {
    expect(adoptShellWindowV1({ browserWindow: undefined, exit: () => {} })).toBe(false);
  });

  it("falls back to an options-object construction before giving up", () => {
    let optionCalls = 0;
    class NeedsOptions implements ShellWindowLikeV1 {
      constructor(options?: Record<never, never>) {
        if (options === undefined) throw new Error("options required");
        optionCalls += 1;
      }
      addEventListener(): void {}
    }
    expect(adoptShellWindowV1({ browserWindow: NeedsOptions, exit: () => {} })).toBe(true);
    expect(optionCalls).toBe(1);

    class AlwaysThrows implements ShellWindowLikeV1 {
      constructor() {
        throw new Error("no window backend");
      }
      addEventListener(): void {}
    }
    expect(adoptShellWindowV1({ browserWindow: AlwaysThrows, exit: () => {} })).toBe(false);
  });
});
