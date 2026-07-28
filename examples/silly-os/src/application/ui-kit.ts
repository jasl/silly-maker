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
