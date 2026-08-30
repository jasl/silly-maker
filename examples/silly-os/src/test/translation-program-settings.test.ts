// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  resolveTranslationProgramAttemptSettingsV1,
  translationProgramBuiltInSettingsV1,
} from "../../research/translation/program-candidate/settings-normalizer.ts";

const packageDefaultsV1 = readFileSync(
  new URL(
    "../../research/translation/program-candidate/settings.defaults.json",
    import.meta.url,
  ),
  "utf8",
);
const packageSchemaV1 = JSON.parse(
  readFileSync(
    new URL(
      "../../research/translation/program-candidate/settings.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  readonly default: unknown;
  readonly properties: {
    readonly targetLocale: { readonly pattern: string };
    readonly defaultStyle: { readonly pattern: string };
    readonly modelRoles: {
      readonly properties: {
        readonly translate: { readonly pattern: string };
        readonly review: { readonly pattern: string };
        readonly ocr: { readonly pattern: string };
      };
    };
    readonly pdf: {
      readonly properties: {
        readonly output: { readonly enum: readonly string[] };
      };
    };
  };
};

function completeSettingsV1(overrides: {
  readonly targetLocale?: string;
  readonly translateModel?: string | null;
  readonly reviewPolicy?: "every_batch" | "flagged_batches" | "final_only";
} = {}) {
  return {
    targetLocale: overrides.targetLocale ?? "ja",
    defaultStyle: "Natural dialogue.",
    reviewPolicy: overrides.reviewPolicy ?? "flagged_batches",
    modelRoles: {
      translate: overrides.translateModel ?? null,
      review: null,
      ocr: null,
    },
    pdf: {
      ocr: "off",
      output: "translated_markdown",
    },
  };
}

describe("Translation Program settings research normalizer", () => {
  it("keeps schema defaults and the honest derived-PDF output denominator aligned", () => {
    expect(packageSchemaV1.default).toEqual(JSON.parse(packageDefaultsV1));
    expect(packageSchemaV1.properties.pdf.properties.output.enum).toEqual([
      "translation_json",
      "translated_markdown",
      "bilingual_markdown",
    ]);
  });

  it("keeps schema-rendered text fields aligned with final trimmed-text admission", () => {
    const patterns = [
      packageSchemaV1.properties.targetLocale.pattern,
      packageSchemaV1.properties.defaultStyle.pattern,
      packageSchemaV1.properties.modelRoles.properties.translate.pattern,
      packageSchemaV1.properties.modelRoles.properties.review.pattern,
      packageSchemaV1.properties.modelRoles.properties.ocr.pattern,
    ].map((pattern) => new RegExp(pattern, "u"));

    for (const pattern of patterns) {
      expect(pattern.test("value")).toBe(true);
      expect(pattern.test("two words")).toBe(true);
      expect(pattern.test("")).toBe(false);
      expect(pattern.test("   ")).toBe(false);
      expect(pattern.test(" leading")).toBe(false);
      expect(pattern.test("trailing ")).toBe(false);
    }
  });

  it("uses complete package defaults when settings are absent", () => {
    const resolved = resolveTranslationProgramAttemptSettingsV1({});

    expect(resolved).toEqual({
      effective: JSON.parse(packageDefaultsV1),
      effectiveSource: "built_in_defaults",
      diagnostics: [],
      admittedProcessOverrideJson: null,
    });
    expect(resolved.effective).toEqual(translationProgramBuiltInSettingsV1);
    expect(resolved.effective).not.toBe(translationProgramBuiltInSettingsV1);
    expect(resolved.effective.modelRoles).not.toBe(
      translationProgramBuiltInSettingsV1.modelRoles,
    );
    expect(resolved.effective.pdf).not.toBe(translationProgramBuiltInSettingsV1.pdf);
  });

  it("uses one complete Process replacement instead of merging it with Program defaults", () => {
    const programDefaults = completeSettingsV1({ targetLocale: "ko" });
    const processOverride = completeSettingsV1({
      targetLocale: "zh-TW",
      translateModel: "builtin:deepseek/deepseek-v4-flash",
      reviewPolicy: "final_only",
    });
    const resolved = resolveTranslationProgramAttemptSettingsV1({
      programDefaultsJson: JSON.stringify(programDefaults),
      processOverrideJson: JSON.stringify(processOverride),
    });

    expect(resolved.effective).toEqual(processOverride);
    expect(resolved.effectiveSource).toBe("process_override");
    expect(resolved.diagnostics).toEqual([]);
    expect(JSON.parse(resolved.admittedProcessOverrideJson ?? "null")).toEqual(processOverride);
  });

  it("falls back as a whole instead of blocking on malformed JSON", () => {
    const malformedDefaults = resolveTranslationProgramAttemptSettingsV1({
      programDefaultsJson: "{not json",
    });
    expect(malformedDefaults.effective).toEqual(translationProgramBuiltInSettingsV1);
    expect(malformedDefaults.diagnostics).toEqual([{
      source: "program_defaults",
      code: "invalid_json",
      path: "/",
    }]);
  });

  it("interprets valid fields in a partial Process draft without admitting it for storage", () => {
    const programDefaults = completeSettingsV1({ targetLocale: "ko" });
    const partialOverride = resolveTranslationProgramAttemptSettingsV1({
      programDefaultsJson: JSON.stringify(programDefaults),
      processOverrideJson: JSON.stringify({ targetLocale: "fr" }),
    });
    expect(partialOverride.effective).toEqual({
      ...programDefaults,
      targetLocale: "fr",
    });
    expect(partialOverride.effectiveSource).toBe("process_override");
    expect(partialOverride.admittedProcessOverrideJson).toBeNull();
    expect(partialOverride.diagnostics).toEqual([
      { source: "process_override", code: "invalid_document", path: "/defaultStyle" },
      { source: "process_override", code: "invalid_document", path: "/reviewPolicy" },
      { source: "process_override", code: "invalid_document", path: "/modelRoles" },
      { source: "process_override", code: "invalid_document", path: "/pdf" },
    ]);
  });

  it("interprets partial Program defaults over built-ins before applying Process fields", () => {
    const resolved = resolveTranslationProgramAttemptSettingsV1({
      programDefaultsJson: JSON.stringify({
        defaultStyle: "Preserve terse source dialogue.",
        reviewPolicy: "not-a-policy",
      }),
      processOverrideJson: JSON.stringify({ targetLocale: "fr" }),
    });

    expect(resolved.effective).toEqual({
      ...translationProgramBuiltInSettingsV1,
      targetLocale: "fr",
      defaultStyle: "Preserve terse source dialogue.",
    });
    expect(resolved.diagnostics.map((diagnostic) => [diagnostic.source, diagnostic.path]))
      .toEqual([
        ["program_defaults", "/targetLocale"],
        ["program_defaults", "/reviewPolicy"],
        ["program_defaults", "/modelRoles"],
        ["program_defaults", "/pdf"],
        ["process_override", "/defaultStyle"],
        ["process_override", "/reviewPolicy"],
        ["process_override", "/modelRoles"],
        ["process_override", "/pdf"],
      ]);
    expect(resolved.admittedProcessOverrideJson).toBeNull();
  });

  it("rejects credentials or capability claims in model-role settings", () => {
    const invalid = completeSettingsV1() as Record<string, unknown>;
    invalid.modelRoles = {
      translate: {
        selectionReference: "builtin:deepseek/deepseek-v4-flash",
        apiKey: "must-not-enter-program-settings",
      },
      review: null,
      ocr: null,
    };
    const resolved = resolveTranslationProgramAttemptSettingsV1({
      processOverrideJson: JSON.stringify(invalid),
    });

    expect(resolved.effective).toEqual({
      ...completeSettingsV1(),
      modelRoles: translationProgramBuiltInSettingsV1.modelRoles,
    });
    expect(resolved.admittedProcessOverrideJson).toBeNull();
    expect(resolved.diagnostics).toEqual([{
      source: "process_override",
      code: "invalid_document",
      path: "/modelRoles/translate",
    }]);
  });

  it("does not admit output modes that imply unshipped HTML or PDF rewriting", () => {
    const invalid = completeSettingsV1();
    invalid.pdf.output = "reflow_pdf";
    const resolved = resolveTranslationProgramAttemptSettingsV1({
      processOverrideJson: JSON.stringify(invalid),
    });

    expect(resolved.effective.pdf.output).toBe("bilingual_markdown");
    expect(resolved.admittedProcessOverrideJson).toBeNull();
    expect(resolved.diagnostics).toEqual([{
      source: "process_override",
      code: "invalid_document",
      path: "/pdf/output",
    }]);
  });

  it("captures an independent effective snapshot that later input edits cannot change", () => {
    const firstInput = completeSettingsV1({ targetLocale: "ja" });
    const first = resolveTranslationProgramAttemptSettingsV1({
      processOverrideJson: JSON.stringify(firstInput),
    });
    firstInput.targetLocale = "fr";
    firstInput.modelRoles.translate = "builtin:changed-after-attempt";
    const second = resolveTranslationProgramAttemptSettingsV1({
      processOverrideJson: JSON.stringify(firstInput),
    });

    expect(first.effective.targetLocale).toBe("ja");
    expect(first.effective.modelRoles.translate).toBeNull();
    expect(second.effective.targetLocale).toBe("fr");
    expect(second.effective.modelRoles.translate).toBe("builtin:changed-after-attempt");
    expect(first.effective.modelRoles).not.toBe(second.effective.modelRoles);
  });
});
