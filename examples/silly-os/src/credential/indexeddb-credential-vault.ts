// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitCredentialVaultBindingV2,
  compareCredentialVaultBindingsV2,
  credentialVaultBindingStorageKeyV2,
  credentialVaultBindingsEqualV2,
  credentialVaultKdfIterationsV2,
  credentialVaultRevisionV2,
  normalizeCredentialVaultBindingV2,
  type CredentialVaultBindingV2,
} from "./credential-vault-contracts.ts";
import {
  credentialVaultAesGcmIvBytesV2,
  credentialVaultAesGcmTagBytesV2,
  credentialVaultGenerationTokenBytesV2,
  credentialVaultSaltBytesV2,
  isCredentialVaultDeviceKeyV2,
  type CredentialVaultEncryptedPayloadV2,
} from "./credential-vault-crypto.ts";

export const credentialVaultDatabaseNameV2 = "sillymaker.example-silly-os.credentials";
export const credentialVaultDatabaseVersionV2 = 3;
export const credentialVaultHeaderObjectStoreNameV2 = "vault";
export const credentialVaultCredentialObjectStoreNameV2 = "credentials";

const credentialVaultHeaderIdV2 = "vault";
const credentialVaultObjectStoreNamesV2 = [
  credentialVaultCredentialObjectStoreNameV2,
  credentialVaultHeaderObjectStoreNameV2,
] as const;

export type CredentialVaultRepositoryFailureCodeV2 =
  | "already_created"
  | "binding_conflict"
  | "binding_missing"
  | "database_newer"
  | "quota_exceeded"
  | "request_failed"
  | "schema_invalid"
  | "stale_state"
  | "storage_unavailable"
  | "transaction_aborted";

export type CredentialVaultRepositoryOperationV2 =
  | "initialize"
  | "load_header"
  | "create_header"
  | "replace_protection"
  | "reset"
  | "list"
  | "load_credential"
  | "upsert"
  | "forget"
  | "dispose";

export class CredentialVaultRepositoryErrorV2 extends Error {
  constructor(
    readonly code: CredentialVaultRepositoryFailureCodeV2,
    readonly operation: CredentialVaultRepositoryOperationV2,
  ) {
    super(`sillyos.credential_vault.repository.${operation}.${code}`);
    this.name = "CredentialVaultRepositoryErrorV2";
  }
}

interface CredentialVaultStoredHeaderBaseV2 {
  readonly id: "vault";
  readonly revision: 2;
  readonly generationToken: string;
  readonly cipher: "AES-256-GCM";
  readonly verifier: CredentialVaultEncryptedPayloadV2;
}

export interface CredentialVaultStoredDeviceHeaderV2 extends CredentialVaultStoredHeaderBaseV2 {
  readonly protection: "device";
  readonly key: CryptoKey;
}

export interface CredentialVaultStoredPasswordHeaderV2 extends CredentialVaultStoredHeaderBaseV2 {
  readonly protection: "password";
  readonly kdf: "PBKDF2-HMAC-SHA256";
  readonly iterations: number;
  readonly salt: ArrayBuffer;
}

export type CredentialVaultStoredHeaderV2 =
  | CredentialVaultStoredDeviceHeaderV2
  | CredentialVaultStoredPasswordHeaderV2;

export interface CredentialVaultStoredCredentialV2 extends CredentialVaultBindingV2 {
  readonly storageKey: string;
  readonly revision: 2;
  readonly cipher: "AES-256-GCM";
  readonly payload: CredentialVaultEncryptedPayloadV2;
}

export type CredentialVaultInitializationDispositionV2 =
  | "created"
  | "opened"
  | "reset_from_v1";

export interface CredentialVaultRepositoryV2 {
  initialize(): Promise<CredentialVaultInitializationDispositionV2>;
  loadHeader(): Promise<CredentialVaultStoredHeaderV2 | null>;
  createHeader(header: CredentialVaultStoredHeaderV2): Promise<void>;
  replaceProtection(
    expectedGenerationToken: string,
    header: CredentialVaultStoredHeaderV2,
    records: readonly CredentialVaultStoredCredentialV2[],
  ): Promise<void>;
  reset(
    expectedGenerationToken: string,
    header: CredentialVaultStoredDeviceHeaderV2,
  ): Promise<void>;
  list(): Promise<readonly CredentialVaultBindingV2[]>;
  loadCredential(
    binding: CredentialVaultBindingV2,
    expectedGenerationToken: string,
  ): Promise<CredentialVaultStoredCredentialV2>;
  upsert(
    record: CredentialVaultStoredCredentialV2,
    expectedGenerationToken: string,
  ): Promise<"created" | "replaced">;
  forget(binding: CredentialVaultBindingV2): Promise<boolean>;
  dispose(): Promise<void>;
}

export interface CreateIndexedDbCredentialVaultOptionsV2 {
  readonly indexedDB: IDBFactory;
  readonly databaseName?: string;
}

function cloneBufferV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
): ArrayBuffer {
  if (!(value instanceof ArrayBuffer)) {
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
  return value.slice(0);
}

function clonePayloadV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
  maximumCiphertextBytes: number,
): CredentialVaultEncryptedPayloadV2 {
  if (value === null || typeof value !== "object") {
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
  try {
    const record = value as Readonly<Record<string, unknown>>;
    if (Object.keys(record).toSorted().join("\0") !== ["ciphertext", "iv"].join("\0")) {
      throw new TypeError("invalid payload");
    }
    const iv = cloneBufferV2(record.iv, operation);
    const ciphertext = cloneBufferV2(record.ciphertext, operation);
    if (
      iv.byteLength !== credentialVaultAesGcmIvBytesV2 ||
      ciphertext.byteLength < credentialVaultAesGcmTagBytesV2 ||
      ciphertext.byteLength > maximumCiphertextBytes
    ) throw new TypeError("invalid payload");
    return { iv, ciphertext };
  } catch (error) {
    if (error instanceof CredentialVaultRepositoryErrorV2) throw error;
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
}

function exactGenerationTokenV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
): string {
  if (
    typeof value !== "string" ||
    !new RegExp(`^[0-9a-f]{${String(credentialVaultGenerationTokenBytesV2 * 2)}}$`, "u").test(value)
  ) throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  return value;
}

function exactStoredHeaderV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
): CredentialVaultStoredHeaderV2 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
  try {
    const record = value as Readonly<Record<string, unknown>>;
    const common = record.id === credentialVaultHeaderIdV2 &&
      record.revision === credentialVaultRevisionV2 && record.cipher === "AES-256-GCM";
    if (!common) throw new TypeError("invalid header");
    const generationToken = exactGenerationTokenV2(record.generationToken, operation);
    const verifier = clonePayloadV2(record.verifier, operation, 256);
    if (record.protection === "device") {
      if (
        Object.keys(record).toSorted().join("\0") !==
          [
            "cipher",
            "generationToken",
            "id",
            "key",
            "protection",
            "revision",
            "verifier",
          ].join("\0") ||
        !isCredentialVaultDeviceKeyV2(record.key)
      ) throw new TypeError("invalid device header");
      return {
        id: "vault",
        revision: 2,
        generationToken,
        protection: "device",
        cipher: "AES-256-GCM",
        key: record.key,
        verifier,
      };
    }
    if (
      record.protection !== "password" ||
      Object.keys(record).toSorted().join("\0") !== [
          "cipher",
          "generationToken",
          "id",
          "iterations",
          "kdf",
          "protection",
          "revision",
          "salt",
          "verifier",
        ].join("\0") ||
      record.kdf !== "PBKDF2-HMAC-SHA256" ||
      record.iterations !== credentialVaultKdfIterationsV2
    ) throw new TypeError("invalid password header");
    const salt = cloneBufferV2(record.salt, operation);
    if (salt.byteLength !== credentialVaultSaltBytesV2) throw new TypeError("invalid salt");
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
  } catch (error) {
    if (error instanceof CredentialVaultRepositoryErrorV2) throw error;
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
}

function exactStoredCredentialV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
): CredentialVaultStoredCredentialV2 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
  try {
    const record = value as Readonly<Record<string, unknown>>;
    if (
      Object.keys(record).toSorted().join("\0") !== [
          "baseUrl",
          "bindingId",
          "cipher",
          "credentialKind",
          "payload",
          "revision",
          "storageKey",
        ].join("\0") ||
      record.revision !== credentialVaultRevisionV2 ||
      record.cipher !== "AES-256-GCM"
    ) throw new TypeError("invalid credential row");
    const binding = admitCredentialVaultBindingV2({
      bindingId: record.bindingId,
      credentialKind: record.credentialKind,
      baseUrl: record.baseUrl,
    });
    if (binding.kind === "rejected") throw new TypeError("invalid binding");
    const storageKey = credentialVaultBindingStorageKeyV2(binding.value);
    if (record.storageKey !== storageKey) throw new TypeError("invalid storage key");
    return {
      storageKey,
      revision: 2,
      ...binding.value,
      cipher: "AES-256-GCM",
      payload: clonePayloadV2(
        record.payload,
        operation,
        64 * 1024 + credentialVaultAesGcmTagBytesV2,
      ),
    };
  } catch (error) {
    if (error instanceof CredentialVaultRepositoryErrorV2) throw error;
    throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
  }
}

function domExceptionNameV2(value: unknown): string | null {
  if (value instanceof DOMException) return value.name;
  if (value !== null && typeof value === "object" && "name" in value) {
    const name = (value as { readonly name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

function mapFailureV2(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV2,
): CredentialVaultRepositoryErrorV2 {
  if (value instanceof CredentialVaultRepositoryErrorV2) {
    return value.operation === operation
      ? value
      : new CredentialVaultRepositoryErrorV2(value.code, operation);
  }
  const name = domExceptionNameV2(value);
  if (name === "VersionError") {
    return new CredentialVaultRepositoryErrorV2("database_newer", operation);
  }
  if (name === "SecurityError" || name === "NotAllowedError") {
    return new CredentialVaultRepositoryErrorV2("storage_unavailable", operation);
  }
  if (name === "QuotaExceededError") {
    return new CredentialVaultRepositoryErrorV2("quota_exceeded", operation);
  }
  if (name === "AbortError") {
    return new CredentialVaultRepositoryErrorV2("transaction_aborted", operation);
  }
  if (name === "ConstraintError") {
    return new CredentialVaultRepositoryErrorV2("already_created", operation);
  }
  return new CredentialVaultRepositoryErrorV2("request_failed", operation);
}

function requestResultV2<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new DOMException("IndexedDB request failed", "UnknownError")),
      { once: true },
    );
  });
}

function transactionCompletionV2(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    const rejectV2 = (): void => {
      reject(transaction.error ?? new DOMException("IndexedDB transaction aborted", "AbortError"));
    };
    transaction.addEventListener("abort", rejectV2, { once: true });
    transaction.addEventListener("error", rejectV2, { once: true });
  });
}

function domStringListValuesV2(value: DOMStringList): readonly string[] {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value.item(index);
    if (entry === null) throw new TypeError("invalid DOMStringList");
    result.push(entry);
  }
  return result;
}

function exactStoreShapeV2(store: IDBObjectStore, keyPath: string): boolean {
  return store.keyPath === keyPath && !store.autoIncrement && store.indexNames.length === 0;
}

function hasExactSchemaV2(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== credentialVaultDatabaseVersionV2 ||
      domStringListValuesV2(database.objectStoreNames).join("\0") !==
        credentialVaultObjectStoreNamesV2.join("\0")
    ) return false;
    const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readonly");
    return exactStoreShapeV2(
      transaction.objectStore(credentialVaultCredentialObjectStoreNameV2),
      "storageKey",
    ) && exactStoreShapeV2(
      transaction.objectStore(credentialVaultHeaderObjectStoreNameV2),
      "id",
    );
  } catch {
    return false;
  }
}

function createStoresV2(database: IDBDatabase): void {
  database.createObjectStore(credentialVaultCredentialObjectStoreNameV2, {
    keyPath: "storageKey",
  });
  database.createObjectStore(credentialVaultHeaderObjectStoreNameV2, { keyPath: "id" });
}

function openDatabaseV2(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly onClosed: () => void;
}): Promise<{
  readonly database: IDBDatabase;
  readonly disposition: CredentialVaultInitializationDispositionV2;
}> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, credentialVaultDatabaseVersionV2);
    } catch (error) {
      reject(mapFailureV2(error, "initialize"));
      return;
    }
    let settled = false;
    let upgradeFailure: unknown;
    let disposition: CredentialVaultInitializationDispositionV2 = "opened";
    const rejectOnceV2 = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(mapFailureV2(error, "initialize"));
    };
    request.addEventListener("upgradeneeded", (event) => {
      try {
        if (event.newVersion !== credentialVaultDatabaseVersionV2) {
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", "initialize");
        }
        if (event.oldVersion === 0) {
          if (request.result.objectStoreNames.length !== 0) {
            throw new CredentialVaultRepositoryErrorV2("schema_invalid", "initialize");
          }
          disposition = "created";
          createStoresV2(request.result);
          return;
        }
        if (event.oldVersion === 1 || event.oldVersion === 2) {
          disposition = "reset_from_v1";
          for (const storeName of [...request.result.objectStoreNames]) {
            request.result.deleteObjectStore(storeName);
          }
          createStoresV2(request.result);
          return;
        }
        throw new CredentialVaultRepositoryErrorV2("schema_invalid", "initialize");
      } catch (error) {
        upgradeFailure = error;
        try {
          request.transaction?.abort();
        } catch {
          // The exact upgrade failure remains authoritative.
        }
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnceV2(new CredentialVaultRepositoryErrorV2("storage_unavailable", "initialize"));
    });
    request.addEventListener("error", () => {
      rejectOnceV2(
        upgradeFailure ?? request.error ?? new DOMException("open failed", "UnknownError"),
      );
    });
    request.addEventListener("success", () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      if (!hasExactSchemaV2(database)) {
        database.close();
        rejectOnceV2(new CredentialVaultRepositoryErrorV2("schema_invalid", "initialize"));
        return;
      }
      settled = true;
      database.addEventListener("versionchange", () => {
        database.close();
        input.onClosed();
      });
      database.addEventListener("close", input.onClosed);
      resolve({ database, disposition });
    });
  });
}

export function createIndexedDbCredentialVaultV2(
  options: CreateIndexedDbCredentialVaultOptionsV2,
): CredentialVaultRepositoryV2 {
  const databaseName = options.databaseName ?? credentialVaultDatabaseNameV2;
  if (databaseName.length === 0 || databaseName.length > 512) {
    throw new TypeError("sillyos.credential_vault.database_name_invalid");
  }
  let databaseV2: IDBDatabase | null = null;
  let openPromiseV2: ReturnType<typeof openDatabaseV2> | null = null;
  let initializationDispositionV2: CredentialVaultInitializationDispositionV2 = "opened";
  let disposedV2 = false;

  const databaseForV2 = async (
    operation: CredentialVaultRepositoryOperationV2,
  ): Promise<IDBDatabase> => {
    if (disposedV2) throw new CredentialVaultRepositoryErrorV2("storage_unavailable", operation);
    if (databaseV2 !== null) return databaseV2;
    openPromiseV2 ??= openDatabaseV2({
      indexedDB: options.indexedDB,
      databaseName,
      onClosed(): void {
        databaseV2 = null;
        openPromiseV2 = null;
      },
    });
    try {
      const opened = await openPromiseV2;
      databaseV2 = opened.database;
      initializationDispositionV2 = opened.disposition;
      return databaseV2;
    } catch (error) {
      openPromiseV2 = null;
      throw mapFailureV2(error, operation);
    }
  };

  return Object.freeze({
    async initialize(): Promise<CredentialVaultInitializationDispositionV2> {
      await databaseForV2("initialize");
      return initializationDispositionV2;
    },
    async loadHeader(): Promise<CredentialVaultStoredHeaderV2 | null> {
      const operation = "load_header" as const;
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(
          credentialVaultHeaderObjectStoreNameV2,
          "readonly",
        );
        const value = await requestResultV2(
          transaction.objectStore(credentialVaultHeaderObjectStoreNameV2).get(
            credentialVaultHeaderIdV2,
          ),
        );
        await transactionCompletionV2(transaction);
        return value === undefined ? null : exactStoredHeaderV2(value, operation);
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async createHeader(header: CredentialVaultStoredHeaderV2): Promise<void> {
      const operation = "create_header" as const;
      const stored = exactStoredHeaderV2(header, operation);
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readwrite");
        const headerStore = transaction.objectStore(credentialVaultHeaderObjectStoreNameV2);
        const credentialStore = transaction.objectStore(credentialVaultCredentialObjectStoreNameV2);
        const [existing, credentialCount] = await Promise.all([
          requestResultV2(headerStore.get(credentialVaultHeaderIdV2)),
          requestResultV2(credentialStore.count()),
        ]);
        if (existing !== undefined || credentialCount !== 0) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2(
            existing !== undefined ? "already_created" : "schema_invalid",
            operation,
          );
        }
        headerStore.add(stored);
        await transactionCompletionV2(transaction);
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async replaceProtection(
      expectedGenerationToken: string,
      header: CredentialVaultStoredHeaderV2,
      records: readonly CredentialVaultStoredCredentialV2[],
    ): Promise<void> {
      const operation = "replace_protection" as const;
      const expectedToken = exactGenerationTokenV2(expectedGenerationToken, operation);
      const storedHeader = exactStoredHeaderV2(header, operation);
      const storedRecords = records.map((record) => exactStoredCredentialV2(record, operation));
      const storageKeys = new Set(storedRecords.map((record) => record.storageKey));
      if (storageKeys.size !== storedRecords.length) {
        throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
      }
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readwrite");
        const headerStore = transaction.objectStore(credentialVaultHeaderObjectStoreNameV2);
        const credentialStore = transaction.objectStore(credentialVaultCredentialObjectStoreNameV2);
        const [existingHeader, existingCount] = await Promise.all([
          requestResultV2(headerStore.get(credentialVaultHeaderIdV2)),
          requestResultV2(credentialStore.count()),
        ]);
        if (existingHeader === undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
        }
        const currentHeader = exactStoredHeaderV2(existingHeader, operation);
        if (
          currentHeader.generationToken !== expectedToken ||
          existingCount !== storedRecords.length
        ) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("stale_state", operation);
        }
        headerStore.put(storedHeader);
        credentialStore.clear();
        for (const record of storedRecords) credentialStore.put(record);
        await transactionCompletionV2(transaction);
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async reset(
      expectedGenerationToken: string,
      header: CredentialVaultStoredDeviceHeaderV2,
    ): Promise<void> {
      const operation = "reset" as const;
      const expectedToken = exactGenerationTokenV2(expectedGenerationToken, operation);
      const storedHeader = exactStoredHeaderV2(header, operation);
      if (storedHeader.protection !== "device") {
        throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
      }
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readwrite");
        const headerStore = transaction.objectStore(credentialVaultHeaderObjectStoreNameV2);
        const credentialStore = transaction.objectStore(credentialVaultCredentialObjectStoreNameV2);
        const existingHeader = await requestResultV2(
          headerStore.get(credentialVaultHeaderIdV2),
        );
        if (existingHeader === undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
        }
        const currentHeader = exactStoredHeaderV2(existingHeader, operation);
        if (currentHeader.generationToken !== expectedToken) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("stale_state", operation);
        }
        headerStore.clear();
        headerStore.add(storedHeader);
        credentialStore.clear();
        await transactionCompletionV2(transaction);
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async list(): Promise<readonly CredentialVaultBindingV2[]> {
      const operation = "list" as const;
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readonly");
        const [header, rows] = await Promise.all([
          requestResultV2(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV2).get(
              credentialVaultHeaderIdV2,
            ),
          ),
          requestResultV2(
            transaction.objectStore(credentialVaultCredentialObjectStoreNameV2).getAll(),
          ),
        ]);
        await transactionCompletionV2(transaction);
        if (header === undefined && rows.length !== 0) {
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
        }
        if (header !== undefined) exactStoredHeaderV2(header, operation);
        const bindings = rows.map((row) => {
          const stored = exactStoredCredentialV2(row, operation);
          return normalizeCredentialVaultBindingV2({
            bindingId: stored.bindingId,
            credentialKind: stored.credentialKind,
            baseUrl: stored.baseUrl,
          });
        }).toSorted(compareCredentialVaultBindingsV2);
        return Object.freeze(bindings.map((binding) => Object.freeze(binding)));
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async loadCredential(
      binding: CredentialVaultBindingV2,
      expectedGenerationToken: string,
    ): Promise<CredentialVaultStoredCredentialV2> {
      const operation = "load_credential" as const;
      const exactBinding = normalizeCredentialVaultBindingV2(binding);
      const expectedToken = exactGenerationTokenV2(expectedGenerationToken, operation);
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readonly");
        const [header, value] = await Promise.all([
          requestResultV2(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV2).get(
              credentialVaultHeaderIdV2,
            ),
          ),
          requestResultV2(
            transaction.objectStore(credentialVaultCredentialObjectStoreNameV2).get(
              credentialVaultBindingStorageKeyV2(exactBinding),
            ),
          ),
        ]);
        await transactionCompletionV2(transaction);
        if (header === undefined) {
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
        }
        if (exactStoredHeaderV2(header, operation).generationToken !== expectedToken) {
          throw new CredentialVaultRepositoryErrorV2("stale_state", operation);
        }
        if (value === undefined) {
          throw new CredentialVaultRepositoryErrorV2("binding_missing", operation);
        }
        const stored = exactStoredCredentialV2(value, operation);
        if (!credentialVaultBindingsEqualV2(stored, exactBinding)) {
          throw new CredentialVaultRepositoryErrorV2("binding_conflict", operation);
        }
        return stored;
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async upsert(
      record: CredentialVaultStoredCredentialV2,
      expectedGenerationToken: string,
    ): Promise<"created" | "replaced"> {
      const operation = "upsert" as const;
      const stored = exactStoredCredentialV2(record, operation);
      const expectedToken = exactGenerationTokenV2(expectedGenerationToken, operation);
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readwrite");
        const store = transaction.objectStore(credentialVaultCredentialObjectStoreNameV2);
        const [header, existingValue] = await Promise.all([
          requestResultV2(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV2).get(
              credentialVaultHeaderIdV2,
            ),
          ),
          requestResultV2(store.get(stored.storageKey)),
        ]);
        if (header === undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("schema_invalid", operation);
        }
        if (exactStoredHeaderV2(header, operation).generationToken !== expectedToken) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("stale_state", operation);
        }
        const existing = existingValue === undefined
          ? null
          : exactStoredCredentialV2(existingValue, operation);
        if (existing !== null && !credentialVaultBindingsEqualV2(existing, stored)) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("binding_conflict", operation);
        }
        store.put(stored);
        await transactionCompletionV2(transaction);
        return existing === null ? "created" : "replaced";
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async forget(binding: CredentialVaultBindingV2): Promise<boolean> {
      const operation = "forget" as const;
      const exactBinding = normalizeCredentialVaultBindingV2(binding);
      try {
        const database = await databaseForV2(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV2, "readwrite");
        const store = transaction.objectStore(credentialVaultCredentialObjectStoreNameV2);
        const value = await requestResultV2(
          store.get(credentialVaultBindingStorageKeyV2(exactBinding)),
        );
        if (value === undefined) {
          await transactionCompletionV2(transaction);
          return false;
        }
        const stored = exactStoredCredentialV2(value, operation);
        if (!credentialVaultBindingsEqualV2(stored, exactBinding)) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV2("binding_conflict", operation);
        }
        store.delete(stored.storageKey);
        await transactionCompletionV2(transaction);
        return true;
      } catch (error) {
        throw mapFailureV2(error, operation);
      }
    },
    async dispose(): Promise<void> {
      if (disposedV2) return;
      disposedV2 = true;
      databaseV2?.close();
      databaseV2 = null;
      openPromiseV2 = null;
    },
  });
}
