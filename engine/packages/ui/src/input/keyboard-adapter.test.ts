// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { parseInputActionIdV1 } from "./contracts.ts";
import { installGamepadAdapterV1 } from "./gamepad-adapter.ts";
import type { GamepadLikeV1 } from "./gamepad-adapter.ts";
import { installKeyboardAdapterV1 } from "./keyboard-adapter.ts";

const advanceV1 = parseInputActionIdV1("narrative.advance");
const autoV1 = parseInputActionIdV1("player.toggle_auto");

function routerSpyV1(handled = true) {
  const route = vi.fn(() =>
    handled ? ({ kind: "handled", context: "narrative" } as const) : ({ kind: "ignored" } as const),
  );
  return { route };
}

function pressV1(code: string, target?: EventTarget, init?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true, ...init });
  (target ?? document).dispatchEvent(event);
  return event;
}

describe("installKeyboardAdapterV1", () => {
  it("routes mapped codes, prevents default when handled, and uninstalls cleanly", () => {
    const router = routerSpyV1();
    const uninstall = installKeyboardAdapterV1({
      router,
      map: { Enter: advanceV1, KeyA: autoV1 },
    });

    const handledEvent = pressV1("Enter");
    expect(router.route).toHaveBeenCalledExactlyOnceWith({
      kind: "action",
      actionId: advanceV1,
    });
    expect(handledEvent.defaultPrevented).toBe(true);

    // Unmapped codes never route.
    pressV1("KeyZ");
    expect(router.route).toHaveBeenCalledTimes(1);

    // Key repeat is one action, not a stream.
    pressV1("Enter", document, { repeat: true });
    expect(router.route).toHaveBeenCalledTimes(1);

    // Modifier chords stay free for the browser and the host.
    pressV1("Enter", document, { ctrlKey: true });
    expect(router.route).toHaveBeenCalledTimes(1);

    uninstall();
    pressV1("Enter");
    expect(router.route).toHaveBeenCalledTimes(1);
  });

  it("ignores keys while focus sits on editable or interactive elements", () => {
    const router = routerSpyV1();
    const uninstall = installKeyboardAdapterV1({ router, map: { Enter: advanceV1 } });

    for (const build of [
      () => document.createElement("input"),
      () => document.createElement("textarea"),
      () => document.createElement("button"),
      () => {
        const div = document.createElement("div");
        div.setAttribute("role", "button");
        return div;
      },
    ]) {
      const element = build();
      document.body.append(element);
      pressV1("Enter", element);
      element.remove();
    }
    expect(router.route).not.toHaveBeenCalled();

    // Ignored routes leave default behavior alone.
    const ignoredRouter = routerSpyV1(false);
    uninstall();
    const uninstallIgnored = installKeyboardAdapterV1({
      router: ignoredRouter,
      map: { Enter: advanceV1 },
    });
    const event = pressV1("Enter");
    expect(event.defaultPrevented).toBe(false);
    uninstallIgnored();
  });
});

describe("installGamepadAdapterV1", () => {
  function fakePadV1(): {
    pad: GamepadLikeV1;
    setButton(index: number, pressed: boolean): void;
    disconnect(): void;
  } {
    const buttons = [{ pressed: false }, { pressed: false }, { pressed: false }];
    const state = { connected: true };
    return {
      pad: {
        index: 0,
        get connected() {
          return state.connected;
        },
        buttons,
      },
      setButton: (index, pressed) => {
        const button = buttons[index];
        if (button !== undefined) (button as { pressed: boolean }).pressed = pressed;
      },
      disconnect: () => {
        state.connected = false;
      },
    };
  }

  function manualSchedulerV1() {
    let queued: (() => void) | undefined;
    return {
      schedule: (callback: () => void) => {
        queued = callback;
        return () => {
          queued = undefined;
        };
      },
      tick: () => {
        const callback = queued;
        queued = undefined;
        callback?.();
      },
      hasPending: () => queued !== undefined,
    };
  }

  it("fires on rising edges only and stops when every pad disconnects", () => {
    const router = routerSpyV1();
    const { pad, setButton, disconnect } = fakePadV1();
    const scheduler = manualSchedulerV1();
    const adapter = installGamepadAdapterV1({
      router,
      map: { 0: advanceV1, 2: autoV1 },
      poll: () => [pad],
      schedule: scheduler.schedule,
      events: null,
    });
    expect(adapter.isPolling()).toBe(true);

    setButton(0, true);
    scheduler.tick();
    expect(router.route).toHaveBeenCalledExactlyOnceWith({
      kind: "action",
      actionId: advanceV1,
    });

    // Holding is one action; releasing then pressing fires again.
    scheduler.tick();
    expect(router.route).toHaveBeenCalledTimes(1);
    setButton(0, false);
    scheduler.tick();
    setButton(0, true);
    scheduler.tick();
    expect(router.route).toHaveBeenCalledTimes(2);

    // Disconnecting the last pad parks the loop with no pending tick.
    disconnect();
    scheduler.tick();
    expect(adapter.isPolling()).toBe(false);
    expect(scheduler.hasPending()).toBe(false);
    adapter.dispose();
  });

  it("starts on gamepadconnected and disposal cancels the loop", () => {
    const router = routerSpyV1();
    const { pad, setButton } = fakePadV1();
    const scheduler = manualSchedulerV1();
    let connected = false;
    const events = new EventTarget();
    const adapter = installGamepadAdapterV1({
      router,
      map: { 0: advanceV1 },
      poll: () => (connected ? [pad] : []),
      schedule: scheduler.schedule,
      events,
    });
    expect(adapter.isPolling()).toBe(false);

    connected = true;
    events.dispatchEvent(new Event("gamepadconnected"));
    expect(adapter.isPolling()).toBe(true);
    setButton(0, true);
    scheduler.tick();
    expect(router.route).toHaveBeenCalledTimes(1);

    adapter.dispose();
    expect(adapter.isPolling()).toBe(false);
    expect(scheduler.hasPending()).toBe(false);
    setButton(0, false);
    scheduler.tick();
    expect(router.route).toHaveBeenCalledTimes(1);
  });
});
