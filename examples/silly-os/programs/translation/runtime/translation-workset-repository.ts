// SPDX-License-Identifier: MIT

import type {
  TranslationCapabilityGradeV1,
  TranslationCapabilityReasonV1,
  TranslationDocumentFormatV1,
  TranslationSourceUnitV1,
  TranslationTargetUnitV1,
} from "./translation-document-codec.ts";
import {
  exactJsonValuesEqualV1,
  operationalStructuredPayloadMaximumBytesV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  normalizeProcessExecutionLeaseV1,
  type ProcessExecutionLeaseV1,
} from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  workspacePathMaximumPartsV1,
  workspacePathMaximumUtf8BytesV1,
} from "../../../src/workspace/contracts.ts";
import {
  admitTranslationBatchCandidateV1,
  admitTranslationBatchRequestV1,
  type TranslationBatchAmbiguityV1,
  type TranslationBatchCandidateV1,
  type TranslationBatchRequestV1,
} from "./translation-batch-protocol.ts";
import {
  evaluateTranslationMechanicalQaV1,
  type TranslationMechanicalQaFindingV1,
} from "./translation-mechanical-qa.ts";

export type TranslationWorksetImportPhaseV1 = "staging" | "ready";

export interface TranslationWorksetSourceV1 {
  readonly fileName: string;
  readonly mediaType: string;
  readonly workspacePath: string;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface TranslationWorksetSourceBindingV1 {
  readonly revision: 1;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly path: string;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface TranslationWorksetHeadV1 {
  readonly schemaVersion: 2;
  readonly processId: string;
  /** Exact begin-import operation that created this Process-owned data set. */
  readonly importOperationId: string;
  readonly revision: number;
  readonly phase: TranslationWorksetImportPhaseV1;
  readonly title: string;
  readonly document: {
    readonly format: TranslationDocumentFormatV1;
    readonly capabilityGrade: TranslationCapabilityGradeV1;
    readonly capabilityReason: TranslationCapabilityReasonV1;
  };
  readonly source: TranslationWorksetSourceV1;
  /**
   * Exact durable Workspace successor that already contains `source`. A
   * staging workset therefore never describes a source write that may or may
   * not have happened. Resume still requires the product to read or reproduce
   * those exact bytes; this binding is identity, not a second byte store.
   */
  readonly sourceBinding: TranslationWorksetSourceBindingV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly expectedUnitCount: number;
  readonly stagedUnitCount: number;
  readonly expectedGlossaryCount: number;
  readonly stagedGlossaryCount: number;
  readonly acceptedUnitCount: number;
  readonly acceptedBatchCount: number;
  readonly pendingCandidateId: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TranslationWorksetUnitV1 extends TranslationSourceUnitV1 {
  readonly processId: string;
}

export interface TranslationWorksetUnitRecordV1 extends TranslationWorksetUnitV1 {
  /** Human-accepted target. A pending model candidate remains separate. */
  readonly target: string | null;
}

export type TranslationWorksetImportUnitV1 = Omit<TranslationWorksetUnitV1, "processId">;

export interface TranslationWorksetGlossaryEntryV1 {
  readonly processId: string;
  readonly entryId: string;
  readonly order: number;
  readonly source: string;
  readonly target: string;
  readonly note: string | null;
  readonly locked: boolean;
}

export interface TranslationWorksetBeginImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly title: string;
  readonly document: TranslationWorksetHeadV1["document"];
  readonly source: TranslationWorksetSourceV1;
  readonly sourceBinding: TranslationWorksetSourceBindingV1;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly expectedUnitCount: number;
  readonly expectedGlossaryCount: number;
  readonly updatedAt: number;
}

export interface TranslationWorksetAppendImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedWorksetRevision: number;
  readonly units: readonly TranslationWorksetImportUnitV1[];
  readonly glossaryEntries: readonly Omit<TranslationWorksetGlossaryEntryV1, "processId">[];
  readonly updatedAt: number;
}

export interface TranslationWorksetFinalizeImportInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedWorksetRevision: number;
  readonly sourceBinding: TranslationWorksetSourceBindingV1;
  readonly updatedAt: number;
}

/** One immutable model result awaiting explicit human or workflow review. */
export interface TranslationBatchCandidateRecordV1 {
  readonly schemaVersion: 2;
  readonly processId: string;
  readonly candidateId: string;
  readonly baseWorksetRevision: number;
  readonly firstOrder: number;
  readonly unitCount: number;
  /** Exact admitted request that produced this bounded candidate. */
  readonly request: TranslationBatchRequestV1;
  readonly targets: TranslationBatchCandidateV1["targets"];
  readonly ambiguities: readonly TranslationBatchAmbiguityV1[];
  /** Deterministic, non-blocking Review projection for this exact candidate. */
  readonly findings: readonly TranslationMechanicalQaFindingV1[];
  readonly attemptId: string;
  readonly generation: number;
  readonly createdAt: number;
}

export interface TranslationBatchCandidatePublishInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly lease: ProcessExecutionLeaseV1;
  readonly expectedWorksetRevision: number;
  readonly expectedFirstPendingOrder: number;
  /** `null` publishes the first candidate; an exact ID atomically replaces it. */
  readonly replacesCandidateId: string | null;
  readonly request: TranslationBatchRequestV1;
  readonly candidate: TranslationBatchCandidateV1;
  readonly updatedAt: number;
}

export interface TranslationBatchCandidateAcceptInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly expectedWorksetRevision: number;
  readonly candidateId: string;
  /** Complete editable replacement for the bounded pending candidate. */
  readonly targets: readonly TranslationTargetUnitV1[];
  readonly updatedAt: number;
}

export interface TranslationBatchCandidateRejectInputV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly expectedWorksetRevision: number;
  readonly candidateId: string;
  readonly updatedAt: number;
}

export type TranslationWorksetOperationExpectationV1 =
  | { readonly operation: "begin"; readonly input: TranslationWorksetBeginImportInputV1 }
  | { readonly operation: "append"; readonly input: TranslationWorksetAppendImportInputV1 }
  | { readonly operation: "finalize"; readonly input: TranslationWorksetFinalizeImportInputV1 }
  | {
    readonly operation: "publish_candidate";
    readonly input: TranslationBatchCandidatePublishInputV1;
  }
  | {
    readonly operation: "accept_candidate";
    readonly input: TranslationBatchCandidateAcceptInputV1;
  }
  | {
    readonly operation: "reject_candidate";
    readonly input: TranslationBatchCandidateRejectInputV1;
  };

export interface TranslationWorksetOperationReceiptV1 {
  readonly processId: string;
  readonly operationId: string;
  readonly operation: TranslationWorksetOperationExpectationV1["operation"];
  readonly operationDigest: string;
  readonly worksetRevision: number;
  readonly candidateId: string | null;
}

export type TranslationWorksetMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null };

export type TranslationWorksetOperationQueryResultV1 =
  | { readonly kind: "absent" }
  | {
    readonly kind: "committed" | "mismatch";
    readonly receipt: TranslationWorksetOperationReceiptV1;
  };

export interface TranslationWorksetPageRequestV1 {
  readonly processId: string;
  readonly expectedWorksetRevision: number;
  readonly fromOrder: number;
  /** Per-request transfer window; this is not a Process capacity limit. */
  readonly maximumRows: number;
  readonly maximumBytes: number;
}

export interface TranslationWorksetPageV1<TRow> {
  readonly processId: string;
  readonly worksetRevision: number;
  readonly fromOrder: number;
  readonly rows: readonly TRow[];
  readonly byteLength: number;
  readonly nextOrder: number | null;
}

export type TranslationWorksetPageResultV1<TRow> =
  | { readonly kind: "page"; readonly page: TranslationWorksetPageV1<TRow> }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null };

export interface TranslationWorksetRepositoryV1 {
  beginTranslationWorksetImport(
    input: TranslationWorksetBeginImportInputV1,
  ): Promise<TranslationWorksetMutationResultV1>;
  appendTranslationWorksetImport(
    input: TranslationWorksetAppendImportInputV1,
  ): Promise<TranslationWorksetMutationResultV1>;
  loadTranslationWorksetHead(processId: string): Promise<TranslationWorksetHeadV1 | null>;
  loadTranslationWorksetUnitPage(
    input: TranslationWorksetPageRequestV1,
  ): Promise<TranslationWorksetPageResultV1<TranslationWorksetUnitRecordV1>>;
  loadTranslationWorksetGlossaryPage(
    input: TranslationWorksetPageRequestV1,
  ): Promise<TranslationWorksetPageResultV1<TranslationWorksetGlossaryEntryV1>>;
  loadTranslationBatchCandidate(
    processId: string,
    candidateId: string,
  ): Promise<TranslationBatchCandidateRecordV1 | null>;
  acceptTranslationBatchCandidate(
    input: TranslationBatchCandidateAcceptInputV1,
  ): Promise<TranslationWorksetMutationResultV1>;
  rejectTranslationBatchCandidate(
    input: TranslationBatchCandidateRejectInputV1,
  ): Promise<TranslationWorksetMutationResultV1>;
  queryTranslationWorksetOperation(
    input: TranslationWorksetOperationExpectationV1,
  ): Promise<TranslationWorksetOperationQueryResultV1>;
}

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
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

export function normalizeTranslationWorksetBeginImportInputV1(
  value: TranslationWorksetBeginImportInputV1,
): TranslationWorksetBeginImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  textV1(value.title);
  if (
    ![
      "plain_text",
      "markdown",
      "subrip",
      "webvtt",
      "advanced_substation_alpha",
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
      "malformed_webvtt",
      "malformed_advanced_substation_alpha",
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
  normalizeTranslationWorksetSourceBindingV1(value.sourceBinding, value.source.workspacePath);
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
  if (translationWorksetRowUtf8ByteLengthV1(value) > operationalStructuredPayloadMaximumBytesV1) {
    throw new TypeError("Translation begin exceeds operation budget");
  }
  return structuredClone({ ...value, lease });
}

function normalizeUnitV1(value: TranslationWorksetImportUnitV1) {
  identifierV1(value.unitId);
  countV1(value.order);
  textV1(value.locator);
  if (value.context !== null) textV1(value.context);
  textV1(value.source);
  if (value.durationMilliseconds !== null) countV1(value.durationMilliseconds);
  if (value.lineBreakPolicy !== "forbidden" && value.lineBreakPolicy !== "flexible") {
    throw new TypeError("invalid line-break policy");
  }
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

const translationWorksetUnitKeysV1 = new Set([
  "processId",
  "unitId",
  "order",
  "locator",
  "context",
  "durationMilliseconds",
  "lineBreakPolicy",
  "source",
  "protectedSegments",
  "target",
]);

/** Admits one current durable Translation unit row. */
export function cloneTranslationWorksetUnitV1(value: unknown): TranslationWorksetUnitRecordV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid Translation workset unit");
  }
  const row = value as TranslationWorksetUnitRecordV1;
  const keys = Reflect.ownKeys(row);
  if (
    keys.some((key) =>
      typeof key !== "string" ||
      !translationWorksetUnitKeysV1.has(key)
    ) || keys.length !== 10
  ) throw new TypeError("invalid Translation workset unit");
  identifierV1(row.processId);
  const source = normalizeUnitV1({
    unitId: row.unitId,
    order: row.order,
    locator: row.locator,
    context: row.context,
    durationMilliseconds: row.durationMilliseconds,
    lineBreakPolicy: row.lineBreakPolicy,
    source: row.source,
    protectedSegments: row.protectedSegments,
  });
  if (
    row.target !== null &&
    (typeof row.target !== "string" || row.target.trim().length === 0)
  ) {
    throw new TypeError("invalid Translation workset target");
  }
  return {
    processId: row.processId,
    ...source,
    target: row.target,
  };
}
function normalizeGlossaryV1(value: Omit<TranslationWorksetGlossaryEntryV1, "processId">) {
  identifierV1(value.entryId);
  countV1(value.order);
  textV1(value.source);
  textV1(value.target);
  if (value.note !== null) textV1(value.note);
  if (typeof value.locked !== "boolean") throw new TypeError("invalid glossary lock");
  return structuredClone(value);
}
export function normalizeTranslationWorksetAppendImportInputV1(
  value: TranslationWorksetAppendImportInputV1,
): TranslationWorksetAppendImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  revisionV1(value.expectedWorksetRevision);
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
    translationWorksetRowUtf8ByteLengthV1(normalized) > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("Translation append exceeds operation budget");
  return normalized;
}
export function normalizeTranslationWorksetFinalizeImportInputV1(
  value: TranslationWorksetFinalizeImportInputV1,
): TranslationWorksetFinalizeImportInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  revisionV1(value.expectedWorksetRevision);
  normalizeTranslationWorksetSourceBindingV1(value.sourceBinding);
  countV1(value.updatedAt);
  if (lease.processId !== value.processId || value.updatedAt >= lease.expiresAt) {
    throw new TypeError("invalid Translation import lease");
  }
  if (translationWorksetRowUtf8ByteLengthV1(value) > operationalStructuredPayloadMaximumBytesV1) {
    throw new TypeError("Translation finalize exceeds operation budget");
  }
  return structuredClone({ ...value, lease });
}

export function normalizeTranslationBatchCandidatePublishInputV1(
  value: TranslationBatchCandidatePublishInputV1,
): TranslationBatchCandidatePublishInputV1 {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  const lease = normalizeProcessExecutionLeaseV1(value.lease);
  revisionV1(value.expectedWorksetRevision);
  countV1(value.expectedFirstPendingOrder);
  if (value.replacesCandidateId !== null) identifierV1(value.replacesCandidateId);
  countV1(value.updatedAt);
  if (lease.processId !== value.processId || value.updatedAt >= lease.expiresAt) {
    throw new TypeError("invalid Translation candidate lease");
  }
  const requestResult = admitTranslationBatchRequestV1(value.request);
  if (requestResult.kind !== "admitted") throw new TypeError("invalid Translation batch request");
  const candidateResult = admitTranslationBatchCandidateV1(value.candidate, requestResult.request);
  if (candidateResult.kind !== "admitted") {
    throw new TypeError(`invalid Translation batch candidate: ${candidateResult.reason}`);
  }
  if (requestResult.request.units[0]?.order !== value.expectedFirstPendingOrder) {
    throw new TypeError("Translation batch does not begin at the expected pending order");
  }
  const normalized = {
    processId: value.processId,
    operationId: value.operationId,
    lease,
    expectedWorksetRevision: value.expectedWorksetRevision,
    expectedFirstPendingOrder: value.expectedFirstPendingOrder,
    replacesCandidateId: value.replacesCandidateId,
    request: requestResult.request,
    candidate: candidateResult.candidate,
    updatedAt: value.updatedAt,
  } satisfies TranslationBatchCandidatePublishInputV1;
  if (
    translationWorksetRowUtf8ByteLengthV1(normalized) > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("Translation candidate exceeds operation budget");
  return normalized;
}

function normalizeTranslationCandidateReviewIdentityV1(value: {
  readonly processId: string;
  readonly operationId: string;
  readonly expectedWorksetRevision: number;
  readonly candidateId: string;
  readonly updatedAt: number;
}): void {
  identifierV1(value.processId);
  identifierV1(value.operationId);
  revisionV1(value.expectedWorksetRevision);
  identifierV1(value.candidateId);
  countV1(value.updatedAt);
}

export function normalizeTranslationBatchCandidateAcceptInputV1(
  value: TranslationBatchCandidateAcceptInputV1,
): TranslationBatchCandidateAcceptInputV1 {
  normalizeTranslationCandidateReviewIdentityV1(value);
  if (!Array.isArray(value.targets) || value.targets.length === 0) {
    throw new TypeError("empty Translation candidate acceptance");
  }
  const unitIds = new Set<string>();
  const targets = value.targets.map((target) => {
    if (
      target === null || typeof target !== "object" || Array.isArray(target) ||
      Reflect.ownKeys(target).length !== 2
    ) throw new TypeError("invalid Translation candidate acceptance target");
    identifierV1(target.unitId);
    if (
      unitIds.has(target.unitId) || typeof target.target !== "string" ||
      target.target.trim().length === 0
    ) throw new TypeError("invalid Translation candidate acceptance target");
    unitIds.add(target.unitId);
    return { unitId: target.unitId, target: target.target };
  });
  const normalized = {
    processId: value.processId,
    operationId: value.operationId,
    expectedWorksetRevision: value.expectedWorksetRevision,
    candidateId: value.candidateId,
    targets,
    updatedAt: value.updatedAt,
  } satisfies TranslationBatchCandidateAcceptInputV1;
  if (
    translationWorksetRowUtf8ByteLengthV1(normalized) > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("Translation candidate acceptance exceeds operation budget");
  return structuredClone(normalized);
}

export function normalizeTranslationBatchCandidateRejectInputV1(
  value: TranslationBatchCandidateRejectInputV1,
): TranslationBatchCandidateRejectInputV1 {
  normalizeTranslationCandidateReviewIdentityV1(value);
  if (translationWorksetRowUtf8ByteLengthV1(value) > operationalStructuredPayloadMaximumBytesV1) {
    throw new TypeError("Translation candidate rejection exceeds operation budget");
  }
  return structuredClone(value);
}

export function cloneTranslationBatchCandidateRecordV1(
  value: TranslationBatchCandidateRecordV1,
): TranslationBatchCandidateRecordV1 {
  const row = value as TranslationBatchCandidateRecordV1;
  if (
    row === null || typeof row !== "object" || Array.isArray(row) ||
    Reflect.ownKeys(row).length !== 13 || row.schemaVersion !== 2
  ) throw new TypeError("invalid Translation batch candidate record");
  identifierV1(row.processId);
  identifierV1(row.candidateId);
  revisionV1(row.baseWorksetRevision);
  countV1(row.firstOrder);
  countV1(row.unitCount);
  identifierV1(row.attemptId);
  revisionV1(row.generation);
  countV1(row.createdAt);
  const admittedRequest = admitTranslationBatchRequestV1(row.request);
  if (
    admittedRequest.kind !== "admitted" || admittedRequest.request.units.length !== row.unitCount ||
    admittedRequest.request.units[0]?.order !== row.firstOrder
  ) {
    throw new TypeError("invalid Translation batch candidate request");
  }
  const admittedCandidate = admitTranslationBatchCandidateV1({
    targets: row.targets,
    ambiguities: row.ambiguities,
  }, admittedRequest.request);
  if (admittedCandidate.kind !== "admitted") {
    throw new TypeError("invalid Translation batch candidate rows");
  }
  const findings = evaluateTranslationMechanicalQaV1(
    admittedRequest.request,
    admittedCandidate.candidate,
  );
  if (!exactJsonValuesEqualV1(row.findings, findings)) {
    throw new TypeError("invalid Translation batch candidate findings");
  }
  return structuredClone({
    schemaVersion: 2,
    processId: row.processId,
    candidateId: row.candidateId,
    baseWorksetRevision: row.baseWorksetRevision,
    firstOrder: row.firstOrder,
    unitCount: row.unitCount,
    request: admittedRequest.request,
    targets: admittedCandidate.candidate.targets,
    ambiguities: admittedCandidate.candidate.ambiguities,
    findings,
    attemptId: row.attemptId,
    generation: row.generation,
    createdAt: row.createdAt,
  });
}

export function normalizeTranslationWorksetSourceBindingV1(
  value: TranslationWorksetSourceBindingV1,
  expectedPath?: string,
): TranslationWorksetSourceBindingV1 {
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
export function normalizeTranslationWorksetOperationExpectationV1(
  value: TranslationWorksetOperationExpectationV1,
): TranslationWorksetOperationExpectationV1 {
  if (value.operation === "begin") {
    return {
      operation: "begin",
      input: normalizeTranslationWorksetBeginImportInputV1(value.input),
    };
  }
  if (value.operation === "append") {
    return {
      operation: "append",
      input: normalizeTranslationWorksetAppendImportInputV1(value.input),
    };
  }
  if (value.operation === "finalize") {
    return {
      operation: "finalize",
      input: normalizeTranslationWorksetFinalizeImportInputV1(value.input),
    };
  }
  if (value.operation === "publish_candidate") {
    return {
      operation: "publish_candidate",
      input: normalizeTranslationBatchCandidatePublishInputV1(value.input),
    };
  }
  if (value.operation === "accept_candidate") {
    return {
      operation: "accept_candidate",
      input: normalizeTranslationBatchCandidateAcceptInputV1(value.input),
    };
  }
  if (value.operation === "reject_candidate") {
    return {
      operation: "reject_candidate",
      input: normalizeTranslationBatchCandidateRejectInputV1(value.input),
    };
  }
  throw new TypeError("invalid Translation operation");
}
export function normalizeTranslationWorksetPageRequestV1(
  value: TranslationWorksetPageRequestV1,
): TranslationWorksetPageRequestV1 {
  identifierV1(value.processId);
  revisionV1(value.expectedWorksetRevision);
  countV1(value.fromOrder);
  if (
    !Number.isSafeInteger(value.maximumRows) || value.maximumRows < 1 ||
    !Number.isSafeInteger(value.maximumBytes) || value.maximumBytes < 1 ||
    value.maximumBytes > operationalStructuredPayloadMaximumBytesV1
  ) throw new TypeError("invalid page window");
  return structuredClone(value);
}
export function translationWorksetRowUtf8ByteLengthV1(value: unknown): number {
  return textEncoderV1.encode(JSON.stringify(value)).byteLength;
}
