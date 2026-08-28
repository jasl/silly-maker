// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

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
import { vnReferenceTourScriptV1 } from "./narrative.ts";

type TextPackV1 = {
  readonly entries: readonly { readonly textId: string; readonly text: string }[];
};

function idsV1(pack: TextPackV1): readonly string[] {
  return pack.entries.map((entry) => entry.textId);
}

function narrativeTextIdsV1(): readonly string[] {
  return vnReferenceTourScriptV1.flatMap((node) => {
    if (node.kind === "say") return [node.textId];
    if (node.kind === "choice") {
      return [node.promptTextId, ...node.options.map((option) => option.textId)];
    }
    return [];
  });
}

const chineseGraphemeSegmenterV1 = new Intl.Segmenter("zh-CN", {
  granularity: "grapheme",
});

function nonWhitespaceGraphemesV1(entries: readonly { readonly text: string }[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const { segment } of chineseGraphemeSegmenterV1.segment(entry.text)) {
      if (!/\s/u.test(segment)) total += 1;
    }
  }
  return total;
}

function wordCountV1(entries: readonly { readonly text: string }[]): number {
  return entries.reduce(
    (total, entry) => total + (entry.text.match(/\p{L}+(?:['’]\p{L}+)*/gu)?.length ?? 0),
    0,
  );
}

describe("VN Reference Tour maintained product denominator", () => {
  it("keeps exact 54/28/28 locale-complete packs and a 110-entry union", () => {
    const pairs = [
      [sharedChineseV1, sharedEnglishV1, 54],
      [archiveChineseV1, archiveEnglishV1, 28],
      [presentChineseV1, presentEnglishV1, 28],
    ] as const;
    for (const [chinese, english, expected] of pairs) {
      expect(chinese.entries).toHaveLength(expected);
      expect(english.entries).toHaveLength(expected);
      expect(idsV1(english)).toEqual(idsV1(chinese));
      expect(chinese.entries.every((entry) => entry.text.length > 0)).toBe(true);
      expect(english.entries.every((entry) => entry.text.length > 0)).toBe(true);
    }

    const packedIds = pairs.flatMap(([chinese]) => idsV1(chinese));
    expect(new Set(packedIds).size).toBe(110);
    expect([...new Set(narrativeTextIdsV1())].toSorted()).toEqual(
      [...new Set(packedIds)].toSorted(),
    );
  });

  it("keeps each route within the frozen first-play reading-volume budget", () => {
    for (
      const [chineseRoute, englishRoute] of [
        [archiveChineseV1, archiveEnglishV1],
        [presentChineseV1, presentEnglishV1],
      ] as const
    ) {
      const chineseEntries = [...sharedChineseV1.entries, ...chineseRoute.entries];
      const englishEntries = [...sharedEnglishV1.entries, ...englishRoute.entries];

      expect(nonWhitespaceGraphemesV1(chineseEntries)).toBeGreaterThanOrEqual(3_000);
      expect(nonWhitespaceGraphemesV1(chineseEntries)).toBeLessThanOrEqual(4_500);
      expect(wordCountV1(englishEntries)).toBeGreaterThanOrEqual(1_800);
      expect(wordCountV1(englishEntries)).toBeLessThanOrEqual(2_600);
    }
  });
});
