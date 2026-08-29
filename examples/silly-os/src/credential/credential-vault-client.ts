// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  normalizeCredentialVaultBindingV2,
  type CredentialVaultBindingV2,
  type CredentialVaultListV2,
} from "./credential-vault-contracts.ts";
import {
  admitCredentialVaultWorkerResponseEnvelopeV2,
  createCredentialVaultWorkerRequestEnvelopeV2,
  type CredentialVaultFailureCodeV2,
  type CredentialVaultWorkerMethodV2,
  type CredentialVaultWorkerRequestRecordV2,
  type CredentialVaultWorkerSuccessRecordV2,
} from "./credential-vault-protocol.ts";

export const credentialVaultClientDeadlineMillisecondsV2 = 30_000;

export interface CredentialVaultWorkerPortV2 extends EventTarget {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export class CredentialVaultClientErrorV2 extends Error {
  constructor(
    readonly code: CredentialVaultFailureCodeV2,
    readonly method: CredentialVaultWorkerMethodV2,
  ) {
    super(`sillyos.credential_vault.client.${method}.${code}`);
    this.name = "CredentialVaultClientErrorV2";
  }
}

export interface CredentialVaultClientV2 {
  initialize(): Promise<CredentialVaultListV2>;
  list(): Promise<CredentialVaultListV2>;
  setPassword(passphrase: string): Promise<CredentialVaultListV2>;
  useDevice(): Promise<CredentialVaultListV2>;
  unlock(passphrase: string): Promise<CredentialVaultListV2>;
  lock(): Promise<CredentialVaultListV2>;
  upsert(
    binding: CredentialVaultBindingV2,
    apiKey: string,
  ): Promise<{
    readonly disposition: "created" | "replaced";
    readonly binding: CredentialVaultBindingV2;
  }>;
  forget(binding: CredentialVaultBindingV2): Promise<boolean>;
  handoff(
    binding: CredentialVaultBindingV2,
    handoffId: string,
    deliveryPort: MessagePort,
  ): Promise<void>;
  close(): void;
}

export interface CreateCredentialVaultClientOptionsV2 {
  readonly createRequestId?: () => string;
  readonly deadlineMilliseconds?: number;
}

interface PendingV2 {
  readonly method: CredentialVaultWorkerMethodV2;
  readonly resolve: (record: CredentialVaultWorkerSuccessRecordV2) => void;
  readonly reject: (error: CredentialVaultClientErrorV2) => void;
  readonly deadline: ReturnType<typeof setTimeout>;
}

export function createCredentialVaultClientV2(
  port: CredentialVaultWorkerPortV2,
  options: CreateCredentialVaultClientOptionsV2 = {},
): CredentialVaultClientV2 {
  const deadlineMilliseconds = options.deadlineMilliseconds ??
    credentialVaultClientDeadlineMillisecondsV2;
  if (
    !Number.isSafeInteger(deadlineMilliseconds) || deadlineMilliseconds <= 0 ||
    deadlineMilliseconds > 60_000
  ) throw new TypeError("sillyos.credential_vault.client_deadline_invalid");

  const pendingV2 = new Map<string, PendingV2>();
  let closedV2 = false;

  const closeV2 = (): void => {
    if (closedV2) return;
    closedV2 = true;
    port.removeEventListener("message", onMessageV2 as EventListener);
    port.removeEventListener("messageerror", onMessageErrorV2 as EventListener);
    if ("close" in port && typeof port.close === "function") port.close();
    for (const pending of pendingV2.values()) {
      clearTimeout(pending.deadline);
      pending.reject(new CredentialVaultClientErrorV2("storage_unavailable", pending.method));
    }
    pendingV2.clear();
  };

  function onMessageErrorV2(): void {
    closeV2();
  }

  function onMessageV2(event: MessageEvent<unknown>): void {
    if (event.ports.length !== 0) {
      for (const transferred of event.ports) transferred.close();
      closeV2();
      return;
    }
    if (
      event.data === null || typeof event.data !== "object" ||
      !("requestId" in event.data) || typeof event.data.requestId !== "string"
    ) {
      closeV2();
      return;
    }
    const pending = pendingV2.get(event.data.requestId);
    if (pending === undefined) return;
    const response = admitCredentialVaultWorkerResponseEnvelopeV2(event.data, pending.method);
    if (response === null) {
      closeV2();
      return;
    }
    pendingV2.delete(response.requestId);
    clearTimeout(pending.deadline);
    if (response.record.kind === "failure") {
      pending.reject(new CredentialVaultClientErrorV2(response.record.code, pending.method));
      return;
    }
    pending.resolve(response.record);
  }

  port.addEventListener("message", onMessageV2 as EventListener);
  port.addEventListener("messageerror", onMessageErrorV2 as EventListener);
  if ("start" in port && typeof port.start === "function") port.start();

  const callV2 = async (
    record: CredentialVaultWorkerRequestRecordV2,
    transfer: readonly Transferable[] = [],
  ): Promise<CredentialVaultWorkerSuccessRecordV2> => {
    if (closedV2) throw new CredentialVaultClientErrorV2("storage_unavailable", record.method);
    const requestId = options.createRequestId?.() ?? `credential.request.${crypto.randomUUID()}`;
    let message;
    try {
      message = createCredentialVaultWorkerRequestEnvelopeV2(requestId, record);
    } catch {
      for (const transferable of transfer) {
        if (transferable instanceof MessagePort) transferable.close();
      }
      throw new CredentialVaultClientErrorV2("wire_invalid", record.method);
    }
    if (pendingV2.has(requestId)) {
      closeV2();
      throw new CredentialVaultClientErrorV2("wire_invalid", record.method);
    }
    return await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        const pending = pendingV2.get(requestId);
        if (pending === undefined) return;
        pendingV2.delete(requestId);
        pending.reject(new CredentialVaultClientErrorV2("storage_unavailable", record.method));
      }, deadlineMilliseconds);
      pendingV2.set(requestId, { method: record.method, resolve, reject, deadline });
      try {
        port.postMessage(message, [...transfer]);
      } catch {
        pendingV2.delete(requestId);
        clearTimeout(deadline);
        for (const transferable of transfer) {
          if (transferable instanceof MessagePort) transferable.close();
        }
        reject(new CredentialVaultClientErrorV2("storage_unavailable", record.method));
      }
    });
  };

  const listResultV2 = async (
    record: Extract<CredentialVaultWorkerRequestRecordV2, {
      readonly method: "initialize" | "list" | "set_password" | "use_device" | "unlock" | "lock";
    }>,
  ): Promise<CredentialVaultListV2> => {
    const result = await callV2(record);
    if (result.method !== record.method) {
      throw new CredentialVaultClientErrorV2("wire_invalid", record.method);
    }
    return result.value;
  };

  return Object.freeze({
    async initialize(): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "initialize" });
    },
    async list(): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "list" });
    },
    async setPassword(passphrase: string): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "set_password", passphrase });
    },
    async useDevice(): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "use_device" });
    },
    async unlock(passphrase: string): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "unlock", passphrase });
    },
    async lock(): Promise<CredentialVaultListV2> {
      return await listResultV2({ method: "lock" });
    },
    async upsert(binding: CredentialVaultBindingV2, apiKey: string) {
      let credential = apiKey;
      try {
        const pending = callV2({
          method: "upsert",
          binding: normalizeCredentialVaultBindingV2(binding),
          credential: { kind: "api_key", value: credential },
        });
        credential = "";
        const result = await pending;
        if (result.method !== "upsert") {
          throw new CredentialVaultClientErrorV2("wire_invalid", "upsert");
        }
        return result.value;
      } finally {
        credential = "";
      }
    },
    async forget(binding: CredentialVaultBindingV2): Promise<boolean> {
      const result = await callV2({
        method: "forget",
        binding: normalizeCredentialVaultBindingV2(binding),
      });
      if (result.method !== "forget") {
        throw new CredentialVaultClientErrorV2("wire_invalid", "forget");
      }
      return result.value.forgotten;
    },
    async handoff(
      binding: CredentialVaultBindingV2,
      handoffId: string,
      deliveryPort: MessagePort,
    ): Promise<void> {
      const result = await callV2({
        method: "handoff",
        handoffId,
        binding: normalizeCredentialVaultBindingV2(binding),
      }, [deliveryPort]);
      if (result.method !== "handoff") {
        throw new CredentialVaultClientErrorV2("wire_invalid", "handoff");
      }
    },
    close: closeV2,
  });
}
