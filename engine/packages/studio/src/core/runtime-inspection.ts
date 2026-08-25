// SPDX-License-Identifier: MIT

/** Runtime unit kinds the Inspector can present without owning their loaders. */
export type RuntimeInspectorUnitKindV1 = "text" | "scene" | "narrative" | "gui";
export type RuntimeInspectorReferenceKindV1 = RuntimeInspectorUnitKindV1 | "asset";

export type RuntimeInspectorUnitStatusV1 =
  | "unloaded"
  | "acquiring"
  | "loaded"
  | "failed"
  | "released";

export type RuntimeInspectorOwnerStatusV1 = "detached" | "staging" | "active" | "retired";

export interface RuntimeInspectorUnitIdentityV1 {
  readonly kind: RuntimeInspectorUnitKindV1;
  readonly unitId: string;
}

export interface RuntimeInspectorUnitReferenceV1 {
  readonly kind: RuntimeInspectorReferenceKindV1;
  readonly unitId: string;
}

export interface RuntimeInspectorAcquireTimingV1 {
  readonly loadMs: number;
  readonly admitMs: number;
  readonly activateMs: number;
  readonly totalMs: number;
}

export interface RuntimeInspectorDiagnosticV1 {
  readonly code: string;
  readonly detail?: string;
}

/**
 * Application-owned projection of one type-specific runtime owner. This is
 * diagnostic data, not another residency registry or a loading API.
 */
export interface RuntimeInspectorUnitFacetV1 {
  readonly kind: RuntimeInspectorUnitKindV1;
  readonly unitId: string;
  readonly source: string | null;
  readonly ownerId: string;
  readonly ownerStatus: RuntimeInspectorOwnerStatusV1;
  readonly status: RuntimeInspectorUnitStatusV1;
  readonly current: boolean;
  readonly attempt: number;
  readonly failureCount: number;
  readonly retryable: boolean;
  readonly timing: RuntimeInspectorAcquireTimingV1 | null;
  readonly diagnostic: RuntimeInspectorDiagnosticV1 | null;
  readonly references: readonly RuntimeInspectorUnitReferenceV1[];
}

export type RuntimeInspectorCodeSurfaceLifecycleV1 =
  | "declared"
  | "loading"
  | "mounted"
  | "faulted"
  | "released";

/** Static Code Surface metadata plus the latest observed node lifecycle. */
export interface RuntimeInspectorCodeSurfaceNodeFacetV1 {
  readonly ownerId: string;
  readonly compositionId: string;
  readonly nodeId: string;
  readonly viewId: string;
  readonly parentNodeId: string | null;
  readonly slotId: string | null;
  readonly documentPath: string;
  readonly source: string | null;
  readonly layoutDomain: "application" | "parent_slot";
  readonly outerGeometryOwner: "application" | "parent_code_surface";
  readonly lifecycle: RuntimeInspectorCodeSurfaceLifecycleV1;
  readonly label: string;
  readonly preview: "opaque" | "slots";
  readonly stateOwner: "react_local" | "ui_session" | "external_rpc" | "authoritative_via_port";
  readonly policy: {
    readonly input: "application" | "gameplay_passthrough";
    readonly nativeText: "allowed" | "none";
    readonly portal: "none" | "application_owned";
  };
  readonly diagnostic: RuntimeInspectorDiagnosticV1 | null;
}

export interface RuntimeInspectorWorkingSetV1 {
  readonly references: number;
  readonly unloaded: number;
  readonly acquiring: number;
  readonly loaded: number;
  readonly failed: number;
  readonly released: number;
}

export interface RuntimeInspectorSnapshotV1 {
  readonly revision: number;
  readonly activeOwnerId: string | null;
  readonly units: readonly RuntimeInspectorUnitFacetV1[];
  readonly codeSurfaceNodes: readonly RuntimeInspectorCodeSurfaceNodeFacetV1[];
  readonly workingSet: RuntimeInspectorWorkingSetV1;
}

/** Read-only application seam consumed by standalone or embedded Inspector. */
export interface RuntimeInspectorSourceV1 {
  getSnapshot(): RuntimeInspectorSnapshotV1;
  subscribe(listener: () => void): () => void;
  /** Explicitly retries an already-failed acquisition through its real owner. */
  retry(input: {
    readonly ownerId: string;
    readonly kind: RuntimeInspectorUnitKindV1;
    readonly unitId: string;
  }): Promise<boolean>;
}
