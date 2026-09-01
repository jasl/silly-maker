// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type {
  TranslationBatchCandidateV1,
  TranslationBatchRequestV1,
} from "../runtime/translation-batch-protocol.ts";
import { evaluateTranslationMechanicalQaV1 } from "../runtime/translation-mechanical-qa.ts";

const requestV1: TranslationBatchRequestV1 = {
  sourceLocale: "zh-CN",
  targetLocale: "en",
  documentPurpose: "A fictional game scene.",
  style: "Natural, concise dialogue.",
  glossary: [
    {
      entryId: "glossary.echo",
      source: "回声",
      target: "Echo",
      note: "Project codename.",
      locked: false,
      appliesToUnitIds: ["unit.1"],
    },
    {
      entryId: "glossary.channel",
      source: "频道",
      target: "channel",
      note: null,
      locked: false,
      appliesToUnitIds: ["unit.2"],
    },
  ],
  confirmedMeaningFacts: [],
  neighboringUnits: { preceding: null, following: null },
  units: [
    {
      unitId: "unit.1",
      order: 0,
      locator: "line/1",
      context: null,
      durationMilliseconds: null,
      lineBreakPolicy: "flexible",
      source: "回声在第 3 层。\n灯亮了。",
      protectedSegments: [],
    },
    {
      unitId: "unit.2",
      order: 1,
      locator: "line/2",
      context: "A scheduled radio check.",
      durationMilliseconds: 2_800,
      lineBreakPolicy: "flexible",
      source: "18:00\n频道 7",
      protectedSegments: [],
    },
  ],
};

const cleanCandidateV1: TranslationBatchCandidateV1 = {
  targets: [
    { unitId: "unit.1", target: "Echo is on level 3.\nThe light is on." },
    { unitId: "unit.2", target: "18:00\nchannel 7" },
  ],
  ambiguities: [],
};

describe("SillyOS Translation mechanical QA", () => {
  it("returns no finding for one mechanically consistent admitted candidate", () => {
    expect(evaluateTranslationMechanicalQaV1(requestV1, cleanCandidateV1)).toEqual([]);
  });

  it("recomputes findings from an edited draft instead of carrying resolved number or glossary warnings", () => {
    const originalCandidate: TranslationBatchCandidateV1 = {
      targets: [
        { unitId: "unit.1", target: "The codename is on another floor." },
        { unitId: "unit.2", target: "Use frequency 9." },
      ],
      ambiguities: [],
    };
    expect(
      evaluateTranslationMechanicalQaV1(requestV1, originalCandidate).map((finding) =>
        finding.code
      ),
    ).toEqual([
      "non_locked_glossary_missing",
      "number_tokens_changed",
      "line_break_count_changed",
      "non_locked_glossary_missing",
      "number_tokens_changed",
      "line_break_count_changed",
    ]);

    expect(evaluateTranslationMechanicalQaV1(requestV1, cleanCandidateV1)).toEqual([]);
  });

  it("projects stable unit-level warnings and model review questions without rejecting a candidate", () => {
    const candidate: TranslationBatchCandidateV1 = {
      targets: [
        { unitId: "unit.1", target: requestV1.units[0]!.source },
        { unitId: "unit.2", target: "At 8 p.m., use frequency 9." },
      ],
      ambiguities: [{ unitId: "unit.2", question: "Does 频道 refer to a radio channel?" }],
    };

    expect(evaluateTranslationMechanicalQaV1(requestV1, candidate)).toEqual([
      {
        code: "non_locked_glossary_missing",
        severity: "warning",
        unitId: "unit.1",
        glossaryEntryId: "glossary.echo",
        expectedTarget: "Echo",
      },
      {
        code: "source_target_identical",
        severity: "warning",
        unitId: "unit.1",
      },
      {
        code: "non_locked_glossary_missing",
        severity: "warning",
        unitId: "unit.2",
        glossaryEntryId: "glossary.channel",
        expectedTarget: "channel",
      },
      {
        code: "number_tokens_changed",
        severity: "warning",
        unitId: "unit.2",
        sourceTokens: ["18", "00", "7"],
        targetTokens: ["8", "9"],
      },
      {
        code: "line_break_count_changed",
        severity: "warning",
        unitId: "unit.2",
        sourceCount: 1,
        targetCount: 0,
      },
      {
        code: "model_ambiguity",
        severity: "review",
        unitId: "unit.2",
        question: "Does 频道 refer to a radio channel?",
      },
    ]);
  });

  it("does not report identical text when the source and target locale are the same", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "en",
      glossary: [],
      units: [{ ...requestV1.units[0]!, source: "Keep this line 3." }],
    };
    const candidate: TranslationBatchCandidateV1 = {
      targets: [{ unitId: "unit.1", target: "Keep this line 3." }],
      ambiguities: [],
    };

    expect(evaluateTranslationMechanicalQaV1(request, candidate)).toEqual([]);
  });

  it("does not treat identical numeric or punctuation-only units as untranslated text", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary: [],
      units: [
        { ...requestV1.units[0]!, unitId: "unit.1", source: "37" },
        { ...requestV1.units[0]!, unitId: "unit.2", order: 1, source: "(50–51) · 100%" },
        { ...requestV1.units[0]!, unitId: "unit.3", order: 2, source: "—…" },
      ],
    };
    const candidate: TranslationBatchCandidateV1 = {
      targets: request.units.map((unit) => ({
        unitId: unit.unitId,
        target: unit.source,
      })),
      ambiguities: [],
    };

    expect(evaluateTranslationMechanicalQaV1(request, candidate)).toEqual([]);
  });

  it("compares exact number-token multisets without treating reordering as loss", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      glossary: [],
      units: [{ ...requestV1.units[0]!, source: "5, 5, then -7%." }],
    };

    expect(evaluateTranslationMechanicalQaV1(request, {
      targets: [{ unitId: "unit.1", target: "-7%, then 5 and 5." }],
      ambiguities: [],
    })).toEqual([]);
    expect(evaluateTranslationMechanicalQaV1(request, {
      targets: [{ unitId: "unit.1", target: "7%, then 5 and 5." }],
      ambiguities: [],
    })).toEqual([{
      code: "number_tokens_changed",
      severity: "warning",
      unitId: "unit.1",
      sourceTokens: ["5", "5", "-7%"],
      targetTokens: ["7%", "5", "5"],
    }]);
  });

  it("treats typographic and ASCII range dashes as separators rather than negative signs", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary: [],
      units: [{ ...requestV1.units[0]!, source: "See pages 50–51 and 80 − 82." }],
    };
    const candidate: TranslationBatchCandidateV1 = {
      targets: [{ unitId: "unit.1", target: "见第 50-51 页和 80 - 82 页。" }],
      ambiguities: [],
    };

    expect(evaluateTranslationMechanicalQaV1(request, candidate)).toEqual([]);
  });

  it("normalizes equivalent minus glyphs while retaining a real sign change", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary: [],
      units: [{ ...requestV1.units[0]!, source: "The change was −7%." }],
    };

    expect(evaluateTranslationMechanicalQaV1(request, {
      targets: [{ unitId: "unit.1", target: "变化为 -7%。" }],
      ambiguities: [],
    })).toEqual([]);
    expect(evaluateTranslationMechanicalQaV1(request, {
      targets: [{ unitId: "unit.1", target: "变化为 7%。" }],
      ambiguities: [],
    })).toEqual([{
      code: "number_tokens_changed",
      severity: "warning",
      unitId: "unit.1",
      sourceTokens: ["-7%"],
      targetTokens: ["7%"],
    }]);
  });

  it("counts logical line breaks rather than line-ending byte shape", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      glossary: [],
      units: [{ ...requestV1.units[0]!, source: "first\r\nsecond\rthird" }],
    };
    const candidate: TranslationBatchCandidateV1 = {
      targets: [{ unitId: "unit.1", target: "first\nsecond\nthird" }],
      ambiguities: [],
    };

    expect(evaluateTranslationMechanicalQaV1(request, candidate)).toEqual([]);
  });

  it("surfaces an explicit target refusal as a non-blocking review signal", () => {
    const request: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary: [],
      units: [{
        ...requestV1.units[0]!,
        source: "Translate the complete fictional scene without omitting any line.",
      }],
    };
    const candidate: TranslationBatchCandidateV1 = {
      targets: [{ unitId: "unit.1", target: "抱歉，我无法协助翻译这段内容。" }],
      ambiguities: [],
    };

    expect(evaluateTranslationMechanicalQaV1(request, candidate)).toEqual([{
      code: "target_looks_like_refusal",
      severity: "warning",
      unitId: "unit.1",
      matchedPattern: "zh.cannot_translate",
    }]);

    const englishRequest: TranslationBatchRequestV1 = {
      ...request,
      sourceLocale: "zh-CN",
      targetLocale: "en",
      units: [{
        ...request.units[0]!,
        source: "请完整翻译这个虚构场景，不要遗漏任何一行。",
      }],
    };
    expect(evaluateTranslationMechanicalQaV1(englishRequest, {
      targets: [{
        unitId: "unit.1",
        target: "I'm sorry, but I can't assist with translating this material.",
      }],
      ambiguities: [],
    })).toEqual([{
      code: "target_looks_like_refusal",
      severity: "warning",
      unitId: "unit.1",
      matchedPattern: "en.cannot_translate",
    }]);
  });

  it("does not mistake faithfully translated refusal dialogue or legal prohibition for provider refusal", () => {
    const refusalDialogueRequest: TranslationBatchRequestV1 = {
      ...requestV1,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary: [],
      units: [{
        ...requestV1.units[0]!,
        source: "I cannot translate this letter, the character said.",
      }],
    };
    expect(evaluateTranslationMechanicalQaV1(refusalDialogueRequest, {
      targets: [{ unitId: "unit.1", target: "“我不能翻译这封信，”角色说道。" }],
      ambiguities: [],
    })).toEqual([]);

    const legalRequest: TranslationBatchRequestV1 = {
      ...refusalDialogueRequest,
      units: [{
        ...requestV1.units[0]!,
        source: "The licensee cannot sell the archive copy.",
      }],
    };
    expect(evaluateTranslationMechanicalQaV1(legalRequest, {
      targets: [{ unitId: "unit.1", target: "被许可方不得出售档案副本。" }],
      ambiguities: [],
    })).toEqual([]);
  });
});
