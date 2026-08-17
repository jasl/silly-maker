// SPDX-License-Identifier: MIT
// App registry: one "program" = one declaration (id, name, icon, initial window,
// singleton, render). Desktop icons, the Start menu, and window contents all derive
// from this table — adding an app means writing components in its slice + one row here.
import type { ReactElement, ReactNode } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import type { OsSemanticPortV1, OsUiPublicationV1 } from "./ui-kit.ts";
import type { OsWindowRectV1 } from "../game/features/desktop/window-manager.ts";
import {
  OsBrowserIconV1,
  OsComputerIconV1,
  OsDisplayIconV1,
  OsMineIconV1,
  OsNotepadIconV1,
} from "../game/features/desktop/icons.tsx";
import { OsBrowserAppV1 } from "../game/features/browser/browser-app.tsx";
import { OsMinesweeperAppV1 } from "../game/features/minesweeper/minesweeper-app.tsx";
import { OsNotepadAppV1 } from "../game/features/notepad/notepad-app.tsx";
import { OsControlPanelAppV1 } from "../game/features/desktop/control-panel-app.tsx";
import { OsWallpaperAppV1 } from "../game/features/desktop/wallpaper-app.tsx";

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
  /** Whether to show a desktop icon (utility apps may live only in the Start menu). */
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
    appId: "app.control-panel",
    nameTextId: "text.os.app.control-panel",
    icon: (size: number) => <OsComputerIconV1 size={size} />,
    defaultRect: Object.freeze({ x: 340, y: 150, width: 340, height: 280 }),
    singleton: true,
    desktopIcon: false,
    render: (context: OsAppContextV1) => (
      <OsControlPanelAppV1 playerProfile={context.playerProfile} uiText={context.uiText} />
    ),
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
