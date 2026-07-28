// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";

import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { labWebApplicationV1 } from "../application/web-application.tsx";

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
  const started = await startWebGameApplicationV1(labWebApplicationV1, {
    rootElement: root,
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260720],
      uuids: ["3f5a1c22-9d47-4b7e-8a10-6c2e4d9b1f30"],
    }),
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
