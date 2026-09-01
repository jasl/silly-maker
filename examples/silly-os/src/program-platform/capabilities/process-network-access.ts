// SPDX-License-Identifier: MIT

import { isProgramPlatformIdentifierV1 } from "../identifier.ts";

export const processNetworkAccessRevisionV1 = 1 as const;
export const optionalProcessNetworkAccessCapabilityIdV1 = "network.optional" as const;

/** One non-secret, Process-scoped network preference. */
export interface ProcessNetworkAccessV1 {
  readonly revision: 1;
  readonly processId: string;
  readonly enabled: boolean;
}

export interface ProcessNetworkAccessMutationV1 {
  readonly processId: string;
  readonly enabled: boolean;
}

export type ProcessNetworkAccessMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly value: ProcessNetworkAccessV1;
  }
  | { readonly kind: "missing" };

export type ProcessNetworkAccessAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

export type ProcessNetworkAccessApplyResultV1 = {
  readonly kind: "committed" | "unchanged";
  readonly value: ProcessNetworkAccessV1;
};

type ExactRecordV1 = Readonly<Record<string, unknown>>;

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function admittedV1<TValue>(value: TValue): ProcessNetworkAccessAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function rejectedV1<TValue>(path: string): ProcessNetworkAccessAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function processIdV1(value: unknown): value is string {
  return isProgramPlatformIdentifierV1(value);
}

export function admitProcessNetworkAccessV1(
  value: unknown,
): ProcessNetworkAccessAdmissionResultV1<ProcessNetworkAccessV1> {
  const record = exactRecordV1(value, ["revision", "processId", "enabled"]);
  if (record === null) return rejectedV1("/");
  if (record.revision !== processNetworkAccessRevisionV1) return rejectedV1("/revision");
  if (!processIdV1(record.processId)) return rejectedV1("/processId");
  if (typeof record.enabled !== "boolean") return rejectedV1("/enabled");
  return admittedV1({ revision: 1, processId: record.processId, enabled: record.enabled });
}

export function admitProcessNetworkAccessMutationV1(
  value: unknown,
): ProcessNetworkAccessAdmissionResultV1<ProcessNetworkAccessMutationV1> {
  const record = exactRecordV1(value, ["processId", "enabled"]);
  if (record === null) return rejectedV1("/");
  if (!processIdV1(record.processId)) return rejectedV1("/processId");
  if (typeof record.enabled !== "boolean") return rejectedV1("/enabled");
  return admittedV1({ processId: record.processId, enabled: record.enabled });
}

export function createDefaultProcessNetworkAccessV1(processId: string): ProcessNetworkAccessV1 {
  if (!processIdV1(processId)) {
    throw new TypeError("sillyos.process_network_access.default.invalid/processId");
  }
  return { revision: 1, processId, enabled: false };
}

export function cloneProcessNetworkAccessV1(
  value: ProcessNetworkAccessV1,
): ProcessNetworkAccessV1 {
  return { revision: 1, processId: value.processId, enabled: value.enabled };
}

export function applyProcessNetworkAccessMutationV1(
  currentValue: ProcessNetworkAccessV1,
  mutationValue: ProcessNetworkAccessMutationV1,
): ProcessNetworkAccessApplyResultV1 {
  if (currentValue.processId !== mutationValue.processId) {
    throw new TypeError("sillyos.process_network_access.process_mismatch");
  }
  if (currentValue.enabled === mutationValue.enabled) {
    return { kind: "unchanged", value: cloneProcessNetworkAccessV1(currentValue) };
  }
  return {
    kind: "committed",
    value: {
      revision: 1,
      processId: currentValue.processId,
      enabled: mutationValue.enabled,
    },
  };
}

export function admitProcessNetworkAccessMutationResultV1(
  value: unknown,
): ProcessNetworkAccessAdmissionResultV1<ProcessNetworkAccessMutationResultV1> {
  const missing = exactRecordV1(value, ["kind"]);
  if (missing !== null && missing.kind === "missing") return admittedV1({ kind: "missing" });
  const record = exactRecordV1(value, ["kind", "value"]);
  if (
    record === null || (record.kind !== "committed" && record.kind !== "unchanged")
  ) return rejectedV1("/");
  const access = admitProcessNetworkAccessV1(record.value);
  if (access.kind === "rejected") return rejectedV1(`/value${access.path}`);
  return admittedV1({ kind: record.kind, value: access.value });
}
