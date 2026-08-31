// SPDX-License-Identifier: MIT

import type {
  BrowserProcessWorkspaceAuthorityV1,
  BrowserProcessWorkspaceCreateInputV1,
  BrowserProcessWorkspaceInspectionV1,
  BrowserProcessWorkspaceImportFileResultV1,
} from "../browser-program-workspace-authority.ts";
import {
  isProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
} from "../program-data-repository.ts";
import {
  defaultProcessExecutionLeaseDurationMillisecondsV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
} from "../process-execution-repository.ts";
import type { ProgramCatalogRecordV1 } from "../program-catalog-repository.ts";
import {
  operationalStructuredPayloadMaximumBytesV1,
  type ProcessCheckpointV1,
  type ProcessHeadV1,
  type ProgramDefinitionRevisionV1,
  type TranscriptEntryV1,
} from "../program-process-repository.ts";
import {
  prepareTranslationDocumentV1,
  type PreparedTranslationDocumentV1,
} from "./translation-document-codec.ts";
import type {
  TranslationProjectRowWindowV1,
  TranslationProjectUnitV1 as TranslationProjectPresentationUnitV1,
} from "./translation-project.ts";
import {
  builtinTranslationProgramIdV1,
  createBuiltinTranslationProgramDefinitionRevisionV1,
} from "./translation-program-definition.ts";
import {
  translationProjectRowUtf8ByteLengthV1,
  type TranslationProjectAppendImportInputV1,
  type TranslationProjectBeginImportInputV1,
  type TranslationProjectHeadV1,
  type TranslationProjectMutationResultV1,
  type TranslationProjectOperationExpectationV1,
  type TranslationProjectSourceBindingV1,
} from "./translation-project-repository.ts";
import type {
  BornDigitalPdfImportInputV1,
  BornDigitalPdfImportResultV1,
} from "./pdf/pdf-import-contract.ts";

export type TranslationProcessDurabilityStateV1 =
  | { readonly phase: "ready" }
  | { readonly phase: "saving"; readonly operation: "create" }
  | {
    readonly phase: "failed";
    readonly operation: "initialize" | "open" | "create";
    readonly code: string;
    readonly recovery: "retry" | null;
  }
  | { readonly phase: "disposed" };

export interface TranslationProcessTranscriptProjectionV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
}

export interface TranslationActiveProcessProjectionV1 {
  readonly process: ProcessHeadV1;
  readonly definition: ProgramDefinitionRevisionV1;
  /** The Process remains reopenable after its catalog Program is removed. */
  readonly subject: ProgramCatalogRecordV1 | null;
  readonly workspace: BrowserProcessWorkspaceInspectionV1["workspace"];
  readonly transcript: TranslationProcessTranscriptProjectionV1;
  readonly project: TranslationProjectHeadV1 | null;
}

export type TranslationSourceImportStateV1 =
  | { readonly phase: "idle" }
  | {
    readonly phase: "pending";
    readonly stage: "project" | "source" | "finalize";
  }
  | { readonly phase: "failed"; readonly code: string };

export interface TranslationProcessControllerSnapshotV1 {
  readonly revision: number;
  readonly route: "home" | "process_loading" | "process";
  readonly activeProcess: TranslationActiveProcessProjectionV1 | null;
  readonly sourceImport: TranslationSourceImportStateV1;
  readonly durability: TranslationProcessDurabilityStateV1;
}

export type TranslationProcessControllerResultV1<T> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "busy" }
  | { readonly kind: "failed"; readonly code: string };

export type TranslationProcessControllerWorkspacePortV1 = Pick<
  BrowserProcessWorkspaceAuthorityV1,
  "createProcessWorkspace" | "inspectProcessWorkspace" | "importProcessWorkspaceFile"
>;

export type TranslationProcessImportSourceV1 =
  | { readonly kind: "file"; readonly file: File }
  | {
    readonly kind: "bytes";
    readonly fileName: string;
    readonly mediaType?: string;
    readonly bytes: Uint8Array;
  };

export interface TranslationProcessImportInputV1 {
  readonly source: TranslationProcessImportSourceV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly title?: string;
  readonly documentPurpose?: string;
  readonly style?: string;
}

export type TranslationBornDigitalPdfImporterV1 = (
  input: BornDigitalPdfImportInputV1,
) => Promise<BornDigitalPdfImportResultV1>;

export interface TranslationProcessControllerV1 {
  getSnapshot(): TranslationProcessControllerSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  startOrOpen(programId: string): Promise<TranslationProcessControllerResultV1<boolean>>;
  openProcess(processId: string): Promise<TranslationProcessControllerResultV1<boolean>>;
  importSource(
    input: TranslationProcessImportInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationProjectHeadV1>>;
  loadProjectRowWindow(input: {
    readonly processId: string;
    readonly expectedProjectRevision: number;
    readonly offset: number;
    readonly limit: number;
    readonly signal?: AbortSignal;
  }): Promise<TranslationProjectRowWindowV1>;
  openHome(): boolean;
  retry(): Promise<boolean>;
  dispose(): void;
}

export interface TranslationProcessControllerBudgetsV1 {
  readonly processSummaryPageMaximumBytes: number;
  readonly transcriptPageMaximumBytes: number;
  /** Per-repository mutation work budget; it never limits total Project rows. */
  readonly importAppendMaximumBytes: number;
}

type TranslationImportExecutionAcquireV1 =
  | { readonly kind: "acquired"; readonly lease: ProcessExecutionLeaseV1 }
  | {
    readonly kind: "conflict";
    readonly currentProject: TranslationProjectHeadV1 | null;
  };

const translationProcessDefaultPageMaximumBytesV1 = 128 * 1_024;
const defaultBudgetsV1: TranslationProcessControllerBudgetsV1 = {
  processSummaryPageMaximumBytes: translationProcessDefaultPageMaximumBytesV1,
  transcriptPageMaximumBytes: translationProcessDefaultPageMaximumBytesV1,
  importAppendMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
};

type RetryCommandV1 = () => Promise<boolean>;

interface TranslationImportMaterialV1 {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly document: TranslationProjectHeadV1["document"];
  readonly sourceUnits: PreparedTranslationDocumentV1["sourceUnits"];
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly title: string;
  readonly documentPurpose: string;
  readonly style: string;
}

async function importBornDigitalPdfLazilyV1(
  input: BornDigitalPdfImportInputV1,
): Promise<BornDigitalPdfImportResultV1> {
  const module = await import("./pdf/browser-pdf-import.ts");
  return await module.importBornDigitalPdfV1(input);
}

function controllerErrorV1(code: string): Error {
  const error = new Error(`sillyos.translation_process_controller.${code}`);
  Object.defineProperty(error, "code", { value: code, enumerable: true });
  return error;
}

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0) return code;
  }
  return "repository_failed";
}

function throwIfAbortedV1(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException("Aborted", "AbortError");
}

function trimmedRequiredV1(value: string, code: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw controllerErrorV1(code);
  return trimmed;
}

async function sha256V1(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || crypto.subtle === undefined) {
    throw controllerErrorV1("digest_unavailable");
  }
  const digestSource = new Uint8Array(bytes.byteLength);
  digestSource.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", digestSource));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function prepareImportMaterialV1(
  input: TranslationProcessImportInputV1,
  importBornDigitalPdf: TranslationBornDigitalPdfImporterV1,
): Promise<TranslationImportMaterialV1> {
  let fileName: string;
  let mediaType: string;
  let bytes: Uint8Array;
  if (input.source.kind === "file") {
    fileName = trimmedRequiredV1(input.source.file.name, "invalid_file_name");
    mediaType = input.source.file.type.trim() || "application/octet-stream";
    bytes = new Uint8Array(await input.source.file.arrayBuffer());
  } else {
    fileName = trimmedRequiredV1(input.source.fileName, "invalid_file_name");
    mediaType = input.source.mediaType?.trim() || "application/octet-stream";
    if (!(input.source.bytes instanceof Uint8Array)) {
      throw controllerErrorV1("invalid_source_bytes");
    }
    bytes = new Uint8Array(input.source.bytes);
  }
  const pdf = mediaType.toLowerCase() === "application/pdf" || /\.pdf$/iu.test(fileName);
  let document: TranslationProjectHeadV1["document"];
  let sourceUnits: PreparedTranslationDocumentV1["sourceUnits"];
  if (pdf) {
    const imported = await importBornDigitalPdf({ bytes });
    if (imported.kind === "rejected") {
      throw controllerErrorV1(`pdf_${imported.reason}`);
    }
    if (imported.document.pageDiagnostics.length > 0) {
      // This first product slice has no durable partial-document state or
      // review surface. Publishing the remaining pages as a complete Project
      // would silently lose source text, so partial extraction is rejected.
      throw controllerErrorV1("pdf_partial_text_extraction");
    }
    document = {
      format: "pdf_text_reflow",
      capabilityGrade: "generic_text_only",
      capabilityReason: "born_digital_pdf_text",
    };
    sourceUnits = imported.document.sourceUnits;
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw controllerErrorV1("invalid_source_utf8");
    }
    const prepared = prepareTranslationDocumentV1({ text, fileName, mediaType });
    if (prepared.capability.grade !== "round_trip_supported") {
      throw controllerErrorV1(`unsupported_document_${prepared.capability.reason}`);
    }
    document = {
      format: prepared.format,
      capabilityGrade: prepared.capability.grade,
      capabilityReason: prepared.capability.reason,
    };
    sourceUnits = prepared.sourceUnits;
  }
  return {
    bytes,
    fileName,
    mediaType,
    sha256: await sha256V1(bytes),
    document,
    sourceUnits,
    sourceLocale: trimmedRequiredV1(input.sourceLocale, "invalid_source_locale"),
    targetLocale: trimmedRequiredV1(input.targetLocale, "invalid_target_locale"),
    title: input.title === undefined
      ? fileName
      : trimmedRequiredV1(input.title, "invalid_project_title"),
    documentPurpose: input.documentPurpose === undefined
      ? "translation"
      : trimmedRequiredV1(input.documentPurpose, "invalid_document_purpose"),
    style: input.style === undefined
      ? "faithful"
      : trimmedRequiredV1(input.style, "invalid_translation_style"),
  };
}

function sourceExtensionV1(format: TranslationProjectHeadV1["document"]["format"]): string {
  if (format === "plain_text") return "txt";
  if (format === "markdown") return "md";
  if (format === "subrip") return "srt";
  if (format === "sillyos_translation_json") return "json";
  if (format === "pdf_text_reflow") return "pdf";
  throw controllerErrorV1("unsupported_document_format");
}

function canonicalSourcePathV1(
  projectId: string,
  format: TranslationProjectHeadV1["document"]["format"],
): string {
  return `translation-projects/${projectId}/source.${sourceExtensionV1(format)}`;
}

function headMatchesImportV1(
  head: TranslationProjectHeadV1,
  begin: Omit<TranslationProjectBeginImportInputV1, "sourceBinding" | "lease">,
): boolean {
  return head.processId === begin.processId && head.projectId === begin.projectId &&
    head.title === begin.title && head.document.format === begin.document.format &&
    head.document.capabilityGrade === begin.document.capabilityGrade &&
    head.document.capabilityReason === begin.document.capabilityReason &&
    head.source.fileName === begin.source.fileName &&
    head.source.mediaType === begin.source.mediaType &&
    head.source.workspacePath === begin.source.workspacePath &&
    head.source.byteLength === begin.source.byteLength &&
    head.source.sha256 === begin.source.sha256 && head.sourceLocale === begin.sourceLocale &&
    head.targetLocale === begin.targetLocale && head.documentPurpose === begin.documentPurpose &&
    head.style === begin.style && head.expectedUnitCount === begin.expectedUnitCount &&
    head.expectedGlossaryCount === begin.expectedGlossaryCount;
}

function sourceBindingFromImportV1(
  imported: BrowserProcessWorkspaceImportFileResultV1,
): TranslationProjectSourceBindingV1 {
  return {
    revision: imported.source.revision,
    workspaceId: imported.source.workspaceId,
    volumeId: imported.source.volumeId,
    workspaceFormat: imported.source.workspaceFormat,
    path: imported.source.path,
    checkpointId: imported.source.checkpointId,
    generation: imported.source.generation,
  };
}

function sameSourceBindingV1(
  left: TranslationProjectSourceBindingV1,
  right: TranslationProjectSourceBindingV1,
): boolean {
  return left.revision === right.revision && left.workspaceId === right.workspaceId &&
    left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat &&
    left.path === right.path && left.checkpointId === right.checkpointId &&
    left.generation === right.generation;
}

function completedImportProcessMatchesV1(
  process: ProcessHeadV1,
  lease: ProcessExecutionLeaseV1,
  sourceBinding: TranslationProjectSourceBindingV1,
): boolean {
  const terminal = process.lastTerminalAttempt;
  const checkpoint = process.checkpoint;
  return process.processId === lease.processId && process.activeAttempt === null &&
    terminal?.attemptId === lease.attemptId && terminal.generation === lease.generation &&
    terminal.outcome === "completed" && terminal.interruptionDisposition === null &&
    checkpoint !== null && checkpoint.throughSequence === process.transcriptFrontier &&
    checkpoint.workspaceId === sourceBinding.workspaceId &&
    checkpoint.workspaceCheckpointId === sourceBinding.checkpointId &&
    checkpoint.workspaceGeneration === sourceBinding.generation;
}

function completedImportProjectMatchesProcessV1(
  process: ProcessHeadV1,
  project: TranslationProjectHeadV1,
): boolean {
  const terminal = process.lastTerminalAttempt;
  const checkpoint = process.checkpoint;
  return project.phase === "ready" && project.processId === process.processId &&
    process.activeAttempt === null && terminal?.outcome === "completed" &&
    terminal.interruptionDisposition === null && checkpoint !== null &&
    checkpoint.throughSequence === process.transcriptFrontier &&
    checkpoint.workspaceId === project.sourceBinding.workspaceId &&
    checkpoint.workspaceCheckpointId === project.sourceBinding.checkpointId &&
    checkpoint.workspaceGeneration === project.sourceBinding.generation;
}

async function mutateProjectV1(
  repository: ProgramDataRepositoryV1,
  expectation: TranslationProjectOperationExpectationV1,
  operation: () => Promise<TranslationProjectMutationResultV1>,
): Promise<TranslationProjectMutationResultV1> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryTranslationProjectOperation(expectation);
      if (queried.kind === "mismatch") {
        throw controllerErrorV1("operation_receipt_mismatch");
      }
      if (queried.kind === "committed") {
        const head = await repository.loadTranslationProjectHead(expectation.input.processId);
        if (head === null || head.revision !== queried.receipt.projectRevision) {
          throw controllerErrorV1("operation_reconciliation_conflict");
        }
        return {
          kind: "unchanged",
          head,
          operationReceipt: queried.receipt,
        };
      }
      // The exact operation has no receipt, so retry it once with the same
      // operation ID, timestamp, and payload. A second unknown outcome remains
      // unknown rather than creating a competing operation.
      if (attempt === 1) throw error;
    }
  }
  throw controllerErrorV1("operation_reconciliation_conflict");
}

function appendInputV1(input: {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedProjectRevision: number;
  readonly units: TranslationProjectAppendImportInputV1["units"];
  readonly updatedAt: number;
}): TranslationProjectAppendImportInputV1 {
  return {
    processId: input.processId,
    operationId: input.operationId,
    lease: input.lease,
    expectedProjectRevision: input.expectedProjectRevision,
    units: input.units,
    glossaryEntries: [],
    updatedAt: input.updatedAt,
  };
}

function nextAppendPageV1(input: {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedProjectRevision: number;
  readonly units: TranslationProjectAppendImportInputV1["units"];
  readonly from: number;
  readonly updatedAt: number;
  readonly maximumBytes: number;
}): { readonly input: TranslationProjectAppendImportInputV1; readonly next: number } {
  const empty = appendInputV1({ ...input, units: [] });
  let byteLength = translationProjectRowUtf8ByteLengthV1(empty);
  const selected: TranslationProjectAppendImportInputV1["units"][number][] = [];
  let cursor = input.from;
  while (cursor < input.units.length) {
    const row = input.units[cursor]!;
    const addition = translationProjectRowUtf8ByteLengthV1(row) +
      (selected.length === 0 ? 0 : 1);
    if (byteLength + addition > input.maximumBytes) {
      if (selected.length === 0) {
        throw controllerErrorV1("translation_unit_exceeds_operation_budget");
      }
      break;
    }
    selected.push(row);
    byteLength += addition;
    cursor += 1;
  }
  if (selected.length === 0) {
    throw controllerErrorV1("translation_append_envelope_exceeds_operation_budget");
  }
  return {
    input: appendInputV1({ ...input, units: selected }),
    next: cursor,
  };
}

interface PlannedTranslationAppendV1 {
  readonly input: TranslationProjectAppendImportInputV1;
  readonly next: number;
}

const maximumIdentifierForImportEnvelopeV1 = "x".repeat(128);

/** Conservative envelope only; the value is never admitted or persisted. */
function importEnvelopeSizingLeaseV1(processId: string): ProcessExecutionLeaseV1 {
  return {
    processId,
    ownerInstanceId: maximumIdentifierForImportEnvelopeV1,
    attemptId: maximumIdentifierForImportEnvelopeV1,
    generation: Number.MAX_SAFE_INTEGER,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}

function planAppendPagesV1(input: {
  readonly processId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly initialProjectRevision: number;
  readonly units: TranslationProjectAppendImportInputV1["units"];
  readonly from: number;
  readonly updatedAt: () => number;
  readonly createOperationId: () => string;
  readonly maximumBytes: number;
}): readonly PlannedTranslationAppendV1[] {
  const pages: PlannedTranslationAppendV1[] = [];
  let cursor = input.from;
  let expectedProjectRevision = input.initialProjectRevision;
  while (cursor < input.units.length) {
    const page = nextAppendPageV1({
      processId: input.processId,
      operationId: input.createOperationId(),
      lease: input.lease,
      expectedProjectRevision,
      units: input.units,
      from: cursor,
      updatedAt: input.updatedAt(),
      maximumBytes: input.maximumBytes,
    });
    pages.push(page);
    cursor = page.next;
    expectedProjectRevision += 1;
  }
  return pages;
}

function validateBudgetsV1(
  budgets: TranslationProcessControllerBudgetsV1 | undefined,
): TranslationProcessControllerBudgetsV1 {
  const selected = budgets ?? defaultBudgetsV1;
  if (
    !Number.isSafeInteger(selected.processSummaryPageMaximumBytes) ||
    selected.processSummaryPageMaximumBytes <= 0 ||
    selected.processSummaryPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !Number.isSafeInteger(selected.transcriptPageMaximumBytes) ||
    selected.transcriptPageMaximumBytes <= 0 ||
    selected.transcriptPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !Number.isSafeInteger(selected.importAppendMaximumBytes) ||
    selected.importAppendMaximumBytes <= 0 ||
    selected.importAppendMaximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("sillyos.translation_process_controller.invalid_budgets");
  return { ...selected };
}

function acceptedTranslationProgramV1(record: ProgramCatalogRecordV1 | null): boolean {
  if (record === null || record.currentProgram.kind !== "translation") return false;
  const accepted = record.head.latestAccepted;
  return record.head.proposal.status === "accepted" && accepted !== null &&
    accepted.proposalId === record.head.proposal.proposalId &&
    accepted.programRevision === record.currentProgram.revision;
}

function translationProcessV1(process: ProcessHeadV1): boolean {
  return process.programDefinition.programId === builtinTranslationProgramIdV1 &&
    process.programDefinition.revision === 1;
}

function processWorkspaceMatchesV1(
  inspection: BrowserProcessWorkspaceInspectionV1,
  expectedSubjectProgramId?: string,
): boolean {
  const process = inspection.process;
  const checkpoint = process.checkpoint;
  return translationProcessV1(process) && process.subjectProgramId !== null &&
    (expectedSubjectProgramId === undefined ||
      process.subjectProgramId === expectedSubjectProgramId) &&
    inspection.workspace.processId === process.processId && checkpoint !== null &&
    checkpoint.workspaceId === inspection.workspace.workspaceId;
}

function createdProcessMatchesInputV1(
  inspection: BrowserProcessWorkspaceInspectionV1,
  input: BrowserProcessWorkspaceCreateInputV1,
): boolean {
  const checkpoint = inspection.process.checkpoint;
  return processWorkspaceMatchesV1(inspection, input.process.subjectProgramId ?? undefined) &&
    inspection.process.processId === input.process.processId &&
    inspection.process.createdAt === input.process.createdAt &&
    inspection.workspace.workspaceId === input.workspaceId && checkpoint !== null &&
    checkpoint.checkpointId === input.transcript.checkpoint.checkpointId &&
    checkpoint.throughSequence === input.transcript.checkpoint.throughSequence;
}

function initialTranscriptEntryV1(processId: string, entryId: string): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId,
    sequence: 1,
    entryId,
    role: "system",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${entryId}.text`,
      markdown: "Translation workspace is ready. Add a source document to begin.",
    }],
  };
}

export function createTranslationProcessControllerV1(input: {
  readonly repository: ProgramDataRepositoryV1;
  readonly workspace: TranslationProcessControllerWorkspacePortV1;
  /** Test seam; the production default preserves the browser PDF adapter's lazy chunk. */
  readonly importBornDigitalPdf?: TranslationBornDigitalPdfImporterV1;
  readonly createId?: (purpose: string) => string;
  readonly now?: () => number;
  readonly ownerInstanceId?: string;
  readonly processExecutionLeaseDurationMilliseconds?: number;
  readonly budgets?: TranslationProcessControllerBudgetsV1;
}): TranslationProcessControllerV1 {
  const repository = input.repository;
  const importBornDigitalPdf = input.importBornDigitalPdf ?? importBornDigitalPdfLazilyV1;
  const now = input.now ?? Date.now;
  let fallbackId = 0;
  const createId = input.createId ?? ((purpose: string): string => {
    fallbackId += 1;
    const random = typeof crypto === "undefined" || typeof crypto.randomUUID !== "function"
      ? String(fallbackId)
      : crypto.randomUUID();
    return `local.${purpose}.${random}`;
  });
  const ownerInstanceId = input.ownerInstanceId ?? createId("translation-owner");
  const processExecutionLeaseDurationMilliseconds =
    input.processExecutionLeaseDurationMilliseconds ??
      defaultProcessExecutionLeaseDurationMillisecondsV1;
  if (
    !Number.isSafeInteger(processExecutionLeaseDurationMilliseconds) ||
    processExecutionLeaseDurationMilliseconds <= 0
  ) throw new TypeError("invalid Process execution lease duration");
  const processExecutionLeaseRenewalIntervalMilliseconds = Math.max(
    1,
    Math.floor(processExecutionLeaseDurationMilliseconds / 3),
  );
  const budgets = validateBudgetsV1(input.budgets);
  const listeners = new Set<() => void>();
  let disposed = false;
  let routeEpoch = 0;
  let initializeEpoch = 0;
  let retryCommand: RetryCommandV1 | null = null;
  let snapshot: TranslationProcessControllerSnapshotV1 = {
    revision: 0,
    route: "home",
    activeProcess: null,
    sourceImport: { phase: "idle" },
    durability: { phase: "ready" },
  };

  const leaseMatchesV1 = (
    left: ProcessExecutionLeaseV1,
    right: ProcessExecutionLeaseV1,
  ): boolean =>
    left.processId === right.processId && left.ownerInstanceId === right.ownerInstanceId &&
    left.attemptId === right.attemptId && left.generation === right.generation;

  const acquireImportLeaseV1 = async (
    process: ProcessHeadV1,
    expectedProjectRevision: number | null,
  ): Promise<TranslationImportExecutionAcquireV1> => {
    const checkpoint = process.checkpoint;
    if (checkpoint === null || process.activeAttempt !== null) {
      return {
        kind: "conflict",
        currentProject: await repository.loadTranslationProjectHead(process.processId),
      };
    }
    const observedAt = Math.max(now(), process.updatedAt);
    const attemptId = createId("translation-import-attempt");
    const triggerSequence = process.transcriptFrontier + 1;
    const triggerEntryId = createId("translation-import-request");
    const startingCheckpoint: ProcessCheckpointV1 = {
      ...checkpoint,
      checkpointId: createId("translation-import-start"),
      throughSequence: triggerSequence,
    };
    const acquireInput: ProcessExecutionAcquireInputV1 = {
      ownerInstanceId,
      observedAt,
      expiresAt: observedAt + processExecutionLeaseDurationMilliseconds,
      attempt: {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        commitId: createId("translation-import-acquire"),
        attemptId,
        generation: (process.lastTerminalAttempt?.generation ?? 0) + 1,
        trigger: {
          kind: "new_entry",
          entry: {
            schemaVersion: 1,
            processId: process.processId,
            sequence: triggerSequence,
            entryId: triggerEntryId,
            role: "user",
            state: "committed",
            parts: [{
              kind: "text_markdown",
              partId: `${triggerEntryId}.text`,
              markdown: "Import the selected source document.",
            }],
          },
        },
        startingCheckpoint,
        updatedAt: observedAt,
      },
    };
    const expectation = {
      operation: "translation_project_execution_acquire" as const,
      input: { expectedProjectRevision, execution: acquireInput },
    };
    let acquiredLease: ProcessExecutionLeaseV1 | null = null;
    try {
      const result = await repository.acquireTranslationProjectImportExecution(
        expectation.input,
      );
      if (result.kind === "conflict") {
        return { kind: "conflict", currentProject: result.currentProject };
      }
      acquiredLease = result.lease;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation(expectation);
      if (queried.kind === "mismatch") throw controllerErrorV1("operation_receipt_mismatch");
      if (queried.kind === "absent") throw error;
      acquiredLease = queried.receipt.lease;
    }
    const current = await repository.loadProcessExecutionLease(process.processId);
    if (
      acquiredLease === null || current === null ||
      !leaseMatchesV1(current, acquiredLease) || current.expiresAt !== acquiredLease.expiresAt ||
      current.ownerInstanceId !== ownerInstanceId ||
      current.attemptId !== attemptId ||
      current.generation !== acquireInput.attempt.generation
    ) return { kind: "conflict", currentProject: null };
    return { kind: "acquired", lease: current };
  };

  const renewImportLeaseV1 = async (
    lease: ProcessExecutionLeaseV1,
  ): Promise<{ readonly lease: ProcessExecutionLeaseV1; readonly observedAt: number }> => {
    const observedAt = now();
    if (observedAt >= lease.expiresAt) throw controllerErrorV1("process_execution_stale");
    const expiresAt = Math.max(
      observedAt + processExecutionLeaseDurationMilliseconds,
      lease.expiresAt + 1,
    );
    try {
      const result = await repository.renewProcessExecutionLease({ lease, observedAt, expiresAt });
      if (result.kind === "conflict") throw controllerErrorV1("process_execution_stale");
      return { lease: result.lease, observedAt };
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const current = await repository.loadProcessExecutionLease(lease.processId);
      if (current === null || !leaseMatchesV1(current, lease) || current.expiresAt < expiresAt) {
        throw controllerErrorV1("process_execution_stale");
      }
      return { lease: current, observedAt };
    }
  };

  const currentImportLeaseAtCutV1 = async (
    lease: ProcessExecutionLeaseV1,
  ): Promise<{ readonly lease: ProcessExecutionLeaseV1; readonly observedAt: number }> => {
    const observedAt = now();
    if (observedAt >= lease.expiresAt) throw controllerErrorV1("process_execution_stale");
    if (
      lease.expiresAt - observedAt > processExecutionLeaseRenewalIntervalMilliseconds
    ) return { lease, observedAt };
    return await renewImportLeaseV1(lease);
  };

  const runWithImportLeaseHeartbeatV1 = async <T>(
    lease: ProcessExecutionLeaseV1,
    epoch: number,
    operation: (admittedLease: ProcessExecutionLeaseV1) => Promise<T>,
  ): Promise<
    | { readonly kind: "completed"; readonly value: T; readonly lease: ProcessExecutionLeaseV1 }
    | { readonly kind: "failed"; readonly error: unknown; readonly lease: ProcessExecutionLeaseV1 }
  > => {
    let currentLease = lease;
    let renewalFailed = false;
    let renewalFailure: unknown;
    let renewalTail = Promise.resolve();
    const timer = setInterval(() => {
      renewalTail = renewalTail.then(async () => {
        if (renewalFailed) return;
        if (disposed || epoch !== routeEpoch) {
          renewalFailed = true;
          renewalFailure = controllerErrorV1("superseded");
          clearInterval(timer);
          return;
        }
        try {
          currentLease = (await renewImportLeaseV1(currentLease)).lease;
        } catch (error) {
          renewalFailed = true;
          renewalFailure = error;
          clearInterval(timer);
        }
      });
    }, processExecutionLeaseRenewalIntervalMilliseconds);
    let value: T | undefined;
    let operationFailed = false;
    let operationFailure: unknown;
    try {
      value = await operation(currentLease);
    } catch (error) {
      operationFailed = true;
      operationFailure = error;
    }
    clearInterval(timer);
    await renewalTail;
    if (renewalFailed) {
      return { kind: "failed", error: renewalFailure, lease: currentLease };
    }
    if (operationFailed) {
      return { kind: "failed", error: operationFailure, lease: currentLease };
    }
    return { kind: "completed", value: value!, lease: currentLease };
  };

  const createImportTerminalInputV1 = async (terminal: {
    readonly lease: ProcessExecutionLeaseV1;
    readonly observedAt: number;
    readonly outcome: "completed" | "failed";
    readonly sourceBinding: TranslationProjectSourceBindingV1 | null;
  }): Promise<ProcessExecutionTerminalInputV1> => {
    const process = await repository.loadProcess(terminal.lease.processId);
    if (
      process === null || process.activeAttempt?.attemptId !== terminal.lease.attemptId ||
      process.activeAttempt.generation !== terminal.lease.generation
    ) throw controllerErrorV1("process_execution_stale");
    const sequence = process.transcriptFrontier + 1;
    const entryId = createId("translation-import-terminal-entry");
    return {
      lease: terminal.lease,
      observedAt: terminal.observedAt,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        commitId: createId("translation-import-terminal"),
        attemptBinding: {
          attemptId: terminal.lease.attemptId,
          generation: terminal.lease.generation,
        },
        entries: [{
          schemaVersion: 1,
          processId: process.processId,
          sequence,
          entryId,
          role: "system",
          state: "committed",
          parts: [{
            kind: "text_markdown",
            partId: `${entryId}.text`,
            markdown: terminal.outcome === "completed"
              ? "Source document imported."
              : "Source document import failed before completion.",
          }],
        }],
        checkpoint: terminal.outcome === "completed" && terminal.sourceBinding !== null
          ? {
            checkpointId: createId("translation-import-checkpoint"),
            throughSequence: sequence,
            workspaceId: terminal.sourceBinding.workspaceId,
            workspaceCheckpointId: terminal.sourceBinding.checkpointId,
            workspaceGeneration: terminal.sourceBinding.generation,
          }
          : null,
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: process.processId,
          attemptId: terminal.lease.attemptId,
          generation: terminal.lease.generation,
          outcome: terminal.outcome,
          terminalSequence: sequence,
          terminalEntryId: entryId,
          interruptionDisposition: null,
        },
        updatedAt: terminal.observedAt,
      },
    };
  };

  const commitImportTerminalV1 = async (terminal: {
    readonly lease: ProcessExecutionLeaseV1;
    readonly outcome: "completed" | "failed";
    readonly sourceBinding: TranslationProjectSourceBindingV1 | null;
  }): Promise<void> => {
    const current = await currentImportLeaseAtCutV1(terminal.lease);
    const terminalInput = await createImportTerminalInputV1({
      ...terminal,
      lease: current.lease,
      observedAt: current.observedAt,
    });
    try {
      const result = await repository.commitProcessExecutionTerminal(terminalInput);
      if (result.kind === "conflict") throw controllerErrorV1("process_execution_stale");
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation({
        operation: "execution_terminal",
        input: terminalInput,
      });
      if (queried.kind === "mismatch") throw controllerErrorV1("operation_receipt_mismatch");
      if (queried.kind === "absent") throw error;
    }
  };

  const settleExpiredImportAttemptV1 = async (
    process: ProcessHeadV1,
  ): Promise<ProcessHeadV1> => {
    const attempt = process.activeAttempt;
    if (attempt === null) return process;
    const lease = await repository.loadProcessExecutionLease(process.processId);
    if (
      lease === null || lease.attemptId !== attempt.attemptId ||
      lease.generation !== attempt.generation || now() < lease.expiresAt
    ) return process;
    const observedAt = Math.max(now(), lease.expiresAt, process.updatedAt);
    const sequence = process.transcriptFrontier + 1;
    const entryId = createId("translation-import-interrupted-entry");
    const terminalInput: ProcessExecutionTerminalInputV1 = {
      lease,
      observedAt,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        commitId: createId("translation-import-interrupted"),
        attemptBinding: { attemptId: lease.attemptId, generation: lease.generation },
        entries: [{
          schemaVersion: 1,
          processId: process.processId,
          sequence,
          entryId,
          role: "system",
          state: "committed",
          parts: [{
            kind: "text_markdown",
            partId: `${entryId}.text`,
            markdown:
              "The previous source import stopped after its execution lease expired. Review the durable Project before retrying.",
          }],
        }],
        checkpoint: null,
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: process.processId,
          attemptId: lease.attemptId,
          generation: lease.generation,
          outcome: "interrupted",
          terminalSequence: sequence,
          terminalEntryId: entryId,
          interruptionDisposition: "unrecoverable",
        },
        updatedAt: observedAt,
      },
    };
    try {
      const result = await repository.commitProcessExecutionTerminal(terminalInput);
      return result.kind === "conflict" ? result.currentProcess ?? process : result.process;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation({
        operation: "execution_terminal",
        input: terminalInput,
      });
      if (queried.kind !== "committed") throw error;
      return await repository.loadProcess(process.processId) ?? process;
    }
  };

  const publish = (
    next:
      & Omit<TranslationProcessControllerSnapshotV1, "revision" | "sourceImport">
      & { readonly sourceImport?: TranslationSourceImportStateV1 },
  ): void => {
    if (disposed) return;
    snapshot = {
      revision: snapshot.revision + 1,
      ...next,
      sourceImport: next.sourceImport ?? snapshot.sourceImport,
    };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Observers cannot change the durable operation outcome.
      }
    }
  };

  const publishCompletedImportProjectionV1 = async (projectionInput: {
    readonly epoch: number;
    readonly processId: string;
    readonly project: TranslationProjectHeadV1;
    readonly expectedLease?: ProcessExecutionLeaseV1;
  }): Promise<TranslationProcessControllerResultV1<TranslationProjectHeadV1>> => {
    const [process, transcript] = await Promise.all([
      repository.loadProcess(projectionInput.processId),
      repository.loadTranscriptPage({
        processId: projectionInput.processId,
        beforeSequence: null,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      }),
    ]);
    if (disposed || projectionInput.epoch !== routeEpoch) {
      return { kind: "failed", code: "superseded" };
    }
    const active = snapshot.activeProcess;
    if (
      snapshot.route !== "process" || active === null ||
      active.process.processId !== projectionInput.processId
    ) return { kind: "failed", code: "superseded" };
    const newestEntry = transcript?.entries.at(-1);
    if (
      process === null || transcript === null ||
      transcript.processId !== projectionInput.processId ||
      newestEntry?.sequence !== process.transcriptFrontier ||
      !completedImportProjectMatchesProcessV1(process, projectionInput.project) ||
      (projectionInput.expectedLease !== undefined &&
        !completedImportProcessMatchesV1(
          process,
          projectionInput.expectedLease,
          projectionInput.project.sourceBinding,
        ))
    ) throw controllerErrorV1("operation_reconciliation_conflict");
    publish({
      route: "process",
      activeProcess: {
        ...active,
        process,
        transcript: {
          entries: transcript.entries,
          byteLength: transcript.byteLength,
          nextBeforeSequence: transcript.nextBeforeSequence,
        },
        project: projectionInput.project,
      },
      sourceImport: { phase: "idle" },
      durability: { phase: "ready" },
    });
    return { kind: "completed", value: projectionInput.project };
  };

  const fail = (
    operation: "initialize" | "open" | "create",
    code: string,
    recovery: "retry" | null,
    retry: RetryCommandV1 | null,
  ): TranslationProcessControllerResultV1<boolean> => {
    retryCommand = retry;
    publish({
      route: operation === "initialize" ? snapshot.route : "home",
      activeProcess: operation === "initialize" ? snapshot.activeProcess : null,
      durability: { phase: "failed", operation, code, recovery },
    });
    return { kind: "failed", code };
  };

  const beginRouteLoadV1 = (): number => {
    const epoch = ++routeEpoch;
    retryCommand = null;
    publish({
      route: "process_loading",
      activeProcess: null,
      sourceImport: { phase: "idle" },
      durability: { phase: "ready" },
    });
    return epoch;
  };

  const openProcessAtEpochV1 = async (
    processId: string,
    epoch: number,
    expectedSubjectProgramId?: string,
  ): Promise<TranslationProcessControllerResultV1<boolean>> => {
    try {
      let inspection = await input.workspace.inspectProcessWorkspace(processId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (inspection === null) return fail("open", "process_workspace_not_found", null, null);
      if (!processWorkspaceMatchesV1(inspection, expectedSubjectProgramId)) {
        return fail("open", "process_workspace_mismatch", null, null);
      }
      const settledProcess = await settleExpiredImportAttemptV1(inspection.process);
      if (settledProcess.revision !== inspection.process.revision) {
        inspection = await input.workspace.inspectProcessWorkspace(processId);
        if (
          inspection === null || !processWorkspaceMatchesV1(inspection, expectedSubjectProgramId)
        ) {
          return fail("open", "process_workspace_mismatch", null, null);
        }
      }
      const subjectProgramId = inspection.process.subjectProgramId!;
      const [definition, subject, transcript, project] = await Promise.all([
        repository.loadProgramDefinitionRevision(builtinTranslationProgramIdV1, 1),
        repository.load(subjectProgramId),
        repository.loadTranscriptPage({
          processId,
          beforeSequence: null,
          maximumBytes: budgets.transcriptPageMaximumBytes,
        }),
        repository.loadTranslationProjectHead(processId),
      ]);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (definition === null || definition.kind !== "translation") {
        return fail("open", "program_definition_missing", null, null);
      }
      if (subject !== null && subject.head.programId !== subjectProgramId) {
        return fail("open", "subject_program_mismatch", null, null);
      }
      if (transcript === null || transcript.processId !== processId) {
        return fail("open", "process_transcript_not_found", null, null);
      }
      retryCommand = null;
      publish({
        route: "process",
        activeProcess: {
          process: inspection.process,
          definition,
          subject,
          workspace: inspection.workspace,
          transcript: {
            entries: transcript.entries,
            byteLength: transcript.byteLength,
            nextBeforeSequence: transcript.nextBeforeSequence,
          },
          project,
        },
        sourceImport: project?.phase === "staging"
          ? { phase: "failed", code: "translation_import_incomplete" }
          : { phase: "idle" },
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      return fail("open", code, "retry", async () => {
        const result = await openProcessAtEpochV1(
          processId,
          beginRouteLoadV1(),
          expectedSubjectProgramId,
        );
        return result.kind === "completed";
      });
    }
  };

  const createProcessV1 = async (
    subject: ProgramCatalogRecordV1,
    epoch: number,
  ): Promise<TranslationProcessControllerResultV1<boolean>> => {
    const processId = createId("translation-process");
    const workspaceId = createId("translation-workspace");
    const entryId = createId("translation-entry");
    const createdAt = now();
    const createInput: BrowserProcessWorkspaceCreateInputV1 = {
      workspaceId,
      process: {
        processId,
        programDefinition: { programId: builtinTranslationProgramIdV1, revision: 1 },
        subjectProgramId: subject.head.programId,
        createdAt,
      },
      transcript: {
        processId,
        expectedProcessRevision: 1,
        expectedTranscriptFrontier: 0,
        commitId: createId("translation-process-create"),
        attemptBinding: null,
        entries: [initialTranscriptEntryV1(processId, entryId)],
        checkpoint: {
          checkpointId: createId("translation-checkpoint"),
          throughSequence: 1,
        },
        terminalAttemptReceipt: null,
        updatedAt: createdAt,
      },
    };
    publish({
      route: "process_loading",
      activeProcess: null,
      durability: {
        phase: "saving",
        operation: "create",
      },
    });
    try {
      const result = await input.workspace.createProcessWorkspace(createInput);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (result.kind === "committed" || result.kind === "unchanged") {
        if (
          result.process.processId !== processId ||
          result.process.subjectProgramId !== subject.head.programId ||
          result.workspace.workspaceId !== workspaceId ||
          !translationProcessV1(result.process)
        ) return fail("create", "repository_response_mismatch", null, null);
        return await openProcessAtEpochV1(processId, epoch, subject.head.programId);
      }
      return fail("create", result.kind, null, null);
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      if (code === "outcome_unknown") {
        try {
          const inspection = await input.workspace.inspectProcessWorkspace(processId);
          if (
            inspection !== null && createdProcessMatchesInputV1(inspection, createInput)
          ) return await openProcessAtEpochV1(processId, epoch, subject.head.programId);
        } catch {
          // Keep the original unknown outcome. A caller must not create a
          // second Process until the exact durable identity can be inspected.
        }
        return fail("create", code, null, null);
      }
      return fail("create", code, "retry", async () => {
        const result = await createProcessV1(subject, beginRouteLoadV1());
        return result.kind === "completed";
      });
    }
  };

  const importSourceV1 = async (
    importInput: TranslationProcessImportInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationProjectHeadV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    if (snapshot.route !== "process" || active === null) {
      return { kind: "failed", code: "translation_process_unavailable" };
    }
    if (snapshot.sourceImport.phase === "pending") return { kind: "busy" };
    const epoch = routeEpoch;
    const publishImportV1 = (
      project: TranslationProjectHeadV1 | null,
      sourceImport: TranslationSourceImportStateV1,
    ): void => {
      if (disposed || epoch !== routeEpoch || snapshot.activeProcess === null) return;
      publish({
        route: "process",
        activeProcess: { ...snapshot.activeProcess, project },
        sourceImport,
        durability: { phase: "ready" },
      });
    };
    const failImportV1 = (
      code: string,
      project: TranslationProjectHeadV1 | null,
    ): TranslationProcessControllerResultV1<TranslationProjectHeadV1> => {
      publishImportV1(project, { phase: "failed", code });
      return { kind: "failed", code };
    };

    publishImportV1(active.project, { phase: "pending", stage: "project" });
    let latestHead = active.project;
    let lease: ProcessExecutionLeaseV1 | null = null;
    let sourceBinding: TranslationProjectSourceBindingV1 | null = null;
    let terminalSettled = false;
    try {
      const material = await prepareImportMaterialV1(importInput, importBornDigitalPdf);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const durableHead = await repository.loadTranslationProjectHead(active.process.processId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const projectId = durableHead?.projectId ?? createId("translation-project");
      const workspacePath = durableHead?.source.workspacePath ??
        canonicalSourcePathV1(projectId, material.document.format);
      const beginDraft: Omit<TranslationProjectBeginImportInputV1, "sourceBinding" | "lease"> = {
        processId: active.process.processId,
        operationId: createId("translation-import-begin"),
        projectId,
        title: material.title,
        document: material.document,
        source: {
          fileName: material.fileName,
          mediaType: material.mediaType,
          workspacePath,
          byteLength: material.bytes.byteLength,
          sha256: material.sha256,
        },
        sourceLocale: material.sourceLocale,
        targetLocale: material.targetLocale,
        documentPurpose: material.documentPurpose,
        style: material.style,
        expectedUnitCount: material.sourceUnits.length,
        expectedGlossaryCount: 0,
        updatedAt: now(),
      };

      if (durableHead !== null) {
        latestHead = durableHead;
        if (!headMatchesImportV1(durableHead, beginDraft)) {
          return failImportV1("translation_project_exists", durableHead);
        }
        if (durableHead.phase === "ready") {
          return await publishCompletedImportProjectionV1({
            epoch,
            processId: active.process.processId,
            project: durableHead,
          });
        }
        if (
          durableHead.stagedUnitCount > material.sourceUnits.length ||
          durableHead.stagedGlossaryCount !== 0
        ) return failImportV1("translation_project_conflict", durableHead);
      }

      // Plan and byte-check every repository append before touching the
      // execution lease, Workspace, or Project stores. The maximum-width
      // sizing lease makes every later admitted envelope no larger than the
      // plan, so a single oversized row cannot leave either authority started.
      const plannedAppends = planAppendPagesV1({
        processId: active.process.processId,
        lease: importEnvelopeSizingLeaseV1(active.process.processId),
        initialProjectRevision: durableHead?.revision ?? 1,
        units: material.sourceUnits,
        from: durableHead?.stagedUnitCount ?? 0,
        updatedAt: () => Number.MAX_SAFE_INTEGER,
        createOperationId: () => createId("translation-import-append"),
        maximumBytes: budgets.importAppendMaximumBytes,
      });

      const currentProcess = await repository.loadProcess(active.process.processId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (currentProcess === null) {
        return failImportV1("translation_process_unavailable", latestHead);
      }
      const expectedProjectRevision = durableHead?.revision ?? null;
      const acquired = await acquireImportLeaseV1(currentProcess, expectedProjectRevision);
      if (acquired.kind === "conflict") {
        const currentProject = acquired.currentProject;
        const projectExpectationStillCurrent = expectedProjectRevision === null
          ? currentProject === null
          : currentProject?.phase === "staging" &&
            currentProject.revision === expectedProjectRevision;
        if (projectExpectationStillCurrent) {
          return failImportV1("process_execution_busy", currentProject);
        }
        latestHead = currentProject;
        if (
          currentProject !== null && currentProject.phase === "ready" &&
          headMatchesImportV1(currentProject, beginDraft)
        ) {
          return await publishCompletedImportProjectionV1({
            epoch,
            processId: active.process.processId,
            project: currentProject,
          });
        }
        return failImportV1(
          currentProject !== null && !headMatchesImportV1(currentProject, beginDraft)
            ? "translation_project_exists"
            : "translation_project_conflict",
          currentProject,
        );
      }
      lease = acquired.lease;

      publishImportV1(latestHead, { phase: "pending", stage: "source" });
      let currentLease = await currentImportLeaseAtCutV1(lease);
      lease = currentLease.lease;
      const workspaceImportInput = {
        processId: active.process.processId,
        workspaceId: active.workspace.workspaceId,
        lease,
        observedAt: currentLease.observedAt,
        path: workspacePath,
        bytes: material.bytes,
      };
      let imported: BrowserProcessWorkspaceImportFileResultV1;
      try {
        const settled = await runWithImportLeaseHeartbeatV1(
          lease,
          epoch,
          async (admittedLease) =>
            await input.workspace.importProcessWorkspaceFile({
              ...workspaceImportInput,
              lease: admittedLease,
            }),
        );
        lease = settled.lease;
        if (settled.kind === "failed") throw settled.error;
        imported = settled.value;
      } catch (error) {
        if (failureCodeV1(error) !== "outcome_unknown") throw error;
        if (disposed || epoch !== routeEpoch) {
          return { kind: "failed", code: "superseded" };
        }
        // The Authority owns exact Workspace reconciliation. Repeating the
        // same path/bytes either observes its durable successor or remains
        // unknown; this controller never guesses a different source.
        currentLease = await currentImportLeaseAtCutV1(lease);
        lease = currentLease.lease;
        const settled = await runWithImportLeaseHeartbeatV1(
          lease,
          epoch,
          async (admittedLease) =>
            await input.workspace.importProcessWorkspaceFile({
              ...workspaceImportInput,
              lease: admittedLease,
              observedAt: currentLease.observedAt,
            }),
        );
        lease = settled.lease;
        if (settled.kind === "failed") throw settled.error;
        imported = settled.value;
      }
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (
        imported.source.processId !== active.process.processId ||
        imported.source.workspaceId !== active.workspace.workspaceId ||
        imported.source.volumeId !== active.workspace.volumeId ||
        imported.source.workspaceFormat !== active.workspace.workspaceFormat ||
        imported.source.path !== workspacePath
      ) return failImportV1("workspace_import_response_mismatch", latestHead);
      sourceBinding = sourceBindingFromImportV1(imported);
      if (
        durableHead !== null && !sameSourceBindingV1(durableHead.sourceBinding, sourceBinding)
      ) return failImportV1("translation_source_binding_mismatch", durableHead);

      if (durableHead === null) {
        currentLease = await currentImportLeaseAtCutV1(lease);
        lease = currentLease.lease;
        const beginInput: TranslationProjectBeginImportInputV1 = {
          ...beginDraft,
          lease,
          updatedAt: currentLease.observedAt,
          sourceBinding,
        };
        const expectation = { operation: "begin" as const, input: beginInput };
        const result = await mutateProjectV1(
          repository,
          expectation,
          () => repository.beginTranslationProjectImport(beginInput),
        );
        if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
        if (result.kind === "conflict") {
          return failImportV1("translation_project_conflict", result.current);
        }
        latestHead = result.head;
        publishImportV1(latestHead, { phase: "pending", stage: "project" });
      }

      if (
        latestHead === null || latestHead.phase !== "staging" ||
        latestHead.stagedUnitCount > material.sourceUnits.length ||
        latestHead.stagedGlossaryCount !== 0
      ) return failImportV1("translation_project_conflict", latestHead);

      for (const page of plannedAppends) {
        if (page.input.expectedProjectRevision !== latestHead.revision) {
          return failImportV1("translation_project_conflict", latestHead);
        }
        currentLease = await currentImportLeaseAtCutV1(lease);
        lease = currentLease.lease;
        const pageInput: TranslationProjectAppendImportInputV1 = {
          ...page.input,
          lease,
          updatedAt: currentLease.observedAt,
        };
        if (translationProjectRowUtf8ByteLengthV1(pageInput) > budgets.importAppendMaximumBytes) {
          return failImportV1("translation_append_envelope_exceeds_operation_budget", latestHead);
        }
        const expectation = { operation: "append" as const, input: pageInput };
        const result = await mutateProjectV1(
          repository,
          expectation,
          () => repository.appendTranslationProjectImport(pageInput),
        );
        if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
        if (result.kind === "conflict") {
          return failImportV1("translation_project_conflict", result.current);
        }
        latestHead = result.head;
        if (
          latestHead.phase !== "staging" || latestHead.stagedUnitCount !== page.next ||
          latestHead.stagedGlossaryCount !== 0
        ) return failImportV1("translation_project_conflict", latestHead);
        publishImportV1(latestHead, { phase: "pending", stage: "project" });
      }

      publishImportV1(latestHead, { phase: "pending", stage: "finalize" });
      currentLease = await currentImportLeaseAtCutV1(lease);
      lease = currentLease.lease;
      const finalizeInput = {
        processId: active.process.processId,
        operationId: createId("translation-import-finalize"),
        lease,
        expectedProjectRevision: latestHead.revision,
        sourceBinding,
        updatedAt: currentLease.observedAt,
      };
      const expectation = { operation: "finalize" as const, input: finalizeInput };
      const terminalInput = await createImportTerminalInputV1({
        lease,
        observedAt: currentLease.observedAt,
        outcome: "completed",
        sourceBinding,
      });
      let terminalProcess: ProcessHeadV1;
      try {
        const finalized = await repository
          .commitTranslationProjectFinalizeWithProcessExecutionTerminal({
            project: finalizeInput,
            terminal: terminalInput,
          });
        if (finalized.kind === "conflict") {
          return failImportV1("translation_project_conflict", finalized.currentProject);
        }
        terminalSettled = true;
        latestHead = finalized.head;
        terminalProcess = finalized.process;
      } catch (error) {
        if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
          throw error;
        }
        const queried = await repository.queryTranslationProjectOperation(expectation);
        if (queried.kind === "mismatch") {
          throw controllerErrorV1("operation_receipt_mismatch");
        }
        if (queried.kind === "absent") throw error;
        terminalSettled = true;
        const [reconciledHead, reconciledProcess] = await Promise.all([
          repository.loadTranslationProjectHead(active.process.processId),
          repository.loadProcess(active.process.processId),
        ]);
        if (
          reconciledHead === null || reconciledHead.phase !== "ready" ||
          reconciledHead.revision !== queried.receipt.projectRevision ||
          !sameSourceBindingV1(reconciledHead.sourceBinding, sourceBinding) ||
          reconciledProcess === null ||
          !completedImportProcessMatchesV1(reconciledProcess, lease, sourceBinding)
        ) throw controllerErrorV1("operation_reconciliation_conflict");
        latestHead = reconciledHead;
        terminalProcess = reconciledProcess;
      }
      if (
        disposed || epoch !== routeEpoch ||
        snapshot.activeProcess?.process.processId !== active.process.processId
      ) return { kind: "failed", code: "superseded" };
      if (
        latestHead.phase !== "ready" ||
        !sameSourceBindingV1(latestHead.sourceBinding, sourceBinding) ||
        !completedImportProcessMatchesV1(terminalProcess, lease, sourceBinding)
      ) {
        return failImportV1("repository_response_mismatch", latestHead);
      }
      return await publishCompletedImportProjectionV1({
        epoch,
        processId: active.process.processId,
        project: latestHead,
        expectedLease: lease,
      });
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      return failImportV1(failureCodeV1(error), latestHead);
    } finally {
      if (
        !terminalSettled && lease !== null
      ) {
        await commitImportTerminalV1({
          lease,
          outcome: "failed",
          sourceBinding: null,
        }).catch(() => undefined);
      }
    }
  };

  const loadProjectRowWindowV1 = async (rowInput: {
    readonly processId: string;
    readonly expectedProjectRevision: number;
    readonly offset: number;
    readonly limit: number;
    readonly signal?: AbortSignal;
  }): Promise<TranslationProjectRowWindowV1> => {
    throwIfAbortedV1(rowInput.signal);
    if (disposed) throw controllerErrorV1("disposed");
    if (!Number.isSafeInteger(rowInput.offset) || rowInput.offset < 0) {
      throw new RangeError("sillyos.translation_process_controller.invalid_row_offset");
    }
    if (!Number.isSafeInteger(rowInput.limit) || rowInput.limit <= 0) {
      throw new RangeError("sillyos.translation_process_controller.invalid_row_limit");
    }
    if (
      !Number.isSafeInteger(rowInput.expectedProjectRevision) ||
      rowInput.expectedProjectRevision < 1
    ) {
      throw new RangeError("sillyos.translation_process_controller.invalid_project_revision");
    }
    const epoch = routeEpoch;
    const active = snapshot.activeProcess;
    const project = active === null ? null : active.project;
    if (
      snapshot.route !== "process" || active === null || project === null ||
      project.phase !== "ready" || active.process.processId !== rowInput.processId ||
      project.processId !== rowInput.processId ||
      project.revision !== rowInput.expectedProjectRevision
    ) throw controllerErrorV1("translation_project_unavailable");

    const totalRowCount = project.expectedUnitCount;
    const requestedCount = rowInput.offset >= totalRowCount
      ? 0
      : Math.min(rowInput.limit, totalRowCount - rowInput.offset);
    if (requestedCount === 0) {
      return {
        offset: rowInput.offset,
        limit: rowInput.limit,
        totalRowCount,
        rows: [],
        nextOffset: null,
      };
    }

    const rows: TranslationProjectPresentationUnitV1[] = [];
    let cursor = rowInput.offset;
    while (rows.length < requestedCount) {
      throwIfAbortedV1(rowInput.signal);
      const result = await repository.loadTranslationProjectUnitPage({
        processId: rowInput.processId,
        expectedProjectRevision: rowInput.expectedProjectRevision,
        fromOrder: cursor,
        maximumRows: requestedCount - rows.length,
        maximumBytes: operationalStructuredPayloadMaximumBytesV1,
      });
      throwIfAbortedV1(rowInput.signal);
      if (disposed || epoch !== routeEpoch) throw controllerErrorV1("superseded");
      if (result.kind === "conflict") {
        throw controllerErrorV1("translation_project_revision_conflict");
      }
      const page = result.page;
      if (
        page.processId !== rowInput.processId ||
        page.projectRevision !== rowInput.expectedProjectRevision ||
        page.fromOrder !== cursor || page.rows.length === 0
      ) throw controllerErrorV1("translation_project_page_mismatch");
      for (const row of page.rows) {
        if (row.processId !== rowInput.processId || row.order !== cursor) {
          throw controllerErrorV1("translation_project_page_mismatch");
        }
        rows.push({
          unitId: row.unitId,
          order: row.order,
          locator: row.locator,
          context: row.context,
          durationMilliseconds: row.durationMilliseconds,
          source: row.source,
          protectedSegments: row.protectedSegments.map((segment) => ({ ...segment })),
          target: null,
          committedBatchId: null,
        });
        cursor += 1;
      }
      if (rows.length < requestedCount && page.nextOrder !== cursor) {
        throw controllerErrorV1("translation_project_page_mismatch");
      }
    }
    return {
      offset: rowInput.offset,
      limit: rowInput.limit,
      totalRowCount,
      rows,
      nextOffset: rowInput.offset + rows.length < totalRowCount
        ? rowInput.offset + rows.length
        : null,
    };
  };

  const startOrOpenV1 = async (
    programId: string,
  ): Promise<TranslationProcessControllerResultV1<boolean>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.durability.phase === "saving") return { kind: "busy" };
    const epoch = beginRouteLoadV1();
    try {
      const subject = await repository.load(programId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (!acceptedTranslationProgramV1(subject)) {
        return fail(
          "open",
          subject === null ? "subject_program_missing" : "program_not_accepted",
          null,
          null,
        );
      }
      let before = null;
      do {
        const page = await repository.listProcessSummaries({
          subjectProgramId: programId,
          before,
          maximumBytes: budgets.processSummaryPageMaximumBytes,
        });
        if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
        const existing = page.summaries.find((summary) =>
          summary.programDefinition.programId === builtinTranslationProgramIdV1 &&
          summary.programDefinition.revision === 1 &&
          summary.status !== "interrupted_unrecoverable"
        );
        if (existing !== undefined) {
          const process = await repository.loadProcess(existing.processId);
          if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
          if (process === null) return fail("open", "process_not_found", null, null);
          const settled = await settleExpiredImportAttemptV1(process);
          if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
          if (settled.status === "interrupted_unrecoverable") {
            return await createProcessV1(subject!, epoch);
          }
          return await openProcessAtEpochV1(existing.processId, epoch, programId);
        }
        before = page.nextCursor;
      } while (before !== null);
      return await createProcessV1(subject!, epoch);
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      return fail("open", code, "retry", async () => {
        const result = await startOrOpenV1(programId);
        return result.kind === "completed";
      });
    }
  };

  const initializeV1 = async (): Promise<void> => {
    if (disposed) return;
    const epoch = ++initializeEpoch;
    try {
      await repository.initialize();
      const published = await repository.publishProgramDefinitionRevision(
        createBuiltinTranslationProgramDefinitionRevisionV1(),
      );
      if (published.kind === "conflict") {
        throw new TypeError("sillyos.translation_process_controller.definition_conflict");
      }
      if (disposed || epoch !== initializeEpoch) return;
      retryCommand = null;
      publish({
        route: snapshot.route,
        activeProcess: snapshot.activeProcess,
        durability: {
          phase: "ready",
        },
      });
    } catch (error) {
      if (disposed || epoch !== initializeEpoch) return;
      fail("initialize", failureCodeV1(error), "retry", async () => {
        await initializeV1();
        return snapshot.durability.phase === "ready";
      });
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: initializeV1,
    startOrOpen: startOrOpenV1,
    importSource: importSourceV1,
    loadProjectRowWindow: loadProjectRowWindowV1,
    openProcess(processId) {
      if (disposed) return Promise.resolve({ kind: "failed", code: "disposed" });
      return openProcessAtEpochV1(processId, beginRouteLoadV1());
    },
    openHome() {
      if (disposed) return false;
      routeEpoch += 1;
      retryCommand = null;
      publish({
        route: "home",
        activeProcess: null,
        sourceImport: { phase: "idle" },
        durability: { phase: "ready" },
      });
      return true;
    },
    async retry() {
      if (disposed || retryCommand === null) return false;
      const command = retryCommand;
      retryCommand = null;
      return await command();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      routeEpoch += 1;
      initializeEpoch += 1;
      retryCommand = null;
      snapshot = {
        revision: snapshot.revision + 1,
        route: "home",
        activeProcess: null,
        sourceImport: { phase: "idle" },
        durability: { phase: "disposed" },
      };
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch {
          // Disposal is terminal regardless of observer behavior.
        }
      }
      listeners.clear();
    },
  };
}
