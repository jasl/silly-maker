// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { createIndexedDbProgramRepositoryV3 } from "./indexeddb-program-repository.ts";
import { createProgramRepositoryWorkerRuntimeV3 } from "./program-repository-worker-runtime.ts";

interface ProgramRepositoryDedicatedWorkerScopeV2 {
  readonly indexedDB: IDBFactory;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  postMessage(message: unknown): void;
}

const scopeV2 = self as unknown as ProgramRepositoryDedicatedWorkerScopeV2;
const repositoryV3 = createIndexedDbProgramRepositoryV3({ indexedDB: scopeV2.indexedDB });
const runtimeV3 = createProgramRepositoryWorkerRuntimeV3({
  repository: repositoryV3,
  // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
  postMessage: (message) => scopeV2.postMessage(message),
});

scopeV2.addEventListener("message", (event) => runtimeV3.receive(event.data));
