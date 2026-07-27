// SPDX-License-Identifier: MIT
import type { InputActionIdV1, InputRouterV1 } from "./contracts.ts";

/**
 * The minimal Gamepad adapter: a poll loop with per-button edge detection
 * mapped to semantic input actions. The loop runs only while a pad is
 * connected and stops on disconnect, page teardown, or disposal — no timer
 * survives. Physical button states never enter the CommandLog.
 */

export type GamepadActionMapV1 = Readonly<Record<number, InputActionIdV1>>;

export interface GamepadLikeV1 {
  readonly index: number;
  readonly connected: boolean;
  readonly buttons: readonly { readonly pressed: boolean }[];
}

export interface InstallGamepadAdapterOptionsV1 {
  readonly router: Pick<InputRouterV1, "route">;
  readonly map: GamepadActionMapV1;
  /** Defaults to `navigator.getGamepads()`; injectable for tests. */
  poll?(): readonly (GamepadLikeV1 | null)[];
  /** One-shot tick scheduler; defaults to requestAnimationFrame. */
  schedule?(callback: () => void): () => void;
  /** Connect/disconnect event source; defaults to `window`. */
  readonly events?: Pick<EventTarget, "addEventListener" | "removeEventListener"> | null;
}

export interface InstalledGamepadAdapterV1 {
  /** True while the poll loop is running. */
  isPolling(): boolean;
  dispose(): void;
}

function defaultPollV1(): readonly (GamepadLikeV1 | null)[] {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return [];
  }
  return navigator.getGamepads() as readonly (GamepadLikeV1 | null)[];
}

export function installGamepadAdapterV1(
  options: InstallGamepadAdapterOptionsV1,
): InstalledGamepadAdapterV1 {
  const poll = options.poll ?? defaultPollV1;
  const schedule =
    options.schedule ??
    ((callback: () => void) => {
      if (typeof requestAnimationFrame !== "function") return () => {};
      const handle = requestAnimationFrame(() => callback());
      return () => cancelAnimationFrame(handle);
    });
  const events =
    options.events === undefined ? (typeof window === "undefined" ? null : window) : options.events;

  const pressed = new Map<string, boolean>();
  let cancelTick: (() => void) | undefined;
  let polling = false;
  let disposed = false;

  const tick = (): void => {
    cancelTick = undefined;
    if (disposed || !polling) return;
    const pads = poll();
    let anyConnected = false;
    for (const pad of pads) {
      if (pad === null || !pad.connected) continue;
      anyConnected = true;
      for (const [buttonIndex, actionId] of Object.entries(options.map)) {
        const index = Number(buttonIndex);
        const isPressed = pad.buttons[index]?.pressed === true;
        const key = `${String(pad.index)}:${buttonIndex}`;
        const wasPressed = pressed.get(key) === true;
        pressed.set(key, isPressed);
        // Rising edge only: holding a button is one action.
        if (isPressed && !wasPressed) {
          options.router.route({ kind: "action", actionId });
        }
      }
    }
    if (!anyConnected) {
      stopPolling();
      return;
    }
    cancelTick = schedule(tick);
  };

  const startPolling = (): void => {
    if (disposed || polling) return;
    polling = true;
    cancelTick = schedule(tick);
  };

  const stopPolling = (): void => {
    polling = false;
    cancelTick?.();
    cancelTick = undefined;
    pressed.clear();
  };

  const onConnected = (): void => startPolling();
  const onDisconnected = (): void => {
    // The next tick observes remaining pads and stops when none are left;
    // if the loop is already stopped nothing needs to happen.
  };

  events?.addEventListener("gamepadconnected", onConnected);
  events?.addEventListener("gamepaddisconnected", onDisconnected);

  // A pad may already be connected before installation.
  if (poll().some((pad) => pad !== null && pad.connected)) startPolling();

  return Object.freeze({
    isPolling: () => polling,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopPolling();
      events?.removeEventListener("gamepadconnected", onConnected);
      events?.removeEventListener("gamepaddisconnected", onDisconnected);
    },
  });
}
