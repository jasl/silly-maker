// SPDX-License-Identifier: MIT
import type { InputActionIdV1, InputRouterV1 } from "./contracts.ts";
import { pointerInteractiveSelectorV1 } from "./pointer-button-adapter.ts";

/**
 * The keyboard adapter: a configurable map from `KeyboardEvent.code` to
 * semantic input actions, routed through the Input Router's context
 * priority. Physical key events never enter the CommandLog — only whatever
 * gameplay semantic command a handler ultimately dispatches does.
 *
 * Keys are ignored while focus sits on an editable or interactive element,
 * while IME composition is active, and while focus is inside debug/system
 * chrome, so typing in a form never doubles as a stage shortcut.
 * Ordinary mappings route in the bubble phase. An explicitly mapped,
 * unmodified `Tab` routes during capture and stops propagation only when
 * handled, so a focus owner cannot also interpret that same press. Shift+Tab
 * and native/ignored Tab remain free for focus traversal.
 */

export type KeyboardActionMapV1 = Readonly<Record<string, InputActionIdV1>>;

export interface InstallKeyboardAdapterOptionsV1 {
  readonly router: Pick<InputRouterV1, "route">;
  readonly map: KeyboardActionMapV1;
  /** Defaults to `document`; injectable for tests. */
  readonly target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

const nativeTypingScopeSelectorV1 =
  `${pointerInteractiveSelectorV1}, [data-native-text], [data-devdock-window], ` +
  "[data-debug-dock], [data-blocking-focus-scope]";

/** @internal Shared by the keyboard and held-key adapters. */
export function closestFromEventTargetV1(target: unknown, selector: string): Element | null {
  const candidate = target as {
    closest?: (selectors: string) => Element | null;
    parentElement?: { closest?: (selectors: string) => Element | null } | null;
  } | null;
  if (typeof candidate?.closest === "function") return candidate.closest(selector);
  const parent = candidate?.parentElement;
  if (typeof parent?.closest === "function") return parent.closest(selector);
  return null;
}

function shouldIgnoreKeyboardShortcutV1(event: KeyboardEvent): boolean {
  if (event.isComposing || event.key === "Process") return true;
  return closestFromEventTargetV1(event.target, nativeTypingScopeSelectorV1) !== null;
}

export function installKeyboardAdapterV1(options: InstallKeyboardAdapterOptionsV1): () => void {
  const target = options.target ?? (typeof document === "undefined" ? null : document);
  if (target === null) return () => {};

  const routeMappedKey = (
    keyboardEvent: KeyboardEvent,
    stopPropagationWhenHandled: boolean,
  ): void => {
    if (keyboardEvent.defaultPrevented || keyboardEvent.repeat) return;
    if (keyboardEvent.metaKey || keyboardEvent.ctrlKey || keyboardEvent.altKey) return;
    const actionId = options.map[keyboardEvent.code];
    if (actionId === undefined) return;
    if (shouldIgnoreKeyboardShortcutV1(keyboardEvent)) return;
    const result = options.router.route({ kind: "action", actionId });
    if (result.kind !== "handled") return;
    keyboardEvent.preventDefault();
    if (stopPropagationWhenHandled) keyboardEvent.stopPropagation();
  };
  const capturesTab = options.map.Tab !== undefined;
  const onMappedTabKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code !== "Tab" || keyboardEvent.shiftKey) return;
    routeMappedKey(keyboardEvent, true);
  };
  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (capturesTab && keyboardEvent.code === "Tab") return;
    routeMappedKey(keyboardEvent, false);
  };

  if (capturesTab) target.addEventListener("keydown", onMappedTabKeyDown, true);
  target.addEventListener("keydown", onKeyDown);
  return () => {
    if (capturesTab) target.removeEventListener("keydown", onMappedTabKeyDown, true);
    target.removeEventListener("keydown", onKeyDown);
  };
}
