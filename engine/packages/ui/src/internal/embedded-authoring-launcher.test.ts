// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createEmbeddedAuthoringLauncherPortInternalV1,
  registerEmbeddedAuthoringLauncherInternalV1,
} from "./embedded-authoring-launcher.ts";

describe("embedded authoring launcher bridge", () => {
  it("publishes availability, shared ownership, and activation revisions", async () => {
    const ownerDocument = {} as Document;
    const port = createEmbeddedAuthoringLauncherPortInternalV1(ownerDocument);
    const activate = vi.fn();
    const unregister = registerEmbeddedAuthoringLauncherInternalV1(
      ownerDocument,
      activate,
    );

    expect(port.state.getCurrent()).toMatchObject({
      available: true,
      hosted: false,
      requestRevision: 0,
    });
    const releaseHost = port.claimHost();
    expect(port.state.getCurrent().hosted).toBe(true);

    await port.activate();
    expect(activate).toHaveBeenCalledOnce();
    expect(port.state.getCurrent().requestRevision).toBe(1);

    const releaseFirstSurface = port.claimSurface();
    const releaseSecondSurface = port.claimSurface();
    expect(port.state.getCurrent().surfaceOpen).toBe(true);
    releaseFirstSurface();
    expect(port.state.getCurrent().surfaceOpen).toBe(true);
    releaseFirstSurface();
    expect(port.state.getCurrent().surfaceOpen).toBe(true);
    releaseSecondSurface();
    expect(port.state.getCurrent().surfaceOpen).toBe(false);
    releaseHost();
    expect(port.state.getCurrent().hosted).toBe(false);

    unregister();
    expect(port.state.getCurrent()).toMatchObject({
      available: false,
      surfaceOpen: false,
    });
  });

  it("does not let a stale registration clear its successor", () => {
    const ownerDocument = {} as Document;
    const port = createEmbeddedAuthoringLauncherPortInternalV1(ownerDocument);
    const unregisterFirst = registerEmbeddedAuthoringLauncherInternalV1(
      ownerDocument,
      vi.fn(),
    );
    const unregisterSecond = registerEmbeddedAuthoringLauncherInternalV1(
      ownerDocument,
      vi.fn(),
    );

    unregisterFirst();
    expect(port.state.getCurrent().available).toBe(true);
    unregisterSecond();
    expect(port.state.getCurrent().available).toBe(false);
  });
});
