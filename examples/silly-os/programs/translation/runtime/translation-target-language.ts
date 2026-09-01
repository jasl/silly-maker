// SPDX-License-Identifier: MIT

type TranslationTargetLanguageValidationScopeV1 =
  | "chinese_or_english"
  | "best_effort";

interface TranslationTargetLanguageSuggestionV1 {
  readonly locale: string;
  readonly labels: Readonly<Record<"en" | "zh-CN", string>>;
  /** Product validation scope, not a claim about any particular model invocation. */
  readonly validationScope: TranslationTargetLanguageValidationScopeV1;
}

/**
 * A short discoverability list for the intake UI. It is deliberately not an
 * allowlist: any other BCP 47 language/script/region/variant identity remains
 * admissible. Extensions and private-use tags are outside the model-output
 * contract.
 */
export const translationTargetLanguageSuggestionsV1 = [
  {
    locale: "zh-CN",
    labels: { en: "Chinese (Simplified)", "zh-CN": "简体中文" },
    validationScope: "chinese_or_english",
  },
  {
    locale: "zh-TW",
    labels: { en: "Chinese (Traditional)", "zh-CN": "繁体中文" },
    validationScope: "chinese_or_english",
  },
  {
    locale: "en",
    labels: { en: "English", "zh-CN": "英语" },
    validationScope: "chinese_or_english",
  },
  {
    locale: "ja",
    labels: { en: "Japanese", "zh-CN": "日语" },
    validationScope: "best_effort",
  },
  {
    locale: "ko",
    labels: { en: "Korean", "zh-CN": "韩语" },
    validationScope: "best_effort",
  },
  {
    locale: "es",
    labels: { en: "Spanish", "zh-CN": "西班牙语" },
    validationScope: "best_effort",
  },
  {
    locale: "fr",
    labels: { en: "French", "zh-CN": "法语" },
    validationScope: "best_effort",
  },
  {
    locale: "de",
    labels: { en: "German", "zh-CN": "德语" },
    validationScope: "best_effort",
  },
  {
    locale: "pt-BR",
    labels: { en: "Portuguese (Brazil)", "zh-CN": "巴西葡萄牙语" },
    validationScope: "best_effort",
  },
  {
    locale: "it",
    labels: { en: "Italian", "zh-CN": "意大利语" },
    validationScope: "best_effort",
  },
  {
    locale: "ru",
    labels: { en: "Russian", "zh-CN": "俄语" },
    validationScope: "best_effort",
  },
  {
    locale: "ar",
    labels: { en: "Arabic", "zh-CN": "阿拉伯语" },
    validationScope: "best_effort",
  },
  {
    locale: "hi",
    labels: { en: "Hindi", "zh-CN": "印地语" },
    validationScope: "best_effort",
  },
  {
    locale: "id",
    labels: { en: "Indonesian", "zh-CN": "印度尼西亚语" },
    validationScope: "best_effort",
  },
  {
    locale: "vi",
    labels: { en: "Vietnamese", "zh-CN": "越南语" },
    validationScope: "best_effort",
  },
  {
    locale: "th",
    labels: { en: "Thai", "zh-CN": "泰语" },
    validationScope: "best_effort",
  },
  {
    locale: "tr",
    labels: { en: "Turkish", "zh-CN": "土耳其语" },
    validationScope: "best_effort",
  },
  {
    locale: "pl",
    labels: { en: "Polish", "zh-CN": "波兰语" },
    validationScope: "best_effort",
  },
  {
    locale: "nl",
    labels: { en: "Dutch", "zh-CN": "荷兰语" },
    validationScope: "best_effort",
  },
  {
    locale: "uk",
    labels: { en: "Ukrainian", "zh-CN": "乌克兰语" },
    validationScope: "best_effort",
  },
] as const satisfies readonly TranslationTargetLanguageSuggestionV1[];

/** Canonicalize one target locale without limiting it to the suggestion list. */
export function canonicalizeTranslationTargetLocaleV1(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.toLowerCase() === "auto") return null;
  try {
    const canonical = Intl.getCanonicalLocales(candidate)[0];
    if (canonical === undefined) return null;
    const locale = new Intl.Locale(canonical);
    if (["mul", "und", "zxx"].includes(locale.language)) return null;
    // Translation targets are language/script/region/variant identities. A
    // calendar, collation, transform, or private-use extension has no model
    // output semantics in this contract.
    return locale.baseName === canonical ? canonical : null;
  } catch {
    return null;
  }
}

/** Use the Host language as the first-page target, with English as safe fallback. */
export function defaultTranslationTargetLocaleForHostV1(hostLocale: string): string {
  return canonicalizeTranslationTargetLocaleV1(hostLocale) ?? "en";
}
