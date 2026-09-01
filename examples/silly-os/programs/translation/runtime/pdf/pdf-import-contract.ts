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
  readonly lineNumber: number;
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
  minimumX: number;
  minimumY: number;
  maximumX: number;
  maximumY: number;
}

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

function beginLineV1(lineNumber: number, item: BornDigitalPdfTextItemV1): MutablePdfLineV1 {
  const rect = textItemRectV1(item);
  return {
    lineNumber,
    itemStart: item.itemIndex,
    itemEndExclusive: item.itemIndex + 1,
    parts: [item.text],
    directions: new Set([item.direction]),
    minimumX: rect.x,
    minimumY: rect.y,
    maximumX: rect.x + rect.width,
    maximumY: rect.y + rect.height,
  };
}

function appendItemV1(line: MutablePdfLineV1, item: BornDigitalPdfTextItemV1): void {
  const rect = textItemRectV1(item);
  line.parts.push(item.text);
  line.directions.add(item.direction);
  line.itemEndExclusive = item.itemIndex + 1;
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
 * Projects only PDF.js-authored end-of-line boundaries. It deliberately does
 * not guess paragraphs, columns, tables, or semantic reading order from
 * coordinates; those require corpus-backed qualification rather than hidden
 * layout heuristics.
 */
export function projectBornDigitalPdfPageV1(
  input: ProjectBornDigitalPdfPageInputV1,
): ProjectBornDigitalPdfPageResultV1 {
  const sourceUnits: TranslationSourceUnitV1[] = [];
  const sourceMap: BornDigitalPdfSourceMapEntryV1[] = [];
  let lineNumber = 1;
  let current: MutablePdfLineV1 | null = null;

  const flush = (): void => {
    if (current === null) return;
    const line = current;
    current = null;
    const source = line.parts.join("").trim();
    if (source.length === 0) return;
    const order = input.firstUnitOrder + sourceUnits.length;
    const unitId = translationUnitIdV1(order);
    sourceUnits.push({
      unitId,
      order,
      locator: `pdf/page/${String(input.pageNumber).padStart(4, "0")}/line/${
        String(line.lineNumber).padStart(4, "0")
      }`,
      context: null,
      durationMilliseconds: null,
      source,
      protectedSegments: [],
    });
    sourceMap.push({
      unitId,
      pageNumber: input.pageNumber,
      lineNumber: line.lineNumber,
      itemStart: line.itemStart,
      itemEndExclusive: line.itemEndExclusive,
      direction: lineDirectionV1(line.directions),
      rect: {
        x: line.minimumX,
        y: line.minimumY,
        width: line.maximumX - line.minimumX,
        height: line.maximumY - line.minimumY,
      },
    });
  };

  for (const item of input.items) {
    if (current === null) current = beginLineV1(lineNumber, item);
    else appendItemV1(current, item);
    if (!item.hasEndOfLine) continue;
    flush();
    lineNumber += 1;
  }
  flush();

  return { sourceUnits, sourceMap };
}
