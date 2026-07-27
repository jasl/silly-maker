// SPDX-License-Identifier: MIT
import type { AudioIntentV1, TransientEffectRequestV1 } from "@sillymaker/base";
import { parseAudioIntentV1 } from "@sillymaker/base";

import type { LabFactV1, LabQueriesV1 } from "./simulation.js";
import { labStageContentIdsV1, labStageTagsV1 } from "../stage-ids.js";

/**
 * The Engine Lab continuous audio intent is a pure projection of saved
 * State: the background picks the music, the running procedure hums, and a
 * pending voiced say line carries the current voice. Because every input is
 * authoritative State, a load restores the exact intent with no extra
 * persistence. One-shot SFX never appear here — they flow through the
 * commit-only transient effect stream.
 */

export const labAudioAssetIdsV1 = Object.freeze({
  bgmLab: "audio.e2e.bgm.lab",
  bgmStoreroom: "audio.e2e.bgm.storeroom",
  ambientHum: "audio.e2e.ambient.hum",
  voiceIntro: "audio.e2e.voice.cal-intro",
  voiceDone: "audio.e2e.voice.cal-done",
  sfxChime: "audio.e2e.sfx.chime",
  sfxFanfare: "audio.e2e.sfx.fanfare",
} as const);

export function labVoiceForSayV1(
  definitionId: string,
): { readonly assetId: string; readonly stopPolicy: "stop_on_advance" | "sustain" } | null {
  return labVoiceBySayDefinitionV1[definitionId] ?? null;
}

const labVoiceBySayDefinitionV1: Readonly<
  Record<string, { readonly assetId: string; readonly stopPolicy: "stop_on_advance" | "sustain" }>
> = Object.freeze({
  "interaction.e2e.cal-intro": Object.freeze({
    assetId: labAudioAssetIdsV1.voiceIntro,
    stopPolicy: "stop_on_advance" as const,
  }),
  "interaction.e2e.cal-done": Object.freeze({
    assetId: labAudioAssetIdsV1.voiceDone,
    stopPolicy: "sustain" as const,
  }),
});

/** The one background-to-BGM rule shared by playback and prediction. */
export function labBgmForBackgroundV1(contentId: string | undefined): string {
  return contentId === labStageContentIdsV1.backgroundStoreroom
    ? labAudioAssetIdsV1.bgmStoreroom
    : labAudioAssetIdsV1.bgmLab;
}

export function projectLabAudioIntentV1(queries: LabQueriesV1): AudioIntentV1 {
  const background = queries.stage.layers
    .find((layer) => layer.layerId === "layer.e2e.background")
    ?.entries.find((entry) => entry.tag === labStageTagsV1.background);
  const bgmAssetId = labBgmForBackgroundV1(background?.contentId);

  const pending = queries.narrative.pending;
  const voice =
    pending !== null && pending.kind === "say"
      ? (labVoiceBySayDefinitionV1[pending.definitionId] ?? null)
      : null;

  return parseAudioIntentV1({
    bgm: { assetId: bgmAssetId, loop: true, gainPermille: 800, fadeMs: 400 },
    ambient:
      queries.procedurePhase === "running"
        ? { assetId: labAudioAssetIdsV1.ambientHum, loop: true, gainPermille: 400, fadeMs: 200 }
        : null,
    voice:
      voice === null || pending === null
        ? null
        : {
            assetId: voice.assetId,
            interactionDefinitionId: pending.definitionId,
            occurrenceId: pending.occurrenceId,
            stopPolicy: voice.stopPolicy,
          },
  });
}

/** Commit-only SFX derived from committed facts; never stored anywhere. */
export function projectLabTransientEffectsV1(
  facts: readonly LabFactV1[],
): readonly TransientEffectRequestV1[] {
  const requests: TransientEffectRequestV1[] = [];
  for (const fact of facts) {
    if (fact.kind === "lab.sample_collected") {
      requests.push(
        Object.freeze({
          effectId: "audio.sfx",
          payload: Object.freeze({ assetId: labAudioAssetIdsV1.sfxChime }),
        }),
      );
    }
    if (fact.kind === "lab.procedure_advanced" && fact.phase === "complete") {
      requests.push(
        Object.freeze({
          effectId: "audio.sfx",
          payload: Object.freeze({ assetId: labAudioAssetIdsV1.sfxFanfare }),
        }),
      );
    }
  }
  return Object.freeze(requests);
}
