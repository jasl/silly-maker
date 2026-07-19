// SPDX-License-Identifier: MIT
import {
  ContentMaturityDuplicateIdError,
  PresentationDataError,
  deepFreezeData,
  parseAt,
  readArray,
  readExactRecord,
} from "./presentation-data.js";
import type {
  ContentMaturityFlagBitV1,
  ContentMaturityFlagId,
  ContentMaturityFlagsV1,
  ContentPreferencePresetId,
  TextId,
} from "./presentation-ids.js";
import {
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagId,
  parseContentMaturityFlagsV1,
  parseContentPreferencePresetId,
  parseTextId,
} from "./presentation-ids.js";
import type { DeepReadonly, PositiveSafeInteger } from "./values.js";
import { parsePositiveSafeInteger } from "./values.js";

export interface ContentMaturityFlagDescriptorV1 {
  readonly id: ContentMaturityFlagId;
  readonly flag: ContentMaturityFlagBitV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

export interface ContentPreferencePresetDescriptorV1 {
  readonly presetId: ContentPreferencePresetId;
  readonly allowedFlags: ContentMaturityFlagsV1;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId;
}

export interface ContentMaturityPolicyV1 {
  readonly policyRevision: PositiveSafeInteger;
  readonly flags: readonly ContentMaturityFlagDescriptorV1[];
  readonly presets: readonly ContentPreferencePresetDescriptorV1[];
  readonly defaultAllowedFlags: ContentMaturityFlagsV1;
}

export interface ContentRequirementV1 {
  readonly requiredFlags: ContentMaturityFlagsV1;
}

export interface ContentPreferenceV1 {
  readonly allowedFlags: ContentMaturityFlagsV1;
}

export type ContentPreferenceSetResultV1 =
  | { readonly kind: "updated"; readonly preference: DeepReadonly<ContentPreferenceV1> }
  | { readonly kind: "rejected"; readonly code: "content_maturity.invalid_preference" }
  | { readonly kind: "rejected"; readonly code: "content_maturity.unknown_flags" }
  | { readonly kind: "failed"; readonly code: "content_preference.storage_failed" };

export interface ContentPreferencePortV1 {
  observe(): DeepReadonly<ContentPreferenceV1>;
  subscribe(listener: () => void): () => void;
  set(preference: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1>;
}
function parseContentMaturityPolicyData(value: unknown): ContentMaturityPolicyV1 {
  const record = readExactRecord(
    value,
    ["policyRevision", "flags", "presets", "defaultAllowedFlags"],
    "/",
  );
  const policyRevision = parseAt(
    parsePositiveSafeInteger,
    record.policyRevision,
    "/policyRevision",
    "positive_safe_integer_expected",
  );
  const flagIds = new Set<string>();
  const flagBits = new Set<number>();
  const flags = readArray(record.flags, "/flags").map((entry, index) => {
    const path = `/flags/${index}`;
    const flag = readExactRecord(entry, ["id", "flag", "nameTextId", "descriptionTextId"], path);
    const parsed = {
      id: parseAt(parseContentMaturityFlagId, flag.id, `${path}/id`, "invalid_id"),
      flag: parseContentMaturityFlagBitV1(flag.flag),
      nameTextId: parseAt(parseTextId, flag.nameTextId, `${path}/nameTextId`, "invalid_id"),
      descriptionTextId: parseAt(
        parseTextId,
        flag.descriptionTextId,
        `${path}/descriptionTextId`,
        "invalid_id",
      ),
    } satisfies ContentMaturityFlagDescriptorV1;
    if (flagIds.has(parsed.id)) {
      throw new ContentMaturityDuplicateIdError(`${path}/id`, parsed.id);
    }
    if (flagBits.has(parsed.flag)) {
      throw new TypeError("content_maturity.duplicate");
    }
    flagIds.add(parsed.id);
    flagBits.add(parsed.flag);
    return parsed;
  });
  const knownFlags = flags.reduce((mask, entry) => (mask | entry.flag) >>> 0, 0);
  const presetIds = new Set<string>();
  const presetMasks = new Set<number>();
  const presets = readArray(record.presets, "/presets").map((entry, index) => {
    const path = `/presets/${index}`;
    const preset = readExactRecord(
      entry,
      ["presetId", "allowedFlags", "nameTextId", "descriptionTextId"],
      path,
    );
    const parsed = {
      presetId: parseAt(
        parseContentPreferencePresetId,
        preset.presetId,
        `${path}/presetId`,
        "invalid_id",
      ),
      allowedFlags: parseContentMaturityFlagsV1(preset.allowedFlags),
      nameTextId: parseAt(parseTextId, preset.nameTextId, `${path}/nameTextId`, "invalid_id"),
      descriptionTextId: parseAt(
        parseTextId,
        preset.descriptionTextId,
        `${path}/descriptionTextId`,
        "invalid_id",
      ),
    } satisfies ContentPreferencePresetDescriptorV1;
    if (presetIds.has(parsed.presetId)) {
      throw new ContentMaturityDuplicateIdError(`${path}/presetId`, parsed.presetId);
    }
    if (presetMasks.has(parsed.allowedFlags)) {
      throw new TypeError("content_maturity.duplicate");
    }
    if ((parsed.allowedFlags & ~knownFlags) >>> 0 !== 0) {
      throw new TypeError("content_maturity.preset");
    }
    presetIds.add(parsed.presetId);
    presetMasks.add(parsed.allowedFlags);
    return parsed;
  });
  const defaultAllowedFlags = parseContentMaturityFlagsV1(record.defaultAllowedFlags);
  if ((defaultAllowedFlags & ~knownFlags) >>> 0 !== 0) {
    throw new TypeError("content_maturity.unknown_flags");
  }
  return {
    policyRevision,
    flags,
    presets,
    defaultAllowedFlags,
  };
}

export function parseContentMaturityPolicyV1(value: unknown): ContentMaturityPolicyV1 {
  try {
    return deepFreezeData(parseContentMaturityPolicyData(value));
  } catch (error) {
    if (error instanceof PresentationDataError) {
      throw new TypeError(`content_maturity.policy at ${error.path}`, { cause: error });
    }
    throw error;
  }
}

export function parseContentPreferenceV1(value: unknown): ContentPreferenceV1 {
  try {
    const record = readExactRecord(value, ["allowedFlags"], "/");
    return Object.freeze({
      allowedFlags: parseContentMaturityFlagsV1(record.allowedFlags),
    });
  } catch (error) {
    if (error instanceof PresentationDataError) {
      throw new TypeError(`content_maturity.preference at ${error.path}`, { cause: error });
    }
    throw error;
  }
}

export function combineContentMaturityFlagsV1(
  ...values: readonly ContentMaturityFlagsV1[]
): ContentMaturityFlagsV1 {
  return values.reduce(
    (combined, value) => (combined | parseContentMaturityFlagsV1(value)) >>> 0,
    0,
  ) as ContentMaturityFlagsV1;
}

export function setContentMaturityFlagV1(
  flags: ContentMaturityFlagsV1,
  flag: ContentMaturityFlagBitV1,
  enabled: boolean,
): ContentMaturityFlagsV1 {
  const parsedFlags = parseContentMaturityFlagsV1(flags);
  const parsedFlag = parseContentMaturityFlagBitV1(flag);
  return ((enabled ? parsedFlags | parsedFlag : parsedFlags & ~parsedFlag) >>>
    0) as ContentMaturityFlagsV1;
}

export function findUnknownContentMaturityFlagsV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  flags: ContentMaturityFlagsV1,
): ContentMaturityFlagsV1 {
  const knownFlags = policy.flags.reduce(
    (combined, entry) => (combined | parseContentMaturityFlagBitV1(entry.flag)) >>> 0,
    0,
  );
  return ((parseContentMaturityFlagsV1(flags) & ~knownFlags) >>> 0) as ContentMaturityFlagsV1;
}

export function isContentRequirementAllowedV1(
  requiredFlags: ContentMaturityFlagsV1,
  allowedFlags: ContentMaturityFlagsV1,
): boolean {
  const required = parseContentMaturityFlagsV1(requiredFlags);
  const allowed = parseContentMaturityFlagsV1(allowedFlags);
  return (required & allowed) >>> 0 === required;
}

export function requireContentPreferencePresetV1(
  policy: DeepReadonly<ContentMaturityPolicyV1>,
  presetId: ContentPreferencePresetId,
): DeepReadonly<ContentPreferencePresetDescriptorV1> {
  const parsedPresetId = parseContentPreferencePresetId(presetId);
  const preset = policy.presets.find((entry) => entry.presetId === parsedPresetId);
  if (preset === undefined) throw new TypeError("content_maturity.preset_not_found");
  return preset;
}
