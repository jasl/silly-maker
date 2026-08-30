// SPDX-License-Identifier: MIT

import {
  cloneProcessHeadV1,
  cloneProcessSummaryV1,
  cloneProgramDefinitionRevisionV1,
  cloneTerminalReceiptV1,
  cloneTranscriptEntryV1,
  createProcessSummaryV1,
  createProgramProcessRepositoryFailureV1,
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
  type ProcessAttemptBeginInputV1,
  type ProcessCheckpointV1,
  type ProcessCommitResultV1,
  type ProcessHeadV1,
  type ProcessSummaryCursorV1,
  type ProcessSummaryV1,
  type ProcessTerminalAttemptReceiptV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramDefinitionRevisionV1,
  type ProgramProcessRepositoryOperationV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "./program-process-repository.ts";

export type MemoryProcessCommitRecordV1 =
  | {
    readonly operation: "begin_process_attempt";
    readonly input: ProcessAttemptBeginInputV1;
    readonly result: Extract<ProcessCommitResultV1, { readonly kind: "committed" | "unchanged" }>;
  }
  | {
    readonly operation: "append_process_transcript";
    readonly input: ProcessTranscriptAppendInputV1;
    readonly result: Extract<ProcessCommitResultV1, { readonly kind: "committed" | "unchanged" }>;
  };

export interface MemoryProgramProcessRepositoryBackingV1 {
  readonly programDefinitions: Map<string, ProgramDefinitionRevisionV1>;
  readonly processes: Map<string, ProcessHeadV1>;
  /** Summary rows and their per-subject order; list reads never materialize Process heads. */
  readonly processSummaries: Map<string, ProcessSummaryV1>;
  readonly processSummaryOrderBySubject: Map<string | null, string[]>;
  readonly transcriptEntries: Map<string, Map<number, TranscriptEntryV1>>;
  readonly transcriptEntryIds: Map<string, Map<string, number>>;
  readonly commits: Map<string, MemoryProcessCommitRecordV1>;
}

export function createMemoryProgramProcessRepositoryBackingV1(): MemoryProgramProcessRepositoryBackingV1 {
  return {
    programDefinitions: new Map(),
    processes: new Map(),
    processSummaries: new Map(),
    processSummaryOrderBySubject: new Map(),
    transcriptEntries: new Map(),
    transcriptEntryIds: new Map(),
    commits: new Map(),
  };
}

function definitionKeyV1(programId: string, revision: number): string {
  return `${programId}\u0000${String(revision)}`;
}

function commitKeyV1(processId: string, commitId: string): string {
  return `${processId}\u0000${commitId}`;
}

/** Negative means `left` appears first in reverse `(updatedAt, processId)` order. */
function compareProcessSummaryPositionV1(
  left: ProcessSummaryCursorV1,
  right: ProcessSummaryCursorV1,
): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? -1 : 1;
  if (left.processId === right.processId) return 0;
  return left.processId > right.processId ? -1 : 1;
}

function removeProcessSummaryIndexV1(
  backing: MemoryProgramProcessRepositoryBackingV1,
  summary: ProcessSummaryV1,
): void {
  const order = backing.processSummaryOrderBySubject.get(summary.subjectProgramId);
  if (order !== undefined) {
    const index = order.indexOf(summary.processId);
    if (index >= 0) order.splice(index, 1);
    if (order.length === 0) backing.processSummaryOrderBySubject.delete(summary.subjectProgramId);
  }
  backing.processSummaries.delete(summary.processId);
}

function writeProcessSummaryIndexV1(
  backing: MemoryProgramProcessRepositoryBackingV1,
  rawSummary: ProcessSummaryV1,
): void {
  const summary = cloneProcessSummaryV1(rawSummary);
  const previous = backing.processSummaries.get(summary.processId);
  if (previous !== undefined) removeProcessSummaryIndexV1(backing, previous);
  backing.processSummaries.set(summary.processId, summary);
  const order = backing.processSummaryOrderBySubject.get(summary.subjectProgramId) ?? [];
  let low = 0;
  let high = order.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const otherId = order[middle];
    const other = otherId === undefined ? undefined : backing.processSummaries.get(otherId);
    if (other === undefined) throw new TypeError("Process summary index is inconsistent");
    if (compareProcessSummaryPositionV1(summary, other) < 0) high = middle;
    else low = middle + 1;
  }
  order.splice(low, 0, summary.processId);
  backing.processSummaryOrderBySubject.set(summary.subjectProgramId, order);
}

function cloneCommitResultV1(
  result: Extract<ProcessCommitResultV1, { readonly kind: "committed" | "unchanged" }>,
  kind: "committed" | "unchanged" = result.kind,
): Extract<ProcessCommitResultV1, { readonly kind: "committed" | "unchanged" }> {
  return {
    kind,
    process: cloneProcessHeadV1(result.process),
    entries: result.entries.map(cloneTranscriptEntryV1),
    terminalAttemptReceipt: result.terminalAttemptReceipt === null
      ? null
      : cloneTerminalReceiptV1(result.terminalAttemptReceipt),
  };
}

function cloneCommitRecordV1(record: MemoryProcessCommitRecordV1): MemoryProcessCommitRecordV1 {
  if (record.operation === "begin_process_attempt") {
    return {
      operation: record.operation,
      input: normalizeProcessAttemptBeginInputV1(record.input),
      result: cloneCommitResultV1(record.result),
    };
  }
  return {
    operation: record.operation,
    input: normalizeProcessTranscriptAppendInputV1(record.input),
    result: cloneCommitResultV1(record.result),
  };
}

export function createMemoryProgramProcessRepositoryV1(options: {
  readonly backing?: MemoryProgramProcessRepositoryBackingV1;
} = {}): ProgramProcessRepositoryV1 {
  const backing = options.backing ?? createMemoryProgramProcessRepositoryBackingV1();
  let disposed = false;

  const assertAvailableV1 = (operation: ProgramProcessRepositoryOperationV1): void => {
    if (disposed) throw createProgramProcessRepositoryFailureV1("disposed", operation);
  };

  const loadProcessV1 = (
    processId: string,
    operation: ProgramProcessRepositoryOperationV1,
  ): ProcessHeadV1 | null => {
    const stored = backing.processes.get(processId);
    if (stored === undefined) return null;
    try {
      const process = cloneProcessHeadV1(stored);
      const summary = backing.processSummaries.get(processId);
      if (
        summary === undefined ||
        !exactJsonValuesEqualV1(summary, createProcessSummaryV1(process))
      ) throw new TypeError("Process summary is inconsistent");
      return process;
    } catch {
      throw createProgramProcessRepositoryFailureV1("schema_invalid", operation);
    }
  };

  const loadEntryV1 = (
    processId: string,
    sequence: number,
    operation: ProgramProcessRepositoryOperationV1,
  ): TranscriptEntryV1 | null => {
    const rows = backing.transcriptEntries.get(processId);
    if (rows === undefined) {
      throw createProgramProcessRepositoryFailureV1("schema_invalid", operation);
    }
    const stored = rows.get(sequence);
    return stored === undefined ? null : cloneTranscriptEntryV1(stored);
  };

  const checkpointCanAdvanceV1 = (
    current: ProcessCheckpointV1 | null,
    next: ProcessCheckpointV1,
    transcriptFrontier: number,
  ): boolean => {
    if (next.throughSequence > transcriptFrontier) return false;
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
  };

  const findCommitV1 = (
    processId: string,
    commitId: string,
    operation: "begin_process_attempt" | "append_process_transcript",
    normalizedInput: ProcessAttemptBeginInputV1 | ProcessTranscriptAppendInputV1,
  ): ProcessCommitResultV1 | null => {
    const stored = backing.commits.get(commitKeyV1(processId, commitId));
    if (stored === undefined) return null;
    const current = loadProcessV1(processId, operation);
    if (current === null) {
      throw createProgramProcessRepositoryFailureV1("schema_invalid", operation);
    }
    if (stored.operation !== operation || !exactJsonValuesEqualV1(stored.input, normalizedInput)) {
      return { kind: "conflict", current };
    }
    return {
      ...cloneCommitResultV1(stored.result, "unchanged"),
      process: current,
    };
  };

  const commitV1 = (input: {
    readonly operation: "begin_process_attempt" | "append_process_transcript";
    readonly commitId: string;
    readonly commitInput: ProcessAttemptBeginInputV1 | ProcessTranscriptAppendInputV1;
    readonly current: ProcessHeadV1;
    readonly next: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalReceipt: ProcessTerminalAttemptReceiptV1 | null;
  }): ProcessCommitResultV1 => {
    const entryRows = backing.transcriptEntries.get(input.current.processId);
    const entryIds = backing.transcriptEntryIds.get(input.current.processId);
    if (entryRows === undefined || entryIds === undefined) {
      throw createProgramProcessRepositoryFailureV1("schema_invalid", input.operation);
    }
    for (const entry of input.entries) {
      if (entryRows.has(entry.sequence) || entryIds.has(entry.entryId)) {
        return { kind: "conflict", current: cloneProcessHeadV1(input.current) };
      }
    }
    const result = {
      kind: "committed",
      process: cloneProcessHeadV1(input.next),
      entries: input.entries.map(cloneTranscriptEntryV1),
      terminalAttemptReceipt: input.terminalReceipt === null
        ? null
        : cloneTerminalReceiptV1(input.terminalReceipt),
    } as const;
    let record: MemoryProcessCommitRecordV1;
    if (input.operation === "begin_process_attempt") {
      record = {
        operation: input.operation,
        input: normalizeProcessAttemptBeginInputV1(input.commitInput as ProcessAttemptBeginInputV1),
        result,
      };
    } else {
      record = {
        operation: input.operation,
        input: normalizeProcessTranscriptAppendInputV1(
          input.commitInput as ProcessTranscriptAppendInputV1,
        ),
        result,
      };
    }
    const commitKey = commitKeyV1(input.current.processId, input.commitId);
    const previousSummary = backing.processSummaries.get(input.current.processId);
    if (previousSummary === undefined) {
      throw createProgramProcessRepositoryFailureV1("schema_invalid", input.operation);
    }
    try {
      backing.processes.set(input.current.processId, cloneProcessHeadV1(input.next));
      writeProcessSummaryIndexV1(backing, createProcessSummaryV1(input.next));
      for (const entry of input.entries) {
        entryRows.set(entry.sequence, cloneTranscriptEntryV1(entry));
        entryIds.set(entry.entryId, entry.sequence);
      }
      backing.commits.set(commitKey, cloneCommitRecordV1(record));
    } catch {
      backing.processes.set(input.current.processId, cloneProcessHeadV1(input.current));
      writeProcessSummaryIndexV1(backing, previousSummary);
      for (const entry of input.entries) {
        entryRows.delete(entry.sequence);
        entryIds.delete(entry.entryId);
      }
      backing.commits.delete(commitKey);
      throw createProgramProcessRepositoryFailureV1("transaction_aborted", input.operation);
    }
    return cloneCommitResultV1(result);
  };

  return {
    async publishProgramDefinitionRevision(rawDefinition) {
      assertAvailableV1("publish_program_definition_revision");
      const definition = cloneProgramDefinitionRevisionV1(rawDefinition);
      const key = definitionKeyV1(definition.programId, definition.revision);
      const current = backing.programDefinitions.get(key);
      if (current !== undefined) {
        return exactJsonValuesEqualV1(current, definition)
          ? { kind: "unchanged", definition: cloneProgramDefinitionRevisionV1(current) }
          : { kind: "conflict", current: cloneProgramDefinitionRevisionV1(current) };
      }
      backing.programDefinitions.set(key, cloneProgramDefinitionRevisionV1(definition));
      return { kind: "committed", definition: cloneProgramDefinitionRevisionV1(definition) };
    },

    async loadProgramDefinitionRevision(rawProgramId, rawRevision) {
      assertAvailableV1("load_program_definition_revision");
      const programId = normalizeProgramIdV1(rawProgramId);
      const revision = normalizeRevisionV1(rawRevision);
      const stored = backing.programDefinitions.get(definitionKeyV1(programId, revision));
      return stored === undefined ? null : cloneProgramDefinitionRevisionV1(stored);
    },

    async createProcess(rawInput) {
      assertAvailableV1("create_process");
      const normalized = normalizeProcessCreateInputV1(rawInput);
      const definition = backing.programDefinitions.get(definitionKeyV1(
        normalized.programDefinition.programId,
        normalized.programDefinition.revision,
      ));
      if (definition === undefined) {
        return {
          kind: "program_definition_missing",
          programDefinition: normalized.programDefinition,
        };
      }
      const current = loadProcessV1(normalized.processId, "create_process");
      const candidate: ProcessHeadV1 = {
        schemaVersion: 1,
        processId: normalized.processId,
        revision: 1,
        programDefinition: normalized.programDefinition,
        subjectProgramId: normalized.subjectProgramId,
        status: "active",
        transcriptFrontier: 0,
        activeAttempt: null,
        lastTerminalAttempt: null,
        checkpoint: null,
        createdAt: normalized.createdAt,
        updatedAt: normalized.createdAt,
      };
      if (current !== null) {
        const sameCreation = current.processId === candidate.processId &&
          current.createdAt === candidate.createdAt &&
          exactJsonValuesEqualV1(current.programDefinition, candidate.programDefinition) &&
          current.subjectProgramId === candidate.subjectProgramId;
        return sameCreation
          ? { kind: "unchanged", process: current }
          : { kind: "conflict", current };
      }
      try {
        backing.processes.set(normalized.processId, cloneProcessHeadV1(candidate));
        writeProcessSummaryIndexV1(backing, createProcessSummaryV1(candidate));
        backing.transcriptEntries.set(normalized.processId, new Map());
        backing.transcriptEntryIds.set(normalized.processId, new Map());
      } catch {
        backing.processes.delete(normalized.processId);
        const summary = backing.processSummaries.get(normalized.processId);
        if (summary !== undefined) removeProcessSummaryIndexV1(backing, summary);
        backing.transcriptEntries.delete(normalized.processId);
        backing.transcriptEntryIds.delete(normalized.processId);
        throw createProgramProcessRepositoryFailureV1("transaction_aborted", "create_process");
      }
      return { kind: "committed", process: cloneProcessHeadV1(candidate) };
    },

    async loadProcess(rawProcessId) {
      assertAvailableV1("load_process");
      return loadProcessV1(normalizeProcessIdV1(rawProcessId), "load_process");
    },

    async listProcessSummaries(rawInput) {
      assertAvailableV1("list_process_summaries");
      const normalized = normalizeProcessSummaryListInputV1(rawInput);
      const order = backing.processSummaryOrderBySubject.get(normalized.subjectProgramId) ?? [];
      const loadSummaryAtV1 = (index: number): ProcessSummaryV1 => {
        const processId = order[index];
        const stored = processId === undefined
          ? undefined
          : backing.processSummaries.get(processId);
        if (stored === undefined) {
          throw createProgramProcessRepositoryFailureV1(
            "schema_invalid",
            "list_process_summaries",
          );
        }
        let summary: ProcessSummaryV1;
        try {
          summary = cloneProcessSummaryV1(stored);
        } catch {
          throw createProgramProcessRepositoryFailureV1(
            "schema_invalid",
            "list_process_summaries",
          );
        }
        if (summary.subjectProgramId !== normalized.subjectProgramId) {
          throw createProgramProcessRepositoryFailureV1(
            "schema_invalid",
            "list_process_summaries",
          );
        }
        return summary;
      };
      let start = 0;
      if (normalized.before !== null) {
        let low = 0;
        let high = order.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          const summary = loadSummaryAtV1(middle);
          if (compareProcessSummaryPositionV1(summary, normalized.before) <= 0) low = middle + 1;
          else high = middle;
        }
        start = low;
      }
      const summaries: ProcessSummaryV1[] = [];
      let byteLength = 0;
      let index = start;
      for (; index < order.length; index += 1) {
        const summary = loadSummaryAtV1(index);
        const summaryBytes = processSummaryUtf8ByteLengthV1(summary);
        if (byteLength + summaryBytes > normalized.maximumBytes) {
          if (summaries.length === 0) {
            throw createProgramProcessRepositoryFailureV1(
              "page_budget_too_small",
              "list_process_summaries",
            );
          }
          break;
        }
        summaries.push(summary);
        byteLength += summaryBytes;
      }
      const last = summaries.at(-1);
      return {
        subjectProgramId: normalized.subjectProgramId,
        before: normalized.before,
        summaries,
        byteLength,
        nextCursor: index < order.length && last !== undefined
          ? { updatedAt: last.updatedAt, processId: last.processId }
          : null,
      };
    },

    async beginProcessAttempt(rawInput) {
      assertAvailableV1("begin_process_attempt");
      const normalized = normalizeProcessAttemptBeginInputV1(rawInput);
      const duplicate = findCommitV1(
        normalized.processId,
        normalized.commitId,
        "begin_process_attempt",
        normalized,
      );
      if (duplicate !== null) return duplicate;
      const current = loadProcessV1(normalized.processId, "begin_process_attempt");
      if (current === null) return { kind: "conflict", current: null };
      const triggerEntry = normalized.trigger.kind === "new_entry"
        ? normalized.trigger.entry
        : loadEntryV1(
          normalized.processId,
          normalized.trigger.sequence,
          "begin_process_attempt",
        );
      const appendsEntry = normalized.trigger.kind === "new_entry";
      const nextFrontier = appendsEntry
        ? normalized.expectedTranscriptFrontier + 1
        : normalized.expectedTranscriptFrontier;
      if (
        current.revision !== normalized.expectedProcessRevision ||
        current.transcriptFrontier !== normalized.expectedTranscriptFrontier ||
        current.activeAttempt !== null ||
        current.status === "interrupted_unrecoverable" ||
        (appendsEntry && current.status !== "active") ||
        (appendsEntry && triggerEntry?.sequence !== current.transcriptFrontier + 1) ||
        (!appendsEntry && current.status !== "interrupted_retryable") ||
        (!appendsEntry &&
          (current.lastTerminalAttempt?.outcome !== "interrupted" ||
            current.lastTerminalAttempt.triggerEntryId !== triggerEntry?.entryId ||
            current.lastTerminalAttempt.triggerSequence !== triggerEntry?.sequence)) ||
        triggerEntry === null || triggerEntry.role !== "user" ||
        triggerEntry.state !== "committed" ||
        triggerEntry.entryId !==
          (normalized.trigger.kind === "new_entry"
            ? normalized.trigger.entry.entryId
            : normalized.trigger.entryId) ||
        normalized.updatedAt < current.updatedAt ||
        normalized.generation <= (current.lastTerminalAttempt?.generation ?? 0) ||
        !checkpointCanAdvanceV1(current.checkpoint, normalized.startingCheckpoint, nextFrontier)
      ) return { kind: "conflict", current };
      const activeAttempt = {
        attemptId: normalized.attemptId,
        generation: normalized.generation,
        triggerEntryId: triggerEntry.entryId,
        triggerSequence: triggerEntry.sequence,
        startingCheckpoint: normalized.startingCheckpoint,
      } as const;
      const next = cloneProcessHeadV1({
        ...current,
        revision: current.revision + 1,
        status: "active",
        transcriptFrontier: nextFrontier,
        activeAttempt,
        checkpoint: normalized.startingCheckpoint,
        updatedAt: normalized.updatedAt,
      });
      return commitV1({
        operation: "begin_process_attempt",
        commitId: normalized.commitId,
        commitInput: normalized,
        current,
        next,
        entries: appendsEntry ? [triggerEntry] : [],
        terminalReceipt: null,
      });
    },

    async appendProcessTranscript(rawInput) {
      assertAvailableV1("append_process_transcript");
      const normalized = normalizeProcessTranscriptAppendInputV1(rawInput);
      const duplicate = findCommitV1(
        normalized.processId,
        normalized.commitId,
        "append_process_transcript",
        normalized,
      );
      if (duplicate !== null) return duplicate;
      const current = loadProcessV1(normalized.processId, "append_process_transcript");
      const firstEntry = normalized.entries[0]!;
      const terminal = normalized.terminalAttemptReceipt;
      const binding = normalized.attemptBinding;
      if (
        current === null || current.revision !== normalized.expectedProcessRevision ||
        current.transcriptFrontier !== normalized.expectedTranscriptFrontier ||
        current.status !== "active" ||
        firstEntry.sequence !== current.transcriptFrontier + 1 ||
        normalized.updatedAt < current.updatedAt ||
        (current.activeAttempt === null) !== (binding === null) ||
        (current.activeAttempt !== null && binding !== null &&
          (binding.attemptId !== current.activeAttempt.attemptId ||
            binding.generation !== current.activeAttempt.generation)) ||
        (terminal !== null &&
          (binding === null || terminal.attemptId !== binding.attemptId ||
            terminal.generation !== binding.generation))
      ) return { kind: "conflict", current };
      const frontier = normalized.entries[normalized.entries.length - 1]!.sequence;
      if (
        normalized.checkpoint !== null &&
        !checkpointCanAdvanceV1(current.checkpoint, normalized.checkpoint, frontier)
      ) return { kind: "conflict", current };
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
        checkpoint: normalized.checkpoint ?? current.checkpoint,
        updatedAt: normalized.updatedAt,
      });
      return commitV1({
        operation: "append_process_transcript",
        commitId: normalized.commitId,
        commitInput: normalized,
        current,
        next,
        entries: normalized.entries,
        terminalReceipt: terminal,
      });
    },

    async loadTranscriptPage(rawInput) {
      assertAvailableV1("load_transcript_page");
      const normalized = normalizeTranscriptPageRequestV1(rawInput);
      const process = loadProcessV1(normalized.processId, "load_transcript_page");
      if (process === null) return null;
      const rows = backing.transcriptEntries.get(process.processId);
      if (rows === undefined) {
        throw createProgramProcessRepositoryFailureV1("schema_invalid", "load_transcript_page");
      }
      const before = normalized.beforeSequence === null
        ? process.transcriptFrontier + 1
        : Math.min(normalized.beforeSequence, process.transcriptFrontier + 1);
      const descending: TranscriptEntryV1[] = [];
      let byteLength = 0;
      for (let sequence = before - 1; sequence >= 1; sequence -= 1) {
        const stored = rows.get(sequence);
        if (stored === undefined) {
          throw createProgramProcessRepositoryFailureV1("schema_invalid", "load_transcript_page");
        }
        const entry = cloneTranscriptEntryV1(stored);
        const entryBytes = transcriptEntryUtf8ByteLengthV1(entry);
        if (byteLength + entryBytes > normalized.maximumBytes) {
          if (descending.length === 0) {
            throw createProgramProcessRepositoryFailureV1(
              "page_budget_too_small",
              "load_transcript_page",
            );
          }
          break;
        }
        descending.push(entry);
        byteLength += entryBytes;
      }
      const entries = descending.toReversed();
      const oldest = entries[0];
      return {
        processId: process.processId,
        beforeSequence: normalized.beforeSequence,
        entries,
        byteLength,
        nextBeforeSequence: oldest !== undefined && oldest.sequence > 1 ? oldest.sequence : null,
      };
    },

    async reset(): Promise<void> {
      assertAvailableV1("reset");
      backing.programDefinitions.clear();
      backing.processes.clear();
      backing.processSummaries.clear();
      backing.processSummaryOrderBySubject.clear();
      backing.transcriptEntries.clear();
      backing.transcriptEntryIds.clear();
      backing.commits.clear();
    },

    async dispose(): Promise<void> {
      disposed = true;
    },
  };
}
