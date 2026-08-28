// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceSandboxFrameBindV1,
  admitBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxFrameFailedV1,
  createBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxWorkerBindV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";

const productionControlOriginV1 = "https://silly-os.jasl9187.workers.dev";
const productionSandboxOriginV1 = "https://silly-os-sandbox.jasl9187.workers.dev";
const localControlOriginV1 = "http://127.0.0.1:41739";
const localSandboxOriginV1 = "http://127.0.0.1:41740";

interface WorkspaceSandboxBootstrapParametersV1 {
  readonly nonce: string;
  readonly buildIdentity: string;
}

function readBootstrapParametersV1(): WorkspaceSandboxBootstrapParametersV1 | null {
  const locationUrl = new URL(window.location.href);
  if (
    locationUrl.pathname !== "/workspace-sandbox.html" || locationUrl.hash !== "" ||
    locationUrl.searchParams.size !== 2
  ) return null;

  const nonceValues = locationUrl.searchParams.getAll("nonce");
  const buildIdentityValues = locationUrl.searchParams.getAll("build-identity");
  if (nonceValues.length !== 1 || buildIdentityValues.length !== 1) return null;
  const nonce = nonceValues[0];
  const buildIdentity = buildIdentityValues[0];
  if (nonce === undefined || buildIdentity === undefined) return null;

  const canonicalSearch = new URLSearchParams([
    ["nonce", nonce],
    ["build-identity", buildIdentity],
  ]).toString();
  if (locationUrl.search !== `?${canonicalSearch}`) return null;

  const ready = createBrowserWorkspaceSandboxFrameReadyV1(nonce, buildIdentity);
  return admitBrowserWorkspaceSandboxFrameReadyV1(ready) === null ? null : { nonce, buildIdentity };
}

function closePortsV1(ports: readonly MessagePort[]): void {
  for (const port of ports) port.close();
}

function startWorkspaceSandboxBootstrapV1(): void {
  if (window.parent === window) return;
  const parameters = readBootstrapParametersV1();
  if (parameters === null) return;

  const controlOrigin = window.location.origin === localSandboxOriginV1
    ? localControlOriginV1
    : window.location.origin === productionSandboxOriginV1
    ? productionControlOriginV1
    : null;
  if (controlOrigin === null) return;
  let settled = false;
  let worker: Worker | null = null;

  const reportFailure = (code: "bootstrap_rejected" | "worker_unavailable"): void => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", receiveFrameMessage);
    worker?.terminate();
    worker = null;
    window.parent.postMessage(
      createBrowserWorkspaceSandboxFrameFailedV1(
        parameters.nonce,
        parameters.buildIdentity,
        code,
      ),
      controlOrigin,
    );
  };

  const receiveFrameMessage = (event: MessageEvent<unknown>): void => {
    if (settled || event.source !== window.parent || event.origin !== controlOrigin) {
      closePortsV1(event.ports);
      return;
    }

    const bind = admitBrowserWorkspaceSandboxFrameBindV1(event.data);
    if (
      bind === null || bind.nonce !== parameters.nonce ||
      bind.buildIdentity !== parameters.buildIdentity || event.ports.length !== 1
    ) {
      closePortsV1(event.ports);
      reportFailure("bootstrap_rejected");
      return;
    }

    settled = true;
    window.removeEventListener("message", receiveFrameMessage);
    const controlPort = event.ports[0];
    if (controlPort === undefined) {
      reportFailure("bootstrap_rejected");
      return;
    }

    try {
      worker = new Worker(
        new URL("./browser-workspace-sandbox-host.worker.ts", import.meta.url),
        { name: "silly-os-workspace-sandbox-host-v1", type: "module" },
      );
      worker.addEventListener("error", () => {
        window.parent.postMessage(
          createBrowserWorkspaceSandboxFrameFailedV1(
            parameters.nonce,
            parameters.buildIdentity,
            "worker_unavailable",
          ),
          controlOrigin,
        );
      }, { once: true });
      worker.postMessage(
        createBrowserWorkspaceSandboxWorkerBindV1(
          parameters.nonce,
          parameters.buildIdentity,
        ),
        [controlPort],
      );
    } catch {
      controlPort.close();
      window.parent.postMessage(
        createBrowserWorkspaceSandboxFrameFailedV1(
          parameters.nonce,
          parameters.buildIdentity,
          "worker_unavailable",
        ),
        controlOrigin,
      );
    }
  };

  window.addEventListener("message", receiveFrameMessage);
  window.parent.postMessage(
    createBrowserWorkspaceSandboxFrameReadyV1(
      parameters.nonce,
      parameters.buildIdentity,
    ),
    controlOrigin,
  );
}

startWorkspaceSandboxBootstrapV1();
