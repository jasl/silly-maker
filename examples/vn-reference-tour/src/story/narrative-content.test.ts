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

describe("VN Reference Tour M1 content denominator", () => {
  it("keeps exact 29/15/15 locale-complete packs and a 59-entry union", () => {
    const pairs = [
      [sharedChineseV1, sharedEnglishV1, 29],
      [archiveChineseV1, archiveEnglishV1, 15],
      [presentChineseV1, presentEnglishV1, 15],
    ] as const;
    for (const [chinese, english, expected] of pairs) {
      expect(chinese.entries).toHaveLength(expected);
      expect(english.entries).toHaveLength(expected);
      expect(idsV1(english)).toEqual(idsV1(chinese));
      expect(chinese.entries.every((entry) => entry.text.length > 0)).toBe(true);
      expect(english.entries.every((entry) => entry.text.length > 0)).toBe(true);
    }

    const packedIds = pairs.flatMap(([chinese]) => idsV1(chinese));
    expect(new Set(packedIds).size).toBe(59);
    expect([...new Set(narrativeTextIdsV1())].toSorted()).toEqual(
      [...new Set(packedIds)].toSorted(),
    );
  });
});
