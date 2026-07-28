// SPDX-License-Identifier: MIT
// 组合层：把桌面 shell、应用注册表、设置与外壳文案组装成可启动应用。
// 只编排，不拥有玩法——窗口管理器在 desktop 切片，应用在各自切片。
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { DefaultGameRootSlotsV1, GameUiProjectorV1 } from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type { OsApplicationInstanceV1 } from "./core-definition.ts";
import { osCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  OsActionDescriptorV1,
  OsActionResultV1,
  OsInvocationV1,
  OsPreviewV1,
} from "./semantic.ts";
import type {
  OsGameViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsSimulationTypesV1,
} from "../simulation.ts";
import { osResolveLocaleV1, osTextForLocaleV1 } from "../presentation.ts";
import type {
  OsPresentationViewV1,
  OsSemanticPortV1,
  OsSemanticPublicationV1,
  OsUiPublicationV1,
} from "./ui-kit.ts";
import { os98, osBevelOutV1, useOsTextV1 } from "./ui-kit.ts";
import { useGameViewportV1 } from "@sillymaker/ui";
import {
  osRootLabelsEnV1,
  osRootLabelsZhV1,
  osSaveOverlayLabelsEnV1,
  osSaveOverlayLabelsZhV1,
} from "./labels.ts";
import type { OsAppContextV1 } from "./apps.tsx";
import { osAppByIdV1, osAppsV1 } from "./apps.tsx";
import {
  OsDesktopIconV1,
  OsStartMenuV1,
  OsTaskbarV1,
  osDesktopBoundsV1,
  osDesktopCanvasV1,
  osWallpaperStylesV1,
} from "../features/desktop/Desktop.tsx";
import { OsComputerIconV1, OsDisplayIconV1, OsNotepadIconV1 } from "../features/desktop/icons.tsx";
import { OsWindowFrameV1 } from "../features/desktop/WindowFrame.tsx";
import { createOsWindowManagerV1 } from "../features/desktop/window-manager.ts";
import type { OsWindowManagerV1 } from "../features/desktop/window-manager.ts";

export type { OsUiPublicationV1 } from "./ui-kit.ts";

const projectorDefinitionV1: GameUiProjectorV1<
  OsSemanticPublicationV1,
  null,
  Record<never, never>,
  OsPresentationViewV1,
  never
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) =>
    Object.freeze({
      view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
      requiredAssetIds: Object.freeze([]),
    }),
};

export const osUiProjectorV1 = Object.freeze(projectorDefinitionV1);

/** 桌面 shell：图标、窗口层、任务栏、开始菜单、关机幕——全部 UI 瞬态。 */
function OsShellV1(props: {
  readonly publication: DeepReadonly<OsUiPublicationV1>;
  readonly semantic: OsSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly instance: OsApplicationInstanceV1;
  readonly wm: OsWindowManagerV1;
  readonly systemDialogs: { openSettings(): void; openSaves(): void };
}): ReactElement {
  const uiText = useOsTextV1(props.playerProfile);
  const viewport = useGameViewportV1();
  const systemDialogs = props.systemDialogs;
  const { wm } = props;
  const snapshot = useSyncExternalStore(wm.subscribe, wm.snapshot, wm.snapshot);
  const [startOpen, setStartOpen] = useState(false);
  const [shutdown, setShutdown] = useState(false);
  const [exploded, setExploded] = useState(false);

  // 踩雷演出：瞬态效果通道→桌面短促震动（纯装饰）。
  useEffect(
    () =>
      props.instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.os.mine") return;
        const outcome = (effect.payload as { readonly outcome?: string }).outcome;
        if (outcome !== "exploded") return;
        setExploded(true);
        setTimeout(() => setExploded(false), 400);
      }),
    [props.instance],
  );

  const openApp = (appId: string): void => {
    const app = osAppByIdV1(appId);
    if (app === null) return;
    wm.open(appId, { rect: app.defaultRect, singleton: app.singleton });
  };

  if (shutdown) {
    return (
      <div
        data-os-shutdown="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          gap: "18px",
          background: "#000000",
          color: "#ffb060",
          textAlign: "center",
          font: '700 22px "Courier New", monospace',
          pointerEvents: "auto",
          zIndex: 200_000,
        }}
      >
        <p style={{ margin: 0, maxInlineSize: "26em" }}>{uiText("text.os.shutdown.message")}</p>
        <span style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            data-os-shutdown-restart="true"
            style={{ ...osBevelOutV1, font: os98.font, padding: "4px 14px" }}
            onClick={() => void props.instance.lifecycle.restart()}
          >
            {uiText("text.os.shutdown.restart")}
          </button>
          <button
            type="button"
            data-os-shutdown-back="true"
            style={{ ...osBevelOutV1, font: os98.font, padding: "4px 14px" }}
            onClick={() => setShutdown(false)}
          >
            {uiText("text.os.shutdown.back")}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div
      data-os-shell="true"
      style={{
        // 桌面按逻辑画布（1024×768）布局，整体随 viewport 连续缩放：
        // 窗口矩形/任务栏/图标全部用逻辑 px，一次 transform 对齐。
        position: "absolute",
        insetInlineStart: 0,
        insetBlockStart: 0,
        inlineSize: `${String(osDesktopCanvasV1.width)}px`,
        blockSize: `${String(osDesktopCanvasV1.height)}px`,
        transform: `scale(${String(viewport.scale)})`,
        transformOrigin: "0 0",
        pointerEvents: "auto",
        font: os98.font,
        color: os98.faceText,
        animation: exploded ? "os-shake 0.4s linear" : undefined,
      }}
      onPointerDown={(event) => {
        // 点击桌面空白处关闭开始菜单（点菜单/任务栏本身不关）。
        const target = event.target as HTMLElement;
        if (target.closest("[data-os-start-menu], [data-os-start-button]") === null) {
          setStartOpen(false);
        }
      }}
    >
      <style>{`@keyframes os-shake {
        0%, 100% { translate: 0 0; }
        20% { translate: -6px 2px; }
        40% { translate: 5px -2px; }
        60% { translate: -4px 1px; }
        80% { translate: 3px -1px; }
      }`}</style>
      <div
        role="group"
        aria-label={uiText("text.os.desktop.aria")}
        data-os-desktop-icons="true"
        style={{
          position: "absolute",
          insetInlineStart: "8px",
          insetBlockStart: "8px",
          display: "grid",
          gap: "10px",
          justifyItems: "start",
        }}
      >
        {osAppsV1
          .filter((app) => app.desktopIcon)
          .map((app) => (
            <OsDesktopIconV1
              key={app.appId}
              label={uiText(app.nameTextId)}
              icon={app.icon(32)}
              testId={app.appId}
              onOpen={() => openApp(app.appId)}
            />
          ))}
      </div>

      {snapshot.windows.map((window) => {
        const app = osAppByIdV1(window.appId);
        if (app === null) return null;
        const context: OsAppContextV1 = {
          publication: props.publication,
          semantic: props.semantic,
          playerProfile: props.playerProfile,
          uiText,
          windowId: window.windowId,
        };
        return (
          <OsWindowFrameV1
            key={window.windowId}
            window={window}
            focused={snapshot.focusedWindowId === window.windowId}
            title={uiText(app.nameTextId)}
            icon={app.icon(16)}
            wm={wm}
            bounds={osDesktopBoundsV1}
            labels={{
              minimize: uiText("text.os.window.minimize"),
              maximize: uiText("text.os.window.maximize"),
              restore: uiText("text.os.window.restore"),
              close: uiText("text.os.window.close"),
            }}
          >
            {app.render(context)}
          </OsWindowFrameV1>
        );
      })}

      {startOpen ? (
        <OsStartMenuV1
          appItems={osAppsV1.map((app) => ({
            id: app.appId,
            label: uiText(app.nameTextId),
            icon: app.icon(20),
            onActivate: () => openApp(app.appId),
          }))}
          systemItems={[
            {
              id: "system.save",
              label: uiText("text.os.start.save"),
              icon: <OsNotepadIconV1 size={20} />,
              onActivate: () => systemDialogs.openSaves(),
            },
            {
              id: "system.settings",
              label: uiText("text.os.start.settings"),
              icon: <OsDisplayIconV1 size={20} />,
              onActivate: () => systemDialogs.openSettings(),
            },
            {
              id: "system.shutdown",
              label: uiText("text.os.start.shutdown"),
              icon: <OsComputerIconV1 size={20} />,
              onActivate: () => setShutdown(true),
            },
          ]}
          onClose={() => setStartOpen(false)}
        />
      ) : null}

      <OsTaskbarV1
        wm={wm}
        snapshot={snapshot}
        startLabel={uiText("text.os.taskbar.start")}
        taskbarLabel={uiText("text.os.taskbar.aria")}
        startOpen={startOpen}
        windowTitle={(appId) => {
          const app = osAppByIdV1(appId);
          return app === null ? appId : uiText(app.nameTextId);
        }}
        onToggleStart={() => setStartOpen((current) => !current)}
      />
    </div>
  );
}

/** 设置节：语言（跟随浏览器 / 中文 / English），存 Host profile。 */
function OsSettingsV1(props: { readonly playerProfile: PlayerProfileStoreV1 }): ReactElement {
  const uiText = useOsTextV1(props.playerProfile);
  const [, setVersion] = useState(0);
  useEffect(
    () => props.playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [props.playerProfile],
  );
  const current = props.playerProfile.current().preferences.locale ?? "auto";
  const options = [
    { id: "auto", label: uiText("text.os.settings.language.auto") },
    { id: "zh-CN", label: "中文" },
    { id: "en", label: "English" },
  ] as const;
  return (
    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {uiText("text.os.settings.language")}
      <select
        data-os-settings-language="true"
        value={current}
        onChange={(event) => {
          const value = event.target.value;
          void props.playerProfile.updatePreferences({
            locale: value === "auto" ? null : value,
          });
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function createOsUiSlotsV1(input: {
  readonly instance: OsApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): DefaultGameRootSlotsV1<OsUiPublicationV1, OsSemanticPortV1, never> {
  const wm = createOsWindowManagerV1();
  return {
    background: (context) => (
      <div
        data-os-wallpaper={context.publication.semantic.game.wallpaperId}
        style={{
          position: "absolute",
          inset: 0,
          ...osWallpaperStylesV1[context.publication.semantic.game.wallpaperId],
        }}
      />
    ),
    hud: (context) => (
      <OsShellV1
        publication={context.publication}
        semantic={context.semantic}
        playerProfile={input.playerProfile}
        instance={input.instance}
        wm={wm}
        systemDialogs={context.systemDialogs}
      />
    ),
    settingsSections: () => [
      <OsSettingsV1 key="os-settings" playerProfile={input.playerProfile} />,
    ],
  };
}

export const osGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  OsSimulationTypesV1,
  OsQueriesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1,
  null,
  Record<never, never>,
  OsPresentationViewV1,
  never,
  never
> = Object.freeze({
  applicationId: "example-silly-os",
  accessibleName: "SillyOS 98",
  viewport: Object.freeze({
    canvas: osDesktopCanvasV1,
    fallbackSize: Object.freeze({ width: 1280, height: 960 }),
    maxScale: 3,
  }),
  core: osCoreApplicationDefinitionV1,
  ui: ({
    instance,
    playerProfile,
  }: {
    readonly instance: OsApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
  }) => {
    const requested =
      typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
    const locale = osResolveLocaleV1(playerProfile.current().preferences.locale, requested);
    const zh = locale === "zh-CN";
    return Object.freeze({
      titleScreen: Object.freeze({
        title: osTextForLocaleV1(locale, "text.os.boot.title"),
        splash: Object.freeze({
          lines: zh
            ? Object.freeze(["本游戏内容完全由 AI 生成", "代码 · 文案 · 图标 — SillyMaker 引擎"])
            : Object.freeze([
                "This game is entirely AI-generated",
                "Code, copy, and icons · SillyMaker Engine",
              ]),
        }),
      }),
      projector: osUiProjectorV1,
      overlayIds: Object.freeze([] as const),
      slots: createOsUiSlotsV1({ instance, playerProfile }),
      labels: zh ? osRootLabelsZhV1 : osRootLabelsEnV1,
      saveLabels: zh ? osSaveOverlayLabelsZhV1 : osSaveOverlayLabelsEnV1,
      hideSystemMenu: true,
    });
  },
});
