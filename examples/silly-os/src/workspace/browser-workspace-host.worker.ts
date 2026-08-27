// SPDX-License-Identifier: MIT

import { createBrowserWorkspaceHostOpfsBootstrapV1 } from "./browser-workspace-host-opfs.ts";
import {
  type BrowserWorkspaceHostMessagePortV1,
  createBrowserWorkspaceHostRuntimeV1,
} from "./browser-workspace-host-runtime.ts";

interface WorkspaceHostWorkerScopeV1 {
  postMessage(message: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown; ports: readonly MessagePort[] }>) => void,
  ): void;
}

const workerScope = self as unknown as WorkspaceHostWorkerScopeV1;
const runtime = createBrowserWorkspaceHostRuntimeV1({
  bootstrap: createBrowserWorkspaceHostOpfsBootstrapV1(),
  postControlMessage(message) {
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    workerScope.postMessage(message);
  },
});

workerScope.addEventListener("message", (event) => {
  void runtime.receiveControl(
    event.data,
    event.ports as readonly unknown[] as readonly BrowserWorkspaceHostMessagePortV1[],
  );
});
