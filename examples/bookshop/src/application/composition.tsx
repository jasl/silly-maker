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
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SemanticStageEntryRendererV1,
} from "@sillymaker/ui";
import { defineNarrativeSurfaceV1, SemanticStageV1, systemInputActionIdsV1 } from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type {
  BookshopActionDescriptorV1,
  BookshopActionResultV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
} from "./semantic.ts";
import type { BookshopApplicationInstanceV1 } from "./core-definition.ts";
import { bookshopCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopQueriesV1,
  BookshopSimulationTypesV1,
} from "../game/simulation.ts";
import {
  bookshopStageContentCatalogV1,
  bookshopStageTransitionCatalogV1,
  bookshopTextForLocaleV1,
  bookshopTextCatalogsV1,
} from "../content/presentation.ts";

import { BookshopHudV1, BookshopNarrativeRendererV1 } from "./ui.tsx";

/** The logical canvas: a 16:9 design resolution the viewport letterboxes. */
export const bookshopViewportCanvasV1 = Object.freeze({ width: 1600, height: 900 });

/** Resolves a textId from the default-locale catalog; loud when missing. */
export function bookshopUiTextV1(textId: string): string {
  const catalog = bookshopTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === bookshopTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`bookshop.ui_text_missing:${textId}`);
  return entry.text;
}

type BookshopSemanticPublicationV1 = ReturnType<
  BookshopApplicationInstanceV1["semantic"]["observe"]
>;
type BookshopSemanticPortV1 = BookshopApplicationInstanceV1["semantic"];

const noNarrativeChoiceReasonsV1: readonly string[] = Object.freeze([]);
const bookshopInsufficientCoinsReasonsV1: readonly string[] = Object.freeze([
  "text.bookshop.choice.insufficient-coins",
]);

/** Pure Story projection consumed by the public Narrative definition. */
export function projectBookshopNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<BookshopSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null ? null : Object.freeze(
    narrative.choiceOptions.map((option) => {
      if (option.enabled !== (option.blockedBy === null)) {
        throw new TypeError("bookshop.narrative_choice_availability_inconsistent");
      }
      return Object.freeze({
        choiceId: option.choiceId,
        status: option.enabled ? ("enabled" as const) : ("disabled" as const),
        reasonTextIds: option.blockedBy === null
          ? noNarrativeChoiceReasonsV1
          : bookshopInsufficientCoinsReasonsV1,
      });
    }),
  );
  return Object.freeze({
    pending: narrative.pending,
    history: narrative.history,
    choiceAvailability,
  });
}

export interface BookshopPresentationViewV1 {
  readonly coins: number;
  readonly anchorEpoch: number;
  readonly stageTarget: StageRenderTarget;
}

export type BookshopUiPublicationV1 = RuntimePresentationPublicationV1<
  BookshopSemanticPublicationV1,
  BookshopPresentationViewV1,
  AssetId
>;

export type BookshopUiOverlayIdV1 = never;

const projectorDefinitionV1: GameUiProjectorV1<
  BookshopSemanticPublicationV1,
  null,
  Record<never, never>,
  BookshopPresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      bookshopStageContentCatalogV1,
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

export const bookshopUiProjectorV1 = Object.freeze(projectorDefinitionV1);

/**
 * Code-native stage renderers keyed by the content catalog's renderer IDs.
 * A real game replaces these with image-backed renderers; the placeholders
 * keep the starter runnable with zero media bytes.
 */
export const bookshopStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> =
  Object.freeze({
    "renderer.bookshop.background": ({ entry }) => (
      <div
        data-bookshop-surface={String(entry.props.surface)}
        style={{
          width: "1600px",
          height: "900px",
          background: entry.props.surface === "yard"
            ? "linear-gradient(180deg, #3d4a42, #141a16)"
            : "linear-gradient(180deg, #5c4634, #1a120c)",
        }}
      />
    ),
    "renderer.bookshop.character": ({ entry }) => (
      <figure
        data-bookshop-character={entry.contentId}
        data-bookshop-expression={String(entry.props.expression)}
        style={{
          margin: 0,
          width: "100%",
          height: "100%",
          borderRadius: "110px 110px 16px 16px",
          background: entry.contentId === "content.bookshop.character.zhou"
            ? "rgba(210, 198, 176, 0.92)"
            : "rgba(228, 218, 200, 0.92)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <figcaption style={{ paddingBlockEnd: "1rem", color: "#33302a" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
  });

function createBookshopUiSlotsV1(): DefaultGameRootSlotsV1<
  BookshopUiPublicationV1,
  BookshopSemanticPortV1,
  BookshopUiOverlayIdV1
> {
  return {
    background: (context) => (
      <section data-bookshop-stage="true" aria-label={bookshopUiTextV1("text.bookshop.stage.name")}>
        <SemanticStageV1
          target={context.publication.view.stageTarget}
          revision={context.publication.semantic.revision}
          epoch={context.publication.view.anchorEpoch}
          catalog={bookshopStageTransitionCatalogV1}
          renderers={bookshopStageRenderersV1}
          accessibleName={bookshopUiTextV1("text.bookshop.stage.name")}
        />
      </section>
    ),
    hud: (context) => (
      <BookshopHudV1 publication={context.publication} semantic={context.semantic} />
    ),
  };
}

export const bookshopKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
});

export const bookshopRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
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

export const bookshopSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
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
export const bookshopGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  BookshopSimulationTypesV1,
  BookshopQueriesV1,
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopActionDescriptorV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
  BookshopActionResultV1,
  null,
  Record<never, never>,
  BookshopPresentationViewV1,
  AssetId,
  BookshopUiOverlayIdV1
> = Object.freeze({
  applicationId: "example-bookshop",
  accessibleName: "新故事",
  viewport: Object.freeze({
    canvas: bookshopViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1600, height: 900 }),
    // Scale up proportionally to fill the window (fit scaling keeps the aspect ratio, letterboxing as needed).
    maxScale: 4,
  }),
  core: bookshopCoreApplicationDefinitionV1,
  ui: ({ instance }: { readonly instance: BookshopApplicationInstanceV1 }) =>
    Object.freeze({
      titleScreen: Object.freeze({
        title: "打烊前的旧书店",
        splash: Object.freeze({
          lines: Object.freeze([
            "欢迎来到打烊前的旧书店",
            "一个由 SillyMaker 驱动的短篇故事",
          ]),
        }),
      }),
      projector: bookshopUiProjectorV1,
      narrative: defineNarrativeSurfaceV1<BookshopSemanticPublicationV1>(
        Object.freeze(
          {
            selectNarrative: projectBookshopNarrativeSurfaceSelectionV1,
            dispatchResolution: (request) =>
              instance.semantic.dispatch(
                Object.freeze({
                  kind: "resolve" as const,
                  expectedOccurrenceId: request.expectedOccurrenceId,
                  resolution: request.resolution,
                }) as never,
              ),
            renderer: BookshopNarrativeRendererV1,
            resolveText: bookshopTextForLocaleV1,
            replayCurrentVoice: null,
          } satisfies DefineNarrativeSurfaceInputV1<BookshopSemanticPublicationV1>,
        ),
      ),
      slots: createBookshopUiSlotsV1(),
      labels: bookshopRootLabelsV1,
      saveLabels: bookshopSaveOverlayLabelsV1,
      input: Object.freeze({ keyboard: bookshopKeyboardMapV1 }),
    }),
});
