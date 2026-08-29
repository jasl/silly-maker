// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />

import { createCredentialVaultWorkerRuntimeV1 } from "./credential-vault-runtime.ts";
import { createIndexedDbCredentialVaultV1 } from "./indexeddb-credential-vault.ts";

const workerScopeV1 = self as unknown as DedicatedWorkerGlobalScope;
const runtimeV1 = createCredentialVaultWorkerRuntimeV1({
  repository: createIndexedDbCredentialVaultV1({ indexedDB: workerScopeV1.indexedDB }),
  cryptoApi: workerScopeV1.crypto,
  postMessage(message): void {
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    workerScopeV1.postMessage(message);
  },
  onFatalError(): void {
    workerScopeV1.close();
  },
});

workerScopeV1.addEventListener("message", (event) => {
  runtimeV1.receive(event.data, event.ports);
});
workerScopeV1.addEventListener("messageerror", () => runtimeV1.dispose());
