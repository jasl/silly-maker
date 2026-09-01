// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  planTranslationBatchRequestV1,
  translationBatchRequestUtf8ByteLengthV1,
  translationBatchRequestedOutputTokensV1,
  type TranslationBatchBudgetV1,
  type TranslationBatchPlannerInputV1,
} from "../runtime/translation-batch-planner.ts";
import type {
  TranslationWorksetGlossaryEntryV1,
  TranslationWorksetUnitV1,
} from "../runtime/translation-workset-repository.ts";

function unitV1(order: number, source = `Source ${String(order)}`): TranslationWorksetUnitV1 {
  return {
    processId: "process.translation",
    unitId: `unit.${String(order)}`,
    order,
    locator: `line/${String(order + 1)}`,
    context: null,
    durationMilliseconds: null,
    lineBreakPolicy: "forbidden",
    source,
    protectedSegments: [],
  };
}

function glossaryV1(input: {
  order: number;
  source: string;
  target: string;
  locked: boolean;
}): TranslationWorksetGlossaryEntryV1 {
  return {
    processId: "process.translation",
    entryId: `glossary.${String(input.order)}`,
    order: input.order,
    source: input.source,
    target: input.target,
    note: null,
    locked: input.locked,
  };
}

function inputV1(
  sourceRows: readonly TranslationWorksetUnitV1[],
  overrides: Partial<TranslationBatchPlannerInputV1> = {},
): TranslationBatchPlannerInputV1 {
  return {
    sourceLocale: "zh-CN",
    targetLocale: "en",
    documentPurpose: "A fictional game scene.",
    style: "Natural dialogue.",
    sourceRows,
    glossaryRows: [],
    budget: budgetV1(),
    ...overrides,
  };
}

function budgetV1(
  overrides: Partial<TranslationBatchBudgetV1> = {},
): TranslationBatchBudgetV1 {
  return {
    maximumRequestBytes: 1_000_000,
    maximumOutputTokens: 1_000_000,
    outputEnvelope: {
      fixedCandidateReserveTokens: 20,
      perUnitCandidateReserveTokens: 5,
      targetTokensPerSourceCodePoint: { numerator: 1, denominator: 1 },
    },
    ...overrides,
  };
}

describe("SillyOS Translation batch planner", () => {
  it("selects the largest complete prefix and projects only relevant locked glossary", () => {
    const preceding = unitV1(9, "Earlier context");
    const rows = [
      unitV1(10, "回声 arrives."),
      unitV1(11, "The 雾灯 is on."),
      unitV1(12, "Later target."),
    ];
    const following = unitV1(13, "Following context");
    const base = inputV1(rows, {
      glossaryRows: [
        glossaryV1({ order: 0, source: "回声", target: "Echo", locked: true }),
        glossaryV1({ order: 1, source: "雾灯", target: "Foglight", locked: false }),
        glossaryV1({ order: 2, source: "未出现", target: "Absent", locked: true }),
      ],
      confirmedMeaningFacts: [{
        factId: "fact.relationship",
        statement: "The station possesses the light; it is not a location relation.",
      }],
      neighboringUnits: { preceding, following },
    });

    const twoRows = planTranslationBatchRequestV1({
      ...base,
      sourceRows: rows.slice(0, 2),
      neighboringUnits: { preceding, following: rows[2]! },
    });
    if (twoRows.kind !== "planned") throw new Error("two-row request was not planned");
    const result = planTranslationBatchRequestV1({
      ...base,
      budget: budgetV1({ maximumRequestBytes: twoRows.requestByteLength }),
    });

    expect(result).toEqual({
      kind: "planned",
      request: twoRows.request,
      requestByteLength: twoRows.requestByteLength,
      requestedOutputTokens: twoRows.requestedOutputTokens,
      nextOrder: 12,
    });
    if (result.kind !== "planned") throw new Error("request was not planned");
    expect(result.request.units.map((unit) => unit.order)).toEqual([10, 11]);
    expect(result.request.glossary).toEqual([{
      entryId: "glossary.0",
      source: "回声",
      target: "Echo",
      note: null,
      locked: true,
      appliesToUnitIds: ["unit.10"],
    }]);
    expect(result.request.confirmedMeaningFacts).toEqual(base.confirmedMeaningFacts);
    expect(result.request.neighboringUnits).toEqual({
      preceding: expect.objectContaining({ order: 9 }),
      following: expect.objectContaining({ order: 12 }),
    });
    expect(result.requestByteLength).toBe(
      translationBatchRequestUtf8ByteLengthV1(result.request),
    );
  });

  it("does not impose a unit-count ceiling when the complete request fits", () => {
    const sourceRows = Array.from({ length: 10_000 }, (_, order) => unitV1(order));

    const result = planTranslationBatchRequestV1(inputV1(sourceRows, {
      budget: budgetV1({
        maximumRequestBytes: 100_000_000,
        maximumOutputTokens: 100_000_000,
      }),
    }));

    expect(result.kind).toBe("planned");
    if (result.kind !== "planned") throw new Error("large request was not planned");
    expect(result.request.units).toHaveLength(10_000);
    expect(result.nextOrder).toBeNull();
  });

  it("matches a large glossary once before binary prefix measurement", () => {
    const sourceRows = Array.from(
      { length: 64 },
      (_, order) => unitV1(order, `line.${String(order)} ⟪TERM:${String(order).padStart(4, "0")}⟫`),
    );
    const glossaryRows = Array.from({ length: 1_000 }, (_, order) =>
      glossaryV1({
        order,
        source: `⟪TERM:${String(order).padStart(4, "0")}⟫`,
        target: `Target ${String(order)}`,
        locked: true,
      }));
    const sixteen = planTranslationBatchRequestV1(inputV1(sourceRows.slice(0, 16), {
      glossaryRows,
    }));
    if (sixteen.kind !== "planned") throw new Error("calibration request was not planned");

    const includes = vi.spyOn(String.prototype, "includes");
    const result = planTranslationBatchRequestV1(inputV1(sourceRows, {
      glossaryRows,
      budget: budgetV1({ maximumRequestBytes: sixteen.requestByteLength }),
    }));
    const termMatchCalls = includes.mock.calls.reduce((count, [term], index) => {
      const source = String(includes.mock.contexts[index]);
      return typeof term === "string" && term.startsWith("⟪TERM:") && source.startsWith("line.")
        ? count + 1
        : count;
    }, 0);
    includes.mockRestore();

    expect(result.kind).toBe("planned");
    if (result.kind !== "planned") throw new Error("bounded request was not planned");
    expect(result.request.units.length).toBeLessThan(sourceRows.length);
    expect(result.request.glossary).toHaveLength(result.request.units.length);
    const admittedBindingChecks = result.request.glossary.reduce(
      (count, entry) => count + entry.appliesToUnitIds.length,
      0,
    );
    expect(termMatchCalls).toBeLessThanOrEqual(
      glossaryRows.length * sourceRows.length + admittedBindingChecks,
    );
  });

  it("returns an explicit failure instead of truncating an oversized first unit", () => {
    const sourceRows = [unitV1(0, "x".repeat(4_000))];
    const admitted = planTranslationBatchRequestV1(inputV1(sourceRows));
    if (admitted.kind !== "planned") throw new Error("baseline request was not planned");

    const result = planTranslationBatchRequestV1(inputV1(sourceRows, {
      budget: budgetV1({ maximumRequestBytes: admitted.requestByteLength - 1 }),
    }));

    expect(result).toEqual({
      kind: "unit_exceeds_budget",
      unitId: "unit.0",
      requestByteLength: admitted.requestByteLength,
      maximumRequestBytes: admitted.requestByteLength - 1,
      requestedOutputTokens: admitted.requestedOutputTokens,
      maximumOutputTokens: 1_000_000,
    });
  });

  it("selects the maximal prefix inside the selected model output envelope", () => {
    const sourceRows = [
      unitV1(0, "1234567890"),
      unitV1(1, "abcdefghij"),
      unitV1(2, "ABCDEFGHIJ"),
    ];
    const result = planTranslationBatchRequestV1(inputV1(sourceRows, {
      budget: {
        maximumRequestBytes: 1_000_000,
        maximumOutputTokens: 50,
        outputEnvelope: {
          fixedCandidateReserveTokens: 10,
          perUnitCandidateReserveTokens: 5,
          targetTokensPerSourceCodePoint: { numerator: 1, denominator: 1 },
        },
      },
    }));

    expect(result.kind).toBe("planned");
    if (result.kind !== "planned") throw new Error("output-bounded request was not planned");
    expect(result.request.units.map(({ order }) => order)).toEqual([0, 1]);
    expect(result.requestedOutputTokens).toBe(40);
    expect(result.nextOrder).toBe(2);
  });

  it("reports an explicit output-envelope failure for an oversized first unit", () => {
    const result = planTranslationBatchRequestV1(inputV1([unitV1(0, "1234567890")], {
      budget: {
        maximumRequestBytes: 1_000_000,
        maximumOutputTokens: 24,
        outputEnvelope: {
          fixedCandidateReserveTokens: 10,
          perUnitCandidateReserveTokens: 5,
          targetTokensPerSourceCodePoint: { numerator: 1, denominator: 1 },
        },
      },
    }));

    expect(result).toMatchObject({
      kind: "unit_exceeds_budget",
      unitId: "unit.0",
      requestedOutputTokens: 25,
      maximumOutputTokens: 24,
    });
  });

  it("uses Unicode code points and the caller's explicit expansion ratio", () => {
    const baseline = planTranslationBatchRequestV1(inputV1([unitV1(0, "猫🐈")], {
      budget: {
        maximumRequestBytes: 1_000_000,
        maximumOutputTokens: 3,
        outputEnvelope: {
          fixedCandidateReserveTokens: 0,
          perUnitCandidateReserveTokens: 0,
          targetTokensPerSourceCodePoint: { numerator: 3, denominator: 2 },
        },
      },
    }));

    expect(baseline.kind).toBe("planned");
    if (baseline.kind !== "planned") throw new Error("Unicode request was not planned");
    expect(baseline.requestedOutputTokens).toBe(3);
    expect(translationBatchRequestedOutputTokensV1(
      baseline.request,
      budgetV1().outputEnvelope,
    )).toBe(27);
  });

  it("rejects discontinuous source windows and non-immediate boundary rows", () => {
    expect(() =>
      planTranslationBatchRequestV1(inputV1([
        unitV1(0),
        unitV1(2),
      ]))
    ).toThrow("not one contiguous Process workset window");
    expect(() =>
      planTranslationBatchRequestV1(inputV1([unitV1(4)], {
        neighboringUnits: { preceding: unitV1(1), following: null },
      }))
    ).toThrow("preceding row is not the immediate Process workset neighbor");
  });

  it("rejects invalid model envelopes instead of silently clamping them", () => {
    expect(() =>
      planTranslationBatchRequestV1(inputV1([unitV1(0)], {
        budget: budgetV1({ maximumOutputTokens: 0 }),
      }))
    ).toThrow("output token budget is invalid");
    expect(() =>
      planTranslationBatchRequestV1(inputV1([unitV1(0)], {
        budget: budgetV1({
          outputEnvelope: {
            ...budgetV1().outputEnvelope,
            targetTokensPerSourceCodePoint: { numerator: 0, denominator: 1 },
          },
        }),
      }))
    ).toThrow("target token expansion ratio is invalid");
  });

  it("returns empty without manufacturing a synthetic request", () => {
    expect(planTranslationBatchRequestV1(inputV1([]))).toEqual({ kind: "empty" });
  });
});
