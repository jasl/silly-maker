// SPDX-License-Identifier: MIT

/**
 * Game-shell native-behavior reset ("reset CSS" for browser input defaults):
 * suppresses the context menu and text selection/drag across the page so a
 * Player feels like a game shell instead of a document, while editable
 * controls keep native behavior automatically and any element can opt back
 * in through the escape-hatch attributes below.
 *
 * Document-scoped on purpose: Players are full-page applications and Story
 * overlays commonly portal to `document.body`, so a mount-root-scoped reset
 * would miss them.
 */

/** Elements matching this always keep native menus and selection. */
export const nativeBehaviorEditableSelectorV1 =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Opt-out attribute: keep the browser context menu for this subtree. */
export const nativeBehaviorAllowMenuAttributeV1 = "data-native-menu";

/** Opt-out attribute: keep text selection for this subtree. */
export const nativeBehaviorAllowTextAttributeV1 = "data-native-text";

const resetMarkerAttributeV1 = "data-silly-native-reset";

const selectionResetCssV1 = `
[${resetMarkerAttributeV1}],
[${resetMarkerAttributeV1}] * {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
[${resetMarkerAttributeV1}] :is(${nativeBehaviorEditableSelectorV1}),
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}],
[${resetMarkerAttributeV1}] [${nativeBehaviorAllowTextAttributeV1}] * {
  -webkit-user-select: text;
  user-select: text;
}
[${resetMarkerAttributeV1}] img {
  -webkit-user-drag: none;
}
`;

export interface NativeBehaviorResetConfigV1 {
  /** Suppress the browser context menu (default true). */
  readonly suppressContextMenu?: boolean;
  /** Suppress text selection and image drag (default true). */
  readonly suppressTextSelection?: boolean;
  /**
   * Called after a context menu event was suppressed — the application's own
   * right-click behavior (for example "dismiss the top surface"). Never fires
   * for editable or opted-out targets.
   */
  onContextMenu?(event: MouseEvent): void;
}

export interface NativeBehaviorResetHandleV1 {
  dispose(): void;
}

function allowsNativeMenuV1(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(
      `${nativeBehaviorEditableSelectorV1}, [${nativeBehaviorAllowMenuAttributeV1}]`,
    ) !== null
  );
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
      config.onContextMenu?.(event);
    };
    documentRef.addEventListener("contextmenu", onContextMenu);
    removeContextMenu = () => documentRef.removeEventListener("contextmenu", onContextMenu);
  }

  let removeSelectionReset: (() => void) | null = null;
  if (suppressTextSelection) {
    const style = documentRef.createElement("style");
    style.dataset["sillyNativeResetStyle"] = "true";
    style.textContent = selectionResetCssV1;
    documentRef.head.append(style);
    const marked = documentRef.body;
    const hadMarker = marked.hasAttribute(resetMarkerAttributeV1);
    marked.setAttribute(resetMarkerAttributeV1, "true");
    removeSelectionReset = () => {
      style.remove();
      if (!hadMarker) marked.removeAttribute(resetMarkerAttributeV1);
    };
  }

  let disposed = false;
  return Object.freeze({
    dispose() {
      if (disposed) return;
      disposed = true;
      removeContextMenu?.();
      removeSelectionReset?.();
    },
  });
}
