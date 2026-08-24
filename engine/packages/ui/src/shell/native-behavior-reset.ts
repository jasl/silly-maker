// SPDX-License-Identifier: MIT

/**
 * Game-shell native-behavior reset ("reset CSS" for browser input defaults):
 * suppresses the context menu, text selection/drag, and the browser's
 * hover-cursor changes across the page so a Player feels like a game shell
 * instead of a document. Only editable controls keep native behavior
 * automatically (their menu is copy/paste); everything else — including
 * buttons and other interactive controls — is application-owned: right-click
 * routes through `data-secondary-action` / the stage pointer map, and any
 * subtree opts back in through the escape-hatch attributes below.
 *
 * Document-scoped on purpose: Players are full-page applications and Story
 * overlays commonly portal to `document.body`, so a mount-root-scoped reset
 * would miss them.
 */

/** Elements matching this always keep native menus and selection. */
export const nativeBehaviorEditableSelectorV1 =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * Non-editable interactive controls are never text-selection surfaces, even
 * inside a `data-native-text` or editable subtree: their label is a control
 * face, not copyable content. Editable elements (and widgets that may sit
 * directly on an editable element, like `role="combobox"`) stay out.
 */
const nativeBehaviorControlSelectorV1 = 'button, summary, a, option, [role="button"]';

/** Opt-out attribute: keep the browser context menu for this subtree. */
export const nativeBehaviorAllowMenuAttributeV1 = "data-native-menu";

/** Opt-out attribute: keep text selection for this subtree. */
export const nativeBehaviorAllowTextAttributeV1 = "data-native-text";

const resetMarkerAttributeV1 = "data-silly-native-reset";
const selectionMarkerReferencesV1 = new WeakMap<
  HTMLElement,
  { count: number; readonly hadMarker: boolean }
>();

const selectionResetCssV1 = `
[${resetMarkerAttributeV1}],
[${resetMarkerAttributeV1}] * {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
[${resetMarkerAttributeV1}] {
  cursor: default;
}
[${resetMarkerAttributeV1}] :is(${nativeBehaviorEditableSelectorV1}),
[${resetMarkerAttributeV1}] :is(${nativeBehaviorEditableSelectorV1}) *,
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}],
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}] * {
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: auto;
}
[${resetMarkerAttributeV1}] :is(${nativeBehaviorEditableSelectorV1}),
[${resetMarkerAttributeV1}] :is(${nativeBehaviorEditableSelectorV1}) *,
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowMenuAttributeV1}],
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowMenuAttributeV1}] *,
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}],
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}] * {
  -webkit-touch-callout: default;
}
[${resetMarkerAttributeV1}] a[href] {
  cursor: pointer;
}
[${resetMarkerAttributeV1}] img {
  -webkit-user-drag: none;
}
[${resetMarkerAttributeV1}] :is(${nativeBehaviorControlSelectorV1}),
[${resetMarkerAttributeV1}] :is(${nativeBehaviorControlSelectorV1}) * {
  -webkit-user-select: none !important;
  user-select: none !important;
}
`;

export interface NativeBehaviorResetConfigV1 {
  /** Suppress the browser context menu (default true). */
  readonly suppressContextMenu?: boolean;
  /**
   * Suppress text selection, image drag, and the browser's hover-cursor
   * changes (default true). Editable controls and `data-native-text`
   * subtrees keep native selection and the text cursor; links keep the
   * pointer cursor. Interactive control labels (buttons, links, summaries)
   * stay unselectable even inside those subtrees.
   */
  readonly suppressTextSelection?: boolean;
}

export interface NativeBehaviorResetHandleV1 {
  dispose(): void;
}

function allowsNativeMenuV1(target: EventTarget | null): boolean {
  const candidate = target as { closest?: (selectors: string) => Element | null } | null;
  if (typeof candidate?.closest !== "function") return false;
  // Editable controls keep the native menu (it is the copy/paste surface).
  // Every other control is application-owned: right-click routes through
  // `data-secondary-action` / the stage pointer map, and only an explicit
  // `data-native-menu` subtree opts back into the browser menu.
  if (candidate.closest(nativeBehaviorEditableSelectorV1) !== null) return true;
  return candidate.closest(`[${nativeBehaviorAllowMenuAttributeV1}]`) !== null;
}

/**
 * Installs the reset on the given document (default: the page document).
 * Returns a handle whose `dispose` removes every installed piece.
 */
export function installNativeBehaviorResetV1(
  config: NativeBehaviorResetConfigV1 = {},
  documentRef: Document = document,
): NativeBehaviorResetHandleV1 {
  const suppressContextMenu = config.suppressContextMenu ?? true;
  const suppressTextSelection = config.suppressTextSelection ?? true;

  let removeContextMenu: (() => void) | null = null;
  if (suppressContextMenu) {
    const onContextMenu = (event: MouseEvent): void => {
      // The reset is the floor, not the owner: an earlier claimant (for
      // example the pointer-button adapter routing right-click to a semantic
      // action) already handled this event — do not double-handle it.
      if (event.defaultPrevented) return;
      if (allowsNativeMenuV1(event.target)) return;
      event.preventDefault();
    };
    // InputRouter claims contextmenu at the document target. The Window
    // bubble listener is a presentation floor that therefore runs after the
    // router regardless of installation order.
    const eventTarget: EventTarget = documentRef.defaultView ?? documentRef;
    const listener: EventListener = (event) => onContextMenu(event as MouseEvent);
    eventTarget.addEventListener("contextmenu", listener);
    removeContextMenu = () => eventTarget.removeEventListener("contextmenu", listener);
  }

  let removeSelectionReset: (() => void) | null = null;
  if (suppressTextSelection) {
    const style = documentRef.createElement("style");
    style.dataset["sillyNativeResetStyle"] = "true";
    style.textContent = selectionResetCssV1;
    documentRef.head.append(style);
    const marked = documentRef.body;
    const existingReference = selectionMarkerReferencesV1.get(marked);
    const markerReference = existingReference ?? {
      count: 0,
      hadMarker: marked.hasAttribute(resetMarkerAttributeV1),
    };
    markerReference.count += 1;
    selectionMarkerReferencesV1.set(marked, markerReference);
    marked.setAttribute(resetMarkerAttributeV1, "true");
    removeSelectionReset = () => {
      style.remove();
      markerReference.count -= 1;
      if (markerReference.count !== 0) return;
      selectionMarkerReferencesV1.delete(marked);
      if (!markerReference.hadMarker) marked.removeAttribute(resetMarkerAttributeV1);
    };
  }

  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      removeContextMenu?.();
      removeSelectionReset?.();
    },
  };
}
