// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";

import { describe, expect, it } from "vitest";

import {
  applySillyOsDocumentPreferencesV1,
  resolveSillyOsColorSchemeV1,
} from "../product/browser-product-theme.ts";

describe("SillyOS Browser product theme", () => {
  it("resolves explicit and system modes without persisting a derived scheme", () => {
    expect(resolveSillyOsColorSchemeV1("system", false)).toBe("light");
    expect(resolveSillyOsColorSchemeV1("system", true)).toBe("dark");
    expect(resolveSillyOsColorSchemeV1("light", true)).toBe("light");
    expect(resolveSillyOsColorSchemeV1("dark", false)).toBe("dark");
  });

  it("updates only document-owned native chrome metadata", () => {
    document.head.innerHTML = [
      '<meta name="color-scheme" content="light">',
      '<meta name="theme-color" content="#ffffff">',
    ].join("");

    applySillyOsDocumentPreferencesV1({
      document,
      locale: "zh-CN",
      colorScheme: "dark",
    });

    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.documentElement).toHaveAttribute("data-silly-os-color-scheme", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute(
      "content",
      "light dark",
    );
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#101210",
    );
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
