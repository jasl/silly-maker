// SPDX-License-Identifier: MIT
import type {
  AssetId,
  ResolvedAudioManifestV1,
  StageAmbientCatalogV1,
  StageContentCatalogV1,
  StageContentResolutionV1,
  StageTargetChangeV1,
  StageTransitionCatalogV1,
  StageTransitionDefinitionV1,
  TextCatalogSetV1,
  TimelineCatalogV1,
  TimelineDefinitionV1,
} from "@sillymaker/base";
import {
  definePresentationPatchSurface,
  motionDefinitionFromDocumentV1,
  motionStageTransitionV1,
  parseMotionDocumentV1,
  parsePositiveSafeInteger,
  parseRegionsDocumentV1,
  parseStageTransitionDefinitionV1,
  parseTextCatalogSetV1,
  resolveAudioManifestV1,
  timelineV1,
} from "@sillymaker/base";

import labBeaconFramesMotionJsonV1 from "./motions/beacon-frames.motion.json" with {
  type: "json",
};
import labCharEnterMotionDocumentV1 from "./motions/char-enter.motion.json" with { type: "json" };
import labCrateZonesRegionsJsonV1 from "./regions/crate-zones.regions.json" with { type: "json" };
import { labStageContentIdsV1 } from "./stage-ids.ts";

export const labTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.e2e.lab.stage.name", text: "引擎实验室" },
        { textId: "text.e2e.lab.action.collect_sample", text: "采集样本" },
        { textId: "text.e2e.lab.action.begin_procedure", text: "开始流程" },
        { textId: "text.e2e.lab.action.advance_procedure", text: "推进流程" },
        { textId: "text.e2e.lab.action.run_experiment", text: "进行实验" },
        { textId: "text.e2e.lab.action.begin_calibration", text: "开始校准" },
        { textId: "text.e2e.lab.narrative.speaker.alpha", text: "研究员甲" },
        { textId: "text.e2e.lab.narrative.speaker.beta", text: "研究员乙" },
        { textId: "text.e2e.lab.narrative.cal.beta", text: "样本读数稳定，可以开始校准。" },
        { textId: "text.e2e.lab.narrative.cal.beta.warm", text: "又见面了，这次一定更顺利。" },
        { textId: "text.e2e.lab.action.sell_sample", text: "出售样本" },
        { textId: "text.e2e.lab.action.buy_banner", text: "购买横幅" },
        { textId: "text.e2e.lab.overlay.shop.title", text: "补给站" },
        { textId: "text.e2e.lab.overlay.shop.open", text: "补给站" },
        { textId: "text.e2e.lab.overlay.shop.balance", text: "信用点" },
        { textId: "text.e2e.lab.narrative.cal.intro", text: "需要校准信标，请跟我来。" },
        { textId: "text.e2e.lab.narrative.cal.approach", text: "选择校准方式" },
        { textId: "text.e2e.lab.narrative.cal.basic", text: "直接校准" },
        { textId: "text.e2e.lab.narrative.cal.precise", text: "精密校准" },
        { textId: "text.e2e.lab.narrative.cal.precise.locked", text: "需要至少一份样本" },
        { textId: "text.e2e.lab.narrative.cal.cancel", text: "先返回" },
        { textId: "text.e2e.lab.narrative.cal.done", text: "校准完成，信标已就绪。" },
        { textId: "text.e2e.lab.narrative.cal.waiting", text: "等待设备稳定…" },
        { textId: "text.e2e.lab.narrative.cal.skip", text: "跳过等待" },
        { textId: "text.e2e.lab.narrative.cal.advance", text: "继续" },
        { textId: "text.e2e.lab.narrative.cal.dial", text: "选择校准档位" },
        { textId: "text.e2e.lab.narrative.drill.chamber", text: "环境采样进行中，保持观察。" },
        { textId: "text.e2e.lab.narrative.drill.decision", text: "蓄力就绪后释放校准脉冲" },
        { textId: "text.e2e.lab.narrative.drill.release", text: "释放脉冲" },
        { textId: "text.e2e.lab.narrative.drill.vent", text: "放空蓄力" },
        { textId: "text.e2e.lab.narrative.drill.vigil", text: "守夜观测" },
        { textId: "text.e2e.lab.narrative.drill.stakeout", text: "蹲守收集器" },
        { textId: "text.e2e.lab.narrative.drill.catch", text: "有动静——正好抓个正着。" },
        { textId: "text.e2e.lab.narrative.drill.quiet", text: "一夜无事，按计划收尾。" },
        { textId: "text.e2e.lab.narrative.drill.result", text: "脉冲释放完毕。" },
        { textId: "text.e2e.lab.action.begin_drill", text: "开始演习" },
        { textId: "text.e2e.lab.action.toggle_collector", text: "切换收集器" },
        { textId: "text.e2e.lab.monitors.gauge", text: "蓄力" },
        { textId: "text.e2e.lab.monitors.ambient", text: "环境自燃" },
        { textId: "text.e2e.lab.monitors.collector", text: "收集器" },
        { textId: "text.e2e.lab.player.controls", text: "播放控制" },
        { textId: "text.e2e.lab.player.rollback", text: "回退一步" },
        { textId: "text.e2e.lab.player.auto", text: "自动" },
        { textId: "text.e2e.lab.player.skip", text: "跳过模式" },
        { textId: "text.e2e.lab.player.history", text: "回顾记录" },
        { textId: "text.e2e.lab.player.hide_ui", text: "隐藏界面" },
        { textId: "text.e2e.lab.player.show_ui", text: "显示界面" },
        { textId: "text.e2e.lab.player.replay_voice", text: "重播语音" },
        { textId: "text.e2e.lab.hud.samples", text: "样本" },
        { textId: "text.e2e.lab.hud.steps", text: "流程进度" },
        { textId: "text.e2e.lab.overlay.journal.title", text: "实验日志" },
        { textId: "text.e2e.lab.overlay.journal.open", text: "实验日志" },
        { textId: "text.e2e.lab.overlay.conformance.home.title", text: "观测台" },
        { textId: "text.e2e.lab.overlay.conformance.home.open", text: "打开观测台" },
        { textId: "text.e2e.lab.overlay.conformance.alternate.title", text: "分析台" },
        { textId: "text.e2e.lab.overlay.conformance.alternate.open", text: "打开分析台" },
        { textId: "text.e2e.lab.overlay.conformance.detail.title", text: "样本详情" },
        { textId: "text.e2e.lab.overlay.conformance.detail.open", text: "打开样本详情" },
        { textId: "text.e2e.lab.overlay.conformance.detail.action", text: "检查样本" },
        { textId: "text.e2e.lab.overlay.conformance.locked.title", text: "校验步骤" },
        { textId: "text.e2e.lab.overlay.conformance.locked.open", text: "打开校验步骤" },
        { textId: "text.e2e.lab.overlay.conformance.locked.complete", text: "完成校验步骤" },
        { textId: "text.e2e.lab.overlay.conformance.restart", text: "重置观测会话" },
        { textId: "text.e2e.lab.whole-canvas.home.title", text: "Whole Canvas 首页" },
        { textId: "text.e2e.lab.whole-canvas.status.title", text: "Whole Canvas 状态" },
        { textId: "text.e2e.lab.whole-canvas.storage.title", text: "Whole Canvas 存储" },
        {
          textId: "text.e2e.lab.whole-canvas.specimen-catalog.title",
          text: "Whole Canvas 标本目录",
        },
        {
          textId: "text.e2e.lab.whole-canvas.specimen-detail.title",
          text: "Whole Canvas 标本详情",
        },
        { textId: "text.e2e.lab.whole-canvas.primary.body", text: "中性主页面替换验证" },
        {
          textId: "text.e2e.lab.whole-canvas.specimen-detail.body",
          text: "标本 Alpha 的 transient exact-parent detail",
        },
        { textId: "text.e2e.lab.whole-canvas.navigation", text: "Whole Canvas 导航" },
        { textId: "text.e2e.lab.whole-canvas.show-home", text: "显示首页" },
        { textId: "text.e2e.lab.whole-canvas.show-status", text: "显示状态" },
        { textId: "text.e2e.lab.whole-canvas.show-storage", text: "显示存储" },
        {
          textId: "text.e2e.lab.whole-canvas.show-specimen-catalog",
          text: "显示标本目录",
        },
        {
          textId: "text.e2e.lab.whole-canvas.open-specimen-detail",
          text: "打开标本详情",
        },
        { textId: "text.e2e.lab.whole-canvas.back", text: "返回标本目录" },
        { textId: "text.e2e.lab.whole-canvas.close", text: "关闭 Whole Canvas" },
        { textId: "text.e2e.lab.whole-canvas.restart", text: "重启 Whole Canvas 会话" },
        { textId: "text.e2e.lab.narrative.completed", text: "全部流程已完成。" },
      ],
    },
  ],
});

export const labAssetSlotsV1 = Object.freeze([
  Object.freeze({
    assetId: "asset.e2e.lab.background",
    kind: "background" as const,
    usage: "scene_background" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.e2e.lab.background",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
]);

/** Lab researchers share one content box, anchored at bottom center. */
const labCharacterGeometryV1 = Object.freeze({
  width: 220,
  height: 360,
  anchorXPermille: 500,
  anchorYPermille: 1000,
});

/** 160×120 content plus the renderer's 3px border on each side. */
const labSmallPropGeometryV1 = Object.freeze({
  width: 166,
  height: 126,
  anchorXPermille: 500,
  anchorYPermille: 1000,
});

/**
 * Shaped-hit-regions drill: the crate's collection port is a beveled
 * octagon with a hover-reveal glow, authored as a `sillymaker.regions`
 * Document and bound here — the Document-to-`resolveContent` path the
 * lane's contract describes (binding stays in Story code, like motion
 * documents binding cues).
 */
const labCrateZonesRegionsV1 = parseRegionsDocumentV1(
  labCrateZonesRegionsJsonV1,
  "/regions/crate-zones",
);

/**
 * Deterministic Story catalog resolving semantic stage content into renderer
 * bindings. Only this projection layer knows renderer IDs, asset IDs, and
 * accessible names; authoritative stage state never carries them.
 */
export const labStageContentCatalogV1: StageContentCatalogV1 = {
  resolveContent(contentId, appearance): StageContentResolutionV1 | null {
    switch (contentId as string) {
      case labStageContentIdsV1.backgroundLab:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-background",
          assetIds: Object.freeze(["asset.e2e.lab.background" as AssetId]),
          accessibleName: "引擎实验室",
          props: Object.freeze({ surface: "lab" }),
        });
      case labStageContentIdsV1.backgroundStoreroom:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-background",
          assetIds: Object.freeze([]),
          accessibleName: "储藏室",
          props: Object.freeze({ surface: "storeroom" }),
        });
      case labStageContentIdsV1.characterAlpha:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-character",
          assetIds: Object.freeze([]),
          accessibleName: "研究员甲",
          props: Object.freeze({
            pose: typeof appearance.pose === "string" ? appearance.pose : "standing",
            expression: typeof appearance.expression === "string"
              ? appearance.expression
              : "neutral",
          }),
          geometry: labCharacterGeometryV1,
          // Authorable-frame-set drill (one-shot): the entrance motion's
          // frame track steps through these while the edge is in flight.
          // Beta declares no frame set on purpose — its identical entrance
          // must deliver a null frame index (conformance for the no-frame
          // path).
          frameAssetIds: Object.freeze([
            "asset.e2e.lab.char-stand" as AssetId,
            "asset.e2e.lab.char-step" as AssetId,
          ]),
        });
      case labStageContentIdsV1.characterBeta:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-character",
          assetIds: Object.freeze([]),
          accessibleName: "研究员乙",
          props: Object.freeze({
            pose: typeof appearance.pose === "string" ? appearance.pose : "standing",
            expression: typeof appearance.expression === "string"
              ? appearance.expression
              : "neutral",
          }),
          geometry: labCharacterGeometryV1,
        });
      case labStageContentIdsV1.propCrate:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-prop",
          assetIds: Object.freeze([]),
          accessibleName: "样本箱",
          props: Object.freeze({}),
          geometry: labSmallPropGeometryV1,
          hitRegions: labCrateZonesRegionsV1.regions,
        });
      case labStageContentIdsV1.propBanner:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-prop",
          assetIds: Object.freeze([]),
          accessibleName: "纪念横幅",
          props: Object.freeze({ variant: "banner" }),
          // 420×72 content plus the renderer's 3px border on each side.
          geometry: Object.freeze({
            width: 426,
            height: 78,
            anchorXPermille: 500,
            anchorYPermille: 1000,
          }),
        });
      case labStageContentIdsV1.propBeacon:
        return Object.freeze({
          rendererId: "renderer.e2e.lab.stage-prop",
          assetIds: Object.freeze([]),
          accessibleName: "校准信标",
          props: Object.freeze({
            mode: typeof appearance.mode === "string" ? appearance.mode : "idle",
          }),
          geometry: labSmallPropGeometryV1,
          // Authorable-frame-set drill (loop): the ambient binding below
          // cycles dim/lit through these two frames.
          frameAssetIds: Object.freeze([
            "asset.e2e.lab.beacon-dim" as AssetId,
            "asset.e2e.lab.beacon-lit" as AssetId,
          ]),
        });
      default:
        return null;
    }
  },
};

const labTransitionDefinitionsV1: readonly StageTransitionDefinitionV1[] = Object.freeze(
  [
    {
      transitionId: "transition.e2e.bg-crossfade",
      kind: "crossfade",
      durationMs: 400,
      easing: "ease_in_out",
      inputPolicy: "block",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: true,
      slide: null,
    },
    {
      transitionId: "transition.e2e.entry-fade",
      kind: "crossfade",
      durationMs: 200,
      easing: "linear",
      inputPolicy: "skip_to_end",
      interruption: "cancel_to_target",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: null,
    },
    {
      transitionId: "transition.e2e.move",
      kind: "slide",
      durationMs: 250,
      easing: "ease_in_out",
      inputPolicy: "target_active",
      interruption: "settle_and_retarget",
      reducedMotion: { kind: "settle" },
      readiness: { kind: "immediate" },
      acknowledge: false,
      slide: { x: 0, y: 0 },
    },
  ].map((definition, index) =>
    parseStageTransitionDefinitionV1(definition, `/transitions/${String(index)}`)
  ),
);

/**
 * The R5+ Motion vertical: the character entrance is an authorable motion
 * asset (`motions/char-enter.motion.json`) bound to the enter edge. The
 * asset owns keyframes and timing; this binding owns edge behavior.
 */
const labCharEnterTransitionV1 = motionStageTransitionV1({
  transitionId: "transition.e2e.char-enter",
  motion: labCharEnterMotionDocumentV1,
});

const labTransitionByIdV1: ReadonlyMap<string, StageTransitionDefinitionV1> = new Map(
  [...labTransitionDefinitionsV1, labCharEnterTransitionV1].map(
    (definition) => [definition.transitionId, definition],
  ),
);

function requireLabTransitionV1(transitionId: string): StageTransitionDefinitionV1 {
  const definition = labTransitionByIdV1.get(transitionId);
  if (definition === undefined) throw new TypeError(`e2e.transition_missing:${transitionId}`);
  return definition;
}

/**
 * The Engine Lab transition catalog: background replaces crossfade (and
 * acknowledge on completion), characters slide in, exits fade out, moves
 * interpolate, appearance changes cut.
 */
export const labStageTransitionCatalogV1: StageTransitionCatalogV1 = {
  resolveTransition(change: StageTargetChangeV1): StageTransitionDefinitionV1 | null {
    if (change.kind === "replace") return requireLabTransitionV1("transition.e2e.bg-crossfade");
    if (change.kind === "enter") {
      return change.layerId === "layer.e2e.characters"
        ? requireLabTransitionV1("transition.e2e.char-enter")
        : requireLabTransitionV1("transition.e2e.entry-fade");
    }
    if (change.kind === "exit") return requireLabTransitionV1("transition.e2e.entry-fade");
    if (change.kind === "move") return requireLabTransitionV1("transition.e2e.move");
    return null;
  },
  resolveTransitionById(transitionId: string): StageTransitionDefinitionV1 | null {
    return labTransitionByIdV1.get(transitionId) ?? null;
  },
};

const labBeaconFramesMotionV1 = motionDefinitionFromDocumentV1(
  parseMotionDocumentV1(labBeaconFramesMotionJsonV1, "/motions/beacon-frames"),
);

/**
 * The Engine Lab ambient catalog (authorable-frame-set drill, loop
 * archetype): the settled beacon cycles its dim/lit frame set on the
 * presentation clock. Purely decorative — no commands, no authoritative
 * state, no Save/digest/replay bytes.
 */
export const labStageAmbientCatalogV1: StageAmbientCatalogV1 = {
  resolveAmbient(_layerId, entry) {
    return (entry.contentId as string) === labStageContentIdsV1.propBeacon
      ? Object.freeze({ motion: labBeaconFramesMotionV1, phaseMs: 0 })
      : null;
  },
};

/**
 * The Engine Lab audio manifest: every slot currently resolves to the
 * silence fallback (no runtime audio files ship with the conformance
 * story), which exercises the typed contract and the degrade paths without
 * media bytes.
 */
export const labAudioManifestV1: ResolvedAudioManifestV1 = resolveAudioManifestV1(
  [
    { assetId: "audio.e2e.bgm.lab", kind: "music", fallback: "silence", loadGroup: "bootstrap" },
    {
      assetId: "audio.e2e.bgm.storeroom",
      kind: "music",
      fallback: "silence",
      loadGroup: "scene",
    },
    {
      assetId: "audio.e2e.ambient.hum",
      kind: "ambient",
      fallback: "silence",
      loadGroup: "scene",
    },
    {
      assetId: "audio.e2e.voice.cal-intro",
      kind: "voice",
      fallback: "silence",
      loadGroup: "on_demand",
    },
    {
      assetId: "audio.e2e.voice.cal-done",
      kind: "voice",
      fallback: "silence",
      loadGroup: "on_demand",
    },
    { assetId: "audio.e2e.sfx.chime", kind: "sfx", fallback: "silence", loadGroup: "on_demand" },
    {
      assetId: "audio.e2e.sfx.fanfare",
      kind: "sfx",
      fallback: "silence",
      loadGroup: "on_demand",
    },
  ],
  [],
);

/**
 * The Engine Lab timeline catalog: one decorative cue proving the R5
 * Timeline vertically — the calibrated beacon pulses twice and rings a
 * chime event. Overlay-only: no gameplay State, nothing saved.
 */
export const labBeaconPulseCueIdV1 = "cue.e2e.beacon-pulse";
export const labBeaconChimeEventIdV1 = "event.e2e.beacon-chime";

const labBeaconTargetV1 = timelineV1.entry("layer.e2e.props", "tag.e2e.beacon");

const labBeaconPulseTimelineV1: TimelineDefinitionV1 = timelineV1.define(
  labBeaconPulseCueIdV1,
  timelineV1.sequence(
    timelineV1.event(labBeaconChimeEventIdV1),
    timelineV1.repeat(
      2,
      timelineV1.sequence(
        timelineV1.tween({
          target: labBeaconTargetV1,
          property: "scalePermille",
          to: 1250,
          durationMs: 160,
          easing: "ease_in_out",
        }),
        timelineV1.tween({
          target: labBeaconTargetV1,
          property: "scalePermille",
          from: 1250,
          to: 1000,
          durationMs: 160,
          easing: "ease_in_out",
        }),
      ),
    ),
  ),
);

export const labTimelineCatalogV1: TimelineCatalogV1 = {
  resolveTimeline(cueId: string): TimelineDefinitionV1 | null {
    return cueId === labBeaconPulseCueIdV1 ? labBeaconPulseTimelineV1 : null;
  },
};

export const labPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface LabPresentationProgramV1 {
  readonly kind: "e2e-lab-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeLabPresentationV1(): LabPresentationProgramV1 {
  return Object.freeze({ kind: "e2e-lab-presentation", textCatalogs: labTextCatalogsV1 });
}
