// SPDX-License-Identifier: MIT
import { digestCanonical } from "./digest.js";
import type { Brand, Digest } from "./values.js";
import { dataFailure, deepFreezeData, readArray, readExactRecord } from "./presentation-data.js";

/**
 * Semantic Stage V2: the plain, versioned, validated stage target that lives
 * inside Story authoritative State and Saves. It holds semantic content
 * identity, layering, placement, appearance, and camera targets — never
 * renderer IDs/props, asset URLs, accessibility presentation, React/DOM
 * handles, clocks, or functions. Renderer-facing data belongs to the
 * non-authoritative StageRenderTarget projection.
 */

export type StageIdV2 = Brand<string, "StageIdV2">;
export type StageLayerIdV2 = Brand<string, "StageLayerIdV2">;
export type StageTagV2 = Brand<string, "StageTagV2">;
export type StageContentIdV2 = Brand<string, "StageContentIdV2">;

export const semanticStageContractRevisionV2 = 2;

const stageStableIdPatternV2 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const appearanceKeyPatternV2 = /^[a-z][a-z0-9_]*$/u;
const appearanceValuePatternV2 = /^[a-z0-9][a-z0-9_.-]*$/u;

function parseStageStableIdV2(value: unknown, label: string, path: string): string {
  if (
    typeof value !== "string" ||
    !stageStableIdPatternV2.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, `${label}_invalid`);
  }
  return value;
}

export function parseStageIdV2(value: unknown, path = "/stageId"): StageIdV2 {
  return parseStageStableIdV2(value, "stage_id", path) as StageIdV2;
}

export function parseStageLayerIdV2(value: unknown, path = "/layerId"): StageLayerIdV2 {
  return parseStageStableIdV2(value, "stage_layer_id", path) as StageLayerIdV2;
}

export function parseStageTagV2(value: unknown, path = "/tag"): StageTagV2 {
  return parseStageStableIdV2(value, "stage_tag", path) as StageTagV2;
}

export function parseStageContentIdV2(value: unknown, path = "/contentId"): StageContentIdV2 {
  return parseStageStableIdV2(value, "stage_content_id", path) as StageContentIdV2;
}

/**
 * Logical-canvas placement of one stage entry. Coordinates are integer
 * logical-canvas units and scale is expressed in permille (1000 = 1x), so
 * authoritative stage data stays canonical-JSON safe (integers only).
 */
export interface StagePlacementV2 {
  readonly x: number;
  readonly y: number;
  readonly scalePermille: number;
  readonly mirrored: boolean;
}

/** Story-defined appearance selector keys (for example pose or expression). */
export type StageAppearanceV2 = Readonly<Record<string, string>>;

export interface StageEntryV2 {
  readonly tag: StageTagV2;
  readonly contentId: StageContentIdV2;
  readonly zOrder: number;
  readonly placement: StagePlacementV2;
  readonly appearance: StageAppearanceV2;
}

export interface StageLayerTransformV2 {
  readonly x: number;
  readonly y: number;
  readonly scalePermille: number;
  readonly visible: boolean;
}

export interface StageLayerV2 {
  readonly layerId: StageLayerIdV2;
  readonly transform: StageLayerTransformV2;
  readonly entries: readonly StageEntryV2[];
}

export interface StageCameraV2 {
  readonly x: number;
  readonly y: number;
  readonly zoomPermille: number;
}

export interface SemanticStageStateV2 {
  readonly contractRevision: typeof semanticStageContractRevisionV2;
  readonly stageId: StageIdV2;
  readonly layers: readonly StageLayerV2[];
  readonly camera: StageCameraV2;
}

export const defaultStagePlacementV2: StagePlacementV2 = Object.freeze({
  x: 0,
  y: 0,
  scalePermille: 1000,
  mirrored: false,
});

export const defaultStageLayerTransformV2: StageLayerTransformV2 = Object.freeze({
  x: 0,
  y: 0,
  scalePermille: 1000,
  visible: true,
});

export const defaultStageCameraV2: StageCameraV2 = Object.freeze({
  x: 0,
  y: 0,
  zoomPermille: 1000,
});

const stageCoordinateLimitV2 = 1_000_000;
const stagePermilleLimitV2 = 100_000;

function parseStageCoordinateV2(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Math.abs(value) > stageCoordinateLimitV2
  ) {
    return dataFailure(path, "stage_coordinate_invalid");
  }
  return value;
}

function parseStagePermilleV2(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > stagePermilleLimitV2
  ) {
    return dataFailure(path, "stage_permille_invalid");
  }
  return value;
}

function parseBooleanV2(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return dataFailure(path, "boolean_expected");
  return value;
}

function parseZOrderV2(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) {
    return dataFailure(path, "z_order_invalid");
  }
  return value;
}

export function parseStagePlacementV2(value: unknown, path = "/placement"): StagePlacementV2 {
  const record = readExactRecord(value, ["x", "y", "scalePermille", "mirrored"], path);
  return Object.freeze({
    x: parseStageCoordinateV2(record.x, `${path}/x`),
    y: parseStageCoordinateV2(record.y, `${path}/y`),
    scalePermille: parseStagePermilleV2(record.scalePermille, `${path}/scalePermille`),
    mirrored: parseBooleanV2(record.mirrored, `${path}/mirrored`),
  });
}

export function parseStageAppearanceV2(value: unknown, path = "/appearance"): StageAppearanceV2 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "object_expected");
  }
  const result: Record<string, string> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return dataFailure(path, "symbol_key");
    if (!appearanceKeyPatternV2.test(key) || key.length > 64) {
      return dataFailure(`${path}/${key}`, "appearance_key_invalid");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${key}`, "data_property_expected");
    }
    const entryValue: unknown = descriptor.value;
    if (
      typeof entryValue !== "string" ||
      !appearanceValuePatternV2.test(entryValue) ||
      entryValue.length > 64
    ) {
      return dataFailure(`${path}/${key}`, "appearance_value_invalid");
    }
    result[key] = entryValue;
  }
  return Object.freeze(result);
}

export function parseStageLayerTransformV2(
  value: unknown,
  path = "/transform",
): StageLayerTransformV2 {
  const record = readExactRecord(value, ["x", "y", "scalePermille", "visible"], path);
  return Object.freeze({
    x: parseStageCoordinateV2(record.x, `${path}/x`),
    y: parseStageCoordinateV2(record.y, `${path}/y`),
    scalePermille: parseStagePermilleV2(record.scalePermille, `${path}/scalePermille`),
    visible: parseBooleanV2(record.visible, `${path}/visible`),
  });
}

export function parseStageCameraV2(value: unknown, path = "/camera"): StageCameraV2 {
  const record = readExactRecord(value, ["x", "y", "zoomPermille"], path);
  return Object.freeze({
    x: parseStageCoordinateV2(record.x, `${path}/x`),
    y: parseStageCoordinateV2(record.y, `${path}/y`),
    zoomPermille: parseStagePermilleV2(record.zoomPermille, `${path}/zoomPermille`),
  });
}

function parseStageEntryV2(value: unknown, path: string): StageEntryV2 {
  const record = readExactRecord(
    value,
    ["tag", "contentId", "zOrder", "placement", "appearance"],
    path,
  );
  return Object.freeze({
    tag: parseStageTagV2(record.tag, `${path}/tag`),
    contentId: parseStageContentIdV2(record.contentId, `${path}/contentId`),
    zOrder: parseZOrderV2(record.zOrder, `${path}/zOrder`),
    placement: parseStagePlacementV2(record.placement, `${path}/placement`),
    appearance: parseStageAppearanceV2(record.appearance, `${path}/appearance`),
  });
}

function parseStageLayerV2(value: unknown, path: string): StageLayerV2 {
  const record = readExactRecord(value, ["layerId", "transform", "entries"], path);
  const entriesValue = readArray(record.entries, `${path}/entries`);
  const entries: StageEntryV2[] = [];
  const seenTags = new Set<string>();
  let previousZOrder = Number.NEGATIVE_INFINITY;
  for (const [index, entryValue] of entriesValue.entries()) {
    const entry = parseStageEntryV2(entryValue, `${path}/entries/${String(index)}`);
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
  return Object.freeze({
    layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
    transform: parseStageLayerTransformV2(record.transform, `${path}/transform`),
    entries: Object.freeze(entries),
  });
}

/**
 * Parses a full semantic stage state from plain data, enforcing the
 * canonical form: exact keys, unique layer IDs, unique tags per layer, and
 * entries ordered by non-decreasing z-order. The result is deep-frozen.
 */
export function parseSemanticStageStateV2(value: unknown, path = ""): SemanticStageStateV2 {
  const record = readExactRecord(
    value,
    ["contractRevision", "stageId", "layers", "camera"],
    path === "" ? "/" : path,
  );
  if (record.contractRevision !== semanticStageContractRevisionV2) {
    return dataFailure(`${path}/contractRevision`, "stage_contract_revision_invalid");
  }
  const layersValue = readArray(record.layers, `${path}/layers`);
  const layers: StageLayerV2[] = [];
  const seenLayerIds = new Set<string>();
  for (const [index, layerValue] of layersValue.entries()) {
    const layer = parseStageLayerV2(layerValue, `${path}/layers/${String(index)}`);
    if (seenLayerIds.has(layer.layerId as string)) {
      return dataFailure(`${path}/layers/${String(index)}/layerId`, "stage_layer_duplicate");
    }
    seenLayerIds.add(layer.layerId as string);
    layers.push(layer);
  }
  return deepFreezeData({
    contractRevision: semanticStageContractRevisionV2,
    stageId: parseStageIdV2(record.stageId, `${path}/stageId`),
    layers: Object.freeze(layers),
    camera: parseStageCameraV2(record.camera, `${path}/camera`),
  });
}

export interface CreateSemanticStageStateInputV2 {
  readonly stageId: string;
  readonly layerIds: readonly string[];
}

/** Creates an empty stage with the declared ordered layers. */
export function createSemanticStageStateV2(
  input: CreateSemanticStageStateInputV2,
): SemanticStageStateV2 {
  if (input.layerIds.length === 0) {
    return dataFailure("/layerIds", "stage_layers_required");
  }
  return parseSemanticStageStateV2({
    contractRevision: semanticStageContractRevisionV2,
    stageId: input.stageId,
    layers: input.layerIds.map((layerId) => ({
      layerId,
      transform: { ...defaultStageLayerTransformV2 },
      entries: [],
    })),
    camera: { ...defaultStageCameraV2 },
  });
}

/** Canonical digest of a stage state; stable across JSON round-trips. */
export function digestSemanticStageStateV2(state: SemanticStageStateV2): Digest {
  return digestCanonical("sillymaker:state:v1", state);
}
