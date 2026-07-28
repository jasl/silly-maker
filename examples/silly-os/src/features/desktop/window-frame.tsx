// SPDX-License-Identifier: MIT
// 桌面切片·窗体框架：标题栏（图标/标题/最小化/最大化/关闭）、双色
// bevel、标题栏拖拽。拖拽用 Pointer Capture——捕获期间事件全部归标题
// 栏，掠过 iframe 也不丢（老 mousemove 方案的经典坑在这里不存在）。
import { useRef } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import { useGameViewportV1 } from "@sillymaker/ui";

import { os98, osBevelOutV1 } from "../../application/ui-kit.ts";
import type { OsWindowManagerV1, OsWindowRectV1, OsWindowV1 } from "./window-manager.ts";

function TitleButtonV1(props: {
  readonly label: string;
  readonly glyph: string;
  readonly testId: string;
  onActivate(): void;
}): ReactElement {
  return (
    <button
      type="button"
      className="os-button"
      aria-label={props.label}
      title={props.label}
      data-os-window-button={props.testId}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        props.onActivate();
      }}
      style={{
        inlineSize: "18px",
        blockSize: "16px",
        padding: 0,
        display: "grid",
        placeContent: "center",
        fontWeight: 700,
        fontSize: "10px",
        lineHeight: 1,
      }}
    >
      {props.glyph}
    </button>
  );
}

export function OsWindowFrameV1(props: {
  readonly window: OsWindowV1;
  readonly focused: boolean;
  readonly title: string;
  readonly icon: ReactNode;
  readonly wm: OsWindowManagerV1;
  /** 最大化边界（桌面区，扣除任务栏）。 */
  readonly bounds: OsWindowRectV1;
  readonly labels: {
    readonly minimize: string;
    readonly maximize: string;
    readonly restore: string;
    readonly close: string;
  };
  readonly children: ReactNode;
}): ReactElement | null {
  const { window: win, wm } = props;
  const viewport = useGameViewportV1();
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    rectX: number;
    rectY: number;
  } | null>(null);

  if (win.mode === "minimized") return null;

  const maximized = win.mode === "maximized";
  const style: CSSProperties = {
    position: "absolute",
    insetInlineStart: `${String(win.rect.x)}px`,
    insetBlockStart: `${String(win.rect.y)}px`,
    inlineSize: `${String(win.rect.width)}px`,
    blockSize: `${String(win.rect.height)}px`,
    zIndex: win.z,
    display: "grid",
    gridTemplateRows: "auto 1fr",
    pointerEvents: "auto",
    font: os98.font,
    ...osBevelOutV1,
  };

  return (
    <section
      role="dialog"
      aria-label={props.title}
      data-os-window={win.appId}
      data-os-window-id={win.windowId}
      data-os-focused={String(props.focused)}
      style={style}
      onPointerDownCapture={() => {
        if (!props.focused) wm.focus(win.windowId);
      }}
    >
      <header
        data-os-titlebar="true"
        style={{
          margin: "2px",
          padding: "2px 3px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: props.focused ? os98.titleActive : os98.titleInactive,
          color: os98.titleText,
          cursor: maximized ? "default" : "move",
          userSelect: "none",
          touchAction: "none",
        }}
        onPointerDown={(event) => {
          if (maximized || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            rectX: win.rect.x,
            rectY: win.rect.y,
          };
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (state === null || state.pointerId !== event.pointerId) return;
          // client px → stage 逻辑单位：viewport 提供连续缩放因子。
          const dx = (event.clientX - state.startX) / viewport.scale;
          const dy = (event.clientY - state.startY) / viewport.scale;
          // 标题栏至少留 18px 可抓，防止拖出桌面找不回来。
          const x = Math.min(
            props.bounds.x + props.bounds.width - 48,
            Math.max(props.bounds.x - win.rect.width + 48, Math.round(state.rectX + dx)),
          );
          const y = Math.min(
            props.bounds.y + props.bounds.height - 24,
            Math.max(props.bounds.y, Math.round(state.rectY + dy)),
          );
          wm.move(win.windowId, x, y);
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId === event.pointerId) drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onDoubleClick={() => wm.toggleMaximize(win.windowId, props.bounds)}
      >
        <span style={{ display: "inline-flex" }}>{props.icon}</span>
        <strong style={{ flex: 1, fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden" }}>
          {props.title}
        </strong>
        <TitleButtonV1
          label={props.labels.minimize}
          glyph="_"
          testId="minimize"
          onActivate={() => wm.minimize(win.windowId)}
        />
        <TitleButtonV1
          label={maximized ? props.labels.restore : props.labels.maximize}
          glyph={maximized ? "❐" : "□"}
          testId="maximize"
          onActivate={() => wm.toggleMaximize(win.windowId, props.bounds)}
        />
        <TitleButtonV1
          label={props.labels.close}
          glyph="✕"
          testId="close"
          onActivate={() => wm.close(win.windowId)}
        />
      </header>
      <div
        style={{
          margin: "0 2px 2px",
          minBlockSize: 0,
          display: "grid",
          overflow: "hidden",
          background: os98.face,
        }}
      >
        {props.children}
      </div>
    </section>
  );
}
