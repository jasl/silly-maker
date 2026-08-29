// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export const credentialVaultRevisionV2 = 2 as const;
export const credentialVaultKdfIterationsV2 = 600_000;
export const credentialVaultMaximumBindingsV2 = 32;
export const credentialVaultPassphraseMaximumUtf8BytesV2 = 4 * 1024;
export const credentialVaultApiKeyMaximumUtf8BytesV2 = 64 * 1024;
export const credentialVaultBindingIdMaximumUtf8BytesV2 = 256;
export const credentialVaultBaseUrlMaximumUtf8BytesV2 = 2_048;

const bindingIdPatternV2 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/u;

export type CredentialVaultCredentialKindV2 = "api_key";
export type CredentialVaultProtectionV2 = "device" | "password";
export type CredentialVaultStateV2 = "locked" | "unlocked";

/**
 * Non-secret connection identity shown by Vault list operations. A binding is
 * the pair `(bindingId, baseUrl)`, so one Provider may own multiple immutable
 * endpoint credentials without either endpoint being silently rebound.
 */
export interface CredentialVaultBindingV2 {
  readonly bindingId: string;
  readonly credentialKind: CredentialVaultCredentialKindV2;
  readonly baseUrl: string;
}

export interface CredentialVaultListV2 {
  readonly revision: 2;
  readonly protection: CredentialVaultProtectionV2;
  readonly state: CredentialVaultStateV2;
  readonly bindings: readonly CredentialVaultBindingV2[];
}

export type CredentialVaultAdmissionV2<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

type ExactRecordV2 = Readonly<Record<string, unknown>>;

export function credentialVaultExactRecordV2(
  value: unknown,
  keys: readonly string[],
): ExactRecordV2 | null {
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

export function credentialVaultUtf8ByteLengthV2(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function isCredentialVaultBoundedTextV2(
  value: unknown,
  maximumUtf8Bytes: number,
): value is string {
  return typeof value === "string" && value.length > 0 &&
    credentialVaultUtf8ByteLengthV2(value) <= maximumUtf8Bytes;
}

/** Canonical complete HTTPS endpoint used by both storage identity and AAD. */
export function canonicalizeCredentialVaultBaseUrlV2(value: unknown): string | null {
  if (
    !isCredentialVaultBoundedTextV2(value, credentialVaultBaseUrlMaximumUtf8BytesV2) ||
    value.includes("?") || value.includes("#")
  ) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" || url.origin === "null" || url.hostname.length === 0 ||
    url.username.length !== 0 || url.password.length !== 0 || url.search.length !== 0 ||
    url.hash.length !== 0
  ) return null;
  const authorityEnd = value.slice("https://".length).search(/[/?#]/u);
  const authority = authorityEnd === -1
    ? value.slice("https://".length)
    : value.slice("https://".length, "https://".length + authorityEnd);
  if (authority.includes("@")) return null;
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/u, "");
  const canonical = `${url.origin}${path}`;
  return credentialVaultUtf8ByteLengthV2(canonical) <=
      credentialVaultBaseUrlMaximumUtf8BytesV2
    ? canonical
    : null;
}

export function admitCredentialVaultBindingV2(
  value: unknown,
): CredentialVaultAdmissionV2<CredentialVaultBindingV2> {
  const record = credentialVaultExactRecordV2(value, [
    "bindingId",
    "credentialKind",
    "baseUrl",
  ]);
  if (record === null) return { kind: "rejected", path: "/" };
  if (
    !isCredentialVaultBoundedTextV2(
      record.bindingId,
      credentialVaultBindingIdMaximumUtf8BytesV2,
    ) || !bindingIdPatternV2.test(record.bindingId)
  ) return { kind: "rejected", path: "/bindingId" };
  if (record.credentialKind !== "api_key") {
    return { kind: "rejected", path: "/credentialKind" };
  }
  const baseUrl = canonicalizeCredentialVaultBaseUrlV2(record.baseUrl);
  if (baseUrl === null || baseUrl !== record.baseUrl) {
    return { kind: "rejected", path: "/baseUrl" };
  }
  return {
    kind: "admitted",
    value: {
      bindingId: record.bindingId,
      credentialKind: "api_key",
      baseUrl,
    },
  };
}

export function normalizeCredentialVaultBindingV2(
  value: CredentialVaultBindingV2,
): CredentialVaultBindingV2 {
  const admitted = admitCredentialVaultBindingV2(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.binding_invalid${admitted.path}`);
  }
  return Object.freeze(admitted.value);
}

export function credentialVaultBindingsEqualV2(
  left: CredentialVaultBindingV2,
  right: CredentialVaultBindingV2,
): boolean {
  return left.bindingId === right.bindingId && left.credentialKind === right.credentialKind &&
    left.baseUrl === right.baseUrl;
}

export function credentialVaultBindingStorageKeyV2(binding: CredentialVaultBindingV2): string {
  const exact = normalizeCredentialVaultBindingV2(binding);
  return JSON.stringify([exact.bindingId, exact.credentialKind, exact.baseUrl]);
}

export function compareCredentialVaultBindingsV2(
  left: CredentialVaultBindingV2,
  right: CredentialVaultBindingV2,
): number {
  const leftKey = credentialVaultBindingStorageKeyV2(left);
  const rightKey = credentialVaultBindingStorageKeyV2(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function admitCredentialVaultListV2(
  value: unknown,
): CredentialVaultAdmissionV2<CredentialVaultListV2> {
  const record = credentialVaultExactRecordV2(value, [
    "revision",
    "protection",
    "state",
    "bindings",
  ]);
  if (record === null) return { kind: "rejected", path: "/" };
  if (record.revision !== credentialVaultRevisionV2) {
    return { kind: "rejected", path: "/revision" };
  }
  if (record.protection !== "device" && record.protection !== "password") {
    return { kind: "rejected", path: "/protection" };
  }
  if (record.state !== "locked" && record.state !== "unlocked") {
    return { kind: "rejected", path: "/state" };
  }
  if (record.protection === "device" && record.state !== "unlocked") {
    return { kind: "rejected", path: "/state" };
  }
  if (
    !Array.isArray(record.bindings) || record.bindings.length > credentialVaultMaximumBindingsV2
  ) {
    return { kind: "rejected", path: "/bindings" };
  }
  const bindings: CredentialVaultBindingV2[] = [];
  let previousStorageKey: string | null = null;
  for (let index = 0; index < record.bindings.length; index += 1) {
    const admitted = admitCredentialVaultBindingV2(record.bindings[index]);
    if (admitted.kind === "rejected") {
      return { kind: "rejected", path: `/bindings/${String(index)}${admitted.path}` };
    }
    const storageKey = credentialVaultBindingStorageKeyV2(admitted.value);
    if (previousStorageKey !== null && storageKey <= previousStorageKey) {
      return { kind: "rejected", path: `/bindings/${String(index)}` };
    }
    bindings.push(admitted.value);
    previousStorageKey = storageKey;
  }
  return {
    kind: "admitted",
    value: {
      revision: 2,
      protection: record.protection,
      state: record.state,
      bindings,
    },
  };
}

export function createCredentialVaultListV2(
  protection: CredentialVaultProtectionV2,
  state: CredentialVaultStateV2,
  bindings: readonly CredentialVaultBindingV2[],
): CredentialVaultListV2 {
  const admitted = admitCredentialVaultListV2({
    revision: 2,
    protection,
    state,
    bindings: bindings.toSorted(compareCredentialVaultBindingsV2),
  });
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.list_invalid${admitted.path}`);
  }
  return Object.freeze({
    ...admitted.value,
    bindings: Object.freeze(admitted.value.bindings.map((binding) => Object.freeze(binding))),
  });
}
