// SPDX-License-Identifier: MIT
import type { RegionsDocumentV1, StageHitRegionPointV1 } from "@sillymaker/base";
import {
  AuthoringDiagnosticErrorV1,
  createDiagnosticV1,
  parseRegionsDocumentV1,
  regionsDocumentFormatV1,
  regionsDocumentVersionV1,
} from "@sillymaker/base";

import type { PngAlphaImageV1 } from "./png-alpha.ts";

/**
 * Silhouette-to-polygon tracing for the `app regions trace` devtool
 * (shaped-hit-regions, accepted 2026-08-21). The legacy-asset bridge: a
 * bitmap alpha silhouette becomes one editable `sillymaker.regions`
 * Document. Pixel semantics exist only here, at import time — the runtime
 * and Saves only ever see the polygon data this produces.
 *
 * Pipeline: binarize alpha at a threshold, keep the largest 4-connected
 * component, walk its outer boundary along pixel cracks (marching-squares
 * corner states, saddles resolved by entry direction so diagonal touches
 * stay disconnected), then Douglas–Peucker the rectilinear ring down to
 * the vertex budget. Vertices are always a subset of the exact boundary
 * corners, so they stay integers inside the traced bounding box, and the
 * result is re-admitted through `parseRegionsDocumentV1` before it leaves.
 */

export interface TraceRegionsOptionsV1 {
  readonly regionsId: string;
  readonly label: string;
  readonly regionId: string;
  readonly accessibleNameText: string;
  /** Pixels with alpha >= threshold are inside the silhouette (1..255). */
  readonly alphaThreshold: number;
  /** Polygon vertex budget (3..64, the contract's per-region maximum). */
  readonly maxVertices: number;
  /** Anchor to subtract, in permille of the image size (geometry convention). */
  readonly anchorXPermille: number;
  readonly anchorYPermille: number;
}

export interface TraceRegionsResultV1 {
  readonly document: RegionsDocumentV1;
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** Exact boundary turn corners before simplification. */
  readonly contourVertexCount: number;
  readonly vertexCount: number;
}

function traceFailureV1(code: string, message: string): never {
  throw new AuthoringDiagnosticErrorV1([
    createDiagnosticV1({ code, phase: "asset", message, details: {} }),
  ]);
}

interface TracePointV1 {
  readonly x: number;
  readonly y: number;
}

/** Labels 4-connected components; returns the mask of the largest one. */
function largestComponentMaskV1(
  image: PngAlphaImageV1,
  alphaThreshold: number,
): Uint8Array | null {
  const { width, height, alpha } = image;
  const size = width * height;
  const labels = new Int32Array(size);
  const queue = new Int32Array(size);
  let bestLabel = 0;
  let bestCount = 0;
  let nextLabel = 0;
  for (let start = 0; start < size; start += 1) {
    if (labels[start] !== 0 || alpha[start]! < alphaThreshold) continue;
    nextLabel += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    labels[start] = nextLabel;
    let count = 0;
    while (head < tail) {
      const index = queue[head]!;
      head += 1;
      count += 1;
      const x = index % width;
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        index - width,
        index + width,
      ];
      for (const neighbor of neighbors) {
        if (
          neighbor >= 0 && neighbor < size && labels[neighbor] === 0 &&
          alpha[neighbor]! >= alphaThreshold
        ) {
          labels[neighbor] = nextLabel;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestLabel = nextLabel;
    }
  }
  if (bestLabel === 0) return null;
  const mask = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    if (labels[index] === bestLabel) mask[index] = 1;
  }
  return mask;
}

const traceDirectionsV1: readonly TracePointV1[] = [
  { x: 1, y: 0 }, // 0: right
  { x: 0, y: 1 }, // 1: down
  { x: -1, y: 0 }, // 2: left
  { x: 0, y: -1 }, // 3: up
];

/**
 * Exit direction per marching-squares corner state (tl<<3|tr<<2|bl<<1|br),
 * walking with the inside on the right. -1 marks the two saddle states
 * (6, 9), which resolve by entry direction, and the off-path states 0/15.
 */
const traceExitByStateV1: readonly number[] = [
  -1,
  0,
  1,
  0,
  3,
  3,
  -1,
  3,
  2,
  -1,
  1,
  0,
  2,
  2,
  1,
  -1,
];

/** Walks the outer boundary; returns the ring of turn corners (clockwise). */
function traceBoundaryRingV1(
  mask: Uint8Array,
  width: number,
  height: number,
): readonly TracePointV1[] {
  const inside = (x: number, y: number): number =>
    x >= 0 && x < width && y >= 0 && y < height ? mask[y * width + x]! : 0;
  let startIndex = -1;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 1) {
      startIndex = index;
      break;
    }
  }
  if (startIndex < 0) traceFailureV1("regions.trace_internal", "component mask is empty");
  const startX = startIndex % width;
  const startY = (startIndex - startX) / width;
  // The topmost-leftmost pixel's top-left corner has state 0001 -> heading
  // right along its top edge, and the corner itself is a turn.
  const ring: TracePointV1[] = [{ x: startX, y: startY }];
  let cornerX = startX;
  let cornerY = startY;
  let direction = 0;
  const maxSteps = 4 * (width + 1) * (height + 1);
  for (let step = 0; step < maxSteps; step += 1) {
    const delta = traceDirectionsV1[direction]!;
    cornerX += delta.x;
    cornerY += delta.y;
    if (cornerX === startX && cornerY === startY) return ring;
    const state = (inside(cornerX - 1, cornerY - 1) << 3) | (inside(cornerX, cornerY - 1) << 2) |
      (inside(cornerX - 1, cornerY) << 1) | inside(cornerX, cornerY);
    let exit = traceExitByStateV1[state]!;
    if (exit < 0) {
      // Saddles keep 4-connectivity: hug the component we entered along.
      if (state === 6) exit = direction === 0 ? 1 : 3;
      else if (state === 9) exit = direction === 1 ? 2 : 0;
      else traceFailureV1("regions.trace_internal", `boundary walk hit state ${String(state)}`);
    }
    if (exit !== direction) {
      ring.push({ x: cornerX, y: cornerY });
      direction = exit;
    }
  }
  return traceFailureV1("regions.trace_internal", "boundary walk did not close");
}

function perpendicularDistanceV1(
  point: TracePointV1,
  from: TracePointV1,
  to: TracePointV1,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y);
  return Math.abs(dx * (point.y - from.y) - dy * (point.x - from.x)) / Math.sqrt(lengthSquared);
}

/** Iterative Douglas–Peucker over an open chain; keeps endpoints. */
function simplifyChainV1(
  points: readonly TracePointV1[],
  epsilon: number,
): readonly TracePointV1[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = epsilon;
    for (let index = first + 1; index < last; index += 1) {
      const distance = perpendicularDistanceV1(points[index]!, points[first]!, points[last]!);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = index;
      }
    }
    if (farthest >= 0) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

/** Closed-ring Douglas–Peucker: split at two extremes, simplify both arcs. */
function simplifyRingV1(
  ring: readonly TracePointV1[],
  epsilon: number,
): readonly TracePointV1[] {
  if (ring.length <= 3) return ring;
  const first = ring[0]!;
  let splitIndex = 1;
  let splitDistance = -1;
  for (let index = 1; index < ring.length; index += 1) {
    const distance = Math.hypot(ring[index]!.x - first.x, ring[index]!.y - first.y);
    if (distance > splitDistance) {
      splitDistance = distance;
      splitIndex = index;
    }
  }
  const forward = simplifyChainV1(ring.slice(0, splitIndex + 1), epsilon);
  const backward = simplifyChainV1([...ring.slice(splitIndex), first], epsilon);
  return [...forward.slice(0, -1), ...backward.slice(0, -1)];
}

function shoelaceDoubleAreaV1(points: readonly TracePointV1[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum;
}

function ringFitsBudgetV1(ring: readonly TracePointV1[], maxVertices: number): boolean {
  return ring.length >= 3 && ring.length <= maxVertices && shoelaceDoubleAreaV1(ring) !== 0;
}

/** Simplifies to the budget with the smallest epsilon that still fits. */
function simplifyToBudgetV1(
  ring: readonly TracePointV1[],
  maxVertices: number,
): readonly TracePointV1[] {
  if (ringFitsBudgetV1(ring, maxVertices)) return ring;
  let low = 0;
  let high = 0.5;
  let fit: readonly TracePointV1[] | null = null;
  for (let attempt = 0; attempt < 80 && fit === null; attempt += 1) {
    const candidate = simplifyRingV1(ring, high);
    if (ringFitsBudgetV1(candidate, maxVertices)) {
      fit = candidate;
      break;
    }
    low = high;
    high *= 1.5;
  }
  if (fit === null) {
    traceFailureV1(
      "regions.trace_budget_unreachable",
      `the silhouette could not be simplified to ${String(maxVertices)} vertices; ` +
        "raise --max-vertices",
    );
  }
  // Tighten: the smallest epsilon that fits keeps the most detail.
  for (let refinement = 0; refinement < 20; refinement += 1) {
    const middle = (low + high) / 2;
    const candidate = simplifyRingV1(ring, middle);
    if (ringFitsBudgetV1(candidate, maxVertices)) {
      fit = candidate;
      high = middle;
    } else {
      low = middle;
    }
  }
  return fit;
}

/**
 * Traces the alpha silhouette of a decoded PNG into a one-region
 * `sillymaker.regions` Document. Throws structured diagnostics when the
 * silhouette is empty or the vertex budget is unreachable; the returned
 * Document has passed strict admission.
 */
export function traceRegionsDocumentV1(
  image: PngAlphaImageV1,
  options: TraceRegionsOptionsV1,
): TraceRegionsResultV1 {
  const mask = largestComponentMaskV1(image, options.alphaThreshold);
  if (mask === null) {
    traceFailureV1(
      "regions.trace_silhouette_empty",
      `no pixel reaches alpha ${String(options.alphaThreshold)}; ` +
        "lower --alpha-threshold or check the image",
    );
  }
  const ring = traceBoundaryRingV1(mask, image.width, image.height);
  const simplified = simplifyToBudgetV1(ring, options.maxVertices);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  const anchorX = Math.round((image.width * options.anchorXPermille) / 1000);
  const anchorY = Math.round((image.height * options.anchorYPermille) / 1000);
  const polygonPoints: readonly StageHitRegionPointV1[] = simplified.map((point) => ({
    x: point.x - anchorX,
    y: point.y - anchorY,
  }));
  const document = parseRegionsDocumentV1({
    format: regionsDocumentFormatV1,
    version: regionsDocumentVersionV1,
    regionsId: options.regionsId,
    label: options.label,
    regions: [
      {
        regionId: options.regionId,
        accessibleNameText: options.accessibleNameText,
        x: minX - anchorX,
        y: minY - anchorY,
        width: maxX - minX,
        height: maxY - minY,
        polygonPoints,
      },
    ],
    authoring: { status: "generated" },
  });
  return {
    document,
    imageWidth: image.width,
    imageHeight: image.height,
    contourVertexCount: ring.length,
    vertexCount: polygonPoints.length,
  };
}
