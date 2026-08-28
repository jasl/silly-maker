// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceHostOpfsBootstrapV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import {
  type BrowserWorkspaceHostMessagePortV1,
  createBrowserWorkspaceHostRuntimeV1,
} from "../workspace/browser-workspace-host-runtime.ts";
import {
  admitBrowserWorkspaceSandboxWorkerBindV1,
  createBrowserWorkspaceSandboxWorkerBoundV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";

interface WorkspaceSandboxHostWorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown; ports: readonly MessagePort[] }>) => void,
  ): void;
}

const workerScope = self as unknown as WorkspaceSandboxHostWorkerScopeV1;
let bound = false;

workerScope.addEventListener("message", (event) => {
  if (bound) {
    for (const port of event.ports) port.close();
    return;
  }

  const bind = admitBrowserWorkspaceSandboxWorkerBindV1(event.data);
  const controlPort = event.ports.length === 1 ? event.ports[0] : undefined;
  if (bind === null || controlPort === undefined) {
    for (const port of event.ports) port.close();
    return;
  }

  bound = true;
  const runtime = createBrowserWorkspaceHostRuntimeV1({
    bootstrap: createBrowserWorkspaceHostOpfsBootstrapV1(),
    postControlMessage(message) {
      // MessagePort.postMessage has no targetOrigin parameter.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      controlPort.postMessage(message);
    },
  });

  controlPort.addEventListener("message", (controlEvent) => {
    void runtime.receiveControl(
      controlEvent.data,
      controlEvent.ports as readonly unknown[] as readonly BrowserWorkspaceHostMessagePortV1[],
    );
  });
  controlPort.start();
  const boundMessage = createBrowserWorkspaceSandboxWorkerBoundV1(
    bind.nonce,
    bind.buildIdentity,
  );
  // MessagePort.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  controlPort.postMessage(boundMessage);
});
