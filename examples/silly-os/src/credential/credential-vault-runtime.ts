// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createCredentialVaultListV2,
  credentialVaultBindingStorageKeyV2,
  credentialVaultBindingsEqualV2,
  credentialVaultKdfIterationsV2,
  type CredentialVaultBindingV2,
  type CredentialVaultListV2,
  type CredentialVaultProtectionV2,
} from "./credential-vault-contracts.ts";
import {
  createCredentialVaultCryptoV2,
  type CredentialVaultCryptoV2,
  type CredentialVaultEncryptedPayloadV2,
} from "./credential-vault-crypto.ts";
import {
  CredentialVaultRepositoryErrorV2,
  type CredentialVaultRepositoryV2,
  type CredentialVaultStoredCredentialV2,
  type CredentialVaultStoredDeviceHeaderV2,
  type CredentialVaultStoredHeaderV2,
  type CredentialVaultStoredPasswordHeaderV2,
} from "./indexeddb-credential-vault.ts";
import {
  admitCredentialVaultHandoffReadyV2,
  admitCredentialVaultWorkerRequestEnvelopeV2,
  createCredentialVaultHandoffDeliveryV2,
  createCredentialVaultWorkerResponseEnvelopeV2,
  type CredentialVaultFailureCodeV2,
  type CredentialVaultWorkerMethodV2,
  type CredentialVaultWorkerRequestEnvelopeV2,
  type CredentialVaultWorkerResponseEnvelopeV2,
  type CredentialVaultWorkerSuccessRecordV2,
} from "./credential-vault-protocol.ts";

export const credentialVaultHandoffReadyDeadlineMillisecondsV2 = 5_000;
export const credentialVaultMaximumActiveHandoffsV2 = 8;
export const credentialVaultMaximumHandoffIdsPerWorkerV2 = 256;

export interface CredentialVaultWorkerRuntimeV2 {
  receive(message: unknown, ports?: readonly MessagePort[]): void;
  dispose(): void;
}

class CredentialVaultRuntimeFailureV2 extends Error {
  constructor(readonly code: CredentialVaultFailureCodeV2) {
    super(`sillyos.credential_vault.runtime.${code}`);
    this.name = "CredentialVaultRuntimeFailureV2";
  }
}

function mapRuntimeFailureV2(error: unknown): CredentialVaultFailureCodeV2 {
  if (error instanceof CredentialVaultRuntimeFailureV2) return error.code;
  if (error instanceof CredentialVaultRepositoryErrorV2) {
    if (error.code === "binding_conflict") return "binding_conflict";
    if (error.code === "binding_missing") return "binding_missing";
    if (error.code === "stale_state") return "invalid_state";
    if (error.code === "quota_exceeded") return "quota_exceeded";
    if (error.code === "schema_invalid" || error.code === "database_newer") return "schema_invalid";
    return "storage_unavailable";
  }
  return "crypto_failed";
}

function storedDeviceHeaderV2(
  generationToken: string,
  key: CryptoKey,
  verifier: CredentialVaultEncryptedPayloadV2,
): CredentialVaultStoredDeviceHeaderV2 {
  return {
    id: "vault",
    revision: 2,
    generationToken,
    protection: "device",
    cipher: "AES-256-GCM",
    key,
    verifier,
  };
}

function storedPasswordHeaderV2(
  generationToken: string,
  salt: ArrayBuffer,
  verifier: CredentialVaultEncryptedPayloadV2,
): CredentialVaultStoredPasswordHeaderV2 {
  return {
    id: "vault",
    revision: 2,
    generationToken,
    protection: "password",
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: credentialVaultKdfIterationsV2,
    salt,
    cipher: "AES-256-GCM",
    verifier,
  };
}

function storedCredentialV2(
  binding: CredentialVaultBindingV2,
  payload: CredentialVaultEncryptedPayloadV2,
): CredentialVaultStoredCredentialV2 {
  return {
    storageKey: credentialVaultBindingStorageKeyV2(binding),
    revision: 2,
    ...binding,
    cipher: "AES-256-GCM",
    payload,
  };
}

function waitForHandoffReadyV2(input: {
  readonly port: MessagePort;
  readonly signal: AbortSignal;
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV2;
  readonly deadlineMilliseconds: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settleV2 = (error?: CredentialVaultRuntimeFailureV2): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      input.signal.removeEventListener("abort", onAbortV2);
      input.port.removeEventListener("message", onMessageV2);
      input.port.removeEventListener("messageerror", onMessageErrorV2);
      if (error === undefined) resolve();
      else reject(error);
    };
    const onAbortV2 = (): void => settleV2(new CredentialVaultRuntimeFailureV2("locked"));
    const onMessageErrorV2 = (): void =>
      settleV2(new CredentialVaultRuntimeFailureV2("handoff_failed"));
    const onMessageV2 = (event: MessageEvent<unknown>): void => {
      if (event.ports.length !== 0) {
        for (const unexpectedPort of event.ports) unexpectedPort.close();
        settleV2(new CredentialVaultRuntimeFailureV2("handoff_failed"));
        return;
      }
      const ready = admitCredentialVaultHandoffReadyV2(event.data);
      if (
        ready === null || ready.handoffId !== input.handoffId ||
        !credentialVaultBindingsEqualV2(ready.binding, input.binding)
      ) {
        settleV2(new CredentialVaultRuntimeFailureV2("handoff_failed"));
        return;
      }
      settleV2();
    };
    const deadline = setTimeout(
      () => settleV2(new CredentialVaultRuntimeFailureV2("handoff_failed")),
      input.deadlineMilliseconds,
    );
    input.signal.addEventListener("abort", onAbortV2, { once: true });
    input.port.addEventListener("message", onMessageV2, { once: true });
    input.port.addEventListener("messageerror", onMessageErrorV2, { once: true });
    input.port.start();
    if (input.signal.aborted) onAbortV2();
  });
}

export function createCredentialVaultWorkerRuntimeV2(input: {
  readonly repository: CredentialVaultRepositoryV2;
  readonly crypto?: CredentialVaultCryptoV2;
  readonly cryptoApi?: Crypto;
  readonly postMessage: (message: CredentialVaultWorkerResponseEnvelopeV2) => void;
  readonly handoffReadyDeadlineMilliseconds?: number;
  readonly onFatalError?: (error: unknown) => void;
}): CredentialVaultWorkerRuntimeV2 {
  const cryptoV2 = input.crypto ?? createCredentialVaultCryptoV2(input.cryptoApi ?? crypto);
  const handoffReadyDeadlineMilliseconds = input.handoffReadyDeadlineMilliseconds ??
    credentialVaultHandoffReadyDeadlineMillisecondsV2;
  if (
    !Number.isSafeInteger(handoffReadyDeadlineMilliseconds) ||
    handoffReadyDeadlineMilliseconds <= 0 || handoffReadyDeadlineMilliseconds > 30_000
  ) throw new TypeError("sillyos.credential_vault.handoff_deadline_invalid");

  let disposedV2 = false;
  let tailV2 = Promise.resolve();
  let protectionV2: CredentialVaultProtectionV2 | null = null;
  let generationTokenV2: string | null = null;
  let unlockedKeyV2: CryptoKey | null = null;
  let stateEpochV2 = 0;
  const activeHandoffsV2 = new Map<string, AbortController>();
  const recentHandoffIdsV2 = new Set<string>();

  const rememberRecentHandoffIdV2 = (handoffId: string): void => {
    recentHandoffIdsV2.delete(handoffId);
    recentHandoffIdsV2.add(handoffId);
    while (recentHandoffIdsV2.size > credentialVaultMaximumHandoffIdsPerWorkerV2) {
      const oldest = recentHandoffIdsV2.values().next().value;
      if (oldest === undefined) break;
      recentHandoffIdsV2.delete(oldest);
    }
  };

  const invalidateUnlockedStateV2 = (nextKey: CryptoKey | null): void => {
    stateEpochV2 += 1;
    unlockedKeyV2 = nextKey;
    for (const controller of activeHandoffsV2.values()) controller.abort();
    activeHandoffsV2.clear();
  };

  const ensureInitializedV2 = async (): Promise<void> => {
    if (protectionV2 !== null) return;
    await input.repository.initialize();
    let header = await input.repository.loadHeader();
    if (header === null) {
      const generationToken = cryptoV2.randomGenerationToken();
      const key = await cryptoV2.generateDeviceKey();
      const verifier = await cryptoV2.encryptVerifier(key);
      try {
        await input.repository.createHeader(storedDeviceHeaderV2(generationToken, key, verifier));
        header = storedDeviceHeaderV2(generationToken, key, verifier);
      } catch (error) {
        if (
          !(error instanceof CredentialVaultRepositoryErrorV2) || error.code !== "already_created"
        ) {
          throw error;
        }
        header = await input.repository.loadHeader();
        if (header === null) throw new CredentialVaultRuntimeFailureV2("schema_invalid");
      }
    }
    protectionV2 = header.protection;
    generationTokenV2 = header.generationToken;
    if (header.protection === "device") {
      if (!await cryptoV2.verifyKey(header.key, header.verifier)) {
        protectionV2 = null;
        generationTokenV2 = null;
        throw new CredentialVaultRuntimeFailureV2("schema_invalid");
      }
      invalidateUnlockedStateV2(header.key);
    }
  };

  const postV2 = (
    requestId: string,
    record:
      | CredentialVaultWorkerSuccessRecordV2
      | {
        readonly kind: "failure";
        readonly method: CredentialVaultWorkerMethodV2;
        readonly code: CredentialVaultFailureCodeV2;
      },
  ): void => {
    if (disposedV2) return;
    // Worker postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- exact Worker callback
    input.postMessage(createCredentialVaultWorkerResponseEnvelopeV2(requestId, record));
  };

  const listV2 = async (): Promise<CredentialVaultListV2> => {
    await ensureInitializedV2();
    if (protectionV2 === null) throw new CredentialVaultRuntimeFailureV2("schema_invalid");
    if (protectionV2 === "device" && unlockedKeyV2 === null) {
      throw new CredentialVaultRuntimeFailureV2("schema_invalid");
    }
    return createCredentialVaultListV2(
      protectionV2,
      unlockedKeyV2 === null ? "locked" : "unlocked",
      await input.repository.list(),
    );
  };

  const rewrapCredentialsV2 = async (
    oldKey: CryptoKey,
    newKey: CryptoKey,
    expectedGenerationToken: string,
  ): Promise<readonly CredentialVaultStoredCredentialV2[]> => {
    const records: CredentialVaultStoredCredentialV2[] = [];
    for (const binding of await input.repository.list()) {
      const stored = await input.repository.loadCredential(binding, expectedGenerationToken);
      let credential = await cryptoV2.decryptCredential(oldKey, binding, stored.payload);
      try {
        records.push(storedCredentialV2(
          binding,
          await cryptoV2.encryptCredential(newKey, binding, credential),
        ));
      } finally {
        credential = "";
      }
    }
    return records;
  };

  const replaceProtectionV2 = async (
    nextHeader: CredentialVaultStoredHeaderV2,
    nextKey: CryptoKey,
  ): Promise<void> => {
    const oldKey = unlockedKeyV2;
    const expectedGenerationToken = generationTokenV2;
    if (oldKey === null) throw new CredentialVaultRuntimeFailureV2("locked");
    if (expectedGenerationToken === null) {
      throw new CredentialVaultRuntimeFailureV2("invalid_state");
    }
    invalidateUnlockedStateV2(oldKey);
    const records = await rewrapCredentialsV2(oldKey, nextKey, expectedGenerationToken);
    await input.repository.replaceProtection(expectedGenerationToken, nextHeader, records);
    protectionV2 = nextHeader.protection;
    generationTokenV2 = nextHeader.generationToken;
    invalidateUnlockedStateV2(nextKey);
  };

  const invalidateObservedStaleStateV2 = (error: unknown): void => {
    if (!(error instanceof CredentialVaultRepositoryErrorV2) || error.code !== "stale_state") {
      return;
    }
    protectionV2 = null;
    generationTokenV2 = null;
    invalidateUnlockedStateV2(null);
  };

  const handleSerialV2 = async (request: CredentialVaultWorkerRequestEnvelopeV2): Promise<void> => {
    const { requestId, record } = request;
    try {
      if (record.method === "initialize" || record.method === "list") {
        postV2(requestId, { kind: "success", method: record.method, value: await listV2() });
        return;
      }
      if (record.method === "set_password") {
        await ensureInitializedV2();
        if (unlockedKeyV2 === null) throw new CredentialVaultRuntimeFailureV2("locked");
        const salt = cryptoV2.randomSalt();
        const key = await cryptoV2.deriveKey(record.passphrase, salt);
        const verifier = await cryptoV2.encryptVerifier(key);
        await replaceProtectionV2(
          storedPasswordHeaderV2(cryptoV2.randomGenerationToken(), salt, verifier),
          key,
        );
        postV2(requestId, { kind: "success", method: "set_password", value: await listV2() });
        return;
      }
      if (record.method === "use_device") {
        await ensureInitializedV2();
        if (unlockedKeyV2 === null) throw new CredentialVaultRuntimeFailureV2("locked");
        const key = await cryptoV2.generateDeviceKey();
        const verifier = await cryptoV2.encryptVerifier(key);
        await replaceProtectionV2(
          storedDeviceHeaderV2(cryptoV2.randomGenerationToken(), key, verifier),
          key,
        );
        postV2(requestId, { kind: "success", method: "use_device", value: await listV2() });
        return;
      }
      if (record.method === "unlock") {
        await ensureInitializedV2();
        if (protectionV2 !== "password") throw new CredentialVaultRuntimeFailureV2("invalid_state");
        const header = await input.repository.loadHeader();
        if (header?.protection !== "password") {
          throw new CredentialVaultRuntimeFailureV2("schema_invalid");
        }
        const key = await cryptoV2.deriveKey(record.passphrase, header.salt);
        if (!await cryptoV2.verifyKey(key, header.verifier)) {
          throw new CredentialVaultRuntimeFailureV2("invalid_passphrase");
        }
        invalidateUnlockedStateV2(key);
        postV2(requestId, { kind: "success", method: "unlock", value: await listV2() });
        return;
      }
      if (record.method === "lock") {
        await ensureInitializedV2();
        const currentKey = unlockedKeyV2;
        invalidateUnlockedStateV2(null);
        if (protectionV2 === "device") {
          if (currentKey === null) throw new CredentialVaultRuntimeFailureV2("schema_invalid");
          invalidateUnlockedStateV2(currentKey);
        }
        postV2(requestId, { kind: "success", method: "lock", value: await listV2() });
        return;
      }
      if (record.method === "reset") {
        await ensureInitializedV2();
        const expectedGenerationToken = generationTokenV2;
        if (expectedGenerationToken === null) {
          throw new CredentialVaultRuntimeFailureV2("invalid_state");
        }
        // Reset is usable while Password protection is locked. Retain only the
        // current in-memory key, when one exists, while invalidating every
        // pending handoff before creating or committing the replacement Vault.
        invalidateUnlockedStateV2(unlockedKeyV2);
        const key = await cryptoV2.generateDeviceKey();
        const verifier = await cryptoV2.encryptVerifier(key);
        const header = storedDeviceHeaderV2(
          cryptoV2.randomGenerationToken(),
          key,
          verifier,
        );
        await input.repository.reset(expectedGenerationToken, header);
        protectionV2 = "device";
        generationTokenV2 = header.generationToken;
        invalidateUnlockedStateV2(key);
        postV2(requestId, { kind: "success", method: "reset", value: await listV2() });
        return;
      }
      if (record.method === "upsert") {
        await ensureInitializedV2();
        if (unlockedKeyV2 === null) throw new CredentialVaultRuntimeFailureV2("locked");
        const generationToken = generationTokenV2;
        if (generationToken === null) throw new CredentialVaultRuntimeFailureV2("invalid_state");
        invalidateUnlockedStateV2(unlockedKeyV2);
        const payload = await cryptoV2.encryptCredential(
          unlockedKeyV2,
          record.binding,
          record.credential.value,
        );
        const disposition = await input.repository.upsert(
          storedCredentialV2(record.binding, payload),
          generationToken,
        );
        postV2(requestId, {
          kind: "success",
          method: "upsert",
          value: { disposition, binding: record.binding },
        });
        return;
      }
      if (record.method === "forget") {
        await ensureInitializedV2();
        invalidateUnlockedStateV2(unlockedKeyV2);
        const forgotten = await input.repository.forget(record.binding);
        postV2(requestId, { kind: "success", method: "forget", value: { forgotten } });
        return;
      }
      throw new CredentialVaultRuntimeFailureV2("wire_invalid");
    } catch (error) {
      invalidateObservedStaleStateV2(error);
      postV2(requestId, {
        kind: "failure",
        method: record.method,
        code: mapRuntimeFailureV2(error),
      });
    }
  };

  const handleHandoffV2 = async (
    request: CredentialVaultWorkerRequestEnvelopeV2 & {
      readonly record: Extract<CredentialVaultWorkerRequestEnvelopeV2["record"], {
        readonly method: "handoff";
      }>;
    },
    port: MessagePort,
  ): Promise<void> => {
    const { requestId, record } = request;
    if (disposedV2) {
      port.close();
      return;
    }
    if (
      recentHandoffIdsV2.has(record.handoffId) ||
      activeHandoffsV2.has(record.handoffId) ||
      activeHandoffsV2.size >= credentialVaultMaximumActiveHandoffsV2
    ) {
      port.close();
      postV2(requestId, { kind: "failure", method: "handoff", code: "handoff_failed" });
      return;
    }
    const controller = new AbortController();
    activeHandoffsV2.set(record.handoffId, controller);
    try {
      await ensureInitializedV2();
      const epoch = stateEpochV2;
      const key = unlockedKeyV2;
      const generationToken = generationTokenV2;
      if (key === null) throw new CredentialVaultRuntimeFailureV2("locked");
      if (generationToken === null) throw new CredentialVaultRuntimeFailureV2("invalid_state");
      await waitForHandoffReadyV2({
        port,
        signal: controller.signal,
        handoffId: record.handoffId,
        binding: record.binding,
        deadlineMilliseconds: handoffReadyDeadlineMilliseconds,
      });
      if (stateEpochV2 !== epoch || unlockedKeyV2 !== key || controller.signal.aborted) {
        throw new CredentialVaultRuntimeFailureV2("locked");
      }
      const stored = await input.repository.loadCredential(record.binding, generationToken);
      if (stateEpochV2 !== epoch || unlockedKeyV2 !== key || controller.signal.aborted) {
        throw new CredentialVaultRuntimeFailureV2("locked");
      }
      let credential = await cryptoV2.decryptCredential(key, record.binding, stored.payload);
      try {
        if (stateEpochV2 !== epoch || unlockedKeyV2 !== key || controller.signal.aborted) {
          throw new CredentialVaultRuntimeFailureV2("locked");
        }
        port.postMessage(
          createCredentialVaultHandoffDeliveryV2(record.handoffId, record.binding, credential),
        );
      } finally {
        credential = "";
      }
      postV2(requestId, { kind: "success", method: "handoff", value: { binding: record.binding } });
    } catch (error) {
      invalidateObservedStaleStateV2(error);
      postV2(requestId, { kind: "failure", method: "handoff", code: mapRuntimeFailureV2(error) });
    } finally {
      if (activeHandoffsV2.get(record.handoffId) === controller) {
        activeHandoffsV2.delete(record.handoffId);
      }
      rememberRecentHandoffIdV2(record.handoffId);
      port.close();
    }
  };

  const fatalV2 = (error: unknown): void => {
    if (disposedV2) return;
    disposedV2 = true;
    invalidateUnlockedStateV2(null);
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
      if (disposedV2) {
        for (const port of ports) port.close();
        return;
      }
      const request = admitCredentialVaultWorkerRequestEnvelopeV2(message);
      if (request === null) {
        for (const port of ports) port.close();
        return;
      }
      if (request.record.method === "handoff") {
        if (ports.length !== 1 || ports[0] === undefined) {
          for (const port of ports) port.close();
          postV2(request.requestId, { kind: "failure", method: "handoff", code: "wire_invalid" });
          return;
        }
        const exactRequest = request as CredentialVaultWorkerRequestEnvelopeV2 & {
          readonly record: Extract<CredentialVaultWorkerRequestEnvelopeV2["record"], {
            readonly method: "handoff";
          }>;
        };
        void tailV2.then(() => handleHandoffV2(exactRequest, ports[0] as MessagePort)).catch(
          fatalV2,
        );
        return;
      }
      if (ports.length !== 0) {
        for (const port of ports) port.close();
        postV2(request.requestId, {
          kind: "failure",
          method: request.record.method,
          code: "wire_invalid",
        });
        return;
      }
      tailV2 = tailV2.then(() => handleSerialV2(request)).catch(fatalV2);
    },
    dispose(): void {
      if (disposedV2) return;
      disposedV2 = true;
      invalidateUnlockedStateV2(null);
      void input.repository.dispose();
    },
  });
}
