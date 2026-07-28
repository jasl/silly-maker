// SPDX-License-Identifier: MIT
// PascalCase React shell (Vite Fast Refresh–safe).
// Application binding and slots live in `composition.tsx`.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { useGameViewportV1 } from "@sillymaker/ui";

import type { OsApplicationInstanceV1 } from "./core-definition.ts";
import type { OsUiPublicationV1, OsSemanticPortV1 } from "./ui-kit.ts";
import { os98, osChromeCssV1, useOsTextV1 } from "./ui-kit.ts";
import type { OsAppContextV1 } from "./apps.tsx";
import { osAppByIdV1, osAppsV1 } from "./apps.tsx";
import {
  OsDesktopIconV1,
  OsStartMenuV1,
  OsTaskbarV1,
  osDesktopBoundsForV1,
} from "../features/desktop/desktop.tsx";
import { OsComputerIconV1, OsDisplayIconV1 } from "../features/desktop/icons.tsx";
import { OsWindowFrameV1 } from "../features/desktop/window-frame.tsx";
import { OsBootScreenV1 } from "../features/desktop/boot-screen.tsx";
import { OsVolumeTrayV1 } from "../features/desktop/volume-tray.tsx";
import type { OsWindowManagerV1 } from "../features/desktop/window-manager.ts";

/** 桌面 shell：图标、窗口层、任务栏、开始菜单、关机幕——全部 UI 瞬态。 */
export function OsShellV1(props: {
  readonly publication: DeepReadonly<OsUiPublicationV1>;
  readonly semantic: OsSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly instance: OsApplicationInstanceV1;
  readonly wm: OsWindowManagerV1;
}): ReactElement {
  const uiText = useOsTextV1(props.playerProfile);
  const viewport = useGameViewportV1();
  const { wm } = props;
  const snapshot = useSyncExternalStore(wm.subscribe, wm.snapshot, wm.snapshot);
  const [startOpen, setStartOpen] = useState(false);
  const [shutdown, setShutdown] = useState(false);
  const [booting, setBooting] = useState(true);
  const [exploded, setExploded] = useState(false);

  const boundsWidth = osDesktopBoundsForV1(viewport).width;
  const boundsHeight = osDesktopBoundsForV1(viewport).height;
  const bounds = useMemo(
    () => Object.freeze({ x: 0, y: 0, width: boundsWidth, height: boundsHeight }),
    [boundsWidth, boundsHeight],
  );
  // 视口变化（旋转、缩放窗口）时把窗口拉回桌面。
  useEffect(() => {
    wm.clampToBounds(bounds);
  }, [wm, bounds]);

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
    wm.open(appId, { rect: app.defaultRect, singleton: app.singleton, bounds });
  };

  if (booting) {
    return (
      <OsBootScreenV1
        title="SillyOS 98"
        aiNotice={uiText("text.os.boot.ai-notice")}
        onDone={() => setBooting(false)}
      />
    );
  }

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
        <style>{osChromeCssV1}</style>
        <p style={{ margin: 0, maxInlineSize: "26em" }}>{uiText("text.os.shutdown.message")}</p>
        <span style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            className="os-button"
            data-os-shutdown-restart="true"
            style={{ padding: "4px 14px" }}
            onClick={() => void props.instance.lifecycle.restart()}
          >
            {uiText("text.os.shutdown.restart")}
          </button>
          <button
            type="button"
            className="os-button"
            data-os-shutdown-back="true"
            style={{ padding: "4px 14px" }}
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
        // fluid 视口：桌面即浏览器区域，窗口矩形直接用 CSS px。
        position: "absolute",
        inset: 0,
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
      <style>{osChromeCssV1}</style>
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
          maxBlockSize: `${String(Math.max(120, bounds.height - 16))}px`,
          display: "flex",
          flexDirection: "column",
          flexWrap: "wrap",
          alignContent: "start",
          gap: "10px",
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
            bounds={bounds}
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
              id: "system.settings",
              label: uiText("text.os.start.settings"),
              icon: <OsDisplayIconV1 size={20} />,
              onActivate: () => openApp("app.control-panel"),
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
        tray={
          <OsVolumeTrayV1
            playerProfile={props.playerProfile}
            volumeLabel={uiText("text.os.volume")}
            muteLabel={uiText("text.os.volume.mute")}
          />
        }
      />
    </div>
  );
}
