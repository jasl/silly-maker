// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceSandboxFrameFailedV1,
  admitBrowserWorkspaceSandboxFrameReadyV1,
  admitBrowserWorkspaceSandboxWorkerBoundV1,
  createBrowserWorkspaceSandboxFrameBindV1,
} from "./browser-workspace-sandbox-bootstrap-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "./browser-workspace-sandbox-build-identity.ts";
import type { BrowserWorkspaceHostControlTransportV1 } from "./browser-workspace-host-port.ts";
export {
  browserWorkspaceSandboxDevelopmentControlOriginV1,
  browserWorkspaceSandboxDevelopmentOriginV1,
  browserWorkspaceSandboxInteractiveDevelopmentControlOriginV1,
  browserWorkspaceSandboxOriginForControlV1,
  browserWorkspaceSandboxProductionControlOriginV1,
  browserWorkspaceSandboxProductionOriginV1,
} from "./browser-workspace-sandbox-origins.ts";
import { browserWorkspaceSandboxOriginForControlV1 } from "./browser-workspace-sandbox-origins.ts";

const browserWorkspaceSandboxBootstrapTimeoutMillisecondsV1 = 10_000;
const browserWorkspaceSandboxQueuedMessageMaximumV1 = 64;

type BrowserWorkspaceSandboxMessageListenerV1 = (event: Readonly<{ data: unknown }>) => void;
type BrowserWorkspaceSandboxFailureListenerV1 = (event: Event) => void;

export interface BrowserWorkspaceSandboxFrameTransportOptionsV1 {
  readonly window?: Window;
  readonly document?: Document;
  readonly controlOrigin?: string;
  readonly sandboxOrigin?: string;
  readonly buildIdentity?: string;
  readonly createNonce?: () => string;
  readonly createMessageChannel?: () => MessageChannel;
  readonly bootstrapTimeoutMilliseconds?: number;
}

interface QueuedSandboxMessageV1 {
  readonly message: unknown;
  readonly transfer: readonly Transferable[];
}

function strictOriginV1(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.origin === value && url.username === "" && url.password === "" &&
      url.pathname === "/" && url.search === "" && url.hash === "" &&
      (url.protocol === "https:" || url.protocol === "http:")
    ? url.origin
    : null;
}

function closeTransferablesV1(transfer: readonly Transferable[]): void {
  for (const value of transfer) {
    if (typeof MessagePort !== "undefined" && value instanceof MessagePort) value.close();
  }
}

function validBootstrapIdentityV1(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/u.test(value);
}

/**
 * Creates the ordinary transport to the fixed independent Workspace origin.
 * It never falls back to a same-origin Worker.
 */
export function createBrowserWorkspaceSandboxFrameTransportV1(
  options: BrowserWorkspaceSandboxFrameTransportOptionsV1 = {},
): BrowserWorkspaceHostControlTransportV1 {
  const ownerWindow = options.window ?? window;
  const ownerDocument = options.document ?? document;
  const controlOrigin = options.controlOrigin ?? ownerWindow.location.origin;
  const admittedControlOrigin = strictOriginV1(controlOrigin);
  const expectedSandboxOrigin = admittedControlOrigin === null
    ? null
    : browserWorkspaceSandboxOriginForControlV1(admittedControlOrigin);
  const sandboxOrigin = options.sandboxOrigin ?? expectedSandboxOrigin;
  if (
    admittedControlOrigin === null || expectedSandboxOrigin === null || sandboxOrigin === null ||
    strictOriginV1(sandboxOrigin) !== sandboxOrigin || sandboxOrigin !== expectedSandboxOrigin
  ) {
    throw new TypeError("sillyos.workspace_sandbox.origin_unavailable");
  }
  const buildIdentity = options.buildIdentity ?? browserWorkspaceSandboxArtifactBuildIdentityV1;
  const nonce = options.createNonce?.() ?? `sandbox.bootstrap.${crypto.randomUUID()}`;
  if (!validBootstrapIdentityV1(buildIdentity) || !validBootstrapIdentityV1(nonce)) {
    throw new TypeError("sillyos.workspace_sandbox.identity_invalid");
  }
  const bootstrapTimeoutMilliseconds = options.bootstrapTimeoutMilliseconds ??
    browserWorkspaceSandboxBootstrapTimeoutMillisecondsV1;
  if (
    !Number.isSafeInteger(bootstrapTimeoutMilliseconds) || bootstrapTimeoutMilliseconds <= 0 ||
    bootstrapTimeoutMilliseconds > 60_000
  ) throw new TypeError("sillyos.workspace_sandbox.timeout_invalid");
  if (ownerDocument.body === null) {
    throw new TypeError("sillyos.workspace_sandbox.document_unavailable");
  }

  const messageListeners = new Set<BrowserWorkspaceSandboxMessageListenerV1>();
  const failureListeners = new Map<
    "error" | "messageerror",
    Set<BrowserWorkspaceSandboxFailureListenerV1>
  >([
    ["error", new Set()],
    ["messageerror", new Set()],
  ]);
  const queued: QueuedSandboxMessageV1[] = [];
  // oxlint-disable-next-line react/iframe-missing-sandbox -- The programmatic frame receives its exact sandbox tokens before insertion.
  const iframe = ownerDocument.createElement("iframe");
  iframe.name = "sillyos-workspace-sandbox";
  iframe.hidden = true;
  iframe.tabIndex = -1;
  iframe.referrerPolicy = "no-referrer";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("data-silly-os-workspace-sandbox", "active");
  iframe.sandbox.add("allow-scripts", "allow-same-origin", "allow-downloads");
  const frameUrl = new URL("/workspace-sandbox.html", sandboxOrigin);
  frameUrl.search = new URLSearchParams([
    ["control-origin", admittedControlOrigin],
    ["nonce", nonce],
    ["expected-sandbox-identity", buildIdentity],
  ]).toString();
  iframe.src = frameUrl.href;

  let state: "waiting_frame" | "waiting_worker" | "ready" | "disposed" = "waiting_frame";
  let controlPort: MessagePort | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const dispatchFailureV1 = (type: "error" | "messageerror"): void => {
    const event = new Event(type);
    for (const listener of failureListeners.get(type) ?? []) listener(event);
  };

  const removeOwnerListenersV1 = (): void => {
    ownerWindow.removeEventListener("message", onWindowMessageV1);
    iframe.removeEventListener("error", onFrameErrorV1);
  };

  const disposeV1 = (failure: "error" | "messageerror" | null): void => {
    if (state === "disposed") return;
    state = "disposed";
    if (timer !== null) clearTimeout(timer);
    timer = null;
    removeOwnerListenersV1();
    controlPort?.close();
    controlPort = null;
    iframe.remove();
    for (const record of queued) closeTransferablesV1(record.transfer);
    queued.length = 0;
    if (failure !== null) dispatchFailureV1(failure);
  };

  const failV1 = (type: "error" | "messageerror"): void => disposeV1(type);

  const flushV1 = (): void => {
    const port = controlPort;
    if (state !== "ready" || port === null) return;
    try {
      for (const record of queued) port.postMessage(record.message, [...record.transfer]);
      queued.length = 0;
    } catch {
      failV1("error");
    }
  };

  const onControlMessageV1 = (event: MessageEvent<unknown>): void => {
    if (state === "waiting_worker") {
      const bound = admitBrowserWorkspaceSandboxWorkerBoundV1(event.data);
      if (
        bound === null || bound.nonce !== nonce || bound.buildIdentity !== buildIdentity
      ) {
        failV1("messageerror");
        return;
      }
      state = "ready";
      if (timer !== null) clearTimeout(timer);
      timer = null;
      flushV1();
      return;
    }
    if (state !== "ready" || admitBrowserWorkspaceSandboxWorkerBoundV1(event.data) !== null) {
      failV1("messageerror");
      return;
    }
    for (const listener of messageListeners) listener({ data: event.data });
  };

  const onControlMessageErrorV1 = (): void => failV1("messageerror");

  function onFrameErrorV1(): void {
    failV1("error");
  }

  function onWindowMessageV1(event: MessageEvent<unknown>): void {
    if (event.source !== iframe.contentWindow || event.origin !== sandboxOrigin) return;
    const failed = admitBrowserWorkspaceSandboxFrameFailedV1(event.data);
    if (failed !== null) {
      if (failed.nonce === nonce && failed.buildIdentity === buildIdentity) failV1("error");
      else failV1("messageerror");
      return;
    }
    const ready = admitBrowserWorkspaceSandboxFrameReadyV1(event.data);
    if (
      state !== "waiting_frame" || ready === null || ready.nonce !== nonce ||
      ready.buildIdentity !== buildIdentity
    ) {
      failV1("messageerror");
      return;
    }
    const frameWindow = iframe.contentWindow;
    if (frameWindow === null) {
      failV1("error");
      return;
    }
    const channel = options.createMessageChannel?.() ?? new MessageChannel();
    controlPort = channel.port1;
    controlPort.addEventListener("message", onControlMessageV1);
    controlPort.addEventListener("messageerror", onControlMessageErrorV1);
    controlPort.start();
    state = "waiting_worker";
    try {
      frameWindow.postMessage(
        createBrowserWorkspaceSandboxFrameBindV1(nonce, buildIdentity),
        sandboxOrigin,
        [channel.port2],
      );
    } catch {
      channel.port2.close();
      failV1("error");
    }
  }

  ownerWindow.addEventListener("message", onWindowMessageV1);
  iframe.addEventListener("error", onFrameErrorV1);
  ownerDocument.body.append(iframe);
  timer = setTimeout(() => failV1("error"), bootstrapTimeoutMilliseconds);

  return {
    postMessage(message, transfer = []) {
      if (state === "disposed") {
        closeTransferablesV1(transfer);
        throw new TypeError("sillyos.workspace_sandbox.transport_disposed");
      }
      if (state !== "ready") {
        if (queued.length >= browserWorkspaceSandboxQueuedMessageMaximumV1) {
          closeTransferablesV1(transfer);
          failV1("error");
          throw new TypeError("sillyos.workspace_sandbox.bootstrap_queue_full");
        }
        queued.push({ message, transfer: [...transfer] });
        return;
      }
      const port = controlPort;
      if (port === null) throw new TypeError("sillyos.workspace_sandbox.transport_disposed");
      port.postMessage(message, transfer);
    },
    addEventListener(type, listener) {
      if (type === "message") {
        messageListeners.add(listener as BrowserWorkspaceSandboxMessageListenerV1);
      } else {
        failureListeners.get(type)?.add(listener as BrowserWorkspaceSandboxFailureListenerV1);
      }
    },
    removeEventListener(type, listener) {
      if (type === "message") {
        messageListeners.delete(listener as BrowserWorkspaceSandboxMessageListenerV1);
      } else {
        failureListeners.get(type)?.delete(listener as BrowserWorkspaceSandboxFailureListenerV1);
      }
    },
    terminate() {
      disposeV1(null);
    },
  } satisfies BrowserWorkspaceHostControlTransportV1;
}
