// SPDX-License-Identifier: MIT
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

export const petSceneDocumentFormatV1 = "sillymaker.pet-scene";
export const petSceneDocumentVersionV1 = 1;
export const petSceneOperationSchemaRevisionV1 = 1;

export interface PetVec3V1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PetTransformV1 {
  /** Position in product scene units. */
  readonly position: PetVec3V1;
  /** XYZ Euler rotation in radians. */
  readonly rotation: PetVec3V1;
  /** Unitless local scale. */
  readonly scale: PetVec3V1;
}

export interface PetModelNodeMappingV1 {
  readonly nodeId: string;
  readonly sourceName: string;
}

export interface PetModelBoneMappingV1 {
  readonly boneId: string;
  readonly sourceName: string;
}

export interface PetModelSocketMappingV1 {
  readonly socketId: string;
  readonly sourceName: string;
  readonly boneId: string;
  readonly transform: PetTransformV1;
}

export interface PetModelClipMappingV1 {
  readonly clipId: string;
  readonly sourceName: string;
}

export interface PetModelAppearanceV1 {
  readonly primaryMaterialSourceName: string;
  readonly primaryColor: string;
}

export interface PetModelAnimationV1 {
  readonly idleClipId: string;
  readonly speed: number;
  readonly blendDurationMs: number;
}

/** Product-local semantic names mapped to one renderer-owned model source. */
export interface PetModelBindingV1 {
  readonly modelId: string;
  readonly appearance: PetModelAppearanceV1;
  readonly animation?: PetModelAnimationV1 | undefined;
  readonly nodes: readonly PetModelNodeMappingV1[];
  readonly bones: readonly PetModelBoneMappingV1[];
  readonly sockets: readonly PetModelSocketMappingV1[];
  readonly clips: readonly PetModelClipMappingV1[];
}

export interface PetPerspectiveCameraV1 {
  readonly projection: "perspective";
  readonly fovDegrees: number;
  readonly near: number;
  readonly far: number;
}

export type PetLightKindV1 = "ambient" | "directional" | "point";

export interface PetLightV1 {
  readonly lightKind: PetLightKindV1;
  readonly color: string;
  readonly intensity: number;
}

export type PetInteractionVolumeShapeV1 =
  | { readonly kind: "sphere"; readonly radius: number }
  | { readonly kind: "box"; readonly size: PetVec3V1 };

export interface PetInteractionVolumeV1 {
  readonly interactionId: string;
  readonly shape: PetInteractionVolumeShapeV1;
  /** Preferred fur direction in the attached volume's local coordinate space. */
  readonly preferredStrokeDirection: PetVec3V1;
  readonly attachment: {
    readonly modelObjectId: string;
    readonly socketId: string;
  };
}

interface PetSceneObjectBaseV1 {
  readonly objectId: string;
  readonly label: string;
  readonly transform: PetTransformV1;
}

export interface PetSceneGroupObjectV1 extends PetSceneObjectBaseV1 {
  readonly kind: "group";
  readonly children: readonly PetSceneObjectV1[];
}

export interface PetSceneModelObjectV1 extends PetSceneObjectBaseV1 {
  readonly kind: "model";
  readonly model: PetModelBindingV1;
}

export interface PetSceneCameraObjectV1 extends PetSceneObjectBaseV1 {
  readonly kind: "camera";
  readonly camera: PetPerspectiveCameraV1;
}

export interface PetSceneLightObjectV1 extends PetSceneObjectBaseV1 {
  readonly kind: "light";
  readonly light: PetLightV1;
}

export interface PetSceneInteractionVolumeObjectV1 extends PetSceneObjectBaseV1 {
  readonly kind: "interaction-volume";
  /** Its object transform is an offset in the declared attachment socket's local space. */
  readonly interaction: PetInteractionVolumeV1;
}

export type PetSceneObjectV1 =
  | PetSceneGroupObjectV1
  | PetSceneModelObjectV1
  | PetSceneCameraObjectV1
  | PetSceneLightObjectV1
  | PetSceneInteractionVolumeObjectV1;

export interface PetSceneDocumentV1 {
  readonly format: typeof petSceneDocumentFormatV1;
  readonly version: typeof petSceneDocumentVersionV1;
  readonly sceneId: string;
  readonly label: string;
  readonly activeCameraId: string;
  readonly objects: readonly PetSceneObjectV1[];
}

export type PetSceneDiagnosticCodeV1 =
  | "pet_scene.document_invalid"
  | "pet_scene.object_id_duplicate"
  | "pet_scene.active_camera_missing"
  | "pet_scene.active_camera_invalid"
  | "pet_scene.mapping_id_duplicate"
  | "pet_scene.mapping_target_missing"
  | "pet_scene.interaction_target_missing"
  | "pet_scene.interaction_target_invalid"
  | "pet_scene.interaction_socket_missing"
  | "pet_scene.runtime_binding_missing"
  | "pet_scene.runtime_binding_conflict"
  | "pet_scene.runtime_binding_orphan"
  | "pet_scene.document_unavailable"
  | "pet_scene.document_stale"
  | "pet_scene.revision_stale"
  | "pet_scene.operation_target_missing"
  | "pet_scene.operation_target_conflict"
  | "pet_scene.operation_invalid"
  | "pet_scene.no_change";

export interface PetSceneDiagnosticV1 {
  readonly code: PetSceneDiagnosticCodeV1;
  readonly path: string;
}

export type PetSceneDocumentAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly document: PetSceneDocumentV1 }
  | { readonly kind: "rejected"; readonly diagnostic: PetSceneDiagnosticV1 };

interface PetSceneRuntimeObjectPlanBaseV1 {
  readonly objectId: string;
  readonly label: string;
  readonly parentObjectId: string | null;
  readonly sourcePath: string;
  readonly transform: PetTransformV1;
}

export interface PetSceneRuntimeGroupPlanV1 extends PetSceneRuntimeObjectPlanBaseV1 {
  readonly kind: "group";
}

export interface PetSceneRuntimeModelBindingV1 {
  readonly modelId: string;
  readonly appearance: PetModelAppearanceV1;
  readonly animation: PetModelAnimationV1 | null;
  readonly nodeSourceById: ReadonlyMap<string, string>;
  readonly boneSourceById: ReadonlyMap<string, string>;
  readonly socketById: ReadonlyMap<string, PetModelSocketMappingV1>;
  readonly clipSourceById: ReadonlyMap<string, string>;
}

export interface PetSceneRuntimeModelPlanV1 extends PetSceneRuntimeObjectPlanBaseV1 {
  readonly kind: "model";
  readonly model: PetSceneRuntimeModelBindingV1;
}

export interface PetSceneRuntimeCameraPlanV1 extends PetSceneRuntimeObjectPlanBaseV1 {
  readonly kind: "camera";
  readonly camera: PetPerspectiveCameraV1;
}

export interface PetSceneRuntimeLightPlanV1 extends PetSceneRuntimeObjectPlanBaseV1 {
  readonly kind: "light";
  readonly light: PetLightV1;
}

export interface PetSceneRuntimeInteractionVolumePlanV1 extends PetSceneRuntimeObjectPlanBaseV1 {
  readonly kind: "interaction-volume";
  readonly interaction: PetInteractionVolumeV1;
}

export type PetSceneRuntimeObjectPlanV1 =
  | PetSceneRuntimeGroupPlanV1
  | PetSceneRuntimeModelPlanV1
  | PetSceneRuntimeCameraPlanV1
  | PetSceneRuntimeLightPlanV1
  | PetSceneRuntimeInteractionVolumePlanV1;

export interface PetSceneRuntimePlanV1 {
  readonly sceneId: string;
  readonly label: string;
  readonly activeCameraId: string;
  readonly objects: readonly PetSceneRuntimeObjectPlanV1[];
  readonly objectById: ReadonlyMap<string, PetSceneRuntimeObjectPlanV1>;
}

export type PetSceneCompileResultV1 =
  | { readonly kind: "compiled"; readonly plan: PetSceneRuntimePlanV1 }
  | { readonly kind: "rejected"; readonly diagnostic: PetSceneDiagnosticV1 };

interface PetSceneOperationBaseV1 {
  readonly schemaRevision: typeof petSceneOperationSchemaRevisionV1;
  readonly objectId: string;
}

export interface PetSceneObjectSetTransformOperationV1 extends PetSceneOperationBaseV1 {
  readonly kind: "pet_scene.object.set_transform";
  readonly transform: PetTransformV1;
}

export interface PetSceneModelSetBindingOperationV1 extends PetSceneOperationBaseV1 {
  readonly kind: "pet_scene.model.set_binding";
  readonly model: PetModelBindingV1;
}

export interface PetSceneCameraSetOperationV1 extends PetSceneOperationBaseV1 {
  readonly kind: "pet_scene.camera.set";
  readonly camera: PetPerspectiveCameraV1;
}

export interface PetSceneLightSetOperationV1 extends PetSceneOperationBaseV1 {
  readonly kind: "pet_scene.light.set";
  readonly light: PetLightV1;
}

export interface PetSceneInteractionVolumeSetOperationV1 extends PetSceneOperationBaseV1 {
  readonly kind: "pet_scene.interaction_volume.set";
  readonly interaction: PetInteractionVolumeV1;
}

export type PetSceneOperationV1 =
  | PetSceneObjectSetTransformOperationV1
  | PetSceneModelSetBindingOperationV1
  | PetSceneCameraSetOperationV1
  | PetSceneLightSetOperationV1
  | PetSceneInteractionVolumeSetOperationV1;

export type PetSceneReductionResultV1 =
  | { readonly kind: "reduced"; readonly document: PetSceneDocumentV1 }
  | { readonly kind: "rejected"; readonly diagnostic: PetSceneDiagnosticV1 };

export interface PetSceneExecutionEnvelopeV1 {
  readonly documentIdentity: string;
  readonly expectedDraftRevision: number;
  readonly operation: PetSceneOperationV1;
  readonly coalesceKey?: string;
}

export type PetSceneExecutionResultV1 =
  | {
    readonly kind: "applied";
    readonly documentIdentity: string;
    readonly draftRevision: number;
  }
  | { readonly kind: "rejected"; readonly diagnostic: PetSceneDiagnosticV1 };

export interface PetSceneOperationExecutorV1 {
  execute(envelope: PetSceneExecutionEnvelopeV1): PetSceneExecutionResultV1;
}

export type PetSceneAuthoringSessionV1 = AuthoringDocumentSessionV1<PetSceneDocumentV1>;
