// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export const browserProviderSettingsStorageKeyV2 =
  "sillymaker.example-silly-os.provider-settings.v2";
export const browserProviderSettingsRevisionV2 = 2 as const;
export const browserProviderSettingsMaximumProfilesV1 = 16;
export const browserProviderSettingsMaximumBuiltinModelsV1 = 256;
export const browserProviderSettingsMaximumSerializedUtf8BytesV1 = 65_536;
export const browserProviderProfileIdMaximumUtf8BytesV1 = 64;
export const browserProviderIdMaximumUtf8BytesV1 = 128;
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

export interface BrowserProviderBuiltinModelRefV1 {
  readonly providerId: string;
  readonly modelId: string;
}

export type BrowserProviderPreferredModelRefV1 =
  | {
    readonly kind: "builtin";
    readonly providerId: string;
    readonly modelId: string;
  }
  | {
    readonly kind: "custom";
    readonly profileId: string;
  };

export interface BrowserProviderSettingsSnapshotV1 {
  readonly revision: 2;
  readonly customProfiles: readonly BrowserProviderCustomProfileV1[];
  readonly enabledBuiltinModels: readonly BrowserProviderBuiltinModelRefV1[];
  readonly preferredModel: BrowserProviderPreferredModelRefV1 | null;
}

export interface BrowserProviderBuiltinModelDefaultsInitializationV1 {
  readonly initialized: boolean;
  readonly snapshot: BrowserProviderSettingsSnapshotV1;
}

export type BrowserProviderCustomProfileAdmissionV1 =
  | { readonly kind: "admitted"; readonly value: BrowserProviderCustomProfileV1 }
  | { readonly kind: "rejected"; readonly path: string };

export type BrowserProviderSettingsRepositoryOperationV1 =
  | "read"
  | "list"
  | "add"
  | "remove"
  | "initialize_builtin_model_defaults"
  | "set_builtin_model_enabled"
  | "set_preferred_model";

export type BrowserProviderSettingsRepositoryFailureCodeV1 =
  | "invalid_profile"
  | "invalid_model_ref"
  | "invalid_preferred_model"
  | "profile_exists"
  | "profile_limit"
  | "model_limit"
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
  read(): BrowserProviderSettingsSnapshotV1;
  list(): readonly BrowserProviderCustomProfileV1[];
  initializeBuiltinModelDefaults(
    value: unknown,
  ): BrowserProviderBuiltinModelDefaultsInitializationV1;
  add(value: unknown): BrowserProviderCustomProfileV1;
  remove(profileId: string): boolean;
  setBuiltinModelEnabled(value: unknown, enabled: boolean): boolean;
  setPreferredModel(value: unknown): BrowserProviderPreferredModelRefV1 | null;
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

function isProviderIdV1(value: unknown): value is string {
  return isBoundedTextV1(value, browserProviderIdMaximumUtf8BytesV1, false);
}

function isModelIdV1(value: unknown): value is string {
  return isBoundedTextV1(value, browserProviderModelIdMaximumUtf8BytesV1, false);
}

function compareBuiltinModelRefsV1(
  left: BrowserProviderBuiltinModelRefV1,
  right: BrowserProviderBuiltinModelRefV1,
): number {
  if (left.providerId !== right.providerId) return left.providerId < right.providerId ? -1 : 1;
  return left.modelId < right.modelId ? -1 : left.modelId > right.modelId ? 1 : 0;
}

function builtinModelRefsEqualV1(
  left: BrowserProviderBuiltinModelRefV1,
  right: BrowserProviderBuiltinModelRefV1,
): boolean {
  return left.providerId === right.providerId && left.modelId === right.modelId;
}

function preferredModelRefsEqualV1(
  left: BrowserProviderPreferredModelRefV1 | null,
  right: BrowserProviderPreferredModelRefV1 | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind) return false;
  return left.kind === "builtin" && right.kind === "builtin"
    ? left.providerId === right.providerId && left.modelId === right.modelId
    : left.kind === "custom" && right.kind === "custom" && left.profileId === right.profileId;
}

function normalizeBuiltinModelRefV1(value: unknown): BrowserProviderBuiltinModelRefV1 | null {
  const ref = exactRecordV1(value, ["providerId", "modelId"]);
  if (ref === null || !isProviderIdV1(ref.providerId) || !isModelIdV1(ref.modelId)) return null;
  return Object.freeze({ providerId: ref.providerId, modelId: ref.modelId });
}

function normalizePreferredModelRefV1(value: unknown): BrowserProviderPreferredModelRefV1 | null {
  const discriminator = exactRecordV1(value, ["kind", "providerId", "modelId"]) ??
    exactRecordV1(value, ["kind", "profileId"]);
  if (discriminator === null) return null;
  if (discriminator.kind === "builtin") {
    const builtin = normalizeBuiltinModelRefV1({
      providerId: discriminator.providerId,
      modelId: discriminator.modelId,
    });
    return builtin === null ? null : Object.freeze({ kind: "builtin", ...builtin });
  }
  if (discriminator.kind === "custom" && isProfileIdV1(discriminator.profileId)) {
    return Object.freeze({ kind: "custom", profileId: discriminator.profileId });
  }
  return null;
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

function freezeBuiltinModelRefV1(
  ref: BrowserProviderBuiltinModelRefV1,
): BrowserProviderBuiltinModelRefV1 {
  return Object.freeze({ ...ref });
}

function freezePreferredModelRefV1(
  ref: BrowserProviderPreferredModelRefV1 | null,
): BrowserProviderPreferredModelRefV1 | null {
  return ref === null ? null : Object.freeze({ ...ref });
}

function freezeSettingsV1(
  settings: BrowserProviderSettingsSnapshotV1,
): BrowserProviderSettingsSnapshotV1 {
  return Object.freeze({
    revision: browserProviderSettingsRevisionV2,
    customProfiles: Object.freeze(settings.customProfiles.map(freezeProfileV1)),
    enabledBuiltinModels: Object.freeze(
      settings.enabledBuiltinModels.map(freezeBuiltinModelRefV1),
    ),
    preferredModel: freezePreferredModelRefV1(settings.preferredModel),
  });
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
  const settings = exactRecordV1(value, [
    "revision",
    "customProfiles",
    "enabledBuiltinModels",
    "preferredModel",
  ]);
  if (settings === null || settings.revision !== browserProviderSettingsRevisionV2) return null;
  const rawProfiles = exactArrayV1(
    settings.customProfiles,
    browserProviderSettingsMaximumProfilesV1,
  );
  const rawBuiltinModels = exactArrayV1(
    settings.enabledBuiltinModels,
    browserProviderSettingsMaximumBuiltinModelsV1,
  );
  if (rawProfiles === null || rawBuiltinModels === null) return null;

  const customProfiles: BrowserProviderCustomProfileV1[] = [];
  const profileIds = new Set<string>();
  let previousProfileId: string | null = null;
  for (const rawProfile of rawProfiles) {
    const admitted = normalizeCustomProfileV1(rawProfile, true);
    if (admitted.kind !== "admitted") return null;
    if (
      profileIds.has(admitted.value.profileId) ||
      (previousProfileId !== null && previousProfileId >= admitted.value.profileId)
    ) return null;
    profileIds.add(admitted.value.profileId);
    previousProfileId = admitted.value.profileId;
    customProfiles.push(admitted.value);
  }

  const enabledBuiltinModels: BrowserProviderBuiltinModelRefV1[] = [];
  let previousBuiltinModel: BrowserProviderBuiltinModelRefV1 | null = null;
  for (const rawBuiltinModel of rawBuiltinModels) {
    const admitted = normalizeBuiltinModelRefV1(rawBuiltinModel);
    if (
      admitted === null ||
      (previousBuiltinModel !== null &&
        compareBuiltinModelRefsV1(previousBuiltinModel, admitted) >= 0)
    ) return null;
    previousBuiltinModel = admitted;
    enabledBuiltinModels.push(admitted);
  }

  let preferredModel: BrowserProviderPreferredModelRefV1 | null = null;
  if (settings.preferredModel !== null) {
    const admittedPreferredModel = normalizePreferredModelRefV1(settings.preferredModel);
    if (admittedPreferredModel === null) return null;
    preferredModel = admittedPreferredModel;
    if (
      admittedPreferredModel.kind === "builtin" &&
      !enabledBuiltinModels.some((model) => builtinModelRefsEqualV1(model, admittedPreferredModel))
    ) return null;
    if (
      admittedPreferredModel.kind === "custom" &&
      !profileIds.has(admittedPreferredModel.profileId)
    ) return null;
  }

  return freezeSettingsV1({
    revision: browserProviderSettingsRevisionV2,
    customProfiles,
    enabledBuiltinModels,
    preferredModel,
  });
}

function cloneProfilesV1(
  profiles: readonly BrowserProviderCustomProfileV1[],
): readonly BrowserProviderCustomProfileV1[] {
  return Object.freeze(profiles.map(freezeProfileV1));
}

function emptySettingsV1(): BrowserProviderSettingsSnapshotV1 {
  return freezeSettingsV1({
    revision: browserProviderSettingsRevisionV2,
    customProfiles: [],
    enabledBuiltinModels: [],
    preferredModel: null,
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
  const storageKey = input.storageKey ?? browserProviderSettingsStorageKeyV2;

  const decodeV1 = (
    serialized: string,
    operation: BrowserProviderSettingsRepositoryOperationV1,
  ): BrowserProviderSettingsSnapshotV1 => {
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
    return decodeV1(serialized, operation);
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
      input.storage.setItem(storageKey, serialized);
    } catch {
      throw storageFailureV1(operation);
    }
  };

  return Object.freeze({
    read(): BrowserProviderSettingsSnapshotV1 {
      return freezeSettingsV1(loadV1("read"));
    },

    list(): readonly BrowserProviderCustomProfileV1[] {
      return cloneProfilesV1(loadV1("list").customProfiles);
    },

    initializeBuiltinModelDefaults(
      value: unknown,
    ): BrowserProviderBuiltinModelDefaultsInitializationV1 {
      const operation = "initialize_builtin_model_defaults";
      let serialized: string | null;
      try {
        serialized = input.storage.getItem(storageKey);
      } catch {
        throw storageFailureV1(operation);
      }
      if (serialized !== null) {
        return Object.freeze({ initialized: false, snapshot: decodeV1(serialized, operation) });
      }

      let exceedsLimit = false;
      try {
        exceedsLimit = Array.isArray(value) &&
          value.length > browserProviderSettingsMaximumBuiltinModelsV1;
      } catch {
        // The strict array admission below reports this as an invalid model ref.
      }
      if (exceedsLimit) {
        throw new BrowserProviderSettingsRepositoryErrorV1("model_limit", operation);
      }
      const rawRefs = exactArrayV1(value, browserProviderSettingsMaximumBuiltinModelsV1);
      if (rawRefs === null) {
        throw new BrowserProviderSettingsRepositoryErrorV1("invalid_model_ref", operation);
      }
      const enabledBuiltinModels: BrowserProviderBuiltinModelRefV1[] = [];
      for (const rawRef of rawRefs) {
        const ref = normalizeBuiltinModelRefV1(rawRef);
        if (ref === null) {
          throw new BrowserProviderSettingsRepositoryErrorV1("invalid_model_ref", operation);
        }
        enabledBuiltinModels.push(ref);
      }
      enabledBuiltinModels.sort(compareBuiltinModelRefsV1);
      for (let index = 1; index < enabledBuiltinModels.length; index += 1) {
        if (
          builtinModelRefsEqualV1(enabledBuiltinModels[index - 1]!, enabledBuiltinModels[index]!)
        ) {
          throw new BrowserProviderSettingsRepositoryErrorV1("invalid_model_ref", operation);
        }
      }
      const snapshot = freezeSettingsV1({
        revision: browserProviderSettingsRevisionV2,
        customProfiles: [],
        enabledBuiltinModels,
        preferredModel: null,
      });
      persistV1(snapshot, operation);
      return Object.freeze({ initialized: true, snapshot });
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
          revision: browserProviderSettingsRevisionV2,
          customProfiles,
          enabledBuiltinModels: current.enabledBuiltinModels,
          preferredModel: current.preferredModel,
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
      const preferredModel = current.preferredModel?.kind === "custom" &&
          current.preferredModel.profileId === profileId
        ? null
        : current.preferredModel;
      persistV1(
        {
          revision: browserProviderSettingsRevisionV2,
          customProfiles,
          enabledBuiltinModels: current.enabledBuiltinModels,
          preferredModel,
        },
        "remove",
      );
      return true;
    },

    setBuiltinModelEnabled(value: unknown, enabled: boolean): boolean {
      const ref = normalizeBuiltinModelRefV1(value);
      if (ref === null || typeof enabled !== "boolean") {
        throw new BrowserProviderSettingsRepositoryErrorV1(
          "invalid_model_ref",
          "set_builtin_model_enabled",
        );
      }
      const current = loadV1("set_builtin_model_enabled");
      const existing = current.enabledBuiltinModels.some((model) =>
        builtinModelRefsEqualV1(model, ref)
      );
      if (existing === enabled) return false;
      if (
        enabled &&
        current.enabledBuiltinModels.length >= browserProviderSettingsMaximumBuiltinModelsV1
      ) {
        throw new BrowserProviderSettingsRepositoryErrorV1(
          "model_limit",
          "set_builtin_model_enabled",
        );
      }
      const enabledBuiltinModels = enabled
        ? [...current.enabledBuiltinModels, ref].sort(compareBuiltinModelRefsV1)
        : current.enabledBuiltinModels.filter((model) => !builtinModelRefsEqualV1(model, ref));
      const preferredModel = !enabled && current.preferredModel?.kind === "builtin" &&
          builtinModelRefsEqualV1(current.preferredModel, ref)
        ? null
        : current.preferredModel;
      persistV1(
        {
          revision: browserProviderSettingsRevisionV2,
          customProfiles: current.customProfiles,
          enabledBuiltinModels,
          preferredModel,
        },
        "set_builtin_model_enabled",
      );
      return true;
    },

    setPreferredModel(value: unknown): BrowserProviderPreferredModelRefV1 | null {
      const preferredModel = value === null ? null : normalizePreferredModelRefV1(value);
      if (value !== null && preferredModel === null) {
        throw new BrowserProviderSettingsRepositoryErrorV1(
          "invalid_preferred_model",
          "set_preferred_model",
        );
      }
      const current = loadV1("set_preferred_model");
      if (
        preferredModel?.kind === "builtin" &&
        !current.enabledBuiltinModels.some((model) =>
          builtinModelRefsEqualV1(model, preferredModel)
        )
      ) {
        throw new BrowserProviderSettingsRepositoryErrorV1(
          "invalid_preferred_model",
          "set_preferred_model",
        );
      }
      if (
        preferredModel?.kind === "custom" &&
        !current.customProfiles.some(({ profileId }) => profileId === preferredModel.profileId)
      ) {
        throw new BrowserProviderSettingsRepositoryErrorV1(
          "invalid_preferred_model",
          "set_preferred_model",
        );
      }
      if (preferredModelRefsEqualV1(current.preferredModel, preferredModel)) {
        return freezePreferredModelRefV1(preferredModel);
      }
      persistV1(
        {
          revision: browserProviderSettingsRevisionV2,
          customProfiles: current.customProfiles,
          enabledBuiltinModels: current.enabledBuiltinModels,
          preferredModel,
        },
        "set_preferred_model",
      );
      return freezePreferredModelRefV1(preferredModel);
    },
  });
}
