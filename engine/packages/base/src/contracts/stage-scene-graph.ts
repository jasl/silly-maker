// SPDX-License-Identifier: MIT
import type { ContentMaturityPolicyV1, ContentRequirementV1 } from "./content-maturity.js";
import {
  findUnknownContentMaturityFlagsV1,
  parseContentMaturityPolicyV1,
} from "./content-maturity.js";
import {
  ContentMaturityDuplicateIdError,
  PresentationCatalogValidationError,
  PresentationDataError,
  assertUniqueValues,
  catalogFailure,
  dataFailure,
  deepFreezeData,
  parseAt,
  parseEnum,
  parseNonEmptyString,
  parseNullableAt,
  parseStrictJsonObject,
  readArray,
  readExactRecord,
} from "./presentation-data.js";
import type {
  AppearanceLayerId,
  AssetId,
  CharacterActivityId,
  CharacterExpressionId,
  CharacterId,
  CharacterPoseId,
  CharacterRigId,
  HitAreaId,
  HitMapId,
  InteractionBehaviorId,
  InteractionSurfaceId,
  InteractionTargetId,
  NormalizedCoordinateV1,
  NormalizedExtentV1,
  PositiveFiniteNumber,
  PresentationProviderId,
  StageSceneId,
  StageSceneVariantId,
  TextId,
} from "./presentation-ids.js";
import {
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterActivityId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseContentMaturityFlagsV1,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseNormalizedCoordinateV1,
  parseNormalizedExtentV1,
  parsePositiveFiniteNumber,
  parsePresentationProviderId,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
} from "./presentation-ids.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "./values.js";
import { parseNonNegativeSafeInteger } from "./values.js";

export type InteractionEntryModeV1 = "surface_activation" | "always_active" | "explicit_control";
export type InteractionResolutionModeV1 = "direct" | "choose" | "open_surface";
export interface InteractionActivationV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly targetId: InteractionTargetId;
  readonly activationKind: "pointer" | "semantic_control";
}

export interface NormalizedPointV1 {
  readonly x: NormalizedCoordinateV1;
  readonly y: NormalizedCoordinateV1;
}

export type NormalizedShapeV1 =
  | {
      readonly kind: "rect";
      readonly x: NormalizedCoordinateV1;
      readonly y: NormalizedCoordinateV1;
      readonly width: NormalizedExtentV1;
      readonly height: NormalizedExtentV1;
    }
  | {
      readonly kind: "circle";
      readonly centerX: NormalizedCoordinateV1;
      readonly centerY: NormalizedCoordinateV1;
      readonly radius: NormalizedExtentV1;
    }
  | { readonly kind: "polygon"; readonly points: readonly NormalizedPointV1[] };

export interface HitAreaDescriptorV1 {
  readonly areaId: HitAreaId;
  readonly targetId: InteractionTargetId;
  readonly shape: NormalizedShapeV1;
  readonly priority: NonNegativeSafeInteger;
}

export interface HitMapDescriptorV1 {
  readonly hitMapId: HitMapId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly targets: readonly HitAreaDescriptorV1[];
}

export interface CharacterDescriptorV1 {
  readonly characterId: CharacterId;
  readonly accessibleNameTextId: TextId;
  readonly defaultRigId: CharacterRigId;
}

export interface CharacterRigDescriptorV1 {
  readonly rigId: CharacterRigId;
  readonly rendererId: string;
  readonly poseIds: readonly CharacterPoseId[];
  readonly expressionIds: readonly CharacterExpressionId[];
  readonly activityIds: readonly CharacterActivityId[];
  readonly appearanceLayerOrder: readonly AppearanceLayerId[];
  readonly defaultHitMapId: HitMapId | null;
  readonly poseHitMapOverrides: readonly {
    readonly poseId: CharacterPoseId;
    readonly hitMapId: HitMapId;
  }[];
  readonly staticFallbackAssetId: AssetId | null;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}

export interface CharacterPlacementV1 {
  readonly characterId: CharacterId;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
}

export interface InteractionSurfacePlacementV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly anchor: NormalizedPointV1;
}

export interface StageSceneDescriptorV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantIds: readonly StageSceneVariantId[];
  readonly defaultVariantId: StageSceneVariantId;
}

export interface StageScenePresentationV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly accessibleNameTextId: TextId;
  readonly backgroundAssetId: AssetId;
  readonly layout: StrictJsonObjectV1;
  readonly actors: readonly CharacterPlacementV1[];
  readonly interactionSurfaces: readonly InteractionSurfacePlacementV1[];
  readonly content: ContentRequirementV1;
}

export interface InteractionSurfaceDescriptorV1 {
  readonly surfaceId: InteractionSurfaceId;
  readonly accessibleNameTextId: TextId;
  readonly allowedEntryModes: readonly InteractionEntryModeV1[];
  readonly targetBindings: readonly InteractionSurfaceTargetBindingV1[];
}

export interface InteractionSurfaceTargetBindingV1 {
  readonly targetId: InteractionTargetId;
  readonly allowedResolutionModes: readonly InteractionResolutionModeV1[];
  readonly openSurfaceId: InteractionSurfaceId | null;
}

export interface InteractionTargetDescriptorV1 {
  readonly targetId: InteractionTargetId;
  readonly accessibleNameTextId: TextId;
  readonly behaviorIds: readonly InteractionBehaviorId[];
}

export interface InteractionBehaviorDescriptorV1 {
  readonly behaviorId: InteractionBehaviorId;
  readonly nameTextId: TextId;
  readonly descriptionTextId: TextId | null;
  readonly providerId: PresentationProviderId;
  readonly content: ContentRequirementV1;
}

export interface StageSceneGraphV1 {
  readonly stageScenes: readonly StageSceneDescriptorV1[];
  readonly variants: readonly StageScenePresentationV1[];
  readonly characters: readonly CharacterDescriptorV1[];
  readonly characterRigs: readonly CharacterRigDescriptorV1[];
  readonly hitMaps: readonly HitMapDescriptorV1[];
  readonly interactionSurfaces: readonly InteractionSurfaceDescriptorV1[];
  readonly interactionTargets: readonly InteractionTargetDescriptorV1[];
  readonly interactionBehaviors: readonly InteractionBehaviorDescriptorV1[];
  readonly contentMaturityPolicy: ContentMaturityPolicyV1;
}
const interactionEntryModesV1 = [
  "surface_activation",
  "always_active",
  "explicit_control",
] as const;
const interactionResolutionModesV1 = ["direct", "choose", "open_surface"] as const;
function parsePoint(value: unknown, path: string): NormalizedPointV1 {
  const point = readExactRecord(value, ["x", "y"], path);
  return {
    x: parseAt(parseNormalizedCoordinateV1, point.x, `${path}/x`, "invalid_coordinate"),
    y: parseAt(parseNormalizedCoordinateV1, point.y, `${path}/y`, "invalid_coordinate"),
  };
}

function orientation(
  first: NormalizedPointV1,
  second: NormalizedPointV1,
  third: NormalizedPointV1,
): number {
  return (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);
}

function pointOnSegment(
  point: NormalizedPointV1,
  first: NormalizedPointV1,
  second: NormalizedPointV1,
): boolean {
  return (
    orientation(first, second, point) === 0 &&
    point.x >= Math.min(first.x, second.x) &&
    point.x <= Math.max(first.x, second.x) &&
    point.y >= Math.min(first.y, second.y) &&
    point.y <= Math.max(first.y, second.y)
  );
}

function segmentsIntersect(
  firstStart: NormalizedPointV1,
  firstEnd: NormalizedPointV1,
  secondStart: NormalizedPointV1,
  secondEnd: NormalizedPointV1,
): boolean {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);
  if (
    ((firstOrientation > 0 && secondOrientation < 0) ||
      (firstOrientation < 0 && secondOrientation > 0)) &&
    ((thirdOrientation > 0 && fourthOrientation < 0) ||
      (thirdOrientation < 0 && fourthOrientation > 0))
  ) {
    return true;
  }
  return (
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function assertValidPolygon(points: readonly NormalizedPointV1[], path: string): void {
  if (points.length < 3) return dataFailure(path, "polygon_too_short");
  const distinct = new Set(points.map((point) => `${String(point.x)}\0${String(point.y)}`));
  if (distinct.size !== points.length) return dataFailure(path, "polygon_repeated_point");

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]!;
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    if (orientation(previous, current, next) === 0) {
      return dataFailure(path, "polygon_collinear_vertex");
    }
  }

  let doubleArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    doubleArea += current.x * next.y - next.x * current.y;
  }
  if (doubleArea === 0) return dataFailure(path, "polygon_degenerate");

  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (
        segmentsIntersect(points[first]!, points[firstNext]!, points[second]!, points[secondNext]!)
      ) {
        return dataFailure(path, "polygon_self_intersection");
      }
    }
  }
}

function parseShape(value: unknown, path: string): NormalizedShapeV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "shape_object_expected");
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    kindDescriptor === undefined ||
    kindDescriptor.get !== undefined ||
    kindDescriptor.set !== undefined
  ) {
    return dataFailure(`${path}/kind`, "shape_kind");
  }
  if (kindDescriptor.value === "rect") {
    const shape = readExactRecord(value, ["kind", "x", "y", "width", "height"], path);
    const parsed = {
      kind: "rect",
      x: parseAt(parseNormalizedCoordinateV1, shape.x, `${path}/x`, "invalid_shape"),
      y: parseAt(parseNormalizedCoordinateV1, shape.y, `${path}/y`, "invalid_shape"),
      width: parseAt(parseNormalizedExtentV1, shape.width, `${path}/width`, "invalid_shape"),
      height: parseAt(parseNormalizedExtentV1, shape.height, `${path}/height`, "invalid_shape"),
    } satisfies NormalizedShapeV1;
    if (parsed.x + parsed.width > 1 || parsed.y + parsed.height > 1) {
      return dataFailure(path, "rect_out_of_bounds");
    }
    return parsed;
  }
  if (kindDescriptor.value === "circle") {
    const shape = readExactRecord(value, ["kind", "centerX", "centerY", "radius"], path);
    const parsed = {
      kind: "circle",
      centerX: parseAt(
        parseNormalizedCoordinateV1,
        shape.centerX,
        `${path}/centerX`,
        "invalid_shape",
      ),
      centerY: parseAt(
        parseNormalizedCoordinateV1,
        shape.centerY,
        `${path}/centerY`,
        "invalid_shape",
      ),
      radius: parseAt(parseNormalizedExtentV1, shape.radius, `${path}/radius`, "invalid_shape"),
    } satisfies NormalizedShapeV1;
    if (
      parsed.centerX - parsed.radius < 0 ||
      parsed.centerX + parsed.radius > 1 ||
      parsed.centerY - parsed.radius < 0 ||
      parsed.centerY + parsed.radius > 1
    ) {
      return dataFailure(path, "circle_out_of_bounds");
    }
    return parsed;
  }
  if (kindDescriptor.value === "polygon") {
    const shape = readExactRecord(value, ["kind", "points"], path);
    const points = readArray(shape.points, `${path}/points`).map((point, index) =>
      parsePoint(point, `${path}/points/${index}`),
    );
    assertValidPolygon(points, `${path}/points`);
    return { kind: "polygon", points };
  }
  return dataFailure(`${path}/kind`, "shape_kind");
}

function parseContentRequirement(value: unknown, path: string): ContentRequirementV1 {
  const requirement = readExactRecord(value, ["requiredFlags"], path);
  return {
    requiredFlags: parseAt(
      parseContentMaturityFlagsV1,
      requirement.requiredFlags,
      `${path}/requiredFlags`,
      "invalid_content_mask",
    ),
  };
}

function parseStageSceneDescriptor(value: unknown, path: string): StageSceneDescriptorV1 {
  const scene = readExactRecord(value, ["stageSceneId", "variantIds", "defaultVariantId"], path);
  return {
    stageSceneId: parseAt(
      parseStageSceneId,
      scene.stageSceneId,
      `${path}/stageSceneId`,
      "invalid_id",
    ),
    variantIds: readArray(scene.variantIds, `${path}/variantIds`).map((entry, index) =>
      parseAt(parseStageSceneVariantId, entry, `${path}/variantIds/${index}`, "invalid_id"),
    ),
    defaultVariantId: parseAt(
      parseStageSceneVariantId,
      scene.defaultVariantId,
      `${path}/defaultVariantId`,
      "invalid_id",
    ),
  };
}

function parseCharacterPlacement(value: unknown, path: string): CharacterPlacementV1 {
  const placement = readExactRecord(value, ["characterId", "anchor", "scale"], path);
  return {
    characterId: parseAt(
      parseCharacterId,
      placement.characterId,
      `${path}/characterId`,
      "invalid_id",
    ),
    anchor: parsePoint(placement.anchor, `${path}/anchor`),
    scale: parseAt(parsePositiveFiniteNumber, placement.scale, `${path}/scale`, "invalid_scale"),
  };
}

function parseInteractionSurfacePlacement(
  value: unknown,
  path: string,
): InteractionSurfacePlacementV1 {
  const placement = readExactRecord(value, ["surfaceId", "anchor"], path);
  return {
    surfaceId: parseAt(
      parseInteractionSurfaceId,
      placement.surfaceId,
      `${path}/surfaceId`,
      "invalid_id",
    ),
    anchor: parsePoint(placement.anchor, `${path}/anchor`),
  };
}

function parseStageScenePresentation(value: unknown, path: string): StageScenePresentationV1 {
  const variant = readExactRecord(
    value,
    [
      "stageSceneId",
      "variantId",
      "rendererId",
      "accessibleNameTextId",
      "backgroundAssetId",
      "layout",
      "actors",
      "interactionSurfaces",
      "content",
    ],
    path,
  );
  return {
    stageSceneId: parseAt(
      parseStageSceneId,
      variant.stageSceneId,
      `${path}/stageSceneId`,
      "invalid_id",
    ),
    variantId: parseAt(
      parseStageSceneVariantId,
      variant.variantId,
      `${path}/variantId`,
      "invalid_id",
    ),
    rendererId: parseNonEmptyString(variant.rendererId, `${path}/rendererId`),
    accessibleNameTextId: parseAt(
      parseTextId,
      variant.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    backgroundAssetId: parseAt(
      parseAssetId,
      variant.backgroundAssetId,
      `${path}/backgroundAssetId`,
      "invalid_id",
    ),
    layout: parseStrictJsonObject(variant.layout, `${path}/layout`),
    actors: readArray(variant.actors, `${path}/actors`).map((entry, index) =>
      parseCharacterPlacement(entry, `${path}/actors/${index}`),
    ),
    interactionSurfaces: readArray(variant.interactionSurfaces, `${path}/interactionSurfaces`).map(
      (entry, index) =>
        parseInteractionSurfacePlacement(entry, `${path}/interactionSurfaces/${index}`),
    ),
    content: parseContentRequirement(variant.content, `${path}/content`),
  };
}

function parseCharacterDescriptor(value: unknown, path: string): CharacterDescriptorV1 {
  const character = readExactRecord(
    value,
    ["characterId", "accessibleNameTextId", "defaultRigId"],
    path,
  );
  return {
    characterId: parseAt(
      parseCharacterId,
      character.characterId,
      `${path}/characterId`,
      "invalid_id",
    ),
    accessibleNameTextId: parseAt(
      parseTextId,
      character.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    defaultRigId: parseAt(
      parseCharacterRigId,
      character.defaultRigId,
      `${path}/defaultRigId`,
      "invalid_id",
    ),
  };
}

function parseCharacterRigDescriptor(value: unknown, path: string): CharacterRigDescriptorV1 {
  const rig = readExactRecord(
    value,
    [
      "rigId",
      "rendererId",
      "poseIds",
      "expressionIds",
      "activityIds",
      "appearanceLayerOrder",
      "defaultHitMapId",
      "poseHitMapOverrides",
      "staticFallbackAssetId",
      "fallbackHitMapCompatibility",
    ],
    path,
  );
  return {
    rigId: parseAt(parseCharacterRigId, rig.rigId, `${path}/rigId`, "invalid_id"),
    rendererId: parseNonEmptyString(rig.rendererId, `${path}/rendererId`),
    poseIds: readArray(rig.poseIds, `${path}/poseIds`).map((entry, index) =>
      parseAt(parseCharacterPoseId, entry, `${path}/poseIds/${index}`, "invalid_id"),
    ),
    expressionIds: readArray(rig.expressionIds, `${path}/expressionIds`).map((entry, index) =>
      parseAt(parseCharacterExpressionId, entry, `${path}/expressionIds/${index}`, "invalid_id"),
    ),
    activityIds: readArray(rig.activityIds, `${path}/activityIds`).map((entry, index) =>
      parseAt(parseCharacterActivityId, entry, `${path}/activityIds/${index}`, "invalid_id"),
    ),
    appearanceLayerOrder: readArray(rig.appearanceLayerOrder, `${path}/appearanceLayerOrder`).map(
      (entry, index) =>
        parseAt(
          parseAppearanceLayerId,
          entry,
          `${path}/appearanceLayerOrder/${index}`,
          "invalid_id",
        ),
    ),
    defaultHitMapId: parseNullableAt(
      parseHitMapId,
      rig.defaultHitMapId,
      `${path}/defaultHitMapId`,
      "invalid_id",
    ),
    poseHitMapOverrides: readArray(rig.poseHitMapOverrides, `${path}/poseHitMapOverrides`).map(
      (entry, index) => {
        const overridePath = `${path}/poseHitMapOverrides/${index}`;
        const override = readExactRecord(entry, ["poseId", "hitMapId"], overridePath);
        return {
          poseId: parseAt(
            parseCharacterPoseId,
            override.poseId,
            `${overridePath}/poseId`,
            "invalid_id",
          ),
          hitMapId: parseAt(
            parseHitMapId,
            override.hitMapId,
            `${overridePath}/hitMapId`,
            "invalid_id",
          ),
        };
      },
    ),
    staticFallbackAssetId: parseNullableAt(
      parseAssetId,
      rig.staticFallbackAssetId,
      `${path}/staticFallbackAssetId`,
      "invalid_id",
    ),
    fallbackHitMapCompatibility: parseEnum(
      rig.fallbackHitMapCompatibility,
      ["compatible", "incompatible"],
      `${path}/fallbackHitMapCompatibility`,
    ),
  };
}

function parseHitAreaDescriptor(value: unknown, path: string): HitAreaDescriptorV1 {
  const area = readExactRecord(value, ["areaId", "targetId", "shape", "priority"], path);
  return {
    areaId: parseAt(parseHitAreaId, area.areaId, `${path}/areaId`, "invalid_id"),
    targetId: parseAt(parseInteractionTargetId, area.targetId, `${path}/targetId`, "invalid_id"),
    shape: parseShape(area.shape, `${path}/shape`),
    priority: parseAt(
      parseNonNegativeSafeInteger,
      area.priority,
      `${path}/priority`,
      "invalid_priority",
    ),
  };
}

function parseHitMapDescriptor(value: unknown, path: string): HitMapDescriptorV1 {
  const hitMap = readExactRecord(value, ["hitMapId", "rigId", "poseId", "targets"], path);
  return {
    hitMapId: parseAt(parseHitMapId, hitMap.hitMapId, `${path}/hitMapId`, "invalid_id"),
    rigId: parseAt(parseCharacterRigId, hitMap.rigId, `${path}/rigId`, "invalid_id"),
    poseId: parseAt(parseCharacterPoseId, hitMap.poseId, `${path}/poseId`, "invalid_id"),
    targets: readArray(hitMap.targets, `${path}/targets`).map((entry, index) =>
      parseHitAreaDescriptor(entry, `${path}/targets/${index}`),
    ),
  };
}

function parseSurfaceTargetBinding(
  value: unknown,
  path: string,
): InteractionSurfaceTargetBindingV1 {
  const binding = readExactRecord(
    value,
    ["targetId", "allowedResolutionModes", "openSurfaceId"],
    path,
  );
  const allowedResolutionModes = readArray(
    binding.allowedResolutionModes,
    `${path}/allowedResolutionModes`,
  ).map((entry, index) =>
    parseEnum(entry, interactionResolutionModesV1, `${path}/allowedResolutionModes/${index}`),
  );
  if (allowedResolutionModes.length === 0) {
    return dataFailure(`${path}/allowedResolutionModes`, "empty_modes");
  }
  const openSurfaceId = parseNullableAt(
    parseInteractionSurfaceId,
    binding.openSurfaceId,
    `${path}/openSurfaceId`,
    "invalid_id",
  );
  if (allowedResolutionModes.includes("open_surface") !== (openSurfaceId !== null)) {
    return dataFailure(path, "open_surface_mismatch");
  }
  return {
    targetId: parseAt(parseInteractionTargetId, binding.targetId, `${path}/targetId`, "invalid_id"),
    allowedResolutionModes,
    openSurfaceId,
  };
}

function parseInteractionSurfaceDescriptor(
  value: unknown,
  path: string,
): InteractionSurfaceDescriptorV1 {
  const surface = readExactRecord(
    value,
    ["surfaceId", "accessibleNameTextId", "allowedEntryModes", "targetBindings"],
    path,
  );
  const allowedEntryModes = readArray(surface.allowedEntryModes, `${path}/allowedEntryModes`).map(
    (entry, index) =>
      parseEnum(entry, interactionEntryModesV1, `${path}/allowedEntryModes/${index}`),
  );
  if (allowedEntryModes.length === 0) {
    return dataFailure(`${path}/allowedEntryModes`, "empty_modes");
  }
  return {
    surfaceId: parseAt(
      parseInteractionSurfaceId,
      surface.surfaceId,
      `${path}/surfaceId`,
      "invalid_id",
    ),
    accessibleNameTextId: parseAt(
      parseTextId,
      surface.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    allowedEntryModes,
    targetBindings: readArray(surface.targetBindings, `${path}/targetBindings`).map(
      (entry, index) => parseSurfaceTargetBinding(entry, `${path}/targetBindings/${index}`),
    ),
  };
}

function parseInteractionTargetDescriptor(
  value: unknown,
  path: string,
): InteractionTargetDescriptorV1 {
  const target = readExactRecord(value, ["targetId", "accessibleNameTextId", "behaviorIds"], path);
  return {
    targetId: parseAt(parseInteractionTargetId, target.targetId, `${path}/targetId`, "invalid_id"),
    accessibleNameTextId: parseAt(
      parseTextId,
      target.accessibleNameTextId,
      `${path}/accessibleNameTextId`,
      "invalid_id",
    ),
    behaviorIds: readArray(target.behaviorIds, `${path}/behaviorIds`).map((entry, index) =>
      parseAt(parseInteractionBehaviorId, entry, `${path}/behaviorIds/${index}`, "invalid_id"),
    ),
  };
}

function parseInteractionBehaviorDescriptor(
  value: unknown,
  path: string,
): InteractionBehaviorDescriptorV1 {
  const behavior = readExactRecord(
    value,
    ["behaviorId", "nameTextId", "descriptionTextId", "providerId", "content"],
    path,
  );
  return {
    behaviorId: parseAt(
      parseInteractionBehaviorId,
      behavior.behaviorId,
      `${path}/behaviorId`,
      "invalid_id",
    ),
    nameTextId: parseAt(parseTextId, behavior.nameTextId, `${path}/nameTextId`, "invalid_id"),
    descriptionTextId: parseNullableAt(
      parseTextId,
      behavior.descriptionTextId,
      `${path}/descriptionTextId`,
      "invalid_id",
    ),
    providerId: parseAt(
      parsePresentationProviderId,
      behavior.providerId,
      `${path}/providerId`,
      "invalid_id",
    ),
    content: parseContentRequirement(behavior.content, `${path}/content`),
  };
}
function validateStageSceneGraph(graph: StageSceneGraphV1): void {
  const globallyRegistered = new Map<string, string>();
  const register = (id: string, path: string): void => {
    if (globallyRegistered.has(id)) {
      catalogFailure("presentation.catalog.duplicate_id", path, "duplicate_id", id);
    }
    globallyRegistered.set(id, path);
  };

  graph.stageScenes.forEach((entry, index) =>
    register(entry.stageSceneId, `/stageScenes/${index}`),
  );
  graph.variants.forEach((entry, index) => register(entry.variantId, `/variants/${index}`));
  graph.characters.forEach((entry, index) => register(entry.characterId, `/characters/${index}`));
  graph.characterRigs.forEach((entry, index) => register(entry.rigId, `/characterRigs/${index}`));
  graph.hitMaps.forEach((entry, index) => {
    register(entry.hitMapId, `/hitMaps/${index}`);
    entry.targets.forEach((area, areaIndex) =>
      register(area.areaId, `/hitMaps/${index}/targets/${areaIndex}`),
    );
  });
  graph.interactionSurfaces.forEach((entry, index) =>
    register(entry.surfaceId, `/interactionSurfaces/${index}`),
  );
  graph.interactionTargets.forEach((entry, index) =>
    register(entry.targetId, `/interactionTargets/${index}`),
  );
  graph.interactionBehaviors.forEach((entry, index) =>
    register(entry.behaviorId, `/interactionBehaviors/${index}`),
  );
  graph.contentMaturityPolicy.flags.forEach((entry, index) =>
    register(entry.id, `/contentMaturityPolicy/flags/${index}`),
  );
  graph.contentMaturityPolicy.presets.forEach((entry, index) =>
    register(entry.presetId, `/contentMaturityPolicy/presets/${index}`),
  );

  const stageScenes = new Map(graph.stageScenes.map((entry) => [entry.stageSceneId, entry]));
  const variants = new Map(graph.variants.map((entry) => [entry.variantId, entry]));
  const characters = new Map(graph.characters.map((entry) => [entry.characterId, entry]));
  const rigs = new Map(graph.characterRigs.map((entry) => [entry.rigId, entry]));
  const hitMaps = new Map(graph.hitMaps.map((entry) => [entry.hitMapId, entry]));
  const surfaces = new Map(graph.interactionSurfaces.map((entry) => [entry.surfaceId, entry]));
  const targets = new Map(graph.interactionTargets.map((entry) => [entry.targetId, entry]));
  const behaviors = new Map(graph.interactionBehaviors.map((entry) => [entry.behaviorId, entry]));

  graph.stageScenes.forEach((scene, sceneIndex) => {
    const path = `/stageScenes/${sceneIndex}`;
    assertUniqueValues(scene.variantIds, `${path}/variantIds`);
    if (!scene.variantIds.includes(scene.defaultVariantId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `${path}/defaultVariantId`,
        "default_variant_not_registered",
        scene.defaultVariantId,
      );
    }
    for (const variantId of scene.variantIds) {
      const variant = variants.get(variantId);
      if (variant === undefined || variant.stageSceneId !== scene.stageSceneId) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/variantIds`,
          "variant_reference",
          variantId,
        );
      }
    }
  });

  graph.variants.forEach((variant, variantIndex) => {
    const path = `/variants/${variantIndex}`;
    const scene = stageScenes.get(variant.stageSceneId);
    if (scene === undefined || !scene.variantIds.includes(variant.variantId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `${path}/stageSceneId`,
        "stage_scene_reference",
        variant.stageSceneId,
      );
    }
    for (const actor of variant.actors) {
      if (!characters.has(actor.characterId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/actors`,
          "character_reference",
          actor.characterId,
        );
      }
    }
    for (const placement of variant.interactionSurfaces) {
      if (!surfaces.has(placement.surfaceId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/interactionSurfaces`,
          "surface_reference",
          placement.surfaceId,
        );
      }
    }
  });

  graph.characters.forEach((character, index) => {
    if (!rigs.has(character.defaultRigId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `/characters/${index}/defaultRigId`,
        "rig_reference",
        character.defaultRigId,
      );
    }
  });

  graph.characterRigs.forEach((rig, rigIndex) => {
    const path = `/characterRigs/${rigIndex}`;
    assertUniqueValues(rig.poseIds, `${path}/poseIds`);
    assertUniqueValues(rig.expressionIds, `${path}/expressionIds`);
    assertUniqueValues(rig.activityIds, `${path}/activityIds`);
    assertUniqueValues(rig.appearanceLayerOrder, `${path}/appearanceLayerOrder`);
    if (rig.defaultHitMapId !== null) {
      const hitMap = hitMaps.get(rig.defaultHitMapId);
      if (hitMap === undefined || hitMap.rigId !== rig.rigId) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/defaultHitMapId`,
          "hit_map_reference",
          rig.defaultHitMapId,
        );
      }
    }
    const overridePoses = new Set<string>();
    for (const override of rig.poseHitMapOverrides) {
      if (overridePoses.has(override.poseId)) {
        catalogFailure(
          "presentation.catalog.duplicate_id",
          `${path}/poseHitMapOverrides`,
          "duplicate_pose_override",
          override.poseId,
        );
      }
      overridePoses.add(override.poseId);
      const hitMap = hitMaps.get(override.hitMapId);
      if (
        !rig.poseIds.includes(override.poseId) ||
        hitMap === undefined ||
        hitMap.rigId !== rig.rigId ||
        hitMap.poseId !== override.poseId
      ) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `${path}/poseHitMapOverrides`,
          "pose_hit_map_reference",
          override.hitMapId,
        );
      }
    }
  });

  graph.hitMaps.forEach((hitMap, hitMapIndex) => {
    const rig = rigs.get(hitMap.rigId);
    if (rig === undefined || !rig.poseIds.includes(hitMap.poseId)) {
      catalogFailure(
        "presentation.catalog.missing_reference",
        `/hitMaps/${hitMapIndex}`,
        "rig_pose_reference",
        hitMap.rigId,
      );
    }
    for (const area of hitMap.targets) {
      if (!targets.has(area.targetId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/hitMaps/${hitMapIndex}/targets`,
          "target_reference",
          area.targetId,
        );
      }
    }
  });

  graph.interactionTargets.forEach((target, targetIndex) => {
    assertUniqueValues(target.behaviorIds, `/interactionTargets/${targetIndex}/behaviorIds`);
    for (const behaviorId of target.behaviorIds) {
      if (!behaviors.has(behaviorId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/interactionTargets/${targetIndex}/behaviorIds`,
          "behavior_reference",
          behaviorId,
        );
      }
    }
  });

  const surfaceEdges = new Map<InteractionSurfaceId, InteractionSurfaceId[]>();
  graph.interactionSurfaces.forEach((surface, surfaceIndex) => {
    const targetsInSurface = new Set<string>();
    assertUniqueValues(
      surface.allowedEntryModes,
      `/interactionSurfaces/${surfaceIndex}/allowedEntryModes`,
    );
    const edges: InteractionSurfaceId[] = [];
    for (const binding of surface.targetBindings) {
      if (targetsInSurface.has(binding.targetId)) {
        catalogFailure(
          "presentation.catalog.duplicate_id",
          `/interactionSurfaces/${surfaceIndex}/targetBindings`,
          "duplicate_surface_target_binding",
          binding.targetId,
        );
      }
      targetsInSurface.add(binding.targetId);
      assertUniqueValues(
        binding.allowedResolutionModes,
        `/interactionSurfaces/${surfaceIndex}/targetBindings`,
      );
      if (!targets.has(binding.targetId)) {
        catalogFailure(
          "presentation.catalog.missing_reference",
          `/interactionSurfaces/${surfaceIndex}/targetBindings`,
          "target_reference",
          binding.targetId,
        );
      }
      if (binding.openSurfaceId !== null) {
        if (!surfaces.has(binding.openSurfaceId)) {
          catalogFailure(
            "presentation.catalog.missing_reference",
            `/interactionSurfaces/${surfaceIndex}/targetBindings`,
            "open_surface_reference",
            binding.openSurfaceId,
          );
        }
        edges.push(binding.openSurfaceId);
      }
    }
    surfaceEdges.set(surface.surfaceId, edges);
  });

  const visiting = new Set<InteractionSurfaceId>();
  const visited = new Set<InteractionSurfaceId>();
  const visitSurface = (surfaceId: InteractionSurfaceId): void => {
    if (visiting.has(surfaceId)) {
      catalogFailure(
        "presentation.catalog.surface_cycle",
        "/interactionSurfaces",
        "surface_cycle",
        surfaceId,
      );
    }
    if (visited.has(surfaceId)) return;
    visiting.add(surfaceId);
    for (const targetSurfaceId of surfaceEdges.get(surfaceId) ?? []) {
      visitSurface(targetSurfaceId);
    }
    visiting.delete(surfaceId);
    visited.add(surfaceId);
  };
  for (const surfaceId of surfaces.keys()) visitSurface(surfaceId);

  const assertKnownRequirement = (requirement: ContentRequirementV1, path: string): void => {
    const unknown = findUnknownContentMaturityFlagsV1(
      graph.contentMaturityPolicy,
      requirement.requiredFlags,
    );
    if (unknown !== 0) {
      catalogFailure("content_maturity.unknown_flags", path, "unknown_required_flags", unknown);
    }
  };
  graph.variants.forEach((variant, index) =>
    assertKnownRequirement(variant.content, `/variants/${index}/content`),
  );
  graph.interactionBehaviors.forEach((behavior, index) =>
    assertKnownRequirement(behavior.content, `/interactionBehaviors/${index}/content`),
  );
}

function parseStageSceneGraphData(value: unknown): StageSceneGraphV1 {
  const graph = readExactRecord(
    value,
    [
      "stageScenes",
      "variants",
      "characters",
      "characterRigs",
      "hitMaps",
      "interactionSurfaces",
      "interactionTargets",
      "interactionBehaviors",
      "contentMaturityPolicy",
    ],
    "/",
  );
  const parsed: StageSceneGraphV1 = {
    stageScenes: readArray(graph.stageScenes, "/stageScenes").map((entry, index) =>
      parseStageSceneDescriptor(entry, `/stageScenes/${index}`),
    ),
    variants: readArray(graph.variants, "/variants").map((entry, index) =>
      parseStageScenePresentation(entry, `/variants/${index}`),
    ),
    characters: readArray(graph.characters, "/characters").map((entry, index) =>
      parseCharacterDescriptor(entry, `/characters/${index}`),
    ),
    characterRigs: readArray(graph.characterRigs, "/characterRigs").map((entry, index) =>
      parseCharacterRigDescriptor(entry, `/characterRigs/${index}`),
    ),
    hitMaps: readArray(graph.hitMaps, "/hitMaps").map((entry, index) =>
      parseHitMapDescriptor(entry, `/hitMaps/${index}`),
    ),
    interactionSurfaces: readArray(graph.interactionSurfaces, "/interactionSurfaces").map(
      (entry, index) => parseInteractionSurfaceDescriptor(entry, `/interactionSurfaces/${index}`),
    ),
    interactionTargets: readArray(graph.interactionTargets, "/interactionTargets").map(
      (entry, index) => parseInteractionTargetDescriptor(entry, `/interactionTargets/${index}`),
    ),
    interactionBehaviors: readArray(graph.interactionBehaviors, "/interactionBehaviors").map(
      (entry, index) => parseInteractionBehaviorDescriptor(entry, `/interactionBehaviors/${index}`),
    ),
    contentMaturityPolicy: parseContentMaturityPolicyV1(graph.contentMaturityPolicy),
  };
  validateStageSceneGraph(parsed);
  return deepFreezeData(parsed);
}

export function parseStageSceneGraphV1(value: unknown): StageSceneGraphV1 {
  try {
    return parseStageSceneGraphData(value);
  } catch (error) {
    if (error instanceof PresentationCatalogValidationError) throw error;
    if (error instanceof ContentMaturityDuplicateIdError) {
      return catalogFailure(
        "presentation.catalog.duplicate_id",
        error.path,
        "duplicate_id",
        error.reference,
      );
    }
    if (error instanceof PresentationDataError) {
      return catalogFailure("presentation.catalog.invalid_shape", error.path, error.reason);
    }
    return catalogFailure("presentation.catalog.invalid_shape", "/", "invalid_catalog_data");
  }
}

export const stageSceneGraphSchemaV1: RuntimeSchemaV1<StageSceneGraphV1> = Object.freeze({
  parse: parseStageSceneGraphV1,
});
