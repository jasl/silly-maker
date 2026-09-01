// SPDX-License-Identifier: MIT

import type { TranslationSourceUnitV1 } from "../translation-document-codec.ts";

export interface BornDigitalPdfImportInputV1 {
  /** The caller retains its bytes; the browser adapter gives PDF.js an owned copy. */
  readonly bytes: Uint8Array;
  /** Ephemeral input only. The experiment does not persist PDF passwords. */
  readonly password?: string;
  readonly signal?: AbortSignal;
}

export interface BornDigitalPdfPageDiagnosticV1 {
  readonly pageNumber: number;
  readonly reason: "text_extraction_failed";
}

export interface BornDigitalPdfTextRectV1 {
  /**
   * Best-effort axis-aligned PDF user-space envelope. Rotated-text review
   * mapping remains outside this experiment's qualified boundary.
   */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BornDigitalPdfSourceMapEntryV1 {
  readonly unitId: string;
  readonly pageNumber: number;
  /** First PDF.js-authored physical line covered by this logical unit. */
  readonly physicalLineStart: number;
  /** Exclusive PDF.js-authored physical-line end covered by this logical unit. */
  readonly physicalLineEndExclusive: number;
  readonly itemStart: number;
  readonly itemEndExclusive: number;
  readonly direction: "ltr" | "rtl" | "ttb" | "mixed" | "unknown";
  readonly rect: BornDigitalPdfTextRectV1;
}

export interface BornDigitalPdfProjectionV1 {
  readonly projection: "pdf_text_reflow";
  readonly pageCount: number;
  readonly sourceUnits: readonly TranslationSourceUnitV1[];
  /** Geometry stays outside model prompts and supports later review/highlighting. */
  readonly sourceMap: readonly BornDigitalPdfSourceMapEntryV1[];
  readonly pageDiagnostics: readonly BornDigitalPdfPageDiagnosticV1[];
}

export type BornDigitalPdfImportResultV1 =
  | { readonly kind: "ready"; readonly document: BornDigitalPdfProjectionV1 }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "invalid_pdf"
      | "no_extractable_text"
      | "password_required"
      | "password_incorrect"
      | "cancelled";
    readonly pageCount: number | null;
    readonly pageDiagnostics: readonly BornDigitalPdfPageDiagnosticV1[];
  };

export interface BornDigitalPdfTextItemV1 {
  readonly itemIndex: number;
  readonly text: string;
  readonly direction: string;
  readonly transform: readonly number[];
  readonly width: number;
  readonly height: number;
  readonly hasEndOfLine: boolean;
}

interface MutablePdfLineV1 {
  readonly lineNumber: number;
  readonly itemStart: number;
  itemEndExclusive: number;
  readonly parts: string[];
  readonly directions: Set<string>;
  readonly fontHeights: number[];
  readonly baselines: number[];
  visibleItemCount: number;
  minimumX: number;
  minimumY: number;
  maximumX: number;
  maximumY: number;
}

interface MutablePdfLogicalUnitV1 {
  readonly physicalLineStart: number;
  physicalLineEndExclusive: number;
  itemStart: number;
  itemEndExclusive: number;
  source: string;
  readonly directions: Set<string>;
  minimumX: number;
  minimumY: number;
  maximumX: number;
  maximumY: number;
}

const noSpaceScriptEndV1 =
  /(?:\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul})$/u;
const noSpaceScriptStartV1 =
  /^(?:\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul})/u;

function translationUnitIdV1(order: number): string {
  return `translation.unit.${String(order + 1).padStart(6, "0")}`;
}

function finiteNumberV1(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function textItemRectV1(item: BornDigitalPdfTextItemV1): BornDigitalPdfTextRectV1 {
  const x = finiteNumberV1(item.transform[4] ?? 0);
  const y = finiteNumberV1(item.transform[5] ?? 0);
  const oppositeX = x + finiteNumberV1(item.width);
  const oppositeY = y + finiteNumberV1(item.height);
  const minimumX = Math.min(x, oppositeX);
  const minimumY = Math.min(y, oppositeY);
  return {
    x: minimumX,
    y: minimumY,
    width: Math.max(x, oppositeX) - minimumX,
    height: Math.max(y, oppositeY) - minimumY,
  };
}

function textItemFontHeightV1(item: BornDigitalPdfTextItemV1): number {
  const declaredHeight = Math.abs(finiteNumberV1(item.height));
  if (declaredHeight > 0) return declaredHeight;
  return Math.hypot(
    finiteNumberV1(item.transform[2] ?? 0),
    finiteNumberV1(item.transform[3] ?? 0),
  );
}

function beginLineV1(lineNumber: number, item: BornDigitalPdfTextItemV1): MutablePdfLineV1 {
  const rect = textItemRectV1(item);
  const visible = item.text.trim().length > 0;
  return {
    lineNumber,
    itemStart: item.itemIndex,
    itemEndExclusive: item.itemIndex + 1,
    parts: [item.text],
    directions: new Set(visible ? [item.direction] : []),
    fontHeights: visible ? [textItemFontHeightV1(item)] : [],
    baselines: visible ? [finiteNumberV1(item.transform[5] ?? 0)] : [],
    visibleItemCount: visible ? 1 : 0,
    minimumX: rect.x,
    minimumY: rect.y,
    maximumX: rect.x + rect.width,
    maximumY: rect.y + rect.height,
  };
}

function appendItemV1(line: MutablePdfLineV1, item: BornDigitalPdfTextItemV1): void {
  const rect = textItemRectV1(item);
  line.parts.push(item.text);
  line.itemEndExclusive = item.itemIndex + 1;
  if (item.text.trim().length === 0) return;
  line.directions.add(item.direction);
  line.fontHeights.push(textItemFontHeightV1(item));
  line.baselines.push(finiteNumberV1(item.transform[5] ?? 0));
  if (line.visibleItemCount === 0) {
    line.minimumX = rect.x;
    line.minimumY = rect.y;
    line.maximumX = rect.x + rect.width;
    line.maximumY = rect.y + rect.height;
    line.visibleItemCount = 1;
    return;
  }
  line.visibleItemCount += 1;
  line.minimumX = Math.min(line.minimumX, rect.x);
  line.minimumY = Math.min(line.minimumY, rect.y);
  line.maximumX = Math.max(line.maximumX, rect.x + rect.width);
  line.maximumY = Math.max(line.maximumY, rect.y + rect.height);
}

function lineDirectionV1(
  directions: ReadonlySet<string>,
): BornDigitalPdfSourceMapEntryV1["direction"] {
  const admitted = [...directions].filter((candidate) =>
    candidate === "ltr" || candidate === "rtl" || candidate === "ttb"
  );
  if (admitted.length === 0) return "unknown";
  if (new Set(admitted).size !== 1 || admitted.length !== directions.size) return "mixed";
  return admitted[0] as "ltr" | "rtl" | "ttb";
}

function medianPositiveV1(values: readonly number[]): number | null {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0).toSorted((a, b) =>
    a - b
  );
  if (positive.length === 0) return null;
  const middle = Math.floor(positive.length / 2);
  if (positive.length % 2 === 1) return positive[middle] ?? null;
  const lower = positive[middle - 1];
  const upper = positive[middle];
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2;
}

function medianFiniteV1(values: readonly number[]): number | null {
  const finite = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (finite.length === 0) return null;
  const middle = Math.floor(finite.length / 2);
  if (finite.length % 2 === 1) return finite[middle] ?? null;
  const lower = finite[middle - 1];
  const upper = finite[middle];
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2;
}

function physicalLineSourceV1(line: MutablePdfLineV1): string {
  return line.parts.join("").trim();
}

function looksLikeBulletStartV1(source: string): boolean {
  return /^(?:[-*\u2022\u2023\u25aa\u25e6]|(?:\d+|[A-Za-z])[.)])\s+/u.test(source);
}

function looksLikeHeadingV1(source: string): boolean {
  if (/^(?:chapter|section|article|appendix|part)\b/iu.test(source)) return true;
  const hasCasedLetter = source.toLowerCase() !== source.toUpperCase();
  return hasCasedLetter && source === source.toUpperCase();
}

function endsCompleteSentenceV1(source: string): boolean {
  return /[.!?\u3002\uff01\uff1f]["'\u2019\u201d)\]}\u3009\u300b\u300d\u300f]*$/u.test(source);
}

function comparableHorizontalDirectionV1(line: MutablePdfLineV1): "ltr" | "rtl" | null {
  const direction = lineDirectionV1(line.directions);
  return direction === "ltr" || direction === "rtl" ? direction : null;
}

function representativeBaselineV1(line: MutablePdfLineV1): number | null {
  return medianFiniteV1(line.baselines);
}

function shouldMergePhysicalContinuationV1(
  preceding: MutablePdfLineV1,
  following: MutablePdfLineV1,
): boolean {
  const precedingSource = physicalLineSourceV1(preceding);
  const followingSource = physicalLineSourceV1(following);
  if (precedingSource.length === 0 || followingSource.length === 0) return false;
  if (endsCompleteSentenceV1(precedingSource)) return false;
  if (looksLikeHeadingV1(precedingSource) || looksLikeHeadingV1(followingSource)) return false;
  if (looksLikeBulletStartV1(followingSource)) return false;

  const precedingDirection = comparableHorizontalDirectionV1(preceding);
  const followingDirection = comparableHorizontalDirectionV1(following);
  if (precedingDirection === null || precedingDirection !== followingDirection) return false;

  const precedingFontHeight = medianPositiveV1(preceding.fontHeights);
  const followingFontHeight = medianPositiveV1(following.fontHeights);
  if (precedingFontHeight === null || followingFontHeight === null) return false;
  const smallerFontHeight = Math.min(precedingFontHeight, followingFontHeight);
  const largerFontHeight = Math.max(precedingFontHeight, followingFontHeight);
  // A quarter-em tolerance admits PDF font-metric rounding while keeping a
  // visibly different heading/body tier out of the same logical unit.
  if (largerFontHeight - smallerFontHeight > smallerFontHeight / 4) return false;

  const precedingBaseline = representativeBaselineV1(preceding);
  const followingBaseline = representativeBaselineV1(following);
  if (precedingBaseline === null || followingBaseline === null) return false;
  const baselineStep = Math.abs(precedingBaseline - followingBaseline);
  // Ordinary single-column leading occupies roughly half to two em. A smaller
  // step suggests overlapping/side-by-side text; a larger one is a block gap.
  if (baselineStep < smallerFontHeight / 2 || baselineStep > largerFontHeight * 2) return false;

  const precedingLeadingEdge = precedingDirection === "ltr"
    ? preceding.minimumX
    : preceding.maximumX;
  const followingLeadingEdge = followingDirection === "ltr"
    ? following.minimumX
    : following.maximumX;
  // Two em permits ordinary first-line/hanging indentation but treats a larger
  // horizontal shift as a new block rather than guessing a column order.
  return Math.abs(precedingLeadingEdge - followingLeadingEdge) <= largerFontHeight * 2;
}

function joinsWithoutSpaceV1(preceding: string, following: string): boolean {
  return noSpaceScriptEndV1.test(preceding) && noSpaceScriptStartV1.test(following);
}

function joinPhysicalContinuationV1(preceding: string, following: string): string {
  const left = preceding.trimEnd();
  const right = following.trimStart();
  if (/[-\u00ad]$/u.test(left) && /^\p{Ll}/u.test(right)) {
    return `${left.slice(0, -1)}${right}`;
  }
  if (joinsWithoutSpaceV1(left, right) || /^[,.;:!?\u3001\u3002\uff01\uff1f]/u.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

function beginLogicalUnitV1(line: MutablePdfLineV1): MutablePdfLogicalUnitV1 {
  return {
    physicalLineStart: line.lineNumber,
    physicalLineEndExclusive: line.lineNumber + 1,
    itemStart: line.itemStart,
    itemEndExclusive: line.itemEndExclusive,
    source: physicalLineSourceV1(line),
    directions: new Set(line.directions),
    minimumX: line.minimumX,
    minimumY: line.minimumY,
    maximumX: line.maximumX,
    maximumY: line.maximumY,
  };
}

function appendPhysicalLineV1(
  logical: MutablePdfLogicalUnitV1,
  line: MutablePdfLineV1,
): void {
  logical.source = joinPhysicalContinuationV1(logical.source, physicalLineSourceV1(line));
  logical.physicalLineEndExclusive = line.lineNumber + 1;
  logical.itemStart = Math.min(logical.itemStart, line.itemStart);
  logical.itemEndExclusive = Math.max(logical.itemEndExclusive, line.itemEndExclusive);
  for (const direction of line.directions) logical.directions.add(direction);
  logical.minimumX = Math.min(logical.minimumX, line.minimumX);
  logical.minimumY = Math.min(logical.minimumY, line.minimumY);
  logical.maximumX = Math.max(logical.maximumX, line.maximumX);
  logical.maximumY = Math.max(logical.maximumY, line.maximumY);
}

export interface ProjectBornDigitalPdfPageInputV1 {
  readonly pageNumber: number;
  readonly firstUnitOrder: number;
  readonly items: readonly BornDigitalPdfTextItemV1[];
}

export interface ProjectBornDigitalPdfPageResultV1 {
  readonly sourceUnits: readonly TranslationSourceUnitV1[];
  readonly sourceMap: readonly BornDigitalPdfSourceMapEntryV1[];
}

/**
 * Preserves PDF.js-authored physical lines, then performs a conservative
 * best-effort single-column continuation merge. It does not claim general
 * reading order for columns, tables, rotated text, or arbitrary page layouts.
 */
export function projectBornDigitalPdfPageV1(
  input: ProjectBornDigitalPdfPageInputV1,
): ProjectBornDigitalPdfPageResultV1 {
  const physicalLines: MutablePdfLineV1[] = [];
  const sourceUnits: TranslationSourceUnitV1[] = [];
  const sourceMap: BornDigitalPdfSourceMapEntryV1[] = [];
  let lineNumber = 1;
  let physicalLine: MutablePdfLineV1 | null = null;

  const flushPhysicalLine = (): void => {
    if (physicalLine === null) return;
    physicalLines.push(physicalLine);
    physicalLine = null;
  };

  for (const item of input.items) {
    if (physicalLine === null) physicalLine = beginLineV1(lineNumber, item);
    else appendItemV1(physicalLine, item);
    if (!item.hasEndOfLine) continue;
    flushPhysicalLine();
    lineNumber += 1;
  }
  flushPhysicalLine();

  let logicalUnit: MutablePdfLogicalUnitV1 | null = null;
  let precedingPhysicalLine: MutablePdfLineV1 | null = null;
  const flushLogicalUnit = (): void => {
    if (logicalUnit === null) return;
    const logical = logicalUnit;
    logicalUnit = null;
    const order = input.firstUnitOrder + sourceUnits.length;
    const unitId = translationUnitIdV1(order);
    sourceUnits.push({
      unitId,
      order,
      locator: `pdf/page/${String(input.pageNumber).padStart(4, "0")}/line/${
        String(logical.physicalLineStart).padStart(4, "0")
      }`,
      context: null,
      durationMilliseconds: null,
      lineBreakPolicy: "forbidden",
      source: logical.source,
      protectedSegments: [],
    });
    sourceMap.push({
      unitId,
      pageNumber: input.pageNumber,
      physicalLineStart: logical.physicalLineStart,
      physicalLineEndExclusive: logical.physicalLineEndExclusive,
      itemStart: logical.itemStart,
      itemEndExclusive: logical.itemEndExclusive,
      direction: lineDirectionV1(logical.directions),
      rect: {
        x: logical.minimumX,
        y: logical.minimumY,
        width: logical.maximumX - logical.minimumX,
        height: logical.maximumY - logical.minimumY,
      },
    });
  };

  for (const line of physicalLines) {
    if (physicalLineSourceV1(line).length === 0) {
      flushLogicalUnit();
      precedingPhysicalLine = null;
      continue;
    }
    if (
      logicalUnit !== null && precedingPhysicalLine !== null &&
      shouldMergePhysicalContinuationV1(precedingPhysicalLine, line)
    ) {
      appendPhysicalLineV1(logicalUnit, line);
    } else {
      flushLogicalUnit();
      logicalUnit = beginLogicalUnitV1(line);
    }
    precedingPhysicalLine = line;
  }
  flushLogicalUnit();

  return { sourceUnits, sourceMap };
}
