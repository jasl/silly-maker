// SPDX-License-Identifier: MIT

export const programNetworkGrantSetRevisionV1 = 1 as const;
export const programNetworkGrantMaximumPerProgramV1 = 32;
export const programNetworkGrantOriginMaximumCharactersV1 = 2_048;

const programIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export type ProgramNetworkOperationV1 = "fetch_url" | "download";

export interface ProgramNetworkGrantV1 {
  readonly origin: string;
  readonly operation: ProgramNetworkOperationV1;
}

/** One bounded, non-secret Product Repository row for a Program. */
export interface ProgramNetworkGrantSetV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly grants: readonly ProgramNetworkGrantV1[];
}

export interface ProgramNetworkGrantMutationV1 {
  readonly programId: string;
  readonly grant: ProgramNetworkGrantV1;
  readonly enabled: boolean;
}

export type ProgramNetworkGrantMutationResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly value: ProgramNetworkGrantSetV1;
  }
  | { readonly kind: "missing" };

export type ProgramNetworkGrantAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

export type ProgramNetworkGrantApplyResultV1 =
  | {
    readonly kind: "committed" | "unchanged";
    readonly value: ProgramNetworkGrantSetV1;
  }
  | { readonly kind: "capacity_exceeded" };

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

function admittedV1<TValue>(value: TValue): ProgramNetworkGrantAdmissionResultV1<TValue> {
  return { kind: "admitted", value };
}

function rejectedV1<TValue>(path: string): ProgramNetworkGrantAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function operationV1(value: unknown): value is ProgramNetworkOperationV1 {
  return value === "fetch_url" || value === "download";
}

function grantKeyV1(grant: ProgramNetworkGrantV1): string {
  return `${grant.operation}\u0000${grant.origin}`;
}

function compareGrantsV1(left: ProgramNetworkGrantV1, right: ProgramNetworkGrantV1): number {
  const leftKey = grantKeyV1(left);
  const rightKey = grantKeyV1(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

/** Returns the immutable canonical HTTPS origin, never a path or full request URL. */
export function normalizeProgramNetworkOriginV1(value: unknown): string | null {
  if (
    typeof value !== "string" || value.length === 0 ||
    value.length > programNetworkGrantOriginMaximumCharactersV1 || !URL.canParse(value)
  ) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.username.length !== 0 || url.password.length !== 0 ||
      value !== url.origin
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function admitProgramNetworkGrantV1(
  value: unknown,
): ProgramNetworkGrantAdmissionResultV1<ProgramNetworkGrantV1> {
  const record = exactRecordV1(value, ["origin", "operation"]);
  if (record === null) return rejectedV1("/");
  const origin = normalizeProgramNetworkOriginV1(record.origin);
  if (origin === null) return rejectedV1("/origin");
  if (!operationV1(record.operation)) return rejectedV1("/operation");
  return admittedV1({ origin, operation: record.operation });
}

export function admitProgramNetworkGrantSetV1(
  value: unknown,
): ProgramNetworkGrantAdmissionResultV1<ProgramNetworkGrantSetV1> {
  const record = exactRecordV1(value, ["revision", "programId", "grants"]);
  if (record === null) return rejectedV1("/");
  if (record.revision !== programNetworkGrantSetRevisionV1) return rejectedV1("/revision");
  if (typeof record.programId !== "string" || !programIdentifierPatternV1.test(record.programId)) {
    return rejectedV1("/programId");
  }
  if (
    !Array.isArray(record.grants) ||
    record.grants.length > programNetworkGrantMaximumPerProgramV1
  ) return rejectedV1("/grants");
  const grants: ProgramNetworkGrantV1[] = [];
  let previousKey: string | null = null;
  for (let index = 0; index < record.grants.length; index += 1) {
    const grant = admitProgramNetworkGrantV1(record.grants[index]);
    if (grant.kind === "rejected") {
      return rejectedV1(`/grants/${String(index)}${grant.path}`);
    }
    const key = grantKeyV1(grant.value);
    if (previousKey !== null && key <= previousKey) {
      return rejectedV1(`/grants/${String(index)}`);
    }
    grants.push(grant.value);
    previousKey = key;
  }
  return admittedV1({ revision: 1, programId: record.programId, grants });
}

export function admitProgramNetworkGrantMutationV1(
  value: unknown,
): ProgramNetworkGrantAdmissionResultV1<ProgramNetworkGrantMutationV1> {
  const record = exactRecordV1(value, ["programId", "grant", "enabled"]);
  if (record === null) return rejectedV1("/");
  if (typeof record.programId !== "string" || !programIdentifierPatternV1.test(record.programId)) {
    return rejectedV1("/programId");
  }
  const grant = admitProgramNetworkGrantV1(record.grant);
  if (grant.kind === "rejected") return rejectedV1(`/grant${grant.path}`);
  if (typeof record.enabled !== "boolean") return rejectedV1("/enabled");
  return admittedV1({
    programId: record.programId,
    grant: grant.value,
    enabled: record.enabled,
  });
}

export function createEmptyProgramNetworkGrantSetV1(programId: string): ProgramNetworkGrantSetV1 {
  const admitted = admitProgramNetworkGrantSetV1({ revision: 1, programId, grants: [] });
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_grants.empty.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function cloneProgramNetworkGrantSetV1(
  value: ProgramNetworkGrantSetV1,
): ProgramNetworkGrantSetV1 {
  const admitted = admitProgramNetworkGrantSetV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_grants.set.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function normalizeProgramNetworkGrantMutationV1(
  value: ProgramNetworkGrantMutationV1,
): ProgramNetworkGrantMutationV1 {
  const admitted = admitProgramNetworkGrantMutationV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.program_network_grants.mutation.invalid${admitted.path}`);
  }
  return admitted.value;
}

export function applyProgramNetworkGrantMutationV1(
  currentValue: ProgramNetworkGrantSetV1,
  mutationValue: ProgramNetworkGrantMutationV1,
): ProgramNetworkGrantApplyResultV1 {
  const current = cloneProgramNetworkGrantSetV1(currentValue);
  const mutation = normalizeProgramNetworkGrantMutationV1(mutationValue);
  if (current.programId !== mutation.programId) {
    throw new TypeError("sillyos.program_network_grants.program_mismatch");
  }
  const requestedKey = grantKeyV1(mutation.grant);
  const existing = current.grants.some((grant) => grantKeyV1(grant) === requestedKey);
  if (existing === mutation.enabled) return { kind: "unchanged", value: current };
  if (mutation.enabled && current.grants.length >= programNetworkGrantMaximumPerProgramV1) {
    return { kind: "capacity_exceeded" };
  }
  const grants = mutation.enabled
    ? [...current.grants, mutation.grant].toSorted(compareGrantsV1)
    : current.grants.filter((grant) => grantKeyV1(grant) !== requestedKey);
  return {
    kind: "committed",
    value: cloneProgramNetworkGrantSetV1({ revision: 1, programId: current.programId, grants }),
  };
}

export function admitProgramNetworkGrantMutationResultV1(
  value: unknown,
): ProgramNetworkGrantAdmissionResultV1<ProgramNetworkGrantMutationResultV1> {
  const missing = exactRecordV1(value, ["kind"]);
  if (missing !== null && missing.kind === "missing") return admittedV1({ kind: "missing" });
  const record = exactRecordV1(value, ["kind", "value"]);
  if (
    record === null || (record.kind !== "committed" && record.kind !== "unchanged")
  ) return rejectedV1("/");
  const grantSet = admitProgramNetworkGrantSetV1(record.value);
  if (grantSet.kind === "rejected") return rejectedV1(`/value${grantSet.path}`);
  return admittedV1({ kind: record.kind, value: grantSet.value });
}
