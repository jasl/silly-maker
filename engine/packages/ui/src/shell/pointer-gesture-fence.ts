// SPDX-License-Identifier: MIT

/**
 * Host-local pointer gesture fence: after a dismiss `pointerup` that may
 * sync-unmount a surface, swallow the browser's leftover primary `click`
 * (and keep lower stage layers isolated) until the gesture is settled.
 *
 * Not Story/snapshot state. Scoped to a persistent stage root EventTarget.
 * This controller is package-internal; Story code uses
 * `useStagePointerGestureFenceV1` instead of owning fence handles.
 */

export const STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1 = 500;

export interface StagePointerGestureFenceHandleV1 {
  readonly release: () => void;
  readonly active: () => boolean;
}

export interface ArmStagePointerGestureFenceOptionsV1 {
  readonly root: EventTarget;
  /** Fired while the fence is armed (e.g. stage input isolation register). */
  readonly onArm?: () => () => void;
  readonly timeoutMs?: number;
  /**
   * Originating primary pointerup. preventDefault/stopPropagation run here so
   * the dismiss path owns the remainder of the gesture.
   */
  readonly pointerUpEvent: PointerEvent;
}

/**
 * Arm one fence on `root`. The owner must release an existing handle before
 * arming another fence for the same stage root (GameStage does this).
 * Release on: swallowed primary click, next pointerdown, timeout, or explicit release.
 */
export function armStagePointerGestureFenceV1(
  options: ArmStagePointerGestureFenceOptionsV1,
): StagePointerGestureFenceHandleV1 {
  const timeoutMs = options.timeoutMs ?? STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1;
  const root = options.root;
  const pointerUp = options.pointerUpEvent;

  if (pointerUp.button !== 0) {
    return Object.freeze({
      release: () => {},
      active: () => false,
    });
  }

  pointerUp.preventDefault();
  pointerUp.stopPropagation();

  let active = true;
  const disarmIsolation = options.onArm?.() ?? (() => {});

  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    if ("stopImmediatePropagation" in event) {
      (event as Event & { stopImmediatePropagation(): void }).stopImmediatePropagation();
    }
  };

  const release = (): void => {
    if (!active) return;
    active = false;
    window.clearTimeout(timer);
    root.removeEventListener("click", onClick, true);
    root.removeEventListener("pointerdown", onPointerDown, true);
    disarmIsolation();
  };

  const onClick = (event: Event): void => {
    if (!active) return;
    const mouse = event as MouseEvent;
    if (typeof mouse.button === "number" && mouse.button !== 0) return;
    // Keyboard/programmatic activation emits click.detail === 0 and must not
    // be consumed by a pointer-gesture fence.
    if (typeof mouse.detail === "number" && mouse.detail === 0) return;
    swallow(event);
    release();
  };

  const onPointerDown = (_event: Event): void => {
    // Next intentional gesture — drop the fence without consuming the down.
    release();
  };

  root.addEventListener("click", onClick, true);
  root.addEventListener("pointerdown", onPointerDown, true);
  const timer = window.setTimeout(release, timeoutMs);

  return Object.freeze({
    release,
    active: () => active,
  });
}
