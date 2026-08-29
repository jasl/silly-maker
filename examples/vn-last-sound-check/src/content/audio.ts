// SPDX-License-Identifier: MIT
import type {
  AudioIntentV1,
  ResolvedAudioManifestV1,
  TransientEffectRequestV1,
} from "@sillymaker/base";
import { parseAudioIntentV1, resolveAudioManifestV1 } from "@sillymaker/base";

import type { VnLastSoundCheckEventV1, VnLastSoundCheckQueriesV1 } from "../game/kernel.ts";
import { vnLastSoundCheckContentIdsV1 } from "../story/narrative.ts";

export const vnLastSoundCheckAudioAssetIdsV1 = {
  bgmLastShift: "music.vn-last-sound-check.last-shift",
  ambientControlRoom: "ambient.vn-last-sound-check.radio-hum",
  ambientRooftop: "ambient.vn-last-sound-check.rooftop-wind",
  sfxTape: "sfx.vn-last-sound-check.tape-bay",
  sfxSwitch: "sfx.vn-last-sound-check.microphone-switch",
  sfxRelay: "sfx.vn-last-sound-check.transmit-relay",
  voiceOldCall: "voice.vn-last-sound-check.zhou-old-call",
  voicePresentSent: "voice.vn-last-sound-check.lin-new-call",
} as const;

const audioSlotsV1 = [
  {
    assetId: vnLastSoundCheckAudioAssetIdsV1.bgmLastShift,
    kind: "music",
    fallback: "silence",
    loadGroup: "scene",
  },
  {
    assetId: vnLastSoundCheckAudioAssetIdsV1.ambientControlRoom,
    kind: "ambient",
    fallback: "silence",
    loadGroup: "scene",
  },
  {
    assetId: vnLastSoundCheckAudioAssetIdsV1.ambientRooftop,
    kind: "ambient",
    fallback: "silence",
    loadGroup: "scene",
  },
  ...([
    vnLastSoundCheckAudioAssetIdsV1.sfxTape,
    vnLastSoundCheckAudioAssetIdsV1.sfxSwitch,
    vnLastSoundCheckAudioAssetIdsV1.sfxRelay,
  ] as const).map((assetId) => ({
    assetId,
    kind: "sfx" as const,
    fallback: "silence" as const,
    loadGroup: "on_demand" as const,
  })),
  ...([
    vnLastSoundCheckAudioAssetIdsV1.voiceOldCall,
    vnLastSoundCheckAudioAssetIdsV1.voicePresentSent,
  ] as const).map((assetId) => ({
    assetId,
    kind: "voice" as const,
    fallback: "silence" as const,
    loadGroup: "on_demand" as const,
  })),
] as const;

const audioProvidersV1 = [
  [vnLastSoundCheckAudioAssetIdsV1.bgmLastShift, "bgm-last-shift.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.ambientControlRoom, "ambient-control-room.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.ambientRooftop, "ambient-rooftop.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.sfxTape, "sfx-tape.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.sfxSwitch, "sfx-switch.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.sfxRelay, "sfx-relay.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.voiceOldCall, "voice-old-call.mp3"],
  [vnLastSoundCheckAudioAssetIdsV1.voicePresentSent, "voice-present-sent.mp3"],
] as const;

export const vnLastSoundCheckAudioManifestV1: ResolvedAudioManifestV1 = resolveAudioManifestV1(
  audioSlotsV1,
  audioProvidersV1.map(([assetId, filename]) => ({
    assetId,
    runtimePath: `assets/audio/${filename}`,
    mediaType: "audio/mpeg" as const,
    durationMs: null,
  })),
);

const voiceByDefinitionIdV1: Readonly<
  Record<string, { readonly assetId: string; readonly stopPolicy: "stop_on_advance" }>
> = {
  "interaction.vn-last-sound-check.shared-old-recording-old-call": {
    assetId: vnLastSoundCheckAudioAssetIdsV1.voiceOldCall,
    stopPolicy: "stop_on_advance",
  },
  "interaction.vn-last-sound-check.archive-prepare-sent": {
    assetId: vnLastSoundCheckAudioAssetIdsV1.voiceOldCall,
    stopPolicy: "stop_on_advance",
  },
  "interaction.vn-last-sound-check.present-prepare-sent": {
    assetId: vnLastSoundCheckAudioAssetIdsV1.voicePresentSent,
    stopPolicy: "stop_on_advance",
  },
};

export function vnLastSoundCheckVoiceAssetForDefinitionV1(
  definitionId: string,
): string | null {
  return voiceByDefinitionIdV1[definitionId]?.assetId ?? null;
}

function stageIsRooftopV1(queries: VnLastSoundCheckQueriesV1): boolean {
  return queries.stage.layers.some((layer) =>
    layer.entries.some((entry) =>
      entry.contentId === vnLastSoundCheckContentIdsV1.backgroundRooftopAntenna
    )
  );
}

/** Continuous audio is a pure projection of the saveable Narrative and Stage. */
export function projectVnLastSoundCheckAudioIntentV1(
  queries: VnLastSoundCheckQueriesV1,
): AudioIntentV1 {
  const active = queries.narrative.phase !== "idle";
  const rooftop = stageIsRooftopV1(queries);
  const pending = queries.narrative.pending;
  const voice = pending?.kind === "say"
    ? voiceByDefinitionIdV1[pending.definitionId] ?? null
    : null;

  return parseAudioIntentV1({
    bgm: active
      ? {
        assetId: vnLastSoundCheckAudioAssetIdsV1.bgmLastShift,
        loop: true,
        gainPermille: 660,
        fadeMs: 500,
      }
      : null,
    ambient: active
      ? {
        assetId: rooftop
          ? vnLastSoundCheckAudioAssetIdsV1.ambientRooftop
          : vnLastSoundCheckAudioAssetIdsV1.ambientControlRoom,
        loop: true,
        gainPermille: rooftop ? 360 : 260,
        fadeMs: 350,
      }
      : null,
    voice: voice === null || pending?.kind !== "say" ? null : {
      assetId: voice.assetId,
      interactionDefinitionId: pending.definitionId,
      occurrenceId: pending.occurrenceId,
      stopPolicy: voice.stopPolicy,
    },
  });
}

const sfxByResolvedDefinitionIdV1: Readonly<Record<string, string>> = {
  "interaction.vn-last-sound-check.shared-old-recording-load-reel":
    vnLastSoundCheckAudioAssetIdsV1.sfxTape,
  "interaction.vn-last-sound-check.shared-one-window-switch":
    vnLastSoundCheckAudioAssetIdsV1.sfxSwitch,
  "interaction.vn-last-sound-check.archive-carrier-lock": vnLastSoundCheckAudioAssetIdsV1.sfxRelay,
  "interaction.vn-last-sound-check.present-carrier-lock": vnLastSoundCheckAudioAssetIdsV1.sfxRelay,
};

export function vnLastSoundCheckSfxAssetForDefinitionV1(
  definitionId: string,
): string | null {
  return sfxByResolvedDefinitionIdV1[definitionId] ?? null;
}

export function predictVnLastSoundCheckStageAudioAssetsV1(
  stageContentIds: readonly string[],
): readonly string[] {
  if (stageContentIds.includes(vnLastSoundCheckContentIdsV1.backgroundRooftopAntenna)) {
    return [
      vnLastSoundCheckAudioAssetIdsV1.bgmLastShift,
      vnLastSoundCheckAudioAssetIdsV1.ambientRooftop,
    ];
  }
  if (stageContentIds.includes(vnLastSoundCheckContentIdsV1.backgroundControlRoom)) {
    return [
      vnLastSoundCheckAudioAssetIdsV1.bgmLastShift,
      vnLastSoundCheckAudioAssetIdsV1.ambientControlRoom,
    ];
  }
  return [];
}

/** One-shot product effects derive only from committed interaction events. */
export function projectVnLastSoundCheckTransientEffectsV1(
  events: readonly VnLastSoundCheckEventV1[],
): readonly TransientEffectRequestV1[] {
  return events.flatMap((event) => {
    if (event.kind !== "vn-last-sound-check.interaction_resolved") return [];
    const assetId = vnLastSoundCheckSfxAssetForDefinitionV1(event.definitionId);
    return assetId === null ? [] : [{ effectId: "audio.sfx", payload: { assetId } }];
  });
}

export function resolveVnLastSoundCheckEffectAssetV1(
  effect: { readonly effectId: string; readonly payload: Readonly<Record<string, unknown>> },
): { readonly assetId: string } | null {
  return effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
    ? { assetId: effect.payload.assetId }
    : null;
}
