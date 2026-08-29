// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export const credentialVaultRevisionV1 = 1 as const;
export const credentialVaultKdfIterationsV1 = 600_000;
export const credentialVaultMaximumBindingsV1 = 32;
export const credentialVaultPassphraseMaximumUtf8BytesV1 = 4 * 1024;
export const credentialVaultApiKeyMaximumUtf8BytesV1 = 64 * 1024;
export const credentialVaultBindingIdMaximumUtf8BytesV1 = 256;
export const credentialVaultBaseUrlMaximumUtf8BytesV1 = 2_048;

const bindingIdPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/u;

export type CredentialVaultCredentialKindV1 = "api_key";

/**
 * Non-secret identity shown by Vault list operations. The complete canonical
 * base URL is part of the identity; changing it is never an implicit rebind.
 */
export interface CredentialVaultBindingV1 {
  readonly bindingId: string;
  readonly credentialKind: CredentialVaultCredentialKindV1;
  readonly baseUrl: string;
}

export type CredentialVaultStateV1 = "absent" | "locked" | "unlocked";

export interface CredentialVaultListV1 {
  readonly revision: 1;
  readonly state: CredentialVaultStateV1;
  readonly bindings: readonly CredentialVaultBindingV1[];
}

export type CredentialVaultAdmissionV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: string };

type ExactRecordV1 = Readonly<Record<string, unknown>>;

export function credentialVaultExactRecordV1(
  value: unknown,
  keys: readonly string[],
): ExactRecordV1 | null {
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

export function credentialVaultUtf8ByteLengthV1(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function isCredentialVaultBoundedTextV1(
  value: unknown,
  maximumUtf8Bytes: number,
): value is string {
  return typeof value === "string" && value.length > 0 &&
    credentialVaultUtf8ByteLengthV1(value) <= maximumUtf8Bytes;
}

/** Canonical complete HTTPS endpoint used by both storage identity and AAD. */
export function canonicalizeCredentialVaultBaseUrlV1(value: unknown): string | null {
  if (
    !isCredentialVaultBoundedTextV1(value, credentialVaultBaseUrlMaximumUtf8BytesV1) ||
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
  return credentialVaultUtf8ByteLengthV1(canonical) <=
      credentialVaultBaseUrlMaximumUtf8BytesV1
    ? canonical
    : null;
}

export function admitCredentialVaultBindingV1(
  value: unknown,
): CredentialVaultAdmissionV1<CredentialVaultBindingV1> {
  const record = credentialVaultExactRecordV1(value, [
    "bindingId",
    "credentialKind",
    "baseUrl",
  ]);
  if (record === null) return { kind: "rejected", path: "/" };
  if (
    !isCredentialVaultBoundedTextV1(
      record.bindingId,
      credentialVaultBindingIdMaximumUtf8BytesV1,
    ) || !bindingIdPatternV1.test(record.bindingId)
  ) return { kind: "rejected", path: "/bindingId" };
  if (record.credentialKind !== "api_key") {
    return { kind: "rejected", path: "/credentialKind" };
  }
  const baseUrl = canonicalizeCredentialVaultBaseUrlV1(record.baseUrl);
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

export function normalizeCredentialVaultBindingV1(
  value: CredentialVaultBindingV1,
): CredentialVaultBindingV1 {
  const admitted = admitCredentialVaultBindingV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.binding_invalid${admitted.path}`);
  }
  return Object.freeze(admitted.value);
}

export function credentialVaultBindingsEqualV1(
  left: CredentialVaultBindingV1,
  right: CredentialVaultBindingV1,
): boolean {
  return left.bindingId === right.bindingId && left.credentialKind === right.credentialKind &&
    left.baseUrl === right.baseUrl;
}

export function compareCredentialVaultBindingsV1(
  left: CredentialVaultBindingV1,
  right: CredentialVaultBindingV1,
): number {
  return left.bindingId < right.bindingId ? -1 : left.bindingId > right.bindingId ? 1 : 0;
}

export function admitCredentialVaultListV1(
  value: unknown,
): CredentialVaultAdmissionV1<CredentialVaultListV1> {
  const record = credentialVaultExactRecordV1(value, ["revision", "state", "bindings"]);
  if (record === null) return { kind: "rejected", path: "/" };
  if (record.revision !== credentialVaultRevisionV1) {
    return { kind: "rejected", path: "/revision" };
  }
  if (record.state !== "absent" && record.state !== "locked" && record.state !== "unlocked") {
    return { kind: "rejected", path: "/state" };
  }
  if (
    !Array.isArray(record.bindings) ||
    record.bindings.length > credentialVaultMaximumBindingsV1
  ) return { kind: "rejected", path: "/bindings" };
  const bindings: CredentialVaultBindingV1[] = [];
  let previousBindingId: string | null = null;
  for (let index = 0; index < record.bindings.length; index += 1) {
    const admitted = admitCredentialVaultBindingV1(record.bindings[index]);
    if (admitted.kind === "rejected") {
      return { kind: "rejected", path: `/bindings/${String(index)}${admitted.path}` };
    }
    if (previousBindingId !== null && admitted.value.bindingId <= previousBindingId) {
      return { kind: "rejected", path: `/bindings/${String(index)}` };
    }
    bindings.push(admitted.value);
    previousBindingId = admitted.value.bindingId;
  }
  if (record.state === "absent" && bindings.length !== 0) {
    return { kind: "rejected", path: "/bindings" };
  }
  return {
    kind: "admitted",
    value: { revision: 1, state: record.state, bindings },
  };
}

export function createCredentialVaultListV1(
  state: CredentialVaultStateV1,
  bindings: readonly CredentialVaultBindingV1[],
): CredentialVaultListV1 {
  const admitted = admitCredentialVaultListV1({
    revision: 1,
    state,
    bindings: bindings.toSorted(compareCredentialVaultBindingsV1),
  });
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.list_invalid${admitted.path}`);
  }
  return Object.freeze({
    ...admitted.value,
    bindings: Object.freeze(admitted.value.bindings.map((binding) => Object.freeze(binding))),
  });
}
