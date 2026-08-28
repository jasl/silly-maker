// SPDX-License-Identifier: MIT
import { useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";

import type {
  AuthoringSceneFacetProjectionV1,
  AuthoringSceneDocumentV1,
  AuthoringSceneObjectFacetsV1,
} from "@sillymaker/base/authoring/scene";
import type { MotionSampleV1, TimelineChannelValueV1 } from "@sillymaker/base";
import type { StageTagV1 } from "@sillymaker/base";
import { SemanticStageHostV1, settledStageFrameV1 } from "@sillymaker/ui";

import type { InspectorBindingV1 } from "../core/binding.ts";
import { inspectorPreviewBoundsV1, inspectorPreviewBoxV1 } from "./scene-model.ts";
import styles from "./inspector.module.css";

export interface InspectorScenePreviewPropsV1 {
  readonly document: AuthoringSceneDocumentV1;
  readonly facets: AuthoringSceneFacetProjectionV1;
  readonly binding: InspectorBindingV1;
  readonly selectedObjectId: StageTagV1 | null;
  readonly timelineOverlay: readonly TimelineChannelValueV1[] | null;
  readonly motionOverlay: ReadonlyMap<string, MotionSampleV1> | null;
  onSelectObject(objectId: StageTagV1): void;
}

const previewOverscanV1 = 80;
const previewFitGutterV1 = 16;

interface InspectorPreviewSizeV1 {
  readonly width: number;
  readonly height: number;
}

function previewFitZoomV1(
  bounds: { readonly width: number; readonly height: number },
  available: InspectorPreviewSizeV1 | null,
): number {
  if (available === null) return 0.5;
  const width = Math.max(1, available.width - previewFitGutterV1 * 2);
  const height = Math.max(1, available.height - previewFitGutterV1 * 2);
  return Math.max(0.01, Math.min(width / bounds.width, height / bounds.height));
}

function hitRegionStyleV1(
  facets: AuthoringSceneObjectFacetsV1,
  region: AuthoringSceneObjectFacetsV1["hitRegions"][number],
  worldLeft: number,
  worldTop: number,
): CSSProperties | undefined {
  const bounds = region.bounds;
  if (bounds === null) return undefined;
  const scale = facets.placement.scalePermille / 1_000;
  const left = facets.placement.mirrored
    ? facets.placement.x - (bounds.x + bounds.width) * scale
    : facets.placement.x + bounds.x * scale;
  const top = facets.placement.y + bounds.y * scale;
  const clipPath = region.polygonPoints === null
    ? undefined
    : `polygon(${
      region.polygonPoints.map((point) =>
        `${String((point.x - bounds.x) * scale)}px ${String((point.y - bounds.y) * scale)}px`
      ).join(", ")
    })`;
  return {
    left: `${String(left - worldLeft)}px`,
    top: `${String(top - worldTop)}px`,
    width: `${String(bounds.width * scale)}px`,
    height: `${String(bounds.height * scale)}px`,
    ...(clipPath === undefined ? {} : { clipPath }),
  };
}

export function InspectorScenePreviewV1(
  props: InspectorScenePreviewPropsV1,
): ReactElement {
  const [zoomSelection, setZoomSelection] = useState<"fit" | number>("fit");
  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState<InspectorPreviewSizeV1 | null>(null);
  const document = props.document;
  const bounds = useMemo(
    () =>
      inspectorPreviewBoundsV1(
        document,
        props.facets.objects,
        previewOverscanV1,
      ),
    [document, props.facets.objects],
  );
  useLayoutEffect(() => {
    if (previewElement === null) return undefined;
    const measure = (): void => {
      const width = previewElement.clientWidth;
      const height = previewElement.clientHeight;
      if (width <= 0 || height <= 0) return;
      setAvailable((current) =>
        current?.width === width && current.height === height ? current : { width, height }
      );
    };
    measure();
    if (typeof ResizeObserver !== "function") {
      globalThis.addEventListener("resize", measure);
      return () => globalThis.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(previewElement);
    return () => observer.disconnect();
  }, [previewElement]);
  const zoom = zoomSelection === "fit"
    ? previewFitZoomV1(bounds, available)
    : zoomSelection / 1_000;
  const effectiveZoomPermille = Math.round(zoom * 1_000);
  const frame = useMemo(
    () => settledStageFrameV1(props.facets.previewTarget),
    [props.facets.previewTarget],
  );
  const worldStyle = {
    width: `${String(bounds.width)}px`,
    height: `${String(bounds.height)}px`,
    transform: `scale(${String(zoom)})`,
    transformOrigin: "0 0",
  } satisfies CSSProperties;
  const objects = Object.values(props.facets.objects);

  return (
    <section className={styles["preview-section"]} aria-label="场景预览">
      <header className={styles["section-header"]}>
        <div>
          <strong>真实 Stage 预览</strong>
          <span>{document.canvas.width} × {document.canvas.height}</span>
        </div>
        <label className={styles["inline-control"]}>
          缩放
          <select
            aria-label="预览缩放"
            value={zoomSelection}
            onChange={(event) =>
              setZoomSelection(
                event.currentTarget.value === "fit" ? "fit" : Number(event.currentTarget.value),
              )}
          >
            <option value="fit">适应工作区</option>
            <option value={250}>25%</option>
            <option value={500}>50%</option>
            <option value={750}>75%</option>
            <option value={1000}>100%</option>
            <option value={1500}>150%</option>
            <option value={2000}>200%</option>
          </select>
        </label>
      </header>
      <div
        ref={setPreviewElement}
        className={styles["preview-viewport"]}
        data-inspector-preview="true"
        data-inspector-preview-zoom={String(zoomSelection)}
        data-inspector-preview-effective-zoom={String(effectiveZoomPermille)}
        aria-label="可滚动场景画布"
      >
        <div
          className={styles["preview-sizer"]}
          style={{ width: bounds.width * zoom, height: bounds.height * zoom }}
        >
          <div className={styles["preview-world"]} style={worldStyle}>
            <div
              className={styles["preview-canvas"]}
              style={{
                left: `${String(-bounds.minX)}px`,
                top: `${String(-bounds.minY)}px`,
                width: `${String(document.canvas.width)}px`,
                height: `${String(document.canvas.height)}px`,
              }}
            >
              <SemanticStageHostV1
                frame={frame}
                renderers={props.binding.renderers}
                accessibleName={document.label}
                overlay={props.timelineOverlay}
                ambient={props.motionOverlay}
                highlightHitRegions
                assets={props.binding.assets ?? null}
              />
            </div>
            <div className={styles["preview-overlay"]}>
              {objects.map((objectFacets) => {
                const objectId = objectFacets.inspection.objectId;
                const box = inspectorPreviewBoxV1(objectFacets);
                const selected = props.selectedObjectId === objectId;
                const ghost = objectFacets.inspection.visual?.transparent === true ||
                  objectFacets.inspection.visual?.anchorOutsideCanvas === true;
                return (
                  <div key={objectId}>
                    <button
                      type="button"
                      className={styles["object-overlay"]}
                      data-inspector-object-overlay={objectId}
                      data-inspector-selected={selected ? "true" : undefined}
                      data-inspector-ghost={ghost ? "true" : undefined}
                      aria-label={`选择 ${objectFacets.inspection.label}`}
                      style={{
                        left: `${String(box.left - bounds.minX)}px`,
                        top: `${String(box.top - bounds.minY)}px`,
                        width: `${String(Math.max(20, box.width))}px`,
                        height: `${String(Math.max(20, box.height))}px`,
                      }}
                      onClick={() => props.onSelectObject(objectId)}
                    >
                      <span>{objectFacets.inspection.label}</span>
                    </button>
                    {selected
                      ? objectFacets.hitRegions.map((region) => {
                        const style = hitRegionStyleV1(
                          objectFacets,
                          region,
                          bounds.minX,
                          bounds.minY,
                        );
                        return style === undefined ? null : (
                          <div
                            key={region.regionId}
                            className={styles["hit-region-overlay"]}
                            data-inspector-hit-region={region.regionId}
                            data-inspector-hit-region-status={region.status}
                            style={style}
                          >
                            <span>{region.regionId}</span>
                          </div>
                        );
                      })
                      : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className={styles.hint}>滚动平移画布；虚线框会强制显示透明、场外和分组对象。</p>
    </section>
  );
}
