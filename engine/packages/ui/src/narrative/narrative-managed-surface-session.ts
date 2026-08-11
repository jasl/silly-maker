// SPDX-License-Identifier: MIT
import type { InputRouterV1 } from "../input/contracts.ts";
import type {
  ManagedSurfaceFocusTargetIdV1,
  ManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  NarrativeStableDialogueRendererPropsInternalV1,
  NarrativeStableDialoguePlayerObservationInternalV1,
  NarrativeStableHistoryChildLifecycleInternalV1,
  NarrativeStableHistoryChildControllerInternalV1,
  NarrativeStableHistoryChildPreparationInternalV1,
  NarrativeStableHistoryRenderObservationInternalV1,
  NarrativeStableHistoryRendererPropsInternalV1,
  NarrativeStableRendererComponentInternalV1,
} from "./narrative-managed-surface-family.ts";

declare const narrativeStableRootPreparationBrandInternalV1: unique symbol;

export interface NarrativeStableRootPreparationInternalV1 {
  readonly [narrativeStableRootPreparationBrandInternalV1]: true;
}

export type NarrativeStableReadinessEntryInternalV1 =
  | Readonly<{
    readonly kind: "root";
    readonly preparation: NarrativeStableRootPreparationInternalV1;
  }>
  | Readonly<{
    readonly kind: "history";
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
  }>;

export interface NarrativeStableReadinessSnapshotInternalV1 {
  readonly entries: readonly NarrativeStableReadinessEntryInternalV1[];
}

export interface NarrativeStableHostLeaseInternalV1 {
  isCurrentInternalV1(): boolean;
  releaseInternalV1(): void;
}

export interface NarrativeStableSessionInternalV1 {
  getReadinessSnapshotInternalV1(): NarrativeStableReadinessSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  getHistoryChildLifecycleInternalV1(): NarrativeStableHistoryChildLifecycleInternalV1;
  attachHostInternalV1(
    input: Readonly<{ readonly hostIdentity: object }>,
  ): NarrativeStableHostLeaseInternalV1;
}

declare const narrativeStableHostRenderKeyBrandInternalV1: unique symbol;

export type NarrativeStableHostRenderKeyInternalV1 = string & {
  readonly [narrativeStableHostRenderKeyBrandInternalV1]: true;
};

export type NarrativeStableHostRenderPhaseInternalV1 =
  | "preparing"
  | "active"
  | "suspended";

export type NarrativeStableHostRenderEntryInternalV1 =
  | Readonly<{
    readonly kind: "dialogue";
    readonly phase: NarrativeStableHostRenderPhaseInternalV1;
    readonly renderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly preparation: NarrativeStableRootPreparationInternalV1 | null;
    readonly initialFocusTargetId: ManagedSurfaceFocusTargetIdV1;
    readonly rendererComponent: NarrativeStableRendererComponentInternalV1;
    readonly rendererProps: Omit<NarrativeStableDialogueRendererPropsInternalV1, "playerView">;
    readonly playerObservation: NarrativeStableDialoguePlayerObservationInternalV1;
  }>
  | Readonly<{
    readonly kind: "history";
    readonly phase: NarrativeStableHostRenderPhaseInternalV1;
    readonly renderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly parentRenderKey: NarrativeStableHostRenderKeyInternalV1;
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1 | null;
    readonly initialFocusTargetId: ManagedSurfaceFocusTargetIdV1;
    readonly rendererComponent: NarrativeStableRendererComponentInternalV1;
    readonly rendererProps: Omit<NarrativeStableHistoryRendererPropsInternalV1, "history">;
    readonly historyObservation: NarrativeStableHistoryRenderObservationInternalV1;
    readonly controller: NarrativeStableHistoryChildControllerInternalV1;
  }>;

export interface NarrativeStableHostRenderSnapshotInternalV1 {
  readonly entries: readonly NarrativeStableHostRenderEntryInternalV1[];
}

export interface NarrativeStableHostRenderSourceInternalV1 {
  getSnapshotInternalV1(): NarrativeStableHostRenderSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
}

declare const narrativeStableHostReadyCommitBrandInternalV1: unique symbol;

export interface NarrativeStableHostReadyCommitInternalV1 {
  readonly [narrativeStableHostReadyCommitBrandInternalV1]: true;
}

export type NarrativeStableReadinessSettlementResultInternalV1 =
  | Readonly<{ readonly kind: "settled"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;

export interface NarrativeStableHostAttachmentInternalV1 {
  settleRootReadinessReadyInternalV1(
    rootPreparation: NarrativeStableRootPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleRootReadinessFailedInternalV1(
    rootPreparation: NarrativeStableRootPreparationInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleHistoryReadinessReadyInternalV1(
    historyPreparation: NarrativeStableHistoryChildPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  settleHistoryReadinessFailedInternalV1(
    historyPreparation: NarrativeStableHistoryChildPreparationInternalV1,
  ): NarrativeStableReadinessSettlementResultInternalV1;
  releaseInternalV1(): void;
}

export interface CreateNarrativeStableHostRuntimeInputInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly hostIdentity: object;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

export interface NarrativeStableHostRuntimeInternalV1 {
  readonly attachment: NarrativeStableHostAttachmentInternalV1;
  readonly renderSource: NarrativeStableHostRenderSourceInternalV1;
}

export interface PrepareNarrativeStableHostReadyCommitInputInternalV1 {
  readonly hostRuntime: NarrativeStableHostRuntimeInternalV1;
  readonly renderEntry: NarrativeStableHostRenderEntryInternalV1;
  readonly portalShell: HTMLDivElement;
  readonly initialFocusTarget: HTMLElement;
}

export type NarrativeStableHostReadyCommitPreparationResultInternalV1 =
  | Readonly<{
    readonly kind: "prepared";
    readonly readyCommit: NarrativeStableHostReadyCommitInternalV1;
    readonly completion: null;
  }>
  | Readonly<{ readonly kind: "reattached"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;
