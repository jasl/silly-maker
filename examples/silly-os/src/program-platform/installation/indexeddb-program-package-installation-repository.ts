// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitProgramPackageArchiveV1,
  admitProgramPackageManifestV1,
  admitProgramPackageProgramIdV1,
  cloneInstalledProgramPackageReferenceV1,
  cloneProgramPackageArchiveV1,
  cloneProgramPackageManifestV1,
  ProgramPackageAdmissionErrorV1,
  type AdmittedProgramPackageArchiveV1,
  type ProgramPackageAdmissionLimitsV1,
  type ProgramPackageArchiveV1,
  type ProgramPackageManifestV1,
} from "../package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../package/program-runtime-profile-descriptor.ts";
import type { ProgramPackageMetadataV1 } from "../package/program-runtime-profile-descriptor.ts";
import {
  ProgramPackageInstallationRepositoryErrorV1,
  type InstalledProgramPackageMetadataV1,
  type InstalledProgramPackageV1,
  type ProgramPackageAcquisitionV1,
  type ProgramPackageInstallationRepositoryOperationV1,
  type ProgramPackageInstallationRepositoryV1,
} from "./program-package-installation-repository.ts";

export const programPackageInstallationDatabaseNameV1 =
  "sillymaker.example-silly-os.program-packages";
export const programPackageInstallationDatabaseVersionV1 = 4;
export const programPackageInstallationObjectStoreNameV1 = "packages";
export const programPackageInstallationMetadataObjectStoreNameV1 = "package_metadata";

const programPackageInstallationObjectStoreNamesV1 = [
  programPackageInstallationMetadataObjectStoreNameV1,
  programPackageInstallationObjectStoreNameV1,
] as const;

interface StoredProgramPackageV1 {
  readonly programId: string;
  readonly schemaVersion: 1;
  readonly acquisition: ProgramPackageAcquisitionV1;
  readonly installationId: string;
  readonly archive: ProgramPackageArchiveV1;
}

interface StoredProgramPackageMetadataV1 {
  readonly programId: string;
  readonly schemaVersion: 1;
  readonly acquisition: ProgramPackageAcquisitionV1;
  readonly installationId: string;
  readonly manifest: ProgramPackageManifestV1;
  readonly initialUiSurfaceId: string | null;
}

export interface CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly limits: ProgramPackageAdmissionLimitsV1;
  readonly databaseName?: string;
}

function exactKeysV1(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  return Object.keys(value).toSorted().join("\0") === expected.toSorted().join("\0");
}

function acquisitionV1(value: unknown): value is ProgramPackageAcquisitionV1 {
  return value === "bundled" || value === "external";
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
          throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", "initialize");
        }
        for (const name of [...request.result.objectStoreNames]) {
          request.result.deleteObjectStore(name);
        }
        disposition = "created";
        request.result.createObjectStore(programPackageInstallationObjectStoreNameV1, {
          keyPath: "programId",
        });
        request.result.createObjectStore(programPackageInstallationMetadataObjectStoreNameV1, {
          keyPath: "programId",
        });
      } catch (error) {
        upgradeFailure = error;
        try {
          request.transaction?.abort();
        } catch {
          // Preserve the upgrade failure.
        }
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnceV1(
        new ProgramPackageInstallationRepositoryErrorV1("storage_unavailable", "initialize"),
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
  return exactKeysV1(record, [
    "acquisition",
    "archive",
    "installationId",
    "programId",
    "schemaVersion",
  ]) &&
    record.schemaVersion === 1 &&
    acquisitionV1(record.acquisition) &&
    typeof record.installationId === "string" && record.installationId.length > 0 &&
    typeof record.programId === "string";
}

async function restoreStoredPackageV1(
  value: unknown,
  options: Pick<CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1, "limits">,
  operation: ProgramPackageInstallationRepositoryOperationV1,
): Promise<InstalledProgramPackageV1> {
  try {
    if (!exactStoredPackageShapeV1(value)) throw new TypeError();
    const programId = admitProgramPackageProgramIdV1(value.programId);
    const admitted = await admitProgramPackageArchiveV1(value.archive, options);
    if (admitted.reference.programId !== programId) throw new TypeError();
    return {
      acquisition: value.acquisition,
      installationId: value.installationId,
      package: admitted,
    };
  } catch (error) {
    if (error instanceof ProgramPackageInstallationRepositoryErrorV1) throw error;
    throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
  }
}

function storedPackageV1(
  admitted: AdmittedProgramPackageArchiveV1,
  acquisition: ProgramPackageAcquisitionV1,
  installationId: string,
): StoredProgramPackageV1 {
  return {
    programId: admitted.reference.programId,
    schemaVersion: 1,
    acquisition,
    installationId,
    archive: cloneProgramPackageArchiveV1(admitted),
  };
}

function storedPackageMetadataV1(
  admitted: AdmittedProgramPackageArchiveV1,
  acquisition: ProgramPackageAcquisitionV1,
  installationId: string,
): StoredProgramPackageMetadataV1 {
  const projection = projectProgramPackageRuntimeProfileV1(admitted);
  return {
    programId: admitted.reference.programId,
    schemaVersion: 1,
    acquisition,
    installationId,
    manifest: cloneProgramPackageManifestV1(admitted.manifest),
    initialUiSurfaceId: projection.initialUiSurfaceId,
  };
}

function equalBytesV1(left: ArrayBuffer, right: ArrayBuffer): boolean {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  for (let index = 0; index < leftBytes.length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) return false;
  }
  return true;
}

/**
 * Cold-path equality over already admitted package data. This keeps repeated
 * materialization of the same implementation idempotent without promoting a
 * digest or byte count into Program identity.
 */
function equalAdmittedProgramPackageArchiveV1(
  left: AdmittedProgramPackageArchiveV1,
  right: AdmittedProgramPackageArchiveV1,
): boolean {
  if (JSON.stringify(left.manifest) !== JSON.stringify(right.manifest)) return false;
  if (left.files.length !== right.files.length) return false;
  return left.files.every((leftFile, index) => {
    const rightFile = right.files[index];
    return rightFile !== undefined &&
      leftFile.path === rightFile.path &&
      leftFile.mediaType === rightFile.mediaType &&
      equalBytesV1(leftFile.bytes, rightFile.bytes);
  });
}

function restoreStoredPackageMetadataV1(
  value: unknown,
  options: Pick<CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1, "limits">,
): InstalledProgramPackageMetadataV1 {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    const record = value as Readonly<Record<string, unknown>>;
    if (
      !exactKeysV1(record, [
        "acquisition",
        "initialUiSurfaceId",
        "installationId",
        "manifest",
        "programId",
        "schemaVersion",
      ]) ||
      record.schemaVersion !== 1 ||
      !acquisitionV1(record.acquisition) ||
      typeof record.installationId !== "string" ||
      record.installationId.length === 0 ||
      (record.initialUiSurfaceId !== null &&
        (typeof record.initialUiSurfaceId !== "string" ||
          (record.initialUiSurfaceId.length > 0 &&
            record.initialUiSurfaceId.trim() !== record.initialUiSurfaceId)))
    ) throw new TypeError();
    const programId = admitProgramPackageProgramIdV1(record.programId);
    const manifest = admitProgramPackageManifestV1(record.manifest, options.limits);
    if (
      programId !== manifest.programId ||
      (manifest.initialUiPath === null) !== (record.initialUiSurfaceId === null)
    ) throw new TypeError();
    const metadata: ProgramPackageMetadataV1 = {
      reference: { programId, packageVersion: manifest.packageVersion },
      manifest,
      initialUiSurfaceId: record.initialUiSurfaceId,
    };
    return {
      acquisition: record.acquisition,
      installationId: record.installationId,
      metadata,
    };
  } catch {
    throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", "list_metadata");
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
    async install(archive, installOptions) {
      const operation = "install" as const;
      if (!acquisitionV1(installOptions.acquisition)) {
        throw new TypeError("sillyos.program_package.acquisition_invalid");
      }
      const admitted = await admitProgramPackageArchiveV1(archive, { limits: options.limits });
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNamesV1,
          "readwrite",
        );
        const completion = transactionCompletionV1(transaction);
        const packages = transaction.objectStore(programPackageInstallationObjectStoreNameV1);
        const existing = await requestResultV1(packages.get(admitted.reference.programId));
        if (existing !== undefined) {
          if (!exactStoredPackageShapeV1(existing)) {
            throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
          }
          const current = await restoreStoredPackageV1(existing, options, operation);
          if (installOptions.acquisition === "bundled" && existing.acquisition === "external") {
            await completion;
            return {
              disposition: "retained_external",
              reference: cloneInstalledProgramPackageReferenceV1(current.package.reference),
            };
          }
          if (
            existing.acquisition === installOptions.acquisition &&
            equalAdmittedProgramPackageArchiveV1(current.package, admitted)
          ) {
            await completion;
            return {
              disposition: "retained_current",
              reference: cloneInstalledProgramPackageReferenceV1(current.package.reference),
            };
          }
        }
        const installationId = globalThis.crypto.randomUUID();
        await requestResultV1(
          packages.put(storedPackageV1(admitted, installOptions.acquisition, installationId)),
        );
        await requestResultV1(
          transaction.objectStore(programPackageInstallationMetadataObjectStoreNameV1).put(
            storedPackageMetadataV1(
              admitted,
              installOptions.acquisition,
              installationId,
            ),
          ),
        );
        await completion;
        return {
          disposition: existing === undefined ? "installed" : "replaced",
          reference: cloneInstalledProgramPackageReferenceV1(admitted.reference),
        };
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async load(programIdValue) {
      const operation = "load" as const;
      const programId = admitProgramPackageProgramIdV1(programIdValue);
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNameV1,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        const value = await requestResultV1(
          transaction.objectStore(programPackageInstallationObjectStoreNameV1).get(programId),
        );
        await completion;
        if (value === undefined) return null;
        const installed = await restoreStoredPackageV1(value, options, operation);
        if (installed.package.reference.programId !== programId) {
          throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
        }
        return installed;
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
            left.metadata.reference.programId.localeCompare(right.metadata.reference.programId)
          );
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async remove(programIdValue, removeOptions = {}) {
      const operation = "remove" as const;
      const programId = admitProgramPackageProgramIdV1(programIdValue);
      if (
        removeOptions.ifAcquisition !== undefined &&
        !acquisitionV1(removeOptions.ifAcquisition)
      ) {
        throw new TypeError("sillyos.program_package.acquisition_invalid");
      }
      if (
        removeOptions.ifInstallationId !== undefined &&
        (typeof removeOptions.ifInstallationId !== "string" ||
          removeOptions.ifInstallationId.length === 0)
      ) {
        throw new TypeError("sillyos.program_package.installation_id_invalid");
      }
      try {
        const currentDatabase = await databaseForV1(operation);
        const transaction = currentDatabase.transaction(
          programPackageInstallationObjectStoreNamesV1,
          "readwrite",
        );
        const completion = transactionCompletionV1(transaction);
        const packages = transaction.objectStore(programPackageInstallationObjectStoreNameV1);
        const metadataStore = transaction.objectStore(
          programPackageInstallationMetadataObjectStoreNameV1,
        );
        const [existingKey, storedMetadata] = await Promise.all([
          requestResultV1(packages.getKey(programId)),
          requestResultV1(metadataStore.get(programId)),
        ]);
        if (existingKey === undefined && storedMetadata === undefined) {
          await completion;
          return false;
        }
        if (existingKey === undefined || storedMetadata === undefined) {
          throw new ProgramPackageInstallationRepositoryErrorV1("schema_invalid", operation);
        }
        const existing = restoreStoredPackageMetadataV1(storedMetadata, options);
        if (
          (removeOptions.ifAcquisition !== undefined &&
            existing.acquisition !== removeOptions.ifAcquisition) ||
          (removeOptions.ifInstallationId !== undefined &&
            existing.installationId !== removeOptions.ifInstallationId)
        ) {
          await completion;
          return false;
        }
        await requestResultV1(packages.delete(programId));
        await requestResultV1(metadataStore.delete(programId));
        await completion;
        return true;
      } catch (error) {
        throw mapFailureV1(error, operation);
      }
    },
    async reset() {
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
    async dispose() {
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
