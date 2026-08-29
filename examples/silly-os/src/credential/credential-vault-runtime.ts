// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createCredentialVaultListV1,
  credentialVaultBindingsEqualV1,
  credentialVaultKdfIterationsV1,
  type CredentialVaultBindingV1,
  type CredentialVaultListV1,
} from "./credential-vault-contracts.ts";
import {
  createCredentialVaultCryptoV1,
  type CredentialVaultCryptoV1,
} from "./credential-vault-crypto.ts";
import {
  CredentialVaultRepositoryErrorV1,
  type CredentialVaultRepositoryV1,
  type CredentialVaultStoredHeaderV1,
  type CredentialVaultStoredCredentialV1,
} from "./indexeddb-credential-vault.ts";
import {
  admitCredentialVaultHandoffReadyV1,
  admitCredentialVaultWorkerRequestEnvelopeV1,
  createCredentialVaultHandoffDeliveryV1,
  createCredentialVaultWorkerResponseEnvelopeV1,
  type CredentialVaultFailureCodeV1,
  type CredentialVaultWorkerMethodV1,
  type CredentialVaultWorkerRequestEnvelopeV1,
  type CredentialVaultWorkerResponseEnvelopeV1,
  type CredentialVaultWorkerSuccessRecordV1,
} from "./credential-vault-protocol.ts";

export const credentialVaultHandoffReadyDeadlineMillisecondsV1 = 5_000;
export const credentialVaultMaximumActiveHandoffsV1 = 8;
export const credentialVaultMaximumHandoffIdsPerWorkerV1 = 256;

export interface CredentialVaultWorkerRuntimeV1 {
  receive(message: unknown, ports?: readonly MessagePort[]): void;
  dispose(): void;
}

class CredentialVaultRuntimeFailureV1 extends Error {
  constructor(readonly code: CredentialVaultFailureCodeV1) {
    super(`sillyos.credential_vault.runtime.${code}`);
    this.name = "CredentialVaultRuntimeFailureV1";
  }
}

function mapRuntimeFailureV1(error: unknown): CredentialVaultFailureCodeV1 {
  if (error instanceof CredentialVaultRuntimeFailureV1) return error.code;
  if (error instanceof CredentialVaultRepositoryErrorV1) {
    if (error.code === "already_created") return "already_created";
    if (error.code === "binding_conflict") return "binding_conflict";
    if (error.code === "binding_missing") return "binding_missing";
    if (error.code === "capacity_exceeded") return "capacity_exceeded";
    if (error.code === "quota_exceeded") return "quota_exceeded";
    if (error.code === "schema_invalid" || error.code === "database_newer") {
      return "schema_invalid";
    }
    return "storage_unavailable";
  }
  return "crypto_failed";
}

function exactStoredHeaderV1(
  salt: ArrayBuffer,
  verifier: { readonly iv: ArrayBuffer; readonly ciphertext: ArrayBuffer },
): CredentialVaultStoredHeaderV1 {
  return {
    id: "vault",
    revision: 1,
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: credentialVaultKdfIterationsV1,
    salt,
    cipher: "AES-256-GCM",
    verifier,
  };
}

function exactStoredCredentialV1(
  binding: CredentialVaultBindingV1,
  payload: { readonly iv: ArrayBuffer; readonly ciphertext: ArrayBuffer },
): CredentialVaultStoredCredentialV1 {
  return {
    revision: 1,
    ...binding,
    cipher: "AES-256-GCM",
    payload,
  };
}

function waitForHandoffReadyV1(input: {
  readonly port: MessagePort;
  readonly signal: AbortSignal;
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV1;
  readonly deadlineMilliseconds: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settleV1 = (error?: CredentialVaultRuntimeFailureV1): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      input.signal.removeEventListener("abort", onAbortV1);
      input.port.removeEventListener("message", onMessageV1);
      input.port.removeEventListener("messageerror", onMessageErrorV1);
      if (error === undefined) resolve();
      else reject(error);
    };
    const onAbortV1 = (): void => settleV1(new CredentialVaultRuntimeFailureV1("locked"));
    const onMessageErrorV1 = (): void => {
      settleV1(new CredentialVaultRuntimeFailureV1("handoff_failed"));
    };
    const onMessageV1 = (event: MessageEvent<unknown>): void => {
      if (event.ports.length !== 0) {
        for (const unexpectedPort of event.ports) unexpectedPort.close();
        settleV1(new CredentialVaultRuntimeFailureV1("handoff_failed"));
        return;
      }
      const ready = admitCredentialVaultHandoffReadyV1(event.data);
      if (
        ready === null || ready.handoffId !== input.handoffId ||
        !credentialVaultBindingsEqualV1(ready.binding, input.binding)
      ) {
        settleV1(new CredentialVaultRuntimeFailureV1("handoff_failed"));
        return;
      }
      settleV1();
    };
    const deadline = setTimeout(
      () => settleV1(new CredentialVaultRuntimeFailureV1("handoff_failed")),
      input.deadlineMilliseconds,
    );
    input.signal.addEventListener("abort", onAbortV1, { once: true });
    input.port.addEventListener("message", onMessageV1, { once: true });
    input.port.addEventListener("messageerror", onMessageErrorV1, { once: true });
    input.port.start();
    if (input.signal.aborted) onAbortV1();
  });
}

export function createCredentialVaultWorkerRuntimeV1(input: {
  readonly repository: CredentialVaultRepositoryV1;
  readonly crypto?: CredentialVaultCryptoV1;
  readonly cryptoApi?: Crypto;
  readonly postMessage: (message: CredentialVaultWorkerResponseEnvelopeV1) => void;
  readonly handoffReadyDeadlineMilliseconds?: number;
  readonly onFatalError?: (error: unknown) => void;
}): CredentialVaultWorkerRuntimeV1 {
  const cryptoV1 = input.crypto ?? createCredentialVaultCryptoV1(input.cryptoApi ?? crypto);
  const handoffReadyDeadlineMilliseconds = input.handoffReadyDeadlineMilliseconds ??
    credentialVaultHandoffReadyDeadlineMillisecondsV1;
  if (
    !Number.isSafeInteger(handoffReadyDeadlineMilliseconds) ||
    handoffReadyDeadlineMilliseconds <= 0 || handoffReadyDeadlineMilliseconds > 30_000
  ) throw new TypeError("sillyos.credential_vault.handoff_deadline_invalid");

  let disposedV1 = false;
  let tailV1 = Promise.resolve();
  let unlockedKeyV1: CryptoKey | null = null;
  let stateEpochV1 = 0;
  const activeHandoffsV1 = new Map<string, AbortController>();
  const usedHandoffIdsV1 = new Set<string>();

  const invalidateUnlockedStateV1 = (nextKey: CryptoKey | null): void => {
    stateEpochV1 += 1;
    unlockedKeyV1 = nextKey;
    for (const controller of activeHandoffsV1.values()) controller.abort();
    activeHandoffsV1.clear();
  };

  const postV1 = (
    requestId: string,
    record:
      | CredentialVaultWorkerSuccessRecordV1
      | {
        readonly kind: "failure";
        readonly method: CredentialVaultWorkerMethodV1;
        readonly code: CredentialVaultFailureCodeV1;
      },
  ): void => {
    if (disposedV1) return;
    // Worker postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- exact Worker callback
    input.postMessage(createCredentialVaultWorkerResponseEnvelopeV1(requestId, record));
  };

  const listV1 = async (): Promise<CredentialVaultListV1> => {
    await input.repository.initialize();
    const [header, bindings] = await Promise.all([
      input.repository.loadHeader(),
      input.repository.list(),
    ]);
    if (header === null) {
      if (bindings.length !== 0) {
        throw new CredentialVaultRuntimeFailureV1("schema_invalid");
      }
      return createCredentialVaultListV1("absent", []);
    }
    return createCredentialVaultListV1(unlockedKeyV1 === null ? "locked" : "unlocked", bindings);
  };

  const handleSerialV1 = async (request: CredentialVaultWorkerRequestEnvelopeV1): Promise<void> => {
    const { requestId, record } = request;
    try {
      if (record.method === "create") {
        await input.repository.initialize();
        if (await input.repository.loadHeader() !== null) {
          throw new CredentialVaultRuntimeFailureV1("already_created");
        }
        const salt = cryptoV1.randomSalt();
        const key = await cryptoV1.deriveKey(record.passphrase, salt);
        const verifier = await cryptoV1.encryptVerifier(key);
        await input.repository.create(exactStoredHeaderV1(salt, verifier));
        invalidateUnlockedStateV1(key);
        postV1(requestId, { kind: "success", method: "create", value: await listV1() });
        return;
      }
      if (record.method === "unlock") {
        await input.repository.initialize();
        const header = await input.repository.loadHeader();
        if (header === null) throw new CredentialVaultRuntimeFailureV1("not_created");
        const key = await cryptoV1.deriveKey(record.passphrase, header.salt);
        if (!await cryptoV1.verifyKey(key, header.verifier)) {
          throw new CredentialVaultRuntimeFailureV1("invalid_passphrase");
        }
        invalidateUnlockedStateV1(key);
        postV1(requestId, { kind: "success", method: "unlock", value: await listV1() });
        return;
      }
      if (record.method === "lock") {
        invalidateUnlockedStateV1(null);
        postV1(requestId, { kind: "success", method: "lock", value: null });
        return;
      }
      if (record.method === "list") {
        postV1(requestId, { kind: "success", method: "list", value: await listV1() });
        return;
      }
      if (record.method === "upsert") {
        if (unlockedKeyV1 === null) throw new CredentialVaultRuntimeFailureV1("locked");
        invalidateUnlockedStateV1(unlockedKeyV1);
        const payload = await cryptoV1.encryptCredential(
          unlockedKeyV1,
          record.binding,
          record.credential.value,
        );
        const disposition = await input.repository.upsert(
          exactStoredCredentialV1(record.binding, payload),
        );
        postV1(requestId, {
          kind: "success",
          method: "upsert",
          value: { disposition, binding: record.binding },
        });
        return;
      }
      if (record.method === "forget") {
        await input.repository.initialize();
        if (await input.repository.loadHeader() === null) {
          throw new CredentialVaultRuntimeFailureV1("not_created");
        }
        invalidateUnlockedStateV1(unlockedKeyV1);
        const forgotten = await input.repository.forget(record.binding);
        postV1(requestId, { kind: "success", method: "forget", value: { forgotten } });
        return;
      }
      throw new CredentialVaultRuntimeFailureV1("wire_invalid");
    } catch (error) {
      postV1(requestId, {
        kind: "failure",
        method: record.method,
        code: mapRuntimeFailureV1(error),
      });
    }
  };

  const handleHandoffV1 = async (
    request: CredentialVaultWorkerRequestEnvelopeV1 & {
      readonly record: Extract<CredentialVaultWorkerRequestEnvelopeV1["record"], {
        readonly method: "handoff";
      }>;
    },
    port: MessagePort,
  ): Promise<void> => {
    const { requestId, record } = request;
    if (disposedV1) {
      port.close();
      return;
    }
    if (
      usedHandoffIdsV1.has(record.handoffId) ||
      usedHandoffIdsV1.size >= credentialVaultMaximumHandoffIdsPerWorkerV1 ||
      activeHandoffsV1.size >= credentialVaultMaximumActiveHandoffsV1
    ) {
      port.close();
      postV1(requestId, { kind: "failure", method: "handoff", code: "handoff_failed" });
      return;
    }
    const controller = new AbortController();
    usedHandoffIdsV1.add(record.handoffId);
    activeHandoffsV1.set(record.handoffId, controller);
    const epoch = stateEpochV1;
    const key = unlockedKeyV1;
    try {
      if (key === null) throw new CredentialVaultRuntimeFailureV1("locked");
      const stored = await input.repository.loadCredential(record.binding);
      await waitForHandoffReadyV1({
        port,
        signal: controller.signal,
        handoffId: record.handoffId,
        binding: record.binding,
        deadlineMilliseconds: handoffReadyDeadlineMilliseconds,
      });
      if (stateEpochV1 !== epoch || unlockedKeyV1 !== key || controller.signal.aborted) {
        throw new CredentialVaultRuntimeFailureV1("locked");
      }
      let credential = await cryptoV1.decryptCredential(key, record.binding, stored.payload);
      try {
        if (stateEpochV1 !== epoch || unlockedKeyV1 !== key || controller.signal.aborted) {
          throw new CredentialVaultRuntimeFailureV1("locked");
        }
        const delivery = createCredentialVaultHandoffDeliveryV1(
          record.handoffId,
          record.binding,
          credential,
        );
        port.postMessage(delivery);
      } finally {
        credential = "";
      }
      postV1(requestId, {
        kind: "success",
        method: "handoff",
        value: { binding: record.binding },
      });
    } catch (error) {
      postV1(requestId, {
        kind: "failure",
        method: "handoff",
        code: mapRuntimeFailureV1(error),
      });
    } finally {
      if (activeHandoffsV1.get(record.handoffId) === controller) {
        activeHandoffsV1.delete(record.handoffId);
      }
      port.close();
    }
  };

  const fatalV1 = (error: unknown): void => {
    if (disposedV1) return;
    disposedV1 = true;
    invalidateUnlockedStateV1(null);
    void input.repository.dispose();
    if (input.onFatalError !== undefined) {
      input.onFatalError(error);
      return;
    }
    queueMicrotask(() => {
      throw error;
    });
  };

  return Object.freeze({
    receive(message: unknown, ports: readonly MessagePort[] = []): void {
      if (disposedV1) {
        for (const port of ports) port.close();
        return;
      }
      const request = admitCredentialVaultWorkerRequestEnvelopeV1(message);
      if (request === null) {
        for (const port of ports) port.close();
        return;
      }
      if (request.record.method === "handoff") {
        if (ports.length !== 1 || ports[0] === undefined) {
          for (const port of ports) port.close();
          postV1(request.requestId, {
            kind: "failure",
            method: "handoff",
            code: "wire_invalid",
          });
          return;
        }
        const port = ports[0];
        const exactRequest = request as CredentialVaultWorkerRequestEnvelopeV1 & {
          readonly record: Extract<CredentialVaultWorkerRequestEnvelopeV1["record"], {
            readonly method: "handoff";
          }>;
        };
        void tailV1.then(() => handleHandoffV1(exactRequest, port)).catch(fatalV1);
        return;
      }
      if (ports.length !== 0) {
        for (const port of ports) port.close();
        postV1(request.requestId, {
          kind: "failure",
          method: request.record.method,
          code: "wire_invalid",
        });
        return;
      }
      tailV1 = tailV1.then(() => handleSerialV1(request)).catch(fatalV1);
    },
    dispose(): void {
      if (disposedV1) return;
      disposedV1 = true;
      invalidateUnlockedStateV1(null);
      void input.repository.dispose();
    },
  });
}
