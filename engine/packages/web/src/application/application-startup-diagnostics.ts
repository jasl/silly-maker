// SPDX-License-Identifier: MIT

const applicationBootShellIdInternalV1 = "sillymaker-application-boot-shell";
const applicationBootShellPendingSelectorInternalV1 = '[data-sillymaker-boot-shell="pending"]';

export const applicationStartupSignalEventNameInternalV1 = "sillymaker:application-startup-signal";

export type FirstProductCommitSourceInternalV1 = "presentation" | "action";

export type ApplicationStartupFailureReasonInternalV1 =
  | "bootstrap_config"
  | "presentation"
  | "required_domain"
  | "unavailable";

export type ApplicationStartupDiagnosticCodeInternalV1 =
  | "SM-STARTUP-CONFIG"
  | "SM-STARTUP-PRESENTATION"
  | "SM-STARTUP-REQUIRED"
  | "SM-STARTUP-UNAVAILABLE";

export type ApplicationStartupSignalDetailInternalV1 =
  | Readonly<{
    readonly revision: 1;
    readonly signal: "first_product_commit";
    readonly source: FirstProductCommitSourceInternalV1;
  }>
  | Readonly<{
    readonly revision: 1;
    readonly signal: "required_domain_ready";
  }>
  | Readonly<{
    readonly revision: 1;
    readonly signal: "optional_capability_ready";
    readonly capabilityId: string;
  }>
  | Readonly<{
    readonly revision: 1;
    readonly signal: "terminal_startup_failure";
    readonly diagnosticCode: ApplicationStartupDiagnosticCodeInternalV1;
    readonly recovery: "actionable";
  }>
  | Readonly<{
    readonly revision: 1;
    readonly signal: "recovery_requested";
    readonly diagnosticCode: ApplicationStartupDiagnosticCodeInternalV1;
  }>;

export interface WebApplicationStartupDiagnosticsControllerInternalV1 {
  signalFirstProductCommit(source: FirstProductCommitSourceInternalV1): void;
  signalRequiredDomainReady(): void;
  signalOptionalCapabilityReady(capabilityId: string): void;
  signalTerminalStartupFailure(input: {
    readonly reason: ApplicationStartupFailureReasonInternalV1;
    retry(): void;
  }): void;
  dispose(): void;
}

const diagnosticCodesInternalV1 = {
  bootstrap_config: "SM-STARTUP-CONFIG",
  presentation: "SM-STARTUP-PRESENTATION",
  required_domain: "SM-STARTUP-REQUIRED",
  unavailable: "SM-STARTUP-UNAVAILABLE",
} satisfies Readonly<
  Record<ApplicationStartupFailureReasonInternalV1, ApplicationStartupDiagnosticCodeInternalV1>
>;

const optionalCapabilityIdPatternInternalV1 = /^[a-z0-9](?:[a-z0-9._:-]{0,126}[a-z0-9])?$/;

function resolveBootShellInternalV1(
  document: Document,
): Readonly<{ readonly shell: HTMLElement; readonly pending: HTMLElement }> {
  const shells = document.querySelectorAll(`[id="${applicationBootShellIdInternalV1}"]`);
  if (shells.length !== 1) {
    throw new TypeError("web.application_startup.invalid_boot_shell");
  }
  const shell = shells.item(0);
  const HTMLElementConstructor = document.defaultView?.HTMLElement;
  if (HTMLElementConstructor === undefined || !(shell instanceof HTMLElementConstructor)) {
    throw new TypeError("web.application_startup.invalid_boot_shell");
  }
  const pending = shell.querySelectorAll(applicationBootShellPendingSelectorInternalV1);
  if (pending.length !== 1) {
    throw new TypeError("web.application_startup.invalid_pending_shell");
  }
  const pendingElement = pending.item(0);
  if (!(pendingElement instanceof HTMLElementConstructor)) {
    throw new TypeError("web.application_startup.invalid_pending_shell");
  }
  return ({ shell, pending: pendingElement });
}

function assertOptionalCapabilityIdInternalV1(capabilityId: string): void {
  if (!optionalCapabilityIdPatternInternalV1.test(capabilityId)) {
    throw new TypeError("web.application_startup.invalid_optional_capability_id");
  }
}

function dispatchStartupSignalInternalV1(
  shell: HTMLElement,
  detail: ApplicationStartupSignalDetailInternalV1,
): void {
  const CustomEventConstructor = shell.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
  shell.dispatchEvent(
    new CustomEventConstructor<ApplicationStartupSignalDetailInternalV1>(
      applicationStartupSignalEventNameInternalV1,
      { bubbles: true, detail: detail },
    ),
  );
}

function updateAggregateStateInternalV1(
  shell: HTMLElement,
  productCommitted: boolean,
  requiredDomainReady: boolean,
): void {
  shell.setAttribute(
    "data-sillymaker-startup-state",
    productCommitted && requiredDomainReady
      ? "ready"
      : productCommitted || requiredDomainReady
      ? "starting"
      : "pending",
  );
}

function createTerminalFailureContentInternalV1(input: {
  readonly document: Document;
  readonly diagnosticCode: ApplicationStartupDiagnosticCodeInternalV1;
}): Readonly<{ readonly alert: HTMLDivElement; readonly retryButton: HTMLButtonElement }> {
  const alert = input.document.createElement("div");
  alert.setAttribute("role", "alert");
  alert.setAttribute("aria-live", "assertive");
  alert.setAttribute("data-sillymaker-startup-failure", "terminal");

  const message = input.document.createElement("p");
  message.textContent = "The application could not start.";

  const diagnostic = input.document.createElement("p");
  diagnostic.append("Diagnostic code: ");
  const code = input.document.createElement("code");
  code.setAttribute("data-sillymaker-startup-diagnostic-code", input.diagnosticCode);
  code.textContent = input.diagnosticCode;
  diagnostic.append(code);

  const retryButton = input.document.createElement("button");
  retryButton.type = "button";
  retryButton.setAttribute("data-sillymaker-startup-retry", "actionable");
  retryButton.textContent = "Retry";

  alert.append(message, diagnostic, retryButton);
  return ({ alert, retryButton });
}

/**
 * @internal Publishes bounded Host-startup evidence without owning application
 * State. The first accepted signal on each axis wins; a terminal failure fences
 * all later readiness publication while retaining an accessible recovery UI.
 */
export function createWebApplicationStartupDiagnosticsControllerInternalV1(
  document: Document,
): WebApplicationStartupDiagnosticsControllerInternalV1 {
  const resolvedShell = resolveBootShellInternalV1(document);
  const { shell, pending } = resolvedShell;
  const optionalCapabilityIds = new Set<string>();
  let disposed = false;
  let terminal = false;
  let productCommitted = false;
  let requiredDomainReady = false;
  let retryRequested = false;
  let retryButton: HTMLButtonElement | null = null;
  let retryListener: (() => void) | null = null;

  shell.setAttribute("data-sillymaker-startup-controller", "active");
  shell.setAttribute("data-sillymaker-startup-product-commit", "pending");
  shell.setAttribute("data-sillymaker-startup-required-domain", "pending");
  shell.setAttribute("data-sillymaker-startup-optional-ready", "[]");
  updateAggregateStateInternalV1(shell, productCommitted, requiredDomainReady);

  return ({
    signalFirstProductCommit(source: FirstProductCommitSourceInternalV1): void {
      if (disposed || terminal || productCommitted) return;
      productCommitted = true;
      pending.setAttribute("data-sillymaker-boot-shell", "retired");
      pending.setAttribute("aria-busy", "false");
      shell.hidden = true;
      shell.setAttribute("data-sillymaker-startup-product-commit", source);
      updateAggregateStateInternalV1(shell, productCommitted, requiredDomainReady);
      dispatchStartupSignalInternalV1(
        shell,
        { revision: 1, signal: "first_product_commit", source },
      );
    },
    signalRequiredDomainReady(): void {
      if (disposed || terminal || requiredDomainReady) return;
      requiredDomainReady = true;
      shell.setAttribute("data-sillymaker-startup-required-domain", "ready");
      updateAggregateStateInternalV1(shell, productCommitted, requiredDomainReady);
      dispatchStartupSignalInternalV1(
        shell,
        { revision: 1, signal: "required_domain_ready" },
      );
    },
    signalOptionalCapabilityReady(capabilityId: string): void {
      if (disposed || terminal || optionalCapabilityIds.has(capabilityId)) return;
      assertOptionalCapabilityIdInternalV1(capabilityId);
      optionalCapabilityIds.add(capabilityId);
      shell.setAttribute(
        "data-sillymaker-startup-optional-ready",
        JSON.stringify([...optionalCapabilityIds].sort()),
      );
      dispatchStartupSignalInternalV1(
        shell,
        { revision: 1, signal: "optional_capability_ready", capabilityId },
      );
    },
    signalTerminalStartupFailure(input: {
      readonly reason: ApplicationStartupFailureReasonInternalV1;
      retry(): void;
    }): void {
      if (disposed || terminal) return;
      terminal = true;
      const diagnosticCode = diagnosticCodesInternalV1[input.reason];
      const content = createTerminalFailureContentInternalV1({ document, diagnosticCode });
      retryButton = content.retryButton;
      retryListener = () => {
        if (disposed || retryRequested) return;
        retryRequested = true;
        content.retryButton.disabled = true;
        content.retryButton.setAttribute("data-sillymaker-startup-retry", "requested");
        shell.setAttribute("data-sillymaker-startup-recovery", "requested");
        dispatchStartupSignalInternalV1(
          shell,
          { revision: 1, signal: "recovery_requested", diagnosticCode },
        );
        try {
          input.retry();
        } catch {
          retryRequested = false;
          content.retryButton.disabled = false;
          content.retryButton.setAttribute("data-sillymaker-startup-retry", "actionable");
          shell.setAttribute("data-sillymaker-startup-recovery", "actionable");
        }
      };
      content.retryButton.addEventListener("click", retryListener);

      shell.setAttribute("data-sillymaker-startup-state", "failed");
      if (!requiredDomainReady) {
        shell.setAttribute("data-sillymaker-startup-required-domain", "failed");
      }
      shell.setAttribute("data-sillymaker-startup-diagnostic-code", diagnosticCode);
      shell.setAttribute("data-sillymaker-startup-recovery", "actionable");
      shell.hidden = false;
      shell.replaceChildren(content.alert);
      dispatchStartupSignalInternalV1(
        shell,
        {
          revision: 1,
          signal: "terminal_startup_failure",
          diagnosticCode,
          recovery: "actionable",
        },
      );
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (retryButton !== null && retryListener !== null) {
        retryButton.removeEventListener("click", retryListener);
        retryButton.disabled = true;
        retryButton.setAttribute("data-sillymaker-startup-retry", "disposed");
      }
      shell.setAttribute("data-sillymaker-startup-controller", "disposed");
      if (terminal) shell.setAttribute("data-sillymaker-startup-recovery", "disposed");
    },
  });
}
