// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HostAtomicRecordStoreV1, RuntimeCapabilityPortV1 } from "@sillymaker/base";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import {
  createDevDockContributionSetV1,
  type DevDockControlV1,
  type DevDockContributionSetV1,
} from "@sillymaker/ui/debug";
import {
  applicationStartupSignalEventNameInternalV1,
  type ApplicationStartupSignalDetailInternalV1,
} from "@sillymaker/web/internal/application-startup";

import { labGameApplicationV1 } from "../application/composition.tsx";

interface InstalledDocumentEntryV1 {
  readonly shell: HTMLElement;
  readonly signals: ApplicationStartupSignalDetailInternalV1[];
  productWasPresentAtFirstCommit(): boolean | null;
}

function installDocumentEntryV1(
  target: "browser" | "deno_desktop" = "browser",
): InstalledDocumentEntryV1 {
  const shell = document.createElement("div");
  shell.id = "sillymaker-application-boot-shell";
  const pending = document.createElement("div");
  pending.setAttribute("role", "status");
  pending.setAttribute("aria-live", "polite");
  pending.setAttribute("aria-busy", "true");
  pending.setAttribute("data-sillymaker-boot-shell", "pending");
  pending.textContent = "Engine Lab starting";
  shell.append(pending);

  const bootstrap = document.createElement("script");
  bootstrap.id = "sillymaker-application-bootstrap";
  bootstrap.type = "application/json";
  bootstrap.setAttribute("data-sillymaker-bootstrap-config", "v1");
  bootstrap.textContent = JSON.stringify({ revision: 1, entry: "runtime", target });

  const root = document.createElement("div");
  root.id = "root";
  document.body.append(shell, bootstrap, root);

  const signals: ApplicationStartupSignalDetailInternalV1[] = [];
  let productPresent: boolean | null = null;
  shell.addEventListener(applicationStartupSignalEventNameInternalV1, (event) => {
    const detail = (event as CustomEvent<ApplicationStartupSignalDetailInternalV1>).detail;
    signals.push(detail);
    if (detail.signal === "first_product_commit") {
      productPresent = document.querySelector('[role="application"]') !== null;
    }
  });
  return Object.freeze({
    shell,
    signals,
    productWasPresentAtFirstCommit: () => productPresent,
  });
}

function runtimeOptionsV1(records: HostAtomicRecordStoreV1, capabilitySearch = "") {
  return Object.freeze({
    host: createWebHostV1({ records }),
    gameBootstrapEntropy: createFixedBootstrapEntropyV1({ seeds: [20260822], uuids: [] }),
    capabilitySearch,
    registerPageLifecycle: false,
  });
}

function signalCountV1(
  signals: readonly ApplicationStartupSignalDetailInternalV1[],
  signal: ApplicationStartupSignalDetailInternalV1["signal"],
): number {
  return signals.filter((detail) => detail.signal === signal).length;
}

function deferredValueV1<T>(): Readonly<{
  readonly promise: Promise<T>;
  resolve(value: T): void;
}> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function optionalDevDockContributionsV1(): DevDockContributionSetV1 {
  return createDevDockContributionSetV1({
    panels: Object.freeze([
      Object.freeze({
        id: "startup.optional",
        side: "right" as const,
        title: "Startup optional panel",
        authority: "read_only" as const,
        render: () => <p>Accepted optional panel</p>,
      }),
    ]),
  });
}

afterEach(() => {
  cleanup();
  document.head.replaceChildren();
  document.body.replaceChildren();
  globalThis.window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("AR0 Web document-entry startup", () => {
  it("retires the static shell only after a real product layout commit", async () => {
    const entry = installDocumentEntryV1();
    const starting = startWebGameApplicationV1(
      labGameApplicationV1,
      runtimeOptionsV1(createMemoryHostRecordStoreV1()),
    );

    expect(entry.shell.hidden).toBe(false);
    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "pending");

    const started = await starting;
    try {
      await waitFor(() => {
        expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
        expect(entry.shell.hidden).toBe(true);
        expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
      });

      expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(1);
      expect(signalCountV1(entry.signals, "first_product_commit")).toBe(1);
      expect(signalCountV1(entry.signals, "optional_capability_ready")).toBe(0);
      expect(entry.productWasPresentAtFirstCommit()).toBe(true);
      expect(
        entry.shell.querySelector('[data-sillymaker-boot-shell="retired"]'),
      ).toHaveAttribute("aria-busy", "false");
    } finally {
      await started.dispose();
    }
    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-controller", "disposed");
  });

  it("does not let a never-resolving optional contribution block the product", async () => {
    const entry = installDocumentEntryV1();
    const loadOptional = vi.fn(
      () => new Promise<never>(() => undefined),
    );
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        return Object.freeze({
          ...labGameApplicationV1.ui(input),
          loadDevDockContributions: loadOptional,
        });
      },
    });

    const started = await startWebGameApplicationV1(
      application,
      runtimeOptionsV1(
        createMemoryHostRecordStoreV1(),
        "?capability=debug_tools",
      ),
    );
    try {
      await waitFor(() => {
        expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
        expect(loadOptional).toHaveBeenCalledTimes(1);
        expect(entry.shell.hidden).toBe(true);
      });

      expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
      expect(entry.shell).toHaveAttribute("data-sillymaker-startup-optional-ready", "[]");
      expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(1);
      expect(signalCountV1(entry.signals, "first_product_commit")).toBe(1);
      expect(signalCountV1(entry.signals, "optional_capability_ready")).toBe(0);
    } finally {
      await started.dispose();
    }
  });

  it("publishes optional readiness only after the active DevDock accepts the contribution", async () => {
    const entry = installDocumentEntryV1();
    const optional = deferredValueV1<DevDockContributionSetV1>();
    const loadOptional = vi.fn(() => optional.promise);
    let capabilities: RuntimeCapabilityPortV1 | null = null;
    let devDockControl: DevDockControlV1 | null = null;
    let panelWasRegisteredAtSignal: boolean | null = null;
    entry.shell.addEventListener(applicationStartupSignalEventNameInternalV1, (event) => {
      const detail = (event as CustomEvent<ApplicationStartupSignalDetailInternalV1>).detail;
      if (detail.signal === "optional_capability_ready") {
        panelWasRegisteredAtSignal = devDockControl?.panels.getCurrent().some(
          (panel) => panel.id === "startup.optional",
        ) ?? false;
      }
    });
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        capabilities = input.capabilities;
        devDockControl = input.devDockControl;
        return Object.freeze({
          ...labGameApplicationV1.ui(input),
          loadDevDockContributions: loadOptional,
        });
      },
    });

    const started = await startWebGameApplicationV1(
      application,
      runtimeOptionsV1(createMemoryHostRecordStoreV1()),
    );
    try {
      await act(async () => {
        await capabilities?.setEnabled("debug_tools", true);
      });
      await waitFor(() => expect(loadOptional).toHaveBeenCalledTimes(1));
      act(() => devDockControl?.open("startup.optional"));
      expect(signalCountV1(entry.signals, "optional_capability_ready")).toBe(0);

      await act(async () => optional.resolve(optionalDevDockContributionsV1()));

      await waitFor(() => {
        expect(screen.getByText("Accepted optional panel")).toBeInTheDocument();
        expect(signalCountV1(entry.signals, "optional_capability_ready")).toBe(1);
      });
      expect(panelWasRegisteredAtSignal).toBe(true);
    } finally {
      await started.dispose();
    }
  });

  it("does not publish optional readiness for a late result discarded after capability revoke", async () => {
    const entry = installDocumentEntryV1();
    const optional = deferredValueV1<DevDockContributionSetV1>();
    const loadOptional = vi.fn(() => optional.promise);
    let capabilities: RuntimeCapabilityPortV1 | null = null;
    let devDockControl: DevDockControlV1 | null = null;
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        capabilities = input.capabilities;
        devDockControl = input.devDockControl;
        return Object.freeze({
          ...labGameApplicationV1.ui(input),
          loadDevDockContributions: loadOptional,
        });
      },
    });

    const started = await startWebGameApplicationV1(
      application,
      runtimeOptionsV1(createMemoryHostRecordStoreV1()),
    );
    try {
      await act(async () => {
        await capabilities?.setEnabled("debug_tools", true);
      });
      await waitFor(() => expect(loadOptional).toHaveBeenCalledTimes(1));
      await act(async () => {
        await capabilities?.setEnabled("debug_tools", false);
      });
      await act(async () => optional.resolve(optionalDevDockContributionsV1()));

      expect(signalCountV1(entry.signals, "optional_capability_ready")).toBe(0);
      expect((devDockControl as DevDockControlV1 | null)?.panels.getCurrent()).toEqual([]);
      expect(screen.queryByText("Accepted optional panel")).not.toBeInTheDocument();
    } finally {
      await started.dispose();
    }
  });

  it("keeps required-service failure diagnostic and retry UI without false readiness", async () => {
    const entry = installDocumentEntryV1();
    const privateFailure = new Error("private records backend detail");
    const records = Object.freeze({
      async read() {
        throw privateFailure;
      },
      async list() {
        throw privateFailure;
      },
      async commit() {
        throw privateFailure;
      },
    }) satisfies HostAtomicRecordStoreV1;

    await expect(
      startWebGameApplicationV1(labGameApplicationV1, runtimeOptionsV1(records)),
    ).rejects.toThrow();

    expect(entry.shell.hidden).toBe(false);
    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-required-domain", "failed");
    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-recovery", "actionable");
    expect(entry.shell.querySelector('[role="alert"]')).toHaveTextContent("SM-STARTUP-REQUIRED");
    expect(entry.shell).not.toHaveTextContent(privateFailure.message);
    expect(entry.shell.querySelector("button")).toHaveTextContent("Retry");
    expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(0);
    expect(signalCountV1(entry.signals, "first_product_commit")).toBe(0);
    expect(signalCountV1(entry.signals, "terminal_startup_failure")).toBe(1);
  });

  it("rejects a Desktop receipt without the Desktop Host marker as configuration failure", async () => {
    const entry = installDocumentEntryV1("deno_desktop");

    await expect(
      startWebGameApplicationV1(
        labGameApplicationV1,
        runtimeOptionsV1(createMemoryHostRecordStoreV1()),
      ),
    ).rejects.toThrow("web.application_bootstrap.target_mismatch");

    expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
    expect(entry.shell.querySelector('[role="alert"]')).toHaveTextContent("SM-STARTUP-CONFIG");
    expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(0);
  });

  it("keeps a proven required domain while recovering from an initial layout failure", async () => {
    const entry = installDocumentEntryV1();
    const privateFailure = new Error("private layout detail");
    function FailingLayoutV1(): ReactElement {
      useLayoutEffect(() => {
        throw privateFailure;
      }, []);
      return <div>uncommitted product</div>;
    }
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        const definition = labGameApplicationV1.ui(input);
        return Object.freeze({
          ...definition,
          slots: Object.freeze({
            ...definition.slots,
            hud: () => <FailingLayoutV1 />,
          }),
        });
      },
    });

    const started = await startWebGameApplicationV1(
      application,
      runtimeOptionsV1(createMemoryHostRecordStoreV1()),
    );
    try {
      await waitFor(() => {
        expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
      });
      expect(entry.shell.hidden).toBe(false);
      expect(entry.shell).toHaveAttribute("data-sillymaker-startup-required-domain", "ready");
      expect(entry.shell.querySelector('[role="alert"]')).toHaveTextContent(
        "SM-STARTUP-PRESENTATION",
      );
      expect(entry.shell).not.toHaveTextContent(privateFailure.message);
      expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(1);
      expect(signalCountV1(entry.signals, "first_product_commit")).toBe(0);
      expect(signalCountV1(entry.signals, "terminal_startup_failure")).toBe(1);
    } finally {
      await started.dispose().catch(() => undefined);
    }
  });

  it("restores recovery after a fatal React failure that occurs after ready", async () => {
    const entry = installDocumentEntryV1();
    const privateFailure = new Error("private late render detail");
    function LateFailingHudV1(): ReactElement {
      const [failed, setFailed] = useState(false);
      useLayoutEffect(() => {
        if (failed) throw privateFailure;
      }, [failed]);
      return (
        <button type="button" onClick={() => setFailed(true)}>
          {failed ? "Late failure committing" : "Trigger late failure"}
        </button>
      );
    }
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        const definition = labGameApplicationV1.ui(input);
        return Object.freeze({
          ...definition,
          slots: Object.freeze({
            ...definition.slots,
            hud: () => <LateFailingHudV1 />,
          }),
        });
      },
    });

    const started = await startWebGameApplicationV1(
      application,
      runtimeOptionsV1(createMemoryHostRecordStoreV1()),
    );
    try {
      await waitFor(() => {
        expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
        expect(screen.getByRole("button", { name: "Trigger late failure" })).toBeInTheDocument();
      });
      expect(signalCountV1(entry.signals, "required_domain_ready")).toBe(1);
      expect(signalCountV1(entry.signals, "first_product_commit")).toBe(1);
      vi.spyOn(console, "error").mockImplementation(() => undefined);

      screen.getByRole("button", { name: "Trigger late failure" }).click();

      await waitFor(() => {
        expect(entry.shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
        expect(started.isDisposed()).toBe(true);
      });
      expect(entry.shell.hidden).toBe(false);
      expect(entry.shell).toHaveAttribute("data-sillymaker-startup-required-domain", "ready");
      expect(entry.shell.querySelector('[role="alert"]')).toHaveTextContent(
        "SM-STARTUP-PRESENTATION",
      );
      expect(entry.shell).not.toHaveTextContent(privateFailure.message);
      expect(screen.queryByRole("application")).not.toBeInTheDocument();
      expect(signalCountV1(entry.signals, "terminal_startup_failure")).toBe(1);
    } finally {
      await started.dispose().catch(() => undefined);
    }
  });
});
