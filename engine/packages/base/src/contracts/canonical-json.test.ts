// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createPurposeTaggedSnapshotWorkCounterV1 } from "../internal/snapshot-work-instrumentation.ts";
import {
  canonicalJsonBytes,
  canonicalJsonBytesInternalV1,
  projectCanonicalJsonInternalV1,
} from "./canonical-json.ts";

describe("Canonical JSON", () => {
  it("sorts keys and rejects accessors", () => {
    expect(new TextDecoder().decode(canonicalJsonBytes({ z: 0, a: [true, null] }))).toBe(
      '{"a":[true,null],"z":0}',
    );

    let getterError: unknown;
    try {
      canonicalJsonBytes(Object.defineProperty({}, "x", { get: () => 1 }));
    } catch (error) {
      getterError = error;
    }
    expect(getterError).toMatchObject({
      name: "CanonicalJsonError",
      code: "value.getter",
    });
  });

  it("rejects a trailing lone high surrogate in values and keys", () => {
    for (const value of [{ value: "\ud800" }, { ["\ud800"]: true }]) {
      expect(() => canonicalJsonBytes(value)).toThrowError(
        expect.objectContaining({
          name: "CanonicalJsonError",
          code: "string.lone_surrogate",
        }),
      );
    }
  });

  it("builds canonical bytes and a path-local plain projection in one traversal", () => {
    const shared = { value: 1 };
    const raw = Object.defineProperties({}, {
      z: { enumerable: false, value: shared },
      a: { enumerable: true, value: [shared, shared] },
    }) as {
      readonly z: typeof shared;
      readonly __proto__: typeof shared;
      readonly a: readonly (typeof shared)[];
    };
    Object.defineProperty(raw, "__proto__", { enumerable: true, value: shared });
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    const projected = projectCanonicalJsonInternalV1(
      raw,
      counter.instrumentation,
      "command_admission",
    );

    expect(projected.value).not.toBe(raw);
    expect(Object.getPrototypeOf(projected.value)).toBe(Object.prototype);
    expect(Object.keys(projected.value)).toEqual(["__proto__", "a", "z"]);
    expect(Object.hasOwn(projected.value, "__proto__")).toBe(true);
    expect(projected.value.__proto__).not.toBe(shared);
    expect(projected.value.a[0]).not.toBe(shared);
    expect(projected.value.a[0]).not.toBe(projected.value.a[1]);
    expect(projected.value.z).not.toBe(projected.value.__proto__);
    expect(projected.bytes).toEqual(canonicalJsonBytes(raw));
    expect(canonicalJsonBytes(projected.value)).toEqual(projected.bytes);
    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("projects a Proxy array from descriptor data without invoking virtual gets", () => {
    let getReads = 0;
    const raw = new Proxy([{ value: 1 }], {
      get(target, key, receiver) {
        getReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });

    const projected = projectCanonicalJsonInternalV1(raw);

    expect(getReads).toBe(0);
    expect(projected.value).not.toBe(raw);
    expect(projected.value).toEqual([{ value: 1 }]);
    expect(projected.value[0]).not.toBe(raw[0]);
  });

  it("keeps the public bytes-only Proxy array traversal unchanged", () => {
    let lengthReads = 0;
    const raw = new Proxy([1, 2], {
      get(target, key, receiver) {
        if (key === "length") {
          lengthReads += 1;
          return lengthReads === 1 ? 1 : 2;
        }
        return Reflect.get(target, key, receiver);
      },
    });

    expect(new TextDecoder().decode(canonicalJsonBytes(raw))).toBe("[1,2]");
    expect(lengthReads).toBe(3);
  });

  it("keeps fully represented canonical error codes and paths aligned with projection", () => {
    const cases = [
      {
        create() {
          const value: unknown[] = [];
          value.length = 1;
          return value;
        },
        code: "value.sparse_array",
        path: "/0",
      },
      {
        create: () => Object.defineProperty({}, "a/b~c", { enumerable: true, get: () => 1 }),
        code: "value.getter",
        path: "/a~1b~0c",
      },
      {
        create() {
          const value: Record<string, unknown> = {};
          value.self = value;
          return value;
        },
        code: "value.cycle",
        path: "/self",
      },
      {
        create() {
          const value = [1];
          Object.setPrototypeOf(value, {});
          return value;
        },
        code: "value.custom_prototype",
        path: "",
      },
      {
        create() {
          const value = {};
          Object.defineProperty(value, Symbol("hidden"), { enumerable: true, value: 1 });
          return value;
        },
        code: "value.unrepresented_property",
        path: "",
      },
      {
        create() {
          const value = [1];
          Object.defineProperty(value, "extra", { enumerable: true, value: 2 });
          return value;
        },
        code: "value.unrepresented_property",
        path: "/extra",
      },
    ] as const;

    for (const { create, code, path } of cases) {
      for (
        const operation of [
          () =>
            canonicalJsonBytesInternalV1(create(), undefined, undefined, {
              requireFullyRepresentedOwnData: true,
            }),
          () => projectCanonicalJsonInternalV1(create()),
        ]
      ) {
        expect(operation).toThrowError(expect.objectContaining({ code, path }));
      }
    }
  });

  it("keeps earlier child failures ahead of later Proxy descriptor traps", () => {
    const arrayDescriptorReads: string[] = [];
    const array = new Proxy([0.25, 1], {
      getOwnPropertyDescriptor(target, key) {
        arrayDescriptorReads.push(String(key));
        if (key === "1") throw new Error("later array descriptor trap");
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    expect(() => projectCanonicalJsonInternalV1(array)).toThrowError(
      expect.objectContaining({ code: "number.not_integer", path: "/0" }),
    );
    expect(arrayDescriptorReads).toEqual(["length", "0"]);

    const objectDescriptorReads: string[] = [];
    const object = new Proxy({ a: 0.25, b: 1 }, {
      getOwnPropertyDescriptor(target, key) {
        objectDescriptorReads.push(String(key));
        if (key === "b") throw new Error("later object descriptor trap");
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    expect(() => projectCanonicalJsonInternalV1(object)).toThrowError(
      expect.objectContaining({ code: "number.not_integer", path: "/a" }),
    );
    expect(objectDescriptorReads).toEqual(["a"]);
  });

  it("keeps a container symbol failure ahead of Proxy descriptor traps", () => {
    const arrayTarget = [1];
    Object.defineProperty(arrayTarget, Symbol("hidden"), { enumerable: true, value: 2 });
    let descriptorReads = 0;
    const raw = new Proxy(arrayTarget, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });

    expect(() => projectCanonicalJsonInternalV1(raw)).toThrowError(
      expect.objectContaining({ code: "value.unrepresented_property", path: "" }),
    );
    expect(descriptorReads).toBe(0);
  });
});
