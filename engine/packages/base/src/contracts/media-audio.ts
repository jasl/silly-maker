// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";
import type { PositiveSafeInteger } from "./values.ts";
import { parsePositiveSafeInteger } from "./values.ts";

/**
 * Typed audio media contracts. Audio kinds keep their own contract instead
 * of masquerading as images: an audio slot declares semantic identity and a
 * silence fallback; an audio provider entry declares the logical runtime
 * location and media type. Saves and Stage/Audio intents reference stable
 * asset IDs only — never URLs, decoded buffers, or audio nodes.
 */

export type AudioMediaKindV1 = "music" | "ambient" | "sfx" | "voice";

export type AudioMediaTypeV1 = "audio/ogg" | "audio/mpeg" | "audio/wav" | "audio/mp4";

const audioAssetIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseAudioAssetIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !audioAssetIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, "audio_asset_id_invalid");
  }
  return value;
}

export interface AudioAssetSlotV1 {
  readonly assetId: string;
  readonly kind: AudioMediaKindV1;
  /** Audio degrades to silence; missing media never blocks gameplay. */
  readonly fallback: "silence";
  readonly loadGroup: "bootstrap" | "scene" | "on_demand";
}

export interface AudioProviderEntryV1 {
  readonly assetId: string;
  readonly runtimePath: string;
  readonly mediaType: AudioMediaTypeV1;
  readonly durationMs: PositiveSafeInteger | null;
}

export type ResolvedAudioAssetEntryV1 =
  | (AudioAssetSlotV1 & { readonly delivery: "silence_fallback"; readonly provider: null })
  | (AudioAssetSlotV1 & {
    readonly delivery: "runtime_audio";
    readonly provider: AudioProviderEntryV1;
  });

export interface ResolvedAudioManifestV1 {
  readonly entries: readonly ResolvedAudioAssetEntryV1[];
}

export function parseAudioAssetSlotV1(value: unknown, path = "/slot"): AudioAssetSlotV1 {
  const record = readExactRecord(value, ["assetId", "kind", "fallback", "loadGroup"], path);
  if (
    record.kind !== "music" &&
    record.kind !== "ambient" &&
    record.kind !== "sfx" &&
    record.kind !== "voice"
  ) {
    return dataFailure(`${path}/kind`, "audio_kind_invalid");
  }
  if (record.fallback !== "silence") {
    return dataFailure(`${path}/fallback`, "audio_fallback_invalid");
  }
  if (
    record.loadGroup !== "bootstrap" &&
    record.loadGroup !== "scene" &&
    record.loadGroup !== "on_demand"
  ) {
    return dataFailure(`${path}/loadGroup`, "audio_load_group_invalid");
  }
  return {
    assetId: parseAudioAssetIdV1(record.assetId, `${path}/assetId`),
    kind: record.kind,
    fallback: record.fallback,
    loadGroup: record.loadGroup,
  };
}

export function parseAudioProviderEntryV1(
  value: unknown,
  path = "/provider",
): AudioProviderEntryV1 {
  const record = readExactRecord(
    value,
    ["assetId", "runtimePath", "mediaType", "durationMs"],
    path,
  );
  if (
    record.mediaType !== "audio/ogg" &&
    record.mediaType !== "audio/mpeg" &&
    record.mediaType !== "audio/wav" &&
    record.mediaType !== "audio/mp4"
  ) {
    return dataFailure(`${path}/mediaType`, "audio_media_type_invalid");
  }
  if (typeof record.runtimePath !== "string" || record.runtimePath.length === 0) {
    return dataFailure(`${path}/runtimePath`, "audio_runtime_path_invalid");
  }
  return {
    assetId: parseAudioAssetIdV1(record.assetId, `${path}/assetId`),
    runtimePath: record.runtimePath,
    mediaType: record.mediaType,
    durationMs: record.durationMs === null ? null : parsePositiveSafeInteger(record.durationMs),
  };
}

/**
 * Resolves audio slots against provider entries: every slot resolves either
 * to runtime audio or to the silence fallback. Unknown provider
 * asset IDs and duplicate slots fail structurally.
 */
export function resolveAudioManifestV1(
  slotsValue: unknown,
  providersValue: unknown,
): ResolvedAudioManifestV1 {
  const slots = readArray(slotsValue, "/slots").map((slot, index) =>
    parseAudioAssetSlotV1(slot, `/slots/${String(index)}`)
  );
  const providers = readArray(providersValue, "/providers").map((provider, index) =>
    parseAudioProviderEntryV1(provider, `/providers/${String(index)}`)
  );

  const slotIds = new Set<string>();
  for (const slot of slots) {
    if (slotIds.has(slot.assetId)) return dataFailure("/slots", "audio_slot_duplicate");
    slotIds.add(slot.assetId);
  }
  const providersById = new Map<string, AudioProviderEntryV1>();
  for (const provider of providers) {
    if (providersById.has(provider.assetId)) {
      return dataFailure("/providers", "audio_provider_duplicate");
    }
    if (!slotIds.has(provider.assetId)) {
      return dataFailure("/providers", "audio_provider_unknown_slot");
    }
    providersById.set(provider.assetId, provider);
  }

  return {
    entries: slots.map((slot) => {
      const provider = providersById.get(slot.assetId);
      return provider === undefined
        ? { ...slot, delivery: "silence_fallback" as const, provider: null }
        : { ...slot, delivery: "runtime_audio" as const, provider };
    }),
  };
}

/**
 * The saveable continuous audio intent. Story State publishes the desired
 * playback targets; the Audio Host reconciles the actual playback after
 * every publication. Numbers stay canonical-safe integers (permille gain,
 * millisecond fades). Transient SFX are NOT part of this intent: they flow
 * through the commit-only transient effect stream.
 */
export interface AudioChannelIntentV1 {
  readonly assetId: string;
  readonly loop: boolean;
  readonly gainPermille: number;
  readonly fadeMs: number;
}

export type VoiceStopPolicyV1 = "stop_on_advance" | "sustain";

export interface VoiceIntentV1 {
  readonly assetId: string;
  /** The say interaction this line belongs to. */
  readonly interactionDefinitionId: string;
  readonly occurrenceId: string;
  readonly stopPolicy: VoiceStopPolicyV1;
}

export interface AudioIntentV1 {
  readonly bgm: AudioChannelIntentV1 | null;
  readonly ambient: AudioChannelIntentV1 | null;
  readonly voice: VoiceIntentV1 | null;
}

export const silentAudioIntentV1: AudioIntentV1 = {
  bgm: null,
  ambient: null,
  voice: null,
};

function parseGainPermilleV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1000) {
    return dataFailure(path, "gain_permille_invalid");
  }
  return value;
}

function parseFadeMsV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return dataFailure(path, "fade_ms_invalid");
  }
  return value;
}

export function parseAudioChannelIntentV1(value: unknown, path = "/channel"): AudioChannelIntentV1 {
  const record = readExactRecord(value, ["assetId", "loop", "gainPermille", "fadeMs"], path);
  if (typeof record.loop !== "boolean") return dataFailure(`${path}/loop`, "boolean_expected");
  return {
    assetId: parseAudioAssetIdV1(record.assetId, `${path}/assetId`),
    loop: record.loop,
    gainPermille: parseGainPermilleV1(record.gainPermille, `${path}/gainPermille`),
    fadeMs: parseFadeMsV1(record.fadeMs, `${path}/fadeMs`),
  };
}

export function parseVoiceIntentV1(value: unknown, path = "/voice"): VoiceIntentV1 {
  const record = readExactRecord(
    value,
    ["assetId", "interactionDefinitionId", "occurrenceId", "stopPolicy"],
    path,
  );
  if (record.stopPolicy !== "stop_on_advance" && record.stopPolicy !== "sustain") {
    return dataFailure(`${path}/stopPolicy`, "voice_stop_policy_invalid");
  }
  if (typeof record.occurrenceId !== "string" || record.occurrenceId.length === 0) {
    return dataFailure(`${path}/occurrenceId`, "occurrence_invalid");
  }
  return {
    assetId: parseAudioAssetIdV1(record.assetId, `${path}/assetId`),
    interactionDefinitionId: parseAudioAssetIdV1(
      record.interactionDefinitionId,
      `${path}/interactionDefinitionId`,
    ),
    occurrenceId: record.occurrenceId,
    stopPolicy: record.stopPolicy,
  };
}

export function parseAudioIntentV1(value: unknown, path = "/audio"): AudioIntentV1 {
  const record = readExactRecord(value, ["bgm", "ambient", "voice"], path);
  return {
    bgm: record.bgm === null ? null : parseAudioChannelIntentV1(record.bgm, `${path}/bgm`),
    ambient: record.ambient === null
      ? null
      : parseAudioChannelIntentV1(record.ambient, `${path}/ambient`),
    voice: record.voice === null ? null : parseVoiceIntentV1(record.voice, `${path}/voice`),
  };
}
