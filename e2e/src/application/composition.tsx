// SPDX-License-Identifier: MIT
// Composition layer: assembles the Engine Lab's rules, script, and UI into a
// bootable conformance application; orchestration only, owns no gameplay.
import type {
  AssetId,
  AudioIntentV1,
  DeepReadonly,
  StageRenderTargetV1,
  TransientEffectV1,
} from "@sillymaker/base";
import { projectStageRenderTargetV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type {
  AudioHostV1,
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  GamepadActionMapV1,
  KeyboardActionMapV1,
  PresentationClockV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import {
  Button,
  GameAudioV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.ts";
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
import { LabNarrativePlayerV1 } from "./narrative-ui.tsx";
import {
  LabBarrierRecoveryV1,
  LabHudV1,
  LabRollbackControlV1,
  LabShopOverlayV1,
  LabStageV1,
} from "./shell-ui.tsx";

/** The Engine Lab logical canvas: a 16:10 design resolution. */
export const labViewportCanvasV1 = Object.freeze({ width: 1600, height: 1000 });

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

export type LabUiOverlayIdV1 = "overlay.lab.journal" | "overlay.lab.shop";

export { labUiTextV1 } from "./ui-text.ts";

const labUiProjectorDefinitionV1: GameUiProjectorV1<
  LabSemanticPublicationV1,
  null,
  Record<never, never>,
  LabPresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) => {
    // The render target is derived data: same semantic stage plus the same
    // catalog always rebuild the same target and the same exact asset demand.
    const projection = projectStageRenderTargetV1(
      input.semantic.game.stage,
      labStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        stageName: labUiTextV1("text.e2e.lab.stage.name"),
        samplesCollected: input.semantic.game.samplesCollected,
        credits: input.semantic.game.credits,
        procedurePhase: input.semantic.game.procedurePhase,
        procedureSteps: input.semantic.game.procedureSteps,
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
        stageDiagnosticCodes: Object.freeze(
          projection.diagnostics.map((diagnostic) => diagnostic.code),
        ),
      }),
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const labUiProjectorV1 = Object.freeze(labUiProjectorDefinitionV1);

export { labStageRenderersV1 } from "./shell-ui.tsx";

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

const labUiSlotsDefinitionV1: DefaultGameRootSlotsV1<
  LabUiPublicationV1,
  LabSemanticPortV1,
  LabUiOverlayIdV1
> = {
  background: (context) => <LabStageV1 context={context} />,
  hud: (context) => <LabHudV1 publication={context.publication} semantic={context.semantic} />,
  narrative: (context) => (
    <div data-lab-narrative-root="true">
      {context.publication.view.procedurePhase === "complete" ? (
        <p data-lab-narrative="complete">{labUiTextV1("text.e2e.lab.narrative.completed")}</p>
      ) : null}
      <LabBarrierRecoveryV1 publication={context.publication} semantic={context.semantic} />
    </div>
  ),
  systemMenuExtras: (context) => (
    <>
      <Button
        onClick={() =>
          context.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.lab.journal" }),
          )
        }
      >
        {labUiTextV1("text.e2e.lab.overlay.journal.open")}
      </Button>
      <Button
        onClick={() =>
          context.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.lab.shop" }),
          )
        }
      >
        {labUiTextV1("text.e2e.lab.overlay.shop.open")}
      </Button>
    </>
  ),
  overlayResolver: (context) =>
    Object.freeze({
      resolve: (overlayId: DeepReadonly<LabUiOverlayIdV1>) => {
        if (overlayId === "overlay.lab.journal") {
          return Object.freeze({
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
          return Object.freeze({
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

export const labUiSlotsV1 = Object.freeze(labUiSlotsDefinitionV1);

/**
 * The slots with the full player mounted: the narrative root renders the
 * audio component (bound to the instance and an injectable Audio Host), the
 * barrier recovery, and the VN player — typewriter, playback modes,
 * history, seen tracking, hide UI, and voice replay.
 */
/** The saveable continuous intent lives on the Lab's game view. */
const selectLabAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const resolveLabEffectAssetV1 = (effect: TransientEffectV1): { readonly assetId: string } | null =>
  effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
    ? { assetId: effect.payload.assetId }
    : null;

export function createLabUiSlotsV1(input: {
  readonly instance: LabApplicationInstanceV1;
  readonly createAudioHost: () => AudioHostV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly playerClock?: PresentationClockV1;
}): DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1> {
  const voiceReplayRef: { current: (() => boolean) | null } = { current: null };
  const registerReplay = (replay: (() => boolean) | null): void => {
    voiceReplayRef.current = replay;
  };
  const replayVoice = (): boolean => voiceReplayRef.current?.() ?? false;
  const slots: DefaultGameRootSlotsV1<LabUiPublicationV1, LabSemanticPortV1, LabUiOverlayIdV1> = {
    ...labUiSlotsDefinitionV1,
    hud: (context) => (
      <>
        <LabHudV1 publication={context.publication} semantic={context.semantic} />
        <LabRollbackControlV1 instance={input.instance} publication={context.publication} />
      </>
    ),
    narrative: (context) => (
      <div data-lab-narrative-root="true">
        <GameAudioV1
          ports={input.instance}
          createHost={input.createAudioHost}
          selectIntent={selectLabAudioIntentV1}
          resolveEffectAsset={resolveLabEffectAssetV1}
          registerReplayVoice={registerReplay}
        />
        {context.publication.view.procedurePhase === "complete" ? (
          <p data-lab-narrative="complete">{labUiTextV1("text.e2e.lab.narrative.completed")}</p>
        ) : null}
        <LabBarrierRecoveryV1 publication={context.publication} semantic={context.semantic} />
        <LabNarrativePlayerV1
          publication={context.publication}
          semantic={context.semantic}
          profile={input.playerProfile}
          input={context.input}
          {...(input.playerClock === undefined ? {} : { clock: input.playerClock })}
          replayVoice={replayVoice}
        />
      </div>
    ),
  };
  return Object.freeze(slots);
}

/** The Engine Lab keyboard map: stage-level shortcuts, never form keys. */
export const labKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
  KeyA: playerInputActionIdsV1.toggleAuto,
  KeyS: playerInputActionIdsV1.toggleSkip,
  KeyH: playerInputActionIdsV1.toggleHistory,
  KeyU: playerInputActionIdsV1.toggleUi,
  KeyV: playerInputActionIdsV1.replayVoice,
});

/** The Engine Lab gamepad map: A advances, X/Y toggle auto/skip. */
export const labGamepadMapV1: GamepadActionMapV1 = Object.freeze({
  0: systemInputActionIdsV1.narrativeAdvance,
  2: playerInputActionIdsV1.toggleAuto,
  3: playerInputActionIdsV1.toggleSkip,
});

export const labRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  closeLabel: "关闭",
});

export const labSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
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

/**
 * The complete Engine Lab browser application: one declaration consumed by
 * `startWebGameApplicationV1`. The Story supplies the core definition, the
 * projector, catalogs, and optional contributions — no custom React Root and
 * no Session/Persistence/Diagnostics/Input/Automation/HMR wiring.
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
> = Object.freeze({
  applicationId: "e2e",
  accessibleName: "引擎实验室",
  viewport: Object.freeze({
    canvas: labViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1600, height: 1000 }),
  }),
  core: labCoreApplicationDefinitionV1,
  ui: ({
    instance,
    playerProfile,
  }: {
    readonly instance: LabApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
  }) =>
    Object.freeze({
      projector: labUiProjectorV1,
      overlayIds: Object.freeze(["overlay.lab.journal", "overlay.lab.shop"] as const),
      cueIds: Object.freeze([labBeaconPulseCueIdV1]),
      slots: createLabUiSlotsV1({
        instance,
        playerProfile,
        createAudioHost: () =>
          createWebAudioHostV1({
            manifest: labAudioManifestV1,
            resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
          }),
      }),
      labels: labRootLabelsV1,
      saveLabels: labSaveOverlayLabelsV1,
      inputMaps: Object.freeze({ keyboard: labKeyboardMapV1, gamepad: labGamepadMapV1 }),
      loadDevDockContributions: () =>
        import("./dev-dock.tsx").then((module) =>
          module.createLabDevDockContributionsV1({ instance }),
        ),
    }),
});
