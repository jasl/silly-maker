// SPDX-License-Identifier: MIT
import { describe, expect, expectTypeOf, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import type { StrictJsonValueV1 } from "../contracts/strict-json.ts";
import {
  parsePositiveSafeInteger,
  type DeepReadonly,
  type PositiveSafeInteger,
} from "../contracts/values.ts";
import {
  type BoundedCanonicalJsonLimitsInternalV1,
  type BoundedCanonicalJsonProjectionResultInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "../runtime/internal.ts";

type ExactKeysV1<TValue> = TValue extends unknown ? keyof TValue : never;
type IsNeverV1<TValue> = [TValue] extends [never] ? true : false;
type ProjectedV1 = Extract<
  BoundedCanonicalJsonProjectionResultInternalV1,
  { readonly kind: "projected" }
>;
type RejectedV1 = Extract<
  BoundedCanonicalJsonProjectionResultInternalV1,
  { readonly kind: "rejected" }
>;

const decoderV1 = new TextDecoder();

function limitsV1(
  overrides: Partial<Record<keyof BoundedCanonicalJsonLimitsInternalV1, number>> = {},
): BoundedCanonicalJsonLimitsInternalV1 {
  return Object.freeze({
    maxBytes: parsePositiveSafeInteger(overrides.maxBytes ?? 65_536),
    maxDepth: parsePositiveSafeInteger(overrides.maxDepth ?? 32),
    maxNodes: parsePositiveSafeInteger(overrides.maxNodes ?? 4_096),
  });
}

function projectedV1(
  value: unknown,
  limits: BoundedCanonicalJsonLimitsInternalV1 = limitsV1(),
): ProjectedV1 {
  const result = projectBoundedCanonicalJsonInternalV1(value, limits);
  expect(result.kind).toBe("projected");
  if (result.kind !== "projected") {
    throw new TypeError(`expected projected result, received ${result.code}`);
  }
  return result;
}

function rejectedV1(
  value: unknown,
  code: RejectedV1["code"],
  limits: BoundedCanonicalJsonLimitsInternalV1 = limitsV1(),
): RejectedV1 {
  const result = projectBoundedCanonicalJsonInternalV1(value, limits);
  expect(result).toEqual({ kind: "rejected", code });
  if (result.kind !== "rejected") {
    throw new TypeError("expected rejected result");
  }
  expect(Object.isFrozen(result)).toBe(true);
  return result;
}

function expectDeepFrozenV1(value: unknown, visited = new Set<object>()): void {
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor !== undefined &&
      descriptor.get === undefined &&
      descriptor.set === undefined &&
      "value" in descriptor
    ) {
      expectDeepFrozenV1(descriptor.value, visited);
    }
  }
}

function objectWithOwnDataV1(
  entries: readonly (readonly [key: string, value: unknown, enumerable?: boolean])[],
): Record<string, unknown> {
  const value: Record<string, unknown> = {};
  for (const [key, entryValue, enumerable = true] of entries) {
    Object.defineProperty(value, key, {
      configurable: true,
      enumerable,
      value: entryValue,
      writable: true,
    });
  }
  return value;
}

function nestedToDepthV1(depth: number): unknown {
  let value: unknown = null;
  for (let currentDepth = 1; currentDepth < depth; currentDepth += 1) value = [value];
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
    return Array.from(
      { length: (mixed >>> 4) % 4 },
      (_, index) => generatedCanonicalValueV1(mixed + index + 1, depth + 1),
    );
  }
  return Object.fromEntries(
    Array.from({ length: (mixed >>> 5) % 4 }, (_, index) => [
      `${strings[(mixed + index) % strings.length]}:${index}`,
      generatedCanonicalValueV1(mixed + index + 17, depth + 1),
    ]),
  );
}

function expectExactThrowV1(value: unknown, sentinel: unknown): void {
  let caught: unknown;
  try {
    projectBoundedCanonicalJsonInternalV1(value, limitsV1());
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(sentinel);
}

describe("bounded canonical projection internal seam", () => {
  it("freezes the exact runtime-internal type and result boundary", () => {
    expectTypeOf<ExactKeysV1<BoundedCanonicalJsonLimitsInternalV1>>()
      .toEqualTypeOf<"maxBytes" | "maxDepth" | "maxNodes">();
    expectTypeOf<BoundedCanonicalJsonLimitsInternalV1["maxBytes"]>()
      .toEqualTypeOf<PositiveSafeInteger>();
    expectTypeOf<BoundedCanonicalJsonLimitsInternalV1["maxDepth"]>()
      .toEqualTypeOf<PositiveSafeInteger>();
    expectTypeOf<BoundedCanonicalJsonLimitsInternalV1["maxNodes"]>()
      .toEqualTypeOf<PositiveSafeInteger>();
    expectTypeOf<ExactKeysV1<ProjectedV1>>()
      .toEqualTypeOf<"kind" | "value" | "bytes">();
    expectTypeOf<ProjectedV1["value"]>()
      .toEqualTypeOf<DeepReadonly<StrictJsonValueV1>>();
    expectTypeOf<ProjectedV1["bytes"]>().toEqualTypeOf<Uint8Array>();
    expectTypeOf<ExactKeysV1<RejectedV1>>().toEqualTypeOf<"kind" | "code">();
    expectTypeOf<RejectedV1["code"]>().toEqualTypeOf<
      "canonical.invalid" | "limit.bytes" | "limit.depth" | "limit.nodes"
    >();
    expectTypeOf<BoundedCanonicalJsonProjectionResultInternalV1>().toEqualTypeOf<
      | {
        readonly kind: "projected";
        readonly value: DeepReadonly<StrictJsonValueV1>;
        readonly bytes: Uint8Array;
      }
      | {
        readonly kind: "rejected";
        readonly code:
          | "canonical.invalid"
          | "limit.bytes"
          | "limit.depth"
          | "limit.nodes";
      }
    >();
    expectTypeOf<
      IsNeverV1<Extract<BoundedCanonicalJsonProjectionResultInternalV1, { kind: "faulted" }>>
    >().toEqualTypeOf<true>();

    const projected = projectedV1({ nested: [1, { ok: true }] });
    expect(Object.keys(projected)).toEqual(["kind", "value", "bytes"]);
    expect(Object.isFrozen(projected)).toBe(true);
    expectDeepFrozenV1(projected.value);

    const rejected = rejectedV1(undefined, "canonical.invalid");
    expect(Object.keys(rejected)).toEqual(["kind", "code"]);
  });

  it("matches the public byte oracle on the detached projection across canonical values", () => {
    const values = [
      null,
      false,
      true,
      0,
      -1,
      Number.MAX_SAFE_INTEGER,
      "",
      'quote:" slash:/ backslash:\\ controls:\b\t\n\f\r\0',
      "é e\u0301 𐀀 😀",
      [null, true, -12, "nested"],
      { z: 0, a: [true, null] },
      objectWithOwnDataV1([
        ["hidden", 1, false],
        ["visible", "yes"],
      ]),
    ] as const;

    for (const value of values) {
      const result = projectedV1(value);
      expect(result.bytes).toEqual(canonicalJsonBytes(result.value));
      expectDeepFrozenV1(result.value);
    }

    const escaped = projectedV1('"\b\t\n\f\r\0\\😀');
    expect(decoderV1.decode(escaped.bytes)).toBe('"\\"\\b\\t\\n\\f\\r\\u0000\\\\😀"');

    for (let seed = 0; seed < 128; seed += 1) {
      const result = projectedV1(generatedCanonicalValueV1(seed));
      expect(result.bytes).toEqual(canonicalJsonBytes(result.value));
    }
  });

  it("uses canonical code-point key order and admits non-enumerable and dangerous keys", () => {
    const raw = objectWithOwnDataV1([
      ["😀", 3],
      ["𐀀", 2],
      ["\ue000", 1],
      ["__proto__", { safe: true }, false],
      ["prototype", 4],
      ["constructor", 5],
    ]);

    const result = projectedV1(raw);
    const projected = result.value as DeepReadonly<Record<string, StrictJsonValueV1>>;

    expect(result.bytes).toEqual(canonicalJsonBytes(projected));
    expect(decoderV1.decode(result.bytes)).toBe(
      '{"__proto__":{"safe":true},"constructor":5,"prototype":4,"":1,"𐀀":2,"😀":3}',
    );
    expect(Object.getPrototypeOf(projected)).toBe(Object.prototype);
    expect(Object.hasOwn(projected, "__proto__")).toBe(true);
    expect(Object.keys(projected)).toContain("__proto__");
    expectDeepFrozenV1(projected);
  });

  it("projects Proxy data without virtual gets and only oracles the detached value", () => {
    let virtualGets = 0;
    const raw = new Proxy([{ value: "ok" }], {
      get(target, key, receiver) {
        virtualGets += 1;
        return Reflect.get(target, key, receiver);
      },
    });

    const result = projectedV1(raw);

    expect(virtualGets).toBe(0);
    expect(result.value).not.toBe(raw);
    expect(result.bytes).toEqual(canonicalJsonBytes(result.value));
  });

  it("duplicates alias paths, freezes the detached tree, and returns fresh byte transports", () => {
    const shared = { nested: [1, 2] };
    const raw = { left: shared, right: shared };

    const first = projectedV1(raw);
    const second = projectedV1(raw);
    const firstValue = first.value as DeepReadonly<{
      left: { nested: readonly number[] };
      right: { nested: readonly number[] };
    }>;

    expect(firstValue.left).not.toBe(shared);
    expect(firstValue.left).not.toBe(firstValue.right);
    expect(firstValue.left.nested).not.toBe(firstValue.right.nested);
    expectDeepFrozenV1(first.value);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(shared)).toBe(false);
    expect(first.bytes).not.toBe(second.bytes);
    const expected = canonicalJsonBytes(second.value);
    first.bytes.fill(0);
    expect(second.bytes).toEqual(expected);
    expect(canonicalJsonBytes(first.value)).toEqual(expected);
  });

  it.each(
    [
      ["undefined", () => undefined],
      ["symbol", () => Symbol("value")],
      ["function", () => () => undefined],
      ["bigint", () => 1n],
      ["non-finite number", () => Number.POSITIVE_INFINITY],
      ["fractional number", () => 0.5],
      ["unsafe integer", () => Number.MAX_SAFE_INTEGER + 1],
      ["negative zero", () => -0],
      ["lone surrogate value", () => "\ud800"],
      ["lone surrogate key", () => objectWithOwnDataV1([["\ud800", 1]])],
      ["null prototype", () => Object.create(null)],
      ["custom object prototype", () => Object.create({})],
      [
        "custom array prototype",
        () => {
          const value = [1];
          Object.setPrototypeOf(value, {});
          return value;
        },
      ],
      [
        "sparse array",
        () => {
          const value: unknown[] = [];
          value.length = 1;
          return value;
        },
      ],
      [
        "array extra key",
        () => Object.defineProperty([1], "extra", { configurable: true, value: 2 }),
      ],
      [
        "array symbol key",
        () => Object.defineProperty([1], Symbol("extra"), { configurable: true, value: 2 }),
      ],
      [
        "object symbol key",
        () => Object.defineProperty({}, Symbol("extra"), { configurable: true, value: 2 }),
      ],
      [
        "cycle",
        () => {
          const value: Record<string, unknown> = {};
          value.self = value;
          return value;
        },
      ],
    ] as const satisfies readonly (readonly [string, () => unknown])[],
  )("rejects fully represented canonical violation: %s", (_label, create) => {
    rejectedV1(create(), "canonical.invalid");
  });

  it("rejects accessors without invoking their getters", () => {
    let objectGetterCalls = 0;
    const object = Object.defineProperty({}, "value", {
      configurable: true,
      enumerable: true,
      get() {
        objectGetterCalls += 1;
        return 1;
      },
    });
    let arrayGetterCalls = 0;
    const array: unknown[] = [];
    Object.defineProperty(array, 0, {
      configurable: true,
      enumerable: true,
      get() {
        arrayGetterCalls += 1;
        return 1;
      },
    });

    rejectedV1(object, "canonical.invalid");
    rejectedV1(array, "canonical.invalid");
    expect({ objectGetterCalls, arrayGetterCalls }).toEqual({
      objectGetterCalls: 0,
      arrayGetterCalls: 0,
    });
  });

  it("accepts 65,536 bytes and rejects the 65,537th byte without changing the cap", () => {
    const exact = projectedV1("a".repeat(65_534));
    expect(exact.bytes.byteLength).toBe(65_536);
    expect(exact.bytes).toEqual(canonicalJsonBytes(exact.value));

    rejectedV1("a".repeat(65_535), "limit.bytes");
  });

  it("counts multibyte code points by emitted UTF-8 bytes before later code units", () => {
    rejectedV1("😀", "limit.bytes", limitsV1({ maxBytes: 5 }));
    const exact = projectedV1("😀", limitsV1({ maxBytes: 6 }));
    expect(exact.bytes.byteLength).toBe(6);
    expect(decoderV1.decode(exact.bytes)).toBe('"😀"');

    rejectedV1("😀\ud800", "limit.bytes", limitsV1({ maxBytes: 4 }));
    rejectedV1("😀\ud800", "canonical.invalid", limitsV1({ maxBytes: 5 }));
  });

  it("accepts depth 32 and rejects entry into depth 33", () => {
    const exact = projectedV1(nestedToDepthV1(32));
    expect(exact.bytes).toEqual(canonicalJsonBytes(exact.value));

    rejectedV1(nestedToDepthV1(33), "limit.depth");
  });

  it("accepts 4,096 nodes and rejects entry into node 4,097", () => {
    const exact = projectedV1(Array.from({ length: 4_095 }, () => null));
    expect(exact.bytes).toEqual(canonicalJsonBytes(exact.value));

    rejectedV1(Array.from({ length: 4_096 }, () => null), "limit.nodes");
  });

  it("checks child depth, then nodes, before reading its descriptor or value", () => {
    const descriptorReads: string[] = [];
    const raw = new Proxy([undefined], {
      getOwnPropertyDescriptor(target, key) {
        if (key !== "length") descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "limit.depth", limitsV1({ maxDepth: 1, maxNodes: 1 }));
    expect(descriptorReads).toEqual([]);

    rejectedV1(raw, "limit.nodes", limitsV1({ maxDepth: 2, maxNodes: 1 }));
    expect(descriptorReads).toEqual([]);

    rejectedV1(raw, "canonical.invalid", limitsV1({ maxDepth: 2, maxNodes: 2 }));
    expect(descriptorReads).toEqual(["0"]);
  });

  it("lets array comma bytes stop before the next node and descriptor", () => {
    const descriptorReads: string[] = [];
    const raw = new Proxy([0, 1], {
      getOwnPropertyDescriptor(target, key) {
        if (key !== "length") descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "limit.bytes", limitsV1({ maxBytes: 2, maxNodes: 2 }));
    expect(descriptorReads).toEqual(["0"]);
  });

  it("writes object key and colon bytes before child depth, node, and descriptor", () => {
    const descriptorReads: string[] = [];
    const raw = new Proxy({ a: 0 }, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "limit.bytes", limitsV1({ maxBytes: 4, maxNodes: 1 }));
    expect(descriptorReads).toEqual([]);

    rejectedV1(raw, "limit.depth", limitsV1({ maxBytes: 5, maxDepth: 1 }));
    expect(descriptorReads).toEqual([]);

    rejectedV1(raw, "limit.nodes", limitsV1({ maxBytes: 5, maxNodes: 1 }));
    expect(descriptorReads).toEqual([]);
  });

  it("counts closing punctuation after the final child", () => {
    const descriptorReads: string[] = [];
    const raw = new Proxy([0], {
      getOwnPropertyDescriptor(target, key) {
        if (key !== "length") descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "limit.bytes", limitsV1({ maxBytes: 2 }));
    expect(descriptorReads).toEqual(["0"]);
  });

  it("stops byte traversal before later code units and descriptors", () => {
    rejectedV1("aaa\ud800", "limit.bytes", limitsV1({ maxBytes: 3 }));
    rejectedV1("aa\ud800", "canonical.invalid", limitsV1({ maxBytes: 3 }));
    rejectedV1("\ud800", "canonical.invalid", limitsV1({ maxBytes: 1 }));

    const descriptorReads: string[] = [];
    const raw = new Proxy(["aaa", 1], {
      getOwnPropertyDescriptor(target, key) {
        if (key !== "length") descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    rejectedV1(raw, "limit.bytes", limitsV1({ maxBytes: 4 }));
    expect(descriptorReads).toEqual(["0"]);
  });

  it("validates and sorts every object key before reading member descriptors", () => {
    const keyValidationSentinel = new Error("member descriptor must remain unread");
    const invalidKeyTarget = objectWithOwnDataV1([
      ["a", 0],
      ["\ud800", 1],
    ]);
    const invalidKeyProxy = new Proxy(invalidKeyTarget, {
      getOwnPropertyDescriptor() {
        throw keyValidationSentinel;
      },
    });
    rejectedV1(invalidKeyProxy, "canonical.invalid");

    const laterDescriptorSentinel = new Error("later canonical member must remain unread");
    const earlierCanonicalKey = "\ue000";
    const laterCanonicalKey = "𐀀";
    const sortTarget = objectWithOwnDataV1([
      [laterCanonicalKey, 1],
      [earlierCanonicalKey, 0.5],
    ]);
    const descriptorReads: string[] = [];
    const sortProxy = new Proxy(sortTarget, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads.push(String(key));
        if (key === laterCanonicalKey) throw laterDescriptorSentinel;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(sortProxy, "canonical.invalid");
    expect(descriptorReads).toEqual([earlierCanonicalKey]);
  });

  it("stops after the first child failure and before later descriptor traps", () => {
    const sentinel = new Error("later descriptor trap");
    const descriptorReads: string[] = [];
    const raw = new Proxy([0.5, 1], {
      getOwnPropertyDescriptor(target, key) {
        if (key !== "length") descriptorReads.push(String(key));
        if (key === "1") throw sentinel;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "canonical.invalid");
    expect(descriptorReads).toEqual(["0"]);
  });

  it("rejects container shape before reading child descriptors", () => {
    const target = [1];
    Object.defineProperty(target, Symbol("extra"), { configurable: true, value: 2 });
    const descriptorReads: string[] = [];
    const raw = new Proxy(target, {
      getOwnPropertyDescriptor(inner, key) {
        if (key !== "length") descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(inner, key);
      },
    });

    rejectedV1(raw, "canonical.invalid", limitsV1({ maxBytes: 1 }));
    expect(descriptorReads).toEqual([]);
  });

  it("validates nested container shape and keys before exhausted opening bytes", () => {
    const malformedArray = [1];
    Object.defineProperty(malformedArray, Symbol("extra"), {
      configurable: true,
      value: 2,
    });
    rejectedV1([malformedArray], "canonical.invalid", limitsV1({ maxBytes: 1 }));

    const malformedObject = objectWithOwnDataV1([["\ud800", 1]]);
    rejectedV1([malformedObject], "canonical.invalid", limitsV1({ maxBytes: 1 }));
  });

  it("counts object closing punctuation after the final child", () => {
    const descriptorReads: string[] = [];
    const raw = new Proxy({ a: 0 }, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads.push(String(key));
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    rejectedV1(raw, "limit.bytes", limitsV1({ maxBytes: 6 }));
    expect(descriptorReads).toEqual(["a"]);
  });

  it("never reclassifies real or shaped CanonicalJsonError reflection throws", () => {
    const real = new CanonicalJsonError("value.getter", "/real");
    const shaped = Object.freeze({
      name: "CanonicalJsonError",
      code: "value.getter",
      path: "/shaped",
    });
    const ordinary = new TypeError("ordinary reflection sentinel");

    expectExactThrowV1(
      new Proxy({}, {
        getPrototypeOf() {
          throw real;
        },
      }),
      real,
    );
    expectExactThrowV1(
      new Proxy({}, {
        ownKeys() {
          throw shaped;
        },
      }),
      shaped,
    );
    expectExactThrowV1(
      new Proxy({ value: 1 }, {
        getOwnPropertyDescriptor() {
          throw ordinary;
        },
      }),
      ordinary,
    );
  });

  it.each(["maxBytes", "maxDepth", "maxNodes"] as const)(
    "rejects invalid %s before touching the raw value",
    (invalidKey) => {
      const touches: string[] = [];
      const raw = new Proxy({}, {
        get() {
          touches.push("get");
          return undefined;
        },
        getPrototypeOf() {
          touches.push("getPrototypeOf");
          return Object.prototype;
        },
        ownKeys() {
          touches.push("ownKeys");
          return [];
        },
        getOwnPropertyDescriptor() {
          touches.push("getOwnPropertyDescriptor");
          return undefined;
        },
      });
      const invalidLimits = Object.freeze({
        maxBytes: invalidKey === "maxBytes"
          ? 0 as PositiveSafeInteger
          : parsePositiveSafeInteger(1),
        maxDepth: invalidKey === "maxDepth"
          ? 0 as PositiveSafeInteger
          : parsePositiveSafeInteger(1),
        maxNodes: invalidKey === "maxNodes"
          ? 0 as PositiveSafeInteger
          : parsePositiveSafeInteger(1),
      });

      expect(() => projectBoundedCanonicalJsonInternalV1(raw, invalidLimits)).toThrow(TypeError);
      expect(touches).toEqual([]);
    },
  );
});
