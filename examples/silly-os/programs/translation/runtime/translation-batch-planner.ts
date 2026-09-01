// SPDX-License-Identifier: MIT

import {
  admitTranslationBatchRequestV1,
  type TranslationBatchRequestV1,
  type TranslationConfirmedMeaningFactV1,
} from "./translation-batch-protocol.ts";
import type {
  TranslationWorksetGlossaryEntryV1,
  TranslationWorksetUnitV1,
} from "./translation-workset-repository.ts";
import type { TranslationSourceUnitV1 } from "./translation-document-codec.ts";
import { createTranslationBatchUserPromptV1 } from "./translation-agent-prompt.ts";

export interface TranslationBatchPlannerNeighboringUnitsV1 {
  /** Immediate source row before `sourceRows[0]`, when one was loaded. */
  readonly preceding: TranslationWorksetUnitV1 | null;
  /** Immediate source row after the last loaded source row, when one was loaded. */
  readonly following: TranslationWorksetUnitV1 | null;
}

export interface TranslationBatchPlannerInputV1 {
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly documentPurpose: string;
  readonly style: string;
  /** One non-empty, contiguous Process workset window beginning at the next pending row. */
  readonly sourceRows: readonly TranslationWorksetUnitV1[];
  /** Loaded Process glossary rows. Only locked source matches are projected. */
  readonly glossaryRows: readonly TranslationWorksetGlossaryEntryV1[];
  /** Already admitted, human-confirmed facts relevant to this work window. */
  readonly confirmedMeaningFacts?: readonly TranslationConfirmedMeaningFactV1[];
  readonly neighboringUnits?: TranslationBatchPlannerNeighboringUnitsV1;
  readonly budget: TranslationBatchBudgetV1;
}

/**
 * Explicit assumptions used to estimate one complete candidate payload. The
 * source code-point ratio is intentionally supplied by the product instead of
 * hidden in the planner: language pair and output policy determine how much
 * target expansion is acceptable. Provider-side reasoning may consume the
 * same completion cap; it is not predicted or silently covered here.
 */
export interface TranslationBatchOutputTokenEnvelopeV1 {
  /** Tool-call framing, candidate object, and batch-level ambiguity reserve. */
  readonly fixedCandidateReserveTokens: number;
  /** Per-unit JSON framing and one concise ambiguity reserve. */
  readonly perUnitCandidateReserveTokens: number;
  /** Conservative target token expansion per source Unicode code point. */
  readonly targetTokensPerSourceCodePoint: {
    readonly numerator: number;
    readonly denominator: number;
  };
}

/**
 * One caller-selected model envelope. `maximumRequestBytes` is the complete
 * dynamic request JSON budget after the stable Program prompt/context reserve;
 * `maximumOutputTokens` is the selected model route's real completion ceiling.
 * Neither value is clamped or replaced by an implicit planner default.
 */
export interface TranslationBatchBudgetV1 {
  readonly maximumRequestBytes: number;
  readonly maximumOutputTokens: number;
  readonly outputEnvelope: TranslationBatchOutputTokenEnvelopeV1;
}

export type TranslationBatchPlanningResultV1 =
  | { readonly kind: "empty" }
  | {
    readonly kind: "unit_exceeds_budget";
    readonly unitId: string;
    readonly requestByteLength: number;
    readonly maximumRequestBytes: number;
    readonly requestedOutputTokens: number;
    readonly maximumOutputTokens: number;
  }
  | {
    readonly kind: "planned";
    readonly request: TranslationBatchRequestV1;
    readonly requestByteLength: number;
    readonly requestedOutputTokens: number;
    /** First pending Process workset order not translated by this request. */
    readonly nextOrder: number | null;
  };

const textEncoderV1 = new TextEncoder();

export function translationBatchRequestUtf8ByteLengthV1(
  request: TranslationBatchRequestV1,
): number {
  return textEncoderV1.encode(createTranslationBatchUserPromptV1(request)).byteLength;
}

function safeNonNegativeIntegerV1(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Translation ${label} is invalid`);
  }
}

function sourceCodePointCountV1(value: string): number {
  let count = 0;
  const iterator = value[Symbol.iterator]();
  while (!iterator.next().done) count += 1;
  return count;
}

function safeAddV1(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new TypeError("Translation output token envelope exceeds safe integer precision");
  }
  return result;
}

function scaledCeilingV1(value: number, numerator: number, denominator: number): number {
  const product = value * numerator;
  if (!Number.isSafeInteger(product)) {
    throw new TypeError("Translation output token envelope exceeds safe integer precision");
  }
  return Math.ceil(product / denominator);
}

/**
 * Computes the requested candidate-output cap for a planned request. It is a
 * conservative policy estimate, not a tokenizer or a promise that a reasoning
 * model will leave enough of that cap for the required tool call. A turn that
 * does not return one complete admitted candidate is a visible failed attempt.
 */
export function translationBatchRequestedOutputTokensV1(
  request: TranslationBatchRequestV1,
  envelope: TranslationBatchOutputTokenEnvelopeV1,
): number {
  const ratio = envelope.targetTokensPerSourceCodePoint;
  safeNonNegativeIntegerV1(envelope.fixedCandidateReserveTokens, "candidate token reserve");
  safeNonNegativeIntegerV1(
    envelope.perUnitCandidateReserveTokens,
    "per-unit candidate token reserve",
  );
  if (
    !Number.isSafeInteger(ratio.numerator) || ratio.numerator <= 0 ||
    !Number.isSafeInteger(ratio.denominator) || ratio.denominator <= 0
  ) throw new TypeError("Translation target token expansion ratio is invalid");

  let requested = envelope.fixedCandidateReserveTokens;
  for (const unit of request.units) {
    requested = safeAddV1(requested, envelope.perUnitCandidateReserveTokens);
    requested = safeAddV1(
      requested,
      scaledCeilingV1(
        sourceCodePointCountV1(unit.source),
        ratio.numerator,
        ratio.denominator,
      ),
    );
  }
  return requested;
}

function sourceUnitV1(row: TranslationWorksetUnitV1): TranslationSourceUnitV1 {
  return {
    unitId: row.unitId,
    order: row.order,
    locator: row.locator,
    context: row.context,
    durationMilliseconds: row.durationMilliseconds,
    lineBreakPolicy: row.lineBreakPolicy,
    source: row.source,
    protectedSegments: row.protectedSegments.map((segment) => ({ ...segment })),
  };
}

function validatePlannerWindowV1(input: TranslationBatchPlannerInputV1): void {
  if (
    !Number.isSafeInteger(input.budget.maximumRequestBytes) ||
    input.budget.maximumRequestBytes <= 0
  ) throw new TypeError("Translation request byte budget is invalid");
  if (
    !Number.isSafeInteger(input.budget.maximumOutputTokens) ||
    input.budget.maximumOutputTokens <= 0
  ) throw new TypeError("Translation output token budget is invalid");
  // Validate every policy field even for an empty Process workset window.
  translationBatchRequestedOutputTokensV1({
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    documentPurpose: input.documentPurpose,
    style: input.style,
    glossary: [],
    confirmedMeaningFacts: [],
    neighboringUnits: { preceding: null, following: null },
    units: [],
  }, input.budget.outputEnvelope);
  if (input.sourceRows.length === 0) return;

  const first = input.sourceRows[0]!;
  const unitIds = new Set<string>();
  for (const [index, row] of input.sourceRows.entries()) {
    if (
      row.processId !== first.processId || row.order !== first.order + index ||
      unitIds.has(row.unitId)
    ) throw new TypeError("Translation source rows are not one contiguous Process workset window");
    unitIds.add(row.unitId);
  }
  for (const row of input.glossaryRows) {
    if (row.processId !== first.processId) {
      throw new TypeError("Translation glossary row belongs to another Process");
    }
  }

  const preceding = input.neighboringUnits?.preceding ?? null;
  const following = input.neighboringUnits?.following ?? null;
  if (
    preceding !== null &&
    (preceding.processId !== first.processId || preceding.order + 1 !== first.order)
  ) throw new TypeError("Translation preceding row is not the immediate Process workset neighbor");
  const last = input.sourceRows.at(-1)!;
  if (
    following !== null &&
    (following.processId !== first.processId || following.order !== last.order + 1)
  ) throw new TypeError("Translation following row is not the immediate Process workset neighbor");
}

interface PreparedTranslationGlossaryEntryV1 {
  readonly entry: TranslationWorksetGlossaryEntryV1;
  /** Source-row indexes are collected once and remain ascending. */
  readonly matchingUnitIndexes: readonly number[];
}

/**
 * Resolves glossary applicability exactly once for the complete planning
 * window. Binary prefix measurement subsequently slices these bindings rather
 * than repeating `glossary x source` matching for every probe.
 */
function prepareGlossaryEntriesV1(
  input: TranslationBatchPlannerInputV1,
): readonly PreparedTranslationGlossaryEntryV1[] {
  const prepared: PreparedTranslationGlossaryEntryV1[] = [];
  for (const entry of input.glossaryRows) {
    if (!entry.locked) continue;
    const matchingUnitIndexes: number[] = [];
    for (const [index, row] of input.sourceRows.entries()) {
      if (row.source.includes(entry.source)) matchingUnitIndexes.push(index);
    }
    if (matchingUnitIndexes.length > 0) prepared.push({ entry, matchingUnitIndexes });
  }
  return prepared;
}

function prefixMatchCountV1(indexes: readonly number[], unitCount: number): number {
  let lower = 0;
  let upper = indexes.length;
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (indexes[middle]! < unitCount) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

function requestForPrefixV1(
  input: TranslationBatchPlannerInputV1,
  preparedGlossary: readonly PreparedTranslationGlossaryEntryV1[],
  unitCount: number,
): TranslationBatchRequestV1 {
  const selectedRows = input.sourceRows.slice(0, unitCount);
  const following = input.sourceRows[unitCount] ?? input.neighboringUnits?.following ?? null;
  const candidate: TranslationBatchRequestV1 = {
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    documentPurpose: input.documentPurpose,
    style: input.style,
    glossary: preparedGlossary.flatMap(({ entry, matchingUnitIndexes }) => {
      const matchCount = prefixMatchCountV1(matchingUnitIndexes, unitCount);
      return matchCount === 0 ? [] : [{
        entryId: entry.entryId,
        source: entry.source,
        target: entry.target,
        note: entry.note,
        locked: true,
        appliesToUnitIds: matchingUnitIndexes.slice(0, matchCount).map((index) =>
          input.sourceRows[index]!.unitId
        ),
      }];
    }),
    confirmedMeaningFacts: (input.confirmedMeaningFacts ?? []).map((fact) => ({ ...fact })),
    neighboringUnits: {
      preceding: input.neighboringUnits?.preceding === undefined ||
          input.neighboringUnits.preceding === null
        ? null
        : sourceUnitV1(input.neighboringUnits.preceding),
      following: following === null ? null : sourceUnitV1(following),
    },
    units: selectedRows.map(sourceUnitV1),
  };
  return candidate;
}

function plannedResultV1(
  input: TranslationBatchPlannerInputV1,
  unitCount: number,
  request: TranslationBatchRequestV1,
  requestByteLength: number,
  requestedOutputTokens: number,
): TranslationBatchPlanningResultV1 {
  const admitted = admitTranslationBatchRequestV1(request);
  if (admitted.kind !== "admitted") {
    throw new TypeError("Translation planner input cannot form an admitted request");
  }
  const nextRow = input.sourceRows[unitCount] ?? input.neighboringUnits?.following ?? null;
  return {
    kind: "planned",
    request: admitted.request,
    requestByteLength,
    requestedOutputTokens,
    nextOrder: nextRow?.order ?? null,
  };
}

interface TranslationBatchCandidateMeasureV1 {
  readonly request: TranslationBatchRequestV1;
  readonly requestByteLength: number;
  readonly requestedOutputTokens: number;
  readonly fits: boolean;
}

function measurePrefixV1(
  input: TranslationBatchPlannerInputV1,
  preparedGlossary: readonly PreparedTranslationGlossaryEntryV1[],
  unitCount: number,
): TranslationBatchCandidateMeasureV1 {
  const request = requestForPrefixV1(input, preparedGlossary, unitCount);
  const requestByteLength = translationBatchRequestUtf8ByteLengthV1(request);
  const requestedOutputTokens = translationBatchRequestedOutputTokensV1(
    request,
    input.budget.outputEnvelope,
  );
  return {
    request,
    requestByteLength,
    requestedOutputTokens,
    fits: requestByteLength <= input.budget.maximumRequestBytes &&
      requestedOutputTokens <= input.budget.maximumOutputTokens,
  };
}

/**
 * Selects the largest complete contiguous prefix that fits one dynamic request.
 * Facts, neighbors, glossary entries, and units are never truncated. The full
 * window is checked separately because moving its final row from `following`
 * into `units` can make that final shape slightly smaller.
 */
export function planTranslationBatchRequestV1(
  input: TranslationBatchPlannerInputV1,
): TranslationBatchPlanningResultV1 {
  validatePlannerWindowV1(input);
  if (input.sourceRows.length === 0) return { kind: "empty" };
  const preparedGlossary = prepareGlossaryEntriesV1(input);

  const full = measurePrefixV1(input, preparedGlossary, input.sourceRows.length);
  if (full.fits) {
    return plannedResultV1(
      input,
      input.sourceRows.length,
      full.request,
      full.requestByteLength,
      full.requestedOutputTokens,
    );
  }

  const first = measurePrefixV1(input, preparedGlossary, 1);
  if (!first.fits) {
    return {
      kind: "unit_exceeds_budget",
      unitId: input.sourceRows[0]!.unitId,
      requestByteLength: first.requestByteLength,
      maximumRequestBytes: input.budget.maximumRequestBytes,
      requestedOutputTokens: first.requestedOutputTokens,
      maximumOutputTokens: input.budget.maximumOutputTokens,
    };
  }

  let bestCount = 1;
  let best = first;
  let lower = 2;
  let upper = input.sourceRows.length - 1;
  while (lower <= upper) {
    const candidateCount = lower + Math.floor((upper - lower) / 2);
    const candidate = measurePrefixV1(input, preparedGlossary, candidateCount);
    if (candidate.fits) {
      bestCount = candidateCount;
      best = candidate;
      lower = candidateCount + 1;
    } else {
      upper = candidateCount - 1;
    }
  }
  return plannedResultV1(
    input,
    bestCount,
    best.request,
    best.requestByteLength,
    best.requestedOutputTokens,
  );
}
