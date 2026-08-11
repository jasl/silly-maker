// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseNarrativeHistoryV1,
  type DeepReadonly,
  type NarrativeHistoryV1,
  parseInteractionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parseModuleId,
  parsePendingInteractionV1,
  parsePositiveSafeInteger,
  type InteractionResolutionV1,
  type PendingInteractionV1,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import type { ElementType } from "react";

import {
  inputHandledV1,
  inputIgnoredV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { registerManagedInputHandlerV1 } from "../input/input-router.ts";
import {
  claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1,
  claimManagedSurfaceAuthenticatedActionRouteInternalV1,
  createManagedSurfaceContractBoundActionBindingInternalV1,
  equalManagedSurfaceInputBindingContractV1,
  prepareManagedSurfaceContractBoundActionBindingInternalV1,
  type ManagedSurfaceActionBindingV1,
  type ManagedSurfaceAuthenticatedActionRouteResultInternalV1,
  type ManagedSurfaceAuthenticatedActionRouteInternalV1,
  type ManagedSurfacePreparedContractBoundActionBindingInternalV1,
  type ManagedSurfacePreparedInputBindingContractInternalV1,
} from "../managed-surfaces/managed-surface-action-route.ts";
import {
  type ManagedSurfaceActionEnvelopeV1,
  type ManagedSurfaceActionIdV1,
  type ManagedSurfaceDismissKindV1,
  type ManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  type ManagedSurfaceGestureIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "../managed-surfaces/managed-surface-definition.ts";
import {
  matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionResultInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  type ManagedSurfaceStableReadinessCommitGuardInternalV1,
  claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1,
  type ManagedSurfaceStableActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableDirectActionTargetProofInternalV1,
  type ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
  type ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1,
  type ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1,
  type ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  type ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableReadyActiveTargetProofInternalV1,
  type ManagedSurfaceStableRuntimeAttemptInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "../managed-surfaces/managed-surface-stable-contract.ts";
import type {
  ManagedSurfaceStablePublisherInternalV1,
  ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  claimStageAcknowledgedRunAuthorityInternalV1,
  type StageAcknowledgedRunAuthorityInternalV1,
  type StageAcknowledgedRunCommitGuardInternalV1,
  type StageAcknowledgedRunProofInternalV1,
  type StageAcknowledgedRunRetargetResultInternalV1,
  type StageAcknowledgedRunTerminalPortInternalV1,
  type StagePresentationGenerationProofInternalV1,
  type StagePresentationGenerationRetargetResultInternalV1,
  type StageReconcilerV1,
  type StageRetargetInputV1,
} from "../stage/stage-reconciler.ts";
import type {
  CreateNarrativeStableHostRuntimeInputInternalV1,
  NarrativeStableHostAttachmentInternalV1,
  NarrativeStableHostLeaseInternalV1,
  NarrativeStableHostReadyCommitInternalV1,
  NarrativeStableHostReadyCommitPreparationResultInternalV1,
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRenderKeyInternalV1,
  NarrativeStableHostRenderSnapshotInternalV1,
  NarrativeStableHostRenderSourceInternalV1,
  NarrativeStableHostRuntimeInternalV1,
  NarrativeStableReadinessSettlementResultInternalV1,
  NarrativeStableReadinessEntryInternalV1,
  NarrativeStableReadinessSnapshotInternalV1,
  PrepareNarrativeStableHostReadyCommitInputInternalV1,
  NarrativeStableRootPreparationInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";

const freezeNarrativePhysicalActionDataInternalV1 = Object.freeze;
const applyNarrativePhysicalActionInternalV1 = Reflect.apply;
const setNarrativeWeakMapValueInternalV1 = WeakMap.prototype.set;

const narrativeStableHostReadyCommitFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});
const narrativeStableHostReadyCommitStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});
const narrativeStableReadinessSettledResultInternalV1 = Object.freeze({
  kind: "settled" as const,
  completion: null,
});
const narrativeStableReadinessStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});
const narrativeStableReadinessFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});
const narrativeStableHistoryChildClosedResultInternalV1 = Object.freeze({
  kind: "closed" as const,
  completion: null,
});
const narrativeStableHistoryChildDismissedResultInternalV1 = Object.freeze({
  kind: "dismissed" as const,
  completion: null,
});
const narrativeStableHistoryChildLockedResultInternalV1 = Object.freeze({
  kind: "locked" as const,
  completion: null,
});
const narrativeStableHistoryChildLifecycleStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});
const narrativeStableHistoryChildLifecycleFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

export interface NarrativeManagedSurfaceFamilyContractInternalV1 {
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly definitions: Readonly<{
    readonly dialogue: ManagedSurfaceResolvedDefinitionV1;
    readonly history: ManagedSurfaceResolvedDefinitionV1;
  }>;
  readonly stableDefinitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}

export interface NarrativeStableAdmittedFrameInternalV1 {
  readonly semanticOccurrenceId: string;
  readonly rendererKey: string;
  readonly pending: PendingInteractionV1;
  readonly candidateSnapshot: NarrativeStableCandidateSnapshotInternalV1;
}

export interface NarrativeStableSemanticResolutionRequestInternalV1 {
  readonly expectedOccurrenceId: string;
  readonly resolution: InteractionResolutionV1;
}

export interface NarrativeStableSemanticResolutionPortInternalV1 {
  /**
   * The returned Promise settles only after the composition adapter has
   * drained the semantic publication and its synchronous Narrative bridge
   * reconcile for this dispatch.
   */
  readonly dispatchResolutionInternalV1: (
    request: NarrativeStableSemanticResolutionRequestInternalV1,
  ) => Promise<unknown>;
}

export interface NarrativeStableSayRevealGenerationPortInternalV1 {
  readonly capturePhaseInternalV1: () => "incomplete" | "complete";
  readonly revealAllInternalV1: () => void;
}

export interface NarrativeStableVoiceReplayPortInternalV1 {
  readonly replayCurrentVoiceInternalV1: () => boolean;
}

export interface NarrativeStableHistoryAvailabilityPortInternalV1 {
  readonly readHistoryAvailabilityInternalV1: () => boolean;
}

declare const narrativeStableCapturedSemanticResolutionPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedSemanticResolutionPortInternalV1 {
  readonly [narrativeStableCapturedSemanticResolutionPortBrandInternalV1]: true;
}

declare const narrativeStableCapturedVoiceReplayPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedVoiceReplayPortInternalV1 {
  readonly [narrativeStableCapturedVoiceReplayPortBrandInternalV1]: true;
}

declare const narrativeStableCapturedHistoryAvailabilityPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedHistoryAvailabilityPortInternalV1 {
  readonly [narrativeStableCapturedHistoryAvailabilityPortBrandInternalV1]: true;
}

export interface NarrativeStableHistoryObservationPortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

declare const narrativeStableCapturedHistoryObservationPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedHistoryObservationPortInternalV1 {
  readonly [narrativeStableCapturedHistoryObservationPortBrandInternalV1]: true;
}

export interface NarrativeStableHistoryRenderObservationInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface NarrativeStableDialogueRendererPropsInternalV1 {
  readonly kind: "dialogue";
  readonly pending: DeepReadonly<PendingInteractionV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: Readonly<object>;
  readonly textResolver: object | ((...args: never[]) => unknown);
  readonly quickMenuContribution: object | ((...args: never[]) => unknown) | null;
}

export interface NarrativeStableHistoryRendererPropsInternalV1 {
  readonly kind: "history";
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: Readonly<object>;
  readonly textResolver: object | ((...args: never[]) => unknown);
}

export type NarrativeStableRendererPropsInternalV1 =
  | NarrativeStableDialogueRendererPropsInternalV1
  | NarrativeStableHistoryRendererPropsInternalV1;

export type NarrativeStableRendererComponentInternalV1 = ElementType<
  NarrativeStableRendererPropsInternalV1
>;

export interface NarrativeStableCandidateSnapshotInternalV1 {
  readonly rendererComponent: NarrativeStableRendererComponentInternalV1;
  readonly visualConfig: Readonly<object>;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  readonly historyObservationPort: NarrativeStableCapturedHistoryObservationPortInternalV1;
  readonly historyAvailabilityPort: NarrativeStableCapturedHistoryAvailabilityPortInternalV1;
  readonly playerProfile: Readonly<object>;
  readonly presentationClock: object | ((...args: never[]) => unknown);
  readonly textResolver: object | ((...args: never[]) => unknown);
  readonly voiceReplayPort: NarrativeStableCapturedVoiceReplayPortInternalV1 | null;
  readonly quickMenuContribution: object | ((...args: never[]) => unknown) | null;
}

export type NarrativeStableRequiredPortIdInternalV1 =
  | "narrative.semantic_dispatch"
  | "narrative.history_observation"
  | "narrative.history_availability"
  | "narrative.player_profile"
  | "narrative.presentation_clock"
  | "narrative.text_resolver";

export type NarrativeStableCandidatePreflightRejectionCodeInternalV1 =
  | "narrative.renderer_missing"
  | "narrative.required_port_missing";

export type NarrativeStableCandidatePreflightResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly candidateSnapshot: unknown;
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.renderer_missing";
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.required_port_missing";
    readonly portId: NarrativeStableRequiredPortIdInternalV1;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "narrative.candidate_preflight_faulted";
  }>;

export interface NarrativeStableCandidatePreflightInternalV1 {
  preflightCandidateInternalV1(
    pending: PendingInteractionV1,
    rendererKey: string,
  ): NarrativeStableCandidatePreflightResultInternalV1;
}

type NarrativeStableCandidatePreflightZeroDeltaInternalV1 = Readonly<{
  readonly source: "unchanged";
  readonly runtime: "unchanged";
  readonly notificationCount: 0;
  readonly topology: "unchanged";
  readonly runtimeAllocation: "zero";
}>;

export type NarrativeStablePublisherBridgeResultInternalV1 =
  | ManagedSurfaceStableReconcileResultInternalV1
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.renderer_missing";
    readonly delta: NarrativeStableCandidatePreflightZeroDeltaInternalV1;
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.required_port_missing";
    readonly portId: NarrativeStableRequiredPortIdInternalV1;
    readonly delta: NarrativeStableCandidatePreflightZeroDeltaInternalV1;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "narrative.candidate_preflight_faulted";
    readonly delta: NarrativeStableCandidatePreflightZeroDeltaInternalV1;
  }>;

export interface NarrativeStablePublisherBridgeInternalV1 {
  readPlaybackModeInternalV1(): NarrativeStablePlaybackModeInternalV1;
  reconcilePendingInternalV1(
    pending: unknown,
  ): NarrativeStablePublisherBridgeResultInternalV1;
  retryCurrentPendingInternalV1(): NarrativeStablePublisherBridgeResultInternalV1;
  disposeInternalV1(): ManagedSurfaceStableReconcileResultInternalV1;
  inspectAdmittedTargetFrameInternalV1(
    target: unknown,
  ): NarrativeStableAdmittedFrameInternalV1 | null;
}

export interface CreateNarrativeStablePublisherBridgeInputInternalV1 {
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly candidatePreflight: NarrativeStableCandidatePreflightInternalV1;
  readonly exactAggregateDefinitionSidecars:
    readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly exactAggregateSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
}

declare const narrativeStableChoiceActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableChoiceActionAttemptInternalV1 {
  readonly [narrativeStableChoiceActionAttemptBrandInternalV1]: true;
}

declare const narrativeStablePauseResumeActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStablePauseResumeActionAttemptInternalV1 {
  readonly [narrativeStablePauseResumeActionAttemptBrandInternalV1]: true;
}

declare const narrativeStableCustomActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableCustomActionAttemptInternalV1 {
  readonly [narrativeStableCustomActionAttemptBrandInternalV1]: true;
}

declare const narrativeStableSayActivationAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableSayActivationAttemptInternalV1 {
  readonly [narrativeStableSayActivationAttemptBrandInternalV1]: true;
}

declare const narrativeStableSayContentAutoAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableSayContentAutoAttemptInternalV1 {
  readonly [narrativeStableSayContentAutoAttemptBrandInternalV1]: true;
}

declare const narrativeStableVoiceReplayActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableVoiceReplayActionAttemptInternalV1 {
  readonly [narrativeStableVoiceReplayActionAttemptBrandInternalV1]: true;
}

export type NarrativeStablePlaybackModeInternalV1 = "normal" | "auto" | "skip";

declare const narrativeStablePlaybackModeToggleActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStablePlaybackModeToggleActionAttemptInternalV1 {
  readonly [narrativeStablePlaybackModeToggleActionAttemptBrandInternalV1]: true;
}

declare const narrativeStableHistoryOpenActionAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableHistoryOpenActionAttemptInternalV1 {
  readonly [narrativeStableHistoryOpenActionAttemptBrandInternalV1]: true;
}

declare const narrativeStableHistoryOpenIntentBrandInternalV1: unique symbol;

export interface NarrativeStableHistoryOpenIntentInternalV1 {
  readonly [narrativeStableHistoryOpenIntentBrandInternalV1]: true;
}

export type NarrativeStableHistoryOpenDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "requested";
    readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "ignored";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

declare const narrativeStableHistoryChildPreparationBrandInternalV1: unique symbol;

export interface NarrativeStableHistoryChildPreparationInternalV1 {
  readonly [narrativeStableHistoryChildPreparationBrandInternalV1]: true;
}

export type NarrativeStableHistoryChildPreparationResultInternalV1 =
  | Readonly<{
    readonly kind: "preparing";
    readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export type NarrativeStableHistoryChildLifecycleResultInternalV1 =
  | Readonly<{ readonly kind: "closed"; readonly completion: null }>
  | Readonly<{ readonly kind: "dismissed"; readonly completion: null }>
  | Readonly<{ readonly kind: "locked"; readonly completion: null }>
  | Readonly<{ readonly kind: "stale"; readonly completion: null }>
  | Readonly<{ readonly kind: "faulted"; readonly completion: null }>;

export interface NarrativeStableHistoryChildControllerInternalV1 {
  closeInternalV1(): NarrativeStableHistoryChildLifecycleResultInternalV1;
  dismissInternalV1(
    dismissKind: ManagedSurfaceDismissKindV1,
  ): NarrativeStableHistoryChildLifecycleResultInternalV1;
}

export interface NarrativeStableHistoryChildLifecycleInternalV1 {
  redeemHistoryOpenIntentInternalV1(
    intent: unknown,
  ): NarrativeStableHistoryChildPreparationResultInternalV1;
}

export type NarrativeStablePlaybackModeToggleDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "toggled";
    readonly mode: NarrativeStablePlaybackModeInternalV1;
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "ignored";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export type NarrativeStableVoiceReplayDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "handled";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "ignored";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export type NarrativeStableSayContentAutoDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "not_ready";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export interface CreateNarrativeStableSayRevealControllerInputInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly revealGenerationPort: NarrativeStableSayRevealGenerationPortInternalV1;
}

export interface NarrativeStableSayRevealControllerInternalV1 {
  issueContentAutoAttemptInternalV1(): NarrativeStableSayContentAutoAttemptInternalV1 | null;
  dispatchContentAutoInternalV1(
    attempt: unknown,
  ): NarrativeStableSayContentAutoDispatchResultInternalV1;
  disposeInternalV1(): void;
}

export type NarrativeStableBarrierStageRetargetResultInternalV1 =
  | Readonly<{
    readonly kind: "armed";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code:
      | "stage.acknowledged_run_unmatched"
      | "stage.acknowledged_run_ambiguous"
      | "stage.acknowledged_run_faulted";
    readonly completion: null;
  }>;

export type NarrativeStableBarrierTerminalDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "retained";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "cancelled";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

declare const narrativeStableBarrierRecoveryGenerationBrandInternalV1: unique symbol;

export interface NarrativeStableBarrierRecoveryGenerationInternalV1 {
  readonly [narrativeStableBarrierRecoveryGenerationBrandInternalV1]: true;
}

export type NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1 =
  | Readonly<{
    readonly kind: "installed";
    readonly generation: NarrativeStableBarrierRecoveryGenerationInternalV1;
  }>
  | Readonly<{
    readonly kind: "unchanged";
    readonly generation: NarrativeStableBarrierRecoveryGenerationInternalV1;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly generation: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly generation: null;
  }>;

declare const narrativeStableBarrierRecoveryAttemptBrandInternalV1: unique symbol;

export interface NarrativeStableBarrierRecoveryAttemptInternalV1 {
  readonly [narrativeStableBarrierRecoveryAttemptBrandInternalV1]: true;
}

export type NarrativeStableBarrierRecoveryDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export type NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1 = Readonly<{
  readonly kind: "unsupported";
  readonly code: "narrative.barrier_replay_unsupported";
  readonly completion: null;
}>;

export interface CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stageReconciler: StageReconcilerV1;
}

export interface NarrativeStableBarrierAcknowledgmentControllerInternalV1 {
  retargetCurrentBarrierStageInternalV1(
    retarget: StageRetargetInputV1,
  ): NarrativeStableBarrierStageRetargetResultInternalV1;
  retargetPresentationStageInternalV1(
    retarget: StageRetargetInputV1,
  ): StagePresentationGenerationRetargetResultInternalV1;
  synchronizeRecoveryGenerationInternalV1(
    activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
  ): NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1;
  issueSettleRecoveryAttemptInternalV1(): NarrativeStableBarrierRecoveryAttemptInternalV1 | null;
  dispatchSettleRecoveryInternalV1(
    attempt: unknown,
  ): NarrativeStableBarrierRecoveryDispatchResultInternalV1;
  readReplayRecoveryUnsupportedInternalV1():
    | NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1
    | null;
  flushRetainedTerminalInternalV1():
    | NarrativeStableBarrierTerminalDispatchResultInternalV1
    | null;
  disposeInternalV1(): void;
}

declare const narrativeStablePauseExpiryControllerAttemptBrandInternalV1: unique symbol;

export interface NarrativeStablePauseExpiryControllerAttemptInternalV1 {
  readonly [narrativeStablePauseExpiryControllerAttemptBrandInternalV1]: true;
}

export type NarrativeStablePauseExpiryDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

export interface NarrativeStablePauseExpiryControllerInternalV1 {
  issueAttemptInternalV1(): NarrativeStablePauseExpiryControllerAttemptInternalV1 | null;
  dispatchInternalV1(
    attempt: unknown,
  ): NarrativeStablePauseExpiryDispatchResultInternalV1;
  disposeInternalV1(): void;
}

export type NarrativeStablePhysicalActionDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "revealed";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "unmapped";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>
  | NarrativeStableVoiceReplayDispatchResultInternalV1
  | NarrativeStablePlaybackModeToggleDispatchResultInternalV1
  | NarrativeStableHistoryOpenDispatchResultInternalV1
  | NarrativeStableHistoryChildLifecycleResultInternalV1;

export interface CreateNarrativeStablePhysicalActionAdmissionInputInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

export interface NarrativeStablePhysicalActionAdmissionInternalV1 {
  createEnvelopeInternalV1(input: {
    readonly actionId: ManagedSurfaceActionIdV1;
    readonly gestureId: ManagedSurfaceGestureIdV1;
  }): ManagedSurfaceActionEnvelopeV1;
  issueChoiceAttemptInternalV1(
    choiceId: unknown,
  ): NarrativeStableChoiceActionAttemptInternalV1 | null;
  issuePauseResumeAttemptInternalV1(): NarrativeStablePauseResumeActionAttemptInternalV1 | null;
  issueCustomAttemptInternalV1(
    payload: unknown,
  ): NarrativeStableCustomActionAttemptInternalV1 | null;
  issueSayActivationAttemptInternalV1(
    controller: unknown,
  ): NarrativeStableSayActivationAttemptInternalV1 | null;
  issueVoiceReplayAttemptInternalV1(): NarrativeStableVoiceReplayActionAttemptInternalV1 | null;
  issuePlaybackModeToggleAttemptInternalV1(
    requestedMode: "auto" | "skip",
  ): NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null;
  issueHistoryOpenAttemptInternalV1(): NarrativeStableHistoryOpenActionAttemptInternalV1 | null;
  routeInternalV1(
    envelope: ManagedSurfaceActionEnvelopeV1,
    attempt: unknown,
  ): ManagedSurfaceAuthenticatedActionRouteResultInternalV1<
    NarrativeStablePhysicalActionDispatchResultInternalV1
  >;
  disposeInternalV1(): void;
}

interface NarrativeStableParametersInternalV1 {
  readonly semanticOccurrenceId: string;
  readonly kind: PendingInteractionV1["kind"];
  readonly definitionId: string;
  readonly seenRevision: number;
  readonly rendererKey: string;
}

interface NarrativeTargetFrameRecordInternalV1 {
  readonly bridgeIdentity: object;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly canonicalPendingBytes: Uint8Array;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}

interface NarrativeStableCurrentTargetProjectionInternalV1 {
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly canonicalPendingBytes: Uint8Array;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}

interface NarrativeStablePlaybackModeStateInternalV1 {
  readonly mode: NarrativeStablePlaybackModeInternalV1;
}

interface NarrativeStablePublisherBridgeRecordInternalV1 {
  readonly bridgeIdentity: object;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly isActiveInternalV1: () => boolean;
  readonly subscribeStateInternalV1: ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
    "subscribeStateInternalV1"
  ];
  readonly captureCurrentTargetInternalV1: () =>
    | NarrativeStableCurrentTargetProjectionInternalV1
    | null;
  active: boolean;
  historyChildLifecycle: NarrativeStableHistoryChildLifecycleInternalV1 | null;
  currentHistoryPreparation: NarrativeStableHistoryChildPreparationInternalV1 | null;
  currentHistoryCandidateRecord: NarrativeStableHistoryChildPreparationRecordInternalV1 | null;
  currentHostRootActionBinding: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null;
  hostPhysicalActionAdmission: NarrativeStablePhysicalActionAdmissionInternalV1 | null;
  session: NarrativeStableSessionInternalV1 | null;
  currentModeState: NarrativeStablePlaybackModeStateInternalV1;
  physicalActionAdmissionClaim: object | null;
  pauseExpiryControllerClaim: object | null;
  sayRevealControllerClaim: object | null;
  sayCallbackClaim: object | null;
  saySemanticInFlightClaim: object | null;
  readonly barrierStageClaimant: object;
  barrierAcknowledgmentControllerClaim: object | null;
  barrierTargetTerminalClaim: object | null;
  barrierCallbackClaim: object | null;
  barrierSemanticInFlightClaim: object | null;
  barrierRecoverySynchronizationClaim: object | null;
  barrierRecoverySynchronizationPoisoned: boolean;
  barrierRecoveryGeneration: NarrativeStableBarrierRecoveryGenerationRecordInternalV1 | null;
}

function compareAndSetNarrativePlaybackModeStateInternalV1(
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1,
  expectedState: NarrativeStablePlaybackModeStateInternalV1,
  successorState: NarrativeStablePlaybackModeStateInternalV1,
): boolean {
  if (bridgeRecord.currentModeState !== expectedState) return false;
  bridgeRecord.currentModeState = successorState;
  return true;
}

const narrativeTargetFrameRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableAdmittedTargetInternalV1,
  NarrativeTargetFrameRecordInternalV1
>();
const narrativeStablePublisherBridgeRecordsInternalV1 = new WeakMap<
  NarrativeStablePublisherBridgeInternalV1,
  NarrativeStablePublisherBridgeRecordInternalV1
>();

interface NarrativeStableSemanticResolutionPortBindingInternalV1 {
  readonly receiver: NarrativeStableSemanticResolutionPortInternalV1;
  readonly dispatchResolution: NarrativeStableSemanticResolutionPortInternalV1[
    "dispatchResolutionInternalV1"
  ];
}

interface NarrativeStableVoiceReplayPortBindingInternalV1 {
  readonly receiver: NarrativeStableVoiceReplayPortInternalV1;
  readonly replayCurrentVoice: NarrativeStableVoiceReplayPortInternalV1[
    "replayCurrentVoiceInternalV1"
  ];
}

interface NarrativeStableHistoryAvailabilityPortBindingInternalV1 {
  readonly receiver: NarrativeStableHistoryAvailabilityPortInternalV1;
  readonly readHistoryAvailability: NarrativeStableHistoryAvailabilityPortInternalV1[
    "readHistoryAvailabilityInternalV1"
  ];
}

interface NarrativeStableHistoryObservationPortBindingInternalV1 {
  readonly receiver: NarrativeStableHistoryObservationPortInternalV1;
  readonly getSnapshot: NarrativeStableHistoryObservationPortInternalV1[
    "getSnapshotInternalV1"
  ];
  readonly subscribe: NarrativeStableHistoryObservationPortInternalV1[
    "subscribeInternalV1"
  ];
}

interface NarrativeStablePhysicalActionAttemptRecordBaseInternalV1 {
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  spent: boolean;
}

type NarrativeStablePhysicalActionAttemptRecordInternalV1 =
  | (
    & NarrativeStablePhysicalActionAttemptRecordBaseInternalV1
    & Readonly<{
      readonly kind: "choice";
      readonly choiceId: string;
    }>
  )
  | (
    & NarrativeStablePhysicalActionAttemptRecordBaseInternalV1
    & Readonly<{
      readonly kind: "pause_resume";
    }>
  )
  | (
    & NarrativeStablePhysicalActionAttemptRecordBaseInternalV1
    & Readonly<{
      readonly kind: "custom";
      readonly payload: Extract<InteractionResolutionV1, { readonly kind: "custom" }>["payload"];
    }>
  )
  | (
    & NarrativeStablePhysicalActionAttemptRecordBaseInternalV1
    & Readonly<{
      readonly kind: "say_activation";
      readonly controller: NarrativeStableSayRevealControllerInternalV1;
      readonly controllerClaim: object;
    }>
  );

const narrativeStableSemanticResolutionPortBindingsInternalV1 = new WeakMap<
  NarrativeStableCapturedSemanticResolutionPortInternalV1,
  NarrativeStableSemanticResolutionPortBindingInternalV1
>();
const narrativeStableVoiceReplayPortBindingsInternalV1 = new WeakMap<
  NarrativeStableCapturedVoiceReplayPortInternalV1,
  NarrativeStableVoiceReplayPortBindingInternalV1
>();
const narrativeStableHistoryAvailabilityPortBindingsInternalV1 = new WeakMap<
  NarrativeStableCapturedHistoryAvailabilityPortInternalV1,
  NarrativeStableHistoryAvailabilityPortBindingInternalV1
>();
const narrativeStableHistoryObservationPortBindingsInternalV1 = new WeakMap<
  NarrativeStableCapturedHistoryObservationPortInternalV1,
  NarrativeStableHistoryObservationPortBindingInternalV1
>();
const narrativeStablePhysicalActionAttemptRecordsInternalV1 = new WeakMap<
  | NarrativeStableChoiceActionAttemptInternalV1
  | NarrativeStablePauseResumeActionAttemptInternalV1
  | NarrativeStableCustomActionAttemptInternalV1
  | NarrativeStableSayActivationAttemptInternalV1,
  NarrativeStablePhysicalActionAttemptRecordInternalV1
>();

interface NarrativeStableVoiceReplayActionAttemptRecordInternalV1 {
  readonly kind: "voice_replay";
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly voiceReplayPort: NarrativeStableCapturedVoiceReplayPortInternalV1 | null;
  spent: boolean;
}

const narrativeStableVoiceReplayActionAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStableVoiceReplayActionAttemptInternalV1,
  NarrativeStableVoiceReplayActionAttemptRecordInternalV1
>();

interface NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1 {
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly requestedMode: "auto" | "skip";
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly issuanceModeState: NarrativeStablePlaybackModeStateInternalV1;
  spent: boolean;
}

const narrativeStablePlaybackModeToggleActionAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
  NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1
>();

interface NarrativeStableHistoryOpenActionAttemptRecordInternalV1 {
  readonly kind: "history_open";
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directParent: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly historyAvailabilityPort: NarrativeStableCapturedHistoryAvailabilityPortInternalV1;
  spent: boolean;
}

const narrativeStableHistoryOpenActionAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryOpenActionAttemptInternalV1,
  NarrativeStableHistoryOpenActionAttemptRecordInternalV1
>();

interface NarrativeStableHistoryOpenIntentRecordInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directParent: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  spent: boolean;
}

const narrativeStableHistoryOpenIntentRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryOpenIntentInternalV1,
  NarrativeStableHistoryOpenIntentRecordInternalV1
>();

interface NarrativeStableHistoryChildFamilyClaimRecordInternalV1 {
  readonly claimant: object;
  readonly authority: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1;
  readonly readinessAuthority:
    ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1;
  readonly actionAuthority:
    ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1;
  readonly lifecycleAuthority:
    ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1;
}

interface NarrativeStableHistoryChildLifecycleRecordInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly childAuthority: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1;
}

interface NarrativeStableHistoryChildPreparationRecordInternalV1 {
  readonly lifecycle: NarrativeStableHistoryChildLifecycleInternalV1;
  readonly lifecycleRecord: NarrativeStableHistoryChildLifecycleRecordInternalV1;
  readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
  readonly intentRecord: NarrativeStableHistoryOpenIntentRecordInternalV1;
  readonly controller: NarrativeStableHistoryChildControllerInternalV1;
  candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1 | null;
}

interface NarrativeStableHistoryChildControllerRecordInternalV1 {
  preparationRecord: NarrativeStableHistoryChildPreparationRecordInternalV1 | null;
}

const narrativeStableHistoryChildFamilyClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  NarrativeStableHistoryChildFamilyClaimRecordInternalV1
>();
const narrativeStableHistoryChildLifecycleRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryChildLifecycleInternalV1,
  NarrativeStableHistoryChildLifecycleRecordInternalV1
>();
const narrativeStableHistoryChildPreparationRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryChildPreparationInternalV1,
  NarrativeStableHistoryChildPreparationRecordInternalV1
>();
const narrativeStableHistoryChildControllerRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryChildControllerInternalV1,
  NarrativeStableHistoryChildControllerRecordInternalV1
>();
const recordNarrativeStableHistoryChildPreparationInternalV1 =
  narrativeStableHistoryChildPreparationRecordsInternalV1.set.bind(
    narrativeStableHistoryChildPreparationRecordsInternalV1,
  );

interface NarrativeStableRootPreparationRecordInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1;
  readonly attempt: ManagedSurfaceStableRuntimeAttemptInternalV1;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}

interface NarrativeStableHostLeaseRecordInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly sessionRecord: NarrativeStableSessionRecordInternalV1;
  readonly hostIdentity: object;
  readonly lease: NarrativeStableHostLeaseInternalV1;
  active: boolean;
}

interface NarrativeStableHostRenderEntryRecordInternalV1 {
  readonly sessionRecord: NarrativeStableSessionRecordInternalV1;
  readonly attempt: object;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly actionBindingGeneration: object | null;
}

interface NarrativeStableHostCandidateActionBindingRecordInternalV1 {
  readonly kind: "root" | "history";
  sessionRecord: NarrativeStableSessionRecordInternalV1 | null;
  provenance: object | null;
  authority:
    | ManagedSurfaceStableActionRouteAuthorityInternalV1
    | ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1
    | null;
  readonly admissionClaim: object;
  readonly bindingGeneration: object;
  inputRouter: InputRouterV1 | null;
  isGestureCurrent: ((gestureId: ManagedSurfaceGestureIdV1) => boolean) | null;
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1 | null;
  prepared: ManagedSurfacePreparedContractBoundActionBindingInternalV1 | null;
  claimedRoute:
    | ManagedSurfaceAuthenticatedActionRouteInternalV1<
      unknown,
      NarrativeStablePhysicalActionDispatchResultInternalV1
    >
    | null;
  binding: ManagedSurfaceActionBindingV1 | null;
  focusTargetId: ManagedSurfaceFocusTargetIdV1 | null;
  focusAttachment: NarrativeStableHostFocusAttachmentRecordInternalV1 | null;
  delegate:
    | ((
      input: Readonly<{ readonly actionId: ManagedSurfaceActionIdV1; readonly attempt: unknown }>,
    ) => NarrativeStablePhysicalActionDispatchResultInternalV1)
    | null;
  active: boolean;
  committed: boolean;
}

interface NarrativeStableHostFocusAttachmentRecordInternalV1 {
  readonly runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1;
  readonly portalShell: HTMLDivElement;
  readonly initialFocusTarget: HTMLElement;
  readonly generation: object;
}

interface NarrativeStableHistoryRenderObservationRecordInternalV1 {
  binding: NarrativeStableHistoryObservationPortBindingInternalV1 | null;
  readonly listeners: Set<() => void>;
  readonly listenerHolders: Set<{ listener: (() => void) | null }>;
  currentSnapshot: DeepReadonly<NarrativeHistoryV1> | null;
  currentBytes: Uint8Array | null;
  unsubscribeRaw: (() => void) | null;
  active: boolean;
}

interface NarrativeStableHostRuntimeRecordInternalV1 {
  readonly sessionRecord: NarrativeStableSessionRecordInternalV1;
  readonly hostIdentity: object;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
  readonly lease: NarrativeStableHostLeaseInternalV1;
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
  readonly attachment: NarrativeStableHostAttachmentInternalV1;
  readonly readyCommits: Set<NarrativeStableHostReadyCommitRecordInternalV1>;
  readonly focusGeneration: object;
  readonly attachmentHolder: NarrativeStableHostAttachmentHolderInternalV1;
  fallbackInputUnregister: (() => void) | null;
  fallbackInputEntry: NarrativeStableHostRenderEntryInternalV1 | null;
  active: boolean;
}

interface NarrativeStableHostAttachmentDispatchInternalV1 {
  readonly settleRootReady: (
    preparation: NarrativeStableRootPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ) => NarrativeStableReadinessSettlementResultInternalV1;
  readonly settleRootFailed: (
    preparation: NarrativeStableRootPreparationInternalV1,
  ) => NarrativeStableReadinessSettlementResultInternalV1;
  readonly settleHistoryReady: (
    preparation: NarrativeStableHistoryChildPreparationInternalV1,
    readyCommit: NarrativeStableHostReadyCommitInternalV1,
  ) => NarrativeStableReadinessSettlementResultInternalV1;
  readonly settleHistoryFailed: (
    preparation: NarrativeStableHistoryChildPreparationInternalV1,
  ) => NarrativeStableReadinessSettlementResultInternalV1;
  readonly release: () => void;
}

interface NarrativeStableHostAttachmentHolderInternalV1 {
  dispatch: NarrativeStableHostAttachmentDispatchInternalV1 | null;
}

interface NarrativeStableHostRenderSourceRecordInternalV1 {
  session: NarrativeStableSessionInternalV1 | null;
  sessionRecord: NarrativeStableSessionRecordInternalV1 | null;
  terminalSnapshot: NarrativeStableHostRenderSnapshotInternalV1;
  readonly listenerHolders: Set<{ listener: (() => void) | null }>;
}

interface NarrativeStableHostReadyCommitRecordInternalV1 {
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1 | null;
  renderEntry: NarrativeStableHostRenderEntryInternalV1 | null;
  actionBindingRecord: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null;
  expectedFocusOwnership: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null;
  focusTargetId: ManagedSurfaceFocusTargetIdV1 | null;
  focusAttachment: NarrativeStableHostFocusAttachmentRecordInternalV1 | null;
  portalShell: HTMLDivElement | null;
  initialFocusTarget: HTMLElement | null;
  spent: boolean;
}

interface NarrativeStableSessionRecordInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1;
  readonly historyChildLifecycle: NarrativeStableHistoryChildLifecycleInternalV1;
  readonly listeners: Set<() => void>;
  readonly renderListeners: Set<() => void>;
  actionBindingRecords: NarrativeStableHostCandidateActionBindingRecordInternalV1[];
  currentHostFocusOwnership: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null;
  currentRootAttempt: ManagedSurfaceStableRuntimeAttemptInternalV1 | null;
  currentRootPreparation: NarrativeStableRootPreparationInternalV1 | null;
  currentRootEntry:
    | Extract<NarrativeStableReadinessEntryInternalV1, { readonly kind: "root" }>
    | null;
  currentHistoryEntry:
    | Extract<NarrativeStableReadinessEntryInternalV1, { readonly kind: "history" }>
    | null;
  currentSnapshot: NarrativeStableReadinessSnapshotInternalV1;
  lastNotifiedSnapshot: NarrativeStableReadinessSnapshotInternalV1;
  currentRenderSnapshot: NarrativeStableHostRenderSnapshotInternalV1;
  renderSource: NarrativeStableHostRenderSourceInternalV1 | null;
  renderKeyHighWater: number;
  currentHostLease: NarrativeStableHostLeaseRecordInternalV1 | null;
  currentHostRuntime: NarrativeStableHostRuntimeRecordInternalV1 | null;
  hostCleanupScheduled: boolean;
  hostTerminalCleanupScheduled: boolean;
  unsubscribeStateInternalV1: () => void;
  subscribed: boolean;
  terminal: boolean;
}

const narrativeStableRootPreparationRecordsInternalV1 = new WeakMap<
  NarrativeStableRootPreparationInternalV1,
  NarrativeStableRootPreparationRecordInternalV1
>();
const narrativeStableSessionRecordsInternalV1 = new WeakMap<
  NarrativeStableSessionInternalV1,
  NarrativeStableSessionRecordInternalV1
>();
const narrativeStableHostLeaseRecordsInternalV1 = new WeakMap<
  NarrativeStableHostLeaseInternalV1,
  NarrativeStableHostLeaseRecordInternalV1
>();
const narrativeStableHostRenderEntryRecordsInternalV1 = new WeakMap<
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRenderEntryRecordInternalV1
>();
const narrativeStableHostRuntimeRecordsInternalV1 = new WeakMap<
  NarrativeStableHostRuntimeInternalV1,
  NarrativeStableHostRuntimeRecordInternalV1
>();
const retiredNarrativeStableHostRuntimesInternalV1 = new WeakSet<
  NarrativeStableHostRuntimeInternalV1
>();
const narrativeStableHostAttachmentRecordsInternalV1 = new WeakMap<
  NarrativeStableHostAttachmentInternalV1,
  NarrativeStableHostRuntimeRecordInternalV1
>();
const narrativeStableHostReadyCommitRecordsInternalV1 = new WeakMap<
  NarrativeStableHostReadyCommitInternalV1,
  NarrativeStableHostReadyCommitRecordInternalV1
>();
const narrativeStableHostRenderSourceRecordsInternalV1 = new WeakMap<
  NarrativeStableHostRenderSourceInternalV1,
  NarrativeStableHostRenderSourceRecordInternalV1
>();
const narrativeStableHistoryRenderObservationRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryRenderObservationInternalV1,
  NarrativeStableHistoryRenderObservationRecordInternalV1
>();

function retireNarrativeStableHostReadyCommitRecordInternalV1(
  record: NarrativeStableHostReadyCommitRecordInternalV1,
): void {
  if (record.spent && record.runtimeRecord === null) return;
  const runtimeRecord = record.runtimeRecord;
  record.spent = true;
  record.runtimeRecord = null;
  record.renderEntry = null;
  record.actionBindingRecord = null;
  record.expectedFocusOwnership = null;
  record.focusTargetId = null;
  record.focusAttachment = null;
  record.portalShell = null;
  record.initialFocusTarget = null;
  runtimeRecord?.readyCommits.delete(record);
}

function retireNarrativeStableHostRuntimeExposureInternalV1(
  record: NarrativeStableHostRuntimeRecordInternalV1,
): void {
  record.active = false;
  const unregisterFallbackInput = record.fallbackInputUnregister;
  record.fallbackInputUnregister = null;
  record.fallbackInputEntry = null;
  try {
    unregisterFallbackInput?.();
  } catch {
    // The retired generation stays logically fenced when cleanup is hostile.
  }
  for (const readyRecord of [...record.readyCommits]) {
    retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
  }
  record.attachmentHolder.dispatch = null;
  retiredNarrativeStableHostRuntimesInternalV1.add(record.runtime);
  narrativeStableHostRuntimeRecordsInternalV1.delete(record.runtime);
  narrativeStableHostAttachmentRecordsInternalV1.delete(record.attachment);
}

function handleNarrativeStableHostFallbackInputInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
  event: DeepReadonly<InputEventV1>,
): InputHandlerResultV1 {
  const sessionRecord = runtimeRecord.sessionRecord;
  if (
    !runtimeRecord.active || sessionRecord.terminal ||
    sessionRecord.currentHostRuntime !== runtimeRecord
  ) return inputIgnoredV1;
  const fallback = runtimeRecord.fallbackInputEntry;
  if (
    fallback === null || !sessionRecord.currentRenderSnapshot.entries.includes(fallback) ||
    fallback.phase !== "preparing" || event.kind === "pointer_cancel" ||
    event.kind === "focus_loss"
  ) {
    return inputIgnoredV1;
  }
  if (fallback.kind === "history" && event.kind === "action") {
    if (event.actionId === playerInputActionIdsV1.toggleHistory) {
      fallback.controller.closeInternalV1();
    } else if (event.actionId === systemInputActionIdsV1.cancel) {
      fallback.controller.dismissInternalV1("routed_cancel");
    }
  }
  return inputHandledV1;
}

function reconcileNarrativeStableHostFallbackInputInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
): void {
  if (!runtimeRecord.active) return;
  const entries = runtimeRecord.sessionRecord.currentRenderSnapshot.entries;
  const history = entries.find((entry) => entry.kind === "history" && entry.phase === "preparing");
  const hasCommittedRoot = entries.some((entry) =>
    entry.kind === "dialogue" && (entry.phase === "active" || entry.phase === "suspended")
  );
  const initialRoot = hasCommittedRoot
    ? undefined
    : entries.find((entry) => entry.kind === "dialogue" && entry.phase === "preparing");
  const fallback = history ?? initialRoot ?? null;
  if (
    runtimeRecord.fallbackInputEntry === fallback &&
    (fallback === null
      ? runtimeRecord.fallbackInputUnregister === null
      : runtimeRecord.fallbackInputUnregister !== null)
  ) return;
  const unregister = runtimeRecord.fallbackInputUnregister;
  runtimeRecord.fallbackInputEntry = null;
  runtimeRecord.fallbackInputUnregister = null;
  try {
    unregister?.();
  } catch {
    // Logical fencing precedes physical cleanup.
  }
  if (fallback === null || !runtimeRecord.active) return;
  runtimeRecord.fallbackInputEntry = fallback;
  try {
    runtimeRecord.fallbackInputUnregister = registerManagedInputHandlerV1(
      runtimeRecord.inputRouter,
      freezeNarrativePhysicalActionDataInternalV1({
        context: "narrative" as const,
        handle: (event: DeepReadonly<InputEventV1>) =>
          handleNarrativeStableHostFallbackInputInternalV1(runtimeRecord, event),
      }),
    );
  } catch (error) {
    runtimeRecord.fallbackInputEntry = null;
    throw error;
  }
}

interface NarrativeStableSayContentAutoAttemptRecordInternalV1 {
  readonly controller: NarrativeStableSayRevealControllerInternalV1;
  readonly controllerClaim: object;
  readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  spent: boolean;
}

const narrativeStableSayContentAutoAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStableSayContentAutoAttemptInternalV1,
  NarrativeStableSayContentAutoAttemptRecordInternalV1
>();

type NarrativeStableSayAdvanceDispatchResultInternalV1 =
  | Readonly<{
    readonly kind: "dispatched";
    readonly completion: Promise<unknown>;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly completion: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly completion: null;
  }>;

interface NarrativeStableSayRevealControllerRecordInternalV1 {
  readonly bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1;
  readonly controllerClaim: object;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  readonly receiver: NarrativeStableSayRevealGenerationPortInternalV1;
  readonly capturePhase: NarrativeStableSayRevealGenerationPortInternalV1[
    "capturePhaseInternalV1"
  ];
  readonly revealAll: NarrativeStableSayRevealGenerationPortInternalV1[
    "revealAllInternalV1"
  ];
  readonly isCurrentInternalV1: () => boolean;
  readonly revokeInternalV1: (retireSemanticBoundary?: boolean) => void;
  readonly releaseLifecycleObserverInternalV1: () => void;
  readonly dispatchAdvanceInternalV1: (
    boundaryClaim: object,
    captureExactCurrentFrame: () => NarrativeStableAdmittedFrameInternalV1 | null,
  ) => NarrativeStableSayAdvanceDispatchResultInternalV1;
  active: boolean;
  callbackClaim: object | null;
  currentActivationAttempt: NarrativeStableSayActivationAttemptInternalV1 | null;
  currentContentAutoAttempt: NarrativeStableSayContentAutoAttemptInternalV1 | null;
}

const narrativeStableSayRevealControllerRecordsInternalV1 = new WeakMap<
  NarrativeStableSayRevealControllerInternalV1,
  NarrativeStableSayRevealControllerRecordInternalV1
>();

interface NarrativeStableBarrierTargetIdentityInternalV1 {
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly semanticOccurrenceId: string;
  readonly canonicalPendingBytes: Uint8Array;
  readonly expectedTransitionId: string;
}

interface NarrativeStableBarrierRecoveryTargetIdentityInternalV1 {
  readonly targetIdentity: NarrativeStableBarrierTargetIdentityInternalV1;
  readonly loadRecovery: "settle" | "replay";
}

interface NarrativeStableBarrierActivationGateBindingInternalV1 {
  readonly receiver: ManagedSurfaceFamilyActivationGateInternalV1;
  readonly isOpen: ManagedSurfaceFamilyActivationGateInternalV1["isOpen"];
}

interface NarrativeStableBarrierRecoveryGenerationRecordInternalV1 {
  readonly generation: NarrativeStableBarrierRecoveryGenerationInternalV1;
  readonly stageAuthority: StageAcknowledgedRunAuthorityInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly stageProof: StagePresentationGenerationProofInternalV1;
  readonly activationGate: NarrativeStableBarrierActivationGateBindingInternalV1;
  readonly preexistingTarget: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null;
  readonly releaseObserverInternalV1: () => void;
  ingressState: "closed" | "open" | "invalid";
  retired: boolean;
  preexistingTargetRetired: boolean;
  callbackClaim: object | null;
  currentAttempt: NarrativeStableBarrierRecoveryAttemptInternalV1 | null;
  replayUnsupportedResult: NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1 | null;
}

interface NarrativeStableBarrierRecoveryAttemptRecordInternalV1 {
  readonly generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1;
  readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  spent: boolean;
}

const narrativeStableBarrierRecoveryAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStableBarrierRecoveryAttemptInternalV1,
  NarrativeStableBarrierRecoveryAttemptRecordInternalV1
>();

function retireNarrativeBarrierRecoveryAttemptInternalV1(
  generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
): void {
  const attempt = generation.currentAttempt;
  if (attempt === null) return;
  const attemptRecord = narrativeStableBarrierRecoveryAttemptRecordsInternalV1.get(attempt);
  if (attemptRecord?.generation === generation) attemptRecord.spent = true;
  if (generation.currentAttempt === attempt) generation.currentAttempt = null;
}

function retireNarrativeBarrierRecoveryGenerationInternalV1(
  generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
): void {
  if (generation.retired) return;
  generation.retired = true;
  generation.preexistingTargetRetired = true;
  generation.ingressState = "invalid";
  generation.callbackClaim = null;
  retireNarrativeBarrierRecoveryAttemptInternalV1(generation);
  generation.replayUnsupportedResult = null;
  try {
    generation.releaseObserverInternalV1();
  } catch {
    // Generation retirement remains fail closed when an observer wrapper throws.
  }
}

interface NarrativeStableBarrierTerminalEvidenceInternalV1 {
  readonly targetIdentity: NarrativeStableBarrierTargetIdentityInternalV1;
  readonly proof: StageAcknowledgedRunProofInternalV1;
  readonly outcome: "completed" | "skipped" | "interrupted" | "cancelled";
  readonly terminalClaim: object;
  retired: boolean;
  inFlightClaim: object | null;
  dispatchedResult:
    | Readonly<{
      readonly kind: "dispatched";
      readonly completion: Promise<unknown>;
    }>
    | null;
}

interface NarrativeStableBarrierAcknowledgmentControllerRecordInternalV1 {
  readonly bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1;
  readonly controllerClaim: object;
  readonly stageAuthority: StageAcknowledgedRunAuthorityInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  active: boolean;
  stageRetargetInProgress: boolean;
  evidence: NarrativeStableBarrierTerminalEvidenceInternalV1 | null;
  terminalResult: NarrativeStableBarrierTerminalDispatchResultInternalV1 | null;
}

const narrativeStableBarrierAcknowledgmentControllerRecordsInternalV1 = new WeakMap<
  NarrativeStableBarrierAcknowledgmentControllerInternalV1,
  NarrativeStableBarrierAcknowledgmentControllerRecordInternalV1
>();

interface NarrativeStablePauseExpiryControllerAttemptRecordInternalV1 {
  readonly controller: NarrativeStablePauseExpiryControllerInternalV1;
  readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  spent: boolean;
}

const narrativeStablePauseExpiryControllerAttemptRecordsInternalV1 = new WeakMap<
  NarrativeStablePauseExpiryControllerAttemptInternalV1,
  NarrativeStablePauseExpiryControllerAttemptRecordInternalV1
>();

const stableZeroDeltaInternalV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

const stableUnchangedResultInternalV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "surface.stable_publication_unchanged" as const,
  delta: stableZeroDeltaInternalV1,
});

const stablePublisherStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stable_publisher_lease_stale" as const,
  delta: stableZeroDeltaInternalV1,
});

const narrativeRendererMissingResultInternalV1 = Object.freeze({
  kind: "rejected" as const,
  code: "narrative.renderer_missing" as const,
  delta: stableZeroDeltaInternalV1,
});

const narrativeCandidatePreflightFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "narrative.candidate_preflight_faulted" as const,
  delta: stableZeroDeltaInternalV1,
});

const stableReconcilePreconditionStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  code: "surface.stable_reconcile_precondition_stale" as const,
  delta: stableZeroDeltaInternalV1,
});

const stableSchemaRejectedResultInternalV1 = Object.freeze({
  kind: "rejected" as const,
  code: "surface.stable_schema_invalid" as const,
  delta: stableZeroDeltaInternalV1,
});

const stableReconcileFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
  delta: stableZeroDeltaInternalV1,
});

function createNarrativePlaybackModeStateInternalV1(
  mode: NarrativeStablePlaybackModeInternalV1,
): NarrativeStablePlaybackModeStateInternalV1 {
  return freezeNarrativePhysicalActionDataInternalV1({ mode });
}

const narrativePlaybackModeToggledNormalResultInternalV1 = Object.freeze({
  kind: "toggled" as const,
  mode: "normal" as const,
  completion: null,
});

const narrativePlaybackModeToggledAutoResultInternalV1 = Object.freeze({
  kind: "toggled" as const,
  mode: "auto" as const,
  completion: null,
});

const narrativePlaybackModeToggledSkipResultInternalV1 = Object.freeze({
  kind: "toggled" as const,
  mode: "skip" as const,
  completion: null,
});

const narrativePlaybackModeIgnoredResultInternalV1 = Object.freeze({
  kind: "ignored" as const,
  completion: null,
});

const narrativePlaybackModeStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativePlaybackModeFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

function playbackModeToggledResultInternalV1(
  mode: NarrativeStablePlaybackModeInternalV1,
): Extract<NarrativeStablePlaybackModeToggleDispatchResultInternalV1, { kind: "toggled" }> {
  return mode === "normal"
    ? narrativePlaybackModeToggledNormalResultInternalV1
    : mode === "auto"
    ? narrativePlaybackModeToggledAutoResultInternalV1
    : narrativePlaybackModeToggledSkipResultInternalV1;
}

function toggledPlaybackModeInternalV1(
  currentMode: NarrativeStablePlaybackModeInternalV1,
  requestedMode: "auto" | "skip",
): NarrativeStablePlaybackModeInternalV1 {
  return currentMode === requestedMode ? "normal" : requestedMode;
}

const narrativePhysicalActionStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativePhysicalActionUnmappedResultInternalV1 = Object.freeze({
  kind: "unmapped" as const,
  completion: null,
});

const narrativePhysicalActionFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativePhysicalActionRevealedResultInternalV1 = Object.freeze({
  kind: "revealed" as const,
  completion: null,
});

const narrativeVoiceReplayHandledResultInternalV1 = Object.freeze({
  kind: "handled" as const,
  completion: null,
});

const narrativeVoiceReplayIgnoredResultInternalV1 = Object.freeze({
  kind: "ignored" as const,
  completion: null,
});

const narrativeHistoryOpenIgnoredResultInternalV1 = Object.freeze({
  kind: "ignored" as const,
  completion: null,
});

const narrativeHistoryOpenStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativeHistoryOpenFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativeHistoryChildStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativeHistoryChildFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativeSayContentAutoNotReadyResultInternalV1 = Object.freeze({
  kind: "not_ready" as const,
  completion: null,
});

const narrativePauseExpiryStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativePauseExpiryFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativeBarrierStageArmedResultInternalV1 = Object.freeze({
  kind: "armed" as const,
  completion: null,
});

const narrativeBarrierStageStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativeBarrierRetainedResultInternalV1 = Object.freeze({
  kind: "retained" as const,
  completion: null,
});

const narrativeBarrierCancelledResultInternalV1 = Object.freeze({
  kind: "cancelled" as const,
  completion: null,
});

const narrativeBarrierStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativeBarrierFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativeBarrierRecoveryStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  completion: null,
});

const narrativeBarrierRecoveryFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  completion: null,
});

const narrativeBarrierRecoveryGenerationStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  generation: null,
});

const narrativeBarrierRecoveryGenerationFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  generation: null,
});

function narrativeBarrierStageFaultedResultInternalV1(
  code:
    | "stage.acknowledged_run_unmatched"
    | "stage.acknowledged_run_ambiguous"
    | "stage.acknowledged_run_faulted",
): NarrativeStableBarrierStageRetargetResultInternalV1 {
  return freezeNarrativePhysicalActionDataInternalV1({
    kind: "faulted" as const,
    code,
    completion: null,
  });
}

function hasExactDataKeysInternalV1(
  value: unknown,
  keys: readonly string[],
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string") ||
    !keys.every((key) => Object.hasOwn(value, key))
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor;
  });
}

interface CapturedOwnDataRecordInternalV1 {
  readonly keys: readonly string[];
  readonly values: Readonly<Record<string, unknown>>;
}

function captureOwnDataRecordInternalV1(
  value: unknown,
): CapturedOwnDataRecordInternalV1 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Reflect.getPrototypeOf(value) !== Object.prototype) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return null;
  const keys = ownKeys as string[];
  const values = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    Object.defineProperty(values, key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: descriptor.value,
    });
  }
  return Object.freeze({
    keys: Object.freeze([...keys]),
    values: Object.freeze(values),
  });
}

function capturedRecordHasExactKeysInternalV1(
  record: CapturedOwnDataRecordInternalV1,
  expectedKeys: readonly string[],
): boolean {
  if (record.keys.length !== expectedKeys.length) return false;
  const actualKeys = new Set(record.keys);
  return expectedKeys.every((key) => actualKeys.has(key));
}

function narrativeParametersSchemaInternalV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({
    parse(value: unknown): NarrativeStableParametersInternalV1 {
      const keys = [
        "semanticOccurrenceId",
        "kind",
        "definitionId",
        "seenRevision",
        "rendererKey",
      ] as const;
      if (!hasExactDataKeysInternalV1(value, keys)) {
        throw new TypeError("ui.narrative_stable_parameters_invalid");
      }
      const kind = value.kind;
      if (
        kind !== "say" && kind !== "choice" && kind !== "pause" &&
        kind !== "presentation_barrier" && kind !== "custom"
      ) {
        throw new TypeError("ui.narrative_stable_parameters_invalid");
      }
      return Object.freeze({
        semanticOccurrenceId: parseInteractionOccurrenceIdV1(value.semanticOccurrenceId),
        kind,
        definitionId: parseModuleId(value.definitionId),
        seenRevision: parsePositiveSafeInteger(value.seenRevision),
        rendererKey: parseModuleId(value.rendererKey),
      });
    },
  });
}

const ownerIdInternalV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");
const rootSlotIdInternalV1 = parseManagedSurfaceSlotIdV1("surface-slot.narrative.root");
const historySlotIdInternalV1 = parseManagedSurfaceSlotIdV1(
  "surface-slot.narrative.history",
);
const dialogueDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.narrative.dialogue",
);
const historyDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.narrative.history",
);
const narrativeLayerIdInternalV1 = parseManagedSurfaceLayerIdV1("surface-layer.narrative");
const narrativeChooseActionIdInternalV1 = parseManagedSurfaceActionIdV1("narrative.choose");
const narrativeResumeActionIdInternalV1 = parseManagedSurfaceActionIdV1("narrative.resume");
const narrativeCustomActionIdInternalV1 = parseManagedSurfaceActionIdV1("narrative.custom");
const narrativeConfirmActionIdInternalV1 = parseManagedSurfaceActionIdV1("ui.confirm");
const narrativeAdvanceActionIdInternalV1 = parseManagedSurfaceActionIdV1("narrative.advance");
const narrativeReplayVoiceActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.replay_voice",
);
const narrativeToggleAutoActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_auto",
);
const narrativeToggleSkipActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_skip",
);
const narrativeToggleHistoryActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_history",
);
const narrativeCancelActionIdInternalV1 = parseManagedSurfaceActionIdV1("ui.cancel");

const readinessPolicyInternalV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});

const dialogueDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  definitionId: dialogueDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(2),
  ownerId: ownerIdInternalV1,
  slotId: rootSlotIdInternalV1,
  layerId: narrativeLayerIdInternalV1,
  layerOrder: 40,
  placement: "root",
  modality: "blocking",
  inputPolicy: Object.freeze({ kind: "managed", inputContextId: "narrative" }),
  dismissPolicy: Object.freeze({
    back: false,
    escape: false,
    backdrop: false,
    routedCancel: false,
  }),
  focusPolicy: Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.primary",
    ),
    trap: true,
    restore: "previous_owner",
  }),
  navigationPolicy: Object.freeze({ kind: "none" }),
  actionIds: Object.freeze(
    [
      "ui.confirm",
      "narrative.advance",
      "narrative.choose",
      "narrative.resume",
      "narrative.custom",
      "player.toggle_auto",
      "player.toggle_skip",
      "player.toggle_history",
      "player.replay_voice",
    ].map(parseManagedSurfaceActionIdV1),
  ),
  readiness: readinessPolicyInternalV1,
});

const historyDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  definitionId: historyDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(1),
  ownerId: ownerIdInternalV1,
  slotId: historySlotIdInternalV1,
  layerId: narrativeLayerIdInternalV1,
  layerOrder: 41,
  placement: "child",
  modality: "blocking",
  inputPolicy: Object.freeze({ kind: "managed", inputContextId: "narrative" }),
  dismissPolicy: Object.freeze({
    back: true,
    escape: true,
    backdrop: true,
    routedCancel: true,
  }),
  focusPolicy: Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.history-close",
    ),
    trap: true,
    restore: "opener",
  }),
  navigationPolicy: Object.freeze({ kind: "close" }),
  actionIds: Object.freeze(
    ["ui.cancel", "player.toggle_history"].map(parseManagedSurfaceActionIdV1),
  ),
  readiness: readinessPolicyInternalV1,
});

const rootSlotDescriptorInternalV1 = Object.freeze({
  kind: "root" as const,
  slotId: rootSlotIdInternalV1,
  cardinality: "single" as const,
});
const historySlotDescriptorInternalV1 = Object.freeze({
  kind: "child" as const,
  parentDefinitionId: dialogueDefinitionIdInternalV1,
  slotId: historySlotIdInternalV1,
  cardinality: "single" as const,
});
const dialogueSidecarInternalV1: ManagedSurfaceStableDefinitionSidecarInternalV1 = Object.freeze({
  definition: dialogueDefinitionInternalV1,
  parameterSchema: narrativeParametersSchemaInternalV1(),
});

const narrativeManagedSurfaceFamilyContractInternalV1:
  NarrativeManagedSurfaceFamilyContractInternalV1 = Object.freeze({
    ownerId: ownerIdInternalV1,
    resolvedOwnerIds: Object.freeze([ownerIdInternalV1]),
    resolvedSlotDescriptors: Object.freeze([
      rootSlotDescriptorInternalV1,
      historySlotDescriptorInternalV1,
    ]),
    definitions: Object.freeze({
      dialogue: dialogueDefinitionInternalV1,
      history: historyDefinitionInternalV1,
    }),
    stableDefinitionSidecars: Object.freeze([dialogueSidecarInternalV1]),
  });

export function createNarrativeManagedSurfaceFamilyContractInternalV1(): NarrativeManagedSurfaceFamilyContractInternalV1 {
  return narrativeManagedSurfaceFamilyContractInternalV1;
}

function bytesEqualInternalV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function isOpaqueCandidatePortInternalV1(
  value: unknown,
): value is object | ((...args: never[]) => unknown) {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

function captureSemanticResolutionPortInternalV1(
  value: unknown,
): NarrativeStableCapturedSemanticResolutionPortInternalV1 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Reflect.getPrototypeOf(value) !== Object.prototype) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== 1 || ownKeys[0] !== "dispatchResolutionInternalV1") return null;
  const descriptor = Reflect.getOwnPropertyDescriptor(value, "dispatchResolutionInternalV1");
  if (
    descriptor === undefined || !("value" in descriptor) ||
    typeof descriptor.value !== "function"
  ) {
    return null;
  }
  const handle = Object.freeze(
    {},
  ) as NarrativeStableCapturedSemanticResolutionPortInternalV1;
  narrativeStableSemanticResolutionPortBindingsInternalV1.set(handle, {
    receiver: value as NarrativeStableSemanticResolutionPortInternalV1,
    dispatchResolution: descriptor.value as NarrativeStableSemanticResolutionPortInternalV1[
      "dispatchResolutionInternalV1"
    ],
  });
  return handle;
}

function captureVoiceReplayPortInternalV1(
  value: unknown,
): NarrativeStableCapturedVoiceReplayPortInternalV1 | null {
  const record = captureOwnDataRecordInternalV1(value);
  if (
    record === null ||
    !capturedRecordHasExactKeysInternalV1(record, ["replayCurrentVoiceInternalV1"]) ||
    typeof record.values.replayCurrentVoiceInternalV1 !== "function"
  ) {
    return null;
  }
  const handle = Object.freeze({}) as NarrativeStableCapturedVoiceReplayPortInternalV1;
  narrativeStableVoiceReplayPortBindingsInternalV1.set(handle, {
    receiver: value as NarrativeStableVoiceReplayPortInternalV1,
    replayCurrentVoice: record.values
      .replayCurrentVoiceInternalV1 as NarrativeStableVoiceReplayPortInternalV1[
        "replayCurrentVoiceInternalV1"
      ],
  });
  return handle;
}

function captureHistoryAvailabilityPortInternalV1(
  value: unknown,
): NarrativeStableCapturedHistoryAvailabilityPortInternalV1 | null {
  const record = captureOwnDataRecordInternalV1(value);
  if (
    record === null ||
    !capturedRecordHasExactKeysInternalV1(record, [
      "readHistoryAvailabilityInternalV1",
    ]) ||
    typeof record.values.readHistoryAvailabilityInternalV1 !== "function"
  ) {
    return null;
  }
  const handle = freezeNarrativePhysicalActionDataInternalV1(
    {},
  ) as NarrativeStableCapturedHistoryAvailabilityPortInternalV1;
  narrativeStableHistoryAvailabilityPortBindingsInternalV1.set(handle, {
    receiver: value as NarrativeStableHistoryAvailabilityPortInternalV1,
    readHistoryAvailability: record.values
      .readHistoryAvailabilityInternalV1 as NarrativeStableHistoryAvailabilityPortInternalV1[
        "readHistoryAvailabilityInternalV1"
      ],
  });
  return handle;
}

function captureHistoryObservationPortInternalV1(
  value: unknown,
): NarrativeStableCapturedHistoryObservationPortInternalV1 | null {
  const record = captureOwnDataRecordInternalV1(value);
  if (
    record === null ||
    !capturedRecordHasExactKeysInternalV1(record, [
      "getSnapshotInternalV1",
      "subscribeInternalV1",
    ]) ||
    typeof record.values.getSnapshotInternalV1 !== "function" ||
    typeof record.values.subscribeInternalV1 !== "function"
  ) {
    return null;
  }
  const handle = freezeNarrativePhysicalActionDataInternalV1(
    {},
  ) as NarrativeStableCapturedHistoryObservationPortInternalV1;
  narrativeStableHistoryObservationPortBindingsInternalV1.set(handle, {
    receiver: value as NarrativeStableHistoryObservationPortInternalV1,
    getSnapshot: record.values
      .getSnapshotInternalV1 as NarrativeStableHistoryObservationPortInternalV1[
        "getSnapshotInternalV1"
      ],
    subscribe: record.values
      .subscribeInternalV1 as NarrativeStableHistoryObservationPortInternalV1[
        "subscribeInternalV1"
      ],
  });
  return handle;
}

function captureCandidateSnapshotInternalV1(
  value: unknown,
): NarrativeStableCandidateSnapshotInternalV1 | null {
  const keys = [
    "rendererComponent",
    "visualConfig",
    "semanticDispatchPort",
    "historyObservationPort",
    "historyAvailabilityPort",
    "playerProfile",
    "presentationClock",
    "textResolver",
    "voiceReplayPort",
    "quickMenuContribution",
  ] as const;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Reflect.getPrototypeOf(value) !== Object.prototype) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length) return null;
  const captured: Record<(typeof keys)[number], unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    captured[key] = descriptor.value;
  }
  for (const key of ownKeys) {
    if (typeof key !== "string" || !Object.hasOwn(captured, key)) return null;
  }
  const semanticDispatchPort = captureSemanticResolutionPortInternalV1(
    captured.semanticDispatchPort,
  );
  const voiceReplayPort = captured.voiceReplayPort === null
    ? null
    : captureVoiceReplayPortInternalV1(captured.voiceReplayPort);
  const historyAvailabilityPort = captureHistoryAvailabilityPortInternalV1(
    captured.historyAvailabilityPort,
  );
  const historyObservationPort = captureHistoryObservationPortInternalV1(
    captured.historyObservationPort,
  );
  if (
    !isOpaqueCandidatePortInternalV1(captured.rendererComponent) ||
    typeof captured.visualConfig !== "object" || captured.visualConfig === null ||
    !Object.isFrozen(captured.visualConfig) ||
    semanticDispatchPort === null ||
    historyObservationPort === null ||
    historyAvailabilityPort === null ||
    typeof captured.playerProfile !== "object" || captured.playerProfile === null ||
    !Object.isFrozen(captured.playerProfile) ||
    !isOpaqueCandidatePortInternalV1(captured.presentationClock) ||
    !isOpaqueCandidatePortInternalV1(captured.textResolver) ||
    (captured.voiceReplayPort !== null && voiceReplayPort === null) ||
    (captured.quickMenuContribution !== null &&
      !isOpaqueCandidatePortInternalV1(captured.quickMenuContribution))
  ) {
    return null;
  }
  return Object.freeze({
    rendererComponent: captured.rendererComponent as NarrativeStableRendererComponentInternalV1,
    visualConfig: captured.visualConfig,
    semanticDispatchPort,
    historyObservationPort,
    historyAvailabilityPort,
    playerProfile: captured.playerProfile,
    presentationClock: captured.presentationClock,
    textResolver: captured.textResolver,
    voiceReplayPort,
    quickMenuContribution: captured.quickMenuContribution,
  });
}

function parseNarrativeStableRequiredPortIdInternalV1(
  value: unknown,
): NarrativeStableRequiredPortIdInternalV1 | null {
  switch (value) {
    case "narrative.semantic_dispatch":
    case "narrative.history_observation":
    case "narrative.history_availability":
    case "narrative.player_profile":
    case "narrative.presentation_clock":
    case "narrative.text_resolver":
      return value;
    default:
      return null;
  }
}

function narrativeRequiredPortMissingResultInternalV1(
  portId: NarrativeStableRequiredPortIdInternalV1,
): NarrativeStablePublisherBridgeResultInternalV1 {
  return Object.freeze({
    kind: "rejected" as const,
    code: "narrative.required_port_missing" as const,
    portId,
    delta: stableZeroDeltaInternalV1,
  });
}

function rendererKeyInternalV1(pending: PendingInteractionV1): string {
  return pending.kind === "custom" ? pending.surfaceId : `narrative.renderer.${pending.kind}`;
}

function stableContextResultInternalV1(
  result:
    | { readonly kind: "stale"; readonly code: "surface.stable_publisher_lease_stale" }
    | { readonly kind: "faulted"; readonly code: "surface.stable_reconcile_faulted" },
): ManagedSurfaceStableReconcileResultInternalV1 {
  return result.kind === "stale"
    ? stablePublisherStaleResultInternalV1
    : stableReconcileFaultedResultInternalV1;
}

export function createNarrativeStablePublisherBridgeInternalV1(
  input: CreateNarrativeStablePublisherBridgeInputInternalV1,
): NarrativeStablePublisherBridgeInternalV1 {
  const publisherLeaseRegistry = input.publisherLeaseRegistry;
  const admissionAuthority = input.admissionAuthority;
  const compositeRuntimeKernel = input.compositeRuntimeKernel;
  const exactAggregateDefinitionSidecars = input.exactAggregateDefinitionSidecars;
  const exactAggregateSlotDescriptors = input.exactAggregateSlotDescriptors;
  const contract = narrativeManagedSurfaceFamilyContractInternalV1;
  if (
    !matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1(
      admissionAuthority,
      publisherLeaseRegistry,
      exactAggregateDefinitionSidecars,
      exactAggregateSlotDescriptors,
      contract.stableDefinitionSidecars,
      contract.resolvedSlotDescriptors,
    ) ||
    !matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1(
      compositeRuntimeKernel,
      admissionAuthority,
      publisherLeaseRegistry,
    )
  ) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  const candidatePreflight = input.candidatePreflight;
  if (
    (typeof candidatePreflight !== "object" && typeof candidatePreflight !== "function") ||
    candidatePreflight === null
  ) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  let preflightCandidate: unknown;
  try {
    preflightCandidate = candidatePreflight.preflightCandidateInternalV1;
  } catch {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  if (typeof preflightCandidate !== "function") {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  const subscribeState = captureOwnCallableInternalV1(
    compositeRuntimeKernel,
    "subscribeStateInternalV1",
  );
  if (subscribeState === null) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }

  const issuePublisher = publisherLeaseRegistry.issuePublisher;
  const inspectCurrentLease = publisherLeaseRegistry.inspectCurrentLease;
  const disposePublisherLease = publisherLeaseRegistry.disposePublisherLease;
  const registerStablePublisherLease =
    compositeRuntimeKernel.registerStablePublisherLeaseInternalV1;
  const captureAdmissionContext = compositeRuntimeKernel.captureAdmissionContextInternalV1;
  const applyStableAdmissionProposal =
    compositeRuntimeKernel.applyStableAdmissionProposalInternalV1;
  const disposeStablePublisherLease = compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1;
  let issuedPublisher: ManagedSurfaceStablePublisherInternalV1 | null = null;
  let issuedPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1 | null = null;
  let registered = false;
  try {
    issuedPublisher = Reflect.apply(issuePublisher, publisherLeaseRegistry, [ownerIdInternalV1]);
    issuedPublisherLease = issuedPublisher.lease;
    const registration = Reflect.apply(
      registerStablePublisherLease,
      compositeRuntimeKernel,
      [issuedPublisherLease],
    );
    if (registration.kind !== "registered") {
      throw new TypeError("ui.narrative_stable_composition_invalid");
    }
    registered = true;
    const captured = Reflect.apply(captureAdmissionContext, compositeRuntimeKernel, [
      issuedPublisherLease,
    ]);
    const leaseSnapshot = Reflect.apply(inspectCurrentLease, publisherLeaseRegistry, [
      issuedPublisherLease,
    ]);
    if (
      captured.kind !== "captured" || captured.acceptedBaseline.kind !== "unpublished" ||
      captured.acceptedBaseline.publisherLease !== issuedPublisherLease ||
      leaseSnapshot?.ownerId !== ownerIdInternalV1 || leaseSnapshot.disposed
    ) {
      throw new TypeError("ui.narrative_stable_composition_invalid");
    }
  } catch (error) {
    if (issuedPublisherLease !== null) {
      try {
        if (registered) {
          Reflect.apply(disposeStablePublisherLease, compositeRuntimeKernel, [
            issuedPublisherLease,
          ]);
        } else if (
          Reflect.apply(inspectCurrentLease, publisherLeaseRegistry, [issuedPublisherLease]) !==
            null
        ) {
          Reflect.apply(disposePublisherLease, publisherLeaseRegistry, [issuedPublisherLease]);
        }
      } catch {
        // A synchronous listener may already have terminal-disposed the composition.
      }
    }
    throw error;
  }
  if (issuedPublisher === null || issuedPublisherLease === null) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  const publisher = issuedPublisher;
  const publisherLease = issuedPublisherLease;
  const bridgeIdentity = Object.freeze({});
  let bridgeActive = true;
  const evaluateStablePublication = admissionAuthority.evaluate;
  const getPublisherSnapshot = publisher.getSnapshot;
  const issueSourceRevision = publisher.issueSourceRevision;
  const issueOccurrence = publisher.issueOccurrence;

  type CapturedContextInternalV1 = Readonly<{
    readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
    readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
  }>;

  type CurrentProjectionInternalV1 =
    | Readonly<{
      readonly kind: "empty";
      readonly context: CapturedContextInternalV1;
    }>
    | Readonly<{
      readonly kind: "target";
      readonly context: CapturedContextInternalV1;
      readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
      readonly record: NarrativeTargetFrameRecordInternalV1;
    }>;

  const captureCurrentProjection = ():
    | CurrentProjectionInternalV1
    | ManagedSurfaceStableReconcileResultInternalV1 => {
    const captured = Reflect.apply(captureAdmissionContext, compositeRuntimeKernel, [
      publisherLease,
    ]);
    if (captured.kind !== "captured") return stableContextResultInternalV1(captured);
    const context = Object.freeze({
      acceptedBaseline: captured.acceptedBaseline,
      reservationSnapshot: captured.reservationSnapshot,
    });
    const baseline = captured.acceptedBaseline;
    if (baseline.publisherLease !== publisherLease) return stableReconcileFaultedResultInternalV1;
    if (baseline.kind === "unpublished") return Object.freeze({ kind: "empty", context });
    if (baseline.ownerId !== ownerIdInternalV1) return stableReconcileFaultedResultInternalV1;
    if (baseline.targets.length === 0) return Object.freeze({ kind: "empty", context });
    if (baseline.targets.length !== 1) return stableReconcileFaultedResultInternalV1;
    const target = baseline.targets[0]!;
    const record = narrativeTargetFrameRecordsInternalV1.get(target);
    if (
      target.publisherLease !== publisherLease ||
      target.ownerId !== ownerIdInternalV1 ||
      target.definitionId !== dialogueDefinitionIdInternalV1 ||
      target.parentOccurrenceId !== null ||
      record === undefined ||
      record.bridgeIdentity !== bridgeIdentity ||
      record.sourceRevision !== baseline.sourceRevision
    ) {
      return stableReconcileFaultedResultInternalV1;
    }
    return Object.freeze({ kind: "target", context, target, record });
  };

  const hasIssuanceCapacity = (needsOccurrence: boolean): boolean => {
    const snapshot = Reflect.apply(getPublisherSnapshot, publisher, []);
    return snapshot.sourceRevisionIssuanceHighWater < Number.MAX_SAFE_INTEGER &&
      (!needsOccurrence || snapshot.occurrenceIssuanceHighWater < Number.MAX_SAFE_INTEGER);
  };

  const captureCandidatePreflight = (
    pending: PendingInteractionV1,
    rendererKey: string,
  ):
    | Readonly<{
      readonly kind: "captured";
      readonly snapshot: NarrativeStableCandidateSnapshotInternalV1;
    }>
    | Readonly<{
      readonly kind: "result";
      readonly result: NarrativeStablePublisherBridgeResultInternalV1;
    }> => {
    let rawPreflightResult: unknown;
    try {
      rawPreflightResult = Reflect.apply(
        preflightCandidate,
        candidatePreflight,
        [pending, rendererKey],
      );
    } catch {
      return Object.freeze({
        kind: "result" as const,
        result: narrativeCandidatePreflightFaultedResultInternalV1,
      });
    }
    try {
      const capturedResult = captureOwnDataRecordInternalV1(rawPreflightResult);
      if (capturedResult === null) {
        return Object.freeze({
          kind: "result" as const,
          result: narrativeCandidatePreflightFaultedResultInternalV1,
        });
      }
      const fields = capturedResult.values;
      if (
        !capturedRecordHasExactKeysInternalV1(capturedResult, [
          "kind",
          "candidateSnapshot",
        ]) || fields.kind !== "captured"
      ) {
        if (
          capturedRecordHasExactKeysInternalV1(capturedResult, ["kind", "code"]) &&
          fields.kind === "rejected" && fields.code === "narrative.renderer_missing"
        ) {
          return Object.freeze({
            kind: "result" as const,
            result: narrativeRendererMissingResultInternalV1,
          });
        }
        if (
          capturedRecordHasExactKeysInternalV1(capturedResult, [
            "kind",
            "code",
            "portId",
          ]) && fields.kind === "rejected" &&
          fields.code === "narrative.required_port_missing"
        ) {
          const portId = parseNarrativeStableRequiredPortIdInternalV1(fields.portId);
          if (portId !== null) {
            return Object.freeze({
              kind: "result" as const,
              result: narrativeRequiredPortMissingResultInternalV1(portId),
            });
          }
        }
        if (
          capturedRecordHasExactKeysInternalV1(capturedResult, ["kind", "code"]) &&
          fields.kind === "faulted" &&
          fields.code === "narrative.candidate_preflight_faulted"
        ) {
          return Object.freeze({
            kind: "result" as const,
            result: narrativeCandidatePreflightFaultedResultInternalV1,
          });
        }
        return Object.freeze({
          kind: "result" as const,
          result: narrativeCandidatePreflightFaultedResultInternalV1,
        });
      }
      const candidateSnapshot = captureCandidateSnapshotInternalV1(
        fields.candidateSnapshot,
      );
      if (candidateSnapshot !== null) {
        return Object.freeze({ kind: "captured" as const, snapshot: candidateSnapshot });
      }
    } catch {
      // Malformed or hostile preflight output is a family preflight fault.
    }
    return Object.freeze({
      kind: "result" as const,
      result: narrativeCandidatePreflightFaultedResultInternalV1,
    });
  };

  const applyPublication = (
    context: CapturedContextInternalV1,
    sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1,
    targets: readonly ManagedSurfaceStableTargetInternalV1[],
    record: NarrativeTargetFrameRecordInternalV1 | null,
  ): ManagedSurfaceStableReconcileResultInternalV1 => {
    const publication = Object.freeze({
      publisherLease,
      sourceRevision,
      targets,
    });
    const evaluated = Reflect.apply(evaluateStablePublication, admissionAuthority, [{
      publication,
      acceptedBaseline: context.acceptedBaseline,
      reservationSnapshot: context.reservationSnapshot,
    }]) as ManagedSurfaceStableAdmissionResultInternalV1;
    if (evaluated.kind !== "admitted") return evaluated;
    const admittedTargets = evaluated.proposal.nextAcceptedBaseline.targets;
    if (
      (record === null && admittedTargets.length !== 0) ||
      (record !== null && admittedTargets.length !== 1)
    ) {
      return stableReconcileFaultedResultInternalV1;
    }
    const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
    if (bridgeRecord === undefined) return stableReconcileFaultedResultInternalV1;
    const admittedTarget = record === null ? null : admittedTargets[0]!;
    const previousTargetRecord = admittedTarget === null
      ? undefined
      : narrativeTargetFrameRecordsInternalV1.get(admittedTarget);
    let predecessorModeState: NarrativeStablePlaybackModeStateInternalV1 | null = null;
    let provisionalModeState: NarrativeStablePlaybackModeStateInternalV1 | null = null;
    if (
      (record === null || record.frame.pending.kind !== "say") &&
      bridgeRecord.currentModeState.mode !== "normal"
    ) {
      predecessorModeState = bridgeRecord.currentModeState;
      provisionalModeState = createNarrativePlaybackModeStateInternalV1("normal");
      if (
        !compareAndSetNarrativePlaybackModeStateInternalV1(
          bridgeRecord,
          predecessorModeState,
          provisionalModeState,
        )
      ) {
        return stableReconcileFaultedResultInternalV1;
      }
    }

    const restorePrestage = (): void => {
      try {
        if (
          admittedTarget !== null && record !== null &&
          narrativeTargetFrameRecordsInternalV1.get(admittedTarget) === record
        ) {
          if (previousTargetRecord === undefined) {
            narrativeTargetFrameRecordsInternalV1.delete(admittedTarget);
          } else {
            narrativeTargetFrameRecordsInternalV1.set(admittedTarget, previousTargetRecord);
          }
        }
      } finally {
        if (
          predecessorModeState !== null && provisionalModeState !== null
        ) {
          compareAndSetNarrativePlaybackModeStateInternalV1(
            bridgeRecord,
            provisionalModeState,
            predecessorModeState,
          );
        }
      }
    };

    try {
      if (admittedTarget !== null && record !== null) {
        narrativeTargetFrameRecordsInternalV1.set(admittedTarget, record);
      }
      const applied = Reflect.apply(applyStableAdmissionProposal, compositeRuntimeKernel, [
        evaluated.proposal,
      ]);
      if (applied.kind !== "applied") {
        restorePrestage();
      }
      return applied;
    } catch (error) {
      restorePrestage();
      throw error;
    }
  };

  const bridge: NarrativeStablePublisherBridgeInternalV1 = Object.freeze({
    readPlaybackModeInternalV1(): NarrativeStablePlaybackModeInternalV1 {
      if (!bridgeActive) return "normal";
      const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
      if (bridgeRecord === undefined) return "normal";
      try {
        const current = captureCurrentProjection();
        return bridgeActive && "context" in current ? bridgeRecord.currentModeState.mode : "normal";
      } catch {
        return "normal";
      }
    },

    reconcilePendingInternalV1(
      pendingInput: unknown,
    ): NarrativeStablePublisherBridgeResultInternalV1 {
      const current = captureCurrentProjection();
      if (!("context" in current)) return current;

      if (pendingInput === null) {
        if (current.kind === "empty") return stableUnchangedResultInternalV1;
        if (!hasIssuanceCapacity(false)) return stableReconcileFaultedResultInternalV1;
        const sourceRevision = Reflect.apply(issueSourceRevision, publisher, []);
        return applyPublication(current.context, sourceRevision, Object.freeze([]), null);
      }

      let pending: PendingInteractionV1;
      let canonicalPendingBytes: Uint8Array;
      try {
        pending = parsePendingInteractionV1(pendingInput);
        canonicalPendingBytes = canonicalJsonBytes(pending);
      } catch {
        return stableSchemaRejectedResultInternalV1;
      }

      if (
        current.kind === "target" &&
        current.record.frame.semanticOccurrenceId === pending.occurrenceId
      ) {
        return bytesEqualInternalV1(
            current.record.canonicalPendingBytes,
            canonicalPendingBytes,
          )
          ? stableUnchangedResultInternalV1
          : stableReconcileFaultedResultInternalV1;
      }
      if (!hasIssuanceCapacity(true)) return stableReconcileFaultedResultInternalV1;

      const rendererKey = rendererKeyInternalV1(pending);
      const preflight = captureCandidatePreflight(pending, rendererKey);
      const refreshed = captureCurrentProjection();
      if (!("context" in refreshed)) return refreshed;
      if (
        refreshed.context.acceptedBaseline !== current.context.acceptedBaseline ||
        refreshed.context.reservationSnapshot.generationToken !==
          current.context.reservationSnapshot.generationToken
      ) {
        return stableReconcilePreconditionStaleResultInternalV1;
      }
      if (preflight.kind === "result") return preflight.result;
      if (!hasIssuanceCapacity(true)) return stableReconcileFaultedResultInternalV1;
      const frame = Object.freeze({
        semanticOccurrenceId: pending.occurrenceId,
        rendererKey,
        pending,
        candidateSnapshot: preflight.snapshot,
      });
      const sourceRevision = Reflect.apply(issueSourceRevision, publisher, []);
      const occurrenceId = Reflect.apply(issueOccurrence, publisher, []);
      const parameters: NarrativeStableParametersInternalV1 = Object.freeze({
        semanticOccurrenceId: pending.occurrenceId,
        kind: pending.kind,
        definitionId: pending.definitionId,
        seenRevision: pending.seenRevision,
        rendererKey,
      });
      const record: NarrativeTargetFrameRecordInternalV1 = Object.freeze({
        bridgeIdentity,
        sourceRevision,
        canonicalPendingBytes: Uint8Array.from(canonicalPendingBytes),
        frame,
      });
      const target: ManagedSurfaceStableTargetInternalV1 = Object.freeze({
        occurrenceId,
        definitionId: dialogueDefinitionIdInternalV1,
        parentOccurrenceId: null,
        parameters,
      });
      return applyPublication(
        refreshed.context,
        sourceRevision,
        Object.freeze([target]),
        record,
      );
    },

    retryCurrentPendingInternalV1(): NarrativeStablePublisherBridgeResultInternalV1 {
      const current = captureCurrentProjection();
      if (!("context" in current)) return current;
      if (current.kind !== "target") return stableUnchangedResultInternalV1;
      const runtimeEntry = compositeRuntimeKernel.getStateInternalV1().stableRuntimeBindings.find(
        (entry) => entry.desiredTarget.admittedTarget === current.target,
      );
      if (
        runtimeEntry?.binding.kind !== "gap" ||
        runtimeEntry.binding.reason !== "readiness_failed"
      ) {
        return stableUnchangedResultInternalV1;
      }
      if (!hasIssuanceCapacity(false)) return stableReconcileFaultedResultInternalV1;
      const preflight = captureCandidatePreflight(
        current.record.frame.pending,
        current.record.frame.rendererKey,
      );
      const refreshed = captureCurrentProjection();
      if (!("context" in refreshed)) return refreshed;
      if (
        refreshed.context.acceptedBaseline !== current.context.acceptedBaseline ||
        refreshed.context.reservationSnapshot.generationToken !==
          current.context.reservationSnapshot.generationToken
      ) {
        return stableReconcilePreconditionStaleResultInternalV1;
      }
      if (preflight.kind === "result") return preflight.result;
      if (!hasIssuanceCapacity(false)) return stableReconcileFaultedResultInternalV1;
      const sourceRevision = Reflect.apply(issueSourceRevision, publisher, []);
      const frame: NarrativeStableAdmittedFrameInternalV1 = Object.freeze({
        ...current.record.frame,
        candidateSnapshot: preflight.snapshot,
      });
      const record: NarrativeTargetFrameRecordInternalV1 = Object.freeze({
        ...current.record,
        sourceRevision,
        frame,
      });
      const target: ManagedSurfaceStableTargetInternalV1 = Object.freeze({
        occurrenceId: current.target.occurrenceId,
        definitionId: current.target.definitionId,
        parentOccurrenceId: current.target.parentOccurrenceId,
        parameters: current.target.normalizedParameters,
      });
      return applyPublication(
        refreshed.context,
        sourceRevision,
        Object.freeze([target]),
        record,
      );
    },

    disposeInternalV1(): ManagedSurfaceStableReconcileResultInternalV1 {
      // Fence every family ingress before the composite transition can notify
      // synchronous listeners. Disposal is terminal for this bridge even when
      // the underlying authority reports a fail-closed divergence.
      const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
      const predecessorModeState = bridgeRecord?.currentModeState ?? null;
      const terminalModeState = predecessorModeState?.mode === "normal"
        ? null
        : createNarrativePlaybackModeStateInternalV1("normal");
      bridgeActive = false;
      if (bridgeRecord !== undefined) bridgeRecord.active = false;
      if (bridgeRecord !== undefined) {
        terminalizeNarrativeStableSessionInternalV1(bridgeRecord);
      }
      if (
        bridgeRecord !== undefined && predecessorModeState !== null &&
        terminalModeState !== null
      ) {
        compareAndSetNarrativePlaybackModeStateInternalV1(
          bridgeRecord,
          predecessorModeState,
          terminalModeState,
        );
      }
      const recoveryGeneration = bridgeRecord?.barrierRecoveryGeneration;
      if (recoveryGeneration !== undefined && recoveryGeneration !== null) {
        retireNarrativeBarrierRecoveryGenerationInternalV1(recoveryGeneration);
      }
      return Reflect.apply(disposeStablePublisherLease, compositeRuntimeKernel, [
        publisherLease,
      ]);
    },

    inspectAdmittedTargetFrameInternalV1(
      target: unknown,
    ): NarrativeStableAdmittedFrameInternalV1 | null {
      if ((typeof target !== "object" && typeof target !== "function") || target === null) {
        return null;
      }
      const record = narrativeTargetFrameRecordsInternalV1.get(
        target as ManagedSurfaceStableAdmittedTargetInternalV1,
      );
      return record?.bridgeIdentity === bridgeIdentity ? record.frame : null;
    },
  });
  narrativeStablePublisherBridgeRecordsInternalV1.set(bridge, {
    bridgeIdentity,
    compositeRuntimeKernel,
    isActiveInternalV1: () => bridgeActive,
    subscribeStateInternalV1:
      subscribeState as ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
        "subscribeStateInternalV1"
      ],
    captureCurrentTargetInternalV1: () => {
      const current = captureCurrentProjection();
      return current.kind === "target"
        ? Object.freeze({
          target: current.target,
          sourceRevision: current.record.sourceRevision,
          canonicalPendingBytes: current.record.canonicalPendingBytes,
          frame: current.record.frame,
        })
        : null;
    },
    active: true,
    historyChildLifecycle: null,
    currentHistoryPreparation: null,
    currentHistoryCandidateRecord: null,
    currentHostRootActionBinding: null,
    hostPhysicalActionAdmission: null,
    session: null,
    currentModeState: createNarrativePlaybackModeStateInternalV1("normal"),
    physicalActionAdmissionClaim: null,
    pauseExpiryControllerClaim: null,
    sayRevealControllerClaim: null,
    sayCallbackClaim: null,
    saySemanticInFlightClaim: null,
    barrierStageClaimant: freezeNarrativePhysicalActionDataInternalV1({}),
    barrierAcknowledgmentControllerClaim: null,
    barrierTargetTerminalClaim: null,
    barrierCallbackClaim: null,
    barrierSemanticInFlightClaim: null,
    barrierRecoverySynchronizationClaim: null,
    barrierRecoverySynchronizationPoisoned: false,
    barrierRecoveryGeneration: null,
  });
  return bridge;
}

function claimNarrativeStableHistoryChildFamilyAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
): ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 {
  const retained = narrativeStableHistoryChildFamilyClaimsInternalV1.get(kernel);
  if (retained !== undefined) return retained.authority;
  const claimant = freezeNarrativePhysicalActionDataInternalV1({});
  const authority = claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1(
    kernel,
    claimant,
  );
  const readinessAuthority =
    claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1(
      kernel,
      claimant,
    );
  const actionAuthority =
    claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1(
      kernel,
      claimant,
    );
  const lifecycleAuthority =
    claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1(
      kernel,
      claimant,
    );
  const record = freezeNarrativePhysicalActionDataInternalV1({
    claimant,
    authority,
    readinessAuthority,
    actionAuthority,
    lifecycleAuthority,
  });
  narrativeStableHistoryChildFamilyClaimsInternalV1.set(kernel, record);
  return authority;
}

function commitNarrativeStableHistoryChildLifecycleRootBindingInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
  restoredRoot: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  predecessorRoot: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  childBinding: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  expectedFocusOwnership: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  contract: ManagedSurfacePreparedInputBindingContractInternalV1,
): boolean {
  const sessionRecord = runtimeRecord.sessionRecord;
  const bridgeRecord = sessionRecord.bridgeRecord;
  if (
    !runtimeRecord.active || sessionRecord.terminal || !bridgeRecord.active ||
    sessionRecord.currentHostRuntime !== runtimeRecord ||
    bridgeRecord.currentHostRootActionBinding !== predecessorRoot ||
    !predecessorRoot.active || !predecessorRoot.committed ||
    predecessorRoot.sessionRecord !== sessionRecord ||
    !childBinding.active || childBinding.sessionRecord !== sessionRecord ||
    restoredRoot.sessionRecord !== sessionRecord || restoredRoot.runtimeRecord !== runtimeRecord ||
    !restoredRoot.active || restoredRoot.committed ||
    sessionRecord.currentHostFocusOwnership !== expectedFocusOwnership ||
    expectedFocusOwnership !== (childBinding.committed ? childBinding : predecessorRoot) ||
    bridgeRecord.physicalActionAdmissionClaim !==
      (childBinding.committed ? childBinding.admissionClaim : predecessorRoot.admissionClaim)
  ) {
    return false;
  }
  const prepared = restoredRoot.prepared;
  if (prepared === null || !prepared.commitInternalV1(contract)) return false;
  const binding = prepared.getBindingInternalV1();
  if (binding === null) return false;

  const focusTargetId = predecessorRoot.focusTargetId;
  const focusAttachment = predecessorRoot.focusAttachment;
  restoredRoot.prepared = null;
  restoredRoot.binding = binding;
  restoredRoot.committed = true;
  restoredRoot.focusTargetId = focusTargetId;
  restoredRoot.focusAttachment = focusAttachment;
  bridgeRecord.currentHostRootActionBinding = restoredRoot;
  bridgeRecord.hostPhysicalActionAdmission = null;
  bridgeRecord.physicalActionAdmissionClaim = restoredRoot.admissionClaim;
  sessionRecord.currentHostFocusOwnership = restoredRoot;
  runtimeRecord.fallbackInputEntry = null;

  for (const retired of [predecessorRoot, childBinding]) {
    retired.active = false;
    retired.committed = false;
    retired.delegate = null;
    retired.focusAttachment = null;
    retired.runtimeRecord = null;
  }
  return true;
}

function reconcileNarrativeStableHistoryChildLifecycleBindingsInternalV1(
  session: NarrativeStableSessionInternalV1,
  sessionRecord: NarrativeStableSessionRecordInternalV1,
  restoredRoot: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  predecessorRoot: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  childBinding: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  applied: boolean,
): void {
  if (!applied) {
    const supersededAuthority = restoredRoot.authority;
    retireNarrativeStableHostCandidateActionBindingInternalV1(restoredRoot);
    let repaired = true;
    if (supersededAuthority !== null) {
      for (const candidate of sessionRecord.actionBindingRecords) {
        if (
          !candidate.active || candidate.committed || candidate.authority !== supersededAuthority
        ) continue;
        const previousPrepared = candidate.prepared;
        const previousRoute = candidate.claimedRoute;
        candidate.prepared = null;
        candidate.claimedRoute = null;
        try {
          previousPrepared?.abortInternalV1();
        } catch {
          // The replacement below owns the fail-closed repair.
        }
        try {
          previousRoute?.disposeInternalV1();
        } catch {
          // The dormant route is already unreachable from the dispatcher.
        }
        try {
          const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
            authority: supersededAuthority,
            inputContextId: "narrative",
            inputRouter: runtimeRecordInputRouterInternalV1(candidate, sessionRecord),
            isGestureCurrent: runtimeRecordGestureFenceInternalV1(candidate, sessionRecord),
          });
          candidate.prepared = prepared;
          candidate.claimedRoute = claimNarrativeStableHostCandidateActionRouteInternalV1(
            candidate,
            prepared,
          );
        } catch {
          repaired = false;
          break;
        }
      }
    }
    sessionRecord.actionBindingRecords = sessionRecord.actionBindingRecords.filter((record) =>
      record.active
    );
    const runtimeRecord = sessionRecord.currentHostRuntime;
    if (
      !repaired && runtimeRecord !== null && runtimeRecord.active && !sessionRecord.terminal
    ) {
      freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
      notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
    }
    return;
  }
  retireNarrativeStableHostCandidateActionBindingInternalV1(predecessorRoot);
  retireNarrativeStableHostCandidateActionBindingInternalV1(childBinding);
  sessionRecord.actionBindingRecords = sessionRecord.actionBindingRecords.filter((record) =>
    record.active
  );
  const runtimeRecord = sessionRecord.currentHostRuntime;
  if (runtimeRecord === null || !runtimeRecord.active || sessionRecord.terminal) return;
  freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
  notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
}

function runtimeRecordInputRouterInternalV1(
  record: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  sessionRecord: NarrativeStableSessionRecordInternalV1,
): InputRouterV1 {
  const runtimeRecord = sessionRecord.currentHostRuntime;
  if (
    runtimeRecord === null || !runtimeRecord.active || record.runtimeRecord !== runtimeRecord ||
    record.inputRouter !== runtimeRecord.inputRouter
  ) throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  return runtimeRecord.inputRouter;
}

function runtimeRecordGestureFenceInternalV1(
  record: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  sessionRecord: NarrativeStableSessionRecordInternalV1,
): (gestureId: ManagedSurfaceGestureIdV1) => boolean {
  const runtimeRecord = sessionRecord.currentHostRuntime;
  if (
    runtimeRecord === null || !runtimeRecord.active || record.runtimeRecord !== runtimeRecord ||
    record.isGestureCurrent !== runtimeRecord.isGestureCurrent
  ) throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  return runtimeRecord.isGestureCurrent;
}

function transitionNarrativeStableHistoryChildControllerInternalV1(
  controller: NarrativeStableHistoryChildControllerInternalV1,
  receiver: unknown,
  dismissKind: ManagedSurfaceDismissKindV1 | null,
): NarrativeStableHistoryChildLifecycleResultInternalV1 {
  const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(controller);
  if (receiver !== controller || controllerRecord === undefined) {
    throw new TypeError("ui.narrative_stable_history_child_controller_invalid");
  }
  const preparationRecord = controllerRecord.preparationRecord;
  const candidate = preparationRecord?.candidate ?? null;
  if (preparationRecord === null || candidate === null) {
    return narrativeStableHistoryChildLifecycleStaleResultInternalV1;
  }
  const bridgeRecord = preparationRecord.lifecycleRecord.bridgeRecord;
  if (
    !bridgeRecord.active || bridgeRecord.currentHistoryCandidateRecord !== preparationRecord ||
    (bridgeRecord.currentHistoryPreparation !== null &&
      narrativeStableHistoryChildPreparationRecordsInternalV1.get(
          bridgeRecord.currentHistoryPreparation,
        ) !== preparationRecord)
  ) {
    return narrativeStableHistoryChildLifecycleStaleResultInternalV1;
  }
  const session = bridgeRecord.session;
  const sessionRecord = session === null
    ? null
    : narrativeStableSessionRecordsInternalV1.get(session) ?? null;
  const runtimeRecord = sessionRecord?.currentHostRuntime ?? null;
  if (
    session === null || sessionRecord === null || runtimeRecord === null ||
    sessionRecord.terminal || !runtimeRecord.active ||
    sessionRecord.currentHostRuntime !== runtimeRecord
  ) {
    return narrativeStableHistoryChildLifecycleStaleResultInternalV1;
  }
  const childBinding = findNarrativeStableHostActionBindingRecordInternalV1(
    sessionRecord,
    candidate,
  );
  const predecessorRoot = bridgeRecord.currentHostRootActionBinding;
  if (
    childBinding === null || predecessorRoot === null ||
    !predecessorRoot.active || !predecessorRoot.committed
  ) {
    return narrativeStableHistoryChildLifecycleStaleResultInternalV1;
  }
  let restoredRoot: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null = null;
  try {
    restoredRoot = prepareNarrativeStableHostRootRestorationActionBindingInternalV1(runtimeRecord);
  } catch {
    restoredRoot = null;
  }
  if (restoredRoot === null) {
    return narrativeStableHistoryChildLifecycleFaultedResultInternalV1;
  }
  const expectedFocusOwnership = sessionRecord.currentHostFocusOwnership;
  if (
    expectedFocusOwnership === null ||
    expectedFocusOwnership !== (childBinding.committed ? childBinding : predecessorRoot)
  ) {
    reconcileNarrativeStableHistoryChildLifecycleBindingsInternalV1(
      session,
      sessionRecord,
      restoredRoot,
      predecessorRoot,
      childBinding,
      false,
    );
    return narrativeStableHistoryChildLifecycleStaleResultInternalV1;
  }
  let invoked = false;
  const guard = freezeNarrativePhysicalActionDataInternalV1({
    commitInternalV1(
      contract: ManagedSurfacePreparedInputBindingContractInternalV1,
    ): boolean {
      if (invoked) return false;
      invoked = true;
      return commitNarrativeStableHistoryChildLifecycleRootBindingInternalV1(
        runtimeRecord,
        restoredRoot,
        predecessorRoot,
        childBinding,
        expectedFocusOwnership,
        contract,
      );
    },
  }) satisfies ManagedSurfaceStableExactParentTransientChildLifecycleCommitGuardInternalV1;
  const familyClaim = narrativeStableHistoryChildFamilyClaimsInternalV1.get(
    preparationRecord.lifecycleRecord.compositeRuntimeKernel,
  );
  if (familyClaim === undefined) {
    reconcileNarrativeStableHistoryChildLifecycleBindingsInternalV1(
      session,
      sessionRecord,
      restoredRoot,
      predecessorRoot,
      childBinding,
      false,
    );
    return narrativeStableHistoryChildLifecycleFaultedResultInternalV1;
  }
  let result: ReturnType<
    ManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1[
      "closeExactParentTransientChildInternalV1"
    ]
  >;
  try {
    result = dismissKind === null
      ? applyNarrativePhysicalActionInternalV1(
        familyClaim.lifecycleAuthority.closeExactParentTransientChildInternalV1,
        familyClaim.lifecycleAuthority,
        [candidate, guard],
      ) as typeof result
      : applyNarrativePhysicalActionInternalV1(
        familyClaim.lifecycleAuthority.dismissExactParentTransientChildInternalV1,
        familyClaim.lifecycleAuthority,
        [candidate, dismissKind, guard],
      ) as typeof result;
  } catch {
    reconcileNarrativeStableHistoryChildLifecycleBindingsInternalV1(
      session,
      sessionRecord,
      restoredRoot,
      predecessorRoot,
      childBinding,
      false,
    );
    return narrativeStableHistoryChildLifecycleFaultedResultInternalV1;
  }
  const applied = result.kind === "applied";
  reconcileNarrativeStableHistoryChildLifecycleBindingsInternalV1(
    session,
    sessionRecord,
    restoredRoot,
    predecessorRoot,
    childBinding,
    applied,
  );
  if (result.kind === "applied") {
    return result.code === "surface.closed"
      ? narrativeStableHistoryChildClosedResultInternalV1
      : narrativeStableHistoryChildDismissedResultInternalV1;
  }
  if (result.kind === "locked") return narrativeStableHistoryChildLockedResultInternalV1;
  return result.kind === "stale"
    ? narrativeStableHistoryChildLifecycleStaleResultInternalV1
    : narrativeStableHistoryChildLifecycleFaultedResultInternalV1;
}

function createNarrativeStableHistoryChildControllerInternalV1(
  controllerRecord: NarrativeStableHistoryChildControllerRecordInternalV1,
): NarrativeStableHistoryChildControllerInternalV1 {
  let controller!: NarrativeStableHistoryChildControllerInternalV1;
  controller = freezeNarrativePhysicalActionDataInternalV1({
    closeInternalV1(
      this: NarrativeStableHistoryChildControllerInternalV1,
    ): NarrativeStableHistoryChildLifecycleResultInternalV1 {
      return transitionNarrativeStableHistoryChildControllerInternalV1(
        controller,
        this,
        null,
      );
    },
    dismissInternalV1(
      this: NarrativeStableHistoryChildControllerInternalV1,
      dismissKind: ManagedSurfaceDismissKindV1,
    ): NarrativeStableHistoryChildLifecycleResultInternalV1 {
      return transitionNarrativeStableHistoryChildControllerInternalV1(
        controller,
        this,
        dismissKind,
      );
    },
  });
  narrativeStableHistoryChildControllerRecordsInternalV1.set(controller, controllerRecord);
  return controller;
}

function classifyNarrativeStableHistoryChildIntentInternalV1(
  lifecycle: NarrativeStableHistoryChildLifecycleInternalV1,
  lifecycleRecord: NarrativeStableHistoryChildLifecycleRecordInternalV1,
  intent: NarrativeStableHistoryOpenIntentInternalV1,
  intentRecord: NarrativeStableHistoryOpenIntentRecordInternalV1,
): "current" | "stale" | "faulted" {
  const bridgeRecord = lifecycleRecord.bridgeRecord;
  if (
    narrativeStableHistoryChildLifecycleRecordsInternalV1.get(lifecycle) !==
      lifecycleRecord ||
    narrativeStableHistoryOpenIntentRecordsInternalV1.get(intent) !== intentRecord ||
    intentRecord.bridge !== lifecycleRecord.bridge || intentRecord.spent ||
    intentRecord.stableActionAuthority !== lifecycleRecord.stableActionAuthority ||
    !bridgeRecord.active ||
    narrativeStablePublisherBridgeRecordsInternalV1.get(lifecycleRecord.bridge) !==
      bridgeRecord ||
    bridgeRecord.sayCallbackClaim !== null ||
    bridgeRecord.saySemanticInFlightClaim !== null
  ) {
    return "stale";
  }

  try {
    const readyActive = applyNarrativePhysicalActionInternalV1(
      lifecycleRecord.stableActionAuthority.captureReadyActiveStableTargetInternalV1,
      lifecycleRecord.stableActionAuthority,
      [intentRecord.directParent],
    ) as ReturnType<
      ManagedSurfaceStableActionRouteAuthorityInternalV1[
        "captureReadyActiveStableTargetInternalV1"
      ]
    >;
    if (readyActive.kind === "faulted") return "faulted";
    if (
      readyActive.kind !== "captured" ||
      readyActive.directTarget !== intentRecord.directParent ||
      readyActive.sourceRevision !== intentRecord.sourceRevision
    ) {
      return "stale";
    }
    if (
      !applyNarrativePhysicalActionInternalV1(
        lifecycleRecord.stableActionAuthority.isCurrentDirectTargetInternalV1,
        lifecycleRecord.stableActionAuthority,
        [intentRecord.targetProof],
      )
    ) {
      return "stale";
    }
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.target !== intentRecord.directParent ||
      current.sourceRevision !== intentRecord.sourceRevision ||
      current.frame !== intentRecord.frame
    ) {
      return "stale";
    }
    return "current";
  } catch {
    return "faulted";
  }
}

function redeemNarrativeStableHistoryChildIntentInternalV1(
  lifecycle: NarrativeStableHistoryChildLifecycleInternalV1,
  receiver: unknown,
  intent: unknown,
): NarrativeStableHistoryChildPreparationResultInternalV1 {
  if (receiver !== lifecycle) return narrativeHistoryChildStaleResultInternalV1;
  const lifecycleRecord = narrativeStableHistoryChildLifecycleRecordsInternalV1.get(lifecycle);
  if (
    lifecycleRecord === undefined ||
    ((typeof intent !== "object" && typeof intent !== "function") || intent === null)
  ) {
    return narrativeHistoryChildStaleResultInternalV1;
  }
  const exactIntent = intent as NarrativeStableHistoryOpenIntentInternalV1;
  const intentRecord = narrativeStableHistoryOpenIntentRecordsInternalV1.get(exactIntent);
  if (intentRecord === undefined) return narrativeHistoryChildStaleResultInternalV1;
  const classification = classifyNarrativeStableHistoryChildIntentInternalV1(
    lifecycle,
    lifecycleRecord,
    exactIntent,
    intentRecord,
  );
  if (classification === "stale") return narrativeHistoryChildStaleResultInternalV1;
  if (classification === "faulted") return narrativeHistoryChildFaultedResultInternalV1;

  let preparation!: NarrativeStableHistoryChildPreparationInternalV1;
  let preparationRecord!: NarrativeStableHistoryChildPreparationRecordInternalV1;
  let controllerRecord!: NarrativeStableHistoryChildControllerRecordInternalV1;
  let controller!: NarrativeStableHistoryChildControllerInternalV1;
  let preparingResult!: Extract<
    NarrativeStableHistoryChildPreparationResultInternalV1,
    { readonly kind: "preparing" }
  >;
  let commitGuard!: ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1;
  let authorityInput!: Parameters<
    ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1[
      "prepareExactParentTransientChildInternalV1"
    ]
  >[0];
  try {
    preparation = freezeNarrativePhysicalActionDataInternalV1(
      {},
    ) as NarrativeStableHistoryChildPreparationInternalV1;
    controllerRecord = { preparationRecord: null };
    controller = createNarrativeStableHistoryChildControllerInternalV1(controllerRecord);
    preparationRecord = {
      lifecycle,
      lifecycleRecord,
      intent: exactIntent,
      intentRecord,
      controller,
      candidate: null,
    };
    controllerRecord.preparationRecord = preparationRecord;
    preparingResult = freezeNarrativePhysicalActionDataInternalV1({
      kind: "preparing" as const,
      preparation,
      completion: null,
    });
    commitGuard = freezeNarrativePhysicalActionDataInternalV1({
      commitInternalV1(
        candidate: ManagedSurfaceStableExactParentTransientChildCandidateInternalV1,
      ): boolean {
        if (
          preparationRecord.candidate !== null || intentRecord.spent ||
          intentRecord.bridge !== lifecycleRecord.bridge ||
          intentRecord.stableActionAuthority !== lifecycleRecord.stableActionAuthority ||
          !lifecycleRecord.bridgeRecord.active ||
          lifecycleRecord.bridgeRecord.sayCallbackClaim !== null ||
          lifecycleRecord.bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return false;
        }
        recordNarrativeStableHistoryChildPreparationInternalV1(
          preparation,
          preparationRecord,
        );
        preparationRecord.candidate = candidate;
        lifecycleRecord.bridgeRecord.currentHistoryPreparation = preparation;
        lifecycleRecord.bridgeRecord.currentHistoryCandidateRecord = preparationRecord;
        intentRecord.spent = true;
        return true;
      },
    });
    authorityInput = freezeNarrativePhysicalActionDataInternalV1({
      parentProof: intentRecord.targetProof,
      expectedParent: intentRecord.directParent,
      expectedSourceRevision: intentRecord.sourceRevision,
      definition: historyDefinitionInternalV1,
      semanticOccurrenceId: null,
      commitGuard,
    });
  } catch {
    if (controllerRecord !== undefined) controllerRecord.preparationRecord = null;
    return narrativeHistoryChildFaultedResultInternalV1;
  }

  let prepared: ReturnType<
    ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1[
      "prepareExactParentTransientChildInternalV1"
    ]
  >;
  try {
    prepared = applyNarrativePhysicalActionInternalV1(
      lifecycleRecord.childAuthority.prepareExactParentTransientChildInternalV1,
      lifecycleRecord.childAuthority,
      [authorityInput],
    ) as typeof prepared;
  } catch {
    controllerRecord.preparationRecord = null;
    return narrativeHistoryChildFaultedResultInternalV1;
  }
  if (prepared.kind === "stale") {
    controllerRecord.preparationRecord = null;
    return narrativeHistoryChildStaleResultInternalV1;
  }
  if (prepared.kind === "faulted") {
    controllerRecord.preparationRecord = null;
    return narrativeHistoryChildFaultedResultInternalV1;
  }

  return preparingResult;
}

export function createNarrativeStableHistoryChildLifecycleInternalV1(
  input: Readonly<{ readonly bridge: NarrativeStablePublisherBridgeInternalV1 }>,
): NarrativeStableHistoryChildLifecycleInternalV1 {
  let bridge: unknown;
  try {
    if ((typeof input !== "object" && typeof input !== "function") || input === null) {
      throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
    }
    const keys = Reflect.ownKeys(input);
    const descriptor = Object.getOwnPropertyDescriptor(input, "bridge");
    if (
      keys.length !== 1 || keys[0] !== "bridge" || descriptor === undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
    }
    bridge = descriptor.value;
  } catch {
    throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
  }
  if ((typeof bridge !== "object" && typeof bridge !== "function") || bridge === null) {
    throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
  }
  const exactBridge = bridge as NarrativeStablePublisherBridgeInternalV1;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(exactBridge);
  if (bridgeRecord === undefined || !bridgeRecord.active) {
    throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
  }
  if (bridgeRecord.historyChildLifecycle !== null) {
    return bridgeRecord.historyChildLifecycle;
  }

  let childAuthority: ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1;
  let stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  try {
    childAuthority = claimNarrativeStableHistoryChildFamilyAuthorityInternalV1(
      bridgeRecord.compositeRuntimeKernel,
    );
    stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      bridgeRecord.compositeRuntimeKernel,
    );
  } catch {
    throw new TypeError("ui.narrative_stable_history_child_lifecycle_invalid");
  }

  let lifecycle!: NarrativeStableHistoryChildLifecycleInternalV1;
  lifecycle = freezeNarrativePhysicalActionDataInternalV1({
    redeemHistoryOpenIntentInternalV1(
      this: NarrativeStableHistoryChildLifecycleInternalV1,
      intent: unknown,
    ): NarrativeStableHistoryChildPreparationResultInternalV1 {
      return redeemNarrativeStableHistoryChildIntentInternalV1(
        lifecycle,
        this,
        intent,
      );
    },
  });
  narrativeStableHistoryChildLifecycleRecordsInternalV1.set(
    lifecycle,
    freezeNarrativePhysicalActionDataInternalV1({
      bridge: exactBridge,
      bridgeRecord,
      compositeRuntimeKernel: bridgeRecord.compositeRuntimeKernel,
      stableActionAuthority,
      childAuthority,
    }),
  );
  bridgeRecord.historyChildLifecycle = lifecycle;
  return lifecycle;
}

function createNarrativeStableReadinessSnapshotInternalV1(
  entries: readonly NarrativeStableReadinessEntryInternalV1[],
): NarrativeStableReadinessSnapshotInternalV1 {
  return freezeNarrativePhysicalActionDataInternalV1({
    entries: freezeNarrativePhysicalActionDataInternalV1([...entries]),
  });
}

function createNarrativeStableHostRenderSnapshotInternalV1(
  entries: readonly NarrativeStableHostRenderEntryInternalV1[],
): NarrativeStableHostRenderSnapshotInternalV1 {
  return freezeNarrativePhysicalActionDataInternalV1({
    entries: freezeNarrativePhysicalActionDataInternalV1([...entries]),
  });
}

function mintNarrativeStableHostRenderKeyInternalV1(
  record: NarrativeStableSessionRecordInternalV1,
): NarrativeStableHostRenderKeyInternalV1 {
  if (record.renderKeyHighWater >= Number.MAX_SAFE_INTEGER) {
    throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  }
  record.renderKeyHighWater += 1;
  return `narrative-host-render.${
    String(record.renderKeyHighWater)
  }` as NarrativeStableHostRenderKeyInternalV1;
}

function findPreviousNarrativeStableHostRenderEntryInternalV1(
  record: NarrativeStableSessionRecordInternalV1,
  attempt: object,
): NarrativeStableHostRenderEntryInternalV1 | null {
  for (const entry of record.currentRenderSnapshot.entries) {
    const entryRecord = narrativeStableHostRenderEntryRecordsInternalV1.get(entry);
    if (entryRecord?.sessionRecord === record && entryRecord.attempt === attempt) return entry;
  }
  return null;
}

function findNarrativeStableHostActionBindingRecordInternalV1(
  record: NarrativeStableSessionRecordInternalV1,
  provenance: object,
): NarrativeStableHostCandidateActionBindingRecordInternalV1 | null {
  return record.actionBindingRecords.findLast((candidate) =>
    candidate.active && candidate.provenance === provenance
  ) ?? null;
}

function deriveNarrativeStableDialogueRenderEntryInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
  attempt: ManagedSurfaceStableRuntimeAttemptInternalV1,
  phase: "preparing" | "active" | "suspended",
): NarrativeStableHostRenderEntryInternalV1 | null {
  const targetRecord = narrativeTargetFrameRecordsInternalV1.get(
    attempt.desiredTarget.admittedTarget,
  );
  if (
    targetRecord === undefined ||
    targetRecord.bridgeIdentity !== record.bridgeRecord.bridgeIdentity
  ) {
    return null;
  }
  const frame = targetRecord.frame;
  const previous = findPreviousNarrativeStableHostRenderEntryInternalV1(record, attempt);
  const actionBindingGeneration = findNarrativeStableHostActionBindingRecordInternalV1(
    record,
    attempt,
  )?.bindingGeneration ?? null;
  const preparation = phase === "preparing"
    ? captureNarrativeStableRootPreparationInternalV1(session, record)
    : null;
  if (phase === "preparing" && preparation === null) return null;
  if (
    previous?.kind === "dialogue" && previous.phase === phase &&
    previous.preparation === preparation &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.frame === frame &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.actionBindingGeneration ===
      actionBindingGeneration
  ) {
    return previous;
  }
  const rendererProps = previous?.kind === "dialogue" &&
      narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.frame === frame
    ? previous.rendererProps
    : freezeNarrativePhysicalActionDataInternalV1({
      kind: "dialogue" as const,
      pending: frame.pending,
      visualConfig: frame.candidateSnapshot.visualConfig,
      playerProfile: frame.candidateSnapshot.playerProfile,
      textResolver: frame.candidateSnapshot.textResolver,
      quickMenuContribution: frame.candidateSnapshot.quickMenuContribution,
    });
  const focusPolicy = dialogueDefinitionInternalV1.focusPolicy;
  if (focusPolicy.kind !== "owns_focus") return null;
  const entry = freezeNarrativePhysicalActionDataInternalV1({
    kind: "dialogue" as const,
    phase,
    renderKey: previous?.renderKey ?? mintNarrativeStableHostRenderKeyInternalV1(record),
    preparation,
    initialFocusTargetId: focusPolicy.initialTargetId,
    rendererComponent: frame.candidateSnapshot.rendererComponent,
    rendererProps,
  });
  narrativeStableHostRenderEntryRecordsInternalV1.set(entry, {
    sessionRecord: record,
    attempt,
    frame,
    actionBindingGeneration,
  });
  return entry;
}

function createNarrativeStableHistoryRenderObservationInternalV1(
  capturedPort: NarrativeStableCapturedHistoryObservationPortInternalV1,
): NarrativeStableHistoryRenderObservationInternalV1 {
  const initialBinding = narrativeStableHistoryObservationPortBindingsInternalV1.get(capturedPort);
  if (initialBinding === undefined) {
    throw new TypeError("ui.narrative_stable_history_observation_invalid");
  }
  let observation!: NarrativeStableHistoryRenderObservationInternalV1;
  let record!: NarrativeStableHistoryRenderObservationRecordInternalV1;
  const refresh = (): boolean => {
    const binding = record.binding;
    if (!record.active || binding === null) return false;
    const raw = applyNarrativePhysicalActionInternalV1(
      binding.getSnapshot,
      binding.receiver,
      [],
    );
    const parsed = parseNarrativeHistoryV1(raw);
    const bytes = canonicalJsonBytes(parsed);
    if (record.currentBytes !== null && bytesEqualInternalV1(record.currentBytes, bytes)) {
      return false;
    }
    record.currentSnapshot = parsed;
    record.currentBytes = Uint8Array.from(bytes);
    return true;
  };
  observation = freezeNarrativePhysicalActionDataInternalV1({
    getSnapshotInternalV1(
      this: NarrativeStableHistoryRenderObservationInternalV1,
    ): DeepReadonly<NarrativeHistoryV1> {
      if (
        this !== observation ||
        narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation) !== record
      ) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      if (record.active) refresh();
      if (record.currentSnapshot === null) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      return record.currentSnapshot;
    },
    subscribeInternalV1(
      this: NarrativeStableHistoryRenderObservationInternalV1,
      listener: () => void,
    ): () => void {
      if (
        this !== observation ||
        narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation) !== record ||
        typeof listener !== "function"
      ) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      if (!record.active) {
        return freezeNarrativePhysicalActionDataInternalV1((): void => {});
      }
      refresh();
      record.listeners.add(listener);
      const holder: { listener: (() => void) | null } = { listener };
      record.listenerHolders.add(holder);
      if (record.unsubscribeRaw === null) {
        const rawListener = (): void => {
          if (!record.active) return;
          let changed = false;
          try {
            changed = refresh();
          } catch {
            changed = true;
          }
          if (!changed) return;
          for (
            const current of freezeNarrativePhysicalActionDataInternalV1([
              ...record.listeners,
            ])
          ) {
            try {
              current();
            } catch {
              // Observation subscribers are isolated after canonical refresh.
            }
          }
        };
        const binding = record.binding;
        if (binding === null) {
          record.listeners.delete(listener);
          holder.listener = null;
          record.listenerHolders.delete(holder);
          return freezeNarrativePhysicalActionDataInternalV1((): void => {});
        }
        const unsubscribe = applyNarrativePhysicalActionInternalV1(
          binding.subscribe,
          binding.receiver,
          [rawListener],
        );
        if (typeof unsubscribe !== "function") {
          record.listeners.delete(listener);
          holder.listener = null;
          record.listenerHolders.delete(holder);
          throw new TypeError("ui.narrative_stable_history_observation_invalid");
        }
        record.unsubscribeRaw = unsubscribe as () => void;
      }
      let active = true;
      return freezeNarrativePhysicalActionDataInternalV1((): void => {
        if (!active) return;
        active = false;
        const retainedListener = holder.listener;
        holder.listener = null;
        record.listenerHolders.delete(holder);
        if (retainedListener !== null) record.listeners.delete(retainedListener);
      });
    },
  });
  record = {
    binding: initialBinding,
    listeners: new Set(),
    listenerHolders: new Set(),
    currentSnapshot: null,
    currentBytes: null,
    unsubscribeRaw: null,
    active: true,
  };
  narrativeStableHistoryRenderObservationRecordsInternalV1.set(observation, record);
  return observation;
}

function retireNarrativeStableHistoryRenderObservationInternalV1(
  observation: NarrativeStableHistoryRenderObservationInternalV1,
): void {
  const record = narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation);
  if (record === undefined || !record.active) return;
  record.active = false;
  record.binding = null;
  record.listeners.clear();
  for (const holder of record.listenerHolders) holder.listener = null;
  record.listenerHolders.clear();
  const unsubscribe = record.unsubscribeRaw;
  record.unsubscribeRaw = null;
  if (unsubscribe === null) return;
  try {
    applyNarrativePhysicalActionInternalV1(unsubscribe, undefined, []);
  } catch {
    // The retired observation stays fenced when raw cleanup is hostile.
  }
}

function deriveNarrativeStableHistoryRenderEntryInternalV1(
  record: NarrativeStableSessionRecordInternalV1,
  rootEntries: readonly NarrativeStableHostRenderEntryInternalV1[],
): NarrativeStableHostRenderEntryInternalV1 | null {
  const preparationRecord = record.bridgeRecord.currentHistoryCandidateRecord;
  if (preparationRecord?.candidate === null || preparationRecord === null) return null;
  const state = record.bridgeRecord.compositeRuntimeKernel.getStateInternalV1();
  const parentIds = new Set<string>();
  for (const stableEntry of state.stableRuntimeBindings) {
    if (
      stableEntry.binding.kind === "ready_instance" &&
      matchesNarrativeStableHistoryParentAttemptInternalV1(
        stableEntry.binding.instance.attempt,
        preparationRecord,
      )
    ) {
      parentIds.add(stableEntry.binding.instance.attempt.identity.surfaceInstanceId);
    } else if (
      stableEntry.binding.kind !== "ready_instance" &&
      stableEntry.binding.retainedSubtree !== null &&
      matchesNarrativeStableHistoryParentAttemptInternalV1(
        stableEntry.binding.retainedSubtree.root.attempt,
        preparationRecord,
      )
    ) {
      parentIds.add(stableEntry.binding.retainedSubtree.root.attempt.identity.surfaceInstanceId);
    }
  }
  const children = state.transientState.publication.orderedInstances.filter((instance) =>
    instance.definition.definitionId === historyDefinitionIdInternalV1 &&
    instance.parentInstanceId !== null && parentIds.has(instance.parentInstanceId)
  );
  if (children.length !== 1) {
    const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(
      preparationRecord.controller,
    );
    if (controllerRecord?.preparationRecord === preparationRecord) {
      controllerRecord.preparationRecord = null;
    }
    record.bridgeRecord.currentHistoryCandidateRecord = null;
    return null;
  }
  const child = children[0]!;
  const phase = child.readiness.kind === "preparing"
    ? "preparing"
    : child.phase === "active" || child.phase === "suspended"
    ? child.phase
    : null;
  if (phase === null) return null;
  const preparation = phase === "preparing" &&
      record.bridgeRecord.currentHistoryPreparation !== null &&
      narrativeStableHistoryChildPreparationRecordsInternalV1.get(
          record.bridgeRecord.currentHistoryPreparation,
        ) === preparationRecord
    ? record.bridgeRecord.currentHistoryPreparation
    : null;
  if (phase === "preparing" && preparation === null) return null;
  const frame = preparationRecord.intentRecord.frame;
  const previous = findPreviousNarrativeStableHostRenderEntryInternalV1(
    record,
    preparationRecord.candidate,
  );
  const actionBindingGeneration = findNarrativeStableHostActionBindingRecordInternalV1(
    record,
    preparationRecord.candidate,
  )?.bindingGeneration ?? null;
  const parent = rootEntries.find((entry) =>
    entry.kind === "dialogue" &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(entry)?.frame === frame
  );
  if (parent?.kind !== "dialogue") return null;
  if (
    previous?.kind === "history" && previous.phase === phase &&
    previous.preparation === preparation && previous.parentRenderKey === parent.renderKey &&
    previous.controller === preparationRecord.controller &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.actionBindingGeneration ===
      actionBindingGeneration
  ) return previous;
  const rendererProps = previous?.kind === "history"
    ? previous.rendererProps
    : freezeNarrativePhysicalActionDataInternalV1({
      kind: "history" as const,
      visualConfig: frame.candidateSnapshot.visualConfig,
      playerProfile: frame.candidateSnapshot.playerProfile,
      textResolver: frame.candidateSnapshot.textResolver,
    });
  const historyObservation = previous?.kind === "history"
    ? previous.historyObservation
    : createNarrativeStableHistoryRenderObservationInternalV1(
      frame.candidateSnapshot.historyObservationPort,
    );
  const focusPolicy = historyDefinitionInternalV1.focusPolicy;
  if (focusPolicy.kind !== "owns_focus") return null;
  const entry = freezeNarrativePhysicalActionDataInternalV1({
    kind: "history" as const,
    phase,
    renderKey: previous?.renderKey ?? mintNarrativeStableHostRenderKeyInternalV1(record),
    parentRenderKey: parent.renderKey,
    preparation,
    initialFocusTargetId: focusPolicy.initialTargetId,
    rendererComponent: frame.candidateSnapshot.rendererComponent,
    rendererProps,
    historyObservation,
    controller: preparationRecord.controller,
  });
  narrativeStableHostRenderEntryRecordsInternalV1.set(entry, {
    sessionRecord: record,
    attempt: preparationRecord.candidate,
    frame,
    actionBindingGeneration,
  });
  return entry;
}

function retireNarrativeStableHostCandidateActionBindingInternalV1(
  record: NarrativeStableHostCandidateActionBindingRecordInternalV1,
): void {
  const prepared = record.prepared;
  const claimedRoute = record.claimedRoute;
  const runtimeRecord = record.runtimeRecord;
  const sessionRecord = record.sessionRecord;
  if (sessionRecord?.currentHostFocusOwnership === record) {
    sessionRecord.currentHostFocusOwnership = null;
  }
  if (runtimeRecord !== null) {
    for (const readyRecord of [...runtimeRecord.readyCommits]) {
      if (readyRecord.actionBindingRecord === record) {
        retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
      }
    }
  }
  record.active = false;
  record.committed = false;
  record.delegate = null;
  record.prepared = null;
  record.claimedRoute = null;
  record.binding = null;
  record.focusTargetId = null;
  record.focusAttachment = null;
  record.authority = null;
  record.provenance = null;
  record.inputRouter = null;
  record.isGestureCurrent = null;
  record.runtimeRecord = null;
  record.sessionRecord = null;
  try {
    prepared?.abortInternalV1();
  } catch {
    // Candidate retirement remains fenced when a prepared handle is hostile.
  }
  try {
    claimedRoute?.disposeInternalV1();
  } catch {
    // The generic binding phase is already fail closed.
  }
}

function commitNarrativeStableHostCandidateActionBindingInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
  record: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
  readyRecord: NarrativeStableHostReadyCommitRecordInternalV1 | null = null,
): boolean {
  if (
    contract === null || !runtimeRecord.active || !record.active || record.committed ||
    record.runtimeRecord !== runtimeRecord ||
    runtimeRecord.sessionRecord.currentHostRuntime !== runtimeRecord
  ) return false;
  let focusTargetId: ManagedSurfaceFocusTargetIdV1 | null = null;
  let focusAttachment: NarrativeStableHostFocusAttachmentRecordInternalV1 | null = null;
  if (readyRecord !== null) {
    if (
      readyRecord.focusTargetId === null || readyRecord.focusAttachment === null ||
      readyRecord.actionBindingRecord !== record ||
      runtimeRecord.sessionRecord.currentHostFocusOwnership !==
        readyRecord.expectedFocusOwnership
    ) return false;
    focusTargetId = readyRecord.focusTargetId;
    focusAttachment = readyRecord.focusAttachment;
  }
  const prepared = record.prepared;
  if (prepared === null || !prepared.commitInternalV1(contract)) return false;
  const binding = prepared.getBindingInternalV1();
  if (binding === null) return false;
  record.prepared = null;
  record.binding = binding;
  record.committed = true;
  if (record.kind === "root") {
    const bridgeRecord = runtimeRecord.sessionRecord.bridgeRecord;
    const predecessor = bridgeRecord.currentHostRootActionBinding;
    if (focusTargetId === null && predecessor !== null) {
      focusTargetId = predecessor.focusTargetId;
      focusAttachment = predecessor.focusAttachment;
    }
    record.focusTargetId = focusTargetId;
    record.focusAttachment = focusAttachment;
    if (focusTargetId !== null) {
      runtimeRecord.sessionRecord.currentHostFocusOwnership = record;
    }
    if (predecessor !== null && predecessor !== record) {
      retireNarrativeStableHostCandidateActionBindingInternalV1(predecessor);
    }
    bridgeRecord.currentHostRootActionBinding = record;
    bridgeRecord.hostPhysicalActionAdmission = null;
    bridgeRecord.physicalActionAdmissionClaim = record.admissionClaim;
  } else {
    record.focusTargetId = focusTargetId;
    record.focusAttachment = focusAttachment;
    if (focusTargetId !== null) {
      runtimeRecord.sessionRecord.currentHostFocusOwnership = record;
    }
    const bridgeRecord = runtimeRecord.sessionRecord.bridgeRecord;
    bridgeRecord.hostPhysicalActionAdmission = null;
    bridgeRecord.physicalActionAdmissionClaim = record.admissionClaim;
  }
  runtimeRecord.fallbackInputEntry = null;
  return true;
}

function claimNarrativeStableHostCandidateActionRouteInternalV1(
  record: NarrativeStableHostCandidateActionBindingRecordInternalV1,
  prepared: ManagedSurfacePreparedContractBoundActionBindingInternalV1,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<
  unknown,
  NarrativeStablePhysicalActionDispatchResultInternalV1
> {
  return claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1<
    unknown,
    NarrativeStablePhysicalActionDispatchResultInternalV1
  >(
    prepared,
    (input): NarrativeStablePhysicalActionDispatchResultInternalV1 => {
      const currentRuntimeRecord = record.runtimeRecord;
      if (
        !record.active || !record.committed || currentRuntimeRecord === null ||
        !currentRuntimeRecord.active ||
        currentRuntimeRecord.sessionRecord.currentHostRuntime !== currentRuntimeRecord
      ) return narrativePhysicalActionStaleResultInternalV1;
      const delegate = record.delegate;
      return delegate === null ? narrativePhysicalActionStaleResultInternalV1 : delegate(input);
    },
  );
}

function prepareNarrativeStableHostCandidateActionBindingInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
  kind: "root" | "history",
  provenance: object,
  forceSuccessor = false,
): NarrativeStableHostCandidateActionBindingRecordInternalV1 {
  const sessionRecord = runtimeRecord.sessionRecord;
  const retained = findNarrativeStableHostActionBindingRecordInternalV1(
    sessionRecord,
    provenance,
  );
  if (retained !== null && !forceSuccessor) {
    if (retained.runtimeRecord === runtimeRecord || retained.committed) {
      retained.runtimeRecord = runtimeRecord;
      return retained;
    }
    retireNarrativeStableHostCandidateActionBindingInternalV1(retained);
  } else if (retained !== null && !retained.committed) {
    retireNarrativeStableHostCandidateActionBindingInternalV1(retained);
  }
  const kernel = sessionRecord.bridgeRecord.compositeRuntimeKernel;
  const authority = kind === "root"
    ? claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel)
    : narrativeStableHistoryChildFamilyClaimsInternalV1.get(kernel)?.actionAuthority;
  if (authority === undefined) {
    throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  }
  const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
    authority,
    inputContextId: "narrative",
    inputRouter: runtimeRecord.inputRouter,
    isGestureCurrent: runtimeRecord.isGestureCurrent,
  });
  const record: NarrativeStableHostCandidateActionBindingRecordInternalV1 = {
    kind,
    sessionRecord,
    provenance,
    authority,
    admissionClaim: freezeNarrativePhysicalActionDataInternalV1({}),
    bindingGeneration: freezeNarrativePhysicalActionDataInternalV1({}),
    inputRouter: runtimeRecord.inputRouter,
    isGestureCurrent: runtimeRecord.isGestureCurrent,
    runtimeRecord,
    prepared,
    claimedRoute: null,
    binding: null,
    focusTargetId: null,
    focusAttachment: null,
    delegate: null,
    active: true,
    committed: false,
  };
  try {
    record.claimedRoute = claimNarrativeStableHostCandidateActionRouteInternalV1(
      record,
      prepared,
    );
    if (kind === "history") {
      const preparationRecord = sessionRecord.bridgeRecord.currentHistoryCandidateRecord;
      if (preparationRecord?.candidate === provenance) {
        const controller = preparationRecord.controller;
        record.delegate = (input): NarrativeStablePhysicalActionDispatchResultInternalV1 => {
          if (input.attempt !== null) return narrativePhysicalActionStaleResultInternalV1;
          if (input.actionId === narrativeToggleHistoryActionIdInternalV1) {
            return controller.closeInternalV1();
          }
          if (input.actionId === narrativeCancelActionIdInternalV1) {
            return controller.dismissInternalV1("routed_cancel");
          }
          return narrativePhysicalActionStaleResultInternalV1;
        };
      }
    }
  } catch (error) {
    prepared.abortInternalV1();
    throw error;
  }
  sessionRecord.actionBindingRecords = sessionRecord.actionBindingRecords.filter((candidate) =>
    candidate.active &&
    (candidate !== retained || (forceSuccessor && retained.committed))
  );
  sessionRecord.actionBindingRecords.push(record);
  return record;
}

function prepareNarrativeStableHostRootRestorationActionBindingInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
): NarrativeStableHostCandidateActionBindingRecordInternalV1 | null {
  const retainedRoot = runtimeRecord.sessionRecord.currentRenderSnapshot.entries.find((entry) =>
    entry.kind === "dialogue" && (entry.phase === "active" || entry.phase === "suspended")
  );
  if (retainedRoot === undefined) return null;
  const provenance = narrativeStableHostRenderEntryRecordsInternalV1.get(retainedRoot)?.attempt;
  return provenance === undefined
    ? null
    : prepareNarrativeStableHostCandidateActionBindingInternalV1(
      runtimeRecord,
      "root",
      provenance,
      true,
    );
}

function ensureNarrativeStableHostCandidateActionBindingsInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
): void {
  if (!runtimeRecord.active) return;
  const sessionRecord = runtimeRecord.sessionRecord;
  for (const entry of sessionRecord.currentRenderSnapshot.entries) {
    if (entry.phase !== "preparing") continue;
    const entryRecord = narrativeStableHostRenderEntryRecordsInternalV1.get(entry);
    const provenance = entryRecord?.attempt;
    if (provenance === undefined) continue;
    prepareNarrativeStableHostCandidateActionBindingInternalV1(
      runtimeRecord,
      entry.kind === "dialogue" ? "root" : "history",
      provenance,
    );
  }
}

function reconcileNarrativeStableHostCandidateActionBindingsInternalV1(
  sessionRecord: NarrativeStableSessionRecordInternalV1,
): void {
  const liveProvenances = new Set<object>();
  for (const entry of sessionRecord.currentRenderSnapshot.entries) {
    const provenance = narrativeStableHostRenderEntryRecordsInternalV1.get(entry)?.attempt;
    if (provenance !== undefined) liveProvenances.add(provenance);
  }
  const retained = new Set<NarrativeStableHostCandidateActionBindingRecordInternalV1>();
  const retainedProvenances = new Set<object>();
  for (const candidate of sessionRecord.actionBindingRecords.toReversed()) {
    const provenance = candidate.provenance;
    if (
      !candidate.active || provenance === null || !liveProvenances.has(provenance) ||
      retainedProvenances.has(provenance)
    ) continue;
    retained.add(candidate);
    retainedProvenances.add(provenance);
  }
  for (const candidate of sessionRecord.actionBindingRecords) {
    if (!retained.has(candidate)) {
      retireNarrativeStableHostCandidateActionBindingInternalV1(candidate);
    }
  }
  sessionRecord.actionBindingRecords = sessionRecord.actionBindingRecords.filter((candidate) =>
    retained.has(candidate) && candidate.active
  );
}

function freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
): void {
  for (const record of [...runtimeRecord.sessionRecord.actionBindingRecords]) {
    if (!record.committed) retireNarrativeStableHostCandidateActionBindingInternalV1(record);
  }
  runtimeRecord.sessionRecord.actionBindingRecords = runtimeRecord.sessionRecord
    .actionBindingRecords.filter((record) => record.active);
  ensureNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
  reconcileNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord.sessionRecord);
}

function refreshNarrativeStableHostRenderSnapshotInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
): boolean {
  const entries: NarrativeStableHostRenderEntryInternalV1[] = [];
  if (!record.terminal && record.bridgeRecord.active) {
    const state = record.bridgeRecord.compositeRuntimeKernel.getStateInternalV1();
    for (const stableEntry of state.stableRuntimeBindings) {
      const binding = stableEntry.binding;
      if (binding.kind === "ready_instance") {
        const entry = deriveNarrativeStableDialogueRenderEntryInternalV1(
          session,
          record,
          binding.instance.attempt,
          binding.instance.phase,
        );
        if (entry !== null) entries.push(entry);
        continue;
      }
      if (binding.retainedSubtree !== null) {
        const retained = deriveNarrativeStableDialogueRenderEntryInternalV1(
          session,
          record,
          binding.retainedSubtree.root.attempt,
          binding.retainedSubtree.root.phase,
        );
        if (retained !== null) entries.push(retained);
      }
      if (binding.kind === "preparing") {
        const candidate = deriveNarrativeStableDialogueRenderEntryInternalV1(
          session,
          record,
          binding.attempt,
          "preparing",
        );
        if (candidate !== null) entries.push(candidate);
      }
    }
    const history = deriveNarrativeStableHistoryRenderEntryInternalV1(record, entries);
    if (history?.kind === "history") {
      const parentIndex = entries.findIndex((entry) => entry.renderKey === history.parentRenderKey);
      if (parentIndex >= 0) entries.splice(parentIndex + 1, 0, history);
    }
  }
  const previousEntries = record.currentRenderSnapshot.entries;
  if (
    previousEntries.length === entries.length &&
    previousEntries.every((entry, index) => entry === entries[index])
  ) {
    return false;
  }
  for (const previous of previousEntries) {
    if (!entries.includes(previous)) {
      if (
        previous.preparation !== null &&
        !entries.some((entry) => entry.preparation === previous.preparation)
      ) {
        if (previous.kind === "dialogue") {
          narrativeStableRootPreparationRecordsInternalV1.delete(previous.preparation);
        } else {
          narrativeStableHistoryChildPreparationRecordsInternalV1.delete(previous.preparation);
        }
      }
      if (
        previous.kind === "history" &&
        !entries.some((entry) =>
          entry.kind === "history" && entry.historyObservation === previous.historyObservation
        )
      ) {
        retireNarrativeStableHistoryRenderObservationInternalV1(previous.historyObservation);
      }
      if (
        previous.kind === "history" &&
        !entries.some((entry) =>
          entry.kind === "history" && entry.controller === previous.controller
        )
      ) {
        const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(
          previous.controller,
        );
        const preparationRecord = controllerRecord?.preparationRecord ?? null;
        if (
          controllerRecord !== undefined &&
          preparationRecord?.controller === previous.controller
        ) {
          controllerRecord.preparationRecord = null;
        }
      }
      narrativeStableHostRenderEntryRecordsInternalV1.delete(previous);
    }
  }
  record.currentRenderSnapshot = createNarrativeStableHostRenderSnapshotInternalV1(entries);
  return true;
}

function notifyNarrativeStableHostRenderStateInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
): void {
  let changed = false;
  try {
    changed = refreshNarrativeStableHostRenderSnapshotInternalV1(session, record);
    const runtimeRecord = record.currentHostRuntime;
    if (runtimeRecord !== null && runtimeRecord.active) {
      ensureNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
      changed = refreshNarrativeStableHostRenderSnapshotInternalV1(session, record) || changed;
      reconcileNarrativeStableHostCandidateActionBindingsInternalV1(record);
      reconcileNarrativeStableHostFallbackInputInternalV1(runtimeRecord);
    }
  } catch {
    // Wake the current Host so its getSnapshot/render boundary observes the fault.
    changed = true;
  }
  if (!changed) return;
  const listeners = freezeNarrativePhysicalActionDataInternalV1([...record.renderListeners]);
  for (const listener of listeners) {
    if (record.terminal || !record.bridgeRecord.active) break;
    try {
      listener();
    } catch {
      // Render-source subscribers are isolated after the state install.
    }
  }
}

function matchesNarrativeStableHistoryParentAttemptInternalV1(
  attempt: ManagedSurfaceStableRuntimeAttemptInternalV1,
  preparationRecord: NarrativeStableHistoryChildPreparationRecordInternalV1,
): boolean {
  return attempt.desiredTarget.admittedTarget === preparationRecord.intentRecord.directParent &&
    attempt.desiredTarget.sourceRevision === preparationRecord.intentRecord.sourceRevision;
}

function captureNarrativeStableRootPreparationInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
): NarrativeStableRootPreparationInternalV1 | null {
  const current = record.bridgeRecord.captureCurrentTargetInternalV1();
  if (current === null) {
    record.currentRootAttempt = null;
    record.currentRootPreparation = null;
    return null;
  }
  const runtimeEntry = record.bridgeRecord.compositeRuntimeKernel.getStateInternalV1()
    .stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget === current.target &&
      entry.desiredTarget.sourceRevision === current.sourceRevision
    );
  if (runtimeEntry?.binding.kind !== "preparing") {
    record.currentRootAttempt = null;
    record.currentRootPreparation = null;
    return null;
  }
  const attempt = runtimeEntry.binding.attempt;
  if (
    record.currentRootAttempt === attempt &&
    record.currentRootPreparation !== null
  ) {
    return record.currentRootPreparation;
  }
  const preparation = freezeNarrativePhysicalActionDataInternalV1(
    {},
  ) as NarrativeStableRootPreparationInternalV1;
  narrativeStableRootPreparationRecordsInternalV1.set(
    preparation,
    freezeNarrativePhysicalActionDataInternalV1({
      session,
      bridgeRecord: record.bridgeRecord,
      attempt,
      target: current.target,
      sourceRevision: current.sourceRevision,
      frame: current.frame,
    }),
  );
  record.currentRootAttempt = attempt;
  record.currentRootPreparation = preparation;
  return preparation;
}

function captureNarrativeStableHistoryPreparationInternalV1(
  record: NarrativeStableSessionRecordInternalV1,
): NarrativeStableHistoryChildPreparationInternalV1 | null {
  const preparation = record.bridgeRecord.currentHistoryPreparation;
  if (preparation === null) return null;
  const preparationRecord = narrativeStableHistoryChildPreparationRecordsInternalV1.get(
    preparation,
  );
  if (
    preparationRecord === undefined || preparationRecord.candidate === null ||
    preparationRecord.lifecycle !== record.historyChildLifecycle ||
    preparationRecord.lifecycleRecord.bridgeRecord !== record.bridgeRecord
  ) {
    if (record.bridgeRecord.currentHistoryPreparation === preparation) {
      record.bridgeRecord.currentHistoryPreparation = null;
    }
    return null;
  }

  const state = record.bridgeRecord.compositeRuntimeKernel.getStateInternalV1();
  const parentInstanceIds = new Set<string>();
  for (const entry of state.stableRuntimeBindings) {
    if (
      entry.binding.kind === "ready_instance" &&
      matchesNarrativeStableHistoryParentAttemptInternalV1(
        entry.binding.instance.attempt,
        preparationRecord,
      )
    ) {
      parentInstanceIds.add(entry.binding.instance.attempt.identity.surfaceInstanceId);
      continue;
    }
    const retainedRoot = entry.binding.kind === "preparing" || entry.binding.kind === "gap"
      ? entry.binding.retainedSubtree?.root ?? null
      : null;
    if (
      retainedRoot !== null &&
      matchesNarrativeStableHistoryParentAttemptInternalV1(
        retainedRoot.attempt,
        preparationRecord,
      )
    ) {
      parentInstanceIds.add(retainedRoot.attempt.identity.surfaceInstanceId);
    }
  }
  const matchingChildren = state.transientState.publication.orderedInstances.filter((instance) =>
    instance.definition.definitionId === historyDefinitionIdInternalV1 &&
    instance.parentInstanceId !== null &&
    parentInstanceIds.has(instance.parentInstanceId) &&
    instance.readiness.kind === "preparing" &&
    instance.readiness.transition === "child_open"
  );
  const current = matchingChildren.length === 1;
  if (!current) {
    if (record.bridgeRecord.currentHistoryPreparation === preparation) {
      record.bridgeRecord.currentHistoryPreparation = null;
    }
    return null;
  }
  return preparation;
}

function refreshNarrativeStableSessionSnapshotInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
): boolean {
  const previousSnapshot = record.currentSnapshot;
  if (
    !record.terminal &&
    terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(record.bridgeRecord)
  ) {
    return record.currentSnapshot !== previousSnapshot;
  }
  let rootPreparation: NarrativeStableRootPreparationInternalV1 | null = null;
  let historyPreparation: NarrativeStableHistoryChildPreparationInternalV1 | null = null;
  if (!record.terminal && record.bridgeRecord.active) {
    try {
      rootPreparation = captureNarrativeStableRootPreparationInternalV1(session, record);
      historyPreparation = captureNarrativeStableHistoryPreparationInternalV1(record);
    } catch {
      rootPreparation = null;
      historyPreparation = null;
      record.currentRootAttempt = null;
      record.currentRootPreparation = null;
    }
  }

  const rootEntry = rootPreparation === null
    ? null
    : record.currentRootEntry?.preparation === rootPreparation
    ? record.currentRootEntry
    : freezeNarrativePhysicalActionDataInternalV1({
      kind: "root" as const,
      preparation: rootPreparation,
    });
  const historyEntry = historyPreparation === null
    ? null
    : record.currentHistoryEntry?.preparation === historyPreparation
    ? record.currentHistoryEntry
    : freezeNarrativePhysicalActionDataInternalV1({
      kind: "history" as const,
      preparation: historyPreparation,
    });
  record.currentRootEntry = rootEntry;
  record.currentHistoryEntry = historyEntry;

  const previousEntries = record.currentSnapshot.entries;
  const nextEntries = rootEntry === null
    ? historyEntry === null ? [] : [historyEntry]
    : historyEntry === null
    ? [rootEntry]
    : [rootEntry, historyEntry];
  if (
    previousEntries.length === nextEntries.length &&
    previousEntries.every((entry, index) => entry === nextEntries[index])
  ) {
    return false;
  }
  record.currentSnapshot = createNarrativeStableReadinessSnapshotInternalV1(nextEntries);
  return true;
}

function notifyNarrativeStableSessionStateInternalV1(
  session: NarrativeStableSessionInternalV1,
  record: NarrativeStableSessionRecordInternalV1,
): void {
  if (record.terminal || !record.bridgeRecord.active) return;
  refreshNarrativeStableSessionSnapshotInternalV1(session, record);
  notifyNarrativeStableHostRenderStateInternalV1(session, record);
  if (record.currentSnapshot === record.lastNotifiedSnapshot) return;
  record.lastNotifiedSnapshot = record.currentSnapshot;
  const listeners = freezeNarrativePhysicalActionDataInternalV1([...record.listeners]);
  for (const listener of listeners) {
    if (record.terminal || !record.bridgeRecord.active) break;
    try {
      listener();
    } catch {
      // Session subscribers are isolated after the composite transition commits.
    }
  }
}

function terminalizeNarrativeStableSessionInternalV1(
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1,
): void {
  const historyCandidateRecord = bridgeRecord.currentHistoryCandidateRecord;
  if (historyCandidateRecord !== null) {
    const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(
      historyCandidateRecord.controller,
    );
    if (controllerRecord?.preparationRecord === historyCandidateRecord) {
      controllerRecord.preparationRecord = null;
    }
  }
  bridgeRecord.currentHistoryPreparation = null;
  bridgeRecord.currentHistoryCandidateRecord = null;
  const session = bridgeRecord.session;
  if (session === null) return;
  const record = narrativeStableSessionRecordsInternalV1.get(session);
  if (record === undefined || record.terminal) return;
  record.terminal = true;
  record.currentRootAttempt = null;
  record.currentRootPreparation = null;
  record.currentRootEntry = null;
  record.currentHistoryEntry = null;
  const renderListeners = freezeNarrativePhysicalActionDataInternalV1([
    ...record.renderListeners,
  ]);
  for (const entry of record.currentRenderSnapshot.entries) {
    if (entry.preparation !== null) {
      if (entry.kind === "dialogue") {
        narrativeStableRootPreparationRecordsInternalV1.delete(entry.preparation);
      } else {
        narrativeStableHistoryChildPreparationRecordsInternalV1.delete(entry.preparation);
      }
    }
    if (entry.kind === "history") {
      retireNarrativeStableHistoryRenderObservationInternalV1(entry.historyObservation);
      const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(
        entry.controller,
      );
      if (controllerRecord?.preparationRecord?.controller === entry.controller) {
        controllerRecord.preparationRecord = null;
      }
    }
    narrativeStableHostRenderEntryRecordsInternalV1.delete(entry);
  }
  for (const actionBindingRecord of record.actionBindingRecords) {
    retireNarrativeStableHostCandidateActionBindingInternalV1(actionBindingRecord);
  }
  record.actionBindingRecords = [];
  record.currentHostFocusOwnership = null;
  bridgeRecord.currentHostRootActionBinding = null;
  bridgeRecord.hostPhysicalActionAdmission = null;
  bridgeRecord.physicalActionAdmissionClaim = null;
  if (record.currentSnapshot.entries.length !== 0) {
    record.currentSnapshot = createNarrativeStableReadinessSnapshotInternalV1([]);
  }
  record.lastNotifiedSnapshot = record.currentSnapshot;
  if (record.currentRenderSnapshot.entries.length !== 0) {
    record.currentRenderSnapshot = createNarrativeStableHostRenderSnapshotInternalV1([]);
  }
  if (record.renderSource !== null) {
    const sourceRecord = narrativeStableHostRenderSourceRecordsInternalV1.get(record.renderSource);
    if (sourceRecord !== undefined) {
      sourceRecord.terminalSnapshot = record.currentRenderSnapshot;
      sourceRecord.session = null;
      sourceRecord.sessionRecord = null;
      for (const holder of sourceRecord.listenerHolders) holder.listener = null;
      sourceRecord.listenerHolders.clear();
    }
  }
  const currentLease = record.currentHostLease;
  if (currentLease !== null) currentLease.active = false;
  record.currentHostLease = null;
  if (record.currentHostRuntime !== null) {
    retireNarrativeStableHostRuntimeExposureInternalV1(record.currentHostRuntime);
  }
  record.currentHostRuntime = null;
  record.listeners.clear();
  record.renderListeners.clear();
  if (!record.subscribed) return;
  record.subscribed = false;
  try {
    record.unsubscribeStateInternalV1();
  } catch {
    // Terminal fencing remains exact when an unsubscribe wrapper throws.
  }
  for (const listener of renderListeners) {
    try {
      listener();
    } catch {
      // Terminal render publication is best-effort after authority is fenced.
    }
  }
}

function terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1,
): boolean {
  if (!bridgeRecord.active) return true;
  let disposed = true;
  try {
    disposed = bridgeRecord.compositeRuntimeKernel.getStateInternalV1().transientState.publication
      .coordinatorDisposed;
  } catch {
    // An unreadable composition is terminal for every session ingress.
  }
  if (!disposed) return false;
  bridgeRecord.active = false;
  terminalizeNarrativeStableSessionInternalV1(bridgeRecord);
  return true;
}

export function createNarrativeStableSessionInternalV1(
  input: Readonly<{ readonly bridge: NarrativeStablePublisherBridgeInternalV1 }>,
): NarrativeStableSessionInternalV1 {
  let bridge: unknown;
  try {
    if ((typeof input !== "object" && typeof input !== "function") || input === null) {
      throw new TypeError("ui.narrative_stable_session_invalid");
    }
    const keys = Reflect.ownKeys(input);
    const descriptor = Reflect.getOwnPropertyDescriptor(input, "bridge");
    if (
      keys.length !== 1 || keys[0] !== "bridge" || descriptor === undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError("ui.narrative_stable_session_invalid");
    }
    bridge = descriptor.value;
  } catch {
    throw new TypeError("ui.narrative_stable_session_invalid");
  }
  if ((typeof bridge !== "object" && typeof bridge !== "function") || bridge === null) {
    throw new TypeError("ui.narrative_stable_session_invalid");
  }
  const exactBridge = bridge as NarrativeStablePublisherBridgeInternalV1;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(exactBridge);
  if (
    bridgeRecord === undefined || !bridgeRecord.active ||
    terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(bridgeRecord)
  ) {
    throw new TypeError("ui.narrative_stable_session_invalid");
  }
  if (bridgeRecord.session !== null) return bridgeRecord.session;

  let historyChildLifecycle: NarrativeStableHistoryChildLifecycleInternalV1;
  try {
    historyChildLifecycle = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: exactBridge,
    });
  } catch {
    throw new TypeError("ui.narrative_stable_session_invalid");
  }

  let session!: NarrativeStableSessionInternalV1;
  let sessionRecord!: NarrativeStableSessionRecordInternalV1;
  session = freezeNarrativePhysicalActionDataInternalV1({
    getReadinessSnapshotInternalV1(
      this: NarrativeStableSessionInternalV1,
    ): NarrativeStableReadinessSnapshotInternalV1 {
      if (
        this !== session || narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord
      ) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      refreshNarrativeStableSessionSnapshotInternalV1(session, sessionRecord);
      return sessionRecord.currentSnapshot;
    },

    subscribeInternalV1(
      this: NarrativeStableSessionInternalV1,
      listener: () => void,
    ): () => void {
      if (
        this !== session ||
        narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord ||
        typeof listener !== "function"
      ) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      if (
        sessionRecord.terminal || !sessionRecord.bridgeRecord.active ||
        terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(
          sessionRecord.bridgeRecord,
        )
      ) {
        return freezeNarrativePhysicalActionDataInternalV1((): void => {});
      }
      sessionRecord.listeners.add(listener);
      let subscribed = true;
      return freezeNarrativePhysicalActionDataInternalV1((): void => {
        if (!subscribed) return;
        subscribed = false;
        sessionRecord.listeners.delete(listener);
      });
    },

    getHistoryChildLifecycleInternalV1(
      this: NarrativeStableSessionInternalV1,
    ): NarrativeStableHistoryChildLifecycleInternalV1 {
      if (
        this !== session || narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord
      ) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      return sessionRecord.historyChildLifecycle;
    },

    attachHostInternalV1(
      this: NarrativeStableSessionInternalV1,
      attachmentInput: Readonly<{ readonly hostIdentity: object }>,
    ): NarrativeStableHostLeaseInternalV1 {
      if (
        this !== session || narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord
      ) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      let hostIdentity: unknown;
      try {
        if (
          (typeof attachmentInput !== "object" && typeof attachmentInput !== "function") ||
          attachmentInput === null
        ) {
          throw new TypeError("ui.narrative_stable_host_attachment_invalid");
        }
        const keys = Reflect.ownKeys(attachmentInput);
        const descriptor = Reflect.getOwnPropertyDescriptor(attachmentInput, "hostIdentity");
        if (
          keys.length !== 1 || keys[0] !== "hostIdentity" || descriptor === undefined ||
          !("value" in descriptor)
        ) {
          throw new TypeError("ui.narrative_stable_host_attachment_invalid");
        }
        hostIdentity = descriptor.value;
      } catch {
        throw new TypeError("ui.narrative_stable_host_attachment_invalid");
      }
      if (
        (typeof hostIdentity !== "object" && typeof hostIdentity !== "function") ||
        hostIdentity === null || sessionRecord.terminal || !sessionRecord.bridgeRecord.active
      ) {
        throw new TypeError("ui.narrative_stable_host_attachment_invalid");
      }
      const predecessor = sessionRecord.currentHostLease;
      if (predecessor !== null && predecessor.hostIdentity !== hostIdentity) {
        throw new TypeError("ui.narrative_stable_host_lease_conflict");
      }
      if (
        terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(
          sessionRecord.bridgeRecord,
        )
      ) {
        throw new TypeError("ui.narrative_stable_host_attachment_invalid");
      }
      if (predecessor !== null) predecessor.active = false;

      let lease!: NarrativeStableHostLeaseInternalV1;
      let leaseRecord!: NarrativeStableHostLeaseRecordInternalV1;
      lease = freezeNarrativePhysicalActionDataInternalV1({
        isCurrentInternalV1(this: NarrativeStableHostLeaseInternalV1): boolean {
          if (
            this !== lease || narrativeStableHostLeaseRecordsInternalV1.get(lease) !== leaseRecord
          ) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          if (
            terminalizeNarrativeStableSessionIfCoordinatorDisposedInternalV1(
              sessionRecord.bridgeRecord,
            )
          ) {
            return false;
          }
          return leaseRecord.active && !sessionRecord.terminal &&
            sessionRecord.bridgeRecord.active && sessionRecord.currentHostLease === leaseRecord;
        },
        releaseInternalV1(this: NarrativeStableHostLeaseInternalV1): void {
          if (
            this !== lease || narrativeStableHostLeaseRecordsInternalV1.get(lease) !== leaseRecord
          ) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          if (!leaseRecord.active) return;
          leaseRecord.active = false;
          if (!sessionRecord.hostCleanupScheduled) {
            sessionRecord.hostCleanupScheduled = true;
            queueMicrotask(() => {
              sessionRecord.hostCleanupScheduled = false;
              if (sessionRecord.currentHostLease?.active === false) {
                sessionRecord.currentHostLease = null;
              }
            });
          }
        },
      });
      leaseRecord = {
        session,
        sessionRecord,
        hostIdentity: hostIdentity as object,
        lease,
        active: true,
      };
      narrativeStableHostLeaseRecordsInternalV1.set(lease, leaseRecord);
      sessionRecord.currentHostLease = leaseRecord;
      return lease;
    },
  });

  const initialSnapshot = createNarrativeStableReadinessSnapshotInternalV1([]);
  const initialRenderSnapshot = createNarrativeStableHostRenderSnapshotInternalV1([]);
  sessionRecord = {
    bridge: exactBridge,
    bridgeRecord,
    historyChildLifecycle,
    listeners: new Set(),
    renderListeners: new Set(),
    actionBindingRecords: [],
    currentHostFocusOwnership: null,
    currentRootAttempt: null,
    currentRootPreparation: null,
    currentRootEntry: null,
    currentHistoryEntry: null,
    currentSnapshot: initialSnapshot,
    lastNotifiedSnapshot: initialSnapshot,
    currentRenderSnapshot: initialRenderSnapshot,
    renderSource: null,
    renderKeyHighWater: 0,
    currentHostLease: null,
    currentHostRuntime: null,
    hostCleanupScheduled: false,
    hostTerminalCleanupScheduled: false,
    unsubscribeStateInternalV1: (): void => {},
    subscribed: false,
    terminal: false,
  };
  narrativeStableSessionRecordsInternalV1.set(session, sessionRecord);
  refreshNarrativeStableSessionSnapshotInternalV1(session, sessionRecord);
  refreshNarrativeStableHostRenderSnapshotInternalV1(session, sessionRecord);
  sessionRecord.lastNotifiedSnapshot = sessionRecord.currentSnapshot;
  try {
    sessionRecord.unsubscribeStateInternalV1 = applyNarrativePhysicalActionInternalV1(
      bridgeRecord.subscribeStateInternalV1,
      bridgeRecord.compositeRuntimeKernel,
      [() => notifyNarrativeStableSessionStateInternalV1(session, sessionRecord)],
    ) as () => void;
    sessionRecord.subscribed = true;
  } catch {
    narrativeStableSessionRecordsInternalV1.delete(session);
    throw new TypeError("ui.narrative_stable_session_invalid");
  }
  bridgeRecord.session = session;
  return session;
}

export function createNarrativeStableHostRuntimeInternalV1(
  input: CreateNarrativeStableHostRuntimeInputInternalV1,
): NarrativeStableHostRuntimeInternalV1 {
  let captured: ReturnType<typeof captureOwnDataRecordInternalV1>;
  try {
    captured = captureOwnDataRecordInternalV1(input);
  } catch {
    captured = null;
  }
  if (
    captured === null ||
    !capturedRecordHasExactKeysInternalV1(captured, [
      "session",
      "hostIdentity",
      "portalContainer",
      "inputRouter",
      "isGestureCurrent",
    ])
  ) {
    throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  }
  const session = captured.values.session as NarrativeStableSessionInternalV1;
  const hostIdentity = captured.values.hostIdentity;
  const portalContainer = captured.values.portalContainer;
  const inputRouter = captured.values.inputRouter;
  const isGestureCurrent = captured.values.isGestureCurrent;
  const sessionRecord = (typeof session === "object" || typeof session === "function") &&
      session !== null
    ? narrativeStableSessionRecordsInternalV1.get(session)
    : undefined;
  let routerRecord: ReturnType<typeof captureOwnDataRecordInternalV1> = null;
  try {
    routerRecord = captureOwnDataRecordInternalV1(inputRouter);
  } catch {
    // Invalid router provenance is classified before lease acquisition.
  }
  if (
    sessionRecord === undefined || sessionRecord.terminal ||
    !sessionRecord.bridgeRecord.active ||
    ((typeof hostIdentity !== "object" && typeof hostIdentity !== "function") ||
      hostIdentity === null) ||
    typeof HTMLDivElement !== "function" || !(portalContainer instanceof HTMLDivElement) ||
    routerRecord === null || !capturedRecordHasExactKeysInternalV1(routerRecord, [
      "register",
      "route",
      "clearTransientInput",
    ]) ||
    typeof routerRecord.values.register !== "function" ||
    typeof routerRecord.values.route !== "function" ||
    typeof routerRecord.values.clearTransientInput !== "function" ||
    typeof isGestureCurrent !== "function"
  ) {
    throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  }
  const predecessorRuntime = sessionRecord.currentHostRuntime;
  if (
    predecessorRuntime !== null && predecessorRuntime.hostIdentity === hostIdentity &&
    predecessorRuntime.portalContainer !== portalContainer
  ) {
    throw new TypeError("ui.narrative_stable_host_portal_conflict");
  }
  if (
    predecessorRuntime !== null && predecessorRuntime.hostIdentity !== hostIdentity
  ) {
    throw new TypeError("ui.narrative_stable_host_lease_conflict");
  }

  let lease: NarrativeStableHostLeaseInternalV1;
  try {
    lease = applyNarrativePhysicalActionInternalV1(
      session.attachHostInternalV1,
      session,
      [freezeNarrativePhysicalActionDataInternalV1({ hostIdentity })],
    ) as NarrativeStableHostLeaseInternalV1;
  } catch (error) {
    if (
      error instanceof TypeError &&
      (error.message === "ui.narrative_stable_host_lease_conflict" ||
        error.message === "ui.narrative_stable_host_portal_conflict")
    ) {
      throw error;
    }
    throw new TypeError("ui.narrative_stable_host_attachment_invalid", { cause: error });
  }

  let partialRuntimeRecord: NarrativeStableHostRuntimeRecordInternalV1 | null = null;
  try {
    if (predecessorRuntime !== null) predecessorRuntime.active = false;
    let renderSource = sessionRecord.renderSource;
    if (renderSource === null) {
      let source!: NarrativeStableHostRenderSourceInternalV1;
      source = freezeNarrativePhysicalActionDataInternalV1({
        getSnapshotInternalV1(
          this: NarrativeStableHostRenderSourceInternalV1,
        ): NarrativeStableHostRenderSnapshotInternalV1 {
          const sourceRecord = narrativeStableHostRenderSourceRecordsInternalV1.get(source);
          if (this !== source || sourceRecord === undefined) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          const retainedSession = sourceRecord.session;
          const retainedSessionRecord = sourceRecord.sessionRecord;
          if (retainedSession === null || retainedSessionRecord === null) {
            return sourceRecord.terminalSnapshot;
          }
          if (retainedSessionRecord.renderSource !== source) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          if (!retainedSessionRecord.terminal) {
            refreshNarrativeStableHostRenderSnapshotInternalV1(
              retainedSession,
              retainedSessionRecord,
            );
          }
          return retainedSessionRecord.currentRenderSnapshot;
        },
        subscribeInternalV1(
          this: NarrativeStableHostRenderSourceInternalV1,
          listener: () => void,
        ): () => void {
          const sourceRecord = narrativeStableHostRenderSourceRecordsInternalV1.get(source);
          if (
            this !== source || sourceRecord === undefined || typeof listener !== "function"
          ) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          const retainedSessionRecord = sourceRecord.sessionRecord;
          if (
            retainedSessionRecord === null || retainedSessionRecord.terminal ||
            retainedSessionRecord.renderSource !== source
          ) {
            return freezeNarrativePhysicalActionDataInternalV1((): void => {});
          }
          retainedSessionRecord.renderListeners.add(listener);
          const holder: { listener: (() => void) | null } = { listener };
          sourceRecord.listenerHolders.add(holder);
          let active = true;
          return freezeNarrativePhysicalActionDataInternalV1((): void => {
            if (!active) return;
            active = false;
            const retainedListener = holder.listener;
            holder.listener = null;
            sourceRecord.listenerHolders.delete(holder);
            const currentSessionRecord = sourceRecord.sessionRecord;
            if (retainedListener !== null && currentSessionRecord !== null) {
              currentSessionRecord.renderListeners.delete(retainedListener);
            }
          });
        },
      });
      narrativeStableHostRenderSourceRecordsInternalV1.set(source, {
        session,
        sessionRecord,
        terminalSnapshot: sessionRecord.currentRenderSnapshot,
        listenerHolders: new Set(),
      });
      sessionRecord.renderSource = source;
      renderSource = source;
    }
    refreshNarrativeStableHostRenderSnapshotInternalV1(session, sessionRecord);

    let runtime!: NarrativeStableHostRuntimeInternalV1;
    let attachment!: NarrativeStableHostAttachmentInternalV1;
    let runtimeRecord!: NarrativeStableHostRuntimeRecordInternalV1;
    const isCurrent = (): boolean => {
      if (
        !runtimeRecord.active || sessionRecord.terminal ||
        sessionRecord.currentHostRuntime !== runtimeRecord
      ) return false;
      try {
        return applyNarrativePhysicalActionInternalV1(
          lease.isCurrentInternalV1,
          lease,
          [],
        ) as boolean;
      } catch {
        return false;
      }
    };
    const settleRoot = (
      preparation: NarrativeStableRootPreparationInternalV1,
      readyCommit: NarrativeStableHostReadyCommitInternalV1 | null,
      outcome: "ready" | "failed",
      detachedCleanup = false,
    ): NarrativeStableReadinessSettlementResultInternalV1 => {
      const canSettle = (): boolean =>
        detachedCleanup
          ? !runtimeRecord.active && !sessionRecord.terminal &&
            sessionRecord.currentHostRuntime === runtimeRecord
          : isCurrent();
      if (!canSettle()) return narrativeStableReadinessStaleResultInternalV1;
      const preparationRecord = narrativeStableRootPreparationRecordsInternalV1.get(preparation);
      if (
        preparationRecord === undefined || preparationRecord.session !== session ||
        preparationRecord.bridgeRecord !== sessionRecord.bridgeRecord
      ) return narrativeStableReadinessStaleResultInternalV1;
      let readyRecord: NarrativeStableHostReadyCommitRecordInternalV1 | null = null;
      if (outcome === "ready") {
        if (
          readyCommit === null ||
          (typeof readyCommit !== "object" && typeof readyCommit !== "function")
        ) return narrativeStableReadinessStaleResultInternalV1;
        readyRecord = narrativeStableHostReadyCommitRecordsInternalV1.get(readyCommit) ?? null;
        if (
          readyRecord === null || readyRecord.runtimeRecord !== runtimeRecord ||
          readyRecord.spent
        ) return narrativeStableReadinessStaleResultInternalV1;
      }
      let restorationRecord: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null =
        null;
      if (outcome === "failed") {
        const failedBindingRecord = findNarrativeStableHostActionBindingRecordInternalV1(
          sessionRecord,
          preparationRecord.attempt,
        );
        if (failedBindingRecord !== null) {
          retireNarrativeStableHostCandidateActionBindingInternalV1(failedBindingRecord);
        }
        if (!detachedCleanup) {
          try {
            restorationRecord = prepareNarrativeStableHostRootRestorationActionBindingInternalV1(
              runtimeRecord,
            );
          } catch {
            return narrativeStableReadinessFaultedResultInternalV1;
          }
        }
      }
      const guard: ManagedSurfaceStableReadinessCommitGuardInternalV1 =
        freezeNarrativePhysicalActionDataInternalV1({
          commitInternalV1: (
            contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
          ): boolean => {
            if (!canSettle()) return false;
            if (readyRecord !== null) {
              if (readyRecord.spent) return false;
              const actionBindingRecord = readyRecord.actionBindingRecord;
              if (
                actionBindingRecord === null || actionBindingRecord.kind !== "root" ||
                actionBindingRecord.provenance !== preparationRecord.attempt ||
                !commitNarrativeStableHostCandidateActionBindingInternalV1(
                  runtimeRecord,
                  actionBindingRecord,
                  contract,
                  readyRecord,
                )
              ) return false;
              retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
            } else if (
              !detachedCleanup && contract !== null &&
              (restorationRecord === null ||
                !commitNarrativeStableHostCandidateActionBindingInternalV1(
                  runtimeRecord,
                  restorationRecord,
                  contract,
                ))
            ) {
              return false;
            }
            if (readyRecord === null && contract === null && restorationRecord !== null) {
              retireNarrativeStableHostCandidateActionBindingInternalV1(restorationRecord);
            }
            runtimeRecord.fallbackInputEntry = null;
            return true;
          },
        });
      let result: ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessReadyWithCommitGuardInternalV1"
        ]
      >;
      try {
        const envelope = freezeNarrativePhysicalActionDataInternalV1({
          readinessEvidence: freezeNarrativePhysicalActionDataInternalV1({
            applicationEpoch: preparationRecord.attempt.identity.allocation.applicationEpoch,
            surfaceInstanceId: preparationRecord.attempt.identity.surfaceInstanceId,
          }),
          publisherLease: preparationRecord.target.publisherLease,
          sourceRevision: preparationRecord.sourceRevision,
        });
        const kernel = sessionRecord.bridgeRecord.compositeRuntimeKernel;
        result = outcome === "ready"
          ? applyNarrativePhysicalActionInternalV1(
            kernel.settleStableReadinessReadyWithCommitGuardInternalV1,
            kernel,
            [envelope, guard],
          ) as typeof result
          : applyNarrativePhysicalActionInternalV1(
            kernel.settleStableReadinessFailedWithCommitGuardInternalV1,
            kernel,
            [envelope, guard],
          ) as typeof result;
      } catch {
        if (readyRecord !== null) {
          retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
        }
        return narrativeStableReadinessFaultedResultInternalV1;
      }
      if (result.kind === "applied") {
        narrativeStableRootPreparationRecordsInternalV1.delete(preparation);
        if (runtimeRecord.active && sessionRecord.currentHostRuntime === runtimeRecord) {
          freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
        }
        notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
        return narrativeStableReadinessSettledResultInternalV1;
      }
      if (readyRecord !== null) {
        retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
      }
      if (runtimeRecord.active && sessionRecord.currentHostRuntime === runtimeRecord) {
        freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
        notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
      }
      return result.kind === "faulted"
        ? narrativeStableReadinessFaultedResultInternalV1
        : narrativeStableReadinessStaleResultInternalV1;
    };
    const settleHistory = (
      preparation: NarrativeStableHistoryChildPreparationInternalV1,
      readyCommit: NarrativeStableHostReadyCommitInternalV1 | null,
      outcome: "ready" | "failed",
      detachedCleanup = false,
    ): NarrativeStableReadinessSettlementResultInternalV1 => {
      const canSettle = (): boolean =>
        detachedCleanup
          ? !runtimeRecord.active && !sessionRecord.terminal &&
            sessionRecord.currentHostRuntime === runtimeRecord
          : isCurrent();
      if (!canSettle()) return narrativeStableReadinessStaleResultInternalV1;
      const preparationRecord = narrativeStableHistoryChildPreparationRecordsInternalV1.get(
        preparation,
      );
      if (
        preparationRecord?.candidate === null || preparationRecord === undefined ||
        preparationRecord.lifecycleRecord.bridgeRecord !== sessionRecord.bridgeRecord
      ) return narrativeStableReadinessStaleResultInternalV1;
      let readyRecord: NarrativeStableHostReadyCommitRecordInternalV1 | null = null;
      if (outcome === "ready") {
        if (
          readyCommit === null ||
          (typeof readyCommit !== "object" && typeof readyCommit !== "function")
        ) return narrativeStableReadinessStaleResultInternalV1;
        readyRecord = narrativeStableHostReadyCommitRecordsInternalV1.get(readyCommit) ?? null;
        if (
          readyRecord === null || readyRecord.runtimeRecord !== runtimeRecord ||
          readyRecord.renderEntry?.kind !== "history" ||
          readyRecord.renderEntry.preparation !== preparation || readyRecord.spent
        ) return narrativeStableReadinessStaleResultInternalV1;
      }
      let restorationRecord: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null =
        null;
      if (outcome === "failed") {
        const failedBindingRecord = findNarrativeStableHostActionBindingRecordInternalV1(
          sessionRecord,
          preparationRecord.candidate,
        );
        if (failedBindingRecord !== null) {
          retireNarrativeStableHostCandidateActionBindingInternalV1(failedBindingRecord);
        }
        if (!detachedCleanup) {
          try {
            restorationRecord = prepareNarrativeStableHostRootRestorationActionBindingInternalV1(
              runtimeRecord,
            );
          } catch {
            return narrativeStableReadinessFaultedResultInternalV1;
          }
        }
      }
      const familyClaim = narrativeStableHistoryChildFamilyClaimsInternalV1.get(
        sessionRecord.bridgeRecord.compositeRuntimeKernel,
      );
      if (familyClaim === undefined) return narrativeStableReadinessFaultedResultInternalV1;
      const guard: ManagedSurfaceStableReadinessCommitGuardInternalV1 =
        freezeNarrativePhysicalActionDataInternalV1({
          commitInternalV1: (
            contract: ManagedSurfacePreparedInputBindingContractInternalV1 | null,
          ): boolean => {
            if (!canSettle()) return false;
            if (readyRecord !== null) {
              if (readyRecord.spent) return false;
              const actionBindingRecord = readyRecord.actionBindingRecord;
              if (
                actionBindingRecord === null || actionBindingRecord.kind !== "history" ||
                actionBindingRecord.provenance !== preparationRecord.candidate ||
                !commitNarrativeStableHostCandidateActionBindingInternalV1(
                  runtimeRecord,
                  actionBindingRecord,
                  contract,
                  readyRecord,
                )
              ) return false;
              retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
            } else if (
              !detachedCleanup && contract !== null &&
              (restorationRecord === null ||
                !commitNarrativeStableHostCandidateActionBindingInternalV1(
                  runtimeRecord,
                  restorationRecord,
                  contract,
                ))
            ) {
              return false;
            }
            if (readyRecord === null && contract === null && restorationRecord !== null) {
              retireNarrativeStableHostCandidateActionBindingInternalV1(restorationRecord);
            }
            runtimeRecord.fallbackInputEntry = null;
            return true;
          },
        });
      try {
        const result = outcome === "ready"
          ? applyNarrativePhysicalActionInternalV1(
            familyClaim.readinessAuthority
              .settleExactParentTransientChildReadinessReadyInternalV1,
            familyClaim.readinessAuthority,
            [preparationRecord.candidate, guard],
          )
          : applyNarrativePhysicalActionInternalV1(
            familyClaim.readinessAuthority
              .settleExactParentTransientChildReadinessFailedInternalV1,
            familyClaim.readinessAuthority,
            [preparationRecord.candidate, guard],
          );
        const classified = result as { readonly kind: "applied" | "stale" | "faulted" };
        if (classified.kind === "applied") {
          narrativeStableHistoryChildPreparationRecordsInternalV1.delete(preparation);
          if (runtimeRecord.active && sessionRecord.currentHostRuntime === runtimeRecord) {
            freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
          }
          notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
          return narrativeStableReadinessSettledResultInternalV1;
        }
        if (readyRecord !== null) {
          retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
        }
        if (runtimeRecord.active && sessionRecord.currentHostRuntime === runtimeRecord) {
          freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
          notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
        }
        return classified.kind === "faulted"
          ? narrativeStableReadinessFaultedResultInternalV1
          : narrativeStableReadinessStaleResultInternalV1;
      } catch {
        if (readyRecord !== null) {
          retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
        }
        if (runtimeRecord.active && sessionRecord.currentHostRuntime === runtimeRecord) {
          freshRepairNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
          notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
        }
        return narrativeStableReadinessFaultedResultInternalV1;
      }
    };
    const attachmentHolder: NarrativeStableHostAttachmentHolderInternalV1 = { dispatch: null };
    const release = (): void => {
      if (!runtimeRecord.active) return;
      runtimeRecord.active = false;
      for (const actionBindingRecord of sessionRecord.actionBindingRecords) {
        if (actionBindingRecord.focusAttachment?.runtimeRecord === runtimeRecord) {
          actionBindingRecord.focusAttachment = null;
        }
        if (actionBindingRecord.runtimeRecord === runtimeRecord) {
          actionBindingRecord.runtimeRecord = null;
        }
      }
      for (const readyRecord of [...runtimeRecord.readyCommits]) {
        retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
      }
      try {
        applyNarrativePhysicalActionInternalV1(lease.releaseInternalV1, lease, []);
      } catch {
        // The runtime generation remains fenced when lease release fails closed.
      }
      if (!sessionRecord.hostTerminalCleanupScheduled) {
        sessionRecord.hostTerminalCleanupScheduled = true;
        queueMicrotask(() => {
          sessionRecord.hostTerminalCleanupScheduled = false;
          const released = sessionRecord.currentHostRuntime;
          if (released === null || released.active || sessionRecord.terminal) return;
          const rootEntry = sessionRecord.currentRenderSnapshot.entries.findLast((entry) =>
            entry.kind === "dialogue" && entry.phase === "preparing" &&
            entry.preparation !== null
          );
          if (rootEntry?.kind === "dialogue" && rootEntry.preparation !== null) {
            settleRoot(rootEntry.preparation, null, "failed", true);
            if (
              sessionRecord.currentHostRuntime !== released || released.active ||
              sessionRecord.terminal
            ) return;
          }
          const historyEntry = sessionRecord.currentRenderSnapshot.entries.find((entry) =>
            entry.kind === "history" && entry.phase === "preparing" &&
            entry.preparation !== null
          );
          if (historyEntry?.kind === "history" && historyEntry.preparation !== null) {
            settleHistory(historyEntry.preparation, null, "failed", true);
            if (
              sessionRecord.currentHostRuntime !== released || released.active ||
              sessionRecord.terminal
            ) return;
          }
          try {
            applyNarrativePhysicalActionInternalV1(
              sessionRecord.bridge.disposeInternalV1,
              sessionRecord.bridge,
              [],
            );
          } catch {
            terminalizeNarrativeStableSessionInternalV1(sessionRecord.bridgeRecord);
          }
        });
      }
      retireNarrativeStableHostRuntimeExposureInternalV1(runtimeRecord);
    };
    attachment = freezeNarrativePhysicalActionDataInternalV1({
      settleRootReadinessReadyInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableRootPreparationInternalV1,
        readyCommit: NarrativeStableHostReadyCommitInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = this === attachment ? attachmentHolder.dispatch : null;
        return dispatch?.settleRootReady(preparation, readyCommit) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleRootReadinessFailedInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableRootPreparationInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = this === attachment ? attachmentHolder.dispatch : null;
        return dispatch?.settleRootFailed(preparation) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleHistoryReadinessReadyInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableHistoryChildPreparationInternalV1,
        readyCommit: NarrativeStableHostReadyCommitInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = this === attachment ? attachmentHolder.dispatch : null;
        return dispatch?.settleHistoryReady(preparation, readyCommit) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleHistoryReadinessFailedInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableHistoryChildPreparationInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = this === attachment ? attachmentHolder.dispatch : null;
        return dispatch?.settleHistoryFailed(preparation) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      releaseInternalV1(this: NarrativeStableHostAttachmentInternalV1): void {
        if (this !== attachment) return;
        attachmentHolder.dispatch?.release();
      },
    });
    attachmentHolder.dispatch = {
      settleRootReady: (preparation, readyCommit) => settleRoot(preparation, readyCommit, "ready"),
      settleRootFailed: (preparation) => settleRoot(preparation, null, "failed"),
      settleHistoryReady: (preparation, readyCommit) =>
        settleHistory(preparation, readyCommit, "ready"),
      settleHistoryFailed: (preparation) => settleHistory(preparation, null, "failed"),
      release,
    };
    runtime = freezeNarrativePhysicalActionDataInternalV1({ attachment, renderSource });
    runtimeRecord = {
      sessionRecord,
      hostIdentity: hostIdentity as object,
      portalContainer: portalContainer as HTMLDivElement,
      inputRouter: inputRouter as InputRouterV1,
      isGestureCurrent: isGestureCurrent as (gestureId: ManagedSurfaceGestureIdV1) => boolean,
      lease,
      runtime,
      attachment,
      readyCommits: new Set(),
      focusGeneration: freezeNarrativePhysicalActionDataInternalV1({}),
      attachmentHolder,
      fallbackInputUnregister: null,
      fallbackInputEntry: null,
      active: true,
    };
    partialRuntimeRecord = runtimeRecord;
    narrativeStableHostRuntimeRecordsInternalV1.set(runtime, runtimeRecord);
    narrativeStableHostAttachmentRecordsInternalV1.set(attachment, runtimeRecord);
    sessionRecord.currentHostRuntime = runtimeRecord;
    ensureNarrativeStableHostCandidateActionBindingsInternalV1(runtimeRecord);
    refreshNarrativeStableHostRenderSnapshotInternalV1(session, sessionRecord);
    reconcileNarrativeStableHostCandidateActionBindingsInternalV1(sessionRecord);
    reconcileNarrativeStableHostFallbackInputInternalV1(runtimeRecord);
    if (predecessorRuntime !== null) {
      for (const actionBindingRecord of sessionRecord.actionBindingRecords) {
        if (actionBindingRecord.focusAttachment?.runtimeRecord === predecessorRuntime) {
          actionBindingRecord.focusAttachment = null;
        }
        if (actionBindingRecord.runtimeRecord === predecessorRuntime) {
          actionBindingRecord.runtimeRecord = null;
        }
      }
      retireNarrativeStableHostRuntimeExposureInternalV1(predecessorRuntime);
    }
    return runtime;
  } catch {
    const partial = partialRuntimeRecord;
    if (partial !== null) {
      partial.active = false;
      for (const readyRecord of [...partial.readyCommits]) {
        retireNarrativeStableHostReadyCommitRecordInternalV1(readyRecord);
      }
      for (const actionBindingRecord of sessionRecord.actionBindingRecords) {
        if (actionBindingRecord.runtimeRecord !== partial) continue;
        if (actionBindingRecord.committed) {
          actionBindingRecord.runtimeRecord = null;
          actionBindingRecord.focusAttachment = null;
        } else {
          retireNarrativeStableHostCandidateActionBindingInternalV1(actionBindingRecord);
        }
      }
      sessionRecord.actionBindingRecords = sessionRecord.actionBindingRecords.filter((record) =>
        record.active
      );
      retireNarrativeStableHostRuntimeExposureInternalV1(partial);
      if (sessionRecord.currentHostRuntime === partial) {
        sessionRecord.currentHostRuntime = null;
      }
    }
    if (predecessorRuntime !== null) {
      for (const actionBindingRecord of sessionRecord.actionBindingRecords) {
        if (actionBindingRecord.focusAttachment?.runtimeRecord === predecessorRuntime) {
          actionBindingRecord.focusAttachment = null;
        }
        if (actionBindingRecord.runtimeRecord === predecessorRuntime) {
          actionBindingRecord.runtimeRecord = null;
        }
      }
      retireNarrativeStableHostRuntimeExposureInternalV1(predecessorRuntime);
      if (sessionRecord.currentHostRuntime === predecessorRuntime) {
        sessionRecord.currentHostRuntime = null;
      }
    }
    try {
      applyNarrativePhysicalActionInternalV1(lease.releaseInternalV1, lease, []);
    } catch {
      // Exact lease cleanup is best-effort after setup failure.
    }
    throw new TypeError("ui.narrative_stable_host_attachment_invalid");
  }
}

export function isNarrativeStableHostRuntimeCurrentInternalV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
): boolean {
  if (
    (typeof runtime !== "object" && typeof runtime !== "function") || runtime === null
  ) return false;
  const runtimeRecord = narrativeStableHostRuntimeRecordsInternalV1.get(runtime);
  if (
    runtimeRecord === undefined || runtimeRecord.runtime !== runtime || !runtimeRecord.active
  ) return false;
  const sessionRecord = runtimeRecord.sessionRecord;
  if (
    sessionRecord.terminal || !sessionRecord.bridgeRecord.active ||
    sessionRecord.currentHostRuntime !== runtimeRecord
  ) return false;
  const leaseRecord = narrativeStableHostLeaseRecordsInternalV1.get(runtimeRecord.lease);
  return leaseRecord !== undefined && leaseRecord.lease === runtimeRecord.lease &&
    leaseRecord.sessionRecord === sessionRecord && leaseRecord.active &&
    sessionRecord.currentHostLease === leaseRecord;
}

export function prepareNarrativeStableHostReadyCommitInternalV1(
  input: PrepareNarrativeStableHostReadyCommitInputInternalV1,
): NarrativeStableHostReadyCommitPreparationResultInternalV1 {
  let captured: ReturnType<typeof captureOwnDataRecordInternalV1>;
  try {
    captured = captureOwnDataRecordInternalV1(input);
  } catch {
    captured = null;
  }
  if (
    captured === null || !capturedRecordHasExactKeysInternalV1(captured, [
      "hostRuntime",
      "renderEntry",
      "portalShell",
      "initialFocusTarget",
    ])
  ) return narrativeStableHostReadyCommitFaultedResultInternalV1;
  const hostRuntime = captured.values.hostRuntime as NarrativeStableHostRuntimeInternalV1;
  const renderEntry = captured.values.renderEntry as NarrativeStableHostRenderEntryInternalV1;
  const portalShell = captured.values.portalShell;
  const initialFocusTarget = captured.values.initialFocusTarget;
  const hostRuntimeIsObject =
    (typeof hostRuntime === "object" || typeof hostRuntime === "function") &&
    hostRuntime !== null;
  const runtimeRecord = hostRuntimeIsObject
    ? narrativeStableHostRuntimeRecordsInternalV1.get(hostRuntime)
    : undefined;
  if (runtimeRecord === undefined) {
    return hostRuntimeIsObject && retiredNarrativeStableHostRuntimesInternalV1.has(hostRuntime)
      ? narrativeStableHostReadyCommitStaleResultInternalV1
      : narrativeStableHostReadyCommitFaultedResultInternalV1;
  }
  const entryRecord = (typeof renderEntry === "object" || typeof renderEntry === "function") &&
      renderEntry !== null
    ? narrativeStableHostRenderEntryRecordsInternalV1.get(renderEntry)
    : undefined;
  if (
    !runtimeRecord.active || runtimeRecord.sessionRecord.currentHostRuntime !== runtimeRecord ||
    entryRecord?.sessionRecord !== runtimeRecord.sessionRecord ||
    typeof HTMLDivElement !== "function" || !(portalShell instanceof HTMLDivElement) ||
    typeof HTMLElement !== "function" || !(initialFocusTarget instanceof HTMLElement) ||
    initialFocusTarget !== portalShell || !portalShell.isConnected ||
    !runtimeRecord.portalContainer.contains(portalShell) ||
    !runtimeRecord.sessionRecord.currentRenderSnapshot.entries.includes(renderEntry)
  ) return narrativeStableHostReadyCommitStaleResultInternalV1;
  const actionBindingRecord = findNarrativeStableHostActionBindingRecordInternalV1(
    runtimeRecord.sessionRecord,
    entryRecord.attempt,
  );
  if (renderEntry.phase === "active" || renderEntry.phase === "suspended") {
    if (
      actionBindingRecord === null || !actionBindingRecord.active ||
      !actionBindingRecord.committed ||
      actionBindingRecord.bindingGeneration !== entryRecord.actionBindingGeneration ||
      actionBindingRecord.inputRouter !== runtimeRecord.inputRouter ||
      actionBindingRecord.isGestureCurrent !== runtimeRecord.isGestureCurrent
    ) return narrativeStableHostReadyCommitStaleResultInternalV1;
    if (
      actionBindingRecord.focusTargetId !== renderEntry.initialFocusTargetId
    ) return narrativeStableHostReadyCommitStaleResultInternalV1;
    const expectedFocusOwnership = runtimeRecord.sessionRecord.currentHostFocusOwnership;
    const focusAttachment: NarrativeStableHostFocusAttachmentRecordInternalV1 = {
      runtimeRecord,
      portalShell: portalShell as HTMLDivElement,
      initialFocusTarget: initialFocusTarget as HTMLElement,
      generation: runtimeRecord.focusGeneration,
    };
    if (
      !runtimeRecord.active || runtimeRecord.sessionRecord.currentHostRuntime !== runtimeRecord ||
      !actionBindingRecord.active || !actionBindingRecord.committed ||
      runtimeRecord.sessionRecord.currentHostFocusOwnership !== expectedFocusOwnership
    ) return narrativeStableHostReadyCommitStaleResultInternalV1;
    actionBindingRecord.runtimeRecord = runtimeRecord;
    actionBindingRecord.focusAttachment = focusAttachment;
    return freezeNarrativePhysicalActionDataInternalV1({
      kind: "reattached" as const,
      completion: null,
    });
  }
  if (renderEntry.preparation === null) return narrativeStableHostReadyCommitStaleResultInternalV1;
  if (
    actionBindingRecord === null || actionBindingRecord.runtimeRecord !== runtimeRecord ||
    actionBindingRecord.committed ||
    actionBindingRecord.bindingGeneration !== entryRecord.actionBindingGeneration
  ) return narrativeStableHostReadyCommitStaleResultInternalV1;
  for (const retainedReadyRecord of [...runtimeRecord.readyCommits]) {
    if (
      retainedReadyRecord.actionBindingRecord?.provenance === actionBindingRecord.provenance
    ) {
      retireNarrativeStableHostReadyCommitRecordInternalV1(retainedReadyRecord);
    }
  }
  let readyCommit!: NarrativeStableHostReadyCommitInternalV1;
  readyCommit = freezeNarrativePhysicalActionDataInternalV1(
    {},
  ) as NarrativeStableHostReadyCommitInternalV1;
  const readyRecord: NarrativeStableHostReadyCommitRecordInternalV1 = {
    runtimeRecord,
    renderEntry,
    actionBindingRecord,
    expectedFocusOwnership: runtimeRecord.sessionRecord.currentHostFocusOwnership,
    focusTargetId: renderEntry.initialFocusTargetId,
    focusAttachment: {
      runtimeRecord,
      portalShell: portalShell as HTMLDivElement,
      initialFocusTarget: initialFocusTarget as HTMLElement,
      generation: runtimeRecord.focusGeneration,
    },
    portalShell: portalShell as HTMLDivElement,
    initialFocusTarget: initialFocusTarget as HTMLElement,
    spent: false,
  };
  narrativeStableHostReadyCommitRecordsInternalV1.set(readyCommit, readyRecord);
  runtimeRecord.readyCommits.add(readyRecord);
  return freezeNarrativePhysicalActionDataInternalV1({
    kind: "prepared" as const,
    readyCommit,
    completion: null,
  });
}

function captureOwnCallableInternalV1(
  value: unknown,
  key: string,
): ((...args: unknown[]) => unknown) | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor && typeof descriptor.value === "function"
    ? descriptor.value as (...args: unknown[]) => unknown
    : null;
}

function captureNarrativeBarrierActivationGateInternalV1(
  value: unknown,
): NarrativeStableBarrierActivationGateBindingInternalV1 | null {
  let record: CapturedOwnDataRecordInternalV1 | null = null;
  try {
    record = captureOwnDataRecordInternalV1(value);
  } catch {
    record = null;
  }
  if (
    record === null || !capturedRecordHasExactKeysInternalV1(record, ["isOpen"]) ||
    typeof record.values.isOpen !== "function"
  ) {
    return null;
  }
  return freezeNarrativePhysicalActionDataInternalV1({
    receiver: value as ManagedSurfaceFamilyActivationGateInternalV1,
    isOpen: record.values.isOpen as ManagedSurfaceFamilyActivationGateInternalV1["isOpen"],
  });
}

function matchesNarrativeBarrierActivationGateBindingInternalV1(
  binding: NarrativeStableBarrierActivationGateBindingInternalV1,
): boolean {
  const current = captureNarrativeBarrierActivationGateInternalV1(binding.receiver);
  return current !== null && current.receiver === binding.receiver &&
    current.isOpen === binding.isOpen;
}

function captureSayRevealGenerationPortInternalV1(
  value: unknown,
):
  | Readonly<{
    readonly receiver: NarrativeStableSayRevealGenerationPortInternalV1;
    readonly capturePhase: NarrativeStableSayRevealGenerationPortInternalV1[
      "capturePhaseInternalV1"
    ];
    readonly revealAll: NarrativeStableSayRevealGenerationPortInternalV1[
      "revealAllInternalV1"
    ];
  }>
  | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Reflect.getPrototypeOf(value) !== Object.prototype) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== 2 || !ownKeys.includes("capturePhaseInternalV1") ||
    !ownKeys.includes("revealAllInternalV1")
  ) {
    return null;
  }
  const capturePhaseDescriptor = Reflect.getOwnPropertyDescriptor(
    value,
    "capturePhaseInternalV1",
  );
  const revealAllDescriptor = Reflect.getOwnPropertyDescriptor(value, "revealAllInternalV1");
  if (
    capturePhaseDescriptor === undefined || !("value" in capturePhaseDescriptor) ||
    typeof capturePhaseDescriptor.value !== "function" || revealAllDescriptor === undefined ||
    !("value" in revealAllDescriptor) || typeof revealAllDescriptor.value !== "function"
  ) {
    return null;
  }
  return Object.freeze({
    receiver: value as NarrativeStableSayRevealGenerationPortInternalV1,
    capturePhase: capturePhaseDescriptor.value as NarrativeStableSayRevealGenerationPortInternalV1[
      "capturePhaseInternalV1"
    ],
    revealAll: revealAllDescriptor.value as NarrativeStableSayRevealGenerationPortInternalV1[
      "revealAllInternalV1"
    ],
  });
}

export function createNarrativeStableSayRevealControllerInternalV1(
  input: CreateNarrativeStableSayRevealControllerInputInternalV1,
): NarrativeStableSayRevealControllerInternalV1 {
  const bridge = input.bridge;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  const revealBinding = captureSayRevealGenerationPortInternalV1(input.revealGenerationPort);
  if (
    bridgeRecord === undefined || bridgeRecord.sayRevealControllerClaim !== null ||
    bridgeRecord.sayCallbackClaim !== null || revealBinding === null
  ) {
    throw new TypeError("ui.narrative_stable_say_reveal_controller_invalid");
  }
  const kernel = bridgeRecord.compositeRuntimeKernel;
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel);
  const captureReadyActiveTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "captureReadyActiveStableTargetInternalV1",
  );
  const isCurrentReadyActiveTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "isCurrentReadyActiveStableTargetInternalV1",
  );
  const subscribeState = captureOwnCallableInternalV1(kernel, "subscribeStateInternalV1");
  if (
    captureReadyActiveTarget === null || isCurrentReadyActiveTarget === null ||
    subscribeState === null
  ) {
    throw new TypeError("ui.narrative_stable_say_reveal_controller_invalid");
  }

  const captureCurrentSay = ():
    | Readonly<{
      readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
      readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
      readonly frame: NarrativeStableAdmittedFrameInternalV1;
      readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
    }>
    | null => {
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.frame.pending.kind !== "say" ||
      !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
        current.frame.candidateSnapshot.semanticDispatchPort,
      )
    ) {
      return null;
    }
    const captured = Reflect.apply(captureReadyActiveTarget, stableActionAuthority, [
      current.target,
    ]) as ReturnType<
      ManagedSurfaceStableActionRouteAuthorityInternalV1[
        "captureReadyActiveStableTargetInternalV1"
      ]
    >;
    if (
      captured.kind !== "captured" || captured.directTarget !== current.target ||
      captured.sourceRevision !== current.sourceRevision
    ) {
      return null;
    }
    return Object.freeze({ ...current, proof: captured.proof });
  };

  let initial;
  try {
    initial = captureCurrentSay();
  } catch (error) {
    throw new TypeError("ui.narrative_stable_say_reveal_controller_unavailable", {
      cause: error,
    });
  }
  if (initial === null) {
    throw new TypeError("ui.narrative_stable_say_reveal_controller_unavailable");
  }

  const controllerClaim = freezeNarrativePhysicalActionDataInternalV1({});
  let unsubscribeState = (): void => {};
  let lifecycleObserverActive = false;
  let controller!: NarrativeStableSayRevealControllerInternalV1;
  let record!: NarrativeStableSayRevealControllerRecordInternalV1;

  const semanticFrameStillCurrent = (): boolean => {
    try {
      const current = bridgeRecord.captureCurrentTargetInternalV1();
      return current !== null && current.target === initial.target &&
        current.sourceRevision === initial.sourceRevision && current.frame === initial.frame &&
        current.frame.pending.kind === "say" &&
        current.frame.candidateSnapshot.semanticDispatchPort ===
          initial.frame.candidateSnapshot.semanticDispatchPort;
    } catch {
      return false;
    }
  };
  const readyActiveFrameStillCurrent = (): boolean => {
    try {
      const current = captureCurrentSay();
      return current !== null && current.target === initial.target &&
        current.sourceRevision === initial.sourceRevision && current.frame === initial.frame;
    } catch {
      return false;
    }
  };
  const generationStillCurrent = (): boolean => record.active && readyActiveFrameStillCurrent();
  const releaseLifecycleObserver = (): void => {
    if (!lifecycleObserverActive) return;
    lifecycleObserverActive = false;
    try {
      unsubscribeState();
    } catch {
      // Revocation is fail closed even when a diagnostic wrapper throws.
    }
  };
  const retireCurrentActivationAttempt = (): void => {
    if (record.currentActivationAttempt === null) return;
    const attemptRecord = narrativeStablePhysicalActionAttemptRecordsInternalV1.get(
      record.currentActivationAttempt,
    );
    if (attemptRecord !== undefined) attemptRecord.spent = true;
    record.currentActivationAttempt = null;
  };
  const retireCurrentContentAutoAttempt = (): void => {
    if (record.currentContentAutoAttempt === null) return;
    const attemptRecord = narrativeStableSayContentAutoAttemptRecordsInternalV1.get(
      record.currentContentAutoAttempt,
    );
    if (attemptRecord !== undefined) attemptRecord.spent = true;
    record.currentContentAutoAttempt = null;
  };
  const revoke = (retireSemanticBoundary = false): void => {
    if (!record.active) return;
    const boundaryClaim = record.callbackClaim;
    const preserveSemanticObserver = !retireSemanticBoundary && boundaryClaim !== null &&
      bridgeRecord.saySemanticInFlightClaim === boundaryClaim;
    record.active = false;
    if (
      retireSemanticBoundary && boundaryClaim !== null &&
      bridgeRecord.saySemanticInFlightClaim === boundaryClaim
    ) {
      bridgeRecord.saySemanticInFlightClaim = null;
    }
    if (!preserveSemanticObserver) record.callbackClaim = null;
    retireCurrentActivationAttempt();
    retireCurrentContentAutoAttempt();
    if (!preserveSemanticObserver) releaseLifecycleObserver();
    if (bridgeRecord.sayRevealControllerClaim === controllerClaim) {
      bridgeRecord.sayRevealControllerClaim = null;
    }
  };

  const releaseBoundary = (boundaryClaim: object): void => {
    if (bridgeRecord.sayCallbackClaim === boundaryClaim) {
      bridgeRecord.sayCallbackClaim = null;
    }
    if (bridgeRecord.saySemanticInFlightClaim === boundaryClaim) {
      bridgeRecord.saySemanticInFlightClaim = null;
    }
    if (record.callbackClaim === boundaryClaim) {
      record.callbackClaim = null;
    }
    if (!record.active) releaseLifecycleObserver();
  };

  const dispatchAdvance = (
    boundaryClaim: object,
    captureExactCurrentFrame: () => NarrativeStableAdmittedFrameInternalV1 | null,
  ): NarrativeStableSayAdvanceDispatchResultInternalV1 => {
    let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null = null;
    try {
      currentFrame = captureExactCurrentFrame();
    } catch {
      currentFrame = null;
    }
    if (currentFrame === null) {
      releaseBoundary(boundaryClaim);
      return narrativePhysicalActionStaleResultInternalV1;
    }
    const portBinding = narrativeStableSemanticResolutionPortBindingsInternalV1.get(
      record.semanticDispatchPort,
    );
    if (portBinding === undefined) {
      releaseBoundary(boundaryClaim);
      return narrativePhysicalActionFaultedResultInternalV1;
    }
    if (
      bridgeRecord.sayCallbackClaim !== boundaryClaim ||
      record.callbackClaim !== boundaryClaim ||
      bridgeRecord.saySemanticInFlightClaim !== null
    ) {
      releaseBoundary(boundaryClaim);
      return narrativePhysicalActionStaleResultInternalV1;
    }
    bridgeRecord.sayCallbackClaim = null;
    bridgeRecord.saySemanticInFlightClaim = boundaryClaim;
    const resolution: InteractionResolutionV1 = freezeNarrativePhysicalActionDataInternalV1({
      kind: "advance" as const,
    });
    const request = freezeNarrativePhysicalActionDataInternalV1({
      expectedOccurrenceId: currentFrame.pending.occurrenceId,
      resolution,
    }) satisfies NarrativeStableSemanticResolutionRequestInternalV1;
    try {
      if (captureExactCurrentFrame() === null) {
        releaseBoundary(boundaryClaim);
        return narrativePhysicalActionStaleResultInternalV1;
      }
    } catch {
      releaseBoundary(boundaryClaim);
      return narrativePhysicalActionStaleResultInternalV1;
    }

    let semanticCompletion: Promise<unknown>;
    try {
      semanticCompletion = Promise.resolve(
        Reflect.apply(portBinding.dispatchResolution, portBinding.receiver, [request]),
      );
    } catch (error) {
      semanticCompletion = Promise.reject(error);
    }
    const settleBoundary = (): void => {
      try {
        if (record.active && !record.isCurrentInternalV1()) {
          record.revokeInternalV1(true);
        }
      } catch {
        return;
      }
      releaseBoundary(boundaryClaim);
    };
    const completion = semanticCompletion.then(
      (value) => {
        settleBoundary();
        return value;
      },
      (error) => {
        settleBoundary();
        throw error;
      },
    );
    return freezeNarrativePhysicalActionDataInternalV1({
      kind: "dispatched" as const,
      completion,
    });
  };

  controller = freezeNarrativePhysicalActionDataInternalV1({
    issueContentAutoAttemptInternalV1(
      this: NarrativeStableSayRevealControllerInternalV1,
    ): NarrativeStableSayContentAutoAttemptInternalV1 | null {
      if (
        this !== controller || !record.active || record.frame.pending.kind !== "say" ||
        record.frame.pending.advancePolicy !== "auto" || record.callbackClaim !== null ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        if (record.currentContentAutoAttempt !== null) {
          const predecessor = narrativeStableSayContentAutoAttemptRecordsInternalV1.get(
            record.currentContentAutoAttempt,
          );
          if (
            predecessor === undefined ||
            Reflect.apply(isCurrentReadyActiveTarget, stableActionAuthority, [
                predecessor.proof,
              ]) === true
          ) {
            return null;
          }
          predecessor.spent = true;
          record.currentContentAutoAttempt = null;
        }
        const current = captureCurrentSay();
        if (
          current === null || current.target !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.frame !== record.frame ||
          current.frame.pending.kind !== "say" || current.frame.pending.advancePolicy !== "auto" ||
          current.frame.candidateSnapshot.semanticDispatchPort !== record.semanticDispatchPort ||
          !record.active || bridgeRecord.sayRevealControllerClaim !== record.controllerClaim ||
          record.callbackClaim !== null || bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return null;
        }
        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableSayContentAutoAttemptInternalV1;
        narrativeStableSayContentAutoAttemptRecordsInternalV1.set(attempt, {
          controller,
          controllerClaim: record.controllerClaim,
          proof: current.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort: current.frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        record.currentContentAutoAttempt = attempt;
        return attempt;
      } catch {
        return null;
      }
    },
    dispatchContentAutoInternalV1(
      this: NarrativeStableSayRevealControllerInternalV1,
      attempt: unknown,
    ): NarrativeStableSayContentAutoDispatchResultInternalV1 {
      if (
        this !== controller || !record.active ||
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const attemptRecord = narrativeStableSayContentAutoAttemptRecordsInternalV1.get(
        attempt as NarrativeStableSayContentAutoAttemptInternalV1,
      );
      if (
        attemptRecord === undefined || attemptRecord.controller !== controller ||
        attemptRecord.controllerClaim !== record.controllerClaim || attemptRecord.spent ||
        record.currentContentAutoAttempt !== attempt
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const captureExactCurrentFrame = (): NarrativeStableAdmittedFrameInternalV1 | null => {
        if (
          !record.active || bridgeRecord.sayRevealControllerClaim !== record.controllerClaim ||
          record.directTarget !== attemptRecord.directTarget ||
          record.sourceRevision !== attemptRecord.sourceRevision ||
          record.frame !== attemptRecord.frame ||
          record.semanticDispatchPort !== attemptRecord.semanticDispatchPort ||
          Reflect.apply(isCurrentReadyActiveTarget, stableActionAuthority, [
              attemptRecord.proof,
            ]) !== true
        ) {
          return null;
        }
        const current = bridgeRecord.captureCurrentTargetInternalV1();
        return current !== null && current.target === attemptRecord.directTarget &&
            current.sourceRevision === attemptRecord.sourceRevision &&
            current.frame === attemptRecord.frame && current.frame.pending.kind === "say" &&
            current.frame.pending.advancePolicy === "auto" &&
            current.frame.candidateSnapshot.semanticDispatchPort ===
              attemptRecord.semanticDispatchPort
          ? current.frame
          : null;
      };

      try {
        if (captureExactCurrentFrame() === null) {
          return narrativePhysicalActionStaleResultInternalV1;
        }
      } catch {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      if (
        record.callbackClaim !== null || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const boundaryClaim = freezeNarrativePhysicalActionDataInternalV1({});
      record.callbackClaim = boundaryClaim;
      bridgeRecord.sayCallbackClaim = boundaryClaim;
      attemptRecord.spent = true;
      record.currentContentAutoAttempt = null;
      retireCurrentActivationAttempt();

      let phase: unknown;
      let phaseThrew = false;
      try {
        phase = Reflect.apply(record.capturePhase, record.receiver, []);
      } catch {
        phaseThrew = true;
      }
      let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null = null;
      try {
        currentFrame = captureExactCurrentFrame();
      } catch {
        currentFrame = null;
      }
      if (
        currentFrame === null || record.callbackClaim !== boundaryClaim ||
        bridgeRecord.sayCallbackClaim !== boundaryClaim
      ) {
        releaseBoundary(boundaryClaim);
        return narrativePhysicalActionStaleResultInternalV1;
      }
      if (phaseThrew || (phase !== "incomplete" && phase !== "complete")) {
        releaseBoundary(boundaryClaim);
        return narrativePhysicalActionFaultedResultInternalV1;
      }
      if (phase === "incomplete") {
        releaseBoundary(boundaryClaim);
        return narrativeSayContentAutoNotReadyResultInternalV1;
      }
      return dispatchAdvance(boundaryClaim, captureExactCurrentFrame);
    },
    disposeInternalV1(this: NarrativeStableSayRevealControllerInternalV1): void {
      if (this !== controller) return;
      revoke(false);
    },
  });
  record = {
    bridgeRecord,
    controllerClaim,
    directTarget: initial.target,
    sourceRevision: initial.sourceRevision,
    frame: initial.frame,
    semanticDispatchPort: initial.frame.candidateSnapshot.semanticDispatchPort,
    receiver: revealBinding.receiver,
    capturePhase: revealBinding.capturePhase,
    revealAll: revealBinding.revealAll,
    isCurrentInternalV1: generationStillCurrent,
    revokeInternalV1: revoke,
    releaseLifecycleObserverInternalV1: releaseLifecycleObserver,
    dispatchAdvanceInternalV1: dispatchAdvance,
    active: true,
    callbackClaim: null,
    currentActivationAttempt: null,
    currentContentAutoAttempt: null,
  };
  narrativeStableSayRevealControllerRecordsInternalV1.set(controller, record);
  bridgeRecord.sayRevealControllerClaim = controllerClaim;

  try {
    const unsubscribe = Reflect.apply(subscribeState, kernel, [() => {
      if (record.active) {
        if (!readyActiveFrameStillCurrent()) revoke(!semanticFrameStillCurrent());
        return;
      }
      const boundaryClaim = record.callbackClaim;
      if (
        boundaryClaim !== null && bridgeRecord.saySemanticInFlightClaim === boundaryClaim &&
        !semanticFrameStillCurrent()
      ) {
        bridgeRecord.saySemanticInFlightClaim = null;
        record.callbackClaim = null;
        releaseLifecycleObserver();
      }
    }]);
    if (typeof unsubscribe !== "function") {
      throw new TypeError("ui.narrative_stable_say_reveal_controller_invalid");
    }
    unsubscribeState = unsubscribe as () => void;
    lifecycleObserverActive = true;
    if (!generationStillCurrent()) {
      throw new TypeError("ui.narrative_stable_say_reveal_controller_unavailable");
    }
  } catch (error) {
    revoke(true);
    if (
      error instanceof TypeError &&
      error.message === "ui.narrative_stable_say_reveal_controller_unavailable"
    ) {
      throw error;
    }
    throw new TypeError("ui.narrative_stable_say_reveal_controller_unavailable", {
      cause: error,
    });
  }
  return controller;
}

export function createNarrativeStablePauseExpiryControllerInternalV1(
  bridge: NarrativeStablePublisherBridgeInternalV1,
): NarrativeStablePauseExpiryControllerInternalV1 {
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  if (bridgeRecord === undefined || bridgeRecord.pauseExpiryControllerClaim !== null) {
    throw new TypeError("ui.narrative_stable_pause_expiry_controller_invalid");
  }
  const kernel = bridgeRecord.compositeRuntimeKernel;
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel);
  const captureReadyActiveTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "captureReadyActiveStableTargetInternalV1",
  );
  const isCurrentReadyActiveTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "isCurrentReadyActiveStableTargetInternalV1",
  );
  const subscribeState = captureOwnCallableInternalV1(kernel, "subscribeStateInternalV1");
  if (
    captureReadyActiveTarget === null || isCurrentReadyActiveTarget === null ||
    subscribeState === null
  ) {
    throw new TypeError("ui.narrative_stable_pause_expiry_controller_invalid");
  }

  const captureCurrentPause = ():
    | Readonly<{
      readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
      readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
      readonly frame: NarrativeStableAdmittedFrameInternalV1;
      readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
    }>
    | null => {
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.frame.pending.kind !== "pause" ||
      !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
        current.frame.candidateSnapshot.semanticDispatchPort,
      )
    ) {
      return null;
    }
    const captured = Reflect.apply(captureReadyActiveTarget, stableActionAuthority, [
      current.target,
    ]) as ReturnType<
      ManagedSurfaceStableActionRouteAuthorityInternalV1[
        "captureReadyActiveStableTargetInternalV1"
      ]
    >;
    if (
      captured.kind !== "captured" || captured.directTarget !== current.target ||
      captured.sourceRevision !== current.sourceRevision
    ) {
      return null;
    }
    return Object.freeze({ ...current, proof: captured.proof });
  };

  let initial;
  try {
    initial = captureCurrentPause();
  } catch (error) {
    throw new TypeError("ui.narrative_stable_pause_expiry_controller_unavailable", {
      cause: error,
    });
  }
  if (initial === null) {
    throw new TypeError("ui.narrative_stable_pause_expiry_controller_unavailable");
  }

  let active = true;
  let semanticDispatchStarted = false;
  let currentAttempt: NarrativeStablePauseExpiryControllerAttemptInternalV1 | null = null;
  let unsubscribeState = (): void => {};
  let controller!: NarrativeStablePauseExpiryControllerInternalV1;
  const controllerClaim = Object.freeze({});
  bridgeRecord.pauseExpiryControllerClaim = controllerClaim;

  const revoke = (): void => {
    if (!active) return;
    active = false;
    currentAttempt = null;
    try {
      unsubscribeState();
    } catch {
      // Revocation remains fail closed even if a caller-provided diagnostic wrapper fails.
    }
    if (bridgeRecord.pauseExpiryControllerClaim === controllerClaim) {
      bridgeRecord.pauseExpiryControllerClaim = null;
    }
  };

  const generationStillCurrent = (): boolean => {
    const current = captureCurrentPause();
    return current !== null && current.target === initial.target &&
      current.sourceRevision === initial.sourceRevision && current.frame === initial.frame;
  };

  try {
    const unsubscribe = Reflect.apply(subscribeState, kernel, [() => {
      if (!active) return;
      try {
        if (!generationStillCurrent()) revoke();
      } catch {
        revoke();
      }
    }]);
    if (typeof unsubscribe !== "function") {
      throw new TypeError("ui.narrative_stable_pause_expiry_controller_invalid");
    }
    unsubscribeState = unsubscribe as () => void;
    if (!generationStillCurrent()) {
      throw new TypeError("ui.narrative_stable_pause_expiry_controller_unavailable");
    }
  } catch (error) {
    revoke();
    if (
      error instanceof TypeError &&
      error.message === "ui.narrative_stable_pause_expiry_controller_unavailable"
    ) {
      throw error;
    }
    throw new TypeError("ui.narrative_stable_pause_expiry_controller_unavailable", {
      cause: error,
    });
  }

  controller = Object.freeze({
    issueAttemptInternalV1(
      this: NarrativeStablePauseExpiryControllerInternalV1,
    ): NarrativeStablePauseExpiryControllerAttemptInternalV1 | null {
      if (this !== controller || !active || semanticDispatchStarted) return null;
      try {
        if (currentAttempt !== null) {
          const currentRecord = narrativeStablePauseExpiryControllerAttemptRecordsInternalV1.get(
            currentAttempt,
          );
          if (
            currentRecord === undefined ||
            Reflect.apply(isCurrentReadyActiveTarget, stableActionAuthority, [
                currentRecord.proof,
              ]) === true
          ) {
            return null;
          }
          currentRecord.spent = true;
          currentAttempt = null;
        }
        const current = captureCurrentPause();
        if (
          current === null || current.target !== initial.target ||
          current.sourceRevision !== initial.sourceRevision || current.frame !== initial.frame
        ) {
          revoke();
          return null;
        }
        const attempt = Object.freeze(
          {},
        ) as NarrativeStablePauseExpiryControllerAttemptInternalV1;
        narrativeStablePauseExpiryControllerAttemptRecordsInternalV1.set(attempt, {
          controller,
          proof: current.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort: current.frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        currentAttempt = attempt;
        return attempt;
      } catch {
        return null;
      }
    },
    dispatchInternalV1(
      this: NarrativeStablePauseExpiryControllerInternalV1,
      attempt: unknown,
    ): NarrativeStablePauseExpiryDispatchResultInternalV1 {
      if (this !== controller || !active) return narrativePauseExpiryStaleResultInternalV1;
      if ((typeof attempt !== "object" && typeof attempt !== "function") || attempt === null) {
        return narrativePauseExpiryStaleResultInternalV1;
      }
      const record = narrativeStablePauseExpiryControllerAttemptRecordsInternalV1.get(
        attempt as NarrativeStablePauseExpiryControllerAttemptInternalV1,
      );
      if (
        record === undefined || record.controller !== controller || record.spent ||
        currentAttempt !== attempt
      ) {
        return narrativePauseExpiryStaleResultInternalV1;
      }
      record.spent = true;
      currentAttempt = null;

      try {
        if (
          Reflect.apply(isCurrentReadyActiveTarget, stableActionAuthority, [record.proof]) !== true
        ) {
          return narrativePauseExpiryStaleResultInternalV1;
        }
        const current = bridgeRecord.captureCurrentTargetInternalV1();
        if (
          current === null || current.target !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.frame !== record.frame ||
          current.frame.pending.kind !== "pause" ||
          current.frame.candidateSnapshot.semanticDispatchPort !== record.semanticDispatchPort ||
          current.frame.pending.occurrenceId !== record.frame.pending.occurrenceId
        ) {
          return narrativePauseExpiryStaleResultInternalV1;
        }
        const portBinding = narrativeStableSemanticResolutionPortBindingsInternalV1.get(
          record.semanticDispatchPort,
        );
        if (portBinding === undefined) return narrativePauseExpiryFaultedResultInternalV1;
        const resolution: InteractionResolutionV1 = Object.freeze({ kind: "resume" as const });
        const request = Object.freeze({
          expectedOccurrenceId: current.frame.pending.occurrenceId,
          resolution,
        }) satisfies NarrativeStableSemanticResolutionRequestInternalV1;
        const dispatchResolution = portBinding.dispatchResolution;
        const dispatchReceiver = portBinding.receiver;
        const dispatchArguments = Object.freeze([request]);
        if (
          Reflect.apply(isCurrentReadyActiveTarget, stableActionAuthority, [record.proof]) !== true
        ) {
          return narrativePauseExpiryStaleResultInternalV1;
        }
        semanticDispatchStarted = true;
        let completion: Promise<unknown>;
        try {
          completion = Promise.resolve(
            Reflect.apply(dispatchResolution, dispatchReceiver, dispatchArguments),
          );
        } catch (error) {
          completion = Promise.reject(error);
        }
        return Object.freeze({ kind: "dispatched" as const, completion });
      } catch {
        return narrativePauseExpiryStaleResultInternalV1;
      }
    },
    disposeInternalV1(this: NarrativeStablePauseExpiryControllerInternalV1): void {
      if (this !== controller) return;
      revoke();
    },
  });
  return controller;
}

function createNarrativeStableHostHistoryPhysicalActionAdmissionInternalV1(
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1,
  actionBindingRecord: NarrativeStableHostCandidateActionBindingRecordInternalV1,
): NarrativeStablePhysicalActionAdmissionInternalV1 {
  const binding = actionBindingRecord.binding;
  const claimedRoute = actionBindingRecord.claimedRoute;
  if (binding === null || claimedRoute === null) {
    throw new TypeError("ui.narrative_stable_action_admission_invalid");
  }
  let active = true;
  let authority!: NarrativeStablePhysicalActionAdmissionInternalV1;
  const isCurrent = (): boolean =>
    active && bridgeRecord.active && actionBindingRecord.active &&
    actionBindingRecord.committed &&
    bridgeRecord.physicalActionAdmissionClaim === actionBindingRecord.admissionClaim &&
    actionBindingRecord.sessionRecord?.actionBindingRecords.includes(actionBindingRecord) === true;
  authority = freezeNarrativePhysicalActionDataInternalV1({
    createEnvelopeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      request: {
        readonly actionId: ManagedSurfaceActionIdV1;
        readonly gestureId: ManagedSurfaceGestureIdV1;
      },
    ): ManagedSurfaceActionEnvelopeV1 {
      if (this !== authority || !isCurrent()) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return binding.createEnvelope(request);
    },
    issueChoiceAttemptInternalV1(): null {
      return null;
    },
    issuePauseResumeAttemptInternalV1(): null {
      return null;
    },
    issueCustomAttemptInternalV1(): null {
      return null;
    },
    issueSayActivationAttemptInternalV1(): null {
      return null;
    },
    issueVoiceReplayAttemptInternalV1(): null {
      return null;
    },
    issuePlaybackModeToggleAttemptInternalV1(): null {
      return null;
    },
    issueHistoryOpenAttemptInternalV1(): null {
      return null;
    },
    routeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      envelope: ManagedSurfaceActionEnvelopeV1,
      attempt: unknown,
    ): ManagedSurfaceAuthenticatedActionRouteResultInternalV1<
      NarrativeStablePhysicalActionDispatchResultInternalV1
    > {
      if (this !== authority) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return claimedRoute.routeInternalV1(envelope, attempt);
    },
    disposeInternalV1(this: NarrativeStablePhysicalActionAdmissionInternalV1): void {
      if (this !== authority || !active) return;
      active = false;
      if (bridgeRecord.hostPhysicalActionAdmission === authority) {
        bridgeRecord.hostPhysicalActionAdmission = null;
      }
    },
  });
  bridgeRecord.hostPhysicalActionAdmission = authority;
  return authority;
}

export function createNarrativeStablePhysicalActionAdmissionInternalV1(
  input: CreateNarrativeStablePhysicalActionAdmissionInputInternalV1,
): NarrativeStablePhysicalActionAdmissionInternalV1 {
  const bridge = input.bridge;
  const inputRouter = input.inputRouter;
  const isGestureCurrent = input.isGestureCurrent;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  const sessionRecord = bridgeRecord?.session === null || bridgeRecord?.session === undefined
    ? null
    : narrativeStableSessionRecordsInternalV1.get(bridgeRecord.session) ?? null;
  const hostHistoryActionBinding =
    sessionRecord?.actionBindingRecords.findLast((candidate) =>
      candidate.kind === "history" && candidate.active && candidate.committed &&
      sessionRecord.currentRenderSnapshot.entries.some((entry) => {
        const entryRecord = narrativeStableHostRenderEntryRecordsInternalV1.get(entry);
        return entry.kind === "history" &&
          (entry.phase === "active" || entry.phase === "suspended") &&
          entryRecord?.attempt === candidate.provenance;
      })
    ) ?? null;
  const adoptsHostHistoryActionBinding = bridgeRecord !== undefined &&
    hostHistoryActionBinding !== null && hostHistoryActionBinding.binding !== null &&
    hostHistoryActionBinding.claimedRoute !== null &&
    hostHistoryActionBinding.inputRouter === inputRouter &&
    hostHistoryActionBinding.isGestureCurrent === isGestureCurrent &&
    bridgeRecord.physicalActionAdmissionClaim === hostHistoryActionBinding.admissionClaim;
  if (adoptsHostHistoryActionBinding) {
    return bridgeRecord.hostPhysicalActionAdmission ??
      createNarrativeStableHostHistoryPhysicalActionAdmissionInternalV1(
        bridgeRecord,
        hostHistoryActionBinding,
      );
  }
  const hostActionBinding = bridgeRecord?.currentHostRootActionBinding ?? null;
  const adoptsHostActionBinding = bridgeRecord !== undefined && hostActionBinding !== null &&
    hostActionBinding.kind === "root" && hostActionBinding.active && hostActionBinding.committed &&
    hostActionBinding.binding !== null && hostActionBinding.claimedRoute !== null &&
    hostActionBinding.runtimeRecord !== null &&
    hostActionBinding.runtimeRecord.active &&
    hostActionBinding.runtimeRecord.sessionRecord.currentHostRuntime ===
      hostActionBinding.runtimeRecord &&
    hostActionBinding.runtimeRecord.inputRouter === inputRouter &&
    hostActionBinding.runtimeRecord.isGestureCurrent === isGestureCurrent &&
    bridgeRecord.physicalActionAdmissionClaim === hostActionBinding.admissionClaim;
  if (
    bridgeRecord === undefined ||
    (bridgeRecord.physicalActionAdmissionClaim !== null && !adoptsHostActionBinding)
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_invalid");
  }
  if (adoptsHostActionBinding && bridgeRecord.hostPhysicalActionAdmission !== null) {
    return bridgeRecord.hostPhysicalActionAdmission;
  }
  const stableActionAuthority = adoptsHostActionBinding
    ? hostActionBinding.authority as ManagedSurfaceStableActionRouteAuthorityInternalV1
    : claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      bridgeRecord.compositeRuntimeKernel,
    );
  const captureCurrentStableInput = captureOwnCallableInternalV1(
    stableActionAuthority,
    "captureCurrentStableInputInternalV1",
  );
  const captureReadyActiveTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "captureReadyActiveStableTargetInternalV1",
  );
  const isCurrentDirectTarget = captureOwnCallableInternalV1(
    stableActionAuthority,
    "isCurrentDirectTargetInternalV1",
  );
  const inspectAdmittedTargetFrame = captureOwnCallableInternalV1(
    bridge,
    "inspectAdmittedTargetFrameInternalV1",
  );
  if (
    captureCurrentStableInput === null || captureReadyActiveTarget === null ||
    isCurrentDirectTarget === null ||
    inspectAdmittedTargetFrame === null ||
    (typeof inputRouter !== "object" && typeof inputRouter !== "function") ||
    inputRouter === null || typeof isGestureCurrent !== "function"
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_invalid");
  }

  let initialCapture;
  try {
    initialCapture = Reflect.apply(captureCurrentStableInput, stableActionAuthority, []);
  } catch (error) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable", { cause: error });
  }
  if (
    typeof initialCapture !== "object" || initialCapture === null ||
    (initialCapture as { readonly kind?: unknown }).kind !== "captured"
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable");
  }
  const capturedInitial = initialCapture as ReturnType<
    ManagedSurfaceStableActionRouteAuthorityInternalV1["captureCurrentStableInputInternalV1"]
  >;
  if (
    capturedInitial.kind !== "captured" || capturedInitial.directTarget === null ||
    capturedInitial.sourceRevision === null || capturedInitial.targetProof === null
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable");
  }
  const initialFrame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
    capturedInitial.directTarget,
  ]) as NarrativeStableAdmittedFrameInternalV1 | null;
  if (
    initialFrame === null ||
    (initialFrame.pending.kind !== "say" && initialFrame.pending.kind !== "choice" &&
      initialFrame.pending.kind !== "pause" && initialFrame.pending.kind !== "custom" &&
      initialFrame.pending.kind !== "presentation_barrier") ||
    !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
      initialFrame.candidateSnapshot.semanticDispatchPort,
    )
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable");
  }

  let active = true;
  let authority!: NarrativeStablePhysicalActionAdmissionInternalV1;
  const admissionClaim = adoptsHostActionBinding
    ? hostActionBinding.admissionClaim
    : Object.freeze({});
  if (!adoptsHostActionBinding) bridgeRecord.physicalActionAdmissionClaim = admissionClaim;
  let binding: ManagedSurfaceActionBindingV1;
  let claimedRoute: ManagedSurfaceAuthenticatedActionRouteInternalV1<
    unknown,
    NarrativeStablePhysicalActionDispatchResultInternalV1
  >;
  const consume = (
    { actionId, attempt }: Readonly<{
      readonly actionId: ManagedSurfaceActionIdV1;
      readonly attempt: unknown;
    }>,
  ): NarrativeStablePhysicalActionDispatchResultInternalV1 => {
    if (!active) {
      return narrativePhysicalActionStaleResultInternalV1;
    }
    const isSayAlias = actionId === narrativeConfirmActionIdInternalV1 ||
      actionId === narrativeAdvanceActionIdInternalV1;
    const isHistoryOpen = actionId === narrativeToggleHistoryActionIdInternalV1;
    const requestedPlaybackMode = actionId === narrativeToggleAutoActionIdInternalV1
      ? "auto"
      : actionId === narrativeToggleSkipActionIdInternalV1
      ? "skip"
      : null;
    const mappedKind = isHistoryOpen
      ? "history_open"
      : requestedPlaybackMode !== null
      ? "playback_mode_toggle"
      : actionId === narrativeReplayVoiceActionIdInternalV1
      ? "voice_replay"
      : actionId === narrativeChooseActionIdInternalV1
      ? "choice"
      : actionId === narrativeResumeActionIdInternalV1
      ? "pause_resume"
      : actionId === narrativeCustomActionIdInternalV1
      ? "custom"
      : isSayAlias
      ? "say_activation"
      : null;
    if (mappedKind === null) {
      return narrativePhysicalActionUnmappedResultInternalV1;
    }
    if (
      (typeof attempt === "object" || typeof attempt === "function") && attempt !== null
    ) {
      const historyRecord = narrativeStableHistoryOpenActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStableHistoryOpenActionAttemptInternalV1,
      );
      if (
        historyRecord !== undefined && historyRecord.authority === authority &&
        !historyRecord.spent && mappedKind !== "history_open"
      ) {
        return narrativePhysicalActionUnmappedResultInternalV1;
      }
      const playbackModeRecord = narrativeStablePlaybackModeToggleActionAttemptRecordsInternalV1
        .get(
          attempt as NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
        );
      if (
        playbackModeRecord !== undefined && playbackModeRecord.authority === authority &&
        !playbackModeRecord.spent &&
        (requestedPlaybackMode === null ||
          playbackModeRecord.requestedMode !== requestedPlaybackMode)
      ) {
        return narrativePhysicalActionUnmappedResultInternalV1;
      }
    }
    if (mappedKind === "history_open") {
      if (
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativeHistoryOpenStaleResultInternalV1;
      }

      const otherPhysicalRecord = narrativeStablePhysicalActionAttemptRecordsInternalV1.get(
        attempt as
          | NarrativeStableChoiceActionAttemptInternalV1
          | NarrativeStablePauseResumeActionAttemptInternalV1
          | NarrativeStableCustomActionAttemptInternalV1
          | NarrativeStableSayActivationAttemptInternalV1,
      );
      const otherVoiceRecord = narrativeStableVoiceReplayActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStableVoiceReplayActionAttemptInternalV1,
      );
      const otherModeRecord = narrativeStablePlaybackModeToggleActionAttemptRecordsInternalV1
        .get(
          attempt as NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
        );
      if (
        (otherPhysicalRecord !== undefined &&
          otherPhysicalRecord.authority === authority && !otherPhysicalRecord.spent) ||
        (otherVoiceRecord !== undefined && otherVoiceRecord.authority === authority &&
          !otherVoiceRecord.spent) ||
        (otherModeRecord !== undefined && otherModeRecord.authority === authority &&
          !otherModeRecord.spent)
      ) {
        return narrativePhysicalActionUnmappedResultInternalV1;
      }

      const record = narrativeStableHistoryOpenActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStableHistoryOpenActionAttemptInternalV1,
      );
      if (
        record === undefined || record.kind !== "history_open" ||
        record.authority !== authority || record.spent
      ) {
        return narrativeHistoryOpenStaleResultInternalV1;
      }
      record.spent = true;

      const classifyCurrentHistoryParent = ():
        | "current"
        | "stale"
        | "faulted" => {
        if (
          !active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          record.stableActionAuthority !== stableActionAuthority
        ) {
          return "stale";
        }

        try {
          const readyActive = applyNarrativePhysicalActionInternalV1(
            captureReadyActiveTarget,
            stableActionAuthority,
            [record.directParent],
          ) as ReturnType<
            ManagedSurfaceStableActionRouteAuthorityInternalV1[
              "captureReadyActiveStableTargetInternalV1"
            ]
          >;
          if (readyActive.kind === "faulted") return "faulted";
          if (
            readyActive.kind !== "captured" ||
            readyActive.directTarget !== record.directParent ||
            readyActive.sourceRevision !== record.sourceRevision
          ) {
            return "stale";
          }
          if (
            applyNarrativePhysicalActionInternalV1(
              isCurrentDirectTarget,
              stableActionAuthority,
              [record.targetProof],
            ) !== true
          ) {
            return "stale";
          }
          const current = applyNarrativePhysicalActionInternalV1(
            captureCurrentStableInput,
            stableActionAuthority,
            [],
          ) as ReturnType<
            ManagedSurfaceStableActionRouteAuthorityInternalV1[
              "captureCurrentStableInputInternalV1"
            ]
          >;
          if (current.kind === "faulted") return "faulted";
          if (
            current.kind !== "captured" || current.directTarget !== record.directParent ||
            current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
            !equalManagedSurfaceInputBindingContractV1(
              current.contract,
              capturedInitial.contract,
            ) ||
            applyNarrativePhysicalActionInternalV1(
                isCurrentDirectTarget,
                stableActionAuthority,
                [current.targetProof],
              ) !== true
          ) {
            return "stale";
          }
          const frame = applyNarrativePhysicalActionInternalV1(
            inspectAdmittedTargetFrame,
            bridge,
            [current.directTarget],
          ) as NarrativeStableAdmittedFrameInternalV1 | null;
          if (
            frame !== record.frame ||
            frame?.candidateSnapshot.historyAvailabilityPort !==
              record.historyAvailabilityPort
          ) {
            return "stale";
          }
          if (
            frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "pause" && frame.pending.kind !== "custom" &&
            frame.pending.kind !== "presentation_barrier"
          ) {
            return "faulted";
          }
          return "current";
        } catch {
          return "faulted";
        }
      };

      const initialKind = classifyCurrentHistoryParent();
      if (initialKind === "stale") return narrativeHistoryOpenStaleResultInternalV1;
      if (initialKind === "faulted") return narrativeHistoryOpenFaultedResultInternalV1;
      if (
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativeHistoryOpenStaleResultInternalV1;
      }
      const availabilityBinding = narrativeStableHistoryAvailabilityPortBindingsInternalV1.get(
        record.historyAvailabilityPort,
      );
      if (availabilityBinding === undefined) {
        return narrativeHistoryOpenFaultedResultInternalV1;
      }

      const callbackClaim = freezeNarrativePhysicalActionDataInternalV1({});
      bridgeRecord.sayCallbackClaim = callbackClaim;
      try {
        const preCallKind = classifyCurrentHistoryParent();
        if (
          preCallKind === "stale" || bridgeRecord.sayCallbackClaim !== callbackClaim ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return narrativeHistoryOpenStaleResultInternalV1;
        }
        if (preCallKind === "faulted") {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }

        let callbackOutcome: unknown;
        let callbackThrew = false;
        try {
          callbackOutcome = applyNarrativePhysicalActionInternalV1(
            availabilityBinding.readHistoryAvailability,
            availabilityBinding.receiver,
            [],
          );
        } catch {
          callbackThrew = true;
        }

        const postCallKind = classifyCurrentHistoryParent();
        if (
          postCallKind === "stale" || bridgeRecord.sayCallbackClaim !== callbackClaim ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return narrativeHistoryOpenStaleResultInternalV1;
        }
        if (postCallKind === "faulted") {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }
        if (callbackThrew || typeof callbackOutcome !== "boolean") {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }
        if (!callbackOutcome) return narrativeHistoryOpenIgnoredResultInternalV1;

        let intent: NarrativeStableHistoryOpenIntentInternalV1;
        let requestedResult: Extract<
          NarrativeStableHistoryOpenDispatchResultInternalV1,
          { kind: "requested" }
        >;
        let intentRecord: NarrativeStableHistoryOpenIntentRecordInternalV1;
        try {
          intent = freezeNarrativePhysicalActionDataInternalV1(
            {},
          ) as NarrativeStableHistoryOpenIntentInternalV1;
          requestedResult = freezeNarrativePhysicalActionDataInternalV1({
            kind: "requested" as const,
            intent,
            completion: null,
          });
          intentRecord = {
            bridge,
            stableActionAuthority,
            targetProof: record.targetProof,
            directParent: record.directParent,
            sourceRevision: record.sourceRevision,
            frame: record.frame,
            spent: false,
          };
        } catch {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }

        const finalKind = classifyCurrentHistoryParent();
        if (
          finalKind === "stale" || bridgeRecord.sayCallbackClaim !== callbackClaim ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return narrativeHistoryOpenStaleResultInternalV1;
        }
        if (finalKind === "faulted") {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }
        try {
          applyNarrativePhysicalActionInternalV1(
            setNarrativeWeakMapValueInternalV1,
            narrativeStableHistoryOpenIntentRecordsInternalV1,
            [intent, intentRecord],
          );
        } catch {
          return narrativeHistoryOpenFaultedResultInternalV1;
        }
        return requestedResult;
      } finally {
        if (bridgeRecord.sayCallbackClaim === callbackClaim) {
          bridgeRecord.sayCallbackClaim = null;
        }
      }
    }
    if (mappedKind === "playback_mode_toggle") {
      if (
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      const record = narrativeStablePlaybackModeToggleActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
      );
      if (
        record === undefined || record.authority !== authority || record.spent ||
        record.requestedMode !== requestedPlaybackMode
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      record.spent = true;

      const classifyCurrentPlaybackModeTarget = ():
        | "say"
        | "non_say"
        | "stale"
        | "faulted" => {
        if (
          !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.currentModeState !== record.issuanceModeState
        ) {
          return "stale";
        }

        let targetIsCurrent: unknown;
        try {
          targetIsCurrent = Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [
            record.targetProof,
          ]);
        } catch {
          return "faulted";
        }
        if (targetIsCurrent !== true) return "stale";

        let current: ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        try {
          current = Reflect.apply(
            captureCurrentStableInput,
            stableActionAuthority,
            [],
          ) as typeof current;
        } catch {
          return "faulted";
        }
        if (current.kind === "faulted") return "faulted";
        if (
          current.kind !== "captured" || current.directTarget !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(
            current.contract,
            capturedInitial.contract,
          )
        ) {
          return "stale";
        }

        try {
          if (
            Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [
              current.targetProof,
            ]) !== true
          ) {
            return "stale";
          }
        } catch {
          return "faulted";
        }

        let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null;
        try {
          currentFrame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
            current.directTarget,
          ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        } catch {
          return "faulted";
        }
        if (currentFrame !== record.frame) return "stale";
        if (currentFrame.pending.kind === "say") return "say";
        if (
          currentFrame.pending.kind === "choice" || currentFrame.pending.kind === "pause" ||
          currentFrame.pending.kind === "custom" ||
          currentFrame.pending.kind === "presentation_barrier"
        ) {
          return "non_say";
        }
        return "faulted";
      };

      const currentKind = classifyCurrentPlaybackModeTarget();
      if (currentKind === "stale") return narrativePlaybackModeStaleResultInternalV1;
      if (currentKind === "faulted") return narrativePlaybackModeFaultedResultInternalV1;
      if (currentKind === "non_say") {
        return record.issuanceModeState.mode === "normal"
          ? narrativePlaybackModeIgnoredResultInternalV1
          : narrativePlaybackModeFaultedResultInternalV1;
      }

      let successorModeState: NarrativeStablePlaybackModeStateInternalV1;
      let toggledResult: Extract<
        NarrativeStablePlaybackModeToggleDispatchResultInternalV1,
        { kind: "toggled" }
      >;
      try {
        const successorMode = toggledPlaybackModeInternalV1(
          record.issuanceModeState.mode,
          requestedPlaybackMode,
        );
        successorModeState = createNarrativePlaybackModeStateInternalV1(successorMode);
        toggledResult = playbackModeToggledResultInternalV1(successorMode);
      } catch {
        return narrativePlaybackModeFaultedResultInternalV1;
      }

      const finalKind = classifyCurrentPlaybackModeTarget();
      if (finalKind === "stale") return narrativePlaybackModeStaleResultInternalV1;
      if (finalKind !== "say") return narrativePlaybackModeFaultedResultInternalV1;
      if (
        !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.currentModeState !== record.issuanceModeState
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      if (
        !compareAndSetNarrativePlaybackModeStateInternalV1(
          bridgeRecord,
          record.issuanceModeState,
          successorModeState,
        )
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      return toggledResult;
    }
    if (mappedKind === "voice_replay") {
      if (
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const record = narrativeStableVoiceReplayActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStableVoiceReplayActionAttemptInternalV1,
      );
      if (
        record === undefined || record.kind !== "voice_replay" ||
        record.authority !== authority || record.spent
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      record.spent = true;

      const captureExactCurrentVoiceFrame = ():
        | NarrativeStableAdmittedFrameInternalV1
        | null => {
        if (
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim || !active ||
          !bridgeRecord.isActiveInternalV1()
        ) {
          return null;
        }
        if (
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [record.targetProof]) !==
            true
        ) {
          return null;
        }
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(
            current.contract,
            capturedInitial.contract,
          )
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        return frame === record.frame && frame?.pending.kind === "say" &&
            frame.candidateSnapshot.voiceReplayPort === record.voiceReplayPort
          ? frame
          : null;
      };

      try {
        if (captureExactCurrentVoiceFrame() === null) {
          return narrativePhysicalActionStaleResultInternalV1;
        }
      } catch {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      if (record.voiceReplayPort === null) {
        return narrativeVoiceReplayIgnoredResultInternalV1;
      }
      const voiceBinding = narrativeStableVoiceReplayPortBindingsInternalV1.get(
        record.voiceReplayPort,
      );
      if (voiceBinding === undefined) return narrativePhysicalActionStaleResultInternalV1;
      if (
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const callbackClaim = freezeNarrativePhysicalActionDataInternalV1({});
      bridgeRecord.sayCallbackClaim = callbackClaim;
      try {
        let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null = null;
        try {
          currentFrame = captureExactCurrentVoiceFrame();
        } catch {
          currentFrame = null;
        }
        if (
          currentFrame === null || bridgeRecord.sayCallbackClaim !== callbackClaim ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return narrativePhysicalActionStaleResultInternalV1;
        }

        let callbackOutcome: unknown;
        let callbackThrew = false;
        try {
          callbackOutcome = Reflect.apply(
            voiceBinding.replayCurrentVoice,
            voiceBinding.receiver,
            [],
          );
        } catch {
          callbackThrew = true;
        }

        try {
          currentFrame = captureExactCurrentVoiceFrame();
        } catch {
          currentFrame = null;
        }
        if (
          currentFrame === null || bridgeRecord.sayCallbackClaim !== callbackClaim ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return narrativePhysicalActionStaleResultInternalV1;
        }
        if (callbackThrew || typeof callbackOutcome !== "boolean") {
          return narrativePhysicalActionFaultedResultInternalV1;
        }
        return callbackOutcome
          ? narrativeVoiceReplayHandledResultInternalV1
          : narrativeVoiceReplayIgnoredResultInternalV1;
      } finally {
        if (bridgeRecord.sayCallbackClaim === callbackClaim) {
          bridgeRecord.sayCallbackClaim = null;
        }
      }
    }
    if (
      isSayAlias &&
      (typeof attempt === "object" || typeof attempt === "function") && attempt !== null
    ) {
      const voiceRecord = narrativeStableVoiceReplayActionAttemptRecordsInternalV1.get(
        attempt as NarrativeStableVoiceReplayActionAttemptInternalV1,
      );
      if (
        voiceRecord !== undefined && voiceRecord.authority === authority &&
        !voiceRecord.spent
      ) {
        return narrativePhysicalActionUnmappedResultInternalV1;
      }
    }
    if ((typeof attempt !== "object" && typeof attempt !== "function") || attempt === null) {
      return narrativePhysicalActionStaleResultInternalV1;
    }
    const record = narrativeStablePhysicalActionAttemptRecordsInternalV1.get(
      attempt as
        | NarrativeStableChoiceActionAttemptInternalV1
        | NarrativeStablePauseResumeActionAttemptInternalV1
        | NarrativeStableCustomActionAttemptInternalV1
        | NarrativeStableSayActivationAttemptInternalV1,
    );
    if (record === undefined || record.authority !== authority || record.spent) {
      return narrativePhysicalActionStaleResultInternalV1;
    }
    if (record.kind !== mappedKind) {
      return isSayAlias
        ? narrativePhysicalActionUnmappedResultInternalV1
        : narrativePhysicalActionStaleResultInternalV1;
    }
    if (record.kind === "say_activation") {
      const controllerRecord = narrativeStableSayRevealControllerRecordsInternalV1.get(
        record.controller,
      );
      if (
        controllerRecord === undefined || !controllerRecord.active ||
        controllerRecord.bridgeRecord !== bridgeRecord ||
        controllerRecord.controllerClaim !== record.controllerClaim ||
        bridgeRecord.sayRevealControllerClaim !== record.controllerClaim ||
        controllerRecord.currentActivationAttempt !== attempt ||
        controllerRecord.callbackClaim !== null ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const captureExactCurrentSayFrame = (): NarrativeStableAdmittedFrameInternalV1 | null => {
        if (
          !active || !controllerRecord.active ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          bridgeRecord.sayRevealControllerClaim !== record.controllerClaim ||
          controllerRecord.controllerClaim !== record.controllerClaim ||
          controllerRecord.directTarget !== record.directTarget ||
          controllerRecord.sourceRevision !== record.sourceRevision ||
          controllerRecord.frame !== record.frame ||
          controllerRecord.semanticDispatchPort !== record.semanticDispatchPort ||
          !controllerRecord.isCurrentInternalV1() ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [record.targetProof]) !==
            true
        ) {
          return null;
        }
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(
            current.contract,
            capturedInitial.contract,
          )
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        return frame === record.frame && frame?.pending.kind === "say" &&
            frame.candidateSnapshot.semanticDispatchPort === record.semanticDispatchPort
          ? frame
          : null;
      };

      try {
        if (captureExactCurrentSayFrame() === null) {
          return narrativePhysicalActionStaleResultInternalV1;
        }
      } catch {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const boundaryClaim = freezeNarrativePhysicalActionDataInternalV1({});
      if (
        controllerRecord.callbackClaim !== null ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      controllerRecord.callbackClaim = boundaryClaim;
      bridgeRecord.sayCallbackClaim = boundaryClaim;
      record.spent = true;
      controllerRecord.currentActivationAttempt = null;
      if (controllerRecord.currentContentAutoAttempt !== null) {
        const automaticCompetitor = narrativeStableSayContentAutoAttemptRecordsInternalV1.get(
          controllerRecord.currentContentAutoAttempt,
        );
        if (automaticCompetitor !== undefined) automaticCompetitor.spent = true;
        controllerRecord.currentContentAutoAttempt = null;
      }

      const releaseCallbackBoundary = (): void => {
        if (bridgeRecord.sayCallbackClaim === boundaryClaim) {
          bridgeRecord.sayCallbackClaim = null;
        }
        if (controllerRecord.callbackClaim === boundaryClaim) {
          controllerRecord.callbackClaim = null;
        }
        if (!controllerRecord.active) {
          controllerRecord.releaseLifecycleObserverInternalV1();
        }
      };

      let phase: unknown;
      let phaseThrew = false;
      try {
        phase = Reflect.apply(
          controllerRecord.capturePhase,
          controllerRecord.receiver,
          [],
        );
      } catch {
        phaseThrew = true;
      }

      let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null = null;
      try {
        currentFrame = captureExactCurrentSayFrame();
      } catch {
        currentFrame = null;
      }
      if (currentFrame === null) {
        releaseCallbackBoundary();
        return narrativePhysicalActionStaleResultInternalV1;
      }
      if (phaseThrew || (phase !== "incomplete" && phase !== "complete")) {
        releaseCallbackBoundary();
        return narrativePhysicalActionFaultedResultInternalV1;
      }

      if (phase === "incomplete") {
        let revealThrew = false;
        try {
          Reflect.apply(controllerRecord.revealAll, controllerRecord.receiver, []);
        } catch {
          revealThrew = true;
        }
        try {
          currentFrame = captureExactCurrentSayFrame();
        } catch {
          currentFrame = null;
        }
        releaseCallbackBoundary();
        if (currentFrame === null) return narrativePhysicalActionStaleResultInternalV1;
        return revealThrew
          ? narrativePhysicalActionFaultedResultInternalV1
          : narrativePhysicalActionRevealedResultInternalV1;
      }

      return controllerRecord.dispatchAdvanceInternalV1(
        boundaryClaim,
        captureExactCurrentSayFrame,
      );
    }
    record.spent = true;

    try {
      if (
        Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [record.targetProof]) !==
          true
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const current = Reflect.apply(
        captureCurrentStableInput,
        stableActionAuthority,
        [],
      ) as ReturnType<
        ManagedSurfaceStableActionRouteAuthorityInternalV1[
          "captureCurrentStableInputInternalV1"
        ]
      >;
      if (
        current.kind !== "captured" || current.directTarget !== record.directTarget ||
        current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
        !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract)
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const currentFrame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
        current.directTarget,
      ]) as NarrativeStableAdmittedFrameInternalV1 | null;
      if (
        currentFrame !== record.frame || currentFrame === null ||
        currentFrame.candidateSnapshot.semanticDispatchPort !== record.semanticDispatchPort ||
        currentFrame.pending.occurrenceId !== record.frame.pending.occurrenceId ||
        (record.kind === "choice"
          ? currentFrame.pending.kind !== "choice" ||
            !currentFrame.pending.options.some((option) => option.choiceId === record.choiceId)
          : record.kind === "pause_resume"
          ? currentFrame.pending.kind !== "pause" || !currentFrame.pending.skippable
          : currentFrame.pending.kind !== "custom")
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const portBinding = narrativeStableSemanticResolutionPortBindingsInternalV1.get(
        record.semanticDispatchPort,
      );
      if (portBinding === undefined) return narrativePhysicalActionFaultedResultInternalV1;
      const resolution: InteractionResolutionV1 = record.kind === "choice"
        ? freezeNarrativePhysicalActionDataInternalV1({
          kind: "choose" as const,
          choiceId: record.choiceId,
        })
        : record.kind === "pause_resume"
        ? freezeNarrativePhysicalActionDataInternalV1({ kind: "resume" as const })
        : freezeNarrativePhysicalActionDataInternalV1({
          kind: "custom" as const,
          payload: record.payload,
        });
      const request = freezeNarrativePhysicalActionDataInternalV1({
        expectedOccurrenceId: currentFrame.pending.occurrenceId,
        resolution,
      }) satisfies NarrativeStableSemanticResolutionRequestInternalV1;
      if (
        Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [record.targetProof]) !==
          true
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      let completion: Promise<unknown>;
      try {
        completion = Promise.resolve(
          Reflect.apply(portBinding.dispatchResolution, portBinding.receiver, [request]),
        );
      } catch (error) {
        completion = Promise.reject(error);
      }
      return freezeNarrativePhysicalActionDataInternalV1({
        kind: "dispatched" as const,
        completion,
      });
    } catch {
      return narrativePhysicalActionFaultedResultInternalV1;
    }
  };
  try {
    if (adoptsHostActionBinding) {
      binding = hostActionBinding.binding!;
      claimedRoute = hostActionBinding.claimedRoute!;
      hostActionBinding.delegate = consume;
    } else {
      binding = createManagedSurfaceContractBoundActionBindingInternalV1({
        authority: stableActionAuthority,
        contract: capturedInitial.contract,
        inputRouter,
        isGestureCurrent,
      });
      claimedRoute = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);
    }
  } catch (error) {
    if (adoptsHostActionBinding) hostActionBinding.delegate = null;
    if (
      !adoptsHostActionBinding && bridgeRecord.physicalActionAdmissionClaim === admissionClaim
    ) {
      bridgeRecord.physicalActionAdmissionClaim = null;
    }
    throw error;
  }

  try {
    const postClaimCapture = Reflect.apply(
      captureCurrentStableInput,
      stableActionAuthority,
      [],
    ) as ReturnType<
      ManagedSurfaceStableActionRouteAuthorityInternalV1[
        "captureCurrentStableInputInternalV1"
      ]
    >;
    if (
      postClaimCapture.kind !== "captured" ||
      postClaimCapture.directTarget !== capturedInitial.directTarget ||
      postClaimCapture.sourceRevision !== capturedInitial.sourceRevision ||
      postClaimCapture.targetProof === null ||
      !equalManagedSurfaceInputBindingContractV1(
        postClaimCapture.contract,
        capturedInitial.contract,
      ) ||
      Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [
          postClaimCapture.targetProof,
        ]) !== true ||
      Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          postClaimCapture.directTarget,
        ]) !== initialFrame
    ) {
      throw new TypeError("ui.narrative_stable_action_admission_unavailable");
    }
  } catch (error) {
    if (adoptsHostActionBinding) {
      hostActionBinding.delegate = null;
    } else {
      claimedRoute.disposeInternalV1();
      if (bridgeRecord.physicalActionAdmissionClaim === admissionClaim) {
        bridgeRecord.physicalActionAdmissionClaim = null;
      }
    }
    if (
      error instanceof TypeError &&
      error.message === "ui.narrative_stable_action_admission_unavailable"
    ) {
      throw error;
    }
    throw new TypeError("ui.narrative_stable_action_admission_unavailable", { cause: error });
  }

  authority = Object.freeze({
    createEnvelopeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      request: {
        readonly actionId: ManagedSurfaceActionIdV1;
        readonly gestureId: ManagedSurfaceGestureIdV1;
      },
    ): ManagedSurfaceActionEnvelopeV1 {
      if (this !== authority || !active) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return binding.createEnvelope(request);
    },
    issueChoiceAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      choiceId: unknown,
    ): NarrativeStableChoiceActionAttemptInternalV1 | null {
      if (this !== authority || !active || typeof choiceId !== "string") return null;
      try {
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null || frame.pending.kind !== "choice" ||
          !frame.pending.options.some((option) => option.choiceId === choiceId) ||
          !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
            frame.candidateSnapshot.semanticDispatchPort,
          )
        ) {
          return null;
        }
        const attempt = Object.freeze(
          {},
        ) as NarrativeStableChoiceActionAttemptInternalV1;
        narrativeStablePhysicalActionAttemptRecordsInternalV1.set(attempt, {
          kind: "choice",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          choiceId,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        return attempt;
      } catch {
        return null;
      }
    },
    issuePauseResumeAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
    ): NarrativeStablePauseResumeActionAttemptInternalV1 | null {
      if (this !== authority || !active) return null;
      try {
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null || frame.pending.kind !== "pause" || !frame.pending.skippable ||
          !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
            frame.candidateSnapshot.semanticDispatchPort,
          )
        ) {
          return null;
        }
        const attempt = Object.freeze(
          {},
        ) as NarrativeStablePauseResumeActionAttemptInternalV1;
        narrativeStablePhysicalActionAttemptRecordsInternalV1.set(attempt, {
          kind: "pause_resume",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        return attempt;
      } catch {
        return null;
      }
    },
    issueCustomAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      payload: unknown,
    ): NarrativeStableCustomActionAttemptInternalV1 | null {
      if (this !== authority || !active) return null;
      try {
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null || frame.pending.kind !== "custom" ||
          !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
            frame.candidateSnapshot.semanticDispatchPort,
          )
        ) {
          return null;
        }

        const resolution = parseInteractionResolutionV1(
          freezeNarrativePhysicalActionDataInternalV1({ kind: "custom" as const, payload }),
        );
        if (resolution.kind !== "custom") return null;
        if (!active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim) return null;

        const refreshed = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          refreshed.kind !== "captured" || refreshed.directTarget !== current.directTarget ||
          refreshed.sourceRevision !== current.sourceRevision || refreshed.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(
            refreshed.contract,
            capturedInitial.contract,
          ) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [
              refreshed.targetProof,
            ]) !== true ||
          Reflect.apply(inspectAdmittedTargetFrame, bridge, [
              refreshed.directTarget,
            ]) !== frame ||
          !active ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim
        ) {
          return null;
        }

        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableCustomActionAttemptInternalV1;
        narrativeStablePhysicalActionAttemptRecordsInternalV1.set(attempt, {
          kind: "custom",
          authority,
          targetProof: refreshed.targetProof,
          directTarget: refreshed.directTarget,
          sourceRevision: refreshed.sourceRevision,
          frame,
          payload: resolution.payload,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        return attempt;
      } catch {
        return null;
      }
    },
    issueSayActivationAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      controller: unknown,
    ): NarrativeStableSayActivationAttemptInternalV1 | null {
      if (
        this !== authority || !active ||
        (typeof controller !== "object" && typeof controller !== "function") ||
        controller === null
      ) {
        return null;
      }
      const controllerRecord = narrativeStableSayRevealControllerRecordsInternalV1.get(
        controller as NarrativeStableSayRevealControllerInternalV1,
      );
      if (
        controllerRecord === undefined || !controllerRecord.active ||
        controllerRecord.bridgeRecord !== bridgeRecord ||
        bridgeRecord.sayRevealControllerClaim !== controllerRecord.controllerClaim ||
        controllerRecord.callbackClaim !== null ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null ||
        !controllerRecord.isCurrentInternalV1()
      ) {
        return null;
      }
      try {
        if (controllerRecord.currentActivationAttempt !== null) {
          const predecessor = narrativeStablePhysicalActionAttemptRecordsInternalV1.get(
            controllerRecord.currentActivationAttempt,
          );
          if (
            predecessor !== undefined && !predecessor.spent &&
            predecessor.kind === "say_activation" && predecessor.authority === authority &&
            Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [
                predecessor.targetProof,
              ]) === true
          ) {
            return null;
          }
          if (predecessor !== undefined) predecessor.spent = true;
          controllerRecord.currentActivationAttempt = null;
        }

        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true ||
          current.directTarget !== controllerRecord.directTarget ||
          current.sourceRevision !== controllerRecord.sourceRevision
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null || frame !== controllerRecord.frame || frame.pending.kind !== "say" ||
          frame.candidateSnapshot.semanticDispatchPort !==
            controllerRecord.semanticDispatchPort ||
          !controllerRecord.active ||
          bridgeRecord.sayRevealControllerClaim !== controllerRecord.controllerClaim ||
          controllerRecord.callbackClaim !== null ||
          bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null ||
          !controllerRecord.isCurrentInternalV1()
        ) {
          return null;
        }
        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableSayActivationAttemptInternalV1;
        narrativeStablePhysicalActionAttemptRecordsInternalV1.set(attempt, {
          kind: "say_activation",
          authority,
          controller: controller as NarrativeStableSayRevealControllerInternalV1,
          controllerClaim: controllerRecord.controllerClaim,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        });
        controllerRecord.currentActivationAttempt = attempt;
        return attempt;
      } catch {
        return null;
      }
    },
    issueVoiceReplayAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
    ): NarrativeStableVoiceReplayActionAttemptInternalV1 | null {
      if (
        this !== authority || !active ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        if (!bridgeRecord.isActiveInternalV1()) return null;
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null || frame.pending.kind !== "say" ||
          (frame.candidateSnapshot.voiceReplayPort !== null &&
            !narrativeStableVoiceReplayPortBindingsInternalV1.has(
              frame.candidateSnapshot.voiceReplayPort,
            )) ||
          !active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return null;
        }
        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableVoiceReplayActionAttemptInternalV1;
        narrativeStableVoiceReplayActionAttemptRecordsInternalV1.set(attempt, {
          kind: "voice_replay",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          voiceReplayPort: frame.candidateSnapshot.voiceReplayPort,
          spent: false,
        });
        return attempt;
      } catch {
        return null;
      }
    },
    issuePlaybackModeToggleAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      requestedMode: "auto" | "skip",
    ): NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null {
      if (
        this !== authority || !active ||
        (requestedMode !== "auto" && requestedMode !== "skip") ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null
      ) {
        return null;
      }
      try {
        const issuanceModeState = bridgeRecord.currentModeState;
        const current = Reflect.apply(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          Reflect.apply(isCurrentDirectTarget, stableActionAuthority, [current.targetProof]) !==
            true
        ) {
          return null;
        }
        const frame = Reflect.apply(inspectAdmittedTargetFrame, bridge, [
          current.directTarget,
        ]) as NarrativeStableAdmittedFrameInternalV1 | null;
        if (
          frame === null ||
          (frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "pause" && frame.pending.kind !== "custom" &&
            frame.pending.kind !== "presentation_barrier") ||
          (frame.pending.kind !== "say" && issuanceModeState.mode !== "normal") ||
          !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.currentModeState !== issuanceModeState
        ) {
          return null;
        }
        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStablePlaybackModeToggleActionAttemptInternalV1;
        narrativeStablePlaybackModeToggleActionAttemptRecordsInternalV1.set(attempt, {
          authority,
          requestedMode,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          issuanceModeState,
          spent: false,
        });
        return attempt;
      } catch {
        return null;
      }
    },
    issueHistoryOpenAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
    ): NarrativeStableHistoryOpenActionAttemptInternalV1 | null {
      if (
        this !== authority || !active ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        const current = applyNarrativePhysicalActionInternalV1(
          captureCurrentStableInput,
          stableActionAuthority,
          [],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureCurrentStableInputInternalV1"
          ]
        >;
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          applyNarrativePhysicalActionInternalV1(
              isCurrentDirectTarget,
              stableActionAuthority,
              [current.targetProof],
            ) !== true
        ) {
          return null;
        }
        const frame = applyNarrativePhysicalActionInternalV1(
          inspectAdmittedTargetFrame,
          bridge,
          [current.directTarget],
        ) as NarrativeStableAdmittedFrameInternalV1 | null;
        const readyActive = applyNarrativePhysicalActionInternalV1(
          captureReadyActiveTarget,
          stableActionAuthority,
          [current.directTarget],
        ) as ReturnType<
          ManagedSurfaceStableActionRouteAuthorityInternalV1[
            "captureReadyActiveStableTargetInternalV1"
          ]
        >;
        if (
          frame === null ||
          readyActive.kind !== "captured" ||
          readyActive.directTarget !== current.directTarget ||
          readyActive.sourceRevision !== current.sourceRevision ||
          (frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "pause" && frame.pending.kind !== "custom" &&
            frame.pending.kind !== "presentation_barrier") ||
          !narrativeStableHistoryAvailabilityPortBindingsInternalV1.has(
            frame.candidateSnapshot.historyAvailabilityPort,
          ) ||
          !active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null ||
          applyNarrativePhysicalActionInternalV1(
              isCurrentDirectTarget,
              stableActionAuthority,
              [current.targetProof],
            ) !== true ||
          applyNarrativePhysicalActionInternalV1(
              inspectAdmittedTargetFrame,
              bridge,
              [current.directTarget],
            ) !== frame
        ) {
          return null;
        }

        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableHistoryOpenActionAttemptInternalV1;
        const attemptRecord: NarrativeStableHistoryOpenActionAttemptRecordInternalV1 = {
          kind: "history_open",
          authority,
          stableActionAuthority,
          targetProof: current.targetProof,
          directParent: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          historyAvailabilityPort: frame.candidateSnapshot.historyAvailabilityPort,
          spent: false,
        };
        applyNarrativePhysicalActionInternalV1(
          setNarrativeWeakMapValueInternalV1,
          narrativeStableHistoryOpenActionAttemptRecordsInternalV1,
          [attempt, attemptRecord],
        );
        return attempt;
      } catch {
        return null;
      }
    },
    routeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      envelope: ManagedSurfaceActionEnvelopeV1,
      attempt: unknown,
    ): ManagedSurfaceAuthenticatedActionRouteResultInternalV1<
      NarrativeStablePhysicalActionDispatchResultInternalV1
    > {
      if (this !== authority) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return claimedRoute.routeInternalV1(envelope, attempt);
    },
    disposeInternalV1(this: NarrativeStablePhysicalActionAdmissionInternalV1): void {
      if (this !== authority || !active) return;
      active = false;
      if (adoptsHostActionBinding) {
        hostActionBinding.delegate = null;
        if (bridgeRecord.hostPhysicalActionAdmission === authority) {
          bridgeRecord.hostPhysicalActionAdmission = null;
        }
      } else {
        claimedRoute.disposeInternalV1();
        if (bridgeRecord.physicalActionAdmissionClaim === admissionClaim) {
          bridgeRecord.physicalActionAdmissionClaim = null;
        }
      }
    },
  });
  if (adoptsHostActionBinding) bridgeRecord.hostPhysicalActionAdmission = authority;
  return authority;
}

export function createNarrativeStableBarrierAcknowledgmentControllerInternalV1(
  input: CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1,
): NarrativeStableBarrierAcknowledgmentControllerInternalV1 {
  let inputRecord: CapturedOwnDataRecordInternalV1 | null = null;
  try {
    inputRecord = captureOwnDataRecordInternalV1(input);
  } catch {
    inputRecord = null;
  }
  if (
    inputRecord === null ||
    !capturedRecordHasExactKeysInternalV1(inputRecord, ["bridge", "stageReconciler"])
  ) {
    throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
  }
  const bridge = inputRecord.values.bridge as NarrativeStablePublisherBridgeInternalV1;
  const stageReconciler = inputRecord.values.stageReconciler as StageReconcilerV1;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  if (
    bridgeRecord === undefined || !bridgeRecord.isActiveInternalV1() ||
    bridgeRecord.barrierAcknowledgmentControllerClaim !== null
  ) {
    throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
  }

  const captureCurrentBarrierIdentity = ():
    | NarrativeStableBarrierTargetIdentityInternalV1
    | null => {
    if (!bridgeRecord.isActiveInternalV1()) return null;
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.frame.pending.kind !== "presentation_barrier" ||
      !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
        current.frame.candidateSnapshot.semanticDispatchPort,
      )
    ) {
      return null;
    }
    return freezeNarrativePhysicalActionDataInternalV1({
      target: current.target,
      semanticOccurrenceId: current.frame.semanticOccurrenceId,
      canonicalPendingBytes: current.canonicalPendingBytes,
      expectedTransitionId: current.frame.pending.expectedTransitionId,
    });
  };

  const identityStillCurrent = (
    identity: NarrativeStableBarrierTargetIdentityInternalV1,
  ): boolean => {
    if (!bridgeRecord.isActiveInternalV1()) return false;
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    return current !== null && current.target === identity.target &&
      current.frame.pending.kind === "presentation_barrier" &&
      current.frame.semanticOccurrenceId === identity.semanticOccurrenceId &&
      current.frame.pending.expectedTransitionId === identity.expectedTransitionId &&
      bytesEqualInternalV1(current.canonicalPendingBytes, identity.canonicalPendingBytes);
  };

  const captureCurrentBarrierRecoveryTarget = ():
    | NarrativeStableBarrierRecoveryTargetIdentityInternalV1
    | null => {
    if (!bridgeRecord.isActiveInternalV1()) return null;
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.frame.pending.kind !== "presentation_barrier" ||
      !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
        current.frame.candidateSnapshot.semanticDispatchPort,
      )
    ) {
      return null;
    }
    return freezeNarrativePhysicalActionDataInternalV1({
      targetIdentity: freezeNarrativePhysicalActionDataInternalV1({
        target: current.target,
        semanticOccurrenceId: current.frame.semanticOccurrenceId,
        canonicalPendingBytes: current.canonicalPendingBytes,
        expectedTransitionId: current.frame.pending.expectedTransitionId,
      }),
      loadRecovery: current.frame.pending.loadRecovery,
    });
  };

  const recoveryTargetStillCurrent = (
    target: NarrativeStableBarrierRecoveryTargetIdentityInternalV1,
  ): boolean => {
    if (!bridgeRecord.isActiveInternalV1()) return false;
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    return current !== null && current.target === target.targetIdentity.target &&
      current.frame.pending.kind === "presentation_barrier" &&
      current.frame.semanticOccurrenceId === target.targetIdentity.semanticOccurrenceId &&
      current.frame.pending.expectedTransitionId === target.targetIdentity.expectedTransitionId &&
      current.frame.pending.loadRecovery === target.loadRecovery &&
      bytesEqualInternalV1(
        current.canonicalPendingBytes,
        target.targetIdentity.canonicalPendingBytes,
      );
  };

  const controllerClaim = freezeNarrativePhysicalActionDataInternalV1({});
  let stageAuthority: StageAcknowledgedRunAuthorityInternalV1;
  let stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  try {
    stageAuthority = claimStageAcknowledgedRunAuthorityInternalV1(
      stageReconciler,
      bridgeRecord.barrierStageClaimant,
    );
    stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      bridgeRecord.compositeRuntimeKernel,
    );
  } catch (error) {
    throw new TypeError("ui.narrative_stable_barrier_controller_invalid", { cause: error });
  }

  let controller!: NarrativeStableBarrierAcknowledgmentControllerInternalV1;
  const record: NarrativeStableBarrierAcknowledgmentControllerRecordInternalV1 = {
    bridgeRecord,
    controllerClaim,
    stageAuthority,
    stableActionAuthority,
    active: true,
    stageRetargetInProgress: false,
    evidence: null,
    terminalResult: null,
  };

  const subscribeState = captureOwnCallableInternalV1(
    bridgeRecord.compositeRuntimeKernel,
    "subscribeStateInternalV1",
  );
  if (subscribeState === null) {
    throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
  }
  let observerActive = true;
  let unsubscribeState = (): void => {};
  const releaseObserver = (): void => {
    if (!observerActive) return;
    observerActive = false;
    try {
      unsubscribeState();
    } catch {
      // Exact claim cleanup remains fail closed when an observer wrapper throws.
    }
  };

  const sameRecoveryTarget = (
    left: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null,
    right: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null,
  ): boolean => {
    if (left === null || right === null) return left === right;
    return left.targetIdentity.target === right.targetIdentity.target &&
      left.targetIdentity.semanticOccurrenceId === right.targetIdentity.semanticOccurrenceId &&
      left.targetIdentity.expectedTransitionId === right.targetIdentity.expectedTransitionId &&
      left.loadRecovery === right.loadRecovery &&
      bytesEqualInternalV1(
        left.targetIdentity.canonicalPendingBytes,
        right.targetIdentity.canonicalPendingBytes,
      );
  };

  const recoveryTargetMatchesProjection = (
    target: NarrativeStableBarrierRecoveryTargetIdentityInternalV1,
    current: NarrativeStableCurrentTargetProjectionInternalV1 | null,
  ): boolean =>
    current !== null && current.target === target.targetIdentity.target &&
    current.frame.pending.kind === "presentation_barrier" &&
    current.frame.semanticOccurrenceId === target.targetIdentity.semanticOccurrenceId &&
    current.frame.pending.expectedTransitionId === target.targetIdentity.expectedTransitionId &&
    current.frame.pending.loadRecovery === target.loadRecovery &&
    bytesEqualInternalV1(
      current.canonicalPendingBytes,
      target.targetIdentity.canonicalPendingBytes,
    );

  const retireRecoveryTarget = (
    generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
  ): void => {
    if (generation.preexistingTargetRetired) return;
    generation.preexistingTargetRetired = true;
    retireNarrativeBarrierRecoveryAttemptInternalV1(generation);
    generation.replayUnsupportedResult = null;
    try {
      generation.releaseObserverInternalV1();
    } catch {
      // Target retirement remains fail closed when an observer wrapper throws.
    }
  };

  const maintainRecoveryGeneration = (
    generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
  ): void => {
    if (generation.retired || generation.preexistingTargetRetired) return;
    if (
      !bridgeRecord.isActiveInternalV1() ||
      bridgeRecord.barrierRecoveryGeneration !== generation
    ) {
      retireNarrativeBarrierRecoveryGenerationInternalV1(generation);
      return;
    }
    const preexistingTarget = generation.preexistingTarget;
    if (preexistingTarget === null) return;
    let current: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
    try {
      current = bridgeRecord.captureCurrentTargetInternalV1();
    } catch {
      current = null;
    }
    if (!recoveryTargetMatchesProjection(preexistingTarget, current)) {
      retireRecoveryTarget(generation);
      return;
    }
    const attempt = generation.currentAttempt;
    if (attempt === null) return;
    const attemptRecord = narrativeStableBarrierRecoveryAttemptRecordsInternalV1.get(attempt);
    let attemptCurrent = false;
    try {
      attemptCurrent = attemptRecord !== undefined && !attemptRecord.spent &&
        attemptRecord.generation === generation && current !== null &&
        current.sourceRevision === attemptRecord.sourceRevision &&
        current.frame === attemptRecord.frame &&
        current.frame.candidateSnapshot.semanticDispatchPort ===
          attemptRecord.semanticDispatchPort &&
        generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
          attemptRecord.proof,
        );
    } catch {
      attemptCurrent = false;
    }
    if (!attemptCurrent) retireNarrativeBarrierRecoveryAttemptInternalV1(generation);
  };

  const readRecoveryGate = (
    generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
  ): "open" | "closed" | "stale" | "faulted" => {
    if (generation.retired || generation.ingressState === "invalid") return "stale";
    if (!matchesNarrativeBarrierActivationGateBindingInternalV1(generation.activationGate)) {
      generation.ingressState = "invalid";
      return "stale";
    }
    let open: unknown;
    try {
      open = Reflect.apply(
        generation.activationGate.isOpen,
        generation.activationGate.receiver,
        [],
      );
    } catch {
      generation.ingressState = "invalid";
      return "faulted";
    }
    if (typeof open !== "boolean") {
      generation.ingressState = "invalid";
      return "faulted";
    }
    if (!matchesNarrativeBarrierActivationGateBindingInternalV1(generation.activationGate)) {
      generation.ingressState = "invalid";
      return "stale";
    }
    if (open) {
      generation.ingressState = "open";
      return "open";
    }
    if (generation.ingressState === "open") {
      generation.ingressState = "invalid";
      return "stale";
    }
    return "closed";
  };

  const readRecoveryGenerationCurrent = (
    generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
  ): "current" | "stale" | "faulted" => {
    if (
      generation.retired || !bridgeRecord.isActiveInternalV1() ||
      generation.stageAuthority !== record.stageAuthority
    ) {
      return generation.stageAuthority === record.stageAuthority ? "stale" : "faulted";
    }
    try {
      const captured = record.stageAuthority.captureCurrentPresentationGenerationInternalV1(
        generation.stageProof,
      );
      if (captured.kind === "stale") return "stale";
      if (captured.kind === "captured" && captured.relation === "higher") return "stale";
      if (
        captured.kind !== "captured" || captured.relation !== "equal" ||
        captured.proof !== generation.stageProof
      ) {
        return "faulted";
      }
      return "current";
    } catch {
      return "faulted";
    }
  };

  const mapStageResult = (
    result: StageAcknowledgedRunRetargetResultInternalV1,
  ): NarrativeStableBarrierStageRetargetResultInternalV1 => {
    if (result.kind === "armed") return narrativeBarrierStageArmedResultInternalV1;
    if (result.kind === "stale") return narrativeBarrierStageStaleResultInternalV1;
    return narrativeBarrierStageFaultedResultInternalV1(result.code);
  };

  const retireEvidence = (
    result: NarrativeStableBarrierTerminalDispatchResultInternalV1,
  ): NarrativeStableBarrierTerminalDispatchResultInternalV1 => {
    const evidence = record.evidence;
    if (evidence !== null) {
      evidence.retired = true;
      if (
        evidence.inFlightClaim !== null &&
        bridgeRecord.barrierSemanticInFlightClaim === evidence.inFlightClaim
      ) {
        record.terminalResult = result;
        return result;
      }
      if (
        evidence.inFlightClaim !== null &&
        bridgeRecord.barrierCallbackClaim === evidence.inFlightClaim
      ) {
        bridgeRecord.barrierCallbackClaim = null;
      }
      evidence.inFlightClaim = null;
      if (bridgeRecord.barrierTargetTerminalClaim === evidence.terminalClaim) {
        bridgeRecord.barrierTargetTerminalClaim = null;
      }
    }
    record.evidence = null;
    record.terminalResult = result;
    if (!record.active) releaseObserver();
    return result;
  };

  controller = freezeNarrativePhysicalActionDataInternalV1({
    retargetPresentationStageInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      retarget: StageRetargetInputV1,
    ): StagePresentationGenerationRetargetResultInternalV1 {
      if (this !== controller) {
        throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
      }
      if (
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim
      ) {
        return freezeNarrativePhysicalActionDataInternalV1({ kind: "stale" as const });
      }
      const currentGeneration = bridgeRecord.barrierRecoveryGeneration;
      if (
        currentGeneration !== null &&
        (currentGeneration.stageAuthority !== record.stageAuthority ||
          currentGeneration.callbackClaim !== null)
      ) {
        return freezeNarrativePhysicalActionDataInternalV1({ kind: "faulted" as const });
      }
      if (bridgeRecord.barrierRecoverySynchronizationClaim !== null) {
        bridgeRecord.barrierRecoverySynchronizationPoisoned = true;
        return freezeNarrativePhysicalActionDataInternalV1({ kind: "faulted" as const });
      }
      if (record.stageRetargetInProgress) {
        return freezeNarrativePhysicalActionDataInternalV1({ kind: "faulted" as const });
      }
      record.stageRetargetInProgress = true;
      try {
        return record.stageAuthority.retargetPresentationGenerationInternalV1(retarget);
      } catch {
        return freezeNarrativePhysicalActionDataInternalV1({ kind: "faulted" as const });
      } finally {
        record.stageRetargetInProgress = false;
      }
    },

    synchronizeRecoveryGenerationInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
    ): NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1 {
      if (this !== controller) {
        throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
      }
      if (
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim
      ) {
        return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
      }
      if (bridgeRecord.barrierRecoverySynchronizationClaim !== null) {
        bridgeRecord.barrierRecoverySynchronizationPoisoned = true;
        return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
      }
      if (record.stageRetargetInProgress) {
        return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
      }

      const existing = bridgeRecord.barrierRecoveryGeneration;
      if (existing !== null && existing.stageAuthority !== record.stageAuthority) {
        return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
      }
      if (existing !== null && existing.callbackClaim !== null) {
        return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
      }
      let synchronizationClaim: object | null = null;
      record.stageRetargetInProgress = true;
      try {
        let captured;
        try {
          captured = record.stageAuthority.captureCurrentPresentationGenerationInternalV1(
            existing?.stageProof ?? null,
          );
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (captured.kind === "stale") {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        if (captured.kind === "faulted") {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (captured.relation === "equal") {
          if (existing === null || captured.proof !== existing.stageProof) {
            return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
          }
          if (activationGate !== existing.activationGate.receiver) {
            return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
          }
          return freezeNarrativePhysicalActionDataInternalV1({
            kind: "unchanged" as const,
            generation: existing.generation,
          });
        }
        if (
          (captured.relation === "initial" && existing !== null) ||
          (captured.relation === "higher" && existing === null)
        ) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (bridgeRecord.barrierRecoverySynchronizationClaim !== null) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        synchronizationClaim = freezeNarrativePhysicalActionDataInternalV1({});
        bridgeRecord.barrierRecoverySynchronizationClaim = synchronizationClaim;
        bridgeRecord.barrierRecoverySynchronizationPoisoned = false;

        const gateBinding = captureNarrativeBarrierActivationGateInternalV1(activationGate);
        if (gateBinding === null) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        let initiallyOpen: unknown;
        try {
          initiallyOpen = Reflect.apply(gateBinding.isOpen, gateBinding.receiver, []);
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (typeof initiallyOpen !== "boolean") {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (initiallyOpen) return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        if (bridgeRecord.barrierRecoverySynchronizationPoisoned) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }

        let preexistingTarget: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null;
        try {
          preexistingTarget = captureCurrentBarrierRecoveryTarget();
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }

        let currentGeneration;
        try {
          currentGeneration = record.stageAuthority
            .captureCurrentPresentationGenerationInternalV1(captured.proof);
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (currentGeneration.kind === "stale") {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        if (
          currentGeneration.kind !== "captured" || currentGeneration.relation !== "equal" ||
          currentGeneration.proof !== captured.proof
        ) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (!matchesNarrativeBarrierActivationGateBindingInternalV1(gateBinding)) {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        if (bridgeRecord.barrierRecoverySynchronizationPoisoned) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        let stillClosed: unknown;
        try {
          stillClosed = Reflect.apply(gateBinding.isOpen, gateBinding.receiver, []);
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (typeof stillClosed !== "boolean") {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (stillClosed) return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        if (!matchesNarrativeBarrierActivationGateBindingInternalV1(gateBinding)) {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        if (bridgeRecord.barrierRecoverySynchronizationPoisoned) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }

        let currentTarget: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null;
        try {
          currentTarget = captureCurrentBarrierRecoveryTarget();
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (
          !sameRecoveryTarget(preexistingTarget, currentTarget) || !record.active ||
          !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoverySynchronizationClaim !== synchronizationClaim ||
          bridgeRecord.barrierRecoverySynchronizationPoisoned ||
          bridgeRecord.barrierRecoveryGeneration !== existing
        ) {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }

        let finalGeneration;
        try {
          finalGeneration = record.stageAuthority
            .captureCurrentPresentationGenerationInternalV1(captured.proof);
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (finalGeneration.kind === "stale") {
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        if (
          finalGeneration.kind !== "captured" || finalGeneration.relation !== "equal" ||
          finalGeneration.proof !== captured.proof
        ) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }

        const generation = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableBarrierRecoveryGenerationInternalV1;
        let observerInstalled = false;
        let generationObserverActive = true;
        let unsubscribeGeneration = (): void => {};
        let nextGeneration!: NarrativeStableBarrierRecoveryGenerationRecordInternalV1;
        const releaseGenerationObserver = (): void => {
          if (!generationObserverActive) return;
          generationObserverActive = false;
          try {
            unsubscribeGeneration();
          } catch {
            // Generation retirement remains fail closed when unsubscribe throws.
          }
        };
        nextGeneration = {
          generation,
          stageAuthority: record.stageAuthority,
          stableActionAuthority: record.stableActionAuthority,
          stageProof: captured.proof,
          activationGate: gateBinding,
          preexistingTarget,
          releaseObserverInternalV1: releaseGenerationObserver,
          ingressState: "closed",
          retired: false,
          preexistingTargetRetired: false,
          callbackClaim: null,
          currentAttempt: null,
          replayUnsupportedResult: null,
        };
        let subscribed: unknown;
        try {
          subscribed = Reflect.apply(
            bridgeRecord.subscribeStateInternalV1,
            bridgeRecord.compositeRuntimeKernel,
            [() => {
              if (observerInstalled) maintainRecoveryGeneration(nextGeneration);
            }],
          );
        } catch {
          releaseGenerationObserver();
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (typeof subscribed !== "function") {
          releaseGenerationObserver();
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        unsubscribeGeneration = subscribed as () => void;
        if (bridgeRecord.barrierRecoverySynchronizationPoisoned) {
          releaseGenerationObserver();
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        let finalTarget: NarrativeStableBarrierRecoveryTargetIdentityInternalV1 | null;
        try {
          finalTarget = captureCurrentBarrierRecoveryTarget();
        } catch {
          releaseGenerationObserver();
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (
          !record.active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoverySynchronizationClaim !== synchronizationClaim ||
          bridgeRecord.barrierRecoverySynchronizationPoisoned ||
          bridgeRecord.barrierRecoveryGeneration !== existing ||
          !matchesNarrativeBarrierActivationGateBindingInternalV1(gateBinding) ||
          !sameRecoveryTarget(preexistingTarget, finalTarget)
        ) {
          releaseGenerationObserver();
          return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
        }
        bridgeRecord.barrierRecoveryGeneration = nextGeneration;
        observerInstalled = true;
        if (existing !== null) {
          retireNarrativeBarrierRecoveryGenerationInternalV1(existing);
        }
        return freezeNarrativePhysicalActionDataInternalV1({
          kind: "installed" as const,
          generation,
        });
      } finally {
        if (bridgeRecord.barrierRecoverySynchronizationClaim === synchronizationClaim) {
          bridgeRecord.barrierRecoverySynchronizationClaim = null;
          bridgeRecord.barrierRecoverySynchronizationPoisoned = false;
        }
        record.stageRetargetInProgress = false;
      }
    },

    issueSettleRecoveryAttemptInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
    ): NarrativeStableBarrierRecoveryAttemptInternalV1 | null {
      if (
        this !== controller || !record.active || !bridgeRecord.isActiveInternalV1() ||
        record.stageRetargetInProgress ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
        bridgeRecord.barrierRecoverySynchronizationClaim !== null
      ) {
        return null;
      }
      const generation = bridgeRecord.barrierRecoveryGeneration;
      if (
        generation === null || generation.retired || generation.preexistingTargetRetired ||
        generation.callbackClaim !== null || generation.preexistingTarget === null ||
        generation.preexistingTarget.loadRecovery !== "settle"
      ) {
        return null;
      }
      const gateClaim = freezeNarrativePhysicalActionDataInternalV1({});
      generation.callbackClaim = gateClaim;
      record.stageRetargetInProgress = true;
      try {
        if (readRecoveryGenerationCurrent(generation) !== "current") return null;
        if (readRecoveryGate(generation) !== "open") return null;
        if (
          generation.callbackClaim !== gateClaim ||
          readRecoveryGenerationCurrent(generation) !== "current" ||
          !record.active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoveryGeneration !== generation
        ) {
          return null;
        }
        if (!recoveryTargetStillCurrent(generation.preexistingTarget)) return null;
        if (generation.currentAttempt !== null) {
          const predecessor = narrativeStableBarrierRecoveryAttemptRecordsInternalV1.get(
            generation.currentAttempt,
          );
          let predecessorCurrent = false;
          try {
            predecessorCurrent = predecessor !== undefined && !predecessor.spent &&
              generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
                predecessor.proof,
              );
          } catch {
            predecessorCurrent = false;
          }
          if (predecessorCurrent) return null;
          if (predecessor !== undefined) predecessor.spent = true;
          generation.currentAttempt = null;
        }

        const current = bridgeRecord.captureCurrentTargetInternalV1();
        if (
          current === null ||
          current.target !== generation.preexistingTarget.targetIdentity.target ||
          current.frame.pending.kind !== "presentation_barrier" ||
          current.frame.pending.loadRecovery !== "settle" ||
          current.frame.semanticOccurrenceId !==
            generation.preexistingTarget.targetIdentity.semanticOccurrenceId ||
          !bytesEqualInternalV1(
            current.canonicalPendingBytes,
            generation.preexistingTarget.targetIdentity.canonicalPendingBytes,
          )
        ) {
          return null;
        }
        const captured = generation.stableActionAuthority.captureReadyActiveStableTargetInternalV1(
          current.target,
        );
        if (
          captured.kind !== "captured" || captured.directTarget !== current.target ||
          captured.sourceRevision !== current.sourceRevision ||
          !generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
            captured.proof,
          )
        ) {
          return null;
        }
        const semanticDispatchPort = current.frame.candidateSnapshot.semanticDispatchPort;
        if (!narrativeStableSemanticResolutionPortBindingsInternalV1.has(semanticDispatchPort)) {
          return null;
        }
        if (
          !record.active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoveryGeneration !== generation ||
          generation.callbackClaim !== gateClaim ||
          readRecoveryGenerationCurrent(generation) !== "current" ||
          !recoveryTargetStillCurrent(generation.preexistingTarget)
        ) {
          return null;
        }
        const attempt = freezeNarrativePhysicalActionDataInternalV1(
          {},
        ) as NarrativeStableBarrierRecoveryAttemptInternalV1;
        narrativeStableBarrierRecoveryAttemptRecordsInternalV1.set(attempt, {
          generation,
          proof: captured.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort,
          spent: false,
        });
        generation.currentAttempt = attempt;
        return attempt;
      } catch {
        return null;
      } finally {
        if (generation.callbackClaim === gateClaim) generation.callbackClaim = null;
        record.stageRetargetInProgress = false;
      }
    },

    dispatchSettleRecoveryInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      attempt: unknown,
    ): NarrativeStableBarrierRecoveryDispatchResultInternalV1 {
      if (
        this !== controller || !record.active || !bridgeRecord.isActiveInternalV1() ||
        record.stageRetargetInProgress ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
        bridgeRecord.barrierRecoverySynchronizationClaim !== null ||
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativeBarrierRecoveryStaleResultInternalV1;
      }
      const attemptRecord = narrativeStableBarrierRecoveryAttemptRecordsInternalV1.get(
        attempt as NarrativeStableBarrierRecoveryAttemptInternalV1,
      );
      const generation = bridgeRecord.barrierRecoveryGeneration;
      if (
        attemptRecord === undefined || attemptRecord.spent || generation === null ||
        generation.retired || generation.preexistingTargetRetired ||
        generation.callbackClaim !== null || attemptRecord.generation !== generation ||
        generation.currentAttempt !== attempt || generation.preexistingTarget === null ||
        generation.preexistingTarget.loadRecovery !== "settle"
      ) {
        return narrativeBarrierRecoveryStaleResultInternalV1;
      }

      const gateClaim = freezeNarrativePhysicalActionDataInternalV1({});
      generation.callbackClaim = gateClaim;
      record.stageRetargetInProgress = true;
      try {
        const generationCurrent = readRecoveryGenerationCurrent(generation);
        if (generationCurrent === "faulted") {
          return narrativeBarrierRecoveryFaultedResultInternalV1;
        }
        if (generationCurrent !== "current") {
          return narrativeBarrierRecoveryStaleResultInternalV1;
        }
        let current: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
        try {
          current = bridgeRecord.captureCurrentTargetInternalV1();
        } catch {
          current = null;
        }
        if (
          current === null || current.target !== attemptRecord.directTarget ||
          current.sourceRevision !== attemptRecord.sourceRevision ||
          current.frame !== attemptRecord.frame ||
          current.frame.candidateSnapshot.semanticDispatchPort !==
            attemptRecord.semanticDispatchPort ||
          !recoveryTargetStillCurrent(generation.preexistingTarget) ||
          !generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
            attemptRecord.proof,
          )
        ) {
          return narrativeBarrierRecoveryStaleResultInternalV1;
        }

        const gateState = readRecoveryGate(generation);
        if (gateState === "faulted") return narrativeBarrierRecoveryFaultedResultInternalV1;
        if (gateState !== "open") return narrativeBarrierRecoveryStaleResultInternalV1;
        const postGateGeneration = readRecoveryGenerationCurrent(generation);
        if (postGateGeneration === "faulted") {
          return narrativeBarrierRecoveryFaultedResultInternalV1;
        }
        let postGateCurrent: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
        try {
          postGateCurrent = bridgeRecord.captureCurrentTargetInternalV1();
        } catch {
          postGateCurrent = null;
        }
        if (
          postGateGeneration !== "current" || generation.callbackClaim !== gateClaim ||
          !record.active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoveryGeneration !== generation || attemptRecord.spent ||
          generation.currentAttempt !== attempt || postGateCurrent === null ||
          postGateCurrent.target !== attemptRecord.directTarget ||
          postGateCurrent.sourceRevision !== attemptRecord.sourceRevision ||
          postGateCurrent.frame !== attemptRecord.frame ||
          postGateCurrent.frame.candidateSnapshot.semanticDispatchPort !==
            attemptRecord.semanticDispatchPort ||
          !recoveryTargetStillCurrent(generation.preexistingTarget) ||
          !generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
            attemptRecord.proof,
          )
        ) {
          return narrativeBarrierRecoveryStaleResultInternalV1;
        }
        const portBinding = narrativeStableSemanticResolutionPortBindingsInternalV1.get(
          attemptRecord.semanticDispatchPort,
        );
        if (portBinding === undefined) return narrativeBarrierRecoveryFaultedResultInternalV1;

        attemptRecord.spent = true;
        generation.currentAttempt = null;
        if (generation.callbackClaim === gateClaim) generation.callbackClaim = null;
        if (
          bridgeRecord.barrierTargetTerminalClaim !== null ||
          bridgeRecord.barrierCallbackClaim !== null ||
          bridgeRecord.barrierSemanticInFlightClaim !== null
        ) {
          return narrativeBarrierRecoveryStaleResultInternalV1;
        }

        const targetClaim = freezeNarrativePhysicalActionDataInternalV1({});
        const boundaryClaim = freezeNarrativePhysicalActionDataInternalV1({});
        bridgeRecord.barrierTargetTerminalClaim = targetClaim;
        bridgeRecord.barrierCallbackClaim = boundaryClaim;
        let finalGenerationCurrent: "current" | "stale" | "faulted" = "faulted";
        let finalCurrent = false;
        try {
          finalGenerationCurrent = readRecoveryGenerationCurrent(generation);
          finalCurrent = record.active && bridgeRecord.isActiveInternalV1() &&
            bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim &&
            bridgeRecord.barrierRecoveryGeneration === generation &&
            finalGenerationCurrent === "current" &&
            recoveryTargetStillCurrent(generation.preexistingTarget) &&
            generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
              attemptRecord.proof,
            );
        } catch {
          finalCurrent = false;
        }
        if (!finalCurrent) {
          if (bridgeRecord.barrierCallbackClaim === boundaryClaim) {
            bridgeRecord.barrierCallbackClaim = null;
          }
          if (bridgeRecord.barrierTargetTerminalClaim === targetClaim) {
            bridgeRecord.barrierTargetTerminalClaim = null;
          }
          return finalGenerationCurrent === "faulted"
            ? narrativeBarrierRecoveryFaultedResultInternalV1
            : narrativeBarrierRecoveryStaleResultInternalV1;
        }
        bridgeRecord.barrierCallbackClaim = null;
        bridgeRecord.barrierSemanticInFlightClaim = boundaryClaim;
        const resolution: InteractionResolutionV1 = freezeNarrativePhysicalActionDataInternalV1({
          kind: "barrier_completed" as const,
          transitionId: generation.preexistingTarget.targetIdentity.expectedTransitionId,
        });
        const request = freezeNarrativePhysicalActionDataInternalV1({
          expectedOccurrenceId: attemptRecord.frame.pending.occurrenceId,
          resolution,
        }) satisfies NarrativeStableSemanticResolutionRequestInternalV1;

        let semanticCompletion: Promise<unknown>;
        try {
          semanticCompletion = Promise.resolve(
            Reflect.apply(portBinding.dispatchResolution, portBinding.receiver, [request]),
          );
        } catch (error) {
          semanticCompletion = Promise.reject(error);
        }
        const settle = (): void => {
          if (bridgeRecord.barrierSemanticInFlightClaim === boundaryClaim) {
            bridgeRecord.barrierSemanticInFlightClaim = null;
          }
          if (bridgeRecord.barrierTargetTerminalClaim === targetClaim) {
            bridgeRecord.barrierTargetTerminalClaim = null;
          }
        };
        const completion = semanticCompletion.then(
          (value) => {
            settle();
            return value;
          },
          (error) => {
            settle();
            throw error;
          },
        );
        return freezeNarrativePhysicalActionDataInternalV1({
          kind: "dispatched" as const,
          completion,
        });
      } catch {
        return narrativeBarrierRecoveryStaleResultInternalV1;
      } finally {
        if (generation.callbackClaim === gateClaim) generation.callbackClaim = null;
        record.stageRetargetInProgress = false;
      }
    },

    readReplayRecoveryUnsupportedInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
    ): NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1 | null {
      if (
        this !== controller || !record.active || !bridgeRecord.isActiveInternalV1() ||
        record.stageRetargetInProgress ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
        bridgeRecord.barrierRecoverySynchronizationClaim !== null
      ) {
        return null;
      }
      const generation = bridgeRecord.barrierRecoveryGeneration;
      if (
        generation === null || generation.retired || generation.preexistingTargetRetired ||
        generation.callbackClaim !== null || generation.preexistingTarget === null ||
        generation.preexistingTarget.loadRecovery !== "replay" ||
        readRecoveryGenerationCurrent(generation) !== "current" ||
        !recoveryTargetStillCurrent(generation.preexistingTarget)
      ) {
        return null;
      }
      const gateClaim = freezeNarrativePhysicalActionDataInternalV1({});
      generation.callbackClaim = gateClaim;
      record.stageRetargetInProgress = true;
      try {
        if (readRecoveryGate(generation) !== "open") return null;
        if (
          generation.callbackClaim !== gateClaim ||
          !record.active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
          bridgeRecord.barrierRecoveryGeneration !== generation ||
          readRecoveryGenerationCurrent(generation) !== "current" ||
          !recoveryTargetStillCurrent(generation.preexistingTarget)
        ) {
          return null;
        }
        if (generation.replayUnsupportedResult !== null) {
          return generation.replayUnsupportedResult;
        }
        const result = freezeNarrativePhysicalActionDataInternalV1({
          kind: "unsupported" as const,
          code: "narrative.barrier_replay_unsupported" as const,
          completion: null,
        });
        generation.replayUnsupportedResult = result;
        return result;
      } catch {
        return null;
      } finally {
        if (generation.callbackClaim === gateClaim) generation.callbackClaim = null;
        record.stageRetargetInProgress = false;
      }
    },

    retargetCurrentBarrierStageInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      retarget: StageRetargetInputV1,
    ): NarrativeStableBarrierStageRetargetResultInternalV1 {
      if (this !== controller) {
        throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
      }
      if (
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim
      ) {
        return narrativeBarrierStageStaleResultInternalV1;
      }
      const currentGeneration = bridgeRecord.barrierRecoveryGeneration;
      if (
        currentGeneration !== null &&
        (currentGeneration.stageAuthority !== record.stageAuthority ||
          currentGeneration.callbackClaim !== null)
      ) {
        return narrativeBarrierStageFaultedResultInternalV1(
          "stage.acknowledged_run_faulted",
        );
      }
      if (bridgeRecord.barrierRecoverySynchronizationClaim !== null) {
        bridgeRecord.barrierRecoverySynchronizationPoisoned = true;
        return narrativeBarrierStageFaultedResultInternalV1(
          "stage.acknowledged_run_faulted",
        );
      }
      if (record.stageRetargetInProgress) {
        return narrativeBarrierStageFaultedResultInternalV1(
          "stage.acknowledged_run_faulted",
        );
      }
      if (bridgeRecord.barrierTargetTerminalClaim !== null) {
        const currentEvidence = record.evidence;
        if (
          currentEvidence !== null && !currentEvidence.retired &&
          !identityStillCurrent(currentEvidence.targetIdentity)
        ) {
          retireEvidence(narrativeBarrierStaleResultInternalV1);
        }
        if (bridgeRecord.barrierTargetTerminalClaim !== null) {
          return narrativeBarrierStageStaleResultInternalV1;
        }
      }

      let targetIdentity: NarrativeStableBarrierTargetIdentityInternalV1 | null;
      try {
        targetIdentity = captureCurrentBarrierIdentity();
      } catch {
        targetIdentity = null;
      }
      if (targetIdentity === null) return narrativeBarrierStageStaleResultInternalV1;
      const expectedTerminalClaim = bridgeRecord.barrierTargetTerminalClaim;

      let terminalDelivered = false;
      let installedTerminalClaim: object | null = null;
      const commitGuard: StageAcknowledgedRunCommitGuardInternalV1 =
        freezeNarrativePhysicalActionDataInternalV1({
          isCommitCurrentInternalV1(): boolean {
            return record.active && bridgeRecord.isActiveInternalV1() &&
              bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim &&
              bridgeRecord.barrierTargetTerminalClaim === expectedTerminalClaim &&
              identityStillCurrent(targetIdentity!);
          },
        });
      const terminalPort: StageAcknowledgedRunTerminalPortInternalV1 =
        freezeNarrativePhysicalActionDataInternalV1({
          deliverTerminalInternalV1(
            terminal: Parameters<
              StageAcknowledgedRunTerminalPortInternalV1["deliverTerminalInternalV1"]
            >[0],
          ): void {
            if (terminalDelivered) return;
            terminalDelivered = true;
            try {
              if (
                !record.active || !bridgeRecord.isActiveInternalV1() ||
                bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
                !identityStillCurrent(targetIdentity!)
              ) {
                record.evidence = null;
                record.terminalResult = narrativeBarrierStaleResultInternalV1;
                return;
              }
              if (bridgeRecord.barrierTargetTerminalClaim !== null) return;
              const terminalClaim = freezeNarrativePhysicalActionDataInternalV1({});
              installedTerminalClaim = terminalClaim;
              bridgeRecord.barrierTargetTerminalClaim = terminalClaim;
              const evidence: NarrativeStableBarrierTerminalEvidenceInternalV1 = {
                targetIdentity: targetIdentity!,
                proof: terminal.proof,
                outcome: terminal.outcome,
                terminalClaim,
                retired: false,
                inFlightClaim: null,
                dispatchedResult: null,
              };
              record.evidence = evidence;
              record.terminalResult = terminal.outcome === "cancelled"
                ? narrativeBarrierCancelledResultInternalV1
                : narrativeBarrierRetainedResultInternalV1;
            } catch {
              if (
                installedTerminalClaim !== null &&
                bridgeRecord.barrierTargetTerminalClaim === installedTerminalClaim &&
                record.evidence === null
              ) {
                bridgeRecord.barrierTargetTerminalClaim = null;
              }
              record.evidence = null;
              record.terminalResult = narrativeBarrierFaultedResultInternalV1;
            }
          },
        });

      let stageResult: StageAcknowledgedRunRetargetResultInternalV1;
      record.stageRetargetInProgress = true;
      try {
        stageResult = stageAuthority.retargetWithAcknowledgedRunInternalV1({
          retarget,
          expectedTransitionId: targetIdentity.expectedTransitionId,
          commitGuard,
          terminalPort,
        });
      } catch {
        return narrativeBarrierStageFaultedResultInternalV1(
          "stage.acknowledged_run_faulted",
        );
      } finally {
        record.stageRetargetInProgress = false;
      }
      return mapStageResult(stageResult);
    },

    flushRetainedTerminalInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
    ): NarrativeStableBarrierTerminalDispatchResultInternalV1 | null {
      if (this !== controller) {
        throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
      }
      if (
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim
      ) {
        return null;
      }
      const evidence = record.evidence;
      if (evidence === null) return record.terminalResult;
      if (evidence.retired) return narrativeBarrierStaleResultInternalV1;
      let targetCurrent = false;
      try {
        targetCurrent = identityStillCurrent(evidence.targetIdentity);
      } catch {
        targetCurrent = false;
      }
      if (!targetCurrent) {
        return retireEvidence(narrativeBarrierStaleResultInternalV1);
      }
      if (evidence.outcome === "cancelled") {
        record.terminalResult = narrativeBarrierCancelledResultInternalV1;
        return record.terminalResult;
      }
      if (evidence.dispatchedResult !== null) return evidence.dispatchedResult;
      let terminalStackActive = false;
      try {
        terminalStackActive = record.stageAuthority
          .isAcknowledgedRunTerminalStackActiveInternalV1(evidence.proof);
      } catch {
        record.terminalResult = narrativeBarrierFaultedResultInternalV1;
        return record.terminalResult;
      }
      if (record.stageRetargetInProgress || terminalStackActive) {
        record.terminalResult = narrativeBarrierRetainedResultInternalV1;
        return record.terminalResult;
      }
      if (
        evidence.inFlightClaim !== null || bridgeRecord.barrierCallbackClaim !== null ||
        bridgeRecord.barrierSemanticInFlightClaim !== null
      ) {
        return narrativeBarrierStaleResultInternalV1;
      }

      let current: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
      try {
        current = bridgeRecord.captureCurrentTargetInternalV1();
      } catch {
        return retireEvidence(narrativeBarrierStaleResultInternalV1);
      }
      if (
        current === null || current.target !== evidence.targetIdentity.target ||
        current.frame.pending.kind !== "presentation_barrier" ||
        current.frame.semanticOccurrenceId !== evidence.targetIdentity.semanticOccurrenceId ||
        !bytesEqualInternalV1(
          current.canonicalPendingBytes,
          evidence.targetIdentity.canonicalPendingBytes,
        )
      ) {
        return retireEvidence(narrativeBarrierStaleResultInternalV1);
      }
      let captured;
      try {
        captured = stableActionAuthority.captureReadyActiveStableTargetInternalV1(
          current.target,
        );
      } catch {
        return narrativeBarrierFaultedResultInternalV1;
      }
      if (captured.kind === "unavailable") {
        record.terminalResult = narrativeBarrierRetainedResultInternalV1;
        return record.terminalResult;
      }
      if (captured.kind === "faulted") {
        record.terminalResult = narrativeBarrierFaultedResultInternalV1;
        return record.terminalResult;
      }
      if (
        captured.directTarget !== current.target ||
        captured.sourceRevision !== current.sourceRevision ||
        !stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(captured.proof)
      ) {
        record.terminalResult = narrativeBarrierRetainedResultInternalV1;
        return record.terminalResult;
      }
      const portBinding = narrativeStableSemanticResolutionPortBindingsInternalV1.get(
        current.frame.candidateSnapshot.semanticDispatchPort,
      );
      if (portBinding === undefined) {
        record.terminalResult = narrativeBarrierFaultedResultInternalV1;
        return record.terminalResult;
      }

      const boundaryClaim = freezeNarrativePhysicalActionDataInternalV1({});
      bridgeRecord.barrierCallbackClaim = boundaryClaim;
      evidence.inFlightClaim = boundaryClaim;
      if (
        !identityStillCurrent(evidence.targetIdentity) ||
        !stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(captured.proof) ||
        bridgeRecord.barrierCallbackClaim !== boundaryClaim
      ) {
        return retireEvidence(narrativeBarrierStaleResultInternalV1);
      }
      bridgeRecord.barrierCallbackClaim = null;
      bridgeRecord.barrierSemanticInFlightClaim = boundaryClaim;
      const resolution: InteractionResolutionV1 = freezeNarrativePhysicalActionDataInternalV1({
        kind: "barrier_completed" as const,
        transitionId: evidence.targetIdentity.expectedTransitionId,
      });
      const request = freezeNarrativePhysicalActionDataInternalV1({
        expectedOccurrenceId: current.frame.pending.occurrenceId,
        resolution,
      }) satisfies NarrativeStableSemanticResolutionRequestInternalV1;

      let semanticCompletion: Promise<unknown>;
      try {
        semanticCompletion = Promise.resolve(
          Reflect.apply(portBinding.dispatchResolution, portBinding.receiver, [request]),
        );
      } catch (error) {
        semanticCompletion = Promise.reject(error);
      }
      const settle = (): void => {
        try {
          if (
            bridgeRecord.barrierSemanticInFlightClaim !== boundaryClaim ||
            evidence.inFlightClaim !== boundaryClaim
          ) {
            return;
          }
          bridgeRecord.barrierSemanticInFlightClaim = null;
          evidence.inFlightClaim = null;
          evidence.dispatchedResult = null;
          let stillCurrent = false;
          try {
            stillCurrent = !evidence.retired && identityStillCurrent(evidence.targetIdentity);
          } catch {
            stillCurrent = false;
          }
          if (
            record.active && bridgeRecord.isActiveInternalV1() &&
            record.evidence === evidence && stillCurrent &&
            bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim
          ) {
            record.terminalResult = narrativeBarrierRetainedResultInternalV1;
            return;
          }
          if (bridgeRecord.barrierTargetTerminalClaim === evidence.terminalClaim) {
            bridgeRecord.barrierTargetTerminalClaim = null;
          }
          if (record.evidence === evidence) {
            record.evidence = null;
            record.terminalResult = narrativeBarrierStaleResultInternalV1;
          }
        } finally {
          if (!record.active) releaseObserver();
        }
      };
      const completion = semanticCompletion.then(
        (value) => {
          settle();
          return value;
        },
        (error) => {
          settle();
          throw error;
        },
      );
      const dispatched = freezeNarrativePhysicalActionDataInternalV1({
        kind: "dispatched" as const,
        completion,
      });
      evidence.dispatchedResult = dispatched;
      record.terminalResult = dispatched;
      return dispatched;
    },

    disposeInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
    ): void {
      if (this !== controller || !record.active) return;
      record.active = false;
      const evidence = record.evidence;
      const semanticPending = evidence?.inFlightClaim !== null &&
        evidence?.inFlightClaim !== undefined &&
        bridgeRecord.barrierSemanticInFlightClaim === evidence.inFlightClaim;
      if (!semanticPending && evidence !== null) {
        if (bridgeRecord.barrierCallbackClaim === evidence.inFlightClaim) {
          bridgeRecord.barrierCallbackClaim = null;
        }
        if (bridgeRecord.barrierTargetTerminalClaim === evidence.terminalClaim) {
          bridgeRecord.barrierTargetTerminalClaim = null;
        }
        record.evidence = null;
      }
      record.terminalResult = null;
      if (bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim) {
        bridgeRecord.barrierAcknowledgmentControllerClaim = null;
      }
      if (!semanticPending) releaseObserver();
    },
  });
  narrativeStableBarrierAcknowledgmentControllerRecordsInternalV1.set(controller, record);
  bridgeRecord.barrierAcknowledgmentControllerClaim = controllerClaim;
  try {
    const subscribed = Reflect.apply(
      subscribeState,
      bridgeRecord.compositeRuntimeKernel,
      [
        () => {
          const evidence = record.evidence;
          if (evidence === null) {
            if (!record.active) releaseObserver();
            return;
          }
          let current = false;
          try {
            current = identityStillCurrent(evidence.targetIdentity);
          } catch {
            current = false;
          }
          if (!current) retireEvidence(narrativeBarrierStaleResultInternalV1);
        },
      ],
    );
    if (typeof subscribed !== "function") {
      throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
    }
    unsubscribeState = subscribed as () => void;
  } catch {
    record.active = false;
    if (bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim) {
      bridgeRecord.barrierAcknowledgmentControllerClaim = null;
    }
    releaseObserver();
    throw new TypeError("ui.narrative_stable_barrier_controller_invalid");
  }
  return controller;
}
