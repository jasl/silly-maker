// SPDX-License-Identifier: MIT
import type { StrictJsonLimitsV1, StrictJsonValueV1 } from "../contracts/strict-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";

const dangerousObjectKeysInternalV1 = new Set(["__proto__", "prototype", "constructor"]);

function compareCodePointsInternalV1(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function defineProjectionMemberInternalV1(
  container: object,
  key: PropertyKey,
  value: unknown,
): void {
  Object.defineProperty(container, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function isCanonicalArrayIndexKeyInternalV1(value: string): boolean {
  if (value.length === 0 || value.length > 10) return false;
  if (value.length > 1 && value.charCodeAt(0) === 0x30) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) return false;
  }
  return true;
}

function canonicalStringByteLengthInternalV1(
  value: string,
  maxStringBytes: number,
  remainingCanonicalBytes: number,
): number {
  let stringBytes = 0;
  let canonicalBytes = 2;
  if (canonicalBytes > remainingCanonicalBytes) {
    throw new TypeError("Strict canonical projection exceeds byte limit");
  }
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || second < 0xdc00 || second > 0xdfff) {
        throw new TypeError("Strict canonical projection contains a lone surrogate");
      }
      stringBytes += 4;
      canonicalBytes += 4;
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      throw new TypeError("Strict canonical projection contains a lone surrogate");
    } else {
      stringBytes += first <= 0x7f ? 1 : first <= 0x7ff ? 2 : 3;
      if (first === 0x22 || first === 0x5c) canonicalBytes += 2;
      else if (
        first === 0x08 ||
        first === 0x09 ||
        first === 0x0a ||
        first === 0x0c ||
        first === 0x0d
      ) canonicalBytes += 2;
      else if (first < 0x20) canonicalBytes += 6;
      else canonicalBytes += first <= 0x7f ? 1 : first <= 0x7ff ? 2 : 3;
    }
    if (stringBytes > maxStringBytes) {
      throw new TypeError("Strict canonical projection exceeds string limit");
    }
    if (canonicalBytes > remainingCanonicalBytes) {
      throw new TypeError("Strict canonical projection exceeds byte limit");
    }
  }
  return canonicalBytes;
}

/**
 * @internal Descriptor-safe canonical capture that stops before traversing or
 * copying data beyond the supplied Strict JSON limits.
 */
export function projectStrictCanonicalJsonInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): DeepReadonly<StrictJsonValueV1> {
  let nodes = 0;
  let canonicalBytes = 0;
  const active = new Set<object>();

  const addCanonicalBytes = (amount: number): void => {
    if (amount > limits.maxBytes - canonicalBytes) {
      throw new TypeError("Strict canonical projection exceeds byte limit");
    }
    canonicalBytes += amount;
  };

  const project = (current: unknown, depth: number): StrictJsonValueV1 => {
    if (depth > limits.maxDepth) {
      throw new TypeError("Strict canonical projection exceeds depth limit");
    }
    if (nodes >= limits.maxNodes) {
      throw new TypeError("Strict canonical projection exceeds node limit");
    }
    nodes += 1;

    if (current === null) {
      addCanonicalBytes(4);
      return null;
    }
    if (typeof current === "boolean") {
      addCanonicalBytes(current ? 4 : 5);
      return current;
    }
    if (typeof current === "string") {
      addCanonicalBytes(
        canonicalStringByteLengthInternalV1(
          current,
          limits.maxStringBytes,
          limits.maxBytes - canonicalBytes,
        ),
      );
      return current;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current) || !Number.isInteger(current)) {
        throw new TypeError("Strict canonical projection requires finite integers");
      }
      if (!Number.isSafeInteger(current)) {
        throw new TypeError("Strict canonical projection requires safe integers");
      }
      // sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"recognize and reject negative-zero migration output","bounds":"binary64 zero representations only","rounding":"exact Object.is sentinel comparison; value is rejected before callback output admission","test":"engine/packages/base/src/internal/save-state-migration-execution.test.ts#migration-negative-zero-output-admission"}
      if (Object.is(current, -0)) {
        throw new TypeError("Strict canonical projection rejects negative zero");
      }
      addCanonicalBytes(String(current).length);
      return current;
    }
    if (typeof current !== "object") {
      throw new TypeError("Strict canonical projection requires JSON data");
    }

    if (active.has(current)) {
      throw new TypeError("Strict canonical projection rejects cycles");
    }
    active.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype) {
          throw new TypeError("Strict canonical projection rejects custom array prototypes");
        }
        const lengthDescriptor = Object.getOwnPropertyDescriptor(current, "length");
        if (
          lengthDescriptor === undefined ||
          lengthDescriptor.get !== undefined ||
          lengthDescriptor.set !== undefined ||
          !("value" in lengthDescriptor) ||
          typeof lengthDescriptor.value !== "number" ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0 ||
          lengthDescriptor.value > 0xffff_ffff
        ) {
          throw new TypeError("Strict canonical projection rejects invalid array length");
        }
        const length = lengthDescriptor.value;
        if (length > limits.maxArrayItems) {
          throw new TypeError("Strict canonical projection exceeds array limit");
        }
        addCanonicalBytes(2 + Math.max(0, length - 1));

        const keys = Reflect.ownKeys(current);
        if (keys.length !== length + 1 || keys.some((key) => typeof key === "symbol")) {
          throw new TypeError("Strict canonical projection requires an exact dense array");
        }
        let hasLength = false;
        for (const key of keys as string[]) {
          if (key.length === 6 && key === "length") {
            hasLength = true;
            continue;
          }
          if (!isCanonicalArrayIndexKeyInternalV1(key)) {
            throw new TypeError("Strict canonical projection requires an exact dense array");
          }
          const index = Number(key);
          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= length ||
            String(index) !== key
          ) {
            throw new TypeError("Strict canonical projection requires an exact dense array");
          }
        }
        if (!hasLength) {
          throw new TypeError("Strict canonical projection requires an exact dense array");
        }

        const projection: StrictJsonValueV1[] = [];
        for (let index = 0; index < length; index += 1) {
          if (depth >= limits.maxDepth || nodes >= limits.maxNodes) {
            throw new TypeError("Strict canonical projection exceeds traversal limit");
          }
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (
            descriptor === undefined ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            !("value" in descriptor)
          ) {
            throw new TypeError("Strict canonical projection rejects array accessors");
          }
          defineProjectionMemberInternalV1(
            projection,
            String(index),
            project(descriptor.value, depth + 1),
          );
        }
        return projection;
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        throw new TypeError("Strict canonical projection rejects custom object prototypes");
      }
      const keys = Reflect.ownKeys(current);
      if (keys.length > limits.maxObjectMembers) {
        throw new TypeError("Strict canonical projection exceeds object-member limit");
      }
      if (keys.some((key) => typeof key === "symbol")) {
        throw new TypeError("Strict canonical projection rejects symbol properties");
      }
      const fields = keys as string[];
      addCanonicalBytes(2 + Math.max(0, fields.length - 1));
      // Admit every property name before sorting so the comparator only ever
      // scans strings already bounded by both string and canonical-byte limits.
      for (const field of fields) {
        addCanonicalBytes(
          canonicalStringByteLengthInternalV1(
            field,
            limits.maxStringBytes,
            limits.maxBytes - canonicalBytes,
          ) + 1,
        );
        if (dangerousObjectKeysInternalV1.has(field)) {
          throw new TypeError("Strict canonical projection rejects dangerous object keys");
        }
      }

      fields.sort(compareCodePointsInternalV1);
      const projection = {} as Record<string, StrictJsonValueV1>;
      for (const field of fields) {
        if (depth >= limits.maxDepth || nodes >= limits.maxNodes) {
          throw new TypeError("Strict canonical projection exceeds traversal limit");
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, field);
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          !("value" in descriptor)
        ) {
          throw new TypeError("Strict canonical projection rejects object accessors");
        }
        defineProjectionMemberInternalV1(
          projection,
          field,
          project(descriptor.value, depth + 1),
        );
      }
      return projection;
    } finally {
      active.delete(current);
    }
  };

  return project(value, 1) as DeepReadonly<StrictJsonValueV1>;
}

function freezeStrictCanonicalTreeInternalV1(value: StrictJsonValueV1): void {
  if (value === null || typeof value !== "object") return;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get === undefined && descriptor.set === undefined && "value" in descriptor) {
      freezeStrictCanonicalTreeInternalV1(descriptor.value as StrictJsonValueV1);
    }
  }
  Object.freeze(value);
}

/** @internal Descriptor-safe detached capture that is immutable before downstream admission. */
export function projectFrozenStrictCanonicalJsonInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): DeepReadonly<StrictJsonValueV1> {
  const projection = projectStrictCanonicalJsonInternalV1(value, limits);
  freezeStrictCanonicalTreeInternalV1(projection as StrictJsonValueV1);
  return projection;
}
