// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { parseInputActionIdV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import { createManualPresentationClockV1 } from "./presentation-clock.ts";
import { createPresentationFreezePortV1 } from "./presentation-freeze.ts";

describe("createPresentationFreezePortV1", () => {
  it("holds now() while frozen and resumes with continuous, monotonic time", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    inner.advance(100);
    expect(freeze.clock.now()).toBe(100);

    freeze.pause();
    inner.advance(500);
    expect(freeze.clock.now()).toBe(100);
    expect(freeze.state.getCurrent().frozen).toBe(true);

    freeze.resume();
    expect(freeze.clock.now()).toBe(100);
    inner.advance(50);
    expect(freeze.clock.now()).toBe(150);
    expect(freeze.state.getCurrent().frozen).toBe(false);
  });

  it("parks ticks requested while frozen and fires them after resume with corrected time", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const seen: number[] = [];

    freeze.pause();
    freeze.clock.requestTick((now) => seen.push(now));
    inner.advance(300);
    expect(seen).toEqual([]);

    freeze.resume();
    inner.advance(20);
    expect(seen).toEqual([20]);
  });

  it("re-parks an in-flight tick that lands during the freeze", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const seen: number[] = [];

    inner.advance(40);
    freeze.clock.requestTick((now) => seen.push(now));
    freeze.pause();
    inner.advance(1000);
    expect(seen).toEqual([]);

    freeze.resume();
    inner.advance(10);
    expect(seen).toEqual([50]);
  });

  it("honors cancellation for both live and parked ticks", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const seen: number[] = [];

    const cancelLive = freeze.clock.requestTick((now) => seen.push(now));
    cancelLive();
    inner.advance(10);

    freeze.pause();
    const cancelParked = freeze.clock.requestTick((now) => seen.push(now));
    cancelParked();
    freeze.resume();
    inner.advance(10);
    expect(seen).toEqual([]);
  });

  it("swallows gameplay input only while frozen once the router is bound", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const gameplay = vi.fn(() => Object.freeze({ kind: "handled" as const }));
    const router = createInputRouterV1();
    router.register({ context: "gameplay", handle: gameplay });
    const unbind = freeze.bindInputRouterInternalV1(router);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.freeze.synthetic"),
    });

    expect(router.route(event)).toEqual({ kind: "handled", context: "gameplay" });
    freeze.pause();
    expect(router.route(event)).toEqual({ kind: "handled", context: "debug" });
    freeze.resume();
    expect(router.route(event)).toEqual({ kind: "handled", context: "gameplay" });

    freeze.pause();
    unbind();
    expect(router.route(event)).toEqual({ kind: "handled", context: "gameplay" });
  });

  it("keeps pause/resume idempotent and notifies state subscribers on edges only", () => {
    const inner = createManualPresentationClockV1();
    const freeze = createPresentationFreezePortV1({ inner });
    const notifications = vi.fn();
    freeze.state.subscribe(notifications);

    freeze.resume();
    expect(notifications).not.toHaveBeenCalled();
    freeze.pause();
    freeze.pause();
    expect(notifications).toHaveBeenCalledTimes(1);
    freeze.resume();
    freeze.resume();
    expect(notifications).toHaveBeenCalledTimes(2);
  });
});
