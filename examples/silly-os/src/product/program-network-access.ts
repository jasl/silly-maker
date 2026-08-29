// SPDX-License-Identifier: MIT

export const programNetworkAccessRevisionV1 = 1 as const;

const programIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

/** One non-secret, Program-scoped network preference. */
export interface ProgramNetworkAccessV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly enabled: boolean;
}

export interface ProgramNetworkAccessMutationV1 {
  readonly programId: string;
  readonly enabled: boolean;
}

export type ProgramNetworkAccessMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly value: ProgramNetworkAccessV1;
  }
  | { readonly kind: "missing" };

export type ProgramNetworkAccessAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

export type ProgramNetworkAccessApplyResultV1 = {
  readonly kind: "committed" | "unchanged";
  readonly value: ProgramNetworkAccessV1;
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

function admittedV1<TValue>(value: TValue): ProgramNetworkAccessAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function rejectedV1<TValue>(path: string): ProgramNetworkAccessAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function programIdV1(value: unknown): value is string {
  return typeof value === "string" && programIdentifierPatternV1.test(value);
}

export function admitProgramNetworkAccessV1(
  value: unknown,
): ProgramNetworkAccessAdmissionResultV1<ProgramNetworkAccessV1> {
  const record = exactRecordV1(value, ["revision", "programId", "enabled"]);
  if (record === null) return rejectedV1("/");
  if (record.revision !== programNetworkAccessRevisionV1) return rejectedV1("/revision");
  if (!programIdV1(record.programId)) return rejectedV1("/programId");
  if (typeof record.enabled !== "boolean") return rejectedV1("/enabled");
  return admittedV1({ revision: 1, programId: record.programId, enabled: record.enabled });
}

export function admitProgramNetworkAccessMutationV1(
  value: unknown,
): ProgramNetworkAccessAdmissionResultV1<ProgramNetworkAccessMutationV1> {
  const record = exactRecordV1(value, ["programId", "enabled"]);
  if (record === null) return rejectedV1("/");
  if (!programIdV1(record.programId)) return rejectedV1("/programId");
  if (typeof record.enabled !== "boolean") return rejectedV1("/enabled");
  return admittedV1({ programId: record.programId, enabled: record.enabled });
}

export function createDefaultProgramNetworkAccessV1(programId: string): ProgramNetworkAccessV1 {
  const admitted = admitProgramNetworkAccessV1({ revision: 1, programId, enabled: false });
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_access.default.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function cloneProgramNetworkAccessV1(
  value: ProgramNetworkAccessV1,
): ProgramNetworkAccessV1 {
  const admitted = admitProgramNetworkAccessV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_access.value.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function normalizeProgramNetworkAccessMutationV1(
  value: ProgramNetworkAccessMutationV1,
): ProgramNetworkAccessMutationV1 {
  const admitted = admitProgramNetworkAccessMutationV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_access.mutation.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function applyProgramNetworkAccessMutationV1(
  currentValue: ProgramNetworkAccessV1,
  mutationValue: ProgramNetworkAccessMutationV1,
): ProgramNetworkAccessApplyResultV1 {
  const current = cloneProgramNetworkAccessV1(currentValue);
  const mutation = normalizeProgramNetworkAccessMutationV1(mutationValue);
  if (current.programId !== mutation.programId) {
    throw new TypeError("sillyos.program_network_access.program_mismatch");
  }
  if (current.enabled === mutation.enabled) return { kind: "unchanged", value: current };
  return {
    kind: "committed",
    value: cloneProgramNetworkAccessV1({
      revision: 1,
      programId: current.programId,
      enabled: mutation.enabled,
    }),
  };
}

export function admitProgramNetworkAccessMutationResultV1(
  value: unknown,
): ProgramNetworkAccessAdmissionResultV1<ProgramNetworkAccessMutationResultV1> {
  const missing = exactRecordV1(value, ["kind"]);
  if (missing !== null && missing.kind === "missing") return admittedV1({ kind: "missing" });
  const record = exactRecordV1(value, ["kind", "value"]);
  if (
    record === null || (record.kind !== "committed" && record.kind !== "unchanged")
  ) return rejectedV1("/");
  const access = admitProgramNetworkAccessV1(record.value);
  if (access.kind === "rejected") return rejectedV1(`/value${access.path}`);
  return admittedV1({ kind: record.kind, value: access.value });
}
