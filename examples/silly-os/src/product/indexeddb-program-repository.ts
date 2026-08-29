// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  advanceBrowserProgramContinuationV1,
  applyProgramRepositoryAgentRunTerminalV3,
  applyProgramRepositoryDecisionV3,
  applyProgramRepositoryRevisionV3,
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  browserProgramContinuationMatchesMutationPreStateV3,
  buildProgramRepositoryCreateV3,
  cloneBrowserProgramContinuationManifestV1,
  cloneProgramRepositoryAggregateV3,
  createProgramRepositoryFailureV3,
  isProgramRepositoryFailureV3,
  normalizeProgramRepositoryApplyRevisionInputV3,
  normalizeProgramRepositoryCreateInputV3,
  normalizeProgramRepositoryDecideInputV3,
  normalizeProgramRepositoryProgramIdV3,
  normalizeProgramRepositorySettleAgentRunInputV3,
  programRepositoryAggregatesEqualV3,
  programRepositoryMaximumProgramsV3,
  sortProgramRepositorySummariesV3,
  summarizeProgramRepositoryAggregateV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryCommitResultV3,
  type ProgramRepositoryFailureCodeV3,
  type ProgramRepositoryOperationV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";
import {
  applyProgramNetworkGrantMutationV1,
  cloneProgramNetworkGrantSetV1,
  createEmptyProgramNetworkGrantSetV1,
  normalizeProgramNetworkGrantMutationV1,
  type ProgramNetworkGrantSetV1,
} from "./program-network-grants.ts";

export const programRepositoryDatabaseNameV4 = "sillymaker.example-silly-os.programs";
export const programRepositoryDatabaseVersionV6 = 6;
export const programRepositoryProgramObjectStoreNameV4 = "programs";
export const programRepositoryWorkspaceContinuationObjectStoreNameV4 = "workspace_continuations";
export const programRepositoryNetworkGrantObjectStoreNameV1 = "program_network_grants";

const programRepositoryPairObjectStoreNamesV4 = [
  programRepositoryProgramObjectStoreNameV4,
  programRepositoryWorkspaceContinuationObjectStoreNameV4,
] as const;

const programRepositoryObjectStoreNamesV6 = [
  programRepositoryNetworkGrantObjectStoreNameV1,
  ...programRepositoryPairObjectStoreNamesV4,
] as const;

export interface CreateIndexedDbProgramRepositoryOptionsV4 {
  readonly indexedDB: IDBFactory;
  readonly databaseName?: string;
}

interface StoredProgramPairV1 {
  readonly aggregate: ProgramRepositoryAggregateV3;
  readonly continuation: BrowserProgramContinuationManifestV1;
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
  operation: ProgramRepositoryOperationV3,
): unknown {
  if (isProgramRepositoryFailureV3(value)) {
    return value.operation === operation
      ? value
      : createProgramRepositoryFailureV3(value.code, operation);
  }
  if (value instanceof TypeError) return value;
  const name = domExceptionNameV1(value);
  let code: ProgramRepositoryFailureCodeV3;
  if (name === "VersionError") code = "database_newer";
  else if (name === "SecurityError" || name === "NotAllowedError") code = "unavailable";
  else if (name === "QuotaExceededError") code = "quota_exceeded";
  else if (name === "AbortError") code = "transaction_aborted";
  else code = "request_failed";
  return createProgramRepositoryFailureV3(code, operation);
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

function hasExactProgramStoreShapeV1(store: IDBObjectStore): boolean {
  return store.keyPath === "programId" && !store.autoIncrement && store.indexNames.length === 0;
}

function hasExactStoreNamesV1(database: IDBDatabase, expected: readonly string[]): boolean {
  return domStringListValuesV1(database.objectStoreNames).join("\0") ===
    expected.join("\0");
}

function hasExactSchemaV1(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== programRepositoryDatabaseVersionV6 ||
      !hasExactStoreNamesV1(database, programRepositoryObjectStoreNamesV6)
    ) return false;
    const transaction = database.transaction(programRepositoryObjectStoreNamesV6, "readonly");
    return programRepositoryObjectStoreNamesV6.every((storeName) =>
      hasExactProgramStoreShapeV1(transaction.objectStore(storeName))
    );
  } catch {
    return false;
  }
}

function createStoresV1(database: IDBDatabase, storeNames: readonly string[]): void {
  for (const storeName of storeNames) {
    database.createObjectStore(storeName, {
      keyPath: "programId",
      autoIncrement: false,
    });
  }
}

function resetExactPhysicalV4V1(
  request: IDBOpenDBRequest,
  operation: ProgramRepositoryOperationV3,
): void {
  const database = request.result;
  const transaction = request.transaction;
  if (
    transaction === null ||
    !hasExactStoreNamesV1(database, programRepositoryPairObjectStoreNamesV4)
  ) {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
  for (const storeName of programRepositoryPairObjectStoreNamesV4) {
    if (!hasExactProgramStoreShapeV1(transaction.objectStore(storeName))) {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
  }
  // The preview schema has no migration obligation. Delete both exact stores without
  // opening a cursor or reading a row, then create the Product Repository V5 catalog directly.
  for (const storeName of programRepositoryPairObjectStoreNamesV4) {
    database.deleteObjectStore(storeName);
  }
  createStoresV1(database, programRepositoryObjectStoreNamesV6);
}

function upgradeExactPhysicalV5V1(
  request: IDBOpenDBRequest,
  operation: ProgramRepositoryOperationV3,
): void {
  const database = request.result;
  const transaction = request.transaction;
  if (
    transaction === null ||
    !hasExactStoreNamesV1(database, programRepositoryPairObjectStoreNamesV4)
  ) {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
  for (const storeName of programRepositoryPairObjectStoreNamesV4) {
    if (!hasExactProgramStoreShapeV1(transaction.objectStore(storeName))) {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
  }
  // V5 already owns the exact Program/continuation pair. Add the independent
  // non-secret grant store without reading, rewriting, or deleting either row.
  createStoresV1(database, [programRepositoryNetworkGrantObjectStoreNameV1]);
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly operation: ProgramRepositoryOperationV3;
  readonly onConnectionClosed: () => void;
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, programRepositoryDatabaseVersionV6);
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
      if (settled) {
        try {
          request.transaction?.abort();
        } catch {
          // A previously reported blocked open must not mutate the database later.
        }
        return;
      }
      try {
        if (
          (event.oldVersion !== 0 && event.oldVersion !== 4 && event.oldVersion !== 5) ||
          event.newVersion !== programRepositoryDatabaseVersionV6
        ) {
          throw createProgramRepositoryFailureV3("schema_invalid", input.operation);
        }
        if (event.oldVersion === 0) {
          if (request.result.objectStoreNames.length !== 0) {
            throw createProgramRepositoryFailureV3("schema_invalid", input.operation);
          }
          createStoresV1(request.result, programRepositoryObjectStoreNamesV6);
        } else if (event.oldVersion === 4) {
          resetExactPhysicalV4V1(request, input.operation);
        } else upgradeExactPhysicalV5V1(request, input.operation);
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
      rejectOnceV1(createProgramRepositoryFailureV3("upgrade_blocked", input.operation));
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
        rejectOnceV1(createProgramRepositoryFailureV3("schema_invalid", input.operation));
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
  operation: ProgramRepositoryOperationV3,
): ProgramRepositoryAggregateV3 {
  try {
    return cloneProgramRepositoryAggregateV3(value as ProgramRepositoryAggregateV3);
  } catch {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
}

function storedContinuationV1(
  value: unknown,
  operation: ProgramRepositoryOperationV3,
): BrowserProgramContinuationManifestV1 {
  try {
    return cloneBrowserProgramContinuationManifestV1(
      value as BrowserProgramContinuationManifestV1,
    );
  } catch {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
}

function storedNetworkGrantSetV1(
  value: unknown,
  programId: string,
  operation: ProgramRepositoryOperationV3,
): ProgramNetworkGrantSetV1 {
  if (value === undefined) return createEmptyProgramNetworkGrantSetV1(programId);
  try {
    const grants = cloneProgramNetworkGrantSetV1(value as ProgramNetworkGrantSetV1);
    if (grants.programId !== programId) {
      throw new TypeError("Program network grant identity mismatch");
    }
    return grants;
  } catch {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
}

function storedPairV1(
  programRow: unknown,
  continuationRow: unknown,
  operation: ProgramRepositoryOperationV3,
): StoredProgramPairV1 | null {
  if (programRow === undefined && continuationRow === undefined) return null;
  if (programRow === undefined || continuationRow === undefined) {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
  const aggregate = storedAggregateV1(programRow, operation);
  const continuation = storedContinuationV1(continuationRow, operation);
  if (!browserProgramContinuationMatchesAggregateV1(continuation, aggregate)) {
    throw createProgramRepositoryFailureV3("schema_invalid", operation);
  }
  return { aggregate, continuation };
}

async function loadPairFromTransactionV1(input: {
  readonly transaction: IDBTransaction;
  readonly programId: string;
  readonly operation: ProgramRepositoryOperationV3;
}): Promise<StoredProgramPairV1 | null> {
  const programRequest = input.transaction.objectStore(programRepositoryProgramObjectStoreNameV4)
    .get(input.programId);
  const continuationRequest = input.transaction.objectStore(
    programRepositoryWorkspaceContinuationObjectStoreNameV4,
  ).get(input.programId);
  const [programRow, continuationRow] = await Promise.all([
    requestResultV1(programRequest),
    requestResultV1(continuationRequest),
  ]);
  return storedPairV1(programRow, continuationRow, input.operation);
}

async function writeCommittedPairV1(input: {
  readonly transaction: IDBTransaction;
  readonly current: StoredProgramPairV1;
  readonly next: ProgramRepositoryAggregateV3;
}): Promise<void> {
  const nextContinuation = advanceBrowserProgramContinuationV1(
    input.current.continuation,
    input.next,
  );
  const programStore = input.transaction.objectStore(programRepositoryProgramObjectStoreNameV4);
  const continuationStore = input.transaction.objectStore(
    programRepositoryWorkspaceContinuationObjectStoreNameV4,
  );
  await Promise.all([
    requestResultV1(programStore.put(cloneProgramRepositoryAggregateV3(input.next))),
    requestResultV1(
      continuationStore.put(cloneBrowserProgramContinuationManifestV1(nextContinuation)),
    ),
  ]);
}

/** Worker-side product adapter. Page code uses the typed Repository Worker port. */
export function createIndexedDbProgramRepositoryV4(
  options: CreateIndexedDbProgramRepositoryOptionsV4,
): ProgramRepositoryWithWorkspaceContinuationV1 {
  const databaseName = options.databaseName ?? programRepositoryDatabaseNameV4;
  let databasePromise: Promise<IDBDatabase> | undefined;
  let disposed = false;

  const getDatabaseV1 = (operation: ProgramRepositoryOperationV3): Promise<IDBDatabase> => {
    if (disposed) return Promise.reject(createProgramRepositoryFailureV3("disposed", operation));
    const indexedDB = options.indexedDB as IDBFactory | undefined;
    if (indexedDB === undefined || typeof indexedDB.open !== "function") {
      return Promise.reject(createProgramRepositoryFailureV3("unavailable", operation));
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

  const mutateV1 = async (
    operation: "apply_revision" | "settle_agent_run" | "decide",
    programId: string,
    continuation: BrowserProgramContinuationManifestV1,
    expectedRepositoryRevision: number,
    apply: (current: ProgramRepositoryAggregateV3) => ProgramRepositoryCommitResultV3,
  ): Promise<ProgramRepositoryCommitResultV3> => {
    let transaction: IDBTransaction | undefined;
    let completion: Promise<void> | undefined;
    try {
      const database = await getDatabaseV1(operation);
      transaction = database.transaction(programRepositoryPairObjectStoreNamesV4, "readwrite");
      completion = transactionCompletionV1(transaction);
      void completion.catch(() => undefined);
      const current = await loadPairFromTransactionV1({ transaction, programId, operation });
      if (current === null) {
        await completion;
        return { kind: "conflict", current: null };
      }
      if (
        !browserProgramContinuationMatchesMutationPreStateV3(
          continuation,
          current.continuation,
          expectedRepositoryRevision,
        )
      ) {
        await completion;
        return {
          kind: "conflict",
          current: cloneProgramRepositoryAggregateV3(current.aggregate),
        };
      }
      const result = apply(current.aggregate);
      if (result.kind !== "committed") {
        await completion;
        return result;
      }
      await writeCommittedPairV1({ transaction, current, next: result.aggregate });
      await completion;
      return {
        kind: "committed",
        aggregate: cloneProgramRepositoryAggregateV3(result.aggregate),
      };
    } catch (error) {
      await abortAfterFailureV1(transaction, completion);
      throw mapFailureV1(error, operation);
    }
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
          programRepositoryPairObjectStoreNamesV4,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const programRequest = transaction.objectStore(programRepositoryProgramObjectStoreNameV4)
          .getAll();
        const continuationRequest = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV4,
        ).getAll();
        const [programRows, continuationRows] = await Promise.all([
          requestResultV1(programRequest),
          requestResultV1(continuationRequest),
        ]);
        if (programRows.length !== continuationRows.length) {
          throw createProgramRepositoryFailureV3("schema_invalid", "list");
        }
        const continuations = new Map<string, BrowserProgramContinuationManifestV1>();
        for (const row of continuationRows) {
          const continuation = storedContinuationV1(row, "list");
          if (continuations.has(continuation.programId)) {
            throw createProgramRepositoryFailureV3("schema_invalid", "list");
          }
          continuations.set(continuation.programId, continuation);
        }
        const aggregates = programRows.map((row) => storedAggregateV1(row, "list"));
        for (const aggregate of aggregates) {
          const continuation = continuations.get(aggregate.programId);
          if (
            continuation === undefined ||
            !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
          ) throw createProgramRepositoryFailureV3("schema_invalid", "list");
          continuations.delete(aggregate.programId);
        }
        if (continuations.size !== 0) {
          throw createProgramRepositoryFailureV3("schema_invalid", "list");
        }
        await completion;
        return sortProgramRepositorySummariesV3(
          aggregates.map(summarizeProgramRepositoryAggregateV3),
        );
      } catch (error) {
        throw mapFailureV1(error, "list");
      }
    },

    async load(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      try {
        const database = await getDatabaseV1("load");
        const transaction = database.transaction(
          programRepositoryPairObjectStoreNamesV4,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const pair = await loadPairFromTransactionV1({ transaction, programId, operation: "load" });
        await completion;
        return pair?.aggregate ?? null;
      } catch (error) {
        throw mapFailureV1(error, "load");
      }
    },

    async loadWorkspaceContinuation(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      try {
        const database = await getDatabaseV1("load_workspace_continuation");
        const transaction = database.transaction(
          programRepositoryPairObjectStoreNamesV4,
          "readonly",
        );
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const pair = await loadPairFromTransactionV1({
          transaction,
          programId,
          operation: "load_workspace_continuation",
        });
        await completion;
        return pair?.continuation ?? null;
      } catch (error) {
        throw mapFailureV1(error, "load_workspace_continuation");
      }
    },

    async loadProgramNetworkGrants(rawProgramId) {
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      try {
        const database = await getDatabaseV1("load_program_network_grants");
        const transaction = database.transaction(programRepositoryObjectStoreNamesV6, "readonly");
        const completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const pairPromise = loadPairFromTransactionV1({
          transaction,
          programId,
          operation: "load_program_network_grants",
        });
        const grantRequest = transaction.objectStore(
          programRepositoryNetworkGrantObjectStoreNameV1,
        ).get(programId);
        const [pair, grantRow] = await Promise.all([
          pairPromise,
          requestResultV1(grantRequest),
        ]);
        if (pair === null) {
          if (grantRow !== undefined) {
            throw createProgramRepositoryFailureV3(
              "schema_invalid",
              "load_program_network_grants",
            );
          }
          await completion;
          return null;
        }
        const grants = storedNetworkGrantSetV1(
          grantRow,
          programId,
          "load_program_network_grants",
        );
        await completion;
        return grants;
      } catch (error) {
        throw mapFailureV1(error, "load_program_network_grants");
      }
    },

    async setProgramNetworkGrant(rawInput) {
      const input = normalizeProgramNetworkGrantMutationV1(rawInput);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("set_program_network_grant");
        transaction = database.transaction(programRepositoryObjectStoreNamesV6, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const pairPromise = loadPairFromTransactionV1({
          transaction,
          programId: input.programId,
          operation: "set_program_network_grant",
        });
        const grantStore = transaction.objectStore(
          programRepositoryNetworkGrantObjectStoreNameV1,
        );
        const grantRequest = grantStore.get(input.programId);
        const [pair, grantRow] = await Promise.all([
          pairPromise,
          requestResultV1(grantRequest),
        ]);
        if (pair === null) {
          if (grantRow !== undefined) {
            throw createProgramRepositoryFailureV3(
              "schema_invalid",
              "set_program_network_grant",
            );
          }
          await completion;
          return { kind: "missing" };
        }
        const current = storedNetworkGrantSetV1(
          grantRow,
          input.programId,
          "set_program_network_grant",
        );
        const applied = applyProgramNetworkGrantMutationV1(current, input);
        if (applied.kind === "capacity_exceeded") {
          transaction.abort();
          await completion.catch(() => undefined);
          throw createProgramRepositoryFailureV3(
            "quota_exceeded",
            "set_program_network_grant",
          );
        }
        if (applied.kind === "unchanged") {
          await completion;
          return {
            kind: "unchanged",
            value: cloneProgramNetworkGrantSetV1(applied.value),
          };
        }
        const next = cloneProgramNetworkGrantSetV1(applied.value);
        if (next.grants.length === 0) {
          await requestResultV1(grantStore.delete(input.programId));
        } else {
          await requestResultV1(grantStore.put(next));
        }
        await completion;
        return { kind: "committed", value: cloneProgramNetworkGrantSetV1(next) };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "set_program_network_grant");
      }
    },

    async create(rawInput) {
      const input = normalizeProgramRepositoryCreateInputV3(rawInput);
      const candidate = buildProgramRepositoryCreateV3(input);
      const candidateContinuation = cloneBrowserProgramContinuationManifestV1(input.continuation);
      let transaction: IDBTransaction | undefined;
      let completion: Promise<void> | undefined;
      try {
        const database = await getDatabaseV1("create");
        transaction = database.transaction(programRepositoryPairObjectStoreNamesV4, "readwrite");
        completion = transactionCompletionV1(transaction);
        void completion.catch(() => undefined);
        const current = await loadPairFromTransactionV1({
          transaction,
          programId: candidate.programId,
          operation: "create",
        });
        if (current !== null) {
          await completion;
          if (
            programRepositoryAggregatesEqualV3(current.aggregate, candidate) &&
            browserProgramContinuationManifestsEqualV1(
              current.continuation,
              candidateContinuation,
            )
          ) {
            return {
              kind: "unchanged",
              aggregate: cloneProgramRepositoryAggregateV3(current.aggregate),
            };
          }
          return {
            kind: "conflict",
            current: cloneProgramRepositoryAggregateV3(current.aggregate),
          };
        }
        const programStore = transaction.objectStore(programRepositoryProgramObjectStoreNameV4);
        const continuationStore = transaction.objectStore(
          programRepositoryWorkspaceContinuationObjectStoreNameV4,
        );
        const programCount = await requestResultV1(programStore.count());
        if (programCount >= programRepositoryMaximumProgramsV3) {
          transaction.abort();
          await completion.catch(() => undefined);
          throw createProgramRepositoryFailureV3("quota_exceeded", "create");
        }
        const programWrite = requestResultV1(
          programStore.add(cloneProgramRepositoryAggregateV3(candidate)),
        );
        // Observe the first request before constructing the second. A synchronous
        // continuation-store failure still aborts this transaction and must not leave
        // the already-started Program request as an unhandled rejection.
        void programWrite.catch(() => undefined);
        let continuationWrite: Promise<IDBValidKey>;
        try {
          continuationWrite = requestResultV1(continuationStore.add(candidateContinuation));
        } catch (error) {
          await programWrite.catch(() => undefined);
          throw error;
        }
        await Promise.all([programWrite, continuationWrite]);
        await completion;
        return {
          kind: "committed",
          aggregate: cloneProgramRepositoryAggregateV3(candidate),
        };
      } catch (error) {
        await abortAfterFailureV1(transaction, completion);
        throw mapFailureV1(error, "create");
      }
    },

    async applyRevision(rawInput) {
      const input = normalizeProgramRepositoryApplyRevisionInputV3(rawInput);
      return await mutateV1(
        "apply_revision",
        input.programId,
        input.continuation,
        input.expectedRepositoryRevision,
        (current) => applyProgramRepositoryRevisionV3(current, input),
      );
    },

    async settleAgentRun(rawInput) {
      const input = normalizeProgramRepositorySettleAgentRunInputV3(rawInput);
      return await mutateV1(
        "settle_agent_run",
        input.programId,
        input.continuation,
        input.expectedRepositoryRevision,
        (current) => applyProgramRepositoryAgentRunTerminalV3(current, input),
      );
    },

    async decide(rawInput) {
      const input = normalizeProgramRepositoryDecideInputV3(rawInput);
      return await mutateV1(
        "decide",
        input.programId,
        input.continuation,
        input.expectedRepositoryRevision,
        (current) => applyProgramRepositoryDecisionV3(current, input),
      );
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
