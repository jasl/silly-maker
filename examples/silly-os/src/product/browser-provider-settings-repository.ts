// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export const browserProviderSettingsStorageKeyV1 =
  "sillymaker.example-silly-os.provider-settings.v1";
export const browserProviderSettingsRevisionV1 = 1 as const;
export const browserProviderSettingsMaximumProfilesV1 = 16;
export const browserProviderSettingsMaximumSerializedUtf8BytesV1 = 65_536;
export const browserProviderProfileIdMaximumUtf8BytesV1 = 64;
export const browserProviderDisplayNameMaximumUtf8BytesV1 = 128;
export const browserProviderBaseUrlMaximumUtf8BytesV1 = 2_048;
export const browserProviderModelIdMaximumUtf8BytesV1 = 256;
export const browserProviderContextWindowMaximumV1 = 32_000_000;
export const browserProviderMaxTokensMaximumV1 = 4_000_000;

export const browserProviderCustomApiFamiliesV1 = Object.freeze(
  [
    "openai-completions",
    "openai-responses",
    "anthropic-messages",
    "google-generative-ai",
  ] as const,
);

export type BrowserProviderCustomApiFamilyV1 = (typeof browserProviderCustomApiFamiliesV1)[number];

/** The complete non-secret custom Provider record admitted by SillyOS. */
export interface BrowserProviderCustomProfileV1 {
  readonly profileId: string;
  readonly displayName: string;
  readonly api: BrowserProviderCustomApiFamilyV1;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
}

export interface BrowserProviderSettingsSnapshotV1 {
  readonly revision: 1;
  readonly customProfiles: readonly BrowserProviderCustomProfileV1[];
}

export type BrowserProviderCustomProfileAdmissionV1 =
  | { readonly kind: "admitted"; readonly value: BrowserProviderCustomProfileV1 }
  | { readonly kind: "rejected"; readonly path: string };

export type BrowserProviderSettingsRepositoryOperationV1 = "list" | "add" | "remove";

export type BrowserProviderSettingsRepositoryFailureCodeV1 =
  | "invalid_profile"
  | "profile_exists"
  | "profile_limit"
  | "schema_invalid"
  | "storage_unavailable";

export class BrowserProviderSettingsRepositoryErrorV1 extends Error {
  readonly code: BrowserProviderSettingsRepositoryFailureCodeV1;
  readonly operation: BrowserProviderSettingsRepositoryOperationV1;

  constructor(
    code: BrowserProviderSettingsRepositoryFailureCodeV1,
    operation: BrowserProviderSettingsRepositoryOperationV1,
  ) {
    super(`Browser Provider Settings repository ${operation} failed: ${code}`);
    this.name = "BrowserProviderSettingsRepositoryErrorV1";
    this.code = code;
    this.operation = operation;
  }
}

export interface BrowserProviderSettingsRepositoryV1 {
  list(): readonly BrowserProviderCustomProfileV1[];
  add(value: unknown): BrowserProviderCustomProfileV1;
  remove(profileId: string): boolean;
}

interface ExactRecordV1 {
  readonly [key: string]: unknown;
}

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Object.keys(descriptors);
    if (
      actualKeys.length !== keys.length ||
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

function exactArrayV1(value: unknown, maximumLength: number): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length > maximumLength) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== value.length + 1 ||
      !Object.hasOwn(descriptors, "length")
    ) return null;
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
  }
}

function utf8ByteLengthV1(value: string): number | null {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
      continue;
    }
    if (codeUnit <= 0x7ff) {
      byteLength += 2;
      continue;
    }
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return null;
      byteLength += 4;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return null;
    byteLength += 3;
  }
  return byteLength;
}

function hasAsciiControlCharacterV1(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
}

function isBoundedTextV1(
  value: unknown,
  maximumUtf8Bytes: number,
  allowOuterWhitespace: boolean,
): value is string {
  if (
    typeof value !== "string" || value.trim().length === 0 ||
    (!allowOuterWhitespace && value !== value.trim()) || hasAsciiControlCharacterV1(value)
  ) return false;
  const byteLength = utf8ByteLengthV1(value);
  return byteLength !== null && byteLength <= maximumUtf8Bytes;
}

function isProfileIdV1(value: unknown): value is string {
  return isBoundedTextV1(value, browserProviderProfileIdMaximumUtf8BytesV1, false) &&
    /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(value);
}

function isCustomApiFamilyV1(value: unknown): value is BrowserProviderCustomApiFamilyV1 {
  return typeof value === "string" &&
    browserProviderCustomApiFamiliesV1.includes(value as BrowserProviderCustomApiFamilyV1);
}

function isBoundedPositiveIntegerV1(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 &&
    value <= maximum;
}

/**
 * Returns the stable HTTPS base URL persisted by Settings. Protocol selection
 * remains explicit in `api`; this function never infers it from the URL.
 */
export function canonicalizeBrowserProviderBaseUrlV1(value: unknown): string | null {
  if (
    !isBoundedTextV1(value, browserProviderBaseUrlMaximumUtf8BytesV1, false) ||
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

  const authorityEnd = value.slice("https://".length).search(/[/?#]/);
  const authority = authorityEnd === -1
    ? value.slice("https://".length)
    : value.slice("https://".length, "https://".length + authorityEnd);
  if (authority.includes("@")) return null;

  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/u, "");
  const canonical = `${url.origin}${path}`;
  const byteLength = utf8ByteLengthV1(canonical);
  return byteLength !== null && byteLength <= browserProviderBaseUrlMaximumUtf8BytesV1
    ? canonical
    : null;
}

function freezeProfileV1(
  profile: BrowserProviderCustomProfileV1,
): BrowserProviderCustomProfileV1 {
  return Object.freeze({ ...profile });
}

function normalizeCustomProfileV1(
  value: unknown,
  requireCanonicalFields: boolean,
): BrowserProviderCustomProfileAdmissionV1 {
  const profile = exactRecordV1(value, [
    "profileId",
    "displayName",
    "api",
    "baseUrl",
    "modelId",
    "contextWindow",
    "maxTokens",
  ]);
  if (profile === null) return { kind: "rejected", path: "$" };
  if (!isProfileIdV1(profile.profileId)) {
    return { kind: "rejected", path: "$.profileId" };
  }
  if (
    !isBoundedTextV1(
      profile.displayName,
      browserProviderDisplayNameMaximumUtf8BytesV1,
      true,
    ) ||
    (requireCanonicalFields && profile.displayName !== profile.displayName.trim())
  ) return { kind: "rejected", path: "$.displayName" };
  if (!isCustomApiFamilyV1(profile.api)) return { kind: "rejected", path: "$.api" };
  const baseUrl = canonicalizeBrowserProviderBaseUrlV1(profile.baseUrl);
  if (
    baseUrl === null ||
    (requireCanonicalFields && profile.baseUrl !== baseUrl)
  ) return { kind: "rejected", path: "$.baseUrl" };
  if (!isBoundedTextV1(profile.modelId, browserProviderModelIdMaximumUtf8BytesV1, false)) {
    return { kind: "rejected", path: "$.modelId" };
  }
  if (
    !isBoundedPositiveIntegerV1(
      profile.contextWindow,
      browserProviderContextWindowMaximumV1,
    )
  ) return { kind: "rejected", path: "$.contextWindow" };
  if (
    !isBoundedPositiveIntegerV1(profile.maxTokens, browserProviderMaxTokensMaximumV1) ||
    profile.maxTokens > profile.contextWindow
  ) return { kind: "rejected", path: "$.maxTokens" };

  return {
    kind: "admitted",
    value: freezeProfileV1({
      profileId: profile.profileId,
      displayName: profile.displayName.trim(),
      api: profile.api,
      baseUrl,
      modelId: profile.modelId,
      contextWindow: profile.contextWindow,
      maxTokens: profile.maxTokens,
    }),
  };
}

/** Strictly admits the complete public add input and drops no unknown fields. */
export function admitBrowserProviderCustomProfileV1(
  value: unknown,
): BrowserProviderCustomProfileAdmissionV1 {
  return normalizeCustomProfileV1(value, false);
}

function admitStoredSettingsV1(value: unknown): BrowserProviderSettingsSnapshotV1 | null {
  const settings = exactRecordV1(value, ["revision", "customProfiles"]);
  if (settings === null || settings.revision !== browserProviderSettingsRevisionV1) return null;
  const rawProfiles = exactArrayV1(
    settings.customProfiles,
    browserProviderSettingsMaximumProfilesV1,
  );
  if (rawProfiles === null) return null;

  const customProfiles: BrowserProviderCustomProfileV1[] = [];
  const ids = new Set<string>();
  let previousProfileId: string | null = null;
  for (const rawProfile of rawProfiles) {
    const admitted = normalizeCustomProfileV1(rawProfile, true);
    if (admitted.kind !== "admitted") return null;
    if (
      ids.has(admitted.value.profileId) ||
      (previousProfileId !== null && previousProfileId.localeCompare(admitted.value.profileId) >= 0)
    ) return null;
    ids.add(admitted.value.profileId);
    previousProfileId = admitted.value.profileId;
    customProfiles.push(admitted.value);
  }
  return Object.freeze({
    revision: browserProviderSettingsRevisionV1,
    customProfiles: Object.freeze(customProfiles),
  });
}

function cloneProfilesV1(
  profiles: readonly BrowserProviderCustomProfileV1[],
): readonly BrowserProviderCustomProfileV1[] {
  return Object.freeze(profiles.map(freezeProfileV1));
}

function emptySettingsV1(): BrowserProviderSettingsSnapshotV1 {
  return Object.freeze({
    revision: browserProviderSettingsRevisionV1,
    customProfiles: Object.freeze([]),
  });
}

function storageFailureV1(
  operation: BrowserProviderSettingsRepositoryOperationV1,
): BrowserProviderSettingsRepositoryErrorV1 {
  return new BrowserProviderSettingsRepositoryErrorV1("storage_unavailable", operation);
}

export function createBrowserProviderSettingsRepositoryV1(input: {
  readonly storage: Storage;
  readonly storageKey?: string;
}): BrowserProviderSettingsRepositoryV1 {
  const storageKey = input.storageKey ?? browserProviderSettingsStorageKeyV1;

  const loadV1 = (
    operation: BrowserProviderSettingsRepositoryOperationV1,
  ): BrowserProviderSettingsSnapshotV1 => {
    let serialized: string | null;
    try {
      serialized = input.storage.getItem(storageKey);
    } catch {
      throw storageFailureV1(operation);
    }
    if (serialized === null) return emptySettingsV1();
    const byteLength = utf8ByteLengthV1(serialized);
    if (
      byteLength === null ||
      byteLength > browserProviderSettingsMaximumSerializedUtf8BytesV1
    ) {
      throw new BrowserProviderSettingsRepositoryErrorV1("schema_invalid", operation);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      throw new BrowserProviderSettingsRepositoryErrorV1("schema_invalid", operation);
    }
    const admitted = admitStoredSettingsV1(parsed);
    if (admitted === null) {
      throw new BrowserProviderSettingsRepositoryErrorV1("schema_invalid", operation);
    }
    return admitted;
  };

  const persistV1 = (
    settings: BrowserProviderSettingsSnapshotV1,
    operation: BrowserProviderSettingsRepositoryOperationV1,
  ): void => {
    const serialized = JSON.stringify(settings);
    const byteLength = utf8ByteLengthV1(serialized);
    if (
      byteLength === null ||
      byteLength > browserProviderSettingsMaximumSerializedUtf8BytesV1
    ) {
      throw new BrowserProviderSettingsRepositoryErrorV1("schema_invalid", operation);
    }
    try {
      if (settings.customProfiles.length === 0) input.storage.removeItem(storageKey);
      else input.storage.setItem(storageKey, serialized);
    } catch {
      throw storageFailureV1(operation);
    }
  };

  return Object.freeze({
    list(): readonly BrowserProviderCustomProfileV1[] {
      return cloneProfilesV1(loadV1("list").customProfiles);
    },

    add(value: unknown): BrowserProviderCustomProfileV1 {
      const admitted = admitBrowserProviderCustomProfileV1(value);
      if (admitted.kind !== "admitted") {
        throw new BrowserProviderSettingsRepositoryErrorV1("invalid_profile", "add");
      }
      const current = loadV1("add");
      if (current.customProfiles.some(({ profileId }) => profileId === admitted.value.profileId)) {
        throw new BrowserProviderSettingsRepositoryErrorV1("profile_exists", "add");
      }
      if (current.customProfiles.length >= browserProviderSettingsMaximumProfilesV1) {
        throw new BrowserProviderSettingsRepositoryErrorV1("profile_limit", "add");
      }
      const customProfiles = [...current.customProfiles, admitted.value].sort((left, right) =>
        left.profileId < right.profileId ? -1 : left.profileId > right.profileId ? 1 : 0
      );
      persistV1(
        {
          revision: browserProviderSettingsRevisionV1,
          customProfiles,
        },
        "add",
      );
      return freezeProfileV1(admitted.value);
    },

    remove(profileId: string): boolean {
      if (!isProfileIdV1(profileId)) {
        throw new BrowserProviderSettingsRepositoryErrorV1("invalid_profile", "remove");
      }
      const current = loadV1("remove");
      const customProfiles = current.customProfiles.filter((profile) =>
        profile.profileId !== profileId
      );
      if (customProfiles.length === current.customProfiles.length) return false;
      persistV1(
        {
          revision: browserProviderSettingsRevisionV1,
          customProfiles,
        },
        "remove",
      );
      return true;
    },
  });
}
