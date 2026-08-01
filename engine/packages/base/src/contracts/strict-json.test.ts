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

function exactNumberOracleV1(source: string):
  | { readonly ok: true; readonly value: number }
  | {
    readonly ok: false;
    readonly error: {
      readonly code:
        | "number.not_integer"
        | "number.unsafe_integer"
        | "number.negative_zero";
      readonly offset: 0;
    };
  } {
  const match = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:e([+-]?[0-9]+))?$/iu.exec(source);
  if (match === null) throw new TypeError("invalid exact-number oracle input");
  const negative = match[1] === "-";
  const fraction = match[3] ?? "";
  const coefficient = BigInt(`${match[2]}${fraction}`);
  if (coefficient === 0n) {
    return negative
      ? { ok: false, error: { code: "number.negative_zero", offset: 0 } }
      : { ok: true, value: 0 };
  }

  const scale = Number(match[4] ?? "0") - fraction.length;
  let integer: bigint;
  if (scale >= 0) {
    integer = coefficient * (10n ** BigInt(scale));
  } else {
    const divisor = 10n ** BigInt(-scale);
    if (coefficient % divisor !== 0n) {
      return { ok: false, error: { code: "number.not_integer", offset: 0 } };
    }
    integer = coefficient / divisor;
  }
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: { code: "number.unsafe_integer", offset: 0 } };
  }
  const value = Number(integer);
  return { ok: true, value: negative ? -value : value };
}

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

  it.each([
    "1e-324",
    "-1e-324",
    "0.999999999999999999999",
    "9007199254740990.6",
    "9007199254740991.1",
    "900719925474099.11e1",
  ])("rejects the exact-decimal fraction %s before binary64 conversion", (source) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: false,
      error: { code: "number.not_integer", offset: 0 },
    });
  });

  it.each(
    [
      ["0", 0],
      ["0.0", 0],
      ["0e+99", 0],
      ["1.0", 1],
      ["1e0", 1],
      ["10e-1", 1],
      ["100e-2", 1],
      ["0.0100e2", 1],
      ["-0.0001e4", -1],
      ["9007199254740991", 9_007_199_254_740_991],
      ["90071992547409910e-1", 9_007_199_254_740_991],
      ["900719925474099.1e1", 9_007_199_254_740_991],
      ["-9007199254740991", -9_007_199_254_740_991],
      ["-90071992547409910e-1", -9_007_199_254_740_991],
    ] as const,
  )("accepts the exact safe-integer spelling %s", (source, expected) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: true,
      value: expected,
    });
  });

  // sillymaker-determinism-vector: rejects-the-negative-zero-spelling
  it.each([
    "-0",
    "-0.0",
    "-0e0",
    "-0e+999999999999999999999999999999999999999999999999999999999999999999",
    "-0.000e-999999999999999999999999999999999999999999999999999999999999999999",
  ])("rejects the negative-zero spelling %s", (source) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: false,
      error: { code: "number.negative_zero", offset: 0 },
    });
  });

  it.each([
    "9007199254740992",
    "-9007199254740992",
    "90071992547409920e-1",
    "900719925474099.2e1",
    "1e309",
    `1e${"9".repeat(512)}`,
  ])("rejects the exact integer outside the safe range %s", (source) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: false,
      error: { code: "number.unsafe_integer", offset: 0 },
    });
  });

  it("handles long coefficients and exponents without approximate or unbounded arithmetic", () => {
    const exactOne = `1${"0".repeat(512)}e-512`;
    const tinyFraction = `1e-${"9".repeat(512)}`;
    const exactZero = `0e+${"9".repeat(512)}`;

    expect(parseStrictJson(new TextEncoder().encode(exactOne), limits)).toEqual({
      ok: true,
      value: 1,
    });
    expect(parseStrictJson(new TextEncoder().encode(tinyFraction), limits)).toEqual({
      ok: false,
      error: { code: "number.not_integer", offset: 0 },
    });
    expect(parseStrictJson(new TextEncoder().encode(exactZero), limits)).toEqual({
      ok: true,
      value: 0,
    });
  });

  it("matches an independent exact-integer oracle across a generated decimal corpus", () => {
    for (let seed = 0; seed < 2_048; seed += 1) {
      const mixed = (Math.imul(seed ^ 0x6d2b_79f5, 1_664_525) + 1_013_904_223) >>> 0;
      const digits = `${(BigInt(mixed) * 9_007_199_254_740_993n) % 99_999_999_999_999_999n + 1n}`;
      const split = (mixed >>> 8) % (digits.length + 1);
      const integer = split === 0 ? "0" : digits.slice(0, split);
      const fraction = split === digits.length ? "" : `.${digits.slice(split)}`;
      const exponent = ((mixed >>> 16) % 49) - 24;
      const sign = (mixed & 1) === 0 ? "" : "-";
      const source = `${sign}${integer}${fraction}e${exponent}`;

      expect(parseStrictJson(new TextEncoder().encode(source), limits), source).toEqual(
        exactNumberOracleV1(source),
      );
    }
  });

  it("preserves byte, structural, duplicate-key, and syntax precedence", () => {
    const tinyLimits = parseStrictJsonLimitsV1({
      ...limits,
      maxBytes: 8,
      maxDepth: 1,
      maxArrayItems: 1,
    });

    expect(parseStrictJson(new TextEncoder().encode("1e-324000"), tinyLimits)).toEqual({
      ok: false,
      error: { code: "limit.bytes" },
    });
    expect(parseStrictJson(new TextEncoder().encode("[1e-324]"), tinyLimits)).toMatchObject({
      ok: false,
      error: { code: "limit.depth" },
    });
    expect(
      parseStrictJson(
        new TextEncoder().encode("[0,1e-324]"),
        parseStrictJsonLimitsV1({ ...limits, maxBytes: 64, maxArrayItems: 1 }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "limit.array_items" },
    });
    expect(
      parseStrictJson(
        new TextEncoder().encode('{"a":1,"a":1e-324}'),
        parseStrictJsonLimitsV1({ ...limits, maxBytes: 64 }),
      ),
    ).toEqual({
      ok: false,
      error: { code: "object.duplicate_key", offset: 7 },
    });
    for (const source of ["1e", "1e+", "1.", "01", "--0"]) {
      expect(parseStrictJson(new TextEncoder().encode(source), limits), source).toMatchObject({
        ok: false,
        error: { code: "syntax.invalid" },
      });
    }
  });

  it.each(
    [
      [
        "later syntax",
        "0.999999999999999999999x",
        { code: "syntax.invalid", offset: 23 },
      ],
      [
        "later trailing comma",
        "[0.999999999999999999999,]",
        { code: "syntax.trailing_comma_forbidden", offset: 25 },
      ],
      [
        "later duplicate key",
        '{"a":1e-324,"a":1}',
        { code: "object.duplicate_key", offset: 12 },
      ],
    ] as const,
  )("keeps %s ahead of a newly rejected exact-decimal token", (_label, source, error) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: false,
      error,
    });
  });

  it("keeps a later node limit ahead of a newly rejected exact-decimal token", () => {
    expect(
      parseStrictJson(
        new TextEncoder().encode("[1e-324,0]"),
        parseStrictJsonLimitsV1({ ...limits, maxNodes: 2 }),
      ),
    ).toEqual({
      ok: false,
      error: { code: "limit.nodes", offset: 8 },
    });
  });

  it.each(
    [
      ["1.5x", { code: "number.not_integer", offset: 0 }],
      ["-0x", { code: "number.negative_zero", offset: 0 }],
      ["9007199254740992x", { code: "number.unsafe_integer", offset: 0 }],
    ] as const,
  )("keeps the existing immediate numeric failure for %s", (source, error) => {
    expect(parseStrictJson(new TextEncoder().encode(source), limits)).toEqual({
      ok: false,
      error,
    });
  });
});
