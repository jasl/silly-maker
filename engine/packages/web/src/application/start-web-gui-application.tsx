// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";

import type { ApplicationHostCapabilitiesV1 } from "@sillymaker/base/host";
import type { GamepadActionMapV1, InputRouterV1, KeyboardActionMapV1 } from "@sillymaker/ui/input";
import {
  createInputRouterV1,
  InputContextProviderV1,
  installGamepadAdapterV1,
  installKeyboardAdapterV1,
} from "@sillymaker/ui/input";
import type { NativeBehaviorResetConfigV1 } from "@sillymaker/ui/native-behavior";
import { installNativeBehaviorResetV1 } from "@sillymaker/ui/native-behavior";
import type { GameViewportPropsV1 } from "@sillymaker/ui/viewport";
import { GameViewportV1 } from "@sillymaker/ui/viewport";

import { createBrowserFilePortV1 } from "../host/browser-file-port.ts";
import { createDesktopShellFetchInternalV1 } from "../host/desktop-shell-capability.ts";
import { createHttpHostRecordStoreV1 } from "../host/http-record-store.ts";
import { createShellFilePortV1 } from "../host/shell-file-port.ts";
import { createWebHostV1 } from "../host/create-web-host.ts";
import {
  type ApplicationStartupFailureReasonInternalV1,
  createWebApplicationStartupDiagnosticsControllerInternalV1,
  type WebApplicationStartupDiagnosticsControllerInternalV1,
} from "./application-startup-diagnostics.ts";
import { installDesktopCloseFlushV1 } from "./install-desktop-close-flush.ts";
import {
  type MountedGameApplicationV1,
  mountGameApplicationWithStartupDiagnosticsInternalV1,
} from "./mount-game-application.tsx";
import { readApplicationBootstrapConfigFromDocumentInternalV1 } from "./read-application-bootstrap-config.ts";
import { resolveLocalRecordsHostModeV1 } from "./resolve-local-records-host-mode.ts";
import {
  retryCurrentWebApplicationEntryInternalV1,
  WebApplicationFirstProductCommitInternalV1,
} from "./web-application-product-commit.tsx";
import styles from "./start-web-gui-application.module.css";

export interface WebGuiUiDefinitionV1 {
  /** The application-owned React tree mounted inside the declared viewport. */
  readonly content: ReactNode;
  /**
   * One-shot readiness for application-owned required domains. The UI mounts
   * before this settles so connection or recovery surfaces remain available.
   * Omit it when every required domain is ready after synchronous construction.
   */
  readonly requiredDomainReady?: Promise<void>;
  /**
   * The single product-owned Deno Desktop close preparation. `fence` must be a
   * synchronous, idempotent stop-ingress transition; `prepare` awaits the
   * product's already-aggregated durable work and owned resources.
   */
  readonly closePreparation?: WebGuiClosePreparationV1;
  /** Optional physical input adapters feeding the shared semantic router. */
  readonly input?: {
    readonly keyboard?: KeyboardActionMapV1;
    readonly gamepad?: GamepadActionMapV1;
    /**
     * GUI applications preserve browser-native behavior by default. Supplying
     * a config opts into the game-shell reset; `false` can document an
     * intentional native surface.
     */
    readonly nativeBehavior?: NativeBehaviorResetConfigV1 | false;
  };
  /** Releases application-owned resources created while binding the UI. */
  dispose?(): void;
}

export interface WebGuiClosePreparationV1 {
  fence(): void;
  prepare(): Promise<void>;
}

export type WebGuiViewportOptionsV1 = Omit<GameViewportPropsV1, "children">;

/**
 * A React GUI application with no implied authoritative Game Session, Save,
 * replay, or persistence lifecycle. Application data may use the supplied
 * Host ports explicitly when the product needs them.
 */
export interface WebGuiApplicationV1 {
  readonly applicationId: string;
  readonly viewport: WebGuiViewportOptionsV1;
  ui(input: {
    readonly host: ApplicationHostCapabilitiesV1;
    readonly inputRouter: InputRouterV1;
    reportFailure(code: string, error: unknown): void;
  }): WebGuiUiDefinitionV1;
}

export interface StartWebGuiApplicationOptionsV1 {
  readonly rootElement?: HTMLElement;
  readonly host?: ApplicationHostCapabilitiesV1;
  readonly databaseName?: string;
  /** Register the pagehide teardown listener; disable in tests. */
  readonly registerPageLifecycle?: boolean;
}

export interface StartedWebGuiApplicationV1 {
  readonly applicationId: string;
  readonly host: ApplicationHostCapabilitiesV1;
  isDisposed(): boolean;
  dispose(): Promise<void>;
}

/**
 * Boots one Browser/Deno Desktop React GUI without constructing a Game
 * Session or Save authority. The Host owns startup receipts, mounting,
 * viewport mapping, physical input adapters, and teardown only.
 */
export async function startWebGuiApplicationV1(
  application: WebGuiApplicationV1,
  options: StartWebGuiApplicationOptionsV1 = {},
): Promise<StartedWebGuiApplicationV1> {
  const usesDocumentEntry = options.rootElement === undefined && typeof document !== "undefined";
  let startupDiagnostics: WebApplicationStartupDiagnosticsControllerInternalV1 | null = null;
  let bootstrapTarget: "browser" | "deno_desktop" | null = null;
  let startupFailureReason: ApplicationStartupFailureReasonInternalV1 = "bootstrap_config";
  let startupAccepted = false;
  let productCommitted = false;

  const signalStartupFailure = (reason: ApplicationStartupFailureReasonInternalV1): void => {
    if (startupDiagnostics === null) return;
    try {
      startupDiagnostics.signalTerminalStartupFailure({
        reason,
        retry: retryCurrentWebApplicationEntryInternalV1,
      });
    } catch {
      // Preserve the construction/runtime failure when the admitted shell was
      // externally removed after startup began.
    }
  };

  if (usesDocumentEntry) {
    try {
      startupDiagnostics = createWebApplicationStartupDiagnosticsControllerInternalV1(document);
      bootstrapTarget = readApplicationBootstrapConfigFromDocumentInternalV1(
        document,
        "runtime",
      ).target;
    } catch (error) {
      signalStartupFailure("bootstrap_config");
      throw error;
    }
  }

  startupFailureReason = "unavailable";
  let rootElement: HTMLElement;
  try {
    const candidate = options.rootElement ??
      (typeof document === "undefined" ? null : document.querySelector("#root"));
    if (!(candidate instanceof HTMLElement)) {
      throw new TypeError("web.application_root_missing");
    }
    rootElement = candidate;
    await import("@sillymaker/ui/styles.css");
  } catch (error) {
    signalStartupFailure("unavailable");
    throw error;
  }

  let localRecordsHostMode: ReturnType<typeof resolveLocalRecordsHostModeV1>;
  try {
    localRecordsHostMode = resolveLocalRecordsHostModeV1(
      typeof location === "undefined" ? "" : location.search,
      Reflect.get(globalThis, "__SILLYMAKER_RECORDS__"),
      Reflect.get(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__"),
    );
  } catch (error) {
    signalStartupFailure("unavailable");
    throw error;
  }
  const { desktopShellCapability, usesDesktopShell, wantsLocalRecords } = localRecordsHostMode;
  if (
    bootstrapTarget !== null &&
    (bootstrapTarget === "deno_desktop") !== usesDesktopShell
  ) {
    signalStartupFailure("bootstrap_config");
    throw new TypeError("web.application_bootstrap.target_mismatch");
  }

  startupFailureReason = "required_domain";
  let host: ApplicationHostCapabilitiesV1;
  try {
    const desktopShellFetch = desktopShellCapability === null
      ? null
      : createDesktopShellFetchInternalV1(desktopShellCapability);
    host = options.host ??
      (wantsLocalRecords
        ? createWebHostV1({
          records: createHttpHostRecordStoreV1({
            baseUrl: "/sillymaker/records",
            ...(desktopShellFetch === null ? {} : { fetchImpl: desktopShellFetch }),
          }),
          ...(usesDesktopShell
            ? {
              files: createShellFilePortV1({
                baseUrl: "/sillymaker/files",
                picker: createBrowserFilePortV1(),
                ...(desktopShellFetch === null ? {} : { fetchImpl: desktopShellFetch }),
              }),
            }
            : {}),
        })
        : createWebHostV1({
          databaseName: options.databaseName ?? `sillymaker.${application.applicationId}`,
        }));
  } catch (error) {
    signalStartupFailure("required_domain");
    throw error;
  }
  const reportFailure = (code: string, error: unknown): void => {
    try {
      host.log.write("warn", code, {
        message: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // Diagnostics never change lifecycle precedence.
    }
  };

  const inputRouter = createInputRouterV1();
  let uiDefinition: WebGuiUiDefinitionV1 | undefined;
  let mounted: MountedGameApplicationV1 | undefined;
  let uninstallKeyboard: (() => void) | undefined;
  let gamepad: { dispose(): void } | undefined;
  let nativeBehaviorReset: { dispose(): void } | undefined;
  let removeDesktopCloseFlush: (() => void) | undefined;
  let removePageLifecycle: (() => void) | undefined;
  let closeFenced = false;
  let disposalStarted = false;
  let disposalPromise: Promise<void> | null = null;

  const disposeRuntime = async (disposeDiagnostics: boolean): Promise<void> => {
    if (disposalPromise === null) {
      disposalStarted = true;
      let completeDisposal!: () => void;
      disposalPromise = new Promise<void>((resolve) => {
        completeDisposal = resolve;
      });
      const runCleanup = (step: string, cleanup: () => void): void => {
        try {
          cleanup();
        } catch (error) {
          reportFailure(
            "web.gui_application_disposal_step_failed",
            new Error(step, { cause: error }),
          );
        }
      };
      for (
        const [step, cleanup] of [
          ["input", () => inputRouter.clearTransientInput()],
          ["page_lifecycle", () => removePageLifecycle?.()],
          ["desktop_close_flush", () => removeDesktopCloseFlush?.()],
          ["keyboard", () => uninstallKeyboard?.()],
          ["gamepad", () => gamepad?.dispose()],
          ["native_behavior", () => nativeBehaviorReset?.dispose()],
          ["root", () => mounted?.unmount()],
          ["ui", () => uiDefinition?.dispose?.()],
        ] as const
      ) {
        runCleanup(step, cleanup);
      }
      completeDisposal();
    }
    await disposalPromise;
    if (disposeDiagnostics && startupAccepted) startupDiagnostics?.dispose();
  };
  const dispose = (): Promise<void> => disposeRuntime(true);

  try {
    uiDefinition = application.ui({ host, inputRouter, reportFailure });
    const commitFirstProduct = (): void => {
      if (productCommitted) return;
      startupDiagnostics?.signalFirstProductCommit("presentation");
      productCommitted = true;
    };
    const rootNode: ReactElement = (
      <WebApplicationFirstProductCommitInternalV1 commit={commitFirstProduct}>
        <div
          data-application-id={application.applicationId}
          className={styles["application"]}
        >
          <InputContextProviderV1 router={inputRouter}>
            <GameViewportV1 {...application.viewport}>
              <div className={styles["surface"]}>{uiDefinition.content}</div>
            </GameViewportV1>
          </InputContextProviderV1>
        </div>
      </WebApplicationFirstProductCommitInternalV1>
    );

    startupFailureReason = "presentation";
    mounted = mountGameApplicationWithStartupDiagnosticsInternalV1(
      rootElement,
      rootNode,
      (error) => {
        queueMicrotask(() => {
          const failure = error instanceof Error
            ? error
            : new Error("web.gui_application_presentation_failed", { cause: error });
          signalStartupFailure("presentation");
          reportFailure("web.gui_application_presentation_failed", failure);
          void disposeRuntime(false);
        });
      },
    );

    if (uiDefinition.input?.keyboard !== undefined) {
      uninstallKeyboard = installKeyboardAdapterV1({
        router: inputRouter,
        map: uiDefinition.input.keyboard,
      });
    }
    if (uiDefinition.input?.gamepad !== undefined) {
      gamepad = installGamepadAdapterV1({
        router: inputRouter,
        map: uiDefinition.input.gamepad,
      });
    }
    const nativeBehavior = uiDefinition.input?.nativeBehavior;
    if (nativeBehavior !== undefined && nativeBehavior !== false) {
      nativeBehaviorReset = installNativeBehaviorResetV1(nativeBehavior);
    }
    removeDesktopCloseFlush = installDesktopCloseFlushV1({
      enabled: usesDesktopShell,
      fence: () => {
        if (closeFenced) return;
        uiDefinition?.closePreparation?.fence();
        closeFenced = true;
      },
      flush: () => uiDefinition?.closePreparation?.prepare() ?? Promise.resolve(),
      reportFailure: (error) => reportFailure("web.desktop_close_flush_failed", error),
    });

    if (
      options.registerPageLifecycle !== false &&
      typeof globalThis.addEventListener === "function"
    ) {
      const onPageHide = (): void => {
        void disposeRuntime(true);
      };
      globalThis.addEventListener("pagehide", onPageHide, { once: true });
      removePageLifecycle = () => globalThis.removeEventListener("pagehide", onPageHide);
    }
  } catch (error) {
    await disposeRuntime(false);
    signalStartupFailure(startupFailureReason);
    throw error;
  }

  startupAccepted = true;
  if (uiDefinition.requiredDomainReady === undefined) {
    startupDiagnostics?.signalRequiredDomainReady();
  } else {
    void uiDefinition.requiredDomainReady.then(
      () => {
        if (!disposalStarted) startupDiagnostics?.signalRequiredDomainReady();
      },
      (error: unknown) => {
        if (disposalStarted) return;
        signalStartupFailure("required_domain");
        reportFailure("web.gui_application_required_domain_failed", error);
        void disposeRuntime(false);
      },
    );
  }
  return {
    applicationId: application.applicationId,
    host,
    isDisposed: () => disposalStarted,
    dispose,
  };
}
