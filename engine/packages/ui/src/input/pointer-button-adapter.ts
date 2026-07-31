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

/** Package-internal selector shared with the native browser-behavior floor. */
export const pointerInteractiveSelectorV1 =
  'input, textarea, select, button, a, option, [contenteditable]:not([contenteditable="false"]), ' +
  '[role="button"], [role="textbox"], [role="combobox"]';

function closestAncestorV1(target: unknown, selector: string): Element | null {
  const candidate = target as { closest?: (selectors: string) => Element | null } | null;
  if (typeof candidate?.closest !== "function") return null;
  return candidate.closest(selector);
}

/**
 * Controls own their pointer buttons: the default secondary-button behavior
 * on any interactive element (including its icon/text descendants) is
 * "none" — the mapped stage action only fires on scene surfaces. A control
 * can opt into a specific action with `data-secondary-action="<actionId>"`.
 */
export function pointerInteractiveAncestorV1(target: unknown): Element | null {
  return closestAncestorV1(target, pointerInteractiveSelectorV1);
}

function isInteractiveTargetV1(target: unknown): boolean {
  return pointerInteractiveAncestorV1(target) !== null;
}

function insideScrollableV1(target: unknown): boolean {
  const candidate = target as {
    readonly scrollHeight?: number;
    readonly clientHeight?: number;
    readonly parentElement?: Element | null;
  } | null;
  let element: Element | null =
    typeof candidate?.scrollHeight === "number" && typeof candidate.clientHeight === "number"
      ? (candidate as Element)
      : (candidate?.parentElement ?? null);
  const ownerDocument = element?.ownerDocument;
  const view = ownerDocument?.defaultView;
  if (ownerDocument === undefined || view === null || view === undefined) return false;
  while (element !== null && element !== ownerDocument.body) {
    if (element.scrollHeight > element.clientHeight + 1) {
      const overflowY = view.getComputedStyle(element).overflowY;
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
    if (event.defaultPrevented) return;
    // `data-native-menu` is an absolute browser-behavior opt-out. It wins
    // over both the stage mapping and a nested control's secondary action.
    if (closestAncestorV1(event.target, "[data-native-menu]") !== null) return;
    const control = pointerInteractiveAncestorV1(event.target);
    if (control !== null) {
      // Controls default to no secondary behavior; an explicit
      // data-secondary-action opts one in.
      const controlAction = control.getAttribute("data-secondary-action");
      if (controlAction !== null && controlAction !== "") {
        event.preventDefault();
        options.router.route({ kind: "action", actionId: controlAction as InputActionIdV1 });
      }
      return;
    }
    const actionId = options.map.secondary;
    if (actionId === undefined) return;
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
