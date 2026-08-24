// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "./canonical-json.ts";
import {
  PresentationCatalogValidationError,
  PresentationDataError,
  assertUniqueValues,
  catalogFailure,
  dataFailure,
  parseAt,
  parseNullableAt,
  readArray,
  readExactRecord,
} from "./presentation-data.ts";
import type { LocaleId, TextId } from "./presentation-ids.ts";
import { parseLocaleId, parseTextId } from "./presentation-ids.ts";

export interface LocalizedTextCatalogV1 {
  readonly locale: LocaleId;
  readonly fallbackLocale: LocaleId | null;
  readonly entries: readonly {
    readonly textId: TextId;
    readonly text: string;
  }[];
}

export interface TextCatalogSetV1 {
  readonly defaultLocale: LocaleId;
  readonly catalogs: readonly LocalizedTextCatalogV1[];
}
function parseTextCatalogTextV1(value: unknown, path: string): string {
  if (typeof value !== "string") return dataFailure(path, "string_expected");
  try {
    canonicalJsonBytes(value);
  } catch {
    return dataFailure(path, "invalid_string");
  }
  return value;
}

function parseTextCatalogSetDataV1(value: unknown): TextCatalogSetV1 {
  const set = readExactRecord(value, ["defaultLocale", "catalogs"], "/");
  const defaultLocale = parseAt(parseLocaleId, set.defaultLocale, "/defaultLocale", "invalid_id");
  const catalogs = readArray(set.catalogs, "/catalogs").map((catalogValue, catalogIndex) => {
    const catalogPath = `/catalogs/${catalogIndex}`;
    const catalog = readExactRecord(
      catalogValue,
      ["locale", "fallbackLocale", "entries"],
      catalogPath,
    );
    const entries = readArray(catalog.entries, `${catalogPath}/entries`).map(
      (entryValue, entryIndex) => {
        const entryPath = `${catalogPath}/entries/${entryIndex}`;
        const entry = readExactRecord(entryValue, ["textId", "text"], entryPath);
        return {
          textId: parseAt(parseTextId, entry.textId, `${entryPath}/textId`, "invalid_id"),
          text: parseTextCatalogTextV1(entry.text, `${entryPath}/text`),
        };
      },
    );
    assertUniqueValues(
      entries.map((entry) => entry.textId),
      `${catalogPath}/entries`,
    );
    return {
      locale: parseAt(parseLocaleId, catalog.locale, `${catalogPath}/locale`, "invalid_id"),
      fallbackLocale: parseNullableAt(
        parseLocaleId,
        catalog.fallbackLocale,
        `${catalogPath}/fallbackLocale`,
        "invalid_id",
      ),
      entries,
    };
  });

  assertUniqueValues(
    catalogs.map((catalog) => catalog.locale),
    "/catalogs",
  );
  const catalogsByLocale = new Map(catalogs.map((catalog) => [catalog.locale, catalog]));
  const defaultCatalog = catalogsByLocale.get(defaultLocale);
  if (defaultCatalog === undefined) {
    catalogFailure(
      "presentation.catalog.missing_reference",
      "/defaultLocale",
      "default_locale_missing",
      defaultLocale,
    );
  }
  if (defaultCatalog.fallbackLocale !== null) {
    catalogFailure(
      "presentation.catalog.invalid_shape",
      "/catalogs",
      "default_locale_has_fallback",
      defaultLocale,
    );
  }

  catalogs.forEach((catalog, catalogIndex) => {
    if (catalog.locale === defaultLocale) return;
    if (catalog.fallbackLocale === null) {
      catalogFailure(
        "presentation.catalog.invalid_shape",
        `/catalogs/${catalogIndex}/fallbackLocale`,
        "non_default_fallback_missing",
        catalog.locale,
      );
    }
    const visited = new Set<LocaleId>([catalog.locale]);
    let nextLocale: LocaleId = catalog.fallbackLocale;
    while (nextLocale !== defaultLocale) {
      if (visited.has(nextLocale)) {
        catalogFailure(
          "presentation.catalog.invalid_shape",
          `/catalogs/${catalogIndex}/fallbackLocale`,
          "fallback_cycle",
          nextLocale,
        );
      }
      visited.add(nextLocale);
      const nextCatalog = catalogsByLocale.get(nextLocale);
      if (nextCatalog === undefined) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/catalogs/${catalogIndex}/fallbackLocale`,
          "fallback_locale_missing",
          nextLocale,
        );
      }
      if (nextCatalog.fallbackLocale === null) {
        catalogFailure(
          "presentation.catalog.invalid_shape",
          `/catalogs/${catalogIndex}/fallbackLocale`,
          "fallback_does_not_reach_default",
          nextLocale,
        );
      }
      nextLocale = nextCatalog.fallbackLocale;
    }
  });

  return Object.freeze({ defaultLocale, catalogs });
}

export function parseTextCatalogSetV1(value: unknown): TextCatalogSetV1 {
  try {
    return parseTextCatalogSetDataV1(value);
  } catch (error) {
    if (error instanceof PresentationCatalogValidationError) throw error;
    if (error instanceof PresentationDataError) {
      return catalogFailure("presentation.catalog.invalid_shape", error.path, error.reason);
    }
    return catalogFailure("presentation.catalog.invalid_shape", "/", "invalid_catalog_data");
  }
}
