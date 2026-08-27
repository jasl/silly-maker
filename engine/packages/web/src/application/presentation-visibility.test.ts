// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { createManualPresentationClockV1, createPresentationFreezePortV1 } from "@sillymaker/ui";

import { bindDocumentPresentationVisibilityInternalV1 } from "./presentation-visibility.ts";

afterEach(() => vi.restoreAllMocks());

describe("bindDocumentPresentationVisibilityInternalV1", () => {
  it("excludes an initially hidden span from the shared presentation clock", () => {
    const visibilityState = vi.spyOn(document, "visibilityState", "get");
    visibilityState.mockReturnValue("hidden");
    const inner = createManualPresentationClockV1();
    const presentation = createPresentationFreezePortV1({ inner });
    const unbind = bindDocumentPresentationVisibilityInternalV1({
      document,
      presentation,
    });

    expect(presentation.state.getCurrent()).toEqual({ frozen: true });
    inner.advance(5_000);
    expect(presentation.clock.now()).toBe(0);

    visibilityState.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    inner.advance(100);
    expect(presentation.state.getCurrent()).toEqual({ frozen: false });
    expect(presentation.clock.now()).toBe(100);

    unbind();
    visibilityState.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(presentation.state.getCurrent()).toEqual({ frozen: false });
  });

  it("re-anchors a pending presentation tick after a visible-hidden-visible span", () => {
    const visibilityState = vi.spyOn(document, "visibilityState", "get");
    visibilityState.mockReturnValue("visible");
    const inner = createManualPresentationClockV1();
    const presentation = createPresentationFreezePortV1({ inner });
    const unbind = bindDocumentPresentationVisibilityInternalV1({
      document,
      presentation,
    });
    const timestamps: number[] = [];

    presentation.clock.requestTick((now) => timestamps.push(now));
    inner.advance(200);
    expect(timestamps).toEqual([200]);

    presentation.clock.requestTick((now) => timestamps.push(now));
    visibilityState.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    inner.advance(5_000);
    expect(timestamps).toEqual([200]);

    visibilityState.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    inner.advance(200);
    expect(timestamps).toEqual([200, 400]);
    unbind();
  });
});
