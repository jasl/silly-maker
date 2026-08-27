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

  it("leaves interactive elements and their descendants unclaimed", () => {
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { secondary: backV1 },
    });
    const button = document.createElement("button");
    const child = document.createElement("span");
    button.append(child);
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "");
    document.body.append(button, editable);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    child.dispatchEvent(event);
    expect(spy.routed).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    const editableEvent = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    editable.dispatchEvent(editableEvent);
    expect(spy.routed).toEqual([]);
    expect(editableEvent.defaultPrevented).toBe(false);
    button.remove();
    editable.remove();
    dispose();
  });

  it("recognizes interactive descendants from another Window realm", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (frameWindow === null || frameDocument === null) throw new TypeError("missing iframe realm");
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { secondary: backV1 },
      target: frameDocument,
    });
    const button = frameDocument.createElement("button");
    const child = frameDocument.createElement("span");
    button.append(child);
    frameDocument.body.append(button);
    const FrameMouseEvent = (frameWindow as unknown as { readonly MouseEvent: typeof MouseEvent })
      .MouseEvent;
    const event = new FrameMouseEvent("contextmenu", { bubbles: true, cancelable: true });

    child.dispatchEvent(event);

    expect(spy.routed).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    dispose();
    frame.remove();
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

  it("routes the middle button on scene surfaces while leaving ordinary controls native", () => {
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { middle: historyV1 },
    });
    const surface = document.createElement("button");
    const child = document.createElement("span");
    surface.append(child);
    document.body.append(surface);

    const ordinary = new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true });
    child.dispatchEvent(ordinary);
    expect(ordinary.defaultPrevented).toBe(false);
    expect(spy.routed).toEqual([]);

    surface.dataset.pointerActionSurface = "true";
    const optedIn = new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true });
    child.dispatchEvent(optedIn);
    expect(optedIn.defaultPrevented).toBe(true);
    expect(spy.routed).toEqual(["player.history_back"]);

    surface.remove();
    dispose();
  });

  it("allows an explicit canvas-style button to retain mapped wheel navigation", () => {
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { wheelUp: historyV1 },
    });
    const surface = document.createElement("button");
    const child = document.createElement("span");
    surface.append(child);
    document.body.append(surface);

    const ordinary = new WheelEvent("wheel", { deltaY: -3, bubbles: true, cancelable: true });
    child.dispatchEvent(ordinary);
    expect(ordinary.defaultPrevented).toBe(false);
    expect(spy.routed).toEqual([]);

    surface.dataset.pointerActionSurface = "true";
    const optedIn = new WheelEvent("wheel", { deltaY: -3, bubbles: true, cancelable: true });
    child.dispatchEvent(optedIn);
    expect(optedIn.defaultPrevented).toBe(true);
    expect(spy.routed).toEqual(["player.history_back"]);

    surface.remove();
    dispose();
  });

  it("keeps native wheel scrolling in a scrollable ancestor from another Window realm", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (frameWindow === null || frameDocument === null) throw new TypeError("missing iframe realm");
    const spy = routerSpyV1();
    const dispose = installPointerButtonAdapterV1({
      router: spy.router as never,
      map: { wheelDown: backV1 },
      target: frameDocument,
      now: () => 0,
    });
    const scroller = frameDocument.createElement("div");
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", { value: 500 });
    Object.defineProperty(scroller, "clientHeight", { value: 100 });
    const inner = frameDocument.createElement("span");
    scroller.append(inner);
    frameDocument.body.append(scroller);
    const FrameWheelEvent = (frameWindow as unknown as { readonly WheelEvent: typeof WheelEvent })
      .WheelEvent;
    const event = new FrameWheelEvent("wheel", {
      deltaY: 3,
      bubbles: true,
      cancelable: true,
    });

    inner.dispatchEvent(event);

    expect(spy.routed).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    dispose();
    frame.remove();
  });
});
