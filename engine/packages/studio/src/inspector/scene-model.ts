// SPDX-License-Identifier: MIT
import type {
  AuthoringSceneDocumentV1,
  AuthoringSceneObjectFacetsV1,
  AuthoringSceneObjectV1,
} from "@sillymaker/base/authoring/scene";
import type { StageLayerIdV1, StageTagV1 } from "@sillymaker/base";

export type InspectorTreeRowV1 =
  | {
    readonly kind: "layer";
    readonly key: string;
    readonly layerId: StageLayerIdV1;
    readonly label: string;
    readonly depth: 0;
  }
  | {
    readonly kind: "object";
    readonly key: string;
    readonly objectId: StageTagV1;
    readonly layerId: StageLayerIdV1;
    readonly label: string;
    readonly depth: number;
    readonly hasVisual: boolean;
  };

function appendObjectRowsV1(
  rows: InspectorTreeRowV1[],
  object: AuthoringSceneObjectV1,
  layerId: StageLayerIdV1,
  depth: number,
): void {
  rows.push({
    kind: "object",
    key: `object:${object.objectId}`,
    objectId: object.objectId,
    layerId,
    label: object.label,
    depth,
    hasVisual: object.visual !== undefined,
  });
  for (const child of object.children) appendObjectRowsV1(rows, child, layerId, depth + 1);
}

/** Stable layer/root/child preorder used by the Inspector hierarchy. */
export function flattenInspectorTreeV1(
  document: AuthoringSceneDocumentV1,
): readonly InspectorTreeRowV1[] {
  const rows: InspectorTreeRowV1[] = [];
  for (const layer of document.layers) {
    rows.push({
      kind: "layer",
      key: `layer:${layer.layerId}`,
      layerId: layer.layerId,
      label: layer.label,
      depth: 0,
    });
    for (const root of layer.roots) {
      appendObjectRowsV1(rows, root, layer.layerId, 1);
    }
  }
  return rows;
}

export interface InspectorObjectOrderingV1 {
  readonly previousObjectId: StageTagV1 | null;
  readonly canMoveLater: boolean;
  /** The object passed as `beforeObjectId` to move this object one slot later. */
  readonly laterBeforeObjectId: StageTagV1 | null;
}

function objectOrderingInSiblingsV1(
  siblings: readonly AuthoringSceneObjectV1[],
  objectId: StageTagV1,
): InspectorObjectOrderingV1 | null {
  const index = siblings.findIndex((candidate) => candidate.objectId === objectId);
  if (index !== -1) {
    return {
      previousObjectId: index === 0 ? null : siblings[index - 1]!.objectId,
      canMoveLater: index < siblings.length - 1,
      laterBeforeObjectId: index + 2 >= siblings.length ? null : siblings[index + 2]!.objectId,
    };
  }
  for (const candidate of siblings) {
    const nested = objectOrderingInSiblingsV1(candidate.children, objectId);
    if (nested !== null) return nested;
  }
  return null;
}

export function inspectorObjectOrderingV1(
  document: AuthoringSceneDocumentV1,
  objectId: StageTagV1,
): InspectorObjectOrderingV1 | null {
  for (const layer of document.layers) {
    const ordering = objectOrderingInSiblingsV1(layer.roots, objectId);
    if (ordering !== null) return ordering;
  }
  return null;
}

export interface InspectorPreviewBoxV1 {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Geometry-aware box; groups retain a small selectable authoring handle. */
export function inspectorPreviewBoxV1(
  facets: AuthoringSceneObjectFacetsV1,
): InspectorPreviewBoxV1 {
  const { placement, geometry } = facets;
  if (geometry === null) {
    return { left: placement.x - 10, top: placement.y - 10, width: 20, height: 20 };
  }
  const scale = placement.scalePermille / 1_000;
  const width = geometry.width * scale;
  const height = geometry.height * scale;
  const anchorX = (geometry.width * geometry.anchorXPermille * scale) / 1_000;
  const anchorY = (geometry.height * geometry.anchorYPermille * scale) / 1_000;
  return {
    left: placement.mirrored ? placement.x + anchorX - width : placement.x - anchorX,
    top: placement.y - anchorY,
    width,
    height,
  };
}

export interface InspectorPreviewBoundsV1 {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

/** Canvas plus current-Scene object overscan; no project-wide geometry is retained. */
export function inspectorPreviewBoundsV1(
  document: AuthoringSceneDocumentV1,
  facets: Readonly<Record<string, AuthoringSceneObjectFacetsV1>>,
  overscan: number,
): InspectorPreviewBoundsV1 {
  let minX = 0;
  let minY = 0;
  let maxX = document.canvas.width;
  let maxY = document.canvas.height;
  for (const object of Object.values(facets)) {
    const box = inspectorPreviewBoxV1(object);
    minX = Math.min(minX, box.left);
    minY = Math.min(minY, box.top);
    maxX = Math.max(maxX, box.left + box.width);
    maxY = Math.max(maxY, box.top + box.height);
  }
  const boundedMinX = Math.floor(minX - overscan);
  const boundedMinY = Math.floor(minY - overscan);
  return {
    minX: boundedMinX,
    minY: boundedMinY,
    width: Math.ceil(maxX + overscan - boundedMinX),
    height: Math.ceil(maxY + overscan - boundedMinY),
  };
}
