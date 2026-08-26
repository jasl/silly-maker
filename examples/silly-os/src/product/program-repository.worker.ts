// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { createIndexedDbProgramRepositoryV2 } from "./indexeddb-program-repository.ts";
import { createProgramRepositoryWorkerRuntimeV2 } from "./program-repository-worker-runtime.ts";

interface ProgramRepositoryDedicatedWorkerScopeV2 {
  readonly indexedDB: IDBFactory;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const scopeV2 = self as unknown as ProgramRepositoryDedicatedWorkerScopeV2;
const repositoryV2 = createIndexedDbProgramRepositoryV2({ indexedDB: scopeV2.indexedDB });
const runtimeV2 = createProgramRepositoryWorkerRuntimeV2({
  repository: repositoryV2,
  // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
  postMessage: (message) => scopeV2.postMessage(message),
});

scopeV2.addEventListener("message", (event) => runtimeV2.receive(event.data));
