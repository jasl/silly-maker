// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { createIndexedDbProgramRepositoryV1 } from "./indexeddb-program-repository.ts";
import { createProgramRepositoryWorkerRuntimeV1 } from "./program-repository-worker-runtime.ts";

interface ProgramRepositoryDedicatedWorkerScopeV1 {
  readonly indexedDB: IDBFactory;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const scopeV1 = self as unknown as ProgramRepositoryDedicatedWorkerScopeV1;
const repositoryV1 = createIndexedDbProgramRepositoryV1({ indexedDB: scopeV1.indexedDB });
const runtimeV1 = createProgramRepositoryWorkerRuntimeV1({
  repository: repositoryV1,
  // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
  postMessage: (message) => scopeV1.postMessage(message),
});

scopeV1.addEventListener("message", (event) => runtimeV1.receive(event.data));
