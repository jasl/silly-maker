// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceSandboxFrameBindV1,
  admitBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxFrameFailedV1,
  createBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxWorkerBindV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";
import { admitBrowserWorkspaceSandboxDownloadRequestV1 } from "../workspace/browser-workspace-sandbox-download-protocol.ts";
import { browserWorkspaceSandboxOriginForControlV1 } from "../workspace/browser-workspace-sandbox-origins.ts";

interface WorkspaceSandboxBootstrapParametersV1 {
  readonly controlOrigin: string;
  readonly nonce: string;
  readonly buildIdentity: string;
}

function readBootstrapParametersV1(): WorkspaceSandboxBootstrapParametersV1 | null {
  const locationUrl = new URL(window.location.href);
  if (
    locationUrl.pathname !== "/workspace-sandbox.html" || locationUrl.hash !== "" ||
    locationUrl.searchParams.size !== 3
  ) return null;

  const controlOriginValues = locationUrl.searchParams.getAll("control-origin");
  const nonceValues = locationUrl.searchParams.getAll("nonce");
  const buildIdentityValues = locationUrl.searchParams.getAll("expected-sandbox-identity");
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
    ["expected-sandbox-identity", buildIdentity],
  ]).toString();
  if (locationUrl.search !== `?${canonicalSearch}`) return null;
  if (
    browserWorkspaceSandboxOriginForControlV1(controlOrigin) !== window.location.origin ||
    buildIdentity !== browserWorkspaceSandboxArtifactBuildIdentityV1
  ) return null;

  const ready = createBrowserWorkspaceSandboxFrameReadyV1(nonce, buildIdentity);
  return admitBrowserWorkspaceSandboxFrameReadyV1(ready) === null
    ? null
    : { controlOrigin, nonce, buildIdentity };
}

function closePortsV1(ports: readonly MessagePort[]): void {
  for (const port of ports) port.close();
}

function startWorkspaceSandboxDownloadBridgeV1(port: MessagePort): void {
  port.addEventListener("message", (event) => {
    const request = admitBrowserWorkspaceSandboxDownloadRequestV1(event.data);
    if (request === null) {
      port.close();
      return;
    }
    let code: "invalid_request" | "download_unavailable" | null = null;
    try {
      const url = new URL(request.downloadUrl);
      if (url.protocol !== "blob:" || url.origin !== window.location.origin) {
        code = "invalid_request";
      } else {
        const anchor = document.createElement("a");
        anchor.href = request.downloadUrl;
        anchor.download = request.fileName;
        anchor.rel = "noopener";
        anchor.hidden = true;
        document.body.append(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
        }
      }
    } catch {
      code = "download_unavailable";
    }
    port.postMessage(
      code === null
        ? {
          revision: 1,
          kind: "workspace_sandbox_download_started",
          requestId: request.requestId,
          exportId: request.exportId,
        }
        : {
          revision: 1,
          kind: "workspace_sandbox_download_failed",
          requestId: request.requestId,
          exportId: request.exportId,
          code,
        },
    );
  });
  port.start();
}

function startWorkspaceSandboxBootstrapV1(): void {
  if (window.parent === window) return;
  const parameters = readBootstrapParametersV1();
  if (parameters === null) return;

  const controlOrigin = parameters.controlOrigin;
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

    const downloadChannel = new MessageChannel();
    startWorkspaceSandboxDownloadBridgeV1(downloadChannel.port1);
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
        [controlPort, downloadChannel.port2],
      );
    } catch {
      controlPort.close();
      downloadChannel.port1.close();
      downloadChannel.port2.close();
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
