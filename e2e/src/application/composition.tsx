// SPDX-License-Identifier: MIT
// Composition layer: assembles the Engine Lab's rules, script, and UI into a
// bootable conformance application; orchestration only, owns no gameplay.
import type {
  AssetId,
  AudioIntentV1,
  BuildProvenanceV1,
  DeepReadonly,
  StageRenderTargetV1,
  TransientEffectV1,
} from "@sillymaker/base";
import { projectStageRenderTargetV1 } from "@sillymaker/base";
import type {
  AudioHostV1,
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  GamepadActionMapV1,
  KeyboardActionMapV1,
  PresentationFreezePortV1,
  PresentationRatePortV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import {
  Button,
  defineWorkspaceOverlayV1,
  GameAudioV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { StartedWebGameApplicationV1, WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";
import type { RuntimeCapabilitySessionOverlayV1 } from "@sillymaker/web";
import { createReferencePlayerOuterUiV1 } from "@sillymaker/web/reference";
import type { DefaultSettingsLabelsV1 } from "@sillymaker/ui/reference/settings";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { applicationBuildIdentityInputInternalV1 } from "@sillymaker/web/internal/application-build-identity";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
} from "@sillymaker/web/internal/application-hmr";
import {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  createWebGameApplicationViteHotAdapterInternalV1,
  installWebGameApplicationHmrV1,
  resolveWebGameApplicationHmrProvenanceInternalV1,
  startWebGameApplicationForRebootstrapInternalV1,
} from "@sillymaker/web/internal/application-hmr";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.ts";
import { labAddressableRuntimeV1 } from "./addressable-runtime.ts";
import type { LabWebExecutionContextV1 } from "./addressable-runtime.ts";
import { isLabCodeSurfaceConformanceSelectedV1 } from "./conformance-selection.ts";
import { LabRuntimeInspectionActivationV1 } from "./runtime-inspection-react.tsx";
import type { LabRuntimeInspectorOwnerV1 } from "./runtime-inspection.ts";
import type { LabExecutionContextV1 } from "../gameplay/runtime-plans.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  LabGameViewV1,
  LabNarrativeViewV1,
  LabQueriesV1,
  LabSimulationTypesV1,
} from "../gameplay/simulation.ts";
import {
  labAudioManifestV1,
  labBeaconPulseCueIdV1,
  labStageContentCatalogV1,
} from "../presentation.ts";
import { labUiTextV1 } from "./ui-text.ts";
import { createLabNarrativeSurfaceDefinitionV1 } from "./narrative-renderer.tsx";
import {
  LabCodeSurfaceConformanceV1,
  LabHudV1,
  LabRollbackControlV1,
  LabShopOverlayV1,
  LabStageV1,
} from "./shell-ui.tsx";
import {
  asLabOverlayControllerV1,
  createLabOverlayConformanceV1,
  labOverlayConformanceDefinitionsV1,
  type LabOverlayConformanceIdV1,
  type LabOverlayConformanceV1,
} from "./workspace-overlay-conformance.tsx";
import {
  createLabWholeCanvasConformanceV1,
  type LabWholeCanvasConformanceV1,
  labWholeCanvasKeyboardMapV1,
} from "./whole-canvas-conformance.tsx";

/** The Engine Lab logical canvas: a 16:10 design resolution. */
export const labViewportCanvasV1 = { width: 1600, height: 1000 };

type LabSemanticPublicationV1 = ReturnType<LabApplicationInstanceV1["semantic"]["observe"]>;

export interface LabPresentationViewV1 {
  readonly stageName: string;
  readonly samplesCollected: number;
  readonly credits: number;
  readonly procedurePhase: LabGameViewV1["procedurePhase"];
  readonly procedureSteps: number;
  readonly anchorEpoch: number;
  /** Rebuilt every projection from semantic stage state plus the catalog. */
  readonly stageTarget: StageRenderTargetV1;
  readonly stageDiagnosticCodes: readonly string[];
}

export type LabUiPublicationV1 = RuntimePresentationPublicationV1<
  LabSemanticPublicationV1,
  LabPresentationViewV1,
  AssetId
>;

export type LabUiOverlayIdV1 =
  | "overlay.lab.journal"
  | "overlay.lab.shop"
  | LabOverlayConformanceIdV1;

export const labWorkspaceOverlayDefinitionsV1 = [
  defineWorkspaceOverlayV1({ id: "overlay.lab.journal", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "overlay.lab.shop", contractRevision: 1 }),
  ...labOverlayConformanceDefinitionsV1,
];

export { labUiTextV1 } from "./ui-text.ts";

const labUiProjectorDefinitionV1: GameUiProjectorV1<
  LabSemanticPublicationV1,
  null,
  Record<never, never>,
  LabPresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: {},
  project: (input) => {
    // The render target is derived data: same semantic stage plus the same
    // catalog always rebuild the same target and the same exact asset demand.
    const projection = projectStageRenderTargetV1(
      input.semantic.game.stage,
      labStageContentCatalogV1,
    );
    return ({
      view: {
        stageName: labUiTextV1("text.e2e.lab.stage.name"),
        samplesCollected: input.semantic.game.samplesCollected,
        credits: input.semantic.game.credits,
        procedurePhase: input.semantic.game.procedurePhase,
        procedureSteps: input.semantic.game.procedureSteps,
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
        stageDiagnosticCodes: projection.diagnostics.map((diagnostic) => diagnostic.code),
      },
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const labUiProjectorV1 = labUiProjectorDefinitionV1;

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

const labUiSlotsDefinitionV1: DefaultGameRootSlotsV1<
  LabUiPublicationV1,
  LabSemanticPortV1,
  LabUiOverlayIdV1
> = {
  background: (context) => <LabStageV1 context={context} />,
  hud: (context) => <LabHudV1 publication={context.publication} semantic={context.semantic} />,
  systemMenuExtras: (context) => (
    <>
      <Button
        onClick={() =>
          context.intents.execute(
            { kind: "overlay.open" as const, overlayId: "overlay.lab.journal" },
          )}
      >
        {labUiTextV1("text.e2e.lab.overlay.journal.open")}
      </Button>
      <Button
        onClick={() =>
          context.intents.execute(
            { kind: "overlay.open" as const, overlayId: "overlay.lab.shop" },
          )}
      >
        {labUiTextV1("text.e2e.lab.overlay.shop.open")}
      </Button>
    </>
  ),
  overlayResolver: (context) => ({
    resolve: (overlayId: DeepReadonly<LabUiOverlayIdV1>) => {
      if (overlayId === "overlay.lab.journal") {
        return ({
          accessibleName: labUiTextV1("text.e2e.lab.overlay.journal.title"),
          content: (
            <dl data-lab-journal="true">
              <dt>{labUiTextV1("text.e2e.lab.hud.samples")}</dt>
              <dd>{String(context.publication.view.samplesCollected)}</dd>
              <dt>{labUiTextV1("text.e2e.lab.hud.steps")}</dt>
              <dd>{String(context.publication.view.procedureSteps)}</dd>
            </dl>
          ),
        });
      }
      if (overlayId === "overlay.lab.shop") {
        return ({
          accessibleName: labUiTextV1("text.e2e.lab.overlay.shop.title"),
          content: (
            <LabShopOverlayV1 publication={context.publication} semantic={context.semantic} />
          ),
        });
      }
      return null;
    },
  }),
};

export const labUiSlotsV1 = labUiSlotsDefinitionV1;

/** The saveable continuous intent lives on the Lab's game view. */
const selectLabAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

/**
 * The Story-side halves of the two Host pacing gates, read from the live
 * presentation publication (`{ revision, semantic, view, ... }`). Null-safe:
 * a malformed publication reads as "no monitors", never as a throw — a
 * throwing predicate would latch host pacing off.
 */
const labMonitorGatesV1 = (
  publication: unknown,
): DeepReadonly<LabGameViewV1["monitors"]> | null =>
  publication === null || typeof publication !== "object" ? null : (publication as {
    readonly semantic?: { readonly game?: DeepReadonly<LabGameViewV1> };
  }).semantic?.game?.monitors ?? null;

/**
 * The Host metronome batch size for unfenced session time: half the
 * fastest monitor cadence (gauge 200ms), so a crossing lands at most one
 * report late while the command log stays at ten commits per second.
 */
export const labTimeReportingQuantumMsV1 = 100;

const resolveLabEffectAssetV1 = (effect: TransientEffectV1): { readonly assetId: string } | null =>
  effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
    ? { assetId: effect.payload.assetId }
    : null;

export function createLabUiSlotsV1(input: {
  readonly instance: LabApplicationInstanceV1;
  readonly createAudioHost: () => AudioHostV1;
  readonly overlayConformance?: LabOverlayConformanceV1;
  readonly wholeCanvasConformance?: LabWholeCanvasConformanceV1;
  readonly codeSurfaceConformance?: ReturnType<LabWebExecutionContextV1["requireCodeSurfacePlan"]>;
  readonly runtimeInspection?: LabRuntimeInspectorOwnerV1;
  readonly registerReplayVoice?: (replay: (() => boolean) | null) => void;
}): DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1> {
  const registerReplayVoice = input.registerReplayVoice ?? (() => undefined);
  const codeSurfaceComposition = input.codeSurfaceConformance;
  const overlayConformance = input.overlayConformance ??
    createLabOverlayConformanceV1({ enabled: false });
  const restartApplication = async (): Promise<void> => {
    await input.instance.lifecycle.restart();
  };
  const slots: DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1> = {
    ...labUiSlotsDefinitionV1,
    ...(codeSurfaceComposition === undefined ? {} : {
      auxiliarySurface: (context) => (
        <LabCodeSurfaceConformanceV1
          semantic={context.semantic}
          composition={codeSurfaceComposition}
          {...(input.runtimeInspection === undefined
            ? {}
            : { runtimeInspection: input.runtimeInspection })}
        />
      ),
    }),
    hud: (context) => (
      <>
        {input.runtimeInspection === undefined ? null : (
          <LabRuntimeInspectionActivationV1
            semantic={input.instance.semantic}
            owner={input.runtimeInspection}
            codeSurfaceSelected={codeSurfaceComposition !== undefined}
          />
        )}
        <LabHudV1 publication={context.publication} semantic={context.semantic} />
        <LabRollbackControlV1 instance={input.instance} publication={context.publication} />
        <GameAudioV1
          ports={input.instance}
          createHost={input.createAudioHost}
          selectIntent={selectLabAudioIntentV1}
          resolveEffectAsset={resolveLabEffectAssetV1}
          registerReplayVoice={registerReplayVoice}
        />
        {context.publication.view.procedurePhase === "complete"
          ? <p data-lab-narrative="complete">{labUiTextV1("text.e2e.lab.narrative.completed")}</p>
          : null}
        {context.publication.semantic.narrative.phase === "completed" &&
            context.publication.semantic.narrative.calibration !== null
          ? (
            <p data-lab-narrative="calibrated">
              {labUiTextV1("text.e2e.lab.narrative.cal.done")}（{String(
                context.publication.semantic.narrative.calibration,
              )}）
            </p>
          )
          : null}
      </>
    ),
    systemMenuExtras: (context) => (
      <>
        {labUiSlotsDefinitionV1.systemMenuExtras?.(context)}
        {overlayConformance.renderLaunchers(
          asLabOverlayControllerV1(context.overlays),
          restartApplication,
        )}
        {input.wholeCanvasConformance?.renderLaunchers(restartApplication)}
      </>
    ),
    overlayResolver: (context) => {
      const storyResolver = labUiSlotsDefinitionV1.overlayResolver?.(context);
      const overlays = asLabOverlayControllerV1(context.overlays);
      return ({
        resolve: (overlayId: DeepReadonly<LabUiOverlayIdV1>) =>
          overlayConformance.resolve(overlayId, overlays) ?? storyResolver?.resolve(overlayId) ??
            null,
      });
    },
  };
  return slots;
}

/** The Engine Lab keyboard map: stage-level shortcuts, never form keys. */
export const labKeyboardMapV1: KeyboardActionMapV1 = {
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
  KeyA: playerInputActionIdsV1.toggleAuto,
  KeyS: playerInputActionIdsV1.toggleSkip,
  KeyH: playerInputActionIdsV1.toggleHistory,
  KeyV: playerInputActionIdsV1.replayVoice,
};

/** The Engine Lab gamepad map: A advances, X/Y toggle auto/skip. */
export const labGamepadMapV1: GamepadActionMapV1 = {
  0: systemInputActionIdsV1.narrativeAdvance,
  2: playerInputActionIdsV1.toggleAuto,
  3: playerInputActionIdsV1.toggleSkip,
};

export const labRootLabelsV1: Partial<DefaultGameRootLabelsV1> = {
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  closeLabel: "关闭",
};

const labReferenceSettingsLabelsV1: Partial<DefaultSettingsLabelsV1> = {
  bgmVolumeLabel: "音乐音量",
  voiceVolumeLabel: "语音音量",
  sfxVolumeLabel: "音效音量",
  mutedLabel: "静音",
  textSpeedLabel: "文字速度",
  autoWaitLabel: "自动播放停留",
  fullscreenLabel: "切换全屏",
  developerToolsLabel: "开发者工具",
};

export const labSaveOverlayLabelsV1: SaveOverlayLabelsV1 = {
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
  recovery: {
    checking: "正在检查存档兼容性…",
    confirmation: {
      reanchorTitle: (slotName: string) => `重建${slotName}兼容基线`,
      reanchorDescription: (slotName: string) =>
        `${slotName}将以当前版本重建兼容基线，并保留可恢复备份。`,
      restoreTitle: (slotName: string) => `恢复${slotName}备份`,
      restoreDescription: (slotName: string) => `${slotName}将被升级前备份替换。`,
      discardTitle: (slotName: string) => `丢弃${slotName}备份`,
      discardDescription: (slotName: string) => `${slotName}的升级前备份将被永久删除。`,
    },
    disposition: {
      direct: "可直接载入",
      migration_required: "需要升级存档数据",
      adoption_required: "需要应用兼容更新",
      migration_and_adoption_required: "需要升级存档数据并应用兼容更新",
      migration_unavailable: "当前版本尚未提供所需迁移",
      migration_rejected: "存档迁移未通过安全检查",
      incompatible: "存档与当前版本不兼容",
      reanchor_required: "兼容历史已达上限，需要重建基线",
      invalid_record: "无法安全检查此存档",
      unavailable: "暂时无法检查此存档",
      faulted: "存档兼容性检查失败",
    },
    backup: {
      available: "升级前备份可用",
      invalid: "升级前备份已损坏",
      unavailable: "暂时无法检查升级前备份",
    },
    action: {
      inspect: "检查兼容性与备份",
      upgrade: "安全升级",
      reanchor: "重建兼容基线",
      restore: "恢复升级前备份",
      exportBackup: "导出升级前备份",
      discard: "丢弃升级前备份",
    },
    operation: {
      upgrading: (slotName: string) => `正在升级${slotName}…`,
      reanchoring: (slotName: string) => `正在重建${slotName}兼容基线…`,
      restoring: (slotName: string) => `正在恢复${slotName}备份…`,
      exportingBackup: (slotName: string) => `正在导出${slotName}备份…`,
      discarding: (slotName: string) => `正在丢弃${slotName}备份…`,
      upgradedExact: "存档已升级",
      upgradedAdopted: "存档已升级并应用兼容更新",
      reanchored: "兼容基线已重建",
      restored: "升级前备份已恢复；请载入该存档槽以继续",
      backupExported: "升级前备份已导出",
      discarded: "升级前备份已丢弃",
      rejected: {
        busy: "恢复操作正在进行，请稍后重试",
        unavailable: "本地存储暂时不可用",
        empty_slot: "该槽位没有可升级的存档",
        backup_pending: "请先导出、恢复或丢弃现有升级前备份",
        conflict: "存档已被其他页面更新，请重新检查",
        invalid_record: "存档记录无效，无法执行此操作",
        migration_unavailable: "当前版本尚未提供所需迁移",
        migration_rejected: "存档迁移未通过安全检查",
        incompatible: "该存档与当前版本不兼容",
        reanchor_required: "需要先重建兼容基线",
        not_required: "该存档无需执行此操作",
        empty_backup: "该槽位没有升级前备份",
        invalid_backup: "升级前备份已损坏",
      },
      faulted: "恢复操作失败，请重试",
    },
  },
};

function createLabUiDisposeV1(
  overlayConformance: LabOverlayConformanceV1,
  wholeCanvasConformance: LabWholeCanvasConformanceV1 | null,
  clearReplayVoice: () => void,
): () => void {
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    let firstFailure: unknown;
    let failed = false;
    try {
      clearReplayVoice();
    } catch (error) {
      failed = true;
      firstFailure = error;
    }
    try {
      overlayConformance.dispose();
    } catch (error) {
      if (!failed) firstFailure = error;
      failed = true;
    }
    try {
      wholeCanvasConformance?.dispose();
    } catch (error) {
      if (!failed) firstFailure = error;
      failed = true;
    }
    if (failed) throw firstFailure;
  };
}

/** Builds the one production UI definition; tests may inject only the Audio Host. */
export function createLabGameUiDefinitionV1(
  input: Readonly<{
    readonly instance: LabApplicationInstanceV1;
    readonly createAudioHost?: () => AudioHostV1;
    readonly codeSurfaceComposition?: ReturnType<
      LabWebExecutionContextV1["requireCodeSurfacePlan"]
    >;
    readonly runtimeInspection?: LabRuntimeInspectorOwnerV1;
  }>,
) {
  const applicationSearch = new URLSearchParams(globalThis.location?.search ?? "");
  const overlayConformanceEnabled = applicationSearch.has("overlay_conformance");
  const wholeCanvasConformanceEnabled = applicationSearch.get("whole_canvas_conformance") === "1";
  const overlayConformance = createLabOverlayConformanceV1({
    enabled: overlayConformanceEnabled,
    eventTarget: globalThis.window,
  });
  const wholeCanvasConformance = wholeCanvasConformanceEnabled
    ? createLabWholeCanvasConformanceV1({ eventTarget: globalThis.window })
    : null;
  const replayVoiceRef: { current: (() => boolean) | null } = { current: null };
  const registerReplayVoice = (replay: (() => boolean) | null): void => {
    replayVoiceRef.current = replay;
  };
  const narrative = createLabNarrativeSurfaceDefinitionV1({
    semantic: input.instance.semantic,
    replayCurrentVoice: () => replayVoiceRef.current?.() ?? false,
  });
  return ({
    projector: labUiProjectorV1,
    narrative,
    ...(wholeCanvasConformance === null ? {} : { wholeCanvas: wholeCanvasConformance.definition }),
    overlayDefinitions: labWorkspaceOverlayDefinitionsV1,
    cueIds: [labBeaconPulseCueIdV1],
    slots: createLabUiSlotsV1({
      instance: input.instance,
      overlayConformance,
      ...(wholeCanvasConformance === null ? {} : { wholeCanvasConformance }),
      ...(input.codeSurfaceComposition === undefined
        ? {}
        : { codeSurfaceConformance: input.codeSurfaceComposition }),
      ...(input.runtimeInspection === undefined
        ? {}
        : { runtimeInspection: input.runtimeInspection }),
      registerReplayVoice,
      createAudioHost: input.createAudioHost ?? (() =>
        createWebAudioHostV1({
          manifest: labAudioManifestV1,
          resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
        })),
    }),
    labels: labRootLabelsV1,
    saveLabels: labSaveOverlayLabelsV1,
    // The Host metronome: unfenced session time flows to the Story's time
    // command while any monitor is accumulating; the composer itself closes
    // the gate during holds and while the document is hidden.
    timeReporting: {
      quantumMs: labTimeReportingQuantumMsV1,
      enabledWhen: (publication: unknown) =>
        labMonitorGatesV1(publication)?.reportingActive === true,
      dispatch: (elapsedMs: number) =>
        input.instance.semantic.dispatch({
          kind: "time" as const,
          tick: { elapsedMs },
        }),
    },
    // The decision gauge is a realtime reaction span: while it is up the
    // host pins the presentation rate to exactly 1x.
    realtimeWindow: (publication: unknown) =>
      labMonitorGatesV1(publication)?.realtimeActive === true,
    input: {
      keyboard: wholeCanvasConformanceEnabled
        ? ({ ...labKeyboardMapV1, ...labWholeCanvasKeyboardMapV1 })
        : labKeyboardMapV1,
      gamepad: labGamepadMapV1,
      ...(overlayConformanceEnabled || wholeCanvasConformanceEnabled
        ? { pointer: { secondary: systemInputActionIdsV1.cancel } }
        : {}),
    },
    dispose: createLabUiDisposeV1(
      overlayConformance,
      wholeCanvasConformance,
      () => registerReplayVoice(null),
    ),
  });
}

/**
 * The complete Engine Lab browser application: one declaration consumed by
 * `startWebGameApplicationV1`. The Story supplies the core definition, the
 * projector, catalogs, and optional contributions — no custom React Root and
 * no Session/Persistence/Diagnostics/Input/Automation wiring. The separate
 * development-only installer below delegates HMR lifecycle to the Web composer.
 */
export const labGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  LabNarrativeViewV1,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1,
  null,
  Record<never, never>,
  LabPresentationViewV1,
  AssetId,
  LabUiOverlayIdV1
> = {
  applicationId: "e2e",
  accessibleName: "引擎实验室",
  viewport: {
    canvas: labViewportCanvasV1,
    fallbackSize: { width: 1600, height: 1000 },
  },
  core: labCoreApplicationDefinitionV1,
  addressableRuntime: labAddressableRuntimeV1,
  ...(applicationBuildIdentityInputInternalV1 === undefined
    ? {}
    : { buildIdentityInput: applicationBuildIdentityInputInternalV1 }),
  ui: ({
    instance,
    capabilities,
    playerProfile,
    presentationFreeze,
    presentationRate,
    executionContext,
  }: {
    readonly instance: LabApplicationInstanceV1;
    readonly capabilities: RuntimeCapabilitySessionOverlayV1;
    readonly playerProfile: PlayerProfileStoreV1;
    readonly presentationFreeze: PresentationFreezePortV1;
    readonly presentationRate: PresentationRatePortV1;
    readonly executionContext: LabExecutionContextV1;
  }) => {
    const webExecutionContext = executionContext as LabWebExecutionContextV1;
    const codeSurfaceComposition = isLabCodeSurfaceConformanceSelectedV1()
      ? webExecutionContext.requireCodeSurfacePlan()
      : undefined;
    const definition = createLabGameUiDefinitionV1({
      instance,
      runtimeInspection: webExecutionContext.runtimeInspection,
      ...(codeSurfaceComposition === undefined ? {} : { codeSurfaceComposition }),
    });
    return ({
      ...definition,
      outerUi: createReferencePlayerOuterUiV1({
        instance,
        capabilities,
        playerProfile,
        presentationFreeze,
        presentationRate,
        settingsLabels: labReferenceSettingsLabelsV1,
        loadContributions: () =>
          import("./dev-dock-extension.tsx").then((module) =>
            module.loadLabDevDockExtensionV1({ instance })
          ),
      }),
    });
  },
};

export interface LabGameApplicationHmrModuleV1 {
  readonly labGameApplicationV1: typeof labGameApplicationV1;
  installLabGameApplicationHmrV1(
    started: StartedWebGameApplicationV1,
    options?: InstallLabGameApplicationHmrOptionsV1,
  ): InstalledResolvedGameHmrV1 | undefined;
}

export interface LabViteHotContextV1 {
  accept(handler: (module: unknown) => void): void;
  invalidate(message?: string): void;
}

export interface InstallLabGameApplicationHmrOptionsV1 {
  /** Focused coordinator-test injection; bypasses this module's Vite adapter. */
  readonly hot?: ResolvedGameHmrHotAdapterV1<LabGameApplicationHmrModuleV1>;
  /** Focused adapter-test injection; Browser production uses `import.meta.hot`. */
  readonly viteHot?: LabViteHotContextV1;
  /** Focused adapter-test injection; Browser production uses this module's declaration. */
  readonly currentApplication?: typeof labGameApplicationV1;
  /** Focused-test injection; Browser production captures the maintained `#root`. */
  readonly rootElement?: HTMLElement;
  readonly onSuccessorStarted?: (started: StartedWebGameApplicationV1) => void;
  readonly reportFailure?: (error: unknown) => void;
}

function resolveLabGameApplicationProvenanceV1(
  application: typeof labGameApplicationV1,
): DeepReadonly<BuildProvenanceV1> {
  return resolveWebGameApplicationHmrProvenanceInternalV1(application);
}

function ownViteHotAdapterV1(input: {
  readonly currentApplication: typeof labGameApplicationV1;
  readonly currentProvenance: DeepReadonly<BuildProvenanceV1>;
  readonly hot?: LabViteHotContextV1;
}):
  | ResolvedGameHmrHotAdapterV1<
    LabGameApplicationHmrModuleV1
  >
  | undefined {
  if (input.hot === undefined && import.meta.hot === undefined) return undefined;
  return createWebGameApplicationViteHotAdapterInternalV1({
    currentApplication: input.currentApplication,
    currentProvenance: input.currentProvenance,
    applicationFromModule: (module) => module.labGameApplicationV1,
    resolveApplicationProvenance: resolveLabGameApplicationProvenanceV1,
    r3InvalidationMessage: "e2e.hmr_application_identity_changed",
    registration: {
      accept(handler: (module: LabGameApplicationHmrModuleV1 | undefined) => void): void {
        if (input.hot !== undefined) {
          input.hot.accept(handler as (module: unknown) => void);
          return;
        }
        if (import.meta.hot === undefined) {
          throw new TypeError("e2e.hmr_hot_context_unavailable");
        }
        // Vite requires this exact literal call in the Story boundary.
        import.meta.hot.accept((module: unknown) =>
          handler(module as LabGameApplicationHmrModuleV1 | undefined)
        );
      },
      invalidate(message?: string): void {
        if (input.hot !== undefined) {
          input.hot.invalidate(message);
          return;
        }
        if (import.meta.hot === undefined) {
          throw new TypeError("e2e.hmr_hot_context_unavailable");
        }
        import.meta.hot.invalidate(message);
      },
    },
  });
}

/**
 * Installs the Engine Lab's maintained Browser R2 boundary. The Web composer
 * fences and retires the predecessor, transfers its exact authoritative handoff,
 * starts the accepted Game/Session on the same Host/root, then asks the new
 * composition module to own the next self-accept generation.
 */
export function installLabGameApplicationHmrV1(
  started: StartedWebGameApplicationV1,
  options: InstallLabGameApplicationHmrOptionsV1 = {},
): InstalledResolvedGameHmrV1 | undefined {
  const hot = options.hot ?? ownViteHotAdapterV1({
    currentApplication: options.currentApplication ?? labGameApplicationV1,
    currentProvenance: started.provenance,
    ...(options.viteHot === undefined ? {} : { hot: options.viteHot }),
  });
  if (hot === undefined) return undefined;
  const rootElement = options.rootElement ?? document.querySelector("#root");
  if (!(rootElement instanceof HTMLElement)) {
    throw new TypeError("e2e.hmr_application_root_missing");
  }
  return installWebGameApplicationHmrV1<LabGameApplicationHmrModuleV1>({
    started,
    hot,
    resolveAcceptedProvenance: (module) =>
      resolveLabGameApplicationProvenanceV1(module.labGameApplicationV1),
    startSuccessor: ({
      module,
      started: predecessor,
      handoff,
      onRebootstrapStartFailureInternal,
    }) =>
      startWebGameApplicationForRebootstrapInternalV1(
        module.labGameApplicationV1,
        createWebGameApplicationRebootstrapStartOptionsInternalV1({
          predecessor,
          rootElement,
          handoff,
          onRebootstrapStartFailureInternal,
        }),
      ),
    installNextBoundary: ({ module, started: successor }) => {
      const nextBoundary = module.installLabGameApplicationHmrV1(successor, {
        rootElement,
        ...(options.onSuccessorStarted === undefined
          ? {}
          : { onSuccessorStarted: options.onSuccessorStarted }),
        ...(options.reportFailure === undefined ? {} : { reportFailure: options.reportFailure }),
      });
      if (nextBoundary === undefined) {
        throw new TypeError("e2e.hmr_next_boundary_unavailable");
      }
      return nextBoundary;
    },
    ...(options.onSuccessorStarted === undefined
      ? {}
      : { onSuccessorStarted: options.onSuccessorStarted }),
    ...(options.reportFailure === undefined ? {} : { reportFailure: options.reportFailure }),
  });
}
