// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytesObservedInternalV1,
  type CanonicalJsonTraversalObserverInternalV1,
} from "./canonical-json.ts";
import type { DeepReadonly, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.ts";
import { parsePositiveSafeInteger } from "./values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../internal/snapshot-work-instrumentation.ts";

export interface StrictJsonLimitsV1 {
  readonly maxBytes: PositiveSafeInteger;
  readonly maxDepth: PositiveSafeInteger;
  readonly maxArrayItems: PositiveSafeInteger;
  readonly maxObjectMembers: PositiveSafeInteger;
  readonly maxNodes: PositiveSafeInteger;
  readonly maxStringBytes: PositiveSafeInteger;
}

export interface StrictJsonLimitsInputV1 {
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly maxArrayItems: number;
  readonly maxObjectMembers: number;
  readonly maxNodes: number;
  readonly maxStringBytes: number;
}

export type StrictJsonPrimitiveV1 = null | boolean | string | number;
export type StrictJsonValueV1 =
  | StrictJsonPrimitiveV1
  | StrictJsonObjectV1
  | readonly StrictJsonValueV1[];
export interface StrictJsonObjectV1 {
  readonly [key: string]: StrictJsonValueV1;
}

export type StrictJsonErrorCodeV1 =
  | "encoding.invalid_utf8"
  | "encoding.bom_forbidden"
  | "syntax.invalid"
  | "syntax.comment_forbidden"
  | "syntax.trailing_comma_forbidden"
  | "object.duplicate_key"
  | "object.dangerous_key"
  | "limit.bytes"
  | "limit.depth"
  | "limit.array_items"
  | "limit.object_members"
  | "limit.nodes"
  | "limit.string_bytes"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero"
  | "string.lone_surrogate";

export interface StrictJsonErrorV1 {
  readonly code: StrictJsonErrorCodeV1;
  readonly offset?: NonNegativeSafeInteger;
  readonly path?: string;
}

export type StrictJsonResultV1 =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: StrictJsonErrorV1 };

/** @internal Result for canonical encoding with inline Strict-limit validation. */
export type CanonicalJsonStrictLimitsResultInternalV1 =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | {
    readonly ok: false;
    readonly bytes: Uint8Array;
    readonly error: { readonly code: StrictJsonErrorCodeV1 };
  };

const limitKeys = [
  "maxBytes",
  "maxDepth",
  "maxArrayItems",
  "maxObjectMembers",
  "maxNodes",
  "maxStringBytes",
] as const;
const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
const maxSafeIntegerDecimalV1 = "9007199254740991";

export function parseStrictJsonLimitsV1(input: StrictJsonLimitsInputV1): StrictJsonLimitsV1 {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("\0") !== [...limitKeys].sort().join("\0")
  ) {
    throw new TypeError("invalid StrictJsonLimitsInputV1");
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(input))) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError("invalid StrictJsonLimitsInputV1 accessor");
    }
  }
  return Object.freeze({
    maxBytes: parsePositiveSafeInteger(input.maxBytes),
    maxDepth: parsePositiveSafeInteger(input.maxDepth),
    maxArrayItems: parsePositiveSafeInteger(input.maxArrayItems),
    maxObjectMembers: parsePositiveSafeInteger(input.maxObjectMembers),
    maxNodes: parsePositiveSafeInteger(input.maxNodes),
    maxStringBytes: parsePositiveSafeInteger(input.maxStringBytes),
  });
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  const characters: string[] = [];
  const continuation = (value: number | undefined): value is number =>
    value !== undefined && value >= 0x80 && value <= 0xbf;
  for (let index = 0; index < bytes.length; index += 1) {
    const first = bytes[index];
    if (first === undefined) return null;
    if (first <= 0x7f) {
      characters.push(String.fromCodePoint(first));
      continue;
    }
    const second = bytes[index + 1];
    if (first >= 0xc2 && first <= 0xdf && continuation(second)) {
      characters.push(String.fromCodePoint(((first & 0x1f) << 6) | (second & 0x3f)));
      index += 1;
      continue;
    }
    const third = bytes[index + 2];
    const validThreeSecond =
      (first === 0xe0 && second !== undefined && second >= 0xa0 && second <= 0xbf) ||
      (first >= 0xe1 && first <= 0xec && continuation(second)) ||
      (first === 0xed && second !== undefined && second >= 0x80 && second <= 0x9f) ||
      (first >= 0xee && first <= 0xef && continuation(second));
    if (validThreeSecond && continuation(third)) {
      characters.push(
        String.fromCodePoint(
          ((first & 0x0f) << 12) | (((second ?? 0) & 0x3f) << 6) | (third & 0x3f),
        ),
      );
      index += 2;
      continue;
    }
    const fourth = bytes[index + 3];
    const validFourSecond =
      (first === 0xf0 && second !== undefined && second >= 0x90 && second <= 0xbf) ||
      (first >= 0xf1 && first <= 0xf3 && continuation(second)) ||
      (first === 0xf4 && second !== undefined && second >= 0x80 && second <= 0x8f);
    if (validFourSecond && continuation(third) && continuation(fourth)) {
      characters.push(
        String.fromCodePoint(
          ((first & 0x07) << 18) |
            (((second ?? 0) & 0x3f) << 12) |
            ((third & 0x3f) << 6) |
            (fourth & 0x3f),
        ),
      );
      index += 3;
      continue;
    }
    return null;
  }
  return characters.join("");
}

/**
 * Encodes canonical JSON while tracking the Strict failures reachable from
 * canonical output. The tracker never interrupts canonical encoding, so a
 * later canonical failure keeps the same precedence as the legacy two-pass
 * composition.
 *
 * @internal Package-only Save encoder path; untrusted bytes still use
 * `parseStrictJson`.
 */
export function canonicalJsonBytesWithStrictLimitsInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): CanonicalJsonStrictLimitsResultInternalV1 {
  let firstError: StrictJsonErrorCodeV1 | undefined;
  let nodes = 0;
  const recordFirstError = (code: StrictJsonErrorCodeV1): void => {
    firstError ??= code;
  };
  const observer: CanonicalJsonTraversalObserverInternalV1 = {
    enterValue(depth) {
      if (firstError !== undefined) return;
      if (depth > limits.maxDepth) {
        recordFirstError("limit.depth");
        return;
      }
      nodes += 1;
      if (nodes > limits.maxNodes) recordFirstError("limit.nodes");
    },
    enterArrayItem(index) {
      if (firstError === undefined && index >= limits.maxArrayItems) {
        recordFirstError("limit.array_items");
      }
    },
    enterObjectMember(index) {
      if (firstError === undefined && index >= limits.maxObjectMembers) {
        recordFirstError("limit.object_members");
      }
    },
    observeString(string) {
      if (firstError === undefined && utf8ByteLength(string) > limits.maxStringBytes) {
        recordFirstError("limit.string_bytes");
      }
    },
    observeObjectKey(key) {
      if (firstError === undefined && dangerousKeys.has(key)) {
        recordFirstError("object.dangerous_key");
      }
    },
  };
  const bytes = canonicalJsonBytesObservedInternalV1(value, observer, instrumentation);
  if (bytes.byteLength > limits.maxBytes) {
    return { ok: false, bytes, error: { code: "limit.bytes" } };
  }
  if (firstError !== undefined) {
    return { ok: false, bytes, error: { code: firstError } };
  }
  return { ok: true, bytes };
}

class ParseFailure {
  readonly code: StrictJsonErrorCodeV1;
  readonly offset: number;

  constructor(code: StrictJsonErrorCodeV1, offset: number) {
    this.code = code;
    this.offset = offset;
  }
}

export function parseStrictJson(
  bytes: Uint8Array,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): StrictJsonResultV1 {
  if (bytes.byteLength > limits.maxBytes) {
    return { ok: false, error: { code: "limit.bytes" } };
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { ok: false, error: { code: "encoding.bom_forbidden" } };
  }

  const text = decodeUtf8(bytes);
  if (text === null) {
    return { ok: false, error: { code: "encoding.invalid_utf8" } };
  }

  let index = 0;
  let nodes = 0;
  let deferredExactNumberFailure: ParseFailure | undefined;
  const fail = (code: StrictJsonErrorCodeV1, offset = index): never => {
    throw new ParseFailure(code, offset);
  };
  const skipWhitespace = (): void => {
    while (
      text[index] === " " ||
      text[index] === "\n" ||
      text[index] === "\r" ||
      text[index] === "\t"
    ) {
      index += 1;
    }
    if (text[index] === "/") fail("syntax.comment_forbidden");
  };
  const isDecimalDigit = (offset: number): boolean => {
    const code = text.charCodeAt(offset);
    return code >= 0x30 && code <= 0x39;
  };

  const parseString = (): string => {
    const start = index;
    if (text[index] !== '"') fail("syntax.invalid");
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        let parsed: unknown;
        try {
          parsed = JSON.parse(text.slice(start, index));
        } catch {
          return fail("syntax.invalid", start);
        }
        if (typeof parsed !== "string") return fail("syntax.invalid", start);
        const value = parsed;
        if (hasLoneSurrogate(value)) fail("string.lone_surrogate", start);
        if (utf8ByteLength(value) > limits.maxStringBytes) {
          fail("limit.string_bytes", start);
        }
        return value;
      }
      if (character === "\\") {
        index += 1;
        const escape = text[index];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(index + 1, index + 5))) {
            fail("syntax.invalid", start);
          }
          index += 5;
          continue;
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape ?? "")) {
          fail("syntax.invalid", start);
        }
        index += 1;
        continue;
      }
      if ((character?.charCodeAt(0) ?? 0) < 0x20) fail("syntax.invalid", start);
      index += 1;
    }
    return fail("syntax.invalid", start);
  };

  const parseNumber = (): number => {
    const start = index;
    let cursor = index;
    const negative = text[cursor] === "-";
    if (negative) cursor += 1;

    const integerStart = cursor;
    if (text[cursor] === "0") {
      cursor += 1;
    } else {
      const firstCode = text.charCodeAt(cursor);
      if (firstCode < 0x31 || firstCode > 0x39) return fail("syntax.invalid", start);
      cursor += 1;
      while (isDecimalDigit(cursor)) cursor += 1;
    }
    const integerEnd = cursor;

    let fractionStart = cursor;
    let fractionEnd = cursor;
    if (text[cursor] === "." && isDecimalDigit(cursor + 1)) {
      cursor += 1;
      fractionStart = cursor;
      while (isDecimalDigit(cursor)) cursor += 1;
      fractionEnd = cursor;
    }

    let exponentNegative = false;
    let exponentDigitsStart = cursor;
    let exponentDigitsEnd = cursor;
    if (text[cursor] === "e" || text[cursor] === "E") {
      const exponentMarker = cursor;
      cursor += 1;
      exponentNegative = text[cursor] === "-";
      if (exponentNegative || text[cursor] === "+") cursor += 1;
      const candidateDigitsStart = cursor;
      while (isDecimalDigit(cursor)) cursor += 1;
      if (cursor === candidateDigitsStart) {
        cursor = exponentMarker;
        exponentNegative = false;
      } else {
        exponentDigitsStart = candidateDigitsStart;
        exponentDigitsEnd = cursor;
      }
    }
    index = cursor;

    const integerLength = integerEnd - integerStart;
    const fractionLength = fractionEnd - fractionStart;
    const coefficientLength = integerLength + fractionLength;
    const coefficientDigitCodeAt = (offset: number): number =>
      offset < integerLength
        ? text.charCodeAt(integerStart + offset)
        : text.charCodeAt(fractionStart + offset - integerLength);

    let firstNonZero = -1;
    let lastNonZero = -1;
    for (let offset = 0; offset < coefficientLength; offset += 1) {
      if (coefficientDigitCodeAt(offset) === 0x30) continue;
      firstNonZero = firstNonZero < 0 ? offset : firstNonZero;
      lastNonZero = offset;
    }
    if (firstNonZero < 0) {
      if (negative) fail("number.negative_zero", start);
      return 0;
    }

    // Only comparisons against positions in this already byte-bounded token
    // matter. Saturation avoids BigInt or an unbounded exponent conversion.
    const exponentCap = coefficientLength + 32;
    let exponentMagnitude = 0;
    for (let offset = exponentDigitsStart; offset < exponentDigitsEnd; offset += 1) {
      const digit = text.charCodeAt(offset) - 0x30;
      if (exponentMagnitude > Math.floor((exponentCap - digit) / 10)) {
        exponentMagnitude = exponentCap + 1;
        break;
      }
      exponentMagnitude = exponentMagnitude * 10 + digit;
    }
    const exponent = exponentNegative ? -exponentMagnitude : exponentMagnitude;
    const scale = exponent - fractionLength;
    const trailingZeros = coefficientLength - lastNonZero - 1;
    if (scale < -trailingZeros) {
      // Preserve errors that the old parser reached after a fraction which
      // binary64 had rounded to an otherwise accepted safe integer. Exact
      // admission still fails if the rest of the input would have passed.
      const legacyValue = Number(text.slice(start, index));
      if (Number.isSafeInteger(legacyValue) && !Object.is(legacyValue, -0)) {
        deferredExactNumberFailure ??= new ParseFailure("number.not_integer", start);
        return legacyValue;
      }
      fail("number.not_integer", start);
    }

    const integerDigitCount = coefficientLength - firstNonZero + scale;
    if (integerDigitCount > maxSafeIntegerDecimalV1.length) {
      fail("number.unsafe_integer", start);
    }

    const sourceEnd = coefficientLength + Math.min(scale, 0);
    let integerDigits = "";
    for (let offset = firstNonZero; offset < sourceEnd; offset += 1) {
      integerDigits += String.fromCharCode(coefficientDigitCodeAt(offset));
    }
    if (scale > 0) integerDigits += "0".repeat(scale);
    if (
      integerDigits.length === maxSafeIntegerDecimalV1.length &&
      integerDigits > maxSafeIntegerDecimalV1
    ) {
      fail("number.unsafe_integer", start);
    }

    const value = Number(integerDigits);
    return negative ? -value : value;
  };

  const parseValue = (depth: number): StrictJsonValueV1 => {
    skipWhitespace();
    if (depth > limits.maxDepth) fail("limit.depth");
    nodes += 1;
    if (nodes > limits.maxNodes) fail("limit.nodes");
    const character = text[index];
    if (character === '"') return parseString();
    if (character === "[") {
      index += 1;
      const values: StrictJsonValueV1[] = [];
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return values;
      }
      while (true) {
        if (values.length >= limits.maxArrayItems) fail("limit.array_items");
        values.push(parseValue(depth + 1));
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return values;
        }
        if (text[index] !== ",") fail("syntax.invalid");
        index += 1;
        skipWhitespace();
        if (text[index] === "]") fail("syntax.trailing_comma_forbidden");
      }
    }
    if (character === "{") {
      index += 1;
      const value: Record<string, StrictJsonValueV1> = {};
      const keys = new Set<string>();
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return value;
      }
      while (true) {
        if (keys.size >= limits.maxObjectMembers) fail("limit.object_members");
        const keyOffset = index;
        const key = parseString();
        if (dangerousKeys.has(key)) fail("object.dangerous_key", keyOffset);
        if (keys.has(key)) fail("object.duplicate_key", keyOffset);
        keys.add(key);
        skipWhitespace();
        if (text[index] !== ":") fail("syntax.invalid");
        index += 1;
        value[key] = parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === "}") {
          index += 1;
          return value;
        }
        if (text[index] !== ",") fail("syntax.invalid");
        index += 1;
        skipWhitespace();
        if (text[index] === "}") fail("syntax.trailing_comma_forbidden");
      }
    }
    if (text.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (text.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (text.startsWith("null", index)) {
      index += 4;
      return null;
    }
    return parseNumber();
  };

  try {
    const value = parseValue(1);
    skipWhitespace();
    if (index !== text.length) fail("syntax.invalid");
    if (deferredExactNumberFailure !== undefined) throw deferredExactNumberFailure;
    return { ok: true, value };
  } catch (error) {
    if (error instanceof ParseFailure) {
      return {
        ok: false,
        error: {
          code: error.code,
          offset: error.offset as NonNegativeSafeInteger,
        },
      };
    }
    return { ok: false, error: { code: "syntax.invalid" } };
  }
}
