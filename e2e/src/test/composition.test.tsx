// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { HostAtomicRecordStoreV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  StartedWebGameApplicationV1,
  StartWebGameApplicationOptionsV1,
} from "@sillymaker/web";

import { labGameApplicationV1 } from "../application/composition.tsx";

const automationGlobalKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

function createTestRootV1(): HTMLElement {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  return root;
}

/** Counts committed record mutations touching the autosave slot. */
function withAutosaveCounterV1(records: HostAtomicRecordStoreV1): {
  readonly records: HostAtomicRecordStoreV1;
  autosaveWrites(): number;
} {
  let autosaveWrites = 0;
  const counted: HostAtomicRecordStoreV1 = Object.freeze({
    read: (namespace, key) => records.read(namespace, key),
    list: (namespace) => records.list(namespace),
    commit: (mutations) => {
      if (mutations.some((mutation) => String(mutation.key).includes("auto.current"))) {
        autosaveWrites += 1;
      }
      return records.commit(mutations);
    },
  } satisfies HostAtomicRecordStoreV1);
  return { records: counted, autosaveWrites: () => autosaveWrites };
}

function startLabV1(
  capabilitySearch: string,
  overrides: Partial<StartWebGameApplicationOptionsV1> = {},
): Promise<StartedWebGameApplicationV1> {
  return startWebGameApplicationV1(labGameApplicationV1, {
    rootElement: createTestRootV1(),
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260720],
      uuids: ["3f5a1c22-9d47-4b7e-8a10-6c2e4d9b1f30"],
    }),
    capabilitySearch,
    registerPageLifecycle: false,
    ...overrides,
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

  it("debounces autosave writes and flushes them on pagehide", async () => {
    const counter = withAutosaveCounterV1(createMemoryHostRecordStoreV1());
    const started = await startLabV1("", {
      host: createWebHostV1({
        records: counter.records,
        seeds: [20260721],
        uuids: ["4a6b2d33-ae58-4c8f-9b21-7d3f5e0c2a41"],
      }),
      registerPageLifecycle: true,
      // A long quiet period: committed Snapshots stay saveable, but nothing
      // hits the record store while the player keeps clicking.
      autosave: { mode: "debounced", delayMs: 60_000 },
    });
    try {
      await waitFor(() => {
        expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
      });
      const collect = screen.getByRole("button", { name: "采集样本" });
      const user = userEvent.setup();
      await user.click(collect);
      await user.click(collect);
      await user.click(collect);
      await waitFor(() => {
        expect(screen.getByText(/样本[1-9]/u)).toBeInTheDocument();
      });

      // Three commits, zero autosave writes: no per-line IndexedDB churn.
      expect(counter.autosaveWrites()).toBe(0);

      // The page lifecycle teardown flushes the pending capture.
      globalThis.dispatchEvent(new Event("pagehide"));
      await waitFor(() => {
        expect(counter.autosaveWrites()).toBe(1);
      });
      await waitFor(() => {
        expect(started.isDisposed()).toBe(true);
      });
    } finally {
      await started.dispose();
    }
  });
});
