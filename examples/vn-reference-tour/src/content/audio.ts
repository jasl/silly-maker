// SPDX-License-Identifier: MIT
import type {
  AudioIntentV1,
  ResolvedAudioManifestV1,
  TransientEffectRequestV1,
} from "@sillymaker/base";
import { parseAudioIntentV1, resolveAudioManifestV1 } from "@sillymaker/base";

import type { VnReferenceTourEventV1, VnReferenceTourQueriesV1 } from "../game/kernel.ts";
import { vnReferenceTourContentIdsV1 } from "../story/narrative.ts";

export const vnReferenceTourAudioAssetIdsV1 = {
  bgmLastShift: "music.vn-reference-tour.last-shift",
  ambientControlRoom: "ambient.vn-reference-tour.radio-hum",
  ambientRooftop: "ambient.vn-reference-tour.rooftop-wind",
  sfxTape: "sfx.vn-reference-tour.tape-bay",
  sfxSwitch: "sfx.vn-reference-tour.microphone-switch",
  sfxRelay: "sfx.vn-reference-tour.transmit-relay",
  voiceOldCall: "voice.vn-reference-tour.zhou-old-call",
  voicePresentSent: "voice.vn-reference-tour.lin-new-call",
} as const;

const audioSlotsV1 = [
  {
    assetId: vnReferenceTourAudioAssetIdsV1.bgmLastShift,
    kind: "music",
    fallback: "silence",
    loadGroup: "scene",
  },
  {
    assetId: vnReferenceTourAudioAssetIdsV1.ambientControlRoom,
    kind: "ambient",
    fallback: "silence",
    loadGroup: "scene",
  },
  {
    assetId: vnReferenceTourAudioAssetIdsV1.ambientRooftop,
    kind: "ambient",
    fallback: "silence",
    loadGroup: "scene",
  },
  ...([
    vnReferenceTourAudioAssetIdsV1.sfxTape,
    vnReferenceTourAudioAssetIdsV1.sfxSwitch,
    vnReferenceTourAudioAssetIdsV1.sfxRelay,
  ] as const).map((assetId) => ({
    assetId,
    kind: "sfx" as const,
    fallback: "silence" as const,
    loadGroup: "on_demand" as const,
  })),
  ...([
    vnReferenceTourAudioAssetIdsV1.voiceOldCall,
    vnReferenceTourAudioAssetIdsV1.voicePresentSent,
  ] as const).map((assetId) => ({
    assetId,
    kind: "voice" as const,
    fallback: "silence" as const,
    loadGroup: "on_demand" as const,
  })),
] as const;

const audioProvidersV1 = [
  [vnReferenceTourAudioAssetIdsV1.bgmLastShift, "bgm-last-shift.mp3"],
  [vnReferenceTourAudioAssetIdsV1.ambientControlRoom, "ambient-control-room.mp3"],
  [vnReferenceTourAudioAssetIdsV1.ambientRooftop, "ambient-rooftop.mp3"],
  [vnReferenceTourAudioAssetIdsV1.sfxTape, "sfx-tape.mp3"],
  [vnReferenceTourAudioAssetIdsV1.sfxSwitch, "sfx-switch.mp3"],
  [vnReferenceTourAudioAssetIdsV1.sfxRelay, "sfx-relay.mp3"],
  [vnReferenceTourAudioAssetIdsV1.voiceOldCall, "voice-old-call.mp3"],
  [vnReferenceTourAudioAssetIdsV1.voicePresentSent, "voice-present-sent.mp3"],
] as const;

export const vnReferenceTourAudioManifestV1: ResolvedAudioManifestV1 = resolveAudioManifestV1(
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
  "interaction.vn-reference-tour.shared-old-recording-old-call": {
    assetId: vnReferenceTourAudioAssetIdsV1.voiceOldCall,
    stopPolicy: "stop_on_advance",
  },
  "interaction.vn-reference-tour.archive-prepare-sent": {
    assetId: vnReferenceTourAudioAssetIdsV1.voiceOldCall,
    stopPolicy: "stop_on_advance",
  },
  "interaction.vn-reference-tour.present-prepare-sent": {
    assetId: vnReferenceTourAudioAssetIdsV1.voicePresentSent,
    stopPolicy: "stop_on_advance",
  },
};

export function vnReferenceTourVoiceAssetForDefinitionV1(
  definitionId: string,
): string | null {
  return voiceByDefinitionIdV1[definitionId]?.assetId ?? null;
}

function stageIsRooftopV1(queries: VnReferenceTourQueriesV1): boolean {
  return queries.stage.layers.some((layer) =>
    layer.entries.some((entry) =>
      entry.contentId === vnReferenceTourContentIdsV1.backgroundRooftopAntenna
    )
  );
}

/** Continuous audio is a pure projection of the saveable Narrative and Stage. */
export function projectVnReferenceTourAudioIntentV1(
  queries: VnReferenceTourQueriesV1,
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
        assetId: vnReferenceTourAudioAssetIdsV1.bgmLastShift,
        loop: true,
        gainPermille: 660,
        fadeMs: 500,
      }
      : null,
    ambient: active
      ? {
        assetId: rooftop
          ? vnReferenceTourAudioAssetIdsV1.ambientRooftop
          : vnReferenceTourAudioAssetIdsV1.ambientControlRoom,
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
  "interaction.vn-reference-tour.shared-old-recording-load-reel":
    vnReferenceTourAudioAssetIdsV1.sfxTape,
  "interaction.vn-reference-tour.shared-one-window-switch":
    vnReferenceTourAudioAssetIdsV1.sfxSwitch,
  "interaction.vn-reference-tour.archive-carrier-lock": vnReferenceTourAudioAssetIdsV1.sfxRelay,
  "interaction.vn-reference-tour.present-carrier-lock": vnReferenceTourAudioAssetIdsV1.sfxRelay,
};

export function vnReferenceTourSfxAssetForDefinitionV1(
  definitionId: string,
): string | null {
  return sfxByResolvedDefinitionIdV1[definitionId] ?? null;
}

export function predictVnReferenceTourStageAudioAssetsV1(
  stageContentIds: readonly string[],
): readonly string[] {
  if (stageContentIds.includes(vnReferenceTourContentIdsV1.backgroundRooftopAntenna)) {
    return [
      vnReferenceTourAudioAssetIdsV1.bgmLastShift,
      vnReferenceTourAudioAssetIdsV1.ambientRooftop,
    ];
  }
  if (stageContentIds.includes(vnReferenceTourContentIdsV1.backgroundControlRoom)) {
    return [
      vnReferenceTourAudioAssetIdsV1.bgmLastShift,
      vnReferenceTourAudioAssetIdsV1.ambientControlRoom,
    ];
  }
  return [];
}

/** One-shot product effects derive only from committed interaction events. */
export function projectVnReferenceTourTransientEffectsV1(
  events: readonly VnReferenceTourEventV1[],
): readonly TransientEffectRequestV1[] {
  return events.flatMap((event) => {
    if (event.kind !== "vn-reference-tour.interaction_resolved") return [];
    const assetId = vnReferenceTourSfxAssetForDefinitionV1(event.definitionId);
    return assetId === null ? [] : [{ effectId: "audio.sfx", payload: { assetId } }];
  });
}

export function resolveVnReferenceTourEffectAssetV1(
  effect: { readonly effectId: string; readonly payload: Readonly<Record<string, unknown>> },
): { readonly assetId: string } | null {
  return effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
    ? { assetId: effect.payload.assetId }
    : null;
}
