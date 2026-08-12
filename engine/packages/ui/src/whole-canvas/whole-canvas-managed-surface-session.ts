// SPDX-License-Identifier: MIT
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type DeepReadonly,
  type StrictJsonObjectV1,
  type StrictJsonValueV1,
} from "@sillymaker/base";
import { projectBoundedCanonicalJsonInternalV1 } from "@sillymaker/base/runtime/internal";

import {
  parseManagedSurfaceActionIdV1,
  type ManagedSurfaceDismissKindV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import {
  matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionResultInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1,
  matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableDirectActionTargetProofInternalV1,
  type ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  type ManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  managedSurfaceStableContractLimitsInternalV1,
  type ManagedSurfaceStableAdmittedTargetInternalV1,
  type ManagedSurfaceStablePublisherLeaseInternalV1,
  type ManagedSurfaceStableSourceRevisionInternalV1,
  type ManagedSurfaceStableTargetInternalV1,
} from "../managed-surfaces/managed-surface-stable-contract.ts";
import {
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import type { ManagedSurfacePreparedInputBindingContractInternalV1 } from "../managed-surfaces/managed-surface-action-route.ts";
import {
  createWholeCanvasManagedSurfaceFamilyContractInternalV1,
  type WholeCanvasManagedSurfaceCatalogRowInternalV1,
} from "./whole-canvas-managed-surface-family.ts";

export type WholeCanvasManagedSurfaceRootKindInternalV1 =
  | "boot_splash"
  | "title"
  | "primary";
export type WholeCanvasManagedSurfaceSourceKindInternalV1 =
  | "builtin"
  | "publication"
  | "application";
export type WholeCanvasManagedSurfacePlacementInternalV1 = "primary" | "detail";

export interface WholeCanvasManagedSurfaceTargetInternalV1 {
  readonly targetId: string;
  readonly parameters: DeepReadonly<StrictJsonValueV1>;
}

export type WholeCanvasManagedSurfaceActionIntentInternalV1 =
  | Readonly<{
    readonly kind: "replace_primary";
    readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  }>
  | Readonly<{
    readonly kind: "open_detail";
    readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  }>
  | Readonly<{ readonly kind: "back" }>
  | Readonly<{ readonly kind: "close_primary" }>
  | Readonly<{
    readonly kind: "owner";
    readonly payload: DeepReadonly<StrictJsonObjectV1>;
  }>;

export interface WholeCanvasManagedSurfaceResolvedActionInternalV1 {
  readonly actionId: string;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
  readonly intent: WholeCanvasManagedSurfaceActionIntentInternalV1;
}

export interface WholeCanvasManagedSurfaceResolvedTargetInternalV1 {
  readonly accessibleNameTextId: string;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasManagedSurfaceResolvedActionInternalV1[];
}

export interface WholeCanvasManagedSurfaceResolveTargetRequestInternalV1 {
  readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
  readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
  readonly placement: WholeCanvasManagedSurfacePlacementInternalV1;
  readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
}

export type WholeCanvasManagedSurfaceResolveTargetInternalV1 = (
  request: WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
) => unknown;

export interface WholeCanvasManagedSurfaceOwnerActionDispatchRequestInternalV1 {
  readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
  readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
  readonly placement: WholeCanvasManagedSurfacePlacementInternalV1;
  readonly primary: WholeCanvasManagedSurfaceTargetInternalV1;
  readonly detail: WholeCanvasManagedSurfaceTargetInternalV1 | null;
  readonly actionId: string;
  readonly payload: DeepReadonly<StrictJsonObjectV1>;
}

export type WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1 =
  | ((request: WholeCanvasManagedSurfaceOwnerActionDispatchRequestInternalV1) => Promise<unknown>)
  | null;

export interface WholeCanvasManagedSurfaceRootDesiredInternalV1 {
  readonly bootSplash: WholeCanvasManagedSurfaceTargetInternalV1 | null;
  readonly title: WholeCanvasManagedSurfaceTargetInternalV1 | null;
  readonly story:
    | Readonly<{
      readonly sourceKind: "publication" | "application";
      readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
    }>
    | null;
}

declare const wholeCanvasPreparationBrandInternalV1: unique symbol;
export interface WholeCanvasManagedSurfacePreparationInternalV1 {
  readonly [wholeCanvasPreparationBrandInternalV1]: true;
}

export interface WholeCanvasManagedSurfaceFrameInternalV1 {
  readonly applicationEpoch: number;
  readonly sourceRevision: number;
  readonly primaryTargetOccurrenceId: string;
  readonly primaryInstanceId: string;
  readonly detailTargetOccurrenceId: string | null;
  readonly detailInstanceId: string | null;
  readonly surfacePublicationRevision: number;
  readonly surfaceTopologyRevision: number;
  readonly inputPublicationRevision: number;
  readonly hostGeneration: number;
}

export interface WholeCanvasManagedSurfaceRenderEntryInternalV1 {
  readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
  readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
  readonly placement: WholeCanvasManagedSurfacePlacementInternalV1;
  readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  readonly resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1;
  readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
}

export interface WholeCanvasManagedSurfaceReadinessEntryInternalV1 {
  readonly renderEntry: WholeCanvasManagedSurfaceRenderEntryInternalV1;
  readonly preparation: WholeCanvasManagedSurfacePreparationInternalV1;
  readonly transition: "initial_open" | "primary_replacement" | "child_open";
}

export interface WholeCanvasManagedSurfaceSnapshotInternalV1 {
  readonly root: Readonly<{
    readonly current: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null;
    readonly pending: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null;
    readonly failure: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null;
  }>;
  readonly detail: Readonly<{
    readonly current: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null;
    readonly pending: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null;
    readonly failure: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null;
  }>;
  readonly disposed: boolean;
}

export type WholeCanvasManagedSurfaceHostCommitRequestInternalV1 =
  | Readonly<{
    readonly kind: "root_admission";
    readonly transition:
      | "initial_open"
      | "same_target_refresh"
      | "primary_replacement"
      | "primary_close";
    readonly currentRootFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null;
    readonly currentDetailFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null;
  }>
  | Readonly<{
    readonly kind: "root_readiness";
    readonly preparation: WholeCanvasManagedSurfacePreparationInternalV1;
    readonly outcome: "ready" | "failed";
    readonly retainedRootFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null;
  }>
  | Readonly<{
    readonly kind: "detail_prepare";
    readonly transition: "open" | "replace";
    readonly sourceFrame: WholeCanvasManagedSurfaceFrameInternalV1;
    readonly parentFrame: WholeCanvasManagedSurfaceFrameInternalV1;
    readonly replacedDetailFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null;
  }>
  | Readonly<{
    readonly kind: "detail_readiness";
    readonly preparation: WholeCanvasManagedSurfacePreparationInternalV1;
    readonly outcome: "ready" | "failed";
    readonly parentFrame: WholeCanvasManagedSurfaceFrameInternalV1;
  }>
  | Readonly<{
    readonly kind: "detail_lifecycle";
    readonly transition: "close" | "dismiss";
    readonly detailFrame: WholeCanvasManagedSurfaceFrameInternalV1;
    readonly parentFrame: WholeCanvasManagedSurfaceFrameInternalV1;
    readonly dismissKind: ManagedSurfaceDismissKindV1 | null;
  }>;

export interface WholeCanvasManagedSurfaceHostCommitInputInternalV1 {
  readonly contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null;
  readonly nextInputFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null;
}

export interface WholeCanvasManagedSurfacePreparedHostCommitInternalV1 {
  readonly hostGeneration: number;
  readonly commitInternalV1: (
    input: WholeCanvasManagedSurfaceHostCommitInputInternalV1,
  ) => boolean;
  readonly abortInternalV1: () => void;
  readonly completeInstalledInternalV1: () => void;
}

export interface WholeCanvasManagedSurfaceHostCommitPortInternalV1 {
  readonly prepareCommitInternalV1: (
    request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  ) => WholeCanvasManagedSurfacePreparedHostCommitInternalV1 | null;
  readonly terminalizeInternalV1: () => void;
}

export interface WholeCanvasManagedSurfaceResultInternalV1 {
  readonly kind: "applied" | "unchanged" | "rejected" | "stale" | "faulted";
  readonly code: string;
}

export interface WholeCanvasManagedSurfaceBoundedStateInternalV1 {
  readonly liveRootCount: number;
  readonly pendingRootCount: number;
  readonly liveDetailCount: number;
  readonly pendingDetailCount: number;
  readonly retainedFrameCount: number;
  readonly retainedPreparationCount: number;
  readonly retainedListenerCount: number;
}

export interface CreateWholeCanvasManagedSurfaceSessionInputInternalV1 {
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly exactAggregateDefinitionSidecars:
    readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly exactAggregateSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[];
  readonly resolveTargetInternalV1: WholeCanvasManagedSurfaceResolveTargetInternalV1;
  readonly dispatchOwnerActionInternalV1: WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1;
  readonly hostCommitPortInternalV1: WholeCanvasManagedSurfaceHostCommitPortInternalV1 | null;
}

export interface WholeCanvasManagedSurfaceSessionInternalV1 {
  getSnapshotInternalV1(): WholeCanvasManagedSurfaceSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  reconcileRootInternalV1(
    desired: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  retryCurrentInternalV1(): WholeCanvasManagedSurfaceResultInternalV1;
  settleReadinessReadyInternalV1(
    preparation: WholeCanvasManagedSurfacePreparationInternalV1,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  settleReadinessFailedInternalV1(
    preparation: WholeCanvasManagedSurfacePreparationInternalV1,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  cancelReadinessInternalV1(
    preparation: WholeCanvasManagedSurfacePreparationInternalV1,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  dispatchActionInternalV1(
    input: Readonly<{
      readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
      readonly actionId: string;
    }>,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  dismissInternalV1(
    input: Readonly<{
      readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
      readonly kind: ManagedSurfaceDismissKindV1;
    }>,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  isFrameCurrentInternalV1(frame: unknown): frame is WholeCanvasManagedSurfaceFrameInternalV1;
  inspectBoundedStateInternalV1(): WholeCanvasManagedSurfaceBoundedStateInternalV1;
  disposeInternalV1(): WholeCanvasManagedSurfaceResultInternalV1;
}

interface CapturedDataRecordInternalV1 {
  readonly value: object;
  readonly values: ReadonlyMap<string, unknown>;
}

interface CapturedTargetInternalV1 {
  readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  readonly canonicalKey: string;
}

interface CapturedResolvedTargetInternalV1 {
  readonly resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1;
  readonly canonicalKey: string;
  readonly actionsCanonicalKey: string;
}

interface CapturedRootAggregateDesiredInternalV1 {
  readonly bootSplash: CapturedTargetInternalV1 | null;
  readonly title: CapturedTargetInternalV1 | null;
  readonly story:
    | Readonly<{
      readonly sourceKind: "publication" | "application";
      readonly target: CapturedTargetInternalV1;
    }>
    | null;
}

const canonicalLimitsInternalV1 = Object.freeze({
  maxBytes: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxBytes,
  ),
  maxDepth: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxDepth,
  ),
  maxNodes: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxNodes,
  ),
});

function captureDataRecordInternalV1(
  value: unknown,
  exactKeys: readonly string[],
): CapturedDataRecordInternalV1 | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    if (!Object.isFrozen(value) || Reflect.getPrototypeOf(value) !== Object.prototype) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== exactKeys.length || ownKeys.some((key) => typeof key !== "string") ||
      exactKeys.some((key) => !ownKeys.includes(key))
    ) return null;
    const values = new Map<string, unknown>();
    for (const key of exactKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) return null;
      values.set(key, descriptor.value);
    }
    return Object.freeze({ value, values });
  } catch {
    return null;
  }
}

function captureDenseFrozenArrayInternalV1(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    if (!Object.isFrozen(value) || Reflect.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
    ) return null;
    const length = lengthDescriptor.value;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1) return null;
    const captured: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !("value" in descriptor)) return null;
      captured.push(descriptor.value);
    }
    for (const key of keys) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)) return null;
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length) return null;
    }
    return Object.freeze(captured);
  } catch {
    return null;
  }
}

function projectJsonInternalV1(value: unknown):
  | Readonly<{
    readonly value: DeepReadonly<StrictJsonValueV1>;
    readonly key: string;
  }>
  | null {
  try {
    const projected = projectBoundedCanonicalJsonInternalV1(value, canonicalLimitsInternalV1);
    if (projected.kind !== "projected") return null;
    return Object.freeze({ value: projected.value, key: JSON.stringify(projected.value) });
  } catch {
    return null;
  }
}

function captureTargetInternalV1(value: unknown): CapturedTargetInternalV1 | null {
  const record = captureDataRecordInternalV1(value, ["targetId", "parameters"]);
  if (record === null) return null;
  try {
    const targetId = parseModuleId(record.values.get("targetId"));
    const parameters = projectJsonInternalV1(record.values.get("parameters"));
    if (parameters === null) return null;
    return Object.freeze({
      target: Object.freeze({ targetId, parameters: parameters.value }),
      canonicalKey: `${targetId}\u0000${parameters.key}`,
    });
  } catch {
    return null;
  }
}

function captureReasonTextIdsInternalV1(value: unknown): readonly string[] | null {
  const values = captureDenseFrozenArrayInternalV1(value);
  if (values === null) return null;
  try {
    return Object.freeze(values.map((reasonTextId) => parseModuleId(reasonTextId)));
  } catch {
    return null;
  }
}

function captureStrictJsonObjectInternalV1(
  value: unknown,
): DeepReadonly<StrictJsonObjectV1> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const projected = projectJsonInternalV1(value);
  if (
    projected === null || typeof projected.value !== "object" || projected.value === null ||
    Array.isArray(projected.value)
  ) return null;
  return projected.value as DeepReadonly<StrictJsonObjectV1>;
}

function captureIntentInternalV1(
  value: unknown,
  sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1,
  catalogByTargetId: ReadonlyMap<string, WholeCanvasManagedSurfaceCatalogRowInternalV1>,
  ownerDispatchAvailable: boolean,
): WholeCanvasManagedSurfaceActionIntentInternalV1 | null {
  const kindRecord = captureDataRecordInternalV1(value, ["kind"]);
  if (kindRecord !== null) {
    const kind = kindRecord.values.get("kind");
    if (kind === "back") return Object.freeze({ kind });
    if (kind === "close_primary" && sourceKind !== "publication") {
      return Object.freeze({ kind });
    }
    return null;
  }
  const targetRecord = captureDataRecordInternalV1(value, ["kind", "target"]);
  if (targetRecord !== null) {
    const kind = targetRecord.values.get("kind");
    if (kind !== "open_detail" && kind !== "replace_primary") return null;
    if (kind === "replace_primary" && sourceKind === "publication") return null;
    const capturedTarget = captureTargetInternalV1(targetRecord.values.get("target"));
    if (capturedTarget === null) return null;
    const row = catalogByTargetId.get(capturedTarget.target.targetId);
    const placement = kind === "open_detail" ? "detail" : "primary";
    if (row === undefined || !row.placements.includes(placement)) return null;
    return Object.freeze({ kind, target: capturedTarget.target });
  }
  const ownerRecord = captureDataRecordInternalV1(value, ["kind", "payload"]);
  if (ownerRecord?.values.get("kind") !== "owner" || !ownerDispatchAvailable) return null;
  const payload = captureStrictJsonObjectInternalV1(ownerRecord.values.get("payload"));
  return payload === null ? null : Object.freeze({ kind: "owner" as const, payload });
}

function captureResolvedTargetInternalV1(
  input: Readonly<{
    readonly value: unknown;
    readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
    readonly expectedActionIds: readonly string[] | null;
    readonly permittedBuiltinActionIds: readonly string[];
    readonly catalogByTargetId: ReadonlyMap<string, WholeCanvasManagedSurfaceCatalogRowInternalV1>;
    readonly ownerDispatchAvailable: boolean;
  }>,
): CapturedResolvedTargetInternalV1 | null {
  const record = captureDataRecordInternalV1(input.value, [
    "accessibleNameTextId",
    "view",
    "actions",
  ]);
  if (record === null) return null;
  let accessibleNameTextId: string;
  try {
    accessibleNameTextId = parseModuleId(record.values.get("accessibleNameTextId"));
  } catch {
    return null;
  }
  const view = projectJsonInternalV1(record.values.get("view"));
  const rawActions = captureDenseFrozenArrayInternalV1(record.values.get("actions"));
  if (view === null || rawActions === null) return null;
  const actions: WholeCanvasManagedSurfaceResolvedActionInternalV1[] = [];
  for (const rawAction of rawActions) {
    const actionRecord = captureDataRecordInternalV1(rawAction, [
      "actionId",
      "status",
      "reasonTextIds",
      "intent",
    ]);
    if (actionRecord === null) return null;
    let actionId: string;
    try {
      actionId = String(parseManagedSurfaceActionIdV1(actionRecord.values.get("actionId")));
    } catch {
      return null;
    }
    const status = actionRecord.values.get("status");
    const reasonTextIds = captureReasonTextIdsInternalV1(
      actionRecord.values.get("reasonTextIds"),
    );
    const intent = captureIntentInternalV1(
      actionRecord.values.get("intent"),
      input.sourceKind,
      input.catalogByTargetId,
      input.ownerDispatchAvailable,
    );
    if (
      (status !== "enabled" && status !== "disabled") || reasonTextIds === null ||
      intent === null ||
      (status === "enabled" && reasonTextIds.length !== 0) ||
      (status === "disabled" && reasonTextIds.length === 0)
    ) return null;
    actions.push(Object.freeze({ actionId, status, reasonTextIds, intent }));
  }
  const actionIds = actions.map((action) => action.actionId);
  if (new Set(actionIds).size !== actionIds.length) return null;
  if (input.expectedActionIds !== null) {
    if (
      input.expectedActionIds.length !== actionIds.length ||
      input.expectedActionIds.some((actionId, index) => actionIds[index] !== actionId)
    ) return null;
  } else {
    let previousIndex = -1;
    for (const actionId of actionIds) {
      const index = input.permittedBuiltinActionIds.indexOf(actionId);
      if (index <= previousIndex) return null;
      previousIndex = index;
    }
  }
  const resolved = Object.freeze({
    accessibleNameTextId,
    view: view.value,
    actions: Object.freeze(actions),
  });
  const projected = projectJsonInternalV1(resolved);
  const projectedActions = projectJsonInternalV1(resolved.actions);
  if (projected === null || projectedActions === null) return null;
  return Object.freeze({
    resolved,
    canonicalKey: projected.key,
    actionsCanonicalKey: projectedActions.key,
  });
}

interface CapturedHostCommitPortInternalV1 {
  readonly receiver: object;
  readonly prepare: (
    request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  ) => unknown;
  readonly terminalize: () => unknown;
}

interface CapturedPreparedHostCommitInternalV1 {
  readonly receiver: object;
  readonly hostGeneration: number;
  readonly commit: (input: WholeCanvasManagedSurfaceHostCommitInputInternalV1) => unknown;
  readonly abort: () => unknown;
  readonly complete: () => unknown;
}

function captureHostCommitPortInternalV1(
  value: unknown,
): CapturedHostCommitPortInternalV1 | null {
  if (value === null) return null;
  const record = captureDataRecordInternalV1(value, [
    "prepareCommitInternalV1",
    "terminalizeInternalV1",
  ]);
  const prepare = record?.values.get("prepareCommitInternalV1");
  const terminalize = record?.values.get("terminalizeInternalV1");
  if (record === null || typeof prepare !== "function" || typeof terminalize !== "function") {
    throw new TypeError("ui.whole_canvas_host_commit_port_invalid");
  }
  return Object.freeze({
    receiver: record.value,
    prepare: prepare as CapturedHostCommitPortInternalV1["prepare"],
    terminalize: terminalize as CapturedHostCommitPortInternalV1["terminalize"],
  });
}

function capturePreparedHostCommitInternalV1(
  value: unknown,
): CapturedPreparedHostCommitInternalV1 | null {
  const record = captureDataRecordInternalV1(value, [
    "hostGeneration",
    "commitInternalV1",
    "abortInternalV1",
    "completeInstalledInternalV1",
  ]);
  const commit = record?.values.get("commitInternalV1");
  const abort = record?.values.get("abortInternalV1");
  const complete = record?.values.get("completeInstalledInternalV1");
  if (
    record === null || typeof commit !== "function" || typeof abort !== "function" ||
    typeof complete !== "function"
  ) return null;
  try {
    return Object.freeze({
      receiver: record.value,
      hostGeneration: parseNonNegativeSafeInteger(record.values.get("hostGeneration")),
      commit: commit as CapturedPreparedHostCommitInternalV1["commit"],
      abort: abort as CapturedPreparedHostCommitInternalV1["abort"],
      complete: complete as CapturedPreparedHostCommitInternalV1["complete"],
    });
  } catch {
    return null;
  }
}

interface RootSelectionInternalV1 {
  readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
  readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
  readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  readonly targetKey: string;
  readonly resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1;
  readonly resolvedKey: string;
  readonly actionsKey: string;
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly catalogRow: WholeCanvasManagedSurfaceCatalogRowInternalV1 | null;
}

interface RootRuntimeRecordInternalV1 extends RootSelectionInternalV1 {
  readonly occurrenceId: string;
  readonly admittedTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly instanceId: string;
}

interface DetailRuntimeRecordInternalV1 {
  readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
  readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
  readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
  readonly targetKey: string;
  readonly resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1;
  readonly resolvedKey: string;
  readonly actionsKey: string;
  readonly occurrenceId: string;
  readonly instanceId: string;
  readonly candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1;
  readonly parentProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly parentTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly parentSourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
}

interface RootPreparationRecordInternalV1 {
  readonly kind: "root";
  readonly token: WholeCanvasManagedSurfacePreparationInternalV1;
  root: RootRuntimeRecordInternalV1;
  runtimeEntry: ManagedSurfaceStableRuntimeEntryInternalV1;
  readinessEntry: WholeCanvasManagedSurfaceReadinessEntryInternalV1;
  active: boolean;
}

interface DetailPreparationRecordInternalV1 {
  readonly kind: "detail";
  readonly token: WholeCanvasManagedSurfacePreparationInternalV1;
  detail: DetailRuntimeRecordInternalV1;
  readinessEntry: WholeCanvasManagedSurfaceReadinessEntryInternalV1;
  active: boolean;
}

type PreparationRecordInternalV1 =
  | RootPreparationRecordInternalV1
  | DetailPreparationRecordInternalV1;

interface PreparedHostTransitionInternalV1 {
  readonly hostGeneration: number;
  readonly commit: (
    contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
    nextInputFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null,
  ) => boolean;
  readonly abort: () => void;
  readonly complete: () => void;
  readonly didCommit: () => boolean;
}

const wholeCanvasExactChildClaimantInternalV1 = Object.freeze({});
const appliedResultInternalV1 = Object.freeze({
  kind: "applied" as const,
  code: "ui.whole_canvas_applied",
});
const unchangedResultInternalV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "ui.whole_canvas_unchanged",
});
const rejectedResultInternalV1 = Object.freeze({
  kind: "rejected" as const,
  code: "ui.whole_canvas_rejected",
});
const staleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "ui.whole_canvas_stale",
});
const faultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "ui.whole_canvas_faulted",
});

function sameDefinitionInternalV1(
  left: ManagedSurfaceResolvedDefinitionV1,
  right: ManagedSurfaceResolvedDefinitionV1,
): boolean {
  const leftProjection = projectJsonInternalV1(left);
  const rightProjection = projectJsonInternalV1(right);
  return leftProjection !== null && rightProjection !== null &&
    leftProjection.key === rightProjection.key;
}

const managedSurfaceDefinitionOwnKeysInternalV1 = Object.freeze([
  "definitionId",
  "contractRevision",
  "ownerId",
  "slotId",
  "layerId",
  "layerOrder",
  "placement",
  "modality",
  "inputPolicy",
  "dismissPolicy",
  "focusPolicy",
  "navigationPolicy",
  "actionIds",
  "readiness",
]);

export function createWholeCanvasManagedSurfaceSessionInternalV1(
  input: CreateWholeCanvasManagedSurfaceSessionInputInternalV1,
): WholeCanvasManagedSurfaceSessionInternalV1 {
  const capturedInput = captureDataRecordInternalV1(input, [
    "publisherLeaseRegistry",
    "admissionAuthority",
    "compositeRuntimeKernel",
    "exactAggregateDefinitionSidecars",
    "exactAggregateSlotDescriptors",
    "catalog",
    "resolveTargetInternalV1",
    "dispatchOwnerActionInternalV1",
    "hostCommitPortInternalV1",
  ]);
  if (capturedInput === null) {
    throw new TypeError("ui.whole_canvas_session_invalid");
  }
  const publisherLeaseRegistry = capturedInput.values.get(
    "publisherLeaseRegistry",
  ) as ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  const admissionAuthority = capturedInput.values.get(
    "admissionAuthority",
  ) as ManagedSurfaceStableAdmissionAuthorityInternalV1;
  const compositeRuntimeKernel = capturedInput.values.get(
    "compositeRuntimeKernel",
  ) as ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  const exactAggregateDefinitionSidecars = capturedInput.values.get(
    "exactAggregateDefinitionSidecars",
  ) as readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  const exactAggregateSlotDescriptors = capturedInput.values.get(
    "exactAggregateSlotDescriptors",
  ) as readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  const family = createWholeCanvasManagedSurfaceFamilyContractInternalV1(
    capturedInput.values.get("catalog") as readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
  );
  const rawSidecars = captureDenseFrozenArrayInternalV1(exactAggregateDefinitionSidecars);
  const resolveTarget = capturedInput.values.get("resolveTargetInternalV1");
  const dispatchOwnerAction = capturedInput.values.get("dispatchOwnerActionInternalV1");
  if (
    rawSidecars === null || typeof resolveTarget !== "function" ||
    (dispatchOwnerAction !== null && typeof dispatchOwnerAction !== "function")
  ) throw new TypeError("ui.whole_canvas_session_invalid");
  const sidecarsByDefinitionId = new Map<
    string,
    Readonly<{
      readonly sidecar: ManagedSurfaceStableDefinitionSidecarInternalV1;
      readonly definition: ManagedSurfaceResolvedDefinitionV1;
      readonly definitionId: string;
      readonly parameterSchema: unknown;
    }>
  >();
  for (const rawSidecar of rawSidecars) {
    const captured = captureDataRecordInternalV1(rawSidecar, ["definition", "parameterSchema"]);
    if (captured === null) continue;
    const rawDefinition = captured.values.get("definition");
    const capturedDefinition = captureDataRecordInternalV1(
      rawDefinition,
      managedSurfaceDefinitionOwnKeysInternalV1,
    );
    const definitionId = capturedDefinition?.values.get("definitionId");
    if (capturedDefinition !== null && typeof definitionId === "string") {
      const definition = Object.freeze(Object.fromEntries(
        managedSurfaceDefinitionOwnKeysInternalV1.map((key) => [
          key,
          capturedDefinition.values.get(key),
        ]),
      )) as unknown as ManagedSurfaceResolvedDefinitionV1;
      sidecarsByDefinitionId.set(
        definitionId,
        Object.freeze({
          sidecar: rawSidecar as ManagedSurfaceStableDefinitionSidecarInternalV1,
          definition,
          definitionId,
          parameterSchema: captured.values.get("parameterSchema"),
        }),
      );
    }
  }
  const primarySidecar = sidecarsByDefinitionId.get("surface.whole-canvas.primary");
  const splashSidecar = sidecarsByDefinitionId.get("surface.whole-canvas.boot-splash");
  const titleSidecar = sidecarsByDefinitionId.get("surface.whole-canvas.title");
  if (
    primarySidecar === undefined || splashSidecar === undefined || titleSidecar === undefined
  ) throw new TypeError("ui.whole_canvas_session_invalid");
  const requiredSidecars = Object.freeze([
    primarySidecar.sidecar,
    splashSidecar.sidecar,
    titleSidecar.sidecar,
  ]);
  const expectedPrimarySidecar = family.stableDefinitionSidecars[0];
  const expectedSplashSidecar = family.stableDefinitionSidecars[1];
  const expectedTitleSidecar = family.stableDefinitionSidecars[2];
  if (
    expectedPrimarySidecar === undefined || expectedSplashSidecar === undefined ||
    expectedTitleSidecar === undefined ||
    !sameDefinitionInternalV1(primarySidecar.definition, family.definitions.primary) ||
    !sameDefinitionInternalV1(splashSidecar.definition, family.definitions.bootSplash) ||
    !sameDefinitionInternalV1(titleSidecar.definition, family.definitions.title) ||
    primarySidecar.definitionId !== "surface.whole-canvas.primary" ||
    splashSidecar.definitionId !== "surface.whole-canvas.boot-splash" ||
    titleSidecar.definitionId !== "surface.whole-canvas.title" ||
    primarySidecar.parameterSchema !== expectedPrimarySidecar.parameterSchema ||
    splashSidecar.parameterSchema !== expectedSplashSidecar.parameterSchema ||
    titleSidecar.parameterSchema !== expectedTitleSidecar.parameterSchema ||
    !matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1(
      admissionAuthority,
      publisherLeaseRegistry,
      exactAggregateDefinitionSidecars,
      exactAggregateSlotDescriptors,
      requiredSidecars,
      family.resolvedSlotDescriptors,
    ) ||
    !matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1(
      compositeRuntimeKernel,
      admissionAuthority,
      publisherLeaseRegistry,
    )
  ) throw new TypeError("ui.whole_canvas_session_invalid");
  const hostPort = captureHostCommitPortInternalV1(
    capturedInput.values.get("hostCommitPortInternalV1"),
  );
  const catalogByTargetId = new Map(
    family.catalog.map((row) => [row.targetId, row] as const),
  );

  let publisher: ManagedSurfaceStablePublisherInternalV1 | null = null;
  let publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1 | null = null;
  let registered = false;
  try {
    publisher = publisherLeaseRegistry.issuePublisher(family.ownerId);
    publisherLease = publisher.lease;
    const registration = compositeRuntimeKernel.registerStablePublisherLeaseInternalV1(
      publisherLease,
    );
    if (registration.kind !== "registered") throw new TypeError();
    registered = true;
    const context = compositeRuntimeKernel.captureAdmissionContextInternalV1(publisherLease);
    if (
      context.kind !== "captured" || context.acceptedBaseline.kind !== "unpublished" ||
      context.acceptedBaseline.publisherLease !== publisherLease
    ) throw new TypeError();
  } catch (error) {
    if (publisherLease !== null) {
      try {
        if (registered) {
          compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1(publisherLease);
        } else {
          publisherLeaseRegistry.disposePublisherLease(publisherLease);
        }
      } catch {
        // Construction remains fail-closed even if hostile cleanup reports a second failure.
      }
    }
    throw new TypeError("ui.whole_canvas_session_invalid", { cause: error });
  }
  if (publisher === null || publisherLease === null) {
    throw new TypeError("ui.whole_canvas_session_invalid");
  }
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
    compositeRuntimeKernel,
  );
  const pendingProjectionRefreshAuthority:
    ManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1 =
      claimManagedSurfaceStablePendingProjectionRefreshAuthorityInternalV1(
        compositeRuntimeKernel,
        wholeCanvasExactChildClaimantInternalV1,
      );
  const detailAuthority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
    compositeRuntimeKernel,
    wholeCanvasExactChildClaimantInternalV1,
  );
  const detailReadinessAuthority =
    claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
      compositeRuntimeKernel,
      wholeCanvasExactChildClaimantInternalV1,
    );
  const detailLifecycleAuthority =
    claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
      compositeRuntimeKernel,
      wholeCanvasExactChildClaimantInternalV1,
    );
  const detailActionAuthority =
    claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
      compositeRuntimeKernel,
      wholeCanvasExactChildClaimantInternalV1,
    );

  const definitions = Object.freeze({
    primary: family.definitions.primary,
    bootSplash: family.definitions.bootSplash,
    title: family.definitions.title,
    detail: family.definitions.detail,
  });
  const listeners = new Set<() => void>();
  const preparationRecords = new WeakMap<
    WholeCanvasManagedSurfacePreparationInternalV1,
    PreparationRecordInternalV1
  >();
  const activePreparations = new Set<PreparationRecordInternalV1>();
  let terminal = false;
  let inputPublicationRevision = 0;
  const initialSurfacePublication = compositeRuntimeKernel.getTransientSnapshotInternalV1();
  let surfacePublicationRevision = Number(initialSurfacePublication.publicationRevision);
  let surfaceTopologyRevision = Number(initialSurfacePublication.topologyRevision);
  let uncommittedIssuance:
    | Readonly<{
      readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
      readonly occurrenceId: string | null;
      readonly targetKey: string | null;
      readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
      readonly attemptKey: string;
    }>
    | null = null;
  let aggregateDesired: CapturedRootAggregateDesiredInternalV1 = Object.freeze({
    bootSplash: null,
    title: null,
    story: null,
  });
  let bootSplashDismissed = false;
  let mutationPhase:
    | "idle"
    | "host_commit"
    | "kernel_transition"
    | "notifying"
    | "owner_effect" = "idle";
  let rootDesired: RootRuntimeRecordInternalV1 | null = null;
  let rootCurrentRecord: RootRuntimeRecordInternalV1 | null = null;
  let rootCurrent: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null = null;
  let rootPending: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null = null;
  let rootFailure: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null = null;
  let detailCurrentRecord: DetailRuntimeRecordInternalV1 | null = null;
  let detailCurrent: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null = null;
  let detailPending: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null = null;
  let detailFailure: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null = null;
  let snapshot!: WholeCanvasManagedSurfaceSnapshotInternalV1;

  const buildSnapshot = (): WholeCanvasManagedSurfaceSnapshotInternalV1 =>
    Object.freeze({
      root: Object.freeze({ current: rootCurrent, pending: rootPending, failure: rootFailure }),
      detail: Object.freeze({
        current: detailCurrent,
        pending: detailPending,
        failure: detailFailure,
      }),
      disposed: terminal,
    });
  snapshot = buildSnapshot();

  const stageSnapshot = (): WholeCanvasManagedSurfaceSnapshotInternalV1 => {
    snapshot = buildSnapshot();
    return snapshot;
  };

  const flushListeners = (): void => {
    const previousPhase = mutationPhase;
    mutationPhase = "notifying";
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Listener faults never truncate later observations.
      }
    }
    mutationPhase = previousPhase;
  };

  const runHostCommitPhase = <T>(callback: () => T): T => {
    const previousPhase = mutationPhase;
    mutationPhase = "host_commit";
    try {
      return callback();
    } finally {
      mutationPhase = previousPhase;
    }
  };

  const runKernelTransitionPhase = <T>(callback: () => T): T => {
    const previousPhase = mutationPhase;
    mutationPhase = "kernel_transition";
    try {
      return callback();
    } finally {
      mutationPhase = previousPhase;
    }
  };

  const mutationIsFenced = (): boolean =>
    mutationPhase === "host_commit" || mutationPhase === "kernel_transition";

  const notify = (): void => {
    stageSnapshot();
    flushListeners();
  };

  const completeInstalledAndNotify = (
    preparedHost: PreparedHostTransitionInternalV1,
  ): void => {
    stageSnapshot();
    flushListeners();
    preparedHost.complete();
  };

  const prepareHost = (
    request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  ): PreparedHostTransitionInternalV1 | null => {
    if (hostPort === null) {
      return Object.freeze({
        hostGeneration: 0,
        commit: () => true,
        abort: () => {},
        complete: () => {},
        didCommit: () => true,
      });
    }
    let rawPrepared: unknown;
    try {
      rawPrepared = runHostCommitPhase(() =>
        Reflect.apply(hostPort.prepare, hostPort.receiver, [request])
      );
    } catch {
      return null;
    }
    const captured = capturePreparedHostCommitInternalV1(rawPrepared);
    if (captured === null) return null;
    let committed = false;
    let finished = false;
    return Object.freeze({
      hostGeneration: captured.hostGeneration,
      commit(
        contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
        nextInputFrame: WholeCanvasManagedSurfaceFrameInternalV1 | null,
      ): boolean {
        if (finished || committed) return false;
        const commitInput = Object.freeze({ contract, nextInputFrame });
        try {
          const result = runHostCommitPhase(() =>
            Reflect.apply(captured.commit, captured.receiver, [commitInput])
          );
          committed = result === true;
          return committed;
        } catch {
          return false;
        }
      },
      abort(): void {
        if (finished) return;
        finished = true;
        try {
          runHostCommitPhase(() => Reflect.apply(captured.abort, captured.receiver, []));
        } catch {
          // Abort is contained; the generic kernel remains the mutation authority.
        }
      },
      complete(): void {
        if (finished) return;
        finished = true;
        try {
          runHostCommitPhase(() => Reflect.apply(captured.complete, captured.receiver, []));
        } catch {
          // Completion is post-install and cannot roll state back.
        }
      },
      didCommit: () => committed,
    });
  };

  const frameFor = (
    inputFrame: Readonly<{
      readonly root: RootRuntimeRecordInternalV1;
      readonly detail: DetailRuntimeRecordInternalV1 | null;
      readonly hostGeneration: number;
      readonly inputRevision: number;
      readonly publicationRevision: number;
      readonly topologyRevision: number;
    }>,
  ): WholeCanvasManagedSurfaceFrameInternalV1 =>
    Object.freeze({
      applicationEpoch: Number(
        compositeRuntimeKernel.getTransientSnapshotInternalV1().applicationEpoch,
      ),
      sourceRevision: Number(inputFrame.root.sourceRevision),
      primaryTargetOccurrenceId: inputFrame.root.occurrenceId,
      primaryInstanceId: inputFrame.root.instanceId,
      detailTargetOccurrenceId: inputFrame.detail?.occurrenceId ?? null,
      detailInstanceId: inputFrame.detail?.instanceId ?? null,
      surfacePublicationRevision: inputFrame.publicationRevision,
      surfaceTopologyRevision: inputFrame.topologyRevision,
      inputPublicationRevision: inputFrame.inputRevision,
      hostGeneration: inputFrame.hostGeneration,
    });

  const renderEntryFor = (
    placement: WholeCanvasManagedSurfacePlacementInternalV1,
    root: RootRuntimeRecordInternalV1,
    detail: DetailRuntimeRecordInternalV1 | null,
    frame: WholeCanvasManagedSurfaceFrameInternalV1,
  ): WholeCanvasManagedSurfaceRenderEntryInternalV1 => {
    const record = placement === "primary" ? root : detail;
    if (record === null) throw new TypeError("ui.whole_canvas_session_invalid");
    return Object.freeze({
      rootKind: root.rootKind,
      sourceKind: root.sourceKind,
      placement,
      target: record.target,
      resolved: record.resolved,
      frame,
    });
  };

  const nextRevisions = (advanceSurface: boolean): Readonly<{
    readonly input: number;
    readonly publication: number;
    readonly topology: number;
  }> => {
    return Object.freeze({
      input: inputPublicationRevision + 1,
      publication: surfacePublicationRevision + (advanceSurface ? 1 : 0),
      topology: surfaceTopologyRevision + (advanceSurface ? 1 : 0),
    });
  };

  const installRevisions = (
    revisions: Readonly<{
      readonly input: number;
      readonly publication: number;
      readonly topology: number;
    }>,
  ): void => {
    inputPublicationRevision = revisions.input;
    surfacePublicationRevision = revisions.publication;
    surfaceTopologyRevision = revisions.topology;
  };

  const currentAdmissionContext = ():
    | Readonly<{
      readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
      readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
    }>
    | null => {
    try {
      const captured = compositeRuntimeKernel.captureAdmissionContextInternalV1(publisherLease);
      return captured.kind === "captured"
        ? Object.freeze({
          acceptedBaseline: captured.acceptedBaseline,
          reservationSnapshot: captured.reservationSnapshot,
        })
        : null;
    } catch {
      return null;
    }
  };

  const captureRootAggregateDesired = (
    desiredInput: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null,
  ): CapturedRootAggregateDesiredInternalV1 | "invalid" => {
    if (desiredInput === null) {
      return Object.freeze({ bootSplash: null, title: null, story: null });
    }
    const desired = captureDataRecordInternalV1(desiredInput, [
      "bootSplash",
      "title",
      "story",
    ]);
    if (desired === null) return "invalid";
    const bootSplash = desired.values.get("bootSplash") === null
      ? null
      : captureTargetInternalV1(desired.values.get("bootSplash"));
    const title = desired.values.get("title") === null
      ? null
      : captureTargetInternalV1(desired.values.get("title"));
    const rawStory = desired.values.get("story");
    let story:
      | Readonly<{
        readonly sourceKind: "publication" | "application";
        readonly target: CapturedTargetInternalV1;
      }>
      | null = null;
    if (rawStory !== null) {
      const storyRecord = captureDataRecordInternalV1(rawStory, ["sourceKind", "target"]);
      const sourceKind = storyRecord?.values.get("sourceKind");
      const target = storyRecord === null
        ? null
        : captureTargetInternalV1(storyRecord.values.get("target"));
      if ((sourceKind !== "publication" && sourceKind !== "application") || target === null) {
        return "invalid";
      }
      const row = catalogByTargetId.get(target.target.targetId);
      if (row === undefined || !row.placements.includes("primary")) return "invalid";
      story = Object.freeze({ sourceKind, target });
    }
    if (
      (desired.values.get("bootSplash") !== null && bootSplash === null) ||
      (desired.values.get("title") !== null && title === null)
    ) return "invalid";
    return Object.freeze({ bootSplash, title, story });
  };

  const resolveSelection = (
    desired: CapturedRootAggregateDesiredInternalV1,
  ): RootSelectionInternalV1 | null | "invalid" => {
    const bootSplash = bootSplashDismissed ? null : desired.bootSplash;
    const title = desired.title;
    const story = desired.story;
    let selected:
      | Readonly<{
        readonly rootKind: WholeCanvasManagedSurfaceRootKindInternalV1;
        readonly sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1;
        readonly target: CapturedTargetInternalV1;
        readonly definition: ManagedSurfaceResolvedDefinitionV1;
        readonly row: WholeCanvasManagedSurfaceCatalogRowInternalV1 | null;
        readonly permittedBuiltinActionIds: readonly string[];
      }>
      | null = null;
    if (bootSplash !== null) {
      selected = Object.freeze({
        rootKind: "boot_splash" as const,
        sourceKind: "builtin" as const,
        target: bootSplash,
        definition: definitions.bootSplash,
        row: null,
        permittedBuiltinActionIds: Object.freeze(["whole-canvas.dismiss-splash"]),
      });
    } else if (title !== null) {
      selected = Object.freeze({
        rootKind: "title" as const,
        sourceKind: "builtin" as const,
        target: title,
        definition: definitions.title,
        row: null,
        permittedBuiltinActionIds: Object.freeze([
          "whole-canvas.title.new-game",
          "whole-canvas.title.continue",
          "whole-canvas.title.open-load",
          "whole-canvas.title.open-settings",
        ]),
      });
    } else if (story !== null) {
      const row = catalogByTargetId.get(story.target.target.targetId);
      if (row === undefined || !row.placements.includes("primary")) return "invalid";
      selected = Object.freeze({
        rootKind: "primary" as const,
        sourceKind: story.sourceKind,
        target: story.target,
        definition: definitions.primary,
        row,
        permittedBuiltinActionIds: Object.freeze([]),
      });
    }
    if (selected === null) return null;
    let rawResolved: unknown;
    try {
      rawResolved = Reflect.apply(resolveTarget, undefined, [Object.freeze({
        sourceKind: selected.sourceKind,
        rootKind: selected.rootKind,
        placement: "primary" as const,
        target: selected.target.target,
      })]);
    } catch {
      return "invalid";
    }
    const resolved = captureResolvedTargetInternalV1({
      value: rawResolved,
      sourceKind: selected.sourceKind,
      expectedActionIds: selected.row?.actionIds ?? null,
      permittedBuiltinActionIds: selected.permittedBuiltinActionIds,
      catalogByTargetId,
      ownerDispatchAvailable: dispatchOwnerAction !== null,
    });
    if (resolved === null) return "invalid";
    return Object.freeze({
      rootKind: selected.rootKind,
      sourceKind: selected.sourceKind,
      target: selected.target.target,
      targetKey: `${selected.definition.definitionId}\u0000${selected.target.canonicalKey}`,
      resolved: resolved.resolved,
      resolvedKey: resolved.canonicalKey,
      actionsKey: resolved.actionsCanonicalKey,
      definition: selected.definition,
      catalogRow: selected.row,
    });
  };

  const findRuntimeEntry = (
    target: ManagedSurfaceStableAdmittedTargetInternalV1,
  ): ManagedSurfaceStableRuntimeEntryInternalV1 | null =>
    compositeRuntimeKernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === target
    ) ?? null;

  const createPreparationToken = (): WholeCanvasManagedSurfacePreparationInternalV1 =>
    Object.freeze({}) as WholeCanvasManagedSurfacePreparationInternalV1;

  const applyRootSelection = (
    selection: RootSelectionInternalV1 | null,
    forceRetry = false,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    if (terminal) return staleResultInternalV1;
    const pendingRootRecord = rootPending === null
      ? null
      : preparationRecords.get(rootPending.preparation);
    const refreshesPendingRoot = selection !== null && pendingRootRecord?.kind === "root" &&
      pendingRootRecord.active && rootDesired === pendingRootRecord.root &&
      selection.targetKey === pendingRootRecord.root.targetKey &&
      selection.rootKind === pendingRootRecord.root.rootKind &&
      selection.sourceKind === pendingRootRecord.root.sourceKind;
    const refreshesCurrentRoot = selection !== null && rootCurrentRecord !== null &&
      rootDesired === rootCurrentRecord && selection.targetKey === rootCurrentRecord.targetKey;
    let refreshedDetailRecord = detailCurrentRecord;
    if (refreshesCurrentRoot && detailCurrentRecord !== null) {
      const refreshed = resolveDetail(
        detailCurrentRecord.target,
        selection.sourceKind,
        selection.rootKind,
      );
      if (refreshed === null) return rejectedResultInternalV1;
      refreshedDetailRecord = refreshed.resolvedKey === detailCurrentRecord.resolvedKey
        ? detailCurrentRecord
        : Object.freeze({
          ...detailCurrentRecord,
          rootKind: selection.rootKind,
          sourceKind: selection.sourceKind,
          resolved: refreshed.resolved,
          resolvedKey: refreshed.resolvedKey,
          actionsKey: refreshed.actionsKey,
        });
    }
    const pendingDetailRecord = detailPending === null
      ? null
      : preparationRecords.get(detailPending.preparation);
    let refreshedPendingDetail = pendingDetailRecord?.kind === "detail"
      ? pendingDetailRecord.detail
      : null;
    if (refreshesCurrentRoot && refreshedPendingDetail !== null) {
      const refreshed = resolveDetail(
        refreshedPendingDetail.target,
        selection.sourceKind,
        selection.rootKind,
      );
      if (refreshed === null) return rejectedResultInternalV1;
      if (refreshed.resolvedKey !== refreshedPendingDetail.resolvedKey) {
        refreshedPendingDetail = Object.freeze({
          ...refreshedPendingDetail,
          rootKind: selection.rootKind,
          sourceKind: selection.sourceKind,
          resolved: refreshed.resolved,
          resolvedKey: refreshed.resolvedKey,
          actionsKey: refreshed.actionsKey,
        });
      }
    }
    if (
      !forceRetry && selection === null && rootDesired === null
    ) return unchangedResultInternalV1;
    if (
      !forceRetry && selection !== null && rootDesired !== null &&
      selection.targetKey === rootDesired.targetKey &&
      selection.resolvedKey === rootDesired.resolvedKey &&
      refreshedDetailRecord === detailCurrentRecord &&
      (pendingDetailRecord?.kind !== "detail" ||
        refreshedPendingDetail === pendingDetailRecord.detail) &&
      selection.rootKind === rootDesired.rootKind &&
      selection.sourceKind === rootDesired.sourceKind
    ) return unchangedResultInternalV1;
    const context = currentAdmissionContext();
    if (context === null) return faultedResultInternalV1;
    const attemptKey = selection === null
      ? "close"
      : `${selection.rootKind}\u0000${selection.sourceKind}\u0000${selection.targetKey}\u0000${selection.resolvedKey}`;
    const reusableIssuance = uncommittedIssuance?.acceptedBaseline ===
          context.acceptedBaseline &&
        (uncommittedIssuance.attemptKey === attemptKey ||
          context.acceptedBaseline.kind === "unpublished")
      ? uncommittedIssuance
      : null;
    let sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
    let occurrenceId: string | null = null;
    try {
      sourceRevision = reusableIssuance?.sourceRevision ?? publisher.issueSourceRevision();
      if (selection !== null) {
        occurrenceId = rootDesired !== null && rootDesired.targetKey === selection.targetKey
          ? rootDesired.occurrenceId
          : reusableIssuance?.targetKey === selection.targetKey
          ? reusableIssuance.occurrenceId
          : String(publisher.issueOccurrence());
      }
    } catch {
      return faultedResultInternalV1;
    }
    const targets: readonly ManagedSurfaceStableTargetInternalV1[] = selection === null
      ? Object.freeze([])
      : Object.freeze([Object.freeze({
        occurrenceId,
        definitionId: selection.definition.definitionId,
        parentOccurrenceId: null,
        parameters: Object.freeze({
          targetId: selection.target.targetId,
          parameters: selection.target.parameters,
        }),
      }) as ManagedSurfaceStableTargetInternalV1]);
    let evaluated: ManagedSurfaceStableAdmissionResultInternalV1;
    try {
      evaluated = admissionAuthority.evaluate({
        publication: Object.freeze({ publisherLease, sourceRevision, targets }),
        acceptedBaseline: context.acceptedBaseline,
        reservationSnapshot: context.reservationSnapshot,
      });
    } catch {
      return faultedResultInternalV1;
    }
    if (evaluated.kind !== "admitted") {
      return evaluated.kind === "rejected"
        ? rejectedResultInternalV1
        : evaluated.kind === "stale"
        ? staleResultInternalV1
        : faultedResultInternalV1;
    }
    const admittedTarget = selection === null
      ? null
      : evaluated.proposal.nextAcceptedBaseline.targets[0] ?? null;
    if ((selection === null) !== (admittedTarget === null)) return faultedResultInternalV1;
    const sameTargetRefresh = refreshesCurrentRoot || refreshesPendingRoot;
    const transition = selection === null
      ? "primary_close" as const
      : sameTargetRefresh
      ? "same_target_refresh" as const
      : rootCurrentRecord === null
      ? "initial_open" as const
      : "primary_replacement" as const;
    const request = Object.freeze({
      kind: "root_admission" as const,
      transition,
      currentRootFrame: rootCurrent?.frame ?? null,
      currentDetailFrame: detailCurrent?.frame ?? null,
    });
    const preparedHost = prepareHost(request);
    if (preparedHost === null) {
      uncommittedIssuance = Object.freeze({
        sourceRevision,
        occurrenceId,
        targetKey: selection?.targetKey ?? null,
        acceptedBaseline: context.acceptedBaseline,
        attemptKey,
      });
      return faultedResultInternalV1;
    }
    let nextRecord: RootRuntimeRecordInternalV1 | null = null;
    let nextRootEntry: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null = null;
    let nextDetailEntry: WholeCanvasManagedSurfaceRenderEntryInternalV1 | null = null;
    let nextPendingDetailEntry: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null = null;
    const actionPublicationChanged = refreshesCurrentRoot && rootCurrentRecord !== null &&
      selection !== null &&
      (selection.actionsKey !== rootCurrentRecord.actionsKey ||
        refreshedDetailRecord?.actionsKey !== detailCurrentRecord?.actionsKey);
    const revisions = sameTargetRefresh
      ? Object.freeze({
        input: inputPublicationRevision + (actionPublicationChanged ? 1 : 0),
        publication: surfacePublicationRevision + 1,
        topology: surfaceTopologyRevision + (actionPublicationChanged ? 1 : 0),
      })
      : nextRevisions(selection === null);
    if (selection !== null && admittedTarget !== null && sameTargetRefresh && rootCurrentRecord) {
      nextRecord = Object.freeze({
        ...selection,
        occurrenceId: rootCurrentRecord.occurrenceId,
        admittedTarget,
        sourceRevision,
        instanceId: rootCurrentRecord.instanceId,
      });
      const retainedDetail = refreshedDetailRecord ?? refreshedPendingDetail;
      const frame = frameFor({
        root: nextRecord,
        detail: retainedDetail,
        hostGeneration: preparedHost.hostGeneration,
        inputRevision: revisions.input,
        publicationRevision: revisions.publication,
        topologyRevision: revisions.topology,
      });
      nextRootEntry = renderEntryFor("primary", nextRecord, retainedDetail, frame);
      nextDetailEntry = retainedDetail === null
        ? null
        : refreshedDetailRecord === null
        ? null
        : renderEntryFor("detail", nextRecord, refreshedDetailRecord, frame);
      if (
        pendingDetailRecord?.kind === "detail" && refreshedPendingDetail !== null
      ) {
        nextPendingDetailEntry = Object.freeze({
          renderEntry: renderEntryFor("detail", nextRecord, refreshedPendingDetail, frame),
          preparation: pendingDetailRecord.token,
          transition: pendingDetailRecord.readinessEntry.transition,
        });
      }
    }
    const nextInputFrame = transition === "same_target_refresh"
      ? refreshesPendingRoot
        ? rootCurrent?.frame ?? null
        : detailPending !== null
        ? null
        : (nextDetailEntry ?? nextRootEntry)?.frame ?? null
      : transition === "primary_replacement"
      ? rootCurrent?.frame ?? null
      : null;
    const guard = Object.freeze({
      commitInternalV1: (
        contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
      ): boolean => preparedHost.commit(contract, nextInputFrame),
    });
    let applied;
    try {
      applied = runKernelTransitionPhase(() =>
        refreshesPendingRoot && pendingRootRecord?.kind === "root"
          ? pendingProjectionRefreshAuthority
            .applyPendingProjectionRefreshWithCommitGuardInternalV1(
              evaluated.proposal,
              pendingRootRecord.runtimeEntry,
              guard,
            )
          : compositeRuntimeKernel.applyStableAdmissionProposalWithCommitGuardInternalV1(
            evaluated.proposal,
            guard,
          )
      );
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    if (applied.kind !== "applied" || !preparedHost.didCommit()) {
      if (!preparedHost.didCommit()) {
        uncommittedIssuance = Object.freeze({
          sourceRevision,
          occurrenceId,
          targetKey: selection?.targetKey ?? null,
          acceptedBaseline: context.acceptedBaseline,
          attemptKey,
        });
      }
      preparedHost.abort();
      return preparedHost.didCommit()
        ? applied.kind === "stale" ? staleResultInternalV1 : faultedResultInternalV1
        : faultedResultInternalV1;
    }
    uncommittedIssuance = null;
    installRevisions(revisions);
    if (
      refreshesPendingRoot && pendingRootRecord?.kind === "root" && selection !== null &&
      admittedTarget !== null
    ) {
      const runtimeEntry = findRuntimeEntry(admittedTarget);
      if (runtimeEntry === null || runtimeEntry.binding.kind !== "preparing") {
        return faultedResultInternalV1;
      }
      const rootRecord: RootRuntimeRecordInternalV1 = Object.freeze({
        ...selection,
        occurrenceId: pendingRootRecord.root.occurrenceId,
        admittedTarget,
        sourceRevision,
        instanceId: pendingRootRecord.root.instanceId,
      });
      const pendingFrame = frameFor({
        root: rootRecord,
        detail: null,
        hostGeneration: preparedHost.hostGeneration,
        inputRevision: revisions.input,
        publicationRevision: revisions.publication,
        topologyRevision: revisions.topology,
      });
      const readinessEntry = Object.freeze({
        renderEntry: renderEntryFor("primary", rootRecord, null, pendingFrame),
        preparation: pendingRootRecord.token,
        transition: pendingRootRecord.readinessEntry.transition,
      });
      pendingRootRecord.root = rootRecord;
      pendingRootRecord.runtimeEntry = runtimeEntry;
      pendingRootRecord.readinessEntry = readinessEntry;
      rootDesired = rootRecord;
      rootPending = readinessEntry;
      rootFailure = null;
      completeInstalledAndNotify(preparedHost);
      return appliedResultInternalV1;
    }
    if (selection === null) {
      for (const record of activePreparations) record.active = false;
      activePreparations.clear();
      rootDesired = null;
      rootCurrentRecord = null;
      rootCurrent = null;
      rootPending = null;
      rootFailure = null;
      detailCurrentRecord = null;
      detailCurrent = null;
      detailPending = null;
      detailFailure = null;
      completeInstalledAndNotify(preparedHost);
      return appliedResultInternalV1;
    }
    if (admittedTarget === null) return faultedResultInternalV1;
    const runtimeEntry = findRuntimeEntry(admittedTarget);
    if (runtimeEntry === null) return faultedResultInternalV1;
    if (
      sameTargetRefresh && nextRecord !== null && nextRootEntry !== null &&
      runtimeEntry.binding.kind === "ready_instance"
    ) {
      rootDesired = nextRecord;
      rootCurrentRecord = nextRecord;
      rootCurrent = nextRootEntry;
      detailCurrentRecord = refreshedDetailRecord;
      detailCurrent = nextDetailEntry;
      if (
        pendingDetailRecord?.kind === "detail" && refreshedPendingDetail !== null &&
        nextPendingDetailEntry !== null
      ) {
        pendingDetailRecord.detail = refreshedPendingDetail;
        pendingDetailRecord.readinessEntry = nextPendingDetailEntry;
        detailPending = nextPendingDetailEntry;
      }
      rootPending = null;
      rootFailure = null;
      completeInstalledAndNotify(preparedHost);
      return appliedResultInternalV1;
    }
    if (runtimeEntry.binding.kind !== "preparing") return faultedResultInternalV1;
    const rootRecord: RootRuntimeRecordInternalV1 = Object.freeze({
      ...selection,
      occurrenceId: String(occurrenceId),
      admittedTarget,
      sourceRevision,
      instanceId: String(runtimeEntry.binding.attempt.identity.surfaceInstanceId),
    });
    const publication = compositeRuntimeKernel.getTransientSnapshotInternalV1();
    const pendingFrame = frameFor({
      root: rootRecord,
      detail: null,
      hostGeneration: preparedHost.hostGeneration,
      inputRevision: revisions.input,
      publicationRevision: Number(publication.publicationRevision),
      topologyRevision: Number(publication.topologyRevision),
    });
    const pendingRenderEntry = renderEntryFor("primary", rootRecord, null, pendingFrame);
    const token = createPreparationToken();
    const readinessEntry = Object.freeze({
      renderEntry: pendingRenderEntry,
      preparation: token,
      transition: runtimeEntry.binding.transition,
    });
    const preparationRecord: RootPreparationRecordInternalV1 = {
      kind: "root",
      token,
      root: rootRecord,
      runtimeEntry,
      readinessEntry,
      active: true,
    };
    preparationRecords.set(token, preparationRecord);
    for (const activeRecord of [...activePreparations]) {
      if (activeRecord.kind === "root") {
        activeRecord.active = false;
        activePreparations.delete(activeRecord);
      }
    }
    activePreparations.add(preparationRecord);
    rootDesired = rootRecord;
    rootPending = readinessEntry;
    rootFailure = null;
    completeInstalledAndNotify(preparedHost);
    return appliedResultInternalV1;
  };

  const applyAggregateDesired = (
    nextDesired: CapturedRootAggregateDesiredInternalV1,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    const selection = resolveSelection(nextDesired);
    if (selection === "invalid") return rejectedResultInternalV1;
    const result = applyRootSelection(selection);
    if (result.kind === "applied" || result.kind === "unchanged") {
      aggregateDesired = nextDesired;
    }
    return result;
  };

  const advanceCachedRoot = (
    rootKind: WholeCanvasManagedSurfaceRootKindInternalV1,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    const nextDesired = Object.freeze({
      bootSplash: rootKind === "boot_splash" ? null : aggregateDesired.bootSplash,
      title: rootKind === "title" ? null : aggregateDesired.title,
      story: rootKind === "primary" ? null : aggregateDesired.story,
    });
    const result = applyAggregateDesired(nextDesired);
    if (rootKind === "boot_splash" && result.kind === "applied") {
      bootSplashDismissed = true;
    }
    return result;
  };

  const settleRootPreparation = (
    record: RootPreparationRecordInternalV1,
    outcome: "ready" | "failed",
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    if (terminal || !record.active || rootPending !== record.readinessEntry) {
      return staleResultInternalV1;
    }
    const retainedRootFrame = rootCurrent?.frame ?? null;
    const request = Object.freeze({
      kind: "root_readiness" as const,
      preparation: record.token,
      outcome,
      retainedRootFrame,
    });
    const preparedHost = prepareHost(request);
    if (preparedHost === null) return faultedResultInternalV1;
    const revisions = nextRevisions(true);
    const readyFrame = outcome === "ready"
      ? frameFor({
        root: record.root,
        detail: null,
        hostGeneration: preparedHost.hostGeneration,
        inputRevision: revisions.input,
        publicationRevision: revisions.publication,
        topologyRevision: revisions.topology,
      })
      : null;
    const nextInputFrame = outcome === "ready" ? readyFrame : retainedRootFrame;
    const binding = record.runtimeEntry.binding;
    if (binding.kind !== "preparing") {
      preparedHost.abort();
      return staleResultInternalV1;
    }
    const envelope = Object.freeze({
      readinessEvidence: Object.freeze({
        applicationEpoch: binding.attempt.identity.allocation.applicationEpoch,
        surfaceInstanceId: binding.attempt.identity.surfaceInstanceId,
      }),
      publisherLease,
      sourceRevision: binding.attempt.desiredTarget.sourceRevision,
    });
    const guard = Object.freeze({
      commitInternalV1: (
        contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
      ): boolean => preparedHost.commit(contract, nextInputFrame),
    });
    let settled;
    try {
      settled = runKernelTransitionPhase(() =>
        outcome === "ready"
          ? compositeRuntimeKernel.settleStableReadinessReadyWithCommitGuardInternalV1(
            envelope,
            guard,
          )
          : compositeRuntimeKernel.settleStableReadinessFailedWithCommitGuardInternalV1(
            envelope,
            guard,
          )
      );
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    if (settled.kind !== "applied" || !preparedHost.didCommit()) {
      preparedHost.abort();
      return preparedHost.didCommit() && settled.kind === "stale"
        ? staleResultInternalV1
        : faultedResultInternalV1;
    }
    installRevisions(revisions);
    record.active = false;
    activePreparations.delete(record);
    rootPending = null;
    if (outcome === "ready" && readyFrame !== null) {
      for (const activeRecord of [...activePreparations]) {
        if (activeRecord.kind === "detail") {
          activeRecord.active = false;
          activePreparations.delete(activeRecord);
        }
      }
      rootCurrentRecord = record.root;
      rootCurrent = renderEntryFor("primary", record.root, null, readyFrame);
      rootFailure = null;
      detailCurrentRecord = null;
      detailCurrent = null;
      detailPending = null;
      detailFailure = null;
      completeInstalledAndNotify(preparedHost);
      return appliedResultInternalV1;
    }
    rootFailure = record.readinessEntry;
    completeInstalledAndNotify(preparedHost);
    return faultedResultInternalV1;
  };

  const captureCurrentRootParent = () => {
    const captured = stableActionAuthority.captureCurrentStableInputInternalV1();
    if (
      captured.kind !== "captured" || rootCurrent === null || rootCurrentRecord === null ||
      captured.contract.surfaceInstanceId !== rootCurrent.frame.primaryInstanceId
    ) return null;
    if (
      captured.directTarget !== null && captured.sourceRevision !== null &&
      captured.targetProof !== null
    ) return captured;
    if (rootPending === null) return null;
    const pendingRecord = preparationRecords.get(rootPending.preparation);
    if (pendingRecord?.kind !== "root" || !pendingRecord.active) return null;
    const retained = detailAuthority.captureRetainedExactParentInputInternalV1(Object.freeze({
      expectedCarrierEntry: pendingRecord.runtimeEntry,
      expectedParentInstanceId: rootCurrent.frame.primaryInstanceId,
      expectedParent: rootCurrentRecord.admittedTarget,
      expectedSourceRevision: rootCurrentRecord.sourceRevision,
    }));
    return retained.kind === "captured" && retained.directTarget !== null &&
        retained.sourceRevision !== null && retained.targetProof !== null &&
        retained.contract.surfaceInstanceId === rootCurrent.frame.primaryInstanceId
      ? retained
      : null;
  };

  function resolveDetail(
    targetInput: unknown,
    sourceKind: WholeCanvasManagedSurfaceSourceKindInternalV1,
    rootKind: WholeCanvasManagedSurfaceRootKindInternalV1,
  ):
    | Readonly<{
      readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
      readonly targetKey: string;
      readonly resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1;
      readonly resolvedKey: string;
      readonly actionsKey: string;
    }>
    | null {
    const target = captureTargetInternalV1(targetInput);
    if (target === null) return null;
    const row = catalogByTargetId.get(target.target.targetId);
    if (row === undefined || !row.placements.includes("detail")) return null;
    let rawResolved: unknown;
    try {
      rawResolved = Reflect.apply(
        resolveTarget as WholeCanvasManagedSurfaceResolveTargetInternalV1,
        undefined,
        [Object.freeze({
          sourceKind,
          rootKind,
          placement: "detail" as const,
          target: target.target,
        })],
      );
    } catch {
      return null;
    }
    const resolved = captureResolvedTargetInternalV1({
      value: rawResolved,
      sourceKind,
      expectedActionIds: row.actionIds,
      permittedBuiltinActionIds: Object.freeze([]),
      catalogByTargetId,
      ownerDispatchAvailable: dispatchOwnerAction !== null,
    });
    return resolved === null ? null : Object.freeze({
      target: target.target,
      targetKey: target.canonicalKey,
      resolved: resolved.resolved,
      resolvedKey: resolved.canonicalKey,
      actionsKey: resolved.actionsCanonicalKey,
    });
  }

  const openDetail = (
    inputDetail: Readonly<{
      readonly target: unknown;
      readonly sourceFrame: WholeCanvasManagedSurfaceFrameInternalV1;
      readonly parentProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
      readonly parentTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
      readonly parentSourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
    }>,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    if (terminal || rootCurrentRecord === null || rootCurrent === null) {
      return staleResultInternalV1;
    }
    const resolved = resolveDetail(
      inputDetail.target,
      rootCurrentRecord.sourceKind,
      rootCurrentRecord.rootKind,
    );
    if (resolved === null) return rejectedResultInternalV1;
    if (detailCurrentRecord !== null && resolved.targetKey === detailCurrentRecord.targetKey) {
      if (resolved.resolvedKey === detailCurrentRecord.resolvedKey) {
        return unchangedResultInternalV1;
      }
      return rootDesired === rootCurrentRecord && rootCurrentRecord !== null
        ? applyRootSelection(rootCurrentRecord)
        : unchangedResultInternalV1;
    }
    const replacedDetailFrame = detailCurrent?.frame ?? null;
    const request = Object.freeze({
      kind: "detail_prepare" as const,
      transition: detailCurrentRecord === null ? "open" as const : "replace" as const,
      sourceFrame: inputDetail.sourceFrame,
      parentFrame: rootCurrent.frame,
      replacedDetailFrame,
    });
    const preparedHost = prepareHost(request);
    if (preparedHost === null) return faultedResultInternalV1;
    let occurrenceId: string;
    try {
      occurrenceId = String(publisher.issueOccurrence());
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    let committedCandidate:
      | ManagedSurfaceStableExactParentTransientChildCandidateInternalV1
      | null = null;
    const commitGuard = Object.freeze({
      commitInternalV1: (
        candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
      ): boolean => {
        const committed = preparedHost.commit(null, null);
        if (committed) committedCandidate = candidate;
        return committed;
      },
    });
    let prepared;
    try {
      prepared = runKernelTransitionPhase(() =>
        detailAuthority.prepareExactParentTransientChildInternalV1(Object.freeze({
          parentProof: inputDetail.parentProof,
          expectedParent: inputDetail.parentTarget,
          expectedSourceRevision: inputDetail.parentSourceRevision,
          definition: definitions.detail,
          semanticOccurrenceId: null,
          commitGuard,
        }))
      );
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    if (
      prepared.kind !== "installed" || !preparedHost.didCommit() ||
      committedCandidate !== prepared.candidate
    ) {
      preparedHost.abort();
      return prepared.kind === "stale" ? staleResultInternalV1 : faultedResultInternalV1;
    }
    const publication = compositeRuntimeKernel.getTransientSnapshotInternalV1();
    const instance = publication.orderedInstances.find((candidate) =>
      candidate.definition.definitionId === definitions.detail.definitionId
    );
    if (instance === undefined) return faultedResultInternalV1;
    const detailRecord: DetailRuntimeRecordInternalV1 = Object.freeze({
      rootKind: rootCurrentRecord.rootKind,
      sourceKind: rootCurrentRecord.sourceKind,
      target: resolved.target,
      targetKey: resolved.targetKey,
      resolved: resolved.resolved,
      resolvedKey: resolved.resolvedKey,
      actionsKey: resolved.actionsKey,
      occurrenceId,
      instanceId: String(instance.surfaceInstanceId),
      candidate: prepared.candidate,
      parentProof: inputDetail.parentProof,
      parentTarget: inputDetail.parentTarget,
      parentSourceRevision: inputDetail.parentSourceRevision,
    });
    const revisions = nextRevisions(true);
    const pendingFrame = frameFor({
      root: rootCurrentRecord,
      detail: detailRecord,
      hostGeneration: preparedHost.hostGeneration,
      inputRevision: revisions.input,
      publicationRevision: revisions.publication,
      topologyRevision: revisions.topology,
    });
    const rootFrame = frameFor({
      root: rootCurrentRecord,
      detail: detailRecord,
      hostGeneration: preparedHost.hostGeneration,
      inputRevision: revisions.input,
      publicationRevision: revisions.publication,
      topologyRevision: revisions.topology,
    });
    rootCurrent = renderEntryFor("primary", rootCurrentRecord, detailRecord, rootFrame);
    const pendingRenderEntry = renderEntryFor(
      "detail",
      rootCurrentRecord,
      detailRecord,
      pendingFrame,
    );
    const token = createPreparationToken();
    const readinessEntry = Object.freeze({
      renderEntry: pendingRenderEntry,
      preparation: token,
      transition: "child_open" as const,
    });
    const record: DetailPreparationRecordInternalV1 = {
      kind: "detail",
      token,
      detail: detailRecord,
      readinessEntry,
      active: true,
    };
    preparationRecords.set(token, record);
    activePreparations.add(record);
    installRevisions(revisions);
    detailCurrentRecord = null;
    detailCurrent = null;
    detailPending = readinessEntry;
    detailFailure = null;
    completeInstalledAndNotify(preparedHost);
    return appliedResultInternalV1;
  };

  const settleDetailPreparation = (
    record: DetailPreparationRecordInternalV1,
    outcome: "ready" | "failed",
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    if (
      terminal || !record.active || detailPending !== record.readinessEntry ||
      rootCurrentRecord === null || rootCurrent === null
    ) return staleResultInternalV1;
    const request = Object.freeze({
      kind: "detail_readiness" as const,
      preparation: record.token,
      outcome,
      parentFrame: rootCurrent.frame,
    });
    const preparedHost = prepareHost(request);
    if (preparedHost === null) return faultedResultInternalV1;
    const revisions = nextRevisions(true);
    const nextDetailFrame = outcome === "ready"
      ? frameFor({
        root: rootCurrentRecord,
        detail: record.detail,
        hostGeneration: preparedHost.hostGeneration,
        inputRevision: revisions.input,
        publicationRevision: revisions.publication,
        topologyRevision: revisions.topology,
      })
      : null;
    const nextParentFrame = outcome === "failed"
      ? frameFor({
        root: rootCurrentRecord,
        detail: null,
        hostGeneration: preparedHost.hostGeneration,
        inputRevision: revisions.input,
        publicationRevision: revisions.publication,
        topologyRevision: revisions.topology,
      })
      : null;
    const guard = Object.freeze({
      commitInternalV1: (
        contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
      ): boolean =>
        preparedHost.commit(
          contract,
          outcome === "ready" ? nextDetailFrame : nextParentFrame,
        ),
    });
    let settled;
    try {
      settled = runKernelTransitionPhase(() =>
        outcome === "ready"
          ? detailReadinessAuthority
            .settleExactParentTransientChildReadinessReadyInternalV1(
              record.detail.candidate,
              guard,
            )
          : detailReadinessAuthority
            .settleExactParentTransientChildReadinessFailedInternalV1(
              record.detail.candidate,
              guard,
            )
      );
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    if (settled.kind !== "applied" || !preparedHost.didCommit()) {
      preparedHost.abort();
      return settled.kind === "stale" ? staleResultInternalV1 : faultedResultInternalV1;
    }
    let installedDetailRecord = record.detail;
    if (outcome === "ready") {
      const captured = detailActionAuthority
        .captureCurrentExactParentTransientChildInputInternalV1(record.detail.candidate);
      if (
        captured.kind !== "captured" ||
        captured.contract.surfaceInstanceId !== record.detail.instanceId
      ) {
        preparedHost.abort();
        return faultedResultInternalV1;
      }
      installedDetailRecord = Object.freeze({
        ...record.detail,
        parentProof: captured.parentTargetProof,
        parentTarget: captured.parentDirectTarget,
        parentSourceRevision: captured.parentSourceRevision,
      });
      record.detail = installedDetailRecord;
    }
    installRevisions(revisions);
    record.active = false;
    activePreparations.delete(record);
    detailPending = null;
    if (outcome === "ready" && nextDetailFrame !== null) {
      detailCurrentRecord = installedDetailRecord;
      detailCurrent = renderEntryFor(
        "detail",
        rootCurrentRecord,
        installedDetailRecord,
        nextDetailFrame,
      );
      rootCurrent = renderEntryFor(
        "primary",
        rootCurrentRecord,
        installedDetailRecord,
        nextDetailFrame,
      );
      detailFailure = null;
      completeInstalledAndNotify(preparedHost);
      return appliedResultInternalV1;
    }
    detailCurrentRecord = null;
    detailCurrent = null;
    detailFailure = record.readinessEntry;
    if (nextParentFrame !== null) {
      rootCurrent = renderEntryFor("primary", rootCurrentRecord, null, nextParentFrame);
    }
    completeInstalledAndNotify(preparedHost);
    return faultedResultInternalV1;
  };

  const closeDetail = (
    frame: WholeCanvasManagedSurfaceFrameInternalV1,
    dismissKind: ManagedSurfaceDismissKindV1 | null,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    if (
      terminal || detailCurrentRecord === null || detailCurrent === null ||
      rootCurrentRecord === null || rootCurrent === null || detailCurrent.frame !== frame
    ) return staleResultInternalV1;
    const currentDetailCandidate = detailCurrentRecord.candidate;
    const request = Object.freeze({
      kind: "detail_lifecycle" as const,
      transition: dismissKind === null ? "close" as const : "dismiss" as const,
      detailFrame: frame,
      parentFrame: rootCurrent.frame,
      dismissKind,
    });
    const preparedHost = prepareHost(request);
    if (preparedHost === null) return faultedResultInternalV1;
    const revisions = nextRevisions(true);
    const parentFrame = frameFor({
      root: rootCurrentRecord,
      detail: null,
      hostGeneration: preparedHost.hostGeneration,
      inputRevision: revisions.input,
      publicationRevision: revisions.publication,
      topologyRevision: revisions.topology,
    });
    const guard = Object.freeze({
      commitInternalV1: (
        contract: ManagedSurfacePreparedInputBindingContractInternalV1,
      ): boolean => preparedHost.commit(contract, parentFrame),
    });
    let closed;
    try {
      closed = runKernelTransitionPhase(() =>
        dismissKind === null
          ? detailLifecycleAuthority.closeExactParentTransientChildInternalV1(
            currentDetailCandidate,
            guard,
          )
          : detailLifecycleAuthority.dismissExactParentTransientChildInternalV1(
            currentDetailCandidate,
            dismissKind,
            guard,
          )
      );
    } catch {
      preparedHost.abort();
      return faultedResultInternalV1;
    }
    if (closed.kind !== "applied" || !preparedHost.didCommit()) {
      preparedHost.abort();
      return closed.kind === "stale"
        ? staleResultInternalV1
        : closed.kind === "locked"
        ? unchangedResultInternalV1
        : faultedResultInternalV1;
    }
    installRevisions(revisions);
    detailCurrentRecord = null;
    detailCurrent = null;
    detailPending = null;
    detailFailure = null;
    rootCurrent = renderEntryFor("primary", rootCurrentRecord, null, parentFrame);
    completeInstalledAndNotify(preparedHost);
    return appliedResultInternalV1;
  };

  const captureCurrentAction = (
    entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
  ) => {
    if (entry.placement === "detail") {
      if (detailCurrentRecord === null) return null;
      const captured = detailActionAuthority
        .captureCurrentExactParentTransientChildInputInternalV1(
          detailCurrentRecord.candidate,
        );
      return captured.kind === "captured" &&
          captured.contract.surfaceInstanceId === entry.frame.detailInstanceId
        ? Object.freeze({ kind: "detail" as const, captured })
        : null;
    }
    const captured = captureCurrentRootParent();
    return captured !== null &&
        captured.contract.surfaceInstanceId === entry.frame.primaryInstanceId
      ? Object.freeze({ kind: "root" as const, captured })
      : null;
  };

  const routePublishedAction = (
    captured: NonNullable<ReturnType<typeof captureCurrentAction>>,
    actionId: string,
  ): boolean => {
    const contract = captured.captured.contract;
    const request = Object.freeze({
      evidence: Object.freeze({
        applicationEpoch: contract.applicationEpoch,
        topologyRevision: contract.topologyRevision,
        surfaceInstanceId: contract.surfaceInstanceId,
      }),
      actionId: parseManagedSurfaceActionIdV1(actionId),
      routingLeaseId: contract.routingLeaseId,
    });
    try {
      const result = captured.kind === "root"
        ? stableActionAuthority.routeActionInternalV1(request)
        : detailActionAuthority.routeActionInternalV1(request);
      return result.kind === "unchanged" && result.code === "surface.action_routed";
    } catch {
      return false;
    }
  };

  const dispatchResolvedAction = (
    entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
    actionId: string,
  ): WholeCanvasManagedSurfaceResultInternalV1 => {
    const action = entry.resolved.actions.find((candidate) => candidate.actionId === actionId);
    if (action === undefined || action.status === "disabled") return rejectedResultInternalV1;
    const captured = captureCurrentAction(entry);
    if (captured === null || !routePublishedAction(captured, actionId)) {
      return staleResultInternalV1;
    }
    switch (action.intent.kind) {
      case "back":
        return entry.placement === "detail"
          ? closeDetail(entry.frame, null)
          : unchangedResultInternalV1;
      case "close_primary":
        return advanceCachedRoot(entry.rootKind);
      case "replace_primary": {
        if (entry.sourceKind !== "application") return rejectedResultInternalV1;
        const target = captureTargetInternalV1(action.intent.target);
        if (target === null) return rejectedResultInternalV1;
        const desired: CapturedRootAggregateDesiredInternalV1 = Object.freeze({
          bootSplash: aggregateDesired.bootSplash,
          title: aggregateDesired.title,
          story: Object.freeze({
            sourceKind: "application" as const,
            target,
          }),
        });
        return applyAggregateDesired(desired);
      }
      case "open_detail": {
        if (captured.kind === "root") {
          const parent = captured.captured;
          if (
            parent.targetProof === null || parent.directTarget === null ||
            parent.sourceRevision === null
          ) return staleResultInternalV1;
          return openDetail({
            target: action.intent.target,
            sourceFrame: entry.frame,
            parentProof: parent.targetProof,
            parentTarget: parent.directTarget,
            parentSourceRevision: parent.sourceRevision,
          });
        }
        return openDetail({
          target: action.intent.target,
          sourceFrame: entry.frame,
          parentProof: captured.captured.parentTargetProof,
          parentTarget: captured.captured.parentDirectTarget,
          parentSourceRevision: captured.captured.parentSourceRevision,
        });
      }
      case "owner": {
        if (dispatchOwnerAction === null || rootCurrentRecord === null) {
          return rejectedResultInternalV1;
        }
        const request = Object.freeze({
          sourceKind: entry.sourceKind,
          rootKind: entry.rootKind,
          placement: entry.placement,
          primary: rootCurrentRecord.target,
          detail: entry.placement === "detail" ? entry.target : null,
          actionId,
          payload: action.intent.payload,
        });
        try {
          const previousPhase = mutationPhase;
          mutationPhase = "owner_effect";
          let promise: unknown;
          try {
            promise = Reflect.apply(dispatchOwnerAction, undefined, [request]);
          } finally {
            mutationPhase = previousPhase;
          }
          void Promise.resolve(promise).catch(() => {});
          return appliedResultInternalV1;
        } catch {
          return faultedResultInternalV1;
        }
      }
    }
    return faultedResultInternalV1;
  };

  let session!: WholeCanvasManagedSurfaceSessionInternalV1;
  session = Object.freeze({
    getSnapshotInternalV1(): WholeCanvasManagedSurfaceSnapshotInternalV1 {
      return snapshot;
    },
    subscribeInternalV1(listener: () => void): () => void {
      if (
        typeof listener !== "function" || terminal || mutationIsFenced()
      ) return Object.freeze(() => {});
      listeners.add(listener);
      let active = true;
      return Object.freeze((): void => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      });
    },
    reconcileRootInternalV1(
      desired: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (terminal || mutationIsFenced()) return staleResultInternalV1;
      const captured = captureRootAggregateDesired(desired);
      return captured === "invalid" ? rejectedResultInternalV1 : applyAggregateDesired(captured);
    },
    retryCurrentInternalV1(): WholeCanvasManagedSurfaceResultInternalV1 {
      if (terminal || mutationIsFenced()) return staleResultInternalV1;
      if (detailFailure !== null) {
        const failed = preparationRecords.get(detailFailure.preparation);
        if (
          failed?.kind !== "detail" || rootCurrent === null || rootCurrentRecord === null
        ) return staleResultInternalV1;
        const parent = captureCurrentRootParent();
        if (
          parent === null || parent.targetProof === null || parent.directTarget === null ||
          parent.sourceRevision === null
        ) return staleResultInternalV1;
        return openDetail({
          target: failed.detail.target,
          sourceFrame: rootCurrent.frame,
          parentProof: parent.targetProof,
          parentTarget: parent.directTarget,
          parentSourceRevision: parent.sourceRevision,
        });
      }
      if (rootFailure === null || rootDesired === null) return unchangedResultInternalV1;
      const selection: RootSelectionInternalV1 = rootDesired;
      return applyRootSelection(selection, true);
    },
    settleReadinessReadyInternalV1(
      preparation: WholeCanvasManagedSurfacePreparationInternalV1,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      const record = preparationRecords.get(preparation);
      if (record === undefined) return staleResultInternalV1;
      return record.kind === "root"
        ? settleRootPreparation(record, "ready")
        : settleDetailPreparation(record, "ready");
    },
    settleReadinessFailedInternalV1(
      preparation: WholeCanvasManagedSurfacePreparationInternalV1,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      const record = preparationRecords.get(preparation);
      if (record === undefined) return staleResultInternalV1;
      return record.kind === "root"
        ? settleRootPreparation(record, "failed")
        : settleDetailPreparation(record, "failed");
    },
    cancelReadinessInternalV1(
      preparation: WholeCanvasManagedSurfacePreparationInternalV1,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      const record = preparationRecords.get(preparation);
      if (record === undefined) return staleResultInternalV1;
      return record.kind === "root"
        ? settleRootPreparation(record, "failed")
        : settleDetailPreparation(record, "failed");
    },
    dispatchActionInternalV1(
      inputAction: Readonly<{
        readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
        readonly actionId: string;
      }>,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      const captured = captureDataRecordInternalV1(inputAction, ["frame", "actionId"]);
      if (captured === null || terminal) return staleResultInternalV1;
      const frame = captured.values.get("frame");
      let actionId: string;
      try {
        actionId = String(parseManagedSurfaceActionIdV1(captured.values.get("actionId")));
      } catch {
        return rejectedResultInternalV1;
      }
      const currentEntry = detailCurrent?.frame === frame
        ? detailCurrent
        : detailPending === null && rootCurrent?.frame === frame
        ? rootCurrent
        : null;
      if (currentEntry === null) return staleResultInternalV1;
      if (actionId === "ui.cancel") {
        if (currentEntry.placement === "detail") {
          return closeDetail(currentEntry.frame, "routed_cancel");
        }
        return currentEntry.rootKind === "boot_splash"
          ? advanceCachedRoot("boot_splash")
          : unchangedResultInternalV1;
      }
      if (actionId === "ui.confirm") {
        let defaultActionId: string | null = null;
        if (currentEntry.placement === "detail") {
          defaultActionId = catalogByTargetId.get(currentEntry.target.targetId)
            ?.defaultActionId ?? null;
        } else if (rootCurrentRecord?.catalogRow !== null) {
          defaultActionId = rootCurrentRecord?.catalogRow.defaultActionId ?? null;
        } else if (currentEntry.rootKind === "boot_splash") {
          defaultActionId = "whole-canvas.dismiss-splash";
        } else if (currentEntry.rootKind === "title") {
          defaultActionId = currentEntry.resolved.actions.find((action) =>
            action.status === "enabled" && action.actionId === "whole-canvas.title.continue"
          )?.actionId ?? currentEntry.resolved.actions.find((action) =>
            action.status === "enabled" && action.actionId === "whole-canvas.title.new-game"
          )?.actionId ?? null;
        }
        return defaultActionId === null
          ? unchangedResultInternalV1
          : dispatchResolvedAction(currentEntry, defaultActionId);
      }
      return dispatchResolvedAction(currentEntry, actionId);
    },
    dismissInternalV1(
      inputDismiss: Readonly<{
        readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
        readonly kind: ManagedSurfaceDismissKindV1;
      }>,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      const captured = captureDataRecordInternalV1(inputDismiss, ["frame", "kind"]);
      if (captured === null || terminal) return staleResultInternalV1;
      const frame = captured.values.get("frame");
      const kind = captured.values.get("kind");
      if (
        kind !== "back" && kind !== "escape" && kind !== "backdrop" &&
        kind !== "routed_cancel"
      ) return rejectedResultInternalV1;
      const currentDetail = detailCurrent;
      if (currentDetail !== null && currentDetail.frame === frame) {
        return closeDetail(currentDetail.frame, kind);
      }
      const currentRoot = rootCurrent;
      if (detailPending !== null || currentRoot === null || currentRoot.frame !== frame) {
        return staleResultInternalV1;
      }
      if (currentRoot.rootKind === "boot_splash" && kind !== "backdrop") {
        return advanceCachedRoot("boot_splash");
      }
      return unchangedResultInternalV1;
    },
    isFrameCurrentInternalV1(
      frame: unknown,
    ): frame is WholeCanvasManagedSurfaceFrameInternalV1 {
      if (terminal) return false;
      if (detailCurrent !== null) return detailCurrent.frame === frame;
      if (detailPending !== null) return false;
      return rootCurrent?.frame === frame;
    },
    inspectBoundedStateInternalV1(): WholeCanvasManagedSurfaceBoundedStateInternalV1 {
      const liveFrames = new Set<WholeCanvasManagedSurfaceFrameInternalV1>();
      if (detailCurrent !== null) liveFrames.add(detailCurrent.frame);
      else if (detailPending === null && rootCurrent !== null) liveFrames.add(rootCurrent.frame);
      if (rootPending !== null) liveFrames.add(rootPending.renderEntry.frame);
      if (detailPending !== null) liveFrames.add(detailPending.renderEntry.frame);
      return Object.freeze({
        liveRootCount: rootCurrent === null ? 0 : 1,
        pendingRootCount: rootPending === null ? 0 : 1,
        liveDetailCount: detailCurrent === null ? 0 : 1,
        pendingDetailCount: detailPending === null ? 0 : 1,
        retainedFrameCount: liveFrames.size,
        retainedPreparationCount: activePreparations.size,
        retainedListenerCount: listeners.size,
      });
    },
    disposeInternalV1(): WholeCanvasManagedSurfaceResultInternalV1 {
      if (mutationIsFenced()) return staleResultInternalV1;
      if (terminal) return unchangedResultInternalV1;
      terminal = true;
      if (hostPort !== null) {
        try {
          Reflect.apply(hostPort.terminalize, hostPort.receiver, []);
        } catch {
          // The terminal fence precedes contained Host teardown.
        }
      }
      let disposed;
      try {
        disposed = runKernelTransitionPhase(() =>
          compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1(publisherLease)
        );
      } catch {
        disposed = null;
      }
      for (const record of activePreparations) record.active = false;
      activePreparations.clear();
      rootDesired = null;
      rootCurrentRecord = null;
      rootCurrent = null;
      rootPending = null;
      rootFailure = null;
      detailCurrentRecord = null;
      detailCurrent = null;
      detailPending = null;
      detailFailure = null;
      notify();
      listeners.clear();
      return disposed?.kind === "applied"
        ? appliedResultInternalV1
        : disposed?.kind === "unchanged"
        ? unchangedResultInternalV1
        : faultedResultInternalV1;
    },
  });
  return session;
}
