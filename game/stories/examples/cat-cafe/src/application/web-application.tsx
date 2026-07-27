// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { AssetId, DeepReadonly } from "@sillymaker/base";
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SemanticStageEntryRendererV1,
} from "@sillymaker/ui";
import { Button, SemanticStageV1, systemInputActionIdsV1 } from "@sillymaker/ui";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionIdV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import { catcafeActivityBlockedByV1 } from "./semantic.ts";
import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import {
  catcafeStageContentCatalogV1,
  catcafeStageTransitionCatalogV1,
  catcafeTextCatalogsV1,
} from "../presentation.ts";
import {
  catcafeActivitiesV1,
  catcafeAlbumV1,
  catcafeMovesV1,
  catcafePettingV1,
  catcafeSlotsV1,
} from "../content.ts";

export const catcafeViewportCanvasV1 = Object.freeze({ width: 1280, height: 720 });

export function catcafeUiTextV1(textId: string): string {
  const catalog = catcafeTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`catcafe.ui_text_missing:${textId}`);
  return entry.text;
}

type CatcafeSemanticPublicationV1 = ReturnType<CatcafeApplicationInstanceV1["semantic"]["observe"]>;
type CatcafeSemanticPortV1 = CatcafeApplicationInstanceV1["semantic"];

export interface CatcafePresentationViewV1 {
  readonly anchorEpoch: number;
  readonly stageTarget: StageRenderTarget;
}

export type CatcafeUiPublicationV1 = RuntimePresentationPublicationV1<
  CatcafeSemanticPublicationV1,
  CatcafePresentationViewV1,
  AssetId
>;

export type CatcafeUiOverlayIdV1 = "overlay.catcafe.album";

const actionTextIdsV1: Readonly<Record<CatcafeActionIdV1, string>> = Object.freeze({
  "cc.begin_story": "text.cc.action.begin",
  "cc.advance_slot": "text.cc.action.advance",
  "cc.enter_contest": "text.cc.action.contest",
});

const projectorDefinitionV1: GameUiProjectorV1<
  CatcafeSemanticPublicationV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      catcafeStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
      }),
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const catcafeUiProjectorV1 = Object.freeze(projectorDefinitionV1);

/** 代码原生渲染器：背景渐变与"猫"的占位形象（按阶段变大小/表情上色）。 */
export const catcafeStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> =
  Object.freeze({
    "renderer.catcafe.background": ({ entry }) => (
      <div
        data-cc-surface={String(entry.props.surface)}
        style={{
          width: "1280px",
          height: "720px",
          background:
            entry.props.surface === "backyard"
              ? "linear-gradient(180deg, #56705a, #22301f)"
              : "linear-gradient(180deg, #6b5b4a, #2c241c)",
        }}
      />
    ),
    "renderer.catcafe.cat": ({ entry }) => {
      const stage = String(entry.props.stage);
      const expression = String(entry.props.expression);
      const size = stage === "adolescent" ? 260 : stage === "junior" ? 210 : 160;
      const tone =
        expression === "hissing"
          ? "#c96a5a"
          : expression === "grumpy"
            ? "#a08a6a"
            : expression === "purring"
              ? "#e8c8a8"
              : expression === "happy"
                ? "#dcb890"
                : "#c8b09a";
      return (
        <figure
          data-cc-cat={stage}
          data-cc-expression={expression}
          style={{
            margin: 0,
            width: `${String(size)}px`,
            height: `${String(Math.round(size * 0.85))}px`,
            borderRadius: "50% 50% 45% 45%",
            background: tone,
            transform: "translate(-50%, -100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <figcaption style={{ paddingBlockEnd: "0.5rem", color: "#33302a", fontSize: "14px" }}>
            {entry.accessibleName} · {expression}
          </figcaption>
        </figure>
      );
    },
  });

function dispatchV1(semantic: CatcafeSemanticPortV1, invocation: CatcafeInvocationV1): void {
  void semantic.dispatch(invocation as never);
}

/** 图鉴解锁谓词：观察语义发布，满足即写入 Host 元进度（跨存档）。 */
const albumPredicatesV1: readonly {
  readonly albumId: string;
  readonly unlocked: (publication: DeepReadonly<CatcafeUiPublicationV1>) => boolean;
}[] = Object.freeze([
  {
    albumId: "album.growth.rescue",
    unlocked: (publication) => publication.semantic.narrative.phase === "completed",
  },
  {
    albumId: "album.growth.purr",
    unlocked: (publication) => publication.semantic.game.cat.trust >= 30,
  },
  {
    albumId: "album.growth.leap",
    unlocked: (publication) => publication.semantic.game.cat.skill >= 20,
  },
  {
    albumId: "album.trophy.week3",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 1,
  },
  {
    albumId: "album.trophy.week5",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 2,
  },
  {
    albumId: "album.trophy.week7",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 3,
  },
  {
    albumId: "album.memory.regular",
    unlocked: (publication) => publication.semantic.game.shop.reputation >= 40,
  },
]);

function useCatcafeAlbumWatcherV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  playerProfile: PlayerProfileStoreV1,
): void {
  useEffect(() => {
    const meta = playerProfile.current().meta;
    for (const predicate of albumPredicatesV1) {
      if (meta[predicate.albumId] === undefined && predicate.unlocked(publication)) {
        void playerProfile.markMeta(predicate.albumId);
      }
    }
  }, [publication, playerProfile]);
}

function CatcafeAlbumViewV1(props: { readonly playerProfile: PlayerProfileStoreV1 }): ReactElement {
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
  );
  return (
    <ol data-cc-album="true" style={{ display: "grid", gap: "8px", margin: 0, padding: 0 }}>
      {catcafeAlbumV1.rows().map((entry) => {
        const unlocked = profile.meta[entry.id] !== undefined;
        return (
          <li
            key={entry.id}
            data-cc-album-entry={entry.id}
            data-cc-album-unlocked={String(unlocked)}
            style={{ listStyle: "none" }}
          >
            <strong>{unlocked ? catcafeUiTextV1(entry.nameTextId) : "？？？"}</strong>
            {unlocked ? (
              <p style={{ margin: "4px 0 0" }}>{catcafeUiTextV1(entry.captionTextId)}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CatcafeNarrativePanelV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
}): ReactElement | null {
  const narrative = props.publication.semantic.narrative;
  const pending = narrative.pending;
  const panelStyle = {
    position: "absolute" as const,
    insetInline: "160px",
    insetBlockEnd: "48px",
    padding: "24px 32px",
    borderRadius: "16px",
    background: "rgba(16, 20, 26, 0.82)",
    color: "#f2efe8",
    fontSize: "22px",
    lineHeight: 1.6,
  };
  if (pending === null) return null;
  if (pending.kind === "say") {
    return (
      <div data-cc-narrative="say" data-cc-occurrence={pending.occurrenceId} style={panelStyle}>
        {pending.speakerTextId === null ? null : (
          <strong style={{ display: "block", color: "#ffd9a0" }}>
            {catcafeUiTextV1(pending.speakerTextId)}
          </strong>
        )}
        <p style={{ margin: "8px 0 16px" }}>{catcafeUiTextV1(pending.textId)}</p>
        <Button
          data-cc-advance="true"
          onClick={() =>
            dispatchV1(props.semantic, {
              kind: "resolve",
              expectedOccurrenceId: pending.occurrenceId,
              resolution: { kind: "advance" },
            } as never)
          }
        >
          {catcafeUiTextV1("text.cc.narrative.advance")}
        </Button>
      </div>
    );
  }
  if (pending.kind === "choice") {
    return (
      <div data-cc-narrative="choice" data-cc-occurrence={pending.occurrenceId} style={panelStyle}>
        <p style={{ margin: "0 0 16px" }}>{catcafeUiTextV1(pending.promptTextId)}</p>
        <div role="group" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {(narrative.choiceOptions ?? []).map((option) => (
            <Button
              key={option.choiceId}
              data-cc-choice={option.choiceId}
              onClick={() =>
                dispatchV1(props.semantic, {
                  kind: "resolve",
                  expectedOccurrenceId: pending.occurrenceId,
                  resolution: { kind: "choose", choiceId: option.choiceId },
                } as never)
              }
            >
              {catcafeUiTextV1(option.textId)}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function CatcafeHudV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly openAlbum: () => void;
}): ReactElement {
  useCatcafeAlbumWatcherV1(props.publication, props.playerProfile);
  const game = props.publication.semantic.game;
  const contest = game.contest;
  const slotName = catcafeSlotsV1[game.calendar.slot] ?? "morning";
  const queriesLike = {
    calendar: game.calendar,
    cat: game.cat,
    shop: game.shop,
    contest: game.contest,
    stage: game.stage,
    narrative: { pending: null, phase: props.publication.semantic.narrative.phase },
  } as unknown as CatcafeQueriesV1;

  return (
    <div data-cc-hud="true" style={{ display: "grid", gap: "8px" }}>
      <p
        data-cc-calendar={`${String(game.calendar.week)}.${String(game.calendar.day)}.${String(game.calendar.slot)}`}
      >
        {catcafeUiTextV1("text.cc.hud.week")}
        {String(game.calendar.week)}周 ·{" "}
        {catcafeUiTextV1(`text.cc.day.${String(game.calendar.day)}`)} ·{" "}
        {catcafeUiTextV1(`text.cc.slot.${slotName}`)} · {catcafeUiTextV1("text.cc.hud.stamina")}
        {String(game.calendar.stamina)}
      </p>
      <p data-cc-stats="true">
        {catcafeUiTextV1("text.cc.hud.trust")}
        {String(game.cat.trust)} · {catcafeUiTextV1("text.cc.hud.vigor")}
        {String(game.cat.vigor)} · {catcafeUiTextV1("text.cc.hud.skill")}
        {String(game.cat.skill)} · {catcafeUiTextV1("text.cc.hud.money")}
        {String(game.shop.money)} · {catcafeUiTextV1("text.cc.hud.reputation")}
        {String(game.shop.reputation)} · {catcafeUiTextV1("text.cc.hud.tidiness")}
        {String(game.shop.tidiness)}
      </p>
      <div role="group" aria-label="日程">
        {props.publication.semantic.actions.map((action) => (
          <Button
            key={action.actionId}
            disabled={!action.enabled}
            data-cc-action-id={action.actionId}
            onClick={() =>
              dispatchV1(props.semantic, { kind: "invoke", actionId: action.actionId })
            }
          >
            {catcafeUiTextV1(actionTextIdsV1[action.actionId])}
          </Button>
        ))}
        <Button data-cc-album-open="true" onClick={props.openAlbum}>
          {catcafeUiTextV1("text.cc.album.open")}
        </Button>
      </div>
      {contest === null ? (
        <div role="group" aria-label="活动">
          {catcafeActivitiesV1.rows().map((activity) => {
            const blockedBy = catcafeActivityBlockedByV1(queriesLike, activity.id);
            return (
              <Button
                key={activity.id}
                disabled={blockedBy !== null}
                data-cc-activity={activity.id}
                data-cc-blocked={blockedBy ?? undefined}
                onClick={() =>
                  dispatchV1(props.semantic, { kind: "activity", activityId: activity.id })
                }
              >
                {catcafeUiTextV1(activity.nameTextId)}
              </Button>
            );
          })}
        </div>
      ) : (
        <div role="group" aria-label="运动会" data-cc-contest={String(contest.round)}>
          <p data-cc-contest-morale={`${String(contest.morale)}:${String(contest.rivalMorale)}`}>
            {catcafeUiTextV1("text.cc.contest.round")}
            {String(contest.round)} · {catcafeUiTextV1("text.cc.contest.morale")}
            {String(contest.morale)} vs {String(contest.rivalMorale)}
          </p>
          {catcafeMovesV1.rows().map((move) => (
            <Button
              key={move.id}
              data-cc-move={move.id}
              onClick={() => dispatchV1(props.semantic, { kind: "contest_move", moveId: move.id })}
            >
              {catcafeUiTextV1(move.nameTextId)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 舞台槽：语义舞台 + 命中区域抚摸。点击/键盘激活部位 → 语义 pet
 * invocation；反应文案是 UI 瞬态（按点击时的信任查反应表），权威效果
 * （信任增减、表情变化、每日余量）全部由模块规则决定。
 */
function CatcafeStageV1(props: {
  readonly context: Parameters<
    NonNullable<
      DefaultGameRootSlotsV1<
        CatcafeUiPublicationV1,
        CatcafeSemanticPortV1,
        CatcafeUiOverlayIdV1
      >["background"]
    >
  >[0];
}): ReactElement {
  const { context } = props;
  const [reactionTextId, setReactionTextId] = useState<string | null>(null);
  const game = context.publication.semantic.game;
  const pettingReady =
    context.publication.semantic.narrative.phase === "completed" && game.cat.pettingLeft > 0;

  return (
    <section
      data-cc-stage="true"
      data-cc-petting-left={String(game.cat.pettingLeft)}
      aria-label={catcafeUiTextV1("text.cc.stage.name")}
    >
      <SemanticStageV1
        target={context.publication.view.stageTarget}
        revision={context.publication.semantic.revision}
        epoch={context.publication.view.anchorEpoch}
        catalog={catcafeStageTransitionCatalogV1}
        renderers={catcafeStageRenderersV1}
        accessibleName={catcafeUiTextV1("text.cc.stage.name")}
        onHitRegionActivate={(activation) => {
          if (!pettingReady) return;
          const zone = activation.regionId.replace("zone.", "");
          const reaction = catcafePettingV1.findFirst({
            where: {
              zone,
              minTrust: { lte: game.cat.trust },
              maxTrust: { gte: game.cat.trust },
            },
          });
          setReactionTextId(reaction?.reactionTextId ?? null);
          dispatchV1(context.semantic, { kind: "pet", zone });
        }}
      />
      {reactionTextId === null ? null : (
        <p
          data-cc-pet-reaction={reactionTextId}
          style={{
            position: "absolute",
            insetInlineEnd: "48px",
            insetBlockStart: "48px",
            maxInlineSize: "20em",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(16, 20, 26, 0.75)",
            color: "#f2efe8",
          }}
        >
          {catcafeUiTextV1(reactionTextId)}
        </p>
      )}
    </section>
  );
}

export function createCatcafeUiSlotsV1(input: {
  readonly playerProfile: PlayerProfileStoreV1;
}): DefaultGameRootSlotsV1<CatcafeUiPublicationV1, CatcafeSemanticPortV1, CatcafeUiOverlayIdV1> {
  const slots: DefaultGameRootSlotsV1<
    CatcafeUiPublicationV1,
    CatcafeSemanticPortV1,
    CatcafeUiOverlayIdV1
  > = {
    background: (context) => <CatcafeStageV1 context={context} />,
    hud: (context) => (
      <CatcafeHudV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
        openAlbum={() =>
          context.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.catcafe.album" }),
          )
        }
      />
    ),
    narrative: (context) => (
      <CatcafeNarrativePanelV1 publication={context.publication} semantic={context.semantic} />
    ),
    overlayResolver: () =>
      Object.freeze({
        resolve: (overlayId: DeepReadonly<CatcafeUiOverlayIdV1>) =>
          overlayId === "overlay.catcafe.album"
            ? Object.freeze({
                accessibleName: catcafeUiTextV1("text.cc.album.title"),
                content: <CatcafeAlbumViewV1 playerProfile={input.playerProfile} />,
              })
            : null,
      }),
  };
  return Object.freeze(slots);
}

export const catcafeKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
});

export const catcafeRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "系统",
  saveLabel: "保存",
  settingsLabel: "设置",
  settingsTitle: "设置",
  settingsEmptyText: "暂无可配置项。",
  closeLabel: "关闭",
});

export const catcafeSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
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

export const catcafeWebApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId,
  CatcafeUiOverlayIdV1
> = Object.freeze({
  applicationId: "example-cat-cafe",
  accessibleName: "雨巷猫舍",
  viewport: Object.freeze({
    canvas: catcafeViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1280, height: 720 }),
  }),
  core: catcafeCoreApplicationDefinitionV1,
  ui: ({ playerProfile }: { readonly playerProfile: PlayerProfileStoreV1 }) =>
    Object.freeze({
      projector: catcafeUiProjectorV1,
      overlayIds: Object.freeze(["overlay.catcafe.album"] as const),
      slots: createCatcafeUiSlotsV1({ playerProfile }),
      labels: catcafeRootLabelsV1,
      saveLabels: catcafeSaveOverlayLabelsV1,
      inputMaps: Object.freeze({ keyboard: catcafeKeyboardMapV1 }),
    }),
});
