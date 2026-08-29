// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  projectVnLastSoundCheckTransientEffectsV1,
  resolveVnLastSoundCheckEffectAssetV1,
  vnLastSoundCheckAudioAssetIdsV1,
  vnLastSoundCheckAudioManifestV1,
} from "../content/audio.ts";
import type { VnLastSoundCheckGameViewV1 } from "../game/simulation.ts";
import { createVnLastSoundCheckSimulationTargetV1 } from "../tooling/simulation-target.ts";

type VnLastSoundCheckSimulationTargetV1 = Awaited<
  ReturnType<typeof createVnLastSoundCheckSimulationTargetV1>
>;

function gameViewV1(target: VnLastSoundCheckSimulationTargetV1): VnLastSoundCheckGameViewV1 {
  return (target.agent.observe() as { readonly game: VnLastSoundCheckGameViewV1 }).game;
}

describe("One Last Sound Check audio", () => {
  it("resolves every product audio slot to a browser media asset", () => {
    expect(vnLastSoundCheckAudioManifestV1.entries).toHaveLength(8);
    expect(
      vnLastSoundCheckAudioManifestV1.entries.every((entry) =>
        entry.delivery === "runtime_audio" && entry.provider.runtimePath.startsWith("assets/audio/")
      ),
    ).toBe(true);
  });

  it.each(["archive-voice", "present-voice"] as const)(
    "projects continuous scene and route voice intent throughout %s",
    async (scenarioId) => {
      const target = await createVnLastSoundCheckSimulationTargetV1({ seed: 4_242 });
      try {
        expect(gameViewV1(target).audio).toEqual({ bgm: null, ambient: null, voice: null });
        const seenBgm = new Set<string>();
        const seenAmbient = new Set<string>();
        const seenVoice = new Set<string>();
        for (const invocation of target.scenarios[scenarioId]) {
          await expect(target.agent.dispatch(invocation as never)).resolves.toMatchObject({
            kind: "committed",
          });
          const audio = gameViewV1(target).audio;
          if (audio.bgm !== null) seenBgm.add(audio.bgm.assetId);
          if (audio.ambient !== null) seenAmbient.add(audio.ambient.assetId);
          if (audio.voice !== null) seenVoice.add(audio.voice.assetId);
        }

        expect(seenBgm).toEqual(new Set([vnLastSoundCheckAudioAssetIdsV1.bgmLastShift]));
        expect(seenAmbient).toEqual(
          new Set([
            vnLastSoundCheckAudioAssetIdsV1.ambientControlRoom,
            vnLastSoundCheckAudioAssetIdsV1.ambientRooftop,
          ]),
        );
        expect(seenVoice).toEqual(
          new Set([
            vnLastSoundCheckAudioAssetIdsV1.voiceOldCall,
            ...(scenarioId === "present-voice"
              ? [vnLastSoundCheckAudioAssetIdsV1.voicePresentSent]
              : []),
          ]),
        );
      } finally {
        await target.dispose();
      }
    },
    30_000,
  );

  it("projects only authored committed interaction effects", () => {
    const requests = projectVnLastSoundCheckTransientEffectsV1([
      {
        kind: "vn-last-sound-check.interaction_resolved",
        definitionId: "interaction.vn-last-sound-check.shared-old-recording-load-reel",
        occurrenceId: "interaction-occurrence.13",
      },
      {
        kind: "vn-last-sound-check.interaction_resolved",
        definitionId: "interaction.vn-last-sound-check.shared-power-on-room",
        occurrenceId: "interaction-occurrence.1",
      },
      {
        kind: "vn-last-sound-check.interaction_resolved",
        definitionId: "interaction.vn-last-sound-check.shared-one-window-switch",
        occurrenceId: "interaction-occurrence.26",
      },
      {
        kind: "vn-last-sound-check.interaction_resolved",
        definitionId: "interaction.vn-last-sound-check.present-carrier-lock",
        occurrenceId: "interaction-occurrence.34",
      },
    ]);
    expect(requests).toEqual([
      {
        effectId: "audio.sfx",
        payload: { assetId: vnLastSoundCheckAudioAssetIdsV1.sfxTape },
      },
      {
        effectId: "audio.sfx",
        payload: { assetId: vnLastSoundCheckAudioAssetIdsV1.sfxSwitch },
      },
      {
        effectId: "audio.sfx",
        payload: { assetId: vnLastSoundCheckAudioAssetIdsV1.sfxRelay },
      },
    ]);
    expect(resolveVnLastSoundCheckEffectAssetV1({
      effectId: "audio.sfx",
      payload: requests[0]!.payload,
    })).toEqual({ assetId: vnLastSoundCheckAudioAssetIdsV1.sfxTape });
    expect(resolveVnLastSoundCheckEffectAssetV1({
      effectId: "visual.spark",
      payload: { assetId: vnLastSoundCheckAudioAssetIdsV1.sfxTape },
    })).toBeNull();
  });
});
