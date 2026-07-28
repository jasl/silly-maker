// SPDX-License-Identifier: MIT
import type { AudioIntentV1, ResolvedAudioManifestV1, TransientEffectV1 } from "@sillymaker/base";
import { parseAudioIntentV1, resolveAudioManifestV1 } from "@sillymaker/base";

import type { CatcafeGameViewV1 } from "../../simulation.ts";

/**
 * 《雨巷猫舍》的声音层：连续通道（BGM/环境雨声）是游戏视图的纯投影——
 * 读档后凭权威状态即可还原；一次性音效走 commit-only 瞬态效果流（映射
 * 在 UI 侧，见 resolveCatcafeEffectAssetV1）。素材为脚本合成的占位音频
 * （源档 `art-source/audio-synth/generate.py`），后续可只换文件与 digest。
 */

export const catcafeAudioIdsV1 = Object.freeze({
  bgmShop: "audio.catcafe.bgm.shop",
  bgmArena: "audio.catcafe.bgm.arena",
  bgmEnding: "audio.catcafe.bgm.ending",
  ambientRain: "audio.catcafe.ambient.rain",
  sfxPurr: "audio.catcafe.sfx.purr",
  sfxHiss: "audio.catcafe.sfx.hiss",
  sfxCoin: "audio.catcafe.sfx.coin",
  sfxWin: "audio.catcafe.sfx.win",
  sfxLose: "audio.catcafe.sfx.lose",
} as const);

const audioPathV1 = (file: string): string => `examples/cat-cafe/assets/${file}`;

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
      byteLength: 110027,
      sha256: "sha256:3314868be07ee53f0c2306f68be87d1a8a11774edaeb0d2c90ba3bfb9983f974",
      durationMs: 27429,
    },
    {
      assetId: catcafeAudioIdsV1.bgmArena,
      runtimePath: audioPathV1("cc-bgm-arena.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 97258,
      sha256: "sha256:15fd9cc7a8176a7d9048e11acafdd7865688637e588bf477347ec35f99bd25fa",
      durationMs: 20000,
    },
    {
      assetId: catcafeAudioIdsV1.bgmEnding,
      runtimePath: audioPathV1("cc-bgm-ending.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 105087,
      sha256: "sha256:4c2321f03c0705e0ada649fec5e7191936be41715dbcc0c4f92ff583939dab46",
      durationMs: 26182,
    },
    {
      assetId: catcafeAudioIdsV1.ambientRain,
      runtimePath: audioPathV1("cc-ambient-rain.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 132181,
      sha256: "sha256:21a274dd7e66ae44ecc07528bdd8075f1761f0142514cf499580393db22acbc9",
      durationMs: 18800,
    },
    {
      assetId: catcafeAudioIdsV1.sfxPurr,
      runtimePath: audioPathV1("cc-sfx-purr.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 4415,
      sha256: "sha256:f3a8c90eaa75f6c4df44bda62c6f1ef50854872a784a8070c83092faed5c4ecb",
      durationMs: 900,
    },
    {
      assetId: catcafeAudioIdsV1.sfxHiss,
      runtimePath: audioPathV1("cc-sfx-hiss.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 5962,
      sha256: "sha256:a41d73b9180980b549181e11f864e3d5c7d390595cebbb5a363baae73ec2ed17",
      durationMs: 450,
    },
    {
      assetId: catcafeAudioIdsV1.sfxCoin,
      runtimePath: audioPathV1("cc-sfx-coin.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 2778,
      sha256: "sha256:a18a1489dc0e0bf662a8732c0cdbe3ba266db2d29869edcf7c07535fc37932fc",
      durationMs: 400,
    },
    {
      assetId: catcafeAudioIdsV1.sfxWin,
      runtimePath: audioPathV1("cc-sfx-win.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 5431,
      sha256: "sha256:fa95c95484a9d35d7a8d068be0b95c8c58d06051b9fd7eaf5cdfdf5d4cc183a0",
      durationMs: 1000,
    },
    {
      assetId: catcafeAudioIdsV1.sfxLose,
      runtimePath: audioPathV1("cc-sfx-lose.mp3"),
      mediaType: "audio/mpeg",
      byteLength: 4207,
      sha256: "sha256:2d12f679af7aadf2cd705c872de08dd48b1f3b5831d92773a1722b444709398b",
      durationMs: 800,
    },
  ],
);

/**
 * BGM 规则：运动会回合中放竞技场曲；结局屏（已结算未确认）放结局主题；
 * 其余时间（含后日谈与标题屏）放店内曲。环境雨声常驻低音量——雨巷的
 * 底色。全部输入来自游戏视图，读档即还原。
 */
export function projectCatcafeAudioIntentV1(
  view: Pick<CatcafeGameViewV1, "contest" | "ending">,
): AudioIntentV1 {
  const bgmAssetId =
    view.contest !== null
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

/** 一次性音效：既有瞬态效果直接映射，模拟层零改动。 */
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
