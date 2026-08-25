// SPDX-License-Identifier: MIT
// This application-owned projection imports Studio contracts as types only.
// The ordinary Player graph does not gain a Studio runtime dependency.
import type {
  CodeSurfaceFaultV1,
  CodeSurfaceInspectionV1,
  CodeSurfaceNodeLifecycleEventV1,
} from "@sillymaker/ui/code-surface";
import type {
  RuntimeInspectorAcquireTimingV1,
  RuntimeInspectorCodeSurfaceNodeFacetV1,
  RuntimeInspectorDiagnosticV1,
  RuntimeInspectorOwnerStatusV1,
  RuntimeInspectorSnapshotV1,
  RuntimeInspectorSourceV1,
  RuntimeInspectorUnitFacetV1,
  RuntimeInspectorUnitIdentityV1,
  RuntimeInspectorUnitKindV1,
  RuntimeInspectorUnitReferenceV1,
} from "@sillymaker/studio";

export interface LabRuntimeInspectorUnitDeclarationV1 {
  readonly kind: RuntimeInspectorUnitKindV1;
  readonly unitId: string;
  readonly source: string | null;
  readonly references?: readonly RuntimeInspectorUnitReferenceV1[];
}

export interface LabRuntimeInspectorOwnerV1 {
  readonly ownerId: string;
  acquiring(kind: RuntimeInspectorUnitKindV1, unitId: string): void;
  loaded(
    kind: RuntimeInspectorUnitKindV1,
    unitId: string,
    timing: RuntimeInspectorAcquireTimingV1,
  ): void;
  failed(
    kind: RuntimeInspectorUnitKindV1,
    unitId: string,
    diagnostic: RuntimeInspectorDiagnosticV1,
  ): void;
  setCurrent(references: readonly RuntimeInspectorUnitIdentityV1[]): void;
  installCodeSurfaceInspection(inspection: CodeSurfaceInspectionV1): void;
  observeCodeSurfaceLifecycle(event: CodeSurfaceNodeLifecycleEventV1): void;
  reportCodeSurfaceFault(fault: CodeSurfaceFaultV1): void;
  setRetry(
    kind: RuntimeInspectorUnitKindV1,
    unitId: string,
    retry: () => Promise<boolean>,
  ): void;
  projectUnit(input: {
    readonly kind: RuntimeInspectorUnitKindV1;
    readonly unitId: string;
    readonly status: RuntimeInspectorUnitFacetV1["status"];
    readonly attempt: number;
    readonly failureCount: number;
    readonly timing: RuntimeInspectorAcquireTimingV1 | null;
    readonly diagnostic: RuntimeInspectorDiagnosticV1 | null;
  }): void;
  activate(): void;
  retire(): void;
}

interface MutableUnitV1 {
  readonly kind: RuntimeInspectorUnitKindV1;
  readonly unitId: string;
  readonly source: string | null;
  readonly references: readonly RuntimeInspectorUnitReferenceV1[];
  touched: boolean;
  status: RuntimeInspectorUnitFacetV1["status"];
  attempt: number;
  failureCount: number;
  timing: RuntimeInspectorAcquireTimingV1 | null;
  diagnostic: RuntimeInspectorDiagnosticV1 | null;
  retry: (() => Promise<boolean>) | null;
}

interface MutableCodeSurfaceNodeV1
  extends Omit<RuntimeInspectorCodeSurfaceNodeFacetV1, "ownerId" | "lifecycle" | "diagnostic"> {
  lifecycle: RuntimeInspectorCodeSurfaceNodeFacetV1["lifecycle"];
  diagnostic: RuntimeInspectorDiagnosticV1 | null;
}

interface OwnerV1 {
  readonly ownerId: string;
  status: RuntimeInspectorOwnerStatusV1;
  readonly units: Map<string, MutableUnitV1>;
  readonly codeSurfaceNodes: Map<string, MutableCodeSurfaceNodeV1>;
  currentKeys: Set<string>;
}

function unitKeyV1(kind: RuntimeInspectorUnitKindV1, unitId: string): string {
  return `${kind}\0${unitId}`;
}

function codeSurfaceNodeKeyV1(compositionId: string, nodeId: string): string {
  return `${compositionId}\0${nodeId}`;
}

function emptySnapshotV1(): RuntimeInspectorSnapshotV1 {
  return {
    revision: 0,
    activeOwnerId: null,
    units: [],
    codeSurfaceNodes: [],
    workingSet: {
      references: 0,
      unloaded: 0,
      acquiring: 0,
      loaded: 0,
      failed: 0,
      released: 0,
    },
  };
}

const listenersV1 = new Set<() => void>();
const ownersV1 = new Map<string, OwnerV1>();
const detachedOwnerIdV1 = "engine-lab.runtime.detached";
let detachedDeclarationsV1: readonly LabRuntimeInspectorUnitDeclarationV1[] = [];
let activeOwnerIdV1: string | null = null;
let nextOwnerIdV1 = 1;
let revisionV1 = 0;
let snapshotDirtyV1 = false;
let snapshotV1 = emptySnapshotV1();
let codeSurfaceNotificationScheduledV1 = false;
let codeSurfaceNotificationPendingV1 = false;

function ownerRankV1(status: RuntimeInspectorOwnerStatusV1): number {
  switch (status) {
    case "active":
      return 0;
    case "staging":
      return 1;
    case "retired":
      return 2;
    case "detached":
      return 3;
  }
  return status satisfies never;
}

function materializeSnapshotV1(): RuntimeInspectorSnapshotV1 {
  if (!snapshotDirtyV1) return snapshotV1;
  const owners = [...ownersV1.values()].toSorted((left, right) =>
    ownerRankV1(left.status) - ownerRankV1(right.status) ||
    left.ownerId.localeCompare(right.ownerId)
  );
  const units = owners.flatMap((owner) =>
    [...owner.units.entries()]
      .filter(([, unit]) => owner.status === "active" || unit.touched)
      .map(([key, unit]): RuntimeInspectorUnitFacetV1 => ({
        kind: unit.kind,
        unitId: unit.unitId,
        source: unit.source,
        ownerId: owner.ownerId,
        ownerStatus: owner.status,
        status: unit.status,
        current: owner.currentKeys.has(key),
        attempt: unit.attempt,
        failureCount: unit.failureCount,
        retryable: owner.status !== "retired" && unit.status === "failed" && unit.retry !== null,
        timing: unit.timing,
        diagnostic: unit.diagnostic,
        references: unit.references,
      })).toSorted((left, right) =>
        left.kind.localeCompare(right.kind) || left.unitId.localeCompare(right.unitId)
      )
  );
  const hasLiveOwner = owners.some((owner) => owner.status !== "retired");
  if (!hasLiveOwner) {
    units.push(...detachedDeclarationsV1.map((declaration): RuntimeInspectorUnitFacetV1 => ({
      kind: declaration.kind,
      unitId: declaration.unitId,
      source: declaration.source,
      ownerId: detachedOwnerIdV1,
      ownerStatus: "detached",
      status: "unloaded",
      current: false,
      attempt: 0,
      failureCount: 0,
      retryable: false,
      timing: null,
      diagnostic: null,
      references: declaration.references ?? [],
    })));
  }
  const codeSurfaceNodes = owners.flatMap((owner) =>
    [...owner.codeSurfaceNodes.values()].map((node): RuntimeInspectorCodeSurfaceNodeFacetV1 => ({
      ...node,
      ownerId: owner.ownerId,
    })).toSorted((left, right) =>
      left.compositionId.localeCompare(right.compositionId) ||
      left.documentPath.localeCompare(right.documentPath)
    )
  );
  const activeUnits = activeOwnerIdV1 === null
    ? []
    : [...(ownersV1.get(activeOwnerIdV1)?.units.values() ?? [])];
  const count = (status: MutableUnitV1["status"]): number =>
    activeUnits.filter((unit) => unit.status === status).length;
  snapshotV1 = {
    revision: revisionV1,
    activeOwnerId: activeOwnerIdV1,
    units,
    codeSurfaceNodes,
    workingSet: {
      references: activeUnits.length,
      unloaded: count("unloaded"),
      acquiring: count("acquiring"),
      loaded: count("loaded"),
      failed: count("failed"),
      released: count("released"),
    },
  };
  snapshotDirtyV1 = false;
  return snapshotV1;
}

function publishV1(): void {
  revisionV1 += 1;
  snapshotDirtyV1 = true;
  // An ordinary owner/fault transition already includes every earlier
  // node-local lifecycle update, so the queued lifecycle notification can
  // become inert instead of publishing the same final snapshot twice.
  codeSurfaceNotificationPendingV1 = false;
  if (listenersV1.size === 0) return;
  materializeSnapshotV1();
  for (const listener of listenersV1) listener();
}

/**
 * Coalesces one React effect flush without delaying the mutable projection.
 * An explicit getSnapshot still materializes the latest node states
 * synchronously; subscribers only skip intermediate mount-wave inventories.
 */
function publishCodeSurfaceLifecycleV1(): void {
  revisionV1 += 1;
  snapshotDirtyV1 = true;
  if (listenersV1.size === 0) return;
  codeSurfaceNotificationPendingV1 = true;
  if (codeSurfaceNotificationScheduledV1) return;
  codeSurfaceNotificationScheduledV1 = true;
  queueMicrotask(() => {
    codeSurfaceNotificationScheduledV1 = false;
    if (!codeSurfaceNotificationPendingV1) return;
    codeSurfaceNotificationPendingV1 = false;
    if (listenersV1.size === 0) return;
    materializeSnapshotV1();
    for (const listener of listenersV1) listener();
  });
}

function mutableOwnerV1(ownerId: string): OwnerV1 | null {
  const owner = ownersV1.get(ownerId);
  return owner === undefined || owner.status === "retired" ? null : owner;
}

function mutableUnitV1(
  owner: OwnerV1,
  kind: RuntimeInspectorUnitKindV1,
  unitId: string,
): MutableUnitV1 | null {
  return owner.units.get(unitKeyV1(kind, unitId)) ?? null;
}

function sameKeysV1(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const key of left) if (!right.has(key)) return false;
  return true;
}

function sameTimingV1(
  left: RuntimeInspectorAcquireTimingV1 | null,
  right: RuntimeInspectorAcquireTimingV1 | null,
): boolean {
  return left === right || (left !== null && right !== null &&
    left.loadMs === right.loadMs && left.admitMs === right.admitMs &&
    left.activateMs === right.activateMs && left.totalMs === right.totalMs);
}

function sameDiagnosticV1(
  left: RuntimeInspectorDiagnosticV1 | null,
  right: RuntimeInspectorDiagnosticV1 | null,
): boolean {
  return left === right || (left !== null && right !== null &&
    left.code === right.code && left.detail === right.detail);
}

function pruneRetiredOwnersV1(keepOwnerId: string | null): void {
  const retired = [...ownersV1.values()].filter((owner) => owner.status === "retired");
  const keep = retired.find((owner) => owner.ownerId === keepOwnerId) ?? retired.at(-1) ?? null;
  for (const owner of retired) {
    if (owner !== keep) ownersV1.delete(owner.ownerId);
  }
}

function retireOwnerV1(owner: OwnerV1): void {
  owner.status = "retired";
  owner.currentKeys.clear();
  for (const [key, unit] of owner.units) {
    if (!unit.touched) {
      owner.units.delete(key);
      continue;
    }
    unit.status = "released";
  }
  for (const node of owner.codeSurfaceNodes.values()) node.lifecycle = "released";
}

/** Static summaries for the standalone Inspector's explicitly disconnected view. */
export function declareLabRuntimeInspectorDetachedUnitsV1(
  declarations: readonly LabRuntimeInspectorUnitDeclarationV1[],
): void {
  detachedDeclarationsV1 = [...new Map(
    declarations.map((
      declaration,
    ) => [unitKeyV1(declaration.kind, declaration.unitId), declaration]),
  ).values()];
  publishV1();
}

export const labRuntimeInspectorSourceV1: RuntimeInspectorSourceV1 = {
  getSnapshot: materializeSnapshotV1,
  subscribe(listener) {
    listenersV1.add(listener);
    return () => listenersV1.delete(listener);
  },
  async retry(input): Promise<boolean> {
    const owner = mutableOwnerV1(input.ownerId);
    if (owner === null) return false;
    const unit = mutableUnitV1(owner, input.kind, input.unitId);
    if (unit === null || unit.status !== "failed" || unit.retry === null) return false;
    try {
      return await unit.retry();
    } catch {
      return false;
    }
  },
};

/** One controller per application generation; it never owns or retrieves a runtime plan. */
export function createLabRuntimeInspectorOwnerV1(
  declarations: readonly LabRuntimeInspectorUnitDeclarationV1[],
): LabRuntimeInspectorOwnerV1 {
  const ownerId = `engine-lab.runtime.${String(nextOwnerIdV1++)}`;
  const units = new Map<string, MutableUnitV1>();
  for (const declaration of declarations) {
    units.set(unitKeyV1(declaration.kind, declaration.unitId), {
      kind: declaration.kind,
      unitId: declaration.unitId,
      source: declaration.source,
      references: declaration.references ?? [],
      touched: false,
      status: "unloaded",
      attempt: 0,
      failureCount: 0,
      timing: null,
      diagnostic: null,
      retry: null,
    });
  }
  const owner: OwnerV1 = {
    ownerId,
    status: "staging",
    units,
    codeSurfaceNodes: new Map(),
    currentKeys: new Set(),
  };
  ownersV1.set(ownerId, owner);
  publishV1();

  return {
    ownerId,
    acquiring(kind, unitId): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const unit = mutableUnitV1(currentOwner, kind, unitId);
      if (unit === null) return;
      unit.touched = true;
      unit.status = "acquiring";
      unit.attempt += 1;
      publishV1();
    },
    loaded(kind, unitId, timing): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const unit = mutableUnitV1(currentOwner, kind, unitId);
      if (unit === null) return;
      unit.touched = true;
      unit.status = "loaded";
      unit.timing = timing;
      unit.diagnostic = null;
      publishV1();
    },
    failed(kind, unitId, diagnostic): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const unit = mutableUnitV1(currentOwner, kind, unitId);
      if (unit === null) return;
      unit.touched = true;
      unit.status = "failed";
      unit.failureCount += 1;
      unit.diagnostic = diagnostic;
      publishV1();
    },
    setCurrent(references): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const next = new Set(
        references
          .map((reference) => unitKeyV1(reference.kind, reference.unitId))
          .filter((key) => currentOwner.units.has(key)),
      );
      if (sameKeysV1(currentOwner.currentKeys, next)) return;
      currentOwner.currentKeys = next;
      publishV1();
    },
    installCodeSurfaceInspection(inspection): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      for (const node of inspection.nodes) {
        currentOwner.codeSurfaceNodes.set(
          codeSurfaceNodeKeyV1(inspection.compositionId, node.nodeId),
          {
            compositionId: inspection.compositionId,
            nodeId: node.nodeId,
            viewId: node.viewId,
            parentNodeId: node.parentNodeId,
            slotId: node.slotId,
            documentPath: node.documentPath,
            source: node.source,
            layoutDomain: node.layoutDomain,
            outerGeometryOwner: node.outerGeometryOwner,
            lifecycle: "declared",
            label: node.authoring.label,
            preview: node.authoring.preview,
            stateOwner: node.authoring.stateOwner,
            policy: node.policy,
            diagnostic: null,
          },
        );
      }
      publishV1();
    },
    observeCodeSurfaceLifecycle(event): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const node = currentOwner.codeSurfaceNodes.get(
        codeSurfaceNodeKeyV1(event.compositionId, event.nodeId),
      );
      if (node === undefined) return;
      if (event.phase === "released" && node.lifecycle === "faulted") return;
      const next = event.phase;
      if (node.lifecycle === next && node.diagnostic === null) return;
      node.lifecycle = next;
      if (next !== "released") node.diagnostic = null;
      publishCodeSurfaceLifecycleV1();
    },
    reportCodeSurfaceFault(fault): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const node = currentOwner.codeSurfaceNodes.get(
        codeSurfaceNodeKeyV1(fault.compositionId, fault.nodeId),
      );
      if (node === undefined) return;
      node.lifecycle = "faulted";
      node.diagnostic = {
        code: "ui.code_surface.node_fault",
        ...(fault.error instanceof Error ? { detail: fault.error.message } : {}),
      };
      publishV1();
    },
    setRetry(kind, unitId, retry): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const unit = mutableUnitV1(currentOwner, kind, unitId);
      if (unit === null) return;
      unit.retry = retry;
    },
    projectUnit(input): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const unit = mutableUnitV1(currentOwner, input.kind, input.unitId);
      if (unit === null) return;
      const touched = unit.touched || input.status !== "unloaded" || input.attempt > 0 ||
        input.failureCount > 0 || input.timing !== null || input.diagnostic !== null;
      if (
        unit.touched === touched && unit.status === input.status &&
        unit.attempt === input.attempt &&
        unit.failureCount === input.failureCount && sameTimingV1(unit.timing, input.timing) &&
        sameDiagnosticV1(unit.diagnostic, input.diagnostic)
      ) return;
      unit.touched = touched;
      unit.status = input.status;
      unit.attempt = input.attempt;
      unit.failureCount = input.failureCount;
      unit.timing = input.timing;
      unit.diagnostic = input.diagnostic;
      publishV1();
    },
    activate(): void {
      const currentOwner = mutableOwnerV1(ownerId);
      if (currentOwner === null) return;
      const predecessorId = activeOwnerIdV1;
      if (predecessorId !== null && predecessorId !== ownerId) {
        const predecessor = ownersV1.get(predecessorId);
        if (predecessor !== undefined) {
          retireOwnerV1(predecessor);
        }
      }
      activeOwnerIdV1 = ownerId;
      currentOwner.status = "active";
      pruneRetiredOwnersV1(predecessorId);
      publishV1();
    },
    retire(): void {
      const currentOwner = ownersV1.get(ownerId);
      if (currentOwner === undefined || currentOwner.status === "retired") return;
      retireOwnerV1(currentOwner);
      if (activeOwnerIdV1 === ownerId) activeOwnerIdV1 = null;
      pruneRetiredOwnersV1(ownerId);
      publishV1();
    },
  };
}
