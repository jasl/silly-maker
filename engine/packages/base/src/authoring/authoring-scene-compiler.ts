// SPDX-License-Identifier: MIT
import type { AuthoringSceneRuntimePlanV1, SceneDocumentV1 } from "../contracts/scene.ts";
import { dataFailure } from "../contracts/presentation-data.ts";
import type {
  StageAppearanceV1,
  StageLayerIdV1,
  StagePlacementV1,
  StageTagV1,
} from "../contracts/semantic-stage.ts";
import { defaultStagePlacementV1, parseStagePlacementV1 } from "../contracts/semantic-stage.ts";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneAmbientV1,
  AuthoringSceneBindingsV1,
  AuthoringSceneDocumentV1,
  AuthoringSceneObjectV1,
  AuthoringSceneSourceMapV1,
} from "./authoring-scene.ts";

export interface AuthoringSceneRuntimeTargetV1 {
  readonly kind: "entry";
  readonly layerId: StageLayerIdV1;
  readonly tag: StageTagV1;
}

export interface AuthoringSceneObjectTargetV1 {
  readonly objectId: StageTagV1;
  readonly target: AuthoringSceneRuntimeTargetV1;
}

export type AuthoringSceneBindingStatusV1 = "external" | "unresolved" | "resolved";

export interface AuthoringSceneBindingReferenceV1 {
  readonly objectId: StageTagV1;
  readonly id: string;
  readonly status: AuthoringSceneBindingStatusV1;
}

export interface AuthoringSceneInteractionReferenceV1 {
  readonly objectId: StageTagV1;
  readonly regionId: string;
  readonly intentId: string;
  readonly status: AuthoringSceneBindingStatusV1;
}

export interface AuthoringSceneGuiControlReferenceV1 {
  readonly objectId: StageTagV1;
  readonly controlId: string;
  readonly intentId: string;
  readonly status: "external";
}

export interface AuthoringSceneBindingIndexV1 {
  readonly hitRegions: readonly AuthoringSceneBindingReferenceV1[];
  readonly motions: readonly AuthoringSceneBindingReferenceV1[];
  readonly timelines: readonly AuthoringSceneBindingReferenceV1[];
  readonly interactions: readonly AuthoringSceneInteractionReferenceV1[];
  readonly guiControls: readonly AuthoringSceneGuiControlReferenceV1[];
}

export interface AuthoringSceneInspectionVisualV1 {
  readonly contentId: string;
  readonly appearance: StageAppearanceV1;
  readonly zOrder: number;
  readonly transparent: boolean;
  /** Geometry is catalog-owned, so only the authored anchor can be classified here. */
  readonly anchorOutsideCanvas: boolean;
  readonly ambient: AuthoringSceneAmbientV1 | null;
}

export interface AuthoringSceneInspectionCueV1 {
  readonly cueId: string;
  readonly kind: "show" | "hide";
  readonly jsonPointer: string;
  readonly motionId: string | null;
  readonly cut: boolean;
}

export interface AuthoringSceneInspectionObjectV1 {
  readonly objectId: StageTagV1;
  readonly label: string;
  readonly layerId: StageLayerIdV1;
  readonly parentObjectId: StageTagV1 | null;
  readonly depth: number;
  readonly jsonPointer: string;
  readonly localTransform: StagePlacementV1;
  readonly worldTransform: StagePlacementV1;
  readonly runtimeTarget: AuthoringSceneRuntimeTargetV1 | null;
  readonly visual: AuthoringSceneInspectionVisualV1 | null;
  readonly bindings: AuthoringSceneBindingsV1 | null;
  readonly cues: readonly AuthoringSceneInspectionCueV1[];
}

export interface AuthoringSceneInspectionLayerV1 {
  readonly layerId: StageLayerIdV1;
  readonly label: string;
  readonly jsonPointer: string;
  readonly objectIds: readonly StageTagV1[];
}

export interface AuthoringSceneInspectionV1 {
  readonly sceneId: string;
  readonly canvas: AuthoringSceneDocumentV1["canvas"];
  readonly layers: readonly AuthoringSceneInspectionLayerV1[];
  readonly objects: readonly AuthoringSceneInspectionObjectV1[];
}

export interface CompiledAuthoringSceneSourceObjectV1 {
  readonly objectId: StageTagV1;
  readonly layerId: StageLayerIdV1;
  readonly jsonPointer: string;
  readonly runtimeTarget: AuthoringSceneRuntimeTargetV1 | null;
}

export interface CompiledAuthoringSceneSourceMapV1
  extends Omit<AuthoringSceneSourceMapV1, "objects"> {
  readonly objects: readonly CompiledAuthoringSceneSourceObjectV1[];
}

export interface CompiledAuthoringSceneV1 {
  /** The only compiler projection ordinary Player code needs. */
  readonly runtimePlan: AuthoringSceneRuntimePlanV1;
  readonly objectTargets: readonly AuthoringSceneObjectTargetV1[];
  readonly bindings: AuthoringSceneBindingIndexV1;
  readonly inspection: AuthoringSceneInspectionV1;
  readonly sourceMap: CompiledAuthoringSceneSourceMapV1;
}

function roundPermilleProductV1(value: number, permille: number): number {
  const product = value * permille;
  const magnitude = Math.floor((Math.abs(product) + 500) / 1_000);
  if (magnitude === 0) return 0;
  return product < 0 ? -magnitude : magnitude;
}

function composeTransformV1(
  parent: StagePlacementV1,
  local: StagePlacementV1,
  sourcePointer: string,
): StagePlacementV1 {
  const localX = parent.mirrored ? -local.x : local.x;
  const candidate = {
    x: parent.x + roundPermilleProductV1(localX, parent.scalePermille),
    y: parent.y + roundPermilleProductV1(local.y, parent.scalePermille),
    scalePermille: roundPermilleProductV1(local.scalePermille, parent.scalePermille),
    opacityPermille: roundPermilleProductV1(
      local.opacityPermille,
      parent.opacityPermille,
    ),
    mirrored: parent.mirrored !== local.mirrored,
  };
  try {
    return parseStagePlacementV1(candidate, `${sourcePointer}/localTransform`);
  } catch {
    return dataFailure(
      `${sourcePointer}/localTransform`,
      "authoring_scene_world_transform_invalid",
    );
  }
}

function bindingReferenceV1(
  objectId: StageTagV1,
  id: string,
  status: AuthoringSceneBindingStatusV1,
): AuthoringSceneBindingReferenceV1 {
  return Object.freeze({ objectId, id, status });
}

interface MutableCompileStateV1 {
  readonly entries: SceneDocumentV1["entries"][number][];
  readonly targets: AuthoringSceneObjectTargetV1[];
  readonly inspection: AuthoringSceneInspectionObjectV1[];
  readonly sourceObjects: CompiledAuthoringSceneSourceObjectV1[];
  readonly hitRegions: AuthoringSceneBindingReferenceV1[];
  readonly motions: AuthoringSceneBindingReferenceV1[];
  readonly timelines: AuthoringSceneBindingReferenceV1[];
  readonly interactions: AuthoringSceneInteractionReferenceV1[];
  readonly guiControls: AuthoringSceneGuiControlReferenceV1[];
  readonly cueInspections: ReadonlyMap<string, readonly AuthoringSceneInspectionCueV1[]>;
  readonly motionKeys: Set<string>;
}

function pushMotionReferenceV1(
  state: MutableCompileStateV1,
  objectId: StageTagV1,
  motionId: string,
  status: AuthoringSceneBindingStatusV1,
): void {
  const key = `${objectId as string}\u0000${motionId}`;
  if (state.motionKeys.has(key)) return;
  state.motionKeys.add(key);
  state.motions.push(bindingReferenceV1(objectId, motionId, status));
}

function compileObjectV1(
  document: AuthoringSceneDocumentV1,
  object: AuthoringSceneObjectV1,
  layerId: StageLayerIdV1,
  parentObjectId: StageTagV1 | null,
  parentTransform: StagePlacementV1,
  depth: number,
  sourcePointer: string,
  zOrder: { value: number },
  layerObjectIds: StageTagV1[],
  state: MutableCompileStateV1,
): void {
  const worldTransform = composeTransformV1(parentTransform, object.localTransform, sourcePointer);
  const visual = object.visual;
  let runtimeTarget: AuthoringSceneRuntimeTargetV1 | null = null;
  let inspectionVisual: AuthoringSceneInspectionVisualV1 | null = null;

  layerObjectIds.push(object.objectId);
  if (visual !== undefined) {
    runtimeTarget = Object.freeze({
      kind: "entry" as const,
      layerId,
      tag: object.objectId,
    });
    const entryZOrder = zOrder.value;
    zOrder.value += 1;
    state.entries.push(Object.freeze({
      layerId,
      tag: object.objectId,
      contentId: visual.contentId,
      zOrder: entryZOrder,
      placement: worldTransform,
      appearance: visual.appearance,
      ...(visual.ambient === undefined ? {} : { ambient: visual.ambient }),
    }));
    state.targets.push(Object.freeze({ objectId: object.objectId, target: runtimeTarget }));
    inspectionVisual = Object.freeze({
      contentId: visual.contentId as string,
      appearance: visual.appearance,
      zOrder: entryZOrder,
      transparent: worldTransform.opacityPermille === 0,
      anchorOutsideCanvas: worldTransform.x < 0 || worldTransform.y < 0 ||
        worldTransform.x > document.canvas.width || worldTransform.y > document.canvas.height,
      ambient: visual.ambient ?? null,
    });
  }

  const bindings = object.bindings;
  if (bindings !== undefined) {
    const bindingStatus = runtimeTarget === null ? "unresolved" : "external";
    for (const regionId of bindings.hitRegionIds) {
      state.hitRegions.push(bindingReferenceV1(object.objectId, regionId, bindingStatus));
    }
    for (const motionId of bindings.motionIds) {
      pushMotionReferenceV1(state, object.objectId, motionId, bindingStatus);
    }
    for (const timelineId of bindings.timelineIds) {
      state.timelines.push(bindingReferenceV1(object.objectId, timelineId, bindingStatus));
    }
    for (const interaction of bindings.interactions) {
      state.interactions.push(Object.freeze({
        objectId: object.objectId,
        regionId: interaction.regionId,
        intentId: interaction.intentId,
        status: bindingStatus,
      }));
    }
    for (const control of bindings.guiControls) {
      state.guiControls.push(Object.freeze({
        objectId: object.objectId,
        controlId: control.controlId,
        intentId: control.intentId,
        status: "external" as const,
      }));
    }
  }
  if (visual?.ambient !== undefined) {
    pushMotionReferenceV1(state, object.objectId, visual.ambient.motionId, "external");
  }

  state.inspection.push(Object.freeze({
    objectId: object.objectId,
    label: object.label,
    layerId,
    parentObjectId,
    depth,
    jsonPointer: sourcePointer,
    localTransform: object.localTransform,
    worldTransform,
    runtimeTarget,
    visual: inspectionVisual,
    bindings: bindings ?? null,
    cues: state.cueInspections.get(object.objectId as string) ?? Object.freeze([]),
  }));
  state.sourceObjects.push(Object.freeze({
    objectId: object.objectId,
    layerId,
    jsonPointer: sourcePointer,
    runtimeTarget,
  }));

  for (const [index, child] of object.children.entries()) {
    compileObjectV1(
      document,
      child,
      layerId,
      object.objectId,
      worldTransform,
      depth + 1,
      `${sourcePointer}/children/${String(index)}`,
      zOrder,
      layerObjectIds,
      state,
    );
  }
}

/** Pure deterministic lowering from admitted authoring IR into existing runtime data. */
export function compileAuthoringSceneV1(
  admitted: AdmittedAuthoringSceneV1,
): CompiledAuthoringSceneV1 {
  const document = admitted.document;
  const mutableCueInspections = new Map<string, AuthoringSceneInspectionCueV1[]>();
  for (const [index, cue] of document.cues.entries()) {
    const current = mutableCueInspections.get(cue.objectId as string) ?? [];
    current.push(Object.freeze({
      cueId: cue.cueId,
      kind: cue.kind,
      jsonPointer: admitted.sourceMap.cues[index]!.jsonPointer,
      motionId: cue.motionId ?? null,
      cut: cue.cut === true,
    }));
    mutableCueInspections.set(cue.objectId as string, current);
  }
  const cueInspections = new Map(
    [...mutableCueInspections].map(([objectId, cues]) => [objectId, Object.freeze(cues)] as const),
  );
  const state: MutableCompileStateV1 = {
    entries: [],
    targets: [],
    inspection: [],
    sourceObjects: [],
    hitRegions: [],
    motions: [],
    timelines: [],
    interactions: [],
    guiControls: [],
    cueInspections,
    motionKeys: new Set(),
  };
  const inspectionLayers: AuthoringSceneInspectionLayerV1[] = [];

  for (const [layerIndex, layer] of document.layers.entries()) {
    const zOrder = { value: 0 };
    const objectIds: StageTagV1[] = [];
    const layerSource = admitted.sourceMap.layers[layerIndex]!;
    for (const [index, root] of layer.roots.entries()) {
      compileObjectV1(
        document,
        root,
        layer.layerId,
        null,
        defaultStagePlacementV1,
        0,
        `${layerSource.jsonPointer}/roots/${String(index)}`,
        zOrder,
        objectIds,
        state,
      );
    }
    inspectionLayers.push(Object.freeze({
      layerId: layer.layerId,
      label: layer.label,
      jsonPointer: layerSource.jsonPointer,
      objectIds: Object.freeze(objectIds),
    }));
  }
  for (const cue of document.cues) {
    if (cue.motionId !== undefined) {
      pushMotionReferenceV1(state, cue.objectId, cue.motionId, "external");
    }
  }

  const sceneDocument: SceneDocumentV1 = Object.freeze({
    format: "sillymaker.scene" as const,
    version: 1 as const,
    sceneId: document.sceneId,
    label: document.label,
    canvas: document.canvas,
    entries: Object.freeze(state.entries),
    cues: Object.freeze(document.cues.map((cue) =>
      Object.freeze({
        cueId: cue.cueId,
        kind: cue.kind,
        tag: cue.objectId,
        ...(cue.motionId === undefined ? {} : { motionId: cue.motionId }),
        ...(cue.cut === undefined ? {} : { cut: true as const }),
      })
    )),
  });

  return Object.freeze({
    runtimePlan: Object.freeze({
      sourceKind: "authoring_scene" as const,
      sceneDocument,
      orderedLayerIds: Object.freeze(document.layers.map((layer) => layer.layerId)),
    }),
    objectTargets: Object.freeze(state.targets),
    bindings: Object.freeze({
      hitRegions: Object.freeze(state.hitRegions),
      motions: Object.freeze(state.motions),
      timelines: Object.freeze(state.timelines),
      interactions: Object.freeze(state.interactions),
      guiControls: Object.freeze(state.guiControls),
    }),
    inspection: Object.freeze({
      sceneId: document.sceneId,
      canvas: document.canvas,
      layers: Object.freeze(inspectionLayers),
      objects: Object.freeze(state.inspection),
    }),
    sourceMap: Object.freeze({
      sceneJsonPointer: admitted.sourceMap.sceneJsonPointer,
      layers: admitted.sourceMap.layers,
      objects: Object.freeze(state.sourceObjects),
      cues: admitted.sourceMap.cues,
    }),
  });
}
