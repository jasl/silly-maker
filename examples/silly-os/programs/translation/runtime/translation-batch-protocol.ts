// SPDX-License-Identifier: MIT

import {
  translationTargetPreservesProtectedStructureV1,
  type TranslationProtectedKindV1,
  type TranslationProtectedSegmentV1,
  type TranslationSourceUnitV1,
  type TranslationTargetUnitV1,
} from "./translation-document-codec.ts";

export interface TranslationGlossaryEntryV1 {
  readonly entryId: string;
  readonly source: string;
  readonly target: string;
  readonly note: string | null;
  readonly locked: boolean;
  /** Exact batch units whose admitted source contains this term. */
  readonly appliesToUnitIds: readonly string[];
}

export interface TranslationConfirmedMeaningFactV1 {
  readonly factId: string;
  readonly statement: string;
}

export interface TranslationNeighboringUnitsV1 {
  readonly preceding: TranslationSourceUnitV1 | null;
  readonly following: TranslationSourceUnitV1 | null;
}

export interface TranslationBatchRequestV1 {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  readonly glossary: readonly TranslationGlossaryEntryV1[];
  readonly confirmedMeaningFacts: readonly TranslationConfirmedMeaningFactV1[];
  readonly neighboringUnits: TranslationNeighboringUnitsV1;
  readonly units: readonly TranslationSourceUnitV1[];
}

export interface TranslationBatchAmbiguityV1 {
  readonly unitId: string;
  readonly question: string;
}

export interface TranslationBatchCandidateV1 {
  readonly targets: readonly TranslationTargetUnitV1[];
  readonly ambiguities: readonly TranslationBatchAmbiguityV1[];
}

export type TranslationBatchRequestAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly request: TranslationBatchRequestV1 }
  | { readonly kind: "rejected" };

export type TranslationBatchAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly candidate: TranslationBatchCandidateV1 }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "invalid_shape"
      | "duplicate_unit"
      | "duplicate_ambiguity"
      | "unknown_unit"
      | "missing_unit"
      | "unit_order_changed"
      | "empty_target"
      | "protected_content_changed"
      | "locked_glossary_changed";
    readonly unitId: string | null;
  };

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !actual.every((key) => keys.includes(key))) return null;
  return value as Readonly<Record<string, unknown>>;
}

const translationUnitIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
const protectedTokenPatternV1 = /^⟦SM:\d+⟧$/u;
const protectedTokenOccurrencePatternV1 = /⟦SM:\d+⟧/gu;
const protectedKindsV1 = new Set<TranslationProtectedKindV1>([
  "placeholder",
  "markup_tag",
  "markdown_code",
  "link",
  "markdown_syntax",
]);

function nonEmptyStringV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function trimmedNonEmptyStringV1(value: unknown): value is string {
  return nonEmptyStringV1(value) && value === value.trim();
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
  for (const rawSegment of value) {
    const segment = exactRecordV1(rawSegment, ["token", "kind", "source"]);
    if (
      segment === null || typeof segment.token !== "string" ||
      !protectedTokenPatternV1.test(segment.token) || seen.has(segment.token) ||
      typeof segment.kind !== "string" ||
      !protectedKindsV1.has(segment.kind as TranslationProtectedKindV1) ||
      typeof segment.source !== "string" || segment.source.length === 0
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

function admitSourceUnitsV1(value: unknown): readonly TranslationSourceUnitV1[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const units: TranslationSourceUnitV1[] = [];
  const seen = new Set<string>();
  let firstOrder: number | null = null;
  for (const [index, rawUnit] of value.entries()) {
    const unit = exactRecordV1(rawUnit, [
      "unitId",
      "order",
      "locator",
      "context",
      "durationMilliseconds",
      "source",
      "protectedSegments",
    ]);
    if (
      unit === null || typeof unit.unitId !== "string" ||
      !translationUnitIdentifierPatternV1.test(unit.unitId) || seen.has(unit.unitId) ||
      typeof unit.order !== "number" || !Number.isSafeInteger(unit.order) || unit.order < 0 ||
      !nonEmptyStringV1(unit.locator) ||
      (unit.context !== null && typeof unit.context !== "string") ||
      (unit.durationMilliseconds !== null &&
        (typeof unit.durationMilliseconds !== "number" ||
          !Number.isSafeInteger(unit.durationMilliseconds) || unit.durationMilliseconds <= 0)) ||
      !nonEmptyStringV1(unit.source)
    ) return null;
    if (firstOrder === null) firstOrder = unit.order;
    if (unit.order !== firstOrder + index) return null;
    const protectedSegments = admitProtectedSegmentsV1(unit.protectedSegments, unit.source);
    if (protectedSegments === null) return null;
    seen.add(unit.unitId);
    units.push({
      unitId: unit.unitId,
      order: unit.order,
      locator: unit.locator,
      context: unit.context as string | null,
      durationMilliseconds: unit.durationMilliseconds as number | null,
      source: unit.source,
      protectedSegments,
    });
  }
  return units;
}

/**
 * Admits and clones one deterministic Translation batch request. Every runtime
 * boundary consumes this projection so the model prompt and candidate checker
 * cannot drift from the same source-unit structure.
 */
export function admitTranslationBatchRequestV1(
  value: unknown,
): TranslationBatchRequestAdmissionResultV1 {
  const request = exactRecordV1(value, [
    "sourceLocale",
    "targetLocale",
    "documentPurpose",
    "style",
    "glossary",
    "confirmedMeaningFacts",
    "neighboringUnits",
    "units",
  ]);
  if (
    request === null || !trimmedNonEmptyStringV1(request.sourceLocale) ||
    !trimmedNonEmptyStringV1(request.targetLocale) ||
    !trimmedNonEmptyStringV1(request.documentPurpose) ||
    !trimmedNonEmptyStringV1(request.style) || !Array.isArray(request.glossary) ||
    !Array.isArray(request.confirmedMeaningFacts)
  ) return { kind: "rejected" };
  const glossary: TranslationGlossaryEntryV1[] = [];
  const glossaryEntryIds = new Set<string>();
  for (const rawEntry of request.glossary) {
    const entry = exactRecordV1(rawEntry, [
      "entryId",
      "source",
      "target",
      "note",
      "locked",
      "appliesToUnitIds",
    ]);
    if (
      entry === null || typeof entry.entryId !== "string" ||
      !translationUnitIdentifierPatternV1.test(entry.entryId) ||
      glossaryEntryIds.has(entry.entryId) || !nonEmptyStringV1(entry.source) ||
      !nonEmptyStringV1(entry.target) ||
      (entry.note !== null && typeof entry.note !== "string") ||
      typeof entry.locked !== "boolean" || !Array.isArray(entry.appliesToUnitIds) ||
      entry.appliesToUnitIds.length === 0
    ) return { kind: "rejected" };
    const appliesToUnitIds = entry.appliesToUnitIds as readonly unknown[];
    const boundUnitIds = new Set<string>();
    for (const unitId of appliesToUnitIds) {
      if (
        typeof unitId !== "string" || !translationUnitIdentifierPatternV1.test(unitId) ||
        boundUnitIds.has(unitId)
      ) return { kind: "rejected" };
      boundUnitIds.add(unitId);
    }
    glossaryEntryIds.add(entry.entryId);
    glossary.push({
      entryId: entry.entryId,
      source: entry.source,
      target: entry.target,
      note: entry.note as string | null,
      locked: entry.locked,
      appliesToUnitIds: [...boundUnitIds],
    });
  }
  const confirmedMeaningFacts: TranslationConfirmedMeaningFactV1[] = [];
  const factIds = new Set<string>();
  for (const rawFact of request.confirmedMeaningFacts) {
    const fact = exactRecordV1(rawFact, ["factId", "statement"]);
    if (
      fact === null || typeof fact.factId !== "string" ||
      !translationUnitIdentifierPatternV1.test(fact.factId) || factIds.has(fact.factId) ||
      !trimmedNonEmptyStringV1(fact.statement)
    ) return { kind: "rejected" };
    factIds.add(fact.factId);
    confirmedMeaningFacts.push({ factId: fact.factId, statement: fact.statement });
  }
  const units = admitSourceUnitsV1(request.units);
  if (units === null) return { kind: "rejected" };
  const unitsById = new Map(units.map((unit) => [unit.unitId, unit]));
  if (
    glossary.some((entry) => {
      let previousOrder = -1;
      return entry.appliesToUnitIds.some((unitId) => {
        const unit = unitsById.get(unitId);
        if (
          unit === undefined || unit.order <= previousOrder ||
          !unit.source.includes(entry.source)
        ) return true;
        previousOrder = unit.order;
        return false;
      });
    })
  ) return { kind: "rejected" };
  const neighboring = exactRecordV1(request.neighboringUnits, ["preceding", "following"]);
  if (neighboring === null) return { kind: "rejected" };
  const preceding = neighboring.preceding === null
    ? null
    : admitSourceUnitsV1([neighboring.preceding])?.[0] ?? null;
  const following = neighboring.following === null
    ? null
    : admitSourceUnitsV1([neighboring.following])?.[0] ?? null;
  const first = units[0]!;
  const last = units.at(-1)!;
  if (
    (neighboring.preceding !== null &&
      (preceding === null || preceding.order + 1 !== first.order ||
        units.some((unit) => unit.unitId === preceding.unitId))) ||
    (neighboring.following !== null &&
      (following === null || following.order !== last.order + 1 ||
        units.some((unit) => unit.unitId === following.unitId)))
  ) return { kind: "rejected" };
  return {
    kind: "admitted",
    request: {
      sourceLocale: request.sourceLocale,
      targetLocale: request.targetLocale,
      documentPurpose: request.documentPurpose,
      style: request.style,
      glossary,
      confirmedMeaningFacts,
      neighboringUnits: { preceding, following },
      units,
    },
  };
}

/**
 * Admits a model batch at the product boundary. The deterministic document
 * exporter performs its own structural check later; this earlier check keeps a
 * malformed model result from becoming current translation state.
 */
export function admitTranslationBatchCandidateV1(
  value: unknown,
  request: TranslationBatchRequestV1,
): TranslationBatchAdmissionResultV1 {
  const row = exactRecordV1(value, ["targets", "ambiguities"]);
  if (row === null || !Array.isArray(row.targets) || !Array.isArray(row.ambiguities)) {
    return { kind: "rejected", reason: "invalid_shape", unitId: null };
  }

  const unitsById = new Map(request.units.map((unit) => [unit.unitId, unit]));
  const glossaryEntriesByUnitId = new Map<string, TranslationGlossaryEntryV1[]>();
  for (const entry of request.glossary) {
    for (const unitId of entry.appliesToUnitIds) {
      const entries = glossaryEntriesByUnitId.get(unitId) ?? [];
      entries.push(entry);
      glossaryEntriesByUnitId.set(unitId, entries);
    }
  }
  const targets: TranslationTargetUnitV1[] = [];
  const seen = new Set<string>();
  for (const [index, rawTarget] of row.targets.entries()) {
    const target = exactRecordV1(rawTarget, ["unitId", "target"]);
    if (target === null || typeof target.unitId !== "string" || typeof target.target !== "string") {
      return { kind: "rejected", reason: "invalid_shape", unitId: null };
    }
    if (seen.has(target.unitId)) {
      return { kind: "rejected", reason: "duplicate_unit", unitId: target.unitId };
    }
    const sourceUnit = unitsById.get(target.unitId);
    if (sourceUnit === undefined) {
      return { kind: "rejected", reason: "unknown_unit", unitId: target.unitId };
    }
    if (request.units[index]?.unitId !== target.unitId) {
      return { kind: "rejected", reason: "unit_order_changed", unitId: target.unitId };
    }
    const targetText = target.target;
    if (targetText.trim().length === 0) {
      return { kind: "rejected", reason: "empty_target", unitId: target.unitId };
    }
    if (!translationTargetPreservesProtectedStructureV1(sourceUnit, targetText)) {
      return { kind: "rejected", reason: "protected_content_changed", unitId: target.unitId };
    }
    const applicableGlossary = glossaryEntriesByUnitId.get(target.unitId) ?? [];
    if (applicableGlossary.some((entry) => entry.locked && !targetText.includes(entry.target))) {
      return { kind: "rejected", reason: "locked_glossary_changed", unitId: target.unitId };
    }
    seen.add(target.unitId);
    targets.push({ unitId: target.unitId, target: targetText });
  }
  const missing = request.units.find((unit) => !seen.has(unit.unitId));
  if (missing !== undefined) {
    return { kind: "rejected", reason: "missing_unit", unitId: missing.unitId };
  }

  const ambiguities: TranslationBatchAmbiguityV1[] = [];
  const ambiguityUnits = new Set<string>();
  for (const rawAmbiguity of row.ambiguities) {
    const ambiguity = exactRecordV1(rawAmbiguity, ["unitId", "question"]);
    if (
      ambiguity === null || typeof ambiguity.unitId !== "string" ||
      typeof ambiguity.question !== "string" || ambiguity.question.trim().length === 0
    ) return { kind: "rejected", reason: "invalid_shape", unitId: null };
    if (!unitsById.has(ambiguity.unitId)) {
      return { kind: "rejected", reason: "unknown_unit", unitId: ambiguity.unitId };
    }
    if (ambiguityUnits.has(ambiguity.unitId)) {
      return { kind: "rejected", reason: "duplicate_ambiguity", unitId: ambiguity.unitId };
    }
    ambiguityUnits.add(ambiguity.unitId);
    ambiguities.push({ unitId: ambiguity.unitId, question: ambiguity.question.trim() });
  }

  return { kind: "admitted", candidate: { targets, ambiguities } };
}
