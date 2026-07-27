// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { parseInputActionIdV1 } from "./contracts.ts";
import type { InputRouteResultV1 } from "./contracts.ts";
import { installPointerButtonAdapterV1 } from "./pointer-button-adapter.ts";

const backV1 = parseInputActionIdV1("ui.cancel");
const historyV1 = parseInputActionIdV1("player.history_back");

function routerSpyV1(result: InputRouteResultV1 = { kind: "handled", context: "system" }) {
  const routed: string[] = [];
  return {
    routed,
    router: {
      route: (input: { readonly kind: "action"; readonly actionId: string }) => {
        routed.push(input.actionId);
        return result;
      },
    },
  };
}

describe("pointer-button adapter", () => {
  it("routes the secondary button via contextmenu and suppresses the menu", () => {
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { secondary: backV1 },
    });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(spy.routed).toEqual(["ui.cancel"]);
    expect(event.defaultPrevented).toBe(true);
    dispose();
    document.body.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    expect(spy.routed).toHaveLength(1);
  });

  it("leaves interactive elements their native context menu", () => {
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { secondary: backV1 },
    });
    const button = document.createElement("button");
    document.body.append(button);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(spy.routed).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    button.remove();
    dispose();
  });

  it("routes wheel directions with an interval and skips scrollable regions", () => {
    let at = 0;
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { wheelUp: historyV1, wheelDown: backV1 },
      wheelIntervalMs: 100,
      now: () => at,
    });
    const wheel = (deltaY: number, target: EventTarget = document.body) => {
      const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    expect(wheel(-3).defaultPrevented).toBe(true);
    expect(spy.routed).toEqual(["player.history_back"]);
    // Within the interval: swallowed.
    wheel(-3);
    expect(spy.routed).toHaveLength(1);
    at = 150;
    wheel(5);
    expect(spy.routed).toEqual(["player.history_back", "ui.cancel"]);

    // Scrollable ancestors keep native scrolling.
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", { value: 500 });
    Object.defineProperty(scroller, "clientHeight", { value: 100 });
    const inner = document.createElement("p");
    scroller.append(inner);
    document.body.append(scroller);
    at = 300;
    const scrolled = wheel(-3, inner);
    expect(scrolled.defaultPrevented).toBe(false);
    expect(spy.routed).toHaveLength(2);
    scroller.remove();
    dispose();
  });
});
