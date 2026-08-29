// SPDX-License-Identifier: MIT
import type { AssetId, AssetPackV1, AssetSlotDefinitionV1 } from "@sillymaker/base";
import { parsePositiveSafeInteger } from "@sillymaker/base";

export const vnLastSoundCheckAssetIdsV1 = {
  controlRoom: "asset.vn-last-sound-check.background.control-room" as AssetId,
  rooftopAntenna: "asset.vn-last-sound-check.background.rooftop-antenna" as AssetId,
  linFocusedOpen: "asset.vn-last-sound-check.character.lin.focused.open" as AssetId,
  linFocusedClosed: "asset.vn-last-sound-check.character.lin.focused.closed" as AssetId,
  linRelieved: "asset.vn-last-sound-check.character.lin.relieved" as AssetId,
  zhouNeutral: "asset.vn-last-sound-check.character.zhou.neutral" as AssetId,
  zhouSoft: "asset.vn-last-sound-check.character.zhou.soft" as AssetId,
  mixingConsole: "asset.vn-last-sound-check.prop.mixing-console" as AssetId,
  tapeMachine: "asset.vn-last-sound-check.prop.tape-machine" as AssetId,
  wallClock: "asset.vn-last-sound-check.prop.wall-clock" as AssetId,
  microphone: "asset.vn-last-sound-check.prop.microphone" as AssetId,
  signalLight: "asset.vn-last-sound-check.prop.signal-light" as AssetId,
  antenna: "asset.vn-last-sound-check.prop.antenna" as AssetId,
  antennaCable: "asset.vn-last-sound-check.prop.antenna-cable" as AssetId,
  masterSwitch: "asset.vn-last-sound-check.prop.master-switch" as AssetId,
  statusLight: "asset.vn-last-sound-check.prop.status-light" as AssetId,
} as const;

export const vnLastSoundCheckPropAssetIdsV1 = {
  "mixing-console": vnLastSoundCheckAssetIdsV1.mixingConsole,
  "tape-machine": vnLastSoundCheckAssetIdsV1.tapeMachine,
  "wall-clock": vnLastSoundCheckAssetIdsV1.wallClock,
  microphone: vnLastSoundCheckAssetIdsV1.microphone,
  "signal-light": vnLastSoundCheckAssetIdsV1.signalLight,
  antenna: vnLastSoundCheckAssetIdsV1.antenna,
  "antenna-cable": vnLastSoundCheckAssetIdsV1.antennaCable,
  "master-switch": vnLastSoundCheckAssetIdsV1.masterSwitch,
  "status-light": vnLastSoundCheckAssetIdsV1.statusLight,
} as const;

const imageDimensionsV1 = {
  background: {
    width: parsePositiveSafeInteger(1600),
    height: parsePositiveSafeInteger(900),
  },
  character: {
    width: parsePositiveSafeInteger(640),
    height: parsePositiveSafeInteger(960),
  },
} as const;

const propImageDimensionsV1 = {
  "mixing-console": { width: 422, height: 383 },
  "tape-machine": { width: 422, height: 385 },
  "wall-clock": { width: 397, height: 397 },
  microphone: { width: 403, height: 404 },
  "signal-light": { width: 425, height: 428 },
  antenna: { width: 398, height: 434 },
  "antenna-cable": { width: 434, height: 397 },
  "master-switch": { width: 434, height: 404 },
  "status-light": { width: 402, height: 400 },
} as const;

export const vnLastSoundCheckAssetSlotsV1: readonly AssetSlotDefinitionV1[] = [
  {
    assetId: vnLastSoundCheckAssetIdsV1.controlRoom,
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "control-room",
    ...imageDimensionsV1.background,
    loadGroup: "scene",
    safeArea: null,
    pivot: null,
  },
  {
    assetId: vnLastSoundCheckAssetIdsV1.rooftopAntenna,
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "rooftop-antenna",
    ...imageDimensionsV1.background,
    loadGroup: "scene",
    safeArea: null,
    pivot: null,
  },
  ...([
    [vnLastSoundCheckAssetIdsV1.linFocusedOpen, "lin-focused-open"],
    [vnLastSoundCheckAssetIdsV1.linFocusedClosed, "lin-focused-closed"],
    [vnLastSoundCheckAssetIdsV1.linRelieved, "lin-relieved"],
    [vnLastSoundCheckAssetIdsV1.zhouNeutral, "zhou-neutral"],
    [vnLastSoundCheckAssetIdsV1.zhouSoft, "zhou-soft"],
  ] as const).map(([assetId, fallbackToken]) => ({
    assetId,
    kind: "character" as const,
    usage: "character_pose" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken,
    ...imageDimensionsV1.character,
    loadGroup: "scene" as const,
    safeArea: null,
    pivot: { x: 0.5, y: 1 },
  })),
  ...(Object.entries(vnLastSoundCheckPropAssetIdsV1) as readonly [string, AssetId][]).map(
    ([fallbackToken, assetId]) => ({
      assetId,
      kind: "prop" as const,
      usage: "story_prop" as const,
      overridePolicy: "replaceable" as const,
      fallbackToken,
      width: parsePositiveSafeInteger(
        propImageDimensionsV1[fallbackToken as keyof typeof propImageDimensionsV1].width,
      ),
      height: parsePositiveSafeInteger(
        propImageDimensionsV1[fallbackToken as keyof typeof propImageDimensionsV1].height,
      ),
      loadGroup: "scene" as const,
      safeArea: null,
      pivot: { x: 0.5, y: 1 },
    }),
  ),
];

export const vnLastSoundCheckAssetPacksV1: readonly AssetPackV1[] = [
  {
    identity: {
      id: "pack.vn-last-sound-check.core-art",
      revision: parsePositiveSafeInteger(1),
    },
    providers: [
      {
        assetId: vnLastSoundCheckAssetIdsV1.controlRoom,
        runtimePath: "assets/images/control-room.webp",
        mediaType: "image/webp",
        ...imageDimensionsV1.background,
      },
      {
        assetId: vnLastSoundCheckAssetIdsV1.rooftopAntenna,
        runtimePath: "assets/images/rooftop-antenna.webp",
        mediaType: "image/webp",
        ...imageDimensionsV1.background,
      },
      ...([
        [vnLastSoundCheckAssetIdsV1.linFocusedOpen, "lin-focused-open.webp"],
        [vnLastSoundCheckAssetIdsV1.linFocusedClosed, "lin-focused-closed.webp"],
        [vnLastSoundCheckAssetIdsV1.linRelieved, "lin-relieved.webp"],
        [vnLastSoundCheckAssetIdsV1.zhouNeutral, "zhou-neutral.webp"],
        [vnLastSoundCheckAssetIdsV1.zhouSoft, "zhou-soft.webp"],
      ] as const).map(([assetId, filename]) => ({
        assetId,
        runtimePath: `assets/images/${filename}`,
        mediaType: "image/webp" as const,
        ...imageDimensionsV1.character,
      })),
      ...(Object.entries(vnLastSoundCheckPropAssetIdsV1) as readonly [string, AssetId][]).map(
        ([filename, assetId]) => ({
          assetId,
          runtimePath: `assets/images/prop-${filename}.webp`,
          mediaType: "image/webp" as const,
          width: parsePositiveSafeInteger(
            propImageDimensionsV1[filename as keyof typeof propImageDimensionsV1].width,
          ),
          height: parsePositiveSafeInteger(
            propImageDimensionsV1[filename as keyof typeof propImageDimensionsV1].height,
          ),
        }),
      ),
    ],
  },
];
