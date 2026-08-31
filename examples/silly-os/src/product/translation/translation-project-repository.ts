// SPDX-License-Identifier: MIT

import type {
  TranslationCapabilityGradeV1,
  TranslationCapabilityReasonV1,
  TranslationDocumentFormatV1,
  TranslationSourceUnitV1,
} from "./translation-document-codec.ts";
import { operationalStructuredPayloadMaximumBytesV1 } from "../program-process-repository.ts";
import {
  normalizeProcessExecutionLeaseV1,
  type ProcessExecutionLeaseV1,
} from "../process-execution-repository.ts";
import {
  workspacePathMaximumPartsV1,
  workspacePathMaximumUtf8BytesV1,
} from "../../workspace/contracts.ts";

export type TranslationProjectImportPhaseV1 = "staging" | "ready";

export interface TranslationProjectSourceV1 {
  readonly fileName: string;
  readonly mediaType: string;
  readonly workspacePath: string;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface TranslationProjectSourceBindingV1 {
  readonly revision: 1;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly path: string;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface TranslationProjectHeadV1 {
  readonly schemaVersion: 1;
  readonly processId: string;
  readonly projectId: string;
  readonly revision: number;
  readonly phase: TranslationProjectImportPhaseV1;
  readonly title: string;
  readonly document: {
    readonly format: TranslationDocumentFormatV1;
    readonly capabilityGrade: TranslationCapabilityGradeV1;
    readonly capabilityReason: TranslationCapabilityReasonV1;
  };
  readonly source: TranslationProjectSourceV1;
  /**
   * Exact durable Workspace successor that already contains `source`. A
   * staging Project therefore never describes a source write that may or may
   * not have happened. Resume still requires the product to read or reproduce
   * those exact bytes; this binding is identity, not a second byte store.
   */
  readonly sourceBinding: TranslationProjectSourceBindingV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly expectedUnitCount: number;
  readonly stagedUnitCount: number;
  readonly expectedGlossaryCount: number;
  readonly stagedGlossaryCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TranslationProjectUnitV1 extends TranslationSourceUnitV1 {
  readonly processId: string;
}

export interface TranslationProjectGlossaryEntryV1 {
  readonly processId: string;
  readonly entryId: string;
  readonly order: number;
  readonly source: string;
  readonly target: string;
  readonly note: string | null;
  readonly locked: boolean;
}

export interface TranslationProjectBeginImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly projectId: string;
  readonly title: string;
  readonly document: TranslationProjectHeadV1["document"];
  readonly source: TranslationProjectSourceV1;
  readonly sourceBinding: TranslationProjectSourceBindingV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly expectedUnitCount: number;
  readonly expectedGlossaryCount: number;
  readonly updatedAt: number;
}

export interface TranslationProjectAppendImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedProjectRevision: number;
  readonly units: readonly Omit<TranslationProjectUnitV1, "processId">[];
  readonly glossaryEntries: readonly Omit<TranslationProjectGlossaryEntryV1, "processId">[];
  readonly updatedAt: number;
}

export interface TranslationProjectFinalizeImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedProjectRevision: number;
  readonly sourceBinding: TranslationProjectSourceBindingV1;
  readonly updatedAt: number;
}

export type TranslationProjectOperationExpectationV1 =
  | { readonly operation: "begin"; readonly input: TranslationProjectBeginImportInputV1 }
  | { readonly operation: "append"; readonly input: TranslationProjectAppendImportInputV1 }
  | { readonly operation: "finalize"; readonly input: TranslationProjectFinalizeImportInputV1 };

export interface TranslationProjectOperationReceiptV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly operation: TranslationProjectOperationExpectationV1["operation"];
  readonly operationDigest: string;
  readonly projectRevision: number;
}

export type TranslationProjectMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly head: TranslationProjectHeadV1;
    readonly operationReceipt: TranslationProjectOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationProjectHeadV1 | null };

export type TranslationProjectOperationQueryResultV1 =
  | { readonly kind: "absent" }
  | {
    readonly kind: "committed" | "mismatch";
    readonly receipt: TranslationProjectOperationReceiptV1;
  };

export interface TranslationProjectPageRequestV1 {
  readonly processId: string;
  readonly expectedProjectRevision: number;
  readonly fromOrder: number;
  /** Per-request transfer window; this is not a Project capacity limit. */
  readonly maximumRows: number;
  readonly maximumBytes: number;
}

export interface TranslationProjectPageV1<TRow> {
  readonly processId: string;
  readonly projectRevision: number;
  readonly fromOrder: number;
  readonly rows: readonly TRow[];
  readonly byteLength: number;
  readonly nextOrder: number | null;
}

export type TranslationProjectPageResultV1<TRow> =
  | { readonly kind: "page"; readonly page: TranslationProjectPageV1<TRow> }
  | { readonly kind: "conflict"; readonly current: TranslationProjectHeadV1 | null };

export interface TranslationProjectRepositoryV1 {
  beginTranslationProjectImport(
    input: TranslationProjectBeginImportInputV1,
  ): Promise<TranslationProjectMutationResultV1>;
  appendTranslationProjectImport(
    input: TranslationProjectAppendImportInputV1,
  ): Promise<TranslationProjectMutationResultV1>;
  loadTranslationProjectHead(processId: string): Promise<TranslationProjectHeadV1 | null>;
  loadTranslationProjectUnitPage(
    input: TranslationProjectPageRequestV1,
  ): Promise<TranslationProjectPageResultV1<TranslationProjectUnitV1>>;
  loadTranslationProjectGlossaryPage(
    input: TranslationProjectPageRequestV1,
  ): Promise<TranslationProjectPageResultV1<TranslationProjectGlossaryEntryV1>>;
  queryTranslationProjectOperation(
    input: TranslationProjectOperationExpectationV1,
  ): Promise<TranslationProjectOperationQueryResultV1>;
}

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const sha256PatternV1 = /^[a-f0-9]{64}$/u;
const textEncoderV1 = new TextEncoder();

function identifierV1(value: unknown): asserts value is string {
  if (typeof value !== "string" || !identifierPatternV1.test(value)) {
    throw new TypeError("invalid identifier");
  }
}
function textV1(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim() !== value) {
    throw new TypeError("invalid text");
  }
}
function workspacePathV1(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new TypeError("invalid Workspace path");
  const parts = value.split("/");
  if (
    value.length === 0 || value.startsWith("/") || value.endsWith("/") ||
    value.includes("\0") || value.includes("\\") ||
    textEncoderV1.encode(value).byteLength > workspacePathMaximumUtf8BytesV1 ||
    parts.length > workspacePathMaximumPartsV1 ||
    parts.some((part) => part.length === 0 || part === "." || part === "..")
  ) throw new TypeError("invalid Workspace path");
}
function countV1(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError("invalid count");
}
function revisionV1(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError("invalid revision");
  }
}

export function normalizeTranslationProjectBeginImportInputV1(
  value: TranslationProjectBeginImportInputV1,
): TranslationProjectBeginImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  identifierV1(value.projectId);
  textV1(value.title);
  if (
    ![
      "plain_text",
      "markdown",
      "subrip",
      "sillyos_translation_json",
      "pdf_text_reflow",
      "unknown",
    ].includes(
      value.document.format,
    ) ||
    !["round_trip_supported", "generic_text_only", "ambiguous", "unsupported"].includes(
      value.document.capabilityGrade,
    ) ||
    ![
      "known_format",
      "born_digital_pdf_text",
      "format_not_declared",
      "format_hints_conflict",
      "malformed_markdown",
      "malformed_subrip",
      "malformed_sillyos_translation_json",
      "non_text_media_type",
      "protected_token_namespace_collision",
    ].includes(value.document.capabilityReason)
  ) throw new TypeError("invalid Translation document capability");
  textV1(value.source.fileName);
  textV1(value.source.mediaType);
  workspacePathV1(value.source.workspacePath);
  countV1(value.source.byteLength);
  if (!sha256PatternV1.test(value.source.sha256)) throw new TypeError("invalid source digest");
  normalizeTranslationProjectSourceBindingV1(value.sourceBinding, value.source.workspacePath);
  textV1(value.sourceLocale);
  textV1(value.targetLocale);
  textV1(value.documentPurpose);
  textV1(value.style);
  countV1(value.expectedUnitCount);
  countV1(value.expectedGlossaryCount);
  countV1(value.updatedAt);
  if (lease.processId !== value.processId || value.updatedAt >= lease.expiresAt) {
    throw new TypeError("invalid Translation import lease");
  }
  if (translationProjectRowUtf8ByteLengthV1(value) > operationalStructuredPayloadMaximumBytesV1) {
    throw new TypeError("Translation begin exceeds operation budget");
  }
  return structuredClone({ ...value, lease });
}

function normalizeUnitV1(value: Omit<TranslationProjectUnitV1, "processId">) {
  identifierV1(value.unitId);
  countV1(value.order);
  textV1(value.locator);
  if (value.context !== null) textV1(value.context);
  textV1(value.source);
  if (value.durationMilliseconds !== null) countV1(value.durationMilliseconds);
  for (const segment of value.protectedSegments) {
    textV1(segment.token);
    textV1(segment.source);
    if (
      segment.kind !== "placeholder" && segment.kind !== "markup_tag" &&
      segment.kind !== "markdown_code" && segment.kind !== "link" &&
      segment.kind !== "markdown_syntax"
    ) throw new TypeError("invalid protected segment");
  }
  return structuredClone(value);
}
function normalizeGlossaryV1(value: Omit<TranslationProjectGlossaryEntryV1, "processId">) {
  identifierV1(value.entryId);
  countV1(value.order);
  textV1(value.source);
  textV1(value.target);
  if (value.note !== null) textV1(value.note);
  if (typeof value.locked !== "boolean") throw new TypeError("invalid glossary lock");
  return structuredClone(value);
}
export function normalizeTranslationProjectAppendImportInputV1(
  value: TranslationProjectAppendImportInputV1,
): TranslationProjectAppendImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  revisionV1(value.expectedProjectRevision);
  countV1(value.updatedAt);
  if (lease.processId !== value.processId || value.updatedAt >= lease.expiresAt) {
    throw new TypeError("invalid Translation import lease");
  }
  if (
    !Array.isArray(value.units) || !Array.isArray(value.glossaryEntries) ||
    value.units.length + value.glossaryEntries.length === 0
  ) throw new TypeError("empty import append");
  const normalized = {
    ...structuredClone(value),
    lease,
    units: value.units.map(normalizeUnitV1),
    glossaryEntries: value.glossaryEntries.map(normalizeGlossaryV1),
  };
  if (
    translationProjectRowUtf8ByteLengthV1(normalized) > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("Translation append exceeds operation budget");
  return normalized;
}
export function normalizeTranslationProjectFinalizeImportInputV1(
  value: TranslationProjectFinalizeImportInputV1,
): TranslationProjectFinalizeImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  revisionV1(value.expectedProjectRevision);
  normalizeTranslationProjectSourceBindingV1(value.sourceBinding);
  countV1(value.updatedAt);
  if (lease.processId !== value.processId || value.updatedAt >= lease.expiresAt) {
    throw new TypeError("invalid Translation import lease");
  }
  if (translationProjectRowUtf8ByteLengthV1(value) > operationalStructuredPayloadMaximumBytesV1) {
    throw new TypeError("Translation finalize exceeds operation budget");
  }
  return structuredClone({ ...value, lease });
}

export function normalizeTranslationProjectSourceBindingV1(
  value: TranslationProjectSourceBindingV1,
  expectedPath?: string,
): TranslationProjectSourceBindingV1 {
  if (value.revision !== 1 || value.workspaceFormat !== 1) {
    throw new TypeError("invalid source binding revision");
  }
  identifierV1(value.workspaceId);
  identifierV1(value.volumeId);
  workspacePathV1(value.path);
  if (expectedPath !== undefined && value.path !== expectedPath) {
    throw new TypeError("source binding path mismatch");
  }
  identifierV1(value.checkpointId);
  countV1(value.generation);
  return structuredClone(value);
}
export function normalizeTranslationProjectOperationExpectationV1(
  value: TranslationProjectOperationExpectationV1,
): TranslationProjectOperationExpectationV1 {
  if (value.operation === "begin") {
    return {
      operation: "begin",
      input: normalizeTranslationProjectBeginImportInputV1(value.input),
    };
  }
  if (value.operation === "append") {
    return {
      operation: "append",
      input: normalizeTranslationProjectAppendImportInputV1(value.input),
    };
  }
  if (value.operation === "finalize") {
    return {
      operation: "finalize",
      input: normalizeTranslationProjectFinalizeImportInputV1(value.input),
    };
  }
  throw new TypeError("invalid Translation operation");
}
export function normalizeTranslationProjectPageRequestV1(
  value: TranslationProjectPageRequestV1,
): TranslationProjectPageRequestV1 {
  identifierV1(value.processId);
  revisionV1(value.expectedProjectRevision);
  countV1(value.fromOrder);
  if (
    !Number.isSafeInteger(value.maximumRows) || value.maximumRows < 1 ||
    !Number.isSafeInteger(value.maximumBytes) || value.maximumBytes < 1 ||
    value.maximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("invalid page window");
  return structuredClone(value);
}
export function translationProjectRowUtf8ByteLengthV1(value: unknown): number {
  return textEncoderV1.encode(JSON.stringify(value)).byteLength;
}
