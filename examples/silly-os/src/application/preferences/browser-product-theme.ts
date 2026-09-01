// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { SillyOsLocaleV1 } from "../../content/copy.ts";
import type { SillyOsThemeModeV1 } from "./browser-product-preferences-repository.ts";

export type SillyOsColorSchemeV1 = "light" | "dark";

export function resolveSillyOsColorSchemeV1(
  mode: SillyOsThemeModeV1,
  systemPrefersDark: boolean,
): SillyOsColorSchemeV1 {
  return mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;
}

/** Synchronizes only document-owned native chrome metadata; product CSS stays scoped. */
export function applySillyOsDocumentPreferencesV1(input: {
  readonly document: Document;
  readonly locale: SillyOsLocaleV1;
  readonly colorScheme: SillyOsColorSchemeV1;
}): void {
  input.document.documentElement.lang = input.locale;
  input.document.documentElement.dataset.sillyOsColorScheme = input.colorScheme;
  input.document.documentElement.style.colorScheme = input.colorScheme;
  const colorSchemeMeta = input.document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  );
  if (colorSchemeMeta !== null) colorSchemeMeta.content = "light dark";
  const themeColor = input.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor !== null) {
    themeColor.content = input.colorScheme === "dark" ? "#101210" : "#f6f6f4";
  }
}
