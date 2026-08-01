// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseStrictJson, parseStrictJsonLimitsV1 } from "./strict-json.ts";

const limits = parseStrictJsonLimitsV1({
  maxBytes: 1024,
  maxDepth: 16,
  maxArrayItems: 64,
  maxObjectMembers: 64,
  maxNodes: 256,
  maxStringBytes: 512,
});

describe("Strict JSON", () => {
  it("rejects duplicate keys and a UTF-8 BOM", () => {
    expect(parseStrictJson(new TextEncoder().encode('{"a":1,"a":2}'), limits)).toMatchObject({
      ok: false,
      error: { code: "object.duplicate_key" },
    });
    expect(parseStrictJson(Uint8Array.of(0xef, 0xbb, 0xbf, 0x7b, 0x7d), limits)).toMatchObject({
      ok: false,
      error: { code: "encoding.bom_forbidden" },
    });
  });

  it.each(['"\\ud800"', '{"\\ud800":true}'])(
    "rejects a trailing lone high surrogate in %s",
    (source) => {
      expect(parseStrictJson(new TextEncoder().encode(source), limits)).toMatchObject({
        ok: false,
        error: { code: "string.lone_surrogate" },
      });
    },
  );

  it("characterizes exact-decimal gaps and accepted alternate integer spellings", () => {
    const cases = [
      ["1e-324", { ok: true, value: 0 }],
      ["0.999999999999999999999", { ok: true, value: 1 }],
      ["9007199254740990.6", { ok: true, value: 9_007_199_254_740_991 }],
      ["9007199254740991.1", { ok: true, value: 9_007_199_254_740_991 }],
      ["1.0", { ok: true, value: 1 }],
      ["1e0", { ok: true, value: 1 }],
      ["10e-1", { ok: true, value: 1 }],
      ["100e-2", { ok: true, value: 1 }],
      ["0e+99", { ok: true, value: 0 }],
      ["9007199254740991", { ok: true, value: 9_007_199_254_740_991 }],
      ["-9007199254740991", { ok: true, value: -9_007_199_254_740_991 }],
      ["9007199254740992", { ok: false, error: { code: "number.unsafe_integer" } }],
      ["-9007199254740992", { ok: false, error: { code: "number.unsafe_integer" } }],
      ["1.5", { ok: false, error: { code: "number.not_integer" } }],
      ["-0.0", { ok: false, error: { code: "number.negative_zero" } }],
    ] as const;

    for (const [source, expected] of cases) {
      expect(parseStrictJson(new TextEncoder().encode(source), limits), source).toMatchObject(
        expected,
      );
    }
  });
});
