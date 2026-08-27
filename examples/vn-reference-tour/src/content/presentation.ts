// SPDX-License-Identifier: MIT
import type { TextCatalogSetV1, TextContentManifestV1 } from "@sillymaker/base";
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";
import type {
  StageContentCatalog,
  StageContentResolution,
  StageTargetChange,
  StageTransitionCatalog,
  StageTransitionDefinition,
} from "@sillymaker/base/story";
import { parseStageTransitionDefinition } from "@sillymaker/base/story";
import type { StageAmbientCatalog } from "@sillymaker/base/story/scene";

import {
  vnReferenceTourControlRoomAmbientCatalogV1,
  vnReferenceTourControlRoomTransitionBindingsV1,
} from "../scenes/control-room/index.ts";
import {
  vnReferenceTourRooftopAntennaAmbientCatalogV1,
  vnReferenceTourRooftopAntennaTransitionBindingsV1,
} from "../scenes/rooftop-antenna/index.ts";
import { vnReferenceTourAssetIdsV1, vnReferenceTourPropAssetIdsV1 } from "./assets.ts";
import { vnReferenceTourTextContentManifestV1 } from "./text-content.ts";

/**
 * Small bootstrap/UI copy stays resident. Narrative dialogue lives in
 * build-known text packs and is loaded through the Host before use.
 */
export const vnReferenceTourTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.vn-reference-tour.app.name", text: "最后一次试音" },
        { textId: "text.vn-reference-tour.stage.name", text: "山顶社区电台" },
        {
          textId: "text.vn-reference-tour.stage.background.control-room",
          text: "夜间控制室",
        },
        {
          textId: "text.vn-reference-tour.stage.background.rooftop-antenna",
          text: "清晨屋顶",
        },
        {
          textId: "text.vn-reference-tour.stage.effect.window-first-light",
          text: "窗外的清晨微光",
        },
        { textId: "text.vn-reference-tour.stage.prop.mixing-console", text: "调音台" },
        { textId: "text.vn-reference-tour.stage.prop.tape-machine", text: "磁带机" },
        { textId: "text.vn-reference-tour.stage.prop.wall-clock", text: "挂钟" },
        { textId: "text.vn-reference-tour.stage.prop.microphone", text: "话筒" },
        { textId: "text.vn-reference-tour.stage.prop.signal-light", text: "信号灯" },
        { textId: "text.vn-reference-tour.stage.prop.antenna", text: "天线" },
        { textId: "text.vn-reference-tour.stage.prop.antenna-cable", text: "天线电缆" },
        { textId: "text.vn-reference-tour.stage.prop.master-switch", text: "总闸" },
        { textId: "text.vn-reference-tour.stage.prop.status-light", text: "发射状态灯" },
        { textId: "text.vn-reference-tour.speaker.lin", text: "林澄" },
        { textId: "text.vn-reference-tour.speaker.zhou", text: "周遥" },
        { textId: "text.vn-reference-tour.narrative.advance", text: "继续" },
        { textId: "text.vn-reference-tour.playback.auto", text: "自动" },
        { textId: "text.vn-reference-tour.playback.skip", text: "快进" },
        { textId: "text.vn-reference-tour.playback.back", text: "回退" },
        { textId: "text.vn-reference-tour.playback.forward", text: "前进" },
        { textId: "text.vn-reference-tour.playback.history", text: "历史" },
        { textId: "text.vn-reference-tour.playback.voice", text: "语音" },
        { textId: "text.vn-reference-tour.playback.controls", text: "播放控制" },
        { textId: "text.vn-reference-tour.playback.show-ui", text: "显示对话界面" },
        { textId: "text.vn-reference-tour.playback.history.title", text: "对话历史" },
        { textId: "text.vn-reference-tour.playback.history.empty", text: "还没有对话。" },
        { textId: "text.vn-reference-tour.playback.history.close", text: "关闭历史" },
        { textId: "text.vn-reference-tour.ending.kicker", text: "播送完毕" },
        {
          textId: "text.vn-reference-tour.ending.summary",
          text: "信号已经安全收束。山顶社区电台再次安静下来。",
        },
        { textId: "text.vn-reference-tour.ending.return", text: "返回标题" },
        { textId: "text.vn-reference-tour.ending.returning", text: "正在返回…" },
        {
          textId: "text.vn-reference-tour.ending.return-failed",
          text: "暂时无法返回标题，请重试。",
        },
        { textId: "text.vn-reference-tour.system.label", text: "系统" },
        { textId: "text.vn-reference-tour.system.save", text: "保存" },
        { textId: "text.vn-reference-tour.system.settings", text: "设置" },
        { textId: "text.vn-reference-tour.system.settings-empty", text: "暂无可配置项。" },
        { textId: "text.vn-reference-tour.system.mute", text: "静音" },
        { textId: "text.vn-reference-tour.title.new-game", text: "新游戏" },
        {
          textId: "text.vn-reference-tour.title.new-game-failed",
          text: "暂时无法开始新游戏，请重试。",
        },
        { textId: "text.vn-reference-tour.title.continue", text: "继续游戏" },
        { textId: "text.vn-reference-tour.title.load", text: "读取存档" },
        { textId: "text.vn-reference-tour.system.close", text: "关闭" },
      ],
    },
    {
      locale: "en",
      fallbackLocale: "zh-CN",
      entries: [
        { textId: "text.vn-reference-tour.app.name", text: "One Last Sound Check" },
        { textId: "text.vn-reference-tour.stage.name", text: "Mountaintop Community Radio" },
        {
          textId: "text.vn-reference-tour.stage.background.control-room",
          text: "Night control room",
        },
        {
          textId: "text.vn-reference-tour.stage.background.rooftop-antenna",
          text: "Rooftop at dawn",
        },
        {
          textId: "text.vn-reference-tour.stage.effect.window-first-light",
          text: "First light outside the window",
        },
        { textId: "text.vn-reference-tour.stage.prop.mixing-console", text: "Mixing console" },
        { textId: "text.vn-reference-tour.stage.prop.tape-machine", text: "Tape machine" },
        { textId: "text.vn-reference-tour.stage.prop.wall-clock", text: "Wall clock" },
        { textId: "text.vn-reference-tour.stage.prop.microphone", text: "Microphone" },
        { textId: "text.vn-reference-tour.stage.prop.signal-light", text: "Signal light" },
        { textId: "text.vn-reference-tour.stage.prop.antenna", text: "Antenna" },
        { textId: "text.vn-reference-tour.stage.prop.antenna-cable", text: "Antenna cable" },
        { textId: "text.vn-reference-tour.stage.prop.master-switch", text: "Master switch" },
        {
          textId: "text.vn-reference-tour.stage.prop.status-light",
          text: "Transmitter status light",
        },
        { textId: "text.vn-reference-tour.speaker.lin", text: "Lin Cheng" },
        { textId: "text.vn-reference-tour.speaker.zhou", text: "Zhou Yao" },
        { textId: "text.vn-reference-tour.narrative.advance", text: "Continue" },
        { textId: "text.vn-reference-tour.playback.auto", text: "Auto" },
        { textId: "text.vn-reference-tour.playback.skip", text: "Skip" },
        { textId: "text.vn-reference-tour.playback.back", text: "Back" },
        { textId: "text.vn-reference-tour.playback.forward", text: "Forward" },
        { textId: "text.vn-reference-tour.playback.history", text: "History" },
        { textId: "text.vn-reference-tour.playback.voice", text: "Voice" },
        { textId: "text.vn-reference-tour.playback.controls", text: "Playback controls" },
        { textId: "text.vn-reference-tour.playback.show-ui", text: "Show dialogue interface" },
        { textId: "text.vn-reference-tour.playback.history.title", text: "Dialogue history" },
        { textId: "text.vn-reference-tour.playback.history.empty", text: "No dialogue yet." },
        { textId: "text.vn-reference-tour.playback.history.close", text: "Close history" },
        { textId: "text.vn-reference-tour.ending.kicker", text: "Broadcast complete" },
        {
          textId: "text.vn-reference-tour.ending.summary",
          text: "The signal has safely concluded. Mountaintop Community Radio is quiet once more.",
        },
        { textId: "text.vn-reference-tour.ending.return", text: "Return to title" },
        { textId: "text.vn-reference-tour.ending.returning", text: "Returning…" },
        {
          textId: "text.vn-reference-tour.ending.return-failed",
          text: "Unable to return to the title. Try again.",
        },
        { textId: "text.vn-reference-tour.system.label", text: "System" },
        { textId: "text.vn-reference-tour.system.save", text: "Save" },
        { textId: "text.vn-reference-tour.system.settings", text: "Settings" },
        { textId: "text.vn-reference-tour.system.settings-empty", text: "No settings available." },
        { textId: "text.vn-reference-tour.system.mute", text: "Mute" },
        { textId: "text.vn-reference-tour.title.new-game", text: "New game" },
        {
          textId: "text.vn-reference-tour.title.new-game-failed",
          text: "Unable to start a new game. Try again.",
        },
        { textId: "text.vn-reference-tour.title.continue", text: "Continue" },
        { textId: "text.vn-reference-tour.title.load", text: "Load game" },
        { textId: "text.vn-reference-tour.system.close", text: "Close" },
      ],
    },
  ],
});

/**
 * The stage content catalog: the only place that knows renderer IDs and
 * accessible names for stage content. Authoritative stage state stores
 * contentIds only.
 */
export function createVnReferenceTourStageContentCatalogV1(
  resolveText?: (textId: string) => string,
): StageContentCatalog {
  const accessibleName = (textId: string, fallback: string): string =>
    resolveText?.(textId) ?? fallback;
  return {
    resolveContent(contentId, appearance): StageContentResolution | null {
      switch (contentId as string) {
        case "content.vn-reference-tour.background.control-room":
          return ({
            rendererId: "renderer.vn-reference-tour.background",
            assetIds: [vnReferenceTourAssetIdsV1.controlRoom],
            accessibleName: accessibleName(
              "text.vn-reference-tour.stage.background.control-room",
              "夜间控制室",
            ),
            props: {
              surface: "control-room",
              assetId: vnReferenceTourAssetIdsV1.controlRoom,
            },
            geometry: {
              width: 1600,
              height: 900,
              anchorXPermille: 0,
              anchorYPermille: 0,
            },
          });
        case "content.vn-reference-tour.background.rooftop-antenna":
          return ({
            rendererId: "renderer.vn-reference-tour.background",
            assetIds: [vnReferenceTourAssetIdsV1.rooftopAntenna],
            accessibleName: accessibleName(
              "text.vn-reference-tour.stage.background.rooftop-antenna",
              "清晨屋顶",
            ),
            props: {
              surface: "rooftop-antenna",
              assetId: vnReferenceTourAssetIdsV1.rooftopAntenna,
            },
            geometry: {
              width: 1600,
              height: 900,
              anchorXPermille: 0,
              anchorYPermille: 0,
            },
          });
        case "content.vn-reference-tour.effect.window-first-light":
          return ({
            rendererId: "renderer.vn-reference-tour.light",
            assetIds: [],
            accessibleName: accessibleName(
              "text.vn-reference-tour.stage.effect.window-first-light",
              "窗外的清晨微光",
            ),
            props: {},
            geometry: {
              width: 310,
              height: 360,
              anchorXPermille: 0,
              anchorYPermille: 0,
            },
          });
        case "content.vn-reference-tour.prop.mixing-console":
        case "content.vn-reference-tour.prop.tape-machine":
        case "content.vn-reference-tour.prop.wall-clock":
        case "content.vn-reference-tour.prop.microphone":
        case "content.vn-reference-tour.prop.signal-light":
        case "content.vn-reference-tour.prop.antenna":
        case "content.vn-reference-tour.prop.antenna-cable":
        case "content.vn-reference-tour.prop.master-switch":
        case "content.vn-reference-tour.prop.status-light": {
          const kind = (contentId as string).split(".").at(-1) ?? "prop";
          const names: Readonly<Record<string, readonly [textId: string, fallback: string]>> = {
            "mixing-console": ["text.vn-reference-tour.stage.prop.mixing-console", "调音台"],
            "tape-machine": ["text.vn-reference-tour.stage.prop.tape-machine", "磁带机"],
            "wall-clock": ["text.vn-reference-tour.stage.prop.wall-clock", "挂钟"],
            microphone: ["text.vn-reference-tour.stage.prop.microphone", "话筒"],
            "signal-light": ["text.vn-reference-tour.stage.prop.signal-light", "信号灯"],
            antenna: ["text.vn-reference-tour.stage.prop.antenna", "天线"],
            "antenna-cable": ["text.vn-reference-tour.stage.prop.antenna-cable", "天线电缆"],
            "master-switch": ["text.vn-reference-tour.stage.prop.master-switch", "总闸"],
            "status-light": ["text.vn-reference-tour.stage.prop.status-light", "发射状态灯"],
          };
          const name = names[kind];
          const assetId = vnReferenceTourPropAssetIdsV1[
            kind as keyof typeof vnReferenceTourPropAssetIdsV1
          ];
          return ({
            rendererId: "renderer.vn-reference-tour.prop",
            assetIds: [assetId],
            accessibleName: name === undefined ? kind : accessibleName(name[0], name[1]),
            props: {
              kind,
              state: typeof appearance.state === "string" ? appearance.state : "default",
              assetId,
            },
            geometry: {
              width: kind === "antenna"
                ? 150
                : kind === "antenna-cable"
                ? 180
                : kind === "mixing-console" || kind === "tape-machine"
                ? 185
                : kind === "wall-clock"
                ? 100
                : kind === "microphone"
                ? 90
                : 100,
              height: kind === "antenna"
                ? 360
                : kind === "antenna-cable"
                ? 165
                : kind === "mixing-console" || kind === "tape-machine"
                ? 165
                : kind === "wall-clock"
                ? 100
                : kind === "microphone"
                ? 128
                : 100,
              anchorXPermille: 500,
              anchorYPermille: 1000,
            },
          });
        }
        case "content.vn-reference-tour.character.lin":
        case "content.vn-reference-tour.character.zhou": {
          const lin = (contentId as string).endsWith(".lin");
          const expression = typeof appearance.expression === "string"
            ? appearance.expression
            : lin
            ? "focused"
            : "neutral";
          const assetId = lin
            ? expression === "relieved"
              ? vnReferenceTourAssetIdsV1.linRelieved
              : vnReferenceTourAssetIdsV1.linFocusedOpen
            : expression === "soft"
            ? vnReferenceTourAssetIdsV1.zhouSoft
            : vnReferenceTourAssetIdsV1.zhouNeutral;
          return ({
            rendererId: "renderer.vn-reference-tour.character",
            assetIds: [assetId],
            accessibleName: lin
              ? accessibleName("text.vn-reference-tour.speaker.lin", "林澄")
              : accessibleName("text.vn-reference-tour.speaker.zhou", "周遥"),
            props: {
              character: lin ? "lin" : "zhou",
              expression,
              assetId,
            },
            geometry: {
              width: 400,
              height: 650,
              anchorXPermille: 500,
              anchorYPermille: 1000,
            },
            ...(lin && expression === "focused"
              ? {
                frameAssetIds: [
                  vnReferenceTourAssetIdsV1.linFocusedOpen,
                  vnReferenceTourAssetIdsV1.linFocusedClosed,
                ],
              }
              : {}),
          });
        }
        default:
          return null;
      }
    },
  };
}

/** Default-locale catalog used by authoring and headless projections. */
export const vnReferenceTourStageContentCatalogV1 = createVnReferenceTourStageContentCatalogV1();

const transitionDefinitionsV1: readonly StageTransitionDefinition[] = [
  {
    transitionId: "transition.vn-reference-tour.crossfade",
    kind: "crossfade",
    durationMs: 400,
    easing: "ease_in_out",
    inputPolicy: "block",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: false,
    slide: null,
  },
].map((definition, index) =>
  parseStageTransitionDefinition(definition, `/transitions/${String(index)}`)
);

/**
 * Cue-bound transitions remain owned by the two Scene documents. The
 * story-wide rule only crossfades content replacements; other unbound edges
 * cut instead of inheriting a character motion.
 */
const sceneTransitionBindingsV1 = [
  vnReferenceTourControlRoomTransitionBindingsV1,
  vnReferenceTourRooftopAntennaTransitionBindingsV1,
] as const;
const transitionByIdV1: ReadonlyMap<string, StageTransitionDefinition> = new Map(
  [
    ...transitionDefinitionsV1,
    ...sceneTransitionBindingsV1.flatMap((binding) => binding.definitions),
  ].map(
    (definition) => [definition.transitionId, definition],
  ),
);

export const vnReferenceTourStageTransitionCatalogV1: StageTransitionCatalog = {
  resolveTransition(change: StageTargetChange): StageTransitionDefinition | null {
    for (const binding of sceneTransitionBindingsV1) {
      const cueBound = binding.resolveTransition(change);
      if (cueBound !== null) return cueBound;
    }
    if (change.kind === "replace") {
      return transitionByIdV1.get("transition.vn-reference-tour.crossfade") ?? null;
    }
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinition | null {
    return transitionByIdV1.get(transitionId) ?? null;
  },
};

export const vnReferenceTourStageAmbientCatalogV1: StageAmbientCatalog = {
  resolveAmbient(layerId, entry) {
    return vnReferenceTourControlRoomAmbientCatalogV1.resolveAmbient(layerId, entry) ??
      vnReferenceTourRooftopAntennaAmbientCatalogV1.resolveAmbient(layerId, entry);
  },
};

export const vnReferenceTourPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface VnReferenceTourPresentationProgramV1 {
  readonly kind: "vn-reference-tour-presentation";
  readonly textCatalogs: TextCatalogSetV1;
  readonly textContentManifest: TextContentManifestV1;
}

export function materializeVnReferenceTourPresentationV1(): VnReferenceTourPresentationProgramV1 {
  return ({
    kind: "vn-reference-tour-presentation",
    textCatalogs: vnReferenceTourTextCatalogsV1,
    textContentManifest: vnReferenceTourTextContentManifestV1,
  });
}
