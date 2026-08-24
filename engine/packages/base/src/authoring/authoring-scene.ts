// SPDX-License-Identifier: MIT
import type {
  StageAppearanceV1,
  StageContentIdV1,
  StageLayerIdV1,
  StagePlacementV1,
  StageTagV1,
} from "../contracts/semantic-stage.ts";
import {
  defaultStagePlacementV1,
  parseStageContentIdV1,
  parseStageLayerIdV1,
  parseStageTagV1,
} from "../contracts/semantic-stage.ts";
import { dataFailure, pointerSegment } from "../contracts/presentation-data.ts";
import { sceneMaxCuesInternalV1, sceneMaxEntriesInternalV1 } from "../contracts/scene.ts";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "../contracts/strict-json.ts";

/**
 * First-step authoring hierarchy for GUI/game scenes. This is cold-path,
 * author-facing data: runtime State continues to use the flat Semantic Stage.
 */

export const authoringSceneDocumentFormatV1 = "sillymaker.authoring-scene";
export const authoringSceneDocumentVersionV1 = 1;

export interface AuthoringSceneCanvasV1 {
  readonly width: number;
  readonly height: number;
}

export type AuthoringSceneLocalTransformV1 = StagePlacementV1;

export interface AuthoringSceneAmbientV1 {
  readonly motionId: string;
  readonly phaseMs?: number;
}

export interface AuthoringSceneVisualV1 {
  readonly contentId: StageContentIdV1;
  readonly appearance: StageAppearanceV1;
  readonly ambient?: AuthoringSceneAmbientV1;
}

export interface AuthoringSceneInteractionBindingV1 {
  readonly regionId: string;
  readonly intentId: string;
}

/**
 * A GUI control remains owned by its external GUI implementation. Authoring
 * Scene only associates that stable control reference with an intent so an
 * Inspector can show it alongside this object; it does not turn the control
 * into a Stage hit region or runtime component.
 */
export interface AuthoringSceneGuiControlBindingV1 {
  readonly controlId: string;
  readonly intentId: string;
}

/** References only. Rules and their registries stay with their existing owners. */
export interface AuthoringSceneBindingsV1 {
  /**
   * Explicit region references for inspection and intent joins. Geometry and
   * within-entry paint/focus order remain owned by the content catalog and
   * Stage Host; this list does not create a second hit-order authority.
   */
  readonly hitRegionIds: readonly string[];
  readonly motionIds: readonly string[];
  readonly timelineIds: readonly string[];
  readonly interactions: readonly AuthoringSceneInteractionBindingV1[];
  readonly guiControls: readonly AuthoringSceneGuiControlBindingV1[];
}

export interface AuthoringSceneObjectV1 {
  /** The same stable bytes become the runtime Stage tag. */
  readonly objectId: StageTagV1;
  readonly label: string;
  readonly localTransform: AuthoringSceneLocalTransformV1;
  readonly children: readonly AuthoringSceneObjectV1[];
  readonly visual?: AuthoringSceneVisualV1;
  readonly bindings?: AuthoringSceneBindingsV1;
}

export interface AuthoringSceneLayerV1 {
  readonly layerId: StageLayerIdV1;
  readonly label: string;
  /** Array order is sibling paint authority. */
  readonly roots: readonly AuthoringSceneObjectV1[];
}

export type AuthoringSceneCueKindV1 = "show" | "hide";

export interface AuthoringSceneCueV1 {
  readonly cueId: string;
  readonly kind: AuthoringSceneCueKindV1;
  readonly objectId: StageTagV1;
  readonly motionId?: string;
  readonly cut?: true;
}

/** Normalized, frozen IR produced by the one source admission. */
export interface AuthoringSceneDocumentV1 {
  readonly format: typeof authoringSceneDocumentFormatV1;
  readonly version: typeof authoringSceneDocumentVersionV1;
  readonly sceneId: string;
  readonly label: string;
  readonly canvas: AuthoringSceneCanvasV1;
  readonly layers: readonly AuthoringSceneLayerV1[];
  readonly cues: readonly AuthoringSceneCueV1[];
}

export interface AuthoringSceneLayerSourceV1 {
  readonly layerId: StageLayerIdV1;
  readonly jsonPointer: string;
}

export interface AuthoringSceneObjectSourceV1 {
  readonly objectId: StageTagV1;
  readonly layerId: StageLayerIdV1;
  readonly jsonPointer: string;
}

export interface AuthoringSceneCueSourceV1 {
  readonly cueId: string;
  readonly objectId: StageTagV1;
  readonly jsonPointer: string;
}

/** JSON-pointer-only sidecar. A tooling caller may pair it with its source file. */
export interface AuthoringSceneSourceMapV1 {
  readonly sceneJsonPointer: "";
  readonly layers: readonly AuthoringSceneLayerSourceV1[];
  readonly objects: readonly AuthoringSceneObjectSourceV1[];
  readonly cues: readonly AuthoringSceneCueSourceV1[];
}

export interface AdmittedAuthoringSceneV1 {
  readonly document: AuthoringSceneDocumentV1;
  readonly sourceMap: AuthoringSceneSourceMapV1;
}

const authoringSceneMaxIdLengthV1 = 96;
const authoringSceneMaxLabelLengthV1 = 120;
const authoringSceneCanvasLimitV1 = 1_000_000;
const authoringSceneCoordinateLimitV1 = 1_000_000;
const authoringSceneScaleLimitV1 = 100_000;
const authoringSceneOpacityLimitV1 = 1_000;
const authoringSceneAmbientPhaseLimitMsV1 = 60_000;
const authoringSceneMaxLayersV1 = 256;
const authoringSceneMaxObjectsV1 = 100_000;
const authoringSceneMaxDepthV1 = 64;
const authoringSceneMaxBindingsPerKindV1 = 256;

const sceneIdPatternV1 = /^scene\.[a-z0-9_.-]+$/u;
const cueIdPatternV1 = /^cue\.[a-z0-9_.-]+$/u;
const motionIdPatternV1 = /^motion\.[a-z0-9_.-]+$/u;
const timelineIdPatternV1 = /^cue\.[a-z0-9_.-]+$/u;
const stableReferencePatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const appearanceKeyPatternV1 = /^[a-z][a-z0-9_]*$/u;
const appearanceValuePatternV1 = /^[a-z0-9][a-z0-9_.-]*$/u;

const authoringSceneSourceJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 67_108_864,
  maxDepth: 160,
  maxArrayItems: 100_000,
  // Schema records are much smaller, but Stage appearance is an admitted
  // author map. Keep the parser bound independent from today's record shape.
  maxObjectMembers: 128,
  maxNodes: 4_000_000,
  maxStringBytes: 4_096,
});

function exactRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "authoring_scene_object_expected");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record).toSorted();
  const expected = [...expectedKeys].toSorted();
  if (
    actualKeys.length !== expected.length ||
    actualKeys.some((key, index) => key !== expected[index])
  ) {
    return dataFailure(path, "authoring_scene_object_keys_invalid");
  }
  return record;
}

function arrayV1(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) return dataFailure(path, "authoring_scene_array_expected");
  return value;
}

function keysWithOptionalV1(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return required;
  return [...required, ...optional.filter((key) => Object.hasOwn(value, key))];
}

function boundedLabelV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > authoringSceneMaxLabelLengthV1
  ) {
    return dataFailure(path, "authoring_scene_label_invalid");
  }
  return value;
}

function prefixedIdV1(
  value: unknown,
  pattern: RegExp,
  path: string,
  reason: string,
): string {
  if (
    typeof value !== "string" ||
    value.length > authoringSceneMaxIdLengthV1 ||
    !pattern.test(value)
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

function boundedIntV1(
  value: unknown,
  min: number,
  max: number,
  path: string,
  reason: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    return dataFailure(path, reason);
  }
  return value;
}

function parseCanvasV1(value: unknown, path: string): AuthoringSceneCanvasV1 {
  const record = exactRecordV1(value, ["width", "height"], path);
  return Object.freeze({
    width: boundedIntV1(
      record.width,
      1,
      authoringSceneCanvasLimitV1,
      `${path}/width`,
      "authoring_scene_canvas_invalid",
    ),
    height: boundedIntV1(
      record.height,
      1,
      authoringSceneCanvasLimitV1,
      `${path}/height`,
      "authoring_scene_canvas_invalid",
    ),
  });
}

function parseLocalTransformV1(value: unknown, path: string): AuthoringSceneLocalTransformV1 {
  const record = exactRecordV1(
    value,
    ["x", "y", "scalePermille", "opacityPermille", "mirrored"],
    path,
  );
  if (typeof record.mirrored !== "boolean") {
    return dataFailure(`${path}/mirrored`, "authoring_scene_transform_mirrored_invalid");
  }
  return Object.freeze({
    x: boundedIntV1(
      record.x,
      -authoringSceneCoordinateLimitV1,
      authoringSceneCoordinateLimitV1,
      `${path}/x`,
      "authoring_scene_transform_coordinate_invalid",
    ),
    y: boundedIntV1(
      record.y,
      -authoringSceneCoordinateLimitV1,
      authoringSceneCoordinateLimitV1,
      `${path}/y`,
      "authoring_scene_transform_coordinate_invalid",
    ),
    scalePermille: boundedIntV1(
      record.scalePermille,
      1,
      authoringSceneScaleLimitV1,
      `${path}/scalePermille`,
      "authoring_scene_transform_scale_invalid",
    ),
    opacityPermille: boundedIntV1(
      record.opacityPermille,
      0,
      authoringSceneOpacityLimitV1,
      `${path}/opacityPermille`,
      "authoring_scene_transform_opacity_invalid",
    ),
    mirrored: record.mirrored,
  });
}

function parseAppearanceV1(value: unknown, path: string): StageAppearanceV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "authoring_scene_appearance_invalid");
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const memberPath = `${path}/${pointerSegment(key)}`;
    if (!appearanceKeyPatternV1.test(key) || key.length > 64) {
      return dataFailure(memberPath, "authoring_scene_appearance_key_invalid");
    }
    if (
      typeof entry !== "string" ||
      !appearanceValuePatternV1.test(entry) ||
      entry.length > 64
    ) {
      return dataFailure(memberPath, "authoring_scene_appearance_value_invalid");
    }
    result[key] = entry;
  }
  return Object.freeze(result);
}

function parseMotionIdV1(value: unknown, path: string): string {
  return prefixedIdV1(value, motionIdPatternV1, path, "authoring_scene_motion_id_invalid");
}

function parseAmbientV1(value: unknown, path: string): AuthoringSceneAmbientV1 {
  const keys = keysWithOptionalV1(value, ["motionId"], ["phaseMs"]);
  const record = exactRecordV1(value, keys, path);
  const phaseMs = Object.hasOwn(record, "phaseMs")
    ? boundedIntV1(
      record.phaseMs,
      0,
      authoringSceneAmbientPhaseLimitMsV1,
      `${path}/phaseMs`,
      "authoring_scene_ambient_phase_invalid",
    )
    : undefined;
  return Object.freeze({
    motionId: parseMotionIdV1(record.motionId, `${path}/motionId`),
    ...(phaseMs === undefined ? {} : { phaseMs }),
  });
}

function parseVisualV1(value: unknown, path: string): AuthoringSceneVisualV1 {
  const keys = keysWithOptionalV1(value, ["contentId"], ["appearance", "ambient"]);
  const record = exactRecordV1(value, keys, path);
  const appearance = Object.hasOwn(record, "appearance")
    ? parseAppearanceV1(record.appearance, `${path}/appearance`)
    : Object.freeze({});
  const ambient = Object.hasOwn(record, "ambient")
    ? parseAmbientV1(record.ambient, `${path}/ambient`)
    : undefined;
  return Object.freeze({
    contentId: parseStageContentIdV1(record.contentId, `${path}/contentId`),
    appearance,
    ...(ambient === undefined ? {} : { ambient }),
  });
}

function parseReferenceListV1(
  value: unknown,
  path: string,
  parse: (entry: unknown, path: string) => string,
): readonly string[] {
  const raw = arrayV1(value, path);
  if (raw.length > authoringSceneMaxBindingsPerKindV1) {
    return dataFailure(path, "authoring_scene_bindings_count_invalid");
  }
  const result: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.entries()) {
    const memberPath = `${path}/${String(index)}`;
    const parsed = parse(entry, memberPath);
    if (seen.has(parsed)) return dataFailure(memberPath, "authoring_scene_binding_duplicate");
    seen.add(parsed);
    result.push(parsed);
  }
  return Object.freeze(result);
}

function parseRegionIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > authoringSceneMaxIdLengthV1
  ) {
    return dataFailure(path, "authoring_scene_region_id_invalid");
  }
  return value;
}

function parseStableReferenceV1(value: unknown, path: string, reason: string): string {
  return prefixedIdV1(value, stableReferencePatternV1, path, reason);
}

function parseBindingsV1(value: unknown, path: string): AuthoringSceneBindingsV1 {
  const optionalKeys = [
    "hitRegionIds",
    "motionIds",
    "timelineIds",
    "interactions",
    "guiControls",
  ];
  const record = exactRecordV1(
    value,
    keysWithOptionalV1(value, [], optionalKeys),
    path,
  );
  const hitRegionIds = Object.hasOwn(record, "hitRegionIds")
    ? parseReferenceListV1(
      record.hitRegionIds,
      `${path}/hitRegionIds`,
      parseRegionIdV1,
    )
    : Object.freeze([]);
  const motionIds = Object.hasOwn(record, "motionIds")
    ? parseReferenceListV1(
      record.motionIds,
      `${path}/motionIds`,
      parseMotionIdV1,
    )
    : Object.freeze([]);
  const timelineIds = Object.hasOwn(record, "timelineIds")
    ? parseReferenceListV1(
      record.timelineIds,
      `${path}/timelineIds`,
      (entry, memberPath) =>
        prefixedIdV1(
          entry,
          timelineIdPatternV1,
          memberPath,
          "authoring_scene_timeline_id_invalid",
        ),
    )
    : Object.freeze([]);
  const rawInteractions = Object.hasOwn(record, "interactions")
    ? arrayV1(record.interactions, `${path}/interactions`)
    : [];
  if (rawInteractions.length > authoringSceneMaxBindingsPerKindV1) {
    return dataFailure(`${path}/interactions`, "authoring_scene_bindings_count_invalid");
  }
  const knownRegions = new Set(hitRegionIds);
  const interactionRegions = new Set<string>();
  const interactions = rawInteractions.map((entry, index) => {
    const interactionPath = `${path}/interactions/${String(index)}`;
    const interaction = exactRecordV1(entry, ["regionId", "intentId"], interactionPath);
    const regionId = parseRegionIdV1(interaction.regionId, `${interactionPath}/regionId`);
    if (!knownRegions.has(regionId)) {
      return dataFailure(
        `${interactionPath}/regionId`,
        "authoring_scene_interaction_region_unknown",
      );
    }
    if (interactionRegions.has(regionId)) {
      return dataFailure(`${interactionPath}/regionId`, "authoring_scene_interaction_duplicate");
    }
    interactionRegions.add(regionId);
    return Object.freeze({
      regionId,
      intentId: parseStableReferenceV1(
        interaction.intentId,
        `${interactionPath}/intentId`,
        "authoring_scene_intent_id_invalid",
      ),
    });
  });
  const rawGuiControls = Object.hasOwn(record, "guiControls")
    ? arrayV1(record.guiControls, `${path}/guiControls`)
    : [];
  if (rawGuiControls.length > authoringSceneMaxBindingsPerKindV1) {
    return dataFailure(`${path}/guiControls`, "authoring_scene_bindings_count_invalid");
  }
  const controlIds = new Set<string>();
  const guiControls = rawGuiControls.map((entry, index) => {
    const controlPath = `${path}/guiControls/${String(index)}`;
    const control = exactRecordV1(entry, ["controlId", "intentId"], controlPath);
    const controlId = parseStableReferenceV1(
      control.controlId,
      `${controlPath}/controlId`,
      "authoring_scene_control_id_invalid",
    );
    if (controlIds.has(controlId)) {
      return dataFailure(`${controlPath}/controlId`, "authoring_scene_gui_control_duplicate");
    }
    controlIds.add(controlId);
    return Object.freeze({
      controlId,
      intentId: parseStableReferenceV1(
        control.intentId,
        `${controlPath}/intentId`,
        "authoring_scene_intent_id_invalid",
      ),
    });
  });
  return Object.freeze({
    hitRegionIds,
    motionIds,
    timelineIds,
    interactions: Object.freeze(interactions),
    guiControls: Object.freeze(guiControls),
  });
}

interface AdmissionStateV1 {
  objectCount: number;
  visualCount: number;
  readonly active: Set<object>;
  readonly objectIds: Set<string>;
  readonly visualObjectIds: Set<string>;
  readonly layerSources: AuthoringSceneLayerSourceV1[];
  readonly objectSources: AuthoringSceneObjectSourceV1[];
}

function parseObjectV1(
  value: unknown,
  layerId: StageLayerIdV1,
  path: string,
  depth: number,
  state: AdmissionStateV1,
): AuthoringSceneObjectV1 {
  if (depth > authoringSceneMaxDepthV1) {
    return dataFailure(path, "authoring_scene_object_depth_invalid");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "authoring_scene_object_expected");
  }
  if (state.active.has(value)) return dataFailure(path, "authoring_scene_object_cycle");
  state.objectCount += 1;
  if (state.objectCount > authoringSceneMaxObjectsV1) {
    return dataFailure(path, "authoring_scene_object_count_invalid");
  }

  state.active.add(value);
  try {
    const keys = keysWithOptionalV1(
      value,
      ["objectId", "label"],
      ["localTransform", "children", "visual", "bindings"],
    );
    const record = exactRecordV1(value, keys, path);
    const objectId = parseStageTagV1(record.objectId, `${path}/objectId`);
    if (state.objectIds.has(objectId as string)) {
      return dataFailure(`${path}/objectId`, "authoring_scene_object_id_duplicate");
    }
    state.objectIds.add(objectId as string);
    state.objectSources.push(Object.freeze({ objectId, layerId, jsonPointer: path }));

    const visual = Object.hasOwn(record, "visual")
      ? parseVisualV1(record.visual, `${path}/visual`)
      : undefined;
    if (visual !== undefined) {
      state.visualCount += 1;
      if (state.visualCount > sceneMaxEntriesInternalV1) {
        return dataFailure(`${path}/visual`, "authoring_scene_visual_count_invalid");
      }
      state.visualObjectIds.add(objectId as string);
    }
    const bindings = Object.hasOwn(record, "bindings")
      ? parseBindingsV1(record.bindings, `${path}/bindings`)
      : undefined;
    const rawChildren = Object.hasOwn(record, "children")
      ? arrayV1(record.children, `${path}/children`)
      : [];
    const children = rawChildren.map((child, index) =>
      parseObjectV1(child, layerId, `${path}/children/${String(index)}`, depth + 1, state)
    );
    return Object.freeze({
      objectId,
      label: boundedLabelV1(record.label, `${path}/label`),
      localTransform: Object.hasOwn(record, "localTransform")
        ? parseLocalTransformV1(record.localTransform, `${path}/localTransform`)
        : defaultStagePlacementV1,
      children: Object.freeze(children),
      ...(visual === undefined ? {} : { visual }),
      ...(bindings === undefined ? {} : { bindings }),
    });
  } finally {
    state.active.delete(value);
  }
}

function parseLayerV1(
  value: unknown,
  path: string,
  state: AdmissionStateV1,
): AuthoringSceneLayerV1 {
  const record = exactRecordV1(value, ["layerId", "label", "roots"], path);
  const layerId = parseStageLayerIdV1(record.layerId, `${path}/layerId`);
  const rawRoots = arrayV1(record.roots, `${path}/roots`);
  state.layerSources.push(Object.freeze({ layerId, jsonPointer: path }));
  return Object.freeze({
    layerId,
    label: boundedLabelV1(record.label, `${path}/label`),
    roots: Object.freeze(
      rawRoots.map((root, index) =>
        parseObjectV1(root, layerId, `${path}/roots/${String(index)}`, 0, state)
      ),
    ),
  });
}

function parseCueV1(value: unknown, path: string): AuthoringSceneCueV1 {
  const keys = keysWithOptionalV1(value, ["cueId", "kind", "objectId"], ["motionId", "cut"]);
  const record = exactRecordV1(value, keys, path);
  if (record.kind !== "show" && record.kind !== "hide") {
    return dataFailure(`${path}/kind`, "authoring_scene_cue_kind_invalid");
  }
  const hasMotion = Object.hasOwn(record, "motionId");
  const hasCut = Object.hasOwn(record, "cut");
  if (hasCut && record.cut !== true) {
    return dataFailure(`${path}/cut`, "authoring_scene_cue_cut_invalid");
  }
  if (hasMotion && hasCut) {
    return dataFailure(`${path}/cut`, "authoring_scene_cue_presentation_conflict");
  }
  return Object.freeze({
    cueId: prefixedIdV1(
      record.cueId,
      cueIdPatternV1,
      `${path}/cueId`,
      "authoring_scene_cue_id_invalid",
    ),
    kind: record.kind,
    objectId: parseStageTagV1(record.objectId, `${path}/objectId`),
    ...(hasMotion ? { motionId: parseMotionIdV1(record.motionId, `${path}/motionId`) } : {}),
    ...(hasCut ? { cut: true as const } : {}),
  });
}

/**
 * Admits parsed JSON or a trusted author-created plain record once and returns
 * frozen normalized IR plus JSON-pointer provenance. It intentionally does not
 * authenticate JavaScript prototypes, descriptors, or accessors.
 */
export function admitAuthoringSceneDocumentV1(value: unknown): AdmittedAuthoringSceneV1 {
  const record = exactRecordV1(
    value,
    ["format", "version", "sceneId", "label", "canvas", "layers", "cues"],
    "",
  );
  if (record.format !== authoringSceneDocumentFormatV1) {
    return dataFailure("/format", "authoring_scene_format_invalid");
  }
  if (record.version !== authoringSceneDocumentVersionV1) {
    return dataFailure("/version", "authoring_scene_version_unsupported");
  }
  const sceneId = prefixedIdV1(
    record.sceneId,
    sceneIdPatternV1,
    "/sceneId",
    "authoring_scene_id_invalid",
  );
  const label = boundedLabelV1(record.label, "/label");
  const canvas = parseCanvasV1(record.canvas, "/canvas");

  const rawLayers = arrayV1(record.layers, "/layers");
  if (rawLayers.length === 0) {
    return dataFailure("/layers", "authoring_scene_layers_required");
  }
  if (rawLayers.length > authoringSceneMaxLayersV1) {
    return dataFailure("/layers", "authoring_scene_layer_count_invalid");
  }
  const state: AdmissionStateV1 = {
    objectCount: 0,
    visualCount: 0,
    active: new Set(),
    objectIds: new Set(),
    visualObjectIds: new Set(),
    layerSources: [],
    objectSources: [],
  };
  const layers = rawLayers.map((layer, index) =>
    parseLayerV1(layer, `/layers/${String(index)}`, state)
  );
  const seenLayerIds = new Set<string>();
  for (const [index, layer] of layers.entries()) {
    if (seenLayerIds.has(layer.layerId as string)) {
      return dataFailure(`/layers/${String(index)}/layerId`, "authoring_scene_layer_id_duplicate");
    }
    seenLayerIds.add(layer.layerId as string);
  }

  const rawCues = arrayV1(record.cues, "/cues");
  if (rawCues.length > sceneMaxCuesInternalV1) {
    return dataFailure("/cues", "authoring_scene_cue_count_invalid");
  }
  const cues: AuthoringSceneCueV1[] = [];
  const cueSources: AuthoringSceneCueSourceV1[] = [];
  const seenCueIds = new Set<string>();
  for (const [index, rawCue] of rawCues.entries()) {
    const path = `/cues/${String(index)}`;
    const cue = parseCueV1(rawCue, path);
    if (seenCueIds.has(cue.cueId)) {
      return dataFailure(`${path}/cueId`, "authoring_scene_cue_id_duplicate");
    }
    seenCueIds.add(cue.cueId);
    if (!state.objectIds.has(cue.objectId as string)) {
      return dataFailure(`${path}/objectId`, "authoring_scene_cue_object_unknown");
    }
    if (!state.visualObjectIds.has(cue.objectId as string)) {
      return dataFailure(`${path}/objectId`, "authoring_scene_cue_object_not_visual");
    }
    cues.push(cue);
    cueSources.push(Object.freeze({ cueId: cue.cueId, objectId: cue.objectId, jsonPointer: path }));
  }

  const document = Object.freeze({
    format: authoringSceneDocumentFormatV1,
    version: authoringSceneDocumentVersionV1,
    sceneId,
    label,
    canvas,
    layers: Object.freeze(layers),
    cues: Object.freeze(cues),
  });
  return Object.freeze({
    document,
    sourceMap: Object.freeze({
      sceneJsonPointer: "" as const,
      layers: Object.freeze(state.layerSources),
      objects: Object.freeze(state.objectSources),
      cues: Object.freeze(cueSources),
    }),
  });
}

/**
 * The file/bytes boundary for an Authoring Scene source. Strict JSON bounds
 * parsing work and rejects duplicate keys before the ordinary schema/value
 * admission above; the resulting normalized IR is then trusted by compilers.
 */
export function admitAuthoringSceneSourceBytesV1(
  bytes: Uint8Array,
): AdmittedAuthoringSceneV1 {
  const parsed = parseStrictJson(bytes, authoringSceneSourceJsonLimitsV1);
  if (!parsed.ok) {
    return dataFailure(parsed.error.path ?? "", "authoring_scene_json_invalid");
  }
  return admitAuthoringSceneDocumentV1(parsed.value);
}
