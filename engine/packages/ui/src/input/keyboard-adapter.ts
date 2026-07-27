// SPDX-License-Identifier: MIT
import type { InputActionIdV1, InputRouterV1 } from "./contracts.js";

/**
 * The keyboard adapter: a configurable map from `KeyboardEvent.code` to
 * semantic input actions, routed through the Input Router's context
 * priority. Physical key events never enter the CommandLog — only whatever
 * gameplay semantic command a handler ultimately dispatches does.
 *
 * Keys are ignored while focus sits on an editable or interactive element,
 * so typing in a form or activating a focused button never doubles as a
 * stage shortcut; accessible DOM controls keep their native behavior.
 */

export type KeyboardActionMapV1 = Readonly<Record<string, InputActionIdV1>>;

export interface InstallKeyboardAdapterOptionsV1 {
  readonly router: Pick<InputRouterV1, "route">;
  readonly map: KeyboardActionMapV1;
  /** Defaults to `document`; injectable for tests. */
  readonly target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

const editableTagsV1 = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "OPTION"]);

function isInteractiveTargetV1(target: unknown): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  if (editableTagsV1.has(target.tagName)) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  const role = target.getAttribute("role");
  return role === "button" || role === "textbox" || role === "combobox";
}

export function installKeyboardAdapterV1(options: InstallKeyboardAdapterOptionsV1): () => void {
  const target = options.target ?? (typeof document === "undefined" ? null : document);
  if (target === null) return () => {};

  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.defaultPrevented || keyboardEvent.repeat) return;
    if (keyboardEvent.metaKey || keyboardEvent.ctrlKey || keyboardEvent.altKey) return;
    const actionId = options.map[keyboardEvent.code];
    if (actionId === undefined) return;
    if (isInteractiveTargetV1(keyboardEvent.target)) return;
    const result = options.router.route({ kind: "action", actionId });
    if (result.kind === "handled") keyboardEvent.preventDefault();
  };

  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}
