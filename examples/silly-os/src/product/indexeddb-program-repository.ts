// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitProgramRepositoryAggregateV1,
  applyProgramRepositoryDecisionV1,
  applyProgramRepositoryRevisionV1,
  buildProgramRepositoryCreateV1,
  cloneProgramRepositoryAggregateV1,
  createProgramRepositoryFailureV1,
  isProgramRepositoryFailureV1,
  normalizeProgramRepositoryApplyRevisionInputV1,
  normalizeProgramRepositoryCreateInputV1,
  normalizeProgramRepositoryDecideInputV1,
  normalizeProgramRepositoryProgramIdV1,
  programRepositoryMaximumProgramsV1,
  programRepositoryAggregatesEqualV1,
  sortProgramRepositorySummariesV1,
  summarizeProgramRepositoryAggregateV1,
  type ProgramRepositoryAggregateV1,
  type ProgramRepositoryFailureCodeV1,
  type ProgramRepositoryOperationV1,
  type ProgramRepositoryV1,
} from "./program-repository.ts";

export const programRepositoryDatabaseNameV1 = "sillymaker.example-silly-os.programs";
export const programRepositoryDatabaseVersionV1 = 1;
export const programRepositoryObjectStoreNameV1 = "programs";

export interface CreateIndexedDbProgramRepositoryOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly databaseName?: string;
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
  operation: ProgramRepositoryOperationV1,
): unknown {
  if (isProgramRepositoryFailureV1(value) || value instanceof TypeError) return value;
  const name = domExceptionNameV1(value);
  let code: ProgramRepositoryFailureCodeV1;
  if (name === "VersionError") code = "database_newer";
  else if (name === "SecurityError" || name === "NotAllowedError") code = "unavailable";
  else if (name === "QuotaExceededError") code = "quota_exceeded";
  else if (name === "AbortError") code = "transaction_aborted";
  else code = "request_failed";
  return createProgramRepositoryFailureV1(code, operation);
}

function requestResultV1<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    const removeListenersV1 = () => {
      request.removeEventListener("success", onSuccessV1);
      request.removeEventListener("error", onErrorV1);
    };
    const onSuccessV1 = () => {
      removeListenersV1();
      resolve(request.result);
    };
    const onErrorV1 = () => {
      removeListenersV1();
      reject(request.error ?? new DOMException("IndexedDB request failed", "UnknownError"));
    };
    request.addEventListener("success", onSuccessV1);
    request.addEventListener("error", onErrorV1);
  });
}

function transactionCompletionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const removeListenersV1 = () => {
      transaction.removeEventListener("complete", onCompleteV1);
      transaction.removeEventListener("abort", onFailureV1);
      transaction.removeEventListener("error", onFailureV1);
    };
    const onCompleteV1 = () => {
      removeListenersV1();
      resolve();
    };
    const onFailureV1 = () => {
      removeListenersV1();
      reject(
        transaction.error ?? new DOMException("IndexedDB transaction aborted", "AbortError"),
      );
    };
    transaction.addEventListener("complete", onCompleteV1);
    transaction.addEventListener("abort", onFailureV1);
    transaction.addEventListener("error", onFailureV1);
  });
}

function domStringListValuesV1(value: DOMStringList): readonly string[] {
  const values: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value.item(index);
    if (entry === null) throw new TypeError("invalid DOMStringList");
    values.push(entry);
  }
  return values;
}

function hasExactSchemaV1(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== programRepositoryDatabaseVersionV1 ||
      domStringListValuesV1(database.objectStoreNames).join("\0") !==
        programRepositoryObjectStoreNameV1
    ) return false;
    const transaction = database.transaction(programRepositoryObjectStoreNameV1, "readonly");
    const objectStore = transaction.objectStore(programRepositoryObjectStoreNameV1);
    return objectStore.keyPath === "programId" && !objectStore.autoIncrement &&
      objectStore.indexNames.length === 0;
  } catch {
    return false;
  }
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly operation: ProgramRepositoryOperationV1;
  readonly onConnectionClosed: () => void;
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, programRepositoryDatabaseVersionV1);
    } catch (error) {
      reject(mapFailureV1(error, input.operation));
      return;
    }
    let settled = false;
    let upgradeFailure: unknown;
    const rejectOnceV1 = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(mapFailureV1(error, input.operation));
    };
    request.addEventListener("upgradeneeded", (event) => {
      try {
        if (
          event.oldVersion !== 0 || event.newVersion !== programRepositoryDatabaseVersionV1
        ) {
          throw createProgramRepositoryFailureV1("schema_invalid", input.operation);
        }
        request.result.createObjectStore(programRepositoryObjectStoreNameV1, {
          keyPath: "programId",
          autoIncrement: false,
        });
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
      rejectOnceV1(createProgramRepositoryFailureV1("upgrade_blocked", input.operation));
    });
    request.addEventListener("error", () => {
      rejectOnceV1(
        upgradeFailure ?? request.error ??
          new DOMException("IndexedDB open request failed", "UnknownError"),
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
        rejectOnceV1(createProgramRepositoryFailureV1("schema_invalid", input.operation));
        return;
      }
      settled = true;
      database.addEventListener("versionchange", () => {
        database.close();
        input.onConnectionClosed();
      });
      database.addEventListener("close", input.onConnectionClosed);
      resolve(database);
    });
  });
}

function storedAggregateV1(
  value: unknown,
  operation: ProgramRepositoryOperationV1,
): ProgramRepositoryAggregateV1 {
  const admitted = admitProgramRepositoryAggregateV1(value);
  if (admitted.kind === "rejected") {
    throw createProgramRepositoryFailureV1("schema_invalid", operation);
  }
  return admitted.value;
}

/**
 * Worker-side P2-B0 adapter. Page code must use the typed Worker port instead of this owner.
 */
export function createIndexedDbProgramRepositoryV1(
  options: CreateIndexedDbProgramRepositoryOptionsV1,
): ProgramRepositoryV1 {
  const databaseName = options.databaseName ?? programRepositoryDatabaseNameV1;
  let databasePromise: Promise<IDBDatabase> | undefined;
  let disposed = false;

  const getDatabaseV1 = (operation: ProgramRepositoryOperationV1): Promise<IDBDatabase> => {
    if (disposed) return Promise.reject(createProgramRepositoryFailureV1("disposed", operation));
    const indexedDB = options.indexedDB as IDBFactory | undefined;
    if (indexedDB === undefined || typeof indexedDB.open !== "function") {
      return Promise.reject(createProgramRepositoryFailureV1("unavailable", operation));
    }
    if (databasePromise === undefined) {
      let cached: Promise<IDBDatabase>;
      const pending = openDatabaseV1({
        indexedDB,
        databaseName,
        operation,
        onConnectionClosed: () => {
          if (databasePromise === cached) databasePromise = undefined;
        },
      });
      cached = pending.catch((error: unknown) => {
        if (databasePromise === cached) databasePromise = undefined;
        throw error;
      });
      databasePromise = cached;
    }
    return databasePromise;
  };

  const abortAfterFailureV1 = async (
    transaction: IDBTransaction | undefined,
    completion: Promise<void> | undefined,
  ): Promise<void> => {
    if (transaction === undefined) return;
    try {
      transaction.abort();
    } catch {
      // The initiating failure remains authoritative.
    }
    await completion?.catch(() => undefined);
  };

  return {
    async initialize(): Promise<void> {
      try {
        await getDatabaseV1("initialize");
      } catch (error) {
        throw mapFailureV1(error, "initialize");
      }
    },

    async list() {
      try {
        const database = await getDatabaseV1("list");
        const transaction = database.transaction(programRepositoryObjectStoreNameV1, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const rows = await requestResultV1(
          transaction.objectStore(programRepositoryObjectStoreNameV1).getAll(),
        );
        await completion;
        return sortProgramRepositorySummariesV1(
          rows.map((row) => summarizeProgramRepositoryAggregateV1(storedAggregateV1(row, "list"))),
        );
      } catch (error) {
        throw mapFailureV1(error, "list");
      }
    },

    async load(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV1(rawProgramId);
      try {
        const database = await getDatabaseV1("load");
        const transaction = database.transaction(programRepositoryObjectStoreNameV1, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const row = await requestResultV1(
          transaction.objectStore(programRepositoryObjectStoreNameV1).get(programId),
        );
        await completion;
        return row === undefined ? null : storedAggregateV1(row, "load");
      } catch (error) {
        throw mapFailureV1(error, "load");
      }
    },

    async create(rawInput) {
      const input = normalizeProgramRepositoryCreateInputV1(rawInput);
      const candidate = buildProgramRepositoryCreateV1(input);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("create");
        transaction = database.transaction(programRepositoryObjectStoreNameV1, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV1);
        const currentRow = await requestResultV1(store.get(candidate.programId));
        if (currentRow !== undefined) {
          const current = storedAggregateV1(currentRow, "create");
          await completion;
          if (programRepositoryAggregatesEqualV1(current, candidate)) {
            return { kind: "unchanged", aggregate: current };
          }
          return { kind: "conflict", current };
        }
        const programCount = await requestResultV1(store.count());
        if (programCount >= programRepositoryMaximumProgramsV1) {
          transaction.abort();
          await completion.catch(() => undefined);
          throw createProgramRepositoryFailureV1("quota_exceeded", "create");
        }
        await requestResultV1(store.add(cloneProgramRepositoryAggregateV1(candidate)));
        await completion;
        return { kind: "committed", aggregate: cloneProgramRepositoryAggregateV1(candidate) };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "create");
      }
    },

    async applyRevision(rawInput) {
      const input = normalizeProgramRepositoryApplyRevisionInputV1(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("apply_revision");
        transaction = database.transaction(programRepositoryObjectStoreNameV1, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV1);
        const currentRow = await requestResultV1(store.get(input.programId));
        if (currentRow === undefined) {
          await completion;
          return { kind: "conflict", current: null };
        }
        const result = applyProgramRepositoryRevisionV1(
          storedAggregateV1(currentRow, "apply_revision"),
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await requestResultV1(store.put(cloneProgramRepositoryAggregateV1(result.aggregate)));
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV1(result.aggregate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "apply_revision");
      }
    },

    async decide(rawInput) {
      const input = normalizeProgramRepositoryDecideInputV1(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("decide");
        transaction = database.transaction(programRepositoryObjectStoreNameV1, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV1);
        const currentRow = await requestResultV1(store.get(input.programId));
        if (currentRow === undefined) {
          await completion;
          return { kind: "conflict", current: null };
        }
        const result = applyProgramRepositoryDecisionV1(
          storedAggregateV1(currentRow, "decide"),
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await requestResultV1(store.put(cloneProgramRepositoryAggregateV1(result.aggregate)));
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV1(result.aggregate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "decide");
      }
    },

    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      const current = databasePromise;
      databasePromise = undefined;
      if (current === undefined) return;
      try {
        const database = await current;
        database.close();
      } catch {
        // A failed open has no live resource to dispose.
      }
    },
  };
}
