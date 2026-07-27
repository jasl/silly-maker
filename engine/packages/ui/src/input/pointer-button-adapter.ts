// SPDX-License-Identifier: MIT
import type { InputActionIdV1, InputRouterV1 } from "./contracts.ts";

/**
 * The pointer-button adapter: maps secondary-button (right-click /
 * two-finger tap) and wheel gestures to semantic input actions, routed
 * through the Input Router exactly like keyboard shortcuts. The VN-standard
 * "right-click = back/menu" lives here. Raw pointer events never enter the
 * CommandLog — only whatever semantic command a handler dispatches does.
 *
 * When `secondary` is mapped the adapter suppresses the native context menu
 * outside interactive elements (the Story has claimed the button); wheel
 * mappings stay quiet inside scrollable regions so overlays keep scrolling.
 */

export interface PointerActionMapV1 {
  /** Secondary button, delivered via `contextmenu`. */
  readonly secondary?: InputActionIdV1;
  readonly wheelUp?: InputActionIdV1;
  readonly wheelDown?: InputActionIdV1;
}

export interface InstallPointerButtonAdapterOptionsV1 {
  readonly router: Pick<InputRouterV1, "route">;
  readonly map: PointerActionMapV1;
  /** Defaults to `document`; injectable for tests. */
  readonly target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  /** Minimum milliseconds between routed wheel actions. */
  readonly wheelIntervalMs?: number;
  /** Injectable clock for tests. */
  now?(): number;
}

const interactiveTagsV1 = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "OPTION"]);

function isInteractiveTargetV1(target: unknown): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  if (interactiveTagsV1.has(target.tagName)) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  const role = target.getAttribute("role");
  return role === "button" || role === "textbox" || role === "combobox";
}

function insideScrollableV1(target: unknown): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  let element: Element | null = target;
  while (element !== null && element !== document.body) {
    if (element.scrollHeight > element.clientHeight + 1) {
      const overflowY = getComputedStyle(element).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function installPointerButtonAdapterV1(
  options: InstallPointerButtonAdapterOptionsV1,
): () => void {
  const target = options.target ?? (typeof document === "undefined" ? null : document);
  if (target === null) return () => {};
  const now = options.now ?? (() => performance.now());
  const wheelIntervalMs = options.wheelIntervalMs ?? 150;
  let lastWheelAt = Number.NEGATIVE_INFINITY;

  const onContextMenu = (event: Event): void => {
    const actionId = options.map.secondary;
    if (actionId === undefined || event.defaultPrevented) return;
    if (isInteractiveTargetV1(event.target)) return;
    // The Story claimed the secondary button: the native menu stays
    // suppressed on stage surfaces whether or not a context handles it.
    event.preventDefault();
    options.router.route({ kind: "action", actionId });
  };

  const onWheel = (event: Event): void => {
    const wheelEvent = event as WheelEvent;
    if (wheelEvent.defaultPrevented) return;
    const actionId = wheelEvent.deltaY < 0 ? options.map.wheelUp : options.map.wheelDown;
    if (actionId === undefined || wheelEvent.deltaY === 0) return;
    if (isInteractiveTargetV1(wheelEvent.target) || insideScrollableV1(wheelEvent.target)) return;
    const at = now();
    if (at - lastWheelAt < wheelIntervalMs) return;
    lastWheelAt = at;
    const result = options.router.route({ kind: "action", actionId });
    if (result.kind === "handled") wheelEvent.preventDefault();
  };

  target.addEventListener("contextmenu", onContextMenu);
  target.addEventListener("wheel", onWheel, { passive: false } as AddEventListenerOptions);
  return () => {
    target.removeEventListener("contextmenu", onContextMenu);
    target.removeEventListener("wheel", onWheel);
  };
}
