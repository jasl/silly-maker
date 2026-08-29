// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  credentialVaultBindingStorageKeyV2,
  type CredentialVaultBindingV2,
} from "../credential/credential-vault-contracts.ts";
import {
  createCredentialVaultCryptoV2,
  credentialVaultAesGcmIvBytesV2,
} from "../credential/credential-vault-crypto.ts";
import {
  createIndexedDbCredentialVaultV2,
  credentialVaultCredentialObjectStoreNameV2,
  credentialVaultDatabaseVersionV2,
  credentialVaultHeaderObjectStoreNameV2,
  type CredentialVaultStoredCredentialV2,
  type CredentialVaultStoredDeviceHeaderV2,
} from "../credential/indexeddb-credential-vault.ts";

const repositoriesV2: { dispose(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(repositoriesV2.splice(0).map(async (repository) => await repository.dispose()));
});

const bindingV2: CredentialVaultBindingV2 = {
  bindingId: "builtin:anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

function bufferV2(length: number, fill: number): ArrayBuffer {
  const value = new Uint8Array(new ArrayBuffer(length));
  value.fill(fill);
  return value.buffer;
}

async function deviceHeaderV2(): Promise<CredentialVaultStoredDeviceHeaderV2> {
  const vaultCrypto = createCredentialVaultCryptoV2(crypto);
  const key = await vaultCrypto.generateDeviceKey();
  return {
    id: "vault",
    revision: 2,
    generationToken: vaultCrypto.randomGenerationToken(),
    protection: "device",
    cipher: "AES-256-GCM",
    key,
    verifier: await vaultCrypto.encryptVerifier(key),
  };
}

function credentialV2(
  binding: CredentialVaultBindingV2 = bindingV2,
  fill = 11,
): CredentialVaultStoredCredentialV2 {
  return {
    storageKey: credentialVaultBindingStorageKeyV2(binding),
    revision: 2,
    ...binding,
    cipher: "AES-256-GCM",
    payload: {
      iv: bufferV2(credentialVaultAesGcmIvBytesV2, fill),
      ciphertext: bufferV2(48, fill + 1),
    },
  };
}

function requestResultV2<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

describe("IndexedDB Credential Vault V2", () => {
  it("creates the dedicated exact schema and stores a non-extractable device key", async () => {
    const indexedDB = new IDBFactory();
    const repository = createIndexedDbCredentialVaultV2({
      indexedDB,
      databaseName: "credential-v2.schema",
    });
    repositoriesV2.push(repository);
    await expect(repository.initialize()).resolves.toBe("created");
    const header = await deviceHeaderV2();
    await repository.createHeader(header);
    const loaded = await repository.loadHeader();
    expect(loaded).toMatchObject({ revision: 2, protection: "device" });
    expect(loaded?.protection === "device" && loaded.key.extractable).toBe(false);
    await expect(
      loaded?.protection === "device" ? crypto.subtle.exportKey("raw", loaded.key) : null,
    )
      .rejects.toBeInstanceOf(DOMException);

    const open = indexedDB.open("credential-v2.schema");
    const database = await requestResultV2(open);
    expect(database.version).toBe(credentialVaultDatabaseVersionV2);
    expect([...database.objectStoreNames]).toEqual([
      credentialVaultCredentialObjectStoreNameV2,
      credentialVaultHeaderObjectStoreNameV2,
    ]);
    database.close();
  });

  it("uses the full endpoint pair as storage identity and replaces protection atomically", async () => {
    const repository = createIndexedDbCredentialVaultV2({
      indexedDB: new IDBFactory(),
      databaseName: "credential-v2.records",
    });
    repositoriesV2.push(repository);
    const initialHeader = await deviceHeaderV2();
    await repository.createHeader(initialHeader);
    const secondEndpoint = { ...bindingV2, baseUrl: "https://api.anthropic.com/v2" };
    await expect(
      repository.upsert(credentialV2(bindingV2, 11), initialHeader.generationToken),
    ).resolves.toBe("created");
    await expect(
      repository.upsert(credentialV2(secondEndpoint, 21), initialHeader.generationToken),
    ).resolves.toBe("created");
    await expect(repository.list()).resolves.toEqual([bindingV2, secondEndpoint]);

    const nextHeader = await deviceHeaderV2();
    await repository.replaceProtection(initialHeader.generationToken, nextHeader, [
      credentialV2(bindingV2, 31),
      credentialV2(secondEndpoint, 41),
    ]);
    await expect(
      repository.loadCredential(bindingV2, nextHeader.generationToken),
    ).resolves.toMatchObject({
      payload: { iv: bufferV2(12, 31) },
    });
    await expect(
      repository.loadCredential(secondEndpoint, nextHeader.generationToken),
    ).resolves.toMatchObject({
      payload: { iv: bufferV2(12, 41) },
    });
    await expect(repository.replaceProtection(
      initialHeader.generationToken,
      await deviceHeaderV2(),
      [credentialV2(bindingV2, 51), credentialV2(secondEndpoint, 61)],
    )).rejects.toMatchObject({ code: "stale_state", operation: "replace_protection" });
    await expect(
      repository.loadCredential(bindingV2, nextHeader.generationToken),
    ).resolves.toMatchObject({ payload: { iv: bufferV2(12, 31) } });
  });

  it("cleanly replaces the pre-stable V1 database without retaining its rows", async () => {
    const indexedDB = new IDBFactory();
    const legacyOpen = indexedDB.open("credential-v2.reset", 1);
    legacyOpen.addEventListener("upgradeneeded", () => {
      legacyOpen.result.createObjectStore("credentials", { keyPath: "bindingId" }).put({
        bindingId: "legacy",
        plaintext: "must-not-survive",
      });
      legacyOpen.result.createObjectStore("vault", { keyPath: "id" }).put({
        id: "vault",
        revision: 1,
      });
    });
    const legacyDatabase = await requestResultV2(legacyOpen);
    legacyDatabase.close();

    const repository = createIndexedDbCredentialVaultV2({
      indexedDB,
      databaseName: "credential-v2.reset",
    });
    repositoriesV2.push(repository);
    await expect(repository.initialize()).resolves.toBe("reset_from_v1");
    await expect(repository.loadHeader()).resolves.toBeNull();
    await expect(repository.list()).resolves.toEqual([]);
  });
});
