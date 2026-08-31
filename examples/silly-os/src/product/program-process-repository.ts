// SPDX-License-Identifier: MIT

/** Compatibility generation, not a Program Definition content revision. */
export const bundledCreatorProgramCompatibilityReferenceV1 = "sillyos.builtin.creator@1" as const;
/** Stable persisted compatibility value; its historical spelling grants no privilege. */
export const bundledCreatorProgramIdV1 = "sillyos.builtin.creator" as const;

/**
 * Product-side work budget for one admitted structured payload. It keeps one
 * clone/admission/storage operation bounded without claiming a strict Worker
 * transport envelope. Artifact bytes are referenced instead of embedded, and
 * this never limits total Programs, Processes, entries, or Conversation bytes.
 */
export const operationalStructuredPayloadMaximumBytesV1 = 4 * 1024 * 1024;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export type ProgramDefinitionKindV1 =
  | "creator"
  | "translation"
  | "writing"
  | "roleplay"
  | "general";

export interface ProgramDefinitionReferenceV1 {
  readonly programId: string;
  readonly revision: number;
}

/**
 * Immutable reusable Program content. `harnessReference` is an opaque
 * execution-compatibility generation; refreshed SillyOS code may select a
 * newer implementation that supports the same reference.
 */
export interface ProgramDefinitionRevisionV1 extends ProgramDefinitionReferenceV1 {
  readonly schemaVersion: 1;
  readonly kind: ProgramDefinitionKindV1;
  readonly name: string;
  readonly purpose: string;
  readonly harnessReference: string;
  readonly capabilityIds: readonly string[];
}

export interface ProcessCheckpointV1 {
  readonly checkpointId: string;
  readonly throughSequence: number;
  readonly workspaceId: string;
  readonly workspaceCheckpointId: string;
  readonly workspaceGeneration: number;
}

export interface ProcessActiveAttemptV1 {
  readonly attemptId: string;
  readonly generation: number;
  readonly triggerEntryId: string;
  readonly triggerSequence: number;
  readonly startingCheckpoint: ProcessCheckpointV1;
}

export interface ProcessAttemptBindingV1 {
  readonly attemptId: string;
  readonly generation: number;
}

export type ProcessAttemptOutcomeV1 =
  | "completed"
  | "failed"
  | "cancelled"
  | "replaced"
  | "interrupted";

export interface ProcessTerminalAttemptStateV1 {
  readonly attemptId: string;
  readonly generation: number;
  readonly outcome: ProcessAttemptOutcomeV1;
  readonly triggerEntryId: string;
  readonly triggerSequence: number;
  readonly interruptionDisposition: "retryable" | "unrecoverable" | null;
}

export interface ProcessHeadV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly revision: number;
  /** Pinned once at Process creation. */
  readonly programDefinition: ProgramDefinitionReferenceV1;
  /** Program being created or edited, not the Process harness identity. */
  readonly subjectProgramId: string | null;
  readonly status:
    | "active"
    | "interrupted_retryable"
    | "interrupted_unrecoverable";
  /** Last committed sequence; zero means no transcript entries. */
  readonly transcriptFrontier: number;
  readonly activeAttempt: ProcessActiveAttemptV1 | null;
  readonly lastTerminalAttempt: ProcessTerminalAttemptStateV1 | null;
  readonly checkpoint: ProcessCheckpointV1 | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Compact list projection; transcript and attempt/checkpoint bodies stay normalized elsewhere. */
export interface ProcessSummaryV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly processRevision: number;
  readonly programDefinition: ProgramDefinitionReferenceV1;
  readonly subjectProgramId: string | null;
  readonly status: ProcessHeadV1["status"];
  readonly transcriptFrontier: number;
  readonly updatedAt: number;
}

export interface ProcessSummaryCursorV1 {
  readonly updatedAt: number;
  readonly processId: string;
}

export interface ProcessSummaryListInputV1 {
  /** Exact subject match; null addresses Processes without a subject Program. */
  readonly subjectProgramId: string | null;
  /** Exclusive `(updatedAt, processId)` cursor in reverse tuple order. */
  readonly before: ProcessSummaryCursorV1 | null;
  readonly maximumBytes: number;
}

export interface ProcessSummaryPageV1 {
  readonly subjectProgramId: string | null;
  readonly before: ProcessSummaryCursorV1 | null;
  readonly summaries: readonly ProcessSummaryV1[];
  /** Sum of the summaries' admitted JSON bytes; the response envelope is excluded. */
  readonly byteLength: number;
  readonly nextCursor: ProcessSummaryCursorV1 | null;
}

interface TranscriptPartBaseV1 {
  readonly partId: string;
}

export interface TranscriptTextMarkdownPartV1 extends TranscriptPartBaseV1 {
  readonly kind: "text_markdown";
  readonly markdown: string;
}

/** Provider-exposed summary only; hidden chain-of-thought has no representation. */
export interface TranscriptReasoningSummaryPartV1 extends TranscriptPartBaseV1 {
  readonly kind: "reasoning_summary";
  readonly summaryMarkdown: string;
}

export interface TranscriptToolCallPartV1 extends TranscriptPartBaseV1 {
  readonly kind: "tool_call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly argumentsJson: string;
}

export interface TranscriptToolStatusPartV1 extends TranscriptPartBaseV1 {
  readonly kind: "tool_status";
  readonly toolCallId: string;
  readonly status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  readonly message: string | null;
}

export interface TranscriptToolResultPartV1 extends TranscriptPartBaseV1 {
  readonly kind: "tool_result";
  readonly toolCallId: string;
  readonly outcome: "succeeded" | "failed";
  readonly resultJson: string;
  readonly summaryMarkdown: string | null;
}

export interface TranscriptArtifactReferencePartV1 extends TranscriptPartBaseV1 {
  readonly kind: "artifact_reference";
  readonly artifactId: string;
  readonly label: string;
  readonly mediaType: string;
  readonly reference: string;
}

export type TranscriptPartV1 =
  | TranscriptTextMarkdownPartV1
  | TranscriptReasoningSummaryPartV1
  | TranscriptToolCallPartV1
  | TranscriptToolStatusPartV1
  | TranscriptToolResultPartV1
  | TranscriptArtifactReferencePartV1;

export interface TranscriptEntryV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly sequence: number;
  readonly entryId: string;
  readonly role: "user" | "assistant" | "system" | "tool";
  readonly state: "committed" | "interrupted_partial";
  readonly parts: readonly TranscriptPartV1[];
}

/** Immutable evidence committed atomically with its terminal transcript entry. */
export interface ProcessTerminalAttemptReceiptV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly outcome: ProcessAttemptOutcomeV1;
  readonly terminalSequence: number;
  readonly terminalEntryId: string;
  readonly interruptionDisposition: "retryable" | "unrecoverable" | null;
}

export interface ProcessCreateInputV1 {
  readonly processId: string;
  readonly programDefinition: ProgramDefinitionReferenceV1;
  readonly subjectProgramId: string | null;
  readonly createdAt: number;
}

export type ProcessAttemptTriggerV1 =
  | { readonly kind: "new_entry"; readonly entry: TranscriptEntryV1 }
  | {
    readonly kind: "existing_entry";
    readonly entryId: string;
    readonly sequence: number;
  };

export interface ProcessAttemptBeginInputV1 {
  readonly processId: string;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  readonly commitId: string;
  readonly attemptId: string;
  readonly generation: number;
  readonly trigger: ProcessAttemptTriggerV1;
  readonly startingCheckpoint: ProcessCheckpointV1;
  readonly updatedAt: number;
}

export interface ProcessTranscriptAppendInputV1 {
  readonly processId: string;
  readonly expectedProcessRevision: number;
  readonly expectedTranscriptFrontier: number;
  /** Scoped to this Process for exact lost-outcome reconciliation. */
  readonly commitId: string;
  /** Exact owner of these entries, or null when no attempt is active. */
  readonly attemptBinding: ProcessAttemptBindingV1 | null;
  readonly entries: readonly TranscriptEntryV1[];
  /** Optional semantic checkpoint advanced atomically with this append. */
  readonly checkpoint: ProcessCheckpointV1 | null;
  readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  readonly updatedAt: number;
}

export interface TranscriptPageV1 {
  readonly processId: string;
  readonly beforeSequence: number | null;
  /** Chronological order within this backward-loaded page. */
  readonly entries: readonly TranscriptEntryV1[];
  /** Sum of the entries' admitted JSON bytes; this is a work budget, not a Worker envelope. */
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
}

export type ProgramDefinitionPublishResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly definition: ProgramDefinitionRevisionV1;
  }
  | { readonly kind: "conflict"; readonly current: ProgramDefinitionRevisionV1 };

export type ProcessCreateResultV1 =
  | { readonly kind: "committed" | "unchanged"; readonly process: ProcessHeadV1 }
  | { readonly kind: "conflict"; readonly current: ProcessHeadV1 }
  | {
    readonly kind: "program_definition_missing";
    readonly programDefinition: ProgramDefinitionReferenceV1;
  };

export type ProcessCommitResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly process: ProcessHeadV1;
    readonly entries: readonly TranscriptEntryV1[];
    readonly terminalAttemptReceipt: ProcessTerminalAttemptReceiptV1 | null;
  }
  | { readonly kind: "conflict"; readonly current: ProcessHeadV1 | null };

export interface ProgramProcessRepositoryV1 {
  publishProgramDefinitionRevision(
    definition: ProgramDefinitionRevisionV1,
  ): Promise<ProgramDefinitionPublishResultV1>;
  loadProgramDefinitionRevision(
    programId: string,
    revision: number,
  ): Promise<ProgramDefinitionRevisionV1 | null>;
  createProcess(input: ProcessCreateInputV1): Promise<ProcessCreateResultV1>;
  loadProcess(processId: string): Promise<ProcessHeadV1 | null>;
  listProcessSummaries(input: ProcessSummaryListInputV1): Promise<ProcessSummaryPageV1>;
  beginProcessAttempt(input: ProcessAttemptBeginInputV1): Promise<ProcessCommitResultV1>;
  appendProcessTranscript(input: ProcessTranscriptAppendInputV1): Promise<ProcessCommitResultV1>;
  loadTranscriptPage(input: {
    readonly processId: string;
    readonly beforeSequence: number | null;
    readonly maximumBytes: number;
  }): Promise<TranscriptPageV1 | null>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export type ProgramProcessRepositoryOperationV1 =
  | "publish_program_definition_revision"
  | "load_program_definition_revision"
  | "create_process"
  | "load_process"
  | "list_process_summaries"
  | "begin_process_attempt"
  | "append_process_transcript"
  | "load_transcript_page"
  | "reset"
  | "dispose";
export type ProgramProcessRepositoryFailureCodeV1 =
  | "disposed"
  | "schema_invalid"
  | "transaction_aborted"
  | "page_budget_too_small";
export interface ProgramProcessRepositoryFailureV1 extends Error {
  readonly code: ProgramProcessRepositoryFailureCodeV1;
  readonly operation: ProgramProcessRepositoryOperationV1;
}

export type ProgramProcessAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

type RecordV1 = Readonly<Record<string, unknown>>;

function exactRecordV1(value: unknown, keys: readonly string[]): RecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== keys.length ||
    !actualKeys.every((key) => typeof key === "string" && keys.includes(key))
  ) return null;
  return value as RecordV1;
}

function admittedV1<TValue>(value: TValue): ProgramProcessAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function rejectedV1<TValue>(path: string): ProgramProcessAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function textV1(value: unknown, trimmed = false): value is string {
  return typeof value === "string" && value.length > 0 && (!trimmed || value.trim() === value);
}

function jsonTextV1(value: unknown): value is string {
  if (!textV1(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function jsonBytesV1(value: unknown): number {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError("value is not JSON serializable");
  let bytes = 0;
  for (const character of json) {
    const codePoint = character.codePointAt(0)!;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function attemptOutcomeV1(value: unknown): value is ProcessAttemptOutcomeV1 {
  return value === "completed" || value === "failed" || value === "cancelled" ||
    value === "replaced" || value === "interrupted";
}

function admitAttemptBindingV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessAttemptBindingV1> {
  const row = exactRecordV1(value, ["attemptId", "generation"]);
  if (
    row === null || !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation)
  ) return rejectedV1("/");
  return admittedV1({ attemptId: row.attemptId, generation: row.generation });
}

function requireAdmittedV1<T>(result: ProgramProcessAdmissionResultV1<T>, label: string): T {
  if (result.kind === "rejected") {
    throw new TypeError(`sillyos.program_process_repository.${label}.invalid${result.path}`);
  }
  return result.value;
}

export function createBundledCreatorProgramDefinitionRevisionV1(): ProgramDefinitionRevisionV1 {
  return {
    schemaVersion: 1,
    programId: bundledCreatorProgramIdV1,
    revision: 1,
    kind: "creator",
    name: "Creator",
    purpose: "Create and revise reusable SillyOS Programs with explicit human review.",
    harnessReference: bundledCreatorProgramCompatibilityReferenceV1,
    capabilityIds: [],
  };
}

export function admitProgramDefinitionReferenceV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProgramDefinitionReferenceV1> {
  const row = exactRecordV1(value, ["programId", "revision"]);
  if (row === null || !identifierV1(row.programId) || !positiveIntegerV1(row.revision)) {
    return rejectedV1("/");
  }
  return admittedV1({ programId: row.programId, revision: row.revision });
}

export function formatProgramDefinitionReferenceV1(value: ProgramDefinitionReferenceV1): string {
  const reference = requireAdmittedV1(admitProgramDefinitionReferenceV1(value), "program_ref");
  return `${reference.programId}@${String(reference.revision)}`;
}

export function admitProgramDefinitionRevisionV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProgramDefinitionRevisionV1> {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "programId",
    "revision",
    "kind",
    "name",
    "purpose",
    "harnessReference",
    "capabilityIds",
  ]);
  if (row === null || row.schemaVersion !== 1) return rejectedV1("/");
  if (!identifierV1(row.programId) || !positiveIntegerV1(row.revision)) return rejectedV1("/");
  if (
    row.kind !== "creator" && row.kind !== "translation" && row.kind !== "writing" &&
    row.kind !== "roleplay" && row.kind !== "general"
  ) return rejectedV1("/kind");
  if (!textV1(row.name, true) || !textV1(row.purpose, true)) return rejectedV1("/");
  if (!textV1(row.harnessReference, true) || !Array.isArray(row.capabilityIds)) {
    return rejectedV1("/");
  }
  const capabilityIds: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < row.capabilityIds.length; index += 1) {
    const capabilityId = row.capabilityIds[index];
    if (!identifierV1(capabilityId) || seen.has(capabilityId)) {
      return rejectedV1(`/capabilityIds/${String(index)}`);
    }
    seen.add(capabilityId);
    capabilityIds.push(capabilityId);
  }
  const definition: ProgramDefinitionRevisionV1 = {
    schemaVersion: 1,
    programId: row.programId,
    revision: row.revision,
    kind: row.kind,
    name: row.name,
    purpose: row.purpose,
    harnessReference: row.harnessReference,
    capabilityIds,
  };
  return jsonBytesV1(definition) <= operationalStructuredPayloadMaximumBytesV1
    ? admittedV1(definition)
    : rejectedV1("/");
}

function admitCheckpointV1(value: unknown): ProgramProcessAdmissionResultV1<ProcessCheckpointV1> {
  const row = exactRecordV1(value, [
    "checkpointId",
    "throughSequence",
    "workspaceId",
    "workspaceCheckpointId",
    "workspaceGeneration",
  ]);
  if (
    row === null || !identifierV1(row.checkpointId) ||
    !positiveIntegerV1(row.throughSequence) || !identifierV1(row.workspaceId) ||
    !identifierV1(row.workspaceCheckpointId) || !positiveIntegerV1(row.workspaceGeneration)
  ) return rejectedV1("/");
  return admittedV1({
    checkpointId: row.checkpointId,
    throughSequence: row.throughSequence,
    workspaceId: row.workspaceId,
    workspaceCheckpointId: row.workspaceCheckpointId,
    workspaceGeneration: row.workspaceGeneration,
  });
}

function admitActiveAttemptV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessActiveAttemptV1> {
  const row = exactRecordV1(value, [
    "attemptId",
    "generation",
    "triggerEntryId",
    "triggerSequence",
    "startingCheckpoint",
  ]);
  if (
    row === null || !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !identifierV1(row.triggerEntryId) ||
    !positiveIntegerV1(row.triggerSequence)
  ) return rejectedV1("/");
  const checkpoint = admitCheckpointV1(row.startingCheckpoint);
  if (checkpoint.kind === "rejected") return rejectedV1("/startingCheckpoint");
  if (checkpoint.value.throughSequence < row.triggerSequence) return rejectedV1("/");
  return admittedV1({
    attemptId: row.attemptId,
    generation: row.generation,
    triggerEntryId: row.triggerEntryId,
    triggerSequence: row.triggerSequence,
    startingCheckpoint: checkpoint.value,
  });
}

function admitTerminalStateV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessTerminalAttemptStateV1> {
  const row = exactRecordV1(value, [
    "attemptId",
    "generation",
    "outcome",
    "triggerEntryId",
    "triggerSequence",
    "interruptionDisposition",
  ]);
  if (
    row === null || !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !attemptOutcomeV1(row.outcome) || !identifierV1(row.triggerEntryId) ||
    !positiveIntegerV1(row.triggerSequence) ||
    (row.outcome === "interrupted" && row.interruptionDisposition !== "retryable" &&
      row.interruptionDisposition !== "unrecoverable") ||
    (row.outcome !== "interrupted" && row.interruptionDisposition !== null)
  ) return rejectedV1("/");
  return admittedV1({
    attemptId: row.attemptId,
    generation: row.generation,
    outcome: row.outcome,
    triggerEntryId: row.triggerEntryId,
    triggerSequence: row.triggerSequence,
    interruptionDisposition: row.interruptionDisposition === "retryable" ||
        row.interruptionDisposition === "unrecoverable"
      ? row.interruptionDisposition
      : null,
  });
}

export function admitProcessHeadV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessHeadV1> {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "processId",
    "revision",
    "programDefinition",
    "subjectProgramId",
    "status",
    "transcriptFrontier",
    "activeAttempt",
    "lastTerminalAttempt",
    "checkpoint",
    "createdAt",
    "updatedAt",
  ]);
  if (row === null || row.schemaVersion !== 1) return rejectedV1("/");
  if (!identifierV1(row.processId) || !positiveIntegerV1(row.revision)) return rejectedV1("/");
  const definition = admitProgramDefinitionReferenceV1(row.programDefinition);
  if (definition.kind === "rejected") return rejectedV1("/programDefinition");
  if (row.subjectProgramId !== null && !identifierV1(row.subjectProgramId)) return rejectedV1("/");
  if (
    row.status !== "active" && row.status !== "interrupted_retryable" &&
    row.status !== "interrupted_unrecoverable"
  ) return rejectedV1("/status");
  if (!nonNegativeIntegerV1(row.transcriptFrontier)) return rejectedV1("/");
  const active = row.activeAttempt === null ? null : admitActiveAttemptV1(row.activeAttempt);
  if (active !== null && active.kind === "rejected") return rejectedV1("/activeAttempt");
  const terminal = row.lastTerminalAttempt === null
    ? null
    : admitTerminalStateV1(row.lastTerminalAttempt);
  if (terminal !== null && terminal.kind === "rejected") return rejectedV1("/lastTerminalAttempt");
  const checkpoint = row.checkpoint === null ? null : admitCheckpointV1(row.checkpoint);
  if (checkpoint !== null && checkpoint.kind === "rejected") return rejectedV1("/checkpoint");
  if (
    (active?.kind === "admitted" && active.value.triggerSequence > row.transcriptFrontier) ||
    (terminal?.kind === "admitted" && terminal.value.triggerSequence > row.transcriptFrontier) ||
    (checkpoint?.kind === "admitted" && checkpoint.value.throughSequence > row.transcriptFrontier)
  ) return rejectedV1("/");
  const activeValue = active?.kind === "admitted" ? active.value : null;
  const terminalValue = terminal?.kind === "admitted" ? terminal.value : null;
  const checkpointValue = checkpoint?.kind === "admitted" ? checkpoint.value : null;
  if (row.status !== "active" && activeValue !== null) return rejectedV1("/activeAttempt");
  if (
    row.status === "interrupted_retryable" &&
      (terminalValue?.outcome !== "interrupted" ||
        terminalValue.interruptionDisposition !== "retryable") ||
    row.status === "interrupted_unrecoverable" &&
      (terminalValue?.outcome !== "interrupted" ||
        terminalValue.interruptionDisposition !== "unrecoverable")
  ) return rejectedV1("/lastTerminalAttempt");
  if (row.status === "interrupted_retryable" && checkpointValue === null) {
    return rejectedV1("/checkpoint");
  }
  if (
    terminalValue?.outcome === "interrupted" && row.status === "active" &&
    (activeValue === null ||
      activeValue.triggerEntryId !== terminalValue.triggerEntryId ||
      activeValue.triggerSequence !== terminalValue.triggerSequence)
  ) return rejectedV1("/activeAttempt");
  if (
    activeValue !== null &&
    (checkpointValue === null ||
      terminalValue !== null && activeValue.generation <= terminalValue.generation ||
      checkpointValue.workspaceId !== activeValue.startingCheckpoint.workspaceId ||
      checkpointValue.workspaceGeneration < activeValue.startingCheckpoint.workspaceGeneration ||
      checkpointValue.throughSequence < activeValue.startingCheckpoint.throughSequence ||
      checkpointValue.workspaceGeneration === activeValue.startingCheckpoint.workspaceGeneration &&
        checkpointValue.workspaceCheckpointId !==
          activeValue.startingCheckpoint.workspaceCheckpointId ||
      checkpointValue.workspaceGeneration === activeValue.startingCheckpoint.workspaceGeneration &&
        checkpointValue.throughSequence === activeValue.startingCheckpoint.throughSequence &&
        checkpointValue.checkpointId !== activeValue.startingCheckpoint.checkpointId)
  ) return rejectedV1("/activeAttempt");
  if (
    !nonNegativeIntegerV1(row.createdAt) || !nonNegativeIntegerV1(row.updatedAt) ||
    row.updatedAt < row.createdAt
  ) return rejectedV1("/");
  return admittedV1({
    schemaVersion: 1,
    processId: row.processId,
    revision: row.revision,
    programDefinition: definition.value,
    subjectProgramId: row.subjectProgramId,
    status: row.status,
    transcriptFrontier: row.transcriptFrontier,
    activeAttempt: activeValue,
    lastTerminalAttempt: terminalValue,
    checkpoint: checkpointValue,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function admitProcessSummaryV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessSummaryV1> {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "processId",
    "processRevision",
    "programDefinition",
    "subjectProgramId",
    "status",
    "transcriptFrontier",
    "updatedAt",
  ]);
  if (
    row === null || row.schemaVersion !== 1 || !identifierV1(row.processId) ||
    !positiveIntegerV1(row.processRevision) ||
    (row.subjectProgramId !== null && !identifierV1(row.subjectProgramId)) ||
    (row.status !== "active" && row.status !== "interrupted_retryable" &&
      row.status !== "interrupted_unrecoverable") ||
    !nonNegativeIntegerV1(row.transcriptFrontier) || !nonNegativeIntegerV1(row.updatedAt)
  ) return rejectedV1("/");
  const definition = admitProgramDefinitionReferenceV1(row.programDefinition);
  if (definition.kind === "rejected") return rejectedV1("/programDefinition");
  return admittedV1({
    schemaVersion: 1,
    processId: row.processId,
    processRevision: row.processRevision,
    programDefinition: definition.value,
    subjectProgramId: row.subjectProgramId,
    status: row.status,
    transcriptFrontier: row.transcriptFrontier,
    updatedAt: row.updatedAt,
  });
}

export function createProcessSummaryV1(value: ProcessHeadV1): ProcessSummaryV1 {
  const head = cloneProcessHeadV1(value);
  return {
    schemaVersion: 1,
    processId: head.processId,
    processRevision: head.revision,
    programDefinition: head.programDefinition,
    subjectProgramId: head.subjectProgramId,
    status: head.status,
    transcriptFrontier: head.transcriptFrontier,
    updatedAt: head.updatedAt,
  };
}

function admitPartV1(value: unknown): ProgramProcessAdmissionResultV1<TranscriptPartV1> {
  const kind = value !== null && typeof value === "object" ? (value as RecordV1).kind : null;
  if (kind === "text_markdown") {
    const row = exactRecordV1(value, ["kind", "partId", "markdown"]);
    return row !== null && identifierV1(row.partId) && textV1(row.markdown)
      ? admittedV1({ kind, partId: row.partId, markdown: row.markdown })
      : rejectedV1("/");
  }
  if (kind === "reasoning_summary") {
    const row = exactRecordV1(value, ["kind", "partId", "summaryMarkdown"]);
    return row !== null && identifierV1(row.partId) && textV1(row.summaryMarkdown)
      ? admittedV1({ kind, partId: row.partId, summaryMarkdown: row.summaryMarkdown })
      : rejectedV1("/");
  }
  if (kind === "tool_call") {
    const row = exactRecordV1(value, ["kind", "partId", "toolCallId", "toolName", "argumentsJson"]);
    return row !== null && identifierV1(row.partId) && identifierV1(row.toolCallId) &&
        identifierV1(row.toolName) && jsonTextV1(row.argumentsJson)
      ? admittedV1({
        kind,
        partId: row.partId,
        toolCallId: row.toolCallId,
        toolName: row.toolName,
        argumentsJson: row.argumentsJson,
      })
      : rejectedV1("/");
  }
  if (kind === "tool_status") {
    const row = exactRecordV1(value, ["kind", "partId", "toolCallId", "status", "message"]);
    if (
      row === null || !identifierV1(row.partId) || !identifierV1(row.toolCallId) ||
      (row.status !== "queued" && row.status !== "running" && row.status !== "succeeded" &&
        row.status !== "failed" && row.status !== "cancelled") ||
      (row.message !== null && !textV1(row.message))
    ) return rejectedV1("/");
    return admittedV1({
      kind,
      partId: row.partId,
      toolCallId: row.toolCallId,
      status: row.status,
      message: row.message,
    });
  }
  if (kind === "tool_result") {
    const row = exactRecordV1(value, [
      "kind",
      "partId",
      "toolCallId",
      "outcome",
      "resultJson",
      "summaryMarkdown",
    ]);
    if (
      row === null || !identifierV1(row.partId) || !identifierV1(row.toolCallId) ||
      (row.outcome !== "succeeded" && row.outcome !== "failed") || !jsonTextV1(row.resultJson) ||
      (row.summaryMarkdown !== null && !textV1(row.summaryMarkdown))
    ) return rejectedV1("/");
    return admittedV1({
      kind,
      partId: row.partId,
      toolCallId: row.toolCallId,
      outcome: row.outcome,
      resultJson: row.resultJson,
      summaryMarkdown: row.summaryMarkdown,
    });
  }
  if (kind === "artifact_reference") {
    const row = exactRecordV1(value, [
      "kind",
      "partId",
      "artifactId",
      "label",
      "mediaType",
      "reference",
    ]);
    if (
      row === null || !identifierV1(row.partId) || !identifierV1(row.artifactId) ||
      !textV1(row.label, true) || !textV1(row.mediaType, true) || !textV1(row.reference, true)
    ) return rejectedV1("/");
    return admittedV1({
      kind,
      partId: row.partId,
      artifactId: row.artifactId,
      label: row.label,
      mediaType: row.mediaType,
      reference: row.reference,
    });
  }
  return rejectedV1("/");
}

export function admitTranscriptEntryV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<TranscriptEntryV1> {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "processId",
    "sequence",
    "entryId",
    "role",
    "state",
    "parts",
  ]);
  if (row === null || row.schemaVersion !== 1) return rejectedV1("/");
  if (
    !identifierV1(row.processId) || !positiveIntegerV1(row.sequence) || !identifierV1(row.entryId)
  ) return rejectedV1("/");
  if (
    row.role !== "user" && row.role !== "assistant" && row.role !== "system" && row.role !== "tool"
  ) return rejectedV1("/role");
  if (row.state !== "committed" && row.state !== "interrupted_partial") return rejectedV1("/state");
  if (!Array.isArray(row.parts) || row.parts.length === 0) return rejectedV1("/parts");
  const parts: TranscriptPartV1[] = [];
  const partIds = new Set<string>();
  for (let index = 0; index < row.parts.length; index += 1) {
    const part = admitPartV1(row.parts[index]);
    if (part.kind === "rejected" || partIds.has(part.value.partId)) {
      return rejectedV1(`/parts/${String(index)}`);
    }
    partIds.add(part.value.partId);
    parts.push(part.value);
  }
  const entry: TranscriptEntryV1 = {
    schemaVersion: 1,
    processId: row.processId,
    sequence: row.sequence,
    entryId: row.entryId,
    role: row.role,
    state: row.state,
    parts,
  };
  return jsonBytesV1(entry) <= operationalStructuredPayloadMaximumBytesV1
    ? admittedV1(entry)
    : rejectedV1("/");
}

export function admitProcessTerminalAttemptReceiptV1(
  value: unknown,
): ProgramProcessAdmissionResultV1<ProcessTerminalAttemptReceiptV1> {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "processId",
    "attemptId",
    "generation",
    "outcome",
    "terminalSequence",
    "terminalEntryId",
    "interruptionDisposition",
  ]);
  if (
    row === null || row.schemaVersion !== 1 || !identifierV1(row.processId) ||
    !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !attemptOutcomeV1(row.outcome) || !positiveIntegerV1(row.terminalSequence) ||
    !identifierV1(row.terminalEntryId)
  ) return rejectedV1("/");
  if (
    (row.outcome === "interrupted" && row.interruptionDisposition !== "retryable" &&
      row.interruptionDisposition !== "unrecoverable") ||
    (row.outcome !== "interrupted" && row.interruptionDisposition !== null)
  ) return rejectedV1("/interruptionDisposition");
  const interruptionDisposition: "retryable" | "unrecoverable" | null =
    row.interruptionDisposition === "retryable" ||
      row.interruptionDisposition === "unrecoverable"
      ? row.interruptionDisposition
      : null;
  return admittedV1({
    schemaVersion: 1,
    processId: row.processId,
    attemptId: row.attemptId,
    generation: row.generation,
    outcome: row.outcome,
    terminalSequence: row.terminalSequence,
    terminalEntryId: row.terminalEntryId,
    interruptionDisposition,
  });
}

export function normalizeProcessCreateInputV1(value: ProcessCreateInputV1): ProcessCreateInputV1 {
  const row = exactRecordV1(value, [
    "processId",
    "programDefinition",
    "subjectProgramId",
    "createdAt",
  ]);
  if (row === null || !identifierV1(row.processId) || !nonNegativeIntegerV1(row.createdAt)) {
    throw new TypeError("invalid Process create input");
  }
  const definition = requireAdmittedV1(
    admitProgramDefinitionReferenceV1(row.programDefinition),
    "program_ref",
  );
  if (row.subjectProgramId !== null && !identifierV1(row.subjectProgramId)) {
    throw new TypeError("invalid Process subject");
  }
  return {
    processId: row.processId,
    programDefinition: definition,
    subjectProgramId: row.subjectProgramId,
    createdAt: row.createdAt,
  };
}

export function normalizeProcessAttemptBeginInputV1(
  value: ProcessAttemptBeginInputV1,
): ProcessAttemptBeginInputV1 {
  const row = exactRecordV1(value, [
    "processId",
    "expectedProcessRevision",
    "expectedTranscriptFrontier",
    "commitId",
    "attemptId",
    "generation",
    "trigger",
    "startingCheckpoint",
    "updatedAt",
  ]);
  if (
    row === null || !identifierV1(row.processId) ||
    !positiveIntegerV1(row.expectedProcessRevision) ||
    !nonNegativeIntegerV1(row.expectedTranscriptFrontier) || !identifierV1(row.commitId) ||
    !identifierV1(row.attemptId) || !positiveIntegerV1(row.generation) ||
    !nonNegativeIntegerV1(row.updatedAt)
  ) throw new TypeError("invalid Process attempt begin input");
  const triggerDiscriminator = row.trigger !== null && typeof row.trigger === "object"
    ? (row.trigger as RecordV1).kind
    : null;
  let trigger: ProcessAttemptTriggerV1;
  if (triggerDiscriminator === "new_entry") {
    const triggerRow = exactRecordV1(row.trigger, ["kind", "entry"]);
    if (triggerRow === null) throw new TypeError("invalid Process attempt trigger");
    const entry = requireAdmittedV1(admitTranscriptEntryV1(triggerRow.entry), "trigger_entry");
    if (entry.processId !== row.processId || entry.role !== "user" || entry.state !== "committed") {
      throw new TypeError("invalid Process attempt trigger");
    }
    trigger = { kind: "new_entry", entry };
  } else if (triggerDiscriminator === "existing_entry") {
    const triggerRow = exactRecordV1(row.trigger, ["kind", "entryId", "sequence"]);
    if (
      triggerRow === null || !identifierV1(triggerRow.entryId) ||
      !positiveIntegerV1(triggerRow.sequence)
    ) throw new TypeError("invalid Process attempt trigger");
    trigger = {
      kind: "existing_entry",
      entryId: triggerRow.entryId,
      sequence: triggerRow.sequence,
    };
  } else {
    throw new TypeError("invalid Process attempt trigger");
  }
  const checkpoint = requireAdmittedV1(
    admitCheckpointV1(row.startingCheckpoint),
    "starting_checkpoint",
  );
  if (
    trigger.kind === "new_entry" && checkpoint.throughSequence !== trigger.entry.sequence ||
    trigger.kind === "existing_entry" && checkpoint.throughSequence < trigger.sequence
  ) throw new TypeError("invalid Process attempt trigger checkpoint");
  return {
    processId: row.processId,
    expectedProcessRevision: row.expectedProcessRevision,
    expectedTranscriptFrontier: row.expectedTranscriptFrontier,
    commitId: row.commitId,
    attemptId: row.attemptId,
    generation: row.generation,
    trigger,
    startingCheckpoint: checkpoint,
    updatedAt: row.updatedAt,
  };
}

export function normalizeProcessTranscriptAppendInputV1(
  value: ProcessTranscriptAppendInputV1,
): ProcessTranscriptAppendInputV1 {
  const row = exactRecordV1(value, [
    "processId",
    "expectedProcessRevision",
    "expectedTranscriptFrontier",
    "commitId",
    "attemptBinding",
    "entries",
    "checkpoint",
    "terminalAttemptReceipt",
    "updatedAt",
  ]);
  if (
    row === null || !identifierV1(row.processId) ||
    !positiveIntegerV1(row.expectedProcessRevision) ||
    !nonNegativeIntegerV1(row.expectedTranscriptFrontier) || !identifierV1(row.commitId) ||
    !Array.isArray(row.entries) || row.entries.length === 0 || !nonNegativeIntegerV1(row.updatedAt)
  ) throw new TypeError("invalid Process transcript append input");
  const attemptBinding = row.attemptBinding === null
    ? null
    : requireAdmittedV1(admitAttemptBindingV1(row.attemptBinding), "attempt_binding");
  const entries: TranscriptEntryV1[] = [];
  const entryIds = new Set<string>();
  for (let index = 0; index < row.entries.length; index += 1) {
    const entry = requireAdmittedV1(admitTranscriptEntryV1(row.entries[index]), "transcript_entry");
    if (
      entry.processId !== row.processId ||
      (index > 0 && entry.sequence !== entries[index - 1]!.sequence + 1) ||
      entryIds.has(entry.entryId)
    ) throw new TypeError("invalid Process transcript sequence");
    entryIds.add(entry.entryId);
    entries.push(entry);
  }
  const receipt = row.terminalAttemptReceipt === null ? null : requireAdmittedV1(
    admitProcessTerminalAttemptReceiptV1(row.terminalAttemptReceipt),
    "terminal_receipt",
  );
  const checkpoint = row.checkpoint === null
    ? null
    : requireAdmittedV1(admitCheckpointV1(row.checkpoint), "checkpoint");
  const lastEntry = entries[entries.length - 1]!;
  if (
    receipt !== null &&
    (receipt.processId !== row.processId || receipt.terminalSequence !== lastEntry.sequence ||
      receipt.terminalEntryId !== lastEntry.entryId)
  ) throw new TypeError("invalid terminal receipt entry");
  if (
    receipt !== null &&
    (attemptBinding === null || receipt.attemptId !== attemptBinding.attemptId ||
      receipt.generation !== attemptBinding.generation)
  ) throw new TypeError("invalid terminal receipt attempt");
  if (
    jsonBytesV1({ entries, checkpoint, receipt }) >
      operationalStructuredPayloadMaximumBytesV1
  ) {
    throw new TypeError("Process transcript append exceeds operational budget");
  }
  return {
    processId: row.processId,
    expectedProcessRevision: row.expectedProcessRevision,
    expectedTranscriptFrontier: row.expectedTranscriptFrontier,
    commitId: row.commitId,
    attemptBinding,
    entries,
    checkpoint,
    terminalAttemptReceipt: receipt,
    updatedAt: row.updatedAt,
  };
}

export function normalizeTranscriptPageRequestV1(value: {
  readonly processId: string;
  readonly beforeSequence: number | null;
  readonly maximumBytes: number;
}): typeof value {
  const row = exactRecordV1(value, ["processId", "beforeSequence", "maximumBytes"]);
  if (
    row === null || !identifierV1(row.processId) ||
    (row.beforeSequence !== null && !positiveIntegerV1(row.beforeSequence)) ||
    !positiveIntegerV1(row.maximumBytes) ||
    row.maximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("invalid transcript page request");
  return {
    processId: row.processId,
    beforeSequence: row.beforeSequence,
    maximumBytes: row.maximumBytes,
  };
}

export function normalizeProcessSummaryListInputV1(
  value: ProcessSummaryListInputV1,
): ProcessSummaryListInputV1 {
  const row = exactRecordV1(value, ["subjectProgramId", "before", "maximumBytes"]);
  if (
    row === null ||
    (row.subjectProgramId !== null && !identifierV1(row.subjectProgramId)) ||
    !positiveIntegerV1(row.maximumBytes) ||
    row.maximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("invalid Process summary list input");
  let before: ProcessSummaryCursorV1 | null = null;
  if (row.before !== null) {
    const cursor = exactRecordV1(row.before, ["updatedAt", "processId"]);
    if (
      cursor === null || !nonNegativeIntegerV1(cursor.updatedAt) ||
      !identifierV1(cursor.processId)
    ) throw new TypeError("invalid Process summary list cursor");
    before = { updatedAt: cursor.updatedAt, processId: cursor.processId };
  }
  return {
    subjectProgramId: row.subjectProgramId,
    before,
    maximumBytes: row.maximumBytes,
  };
}

export function normalizeProgramIdV1(value: string): string {
  if (!identifierV1(value)) throw new TypeError("invalid Program id");
  return value;
}

export function normalizeProcessIdV1(value: string): string {
  if (!identifierV1(value)) throw new TypeError("invalid Process id");
  return value;
}

export function normalizeRevisionV1(value: number): number {
  if (!positiveIntegerV1(value)) throw new TypeError("invalid revision");
  return value;
}

export function cloneProgramDefinitionRevisionV1(
  value: ProgramDefinitionRevisionV1,
): ProgramDefinitionRevisionV1 {
  return requireAdmittedV1(admitProgramDefinitionRevisionV1(value), "program_definition");
}

export function cloneProcessHeadV1(value: ProcessHeadV1): ProcessHeadV1 {
  return requireAdmittedV1(admitProcessHeadV1(value), "process_head");
}

export function cloneProcessSummaryV1(value: ProcessSummaryV1): ProcessSummaryV1 {
  return requireAdmittedV1(admitProcessSummaryV1(value), "process_summary");
}

export function cloneTranscriptEntryV1(value: TranscriptEntryV1): TranscriptEntryV1 {
  return requireAdmittedV1(admitTranscriptEntryV1(value), "transcript_entry");
}

export function cloneTerminalReceiptV1(
  value: ProcessTerminalAttemptReceiptV1,
): ProcessTerminalAttemptReceiptV1 {
  return requireAdmittedV1(admitProcessTerminalAttemptReceiptV1(value), "terminal_receipt");
}

export function transcriptEntryUtf8ByteLengthV1(value: TranscriptEntryV1): number {
  return jsonBytesV1(cloneTranscriptEntryV1(value));
}

export function processSummaryUtf8ByteLengthV1(value: ProcessSummaryV1): number {
  return jsonBytesV1(cloneProcessSummaryV1(value));
}

export function exactJsonValuesEqualV1(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createProgramProcessRepositoryFailureV1(
  code: ProgramProcessRepositoryFailureCodeV1,
  operation: ProgramProcessRepositoryOperationV1,
): ProgramProcessRepositoryFailureV1 {
  const failure = new Error(
    `sillyos.program_process_repository.${code}`,
  ) as ProgramProcessRepositoryFailureV1;
  failure.name = "ProgramProcessRepositoryFailureV1";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return failure;
}
