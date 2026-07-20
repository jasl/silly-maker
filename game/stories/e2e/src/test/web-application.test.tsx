// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type { StartedWebGameApplicationV1 } from "@sillymaker/web";

import { labWebApplicationV1 } from "../application/web-application.js";

const automationGlobalKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

function createTestRootV1(): HTMLElement {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  return root;
}

function startLabV1(capabilitySearch: string): Promise<StartedWebGameApplicationV1> {
  return startWebGameApplicationV1(labWebApplicationV1, {
    rootElement: createTestRootV1(),
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260720],
      uuids: ["3f5a1c22-9d47-4b7e-8a10-6c2e4d9b1f30"],
    }),
    capabilitySearch,
    registerPageLifecycle: false,
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("startWebGameApplicationV1 with the Engine Lab declaration", () => {
  it("boots, plays, and disposes the whole browser application from one call", async () => {
    const started = await startLabV1("");
    try {
      await waitFor(() => {
        expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
      });
      expect(screen.getByTestId("game-viewport")).toBeInTheDocument();

      // The default system menu carries the designed Save surface.
      expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();

      // Playing through the Story HUD contribution works end to end.
      await userEvent.setup().click(screen.getByRole("button", { name: "采集样本" }));
      await waitFor(() => {
        expect(screen.getByText(/样本[1-9]/u)).toBeInTheDocument();
      });

      // Without capabilities there is no automation global and no DevDock.
      expect(Object.hasOwn(globalThis, automationGlobalKeyV1)).toBe(false);
      expect(screen.queryByRole("button", { name: /开发工具/u })).toBeNull();
    } finally {
      await started.dispose();
    }
    expect(started.isDisposed()).toBe(true);
    expect(Object.hasOwn(globalThis, automationGlobalKeyV1)).toBe(false);
    expect(document.querySelector("#root")?.childElementCount).toBe(0);

    // Idempotent disposal.
    await started.dispose();
  });

  it("installs and revokes the automation bridge with its capability", async () => {
    const started = await startLabV1("?capability=automation_bridge");
    try {
      const bridge = Reflect.get(globalThis, automationGlobalKeyV1) as {
        observe(): { readonly kind: string };
        dispatch(invocation: unknown): Promise<{ readonly kind: string }>;
      };
      expect(bridge.observe().kind).toBe("ok");
      await expect(
        bridge.dispatch({ kind: "invoke", actionId: "lab.collect_sample" }),
      ).resolves.toMatchObject({ kind: "ok" });
    } finally {
      await started.dispose();
    }

    // After disposal the previously captured facade is revoked and the
    // global is gone: no automation generation survives teardown.
    expect(Object.hasOwn(globalThis, automationGlobalKeyV1)).toBe(false);
  });

  it("shows the DevDock only behind the debug_tools capability", async () => {
    const started = await startLabV1("?capability=debug_tools");
    try {
      await waitFor(() => {
        expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "打开左侧开发工具" })).toBeInTheDocument();
    } finally {
      await started.dispose();
    }
  });
});
