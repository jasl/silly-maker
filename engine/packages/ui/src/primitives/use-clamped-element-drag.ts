// SPDX-License-Identifier: MIT
import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

export interface ClampedElementDragPositionV1 {
  readonly x: number;
  readonly y: number;
}

export interface ClampElementDragPositionInputV1 {
  readonly clientX: number;
  readonly clientY: number;
  readonly grabX: number;
  readonly grabY: number;
  readonly host: Pick<DOMRect, "left" | "top" | "width" | "height">;
  readonly element: Pick<DOMRect, "width" | "height">;
}

/**
 * CSS-pixel drag clamp against a host box. This is the letterboxed-canvas
 * recipe (DevDock floating windows). Logical-coordinate / scaled-viewport
 * MDI (SillyOS) keeps its own conversion.
 */
export function clampElementDragPositionV1(
  input: ClampElementDragPositionInputV1,
): ClampedElementDragPositionV1 {
  const maxX = Math.max(0, input.host.width - input.element.width);
  const maxY = Math.max(0, input.host.height - input.element.height);
  return {
    x: Math.min(Math.max(input.clientX - input.host.left - input.grabX, 0), maxX),
    y: Math.min(Math.max(input.clientY - input.host.top - input.grabY, 0), maxY),
  };
}

interface ClampedElementDragStateV1 {
  readonly pointerId: number;
  readonly grabX: number;
  readonly grabY: number;
}

export interface ClampedElementDragV1<TElement extends HTMLElement = HTMLElement> {
  readonly containerRef: RefObject<TElement | null>;
  readonly position: ClampedElementDragPositionV1 | null;
  readonly headerProps: {
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
    onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
    onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
    onPointerCancel(event: ReactPointerEvent<HTMLElement>): void;
  };
}

/**
 * Title-bar drag with pointer capture, clamped to the container's parent
 * box. Attach `containerRef` to the element that moves; spread
 * `headerProps` onto the drag handle. Interactive header controls are
 * ignored so close/buttons still click.
 */
export function useClampedElementDragV1<
  TElement extends HTMLElement = HTMLElement,
>(): ClampedElementDragV1<TElement> {
  const containerRef = useRef<TElement | null>(null);
  const dragRef = useRef<ClampedElementDragStateV1 | null>(null);
  const [position, setPosition] = useState<ClampedElementDragPositionV1 | null>(null);

  const moveTo = useCallback((clientX: number, clientY: number): void => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (drag === null || container === null) return;
    const host = container.parentElement;
    if (host === null) return;
    setPosition(
      clampElementDragPositionV1({
        clientX,
        clientY,
        grabX: drag.grabX,
        grabY: drag.grabY,
        host: host.getBoundingClientRect(),
        element: container.getBoundingClientRect(),
      }),
    );
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    if (event.button !== 0) return;
    if ((event.target as Element).closest("button, input, select, textarea, a") !== null) {
      return;
    }
    const container = containerRef.current;
    if (container === null) return;
    const bounds = container.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      grabX: event.clientX - bounds.left,
      grabY: event.clientY - bounds.top,
    };
    const header = event.currentTarget;
    if (typeof header.setPointerCapture === "function") {
      header.setPointerCapture(event.pointerId);
    }
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null || dragRef.current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    moveTo(event.clientX, event.clientY);
  }, [moveTo]);

  const onPointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const header = event.currentTarget;
    if (
      typeof header.hasPointerCapture === "function" &&
      typeof header.releasePointerCapture === "function" &&
      header.hasPointerCapture(event.pointerId)
    ) {
      header.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    containerRef,
    position,
    headerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
