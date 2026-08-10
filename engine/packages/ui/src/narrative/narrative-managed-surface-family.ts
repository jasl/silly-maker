// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseInteractionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parseModuleId,
  parsePendingInteractionV1,
  parsePositiveSafeInteger,
  type InteractionResolutionV1,
  type PendingInteractionV1,
  type RuntimeSchemaV1,
} from "@sillymaker/base";

import type { InputRouterV1 } from "../input/contracts.ts";
import {
  claimManagedSurfaceAuthenticatedActionRouteInternalV1,
  createManagedSurfaceContractBoundActionBindingInternalV1,
  equalManagedSurfaceInputBindingContractV1,
  type ManagedSurfaceActionBindingV1,
  type ManagedSurfaceAuthenticatedActionRouteResultInternalV1,
  type ManagedSurfaceAuthenticatedActionRouteInternalV1,
} from "../managed-surfaces/managed-surface-action-route.ts";
import {
  type ManagedSurfaceActionEnvelopeV1,
  type ManagedSurfaceActionIdV1,
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
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1,
  type ManagedSurfaceStableActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableDirectActionTargetProofInternalV1,
  type ManagedSurfaceStableReadyActiveTargetProofInternalV1,
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

const freezeNarrativePhysicalActionDataInternalV1 = Object.freeze;

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

declare const narrativeStableCapturedSemanticResolutionPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedSemanticResolutionPortInternalV1 {
  readonly [narrativeStableCapturedSemanticResolutionPortBrandInternalV1]: true;
}

declare const narrativeStableCapturedVoiceReplayPortBrandInternalV1: unique symbol;

export interface NarrativeStableCapturedVoiceReplayPortInternalV1 {
  readonly [narrativeStableCapturedVoiceReplayPortBrandInternalV1]: true;
}

export interface NarrativeStableCandidateSnapshotInternalV1 {
  readonly rendererComponent: object | ((...args: never[]) => unknown);
  readonly visualConfig: Readonly<object>;
  readonly semanticDispatchPort: NarrativeStableCapturedSemanticResolutionPortInternalV1;
  readonly historyObservationPort: object | ((...args: never[]) => unknown);
  readonly playerProfile: Readonly<object>;
  readonly presentationClock: object | ((...args: never[]) => unknown);
  readonly textResolver: object | ((...args: never[]) => unknown);
  readonly voiceReplayPort: NarrativeStableCapturedVoiceReplayPortInternalV1 | null;
  readonly quickMenuContribution: object | ((...args: never[]) => unknown) | null;
}

export type NarrativeStableRequiredPortIdInternalV1 =
  | "narrative.semantic_dispatch"
  | "narrative.history_observation"
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
  | NarrativeStableVoiceReplayDispatchResultInternalV1;

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

interface NarrativeStablePublisherBridgeRecordInternalV1 {
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly isActiveInternalV1: () => boolean;
  readonly subscribeStateInternalV1: ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
    "subscribeStateInternalV1"
  ];
  readonly captureCurrentTargetInternalV1: () =>
    | NarrativeStableCurrentTargetProjectionInternalV1
    | null;
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

function captureCandidateSnapshotInternalV1(
  value: unknown,
): NarrativeStableCandidateSnapshotInternalV1 | null {
  const keys = [
    "rendererComponent",
    "visualConfig",
    "semanticDispatchPort",
    "historyObservationPort",
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
  if (
    !isOpaqueCandidatePortInternalV1(captured.rendererComponent) ||
    typeof captured.visualConfig !== "object" || captured.visualConfig === null ||
    !Object.isFrozen(captured.visualConfig) ||
    semanticDispatchPort === null ||
    !isOpaqueCandidatePortInternalV1(captured.historyObservationPort) ||
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
    rendererComponent: captured.rendererComponent,
    visualConfig: captured.visualConfig,
    semanticDispatchPort,
    historyObservationPort: captured.historyObservationPort,
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
    if (record !== null) {
      const admittedTarget = admittedTargets[0]!;
      const previousRecord = narrativeTargetFrameRecordsInternalV1.get(admittedTarget);
      narrativeTargetFrameRecordsInternalV1.set(admittedTarget, record);
      const applied = Reflect.apply(applyStableAdmissionProposal, compositeRuntimeKernel, [
        evaluated.proposal,
      ]);
      if (applied.kind !== "applied") {
        if (narrativeTargetFrameRecordsInternalV1.get(admittedTarget) === record) {
          if (previousRecord === undefined) {
            narrativeTargetFrameRecordsInternalV1.delete(admittedTarget);
          } else {
            narrativeTargetFrameRecordsInternalV1.set(admittedTarget, previousRecord);
          }
        }
      }
      return applied;
    }
    return Reflect.apply(applyStableAdmissionProposal, compositeRuntimeKernel, [
      evaluated.proposal,
    ]);
  };

  const bridge: NarrativeStablePublisherBridgeInternalV1 = Object.freeze({
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
      bridgeActive = false;
      const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
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

export function createNarrativeStablePhysicalActionAdmissionInternalV1(
  input: CreateNarrativeStablePhysicalActionAdmissionInputInternalV1,
): NarrativeStablePhysicalActionAdmissionInternalV1 {
  const bridge = input.bridge;
  const inputRouter = input.inputRouter;
  const isGestureCurrent = input.isGestureCurrent;
  const bridgeRecord = narrativeStablePublisherBridgeRecordsInternalV1.get(bridge);
  if (bridgeRecord === undefined || bridgeRecord.physicalActionAdmissionClaim !== null) {
    throw new TypeError("ui.narrative_stable_action_admission_invalid");
  }
  const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
    bridgeRecord.compositeRuntimeKernel,
  );
  const captureCurrentStableInput = captureOwnCallableInternalV1(
    stableActionAuthority,
    "captureCurrentStableInputInternalV1",
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
    captureCurrentStableInput === null || isCurrentDirectTarget === null ||
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
      initialFrame.pending.kind !== "pause" && initialFrame.pending.kind !== "custom") ||
    !narrativeStableSemanticResolutionPortBindingsInternalV1.has(
      initialFrame.candidateSnapshot.semanticDispatchPort,
    )
  ) {
    throw new TypeError("ui.narrative_stable_action_admission_unavailable");
  }

  let active = true;
  let authority!: NarrativeStablePhysicalActionAdmissionInternalV1;
  const admissionClaim = Object.freeze({});
  bridgeRecord.physicalActionAdmissionClaim = admissionClaim;
  let binding: ManagedSurfaceActionBindingV1;
  let claimedRoute: ManagedSurfaceAuthenticatedActionRouteInternalV1<
    unknown,
    NarrativeStablePhysicalActionDispatchResultInternalV1
  >;
  try {
    binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: stableActionAuthority,
      contract: capturedInitial.contract,
      inputRouter,
      isGestureCurrent,
    });
    claimedRoute = claimManagedSurfaceAuthenticatedActionRouteInternalV1(
      binding,
      ({ actionId, attempt }): NarrativeStablePhysicalActionDispatchResultInternalV1 => {
        if (!active) {
          return narrativePhysicalActionStaleResultInternalV1;
        }
        const isSayAlias = actionId === narrativeConfirmActionIdInternalV1 ||
          actionId === narrativeAdvanceActionIdInternalV1;
        const mappedKind = actionId === narrativeReplayVoiceActionIdInternalV1
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
      },
    );
  } catch (error) {
    if (bridgeRecord.physicalActionAdmissionClaim === admissionClaim) {
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
    claimedRoute.disposeInternalV1();
    if (bridgeRecord.physicalActionAdmissionClaim === admissionClaim) {
      bridgeRecord.physicalActionAdmissionClaim = null;
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
      claimedRoute.disposeInternalV1();
      if (bridgeRecord.physicalActionAdmissionClaim === admissionClaim) {
        bridgeRecord.physicalActionAdmissionClaim = null;
      }
    },
  });
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
