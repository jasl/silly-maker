// SPDX-License-Identifier: MIT
import type { RegionsDocumentV1 } from "@sillymaker/base";
import { parseRegionsDocumentV1 } from "@sillymaker/base";

/**
 * Regions workspace editing (shaped-hit-regions M3): pure plain-JSON
 * commands over one `sillymaker.regions` draft — add/remove regions, move/
 * resize with the polygon carried along, per-vertex editing, the rectangle
 * ⇄ polygon conversion, the blank document, and the id-prefix inference.
 * Admission (`parseRegionsDocumentV1`) stays the single validator: the
 * draft gate below literally re-runs it, so the save button can never pass
 * something the port would reject.
 */

export interface RegionsPlainPointV1 {
  x: number;
  y: number;
}

export interface RegionsPlainRegionV1 {
  regionId: string;
  accessibleNameText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  polygonPoints?: RegionsPlainPointV1[];
  hoverAssetId?: string;
}

export interface RegionsPlainDocumentV1 {
  format: "sillymaker.regions";
  version: 1;
  regionsId: string;
  label: string;
  regions: RegionsPlainRegionV1[];
  authoring?: { status?: "generated" | "human_tuned"; locked?: boolean; notes?: string };
}

/** Same admission budget: coordinates stay safe integers within ±1e6. */
const regionsEditMaxCoordinateV1 = 1_000_000;
const regionsEditMaxVerticesV1 = 64;

function clampIntV1(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** One draft edit: clone, mutate the plain JSON, and hand back a new doc. */
export function editRegionsDocumentV1(
  draft: RegionsDocumentV1,
  mutate: (plain: RegionsPlainDocumentV1) => void,
): RegionsDocumentV1 {
  const plain = JSON.parse(JSON.stringify(draft)) as RegionsPlainDocumentV1;
  mutate(plain);
  return plain as unknown as RegionsDocumentV1;
}

/** The blank regions document a creation flow starts from. */
export function newRegionsDocumentV1(input: {
  readonly regionsId: string;
  readonly label: string;
}): RegionsDocumentV1 {
  return {
    format: "sillymaker.regions",
    version: 1,
    regionsId: input.regionsId,
    label: input.label,
    regions: [],
    authoring: { status: "generated" },
  } as unknown as RegionsDocumentV1;
}

/** Saving from the editor promotes the document to human-tuned. */
export function graduateRegionsDocumentV1(draft: RegionsDocumentV1): RegionsDocumentV1 {
  return editRegionsDocumentV1(draft, (plain) => {
    plain.authoring = { ...plain.authoring, status: "human_tuned" };
  });
}

/**
 * The regionsId prefix for a new document: inferred from the documents
 * already in the project, then from the story segment the shell knows
 * (scene ids), then the literal "story".
 */
export function inferRegionsIdPrefixV1(
  regionsIds: readonly string[],
  storyHint: string | null,
): string {
  const fromExisting = regionsIds[0];
  if (fromExisting !== undefined) {
    const segments = fromExisting.split(".");
    if (segments.length >= 3) return `${segments.slice(0, -1).join(".")}.`;
  }
  if (storyHint !== null && storyHint.length > 0) return `regions.${storyHint}.`;
  return "regions.story.";
}

/**
 * The single save gate: re-run Document admission over the draft and
 * report the first failure (`reason at /path`), or null when the draft
 * would be accepted byte-for-byte by the port.
 */
export function regionsDraftBlockingIssueV1(draft: RegionsDocumentV1): string | null {
  try {
    parseRegionsDocumentV1(draft);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Appends "-2", "-3", … until the candidate is free. */
function dedupeRegionIdV1(candidate: string, taken: readonly string[]): string {
  if (!taken.includes(candidate)) return candidate;
  for (let suffix = 2;; suffix += 1) {
    const next = `${candidate}-${String(suffix)}`;
    if (!taken.includes(next)) return next;
  }
}

/** Adds one rectangle region at the seed box; returns its array index. */
export function addRegionV1(
  plain: RegionsPlainDocumentV1,
  seed: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): number {
  const taken = plain.regions.map((region) => region.regionId);
  const regionId = dedupeRegionIdV1(`region-${String(plain.regions.length + 1)}`, taken);
  const width = clampIntV1(seed.width, 1, regionsEditMaxCoordinateV1);
  const height = clampIntV1(seed.height, 1, regionsEditMaxCoordinateV1);
  plain.regions.push({
    regionId,
    accessibleNameText: regionId,
    x: clampIntV1(seed.x, -regionsEditMaxCoordinateV1, regionsEditMaxCoordinateV1 - width),
    y: clampIntV1(seed.y, -regionsEditMaxCoordinateV1, regionsEditMaxCoordinateV1 - height),
    width,
    height,
  });
  return plain.regions.length - 1;
}

export function removeRegionV1(plain: RegionsPlainDocumentV1, index: number): void {
  plain.regions.splice(index, 1);
}

/**
 * Moves the bounding box origin (the polygon translates with it, so shape
 * refinement survives placement tweaks). The whole box stays inside the
 * admission coordinate budget so translated vertices remain admissible.
 */
export function moveRegionV1(
  plain: RegionsPlainDocumentV1,
  index: number,
  x: number,
  y: number,
): void {
  const region = plain.regions[index];
  if (region === undefined) return;
  const nextX = clampIntV1(
    x,
    -regionsEditMaxCoordinateV1,
    regionsEditMaxCoordinateV1 - region.width,
  );
  const nextY = clampIntV1(
    y,
    -regionsEditMaxCoordinateV1,
    regionsEditMaxCoordinateV1 - region.height,
  );
  const deltaX = nextX - region.x;
  const deltaY = nextY - region.y;
  region.x = nextX;
  region.y = nextY;
  if (region.polygonPoints !== undefined) {
    for (const point of region.polygonPoints) {
      point.x += deltaX;
      point.y += deltaY;
    }
  }
}

/**
 * Resizes from the box origin; polygon vertices scale proportionally and
 * re-clamp inside the new box (rounding can degenerate a sliver polygon —
 * the draft gate reports it and undo is one step away).
 */
export function resizeRegionV1(
  plain: RegionsPlainDocumentV1,
  index: number,
  width: number,
  height: number,
): void {
  const region = plain.regions[index];
  if (region === undefined) return;
  const nextWidth = clampIntV1(width, 1, regionsEditMaxCoordinateV1 - Math.max(0, region.x));
  const nextHeight = clampIntV1(height, 1, regionsEditMaxCoordinateV1 - Math.max(0, region.y));
  if (region.polygonPoints !== undefined) {
    const scaleX = nextWidth / region.width;
    const scaleY = nextHeight / region.height;
    for (const point of region.polygonPoints) {
      point.x = clampIntV1(
        region.x + (point.x - region.x) * scaleX,
        region.x,
        region.x + nextWidth,
      );
      point.y = clampIntV1(
        region.y + (point.y - region.y) * scaleY,
        region.y,
        region.y + nextHeight,
      );
    }
  }
  region.width = nextWidth;
  region.height = nextHeight;
}

/** Rectangle → polygon: seed a diamond at the box edge midpoints. */
export function seedPolygonV1(plain: RegionsPlainDocumentV1, index: number): void {
  const region = plain.regions[index];
  if (region === undefined || region.polygonPoints !== undefined) return;
  const midX = region.x + Math.round(region.width / 2);
  const midY = region.y + Math.round(region.height / 2);
  region.polygonPoints = [
    { x: midX, y: region.y },
    { x: region.x + region.width, y: midY },
    { x: midX, y: region.y + region.height },
    { x: region.x, y: midY },
  ];
}

/** Polygon → rectangle: the hit shape falls back to the bounding box. */
export function clearPolygonV1(plain: RegionsPlainDocumentV1, index: number): void {
  const region = plain.regions[index];
  if (region === undefined) return;
  delete region.polygonPoints;
}

/** Moves one vertex, clamped inside the region's bounding box. */
export function moveVertexV1(
  plain: RegionsPlainDocumentV1,
  index: number,
  vertexIndex: number,
  x: number,
  y: number,
): void {
  const region = plain.regions[index];
  const point = region?.polygonPoints?.[vertexIndex];
  if (region === undefined || point === undefined) return;
  point.x = clampIntV1(x, region.x, region.x + region.width);
  point.y = clampIntV1(y, region.y, region.y + region.height);
}

/** Splits the edge after `vertexIndex` at its midpoint (64-vertex budget). */
export function insertVertexV1(
  plain: RegionsPlainDocumentV1,
  index: number,
  vertexIndex: number,
): void {
  const region = plain.regions[index];
  const points = region?.polygonPoints;
  const from = points?.[vertexIndex];
  if (points === undefined || from === undefined || points.length >= regionsEditMaxVerticesV1) {
    return;
  }
  const to = points[(vertexIndex + 1) % points.length];
  if (to === undefined) return;
  points.splice(vertexIndex + 1, 0, {
    x: Math.round((from.x + to.x) / 2),
    y: Math.round((from.y + to.y) / 2),
  });
}

/** Removes one vertex; a triangle is the floor (admission requires ≥ 3). */
export function removeVertexV1(
  plain: RegionsPlainDocumentV1,
  index: number,
  vertexIndex: number,
): void {
  const points = plain.regions[index]?.polygonPoints;
  if (points === undefined || points.length <= 3) return;
  points.splice(vertexIndex, 1);
}
