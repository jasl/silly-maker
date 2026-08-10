// SPDX-License-Identifier: MIT
import type {
  NarrativeStableHistoryChildLifecycleInternalV1,
  NarrativeStableHistoryChildPreparationInternalV1,
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
