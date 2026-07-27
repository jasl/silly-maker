// SPDX-License-Identifier: MIT
import { useEffect, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { StageLayerIdV1, StageRenderEntryV1, StageRenderTargetV1 } from "@sillymaker/base";

import type {
  StageFrameEntryV1,
  StageFrameLayerV1,
  StageRenderFrameV1,
} from "./stage-reconciler.ts";
import { settledStageFrameV1 } from "./stage-reconciler.ts";
import styles from "./semantic-stage-host.module.css";

/**
 * Renders one semantic stage render frame with stable presentation
 * identities. The host owns layer/camera/placement composition and the
 * visual interpolation of active transitions; Story renderers own the
 * content of each entry. It renders immutable projection data and never
 * becomes a gameplay authority.
 */

export interface SemanticStageEntryRendererInputV1 {
  readonly layerId: StageLayerIdV1;
  readonly entry: StageRenderEntryV1;
}

export type SemanticStageEntryRendererV1 = (input: SemanticStageEntryRendererInputV1) => ReactNode;

export interface SemanticStageHostDiagnosticV1 {
  readonly code: "stage.renderer_unregistered";
  readonly entryKey: string;
  readonly rendererId: string;
}

export interface SemanticStageHostPropsV1 {
  readonly frame: StageRenderFrameV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
}

const permilleV1 = (value: number): number => value / 1000;
const lerpV1 = (from: number, to: number, progress: number): number =>
  from + (to - from) * progress;

function cameraStyleV1(frame: StageRenderFrameV1): CSSProperties {
  const { camera } = frame;
  return {
    transform: `translate3d(${String(-camera.x)}px, ${String(-camera.y)}px, 0) scale(${String(
      permilleV1(camera.zoomPermille),
    )})`,
  };
}

function layerStyleV1(layer: StageFrameLayerV1): CSSProperties {
  const { transform } = layer;
  return {
    transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0) scale(${String(
      permilleV1(transform.scalePermille),
    )})`,
  };
}

function entryStyleV1(frameEntry: StageFrameEntryV1): CSSProperties {
  const { entry, phase, transitionKind, progress, slide, fromPlacement } = frameEntry;
  let x = entry.placement.x;
  let y = entry.placement.y;
  let scale = permilleV1(entry.placement.scalePermille);
  let opacity: number | undefined;

  if (transitionKind === "crossfade") {
    opacity = phase === "exiting" ? 1 - progress : progress;
  } else if (transitionKind === "slide") {
    if (fromPlacement !== null) {
      x = lerpV1(fromPlacement.x, x, progress);
      y = lerpV1(fromPlacement.y, y, progress);
      scale = lerpV1(permilleV1(fromPlacement.scalePermille), scale, progress);
    } else if (slide !== null) {
      const displacement = phase === "exiting" ? progress : 1 - progress;
      x += slide.x * displacement;
      y += slide.y * displacement;
      opacity = phase === "exiting" ? 1 - progress : progress;
    }
  } else if (phase === "exiting") {
    opacity = 1 - progress;
  }

  const mirror = entry.placement.mirrored ? " scaleX(-1)" : "";
  return {
    transform: `translate3d(${String(x)}px, ${String(y)}px, 0) scale(${String(scale)})${mirror}`,
    zIndex: entry.zOrder,
    ...(opacity === undefined ? {} : { opacity }),
  };
}

function StageEntryV1(props: {
  readonly layerId: StageLayerIdV1;
  readonly frameEntry: StageFrameEntryV1;
  readonly renderer: SemanticStageEntryRendererV1 | undefined;
}): ReactElement {
  const { layerId, frameEntry, renderer } = props;
  const { entry, phase } = frameEntry;
  const exiting = phase === "exiting";
  return (
    <div
      className={styles.entry}
      style={entryStyleV1(frameEntry)}
      role={exiting ? undefined : "img"}
      aria-label={exiting ? undefined : entry.accessibleName}
      aria-hidden={exiting ? true : undefined}
      data-stage-phase={phase}
      {...(exiting
        ? { "data-stage-exiting": "true", "data-stage-exiting-key": entry.key }
        : { "data-stage-key": entry.key, "data-stage-tag": entry.tag })}
      data-stage-content={entry.contentId}
      data-stage-renderer={entry.rendererId}
      data-stage-fallback={renderer === undefined || entry.fallback ? "true" : undefined}
    >
      {renderer === undefined ? (
        <div className={styles.fallback}>{entry.accessibleName}</div>
      ) : (
        renderer({ layerId, entry })
      )}
    </div>
  );
}

export function SemanticStageHostV1(props: SemanticStageHostPropsV1): ReactElement {
  const { frame, renderers, accessibleName, reportDiagnostic } = props;

  const missing = useMemo(
    () =>
      frame.layers.flatMap((layer) =>
        layer.entries
          .filter(
            (frameEntry) =>
              frameEntry.phase !== "exiting" &&
              !Object.hasOwn(renderers, frameEntry.entry.rendererId),
          )
          .map((frameEntry) =>
            Object.freeze({
              code: "stage.renderer_unregistered" as const,
              entryKey: frameEntry.entry.key,
              rendererId: frameEntry.entry.rendererId,
            }),
          ),
      ),
    [frame, renderers],
  );

  useEffect(() => {
    if (reportDiagnostic === undefined) return;
    for (const diagnostic of missing) reportDiagnostic(diagnostic);
  }, [missing, reportDiagnostic]);

  return (
    <div
      className={styles.root}
      role="group"
      aria-label={accessibleName}
      data-semantic-stage="true"
      data-stage-settled={frame.settled ? "true" : "false"}
      data-stage-input-blocked={frame.inputGate.blocked ? "true" : undefined}
      data-stage-skip-on-input={frame.inputGate.skipOnInput ? "true" : undefined}
    >
      <div className={styles.camera} style={cameraStyleV1(frame)} data-stage-camera="true">
        {frame.layers.map((layer) => (
          <div
            key={layer.layerId}
            className={styles.layer}
            style={layerStyleV1(layer)}
            hidden={!layer.transform.visible}
            data-stage-layer={layer.layerId}
          >
            {layer.entries.map((frameEntry) => (
              <StageEntryV1
                key={frameEntry.frameKey}
                layerId={layer.layerId}
                frameEntry={frameEntry}
                renderer={
                  Object.hasOwn(renderers, frameEntry.entry.rendererId)
                    ? renderers[frameEntry.entry.rendererId]
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders one settled target without transitions (no reconciler needed). */
export function SemanticStageTargetHostV1(props: {
  readonly target: StageRenderTargetV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
}): ReactElement {
  const frame = useMemo(() => settledStageFrameV1(props.target), [props.target]);
  return (
    <SemanticStageHostV1
      frame={frame}
      renderers={props.renderers}
      accessibleName={props.accessibleName}
      {...(props.reportDiagnostic === undefined
        ? {}
        : { reportDiagnostic: props.reportDiagnostic })}
    />
  );
}
