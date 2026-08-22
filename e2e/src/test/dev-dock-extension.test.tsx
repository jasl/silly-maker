// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { disposeDevDockContributionLifecycleInternalV1 } from "@sillymaker/ui/internal";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import { loadLabDevDockExtensionV1 } from "../application/dev-dock-extension.tsx";

afterEach(cleanup);

describe("Lab DevDock extension entry", () => {
  it("returns the direct contribution consumer and exposes idempotent lifecycle disposal", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      const contributions = await loadLabDevDockExtensionV1({ instance });
      expect(contributions.panels.map(({ id }) => id)).toEqual([
        "panel.e2e.stage",
        "panel.e2e.interaction",
        "panel.e2e.audio",
        "panel.e2e.graph",
        "panel.e2e.provenance",
        "panel.e2e.workbench",
      ]);

      const firstDispose = disposeDevDockContributionLifecycleInternalV1(contributions);
      const secondDispose = disposeDevDockContributionLifecycleInternalV1(contributions);
      expect(secondDispose).toBe(firstDispose);
      await firstDispose;
      await disposeDevDockContributionLifecycleInternalV1(contributions);
    } finally {
      await instance.dispose();
    }
  });
});
