// SPDX-License-Identifier: MIT
// 共享 UI 基座：98 风格主题令牌（bevel 双色边）、locale 文本 hook、
// 发布/端口类型与派发助手。特性切片只依赖这里与引擎。
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { RuntimePresentationPublicationV1 } from "@sillymaker/ui";

import type { OsApplicationInstanceV1 } from "./core-definition.ts";
import { osResolveLocaleV1, osTextForLocaleV1 } from "../presentation.ts";

export type OsSemanticPublicationV1 = ReturnType<OsApplicationInstanceV1["semantic"]["observe"]>;
export type OsSemanticPortV1 = OsApplicationInstanceV1["semantic"];

export interface OsPresentationViewV1 {
  readonly anchorEpoch: number;
}

export type OsUiPublicationV1 = RuntimePresentationPublicationV1<
  OsSemanticPublicationV1,
  OsPresentationViewV1,
  never
>;

export type OsUiOverlayIdV1 = never;

/** 语义派发助手：桌面交互统一走这里（会话队列前沿栅栏化陈旧输入）。 */
export function dispatchV1(semantic: OsSemanticPortV1, invocation: unknown): void {
  void semantic.dispatch(invocation as never);
}

/**
 * Locale 感知的 UI 文本：显式偏好（设置页，存 Host profile）优先；
 * 未设置时跟随浏览器上报语言（中文→中文，其余→英文）。
 */
export function useOsTextV1(playerProfile: PlayerProfileStoreV1): (textId: string) => string {
  const [, setVersion] = useState(0);
  useEffect(
    () => playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [playerProfile],
  );
  const preference = playerProfile.current().preferences.locale;
  const requested =
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  const locale = osResolveLocaleV1(preference, requested);
  return (textId: string) => osTextForLocaleV1(locale, textId);
}

// ---------------------------------------------------------------------------
// 98 视觉语言：双色 bevel。全部窗体/按钮/输入框共享这几组常量。
// ---------------------------------------------------------------------------

export const os98 = Object.freeze({
  face: "#c0c0c0",
  faceText: "#000000",
  desktop: "#008080",
  titleActive: "linear-gradient(90deg, #000080, #1084d0)",
  titleInactive: "linear-gradient(90deg, #808080, #b5b5b5)",
  titleText: "#ffffff",
  font: '11px "MS Sans Serif", Tahoma, "Noto Sans SC", system-ui, sans-serif',
});

/** 外凸 bevel（窗体、按钮常态）。 */
export const osBevelOutV1: CSSProperties = Object.freeze({
  borderStyle: "solid",
  borderWidth: "2px",
  borderColor: "#ffffff #404040 #404040 #ffffff",
  background: os98.face,
});

/** 内凹 bevel（输入框、显示井、按下的按钮）。 */
export const osBevelInV1: CSSProperties = Object.freeze({
  borderStyle: "solid",
  borderWidth: "2px",
  borderColor: "#808080 #ffffff #ffffff #808080",
  background: "#ffffff",
});

/** LCD 井（扫雷计数器）。 */
export const osLcdV1: CSSProperties = Object.freeze({
  borderStyle: "solid",
  borderWidth: "1px",
  borderColor: "#808080 #ffffff #ffffff #808080",
  background: "#000000",
  color: "#ff2222",
  fontFamily: '"Courier New", monospace',
  fontWeight: 700,
});

/**
 * 桌面全局 chrome：按钮按下的 bevel 翻转与 1px 内容位移、输入框的
 * 方角内凹白底与系统插入符——经典交互反馈是 :active/:focus 伪类，
 * inline style 做不到，统一由 shell 注入这份样式表，组件挂 class。
 * 同时压过引擎 global.css 的主题化表单外观（圆角/主题 focus 环）。
 */
export const osChromeCssV1 = `
[data-os-shell] .os-button,
[data-os-boot] .os-button,
[data-os-shutdown] .os-button {
  border-style: solid;
  border-width: 2px;
  border-color: #ffffff #404040 #404040 #ffffff;
  border-radius: 0;
  background: ${os98.face};
  color: #000000;
  font: ${os98.font};
  cursor: default;
}
[data-os-shell] .os-button:hover,
[data-os-boot] .os-button:hover,
[data-os-shutdown] .os-button:hover {
  background: ${os98.face};
  color: #000000;
}
[data-os-shell] .os-button:active:not(:disabled),
[data-os-shell] .os-button[aria-pressed="true"],
[data-os-shell] .os-button[aria-expanded="true"],
[data-os-boot] .os-button:active:not(:disabled),
[data-os-shutdown] .os-button:active:not(:disabled) {
  border-color: #404040 #ffffff #ffffff #404040;
  background: #b8b8b8;
}
[data-os-shell] .os-button:active:not(:disabled) > * ,
[data-os-shell] .os-button:active:not(:disabled) {
  /* 经典按下手感：内容向右下偏移 1px。 */
  text-indent: 1px;
}
[data-os-shell] .os-button:active:not(:disabled) {
  padding-block-start: 1px;
}
[data-os-shell] .os-button:focus-visible,
[data-os-shell] .os-input:focus-visible {
  outline: 1px dotted #000000;
  outline-offset: -4px;
}
[data-os-shell] .os-input {
  border-style: solid;
  border-width: 2px;
  border-color: #808080 #ffffff #ffffff #808080;
  border-radius: 0;
  background: #ffffff;
  color: #000000;
  font: ${os98.font};
  caret-color: #000000;
  box-shadow: none;
}
[data-os-shell] .os-input:focus {
  outline: none;
  border-color: #808080 #ffffff #ffffff #808080;
  box-shadow: none;
}
[data-os-shell] textarea.os-input {
  font: 13px "Courier New", monospace;
}
[data-os-shell] input[type="range"] {
  accent-color: #000080;
}
[data-os-shell] input[type="checkbox"],
[data-os-shell] input[type="radio"] {
  accent-color: #000080;
}
[data-os-shell] select.os-select {
  border-style: solid;
  border-width: 2px;
  border-color: #808080 #ffffff #ffffff #808080;
  border-radius: 0;
  background: #ffffff;
  color: #000000;
  font: ${os98.font};
  padding: 2px 4px;
}
`;
