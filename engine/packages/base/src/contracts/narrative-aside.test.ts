// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseNarrativeAsidePagesV1 } from "./narrative-aside.ts";

describe("narrative aside admission", () => {
  it("admits pages with optional speakers and freezes the list", () => {
    const pages = parseNarrativeAsidePagesV1([
      { speakerTextId: "text.app.heroine", textId: "text.app.aside.first" },
      { speakerTextId: null, textId: "text.app.aside.second" },
    ]);
    expect(pages).toEqual([
      { speakerTextId: "text.app.heroine", textId: "text.app.aside.first" },
      { speakerTextId: null, textId: "text.app.aside.second" },
    ]);
    expect(Object.isFrozen(pages)).toBe(true);
    expect(Object.isFrozen(pages[0])).toBe(true);
    // An empty projection means "no aside this commit".
    expect(parseNarrativeAsidePagesV1([])).toEqual([]);
  });

  it("admits page lists beyond the historical count ceiling", () => {
    const input = Array.from({ length: 17 }, (_, index) => ({
      speakerTextId: null,
      textId: `text.app.aside.page-${String(index)}`,
    }));

    expect(parseNarrativeAsidePagesV1(input)).toHaveLength(input.length);
  });

  it("rejects non-arrays, malformed pages, and bad ids", () => {
    expect(() => parseNarrativeAsidePagesV1(null)).toThrowError(/array_expected/);
    expect(() => parseNarrativeAsidePagesV1(["text.app.aside.first"])).toThrowError(
      /object_expected/,
    );
    expect(() => parseNarrativeAsidePagesV1([{ textId: "text.app.aside.first" }]))
      .toThrowError(/object_keys/);
    expect(() =>
      parseNarrativeAsidePagesV1([
        { speakerTextId: null, textId: "text.app.aside.first", extra: 1 },
      ])
    ).toThrowError(/object_keys/);
    expect(() => parseNarrativeAsidePagesV1([{ speakerTextId: null, textId: "NOT-AN-ID" }]))
      .toThrowError(/text_id_invalid/);
    expect(() =>
      parseNarrativeAsidePagesV1([
        { speakerTextId: "Heroine", textId: "text.app.aside.first" },
      ])
    ).toThrowError(/speaker_text_id_invalid/);
    expect(() => parseNarrativeAsidePagesV1([{ speakerTextId: null, textId: "solo" }]))
      .toThrowError(/text_id_invalid/);
  });
});
