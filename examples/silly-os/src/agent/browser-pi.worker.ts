// SPDX-License-Identifier: MIT

import {
  installBrowserPiProviderFetchGuardV1,
  readBrowserPiWorkerEndpointOriginV1,
} from "./browser-pi-provider-fetch-guard.ts";

interface BrowserPiWorkerScopeV1 {
  fetch: typeof globalThis.fetch;
  readonly location: { readonly href: string };
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown; readonly ports: readonly MessagePort[] }) => void,
  ): void;
  postMessage(message: unknown): void;
}

const scopeV1 = self as unknown as BrowserPiWorkerScopeV1;
const expectedEndpointOriginV1 = readBrowserPiWorkerEndpointOriginV1(scopeV1.location.href);
const providerFetchV1 = installBrowserPiProviderFetchGuardV1({
  scope: scopeV1,
  endpointOrigin: expectedEndpointOriginV1,
});
// Install the guard before importing Pi or any Provider adapter so even a
// pinned module that captures global fetch at evaluation time sees the guard.
const runtimeV1 = Promise.all([
  import("./browser-pi-worker-runtime.ts"),
  import("../application/program-agent-runtime-composition.ts"),
]).then(([module, composition]) =>
  module.createBrowserPiWorkerRuntimeV1({
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    postMessage: (message) => scopeV1.postMessage(message),
    expectedEndpointOrigin: expectedEndpointOriginV1,
    providerFetch: providerFetchV1,
    programExecutionLoader: composition.createSillyOsProgramExecutionLoaderV1(),
  })
);

scopeV1.addEventListener("message", (event) => {
  void runtimeV1.then(
    (runtime) => runtime.receive(event.data, event.ports),
    () => {
      for (const port of event.ports) port.close();
    },
  );
});
