// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  canonicalizeTranslationTargetLocaleV1,
  defaultTranslationTargetLocaleForHostV1,
  translationTargetLanguageSuggestionsV1,
} from "../runtime/translation-target-language.ts";

describe("Translation target languages", () => {
  it("canonicalizes BCP 47 language identities without making suggestions an allowlist", () => {
    expect(canonicalizeTranslationTargetLocaleV1("zh-tw")).toBe("zh-TW");
    expect(canonicalizeTranslationTargetLocaleV1(" pt-br ")).toBe("pt-BR");
    expect(canonicalizeTranslationTargetLocaleV1("fr-CA")).toBe("fr-CA");
    expect(canonicalizeTranslationTargetLocaleV1("auto")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("not a locale")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("und")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("mul")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("zxx")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("en-u-ca-gregory")).toBeNull();
    expect(canonicalizeTranslationTargetLocaleV1("en-x-product-copy")).toBeNull();
  });

  it("derives the first-page target from the Host locale with an English fallback", () => {
    expect(defaultTranslationTargetLocaleForHostV1("en")).toBe("en");
    expect(defaultTranslationTargetLocaleForHostV1("zh-CN")).toBe("zh-CN");
    expect(defaultTranslationTargetLocaleForHostV1("zh-tw")).toBe("zh-TW");
    expect(defaultTranslationTargetLocaleForHostV1("invalid locale")).toBe("en");
  });

  it("keeps Chinese and English in the validation scope and labels other suggestions best-effort", () => {
    const suggestions = new Map(
      translationTargetLanguageSuggestionsV1.map((suggestion) => [suggestion.locale, suggestion]),
    );
    expect([...suggestions.keys()]).toEqual([
      "zh-CN",
      "zh-TW",
      "en",
      "ja",
      "ko",
      "es",
      "fr",
      "de",
      "pt-BR",
      "it",
      "ru",
      "ar",
      "hi",
      "id",
      "vi",
      "th",
      "tr",
      "pl",
      "nl",
      "uk",
    ]);
    expect(suggestions.get("zh-TW")).toMatchObject({
      labels: { en: "Chinese (Traditional)", "zh-CN": "繁体中文" },
      validationScope: "chinese_or_english",
    });
    expect(suggestions.get("en")?.validationScope).toBe("chinese_or_english");
    expect(suggestions.get("ja")?.validationScope).toBe("best_effort");
  });

  it("keeps the stable Program prompt explicit about script and region variants", () => {
    const prompt = readFileSync(
      new URL("../package/prompts/translate.md", import.meta.url),
      "utf8",
    );
    expect(prompt).toContain("exact requested BCP 47 language, writing-system");
    expect(prompt).toContain("`zh-CN` requires Simplified Chinese");
    expect(prompt).toContain("`zh-TW` requires Traditional Chinese");
  });
});
