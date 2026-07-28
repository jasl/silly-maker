// SPDX-License-Identifier: MIT
// 组合层（composition）：本文件的唯一职责是把玩法、剧情、数据、UI 各自
// 职责明确的模块**组装**成一个可启动的游戏应用（浏览器与桌面 webview 共用
// 同一份声明）。它不应拥有玩法规则或权威状态；随特性切片推进
// （docs/engine/proposals/feature-slices.md），这里最终只剩纯编排。
import { useCallback, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type {
  AssetId,
  DeepReadonly,
  NarrativeHistoryV1,
  PendingInteractionV1,
} from "@sillymaker/base";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  AudioHostV1,
  RuntimeAssetLoaderV1,
} from "@sillymaker/ui";
import {
  Button,
  DialoguePanelV1,
  createAssetRegistryV1,
  GameAudioV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { DialogueResolutionV1, PointerActionMapV1 } from "@sillymaker/ui";
import type { AudioIntentV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";

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
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeSemanticPublicationV1,
} from "./ui-kit.ts";
import { catcafeThemeV1, dispatchV1, useCatcafeTextV1 } from "./ui-kit.ts";
export type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import { CatcafeAlbumViewV1, useCatcafeAlbumWatcherV1 } from "../features/album/index.tsx";
import {
  CatcafeContestPanelV1,
  useCatcafeContestToastV1,
} from "../features/contest/ContestPanel.tsx";
import { useCatcafeAutoBeginV1 } from "../features/dialogue/use-auto-begin.ts";
import { useCatcafeEncounterNoticeV1 } from "../features/encounters/notice.ts";
import { CatcafeEndingScreenV1 } from "../features/endings/EndingScreen.tsx";
import { createCatcafeStageRenderersV1 } from "../features/stage/renderers.tsx";
import { CatcafeStageV1 } from "../features/stage/StageView.tsx";
import { catcafeChromeForLocaleV1, catcafeSaveGuardForLocaleV1 } from "./labels.ts";
export {
  catcafeChromeForLocaleV1,
  catcafeRootLabelsV1,
  catcafeSaveGuardForLocaleV1,
  catcafeSaveOverlayLabelsV1,
} from "./labels.ts";
import { CatcafeStatBarV1 } from "./stat-bar.tsx";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import { catcafeAudioManifestV1, resolveCatcafeEffectAssetV1 } from "../features/audio/index.ts";
import {
  catcafeLocalesV1,
  catcafeStageContentCatalogV1,
  catcafeTextForLocaleV1,
} from "../presentation.ts";
import { catcafeSlotsV1 } from "../content.ts";

export const catcafeViewportCanvasV1 = Object.freeze({ width: 1280, height: 720 });

/* 游戏内按钮紧凑化：HUD 与对话快捷条采用小号按钮（触控 32px 达标）。 */
const catcafeChromeCssV1 = `
[data-cc-hud] .silly-button,
[data-dialogue] .silly-button,
[data-default-system-menu] .silly-button {
  min-block-size: 32px;
  min-inline-size: 32px;
  padding-block: 2px;
  padding-inline: 10px;
  font-size: 13px;
}
`;

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
 * 对话面板：引擎 DialoguePanelV1 的薄适配——打字机、自动/快进、已读
 * 标记、历史回看、点击面、快捷条全部来自引擎；这里只接语义端口、
 * 文本目录与回退按钮。
 */
function CatcafeNarrativePanelV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement | null {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const narrative = props.publication.semantic.narrative;
  const semantic = props.semantic;
  const onResolve = useCallback(
    (occurrenceId: string, resolution: DialogueResolutionV1) =>
      dispatchV1(semantic, {
        kind: "resolve",
        expectedOccurrenceId: occurrenceId,
        resolution,
      } as never),
    [semantic],
  );
  return (
    <DialoguePanelV1
      pending={narrative.pending as PendingInteractionV1 | null}
      history={narrative.history as NarrativeHistoryV1}
      playerProfile={props.playerProfile}
      uiText={uiText}
      onResolve={onResolve}
      labels={{
        advanceLabel: uiText("text.cc.narrative.advance"),
        autoLabel: uiText("text.cc.playback.auto"),
        skipLabel: uiText("text.cc.playback.skip"),
        historyLabel: uiText("text.cc.playback.history"),
        historyTitle: uiText("text.cc.playback.history.title"),
        historyEmptyText: uiText("text.cc.playback.history.empty"),
        historyCloseLabel: uiText("text.cc.playback.history.close"),
      }}
    />
  );
}

/** 玩家回退：有界检查点环；比赛开赛/结局确认是硬边界（策略见 core-definition）。 */
function CatcafeRollbackControlV1(props: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly label: string;
}): ReactElement {
  const rollback = props.instance.rollback;
  const steps = useSyncExternalStore(
    rollback.subscribe,
    () => rollback.available().steps,
    () => rollback.available().steps,
  );
  return (
    <Button
      data-cc-rollback="true"
      data-cc-rollback-steps={String(steps)}
      disabled={steps < 1}
      onClick={() => void rollback.toPrevious()}
    >
      {props.label}
    </Button>
  );
}

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
  useCatcafeAutoBeginV1(props.publication, props.semantic);
  const contestToast = useCatcafeContestToastV1(props.instance);
  const encounterTextId = useCatcafeEncounterNoticeV1(props.instance);
  const game = props.publication.semantic.game;
  const contest = game.contest;
  const slotName = catcafeSlotsV1[game.calendar.slot] ?? "morning";
  const actions = props.publication.semantic.actions;
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
      <CatcafeEndingScreenV1
        ending={game.ending}
        semantic={props.semantic}
        registry={props.registry}
        uiText={uiText}
        onRestart={() => void props.instance.lifecycle.restart()}
      />
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
      <style>{catcafeChromeCssV1}</style>
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
          // 对话进行中让出舞台：动作栏隐藏，等叙事面板退场再回来。
          ...(props.publication.semantic.narrative.pending === null
            ? {}
            : { visibility: "hidden" as const }),
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
              <CatcafeRollbackControlV1
                instance={props.instance}
                label={uiText("text.cc.playback.rollback")}
              />
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
          <CatcafeContestPanelV1
            contest={contest}
            semantic={props.semantic}
            registry={props.registry}
            uiText={uiText}
            panelStyle={panel}
          />
        )}
      </footer>
    </div>
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

/** 连续声音意图来自游戏视图；host 惰性创建（首个用户手势解锁播放）。 */
const selectCatcafeAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const createCatcafeAudioHostV1 = (): AudioHostV1 =>
  createWebAudioHostV1({
    manifest: catcafeAudioManifestV1,
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
  });

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
      <>
        <GameAudioV1
          ports={input.instance}
          createHost={createCatcafeAudioHostV1}
          selectIntent={selectCatcafeAudioIntentV1}
          resolveEffectAsset={resolveCatcafeEffectAssetV1}
          playerProfile={input.playerProfile}
        />
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
      </>
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

export const catcafeGameApplicationV1: WebGameApplicationV1<
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
    // 等比放大撑满窗口（fit 缩放天然保比例、必要时留黑边）。
    maxScale: 4,
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
        // 片头：本作完全由 AI 生成（代码、文本、美术、音频）。
        splash: Object.freeze({
          lines:
            playerProfile.current().preferences.locale === "en"
              ? Object.freeze([
                  "This game is entirely AI-generated",
                  "Code, story, art, and audio · SillyMaker Engine",
                ])
              : Object.freeze([
                  "本游戏内容完全由 AI 生成",
                  "代码 · 剧本 · 美术 · 音频 — SillyMaker 引擎",
                ]),
        }),
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
