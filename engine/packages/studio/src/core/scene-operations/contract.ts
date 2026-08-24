// SPDX-License-Identifier: MIT
import type { SceneCueV1, SceneDocumentV1, SceneEntryV1, StagePlacementV1 } from "@sillymaker/base";

/** Package-private AR2 schema revision for every admitted Scene operation. */
export const sceneAuthoringOperationSchemaRevisionV1 = 1;

interface SceneAuthoringOperationBaseV1 {
  readonly schemaRevision: typeof sceneAuthoringOperationSchemaRevisionV1;
}

export interface SceneEntrySetPlacementOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.set_placement";
  readonly tag: string;
  readonly placement: StagePlacementV1;
}

export interface SceneEntryAddOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.add";
  readonly entry: SceneEntryV1;
}

export interface SceneEntryRemoveOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.remove";
  readonly tag: string;
}

export interface SceneEntrySetZOrderOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.set_z_order";
  readonly tag: string;
  readonly zOrder: number;
}

export interface SceneEntrySetAppearanceOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.set_appearance";
  readonly tag: string;
  readonly key: string;
  readonly value: string | null;
}

export interface SceneEntrySetAmbientOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.entry.set_ambient";
  readonly tag: string;
  readonly motionId: string | null;
}

export interface SceneCueAddOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.cue.add";
  readonly cue: SceneCueV1;
}

export interface SceneCueRemoveOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.cue.remove";
  readonly cueId: string;
}

export interface SceneCueSetMotionOperationV1 extends SceneAuthoringOperationBaseV1 {
  readonly kind: "scene.cue.set_motion";
  readonly cueId: string;
  readonly motionId: string | null;
}

export type SceneAuthoringOperationV1 =
  | SceneEntrySetPlacementOperationV1
  | SceneEntryAddOperationV1
  | SceneEntryRemoveOperationV1
  | SceneEntrySetZOrderOperationV1
  | SceneEntrySetAppearanceOperationV1
  | SceneEntrySetAmbientOperationV1
  | SceneCueAddOperationV1
  | SceneCueRemoveOperationV1
  | SceneCueSetMotionOperationV1;

export type SceneAuthoringDiagnosticCodeV1 =
  | "scene_authoring.operation_schema_unsupported"
  | "scene_authoring.operation_kind_unknown"
  | "scene_authoring.operation_payload_invalid"
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
  | { readonly kind: "reduced"; readonly document: SceneDocumentV1 }
  | { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 };

export interface SceneAuthoringExecutionEnvelopeV1 {
  readonly documentIdentity: string;
  readonly expectedDraftRevision: number;
  readonly operation: SceneAuthoringOperationV1;
  readonly coalesceKey?: string;
}

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
