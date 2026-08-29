// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  credentialVaultMaximumBindingsV1,
  credentialVaultKdfIterationsV1,
  type CredentialVaultBindingV1,
} from "../credential/credential-vault-contracts.ts";
import {
  credentialVaultAesGcmIvBytesV1,
  credentialVaultSaltBytesV1,
} from "../credential/credential-vault-crypto.ts";
import {
  createIndexedDbCredentialVaultV1,
  credentialVaultCredentialObjectStoreNameV1,
  credentialVaultDatabaseVersionV1,
  credentialVaultHeaderObjectStoreNameV1,
  CredentialVaultRepositoryErrorV1,
  type CredentialVaultStoredCredentialV1,
  type CredentialVaultStoredHeaderV1,
} from "../credential/indexeddb-credential-vault.ts";

const repositoriesV1: { dispose(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(repositoriesV1.splice(0).map(async (repository) => await repository.dispose()));
});

function bufferV1(length: number, fill: number): ArrayBuffer {
  const value = new Uint8Array(new ArrayBuffer(length));
  value.fill(fill);
  return value.buffer;
}

function headerV1(): CredentialVaultStoredHeaderV1 {
  return {
    id: "vault",
    revision: 1,
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: credentialVaultKdfIterationsV1,
    salt: bufferV1(credentialVaultSaltBytesV1, 7),
    cipher: "AES-256-GCM",
    verifier: {
      iv: bufferV1(credentialVaultAesGcmIvBytesV1, 8),
      ciphertext: bufferV1(48, 9),
    },
  };
}

const bindingV1: CredentialVaultBindingV1 = {
  bindingId: "builtin.anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

function credentialV1(
  binding: CredentialVaultBindingV1 = bindingV1,
  fill = 11,
): CredentialVaultStoredCredentialV1 {
  return {
    revision: 1,
    ...binding,
    cipher: "AES-256-GCM",
    payload: {
      iv: bufferV1(credentialVaultAesGcmIvBytesV1, fill),
      ciphertext: bufferV1(48, fill + 1),
    },
  };
}

function requestResultV1<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

describe("IndexedDB Credential Vault V1", () => {
  it("creates only the dedicated exact two-store schema and starts absent", async () => {
    const indexedDB = new IDBFactory();
    const repository = createIndexedDbCredentialVaultV1({
      indexedDB,
      databaseName: "credential-test.schema",
    });
    repositoriesV1.push(repository);
    await repository.initialize();
    await expect(repository.loadHeader()).resolves.toBeNull();
    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.upsert(credentialV1())).rejects.toMatchObject({
      code: "schema_invalid",
    });

    const open = indexedDB.open("credential-test.schema");
    const database = await requestResultV1(open);
    expect(database.version).toBe(credentialVaultDatabaseVersionV1);
    expect([...database.objectStoreNames]).toEqual([
      credentialVaultCredentialObjectStoreNameV1,
      credentialVaultHeaderObjectStoreNameV1,
    ]);
    database.close();
  });

  it("stores bounded encrypted rows, supports exact replacement, and forgets independently", async () => {
    const indexedDB = new IDBFactory();
    const repository = createIndexedDbCredentialVaultV1({
      indexedDB,
      databaseName: "credential-test.records",
    });
    repositoriesV1.push(repository);
    await repository.create(headerV1());
    await expect(repository.create(headerV1())).rejects.toMatchObject({
      code: "already_created",
    });
    await expect(repository.upsert(credentialV1())).resolves.toBe("created");
    await expect(repository.upsert(credentialV1(bindingV1, 21))).resolves.toBe("replaced");
    await expect(repository.list()).resolves.toEqual([bindingV1]);
    const loaded = await repository.loadCredential(bindingV1);
    expect([...new Uint8Array(loaded.payload.iv)]).toEqual(Array(12).fill(21));
    await expect(repository.forget(bindingV1)).resolves.toBe(true);
    await expect(repository.forget(bindingV1)).resolves.toBe(false);
    await expect(repository.loadCredential(bindingV1)).rejects.toMatchObject({
      code: "binding_missing",
    });
  });

  it("rejects endpoint rebinding under an existing binding identity", async () => {
    const repository = createIndexedDbCredentialVaultV1({
      indexedDB: new IDBFactory(),
      databaseName: "credential-test.rebind",
    });
    repositoriesV1.push(repository);
    await repository.create(headerV1());
    await repository.upsert(credentialV1());
    const rebound = { ...bindingV1, baseUrl: "https://api.anthropic.com/v2" };
    await expect(repository.upsert(credentialV1(rebound))).rejects.toBeInstanceOf(
      CredentialVaultRepositoryErrorV1,
    );
    await expect(repository.upsert(credentialV1(rebound))).rejects.toMatchObject({
      code: "binding_conflict",
    });
    await expect(repository.forget(rebound)).rejects.toMatchObject({
      code: "binding_conflict",
    });
    await expect(repository.loadCredential(bindingV1)).resolves.toMatchObject(bindingV1);
  });

  it("enforces the fixed multi-binding capacity at the storage boundary", async () => {
    const repository = createIndexedDbCredentialVaultV1({
      indexedDB: new IDBFactory(),
      databaseName: "credential-test.capacity",
    });
    repositoriesV1.push(repository);
    await repository.create(headerV1());
    for (let index = 0; index < credentialVaultMaximumBindingsV1; index += 1) {
      await repository.upsert(credentialV1({
        ...bindingV1,
        bindingId: `binding.${String(index).padStart(3, "0")}`,
      }, index));
    }
    await expect(repository.upsert(credentialV1({
      ...bindingV1,
      bindingId: "binding.overflow",
    }))).rejects.toMatchObject({ code: "capacity_exceeded" });
    await expect(repository.list()).resolves.toHaveLength(credentialVaultMaximumBindingsV1);
  });
});
