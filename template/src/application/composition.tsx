// SPDX-License-Identifier: MIT
// Composition layer: assembles the script, rules, and UI into a bootable game
// application (browser and desktop webview share one declaration); orchestration only, owns no gameplay.
import type { AssetId, DeepReadonly } from "@sillymaker/base";
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  DefineNarrativeSurfaceInputV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  NarrativeSurfaceSelectionV1,
  PresentationFreezePortV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import { defineNarrativeSurfaceV1, SemanticStageV1, systemInputActionIdsV1 } from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

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
  templateTextForLocaleV1,
  templateTextCatalogsV1,
} from "../content/presentation.ts";
import { templateOpeningAmbientCatalogV1 } from "../scenes/opening/index.ts";
import { templateStageRenderersV1 } from "../ui/stage-renderers.tsx";

import { TemplateHudV1, TemplateNarrativeRendererV1 } from "./ui.tsx";

/** The logical canvas: a 16:9 design resolution the viewport letterboxes. */
export const templateViewportCanvasV1 = Object.freeze({ width: 1600, height: 900 });

/** Resolves a textId from the default-locale catalog; loud when missing. */
export function templateUiTextV1(textId: string): string {
  const catalog = templateTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === templateTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`template.ui_text_missing:${textId}`);
  return entry.text;
}

type TemplateSemanticPublicationV1 = ReturnType<
  TemplateApplicationInstanceV1["semantic"]["observe"]
>;
type TemplateSemanticPortV1 = TemplateApplicationInstanceV1["semantic"];

const noNarrativeChoiceReasonsV1: readonly string[] = Object.freeze([]);
const templateInsufficientCoinsReasonsV1: readonly string[] = Object.freeze([
  "text.template.choice.insufficient-coins",
]);

/** Pure Story projection consumed by the public Narrative definition. */
export function projectTemplateNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<TemplateSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null ? null : Object.freeze(
    narrative.choiceOptions.map((option) => {
      if (option.enabled !== (option.blockedBy === null)) {
        throw new TypeError("template.narrative_choice_availability_inconsistent");
      }
      return Object.freeze({
        choiceId: option.choiceId,
        status: option.enabled ? ("enabled" as const) : ("disabled" as const),
        reasonTextIds: option.blockedBy === null
          ? noNarrativeChoiceReasonsV1
          : templateInsufficientCoinsReasonsV1,
      });
    }),
  );
  return Object.freeze({
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
  initialUiState: Object.freeze({}),
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      templateStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        coins: input.semantic.game.coins,
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
      }),
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const templateUiProjectorV1 = Object.freeze(projectorDefinitionV1);

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

export const templateKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
});

export const templateRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  settingsVolumeLabel: "音量",
  settingsMutedLabel: "静音",
  settingsFullscreenLabel: "切换全屏",
  settingsDeveloperToolsLabel: "开发者工具",
  titleNewGameLabel: "新游戏",
  titleContinueLabel: "继续",
  closeLabel: "关闭",
});

export const templateSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
  accessibleName: "保存",
  title: "保存",
  storageLoading: "正在读取本地存档…",
  storageReady: "本地存档可用",
  storageBusy: "存档操作进行中",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽",
  safelySaved: (commandSequence: number) => `已安全保存至指令 ${String(commandSequence)}`,
  lastFailure: (code: string) => `上次存档失败：${code}`,
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manualSlot: (index: number) => `手动存档 ${index}`,
  }),
  slotHealth: Object.freeze({
    empty: "空",
    valid: "可用",
    invalid: "已损坏",
    recovery_candidate: "可恢复",
    unavailable: "不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `载入${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
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
  }),
  operation: Object.freeze({
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
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `已导出${slotName}`,
    exportedCurrent: "已导出当前进度",
    rejected: Object.freeze({
      busy: "会话正忙",
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
      invalid_note: "备注不合法",
      lineage_limit: "存档兼容链过长",
      migration_unavailable: "当前版本尚未提供此存档所需的迁移",
      migration_rejected: "存档迁移失败",
      incompatible: "存档不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "存储不可用",
      empty_slot: "存档槽为空",
      conflict: "存档发生冲突",
      invalid_record: "存档无效",
    }),
    faulted: (code: string) => `存档故障：${code}`,
    unexpectedFailure: "存档操作意外失败",
  }),
});

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
> = Object.freeze({
  applicationId: "template",
  accessibleName: "新故事",
  viewport: Object.freeze({
    canvas: templateViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1600, height: 900 }),
    // Scale up proportionally to fill the window (fit scaling keeps the aspect ratio, letterboxing as needed).
    maxScale: 4,
  }),
  core: templateCoreApplicationDefinitionV1,
  ui: (
    { instance, presentationFreeze }: {
      readonly instance: TemplateApplicationInstanceV1;
      readonly presentationFreeze: PresentationFreezePortV1;
    },
  ) =>
    Object.freeze({
      titleScreen: Object.freeze({ title: "SillyMaker Starter" }),
      projector: templateUiProjectorV1,
      narrative: defineNarrativeSurfaceV1<TemplateSemanticPublicationV1>(
        Object.freeze(
          {
            selectNarrative: projectTemplateNarrativeSurfaceSelectionV1,
            dispatchResolution: (request) =>
              instance.semantic.dispatch(
                Object.freeze({
                  kind: "resolve" as const,
                  expectedOccurrenceId: request.expectedOccurrenceId,
                  resolution: request.resolution,
                }) as never,
              ),
            renderer: TemplateNarrativeRendererV1,
            resolveText: templateTextForLocaleV1,
            replayCurrentVoice: null,
          } satisfies DefineNarrativeSurfaceInputV1<TemplateSemanticPublicationV1>,
        ),
      ),
      slots: createTemplateUiSlotsV1(instance, presentationFreeze),
      labels: templateRootLabelsV1,
      saveLabels: templateSaveOverlayLabelsV1,
      input: Object.freeze({ keyboard: templateKeyboardMapV1 }),
      // Game-shell feel is the engine default: no browser context menu, text
      // selection, or hover-cursor changes; editable controls and
      // data-native-menu / data-native-text subtrees stay native. Declare
      // `input: { nativeBehavior: false }` only for a browser-native page.
    }),
});
