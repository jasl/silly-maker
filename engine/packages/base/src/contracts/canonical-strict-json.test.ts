// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "./canonical-json.ts";
import {
  canonicalJsonBytesWithStrictLimitsInternalV1,
  parseStrictJson,
  parseStrictJsonLimitsV1,
} from "./strict-json.ts";
import type {
  StrictJsonErrorCodeV1,
  StrictJsonLimitsInputV1,
  StrictJsonLimitsV1,
} from "./strict-json.ts";

const defaultLimitsInputV1 = Object.freeze({
  maxBytes: 1024,
  maxDepth: 16,
  maxArrayItems: 64,
  maxObjectMembers: 64,
  maxNodes: 256,
  maxStringBytes: 512,
});

function limitsV1(overrides: Partial<StrictJsonLimitsInputV1> = {}): StrictJsonLimitsV1 {
  return parseStrictJsonLimitsV1({ ...defaultLimitsInputV1, ...overrides });
}

function ownKeyObjectV1(key: string, value: unknown): Record<string, unknown> {
  return Object.defineProperty({}, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function sparseArrayV1(): unknown[] {
  const value: unknown[] = [];
  value.length = 1;
  return value;
}

function generatedCanonicalValueV1(seed: number, depth = 0): unknown {
  const mixed = (Math.imul(seed ^ 0x9e37_79b9, 1_664_525) + 1_013_904_223) >>> 0;
  const strings = ["", "\0", "é", "😀", "line\nbreak", '"quoted"', "e\u0301", "𐀀"];
  const primitive = (): unknown => {
    switch (mixed % 4) {
      case 0:
        return null;
      case 1:
        return mixed % 2 === 0;
      case 2:
        return (mixed % 2_001) - 1_000;
      default:
        return strings[mixed % strings.length];
    }
  };
  if (depth >= 4 || mixed % 3 === 0) return primitive();
  if (mixed % 2 === 0) {
    const length = (mixed >>> 4) % 4;
    return Array.from(
      { length },
      (_, index) => generatedCanonicalValueV1(mixed + index + 1, depth + 1),
    );
  }
  const size = (mixed >>> 5) % 4;
  return Object.fromEntries(
    Array.from({ length: size }, (_, index) => [
      `${strings[(mixed + index) % strings.length]}:${index}`,
      generatedCanonicalValueV1(mixed + index + 17, depth + 1),
    ]),
  );
}

function expectOracleEquivalentV1(
  value: unknown,
  limits: StrictJsonLimitsV1,
  expectedCode?: StrictJsonErrorCodeV1,
): void {
  const expectedBytes = canonicalJsonBytes(value);
  const expected = parseStrictJson(expectedBytes, limits);
  const actual = canonicalJsonBytesWithStrictLimitsInternalV1(value, limits);

  expect(actual.bytes).toEqual(expectedBytes);
  expect(actual.ok).toBe(expected.ok);
  if (expected.ok) {
    expect(actual).toEqual({ ok: true, bytes: expectedBytes });
    expect(expectedCode).toBeUndefined();
    return;
  }
  if (actual.ok) throw new TypeError("combined encoder accepted a rejected oracle value");
  expect(actual).toEqual({
    ok: false,
    bytes: expectedBytes,
    error: { code: expected.error.code },
  });
  if (expectedCode !== undefined) expect(actual.error.code).toBe(expectedCode);
}

describe("canonical JSON with Strict limits", () => {
  it.each(
    [
      [
        "total bytes before every structural limit",
        [[[0]]],
        { maxBytes: 1, maxDepth: 1, maxNodes: 1 },
        "limit.bytes",
      ],
      ["depth before nodes", [0], { maxDepth: 1, maxNodes: 1 }, "limit.depth"],
      ["node count", [0, 1, 2], { maxNodes: 3 }, "limit.nodes"],
      ["array item count", [0, 1, 2], { maxArrayItems: 2 }, "limit.array_items"],
      [
        "object member count",
        { a: 0, b: 1, c: 2 },
        { maxObjectMembers: 2 },
        "limit.object_members",
      ],
      ["decoded value string bytes", "éé", { maxStringBytes: 3 }, "limit.string_bytes"],
      [
        "decoded key string bytes",
        ownKeyObjectV1("éé", 0),
        { maxStringBytes: 3 },
        "limit.string_bytes",
      ],
      ["dangerous __proto__ key", ownKeyObjectV1("__proto__", 0), {}, "object.dangerous_key"],
      ["dangerous prototype key", ownKeyObjectV1("prototype", 0), {}, "object.dangerous_key"],
      ["dangerous constructor key", ownKeyObjectV1("constructor", 0), {}, "object.dangerous_key"],
    ] as const,
  )("%s matches the prior two-pass oracle", (_label, value, overrides, code) => {
    expectOracleEquivalentV1(value, limitsV1(overrides), code);
  });

  it("matches exact boundaries, aliases, Unicode keys, and decoded string accounting", () => {
    const shared = Object.freeze({ a: 1 });
    const representative = {
      "😀": [shared, shared],
      "\u{10000}": "\0",
      "\ue000": "éé",
    };
    const bytes = canonicalJsonBytes(representative);

    expectOracleEquivalentV1(
      representative,
      limitsV1({
        maxBytes: bytes.byteLength,
        maxDepth: 4,
        maxArrayItems: 2,
        maxObjectMembers: 3,
        maxNodes: 8,
        maxStringBytes: 4,
      }),
    );
    expect(new TextDecoder().decode(bytes)).toBe('{"":"éé","𐀀":"\\u0000","😀":[{"a":1},{"a":1}]}');
  });

  it.each(
    [
      [
        "array item count before the extra child",
        [0, [[0]]],
        { maxArrayItems: 1, maxDepth: 2 },
        "limit.array_items",
      ],
      [
        "object member count before the extra key",
        Object.fromEntries([
          ["a", 0],
          ["constructor", 1],
        ]),
        { maxObjectMembers: 1, maxStringBytes: 1 },
        "limit.object_members",
      ],
      [
        "nodes before a current string",
        { a: "éé" },
        { maxNodes: 1, maxStringBytes: 3 },
        "limit.nodes",
      ],
      [
        "key string bytes before dangerous-key rejection",
        ownKeyObjectV1("constructor", 0),
        { maxStringBytes: 1 },
        "limit.string_bytes",
      ],
      [
        "dangerous key before its deep value",
        ownKeyObjectV1("constructor", [[0]]),
        { maxDepth: 2 },
        "object.dangerous_key",
      ],
      [
        "canonical key order before insertion order",
        Object.fromEntries([
          ["constructor", 0],
          ["aaaaaaaaaaaa", 0],
        ]),
        { maxStringBytes: 11 },
        "limit.string_bytes",
      ],
    ] as const,
  )("%s preserves Strict parser precedence", (_label, value, overrides, code) => {
    expectOracleEquivalentV1(value, limitsV1(overrides), code);
  });

  it("does not let an earlier Strict violation hide a later canonical failure", () => {
    const dangerousCycle = ownKeyObjectV1("constructor", 0);
    dangerousCycle.z = dangerousCycle;
    expect(() => canonicalJsonBytesWithStrictLimitsInternalV1(dangerousCycle, limitsV1()))
      .toThrowError(
        expect.objectContaining({
          name: "CanonicalJsonError",
          code: "value.cycle",
          path: "/z",
        }),
      );

    expect(() =>
      canonicalJsonBytesWithStrictLimitsInternalV1([0, -0], limitsV1({ maxArrayItems: 1 }))
    ).toThrowError(
      expect.objectContaining({
        name: "CanonicalJsonError",
        code: "number.negative_zero",
        path: "/1",
      }),
    );

    const laterGetter = Object.defineProperties(
      {},
      {
        a: { enumerable: true, value: "too long" },
        z: { enumerable: true, get: () => 1 },
      },
    );
    expect(() =>
      canonicalJsonBytesWithStrictLimitsInternalV1(laterGetter, limitsV1({ maxStringBytes: 1 }))
    ).toThrowError(
      expect.objectContaining({
        name: "CanonicalJsonError",
        code: "value.getter",
        path: "/z",
      }),
    );
  });

  it("matches the unobserved canonical fast path across a generated corpus", () => {
    for (let seed = 0; seed < 512; seed += 1) {
      expectOracleEquivalentV1(
        generatedCanonicalValueV1(seed),
        limitsV1({
          maxBytes: (seed % 256) + 1,
          maxDepth: (seed % 6) + 1,
          maxArrayItems: (seed % 4) + 1,
          maxObjectMembers: ((seed >>> 1) % 4) + 1,
          maxNodes: (seed % 32) + 1,
          maxStringBytes: (seed % 16) + 1,
        }),
      );
    }
  });

  it("preserves canonical accessor behavior without extra reads", () => {
    let objectGetterCalls = 0;
    const objectWithGetter = Object.defineProperty({}, "x", {
      enumerable: true,
      get() {
        objectGetterCalls += 1;
        return 1;
      },
    });
    expect(() => canonicalJsonBytesWithStrictLimitsInternalV1(objectWithGetter, limitsV1()))
      .toThrow(CanonicalJsonError);
    expect(objectGetterCalls).toBe(0);

    let arrayGetterCalls = 0;
    const arrayWithGetter: unknown[] = [];
    Object.defineProperty(arrayWithGetter, 0, {
      configurable: true,
      enumerable: true,
      get() {
        arrayGetterCalls += 1;
        return "value";
      },
    });
    const encoded = canonicalJsonBytesWithStrictLimitsInternalV1(arrayWithGetter, limitsV1());
    expect(encoded).toEqual({
      ok: true,
      bytes: new TextEncoder().encode('["value"]'),
    });
    expect(arrayGetterCalls).toBe(1);

    const sentinel = new Error("array getter sentinel");
    const throwingArray: unknown[] = [];
    Object.defineProperty(throwingArray, 0, {
      configurable: true,
      enumerable: true,
      get() {
        throw sentinel;
      },
    });
    let caught: unknown;
    try {
      canonicalJsonBytesWithStrictLimitsInternalV1(throwingArray, limitsV1());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(sentinel);
  });

  it.each(
    [
      ["undefined", undefined, "value.undefined", ""],
      ["a symbol", Symbol("symbol"), "value.undefined", ""],
      ["a function", () => undefined, "value.function", ""],
      ["a sparse array", sparseArrayV1(), "value.sparse_array", "/0"],
      ["a custom object prototype", Object.create(null), "value.custom_prototype", ""],
      ["a non-finite number", Number.POSITIVE_INFINITY, "number.non_finite", ""],
      ["a fractional number", 1.5, "number.not_integer", ""],
      ["an unsafe integer", Number.MAX_SAFE_INTEGER + 1, "number.unsafe_integer", ""],
      ["negative zero", -0, "number.negative_zero", ""],
      ["a lone surrogate value", "\ud800", "string.lone_surrogate", ""],
      ["a lone surrogate key", ownKeyObjectV1("\ud800", 0), "string.lone_surrogate", ""],
    ] as const,
  )("preserves the canonical error for %s", (_label, value, code, path) => {
    expect(() => canonicalJsonBytesWithStrictLimitsInternalV1(value, limitsV1())).toThrowError(
      expect.objectContaining({
        name: "CanonicalJsonError",
        code,
        path,
      }),
    );
  });

  it("preserves non-enumerable, symbol, and array-property behavior", () => {
    const symbol = Symbol("ignored");
    const object = Object.defineProperties(
      {},
      {
        hidden: { configurable: true, value: 1 },
        [symbol]: {
          configurable: true,
          get() {
            throw new Error("symbol getter must remain ignored");
          },
        },
      },
    );
    expect(canonicalJsonBytesWithStrictLimitsInternalV1(object, limitsV1())).toEqual({
      ok: true,
      bytes: new TextEncoder().encode('{"hidden":1}'),
    });

    let extraGetterCalls = 0;
    const array: unknown[] = [];
    Object.defineProperties(array, {
      0: { configurable: true, value: 1 },
      extra: {
        configurable: true,
        get() {
          extraGetterCalls += 1;
          return 2;
        },
      },
    });
    Object.setPrototypeOf(array, null);
    expect(canonicalJsonBytesWithStrictLimitsInternalV1(array, limitsV1())).toEqual({
      ok: true,
      bytes: new TextEncoder().encode("[1]"),
    });
    expect(extraGetterCalls).toBe(0);
  });
});
