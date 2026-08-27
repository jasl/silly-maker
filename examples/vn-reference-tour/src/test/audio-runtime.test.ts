// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  projectVnReferenceTourTransientEffectsV1,
  resolveVnReferenceTourEffectAssetV1,
  vnReferenceTourAudioAssetIdsV1,
  vnReferenceTourAudioManifestV1,
} from "../content/audio.ts";
import type { VnReferenceTourGameViewV1 } from "../game/simulation.ts";
import { createVnReferenceTourSimulationTargetV1 } from "../tooling/simulation-target.ts";

type VnReferenceTourSimulationTargetV1 = Awaited<
  ReturnType<typeof createVnReferenceTourSimulationTargetV1>
>;

function gameViewV1(target: VnReferenceTourSimulationTargetV1): VnReferenceTourGameViewV1 {
  return (target.agent.observe() as { readonly game: VnReferenceTourGameViewV1 }).game;
}

describe("VN Reference Tour audio", () => {
  it("resolves every product audio slot to a browser media asset", () => {
    expect(vnReferenceTourAudioManifestV1.entries).toHaveLength(8);
    expect(
      vnReferenceTourAudioManifestV1.entries.every((entry) =>
        entry.delivery === "runtime_audio" && entry.provider.runtimePath.startsWith("assets/audio/")
      ),
    ).toBe(true);
  });

  it.each(["archive-voice", "present-voice"] as const)(
    "projects continuous scene and route voice intent throughout %s",
    async (scenarioId) => {
      const target = await createVnReferenceTourSimulationTargetV1({ seed: 4_242 });
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

        expect(seenBgm).toEqual(new Set([vnReferenceTourAudioAssetIdsV1.bgmLastShift]));
        expect(seenAmbient).toEqual(
          new Set([
            vnReferenceTourAudioAssetIdsV1.ambientControlRoom,
            vnReferenceTourAudioAssetIdsV1.ambientRooftop,
          ]),
        );
        expect(seenVoice).toEqual(
          new Set([
            vnReferenceTourAudioAssetIdsV1.voiceOldCall,
            ...(scenarioId === "present-voice"
              ? [vnReferenceTourAudioAssetIdsV1.voicePresentSent]
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
    const requests = projectVnReferenceTourTransientEffectsV1([
      {
        kind: "vn-reference-tour.interaction_resolved",
        definitionId: "interaction.vn-reference-tour.shared-old-recording-load-reel",
        occurrenceId: "interaction-occurrence.13",
      },
      {
        kind: "vn-reference-tour.interaction_resolved",
        definitionId: "interaction.vn-reference-tour.shared-power-on-room",
        occurrenceId: "interaction-occurrence.1",
      },
      {
        kind: "vn-reference-tour.interaction_resolved",
        definitionId: "interaction.vn-reference-tour.shared-one-window-switch",
        occurrenceId: "interaction-occurrence.26",
      },
      {
        kind: "vn-reference-tour.interaction_resolved",
        definitionId: "interaction.vn-reference-tour.present-carrier-lock",
        occurrenceId: "interaction-occurrence.34",
      },
    ]);
    expect(requests).toEqual([
      {
        effectId: "audio.sfx",
        payload: { assetId: vnReferenceTourAudioAssetIdsV1.sfxTape },
      },
      {
        effectId: "audio.sfx",
        payload: { assetId: vnReferenceTourAudioAssetIdsV1.sfxSwitch },
      },
      {
        effectId: "audio.sfx",
        payload: { assetId: vnReferenceTourAudioAssetIdsV1.sfxRelay },
      },
    ]);
    expect(resolveVnReferenceTourEffectAssetV1({
      effectId: "audio.sfx",
      payload: requests[0]!.payload,
    })).toEqual({ assetId: vnReferenceTourAudioAssetIdsV1.sfxTape });
    expect(resolveVnReferenceTourEffectAssetV1({
      effectId: "visual.spark",
      payload: { assetId: vnReferenceTourAudioAssetIdsV1.sfxTape },
    })).toBeNull();
  });
});
