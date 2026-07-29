// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1,
  armStagePointerGestureFenceV1,
} from "./pointer-gesture-fence.ts";

afterEach(() => {
  vi.useRealTimers();
});

function dispatchPointerUpV1(target: EventTarget): PointerEvent {
  const event = new PointerEvent("pointerup", {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 1,
  });
  target.dispatchEvent(event);
  return event;
}

describe("armStagePointerGestureFenceV1", () => {
  it("swallows the next primary click on the root and releases", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const onArm = vi.fn(() => vi.fn());
    const pointerUp = dispatchPointerUpV1(root);
    expect(pointerUp.defaultPrevented).toBe(false);

    const handle = armStagePointerGestureFenceV1({
      root,
      pointerUpEvent: pointerUp,
      onArm,
    });
    expect(pointerUp.defaultPrevented).toBe(true);
    expect(onArm).toHaveBeenCalledOnce();
    expect(handle.active()).toBe(true);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const clickHandler = vi.fn();
    root.addEventListener("click", clickHandler);
    root.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(clickHandler).not.toHaveBeenCalled();
    expect(handle.active()).toBe(false);
    root.remove();
  });

  it("releases on the next pointerdown without consuming it", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const disarm = vi.fn();
    const pointerUp = new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
    });
    const handle = armStagePointerGestureFenceV1({
      root,
      pointerUpEvent: pointerUp,
      onArm: () => disarm,
    });

    const down = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 2,
    });
    const downHandler = vi.fn();
    root.addEventListener("pointerdown", downHandler);
    root.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(downHandler).toHaveBeenCalledOnce();
    expect(handle.active()).toBe(false);
    expect(disarm).toHaveBeenCalledOnce();
    root.remove();
  });

  it("releases after the timeout fallback", () => {
    vi.useFakeTimers();
    const root = document.createElement("div");
    const disarm = vi.fn();
    const pointerUp = new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
    });
    const handle = armStagePointerGestureFenceV1({
      root,
      pointerUpEvent: pointerUp,
      onArm: () => disarm,
      timeoutMs: STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1,
    });
    expect(handle.active()).toBe(true);
    vi.advanceTimersByTime(STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1);
    expect(handle.active()).toBe(false);
    expect(disarm).toHaveBeenCalledOnce();
  });

  it("rearming releases the previous fence", () => {
    const root = document.createElement("div");
    const disarmA = vi.fn();
    const disarmB = vi.fn();
    const first = armStagePointerGestureFenceV1({
      root,
      pointerUpEvent: new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
      }),
      onArm: () => disarmA,
    });
    const second = armStagePointerGestureFenceV1({
      root,
      pointerUpEvent: new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 2,
      }),
      onArm: () => disarmB,
    });
    // First fence is still "active" until explicitly released — callers must
    // release previous handles. GameStage does that before rearm.
    first.release();
    expect(disarmA).toHaveBeenCalledOnce();
    expect(second.active()).toBe(true);
    second.release();
    expect(disarmB).toHaveBeenCalledOnce();
  });
});
