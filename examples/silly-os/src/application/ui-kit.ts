// SPDX-License-Identifier: MIT
// Shared UI base: 98-style theme tokens (two-tone bevels), the locale text hook,
// publication/port types, and the dispatch helper. Feature slices depend only on this file and the engine.
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

/** Semantic dispatch helper: all desktop interaction goes through here (the session queue front fences stale input). */
export function dispatchV1(semantic: OsSemanticPortV1, invocation: unknown): void {
  void semantic.dispatch(invocation as never);
}

/**
 * Locale-aware UI text: an explicit preference (settings page, stored in the Host
 * profile) wins; otherwise follow the browser-reported languages (Chinese→Chinese, everything else→English).
 */
export function useOsTextV1(playerProfile: PlayerProfileStoreV1): (textId: string) => string {
  const [, setVersion] = useState(0);
  useEffect(
    () => playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [playerProfile],
  );
  const preference = playerProfile.current().preferences.locale;
  const requested = typeof navigator === "undefined"
    ? []
    : (navigator.languages ?? [navigator.language]);
  const locale = osResolveLocaleV1(preference, requested);
  return (textId: string) => osTextForLocaleV1(locale, textId);
}

// ---------------------------------------------------------------------------
// The 98 visual language: two-tone bevels. All windows/buttons/inputs share these constant sets.
// ---------------------------------------------------------------------------

export const os98 = Object.freeze({
  face: "#c0c0c0",
  faceText: "#000000",
  desktop: "#008080",
  titleActive: "linear-gradient(90deg, #000080, #1084d0)",
  titleInactive: "linear-gradient(90deg, #808080, #b5b5b5)",
  titleText: "#ffffff",
  font:
    '11px "MS Sans Serif", Tahoma, "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Hiragino Sans", "Yu Gothic UI", Meiryo, ui-sans-serif, system-ui, sans-serif',
});

/** Raised bevel (windows, buttons at rest). */
export const osBevelOutV1: CSSProperties = Object.freeze({
  borderStyle: "solid",
  borderWidth: "2px",
  borderColor: "#ffffff #404040 #404040 #ffffff",
  background: os98.face,
});

/** Sunken bevel (inputs, display wells, pressed buttons). */
export const osBevelInV1: CSSProperties = Object.freeze({
  borderStyle: "solid",
  borderWidth: "2px",
  borderColor: "#808080 #ffffff #ffffff #808080",
  background: "#ffffff",
});

/** LCD well (minesweeper counters). */
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
 * Global desktop chrome: the pressed-button bevel flip with the 1px content shift,
 * the square sunken white input with the system caret — classic interaction feedback
 * is :active/:focus pseudo-classes, which inline styles cannot express, so the shell
 * injects this stylesheet once and components attach classes. It also overrides the engine global.css themed form look (rounded corners/theme focus ring).
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
  /* Classic pressed feel: content shifts 1px toward bottom-right. */
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
