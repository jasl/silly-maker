// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import type { ReactElement } from "react";

import type {
  AssetId,
  DeepReadonly,
  InteractionResolutionV2,
  StageRenderTargetV2,
} from "@sillymaker/base";
import { projectStageRenderTargetV2 } from "@sillymaker/base";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SemanticStageEntryRendererV2,
} from "@sillymaker/ui";
import { Button, SemanticStageV2 } from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

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
  labStageContentCatalogV1,
  labStageTransitionCatalogV1,
  labTextCatalogsV1,
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

const labTextByIdV1: ReadonlyMap<string, string> = new Map(
  labTextCatalogsV1.catalogs.flatMap((catalog) =>
    catalog.entries.map((entry) => [entry.textId as string, entry.text] as const),
  ),
);

export function labUiTextV1(textId: string): string {
  const text = labTextByIdV1.get(textId);
  if (text === undefined) throw new TypeError(`e2e.ui_text_missing:${textId}`);
  return text;
}

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
 * Renders the pending interaction boundary. Every activation dispatches a
 * semantic resolution carrying the expected occurrence; the queue front
 * rejects anything stale, so double clicks and late timers are harmless.
 */
function LabNarrativeV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
}): ReactElement | null {
  const narrative = props.publication.semantic.narrative;
  const pending = narrative.pending;
  const { semantic } = props;

  // Pause boundaries auto-resume after their duration. The timer captures
  // the occurrence it saw; if anything else resolved the interaction first,
  // the queue front rejects the stale resume.
  const pauseOccurrenceId = pending?.kind === "pause" ? pending.occurrenceId : null;
  const pauseDurationMs = pending?.kind === "pause" ? pending.durationMs : null;
  useEffect(() => {
    if (pauseOccurrenceId === null || pauseDurationMs === null) return () => {};
    const timer = setTimeout(() => {
      labResolveV1(semantic, pauseOccurrenceId, Object.freeze({ kind: "resume" as const }));
    }, pauseDurationMs);
    return () => clearTimeout(timer);
  }, [semantic, pauseOccurrenceId, pauseDurationMs]);

  if (pending === null) {
    return narrative.phase === "completed" && narrative.calibration !== null ? (
      <p data-lab-narrative="calibrated">
        {labUiTextV1("text.e2e.lab.narrative.cal.done")}（{String(narrative.calibration)}）
      </p>
    ) : null;
  }

  if (pending.kind === "say") {
    return (
      <div data-lab-interaction="say" data-lab-occurrence={pending.occurrenceId}>
        {pending.speakerTextId === null ? null : (
          <strong>{labUiTextV1(pending.speakerTextId)}</strong>
        )}
        <p>{labUiTextV1(pending.textId)}</p>
        <Button
          onClick={() =>
            labResolveV1(
              semantic,
              pending.occurrenceId,
              Object.freeze({ kind: "advance" as const }),
            )
          }
        >
          {labUiTextV1("text.e2e.lab.narrative.cal.advance")}
        </Button>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div data-lab-interaction="choice" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1(pending.promptTextId)}</p>
        <div role="group" aria-label={labUiTextV1(pending.promptTextId)}>
          {(narrative.choiceOptions ?? []).map((option) => (
            <Button
              key={option.choiceId}
              disabled={!option.enabled}
              data-lab-choice-id={option.choiceId}
              title={
                option.blockedBy === null
                  ? undefined
                  : labUiTextV1("text.e2e.lab.narrative.cal.precise.locked")
              }
              onClick={() =>
                labResolveV1(
                  semantic,
                  pending.occurrenceId,
                  Object.freeze({ kind: "choose" as const, choiceId: option.choiceId }),
                )
              }
            >
              {labUiTextV1(option.textId)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (pending.kind === "pause") {
    return (
      <div data-lab-interaction="pause" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.waiting")}</p>
        {pending.skippable ? (
          <Button
            onClick={() =>
              labResolveV1(
                semantic,
                pending.occurrenceId,
                Object.freeze({ kind: "resume" as const }),
              )
            }
          >
            {labUiTextV1("text.e2e.lab.narrative.cal.skip")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (pending.kind === "custom") {
    // The schema-registered calibration surface: the renderer only sends a
    // semantic resolution whose payload the Story schema validates; no
    // callback ever enters State or a Save.
    const min = typeof pending.params.min === "number" ? pending.params.min : 1;
    const max = typeof pending.params.max === "number" ? pending.params.max : 1;
    const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
    return (
      <div data-lab-interaction="custom" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.dial")}</p>
        <div role="group" aria-label={labUiTextV1("text.e2e.lab.narrative.cal.dial")}>
          {values.map((value) => (
            <Button
              key={value}
              data-lab-dial-value={value}
              onClick={() =>
                labResolveV1(
                  semantic,
                  pending.occurrenceId,
                  Object.freeze({ kind: "custom" as const, payload: Object.freeze({ value }) }),
                )
              }
            >
              {String(value)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // presentation_barrier: resolved by the stage acknowledgment wiring.
  return (
    <p data-lab-interaction="barrier" data-lab-occurrence={pending.occurrenceId}>
      {labUiTextV1("text.e2e.lab.narrative.cal.waiting")}
    </p>
  );
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
      <LabNarrativeV1 publication={context.publication} semantic={context.semantic} />
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
  ui: () =>
    Object.freeze({
      projector: labUiProjectorV1,
      overlayIds: Object.freeze(["overlay.lab.journal" as const]),
      slots: labUiSlotsV1,
      labels: labRootLabelsV1,
      saveLabels: labSaveOverlayLabelsV1,
    }),
});
