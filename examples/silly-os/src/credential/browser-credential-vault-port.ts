// SPDX-License-Identifier: MIT
import "../agent/vite-worker-url.d.ts";

// Vite supplies the fixed product-bundled module Worker URL at build time.
// oxlint-disable import/default
// @ts-ignore -- Deno resolves the source module; Vite supplies this query-module default
import browserCredentialVaultWorkerUrlV2 from "./browser-credential-vault.worker.ts?worker&url";
// oxlint-enable import/default

import {
  createCredentialVaultClientV2,
  type CreateCredentialVaultClientOptionsV2,
  type CredentialVaultClientV2,
} from "./credential-vault-client.ts";

export type BrowserCredentialVaultPortFailureCodeV2 = "worker_unavailable";

export class BrowserCredentialVaultPortErrorV2 extends Error {
  constructor(readonly code: BrowserCredentialVaultPortFailureCodeV2) {
    super(`sillyos.credential_vault.port.${code}`);
    this.name = "BrowserCredentialVaultPortErrorV2";
  }
}

export interface BrowserCredentialVaultPortV2 {
  readonly client: CredentialVaultClientV2;
  close(): void;
}

/**
 * Opens only the product-bundled Vault module Worker. There is no host, PATH,
 * same-thread, or in-memory fallback.
 */
export function createBrowserCredentialVaultPortV2(
  clientOptions: CreateCredentialVaultClientOptionsV2 = {},
): BrowserCredentialVaultPortV2 {
  let worker: Worker;
  try {
    worker = new Worker(new URL(browserCredentialVaultWorkerUrlV2, import.meta.url), {
      type: "module",
      name: "sillyos-browser-credential-vault",
    });
  } catch {
    throw new BrowserCredentialVaultPortErrorV2("worker_unavailable");
  }
  let closed = false;
  let client: CredentialVaultClientV2;
  const closeV1 = (): void => {
    if (closed) return;
    closed = true;
    worker.removeEventListener("error", onWorkerErrorV1);
    client.close();
    worker.terminate();
  };
  const onWorkerErrorV1 = (): void => closeV1();
  try {
    client = createCredentialVaultClientV2(worker, clientOptions);
    worker.addEventListener("error", onWorkerErrorV1);
  } catch {
    worker.terminate();
    throw new BrowserCredentialVaultPortErrorV2("worker_unavailable");
  }
  return Object.freeze({ client, close: closeV1 });
}
