// SPDX-License-Identifier: MIT
// Audio layer: BGM rules are a pure view projection (a load restores them), SFX map
// existing transient effects, and manifest digests/byteLengths match the real audio files in the repository.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { TransientEffectV1 } from "@sillymaker/base";

import {
  catcafeAudioIdsV1,
  catcafeAudioManifestV1,
  projectCatcafeAudioIntentV1,
  resolveCatcafeEffectAssetV1,
} from "../features/audio/index.ts";

const storyRootV1 = resolve(import.meta.dirname, "..", "..");

function effectV1(effectId: string, payload: Record<string, unknown>): TransientEffectV1 {
  return Object.freeze({
    effectId,
    payload: Object.freeze(payload),
    epoch: 1,
    effectSequence: 1,
  }) as unknown as TransientEffectV1;
}

describe("catcafe audio", () => {
  it("picks the BGM from the settled view: arena in contests, theme on the ending", () => {
    const contest = {
      rivalId: "rival.mochi",
      round: 1,
      morale: 3,
      rivalMorale: 3,
      feintActive: false,
    };
    expect(projectCatcafeAudioIntentV1({ contest: null, ending: null }).bgm?.assetId).toBe(
      catcafeAudioIdsV1.bgmShop,
    );
    expect(projectCatcafeAudioIntentV1({ contest, ending: null }).bgm?.assetId).toBe(
      catcafeAudioIdsV1.bgmArena,
    );
    expect(projectCatcafeAudioIntentV1({ contest: null, ending: "ordinary" }).bgm?.assetId).toBe(
      catcafeAudioIdsV1.bgmEnding,
    );
    // Rain is the constant base tone; the voice channel is unused.
    const intent = projectCatcafeAudioIntentV1({ contest: null, ending: null });
    expect(intent.ambient?.assetId).toBe(catcafeAudioIdsV1.ambientRain);
    expect(intent.ambient?.loop).toBe(true);
    expect(intent.voice).toBeNull();
  });

  it("maps existing transient effects to one-shot cues without new simulation code", () => {
    expect(
      resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.reaction", { trustDelta: 2 })),
    ).toEqual({ assetId: catcafeAudioIdsV1.sfxPurr });
    expect(
      resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.reaction", { trustDelta: -3 })),
    ).toEqual({ assetId: catcafeAudioIdsV1.sfxHiss });
    expect(
      resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.contest", { outcome: "won" })),
    ).toEqual({ assetId: catcafeAudioIdsV1.sfxWin });
    expect(
      resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.contest", { outcome: "lost" })),
    ).toEqual({ assetId: catcafeAudioIdsV1.sfxLose });
    expect(
      resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.encounter", { encounterId: "e" })),
    ).toEqual({ assetId: catcafeAudioIdsV1.sfxCoin });
    expect(resolveCatcafeEffectAssetV1(effectV1("effect.catcafe.unknown", {}))).toBeNull();
  });

  it("ships every declared audio provider with matching bytes and digest", async () => {
    const providers = catcafeAudioManifestV1.entries.flatMap((entry) =>
      entry.delivery === "runtime_audio" ? [entry.provider] : []
    );
    expect(providers.length).toBe(9);
    for (const provider of providers) {
      const bytes = await readFile(resolve(storyRootV1, provider.runtimePath));
      expect(bytes.byteLength).toBe(provider.byteLength);
      expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`).toBe(provider.sha256);
    }
  });
});
