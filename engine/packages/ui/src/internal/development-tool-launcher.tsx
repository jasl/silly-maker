// SPDX-License-Identifier: MIT
import { useState } from "react";
import type { ReactElement, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";

import type { DevDockPositionV1 } from "../debug/dev-dock.tsx";
import { useClampedElementDragV1 } from "../primitives/use-clamped-element-drag.ts";
import { useAuxiliarySurfacePortalTargetV1 } from "../shell/auxiliary-surface-portal.tsx";

import styles from "./development-tool-launcher.module.css";

export interface DevelopmentToolLauncherActionInternalV1 {
  readonly label: string;
  onActivate(): void | Promise<void>;
}

export interface DevelopmentToolLauncherDebugActionInternalV1
  extends DevelopmentToolLauncherActionInternalV1 {
  readonly expanded: boolean;
  readonly buttonRef?: Ref<HTMLButtonElement>;
}

export interface DevelopmentToolLauncherPropsInternalV1 {
  readonly portalTarget?: Element;
  readonly position?: DevDockPositionV1;
  readonly movable?: boolean;
  readonly authoringAction?: DevelopmentToolLauncherActionInternalV1;
  readonly debugAction?: DevelopmentToolLauncherDebugActionInternalV1;
  readonly children?: ReactNode;
  readonly overlay?: ReactNode;
  onPositionChange?(position: DevDockPositionV1): void;
}

/**
 * Small resident development launcher. Heavy authoring and debug surfaces
 * stay behind the actions supplied by their owners.
 *
 * @internal
 */
export function DevelopmentToolLauncherInternalV1(
  props: DevelopmentToolLauncherPropsInternalV1,
): ReactElement | null {
  const drag = useClampedElementDragV1<HTMLDivElement>();
  const [dragging, setDragging] = useState(false);
  const basePosition = props.position ?? "top_right";
  const movable = props.movable === true;
  const [movablePosition, setMovablePosition] = useState<DevDockPositionV1>(basePosition);
  const coordinatorSelection = useAuxiliarySurfacePortalTargetV1();
  const portalTarget = props.portalTarget ?? coordinatorSelection.target;

  const activateAuthoring = (): void => {
    void Promise.resolve()
      .then(() => props.authoringAction?.onActivate())
      // The activation owner reports the failure; the launcher only contains
      // the rejected event promise.
      .catch(() => undefined);
  };

  if (portalTarget === null) return null;

  return createPortal(
    <>
      <div
        ref={movable ? drag.containerRef : undefined}
        className={styles["development-tool-launcher"]}
        data-development-tool-launcher="true"
        data-development-tool-panel="true"
        data-debug-dock={props.debugAction === undefined ? undefined : "true"}
        data-story-debug-dock={props.debugAction === undefined ? undefined : "true"}
        data-devdock-position={movable ? movablePosition : basePosition}
        data-devdock-chip-movable={movable ? "true" : undefined}
        data-devdock-escape-owner="true"
        style={movable && dragging && drag.position !== null
          ? {
            insetInlineStart: `${String(drag.position.x)}px`,
            insetBlockStart: `${String(drag.position.y)}px`,
            insetInlineEnd: "auto",
            insetBlockEnd: "auto",
          }
          : undefined}
      >
        <div
          className={styles["development-tool-launcher__bar"]}
          data-devdock-chip="true"
          role="group"
          aria-label="开发工具"
        >
          {props.authoringAction === undefined ? null : (
            <button
              type="button"
              className={`${styles["development-tool-launcher__action"]} silly-dev-launcher`}
              data-embedded-authoring-activate="true"
              onClick={activateAuthoring}
            >
              {props.authoringAction.label}
            </button>
          )}
          {props.debugAction === undefined ? null : (
            <button
              ref={props.debugAction.buttonRef}
              type="button"
              className={`${styles["development-tool-launcher__action"]} silly-dev-launcher`}
              data-debug-dock-toggle="true"
              aria-expanded={props.debugAction.expanded}
              onClick={props.debugAction.onActivate}
            >
              {props.debugAction.label}
            </button>
          )}
          {movable
            ? (
              <span
                className={styles["development-tool-launcher__drag"]}
                data-debug-dock-chip-drag="true"
                aria-hidden="true"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  drag.headerProps.onPointerDown(event);
                  if (event.button === 0) setDragging(true);
                }}
                onPointerMove={drag.headerProps.onPointerMove}
                onPointerUp={(event) => {
                  drag.headerProps.onPointerUp(event);
                  const host = drag.containerRef.current?.parentElement;
                  if (host !== null && host !== undefined) {
                    const bounds = host.getBoundingClientRect();
                    const horizontal = event.clientX < bounds.left + bounds.width / 2
                      ? "left"
                      : "right";
                    const vertical = event.clientY < bounds.top + bounds.height / 2
                      ? "top"
                      : "bottom";
                    const nextPosition = `${vertical}_${horizontal}` as DevDockPositionV1;
                    setMovablePosition(nextPosition);
                    props.onPositionChange?.(nextPosition);
                  }
                  setDragging(false);
                }}
                onPointerCancel={(event) => {
                  drag.headerProps.onPointerCancel(event);
                  setDragging(false);
                }}
              >
                ⠿
              </span>
            )
            : null}
        </div>
        {props.children}
      </div>
      {props.overlay}
    </>,
    portalTarget,
  );
}
