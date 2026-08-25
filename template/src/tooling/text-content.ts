// SPDX-License-Identifier: MIT
// Tooling-only authoring copy. Player code reaches only the compact manifest
// and loads the same directly editable variant bytes through the Host.
import { admitTextContentPackV1, type LocaleId, parseLocaleId } from "@sillymaker/base";

import endingEnglishV1 from "../../assets/content/ending.en.text-pack.json" with {
  type: "json",
};
import endingChineseV1 from "../../assets/content/ending.zh-CN.text-pack.json" with {
  type: "json",
};
import openingEnglishV1 from "../../assets/content/opening.en.text-pack.json" with {
  type: "json",
};
import openingChineseV1 from "../../assets/content/opening.zh-CN.text-pack.json" with {
  type: "json",
};
import { templateTextCatalogsV1 } from "../content/presentation.ts";
import { templateTextContentManifestV1 } from "../content/text-content.ts";

const encoderV1 = new TextEncoder();
const documentByRuntimePathV1: ReadonlyMap<string, unknown> = new Map([
  ["assets/content/opening.zh-CN.text-pack.json", openingChineseV1],
  ["assets/content/opening.en.text-pack.json", openingEnglishV1],
  ["assets/content/ending.zh-CN.text-pack.json", endingChineseV1],
  ["assets/content/ending.en.text-pack.json", endingEnglishV1],
]);
const textByLocaleV1 = new Map<string, Map<string, string>>(
  templateTextCatalogsV1.catalogs.map((catalog) => [
    catalog.locale,
    new Map(catalog.entries.map((entry) => [entry.textId as string, entry.text] as const)),
  ]),
);

for (const pack of templateTextContentManifestV1.packs) {
  for (const variant of pack.variants) {
    const document = documentByRuntimePathV1.get(variant.runtimePath);
    if (document === undefined) {
      throw new TypeError(`template.authoring_text_variant_missing:${variant.runtimePath}`);
    }
    const admitted = admitTextContentPackV1(
      pack,
      variant,
      encoderV1.encode(JSON.stringify(document)),
    );
    const localeEntries = textByLocaleV1.get(variant.locale) ?? new Map<string, string>();
    for (const [textId, text] of admitted.entries) {
      if (localeEntries.has(textId)) {
        throw new TypeError(`template.authoring_text_duplicate:${textId}`);
      }
      localeEntries.set(textId, text);
    }
    textByLocaleV1.set(variant.locale, localeEntries);
  }
}

const fallbackByLocaleV1 = new Map(
  templateTextContentManifestV1.locales.map((locale) =>
    [
      locale.locale,
      locale.fallbackLocale,
    ] as const
  ),
);

export function templateAuthoringTextForLocaleV1(
  locale: string | null,
  textId: string,
): string | null {
  let cursor: LocaleId | null;
  try {
    cursor = locale === null ? templateTextContentManifestV1.defaultLocale : parseLocaleId(locale);
  } catch {
    return null;
  }
  if (!fallbackByLocaleV1.has(cursor)) return null;
  while (cursor !== null) {
    const text = textByLocaleV1.get(cursor)?.get(textId);
    if (text !== undefined) return text;
    cursor = fallbackByLocaleV1.get(cursor) ?? null;
  }
  return null;
}
