// SPDX-License-Identifier: MIT
import { CanonicalJsonError, canonicalJsonBytes } from "./canonical-json.js";
import { compareCodePoints, pointerSegment } from "./presentation-data.js";

type PresentationCanonicalNodeV1 =
  | readonly ["null"]
  | readonly ["boolean", boolean]
  | readonly ["string", string]
  | readonly ["number", string]
  | readonly ["array", readonly PresentationCanonicalNodeV1[]]
  | readonly ["object", readonly (readonly [string, PresentationCanonicalNodeV1])[]];
function validateCanonicalString(value: string, path: string): void {
  try {
    canonicalJsonBytes(value);
  } catch (error) {
    if (error instanceof CanonicalJsonError) {
      throw new CanonicalJsonError(error.code, path);
    }
    throw error;
  }
}

/**
 * Projects Presentation-only binary64 values to a typed string AST before using
 * the repository's integer-only Canonical JSON encoder. This keeps `1` distinct
 * from `"1"` without widening the Save or Simulation number contract.
 */
export function canonicalPresentationJsonBytesV1(value: unknown): Uint8Array {
  const active = new Set<object>();

  function project(current: unknown, path: string): PresentationCanonicalNodeV1 {
    if (current === null) return ["null"];
    if (typeof current === "boolean") return ["boolean", current];
    if (typeof current === "string") {
      validateCanonicalString(current, path);
      return ["string", current];
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new CanonicalJsonError("number.non_finite", path);
      }
      if (Object.is(current, -0)) {
        throw new CanonicalJsonError("number.negative_zero", path);
      }
      return ["number", String(current)];
    }
    if (typeof current === "undefined" || typeof current === "symbol") {
      throw new CanonicalJsonError("value.undefined", path);
    }
    if (typeof current === "function") {
      throw new CanonicalJsonError("value.function", path);
    }
    if (typeof current === "bigint") {
      throw new CanonicalJsonError("value.custom_prototype", path);
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
        for (const key of ownKeys) {
          if (typeof key === "symbol") {
            throw new CanonicalJsonError("value.undefined", path);
          }
          if (key === "length") continue;
          if (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= object.length) {
            throw new CanonicalJsonError(
              "value.custom_prototype",
              `${path}/${pointerSegment(key)}`,
            );
          }
        }

        const items: PresentationCanonicalNodeV1[] = [];
        for (let index = 0; index < object.length; index += 1) {
          if (!Object.hasOwn(object, index)) {
            throw new CanonicalJsonError("value.sparse_array", `${path}/${index}`);
          }
          const descriptor = Object.getOwnPropertyDescriptor(object, String(index));
          if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
            throw new CanonicalJsonError("value.getter", `${path}/${index}`);
          }
          items.push(project(descriptor?.value, `${path}/${index}`));
        }
        return ["array", items];
      }

      if (Object.getPrototypeOf(object) !== Object.prototype) {
        throw new CanonicalJsonError("value.custom_prototype", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const symbolKeys = Object.getOwnPropertySymbols(object);
      if (symbolKeys.length > 0) {
        throw new CanonicalJsonError("value.undefined", path);
      }
      const keys = Object.keys(descriptors).sort(compareCodePoints);
      const entries: (readonly [string, PresentationCanonicalNodeV1])[] = [];
      for (const key of keys) {
        const memberPath = `${path}/${pointerSegment(key)}`;
        const descriptor = descriptors[key];
        if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
          throw new CanonicalJsonError("value.getter", memberPath);
        }
        validateCanonicalString(key, memberPath);
        entries.push([key, project(descriptor?.value, memberPath)]);
      }
      return ["object", entries];
    } finally {
      active.delete(object);
    }
  }

  return canonicalJsonBytes(project(value, ""));
}
