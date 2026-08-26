// SPDX-License-Identifier: MIT

import { createBrowserPiWorkerRuntimeV1 } from "./browser-pi-worker-runtime.ts";

interface BrowserPiWorkerScopeV1 {
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const scopeV1 = self as unknown as BrowserPiWorkerScopeV1;
const runtimeV1 = createBrowserPiWorkerRuntimeV1({
  // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
  postMessage: (message) => scopeV1.postMessage(message),
});

scopeV1.addEventListener("message", (event) => runtimeV1.receive(event.data));
