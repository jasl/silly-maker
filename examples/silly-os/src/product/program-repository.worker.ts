// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { createIndexedDbProgramRepositoryV4 } from "./indexeddb-program-repository.ts";
import { createProgramRepositoryWorkerRuntimeV6 } from "./program-repository-worker-runtime.ts";

interface ProgramRepositoryDedicatedWorkerScopeV4 {
  readonly indexedDB: IDBFactory;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const scopeV4 = self as unknown as ProgramRepositoryDedicatedWorkerScopeV4;
const repositoryV4 = createIndexedDbProgramRepositoryV4({ indexedDB: scopeV4.indexedDB });
const runtimeV6 = createProgramRepositoryWorkerRuntimeV6({
  repository: repositoryV4,
  // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
  postMessage: (message) => scopeV4.postMessage(message),
});

scopeV4.addEventListener("message", (event) => runtimeV6.receive(event.data));
