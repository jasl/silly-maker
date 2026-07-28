// SPDX-License-Identifier: MIT
// 共享 UI 基座：主题令牌、locale 文本、发布/端口类型与派发助手。
// 特性切片只依赖这里与引擎，不回头 import 组合层。
import type { AssetId } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { StageRenderTarget } from "@sillymaker/base/story";
import type { AssetRegistryV1, RuntimePresentationPublicationV1 } from "@sillymaker/ui";
import { useLocaleTextV1 } from "@sillymaker/ui";

import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import { catcafeTextCatalogsV1, catcafeTextForLocaleV1 } from "../presentation.ts";

/** Locale 感知的 UI 文本：订阅 Host 偏好，语言切换即时生效。 */
export function useCatcafeTextV1(playerProfile: PlayerProfileStoreV1): (textId: string) => string {
  return useLocaleTextV1(playerProfile, catcafeTextForLocaleV1);
}

/** 无 profile 场景（标题屏静态文案）：默认 locale 直查。 */
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

export type CatcafeAssetRegistryV1 = AssetRegistryV1<string, never, string>;
export type CatcafeSemanticPublicationV1 = ReturnType<
  CatcafeApplicationInstanceV1["semantic"]["observe"]
>;
export type CatcafeSemanticPortV1 = CatcafeApplicationInstanceV1["semantic"];

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

/** 语义派发助手：切片发意图统一走这里（会话队列前沿栅栏化陈旧输入）。 */
export function dispatchV1(semantic: CatcafeSemanticPortV1, invocation: unknown): void {
  void semantic.dispatch(invocation as never);
}
