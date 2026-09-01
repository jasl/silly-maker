// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";
import {
  cloneProcessHeadV1,
  cloneProcessSettingsOverrideV1,
  cloneProcessSummaryV1,
  cloneTerminalReceiptV1,
  createProcessSummaryV1,
  exactJsonValuesEqualV1,
  normalizeProcessAttemptBeginInputV1,
  normalizeProcessCreateInputV1,
  normalizeProcessIdV1,
  normalizeRecentProcessSummaryListInputV1,
  normalizeProcessSettingsOverrideMutationInputV1,
  normalizeProcessSummaryListInputV1,
  normalizeProcessTranscriptAppendInputV1,
  normalizeTranscriptPageRequestV1,
  processSummaryUtf8ByteLengthV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessCommitResultV1,
  type ProcessHeadV1,
  type ProcessSettingsOverrideV1,
  type ProcessSummaryV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "../../program-platform/process/program-process-repository.ts";
import {
  applyProcessNetworkAccessMutationV1,
  admitProcessNetworkAccessV1,
  createDefaultProcessNetworkAccessV1,
  type ProcessNetworkAccessV1,
} from "../../program-platform/capabilities/process-network-access.ts";
import {
  createProgramDataRepositoryFailureV1,
  cloneProcessWorkspaceBindingV1,
  isProgramDataRepositoryFailureV1,
  normalizeProcessWorkspaceCreateBundleInputV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryFailureCodeV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramDataRepositoryV1,
  type ProcessWorkspaceBindingV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
} from "./program-data-repository.ts";
import {
  cloneProcessExecutionLeaseV1,
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionLeaseReleaseInputV1,
  normalizeProcessExecutionLeaseRenewInputV1,
  normalizeProcessExecutionTerminalInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessOperationReceiptV1,
} from "../../program-platform/process/process-execution-repository.ts";
import {
  createIndexedDbProcessExecutionTransactionKernelV1,
  decodeIndexedDbProcessSettingsOverrideV1 as storedProcessSettingsOverrideV1,
  decodeIndexedDbProcessV1 as storedProcessV1,
  decodeIndexedDbTranscriptEntryV1 as storedEntryV1,
  digestIndexedDbOperationV1 as digestV1,
  encodeIndexedDbProcessV1 as encodeProcessV1,
  indexedDbProcessSubjectKeyV1 as subjectKeyV1,
  indexedDbTranscriptEntriesAreAvailableV1 as entriesAreAvailableV1,
  processCheckpointCanAdvanceV1 as checkpointCanAdvanceV1,
  requestIndexedDbResultV1 as requestResultV1,
} from "./indexeddb-process-execution-transaction-kernel.ts";
import {
  createIndexedDbProgramPersistenceFacetRegistryV1,
  normalizeProgramPersistenceFacetInvocationV1,
  type IndexedDbProgramPersistenceFacetV1,
} from "./program-persistence-facet.ts";

export const programDataDatabaseNameV1 = "sillymaker.example-silly-os.programs";
export const programDataDatabaseVersionV1 = 16;

export const programDataStoreNamesV1 = [
  "process_commits",
  "process_execution_leases",
  "process_network_access",
  "process_settings_overrides",
  "process_workspace_bindings",
  "processes",
  "transcript_entries",
] as const;

type StoreNameV1 = string;

export interface CreateIndexedDbProgramDataRepositoryOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly keyRange?: typeof IDBKeyRange;
  readonly databaseName?: string;
  readonly facets?: readonly IndexedDbProgramPersistenceFacetV1[];
}

type IndexedDbProgramDataRepositoryImplementationV1 =
  & ProgramDataRepositoryV1
  & ProgramProcessRepositoryV1;

interface StoredProcessCommitV1 {
  readonly processId: string;
  readonly commitId: string;
  readonly operation:
    | "begin_process_attempt"
    | "append_process_transcript";
  readonly digest: string;
  readonly firstSequence: number | null;
  readonly lastSequence: number | null;
  readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
}

type PreparedProcessAppendV1 =
  | {
    readonly kind: "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  }
  | { readonly kind: "conflict"; readonly current: ProcessHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
    readonly write: () => Promise<void>;
  };

function identifierV1(value: unknown): value is string {
  return isProgramPlatformIdentifierV1(value);
}

function domStringListV1(value: DOMStringList): string[] {
  return Array.from({ length: value.length }, (_, index) => value.item(index) ?? "");
}

function keyPathEqualV1(value: string | string[] | null, expected: string | string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(expected);
}

function exactNamesV1(actual: DOMStringList, expected: readonly string[]): boolean {
  return domStringListV1(actual).join("\0") === expected.toSorted().join("\0");
}

function exactStoreV1(
  store: IDBObjectStore,
  keyPath: string | string[],
  indexes: readonly {
    readonly name: string;
    readonly keyPath: string | string[];
    readonly unique: boolean;
  }[] = [],
): boolean {
  if (!keyPathEqualV1(store.keyPath, keyPath) || store.autoIncrement) return false;
  if (!exactNamesV1(store.indexNames, indexes.map((entry) => entry.name))) return false;
  return indexes.every((expected) => {
    const index = store.index(expected.name);
    return keyPathEqualV1(index.keyPath, expected.keyPath) &&
      index.unique === expected.unique && !index.multiEntry;
  });
}

function createCoreStoresV1(database: IDBDatabase): void {
  const processes = database.createObjectStore("processes", { keyPath: "processId" });
  processes.createIndex("by_subject_updated_at", ["subjectKey", "updatedAt", "processId"]);
  processes.createIndex("by_updated_at", ["updatedAt", "processId"]);
  const transcripts = database.createObjectStore("transcript_entries", {
    keyPath: ["processId", "sequence"],
  });
  transcripts.createIndex("by_process_entry_id", ["processId", "entryId"], { unique: true });
  database.createObjectStore("process_commits", { keyPath: ["processId", "commitId"] });
  database.createObjectStore("process_execution_leases", { keyPath: "processId" });
  database.createObjectStore("process_settings_overrides", { keyPath: "processId" });
  database.createObjectStore("process_network_access", { keyPath: "processId" });
}

function createProcessWorkspaceBindingsStoreV1(database: IDBDatabase): void {
  const bindings = database.createObjectStore("process_workspace_bindings", {
    keyPath: "processId",
  });
  bindings.createIndex("by_volume_id", "volumeId", { unique: true });
}

function createCurrentStoresV1(
  database: IDBDatabase,
  facets: readonly IndexedDbProgramPersistenceFacetV1[],
): void {
  createCoreStoresV1(database);
  createProcessWorkspaceBindingsStoreV1(database);
  for (const facet of facets) facet.createStores(database);
}

function hasExactCoreStoresV1(transaction: IDBTransaction): boolean {
  return exactStoreV1(transaction.objectStore("processes"), "processId", [{
    name: "by_subject_updated_at",
    keyPath: ["subjectKey", "updatedAt", "processId"],
    unique: false,
  }, {
    name: "by_updated_at",
    keyPath: ["updatedAt", "processId"],
    unique: false,
  }]) &&
    exactStoreV1(transaction.objectStore("transcript_entries"), ["processId", "sequence"], [{
      name: "by_process_entry_id",
      keyPath: ["processId", "entryId"],
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("process_commits"), ["processId", "commitId"]) &&
    exactStoreV1(transaction.objectStore("process_execution_leases"), "processId") &&
    exactStoreV1(transaction.objectStore("process_settings_overrides"), "processId") &&
    exactStoreV1(transaction.objectStore("process_network_access"), "processId");
}

function hasExactCoreSchemaStoresV1(transaction: IDBTransaction): boolean {
  return hasExactCoreStoresV1(transaction) &&
    exactStoreV1(transaction.objectStore("process_workspace_bindings"), "processId", [{
      name: "by_volume_id",
      keyPath: "volumeId",
      unique: true,
    }]);
}

function hasExactCoreSchemaV1(
  database: IDBDatabase,
): boolean {
  try {
    if (database.version !== programDataDatabaseVersionV1) return false;
    if (
      programDataStoreNamesV1.some((storeName) => !database.objectStoreNames.contains(storeName))
    ) {
      return false;
    }
    const transaction = database.transaction(programDataStoreNamesV1, "readonly");
    return hasExactCoreSchemaStoresV1(transaction);
  } catch {
    return false;
  }
}

function resetPreviousPreviewSchemaV1(
  request: IDBOpenDBRequest,
  facets: readonly IndexedDbProgramPersistenceFacetV1[],
): void {
  for (const name of domStringListV1(request.result.objectStoreNames)) {
    request.result.deleteObjectStore(name);
  }
  createCurrentStoresV1(request.result, facets);
}

function domExceptionNameV1(value: unknown): string | null {
  return value !== null && typeof value === "object" && "name" in value &&
      typeof (value as { name?: unknown }).name === "string"
    ? (value as { name: string }).name
    : null;
}

function mapFailureV1(value: unknown, operation: ProgramDataRepositoryOperationV1): unknown {
  if (isProgramDataRepositoryFailureV1(value)) {
    return value.operation === operation
      ? value
      : createProgramDataRepositoryFailureV1(value.code, operation);
  }
  if (value instanceof TypeError) return value;
  const name = domExceptionNameV1(value);
  let code: ProgramDataRepositoryFailureCodeV1;
  if (name === "VersionError") code = "database_newer";
  else if (name === "QuotaExceededError") code = "quota_exceeded";
  else if (name === "AbortError") code = "transaction_aborted";
  else if (name === "SecurityError" || name === "NotAllowedError") code = "unavailable";
  else code = "request_failed";
  return createProgramDataRepositoryFailureV1(code, operation);
}

function transactionDoneV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    const rejectAborted = () =>
      reject(
        transaction.error ?? new DOMException("IndexedDB transaction aborted", "AbortError"),
      );
    transaction.addEventListener("abort", rejectAborted, { once: true });
    transaction.addEventListener("error", rejectAborted, { once: true });
  });
}

function openDatabaseV1(input: {
  readonly indexedDB: IDBFactory;
  readonly databaseName: string;
  readonly operation: ProgramDataRepositoryOperationV1;
  readonly onClosed: () => void;
  readonly facets: readonly IndexedDbProgramPersistenceFacetV1[];
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = input.indexedDB.open(input.databaseName, programDataDatabaseVersionV1);
    } catch (error) {
      reject(mapFailureV1(error, input.operation));
      return;
    }
    let settled = false;
    let upgradeFailure: unknown;
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(mapFailureV1(error, input.operation));
    };
    request.addEventListener("upgradeneeded", (event) => {
      if (settled) {
        request.transaction?.abort();
        return;
      }
      try {
        if (event.newVersion !== programDataDatabaseVersionV1) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", input.operation);
        }
        if (event.oldVersion === 0) {
          if (request.result.objectStoreNames.length !== 0) {
            throw createProgramDataRepositoryFailureV1("schema_invalid", input.operation);
          }
          createCurrentStoresV1(request.result, input.facets);
        } else {
          // Preview-local persistence is not a compatibility contract before
          // the first stable release. An incompatible schema cleanly resets
          // this dedicated database rather than retaining migration code.
          resetPreviousPreviewSchemaV1(request, input.facets);
        }
      } catch (error) {
        upgradeFailure = error;
        request.transaction?.abort();
      }
    });
    request.addEventListener("blocked", () => {
      rejectOnce(createProgramDataRepositoryFailureV1("upgrade_blocked", input.operation));
    });
    request.addEventListener("error", () => rejectOnce(upgradeFailure ?? request.error));
    request.addEventListener("success", () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      // Conversation Core is the durable authority. Optional Program facets
      // are admitted only when selected; a removed or damaged facet must not
      // make otherwise-readable Process and transcript data unavailable.
      if (!hasExactCoreSchemaV1(database)) {
        database.close();
        rejectOnce(createProgramDataRepositoryFailureV1("schema_invalid", input.operation));
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

function storedProcessWorkspaceBindingV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessWorkspaceBindingV1 {
  try {
    return cloneProcessWorkspaceBindingV1(value as ProcessWorkspaceBindingV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function cursorWalkV1(
  request: IDBRequest<IDBCursorWithValue | null>,
  visit: (cursor: IDBCursorWithValue) => "continue" | "stop",
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    request.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(request.error);
    }, { once: true });
    request.addEventListener("success", () => {
      if (settled) return;
      const cursor = request.result;
      if (cursor === null) {
        settled = true;
        resolve();
        return;
      }
      try {
        if (visit(cursor) === "stop") {
          settled = true;
          resolve();
        } else cursor.continue();
      } catch (error) {
        settled = true;
        reject(error);
      }
    });
  });
}

function storedProcessCommitV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): StoredProcessCommitV1 {
  if (value === null || typeof value !== "object") {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const row = value as StoredProcessCommitV1;
  let terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  try {
    terminalAttemptReceipt = row.terminalAttemptReceipt === null
      ? null
      : cloneTerminalReceiptV1(row.terminalAttemptReceipt);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  if (
    !identifierV1(row.processId) || !identifierV1(row.commitId) ||
    (row.operation !== "begin_process_attempt" && row.operation !== "append_process_transcript") ||
    typeof row.digest !== "string" || !/^[0-9a-f]{64}$/u.test(row.digest) ||
    (row.firstSequence !== null &&
      (!Number.isSafeInteger(row.firstSequence) || row.firstSequence < 1)) ||
    (row.lastSequence !== null &&
      (!Number.isSafeInteger(row.lastSequence) || row.lastSequence < 1)) ||
    (row.firstSequence === null) !== (row.lastSequence === null) ||
    (row.firstSequence !== null && row.lastSequence !== null &&
      row.firstSequence > row.lastSequence) ||
    (row.operation === "begin_process_attempt" && row.firstSequence !== row.lastSequence) ||
    (row.operation === "append_process_transcript" && row.firstSequence === null) ||
    (row.operation !== "append_process_transcript" && terminalAttemptReceipt !== null)
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  return { ...row, terminalAttemptReceipt };
}

export function createIndexedDbProgramDataRepositoryV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): ProgramDataRepositoryV1 {
  const databaseName = options.databaseName ?? programDataDatabaseNameV1;
  const keyRange = options.keyRange ?? globalThis.IDBKeyRange;
  const facets = [...(options.facets ?? [])];
  const facetRegistry = createIndexedDbProgramPersistenceFacetRegistryV1(facets);
  const coreStores = new Set<string>(programDataStoreNamesV1);
  for (const facet of facets) {
    for (const storeName of facet.storeNames) {
      if (coreStores.has(storeName)) {
        throw new TypeError("Program persistence facet cannot own a Core store");
      }
    }
  }
  let databasePromise: Promise<IDBDatabase> | undefined;
  let disposed = false;
  const databaseV1 = (operation: ProgramDataRepositoryOperationV1): Promise<IDBDatabase> => {
    if (disposed) {
      return Promise.reject(createProgramDataRepositoryFailureV1("disposed", operation));
    }
    if (databasePromise === undefined) {
      const cached = openDatabaseV1({
        indexedDB: options.indexedDB,
        databaseName,
        operation,
        facets,
        onClosed: () => {
          if (databasePromise === cached) databasePromise = undefined;
        },
      }).catch((error: unknown) => {
        if (databasePromise === cached) databasePromise = undefined;
        throw error;
      });
      databasePromise = cached;
    }
    return databasePromise;
  };

  const runV1 = async <T>(
    operation: ProgramDataRepositoryOperationV1,
    stores: readonly StoreNameV1[],
    mode: IDBTransactionMode,
    invoke: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<T> => {
    try {
      const database = await databaseV1(operation);
      const transaction = database.transaction(stores, mode);
      const done = transactionDoneV1(transaction);
      try {
        const result = await invoke(transaction);
        await done;
        return result;
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The original operation failure remains authoritative.
        }
        try {
          await done;
        } catch {
          // The original operation failure remains authoritative.
        }
        throw error;
      }
    } catch (error) {
      throw mapFailureV1(error, operation);
    }
  };

  const loadProcessTxV1 = async (
    transaction: IDBTransaction,
    processId: string,
    operation: ProgramDataRepositoryOperationV1,
  ): Promise<ProcessHeadV1 | null> =>
    await createIndexedDbProcessExecutionTransactionKernelV1({
      transaction,
      repositoryOperation: operation,
    }).loadProcess(processId);

  const loadProcessExecutionLeaseTxV1 = async (
    transaction: IDBTransaction,
    processId: string,
    operation: ProgramDataRepositoryOperationV1,
  ): Promise<ProcessExecutionLeaseV1 | null> =>
    await createIndexedDbProcessExecutionTransactionKernelV1({
      transaction,
      repositoryOperation: operation,
    }).loadLease(processId);

  const replayProcessCommitV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly processId: string;
    readonly commitId: string;
    readonly operation: "begin_process_attempt" | "append_process_transcript";
    readonly digest: string;
    readonly expectedEntries: readonly TranscriptEntryV1[];
    readonly expectedTerminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }): Promise<Exclude<PreparedProcessAppendV1, { readonly kind: "committed" }> | null> => {
    const row = await requestResultV1(
      input.transaction.objectStore("process_commits").get([input.processId, input.commitId]),
    );
    if (row === undefined) return null;
    const commit = storedProcessCommitV1(row, input.repositoryOperation);
    if (commit.processId !== input.processId || commit.commitId !== input.commitId) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const current = await loadProcessTxV1(
      input.transaction,
      input.processId,
      input.repositoryOperation,
    );
    if (current === null) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    if (commit.operation !== input.operation || commit.digest !== input.digest) {
      return { kind: "conflict", current };
    }
    const expectedFirstSequence = input.expectedEntries[0]?.sequence ?? null;
    const expectedLastSequence = input.expectedEntries.at(-1)?.sequence ?? null;
    if (
      commit.firstSequence !== expectedFirstSequence ||
      commit.lastSequence !== expectedLastSequence ||
      !exactJsonValuesEqualV1(
        commit.terminalAttemptReceipt,
        input.expectedTerminalAttemptReceipt,
      )
    ) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    if (commit.lastSequence !== null && commit.lastSequence > current.transcriptFrontier) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const entries: TranscriptEntryV1[] = [];
    if (commit.firstSequence !== null && commit.lastSequence !== null) {
      for (let sequence = commit.firstSequence; sequence <= commit.lastSequence; sequence += 1) {
        const entryRow = await requestResultV1(
          input.transaction.objectStore("transcript_entries").get([input.processId, sequence]),
        );
        if (entryRow === undefined) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
        }
        const entry = storedEntryV1(entryRow, input.repositoryOperation);
        if (entry.processId !== input.processId || entry.sequence !== sequence) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
        }
        entries.push(entry);
      }
    }
    if (
      entries.length !== input.expectedEntries.length ||
      entries.some((entry, index) => !exactJsonValuesEqualV1(entry, input.expectedEntries[index]))
    ) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const terminalAttemptReceipt = commit.terminalAttemptReceipt;
    if (terminalAttemptReceipt !== null) {
      const terminalEntry = entries.at(-1);
      if (
        terminalEntry === undefined || terminalAttemptReceipt.processId !== input.processId ||
        terminalAttemptReceipt.terminalSequence !== terminalEntry.sequence ||
        terminalAttemptReceipt.terminalEntryId !== terminalEntry.entryId
      ) {
        throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
      }
    }
    if (!exactJsonValuesEqualV1(terminalAttemptReceipt, input.expectedTerminalAttemptReceipt)) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    return { kind: "unchanged", process: current, entries, terminalAttemptReceipt };
  };

  const prepareProcessTranscriptAppendV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ProcessTranscriptAppendInputV1;
    readonly digest: string;
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
    readonly initialProcess?: ProcessHeadV1;
  }): Promise<PreparedProcessAppendV1> => {
    const replay = await replayProcessCommitV1({
      transaction: input.transaction,
      processId: input.value.processId,
      commitId: input.value.commitId,
      operation: "append_process_transcript",
      digest: input.digest,
      expectedEntries: input.value.entries,
      expectedTerminalAttemptReceipt: input.value.terminalAttemptReceipt,
      repositoryOperation: input.repositoryOperation,
    });
    if (replay !== null) return replay;
    const current = input.initialProcess ?? await loadProcessTxV1(
      input.transaction,
      input.value.processId,
      input.repositoryOperation,
    );
    const first = input.value.entries[0]!;
    const terminal = input.value.terminalAttemptReceipt;
    const binding = input.value.attemptBinding;
    if (
      current === null || current.revision !== input.value.expectedProcessRevision ||
      current.transcriptFrontier !== input.value.expectedTranscriptFrontier ||
      current.status !== "active" || first.sequence !== current.transcriptFrontier + 1 ||
      input.value.updatedAt < current.updatedAt ||
      (current.activeAttempt === null) !== (binding === null) ||
      (current.activeAttempt !== null && binding !== null &&
        (binding.attemptId !== current.activeAttempt.attemptId ||
          binding.generation !== current.activeAttempt.generation)) ||
      (terminal !== null &&
        (binding === null || terminal.attemptId !== binding.attemptId ||
          terminal.generation !== binding.generation))
    ) return { kind: "conflict", current };
    const frontier = input.value.entries.at(-1)!.sequence;
    if (
      input.value.checkpoint !== null &&
      !checkpointCanAdvanceV1(current.checkpoint, input.value.checkpoint, frontier)
    ) return { kind: "conflict", current };
    if (!await entriesAreAvailableV1(input.transaction, input.value.entries)) {
      return { kind: "conflict", current };
    }
    const status = terminal?.outcome === "interrupted"
      ? terminal.interruptionDisposition === "retryable"
        ? "interrupted_retryable"
        : "interrupted_unrecoverable"
      : "active";
    const next = cloneProcessHeadV1({
      ...current,
      revision: current.revision + 1,
      status,
      transcriptFrontier: frontier,
      activeAttempt: terminal === null ? current.activeAttempt : null,
      lastTerminalAttempt: terminal === null ? current.lastTerminalAttempt : {
        attemptId: terminal.attemptId,
        generation: terminal.generation,
        outcome: terminal.outcome,
        triggerEntryId: current.activeAttempt!.triggerEntryId,
        triggerSequence: current.activeAttempt!.triggerSequence,
        interruptionDisposition: terminal.interruptionDisposition,
      },
      checkpoint: input.value.checkpoint ?? current.checkpoint,
      updatedAt: input.value.updatedAt,
    });
    const commit: StoredProcessCommitV1 = {
      processId: input.value.processId,
      commitId: input.value.commitId,
      operation: "append_process_transcript",
      digest: input.digest,
      firstSequence: input.value.entries[0]!.sequence,
      lastSequence: input.value.entries.at(-1)!.sequence,
      terminalAttemptReceipt: terminal,
    };
    return {
      kind: "committed",
      process: next,
      entries: input.value.entries,
      terminalAttemptReceipt: terminal,
      write: async () => {
        await Promise.all([
          requestResultV1(
            input.initialProcess === undefined
              ? input.transaction.objectStore("processes").put(encodeProcessV1(next))
              : input.transaction.objectStore("processes").add(encodeProcessV1(next)),
          ),
          ...input.value.entries.map((entry) =>
            requestResultV1(input.transaction.objectStore("transcript_entries").add(entry))
          ),
          requestResultV1(input.transaction.objectStore("process_commits").add(commit)),
        ]);
      },
    };
  };

  const prepareExecutionAcquireV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ReturnType<typeof normalizeProcessExecutionAcquireInputV1>;
    readonly digest: string;
    readonly operation: "execution_acquire";
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }) =>
    await createIndexedDbProcessExecutionTransactionKernelV1({
      transaction: input.transaction,
      repositoryOperation: input.repositoryOperation,
    }).prepareAcquire({
      value: input.value,
      operation: input.operation,
      digest: input.digest,
    });

  const prepareExecutionTerminalV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ReturnType<typeof normalizeProcessExecutionTerminalInputV1>;
    readonly digest: string;
    readonly operation: "execution_terminal";
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }) =>
    await createIndexedDbProcessExecutionTransactionKernelV1({
      transaction: input.transaction,
      repositoryOperation: input.repositoryOperation,
    }).prepareTerminal({
      value: input.value,
      operation: input.operation,
      digest: input.digest,
    });

  const validateQueriedOperationEvidenceV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly expectation: ProgramDataProcessOperationExpectationV1;
    readonly receipt: ProcessOperationReceiptV1;
  }): Promise<void> => {
    const process = await loadProcessTxV1(
      input.transaction,
      input.receipt.processId,
      "query_process_operation",
    );
    if (
      process === null || process.revision < input.receipt.processRevision ||
      process.transcriptFrontier < input.receipt.transcriptFrontier
    ) {
      throw createProgramDataRepositoryFailureV1(
        "schema_invalid",
        "query_process_operation",
      );
    }
    if (input.expectation.operation === "execution_acquire") {
      const acquire = input.expectation.input;
      const trigger = acquire.attempt.trigger;
      if (trigger.kind === "new_entry") {
        const row = await requestResultV1(
          input.transaction.objectStore("transcript_entries").get([
            trigger.entry.processId,
            trigger.entry.sequence,
          ]),
        );
        if (
          row === undefined ||
          !exactJsonValuesEqualV1(
            storedEntryV1(row, "query_process_operation"),
            trigger.entry,
          )
        ) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            "query_process_operation",
          );
        }
      }
      return;
    }
    const terminalInput = input.expectation.input;
    for (const expected of terminalInput.transcript.entries) {
      const row = await requestResultV1(
        input.transaction.objectStore("transcript_entries").get([
          expected.processId,
          expected.sequence,
        ]),
      );
      if (
        row === undefined ||
        !exactJsonValuesEqualV1(
          storedEntryV1(row, "query_process_operation"),
          expected,
        )
      ) {
        throw createProgramDataRepositoryFailureV1(
          "schema_invalid",
          "query_process_operation",
        );
      }
    }
    if (process.revision === input.receipt.processRevision) {
      const terminal = terminalInput.transcript.terminalAttemptReceipt!;
      if (
        process.activeAttempt !== null ||
        process.lastTerminalAttempt?.attemptId !== terminal.attemptId ||
        process.lastTerminalAttempt.generation !== terminal.generation ||
        process.lastTerminalAttempt.outcome !== terminal.outcome
      ) {
        throw createProgramDataRepositoryFailureV1(
          "schema_invalid",
          "query_process_operation",
        );
      }
    }
  };

  const repository: IndexedDbProgramDataRepositoryImplementationV1 = {
    async initialize() {
      await databaseV1("initialize");
    },

    async invokeProgramPersistenceFacet(rawInvocation) {
      const invocation = normalizeProgramPersistenceFacetInvocationV1(rawInvocation);
      const facet = facetRegistry.get(invocation.facetId);
      if (facet === undefined) throw new TypeError("unknown Program persistence facet");
      const database = await databaseV1("invoke_program_persistence_facet");
      try {
        if (facet.storeNames.some((storeName) => !database.objectStoreNames.contains(storeName))) {
          throw createProgramDataRepositoryFailureV1(
            "unavailable",
            "invoke_program_persistence_facet",
          );
        }
        const schemaTransaction = database.transaction(facet.storeNames, "readonly");
        if (!facet.hasExactSchema(schemaTransaction)) {
          throw createProgramDataRepositoryFailureV1(
            "unavailable",
            "invoke_program_persistence_facet",
          );
        }
      } catch (error) {
        if (isProgramDataRepositoryFailureV1(error)) throw error;
        throw createProgramDataRepositoryFailureV1(
          "unavailable",
          "invoke_program_persistence_facet",
        );
      }
      const operations = await facet.loadOperations();
      const prepared = await operations.prepare(invocation.operation, invocation.input);
      const allowedStores = new Set<string>([
        ...programDataStoreNamesV1,
        ...facet.storeNames,
      ]);
      if (
        prepared.storeNames.length === 0 ||
        new Set(prepared.storeNames).size !== prepared.storeNames.length ||
        prepared.storeNames.some((storeName) => !allowedStores.has(storeName))
      ) throw new TypeError("invalid Program persistence facet transaction store set");
      return await runV1(
        "invoke_program_persistence_facet",
        prepared.storeNames,
        prepared.mode,
        (transaction) =>
          prepared.invoke({
            transaction,
            keyRange,
            processExecution: createIndexedDbProcessExecutionTransactionKernelV1({
              transaction,
              repositoryOperation: "invoke_program_persistence_facet",
            }),
          }),
      );
    },

    async createProcessWithWorkspace(rawInput) {
      const input = normalizeProcessWorkspaceCreateBundleInputV1(rawInput);
      const digest = await digestV1(input);
      const operation = "create_process_with_workspace" as const;
      return await runV1(
        operation,
        [
          "processes",
          "process_settings_overrides",
          "transcript_entries",
          "process_commits",
          "process_workspace_bindings",
        ],
        "readwrite",
        async (transaction): Promise<ProcessWorkspaceCreateCompositeCommitResultV1> => {
          const bindings = transaction.objectStore("process_workspace_bindings");
          const current = await Promise.all([
            loadProcessTxV1(transaction, input.process.processId, operation),
            requestResultV1(bindings.get(input.process.processId)),
            requestResultV1(bindings.index("by_volume_id").get(input.workspace.volumeId)),
            requestResultV1(
              transaction.objectStore("process_commits").get([
                input.process.processId,
                input.transcript.commitId,
              ]),
            ),
          ]);
          const [currentProcess, workspaceRow, volumeOwnerRow, processCommitRow] = current;
          const currentWorkspace = workspaceRow === undefined
            ? null
            : storedProcessWorkspaceBindingV1(workspaceRow, operation);
          const volumeOwner = volumeOwnerRow === undefined
            ? null
            : storedProcessWorkspaceBindingV1(volumeOwnerRow, operation);
          if (volumeOwner !== null && volumeOwner.processId !== input.process.processId) {
            return { kind: "workspace_volume_owned", owner: volumeOwner };
          }
          let initialProcess: ProcessHeadV1 | undefined;
          if (processCommitRow === undefined) {
            if (currentProcess !== null || currentWorkspace !== null) {
              return { kind: "conflict", currentProcess, currentWorkspace };
            }
            initialProcess = cloneProcessHeadV1({
              schemaVersion: 1,
              processId: input.process.processId,
              revision: 1,
              programPackage: input.process.programPackage,
              subjectProgramId: input.process.subjectProgramId,
              status: "active",
              transcriptFrontier: 0,
              activeAttempt: null,
              lastTerminalAttempt: null,
              checkpoint: null,
              createdAt: input.process.createdAt,
              updatedAt: input.process.createdAt,
            });
          } else if (currentProcess === null || currentWorkspace === null) {
            throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
          }
          const process = await createIndexedDbProcessExecutionTransactionKernelV1({
            transaction,
            repositoryOperation: operation,
          }).prepareTranscriptAppend({
            value: input.transcript,
            digest,
            ...(initialProcess === undefined ? {} : { initialProcess }),
          });
          if (
            process.kind === "conflict" ||
            currentWorkspace !== null &&
              !exactJsonValuesEqualV1(currentWorkspace, input.workspace)
          ) return { kind: "conflict", currentProcess, currentWorkspace };
          if (process.kind === "unchanged") {
            if (currentWorkspace === null) {
              throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
            }
            return {
              kind: "unchanged",
              process: process.process,
              workspace: currentWorkspace,
              entries: process.entries,
            };
          }
          if (currentWorkspace !== null) {
            return { kind: "conflict", currentProcess, currentWorkspace };
          }
          await Promise.all([
            process.write(),
            requestResultV1(bindings.add(input.workspace)),
          ]);
          return {
            kind: "committed",
            process: process.process,
            workspace: input.workspace,
            entries: process.entries,
          };
        },
      );
    },

    async loadProcessWorkspaceBinding(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_process_workspace_binding",
        ["process_workspace_bindings"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("process_workspace_bindings").get(processId),
          );
          return row === undefined
            ? null
            : storedProcessWorkspaceBindingV1(row, "load_process_workspace_binding");
        },
      );
    },

    async createProcess(rawInput) {
      const input = normalizeProcessCreateInputV1(rawInput);
      return await runV1(
        "create_process",
        ["processes", "process_settings_overrides"],
        "readwrite",
        async (transaction) => {
          const current = await loadProcessTxV1(transaction, input.processId, "create_process");
          const candidate = cloneProcessHeadV1({
            schemaVersion: 1,
            processId: input.processId,
            revision: 1,
            programPackage: input.programPackage,
            subjectProgramId: input.subjectProgramId,
            status: "active",
            transcriptFrontier: 0,
            activeAttempt: null,
            lastTerminalAttempt: null,
            checkpoint: null,
            createdAt: input.createdAt,
            updatedAt: input.createdAt,
          });
          if (current !== null) {
            const same = current.createdAt === candidate.createdAt &&
              current.subjectProgramId === candidate.subjectProgramId &&
              exactJsonValuesEqualV1(current.programPackage, candidate.programPackage);
            return same
              ? { kind: "unchanged" as const, process: current }
              : { kind: "conflict" as const, current };
          }
          await Promise.all([
            requestResultV1(
              transaction.objectStore("processes").add(encodeProcessV1(candidate)),
            ),
            requestResultV1(
              transaction.objectStore("process_settings_overrides").add(
                {
                  schemaVersion: 1,
                  processId: candidate.processId,
                  revision: 1,
                  overrideJson: null,
                  updatedAt: candidate.createdAt,
                } satisfies ProcessSettingsOverrideV1,
              ),
            ),
          ]);
          return { kind: "committed" as const, process: candidate };
        },
      );
    },

    async loadProcess(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_process",
        ["processes"],
        "readonly",
        (transaction) => loadProcessTxV1(transaction, processId, "load_process"),
      );
    },

    async loadProcessSettingsOverride(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_process_settings_override",
        ["processes", "process_settings_overrides"],
        "readonly",
        async (transaction) => {
          const [process, row] = await Promise.all([
            loadProcessTxV1(transaction, processId, "load_process_settings_override"),
            requestResultV1(transaction.objectStore("process_settings_overrides").get(processId)),
          ]);
          if (process === null || row === undefined) return null;
          try {
            const settings = storedProcessSettingsOverrideV1(
              row,
              "load_process_settings_override",
            );
            return settings.processId === processId ? settings : null;
          } catch {
            // Optional settings degrade to exact-package defaults without hiding the Process.
            return null;
          }
        },
      );
    },

    async setProcessSettingsOverride(rawInput) {
      const input = normalizeProcessSettingsOverrideMutationInputV1(rawInput);
      return await runV1(
        "set_process_settings_override",
        ["processes", "process_settings_overrides"],
        "readwrite",
        async (transaction) => {
          const [process, row] = await Promise.all([
            loadProcessTxV1(transaction, input.processId, "set_process_settings_override"),
            requestResultV1(
              transaction.objectStore("process_settings_overrides").get(input.processId),
            ),
          ]);
          let current: ProcessSettingsOverrideV1 | null = null;
          if (row !== undefined) {
            try {
              current = storedProcessSettingsOverrideV1(row, "set_process_settings_override");
            } catch {
              // A malformed optional row is not trusted or overwritten blindly.
            }
          }
          if (
            process === null || current === null || current.processId !== input.processId ||
            current.revision !== input.expectedRevision || input.updatedAt < current.updatedAt
          ) return { kind: "conflict" as const, current };
          if (current.overrideJson === input.admittedOverrideJson) {
            return { kind: "unchanged" as const, settings: current };
          }
          const settings = cloneProcessSettingsOverrideV1({
            ...current,
            revision: current.revision + 1,
            overrideJson: input.admittedOverrideJson,
            updatedAt: input.updatedAt,
          });
          await requestResultV1(
            transaction.objectStore("process_settings_overrides").put(settings),
          );
          return { kind: "committed" as const, settings };
        },
      );
    },

    async listProcessSummaries(rawInput) {
      const input = normalizeProcessSummaryListInputV1(rawInput);
      return await runV1(
        "list_process_summaries",
        ["processes"],
        "readonly",
        async (transaction) => {
          const subjectKey = subjectKeyV1(input.subjectProgramId);
          const range = input.before === null
            ? keyRange.bound([subjectKey, 0], [
              subjectKey,
              Number.MAX_SAFE_INTEGER,
              "\uffff",
            ])
            : keyRange.bound(
              [subjectKey, 0],
              [subjectKey, input.before.updatedAt, input.before.processId],
              false,
              true,
            );
          const summaries: ProcessSummaryV1[] = [];
          let byteLength = 0;
          let stopped = false;
          await cursorWalkV1(
            transaction.objectStore("processes").index("by_subject_updated_at").openCursor(
              range,
              "prev",
            ),
            (cursor) => {
              const summary = cloneProcessSummaryV1(createProcessSummaryV1(
                storedProcessV1(cursor.value, "list_process_summaries"),
              ));
              if (summary.subjectProgramId !== input.subjectProgramId) {
                throw createProgramDataRepositoryFailureV1(
                  "schema_invalid",
                  "list_process_summaries",
                );
              }
              const bytes = processSummaryUtf8ByteLengthV1(summary);
              if (byteLength + bytes > input.maximumBytes) {
                stopped = true;
                return "stop";
              }
              summaries.push(summary);
              byteLength += bytes;
              return "continue";
            },
          );
          if (stopped && summaries.length === 0) {
            throw createProgramDataRepositoryFailureV1(
              "page_budget_too_small",
              "list_process_summaries",
            );
          }
          const last = summaries.at(-1);
          return {
            subjectProgramId: input.subjectProgramId,
            before: input.before,
            summaries,
            byteLength,
            nextCursor: stopped && last !== undefined
              ? { updatedAt: last.updatedAt, processId: last.processId }
              : null,
          };
        },
      );
    },

    async listRecentProcessSummaries(rawInput) {
      const input = normalizeRecentProcessSummaryListInputV1(rawInput);
      return await runV1(
        "list_recent_process_summaries",
        ["processes"],
        "readonly",
        async (transaction) => {
          const range = input.before === null ? null : keyRange.upperBound(
            [input.before.updatedAt, input.before.processId],
            true,
          );
          const summaries: ProcessSummaryV1[] = [];
          let byteLength = 0;
          let stopped = false;
          await cursorWalkV1(
            transaction.objectStore("processes").index("by_updated_at").openCursor(range, "prev"),
            (cursor) => {
              const summary = cloneProcessSummaryV1(createProcessSummaryV1(
                storedProcessV1(cursor.value, "list_recent_process_summaries"),
              ));
              const bytes = processSummaryUtf8ByteLengthV1(summary);
              if (byteLength + bytes > input.maximumBytes) {
                stopped = true;
                return "stop";
              }
              summaries.push(summary);
              byteLength += bytes;
              return "continue";
            },
          );
          if (stopped && summaries.length === 0) {
            throw createProgramDataRepositoryFailureV1(
              "page_budget_too_small",
              "list_recent_process_summaries",
            );
          }
          const last = summaries.at(-1);
          return {
            before: input.before,
            summaries,
            byteLength,
            nextCursor: stopped && last !== undefined
              ? { updatedAt: last.updatedAt, processId: last.processId }
              : null,
          };
        },
      );
    },

    async beginProcessAttempt(rawInput) {
      const input = normalizeProcessAttemptBeginInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "begin_process_attempt",
        [
          "processes",
          "process_settings_overrides",
          "transcript_entries",
          "process_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProcessCommitResultV1> => {
          const replay = await replayProcessCommitV1({
            transaction,
            processId: input.processId,
            commitId: input.commitId,
            operation: "begin_process_attempt",
            digest,
            expectedEntries: input.trigger.kind === "new_entry" ? [input.trigger.entry] : [],
            expectedTerminalAttemptReceipt: null,
            repositoryOperation: "begin_process_attempt",
          });
          if (replay !== null) return replay;
          const current = await loadProcessTxV1(
            transaction,
            input.processId,
            "begin_process_attempt",
          );
          let triggerEntry: TranscriptEntryV1 | null;
          if (input.trigger.kind === "new_entry") triggerEntry = input.trigger.entry;
          else {
            const row = await requestResultV1(
              transaction.objectStore("transcript_entries").get([
                input.processId,
                input.trigger.sequence,
              ]),
            );
            triggerEntry = row === undefined ? null : storedEntryV1(row, "begin_process_attempt");
          }
          const appends = input.trigger.kind === "new_entry";
          const nextFrontier = appends
            ? input.expectedTranscriptFrontier + 1
            : input.expectedTranscriptFrontier;
          if (
            current === null || current.revision !== input.expectedProcessRevision ||
            current.transcriptFrontier !== input.expectedTranscriptFrontier ||
            current.activeAttempt !== null || current.status === "interrupted_unrecoverable" ||
            (appends && current.status !== "active") ||
            (appends && triggerEntry?.sequence !== current.transcriptFrontier + 1) ||
            (!appends && current.status !== "interrupted_retryable") ||
            (!appends &&
              (current.lastTerminalAttempt?.outcome !== "interrupted" ||
                current.lastTerminalAttempt.triggerEntryId !== triggerEntry?.entryId ||
                current.lastTerminalAttempt.triggerSequence !== triggerEntry?.sequence)) ||
            triggerEntry === null || triggerEntry.role !== "user" ||
            triggerEntry.state !== "committed" ||
            triggerEntry.entryId !==
              (input.trigger.kind === "new_entry"
                ? input.trigger.entry.entryId
                : input.trigger.entryId) ||
            input.updatedAt < current.updatedAt ||
            input.generation <= (current.lastTerminalAttempt?.generation ?? 0) ||
            !checkpointCanAdvanceV1(current.checkpoint, input.startingCheckpoint, nextFrontier)
          ) return { kind: "conflict", current };
          const entries = appends ? [triggerEntry] : [];
          if (!await entriesAreAvailableV1(transaction, entries)) {
            return { kind: "conflict", current };
          }
          const settingsRow = await requestResultV1(
            transaction.objectStore("process_settings_overrides").get(input.processId),
          );
          let settingsOverrideJson: string | null = null;
          if (settingsRow !== undefined) {
            try {
              const settings = storedProcessSettingsOverrideV1(
                settingsRow,
                "begin_process_attempt",
              );
              if (settings.processId === input.processId) {
                settingsOverrideJson = settings.overrideJson;
              }
            } catch {
              // Invalid optional settings fall back to the exact package defaults.
            }
          }
          const next = cloneProcessHeadV1({
            ...current,
            revision: current.revision + 1,
            status: "active",
            transcriptFrontier: nextFrontier,
            activeAttempt: {
              attemptId: input.attemptId,
              generation: input.generation,
              triggerEntryId: triggerEntry.entryId,
              triggerSequence: triggerEntry.sequence,
              startingCheckpoint: input.startingCheckpoint,
              settingsOverrideJson,
            },
            checkpoint: input.startingCheckpoint,
            updatedAt: input.updatedAt,
          });
          const commit: StoredProcessCommitV1 = {
            processId: input.processId,
            commitId: input.commitId,
            operation: "begin_process_attempt",
            digest,
            firstSequence: entries[0]?.sequence ?? null,
            lastSequence: entries.at(-1)?.sequence ?? null,
            terminalAttemptReceipt: null,
          };
          await Promise.all([
            requestResultV1(transaction.objectStore("processes").put(encodeProcessV1(next))),
            ...entries.map((entry) =>
              requestResultV1(transaction.objectStore("transcript_entries").add(entry))
            ),
            requestResultV1(transaction.objectStore("process_commits").add(commit)),
          ]);
          return { kind: "committed", process: next, entries, terminalAttemptReceipt: null };
        },
      );
    },

    async appendProcessTranscript(rawInput) {
      const input = normalizeProcessTranscriptAppendInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "append_process_transcript",
        ["processes", "transcript_entries", "process_commits"],
        "readwrite",
        async (transaction): Promise<ProcessCommitResultV1> => {
          const prepared = await prepareProcessTranscriptAppendV1({
            transaction,
            value: input,
            digest,
            repositoryOperation: "append_process_transcript",
          });
          if (prepared.kind !== "committed") return prepared;
          await prepared.write();
          return {
            kind: "committed",
            process: prepared.process,
            entries: prepared.entries,
            terminalAttemptReceipt: prepared.terminalAttemptReceipt,
          };
        },
      );
    },

    async acquireProcessExecution(rawInput) {
      const input = normalizeProcessExecutionAcquireInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "acquire_process_execution",
        [
          "processes",
          "process_settings_overrides",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
        ],
        "readwrite",
        async (transaction) => {
          const prepared = await prepareExecutionAcquireV1({
            transaction,
            value: input,
            operation: "execution_acquire",
            digest,
            repositoryOperation: "acquire_process_execution",
          });
          if (prepared.kind === "committed") await prepared.write();
          if (prepared.kind === "conflict") {
            return {
              kind: "conflict" as const,
              currentProcess: prepared.currentProcess,
              currentLease: prepared.currentLease,
            };
          }
          return {
            kind: prepared.kind,
            process: prepared.process,
            entries: prepared.entries,
            lease: prepared.lease,
            operationReceipt: prepared.operationReceipt,
          };
        },
      );
    },

    async renewProcessExecutionLease(rawInput) {
      const input = normalizeProcessExecutionLeaseRenewInputV1(rawInput);
      return await runV1(
        "renew_process_execution_lease",
        ["processes", "process_execution_leases"],
        "readwrite",
        async (transaction) => {
          const [currentProcess, currentLease] = await Promise.all([
            loadProcessTxV1(transaction, input.lease.processId, "renew_process_execution_lease"),
            loadProcessExecutionLeaseTxV1(
              transaction,
              input.lease.processId,
              "renew_process_execution_lease",
            ),
          ]);
          if (
            currentProcess !== null && currentLease !== null &&
            currentLease.processId === input.lease.processId &&
            currentLease.ownerInstanceId === input.lease.ownerInstanceId &&
            currentLease.attemptId === input.lease.attemptId &&
            currentLease.generation === input.lease.generation &&
            currentLease.expiresAt === input.expiresAt &&
            currentProcess.activeAttempt?.attemptId === input.lease.attemptId &&
            currentProcess.activeAttempt.generation === input.lease.generation
          ) return { kind: "unchanged", lease: currentLease } as const;
          if (
            currentProcess === null || currentLease === null ||
            !exactJsonValuesEqualV1(currentLease, input.lease) ||
            currentProcess.activeAttempt?.attemptId !== input.lease.attemptId ||
            currentProcess.activeAttempt.generation !== input.lease.generation
          ) return { kind: "conflict", currentProcess, currentLease } as const;
          const lease = cloneProcessExecutionLeaseV1({
            ...currentLease,
            expiresAt: input.expiresAt,
          });
          await requestResultV1(
            transaction.objectStore("process_execution_leases").put(lease),
          );
          return { kind: "committed", lease } as const;
        },
      );
    },

    async releaseProcessExecutionLease(rawInput) {
      const input = normalizeProcessExecutionLeaseReleaseInputV1(rawInput);
      return await runV1(
        "release_process_execution_lease",
        ["processes", "process_execution_leases"],
        "readwrite",
        async (transaction) => {
          const [currentProcess, currentLease] = await Promise.all([
            loadProcessTxV1(transaction, input.lease.processId, "release_process_execution_lease"),
            loadProcessExecutionLeaseTxV1(
              transaction,
              input.lease.processId,
              "release_process_execution_lease",
            ),
          ]);
          if (
            currentProcess !== null && currentLease !== null &&
            currentLease.processId === input.lease.processId &&
            currentLease.ownerInstanceId === input.lease.ownerInstanceId &&
            currentLease.attemptId === input.lease.attemptId &&
            currentLease.generation === input.lease.generation &&
            currentLease.expiresAt <= input.observedAt &&
            currentProcess.activeAttempt?.attemptId === input.lease.attemptId &&
            currentProcess.activeAttempt.generation === input.lease.generation
          ) return { kind: "unchanged", lease: currentLease } as const;
          if (
            currentProcess === null || currentLease === null ||
            !exactJsonValuesEqualV1(currentLease, input.lease) ||
            currentProcess.activeAttempt?.attemptId !== input.lease.attemptId ||
            currentProcess.activeAttempt.generation !== input.lease.generation
          ) return { kind: "conflict", currentProcess, currentLease } as const;
          const expiresAt = Math.min(currentLease.expiresAt, input.observedAt);
          const lease = cloneProcessExecutionLeaseV1({ ...currentLease, expiresAt });
          if (exactJsonValuesEqualV1(lease, currentLease)) {
            return { kind: "unchanged", lease } as const;
          }
          await requestResultV1(
            transaction.objectStore("process_execution_leases").put(lease),
          );
          return { kind: "committed", lease } as const;
        },
      );
    },

    async loadProcessExecutionLease(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_process_execution_lease",
        ["process_execution_leases"],
        "readonly",
        (transaction) =>
          loadProcessExecutionLeaseTxV1(
            transaction,
            processId,
            "load_process_execution_lease",
          ),
      );
    },

    async commitProcessExecutionTerminal(rawInput) {
      const input = normalizeProcessExecutionTerminalInputV1(rawInput);
      const digest = await digestV1(input);
      const operation = "commit_process_execution_terminal" as const;
      return await runV1(
        operation,
        [
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
        ],
        "readwrite",
        async (transaction) => {
          const prepared = await prepareExecutionTerminalV1({
            transaction,
            value: input,
            digest,
            operation: "execution_terminal",
            repositoryOperation: operation,
          });
          if (prepared.kind === "conflict") return prepared;
          if (prepared.kind === "committed") await prepared.write();
          return {
            kind: prepared.kind,
            process: prepared.process,
            entries: prepared.entries,
            operationReceipt: prepared.operationReceipt,
          };
        },
      );
    },

    async queryProcessOperation(expectation) {
      let processId: string;
      let operationId: string;
      let expectedOperation: ProcessOperationReceiptV1["operation"];
      let expectedInput: unknown;
      let normalizedExpectation: ProgramDataProcessOperationExpectationV1;
      if (expectation.operation === "execution_acquire") {
        const input = normalizeProcessExecutionAcquireInputV1(expectation.input);
        processId = input.attempt.processId;
        operationId = input.attempt.commitId;
        expectedOperation = "execution_acquire";
        expectedInput = input;
        normalizedExpectation = { operation: "execution_acquire", input };
      } else {
        const input = normalizeProcessExecutionTerminalInputV1(expectation.input);
        processId = input.transcript.processId;
        operationId = input.transcript.commitId;
        expectedOperation = "execution_terminal";
        expectedInput = input;
        normalizedExpectation = { operation: "execution_terminal", input };
      }
      const digest = await digestV1(expectedInput);
      return await runV1(
        "query_process_operation",
        ["process_commits", "processes", "transcript_entries"],
        "readonly",
        async (transaction) => {
          const receipt = await createIndexedDbProcessExecutionTransactionKernelV1({
            transaction,
            repositoryOperation: "query_process_operation",
          }).loadOperationReceipt(processId, operationId);
          if (receipt === "absent") return { kind: "absent" } as const;
          if (receipt === "invalid") return { kind: "mismatch", receipt: null } as const;
          if (receipt.operation !== expectedOperation || receipt.operationDigest !== digest) {
            return { kind: "mismatch" as const, receipt };
          }
          await validateQueriedOperationEvidenceV1({
            transaction,
            expectation: normalizedExpectation,
            receipt,
          });
          return { kind: "committed" as const, receipt };
        },
      );
    },

    async loadTranscriptPage(rawInput) {
      const input = normalizeTranscriptPageRequestV1(rawInput);
      return await runV1(
        "load_transcript_page",
        ["processes", "transcript_entries"],
        "readonly",
        async (transaction) => {
          const process = await loadProcessTxV1(
            transaction,
            input.processId,
            "load_transcript_page",
          );
          if (process === null) return null;
          const before = input.beforeSequence === null
            ? process.transcriptFrontier + 1
            : Math.min(input.beforeSequence, process.transcriptFrontier + 1);
          const range = keyRange.bound(
            [input.processId, 0],
            [input.processId, before],
            false,
            true,
          );
          const descending: TranscriptEntryV1[] = [];
          let byteLength = 0;
          let stopped = false;
          let expectedSequence = before - 1;
          await cursorWalkV1(
            transaction.objectStore("transcript_entries").openCursor(range, "prev"),
            (cursor) => {
              const entry = storedEntryV1(cursor.value, "load_transcript_page");
              if (entry.sequence !== expectedSequence) {
                throw createProgramDataRepositoryFailureV1(
                  "schema_invalid",
                  "load_transcript_page",
                );
              }
              const bytes = transcriptEntryUtf8ByteLengthV1(entry);
              if (byteLength + bytes > input.maximumBytes) {
                stopped = true;
                return "stop";
              }
              descending.push(entry);
              byteLength += bytes;
              expectedSequence -= 1;
              return "continue";
            },
          );
          if (stopped && descending.length === 0) {
            throw createProgramDataRepositoryFailureV1(
              "page_budget_too_small",
              "load_transcript_page",
            );
          }
          if (!stopped && expectedSequence !== 0) {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_transcript_page",
            );
          }
          const entries = descending.toReversed();
          const oldest = entries[0];
          return {
            processId: input.processId,
            beforeSequence: input.beforeSequence,
            entries,
            byteLength,
            nextBeforeSequence: stopped && oldest !== undefined ? oldest.sequence : null,
          };
        },
      );
    },

    async loadProcessNetworkAccess(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_process_network_access",
        ["processes", "process_network_access"],
        "readonly",
        async (transaction) => {
          const process = await requestResultV1(
            transaction.objectStore("processes").get(processId),
          );
          if (process === undefined) return null;
          storedProcessV1(process, "load_process_network_access");
          const row = await requestResultV1(
            transaction.objectStore("process_network_access").get(processId),
          );
          if (row === undefined) return createDefaultProcessNetworkAccessV1(processId);
          try {
            const admitted = admitProcessNetworkAccessV1(row);
            if (admitted.kind === "rejected" || admitted.value.processId !== processId) {
              throw new TypeError();
            }
            return admitted.value;
          } catch {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_process_network_access",
            );
          }
        },
      );
    },

    async setProcessNetworkAccess(rawInput) {
      const input = { processId: rawInput.processId, enabled: rawInput.enabled };
      return await runV1(
        "set_process_network_access",
        ["processes", "process_network_access"],
        "readwrite",
        async (transaction) => {
          const process = await requestResultV1(
            transaction.objectStore("processes").get(input.processId),
          );
          if (process === undefined) return { kind: "missing" as const };
          storedProcessV1(process, "set_process_network_access");
          const store = transaction.objectStore("process_network_access");
          const row = await requestResultV1(store.get(input.processId));
          let current: ProcessNetworkAccessV1;
          try {
            current = row === undefined
              ? createDefaultProcessNetworkAccessV1(input.processId)
              : (() => {
                const admitted = admitProcessNetworkAccessV1(row);
                if (admitted.kind === "rejected") throw new TypeError();
                return admitted.value;
              })();
          } catch {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "set_process_network_access",
            );
          }
          const result = applyProcessNetworkAccessMutationV1(current, input);
          if (result.kind === "committed") {
            if (result.value.enabled) await requestResultV1(store.put(result.value));
            else await requestResultV1(store.delete(input.processId));
          }
          return result;
        },
      );
    },

    async reset() {
      const database = await databaseV1("reset");
      const storeNames = domStringListV1(database.objectStoreNames);
      await runV1("reset", storeNames, "readwrite", async (transaction) => {
        await Promise.all(
          storeNames.map((name) => requestResultV1(transaction.objectStore(name).clear())),
        );
      });
    },

    async dispose() {
      if (disposed) return;
      disposed = true;
      const pending = databasePromise;
      databasePromise = undefined;
      if (pending !== undefined) {
        try {
          (await pending).close();
        } catch {
          // Opening failures were already observable to their caller.
        }
      }
    },
  };
  return repository;
}
