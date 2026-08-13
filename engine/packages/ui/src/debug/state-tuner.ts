// SPDX-License-Identifier: MIT

/** Built-in read-only JSON inspector over authoritative story state. */
export const engineStateInspectorPanelIdV1 = "engine.state_inspector";

/** Built-in cheat table editor over existing state leaves. */
export const engineStateTunerPanelIdV1 = "engine.state_tuner";

export const engineStateTunerMaxLeavesV1 = 512;

export type StateTunerLeafKindV1 = "string" | "number" | "boolean" | "null";

export interface StateTunerLeafV1 {
  readonly path: readonly string[];
  readonly pathLabel: string;
  readonly kind: StateTunerLeafKindV1;
  readonly value: string | number | boolean | null;
}

export interface StateTunerLeavesV1 {
  readonly leaves: readonly StateTunerLeafV1[];
  readonly truncated: boolean;
}

export type StateTunerPatchResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "validation_failed"; readonly message: string }
  | { readonly kind: "capability_disabled" }
  | { readonly kind: "rejected"; readonly message: string };

export interface StateTunerPortV1 {
  read(): unknown;
  subscribe(listener: () => void): () => void;
  patch(
    path: readonly string[],
    value: string | number | boolean | null,
  ): Promise<StateTunerPatchResultV1>;
}

export function flattenStateTunerLeavesV1(
  root: unknown,
  options: { readonly filter?: string } = {},
): StateTunerLeavesV1 {
  const filter = options.filter?.trim().toLowerCase() ?? "";
  const leaves: StateTunerLeafV1[] = [];
  visitV1(root, [], leaves, filter);
  const truncated = leaves.length > engineStateTunerMaxLeavesV1;
  return Object.freeze({
    leaves: Object.freeze(
      (truncated ? leaves.slice(0, engineStateTunerMaxLeavesV1) : leaves).map((leaf) =>
        Object.freeze(leaf)
      ),
    ),
    truncated,
  });
}

function visitV1(
  value: unknown,
  path: readonly string[],
  leaves: StateTunerLeafV1[],
  filter: string,
): void {
  if (leaves.length > engineStateTunerMaxLeavesV1) return;
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    pushLeafIfMatchV1(path, value, leaves, filter);
    return;
  }
  if (typeof value === "number") {
    pushLeafIfMatchV1(path, value, leaves, filter);
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (leaves.length > engineStateTunerMaxLeavesV1) return;
      visitV1(value[index], [...path, String(index)], leaves, filter);
    }
    return;
  }
  if (!isPlainObjectV1(value)) return;
  const keys = Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  for (const key of keys) {
    if (leaves.length > engineStateTunerMaxLeavesV1) return;
    visitV1(value[key], [...path, key], leaves, filter);
  }
}

function pushLeafIfMatchV1(
  path: readonly string[],
  value: string | number | boolean | null,
  leaves: StateTunerLeafV1[],
  filter: string,
): void {
  if (path.length === 0) return;
  const candidate = leafV1(path, value);
  if (filter.length > 0 && !candidate.pathLabel.toLowerCase().includes(filter)) return;
  leaves.push(candidate);
}

function leafV1(
  path: readonly string[],
  value: string | number | boolean | null,
): StateTunerLeafV1 {
  return {
    path: Object.freeze([...path]),
    pathLabel: path.join("."),
    kind: leafKindV1(value),
    value,
  };
}

function leafKindV1(value: string | number | boolean | null): StateTunerLeafKindV1 {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return "number";
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}
