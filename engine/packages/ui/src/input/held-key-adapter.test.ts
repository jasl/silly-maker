// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { parseInputActionIdV1 } from "./contracts.ts";
import { createHeldKeyInputV1 } from "./held-key-adapter.ts";

const fastForwardV1 = parseInputActionIdV1("player.fast_forward");
const peekV1 = parseInputActionIdV1("player.toggle_ui");

function keyV1(
  type: "keydown" | "keyup",
  key: string,
  target?: EventTarget,
  init?: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
  (target ?? document).dispatchEvent(event);
  return event;
}

function heldIdsV1(input: ReturnType<typeof createHeldKeyInputV1>): readonly string[] {
  return [...input.port.state.getCurrent().heldActionIds];
}

describe("createHeldKeyInputV1", () => {
  it("engages on keydown, releases on keyup, and notifies subscribers once per change", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1 } });
    const listener = vi.fn();
    input.port.state.subscribe(listener);

    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    expect(listener).toHaveBeenCalledTimes(1);

    // Repeats neither re-engage nor notify. An unmapped companion key
    // cancels the exclusive hold.
    keyV1("keydown", "Control", document, { repeat: true });
    expect(listener).toHaveBeenCalledTimes(1);
    keyV1("keydown", "Shift");
    expect(heldIdsV1(input)).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    keyV1("keyup", "Shift");
    keyV1("keyup", "Control");
    expect(heldIdsV1(input)).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    // Keyup without an engaged key stays silent.
    keyV1("keyup", "Control");
    expect(listener).toHaveBeenCalledTimes(2);
    uninstall();
  });

  it("never engages from editable controls, native-text subtrees, chrome, or IME", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1 } });

    const scopes: readonly (() => HTMLElement)[] = [
      () => document.createElement("input"),
      () => document.createElement("textarea"),
      () => {
        const host = document.createElement("div");
        host.setAttribute("data-native-text", "true");
        return host;
      },
      () => {
        const host = document.createElement("div");
        host.setAttribute("data-debug-dock", "true");
        return host;
      },
      () => {
        const host = document.createElement("div");
        host.setAttribute("data-devdock-window", "true");
        return host;
      },
      () => {
        const host = document.createElement("div");
        host.setAttribute("data-blocking-focus-scope", "true");
        return host;
      },
    ];
    for (const build of scopes) {
      const element = build();
      document.body.append(element);
      keyV1("keydown", "Control", element);
      expect(heldIdsV1(input)).toEqual([]);
      element.remove();
    }

    keyV1("keydown", "Control", document, { isComposing: true });
    expect(heldIdsV1(input)).toEqual([]);

    // A focused stage button is NOT an ignore scope: holds must engage there.
    const button = document.createElement("button");
    document.body.append(button);
    keyV1("keydown", "Control", button);
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    button.remove();
    uninstall();
  });

  it("releases unconditionally: keyup inside chrome and window blur both release", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1, Shift: peekV1 } });

    keyV1("keydown", "Control");
    const dock = document.createElement("div");
    dock.setAttribute("data-debug-dock", "true");
    document.body.append(dock);
    keyV1("keyup", "Control", dock);
    expect(heldIdsV1(input)).toEqual([]);
    dock.remove();

    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    window.dispatchEvent(new Event("blur"));
    expect(heldIdsV1(input)).toEqual([]);
    uninstall();
  });

  it("lets either mapped key engage alone, but a second key is a chord", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({
      map: { Control: fastForwardV1, Meta: fastForwardV1 },
    });
    const listener = vi.fn();
    input.port.state.subscribe(listener);

    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    keyV1("keydown", "Meta");
    expect(heldIdsV1(input)).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    keyV1("keyup", "Meta");
    keyV1("keyup", "Control");
    keyV1("keydown", "Meta");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    keyV1("keyup", "Meta");
    expect(heldIdsV1(input)).toEqual([]);
    uninstall();
  });

  it("engages only an exclusive mapped key; chords never resume mid-hold", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1 } });

    keyV1("keydown", "Alt");
    keyV1("keydown", "Control", document, { altKey: true });
    expect(heldIdsV1(input)).toEqual([]);

    keyV1("keyup", "Alt");
    expect(heldIdsV1(input)).toEqual([]);
    keyV1("keyup", "Control");

    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    keyV1("keydown", "Alt");
    expect(heldIdsV1(input)).toEqual([]);
    keyV1("keyup", "Alt");
    expect(heldIdsV1(input)).toEqual([]);
    keyV1("keyup", "Control");

    keyV1("keydown", "Control");
    keyV1("keydown", "a");
    expect(heldIdsV1(input)).toEqual([]);
    uninstall();
  });

  it("uninstall releases everything and allows reinstall; double install throws", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1 } });
    expect(() => input.install({ map: { Control: fastForwardV1 } })).toThrow(TypeError);

    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    uninstall();
    expect(heldIdsV1(input)).toEqual([]);
    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([]);

    const reinstall = input.install({ map: { Control: fastForwardV1 } });
    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([fastForwardV1]);
    reinstall();
  });

  it("ignores keydown events an earlier claimant already handled", () => {
    const input = createHeldKeyInputV1();
    const uninstall = input.install({ map: { Control: fastForwardV1 } });
    const claim = (event: Event): void => event.preventDefault();
    document.addEventListener("keydown", claim, true);
    keyV1("keydown", "Control");
    expect(heldIdsV1(input)).toEqual([]);
    document.removeEventListener("keydown", claim, true);
    uninstall();
  });
});
