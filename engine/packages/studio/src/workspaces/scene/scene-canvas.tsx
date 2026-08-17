// SPDX-License-Identifier: MIT
import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type {
  SceneDocumentV1,
  StageContentGeometryV1,
  StagePlacementV1,
  StageRenderTargetV1,
} from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { SemanticStageTargetHostV1 } from "@sillymaker/ui";

import styles from "../../studio-app.module.css";
import type { defaultPlacementV1 } from "./scene-compile.ts";

/**
 * The scene workspace canvas: the Story's real renderers over the compiled
 * detached target, with direct manipulation on top — geometry-derived
 * selection boxes, drag-to-place in logical canvas pixels (pointer deltas ÷
 * preview scale, snapped to the canvas edges/centers, clamped inside), an
 * anchor dot, and a corner scale handle. Every gesture writes the draft
 * through one callback carrying a per-gesture coalesce key, so a whole
 * drag is a single undo step.
 */

const studioSnapThresholdCssPxV1 = 8;
const studioMinScalePermilleV1 = 10;
const studioMaxScalePermilleV1 = 100_000;

/** One selectable actor on the canvas: projected placement plus its box. */
interface StudioCanvasActorV1 {
  readonly key: string;
  readonly tag: string;
  readonly placement: StagePlacementV1;
  readonly geometry: StageContentGeometryV1;
}

/** The rendered box in logical canvas pixels (anchor + scale + mirror applied). */
function actorBoxV1(actor: StudioCanvasActorV1): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} {
  const scale = actor.placement.scalePermille / 1000;
  const width = actor.geometry.width * scale;
  const height = actor.geometry.height * scale;
  const anchorX = (actor.geometry.width * actor.geometry.anchorXPermille * scale) / 1000;
  const anchorY = (actor.geometry.height * actor.geometry.anchorYPermille * scale) / 1000;
  return {
    left: actor.placement.mirrored
      ? actor.placement.x + anchorX - width
      : actor.placement.x - anchorX,
    top: actor.placement.y - anchorY,
    width,
    height,
  };
}

function snapAxisV1(
  value: number,
  targets: readonly number[],
  threshold: number,
): { readonly value: number; readonly snapped: number | null } {
  for (const target of targets) {
    if (Math.abs(value - target) <= threshold) return { value: target, snapped: target };
  }
  return { value, snapped: null };
}

interface StudioDragStateV1 {
  readonly pointerId: number;
  readonly tag: string;
  readonly mode: "move" | "scale";
  readonly gesture: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startPlacement: StagePlacementV1;
  readonly geometry: StageContentGeometryV1;
}

export interface SceneCanvasPropsV1 {
  readonly draft: SceneDocumentV1;
  readonly target: StageRenderTargetV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  readonly showHitRegions: boolean;
  /** Preview scale (CSS px per logical px). */
  readonly scale: number;
  readonly selectedTag: string | null;
  onSelectTag(tag: string): void;
  onWritePlacement(
    tag: string,
    mutatePlacement: (placement: ReturnType<typeof defaultPlacementV1>) => void,
    coalesceKey: string,
  ): void;
}

export function SceneCanvasV1(props: SceneCanvasPropsV1): ReactElement {
  const { draft, target, scale } = props;
  const dragRef = useRef<StudioDragStateV1 | null>(null);
  // One undo step per drag gesture: every pointer-down starts a new run.
  const gestureRef = useRef(0);
  const [guides, setGuides] = useState<{ readonly x: number | null; readonly y: number | null }>(
    { x: null, y: null },
  );

  const actors = useMemo(() => {
    const collected: StudioCanvasActorV1[] = [];
    for (const layer of target.layers) {
      for (const entry of layer.entries) {
        if (entry.geometry === undefined) continue;
        collected.push({
          key: entry.key,
          tag: entry.tag as string,
          placement: entry.placement,
          geometry: entry.geometry,
        });
      }
    }
    return Object.freeze(collected);
  }, [target]);

  const onActorPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    actor: StudioCanvasActorV1,
    mode: "move" | "scale",
  ): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    props.onSelectTag(actor.tag);
    gestureRef.current += 1;
    dragRef.current = {
      pointerId: event.pointerId,
      tag: actor.tag,
      mode,
      gesture: gestureRef.current,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: actor.placement,
      geometry: actor.geometry,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onActorPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    if (drag.mode === "scale") {
      const deltaUp = (drag.startClientY - event.clientY) / scale;
      const startHeight = (drag.geometry.height * drag.startPlacement.scalePermille) / 1000;
      const next = Math.min(
        studioMaxScalePermilleV1,
        Math.max(
          studioMinScalePermilleV1,
          Math.round(((startHeight + deltaUp) / drag.geometry.height) * 1000),
        ),
      );
      props.onWritePlacement(drag.tag, (placement) => {
        placement.scalePermille = next;
      }, `scale:${drag.tag}:${String(drag.gesture)}`);
      return;
    }
    const threshold = studioSnapThresholdCssPxV1 / scale;
    const candidateX = drag.startPlacement.x + (event.clientX - drag.startClientX) / scale;
    const candidateY = drag.startPlacement.y + (event.clientY - drag.startClientY) / scale;
    const snappedX = snapAxisV1(
      Math.round(candidateX),
      [0, Math.round(draft.canvas.width / 2), draft.canvas.width],
      threshold,
    );
    const snappedY = snapAxisV1(
      Math.round(candidateY),
      [0, Math.round(draft.canvas.height / 2), draft.canvas.height],
      threshold,
    );
    const x = Math.min(draft.canvas.width, Math.max(0, snappedX.value));
    const y = Math.min(draft.canvas.height, Math.max(0, snappedY.value));
    setGuides({ x: snappedX.snapped, y: snappedY.snapped });
    props.onWritePlacement(drag.tag, (placement) => {
      placement.x = x;
      placement.y = y;
    }, `move:${drag.tag}:${String(drag.gesture)}`);
  };

  const onActorPointerEnd = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setGuides({ x: null, y: null });
  };

  return (
    <div
      className={styles["canvas-clip"]}
      data-studio-canvas="true"
      style={{
        width: `${String(draft.canvas.width * scale)}px`,
        height: `${String(draft.canvas.height * scale)}px`,
      }}
    >
      <div
        className={styles["canvas-scale"]}
        style={{
          width: `${String(draft.canvas.width)}px`,
          height: `${String(draft.canvas.height)}px`,
          transform: `scale(${String(scale)})`,
        }}
      >
        <SemanticStageTargetHostV1
          target={target}
          renderers={props.renderers}
          accessibleName={props.accessibleName}
          highlightHitRegions={props.showHitRegions}
        />
        <div className={styles["overlay"]}>
          {guides.x === null ? null : (
            <div
              className={styles["guide-x"]}
              data-studio-guide-x={String(guides.x)}
              style={{ left: `${String(guides.x)}px` }}
            />
          )}
          {guides.y === null ? null : (
            <div
              className={styles["guide-y"]}
              data-studio-guide-y={String(guides.y)}
              style={{ top: `${String(guides.y)}px` }}
            />
          )}
          {actors.map((actor) => {
            const box = actorBoxV1(actor);
            const selected = actor.tag === props.selectedTag;
            return (
              <div key={actor.key}>
                <button
                  type="button"
                  className={styles["select-box"]}
                  data-studio-select={actor.tag}
                  data-studio-selected={selected ? "true" : undefined}
                  aria-label={`选择并拖动 ${actor.tag}`}
                  style={{
                    left: `${String(box.left)}px`,
                    top: `${String(box.top)}px`,
                    width: `${String(box.width)}px`,
                    height: `${String(box.height)}px`,
                  }}
                  onPointerDown={(event) => onActorPointerDown(event, actor, "move")}
                  onPointerMove={onActorPointerMove}
                  onPointerUp={onActorPointerEnd}
                  onPointerCancel={onActorPointerEnd}
                />
                {selected
                  ? (
                    <>
                      <div
                        className={styles["anchor-dot"]}
                        data-studio-anchor={actor.tag}
                        style={{
                          left: `${String(actor.placement.x)}px`,
                          top: `${String(actor.placement.y)}px`,
                        }}
                      />
                      <button
                        type="button"
                        className={styles["scale-handle"]}
                        data-studio-scale-handle={actor.tag}
                        aria-label={`缩放 ${actor.tag}`}
                        style={{
                          left: `${String(box.left + box.width)}px`,
                          top: `${String(box.top)}px`,
                        }}
                        onPointerDown={(event) => onActorPointerDown(event, actor, "scale")}
                        onPointerMove={onActorPointerMove}
                        onPointerUp={onActorPointerEnd}
                        onPointerCancel={onActorPointerEnd}
                      />
                    </>
                  )
                  : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
