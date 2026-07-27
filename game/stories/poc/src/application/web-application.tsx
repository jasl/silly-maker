// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { AssetId, ResolvedAssetManifestV1 } from "@sillymaker/base";
import { resolveGamePackageV1 } from "@sillymaker/base";
import { defineCoreGameApplicationV1 } from "@sillymaker/base/runtime";
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import {
  createAssetRegistryV1,
  createPresentationReadPortV1,
  createUiContributionRegistryV1,
  initialInteractionSessionStateV1,
} from "@sillymaker/ui";
import type { GameUiProjectorV1, SaveOverlayLabelsV1 } from "@sillymaker/ui";
import { DiagnosticExportButtonV1 } from "@sillymaker/ui";
import { createDebugUiContextV1 } from "@sillymaker/ui/diagnostics";
import { createDevDockContributionSetV1 } from "@sillymaker/ui/debug";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createPlayerUiPortsV1 } from "@sillymaker/web";

import { pocNoContentFilterOptionsTextIdV1 } from "../content/text-ids.js";
import { pocContentMaturityPolicyV1 } from "../presentation/content-maturity-policy.js";
import type {
  NarrativeProjectionV1,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
} from "../gameplay/contracts/types.js";
import type {
  PocOverlayIdV1,
  PocPresentationRouteV1,
  PocResolvedPresentationCatalogV1,
  PocRuntimePresentationViewV1,
  PocSemanticPublicationV1,
} from "../presentation/runtime/contracts.js";
import { isPocNarrativeOpenV1 } from "../presentation/runtime/contracts.js";
import { projectPocRuntimePresentationV1 } from "../presentation/runtime/project-poc-runtime-presentation.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticActionResultV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
} from "../presentation/semantic-actions.js";
import { pocUiContributionsV1 } from "../presentation/ui-contributions.js";
import type {
  PocUiPresentationReadPortV1,
  PocUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import { createPocUnexpectedFaultAttemptV1 } from "../runtime/poc-debug-bundle.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { createPocApplicationExtensionsV1 } from "./extensions.js";
import type { PocApplicationExtensionsV1 } from "./extensions.js";
import { pocSemanticAdapterV1 } from "./semantic-adapter.js";
import {
  createPocUiSlotsV1,
  pocStoryOverlayIdsV1,
  type PocStoryOverlayIdV1,
  type PocUiSlotServicesV1,
} from "./ui-slots.js";

/**
 * The complete Project Tavern browser application: one declaration consumed
 * by `startWebGameApplicationV1`. The composer owns the Session,
 * persistence, diagnostics construction, input, automation, HMR lifecycle,
 * and disposal; this module owns Tavern meaning, projection, and UI slots.
 */

export const pocApplicationIdV1 = "poc-web" as const;

/** Story UI state: hash route plus the mirrored primary overlay. */
export interface PocStoryUiStateV1 {
  readonly route: PocPresentationRouteV1;
  readonly primaryOverlayId: PocOverlayIdV1 | null;
}

/**
 * The UI-side resolved game: presentation catalogs, scene graph, and asset
 * manifest. Resolution is deterministic, so this module-local copy matches
 * the instance's resolved game in everything the UI consumes; provenance
 * (which differs by build identity input) stays with the instance.
 */
const uiIdentityRecordV1 = Object.freeze([]);
const uiBuildIdentityV1: Parameters<typeof resolveGamePackageV1>[2] = Object.freeze({
  engineVersion: "poc-ui-local",
  engine: uiIdentityRecordV1,
  storySimulation: uiIdentityRecordV1,
  storyPresentation: uiIdentityRecordV1,
  application: uiIdentityRecordV1,
});

function resolveUiGameV1(): PocResolvedGameV1 {
  const result = resolveGamePackageV1(pocStoryEntryV1, [], uiBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(`poc.ui_resolution_failed:${result.failure.code}`);
  }
  return result.resolved as PocResolvedGameV1;
}

const pocUiResolvedGameV1 = resolveUiGameV1();

const pocInitialStoryUiStateV1: PocStoryUiStateV1 = Object.freeze({
  route: "main_menu",
  primaryOverlayId: null,
});

const pocUiProjectorV1: GameUiProjectorV1<
  PocSemanticPublicationV1,
  PocResolvedPresentationCatalogV1,
  PocStoryUiStateV1,
  PocRuntimePresentationViewV1,
  AssetId
> = {
  resolvedCatalog: pocUiResolvedGameV1.presentation.resolvedCatalog,
  initialUiState: pocInitialStoryUiStateV1,
  project: (input) =>
    projectPocRuntimePresentationV1({
      semantic: input.semantic,
      resolvedCatalog: input.resolvedCatalog,
      contentPreference: input.contentPreference,
      uiState: Object.freeze({
        route: input.uiState.story.route,
        primaryOverlayId: input.uiState.story.primaryOverlayId,
        interaction: initialInteractionSessionStateV1,
      }),
    }),
};

const pocSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
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
    manual: "手动存档",
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
      lineage_limit: "存档兼容链过长",
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

const pocDiagnosticCategoryLabelsV1 = Object.freeze({
  provenance: "构建与来源信息",
  capabilities_and_integrity: "运行能力与完整性状态",
  replay_evidence: "完整游戏状态与命令历史",
  diagnostics_and_runtime_failures: "诊断与运行时故障",
  failure_context: "失败现场",
  ui_context: "界面上下文",
});

const pocToolingUiSpecifierV1 = "@project-tavern/story-poc/tooling-ui" as const;

type PocToolingUiModuleV1 = {
  readonly pocToolingUiContributionsV1: typeof import("../tooling-ui/index.js").pocToolingUiContributionsV1;
};

export type PocToolingUiLoaderV1 = (
  specifier: typeof pocToolingUiSpecifierV1,
) => Promise<PocToolingUiModuleV1>;

type PocInstanceV1 = CoreGameApplicationInstanceV1<
  PocGameSimulationTypesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1
>;

export function pocApplicationExtensionsOfV1(instance: PocInstanceV1): PocApplicationExtensionsV1 {
  const extensions = instance.extensions;
  if (extensions === null || typeof extensions !== "object") {
    throw new TypeError("poc.application_extensions_missing");
  }
  return extensions as PocApplicationExtensionsV1;
}

export const pocCoreApplicationDefinitionV1 = defineCoreGameApplicationV1<
  unknown,
  unknown,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1
>({
  entry: pocStoryEntryV1 as never,
  semantic: pocSemanticAdapterV1,
  validateReferences: (state, resolved) =>
    validatePocStateReferencesV1(resolved as PocResolvedGameV1, state),
  validateInvariants: (view, resolved) =>
    validatePocStateInvariantsV1(resolved as PocResolvedGameV1, view),
  exportFilename: "project-tavern-poc-current.json",
  normalizeUnexpectedDispatchFault: (error, snapshot) =>
    createPocUnexpectedFaultAttemptV1(error, snapshot),
  normalizeUnexpectedDebugFault: (error, snapshot) =>
    createPocUnexpectedFaultAttemptV1(error, snapshot),
  createExtensions: (context) => createPocApplicationExtensionsV1(context),
});

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export const pocWebApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1,
  PocResolvedPresentationCatalogV1,
  PocStoryUiStateV1,
  PocRuntimePresentationViewV1,
  AssetId,
  PocStoryOverlayIdV1
> = {
  applicationId: pocApplicationIdV1,
  accessibleName: "Project Tavern 七日原型",
  viewport: Object.freeze({
    canvas: Object.freeze({ width: 1600, height: 1000 }),
    fallbackSize: Object.freeze({ width: 1600, height: 1000 }),
  }),
  core: pocCoreApplicationDefinitionV1,
  /** The PoC persists every committed Snapshot, as it always has. */
  autosave: Object.freeze({ mode: "every_commit" as const }),
  ui: ({ instance, assetLoader, files, capabilities, reportFailure }) => {
    const extensions = pocApplicationExtensionsOfV1(instance);
    const assets = createAssetRegistryV1<AssetId, PocAssetUsageV1, string>(
      pocUiResolvedGameV1.assets,
      assetLoader,
      () => reportFailure("presentation.asset_load_failed", new Error("asset load failed")),
    );
    const presentationRead = createPresentationReadPortV1({
      catalogs: pocUiResolvedGameV1.presentation.textCatalogs,
      locale: pocUiResolvedGameV1.presentation.textCatalogs.defaultLocale,
      assets,
    }) as PocUiPresentationReadPortV1;
    const contributions = createUiContributionRegistryV1<PocUiRendererContextsV1>([
      pocUiContributionsV1,
    ]);

    let preloadController = new AbortController();
    const services: PocUiSlotServicesV1 = Object.freeze<PocUiSlotServicesV1>({
      resolvedGame: pocUiResolvedGameV1,
      contributions,
      presentationRead,
      preloadAssets: (assetIds) => {
        preloadController.abort();
        const controller = new AbortController();
        preloadController = controller;
        void assets.preload(assetIds, controller.signal).catch(() => {
          if (!controller.signal.aborted) {
            reportFailure("presentation.asset_preload_failed", new Error("preload failed"));
          }
        });
      },
    });

    const playerUi = createPlayerUiPortsV1({
      files,
      persistence: instance.persistence,
      diagnostics: extensions.diagnostics,
    });

    const loadToolingUi: PocToolingUiLoaderV1 = async () =>
      (await import("@project-tavern/story-poc/tooling-ui")) as PocToolingUiModuleV1;

    return {
      projector: pocUiProjectorV1,
      resolveStageAccessibleName: (publication: unknown) =>
        presentationRead.text(
          (publication as { view: PocRuntimePresentationViewV1 }).view.stage.background
            .accessibleNameTextId,
        ).text,
      overlayIds: pocStoryOverlayIdsV1,
      interactionSurfaceIds: pocUiResolvedGameV1.sceneGraph.interactionSurfaces.map(
        ({ surfaceId }) => surfaceId as string,
      ),
      slots: createPocUiSlotsV1(services),
      labels: Object.freeze({
        systemMenuLabel: "系统",
        saveLabel: "保存",
        settingsLabel: "设置",
        settingsTitle: "设置",
        settingsEmptyText: presentationRead.text(pocNoContentFilterOptionsTextIdV1).text,
        closeLabel: "关闭",
      }),
      saveLabels: pocSaveOverlayLabelsV1,
      pointer: true,
      loadDevDockContributions: async () => {
        const module = await loadToolingUi(pocToolingUiSpecifierV1);
        const tooling = module.pocToolingUiContributionsV1({
          debugTools: extensions.debugTools,
          effectiveCapabilities: capabilities.state,
          persistedCapabilities: capabilities.persisted,
          sessionRequested: capabilities.sessionRequested,
        });
        return createDevDockContributionSetV1({
          panels: [
            ...tooling.panels,
            {
              id: "poc.diagnostics-export",
              side: "right",
              title: "诊断导出",
              authority: "read_only",
              render: () => (
                <DiagnosticExportButtonV1
                  diagnostics={playerUi.diagnostics}
                  sessionStatus={instance.semantic.observe().status}
                  label="导出调试包"
                  preparingText="正在准备调试包…"
                  reviewTitle="检查调试包内容"
                  filenameLabel="文件名"
                  digestLabel="SHA-256"
                  encodedByteLengthLabel="编码后大小"
                  categoriesLabel="包含内容"
                  categoryLabels={pocDiagnosticCategoryLabelsV1}
                  saveLabel="保存调试包"
                  cancelLabel="取消"
                  savingText="正在保存调试包…"
                  completedText="调试包已保存"
                  failedText="调试包操作失败"
                />
              ),
            },
          ],
        });
      },
      debugUiContext: ({ devDockOpenState, presentation, overlaySession, systemDialogSession }) => {
        return () => {
          const publication = presentation.getSnapshot() as never as {
            readonly view: PocRuntimePresentationViewV1;
          };
          const overlay = overlaySession.getSnapshot();
          const uiSession = Object.freeze({
            routeId:
              publication.view.stage.stageSceneId ===
              pocUiResolvedGameV1.sceneGraph.stageScenes[0]?.stageSceneId
                ? ("main_menu" as const)
                : ("play" as const),
            primaryOverlayId: overlay.primaryId,
            detailOverlayIds: Object.freeze([...overlay.detailIds]),
            narrativeOpen: isPocNarrativeOpenV1(publication.view.narrative),
            systemDialogOpen: systemDialogSession.getSnapshot().settingsOpen,
            devDock: devDockOpenState(),
            activeInteractionSurfaceId: null,
          });
          return createDebugUiContextV1({
            presentation: publication as never,
            contentPolicy: pocContentMaturityPolicyV1,
            contentPreference: Object.freeze({ allowedFlags: 0 as never }),
            uiSession: uiSession as never,
          });
        };
      },
      dispose: () => {
        preloadController.abort();
        assets.dispose();
      },
    };
  },
};
