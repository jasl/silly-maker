// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import type {
  AssetId,
  DeepReadonly,
  InteractionResolutionV2,
  StageRenderTargetV2,
} from "@sillymaker/base";
import { projectStageRenderTargetV2 } from "@sillymaker/base";
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
  SemanticStageEntryRendererV2,
} from "@sillymaker/ui";
import {
  Button,
  SemanticStageV2,
  createAudioPresenterV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

import type {
  LabActionDescriptorV1,
  LabActionIdV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.js";
import type { LabApplicationInstanceV1 } from "./core-definition.js";
import { labCoreApplicationDefinitionV1 } from "./core-definition.js";
import type {
  LabGameViewV1,
  LabNarrativeViewV1,
  LabQueriesV1,
  LabSimulationTypesV1,
} from "../gameplay/simulation.js";
import {
  labAudioManifestV1,
  labStageContentCatalogV1,
  labStageTransitionCatalogV1,
} from "../presentation.js";

/** The Engine Lab logical canvas: a 16:10 design resolution. */
export const labViewportCanvasV1 = Object.freeze({ width: 1600, height: 1000 });

type LabSemanticPublicationV1 = ReturnType<LabApplicationInstanceV1["semantic"]["observe"]>;

export interface LabPresentationViewV1 {
  readonly stageName: string;
  readonly samplesCollected: number;
  readonly procedurePhase: LabGameViewV1["procedurePhase"];
  readonly procedureSteps: number;
  readonly anchorEpoch: number;
  /** Rebuilt every projection from semantic stage state plus the catalog. */
  readonly stageTarget: StageRenderTargetV2;
  readonly stageDiagnosticCodes: readonly string[];
}

export type LabUiPublicationV1 = RuntimePresentationPublicationV1<
  LabSemanticPublicationV1,
  LabPresentationViewV1,
  AssetId
>;

export type LabUiOverlayIdV1 = "overlay.lab.journal";

import { labUiTextV1 } from "./ui-text.js";
import { LabNarrativePlayerV1 } from "./narrative-ui.js";

export { labUiTextV1 } from "./ui-text.js";

const labActionTextIdsV1: Readonly<Record<LabActionIdV1, string>> = Object.freeze({
  "lab.collect_sample": "text.e2e.lab.action.collect_sample",
  "lab.begin_procedure": "text.e2e.lab.action.begin_procedure",
  "lab.advance_procedure": "text.e2e.lab.action.advance_procedure",
  "lab.run_experiment": "text.e2e.lab.action.run_experiment",
  "lab.begin_calibration": "text.e2e.lab.action.begin_calibration",
});

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
    const projection = projectStageRenderTargetV2(
      input.semantic.game.stage,
      labStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        stageName: labUiTextV1("text.e2e.lab.stage.name"),
        samplesCollected: input.semantic.game.samplesCollected,
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

/**
 * Code-native stage entry renderers keyed by the catalog's renderer IDs.
 * They draw from Strict JSON props only; missing registrations fall back to
 * the host's code-native placeholder with a diagnostic.
 */
export const labStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV2>> =
  Object.freeze({
    "renderer.e2e.lab.stage-background": ({ entry }) => (
      <div
        data-lab-surface={String(entry.props.surface)}
        style={{
          width: "1600px",
          height: "1000px",
          background:
            entry.props.surface === "storeroom"
              ? "linear-gradient(180deg, #3a3630, #17140f)"
              : "linear-gradient(180deg, #2b3a4a, #101820)",
        }}
      />
    ),
    "renderer.e2e.lab.stage-character": ({ entry }) => (
      <figure
        data-lab-character={entry.contentId}
        data-lab-pose={String(entry.props.pose)}
        data-lab-expression={String(entry.props.expression)}
        style={{
          margin: 0,
          width: "220px",
          height: "360px",
          borderRadius: "110px 110px 12px 12px",
          background: "rgba(214, 205, 189, 0.85)",
          transform: "translate(-50%, -100%)",
        }}
      >
        <figcaption style={{ paddingBlockStart: "1rem", textAlign: "center", color: "#20242c" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
    "renderer.e2e.lab.stage-prop": ({ entry }) => (
      <div
        data-lab-prop={entry.contentId}
        style={{
          width: "160px",
          height: "120px",
          border: "3px solid #9c8a63",
          background: "#6f6146",
          transform: "translate(-50%, -100%)",
        }}
      />
    ),
  });

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

function labResolveV1(
  semantic: LabSemanticPortV1,
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV2,
): void {
  void semantic.dispatch(
    Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution }),
  );
}

/**
 * The audio presentation lifetime: one presenter per mounted component. It
 * observes semantic publications for the derived continuous intent, the
 * instance transient-effect stream for one-shot SFX, and the page
 * visibility for suspension. Unmounting disposes both the presenter and the
 * host — no playback or listener survives HMR or teardown, and nothing here
 * writes gameplay State.
 */
function LabAudioV1(props: {
  readonly instance: LabApplicationInstanceV1;
  readonly createHost: () => AudioHostV1;
  registerReplay?(replay: (() => boolean) | null): void;
}): null {
  const { instance, createHost, registerReplay } = props;
  useEffect(() => {
    const host = createHost();
    const presenter = createAudioPresenterV1({
      host,
      resolveEffectAsset: (effect) =>
        effect.effectId === "audio.sfx" && typeof effect.payload.assetId === "string"
          ? { assetId: effect.payload.assetId }
          : null,
    });
    const apply = (): void => {
      const publication = instance.semantic.observe();
      presenter.retarget({
        intent: publication.game.audio,
        revision: publication.revision,
        epoch: instance.presentationAnchor().epoch,
      });
    };
    apply();
    const unsubscribeSemantic = instance.semantic.subscribe(apply);
    const unsubscribeAnchor = instance.subscribePresentationAnchor(() => apply());
    const unsubscribeEffects = instance.subscribeTransientEffects((effect) =>
      presenter.onTransientEffect(effect),
    );
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") presenter.suspend();
      else presenter.resume();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    registerReplay?.(() => presenter.replayVoice());
    return () => {
      registerReplay?.(null);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribeEffects();
      unsubscribeAnchor();
      unsubscribeSemantic();
      presenter.dispose();
      host.dispose();
    };
  }, [instance, createHost, registerReplay]);
  return null;
}

/**
 * Presentation-barrier load recovery. A barrier restored by a load, refresh,
 * or rebootstrap arrives on a fresh presentation epoch (or a fresh mount);
 * its transition will never replay, so the `settle` policy acknowledges it
 * immediately through the ordinary semantic command. Barriers created
 * in-session keep waiting for the real transition acknowledgment, and any
 * late pre-load callback was already dropped by the reconciler's epoch
 * fence.
 */
function LabBarrierRecoveryV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): null {
  const pending = props.publication.semantic.narrative.pending;
  const epoch = props.publication.view.anchorEpoch;
  const { semantic } = props;
  const barrier = pending?.kind === "presentation_barrier" ? pending : null;
  const barrierOccurrenceId = barrier?.occurrenceId ?? null;
  const barrierTransitionId = barrier?.expectedTransitionId ?? null;
  const loadRecovery = barrier?.loadRecovery ?? null;
  const seenEpochRef = useRef<number | null>(null);

  useEffect(() => {
    const freshEpoch = seenEpochRef.current !== epoch;
    seenEpochRef.current = epoch;
    if (!freshEpoch || barrierOccurrenceId === null || barrierTransitionId === null) return;
    // The Engine Lab ships the `settle` policy; a future `replay` policy
    // would re-run the transition before acknowledging.
    if (loadRecovery === "settle") {
      labResolveV1(
        semantic,
        barrierOccurrenceId,
        Object.freeze({ kind: "barrier_completed" as const, transitionId: barrierTransitionId }),
      );
    }
  }, [semantic, epoch, barrierOccurrenceId, barrierTransitionId, loadRecovery]);

  return null;
}

function LabHudV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement {
  return (
    <div data-lab-hud="true">
      <p>
        {labUiTextV1("text.e2e.lab.hud.samples")}
        {String(props.publication.view.samplesCollected)} · {labUiTextV1("text.e2e.lab.hud.steps")}
        {String(props.publication.view.procedureSteps)}
      </p>
      <div role="group" aria-label="实验操作">
        {props.publication.semantic.actions.map((action) => (
          <Button
            key={action.actionId}
            disabled={!action.enabled}
            data-lab-action-id={action.actionId}
            onClick={() =>
              void props.semantic.dispatch(
                Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
              )
            }
          >
            {labUiTextV1(labActionTextIdsV1[action.actionId])}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * The Engine Lab Story contributions for the default GameRoot: a stage
 * panel, a HUD with the action catalog, a completion narrative line, and a
 * journal overlay — all added without modifying the composer.
 */
const labUiSlotsDefinitionV1: DefaultGameRootSlotsV1<
  LabUiPublicationV1,
  LabSemanticPortV1,
  LabUiOverlayIdV1
> = {
  background: (context) => {
    const pending = context.publication.semantic.narrative.pending;
    return (
      <section data-lab-stage="true" aria-label={context.publication.view.stageName}>
        <SemanticStageV2
          target={context.publication.view.stageTarget}
          revision={context.publication.semantic.revision}
          epoch={context.publication.view.anchorEpoch}
          catalog={labStageTransitionCatalogV1}
          renderers={labStageRenderersV1}
          accessibleName={context.publication.view.stageName}
          onAcknowledgment={(acknowledgment) => {
            // A completed acknowledged transition confirms a pending
            // presentation barrier through an ordinary semantic command.
            // Mismatched or late acknowledgments dispatch nothing here, and
            // anything stale that still slips through is rejected at the
            // queue front by the occurrence fence.
            if (
              pending?.kind === "presentation_barrier" &&
              acknowledgment.outcome !== "cancelled" &&
              acknowledgment.transitionId === pending.expectedTransitionId
            ) {
              labResolveV1(
                context.semantic,
                pending.occurrenceId,
                Object.freeze({
                  kind: "barrier_completed" as const,
                  transitionId: acknowledgment.transitionId,
                }),
              );
            }
          }}
        />
      </section>
    );
  },
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
    <Button
      onClick={() =>
        context.intents.execute(
          Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.lab.journal" }),
        )
      }
    >
      {labUiTextV1("text.e2e.lab.overlay.journal.open")}
    </Button>
  ),
  overlayResolver: (context) =>
    Object.freeze({
      resolve: (overlayId: DeepReadonly<LabUiOverlayIdV1>) =>
        overlayId === "overlay.lab.journal"
          ? Object.freeze({
              accessibleName: labUiTextV1("text.e2e.lab.overlay.journal.title"),
              content: (
                <dl data-lab-journal="true">
                  <dt>{labUiTextV1("text.e2e.lab.hud.samples")}</dt>
                  <dd>{String(context.publication.view.samplesCollected)}</dd>
                  <dt>{labUiTextV1("text.e2e.lab.hud.steps")}</dt>
                  <dd>{String(context.publication.view.procedureSteps)}</dd>
                </dl>
              ),
            })
          : null,
    }),
};

export const labUiSlotsV1 = Object.freeze(labUiSlotsDefinitionV1);

/**
 * The slots with the full player mounted: the narrative root renders the
 * audio component (bound to the instance and an injectable Audio Host), the
 * barrier recovery, and the VN player — typewriter, playback modes,
 * history, seen tracking, hide UI, and voice replay.
 */
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
    narrative: (context) => (
      <div data-lab-narrative-root="true">
        <LabAudioV1
          instance={input.instance}
          createHost={input.createAudioHost}
          registerReplay={registerReplay}
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
export const labWebApplicationV1: WebGameApplicationV1<
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
      overlayIds: Object.freeze(["overlay.lab.journal" as const]),
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
    }),
});
