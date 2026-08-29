// SPDX-License-Identifier: MIT

import {
  admitBrowserNetworkBrokerFrameBindV1,
  admitBrowserNetworkBrokerFrameReadyV1,
  createBrowserNetworkBrokerFrameFailedV1,
  createBrowserNetworkBrokerFrameReadyV1,
  createBrowserNetworkBrokerWorkerBindV1,
} from "../network/browser-network-broker-bootstrap-protocol.ts";
import { browserNetworkBrokerArtifactBuildIdentityV1 } from "../network/browser-network-broker-build-identity.ts";
import { browserNetworkBrokerOriginForControlV1 } from "../network/browser-network-broker-origins.ts";

interface NetworkBrokerBootstrapParametersV1 {
  readonly controlOrigin: string;
  readonly nonce: string;
  readonly buildIdentity: string;
}

function readBootstrapParametersV1(): NetworkBrokerBootstrapParametersV1 | null {
  const locationUrl = new URL(window.location.href);
  if (
    locationUrl.pathname !== "/network-broker.html" || locationUrl.hash !== "" ||
    locationUrl.searchParams.size !== 3
  ) return null;
  const controlOriginValues = locationUrl.searchParams.getAll("control-origin");
  const nonceValues = locationUrl.searchParams.getAll("nonce");
  const buildIdentityValues = locationUrl.searchParams.getAll("expected-broker-identity");
  if (
    controlOriginValues.length !== 1 || nonceValues.length !== 1 ||
    buildIdentityValues.length !== 1
  ) return null;
  const controlOrigin = controlOriginValues[0];
  const nonce = nonceValues[0];
  const buildIdentity = buildIdentityValues[0];
  if (controlOrigin === undefined || nonce === undefined || buildIdentity === undefined) {
    return null;
  }
  const canonicalSearch = new URLSearchParams([
    ["control-origin", controlOrigin],
    ["nonce", nonce],
    ["expected-broker-identity", buildIdentity],
  ]).toString();
  if (locationUrl.search !== `?${canonicalSearch}`) return null;
  if (
    browserNetworkBrokerOriginForControlV1(controlOrigin) !== window.location.origin ||
    buildIdentity !== browserNetworkBrokerArtifactBuildIdentityV1
  ) return null;
  const ready = createBrowserNetworkBrokerFrameReadyV1(nonce, buildIdentity);
  return admitBrowserNetworkBrokerFrameReadyV1(ready) === null
    ? null
    : { controlOrigin, nonce, buildIdentity };
}

function closePortsV1(ports: readonly MessagePort[]): void {
  for (const port of ports) port.close();
}

function startNetworkBrokerBootstrapV1(): void {
  if (window.parent === window) return;
  const parameters = readBootstrapParametersV1();
  if (parameters === null) return;
  let settledV1 = false;

  const reportFailureV1 = (code: "bootstrap_rejected" | "worker_unavailable"): void => {
    if (settledV1) return;
    settledV1 = true;
    window.removeEventListener("message", receiveFrameMessageV1);
    window.parent.postMessage(
      createBrowserNetworkBrokerFrameFailedV1(
        parameters.nonce,
        parameters.buildIdentity,
        code,
      ),
      parameters.controlOrigin,
    );
  };

  const receiveFrameMessageV1 = (event: MessageEvent<unknown>): void => {
    if (
      settledV1 || event.source !== window.parent || event.origin !== parameters.controlOrigin
    ) {
      closePortsV1(event.ports);
      return;
    }
    const bind = admitBrowserNetworkBrokerFrameBindV1(event.data);
    if (
      bind === null || bind.nonce !== parameters.nonce ||
      bind.buildIdentity !== parameters.buildIdentity || event.ports.length !== 1
    ) {
      closePortsV1(event.ports);
      reportFailureV1("bootstrap_rejected");
      return;
    }
    const bootstrapPort = event.ports[0];
    if (bootstrapPort === undefined) {
      reportFailureV1("bootstrap_rejected");
      return;
    }
    settledV1 = true;
    window.removeEventListener("message", receiveFrameMessageV1);
    try {
      const worker = new Worker(
        new URL("./browser-network-broker.worker.ts", import.meta.url),
        { name: "silly-os-network-broker-v1", type: "module" },
      );
      worker.postMessage(
        createBrowserNetworkBrokerWorkerBindV1(
          parameters.nonce,
          parameters.buildIdentity,
        ),
        [bootstrapPort],
      );
    } catch {
      bootstrapPort.close();
      window.parent.postMessage(
        createBrowserNetworkBrokerFrameFailedV1(
          parameters.nonce,
          parameters.buildIdentity,
          "worker_unavailable",
        ),
        parameters.controlOrigin,
      );
    }
  };

  window.addEventListener("message", receiveFrameMessageV1);
  window.parent.postMessage(
    createBrowserNetworkBrokerFrameReadyV1(
      parameters.nonce,
      parameters.buildIdentity,
    ),
    parameters.controlOrigin,
  );
}

startNetworkBrokerBootstrapV1();
