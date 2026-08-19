// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { createManualPresentationClockV1 } from "./presentation-clock.ts";
import { createPresentationFreezePortV1 } from "./presentation-freeze.ts";
import { createPresentationRatePortV1 } from "./presentation-rate.ts";

describe("createPresentationRatePortV1", () => {
  it("scales now() by the rate and stays continuous across rate changes", () => {
    const inner = createManualPresentationClockV1();
    const port = createPresentationRatePortV1({ inner });
    inner.advance(100);
    expect(port.clock.now()).toBe(100);

    port.setRate(2);
    expect(port.clock.now()).toBe(100);
    inner.advance(100);
    expect(port.clock.now()).toBe(300);

    port.setRate(0.5);
    inner.advance(100);
    expect(port.clock.now()).toBe(350);

    port.setRate(1);
    inner.advance(25);
    expect(port.clock.now()).toBe(375);
  });

  it("delivers scaled time to tick callbacks", () => {
    const inner = createManualPresentationClockV1();
    const port = createPresentationRatePortV1({ inner });
    port.setRate(2);
    const seen: number[] = [];
    port.clock.requestTick((now) => seen.push(now));
    inner.advance(50);
    expect(seen).toEqual([100]);
  });

  it("rejects non-finite and non-positive rates", () => {
    const port = createPresentationRatePortV1({
      inner: createManualPresentationClockV1(),
    });
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => port.setRate(bad)).toThrow(TypeError);
    }
    expect(port.state.getCurrent().rate).toBe(1);
  });

  it("publishes rate changes to subscribers and skips no-op sets", () => {
    const port = createPresentationRatePortV1({
      inner: createManualPresentationClockV1(),
    });
    const listener = vi.fn();
    const unsubscribe = port.state.subscribe(listener);

    port.setRate(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(port.state.getCurrent().rate).toBe(2);

    port.setRate(2);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    port.setRate(4);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(port.state.getCurrent().rate).toBe(4);
  });

  it("composes under the freeze port: frozen time holds, resume continues scaled", () => {
    const inner = createManualPresentationClockV1();
    const rate = createPresentationRatePortV1({ inner });
    const freeze = createPresentationFreezePortV1({ inner: rate.clock });

    rate.setRate(2);
    inner.advance(100);
    expect(freeze.clock.now()).toBe(200);

    freeze.pause();
    inner.advance(500);
    expect(freeze.clock.now()).toBe(200);

    freeze.resume();
    inner.advance(10);
    expect(freeze.clock.now()).toBe(220);
  });
});
