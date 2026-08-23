// SPDX-License-Identifier: MIT
// Tooling-only authoring copy. Player code reaches only the compact manifest
// and loads the same pack bytes through the Host at runtime.
import { parseTextCatalogSetV1 } from "@sillymaker/base";

import endingPackDocumentV1 from "../../assets/content/ending.text-pack.json" with {
  type: "json",
};
import openingPackDocumentV1 from "../../assets/content/opening.text-pack.json" with {
  type: "json",
};
import { templateTextCatalogsV1 } from "../content/presentation.ts";

const authoringCatalogsV1 = [
  templateTextCatalogsV1,
  parseTextCatalogSetV1(openingPackDocumentV1.textCatalogs),
  parseTextCatalogSetV1(endingPackDocumentV1.textCatalogs),
];

const authoringTextV1: ReadonlyMap<string, string> = new Map(
  authoringCatalogsV1.flatMap((catalogSet) =>
    catalogSet.catalogs.flatMap((catalog) =>
      catalog.entries.map((entry) => [`${catalog.locale}\0${entry.textId}`, entry.text] as const)
    )
  ),
);

export function templateAuthoringTextForLocaleV1(
  locale: string | null,
  textId: string,
): string | null {
  const requestedLocale = locale ?? authoringCatalogsV1[0]?.defaultLocale;
  if (requestedLocale === undefined) return null;
  return authoringTextV1.get(`${requestedLocale}\0${textId}`) ?? null;
}
