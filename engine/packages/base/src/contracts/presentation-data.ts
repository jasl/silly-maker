// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "./canonical-json.ts";
import type { StrictJsonObjectV1, StrictJsonValueV1 } from "./strict-json.ts";

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

export class PresentationCatalogValidationError extends Error
  implements PresentationCatalogValidationErrorV1 {
  override readonly name = "PresentationCatalogValidationError";
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
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "object_expected");
  }
  const stringKeys = Object.keys(value);
  if (
    stringKeys.length !== expectedKeys.length ||
    [...stringKeys].sort(compareCodePoints).join("\0") !==
      [...expectedKeys].sort(compareCodePoints).join("\0")
  ) {
    return dataFailure(path, "object_keys");
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(expectedKeys.map((key) => [key, record[key]]));
}

export function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    return dataFailure(path, "array_expected");
  }
  return [...value];
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
        cloneStrictJsonValue(entry, `${path}/${index}`, active)
      );
    }
    const record = value as Record<string, unknown>;
    const entries: [string, StrictJsonValueV1][] = [];
    for (const key of Object.keys(record)) {
      const memberPath = `${path}/${pointerSegment(key)}`;
      try {
        canonicalJsonBytes(key);
      } catch {
        return dataFailure(memberPath, "invalid_string");
      }
      entries.push([key, cloneStrictJsonValue(record[key], memberPath, active)]);
    }
    return Object.fromEntries(entries);
  } finally {
    active.delete(value);
  }
}

export function parseStrictJsonObject(value: unknown, path: string): StrictJsonObjectV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
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
  throw new PresentationCatalogValidationError(code, details);
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
