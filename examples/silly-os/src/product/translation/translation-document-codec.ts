// SPDX-License-Identifier: MIT

export type TranslationDocumentFormatV1 =
  | "plain_text"
  | "markdown"
  | "subrip"
  | "sillyos_translation_json"
  | "unknown";

type KnownTranslationDocumentFormatV1 = Exclude<TranslationDocumentFormatV1, "unknown">;

export type TranslationCapabilityGradeV1 =
  /** A declared format parsed and owns a deterministic structural exporter. */
  | "round_trip_supported"
  /** Readable text can be shown to a model, but no source format was admitted. */
  | "generic_text_only"
  /** Available evidence conflicts or a declared textual structure is malformed. */
  | "ambiguous"
  /** The input is non-textual or violates a closed structured schema. */
  | "unsupported";

export type TranslationCapabilityReasonV1 =
  | "known_format"
  | "format_not_declared"
  | "format_hints_conflict"
  | "malformed_markdown"
  | "malformed_subrip"
  | "malformed_sillyos_translation_json"
  | "non_text_media_type"
  | "protected_token_namespace_collision";

export type TranslationProtectedKindV1 =
  | "placeholder"
  | "markup_tag"
  | "markdown_code"
  | "link"
  | "markdown_syntax";

export interface TranslationProtectedSegmentV1 {
  /** Stable within this unit. The target must retain every token in source order. */
  readonly token: string;
  readonly kind: TranslationProtectedKindV1;
  /** Exact source bytes restored by the exporter; Agents do not rewrite this value. */
  readonly source: string;
}

export interface TranslationSourceUnitV1 {
  readonly unitId: string;
  readonly order: number;
  readonly locator: string;
  /** Optional author-supplied meaning or usage context; never part of target bytes. */
  readonly context: string | null;
  /** Exact cue duration for timed subtitle units; null for untimed formats. */
  readonly durationMilliseconds: number | null;
  /** Translatable source with immutable structures represented by visible tokens. */
  readonly source: string;
  readonly protectedSegments: readonly TranslationProtectedSegmentV1[];
}

export interface TranslationTargetUnitV1 {
  readonly unitId: string;
  readonly target: string;
}

export interface TranslationExportOptionsV1 {
  /** Replaces the JSON workpiece locale after a successful translation. */
  readonly targetLocale?: string;
}

export type TranslationExportResultV1 =
  | { readonly kind: "exported"; readonly text: string }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "duplicate_unit"
      | "unknown_unit"
      | "missing_unit"
      | "protected_content_changed"
      | "line_break_changed"
      | "invalid_target_locale";
    readonly unitId: string | null;
  };

interface TranslationDocumentBaseV1 {
  readonly format: TranslationDocumentFormatV1;
  readonly capability: {
    readonly grade: TranslationCapabilityGradeV1;
    readonly reason: TranslationCapabilityReasonV1;
  };
  readonly sourceUnits: readonly TranslationSourceUnitV1[];
}

export type PreparedTranslationDocumentV1 =
  | (TranslationDocumentBaseV1 & {
    readonly capability: {
      readonly grade: "round_trip_supported";
      readonly reason: "known_format";
    };
    readonly exportTranslation: (
      targets: readonly TranslationTargetUnitV1[],
      options?: TranslationExportOptionsV1,
    ) => TranslationExportResultV1;
  })
  | (TranslationDocumentBaseV1 & {
    readonly capability: {
      readonly grade: "generic_text_only" | "ambiguous" | "unsupported";
      readonly reason: Exclude<TranslationCapabilityReasonV1, "known_format">;
    };
    readonly exportTranslation: null;
  });

export interface PrepareTranslationDocumentInputV1 {
  readonly text: string;
  readonly fileName?: string;
  readonly mediaType?: string;
}

interface TextLineV1 {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

interface ProtectedRangeV1 {
  readonly start: number;
  readonly end: number;
  readonly kind: TranslationProtectedKindV1;
  readonly priority: number;
}

interface TokenizedTextV1 {
  readonly source: string;
  readonly protectedSegments: readonly TranslationProtectedSegmentV1[];
  readonly hasTranslatableText: boolean;
}

interface InternalTranslationUnitV1 extends TranslationSourceUnitV1 {
  readonly start: number;
  readonly end: number;
  readonly allowLineBreaks: boolean;
  readonly markdown: boolean;
  readonly encodeTarget: (target: string) => string;
}

interface JsonScalarValueV1 {
  readonly path: readonly (string | number)[];
  readonly value: string | number | boolean | null;
  readonly start: number;
  readonly end: number;
}

interface SillyOsTranslationJsonEntryV1 {
  readonly id: string;
  readonly text: string;
  readonly context: string;
  readonly locked: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

interface SillyOsTranslationJsonDocumentV1 {
  readonly schema: "sillyos.translation-document.v1";
  readonly sourceLocale: string;
  readonly targetLocale: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly entries: readonly SillyOsTranslationJsonEntryV1[];
}

const protectedTokenNamespaceV1 = "⟦SM:";
const protectedTokenPatternV1 = /⟦SM:\d+⟧/gu;

function protectedTokenV1(index: number): string {
  return `${protectedTokenNamespaceV1}${String(index)}⟧`;
}

function sourceUnitIdV1(order: number): string {
  return `translation.unit.${String(order + 1).padStart(6, "0")}`;
}

function scanTextLinesV1(text: string): readonly TextLineV1[] {
  const lines: TextLineV1[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start;
    while (end < text.length && text[end] !== "\r" && text[end] !== "\n") end += 1;
    lines.push({ text: text.slice(start, end), start, end });
    if (end >= text.length) break;
    start = text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
  }

  if (text.length === 0) return [];
  return lines;
}

function firstNonWhitespaceOffsetV1(text: string): number {
  const match = /\S/u.exec(text);
  return match?.index ?? text.length;
}

function trailingWhitespaceOffsetV1(text: string): number {
  const match = /\s*$/u.exec(text);
  return match?.index ?? text.length;
}

function isEscapedV1(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function addPatternRangesV1(
  ranges: ProtectedRangeV1[],
  text: string,
  pattern: RegExp,
  kind: TranslationProtectedKindV1,
  priority: number,
): void {
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined || match[0].length === 0) continue;
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      kind,
      priority,
    });
  }
}

function markdownCodeRangesV1(text: string): readonly ProtectedRangeV1[] | null {
  const ranges: ProtectedRangeV1[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf("`", cursor);
    if (start < 0) break;
    let runEnd = start + 1;
    while (text[runEnd] === "`") runEnd += 1;
    const delimiter = text.slice(start, runEnd);
    const endStart = text.indexOf(delimiter, runEnd);
    if (endStart < 0) return null;
    ranges.push({
      start,
      end: endStart + delimiter.length,
      kind: "markdown_code",
      priority: 100,
    });
    cursor = endStart + delimiter.length;
  }

  return ranges;
}

function closingSquareBracketV1(text: string, start: number): number {
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (text[cursor] === "]" && !isEscapedV1(text, cursor)) return cursor;
  }
  return -1;
}

function closingParenthesisV1(text: string, start: number): number {
  let depth = 0;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (isEscapedV1(text, cursor)) continue;
    if (text[cursor] === "(") depth += 1;
    if (text[cursor] !== ")") continue;
    depth -= 1;
    if (depth === 0) return cursor;
  }
  return -1;
}

function markdownLinkRangesV1(text: string): readonly ProtectedRangeV1[] {
  const ranges: ProtectedRangeV1[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const imageStart = text.indexOf("![", cursor);
    const linkStart = text.indexOf("[", cursor);
    const start = imageStart >= 0 && (linkStart < 0 || imageStart <= linkStart)
      ? imageStart
      : linkStart;
    if (start < 0) break;
    if (isEscapedV1(text, start)) {
      cursor = start + 1;
      continue;
    }
    const openingLength = text.startsWith("![", start) ? 2 : 1;
    const labelStart = start + openingLength;
    const labelEnd = closingSquareBracketV1(text, labelStart);
    if (labelEnd < 0) {
      cursor = labelStart;
      continue;
    }

    let suffixEnd = labelEnd + 1;
    if (text[labelEnd + 1] === "(") {
      const parenthesisEnd = closingParenthesisV1(text, labelEnd + 1);
      if (parenthesisEnd < 0) {
        cursor = labelEnd + 1;
        continue;
      }
      suffixEnd = parenthesisEnd + 1;
    } else if (text[labelEnd + 1] === "[") {
      const referenceEnd = closingSquareBracketV1(text, labelEnd + 2);
      if (referenceEnd < 0) {
        cursor = labelEnd + 1;
        continue;
      }
      suffixEnd = referenceEnd + 1;
    }

    ranges.push({
      start,
      end: labelStart,
      kind: "link",
      priority: 80,
    });
    ranges.push({
      start: labelEnd,
      end: suffixEnd,
      kind: "link",
      priority: 80,
    });
    cursor = suffixEnd;
  }

  return ranges;
}

function resolvedProtectedRangesV1(
  text: string,
  markdown: boolean,
): readonly ProtectedRangeV1[] | null {
  const ranges: ProtectedRangeV1[] = [];
  if (markdown) {
    const codeRanges = markdownCodeRangesV1(text);
    if (codeRanges === null) return null;
    ranges.push(...codeRanges, ...markdownLinkRangesV1(text));
    addPatternRangesV1(
      ranges,
      text,
      /\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/gu,
      "markdown_syntax",
      70,
    );
    addPatternRangesV1(
      ranges,
      text,
      /\*\*|__|~~|\*|~|\|(?!\|)/gu,
      "markdown_syntax",
      20,
    );
    addPatternRangesV1(
      ranges,
      text,
      /(?<![\p{L}\p{N}])_(?!\s)|(?<!\s)_(?![\p{L}\p{N}])/gu,
      "markdown_syntax",
      20,
    );
  }

  addPatternRangesV1(
    ranges,
    text,
    /<KEEP:[A-Za-z0-9_.-]+>|%[A-Z][A-Z0-9_]*%/gu,
    "placeholder",
    90,
  );
  addPatternRangesV1(
    ranges,
    text,
    /<\/?[A-Za-z][^<>\r\n]*\/?>|<(?:https?:\/\/|mailto:)[^<>\r\n]+>/gu,
    "markup_tag",
    60,
  );
  addPatternRangesV1(
    ranges,
    text,
    /https?:\/\/[^\s<>()[\]]+|[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu,
    "link",
    55,
  );
  addPatternRangesV1(
    ranges,
    text,
    /\{\{[^{}\r\n]+\}\}|\$\{[^{}\r\n]+\}|\{[A-Za-z_][A-Za-z0-9_.-]*\}|%\([A-Za-z_][A-Za-z0-9_.-]*\)[#0 +'-]*\d*(?:\.\d+)?[A-Za-z]|%(?:\d+\$)?[#0 +'-]*\d*(?:\.\d+)?[A-Za-z]/gu,
    "placeholder",
    50,
  );

  ranges.sort((left, right) =>
    left.start - right.start || right.priority - left.priority || right.end - left.end
  );
  const resolved: ProtectedRangeV1[] = [];
  let coveredUntil = 0;
  for (const range of ranges) {
    if (range.start < coveredUntil) continue;
    resolved.push(range);
    coveredUntil = range.end;
  }
  return resolved;
}

function tokenizeTranslatableTextV1(text: string, markdown: boolean): TokenizedTextV1 | null {
  if (text.includes(protectedTokenNamespaceV1)) return null;
  const ranges = resolvedProtectedRangesV1(text, markdown);
  if (ranges === null) return null;

  const protectedSegments: TranslationProtectedSegmentV1[] = [];
  let source = "";
  let cursor = 0;
  let hasTranslatableText = false;
  for (const range of ranges) {
    const plain = text.slice(cursor, range.start);
    source += plain;
    if (/\S/u.test(plain)) hasTranslatableText = true;
    const token = protectedTokenV1(protectedSegments.length + 1);
    protectedSegments.push({ token, kind: range.kind, source: text.slice(range.start, range.end) });
    source += token;
    cursor = range.end;
  }
  const tail = text.slice(cursor);
  source += tail;
  if (/\S/u.test(tail)) hasTranslatableText = true;

  return { source, protectedSegments, hasTranslatableText };
}

function protectedTokenAdjacencyV1(source: string, token: string): {
  readonly before: boolean;
  readonly after: boolean;
} | null {
  const start = source.indexOf(token);
  if (start < 0 || source.indexOf(token, start + token.length) >= 0) return null;
  const end = start + token.length;
  return {
    before: start > 0 && !/\s/u.test(source[start - 1] ?? ""),
    after: end < source.length && !/\s/u.test(source[end] ?? ""),
  };
}

function adjacencyIsStructuralV1(kind: TranslationProtectedKindV1): boolean {
  return kind === "markdown_syntax" || kind === "markup_tag" || kind === "link";
}

function pairedStructuralTokensV1(
  segments: readonly TranslationProtectedSegmentV1[],
): readonly (readonly [string, string])[] {
  const pairs: (readonly [string, string])[] = [];
  const markdownOpenBySource = new Map<string, string>();
  const markupOpenByName = new Map<string, string[]>();
  let linkOpening: string | null = null;

  for (const segment of segments) {
    if (segment.kind === "link") {
      if (segment.source === "[" || segment.source === "![") {
        linkOpening = segment.token;
      } else if (linkOpening !== null && segment.source.startsWith("]")) {
        pairs.push([linkOpening, segment.token]);
        linkOpening = null;
      }
      continue;
    }

    if (segment.kind === "markdown_syntax" && /^(?:\*\*|__|~~|\*|_|~)$/u.test(segment.source)) {
      const opening = markdownOpenBySource.get(segment.source);
      if (opening === undefined) markdownOpenBySource.set(segment.source, segment.token);
      else {
        pairs.push([opening, segment.token]);
        markdownOpenBySource.delete(segment.source);
      }
      continue;
    }

    if (segment.kind !== "markup_tag") continue;
    const closing = /^<\/([A-Za-z][A-Za-z0-9:-]*)\s*>$/u.exec(segment.source);
    if (closing !== null) {
      const openings = markupOpenByName.get(closing[1] ?? "");
      const opening = openings?.pop();
      if (opening !== undefined) pairs.push([opening, segment.token]);
      continue;
    }
    const opening = /^<([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*)?>$/u.exec(segment.source);
    if (opening === null || segment.source.endsWith("/>")) continue;
    const name = opening[1] ?? "";
    const openings = markupOpenByName.get(name) ?? [];
    openings.push(segment.token);
    markupOpenByName.set(name, openings);
  }
  return pairs;
}

function contentBetweenTokensV1(source: string, opening: string, closing: string): string | null {
  const openingStart = source.indexOf(opening);
  const closingStart = source.indexOf(closing, openingStart + opening.length);
  if (openingStart < 0 || closingStart < 0) return null;
  return source.slice(openingStart + opening.length, closingStart);
}

/**
 * Checks the exact token sequence and the adjacency that makes Markdown/link/
 * markup tokens structural. Placeholder and code-token spacing may still move
 * with the target language; their bytes and order remain immutable.
 */
export function translationTargetPreservesProtectedStructureV1(
  unit: TranslationSourceUnitV1,
  target: string,
): boolean {
  const foundTokens = Array.from(target.matchAll(protectedTokenPatternV1), (match) => match[0]);
  const expectedTokens = unit.protectedSegments.map((segment) => segment.token);
  if (
    target.includes(protectedTokenNamespaceV1) && foundTokens.length === 0 ||
    foundTokens.length !== expectedTokens.length ||
    foundTokens.some((token, index) => token !== expectedTokens[index])
  ) return false;

  for (const segment of unit.protectedSegments) {
    if (!adjacencyIsStructuralV1(segment.kind)) continue;
    const sourceAdjacency = protectedTokenAdjacencyV1(unit.source, segment.token);
    const targetAdjacency = protectedTokenAdjacencyV1(target, segment.token);
    if (
      sourceAdjacency === null || targetAdjacency === null ||
      sourceAdjacency.before && !targetAdjacency.before ||
      sourceAdjacency.after && !targetAdjacency.after
    ) return false;
  }
  for (const [opening, closing] of pairedStructuralTokensV1(unit.protectedSegments)) {
    const sourceContent = contentBetweenTokensV1(unit.source, opening, closing);
    const targetContent = contentBetweenTokensV1(target, opening, closing);
    if (sourceContent === null || targetContent === null) return false;
    if (/\S/u.test(sourceContent) && !/\S/u.test(targetContent)) return false;
  }
  return true;
}

function restoreProtectedSegmentsV1(
  unit: InternalTranslationUnitV1,
  target: string,
): string | null {
  if (!translationTargetPreservesProtectedStructureV1(unit, target)) return null;

  let restored = target;
  for (const segment of unit.protectedSegments) {
    restored = restored.replace(segment.token, segment.source);
  }
  if (restored.includes(protectedTokenNamespaceV1)) return null;
  const retokenized = tokenizeTranslatableTextV1(restored, unit.markdown);
  if (
    retokenized === null || retokenized.protectedSegments.length !== unit.protectedSegments.length
  ) {
    return null;
  }
  if (
    retokenized.protectedSegments.some((segment, index) => {
      const original = unit.protectedSegments[index];
      return original === undefined || segment.kind !== original.kind ||
        segment.source !== original.source;
    })
  ) return null;
  return restored;
}

function createInternalUnitV1(input: {
  readonly order: number;
  readonly locator: string;
  readonly sourceText: string;
  readonly start: number;
  readonly end: number;
  readonly markdown: boolean;
  readonly allowLineBreaks: boolean;
  readonly context?: string;
  readonly durationMilliseconds?: number;
  readonly encodeTarget?: (target: string) => string;
}): InternalTranslationUnitV1 | null {
  const tokenized = tokenizeTranslatableTextV1(input.sourceText, input.markdown);
  if (tokenized === null || !tokenized.hasTranslatableText) return null;
  return {
    unitId: sourceUnitIdV1(input.order),
    order: input.order,
    locator: input.locator,
    context: input.context ?? null,
    durationMilliseconds: input.durationMilliseconds ?? null,
    source: tokenized.source,
    protectedSegments: tokenized.protectedSegments,
    start: input.start,
    end: input.end,
    allowLineBreaks: input.allowLineBreaks,
    markdown: input.markdown,
    encodeTarget: input.encodeTarget ?? ((target) => target),
  };
}

function createLineUnitV1(input: {
  readonly order: number;
  readonly locator: string;
  readonly line: TextLineV1;
  readonly prefixLength?: number;
  readonly markdown: boolean;
  readonly durationMilliseconds?: number;
}): InternalTranslationUnitV1 | null {
  const prefixLength = input.prefixLength ?? 0;
  const candidate = input.line.text.slice(prefixLength);
  const leading = firstNonWhitespaceOffsetV1(candidate);
  const trailing = trailingWhitespaceOffsetV1(candidate);
  if (leading >= trailing) return null;
  const timing = input.durationMilliseconds === undefined
    ? {}
    : { durationMilliseconds: input.durationMilliseconds };
  return createInternalUnitV1({
    order: input.order,
    locator: input.locator,
    sourceText: candidate.slice(leading, trailing),
    start: input.line.start + prefixLength + leading,
    end: input.line.start + prefixLength + trailing,
    markdown: input.markdown,
    allowLineBreaks: false,
    ...timing,
  });
}

function reindexUnitsV1(
  units: readonly InternalTranslationUnitV1[],
): readonly InternalTranslationUnitV1[] {
  return units.map((unit, order) => ({ ...unit, unitId: sourceUnitIdV1(order), order }));
}

function buildPlainTextUnitsV1(text: string): readonly InternalTranslationUnitV1[] {
  const units: InternalTranslationUnitV1[] = [];
  for (const [lineIndex, line] of scanTextLinesV1(text).entries()) {
    const unit = createLineUnitV1({
      order: units.length,
      locator: `line/${String(lineIndex + 1)}`,
      line,
      markdown: false,
    });
    if (unit !== null) units.push(unit);
  }
  return units;
}

function markdownFencedLineIndexesV1(lines: readonly TextLineV1[]): ReadonlySet<number> | null {
  const fenced = new Set<number>();
  let open: { readonly marker: "`" | "~"; readonly length: number } | null = null;

  for (const [lineIndex, line] of lines.entries()) {
    if (open === null) {
      const match = /^\s{0,3}(`{3,}|~{3,})/u.exec(line.text);
      if (match === null) continue;
      const markerText = match[1];
      if (markerText === undefined) continue;
      open = { marker: markerText[0] as "`" | "~", length: markerText.length };
      fenced.add(lineIndex);
      continue;
    }

    fenced.add(lineIndex);
    const closePattern = open.marker === "`" ? /^\s{0,3}(`{3,})\s*$/u : /^\s{0,3}(~{3,})\s*$/u;
    const match = closePattern.exec(line.text);
    const markerText = match?.[1];
    if (markerText !== undefined && markerText.length >= open.length) open = null;
  }

  return open === null ? fenced : null;
}

function buildMarkdownUnitsV1(text: string): readonly InternalTranslationUnitV1[] | null {
  const lines = scanTextLinesV1(text);
  const fenced = markdownFencedLineIndexesV1(lines);
  if (fenced === null) return null;
  const units: InternalTranslationUnitV1[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (fenced.has(lineIndex)) continue;
    if (/^\s{4}/u.test(line.text)) continue;
    if (/^\s{0,3}(?:\[[^\]]+\]:|(?:[-*_]\s*){3,})/u.test(line.text)) continue;
    if (
      /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u.test(line.text)
    ) continue;

    const prefix = /^(\s{0,3}(?:(?:#{1,6}|>)\s+|(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?))/u
      .exec(line.text)?.[0].length ?? 0;
    const unit = createLineUnitV1({
      order: units.length,
      locator: `line/${String(lineIndex + 1)}`,
      line,
      prefixLength: prefix,
      markdown: true,
    });
    if (unit === null) {
      const candidate = line.text.slice(prefix).trim();
      if (candidate.includes("`") && /\S/u.test(candidate.replaceAll("`", ""))) return null;
      continue;
    }
    units.push(unit);
  }

  return units;
}

function buildSubRipUnitsV1(text: string): readonly InternalTranslationUnitV1[] | null {
  const lines = scanTextLinesV1(text);
  const blocks: TextLineV1[][] = [];
  let current: TextLineV1[] = [];
  for (const line of lines) {
    if (line.text.trim() === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  if (blocks.length === 0) return null;

  const units: InternalTranslationUnitV1[] = [];
  for (const [blockIndex, block] of blocks.entries()) {
    const [numberLine, timingLine, ...textLines] = block;
    if (numberLine === undefined || timingLine === undefined || textLines.length === 0) return null;
    const cueNumber = numberLine.text.replace(/^\uFEFF/u, "").trim();
    if (!/^\d+$/u.test(cueNumber)) return null;
    const timing =
      /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2,}):(\d{2}):(\d{2}),(\d{3})(?:\s+.*)?$/u
        .exec(timingLine.text.trim());
    if (timing === null) return null;
    const [, startHour, startMinute, startSecond, startMs, endHour, endMinute, endSecond, endMs] =
      timing;
    if (
      startHour === undefined || startMinute === undefined || startSecond === undefined ||
      startMs === undefined || endHour === undefined || endMinute === undefined ||
      endSecond === undefined || endMs === undefined
    ) return null;
    const timestampMilliseconds = (hour: string, minute: string, second: string, ms: string) =>
      Number(hour) * 3_600_000 + Number(minute) * 60_000 + Number(second) * 1_000 + Number(ms);
    const cueStart = timestampMilliseconds(startHour, startMinute, startSecond, startMs);
    const cueEnd = timestampMilliseconds(endHour, endMinute, endSecond, endMs);
    const durationMilliseconds = cueEnd - cueStart;
    if (durationMilliseconds <= 0) return null;

    for (const [textLineIndex, line] of textLines.entries()) {
      const unit = createLineUnitV1({
        order: units.length,
        locator: `cue/${cueNumber}/line/${String(textLineIndex + 1)}`,
        line,
        markdown: false,
        durationMilliseconds,
      });
      if (unit !== null) units.push(unit);
    }
    if (blockIndex === 0 && numberLine.text.startsWith("\uFEFF") && numberLine.start !== 0) {
      return null;
    }
  }

  return units;
}

function exactKeysV1(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function exactOptionalKeysV1(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const actual = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) &&
    actual.every((key) => allowed.has(key));
}

function jsonMetadataV1(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function admitSillyOsTranslationJsonDocumentV1(
  value: unknown,
): SillyOsTranslationJsonDocumentV1 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    !exactOptionalKeysV1(
      row,
      ["schema", "sourceLocale", "targetLocale", "entries"],
      ["metadata"],
    )
  ) return null;
  if (
    row.schema !== "sillyos.translation-document.v1" ||
    typeof row.sourceLocale !== "string" || row.sourceLocale.length === 0 ||
    !(row.targetLocale === null ||
      typeof row.targetLocale === "string" && row.targetLocale.length > 0)
  ) return null;
  if (!Array.isArray(row.entries)) return null;
  const metadata = row.metadata === undefined ? undefined : jsonMetadataV1(row.metadata);
  if (metadata === null) return null;

  const entries: SillyOsTranslationJsonEntryV1[] = [];
  const ids = new Set<string>();
  for (const valueEntry of row.entries) {
    if (typeof valueEntry !== "object" || valueEntry === null || Array.isArray(valueEntry)) {
      return null;
    }
    const entry = valueEntry as Record<string, unknown>;
    if (!exactKeysV1(entry, ["id", "text", "context", "locked", "metadata"])) return null;
    const entryMetadata = jsonMetadataV1(entry.metadata);
    if (
      typeof entry.id !== "string" || entry.id.length === 0 || ids.has(entry.id) ||
      typeof entry.text !== "string" || typeof entry.context !== "string" ||
      typeof entry.locked !== "boolean" || entryMetadata === null
    ) return null;
    ids.add(entry.id);
    entries.push({
      id: entry.id,
      text: entry.text,
      context: entry.context,
      locked: entry.locked,
      metadata: entryMetadata,
    });
  }

  const admitted: SillyOsTranslationJsonDocumentV1 = {
    schema: "sillyos.translation-document.v1",
    sourceLocale: row.sourceLocale,
    targetLocale: row.targetLocale,
    entries,
  };
  return metadata === undefined ? admitted : { ...admitted, metadata };
}

function parseJsonStringV1(
  text: string,
  start: number,
): { readonly value: string; readonly end: number } {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (text[cursor] === '"') {
      const end = cursor + 1;
      return { value: JSON.parse(text.slice(start, end)) as string, end };
    }
    cursor += 1;
  }
  throw new Error("sillyos.translation.json_string_unterminated");
}

function scanJsonScalarValuesV1(text: string): readonly JsonScalarValueV1[] {
  const values: JsonScalarValueV1[] = [];
  let cursor = 0;

  const skipWhitespace = (): void => {
    while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
  };
  const parseValue = (path: readonly (string | number)[]): void => {
    skipWhitespace();
    if (text[cursor] === '"') {
      const start = cursor;
      const parsed = parseJsonStringV1(text, start);
      cursor = parsed.end;
      values.push({ path, value: parsed.value, start, end: parsed.end });
      return;
    }
    if (text[cursor] === "{") {
      cursor += 1;
      skipWhitespace();
      const keys = new Set<string>();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      while (cursor < text.length) {
        skipWhitespace();
        if (text[cursor] !== '"') throw new Error("sillyos.translation.json_key_expected");
        const key = parseJsonStringV1(text, cursor);
        cursor = key.end;
        if (keys.has(key.value)) throw new Error("sillyos.translation.json_duplicate_key");
        keys.add(key.value);
        skipWhitespace();
        if (text[cursor] !== ":") throw new Error("sillyos.translation.json_colon_expected");
        cursor += 1;
        parseValue([...path, key.value]);
        skipWhitespace();
        if (text[cursor] === "}") {
          cursor += 1;
          return;
        }
        if (text[cursor] !== ",") throw new Error("sillyos.translation.json_comma_expected");
        cursor += 1;
      }
      throw new Error("sillyos.translation.json_object_unterminated");
    }
    if (text[cursor] === "[") {
      cursor += 1;
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      let index = 0;
      while (cursor < text.length) {
        parseValue([...path, index]);
        index += 1;
        skipWhitespace();
        if (text[cursor] === "]") {
          cursor += 1;
          return;
        }
        if (text[cursor] !== ",") throw new Error("sillyos.translation.json_comma_expected");
        cursor += 1;
      }
      throw new Error("sillyos.translation.json_array_unterminated");
    }

    const primitive = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(
      text.slice(cursor),
    );
    if (primitive === null) throw new Error("sillyos.translation.json_value_expected");
    const start = cursor;
    cursor += primitive[0].length;
    values.push({
      path,
      value: JSON.parse(primitive[0]) as number | boolean | null,
      start,
      end: cursor,
    });
  };

  parseValue([]);
  skipWhitespace();
  if (cursor !== text.length) throw new Error("sillyos.translation.json_trailing_content");
  return values;
}

function jsonPathKeyV1(path: readonly (string | number)[]): string {
  return JSON.stringify(path);
}

function escapeLocatorSegmentV1(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function buildSillyOsTranslationJsonUnitsV1(
  text: string,
): readonly InternalTranslationUnitV1[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const document = admitSillyOsTranslationJsonDocumentV1(parsed);
  if (document === null) return null;

  let scalarValues: readonly JsonScalarValueV1[];
  try {
    scalarValues = scanJsonScalarValuesV1(text);
  } catch {
    return null;
  }
  const byPath = new Map(scalarValues.map((value) => [jsonPathKeyV1(value.path), value]));
  const units: InternalTranslationUnitV1[] = [];

  const append = (
    path: readonly (string | number)[],
    locator: string,
    context: string,
  ): boolean => {
    const value = byPath.get(jsonPathKeyV1(path));
    if (
      value === undefined || typeof value.value !== "string" ||
      value.value.includes(protectedTokenNamespaceV1)
    ) return false;
    const unit = createInternalUnitV1({
      order: units.length,
      locator,
      sourceText: value.value,
      start: value.start,
      end: value.end,
      markdown: false,
      allowLineBreaks: true,
      context,
      encodeTarget: (target) => JSON.stringify(target),
    });
    if (unit !== null) units.push(unit);
    return true;
  };

  for (const [entryIndex, entry] of document.entries.entries()) {
    if (entry.locked) continue;
    const locatorBase = `entries/${escapeLocatorSegmentV1(entry.id)}`;
    if (!append(["entries", entryIndex, "text"], `${locatorBase}/text`, entry.context)) {
      return null;
    }
  }
  return reindexUnitsV1(units);
}

function publicSourceUnitsV1(
  units: readonly InternalTranslationUnitV1[],
): readonly TranslationSourceUnitV1[] {
  return units.map(({
    unitId,
    order,
    locator,
    context,
    durationMilliseconds,
    source,
    protectedSegments,
  }) => ({
    unitId,
    order,
    locator,
    context,
    durationMilliseconds,
    source,
    protectedSegments,
  }));
}

function jsonTargetLocalePatchV1(
  sourceText: string,
  targetLocale: string,
): { readonly start: number; readonly end: number; readonly replacement: string } | null {
  let values: readonly JsonScalarValueV1[];
  try {
    values = scanJsonScalarValuesV1(sourceText);
  } catch {
    return null;
  }
  const locale = values.find((value) => jsonPathKeyV1(value.path) === '["targetLocale"]');
  return locale === undefined
    ? null
    : { start: locale.start, end: locale.end, replacement: JSON.stringify(targetLocale) };
}

function exportTranslationV1(
  format: KnownTranslationDocumentFormatV1,
  sourceText: string,
  units: readonly InternalTranslationUnitV1[],
  targets: readonly TranslationTargetUnitV1[],
  options: TranslationExportOptionsV1 | undefined,
): TranslationExportResultV1 {
  const unitsById = new Map(units.map((unit) => [unit.unitId, unit]));
  const targetsById = new Map<string, TranslationTargetUnitV1>();
  for (const target of targets) {
    if (targetsById.has(target.unitId)) {
      return { kind: "rejected", reason: "duplicate_unit", unitId: target.unitId };
    }
    if (!unitsById.has(target.unitId)) {
      return { kind: "rejected", reason: "unknown_unit", unitId: target.unitId };
    }
    targetsById.set(target.unitId, target);
  }

  const patches: { readonly start: number; readonly end: number; readonly replacement: string }[] =
    [];
  if (
    format === "sillyos_translation_json" && options?.targetLocale === undefined &&
    units.some((unit) => targetsById.get(unit.unitId)?.target !== unit.source)
  ) {
    return { kind: "rejected", reason: "invalid_target_locale", unitId: null };
  }
  if (format === "sillyos_translation_json" && options?.targetLocale !== undefined) {
    const targetLocale = options.targetLocale.trim();
    if (targetLocale.length === 0) {
      return { kind: "rejected", reason: "invalid_target_locale", unitId: null };
    }
    const localePatch = jsonTargetLocalePatchV1(sourceText, targetLocale);
    if (localePatch === null) {
      return { kind: "rejected", reason: "invalid_target_locale", unitId: null };
    }
    patches.push(localePatch);
  }
  for (const unit of units) {
    const target = targetsById.get(unit.unitId);
    if (target === undefined) {
      return { kind: "rejected", reason: "missing_unit", unitId: unit.unitId };
    }
    if (!unit.allowLineBreaks && /[\r\n]/u.test(target.target)) {
      return { kind: "rejected", reason: "line_break_changed", unitId: unit.unitId };
    }
    const restored = restoreProtectedSegmentsV1(unit, target.target);
    if (restored === null) {
      return { kind: "rejected", reason: "protected_content_changed", unitId: unit.unitId };
    }
    patches.push({ start: unit.start, end: unit.end, replacement: unit.encodeTarget(restored) });
  }

  patches.sort((left, right) => left.start - right.start);
  let output = "";
  let cursor = 0;
  for (const patch of patches) {
    output += sourceText.slice(cursor, patch.start);
    output += patch.replacement;
    cursor = patch.end;
  }
  output += sourceText.slice(cursor);
  return { kind: "exported", text: output };
}

function roundTripDocumentV1(
  format: KnownTranslationDocumentFormatV1,
  sourceText: string,
  units: readonly InternalTranslationUnitV1[],
): PreparedTranslationDocumentV1 {
  return {
    format,
    capability: { grade: "round_trip_supported", reason: "known_format" },
    sourceUnits: publicSourceUnitsV1(units),
    exportTranslation: (targets, options) =>
      exportTranslationV1(format, sourceText, units, targets, options),
  };
}

function extractionUnitsV1(text: string): readonly TranslationSourceUnitV1[] {
  if (text.includes(protectedTokenNamespaceV1)) {
    const units: TranslationSourceUnitV1[] = [];
    for (const [lineIndex, line] of scanTextLinesV1(text).entries()) {
      const leading = firstNonWhitespaceOffsetV1(line.text);
      const trailing = trailingWhitespaceOffsetV1(line.text);
      if (leading >= trailing) continue;
      units.push({
        unitId: sourceUnitIdV1(units.length),
        order: units.length,
        locator: `line/${String(lineIndex + 1)}`,
        context: null,
        durationMilliseconds: null,
        source: line.text.slice(leading, trailing),
        protectedSegments: [],
      });
    }
    return units;
  }
  return publicSourceUnitsV1(buildPlainTextUnitsV1(text));
}

function nonRoundTripDocumentV1(input: {
  readonly format: TranslationDocumentFormatV1;
  readonly grade: "generic_text_only" | "ambiguous" | "unsupported";
  readonly reason: Exclude<TranslationCapabilityReasonV1, "known_format">;
  readonly text: string;
}): PreparedTranslationDocumentV1 {
  return {
    format: input.format,
    capability: { grade: input.grade, reason: input.reason },
    sourceUnits: input.grade === "unsupported" ? [] : extractionUnitsV1(input.text),
    exportTranslation: null,
  };
}

function formatFromFileNameV1(
  fileName: string | undefined,
): KnownTranslationDocumentFormatV1 | null {
  const lower = fileName?.trim().toLowerCase() ?? "";
  if (lower.endsWith(".txt")) return "plain_text";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".srt")) return "subrip";
  if (lower.endsWith(".json")) return "sillyos_translation_json";
  return null;
}

function normalizedMediaTypeV1(mediaType: string | undefined): string {
  return mediaType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function formatFromMediaTypeV1(
  mediaType: string | undefined,
): KnownTranslationDocumentFormatV1 | null {
  const normalized = normalizedMediaTypeV1(mediaType);
  if (normalized === "text/plain") return "plain_text";
  if (normalized === "text/markdown") return "markdown";
  if (normalized === "application/x-subrip" || normalized === "text/srt") return "subrip";
  if (normalized === "application/json") return "sillyos_translation_json";
  return null;
}

function buildKnownFormatUnitsV1(
  format: KnownTranslationDocumentFormatV1,
  text: string,
): readonly InternalTranslationUnitV1[] | null {
  if (format === "plain_text") return buildPlainTextUnitsV1(text);
  if (format === "markdown") return buildMarkdownUnitsV1(text);
  if (format === "subrip") return buildSubRipUnitsV1(text);
  return buildSillyOsTranslationJsonUnitsV1(text);
}

function formatSpecificityV1(format: KnownTranslationDocumentFormatV1): number {
  if (format === "sillyos_translation_json") return 4;
  if (format === "subrip") return 3;
  if (format === "markdown") return 2;
  return 1;
}

function malformedFormatReasonV1(
  format: Exclude<KnownTranslationDocumentFormatV1, "plain_text">,
): Exclude<TranslationCapabilityReasonV1, "known_format"> {
  if (format === "markdown") return "malformed_markdown";
  if (format === "subrip") return "malformed_subrip";
  return "malformed_sillyos_translation_json";
}

/**
 * Prepares one product-private translation workpiece. Known formats receive an
 * exact structural exporter; uncertain inputs remain readable but never claim
 * a safe round trip.
 */
export function prepareTranslationDocumentV1(
  input: PrepareTranslationDocumentInputV1,
): PreparedTranslationDocumentV1 {
  const fileFormat = formatFromFileNameV1(input.fileName);
  const mediaFormat = formatFromMediaTypeV1(input.mediaType);
  const format = fileFormat ?? mediaFormat;
  const hintsConflict = fileFormat !== null && mediaFormat !== null && fileFormat !== mediaFormat;

  if (format === null) {
    const normalizedMediaType = normalizedMediaTypeV1(input.mediaType);
    const nonTextMediaType = normalizedMediaType !== "" &&
      !normalizedMediaType.startsWith("text/");
    return nonRoundTripDocumentV1({
      format: "unknown",
      grade: nonTextMediaType ? "unsupported" : "generic_text_only",
      reason: nonTextMediaType ? "non_text_media_type" : "format_not_declared",
      text: input.text,
    });
  }

  if (input.text.includes(protectedTokenNamespaceV1)) {
    return nonRoundTripDocumentV1({
      format: hintsConflict ? "unknown" : format,
      grade: "ambiguous",
      reason: "protected_token_namespace_collision",
      text: input.text,
    });
  }

  if (hintsConflict) {
    const candidates = [fileFormat, mediaFormat]
      .filter((candidate): candidate is KnownTranslationDocumentFormatV1 => candidate !== null)
      .map((candidate) => ({
        format: candidate,
        units: buildKnownFormatUnitsV1(candidate, input.text),
      }))
      .filter((candidate): candidate is {
        readonly format: KnownTranslationDocumentFormatV1;
        readonly units: readonly InternalTranslationUnitV1[];
      } => candidate.units !== null)
      .sort((left, right) => formatSpecificityV1(right.format) - formatSpecificityV1(left.format));
    const selected = candidates[0];
    return selected === undefined
      ? nonRoundTripDocumentV1({
        format: "unknown",
        grade: "ambiguous",
        reason: "format_hints_conflict",
        text: input.text,
      })
      : roundTripDocumentV1(selected.format, input.text, selected.units);
  }

  const units = buildKnownFormatUnitsV1(format, input.text);
  if (units !== null) return roundTripDocumentV1(format, input.text, units);
  if (format === "plain_text") throw new Error("sillyos.translation.plain_text_unreachable");
  return nonRoundTripDocumentV1({
    format,
    grade: format === "sillyos_translation_json" ? "unsupported" : "ambiguous",
    reason: malformedFormatReasonV1(format),
    text: input.text,
  });
}
