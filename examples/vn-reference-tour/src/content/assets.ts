// SPDX-License-Identifier: MIT
import type { AssetId, AssetPackV1, AssetSlotDefinitionV1 } from "@sillymaker/base";
import { parsePositiveSafeInteger } from "@sillymaker/base";

export const vnReferenceTourAssetIdsV1 = {
  controlRoom: "asset.vn-reference-tour.background.control-room" as AssetId,
  rooftopAntenna: "asset.vn-reference-tour.background.rooftop-antenna" as AssetId,
  linFocusedOpen: "asset.vn-reference-tour.character.lin.focused.open" as AssetId,
  linFocusedClosed: "asset.vn-reference-tour.character.lin.focused.closed" as AssetId,
  linRelieved: "asset.vn-reference-tour.character.lin.relieved" as AssetId,
  zhouNeutral: "asset.vn-reference-tour.character.zhou.neutral" as AssetId,
  zhouSoft: "asset.vn-reference-tour.character.zhou.soft" as AssetId,
  mixingConsole: "asset.vn-reference-tour.prop.mixing-console" as AssetId,
  tapeMachine: "asset.vn-reference-tour.prop.tape-machine" as AssetId,
  wallClock: "asset.vn-reference-tour.prop.wall-clock" as AssetId,
  microphone: "asset.vn-reference-tour.prop.microphone" as AssetId,
  signalLight: "asset.vn-reference-tour.prop.signal-light" as AssetId,
  antenna: "asset.vn-reference-tour.prop.antenna" as AssetId,
  antennaCable: "asset.vn-reference-tour.prop.antenna-cable" as AssetId,
  masterSwitch: "asset.vn-reference-tour.prop.master-switch" as AssetId,
  statusLight: "asset.vn-reference-tour.prop.status-light" as AssetId,
} as const;

export const vnReferenceTourPropAssetIdsV1 = {
  "mixing-console": vnReferenceTourAssetIdsV1.mixingConsole,
  "tape-machine": vnReferenceTourAssetIdsV1.tapeMachine,
  "wall-clock": vnReferenceTourAssetIdsV1.wallClock,
  microphone: vnReferenceTourAssetIdsV1.microphone,
  "signal-light": vnReferenceTourAssetIdsV1.signalLight,
  antenna: vnReferenceTourAssetIdsV1.antenna,
  "antenna-cable": vnReferenceTourAssetIdsV1.antennaCable,
  "master-switch": vnReferenceTourAssetIdsV1.masterSwitch,
  "status-light": vnReferenceTourAssetIdsV1.statusLight,
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

export const vnReferenceTourAssetSlotsV1: readonly AssetSlotDefinitionV1[] = [
  {
    assetId: vnReferenceTourAssetIdsV1.controlRoom,
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
    assetId: vnReferenceTourAssetIdsV1.rooftopAntenna,
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
    [vnReferenceTourAssetIdsV1.linFocusedOpen, "lin-focused-open"],
    [vnReferenceTourAssetIdsV1.linFocusedClosed, "lin-focused-closed"],
    [vnReferenceTourAssetIdsV1.linRelieved, "lin-relieved"],
    [vnReferenceTourAssetIdsV1.zhouNeutral, "zhou-neutral"],
    [vnReferenceTourAssetIdsV1.zhouSoft, "zhou-soft"],
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
  ...(Object.entries(vnReferenceTourPropAssetIdsV1) as readonly [string, AssetId][]).map(
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

export const vnReferenceTourAssetPacksV1: readonly AssetPackV1[] = [
  {
    identity: {
      id: "pack.vn-reference-tour.core-art",
      revision: parsePositiveSafeInteger(1),
    },
    providers: [
      {
        assetId: vnReferenceTourAssetIdsV1.controlRoom,
        runtimePath: "assets/images/control-room.webp",
        mediaType: "image/webp",
        ...imageDimensionsV1.background,
      },
      {
        assetId: vnReferenceTourAssetIdsV1.rooftopAntenna,
        runtimePath: "assets/images/rooftop-antenna.webp",
        mediaType: "image/webp",
        ...imageDimensionsV1.background,
      },
      ...([
        [vnReferenceTourAssetIdsV1.linFocusedOpen, "lin-focused-open.webp"],
        [vnReferenceTourAssetIdsV1.linFocusedClosed, "lin-focused-closed.webp"],
        [vnReferenceTourAssetIdsV1.linRelieved, "lin-relieved.webp"],
        [vnReferenceTourAssetIdsV1.zhouNeutral, "zhou-neutral.webp"],
        [vnReferenceTourAssetIdsV1.zhouSoft, "zhou-soft.webp"],
      ] as const).map(([assetId, filename]) => ({
        assetId,
        runtimePath: `assets/images/${filename}`,
        mediaType: "image/webp" as const,
        ...imageDimensionsV1.character,
      })),
      ...(Object.entries(vnReferenceTourPropAssetIdsV1) as readonly [string, AssetId][]).map(
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
