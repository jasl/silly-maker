// SPDX-License-Identifier: MIT

import {
  admitBrowserNetworkBrokerFrameFailedV1,
  admitBrowserNetworkBrokerFrameReadyV1,
  admitBrowserNetworkBrokerWorkerBoundV1,
  createBrowserNetworkBrokerFrameBindV1,
} from "./browser-network-broker-bootstrap-protocol.ts";
import { browserNetworkBrokerArtifactBuildIdentityV1 } from "./browser-network-broker-build-identity.ts";
import { browserNetworkBrokerOriginForControlV1 } from "./browser-network-broker-origins.ts";

const browserNetworkBrokerBootstrapTimeoutMillisecondsV1 = 10_000;

export interface BrowserNetworkBrokerLeaseV1 {
  readonly agentPort: MessagePort;
  terminate(): void;
}

export interface BrowserNetworkBrokerFrameTransportOptionsV1 {
  readonly window?: Window;
  readonly document?: Document;
  readonly controlOrigin?: string;
  readonly brokerOrigin?: string;
  readonly buildIdentity?: string;
  readonly createNonce?: () => string;
  readonly createMessageChannel?: () => MessageChannel;
  readonly bootstrapTimeoutMilliseconds?: number;
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

function validBootstrapIdentityV1(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u.test(value);
}

/** Opens the fixed third-origin Broker and returns its one transferable Agent port. */
export function createBrowserNetworkBrokerFrameTransportV1(
  options: BrowserNetworkBrokerFrameTransportOptionsV1 = {},
): Promise<BrowserNetworkBrokerLeaseV1> {
  const ownerWindow = options.window ?? window;
  const ownerDocument = options.document ?? document;
  const controlOrigin = options.controlOrigin ?? ownerWindow.location.origin;
  const admittedControlOrigin = strictOriginV1(controlOrigin);
  const expectedBrokerOrigin = admittedControlOrigin === null
    ? null
    : browserNetworkBrokerOriginForControlV1(admittedControlOrigin);
  const brokerOrigin = options.brokerOrigin ?? expectedBrokerOrigin;
  if (
    admittedControlOrigin === null || expectedBrokerOrigin === null || brokerOrigin === null ||
    strictOriginV1(brokerOrigin) !== brokerOrigin || brokerOrigin !== expectedBrokerOrigin
  ) throw new TypeError("sillyos.network_broker.origin_unavailable");

  const buildIdentity = options.buildIdentity ?? browserNetworkBrokerArtifactBuildIdentityV1;
  const nonce = options.createNonce?.() ?? `network.bootstrap.${crypto.randomUUID()}`;
  if (!validBootstrapIdentityV1(buildIdentity) || !validBootstrapIdentityV1(nonce)) {
    throw new TypeError("sillyos.network_broker.identity_invalid");
  }
  const bootstrapTimeoutMilliseconds = options.bootstrapTimeoutMilliseconds ??
    browserNetworkBrokerBootstrapTimeoutMillisecondsV1;
  if (
    !Number.isSafeInteger(bootstrapTimeoutMilliseconds) || bootstrapTimeoutMilliseconds <= 0 ||
    bootstrapTimeoutMilliseconds > 60_000
  ) throw new TypeError("sillyos.network_broker.timeout_invalid");
  if (ownerDocument.body === null) {
    throw new TypeError("sillyos.network_broker.document_unavailable");
  }

  // oxlint-disable-next-line react/iframe-missing-sandbox -- Exact tokens are applied before insertion.
  const iframe = ownerDocument.createElement("iframe");
  iframe.name = "sillyos-network-broker";
  iframe.hidden = true;
  iframe.tabIndex = -1;
  iframe.referrerPolicy = "no-referrer";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("data-silly-os-network-broker", "active");
  iframe.sandbox.add("allow-scripts", "allow-same-origin");
  const frameUrl = new URL("/network-broker.html", brokerOrigin);
  frameUrl.search = new URLSearchParams([
    ["control-origin", admittedControlOrigin],
    ["nonce", nonce],
    ["expected-broker-identity", buildIdentity],
  ]).toString();
  iframe.src = frameUrl.href;

  return new Promise<BrowserNetworkBrokerLeaseV1>((resolve, reject) => {
    let state: "waiting_frame" | "waiting_worker" | "ready" | "disposed" = "waiting_frame";
    let controlPort: MessagePort | null = null;
    let agentPort: MessagePort | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const removeListenersV1 = (): void => {
      ownerWindow.removeEventListener("message", onWindowMessageV1);
      iframe.removeEventListener("error", onFrameErrorV1);
      controlPort?.removeEventListener("message", onControlMessageV1);
      controlPort?.removeEventListener("messageerror", onControlMessageErrorV1);
    };
    const disposeV1 = (): void => {
      if (state === "disposed") return;
      state = "disposed";
      if (timer !== null) clearTimeout(timer);
      timer = null;
      removeListenersV1();
      try {
        controlPort?.close();
      } catch {
        // A transferred port may already be detached.
      }
      try {
        agentPort?.close();
      } catch {
        // A transferred port may already be detached.
      }
      controlPort = null;
      agentPort = null;
      iframe.remove();
    };
    const failV1 = (code: string): void => {
      if (state === "disposed" || state === "ready") return;
      disposeV1();
      reject(new TypeError(`sillyos.network_broker.${code}`));
    };
    function onFrameErrorV1(): void {
      failV1("frame_unavailable");
    }
    function onControlMessageErrorV1(): void {
      failV1("bootstrap_rejected");
    }
    function onControlMessageV1(event: MessageEvent<unknown>): void {
      const bound = admitBrowserNetworkBrokerWorkerBoundV1(event.data);
      if (
        state !== "waiting_worker" || bound === null || bound.nonce !== nonce ||
        bound.buildIdentity !== buildIdentity || event.ports.length !== 1
      ) {
        for (const port of event.ports) port.close();
        failV1("bootstrap_rejected");
        return;
      }
      const transferredAgentPort = event.ports[0];
      if (transferredAgentPort === undefined) {
        failV1("bootstrap_rejected");
        return;
      }
      state = "ready";
      if (timer !== null) clearTimeout(timer);
      timer = null;
      removeListenersV1();
      controlPort?.close();
      controlPort = null;
      agentPort = transferredAgentPort;
      resolve(Object.freeze({
        agentPort: transferredAgentPort,
        terminate: disposeV1,
      }));
    }
    function onWindowMessageV1(event: MessageEvent<unknown>): void {
      if (event.source !== iframe.contentWindow || event.origin !== brokerOrigin) return;
      const failed = admitBrowserNetworkBrokerFrameFailedV1(event.data);
      if (failed !== null) {
        if (failed.nonce === nonce && failed.buildIdentity === buildIdentity) {
          failV1(failed.code);
        } else failV1("bootstrap_rejected");
        return;
      }
      const ready = admitBrowserNetworkBrokerFrameReadyV1(event.data);
      if (
        state !== "waiting_frame" || ready === null || ready.nonce !== nonce ||
        ready.buildIdentity !== buildIdentity
      ) {
        failV1("bootstrap_rejected");
        return;
      }
      const frameWindow = iframe.contentWindow;
      if (frameWindow === null) {
        failV1("frame_unavailable");
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
          createBrowserNetworkBrokerFrameBindV1(nonce, buildIdentity),
          brokerOrigin,
          [channel.port2],
        );
      } catch {
        channel.port2.close();
        failV1("frame_unavailable");
      }
    }

    ownerWindow.addEventListener("message", onWindowMessageV1);
    iframe.addEventListener("error", onFrameErrorV1);
    ownerDocument.body?.append(iframe);
    timer = setTimeout(() => failV1("bootstrap_timeout"), bootstrapTimeoutMilliseconds);
  });
}

export {
  browserNetworkBrokerDevelopmentControlOriginV1,
  browserNetworkBrokerDevelopmentOriginV1,
  browserNetworkBrokerInteractiveDevelopmentControlOriginV1,
  browserNetworkBrokerOriginForControlV1,
  browserNetworkBrokerProductionControlOriginV1,
  browserNetworkBrokerProductionOriginV1,
} from "./browser-network-broker-origins.ts";
