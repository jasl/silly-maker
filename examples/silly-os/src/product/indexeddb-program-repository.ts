// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitProgramRepositoryAggregateV2,
  advanceBrowserProgramContinuationV1,
  applyProgramRepositoryAgentRunTerminalV2,
  applyProgramRepositoryDecisionV2,
  applyProgramRepositoryRevisionV2,
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  buildProgramRepositoryCreateV2,
  cloneBrowserProgramContinuationManifestV1,
  cloneProgramRepositoryAggregateV2,
  createProgramRepositoryFailureV2,
  isProgramRepositoryFailureV2,
  normalizeProgramRepositoryApplyRevisionInputV2,
  normalizeProgramRepositoryCreateInputV2,
  normalizeProgramRepositoryDecideInputV2,
  normalizeProgramRepositorySettleAgentRunInputV2,
  normalizeProgramRepositoryProgramIdV2,
  normalizeProgramRepositoryWorkspaceContinuationInsertV1,
  programRepositoryMaximumProgramsV2,
  programRepositoryAggregatesEqualV2,
  sortProgramRepositorySummariesV2,
  summarizeProgramRepositoryAggregateV2,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV2,
  type ProgramRepositoryFailureCodeV2,
  type ProgramRepositoryOperationV2,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";

export const programRepositoryDatabaseNameV3 = "sillymaker.example-silly-os.programs";
export const programRepositoryDatabaseVersionV3 = 3;
export const programRepositoryProgramObjectStoreNameV3 = "programs";
export const programRepositoryWorkspaceContinuationObjectStoreNameV3 = "workspace_continuations";

const programRepositoryMutationObjectStoreNamesV3 = [
  programRepositoryProgramObjectStoreNameV3,
  programRepositoryWorkspaceContinuationObjectStoreNameV3,
] as const;

export interface CreateIndexedDbProgramRepositoryOptionsV3 {
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
      database.version !== programRepositoryDatabaseVersionV3 ||
      domStringListValuesV1(database.objectStoreNames).join("\0") !==
        [
          programRepositoryProgramObjectStoreNameV3,
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        ].join("\0")
    ) return false;
    const transaction = database.transaction(
      [
        programRepositoryProgramObjectStoreNameV3,
        programRepositoryWorkspaceContinuationObjectStoreNameV3,
      ],
      "readonly",
    );
    const programs = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
    const continuations = transaction.objectStore(
      programRepositoryWorkspaceContinuationObjectStoreNameV3,
    );
    return programs.keyPath === "programId" && !programs.autoIncrement &&
      programs.indexNames.length === 0 && continuations.keyPath === "programId" &&
      !continuations.autoIncrement && continuations.indexNames.length === 0;
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
      request = input.indexedDB.open(input.databaseName, programRepositoryDatabaseVersionV3);
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
          (event.oldVersion !== 0 && event.oldVersion !== 2) ||
          event.newVersion !== programRepositoryDatabaseVersionV3
        ) {
          throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
        }
        if (event.oldVersion === 0) {
          if (
            domStringListValuesV1(request.result.objectStoreNames).length !== 0
          ) throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
          request.result.createObjectStore(programRepositoryProgramObjectStoreNameV3, {
            keyPath: "programId",
            autoIncrement: false,
          });
        } else {
          if (
            domStringListValuesV1(request.result.objectStoreNames).join("\0") !==
              programRepositoryProgramObjectStoreNameV3
          ) throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
          const programs = request.transaction?.objectStore(
            programRepositoryProgramObjectStoreNameV3,
          );
          if (
            programs === undefined || programs.keyPath !== "programId" ||
            programs.autoIncrement || programs.indexNames.length !== 0
          ) throw createProgramRepositoryFailureV2("schema_invalid", input.operation);
        }
        request.result.createObjectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
          {
            keyPath: "programId",
            autoIncrement: false,
          },
        );
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

function storedWorkspaceContinuationV1(
  value: unknown,
  aggregate: ProgramRepositoryAggregateV2 | undefined,
  operation: ProgramRepositoryOperationV2,
): BrowserProgramContinuationManifestV1 {
  let continuation: BrowserProgramContinuationManifestV1;
  try {
    continuation = cloneBrowserProgramContinuationManifestV1(
      value as BrowserProgramContinuationManifestV1,
    );
  } catch {
    throw createProgramRepositoryFailureV2("schema_invalid", operation);
  }
  if (
    aggregate === undefined ||
    !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
  ) throw createProgramRepositoryFailureV2("schema_invalid", operation);
  return continuation;
}

async function advanceStoredWorkspaceContinuationV1(input: {
  readonly store: IDBObjectStore;
  readonly current: ProgramRepositoryAggregateV2;
  readonly next: ProgramRepositoryAggregateV2;
  readonly operation: ProgramRepositoryOperationV2;
}): Promise<void> {
  const row = await requestResultV1(input.store.get(input.current.programId));
  if (row === undefined) return;
  const current = storedWorkspaceContinuationV1(row, input.current, input.operation);
  const next = advanceBrowserProgramContinuationV1(current, input.next);
  await requestResultV1(input.store.put(cloneBrowserProgramContinuationManifestV1(next)));
}

/**
 * Worker-side P2 adapter. Page code must use the typed Worker port instead of this owner.
 */
export function createIndexedDbProgramRepositoryV3(
  options: CreateIndexedDbProgramRepositoryOptionsV3,
): ProgramRepositoryWithWorkspaceContinuationV1 {
  const databaseName = options.databaseName ?? programRepositoryDatabaseNameV3;
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
        const transaction = database.transaction(
          programRepositoryProgramObjectStoreNameV3,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const rows = await requestResultV1(
          transaction.objectStore(programRepositoryProgramObjectStoreNameV3).getAll(),
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
        const transaction = database.transaction(
          programRepositoryProgramObjectStoreNameV3,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const row = await requestResultV1(
          transaction.objectStore(programRepositoryProgramObjectStoreNameV3).get(programId),
        );
        await completion;
        return row === undefined ? null : storedAggregateV1(row, "load");
      } catch (error) {
        throw mapFailureV1(error, "load");
      }
    },

    async loadWorkspaceContinuation(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV2(rawProgramId);
      try {
        const database = await getDatabaseV1("load_workspace_continuation");
        const transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programRow = await requestResultV1(
          transaction.objectStore(programRepositoryProgramObjectStoreNameV3).get(programId),
        );
        const continuationRow = await requestResultV1(
          transaction.objectStore(programRepositoryWorkspaceContinuationObjectStoreNameV3).get(
            programId,
          ),
        );
        const aggregate = programRow === undefined
          ? undefined
          : storedAggregateV1(programRow, "load_workspace_continuation");
        const continuation = continuationRow === undefined ? null : storedWorkspaceContinuationV1(
          continuationRow,
          aggregate,
          "load_workspace_continuation",
        );
        await completion;
        return continuation;
      } catch (error) {
        throw mapFailureV1(error, "load_workspace_continuation");
      }
    },

    async create(rawInput) {
      const input = normalizeProgramRepositoryCreateInputV2(rawInput);
      const candidate = buildProgramRepositoryCreateV2(input);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("create");
        transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readwrite",
        );
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const store = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        );
        const currentRow = await requestResultV1(store.get(candidate.programId));
        const continuationRow = await requestResultV1(continuationStore.get(candidate.programId));
        const current = currentRow === undefined
          ? undefined
          : storedAggregateV1(currentRow, "create");
        if (continuationRow !== undefined) {
          storedWorkspaceContinuationV1(continuationRow, current, "create");
        }
        if (currentRow !== undefined) {
          if (current === undefined) throw new TypeError("invalid current Program aggregate");
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
        transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readwrite",
        );
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programStore = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        );
        const currentRow = await requestResultV1(programStore.get(input.programId));
        const continuationRow = await requestResultV1(continuationStore.get(input.programId));
        if (currentRow === undefined) {
          if (continuationRow !== undefined) {
            storedWorkspaceContinuationV1(continuationRow, undefined, "apply_revision");
          }
          await completion;
          return { kind: "conflict", current: null };
        }
        const current = storedAggregateV1(currentRow, "apply_revision");
        if (continuationRow !== undefined) {
          storedWorkspaceContinuationV1(continuationRow, current, "apply_revision");
        }
        const result = applyProgramRepositoryRevisionV2(
          current,
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await advanceStoredWorkspaceContinuationV1({
          store: continuationStore,
          current,
          next: result.aggregate,
          operation: "apply_revision",
        });
        await requestResultV1(
          programStore.put(cloneProgramRepositoryAggregateV2(result.aggregate)),
        );
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
        transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readwrite",
        );
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programStore = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        );
        const currentRow = await requestResultV1(programStore.get(input.programId));
        const continuationRow = await requestResultV1(continuationStore.get(input.programId));
        if (currentRow === undefined) {
          if (continuationRow !== undefined) {
            storedWorkspaceContinuationV1(continuationRow, undefined, "decide");
          }
          await completion;
          return { kind: "conflict", current: null };
        }
        const current = storedAggregateV1(currentRow, "decide");
        if (continuationRow !== undefined) {
          storedWorkspaceContinuationV1(continuationRow, current, "decide");
        }
        const result = applyProgramRepositoryDecisionV2(
          current,
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await advanceStoredWorkspaceContinuationV1({
          store: continuationStore,
          current,
          next: result.aggregate,
          operation: "decide",
        });
        await requestResultV1(
          programStore.put(cloneProgramRepositoryAggregateV2(result.aggregate)),
        );
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
        transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readwrite",
        );
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programStore = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        );
        const currentRow = await requestResultV1(programStore.get(input.programId));
        const continuationRow = await requestResultV1(continuationStore.get(input.programId));
        if (currentRow === undefined) {
          if (continuationRow !== undefined) {
            storedWorkspaceContinuationV1(continuationRow, undefined, "settle_agent_run");
          }
          await completion;
          return { kind: "conflict", current: null };
        }
        const current = storedAggregateV1(currentRow, "settle_agent_run");
        if (continuationRow !== undefined) {
          storedWorkspaceContinuationV1(continuationRow, current, "settle_agent_run");
        }
        const result = applyProgramRepositoryAgentRunTerminalV2(
          current,
          input,
        );
        if (result.kind !== "committed") {
          await completion;
          return result;
        }
        await advanceStoredWorkspaceContinuationV1({
          store: continuationStore,
          current,
          next: result.aggregate,
          operation: "settle_agent_run",
        });
        await requestResultV1(
          programStore.put(cloneProgramRepositoryAggregateV2(result.aggregate)),
        );
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

    async insertWorkspaceContinuation(rawContinuation) {
      const continuation = normalizeProgramRepositoryWorkspaceContinuationInsertV1(
        rawContinuation,
      );
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("insert_workspace_continuation");
        transaction = database.transaction(
          programRepositoryMutationObjectStoreNamesV3,
          "readwrite",
        );
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programStore = transaction.objectStore(programRepositoryProgramObjectStoreNameV3);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV3,
        );
        const programRow = await requestResultV1(
          programStore.get(continuation.programId),
        );
        const continuationRow = await requestResultV1(
          continuationStore.get(continuation.programId),
        );
        const aggregate = programRow === undefined
          ? undefined
          : storedAggregateV1(programRow, "insert_workspace_continuation");
        const current = continuationRow === undefined ? null : storedWorkspaceContinuationV1(
          continuationRow,
          aggregate,
          "insert_workspace_continuation",
        );
        if (
          aggregate === undefined ||
          !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
        ) {
          await completion;
          return { kind: "conflict", current };
        }
        if (
          current !== null &&
          browserProgramContinuationManifestsEqualV1(current, continuation)
        ) {
          await completion;
          return { kind: "unchanged", continuation: current };
        }
        if (current !== null) {
          await completion;
          return { kind: "conflict", current };
        }
        const inserted = cloneBrowserProgramContinuationManifestV1(continuation);
        await requestResultV1(continuationStore.add(inserted));
        await completion;
        return {
          kind: "committed",
          continuation: cloneBrowserProgramContinuationManifestV1(inserted),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "insert_workspace_continuation");
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
