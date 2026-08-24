// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applicationStartupSignalEventNameInternalV1,
  type ApplicationStartupSignalDetailInternalV1,
  createWebApplicationStartupDiagnosticsControllerInternalV1,
} from "./application-startup-diagnostics.ts";

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

function installStaticBootShellV1(): HTMLElement {
  const shell = document.createElement("div");
  shell.id = "sillymaker-application-boot-shell";
  const pending = document.createElement("div");
  pending.setAttribute("role", "status");
  pending.setAttribute("aria-live", "polite");
  pending.setAttribute("aria-busy", "true");
  pending.setAttribute("data-sillymaker-boot-shell", "pending");
  pending.textContent = "Application starting";
  shell.append(pending);
  document.body.append(shell);
  return shell;
}

function observeStartupSignalsV1(shell: HTMLElement): ApplicationStartupSignalDetailInternalV1[] {
  const details: ApplicationStartupSignalDetailInternalV1[] = [];
  shell.addEventListener(applicationStartupSignalEventNameInternalV1, (event) => {
    const detail = (event as CustomEvent<ApplicationStartupSignalDetailInternalV1>).detail;

    details.push(detail);
  });
  return details;
}

describe("Web application startup diagnostics", () => {
  it("requires exactly one Host shell with exactly one pending child", () => {
    expect(() => createWebApplicationStartupDiagnosticsControllerInternalV1(document)).toThrow(
      "web.application_startup.invalid_boot_shell",
    );

    const first = installStaticBootShellV1();
    first.querySelector('[data-sillymaker-boot-shell="pending"]')?.remove();
    expect(() => createWebApplicationStartupDiagnosticsControllerInternalV1(document)).toThrow(
      "web.application_startup.invalid_pending_shell",
    );

    first.remove();
    installStaticBootShellV1();
    installStaticBootShellV1();
    expect(() => createWebApplicationStartupDiagnosticsControllerInternalV1(document)).toThrow(
      "web.application_startup.invalid_boot_shell",
    );
  });

  it("publishes independent readiness axes in call order and only once per signal", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    controller.signalOptionalCapabilityReady("ui.dev-dock");
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("pending");
    expect(shell.getAttribute("data-sillymaker-startup-required-domain")).toBe("pending");
    expect(shell.getAttribute("data-sillymaker-startup-optional-ready")).toBe(
      '["ui.dev-dock"]',
    );

    controller.signalRequiredDomainReady();
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("starting");
    controller.signalFirstProductCommit("action");
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("ready");
    expect(shell.getAttribute("data-sillymaker-startup-product-commit")).toBe("action");
    expect(shell.hidden).toBe(true);
    expect(
      shell.querySelector('[data-sillymaker-boot-shell="retired"]')?.getAttribute("aria-busy"),
    ).toBe("false");

    controller.signalOptionalCapabilityReady("ui.dev-dock");
    controller.signalRequiredDomainReady();
    controller.signalFirstProductCommit("presentation");
    expect(details).toEqual([
      { revision: 1, signal: "optional_capability_ready", capabilityId: "ui.dev-dock" },
      { revision: 1, signal: "required_domain_ready" },
      { revision: 1, signal: "first_product_commit", source: "action" },
    ]);
  });

  it("canonicalizes optional capability evidence without promoting required readiness", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    controller.signalOptionalCapabilityReady("z.optional");
    controller.signalOptionalCapabilityReady("a.optional");

    expect(shell.getAttribute("data-sillymaker-startup-optional-ready")).toBe(
      '["a.optional","z.optional"]',
    );
    expect(shell.getAttribute("data-sillymaker-startup-required-domain")).toBe("pending");
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("pending");
    expect(details.map((detail) => detail.signal)).toEqual([
      "optional_capability_ready",
      "optional_capability_ready",
    ]);
  });

  it.each(["presentation", "action"] as const)(
    "accepts a first %s commit before required-domain readiness",
    (source) => {
      const shell = installStaticBootShellV1();
      const details = observeStartupSignalsV1(shell);
      const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

      controller.signalFirstProductCommit(source);
      expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("starting");
      expect(shell.getAttribute("data-sillymaker-startup-required-domain")).toBe("pending");
      expect(shell.hidden).toBe(true);
      controller.signalRequiredDomainReady();

      expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("ready");
      expect(details).toEqual([
        { revision: 1, signal: "first_product_commit", source },
        { revision: 1, signal: "required_domain_ready" },
      ]);
    },
  );

  it("rejects malformed optional capability ids before publication", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    expect(() => controller.signalOptionalCapabilityReady("not ready")).toThrow(
      "web.application_startup.invalid_optional_capability_id",
    );
    expect(shell.getAttribute("data-sillymaker-startup-optional-ready")).toBe("[]");
    expect(details).toEqual([]);
  });

  it("renders a bounded terminal recovery UI and fences every later readiness signal", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const retry = vi.fn();
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    controller.signalTerminalStartupFailure({ reason: "required_domain", retry });

    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("failed");
    expect(shell.getAttribute("data-sillymaker-startup-required-domain")).toBe("failed");
    expect(shell.getAttribute("data-sillymaker-startup-recovery")).toBe("actionable");
    expect(shell.hidden).toBe(false);
    expect(shell.querySelector('[data-sillymaker-boot-shell="pending"]')).toBeNull();
    const alert = shell.querySelector<HTMLElement>('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("SM-STARTUP-REQUIRED");
    expect(alert?.innerHTML).not.toContain("required_domain");

    controller.signalRequiredDomainReady();
    controller.signalFirstProductCommit("presentation");
    controller.signalOptionalCapabilityReady("late.optional");
    controller.signalTerminalStartupFailure({ reason: "presentation", retry: vi.fn() });
    expect(details).toEqual([
      {
        revision: 1,
        signal: "terminal_startup_failure",
        diagnosticCode: "SM-STARTUP-REQUIRED",
        recovery: "actionable",
      },
    ]);
    expect(shell.getAttribute("data-sillymaker-startup-product-commit")).toBe("pending");
    expect(shell.getAttribute("data-sillymaker-startup-optional-ready")).toBe("[]");

    const retryButton = shell.querySelector<HTMLButtonElement>(
      '[data-sillymaker-startup-retry="actionable"]',
    );
    retryButton?.click();
    retryButton?.click();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retryButton?.disabled).toBe(true);
    expect(shell.getAttribute("data-sillymaker-startup-recovery")).toBe("requested");
    expect(details.at(-1)).toEqual({
      revision: 1,
      signal: "recovery_requested",
      diagnosticCode: "SM-STARTUP-REQUIRED",
    });
  });

  it("unhides recovery after product presentation while preserving proven domain readiness", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    controller.signalRequiredDomainReady();
    controller.signalFirstProductCommit("presentation");
    expect(shell.hidden).toBe(true);

    controller.signalTerminalStartupFailure({ reason: "presentation", retry: vi.fn() });
    controller.signalRequiredDomainReady();

    expect(shell.hidden).toBe(false);
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("failed");
    expect(shell.getAttribute("data-sillymaker-startup-required-domain")).toBe("ready");
    expect(shell.querySelector('[role="alert"]')).not.toBeNull();
    expect(details.map((detail) => detail.signal)).toEqual([
      "required_domain_ready",
      "first_product_commit",
      "terminal_startup_failure",
    ]);
  });

  it("keeps recovery actionable when its injected callback throws", () => {
    const shell = installStaticBootShellV1();
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);
    const retry = vi.fn(() => {
      throw new Error("private retry failure");
    });

    controller.signalTerminalStartupFailure({ reason: "unavailable", retry });
    const retryButton = shell.querySelector<HTMLButtonElement>("button");
    retryButton?.click();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(retryButton?.disabled).toBe(false);
    expect(retryButton?.textContent).toBe("Retry");
    expect(shell.getAttribute("data-sillymaker-startup-recovery")).toBe("actionable");
    expect(shell.textContent).not.toContain("private retry failure");
  });

  it("disposes idempotently and detaches an installed recovery action", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const retry = vi.fn();
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);
    controller.signalTerminalStartupFailure({ reason: "bootstrap_config", retry });
    const retryButton = shell.querySelector<HTMLButtonElement>("button");

    controller.dispose();
    controller.dispose();
    retryButton?.click();
    controller.signalRequiredDomainReady();
    controller.signalOptionalCapabilityReady("after.dispose");
    controller.signalFirstProductCommit("action");

    expect(retry).not.toHaveBeenCalled();
    expect(retryButton?.disabled).toBe(true);
    expect(retryButton?.getAttribute("data-sillymaker-startup-retry")).toBe("disposed");
    expect(shell.getAttribute("data-sillymaker-startup-controller")).toBe("disposed");
    expect(shell.getAttribute("data-sillymaker-startup-recovery")).toBe("disposed");
    expect(details).toHaveLength(1);
  });

  it("ignores all signals after disposal without changing the pending shell", () => {
    const shell = installStaticBootShellV1();
    const details = observeStartupSignalsV1(shell);
    const controller = createWebApplicationStartupDiagnosticsControllerInternalV1(document);

    controller.dispose();
    controller.signalTerminalStartupFailure({ reason: "unavailable", retry: vi.fn() });
    controller.signalRequiredDomainReady();
    controller.signalFirstProductCommit("presentation");

    expect(shell.querySelector('[data-sillymaker-boot-shell="pending"]')).not.toBeNull();
    expect(shell.getAttribute("data-sillymaker-startup-state")).toBe("pending");
    expect(details).toEqual([]);
  });
});
