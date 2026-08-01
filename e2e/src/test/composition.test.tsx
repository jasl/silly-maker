// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HostAtomicRecordStoreV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  StartedWebGameApplicationV1,
  StartWebGameApplicationOptionsV1,
} from "@sillymaker/web";

import { labGameApplicationV1 } from "../application/composition.tsx";

const automationGlobalKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";
const desktopCapabilityGlobalKeyV1 = "__SILLYMAKER_DESKTOP_CAPABILITY__";
const desktopCloseGlobalKeyV1 = "__SILLYMAKER_DESKTOP_CLOSE_V1__";
const desktopRecordsMarkerKeyV1 = "__SILLYMAKER_RECORDS__";
const desktopCapabilityV1 = "a".repeat(43);

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
  const counted: HostAtomicRecordStoreV1 = Object.freeze(
    {
      read: (namespace, key) => records.read(namespace, key),
      list: (namespace) => records.list(namespace),
      commit: (mutations) => {
        if (mutations.some((mutation) => String(mutation.key).includes("auto.current"))) {
          autosaveWrites += 1;
        }
        return records.commit(mutations);
      },
    } satisfies HostAtomicRecordStoreV1,
  );
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
  it("disposes Story UI resources when Save-surface preflight rejects startup", async () => {
    const disposeUi = vi.fn();
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        return Object.freeze({
          ...labGameApplicationV1.ui(input),
          customSaves: Object.freeze({
            kind: "custom" as const,
            accessibleName: "Synthetic saves",
            render: () => null,
          }),
          dispose: disposeUi,
        });
      },
    });

    await expect(
      startWebGameApplicationV1(application, {
        rootElement: createTestRootV1(),
        host: createWebHostV1({
          records: createMemoryHostRecordStoreV1(),
          seeds: [20260731],
          uuids: ["9c8cc628-fd86-42f4-b479-120466b439ea"],
        }),
        registerPageLifecycle: false,
      }),
    ).rejects.toThrow("web.system_saves_ambiguous");
    expect(disposeUi).toHaveBeenCalledTimes(1);
  });

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

  it("keeps Managed Surface epochs monotonic across HMR-like Web start successors", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [20260801, 20260802],
      uuids: [
        "61667dfa-3c5e-4f6f-a30e-8637127f8d2a",
        "e0caac0b-bc7d-496e-89da-9fa41ccb755e",
        "f89adf64-9882-480a-84b4-aa2fce9e37e2",
      ],
    });
    const predecessor = await startLabV1("", { host });
    let successor: StartedWebGameApplicationV1 | undefined;
    try {
      await waitFor(() => expect(screen.getByTestId("overlay-host")).toBeInTheDocument());
      const predecessorEpoch = Number(
        screen.getByTestId("overlay-host").getAttribute("data-overlay-application-epoch"),
      );
      expect(Number.isSafeInteger(predecessorEpoch)).toBe(true);

      const disposition = await predecessor.disposeForRebootstrap();
      successor = await startLabV1("", {
        host,
        rebootstrapDisposition: disposition,
      });
      await waitFor(() => expect(screen.getByTestId("overlay-host")).toBeInTheDocument());
      const successorEpoch = Number(
        screen.getByTestId("overlay-host").getAttribute("data-overlay-application-epoch"),
      );

      expect(successor.host).toBe(predecessor.host);
      expect(successorEpoch).toBe(predecessorEpoch + 1);
    } finally {
      await successor?.dispose();
      await predecessor.dispose();
    }
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
    const started = await startLabV1("?capability=automation_bridge", {
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
      const automation = Reflect.get(globalThis, automationGlobalKeyV1) as {
        dispatch(invocation: unknown): Promise<{
          readonly kind: string;
          readonly value?: { readonly kind: string; readonly code?: string };
        }>;
      };
      globalThis.dispatchEvent(new Event("pagehide"));
      await expect(
        automation.dispatch({ kind: "invoke", actionId: "lab.collect_sample" }),
      ).resolves.toMatchObject({
        kind: "ok",
        value: { kind: "not_executed", code: "hmr_invalidated" },
      });
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

  it("fences gameplay and durably flushes a pending autosave for native close", async () => {
    const previousMarker = Object.getOwnPropertyDescriptor(globalThis, desktopRecordsMarkerKeyV1);
    const previousCapability = Object.getOwnPropertyDescriptor(
      globalThis,
      desktopCapabilityGlobalKeyV1,
    );
    Object.defineProperty(globalThis, desktopRecordsMarkerKeyV1, {
      configurable: true,
      value: "local",
      writable: true,
    });
    Object.defineProperty(globalThis, desktopCapabilityGlobalKeyV1, {
      configurable: true,
      value: desktopCapabilityV1,
      writable: true,
    });
    const counter = withAutosaveCounterV1(createMemoryHostRecordStoreV1());
    const started = await startLabV1("?capability=automation_bridge", {
      host: createWebHostV1({
        records: counter.records,
        seeds: [20260731],
        uuids: ["bf668891-5e0f-424c-8d86-25df14789173"],
      }),
      autosave: { mode: "debounced", delayMs: 60_000 },
    });
    try {
      const automation = Reflect.get(globalThis, automationGlobalKeyV1) as {
        dispatch(invocation: unknown): Promise<{
          readonly kind: string;
          readonly value?: { readonly kind: string; readonly code?: string };
        }>;
      };
      for (let command = 0; command < 3; command += 1) {
        await expect(
          automation.dispatch({
            kind: "invoke",
            actionId: "lab.collect_sample",
          }),
        ).resolves.toMatchObject({ kind: "ok", value: { kind: "committed" } });
      }
      expect(counter.autosaveWrites()).toBe(0);

      const close = Reflect.get(globalThis, desktopCloseGlobalKeyV1) as
        | ((action: unknown) => {
          readonly kind: "preparing" | "flushed" | "failed";
          readonly protocolRevision: 1;
          readonly requestId: number;
        })
        | undefined;
      expect(close).toBeTypeOf("function");
      expect(close?.({ operation: "prepare", protocolRevision: 1, requestId: 41 })).toEqual({
        kind: "preparing",
        protocolRevision: 1,
        requestId: 41,
      });

      // The close preparation fences semantic ingress synchronously, before
      // the async Save write can acknowledge the shell.
      await expect(
        automation.dispatch({ kind: "invoke", actionId: "lab.collect_sample" }),
      ).resolves.toMatchObject({
        kind: "ok",
        value: { kind: "not_executed", code: "hmr_invalidated" },
      });
      await waitFor(() => {
        expect(close?.({ operation: "read", protocolRevision: 1, requestId: 41 })).toEqual({
          kind: "flushed",
          protocolRevision: 1,
          requestId: 41,
        });
      });
      expect(counter.autosaveWrites()).toBe(1);
      expect(
        (await counter.records.list("save")).some(({ key }) =>
          String(key).includes("auto.current")
        ),
      ).toBe(true);
    } finally {
      await started.dispose();
      if (previousMarker === undefined) {
        Reflect.deleteProperty(globalThis, desktopRecordsMarkerKeyV1);
      } else {
        Object.defineProperty(globalThis, desktopRecordsMarkerKeyV1, previousMarker);
      }
      if (previousCapability === undefined) {
        Reflect.deleteProperty(globalThis, desktopCapabilityGlobalKeyV1);
      } else {
        Object.defineProperty(globalThis, desktopCapabilityGlobalKeyV1, previousCapability);
      }
    }
  });

  it("fails closed when the Desktop marker has no valid launch capability", async () => {
    const previousMarker = Object.getOwnPropertyDescriptor(globalThis, desktopRecordsMarkerKeyV1);
    const previousCapability = Object.getOwnPropertyDescriptor(
      globalThis,
      desktopCapabilityGlobalKeyV1,
    );
    Object.defineProperty(globalThis, desktopRecordsMarkerKeyV1, {
      configurable: true,
      value: "local",
      writable: true,
    });
    Reflect.deleteProperty(globalThis, desktopCapabilityGlobalKeyV1);
    try {
      await expect(startLabV1("")).rejects.toThrow("web.desktop_shell_capability_invalid");
    } finally {
      if (previousMarker === undefined) {
        Reflect.deleteProperty(globalThis, desktopRecordsMarkerKeyV1);
      } else {
        Object.defineProperty(globalThis, desktopRecordsMarkerKeyV1, previousMarker);
      }
      if (previousCapability === undefined) {
        Reflect.deleteProperty(globalThis, desktopCapabilityGlobalKeyV1);
      } else {
        Object.defineProperty(globalThis, desktopCapabilityGlobalKeyV1, previousCapability);
      }
    }
  });
});
