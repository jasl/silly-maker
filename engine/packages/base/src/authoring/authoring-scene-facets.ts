// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "../contracts/diagnostic-envelope.ts";
import type { MotionChannelV1, MotionDefinitionV1 } from "../contracts/motion.ts";
import { dataFailure, pointerSegment } from "../contracts/presentation-data.ts";
import { sceneFromAuthoringRuntimePlanV1 } from "../contracts/scene.ts";
import {
  createSemanticStageStateV1,
  type StageLayerIdV1,
  type StagePlacementV1,
  type StageTagV1,
} from "../contracts/semantic-stage.ts";
import { reduceAdmittedStageMutationsV1 } from "../contracts/semantic-stage-reducer.ts";
import type {
  StageContentCatalogV1,
  StageContentGeometryV1,
  StageHitRegionPointV1,
} from "../contracts/stage-render-target.ts";
import { projectStageRenderTargetV1 } from "../contracts/stage-render-target.ts";
import type {
  TimelineCatalogV1,
  TimelinePropertyV1,
  TimelineTargetV1,
} from "../contracts/timeline.ts";
import { evaluateTimelineAtV1, timelineDurationV1 } from "../contracts/timeline.ts";
import type {
  AuthoringSceneBindingStatusV1,
  AuthoringSceneInspectionObjectV1,
  CompiledAuthoringSceneV1,
} from "./authoring-scene-compiler.ts";

export interface AuthoringSceneHitRegionBoundsV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AuthoringSceneHitRegionFacetV1 {
  readonly regionId: string;
  readonly status: "resolved" | "unresolved";
  /** Whether the Authoring Scene explicitly named this catalog-owned region. */
  readonly declared: boolean;
  readonly accessibleNameText: string | null;
  readonly bounds: AuthoringSceneHitRegionBoundsV1 | null;
  readonly polygonPoints: readonly StageHitRegionPointV1[] | null;
  readonly hoverAssetId: string | null;
  readonly intentId: string | null;
}

export interface AuthoringSceneMotionFacetV1 {
  readonly motionId: string;
  readonly status: AuthoringSceneBindingStatusV1;
  readonly channels: readonly MotionChannelV1[];
}

export interface AuthoringSceneTimelineChannelFacetV1 {
  readonly target: TimelineTargetV1;
  readonly targetObjectId: StageTagV1 | null;
  readonly property: TimelinePropertyV1;
}

export interface AuthoringSceneTimelineFacetV1 {
  readonly timelineId: string;
  readonly status: AuthoringSceneBindingStatusV1;
  readonly channels: readonly AuthoringSceneTimelineChannelFacetV1[];
}

export interface AuthoringSceneGuiControlFacetV1 {
  readonly controlId: string;
  readonly intentId: string;
  readonly status: "external";
}

export interface AuthoringSceneInteractionFacetV1 {
  readonly regionId: string;
  readonly intentId: string;
  readonly status: "resolved" | "unresolved";
}

/** Separate, authoring-only facets keyed by the stable object identity. */
export interface AuthoringSceneObjectFacetsV1 {
  readonly inspection: AuthoringSceneInspectionObjectV1;
  readonly placement: StagePlacementV1;
  readonly geometry: StageContentGeometryV1 | null;
  readonly hitRegions: readonly AuthoringSceneHitRegionFacetV1[];
  readonly motions: readonly AuthoringSceneMotionFacetV1[];
  readonly timelines: readonly AuthoringSceneTimelineFacetV1[];
  readonly guiControls: readonly AuthoringSceneGuiControlFacetV1[];
  readonly interactions: readonly AuthoringSceneInteractionFacetV1[];
}

export interface AuthoringScenePointerPickV1 {
  readonly objectId: StageTagV1;
  readonly layerId: StageLayerIdV1;
  readonly tag: StageTagV1;
  readonly regionId: string;
}

export interface AuthoringSceneFacetProjectionV1 {
  readonly objects: Readonly<Record<string, AuthoringSceneObjectFacetsV1>>;
  /** Real catalog regions in explicit topmost-first pointer order. */
  readonly pointerPickOrder: readonly AuthoringScenePointerPickV1[];
  /** Existing Stage projection diagnostics, not a second authoring diagnostic system. */
  readonly renderDiagnostics: readonly DiagnosticEnvelopeV1[];
}

export interface ProjectAuthoringSceneFacetsOptionsV1 {
  /** Omit to leave Motion references external; present-but-missing is unresolved. */
  readonly motionDefinitions?: readonly MotionDefinitionV1[];
  /** Omit to leave Timeline references external; present-but-missing is unresolved. */
  readonly timelineCatalog?: TimelineCatalogV1;
}

interface MutableObjectFacetsV1 {
  readonly inspection: AuthoringSceneInspectionObjectV1;
  readonly placement: StagePlacementV1;
  geometry: StageContentGeometryV1 | null;
  readonly hitRegions: AuthoringSceneHitRegionFacetV1[];
  readonly motions: AuthoringSceneMotionFacetV1[];
  readonly timelines: AuthoringSceneTimelineFacetV1[];
  readonly guiControls: AuthoringSceneGuiControlFacetV1[];
  readonly interactions: AuthoringSceneInteractionFacetV1[];
}

function targetKeyV1(layerId: string, tag: string): string {
  return `${layerId}\u0000${tag}`;
}

function uniqueMotionChannelsV1(definition: MotionDefinitionV1): readonly MotionChannelV1[] {
  return [
    ...new Set(definition.tracks.map((track) => track.channel)),
  ];
}

function timelineChannelsV1(
  timelineId: string,
  catalog: TimelineCatalogV1,
  objectsByTarget: ReadonlyMap<string, StageTagV1>,
): readonly AuthoringSceneTimelineChannelFacetV1[] | null {
  const definition = catalog.resolveTimeline(timelineId);
  if (definition === null) return null;
  const sample = evaluateTimelineAtV1(definition, timelineDurationV1(definition));
  return (sample.values.map((value, index) => {
    let targetObjectId: StageTagV1 | null = null;
    if (value.target.kind === "entry") {
      targetObjectId = objectsByTarget.get(targetKeyV1(value.target.layerId, value.target.tag)) ??
        null;
      if (targetObjectId === null) {
        return dataFailure(
          `/timelines/${pointerSegment(timelineId)}/channels/${String(index)}/target`,
          "authoring_scene_timeline_target_unknown",
        );
      }
    }
    return ({
      target: value.target,
      targetObjectId,
      property: value.property,
    });
  }));
}

/**
 * Joins the compiler's authoring projection with the existing presentation
 * owners. It materializes a detached Stage through the ordinary Scene and
 * reducer path, then asks the real catalog for geometry and regions. Nothing
 * produced here enters the Player runtime plan, State, Snapshot, or Save.
 */
export function projectAuthoringSceneFacetsV1(
  compiled: CompiledAuthoringSceneV1,
  contentCatalog: StageContentCatalogV1,
  options: ProjectAuthoringSceneFacetsOptionsV1 = {},
): AuthoringSceneFacetProjectionV1 {
  if (compiled.runtimePlan.orderedLayerIds.length === 0) {
    return dataFailure("/runtimePlan/orderedLayerIds", "authoring_scene_layers_required");
  }

  const initialStage = createSemanticStageStateV1({
    stageId: "stage.authoring.preview",
    layerIds: compiled.runtimePlan.orderedLayerIds,
  });
  const scene = sceneFromAuthoringRuntimePlanV1(compiled.runtimePlan);
  const opened = reduceAdmittedStageMutationsV1(initialStage, scene.openMutations(initialStage));
  if (opened.kind === "rejected") {
    return dataFailure(opened.rejection.pointer, "authoring_scene_runtime_projection_invalid");
  }
  const rendered = projectStageRenderTargetV1(opened.state, contentCatalog);

  const mutableByObject = new Map<string, MutableObjectFacetsV1>();
  for (const inspection of compiled.inspection.objects) {
    mutableByObject.set(inspection.objectId as string, {
      inspection,
      placement: inspection.worldTransform,
      geometry: null,
      hitRegions: [],
      motions: [],
      timelines: [],
      guiControls: [],
      interactions: [],
    });
  }

  const objectsByTarget = new Map(
    compiled.objectTargets.map(({ objectId, target }) =>
      [
        targetKeyV1(target.layerId as string, target.tag as string),
        objectId,
      ] as const
    ),
  );
  const declaredRegionsByObject = new Map<string, Set<string>>();
  const intentsByObjectRegion = new Map<string, string>();
  for (const reference of compiled.bindings.hitRegions) {
    const key = reference.objectId as string;
    const current = declaredRegionsByObject.get(key) ?? new Set<string>();
    current.add(reference.id);
    declaredRegionsByObject.set(key, current);
  }
  for (const interaction of compiled.bindings.interactions) {
    intentsByObjectRegion.set(
      `${interaction.objectId as string}\u0000${interaction.regionId}`,
      interaction.intentId,
    );
  }

  const actualRegionsByObject = new Map<string, Set<string>>();
  const paintPickOrder: AuthoringScenePointerPickV1[] = [];
  for (const layer of rendered.target.layers) {
    for (const entry of layer.entries) {
      const objectId = objectsByTarget.get(
        targetKeyV1(layer.layerId as string, entry.tag as string),
      );
      if (objectId === undefined) continue;
      const facets = mutableByObject.get(objectId as string);
      if (facets === undefined) continue;
      facets.geometry = entry.geometry ?? null;
      const actualRegionIds = new Set<string>();
      actualRegionsByObject.set(objectId as string, actualRegionIds);
      const declared = declaredRegionsByObject.get(objectId as string) ?? new Set<string>();
      for (const region of entry.hitRegions) {
        actualRegionIds.add(region.regionId);
        const intentId = intentsByObjectRegion.get(
          `${objectId as string}\u0000${region.regionId}`,
        ) ?? null;
        facets.hitRegions.push({
          regionId: region.regionId,
          status: "resolved" as const,
          declared: declared.has(region.regionId),
          accessibleNameText: region.accessibleNameText,
          bounds: {
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
          },
          polygonPoints: region.polygonPoints ?? null,
          hoverAssetId: region.hoverAssetId ?? null,
          intentId,
        });
        paintPickOrder.push({
          objectId,
          layerId: layer.layerId,
          tag: entry.tag,
          regionId: region.regionId,
        });
      }
    }
  }

  for (const reference of compiled.bindings.hitRegions) {
    const actual = actualRegionsByObject.get(reference.objectId as string);
    if (actual?.has(reference.id) === true) continue;
    const facets = mutableByObject.get(reference.objectId as string);
    if (facets === undefined) continue;
    facets.hitRegions.push({
      regionId: reference.id,
      status: "unresolved" as const,
      declared: true,
      accessibleNameText: null,
      bounds: null,
      polygonPoints: null,
      hoverAssetId: null,
      intentId: intentsByObjectRegion.get(
        `${reference.objectId as string}\u0000${reference.id}`,
      ) ?? null,
    });
  }

  const motionDefinitions = options.motionDefinitions === undefined
    ? null
    : new Map(options.motionDefinitions.map((definition) => [definition.motionId, definition]));
  for (const reference of compiled.bindings.motions) {
    const facets = mutableByObject.get(reference.objectId as string);
    if (facets === undefined) continue;
    const definition = reference.status === "unresolved"
      ? undefined
      : motionDefinitions?.get(reference.id);
    const status: AuthoringSceneBindingStatusV1 = reference.status === "unresolved"
      ? "unresolved"
      : motionDefinitions === null
      ? "external"
      : definition === undefined
      ? "unresolved"
      : "resolved";
    facets.motions.push({
      motionId: reference.id,
      status,
      channels: definition === undefined ? [] : uniqueMotionChannelsV1(definition),
    });
  }

  for (const reference of compiled.bindings.timelines) {
    const facets = mutableByObject.get(reference.objectId as string);
    if (facets === undefined) continue;
    const channels = reference.status === "unresolved"
      ? null
      : options.timelineCatalog === undefined
      ? undefined
      : timelineChannelsV1(
        reference.id,
        options.timelineCatalog,
        objectsByTarget,
      );
    facets.timelines.push({
      timelineId: reference.id,
      status: channels === undefined ? "external" : channels === null ? "unresolved" : "resolved",
      channels: channels ?? [],
    });
  }

  for (const reference of compiled.bindings.guiControls) {
    mutableByObject.get(reference.objectId as string)?.guiControls.push({
      controlId: reference.controlId,
      intentId: reference.intentId,
      status: "external" as const,
    });
  }
  for (const reference of compiled.bindings.interactions) {
    const actual = actualRegionsByObject.get(reference.objectId as string);
    mutableByObject.get(reference.objectId as string)?.interactions.push({
      regionId: reference.regionId,
      intentId: reference.intentId,
      status: actual?.has(reference.regionId) === true ? "resolved" : "unresolved",
    });
  }

  const objectEntries = [...mutableByObject].map(([objectId, facets]) =>
    [
      objectId,
      {
        inspection: facets.inspection,
        placement: facets.placement,
        geometry: facets.geometry,
        hitRegions: facets.hitRegions,
        motions: facets.motions,
        timelines: facets.timelines,
        guiControls: facets.guiControls,
        interactions: facets.interactions,
      },
    ] as const
  );

  return ({
    objects: Object.fromEntries(objectEntries),
    pointerPickOrder: paintPickOrder.toReversed(),
    renderDiagnostics: rendered.diagnostics,
  });
}
