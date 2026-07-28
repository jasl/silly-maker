// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { diffPlainDataV1 } from "./plain-data-diff.ts";

describe("plain-data diff", () => {
  it("reports added, removed, and changed paths deep in objects and arrays", () => {
    const before = {
      cat: { trust: 10, vigor: 60 },
      flags: ["a", "b"],
      shop: { money: 50 },
    };
    const after = {
      cat: { trust: 13, vigor: 60, skill: 1 },
      flags: ["a"],
      wallet: { money: 50 },
    };
    expect(diffPlainDataV1(before, after)).toEqual([
      { kind: "added", path: "/cat/skill", after: 1 },
      { kind: "changed", path: "/cat/trust", before: 10, after: 13 },
      { kind: "removed", path: "/flags/1", before: "b" },
      { kind: "removed", path: "/shop", before: { money: 50 } },
      { kind: "added", path: "/wallet", after: { money: 50 } },
    ]);
  });

  it("returns empty for deep equality and handles root-level changes", () => {
    expect(diffPlainDataV1({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([]);
    expect(diffPlainDataV1(1, "1")).toEqual([
      { kind: "changed", path: "/", before: 1, after: "1" },
    ]);
    // Type changes at a path report as one changed entry, not a recursion.
    expect(diffPlainDataV1({ a: [1] }, { a: { 0: 1 } })).toEqual([
      { kind: "changed", path: "/a", before: [1], after: { 0: 1 } },
    ]);
  });

  it("escapes JSON-pointer special characters in keys", () => {
    expect(diffPlainDataV1({ "a/b": 1, "c~d": 2 }, { "a/b": 9, "c~d": 2 })).toEqual([
      { kind: "changed", path: "/a~1b", before: 1, after: 9 },
    ]);
  });
});
