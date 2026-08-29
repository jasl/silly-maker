// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />

import { createCredentialVaultWorkerRuntimeV2 } from "./credential-vault-runtime.ts";
import { createIndexedDbCredentialVaultV2 } from "./indexeddb-credential-vault.ts";

const workerScopeV2 = self as unknown as DedicatedWorkerGlobalScope;
const runtimeV2 = createCredentialVaultWorkerRuntimeV2({
  repository: createIndexedDbCredentialVaultV2({ indexedDB: workerScopeV2.indexedDB }),
  cryptoApi: workerScopeV2.crypto,
  postMessage(message): void {
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    workerScopeV2.postMessage(message);
  },
  onFatalError(): void {
    workerScopeV2.close();
  },
});

workerScopeV2.addEventListener("message", (event) => {
  runtimeV2.receive(event.data, event.ports);
});
workerScopeV2.addEventListener("messageerror", () => runtimeV2.dispose());
