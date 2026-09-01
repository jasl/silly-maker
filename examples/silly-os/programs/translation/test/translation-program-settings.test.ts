// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  resolveTranslationProgramSettingsV1,
  translationProgramBuiltInSettingsV1,
} from "../runtime/translation-program-settings.ts";

const packageDefaultsV1 = readFileSync(
  new URL("../package/settings.defaults.json", import.meta.url),
  "utf8",
);

function completeSettingsV1(overrides: {
  readonly targetLocale?: string;
  readonly defaultStyle?: string;
} = {}) {
  return {
    targetLocale: overrides.targetLocale ?? "ja",
    defaultStyle: overrides.defaultStyle ?? "Natural dialogue.",
  };
}

describe("Translation Program settings", () => {
  it("keeps package defaults aligned with the two production-consumed settings", () => {
    expect(JSON.parse(packageDefaultsV1)).toEqual(translationProgramBuiltInSettingsV1);
    expect(Object.keys(translationProgramBuiltInSettingsV1)).toEqual([
      "targetLocale",
      "defaultStyle",
    ]);
  });

  it("uses complete package defaults when settings are absent", () => {
    const resolved = resolveTranslationProgramSettingsV1({});

    expect(resolved).toEqual({
      effective: JSON.parse(packageDefaultsV1),
      effectiveSource: "built_in_defaults",
      diagnostics: [],
      admittedProcessOverrideJson: null,
    });
    expect(resolved.effective).not.toBe(translationProgramBuiltInSettingsV1);
  });

  it("uses one complete Process replacement instead of merging it with Program defaults", () => {
    const programDefaults = completeSettingsV1({ targetLocale: "ko" });
    const processOverride = completeSettingsV1({
      targetLocale: "zh-TW",
      defaultStyle: "Concise Traditional Chinese dialogue.",
    });
    const resolved = resolveTranslationProgramSettingsV1({
      programDefaultsJson: JSON.stringify(programDefaults),
      processOverrideJson: JSON.stringify(processOverride),
    });

    expect(resolved.effective).toEqual(processOverride);
    expect(resolved.effectiveSource).toBe("process_override");
    expect(resolved.diagnostics).toEqual([]);
    expect(JSON.parse(resolved.admittedProcessOverrideJson ?? "null")).toEqual(processOverride);
  });

  it("canonicalizes valid target tags and falls back from invalid or source-only targets", () => {
    const canonical = resolveTranslationProgramSettingsV1({
      processOverrideJson: JSON.stringify(completeSettingsV1({ targetLocale: "zh-tw" })),
    });
    expect(canonical.effective.targetLocale).toBe("zh-TW");
    expect(JSON.parse(canonical.admittedProcessOverrideJson ?? "null").targetLocale).toBe(
      "zh-TW",
    );

    for (const targetLocale of ["auto", "not a locale"]) {
      const resolved = resolveTranslationProgramSettingsV1({
        processOverrideJson: JSON.stringify(completeSettingsV1({ targetLocale })),
      });
      expect(resolved.effective.targetLocale).toBe("en");
      expect(resolved.admittedProcessOverrideJson).toBeNull();
      expect(resolved.diagnostics).toContainEqual({
        source: "process_override",
        code: "invalid_document",
        path: "/targetLocale",
      });
    }

    const invalidProgramDefault = resolveTranslationProgramSettingsV1({
      programDefaultsJson: JSON.stringify(completeSettingsV1({ targetLocale: "auto" })),
    });
    expect(invalidProgramDefault.effective).toEqual({
      targetLocale: "en",
      defaultStyle: "Natural dialogue.",
    });
    expect(invalidProgramDefault.diagnostics).toContainEqual({
      source: "program_defaults",
      code: "invalid_document",
      path: "/targetLocale",
    });
  });

  it("falls back as a whole instead of blocking on malformed JSON", () => {
    const malformedDefaults = resolveTranslationProgramSettingsV1({
      programDefaultsJson: "{not json",
    });
    expect(malformedDefaults.effective).toEqual(translationProgramBuiltInSettingsV1);
    expect(malformedDefaults.diagnostics).toEqual([{
      source: "program_defaults",
      code: "invalid_json",
      path: "/",
    }]);
  });

  it("interprets a valid partial draft for one attempt without admitting it for storage", () => {
    const programDefaults = completeSettingsV1({ targetLocale: "ko" });
    const partialOverride = resolveTranslationProgramSettingsV1({
      programDefaultsJson: JSON.stringify(programDefaults),
      processOverrideJson: JSON.stringify({ targetLocale: "fr" }),
    });

    expect(partialOverride.effective).toEqual({ ...programDefaults, targetLocale: "fr" });
    expect(partialOverride.effectiveSource).toBe("process_override");
    expect(partialOverride.admittedProcessOverrideJson).toBeNull();
    expect(partialOverride.diagnostics).toEqual([{
      source: "process_override",
      code: "invalid_document",
      path: "/defaultStyle",
    }]);
  });

  it("interprets partial Program defaults before applying Process fields", () => {
    const resolved = resolveTranslationProgramSettingsV1({
      programDefaultsJson: JSON.stringify({
        defaultStyle: "Preserve terse source dialogue.",
      }),
      processOverrideJson: JSON.stringify({ targetLocale: "fr" }),
    });

    expect(resolved.effective).toEqual({
      targetLocale: "fr",
      defaultStyle: "Preserve terse source dialogue.",
    });
    expect(resolved.diagnostics.map((diagnostic) => [diagnostic.source, diagnostic.path]))
      .toEqual([
        ["program_defaults", "/targetLocale"],
        ["process_override", "/defaultStyle"],
      ]);
    expect(resolved.admittedProcessOverrideJson).toBeNull();
  });

  it.each([
    ["reviewPolicy", "every_batch"],
    ["modelRoles", { translate: null, review: null, ocr: null }],
    ["pdf", { ocr: "off", output: "bilingual_markdown" }],
  ])("rejects the inert %s field instead of persisting a capability claim", (field, value) => {
    const settings = { ...completeSettingsV1(), [field]: value };
    const resolved = resolveTranslationProgramSettingsV1({
      processOverrideJson: JSON.stringify(settings),
    });

    expect(resolved.effective).toEqual(completeSettingsV1());
    expect(resolved.admittedProcessOverrideJson).toBeNull();
    expect(resolved.diagnostics).toEqual([{
      source: "process_override",
      code: "invalid_document",
      path: `/${field}`,
    }]);
  });

  it("captures an independent effective snapshot that later input edits cannot change", () => {
    const firstInput = completeSettingsV1({ targetLocale: "ja" });
    const first = resolveTranslationProgramSettingsV1({
      processOverrideJson: JSON.stringify(firstInput),
    });
    firstInput.targetLocale = "fr";
    firstInput.defaultStyle = "Changed after the first resolution.";
    const second = resolveTranslationProgramSettingsV1({
      processOverrideJson: JSON.stringify(firstInput),
    });

    expect(first.effective).toEqual({ targetLocale: "ja", defaultStyle: "Natural dialogue." });
    expect(second.effective).toEqual({
      targetLocale: "fr",
      defaultStyle: "Changed after the first resolution.",
    });
  });
});
