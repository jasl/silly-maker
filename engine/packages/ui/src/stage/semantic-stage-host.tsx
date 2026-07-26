// SPDX-License-Identifier: MIT
import { useEffect, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type {
  StageLayerIdV2,
  StageRenderEntryV2,
  StageRenderLayerV2,
  StageRenderTargetV2,
} from "@sillymaker/base";

import styles from "./semantic-stage-host.module.css";

/**
 * Renders one projected Semantic Stage V2 target with stable presentation
 * identities. The host owns layer/camera/placement composition; Story
 * renderers own the visual content of each entry. It renders immutable
 * projection data and never becomes a gameplay authority.
 */

export interface SemanticStageEntryRendererInputV2 {
  readonly layerId: StageLayerIdV2;
  readonly entry: StageRenderEntryV2;
}

export type SemanticStageEntryRendererV2 = (input: SemanticStageEntryRendererInputV2) => ReactNode;

export interface SemanticStageHostDiagnosticV2 {
  readonly code: "stage.renderer_unregistered";
  readonly entryKey: string;
  readonly rendererId: string;
}

export interface SemanticStageHostPropsV2 {
  readonly target: StageRenderTargetV2;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV2>>;
  readonly accessibleName: string;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV2): void;
}

const permilleV2 = (value: number): number => value / 1000;

function cameraStyleV2(target: StageRenderTargetV2): CSSProperties {
  const { camera } = target;
  return {
    transform: `translate3d(${String(-camera.x)}px, ${String(-camera.y)}px, 0) scale(${String(
      permilleV2(camera.zoomPermille),
    )})`,
  };
}

function layerStyleV2(layer: StageRenderLayerV2): CSSProperties {
  const { transform } = layer;
  return {
    transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0) scale(${String(
      permilleV2(transform.scalePermille),
    )})`,
  };
}

function entryStyleV2(entry: StageRenderEntryV2): CSSProperties {
  const { placement } = entry;
  const mirror = placement.mirrored ? " scaleX(-1)" : "";
  return {
    transform: `translate3d(${String(placement.x)}px, ${String(placement.y)}px, 0) scale(${String(
      permilleV2(placement.scalePermille),
    )})${mirror}`,
    zIndex: entry.zOrder,
  };
}

function StageEntryV2(props: {
  readonly layerId: StageLayerIdV2;
  readonly entry: StageRenderEntryV2;
  readonly renderer: SemanticStageEntryRendererV2 | undefined;
}): ReactElement {
  const { layerId, entry, renderer } = props;
  return (
    <div
      className={styles.entry}
      style={entryStyleV2(entry)}
      role="img"
      aria-label={entry.accessibleName}
      data-stage-key={entry.key}
      data-stage-tag={entry.tag}
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

export function SemanticStageHostV2(props: SemanticStageHostPropsV2): ReactElement {
  const { target, renderers, accessibleName, reportDiagnostic } = props;

  const missing = useMemo(
    () =>
      target.layers.flatMap((layer) =>
        layer.entries
          .filter((entry) => !Object.hasOwn(renderers, entry.rendererId))
          .map((entry) =>
            Object.freeze({
              code: "stage.renderer_unregistered" as const,
              entryKey: entry.key,
              rendererId: entry.rendererId,
            }),
          ),
      ),
    [target, renderers],
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
    >
      <div className={styles.camera} style={cameraStyleV2(target)} data-stage-camera="true">
        {target.layers.map((layer) => (
          <div
            key={layer.layerId}
            className={styles.layer}
            style={layerStyleV2(layer)}
            hidden={!layer.transform.visible}
            data-stage-layer={layer.layerId}
          >
            {layer.entries.map((entry) => (
              <StageEntryV2
                key={entry.key}
                layerId={layer.layerId}
                entry={entry}
                renderer={
                  Object.hasOwn(renderers, entry.rendererId)
                    ? renderers[entry.rendererId]
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
