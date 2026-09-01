// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitInstalledProgramPackageReferenceV1,
  admitProgramPackageArchiveV1,
  admitProgramPackageManifestV1,
  admitProgramPackageProgramIdV1,
  cloneInstalledProgramPackageReferenceV1,
  cloneProgramPackageArchiveV1,
  cloneProgramPackageManifestV1,
  ProgramPackageAdmissionErrorV1,
  type AdmittedProgramPackageArchiveV1,
  type InstalledProgramPackageReferenceV1,
  type ProgramPackageAdmissionLimitsV1,
  type ProgramPackageArchiveV1,
  type ProgramPackageManifestV1,
} from "../package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../package/program-runtime-profile-descriptor.ts";
import type { ProgramPackageMetadataV1 } from "../package/program-runtime-profile-descriptor.ts";
import {
  ProgramPackageInstallationRepositoryErrorV1,
  type ProgramPackageInstallationRepositoryV1,
  type ProgramPackageInstallationRepositoryOperationV1,
} from "./program-package-installation-repository.ts";

export const programPackageInstallationDatabaseNameV1 =
  "sillymaker.example-silly-os.program-packages";
export const programPackageInstallationDatabaseVersionV1 = 2;
export const programPackageInstallationObjectStoreNameV1 = "packages";
export const programPackageInstallationCurrentObjectStoreNameV1 = "package_heads";
export const programPackageInstallationMetadataObjectStoreNameV1 = "package_metadata";

const programPackageInstallationObjectStoreNamesV1 = [
  programPackageInstallationCurrentObjectStoreNameV1,
  programPackageInstallationMetadataObjectStoreNameV1,
  programPackageInstallationObjectStoreNameV1,
] as const;

interface StoredProgramPackageV1 {
  readonly storageKey: string;
  readonly schemaVersion: 1;
  readonly reference: InstalledProgramPackageReferenceV1;
  readonly byteLength: number;
  readonly archive: ProgramPackageArchiveV1;
}

interface StoredCurrentProgramPackageV1 {
  readonly programId: string;
  readonly reference: InstalledProgramPackageReferenceV1;
}

interface StoredProgramPackageMetadataV1 {
  readonly storageKey: string;
  readonly schemaVersion: 1;
  readonly reference: InstalledProgramPackageReferenceV1;
  readonly manifest: ProgramPackageManifestV1;
  readonly byteLength: number;
  readonly initialUiSurfaceId: string | null;
}

export interface CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly limits: ProgramPackageAdmissionLimitsV1;
  readonly subtle?: SubtleCrypto | undefined;
  readonly databaseName?: string;
}

function storageKeyV1(referenceValue: InstalledProgramPackageReferenceV1): string {
  const reference = admitInstalledProgramPackageReferenceV1(referenceValue);
  return JSON.stringify([
    reference.programId,
    reference.packageVersion,
    reference.contentDigest,
  ]);
}

function referencesEqualV1(
  left: InstalledProgramPackageReferenceV1,
  right: InstalledProgramPackageReferenceV1,
): boolean {
  return left.programId === right.programId &&
    left.packageVersion === right.packageVersion &&
    left.contentDigest === right.contentDigest;
}

function requestResultV1<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new DOMException("request failed", "UnknownError")),
      { once: true },
    );
  });
}

function transactionCompletionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new DOMException("transaction aborted", "AbortError")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new DOMException("transaction failed", "UnknownError")),
      { once: true },
    );
  });
}

function mapFailureV1(
  error: unknown,
  operation: ProgramPackageInstallationRepositoryOperationV1,
): Error {
  if (
    error instanceof ProgramPackageAdmissionErrorV1 ||
    error instanceof ProgramPackageInstallationRepositoryErrorV1
  ) return error;
  if (error instanceof DOMException) {
    if (error.name === "VersionError") {
      return new ProgramPackageInstallationRepositoryErrorV1("database_newer", operation);
    }
    if (error.name === "QuotaExceededError") {
      return new ProgramPackageInstallationRepositoryErrorV1("quota_exceeded", operation);
    }
    if (error.name === "AbortError") {
      return new ProgramPackageInstallationRepositoryErrorV1("transaction_aborted", operation);
    }
    if (error.name === "InvalidStateError" || error.name === "NotFoundError") {
      return new ProgramPackageInstallationRepositoryErrorV1("storage_unavailable", operation);
    }
  }
  return new ProgramPackageInstallationRepositoryErrorV1("request_failed", operation);
}

function exactStoreSchemaV1(database: IDBDatabase): boolean {
  return [...database.objectStoreNames].toSorted().join("\0") ===
    [...programPackageInstallationObjectStoreNamesV1].toSorted().join("\0");
}

interface OpenDatabaseResultV1 {
  readonly database: IDBDatabase;
  readonly disposition: "created" | "opened";
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly onClosed: () => void;
}): Promise<OpenDatabaseResultV1> {
  return new Promise((resolve, reject) => {
    const request = input.indexedDB.open(
      input.databaseName,
      programPackageInstallationDatabaseVersionV1,
    );
    let disposition: "created" | "opened" = "opened";
    let upgradeFailure: unknown = null;
    let settled = false;
    const rejectOnceV1 = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    request.addEventListener("upgradeneeded", (event) => {
      try {
        if (event.newVersion !== programPackageInstallationDatabaseVersionV1) {
          throw new ProgramPackageInstallationRepositoryErrorV1(
            "schema_invalid",
            "initialize",
          );
        }
        for (const name of [...request.result.objectStoreNames]) {
          request.result.deleteObjectStore(name);
        }
        disposition = "created";
        request.result.createObjectStore(programPackageInstallationObjectStoreNameV1, {
          keyPath: "storageKey",
        });
        request.result.createObjectStore(programPackageInstallationMetadataObjectStoreNameV1, {
          keyPath: "storageKey",
        });
        request.result.createObjectStore(programPackageInstallationCurrentObjectStoreNameV1, {
          keyPath: "programId",
        });
      } catch (error) {
        upgradeFailure = error;
        try {
          request.transaction?.abort();
        } catch {
          // Preserve the exact upgrade failure.
        }
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnceV1(
        new ProgramPackageInstallationRepositoryErrorV1(
          "storage_unavailable",
          "initialize",
        ),
      );
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
      if (!exactStoreSchemaV1(database)) {
        database.close();
        rejectOnceV1(
          new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", "initialize"),
        );
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

function exactStoredPackageShapeV1(value: unknown): value is StoredProgramPackageV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Readonly<Record<string, unknown>>;
  return Object.keys(record).toSorted().join("\0") ===
      ["archive", "byteLength", "reference", "schemaVersion", "storageKey"]
        .toSorted()
        .join("\0") &&
    record.schemaVersion === 1 &&
    typeof record.storageKey === "string" &&
    Number.isSafeInteger(record.byteLength) &&
    typeof record.byteLength === "number" && record.byteLength >= 0;
}

async function restoreStoredPackageV1(
  value: unknown,
  options: Pick<
    CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1,
    "limits" | "subtle"
  >,
  operation: ProgramPackageInstallationRepositoryOperationV1,
): Promise<AdmittedProgramPackageArchiveV1> {
  try {
    if (!exactStoredPackageShapeV1(value)) throw new TypeError();
    const reference = admitInstalledProgramPackageReferenceV1(value.reference);
    if (value.storageKey !== storageKeyV1(reference)) throw new TypeError();
    const admitted = await admitProgramPackageArchiveV1(value.archive, options);
    if (
      value.byteLength !== admitted.byteLength ||
      !referencesEqualV1(reference, admitted.reference)
    ) throw new TypeError();
    return admitted;
  } catch (error) {
    if (error instanceof ProgramPackageInstallationRepositoryErrorV1) throw error;
    throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
  }
}

function storedPackageV1(admitted: AdmittedProgramPackageArchiveV1): StoredProgramPackageV1 {
  return {
    storageKey: storageKeyV1(admitted.reference),
    schemaVersion: 1,
    reference: cloneInstalledProgramPackageReferenceV1(admitted.reference),
    byteLength: admitted.byteLength,
    archive: cloneProgramPackageArchiveV1(admitted),
  };
}

function storedPackageMetadataV1(
  admitted: AdmittedProgramPackageArchiveV1,
): StoredProgramPackageMetadataV1 {
  const projection = projectProgramPackageRuntimeProfileV1(admitted);
  return {
    storageKey: storageKeyV1(admitted.reference),
    schemaVersion: 1,
    reference: cloneInstalledProgramPackageReferenceV1(admitted.reference),
    manifest: cloneProgramPackageManifestV1(admitted.manifest),
    byteLength: admitted.byteLength,
    initialUiSurfaceId: projection.initialUiSurfaceId,
  };
}

function restoreStoredPackageMetadataV1(
  value: unknown,
  options: Pick<CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1, "limits">,
): ProgramPackageMetadataV1 {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    const record = value as Readonly<Record<string, unknown>>;
    if (
      Object.keys(record).toSorted().join("\0") !==
        [
          "byteLength",
          "initialUiSurfaceId",
          "manifest",
          "reference",
          "schemaVersion",
          "storageKey",
        ].toSorted().join("\0") ||
      record.schemaVersion !== 1 || typeof record.storageKey !== "string" ||
      !Number.isSafeInteger(record.byteLength) || typeof record.byteLength !== "number" ||
      record.byteLength < 0 ||
      (record.initialUiSurfaceId !== null &&
        (typeof record.initialUiSurfaceId !== "string" ||
          (record.initialUiSurfaceId.length > 0 &&
            record.initialUiSurfaceId.trim() !== record.initialUiSurfaceId)))
    ) throw new TypeError();
    const reference = admitInstalledProgramPackageReferenceV1(record.reference);
    const manifest = admitProgramPackageManifestV1(record.manifest, options.limits);
    if (
      record.storageKey !== storageKeyV1(reference) ||
      reference.programId !== manifest.programId ||
      reference.packageVersion !== manifest.packageVersion ||
      (manifest.initialUiPath === null) !== (record.initialUiSurfaceId === null)
    ) throw new TypeError();
    return {
      reference,
      manifest,
      byteLength: record.byteLength,
      initialUiSurfaceId: record.initialUiSurfaceId,
    };
  } catch {
    throw new ProgramPackageInstallationRepositoryErrorV1(
      "schema_invalid",
      "list_metadata",
    );
  }
}

function exactCurrentReferenceV1(
  value: unknown,
  expectedProgramId: string,
): InstalledProgramPackageReferenceV1 {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    const record = value as Readonly<Record<string, unknown>>;
    if (
      Object.keys(record).toSorted().join("\0") !== ["programId", "reference"].join("\0") ||
      record.programId !== expectedProgramId
    ) throw new TypeError();
    const reference = admitInstalledProgramPackageReferenceV1(record.reference);
    if (reference.programId !== expectedProgramId) throw new TypeError();
    return reference;
  } catch {
    throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", "current");
  }
}

export function createIndexedDbProgramPackageInstallationRepositoryV1(
  options: CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1,
): ProgramPackageInstallationRepositoryV1 {
  const databaseName = options.databaseName ?? programPackageInstallationDatabaseNameV1;
  if (databaseName.length === 0) {
    throw new TypeError("sillyos.program_package.database_name_invalid");
  }
  let database: IDBDatabase | null = null;
  let openPromise: Promise<OpenDatabaseResultV1> | null = null;
  let initializationDisposition: "created" | "opened" = "opened";
  let disposed = false;

  const databaseForV1 = async (
    operation: ProgramPackageInstallationRepositoryOperationV1,
  ): Promise<IDBDatabase> => {
    if (disposed) {
      throw new ProgramPackageInstallationRepositoryErrorV1("storage_unavailable", operation);
    }
    if (database !== null) return database;
    openPromise ??= openDatabaseV1({
      indexedDB: options.indexedDB,
      databaseName,
      onClosed(): void {
        database = null;
        openPromise = null;
      },
    });
    try {
      const opened = await openPromise;
      database = opened.database;
      initializationDisposition = opened.disposition;
      return database;
    } catch (error) {
      openPromise = null;
      throw mapFailureV1(error, operation);
    }
  };

  return {
    async initialize(): Promise<"created" | "opened"> {
      await databaseForV1("initialize");
      return initializationDisposition;
    },
    async install(archive: ProgramPackageArchiveV1, installOptions) {
      const operation = "install" as const;
      const admitted = await admitProgramPackageArchiveV1(archive, {
        limits: options.limits,
        subtle: options.subtle,
      });
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNamesV1,
          "readwrite",
        );
        const completion = transactionCompletionV1(transaction);
        const store = transaction.objectStore(programPackageInstallationObjectStoreNameV1);
        const key = storageKeyV1(admitted.reference);
        const existingKey = await requestResultV1(store.getKey(key));
        await requestResultV1(store.put(storedPackageV1(admitted)));
        await requestResultV1(
          transaction.objectStore(programPackageInstallationMetadataObjectStoreNameV1).put(
            storedPackageMetadataV1(admitted),
          ),
        );
        const currentStore = transaction.objectStore(
          programPackageInstallationCurrentObjectStoreNameV1,
        );
        const shouldSelect = installOptions.currentSelection === "always" ||
          (installOptions.currentSelection === "if_missing" &&
            await requestResultV1(currentStore.getKey(admitted.reference.programId)) ===
              undefined);
        if (shouldSelect) {
          const current: StoredCurrentProgramPackageV1 = {
            programId: admitted.reference.programId,
            reference: cloneInstalledProgramPackageReferenceV1(admitted.reference),
          };
          await requestResultV1(
            currentStore.put(current),
          );
        }
        await completion;
        return {
          disposition: existingKey === undefined ? "installed" : "already_installed",
          reference: cloneInstalledProgramPackageReferenceV1(admitted.reference),
        };
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async load(referenceValue: InstalledProgramPackageReferenceV1) {
      const operation = "load" as const;
      const reference = admitInstalledProgramPackageReferenceV1(referenceValue);
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNameV1,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        const value = await requestResultV1(
          transaction.objectStore(programPackageInstallationObjectStoreNameV1).get(
            storageKeyV1(reference),
          ),
        );
        await completion;
        if (value === undefined) return null;
        const admitted = await restoreStoredPackageV1(value, options, operation);
        if (!referencesEqualV1(reference, admitted.reference)) {
          throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
        }
        return admitted;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async listMetadata() {
      const operation = "list_metadata" as const;
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationMetadataObjectStoreNameV1,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        const rows = await requestResultV1(
          transaction.objectStore(programPackageInstallationMetadataObjectStoreNameV1).getAll(),
        );
        await completion;
        return rows
          .map((row) => restoreStoredPackageMetadataV1(row, options))
          .toSorted((left, right) =>
            left.reference.programId.localeCompare(right.reference.programId) ||
            left.reference.packageVersion.localeCompare(right.reference.packageVersion) ||
            left.reference.contentDigest.localeCompare(right.reference.contentDigest)
          );
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async current(programIdValue: string) {
      const operation = "current" as const;
      const programId = admitProgramPackageProgramIdV1(programIdValue);
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationCurrentObjectStoreNameV1,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        const value = await requestResultV1(
          transaction.objectStore(programPackageInstallationCurrentObjectStoreNameV1).get(
            programId,
          ),
        );
        await completion;
        return value === undefined ? null : exactCurrentReferenceV1(value, programId);
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async remove(referenceValue: InstalledProgramPackageReferenceV1) {
      const operation = "remove" as const;
      const reference = admitInstalledProgramPackageReferenceV1(referenceValue);
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNamesV1,
          "readwrite",
        );
        const completion = transactionCompletionV1(transaction);
        const store = transaction.objectStore(programPackageInstallationObjectStoreNameV1);
        const key = storageKeyV1(reference);
        const existingKey = await requestResultV1(store.getKey(key));
        if (existingKey !== undefined) await requestResultV1(store.delete(key));
        if (existingKey !== undefined) {
          await requestResultV1(
            transaction.objectStore(programPackageInstallationMetadataObjectStoreNameV1).delete(
              key,
            ),
          );
        }
        const currentStore = transaction.objectStore(
          programPackageInstallationCurrentObjectStoreNameV1,
        );
        const currentValue = await requestResultV1(currentStore.get(reference.programId));
        if (
          currentValue !== undefined &&
          referencesEqualV1(
            exactCurrentReferenceV1(currentValue, reference.programId),
            reference,
          )
        ) {
          await requestResultV1(currentStore.delete(reference.programId));
        }
        await completion;
        return existingKey !== undefined;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async reset(): Promise<void> {
      const operation = "reset" as const;
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNamesV1,
          "readwrite",
        );
        const completion = transactionCompletionV1(transaction);
        await Promise.all(
          programPackageInstallationObjectStoreNamesV1.map((storeName) =>
            requestResultV1(transaction.objectStore(storeName).clear())
          ),
        );
        await completion;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      try {
        if (database !== null) database.close();
        else if (openPromise !== null) (await openPromise).database.close();
      } catch (error) {
        throw mapFailureV1(error, "dispose");
      } finally {
        database = null;
        openPromise = null;
      }
    },
  };
}
