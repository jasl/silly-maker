// SPDX-License-Identifier: MIT
// Desktop slice · desktop and taskbar: wallpaper, icons (double-click/Enter opens),
// Start menu, window buttons, clock (UI clock, not authoritative), and the shutdown screen.
import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import { os98, osBevelInV1, osBevelOutV1 } from "../../../application/ui-kit.ts";
import { OsStartLogoV1 } from "./icons.tsx";
import type { OsWindowManagerSnapshotV1, OsWindowManagerV1 } from "./window-manager.ts";

/** Measurement fallback only (under the fluid viewport the desktop tracks the browser area). */
export const osDesktopCanvasV1 = Object.freeze({ width: 1024, height: 768 });
export const osTaskbarHeightV1 = 34;

export function osDesktopBoundsForV1(viewport: {
  readonly cssWidth: number;
  readonly cssHeight: number;
}): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return Object.freeze({
    x: 0,
    y: 0,
    width: Math.max(200, Math.round(viewport.cssWidth)),
    height: Math.max(160, Math.round(viewport.cssHeight) - osTaskbarHeightV1),
  });
}

export const osWallpaperStylesV1: Readonly<Record<string, CSSProperties>> = Object.freeze({
  teal: Object.freeze({ background: os98.desktop }),
  clouds: Object.freeze({
    background: "radial-gradient(ellipse 60% 40% at 25% 30%, #f4f8ff 0 18%, transparent 42%)," +
      "radial-gradient(ellipse 50% 32% at 70% 60%, #e8f2ff 0 16%, transparent 40%)," +
      "linear-gradient(180deg, #4a86c8, #9fc4e8)",
  }),
  dusk: Object.freeze({
    background: "linear-gradient(180deg, #1a1a40 0%, #5a3a70 55%, #c86a50 100%)",
  }),
});

export function OsDesktopIconV1(props: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly testId: string;
  onOpen(): void;
}): ReactElement {
  return (
    <button
      type="button"
      data-os-desktop-icon={props.testId}
      onDoubleClick={props.onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onOpen();
        }
      }}
      style={{
        display: "grid",
        justifyItems: "center",
        gap: "4px",
        inlineSize: "76px",
        padding: "6px 2px",
        border: "1px solid transparent",
        background: "transparent",
        color: "#ffffff",
        textShadow: "1px 1px 0 rgba(0, 0, 0, 0.8)",
        font: os98.font,
        cursor: "default",
      }}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function OsClockV1(): ReactElement {
  // The taskbar clock is pure UI decoration: reads the wall clock, never writes authoritative state.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <span
      style={{
        ...osBevelInV1,
        background: os98.face,
        padding: "2px 8px",
        font: os98.font,
      }}
    >
      {hh}:{mm}
    </span>
  );
}

export function OsTaskbarV1(props: {
  readonly wm: OsWindowManagerV1;
  readonly snapshot: OsWindowManagerSnapshotV1;
  readonly startLabel: string;
  readonly taskbarLabel: string;
  readonly startOpen: boolean;
  readonly windowTitle: (appId: string) => string;
  /** Tray area (volume etc.), left of the clock. */
  readonly tray?: ReactNode;
  onToggleStart(): void;
}): ReactElement {
  const ordered = [...props.snapshot.windows].toSorted((a, b) => a.order - b.order);
  return (
    <footer
      role="toolbar"
      aria-label={props.taskbarLabel}
      data-os-taskbar="true"
      style={{
        position: "absolute",
        insetInline: 0,
        insetBlockEnd: 0,
        blockSize: `${String(osTaskbarHeightV1)}px`,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 4px",
        boxSizing: "border-box",
        pointerEvents: "auto",
        zIndex: 100_000,
        ...osBevelOutV1,
        borderWidth: "2px 0 0 0",
        borderColor: "#ffffff",
      }}
    >
      <button
        type="button"
        className="os-button"
        data-os-start-button="true"
        aria-expanded={props.startOpen}
        onClick={props.onToggleStart}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          fontWeight: 700,
        }}
      >
        <OsStartLogoV1 size={16} />
        {props.startLabel}
      </button>
      <span style={{ inlineSize: "2px", alignSelf: "stretch", ...osBevelInV1, padding: 0 }} />
      <div style={{ flex: 1, display: "flex", gap: "3px", overflow: "hidden" }}>
        {ordered.map((window) => {
          const active = props.snapshot.focusedWindowId === window.windowId &&
            window.mode !== "minimized";
          return (
            <button
              key={window.windowId}
              type="button"
              className="os-button"
              data-os-task-button={window.appId}
              aria-pressed={active}
              onClick={() => props.wm.taskbarActivate(window.windowId)}
              style={{
                flex: "0 1 148px",
                minInlineSize: "56px",
                maxInlineSize: "180px",
                padding: "2px 8px",
                fontWeight: active ? 700 : 400,
                textAlign: "start",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {props.windowTitle(window.appId)}
            </button>
          );
        })}
      </div>
      {props.tray ?? null}
      <OsClockV1 />
    </footer>
  );
}

export interface OsStartMenuItemV1 {
  readonly id: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly onActivate: () => void;
}

export function OsStartMenuV1(props: {
  readonly appItems: readonly OsStartMenuItemV1[];
  readonly systemItems: readonly OsStartMenuItemV1[];
  onClose(): void;
}): ReactElement {
  const renderItem = (item: OsStartMenuItemV1): ReactElement => (
    <button
      key={item.id}
      type="button"
      data-os-start-item={item.id}
      onClick={() => {
        props.onClose();
        item.onActivate();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        inlineSize: "100%",
        padding: "6px 10px",
        border: "none",
        background: "transparent",
        font: os98.font,
        textAlign: "start",
        whiteSpace: "nowrap",
        cursor: "default",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "#000080";
        event.currentTarget.style.color = "#ffffff";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
        event.currentTarget.style.color = "#000000";
      }}
    >
      {item.icon}
      {item.label}
    </button>
  );
  return (
    <nav
      data-os-start-menu="true"
      aria-label="Start menu"
      style={{
        position: "absolute",
        insetInlineStart: "4px",
        insetBlockEnd: `${String(osTaskbarHeightV1 + 2)}px`,
        inlineSize: "min(220px, calc(100% - 8px))",
        maxBlockSize: "calc(100% - 44px)",
        zIndex: 100_001,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        overflow: "hidden",
        ...osBevelOutV1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 24px",
          inlineSize: "24px",
          overflow: "hidden",
          background: "linear-gradient(180deg, #1084d0, #000080)",
          color: "#ffffff",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          font: os98.font,
          fontWeight: 700,
          fontSize: "14px",
          padding: "8px 4px",
          letterSpacing: "1px",
        }}
      >
        SillyOS 98
      </span>
      <div
        style={{
          flex: "1 1 auto",
          minInlineSize: 0,
          display: "grid",
          alignContent: "start",
          padding: "2px",
          overflowY: "auto",
        }}
      >
        {props.appItems.map(renderItem)}
        <hr
          style={{
            inlineSize: "100%",
            border: "none",
            borderBlockStart: "1px solid #808080",
            borderBlockEnd: "1px solid #ffffff",
            margin: "3px 0",
          }}
        />
        {props.systemItems.map(renderItem)}
      </div>
    </nav>
  );
}
