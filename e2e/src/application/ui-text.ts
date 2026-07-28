// SPDX-License-Identifier: MIT
import { labTextCatalogsV1 } from "../presentation.ts";

const labTextByIdV1: ReadonlyMap<string, string> = new Map(
  labTextCatalogsV1.catalogs.flatMap((catalog) =>
    catalog.entries.map((entry) => [entry.textId as string, entry.text] as const),
  ),
);

export function labUiTextV1(textId: string): string {
  const text = labTextByIdV1.get(textId);
  if (text === undefined) throw new TypeError(`e2e.ui_text_missing:${textId}`);
  return text;
}
