// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  type ProgramUiLocalizationV1,
  resolveProgramUiLocalizationV1,
} from "./program-ui-localization.ts";

describe("Program UI localization", () => {
  const localization = {
    defaultLocale: "en",
    locales: {
      en: { title: "Start" },
      "zh-CN": { title: "开始" },
    },
  } as const;

  it("prefers the exact Host locale", () => {
    expect(resolveProgramUiLocalizationV1(localization, "zh-CN")).toEqual({ title: "开始" });
  });

  it("falls back only to the package-declared default locale", () => {
    expect(resolveProgramUiLocalizationV1(localization, "fr")).toEqual({ title: "Start" });
    const missingDefault: ProgramUiLocalizationV1<
      { readonly title: string },
      "en" | "fr"
    > = {
      defaultLocale: "fr",
      locales: { en: { title: "Start" } },
    };
    expect(resolveProgramUiLocalizationV1(missingDefault, "zh-CN")).toBeNull();
  });

  it("returns null when optional localized UI is absent", () => {
    expect(resolveProgramUiLocalizationV1(null, "en")).toBeNull();
    expect(resolveProgramUiLocalizationV1(undefined, "en")).toBeNull();
  });
});
