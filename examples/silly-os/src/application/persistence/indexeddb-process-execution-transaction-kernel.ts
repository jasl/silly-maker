// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";
import {
  cloneProcessHeadV1,
  cloneProcessSettingsOverrideV1,
  cloneTerminalReceiptV1,
  cloneTranscriptEntryV1,
  exactJsonValuesEqualV1,
  type ProcessCheckpointV1,
  type ProcessHeadV1,
  type ProcessSettingsOverrideV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type TranscriptEntryV1,
} from "../../program-platform/process/program-process-repository.ts";
import {
  cloneProcessExecutionLeaseV1,
  cloneProcessOperationReceiptV1,
  normalizeProcessOperationReceiptV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
  type ProcessOperationKindV1,
  type ProcessOperationReceiptV1,
} from "../../program-platform/process/process-execution-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryOperationV1,
} from "./program-data-repository-failure.ts";

const noSubjectProgramIndexKeyV1 = "none:";

/** Core stores a Program facet must include in a composite execution transaction. */
export const indexedDbProcessExecutionTransactionStoreNamesV1 = [
  "processes",
  "process_settings_overrides",
  "transcript_entries",
  "process_commits",
  "process_execution_leases",
] as const;

type ProcessExecutionAcquireOperationV1 = Extract<
  ProcessOperationKindV1,
  "execution_acquire" | "program_facet_execution_acquire"
>;

type ProcessExecutionTerminalOperationV1 = Extract<
  ProcessOperationKindV1,
  "execution_terminal"
>;

interface StoredProcessOperationV1 extends ProcessOperationReceiptV1 {
  readonly commitId: string;
  readonly digest: string;
}

interface StoredProcessTranscriptCommitV1 {
  readonly processId: string;
  readonly commitId: string;
  readonly operation: "append_process_transcript";
  readonly digest: string;
  readonly firstSequence: number;
  readonly lastSequence: number;
  readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
}

export type PreparedIndexedDbProcessTranscriptAppendV1 =
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

export type PreparedIndexedDbProcessExecutionAcquireV1 =
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

export type PreparedIndexedDbProcessExecutionTerminalV1 =
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

export interface IndexedDbProcessExecutionTransactionKernelV1 {
  loadProcess(processId: string): Promise<ProcessHeadV1 | null>;
  loadLease(processId: string): Promise<ProcessExecutionLeaseV1 | null>;
  loadOperationReceipt(
    processId: string,
    operationId: string,
  ): Promise<"absent" | "invalid" | ProcessOperationReceiptV1>;
  replayOperation(input: {
    readonly processId: string;
    readonly operationId: string;
    readonly operation: ProcessOperationKindV1;
    readonly digest: string;
  }): Promise<"absent" | "conflict" | ProcessOperationReceiptV1>;
  /** Prepare one ordinary transcript append or the first append for a new Process. */
  prepareTranscriptAppend(input: {
    readonly value: ProcessTranscriptAppendInputV1;
    readonly digest: string;
    readonly initialProcess?: ProcessHeadV1;
  }): Promise<PreparedIndexedDbProcessTranscriptAppendV1>;
  prepareAcquire(input: {
    readonly value: ProcessExecutionAcquireInputV1;
    readonly operation: ProcessExecutionAcquireOperationV1;
    readonly digest: string;
  }): Promise<PreparedIndexedDbProcessExecutionAcquireV1>;
  prepareTerminal(input: {
    readonly value: ProcessExecutionTerminalInputV1;
    readonly operation: ProcessExecutionTerminalOperationV1;
    readonly digest: string;
    readonly validateReplayEvidence?: (
      receipt: ProcessOperationReceiptV1,
    ) => Promise<void>;
  }): Promise<PreparedIndexedDbProcessExecutionTerminalV1>;
}

function identifierV1(value: unknown): value is string {
  return isProgramPlatformIdentifierV1(value);
}

export function indexedDbProcessSubjectKeyV1(subjectProgramId: string | null): string {
  return subjectProgramId === null ? noSubjectProgramIndexKeyV1 : `program:${subjectProgramId}`;
}

export function requestIndexedDbResultV1<T>(request: IDBRequest<T>): Promise<T> {
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

/** Compute an operation digest before opening an IndexedDB transaction. */
export async function digestIndexedDbOperationV1(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function encodeIndexedDbProcessV1(value: ProcessHeadV1): unknown {
  const process = cloneProcessHeadV1(value);
  return { ...process, subjectKey: indexedDbProcessSubjectKeyV1(process.subjectProgramId) };
}

export function decodeIndexedDbProcessV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessHeadV1 {
  if (value === null || typeof value !== "object" || !("subjectKey" in value)) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const { subjectKey, ...row } = value as ProcessHeadV1 & { readonly subjectKey: unknown };
  try {
    const process = cloneProcessHeadV1(row);
    if (subjectKey !== indexedDbProcessSubjectKeyV1(process.subjectProgramId)) {
      throw new TypeError();
    }
    return process;
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function decodeIndexedDbProcessSettingsOverrideV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessSettingsOverrideV1 {
  try {
    return cloneProcessSettingsOverrideV1(value as ProcessSettingsOverrideV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function decodeIndexedDbTranscriptEntryV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): TranscriptEntryV1 {
  try {
    return cloneTranscriptEntryV1(value as TranscriptEntryV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function decodeIndexedDbProcessExecutionLeaseV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProcessExecutionLeaseV1 {
  try {
    return cloneProcessExecutionLeaseV1(value as ProcessExecutionLeaseV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
}

export function processCheckpointCanAdvanceV1(
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

function decodeStoredProcessOperationV1(
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

function decodeStoredProcessTranscriptCommitV1(
  value: unknown,
  operation: ProgramDataRepositoryOperationV1,
): StoredProcessTranscriptCommitV1 {
  if (value === null || typeof value !== "object") {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
  const row = value as StoredProcessTranscriptCommitV1;
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
    row.operation !== "append_process_transcript" ||
    typeof row.digest !== "string" || !/^[0-9a-f]{64}$/u.test(row.digest) ||
    !Number.isSafeInteger(row.firstSequence) || row.firstSequence < 1 ||
    !Number.isSafeInteger(row.lastSequence) || row.lastSequence < row.firstSequence
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  return { ...row, terminalAttemptReceipt };
}

function encodeStoredProcessOperationV1(
  receipt: ProcessOperationReceiptV1,
): StoredProcessOperationV1 {
  return {
    ...cloneProcessOperationReceiptV1(receipt),
    commitId: receipt.operationId,
    digest: receipt.operationDigest,
  };
}

function publicProcessOperationReceiptV1(
  value: StoredProcessOperationV1,
): ProcessOperationReceiptV1 {
  const { commitId: _commitId, digest: _digest, ...receipt } = value;
  return cloneProcessOperationReceiptV1(receipt);
}

function operationReceiptV1(input: {
  readonly process: ProcessHeadV1;
  readonly operationId: string;
  readonly operation: ProcessOperationKindV1;
  readonly operationDigest: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly terminalOutcome: ProcessOperationReceiptV1["terminalOutcome"];
  readonly lease: ProcessExecutionLeaseV1 | null;
}): ProcessOperationReceiptV1 {
  return normalizeProcessOperationReceiptV1({
    processId: input.process.processId,
    operationId: input.operationId,
    operation: input.operation,
    operationDigest: input.operationDigest,
    attemptId: input.attemptId,
    generation: input.generation,
    processRevision: input.process.revision,
    transcriptFrontier: input.process.transcriptFrontier,
    terminalOutcome: input.terminalOutcome,
    lease: input.lease,
  });
}

export function indexedDbTranscriptEntriesAreAvailableV1(
  transaction: IDBTransaction,
  entries: readonly TranscriptEntryV1[],
): Promise<boolean> {
  return (async () => {
    const store = transaction.objectStore("transcript_entries");
    const index = store.index("by_process_entry_id");
    for (const entry of entries) {
      const [sequenceRow, idKey] = await Promise.all([
        requestIndexedDbResultV1(store.get([entry.processId, entry.sequence])),
        requestIndexedDbResultV1(index.getKey([entry.processId, entry.entryId])),
      ]);
      if (sequenceRow !== undefined || idKey !== undefined) return false;
    }
    return true;
  })();
}

export function createIndexedDbProcessExecutionTransactionKernelV1(input: {
  readonly transaction: IDBTransaction;
  readonly repositoryOperation: ProgramDataRepositoryOperationV1;
}): IndexedDbProcessExecutionTransactionKernelV1 {
  const { transaction, repositoryOperation } = input;

  const loadProcess = async (processId: string): Promise<ProcessHeadV1 | null> => {
    const row = await requestIndexedDbResultV1(
      transaction.objectStore("processes").get(processId),
    );
    return row === undefined ? null : decodeIndexedDbProcessV1(row, repositoryOperation);
  };

  const loadLease = async (processId: string): Promise<ProcessExecutionLeaseV1 | null> => {
    const row = await requestIndexedDbResultV1(
      transaction.objectStore("process_execution_leases").get(processId),
    );
    return row === undefined
      ? null
      : decodeIndexedDbProcessExecutionLeaseV1(row, repositoryOperation);
  };

  const loadOperationReceipt = async (
    processId: string,
    operationId: string,
  ): Promise<"absent" | "invalid" | ProcessOperationReceiptV1> => {
    const row = await requestIndexedDbResultV1(
      transaction.objectStore("process_commits").get([processId, operationId]),
    );
    if (row === undefined) return "absent";
    try {
      return publicProcessOperationReceiptV1(
        decodeStoredProcessOperationV1(row, repositoryOperation),
      );
    } catch {
      return "invalid";
    }
  };

  const replayOperation: IndexedDbProcessExecutionTransactionKernelV1["replayOperation"] = async (
    replayInput,
  ) => {
    const receipt = await loadOperationReceipt(replayInput.processId, replayInput.operationId);
    if (receipt === "absent") return "absent";
    if (receipt === "invalid") return "conflict";
    return receipt.operation === replayInput.operation &&
        receipt.operationDigest === replayInput.digest
      ? receipt
      : "conflict";
  };

  const replayTranscriptAppend = async (appendInput: {
    readonly value: ProcessTranscriptAppendInputV1;
    readonly digest: string;
  }): Promise<
    Exclude<PreparedIndexedDbProcessTranscriptAppendV1, { readonly kind: "committed" }> | null
  > => {
    const row = await requestIndexedDbResultV1(
      transaction.objectStore("process_commits").get([
        appendInput.value.processId,
        appendInput.value.commitId,
      ]),
    );
    if (row === undefined) return null;
    let commit: StoredProcessTranscriptCommitV1;
    try {
      commit = decodeStoredProcessTranscriptCommitV1(row, repositoryOperation);
    } catch {
      const current = await loadProcess(appendInput.value.processId);
      return { kind: "conflict", current };
    }
    const current = await loadProcess(appendInput.value.processId);
    if (current === null) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    }
    if (
      commit.processId !== appendInput.value.processId ||
      commit.commitId !== appendInput.value.commitId
    ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    if (commit.digest !== appendInput.digest) return { kind: "conflict", current };
    const expectedFirstSequence = appendInput.value.entries[0]!.sequence;
    const expectedLastSequence = appendInput.value.entries.at(-1)!.sequence;
    if (
      commit.firstSequence !== expectedFirstSequence ||
      commit.lastSequence !== expectedLastSequence ||
      !exactJsonValuesEqualV1(
        commit.terminalAttemptReceipt,
        appendInput.value.terminalAttemptReceipt,
      ) || commit.lastSequence > current.transcriptFrontier
    ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    const entries: TranscriptEntryV1[] = [];
    for (let sequence = commit.firstSequence; sequence <= commit.lastSequence; sequence += 1) {
      const entryRow = await requestIndexedDbResultV1(
        transaction.objectStore("transcript_entries").get([commit.processId, sequence]),
      );
      if (entryRow === undefined) {
        throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
      }
      const entry = decodeIndexedDbTranscriptEntryV1(entryRow, repositoryOperation);
      if (entry.processId !== commit.processId || entry.sequence !== sequence) {
        throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
      }
      entries.push(entry);
    }
    if (
      entries.length !== appendInput.value.entries.length ||
      entries.some((entry, index) =>
        !exactJsonValuesEqualV1(entry, appendInput.value.entries[index])
      )
    ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    const terminalAttemptReceipt = commit.terminalAttemptReceipt;
    if (terminalAttemptReceipt !== null) {
      const terminalEntry = entries.at(-1);
      if (
        terminalEntry === undefined || terminalAttemptReceipt.processId !== commit.processId ||
        terminalAttemptReceipt.terminalSequence !== terminalEntry.sequence ||
        terminalAttemptReceipt.terminalEntryId !== terminalEntry.entryId
      ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
    }
    return { kind: "unchanged", process: current, entries, terminalAttemptReceipt };
  };

  const prepareTranscriptAppend:
    IndexedDbProcessExecutionTransactionKernelV1["prepareTranscriptAppend"] = async (
      appendInput,
    ) => {
      const replay = await replayTranscriptAppend(appendInput);
      if (replay !== null) return replay;
      const current = appendInput.initialProcess ?? await loadProcess(
        appendInput.value.processId,
      );
      const first = appendInput.value.entries[0]!;
      const terminal = appendInput.value.terminalAttemptReceipt;
      const binding = appendInput.value.attemptBinding;
      if (
        current === null || current.revision !== appendInput.value.expectedProcessRevision ||
        current.transcriptFrontier !== appendInput.value.expectedTranscriptFrontier ||
        current.status !== "active" || first.sequence !== current.transcriptFrontier + 1 ||
        appendInput.value.updatedAt < current.updatedAt ||
        (current.activeAttempt === null) !== (binding === null) ||
        (current.activeAttempt !== null && binding !== null &&
          (binding.attemptId !== current.activeAttempt.attemptId ||
            binding.generation !== current.activeAttempt.generation)) ||
        (terminal !== null &&
          (binding === null || terminal.attemptId !== binding.attemptId ||
            terminal.generation !== binding.generation))
      ) return { kind: "conflict", current };
      const frontier = appendInput.value.entries.at(-1)!.sequence;
      if (
        appendInput.value.checkpoint !== null &&
        !processCheckpointCanAdvanceV1(current.checkpoint, appendInput.value.checkpoint, frontier)
      ) return { kind: "conflict", current };
      if (!await indexedDbTranscriptEntriesAreAvailableV1(transaction, appendInput.value.entries)) {
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
        checkpoint: appendInput.value.checkpoint ?? current.checkpoint,
        updatedAt: appendInput.value.updatedAt,
      });
      const commit: StoredProcessTranscriptCommitV1 = {
        processId: appendInput.value.processId,
        commitId: appendInput.value.commitId,
        operation: "append_process_transcript",
        digest: appendInput.digest,
        firstSequence: appendInput.value.entries[0]!.sequence,
        lastSequence: appendInput.value.entries.at(-1)!.sequence,
        terminalAttemptReceipt: terminal,
      };
      return {
        kind: "committed",
        process: next,
        entries: appendInput.value.entries,
        terminalAttemptReceipt: terminal,
        write: async () => {
          await Promise.all([
            requestIndexedDbResultV1(
              appendInput.initialProcess === undefined
                ? transaction.objectStore("processes").put(encodeIndexedDbProcessV1(next))
                : transaction.objectStore("processes").add(encodeIndexedDbProcessV1(next)),
            ),
            ...(appendInput.initialProcess === undefined ? [] : [
              requestIndexedDbResultV1(
                transaction.objectStore("process_settings_overrides").add(
                  {
                    schemaVersion: 1,
                    processId: next.processId,
                    revision: 1,
                    overrideJson: null,
                    updatedAt: next.createdAt,
                  } satisfies ProcessSettingsOverrideV1,
                ),
              ),
            ]),
            ...appendInput.value.entries.map((entry) =>
              requestIndexedDbResultV1(transaction.objectStore("transcript_entries").add(entry))
            ),
            requestIndexedDbResultV1(transaction.objectStore("process_commits").add(commit)),
          ]);
        },
      };
    };

  const prepareAcquire: IndexedDbProcessExecutionTransactionKernelV1["prepareAcquire"] = async (
    acquireInput,
  ) => {
    const operationId = acquireInput.value.attempt.commitId;
    const [replay, current, currentLease] = await Promise.all([
      replayOperation({
        processId: acquireInput.value.attempt.processId,
        operationId,
        operation: acquireInput.operation,
        digest: acquireInput.digest,
      }),
      loadProcess(acquireInput.value.attempt.processId),
      loadLease(acquireInput.value.attempt.processId),
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
      if (acquireInput.value.attempt.trigger.kind === "new_entry") {
        const row = await requestIndexedDbResultV1(
          transaction.objectStore("transcript_entries").get([
            current.processId,
            current.activeAttempt.triggerSequence,
          ]),
        );
        if (row === undefined) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
        }
        const entry = decodeIndexedDbTranscriptEntryV1(row, repositoryOperation);
        if (
          entry.entryId !== current.activeAttempt.triggerEntryId || entry.role !== "user" ||
          entry.state !== "committed" ||
          !exactJsonValuesEqualV1(entry, acquireInput.value.attempt.trigger.entry)
        ) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
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
    if (acquireInput.value.attempt.trigger.kind === "new_entry") {
      triggerEntry = acquireInput.value.attempt.trigger.entry;
    } else {
      const row = await requestIndexedDbResultV1(
        transaction.objectStore("transcript_entries").get([
          acquireInput.value.attempt.processId,
          acquireInput.value.attempt.trigger.sequence,
        ]),
      );
      triggerEntry = row === undefined
        ? null
        : decodeIndexedDbTranscriptEntryV1(row, repositoryOperation);
    }
    const appends = acquireInput.value.attempt.trigger.kind === "new_entry";
    const nextFrontier = appends
      ? acquireInput.value.attempt.expectedTranscriptFrontier + 1
      : acquireInput.value.attempt.expectedTranscriptFrontier;
    if (
      current === null || currentLease !== null ||
      current.revision !== acquireInput.value.attempt.expectedProcessRevision ||
      current.transcriptFrontier !== acquireInput.value.attempt.expectedTranscriptFrontier ||
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
        (acquireInput.value.attempt.trigger.kind === "new_entry"
          ? acquireInput.value.attempt.trigger.entry.entryId
          : acquireInput.value.attempt.trigger.entryId) ||
      acquireInput.value.attempt.generation <= (current.lastTerminalAttempt?.generation ?? 0) ||
      !processCheckpointCanAdvanceV1(
        current.checkpoint,
        acquireInput.value.attempt.startingCheckpoint,
        nextFrontier,
      )
    ) return { kind: "conflict", currentProcess: current, currentLease };
    const entries = appends ? [triggerEntry] : [];
    if (!await indexedDbTranscriptEntriesAreAvailableV1(transaction, entries)) {
      return { kind: "conflict", currentProcess: current, currentLease };
    }
    const settingsRow = await requestIndexedDbResultV1(
      transaction.objectStore("process_settings_overrides").get(
        acquireInput.value.attempt.processId,
      ),
    );
    let settingsOverrideJson: string | null = null;
    if (settingsRow !== undefined) {
      try {
        const settings = decodeIndexedDbProcessSettingsOverrideV1(
          settingsRow,
          repositoryOperation,
        );
        if (settings.processId === acquireInput.value.attempt.processId) {
          settingsOverrideJson = settings.overrideJson;
        }
      } catch {
        // Invalid optional settings fall back to the exact package defaults.
      }
    }
    const lease = cloneProcessExecutionLeaseV1({
      processId: acquireInput.value.attempt.processId,
      ownerInstanceId: acquireInput.value.ownerInstanceId,
      attemptId: acquireInput.value.attempt.attemptId,
      generation: acquireInput.value.attempt.generation,
      expiresAt: acquireInput.value.expiresAt,
    });
    const next = cloneProcessHeadV1({
      ...current,
      revision: current.revision + 1,
      status: "active",
      transcriptFrontier: nextFrontier,
      activeAttempt: {
        attemptId: acquireInput.value.attempt.attemptId,
        generation: acquireInput.value.attempt.generation,
        triggerEntryId: triggerEntry.entryId,
        triggerSequence: triggerEntry.sequence,
        startingCheckpoint: acquireInput.value.attempt.startingCheckpoint,
        settingsOverrideJson,
      },
      checkpoint: acquireInput.value.attempt.startingCheckpoint,
      updatedAt: acquireInput.value.observedAt,
    });
    const receipt = operationReceiptV1({
      process: next,
      operationId,
      operation: acquireInput.operation,
      operationDigest: acquireInput.digest,
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
          requestIndexedDbResultV1(
            transaction.objectStore("processes").put(encodeIndexedDbProcessV1(next)),
          ),
          ...entries.map((entry) =>
            requestIndexedDbResultV1(transaction.objectStore("transcript_entries").add(entry))
          ),
          requestIndexedDbResultV1(
            transaction.objectStore("process_execution_leases").add(lease),
          ),
          requestIndexedDbResultV1(
            transaction.objectStore("process_commits").add(
              encodeStoredProcessOperationV1(receipt),
            ),
          ),
        ]);
      },
    };
  };

  const prepareTerminal: IndexedDbProcessExecutionTransactionKernelV1["prepareTerminal"] = async (
    terminalInput,
  ) => {
    const operationId = terminalInput.value.transcript.commitId;
    const replay = await replayOperation({
      processId: terminalInput.value.transcript.processId,
      operationId,
      operation: terminalInput.operation,
      digest: terminalInput.digest,
    });
    const [currentProcess, currentLease] = await Promise.all([
      loadProcess(terminalInput.value.transcript.processId),
      loadLease(terminalInput.value.transcript.processId),
    ]);
    if (replay !== "absent") {
      if (replay === "conflict" || currentProcess === null) {
        return { kind: "conflict", currentProcess, currentLease };
      }
      if (
        currentProcess.revision < replay.processRevision ||
        currentProcess.transcriptFrontier < replay.transcriptFrontier
      ) {
        throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
      }
      const persistedEntries: TranscriptEntryV1[] = [];
      for (const expected of terminalInput.value.transcript.entries) {
        const row = await requestIndexedDbResultV1(
          transaction.objectStore("transcript_entries").get([
            expected.processId,
            expected.sequence,
          ]),
        );
        if (row === undefined) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
        }
        const entry = decodeIndexedDbTranscriptEntryV1(row, repositoryOperation);
        if (!exactJsonValuesEqualV1(entry, expected)) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
        }
        persistedEntries.push(entry);
      }
      if (currentProcess.revision === replay.processRevision) {
        const terminal = terminalInput.value.transcript.terminalAttemptReceipt!;
        if (
          currentProcess.activeAttempt !== null ||
          currentProcess.lastTerminalAttempt?.attemptId !== terminal.attemptId ||
          currentProcess.lastTerminalAttempt.generation !== terminal.generation ||
          currentProcess.lastTerminalAttempt.outcome !== terminal.outcome ||
          currentProcess.transcriptFrontier !== replay.transcriptFrontier
        ) {
          throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperation);
        }
      }
      await terminalInput.validateReplayEvidence?.(replay);
      return {
        kind: "unchanged",
        process: currentProcess,
        entries: persistedEntries,
        operationReceipt: replay,
      };
    }

    const transcript = terminalInput.value.transcript;
    const terminal = transcript.terminalAttemptReceipt!;
    const binding = transcript.attemptBinding!;
    const first = transcript.entries[0]!;
    if (
      currentProcess === null || currentLease === null ||
      !exactJsonValuesEqualV1(currentLease, terminalInput.value.lease) ||
      currentProcess.revision !== transcript.expectedProcessRevision ||
      currentProcess.transcriptFrontier !== transcript.expectedTranscriptFrontier ||
      currentProcess.status !== "active" ||
      currentProcess.activeAttempt?.attemptId !== binding.attemptId ||
      currentProcess.activeAttempt.generation !== binding.generation ||
      currentLease.attemptId !== binding.attemptId ||
      currentLease.generation !== binding.generation ||
      first.sequence !== currentProcess.transcriptFrontier + 1 ||
      transcript.updatedAt < currentProcess.updatedAt ||
      (terminalInput.value.observedAt >= currentLease.expiresAt &&
        terminal.outcome !== "interrupted")
    ) return { kind: "conflict", currentProcess, currentLease };
    const frontier = transcript.entries.at(-1)!.sequence;
    if (
      transcript.checkpoint !== null &&
      !processCheckpointCanAdvanceV1(currentProcess.checkpoint, transcript.checkpoint, frontier)
    ) return { kind: "conflict", currentProcess, currentLease };
    if (!await indexedDbTranscriptEntriesAreAvailableV1(transaction, transcript.entries)) {
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
      operation: terminalInput.operation,
      operationDigest: terminalInput.digest,
      attemptId: binding.attemptId,
      generation: binding.generation,
      terminalOutcome: terminal.outcome,
      lease: null,
    });
    return {
      kind: "committed",
      process: next,
      entries: transcript.entries,
      operationReceipt: receipt,
      write: async () => {
        await Promise.all([
          requestIndexedDbResultV1(
            transaction.objectStore("processes").put(encodeIndexedDbProcessV1(next)),
          ),
          ...transcript.entries.map((entry) =>
            requestIndexedDbResultV1(transaction.objectStore("transcript_entries").add(entry))
          ),
          requestIndexedDbResultV1(
            transaction.objectStore("process_execution_leases").delete(
              terminalInput.value.lease.processId,
            ),
          ),
          requestIndexedDbResultV1(
            transaction.objectStore("process_commits").add(
              encodeStoredProcessOperationV1(receipt),
            ),
          ),
        ]);
      },
    };
  };

  return {
    loadProcess,
    loadLease,
    loadOperationReceipt,
    replayOperation,
    prepareTranscriptAppend,
    prepareAcquire,
    prepareTerminal,
  };
}
