// SPDX-License-Identifier: MIT
import { createCredentialVaultWorkerRuntimeV2 } from "./credential-vault-runtime.ts";
import { createIndexedDbCredentialVaultV2 } from "./indexeddb-credential-vault.ts";

interface CredentialVaultWorkerScopeV2 {
  readonly indexedDB: IDBFactory;
  readonly crypto: Crypto;
  postMessage(message: unknown): void;
  close(): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(type: "messageerror", listener: () => void): void;
}

const workerScopeV2 = globalThis as unknown as CredentialVaultWorkerScopeV2;
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
