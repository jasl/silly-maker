// SPDX-License-Identifier: MIT

import {
  translationTargetPreservesProtectedStructureV1,
  type PreparedTranslationDocumentV1,
  type TranslationCapabilityGradeV1,
  type TranslationCapabilityReasonV1,
  type TranslationDocumentFormatV1,
  type TranslationProtectedKindV1,
  type TranslationProtectedSegmentV1,
  type TranslationSourceUnitV1,
} from "./translation-document-codec.ts";

export interface TranslationProjectDocumentV1 {
  readonly format: TranslationDocumentFormatV1;
  readonly capabilityGrade: TranslationCapabilityGradeV1;
  readonly capabilityReason: TranslationCapabilityReasonV1;
}

export interface TranslationProjectGlossaryEntryV1 {
  readonly source: string;
  readonly target: string;
  readonly note: string | null;
  readonly locked: boolean;
}

export interface TranslationProjectUnitV1 extends TranslationSourceUnitV1 {
  readonly target: string | null;
  readonly committedBatchId: string | null;
}

/**
 * The aggregate domain authority for one Translation Process.
 *
 * This aggregate intentionally has no serialized-byte or unit-count ceiling.
 * `operationalStructuredPayloadMaximumBytesV1` bounds one repository operation;
 * it is not a valid limit for a pageable project containing a real game script.
 * A later repository must store/query the aggregate in pages instead of moving
 * this complete value through one Worker message.
 */
export interface TranslationProjectV1 {
  readonly schemaVersion: 1;
  readonly projectId: string;
  /** Human-facing project title, normally derived from the admitted source file. */
  readonly title: string;
  readonly revision: number;
  readonly document: TranslationProjectDocumentV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly glossary: readonly TranslationProjectGlossaryEntryV1[];
  readonly units: readonly TranslationProjectUnitV1[];
  readonly committedBatchIds: readonly string[];
  /** Materialized and admission-checked so progress projection remains O(1). */
  readonly committedUnitCount: number;
}

export interface CreateTranslationProjectInputV1 {
  readonly projectId: string;
  readonly title: string;
  readonly document: PreparedTranslationDocumentV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly glossary?: readonly TranslationProjectGlossaryEntryV1[];
}

export type TranslationProjectAdmissionRejectionReasonV1 =
  | "invalid_shape"
  | "duplicate_unit"
  | "unit_order_changed"
  | "duplicate_batch"
  | "batch_binding_invalid"
  | "protected_content_changed"
  | "progress_mismatch";

export type TranslationProjectAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly project: TranslationProjectV1 }
  | {
    readonly kind: "rejected";
    readonly reason: TranslationProjectAdmissionRejectionReasonV1;
    readonly path: string;
  };

export interface TranslationProjectProgressV1 {
  readonly phase: "empty" | "pending" | "in_progress" | "complete";
  readonly totalUnitCount: number;
  readonly committedUnitCount: number;
  readonly pendingUnitCount: number;
  readonly committedBatchCount: number;
  /** Null when the source document contains no translatable units. */
  readonly completionRatio: number | null;
}

export interface TranslationProjectRowWindowInputV1 {
  readonly offset: number;
  readonly limit: number;
}

export interface TranslationProjectRowWindowV1 {
  readonly offset: number;
  readonly limit: number;
  readonly totalRowCount: number;
  readonly rows: readonly TranslationProjectUnitV1[];
  readonly nextOffset: number | null;
}

type RecordV1 = Readonly<Record<string, unknown>>;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const protectedTokenPatternV1 = /^⟦SM:\d+⟧$/u;
const protectedTokenOccurrencePatternV1 = /⟦SM:\d+⟧/gu;
const documentFormatsV1 = new Set<TranslationDocumentFormatV1>([
  "plain_text",
  "markdown",
  "subrip",
  "sillyos_translation_json",
  "pdf_text_reflow",
  "unknown",
]);
const capabilityGradesV1 = new Set<TranslationCapabilityGradeV1>([
  "round_trip_supported",
  "generic_text_only",
  "ambiguous",
  "unsupported",
]);
const capabilityReasonsV1 = new Set<TranslationCapabilityReasonV1>([
  "known_format",
  "born_digital_pdf_text",
  "format_not_declared",
  "format_hints_conflict",
  "malformed_markdown",
  "malformed_subrip",
  "malformed_sillyos_translation_json",
  "non_text_media_type",
  "protected_token_namespace_collision",
]);
const protectedKindsV1 = new Set<TranslationProtectedKindV1>([
  "placeholder",
  "markup_tag",
  "markdown_code",
  "link",
  "markdown_syntax",
]);

function exactRecordV1(value: unknown, keys: readonly string[]): RecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== keys.length ||
    !actualKeys.every((key) => typeof key === "string" && keys.includes(key))
  ) return null;
  return value as RecordV1;
}

function rejectedV1(
  reason: TranslationProjectAdmissionRejectionReasonV1,
  path: string,
): TranslationProjectAdmissionResultV1 {
  return { kind: "rejected", reason, path };
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function nonEmptyTextV1(value: unknown, trimmed = false): value is string {
  return typeof value === "string" && value.length > 0 && (!trimmed || value.trim() === value);
}

function nonNegativeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function admitDocumentV1(value: unknown): TranslationProjectDocumentV1 | null {
  const row = exactRecordV1(value, ["format", "capabilityGrade", "capabilityReason"]);
  if (
    row === null || typeof row.format !== "string" ||
    !documentFormatsV1.has(row.format as TranslationDocumentFormatV1) ||
    typeof row.capabilityGrade !== "string" ||
    !capabilityGradesV1.has(row.capabilityGrade as TranslationCapabilityGradeV1) ||
    typeof row.capabilityReason !== "string" ||
    !capabilityReasonsV1.has(row.capabilityReason as TranslationCapabilityReasonV1)
  ) return null;
  const grade = row.capabilityGrade as TranslationCapabilityGradeV1;
  const reason = row.capabilityReason as TranslationCapabilityReasonV1;
  if (
    (grade === "round_trip_supported") !== (reason === "known_format") ||
    grade === "round_trip_supported" && row.format === "unknown"
  ) return null;
  return {
    format: row.format as TranslationDocumentFormatV1,
    capabilityGrade: grade,
    capabilityReason: reason,
  };
}

function admitGlossaryV1(value: unknown): readonly TranslationProjectGlossaryEntryV1[] | null {
  if (!Array.isArray(value)) return null;
  const entries: TranslationProjectGlossaryEntryV1[] = [];
  for (const valueEntry of value) {
    const entry = exactRecordV1(valueEntry, ["source", "target", "note", "locked"]);
    if (
      entry === null || !nonEmptyTextV1(entry.source) || !nonEmptyTextV1(entry.target) ||
      (entry.note !== null && typeof entry.note !== "string") || typeof entry.locked !== "boolean"
    ) return null;
    entries.push({
      source: entry.source,
      target: entry.target,
      note: entry.note as string | null,
      locked: entry.locked,
    });
  }
  return entries;
}

function admitProtectedSegmentsV1(
  value: unknown,
  source: string,
): readonly TranslationProtectedSegmentV1[] | null {
  if (!Array.isArray(value)) return null;
  const sourceTokens = Array.from(
    source.matchAll(protectedTokenOccurrencePatternV1),
    (match) => match[0],
  );
  const segments: TranslationProtectedSegmentV1[] = [];
  const seen = new Set<string>();
  let sourceOffset = 0;
  for (const valueSegment of value) {
    const segment = exactRecordV1(valueSegment, ["token", "kind", "source"]);
    if (
      segment === null || typeof segment.token !== "string" ||
      !protectedTokenPatternV1.test(segment.token) || seen.has(segment.token) ||
      typeof segment.kind !== "string" ||
      !protectedKindsV1.has(segment.kind as TranslationProtectedKindV1) ||
      !nonEmptyTextV1(segment.source)
    ) return null;
    const tokenOffset = source.indexOf(segment.token, sourceOffset);
    if (tokenOffset < 0 || source.indexOf(segment.token, tokenOffset + segment.token.length) >= 0) {
      return null;
    }
    sourceOffset = tokenOffset + segment.token.length;
    seen.add(segment.token);
    segments.push({
      token: segment.token,
      kind: segment.kind as TranslationProtectedKindV1,
      source: segment.source,
    });
  }
  if (
    sourceTokens.length !== segments.length ||
    sourceTokens.some((token, index) => token !== segments[index]?.token)
  ) return null;
  return segments;
}

function admitCommittedBatchIdsV1(
  value: unknown,
):
  | {
    readonly kind: "admitted";
    readonly ids: readonly string[];
    readonly set: ReadonlySet<string>;
  }
  | { readonly kind: "rejected"; readonly path: string } {
  if (!Array.isArray(value)) return { kind: "rejected", path: "/committedBatchIds" };
  const ids: string[] = [];
  const set = new Set<string>();
  for (const [index, id] of value.entries()) {
    if (!identifierV1(id)) {
      return { kind: "rejected", path: `/committedBatchIds/${String(index)}` };
    }
    if (set.has(id)) {
      return { kind: "rejected", path: `/committedBatchIds/${String(index)}` };
    }
    set.add(id);
    ids.push(id);
  }
  return { kind: "admitted", ids, set };
}

function cloneUnitV1(unit: TranslationProjectUnitV1): TranslationProjectUnitV1 {
  return {
    unitId: unit.unitId,
    order: unit.order,
    locator: unit.locator,
    context: unit.context,
    durationMilliseconds: unit.durationMilliseconds,
    source: unit.source,
    protectedSegments: unit.protectedSegments.map((segment) => ({
      token: segment.token,
      kind: segment.kind,
      source: segment.source,
    })),
    target: unit.target,
    committedBatchId: unit.committedBatchId,
  };
}

function admitUnitsV1(
  value: unknown,
  committedBatchIds: ReadonlySet<string>,
):
  | {
    readonly kind: "admitted";
    readonly units: readonly TranslationProjectUnitV1[];
    readonly committedUnitCount: number;
    readonly usedBatchIds: ReadonlySet<string>;
  }
  | {
    readonly kind: "rejected";
    readonly reason: TranslationProjectAdmissionRejectionReasonV1;
    readonly path: string;
  } {
  if (!Array.isArray(value)) {
    return { kind: "rejected", reason: "invalid_shape", path: "/units" };
  }
  const units: TranslationProjectUnitV1[] = [];
  const seenUnitIds = new Set<string>();
  const usedBatchIds = new Set<string>();
  let committedUnitCount = 0;
  for (const [index, valueUnit] of value.entries()) {
    const path = `/units/${String(index)}`;
    const unit = exactRecordV1(valueUnit, [
      "unitId",
      "order",
      "locator",
      "context",
      "durationMilliseconds",
      "source",
      "protectedSegments",
      "target",
      "committedBatchId",
    ]);
    if (unit === null || !identifierV1(unit.unitId)) {
      return { kind: "rejected", reason: "invalid_shape", path };
    }
    if (seenUnitIds.has(unit.unitId)) {
      return { kind: "rejected", reason: "duplicate_unit", path: `${path}/unitId` };
    }
    if (!nonNegativeIntegerV1(unit.order) || unit.order !== index) {
      return { kind: "rejected", reason: "unit_order_changed", path: `${path}/order` };
    }
    if (
      !nonEmptyTextV1(unit.locator, true) ||
      (unit.context !== null && typeof unit.context !== "string") ||
      (unit.durationMilliseconds !== null && !positiveIntegerV1(unit.durationMilliseconds)) ||
      !nonEmptyTextV1(unit.source)
    ) return { kind: "rejected", reason: "invalid_shape", path };
    const protectedSegments = admitProtectedSegmentsV1(unit.protectedSegments, unit.source);
    if (protectedSegments === null) {
      return { kind: "rejected", reason: "invalid_shape", path: `${path}/protectedSegments` };
    }
    const target = unit.target;
    const committedBatchId = unit.committedBatchId;
    if (
      target !== null && (typeof target !== "string" || target.trim().length === 0) ||
      committedBatchId !== null && !identifierV1(committedBatchId) ||
      (target === null) !== (committedBatchId === null)
    ) return { kind: "rejected", reason: "batch_binding_invalid", path };
    if (committedBatchId !== null && !committedBatchIds.has(committedBatchId)) {
      return {
        kind: "rejected",
        reason: "batch_binding_invalid",
        path: `${path}/committedBatchId`,
      };
    }
    const cloned: TranslationProjectUnitV1 = {
      unitId: unit.unitId,
      order: unit.order,
      locator: unit.locator,
      context: unit.context as string | null,
      durationMilliseconds: unit.durationMilliseconds as number | null,
      source: unit.source,
      protectedSegments,
      target: target as string | null,
      committedBatchId: committedBatchId as string | null,
    };
    if (cloned.target !== null) {
      if (!translationTargetPreservesProtectedStructureV1(cloned, cloned.target)) {
        return { kind: "rejected", reason: "protected_content_changed", path: `${path}/target` };
      }
      committedUnitCount += 1;
      usedBatchIds.add(cloned.committedBatchId!);
    }
    seenUnitIds.add(cloned.unitId);
    units.push(cloned);
  }
  return { kind: "admitted", units, committedUnitCount, usedBatchIds };
}

/** Admits and deeply clones one complete Translation Project aggregate. */
export function admitTranslationProjectV1(value: unknown): TranslationProjectAdmissionResultV1 {
  const row = exactRecordV1(value, [
    "schemaVersion",
    "projectId",
    "title",
    "revision",
    "document",
    "sourceLocale",
    "targetLocale",
    "documentPurpose",
    "style",
    "glossary",
    "units",
    "committedBatchIds",
    "committedUnitCount",
  ]);
  if (
    row === null || row.schemaVersion !== 1 || !identifierV1(row.projectId) ||
    !nonEmptyTextV1(row.title, true) ||
    !positiveIntegerV1(row.revision) || !nonEmptyTextV1(row.sourceLocale, true) ||
    !nonEmptyTextV1(row.targetLocale, true) || !nonEmptyTextV1(row.documentPurpose, true) ||
    !nonEmptyTextV1(row.style, true) || !nonNegativeIntegerV1(row.committedUnitCount)
  ) return rejectedV1("invalid_shape", "/");

  const document = admitDocumentV1(row.document);
  if (document === null) return rejectedV1("invalid_shape", "/document");
  const glossary = admitGlossaryV1(row.glossary);
  if (glossary === null) return rejectedV1("invalid_shape", "/glossary");
  const committedBatches = admitCommittedBatchIdsV1(row.committedBatchIds);
  if (committedBatches.kind === "rejected") {
    const duplicate = Array.isArray(row.committedBatchIds) &&
      new Set(row.committedBatchIds).size !== row.committedBatchIds.length;
    return rejectedV1(duplicate ? "duplicate_batch" : "invalid_shape", committedBatches.path);
  }
  const admittedUnits = admitUnitsV1(row.units, committedBatches.set);
  if (admittedUnits.kind === "rejected") {
    return rejectedV1(admittedUnits.reason, admittedUnits.path);
  }
  if (
    admittedUnits.usedBatchIds.size !== committedBatches.ids.length ||
    committedBatches.ids.some((batchId) => !admittedUnits.usedBatchIds.has(batchId))
  ) return rejectedV1("batch_binding_invalid", "/committedBatchIds");
  if (row.committedUnitCount !== admittedUnits.committedUnitCount) {
    return rejectedV1("progress_mismatch", "/committedUnitCount");
  }

  return {
    kind: "admitted",
    project: {
      schemaVersion: 1,
      projectId: row.projectId,
      title: row.title,
      revision: row.revision,
      document,
      sourceLocale: row.sourceLocale,
      targetLocale: row.targetLocale,
      documentPurpose: row.documentPurpose,
      style: row.style,
      glossary,
      units: admittedUnits.units,
      committedBatchIds: committedBatches.ids,
      committedUnitCount: admittedUnits.committedUnitCount,
    },
  };
}

/** Creates the initial, untranslated Project while preserving document unit identity and order. */
export function createTranslationProjectV1(
  input: CreateTranslationProjectInputV1,
): TranslationProjectV1 {
  const candidate = {
    schemaVersion: 1,
    projectId: input.projectId,
    title: input.title,
    revision: 1,
    document: {
      format: input.document.format,
      capabilityGrade: input.document.capability.grade,
      capabilityReason: input.document.capability.reason,
    },
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    documentPurpose: input.documentPurpose,
    style: input.style,
    glossary: input.glossary ?? [],
    units: input.document.sourceUnits.map((unit) => ({
      unitId: unit.unitId,
      order: unit.order,
      locator: unit.locator,
      context: unit.context,
      durationMilliseconds: unit.durationMilliseconds,
      source: unit.source,
      protectedSegments: unit.protectedSegments,
      target: null,
      committedBatchId: null,
    })),
    committedBatchIds: [],
    committedUnitCount: 0,
  };
  const admitted = admitTranslationProjectV1(candidate);
  if (admitted.kind === "rejected") {
    throw new TypeError(
      `sillyos.translation_project.create.invalid:${admitted.reason}${admitted.path}`,
    );
  }
  return admitted.project;
}

/** O(1) projection over the admission-checked aggregate counters. */
export function projectTranslationProgressV1(
  project: TranslationProjectV1,
): TranslationProjectProgressV1 {
  const totalUnitCount = project.units.length;
  const committedUnitCount = project.committedUnitCount;
  const phase = totalUnitCount === 0
    ? "empty"
    : committedUnitCount === 0
    ? "pending"
    : committedUnitCount === totalUnitCount
    ? "complete"
    : "in_progress";
  return {
    phase,
    totalUnitCount,
    committedUnitCount,
    pendingUnitCount: totalUnitCount - committedUnitCount,
    committedBatchCount: project.committedBatchIds.length,
    completionRatio: totalUnitCount === 0 ? null : committedUnitCount / totalUnitCount,
  };
}

/**
 * Clones only the requested row range. There is deliberately no internal page
 * maximum: the caller owns its viewport/page budget, while this function never
 * copies rows outside `[offset, offset + limit)`.
 */
export function readTranslationProjectRowWindowV1(
  project: TranslationProjectV1,
  input: TranslationProjectRowWindowInputV1,
): TranslationProjectRowWindowV1 {
  if (!nonNegativeIntegerV1(input.offset)) {
    throw new RangeError("sillyos.translation_project.row_window.invalid_offset");
  }
  if (!positiveIntegerV1(input.limit)) {
    throw new RangeError("sillyos.translation_project.row_window.invalid_limit");
  }
  const totalRowCount = project.units.length;
  const count = input.offset >= totalRowCount
    ? 0
    : Math.min(input.limit, totalRowCount - input.offset);
  const rows: TranslationProjectUnitV1[] = [];
  for (let index = input.offset; index < input.offset + count; index += 1) {
    const unit = project.units[index];
    if (unit === undefined) {
      throw new Error("sillyos.translation_project.row_window.current_project_invalid");
    }
    rows.push(cloneUnitV1(unit));
  }
  const nextOffset = input.offset + count < totalRowCount ? input.offset + count : null;
  return {
    offset: input.offset,
    limit: input.limit,
    totalRowCount,
    rows,
    nextOffset,
  };
}
