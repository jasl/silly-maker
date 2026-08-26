// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitProgramRepositoryAggregateV2,
  applyProgramRepositoryAgentRunTerminalV2,
  applyProgramRepositoryDecisionV2,
  applyProgramRepositoryRevisionV2,
  buildProgramRepositoryCreateV2,
  cloneProgramRepositoryAggregateV2,
  createProgramRepositoryFailureV2,
  isProgramRepositoryFailureV2,
  normalizeProgramRepositoryApplyRevisionInputV2,
  normalizeProgramRepositoryCreateInputV2,
  normalizeProgramRepositoryDecideInputV2,
  normalizeProgramRepositorySettleAgentRunInputV2,
  normalizeProgramRepositoryProgramIdV2,
  programRepositoryMaximumProgramsV2,
  programRepositoryAggregatesEqualV2,
  sortProgramRepositorySummariesV2,
  summarizeProgramRepositoryAggregateV2,
  type ProgramRepositoryAggregateV2,
  type ProgramRepositoryFailureCodeV2,
  type ProgramRepositoryOperationV2,
  type ProgramRepositoryV2,
} from "./program-repository.ts";

export const programRepositoryDatabaseNameV2 = "sillymaker.example-silly-os.programs";
export const programRepositoryDatabaseVersionV2 = 2;
export const programRepositoryObjectStoreNameV2 = "programs";

export interface CreateIndexedDbProgramRepositoryOptionsV2 {
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
  operation: ProgramRepositoryOperationV2,
): unknown {
  if (isProgramRepositoryFailureV2(value) || value instanceof TypeError) return value;
  const name = domExceptionNameV1(value);
  let code: ProgramRepositoryFailureCodeV2;
  if (name === "VersionError") code = "database_newer";
  else if (name === "SecurityError" || name === "NotAllowedError") code = "unavailable";
  else if (name === "QuotaExceededError") code = "quota_exceeded";
  else if (name === "AbortError") code = "transaction_aborted";
  else code = "request_failed";
  return createProgramRepositoryFailureV2(code, operation);
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
      database.version !== programRepositoryDatabaseVersionV2 ||
      domStringListValuesV1(database.objectStoreNames).join("\0") !==
        programRepositoryObjectStoreNameV2
    ) return false;
    const transaction = database.transaction(programRepositoryObjectStoreNameV2, "readonly");
    const objectStore = transaction.objectStore(programRepositoryObjectStoreNameV2);
    return objectStore.keyPath === "programId" && !objectStore.autoIncrement &&
      objectStore.indexNames.length === 0;
  } catch {
    return false;
  }
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly operation: ProgramRepositoryOperationV2;
  readonly onConnectionClosed: () => void;
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, programRepositoryDatabaseVersionV2);
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
          (event.oldVersion !== 0 && event.oldVersion !== 1) ||
          event.newVersion !== programRepositoryDatabaseVersionV2
        ) {
          throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
        }
        if (event.oldVersion === 1) {
          if (
            domStringListValuesV1(request.result.objectStoreNames).join("\0") !==
              programRepositoryObjectStoreNameV2
          ) throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
          const oldStore = request.transaction?.objectStore(programRepositoryObjectStoreNameV2);
          if (
            oldStore === undefined || oldStore.keyPath !== "programId" ||
            oldStore.autoIncrement || oldStore.indexNames.length !== 0
          ) throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
          request.result.deleteObjectStore(programRepositoryObjectStoreNameV2);
        }
        request.result.createObjectStore(programRepositoryObjectStoreNameV2, {
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
      rejectOnceV1(createProgramRepositoryFailureV2("upgrade_blocked", input.operation));
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
        rejectOnceV1(createProgramRepositoryFailureV2("schema_invalid", input.operation));
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
  operation: ProgramRepositoryOperationV2,
): ProgramRepositoryAggregateV2 {
  const admitted = admitProgramRepositoryAggregateV2(value);
  if (admitted.kind === "rejected") {
    throw createProgramRepositoryFailureV2("schema_invalid", operation);
  }
  return admitted.value;
}

/**
 * Worker-side P2 adapter. Page code must use the typed Worker port instead of this owner.
 */
export function createIndexedDbProgramRepositoryV2(
  options: CreateIndexedDbProgramRepositoryOptionsV2,
): ProgramRepositoryV2 {
  const databaseName = options.databaseName ?? programRepositoryDatabaseNameV2;
  let databasePromise: Promise<IDBDatabase> | undefined;
  let disposed = false;

  const getDatabaseV1 = (operation: ProgramRepositoryOperationV2): Promise<IDBDatabase> => {
    if (disposed) return Promise.reject(createProgramRepositoryFailureV2("disposed", operation));
    const indexedDB = options.indexedDB as IDBFactory | undefined;
    if (indexedDB === undefined || typeof indexedDB.open !== "function") {
      return Promise.reject(createProgramRepositoryFailureV2("unavailable", operation));
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
        const transaction = database.transaction(programRepositoryObjectStoreNameV2, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const rows = await requestResultV1(
          transaction.objectStore(programRepositoryObjectStoreNameV2).getAll(),
        );
        await completion;
        return sortProgramRepositorySummariesV2(
          rows.map((row) => summarizeProgramRepositoryAggregateV2(storedAggregateV1(row, "list"))),
        );
      } catch (error) {
        throw mapFailureV1(error, "list");
      }
    },

    async load(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV2(rawProgramId);
      try {
        const database = await getDatabaseV1("load");
        const transaction = database.transaction(programRepositoryObjectStoreNameV2, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const row = await requestResultV1(
          transaction.objectStore(programRepositoryObjectStoreNameV2).get(programId),
        );
        await completion;
        return row === undefined ? null : storedAggregateV1(row, "load");
      } catch (error) {
        throw mapFailureV1(error, "load");
      }
    },

    async create(rawInput) {
      const input = normalizeProgramRepositoryCreateInputV2(rawInput);
      const candidate = buildProgramRepositoryCreateV2(input);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("create");
        transaction = database.transaction(programRepositoryObjectStoreNameV2, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV2);
        const currentRow = await requestResultV1(store.get(candidate.programId));
        if (currentRow !== undefined) {
          const current = storedAggregateV1(currentRow, "create");
          await completion;
          if (programRepositoryAggregatesEqualV2(current, candidate)) {
            return { kind: "unchanged", aggregate: current };
          }
          return { kind: "conflict", current };
        }
        const programCount = await requestResultV1(store.count());
        if (programCount >= programRepositoryMaximumProgramsV2) {
          transaction.abort();
          await completion.catch(() => undefined);
          throw createProgramRepositoryFailureV2("quota_exceeded", "create");
        }
        await requestResultV1(store.add(cloneProgramRepositoryAggregateV2(candidate)));
        await completion;
        return { kind: "committed", aggregate: cloneProgramRepositoryAggregateV2(candidate) };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "create");
      }
    },

    async applyRevision(rawInput) {
      const input = normalizeProgramRepositoryApplyRevisionInputV2(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("apply_revision");
        transaction = database.transaction(programRepositoryObjectStoreNameV2, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV2);
        const currentRow = await requestResultV1(store.get(input.programId));
        if (currentRow === undefined) {
          await completion;
          return { kind: "conflict", current: null };
        }
        const result = applyProgramRepositoryRevisionV2(
          storedAggregateV1(currentRow, "apply_revision"),
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await requestResultV1(store.put(cloneProgramRepositoryAggregateV2(result.aggregate)));
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV2(result.aggregate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "apply_revision");
      }
    },

    async decide(rawInput) {
      const input = normalizeProgramRepositoryDecideInputV2(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("decide");
        transaction = database.transaction(programRepositoryObjectStoreNameV2, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV2);
        const currentRow = await requestResultV1(store.get(input.programId));
        if (currentRow === undefined) {
          await completion;
          return { kind: "conflict", current: null };
        }
        const result = applyProgramRepositoryDecisionV2(
          storedAggregateV1(currentRow, "decide"),
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await requestResultV1(store.put(cloneProgramRepositoryAggregateV2(result.aggregate)));
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV2(result.aggregate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "decide");
      }
    },

    async settleAgentRun(rawInput) {
      const input = normalizeProgramRepositorySettleAgentRunInputV2(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("settle_agent_run");
        transaction = database.transaction(programRepositoryObjectStoreNameV2, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryObjectStoreNameV2);
        const currentRow = await requestResultV1(store.get(input.programId));
        if (currentRow === undefined) {
          await completion;
          return { kind: "conflict", current: null };
        }
        const result = applyProgramRepositoryAgentRunTerminalV2(
          storedAggregateV1(currentRow, "settle_agent_run"),
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await requestResultV1(store.put(cloneProgramRepositoryAggregateV2(result.aggregate)));
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV2(result.aggregate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "settle_agent_run");
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
