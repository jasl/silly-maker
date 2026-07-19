// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "./canonical-json.js";
import type { StrictJsonObjectV1, StrictJsonValueV1 } from "./strict-json.js";

export type PresentationCatalogValidationCodeV1 =
  | "presentation.catalog.duplicate_id"
  | "presentation.catalog.invalid_shape"
  | "presentation.catalog.missing_reference"
  | "presentation.catalog.surface_cycle"
  | "content_maturity.unknown_flags";

export interface PresentationCatalogValidationErrorV1 extends Error {
  readonly code: PresentationCatalogValidationCodeV1;
  readonly details: StrictJsonObjectV1;
}

export class PresentationCatalogValidationError
  extends Error
  implements PresentationCatalogValidationErrorV1
{
  readonly name = "PresentationCatalogValidationError";
  readonly code: PresentationCatalogValidationCodeV1;
  readonly details: StrictJsonObjectV1;

  constructor(code: PresentationCatalogValidationCodeV1, details: StrictJsonObjectV1) {
    super(code);
    this.code = code;
    this.details = details;
  }
}
export class PresentationDataError extends Error {
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string) {
    super(`${reason} at ${path || "/"}`);
    this.path = path;
    this.reason = reason;
  }
}

export class ContentMaturityDuplicateIdError extends TypeError {
  readonly path: string;
  readonly reference: string;

  constructor(path: string, reference: string) {
    super("content_maturity.duplicate");
    this.path = path;
    this.reference = reference;
  }
}
const dangerousJsonKeys = new Set(["__proto__", "prototype", "constructor"]);
export function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}
export function dataFailure(path: string, reason: string): never {
  throw new PresentationDataError(path, reason);
}

export function readExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "object_expected");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    return dataFailure(path, "symbol_key");
  }
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.length !== expectedKeys.length ||
    [...stringKeys].sort(compareCodePoints).join("\0") !==
      [...expectedKeys].sort(compareCodePoints).join("\0")
  ) {
    return dataFailure(path, "object_keys");
  }
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${pointerSegment(key)}`, "data_property_expected");
    }
    result[key] = descriptor.value;
  }
  return result;
}

export function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return dataFailure(path, "array_expected");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return dataFailure(path, "symbol_key");
    if (key === "length") continue;
    if (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length) {
      return dataFailure(`${path}/${pointerSegment(key)}`, "array_property");
    }
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined) return dataFailure(`${path}/${index}`, "sparse_array");
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${index}`, "data_property_expected");
    }
    result.push(descriptor.value);
  }
  return result;
}

export function parseAt<TValue>(
  parser: (value: unknown) => TValue,
  value: unknown,
  path: string,
  reason: string,
): TValue {
  try {
    return parser(value);
  } catch {
    return dataFailure(path, reason);
  }
}

export function parseNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    return dataFailure(path, "non_empty_string_expected");
  }
  try {
    canonicalJsonBytes(value);
  } catch {
    return dataFailure(path, "invalid_string");
  }
  return value;
}

export function parseEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
): TValue {
  if (typeof value !== "string" || !allowed.some((candidate) => candidate === value)) {
    return dataFailure(path, "invalid_enum");
  }
  return value as TValue;
}

export function parseNullableAt<TValue>(
  parser: (value: unknown) => TValue,
  value: unknown,
  path: string,
  reason: string,
): TValue | null {
  return value === null ? null : parseAt(parser, value, path, reason);
}

export function deepFreezeData<TValue>(value: TValue): TValue {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get === undefined && descriptor.set === undefined) {
        deepFreezeData(descriptor.value);
      }
    }
    Object.freeze(value);
  }
  return value;
}
function cloneStrictJsonValue(
  value: unknown,
  path: string,
  active: Set<object>,
): StrictJsonValueV1 {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string" || typeof value === "number") {
    try {
      canonicalJsonBytes(value);
    } catch {
      return dataFailure(path, "invalid_strict_json");
    }
    return value;
  }
  if (typeof value !== "object") return dataFailure(path, "invalid_strict_json");
  if (active.has(value)) return dataFailure(path, "cyclic_strict_json");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      return readArray(value, path).map((entry, index) =>
        cloneStrictJsonValue(entry, `${path}/${index}`, active),
      );
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return dataFailure(path, "invalid_strict_json");
    }
    const result: Record<string, StrictJsonValueV1> = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol" || dangerousJsonKeys.has(key)) {
        return dataFailure(path, "invalid_strict_json_key");
      }
      const memberPath = `${path}/${pointerSegment(key)}`;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      ) {
        return dataFailure(memberPath, "data_property_expected");
      }
      try {
        canonicalJsonBytes(key);
      } catch {
        return dataFailure(memberPath, "invalid_string");
      }
      result[key] = cloneStrictJsonValue(descriptor.value, memberPath, active);
    }
    return result;
  } finally {
    active.delete(value);
  }
}

export function parseStrictJsonObject(value: unknown, path: string): StrictJsonObjectV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "strict_json_object_expected");
  }
  return cloneStrictJsonValue(value, path, new Set()) as StrictJsonObjectV1;
}
export function catalogFailure(
  code: PresentationCatalogValidationCodeV1,
  path: string,
  reason: string,
  reference?: string | number,
): never {
  const details: Record<string, StrictJsonValueV1> = { path, reason };
  if (reference !== undefined) details.reference = reference;
  throw new PresentationCatalogValidationError(code, Object.freeze(details));
}

export function assertUniqueValues(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      catalogFailure("presentation.catalog.duplicate_id", path, "duplicate_reference", value);
    }
    seen.add(value);
  }
}
