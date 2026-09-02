// SPDX-License-Identifier: MIT

import type {
  BrowserProgramWorkspaceAuthorityV1,
  BrowserProcessWorkspaceCreateInputV1,
  BrowserProcessWorkspaceInspectionV1,
  BrowserProcessWorkspaceImportFileResultV1,
} from "../../../src/application/workspace/browser-program-workspace-authority.ts";
import {
  isProgramDataRepositoryFailureV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import type { TranslationProgramDataRepositoryV1 } from "../persistence/translation-persistence-contract.ts";
import {
  defaultProcessExecutionLeaseDurationMillisecondsV1,
  type ProcessExecutionAcquireInputV1,
  type ProcessExecutionLeaseV1,
  type ProcessExecutionTerminalInputV1,
} from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  operationalStructuredPayloadMaximumBytesV1,
  type ProcessCheckpointV1,
  type ProcessHeadV1,
  type TranscriptEntryV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  createTranscriptWindowV1,
  prependTranscriptWindowPageV1,
  projectTranscriptWindowV1,
  type TranscriptWindowV1,
} from "../../../src/program-platform/process/transcript-window.ts";
import {
  type AdmittedProgramPackageArchiveV1,
  type InstalledProgramPackageReferenceV1,
  type ProgramPackageManifestV1,
  readProgramPackageTextFileV1,
} from "../../../src/program-platform/package/program-package-archive.ts";
import {
  prepareTranslationDocumentV1,
  type PreparedTranslationDocumentV1,
} from "./translation-document-codec.ts";
import {
  exportTranslationProcessV1,
  type TranslationProcessExportResultV1,
} from "./translation-process-export.ts";
import {
  translationAgentFollowUpReplyMaximumCharactersV1,
  translationAgentInstructionMaximumCharactersV1,
  type TranslationAgentRunRequestV1,
  type TranslationAgentTerminalRunV1,
  type TranslationFollowUpContextV1,
} from "./translation-agent-contracts.ts";
import {
  createTranslationCandidateRetranslationInstructionV1,
  createTranslationFollowUpUserPromptV1,
  translationAgentInstructionPromptOverheadBytesV1,
} from "./translation-agent-prompt.ts";
import {
  planTranslationBatchRequestV1,
  type TranslationBatchBudgetV1,
  translationBatchRequestUtf8ByteLengthV1,
  translationBatchRequestedOutputTokensV1,
} from "./translation-batch-planner.ts";
import {
  admitTranslationBatchCandidateV1,
  type TranslationBatchRequestV1,
} from "./translation-batch-protocol.ts";
import { evaluateTranslationMechanicalQaV1 } from "./translation-mechanical-qa.ts";
import type {
  TranslationProcessRowWindowV1,
  TranslationProcessUnitProjectionV1,
} from "./translation-process-view.ts";
import {
  translationWorksetRowUtf8ByteLengthV1,
  type TranslationBatchCandidateAcceptInputV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationWorksetAppendImportInputV1,
  type TranslationWorksetBeginImportInputV1,
  type TranslationWorksetGlossaryEntryV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetMutationResultV1,
  type TranslationWorksetOperationExpectationV1,
  type TranslationWorksetSourceBindingV1,
  type TranslationWorksetUnitV1,
  type TranslationWorksetUnitRecordV1,
} from "./translation-workset-repository.ts";
import type {
  BornDigitalPdfImportInputV1,
  BornDigitalPdfImportResultV1,
} from "./pdf/pdf-import-contract.ts";
import {
  resolveTranslationProgramPackageFacetsV1,
  type TranslationInitialUiV1,
} from "./translation-package-facets.ts";
import {
  resolveTranslationProgramSettingsV1,
  type TranslationProgramSettingsResolutionV1,
} from "./translation-program-settings.ts";
import { canonicalizeTranslationTargetLocaleV1 } from "./translation-target-language.ts";

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
  readonly newerOmitted: boolean;
  readonly phase: "loading_older" | "ready";
}

export interface TranslationActiveProcessProjectionV1 {
  readonly process: ProcessHeadV1;
  /** Exact immutable Program package selected when this Process was created. */
  readonly programPackage: {
    readonly reference: InstalledProgramPackageReferenceV1;
    readonly manifest: ProgramPackageManifestV1;
    /** Exact instructions decoded from this Process-pinned package. */
    readonly instructions: string | null;
    readonly initialUi: TranslationInitialUiV1 | null;
    readonly settings: TranslationProgramSettingsResolutionV1;
  };
  readonly workspace: BrowserProcessWorkspaceInspectionV1["workspace"];
  readonly transcript: TranslationProcessTranscriptProjectionV1;
  readonly workset: TranslationWorksetHeadV1 | null;
  readonly pendingCandidate: TranslationBatchCandidateRecordV1 | null;
}

export type TranslationSourceImportStateV1 =
  | { readonly phase: "idle" }
  | {
    readonly phase: "pending";
    readonly stage: "prepare" | "source" | "finalize";
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

export type TranslationBatchPrepareResultV1 =
  | { readonly kind: "prepared"; readonly run: TranslationAgentRunRequestV1 }
  | { readonly kind: "pending_review" | "unavailable" }
  | {
    readonly kind: "rejected";
    readonly reason: "empty_message" | "message_too_long" | "candidate_invalid";
  }
  | {
    readonly kind: "instruction_exceeds_budget";
    readonly instructionByteLength: number;
    readonly maximumRequestBytes: number;
  }
  | {
    readonly kind: "batch_exceeds_budget";
    readonly requestByteLength: number;
    readonly maximumRequestBytes: number;
    readonly requestedOutputTokens: number;
    readonly maximumOutputTokens: number;
  }
  | {
    readonly kind: "unit_exceeds_budget";
    readonly unitId: string;
    readonly requestByteLength: number;
    readonly maximumRequestBytes: number;
  };

export type TranslationAgentTerminalPersistenceResultV1 =
  | { readonly kind: "persisted"; readonly candidateId: string | null }
  | { readonly kind: "stale" | "unavailable" };

export interface TranslationPendingCandidateReferenceV1 {
  readonly expectedWorksetRevision: number;
  readonly candidateId: string;
}

export interface TranslationPendingCandidateAcceptInputV1
  extends TranslationPendingCandidateReferenceV1 {
  /** Complete editable replacement for the pending candidate's ordered targets. */
  readonly targets: TranslationBatchCandidateAcceptInputV1["targets"];
}

interface TranslationPendingCandidateRetranslationInputV1
  extends TranslationPendingCandidateAcceptInputV1 {
  /** Exact user-authored direction in Conversation mode; null uses the guided default. */
  readonly instruction: string | null;
}

export type TranslationPendingCandidateReviewResultV1 =
  | {
    readonly kind: "accepted" | "rejected";
    readonly workset: TranslationWorksetHeadV1;
  }
  | { readonly kind: "stale"; readonly currentWorkset: TranslationWorksetHeadV1 | null }
  | { readonly kind: "unavailable" };

export type TranslationProcessSettingsUpdateV1 =
  | {
    readonly kind: "saved";
    readonly settings: TranslationProgramSettingsResolutionV1;
  }
  | {
    readonly kind: "invalid";
    readonly settings: TranslationProgramSettingsResolutionV1;
  }
  | { readonly kind: "stale" };

export type TranslationProcessControllerWorkspacePortV1 = Pick<
  BrowserProgramWorkspaceAuthorityV1,
  | "createProcessWorkspace"
  | "inspectProcessWorkspace"
  | "captureProcessWorkspaceHead"
  | "importProcessWorkspaceFile"
  | "readProcessWorkspaceFile"
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
  /** Creates a fresh independent Process; existing Processes are never scanned. */
  createProcess(): Promise<TranslationProcessControllerResultV1<boolean>>;
  /** Opens only the exact Process selected by the global recent-Process surface. */
  openProcess(processId: string): Promise<TranslationProcessControllerResultV1<boolean>>;
  /** Refreshes the routed Process in place so passive tabs observe another owner's commit. */
  refreshActiveProcess(): Promise<TranslationProcessControllerResultV1<boolean>>;
  /** Prepends one older durable page into the bounded mounted Conversation window. */
  loadOlderTranscript(): Promise<TranslationProcessControllerResultV1<boolean>>;
  /** Replaces an older mounted window with the newest durable Conversation page. */
  reloadLatestTranscript(): Promise<TranslationProcessControllerResultV1<boolean>>;
  importSource(
    input: TranslationProcessImportInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationWorksetHeadV1>>;
  prepareAgentBatch(
    budget: TranslationBatchBudgetV1,
    instruction: string,
  ): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>>;
  /** Starts an explicit successor attempt while retaining the predecessor until success. */
  preparePendingCandidateRetranslation(
    budget: TranslationBatchBudgetV1,
    input: TranslationPendingCandidateRetranslationInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>>;
  renewAgentRunLease(
    run: TranslationAgentRunRequestV1,
  ): Promise<TranslationProcessControllerResultV1<"renewed" | "lost" | "idle">>;
  recordAgentRunTerminal(
    terminal: TranslationAgentTerminalRunV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationAgentTerminalPersistenceResultV1>>;
  acceptPendingCandidate(
    input: TranslationPendingCandidateAcceptInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationPendingCandidateReviewResultV1>>;
  rejectPendingCandidate(
    input: TranslationPendingCandidateReferenceV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationPendingCandidateReviewResultV1>>;
  updateSettingsOverride(
    json: string | null,
  ): Promise<TranslationProcessControllerResultV1<TranslationProcessSettingsUpdateV1>>;
  loadTranslationRowWindow(input: {
    readonly processId: string;
    readonly expectedWorksetRevision: number;
    readonly offset: number;
    readonly limit: number;
    readonly signal?: AbortSignal;
  }): Promise<TranslationProcessRowWindowV1>;
  /** Derives one download artifact from the exact completed durable workset. */
  exportCompletedTranslation(): Promise<
    TranslationProcessControllerResultV1<TranslationProcessExportResultV1>
  >;
  openHome(): boolean;
  retry(): Promise<boolean>;
  dispose(): void;
}

export interface TranslationProcessControllerBudgetsV1 {
  readonly transcriptPageMaximumBytes: number;
  /** Mounted Conversation window budget; older durable pages remain pageable. */
  readonly transcriptWindowMaximumBytes?: number;
  /** Per-repository mutation work budget; it never limits total Process rows. */
  readonly importAppendMaximumBytes: number;
}

type TranslationImportExecutionAcquireV1 =
  | { readonly kind: "acquired"; readonly lease: ProcessExecutionLeaseV1 }
  | {
    readonly kind: "conflict";
    readonly currentWorkset: TranslationWorksetHeadV1 | null;
  };

const translationProcessDefaultPageMaximumBytesV1 = 128 * 1_024;
const translationProcessDefaultWindowMaximumBytesV1 = translationProcessDefaultPageMaximumBytesV1 *
  3;
type ResolvedTranslationProcessControllerBudgetsV1 =
  & TranslationProcessControllerBudgetsV1
  & { readonly transcriptWindowMaximumBytes: number };
const defaultBudgetsV1: ResolvedTranslationProcessControllerBudgetsV1 = {
  transcriptPageMaximumBytes: translationProcessDefaultPageMaximumBytesV1,
  transcriptWindowMaximumBytes: translationProcessDefaultWindowMaximumBytesV1,
  importAppendMaximumBytes: operationalStructuredPayloadMaximumBytesV1,
};

type RetryCommandV1 = () => Promise<boolean>;

const controllerTextEncoderV1 = new TextEncoder();

interface TranslationImportMaterialV1 {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly document: TranslationWorksetHeadV1["document"];
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

function translationTerminalMarkdownV1(terminal: TranslationAgentTerminalRunV1): string {
  switch (terminal.outcome) {
    case "completed": {
      if ("assistantReply" in terminal) return terminal.assistantReply.trim();
      const unitCount = String(terminal.run.batch.units.length);
      return terminal.run.replacesCandidateId === null
        ? `A translation candidate for ${unitCount} units is ready for review.`
        : `A replacement translation candidate for ${unitCount} units is ready for review.`;
    }
    case "cancelled":
      if (terminal.run.kind === "follow_up") {
        return "The follow-up was cancelled before an answer was published.";
      }
      return terminal.run.replacesCandidateId === null
        ? "Translation was cancelled before a review candidate was published."
        : "Retranslation was cancelled. The previous review candidate remains available.";
    case "replaced":
      if (terminal.run.kind === "follow_up") {
        return "The follow-up was replaced before an answer was published.";
      }
      return terminal.run.replacesCandidateId === null
        ? "Translation was replaced before a review candidate was published."
        : "Retranslation was replaced. The previous review candidate remains available.";
    case "failed":
      if (terminal.run.kind === "follow_up") {
        if (terminal.diagnosticCode === "output_limit") {
          return "The follow-up exhausted the model output budget before an answer was published.";
        }
        return "The follow-up failed before an answer was published.";
      }
      if (terminal.diagnosticCode === "output_limit") {
        return terminal.run.replacesCandidateId === null
          ? "Translation exhausted the model output budget before a review candidate was published."
          : "Retranslation exhausted the model output budget. The previous review candidate remains available.";
      }
      if (terminal.diagnosticCode === "candidate_structure_invalid") {
        return terminal.run.replacesCandidateId === null
          ? "Translation returned a malformed candidate envelope. No translation content was published."
          : "Retranslation returned a malformed candidate envelope. The previous review candidate remains available.";
      }
      if (terminal.diagnosticCode === "candidate_invalid") {
        return terminal.run.replacesCandidateId === null
          ? "Translation returned a candidate that did not satisfy the exact batch constraints. No translation content was published."
          : "Retranslation returned a candidate that did not satisfy the exact batch constraints. The previous review candidate remains available.";
      }
      return terminal.run.replacesCandidateId === null
        ? "Translation failed before a review candidate was published."
        : "Retranslation failed. The previous review candidate remains available.";
  }
  const exhaustiveTerminal: never = terminal;
  return exhaustiveTerminal;
}

function throwIfAbortedV1(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException("Aborted", "AbortError");
}

function trimmedRequiredV1(value: string, code: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw controllerErrorV1(code);
  return trimmed;
}

function canonicalTargetLocaleV1(value: string): string {
  const canonical = canonicalizeTranslationTargetLocaleV1(value);
  if (canonical === null) throw controllerErrorV1("invalid_target_locale");
  return canonical;
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

function createTranslationFollowUpContextV1(input: {
  readonly workset: TranslationWorksetHeadV1;
  readonly transcriptEntries: readonly TranscriptEntryV1[];
  readonly instruction: string;
  readonly maximumRequestBytes: number;
  readonly excludeSequence: number | null;
}):
  | { readonly kind: "context"; readonly context: TranslationFollowUpContextV1 }
  | { readonly kind: "exceeds"; readonly byteLength: number } {
  const recentConversation = input.transcriptEntries.flatMap((entry) => {
    if (
      entry.sequence === input.excludeSequence || entry.state !== "committed" ||
      (entry.role !== "user" && entry.role !== "assistant")
    ) return [];
    const markdown = entry.parts
      .filter((part) => part.kind === "text_markdown")
      .map((part) => part.markdown)
      .join("\n\n")
      .trim();
    return markdown.length === 0 ? [] : [{ sequence: entry.sequence, role: entry.role, markdown }];
  });
  const base = {
    worksetRevision: input.workset.revision,
    title: input.workset.title,
    sourceFileName: input.workset.source.fileName,
    documentFormat: input.workset.document.format,
    sourceLocale: input.workset.sourceLocale,
    targetLocale: input.workset.targetLocale,
    documentPurpose: input.workset.documentPurpose,
    style: input.workset.style,
    translatedUnitCount: input.workset.acceptedUnitCount,
    acceptedBatchCount: input.workset.acceptedBatchCount,
  };
  const measureSuffixV1 = (start: number): {
    readonly context: TranslationFollowUpContextV1;
    readonly byteLength: number;
  } => {
    const context: TranslationFollowUpContextV1 = {
      ...base,
      recentConversation: recentConversation.slice(start),
    };
    const byteLength = controllerTextEncoderV1.encode(
      createTranslationFollowUpUserPromptV1({ instruction: input.instruction, context }),
    ).byteLength;
    return { context, byteLength };
  };
  const complete = measureSuffixV1(0);
  if (complete.byteLength <= input.maximumRequestBytes) {
    return { kind: "context", context: complete.context };
  }
  const empty = measureSuffixV1(recentConversation.length);
  if (empty.byteLength > input.maximumRequestBytes) {
    return { kind: "exceeds", byteLength: empty.byteLength };
  }
  let lower = 1;
  let upper = recentConversation.length;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (measureSuffixV1(middle).byteLength <= input.maximumRequestBytes) {
      upper = middle;
    } else {
      lower = middle + 1;
    }
  }
  return { kind: "context", context: measureSuffixV1(lower).context };
}

async function prepareImportMaterialV1(
  input: TranslationProcessImportInputV1,
  importBornDigitalPdf: TranslationBornDigitalPdfImporterV1,
): Promise<TranslationImportMaterialV1> {
  const targetLocale = canonicalTargetLocaleV1(input.targetLocale);
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
  let document: TranslationWorksetHeadV1["document"];
  let sourceUnits: PreparedTranslationDocumentV1["sourceUnits"];
  if (pdf) {
    const imported = await importBornDigitalPdf({ bytes });
    if (imported.kind === "rejected") {
      throw controllerErrorV1(`pdf_${imported.reason}`);
    }
    if (imported.document.pageDiagnostics.length > 0) {
      // This first product slice has no durable partial-document state or
      // review surface. Publishing the remaining pages as a complete Process work set
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
    targetLocale,
    title: input.title === undefined
      ? fileName
      : trimmedRequiredV1(input.title, "invalid_workset_title"),
    documentPurpose: input.documentPurpose === undefined
      ? "translation"
      : trimmedRequiredV1(input.documentPurpose, "invalid_document_purpose"),
    style: input.style === undefined
      ? "faithful"
      : trimmedRequiredV1(input.style, "invalid_translation_style"),
  };
}

function sourceExtensionV1(format: TranslationWorksetHeadV1["document"]["format"]): string {
  if (format === "plain_text") return "txt";
  if (format === "markdown") return "md";
  if (format === "subrip") return "srt";
  if (format === "webvtt") return "vtt";
  if (format === "advanced_substation_alpha") return "ass";
  if (format === "sillyos_translation_json") return "json";
  if (format === "pdf_text_reflow") return "pdf";
  throw controllerErrorV1("unsupported_document_format");
}

function canonicalSourcePathV1(
  processId: string,
  format: TranslationWorksetHeadV1["document"]["format"],
): string {
  return `translation-processes/${processId}/source.${sourceExtensionV1(format)}`;
}

function headMatchesImportV1(
  head: TranslationWorksetHeadV1,
  begin: Omit<TranslationWorksetBeginImportInputV1, "sourceBinding" | "lease">,
): boolean {
  return head.processId === begin.processId && head.importOperationId === begin.operationId &&
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
): TranslationWorksetSourceBindingV1 {
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
  left: TranslationWorksetSourceBindingV1,
  right: TranslationWorksetSourceBindingV1,
): boolean {
  return left.revision === right.revision && left.workspaceId === right.workspaceId &&
    left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat &&
    left.path === right.path && left.checkpointId === right.checkpointId &&
    left.generation === right.generation;
}

function completedImportProcessMatchesV1(
  process: ProcessHeadV1,
  lease: ProcessExecutionLeaseV1,
  sourceBinding: TranslationWorksetSourceBindingV1,
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

function completedImportWorksetMatchesProcessV1(
  process: ProcessHeadV1,
  workset: TranslationWorksetHeadV1,
): boolean {
  const terminal = process.lastTerminalAttempt;
  const checkpoint = process.checkpoint;
  return workset.phase === "ready" && workset.processId === process.processId &&
    process.activeAttempt === null && terminal?.outcome === "completed" &&
    terminal.interruptionDisposition === null && checkpoint !== null &&
    checkpoint.throughSequence === process.transcriptFrontier &&
    checkpoint.workspaceId === workset.sourceBinding.workspaceId &&
    checkpoint.workspaceCheckpointId === workset.sourceBinding.checkpointId &&
    checkpoint.workspaceGeneration === workset.sourceBinding.generation;
}

async function mutateWorksetV1(
  repository: TranslationProgramDataRepositoryV1,
  expectation: TranslationWorksetOperationExpectationV1,
  operation: () => Promise<TranslationWorksetMutationResultV1>,
): Promise<TranslationWorksetMutationResultV1> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryTranslationWorksetOperation(expectation);
      if (queried.kind === "mismatch") {
        throw controllerErrorV1("operation_receipt_mismatch");
      }
      if (queried.kind === "committed") {
        const head = await repository.loadTranslationWorksetHead(expectation.input.processId);
        if (head === null || head.revision !== queried.receipt.worksetRevision) {
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
  readonly expectedWorksetRevision: number;
  readonly units: TranslationWorksetAppendImportInputV1["units"];
  readonly updatedAt: number;
}): TranslationWorksetAppendImportInputV1 {
  return {
    processId: input.processId,
    operationId: input.operationId,
    lease: input.lease,
    expectedWorksetRevision: input.expectedWorksetRevision,
    units: input.units,
    glossaryEntries: [],
    updatedAt: input.updatedAt,
  };
}

function nextAppendPageV1(input: {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedWorksetRevision: number;
  readonly units: TranslationWorksetAppendImportInputV1["units"];
  readonly from: number;
  readonly updatedAt: number;
  readonly maximumBytes: number;
}): { readonly input: TranslationWorksetAppendImportInputV1; readonly next: number } {
  const empty = appendInputV1({ ...input, units: [] });
  let byteLength = translationWorksetRowUtf8ByteLengthV1(empty);
  const selected: TranslationWorksetAppendImportInputV1["units"][number][] = [];
  let cursor = input.from;
  while (cursor < input.units.length) {
    const row = input.units[cursor]!;
    const addition = translationWorksetRowUtf8ByteLengthV1(row) +
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
  readonly input: TranslationWorksetAppendImportInputV1;
  readonly next: number;
}

/** Conservative numeric envelope; identities match the lease acquired later. */
function importEnvelopeSizingLeaseV1(input: {
  readonly processId: string;
  readonly ownerInstanceId: string;
  readonly attemptId: string;
}): ProcessExecutionLeaseV1 {
  return {
    processId: input.processId,
    ownerInstanceId: input.ownerInstanceId,
    attemptId: input.attemptId,
    generation: Number.MAX_SAFE_INTEGER,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}

function planAppendPagesV1(input: {
  readonly processId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly initialWorksetRevision: number;
  readonly units: TranslationWorksetAppendImportInputV1["units"];
  readonly from: number;
  readonly updatedAt: () => number;
  readonly createOperationId: () => string;
  readonly maximumBytes: number;
}): readonly PlannedTranslationAppendV1[] {
  const pages: PlannedTranslationAppendV1[] = [];
  let cursor = input.from;
  let expectedWorksetRevision = input.initialWorksetRevision;
  while (cursor < input.units.length) {
    const page = nextAppendPageV1({
      processId: input.processId,
      operationId: input.createOperationId(),
      lease: input.lease,
      expectedWorksetRevision,
      units: input.units,
      from: cursor,
      updatedAt: input.updatedAt(),
      maximumBytes: input.maximumBytes,
    });
    pages.push(page);
    cursor = page.next;
    expectedWorksetRevision += 1;
  }
  return pages;
}

function validateBudgetsV1(
  budgets: TranslationProcessControllerBudgetsV1 | undefined,
): ResolvedTranslationProcessControllerBudgetsV1 {
  const selected = budgets ?? defaultBudgetsV1;
  const transcriptWindowMaximumBytes = selected.transcriptWindowMaximumBytes ?? Math.min(
    operationalStructuredPayloadMaximumBytesV1,
    selected.transcriptPageMaximumBytes * 3,
  );
  if (
    !Number.isSafeInteger(selected.transcriptPageMaximumBytes) ||
    selected.transcriptPageMaximumBytes <= 0 ||
    selected.transcriptPageMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !Number.isSafeInteger(transcriptWindowMaximumBytes) ||
    transcriptWindowMaximumBytes < selected.transcriptPageMaximumBytes ||
    transcriptWindowMaximumBytes > operationalStructuredPayloadMaximumBytesV1 ||
    !Number.isSafeInteger(selected.importAppendMaximumBytes) ||
    selected.importAppendMaximumBytes <= 0 ||
    selected.importAppendMaximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("sillyos.translation_process_controller.invalid_budgets");
  return { ...selected, transcriptWindowMaximumBytes };
}

function translationTranscriptProjectionV1(
  window: TranscriptWindowV1,
  phase: TranslationProcessTranscriptProjectionV1["phase"],
): TranslationProcessTranscriptProjectionV1 {
  return { ...projectTranscriptWindowV1(window), phase };
}

function sameProgramPackageV1(
  left: InstalledProgramPackageReferenceV1,
  right: InstalledProgramPackageReferenceV1,
): boolean {
  return left.programId === right.programId && left.packageVersion === right.packageVersion &&
    left.contentDigest === right.contentDigest;
}

function translationProcessV1(
  process: ProcessHeadV1,
  programPackage: InstalledProgramPackageReferenceV1,
): boolean {
  return sameProgramPackageV1(process.programPackage, programPackage);
}

function processWorkspaceMatchesV1(
  inspection: BrowserProcessWorkspaceInspectionV1,
  programPackage: InstalledProgramPackageReferenceV1,
): boolean {
  const process = inspection.process;
  const checkpoint = process.checkpoint;
  return translationProcessV1(process, programPackage) && process.subjectProgramId === null &&
    inspection.workspace.processId === process.processId && checkpoint !== null &&
    checkpoint.workspaceId === inspection.workspace.workspaceId;
}

function createdProcessMatchesInputV1(
  inspection: BrowserProcessWorkspaceInspectionV1,
  input: BrowserProcessWorkspaceCreateInputV1,
  programPackage: InstalledProgramPackageReferenceV1,
): boolean {
  const checkpoint = inspection.process.checkpoint;
  return processWorkspaceMatchesV1(inspection, programPackage) &&
    sameProgramPackageV1(inspection.process.programPackage, programPackage) &&
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
  readonly repository: TranslationProgramDataRepositoryV1;
  readonly workspace: TranslationProcessControllerWorkspacePortV1;
  /** Exact package selected before this Process controller is created. */
  readonly programPackage: AdmittedProgramPackageArchiveV1;
  /** Test seam; the production default preserves the browser PDF adapter's lazy chunk. */
  readonly importBornDigitalPdf?: TranslationBornDigitalPdfImporterV1;
  readonly createId?: (purpose: string) => string;
  readonly now?: () => number;
  readonly ownerInstanceId?: string;
  readonly processExecutionLeaseDurationMilliseconds?: number;
  readonly budgets?: TranslationProcessControllerBudgetsV1;
}): TranslationProcessControllerV1 {
  const repository = input.repository;
  const workspace = input.workspace;
  const programPackage = input.programPackage.reference;
  const packageFacets = resolveTranslationProgramPackageFacetsV1(input.programPackage);
  const programPackageProjectionBase = {
    reference: { ...programPackage },
    manifest: {
      ...input.programPackage.manifest,
      scripts: input.programPackage.manifest.scripts.map((script) => ({ ...script })),
      capabilityIds: [...input.programPackage.manifest.capabilityIds],
    },
    instructions: readProgramPackageTextFileV1(
      input.programPackage,
      input.programPackage.manifest.instructionsPath,
    ),
    initialUi: packageFacets.initialUi,
  };
  const resolveProcessSettingsV1 = (overrideJson: string | null) =>
    resolveTranslationProgramSettingsV1({
      programDefaultsJson: packageFacets.settingsDefaultsJson,
      processOverrideJson: overrideJson,
    });
  const programPackageProjectionV1 = (
    settings: TranslationProgramSettingsResolutionV1,
  ): TranslationActiveProcessProjectionV1["programPackage"] => ({
    ...programPackageProjectionBase,
    settings,
  });
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
  let transcriptWindowRevision = 0;
  let transcriptWindow: TranscriptWindowV1 | null = null;
  let retryCommand: RetryCommandV1 | null = null;
  let snapshot: TranslationProcessControllerSnapshotV1 = {
    revision: 0,
    route: "home",
    activeProcess: null,
    sourceImport: { phase: "idle" },
    durability: { phase: "ready" },
  };
  let ownedAgentLease: ProcessExecutionLeaseV1 | null = null;
  let terminalizingAgentRunId: string | null = null;
  let leaseRenewalTail: Promise<void> = Promise.resolve();

  const leaseMatchesV1 = (
    left: ProcessExecutionLeaseV1,
    right: ProcessExecutionLeaseV1,
  ): boolean =>
    left.processId === right.processId && left.ownerInstanceId === right.ownerInstanceId &&
    left.attemptId === right.attemptId && left.generation === right.generation;

  const serializeLeaseRenewalV1 = async <T>(operation: () => Promise<T>): Promise<T> => {
    const predecessor = leaseRenewalTail;
    let release!: () => void;
    leaseRenewalTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return await operation();
    } finally {
      release();
    }
  };

  const acquireImportLeaseV1 = async (
    process: ProcessHeadV1,
    expectedWorksetRevision: number | null,
    attemptId: string,
  ): Promise<TranslationImportExecutionAcquireV1> => {
    const checkpoint = process.checkpoint;
    if (checkpoint === null || process.activeAttempt !== null) {
      return {
        kind: "conflict",
        currentWorkset: await repository.loadTranslationWorksetHead(process.processId),
      };
    }
    const observedAt = Math.max(now(), process.updatedAt);
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
      operation: "workset_import_execution_acquire" as const,
      input: { expectedWorksetRevision, execution: acquireInput },
    };
    let acquiredLease: ProcessExecutionLeaseV1 | null = null;
    try {
      const result = await repository.acquireTranslationWorksetImportExecution(
        expectation.input,
      );
      if (result.kind === "conflict") {
        return { kind: "conflict", currentWorkset: result.currentWorkset };
      }
      acquiredLease = result.lease;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryTranslationProcessOperation(expectation);
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
    ) return { kind: "conflict", currentWorkset: null };
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
    readonly sourceBinding: TranslationWorksetSourceBindingV1 | null;
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
    readonly sourceBinding: TranslationWorksetSourceBindingV1 | null;
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

  const loadTranscriptInstructionV1 = async (binding: {
    readonly processId: string;
    readonly entryId: string;
    readonly sequence: number;
  }): Promise<string | null> => {
    const page = await repository.loadTranscriptPage({
      processId: binding.processId,
      beforeSequence: binding.sequence + 1,
      maximumBytes: budgets.transcriptPageMaximumBytes,
    });
    const entry = page?.entries.find((candidate) =>
      candidate.entryId === binding.entryId && candidate.sequence === binding.sequence &&
      candidate.role === "user"
    );
    const textParts = entry?.parts.filter((part) => part.kind === "text_markdown") ?? [];
    if (entry === undefined || textParts.length !== 1) return null;
    const instruction = textParts[0]!.markdown;
    if (
      instruction.length === 0 || instruction !== instruction.trim() ||
      instruction.length > translationAgentInstructionMaximumCharactersV1
    ) return null;
    return instruction;
  };

  const loadOptionalTranslationProjectionV1 = async (processId: string): Promise<{
    readonly workset: TranslationWorksetHeadV1 | null;
    readonly pendingCandidate: TranslationBatchCandidateRecordV1 | null;
    readonly failureCode: string | null;
  }> => {
    try {
      const workset = await repository.loadTranslationWorksetHead(processId);
      if (workset === null || workset.pendingCandidateId === null) {
        return { workset, pendingCandidate: null, failureCode: null };
      }
      const pendingCandidate = await repository.loadTranslationBatchCandidate(
        processId,
        workset.pendingCandidateId,
      );
      if (
        pendingCandidate === null || pendingCandidate.processId !== processId ||
        pendingCandidate.candidateId !== workset.pendingCandidateId
      ) {
        return {
          workset: null,
          pendingCandidate: null,
          failureCode: "translation_candidate_missing",
        };
      }
      return { workset, pendingCandidate, failureCode: null };
    } catch (error) {
      return {
        workset: null,
        pendingCandidate: null,
        failureCode: failureCodeV1(error),
      };
    }
  };

  const settleExpiredAttemptV1 = async (
    process: ProcessHeadV1,
  ): Promise<ProcessHeadV1> => {
    const attempt = process.activeAttempt;
    if (attempt === null) return process;
    const lease = await repository.loadProcessExecutionLease(process.processId);
    if (
      lease === null || lease.attemptId !== attempt.attemptId ||
      lease.generation !== attempt.generation || now() < lease.expiresAt
    ) return process;
    const { pendingCandidate, workset } = await loadOptionalTranslationProjectionV1(
      process.processId,
    );
    const checkpoint = process.checkpoint;
    const startingCheckpoint = attempt.startingCheckpoint;
    const settledWorkspaceHead = await workspace.captureProcessWorkspaceHead({
      processId: process.processId,
      workspaceId: startingCheckpoint.workspaceId,
    }).catch(() => null);
    const workspaceHeadCanBeAdopted = settledWorkspaceHead !== null &&
      (settledWorkspaceHead.generation > startingCheckpoint.workspaceGeneration ||
        (settledWorkspaceHead.generation === startingCheckpoint.workspaceGeneration &&
          settledWorkspaceHead.checkpointId === startingCheckpoint.workspaceCheckpointId));
    const candidateEvidenceIsCurrent = workset !== null &&
      (workset.pendingCandidateId === null || (pendingCandidate !== null &&
        pendingCandidate.processId === process.processId &&
        pendingCandidate.candidateId === workset.pendingCandidateId &&
        pendingCandidate.baseWorksetRevision + 1 === workset.revision &&
        pendingCandidate.firstOrder === workset.acceptedUnitCount));
    const retryable = workset?.phase === "ready" && candidateEvidenceIsCurrent &&
      checkpoint !== null && checkpoint.checkpointId === startingCheckpoint.checkpointId &&
      checkpoint.throughSequence === startingCheckpoint.throughSequence &&
      checkpoint.workspaceId === startingCheckpoint.workspaceId &&
      checkpoint.workspaceCheckpointId === startingCheckpoint.workspaceCheckpointId &&
      checkpoint.workspaceGeneration === startingCheckpoint.workspaceGeneration &&
      workspaceHeadCanBeAdopted &&
      workset.sourceBinding.workspaceId === startingCheckpoint.workspaceId &&
      workset.sourceBinding.generation <= settledWorkspaceHead.generation;
    const observedAt = Math.max(now(), lease.expiresAt, process.updatedAt);
    const sequence = process.transcriptFrontier + 1;
    const entryId = createId("translation-attempt-interrupted-entry");
    const terminalInput: ProcessExecutionTerminalInputV1 = {
      lease,
      observedAt,
      transcript: {
        processId: process.processId,
        expectedProcessRevision: process.revision,
        expectedTranscriptFrontier: process.transcriptFrontier,
        commitId: createId("translation-attempt-interrupted"),
        attemptBinding: { attemptId: lease.attemptId, generation: lease.generation },
        entries: [{
          schemaVersion: 1,
          processId: process.processId,
          sequence,
          entryId,
          role: "system",
          state: "interrupted_partial",
          parts: [{
            kind: "text_markdown",
            partId: `${entryId}.text`,
            markdown: retryable
              ? workset?.pendingCandidateId === null
                ? "The previous translation batch was interrupted. Its committed request can be retried from the last stable Process Workspace checkpoint."
                : "Retranslation was interrupted. The previous review candidate remains available, and the exact interrupted successor attempt can be retried explicitly."
              : workset?.phase === "staging"
              ? "The previous source import stopped before the Process work set became ready. Review the incomplete import before continuing."
              : "The previous translation attempt stopped after its durable Process evidence changed or became unavailable. SillyOS will not replay it automatically.",
          }],
        }],
        checkpoint: workspaceHeadCanBeAdopted
          ? {
            checkpointId: `${attempt.attemptId}.interrupted-checkpoint`,
            throughSequence: sequence,
            workspaceId: startingCheckpoint.workspaceId,
            workspaceCheckpointId: settledWorkspaceHead.checkpointId,
            workspaceGeneration: settledWorkspaceHead.generation,
          }
          : null,
        terminalAttemptReceipt: {
          schemaVersion: 1,
          processId: process.processId,
          attemptId: lease.attemptId,
          generation: lease.generation,
          outcome: "interrupted",
          terminalSequence: sequence,
          terminalEntryId: entryId,
          interruptionDisposition: retryable ? "retryable" : "unrecoverable",
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
    readonly workset: TranslationWorksetHeadV1;
    readonly expectedLease?: ProcessExecutionLeaseV1;
  }): Promise<TranslationProcessControllerResultV1<TranslationWorksetHeadV1>> => {
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
      !completedImportWorksetMatchesProcessV1(process, projectionInput.workset) ||
      (projectionInput.expectedLease !== undefined &&
        !completedImportProcessMatchesV1(
          process,
          projectionInput.expectedLease,
          projectionInput.workset.sourceBinding,
        ))
    ) throw controllerErrorV1("operation_reconciliation_conflict");
    transcriptWindow = createTranscriptWindowV1(transcript);
    transcriptWindowRevision += 1;
    publish({
      route: "process",
      activeProcess: {
        ...active,
        process,
        transcript: translationTranscriptProjectionV1(transcriptWindow, "ready"),
        workset: projectionInput.workset,
      },
      sourceImport: { phase: "idle" },
      durability: { phase: "ready" },
    });
    return { kind: "completed", value: projectionInput.workset };
  };

  const fail = (
    operation: "initialize" | "open" | "create",
    code: string,
    recovery: "retry" | null,
    retry: RetryCommandV1 | null,
  ): TranslationProcessControllerResultV1<boolean> => {
    retryCommand = retry;
    if (operation !== "initialize") {
      transcriptWindow = null;
      transcriptWindowRevision += 1;
    }
    publish({
      route: operation === "initialize" ? snapshot.route : "home",
      activeProcess: operation === "initialize" ? snapshot.activeProcess : null,
      durability: { phase: "failed", operation, code, recovery },
    });
    return { kind: "failed", code };
  };

  const beginRouteLoadV1 = (): number => {
    const epoch = ++routeEpoch;
    transcriptWindow = null;
    transcriptWindowRevision += 1;
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
  ): Promise<TranslationProcessControllerResultV1<boolean>> => {
    try {
      let inspection = await workspace.inspectProcessWorkspace(processId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (inspection === null) return fail("open", "process_workspace_not_found", null, null);
      if (!processWorkspaceMatchesV1(inspection, programPackage)) {
        return fail("open", "process_workspace_mismatch", null, null);
      }
      const settledProcess = await settleExpiredAttemptV1(inspection.process);
      if (settledProcess.revision !== inspection.process.revision) {
        inspection = await workspace.inspectProcessWorkspace(processId);
        if (
          inspection === null ||
          !processWorkspaceMatchesV1(inspection, programPackage)
        ) {
          return fail("open", "process_workspace_mismatch", null, null);
        }
      }
      const [transcript, settingsOverride, translationProjection] = await Promise.all([
        repository.loadTranscriptPage({
          processId,
          beforeSequence: null,
          maximumBytes: budgets.transcriptPageMaximumBytes,
        }),
        repository.loadProcessSettingsOverride(processId),
        loadOptionalTranslationProjectionV1(processId),
      ]);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (transcript === null || transcript.processId !== processId) {
        return fail("open", "process_transcript_not_found", null, null);
      }
      const { failureCode, pendingCandidate, workset } = translationProjection;
      retryCommand = null;
      transcriptWindow = createTranscriptWindowV1(transcript);
      transcriptWindowRevision += 1;
      publish({
        route: "process",
        activeProcess: {
          process: inspection.process,
          programPackage: programPackageProjectionV1(
            resolveProcessSettingsV1(settingsOverride?.overrideJson ?? null),
          ),
          workspace: inspection.workspace,
          transcript: translationTranscriptProjectionV1(transcriptWindow, "ready"),
          workset,
          pendingCandidate,
        },
        sourceImport: failureCode !== null
          ? { phase: "failed", code: failureCode }
          : workset?.phase === "staging"
          ? { phase: "failed", code: "translation_import_incomplete" }
          : { phase: "idle" },
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      return fail("open", code, "retry", async () => {
        const result = await openProcessAtEpochV1(processId, beginRouteLoadV1());
        return result.kind === "completed";
      });
    }
  };

  const createProcessV1 = async (
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
        programPackage,
        subjectProgramId: null,
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
      const result = await workspace.createProcessWorkspace(createInput);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      if (result.kind === "committed" || result.kind === "unchanged") {
        if (
          result.process.processId !== processId ||
          result.process.subjectProgramId !== null ||
          result.workspace.workspaceId !== workspaceId ||
          !sameProgramPackageV1(result.process.programPackage, programPackage)
        ) return fail("create", "repository_response_mismatch", null, null);
        return await openProcessAtEpochV1(processId, epoch);
      }
      return fail("create", result.kind, null, null);
    } catch (error) {
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const code = failureCodeV1(error);
      if (code === "outcome_unknown") {
        try {
          const inspection = await workspace.inspectProcessWorkspace(processId);
          if (
            inspection !== null &&
            createdProcessMatchesInputV1(inspection, createInput, programPackage)
          ) return await openProcessAtEpochV1(processId, epoch);
        } catch {
          // Keep the original unknown outcome. A caller must not create a
          // second Process until the exact durable identity can be inspected.
        }
        return fail("create", code, null, null);
      }
      return fail("create", code, "retry", async () => {
        const result = await createProcessV1(beginRouteLoadV1());
        return result.kind === "completed";
      });
    }
  };

  const importSourceV1 = async (
    importInput: TranslationProcessImportInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationWorksetHeadV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    if (snapshot.route !== "process" || active === null) {
      return { kind: "failed", code: "translation_process_unavailable" };
    }
    if (snapshot.sourceImport.phase === "pending") return { kind: "busy" };
    const epoch = routeEpoch;
    const publishImportV1 = (
      workset: TranslationWorksetHeadV1 | null,
      sourceImport: TranslationSourceImportStateV1,
    ): void => {
      if (disposed || epoch !== routeEpoch || snapshot.activeProcess === null) return;
      publish({
        route: "process",
        activeProcess: { ...snapshot.activeProcess, workset },
        sourceImport,
        durability: { phase: "ready" },
      });
    };
    const failImportV1 = (
      code: string,
      workset: TranslationWorksetHeadV1 | null,
    ): TranslationProcessControllerResultV1<TranslationWorksetHeadV1> => {
      publishImportV1(workset, { phase: "failed", code });
      return { kind: "failed", code };
    };

    publishImportV1(active.workset, { phase: "pending", stage: "prepare" });
    let latestHead = active.workset;
    let lease: ProcessExecutionLeaseV1 | null = null;
    let sourceBinding: TranslationWorksetSourceBindingV1 | null = null;
    let terminalSettled = false;
    try {
      const material = await prepareImportMaterialV1({
        ...importInput,
        targetLocale: importInput.targetLocale.trim() ||
          active.programPackage.settings.effective.targetLocale,
        style: importInput.style ?? active.programPackage.settings.effective.defaultStyle,
      }, importBornDigitalPdf);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const durableHead = await repository.loadTranslationWorksetHead(active.process.processId);
      if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
      const workspacePath = durableHead?.source.workspacePath ??
        canonicalSourcePathV1(active.process.processId, material.document.format);
      const beginDraft: Omit<TranslationWorksetBeginImportInputV1, "sourceBinding" | "lease"> = {
        processId: active.process.processId,
        operationId: durableHead?.importOperationId ?? createId("translation-import-begin"),
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
          return failImportV1("translation_workset_exists", durableHead);
        }
        if (durableHead.phase === "ready") {
          return await publishCompletedImportProjectionV1({
            epoch,
            processId: active.process.processId,
            workset: durableHead,
          });
        }
        if (
          durableHead.stagedUnitCount > material.sourceUnits.length ||
          durableHead.stagedGlossaryCount !== 0
        ) return failImportV1("translation_workset_conflict", durableHead);
      }

      // Plan and byte-check every repository append before touching the
      // execution lease, Workspace, or Process work-set stores. The sizing lease
      // uses the exact identities that acquisition will publish and maximum
      // numeric fields, so a single oversized row cannot leave either authority
      // started.
      const importAttemptId = createId("translation-import-attempt");
      const plannedAppends = planAppendPagesV1({
        processId: active.process.processId,
        lease: importEnvelopeSizingLeaseV1({
          processId: active.process.processId,
          ownerInstanceId,
          attemptId: importAttemptId,
        }),
        initialWorksetRevision: durableHead?.revision ?? 1,
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
      const expectedWorksetRevision = durableHead?.revision ?? null;
      const acquired = await acquireImportLeaseV1(
        currentProcess,
        expectedWorksetRevision,
        importAttemptId,
      );
      if (acquired.kind === "conflict") {
        const currentWorkset = acquired.currentWorkset;
        const worksetExpectationStillCurrent = expectedWorksetRevision === null
          ? currentWorkset === null
          : currentWorkset?.phase === "staging" &&
            currentWorkset.revision === expectedWorksetRevision;
        if (worksetExpectationStillCurrent) {
          return failImportV1("process_execution_busy", currentWorkset);
        }
        latestHead = currentWorkset;
        if (
          currentWorkset !== null && currentWorkset.phase === "ready" &&
          headMatchesImportV1(currentWorkset, beginDraft)
        ) {
          return await publishCompletedImportProjectionV1({
            epoch,
            processId: active.process.processId,
            workset: currentWorkset,
          });
        }
        return failImportV1(
          currentWorkset !== null && !headMatchesImportV1(currentWorkset, beginDraft)
            ? "translation_workset_exists"
            : "translation_workset_conflict",
          currentWorkset,
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
            await workspace.importProcessWorkspaceFile({
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
            await workspace.importProcessWorkspaceFile({
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
        const beginInput: TranslationWorksetBeginImportInputV1 = {
          ...beginDraft,
          lease,
          updatedAt: currentLease.observedAt,
          sourceBinding,
        };
        const expectation = { operation: "begin" as const, input: beginInput };
        const result = await mutateWorksetV1(
          repository,
          expectation,
          () => repository.beginTranslationWorksetImport(beginInput),
        );
        if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
        if (result.kind === "conflict") {
          return failImportV1("translation_workset_conflict", result.current);
        }
        latestHead = result.head;
        publishImportV1(latestHead, { phase: "pending", stage: "prepare" });
      }

      if (
        latestHead === null || latestHead.phase !== "staging" ||
        latestHead.stagedUnitCount > material.sourceUnits.length ||
        latestHead.stagedGlossaryCount !== 0
      ) return failImportV1("translation_workset_conflict", latestHead);

      for (const page of plannedAppends) {
        if (page.input.expectedWorksetRevision !== latestHead.revision) {
          return failImportV1("translation_workset_conflict", latestHead);
        }
        currentLease = await currentImportLeaseAtCutV1(lease);
        lease = currentLease.lease;
        const pageInput: TranslationWorksetAppendImportInputV1 = {
          ...page.input,
          lease,
          updatedAt: currentLease.observedAt,
        };
        if (translationWorksetRowUtf8ByteLengthV1(pageInput) > budgets.importAppendMaximumBytes) {
          return failImportV1("translation_append_envelope_exceeds_operation_budget", latestHead);
        }
        const expectation = { operation: "append" as const, input: pageInput };
        const result = await mutateWorksetV1(
          repository,
          expectation,
          () => repository.appendTranslationWorksetImport(pageInput),
        );
        if (disposed || epoch !== routeEpoch) return { kind: "failed", code: "superseded" };
        if (result.kind === "conflict") {
          return failImportV1("translation_workset_conflict", result.current);
        }
        latestHead = result.head;
        if (
          latestHead.phase !== "staging" || latestHead.stagedUnitCount !== page.next ||
          latestHead.stagedGlossaryCount !== 0
        ) return failImportV1("translation_workset_conflict", latestHead);
        publishImportV1(latestHead, { phase: "pending", stage: "prepare" });
      }

      publishImportV1(latestHead, { phase: "pending", stage: "finalize" });
      currentLease = await currentImportLeaseAtCutV1(lease);
      lease = currentLease.lease;
      const finalizeInput = {
        processId: active.process.processId,
        operationId: createId("translation-import-finalize"),
        lease,
        expectedWorksetRevision: latestHead.revision,
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
          .commitTranslationWorksetFinalizeWithProcessExecutionTerminal({
            workset: finalizeInput,
            terminal: terminalInput,
          });
        if (finalized.kind === "conflict") {
          return failImportV1("translation_workset_conflict", finalized.currentWorkset);
        }
        terminalSettled = true;
        latestHead = finalized.head;
        terminalProcess = finalized.process;
      } catch (error) {
        if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
          throw error;
        }
        const queried = await repository.queryTranslationWorksetOperation(expectation);
        if (queried.kind === "mismatch") {
          throw controllerErrorV1("operation_receipt_mismatch");
        }
        if (queried.kind === "absent") throw error;
        terminalSettled = true;
        const [reconciledHead, reconciledProcess] = await Promise.all([
          repository.loadTranslationWorksetHead(active.process.processId),
          repository.loadProcess(active.process.processId),
        ]);
        if (
          reconciledHead === null || reconciledHead.phase !== "ready" ||
          reconciledHead.revision !== queried.receipt.worksetRevision ||
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
        workset: latestHead,
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

  const loadTranslationRowWindowV1 = async (rowInput: {
    readonly processId: string;
    readonly expectedWorksetRevision: number;
    readonly offset: number;
    readonly limit: number;
    readonly signal?: AbortSignal;
  }): Promise<TranslationProcessRowWindowV1> => {
    throwIfAbortedV1(rowInput.signal);
    if (disposed) throw controllerErrorV1("disposed");
    if (!Number.isSafeInteger(rowInput.offset) || rowInput.offset < 0) {
      throw new RangeError("sillyos.translation_process_controller.invalid_row_offset");
    }
    if (!Number.isSafeInteger(rowInput.limit) || rowInput.limit <= 0) {
      throw new RangeError("sillyos.translation_process_controller.invalid_row_limit");
    }
    if (
      !Number.isSafeInteger(rowInput.expectedWorksetRevision) ||
      rowInput.expectedWorksetRevision < 1
    ) {
      throw new RangeError("sillyos.translation_process_controller.invalid_workset_revision");
    }
    const epoch = routeEpoch;
    const active = snapshot.activeProcess;
    const workset = active === null ? null : active.workset;
    if (
      snapshot.route !== "process" || active === null || workset === null ||
      workset.phase !== "ready" || active.process.processId !== rowInput.processId ||
      workset.processId !== rowInput.processId ||
      workset.revision !== rowInput.expectedWorksetRevision
    ) throw controllerErrorV1("translation_workset_unavailable");

    const totalRowCount = workset.expectedUnitCount;
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

    const rows: TranslationProcessUnitProjectionV1[] = [];
    let cursor = rowInput.offset;
    while (rows.length < requestedCount) {
      throwIfAbortedV1(rowInput.signal);
      const result = await repository.loadTranslationWorksetUnitPage({
        processId: rowInput.processId,
        expectedWorksetRevision: rowInput.expectedWorksetRevision,
        fromOrder: cursor,
        maximumRows: requestedCount - rows.length,
        maximumBytes: operationalStructuredPayloadMaximumBytesV1,
      });
      throwIfAbortedV1(rowInput.signal);
      if (disposed || epoch !== routeEpoch) throw controllerErrorV1("superseded");
      if (result.kind === "conflict") {
        throw controllerErrorV1("translation_workset_revision_conflict");
      }
      const page = result.page;
      if (
        page.processId !== rowInput.processId ||
        page.worksetRevision !== rowInput.expectedWorksetRevision ||
        page.fromOrder !== cursor || page.rows.length === 0
      ) throw controllerErrorV1("translation_workset_page_mismatch");
      for (const row of page.rows) {
        if (row.processId !== rowInput.processId || row.order !== cursor) {
          throw controllerErrorV1("translation_workset_page_mismatch");
        }
        rows.push({
          unitId: row.unitId,
          order: row.order,
          locator: row.locator,
          context: row.context,
          durationMilliseconds: row.durationMilliseconds,
          lineBreakPolicy: row.lineBreakPolicy,
          source: row.source,
          protectedSegments: row.protectedSegments.map((segment) => ({ ...segment })),
          target: row.target,
        });
        cursor += 1;
      }
      if (rows.length < requestedCount && page.nextOrder !== cursor) {
        throw controllerErrorV1("translation_workset_page_mismatch");
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

  const exportCompletedTranslationV1 = async (): Promise<
    TranslationProcessControllerResultV1<TranslationProcessExportResultV1>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const epoch = routeEpoch;
    const active = snapshot.activeProcess;
    const workset = active?.workset ?? null;
    if (
      snapshot.route !== "process" || active === null || workset === null ||
      workset.phase !== "ready"
    ) {
      return {
        kind: "completed",
        value: { kind: "rejected", reason: "workset_not_ready", unitId: null },
      };
    }
    if (workset.pendingCandidateId !== null) {
      return {
        kind: "completed",
        value: { kind: "rejected", reason: "pending_review", unitId: null },
      };
    }
    if (
      active.process.activeAttempt !== null ||
      workset.acceptedUnitCount !== workset.expectedUnitCount ||
      workset.stagedUnitCount !== workset.expectedUnitCount
    ) {
      return {
        kind: "completed",
        value: { kind: "rejected", reason: "translation_incomplete", unitId: null },
      };
    }

    try {
      const rows: TranslationWorksetUnitRecordV1[] = [];
      let cursor = 0;
      while (cursor < workset.expectedUnitCount) {
        const result = await repository.loadTranslationWorksetUnitPage({
          processId: workset.processId,
          expectedWorksetRevision: workset.revision,
          fromOrder: cursor,
          maximumRows: workset.expectedUnitCount - cursor,
          maximumBytes: operationalStructuredPayloadMaximumBytesV1,
        });
        if (result.kind === "conflict") {
          return {
            kind: "completed",
            value: { kind: "rejected", reason: "row_mismatch", unitId: null },
          };
        }
        if (
          result.page.processId !== workset.processId ||
          result.page.worksetRevision !== workset.revision ||
          result.page.fromOrder !== cursor || result.page.rows.length === 0
        ) {
          return {
            kind: "completed",
            value: { kind: "rejected", reason: "row_mismatch", unitId: null },
          };
        }
        for (const row of result.page.rows) {
          if (row.processId !== workset.processId || row.order !== cursor) {
            return {
              kind: "completed",
              value: { kind: "rejected", reason: "row_mismatch", unitId: row.unitId },
            };
          }
          rows.push(row);
          cursor += 1;
        }
        if (cursor < workset.expectedUnitCount && result.page.nextOrder !== cursor) {
          return {
            kind: "completed",
            value: { kind: "rejected", reason: "row_mismatch", unitId: null },
          };
        }
      }

      const sourceBytes = workset.document.format === "pdf_text_reflow"
        ? null
        : await workspace.readProcessWorkspaceFile({
          processId: workset.processId,
          workspaceId: active.workspace.workspaceId,
          path: workset.source.workspacePath,
        }).then((read) => {
          if (
            read.source.processId !== workset.processId ||
            read.source.workspaceId !== workset.sourceBinding.workspaceId ||
            read.source.volumeId !== workset.sourceBinding.volumeId ||
            read.source.workspaceFormat !== workset.sourceBinding.workspaceFormat ||
            read.source.path !== workset.source.workspacePath
          ) throw controllerErrorV1("translation_source_binding_mismatch");
          return read.bytes;
        });

      const current = await repository.loadTranslationWorksetHead(workset.processId);
      if (
        disposed || routeEpoch !== epoch || snapshot.route !== "process" ||
        snapshot.activeProcess?.process.processId !== workset.processId || current === null ||
        current.revision !== workset.revision || current.phase !== "ready" ||
        current.pendingCandidateId !== null ||
        current.acceptedUnitCount !== current.expectedUnitCount ||
        current.stagedUnitCount !== current.expectedUnitCount
      ) {
        return {
          kind: "completed",
          value: { kind: "rejected", reason: "row_mismatch", unitId: null },
        };
      }
      return {
        kind: "completed",
        value: await exportTranslationProcessV1({ workset: current, rows, sourceBytes }),
      };
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const loadBatchPlanningRowsV1 = async (
    workset: TranslationWorksetHeadV1,
    budget: TranslationBatchBudgetV1,
  ): Promise<{
    readonly sourceRows: readonly TranslationWorksetUnitV1[];
    readonly glossaryRows: readonly TranslationWorksetGlossaryEntryV1[];
    readonly preceding: TranslationWorksetUnitV1 | null;
  }> => {
    const preceding = workset.acceptedUnitCount === 0
      ? null
      : await repository.loadTranslationWorksetUnitPage({
        processId: workset.processId,
        expectedWorksetRevision: workset.revision,
        fromOrder: workset.acceptedUnitCount - 1,
        maximumRows: 1,
        maximumBytes: operationalStructuredPayloadMaximumBytesV1,
      }).then((result) => {
        if (result.kind === "conflict") throw controllerErrorV1("translation_workset_changed");
        return result.page.rows[0] ?? null;
      });

    const sourceRows: TranslationWorksetUnitV1[] = [];
    let cursor = workset.acceptedUnitCount;
    while (cursor < workset.stagedUnitCount) {
      const pageResult = await repository.loadTranslationWorksetUnitPage({
        processId: workset.processId,
        expectedWorksetRevision: workset.revision,
        fromOrder: cursor,
        maximumRows: workset.stagedUnitCount - cursor,
        maximumBytes: operationalStructuredPayloadMaximumBytesV1,
      });
      if (pageResult.kind === "conflict") {
        throw controllerErrorV1("translation_workset_changed");
      }
      const page = pageResult.page;
      if (page.rows.length === 0) throw controllerErrorV1("translation_workset_page_mismatch");
      sourceRows.push(...page.rows);
      const probe = planTranslationBatchRequestV1({
        sourceLocale: workset.sourceLocale,
        targetLocale: workset.targetLocale,
        documentPurpose: workset.documentPurpose,
        style: workset.style,
        sourceRows,
        glossaryRows: [],
        confirmedMeaningFacts: [],
        neighboringUnits: { preceding, following: null },
        budget,
      });
      if (
        probe.kind === "unit_exceeds_budget" ||
        probe.kind === "planned" && probe.request.units.length < sourceRows.length
      ) break;
      if (page.nextOrder === null) break;
      if (page.nextOrder <= cursor) throw controllerErrorV1("translation_workset_page_mismatch");
      cursor = page.nextOrder;
    }

    const glossaryRows: TranslationWorksetGlossaryEntryV1[] = [];
    let glossaryCursor = 0;
    while (glossaryCursor < workset.stagedGlossaryCount) {
      const pageResult = await repository.loadTranslationWorksetGlossaryPage({
        processId: workset.processId,
        expectedWorksetRevision: workset.revision,
        fromOrder: glossaryCursor,
        maximumRows: workset.stagedGlossaryCount - glossaryCursor,
        maximumBytes: operationalStructuredPayloadMaximumBytesV1,
      });
      if (pageResult.kind === "conflict") {
        throw controllerErrorV1("translation_workset_changed");
      }
      const page = pageResult.page;
      if (page.rows.length === 0) throw controllerErrorV1("translation_workset_page_mismatch");
      for (const entry of page.rows) {
        if (entry.locked) glossaryRows.push(entry);
      }
      if (page.nextOrder === null) break;
      if (page.nextOrder <= glossaryCursor) {
        throw controllerErrorV1("translation_workset_page_mismatch");
      }
      glossaryCursor = page.nextOrder;
    }
    return { sourceRows, glossaryRows, preceding };
  };

  const refreshProcessProjectionV1 = async (processId: string): Promise<void> => {
    const active = snapshot.activeProcess;
    if (active === null || active.process.processId !== processId) return;
    const reopened = await openProcessAtEpochV1(processId, routeEpoch);
    if (reopened.kind !== "completed") {
      throw controllerErrorV1(reopened.kind === "failed" ? reopened.code : "process_busy");
    }
  };

  const loadOlderTranscriptV1 = async (): Promise<
    TranslationProcessControllerResultV1<boolean>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    const currentWindow = transcriptWindow;
    if (
      snapshot.route !== "process" || active === null || currentWindow === null ||
      currentWindow.processId !== active.process.processId ||
      active.transcript.phase === "loading_older"
    ) return { kind: "completed", value: false };
    const beforeSequence = active.transcript.nextBeforeSequence;
    if (beforeSequence === null) return { kind: "completed", value: false };

    const processId = active.process.processId;
    const epoch = routeEpoch;
    const windowRevision = transcriptWindowRevision;
    publish({
      route: "process",
      activeProcess: {
        ...active,
        transcript: translationTranscriptProjectionV1(currentWindow, "loading_older"),
      },
      durability: { phase: "ready" },
    });

    const currentActiveProcessV1 = (): TranslationActiveProcessProjectionV1 | null => {
      const projected = snapshot.activeProcess;
      return !disposed && routeEpoch === epoch && snapshot.route === "process" &&
          projected?.process.processId === processId && transcriptWindow === currentWindow &&
          transcriptWindowRevision === windowRevision
        ? projected
        : null;
    };
    const restoreReadyV1 = (): void => {
      const projected = currentActiveProcessV1();
      if (projected === null) return;
      publish({
        route: "process",
        activeProcess: {
          ...projected,
          transcript: translationTranscriptProjectionV1(currentWindow, "ready"),
        },
        durability: { phase: "ready" },
      });
    };

    try {
      const page = await repository.loadTranscriptPage({
        processId,
        beforeSequence,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      const projected = currentActiveProcessV1();
      if (projected === null) return { kind: "failed", code: "superseded" };
      if (page === null) {
        restoreReadyV1();
        return { kind: "failed", code: "process_transcript_not_found" };
      }
      if (page.processId !== processId || page.beforeSequence !== beforeSequence) {
        restoreReadyV1();
        return { kind: "failed", code: "process_transcript_page_mismatch" };
      }
      const nextWindow = prependTranscriptWindowPageV1({
        current: currentWindow,
        page,
        maximumBytes: budgets.transcriptWindowMaximumBytes,
      });
      transcriptWindow = nextWindow;
      transcriptWindowRevision += 1;
      publish({
        route: "process",
        activeProcess: {
          ...projected,
          transcript: translationTranscriptProjectionV1(nextWindow, "ready"),
        },
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: page.entries.length > 0 };
    } catch (error) {
      if (currentActiveProcessV1() === null) return { kind: "failed", code: "superseded" };
      restoreReadyV1();
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const reloadLatestTranscriptV1 = async (): Promise<
    TranslationProcessControllerResultV1<boolean>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    const currentWindow = transcriptWindow;
    if (
      snapshot.route !== "process" || active === null || currentWindow === null ||
      currentWindow.processId !== active.process.processId || !active.transcript.newerOmitted
    ) return { kind: "completed", value: false };

    const processId = active.process.processId;
    const epoch = routeEpoch;
    const windowRevision = transcriptWindowRevision;
    try {
      const page = await repository.loadTranscriptPage({
        processId,
        beforeSequence: null,
        maximumBytes: budgets.transcriptPageMaximumBytes,
      });
      const projected = snapshot.activeProcess;
      if (
        disposed || routeEpoch !== epoch || snapshot.route !== "process" ||
        projected?.process.processId !== processId || transcriptWindow !== currentWindow ||
        transcriptWindowRevision !== windowRevision
      ) return { kind: "failed", code: "superseded" };
      if (page === null) {
        return { kind: "failed", code: "process_transcript_not_found" };
      }
      if (page.processId !== processId || page.beforeSequence !== null) {
        return { kind: "failed", code: "process_transcript_page_mismatch" };
      }
      const nextWindow = createTranscriptWindowV1(page);
      transcriptWindow = nextWindow;
      transcriptWindowRevision += 1;
      publish({
        route: "process",
        activeProcess: {
          ...projected,
          transcript: translationTranscriptProjectionV1(nextWindow, "ready"),
        },
        durability: { phase: "ready" },
      });
      return { kind: "completed", value: true };
    } catch (error) {
      if (disposed || routeEpoch !== epoch) return { kind: "failed", code: "superseded" };
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const acquireTranslationAgentRunV1 = async (acquisition: {
    readonly active: TranslationActiveProcessProjectionV1;
    readonly workset: TranslationWorksetHeadV1;
    readonly process: ProcessHeadV1;
    readonly instruction: string;
    readonly request: TranslationBatchRequestV1;
    readonly requestedOutputTokens: number;
    readonly expectedPendingCandidateId: string | null;
    readonly reuseTrigger: { readonly entryId: string; readonly sequence: number } | null;
  }): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>> => {
    const durableWorkset = await repository.loadTranslationWorksetHead(
      acquisition.process.processId,
    );
    const durableProcess = await repository.loadProcess(acquisition.process.processId);
    if (
      durableWorkset === null || durableProcess === null ||
      durableWorkset.revision !== acquisition.workset.revision ||
      durableWorkset.acceptedUnitCount !== acquisition.workset.acceptedUnitCount ||
      durableWorkset.pendingCandidateId !== acquisition.expectedPendingCandidateId ||
      durableProcess.activeAttempt !== null || durableProcess.checkpoint === null ||
      durableProcess.revision !== acquisition.process.revision
    ) return { kind: "completed", value: { kind: "unavailable" } };

    const attemptId = createId("translation-agent-run");
    const generation = (durableProcess.lastTerminalAttempt?.generation ?? 0) + 1;
    const observedAt = Math.max(now(), durableProcess.updatedAt);
    const triggerSequence = durableProcess.transcriptFrontier + 1;
    const triggerEntryId = `${attemptId}.request`;
    const trigger = acquisition.reuseTrigger === null
      ? {
        kind: "new_entry" as const,
        entry: {
          schemaVersion: 1 as const,
          processId: durableProcess.processId,
          sequence: triggerSequence,
          entryId: triggerEntryId,
          role: "user" as const,
          state: "committed" as const,
          parts: [{
            kind: "text_markdown" as const,
            partId: `${triggerEntryId}.text`,
            markdown: acquisition.instruction,
          }],
        },
      }
      : {
        kind: "existing_entry" as const,
        entryId: acquisition.reuseTrigger.entryId,
        sequence: acquisition.reuseTrigger.sequence,
      };
    const startingCheckpoint: ProcessCheckpointV1 = {
      checkpointId: trigger.kind === "new_entry"
        ? `${attemptId}.start`
        : durableProcess.checkpoint.checkpointId,
      throughSequence: trigger.kind === "new_entry"
        ? trigger.entry.sequence
        : durableProcess.transcriptFrontier,
      workspaceId: durableProcess.checkpoint.workspaceId,
      workspaceCheckpointId: durableProcess.checkpoint.workspaceCheckpointId,
      workspaceGeneration: durableProcess.checkpoint.workspaceGeneration,
    };
    const acquireInput = {
      expectedWorksetRevision: acquisition.workset.revision,
      expectedFirstPendingOrder: acquisition.workset.acceptedUnitCount,
      expectedPendingCandidateId: acquisition.expectedPendingCandidateId,
      execution: {
        ownerInstanceId,
        observedAt,
        expiresAt: observedAt + processExecutionLeaseDurationMilliseconds,
        attempt: {
          processId: durableProcess.processId,
          expectedProcessRevision: durableProcess.revision,
          expectedTranscriptFrontier: durableProcess.transcriptFrontier,
          commitId: `${attemptId}.acquire`,
          attemptId,
          generation,
          trigger,
          startingCheckpoint,
          updatedAt: observedAt,
        },
      },
    } as const;
    const expectation = {
      operation: "batch_execution_acquire" as const,
      input: acquireInput,
    };
    let lease: ProcessExecutionLeaseV1 | null = null;
    try {
      const acquired = await repository.acquireTranslationBatchExecution(acquireInput);
      if (acquired.kind === "conflict") {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      lease = acquired.lease;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryTranslationProcessOperation(expectation);
      if (queried.kind === "mismatch") throw controllerErrorV1("operation_receipt_mismatch");
      if (queried.kind === "absent") throw error;
      lease = queried.receipt.lease;
    }
    const currentLease = await repository.loadProcessExecutionLease(durableProcess.processId);
    if (
      lease === null || currentLease === null || !leaseMatchesV1(lease, currentLease) ||
      currentLease.ownerInstanceId !== ownerInstanceId ||
      currentLease.attemptId !== attemptId || currentLease.generation !== generation
    ) return { kind: "completed", value: { kind: "unavailable" } };
    ownedAgentLease = currentLease;
    await refreshProcessProjectionV1(durableProcess.processId);
    return {
      kind: "completed",
      value: {
        kind: "prepared",
        run: {
          kind: "batch",
          agentRunId: attemptId,
          programPackage: acquisition.active.process.programPackage,
          processId: durableProcess.processId,
          processAttemptGeneration: generation,
          workspaceCheckpointId: startingCheckpoint.workspaceCheckpointId,
          workspaceGeneration: startingCheckpoint.workspaceGeneration,
          programId: durableProcess.programPackage.programId,
          expectedWorksetRevision: acquisition.workset.revision,
          replacesCandidateId: acquisition.expectedPendingCandidateId,
          requestedOutputTokens: acquisition.requestedOutputTokens,
          instruction: acquisition.instruction,
          batch: acquisition.request,
        },
      },
    };
  };

  const acquireTranslationFollowUpRunV1 = async (acquisition: {
    readonly active: TranslationActiveProcessProjectionV1;
    readonly workset: TranslationWorksetHeadV1;
    readonly process: ProcessHeadV1;
    readonly instruction: string;
    readonly maximumRequestBytes: number;
    readonly requestedOutputTokens: number;
    readonly reuseTrigger: { readonly entryId: string; readonly sequence: number } | null;
  }): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>> => {
    const durableWorkset = await repository.loadTranslationWorksetHead(
      acquisition.process.processId,
    );
    const durableProcess = await repository.loadProcess(acquisition.process.processId);
    if (
      durableWorkset === null || durableProcess === null || durableWorkset.phase !== "ready" ||
      durableWorkset.revision !== acquisition.workset.revision ||
      durableWorkset.pendingCandidateId !== null ||
      durableWorkset.acceptedUnitCount !== durableWorkset.stagedUnitCount ||
      durableWorkset.stagedUnitCount !== durableWorkset.expectedUnitCount ||
      durableProcess.activeAttempt !== null || durableProcess.checkpoint === null ||
      durableProcess.revision !== acquisition.process.revision
    ) return { kind: "completed", value: { kind: "unavailable" } };
    const newestTranscriptPage = await repository.loadTranscriptPage({
      processId: durableProcess.processId,
      beforeSequence: null,
      maximumBytes: Math.min(
        budgets.transcriptWindowMaximumBytes,
        acquisition.maximumRequestBytes,
      ),
    });
    if (
      newestTranscriptPage === null ||
      newestTranscriptPage.processId !== durableProcess.processId ||
      newestTranscriptPage.beforeSequence !== null
    ) return { kind: "completed", value: { kind: "unavailable" } };
    const followUpContext = createTranslationFollowUpContextV1({
      workset: durableWorkset,
      transcriptEntries: newestTranscriptPage.entries,
      instruction: acquisition.instruction,
      maximumRequestBytes: acquisition.maximumRequestBytes,
      excludeSequence: acquisition.reuseTrigger?.sequence ?? null,
    });
    if (followUpContext.kind === "exceeds") {
      return {
        kind: "completed",
        value: {
          kind: "instruction_exceeds_budget",
          instructionByteLength: followUpContext.byteLength,
          maximumRequestBytes: acquisition.maximumRequestBytes,
        },
      };
    }

    const attemptId = createId("translation-follow-up-run");
    const generation = (durableProcess.lastTerminalAttempt?.generation ?? 0) + 1;
    const observedAt = Math.max(now(), durableProcess.updatedAt);
    const triggerSequence = durableProcess.transcriptFrontier + 1;
    const triggerEntryId = `${attemptId}.request`;
    const trigger = acquisition.reuseTrigger === null
      ? {
        kind: "new_entry" as const,
        entry: {
          schemaVersion: 1 as const,
          processId: durableProcess.processId,
          sequence: triggerSequence,
          entryId: triggerEntryId,
          role: "user" as const,
          state: "committed" as const,
          parts: [{
            kind: "text_markdown" as const,
            partId: `${triggerEntryId}.text`,
            markdown: acquisition.instruction,
          }],
        },
      }
      : {
        kind: "existing_entry" as const,
        entryId: acquisition.reuseTrigger.entryId,
        sequence: acquisition.reuseTrigger.sequence,
      };
    const startingCheckpoint: ProcessCheckpointV1 = {
      checkpointId: trigger.kind === "new_entry"
        ? `${attemptId}.start`
        : durableProcess.checkpoint.checkpointId,
      throughSequence: trigger.kind === "new_entry"
        ? trigger.entry.sequence
        : durableProcess.transcriptFrontier,
      workspaceId: durableProcess.checkpoint.workspaceId,
      workspaceCheckpointId: durableProcess.checkpoint.workspaceCheckpointId,
      workspaceGeneration: durableProcess.checkpoint.workspaceGeneration,
    };
    const acquireInput: ProcessExecutionAcquireInputV1 = {
      ownerInstanceId,
      observedAt,
      expiresAt: observedAt + processExecutionLeaseDurationMilliseconds,
      attempt: {
        processId: durableProcess.processId,
        expectedProcessRevision: durableProcess.revision,
        expectedTranscriptFrontier: durableProcess.transcriptFrontier,
        commitId: `${attemptId}.acquire`,
        attemptId,
        generation,
        trigger,
        startingCheckpoint,
        updatedAt: observedAt,
      },
    };
    let lease: ProcessExecutionLeaseV1 | null = null;
    try {
      const acquired = await repository.acquireProcessExecution(acquireInput);
      if (acquired.kind === "conflict") {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      lease = acquired.lease;
    } catch (error) {
      if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
        throw error;
      }
      const queried = await repository.queryProcessOperation({
        operation: "execution_acquire",
        input: acquireInput,
      });
      if (queried.kind === "mismatch") throw controllerErrorV1("operation_receipt_mismatch");
      if (queried.kind === "absent") throw error;
      lease = queried.receipt.lease;
    }
    const [currentLease, currentWorkset] = await Promise.all([
      repository.loadProcessExecutionLease(durableProcess.processId),
      repository.loadTranslationWorksetHead(durableProcess.processId),
    ]);
    if (
      lease === null || currentLease === null || !leaseMatchesV1(lease, currentLease) ||
      currentLease.ownerInstanceId !== ownerInstanceId ||
      currentLease.attemptId !== attemptId || currentLease.generation !== generation ||
      currentWorkset === null || currentWorkset.phase !== "ready" ||
      currentWorkset.revision !== durableWorkset.revision ||
      currentWorkset.pendingCandidateId !== null ||
      currentWorkset.acceptedUnitCount !== currentWorkset.stagedUnitCount ||
      currentWorkset.stagedUnitCount !== currentWorkset.expectedUnitCount
    ) {
      if (currentLease !== null && currentLease.ownerInstanceId === ownerInstanceId) {
        await repository.releaseProcessExecutionLease({
          lease: currentLease,
          observedAt: now(),
        }).catch(() => undefined);
      }
      return { kind: "completed", value: { kind: "unavailable" } };
    }
    ownedAgentLease = currentLease;
    await refreshProcessProjectionV1(durableProcess.processId);
    return {
      kind: "completed",
      value: {
        kind: "prepared",
        run: {
          kind: "follow_up",
          agentRunId: attemptId,
          programPackage: acquisition.active.process.programPackage,
          processId: durableProcess.processId,
          processAttemptGeneration: generation,
          workspaceCheckpointId: startingCheckpoint.workspaceCheckpointId,
          workspaceGeneration: startingCheckpoint.workspaceGeneration,
          programId: durableProcess.programPackage.programId,
          expectedWorksetRevision: currentWorkset.revision,
          requestedOutputTokens: acquisition.requestedOutputTokens,
          instruction: acquisition.instruction,
          context: followUpContext.context,
        },
      },
    };
  };

  const loadRetryTriggerV1 = async (
    process: ProcessHeadV1,
  ): Promise<
    {
      readonly instruction: string;
      readonly trigger: { readonly entryId: string; readonly sequence: number };
    } | null
  > => {
    const terminal = process.status === "interrupted_retryable" &&
        process.lastTerminalAttempt?.outcome === "interrupted"
      ? process.lastTerminalAttempt
      : null;
    if (terminal === null) return null;
    const instruction = await loadTranscriptInstructionV1({
      processId: process.processId,
      entryId: terminal.triggerEntryId,
      sequence: terminal.triggerSequence,
    });
    if (instruction === null) return null;
    return {
      instruction,
      trigger: { entryId: terminal.triggerEntryId, sequence: terminal.triggerSequence },
    };
  };

  const prepareAgentBatchV1 = async (
    budget: TranslationBatchBudgetV1,
    rawInstruction: string,
  ): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (
      !Number.isSafeInteger(budget.maximumRequestBytes) || budget.maximumRequestBytes <= 0 ||
      !Number.isSafeInteger(budget.maximumOutputTokens) || budget.maximumOutputTokens <= 0
    ) {
      return { kind: "failed", code: "invalid_translation_request_budget" };
    }
    // The instruction is one durable Conversation entry, not a second
    // guided-mode command channel. The same text reaches the Agent prompt.
    const submittedInstruction = rawInstruction.trim();
    if (submittedInstruction.length === 0) {
      return { kind: "completed", value: { kind: "rejected", reason: "empty_message" } };
    }
    if (submittedInstruction.length > translationAgentInstructionMaximumCharactersV1) {
      return {
        kind: "completed",
        value: { kind: "rejected", reason: "message_too_long" },
      };
    }
    const active = snapshot.activeProcess;
    const workset = active?.workset ?? null;
    if (
      snapshot.route !== "process" || active === null || workset === null ||
      workset.phase !== "ready" || workset.processId !== active.process.processId
    ) return { kind: "completed", value: { kind: "unavailable" } };
    if (workset.pendingCandidateId !== null || active.pendingCandidate !== null) {
      return { kind: "completed", value: { kind: "pending_review" } };
    }
    const process = await repository.loadProcess(active.process.processId);
    if (
      process === null || process.activeAttempt !== null || process.checkpoint === null ||
      (process.status !== "active" && process.status !== "interrupted_retryable")
    ) return { kind: "completed", value: { kind: "unavailable" } };

    try {
      const retryTrigger = await loadRetryTriggerV1(process);
      if (process.status === "interrupted_retryable" && retryTrigger === null) {
        return { kind: "completed", value: { kind: "unavailable" } };
      }
      const instruction = retryTrigger?.instruction ?? submittedInstruction;
      if (
        workset.acceptedUnitCount >= workset.stagedUnitCount &&
        workset.stagedUnitCount === workset.expectedUnitCount
      ) {
        return await acquireTranslationFollowUpRunV1({
          active,
          workset,
          process,
          instruction,
          maximumRequestBytes: budget.maximumRequestBytes,
          requestedOutputTokens: budget.maximumOutputTokens,
          reuseTrigger: retryTrigger?.trigger ?? null,
        });
      }
      const instructionByteLength = translationAgentInstructionPromptOverheadBytesV1(instruction);
      if (instructionByteLength >= budget.maximumRequestBytes) {
        return {
          kind: "completed",
          value: {
            kind: "instruction_exceeds_budget",
            instructionByteLength,
            maximumRequestBytes: budget.maximumRequestBytes,
          },
        };
      }
      const planningBudget: TranslationBatchBudgetV1 = {
        ...budget,
        maximumRequestBytes: budget.maximumRequestBytes - instructionByteLength,
      };
      const planningRows = await loadBatchPlanningRowsV1(workset, planningBudget);
      const planned = planTranslationBatchRequestV1({
        sourceLocale: workset.sourceLocale,
        targetLocale: workset.targetLocale,
        documentPurpose: workset.documentPurpose,
        style: workset.style,
        sourceRows: planningRows.sourceRows,
        glossaryRows: planningRows.glossaryRows,
        confirmedMeaningFacts: [],
        neighboringUnits: { preceding: planningRows.preceding, following: null },
        budget: planningBudget,
      });
      if (planned.kind === "empty") {
        return await acquireTranslationFollowUpRunV1({
          active,
          workset,
          process,
          instruction,
          maximumRequestBytes: budget.maximumRequestBytes,
          requestedOutputTokens: budget.maximumOutputTokens,
          reuseTrigger: retryTrigger?.trigger ?? null,
        });
      }
      if (planned.kind === "unit_exceeds_budget") {
        return {
          kind: "completed",
          value: {
            ...planned,
            requestByteLength: planned.requestByteLength + instructionByteLength,
            maximumRequestBytes: budget.maximumRequestBytes,
          },
        };
      }

      return await acquireTranslationAgentRunV1({
        active,
        workset,
        process,
        instruction,
        request: planned.request,
        requestedOutputTokens: planned.requestedOutputTokens,
        expectedPendingCandidateId: null,
        reuseTrigger: retryTrigger?.trigger ?? null,
      });
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const preparePendingCandidateRetranslationV1 = async (
    budget: TranslationBatchBudgetV1,
    reviewInput: TranslationPendingCandidateRetranslationInputV1,
  ): Promise<TranslationProcessControllerResultV1<TranslationBatchPrepareResultV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (
      !Number.isSafeInteger(budget.maximumRequestBytes) || budget.maximumRequestBytes <= 0 ||
      !Number.isSafeInteger(budget.maximumOutputTokens) || budget.maximumOutputTokens <= 0
    ) return { kind: "failed", code: "invalid_translation_request_budget" };
    const active = snapshot.activeProcess;
    const workset = active?.workset ?? null;
    const candidate = active?.pendingCandidate ?? null;
    if (
      snapshot.route !== "process" || active === null || workset === null || candidate === null ||
      workset.phase !== "ready" || workset.processId !== active.process.processId ||
      workset.pendingCandidateId !== candidate.candidateId
    ) return { kind: "completed", value: { kind: "unavailable" } };
    if (
      reviewInput.expectedWorksetRevision !== workset.revision ||
      reviewInput.candidateId !== candidate.candidateId ||
      reviewInput.targets.length !== candidate.targets.length ||
      reviewInput.targets.some((target, index) =>
        target.unitId !== candidate.targets[index]?.unitId || target.target.trim().length === 0
      )
    ) return { kind: "completed", value: { kind: "unavailable" } };
    const process = await repository.loadProcess(active.process.processId);
    if (
      process === null || process.activeAttempt !== null || process.checkpoint === null ||
      (process.status !== "active" && process.status !== "interrupted_retryable")
    ) return { kind: "completed", value: { kind: "unavailable" } };

    try {
      const retryTrigger = await loadRetryTriggerV1(process);
      let instruction: string;
      if (process.status === "interrupted_retryable") {
        if (retryTrigger === null) {
          return { kind: "completed", value: { kind: "unavailable" } };
        }
        instruction = retryTrigger.instruction;
      } else {
        if (reviewInput.instruction !== null) {
          if (reviewInput.instruction.trim().length === 0) {
            return { kind: "completed", value: { kind: "rejected", reason: "empty_message" } };
          }
          if (
            reviewInput.instruction !== reviewInput.instruction.trim() ||
            reviewInput.instruction.length > translationAgentInstructionMaximumCharactersV1
          ) {
            return {
              kind: "completed",
              value: { kind: "rejected", reason: "message_too_long" },
            };
          }
        }
        const admittedDraft = admitTranslationBatchCandidateV1({
          targets: reviewInput.targets,
          ambiguities: candidate.ambiguities,
        }, candidate.request);
        if (admittedDraft.kind !== "admitted") {
          return { kind: "completed", value: { kind: "rejected", reason: "candidate_invalid" } };
        }
        instruction = createTranslationCandidateRetranslationInstructionV1({
          instruction: reviewInput.instruction,
          targets: admittedDraft.candidate.targets,
          findings: evaluateTranslationMechanicalQaV1(
            candidate.request,
            admittedDraft.candidate,
          ),
        });
        if (
          instruction.length > translationAgentInstructionMaximumCharactersV1 ||
          instruction !== instruction.trim()
        ) {
          return { kind: "completed", value: { kind: "rejected", reason: "message_too_long" } };
        }
      }
      const requestByteLength = translationAgentInstructionPromptOverheadBytesV1(instruction) +
        translationBatchRequestUtf8ByteLengthV1(candidate.request);
      const requestedOutputTokens = translationBatchRequestedOutputTokensV1(
        candidate.request,
        budget.outputEnvelope,
      );
      if (
        requestByteLength > budget.maximumRequestBytes ||
        requestedOutputTokens > budget.maximumOutputTokens
      ) {
        return {
          kind: "completed",
          value: {
            kind: "batch_exceeds_budget",
            requestByteLength,
            maximumRequestBytes: budget.maximumRequestBytes,
            requestedOutputTokens,
            maximumOutputTokens: budget.maximumOutputTokens,
          },
        };
      }
      return await acquireTranslationAgentRunV1({
        active,
        workset,
        process,
        instruction,
        request: candidate.request,
        requestedOutputTokens,
        expectedPendingCandidateId: candidate.candidateId,
        reuseTrigger: retryTrigger?.trigger ?? null,
      });
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const renewAgentRunLeaseV1 = async (
    run: TranslationAgentRunRequestV1,
  ): Promise<TranslationProcessControllerResultV1<"renewed" | "lost" | "idle">> =>
    await serializeLeaseRenewalV1(async () => {
      if (disposed) return { kind: "failed", code: "disposed" };
      if (terminalizingAgentRunId === run.agentRunId) {
        return { kind: "completed", value: "idle" };
      }
      const lease = ownedAgentLease;
      if (
        lease === null || lease.processId !== run.processId ||
        lease.attemptId !== run.agentRunId ||
        lease.generation !== run.processAttemptGeneration
      ) return { kind: "completed", value: "lost" };
      const observedAt = now();
      if (observedAt >= lease.expiresAt) {
        ownedAgentLease = null;
        return { kind: "completed", value: "lost" };
      }
      const expiresAt = Math.max(
        observedAt + processExecutionLeaseDurationMilliseconds,
        lease.expiresAt + 1,
      );
      try {
        const renewed = await repository.renewProcessExecutionLease({
          lease,
          observedAt,
          expiresAt,
        });
        if (renewed.kind === "conflict") {
          if (terminalizingAgentRunId === run.agentRunId) {
            return { kind: "completed", value: "idle" };
          }
          ownedAgentLease = null;
          return { kind: "completed", value: "lost" };
        }
        ownedAgentLease = renewed.lease;
        return terminalizingAgentRunId === run.agentRunId
          ? { kind: "completed", value: "idle" }
          : { kind: "completed", value: "renewed" };
      } catch (error) {
        if (terminalizingAgentRunId === run.agentRunId) {
          return { kind: "completed", value: "idle" };
        }
        if (isProgramDataRepositoryFailureV1(error) && error.code === "outcome_unknown") {
          const current = await repository.loadProcessExecutionLease(run.processId).catch(() =>
            null
          );
          if (
            current !== null && leaseMatchesV1(current, lease) && current.expiresAt >= expiresAt
          ) {
            ownedAgentLease = current;
            return { kind: "completed", value: "renewed" };
          }
        }
        ownedAgentLease = null;
        return { kind: "failed", code: failureCodeV1(error) };
      }
    });

  const renewTerminalLeaseV1 = async (
    run: TranslationAgentRunRequestV1,
  ): Promise<ProcessExecutionLeaseV1 | null> =>
    await serializeLeaseRenewalV1(async () => {
      const ownedLease = ownedAgentLease;
      if (
        ownedLease === null || ownedLease.ownerInstanceId !== ownerInstanceId ||
        ownedLease.processId !== run.processId || ownedLease.attemptId !== run.agentRunId ||
        ownedLease.generation !== run.processAttemptGeneration
      ) return null;
      const current = await repository.loadProcessExecutionLease(run.processId);
      if (
        current === null || !leaseMatchesV1(current, ownedLease) ||
        current.ownerInstanceId !== ownerInstanceId
      ) return null;
      const observedAt = now();
      if (observedAt >= current.expiresAt) return null;
      const expiresAt = Math.max(
        observedAt + processExecutionLeaseDurationMilliseconds,
        current.expiresAt + 1,
      );
      try {
        const renewed = await repository.renewProcessExecutionLease({
          lease: current,
          observedAt,
          expiresAt,
        });
        if (renewed.kind === "conflict") return null;
        ownedAgentLease = renewed.lease;
        return renewed.lease;
      } catch (error) {
        if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
          throw error;
        }
        const reconciled = await repository.loadProcessExecutionLease(run.processId);
        if (
          reconciled === null || !leaseMatchesV1(reconciled, current) ||
          reconciled.expiresAt < expiresAt
        ) throw error;
        ownedAgentLease = reconciled;
        return reconciled;
      }
    });

  const recordAgentRunTerminalV1 = async (
    terminal: TranslationAgentTerminalRunV1,
  ): Promise<
    TranslationProcessControllerResultV1<TranslationAgentTerminalPersistenceResultV1>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (terminalizingAgentRunId !== null) return { kind: "busy" };
    terminalizingAgentRunId = terminal.run.agentRunId;
    try {
      const [process, workset] = await Promise.all([
        repository.loadProcess(terminal.run.processId),
        repository.loadTranslationWorksetHead(terminal.run.processId),
      ]);
      const attempt = process?.activeAttempt ?? null;
      const ownedLease = ownedAgentLease;
      if (
        process === null || workset === null || attempt === null || ownedLease === null ||
        !sameProgramPackageV1(process.programPackage, terminal.run.programPackage) ||
        terminal.run.programId !== process.programPackage.programId ||
        terminal.run.expectedWorksetRevision !== workset.revision ||
        (terminal.run.kind === "batch"
          ? terminal.run.replacesCandidateId !== workset.pendingCandidateId
          : workset.pendingCandidateId !== null ||
            workset.acceptedUnitCount !== workset.stagedUnitCount ||
            workset.stagedUnitCount !== workset.expectedUnitCount) ||
        attempt.attemptId !== terminal.run.agentRunId ||
        attempt.generation !== terminal.run.processAttemptGeneration ||
        attempt.startingCheckpoint.workspaceCheckpointId !==
          terminal.run.workspaceCheckpointId ||
        attempt.startingCheckpoint.workspaceGeneration !== terminal.run.workspaceGeneration ||
        !leaseMatchesV1(ownedLease, {
          processId: terminal.run.processId,
          ownerInstanceId: ownedLease.ownerInstanceId,
          attemptId: terminal.run.agentRunId,
          generation: terminal.run.processAttemptGeneration,
          expiresAt: ownedLease.expiresAt,
        })
      ) return { kind: "completed", value: { kind: "stale" } };
      const lease = await renewTerminalLeaseV1(terminal.run);
      if (lease === null) {
        ownedAgentLease = null;
        return { kind: "completed", value: { kind: "stale" } };
      }
      const settledWorkspaceHead = await workspace.captureProcessWorkspaceHead({
        processId: process.processId,
        workspaceId: attempt.startingCheckpoint.workspaceId,
      });
      const observedAt = now();
      if (observedAt >= lease.expiresAt) {
        ownedAgentLease = null;
        return { kind: "completed", value: { kind: "stale" } };
      }
      const sequence = process.transcriptFrontier + 1;
      const entryId = `${terminal.run.agentRunId}.terminal.entry`;
      const outcome = terminal.outcome;
      const completedFollowUp = outcome === "completed" && "assistantReply" in terminal
        ? terminal
        : null;
      const completedBatch = outcome === "completed" && "candidate" in terminal ? terminal : null;
      const markdown = translationTerminalMarkdownV1(terminal);
      if (
        completedFollowUp !== null &&
        (markdown.length === 0 ||
          markdown.length > translationAgentFollowUpReplyMaximumCharactersV1)
      ) return { kind: "completed", value: { kind: "stale" } };
      const terminalInput: ProcessExecutionTerminalInputV1 = {
        lease,
        observedAt,
        transcript: {
          processId: process.processId,
          expectedProcessRevision: process.revision,
          expectedTranscriptFrontier: process.transcriptFrontier,
          commitId: `${terminal.run.agentRunId}.terminal`,
          attemptBinding: { attemptId: attempt.attemptId, generation: attempt.generation },
          entries: [{
            schemaVersion: 1,
            processId: process.processId,
            sequence,
            entryId,
            role: outcome === "completed" ? "assistant" : "system",
            state: "committed",
            parts: [{ kind: "text_markdown", partId: `${entryId}.text`, markdown }],
          }],
          checkpoint: {
            checkpointId: `${terminal.run.agentRunId}.terminal-checkpoint`,
            throughSequence: sequence,
            workspaceId: attempt.startingCheckpoint.workspaceId,
            workspaceCheckpointId: settledWorkspaceHead.checkpointId,
            workspaceGeneration: settledWorkspaceHead.generation,
          },
          terminalAttemptReceipt: {
            schemaVersion: 1,
            processId: process.processId,
            attemptId: attempt.attemptId,
            generation: attempt.generation,
            outcome,
            terminalSequence: sequence,
            terminalEntryId: entryId,
            interruptionDisposition: null,
          },
          updatedAt: observedAt,
        },
      };

      let candidateId: string | null = null;
      if (completedBatch !== null) {
        const batchRun = completedBatch.run;
        const publishInput = {
          processId: process.processId,
          operationId: `${terminal.run.agentRunId}.candidate`,
          lease,
          expectedWorksetRevision: terminal.run.expectedWorksetRevision,
          expectedFirstPendingOrder: batchRun.batch.units[0]!.order,
          replacesCandidateId: batchRun.replacesCandidateId,
          request: batchRun.batch,
          candidate: completedBatch.candidate,
          updatedAt: observedAt,
        };
        try {
          const committed = await repository
            .commitTranslationBatchCandidateWithProcessExecutionTerminal({
              workset: publishInput,
              terminal: terminalInput,
            });
          if (committed.kind === "conflict") {
            return { kind: "completed", value: { kind: "stale" } };
          }
          candidateId = committed.candidate.candidateId;
        } catch (error) {
          if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
            throw error;
          }
          const queried = await repository.queryTranslationWorksetOperation({
            operation: "publish_candidate",
            input: publishInput,
          });
          if (queried.kind === "mismatch") {
            throw controllerErrorV1("operation_receipt_mismatch");
          }
          if (queried.kind === "absent" || queried.receipt.candidateId === null) throw error;
          candidateId = queried.receipt.candidateId;
        }
      } else {
        try {
          const committed = await repository.commitProcessExecutionTerminal(terminalInput);
          if (committed.kind === "conflict") {
            return { kind: "completed", value: { kind: "stale" } };
          }
        } catch (error) {
          if (!isProgramDataRepositoryFailureV1(error) || error.code !== "outcome_unknown") {
            throw error;
          }
          const queried = await repository.queryProcessOperation({
            operation: "execution_terminal",
            input: terminalInput,
          });
          if (queried.kind !== "committed") throw error;
        }
      }
      ownedAgentLease = null;
      await refreshProcessProjectionV1(process.processId);
      return { kind: "completed", value: { kind: "persisted", candidateId } };
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    } finally {
      terminalizingAgentRunId = null;
    }
  };

  const reviewPendingCandidateV1 = async (
    decision: "accept" | "reject",
    reviewInput: TranslationPendingCandidateAcceptInputV1 | TranslationPendingCandidateReferenceV1,
  ): Promise<
    TranslationProcessControllerResultV1<TranslationPendingCandidateReviewResultV1>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    const workset = active?.workset ?? null;
    const candidate = active?.pendingCandidate ?? null;
    if (
      snapshot.route !== "process" || active === null || workset === null || candidate === null ||
      workset.phase !== "ready" || workset.pendingCandidateId !== candidate.candidateId
    ) return { kind: "completed", value: { kind: "unavailable" } };
    if (
      reviewInput.expectedWorksetRevision !== workset.revision ||
      reviewInput.candidateId !== candidate.candidateId
    ) {
      return { kind: "completed", value: { kind: "stale", currentWorkset: workset } };
    }
    const updatedAt = Math.max(now(), workset.updatedAt, active.process.updatedAt);
    try {
      const expectation = decision === "accept"
        ? {
          operation: "accept_candidate" as const,
          input: {
            processId: active.process.processId,
            operationId: createId("translation-candidate-accept"),
            expectedWorksetRevision: reviewInput.expectedWorksetRevision,
            candidateId: reviewInput.candidateId,
            targets: (reviewInput as TranslationPendingCandidateAcceptInputV1).targets,
            updatedAt,
          },
        }
        : {
          operation: "reject_candidate" as const,
          input: {
            processId: active.process.processId,
            operationId: createId("translation-candidate-reject"),
            expectedWorksetRevision: reviewInput.expectedWorksetRevision,
            candidateId: reviewInput.candidateId,
            updatedAt,
          },
        };
      const reviewed = await mutateWorksetV1(
        repository,
        expectation,
        () =>
          decision === "accept"
            ? repository.acceptTranslationBatchCandidate(
              expectation.input as TranslationBatchCandidateAcceptInputV1,
            )
            : repository.rejectTranslationBatchCandidate(expectation.input),
      );
      if (reviewed.kind === "conflict") {
        return {
          kind: "completed",
          value: { kind: "stale", currentWorkset: reviewed.current },
        };
      }
      await refreshProcessProjectionV1(active.process.processId);
      return {
        kind: "completed",
        value: { kind: decision === "accept" ? "accepted" : "rejected", workset: reviewed.head },
      };
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const updateSettingsOverrideV1 = async (
    json: string | null,
  ): Promise<TranslationProcessControllerResultV1<TranslationProcessSettingsUpdateV1>> => {
    if (disposed) return { kind: "failed", code: "disposed" };
    const active = snapshot.activeProcess;
    if (snapshot.route !== "process" || active === null) {
      return { kind: "failed", code: "translation_process_unavailable" };
    }
    const resolved = resolveProcessSettingsV1(json);
    if (json !== null && resolved.admittedProcessOverrideJson === null) {
      return { kind: "completed", value: { kind: "invalid", settings: resolved } };
    }
    try {
      const current = await repository.loadProcessSettingsOverride(active.process.processId);
      if (current === null) return { kind: "failed", code: "process_settings_unavailable" };
      const mutation = await repository.setProcessSettingsOverride({
        processId: active.process.processId,
        expectedRevision: current.revision,
        admittedOverrideJson: json === null ? null : resolved.admittedProcessOverrideJson,
        updatedAt: Math.max(now(), current.updatedAt + 1),
      });
      if (mutation.kind === "conflict") {
        return { kind: "completed", value: { kind: "stale" } };
      }
      const settings = resolveProcessSettingsV1(mutation.settings.overrideJson);
      if (
        !disposed && snapshot.route === "process" && snapshot.activeProcess !== null &&
        snapshot.activeProcess.process.processId === active.process.processId
      ) {
        publish({
          route: "process",
          activeProcess: {
            ...snapshot.activeProcess,
            programPackage: programPackageProjectionV1(settings),
          },
          durability: { phase: "ready" },
        });
      }
      return { kind: "completed", value: { kind: "saved", settings } };
    } catch (error) {
      return { kind: "failed", code: failureCodeV1(error) };
    }
  };

  const createProcessRouteV1 = async (): Promise<
    TranslationProcessControllerResultV1<boolean>
  > => {
    if (disposed) return { kind: "failed", code: "disposed" };
    if (snapshot.durability.phase === "saving") return { kind: "busy" };
    return await createProcessV1(beginRouteLoadV1());
  };

  const initializeV1 = async (): Promise<void> => {
    if (disposed) return;
    const epoch = ++initializeEpoch;
    try {
      await repository.initialize();
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
    createProcess: createProcessRouteV1,
    importSource: importSourceV1,
    loadTranslationRowWindow: loadTranslationRowWindowV1,
    exportCompletedTranslation: exportCompletedTranslationV1,
    prepareAgentBatch: prepareAgentBatchV1,
    preparePendingCandidateRetranslation: preparePendingCandidateRetranslationV1,
    renewAgentRunLease: renewAgentRunLeaseV1,
    recordAgentRunTerminal: recordAgentRunTerminalV1,
    acceptPendingCandidate(reviewInput) {
      return reviewPendingCandidateV1("accept", reviewInput);
    },
    rejectPendingCandidate(reviewInput) {
      return reviewPendingCandidateV1("reject", reviewInput);
    },
    updateSettingsOverride: updateSettingsOverrideV1,
    loadOlderTranscript: loadOlderTranscriptV1,
    reloadLatestTranscript: reloadLatestTranscriptV1,
    openProcess(processId) {
      if (disposed) return Promise.resolve({ kind: "failed", code: "disposed" });
      return openProcessAtEpochV1(processId, beginRouteLoadV1());
    },
    async refreshActiveProcess() {
      if (disposed) return { kind: "failed", code: "disposed" };
      const projected = snapshot.activeProcess?.process ?? null;
      if (snapshot.route !== "process" || projected === null) {
        return { kind: "completed", value: false };
      }
      try {
        const durable = await repository.loadProcess(projected.processId);
        if (durable === null) return { kind: "failed", code: "process_not_found" };
        if (durable.revision !== projected.revision) {
          await refreshProcessProjectionV1(projected.processId);
          return { kind: "completed", value: true };
        }
        if (durable.activeAttempt === null) return { kind: "completed", value: false };
        const lease = await repository.loadProcessExecutionLease(durable.processId);
        if (lease === null || lease.expiresAt > now()) {
          return { kind: "completed", value: false };
        }
        await refreshProcessProjectionV1(projected.processId);
        return { kind: "completed", value: true };
      } catch (error) {
        return { kind: "failed", code: failureCodeV1(error) };
      }
    },
    openHome() {
      if (disposed) return false;
      routeEpoch += 1;
      transcriptWindow = null;
      transcriptWindowRevision += 1;
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
      transcriptWindow = null;
      transcriptWindowRevision += 1;
      retryCommand = null;
      ownedAgentLease = null;
      terminalizingAgentRunId = null;
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
