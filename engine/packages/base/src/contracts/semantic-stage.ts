// SPDX-License-Identifier: MIT
import { digestCanonical } from "./digest.ts";
import type { Brand, Digest } from "./values.ts";
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";

/**
 * Semantic Stage V1: the plain, versioned, validated stage target that lives
 * inside Story authoritative State and Saves. It holds semantic content
 * identity, layering, placement, appearance, and camera targets — never
 * renderer IDs/props, asset URLs, accessibility presentation, React/DOM
 * handles, clocks, or functions. Renderer-facing data belongs to the
 * non-authoritative StageRenderTarget projection.
 */

export type StageIdV1 = Brand<string, "StageIdV1">;
export type StageLayerIdV1 = Brand<string, "StageLayerIdV1">;
export type StageTagV1 = Brand<string, "StageTagV1">;
export type StageContentIdV1 = Brand<string, "StageContentIdV1">;

export const semanticStageContractRevisionV1 = 3;

const stageStableIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const appearanceKeyPatternV1 = /^[a-z][a-z0-9_]*$/u;
const appearanceValuePatternV1 = /^[a-z0-9][a-z0-9_.-]*$/u;

function parseStageStableIdV1(value: unknown, label: string, path: string): string {
  if (
    typeof value !== "string" ||
    !stageStableIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, `${label}_invalid`);
  }
  return value;
}

export function parseStageIdV1(value: unknown, path = "/stageId"): StageIdV1 {
  return parseStageStableIdV1(value, "stage_id", path) as StageIdV1;
}

export function parseStageLayerIdV1(value: unknown, path = "/layerId"): StageLayerIdV1 {
  return parseStageStableIdV1(value, "stage_layer_id", path) as StageLayerIdV1;
}

export function parseStageTagV1(value: unknown, path = "/tag"): StageTagV1 {
  return parseStageStableIdV1(value, "stage_tag", path) as StageTagV1;
}

export function parseStageContentIdV1(value: unknown, path = "/contentId"): StageContentIdV1 {
  return parseStageStableIdV1(value, "stage_content_id", path) as StageContentIdV1;
}

/**
 * Logical-canvas placement of one stage entry. Coordinates are integer
 * logical-canvas units and scale is expressed in permille (1000 = 1x), so
 * authoritative stage data stays canonical-JSON safe (integers only).
 */
export interface StagePlacementV1 {
  readonly x: number;
  readonly y: number;
  readonly scalePermille: number;
  /**
   * Settled opacity in permille (0 = invisible, 1000 = opaque). This is the
   * authoritative target — transitions and timeline overlays multiply on top
   * as presentation and never enter Saves.
   */
  readonly opacityPermille: number;
  readonly mirrored: boolean;
}

/** Story-defined appearance selector keys (for example pose or expression). */
export type StageAppearanceV1 = Readonly<Record<string, string>>;

export interface StageEntryV1 {
  readonly tag: StageTagV1;
  readonly contentId: StageContentIdV1;
  readonly zOrder: number;
  readonly placement: StagePlacementV1;
  readonly appearance: StageAppearanceV1;
}

export interface StageLayerTransformV1 {
  readonly x: number;
  readonly y: number;
  readonly scalePermille: number;
  readonly visible: boolean;
}

export interface StageLayerV1 {
  readonly layerId: StageLayerIdV1;
  readonly transform: StageLayerTransformV1;
  readonly entries: readonly StageEntryV1[];
}

export interface StageCameraV1 {
  readonly x: number;
  readonly y: number;
  readonly zoomPermille: number;
}

export interface SemanticStageStateV1 {
  readonly contractRevision: typeof semanticStageContractRevisionV1;
  readonly stageId: StageIdV1;
  readonly layers: readonly StageLayerV1[];
  readonly camera: StageCameraV1;
}

export const defaultStagePlacementV1: StagePlacementV1 = {
  x: 0,
  y: 0,
  scalePermille: 1000,
  opacityPermille: 1000,
  mirrored: false,
};

export const defaultStageLayerTransformV1: StageLayerTransformV1 = {
  x: 0,
  y: 0,
  scalePermille: 1000,
  visible: true,
};

export const defaultStageCameraV1: StageCameraV1 = {
  x: 0,
  y: 0,
  zoomPermille: 1000,
};

const stageCoordinateLimitV1 = 1_000_000;
const stagePermilleLimitV1 = 100_000;
const stageOpacityPermilleLimitV1 = 1000;

function parseStageCoordinateV1(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Math.abs(value) > stageCoordinateLimitV1
  ) {
    return dataFailure(path, "stage_coordinate_invalid");
  }
  return value;
}

function parseStagePermilleV1(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > stagePermilleLimitV1
  ) {
    return dataFailure(path, "stage_permille_invalid");
  }
  return value;
}

function parseStageOpacityPermilleV1(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > stageOpacityPermilleLimitV1
  ) {
    return dataFailure(path, "stage_opacity_permille_invalid");
  }
  return value;
}

function parseBooleanV1(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return dataFailure(path, "boolean_expected");
  return value;
}

function parseZOrderV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) {
    return dataFailure(path, "z_order_invalid");
  }
  return value;
}

export function parseStagePlacementV1(value: unknown, path = "/placement"): StagePlacementV1 {
  const record = readExactRecord(
    value,
    ["x", "y", "scalePermille", "opacityPermille", "mirrored"],
    path,
  );
  return {
    x: parseStageCoordinateV1(record.x, `${path}/x`),
    y: parseStageCoordinateV1(record.y, `${path}/y`),
    scalePermille: parseStagePermilleV1(record.scalePermille, `${path}/scalePermille`),
    opacityPermille: parseStageOpacityPermilleV1(record.opacityPermille, `${path}/opacityPermille`),
    mirrored: parseBooleanV1(record.mirrored, `${path}/mirrored`),
  };
}

export function parseStageAppearanceV1(value: unknown, path = "/appearance"): StageAppearanceV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "object_expected");
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of Object.keys(record)) {
    if (!appearanceKeyPatternV1.test(key) || key.length > 64) {
      return dataFailure(`${path}/${key}`, "appearance_key_invalid");
    }
    const entryValue = record[key];
    if (
      typeof entryValue !== "string" ||
      !appearanceValuePatternV1.test(entryValue) ||
      entryValue.length > 64
    ) {
      return dataFailure(`${path}/${key}`, "appearance_value_invalid");
    }
    result[key] = entryValue;
  }
  return result;
}

export function parseStageLayerTransformV1(
  value: unknown,
  path = "/transform",
): StageLayerTransformV1 {
  const record = readExactRecord(value, ["x", "y", "scalePermille", "visible"], path);
  return {
    x: parseStageCoordinateV1(record.x, `${path}/x`),
    y: parseStageCoordinateV1(record.y, `${path}/y`),
    scalePermille: parseStagePermilleV1(record.scalePermille, `${path}/scalePermille`),
    visible: parseBooleanV1(record.visible, `${path}/visible`),
  };
}

export function parseStageCameraV1(value: unknown, path = "/camera"): StageCameraV1 {
  const record = readExactRecord(value, ["x", "y", "zoomPermille"], path);
  return {
    x: parseStageCoordinateV1(record.x, `${path}/x`),
    y: parseStageCoordinateV1(record.y, `${path}/y`),
    zoomPermille: parseStagePermilleV1(record.zoomPermille, `${path}/zoomPermille`),
  };
}

function parseStageEntryV1(value: unknown, path: string): StageEntryV1 {
  const record = readExactRecord(
    value,
    ["tag", "contentId", "zOrder", "placement", "appearance"],
    path,
  );
  return {
    tag: parseStageTagV1(record.tag, `${path}/tag`),
    contentId: parseStageContentIdV1(record.contentId, `${path}/contentId`),
    zOrder: parseZOrderV1(record.zOrder, `${path}/zOrder`),
    placement: parseStagePlacementV1(record.placement, `${path}/placement`),
    appearance: parseStageAppearanceV1(record.appearance, `${path}/appearance`),
  };
}

function parseStageLayerV1(value: unknown, path: string): StageLayerV1 {
  const record = readExactRecord(value, ["layerId", "transform", "entries"], path);
  const entriesValue = readArray(record.entries, `${path}/entries`);
  const entries: StageEntryV1[] = [];
  const seenTags = new Set<string>();
  let previousZOrder = Number.NEGATIVE_INFINITY;
  for (const [index, entryValue] of entriesValue.entries()) {
    const entry = parseStageEntryV1(entryValue, `${path}/entries/${String(index)}`);
    if (seenTags.has(entry.tag as string)) {
      return dataFailure(`${path}/entries/${String(index)}/tag`, "stage_tag_duplicate");
    }
    seenTags.add(entry.tag as string);
    if (entry.zOrder < previousZOrder) {
      return dataFailure(`${path}/entries/${String(index)}/zOrder`, "z_order_not_canonical");
    }
    previousZOrder = entry.zOrder;
    entries.push(entry);
  }
  return {
    layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
    transform: parseStageLayerTransformV1(record.transform, `${path}/transform`),
    entries,
  };
}

/**
 * Parses a full semantic stage state from plain data, enforcing the
 * canonical form: exact keys, unique layer IDs, unique tags per layer, and
 * entries ordered by non-decreasing z-order. The result is detached plain data.
 */
export function parseSemanticStageStateV1(value: unknown, path = ""): SemanticStageStateV1 {
  const record = readExactRecord(
    value,
    ["contractRevision", "stageId", "layers", "camera"],
    path === "" ? "/" : path,
  );
  if (record.contractRevision !== semanticStageContractRevisionV1) {
    return dataFailure(`${path}/contractRevision`, "stage_contract_revision_invalid");
  }
  const layersValue = readArray(record.layers, `${path}/layers`);
  const layers: StageLayerV1[] = [];
  const seenLayerIds = new Set<string>();
  for (const [index, layerValue] of layersValue.entries()) {
    const layer = parseStageLayerV1(layerValue, `${path}/layers/${String(index)}`);
    if (seenLayerIds.has(layer.layerId as string)) {
      return dataFailure(`${path}/layers/${String(index)}/layerId`, "stage_layer_duplicate");
    }
    seenLayerIds.add(layer.layerId as string);
    layers.push(layer);
  }
  return {
    contractRevision: semanticStageContractRevisionV1,
    stageId: parseStageIdV1(record.stageId, `${path}/stageId`),
    layers,
    camera: parseStageCameraV1(record.camera, `${path}/camera`),
  };
}

export interface CreateSemanticStageStateInputV1 {
  readonly stageId: string;
  readonly layerIds: readonly string[];
}

/** Creates an empty stage with the declared ordered layers. */
export function createSemanticStageStateV1(
  input: CreateSemanticStageStateInputV1,
): SemanticStageStateV1 {
  if (input.layerIds.length === 0) {
    return dataFailure("/layerIds", "stage_layers_required");
  }
  return parseSemanticStageStateV1({
    contractRevision: semanticStageContractRevisionV1,
    stageId: input.stageId,
    layers: input.layerIds.map((layerId) => ({
      layerId,
      transform: { ...defaultStageLayerTransformV1 },
      entries: [],
    })),
    camera: { ...defaultStageCameraV1 },
  });
}

/** Canonical digest of a stage state; stable across JSON round-trips. */
export function digestSemanticStageStateV1(state: SemanticStageStateV1): Digest {
  return digestCanonical("sillymaker:state:v1", state);
}
