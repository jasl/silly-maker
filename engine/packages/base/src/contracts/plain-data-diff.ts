// SPDX-License-Identifier: MIT

/**
 * Structured diff over plain JSON-safe data: the "where exactly do two
 * snapshots differ" answer that digests cannot give. Objects recurse by
 * key, arrays by index; every difference reports a JSON-pointer-style
 * path with the before/after values. Used by `story diff` for exported
 * saves and simulate reports, and available to DevDock panels and tests.
 */

export type PlainDataDiffEntryV1 =
  | { readonly kind: "added"; readonly path: string; readonly after: unknown }
  | { readonly kind: "removed"; readonly path: string; readonly before: unknown }
  | {
    readonly kind: "changed";
    readonly path: string;
    readonly before: unknown;
    readonly after: unknown;
  };

function isPlainObjectV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeSegmentV1(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function collectV1(
  before: unknown,
  after: unknown,
  path: string,
  entries: PlainDataDiffEntryV1[],
): void {
  if (Object.is(before, after)) return;
  if (isPlainObjectV1(before) && isPlainObjectV1(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].toSorted();
    for (const key of keys) {
      const childPath = `${path}/${escapeSegmentV1(key)}`;
      if (!Object.hasOwn(before, key)) {
        entries.push(Object.freeze({ kind: "added", path: childPath, after: after[key] }));
      } else if (!Object.hasOwn(after, key)) {
        entries.push(Object.freeze({ kind: "removed", path: childPath, before: before[key] }));
      } else {
        collectV1(before[key], after[key], childPath, entries);
      }
    }
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      const childPath = `${path}/${String(index)}`;
      if (index >= before.length) {
        entries.push(Object.freeze({ kind: "added", path: childPath, after: after[index] }));
      } else if (index >= after.length) {
        entries.push(Object.freeze({ kind: "removed", path: childPath, before: before[index] }));
      } else {
        collectV1(before[index], after[index], childPath, entries);
      }
    }
    return;
  }
  entries.push(Object.freeze({ kind: "changed", path: path === "" ? "/" : path, before, after }));
}

/** Diffs two plain-data values; an empty result means deep equality. */
export function diffPlainDataV1(before: unknown, after: unknown): readonly PlainDataDiffEntryV1[] {
  const entries: PlainDataDiffEntryV1[] = [];
  collectV1(before, after, "", entries);
  return Object.freeze(entries);
}
