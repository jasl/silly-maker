// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import { loadLabDevDockExtensionV1 } from "../application/dev-dock-extension.tsx";

afterEach(cleanup);

describe("Lab DevDock extension entry", () => {
  it("returns the direct contribution consumer and exposes idempotent lifecycle disposal", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      const handle = await loadLabDevDockExtensionV1({ instance });
      expect(handle.contributions.panels.map(({ id }) => id)).toEqual([
        "panel.e2e.stage",
        "panel.e2e.interaction",
        "panel.e2e.audio",
        "panel.e2e.graph",
        "panel.e2e.provenance",
      ]);

      const firstDispose = handle.dispose?.();
      const secondDispose = handle.dispose?.();
      expect(secondDispose).toBe(firstDispose);
      await firstDispose;
      await handle.dispose?.();
    } finally {
      await instance.dispose();
    }
  });
});
