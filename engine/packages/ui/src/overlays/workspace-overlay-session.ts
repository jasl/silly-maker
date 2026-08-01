// SPDX-License-Identifier: MIT
import {
  type DeepReadonly,
  type NonNegativeSafeInteger,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type { ReactNode } from "react";

import type { InputRouterV1 } from "../input/contracts.ts";
import { systemInputActionIdsV1 } from "../input/contracts.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDismissKindV1,
  type ManagedSurfaceInstanceIdV1,
  type ManagedSurfacePublicationV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceTransitionReceiptV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  ManagedSurfaceHandleV1,
  ManagedSurfaceReadinessAdapterV1,
} from "../managed-surfaces/managed-surface-coordinator.ts";
import {
  createManagedSurfaceCoordinatorLifetimeV1,
  type ManagedSurfaceApplicationEpochAllocatorV1,
  type ManagedSurfaceCoordinatorRuntimeV1,
  type ManagedSurfaceCoordinatorSuccessorKindV1,
} from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";

export const maximumOverlayDetailDepthV1 = 4 as const;

export interface WorkspaceOverlayExactIdSchemaV1 {
  readonly kind: "exact_id";
}

export interface WorkspaceOverlayDefinitionV1<TOverlayId extends string> {
  readonly id: TOverlayId;
  readonly contractRevision: number;
  readonly targetSchema: WorkspaceOverlayExactIdSchemaV1;
  readonly dismissible: boolean;
  readonly requiredPortIds: readonly string[];
}

/** A composition-owned concrete port made available to Overlay definitions. */
export interface WorkspaceOverlayPortBindingV1 {
  readonly id: string;
  readonly port: object;
}

export interface DefineWorkspaceOverlayInputV1<TOverlayId extends string> {
  readonly id: TOverlayId;
  readonly contractRevision: number;
  readonly dismissible?: boolean;
  readonly requiredPortIds?: readonly string[];
}

export interface OverlayRendererResolutionV1 {
  readonly accessibleName: string;
  readonly content: ReactNode;
  /** Optional asynchronous preparation. The Host alone settles its readiness receipt. */
  prepare?(): void | PromiseLike<void>;
}

export interface OverlayRendererResolverV1<TOverlayId> {
  resolve(id: DeepReadonly<TOverlayId>): OverlayRendererResolutionV1 | null;
}

export interface OverlaySessionStateV1<TOverlayId> {
  readonly primaryId: TOverlayId | null;
  readonly detailIds: readonly TOverlayId[];
}

export type OverlayAdmissionRejectionV1 =
  | { readonly kind: "rejected"; readonly code: "overlay.definition_missing" }
  | { readonly kind: "rejected"; readonly code: "overlay.definition_ambiguous" }
  | { readonly kind: "rejected"; readonly code: "overlay.contract_revision_invalid" }
  | { readonly kind: "rejected"; readonly code: "overlay.schema_invalid" }
  | { readonly kind: "rejected"; readonly code: "overlay.renderer_unavailable" }
  | { readonly kind: "rejected"; readonly code: "overlay.renderer_missing" }
  | {
    readonly kind: "rejected";
    readonly code: "overlay.required_port_missing";
    readonly portId: string;
  }
  | { readonly kind: "rejected"; readonly code: "overlay.no_primary" }
  | { readonly kind: "rejected"; readonly code: "overlay.duplicate" }
  | { readonly kind: "rejected"; readonly code: "overlay.detail_limit" }
  | { readonly kind: "rejected"; readonly code: "overlay.invalid_parent" }
  | { readonly kind: "rejected"; readonly code: "overlay.invalid_transition" }
  | { readonly kind: "rejected"; readonly code: "overlay.disposed" };

export type OverlayOpenResultV1 =
  | { readonly kind: "preparing"; readonly code: "overlay.preparation_started" }
  | { readonly kind: "unchanged"; readonly code: "overlay.already_open" }
  | OverlayAdmissionRejectionV1
  | { readonly kind: "faulted"; readonly code: "overlay.renderer_faulted" }
  | { readonly kind: "faulted"; readonly code: "overlay.transition_faulted" };

export type OverlayPushDetailResultV1 = OverlayOpenResultV1;
export type OverlayCloseTopResultV1 = "detail_closed" | "primary_closed" | "already_closed";

export interface OverlaySessionStoreV1<TOverlayId extends string> {
  getSnapshot(): DeepReadonly<OverlaySessionStateV1<TOverlayId>>;
  subscribe(listener: () => void): () => void;
  openPrimary(id: TOverlayId): OverlayOpenResultV1;
  pushDetail(id: TOverlayId): OverlayPushDetailResultV1;
  closeTop(): OverlayCloseTopResultV1;
  closeAll(): void;
}

interface ParsedWorkspaceOverlayDefinitionV1<TOverlayId extends string> {
  readonly definition: WorkspaceOverlayDefinitionV1<TOverlayId>;
  readonly primary: ManagedSurfaceResolvedDefinitionV1;
  readonly detail: ManagedSurfaceResolvedDefinitionV1;
}

interface WorkspaceOverlayRenderRecordV1<TOverlayId extends string> {
  readonly overlayId: TOverlayId;
  readonly resolution: OverlayRendererResolutionV1;
  readonly readiness: ManagedSurfaceReadinessAdapterV1;
  preparation: Promise<WorkspaceOverlayReadinessOutcomeInternalV1> | null;
}

export interface WorkspaceOverlayRenderEntryInternalV1<TOverlayId extends string> {
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly phase: "preparing" | "active" | "suspended" | "exiting";
  readonly readiness: "preparing" | "ready";
  readonly overlayId: TOverlayId;
  readonly resolution: OverlayRendererResolutionV1;
}

export interface WorkspaceOverlayRenderSnapshotInternalV1<TOverlayId extends string> {
  readonly publication: DeepReadonly<ManagedSurfacePublicationV1>;
  readonly entries: readonly WorkspaceOverlayRenderEntryInternalV1<TOverlayId>[];
}

export type WorkspaceOverlayReadinessOutcomeInternalV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "failed" }
  | { readonly kind: "stale"; readonly code: "overlay.stale_readiness" };

export interface WorkspaceOverlaySessionInternalV1<TOverlayId extends string>
  extends OverlaySessionStoreV1<TOverlayId> {
  getManagedSnapshotInternalV1(): DeepReadonly<ManagedSurfacePublicationV1>;
  getRenderSnapshotInternalV1(): WorkspaceOverlayRenderSnapshotInternalV1<TOverlayId>;
  attachRendererResolverInternalV1(resolver: OverlayRendererResolverV1<TOverlayId>): () => void;
  beginCandidatePreparationInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): Promise<WorkspaceOverlayReadinessOutcomeInternalV1>;
  failCandidatePreparationInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
    error: unknown,
  ): WorkspaceOverlayReadinessOutcomeInternalV1;
  closeExpectedInternalV1(handle: ManagedSurfaceHandleV1): ManagedSurfaceTransitionReceiptV1;
  closeRenderFaultInternalV1(
    handle: ManagedSurfaceHandleV1,
    error: unknown,
  ): ManagedSurfaceTransitionReceiptV1;
  routeDismissInternalV1(
    handle: ManagedSurfaceHandleV1,
    kind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
  routeFallbackDismissInternalV1(
    candidateInstanceId: ManagedSurfaceInstanceIdV1,
    kind: ManagedSurfaceDismissKindV1,
  ): void;
  getHandleInternalV1(surfaceInstanceId: ManagedSurfaceInstanceIdV1): ManagedSurfaceHandleV1 | null;
  rotateEpochInternalV1(kind: ManagedSurfaceCoordinatorSuccessorKindV1): void;
  disposeInternalV1(): void;
}

export interface CreateWorkspaceOverlaySessionInternalInputV1<TOverlayId extends string> {
  readonly inputRouter: InputRouterV1;
  readonly epochAllocator: ManagedSurfaceApplicationEpochAllocatorV1;
  readonly definitions: readonly WorkspaceOverlayDefinitionV1<TOverlayId>[];
  readonly availablePorts?: readonly WorkspaceOverlayPortBindingV1[];
  readonly reportFailure?: (code: string, error: unknown) => void;
}

const workspaceOverlaySessionInternalsV1 = new WeakMap<
  OverlaySessionStoreV1<string>,
  WorkspaceOverlaySessionInternalV1<string>
>();

export function createWorkspaceOverlayPublicSessionInternalV1<TOverlayId extends string>(
  internal: WorkspaceOverlaySessionInternalV1<TOverlayId>,
): OverlaySessionStoreV1<TOverlayId> {
  const session: OverlaySessionStoreV1<TOverlayId> = Object.freeze({
    getSnapshot: internal.getSnapshot,
    subscribe: internal.subscribe,
    openPrimary: internal.openPrimary,
    pushDetail: internal.pushDetail,
    closeTop: internal.closeTop,
    closeAll: internal.closeAll,
  });
  workspaceOverlaySessionInternalsV1.set(
    session as OverlaySessionStoreV1<string>,
    internal as WorkspaceOverlaySessionInternalV1<string>,
  );
  return session;
}

export function resolveWorkspaceOverlaySessionInternalV1<TOverlayId extends string>(
  session: OverlaySessionStoreV1<TOverlayId>,
): WorkspaceOverlaySessionInternalV1<TOverlayId> {
  const internal = workspaceOverlaySessionInternalsV1.get(
    session as OverlaySessionStoreV1<string>,
  );
  if (internal === undefined) {
    throw new TypeError("ui.workspace_overlay_coordinator_session_required");
  }
  return internal as WorkspaceOverlaySessionInternalV1<TOverlayId>;
}

const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace-overlay");
const primarySlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.workspace-overlay.primary");
const detailSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.workspace-overlay.detail");
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.workspace-overlay");
const focusTargetIdV1 = parseManagedSurfaceFocusTargetIdV1(
  "surface-focus.workspace-overlay.content",
);
const readinessPolicyV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});
const exactIdSchemaV1 = Object.freeze({ kind: "exact_id" as const });
const preparingResultV1 = Object.freeze({
  kind: "preparing" as const,
  code: "overlay.preparation_started" as const,
});
const alreadyOpenResultV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "overlay.already_open" as const,
});

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeysV1(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function denseOwnArraySnapshotV1(value: unknown, errorCode: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(errorCode);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== value.length + 1) throw new TypeError(errorCode);
  const snapshot: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) throw new TypeError(errorCode);
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

/** @internal Captures author configuration without invoking caller array methods. */
export function snapshotWorkspaceOverlayDefinitionsInternalV1<TOverlayId extends string>(
  definitions: readonly WorkspaceOverlayDefinitionV1<TOverlayId>[],
): readonly WorkspaceOverlayDefinitionV1<TOverlayId>[] {
  return denseOwnArraySnapshotV1(
    definitions,
    "ui.workspace_overlay_definitions_invalid",
  ) as readonly WorkspaceOverlayDefinitionV1<TOverlayId>[];
}

function freezePortIdsV1(portIds: unknown): readonly string[] {
  const input = denseOwnArraySnapshotV1(
    portIds,
    "ui.workspace_overlay_required_port_ids_invalid",
  );
  const parsed: string[] = [];
  for (const portId of input) parsed.push(parseModuleId(portId));
  if (new Set(parsed).size !== parsed.length) {
    throw new TypeError("ui.workspace_overlay_duplicate_required_port");
  }
  return Object.freeze(parsed);
}

function availablePortIdSetV1(
  bindings: readonly WorkspaceOverlayPortBindingV1[],
): ReadonlySet<string> {
  const portIds = new Set<string>();
  const snapshot = denseOwnArraySnapshotV1(
    bindings,
    "ui.workspace_overlay_port_bindings_invalid",
  );
  for (const binding of snapshot) {
    if (
      !isRecordV1(binding) ||
      !hasExactKeysV1(binding, ["id", "port"]) ||
      (typeof binding.port !== "object" && typeof binding.port !== "function") ||
      binding.port === null
    ) {
      throw new TypeError("ui.workspace_overlay_port_binding_invalid");
    }
    const portId = parseModuleId(binding.id);
    if (portIds.has(portId)) {
      throw new TypeError("ui.workspace_overlay_duplicate_port_binding");
    }
    portIds.add(portId);
  }
  return portIds;
}

export function defineWorkspaceOverlayV1<const TOverlayId extends string>(
  input: DefineWorkspaceOverlayInputV1<TOverlayId>,
): WorkspaceOverlayDefinitionV1<TOverlayId> {
  const id = parseModuleId(input.id) as unknown as TOverlayId;
  const contractRevision = parsePositiveSafeInteger(input.contractRevision);
  definitionIdV1(id, "primary");
  definitionIdV1(id, "detail");
  return Object.freeze({
    id,
    contractRevision,
    targetSchema: exactIdSchemaV1,
    dismissible: input.dismissible ?? true,
    requiredPortIds: freezePortIdsV1(input.requiredPortIds ?? []),
  });
}

function definitionIdV1(id: string, placement: "primary" | "detail") {
  return parseManagedSurfaceDefinitionIdV1(`surface.workspace-overlay.${placement}.${id}`);
}

function managedDefinitionV1(
  definition: WorkspaceOverlayDefinitionV1<string>,
  placement: "primary" | "detail",
): ManagedSurfaceResolvedDefinitionV1 {
  const dismissible = definition.dismissible;
  return Object.freeze({
    definitionId: definitionIdV1(definition.id, placement),
    contractRevision: parsePositiveSafeInteger(definition.contractRevision),
    ownerId: ownerIdV1,
    slotId: placement === "primary" ? primarySlotIdV1 : detailSlotIdV1,
    layerId: layerIdV1,
    layerOrder: parseNonNegativeSafeInteger(50),
    placement: placement === "primary" ? "root" : "child",
    modality: "blocking",
    inputPolicy: Object.freeze({ kind: "managed" as const, inputContextId: "overlay" as const }),
    dismissPolicy: Object.freeze({
      back: dismissible,
      escape: dismissible,
      backdrop: dismissible,
      routedCancel: dismissible,
    }),
    focusPolicy: Object.freeze({
      kind: "owns_focus" as const,
      initialTargetId: focusTargetIdV1,
      trap: true,
      restore: "opener" as const,
    }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([
      parseManagedSurfaceActionIdV1(systemInputActionIdsV1.cancel),
    ]),
    readiness: readinessPolicyV1,
  });
}

function parseDefinitionForRequestV1<TOverlayId extends string>(
  raw: unknown,
  requestedId: TOverlayId,
): ParsedWorkspaceOverlayDefinitionV1<TOverlayId> | OverlayAdmissionRejectionV1 {
  if (!isRecordV1(raw) || raw.id !== requestedId) {
    return Object.freeze({ kind: "rejected", code: "overlay.schema_invalid" });
  }
  try {
    parsePositiveSafeInteger(raw.contractRevision);
  } catch {
    return Object.freeze({ kind: "rejected", code: "overlay.contract_revision_invalid" });
  }
  if (
    !hasExactKeysV1(raw, [
      "id",
      "contractRevision",
      "targetSchema",
      "dismissible",
      "requiredPortIds",
    ]) ||
    !isRecordV1(raw.targetSchema) ||
    !hasExactKeysV1(raw.targetSchema, ["kind"]) ||
    raw.targetSchema.kind !== "exact_id" ||
    typeof raw.dismissible !== "boolean" ||
    !Array.isArray(raw.requiredPortIds)
  ) {
    return Object.freeze({ kind: "rejected", code: "overlay.schema_invalid" });
  }
  let definition: WorkspaceOverlayDefinitionV1<TOverlayId>;
  try {
    definition = Object.freeze({
      id: parseModuleId(raw.id) as unknown as TOverlayId,
      contractRevision: parsePositiveSafeInteger(raw.contractRevision),
      targetSchema: exactIdSchemaV1,
      dismissible: raw.dismissible,
      requiredPortIds: freezePortIdsV1(raw.requiredPortIds as readonly string[]),
    });
  } catch {
    return Object.freeze({ kind: "rejected", code: "overlay.schema_invalid" });
  }
  try {
    return Object.freeze({
      definition,
      primary: managedDefinitionV1(definition, "primary"),
      detail: managedDefinitionV1(definition, "detail"),
    });
  } catch {
    return Object.freeze({ kind: "rejected", code: "overlay.schema_invalid" });
  }
}

function normalizeResolutionV1(value: OverlayRendererResolutionV1): OverlayRendererResolutionV1 {
  if (
    !isRecordV1(value) ||
    typeof value.accessibleName !== "string" ||
    value.accessibleName.length === 0 ||
    (value.prepare !== undefined && typeof value.prepare !== "function")
  ) {
    throw new TypeError("ui.workspace_overlay_renderer_resolution_invalid");
  }
  return Object.freeze({
    accessibleName: value.accessibleName,
    content: value.content,
    ...(value.prepare === undefined ? {} : { prepare: value.prepare }),
  });
}

function rejectionV1(code: OverlayAdmissionRejectionV1["code"]): OverlayAdmissionRejectionV1 {
  return Object.freeze({ kind: "rejected", code }) as OverlayAdmissionRejectionV1;
}

function transitionResultV1(receipt: ManagedSurfaceTransitionReceiptV1): OverlayOpenResultV1 {
  if (receipt.kind === "applied" && receipt.code === "surface.preparation_started") {
    return preparingResultV1;
  }
  if (receipt.kind === "unchanged" && receipt.code === "surface.already_closed") {
    return rejectionV1("overlay.invalid_transition");
  }
  if (receipt.kind === "rejected" || receipt.kind === "stale") {
    if (receipt.code === "surface.invalid_parent") return rejectionV1("overlay.invalid_parent");
    return rejectionV1("overlay.invalid_transition");
  }
  return Object.freeze({ kind: "faulted", code: "overlay.transition_faulted" });
}

function readinessOutcomeV1(
  receipt: ManagedSurfaceTransitionReceiptV1,
  success: boolean,
): WorkspaceOverlayReadinessOutcomeInternalV1 {
  if (receipt.kind === "applied") {
    return Object.freeze({ kind: success ? "ready" as const : "failed" as const });
  }
  return Object.freeze({ kind: "stale", code: "overlay.stale_readiness" });
}

function frozenCompatibilityStateV1<TOverlayId extends string>(
  primaryId: TOverlayId | null,
  detailIds: readonly TOverlayId[],
): DeepReadonly<OverlaySessionStateV1<TOverlayId>> {
  return Object.freeze({ primaryId, detailIds: Object.freeze([...detailIds]) }) as DeepReadonly<
    OverlaySessionStateV1<TOverlayId>
  >;
}

export function createWorkspaceOverlaySessionInternalV1<TOverlayId extends string>(
  input: CreateWorkspaceOverlaySessionInternalInputV1<TOverlayId>,
): WorkspaceOverlaySessionInternalV1<TOverlayId> {
  const rawDefinitions = snapshotWorkspaceOverlayDefinitionsInternalV1(
    input.definitions,
  ) as readonly unknown[];
  const rawById = new Map<string, unknown[]>();
  for (const raw of rawDefinitions) {
    if (!isRecordV1(raw) || typeof raw.id !== "string") continue;
    const existing = rawById.get(raw.id);
    if (existing === undefined) rawById.set(raw.id, [raw]);
    else existing.push(raw);
  }
  const availablePortIds = availablePortIdSetV1(input.availablePorts ?? []);
  const reportFailure = (code: string, error: unknown): void => {
    try {
      input.reportFailure?.(code, error);
    } catch {
      // Diagnostics are best effort and cannot change admission or lifecycle commits.
    }
  };
  const catalogIds = [...rawById.keys()].flatMap((id) => {
    try {
      const parsed = parseModuleId(id);
      definitionIdV1(parsed, "primary");
      definitionIdV1(parsed, "detail");
      return [parsed];
    } catch {
      return [];
    }
  });
  const slotDescriptors: ManagedSurfaceResolvedSlotDescriptorV1[] = [
    Object.freeze({ kind: "root", slotId: primarySlotIdV1, cardinality: "single" }),
    ...catalogIds.flatMap((id) =>
      (["primary", "detail"] as const).map((placement) =>
        Object.freeze({
          kind: "child" as const,
          parentDefinitionId: definitionIdV1(id, placement),
          slotId: detailSlotIdV1,
          cardinality: "single" as const,
        })
      )
    ),
  ];
  const recipe = Object.freeze({
    resolvedOwnerIds: Object.freeze([ownerIdV1]),
    resolvedSlotDescriptors: Object.freeze(slotDescriptors),
    reportSubscriberFailure: input.reportFailure === undefined ? undefined : () =>
      reportFailure(
        "ui.workspace_overlay_managed_subscriber_failed",
        new Error("Managed Surface subscriber failed."),
      ),
  });
  const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
    epochAllocator: input.epochAllocator,
    inputRouter: input.inputRouter,
    initialRecipe: recipe,
  });
  let runtime = lifetime.getCurrent()!;
  let resolver: OverlayRendererResolverV1<TOverlayId> | null = null;
  const listeners = new Set<() => void>();
  const renderRecords = new Map<
    ManagedSurfaceInstanceIdV1,
    WorkspaceOverlayRenderRecordV1<TOverlayId>
  >();
  let mutationDepth = 0;
  let dirty = false;
  let disposed = false;
  let unsubscribeCoordinator: (() => void) | null = null;
  let compatibilityPublication: DeepReadonly<ManagedSurfacePublicationV1> | null = null;
  let compatibilitySnapshot = frozenCompatibilityStateV1<TOverlayId>(null, []);
  let renderPublication: DeepReadonly<ManagedSurfacePublicationV1> | null = null;
  let renderSnapshot: WorkspaceOverlayRenderSnapshotInternalV1<TOverlayId> | null = null;

  const managedSnapshot = (): DeepReadonly<ManagedSurfacePublicationV1> =>
    runtime.coordinator.getSnapshot();

  const reportListenerFailure = (error: unknown): void =>
    reportFailure("ui.workspace_overlay_subscriber_failed", error);

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        reportListenerFailure(error);
      }
    }
  };

  const reconcileRenderRecords = (): void => {
    const publication = managedSnapshot();
    const live = new Set(
      publication.orderedInstances.map((instance) => instance.surfaceInstanceId),
    );
    let removedRecord = false;
    for (const surfaceInstanceId of renderRecords.keys()) {
      if (!live.has(surfaceInstanceId)) {
        renderRecords.delete(surfaceInstanceId);
        removedRecord = true;
      }
    }
    if (compatibilityPublication !== publication) {
      compatibilityPublication = null;
    }
    if (renderPublication !== publication || removedRecord) {
      renderPublication = null;
      renderSnapshot = null;
    }
  };

  const syncManagedInput = (): void => {
    if (!runtime.isIngressOpen()) return;
    if (managedSnapshot().inputOwner !== null) runtime.bindCurrentInput();
  };

  const onCoordinatorPublication = (): void => {
    syncManagedInput();
    reconcileRenderRecords();
    dirty = true;
    if (mutationDepth === 0) {
      dirty = false;
      notify();
    }
  };

  const subscribeCoordinator = (): void => {
    unsubscribeCoordinator = runtime.coordinator.subscribe(onCoordinatorPublication);
  };
  subscribeCoordinator();

  const mutate = <T>(operation: () => T, after?: (result: T) => void): T => {
    mutationDepth += 1;
    try {
      const result = operation();
      after?.(result);
      reconcileRenderRecords();
      syncManagedInput();
      return result;
    } finally {
      mutationDepth -= 1;
      if (mutationDepth === 0 && dirty) {
        dirty = false;
        notify();
      }
    }
  };

  const compatibility = (): DeepReadonly<OverlaySessionStateV1<TOverlayId>> => {
    const publication = managedSnapshot();
    if (compatibilityPublication === publication) return compatibilitySnapshot;
    const ready = publication.orderedInstances.filter((instance) =>
      instance.readiness.kind === "ready"
    );
    const primary = ready.find((instance) => instance.parentInstanceId === null);
    if (primary === undefined) {
      compatibilitySnapshot = frozenCompatibilityStateV1<TOverlayId>(null, []);
    } else {
      const primaryRecord = renderRecords.get(primary.surfaceInstanceId);
      const details: TOverlayId[] = [];
      let parentId = primary.surfaceInstanceId;
      while (true) {
        const child = ready.find((instance) => instance.parentInstanceId === parentId);
        if (child === undefined) break;
        const record = renderRecords.get(child.surfaceInstanceId);
        if (record === undefined) break;
        details.push(record.overlayId);
        parentId = child.surfaceInstanceId;
      }
      compatibilitySnapshot = frozenCompatibilityStateV1(
        primaryRecord?.overlayId ?? null,
        details,
      );
    }
    compatibilityPublication = publication;
    return compatibilitySnapshot;
  };

  const currentTopReady = () => {
    const publication = managedSnapshot();
    return publication.orderedInstances.toReversed().find(
      (instance) => instance.readiness.kind === "ready",
    );
  };

  const preflight = (
    id: TOverlayId,
  ):
    | {
      readonly parsed: ParsedWorkspaceOverlayDefinitionV1<TOverlayId>;
      readonly resolution: OverlayRendererResolutionV1;
    }
    | OverlayAdmissionRejectionV1
    | { readonly kind: "faulted"; readonly code: "overlay.renderer_faulted" } => {
    if (disposed) return rejectionV1("overlay.disposed");
    const matches = rawById.get(id);
    if (matches === undefined) return rejectionV1("overlay.definition_missing");
    if (matches.length !== 1) return rejectionV1("overlay.definition_ambiguous");
    const parsed = parseDefinitionForRequestV1(matches[0], id);
    if ("kind" in parsed) return parsed;
    if (resolver === null) return rejectionV1("overlay.renderer_unavailable");
    let resolution: OverlayRendererResolutionV1 | null;
    try {
      resolution = resolver.resolve(id as DeepReadonly<TOverlayId>);
      if (resolution !== null && resolution !== undefined) {
        resolution = normalizeResolutionV1(resolution);
      }
    } catch (error) {
      reportFailure("ui.workspace_overlay_renderer_faulted", error);
      return Object.freeze({ kind: "faulted", code: "overlay.renderer_faulted" });
    }
    if (resolution === null || resolution === undefined) {
      return rejectionV1("overlay.renderer_missing");
    }
    for (const portId of parsed.definition.requiredPortIds) {
      if (!availablePortIds.has(portId)) {
        return Object.freeze({
          kind: "rejected",
          code: "overlay.required_port_missing",
          portId,
        });
      }
    }
    return Object.freeze({ parsed, resolution });
  };

  const storePreparation = (
    result: ReturnType<ManagedSurfaceCoordinatorRuntimeV1["coordinator"]["openTransientPrimary"]>,
    overlayId: TOverlayId,
    resolution: OverlayRendererResolutionV1,
  ): void => {
    if (
      result.receipt.kind !== "applied" ||
      result.receipt.surfaceInstanceId === undefined ||
      result.readiness === null
    ) {
      return;
    }
    renderRecords.set(result.receipt.surfaceInstanceId, {
      overlayId,
      resolution,
      readiness: result.readiness,
      preparation: null,
    });
    renderPublication = null;
    renderSnapshot = null;
  };

  const openPrimary = (id: TOverlayId): OverlayOpenResultV1 => {
    const current = compatibility();
    const hasPreparing = managedSnapshot().orderedInstances.some(
      (instance) => instance.readiness.kind === "preparing",
    );
    if (current.primaryId === id && current.detailIds.length === 0 && !hasPreparing) {
      return alreadyOpenResultV1;
    }
    const admission = preflight(id);
    if ("kind" in admission) return admission;
    const root = managedSnapshot().orderedInstances.find(
      (instance) => instance.parentInstanceId === null && instance.readiness.kind === "ready",
    );
    if (root === undefined) {
      const result = mutate(
        () =>
          runtime.coordinator.openTransientPrimary({
            definition: admission.parsed.primary,
            semanticOccurrenceId: null,
          }),
        (prepared) => storePreparation(prepared, id, admission.resolution),
      );
      return transitionResultV1(result.receipt);
    }
    const handle = runtime.coordinator.getHandle(root.surfaceInstanceId);
    if (handle === null) return rejectionV1("overlay.invalid_transition");
    const result = mutate(
      () =>
        runtime.coordinator.replaceTransientPrimary({
          definition: admission.parsed.primary,
          semanticOccurrenceId: null,
          expected: handle,
        }),
      (prepared) => storePreparation(prepared, id, admission.resolution),
    );
    return transitionResultV1(result.receipt);
  };

  const pushDetail = (id: TOverlayId): OverlayPushDetailResultV1 => {
    const state = compatibility();
    if (state.primaryId === null) return rejectionV1("overlay.no_primary");
    if (
      state.primaryId === id ||
      (state.detailIds as readonly TOverlayId[]).includes(id)
    ) return rejectionV1("overlay.duplicate");
    if (state.detailIds.length >= maximumOverlayDetailDepthV1) {
      return rejectionV1("overlay.detail_limit");
    }
    const admission = preflight(id);
    if ("kind" in admission) return admission;
    const parent = currentTopReady();
    if (parent === undefined) return rejectionV1("overlay.invalid_parent");
    const handle = runtime.coordinator.getHandle(parent.surfaceInstanceId);
    if (handle === null) return rejectionV1("overlay.invalid_parent");
    const result = mutate(
      () =>
        runtime.coordinator.pushTransientChild({
          definition: admission.parsed.detail,
          semanticOccurrenceId: null,
          parent: handle,
        }),
      (prepared) => storePreparation(prepared, id, admission.resolution),
    );
    return transitionResultV1(result.receipt);
  };

  const closeTop = (): OverlayCloseTopResultV1 => {
    if (disposed) return "already_closed";
    const before = managedSnapshot();
    const receipt = mutate(() => runtime.coordinator.closeTopWithOwnerPreparationCancel(ownerIdV1));
    if (receipt.kind !== "applied") return "already_closed";
    const target = before.orderedInstances.find(
      (instance) => instance.surfaceInstanceId === receipt.surfaceInstanceId,
    );
    if (target === undefined) return "already_closed";
    return target.parentInstanceId === null ? "primary_closed" : "detail_closed";
  };

  const closeAll = (): void => {
    if (disposed || managedSnapshot().orderedInstances.length === 0) return;
    const ownerHandle = runtime.coordinator.getOwnerHandle(ownerIdV1);
    if (ownerHandle !== null) {
      mutate(() => runtime.coordinator.closeOwner(ownerHandle));
      return;
    }
    mutate(() => runtime.coordinator.closeTop());
  };

  const session: WorkspaceOverlaySessionInternalV1<TOverlayId> = {
    getSnapshot: compatibility,
    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    openPrimary,
    pushDetail,
    closeTop,
    closeAll,
    getManagedSnapshotInternalV1: managedSnapshot,
    getRenderSnapshotInternalV1() {
      const publication = managedSnapshot();
      if (renderPublication === publication && renderSnapshot !== null) return renderSnapshot;
      const entries = publication.orderedInstances.flatMap((instance) => {
        const record = renderRecords.get(instance.surfaceInstanceId);
        return record === undefined ? [] : [Object.freeze({
          surfaceInstanceId: instance.surfaceInstanceId,
          parentInstanceId: instance.parentInstanceId,
          phase: instance.phase,
          readiness: instance.readiness.kind,
          overlayId: record.overlayId,
          resolution: record.resolution,
        })];
      });
      renderSnapshot = Object.freeze({
        publication,
        entries: Object.freeze(entries),
      });
      renderPublication = publication;
      return renderSnapshot;
    },
    attachRendererResolverInternalV1(nextResolver) {
      if (disposed) throw new TypeError("ui.workspace_overlay_session_disposed");
      resolver = nextResolver;
      let attached = true;
      return (): void => {
        if (!attached) return;
        attached = false;
        if (resolver === nextResolver) resolver = null;
      };
    },
    beginCandidatePreparationInternalV1(surfaceInstanceId) {
      const record = renderRecords.get(surfaceInstanceId);
      if (record === undefined) {
        return Promise.resolve(Object.freeze({
          kind: "stale",
          code: "overlay.stale_readiness",
        }));
      }
      if (record.preparation !== null) return record.preparation;
      record.preparation = Promise.resolve()
        .then(() => record.resolution.prepare?.())
        .then(() => {
          const result = mutate(() => record.readiness.ready());
          return readinessOutcomeV1(result.receipt, true);
        })
        .catch((error: unknown) => {
          reportFailure("ui.workspace_overlay_preparation_failed", error);
          const receipt = mutate(() => record.readiness.fail());
          return readinessOutcomeV1(receipt, false);
        });
      return record.preparation;
    },
    failCandidatePreparationInternalV1(surfaceInstanceId, error) {
      const record = renderRecords.get(surfaceInstanceId);
      reportFailure("ui.workspace_overlay_render_preparation_failed", error);
      if (record === undefined) {
        return Object.freeze({ kind: "stale", code: "overlay.stale_readiness" });
      }
      const receipt = mutate(() => record.readiness.fail());
      return readinessOutcomeV1(receipt, false);
    },
    closeExpectedInternalV1(handle) {
      return mutate(() =>
        runtime.coordinator.closeExpectedWithOwnerPreparationCancel(handle, ownerIdV1)
      );
    },
    closeRenderFaultInternalV1(handle, error) {
      reportFailure("ui.workspace_overlay_active_render_failed", error);
      return mutate(() =>
        runtime.coordinator.closeExpectedWithOwnerPreparationCancel(handle, ownerIdV1)
      );
    },
    routeDismissInternalV1(handle, kind) {
      return mutate(() =>
        runtime.coordinator.routeDismissWithOwnerPreparationCancel(handle, ownerIdV1, kind)
      );
    },
    routeFallbackDismissInternalV1(candidateInstanceId, kind) {
      if (disposed) return;
      const record = renderRecords.get(candidateInstanceId);
      if (record === undefined) return;
      mutate(() =>
        runtime.coordinator.routeFallbackDismissWithOwnerPreparationCancel(
          record.readiness.evidence,
          ownerIdV1,
          kind,
        )
      );
    },
    getHandleInternalV1(surfaceInstanceId) {
      return runtime.coordinator.getHandle(surfaceInstanceId);
    },
    rotateEpochInternalV1(kind) {
      if (disposed) return;
      mutationDepth += 1;
      try {
        unsubscribeCoordinator?.();
        unsubscribeCoordinator = null;
        renderRecords.clear();
        runtime = lifetime.replace({ kind, recipe });
        subscribeCoordinator();
        reconcileRenderRecords();
        dirty = true;
      } finally {
        mutationDepth -= 1;
        if (mutationDepth === 0 && dirty) {
          dirty = false;
          notify();
        }
      }
    },
    disposeInternalV1() {
      if (disposed) return;
      mutationDepth += 1;
      try {
        lifetime.dispose();
        disposed = true;
        unsubscribeCoordinator?.();
        unsubscribeCoordinator = null;
        renderRecords.clear();
        resolver = null;
        reconcileRenderRecords();
        dirty = true;
      } finally {
        mutationDepth -= 1;
        if (mutationDepth === 0 && dirty) {
          dirty = false;
          notify();
        }
        listeners.clear();
      }
    },
  };

  return Object.freeze(session);
}

export function createLocalWorkspaceOverlayEpochAllocatorInternalV1(): ManagedSurfaceApplicationEpochAllocatorV1 {
  let cursor: NonNegativeSafeInteger = parseNonNegativeSafeInteger(0);
  return Object.freeze({
    allocate(): NonNegativeSafeInteger {
      cursor = parseNonNegativeSafeInteger(cursor + 1);
      return cursor;
    },
  });
}
