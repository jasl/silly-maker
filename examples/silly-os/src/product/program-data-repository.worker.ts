// SPDX-License-Identifier: MIT
import { createIndexedDbProgramDataRepositoryV1 } from "./indexeddb-program-data-repository.ts";
import { createProgramDataRepositoryWorkerRuntimeV1 } from "./program-data-repository-worker-runtime.ts";

interface ProgramDataRepositoryWorkerScopeV1 {
  readonly indexedDB: IDBFactory;
  postMessage(message: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
}

const workerScopeV1 = self as unknown as ProgramDataRepositoryWorkerScopeV1;
const runtimeV1 = createProgramDataRepositoryWorkerRuntimeV1({
  repository: createIndexedDbProgramDataRepositoryV1({ indexedDB: workerScopeV1.indexedDB }),
  postMessage(message): void {
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    workerScopeV1.postMessage(message);
  },
});

workerScopeV1.addEventListener("message", (event) => {
  runtimeV1.receive(event.data);
});
