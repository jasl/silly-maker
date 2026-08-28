// SPDX-License-Identifier: MIT
import type {
  StageContentIdV1,
  StageLayerIdV1,
  StagePlacementV1,
  StageTagV1,
} from "@sillymaker/base";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneAmbientV1,
} from "@sillymaker/base/authoring/scene";

/** Public schema revision for the Scene operation vocabulary. */
export const sceneAuthoringOperationSchemaRevisionV1 = 2;

interface SceneAuthoringOperationBaseV1 {
  readonly schemaRevision: typeof sceneAuthoringOperationSchemaRevisionV1;
}

export interface SceneObjectSetLocalTransformOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.object.set_local_transform";
  readonly objectId: StageTagV1;
  readonly localTransform: StagePlacementV1;
}

export interface SceneObjectSetVisualContentOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.object.set_visual_content";
  readonly objectId: StageTagV1;
  /** Changes an existing Visual; it never turns a group into a renderable object. */
  readonly contentId: StageContentIdV1;
}

export interface SceneObjectSetAppearanceOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.object.set_appearance";
  readonly objectId: StageTagV1;
  readonly key: string;
  readonly value: string | null;
}

export interface SceneObjectSetAmbientOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.object.set_ambient";
  readonly objectId: StageTagV1;
  /** Atomic Visual ambient binding; null removes it. */
  readonly ambient: AuthoringSceneAmbientV1 | null;
}

export interface SceneObjectMoveBeforeOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.object.move_before";
  readonly objectId: StageTagV1;
  /** Same sibling list only; null moves the object to the end. */
  readonly beforeObjectId: StageTagV1 | null;
}

export interface SceneLayerMoveBeforeOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.layer.move_before";
  readonly layerId: StageLayerIdV1;
  /** Null moves the layer to the end. */
  readonly beforeLayerId: StageLayerIdV1 | null;
}

export type SceneAuthoringOperationV1 =
  | SceneObjectSetLocalTransformOperationV1
  | SceneObjectSetVisualContentOperationV1
  | SceneObjectSetAppearanceOperationV1
  | SceneObjectSetAmbientOperationV1
  | SceneObjectMoveBeforeOperationV1
  | SceneLayerMoveBeforeOperationV1;

export type SceneAuthoringDiagnosticCodeV1 =
  | "scene_authoring.envelope_invalid"
  | "scene_authoring.operation_schema_unsupported"
  | "scene_authoring.operation_kind_unknown"
  | "scene_authoring.operation_payload_invalid"
  | "scene_authoring.view_inactive"
  | "scene_authoring.document_unavailable"
  | "scene_authoring.document_stale"
  | "scene_authoring.revision_stale"
  | "scene_authoring.target_missing"
  | "scene_authoring.target_conflict"
  | "scene_authoring.no_change"
  | "scene_authoring.result_invalid";

export interface SceneAuthoringDiagnosticV1 {
  readonly code: SceneAuthoringDiagnosticCodeV1;
  readonly path: string;
}

export type SceneAuthoringOperationAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly operation: SceneAuthoringOperationV1 }
  | { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 };

export type SceneAuthoringReductionResultV1 =
  | { readonly kind: "reduced"; readonly scene: AdmittedAuthoringSceneV1 }
  | { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 };

export interface SceneAuthoringExecutionEnvelopeV1 {
  readonly documentIdentity: string;
  readonly expectedDraftRevision: number;
  readonly operation: SceneAuthoringOperationV1;
  readonly coalesceKey?: string;
}

export type SceneAuthoringEnvelopeAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly envelope: SceneAuthoringExecutionEnvelopeV1 }
  | { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 };

export type SceneAuthoringExecutionResultV1 =
  | {
    readonly kind: "applied";
    readonly documentIdentity: string;
    readonly draftRevision: number;
  }
  | { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 };

export interface SceneAuthoringCurrentV1 {
  readonly documentIdentity: string;
  readonly draftRevision: number;
}

export interface SceneAuthoringOperationExecutorV1 {
  execute(envelope: SceneAuthoringExecutionEnvelopeV1): SceneAuthoringExecutionResultV1;
}

export interface SceneAuthoringLocalAdapterV1 extends SceneAuthoringOperationExecutorV1 {
  current(): SceneAuthoringCurrentV1 | null;
}
