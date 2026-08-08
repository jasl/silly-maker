// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { SessionAnchorResultV1 } from "@sillymaker/base";

const rejectedCodesV1: ReadonlySet<string> = new Set(
  [
    "busy",
    "fault_paused",
    "hmr_invalidated",
    "validation_failed",
  ] as const,
);

function invalidResultV1(): TypeError {
  return new TypeError("ui.lifecycle_restart_result_invalid");
}

function exactDataRecordV1(
  value: unknown,
): ReadonlyMap<PropertyKey, PropertyDescriptor> {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw invalidResultV1();
    }
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw invalidResultV1();
    const descriptors = new Map<PropertyKey, PropertyDescriptor>();
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") throw invalidResultV1();
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) throw invalidResultV1();
      descriptors.set(key, descriptor);
    }
    return descriptors;
  } catch {
    throw invalidResultV1();
  }
}

function exactKeysV1(
  descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>,
  expected: readonly string[],
): boolean {
  return descriptors.size === expected.length &&
    expected.every((key) => descriptors.has(key));
}

/** @internal Descriptor-safe admission for a settled package-owned lifecycle result. */
export function admitSettledSessionAnchorResultInternalV1(
  value: unknown,
): SessionAnchorResultV1 {
  const descriptors = exactDataRecordV1(value);
  const kind = descriptors.get("kind")?.value;
  if (kind === "anchored") {
    if (!exactKeysV1(descriptors, ["kind", "commandSequence"])) throw invalidResultV1();
    let commandSequence;
    try {
      commandSequence = parseNonNegativeSafeInteger(
        descriptors.get("commandSequence")?.value,
      );
    } catch {
      throw invalidResultV1();
    }
    return Object.freeze({ kind, commandSequence });
  }
  if (kind === "rejected") {
    if (!exactKeysV1(descriptors, ["kind", "code"])) throw invalidResultV1();
    const code = descriptors.get("code")?.value;
    if (typeof code !== "string" || !rejectedCodesV1.has(code)) {
      throw invalidResultV1();
    }
    return Object.freeze({
      kind,
      code: code as Extract<SessionAnchorResultV1, { readonly kind: "rejected" }>["code"],
    });
  }
  if (kind === "faulted") {
    if (!exactKeysV1(descriptors, ["kind", "code"])) throw invalidResultV1();
    const code = descriptors.get("code")?.value;
    if (typeof code !== "string") throw invalidResultV1();
    return Object.freeze({ kind, code });
  }
  throw invalidResultV1();
}
