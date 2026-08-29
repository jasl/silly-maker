// SPDX-License-Identifier: MIT
import "../agent/vite-worker-url.d.ts";

// Vite supplies the fixed product-bundled module Worker URL at build time.
// oxlint-disable import/default
// @ts-ignore -- Deno resolves the source module; Vite supplies this query-module default
import browserCredentialVaultWorkerUrlV1 from "./browser-credential-vault.worker.ts?worker&url";
// oxlint-enable import/default

import {
  createCredentialVaultClientV1,
  type CreateCredentialVaultClientOptionsV1,
  type CredentialVaultClientV1,
} from "./credential-vault-client.ts";

export type BrowserCredentialVaultPortFailureCodeV1 = "worker_unavailable";

export class BrowserCredentialVaultPortErrorV1 extends Error {
  constructor(readonly code: BrowserCredentialVaultPortFailureCodeV1) {
    super(`sillyos.credential_vault.port.${code}`);
    this.name = "BrowserCredentialVaultPortErrorV1";
  }
}

export interface BrowserCredentialVaultPortV1 {
  readonly client: CredentialVaultClientV1;
  close(): void;
}

/**
 * Opens only the product-bundled Vault module Worker. There is no host, PATH,
 * same-thread, or in-memory fallback.
 */
export function createBrowserCredentialVaultPortV1(
  clientOptions: CreateCredentialVaultClientOptionsV1 = {},
): BrowserCredentialVaultPortV1 {
  let worker: Worker;
  try {
    worker = new Worker(new URL(browserCredentialVaultWorkerUrlV1, import.meta.url), {
      type: "module",
      name: "sillyos-browser-credential-vault",
    });
  } catch {
    throw new BrowserCredentialVaultPortErrorV1("worker_unavailable");
  }
  let closed = false;
  let client: CredentialVaultClientV1;
  const closeV1 = (): void => {
    if (closed) return;
    closed = true;
    worker.removeEventListener("error", onWorkerErrorV1);
    client.close();
    worker.terminate();
  };
  const onWorkerErrorV1 = (): void => closeV1();
  try {
    client = createCredentialVaultClientV1(worker, clientOptions);
    worker.addEventListener("error", onWorkerErrorV1);
  } catch {
    worker.terminate();
    throw new BrowserCredentialVaultPortErrorV1("worker_unavailable");
  }
  return Object.freeze({ client, close: closeV1 });
}
