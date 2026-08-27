// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  type DeepReadonly,
  type NarrativeHistoryV1,
  parseInteractionResolutionV1,
  type InteractionResolutionV1,
  type PendingInteractionV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1, type PlayerProfileV1 } from "@sillymaker/base/runtime";
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
  captureManagedSurfacePreparedInputBindingContractInternalV1,
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
  type ManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionResultInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  type ManagedSurfaceStableReadinessCommitGuardInternalV1,
  claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildLifecycleAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1,
  claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1,
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeStateInstallParticipantInternalV1,
  type ManagedSurfaceStableCompositeStateInternalV1,
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
import type { ManagedSurfaceCompositeKernelBundleInternalV1 } from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 } from "../managed-surfaces/managed-surface-runtime-kernel.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "../managed-surfaces/managed-surface-stable-contract.ts";
import type {
  ManagedSurfaceStablePublisherInternalV1,
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
import type {
  CreateNarrativeStableDialoguePlayerControllerInputInternalV1,
  NarrativeStableDialoguePlayerClockPortInternalV1,
  NarrativeStableDialoguePlayerControllerInternalV1,
  NarrativeStableDialoguePlayerProfilePortInternalV1,
  NarrativeStablePlaybackModeResetAttemptInternalV1,
  NarrativeStablePlaybackModeResetDispatchResultInternalV1,
  NarrativeStableSayPlayerAutoAttemptInternalV1,
  NarrativeStableSayPlayerAutoDispatchResultInternalV1,
  NarrativeStableSaySkipAttemptInternalV1,
  NarrativeStableSaySkipDispatchResultInternalV1,
  NarrativeStableDialoguePlayerSnapshotInternalV1,
  NarrativeStableDialoguePlayerTextResolverPortInternalV1,
} from "./dialogue-player-controller.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  narrativeAdvanceActionIdInternalV1,
  narrativeCancelActionIdInternalV1,
  narrativeChooseActionIdInternalV1,
  narrativeConfirmActionIdInternalV1,
  narrativeCustomActionIdInternalV1,
  narrativeDialogueDefinitionInternalV1 as dialogueDefinitionInternalV1,
  narrativeDialogueDefinitionIdInternalV1 as dialogueDefinitionIdInternalV1,
  narrativeHistoryDefinitionInternalV1 as historyDefinitionInternalV1,
  narrativeHistoryDefinitionIdInternalV1 as historyDefinitionIdInternalV1,
  narrativeOwnerIdInternalV1 as ownerIdInternalV1,
  narrativeReplayVoiceActionIdInternalV1,
  narrativeResumeActionIdInternalV1,
  narrativeToggleAutoActionIdInternalV1,
  narrativeToggleHistoryActionIdInternalV1,
  narrativeToggleSkipActionIdInternalV1,
} from "./narrative-managed-surface-definition.ts";
import {
  createNarrativeStableHistoryRenderObservationInternalV1,
  retireNarrativeStableHistoryRenderObservationInternalV1,
  type NarrativeStableHistoryObservationPortInternalV1,
} from "./narrative-history-render-observation.ts";

export { createNarrativeManagedSurfaceFamilyContractInternalV1 };
export type {
  NarrativeStableHistoryObservationPortInternalV1,
  NarrativeStableHistoryRenderObservationInternalV1,
} from "./narrative-history-render-observation.ts";
export type { NarrativeManagedSurfaceFamilyContractInternalV1 } from "./narrative-managed-surface-definition.ts";

function narrativeAttemptRecordInternalV1<TRecord>(value: unknown): TRecord | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  return (value as { readonly recordInternalV1?: TRecord }).recordInternalV1 ?? null;
}

function createNarrativeAttemptInternalV1<TAttempt, TRecord>(record: TRecord): TAttempt {
  return { recordInternalV1: record } as TAttempt;
}

const narrativeStableHostReadyCommitFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};
const narrativeStableHostReadyCommitStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};
const narrativeStableReadinessSettledResultInternalV1 = {
  kind: "settled" as const,
  completion: null,
};
const narrativeStableReadinessStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};
const narrativeStableReadinessFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};
const narrativeStableHistoryChildClosedResultInternalV1 = {
  kind: "closed" as const,
  completion: null,
};
const narrativeStableHistoryChildDismissedResultInternalV1 = {
  kind: "dismissed" as const,
  completion: null,
};
const narrativeStableHistoryChildLockedResultInternalV1 = {
  kind: "locked" as const,
  completion: null,
};
const narrativeStableHistoryChildLifecycleStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};
const narrativeStableHistoryChildLifecycleFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

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

/**
 * The hold-scoped flavor of the session-level time verb: partial cadence
 * ticks, the expiry tick, and the skippable fold all report elapsed
 * milliseconds fenced to the admitted hold occurrence. The unfenced
 * (session-global) flavor has no UI dispatcher — reporting cadence outside
 * holds belongs to the Story/Host layer.
 */
export interface NarrativeStableSemanticTimeRequestInternalV1 {
  readonly elapsedMs: number;
  readonly expectedHoldOccurrenceId: string;
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
  /**
   * The session-level time verb. Absent when the Story binds no time
   * dispatcher; admitting a hold frame then faults its expiry controller
   * instead of silently never expiring.
   */
  readonly dispatchTimeInternalV1?: (
    request: NarrativeStableSemanticTimeRequestInternalV1,
  ) => Promise<unknown>;
}

export interface NarrativeStableSayRevealGenerationPortInternalV1 {
  readonly capturePhaseInternalV1: () => "incomplete" | "complete";
  readonly revealAllInternalV1: () => void;
}

export interface NarrativeStableVoiceReplayPortInternalV1 {
  readonly replayCurrentVoiceInternalV1: () => boolean;
}

export interface NarrativeStableVoiceActivityPortInternalV1 {
  readonly isCurrentVoicePlayingInternalV1: () => boolean;
}

export interface NarrativeStableHistoryAvailabilityPortInternalV1 {
  readonly readHistoryAvailabilityInternalV1: () => boolean;
}

export type NarrativeStableDialoguePlayerTextResolverInternalV1 = (
  textId: string,
) => string;

export interface NarrativeStableDialoguePlayerObservationInternalV1 {
  getSnapshotInternalV1(): NarrativeStableDialoguePlayerSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface NarrativeStableDialogueRendererPropsInternalV1 {
  readonly kind: "dialogue";
  readonly pending: DeepReadonly<PendingInteractionV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly textResolver: NarrativeStableDialoguePlayerTextResolverInternalV1;
  readonly quickMenuContribution: object | ((...args: never[]) => unknown) | null;
  readonly playerView: NarrativeStableDialoguePlayerSnapshotInternalV1;
}

export interface NarrativeStableHistoryRendererPropsInternalV1 {
  readonly kind: "history";
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly visualConfig: Readonly<object>;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly textResolver: NarrativeStableDialoguePlayerTextResolverInternalV1;
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
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
  readonly historyObservationPort: NarrativeStableHistoryObservationPortInternalV1;
  readonly historyAvailabilityPort: NarrativeStableHistoryAvailabilityPortInternalV1;
  readonly playerProfile: NarrativeStableDialoguePlayerProfilePortInternalV1;
  readonly presentationClock: NarrativeStableDialoguePlayerClockPortInternalV1;
  readonly textResolver: NarrativeStableDialoguePlayerTextResolverPortInternalV1;
  readonly voiceReplayPort: NarrativeStableVoiceReplayPortInternalV1 | null;
  readonly voiceActivityPort?: NarrativeStableVoiceActivityPortInternalV1 | null;
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
    pending: PendingInteractionV1 | null,
  ): NarrativeStablePublisherBridgeResultInternalV1;
  retryCurrentPendingInternalV1(): NarrativeStablePublisherBridgeResultInternalV1;
  disposeInternalV1(): ManagedSurfaceStableReconcileResultInternalV1;
  inspectAdmittedTargetFrameInternalV1(
    target: unknown,
  ): NarrativeStableAdmittedFrameInternalV1 | null;
}

export interface CreateNarrativeStablePublisherBridgeInputInternalV1 {
  readonly kernelBundle: ManagedSurfaceCompositeKernelBundleInternalV1;
  readonly candidatePreflight: NarrativeStableCandidatePreflightInternalV1;
  /**
   * Composition-scoped Stage claim identity. Production successors reuse one
   * identity; source-relative legacy fixtures may omit it and receive an
   * instance-local claim.
   */
  readonly barrierStageClaimant?: object;
}

export interface NarrativeStableChoiceActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableHoldSkipActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableCustomActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableSayActivationAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableSayContentAutoAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableVoiceReplayActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export type NarrativeStablePlaybackModeInternalV1 = "normal" | "auto" | "skip";

export interface NarrativeStablePlaybackModeToggleActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableHistoryOpenActionAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export interface NarrativeStableHistoryOpenIntentInternalV1 {
  readonly recordInternalV1: unknown;
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

export interface NarrativeStableBarrierRecoveryAttemptInternalV1 {
  readonly recordInternalV1: unknown;
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

export interface NarrativeStableHoldExpiryControllerAttemptInternalV1 {
  readonly recordInternalV1: unknown;
}

export type NarrativeStableHoldExpiryDispatchResultInternalV1 =
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

export interface NarrativeStableHoldExpiryControllerInternalV1 {
  issueAttemptInternalV1(): NarrativeStableHoldExpiryControllerAttemptInternalV1 | null;
  dispatchInternalV1(
    attempt: unknown,
    elapsedMs: number,
  ): NarrativeStableHoldExpiryDispatchResultInternalV1;
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
  issueHoldSkipAttemptInternalV1(): NarrativeStableHoldSkipActionAttemptInternalV1 | null;
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
  readonly skipReturnMode: "normal" | "auto";
}

interface NarrativeStablePublisherBridgeRecordInternalV1 {
  readonly bridgeIdentity: object;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly isActiveInternalV1: () => boolean;
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
  holdExpiryControllerClaim: object | null;
  sayRevealControllerClaim: object | null;
  sayCallbackClaim: object | null;
  saySemanticInFlightClaim: object | null;
  deferredModePublicationClaim: object | null;
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
/**
 * Milliseconds already dispatched as partial hold-scoped time ticks for a hold frame
 * whose pending declares `tickQuantumMs`. Keyed by the admitted frame — the
 * frame object stays identical across partial commits (the bridge accepts
 * the decremented remainder as unchanged) and across dialogue player
 * controller recreations, so the ledger survives both and resets naturally
 * with the next admitted frame.
 */
const narrativeHoldDispatchLedgersInternalV1 = new WeakMap<
  NarrativeStableAdmittedFrameInternalV1,
  { dispatchedElapsedMs: number }
>();
const narrativeStablePublisherBridgeRecordsInternalV1 = new WeakMap<
  NarrativeStablePublisherBridgeInternalV1,
  NarrativeStablePublisherBridgeRecordInternalV1
>();
const narrativeStablePublisherBridgeRecordsByKernelInternalV1 = new WeakMap<
  ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  NarrativeStablePublisherBridgeRecordInternalV1
>();

type NarrativeStableDialoguePlayerClockPortBindingInternalV1 =
  NarrativeStableDialoguePlayerClockPortInternalV1;
type NarrativeStableDialoguePlayerProfilePortBindingInternalV1 =
  NarrativeStableDialoguePlayerProfilePortInternalV1;
type NarrativeStableDialoguePlayerTextResolverPortBindingInternalV1 =
  NarrativeStableDialoguePlayerTextResolverPortInternalV1;

interface NarrativeStablePhysicalActionAttemptRecordBaseInternalV1 {
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
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
      readonly kind: "hold_skip";
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

interface NarrativeStableDialoguePlayerControllerRecordInternalV1 {
  controller: NarrativeStableDialoguePlayerControllerInternalV1 | null;
  bridge: NarrativeStablePublisherBridgeInternalV1 | null;
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1 | null;
  target: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
  frame: NarrativeStableAdmittedFrameInternalV1 | null;
  profileBinding: NarrativeStableDialoguePlayerProfilePortBindingInternalV1 | null;
  clockBinding: NarrativeStableDialoguePlayerClockPortBindingInternalV1 | null;
  textBinding: NarrativeStableDialoguePlayerTextResolverPortBindingInternalV1 | null;
  profile: DeepReadonly<PlayerProfileV1>;
  readonly policy: Readonly<{
    readonly textRevealCharsPerSecond: number;
    readonly autoWaitMs: number;
    readonly skipPolicy: "skip_read" | "skip_all";
    readonly reducedMotion: boolean;
  }>;
  snapshot: NarrativeStableDialoguePlayerSnapshotInternalV1;
  phaseGeneration: object;
  cancelTick: (() => void) | null;
  lastTickMs: number | null;
  revealRemainder: number;
  automaticRemainingMs: number | null;
  currentAutomaticAttempt:
    | NarrativeStableSayPlayerAutoAttemptInternalV1
    | NarrativeStableSaySkipAttemptInternalV1
    | NarrativeStablePlaybackModeResetAttemptInternalV1
    | null;
  seenCommitted: boolean;
  legacySayRevealController: NarrativeStableSayRevealControllerInternalV1 | null;
  holdExpiryController: NarrativeStableHoldExpiryControllerInternalV1 | null;
  active: boolean;
  rawUnsubscribe: (() => void) | null;
  materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1 | null;
  readonly listeners: Set<() => void>;
  readonly listenerHolders: Set<{
    record: NarrativeStableDialoguePlayerControllerRecordInternalV1 | null;
    listener: (() => void) | null;
  }>;
}

interface NarrativeStableDialoguePlayerMaterializationRecordInternalV1 {
  controllerRecord: NarrativeStableDialoguePlayerControllerRecordInternalV1 | null;
  readonly observation: NarrativeStableDialoguePlayerObservationInternalV1;
  readonly textResolver: NarrativeStableDialoguePlayerTextResolverInternalV1;
  snapshot: NarrativeStableDialoguePlayerSnapshotInternalV1;
  notifiedSnapshot: NarrativeStableDialoguePlayerSnapshotInternalV1;
  controllerUnsubscribe: (() => void) | null;
  active: boolean;
  readonly listeners: Set<() => void>;
  readonly listenerHolders: Set<{ listener: (() => void) | null }>;
  readonly resolverHolder: {
    materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1 | null;
  };
  fault: TypeError | null;
  faultTarget: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
  faultFrame: NarrativeStableAdmittedFrameInternalV1 | null;
}

const narrativeStableDialoguePlayerControllerRecordsInternalV1 = new WeakMap<
  NarrativeStableDialoguePlayerControllerInternalV1,
  NarrativeStableDialoguePlayerControllerRecordInternalV1
>();
const narrativeStableDialoguePlayerControllersByTargetInternalV1 = new WeakMap<
  ManagedSurfaceStableAdmittedTargetInternalV1,
  NarrativeStableDialoguePlayerControllerRecordInternalV1
>();
const narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1 = new WeakMap<
  ManagedSurfaceStableAdmittedTargetInternalV1,
  object
>();
const narrativeStableDialoguePlayerObservationRecordsInternalV1 = new WeakMap<
  NarrativeStableDialoguePlayerObservationInternalV1,
  NarrativeStableDialoguePlayerMaterializationRecordInternalV1
>();
const narrativeStableDialoguePlayerFaultMaterializationsByTargetInternalV1 = new WeakMap<
  ManagedSurfaceStableAdmittedTargetInternalV1,
  NarrativeStableDialoguePlayerMaterializationRecordInternalV1
>();
type NarrativeStableDialoguePlayerAutomaticAttemptInternalV1 =
  | NarrativeStableSayPlayerAutoAttemptInternalV1
  | NarrativeStableSaySkipAttemptInternalV1
  | NarrativeStablePlaybackModeResetAttemptInternalV1;
interface NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1 {
  readonly kind: "player_auto" | "skip" | "mode_reset";
  readonly controllerRecord: NarrativeStableDialoguePlayerControllerRecordInternalV1;
  readonly generation: object;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly expectedModeState: NarrativeStablePlaybackModeStateInternalV1;
  spent: boolean;
}
const narrativeStableDialoguePlayerLateUnsubscribeInternalV1 = () => {};

interface NarrativeStableVoiceReplayActionAttemptRecordInternalV1 {
  readonly kind: "voice_replay";
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly voiceReplayPort: NarrativeStableVoiceReplayPortInternalV1 | null;
  spent: boolean;
}

interface NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1 {
  readonly kind: "playback_mode_toggle";
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly requestedMode: "auto" | "skip";
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly issuanceModeState: NarrativeStablePlaybackModeStateInternalV1;
  spent: boolean;
}

interface NarrativeStableHistoryOpenActionAttemptRecordInternalV1 {
  readonly kind: "history_open";
  readonly authority: NarrativeStablePhysicalActionAdmissionInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directParent: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly historyAvailabilityPort: NarrativeStableHistoryAvailabilityPortInternalV1;
  spent: boolean;
}

type NarrativeStableRoutedPhysicalAttemptRecordInternalV1 =
  | NarrativeStablePhysicalActionAttemptRecordInternalV1
  | NarrativeStableVoiceReplayActionAttemptRecordInternalV1
  | NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1
  | NarrativeStableHistoryOpenActionAttemptRecordInternalV1;

interface NarrativeStableHistoryOpenIntentRecordInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  readonly targetProof: ManagedSurfaceStableDirectActionTargetProofInternalV1;
  readonly directParent: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  spent: boolean;
}

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
      {
        context: "narrative" as const,
        handle: (event: DeepReadonly<InputEventV1>) =>
          handleNarrativeStableHostFallbackInputInternalV1(runtimeRecord, event),
      },
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
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
  spent: boolean;
}

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
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
  readonly revealGenerationPort: NarrativeStableSayRevealGenerationPortInternalV1;
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
  readonly gate: ManagedSurfaceFamilyActivationGateInternalV1;
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
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
  spent: boolean;
}

function retireNarrativeBarrierRecoveryAttemptInternalV1(
  generation: NarrativeStableBarrierRecoveryGenerationRecordInternalV1,
): void {
  const attempt = generation.currentAttempt;
  if (attempt === null) return;
  const attemptRecord = narrativeAttemptRecordInternalV1<
    NarrativeStableBarrierRecoveryAttemptRecordInternalV1
  >(attempt);
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

interface NarrativeStableHoldExpiryControllerAttemptRecordInternalV1 {
  readonly controller: NarrativeStableHoldExpiryControllerInternalV1;
  readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
  readonly directTarget: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
  readonly semanticDispatchPort: NarrativeStableSemanticResolutionPortInternalV1;
  spent: boolean;
}

const stableZeroDeltaInternalV1 = {
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
};

const stableUnchangedResultInternalV1 = {
  kind: "unchanged" as const,
  code: "surface.stable_publication_unchanged" as const,
  delta: stableZeroDeltaInternalV1,
};

const stablePublisherStaleResultInternalV1 = {
  kind: "stale" as const,
  code: "surface.stable_publisher_lease_stale" as const,
  delta: stableZeroDeltaInternalV1,
};

const narrativeRendererMissingResultInternalV1 = {
  kind: "rejected" as const,
  code: "narrative.renderer_missing" as const,
  delta: stableZeroDeltaInternalV1,
};

const narrativeCandidatePreflightFaultedResultInternalV1 = {
  kind: "faulted" as const,
  code: "narrative.candidate_preflight_faulted" as const,
  delta: stableZeroDeltaInternalV1,
};

const stableReconcilePreconditionStaleResultInternalV1 = {
  kind: "stale" as const,
  code: "surface.stable_reconcile_precondition_stale" as const,
  delta: stableZeroDeltaInternalV1,
};

const stableReconcileFaultedResultInternalV1 = {
  kind: "faulted" as const,
  code: "surface.stable_reconcile_faulted" as const,
  delta: stableZeroDeltaInternalV1,
};

function createNarrativePlaybackModeStateInternalV1(
  mode: NarrativeStablePlaybackModeInternalV1,
  skipReturnMode: "normal" | "auto" = mode === "auto" ? "auto" : "normal",
): NarrativeStablePlaybackModeStateInternalV1 {
  return ({ mode, skipReturnMode });
}

const narrativePlaybackModeToggledNormalResultInternalV1 = {
  kind: "toggled" as const,
  mode: "normal" as const,
  completion: null,
};

const narrativePlaybackModeToggledAutoResultInternalV1 = {
  kind: "toggled" as const,
  mode: "auto" as const,
  completion: null,
};

const narrativePlaybackModeToggledSkipResultInternalV1 = {
  kind: "toggled" as const,
  mode: "skip" as const,
  completion: null,
};

const narrativePlaybackModeIgnoredResultInternalV1 = {
  kind: "ignored" as const,
  completion: null,
};

const narrativePlaybackModeStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativePlaybackModeFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

function playbackModeToggledResultInternalV1(
  mode: NarrativeStablePlaybackModeInternalV1,
): Extract<NarrativeStablePlaybackModeToggleDispatchResultInternalV1, { kind: "toggled" }> {
  return mode === "normal"
    ? narrativePlaybackModeToggledNormalResultInternalV1
    : mode === "auto"
    ? narrativePlaybackModeToggledAutoResultInternalV1
    : narrativePlaybackModeToggledSkipResultInternalV1;
}

function toggledPlaybackModeStateInternalV1(
  currentState: NarrativeStablePlaybackModeStateInternalV1,
  requestedMode: "auto" | "skip",
): NarrativeStablePlaybackModeStateInternalV1 {
  if (requestedMode === "auto") {
    return createNarrativePlaybackModeStateInternalV1(
      currentState.mode === "auto" ? "normal" : "auto",
    );
  }
  if (currentState.mode === "skip") {
    return createNarrativePlaybackModeStateInternalV1(currentState.skipReturnMode);
  }
  return createNarrativePlaybackModeStateInternalV1(
    "skip",
    currentState.mode === "auto" ? "auto" : "normal",
  );
}

const narrativePhysicalActionStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativePhysicalActionUnmappedResultInternalV1 = {
  kind: "unmapped" as const,
  completion: null,
};

const narrativePhysicalActionFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativePhysicalActionRevealedResultInternalV1 = {
  kind: "revealed" as const,
  completion: null,
};

const narrativeVoiceReplayHandledResultInternalV1 = {
  kind: "handled" as const,
  completion: null,
};

const narrativeVoiceReplayIgnoredResultInternalV1 = {
  kind: "ignored" as const,
  completion: null,
};

const narrativeHistoryOpenIgnoredResultInternalV1 = {
  kind: "ignored" as const,
  completion: null,
};

const narrativeHistoryOpenStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeHistoryOpenFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativeHistoryChildStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeHistoryChildFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativeSayContentAutoNotReadyResultInternalV1 = {
  kind: "not_ready" as const,
  completion: null,
};

const narrativeSayPlayerAutoNotReadyResultInternalV1 = ({
  kind: "not_ready" as const,
  completion: null,
}) satisfies NarrativeStableSayPlayerAutoDispatchResultInternalV1;

const narrativeSayPlayerAutomaticStaleResultInternalV1 = ({
  kind: "stale" as const,
  completion: null,
}) satisfies
  | NarrativeStableSayPlayerAutoDispatchResultInternalV1
  | NarrativeStableSaySkipDispatchResultInternalV1;

const narrativeSayPlayerAutomaticFaultedResultInternalV1 = ({
  kind: "faulted" as const,
  completion: null,
}) satisfies
  | NarrativeStableSayPlayerAutoDispatchResultInternalV1
  | NarrativeStableSaySkipDispatchResultInternalV1;

const narrativePlaybackModeResetStaleResultInternalV1 = ({
  kind: "stale" as const,
  completion: null,
}) satisfies NarrativeStablePlaybackModeResetDispatchResultInternalV1;

const narrativeHoldExpiryStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeHoldExpiryFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativeBarrierStageArmedResultInternalV1 = {
  kind: "armed" as const,
  completion: null,
};

const narrativeBarrierStageStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeBarrierRetainedResultInternalV1 = {
  kind: "retained" as const,
  completion: null,
};

const narrativeBarrierCancelledResultInternalV1 = {
  kind: "cancelled" as const,
  completion: null,
};

const narrativeBarrierStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeBarrierFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativeBarrierRecoveryStaleResultInternalV1 = {
  kind: "stale" as const,
  completion: null,
};

const narrativeBarrierRecoveryFaultedResultInternalV1 = {
  kind: "faulted" as const,
  completion: null,
};

const narrativeBarrierRecoveryGenerationStaleResultInternalV1 = {
  kind: "stale" as const,
  generation: null,
};

const narrativeBarrierRecoveryGenerationFaultedResultInternalV1 = {
  kind: "faulted" as const,
  generation: null,
};

function narrativeBarrierStageFaultedResultInternalV1(
  code:
    | "stage.acknowledged_run_unmatched"
    | "stage.acknowledged_run_ambiguous"
    | "stage.acknowledged_run_faulted",
): NarrativeStableBarrierStageRetargetResultInternalV1 {
  return ({
    kind: "faulted" as const,
    code,
    completion: null,
  });
}

function bytesEqualInternalV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function narrativeRequiredPortMissingResultInternalV1(
  portId: NarrativeStableRequiredPortIdInternalV1,
): NarrativeStablePublisherBridgeResultInternalV1 {
  return ({
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
  const bundle = input.kernelBundle;
  const publisherLeaseRegistry = bundle.publisherLeaseRegistry;
  const admissionAuthority = bundle.admissionAuthority;
  const compositeRuntimeKernel = bundle.compositeRuntimeKernel;
  const barrierStageClaimant = input.barrierStageClaimant ??
    ({});
  if (
    (typeof barrierStageClaimant !== "object" && typeof barrierStageClaimant !== "function") ||
    barrierStageClaimant === null
  ) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  if (
    bundle.applicationEpoch !==
      compositeRuntimeKernel.getStateInternalV1().transientState.publication.applicationEpoch
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
  if (typeof candidatePreflight.preflightCandidateInternalV1 !== "function") {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }

  let issuedPublisher: ManagedSurfaceStablePublisherInternalV1 | null = null;
  let issuedPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1 | null = null;
  let registered = false;
  try {
    issuedPublisher = publisherLeaseRegistry.issuePublisher(ownerIdInternalV1);
    issuedPublisherLease = issuedPublisher.lease;
    const registration = compositeRuntimeKernel.registerStablePublisherLeaseInternalV1(
      issuedPublisherLease,
    );
    if (registration.kind !== "registered") {
      throw new TypeError("ui.narrative_stable_composition_invalid");
    }
    registered = true;
    const captured = compositeRuntimeKernel.captureAdmissionContextInternalV1(
      issuedPublisherLease,
    );
    const leaseSnapshot = publisherLeaseRegistry.inspectCurrentLease(
      issuedPublisherLease,
    );
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
          compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1(
            issuedPublisherLease,
          );
        } else if (
          publisherLeaseRegistry.inspectCurrentLease(issuedPublisherLease) !== null
        ) {
          publisherLeaseRegistry.disposePublisherLease(issuedPublisherLease);
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
  const bridgeIdentity = {};
  let bridgeActive = true;
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
    const captured = compositeRuntimeKernel.captureAdmissionContextInternalV1(
      publisherLease,
    );
    if (captured.kind !== "captured") return stableContextResultInternalV1(captured);
    const context = {
      acceptedBaseline: captured.acceptedBaseline,
      reservationSnapshot: captured.reservationSnapshot,
    };
    const baseline = captured.acceptedBaseline;
    if (baseline.publisherLease !== publisherLease) return stableReconcileFaultedResultInternalV1;
    if (baseline.kind === "unpublished") return ({ kind: "empty", context });
    if (baseline.ownerId !== ownerIdInternalV1) return stableReconcileFaultedResultInternalV1;
    if (baseline.targets.length === 0) return ({ kind: "empty", context });
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
    return ({ kind: "target", context, target, record });
  };

  const hasIssuanceCapacity = (needsOccurrence: boolean): boolean => {
    const snapshot = publisher.getSnapshot();
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
    let preflightResult: NarrativeStableCandidatePreflightResultInternalV1;
    try {
      preflightResult = candidatePreflight.preflightCandidateInternalV1(
        pending,
        rendererKey,
      );
    } catch {
      return ({
        kind: "result" as const,
        result: narrativeCandidatePreflightFaultedResultInternalV1,
      });
    }
    switch (preflightResult.kind) {
      case "captured":
        return ({
          kind: "captured" as const,
          snapshot: preflightResult.candidateSnapshot as NarrativeStableCandidateSnapshotInternalV1,
        });
      case "rejected":
        return ({
          kind: "result" as const,
          result: preflightResult.code === "narrative.renderer_missing"
            ? narrativeRendererMissingResultInternalV1
            : narrativeRequiredPortMissingResultInternalV1(preflightResult.portId),
        });
      case "faulted":
        return ({
          kind: "result" as const,
          result: narrativeCandidatePreflightFaultedResultInternalV1,
        });
    }
    return preflightResult;
  };

  const applyPublication = (
    context: CapturedContextInternalV1,
    sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1,
    targets: readonly ManagedSurfaceStableTargetInternalV1[],
    record: NarrativeTargetFrameRecordInternalV1 | null,
  ): ManagedSurfaceStableReconcileResultInternalV1 => {
    const publication = {
      publisherLease,
      sourceRevision,
      targets,
    };
    const evaluated = admissionAuthority.evaluate({
      publication,
      acceptedBaseline: context.acceptedBaseline,
      reservationSnapshot: context.reservationSnapshot,
    }) as ManagedSurfaceStableAdmissionResultInternalV1;
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

    const restorePrestage = (): void => {
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
    };

    try {
      if (admittedTarget !== null && record !== null) {
        narrativeTargetFrameRecordsInternalV1.set(admittedTarget, record);
      }
      const applied = compositeRuntimeKernel.applyStableAdmissionProposalInternalV1(
        evaluated.proposal,
      );
      if (applied.kind !== "applied") {
        restorePrestage();
      }
      return applied;
    } catch (error) {
      restorePrestage();
      throw error;
    }
  };

  const bridge: NarrativeStablePublisherBridgeInternalV1 = {
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
      pending: PendingInteractionV1 | null,
    ): NarrativeStablePublisherBridgeResultInternalV1 {
      const current = captureCurrentProjection();
      if (!("context" in current)) return current;

      if (pending === null) {
        if (current.kind === "empty") return stableUnchangedResultInternalV1;
        if (!hasIssuanceCapacity(false)) return stableReconcileFaultedResultInternalV1;
        const sourceRevision = publisher.issueSourceRevision();
        return applyPublication(current.context, sourceRevision, [], null);
      }

      const canonicalPendingBytes = canonicalJsonBytes(pending);

      if (
        current.kind === "target" &&
        current.record.frame.semanticOccurrenceId === pending.occurrenceId
      ) {
        if (
          bytesEqualInternalV1(
            current.record.canonicalPendingBytes,
            canonicalPendingBytes,
          )
        ) {
          return stableUnchangedResultInternalV1;
        }
        // An authoritative partial hold time tick keeps the same occurrence and
        // only decrements remainingMs. The admitted frame keeps presenting
        // its entry remainder (the countdown is presentation-owned), so a
        // strictly smaller remainder with every other byte identical is the
        // same current frame, not a divergent publication.
        const held = current.record.frame.pending;
        if (
          held.kind === "hold" && pending.kind === "hold" &&
          pending.remainingMs < held.remainingMs &&
          bytesEqualInternalV1(
            canonicalJsonBytes({ ...held, remainingMs: pending.remainingMs }),
            canonicalPendingBytes,
          )
        ) {
          return stableUnchangedResultInternalV1;
        }
        return stableReconcileFaultedResultInternalV1;
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
      const frame = {
        semanticOccurrenceId: pending.occurrenceId,
        rendererKey,
        pending,
        candidateSnapshot: preflight.snapshot,
      };
      const sourceRevision = publisher.issueSourceRevision();
      const occurrenceId = publisher.issueOccurrence();
      const parameters: NarrativeStableParametersInternalV1 = {
        semanticOccurrenceId: pending.occurrenceId,
        kind: pending.kind,
        definitionId: pending.definitionId,
        seenRevision: pending.seenRevision,
        rendererKey,
      };
      const record: NarrativeTargetFrameRecordInternalV1 = {
        bridgeIdentity,
        sourceRevision,
        canonicalPendingBytes: Uint8Array.from(canonicalPendingBytes),
        frame,
      };
      const target: ManagedSurfaceStableTargetInternalV1 = {
        occurrenceId,
        definitionId: dialogueDefinitionIdInternalV1,
        parentOccurrenceId: null,
        parameters,
      };
      return applyPublication(
        refreshed.context,
        sourceRevision,
        [target],
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
      const sourceRevision = publisher.issueSourceRevision();
      const frame: NarrativeStableAdmittedFrameInternalV1 = {
        ...current.record.frame,
        candidateSnapshot: preflight.snapshot,
      };
      const record: NarrativeTargetFrameRecordInternalV1 = {
        ...current.record,
        sourceRevision,
        frame,
      };
      const target: ManagedSurfaceStableTargetInternalV1 = {
        occurrenceId: current.target.occurrenceId,
        definitionId: current.target.definitionId,
        parentOccurrenceId: current.target.parentOccurrenceId,
        parameters: current.target.normalizedParameters,
      };
      return applyPublication(
        refreshed.context,
        sourceRevision,
        [target],
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
      try {
        return compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1(
          publisherLease,
        );
      } finally {
        if (bridgeRecord !== undefined) {
          terminalizeNarrativeStableSessionInternalV1(bridgeRecord);
        }
      }
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
  };
  narrativeStablePublisherBridgeRecordsInternalV1.set(bridge, {
    bridgeIdentity,
    compositeRuntimeKernel,
    isActiveInternalV1: () => bridgeActive,
    captureCurrentTargetInternalV1: () => {
      const current = captureCurrentProjection();
      return current.kind === "target"
        ? ({
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
    holdExpiryControllerClaim: null,
    sayRevealControllerClaim: null,
    sayCallbackClaim: null,
    saySemanticInFlightClaim: null,
    deferredModePublicationClaim: null,
    barrierStageClaimant,
    barrierAcknowledgmentControllerClaim: null,
    barrierTargetTerminalClaim: null,
    barrierCallbackClaim: null,
    barrierSemanticInFlightClaim: null,
    barrierRecoverySynchronizationClaim: null,
    barrierRecoverySynchronizationPoisoned: false,
    barrierRecoveryGeneration: null,
  });
  const installedBridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  if (installedBridgeRecord === undefined) {
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  narrativeStablePublisherBridgeRecordsByKernelInternalV1.set(
    compositeRuntimeKernel,
    installedBridgeRecord,
  );
  try {
    claimNarrativeStableHistoryChildFamilyAuthorityInternalV1(compositeRuntimeKernel);
  } catch {
    const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
    if (bridgeRecord !== undefined) bridgeRecord.active = false;
    bridgeActive = false;
    try {
      compositeRuntimeKernel.disposeStablePublisherLeaseInternalV1(publisherLease);
    } catch {
      // Construction remains failed closed when terminal cleanup is hostile.
    }
    throw new TypeError("ui.narrative_stable_composition_invalid");
  }
  return bridge;
}

function createNarrativeStableDialoguePlayerStateInstallParticipantInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
): ManagedSurfaceStableCompositeStateInstallParticipantInternalV1 {
  const participant = {
    prepareStateInstallInternalV1(
      this: ManagedSurfaceStableCompositeStateInstallParticipantInternalV1,
      previousState: ManagedSurfaceStableCompositeStateInternalV1,
      nextState: ManagedSurfaceStableCompositeStateInternalV1,
    ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null {
      const bridgeRecord = narrativeStablePublisherBridgeRecordsByKernelInternalV1.get(kernel) ??
        null;
      const expectedModeState = bridgeRecord?.currentModeState ?? null;
      const targets = [
        ...collectNarrativeDialoguePlayerTargetsFromStateInternalV1(previousState),
      ];
      for (const target of collectNarrativeDialoguePlayerTargetsFromStateInternalV1(nextState)) {
        if (!targets.includes(target)) targets.push(target);
      }
      const frameRetirements: Array<{
        readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
        readonly targetRecord: NarrativeTargetFrameRecordInternalV1;
      }> = [];
      for (const target of targets) {
        if (
          captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(previousState, target) ===
            null ||
          captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(nextState, target) !== null
        ) continue;
        const targetRecord = narrativeTargetFrameRecordsInternalV1.get(target);
        if (
          targetRecord !== undefined && bridgeRecord !== null &&
          targetRecord.bridgeIdentity === bridgeRecord.bridgeIdentity
        ) frameRetirements.push({ target, targetRecord });
      }
      const plans: Array<{
        readonly record: NarrativeStableDialoguePlayerControllerRecordInternalV1;
        readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
        readonly expectedGeneration: object;
        readonly previousPhase: "preparing" | "active" | "suspended" | null;
        readonly nextPhase: "preparing" | "active" | "suspended" | null;
        readonly preparedNow: number | null;
        readonly clockFault: boolean;
        cancelled: (() => void) | null;
        legacyToDispose: NarrativeStableSayRevealControllerInternalV1 | null;
        holdToDispose: NarrativeStableHoldExpiryControllerInternalV1 | null;
        rawUnsubscribeToCall: (() => void) | null;
        terminalObservationDelivery: (() => void) | null;
        committedGeneration: object | null;
      }> = [];
      for (const target of targets) {
        const record = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target);
        if (record === undefined || !record.active || record.target !== target) continue;
        const previousPhase = captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(
          previousState,
          target,
        );
        const nextPhase = captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(
          nextState,
          target,
        );
        if (previousPhase === nextPhase) continue;
        const expectedGeneration = record.phaseGeneration;
        const expectedLastTickMs = record.lastTickMs;
        let preparedNow: number | null = null;
        let clockFault = false;
        const timedHold = record.snapshot.kind === "passive" &&
          record.frame?.pending.kind === "hold";
        const timedSay = record.snapshot.kind === "say" &&
          (!record.snapshot.revealComplete || expectedModeState?.mode === "auto" ||
            expectedModeState?.mode === "skip" ||
            (record.frame?.pending.kind === "say" &&
              record.frame.pending.advancePolicy === "auto"));
        if (
          (previousPhase === "active" || nextPhase === "active") &&
          (timedHold || timedSay) &&
          record.clockBinding !== null
        ) {
          let nowValue: unknown;
          try {
            nowValue = record.clockBinding.nowInternalV1();
          } catch {
            clockFault = true;
            nowValue = null;
          }
          if (
            !isNarrativeDialogueClockTimestampInternalV1(nowValue) ||
            (expectedLastTickMs !== null && nowValue < expectedLastTickMs)
          ) clockFault = true;
          else preparedNow = nowValue;
        }
        plans.push({
          record,
          target,
          expectedGeneration,
          previousPhase,
          nextPhase,
          preparedNow,
          clockFault,
          cancelled: null,
          legacyToDispose: null,
          holdToDispose: null,
          rawUnsubscribeToCall: null,
          terminalObservationDelivery: null,
          committedGeneration: null,
        });
      }
      let nextNarrativeKind: PendingInteractionV1["kind"] | null = null;
      if (bridgeRecord !== null) {
        for (const entry of nextState.stableRuntimeBindings) {
          const targetRecord = narrativeTargetFrameRecordsInternalV1.get(
            entry.desiredTarget.admittedTarget,
          );
          if (
            targetRecord?.bridgeIdentity === bridgeRecord.bridgeIdentity &&
            targetRecord.sourceRevision === entry.desiredTarget.sourceRevision
          ) {
            nextNarrativeKind = targetRecord.frame.pending.kind;
            break;
          }
        }
      }
      let successorModeState: NarrativeStablePlaybackModeStateInternalV1 | null = null;
      if (expectedModeState !== null && nextNarrativeKind !== "say") {
        if (nextNarrativeKind === null && expectedModeState.mode !== "normal") {
          successorModeState = createNarrativePlaybackModeStateInternalV1("normal");
        } else if (nextNarrativeKind !== null && expectedModeState.mode === "skip") {
          successorModeState = createNarrativePlaybackModeStateInternalV1(
            expectedModeState.skipReturnMode,
          );
        }
      }
      const transitionsMode = successorModeState !== null;
      if (plans.length === 0 && frameRetirements.length === 0 && !transitionsMode) return null;
      let state: "prepared" | "committed" | "aborted" | "completed" = "prepared";
      const prepared = {
        validateInternalV1(
          this: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1,
        ): boolean {
          if (state !== "prepared") return false;
          return plans.every((plan) =>
            plan.record.active && plan.record.phaseGeneration === plan.expectedGeneration &&
            plan.record.target === plan.target &&
            narrativeStableDialoguePlayerControllersByTargetInternalV1.get(plan.target) ===
              plan.record &&
            plan.record.bridgeRecord?.compositeRuntimeKernel === kernel
          ) &&
            frameRetirements.every((retirement) =>
              narrativeTargetFrameRecordsInternalV1.get(retirement.target) ===
                retirement.targetRecord
            ) &&
            narrativeStablePublisherBridgeRecordsByKernelInternalV1.get(kernel) === bridgeRecord &&
            (bridgeRecord === null
              ? expectedModeState === null
              : bridgeRecord.currentModeState === expectedModeState);
        },
        commitLogicalInternalV1(
          this: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1,
        ): void {
          if (state !== "prepared") {
            throw new TypeError("ui.narrative_stable_dialogue_player_participant_invalid");
          }
          state = "committed";
          if (
            transitionsMode && bridgeRecord !== null && expectedModeState !== null &&
            successorModeState !== null &&
            !compareAndSetNarrativePlaybackModeStateInternalV1(
              bridgeRecord,
              expectedModeState,
              successorModeState,
            )
          ) {
            throw new TypeError("ui.narrative_stable_dialogue_player_participant_invalid");
          }
          for (const plan of plans) {
            const record = plan.record;
            const nextPhase = plan.clockFault ? null : plan.nextPhase;
            if (
              !plan.clockFault && plan.previousPhase === "active" && nextPhase !== "active" &&
              plan.preparedNow !== null && record.lastTickMs !== null &&
              record.automaticRemainingMs !== null
            ) {
              record.automaticRemainingMs = Math.max(
                0,
                record.automaticRemainingMs - (plan.preparedNow - record.lastTickMs),
              );
            }
            if (
              !plan.clockFault && plan.previousPhase === "active" && nextPhase !== "active" &&
              plan.preparedNow !== null && record.snapshot.kind === "say" &&
              record.lastTickMs !== null && plan.preparedNow >= record.lastTickMs
            ) {
              const elapsed = plan.preparedNow - record.lastTickMs;
              const total = BigInt(elapsed) * BigInt(record.policy.textRevealCharsPerSecond) +
                BigInt(record.revealRemainder);
              const advanced = Number(total / 1_000n);
              record.revealRemainder = Number(total % 1_000n);
              const nextCharacters = Math.min(
                record.snapshot.revealLength,
                record.snapshot.revealedCharacters + advanced,
              );
              record.snapshot = {
                ...record.snapshot,
                revealedCharacters: nextCharacters,
                revealComplete: nextCharacters === record.snapshot.revealLength,
              };
              record.lastTickMs = plan.preparedNow;
            }
            if (nextPhase === "active" && plan.preparedNow !== null) {
              record.lastTickMs = plan.preparedNow;
              if (
                record.snapshot.kind === "passive" && record.frame?.pending.kind === "hold" &&
                record.automaticRemainingMs === null
              ) {
                record.automaticRemainingMs = record.frame.pending.remainingMs;
              } else if (record.snapshot.kind === "say") {
                const mode = record.bridgeRecord?.currentModeState.mode;
                if (mode === "skip" && record.automaticRemainingMs === null) {
                  record.automaticRemainingMs = 40;
                } else if (
                  mode === "auto" && record.snapshot.revealComplete &&
                  record.automaticRemainingMs === null
                ) {
                  record.automaticRemainingMs = record.policy.autoWaitMs;
                }
              }
            }
            plan.cancelled = record.cancelTick;
            record.cancelTick = null;
            if (nextPhase !== "active") {
              retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(record);
              plan.legacyToDispose = record.legacySayRevealController;
              record.legacySayRevealController = null;
              plan.holdToDispose = record.holdExpiryController;
              record.holdExpiryController = null;
            }
            record.phaseGeneration = {};
            plan.committedGeneration = record.phaseGeneration;
            if (nextPhase === null) {
              if (plan.clockFault) {
                resetNarrativeStableDialoguePlayerModeInternalV1(record);
              }
              narrativeStableDialoguePlayerControllersByTargetInternalV1.delete(plan.target);
              record.active = false;
              plan.rawUnsubscribeToCall = record.rawUnsubscribe;
              record.rawUnsubscribe = null;
              record.listeners.clear();
              for (const holder of record.listenerHolders) {
                holder.record = null;
                holder.listener = null;
              }
              record.listenerHolders.clear();
              record.bridge = null;
              record.bridgeRecord = null;
              record.target = null;
              record.frame = null;
              record.profileBinding = null;
              record.clockBinding = null;
              record.textBinding = null;
              record.lastTickMs = null;
              record.revealRemainder = 0;
              record.automaticRemainingMs = null;
              record.snapshot = {
                kind: "passive" as const,
                phase: "suspended" as const,
                playbackMode: "normal" as const,
                playerProfile: record.profile,
              };
              plan.terminalObservationDelivery =
                retireNarrativeStableDialoguePlayerMaterializationInternalV1(record);
              continue;
            }
            if (record.snapshot.kind === "say") {
              record.snapshot = {
                ...record.snapshot,
                phase: nextPhase,
                playbackMode: record.bridgeRecord?.currentModeState.mode ?? "normal",
              };
            } else {
              record.snapshot = {
                ...record.snapshot,
                phase: nextPhase,
              };
            }
            if (record.materialization?.active) {
              record.materialization.snapshot = record.snapshot;
            }
          }
        },
        abortInternalV1(
          this: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1,
        ): void {
          if (state !== "prepared") {
            return;
          }
          state = "aborted";
        },
        completeInstalledInternalV1(
          this: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1,
        ): void {
          if (state !== "committed") {
            return;
          }
          state = "completed";
          for (const plan of plans) {
            const cancel = plan.cancelled;
            plan.cancelled = null;
            if (cancel !== null) {
              try {
                cancel();
              } catch {
                // The logical generation already fences the retired tick.
              }
            }
            const legacy = plan.legacyToDispose;
            plan.legacyToDispose = null;
            if (legacy !== null) {
              try {
                legacy.disposeInternalV1();
              } catch {
                // Logical suspension already fenced the legacy admission.
              }
            }
            const hold = plan.holdToDispose;
            plan.holdToDispose = null;
            if (hold !== null) {
              try {
                hold.disposeInternalV1();
              } catch {
                // Logical retirement already fenced hold expiry.
              }
            }
            const rawUnsubscribe = plan.rawUnsubscribeToCall;
            plan.rawUnsubscribeToCall = null;
            if (rawUnsubscribe !== null) {
              try {
                rawUnsubscribe();
              } catch {
                // Logical retirement already fenced raw profile ingress.
              }
            }
            const deliverTerminalObservation = plan.terminalObservationDelivery;
            plan.terminalObservationDelivery = null;
            if (deliverTerminalObservation !== null) {
              deliverTerminalObservation();
            }
            const record = plan.record;
            if (
              !record.active || plan.committedGeneration === null ||
              record.phaseGeneration !== plan.committedGeneration || record.target === null ||
              narrativeStableDialoguePlayerControllersByTargetInternalV1.get(record.target) !==
                record
            ) {
              continue;
            }
            if (record.snapshot.kind === "say" && record.snapshot.revealComplete) {
              markNarrativeStableDialoguePlayerSeenInternalV1(record);
            }
            notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
            const nextPhase = plan.clockFault ? null : plan.nextPhase;
            if (nextPhase === "active") {
              ensureNarrativeStableDialoguePlayerLegacyControllerInternalV1(record);
              ensureNarrativeStableDialoguePlayerHoldControllerInternalV1(record);
              requestNarrativeStableDialoguePlayerTickInternalV1(
                record,
                record.phaseGeneration,
              );
            } else if (nextPhase === null) {
              disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
            }
          }
        },
      };
      return prepared;
    },
  };
  return participant;
}

function claimNarrativeStableHistoryChildFamilyAuthorityInternalV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
): ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 {
  const retained = narrativeStableHistoryChildFamilyClaimsInternalV1.get(kernel);
  if (retained !== undefined) return retained.authority;
  const claimant = {};
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
  const stateInstallParticipant =
    createNarrativeStableDialoguePlayerStateInstallParticipantInternalV1(kernel);
  kernel.setStateInstallParticipantInternalV1(stateInstallParticipant);
  const record = {
    claimant,
    authority,
    readinessAuthority,
    actionAuthority,
    lifecycleAuthority,
  };
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
  dismissKind: ManagedSurfaceDismissKindV1 | null,
): NarrativeStableHistoryChildLifecycleResultInternalV1 {
  const controllerRecord = narrativeStableHistoryChildControllerRecordsInternalV1.get(controller);
  if (controllerRecord === undefined) {
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
  const guard = ({
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
      ? familyClaim.lifecycleAuthority.closeExactParentTransientChildInternalV1(
        candidate,
        guard,
      )
      : familyClaim.lifecycleAuthority.dismissExactParentTransientChildInternalV1(
        candidate,
        dismissKind,
        guard,
      );
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
  controller = {
    closeInternalV1(): NarrativeStableHistoryChildLifecycleResultInternalV1 {
      return transitionNarrativeStableHistoryChildControllerInternalV1(
        controller,
        null,
      );
    },
    dismissInternalV1(
      dismissKind: ManagedSurfaceDismissKindV1,
    ): NarrativeStableHistoryChildLifecycleResultInternalV1 {
      return transitionNarrativeStableHistoryChildControllerInternalV1(
        controller,
        dismissKind,
      );
    },
  };
  narrativeStableHistoryChildControllerRecordsInternalV1.set(controller, controllerRecord);
  return controller;
}

function classifyNarrativeStableHistoryChildIntentInternalV1(
  lifecycle: NarrativeStableHistoryChildLifecycleInternalV1,
  lifecycleRecord: NarrativeStableHistoryChildLifecycleRecordInternalV1,
  intentRecord: NarrativeStableHistoryOpenIntentRecordInternalV1,
): "current" | "stale" | "faulted" {
  const bridgeRecord = lifecycleRecord.bridgeRecord;
  if (
    narrativeStableHistoryChildLifecycleRecordsInternalV1.get(lifecycle) !==
      lifecycleRecord ||
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
    const readyActive = lifecycleRecord.stableActionAuthority
      .captureReadyActiveStableTargetInternalV1(
        intentRecord.directParent,
      );
    if (readyActive.kind === "faulted") return "faulted";
    if (
      readyActive.kind !== "captured" ||
      readyActive.directTarget !== intentRecord.directParent ||
      readyActive.sourceRevision !== intentRecord.sourceRevision
    ) {
      return "stale";
    }
    if (
      !lifecycleRecord.stableActionAuthority.isCurrentDirectTargetInternalV1(
        intentRecord.targetProof,
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
  intent: unknown,
): NarrativeStableHistoryChildPreparationResultInternalV1 {
  const lifecycleRecord = narrativeStableHistoryChildLifecycleRecordsInternalV1.get(lifecycle);
  if (
    lifecycleRecord === undefined ||
    ((typeof intent !== "object" && typeof intent !== "function") || intent === null)
  ) {
    return narrativeHistoryChildStaleResultInternalV1;
  }
  const exactIntent = intent as NarrativeStableHistoryOpenIntentInternalV1;
  const intentRecord = narrativeAttemptRecordInternalV1<
    NarrativeStableHistoryOpenIntentRecordInternalV1
  >(exactIntent);
  if (intentRecord === null) return narrativeHistoryChildStaleResultInternalV1;
  const classification = classifyNarrativeStableHistoryChildIntentInternalV1(
    lifecycle,
    lifecycleRecord,
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
    preparation = ({}) as NarrativeStableHistoryChildPreparationInternalV1;
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
    preparingResult = {
      kind: "preparing" as const,
      preparation,
      completion: null,
    };
    commitGuard = {
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
    };
    authorityInput = {
      parentProof: intentRecord.targetProof,
      expectedParent: intentRecord.directParent,
      expectedSourceRevision: intentRecord.sourceRevision,
      definition: historyDefinitionInternalV1,
      semanticOccurrenceId: null,
      commitGuard,
    };
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
    prepared = lifecycleRecord.childAuthority.prepareExactParentTransientChildInternalV1(
      authorityInput,
    );
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
  const exactBridge = input.bridge;
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
  lifecycle = {
    redeemHistoryOpenIntentInternalV1(
      intent: unknown,
    ): NarrativeStableHistoryChildPreparationResultInternalV1 {
      return redeemNarrativeStableHistoryChildIntentInternalV1(
        lifecycle,
        intent,
      );
    },
  };
  narrativeStableHistoryChildLifecycleRecordsInternalV1.set(
    lifecycle,
    {
      bridge: exactBridge,
      bridgeRecord,
      compositeRuntimeKernel: bridgeRecord.compositeRuntimeKernel,
      stableActionAuthority,
      childAuthority,
    },
  );
  bridgeRecord.historyChildLifecycle = lifecycle;
  return lifecycle;
}

function createNarrativeStableReadinessSnapshotInternalV1(
  entries: readonly NarrativeStableReadinessEntryInternalV1[],
): NarrativeStableReadinessSnapshotInternalV1 {
  return ({
    entries: [...entries],
  });
}

function createNarrativeStableHostRenderSnapshotInternalV1(
  entries: readonly NarrativeStableHostRenderEntryInternalV1[],
): NarrativeStableHostRenderSnapshotInternalV1 {
  return ({
    entries: [...entries],
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
  const previousMaterialization = previous?.kind === "dialogue" &&
      narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.frame === frame
    ? narrativeStableDialoguePlayerObservationRecordsInternalV1.get(
      previous.playerObservation,
    ) ?? null
    : null;
  let materialization = previousMaterialization;
  if (
    materialization?.fault !== null && materialization?.fault !== undefined &&
    previous?.phase !== phase
  ) {
    retireNarrativeStableDialoguePlayerFaultMaterializationInternalV1(materialization);
    materialization = null;
  }
  if (materialization === null) {
    try {
      materialization = createNarrativeStableDialoguePlayerMaterializationInternalV1(
        createNarrativeStableDialoguePlayerControllerInternalV1(
          {
            bridge: record.bridge,
            target: attempt.desiredTarget.admittedTarget,
            frame,
          },
        ),
      );
    } catch {
      materialization = createNarrativeStableDialoguePlayerFaultMaterializationInternalV1(
        attempt.desiredTarget.admittedTarget,
        frame,
        phase,
      );
    }
  }
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
    previous.playerObservation === materialization.observation &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.frame === frame &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.actionBindingGeneration ===
      actionBindingGeneration
  ) {
    return previous;
  }
  const rendererProps = previous?.kind === "dialogue" &&
      narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.frame === frame &&
      previous.playerObservation === materialization.observation
    ? previous.rendererProps
    : ({
      kind: "dialogue" as const,
      pending: frame.pending,
      visualConfig: frame.candidateSnapshot.visualConfig,
      playerProfile: materialization.snapshot.playerProfile,
      textResolver: materialization.textResolver,
      quickMenuContribution: frame.candidateSnapshot.quickMenuContribution,
    });
  const focusPolicy = dialogueDefinitionInternalV1.focusPolicy;
  if (focusPolicy.kind !== "owns_focus") return null;
  const entry: NarrativeStableHostRenderEntryInternalV1 = {
    kind: "dialogue" as const,
    phase,
    renderKey: previous?.renderKey ?? mintNarrativeStableHostRenderKeyInternalV1(record),
    preparation,
    initialFocusTargetId: focusPolicy.initialTargetId,
    rendererComponent: frame.candidateSnapshot.rendererComponent,
    rendererProps,
    playerObservation: materialization.observation,
  };
  narrativeStableHostRenderEntryRecordsInternalV1.set(entry, {
    sessionRecord: record,
    attempt,
    frame,
    actionBindingGeneration,
  });
  return entry;
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
  const parentPlayerProfile = parent.playerObservation.getSnapshotInternalV1().playerProfile;
  const parentTextResolver = parent.rendererProps.textResolver;
  if (
    previous?.kind === "history" && previous.phase === phase &&
    previous.preparation === preparation && previous.parentRenderKey === parent.renderKey &&
    previous.controller === preparationRecord.controller &&
    previous.rendererProps.playerProfile === parentPlayerProfile &&
    previous.rendererProps.textResolver === parentTextResolver &&
    narrativeStableHostRenderEntryRecordsInternalV1.get(previous)?.actionBindingGeneration ===
      actionBindingGeneration
  ) return previous;
  const rendererProps = previous?.kind === "history" &&
      previous.rendererProps.playerProfile === parentPlayerProfile &&
      previous.rendererProps.textResolver === parentTextResolver
    ? previous.rendererProps
    : ({
      kind: "history" as const,
      visualConfig: frame.candidateSnapshot.visualConfig,
      playerProfile: parentPlayerProfile,
      textResolver: parentTextResolver,
    });
  const historyObservation = previous?.kind === "history"
    ? previous.historyObservation
    : createNarrativeStableHistoryRenderObservationInternalV1(
      frame.candidateSnapshot.historyObservationPort,
    );
  const focusPolicy = historyDefinitionInternalV1.focusPolicy;
  if (focusPolicy.kind !== "owns_focus") return null;
  const entry: NarrativeStableHostRenderEntryInternalV1 = {
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
  };
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
    admissionClaim: {},
    bindingGeneration: {},
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
  const previousSnapshot = record.currentRenderSnapshot;
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
  const previousEntries = previousSnapshot.entries;
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
      if (
        previous.kind === "dialogue" &&
        !entries.some((entry) =>
          entry.kind === "dialogue" && entry.playerObservation === previous.playerObservation
        )
      ) {
        const materialization = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(
          previous.playerObservation,
        );
        if (materialization?.fault !== null && materialization?.fault !== undefined) {
          retireNarrativeStableDialoguePlayerFaultMaterializationInternalV1(materialization);
        }
      }
      narrativeStableHostRenderEntryRecordsInternalV1.delete(previous);
    }
  }
  record.currentRenderSnapshot = createNarrativeStableHostRenderSnapshotInternalV1(entries);
  const runtimeRecord = record.currentHostRuntime;
  if (
    runtimeRecord !== null && runtimeRecord.active &&
    rotateResumedNarrativeStableHostRootActionBindingInternalV1(
      runtimeRecord,
      previousSnapshot,
    )
  ) {
    refreshNarrativeStableHostRenderSnapshotInternalV1(session, record);
  }
  return true;
}

function rotateResumedNarrativeStableHostRootActionBindingInternalV1(
  runtimeRecord: NarrativeStableHostRuntimeRecordInternalV1,
  previousSnapshot: NarrativeStableHostRenderSnapshotInternalV1,
): boolean {
  const sessionRecord = runtimeRecord.sessionRecord;
  const resumed = sessionRecord.currentRenderSnapshot.entries.find((entry) => {
    if (entry.kind !== "dialogue" || entry.phase !== "active") return false;
    return previousSnapshot.entries.some((previous) =>
      previous.kind === "dialogue" && previous.phase === "suspended" &&
      previous.renderKey === entry.renderKey
    );
  });
  if (resumed?.kind !== "dialogue") return false;
  const resumedRecord = narrativeStableHostRenderEntryRecordsInternalV1.get(resumed);
  if (resumedRecord === undefined) return false;
  const predecessor = findNarrativeStableHostActionBindingRecordInternalV1(
    sessionRecord,
    resumedRecord.attempt,
  );
  const authority = predecessor?.kind === "root"
    ? predecessor.authority as ManagedSurfaceStableActionRouteAuthorityInternalV1 | null
    : null;
  if (
    authority === null || predecessor === null || !predecessor.active ||
    !predecessor.committed || predecessor.runtimeRecord !== runtimeRecord ||
    sessionRecord.bridgeRecord.currentHostRootActionBinding !== predecessor
  ) return false;

  let successor: NarrativeStableHostCandidateActionBindingRecordInternalV1 | null = null;
  try {
    const currentTarget = sessionRecord.bridgeRecord.captureCurrentTargetInternalV1();
    const current = authority.captureCurrentStableInputInternalV1();
    const ready = current.kind === "captured" && current.directTarget !== null
      ? authority.captureReadyActiveStableTargetInternalV1(current.directTarget)
      : null;
    if (
      currentTarget === null || current.kind !== "captured" || current.directTarget === null ||
      current.sourceRevision === null || current.targetProof === null ||
      current.directTarget !== currentTarget.target ||
      current.sourceRevision !== currentTarget.sourceRevision ||
      currentTarget.frame !== resumedRecord.frame || ready?.kind !== "captured" ||
      ready.directTarget !== current.directTarget ||
      ready.sourceRevision !== current.sourceRevision ||
      !authority.isCurrentDirectTargetInternalV1(current.targetProof) ||
      !authority.isCurrentReadyActiveStableTargetInternalV1(ready.proof)
    ) return false;
    const contract = captureManagedSurfacePreparedInputBindingContractInternalV1(
      current.contract,
    );
    successor = prepareNarrativeStableHostCandidateActionBindingInternalV1(
      runtimeRecord,
      "root",
      resumedRecord.attempt,
      true,
    );
    if (
      !commitNarrativeStableHostCandidateActionBindingInternalV1(
        runtimeRecord,
        successor,
        contract,
      )
    ) {
      retireNarrativeStableHostCandidateActionBindingInternalV1(successor);
      return false;
    }
    return true;
  } catch {
    if (successor !== null) {
      retireNarrativeStableHostCandidateActionBindingInternalV1(successor);
    }
    return false;
  }
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
  const listeners = [...record.renderListeners];
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
  const preparation = ({}) as NarrativeStableRootPreparationInternalV1;
  narrativeStableRootPreparationRecordsInternalV1.set(
    preparation,
    {
      session,
      bridgeRecord: record.bridgeRecord,
      attempt,
      target: current.target,
      sourceRevision: current.sourceRevision,
      frame: current.frame,
    },
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
    : ({
      kind: "root" as const,
      preparation: rootPreparation,
    });
  const historyEntry = historyPreparation === null
    ? null
    : record.currentHistoryEntry?.preparation === historyPreparation
    ? record.currentHistoryEntry
    : ({
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
  const listeners = [...record.listeners];
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
  const renderListeners = [
    ...record.renderListeners,
  ];
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
    } else {
      const materialization = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(
        entry.playerObservation,
      );
      const controllerRecord = materialization?.controllerRecord ?? null;
      if (controllerRecord !== null) {
        disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(controllerRecord);
      } else if (materialization?.fault !== null && materialization?.fault !== undefined) {
        retireNarrativeStableDialoguePlayerFaultMaterializationInternalV1(materialization);
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
  const exactBridge = input.bridge;
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
  session = {
    getReadinessSnapshotInternalV1(
      this: NarrativeStableSessionInternalV1,
    ): NarrativeStableReadinessSnapshotInternalV1 {
      if (narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord) {
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
        return ((): void => {});
      }
      sessionRecord.listeners.add(listener);
      let subscribed = true;
      return ((): void => {
        if (!subscribed) return;
        subscribed = false;
        sessionRecord.listeners.delete(listener);
      });
    },

    getHistoryChildLifecycleInternalV1(
      this: NarrativeStableSessionInternalV1,
    ): NarrativeStableHistoryChildLifecycleInternalV1 {
      if (narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      return sessionRecord.historyChildLifecycle;
    },

    attachHostInternalV1(
      this: NarrativeStableSessionInternalV1,
      attachmentInput: Readonly<{ readonly hostIdentity: object }>,
    ): NarrativeStableHostLeaseInternalV1 {
      if (narrativeStableSessionRecordsInternalV1.get(session) !== sessionRecord) {
        throw new TypeError("ui.narrative_stable_session_invalid");
      }
      const hostIdentity = attachmentInput.hostIdentity;
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
      lease = {
        isCurrentInternalV1(this: NarrativeStableHostLeaseInternalV1): boolean {
          if (narrativeStableHostLeaseRecordsInternalV1.get(lease) !== leaseRecord) {
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
          if (narrativeStableHostLeaseRecordsInternalV1.get(lease) !== leaseRecord) {
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
      };
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
  };

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
    sessionRecord.unsubscribeStateInternalV1 = bridgeRecord.compositeRuntimeKernel
      .subscribeStateInternalV1(
        () => notifyNarrativeStableSessionStateInternalV1(session, sessionRecord),
      );
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
  const { session, hostIdentity, portalContainer, inputRouter, isGestureCurrent } = input;
  const sessionRecord = (typeof session === "object" || typeof session === "function") &&
      session !== null
    ? narrativeStableSessionRecordsInternalV1.get(session)
    : undefined;
  if (
    sessionRecord === undefined || sessionRecord.terminal ||
    !sessionRecord.bridgeRecord.active ||
    ((typeof hostIdentity !== "object" && typeof hostIdentity !== "function") ||
      hostIdentity === null) ||
    typeof HTMLDivElement !== "function" || !(portalContainer instanceof HTMLDivElement) ||
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
    lease = session.attachHostInternalV1({ hostIdentity });
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
      source = {
        getSnapshotInternalV1(
          this: NarrativeStableHostRenderSourceInternalV1,
        ): NarrativeStableHostRenderSnapshotInternalV1 {
          const sourceRecord = narrativeStableHostRenderSourceRecordsInternalV1.get(source);
          if (sourceRecord === undefined) {
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
            sourceRecord === undefined || typeof listener !== "function"
          ) {
            throw new TypeError("ui.narrative_stable_host_attachment_invalid");
          }
          const retainedSessionRecord = sourceRecord.sessionRecord;
          if (
            retainedSessionRecord === null || retainedSessionRecord.terminal ||
            retainedSessionRecord.renderSource !== source
          ) {
            return ((): void => {});
          }
          retainedSessionRecord.renderListeners.add(listener);
          const holder: { listener: (() => void) | null } = { listener };
          sourceRecord.listenerHolders.add(holder);
          let active = true;
          return ((): void => {
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
      };
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
        return lease.isCurrentInternalV1();
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
      const guard: ManagedSurfaceStableReadinessCommitGuardInternalV1 = {
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
      };
      let result: ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessReadyWithCommitGuardInternalV1"
        ]
      >;
      try {
        const envelope = {
          readinessEvidence: {
            applicationEpoch: preparationRecord.attempt.identity.allocation.applicationEpoch,
            surfaceInstanceId: preparationRecord.attempt.identity.surfaceInstanceId,
          },
          publisherLease: preparationRecord.target.publisherLease,
          sourceRevision: preparationRecord.sourceRevision,
        };
        const kernel = sessionRecord.bridgeRecord.compositeRuntimeKernel;
        result = outcome === "ready"
          ? kernel.settleStableReadinessReadyWithCommitGuardInternalV1(envelope, guard)
          : kernel.settleStableReadinessFailedWithCommitGuardInternalV1(envelope, guard);
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
      const guard: ManagedSurfaceStableReadinessCommitGuardInternalV1 = {
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
      };
      try {
        const result = outcome === "ready"
          ? familyClaim.readinessAuthority
            .settleExactParentTransientChildReadinessReadyInternalV1(
              preparationRecord.candidate,
              guard,
            )
          : familyClaim.readinessAuthority
            .settleExactParentTransientChildReadinessFailedInternalV1(
              preparationRecord.candidate,
              guard,
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
        lease.releaseInternalV1();
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
            sessionRecord.bridge.disposeInternalV1();
          } catch {
            terminalizeNarrativeStableSessionInternalV1(sessionRecord.bridgeRecord);
          }
        });
      }
      retireNarrativeStableHostRuntimeExposureInternalV1(runtimeRecord);
    };
    attachment = {
      settleRootReadinessReadyInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableRootPreparationInternalV1,
        readyCommit: NarrativeStableHostReadyCommitInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = attachmentHolder.dispatch;
        return dispatch?.settleRootReady(preparation, readyCommit) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleRootReadinessFailedInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableRootPreparationInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = attachmentHolder.dispatch;
        return dispatch?.settleRootFailed(preparation) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleHistoryReadinessReadyInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableHistoryChildPreparationInternalV1,
        readyCommit: NarrativeStableHostReadyCommitInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = attachmentHolder.dispatch;
        return dispatch?.settleHistoryReady(preparation, readyCommit) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      settleHistoryReadinessFailedInternalV1(
        this: NarrativeStableHostAttachmentInternalV1,
        preparation: NarrativeStableHistoryChildPreparationInternalV1,
      ): NarrativeStableReadinessSettlementResultInternalV1 {
        const dispatch = attachmentHolder.dispatch;
        return dispatch?.settleHistoryFailed(preparation) ??
          narrativeStableReadinessStaleResultInternalV1;
      },
      releaseInternalV1(this: NarrativeStableHostAttachmentInternalV1): void {
        attachmentHolder.dispatch?.release();
      },
    };
    attachmentHolder.dispatch = {
      settleRootReady: (preparation, readyCommit) => settleRoot(preparation, readyCommit, "ready"),
      settleRootFailed: (preparation) => settleRoot(preparation, null, "failed"),
      settleHistoryReady: (preparation, readyCommit) =>
        settleHistory(preparation, readyCommit, "ready"),
      settleHistoryFailed: (preparation) => settleHistory(preparation, null, "failed"),
      release,
    };
    runtime = { attachment, renderSource };
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
      focusGeneration: {},
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
      lease.releaseInternalV1();
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
  const { hostRuntime, renderEntry, portalShell, initialFocusTarget } = input;
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
    return ({
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
  readyCommit = ({}) as NarrativeStableHostReadyCommitInternalV1;
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
  return ({
    kind: "prepared" as const,
    readyCommit,
    completion: null,
  });
}

function captureNarrativeBarrierActivationGateInternalV1(
  value: unknown,
): NarrativeStableBarrierActivationGateBindingInternalV1 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const gate = value as ManagedSurfaceFamilyActivationGateInternalV1;
  return typeof gate.isOpen === "function" ? { gate } : null;
}

function captureNarrativeDialoguePlayerTargetPhaseInternalV1(
  bridgeRecord: NarrativeStablePublisherBridgeRecordInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
): "preparing" | "active" | "suspended" | null {
  return captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(
    bridgeRecord.compositeRuntimeKernel.getStateInternalV1(),
    target,
  );
}

function captureNarrativeDialoguePlayerTargetPhaseFromStateInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
): "preparing" | "active" | "suspended" | null {
  const targetRecord = narrativeTargetFrameRecordsInternalV1.get(target);
  if (
    targetRecord === undefined ||
    !state.stableAcceptedBaselines.some((baseline) =>
      baseline.kind === "accepted" && baseline.sourceRevision === targetRecord.sourceRevision &&
      baseline.targets.includes(target)
    )
  ) return null;
  for (const entry of state.stableRuntimeBindings) {
    const binding = entry.binding;
    if (
      binding.kind === "ready_instance" &&
      binding.instance.attempt.desiredTarget.admittedTarget === target
    ) return binding.instance.phase;
    if (binding.kind === "preparing" && binding.attempt.desiredTarget.admittedTarget === target) {
      return "preparing";
    }
  }
  return null;
}

function collectNarrativeDialoguePlayerTargetsFromStateInternalV1(
  state: ManagedSurfaceStableCompositeStateInternalV1,
): readonly ManagedSurfaceStableAdmittedTargetInternalV1[] {
  const targets: ManagedSurfaceStableAdmittedTargetInternalV1[] = [];
  const add = (target: ManagedSurfaceStableAdmittedTargetInternalV1): void => {
    if (!targets.includes(target)) targets.push(target);
  };
  for (const entry of state.stableRuntimeBindings) {
    const binding = entry.binding;
    if (binding.kind === "ready_instance") {
      add(binding.instance.attempt.desiredTarget.admittedTarget);
      continue;
    }
    if (binding.kind === "preparing") add(binding.attempt.desiredTarget.admittedTarget);
    if (binding.retainedSubtree !== null) {
      add(binding.retainedSubtree.root.attempt.desiredTarget.admittedTarget);
      for (const descendant of binding.retainedSubtree.descendants) {
        add(descendant.attempt.desiredTarget.admittedTarget);
      }
    }
  }
  return targets;
}

function notifyNarrativeStableDialoguePlayerControllerInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  const listeners = [...record.listeners];
  for (const listener of listeners) {
    if (!record.active) break;
    try {
      listener();
    } catch {
      // Dialogue player observers are isolated after the cached update.
    }
  }
}

function isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
  materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1,
  controllerRecord: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  generation: object,
): boolean {
  const target = controllerRecord.target;
  const frame = controllerRecord.frame;
  const bridgeRecord = controllerRecord.bridgeRecord;
  return materialization.active && materialization.controllerRecord === controllerRecord &&
    controllerRecord.active && controllerRecord.materialization === materialization &&
    controllerRecord.phaseGeneration === generation && target !== null && frame !== null &&
    bridgeRecord !== null && bridgeRecord.active &&
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) === controllerRecord &&
    narrativeTargetFrameRecordsInternalV1.get(target)?.frame === frame &&
    captureNarrativeDialoguePlayerTargetPhaseInternalV1(bridgeRecord, target) ===
      controllerRecord.snapshot.phase;
}

function publishNarrativeStableDialoguePlayerMaterializationInternalV1(
  materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1,
): void {
  const controllerRecord = materialization.controllerRecord;
  if (controllerRecord === null || !materialization.active) return;
  const generation = controllerRecord.phaseGeneration;
  if (
    !isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
      materialization,
      controllerRecord,
      generation,
    )
  ) return;
  const snapshot = controllerRecord.snapshot;
  const previousSnapshot = materialization.snapshot;
  if (snapshot !== previousSnapshot) materialization.snapshot = snapshot;
  if (snapshot === materialization.notifiedSnapshot) return;
  materialization.notifiedSnapshot = snapshot;
  if (snapshot.playerProfile !== previousSnapshot.playerProfile) {
    const bridgeRecord = controllerRecord.bridgeRecord;
    const session = bridgeRecord?.session ?? null;
    const sessionRecord = session === null
      ? null
      : narrativeStableSessionRecordsInternalV1.get(session) ?? null;
    if (
      bridgeRecord !== null && session !== null && sessionRecord !== null &&
      !sessionRecord.terminal && sessionRecord.bridgeRecord === bridgeRecord &&
      isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
        materialization,
        controllerRecord,
        generation,
      )
    ) {
      notifyNarrativeStableHostRenderStateInternalV1(session, sessionRecord);
    }
  }
  const listenerHolders = [
    ...materialization.listenerHolders,
  ];
  for (const holder of listenerHolders) {
    const listener = holder.listener;
    if (listener === null) continue;
    if (
      !isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
        materialization,
        controllerRecord,
        generation,
      ) || materialization.snapshot !== snapshot
    ) break;
    try {
      listener();
    } catch {
      // Dialogue player observation subscribers are isolated after the cached update.
    }
  }
}

function retireNarrativeStableDialoguePlayerMaterializationInternalV1(
  controllerRecord: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): (() => void) | null {
  const materialization = controllerRecord.materialization;
  if (materialization === null) return null;
  controllerRecord.materialization = null;
  if (!materialization.active) return null;
  materialization.snapshot = controllerRecord.snapshot;
  materialization.notifiedSnapshot = controllerRecord.snapshot;
  const listenerHolders = [
    ...materialization.listenerHolders,
  ];
  materialization.active = false;
  materialization.controllerRecord = null;
  materialization.resolverHolder.materialization = null;
  materialization.listeners.clear();
  const unsubscribe = materialization.controllerUnsubscribe;
  materialization.controllerUnsubscribe = null;
  if (unsubscribe !== null) {
    try {
      unsubscribe();
    } catch {
      // The materialization is already logically fenced when cleanup is hostile.
    }
  }
  let pendingHolders: readonly { listener: (() => void) | null }[] | null = listenerHolders;
  return ((): void => {
    const retained = pendingHolders;
    pendingHolders = null;
    if (retained === null) return;
    for (const holder of retained) {
      const listener = holder.listener;
      holder.listener = null;
      materialization.listenerHolders.delete(holder);
      if (listener === null) continue;
      try {
        listener();
      } catch {
        // Terminal observation subscribers are isolated after logical retirement.
      }
    }
    materialization.listenerHolders.clear();
  });
}

function createNarrativeStableDialoguePlayerMaterializationInternalV1(
  controller: NarrativeStableDialoguePlayerControllerInternalV1,
): NarrativeStableDialoguePlayerMaterializationRecordInternalV1 {
  const controllerRecord = narrativeStableDialoguePlayerControllerRecordsInternalV1.get(
    controller,
  );
  if (controllerRecord === undefined || !controllerRecord.active) {
    throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
  }
  const retained = controllerRecord.materialization;
  if (retained !== null && retained.active) return retained;

  let materialization!: NarrativeStableDialoguePlayerMaterializationRecordInternalV1;
  let observation!: NarrativeStableDialoguePlayerObservationInternalV1;
  const resolverHolder: {
    materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1 | null;
  } = { materialization: null };
  const textResolver = ((textId: string): string => {
    const current = resolverHolder.materialization;
    const currentControllerRecord = current?.controllerRecord ?? null;
    if (current === null || currentControllerRecord === null || typeof textId !== "string") {
      throw new TypeError("ui.narrative_stable_dialogue_player_text_resolver_invalid");
    }
    const generation = currentControllerRecord.phaseGeneration;
    const binding = currentControllerRecord.textBinding;
    if (
      binding === null ||
      !isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
        current,
        currentControllerRecord,
        generation,
      )
    ) {
      throw new TypeError("ui.narrative_stable_dialogue_player_text_resolver_invalid");
    }
    let resolved: unknown;
    try {
      resolved = binding.resolveTextInternalV1(textId);
    } catch {
      throw new TypeError("ui.narrative_stable_dialogue_player_text_resolver_invalid");
    }
    if (
      !isNarrativeStableDialoguePlayerMaterializationCurrentInternalV1(
        current,
        currentControllerRecord,
        generation,
      ) || currentControllerRecord.textBinding !== binding || typeof resolved !== "string"
    ) {
      throw new TypeError("ui.narrative_stable_dialogue_player_text_resolver_invalid");
    }
    return resolved;
  }) satisfies NarrativeStableDialoguePlayerTextResolverInternalV1;
  observation = {
    getSnapshotInternalV1(
      this: NarrativeStableDialoguePlayerObservationInternalV1,
    ): NarrativeStableDialoguePlayerSnapshotInternalV1 {
      const current = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(observation);
      if (current !== materialization) {
        throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
      }
      if (current.active && current.fault !== null) throw current.fault;
      return current.snapshot;
    },
    subscribeInternalV1(
      this: NarrativeStableDialoguePlayerObservationInternalV1,
      listener: () => void,
    ): () => void {
      const current = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(observation);
      if (current !== materialization || typeof listener !== "function") {
        throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
      }
      if (!current.active) return narrativeStableDialoguePlayerLateUnsubscribeInternalV1;
      const holder: { listener: (() => void) | null } = { listener };
      current.listeners.add(listener);
      current.listenerHolders.add(holder);
      return ((): void => {
        const retainedListener = holder.listener;
        holder.listener = null;
        current.listenerHolders.delete(holder);
        if (retainedListener !== null) current.listeners.delete(retainedListener);
      });
    },
  };
  materialization = {
    controllerRecord,
    observation,
    textResolver,
    snapshot: controllerRecord.snapshot,
    notifiedSnapshot: controllerRecord.snapshot,
    controllerUnsubscribe: null,
    active: true,
    listeners: new Set(),
    listenerHolders: new Set(),
    resolverHolder,
    fault: null,
    faultTarget: null,
    faultFrame: null,
  };
  resolverHolder.materialization = materialization;
  controllerRecord.materialization = materialization;
  narrativeStableDialoguePlayerObservationRecordsInternalV1.set(observation, materialization);
  try {
    materialization.controllerUnsubscribe = controller.subscribeInternalV1(
      () => publishNarrativeStableDialoguePlayerMaterializationInternalV1(materialization),
    );
  } catch {
    retireNarrativeStableDialoguePlayerMaterializationInternalV1(controllerRecord);
    throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
  }
  if (
    !materialization.active || controllerRecord.materialization !== materialization ||
    materialization.controllerUnsubscribe === null
  ) {
    retireNarrativeStableDialoguePlayerMaterializationInternalV1(controllerRecord);
    throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
  }
  publishNarrativeStableDialoguePlayerMaterializationInternalV1(materialization);
  return materialization;
}

function retireNarrativeStableDialoguePlayerFaultMaterializationInternalV1(
  materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1,
): void {
  if (!materialization.active || materialization.fault === null) return;
  const target = materialization.faultTarget;
  if (
    target !== null &&
    narrativeStableDialoguePlayerFaultMaterializationsByTargetInternalV1.get(target) ===
      materialization
  ) {
    narrativeStableDialoguePlayerFaultMaterializationsByTargetInternalV1.delete(target);
  }
  materialization.snapshot = {
    kind: "passive" as const,
    phase: "suspended" as const,
    playbackMode: "normal" as const,
    playerProfile: materialization.snapshot.playerProfile,
  };
  materialization.notifiedSnapshot = materialization.snapshot;
  materialization.active = false;
  materialization.fault = null;
  materialization.faultTarget = null;
  materialization.faultFrame = null;
  materialization.resolverHolder.materialization = null;
  materialization.listeners.clear();
  for (const holder of materialization.listenerHolders) holder.listener = null;
  materialization.listenerHolders.clear();
}

function createNarrativeStableDialoguePlayerFaultMaterializationInternalV1(
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
  frame: NarrativeStableAdmittedFrameInternalV1,
  phase: "preparing" | "active" | "suspended",
): NarrativeStableDialoguePlayerMaterializationRecordInternalV1 {
  const retained = narrativeStableDialoguePlayerFaultMaterializationsByTargetInternalV1.get(
    target,
  );
  if (retained?.active && retained.fault !== null && retained.faultFrame === frame) {
    return retained;
  }
  if (retained !== undefined) {
    retireNarrativeStableDialoguePlayerFaultMaterializationInternalV1(retained);
  }
  const snapshot = {
    kind: "passive" as const,
    phase,
    playbackMode: "normal" as const,
    playerProfile: defaultPlayerProfileV1,
  };
  let materialization!: NarrativeStableDialoguePlayerMaterializationRecordInternalV1;
  let observation!: NarrativeStableDialoguePlayerObservationInternalV1;
  const resolverHolder: {
    materialization: NarrativeStableDialoguePlayerMaterializationRecordInternalV1 | null;
  } = { materialization: null };
  const textResolver = ((_textId: string): string => {
    throw new TypeError("ui.narrative_stable_dialogue_player_text_resolver_invalid");
  }) satisfies NarrativeStableDialoguePlayerTextResolverInternalV1;
  observation = {
    getSnapshotInternalV1(
      this: NarrativeStableDialoguePlayerObservationInternalV1,
    ): NarrativeStableDialoguePlayerSnapshotInternalV1 {
      const current = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(observation);
      if (current !== materialization) {
        throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
      }
      if (current.active && current.fault !== null) throw current.fault;
      return current.snapshot;
    },
    subscribeInternalV1(
      this: NarrativeStableDialoguePlayerObservationInternalV1,
      listener: () => void,
    ): () => void {
      const current = narrativeStableDialoguePlayerObservationRecordsInternalV1.get(observation);
      if (current !== materialization || typeof listener !== "function") {
        throw new TypeError("ui.narrative_stable_dialogue_player_observation_invalid");
      }
      if (!current.active) return narrativeStableDialoguePlayerLateUnsubscribeInternalV1;
      const holder: { listener: (() => void) | null } = { listener };
      current.listeners.add(listener);
      current.listenerHolders.add(holder);
      return ((): void => {
        const retainedListener = holder.listener;
        holder.listener = null;
        current.listenerHolders.delete(holder);
        if (retainedListener !== null) current.listeners.delete(retainedListener);
      });
    },
  };
  materialization = {
    controllerRecord: null,
    observation,
    textResolver,
    snapshot,
    notifiedSnapshot: snapshot,
    controllerUnsubscribe: null,
    active: true,
    listeners: new Set(),
    listenerHolders: new Set(),
    resolverHolder,
    fault: new TypeError("ui.narrative_stable_dialogue_player_observation_invalid"),
    faultTarget: target,
    faultFrame: frame,
  };
  resolverHolder.materialization = materialization;
  narrativeStableDialoguePlayerObservationRecordsInternalV1.set(observation, materialization);
  narrativeStableDialoguePlayerFaultMaterializationsByTargetInternalV1.set(
    target,
    materialization,
  );
  return materialization;
}

function publishNarrativeStableDialoguePlayerModeInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  mode: NarrativeStablePlaybackModeInternalV1,
): void {
  if (
    !record.active || record.snapshot.kind !== "say" ||
    record.snapshot.playbackMode === mode
  ) return;
  record.snapshot = {
    ...record.snapshot,
    playbackMode: mode,
  };
  notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
}

function retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  const attempt = record.currentAutomaticAttempt;
  record.currentAutomaticAttempt = null;
  if (attempt === null) return;
  const attemptRecord = narrativeAttemptRecordInternalV1<
    NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
  >(attempt);
  if (attemptRecord !== null) attemptRecord.spent = true;
}

function captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  generation: object,
): NarrativeStableAdmittedFrameInternalV1 | null {
  const bridgeRecord = record.bridgeRecord;
  const target = record.target;
  const frame = record.frame;
  if (
    !record.active || record.phaseGeneration !== generation || bridgeRecord === null ||
    target === null || frame === null || record.snapshot.phase !== "active" ||
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
  ) return null;
  let current: NarrativeStableCurrentTargetProjectionInternalV1 | null;
  try {
    current = bridgeRecord.captureCurrentTargetInternalV1();
  } catch {
    return null;
  }
  return current?.target === target && current.frame === frame ? frame : null;
}

function issueNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  kind: "player_auto" | "skip" | "mode_reset",
): NarrativeStableDialoguePlayerAutomaticAttemptInternalV1 | null {
  const bridgeRecord = record.bridgeRecord;
  const target = record.target;
  const frame = record.frame;
  const generation = record.phaseGeneration;
  if (
    bridgeRecord === null || target === null || frame === null ||
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(record, generation) !== frame
  ) return null;
  const expectedModeState = bridgeRecord.currentModeState;
  if (
    (kind === "player_auto" && expectedModeState.mode !== "auto") ||
    ((kind === "skip" || kind === "mode_reset") && expectedModeState.mode !== "skip")
  ) return null;
  retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(record);
  const attemptRecord: NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1 = {
    kind,
    controllerRecord: record,
    generation,
    target,
    frame,
    expectedModeState,
    spent: false,
  };
  const attempt = createNarrativeAttemptInternalV1<
    NarrativeStableDialoguePlayerAutomaticAttemptInternalV1,
    NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
  >(attemptRecord);
  record.currentAutomaticAttempt = attempt;
  return attempt;
}

function captureNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  attempt: NarrativeStableDialoguePlayerAutomaticAttemptInternalV1,
  kind: NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1["kind"],
): NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1 | null {
  const attemptRecord = narrativeAttemptRecordInternalV1<
    NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
  >(attempt);
  const currentAttemptRecord = narrativeAttemptRecordInternalV1<
    NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
  >(record.currentAutomaticAttempt);
  const bridgeRecord = record.bridgeRecord;
  if (
    attemptRecord === null || attemptRecord.kind !== kind || attemptRecord.spent ||
    attemptRecord.controllerRecord !== record || currentAttemptRecord !== attemptRecord ||
    bridgeRecord === null || bridgeRecord.currentModeState !== attemptRecord.expectedModeState ||
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(
        record,
        attemptRecord.generation,
      ) !== attemptRecord.frame
  ) return null;
  return attemptRecord;
}

function dispatchNarrativeStableDialoguePlayerAutomaticAdvanceInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  attempt: NarrativeStableSayPlayerAutoAttemptInternalV1 | NarrativeStableSaySkipAttemptInternalV1,
  kind: "player_auto" | "skip",
):
  | NarrativeStableSayPlayerAutoDispatchResultInternalV1
  | NarrativeStableSaySkipDispatchResultInternalV1 {
  const attemptRecord = captureNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
    record,
    attempt,
    kind,
  );
  if (attemptRecord === null) {
    if (
      narrativeAttemptRecordInternalV1<
        NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
      >(
        record.currentAutomaticAttempt,
      ) === attemptRecord
    ) {
      retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(record);
    }
    return narrativeSayPlayerAutomaticStaleResultInternalV1;
  }
  const finalizeAttempt = (): void => {
    attemptRecord.spent = true;
    if (
      narrativeAttemptRecordInternalV1<
        NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
      >(
        record.currentAutomaticAttempt,
      ) === attemptRecord
    ) record.currentAutomaticAttempt = null;
  };
  if (record.snapshot.kind !== "say" || !record.snapshot.revealComplete) {
    finalizeAttempt();
    return kind === "player_auto"
      ? narrativeSayPlayerAutoNotReadyResultInternalV1
      : narrativeSayPlayerAutomaticStaleResultInternalV1;
  }
  const legacy = record.legacySayRevealController;
  const legacyRecord = legacy === null
    ? undefined
    : narrativeStableSayRevealControllerRecordsInternalV1.get(legacy);
  const bridgeRecord = record.bridgeRecord;
  if (
    legacyRecord === undefined || !legacyRecord.active || bridgeRecord === null ||
    legacyRecord.bridgeRecord !== bridgeRecord || legacyRecord.callbackClaim !== null ||
    bridgeRecord.sayCallbackClaim !== null || bridgeRecord.saySemanticInFlightClaim !== null ||
    !legacyRecord.isCurrentInternalV1()
  ) {
    finalizeAttempt();
    return narrativeSayPlayerAutomaticStaleResultInternalV1;
  }
  const captureExactCurrentFrame = (): NarrativeStableAdmittedFrameInternalV1 | null =>
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(
      record,
      attemptRecord.generation,
    );
  if (captureExactCurrentFrame() === null) {
    finalizeAttempt();
    return narrativeSayPlayerAutomaticStaleResultInternalV1;
  }
  const boundaryClaim = {};
  legacyRecord.callbackClaim = boundaryClaim;
  bridgeRecord.sayCallbackClaim = boundaryClaim;
  finalizeAttempt();
  if (legacyRecord.currentActivationAttempt !== null) {
    const manual = narrativeAttemptRecordInternalV1<
      NarrativeStablePhysicalActionAttemptRecordInternalV1
    >(legacyRecord.currentActivationAttempt);
    if (manual !== null) manual.spent = true;
    legacyRecord.currentActivationAttempt = null;
  }
  if (legacyRecord.currentContentAutoAttempt !== null) {
    const content = narrativeAttemptRecordInternalV1<
      NarrativeStableSayContentAutoAttemptRecordInternalV1
    >(legacyRecord.currentContentAutoAttempt);
    if (content !== null) content.spent = true;
    legacyRecord.currentContentAutoAttempt = null;
  }
  const result = legacyRecord.dispatchAdvanceInternalV1(boundaryClaim, captureExactCurrentFrame);
  if (result.kind === "dispatched") void result.completion.catch(() => {});
  return result.kind === "dispatched"
    ? result
    : result.kind === "faulted"
    ? narrativeSayPlayerAutomaticFaultedResultInternalV1
    : narrativeSayPlayerAutomaticStaleResultInternalV1;
}

function dispatchNarrativeStableDialoguePlayerModeResetInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  attempt: NarrativeStablePlaybackModeResetAttemptInternalV1,
): NarrativeStablePlaybackModeResetDispatchResultInternalV1 {
  const attemptRecord = captureNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
    record,
    attempt,
    "mode_reset",
  );
  if (attemptRecord === null) {
    if (
      narrativeAttemptRecordInternalV1<
        NarrativeStableDialoguePlayerAutomaticAttemptRecordInternalV1
      >(
        record.currentAutomaticAttempt,
      ) === attemptRecord
    ) {
      retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(record);
    }
    return narrativePlaybackModeResetStaleResultInternalV1;
  }
  const bridgeRecord = record.bridgeRecord;
  if (bridgeRecord === null) {
    attemptRecord.spent = true;
    record.currentAutomaticAttempt = null;
    return narrativePlaybackModeResetStaleResultInternalV1;
  }
  const returnMode = attemptRecord.expectedModeState.skipReturnMode;
  const successorModeState = createNarrativePlaybackModeStateInternalV1(returnMode);
  if (
    !compareAndSetNarrativePlaybackModeStateInternalV1(
      bridgeRecord,
      attemptRecord.expectedModeState,
      successorModeState,
    )
  ) {
    attemptRecord.spent = true;
    record.currentAutomaticAttempt = null;
    return narrativePlaybackModeResetStaleResultInternalV1;
  }
  attemptRecord.spent = true;
  record.currentAutomaticAttempt = null;
  record.automaticRemainingMs = null;
  publishNarrativeStableDialoguePlayerModeInternalV1(record, returnMode);
  return ({
    kind: "reset" as const,
    mode: returnMode,
    completion: null,
  });
}

function markNarrativeStableDialoguePlayerSeenInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (
    record.seenCommitted || record.snapshot.kind !== "say" || record.frame === null ||
    record.profileBinding === null
  ) return;
  record.seenCommitted = true;
  try {
    record.profileBinding.markSeenInternalV1(
      record.frame.pending.definitionId,
      record.frame.pending.seenRevision,
    );
  } catch {
    // Seen is logical-once even when the external profile writer fails.
  }
}

function resetNarrativeStableDialoguePlayerModeInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  const bridgeRecord = record.bridgeRecord;
  if (bridgeRecord === null) return;
  const currentMode = bridgeRecord.currentModeState;
  if (currentMode.mode === "normal") return;
  compareAndSetNarrativePlaybackModeStateInternalV1(
    bridgeRecord,
    currentMode,
    createNarrativePlaybackModeStateInternalV1("normal"),
  );
}

function faultNarrativeStableDialoguePlayerControllerInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (!record.active) return;
  record.phaseGeneration = {};
  const cancel = record.cancelTick;
  record.cancelTick = null;
  resetNarrativeStableDialoguePlayerModeInternalV1(record);
  disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
  if (cancel !== null) {
    try {
      cancel();
    } catch {
      // The logical controller fence wins over hostile clock cleanup.
    }
  }
}

function isNarrativeDialogueClockTimestampInternalV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function shouldScheduleNarrativeStableDialoguePlayerTickInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): boolean {
  if (
    !record.active || record.snapshot.phase !== "active" ||
    record.clockBinding === null || record.bridgeRecord === null || record.frame === null
  ) return false;
  if (record.snapshot.kind === "passive") {
    return record.frame.pending.kind === "hold" && record.automaticRemainingMs !== null;
  }
  if (!record.snapshot.revealComplete) return true;
  if (record.bridgeRecord.currentModeState.mode === "auto") return true;
  if (record.bridgeRecord.currentModeState.mode === "skip") return true;
  return record.frame.pending.kind === "say" && record.frame.pending.advancePolicy === "auto";
}

function dispatchNarrativeStableDialoguePlayerContentAutoInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): NarrativeStableSayContentAutoDispatchResultInternalV1 | null {
  const legacy = record.legacySayRevealController;
  if (legacy === null) return null;
  let attempt: NarrativeStableSayContentAutoAttemptInternalV1 | null;
  try {
    attempt = legacy.issueContentAutoAttemptInternalV1();
  } catch {
    return narrativePhysicalActionFaultedResultInternalV1;
  }
  if (attempt === null) return null;
  try {
    const result = legacy.dispatchContentAutoInternalV1(attempt);
    if (result.kind === "dispatched") void result.completion.catch(() => {});
    return result;
  } catch {
    return narrativePhysicalActionFaultedResultInternalV1;
  }
}

function processNarrativeStableDialoguePlayerSkipTickInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  generation: object,
): void {
  const bridgeRecord = record.bridgeRecord;
  const binding = record.profileBinding;
  const frame = record.frame;
  if (
    bridgeRecord === null || binding === null || frame === null || frame.pending.kind !== "say" ||
    record.snapshot.kind !== "say" ||
    bridgeRecord.currentModeState.mode !== "skip" ||
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(record, generation) !== frame
  ) return;
  const expectedModeState = bridgeRecord.currentModeState;
  let profile!: DeepReadonly<PlayerProfileV1>;
  let profileFault = false;
  try {
    profile = binding.getSnapshotInternalV1();
  } catch {
    profileFault = true;
  }
  if (
    !record.active || record.phaseGeneration !== generation || record.profileBinding !== binding ||
    record.bridgeRecord !== bridgeRecord || bridgeRecord.currentModeState !== expectedModeState ||
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(record, generation) !== frame
  ) return;
  if (profileFault) {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  const seenRevision = profile.seen[frame.pending.definitionId];
  const seen = seenRevision !== undefined && seenRevision >= frame.pending.seenRevision;
  if (!seen && record.policy.skipPolicy === "skip_read") {
    const attempt = issueNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
      record,
      "mode_reset",
    ) as NarrativeStablePlaybackModeResetAttemptInternalV1 | null;
    if (
      attempt !== null &&
      dispatchNarrativeStableDialoguePlayerModeResetInternalV1(record, attempt).kind === "reset"
    ) {
      requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
    }
    return;
  }
  if (profile !== record.profile) {
    record.profile = profile;
  }
  record.revealRemainder = 0;
  record.automaticRemainingMs = null;
  const revealLength = record.snapshot.revealLength;
  record.snapshot = {
    ...record.snapshot,
    playerProfile: profile,
    revealedCharacters: revealLength,
    revealComplete: true,
  };
  if (!seen && record.policy.skipPolicy === "skip_all") {
    markNarrativeStableDialoguePlayerSeenInternalV1(record);
  } else if (seen) {
    record.seenCommitted = true;
  }
  notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
  const attempt = issueNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
    record,
    "skip",
  ) as NarrativeStableSaySkipAttemptInternalV1 | null;
  if (attempt !== null) {
    dispatchNarrativeStableDialoguePlayerAutomaticAdvanceInternalV1(record, attempt, "skip");
  }
}

function requestNarrativeStableDialoguePlayerTickInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
  generation: object,
): void {
  if (
    !record.active || record.phaseGeneration !== generation || record.cancelTick !== null ||
    !shouldScheduleNarrativeStableDialoguePlayerTickInternalV1(record)
  ) return;
  const binding = record.clockBinding;
  if (binding === null) return;
  let requestReturned = false;
  let callbackEnteredSynchronously = false;
  let callbackConsumed = false;
  const callback = (nowValue: number): void => {
    if (!requestReturned) {
      callbackEnteredSynchronously = true;
      callbackConsumed = true;
      return;
    }
    if (callbackConsumed) {
      if (
        record.active && record.phaseGeneration === generation &&
        record.snapshot.phase === "active"
      ) {
        faultNarrativeStableDialoguePlayerControllerInternalV1(record);
      }
      return;
    }
    callbackConsumed = true;
    if (
      !record.active || record.phaseGeneration !== generation ||
      record.snapshot.phase !== "active"
    ) return;
    record.cancelTick = null;
    if (
      !isNarrativeDialogueClockTimestampInternalV1(nowValue) ||
      record.lastTickMs === null || nowValue < record.lastTickMs
    ) {
      faultNarrativeStableDialoguePlayerControllerInternalV1(record);
      return;
    }
    const elapsed = nowValue - record.lastTickMs;
    record.lastTickMs = nowValue;
    const bridgeRecord = record.bridgeRecord;
    if (bridgeRecord === null) return;
    if (record.snapshot.kind === "passive") {
      if (
        record.frame?.pending.kind !== "hold" || record.automaticRemainingMs === null ||
        record.holdExpiryController === null
      ) return;
      record.automaticRemainingMs = Math.max(0, record.automaticRemainingMs - elapsed);
      const holdFrame = record.frame;
      const holdPending = holdFrame.pending;
      if (holdPending.kind !== "hold") return;
      const holdController = record.holdExpiryController;
      const entryRemainingMs = holdPending.remainingMs;
      const dispatchHoldTime = (elapsedMs: number): "dispatched" | "withheld" | "faulted" => {
        let attempt: NarrativeStableHoldExpiryControllerAttemptInternalV1 | null = null;
        try {
          attempt = holdController.issueAttemptInternalV1();
          if (attempt === null) return "withheld";
          const result = holdController.dispatchInternalV1(attempt, elapsedMs);
          if (result.kind === "faulted") {
            // The admitted hold frame cannot settle time — the Story bound
            // no `dispatchTime` port. Fault the player instead of retrying:
            // rescheduling would spin the presentation clock forever on a
            // boundary that can never expire.
            faultNarrativeStableDialoguePlayerControllerInternalV1(record);
            return "faulted";
          }
          if (result.kind !== "dispatched") return "withheld";
          void result.completion.catch(() => {});
          return "dispatched";
        } catch {
          faultNarrativeStableDialoguePlayerControllerInternalV1(record);
          return "faulted";
        }
      };
      const tickQuantumMs = holdPending.tickQuantumMs;
      if (tickQuantumMs !== undefined && record.automaticRemainingMs > 0) {
        // The block declared an authoritative commit cadence: fold the
        // presented elapsed into partial hold-scoped time ticks at whole-quantum
        // boundaries so mid-hold autosaves keep at most one quantum of
        // uncommitted progress. The ledger only advances on an actual
        // dispatch, so a withheld attempt (an earlier completion still in
        // flight) is caught up by a later crossing.
        const presentedElapsedMs = entryRemainingMs - record.automaticRemainingMs;
        const flushTargetMs = Math.floor(presentedElapsedMs / tickQuantumMs) * tickQuantumMs;
        let ledger = narrativeHoldDispatchLedgersInternalV1.get(holdFrame);
        if (ledger === undefined) {
          ledger = { dispatchedElapsedMs: 0 };
          narrativeHoldDispatchLedgersInternalV1.set(holdFrame, ledger);
        }
        if (flushTargetMs > ledger.dispatchedElapsedMs) {
          const partial = dispatchHoldTime(flushTargetMs - ledger.dispatchedElapsedMs);
          if (partial === "faulted") return;
          if (partial === "dispatched") ledger.dispatchedElapsedMs = flushTargetMs;
        }
      }
      if (record.automaticRemainingMs > 0) {
        requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
        return;
      }
      // The countdown started from the frame's authoritative remainingMs, so
      // expiry proposes exactly the milliseconds no partial tick dispatched
      // yet: the sum over the boundary always equals the entry remainder.
      const dispatchedElapsedMs =
        narrativeHoldDispatchLedgersInternalV1.get(holdFrame)?.dispatchedElapsedMs ?? 0;
      const finalElapsedMs = entryRemainingMs - dispatchedElapsedMs;
      if (finalElapsedMs < 1) return;
      if (dispatchHoldTime(finalElapsedMs) === "withheld") {
        // A partial commit is still settling; retry expiry on the next
        // presentation tick instead of leaving the boundary parked. A frame
        // change already retired the record, so the request no-ops, and a
        // faulted dispatch returned distinctly without scheduling.
        requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
      }
      return;
    }
    if (bridgeRecord.currentModeState.mode === "skip") {
      const remaining = record.automaticRemainingMs ?? 40;
      record.automaticRemainingMs = Math.max(0, remaining - elapsed);
      if (record.automaticRemainingMs > 0) {
        requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
        return;
      }
      record.automaticRemainingMs = null;
      processNarrativeStableDialoguePlayerSkipTickInternalV1(record, generation);
      return;
    }
    const wasComplete = record.snapshot.revealComplete;
    let nextCharacters = record.snapshot.revealedCharacters;
    if (!wasComplete) {
      const total = BigInt(elapsed) * BigInt(record.policy.textRevealCharsPerSecond) +
        BigInt(record.revealRemainder);
      const advanced = Number(total / 1_000n);
      record.revealRemainder = Number(total % 1_000n);
      nextCharacters = Math.min(
        record.snapshot.revealLength,
        record.snapshot.revealedCharacters + advanced,
      );
    }
    const complete = nextCharacters === record.snapshot.revealLength;
    if (nextCharacters !== record.snapshot.revealedCharacters || (!wasComplete && complete)) {
      record.snapshot = {
        ...record.snapshot,
        revealedCharacters: nextCharacters,
        revealComplete: complete,
      };
      if (complete) markNarrativeStableDialoguePlayerSeenInternalV1(record);
      notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
    }
    if (!record.active || record.phaseGeneration !== generation) return;
    if (complete && record.frame?.pending.kind === "say" && !wasComplete) {
      if (record.frame.pending.advancePolicy === "auto") {
        const contentResult = dispatchNarrativeStableDialoguePlayerContentAutoInternalV1(record);
        if (contentResult !== null && contentResult.kind !== "not_ready") return;
        if (
          record.bridgeRecord?.sayCallbackClaim !== null ||
          record.bridgeRecord?.saySemanticInFlightClaim !== null
        ) return;
      }
      if (record.bridgeRecord?.currentModeState.mode === "auto") {
        record.automaticRemainingMs = record.policy.autoWaitMs;
      }
    }
    if (
      complete && record.frame?.pending.kind === "say" &&
      record.frame.pending.advancePolicy === "auto" && wasComplete
    ) {
      const contentResult = dispatchNarrativeStableDialoguePlayerContentAutoInternalV1(record);
      if (contentResult !== null && contentResult.kind !== "not_ready") return;
      if (
        record.bridgeRecord?.sayCallbackClaim !== null ||
        record.bridgeRecord?.saySemanticInFlightClaim !== null
      ) return;
    }
    if (complete && record.bridgeRecord?.currentModeState.mode === "auto") {
      if (record.automaticRemainingMs === null) {
        record.automaticRemainingMs = record.policy.autoWaitMs;
      } else if (wasComplete) {
        record.automaticRemainingMs = Math.max(0, record.automaticRemainingMs - elapsed);
      }
      if (
        record.automaticRemainingMs === 0 &&
        record.frame?.candidateSnapshot.voiceActivityPort
            ?.isCurrentVoicePlayingInternalV1() === true
      ) {
        requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
        return;
      }
      if (record.automaticRemainingMs === 0) {
        const attempt = issueNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(
          record,
          "player_auto",
        ) as NarrativeStableSayPlayerAutoAttemptInternalV1 | null;
        if (attempt !== null) {
          dispatchNarrativeStableDialoguePlayerAutomaticAdvanceInternalV1(
            record,
            attempt,
            "player_auto",
          );
        }
        return;
      }
    }
    requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
  };
  let cancel: unknown;
  try {
    cancel = binding.requestTickInternalV1(callback);
  } catch {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  requestReturned = true;
  if (typeof cancel !== "function") {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  if (callbackEnteredSynchronously) {
    try {
      cancel();
    } catch {
      // The synchronous callback is already classified as a current fault.
    }
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  if (
    !record.active || record.phaseGeneration !== generation ||
    record.snapshot.phase !== "active" ||
    !shouldScheduleNarrativeStableDialoguePlayerTickInternalV1(record)
  ) {
    try {
      cancel();
    } catch {
      // A synchronously consumed or stale tick stays fenced.
    }
    return;
  }
  record.cancelTick = cancel as () => void;
}

function revealAllNarrativeStableDialoguePlayerInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (
    !record.active || record.snapshot.kind !== "say" || record.snapshot.phase !== "active" ||
    record.snapshot.revealComplete
  ) return;
  const clockBinding = record.clockBinding;
  const frame = record.frame;
  const previousGeneration = record.phaseGeneration;
  let nowValue: unknown;
  let clockFault = false;
  if (clockBinding === null || frame === null) {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  try {
    nowValue = clockBinding.nowInternalV1();
  } catch {
    nowValue = null;
    clockFault = true;
  }
  if (
    record.clockBinding !== clockBinding ||
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(
        record,
        previousGeneration,
      ) !== frame
  ) return;
  if (
    clockFault || !isNarrativeDialogueClockTimestampInternalV1(nowValue) ||
    (record.lastTickMs !== null && nowValue < record.lastTickMs)
  ) {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  const cancel = record.cancelTick;
  record.cancelTick = null;
  record.phaseGeneration = {};
  const generation = record.phaseGeneration;
  record.lastTickMs = nowValue;
  record.revealRemainder = 0;
  record.snapshot = {
    ...record.snapshot,
    revealedCharacters: record.snapshot.revealLength,
    revealComplete: true,
  };
  markNarrativeStableDialoguePlayerSeenInternalV1(record);
  notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
  if (cancel !== null) {
    try {
      cancel();
    } catch {
      // Manual logical reveal remains committed when clock cleanup is hostile.
    }
  }
  if (
    record.active && record.phaseGeneration === generation && record.frame !== null &&
    captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(record, generation) === record.frame
  ) {
    const mode = record.bridgeRecord?.currentModeState.mode;
    record.automaticRemainingMs = mode === "skip"
      ? 40
      : mode === "auto"
      ? record.policy.autoWaitMs
      : null;
    requestNarrativeStableDialoguePlayerTickInternalV1(record, generation);
  }
}

function ensureNarrativeStableDialoguePlayerLegacyControllerInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (
    !record.active || record.legacySayRevealController !== null || record.bridge === null ||
    record.snapshot.kind !== "say" || record.snapshot.phase !== "active"
  ) return;
  const revealGenerationPort = {
    capturePhaseInternalV1: () =>
      record.active && record.snapshot.kind === "say" && record.snapshot.revealComplete
        ? "complete" as const
        : "incomplete" as const,
    revealAllInternalV1: () => revealAllNarrativeStableDialoguePlayerInternalV1(record),
  };
  try {
    record.legacySayRevealController = createNarrativeStableSayRevealControllerInternalV1({
      bridge: record.bridge,
      revealGenerationPort,
    });
  } catch {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
  }
}

function ensureNarrativeStableDialoguePlayerHoldControllerInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (
    !record.active || record.holdExpiryController !== null || record.bridge === null ||
    record.snapshot.phase !== "active" || record.frame?.pending.kind !== "hold"
  ) return;
  try {
    record.holdExpiryController = createNarrativeStableHoldExpiryControllerInternalV1(
      record.bridge,
    );
  } catch {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
  }
}

function publishNarrativeDialoguePlayerProfileInternalV1(
  holder: { record: NarrativeStableDialoguePlayerControllerRecordInternalV1 | null },
): void {
  const record = holder.record;
  if (!record?.active || record.profileBinding === null) return;
  const binding = record.profileBinding;
  const generation = record.phaseGeneration;
  const bridgeRecord = record.bridgeRecord;
  const target = record.target;
  const frame = record.frame;
  const phase = record.snapshot.phase;
  if (bridgeRecord === null || target === null || frame === null) return;
  let nextProfile!: DeepReadonly<PlayerProfileV1>;
  let profileFault = false;
  try {
    nextProfile = binding.getSnapshotInternalV1();
  } catch {
    profileFault = true;
  }
  if (
    holder.record !== record || !record.active || record.profileBinding !== binding ||
    record.phaseGeneration !== generation || record.bridgeRecord !== bridgeRecord ||
    record.target !== target || record.frame !== frame ||
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record ||
    captureNarrativeDialoguePlayerTargetPhaseInternalV1(bridgeRecord, target) !== phase
  ) return;
  if (profileFault) {
    faultNarrativeStableDialoguePlayerControllerInternalV1(record);
    return;
  }
  if (nextProfile === record.profile) return;
  record.profile = nextProfile;
  const previous = record.snapshot;
  record.snapshot = previous.kind === "say"
    ? ({ ...previous, playerProfile: nextProfile })
    : ({ ...previous, playerProfile: nextProfile });
  notifyNarrativeStableDialoguePlayerControllerInternalV1(record);
}

function disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(
  record: NarrativeStableDialoguePlayerControllerRecordInternalV1,
): void {
  if (!record.active) return;
  retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(record);
  record.active = false;
  record.phaseGeneration = {};
  const cancelTick = record.cancelTick;
  record.cancelTick = null;
  record.automaticRemainingMs = null;
  const legacySayRevealController = record.legacySayRevealController;
  record.legacySayRevealController = null;
  const holdExpiryController = record.holdExpiryController;
  record.holdExpiryController = null;
  const target = record.target;
  if (
    target !== null &&
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) === record
  ) narrativeStableDialoguePlayerControllersByTargetInternalV1.delete(target);
  const profile = record.profile;
  record.snapshot = {
    kind: "passive" as const,
    phase: "suspended" as const,
    playbackMode: "normal" as const,
    playerProfile: profile,
  };
  const terminalObservationDelivery = retireNarrativeStableDialoguePlayerMaterializationInternalV1(
    record,
  );
  record.listeners.clear();
  for (const holder of record.listenerHolders) {
    holder.record = null;
    holder.listener = null;
  }
  record.listenerHolders.clear();
  const unsubscribe = record.rawUnsubscribe;
  record.rawUnsubscribe = null;
  record.bridgeRecord = null;
  record.bridge = null;
  record.target = null;
  record.frame = null;
  record.profileBinding = null;
  record.clockBinding = null;
  record.textBinding = null;
  if (unsubscribe !== null) {
    try {
      unsubscribe();
    } catch {
      // Logical retirement remains complete when raw cleanup is hostile.
    }
  }
  if (cancelTick !== null) {
    try {
      cancelTick();
    } catch {
      // Logical retirement remains complete when clock cleanup is hostile.
    }
  }
  if (legacySayRevealController !== null) {
    try {
      legacySayRevealController.disposeInternalV1();
    } catch {
      // Logical retirement remains complete when legacy cleanup is hostile.
    }
  }
  if (holdExpiryController !== null) {
    try {
      holdExpiryController.disposeInternalV1();
    } catch {
      // Logical retirement remains complete when hold cleanup is hostile.
    }
  }
  if (terminalObservationDelivery !== null) {
    terminalObservationDelivery();
  }
}

export function createNarrativeStableDialoguePlayerControllerInternalV1(
  input: CreateNarrativeStableDialoguePlayerControllerInputInternalV1,
): NarrativeStableDialoguePlayerControllerInternalV1 {
  const { bridge, target, frame } = input;
  const bridgeRecord = (typeof bridge === "object" || typeof bridge === "function") &&
      bridge !== null
    ? narrativeStablePublisherBridgeRecordsInternalV1.get(bridge)
    : undefined;
  const targetRecord = (typeof target === "object" || typeof target === "function") &&
      target !== null
    ? narrativeTargetFrameRecordsInternalV1.get(target)
    : undefined;
  let current: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
  try {
    current = bridgeRecord?.captureCurrentTargetInternalV1() ?? null;
  } catch {
    current = null;
  }
  if (
    bridgeRecord === undefined || !bridgeRecord.active || targetRecord === undefined ||
    targetRecord.bridgeIdentity !== bridgeRecord.bridgeIdentity || targetRecord.frame !== frame ||
    current?.target !== target || current.frame !== frame
  ) throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
  const expectedKernelState = bridgeRecord.compositeRuntimeKernel.getStateInternalV1();
  const phase = captureNarrativeDialoguePlayerTargetPhaseInternalV1(bridgeRecord, target);
  if (phase === null) {
    throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
  }
  if (narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.has(target)) {
    throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
  }
  const existing = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target);
  if (
    existing?.active && existing.target === target && existing.frame === frame &&
    existing.controller !== null
  ) return existing.controller;
  const factoryClaim = {};
  narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.set(target, factoryClaim);
  const failClaim = (): never => {
    if (
      narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.get(target) === factoryClaim
    ) narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.delete(target);
    throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
  };
  const isExactFactoryCurrent = (): boolean => {
    let projected: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
    try {
      projected = bridgeRecord.captureCurrentTargetInternalV1();
    } catch {
      return false;
    }
    return bridgeRecord.active && projected?.target === target && projected.frame === frame &&
      narrativeTargetFrameRecordsInternalV1.get(target) === targetRecord &&
      bridgeRecord.compositeRuntimeKernel.getStateInternalV1() === expectedKernelState &&
      captureNarrativeDialoguePlayerTargetPhaseInternalV1(bridgeRecord, target) === phase &&
      narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.get(target) === factoryClaim;
  };
  const profileBinding = frame.candidateSnapshot.playerProfile;
  const clockBinding = frame.candidateSnapshot.presentationClock;
  const textBinding = frame.candidateSnapshot.textResolver;
  if (profileBinding === undefined || clockBinding === undefined || textBinding === undefined) {
    return failClaim();
  }
  let profile: DeepReadonly<PlayerProfileV1>;
  let reducedMotion: unknown;
  let resolvedSpeakerText: string | null = null;
  let resolvedText = "";
  try {
    profile = profileBinding.getSnapshotInternalV1();
  } catch {
    return failClaim();
  }
  if (!isExactFactoryCurrent()) {
    return failClaim();
  }
  try {
    reducedMotion = clockBinding.prefersReducedMotionInternalV1();
  } catch {
    return failClaim();
  }
  if (!isExactFactoryCurrent() || typeof reducedMotion !== "boolean") return failClaim();
  if (frame.pending.kind === "say") {
    if (frame.pending.speakerTextId !== null) {
      try {
        resolvedSpeakerText = textBinding.resolveTextInternalV1(
          frame.pending.speakerTextId,
        );
      } catch {
        return failClaim();
      }
      if (!isExactFactoryCurrent() || typeof resolvedSpeakerText !== "string") {
        return failClaim();
      }
    }
    try {
      resolvedText = textBinding.resolveTextInternalV1(frame.pending.textId);
    } catch {
      return failClaim();
    }
    if (!isExactFactoryCurrent() || typeof resolvedText !== "string") return failClaim();
  }
  const preferences = profile.preferences;
  const instant = reducedMotion || preferences.textRevealCharsPerSecond === 0;
  const snapshot: NarrativeStableDialoguePlayerSnapshotInternalV1 = frame.pending.kind === "say"
    ? ({
      kind: "say" as const,
      phase,
      playbackMode: bridgeRecord.currentModeState.mode,
      playerProfile: profile,
      resolvedSpeakerText,
      resolvedText,
      revealedCharacters: instant ? resolvedText.length : 0,
      revealLength: resolvedText.length,
      revealComplete: instant,
    })
    : ({
      kind: "passive" as const,
      phase,
      playbackMode: "normal" as const,
      playerProfile: profile,
    });
  let controller!: NarrativeStableDialoguePlayerControllerInternalV1;
  let record!: NarrativeStableDialoguePlayerControllerRecordInternalV1;
  controller = {
    getSnapshotInternalV1(
      this: NarrativeStableDialoguePlayerControllerInternalV1,
    ): NarrativeStableDialoguePlayerSnapshotInternalV1 {
      const currentRecord = narrativeStableDialoguePlayerControllerRecordsInternalV1.get(
        controller,
      );
      if (currentRecord !== record) {
        throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
      }
      return currentRecord.snapshot;
    },
    subscribeInternalV1(
      this: NarrativeStableDialoguePlayerControllerInternalV1,
      listener: () => void,
    ): () => void {
      const currentRecord = narrativeStableDialoguePlayerControllerRecordsInternalV1.get(
        controller,
      );
      if (currentRecord !== record || typeof listener !== "function") {
        throw new TypeError("ui.narrative_stable_dialogue_player_controller_invalid");
      }
      if (!currentRecord.active) return narrativeStableDialoguePlayerLateUnsubscribeInternalV1;
      const holder: {
        record: NarrativeStableDialoguePlayerControllerRecordInternalV1 | null;
        listener: (() => void) | null;
      } = { record: currentRecord, listener };
      currentRecord.listeners.add(listener);
      currentRecord.listenerHolders.add(holder);
      return (() => {
        const ownedRecord = holder.record;
        const ownedListener = holder.listener;
        holder.record = null;
        holder.listener = null;
        if (ownedRecord === null || ownedListener === null) return;
        ownedRecord.listeners.delete(ownedListener);
        ownedRecord.listenerHolders.delete(holder);
      });
    },
    disposeInternalV1(this: NarrativeStableDialoguePlayerControllerInternalV1): void {
      const currentRecord = narrativeStableDialoguePlayerControllerRecordsInternalV1.get(
        controller,
      );
      if (currentRecord !== record) return;
      disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(currentRecord);
    },
  };
  record = {
    controller,
    bridge,
    bridgeRecord,
    target,
    frame,
    profileBinding,
    clockBinding,
    textBinding,
    profile,
    policy: {
      textRevealCharsPerSecond: preferences.textRevealCharsPerSecond,
      autoWaitMs: preferences.autoWaitMs,
      skipPolicy: preferences.skipPolicy,
      reducedMotion,
    },
    snapshot,
    phaseGeneration: {},
    cancelTick: null,
    lastTickMs: null,
    revealRemainder: 0,
    automaticRemainingMs: null,
    currentAutomaticAttempt: null,
    seenCommitted: false,
    legacySayRevealController: null,
    holdExpiryController: null,
    active: true,
    rawUnsubscribe: null,
    materialization: null,
    listeners: new Set(),
    listenerHolders: new Set(),
  };
  narrativeStableDialoguePlayerControllerRecordsInternalV1.set(controller, record);
  narrativeStableDialoguePlayerControllersByTargetInternalV1.set(target, record);
  const rawListenerHolder: {
    record: NarrativeStableDialoguePlayerControllerRecordInternalV1 | null;
  } = { record };
  let rawUnsubscribe: unknown;
  try {
    rawUnsubscribe = profileBinding.subscribeInternalV1(
      () => publishNarrativeDialoguePlayerProfileInternalV1(rawListenerHolder),
    );
  } catch {
    disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
    rawListenerHolder.record = null;
    return failClaim();
  }
  if (typeof rawUnsubscribe !== "function") {
    disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
    rawListenerHolder.record = null;
    return failClaim();
  }
  let rawSubscriptionActive = true;
  const releaseRawSubscription = (): void => {
    if (!rawSubscriptionActive) return;
    rawSubscriptionActive = false;
    rawListenerHolder.record = null;
    (rawUnsubscribe as () => void)();
  };
  let installedCurrent: NarrativeStableCurrentTargetProjectionInternalV1 | null = null;
  try {
    installedCurrent = bridgeRecord.captureCurrentTargetInternalV1();
  } catch {
    installedCurrent = null;
  }
  if (
    !record.active || rawListenerHolder.record !== record || !bridgeRecord.active ||
    installedCurrent?.target !== target ||
    installedCurrent.frame !== frame ||
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record ||
    bridgeRecord.compositeRuntimeKernel.getStateInternalV1() !== expectedKernelState ||
    captureNarrativeDialoguePlayerTargetPhaseInternalV1(bridgeRecord, target) !== phase
  ) {
    rawListenerHolder.record = null;
    try {
      releaseRawSubscription();
    } catch {
      // A synchronous subscription fault cannot revive the retired controller.
    }
    if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
    return failClaim();
  }
  record.rawUnsubscribe = releaseRawSubscription;
  let currentProfile!: DeepReadonly<PlayerProfileV1>;
  let profileReadFault = false;
  try {
    currentProfile = profileBinding.getSnapshotInternalV1();
  } catch {
    profileReadFault = true;
  }
  if (
    !record.active || rawListenerHolder.record !== record || !isExactFactoryCurrent() ||
    narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
  ) {
    if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
    return failClaim();
  }
  if (profileReadFault) {
    disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
    return failClaim();
  }
  if (currentProfile !== record.profile) {
    record.profile = currentProfile;
    record.snapshot = {
      ...record.snapshot,
      playerProfile: currentProfile,
    };
  }
  if (instant && snapshot.kind === "say") {
    markNarrativeStableDialoguePlayerSeenInternalV1(record);
    if (
      !record.active || !isExactFactoryCurrent() ||
      narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
    ) {
      if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
      return failClaim();
    }
  }
  if (phase === "active") {
    if (record.snapshot.kind === "passive" && frame.pending.kind === "hold") {
      record.automaticRemainingMs = frame.pending.remainingMs;
    } else if (record.snapshot.kind === "say") {
      const mode = bridgeRecord.currentModeState.mode;
      record.automaticRemainingMs = mode === "skip"
        ? 40
        : mode === "auto" && record.snapshot.revealComplete
        ? record.policy.autoWaitMs
        : null;
    }
    const shouldSchedule = shouldScheduleNarrativeStableDialoguePlayerTickInternalV1(record);
    if (shouldSchedule) {
      const generation = record.phaseGeneration;
      let nowValue: unknown;
      let clockFault = false;
      try {
        nowValue = clockBinding.nowInternalV1();
      } catch {
        nowValue = null;
        clockFault = true;
      }
      if (
        !record.active || record.phaseGeneration !== generation || !isExactFactoryCurrent() ||
        narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
      ) {
        if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
        return failClaim();
      }
      if (clockFault || !isNarrativeDialogueClockTimestampInternalV1(nowValue)) {
        faultNarrativeStableDialoguePlayerControllerInternalV1(record);
        return failClaim();
      }
      record.lastTickMs = nowValue;
    }
    ensureNarrativeStableDialoguePlayerLegacyControllerInternalV1(record);
    ensureNarrativeStableDialoguePlayerHoldControllerInternalV1(record);
    if (
      !record.active || !isExactFactoryCurrent() ||
      narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
    ) {
      if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
      return failClaim();
    }
    if (shouldSchedule) {
      requestNarrativeStableDialoguePlayerTickInternalV1(record, record.phaseGeneration);
      if (
        !record.active || !isExactFactoryCurrent() ||
        narrativeStableDialoguePlayerControllersByTargetInternalV1.get(target) !== record
      ) {
        if (record.active) disposeNarrativeStableDialoguePlayerControllerRecordInternalV1(record);
        return failClaim();
      }
    }
  }
  narrativeStableDialoguePlayerControllerClaimsByTargetInternalV1.delete(target);
  return controller;
}

function captureSayRevealGenerationPortInternalV1(
  value: unknown,
): NarrativeStableSayRevealGenerationPortInternalV1 | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const port = value as NarrativeStableSayRevealGenerationPortInternalV1;
  if (
    typeof port.capturePhaseInternalV1 !== "function" ||
    typeof port.revealAllInternalV1 !== "function"
  ) {
    return null;
  }
  return port;
}

export function createNarrativeStableSayRevealControllerInternalV1(
  input: CreateNarrativeStableSayRevealControllerInputInternalV1,
): NarrativeStableSayRevealControllerInternalV1 {
  const bridge = input.bridge;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  const revealGenerationPort = captureSayRevealGenerationPortInternalV1(
    input.revealGenerationPort,
  );
  if (
    bridgeRecord === undefined || bridgeRecord.sayRevealControllerClaim !== null ||
    bridgeRecord.sayCallbackClaim !== null || revealGenerationPort === null
  ) {
    throw new TypeError("ui.narrative_stable_say_reveal_controller_invalid");
  }
  const kernel = bridgeRecord.compositeRuntimeKernel;
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel);

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
      current === null || current.frame.pending.kind !== "say"
    ) {
      return null;
    }
    const captured = stableActionAuthority.captureReadyActiveStableTargetInternalV1(
      current.target,
    );
    if (
      captured.kind !== "captured" || captured.directTarget !== current.target ||
      captured.sourceRevision !== current.sourceRevision
    ) {
      return null;
    }
    return ({ ...current, proof: captured.proof });
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

  const controllerClaim = {};
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
    const attemptRecord = narrativeAttemptRecordInternalV1<
      NarrativeStablePhysicalActionAttemptRecordInternalV1
    >(record.currentActivationAttempt);
    if (attemptRecord !== null) attemptRecord.spent = true;
    record.currentActivationAttempt = null;
  };
  const retireCurrentContentAutoAttempt = (): void => {
    if (record.currentContentAutoAttempt === null) return;
    const attemptRecord = narrativeAttemptRecordInternalV1<
      NarrativeStableSayContentAutoAttemptRecordInternalV1
    >(record.currentContentAutoAttempt);
    if (attemptRecord !== null) attemptRecord.spent = true;
    record.currentContentAutoAttempt = null;
  };
  const releaseDeferredModePublication = (
    boundaryClaim: object,
    publishCurrent: boolean,
  ): void => {
    if (bridgeRecord.deferredModePublicationClaim !== boundaryClaim) return;
    bridgeRecord.deferredModePublicationClaim = null;
    if (!publishCurrent || !record.active || !readyActiveFrameStillCurrent()) return;
    const dialoguePlayerRecord = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(
      record.directTarget,
    );
    if (
      dialoguePlayerRecord?.active !== true || dialoguePlayerRecord.frame !== record.frame ||
      dialoguePlayerRecord.legacySayRevealController !== controller ||
      dialoguePlayerRecord.snapshot.kind !== "say"
    ) return;
    const mode = bridgeRecord.currentModeState.mode;
    dialoguePlayerRecord.automaticRemainingMs = mode === "skip"
      ? 40
      : mode === "auto" && dialoguePlayerRecord.snapshot.revealComplete
      ? dialoguePlayerRecord.policy.autoWaitMs
      : null;
    publishNarrativeStableDialoguePlayerModeInternalV1(dialoguePlayerRecord, mode);
    requestNarrativeStableDialoguePlayerTickInternalV1(
      dialoguePlayerRecord,
      dialoguePlayerRecord.phaseGeneration,
    );
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
      releaseDeferredModePublication(boundaryClaim, false);
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
    releaseDeferredModePublication(boundaryClaim, true);
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
    const portBinding = record.semanticDispatchPort;
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
    const resolution: InteractionResolutionV1 = {
      kind: "advance" as const,
    };
    const request = {
      expectedOccurrenceId: currentFrame.pending.occurrenceId,
      resolution,
    } satisfies NarrativeStableSemanticResolutionRequestInternalV1;
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
        portBinding.dispatchResolutionInternalV1(request),
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
    return ({
      kind: "dispatched" as const,
      completion,
    });
  };

  controller = {
    issueContentAutoAttemptInternalV1(
      this: NarrativeStableSayRevealControllerInternalV1,
    ): NarrativeStableSayContentAutoAttemptInternalV1 | null {
      if (
        !record.active || record.frame.pending.kind !== "say" ||
        record.frame.pending.advancePolicy !== "auto" || record.callbackClaim !== null ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        if (record.currentContentAutoAttempt !== null) {
          const predecessor = narrativeAttemptRecordInternalV1<
            NarrativeStableSayContentAutoAttemptRecordInternalV1
          >(record.currentContentAutoAttempt);
          if (
            predecessor === null ||
            stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
              predecessor.proof,
            )
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
        const attemptRecord: NarrativeStableSayContentAutoAttemptRecordInternalV1 = {
          controller,
          controllerClaim: record.controllerClaim,
          proof: current.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort: current.frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        const attempt = createNarrativeAttemptInternalV1<
          NarrativeStableSayContentAutoAttemptInternalV1,
          NarrativeStableSayContentAutoAttemptRecordInternalV1
        >(attemptRecord);
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
        !record.active ||
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const attemptRecord = narrativeAttemptRecordInternalV1<
        NarrativeStableSayContentAutoAttemptRecordInternalV1
      >(attempt);
      const currentAttemptRecord = narrativeAttemptRecordInternalV1<
        NarrativeStableSayContentAutoAttemptRecordInternalV1
      >(record.currentContentAutoAttempt);
      if (
        attemptRecord === null || attemptRecord.controller !== controller ||
        attemptRecord.controllerClaim !== record.controllerClaim || attemptRecord.spent ||
        currentAttemptRecord !== attemptRecord
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
          !stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
            attemptRecord.proof,
          )
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

      const boundaryClaim = {};
      record.callbackClaim = boundaryClaim;
      bridgeRecord.sayCallbackClaim = boundaryClaim;
      attemptRecord.spent = true;
      record.currentContentAutoAttempt = null;
      retireCurrentActivationAttempt();
      const dialoguePlayerRecord = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(
        record.directTarget,
      );
      if (
        dialoguePlayerRecord?.legacySayRevealController === controller &&
        dialoguePlayerRecord.frame === record.frame
      ) {
        retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(dialoguePlayerRecord);
      }

      let phase: unknown;
      let phaseThrew = false;
      try {
        phase = record.revealGenerationPort.capturePhaseInternalV1();
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
      revoke(false);
    },
  };
  record = {
    bridgeRecord,
    controllerClaim,
    directTarget: initial.target,
    sourceRevision: initial.sourceRevision,
    frame: initial.frame,
    semanticDispatchPort: initial.frame.candidateSnapshot.semanticDispatchPort,
    revealGenerationPort,
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
    const unsubscribe = kernel.subscribeStateInternalV1(() => {
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
        releaseDeferredModePublication(boundaryClaim, false);
        record.callbackClaim = null;
        releaseLifecycleObserver();
      }
    });
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

export function createNarrativeStableHoldExpiryControllerInternalV1(
  bridge: NarrativeStablePublisherBridgeInternalV1,
): NarrativeStableHoldExpiryControllerInternalV1 {
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  if (bridgeRecord === undefined || bridgeRecord.holdExpiryControllerClaim !== null) {
    throw new TypeError("ui.narrative_stable_hold_expiry_controller_invalid");
  }
  const kernel = bridgeRecord.compositeRuntimeKernel;
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(kernel);

  const captureCurrentHold = ():
    | Readonly<{
      readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
      readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
      readonly frame: NarrativeStableAdmittedFrameInternalV1;
      readonly proof: ManagedSurfaceStableReadyActiveTargetProofInternalV1;
    }>
    | null => {
    const current = bridgeRecord.captureCurrentTargetInternalV1();
    if (
      current === null || current.frame.pending.kind !== "hold"
    ) {
      return null;
    }
    const captured = stableActionAuthority.captureReadyActiveStableTargetInternalV1(
      current.target,
    );
    if (
      captured.kind !== "captured" || captured.directTarget !== current.target ||
      captured.sourceRevision !== current.sourceRevision
    ) {
      return null;
    }
    return ({ ...current, proof: captured.proof });
  };

  let initial;
  try {
    initial = captureCurrentHold();
  } catch (error) {
    throw new TypeError("ui.narrative_stable_hold_expiry_controller_unavailable", {
      cause: error,
    });
  }
  if (initial === null) {
    throw new TypeError("ui.narrative_stable_hold_expiry_controller_unavailable");
  }

  let active = true;
  let semanticDispatchStarted = false;
  let currentAttempt: NarrativeStableHoldExpiryControllerAttemptInternalV1 | null = null;
  let unsubscribeState = (): void => {};
  let controller!: NarrativeStableHoldExpiryControllerInternalV1;
  const controllerClaim = {};
  bridgeRecord.holdExpiryControllerClaim = controllerClaim;

  const revoke = (): void => {
    if (!active) return;
    active = false;
    currentAttempt = null;
    try {
      unsubscribeState();
    } catch {
      // Revocation remains fail closed even if a caller-provided diagnostic wrapper fails.
    }
    if (bridgeRecord.holdExpiryControllerClaim === controllerClaim) {
      bridgeRecord.holdExpiryControllerClaim = null;
    }
  };

  const generationStillCurrent = (): boolean => {
    const current = captureCurrentHold();
    return current !== null && current.target === initial.target &&
      current.sourceRevision === initial.sourceRevision && current.frame === initial.frame;
  };

  try {
    const unsubscribe = kernel.subscribeStateInternalV1(() => {
      if (!active) return;
      try {
        if (!generationStillCurrent()) revoke();
      } catch {
        revoke();
      }
    });
    if (typeof unsubscribe !== "function") {
      throw new TypeError("ui.narrative_stable_hold_expiry_controller_invalid");
    }
    unsubscribeState = unsubscribe as () => void;
    if (!generationStillCurrent()) {
      throw new TypeError("ui.narrative_stable_hold_expiry_controller_unavailable");
    }
  } catch (error) {
    revoke();
    if (
      error instanceof TypeError &&
      error.message === "ui.narrative_stable_hold_expiry_controller_unavailable"
    ) {
      throw error;
    }
    throw new TypeError("ui.narrative_stable_hold_expiry_controller_unavailable", {
      cause: error,
    });
  }

  controller = {
    issueAttemptInternalV1(
      this: NarrativeStableHoldExpiryControllerInternalV1,
    ): NarrativeStableHoldExpiryControllerAttemptInternalV1 | null {
      if (!active || semanticDispatchStarted) return null;
      try {
        if (currentAttempt !== null) {
          const currentRecord = narrativeAttemptRecordInternalV1<
            NarrativeStableHoldExpiryControllerAttemptRecordInternalV1
          >(currentAttempt);
          if (
            currentRecord === null ||
            stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
              currentRecord.proof,
            )
          ) {
            return null;
          }
          currentRecord.spent = true;
          currentAttempt = null;
        }
        const current = captureCurrentHold();
        if (
          current === null || current.target !== initial.target ||
          current.sourceRevision !== initial.sourceRevision || current.frame !== initial.frame
        ) {
          revoke();
          return null;
        }
        const attemptRecord: NarrativeStableHoldExpiryControllerAttemptRecordInternalV1 = {
          controller,
          proof: current.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort: current.frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        const attempt = createNarrativeAttemptInternalV1<
          NarrativeStableHoldExpiryControllerAttemptInternalV1,
          NarrativeStableHoldExpiryControllerAttemptRecordInternalV1
        >(attemptRecord);
        currentAttempt = attempt;
        return attempt;
      } catch {
        return null;
      }
    },
    dispatchInternalV1(
      this: NarrativeStableHoldExpiryControllerInternalV1,
      attempt: unknown,
      elapsedMs: number,
    ): NarrativeStableHoldExpiryDispatchResultInternalV1 {
      if (!active) return narrativeHoldExpiryStaleResultInternalV1;
      if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 1) {
        return narrativeHoldExpiryFaultedResultInternalV1;
      }
      if ((typeof attempt !== "object" && typeof attempt !== "function") || attempt === null) {
        return narrativeHoldExpiryStaleResultInternalV1;
      }
      const record = narrativeAttemptRecordInternalV1<
        NarrativeStableHoldExpiryControllerAttemptRecordInternalV1
      >(attempt);
      const currentRecord = narrativeAttemptRecordInternalV1<
        NarrativeStableHoldExpiryControllerAttemptRecordInternalV1
      >(currentAttempt);
      if (
        record === null || record.controller !== controller || record.spent ||
        currentRecord !== record
      ) {
        return narrativeHoldExpiryStaleResultInternalV1;
      }
      record.spent = true;
      currentAttempt = null;

      try {
        if (
          !stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(record.proof)
        ) {
          return narrativeHoldExpiryStaleResultInternalV1;
        }
        const current = bridgeRecord.captureCurrentTargetInternalV1();
        if (
          current === null || current.target !== record.directTarget ||
          current.sourceRevision !== record.sourceRevision || current.frame !== record.frame ||
          current.frame.pending.kind !== "hold" ||
          current.frame.candidateSnapshot.semanticDispatchPort !== record.semanticDispatchPort ||
          current.frame.pending.occurrenceId !== record.frame.pending.occurrenceId
        ) {
          return narrativeHoldExpiryStaleResultInternalV1;
        }
        const portBinding = record.semanticDispatchPort;
        if (portBinding?.dispatchTimeInternalV1 === undefined) {
          return narrativeHoldExpiryFaultedResultInternalV1;
        }
        const request = {
          elapsedMs,
          expectedHoldOccurrenceId: current.frame.pending.occurrenceId,
        } satisfies NarrativeStableSemanticTimeRequestInternalV1;
        if (
          !stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(record.proof)
        ) {
          return narrativeHoldExpiryStaleResultInternalV1;
        }
        semanticDispatchStarted = true;
        let completion: Promise<unknown>;
        try {
          completion = Promise.resolve(portBinding.dispatchTimeInternalV1(request));
        } catch (error) {
          completion = Promise.reject(error);
        }
        // The latch serializes dispatches, it does not end the controller:
        // a partial hold time tick commits with the same admitted frame still
        // current (the bridge reconciles the decremented remainder as
        // unchanged), so once this completion has drained its reconcile the
        // controller may dispatch the next tick. An expiry commit swaps the
        // frame, which revokes here and via the state subscription.
        const settleDispatchLatch = (): void => {
          if (!active) return;
          try {
            if (generationStillCurrent()) {
              semanticDispatchStarted = false;
            } else {
              revoke();
            }
          } catch {
            revoke();
          }
        };
        completion.then(settleDispatchLatch, settleDispatchLatch);
        return ({ kind: "dispatched" as const, completion });
      } catch {
        return narrativeHoldExpiryStaleResultInternalV1;
      }
    },
    disposeInternalV1(this: NarrativeStableHoldExpiryControllerInternalV1): void {
      revoke();
    },
  };
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
  authority = {
    createEnvelopeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      request: {
        readonly actionId: ManagedSurfaceActionIdV1;
        readonly gestureId: ManagedSurfaceGestureIdV1;
      },
    ): ManagedSurfaceActionEnvelopeV1 {
      if (!isCurrent()) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return binding.createEnvelope(request);
    },
    issueChoiceAttemptInternalV1(): null {
      return null;
    },
    issueHoldSkipAttemptInternalV1(): null {
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
      return claimedRoute.routeInternalV1(envelope, attempt);
    },
    disposeInternalV1(this: NarrativeStablePhysicalActionAdmissionInternalV1): void {
      if (!active) return;
      active = false;
      if (bridgeRecord.hostPhysicalActionAdmission === authority) {
        bridgeRecord.hostPhysicalActionAdmission = null;
      }
    },
  };
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
  if (
    (typeof inputRouter !== "object" && typeof inputRouter !== "function") ||
    inputRouter === null || typeof isGestureCurrent !== "function"
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_invalid");
  }

  let initialCapture;
  try {
    initialCapture = stableActionAuthority.captureCurrentStableInputInternalV1();
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
  const initialFrame = bridge.inspectAdmittedTargetFrameInternalV1(
    capturedInitial.directTarget,
  );
  if (
    initialFrame === null ||
    (initialFrame.pending.kind !== "say" && initialFrame.pending.kind !== "choice" &&
      initialFrame.pending.kind !== "hold" && initialFrame.pending.kind !== "custom" &&
      initialFrame.pending.kind !== "presentation_barrier")
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable");
  }

  let active = true;
  let authority!: NarrativeStablePhysicalActionAdmissionInternalV1;
  const admissionClaim = adoptsHostActionBinding ? hostActionBinding.admissionClaim : ({});
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
      ? "hold_skip"
      : actionId === narrativeCustomActionIdInternalV1
      ? "custom"
      : isSayAlias
      ? "say_activation"
      : null;
    if (mappedKind === null) {
      return narrativePhysicalActionUnmappedResultInternalV1;
    }
    const routedAttemptRecord = narrativeAttemptRecordInternalV1<
      NarrativeStableRoutedPhysicalAttemptRecordInternalV1
    >(attempt);
    if (
      routedAttemptRecord !== null && routedAttemptRecord.authority === authority &&
      !routedAttemptRecord.spent &&
      ((routedAttemptRecord.kind === "history_open" && mappedKind !== "history_open") ||
        (routedAttemptRecord.kind === "playback_mode_toggle" &&
          (requestedPlaybackMode === null ||
            routedAttemptRecord.requestedMode !== requestedPlaybackMode)))
    ) return narrativePhysicalActionUnmappedResultInternalV1;
    if (mappedKind === "history_open") {
      if (
        routedAttemptRecord !== null && routedAttemptRecord.kind !== "history_open" &&
        routedAttemptRecord.authority === authority && !routedAttemptRecord.spent
      ) return narrativePhysicalActionUnmappedResultInternalV1;
      const record = routedAttemptRecord?.kind === "history_open" ? routedAttemptRecord : null;
      if (
        record === null || record.authority !== authority || record.spent
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
          const readyActive = stableActionAuthority.captureReadyActiveStableTargetInternalV1(
            record.directParent,
          );
          if (readyActive.kind === "faulted") return "faulted";
          if (
            readyActive.kind !== "captured" ||
            readyActive.directTarget !== record.directParent ||
            readyActive.sourceRevision !== record.sourceRevision
          ) {
            return "stale";
          }
          if (
            !stableActionAuthority.isCurrentDirectTargetInternalV1(record.targetProof)
          ) {
            return "stale";
          }
          const current = stableActionAuthority.captureCurrentStableInputInternalV1();
          if (current.kind === "faulted") return "faulted";
          if (
            current.kind !== "captured" || current.directTarget !== record.directParent ||
            current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
            !equalManagedSurfaceInputBindingContractV1(
              current.contract,
              capturedInitial.contract,
            ) ||
            !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
          ) {
            return "stale";
          }
          const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
          if (
            frame !== record.frame ||
            frame?.candidateSnapshot.historyAvailabilityPort !==
              record.historyAvailabilityPort
          ) {
            return "stale";
          }
          if (
            frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "hold" && frame.pending.kind !== "custom" &&
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
      const availabilityBinding = record.historyAvailabilityPort;
      if (availabilityBinding === undefined) {
        return narrativeHistoryOpenFaultedResultInternalV1;
      }

      const callbackClaim = {};
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
          callbackOutcome = availabilityBinding.readHistoryAvailabilityInternalV1();
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
          intentRecord = {
            bridge,
            stableActionAuthority,
            targetProof: record.targetProof,
            directParent: record.directParent,
            sourceRevision: record.sourceRevision,
            frame: record.frame,
            spent: false,
          };
          intent = createNarrativeAttemptInternalV1<
            NarrativeStableHistoryOpenIntentInternalV1,
            NarrativeStableHistoryOpenIntentRecordInternalV1
          >(intentRecord);
          requestedResult = {
            kind: "requested" as const,
            intent,
            completion: null,
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
        return requestedResult;
      } finally {
        if (bridgeRecord.sayCallbackClaim === callbackClaim) {
          bridgeRecord.sayCallbackClaim = null;
        }
      }
    }
    if (mappedKind === "playback_mode_toggle") {
      const record = routedAttemptRecord?.kind === "playback_mode_toggle"
        ? routedAttemptRecord
        : null;
      if (
        record === null || record.authority !== authority || record.spent ||
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
          bridgeRecord.currentModeState !== record.issuanceModeState ||
          bridgeRecord.deferredModePublicationClaim !== null
        ) {
          return "stale";
        }

        let targetIsCurrent: unknown;
        try {
          targetIsCurrent = stableActionAuthority.isCurrentDirectTargetInternalV1(
            record.targetProof,
          );
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
          current = stableActionAuthority.captureCurrentStableInputInternalV1();
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
            !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
          ) {
            return "stale";
          }
        } catch {
          return "faulted";
        }

        let currentFrame: NarrativeStableAdmittedFrameInternalV1 | null;
        try {
          currentFrame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        } catch {
          return "faulted";
        }
        if (currentFrame !== record.frame) return "stale";
        if (currentFrame.pending.kind === "say") return "say";
        if (
          currentFrame.pending.kind === "choice" || currentFrame.pending.kind === "hold" ||
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
        successorModeState = toggledPlaybackModeStateInternalV1(
          record.issuanceModeState,
          requestedPlaybackMode,
        );
        toggledResult = playbackModeToggledResultInternalV1(successorModeState.mode);
      } catch {
        return narrativePlaybackModeFaultedResultInternalV1;
      }

      const finalKind = classifyCurrentPlaybackModeTarget();
      if (finalKind === "stale") return narrativePlaybackModeStaleResultInternalV1;
      if (finalKind !== "say") return narrativePlaybackModeFaultedResultInternalV1;
      if (
        !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.currentModeState !== record.issuanceModeState ||
        bridgeRecord.deferredModePublicationClaim !== null
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      const dialoguePlayerRecord = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(
        record.directTarget,
      );
      let modeBaselineNow: number | null = null;
      if (
        dialoguePlayerRecord?.active && dialoguePlayerRecord.bridgeRecord === bridgeRecord &&
        dialoguePlayerRecord.frame === record.frame &&
        dialoguePlayerRecord.snapshot.kind === "say" &&
        (successorModeState.mode === "skip" ||
          (successorModeState.mode === "auto" && dialoguePlayerRecord.snapshot.revealComplete))
      ) {
        const generation = dialoguePlayerRecord.phaseGeneration;
        const clockBinding = dialoguePlayerRecord.clockBinding;
        const frame = dialoguePlayerRecord.frame;
        let nowValue: unknown;
        let clockFault = false;
        if (clockBinding === null || frame === null) {
          faultNarrativeStableDialoguePlayerControllerInternalV1(dialoguePlayerRecord);
          return narrativePlaybackModeFaultedResultInternalV1;
        }
        try {
          nowValue = clockBinding.nowInternalV1();
        } catch {
          nowValue = null;
          clockFault = true;
        }
        const postClockKind = classifyCurrentPlaybackModeTarget();
        if (postClockKind === "stale") return narrativePlaybackModeStaleResultInternalV1;
        if (postClockKind !== "say") return narrativePlaybackModeFaultedResultInternalV1;
        if (
          !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.currentModeState !== record.issuanceModeState ||
          !dialoguePlayerRecord.active || dialoguePlayerRecord.phaseGeneration !== generation ||
          dialoguePlayerRecord.clockBinding !== clockBinding ||
          dialoguePlayerRecord.frame !== frame ||
          captureExactCurrentNarrativeDialoguePlayerFrameInternalV1(
              dialoguePlayerRecord,
              generation,
            ) !== frame
        ) {
          return narrativePlaybackModeStaleResultInternalV1;
        }
        if (
          clockFault || !isNarrativeDialogueClockTimestampInternalV1(nowValue) ||
          (dialoguePlayerRecord.lastTickMs !== null &&
            nowValue < dialoguePlayerRecord.lastTickMs)
        ) {
          faultNarrativeStableDialoguePlayerControllerInternalV1(dialoguePlayerRecord);
          return narrativePlaybackModeFaultedResultInternalV1;
        }
        modeBaselineNow = nowValue;
      }
      const semanticBoundary = bridgeRecord.saySemanticInFlightClaim;
      const currentSayRevealRecord = dialoguePlayerRecord?.legacySayRevealController === null ||
          dialoguePlayerRecord?.legacySayRevealController === undefined
        ? null
        : narrativeStableSayRevealControllerRecordsInternalV1.get(
          dialoguePlayerRecord.legacySayRevealController,
        ) ?? null;
      const deferModePublication = semanticBoundary !== null &&
        successorModeState.mode === "normal" && currentSayRevealRecord?.active === true &&
        currentSayRevealRecord.frame === record.frame &&
        currentSayRevealRecord.callbackClaim === semanticBoundary;
      if (
        !compareAndSetNarrativePlaybackModeStateInternalV1(
          bridgeRecord,
          record.issuanceModeState,
          successorModeState,
        )
      ) {
        return narrativePlaybackModeStaleResultInternalV1;
      }
      if (deferModePublication) {
        bridgeRecord.deferredModePublicationClaim = semanticBoundary;
      }
      if (
        dialoguePlayerRecord?.active && dialoguePlayerRecord.bridgeRecord === bridgeRecord &&
        dialoguePlayerRecord.frame === record.frame
      ) {
        retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(dialoguePlayerRecord);
        if (modeBaselineNow !== null) dialoguePlayerRecord.lastTickMs = modeBaselineNow;
        if (deferModePublication) {
          dialoguePlayerRecord.automaticRemainingMs = null;
        } else {
          dialoguePlayerRecord.automaticRemainingMs = successorModeState.mode === "skip"
            ? 40
            : successorModeState.mode === "auto" &&
                dialoguePlayerRecord.snapshot.kind === "say" &&
                dialoguePlayerRecord.snapshot.revealComplete
            ? dialoguePlayerRecord.policy.autoWaitMs
            : null;
          publishNarrativeStableDialoguePlayerModeInternalV1(
            dialoguePlayerRecord,
            successorModeState.mode,
          );
          requestNarrativeStableDialoguePlayerTickInternalV1(
            dialoguePlayerRecord,
            dialoguePlayerRecord.phaseGeneration,
          );
        }
      }
      return toggledResult;
    }
    if (mappedKind === "voice_replay") {
      const record = routedAttemptRecord?.kind === "voice_replay" ? routedAttemptRecord : null;
      if (
        record === null || record.authority !== authority || record.spent
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
          !stableActionAuthority.isCurrentDirectTargetInternalV1(record.targetProof)
        ) {
          return null;
        }
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
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
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
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
      const voiceBinding = record.voiceReplayPort;
      if (voiceBinding === undefined) return narrativePhysicalActionStaleResultInternalV1;
      if (
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }

      const callbackClaim = {};
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
          callbackOutcome = voiceBinding.replayCurrentVoiceInternalV1();
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
      isSayAlias && routedAttemptRecord?.kind === "voice_replay" &&
      routedAttemptRecord.authority === authority && !routedAttemptRecord.spent
    ) return narrativePhysicalActionUnmappedResultInternalV1;
    const record = routedAttemptRecord !== null &&
        routedAttemptRecord.kind !== "voice_replay" &&
        routedAttemptRecord.kind !== "playback_mode_toggle" &&
        routedAttemptRecord.kind !== "history_open"
      ? routedAttemptRecord
      : null;
    if (record === null || record.authority !== authority || record.spent) {
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
        narrativeAttemptRecordInternalV1<NarrativeStablePhysicalActionAttemptRecordInternalV1>(
            controllerRecord.currentActivationAttempt,
          ) !== record ||
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
          !stableActionAuthority.isCurrentDirectTargetInternalV1(record.targetProof)
        ) {
          return null;
        }
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
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
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
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

      const boundaryClaim = {};
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
        const automaticCompetitor = narrativeAttemptRecordInternalV1<
          NarrativeStableSayContentAutoAttemptRecordInternalV1
        >(controllerRecord.currentContentAutoAttempt);
        if (automaticCompetitor !== null) automaticCompetitor.spent = true;
        controllerRecord.currentContentAutoAttempt = null;
      }
      const dialoguePlayerRecord = narrativeStableDialoguePlayerControllersByTargetInternalV1.get(
        record.directTarget,
      );
      if (
        dialoguePlayerRecord?.legacySayRevealController === record.controller &&
        dialoguePlayerRecord.frame === record.frame
      ) {
        retireNarrativeStableDialoguePlayerAutomaticAttemptInternalV1(dialoguePlayerRecord);
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
        phase = controllerRecord.revealGenerationPort.capturePhaseInternalV1();
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
          controllerRecord.revealGenerationPort.revealAllInternalV1();
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
        !stableActionAuthority.isCurrentDirectTargetInternalV1(record.targetProof)
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const current = stableActionAuthority.captureCurrentStableInputInternalV1();
      if (
        current.kind !== "captured" || current.directTarget !== record.directTarget ||
        current.sourceRevision !== record.sourceRevision || current.targetProof === null ||
        !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract)
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const currentFrame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
      if (
        currentFrame !== record.frame || currentFrame === null ||
        currentFrame.candidateSnapshot.semanticDispatchPort !== record.semanticDispatchPort ||
        currentFrame.pending.occurrenceId !== record.frame.pending.occurrenceId ||
        (record.kind === "choice"
          ? currentFrame.pending.kind !== "choice" ||
            !currentFrame.pending.options.some((option) => option.choiceId === record.choiceId)
          : record.kind === "hold_skip"
          ? currentFrame.pending.kind !== "hold" || !currentFrame.pending.skippable
          : currentFrame.pending.kind !== "custom")
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      const portBinding = record.semanticDispatchPort;
      if (portBinding === undefined) return narrativePhysicalActionFaultedResultInternalV1;
      let dispatch: () => Promise<unknown>;
      if (record.kind === "hold_skip") {
        if (currentFrame.pending.kind !== "hold") {
          return narrativePhysicalActionStaleResultInternalV1;
        }
        if (portBinding.dispatchTimeInternalV1 === undefined) {
          return narrativePhysicalActionFaultedResultInternalV1;
        }
        // A skippable hold folds its whole undispatched remainder in one
        // authoritative time-tick commit; the fold never bypasses the
        // pending boundary. Milliseconds already committed by
        // declared-cadence partial ticks are subtracted so the elapsed sum
        // stays exact, and a fold racing an in-flight partial clamps
        // engine-side (the fence rejects it once the occurrence expires).
        const foldedElapsedMs = currentFrame.pending.remainingMs -
          (narrativeHoldDispatchLedgersInternalV1.get(currentFrame)?.dispatchedElapsedMs ?? 0);
        if (foldedElapsedMs < 1) return narrativePhysicalActionStaleResultInternalV1;
        const request = {
          elapsedMs: foldedElapsedMs,
          expectedHoldOccurrenceId: currentFrame.pending.occurrenceId,
        } satisfies NarrativeStableSemanticTimeRequestInternalV1;
        dispatch = () => portBinding.dispatchTimeInternalV1!(request);
      } else {
        const resolution: InteractionResolutionV1 = record.kind === "choice"
          ? {
            kind: "choose" as const,
            choiceId: record.choiceId,
          }
          : {
            kind: "custom" as const,
            payload: record.payload,
          };
        const request = {
          expectedOccurrenceId: currentFrame.pending.occurrenceId,
          resolution,
        } satisfies NarrativeStableSemanticResolutionRequestInternalV1;
        dispatch = () => portBinding.dispatchResolutionInternalV1(request);
      }
      if (
        !stableActionAuthority.isCurrentDirectTargetInternalV1(record.targetProof)
      ) {
        return narrativePhysicalActionStaleResultInternalV1;
      }
      let completion: Promise<unknown>;
      try {
        completion = Promise.resolve(dispatch());
      } catch (error) {
        completion = Promise.reject(error);
      }
      return ({
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
    const postClaimCapture = stableActionAuthority.captureCurrentStableInputInternalV1();
    if (
      postClaimCapture.kind !== "captured" ||
      postClaimCapture.directTarget !== capturedInitial.directTarget ||
      postClaimCapture.sourceRevision !== capturedInitial.sourceRevision ||
      postClaimCapture.targetProof === null ||
      !equalManagedSurfaceInputBindingContractV1(
        postClaimCapture.contract,
        capturedInitial.contract,
      ) ||
      !stableActionAuthority.isCurrentDirectTargetInternalV1(postClaimCapture.targetProof) ||
      bridge.inspectAdmittedTargetFrameInternalV1(postClaimCapture.directTarget) !== initialFrame
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

  authority = {
    createEnvelopeInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      request: {
        readonly actionId: ManagedSurfaceActionIdV1;
        readonly gestureId: ManagedSurfaceGestureIdV1;
      },
    ): ManagedSurfaceActionEnvelopeV1 {
      if (!active) {
        throw new TypeError("ui.narrative_stable_action_admission_invalid");
      }
      return binding.createEnvelope(request);
    },
    issueChoiceAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      choiceId: unknown,
    ): NarrativeStableChoiceActionAttemptInternalV1 | null {
      if (!active || typeof choiceId !== "string") return null;
      try {
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        if (
          frame === null || frame.pending.kind !== "choice" ||
          !frame.pending.options.some((option) => option.choiceId === choiceId)
        ) {
          return null;
        }
        const attemptRecord: NarrativeStablePhysicalActionAttemptRecordInternalV1 = {
          kind: "choice",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          choiceId,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        return createNarrativeAttemptInternalV1<
          NarrativeStableChoiceActionAttemptInternalV1,
          NarrativeStablePhysicalActionAttemptRecordInternalV1
        >(attemptRecord);
      } catch {
        return null;
      }
    },
    issueHoldSkipAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
    ): NarrativeStableHoldSkipActionAttemptInternalV1 | null {
      if (!active) return null;
      try {
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        if (
          frame === null || frame.pending.kind !== "hold" || !frame.pending.skippable
        ) {
          return null;
        }
        const attemptRecord: NarrativeStablePhysicalActionAttemptRecordInternalV1 = {
          kind: "hold_skip",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        return createNarrativeAttemptInternalV1<
          NarrativeStableHoldSkipActionAttemptInternalV1,
          NarrativeStablePhysicalActionAttemptRecordInternalV1
        >(attemptRecord);
      } catch {
        return null;
      }
    },
    issueCustomAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      payload: unknown,
    ): NarrativeStableCustomActionAttemptInternalV1 | null {
      if (!active) return null;
      try {
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        if (
          frame === null || frame.pending.kind !== "custom"
        ) {
          return null;
        }

        const resolution = parseInteractionResolutionV1(
          { kind: "custom" as const, payload },
        );
        if (resolution.kind !== "custom") return null;
        if (!active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim) return null;

        const refreshed = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          refreshed.kind !== "captured" || refreshed.directTarget !== current.directTarget ||
          refreshed.sourceRevision !== current.sourceRevision || refreshed.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(
            refreshed.contract,
            capturedInitial.contract,
          ) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(refreshed.targetProof) ||
          bridge.inspectAdmittedTargetFrameInternalV1(refreshed.directTarget) !== frame ||
          !active ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim
        ) {
          return null;
        }

        const attemptRecord: NarrativeStablePhysicalActionAttemptRecordInternalV1 = {
          kind: "custom",
          authority,
          targetProof: refreshed.targetProof,
          directTarget: refreshed.directTarget,
          sourceRevision: refreshed.sourceRevision,
          frame,
          payload: resolution.payload,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        return createNarrativeAttemptInternalV1<
          NarrativeStableCustomActionAttemptInternalV1,
          NarrativeStablePhysicalActionAttemptRecordInternalV1
        >(attemptRecord);
      } catch {
        return null;
      }
    },
    issueSayActivationAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      controller: unknown,
    ): NarrativeStableSayActivationAttemptInternalV1 | null {
      if (
        !active ||
        (typeof controller !== "object" && typeof controller !== "function") ||
        controller === null
      ) {
        return null;
      }
      const dialoguePlayerRecord = narrativeStableDialoguePlayerControllerRecordsInternalV1.get(
        controller as NarrativeStableDialoguePlayerControllerInternalV1,
      );
      const resolvedController = dialoguePlayerRecord?.active &&
          dialoguePlayerRecord.legacySayRevealController !== null
        ? dialoguePlayerRecord.legacySayRevealController
        : controller as NarrativeStableSayRevealControllerInternalV1;
      const controllerRecord = narrativeStableSayRevealControllerRecordsInternalV1.get(
        resolvedController,
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
          const predecessor = narrativeAttemptRecordInternalV1<
            NarrativeStablePhysicalActionAttemptRecordInternalV1
          >(controllerRecord.currentActivationAttempt);
          if (
            predecessor !== null && !predecessor.spent &&
            predecessor.kind === "say_activation" && predecessor.authority === authority &&
            stableActionAuthority.isCurrentDirectTargetInternalV1(predecessor.targetProof)
          ) {
            return null;
          }
          if (predecessor !== null) predecessor.spent = true;
          controllerRecord.currentActivationAttempt = null;
        }

        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof) ||
          current.directTarget !== controllerRecord.directTarget ||
          current.sourceRevision !== controllerRecord.sourceRevision
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
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
        const attemptRecord: NarrativeStablePhysicalActionAttemptRecordInternalV1 = {
          kind: "say_activation",
          authority,
          controller: resolvedController,
          controllerClaim: controllerRecord.controllerClaim,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          semanticDispatchPort: frame.candidateSnapshot.semanticDispatchPort,
          spent: false,
        };
        const attempt = createNarrativeAttemptInternalV1<
          NarrativeStableSayActivationAttemptInternalV1,
          NarrativeStablePhysicalActionAttemptRecordInternalV1
        >(attemptRecord);
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
        !active ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        if (!bridgeRecord.isActiveInternalV1()) return null;
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        if (
          frame === null || frame.pending.kind !== "say" ||
          !active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null
        ) {
          return null;
        }
        const attemptRecord: NarrativeStableVoiceReplayActionAttemptRecordInternalV1 = {
          kind: "voice_replay",
          authority,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          voiceReplayPort: frame.candidateSnapshot.voiceReplayPort,
          spent: false,
        };
        return createNarrativeAttemptInternalV1<
          NarrativeStableVoiceReplayActionAttemptInternalV1,
          NarrativeStableVoiceReplayActionAttemptRecordInternalV1
        >(attemptRecord);
      } catch {
        return null;
      }
    },
    issuePlaybackModeToggleAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
      requestedMode: "auto" | "skip",
    ): NarrativeStablePlaybackModeToggleActionAttemptInternalV1 | null {
      if (
        !active ||
        (requestedMode !== "auto" && requestedMode !== "skip") ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.deferredModePublicationClaim !== null
      ) {
        return null;
      }
      try {
        const issuanceModeState = bridgeRecord.currentModeState;
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        if (
          frame === null ||
          (frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "hold" && frame.pending.kind !== "custom" &&
            frame.pending.kind !== "presentation_barrier") ||
          (frame.pending.kind !== "say" && issuanceModeState.mode !== "normal") ||
          !active || bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.currentModeState !== issuanceModeState ||
          bridgeRecord.deferredModePublicationClaim !== null
        ) {
          return null;
        }
        const attemptRecord: NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1 = {
          kind: "playback_mode_toggle",
          authority,
          requestedMode,
          targetProof: current.targetProof,
          directTarget: current.directTarget,
          sourceRevision: current.sourceRevision,
          frame,
          issuanceModeState,
          spent: false,
        };
        return createNarrativeAttemptInternalV1<
          NarrativeStablePlaybackModeToggleActionAttemptInternalV1,
          NarrativeStablePlaybackModeToggleActionAttemptRecordInternalV1
        >(attemptRecord);
      } catch {
        return null;
      }
    },
    issueHistoryOpenAttemptInternalV1(
      this: NarrativeStablePhysicalActionAdmissionInternalV1,
    ): NarrativeStableHistoryOpenActionAttemptInternalV1 | null {
      if (
        !active ||
        bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
        !bridgeRecord.isActiveInternalV1() || bridgeRecord.sayCallbackClaim !== null ||
        bridgeRecord.saySemanticInFlightClaim !== null
      ) {
        return null;
      }
      try {
        const current = stableActionAuthority.captureCurrentStableInputInternalV1();
        if (
          current.kind !== "captured" || current.directTarget === null ||
          current.sourceRevision === null || current.targetProof === null ||
          !equalManagedSurfaceInputBindingContractV1(current.contract, capturedInitial.contract) ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof)
        ) {
          return null;
        }
        const frame = bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget);
        const readyActive = stableActionAuthority.captureReadyActiveStableTargetInternalV1(
          current.directTarget,
        );
        if (
          frame === null ||
          readyActive.kind !== "captured" ||
          readyActive.directTarget !== current.directTarget ||
          readyActive.sourceRevision !== current.sourceRevision ||
          (frame.pending.kind !== "say" && frame.pending.kind !== "choice" &&
            frame.pending.kind !== "hold" && frame.pending.kind !== "custom" &&
            frame.pending.kind !== "presentation_barrier") ||
          !active || !bridgeRecord.isActiveInternalV1() ||
          bridgeRecord.physicalActionAdmissionClaim !== admissionClaim ||
          bridgeRecord.sayCallbackClaim !== null ||
          bridgeRecord.saySemanticInFlightClaim !== null ||
          !stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof) ||
          bridge.inspectAdmittedTargetFrameInternalV1(current.directTarget) !== frame
        ) {
          return null;
        }

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
        return createNarrativeAttemptInternalV1<
          NarrativeStableHistoryOpenActionAttemptInternalV1,
          NarrativeStableHistoryOpenActionAttemptRecordInternalV1
        >(attemptRecord);
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
      return claimedRoute.routeInternalV1(envelope, attempt);
    },
    disposeInternalV1(this: NarrativeStablePhysicalActionAdmissionInternalV1): void {
      if (!active) return;
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
  };
  if (adoptsHostActionBinding) bridgeRecord.hostPhysicalActionAdmission = authority;
  return authority;
}

export function createNarrativeStableBarrierAcknowledgmentControllerInternalV1(
  input: CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1,
): NarrativeStableBarrierAcknowledgmentControllerInternalV1 {
  const { bridge, stageReconciler } = input;
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
      current === null || current.frame.pending.kind !== "presentation_barrier"
    ) {
      return null;
    }
    return ({
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
      current === null || current.frame.pending.kind !== "presentation_barrier"
    ) {
      return null;
    }
    return ({
      targetIdentity: {
        target: current.target,
        semanticOccurrenceId: current.frame.semanticOccurrenceId,
        canonicalPendingBytes: current.canonicalPendingBytes,
        expectedTransitionId: current.frame.pending.expectedTransitionId,
      },
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

  const controllerClaim = {};
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
    const attemptRecord = narrativeAttemptRecordInternalV1<
      NarrativeStableBarrierRecoveryAttemptRecordInternalV1
    >(attempt);
    let attemptCurrent = false;
    try {
      attemptCurrent = attemptRecord !== null && !attemptRecord.spent &&
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
    let open: unknown;
    try {
      open = generation.activationGate.gate.isOpen();
    } catch {
      generation.ingressState = "invalid";
      return "faulted";
    }
    if (typeof open !== "boolean") {
      generation.ingressState = "invalid";
      return "faulted";
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

  controller = {
    retargetPresentationStageInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      retarget: StageRetargetInputV1,
    ): StagePresentationGenerationRetargetResultInternalV1 {
      if (
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim
      ) {
        return ({ kind: "stale" as const });
      }
      const currentGeneration = bridgeRecord.barrierRecoveryGeneration;
      if (
        currentGeneration !== null &&
        (currentGeneration.stageAuthority !== record.stageAuthority ||
          currentGeneration.callbackClaim !== null)
      ) {
        return ({ kind: "faulted" as const });
      }
      if (bridgeRecord.barrierRecoverySynchronizationClaim !== null) {
        bridgeRecord.barrierRecoverySynchronizationPoisoned = true;
        return ({ kind: "faulted" as const });
      }
      if (record.stageRetargetInProgress) {
        return ({ kind: "faulted" as const });
      }
      record.stageRetargetInProgress = true;
      try {
        return record.stageAuthority.retargetPresentationGenerationInternalV1(retarget);
      } catch {
        return ({ kind: "faulted" as const });
      } finally {
        record.stageRetargetInProgress = false;
      }
    },

    synchronizeRecoveryGenerationInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
      activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
    ): NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1 {
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
          if (activationGate !== existing.activationGate.gate) {
            return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
          }
          return ({
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
        synchronizationClaim = {};
        bridgeRecord.barrierRecoverySynchronizationClaim = synchronizationClaim;
        bridgeRecord.barrierRecoverySynchronizationPoisoned = false;

        const gateBinding = captureNarrativeBarrierActivationGateInternalV1(activationGate);
        if (gateBinding === null) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        let initiallyOpen: unknown;
        try {
          initiallyOpen = gateBinding.gate.isOpen();
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
        if (bridgeRecord.barrierRecoverySynchronizationPoisoned) {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        let stillClosed: unknown;
        try {
          stillClosed = gateBinding.gate.isOpen();
        } catch {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (typeof stillClosed !== "boolean") {
          return narrativeBarrierRecoveryGenerationFaultedResultInternalV1;
        }
        if (stillClosed) return narrativeBarrierRecoveryGenerationStaleResultInternalV1;
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

        const generation = ({}) as NarrativeStableBarrierRecoveryGenerationInternalV1;
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
          subscribed = bridgeRecord.compositeRuntimeKernel.subscribeStateInternalV1(
            () => {
              if (observerInstalled) maintainRecoveryGeneration(nextGeneration);
            },
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
        return ({
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
        !record.active || !bridgeRecord.isActiveInternalV1() ||
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
      const gateClaim = {};
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
          const predecessor = narrativeAttemptRecordInternalV1<
            NarrativeStableBarrierRecoveryAttemptRecordInternalV1
          >(generation.currentAttempt);
          let predecessorCurrent = false;
          try {
            predecessorCurrent = predecessor !== null && !predecessor.spent &&
              generation.stableActionAuthority.isCurrentReadyActiveStableTargetInternalV1(
                predecessor.proof,
              );
          } catch {
            predecessorCurrent = false;
          }
          if (predecessorCurrent) return null;
          if (predecessor !== null) predecessor.spent = true;
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
        const attemptRecord: NarrativeStableBarrierRecoveryAttemptRecordInternalV1 = {
          generation,
          proof: captured.proof,
          directTarget: current.target,
          sourceRevision: current.sourceRevision,
          frame: current.frame,
          semanticDispatchPort,
          spent: false,
        };
        const attempt = createNarrativeAttemptInternalV1<
          NarrativeStableBarrierRecoveryAttemptInternalV1,
          NarrativeStableBarrierRecoveryAttemptRecordInternalV1
        >(attemptRecord);
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
        !record.active || !bridgeRecord.isActiveInternalV1() ||
        record.stageRetargetInProgress ||
        bridgeRecord.barrierAcknowledgmentControllerClaim !== controllerClaim ||
        bridgeRecord.barrierRecoverySynchronizationClaim !== null ||
        (typeof attempt !== "object" && typeof attempt !== "function") || attempt === null
      ) {
        return narrativeBarrierRecoveryStaleResultInternalV1;
      }
      const attemptRecord = narrativeAttemptRecordInternalV1<
        NarrativeStableBarrierRecoveryAttemptRecordInternalV1
      >(attempt);
      const generation = bridgeRecord.barrierRecoveryGeneration;
      const currentAttemptRecord = narrativeAttemptRecordInternalV1<
        NarrativeStableBarrierRecoveryAttemptRecordInternalV1
      >(generation?.currentAttempt ?? null);
      if (
        attemptRecord === null || attemptRecord.spent || generation === null ||
        generation.retired || generation.preexistingTargetRetired ||
        generation.callbackClaim !== null || attemptRecord.generation !== generation ||
        currentAttemptRecord !== attemptRecord || generation.preexistingTarget === null ||
        generation.preexistingTarget.loadRecovery !== "settle"
      ) {
        return narrativeBarrierRecoveryStaleResultInternalV1;
      }

      const gateClaim = {};
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
        const portBinding = attemptRecord.semanticDispatchPort;
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

        const targetClaim = {};
        const boundaryClaim = {};
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
        const resolution: InteractionResolutionV1 = {
          kind: "barrier_completed" as const,
          transitionId: generation.preexistingTarget.targetIdentity.expectedTransitionId,
        };
        const request = {
          expectedOccurrenceId: attemptRecord.frame.pending.occurrenceId,
          resolution,
        } satisfies NarrativeStableSemanticResolutionRequestInternalV1;

        let semanticCompletion: Promise<unknown>;
        try {
          semanticCompletion = Promise.resolve(
            portBinding.dispatchResolutionInternalV1(request),
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
        return ({
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
        !record.active || !bridgeRecord.isActiveInternalV1() ||
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
      const gateClaim = {};
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
        const result = {
          kind: "unsupported" as const,
          code: "narrative.barrier_replay_unsupported" as const,
          completion: null,
        };
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
      const commitGuard: StageAcknowledgedRunCommitGuardInternalV1 = {
        isCommitCurrentInternalV1(): boolean {
          return record.active && bridgeRecord.isActiveInternalV1() &&
            bridgeRecord.barrierAcknowledgmentControllerClaim === controllerClaim &&
            bridgeRecord.barrierTargetTerminalClaim === expectedTerminalClaim &&
            identityStillCurrent(targetIdentity!);
        },
      };
      const terminalPort: StageAcknowledgedRunTerminalPortInternalV1 = {
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
            const terminalClaim = {};
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
      };

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
      const portBinding = current.frame.candidateSnapshot.semanticDispatchPort;
      if (portBinding === undefined) {
        record.terminalResult = narrativeBarrierFaultedResultInternalV1;
        return record.terminalResult;
      }

      const boundaryClaim = {};
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
      const resolution: InteractionResolutionV1 = {
        kind: "barrier_completed" as const,
        transitionId: evidence.targetIdentity.expectedTransitionId,
      };
      const request = {
        expectedOccurrenceId: current.frame.pending.occurrenceId,
        resolution,
      } satisfies NarrativeStableSemanticResolutionRequestInternalV1;

      let semanticCompletion: Promise<unknown>;
      try {
        semanticCompletion = Promise.resolve(
          portBinding.dispatchResolutionInternalV1(request),
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
      const dispatched = {
        kind: "dispatched" as const,
        completion,
      };
      evidence.dispatchedResult = dispatched;
      record.terminalResult = dispatched;
      return dispatched;
    },

    disposeInternalV1(
      this: NarrativeStableBarrierAcknowledgmentControllerInternalV1,
    ): void {
      if (!record.active) return;
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
  };
  narrativeStableBarrierAcknowledgmentControllerRecordsInternalV1.set(controller, record);
  bridgeRecord.barrierAcknowledgmentControllerClaim = controllerClaim;
  try {
    const subscribed = bridgeRecord.compositeRuntimeKernel.subscribeStateInternalV1(
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
