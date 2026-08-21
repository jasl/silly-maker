// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";

import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { labGameApplicationV1 } from "../application/composition.tsx";

afterEach(() => {
  document.body.innerHTML = "";
});

function stepsV1(): string | undefined {
  const button = document.querySelector("[data-lab-rollback]");
  return button instanceof HTMLButtonElement ? button.dataset.labRollbackSteps : undefined;
}

it("the HUD rollback control follows ring changes through the real web start path", async () => {
  const root = document.createElement("div");
  document.body.append(root);
  const started = await startWebGameApplicationV1(labGameApplicationV1, {
    rootElement: root,
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
    }),
    gameBootstrapEntropy: createFixedBootstrapEntropyV1({ seeds: [20260720], uuids: [] }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  try {
    await waitFor(() => {
      expect(stepsV1()).toBe("0");
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).not.toBeNull();
    });
    await waitFor(() => {
      expect(stepsV1()).toBe("1");
    });
  } finally {
    await started.dispose();
  }
});
