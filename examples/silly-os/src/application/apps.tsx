// SPDX-License-Identifier: MIT
// 应用注册表：一个"软件"= 一条声明（id、名字、图标、初始窗口、单例、
// 渲染）。桌面图标、开始菜单、窗口内容全部从这张表派生——加新应用
// 只需要在各自切片写组件 + 这里加一行。
import type { ReactElement, ReactNode } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import type { OsSemanticPortV1, OsUiPublicationV1 } from "./ui-kit.ts";
import type { OsWindowRectV1 } from "../features/desktop/window-manager.ts";
import {
  OsBrowserIconV1,
  OsDisplayIconV1,
  OsMineIconV1,
  OsNotepadIconV1,
} from "../features/desktop/icons.tsx";
import { OsBrowserAppV1 } from "../features/browser/BrowserApp.tsx";
import { OsMinesweeperAppV1 } from "../features/minesweeper/MinesweeperApp.tsx";
import { OsNotepadAppV1 } from "../features/notepad/NotepadApp.tsx";
import { OsWallpaperAppV1 } from "../features/desktop/WallpaperApp.tsx";

export interface OsAppContextV1 {
  readonly publication: DeepReadonly<OsUiPublicationV1>;
  readonly semantic: OsSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly uiText: (textId: string) => string;
  readonly windowId: string;
}

export interface OsDesktopAppV1 {
  readonly appId: string;
  readonly nameTextId: string;
  readonly icon: (size: number) => ReactNode;
  readonly defaultRect: OsWindowRectV1;
  readonly singleton: boolean;
  /** 桌面图标是否展示（工具类应用可只进开始菜单）。 */
  readonly desktopIcon: boolean;
  render(context: OsAppContextV1): ReactElement;
}

export const osAppsV1: readonly OsDesktopAppV1[] = Object.freeze([
  Object.freeze({
    appId: "app.minesweeper",
    nameTextId: "text.os.app.minesweeper",
    icon: (size: number) => <OsMineIconV1 size={size} />,
    defaultRect: Object.freeze({ x: 320, y: 96, width: 260, height: 340 }),
    singleton: true,
    desktopIcon: true,
    render: (context: OsAppContextV1) => (
      <OsMinesweeperAppV1
        minesweeper={context.publication.semantic.game.minesweeper}
        semantic={context.semantic}
        uiText={context.uiText}
      />
    ),
  }),
  Object.freeze({
    appId: "app.notepad",
    nameTextId: "text.os.app.notepad",
    icon: (size: number) => <OsNotepadIconV1 size={size} />,
    defaultRect: Object.freeze({ x: 260, y: 140, width: 460, height: 340 }),
    singleton: false,
    desktopIcon: true,
    render: (context: OsAppContextV1) => (
      <OsNotepadAppV1
        files={context.publication.semantic.game.files}
        semantic={context.semantic}
        uiText={context.uiText}
      />
    ),
  }),
  Object.freeze({
    appId: "app.browser",
    nameTextId: "text.os.app.browser",
    icon: (size: number) => <OsBrowserIconV1 size={size} />,
    defaultRect: Object.freeze({ x: 200, y: 80, width: 620, height: 460 }),
    singleton: false,
    desktopIcon: true,
    render: (context: OsAppContextV1) => <OsBrowserAppV1 uiText={context.uiText} />,
  }),
  Object.freeze({
    appId: "app.wallpaper",
    nameTextId: "text.os.app.wallpaper",
    icon: (size: number) => <OsDisplayIconV1 size={size} />,
    defaultRect: Object.freeze({ x: 380, y: 180, width: 300, height: 300 }),
    singleton: true,
    desktopIcon: false,
    render: (context: OsAppContextV1) => (
      <OsWallpaperAppV1
        current={context.publication.semantic.game.wallpaperId}
        semantic={context.semantic}
        uiText={context.uiText}
      />
    ),
  }),
]);

export function osAppByIdV1(appId: string): OsDesktopAppV1 | null {
  return osAppsV1.find((app) => app.appId === appId) ?? null;
}
