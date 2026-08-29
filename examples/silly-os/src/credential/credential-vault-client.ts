// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  normalizeCredentialVaultBindingV1,
  type CredentialVaultBindingV1,
  type CredentialVaultListV1,
} from "./credential-vault-contracts.ts";
import {
  admitCredentialVaultWorkerResponseEnvelopeV1,
  createCredentialVaultWorkerRequestEnvelopeV1,
  type CredentialVaultFailureCodeV1,
  type CredentialVaultWorkerMethodV1,
  type CredentialVaultWorkerRequestRecordV1,
  type CredentialVaultWorkerSuccessRecordV1,
} from "./credential-vault-protocol.ts";

export const credentialVaultClientDeadlineMillisecondsV1 = 30_000;

export interface CredentialVaultWorkerPortV1 extends EventTarget {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export class CredentialVaultClientErrorV1 extends Error {
  constructor(
    readonly code: CredentialVaultFailureCodeV1,
    readonly method: CredentialVaultWorkerMethodV1,
  ) {
    super(`sillyos.credential_vault.client.${method}.${code}`);
    this.name = "CredentialVaultClientErrorV1";
  }
}

export interface CredentialVaultClientV1 {
  create(passphrase: string): Promise<CredentialVaultListV1>;
  unlock(passphrase: string): Promise<CredentialVaultListV1>;
  lock(): Promise<void>;
  list(): Promise<CredentialVaultListV1>;
  upsert(
    binding: CredentialVaultBindingV1,
    apiKey: string,
  ): Promise<
    { readonly disposition: "created" | "replaced"; readonly binding: CredentialVaultBindingV1 }
  >;
  forget(binding: CredentialVaultBindingV1): Promise<boolean>;
  handoff(
    binding: CredentialVaultBindingV1,
    handoffId: string,
    deliveryPort: MessagePort,
  ): Promise<void>;
  close(): void;
}

export interface CreateCredentialVaultClientOptionsV1 {
  readonly createRequestId?: () => string;
  readonly deadlineMilliseconds?: number;
}

interface PendingV1 {
  readonly method: CredentialVaultWorkerMethodV1;
  readonly resolve: (record: CredentialVaultWorkerSuccessRecordV1) => void;
  readonly reject: (error: CredentialVaultClientErrorV1) => void;
  readonly deadline: ReturnType<typeof setTimeout>;
}

export function createCredentialVaultClientV1(
  port: CredentialVaultWorkerPortV1,
  options: CreateCredentialVaultClientOptionsV1 = {},
): CredentialVaultClientV1 {
  const deadlineMilliseconds = options.deadlineMilliseconds ??
    credentialVaultClientDeadlineMillisecondsV1;
  if (
    !Number.isSafeInteger(deadlineMilliseconds) || deadlineMilliseconds <= 0 ||
    deadlineMilliseconds > 60_000
  ) throw new TypeError("sillyos.credential_vault.client_deadline_invalid");

  const pendingV1 = new Map<string, PendingV1>();
  let closedV1 = false;

  const closeV1 = (): void => {
    if (closedV1) return;
    closedV1 = true;
    port.removeEventListener("message", onMessageV1 as EventListener);
    port.removeEventListener("messageerror", onMessageErrorV1 as EventListener);
    if ("close" in port && typeof port.close === "function") port.close();
    for (const pending of pendingV1.values()) {
      clearTimeout(pending.deadline);
      pending.reject(new CredentialVaultClientErrorV1("storage_unavailable", pending.method));
    }
    pendingV1.clear();
  };

  function onMessageErrorV1(): void {
    closeV1();
  }

  function onMessageV1(event: MessageEvent<unknown>): void {
    if (event.ports.length !== 0) {
      for (const transferred of event.ports) transferred.close();
      closeV1();
      return;
    }
    if (
      event.data === null || typeof event.data !== "object" ||
      !("requestId" in event.data) || typeof event.data.requestId !== "string"
    ) {
      closeV1();
      return;
    }
    const pending = pendingV1.get(event.data.requestId);
    if (pending === undefined) return;
    const response = admitCredentialVaultWorkerResponseEnvelopeV1(event.data, pending.method);
    if (response === null) {
      closeV1();
      return;
    }
    pendingV1.delete(response.requestId);
    clearTimeout(pending.deadline);
    if (response.record.kind === "failure") {
      pending.reject(new CredentialVaultClientErrorV1(response.record.code, pending.method));
      return;
    }
    pending.resolve(response.record);
  }

  port.addEventListener("message", onMessageV1 as EventListener);
  port.addEventListener("messageerror", onMessageErrorV1 as EventListener);
  if ("start" in port && typeof port.start === "function") port.start();

  const callV1 = async (
    record: CredentialVaultWorkerRequestRecordV1,
    transfer: readonly Transferable[] = [],
  ): Promise<CredentialVaultWorkerSuccessRecordV1> => {
    if (closedV1) throw new CredentialVaultClientErrorV1("storage_unavailable", record.method);
    const requestId = options.createRequestId?.() ?? `credential.request.${crypto.randomUUID()}`;
    let message;
    try {
      message = createCredentialVaultWorkerRequestEnvelopeV1(requestId, record);
    } catch {
      for (const transferable of transfer) {
        if (transferable instanceof MessagePort) transferable.close();
      }
      throw new CredentialVaultClientErrorV1("wire_invalid", record.method);
    }
    if (pendingV1.has(requestId)) {
      closeV1();
      throw new CredentialVaultClientErrorV1("wire_invalid", record.method);
    }
    return await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        const pending = pendingV1.get(requestId);
        if (pending === undefined) return;
        pendingV1.delete(requestId);
        pending.reject(new CredentialVaultClientErrorV1("storage_unavailable", record.method));
      }, deadlineMilliseconds);
      pendingV1.set(requestId, { method: record.method, resolve, reject, deadline });
      try {
        port.postMessage(message, [...transfer]);
      } catch {
        pendingV1.delete(requestId);
        clearTimeout(deadline);
        for (const transferable of transfer) {
          if (transferable instanceof MessagePort) transferable.close();
        }
        reject(new CredentialVaultClientErrorV1("storage_unavailable", record.method));
      }
    });
  };

  return Object.freeze({
    async create(passphrase: string): Promise<CredentialVaultListV1> {
      const result = await callV1({ method: "create", passphrase });
      if (result.method !== "create") {
        throw new CredentialVaultClientErrorV1("wire_invalid", "create");
      }
      return result.value;
    },
    async unlock(passphrase: string): Promise<CredentialVaultListV1> {
      const result = await callV1({ method: "unlock", passphrase });
      if (result.method !== "unlock") {
        throw new CredentialVaultClientErrorV1("wire_invalid", "unlock");
      }
      return result.value;
    },
    async lock(): Promise<void> {
      const result = await callV1({ method: "lock" });
      if (result.method !== "lock") throw new CredentialVaultClientErrorV1("wire_invalid", "lock");
    },
    async list(): Promise<CredentialVaultListV1> {
      const result = await callV1({ method: "list" });
      if (result.method !== "list") throw new CredentialVaultClientErrorV1("wire_invalid", "list");
      return result.value;
    },
    async upsert(binding: CredentialVaultBindingV1, apiKey: string) {
      let credential = apiKey;
      try {
        const pending = callV1({
          method: "upsert",
          binding: normalizeCredentialVaultBindingV1(binding),
          credential: { kind: "api_key", value: credential },
        });
        credential = "";
        const result = await pending;
        if (result.method !== "upsert") {
          throw new CredentialVaultClientErrorV1("wire_invalid", "upsert");
        }
        return result.value;
      } finally {
        credential = "";
      }
    },
    async forget(binding: CredentialVaultBindingV1): Promise<boolean> {
      const result = await callV1({
        method: "forget",
        binding: normalizeCredentialVaultBindingV1(binding),
      });
      if (result.method !== "forget") {
        throw new CredentialVaultClientErrorV1("wire_invalid", "forget");
      }
      return result.value.forgotten;
    },
    async handoff(
      binding: CredentialVaultBindingV1,
      handoffId: string,
      deliveryPort: MessagePort,
    ): Promise<void> {
      const result = await callV1({
        method: "handoff",
        handoffId,
        binding: normalizeCredentialVaultBindingV1(binding),
      }, [deliveryPort]);
      if (result.method !== "handoff") {
        throw new CredentialVaultClientErrorV1("wire_invalid", "handoff");
      }
    },
    close: closeV1,
  });
}
