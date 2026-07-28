// SPDX-License-Identifier: MIT
// Shared UI base: theme tokens, locale text, publication/port types, and the dispatch helper.
// Feature slices depend only on this file and the engine; they never import the composition layer back.
import type { AssetId } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { StageRenderTarget } from "@sillymaker/base/story";
import type { AssetRegistryV1, RuntimePresentationPublicationV1 } from "@sillymaker/ui";
import { useLocaleTextV1 } from "@sillymaker/ui";

import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import { catcafeTextCatalogsV1, catcafeTextForLocaleV1 } from "../presentation.ts";

/** Locale-aware UI text: subscribes to Host preferences; language switches take effect immediately. */
export function useCatcafeTextV1(playerProfile: PlayerProfileStoreV1): (textId: string) => string {
  return useLocaleTextV1(playerProfile, catcafeTextForLocaleV1);
}

/** For profile-less contexts (static title-screen copy): direct default-locale lookup. */
export function catcafeUiTextV1(textId: string): string {
  const catalog = catcafeTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
  );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry === undefined) throw new TypeError(`catcafe.ui_text_missing:${textId}`);
  return entry.text;
}

/** Theme tokens: warm wood panels + amber highlights, matching the art style. */
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

/** Semantic dispatch helper: every slice intent goes through here (the session queue front fences stale input). */
export function dispatchV1(semantic: CatcafeSemanticPortV1, invocation: unknown): void {
  void semantic.dispatch(invocation as never);
}
