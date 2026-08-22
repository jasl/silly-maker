// SPDX-License-Identifier: MIT

export const uiArtifactSchemaRevisionInternalV1 = 1;
export const uiIntentSchemaRevisionInternalV1 = 1;

export type UiArtifactNodeInternalV1 =
  | {
    readonly kind: "column";
    readonly nodeId: string;
    readonly children: readonly UiArtifactNodeInternalV1[];
  }
  | { readonly kind: "text"; readonly nodeId: string; readonly text: string }
  | {
    readonly kind: "action";
    readonly nodeId: string;
    readonly label: string;
    readonly actionId: string;
  };

export interface UiArtifactDocumentInternalV1 {
  readonly schemaRevision: typeof uiArtifactSchemaRevisionInternalV1;
  readonly root: UiArtifactNodeInternalV1;
}

export interface UiArtifactRevisionInternalV1 {
  readonly hostIdentity: number;
  readonly revision: number;
  readonly source: {
    readonly sessionId: string;
    readonly runId: string;
    readonly completedSequence: number;
  };
  readonly document: UiArtifactDocumentInternalV1;
}

export interface UiIntentInternalV1 {
  readonly schemaRevision: typeof uiIntentSchemaRevisionInternalV1;
  readonly kind: "ui.action.invoke";
  readonly hostIdentity: number;
  readonly artifactRevision: number;
  readonly nodeId: string;
  readonly actionId: string;
}

export interface UiArtifactDiagnosticInternalV1 {
  readonly code:
    | "artifact.canonical_invalid"
    | "artifact.limit_exceeded"
    | "artifact.schema_unsupported"
    | "artifact.payload_invalid"
    | "artifact.node_unknown"
    | "artifact.node_duplicate"
    | "artifact.action_unknown";
  readonly path: string;
}

export interface UiIntentDiagnosticInternalV1 {
  readonly code:
    | "ui_intent.invalid"
    | "ui_intent.host_stale"
    | "ui_intent.artifact_stale"
    | "ui_intent.action_mismatch";
  readonly path: string;
}

export type UiArtifactAdmissionResultInternalV1 =
  | { readonly kind: "admitted"; readonly document: UiArtifactDocumentInternalV1 }
  | { readonly kind: "rejected"; readonly diagnostic: UiArtifactDiagnosticInternalV1 };

export type UiIntentAdmissionResultInternalV1 =
  | { readonly kind: "admitted"; readonly intent: UiIntentInternalV1 }
  | { readonly kind: "rejected"; readonly diagnostic: UiIntentDiagnosticInternalV1 };
