// SPDX-License-Identifier: MIT
// Composition layer: assembles the script, rules, and UI into a bootable game
// application (browser and desktop webview share one declaration); orchestration only, owns no gameplay.
import type { AssetId, DeepReadonly, TextContentSessionV1, TextId } from "@sillymaker/base";
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  DefineNarrativeSurfaceInputV1,
  GameUiProjectorV1,
  HeldInputPortV1,
  NarrativeSurfaceSelectionV1,
  PresentationFreezePortV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import { defineNarrativeSurfaceV1, SemanticStageV1 } from "@sillymaker/ui";
import { createDefaultVnPlayerV1 } from "@sillymaker/ui/narrative-player";
import type { WebGameApplicationV1, WebGameOuterUiV1 } from "@sillymaker/web";

import type {
  TemplateActionDescriptorV1,
  TemplateActionResultV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
} from "./semantic.ts";
import type { TemplateApplicationInstanceV1 } from "./core-definition.ts";
import { templateCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateSimulationTypesV1,
} from "../game/simulation.ts";
import {
  templateStageContentCatalogV1,
  templateStageTransitionCatalogV1,
  templateTextCatalogsV1,
  templateUiTextV1,
} from "../content/presentation.ts";
import {
  templateEndingTextPackIdV1,
  templateOpeningTextPackIdV1,
  templateTextContentManifestV1,
} from "../content/text-content.ts";
import { templateOpeningAmbientCatalogV1 } from "../scenes/opening/index.ts";
import type { TemplateNarrativeStateV1 } from "../story/narrative.ts";
import { templateCatFlagV1 } from "../story/narrative.ts";
import { templateStageRenderersV1 } from "../ui/stage-renderers.tsx";

import { TemplateHudV1 } from "./ui.tsx";

/** The logical canvas: a 16:9 design resolution the viewport letterboxes. */
export const templateViewportCanvasV1 = { width: 1600, height: 900 };

type TemplateSemanticPublicationV1 = ReturnType<
  TemplateApplicationInstanceV1["semantic"]["observe"]
>;
type TemplateSemanticPortV1 = TemplateApplicationInstanceV1["semantic"];

const noNarrativeChoiceReasonsV1: readonly string[] = [];
const templateInsufficientCoinsReasonsV1: readonly string[] = [
  "text.template.choice.insufficient-coins",
];
const templateEndingTextIdsV1: ReadonlySet<string> = new Set([
  "text.template.line.cat",
  "text.template.line.fetch-line",
  "text.template.line.hurry-line",
  "text.template.line.inside",
  "text.template.line.ending-warm",
  "text.template.line.ending-plain",
]);

function templateNarrativeNeedsEndingTextV1(
  narrative: DeepReadonly<TemplateNarrativeStateV1>,
): boolean {
  if (narrative.flags.includes(templateCatFlagV1)) return true;
  if (narrative.history.entries.some((entry) => templateEndingTextIdsV1.has(entry.textId))) {
    return true;
  }
  const pending = narrative.pending;
  if (pending === null) return false;
  if (pending.kind === "say") return templateEndingTextIdsV1.has(pending.textId);
  if (pending.kind === "choice") {
    return templateEndingTextIdsV1.has(pending.promptTextId) ||
      pending.options.some((option) => templateEndingTextIdsV1.has(option.textId));
  }
  return false;
}

/** Pure Story projection consumed by the public Narrative definition. */
export function projectTemplateNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<TemplateSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null
    ? null
    : (narrative.choiceOptions.map((option) => {
      if (option.enabled !== (option.blockedBy === null)) {
        throw new TypeError("template.narrative_choice_availability_inconsistent");
      }
      return ({
        choiceId: option.choiceId,
        status: option.enabled ? ("enabled" as const) : ("disabled" as const),
        reasonTextIds: option.blockedBy === null
          ? noNarrativeChoiceReasonsV1
          : templateInsufficientCoinsReasonsV1,
      });
    }));
  return ({
    pending: narrative.pending,
    history: narrative.history,
    choiceAvailability,
  });
}

export interface TemplatePresentationViewV1 {
  readonly coins: number;
  readonly anchorEpoch: number;
  readonly stageTarget: StageRenderTarget;
}

export type TemplateUiPublicationV1 = RuntimePresentationPublicationV1<
  TemplateSemanticPublicationV1,
  TemplatePresentationViewV1,
  AssetId
>;

export type TemplateUiOverlayIdV1 = never;

const projectorDefinitionV1: GameUiProjectorV1<
  TemplateSemanticPublicationV1,
  null,
  Record<never, never>,
  TemplatePresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: {},
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      templateStageContentCatalogV1,
    );
    return ({
      view: {
        coins: input.semantic.game.coins,
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
      },
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const templateUiProjectorV1 = projectorDefinitionV1;

function createTemplateUiSlotsV1(
  instance: TemplateApplicationInstanceV1,
  presentationFreeze: PresentationFreezePortV1,
): DefaultGameRootSlotsV1<
  TemplateUiPublicationV1,
  TemplateSemanticPortV1,
  TemplateUiOverlayIdV1
> {
  return {
    background: (context) => (
      <section data-template-stage="true" aria-label={templateUiTextV1("text.template.stage.name")}>
        <SemanticStageV1
          target={context.publication.view.stageTarget}
          revision={context.publication.semantic.revision}
          epoch={context.publication.view.anchorEpoch}
          // Presentation edge context: the stage pairs the batch against
          // exactly this publication's revision/epoch and drops anything
          // stale, so per-cue bindings resolve by dispatching cue.
          dispatches={instance.stageCueDispatches()}
          catalog={templateStageTransitionCatalogV1}
          ambient={templateOpeningAmbientCatalogV1}
          renderers={templateStageRenderersV1}
          accessibleName={templateUiTextV1("text.template.stage.name")}
          clock={presentationFreeze.clock}
        />
      </section>
    ),
    hud: (context) => (
      <TemplateHudV1 publication={context.publication} semantic={context.semantic} />
    ),
  };
}

export const templateRootLabelsV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  settingsMutedLabel: "静音",
  titleNewGameLabel: "新游戏",
  titleContinueLabel: "继续",
  closeLabel: "关闭",
};

export const templateSaveOverlayLabelsV1: SaveOverlayLabelsV1 = {
  accessibleName: "保存",
  title: "保存",
  storageLoading: "正在读取本地存档…",
  storageReady: "本地存档可用",
  storageBusy: "存档操作进行中",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽",
  safelySaved: (commandSequence: number) => `已安全保存至指令 ${String(commandSequence)}`,
  lastFailure: (code: string) => `上次存档失败：${code}`,
  slotNames: {
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manualSlot: (index: number) => `手动存档 ${index}`,
  },
  slotHealth: {
    empty: "空",
    valid: "可用",
    invalid: "已损坏",
    recovery_candidate: "可恢复",
    unavailable: "不可用",
  },
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `载入${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: {
    loadTitle: (slotName: string) => `载入${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认",
    cancelLabel: "取消",
    pendingText: "正在处理…",
    completedText: "操作完成",
    failedText: "操作失败",
  },
  operation: {
    saving: (slotName: string) => `正在保存到${slotName}…`,
    loading: (slotName: string) => `正在载入${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `已保存到${slotName}`,
    cleared: (slotName: string) => `已清除${slotName}`,
    loadedExact: "已载入存档",
    loadedAdopted: "已兼容载入存档",
    importedExact: "已导入存档",
    importedAdopted: "已兼容导入存档",
    importCancelled: "已取消导入存档",
    importFileRejected: {
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    },
    exported: (slotName: string) => `已导出${slotName}`,
    exportedCurrent: "已导出当前进度",
    rejected: {
      busy: "会话正忙",
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      in_flight: "正在过场，暂不可保存",
      invalid_record: "存档无效",
      invalid_note: "备注不合法",
      lineage_limit: "存档兼容链过长",
      migration_unavailable: "当前版本尚未提供此存档所需的迁移",
      migration_rejected: "存档迁移失败",
      incompatible: "存档不兼容",
    },
    exportRejected: {
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
    },
    faulted: (code: string) => `存档故障：${code}`,
    unexpectedFailure: "存档操作意外失败",
  },
};

/**
 * The complete browser application: one declaration consumed by
 * `startWebGameApplicationV1` in `entry.tsx`. The composers own Session,
 * persistence, capability session, input adapters, automation, and HMR.
 */
export const templateGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  TemplateSimulationTypesV1,
  TemplateQueriesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1,
  null,
  Record<never, never>,
  TemplatePresentationViewV1,
  AssetId,
  TemplateUiOverlayIdV1
> = {
  applicationId: "template",
  accessibleName: "新故事",
  viewport: {
    canvas: templateViewportCanvasV1,
    fallbackSize: { width: 1600, height: 900 },
    layoutVariants: [
      {
        id: "template-portrait",
        when: { maxAspectRatio: 0.8 },
        mode: "expand-height",
      },
    ],
  },
  textContent: {
    manifest: templateTextContentManifestV1,
    bootstrapCatalogs: templateTextCatalogsV1.catalogs,
    initialPackIds: [templateOpeningTextPackIdV1],
    requiredPackIdsForInvocation: (invocation: DeepReadonly<TemplateInvocationV1>) =>
      invocation.kind === "resolve" && invocation.resolution.kind === "choose"
        ? [templateEndingTextPackIdV1]
        : [],
    requiredPackIdsForSnapshot: (snapshot: DeepReadonly<TemplateSimulationTypesV1["snapshot"]>) =>
      templateNarrativeNeedsEndingTextV1(snapshot.state.simulation.narrative)
        ? [templateOpeningTextPackIdV1, templateEndingTextPackIdV1]
        : [templateOpeningTextPackIdV1],
  },
  core: templateCoreApplicationDefinitionV1,
  ui: (
    { heldInput, instance, presentationFreeze, textContent }: {
      readonly heldInput: HeldInputPortV1;
      readonly instance: TemplateApplicationInstanceV1;
      readonly presentationFreeze: PresentationFreezePortV1;
      readonly textContent: TextContentSessionV1 | null;
    },
  ) => {
    if (textContent === null) throw new TypeError("template.text_content_session_missing");
    const vnPlayer = createDefaultVnPlayerV1({
      heldInput,
      rollback: instance.rollback,
      labelTextIds: {
        advance: "text.template.narrative.advance",
        playbackControls: "text.template.playback.controls",
        back: "text.template.playback.back",
        forward: "text.template.playback.forward",
        history: "text.template.playback.history",
        skip: "text.template.playback.skip",
        auto: "text.template.playback.auto",
        showUi: "text.template.playback.show-ui",
        historyTitle: "text.template.playback.history.title",
        historyEmpty: "text.template.playback.history.empty",
        historyClose: "text.template.playback.history.close",
      },
    });
    return ({
      titleScreen: { title: "SillyMaker Starter" },
      projector: templateUiProjectorV1,
      narrative: defineNarrativeSurfaceV1<TemplateSemanticPublicationV1>(
        {
          selectNarrative: projectTemplateNarrativeSurfaceSelectionV1,
          dispatchResolution: (request) =>
            instance.semantic.dispatch(
              ({
                kind: "resolve" as const,
                expectedOccurrenceId: request.expectedOccurrenceId,
                resolution: request.resolution,
              }) as never,
            ),
          // The session-level time verb: hold cadence ticks, expiry, and
          // skippable folds all arrive here as hold-fenced elapsed
          // milliseconds and route to the Story's time command.
          dispatchTime: (tick) =>
            instance.semantic.dispatch(
              ({ kind: "time" as const, tick }) as never,
            ),
          renderer: vnPlayer.renderer,
          history: vnPlayer.history,
          resolveText: (_locale, textId) => textContent.resolveText(textId as TextId),
          replayCurrentVoice: null,
        } satisfies DefineNarrativeSurfaceInputV1<TemplateSemanticPublicationV1>,
      ),
      slots: createTemplateUiSlotsV1(instance, presentationFreeze),
      labels: templateRootLabelsV1,
      saveLabels: templateSaveOverlayLabelsV1,
      input: vnPlayer.input,
      // Game-shell feel is the engine default: no browser context menu, text
      // selection, or hover-cursor changes; editable controls and
      // data-native-menu / data-native-text subtrees stay native. Declare
      // `input: { nativeBehavior: false }` only for a browser-native page.
    });
  },
};

/** Builds an explicit full/reference composition without changing the minimal entry graph. */
export function createTemplateGameApplicationWithOuterUiV1(
  createOuterUi: (
    input: Parameters<typeof templateGameApplicationV1.ui>[0],
  ) => WebGameOuterUiV1,
): typeof templateGameApplicationV1 {
  return ({
    ...templateGameApplicationV1,
    ui(input: Parameters<typeof templateGameApplicationV1.ui>[0]) {
      return ({
        ...templateGameApplicationV1.ui(input),
        outerUi: createOuterUi(input),
      });
    },
  });
}
