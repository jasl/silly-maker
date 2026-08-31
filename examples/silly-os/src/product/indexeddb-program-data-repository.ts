// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  clonePreviewProgramForCatalogV1,
  cloneProgramCatalogContinuationV1,
  cloneProgramCatalogDecisionV1,
  cloneProgramCatalogHeadV1,
  cloneProgramCatalogRecordV1,
  normalizeProgramCatalogAcceptedDecisionListInputV1,
  normalizeProgramCatalogApplyRevisionInputV1,
  normalizeProgramCatalogCreateInputV1,
  normalizeProgramCatalogDecideInputV1,
  normalizeProgramCatalogListInputV1,
  normalizeProgramCatalogProgramIdV1,
  normalizeProgramCatalogProposalIdV1,
  normalizeProgramCatalogRevisionV1,
  type ProgramCatalogAcceptedDecisionV1,
  type ProgramCatalogCommitResultV1,
  type ProgramCatalogContinuationV1,
  type ProgramCatalogDecisionV1,
  type ProgramCatalogHeadV1,
  type ProgramCatalogRecordV1,
  type ProgramCatalogRepositoryV1,
  type ProgramCatalogSummaryV1,
} from "./program-catalog-repository.ts";
import {
  cloneProcessHeadV1,
  cloneProcessSummaryV1,
  cloneProgramDefinitionRevisionV1,
  cloneTerminalReceiptV1,
  cloneTranscriptEntryV1,
  createProcessSummaryV1,
  exactJsonValuesEqualV1,
  normalizeProcessAttemptBeginInputV1,
  normalizeProcessCreateInputV1,
  normalizeProcessIdV1,
  normalizeProcessSummaryListInputV1,
  normalizeProcessTranscriptAppendInputV1,
  normalizeProgramIdV1,
  normalizeRevisionV1,
  normalizeTranscriptPageRequestV1,
  processSummaryUtf8ByteLengthV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessCheckpointV1,
  type ProcessCommitResultV1,
  type ProcessHeadV1,
  type ProcessSummaryV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramDefinitionRevisionV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "./program-process-repository.ts";
import {
  applyProgramNetworkAccessMutationV1,
  cloneProgramNetworkAccessV1,
  createDefaultProgramNetworkAccessV1,
  normalizeProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessV1,
} from "./program-network-access.ts";
import {
  createProgramDataRepositoryFailureV1,
  cloneProcessWorkspaceBindingV1,
  isProgramDataRepositoryFailureV1,
  normalizeProcessWorkspaceCreateBundleInputV1,
  normalizeProgramProcessCreateBundleInputV1,
  normalizeProgramProcessDecisionBundleInputV1,
  normalizeProgramProcessExecutionRevisionBundleInputV1,
  normalizeProgramProcessRevisionBundleInputV1,
  normalizeTranslationBatchCandidateExecutionBundleInputV1,
  normalizeTranslationBatchExecutionAcquireInputV1,
  normalizeTranslationWorksetImportExecutionAcquireInputV1,
  normalizeTranslationWorksetFinalizeExecutionBundleInputV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryFailureCodeV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramDataRepositoryV1,
  type ProgramProcessCreateBundleInputV1,
  type ProgramProcessCompositeCommitResultV1,
  type ProgramProcessCreateCompositeCommitResultV1,
  type ProgramProcessDecisionBundleInputV1,
  type ProgramProcessExecutionCompositeCommitResultV1,
  type ProgramProcessRevisionBundleInputV1,
  type ProcessWorkspaceBindingV1,
  type ProcessWorkspaceCreateCompositeCommitResultV1,
  type TranslationWorksetFinalizeExecutionCompositeCommitResultV1,
  type TranslationBatchCandidateExecutionCompositeCommitResultV1,
  type TranslationBatchExecutionAcquireResultV1,
  type TranslationWorksetImportExecutionAcquireResultV1,
} from "./program-data-repository.ts";
import {
  cloneProcessExecutionLeaseV1,
  cloneProcessOperationReceiptV1,
  normalizeProcessExecutionAcquireInputV1,
  normalizeProcessExecutionLeaseReleaseInputV1,
  normalizeProcessExecutionLeaseRenewInputV1,
  normalizeProcessOperationReceiptV1,
  normalizeProcessExecutionTerminalInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessOperationReceiptV1,
} from "./process-execution-repository.ts";
import type { PreviewProgramV1 } from "./contracts.ts";
import {
  cloneTranslationBatchCandidateRecordV1,
  cloneTranslationWorksetUnitV1,
  normalizeTranslationBatchCandidateAcceptInputV1,
  normalizeTranslationBatchCandidatePublishInputV1,
  normalizeTranslationBatchCandidateRejectInputV1,
  normalizeTranslationWorksetAppendImportInputV1,
  normalizeTranslationWorksetBeginImportInputV1,
  normalizeTranslationWorksetFinalizeImportInputV1,
  normalizeTranslationWorksetOperationExpectationV1,
  normalizeTranslationWorksetPageRequestV1,
  normalizeTranslationWorksetSourceBindingV1,
  translationWorksetRowUtf8ByteLengthV1,
  type TranslationWorksetGlossaryEntryV1,
  type TranslationBatchCandidateAcceptInputV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationBatchCandidateRejectInputV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetOperationReceiptV1,
  type TranslationWorksetUnitRecordV1,
} from "./translation/translation-workset-repository.ts";
import { translationTargetPreservesProtectedStructureV1 } from "./translation/translation-document-codec.ts";
import { bundledTranslationProgramIdV1 } from "./translation/translation-program-definition.ts";

export const programDataDatabaseNameV1 = "sillymaker.example-silly-os.programs";
export const programDataDatabaseVersionV1 = 13;

export const programDataStoreNamesV1 = [
  "catalog_commits",
  "process_commits",
  "process_execution_leases",
  "process_workspace_bindings",
  "processes",
  "program_decisions",
  "program_definitions",
  "program_heads",
  "program_network_access",
  "program_revisions",
  "transcript_entries",
  "translation_batch_candidates",
  "translation_glossary_entries",
  "translation_workset_heads",
  "translation_workset_operations",
  "translation_workset_units",
  "workspace_continuations",
] as const;

type StoreNameV1 = typeof programDataStoreNamesV1[number];

export interface CreateIndexedDbProgramDataRepositoryOptionsV1 {
  readonly indexedDB: IDBFactory;
  readonly keyRange?: typeof IDBKeyRange;
  readonly databaseName?: string;
}

type IndexedDbProgramDataRepositoryImplementationV1 =
  & ProgramDataRepositoryV1
  & ProgramCatalogRepositoryV1
  & ProgramProcessRepositoryV1;

type StoredDecisionV1 = ProgramCatalogDecisionV1;

interface StoredCatalogCommitV1 {
  readonly programId: string;
  readonly commitId: string;
  readonly operation: "create" | "apply_revision" | "decide";
  readonly digest: string;
}

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

interface StoredProcessOperationV1 extends ProcessOperationReceiptV1 {
  /** Physical IndexedDB key fields for the current Process operation row. */
  readonly commitId: string;
  readonly digest: string;
}

type PreparedCatalogMutationV1 =
  | { readonly kind: "unchanged"; readonly record: ProgramCatalogRecordV1 }
  | { readonly kind: "conflict"; readonly current: ProgramCatalogRecordV1 | null }
  | {
    readonly kind: "committed";
    readonly record: ProgramCatalogRecordV1;
    readonly write: () => Promise<void>;
  };

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

type PreparedExecutionTerminalV1 =
  | {
    readonly kind: "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  }
  | {
    readonly kind: "committed";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly operationReceipt: ProcessOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedExecutionAcquireV1 =
  | {
    readonly kind: "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly lease: ProcessExecutionLeaseV1;
    readonly operationReceipt: ProcessOperationReceiptV1;
  }
  | {
    readonly kind: "conflict";
    readonly currentProcess: ProcessHeadV1 | null;
    readonly currentLease: ProcessExecutionLeaseV1 | null;
  }
  | {
    readonly kind: "committed";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly lease: ProcessExecutionLeaseV1;
    readonly operationReceipt: ProcessOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedTranslationFinalizeV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedTranslationCandidateV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly candidate: TranslationBatchCandidateRecordV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly candidate: TranslationBatchCandidateRecordV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedTranslationCandidateReviewV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

const noSubjectProgramIndexKeyV1 = "none:";
const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const textEncoderV1 = new TextEncoder();

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function programNameV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value &&
    textEncoderV1.encode(value).byteLength <= 256;
}

function subjectKeyV1(subjectProgramId: string | null): string {
  return subjectProgramId === null ? noSubjectProgramIndexKeyV1 : `program:${subjectProgramId}`;
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
  database.createObjectStore("program_definitions", { keyPath: ["programId", "revision"] });
  const heads = database.createObjectStore("program_heads", { keyPath: "programId" });
  heads.createIndex("by_updated_at", ["updatedAt", "programId"]);
  database.createObjectStore("program_revisions", { keyPath: ["programId", "revision"] });
  const decisions = database.createObjectStore("program_decisions", {
    keyPath: ["programId", "proposalId", "programRevision"],
  });
  decisions.createIndex("by_program_revision", ["programId", "programRevision"], { unique: true });
  database.createObjectStore("catalog_commits", { keyPath: ["programId", "commitId"] });
  const processes = database.createObjectStore("processes", { keyPath: "processId" });
  processes.createIndex("by_subject_updated_at", ["subjectKey", "updatedAt", "processId"]);
  const transcripts = database.createObjectStore("transcript_entries", {
    keyPath: ["processId", "sequence"],
  });
  transcripts.createIndex("by_process_entry_id", ["processId", "entryId"], { unique: true });
  database.createObjectStore("process_commits", { keyPath: ["processId", "commitId"] });
  database.createObjectStore("process_execution_leases", { keyPath: "processId" });
  database.createObjectStore("workspace_continuations", { keyPath: "programId" });
  database.createObjectStore("program_network_access", { keyPath: "programId" });
}

function createProcessWorkspaceBindingsStoreV1(database: IDBDatabase): void {
  const bindings = database.createObjectStore("process_workspace_bindings", {
    keyPath: "processId",
  });
  bindings.createIndex("by_volume_id", "volumeId", { unique: true });
}

function createTranslationWorksetStoresV1(database: IDBDatabase): void {
  database.createObjectStore("translation_workset_heads", { keyPath: "processId" });
  const units = database.createObjectStore("translation_workset_units", {
    keyPath: ["processId", "order"],
  });
  units.createIndex("by_process_unit_id", ["processId", "unitId"], { unique: true });
  const glossary = database.createObjectStore("translation_glossary_entries", {
    keyPath: ["processId", "order"],
  });
  glossary.createIndex("by_process_entry_id", ["processId", "entryId"], { unique: true });
  database.createObjectStore("translation_workset_operations", {
    keyPath: ["processId", "operationId"],
  });
}

function createTranslationBatchCandidateStoreV1(database: IDBDatabase): void {
  database.createObjectStore("translation_batch_candidates", {
    keyPath: ["processId", "candidateId"],
  });
}

function createCurrentStoresV1(database: IDBDatabase): void {
  createCoreStoresV1(database);
  createProcessWorkspaceBindingsStoreV1(database);
  createTranslationWorksetStoresV1(database);
  createTranslationBatchCandidateStoreV1(database);
}

function hasExactCoreStoresV1(transaction: IDBTransaction): boolean {
  return exactStoreV1(transaction.objectStore("program_definitions"), [
    "programId",
    "revision",
  ]) &&
    exactStoreV1(transaction.objectStore("program_heads"), "programId", [{
      name: "by_updated_at",
      keyPath: ["updatedAt", "programId"],
      unique: false,
    }]) &&
    exactStoreV1(transaction.objectStore("program_revisions"), ["programId", "revision"]) &&
    exactStoreV1(transaction.objectStore("program_decisions"), [
      "programId",
      "proposalId",
      "programRevision",
    ], [{
      name: "by_program_revision",
      keyPath: ["programId", "programRevision"],
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("catalog_commits"), ["programId", "commitId"]) &&
    exactStoreV1(transaction.objectStore("processes"), "processId", [{
      name: "by_subject_updated_at",
      keyPath: ["subjectKey", "updatedAt", "processId"],
      unique: false,
    }]) &&
    exactStoreV1(transaction.objectStore("transcript_entries"), ["processId", "sequence"], [{
      name: "by_process_entry_id",
      keyPath: ["processId", "entryId"],
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("process_commits"), ["processId", "commitId"]) &&
    exactStoreV1(transaction.objectStore("process_execution_leases"), "processId") &&
    exactStoreV1(transaction.objectStore("workspace_continuations"), "programId") &&
    exactStoreV1(transaction.objectStore("program_network_access"), "programId");
}

function hasExactCurrentStoresV1(transaction: IDBTransaction): boolean {
  return hasExactCoreStoresV1(transaction) &&
    exactStoreV1(transaction.objectStore("process_workspace_bindings"), "processId", [{
      name: "by_volume_id",
      keyPath: "volumeId",
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("translation_workset_heads"), "processId") &&
    exactStoreV1(transaction.objectStore("translation_workset_units"), ["processId", "order"], [{
      name: "by_process_unit_id",
      keyPath: ["processId", "unitId"],
      unique: true,
    }]) &&
    exactStoreV1(
      transaction.objectStore("translation_glossary_entries"),
      ["processId", "order"],
      [{
        name: "by_process_entry_id",
        keyPath: ["processId", "entryId"],
        unique: true,
      }],
    ) &&
    exactStoreV1(transaction.objectStore("translation_workset_operations"), [
      "processId",
      "operationId",
    ]) &&
    exactStoreV1(transaction.objectStore("translation_batch_candidates"), [
      "processId",
      "candidateId",
    ]);
}

function hasExactCurrentSchemaV1(database: IDBDatabase): boolean {
  try {
    if (
      database.version !== programDataDatabaseVersionV1 ||
      !exactNamesV1(database.objectStoreNames, programDataStoreNamesV1)
    ) return false;
    const transaction = database.transaction(programDataStoreNamesV1, "readonly");
    return hasExactCurrentStoresV1(transaction);
  } catch {
    return false;
  }
}

function resetPreviousPreviewSchemaV1(request: IDBOpenDBRequest): void {
  for (const name of domStringListV1(request.result.objectStoreNames)) {
    request.result.deleteObjectStore(name);
  }
  createCurrentStoresV1(request.result);
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

function requestResultV1<T>(request: IDBRequest<T>): Promise<T> {
  const result = new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
  // A later sibling request can throw synchronously before Promise.all receives
  // this Promise. Observe the rejection immediately while preserving it for the
  // operation-level await and transaction rollback.
  void result.catch(() => undefined);
  return result;
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
          createCurrentStoresV1(request.result);
        } else {
          // Preview-local persistence is not a compatibility contract before
          // the first stable release. An incompatible schema cleanly resets
          // this dedicated database rather than retaining migration code.
          resetPreviousPreviewSchemaV1(request);
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
      if (!hasExactCurrentSchemaV1(database)) {
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

async function digestV1(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeHeadV1(headValue: ProgramCatalogHeadV1, programValue: PreviewProgramV1): unknown {
  const head = cloneProgramCatalogHeadV1(headValue);
  const program = clonePreviewProgramForCatalogV1(programValue);
  if (head.programId !== program.programId || head.currentProgramRevision !== program.revision) {
    throw new TypeError("Program head projection mismatch");
  }
  return { ...head, name: program.name, kind: program.kind };
}

function storedHeadV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProgramCatalogHeadV1 {
  return storedHeadProjectionV1(value, operation).head;
}

function storedHeadProjectionV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): {
  readonly head: ProgramCatalogHeadV1;
  readonly name: string;
  readonly kind: PreviewProgramV1["kind"];
} {
  try {
    if (value === null || typeof value !== "object") throw new TypeError();
    const { name, kind, ...headValue } = value as ProgramCatalogHeadV1 & {
      readonly name: unknown;
      readonly kind: unknown;
    };
    if (
      !programNameV1(name) ||
      (kind !== "translation" && kind !== "writing" && kind !== "roleplay" && kind !== "general")
    ) throw new TypeError();
    return { head: cloneProgramCatalogHeadV1(headValue), name, kind };
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function storedRevisionV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): PreviewProgramV1 {
  try {
    return clonePreviewProgramForCatalogV1(value as PreviewProgramV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function storedDecisionV1(
  value: unknown,
  expectedProgramId: string,
  operation: ProgramDataRepositoryOperationV1,
): ProgramCatalogDecisionV1 {
  try {
    const decision = cloneProgramCatalogDecisionV1(value as StoredDecisionV1);
    if (decision.programId !== expectedProgramId) throw new TypeError();
    return decision;
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function storedContinuationV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProgramCatalogContinuationV1 {
  try {
    return cloneProgramCatalogContinuationV1(value as ProgramCatalogContinuationV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
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

function encodeProcessV1(value: ProcessHeadV1): unknown {
  const process = cloneProcessHeadV1(value);
  return { ...process, subjectKey: subjectKeyV1(process.subjectProgramId) };
}

function storedProcessV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessHeadV1 {
  if (value === null || typeof value !== "object" || !("subjectKey" in value)) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const { subjectKey, ...row } = value as ProcessHeadV1 & { readonly subjectKey: unknown };
  try {
    const process = cloneProcessHeadV1(row);
    if (subjectKey !== subjectKeyV1(process.subjectProgramId)) throw new TypeError();
    return process;
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function storedEntryV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): TranscriptEntryV1 {
  try {
    return cloneTranscriptEntryV1(value as TranscriptEntryV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

async function loadCatalogRecordV1(
  transaction: IDBTransaction,
  programId: string,
  operation: ProgramDataRepositoryOperationV1,
): Promise<ProgramCatalogRecordV1 | null> {
  const headRow = await requestResultV1(transaction.objectStore("program_heads").get(programId));
  if (headRow === undefined) return null;
  const head = storedHeadV1(headRow, operation);
  const revisionRow = await requestResultV1(
    transaction.objectStore("program_revisions").get([programId, head.currentProgramRevision]),
  );
  if (revisionRow === undefined) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const currentProgram = storedRevisionV1(revisionRow, operation);
  const projection = headRow as { readonly name?: unknown; readonly kind?: unknown };
  if (projection.name !== currentProgram.name || projection.kind !== currentProgram.kind) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  let latestDecision: ProgramCatalogDecisionV1 | null = null;
  if (head.proposal.status !== "pending") {
    const decisionRow = await requestResultV1(
      transaction.objectStore("program_decisions").get([
        programId,
        head.proposal.proposalId,
        head.proposal.programRevision,
      ]),
    );
    if (decisionRow === undefined) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
    }
    latestDecision = storedDecisionV1(decisionRow, programId, operation);
  }
  return cloneProgramCatalogRecordV1({ head, currentProgram, latestDecision });
}

function checkpointCanAdvanceV1(
  current: ProcessCheckpointV1 | null,
  next: ProcessCheckpointV1,
  frontier: number,
): boolean {
  if (next.throughSequence > frontier) return false;
  if (current === null) return true;
  if (
    next.workspaceId !== current.workspaceId ||
    next.workspaceGeneration < current.workspaceGeneration ||
    next.throughSequence < current.throughSequence
  ) return false;
  if (next.workspaceGeneration !== current.workspaceGeneration) return true;
  if (next.workspaceCheckpointId !== current.workspaceCheckpointId) return false;
  return next.throughSequence !== current.throughSequence ||
    next.checkpointId === current.checkpointId;
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

function catalogPairMatchesV1(
  record: ProgramCatalogRecordV1,
  continuation: ProgramCatalogContinuationV1,
  expectedRevision: number,
): boolean {
  return record.head.repositoryRevision === expectedRevision &&
    continuation.programId === record.head.programId &&
    continuation.workspaceId === record.head.workspaceId &&
    continuation.programRevision === record.head.currentProgramRevision &&
    continuation.repositoryRevision === expectedRevision;
}

function proposalMatchesV1(
  record: ProgramCatalogRecordV1,
  proposal: { readonly proposalId: string; readonly programRevision: number },
): boolean {
  return record.head.proposal.proposalId === proposal.proposalId &&
    record.head.proposal.programRevision === proposal.programRevision;
}

function storedCatalogCommitV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): StoredCatalogCommitV1 {
  if (
    value === null || typeof value !== "object" ||
    !("programId" in value) || !("commitId" in value) || !("operation" in value) ||
    !("digest" in value)
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  const row = value as StoredCatalogCommitV1;
  if (
    typeof row.programId !== "string" || typeof row.commitId !== "string" ||
    (row.operation !== "create" && row.operation !== "apply_revision" &&
      row.operation !== "decide") ||
    typeof row.digest !== "string" || !/^[0-9a-f]{64}$/u.test(row.digest)
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  return { ...row };
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

function storedProcessExecutionLeaseV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessExecutionLeaseV1 {
  try {
    return cloneProcessExecutionLeaseV1(value as ProcessExecutionLeaseV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

function storedProcessOperationV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): StoredProcessOperationV1 {
  if (
    value === null || typeof value !== "object" || !("commitId" in value) ||
    !("digest" in value)
  ) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const row = value as StoredProcessOperationV1;
  let receipt: ProcessOperationReceiptV1;
  try {
    receipt = normalizeProcessOperationReceiptV1(row);
  } catch {
    // Stored rows carry two physical aliases in addition to the public receipt.
    const { commitId: _commitId, digest: _digest, ...candidate } = row;
    try {
      receipt = normalizeProcessOperationReceiptV1(candidate);
    } catch {
      throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
    }
  }
  if (
    !identifierV1(row.commitId) || row.commitId !== receipt.operationId ||
    typeof row.digest !== "string" || row.digest !== receipt.operationDigest
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  return { ...receipt, commitId: row.commitId, digest: row.digest };
}

export function createIndexedDbProgramDataRepositoryV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): ProgramDataRepositoryV1 {
  const databaseName = options.databaseName ?? programDataDatabaseNameV1;
  const keyRange = options.keyRange ?? globalThis.IDBKeyRange;
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
  ): Promise<ProcessHeadV1 | null> => {
    const row = await requestResultV1(transaction.objectStore("processes").get(processId));
    return row === undefined ? null : storedProcessV1(row, operation);
  };

  const loadProcessExecutionLeaseTxV1 = async (
    transaction: IDBTransaction,
    processId: string,
    operation: ProgramDataRepositoryOperationV1,
  ): Promise<ProcessExecutionLeaseV1 | null> => {
    const row = await requestResultV1(
      transaction.objectStore("process_execution_leases").get(processId),
    );
    return row === undefined ? null : storedProcessExecutionLeaseV1(row, operation);
  };

  const operationReceiptV1 = (input: {
    readonly process: ProcessHeadV1;
    readonly operationId: string;
    readonly operation: ProcessOperationReceiptV1["operation"];
    readonly operationDigest: string;
    readonly attemptId: string;
    readonly generation: number;
    readonly terminalOutcome: ProcessOperationReceiptV1["terminalOutcome"];
    readonly programId?: string;
    readonly programRevision?: number;
    readonly repositoryRevision?: number;
    readonly lease: ProcessExecutionLeaseV1 | null;
  }): ProcessOperationReceiptV1 =>
    normalizeProcessOperationReceiptV1({
      processId: input.process.processId,
      operationId: input.operationId,
      operation: input.operation,
      operationDigest: input.operationDigest,
      attemptId: input.attemptId,
      generation: input.generation,
      processRevision: input.process.revision,
      transcriptFrontier: input.process.transcriptFrontier,
      terminalOutcome: input.terminalOutcome,
      programId: input.programId ?? null,
      programRevision: input.programRevision ?? null,
      repositoryRevision: input.repositoryRevision ?? null,
      lease: input.lease,
    });

  const encodeProcessOperationV1 = (
    receipt: ProcessOperationReceiptV1,
  ): StoredProcessOperationV1 => ({
    ...cloneProcessOperationReceiptV1(receipt),
    commitId: receipt.operationId,
    digest: receipt.operationDigest,
  });

  const publicProcessOperationReceiptV1 = (
    value: StoredProcessOperationV1,
  ): ProcessOperationReceiptV1 => {
    const { commitId: _commitId, digest: _digest, ...receipt } = value;
    return cloneProcessOperationReceiptV1(receipt);
  };

  const replayExecutionOperationV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly processId: string;
    readonly operationId: string;
    readonly operation: ProcessOperationReceiptV1["operation"];
    readonly digest: string;
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }): Promise<"absent" | "conflict" | ProcessOperationReceiptV1> => {
    const row = await requestResultV1(
      input.transaction.objectStore("process_commits").get([
        input.processId,
        input.operationId,
      ]),
    );
    if (row === undefined) return "absent";
    let stored: StoredProcessOperationV1;
    try {
      stored = storedProcessOperationV1(row, input.repositoryOperation);
    } catch {
      return "conflict";
    }
    return stored.operation === input.operation && stored.digest === input.digest
      ? publicProcessOperationReceiptV1(stored)
      : "conflict";
  };

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

  const entriesAreAvailableV1 = async (
    transaction: IDBTransaction,
    entries: readonly TranscriptEntryV1[],
  ): Promise<boolean> => {
    const store = transaction.objectStore("transcript_entries");
    const index = store.index("by_process_entry_id");
    for (const entry of entries) {
      const [sequenceRow, idKey] = await Promise.all([
        requestResultV1(store.get([entry.processId, entry.sequence])),
        requestResultV1(index.getKey([entry.processId, entry.entryId])),
      ]);
      if (sequenceRow !== undefined || idKey !== undefined) return false;
    }
    return true;
  };

  const replayCatalogCommitV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly programId: string;
    readonly commitId: string;
    readonly operation: StoredCatalogCommitV1["operation"];
    readonly digest: string;
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }): Promise<Exclude<PreparedCatalogMutationV1, { readonly kind: "committed" }> | null> => {
    const row = await requestResultV1(
      input.transaction.objectStore("catalog_commits").get([input.programId, input.commitId]),
    );
    if (row === undefined) return null;
    const commit = storedCatalogCommitV1(row, input.repositoryOperation);
    if (commit.programId !== input.programId || commit.commitId !== input.commitId) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const current = await loadCatalogRecordV1(
      input.transaction,
      input.programId,
      input.repositoryOperation,
    );
    if (current === null) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    return commit.operation === input.operation && commit.digest === input.digest
      ? { kind: "unchanged", record: current }
      : { kind: "conflict", current };
  };

  const prepareCreateCatalogV1 = async (
    transaction: IDBTransaction,
    input: ProgramProcessCreateBundleInputV1["catalog"],
    digest: string,
    repositoryOperation: ProgramDataRepositoryOperationV1,
  ): Promise<PreparedCatalogMutationV1> => {
    const programId = input.program.programId;
    const replay = await replayCatalogCommitV1({
      transaction,
      programId,
      commitId: input.commitId,
      operation: "create",
      digest,
      repositoryOperation,
    });
    if (replay !== null) return replay;
    const current = await loadCatalogRecordV1(transaction, programId, repositoryOperation);
    if (current !== null) return { kind: "conflict", current };
    const head: ProgramCatalogHeadV1 = {
      schemaVersion: 1,
      programId,
      repositoryRevision: 1,
      currentProgramRevision: 1,
      proposal: { proposalId: input.proposalId, programRevision: 1, status: "pending" },
      latestAccepted: null,
      workspaceId: input.continuation.workspaceId,
      updatedAt: input.updatedAt,
      pendingReviewBinding: {
        proposalId: input.proposalId,
        programId,
        programRevision: 1,
        baseAcceptedProgramRevision: null,
        repositoryRevision: 1,
        workspaceId: input.continuation.workspaceId,
        volumeId: input.continuation.volumeId,
        workspaceFormat: 1,
        checkpointId: input.reviewedHead.checkpointId,
        generation: input.reviewedHead.generation,
      },
    };
    const record = cloneProgramCatalogRecordV1({
      head,
      currentProgram: input.program,
      latestDecision: null,
    });
    return {
      kind: "committed",
      record,
      write: async () => {
        await Promise.all([
          requestResultV1(
            transaction.objectStore("program_heads").add(encodeHeadV1(head, input.program)),
          ),
          requestResultV1(transaction.objectStore("program_revisions").add(input.program)),
          requestResultV1(
            transaction.objectStore("workspace_continuations").add(input.continuation),
          ),
          requestResultV1(
            transaction.objectStore("catalog_commits").add(
              {
                programId,
                commitId: input.commitId,
                operation: "create",
                digest,
              } satisfies StoredCatalogCommitV1,
            ),
          ),
        ]);
      },
    };
  };

  const prepareApplyCatalogRevisionMutationV1 = async (
    transaction: IDBTransaction,
    input: ProgramProcessRevisionBundleInputV1["catalog"],
    repositoryOperation: ProgramDataRepositoryOperationV1,
    catalogCommit: { readonly digest: string } | null,
  ): Promise<PreparedCatalogMutationV1> => {
    if (catalogCommit !== null) {
      const replay = await replayCatalogCommitV1({
        transaction,
        programId: input.programId,
        commitId: input.commitId,
        operation: "apply_revision",
        digest: catalogCommit.digest,
        repositoryOperation,
      });
      if (replay !== null) return replay;
    }
    const current = await loadCatalogRecordV1(
      transaction,
      input.programId,
      repositoryOperation,
    );
    if (current === null) return { kind: "conflict", current: null };
    const continuationRow = await requestResultV1(
      transaction.objectStore("workspace_continuations").get(input.programId),
    );
    if (continuationRow === undefined) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    }
    const storedContinuation = storedContinuationV1(continuationRow, repositoryOperation);
    if (
      !catalogPairMatchesV1(current, input.continuation, input.expectedRepositoryRevision) ||
      !exactJsonValuesEqualV1(storedContinuation, input.continuation) ||
      !proposalMatchesV1(current, input.expectedProposal) ||
      input.program.revision !== current.head.currentProgramRevision + 1 ||
      input.updatedAt < current.head.updatedAt
    ) return { kind: "conflict", current };
    const repositoryRevision = current.head.repositoryRevision + 1;
    const continuation = {
      ...input.continuation,
      programRevision: input.program.revision,
      repositoryRevision,
    };
    const head: ProgramCatalogHeadV1 = {
      ...current.head,
      repositoryRevision,
      currentProgramRevision: input.program.revision,
      proposal: {
        proposalId: input.proposalId,
        programRevision: input.program.revision,
        status: "pending",
      },
      updatedAt: input.updatedAt,
      pendingReviewBinding: {
        proposalId: input.proposalId,
        programId: input.programId,
        programRevision: input.program.revision,
        baseAcceptedProgramRevision: current.head.latestAccepted?.programRevision ?? null,
        repositoryRevision,
        workspaceId: input.continuation.workspaceId,
        volumeId: input.continuation.volumeId,
        workspaceFormat: 1,
        checkpointId: input.reviewedHead.checkpointId,
        generation: input.reviewedHead.generation,
      },
    };
    const record = cloneProgramCatalogRecordV1({
      head,
      currentProgram: input.program,
      latestDecision: null,
    });
    return {
      kind: "committed",
      record,
      write: async () => {
        await Promise.all([
          requestResultV1(
            transaction.objectStore("program_heads").put(encodeHeadV1(head, input.program)),
          ),
          requestResultV1(transaction.objectStore("program_revisions").add(input.program)),
          requestResultV1(transaction.objectStore("workspace_continuations").put(continuation)),
          ...(catalogCommit === null ? [] : [
            requestResultV1(
              transaction.objectStore("catalog_commits").add(
                {
                  programId: input.programId,
                  commitId: input.commitId,
                  operation: "apply_revision",
                  digest: catalogCommit.digest,
                } satisfies StoredCatalogCommitV1,
              ),
            ),
          ]),
        ]);
      },
    };
  };

  const prepareApplyCatalogRevisionV1 = async (
    transaction: IDBTransaction,
    input: ProgramProcessRevisionBundleInputV1["catalog"],
    digest: string,
    repositoryOperation: ProgramDataRepositoryOperationV1,
  ): Promise<PreparedCatalogMutationV1> =>
    await prepareApplyCatalogRevisionMutationV1(
      transaction,
      input,
      repositoryOperation,
      { digest },
    );

  const prepareApplyCatalogRevisionForExecutionTerminalV1 = async (
    transaction: IDBTransaction,
    input: ProgramProcessRevisionBundleInputV1["catalog"],
    repositoryOperation: ProgramDataRepositoryOperationV1,
  ): Promise<PreparedCatalogMutationV1> =>
    await prepareApplyCatalogRevisionMutationV1(
      transaction,
      input,
      repositoryOperation,
      null,
    );

  const prepareDecideCatalogV1 = async (
    transaction: IDBTransaction,
    input: ProgramProcessDecisionBundleInputV1["catalog"],
    digest: string,
    repositoryOperation: ProgramDataRepositoryOperationV1,
  ): Promise<PreparedCatalogMutationV1> => {
    const replay = await replayCatalogCommitV1({
      transaction,
      programId: input.programId,
      commitId: input.commitId,
      operation: "decide",
      digest,
      repositoryOperation,
    });
    if (replay !== null) return replay;
    const current = await loadCatalogRecordV1(
      transaction,
      input.programId,
      repositoryOperation,
    );
    if (current === null) return { kind: "conflict", current: null };
    const continuationRow = await requestResultV1(
      transaction.objectStore("workspace_continuations").get(input.programId),
    );
    if (continuationRow === undefined) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    }
    const continuation = storedContinuationV1(continuationRow, repositoryOperation);
    const binding = current.head.pendingReviewBinding;
    if (
      binding === null || current.head.proposal.status !== "pending" ||
      !catalogPairMatchesV1(current, input.continuation, input.expectedRepositoryRevision) ||
      !exactJsonValuesEqualV1(continuation, input.continuation) ||
      !proposalMatchesV1(current, input.expectedProposal) ||
      input.updatedAt < current.head.updatedAt
    ) return { kind: "conflict", current };
    if (input.status === "accepted") {
      const receipt = input.snapshotReceipt;
      if (
        receipt.programId !== input.programId ||
        receipt.workspaceId !== current.head.workspaceId ||
        receipt.volumeId !== binding.volumeId ||
        receipt.workspaceFormat !== binding.workspaceFormat ||
        receipt.proposalId !== binding.proposalId ||
        receipt.programRevision !== binding.programRevision ||
        receipt.baseRepositoryRevision !== current.head.repositoryRevision ||
        receipt.checkpointId !== binding.checkpointId || receipt.generation !== binding.generation
      ) return { kind: "conflict", current };
    }
    const repositoryRevision = current.head.repositoryRevision + 1;
    const decision: ProgramCatalogDecisionV1 = input.status === "accepted"
      ? {
        programId: input.programId,
        proposalId: input.expectedProposal.proposalId,
        programRevision: input.expectedProposal.programRevision,
        status: "accepted",
        repositoryRevision,
        snapshot: input.snapshotReceipt,
      }
      : {
        programId: input.programId,
        proposalId: input.expectedProposal.proposalId,
        programRevision: input.expectedProposal.programRevision,
        status: "rejected",
        repositoryRevision,
      };
    const head: ProgramCatalogHeadV1 = {
      ...current.head,
      repositoryRevision,
      proposal: { ...current.head.proposal, status: input.status },
      latestAccepted: input.status === "accepted"
        ? { ...input.expectedProposal }
        : current.head.latestAccepted,
      updatedAt: input.updatedAt,
      pendingReviewBinding: null,
    };
    const nextContinuation = { ...continuation, repositoryRevision };
    const record = cloneProgramCatalogRecordV1({
      head,
      currentProgram: current.currentProgram,
      latestDecision: decision,
    });
    return {
      kind: "committed",
      record,
      write: async () => {
        await Promise.all([
          requestResultV1(
            transaction.objectStore("program_heads").put(
              encodeHeadV1(head, current.currentProgram),
            ),
          ),
          requestResultV1(transaction.objectStore("program_decisions").add(decision)),
          requestResultV1(
            transaction.objectStore("workspace_continuations").put(nextContinuation),
          ),
          requestResultV1(
            transaction.objectStore("catalog_commits").add(
              {
                programId: input.programId,
                commitId: input.commitId,
                operation: "decide",
                digest,
              } satisfies StoredCatalogCommitV1,
            ),
          ),
        ]);
      },
    };
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
    readonly operation:
      | "execution_acquire"
      | "translation_workset_import_execution_acquire"
      | "translation_batch_execution_acquire";
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
  }): Promise<PreparedExecutionAcquireV1> => {
    const operationId = input.value.attempt.commitId;
    const [replay, current, currentLease] = await Promise.all([
      replayExecutionOperationV1({
        transaction: input.transaction,
        processId: input.value.attempt.processId,
        operationId,
        operation: input.operation,
        digest: input.digest,
        repositoryOperation: input.repositoryOperation,
      }),
      loadProcessTxV1(
        input.transaction,
        input.value.attempt.processId,
        input.repositoryOperation,
      ),
      loadProcessExecutionLeaseTxV1(
        input.transaction,
        input.value.attempt.processId,
        input.repositoryOperation,
      ),
    ]);
    if (replay !== "absent") {
      if (
        replay === "conflict" || replay.lease === null || current === null ||
        currentLease === null ||
        current.activeAttempt?.attemptId !== replay.attemptId ||
        current.activeAttempt.generation !== replay.generation ||
        currentLease.ownerInstanceId !== replay.lease.ownerInstanceId ||
        currentLease.attemptId !== replay.attemptId ||
        currentLease.generation !== replay.generation
      ) return { kind: "conflict", currentProcess: current, currentLease };
      let entries: readonly TranscriptEntryV1[] = [];
      if (input.value.attempt.trigger.kind === "new_entry") {
        const row = await requestResultV1(
          input.transaction.objectStore("transcript_entries").get([
            current.processId,
            current.activeAttempt.triggerSequence,
          ]),
        );
        if (row === undefined) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
        }
        const entry = storedEntryV1(row, input.repositoryOperation);
        if (
          entry.entryId !== current.activeAttempt.triggerEntryId || entry.role !== "user" ||
          entry.state !== "committed" ||
          !exactJsonValuesEqualV1(entry, input.value.attempt.trigger.entry)
        ) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
        }
        entries = [entry];
      }
      return {
        kind: "unchanged",
        process: current,
        entries,
        lease: currentLease,
        operationReceipt: replay,
      };
    }
    let triggerEntry: TranscriptEntryV1 | null;
    if (input.value.attempt.trigger.kind === "new_entry") {
      triggerEntry = input.value.attempt.trigger.entry;
    } else {
      const row = await requestResultV1(
        input.transaction.objectStore("transcript_entries").get([
          input.value.attempt.processId,
          input.value.attempt.trigger.sequence,
        ]),
      );
      triggerEntry = row === undefined ? null : storedEntryV1(row, input.repositoryOperation);
    }
    const appends = input.value.attempt.trigger.kind === "new_entry";
    const nextFrontier = appends
      ? input.value.attempt.expectedTranscriptFrontier + 1
      : input.value.attempt.expectedTranscriptFrontier;
    if (
      current === null || currentLease !== null ||
      current.revision !== input.value.attempt.expectedProcessRevision ||
      current.transcriptFrontier !== input.value.attempt.expectedTranscriptFrontier ||
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
        (input.value.attempt.trigger.kind === "new_entry"
          ? input.value.attempt.trigger.entry.entryId
          : input.value.attempt.trigger.entryId) ||
      input.value.attempt.generation <= (current.lastTerminalAttempt?.generation ?? 0) ||
      !checkpointCanAdvanceV1(
        current.checkpoint,
        input.value.attempt.startingCheckpoint,
        nextFrontier,
      )
    ) return { kind: "conflict", currentProcess: current, currentLease };
    const entries = appends ? [triggerEntry] : [];
    if (!await entriesAreAvailableV1(input.transaction, entries)) {
      return { kind: "conflict", currentProcess: current, currentLease };
    }
    const lease = cloneProcessExecutionLeaseV1({
      processId: input.value.attempt.processId,
      ownerInstanceId: input.value.ownerInstanceId,
      attemptId: input.value.attempt.attemptId,
      generation: input.value.attempt.generation,
      expiresAt: input.value.expiresAt,
    });
    const next = cloneProcessHeadV1({
      ...current,
      revision: current.revision + 1,
      status: "active",
      transcriptFrontier: nextFrontier,
      activeAttempt: {
        attemptId: input.value.attempt.attemptId,
        generation: input.value.attempt.generation,
        triggerEntryId: triggerEntry.entryId,
        triggerSequence: triggerEntry.sequence,
        startingCheckpoint: input.value.attempt.startingCheckpoint,
      },
      checkpoint: input.value.attempt.startingCheckpoint,
      updatedAt: input.value.observedAt,
    });
    const receipt = operationReceiptV1({
      process: next,
      operationId,
      operation: input.operation,
      operationDigest: input.digest,
      attemptId: lease.attemptId,
      generation: lease.generation,
      terminalOutcome: null,
      lease,
    });
    return {
      kind: "committed",
      process: next,
      entries,
      lease,
      operationReceipt: receipt,
      write: async () => {
        await Promise.all([
          requestResultV1(input.transaction.objectStore("processes").put(encodeProcessV1(next))),
          ...entries.map((entry) =>
            requestResultV1(input.transaction.objectStore("transcript_entries").add(entry))
          ),
          requestResultV1(input.transaction.objectStore("process_execution_leases").add(lease)),
          requestResultV1(
            input.transaction.objectStore("process_commits").add(encodeProcessOperationV1(receipt)),
          ),
        ]);
      },
    };
  };

  const prepareExecutionTerminalV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ReturnType<typeof normalizeProcessExecutionTerminalInputV1>;
    readonly digest: string;
    readonly operation: "execution_terminal" | "program_revision_terminal";
    readonly repositoryOperation: ProgramDataRepositoryOperationV1;
    readonly program?: {
      readonly programId: string;
      readonly programRevision: number;
      readonly repositoryRevision: number;
      readonly expectedProgram: PreviewProgramV1;
    };
  }): Promise<PreparedExecutionTerminalV1> => {
    const operationId = input.value.transcript.commitId;
    const replay = await replayExecutionOperationV1({
      transaction: input.transaction,
      processId: input.value.transcript.processId,
      operationId,
      operation: input.operation,
      digest: input.digest,
      repositoryOperation: input.repositoryOperation,
    });
    const [currentProcess, currentLease] = await Promise.all([
      loadProcessTxV1(
        input.transaction,
        input.value.transcript.processId,
        input.repositoryOperation,
      ),
      loadProcessExecutionLeaseTxV1(
        input.transaction,
        input.value.transcript.processId,
        input.repositoryOperation,
      ),
    ]);
    if (replay !== "absent") {
      if (replay === "conflict" || currentProcess === null) {
        return { kind: "conflict", currentProcess, currentLease };
      }
      if (
        currentProcess.revision < replay.processRevision ||
        currentProcess.transcriptFrontier < replay.transcriptFrontier
      ) {
        throw createProgramDataRepositoryFailureV1(
          "schema_invalid",
          input.repositoryOperation,
        );
      }
      const persistedEntries: TranscriptEntryV1[] = [];
      for (const expected of input.value.transcript.entries) {
        const row = await requestResultV1(
          input.transaction.objectStore("transcript_entries").get([
            expected.processId,
            expected.sequence,
          ]),
        );
        if (row === undefined) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            input.repositoryOperation,
          );
        }
        const entry = storedEntryV1(row, input.repositoryOperation);
        if (!exactJsonValuesEqualV1(entry, expected)) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            input.repositoryOperation,
          );
        }
        persistedEntries.push(entry);
      }
      if (currentProcess.revision === replay.processRevision) {
        const terminal = input.value.transcript.terminalAttemptReceipt!;
        if (
          currentProcess.activeAttempt !== null ||
          currentProcess.lastTerminalAttempt?.attemptId !== terminal.attemptId ||
          currentProcess.lastTerminalAttempt.generation !== terminal.generation ||
          currentProcess.lastTerminalAttempt.outcome !== terminal.outcome ||
          currentProcess.transcriptFrontier !== replay.transcriptFrontier
        ) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            input.repositoryOperation,
          );
        }
      }
      if (input.program !== undefined) {
        const revisionRow = await requestResultV1(
          input.transaction.objectStore("program_revisions").get([
            input.program.programId,
            input.program.programRevision,
          ]),
        );
        if (
          revisionRow === undefined ||
          !exactJsonValuesEqualV1(
            storedRevisionV1(revisionRow, input.repositoryOperation),
            input.program.expectedProgram,
          )
        ) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            input.repositoryOperation,
          );
        }
      }
      return {
        kind: "unchanged",
        process: currentProcess,
        entries: persistedEntries,
        operationReceipt: replay,
      };
    }
    const transcript = input.value.transcript;
    const terminal = transcript.terminalAttemptReceipt!;
    const binding = transcript.attemptBinding!;
    const first = transcript.entries[0]!;
    if (
      currentProcess === null || currentLease === null ||
      !exactJsonValuesEqualV1(currentLease, input.value.lease) ||
      currentProcess.revision !== transcript.expectedProcessRevision ||
      currentProcess.transcriptFrontier !== transcript.expectedTranscriptFrontier ||
      currentProcess.status !== "active" ||
      currentProcess.activeAttempt?.attemptId !== binding.attemptId ||
      currentProcess.activeAttempt.generation !== binding.generation ||
      currentLease.attemptId !== binding.attemptId ||
      currentLease.generation !== binding.generation ||
      first.sequence !== currentProcess.transcriptFrontier + 1 ||
      transcript.updatedAt < currentProcess.updatedAt ||
      (input.value.observedAt >= currentLease.expiresAt && terminal.outcome !== "interrupted")
    ) return { kind: "conflict", currentProcess, currentLease };
    const frontier = transcript.entries.at(-1)!.sequence;
    if (
      transcript.checkpoint !== null &&
      !checkpointCanAdvanceV1(currentProcess.checkpoint, transcript.checkpoint, frontier)
    ) return { kind: "conflict", currentProcess, currentLease };
    if (!await entriesAreAvailableV1(input.transaction, transcript.entries)) {
      return { kind: "conflict", currentProcess, currentLease };
    }
    const status = terminal.outcome === "interrupted"
      ? terminal.interruptionDisposition === "retryable"
        ? "interrupted_retryable"
        : "interrupted_unrecoverable"
      : "active";
    const next = cloneProcessHeadV1({
      ...currentProcess,
      revision: currentProcess.revision + 1,
      status,
      transcriptFrontier: frontier,
      activeAttempt: null,
      lastTerminalAttempt: {
        attemptId: terminal.attemptId,
        generation: terminal.generation,
        outcome: terminal.outcome,
        triggerEntryId: currentProcess.activeAttempt.triggerEntryId,
        triggerSequence: currentProcess.activeAttempt.triggerSequence,
        interruptionDisposition: terminal.interruptionDisposition,
      },
      checkpoint: transcript.checkpoint ?? currentProcess.checkpoint,
      updatedAt: transcript.updatedAt,
    });
    const receipt = operationReceiptV1({
      process: next,
      operationId,
      operation: input.operation,
      operationDigest: input.digest,
      attemptId: binding.attemptId,
      generation: binding.generation,
      terminalOutcome: terminal.outcome,
      ...(input.program === undefined ? {} : {
        programId: input.program.programId,
        programRevision: input.program.programRevision,
        repositoryRevision: input.program.repositoryRevision,
      }),
      lease: null,
    });
    return {
      kind: "committed",
      process: next,
      entries: transcript.entries,
      operationReceipt: receipt,
      write: async () => {
        await Promise.all([
          requestResultV1(
            input.transaction.objectStore("processes").put(encodeProcessV1(next)),
          ),
          ...transcript.entries.map((entry) =>
            requestResultV1(input.transaction.objectStore("transcript_entries").add(entry))
          ),
          requestResultV1(
            input.transaction.objectStore("process_execution_leases").delete(
              input.value.lease.processId,
            ),
          ),
          requestResultV1(
            input.transaction.objectStore("process_commits").add(
              encodeProcessOperationV1(receipt),
            ),
          ),
        ]);
      },
    };
  };

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
    if (
      input.expectation.operation === "execution_acquire" ||
      input.expectation.operation === "translation_workset_import_execution_acquire" ||
      input.expectation.operation === "translation_batch_execution_acquire"
    ) {
      const acquire = input.expectation.operation === "execution_acquire"
        ? input.expectation.input
        : input.expectation.input.execution;
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
    if (input.expectation.operation === "program_revision_terminal") {
      const expected = input.expectation.input.catalog.program;
      const row = await requestResultV1(
        input.transaction.objectStore("program_revisions").get([
          expected.programId,
          expected.revision,
        ]),
      );
      if (
        row === undefined ||
        !exactJsonValuesEqualV1(storedRevisionV1(row, "query_process_operation"), expected)
      ) {
        throw createProgramDataRepositoryFailureV1(
          "schema_invalid",
          "query_process_operation",
        );
      }
    }
  };

  const loadTranslationHeadTxV1 = async (
    transaction: IDBTransaction,
    processId: string,
  ): Promise<TranslationWorksetHeadV1 | null> => {
    const row = await requestResultV1(
      transaction.objectStore("translation_workset_heads").get(processId),
    );
    if (row === undefined) return null;
    const head = structuredClone(row) as TranslationWorksetHeadV1;
    if (
      head.schemaVersion !== 2 || head.processId !== processId ||
      !identifierV1(head.importOperationId) ||
      !Number.isSafeInteger(head.revision) || head.revision < 1 ||
      !Number.isSafeInteger(head.acceptedUnitCount) || head.acceptedUnitCount < 0 ||
      head.acceptedUnitCount > head.stagedUnitCount ||
      !Number.isSafeInteger(head.acceptedBatchCount) || head.acceptedBatchCount < 0 ||
      (head.pendingCandidateId !== null && !identifierV1(head.pendingCandidateId))
    ) throw createProgramDataRepositoryFailureV1("schema_invalid", "load_translation_workset_head");
    try {
      normalizeTranslationWorksetSourceBindingV1(
        head.sourceBinding,
        head.source.workspacePath,
      );
    } catch {
      throw createProgramDataRepositoryFailureV1(
        "schema_invalid",
        "load_translation_workset_head",
      );
    }
    return head;
  };

  const loadTranslationCandidateTxV1 = async (
    transaction: IDBTransaction,
    processId: string,
    candidateId: string,
    operation: ProgramDataRepositoryOperationV1,
  ): Promise<TranslationBatchCandidateRecordV1 | null> => {
    const row = await requestResultV1(
      transaction.objectStore("translation_batch_candidates").get([processId, candidateId]),
    );
    if (row === undefined) return null;
    try {
      const candidate = cloneTranslationBatchCandidateRecordV1(
        row as TranslationBatchCandidateRecordV1,
      );
      if (candidate.processId !== processId || candidate.candidateId !== candidateId) {
        throw new TypeError("candidate identity mismatch");
      }
      return candidate;
    } catch {
      throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
    }
  };

  const translationReceiptTxV1 = async (
    transaction: IDBTransaction,
    expectation:
      import("./translation/translation-workset-repository.ts").TranslationWorksetOperationExpectationV1,
    digest: string,
  ): Promise<TranslationWorksetOperationReceiptV1 | "absent" | "mismatch"> => {
    const row = await requestResultV1(
      transaction.objectStore("translation_workset_operations").get([
        expectation.input.processId,
        expectation.input.operationId,
      ]),
    );
    if (row === undefined) return "absent";
    const stored = structuredClone(row) as TranslationWorksetOperationReceiptV1 & {
      readonly candidateId?: string | null;
    };
    const receipt: TranslationWorksetOperationReceiptV1 = {
      ...stored,
      candidateId: stored.candidateId ?? null,
    };
    if (
      receipt.processId !== expectation.input.processId ||
      receipt.operationId !== expectation.input.operationId
    ) {
      throw createProgramDataRepositoryFailureV1(
        "schema_invalid",
        "query_translation_workset_operation",
      );
    }
    return receipt.operation === expectation.operation && receipt.operationDigest === digest
      ? receipt
      : "mismatch";
  };

  const translationReceiptV1 = (
    expectation:
      import("./translation/translation-workset-repository.ts").TranslationWorksetOperationExpectationV1,
    digest: string,
    revision: number,
    candidateId: string | null = null,
  ): TranslationWorksetOperationReceiptV1 => ({
    processId: expectation.input.processId,
    operationId: expectation.input.operationId,
    operation: expectation.operation,
    operationDigest: digest,
    worksetRevision: revision,
    candidateId,
  });

  const translationImportLeaseIsCurrentTxV1 = async (
    transaction: IDBTransaction,
    input: {
      readonly processId: string;
      readonly lease: ProcessExecutionLeaseV1;
      readonly updatedAt: number;
    },
    operation:
      | "begin_translation_workset_import"
      | "append_translation_workset_import"
      | "commit_translation_workset_finalize_with_process_execution_terminal"
      | "commit_translation_batch_candidate_with_process_execution_terminal",
  ): Promise<boolean> => {
    const [processRow, leaseRow] = await Promise.all([
      requestResultV1(transaction.objectStore("processes").get(input.processId)),
      requestResultV1(
        transaction.objectStore("process_execution_leases").get(input.processId),
      ),
    ]);
    if (processRow === undefined || leaseRow === undefined) return false;
    const process = storedProcessV1(processRow, operation);
    const lease = storedProcessExecutionLeaseV1(leaseRow, operation);
    return input.updatedAt < input.lease.expiresAt &&
      exactJsonValuesEqualV1(lease, input.lease) &&
      process.activeAttempt?.attemptId === input.lease.attemptId &&
      process.activeAttempt.generation === input.lease.generation;
  };

  const prepareTranslationCandidateV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ReturnType<typeof normalizeTranslationBatchCandidatePublishInputV1>;
    readonly digest: string;
    readonly repositoryOperation:
      "commit_translation_batch_candidate_with_process_execution_terminal";
  }): Promise<PreparedTranslationCandidateV1> => {
    const expectation = { operation: "publish_candidate" as const, input: input.value };
    const [replay, current] = await Promise.all([
      translationReceiptTxV1(input.transaction, expectation, input.digest),
      loadTranslationHeadTxV1(input.transaction, input.value.processId),
    ]);
    if (replay !== "absent") {
      if (
        replay === "mismatch" || current === null || replay.candidateId === null ||
        current.revision !== replay.worksetRevision ||
        current.pendingCandidateId !== replay.candidateId
      ) return { kind: "conflict", current };
      const candidate = await loadTranslationCandidateTxV1(
        input.transaction,
        input.value.processId,
        replay.candidateId,
        input.repositoryOperation,
      );
      if (candidate === null) {
        throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
      }
      return { kind: "unchanged", head: current, candidate, operationReceipt: replay };
    }

    const leaseIsCurrent = await translationImportLeaseIsCurrentTxV1(
      input.transaction,
      input.value,
      input.repositoryOperation,
    );
    const request = input.value.request;
    if (
      !leaseIsCurrent || current === null || current.phase !== "ready" ||
      current.revision !== input.value.expectedWorksetRevision ||
      current.pendingCandidateId !== null ||
      current.acceptedUnitCount !== input.value.expectedFirstPendingOrder ||
      request.sourceLocale !== current.sourceLocale ||
      request.targetLocale !== current.targetLocale ||
      request.documentPurpose !== current.documentPurpose || request.style !== current.style ||
      request.units[0]?.order !== current.acceptedUnitCount ||
      request.units.at(-1)!.order >= current.stagedUnitCount
    ) return { kind: "conflict", current };

    const unitStore = input.transaction.objectStore("translation_workset_units");
    const authoritativeRows = await Promise.all(
      request.units.map((unit) =>
        requestResultV1(unitStore.get([input.value.processId, unit.order]))
      ),
    );
    if (
      authoritativeRows.some((row, index) =>
        row === undefined || !exactJsonValuesEqualV1(
          (() => {
            const { target: _target, ...source } = cloneTranslationWorksetUnitV1(row);
            return source;
          })(),
          { processId: input.value.processId, ...request.units[index]! },
        )
      )
    ) return { kind: "conflict", current };

    for (
      const neighboring of [
        request.neighboringUnits.preceding,
        request.neighboringUnits.following,
      ]
    ) {
      if (neighboring === null) continue;
      const row = await requestResultV1(
        unitStore.get([input.value.processId, neighboring.order]),
      );
      if (
        row === undefined || !exactJsonValuesEqualV1(
          (() => {
            const { target: _target, ...source } = cloneTranslationWorksetUnitV1(row);
            return source;
          })(),
          { processId: input.value.processId, ...neighboring },
        )
      ) return { kind: "conflict", current };
    }

    // The planner bound applicability to exact unit IDs before dispatch, and
    // the checks above already proved those units against this same workset
    // revision. Dereference only the admitted entry IDs here: this preserves
    // exact stored-term consistency without scanning every Process term again.
    const glossaryIndex = input.transaction.objectStore("translation_glossary_entries")
      .index("by_process_entry_id");
    const referencedGlossary = await Promise.all(
      request.glossary.map((entry) =>
        requestResultV1(glossaryIndex.get([input.value.processId, entry.entryId]))
      ),
    );
    if (
      referencedGlossary.some((row, index) => {
        if (row === undefined) return true;
        const stored = structuredClone(row) as TranslationWorksetGlossaryEntryV1;
        const requested = request.glossary[index]!;
        return stored.processId !== input.value.processId ||
          !Number.isSafeInteger(stored.order) || stored.order < 0 ||
          !exactJsonValuesEqualV1({
            entryId: stored.entryId,
            source: stored.source,
            target: stored.target,
            note: stored.note,
            locked: stored.locked,
          }, {
            entryId: requested.entryId,
            source: requested.source,
            target: requested.target,
            note: requested.note,
            locked: requested.locked,
          });
      })
    ) {
      return { kind: "conflict", current };
    }

    const candidateId = input.value.operationId;
    const candidate: TranslationBatchCandidateRecordV1 = {
      schemaVersion: 1,
      processId: input.value.processId,
      candidateId,
      baseWorksetRevision: input.value.expectedWorksetRevision,
      firstOrder: input.value.expectedFirstPendingOrder,
      unitCount: request.units.length,
      targets: structuredClone(input.value.candidate.targets),
      ambiguities: structuredClone(input.value.candidate.ambiguities),
      attemptId: input.value.lease.attemptId,
      generation: input.value.lease.generation,
      createdAt: input.value.updatedAt,
    };
    const head: TranslationWorksetHeadV1 = {
      ...current,
      revision: current.revision + 1,
      pendingCandidateId: candidateId,
      updatedAt: input.value.updatedAt,
    };
    const receipt = translationReceiptV1(
      expectation,
      input.digest,
      head.revision,
      candidateId,
    );
    return {
      kind: "committed",
      head,
      candidate,
      operationReceipt: receipt,
      write: async () => {
        await Promise.all([
          requestResultV1(
            input.transaction.objectStore("translation_batch_candidates").add(candidate),
          ),
          requestResultV1(
            input.transaction.objectStore("translation_workset_heads").put(head),
          ),
          requestResultV1(
            input.transaction.objectStore("translation_workset_operations").add(receipt),
          ),
        ]);
      },
    };
  };

  const prepareTranslationCandidateReviewV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: TranslationBatchCandidateAcceptInputV1 | TranslationBatchCandidateRejectInputV1;
    readonly decision: "accept_candidate" | "reject_candidate";
    readonly digest: string;
    readonly repositoryOperation:
      | "accept_translation_batch_candidate"
      | "reject_translation_batch_candidate";
  }): Promise<PreparedTranslationCandidateReviewV1> => {
    const expectation = input.decision === "accept_candidate"
      ? {
        operation: "accept_candidate" as const,
        input: input.value as TranslationBatchCandidateAcceptInputV1,
      }
      : {
        operation: "reject_candidate" as const,
        input: input.value as TranslationBatchCandidateRejectInputV1,
      };
    const [replay, current] = await Promise.all([
      translationReceiptTxV1(input.transaction, expectation, input.digest),
      loadTranslationHeadTxV1(input.transaction, input.value.processId),
    ]);
    if (replay !== "absent") {
      if (
        replay === "mismatch" || current === null ||
        replay.candidateId !== input.value.candidateId ||
        current.revision !== replay.worksetRevision || current.pendingCandidateId !== null
      ) return { kind: "conflict", current };
      return { kind: "unchanged", head: current, operationReceipt: replay };
    }
    if (
      current === null || current.phase !== "ready" ||
      current.revision !== input.value.expectedWorksetRevision ||
      current.pendingCandidateId !== input.value.candidateId
    ) return { kind: "conflict", current };
    const candidate = await loadTranslationCandidateTxV1(
      input.transaction,
      input.value.processId,
      input.value.candidateId,
      input.repositoryOperation,
    );
    if (candidate === null) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const nextAcceptedUnitCount = current.acceptedUnitCount + candidate.unitCount;
    if (
      candidate.baseWorksetRevision + 1 !== current.revision ||
      candidate.firstOrder !== current.acceptedUnitCount ||
      candidate.targets.length !== candidate.unitCount ||
      !Number.isSafeInteger(nextAcceptedUnitCount) ||
      nextAcceptedUnitCount > current.stagedUnitCount
    ) throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);

    const unitStore = input.transaction.objectStore("translation_workset_units");
    const units = await Promise.all(
      candidate.targets.map((target, index) =>
        requestResultV1(unitStore.get([
          input.value.processId,
          candidate.firstOrder + index,
        ])).then((row) => {
          if (row === undefined) {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              input.repositoryOperation,
            );
          }
          const unit = cloneTranslationWorksetUnitV1(row);
          if (
            unit.processId !== input.value.processId ||
            unit.order !== candidate.firstOrder + index || unit.unitId !== target.unitId ||
            unit.target !== null
          ) {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              input.repositoryOperation,
            );
          }
          return unit;
        })
      ),
    );

    let acceptedTargets: TranslationBatchCandidateAcceptInputV1["targets"] = [];
    if (input.decision === "accept_candidate") {
      const value = input.value as TranslationBatchCandidateAcceptInputV1;
      if (
        value.targets.length !== candidate.unitCount ||
        value.targets.some((target, index) =>
          target.unitId !== candidate.targets[index]?.unitId ||
          target.unitId !== units[index]?.unitId ||
          !translationTargetPreservesProtectedStructureV1(units[index]!, target.target)
        )
      ) return { kind: "conflict", current };
      acceptedTargets = value.targets;
    }

    const acceptedBatchCount = input.decision === "accept_candidate"
      ? current.acceptedBatchCount + 1
      : current.acceptedBatchCount;
    if (!Number.isSafeInteger(acceptedBatchCount)) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", input.repositoryOperation);
    }
    const head: TranslationWorksetHeadV1 = {
      ...current,
      revision: current.revision + 1,
      acceptedUnitCount: input.decision === "accept_candidate"
        ? nextAcceptedUnitCount
        : current.acceptedUnitCount,
      acceptedBatchCount,
      pendingCandidateId: null,
      updatedAt: input.value.updatedAt,
    };
    const receipt = translationReceiptV1(
      expectation,
      input.digest,
      head.revision,
      input.value.candidateId,
    );
    return {
      kind: "committed",
      head,
      operationReceipt: receipt,
      write: async () => {
        const writes: Promise<unknown>[] = [
          requestResultV1(
            input.transaction.objectStore("translation_workset_heads").put(head),
          ),
          requestResultV1(
            input.transaction.objectStore("translation_workset_operations").add(receipt),
          ),
          requestResultV1(
            input.transaction.objectStore("translation_batch_candidates").delete([
              input.value.processId,
              input.value.candidateId,
            ]),
          ),
        ];
        if (input.decision === "accept_candidate") {
          writes.push(...units.map((unit, index) =>
            requestResultV1(unitStore.put({
              ...unit,
              target: acceptedTargets[index]!.target,
            }))
          ));
        }
        await Promise.all(writes);
      },
    };
  };

  const prepareTranslationFinalizeV1 = async (input: {
    readonly transaction: IDBTransaction;
    readonly value: ReturnType<typeof normalizeTranslationWorksetFinalizeImportInputV1>;
    readonly digest: string;
    readonly repositoryOperation:
      "commit_translation_workset_finalize_with_process_execution_terminal";
  }): Promise<PreparedTranslationFinalizeV1> => {
    const expectation = { operation: "finalize" as const, input: input.value };
    const [replay, current] = await Promise.all([
      translationReceiptTxV1(input.transaction, expectation, input.digest),
      loadTranslationHeadTxV1(input.transaction, input.value.processId),
    ]);
    if (replay !== "absent") {
      if (
        replay === "mismatch" || current === null || current.phase !== "ready" ||
        current.revision !== replay.worksetRevision ||
        !exactJsonValuesEqualV1(current.sourceBinding, input.value.sourceBinding)
      ) return { kind: "conflict", current };
      return { kind: "unchanged", head: current, operationReceipt: replay };
    }
    const [leaseIsCurrent, bindingRow] = await Promise.all([
      translationImportLeaseIsCurrentTxV1(
        input.transaction,
        input.value,
        input.repositoryOperation,
      ),
      requestResultV1(
        input.transaction.objectStore("process_workspace_bindings").get(input.value.processId),
      ),
    ]);
    if (
      !leaseIsCurrent || current === null || current.phase !== "staging" ||
      current.revision !== input.value.expectedWorksetRevision ||
      current.stagedUnitCount !== current.expectedUnitCount ||
      current.stagedGlossaryCount !== current.expectedGlossaryCount || bindingRow === undefined ||
      cloneProcessWorkspaceBindingV1(bindingRow as ProcessWorkspaceBindingV1).workspaceId !==
        input.value.sourceBinding.workspaceId ||
      !exactJsonValuesEqualV1(current.sourceBinding, input.value.sourceBinding) ||
      current.source.workspacePath !== input.value.sourceBinding.path
    ) return { kind: "conflict", current };
    const revision = current.revision + 1;
    const head: TranslationWorksetHeadV1 = {
      ...current,
      revision,
      phase: "ready",
      updatedAt: input.value.updatedAt,
    };
    const receipt = translationReceiptV1(expectation, input.digest, revision);
    return {
      kind: "committed",
      head,
      operationReceipt: receipt,
      write: async () => {
        await Promise.all([
          requestResultV1(
            input.transaction.objectStore("translation_workset_heads").put(head),
          ),
          requestResultV1(
            input.transaction.objectStore("translation_workset_operations").add(receipt),
          ),
        ]);
      },
    };
  };

  const loadTranslationPageV1 = async <
    TRow extends { readonly processId: string; readonly order: number },
  >(
    input:
      import("./translation/translation-workset-repository.ts").TranslationWorksetPageRequestV1,
    storeName: "translation_workset_units" | "translation_glossary_entries",
    operation: "load_translation_workset_unit_page" | "load_translation_workset_glossary_page",
  ): Promise<
    import("./translation/translation-workset-repository.ts").TranslationWorksetPageResultV1<TRow>
  > =>
    await runV1(
      operation,
      ["translation_workset_heads", storeName],
      "readonly",
      async (transaction) => {
        const head = await loadTranslationHeadTxV1(transaction, input.processId);
        if (head === null || head.revision !== input.expectedWorksetRevision) {
          return { kind: "conflict" as const, current: head };
        }
        const rows: TRow[] = [];
        let byteLength = 0;
        let stopped = false;
        let expectedOrder = input.fromOrder;
        const stagedCount = storeName === "translation_workset_units"
          ? head.stagedUnitCount
          : head.stagedGlossaryCount;
        const range = keyRange.bound([input.processId, input.fromOrder], [
          input.processId,
          Number.MAX_SAFE_INTEGER,
        ]);
        await cursorWalkV1(transaction.objectStore(storeName).openCursor(range), (cursor) => {
          const row = (storeName === "translation_workset_units"
            ? cloneTranslationWorksetUnitV1(cursor.value)
            : structuredClone(cursor.value)) as TRow;
          if (
            row.processId !== input.processId || !Number.isSafeInteger(row.order) ||
            row.order !== expectedOrder
          ) {
            throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
          }
          const bytes = translationWorksetRowUtf8ByteLengthV1(row);
          if (byteLength + bytes > input.maximumBytes) {
            stopped = true;
            return "stop";
          }
          rows.push(row);
          byteLength += bytes;
          expectedOrder += 1;
          if (rows.length === input.maximumRows) {
            stopped = expectedOrder < stagedCount;
            return "stop";
          }
          return "continue";
        });
        if (stopped && rows.length === 0) {
          throw createProgramDataRepositoryFailureV1("page_budget_too_small", operation);
        }
        if (expectedOrder < stagedCount && !stopped) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
        }
        return {
          kind: "page" as const,
          page: {
            processId: input.processId,
            worksetRevision: head.revision,
            fromOrder: input.fromOrder,
            rows,
            byteLength,
            nextOrder: expectedOrder < stagedCount ? expectedOrder : null,
          },
        };
      },
    );

  const repository: IndexedDbProgramDataRepositoryImplementationV1 = {
    async initialize() {
      await databaseV1("initialize");
    },

    async listPrograms(rawInput) {
      const input = normalizeProgramCatalogListInputV1(rawInput);
      return await runV1("list_programs", ["program_heads"], "readonly", async (transaction) => {
        const range = input.before === null
          ? null
          : keyRange.upperBound([input.before.updatedAt, input.before.programId], true);
        const summaries: ProgramCatalogSummaryV1[] = [];
        let bytes = 0;
        let stopped = false;
        await cursorWalkV1(
          transaction.objectStore("program_heads").index("by_updated_at").openCursor(range, "prev"),
          (cursor) => {
            const projection = storedHeadProjectionV1(cursor.value, "list_programs");
            const head = projection.head;
            // The normalized revision owns name/kind. Loading it from this readonly
            // cursor would require an async gap, so V8 heads persist this compact projection.
            const summary: ProgramCatalogSummaryV1 = {
              programId: head.programId,
              name: projection.name,
              kind: projection.kind,
              programRevision: head.currentProgramRevision,
              proposalStatus: head.proposal.status,
              repositoryRevision: head.repositoryRevision,
              updatedAt: head.updatedAt,
            };
            const nextBytes = new TextEncoder().encode(JSON.stringify(summary)).byteLength;
            if (bytes + nextBytes > input.maximumBytes) {
              stopped = true;
              return "stop";
            }
            summaries.push(summary);
            bytes += nextBytes;
            return "continue";
          },
        );
        if (stopped && summaries.length === 0) {
          throw createProgramDataRepositoryFailureV1("page_budget_too_small", "list_programs");
        }
        const last = summaries.at(-1);
        return {
          summaries,
          nextCursor: stopped && last !== undefined
            ? { updatedAt: last.updatedAt, programId: last.programId }
            : null,
        };
      });
    },

    async load(rawProgramId) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      return await runV1(
        "load_program",
        ["program_heads", "program_revisions", "program_decisions"],
        "readonly",
        (transaction) => loadCatalogRecordV1(transaction, programId, "load_program"),
      );
    },

    async loadProgramRevision(rawProgramId, rawRevision) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      const revision = normalizeProgramCatalogRevisionV1(rawRevision);
      return await runV1(
        "load_program_revision",
        ["program_revisions"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("program_revisions").get([programId, revision]),
          );
          return row === undefined ? null : storedRevisionV1(row, "load_program_revision");
        },
      );
    },

    async loadDecision(rawProgramId, rawProposalId, rawProgramRevision) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      const proposalId = normalizeProgramCatalogProposalIdV1(rawProposalId);
      const programRevision = normalizeProgramCatalogRevisionV1(rawProgramRevision);
      return await runV1(
        "load_program_decision",
        ["program_decisions"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("program_decisions").get([
              programId,
              proposalId,
              programRevision,
            ]),
          );
          return row === undefined
            ? null
            : storedDecisionV1(row, programId, "load_program_decision");
        },
      );
    },

    async loadLatestAcceptedDecision(rawProgramId) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      return await runV1(
        "load_latest_accepted_program_decision",
        ["program_heads", "program_decisions"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("program_heads").get(programId),
          );
          if (row === undefined) return null;
          const reference =
            storedHeadV1(row, "load_latest_accepted_program_decision").latestAccepted;
          if (reference === null) return null;
          const decisionRow = await requestResultV1(
            transaction.objectStore("program_decisions").get([
              programId,
              reference.proposalId,
              reference.programRevision,
            ]),
          );
          if (decisionRow === undefined) {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_latest_accepted_program_decision",
            );
          }
          const decision = storedDecisionV1(
            decisionRow,
            programId,
            "load_latest_accepted_program_decision",
          );
          if (decision.status !== "accepted") {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_latest_accepted_program_decision",
            );
          }
          return decision;
        },
      );
    },

    async listAcceptedDecisions(rawInput) {
      const input = normalizeProgramCatalogAcceptedDecisionListInputV1(rawInput);
      return await runV1(
        "list_accepted_program_decisions",
        ["program_decisions"],
        "readonly",
        async (transaction) => {
          const upper = input.beforeProgramRevision ?? Number.MAX_SAFE_INTEGER;
          const range = keyRange.bound(
            [input.programId, 0],
            [input.programId, upper],
            false,
            input.beforeProgramRevision !== null,
          );
          const decisions: ProgramCatalogAcceptedDecisionV1[] = [];
          let bytes = 0;
          let stopped = false;
          let lastScanned: number | null = null;
          await cursorWalkV1(
            transaction.objectStore("program_decisions").index("by_program_revision").openCursor(
              range,
              "prev",
            ),
            (cursor) => {
              const decision = storedDecisionV1(
                cursor.value,
                input.programId,
                "list_accepted_program_decisions",
              );
              const nextBytes = new TextEncoder().encode(JSON.stringify(decision)).byteLength;
              if (bytes + nextBytes > input.maximumBytes) {
                stopped = true;
                return "stop";
              }
              bytes += nextBytes;
              lastScanned = decision.programRevision;
              if (decision.status === "accepted") decisions.push(decision);
              return "continue";
            },
          );
          if (stopped && lastScanned === null) {
            throw createProgramDataRepositoryFailureV1(
              "page_budget_too_small",
              "list_accepted_program_decisions",
            );
          }
          return { decisions, nextCursor: stopped ? lastScanned : null };
        },
      );
    },

    async loadContinuation(rawProgramId) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      return await runV1(
        "load_workspace_continuation",
        ["workspace_continuations"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("workspace_continuations").get(programId),
          );
          return row === undefined
            ? null
            : storedContinuationV1(row, "load_workspace_continuation");
        },
      );
    },

    async create(rawInput) {
      const input = normalizeProgramCatalogCreateInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "create_program",
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramCatalogCommitResultV1> => {
          const prepared = await prepareCreateCatalogV1(
            transaction,
            input,
            digest,
            "create_program",
          );
          if (prepared.kind !== "committed") return prepared;
          await prepared.write();
          return { kind: "committed", record: prepared.record };
        },
      );
    },

    async applyRevision(rawInput) {
      const input = normalizeProgramCatalogApplyRevisionInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "apply_program_revision",
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramCatalogCommitResultV1> => {
          const prepared = await prepareApplyCatalogRevisionV1(
            transaction,
            input,
            digest,
            "apply_program_revision",
          );
          if (prepared.kind !== "committed") return prepared;
          await prepared.write();
          return { kind: "committed", record: prepared.record };
        },
      );
    },

    async decide(rawInput) {
      const input = normalizeProgramCatalogDecideInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "decide_program_proposal",
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramCatalogCommitResultV1> => {
          const prepared = await prepareDecideCatalogV1(
            transaction,
            input,
            digest,
            "decide_program_proposal",
          );
          if (prepared.kind !== "committed") return prepared;
          await prepared.write();
          return { kind: "committed", record: prepared.record };
        },
      );
    },

    async createProgramWithProcess(rawInput) {
      const input = normalizeProgramProcessCreateBundleInputV1(rawInput);
      const [catalogDigest, processDigest] = await Promise.all([
        digestV1(input.catalog),
        digestV1({ process: input.process, transcript: input.transcript }),
      ]);
      const operation = "create_program_with_process" as const;
      return await runV1(
        operation,
        [
          "program_definitions",
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
          "processes",
          "transcript_entries",
          "process_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramProcessCreateCompositeCommitResultV1> => {
          const programId = input.catalog.program.programId;
          const currentProgram = await loadCatalogRecordV1(transaction, programId, operation);
          const currentProcess = await loadProcessTxV1(
            transaction,
            input.process.processId,
            operation,
          );
          const catalog = await prepareCreateCatalogV1(
            transaction,
            input.catalog,
            catalogDigest,
            operation,
          );
          const processCommitRow = await requestResultV1(
            transaction.objectStore("process_commits").get([
              input.process.processId,
              input.transcript.commitId,
            ]),
          );
          let initialProcess: ProcessHeadV1 | undefined;
          if (processCommitRow === undefined) {
            if (currentProcess !== null) {
              return { kind: "conflict", currentProgram, currentProcess };
            }
            const definitionRow = await requestResultV1(
              transaction.objectStore("program_definitions").get([
                input.process.programDefinition.programId,
                input.process.programDefinition.revision,
              ]),
            );
            if (definitionRow === undefined) {
              return {
                kind: "program_definition_missing",
                programDefinition: input.process.programDefinition,
              };
            }
            try {
              cloneProgramDefinitionRevisionV1(definitionRow as ProgramDefinitionRevisionV1);
            } catch {
              throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
            }
            initialProcess = cloneProcessHeadV1({
              schemaVersion: 1,
              processId: input.process.processId,
              revision: 1,
              programDefinition: input.process.programDefinition,
              subjectProgramId: input.process.subjectProgramId,
              status: "active",
              transcriptFrontier: 0,
              activeAttempt: null,
              lastTerminalAttempt: null,
              checkpoint: null,
              createdAt: input.process.createdAt,
              updatedAt: input.process.createdAt,
            });
          }
          const process = await prepareProcessTranscriptAppendV1({
            transaction,
            value: input.transcript,
            digest: processDigest,
            repositoryOperation: operation,
            ...(initialProcess === undefined ? {} : { initialProcess }),
          });
          if (
            catalog.kind === "conflict" || process.kind === "conflict" ||
            catalog.kind !== process.kind ||
            process.process.subjectProgramId !== programId
          ) return { kind: "conflict", currentProgram, currentProcess };
          if (catalog.kind === "unchanged" && process.kind === "unchanged") {
            return {
              kind: "unchanged",
              record: catalog.record,
              process: process.process,
              entries: process.entries,
              terminalAttemptReceipt: process.terminalAttemptReceipt,
            };
          }
          if (catalog.kind !== "committed" || process.kind !== "committed") {
            return { kind: "conflict", currentProgram, currentProcess };
          }
          await Promise.all([catalog.write(), process.write()]);
          return {
            kind: "committed",
            record: catalog.record,
            process: process.process,
            entries: process.entries,
            terminalAttemptReceipt: process.terminalAttemptReceipt,
          };
        },
      );
    },

    async createProcessWithWorkspace(rawInput) {
      const input = normalizeProcessWorkspaceCreateBundleInputV1(rawInput);
      const subjectProgramId = input.process.subjectProgramId;
      if (subjectProgramId === null) {
        throw new TypeError("Process Workspace creation requires a subject Program");
      }
      const digest = await digestV1(input);
      const operation = "create_process_with_workspace" as const;
      return await runV1(
        operation,
        [
          "program_definitions",
          "program_decisions",
          "program_heads",
          "program_revisions",
          "processes",
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
            const [definitionRow, subjectProgram] = await Promise.all([
              requestResultV1(
                transaction.objectStore("program_definitions").get([
                  input.process.programDefinition.programId,
                  input.process.programDefinition.revision,
                ]),
              ),
              loadCatalogRecordV1(transaction, subjectProgramId, operation),
            ]);
            if (definitionRow === undefined) {
              return {
                kind: "program_definition_missing",
                programDefinition: input.process.programDefinition,
              };
            }
            let definition: ProgramDefinitionRevisionV1;
            try {
              definition = cloneProgramDefinitionRevisionV1(
                definitionRow as ProgramDefinitionRevisionV1,
              );
            } catch {
              throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
            }
            if (definition.kind === "creator") {
              throw new TypeError("Process Workspace creation requires a non-Creator definition");
            }
            if (subjectProgram === null) {
              return { kind: "subject_program_missing", subjectProgramId };
            }
            if (subjectProgram.head.programId !== subjectProgramId) {
              throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
            }
            initialProcess = cloneProcessHeadV1({
              schemaVersion: 1,
              processId: input.process.processId,
              revision: 1,
              programDefinition: input.process.programDefinition,
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
          const process = await prepareProcessTranscriptAppendV1({
            transaction,
            value: input.transcript,
            digest,
            repositoryOperation: operation,
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

    async applyProgramRevisionWithProcessTranscript(rawInput) {
      const input = normalizeProgramProcessRevisionBundleInputV1(rawInput);
      const [catalogDigest, processDigest] = await Promise.all([
        digestV1(input.catalog),
        digestV1(input.transcript),
      ]);
      const operation = "apply_program_revision_with_process_transcript" as const;
      return await runV1(
        operation,
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
          "processes",
          "transcript_entries",
          "process_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramProcessCompositeCommitResultV1> => {
          const currentProgram = await loadCatalogRecordV1(
            transaction,
            input.catalog.programId,
            operation,
          );
          const currentProcess = await loadProcessTxV1(
            transaction,
            input.transcript.processId,
            operation,
          );
          const [catalog, process] = await Promise.all([
            prepareApplyCatalogRevisionV1(
              transaction,
              input.catalog,
              catalogDigest,
              operation,
            ),
            prepareProcessTranscriptAppendV1({
              transaction,
              value: input.transcript,
              digest: processDigest,
              repositoryOperation: operation,
            }),
          ]);
          if (
            catalog.kind === "conflict" || process.kind === "conflict" ||
            catalog.kind !== process.kind ||
            process.process.subjectProgramId !== input.catalog.programId
          ) return { kind: "conflict", currentProgram, currentProcess };
          if (catalog.kind === "unchanged" && process.kind === "unchanged") {
            return {
              kind: "unchanged",
              record: catalog.record,
              process: process.process,
              entries: process.entries,
              terminalAttemptReceipt: process.terminalAttemptReceipt,
            };
          }
          if (catalog.kind !== "committed" || process.kind !== "committed") {
            return { kind: "conflict", currentProgram, currentProcess };
          }
          await Promise.all([catalog.write(), process.write()]);
          return {
            kind: "committed",
            record: catalog.record,
            process: process.process,
            entries: process.entries,
            terminalAttemptReceipt: process.terminalAttemptReceipt,
          };
        },
      );
    },

    async decideProgramWithProcessTranscript(rawInput) {
      const input = normalizeProgramProcessDecisionBundleInputV1(rawInput);
      const [catalogDigest, processDigest] = await Promise.all([
        digestV1(input.catalog),
        digestV1(input.transcript),
      ]);
      const operation = "decide_program_with_process_transcript" as const;
      return await runV1(
        operation,
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "catalog_commits",
          "processes",
          "transcript_entries",
          "process_commits",
        ],
        "readwrite",
        async (transaction): Promise<ProgramProcessCompositeCommitResultV1> => {
          const currentProgram = await loadCatalogRecordV1(
            transaction,
            input.catalog.programId,
            operation,
          );
          const currentProcess = await loadProcessTxV1(
            transaction,
            input.transcript.processId,
            operation,
          );
          const [catalog, process] = await Promise.all([
            prepareDecideCatalogV1(
              transaction,
              input.catalog,
              catalogDigest,
              operation,
            ),
            prepareProcessTranscriptAppendV1({
              transaction,
              value: input.transcript,
              digest: processDigest,
              repositoryOperation: operation,
            }),
          ]);
          if (
            catalog.kind === "conflict" || process.kind === "conflict" ||
            catalog.kind !== process.kind ||
            process.process.subjectProgramId !== input.catalog.programId
          ) return { kind: "conflict", currentProgram, currentProcess };
          if (catalog.kind === "unchanged" && process.kind === "unchanged") {
            return {
              kind: "unchanged",
              record: catalog.record,
              process: process.process,
              entries: process.entries,
              terminalAttemptReceipt: process.terminalAttemptReceipt,
            };
          }
          if (catalog.kind !== "committed" || process.kind !== "committed") {
            return { kind: "conflict", currentProgram, currentProcess };
          }
          await Promise.all([catalog.write(), process.write()]);
          return {
            kind: "committed",
            record: catalog.record,
            process: process.process,
            entries: process.entries,
            terminalAttemptReceipt: process.terminalAttemptReceipt,
          };
        },
      );
    },

    async publishProgramDefinitionRevision(rawDefinition) {
      const definition = cloneProgramDefinitionRevisionV1(rawDefinition);
      return await runV1(
        "publish_program_definition_revision",
        ["program_definitions"],
        "readwrite",
        async (transaction) => {
          const store = transaction.objectStore("program_definitions");
          const row = await requestResultV1(store.get([definition.programId, definition.revision]));
          if (row !== undefined) {
            let current: ProgramDefinitionRevisionV1;
            try {
              current = cloneProgramDefinitionRevisionV1(row as ProgramDefinitionRevisionV1);
            } catch {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                "publish_program_definition_revision",
              );
            }
            return exactJsonValuesEqualV1(current, definition)
              ? { kind: "unchanged" as const, definition: current }
              : { kind: "conflict" as const, current };
          }
          await requestResultV1(store.add(definition));
          return { kind: "committed" as const, definition };
        },
      );
    },

    async loadProgramDefinitionRevision(rawProgramId, rawRevision) {
      const programId = normalizeProgramIdV1(rawProgramId);
      const revision = normalizeRevisionV1(rawRevision);
      return await runV1(
        "load_program_definition_revision",
        ["program_definitions"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("program_definitions").get([programId, revision]),
          );
          if (row === undefined) return null;
          try {
            return cloneProgramDefinitionRevisionV1(row as ProgramDefinitionRevisionV1);
          } catch {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_program_definition_revision",
            );
          }
        },
      );
    },

    async createProcess(rawInput) {
      const input = normalizeProcessCreateInputV1(rawInput);
      return await runV1(
        "create_process",
        ["program_definitions", "processes"],
        "readwrite",
        async (transaction) => {
          const definitionRow = await requestResultV1(
            transaction.objectStore("program_definitions").get([
              input.programDefinition.programId,
              input.programDefinition.revision,
            ]),
          );
          if (definitionRow === undefined) {
            return {
              kind: "program_definition_missing" as const,
              programDefinition: input.programDefinition,
            };
          }
          try {
            cloneProgramDefinitionRevisionV1(definitionRow as ProgramDefinitionRevisionV1);
          } catch {
            throw createProgramDataRepositoryFailureV1("schema_invalid", "create_process");
          }
          const current = await loadProcessTxV1(transaction, input.processId, "create_process");
          const candidate = cloneProcessHeadV1({
            schemaVersion: 1,
            processId: input.processId,
            revision: 1,
            programDefinition: input.programDefinition,
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
              exactJsonValuesEqualV1(current.programDefinition, candidate.programDefinition);
            return same
              ? { kind: "unchanged" as const, process: current }
              : { kind: "conflict" as const, current };
          }
          await requestResultV1(
            transaction.objectStore("processes").add(encodeProcessV1(candidate)),
          );
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

    async beginProcessAttempt(rawInput) {
      const input = normalizeProcessAttemptBeginInputV1(rawInput);
      const digest = await digestV1(input);
      return await runV1(
        "begin_process_attempt",
        ["processes", "transcript_entries", "process_commits"],
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
        ["processes", "transcript_entries", "process_commits", "process_execution_leases"],
        "readwrite",
        async (transaction) => {
          const prepared = await prepareExecutionAcquireV1({
            transaction,
            value: input,
            operation: "execution_acquire",
            digest,
            repositoryOperation: "acquire_process_execution",
          });
          if (
            prepared.kind !== "conflict" &&
            prepared.process.programDefinition.programId === bundledTranslationProgramIdV1 &&
            prepared.process.programDefinition.revision === 1
          ) {
            throw new TypeError(
              "A Translation Process must acquire execution with its workset expectation",
            );
          }
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

    async acquireTranslationWorksetImportExecution(rawInput) {
      const input = normalizeTranslationWorksetImportExecutionAcquireInputV1(rawInput);
      const digest = await digestV1(input);
      const operation = "acquire_translation_workset_import_execution" as const;
      return await runV1(
        operation,
        [
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
          "translation_workset_heads",
        ],
        "readwrite",
        async (transaction): Promise<TranslationWorksetImportExecutionAcquireResultV1> => {
          const processId = input.execution.attempt.processId;
          const [currentWorkset, currentProcess, currentLease, prepared] = await Promise.all([
            loadTranslationHeadTxV1(transaction, processId),
            loadProcessTxV1(transaction, processId, operation),
            loadProcessExecutionLeaseTxV1(transaction, processId, operation),
            prepareExecutionAcquireV1({
              transaction,
              value: input.execution,
              operation: "translation_workset_import_execution_acquire",
              digest,
              repositoryOperation: operation,
            }),
          ]);
          if (prepared.kind === "unchanged") {
            return {
              kind: "unchanged",
              process: prepared.process,
              entries: prepared.entries,
              lease: prepared.lease,
              operationReceipt: prepared.operationReceipt,
            };
          }
          if (
            prepared.kind === "conflict" ||
            prepared.process.programDefinition.programId !== bundledTranslationProgramIdV1 ||
            prepared.process.programDefinition.revision !== 1 ||
            (input.expectedWorksetRevision === null
              ? currentWorkset !== null
              : currentWorkset === null || currentWorkset.phase !== "staging" ||
                currentWorkset.revision !== input.expectedWorksetRevision)
          ) return { kind: "conflict", currentWorkset, currentProcess, currentLease };
          await prepared.write();
          return {
            kind: "committed",
            process: prepared.process,
            entries: prepared.entries,
            lease: prepared.lease,
            operationReceipt: prepared.operationReceipt,
          };
        },
      );
    },

    async acquireTranslationBatchExecution(rawInput) {
      const input = normalizeTranslationBatchExecutionAcquireInputV1(rawInput);
      const digest = await digestV1(input);
      const operation = "acquire_translation_batch_execution" as const;
      return await runV1(
        operation,
        [
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
          "translation_workset_heads",
        ],
        "readwrite",
        async (transaction): Promise<TranslationBatchExecutionAcquireResultV1> => {
          const processId = input.execution.attempt.processId;
          const [currentWorkset, currentProcess, currentLease, prepared] = await Promise.all([
            loadTranslationHeadTxV1(transaction, processId),
            loadProcessTxV1(transaction, processId, operation),
            loadProcessExecutionLeaseTxV1(transaction, processId, operation),
            prepareExecutionAcquireV1({
              transaction,
              value: input.execution,
              operation: "translation_batch_execution_acquire",
              digest,
              repositoryOperation: operation,
            }),
          ]);
          if (prepared.kind === "unchanged") {
            return {
              kind: "unchanged",
              process: prepared.process,
              entries: prepared.entries,
              lease: prepared.lease,
              operationReceipt: prepared.operationReceipt,
            };
          }
          if (
            prepared.kind === "conflict" ||
            prepared.process.programDefinition.programId !== bundledTranslationProgramIdV1 ||
            prepared.process.programDefinition.revision !== 1 || currentWorkset === null ||
            currentWorkset.phase !== "ready" ||
            currentWorkset.revision !== input.expectedWorksetRevision ||
            currentWorkset.acceptedUnitCount !== input.expectedFirstPendingOrder ||
            currentWorkset.pendingCandidateId !== input.expectedPendingCandidateId ||
            currentWorkset.acceptedUnitCount >= currentWorkset.stagedUnitCount
          ) return { kind: "conflict", currentWorkset, currentProcess, currentLease };
          await prepared.write();
          return {
            kind: "committed",
            process: prepared.process,
            entries: prepared.entries,
            lease: prepared.lease,
            operationReceipt: prepared.operationReceipt,
          };
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

    async commitProcessExecutionTerminal(rawInput) {
      const input = normalizeProcessExecutionTerminalInputV1(rawInput);
      const digest = await digestV1(input);
      const operation = "commit_process_execution_terminal" as const;
      return await runV1(
        operation,
        [
          "program_definitions",
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
        ],
        "readwrite",
        async (transaction) => {
          if (input.transcript.terminalAttemptReceipt?.outcome === "completed") {
            const process = await loadProcessTxV1(
              transaction,
              input.transcript.processId,
              operation,
            );
            if (process !== null) {
              const definitionRow = await requestResultV1(
                transaction.objectStore("program_definitions").get([
                  process.programDefinition.programId,
                  process.programDefinition.revision,
                ]),
              );
              if (definitionRow === undefined) {
                throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
              }
              let definition: ProgramDefinitionRevisionV1;
              try {
                definition = cloneProgramDefinitionRevisionV1(
                  definitionRow as ProgramDefinitionRevisionV1,
                );
              } catch {
                throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
              }
              if (definition.kind === "creator") {
                throw new TypeError(
                  "A Creator Process must publish a completed terminal with its Program successor",
                );
              }
              if (definition.kind === "translation") {
                throw new TypeError(
                  "A Translation Process must publish a completed terminal with its workset finalize",
                );
              }
            }
          }
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

    async commitProgramRevisionWithProcessExecutionTerminal(rawInput) {
      const input = normalizeProgramProcessExecutionRevisionBundleInputV1(rawInput);
      const operationDigest = await digestV1(input);
      const operation = "commit_program_revision_with_process_execution_terminal" as const;
      return await runV1(
        operation,
        [
          "program_heads",
          "program_revisions",
          "program_decisions",
          "workspace_continuations",
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
        ],
        "readwrite",
        async (transaction): Promise<ProgramProcessExecutionCompositeCommitResultV1> => {
          const [currentProgram, currentProcess, currentLease] = await Promise.all([
            loadCatalogRecordV1(transaction, input.catalog.programId, operation),
            loadProcessTxV1(transaction, input.transcript.processId, operation),
            loadProcessExecutionLeaseTxV1(
              transaction,
              input.transcript.processId,
              operation,
            ),
          ]);
          const terminal = await prepareExecutionTerminalV1({
            transaction,
            value: input,
            digest: operationDigest,
            operation: "program_revision_terminal",
            repositoryOperation: operation,
            program: {
              programId: input.catalog.programId,
              programRevision: input.catalog.program.revision,
              repositoryRevision: input.catalog.expectedRepositoryRevision + 1,
              expectedProgram: input.catalog.program,
            },
          });
          if (
            terminal.kind === "conflict" ||
            terminal.process.subjectProgramId !== input.catalog.programId
          ) return { kind: "conflict", currentProgram, currentProcess, currentLease };
          if (terminal.kind === "unchanged") {
            if (
              currentProgram === null || terminal.operationReceipt.programId === null ||
              terminal.operationReceipt.programRevision === null ||
              terminal.operationReceipt.repositoryRevision === null ||
              currentProgram.head.currentProgramRevision <
                terminal.operationReceipt.programRevision ||
              currentProgram.head.repositoryRevision < terminal.operationReceipt.repositoryRevision
            ) {
              throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
            }
            return {
              kind: "unchanged",
              record: currentProgram,
              process: terminal.process,
              entries: terminal.entries,
              operationReceipt: terminal.operationReceipt,
            };
          }
          const catalog = await prepareApplyCatalogRevisionForExecutionTerminalV1(
            transaction,
            input.catalog,
            operation,
          );
          if (catalog.kind !== "committed") {
            return { kind: "conflict", currentProgram, currentProcess, currentLease };
          }
          if (
            catalog.record.head.currentProgramRevision !==
              terminal.operationReceipt.programRevision ||
            catalog.record.head.repositoryRevision !==
              terminal.operationReceipt.repositoryRevision
          ) {
            throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
          }
          await Promise.all([catalog.write(), terminal.write()]);
          return {
            kind: "committed",
            record: catalog.record,
            process: terminal.process,
            entries: terminal.entries,
            operationReceipt: terminal.operationReceipt,
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
      } else if (expectation.operation === "translation_workset_import_execution_acquire") {
        const input = normalizeTranslationWorksetImportExecutionAcquireInputV1(expectation.input);
        processId = input.execution.attempt.processId;
        operationId = input.execution.attempt.commitId;
        expectedOperation = "translation_workset_import_execution_acquire";
        expectedInput = input;
        normalizedExpectation = {
          operation: "translation_workset_import_execution_acquire",
          input,
        };
      } else if (expectation.operation === "translation_batch_execution_acquire") {
        const input = normalizeTranslationBatchExecutionAcquireInputV1(expectation.input);
        processId = input.execution.attempt.processId;
        operationId = input.execution.attempt.commitId;
        expectedOperation = "translation_batch_execution_acquire";
        expectedInput = input;
        normalizedExpectation = { operation: "translation_batch_execution_acquire", input };
      } else if (expectation.operation === "execution_terminal") {
        const input = normalizeProcessExecutionTerminalInputV1(expectation.input);
        processId = input.transcript.processId;
        operationId = input.transcript.commitId;
        expectedOperation = "execution_terminal";
        expectedInput = input;
        normalizedExpectation = { operation: "execution_terminal", input };
      } else {
        const input = normalizeProgramProcessExecutionRevisionBundleInputV1(expectation.input);
        processId = input.transcript.processId;
        operationId = input.transcript.commitId;
        expectedOperation = "program_revision_terminal";
        expectedInput = input;
        normalizedExpectation = { operation: "program_revision_terminal", input };
      }
      const digest = await digestV1(expectedInput);
      return await runV1(
        "query_process_operation",
        normalizedExpectation.operation === "program_revision_terminal"
          ? ["process_commits", "processes", "transcript_entries", "program_revisions"]
          : ["process_commits", "processes", "transcript_entries"],
        "readonly",
        async (transaction) => {
          const row = await requestResultV1(
            transaction.objectStore("process_commits").get([processId, operationId]),
          );
          if (row === undefined) return { kind: "absent" } as const;
          let receipt: ProcessOperationReceiptV1;
          try {
            receipt = publicProcessOperationReceiptV1(
              storedProcessOperationV1(row, "query_process_operation"),
            );
          } catch {
            return { kind: "mismatch", receipt: null } as const;
          }
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

    async beginTranslationWorksetImport(rawInput) {
      const input = normalizeTranslationWorksetBeginImportInputV1(rawInput);
      const expectation = { operation: "begin" as const, input };
      const digest = await digestV1(expectation);
      return await runV1(
        "begin_translation_workset_import",
        [
          "processes",
          "process_execution_leases",
          "process_workspace_bindings",
          "translation_workset_heads",
          "translation_workset_operations",
        ],
        "readwrite",
        async (transaction) => {
          const [replay, current] = await Promise.all([
            translationReceiptTxV1(transaction, expectation, digest),
            loadTranslationHeadTxV1(transaction, input.processId),
          ]);
          if (replay !== "absent") {
            if (
              replay === "mismatch" || current === null ||
              current.revision !== replay.worksetRevision
            ) return { kind: "conflict" as const, current };
            return { kind: "unchanged" as const, head: current, operationReceipt: replay };
          }
          if (current !== null) return { kind: "conflict" as const, current };
          const [leaseIsCurrent, process, binding] = await Promise.all([
            translationImportLeaseIsCurrentTxV1(
              transaction,
              input,
              "begin_translation_workset_import",
            ),
            requestResultV1(transaction.objectStore("processes").get(input.processId)),
            requestResultV1(
              transaction.objectStore("process_workspace_bindings").get(input.processId),
            ),
          ]);
          if (!leaseIsCurrent || process === undefined || binding === undefined) {
            return { kind: "conflict" as const, current: null };
          }
          const processHead = storedProcessV1(process, "begin_translation_workset_import");
          const workspace = cloneProcessWorkspaceBindingV1(
            binding as ProcessWorkspaceBindingV1,
          );
          const checkpoint = processHead.checkpoint;
          if (
            processHead.programDefinition.programId !== bundledTranslationProgramIdV1 ||
            processHead.programDefinition.revision !== 1 ||
            processHead.subjectProgramId === null || workspace.processId !== input.processId ||
            checkpoint === null || checkpoint.workspaceId !== workspace.workspaceId ||
            input.sourceBinding.workspaceId !== workspace.workspaceId ||
            input.sourceBinding.volumeId !== workspace.volumeId ||
            input.sourceBinding.workspaceFormat !== workspace.workspaceFormat
          ) return { kind: "conflict" as const, current: null };
          const head: TranslationWorksetHeadV1 = {
            schemaVersion: 2,
            processId: input.processId,
            importOperationId: input.operationId,
            revision: 1,
            phase: "staging",
            title: input.title,
            document: structuredClone(input.document),
            source: structuredClone(input.source),
            sourceBinding: structuredClone(input.sourceBinding),
            sourceLocale: input.sourceLocale,
            targetLocale: input.targetLocale,
            documentPurpose: input.documentPurpose,
            style: input.style,
            expectedUnitCount: input.expectedUnitCount,
            stagedUnitCount: 0,
            expectedGlossaryCount: input.expectedGlossaryCount,
            stagedGlossaryCount: 0,
            acceptedUnitCount: 0,
            acceptedBatchCount: 0,
            pendingCandidateId: null,
            createdAt: input.updatedAt,
            updatedAt: input.updatedAt,
          };
          const receipt = translationReceiptV1(expectation, digest, 1);
          await Promise.all([
            requestResultV1(transaction.objectStore("translation_workset_heads").add(head)),
            requestResultV1(transaction.objectStore("translation_workset_operations").add(receipt)),
          ]);
          return {
            kind: "committed" as const,
            head: structuredClone(head),
            operationReceipt: receipt,
          };
        },
      );
    },

    async appendTranslationWorksetImport(rawInput) {
      const input = normalizeTranslationWorksetAppendImportInputV1(rawInput);
      const expectation = { operation: "append" as const, input };
      const digest = await digestV1(expectation);
      return await runV1(
        "append_translation_workset_import",
        [
          "processes",
          "process_execution_leases",
          "translation_workset_heads",
          "translation_workset_units",
          "translation_glossary_entries",
          "translation_workset_operations",
        ],
        "readwrite",
        async (transaction) => {
          const [replay, current] = await Promise.all([
            translationReceiptTxV1(transaction, expectation, digest),
            loadTranslationHeadTxV1(transaction, input.processId),
          ]);
          if (replay !== "absent") {
            if (
              replay === "mismatch" || current === null ||
              current.revision !== replay.worksetRevision
            ) return { kind: "conflict" as const, current };
            return { kind: "unchanged" as const, head: current, operationReceipt: replay };
          }
          const leaseIsCurrent = await translationImportLeaseIsCurrentTxV1(
            transaction,
            input,
            "append_translation_workset_import",
          );
          if (
            !leaseIsCurrent ||
            current === null || current.phase !== "staging" ||
            current.revision !== input.expectedWorksetRevision
          ) return { kind: "conflict" as const, current };
          const orderedUnits = input.units.toSorted((left, right) => left.order - right.order);
          const orderedGlossary = input.glossaryEntries.toSorted((left, right) =>
            left.order - right.order
          );
          if (
            orderedUnits.some((row, index) => row.order !== current.stagedUnitCount + index) ||
            orderedGlossary.some((row, index) =>
              row.order !== current.stagedGlossaryCount + index
            ) ||
            current.stagedUnitCount + orderedUnits.length > current.expectedUnitCount ||
            current.stagedGlossaryCount + orderedGlossary.length > current.expectedGlossaryCount
          ) return { kind: "conflict" as const, current };
          const revision = current.revision + 1;
          const head: TranslationWorksetHeadV1 = {
            ...current,
            revision,
            stagedUnitCount: current.stagedUnitCount + orderedUnits.length,
            stagedGlossaryCount: current.stagedGlossaryCount + orderedGlossary.length,
            updatedAt: input.updatedAt,
          };
          const receipt = translationReceiptV1(expectation, digest, revision);
          const unitStore = transaction.objectStore("translation_workset_units");
          const glossaryStore = transaction.objectStore("translation_glossary_entries");
          await Promise.all([
            ...orderedUnits.map((row) =>
              requestResultV1(unitStore.add({ processId: input.processId, ...row, target: null }))
            ),
            ...orderedGlossary.map((row) =>
              requestResultV1(glossaryStore.add({ processId: input.processId, ...row }))
            ),
            requestResultV1(transaction.objectStore("translation_workset_heads").put(head)),
            requestResultV1(transaction.objectStore("translation_workset_operations").add(receipt)),
          ]);
          return {
            kind: "committed" as const,
            head: structuredClone(head),
            operationReceipt: receipt,
          };
        },
      );
    },

    async commitTranslationWorksetFinalizeWithProcessExecutionTerminal(rawInput) {
      const input = normalizeTranslationWorksetFinalizeExecutionBundleInputV1(rawInput);
      const worksetExpectation = { operation: "finalize" as const, input: input.workset };
      const [worksetDigest, processDigest] = await Promise.all([
        digestV1(worksetExpectation),
        digestV1(input.terminal),
      ]);
      const operation =
        "commit_translation_workset_finalize_with_process_execution_terminal" as const;
      return await runV1(
        operation,
        [
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
          "process_workspace_bindings",
          "translation_workset_heads",
          "translation_workset_operations",
        ],
        "readwrite",
        async (
          transaction,
        ): Promise<TranslationWorksetFinalizeExecutionCompositeCommitResultV1> => {
          const [currentWorkset, currentProcess, currentLease, workset, terminal] = await Promise
            .all([
              loadTranslationHeadTxV1(transaction, input.workset.processId),
              loadProcessTxV1(transaction, input.workset.processId, operation),
              loadProcessExecutionLeaseTxV1(transaction, input.workset.processId, operation),
              prepareTranslationFinalizeV1({
                transaction,
                value: input.workset,
                digest: worksetDigest,
                repositoryOperation: operation,
              }),
              prepareExecutionTerminalV1({
                transaction,
                value: input.terminal,
                digest: processDigest,
                operation: "execution_terminal",
                repositoryOperation: operation,
              }),
            ]);
          if (
            workset.kind === "conflict" || terminal.kind === "conflict" ||
            workset.kind !== terminal.kind ||
            terminal.process.programDefinition.programId !== bundledTranslationProgramIdV1 ||
            terminal.process.programDefinition.revision !== 1
          ) {
            return { kind: "conflict", currentWorkset, currentProcess, currentLease };
          }
          if (workset.kind === "committed" && terminal.kind === "committed") {
            await Promise.all([workset.write(), terminal.write()]);
          }
          return {
            kind: workset.kind,
            head: structuredClone(workset.head),
            worksetOperationReceipt: workset.operationReceipt,
            process: terminal.process,
            entries: terminal.entries,
            processOperationReceipt: terminal.operationReceipt,
          };
        },
      );
    },

    async commitTranslationBatchCandidateWithProcessExecutionTerminal(rawInput) {
      const input = normalizeTranslationBatchCandidateExecutionBundleInputV1(rawInput);
      const worksetExpectation = {
        operation: "publish_candidate" as const,
        input: input.workset,
      };
      const [worksetDigest, processDigest] = await Promise.all([
        digestV1(worksetExpectation),
        digestV1(input.terminal),
      ]);
      const operation =
        "commit_translation_batch_candidate_with_process_execution_terminal" as const;
      return await runV1(
        operation,
        [
          "processes",
          "transcript_entries",
          "process_commits",
          "process_execution_leases",
          "translation_workset_heads",
          "translation_workset_operations",
          "translation_workset_units",
          "translation_glossary_entries",
          "translation_batch_candidates",
        ],
        "readwrite",
        async (
          transaction,
        ): Promise<TranslationBatchCandidateExecutionCompositeCommitResultV1> => {
          const [currentWorkset, currentProcess, currentLease, workset, terminal] = await Promise
            .all([
              loadTranslationHeadTxV1(transaction, input.workset.processId),
              loadProcessTxV1(transaction, input.workset.processId, operation),
              loadProcessExecutionLeaseTxV1(transaction, input.workset.processId, operation),
              prepareTranslationCandidateV1({
                transaction,
                value: input.workset,
                digest: worksetDigest,
                repositoryOperation: operation,
              }),
              prepareExecutionTerminalV1({
                transaction,
                value: input.terminal,
                digest: processDigest,
                operation: "execution_terminal",
                repositoryOperation: operation,
              }),
            ]);
          if (
            workset.kind === "conflict" || terminal.kind === "conflict" ||
            workset.kind !== terminal.kind ||
            terminal.process.programDefinition.programId !== bundledTranslationProgramIdV1 ||
            terminal.process.programDefinition.revision !== 1
          ) return { kind: "conflict", currentWorkset, currentProcess, currentLease };
          if (workset.kind === "committed" && terminal.kind === "committed") {
            await Promise.all([workset.write(), terminal.write()]);
          }
          return {
            kind: workset.kind,
            head: structuredClone(workset.head),
            candidate: cloneTranslationBatchCandidateRecordV1(workset.candidate),
            worksetOperationReceipt: workset.operationReceipt,
            process: terminal.process,
            entries: terminal.entries,
            processOperationReceipt: terminal.operationReceipt,
          };
        },
      );
    },

    async loadTranslationWorksetHead(rawProcessId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      return await runV1(
        "load_translation_workset_head",
        ["translation_workset_heads"],
        "readonly",
        (transaction) => loadTranslationHeadTxV1(transaction, processId),
      );
    },

    async loadTranslationBatchCandidate(rawProcessId, rawCandidateId) {
      const processId = normalizeProcessIdV1(rawProcessId);
      if (typeof rawCandidateId !== "string" || !identifierV1(rawCandidateId)) {
        throw new TypeError("invalid Translation candidate id");
      }
      return await runV1(
        "load_translation_batch_candidate",
        ["translation_batch_candidates"],
        "readonly",
        (transaction) =>
          loadTranslationCandidateTxV1(
            transaction,
            processId,
            rawCandidateId,
            "load_translation_batch_candidate",
          ),
      );
    },

    async acceptTranslationBatchCandidate(rawInput) {
      const input = normalizeTranslationBatchCandidateAcceptInputV1(rawInput);
      const expectation = { operation: "accept_candidate" as const, input };
      const digest = await digestV1(expectation);
      return await runV1(
        "accept_translation_batch_candidate",
        [
          "translation_workset_heads",
          "translation_workset_operations",
          "translation_workset_units",
          "translation_batch_candidates",
        ],
        "readwrite",
        async (transaction) => {
          const prepared = await prepareTranslationCandidateReviewV1({
            transaction,
            value: input,
            decision: "accept_candidate",
            digest,
            repositoryOperation: "accept_translation_batch_candidate",
          });
          if (prepared.kind === "conflict") return prepared;
          if (prepared.kind === "committed") await prepared.write();
          return {
            kind: prepared.kind,
            head: structuredClone(prepared.head),
            operationReceipt: structuredClone(prepared.operationReceipt),
          };
        },
      );
    },

    async rejectTranslationBatchCandidate(rawInput) {
      const input = normalizeTranslationBatchCandidateRejectInputV1(rawInput);
      const expectation = { operation: "reject_candidate" as const, input };
      const digest = await digestV1(expectation);
      return await runV1(
        "reject_translation_batch_candidate",
        [
          "translation_workset_heads",
          "translation_workset_operations",
          "translation_workset_units",
          "translation_batch_candidates",
        ],
        "readwrite",
        async (transaction) => {
          const prepared = await prepareTranslationCandidateReviewV1({
            transaction,
            value: input,
            decision: "reject_candidate",
            digest,
            repositoryOperation: "reject_translation_batch_candidate",
          });
          if (prepared.kind === "conflict") return prepared;
          if (prepared.kind === "committed") await prepared.write();
          return {
            kind: prepared.kind,
            head: structuredClone(prepared.head),
            operationReceipt: structuredClone(prepared.operationReceipt),
          };
        },
      );
    },

    async loadTranslationWorksetUnitPage(rawInput) {
      const input = normalizeTranslationWorksetPageRequestV1(rawInput);
      return await loadTranslationPageV1<TranslationWorksetUnitRecordV1>(
        input,
        "translation_workset_units",
        "load_translation_workset_unit_page",
      );
    },

    async loadTranslationWorksetGlossaryPage(rawInput) {
      const input = normalizeTranslationWorksetPageRequestV1(rawInput);
      return await loadTranslationPageV1<TranslationWorksetGlossaryEntryV1>(
        input,
        "translation_glossary_entries",
        "load_translation_workset_glossary_page",
      );
    },

    async queryTranslationWorksetOperation(rawExpectation) {
      const expectation = normalizeTranslationWorksetOperationExpectationV1(rawExpectation);
      const digest = await digestV1(expectation);
      return await runV1(
        "query_translation_workset_operation",
        ["translation_workset_operations"],
        "readonly",
        async (transaction) => {
          const result = await translationReceiptTxV1(transaction, expectation, digest);
          if (result === "absent") return { kind: "absent" as const };
          if (result === "mismatch") {
            const row = await requestResultV1(
              transaction.objectStore("translation_workset_operations").get([
                expectation.input.processId,
                expectation.input.operationId,
              ]),
            );
            return {
              kind: "mismatch" as const,
              receipt: structuredClone(row) as TranslationWorksetOperationReceiptV1,
            };
          }
          return { kind: "committed" as const, receipt: result };
        },
      );
    },

    async loadProgramNetworkAccess(rawProgramId) {
      const programId = normalizeProgramCatalogProgramIdV1(rawProgramId);
      return await runV1(
        "load_program_network_access",
        ["program_heads", "program_network_access"],
        "readonly",
        async (transaction) => {
          const head = await requestResultV1(
            transaction.objectStore("program_heads").get(programId),
          );
          if (head === undefined) return null;
          storedHeadV1(head, "load_program_network_access");
          const row = await requestResultV1(
            transaction.objectStore("program_network_access").get(programId),
          );
          if (row === undefined) return createDefaultProgramNetworkAccessV1(programId);
          try {
            const access = cloneProgramNetworkAccessV1(row as ProgramNetworkAccessV1);
            if (access.programId !== programId) throw new TypeError();
            return access;
          } catch {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "load_program_network_access",
            );
          }
        },
      );
    },

    async setProgramNetworkAccess(rawInput) {
      const input = normalizeProgramNetworkAccessMutationV1(rawInput);
      return await runV1(
        "set_program_network_access",
        ["program_heads", "program_network_access"],
        "readwrite",
        async (transaction) => {
          const head = await requestResultV1(
            transaction.objectStore("program_heads").get(input.programId),
          );
          if (head === undefined) return { kind: "missing" as const };
          storedHeadV1(head, "set_program_network_access");
          const store = transaction.objectStore("program_network_access");
          const row = await requestResultV1(store.get(input.programId));
          let current: ProgramNetworkAccessV1;
          try {
            current = row === undefined
              ? createDefaultProgramNetworkAccessV1(input.programId)
              : cloneProgramNetworkAccessV1(row as ProgramNetworkAccessV1);
          } catch {
            throw createProgramDataRepositoryFailureV1(
              "schema_invalid",
              "set_program_network_access",
            );
          }
          const result = applyProgramNetworkAccessMutationV1(current, input);
          if (result.kind === "committed") {
            if (result.value.enabled) await requestResultV1(store.put(result.value));
            else await requestResultV1(store.delete(input.programId));
          }
          return result;
        },
      );
    },

    async reset() {
      await runV1("reset", programDataStoreNamesV1, "readwrite", async (transaction) => {
        await Promise.all(
          programDataStoreNamesV1.map((name) =>
            requestResultV1(transaction.objectStore(name).clear())
          ),
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
