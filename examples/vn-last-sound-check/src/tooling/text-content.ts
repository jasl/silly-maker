// SPDX-License-Identifier: MIT
// Tooling-only authoring copy. Player code reaches only the compact manifest
// and loads the same directly editable variant bytes through the Host.
import { admitTextContentPackV1, type LocaleId, parseLocaleId } from "@sillymaker/base";

import archiveEnglishV1 from "../../assets/content/archive.en.text-pack.json" with {
  type: "json",
};
import archiveChineseV1 from "../../assets/content/archive.zh-CN.text-pack.json" with {
  type: "json",
};
import presentEnglishV1 from "../../assets/content/present.en.text-pack.json" with {
  type: "json",
};
import presentChineseV1 from "../../assets/content/present.zh-CN.text-pack.json" with {
  type: "json",
};
import sharedEnglishV1 from "../../assets/content/shared.en.text-pack.json" with {
  type: "json",
};
import sharedChineseV1 from "../../assets/content/shared.zh-CN.text-pack.json" with {
  type: "json",
};
import { vnLastSoundCheckTextCatalogsV1 } from "../content/presentation.ts";
import { vnLastSoundCheckTextContentManifestV1 } from "../content/text-content.ts";

const encoderV1 = new TextEncoder();
const documentByRuntimePathV1: ReadonlyMap<string, unknown> = new Map([
  ["assets/content/shared.zh-CN.text-pack.json", sharedChineseV1],
  ["assets/content/shared.en.text-pack.json", sharedEnglishV1],
  ["assets/content/archive.zh-CN.text-pack.json", archiveChineseV1],
  ["assets/content/archive.en.text-pack.json", archiveEnglishV1],
  ["assets/content/present.zh-CN.text-pack.json", presentChineseV1],
  ["assets/content/present.en.text-pack.json", presentEnglishV1],
]);
const textByLocaleV1 = new Map<string, Map<string, string>>(
  vnLastSoundCheckTextCatalogsV1.catalogs.map((catalog) => [
    catalog.locale,
    new Map(catalog.entries.map((entry) => [entry.textId as string, entry.text] as const)),
  ]),
);

for (const pack of vnLastSoundCheckTextContentManifestV1.packs) {
  for (const variant of pack.variants) {
    const document = documentByRuntimePathV1.get(variant.runtimePath);
    if (document === undefined) {
      throw new TypeError(
        `vn-last-sound-check.authoring_text_variant_missing:${variant.runtimePath}`,
      );
    }
    const admitted = admitTextContentPackV1(
      pack,
      variant,
      encoderV1.encode(JSON.stringify(document)),
    );
    const localeEntries = textByLocaleV1.get(variant.locale) ?? new Map<string, string>();
    for (const [textId, text] of admitted.entries) {
      if (localeEntries.has(textId)) {
        throw new TypeError(`vn-last-sound-check.authoring_text_duplicate:${textId}`);
      }
      localeEntries.set(textId, text);
    }
    textByLocaleV1.set(variant.locale, localeEntries);
  }
}

const fallbackByLocaleV1 = new Map(
  vnLastSoundCheckTextContentManifestV1.locales.map((locale) =>
    [
      locale.locale,
      locale.fallbackLocale,
    ] as const
  ),
);

export function vnLastSoundCheckAuthoringTextForLocaleV1(
  locale: string | null,
  textId: string,
): string | null {
  let cursor: LocaleId | null;
  try {
    cursor = locale === null
      ? vnLastSoundCheckTextContentManifestV1.defaultLocale
      : parseLocaleId(locale);
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
