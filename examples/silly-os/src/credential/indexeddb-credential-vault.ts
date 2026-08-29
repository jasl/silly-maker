// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitCredentialVaultBindingV1,
  compareCredentialVaultBindingsV1,
  credentialVaultBindingsEqualV1,
  credentialVaultKdfIterationsV1,
  credentialVaultMaximumBindingsV1,
  credentialVaultRevisionV1,
  normalizeCredentialVaultBindingV1,
  type CredentialVaultBindingV1,
} from "./credential-vault-contracts.ts";
import {
  credentialVaultAesGcmIvBytesV1,
  credentialVaultAesGcmTagBytesV1,
  credentialVaultSaltBytesV1,
  type CredentialVaultEncryptedPayloadV1,
} from "./credential-vault-crypto.ts";

export const credentialVaultDatabaseNameV1 = "sillymaker.example-silly-os.credentials";
export const credentialVaultDatabaseVersionV1 = 1;
export const credentialVaultHeaderObjectStoreNameV1 = "vault";
export const credentialVaultCredentialObjectStoreNameV1 = "credentials";

const credentialVaultHeaderIdV1 = "vault";
const credentialVaultObjectStoreNamesV1 = [
  credentialVaultCredentialObjectStoreNameV1,
  credentialVaultHeaderObjectStoreNameV1,
] as const;

export type CredentialVaultRepositoryFailureCodeV1 =
  | "already_created"
  | "binding_conflict"
  | "binding_missing"
  | "capacity_exceeded"
  | "database_newer"
  | "quota_exceeded"
  | "request_failed"
  | "schema_invalid"
  | "storage_unavailable"
  | "transaction_aborted";

export type CredentialVaultRepositoryOperationV1 =
  | "initialize"
  | "load_header"
  | "create"
  | "list"
  | "load_credential"
  | "upsert"
  | "forget"
  | "dispose";

export class CredentialVaultRepositoryErrorV1 extends Error {
  constructor(
    readonly code: CredentialVaultRepositoryFailureCodeV1,
    readonly operation: CredentialVaultRepositoryOperationV1,
  ) {
    super(`sillyos.credential_vault.repository.${operation}.${code}`);
    this.name = "CredentialVaultRepositoryErrorV1";
  }
}

export interface CredentialVaultStoredHeaderV1 {
  readonly id: "vault";
  readonly revision: 1;
  readonly kdf: "PBKDF2-HMAC-SHA256";
  readonly iterations: number;
  readonly salt: ArrayBuffer;
  readonly cipher: "AES-256-GCM";
  readonly verifier: CredentialVaultEncryptedPayloadV1;
}

export interface CredentialVaultStoredCredentialV1 extends CredentialVaultBindingV1 {
  readonly revision: 1;
  readonly cipher: "AES-256-GCM";
  readonly payload: CredentialVaultEncryptedPayloadV1;
}

export interface CredentialVaultRepositoryV1 {
  initialize(): Promise<void>;
  loadHeader(): Promise<CredentialVaultStoredHeaderV1 | null>;
  create(header: CredentialVaultStoredHeaderV1): Promise<void>;
  list(): Promise<readonly CredentialVaultBindingV1[]>;
  loadCredential(binding: CredentialVaultBindingV1): Promise<CredentialVaultStoredCredentialV1>;
  upsert(record: CredentialVaultStoredCredentialV1): Promise<"created" | "replaced">;
  forget(binding: CredentialVaultBindingV1): Promise<boolean>;
  dispose(): Promise<void>;
}

export interface CreateIndexedDbCredentialVaultOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly databaseName?: string;
}

function cloneBufferV1(value: ArrayBuffer): ArrayBuffer {
  if (!(value instanceof ArrayBuffer)) {
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", "load_header");
  }
  return value.slice(0);
}

function clonePayloadV1(
  value: CredentialVaultEncryptedPayloadV1,
  operation: CredentialVaultRepositoryOperationV1,
  maximumCiphertextBytes: number,
): CredentialVaultEncryptedPayloadV1 {
  try {
    const iv = cloneBufferV1(value.iv);
    const ciphertext = cloneBufferV1(value.ciphertext);
    if (
      iv.byteLength !== credentialVaultAesGcmIvBytesV1 ||
      ciphertext.byteLength < credentialVaultAesGcmTagBytesV1 ||
      ciphertext.byteLength > maximumCiphertextBytes
    ) throw new TypeError("invalid payload");
    return { iv, ciphertext };
  } catch {
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
  }
}

function exactStoredHeaderV1(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV1,
): CredentialVaultStoredHeaderV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
  }
  try {
    const record = value as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record).toSorted();
    if (
      keys.join("\0") !== [
          "cipher",
          "id",
          "iterations",
          "kdf",
          "revision",
          "salt",
          "verifier",
        ].join("\0") ||
      record.id !== credentialVaultHeaderIdV1 ||
      record.revision !== credentialVaultRevisionV1 ||
      record.kdf !== "PBKDF2-HMAC-SHA256" ||
      record.iterations !== credentialVaultKdfIterationsV1 ||
      record.cipher !== "AES-256-GCM" || !(record.salt instanceof ArrayBuffer) ||
      record.salt.byteLength !== credentialVaultSaltBytesV1 ||
      record.verifier === null || typeof record.verifier !== "object"
    ) throw new TypeError("invalid header");
    const verifier = clonePayloadV1(
      record.verifier as CredentialVaultEncryptedPayloadV1,
      operation,
      256,
    );
    return {
      id: "vault",
      revision: 1,
      kdf: "PBKDF2-HMAC-SHA256",
      iterations: credentialVaultKdfIterationsV1,
      salt: record.salt.slice(0),
      cipher: "AES-256-GCM",
      verifier,
    };
  } catch (error) {
    if (error instanceof CredentialVaultRepositoryErrorV1) throw error;
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
  }
}

function exactStoredCredentialV1(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV1,
): CredentialVaultStoredCredentialV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
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
        ].join("\0") ||
      record.revision !== credentialVaultRevisionV1 ||
      record.cipher !== "AES-256-GCM"
    ) throw new TypeError("invalid credential row");
    const binding = admitCredentialVaultBindingV1({
      bindingId: record.bindingId,
      credentialKind: record.credentialKind,
      baseUrl: record.baseUrl,
    });
    if (
      binding.kind === "rejected" || record.payload === null || typeof record.payload !== "object"
    ) {
      throw new TypeError("invalid credential row");
    }
    return {
      revision: 1,
      ...binding.value,
      cipher: "AES-256-GCM",
      payload: clonePayloadV1(
        record.payload as CredentialVaultEncryptedPayloadV1,
        operation,
        64 * 1024 + credentialVaultAesGcmTagBytesV1,
      ),
    };
  } catch (error) {
    if (error instanceof CredentialVaultRepositoryErrorV1) throw error;
    throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
  }
}

function domExceptionNameV1(value: unknown): string | null {
  if (value instanceof DOMException) return value.name;
  if (value !== null && typeof value === "object" && "name" in value) {
    const name = (value as { readonly name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

function mapFailureV1(
  value: unknown,
  operation: CredentialVaultRepositoryOperationV1,
): CredentialVaultRepositoryErrorV1 {
  if (value instanceof CredentialVaultRepositoryErrorV1) {
    return value.operation === operation
      ? value
      : new CredentialVaultRepositoryErrorV1(value.code, operation);
  }
  const name = domExceptionNameV1(value);
  if (name === "VersionError") {
    return new CredentialVaultRepositoryErrorV1("database_newer", operation);
  }
  if (name === "SecurityError" || name === "NotAllowedError") {
    return new CredentialVaultRepositoryErrorV1("storage_unavailable", operation);
  }
  if (name === "QuotaExceededError") {
    return new CredentialVaultRepositoryErrorV1("quota_exceeded", operation);
  }
  if (name === "AbortError") {
    return new CredentialVaultRepositoryErrorV1("transaction_aborted", operation);
  }
  if (name === "ConstraintError") {
    return new CredentialVaultRepositoryErrorV1("already_created", operation);
  }
  return new CredentialVaultRepositoryErrorV1("request_failed", operation);
}

function requestResultV1<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new DOMException("IndexedDB request failed", "UnknownError")),
      { once: true },
    );
  });
}

function transactionCompletionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    const rejectV1 = (): void => {
      reject(transaction.error ?? new DOMException("IndexedDB transaction aborted", "AbortError"));
    };
    transaction.addEventListener("abort", rejectV1, { once: true });
    transaction.addEventListener("error", rejectV1, { once: true });
  });
}

function domStringListValuesV1(value: DOMStringList): readonly string[] {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value.item(index);
    if (entry === null) throw new TypeError("invalid DOMStringList");
    result.push(entry);
  }
  return result;
}

function exactStoreShapeV1(store: IDBObjectStore, keyPath: string): boolean {
  return store.keyPath === keyPath && !store.autoIncrement && store.indexNames.length === 0;
}

function hasExactSchemaV1(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== credentialVaultDatabaseVersionV1 ||
      domStringListValuesV1(database.objectStoreNames).join("\0") !==
        credentialVaultObjectStoreNamesV1.join("\0")
    ) return false;
    const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readonly");
    return exactStoreShapeV1(
      transaction.objectStore(credentialVaultCredentialObjectStoreNameV1),
      "bindingId",
    ) && exactStoreShapeV1(
      transaction.objectStore(credentialVaultHeaderObjectStoreNameV1),
      "id",
    );
  } catch {
    return false;
  }
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly onClosed: () => void;
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, credentialVaultDatabaseVersionV1);
    } catch (error) {
      reject(mapFailureV1(error, "initialize"));
      return;
    }
    let settled = false;
    let upgradeFailure: unknown;
    const rejectOnceV1 = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(mapFailureV1(error, "initialize"));
    };
    request.addEventListener("upgradeneeded", (event) => {
      if (settled) {
        try {
          request.transaction?.abort();
        } catch {
          // A previously rejected open must not mutate storage later.
        }
        return;
      }
      try {
        if (event.oldVersion !== 0 || event.newVersion !== credentialVaultDatabaseVersionV1) {
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", "initialize");
        }
        if (request.result.objectStoreNames.length !== 0) {
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", "initialize");
        }
        request.result.createObjectStore(credentialVaultCredentialObjectStoreNameV1, {
          keyPath: "bindingId",
        });
        request.result.createObjectStore(credentialVaultHeaderObjectStoreNameV1, {
          keyPath: "id",
        });
      } catch (error) {
        upgradeFailure = error;
        try {
          request.transaction?.abort();
        } catch {
          // The exact schema failure remains authoritative.
        }
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnceV1(new CredentialVaultRepositoryErrorV1("storage_unavailable", "initialize"));
    });
    request.addEventListener("error", () => {
      rejectOnceV1(
        upgradeFailure ?? request.error ?? new DOMException("open failed", "UnknownError"),
      );
    });
    request.addEventListener("success", () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      if (!hasExactSchemaV1(database)) {
        database.close();
        rejectOnceV1(new CredentialVaultRepositoryErrorV1("schema_invalid", "initialize"));
        return;
      }
      settled = true;
      database.addEventListener("versionchange", () => {
        database.close();
        input.onClosed();
      });
      database.addEventListener("close", input.onClosed);
      resolve(database);
    });
  });
}

function cloneStoredHeaderV1(value: CredentialVaultStoredHeaderV1): CredentialVaultStoredHeaderV1 {
  return exactStoredHeaderV1(value, "load_header");
}

function cloneStoredCredentialV1(
  value: CredentialVaultStoredCredentialV1,
  operation: CredentialVaultRepositoryOperationV1,
): CredentialVaultStoredCredentialV1 {
  return exactStoredCredentialV1(value, operation);
}

export function createIndexedDbCredentialVaultV1(
  options: CreateIndexedDbCredentialVaultOptionsV1,
): CredentialVaultRepositoryV1 {
  const databaseName = options.databaseName ?? credentialVaultDatabaseNameV1;
  if (databaseName.length === 0 || databaseName.length > 512) {
    throw new TypeError("sillyos.credential_vault.database_name_invalid");
  }
  let databaseV1: IDBDatabase | null = null;
  let openPromiseV1: Promise<IDBDatabase> | null = null;
  let disposedV1 = false;

  const databaseForV1 = async (
    operation: CredentialVaultRepositoryOperationV1,
  ): Promise<IDBDatabase> => {
    if (disposedV1) throw new CredentialVaultRepositoryErrorV1("storage_unavailable", operation);
    if (databaseV1 !== null) return databaseV1;
    openPromiseV1 ??= openDatabaseV1({
      indexedDB: options.indexedDB,
      databaseName,
      onClosed(): void {
        databaseV1 = null;
        openPromiseV1 = null;
      },
    });
    try {
      databaseV1 = await openPromiseV1;
      return databaseV1;
    } catch (error) {
      openPromiseV1 = null;
      throw mapFailureV1(error, operation);
    }
  };

  return Object.freeze({
    async initialize(): Promise<void> {
      await databaseForV1("initialize");
    },
    async loadHeader(): Promise<CredentialVaultStoredHeaderV1 | null> {
      const operation = "load_header" as const;
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(
          credentialVaultHeaderObjectStoreNameV1,
          "readonly",
        );
        const value = await requestResultV1(
          transaction.objectStore(credentialVaultHeaderObjectStoreNameV1).get(
            credentialVaultHeaderIdV1,
          ),
        );
        await transactionCompletionV1(transaction);
        return value === undefined ? null : exactStoredHeaderV1(value, operation);
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async create(header: CredentialVaultStoredHeaderV1): Promise<void> {
      const operation = "create" as const;
      const stored = cloneStoredHeaderV1(header);
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readwrite");
        const headerStore = transaction.objectStore(credentialVaultHeaderObjectStoreNameV1);
        const credentialStore = transaction.objectStore(credentialVaultCredentialObjectStoreNameV1);
        const [existing, credentialCount] = await Promise.all([
          requestResultV1(headerStore.get(credentialVaultHeaderIdV1)),
          requestResultV1(credentialStore.count()),
        ]);
        if (existing !== undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("already_created", operation);
        }
        if (credentialCount !== 0) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        headerStore.add(stored);
        await transactionCompletionV1(transaction);
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async list(): Promise<readonly CredentialVaultBindingV1[]> {
      const operation = "list" as const;
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readonly");
        const [header, rows] = await Promise.all([
          requestResultV1(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV1).get(
              credentialVaultHeaderIdV1,
            ),
          ),
          requestResultV1(
            transaction.objectStore(credentialVaultCredentialObjectStoreNameV1).getAll(),
          ),
        ]);
        await transactionCompletionV1(transaction);
        if (header === undefined && rows.length !== 0) {
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        if (header !== undefined) exactStoredHeaderV1(header, operation);
        if (rows.length > credentialVaultMaximumBindingsV1) {
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        const bindings = rows.map((row) => {
          const stored = exactStoredCredentialV1(row, operation);
          return normalizeCredentialVaultBindingV1({
            bindingId: stored.bindingId,
            credentialKind: stored.credentialKind,
            baseUrl: stored.baseUrl,
          });
        }).toSorted(compareCredentialVaultBindingsV1);
        for (let index = 1; index < bindings.length; index += 1) {
          if (bindings[index - 1]?.bindingId === bindings[index]?.bindingId) {
            throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
          }
        }
        return Object.freeze(bindings.map((binding) => Object.freeze(binding)));
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async loadCredential(
      binding: CredentialVaultBindingV1,
    ): Promise<CredentialVaultStoredCredentialV1> {
      const operation = "load_credential" as const;
      const exactBinding = normalizeCredentialVaultBindingV1(binding);
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readonly");
        const [header, value] = await Promise.all([
          requestResultV1(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV1).get(
              credentialVaultHeaderIdV1,
            ),
          ),
          requestResultV1(
            transaction.objectStore(credentialVaultCredentialObjectStoreNameV1).get(
              exactBinding.bindingId,
            ),
          ),
        ]);
        await transactionCompletionV1(transaction);
        if (header === undefined) {
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        exactStoredHeaderV1(header, operation);
        if (value === undefined) {
          throw new CredentialVaultRepositoryErrorV1("binding_missing", operation);
        }
        const stored = exactStoredCredentialV1(value, operation);
        if (!credentialVaultBindingsEqualV1(stored, exactBinding)) {
          throw new CredentialVaultRepositoryErrorV1("binding_conflict", operation);
        }
        return stored;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async upsert(record: CredentialVaultStoredCredentialV1): Promise<"created" | "replaced"> {
      const operation = "upsert" as const;
      const stored = cloneStoredCredentialV1(record, operation);
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readwrite");
        const store = transaction.objectStore(credentialVaultCredentialObjectStoreNameV1);
        const [header, existingValue, count] = await Promise.all([
          requestResultV1(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV1).get(
              credentialVaultHeaderIdV1,
            ),
          ),
          requestResultV1(store.get(stored.bindingId)),
          requestResultV1(store.count()),
        ]);
        if (header === undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        exactStoredHeaderV1(header, operation);
        const existing = existingValue === undefined
          ? null
          : exactStoredCredentialV1(existingValue, operation);
        if (existing !== null && !credentialVaultBindingsEqualV1(existing, stored)) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("binding_conflict", operation);
        }
        if (existing === null && count >= credentialVaultMaximumBindingsV1) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("capacity_exceeded", operation);
        }
        store.put(stored);
        await transactionCompletionV1(transaction);
        return existing === null ? "created" : "replaced";
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async forget(binding: CredentialVaultBindingV1): Promise<boolean> {
      const operation = "forget" as const;
      const exactBinding = normalizeCredentialVaultBindingV1(binding);
      try {
        const database = await databaseForV1(operation);
        const transaction = database.transaction(credentialVaultObjectStoreNamesV1, "readwrite");
        const store = transaction.objectStore(credentialVaultCredentialObjectStoreNameV1);
        const [header, value] = await Promise.all([
          requestResultV1(
            transaction.objectStore(credentialVaultHeaderObjectStoreNameV1).get(
              credentialVaultHeaderIdV1,
            ),
          ),
          requestResultV1(store.get(exactBinding.bindingId)),
        ]);
        if (header === undefined) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("schema_invalid", operation);
        }
        exactStoredHeaderV1(header, operation);
        if (value === undefined) {
          await transactionCompletionV1(transaction);
          return false;
        }
        const stored = exactStoredCredentialV1(value, operation);
        if (!credentialVaultBindingsEqualV1(stored, exactBinding)) {
          transaction.abort();
          throw new CredentialVaultRepositoryErrorV1("binding_conflict", operation);
        }
        store.delete(exactBinding.bindingId);
        await transactionCompletionV1(transaction);
        return true;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async dispose(): Promise<void> {
      if (disposedV1) return;
      disposedV1 = true;
      databaseV1?.close();
      databaseV1 = null;
      openPromiseV1 = null;
    },
  });
}
