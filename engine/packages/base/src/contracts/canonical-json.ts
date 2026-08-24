// SPDX-License-Identifier: MIT
import type {
  SnapshotWorkInstrumentationV1,
  SnapshotWorkPurposeV1,
} from "../internal/snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "../internal/snapshot-work-instrumentation.ts";
import {
  canonicalJsonNumberFailureInternalV1,
  compareCanonicalJsonCodePointsInternalV1,
  defineCanonicalJsonProjectionMemberInternalV1,
  encodeCanonicalJsonStringInternalV1,
  encodeCanonicalJsonUtf8InternalV1,
  visitCanonicalJsonStringSegmentsInternalV1,
} from "../internal/canonical-json-primitives.ts";

export type CanonicalJsonErrorCodeV1 =
  | "value.undefined"
  | "value.sparse_array"
  | "value.cycle"
  | "value.custom_prototype"
  | "value.function"
  | "value.getter"
  | "value.unrepresented_property"
  | "number.non_finite"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero"
  | "string.lone_surrogate";

export class CanonicalJsonError extends Error {
  override readonly name = "CanonicalJsonError";
  readonly code: CanonicalJsonErrorCodeV1;
  readonly path: string;

  constructor(code: CanonicalJsonErrorCodeV1, path: string) {
    super(`${code} at ${path || "/"}`);
    this.code = code;
    this.path = path;
  }
}

/** @internal Package-only observer for work fused into canonical traversal. */
export interface CanonicalJsonTraversalObserverInternalV1 {
  enterValue(depth: number): void;
  enterArrayItem(index: number): void;
  enterObjectMember(index: number): void;
  observeString(value: string): void;
  observeObjectKey(key: string): void;
}

/** @internal Admission-only closure checks; public canonical bytes stay unchanged. */
export interface CanonicalJsonInternalOptionsV1 {
  readonly requireFullyRepresentedOwnData?: boolean;
}

/** @internal Canonical bytes and their engine-owned plain-data tree. */
export interface CanonicalJsonProjectionInternalV1<TValue> {
  readonly bytes: Uint8Array;
  readonly value: TValue;
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function assertCanonicalStringV1(value: string, path: string): void {
  if (visitCanonicalJsonStringSegmentsInternalV1(value, () => true) === "invalid") {
    throw new CanonicalJsonError("string.lone_surrogate", path);
  }
}

function encodeCanonicalStringV1(value: string): string {
  const encoded = encodeCanonicalJsonStringInternalV1(value);
  if (encoded === null) {
    throw new TypeError("Validated canonical JSON string became invalid");
  }
  return encoded;
}

function encodeCanonicalNumberV1(value: number, path: string): string {
  const failure = canonicalJsonNumberFailureInternalV1(value);
  if (failure !== null) throw new CanonicalJsonError(failure, path);
  return String(value);
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return canonicalJsonBytesInternalV1(value);
}

function encodeCanonicalJsonProjectionV1(
  current: unknown,
  path: string,
  active: Set<object>,
): readonly [encoded: string, projection: unknown] {
  if (current === null) return ["null", null];
  if (typeof current === "boolean") return [current ? "true" : "false", current];
  if (typeof current === "string") {
    assertCanonicalStringV1(current, path);
    return [encodeCanonicalStringV1(current), current];
  }
  if (typeof current === "number") {
    return [encodeCanonicalNumberV1(current, path), current];
  }
  if (typeof current === "undefined" || typeof current === "symbol") {
    throw new CanonicalJsonError("value.undefined", path);
  }
  if (typeof current === "function") {
    throw new CanonicalJsonError("value.function", path);
  }

  const object = current as object;
  if (active.has(object)) throw new CanonicalJsonError("value.cycle", path);
  active.add(object);
  try {
    if (Array.isArray(object)) {
      if (Object.getPrototypeOf(object) !== Array.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const ownKeys = Reflect.ownKeys(object);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        throw new CanonicalJsonError("value.unrepresented_property", path);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(object, "length");
      if (
        lengthDescriptor === undefined ||
        lengthDescriptor.get !== undefined ||
        lengthDescriptor.set !== undefined ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > 0xffff_ffff
      ) {
        throw new TypeError("Canonical array length descriptor is invalid");
      }
      const length = lengthDescriptor.value;
      const extraKeys = ownKeys
        .filter((key): key is string => typeof key === "string")
        .filter((key) => {
          if (key === "length") return false;
          const index = Number(key);
          return !(
            Number.isInteger(index) &&
            index >= 0 &&
            index < length &&
            String(index) === key
          );
        })
        .sort(compareCanonicalJsonCodePointsInternalV1);
      const extraKey = extraKeys[0];
      if (extraKey !== undefined) {
        throw new CanonicalJsonError(
          "value.unrepresented_property",
          `${path}/${pointerSegment(extraKey)}`,
        );
      }
      const projected: unknown[] = [];
      const values: string[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(object, String(index));
        if (descriptor === undefined) {
          throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
        }
        if (descriptor.get !== undefined || descriptor.set !== undefined) {
          throw new CanonicalJsonError("value.getter", `${path}/${index}`);
        }
        const [encoded, childProjection] = encodeCanonicalJsonProjectionV1(
          descriptor.value,
          `${path}/${index}`,
          active,
        );
        values.push(encoded);
        defineCanonicalJsonProjectionMemberInternalV1(
          projected,
          String(index),
          childProjection,
        );
      }
      return [`[${values.join(",")}]`, projected];
    }

    if (Object.getPrototypeOf(object) !== Object.prototype) {
      throw new CanonicalJsonError("value.custom_prototype", path);
    }
    const ownKeys = Reflect.ownKeys(object);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      throw new CanonicalJsonError("value.unrepresented_property", path);
    }
    const keys = ownKeys
      .filter((key): key is string => typeof key === "string")
      .sort(compareCanonicalJsonCodePointsInternalV1);
    const projected = {};
    const members: string[] = [];
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      if (descriptor === undefined) {
        throw new TypeError("Canonical object property descriptor is missing");
      }
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new CanonicalJsonError("value.getter", `${path}/${pointerSegment(key)}`);
      }
      assertCanonicalStringV1(key, path);
      const [encoded, childProjection] = encodeCanonicalJsonProjectionV1(
        descriptor.value,
        `${path}/${pointerSegment(key)}`,
        active,
      );
      members.push(`${encodeCanonicalStringV1(key)}:${encoded}`);
      defineCanonicalJsonProjectionMemberInternalV1(projected, key, childProjection);
    }
    return [`{${members.join(",")}}`, projected];
  } finally {
    active.delete(object);
  }
}

/** @internal Builds a path-local plain-data projection during the canonical traversal. */
export function projectCanonicalJsonInternalV1<TValue>(
  value: TValue,
  instrumentation?: SnapshotWorkInstrumentationV1,
  purpose?: SnapshotWorkPurposeV1,
): CanonicalJsonProjectionInternalV1<TValue> {
  recordSnapshotWorkV1(instrumentation, "canonical_traversal", purpose);
  const [encoded, projection] = encodeCanonicalJsonProjectionV1(value, "", new Set());
  const bytes = encodeCanonicalJsonUtf8InternalV1(encoded);
  return { bytes, value: projection as TValue };
}

/** @internal Instrumented test/bench path; public canonical bytes remain unchanged. */
export function canonicalJsonBytesInternalV1(
  value: unknown,
  instrumentation?: SnapshotWorkInstrumentationV1,
  purpose?: SnapshotWorkPurposeV1,
  options: CanonicalJsonInternalOptionsV1 = {},
): Uint8Array {
  recordSnapshotWorkV1(instrumentation, "canonical_traversal", purpose);
  const active = new Set<object>();

  function encode(current: unknown, path: string): string {
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "string") {
      assertCanonicalStringV1(current, path);
      return encodeCanonicalStringV1(current);
    }
    if (typeof current === "number") {
      return encodeCanonicalNumberV1(current, path);
    }
    if (typeof current === "undefined" || typeof current === "symbol") {
      throw new CanonicalJsonError("value.undefined", path);
    }
    if (typeof current === "function") {
      throw new CanonicalJsonError("value.function", path);
    }

    const object = current as object;
    if (active.has(object)) throw new CanonicalJsonError("value.cycle", path);
    active.add(object);
    try {
      if (Array.isArray(object)) {
        if (
          options.requireFullyRepresentedOwnData === true &&
          Object.getPrototypeOf(object) !== Array.prototype
        ) {
          throw new CanonicalJsonError("value.custom_prototype", path);
        }
        if (options.requireFullyRepresentedOwnData === true) {
          if (Object.getOwnPropertySymbols(object).length !== 0) {
            throw new CanonicalJsonError("value.unrepresented_property", path);
          }
          const extraKeys = Object.getOwnPropertyNames(object)
            .filter((key) => {
              if (key === "length") return false;
              const index = Number(key);
              return !(
                Number.isInteger(index) &&
                index >= 0 &&
                index < object.length &&
                String(index) === key
              );
            })
            .sort(compareCanonicalJsonCodePointsInternalV1);
          const extraKey = extraKeys[0];
          if (extraKey !== undefined) {
            throw new CanonicalJsonError(
              "value.unrepresented_property",
              `${path}/${pointerSegment(extraKey)}`,
            );
          }
        }
        const values = [];
        for (let index = 0; index < object.length; index += 1) {
          if (!Object.hasOwn(object, index)) {
            throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
          }
          if (options.requireFullyRepresentedOwnData === true) {
            const descriptor = Object.getOwnPropertyDescriptor(object, index);
            if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
              throw new CanonicalJsonError("value.getter", `${path}/${index}`);
            }
            values.push(encode(descriptor?.value, `${path}/${index}`));
          } else {
            values.push(encode(object[index], `${path}/${index}`));
          }
        }
        return `[${values.join(",")}]`;
      }

      if (Object.getPrototypeOf(object) !== Object.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      if (
        options.requireFullyRepresentedOwnData === true &&
        Object.getOwnPropertySymbols(object).length !== 0
      ) {
        throw new CanonicalJsonError("value.unrepresented_property", path);
      }
      const keys = Object.keys(descriptors).sort(compareCanonicalJsonCodePointsInternalV1);
      const members = [];
      for (const key of keys) {
        const descriptor = descriptors[key];
        if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
          throw new CanonicalJsonError("value.getter", `${path}/${pointerSegment(key)}`);
        }
        assertCanonicalStringV1(key, path);
        members.push(
          `${encodeCanonicalStringV1(key)}:${
            encode(descriptor?.value, `${path}/${pointerSegment(key)}`)
          }`,
        );
      }
      return `{${members.join(",")}}`;
    } finally {
      active.delete(object);
    }
  }

  return encodeCanonicalJsonUtf8InternalV1(encode(value, ""));
}

/**
 * Save-only observed traversal. The unobserved encoder above intentionally
 * keeps its original hot-path shape for digest, replay, and public callers.
 *
 * @internal
 */
export function canonicalJsonBytesObservedInternalV1(
  value: unknown,
  observer: CanonicalJsonTraversalObserverInternalV1,
  instrumentation?: SnapshotWorkInstrumentationV1,
): Uint8Array {
  recordSnapshotWorkV1(instrumentation, "canonical_traversal");
  const active = new Set<object>();

  function encode(current: unknown, path: string, depth: number): string {
    observer.enterValue(depth);
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "string") {
      assertCanonicalStringV1(current, path);
      observer.observeString(current);
      return encodeCanonicalStringV1(current);
    }
    if (typeof current === "number") {
      return encodeCanonicalNumberV1(current, path);
    }
    if (typeof current === "undefined" || typeof current === "symbol") {
      throw new CanonicalJsonError("value.undefined", path);
    }
    if (typeof current === "function") {
      throw new CanonicalJsonError("value.function", path);
    }

    const object = current as object;
    if (active.has(object)) throw new CanonicalJsonError("value.cycle", path);
    active.add(object);
    try {
      if (Array.isArray(object)) {
        const values = [];
        for (let index = 0; index < object.length; index += 1) {
          observer.enterArrayItem(index);
          if (!Object.hasOwn(object, index)) {
            throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
          }
          values.push(encode(object[index], `${path}/${index}`, depth + 1));
        }
        return `[${values.join(",")}]`;
      }

      if (Object.getPrototypeOf(object) !== Object.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const keys = Object.keys(descriptors).sort(compareCanonicalJsonCodePointsInternalV1);
      const members = [];
      let memberIndex = 0;
      for (const key of keys) {
        observer.enterObjectMember(memberIndex);
        memberIndex += 1;
        const descriptor = descriptors[key];
        if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
          throw new CanonicalJsonError("value.getter", `${path}/${pointerSegment(key)}`);
        }
        assertCanonicalStringV1(key, path);
        observer.observeString(key);
        observer.observeObjectKey(key);
        members.push(
          `${encodeCanonicalStringV1(key)}:${
            encode(
              descriptor?.value,
              `${path}/${pointerSegment(key)}`,
              depth + 1,
            )
          }`,
        );
      }
      return `{${members.join(",")}}`;
    } finally {
      active.delete(object);
    }
  }

  return encodeCanonicalJsonUtf8InternalV1(encode(value, "", 1));
}
