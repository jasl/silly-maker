// SPDX-License-Identifier: MIT

/**
 * Package-owned localized UI data admitted by a concrete Program profile.
 * The Host only selects a value; it does not interpret the Program's copy.
 */
export interface ProgramUiLocalizationV1<
  TCopy,
  TLocale extends string = string,
> {
  readonly defaultLocale: TLocale;
  readonly locales: Readonly<Partial<Record<TLocale, TCopy>>>;
}

/** Resolves exact Host locale first, then the package-declared default. */
export function resolveProgramUiLocalizationV1<
  TCopy,
  TLocale extends string,
>(
  localization: ProgramUiLocalizationV1<TCopy, TLocale> | null | undefined,
  hostLocale: string,
): TCopy | null {
  if (localization === null || localization === undefined) return null;
  return localization.locales[hostLocale as TLocale] ??
    localization.locales[localization.defaultLocale] ?? null;
}
