// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, useLayoutEffect, useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  useInputRouterV1,
} from "@sillymaker/ui";

import { createWebHostV1 } from "../host/create-web-host.ts";
import {
  applicationStartupSignalEventNameInternalV1,
  type ApplicationStartupSignalDetailInternalV1,
} from "./application-startup-diagnostics.ts";
import { desktopCloseFlushGlobalKeyV1 } from "./install-desktop-close-flush.ts";
import {
  startWebGuiApplicationV1,
  type StartedWebGuiApplicationV1,
  type WebGuiApplicationV1,
} from "./start-web-gui-application.tsx";

const nextActionV1 = parseInputActionIdV1("gui-conformance.next");
const openActionV1 = parseInputActionIdV1("gui-conformance.open");
const desktopCapabilityV1 = "a".repeat(43);

let startedApplicationsV1: StartedWebGuiApplicationV1[] = [];

function deferredV1(): {
  readonly promise: Promise<void>;
  resolve(): void;
  reject(error: unknown): void;
} {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function observeStartupSignalsV1(shell: HTMLElement): string[] {
  const signals: string[] = [];
  shell.addEventListener(applicationStartupSignalEventNameInternalV1, (event) => {
    signals.push(
      (event as CustomEvent<ApplicationStartupSignalDetailInternalV1>).detail.signal,
    );
  });
  return signals;
}

afterEach(async () => {
  for (const started of startedApplicationsV1) await started.dispose();
  startedApplicationsV1 = [];
  document.head.replaceChildren();
  document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, "__SILLYMAKER_RECORDS__");
  Reflect.deleteProperty(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__");
  Reflect.deleteProperty(globalThis, desktopCloseFlushGlobalKeyV1);
  Reflect.deleteProperty(navigator, "getGamepads");
  vi.unstubAllGlobals();
});

function createHostV1() {
  return createWebHostV1({ records: createMemoryHostRecordStoreV1() });
}

function createRootV1(): HTMLDivElement {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  return root;
}

function installDocumentEntryV1(target: "browser" | "deno_desktop"): {
  readonly root: HTMLDivElement;
  readonly shell: HTMLDivElement;
} {
  const bootstrap = document.createElement("script");
  bootstrap.id = "sillymaker-application-bootstrap";
  bootstrap.type = "application/json";
  bootstrap.setAttribute("data-sillymaker-bootstrap-config", "v1");
  bootstrap.textContent = JSON.stringify({ revision: 1, entry: "runtime", target });
  document.head.append(bootstrap);

  const shell = document.createElement("div");
  shell.id = "sillymaker-application-boot-shell";
  const pending = document.createElement("div");
  pending.setAttribute("role", "status");
  pending.setAttribute("aria-live", "polite");
  pending.setAttribute("aria-busy", "true");
  pending.setAttribute("data-sillymaker-boot-shell", "pending");
  shell.append(pending);
  document.body.append(shell);

  return { root: createRootV1(), shell };
}

function RoutedCounterV1(): ReactElement {
  const inputRouter = useInputRouterV1();
  const [count, setCount] = useState(0);
  useLayoutEffect(() =>
    inputRouter.register({
      context: "interaction",
      handle(event) {
        if (
          event.kind !== "action" ||
          (event.actionId !== nextActionV1 && event.actionId !== openActionV1)
        ) {
          return inputIgnoredV1;
        }
        setCount((current) => current + 1);
        return inputHandledV1;
      },
    }), [inputRouter]);
  return <output data-testid="routed-count">{count}</output>;
}

function createApplicationV1(
  overrides: Partial<WebGuiApplicationV1> = {},
): WebGuiApplicationV1 {
  return {
    applicationId: "gui-conformance",
    viewport: {
      canvas: { width: 480, height: 272 },
      mode: "fit",
      fallbackSize: { width: 960, height: 544 },
      maxScale: 2,
    },
    ui: () => ({ content: <RoutedCounterV1 /> }),
    ...overrides,
  };
}

function FailingPresentationV1(): ReactElement {
  throw new Error("private GUI presentation detail");
}

async function startV1(
  application: WebGuiApplicationV1,
  options: Parameters<typeof startWebGuiApplicationV1>[1],
): Promise<StartedWebGuiApplicationV1> {
  let started!: StartedWebGuiApplicationV1;
  await act(async () => {
    started = await startWebGuiApplicationV1(application, options);
    await Promise.resolve();
  });
  startedApplicationsV1.push(started);
  return started;
}

describe("startWebGuiApplicationV1", () => {
  it("mounts a viewport-only GUI, routes keyboard input, and cleans explicit native behavior", async () => {
    const root = createRootV1();
    const disposeUi = vi.fn();
    const host = createHostV1();
    const readRecords = vi.spyOn(host.records, "read");
    const listRecords = vi.spyOn(host.records, "list");
    const commitRecords = vi.spyOn(host.records, "commit");
    const application = createApplicationV1({
      ui: () => ({
        content: <RoutedCounterV1 />,
        input: {
          keyboard: { ArrowRight: nextActionV1 },
          nativeBehavior: {},
        },
        dispose: disposeUi,
      }),
    });
    const started = await startV1(application, {
      rootElement: root,
      host,
      registerPageLifecycle: false,
    });

    expect(root.querySelector('[data-application-id="gui-conformance"]')).not.toBeNull();
    expect(root.querySelectorAll("main")).toHaveLength(0);
    expect(root.querySelector('[data-testid="game-viewport"]')).not.toBeNull();
    expect(document.body).toHaveAttribute("data-silly-native-reset", "true");

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, code: "ArrowRight" }),
      );
    });
    expect(root.querySelector('[data-testid="routed-count"]')).toHaveTextContent("1");

    await act(async () => {
      await started.dispose();
      await started.dispose();
    });
    expect(started.isDisposed()).toBe(true);
    expect(root).toBeEmptyDOMElement();
    expect(document.body).not.toHaveAttribute("data-silly-native-reset");
    expect(disposeUi).toHaveBeenCalledOnce();
    expect(readRecords).not.toHaveBeenCalled();
    expect(listRecords).not.toHaveBeenCalled();
    expect(commitRecords).not.toHaveBeenCalled();
  });

  it("routes a configured gamepad edge through the same application input router", async () => {
    const root = createRootV1();
    let scheduled: (() => void) | undefined;
    const cancelFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void): number => {
      scheduled = callback;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ index: 0, connected: true, buttons: [{ pressed: true }] }],
    });
    const application = createApplicationV1({
      ui: () => ({
        content: <RoutedCounterV1 />,
        input: { gamepad: { 0: openActionV1 } },
      }),
    });
    const started = await startV1(application, {
      rootElement: root,
      host: createHostV1(),
      registerPageLifecycle: false,
    });

    expect(document.body).not.toHaveAttribute("data-silly-native-reset");

    act(() => scheduled?.());
    expect(root.querySelector('[data-testid="routed-count"]')).toHaveTextContent("1");

    await act(async () => await started.dispose());
    expect(cancelFrame).toHaveBeenCalled();
  });

  it("keeps the startup recovery shell when the first React presentation fails", async () => {
    const { root, shell } = installDocumentEntryV1("browser");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const requiredDomain = deferredV1();
    const signals = observeStartupSignalsV1(shell);

    const started = await startWebGuiApplicationV1(
      createApplicationV1({
        ui: () => ({
          content: <FailingPresentationV1 />,
          requiredDomainReady: requiredDomain.promise,
        }),
      }),
      { host: createHostV1(), registerPageLifecycle: false },
    );
    startedApplicationsV1.push(started);
    await vi.waitFor(() => expect(started.isDisposed()).toBe(true));

    expect(root).toBeEmptyDOMElement();
    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
    expect(shell).toHaveAttribute(
      "data-sillymaker-startup-diagnostic-code",
      "SM-STARTUP-PRESENTATION",
    );
    expect(shell).toHaveAttribute("data-sillymaker-startup-recovery", "actionable");
    expect(shell.querySelector('[data-sillymaker-startup-retry="actionable"]')).not.toBeNull();
    expect(shell).toHaveAttribute("data-sillymaker-startup-product-commit", "pending");
    expect(consoleError).not.toHaveBeenCalled();

    requiredDomain.resolve();
    await Promise.resolve();
    expect(shell).toHaveAttribute("data-sillymaker-startup-required-domain", "failed");
    expect(signals).not.toContain("required_domain_ready");
  });

  it("mounts recovery UI while required-domain readiness is pending, then publishes ready once", async () => {
    const { root, shell } = installDocumentEntryV1("browser");
    const requiredDomain = deferredV1();
    const signals = observeStartupSignalsV1(shell);

    const started = await startV1(
      createApplicationV1({
        ui: () => ({
          content: <main aria-label="Connection recovery">Connect to continue</main>,
          requiredDomainReady: requiredDomain.promise,
        }),
      }),
      { host: createHostV1(), registerPageLifecycle: false },
    );

    expect(root.querySelector('main[aria-label="Connection recovery"]')).not.toBeNull();
    expect(shell.hidden).toBe(true);
    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "starting");
    expect(shell).toHaveAttribute("data-sillymaker-startup-product-commit", "presentation");
    expect(shell).toHaveAttribute("data-sillymaker-startup-required-domain", "pending");
    expect(signals).not.toContain("required_domain_ready");

    await act(async () => {
      requiredDomain.resolve();
      await Promise.resolve();
    });
    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
    expect(shell).toHaveAttribute("data-sillymaker-startup-required-domain", "ready");
    expect(signals.filter((signal) => signal === "required_domain_ready")).toHaveLength(1);

    await act(async () => await started.dispose());
  });

  it("turns irrecoverable required-domain rejection into the existing startup failure", async () => {
    const { root, shell } = installDocumentEntryV1("browser");
    const requiredDomain = deferredV1();
    const host = createHostV1();
    const writeLog = vi.spyOn(host.log, "write");
    const started = await startV1(
      createApplicationV1({
        ui: () => ({
          content: <main aria-label="Connection recovery">Retrying</main>,
          requiredDomainReady: requiredDomain.promise,
        }),
      }),
      { host, registerPageLifecycle: false },
    );

    const failure = new Error("private connection failure");
    await act(async () => {
      requiredDomain.reject(failure);
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(started.isDisposed()).toBe(true));

    expect(root).toBeEmptyDOMElement();
    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
    expect(shell).toHaveAttribute(
      "data-sillymaker-startup-diagnostic-code",
      "SM-STARTUP-REQUIRED",
    );
    expect(shell).not.toHaveTextContent(failure.message);
    expect(writeLog).toHaveBeenCalledWith(
      "warn",
      "web.gui_application_required_domain_failed",
      { message: failure.message },
    );
  });

  it("fences a pending required-domain settlement after disposal", async () => {
    const { shell } = installDocumentEntryV1("browser");
    const requiredDomain = deferredV1();
    const signals = observeStartupSignalsV1(shell);
    const started = await startV1(
      createApplicationV1({
        ui: () => ({
          content: <RoutedCounterV1 />,
          requiredDomainReady: requiredDomain.promise,
        }),
      }),
      { host: createHostV1(), registerPageLifecycle: false },
    );

    await act(async () => await started.dispose());
    requiredDomain.resolve();
    await Promise.resolve();

    expect(shell).toHaveAttribute("data-sillymaker-startup-controller", "disposed");
    expect(shell).toHaveAttribute("data-sillymaker-startup-required-domain", "pending");
    expect(signals).not.toContain("required_domain_ready");
  });

  it("publishes the shared document startup receipt and serves a no-op Desktop close flush", async () => {
    const { shell } = installDocumentEntryV1("deno_desktop");
    Reflect.set(globalThis, "__SILLYMAKER_RECORDS__", "local");
    Reflect.set(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__", desktopCapabilityV1);

    const started = await startV1(createApplicationV1(), {
      host: createHostV1(),
      registerPageLifecycle: false,
    });

    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "ready");
    expect(shell).toHaveAttribute("data-sillymaker-startup-required-domain", "ready");
    expect(shell).toHaveAttribute("data-sillymaker-startup-product-commit", "presentation");
    const close = Reflect.get(globalThis, desktopCloseFlushGlobalKeyV1) as (
      action: unknown,
    ) => { readonly kind: string };
    expect(close({ operation: "prepare", protocolRevision: 1, requestId: 3 })).toMatchObject({
      kind: "preparing",
      requestId: 3,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(close({ operation: "read", protocolRevision: 1, requestId: 3 })).toMatchObject({
      kind: "flushed",
      requestId: 3,
    });

    await act(async () => await started.dispose());
    expect(Reflect.has(globalThis, desktopCloseFlushGlobalKeyV1)).toBe(false);
  });

  it("routes Desktop close through one product-owned fence and async preparation", async () => {
    installDocumentEntryV1("deno_desktop");
    Reflect.set(globalThis, "__SILLYMAKER_RECORDS__", "local");
    Reflect.set(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__", desktopCapabilityV1);
    const firstPreparation = deferredV1();
    const retryPreparation = deferredV1();
    const preparations = [firstPreparation.promise, retryPreparation.promise];
    let preparationIndex = 0;
    const operations: string[] = [];
    const fence = vi.fn(() => operations.push("fence"));
    const prepare = vi.fn(() => {
      operations.push("prepare");
      return preparations[preparationIndex++] ?? Promise.resolve();
    });
    const started = await startV1(
      createApplicationV1({
        ui: () => ({
          content: <RoutedCounterV1 />,
          closePreparation: { fence, prepare },
        }),
      }),
      { host: createHostV1(), registerPageLifecycle: false },
    );
    const close = Reflect.get(globalThis, desktopCloseFlushGlobalKeyV1) as (
      action: unknown,
    ) => { readonly kind: string };

    expect(close({ operation: "prepare", protocolRevision: 1, requestId: 9 })).toMatchObject({
      kind: "preparing",
      requestId: 9,
    });
    expect(close({ operation: "prepare", protocolRevision: 1, requestId: 9 })).toMatchObject({
      kind: "preparing",
      requestId: 9,
    });
    expect(operations).toEqual(["fence", "prepare"]);
    expect(fence).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledOnce();

    firstPreparation.reject(new Error("prepare retry"));
    await Promise.resolve();
    await Promise.resolve();
    expect(close({ operation: "read", protocolRevision: 1, requestId: 9 })).toMatchObject({
      kind: "failed",
      requestId: 9,
    });

    expect(close({ operation: "prepare", protocolRevision: 1, requestId: 10 })).toMatchObject({
      kind: "preparing",
      requestId: 10,
    });
    expect(operations).toEqual(["fence", "prepare", "prepare"]);
    expect(fence).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledTimes(2);

    retryPreparation.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(close({ operation: "read", protocolRevision: 1, requestId: 10 })).toMatchObject({
      kind: "flushed",
      requestId: 10,
    });

    await act(async () => await started.dispose());
  });

  it("rejects a document target that disagrees with the admitted Desktop Host marker", async () => {
    const { shell } = installDocumentEntryV1("browser");
    Reflect.set(globalThis, "__SILLYMAKER_RECORDS__", "local");
    Reflect.set(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__", desktopCapabilityV1);

    await expect(
      startWebGuiApplicationV1(createApplicationV1(), {
        host: createHostV1(),
        registerPageLifecycle: false,
      }),
    ).rejects.toThrow("web.application_bootstrap.target_mismatch");
    expect(shell).toHaveAttribute("data-sillymaker-startup-state", "failed");
    expect(shell).toHaveAttribute("data-sillymaker-startup-diagnostic-code", "SM-STARTUP-CONFIG");
  });

  it("uses pagehide as the same idempotent root and UI teardown", async () => {
    const root = createRootV1();
    const disposeUi = vi.fn();
    const fenceClose = vi.fn();
    const prepareClose = vi.fn(() => Promise.resolve());
    const started = await startV1(
      createApplicationV1({
        ui: () => ({
          content: <RoutedCounterV1 />,
          closePreparation: { fence: fenceClose, prepare: prepareClose },
          dispose: disposeUi,
        }),
      }),
      { rootElement: root, host: createHostV1() },
    );

    await act(async () => {
      globalThis.dispatchEvent(new Event("pagehide"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(started.isDisposed()).toBe(true);
    expect(root).toBeEmptyDOMElement();
    expect(disposeUi).toHaveBeenCalledOnce();
    expect(fenceClose).not.toHaveBeenCalled();
    expect(prepareClose).not.toHaveBeenCalled();
  });
});
