// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useState, useSyncExternalStore, useRef } from "react";
import type { ReactElement } from "react";

import type { AssetId, DeepReadonly } from "@sillymaker/base";
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  AssetRegistryV1,
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  RuntimeAssetLoaderV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SemanticStageEntryRendererV1,
} from "@sillymaker/ui";
import {
  Button,
  createAssetRegistryV1,
  SemanticStageV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { PointerActionMapV1 } from "@sillymaker/ui";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionIdV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import type { CatcafeApplicationInstanceV1, CatcafeExtensionsV1 } from "./core-definition.ts";
import { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import {
  catcafeAssetIdsV1,
  catcafeLocalesV1,
  catcafeStageContentCatalogV1,
  catcafeStageTransitionCatalogV1,
  catcafeTextCatalogsV1,
  catcafeTextForLocaleV1,
} from "../presentation.ts";
import {
  catcafeAlbumV1,
  catcafeMovesV1,
  catcafePettingV1,
  catcafeRivalsV1,
  catcafeSlotsV1,
} from "../content.ts";

export const catcafeViewportCanvasV1 = Object.freeze({ width: 1280, height: 720 });

/** Locale 感知的 UI 文本：订阅 Host 偏好，语言切换即时生效。 */
function useCatcafeTextV1(playerProfile: PlayerProfileStoreV1): (textId: string) => string {
  const profile = useSyncExternalStore(
    (listener) => playerProfile.subscribe(listener),
    () => playerProfile.current(),
  );
  const locale = profile.preferences.locale;
  return (textId: string) => catcafeTextForLocaleV1(locale, textId);
}

export function catcafeUiTextV1(textId: string): string {
  const catalog = catcafeTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`catcafe.ui_text_missing:${textId}`);
  return entry.text;
}

/** 主题令牌：暖木色面板 + 琥珀高亮，与美术风格一致。 */
export const catcafeThemeV1 = Object.freeze({
  panel: "rgba(24, 18, 12, 0.82)",
  panelSoft: "rgba(24, 18, 12, 0.62)",
  panelBorder: "1px solid rgba(214, 168, 96, 0.35)",
  ink: "#f2e8d8",
  inkSoft: "#cdbb99",
  amber: "#e8b465",
  radius: "14px",
});

type CatcafeAssetRegistryV1 = AssetRegistryV1<string, never, string>;

/** 订阅 registry 并解析资产 URL；未加载/失败时返回 null（渲染器降级）。 */
function useAssetUrlV1(
  registry: CatcafeAssetRegistryV1 | null,
  assetId: string | undefined,
  usage: "scene_background" | "character_pose" | "ui_decoration",
): string | null {
  const revision = useSyncExternalStore(
    (listener) => (registry === null ? () => {} : registry.subscribe(listener)),
    () => (registry === null ? 0 : registry.observe().revision),
    () => 0,
  );
  void revision;
  if (registry === null || assetId === undefined) return null;
  const resolved = registry.resolve(assetId as never, usage as never);
  return resolved.delivery === "runtime_image" ? resolved.url : null;
}

/** 非 hook 版：渲染器闭包内使用（registry 变更由舞台重渲染驱动）。 */
function assetUrlV1(
  registry: CatcafeAssetRegistryV1 | null,
  assetId: unknown,
  usage: "scene_background" | "character_pose" | "ui_decoration",
): string | null {
  if (registry === null || typeof assetId !== "string") return null;
  const resolved = registry.resolve(assetId as never, usage as never);
  return resolved.delivery === "runtime_image" ? resolved.url : null;
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
  "cc.enter_postgame": "text.cc.ending.continue",
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

/**
 * 渲染器：真图优先（registry 解析 URL），code-native 形状保留为降级。
 * 猫立绘按成长阶段放大；表情三挡由内容目录映射到三张立绘。
 */
export const catcafeCatFrameSizeV1 = (stage: string): { width: number; height: number } => {
  const height = stage === "adolescent" ? 440 : stage === "junior" ? 380 : 320;
  return { width: Math.round(height * 0.75), height };
};

function createCatcafeStageRenderersV1(
  registry: CatcafeAssetRegistryV1 | null,
): Readonly<Record<string, SemanticStageEntryRendererV1>> {
  return Object.freeze({
    "renderer.catcafe.background": ({ entry }) => {
      const url = assetUrlV1(registry, entry.props.assetId, "scene_background");
      if (url !== null) {
        return (
          <img
            src={url}
            alt=""
            data-cc-surface={String(entry.props.surface)}
            style={{ width: "1280px", height: "720px", objectFit: "cover", display: "block" }}
          />
        );
      }
      return (
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
      );
    },
    "renderer.catcafe.cat": ({ entry }) => {
      const stage = String(entry.props.stage);
      const expression = String(entry.props.expression);
      const frame = catcafeCatFrameSizeV1(stage);
      const url = assetUrlV1(registry, entry.props.assetId, "character_pose");
      if (url !== null) {
        return (
          <figure
            data-cc-cat={stage}
            data-cc-expression={expression}
            style={{
              margin: 0,
              width: `${String(frame.width)}px`,
              height: `${String(frame.height)}px`,
              transform: "translate(-50%, -100%)",
              borderRadius: "46% 46% 18px 18px",
              overflow: "hidden",
              border: "3px solid rgba(122, 87, 49, 0.9)",
              boxShadow:
                "0 12px 34px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(240, 224, 190, 0.35)",
            }}
          >
            <img
              src={url}
              alt={`${entry.accessibleName} · ${expression}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </figure>
        );
      }
      const size = frame.width;
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
}

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
    albumId: "album.ending.champion",
    unlocked: (publication) =>
      publication.semantic.game.ending === "champion" ||
      publication.semantic.game.shop.epilogue === "champion",
  },
  {
    albumId: "album.ending.signboard",
    unlocked: (publication) =>
      publication.semantic.game.ending === "signboard" ||
      publication.semantic.game.shop.epilogue === "signboard",
  },
  {
    albumId: "album.ending.adopted",
    unlocked: (publication) =>
      publication.semantic.game.ending === "adopted" ||
      publication.semantic.game.shop.epilogue === "adopted",
  },
  {
    albumId: "album.ending.ordinary",
    unlocked: (publication) =>
      publication.semantic.game.ending === "ordinary" ||
      publication.semantic.game.shop.epilogue === "ordinary",
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

const catcafeAlbumAssetForV1 = (albumId: string): string | undefined => {
  const key = albumId.replace("album.growth.", "album_").replace("album.memory.", "album_");
  if (albumId.startsWith("album.trophy.week")) {
    return catcafeAssetIdsV1[
      `album_trophy${albumId.slice("album.trophy.week".length)}` as keyof typeof catcafeAssetIdsV1
    ];
  }
  // 结局收藏卡重用场景美术：冠军=金杯、招牌=店面、领养=后院、平凡=雨巷。
  if (albumId.startsWith("album.ending.")) {
    const byEnding: Readonly<Record<string, string>> = Object.freeze({
      champion: catcafeAssetIdsV1.album_trophy7,
      signboard: catcafeAssetIdsV1.bg_shopfront,
      adopted: catcafeAssetIdsV1.bg_backyard,
      ordinary: catcafeAssetIdsV1.bg_title,
    });
    return byEnding[albumId.slice("album.ending.".length)];
  }
  return catcafeAssetIdsV1[key as keyof typeof catcafeAssetIdsV1];
};

function CatcafeAlbumViewV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
  );
  const revision = useSyncExternalStore(
    (listener) => (props.registry === null ? () => {} : props.registry.subscribe(listener)),
    () => (props.registry === null ? 0 : props.registry.observe().revision),
    () => 0,
  );
  void revision;
  return (
    <ol
      data-cc-album="true"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "12px",
        margin: 0,
        padding: 0,
        maxInlineSize: "640px",
      }}
    >
      {catcafeAlbumV1.rows().map((entry) => {
        const unlocked = profile.meta[entry.id] !== undefined;
        const url = unlocked
          ? assetUrlV1(props.registry, catcafeAlbumAssetForV1(entry.id), "ui_decoration")
          : null;
        return (
          <li
            key={entry.id}
            data-cc-album-entry={entry.id}
            data-cc-album-unlocked={String(unlocked)}
            style={{
              listStyle: "none",
              borderRadius: "12px",
              overflow: "hidden",
              border: catcafeThemeV1.panelBorder,
              background: unlocked ? catcafeThemeV1.panelSoft : "rgba(255, 255, 255, 0.04)",
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <div
              style={{
                aspectRatio: "3 / 2",
                background: "rgba(0, 0, 0, 0.35)",
                display: "grid",
                placeContent: "center",
              }}
            >
              {url !== null ? (
                <img
                  src={url}
                  alt={uiText(entry.nameTextId)}
                  style={{ inlineSize: "100%", blockSize: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "22px", opacity: 0.6 }}>{unlocked ? "♪" : "？"}</span>
              )}
            </div>
            <div style={{ padding: "8px 10px", display: "grid", gap: "2px" }}>
              <strong style={{ fontSize: "13px" }}>
                {unlocked ? uiText(entry.nameTextId) : "？？？"}
              </strong>
              {unlocked ? (
                <p style={{ margin: 0, fontSize: "12px", opacity: 0.85 }}>
                  {uiText(entry.captionTextId)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CatcafeNarrativePanelV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement | null {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const narrative = props.publication.semantic.narrative;
  const pending = narrative.pending;
  const panelStyle = {
    position: "absolute" as const,
    insetInline: "min(160px, 6%)",
    insetBlockEnd: "min(48px, 4%)",
    maxBlockSize: "70%",
    overflowY: "auto" as const,
    padding: "clamp(8px, 3%, 32px)",
    borderRadius: "16px",
    background: "rgba(16, 20, 26, 0.82)",
    color: "#f2efe8",
    fontSize: "clamp(14px, 2.5vw, 22px)",
    lineHeight: 1.6,
  };
  if (pending === null) return null;
  if (pending.kind === "say") {
    return (
      <div data-cc-narrative="say" data-cc-occurrence={pending.occurrenceId} style={panelStyle}>
        {pending.speakerTextId === null ? null : (
          <strong style={{ display: "block", color: "#ffd9a0" }}>
            {uiText(pending.speakerTextId)}
          </strong>
        )}
        <p style={{ margin: "8px 0 16px" }}>{uiText(pending.textId)}</p>
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
          {uiText("text.cc.narrative.advance")}
        </Button>
      </div>
    );
  }
  if (pending.kind === "choice") {
    return (
      <div data-cc-narrative="choice" data-cc-occurrence={pending.occurrenceId} style={panelStyle}>
        <p style={{ margin: "0 0 16px" }}>{uiText(pending.promptTextId)}</p>
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
              {uiText(option.textId)}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function CatcafeStatBarV1(props: {
  readonly label: string;
  readonly value: number;
  readonly accent: string;
  readonly testId: string;
}): ReactElement {
  return (
    <div data-cc-stat={props.testId} style={{ display: "grid", gap: "2px" }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <span>{props.label}</span>
        <span>{String(props.value)}</span>
      </span>
      <span
        style={{
          display: "block",
          blockSize: "6px",
          borderRadius: "3px",
          background: "rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            blockSize: "100%",
            inlineSize: `${String(Math.max(0, Math.min(100, props.value)))}%`,
            background: props.accent,
            transition: "inline-size 300ms ease",
          }}
        />
      </span>
    </div>
  );
}

const catcafeRivalAssetForV1 = (rivalId: string): string | undefined =>
  rivalId === "rival.mochi"
    ? catcafeAssetIdsV1.rival_mochi
    : rivalId === "rival.smoke"
      ? catcafeAssetIdsV1.rival_smoke
      : rivalId === "rival.general"
        ? catcafeAssetIdsV1.rival_general
        : undefined;

function CatcafeHudV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly instance: CatcafeApplicationInstanceV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly openAlbum: () => void;
}): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  useCatcafeAlbumWatcherV1(props.publication, props.playerProfile);
  const [contestToast, setContestToast] = useState<"won" | "lost" | null>(null);
  const [encounterTextId, setEncounterTextId] = useState<string | null>(null);
  useEffect(
    () =>
      props.instance.subscribeTransientEffects((effect) => {
        if (effect.effectId === "effect.catcafe.contest") {
          const outcome = (effect.payload as { readonly outcome?: string }).outcome;
          setContestToast(outcome === "won" ? "won" : "lost");
          return;
        }
        if (effect.effectId === "effect.catcafe.encounter") {
          const textId = (effect.payload as { readonly textId?: string }).textId;
          setEncounterTextId(textId ?? null);
        }
      }),
    [props.instance],
  );
  const game = props.publication.semantic.game;
  const contest = game.contest;
  const slotName = catcafeSlotsV1[game.calendar.slot] ?? "morning";
  const actions = props.publication.semantic.actions;
  // 新档/重开进入后自动开场：标题屏就是"开始"，不再要求手点一次
  // begin_story。已完结/进行中的存档（Continue）不受影响。
  const narrativePhase = props.publication.semantic.narrative.phase;
  // 在途守卫按 phase 复位：重新开始（restart）后 phase 回到 idle，
  // 自动开场再次生效；boolean ref 会在同一 React 树下残留而卡死。
  const beginInFlightRef = useRef(false);
  useEffect(() => {
    if (narrativePhase !== "idle") {
      beginInFlightRef.current = false;
      return;
    }
    if (beginInFlightRef.current) return;
    const beginAction = actions.find(
      (action) => action.kind === "system" && action.actionId === "cc.begin_story",
    );
    if (beginAction === undefined || !beginAction.enabled) return;
    beginInFlightRef.current = true;
    dispatchV1(props.semantic, { kind: "invoke", actionId: "cc.begin_story" });
  }, [narrativePhase, actions, props.semantic]);
  const systemActions = actions.filter(
    (action): action is Extract<(typeof actions)[number], { kind: "system" }> =>
      action.kind === "system" &&
      action.actionId !== "cc.begin_story" &&
      action.actionId !== "cc.enter_postgame",
  );
  const activityActions = actions.filter(
    (action): action is Extract<(typeof actions)[number], { kind: "activity" }> =>
      action.kind === "activity",
  );
  const inOpening = props.publication.semantic.narrative.phase !== "completed";
  const rivalUrl = useAssetUrlV1(
    contest === null ? null : props.registry,
    contest === null ? undefined : catcafeRivalAssetForV1(contest.rivalId),
    "character_pose",
  );
  const endingUrl = useAssetUrlV1(props.registry, catcafeAssetIdsV1.bg_title, "scene_background");

  const panel = {
    background: catcafeThemeV1.panel,
    border: catcafeThemeV1.panelBorder,
    borderRadius: catcafeThemeV1.radius,
    color: catcafeThemeV1.ink,
    padding: "10px 14px",
    backdropFilter: "blur(4px)",
  } as const;

  if (game.ending !== null) {
    return (
      <section
        data-cc-ending={game.ending}
        role="dialog"
        aria-label={uiText(`text.cc.ending.${game.ending}`)}
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          gap: "18px",
          textAlign: "center",
          color: catcafeThemeV1.ink,
          background:
            endingUrl === null
              ? "rgba(10, 12, 16, 0.92)"
              : `linear-gradient(rgba(10, 12, 16, 0.55), rgba(10, 12, 16, 0.75)), url(${JSON.stringify(endingUrl)}) center / cover no-repeat`,
          zIndex: 6,
          pointerEvents: "auto",
        }}
      >
        <p style={{ margin: 0, fontSize: "15px", letterSpacing: "0.3em", opacity: 0.8 }}>
          {uiText("text.cc.ending.header")}
        </p>
        <h2 style={{ margin: 0, maxInlineSize: "22em", fontSize: "26px", lineHeight: 1.6 }}>
          {uiText(`text.cc.ending.${game.ending}`)}
        </h2>
        <span style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Button
            data-cc-ending-continue="true"
            onClick={() =>
              dispatchV1(props.semantic, { kind: "invoke", actionId: "cc.enter_postgame" })
            }
          >
            {uiText("text.cc.ending.continue")}
          </Button>
          <Button
            data-cc-ending-restart="true"
            onClick={() => void props.instance.lifecycle.restart()}
          >
            {uiText("text.cc.ending.restart")}
          </Button>
        </span>
      </section>
    );
  }

  return (
    <div
      data-cc-hud="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        padding: "12px",
        gap: "8px",
        fontFamily: "'Avenir Next', 'PingFang SC', system-ui, sans-serif",
      }}
    >
      <header style={{ gridRow: 1, display: "flex", gap: "8px", alignItems: "start" }}>
        <p
          data-cc-calendar={`${String(game.calendar.week)}.${String(game.calendar.day)}.${String(game.calendar.slot)}`}
          style={{ ...panel, margin: 0, fontSize: "14px" }}
        >
          {game.shop.epilogue === null ? null : (
            <span
              data-cc-epilogue={game.shop.epilogue}
              style={{
                marginInlineEnd: "8px",
                padding: "1px 8px",
                borderRadius: "999px",
                border: `1px solid ${catcafeThemeV1.amber}`,
                color: catcafeThemeV1.amber,
                fontSize: "12px",
              }}
            >
              {uiText("text.cc.hud.epilogue")}
            </span>
          )}
          {uiText("text.cc.hud.week")}
          {String(game.calendar.week)}
          {uiText("text.cc.hud.week.suffix")} · {uiText(`text.cc.day.${String(game.calendar.day)}`)}{" "}
          · {uiText(`text.cc.slot.${slotName}`)}
        </p>
        <p data-cc-wallet="true" style={{ ...panel, margin: 0, fontSize: "14px" }}>
          {uiText("text.cc.hud.stamina")} {String(game.calendar.stamina)} ·{" "}
          {uiText("text.cc.hud.money")} {String(game.shop.money)}
        </p>
      </header>

      <aside
        data-cc-stats="true"
        style={{
          ...panel,
          gridRow: 2,
          justifySelf: "start",
          alignSelf: "start",
          inlineSize: "190px",
          display: inOpening ? "none" : "grid",
          gap: "8px",
        }}
      >
        <strong style={{ fontSize: "13px", color: catcafeThemeV1.amber }}>小雨</strong>
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.trust")}
          value={game.cat.trust}
          accent="#e8b465"
          testId="trust"
        />
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.vigor")}
          value={game.cat.vigor}
          accent="#8fbf7f"
          testId="vigor"
        />
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.skill")}
          value={game.cat.skill}
          accent="#7fa8d9"
          testId="skill"
        />
        <span style={{ fontSize: "12px", opacity: 0.85 }} data-cc-shop-stats="true">
          {uiText("text.cc.hud.reputation")} {String(game.shop.reputation)} ·{" "}
          {uiText("text.cc.hud.tidiness")} {String(game.shop.tidiness)}
        </span>
        {/* 隐蔽的机器可读镜像，测试与自动化断言用。 */}
        <span data-cc-stats-text="true" style={{ display: "none" }}>
          {`${uiText("text.cc.hud.trust")}${String(game.cat.trust)} · ${uiText("text.cc.hud.vigor")}${String(game.cat.vigor)} · ${uiText("text.cc.hud.skill")}${String(game.cat.skill)} · ${uiText("text.cc.hud.money")}${String(game.shop.money)} · ${uiText("text.cc.hud.reputation")}${String(game.shop.reputation)} · ${uiText("text.cc.hud.tidiness")}${String(game.shop.tidiness)}`}
        </span>
      </aside>

      <footer
        style={{
          gridRow: 3,
          alignSelf: "end",
          display: "grid",
          gap: "8px",
          justifyItems: "center",
        }}
      >
        {encounterTextId === null ? null : (
          <p
            data-cc-encounter={encounterTextId}
            style={{ ...panel, margin: 0, fontStyle: "italic", fontSize: "14px" }}
          >
            {uiText(encounterTextId)}
          </p>
        )}
        {contestToast === null ? null : (
          <p
            data-cc-contest-toast={contestToast}
            style={{ ...panel, margin: 0, fontWeight: 700, color: catcafeThemeV1.amber }}
          >
            {uiText(contestToast === "won" ? "text.cc.contest.won" : "text.cc.contest.lost")}
          </p>
        )}
        {contest === null ? (
          <div
            style={{
              ...panel,
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span role="group" aria-label="日程" style={{ display: "flex", gap: "8px" }}>
              {systemActions.map((action) => (
                <Button
                  key={action.actionId}
                  disabled={!action.enabled}
                  data-cc-action-id={action.actionId}
                  onClick={() =>
                    dispatchV1(props.semantic, { kind: "invoke", actionId: action.actionId })
                  }
                >
                  {uiText(actionTextIdsV1[action.actionId])}
                </Button>
              ))}
              <Button data-cc-album-open="true" onClick={props.openAlbum}>
                {uiText("text.cc.album.open")}
              </Button>
            </span>
            {inOpening ? null : (
              <span
                role="group"
                aria-label="活动"
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                {activityActions.map((action) => (
                  <Button
                    key={action.activityId}
                    disabled={!action.enabled}
                    data-cc-activity={action.activityId}
                    data-cc-blocked={action.blockedBy ?? undefined}
                    onClick={() =>
                      dispatchV1(props.semantic, {
                        kind: "activity",
                        activityId: action.activityId,
                      })
                    }
                  >
                    {uiText(action.nameTextId)}
                  </Button>
                ))}
              </span>
            )}
          </div>
        ) : (
          <div
            role="group"
            aria-label="运动会"
            data-cc-contest={String(contest.round)}
            style={{
              ...panel,
              display: "grid",
              gap: "10px",
              inlineSize: "min(560px, 90%)",
              justifyItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {rivalUrl === null ? null : (
                <img
                  src={rivalUrl}
                  alt=""
                  data-cc-rival={contest.rivalId}
                  style={{
                    inlineSize: "84px",
                    blockSize: "112px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: catcafeThemeV1.panelBorder,
                  }}
                />
              )}
              <div style={{ display: "grid", gap: "6px", minInlineSize: "260px" }}>
                <p
                  data-cc-contest-morale={`${String(contest.morale)}:${String(contest.rivalMorale)}`}
                  style={{ margin: 0, fontSize: "14px" }}
                >
                  {uiText("text.cc.contest.round")}
                  {String(contest.round)} · {uiText("text.cc.contest.morale")}
                  {String(contest.morale)} vs {String(contest.rivalMorale)}
                </p>
                <CatcafeStatBarV1
                  label="小雨"
                  value={Math.min(100, contest.morale)}
                  accent="#e8b465"
                  testId="contest-self"
                />
                <CatcafeStatBarV1
                  label={uiText(
                    catcafeRivalsV1.byId(contest.rivalId)?.nameTextId ?? "text.cc.stage.name",
                  )}
                  value={Math.min(100, contest.rivalMorale)}
                  accent="#c96a5a"
                  testId="contest-rival"
                />
              </div>
            </div>
            <span style={{ display: "flex", gap: "8px" }}>
              {catcafeMovesV1.rows().map((move) => (
                <Button
                  key={move.id}
                  data-cc-move={move.id}
                  onClick={() =>
                    dispatchV1(props.semantic, { kind: "contest_move", moveId: move.id })
                  }
                >
                  {uiText(move.nameTextId)}
                </Button>
              ))}
            </span>
          </div>
        )}
      </footer>
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
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
}): ReactElement {
  const { context, instance } = props;
  const uiText = useCatcafeTextV1(props.playerProfile);
  const [reactionTextId, setReactionTextId] = useState<string | null>(null);
  const game = context.publication.semantic.game;
  const pettingReady =
    context.publication.semantic.narrative.phase === "completed" && game.cat.pettingLeft > 0;

  // 场景资产预载：进入即拉全组（4MB webp 全集），失败自动降级 code-native。
  // 卸载时不显式 abort：registry.dispose 负责终止在途加载，而 jsdom 测试
  // 环境下 Deno 的 AbortController 与 jsdom EventTarget 跨 realm 派发会崩。
  useEffect(() => {
    if (props.registry === null) return;
    const controller = new AbortController();
    void props.registry
      .preload(Object.values(catcafeAssetIdsV1) as never[], controller.signal)
      .catch(() => {});
  }, [props.registry]);

  // 反应文案来自 commit-only 瞬态效果流（权威 facts 的投影），
  // 不再在点击时按 UI 状态预查反应表。
  useEffect(
    () =>
      instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.reaction") return;
        const reactionId = (effect.payload as { readonly reactionId?: string }).reactionId;
        const reaction = reactionId === undefined ? null : catcafePettingV1.byId(reactionId);
        setReactionTextId(reaction?.reactionTextId ?? null);
      }),
    [instance],
  );

  return (
    <section
      data-cc-stage="true"
      data-cc-petting-left={String(game.cat.pettingLeft)}
      aria-label={uiText("text.cc.stage.name")}
    >
      <SemanticStageV1
        target={context.publication.view.stageTarget}
        revision={context.publication.semantic.revision}
        epoch={context.publication.view.anchorEpoch}
        catalog={catcafeStageTransitionCatalogV1}
        renderers={props.renderers}
        accessibleName={uiText("text.cc.stage.name")}
        onHitRegionActivate={(activation) => {
          if (!pettingReady) return;
          dispatchV1(context.semantic, {
            kind: "pet",
            zone: activation.regionId.replace("zone.", ""),
          });
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
          {uiText(reactionTextId)}
        </p>
      )}
    </section>
  );
}

/**
 * 设置面板：语言（即时切换游戏内文本）、音量/静音（Host 偏好，跨存档）、
 * 全屏切换（浏览器与 webview 同 API）。分辨率一行说明——舞台随窗口
 * 等比缩放，桌面渠道的窗口尺寸设置属后续工作。
 */
function CatcafeSettingsV1(props: { readonly playerProfile: PlayerProfileStoreV1 }): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
  );
  const preferences = profile.preferences;
  return (
    <div data-cc-settings="true" style={{ display: "grid", gap: "12px" }}>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {uiText("text.cc.settings.language")}
        <select
          data-cc-settings-locale="true"
          value={preferences.locale ?? "zh-CN"}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({ locale: event.target.value });
          }}
        >
          {catcafeLocalesV1.map((locale) => (
            <option key={locale} value={locale}>
              {locale === "zh-CN" ? "中文" : "English"}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0, opacity: 0.75, maxInlineSize: "36em" }}>
        {uiText("text.cc.settings.resolution")}
      </p>
    </div>
  );
}

export function createCatcafeUiSlotsV1(input: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): DefaultGameRootSlotsV1<CatcafeUiPublicationV1, CatcafeSemanticPortV1, CatcafeUiOverlayIdV1> {
  const renderers = createCatcafeStageRenderersV1(input.registry);
  const slots: DefaultGameRootSlotsV1<
    CatcafeUiPublicationV1,
    CatcafeSemanticPortV1,
    CatcafeUiOverlayIdV1
  > = {
    background: (context) => (
      <CatcafeStageV1
        context={context}
        instance={input.instance}
        playerProfile={input.playerProfile}
        registry={input.registry}
        renderers={renderers}
      />
    ),
    hud: (context) => (
      <CatcafeHudV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
        instance={input.instance}
        registry={input.registry}
        openAlbum={() =>
          context.intents.execute(
            Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.catcafe.album" }),
          )
        }
      />
    ),
    narrative: (context) => (
      <CatcafeNarrativePanelV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
      />
    ),
    settingsSections: () => [
      <CatcafeSettingsV1 key="catcafe-settings" playerProfile={input.playerProfile} />,
    ],
    overlayResolver: () =>
      Object.freeze({
        resolve: (overlayId: DeepReadonly<CatcafeUiOverlayIdV1>) =>
          overlayId === "overlay.catcafe.album"
            ? Object.freeze({
                accessibleName: catcafeTextForLocaleV1(
                  input.playerProfile.current().preferences.locale,
                  "text.cc.album.title",
                ),
                content: (
                  <CatcafeAlbumViewV1
                    playerProfile={input.playerProfile}
                    registry={input.registry}
                  />
                ),
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

/** VN 惯例：右键=返回/关闭（overlay、系统面板），舞台上抑制系统菜单。 */
export const catcafePointerMapV1: PointerActionMapV1 = Object.freeze({
  secondary: systemInputActionIdsV1.cancel,
});

export const catcafeRootLabelsV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
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
  titleLoadGameLabel: "载入存档",
  closeLabel: "关闭",
});

const catcafeRootLabelsEnV1: Partial<DefaultGameRootLabelsV1> = Object.freeze({
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  settingsVolumeLabel: "Volume",
  settingsMutedLabel: "Mute",
  settingsFullscreenLabel: "Toggle fullscreen",
  settingsDeveloperToolsLabel: "Developer tools",
  titleNewGameLabel: "New game",
  titleContinueLabel: "Continue",
  titleLoadGameLabel: "Load game",
  closeLabel: "Close",
});

/**
 * 存档安全点：权威快照始终原子一致（技术上任何提交点都能存），这里表达
 * 的是游戏设计边界——对话推进中与运动会回合中不做手动存档，避免读回
 * 断在演出中间的档。自动/快速存档机制不受影响。
 */
export function catcafeSaveGuardForLocaleV1(
  locale: string | null,
): (publication: unknown) => { allowed: boolean; reasonText?: string } {
  const zh = locale !== "en";
  return (publication) => {
    const semantic = (publication as DeepReadonly<CatcafeUiPublicationV1>).semantic;
    if (semantic.narrative.pending !== null) {
      return Object.freeze({
        allowed: false,
        reasonText: zh
          ? "对话进行中——推进到日常画面后即可存档。"
          : "Dialogue in progress — advance to daily play to save.",
      });
    }
    if (semantic.game.contest !== null) {
      return Object.freeze({
        allowed: false,
        reasonText: zh
          ? "运动会回合中——比赛结束后即可存档。"
          : "Contest round in progress — finish the match to save.",
      });
    }
    return Object.freeze({ allowed: true });
  };
}

/** 系统 chrome（保存/设置对话框）按启动时的语言偏好选择；重载后生效。 */
export function catcafeChromeForLocaleV1(locale: string | null): {
  readonly labels: Partial<DefaultGameRootLabelsV1>;
  readonly saveLabels: SaveOverlayLabelsV1;
} {
  return locale === "en"
    ? Object.freeze({ labels: catcafeRootLabelsEnV1, saveLabels: catcafeSaveOverlayLabelsEnV1 })
    : Object.freeze({ labels: catcafeRootLabelsV1, saveLabels: catcafeSaveOverlayLabelsV1 });
}

export const catcafeSaveOverlayLabelsV1: SaveOverlayLabelsV1 = Object.freeze({
  accessibleName: "保存",
  title: "保存",
  savedAtText: (isoInstant: string) => new Date(isoInstant).toLocaleString("zh-CN"),
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

const catcafeSaveOverlayLabelsEnV1: SaveOverlayLabelsV1 = Object.freeze({
  accessibleName: "Save",
  title: "Save",
  savedAtText: (isoInstant: string) => new Date(isoInstant).toLocaleString("en-US"),
  storageLoading: "Reading local saves…",
  storageReady: "Local saves available",
  storageBusy: "Save operation in progress",
  storageUnavailable: "Local storage unavailable",
  slotsUnavailable: "Cannot read save slots",
  safelySaved: (commandSequence: number) =>
    `Safely saved through command ${String(commandSequence)}`,
  lastFailure: (code: string) => `Last save failed: ${code}`,
  slotNames: Object.freeze({
    "auto.current": "Current autosave",
    "auto.previous": "Previous autosave",
    quick: "Quicksave",
    manual: "Manual save",
  }),
  slotHealth: Object.freeze({
    empty: "Empty",
    valid: "Available",
    invalid: "Corrupted",
    recovery_candidate: "Recoverable",
    unavailable: "Unavailable",
  }),
  quickSave: "Quicksave",
  manualSave: "Manual save",
  importSave: "Import save",
  exportCurrentSave: "Export current progress",
  loadSlot: (slotName: string) => `Load ${slotName}`,
  clearSlot: (slotName: string) => `Clear ${slotName}`,
  exportSlot: (slotName: string) => `Export ${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `Load ${slotName}`,
    loadDescription: (slotName: string) => `Current progress will be replaced by ${slotName}.`,
    clearTitle: (slotName: string) => `Clear ${slotName}`,
    clearDescription: (slotName: string) => `${slotName} will be cleared permanently.`,
    importTitle: "Import save",
    importDescription: "Current progress will be replaced by the selected save.",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    pendingText: "Working…",
    completedText: "Done",
    failedText: "Operation failed",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `Saving to ${slotName}…`,
    loading: (slotName: string) => `Loading ${slotName}…`,
    clearing: (slotName: string) => `Clearing ${slotName}…`,
    importing: "Importing save…",
    exporting: (slotName: string) => `Exporting ${slotName}…`,
    exportingCurrent: "Exporting current progress…",
    saved: (slotName: string) => `Saved to ${slotName}`,
    cleared: (slotName: string) => `Cleared ${slotName}`,
    loadedExact: "Save loaded",
    loadedAdopted: "Save loaded with adaptation",
    importedExact: "Save imported",
    importedAdopted: "Save imported with adaptation",
    importCancelled: "Import cancelled",
    importFileRejected: Object.freeze({
      too_large: "The selected save file is too large",
      unsupported_type: "The selected file type is unsupported",
    }),
    exported: (slotName: string) => `Exported ${slotName}`,
    exportedCurrent: "Exported current progress",
    rejected: Object.freeze({
      busy: "The session is busy",
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      invalid_record: "The save is invalid",
      lineage_limit: "The save compatibility chain is too long",
      incompatible: "The save is incompatible",
    }),
    exportRejected: Object.freeze({
      unavailable: "Storage unavailable",
      empty_slot: "The save slot is empty",
      conflict: "The save conflicted",
      invalid_record: "The save is invalid",
    }),
    faulted: (code: string) => `Save fault: ${code}`,
    unexpectedFailure: "The save operation failed unexpectedly",
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
  ui: ({
    instance,
    playerProfile,
    assetLoader,
    reportFailure,
  }: {
    readonly instance: CatcafeApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
    readonly assetLoader?: RuntimeAssetLoaderV1;
    reportFailure?(code: string, error: unknown): void;
  }) => {
    // 资产 registry：resolved manifest 经 extensions 面到达（观察，不夺权）。
    const manifest = (instance.extensions as CatcafeExtensionsV1 | undefined)?.assets;
    const registry: CatcafeAssetRegistryV1 | null =
      manifest !== undefined && assetLoader !== undefined
        ? (createAssetRegistryV1(manifest, assetLoader, (diagnostic) => {
            reportFailure?.("catcafe.asset_fault", diagnostic);
          }) as CatcafeAssetRegistryV1)
        : null;
    return Object.freeze({
      dispose: () => registry?.dispose(),
      titleScreen: Object.freeze({
        title: catcafeTextForLocaleV1(
          playerProfile.current().preferences.locale,
          "text.cc.app.name",
        ),
        backgroundUrl: "examples/cat-cafe/assets/cc-bg-title.webp",
      }),
      projector: catcafeUiProjectorV1,
      overlayIds: Object.freeze(["overlay.catcafe.album"] as const),
      slots: createCatcafeUiSlotsV1({ instance, playerProfile, registry }),
      ...(() => {
        const locale = playerProfile.current().preferences.locale;
        const chrome = catcafeChromeForLocaleV1(locale);
        return {
          labels: chrome.labels,
          saveLabels: chrome.saveLabels,
          saveGuard: catcafeSaveGuardForLocaleV1(locale),
        };
      })(),
      inputMaps: Object.freeze({ keyboard: catcafeKeyboardMapV1, pointer: catcafePointerMapV1 }),
      loadDevDockContributions: () =>
        import("./dev-dock.tsx").then((module) =>
          module.createCatcafeDevDockContributionsV1({ instance }),
        ),
    });
  },
});
