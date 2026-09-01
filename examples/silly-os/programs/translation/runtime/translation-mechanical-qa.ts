// SPDX-License-Identifier: MIT

import type {
  TranslationBatchCandidateV1,
  TranslationBatchRequestV1,
  TranslationGlossaryEntryV1,
} from "./translation-batch-protocol.ts";

export type TranslationMechanicalQaFindingV1 =
  | {
    readonly code: "non_locked_glossary_missing";
    readonly severity: "warning";
    readonly unitId: string;
    readonly glossaryEntryId: string;
    readonly expectedTarget: string;
  }
  | {
    readonly code: "source_target_identical";
    readonly severity: "warning";
    readonly unitId: string;
  }
  | {
    readonly code: "number_tokens_changed";
    readonly severity: "warning";
    readonly unitId: string;
    readonly sourceTokens: readonly string[];
    readonly targetTokens: readonly string[];
  }
  | {
    readonly code: "line_break_count_changed";
    readonly severity: "warning";
    readonly unitId: string;
    readonly sourceCount: number;
    readonly targetCount: number;
  }
  | {
    readonly code: "target_looks_like_refusal";
    readonly severity: "warning";
    readonly unitId: string;
    readonly matchedPattern: TranslationRefusalPatternIdV1;
  }
  | {
    readonly code: "model_ambiguity";
    readonly severity: "review";
    readonly unitId: string;
    readonly question: string;
  };

const numberTokenPatternV1 =
  /[+\-\u2212\uFF0D]?\p{Decimal_Number}+(?:[.,\uFF0C\uFF0E]\p{Decimal_Number}+)*(?:[%\uFF05])?/gu;
const numberRangeDashPatternV1 =
  /(\p{Decimal_Number})\s*[-\u2010-\u2015\u2212\uFF0D]\s*(?=\p{Decimal_Number})/gu;
const leadingMinusPatternV1 = /^[\u2212\uFF0D]/u;
const linguisticTextPatternV1 = /[\p{Letter}\p{Mark}]/u;
const lineBreakPatternV1 = /\r\n?|\n/gu;

type TranslationRefusalPatternIdV1 =
  | "en.cannot_translate"
  | "en.unable_to_translate"
  | "en.request_refusal"
  | "zh.cannot_translate"
  | "zh.request_refusal";

const refusalPatternsByLanguageV1: Readonly<
  Record<
    "en" | "zh",
    readonly {
      readonly id: TranslationRefusalPatternIdV1;
      readonly pattern: RegExp;
    }[]
  >
> = {
  en: [
    {
      id: "en.cannot_translate",
      pattern:
        /\bi(?:[’']m| am) sorry(?:,\s*but)?\s+i\s+(?:cannot|can[’']t|can not)\s+(?:translate|provide (?:a|the|this) translation|assist with translating)\b/iu,
    },
    {
      id: "en.cannot_translate",
      pattern:
        /\b(?:sorry[,\s]+)?(?:i|we|this (?:ai|model|assistant))\s+(?:cannot|can[’']t|can not)\s+(?:translate|provide (?:a|the|this) translation|assist with translating)\b/iu,
    },
    {
      id: "en.unable_to_translate",
      pattern:
        /\b(?:sorry[,\s]+)?(?:i(?:[’']m| am)|we(?:[’']re| are)|this (?:ai|model|assistant) is)\s+unable\s+to\s+(?:translate|provide (?:a|the|this) translation|assist with translating)\b/iu,
    },
    {
      id: "en.request_refusal",
      pattern:
        /\b(?:sorry[,\s]+)?(?:i|we|this (?:ai|model|assistant))\s+(?:cannot|can[’']t|can not)\s+(?:assist|help|comply)\s+with\s+(?:this|that|the)\s+request\b/iu,
    },
    {
      id: "en.request_refusal",
      pattern:
        /\bi(?:[’']m| am) sorry(?:,\s*but)?\s+i\s+(?:cannot|can[’']t|can not)\s+(?:assist|help|comply)\s+with\s+(?:this|that|the)\s+request\b/iu,
    },
  ],
  zh: [
    {
      id: "zh.cannot_translate",
      pattern:
        /(?:抱歉[，,\s]*)?(?:我|我们|本(?:AI|模型|助手))\s*(?:无法|不能)\s*(?:为(?:你|您)\s*)?(?:翻译|提供(?:该|此|这)?(?:内容|文本|材料)?的?翻译|协助(?:进行)?翻译)/u,
    },
    {
      id: "zh.request_refusal",
      pattern:
        /(?:抱歉[，,\s]*)?(?:我|我们|本(?:AI|模型|助手))\s*(?:无法|不能)\s*(?:协助|帮助|处理|满足)(?:该|此|这)(?:请求|要求)/u,
    },
  ],
};

function baseLanguageV1(locale: string): "en" | "zh" | null {
  const base = locale.split("-", 1)[0]?.toLowerCase();
  return base === "en" || base === "zh" ? base : null;
}

function refusalPatternV1(
  value: string,
  language: "en" | "zh",
): TranslationRefusalPatternIdV1 | null {
  return refusalPatternsByLanguageV1[language].find(({ pattern }) => pattern.test(value))?.id ??
    null;
}

function sourceContainsExplicitRefusalV1(value: string): boolean {
  return refusalPatternV1(value, "en") !== null || refusalPatternV1(value, "zh") !== null;
}

function numberTokensV1(value: string): readonly string[] {
  const normalizedRanges = value.replace(numberRangeDashPatternV1, "$1 ");
  return Array.from(
    normalizedRanges.matchAll(numberTokenPatternV1),
    (match) => match[0].replace(leadingMinusPatternV1, "-"),
  );
}

function containsLinguisticTextV1(value: string): boolean {
  return linguisticTextPatternV1.test(value);
}

function sameTokenMultisetV1(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const remaining = new Map<string, number>();
  for (const token of left) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  for (const token of right) {
    const count = remaining.get(token);
    if (count === undefined) return false;
    if (count === 1) remaining.delete(token);
    else remaining.set(token, count - 1);
  }
  return remaining.size === 0;
}

function lineBreakCountV1(value: string): number {
  return Array.from(value.matchAll(lineBreakPatternV1)).length;
}

function nonLockedGlossaryByUnitV1(
  request: TranslationBatchRequestV1,
): ReadonlyMap<string, readonly TranslationGlossaryEntryV1[]> {
  const mutable = new Map<string, TranslationGlossaryEntryV1[]>();
  for (const entry of request.glossary) {
    if (entry.locked) continue;
    for (const unitId of entry.appliesToUnitIds) {
      const entries = mutable.get(unitId) ?? [];
      entries.push(entry);
      mutable.set(unitId, entries);
    }
  }
  return mutable;
}

/**
 * Projects non-blocking, unit-level review findings from an already-admitted
 * Translation request and candidate. The fixed detector order and authored
 * unit order make the result stable without introducing another finding ID or
 * persistence authority. Candidate admission remains the publication gate.
 */
export function evaluateTranslationMechanicalQaV1(
  request: TranslationBatchRequestV1,
  candidate: TranslationBatchCandidateV1,
): readonly TranslationMechanicalQaFindingV1[] {
  const targetsByUnitId = new Map(
    candidate.targets.map((target) => [target.unitId, target.target]),
  );
  const ambiguitiesByUnitId = new Map(
    candidate.ambiguities.map((ambiguity) => [ambiguity.unitId, ambiguity.question]),
  );
  const glossaryByUnitId = nonLockedGlossaryByUnitV1(request);
  const findings: TranslationMechanicalQaFindingV1[] = [];

  for (const unit of request.units) {
    const target = targetsByUnitId.get(unit.unitId)!;

    for (const entry of glossaryByUnitId.get(unit.unitId) ?? []) {
      if (!target.includes(entry.target)) {
        findings.push({
          code: "non_locked_glossary_missing",
          severity: "warning",
          unitId: unit.unitId,
          glossaryEntryId: entry.entryId,
          expectedTarget: entry.target,
        });
      }
    }

    if (
      request.sourceLocale !== request.targetLocale &&
      unit.source === target &&
      containsLinguisticTextV1(unit.source)
    ) {
      findings.push({
        code: "source_target_identical",
        severity: "warning",
        unitId: unit.unitId,
      });
    }

    const sourceTokens = numberTokensV1(unit.source);
    const targetTokens = numberTokensV1(target);
    if (!sameTokenMultisetV1(sourceTokens, targetTokens)) {
      findings.push({
        code: "number_tokens_changed",
        severity: "warning",
        unitId: unit.unitId,
        sourceTokens,
        targetTokens,
      });
    }

    if (unit.lineBreakPolicy === "flexible") {
      const sourceCount = lineBreakCountV1(unit.source);
      const targetCount = lineBreakCountV1(target);
      if (sourceCount !== targetCount) {
        findings.push({
          code: "line_break_count_changed",
          severity: "warning",
          unitId: unit.unitId,
          sourceCount,
          targetCount,
        });
      }
    }

    const targetLanguage = baseLanguageV1(request.targetLocale);
    const refusalPattern = targetLanguage === null
      ? null
      : refusalPatternV1(target, targetLanguage);
    if (refusalPattern !== null && !sourceContainsExplicitRefusalV1(unit.source)) {
      findings.push({
        code: "target_looks_like_refusal",
        severity: "warning",
        unitId: unit.unitId,
        matchedPattern: refusalPattern,
      });
    }

    const question = ambiguitiesByUnitId.get(unit.unitId);
    if (question !== undefined) {
      findings.push({
        code: "model_ambiguity",
        severity: "review",
        unitId: unit.unitId,
        question,
      });
    }
  }

  return findings;
}
