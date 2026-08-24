// SPDX-License-Identifier: MIT
import type { AudioIntentV1, ResolvedAudioManifestV1, TransientEffectV1 } from "@sillymaker/base";
import { parseAudioIntentV1, resolveAudioManifestV1 } from "@sillymaker/base";

import type { CatcafeGameViewV1 } from "../../simulation.ts";

/**
 * The cat cafe's audio layer: continuous channels (BGM/ambient rain) are a pure
 * projection of the game view — restorable from authoritative state after a load;
 * one-shot SFX ride the commit-only transient-effect stream (mapped on the UI side,
 * see resolveCatcafeEffectAssetV1). Assets are script-synthesized placeholders (source in
 * `art-source/audio-synth/generate.py`); same-path replacements need no receipt update.
 */

export const catcafeAudioIdsV1 = Object.freeze(
  {
    bgmShop: "audio.catcafe.bgm.shop",
    bgmArena: "audio.catcafe.bgm.arena",
    bgmEnding: "audio.catcafe.bgm.ending",
    ambientRain: "audio.catcafe.ambient.rain",
    sfxPurr: "audio.catcafe.sfx.purr",
    sfxHiss: "audio.catcafe.sfx.hiss",
    sfxCoin: "audio.catcafe.sfx.coin",
    sfxWin: "audio.catcafe.sfx.win",
    sfxLose: "audio.catcafe.sfx.lose",
  } as const,
);

const audioPathV1 = (file: string): string => `assets/${file}`;

export const catcafeAudioManifestV1: ResolvedAudioManifestV1 = resolveAudioManifestV1(
  [
    {
      assetId: catcafeAudioIdsV1.bgmShop,
      kind: "music",
      fallback: "silence",
      loadGroup: "bootstrap",
    },
    { assetId: catcafeAudioIdsV1.bgmArena, kind: "music", fallback: "silence", loadGroup: "scene" },
    {
      assetId: catcafeAudioIdsV1.bgmEnding,
      kind: "music",
      fallback: "silence",
      loadGroup: "scene",
    },
    {
      assetId: catcafeAudioIdsV1.ambientRain,
      kind: "ambient",
      fallback: "silence",
      loadGroup: "bootstrap",
    },
    {
      assetId: catcafeAudioIdsV1.sfxPurr,
      kind: "sfx",
      fallback: "silence",
      loadGroup: "on_demand",
    },
    {
      assetId: catcafeAudioIdsV1.sfxHiss,
      kind: "sfx",
      fallback: "silence",
      loadGroup: "on_demand",
    },
    {
      assetId: catcafeAudioIdsV1.sfxCoin,
      kind: "sfx",
      fallback: "silence",
      loadGroup: "on_demand",
    },
    { assetId: catcafeAudioIdsV1.sfxWin, kind: "sfx", fallback: "silence", loadGroup: "on_demand" },
    {
      assetId: catcafeAudioIdsV1.sfxLose,
      kind: "sfx",
      fallback: "silence",
      loadGroup: "on_demand",
    },
  ],
  [
    {
      assetId: catcafeAudioIdsV1.bgmShop,
      runtimePath: audioPathV1("cc-bgm-shop.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 27429,
    },
    {
      assetId: catcafeAudioIdsV1.bgmArena,
      runtimePath: audioPathV1("cc-bgm-arena.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 20000,
    },
    {
      assetId: catcafeAudioIdsV1.bgmEnding,
      runtimePath: audioPathV1("cc-bgm-ending.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 26182,
    },
    {
      assetId: catcafeAudioIdsV1.ambientRain,
      runtimePath: audioPathV1("cc-ambient-rain.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 18800,
    },
    {
      assetId: catcafeAudioIdsV1.sfxPurr,
      runtimePath: audioPathV1("cc-sfx-purr.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 900,
    },
    {
      assetId: catcafeAudioIdsV1.sfxHiss,
      runtimePath: audioPathV1("cc-sfx-hiss.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 450,
    },
    {
      assetId: catcafeAudioIdsV1.sfxCoin,
      runtimePath: audioPathV1("cc-sfx-coin.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 400,
    },
    {
      assetId: catcafeAudioIdsV1.sfxWin,
      runtimePath: audioPathV1("cc-sfx-win.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 1000,
    },
    {
      assetId: catcafeAudioIdsV1.sfxLose,
      runtimePath: audioPathV1("cc-sfx-lose.mp3"),
      mediaType: "audio/mpeg",
      durationMs: 800,
    },
  ],
);

/**
 * BGM rules: arena theme during contest turns; ending theme on the ending screen
 * (settled, unconfirmed); shop theme the rest of the time (postgame and title
 * included). Ambient rain stays at low volume — the rainy alley's base tone. All inputs come from the game view; a load restores everything.
 */
export function projectCatcafeAudioIntentV1(
  view: Pick<CatcafeGameViewV1, "contest" | "ending">,
): AudioIntentV1 {
  const bgmAssetId = view.contest !== null
    ? catcafeAudioIdsV1.bgmArena
    : view.ending !== null
    ? catcafeAudioIdsV1.bgmEnding
    : catcafeAudioIdsV1.bgmShop;
  return parseAudioIntentV1({
    bgm: { assetId: bgmAssetId, loop: true, gainPermille: 700, fadeMs: 600 },
    ambient: { assetId: catcafeAudioIdsV1.ambientRain, loop: true, gainPermille: 320, fadeMs: 800 },
    voice: null,
  });
}

/** One-shot SFX: map existing transient effects directly; zero simulation-layer changes. */
export function resolveCatcafeEffectAssetV1(
  effect: TransientEffectV1,
): { readonly assetId: string } | null {
  if (effect.effectId === "effect.catcafe.reaction") {
    const trustDelta = effect.payload.trustDelta;
    return typeof trustDelta === "number" && trustDelta < 0
      ? { assetId: catcafeAudioIdsV1.sfxHiss }
      : { assetId: catcafeAudioIdsV1.sfxPurr };
  }
  if (effect.effectId === "effect.catcafe.contest") {
    return effect.payload.outcome === "won"
      ? { assetId: catcafeAudioIdsV1.sfxWin }
      : { assetId: catcafeAudioIdsV1.sfxLose };
  }
  if (effect.effectId === "effect.catcafe.encounter") {
    return { assetId: catcafeAudioIdsV1.sfxCoin };
  }
  return null;
}
