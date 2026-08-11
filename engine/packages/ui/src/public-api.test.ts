// SPDX-License-Identifier: MIT
import { describe, expect, expectTypeOf, it } from "vitest";

import * as internalUiV1 from "./internal.ts";
import * as publicUiV1 from "./index.ts";
import type {
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SaveOverlaySlotNamesV1,
  SavesLauncherPropsV1,
  SettingsLauncherPropsV1,
  SystemDialogControllerV1,
  SystemDialogCustomSavesComponentV1,
  SystemDialogCustomSavesRenderIntentsV1,
  SystemDialogCustomSavesV1,
  SystemDialogHostPropsV1,
  SystemDialogOpenResultV1,
  SystemDialogSaveGuardProjectionV1,
  SystemDialogSavesV1,
  SystemDialogSessionSnapshotV1,
  SystemDialogSessionV1,
  SystemDialogSettingsV1,
} from "./index.ts";

/* oxlint-disable no-unused-vars -- compile-time negative package-export assertions */
// @ts-expect-error Standalone Settings lifecycle props are no longer public.
import type { SettingsDialogPropsV1 as RemovedSettingsDialogPropsV1 } from "./index.ts";
// @ts-expect-error Standalone confirmation lifecycle props are no longer public.
import type { ActionConfirmationDialogPropsV1 as RemovedConfirmationPropsV1 } from "./index.ts";
// @ts-expect-error Raw confirmation dispatch is bound to the exact managed child.
import type { ActionConfirmationDispatchPortV1 as RemovedPortV1 } from "./index.ts";
// @ts-expect-error Save content is hosted only by the managed System root.
import type { SaveOverlayPropsV1 as RemovedSaveOverlayPropsV1 } from "./index.ts";
// @ts-expect-error The standalone writable System state is no longer public.
import type { SystemDialogSessionStateV1 as RemovedSystemDialogSessionStateV1 } from "./index.ts";
// @ts-expect-error The standalone writable System store is no longer public.
import type { SystemDialogSessionStoreV1 as RemovedSystemDialogSessionStoreV1 } from "./index.ts";
// @ts-expect-error Dormant stable admission remains source-relative package implementation.
import type { ManagedSurfaceStableAdmissionResultInternalV1 as ForbiddenPublicStableAdmissionResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose dormant stable admission.
import type { ManagedSurfaceStableAdmissionResultInternalV1 as ForbiddenInternalStableAdmissionResultV1 } from "./internal.ts";
// @ts-expect-error Dormant stable readiness fencing remains source-relative.
import type { ManagedSurfaceStableReadinessEnvelopeInternalV1 as ForbiddenPublicStableReadinessEnvelopeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose dormant stable readiness fencing.
import type { ManagedSurfaceStableReadinessEnvelopeInternalV1 as ForbiddenInternalStableReadinessEnvelopeV1 } from "./internal.ts";
// @ts-expect-error Stable readiness applied deltas remain source-relative.
import type { ManagedSurfaceStableReadinessAppliedDeltaInternalV1 as ForbiddenPublicStableReadinessAppliedDeltaV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable readiness applied deltas.
import type { ManagedSurfaceStableReadinessAppliedDeltaInternalV1 as ForbiddenInternalStableReadinessAppliedDeltaV1 } from "./internal.ts";
// @ts-expect-error Stable readiness settlement results remain source-relative.
import type { ManagedSurfaceStableReadinessResultInternalV1 as ForbiddenPublicStableReadinessResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable readiness settlement results.
import type { ManagedSurfaceStableReadinessResultInternalV1 as ForbiddenInternalStableReadinessResultV1 } from "./internal.ts";
// @ts-expect-error Apply-precondition row types stay source-relative.
import type { ManagedSurfaceStableApplyPreconditionCheckRowInternalV1 as ForbiddenPublicStableApplyCheckV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable apply rows.
import type { ManagedSurfaceStableApplyPreconditionCheckRowInternalV1 as ForbiddenInternalStableApplyCheckV1 } from "./internal.ts";
// @ts-expect-error Readiness-fence row types stay source-relative.
import type { ManagedSurfaceStableReadinessFenceCheckRowInternalV1 as ForbiddenPublicStableReadinessCheckV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable readiness rows.
import type { ManagedSurfaceStableReadinessFenceCheckRowInternalV1 as ForbiddenInternalStableReadinessCheckV1 } from "./internal.ts";
// @ts-expect-error The composition-owned runtime authority stays source-relative.
import type { ManagedSurfaceRuntimeAuthorityInternalV1 as ForbiddenPublicRuntimeAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose the runtime authority.
import type { ManagedSurfaceRuntimeAuthorityInternalV1 as ForbiddenInternalRuntimeAuthorityV1 } from "./internal.ts";
// @ts-expect-error Dormant stable composite state stays source-relative.
import type { ManagedSurfaceStableCompositeStateInternalV1 as ForbiddenPublicStableCompositeStateV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable composite state.
import type { ManagedSurfaceStableCompositeStateInternalV1 as ForbiddenInternalStableCompositeStateV1 } from "./internal.ts";
// @ts-expect-error Stable composite private-provenance comparisons stay source-relative.
import type { ManagedSurfaceStableCompositePrivateProvenanceComparisonInternalV1 as ForbiddenPublicStableCompositePrivateProvenanceV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable composite private provenance.
import type { ManagedSurfaceStableCompositePrivateProvenanceComparisonInternalV1 as ForbiddenInternalStableCompositePrivateProvenanceV1 } from "./internal.ts";
// @ts-expect-error Dormant stable runtime bindings stay source-relative.
import type { ManagedSurfaceStableRuntimeBindingInternalV1 as ForbiddenPublicStableRuntimeBindingV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable runtime bindings.
import type { ManagedSurfaceStableRuntimeBindingInternalV1 as ForbiddenInternalStableRuntimeBindingV1 } from "./internal.ts";
// @ts-expect-error Stable reservation contributors stay source-relative.
import type { ManagedSurfaceStableRootReservationContributorInternalV1 as ForbiddenPublicStableContributorV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable reservation contributors.
import type { ManagedSurfaceStableRootReservationContributorInternalV1 as ForbiddenInternalStableContributorV1 } from "./internal.ts";
// @ts-expect-error The generic runtime kernel stays source-relative.
import type { ManagedSurfaceRuntimeKernelInternalV1 as ForbiddenPublicRuntimeKernelV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose the generic runtime kernel.
import type { ManagedSurfaceRuntimeKernelInternalV1 as ForbiddenInternalRuntimeKernelV1 } from "./internal.ts";
// @ts-expect-error The generic runtime-kernel state adapter stays source-relative.
import type { ManagedSurfaceRuntimeKernelStateAdapterInternalV1 as ForbiddenPublicRuntimeKernelStateAdapterV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose the runtime-kernel state adapter.
import type { ManagedSurfaceRuntimeKernelStateAdapterInternalV1 as ForbiddenInternalRuntimeKernelStateAdapterV1 } from "./internal.ts";
// @ts-expect-error The shared topology-policy row stays source-relative.
import type { ManagedSurfaceTopologyPolicyRowInternalV1 as ForbiddenPublicTopologyPolicyRowV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose topology-policy rows.
import type { ManagedSurfaceTopologyPolicyRowInternalV1 as ForbiddenInternalTopologyPolicyRowV1 } from "./internal.ts";
// @ts-expect-error The shared topology-policy projection stays source-relative.
import type { ManagedSurfaceTopologyPolicyProjectionInternalV1 as ForbiddenPublicTopologyPolicyProjectionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose topology-policy projections.
import type { ManagedSurfaceTopologyPolicyProjectionInternalV1 as ForbiddenInternalTopologyPolicyProjectionV1 } from "./internal.ts";
// @ts-expect-error Reducer topology projection derivation stays source-relative.
import type { deriveManagedSurfaceReducerTopologyProjectionInternalV1 as ForbiddenPublicReducerTopologyProjectionDerivationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose reducer topology projection derivation.
import type { deriveManagedSurfaceReducerTopologyProjectionInternalV1 as ForbiddenInternalReducerTopologyProjectionDerivationV1 } from "./internal.ts";
// @ts-expect-error Reducer topology projection input stays source-relative.
import type { DeriveManagedSurfaceReducerTopologyProjectionInputInternalV1 as ForbiddenPublicReducerTopologyProjectionInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose reducer topology projection input.
import type { DeriveManagedSurfaceReducerTopologyProjectionInputInternalV1 as ForbiddenInternalReducerTopologyProjectionInputV1 } from "./internal.ts";
// @ts-expect-error Reducer topology projections stay source-relative.
import type { ManagedSurfaceReducerTopologyProjectionInternalV1 as ForbiddenPublicReducerTopologyProjectionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose reducer topology projections.
import type { ManagedSurfaceReducerTopologyProjectionInternalV1 as ForbiddenInternalReducerTopologyProjectionV1 } from "./internal.ts";
// @ts-expect-error Reducer topology projection revision modes stay source-relative.
import type { ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1 as ForbiddenPublicReducerTopologyProjectionRevisionModeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose reducer topology projection revision modes.
import type { ManagedSurfaceReducerTopologyProjectionRevisionModeInternalV1 as ForbiddenInternalReducerTopologyProjectionRevisionModeV1 } from "./internal.ts";
// @ts-expect-error Runtime-attempt provenance stays source-relative.
import type { ManagedSurfaceRuntimeAttemptIdentityInternalV1 as ForbiddenPublicRuntimeAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose runtime-attempt provenance.
import type { ManagedSurfaceRuntimeAttemptIdentityInternalV1 as ForbiddenInternalRuntimeAttemptV1 } from "./internal.ts";
// @ts-expect-error Stable desired-runtime provenance stays source-relative.
import type { ManagedSurfaceStableDesiredRuntimeTargetInternalV1 as ForbiddenPublicStableDesiredRuntimeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable desired-runtime provenance.
import type { ManagedSurfaceStableDesiredRuntimeTargetInternalV1 as ForbiddenInternalStableDesiredRuntimeV1 } from "./internal.ts";
// @ts-expect-error Stable runtime entries stay source-relative.
import type { ManagedSurfaceStableRuntimeEntryInternalV1 as ForbiddenPublicStableRuntimeEntryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable runtime entries.
import type { ManagedSurfaceStableRuntimeEntryInternalV1 as ForbiddenInternalStableRuntimeEntryV1 } from "./internal.ts";
// @ts-expect-error Retained stable runtime subtrees stay source-relative.
import type { ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 as ForbiddenPublicStableRetainedSubtreeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose retained stable runtime subtrees.
import type { ManagedSurfaceStableRetainedRuntimeSubtreeInternalV1 as ForbiddenInternalStableRetainedSubtreeV1 } from "./internal.ts";
// @ts-expect-error Stable publisher registration results stay source-relative.
import type { ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1 as ForbiddenPublicStableRegistrationResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable publisher registration results.
import type { ManagedSurfaceStablePublisherLeaseRegistrationResultInternalV1 as ForbiddenInternalStableRegistrationResultV1 } from "./internal.ts";
// @ts-expect-error Stable admission-context capture results stay source-relative.
import type { ManagedSurfaceStableAdmissionContextCaptureResultInternalV1 as ForbiddenPublicStableAdmissionContextV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable admission-context capture results.
import type { ManagedSurfaceStableAdmissionContextCaptureResultInternalV1 as ForbiddenInternalStableAdmissionContextV1 } from "./internal.ts";
// @ts-expect-error The stable composition kernel remains source-relative.
import type { ManagedSurfaceStableCompositeRuntimeKernelInternalV1 as ForbiddenPublicStableCompositeKernelV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose the stable composition kernel.
import type { ManagedSurfaceStableCompositeRuntimeKernelInternalV1 as ForbiddenInternalStableCompositeKernelV1 } from "./internal.ts";
// @ts-expect-error Stable publisher disposal authority stays source-relative.
import type { ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1 as ForbiddenPublicStableDisposalAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable publisher disposal authority.
import type { ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1 as ForbiddenInternalStableDisposalAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stable publisher disposal inspection stays source-relative.
import type { ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1 as ForbiddenPublicStableDisposalInspectionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose disposal inspection.
import type { ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1 as ForbiddenInternalStableDisposalInspectionV1 } from "./internal.ts";
// @ts-expect-error Stable publisher disposal commit results stay source-relative.
import type { ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1 as ForbiddenPublicStableDisposalCommitResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose disposal commit results.
import type { ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1 as ForbiddenInternalStableDisposalCommitResultV1 } from "./internal.ts";
// @ts-expect-error Narrative stable-family contracts remain source-relative until live promotion.
import type { NarrativeManagedSurfaceFamilyContractInternalV1 as ForbiddenPublicNarrativeStableFamilyV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative stable-family contracts.
import type { NarrativeManagedSurfaceFamilyContractInternalV1 as ForbiddenInternalNarrativeStableFamilyV1 } from "./internal.ts";
// @ts-expect-error Narrative stable publisher bridges remain source-relative until live promotion.
import type { NarrativeStablePublisherBridgeInternalV1 as ForbiddenPublicNarrativeStableBridgeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative stable publisher bridges.
import type { NarrativeStablePublisherBridgeInternalV1 as ForbiddenInternalNarrativeStableBridgeV1 } from "./internal.ts";
// @ts-expect-error Narrative admitted-frame proof remains source-relative.
import type { NarrativeStableAdmittedFrameInternalV1 as ForbiddenPublicNarrativeStableFrameV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative admitted-frame proof.
import type { NarrativeStableAdmittedFrameInternalV1 as ForbiddenInternalNarrativeStableFrameV1 } from "./internal.ts";
// @ts-expect-error Narrative candidate snapshots remain source-relative until Host promotion.
import type { NarrativeStableCandidateSnapshotInternalV1 as ForbiddenPublicNarrativeCandidateSnapshotV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative candidate snapshots.
import type { NarrativeStableCandidateSnapshotInternalV1 as ForbiddenInternalNarrativeCandidateSnapshotV1 } from "./internal.ts";
// @ts-expect-error Narrative candidate preflight remains source-relative until Host promotion.
import type { NarrativeStableCandidatePreflightInternalV1 as ForbiddenPublicNarrativeCandidatePreflightV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative candidate preflight.
import type { NarrativeStableCandidatePreflightInternalV1 as ForbiddenInternalNarrativeCandidatePreflightV1 } from "./internal.ts";
// @ts-expect-error Narrative required-port identifiers remain source-relative.
import type { NarrativeStableRequiredPortIdInternalV1 as ForbiddenPublicNarrativeRequiredPortIdV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative required-port identifiers.
import type { NarrativeStableRequiredPortIdInternalV1 as ForbiddenInternalNarrativeRequiredPortIdV1 } from "./internal.ts";
// @ts-expect-error Narrative preflight rejection codes remain source-relative.
import type { NarrativeStableCandidatePreflightRejectionCodeInternalV1 as ForbiddenPublicNarrativeCandidatePreflightRejectionCodeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative preflight rejection codes.
import type { NarrativeStableCandidatePreflightRejectionCodeInternalV1 as ForbiddenInternalNarrativeCandidatePreflightRejectionCodeV1 } from "./internal.ts";
// @ts-expect-error Narrative preflight results remain source-relative.
import type { NarrativeStableCandidatePreflightResultInternalV1 as ForbiddenPublicNarrativeCandidatePreflightResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative preflight results.
import type { NarrativeStableCandidatePreflightResultInternalV1 as ForbiddenInternalNarrativeCandidatePreflightResultV1 } from "./internal.ts";
// @ts-expect-error Narrative publisher-bridge results remain source-relative.
import type { NarrativeStablePublisherBridgeResultInternalV1 as ForbiddenPublicNarrativePublisherBridgeResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative publisher-bridge results.
import type { NarrativeStablePublisherBridgeResultInternalV1 as ForbiddenInternalNarrativePublisherBridgeResultV1 } from "./internal.ts";
// @ts-expect-error Narrative bridge construction inputs remain source-relative.
import type { CreateNarrativeStablePublisherBridgeInputInternalV1 as ForbiddenPublicNarrativeStableBridgeInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative bridge construction inputs.
import type { CreateNarrativeStablePublisherBridgeInputInternalV1 as ForbiddenInternalNarrativeStableBridgeInputV1 } from "./internal.ts";
// @ts-expect-error Narrative semantic-resolution requests remain source-relative.
import type { NarrativeStableSemanticResolutionRequestInternalV1 as ForbiddenPublicNarrativeSemanticResolutionRequestV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative semantic-resolution requests.
import type { NarrativeStableSemanticResolutionRequestInternalV1 as ForbiddenInternalNarrativeSemanticResolutionRequestV1 } from "./internal.ts";
// @ts-expect-error Narrative semantic-resolution ports remain source-relative.
import type { NarrativeStableSemanticResolutionPortInternalV1 as ForbiddenPublicNarrativeSemanticResolutionPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative semantic-resolution ports.
import type { NarrativeStableSemanticResolutionPortInternalV1 as ForbiddenInternalNarrativeSemanticResolutionPortV1 } from "./internal.ts";
// @ts-expect-error Narrative Say reveal-generation ports remain source-relative until Host promotion.
import type { NarrativeStableSayRevealGenerationPortInternalV1 as ForbiddenPublicNarrativeSayRevealPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say reveal-generation ports.
import type { NarrativeStableSayRevealGenerationPortInternalV1 as ForbiddenInternalNarrativeSayRevealPortV1 } from "./internal.ts";
// @ts-expect-error Narrative voice-replay ports remain source-relative until Host promotion.
import type { NarrativeStableVoiceReplayPortInternalV1 as ForbiddenPublicNarrativeVoiceReplayPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative voice-replay ports.
import type { NarrativeStableVoiceReplayPortInternalV1 as ForbiddenInternalNarrativeVoiceReplayPortV1 } from "./internal.ts";
// @ts-expect-error Narrative History availability ports remain source-relative until Host promotion.
import type { NarrativeStableHistoryAvailabilityPortInternalV1 as ForbiddenPublicNarrativeHistoryAvailabilityPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History availability ports.
import type { NarrativeStableHistoryAvailabilityPortInternalV1 as ForbiddenInternalNarrativeHistoryAvailabilityPortV1 } from "./internal.ts";
// @ts-expect-error Narrative playback modes remain source-relative until Host promotion.
import type { NarrativeStablePlaybackModeInternalV1 as ForbiddenPublicNarrativePlaybackModeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative playback modes.
import type { NarrativeStablePlaybackModeInternalV1 as ForbiddenInternalNarrativePlaybackModeV1 } from "./internal.ts";
// @ts-expect-error Captured Narrative semantic-resolution ports remain source-relative.
import type { NarrativeStableCapturedSemanticResolutionPortInternalV1 as ForbiddenPublicNarrativeCapturedSemanticResolutionPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose captured Narrative semantic-resolution ports.
import type { NarrativeStableCapturedSemanticResolutionPortInternalV1 as ForbiddenInternalNarrativeCapturedSemanticResolutionPortV1 } from "./internal.ts";
// @ts-expect-error Captured Narrative voice-replay ports remain source-relative.
import type { NarrativeStableCapturedVoiceReplayPortInternalV1 as ForbiddenPublicNarrativeCapturedVoiceReplayPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose captured Narrative voice-replay ports.
import type { NarrativeStableCapturedVoiceReplayPortInternalV1 as ForbiddenInternalNarrativeCapturedVoiceReplayPortV1 } from "./internal.ts";
// @ts-expect-error Captured Narrative History availability ports remain source-relative.
import type { NarrativeStableCapturedHistoryAvailabilityPortInternalV1 as ForbiddenPublicNarrativeCapturedHistoryAvailabilityPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose captured Narrative History availability ports.
import type { NarrativeStableCapturedHistoryAvailabilityPortInternalV1 as ForbiddenInternalNarrativeCapturedHistoryAvailabilityPortV1 } from "./internal.ts";
// @ts-expect-error Narrative choice-action attempts remain source-relative.
import type { NarrativeStableChoiceActionAttemptInternalV1 as ForbiddenPublicNarrativeChoiceActionAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative choice-action attempts.
import type { NarrativeStableChoiceActionAttemptInternalV1 as ForbiddenInternalNarrativeChoiceActionAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative custom-action attempts remain source-relative.
import type { NarrativeStableCustomActionAttemptInternalV1 as ForbiddenPublicNarrativeCustomActionAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative custom-action attempts.
import type { NarrativeStableCustomActionAttemptInternalV1 as ForbiddenInternalNarrativeCustomActionAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative pause-resume action attempts remain source-relative.
import type { NarrativeStablePauseResumeActionAttemptInternalV1 as ForbiddenPublicNarrativePauseResumeActionAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative pause-resume action attempts.
import type { NarrativeStablePauseResumeActionAttemptInternalV1 as ForbiddenInternalNarrativePauseResumeActionAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative Say activation attempts remain source-relative.
import type { NarrativeStableSayActivationAttemptInternalV1 as ForbiddenPublicNarrativeSayActivationAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say activation attempts.
import type { NarrativeStableSayActivationAttemptInternalV1 as ForbiddenInternalNarrativeSayActivationAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative Say content-auto attempts remain source-relative.
import type { NarrativeStableSayContentAutoAttemptInternalV1 as ForbiddenPublicNarrativeSayContentAutoAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say content-auto attempts.
import type { NarrativeStableSayContentAutoAttemptInternalV1 as ForbiddenInternalNarrativeSayContentAutoAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative Say content-auto dispatch results remain source-relative.
import type { NarrativeStableSayContentAutoDispatchResultInternalV1 as ForbiddenPublicNarrativeSayContentAutoDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say content-auto dispatch results.
import type { NarrativeStableSayContentAutoDispatchResultInternalV1 as ForbiddenInternalNarrativeSayContentAutoDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative voice-replay action attempts remain source-relative.
import type { NarrativeStableVoiceReplayActionAttemptInternalV1 as ForbiddenPublicNarrativeVoiceReplayActionAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative voice-replay action attempts.
import type { NarrativeStableVoiceReplayActionAttemptInternalV1 as ForbiddenInternalNarrativeVoiceReplayActionAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative voice-replay dispatch results remain source-relative.
import type { NarrativeStableVoiceReplayDispatchResultInternalV1 as ForbiddenPublicNarrativeVoiceReplayDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative voice-replay dispatch results.
import type { NarrativeStableVoiceReplayDispatchResultInternalV1 as ForbiddenInternalNarrativeVoiceReplayDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative playback-mode toggle attempts remain source-relative.
import type { NarrativeStablePlaybackModeToggleActionAttemptInternalV1 as ForbiddenPublicNarrativePlaybackModeToggleAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative playback-mode toggle attempts.
import type { NarrativeStablePlaybackModeToggleActionAttemptInternalV1 as ForbiddenInternalNarrativePlaybackModeToggleAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative playback-mode toggle dispatch results remain source-relative.
import type { NarrativeStablePlaybackModeToggleDispatchResultInternalV1 as ForbiddenPublicNarrativePlaybackModeToggleDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative playback-mode toggle dispatch results.
import type { NarrativeStablePlaybackModeToggleDispatchResultInternalV1 as ForbiddenInternalNarrativePlaybackModeToggleDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative History-open action attempts remain source-relative.
import type { NarrativeStableHistoryOpenActionAttemptInternalV1 as ForbiddenPublicNarrativeHistoryOpenActionAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-open action attempts.
import type { NarrativeStableHistoryOpenActionAttemptInternalV1 as ForbiddenInternalNarrativeHistoryOpenActionAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative History-open intents remain source-relative.
import type { NarrativeStableHistoryOpenIntentInternalV1 as ForbiddenPublicNarrativeHistoryOpenIntentV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-open intents.
import type { NarrativeStableHistoryOpenIntentInternalV1 as ForbiddenInternalNarrativeHistoryOpenIntentV1 } from "./internal.ts";
// @ts-expect-error Narrative History-open dispatch results remain source-relative.
import type { NarrativeStableHistoryOpenDispatchResultInternalV1 as ForbiddenPublicNarrativeHistoryOpenDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-open dispatch results.
import type { NarrativeStableHistoryOpenDispatchResultInternalV1 as ForbiddenInternalNarrativeHistoryOpenDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative History-child lifecycles remain source-relative.
import type { NarrativeStableHistoryChildLifecycleInternalV1 as ForbiddenPublicNarrativeHistoryChildLifecycleV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-child lifecycles.
import type { NarrativeStableHistoryChildLifecycleInternalV1 as ForbiddenInternalNarrativeHistoryChildLifecycleV1 } from "./internal.ts";
// @ts-expect-error Narrative History-child lifecycle construction remains source-relative.
import type { createNarrativeStableHistoryChildLifecycleInternalV1 as ForbiddenPublicNarrativeHistoryChildLifecycleFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-child lifecycle construction.
import type { createNarrativeStableHistoryChildLifecycleInternalV1 as ForbiddenInternalNarrativeHistoryChildLifecycleFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative History-child preparations remain source-relative.
import type { NarrativeStableHistoryChildPreparationInternalV1 as ForbiddenPublicNarrativeHistoryChildPreparationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-child preparations.
import type { NarrativeStableHistoryChildPreparationInternalV1 as ForbiddenInternalNarrativeHistoryChildPreparationV1 } from "./internal.ts";
// @ts-expect-error Narrative History-child preparation results remain source-relative.
import type { NarrativeStableHistoryChildPreparationResultInternalV1 as ForbiddenPublicNarrativeHistoryChildPreparationResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History-child preparation results.
import type { NarrativeStableHistoryChildPreparationResultInternalV1 as ForbiddenInternalNarrativeHistoryChildPreparationResultV1 } from "./internal.ts";
// @ts-expect-error Narrative stable root preparations remain source-relative until Host promotion.
import type { NarrativeStableRootPreparationInternalV1 as ForbiddenPublicNarrativeStableRootPreparationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative stable root preparations.
import type { NarrativeStableRootPreparationInternalV1 as ForbiddenInternalNarrativeStableRootPreparationV1 } from "./internal.ts";
// @ts-expect-error Narrative readiness entries remain source-relative until Host promotion.
import type { NarrativeStableReadinessEntryInternalV1 as ForbiddenPublicNarrativeStableReadinessEntryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative readiness entries.
import type { NarrativeStableReadinessEntryInternalV1 as ForbiddenInternalNarrativeStableReadinessEntryV1 } from "./internal.ts";
// @ts-expect-error Narrative readiness snapshots remain source-relative until Host promotion.
import type { NarrativeStableReadinessSnapshotInternalV1 as ForbiddenPublicNarrativeStableReadinessSnapshotV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative readiness snapshots.
import type { NarrativeStableReadinessSnapshotInternalV1 as ForbiddenInternalNarrativeStableReadinessSnapshotV1 } from "./internal.ts";
// @ts-expect-error Narrative Host leases remain source-relative until Host promotion.
import type { NarrativeStableHostLeaseInternalV1 as ForbiddenPublicNarrativeStableHostLeaseV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host leases.
import type { NarrativeStableHostLeaseInternalV1 as ForbiddenInternalNarrativeStableHostLeaseV1 } from "./internal.ts";
// @ts-expect-error Narrative stable sessions remain source-relative until Host promotion.
import type { NarrativeStableSessionInternalV1 as ForbiddenPublicNarrativeStableSessionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative stable sessions.
import type { NarrativeStableSessionInternalV1 as ForbiddenInternalNarrativeStableSessionV1 } from "./internal.ts";
// @ts-expect-error Narrative stable-session construction remains source-relative until Host promotion.
import type { createNarrativeStableSessionInternalV1 as ForbiddenPublicNarrativeStableSessionFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative stable-session construction.
import type { createNarrativeStableSessionInternalV1 as ForbiddenInternalNarrativeStableSessionFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative History observation ports remain source-relative until Host promotion.
import type { NarrativeStableHistoryObservationPortInternalV1 as ForbiddenPublicNarrativeHistoryObservationPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History observation ports.
import type { NarrativeStableHistoryObservationPortInternalV1 as ForbiddenInternalNarrativeHistoryObservationPortV1 } from "./internal.ts";
// @ts-expect-error Captured Narrative History observation ports remain source-relative.
import type { NarrativeStableCapturedHistoryObservationPortInternalV1 as ForbiddenPublicNarrativeCapturedHistoryObservationPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose captured Narrative History observation ports.
import type { NarrativeStableCapturedHistoryObservationPortInternalV1 as ForbiddenInternalNarrativeCapturedHistoryObservationPortV1 } from "./internal.ts";
// @ts-expect-error Narrative History render observations remain source-relative.
import type { NarrativeStableHistoryRenderObservationInternalV1 as ForbiddenPublicNarrativeHistoryRenderObservationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History render observations.
import type { NarrativeStableHistoryRenderObservationInternalV1 as ForbiddenInternalNarrativeHistoryRenderObservationV1 } from "./internal.ts";
// @ts-expect-error Narrative dialogue renderer props remain source-relative.
import type { NarrativeStableDialogueRendererPropsInternalV1 as ForbiddenPublicNarrativeDialogueRendererPropsV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative dialogue renderer props.
import type { NarrativeStableDialogueRendererPropsInternalV1 as ForbiddenInternalNarrativeDialogueRendererPropsV1 } from "./internal.ts";
// @ts-expect-error Narrative History renderer props remain source-relative.
import type { NarrativeStableHistoryRendererPropsInternalV1 as ForbiddenPublicNarrativeHistoryRendererPropsV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative History renderer props.
import type { NarrativeStableHistoryRendererPropsInternalV1 as ForbiddenInternalNarrativeHistoryRendererPropsV1 } from "./internal.ts";
// @ts-expect-error Narrative renderer props remain source-relative.
import type { NarrativeStableRendererPropsInternalV1 as ForbiddenPublicNarrativeRendererPropsV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative renderer props.
import type { NarrativeStableRendererPropsInternalV1 as ForbiddenInternalNarrativeRendererPropsV1 } from "./internal.ts";
// @ts-expect-error Narrative renderer components remain source-relative.
import type { NarrativeStableRendererComponentInternalV1 as ForbiddenPublicNarrativeRendererComponentV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative renderer components.
import type { NarrativeStableRendererComponentInternalV1 as ForbiddenInternalNarrativeRendererComponentV1 } from "./internal.ts";
// @ts-expect-error Narrative Host render keys remain source-relative.
import type { NarrativeStableHostRenderKeyInternalV1 as ForbiddenPublicNarrativeHostRenderKeyV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host render keys.
import type { NarrativeStableHostRenderKeyInternalV1 as ForbiddenInternalNarrativeHostRenderKeyV1 } from "./internal.ts";
// @ts-expect-error Narrative Host render phases remain source-relative.
import type { NarrativeStableHostRenderPhaseInternalV1 as ForbiddenPublicNarrativeHostRenderPhaseV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host render phases.
import type { NarrativeStableHostRenderPhaseInternalV1 as ForbiddenInternalNarrativeHostRenderPhaseV1 } from "./internal.ts";
// @ts-expect-error Narrative Host render entries remain source-relative.
import type { NarrativeStableHostRenderEntryInternalV1 as ForbiddenPublicNarrativeHostRenderEntryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host render entries.
import type { NarrativeStableHostRenderEntryInternalV1 as ForbiddenInternalNarrativeHostRenderEntryV1 } from "./internal.ts";
// @ts-expect-error Narrative Host render snapshots remain source-relative.
import type { NarrativeStableHostRenderSnapshotInternalV1 as ForbiddenPublicNarrativeHostRenderSnapshotV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host render snapshots.
import type { NarrativeStableHostRenderSnapshotInternalV1 as ForbiddenInternalNarrativeHostRenderSnapshotV1 } from "./internal.ts";
// @ts-expect-error Narrative Host render sources remain source-relative.
import type { NarrativeStableHostRenderSourceInternalV1 as ForbiddenPublicNarrativeHostRenderSourceV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host render sources.
import type { NarrativeStableHostRenderSourceInternalV1 as ForbiddenInternalNarrativeHostRenderSourceV1 } from "./internal.ts";
// @ts-expect-error Narrative Host runtime inputs remain source-relative.
import type { CreateNarrativeStableHostRuntimeInputInternalV1 as ForbiddenPublicNarrativeHostRuntimeInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host runtime inputs.
import type { CreateNarrativeStableHostRuntimeInputInternalV1 as ForbiddenInternalNarrativeHostRuntimeInputV1 } from "./internal.ts";
// @ts-expect-error Narrative Host runtimes remain source-relative.
import type { NarrativeStableHostRuntimeInternalV1 as ForbiddenPublicNarrativeHostRuntimeV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host runtimes.
import type { NarrativeStableHostRuntimeInternalV1 as ForbiddenInternalNarrativeHostRuntimeV1 } from "./internal.ts";
// @ts-expect-error Narrative Host runtime construction remains source-relative.
import type { createNarrativeStableHostRuntimeInternalV1 as ForbiddenPublicNarrativeHostRuntimeFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host runtime construction.
import type { createNarrativeStableHostRuntimeInternalV1 as ForbiddenInternalNarrativeHostRuntimeFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative readiness settlement results remain source-relative.
import type { NarrativeStableReadinessSettlementResultInternalV1 as ForbiddenPublicNarrativeReadinessSettlementResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative readiness settlement results.
import type { NarrativeStableReadinessSettlementResultInternalV1 as ForbiddenInternalNarrativeReadinessSettlementResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Host attachments remain source-relative.
import type { NarrativeStableHostAttachmentInternalV1 as ForbiddenPublicNarrativeHostAttachmentV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host attachments.
import type { NarrativeStableHostAttachmentInternalV1 as ForbiddenInternalNarrativeHostAttachmentV1 } from "./internal.ts";
// @ts-expect-error Narrative Host ready-commit tokens remain source-relative.
import type { NarrativeStableHostReadyCommitInternalV1 as ForbiddenPublicNarrativeHostReadyCommitV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host ready-commit tokens.
import type { NarrativeStableHostReadyCommitInternalV1 as ForbiddenInternalNarrativeHostReadyCommitV1 } from "./internal.ts";
// @ts-expect-error Narrative Host ready-commit preparation inputs remain source-relative.
import type { PrepareNarrativeStableHostReadyCommitInputInternalV1 as ForbiddenPublicNarrativeHostReadyCommitInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host ready-commit preparation inputs.
import type { PrepareNarrativeStableHostReadyCommitInputInternalV1 as ForbiddenInternalNarrativeHostReadyCommitInputV1 } from "./internal.ts";
// @ts-expect-error Narrative Host ready-commit preparation results remain source-relative.
import type { NarrativeStableHostReadyCommitPreparationResultInternalV1 as ForbiddenPublicNarrativeHostReadyCommitPreparationResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host ready-commit preparation results.
import type { NarrativeStableHostReadyCommitPreparationResultInternalV1 as ForbiddenInternalNarrativeHostReadyCommitPreparationResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Host ready-commit preparation remains source-relative.
import type { prepareNarrativeStableHostReadyCommitInternalV1 as ForbiddenPublicNarrativeHostReadyCommitFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Host ready-commit preparation.
import type { prepareNarrativeStableHostReadyCommitInternalV1 as ForbiddenInternalNarrativeHostReadyCommitFactoryV1 } from "./internal.ts";
// @ts-expect-error Dormant Narrative Surface Host props remain source-relative.
import type { NarrativeSurfaceHostPropsInternalV1 as ForbiddenPublicNarrativeSurfaceHostPropsV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose dormant Narrative Surface Host props.
import type { NarrativeSurfaceHostPropsInternalV1 as ForbiddenInternalNarrativeSurfaceHostPropsV1 } from "./internal.ts";
// @ts-expect-error Dormant Narrative Surface Host construction remains source-relative.
import type { NarrativeSurfaceHostInternalV1 as ForbiddenPublicNarrativeSurfaceHostV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose dormant Narrative Surface Host construction.
import type { NarrativeSurfaceHostInternalV1 as ForbiddenInternalNarrativeSurfaceHostV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run proofs remain source-relative.
import type { StageAcknowledgedRunProofInternalV1 as ForbiddenPublicStageAcknowledgedRunProofV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run proofs.
import type { StageAcknowledgedRunProofInternalV1 as ForbiddenInternalStageAcknowledgedRunProofV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run commit guards remain source-relative.
import type { StageAcknowledgedRunCommitGuardInternalV1 as ForbiddenPublicStageAcknowledgedRunCommitGuardV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run commit guards.
import type { StageAcknowledgedRunCommitGuardInternalV1 as ForbiddenInternalStageAcknowledgedRunCommitGuardV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run terminal ports remain source-relative.
import type { StageAcknowledgedRunTerminalPortInternalV1 as ForbiddenPublicStageAcknowledgedRunTerminalPortV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run terminal ports.
import type { StageAcknowledgedRunTerminalPortInternalV1 as ForbiddenInternalStageAcknowledgedRunTerminalPortV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run retarget results remain source-relative.
import type { StageAcknowledgedRunRetargetResultInternalV1 as ForbiddenPublicStageAcknowledgedRunRetargetResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run retarget results.
import type { StageAcknowledgedRunRetargetResultInternalV1 as ForbiddenInternalStageAcknowledgedRunRetargetResultV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run authorities remain source-relative.
import type { StageAcknowledgedRunAuthorityInternalV1 as ForbiddenPublicStageAcknowledgedRunAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run authorities.
import type { StageAcknowledgedRunAuthorityInternalV1 as ForbiddenInternalStageAcknowledgedRunAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stage acknowledged-run authority claiming remains source-relative.
import type { claimStageAcknowledgedRunAuthorityInternalV1 as ForbiddenPublicStageAcknowledgedRunAuthorityClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage acknowledged-run authority claiming.
import type { claimStageAcknowledgedRunAuthorityInternalV1 as ForbiddenInternalStageAcknowledgedRunAuthorityClaimV1 } from "./internal.ts";
// @ts-expect-error Stage presentation-generation proofs remain source-relative.
import type { StagePresentationGenerationProofInternalV1 as ForbiddenPublicStagePresentationGenerationProofV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage presentation-generation proofs.
import type { StagePresentationGenerationProofInternalV1 as ForbiddenInternalStagePresentationGenerationProofV1 } from "./internal.ts";
// @ts-expect-error Stage presentation-generation capture results remain source-relative.
import type { StagePresentationGenerationCaptureResultInternalV1 as ForbiddenPublicStagePresentationGenerationCaptureResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage presentation-generation capture results.
import type { StagePresentationGenerationCaptureResultInternalV1 as ForbiddenInternalStagePresentationGenerationCaptureResultV1 } from "./internal.ts";
// @ts-expect-error Stage presentation-generation retarget results remain source-relative.
import type { StagePresentationGenerationRetargetResultInternalV1 as ForbiddenPublicStagePresentationGenerationRetargetResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Stage presentation-generation retarget results.
import type { StagePresentationGenerationRetargetResultInternalV1 as ForbiddenInternalStagePresentationGenerationRetargetResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier recovery generations remain source-relative.
import type { NarrativeStableBarrierRecoveryGenerationInternalV1 as ForbiddenPublicNarrativeBarrierRecoveryGenerationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier recovery generations.
import type { NarrativeStableBarrierRecoveryGenerationInternalV1 as ForbiddenInternalNarrativeBarrierRecoveryGenerationV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier recovery-generation synchronization results remain source-relative.
import type { NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1 as ForbiddenPublicNarrativeBarrierRecoveryGenerationSynchronizationResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier recovery-generation synchronization results.
import type { NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1 as ForbiddenInternalNarrativeBarrierRecoveryGenerationSynchronizationResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier recovery attempts remain source-relative.
import type { NarrativeStableBarrierRecoveryAttemptInternalV1 as ForbiddenPublicNarrativeBarrierRecoveryAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier recovery attempts.
import type { NarrativeStableBarrierRecoveryAttemptInternalV1 as ForbiddenInternalNarrativeBarrierRecoveryAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier recovery dispatch results remain source-relative.
import type { NarrativeStableBarrierRecoveryDispatchResultInternalV1 as ForbiddenPublicNarrativeBarrierRecoveryDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier recovery dispatch results.
import type { NarrativeStableBarrierRecoveryDispatchResultInternalV1 as ForbiddenInternalNarrativeBarrierRecoveryDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier replay-recovery unsupported results remain source-relative.
import type { NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1 as ForbiddenPublicNarrativeBarrierReplayRecoveryUnsupportedResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier replay-recovery unsupported results.
import type { NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1 as ForbiddenInternalNarrativeBarrierReplayRecoveryUnsupportedResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier Stage-retarget results remain source-relative.
import type { NarrativeStableBarrierStageRetargetResultInternalV1 as ForbiddenPublicNarrativeBarrierStageRetargetResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier Stage-retarget results.
import type { NarrativeStableBarrierStageRetargetResultInternalV1 as ForbiddenInternalNarrativeBarrierStageRetargetResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier terminal-dispatch results remain source-relative.
import type { NarrativeStableBarrierTerminalDispatchResultInternalV1 as ForbiddenPublicNarrativeBarrierTerminalDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier terminal-dispatch results.
import type { NarrativeStableBarrierTerminalDispatchResultInternalV1 as ForbiddenInternalNarrativeBarrierTerminalDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier controller inputs remain source-relative.
import type { CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1 as ForbiddenPublicNarrativeBarrierControllerInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier controller inputs.
import type { CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1 as ForbiddenInternalNarrativeBarrierControllerInputV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier controllers remain source-relative.
import type { NarrativeStableBarrierAcknowledgmentControllerInternalV1 as ForbiddenPublicNarrativeBarrierControllerV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier controllers.
import type { NarrativeStableBarrierAcknowledgmentControllerInternalV1 as ForbiddenInternalNarrativeBarrierControllerV1 } from "./internal.ts";
// @ts-expect-error Narrative Barrier controller construction remains source-relative.
import type { createNarrativeStableBarrierAcknowledgmentControllerInternalV1 as ForbiddenPublicNarrativeBarrierControllerFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Barrier controller construction.
import type { createNarrativeStableBarrierAcknowledgmentControllerInternalV1 as ForbiddenInternalNarrativeBarrierControllerFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative Say reveal-controller inputs remain source-relative.
import type { CreateNarrativeStableSayRevealControllerInputInternalV1 as ForbiddenPublicNarrativeSayRevealControllerInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say reveal-controller inputs.
import type { CreateNarrativeStableSayRevealControllerInputInternalV1 as ForbiddenInternalNarrativeSayRevealControllerInputV1 } from "./internal.ts";
// @ts-expect-error Narrative Say reveal controllers remain source-relative.
import type { NarrativeStableSayRevealControllerInternalV1 as ForbiddenPublicNarrativeSayRevealControllerV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say reveal controllers.
import type { NarrativeStableSayRevealControllerInternalV1 as ForbiddenInternalNarrativeSayRevealControllerV1 } from "./internal.ts";
// @ts-expect-error Narrative Say reveal-controller construction remains source-relative.
import type { createNarrativeStableSayRevealControllerInternalV1 as ForbiddenPublicNarrativeSayRevealControllerFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative Say reveal-controller construction.
import type { createNarrativeStableSayRevealControllerInternalV1 as ForbiddenInternalNarrativeSayRevealControllerFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative pause-expiry controller attempts remain source-relative.
import type { NarrativeStablePauseExpiryControllerAttemptInternalV1 as ForbiddenPublicNarrativePauseExpiryControllerAttemptV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative pause-expiry controller attempts.
import type { NarrativeStablePauseExpiryControllerAttemptInternalV1 as ForbiddenInternalNarrativePauseExpiryControllerAttemptV1 } from "./internal.ts";
// @ts-expect-error Narrative pause-expiry dispatch results remain source-relative.
import type { NarrativeStablePauseExpiryDispatchResultInternalV1 as ForbiddenPublicNarrativePauseExpiryDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative pause-expiry dispatch results.
import type { NarrativeStablePauseExpiryDispatchResultInternalV1 as ForbiddenInternalNarrativePauseExpiryDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative pause-expiry controllers remain source-relative.
import type { NarrativeStablePauseExpiryControllerInternalV1 as ForbiddenPublicNarrativePauseExpiryControllerV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative pause-expiry controllers.
import type { NarrativeStablePauseExpiryControllerInternalV1 as ForbiddenInternalNarrativePauseExpiryControllerV1 } from "./internal.ts";
// @ts-expect-error Narrative pause-expiry controller construction remains source-relative.
import type { createNarrativeStablePauseExpiryControllerInternalV1 as ForbiddenPublicNarrativePauseExpiryControllerFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative pause-expiry controller construction.
import type { createNarrativeStablePauseExpiryControllerInternalV1 as ForbiddenInternalNarrativePauseExpiryControllerFactoryV1 } from "./internal.ts";
// @ts-expect-error Narrative physical-action dispatch results remain source-relative.
import type { NarrativeStablePhysicalActionDispatchResultInternalV1 as ForbiddenPublicNarrativePhysicalActionDispatchResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative physical-action dispatch results.
import type { NarrativeStablePhysicalActionDispatchResultInternalV1 as ForbiddenInternalNarrativePhysicalActionDispatchResultV1 } from "./internal.ts";
// @ts-expect-error Narrative physical-action admission inputs remain source-relative.
import type { CreateNarrativeStablePhysicalActionAdmissionInputInternalV1 as ForbiddenPublicNarrativePhysicalActionAdmissionInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative physical-action admission inputs.
import type { CreateNarrativeStablePhysicalActionAdmissionInputInternalV1 as ForbiddenInternalNarrativePhysicalActionAdmissionInputV1 } from "./internal.ts";
// @ts-expect-error Narrative physical-action admission remains source-relative.
import type { NarrativeStablePhysicalActionAdmissionInternalV1 as ForbiddenPublicNarrativePhysicalActionAdmissionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative physical-action admission.
import type { NarrativeStablePhysicalActionAdmissionInternalV1 as ForbiddenInternalNarrativePhysicalActionAdmissionV1 } from "./internal.ts";
// @ts-expect-error Narrative physical-action admission construction remains source-relative.
import type { createNarrativeStablePhysicalActionAdmissionInternalV1 as ForbiddenPublicNarrativePhysicalActionAdmissionFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose Narrative physical-action admission construction.
import type { createNarrativeStablePhysicalActionAdmissionInternalV1 as ForbiddenInternalNarrativePhysicalActionAdmissionFactoryV1 } from "./internal.ts";
// @ts-expect-error Family configuration matching remains source-relative.
import type { matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1 as ForbiddenPublicStableFamilyConfigurationMatcherV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose family configuration matching.
import type { matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1 as ForbiddenInternalStableFamilyConfigurationMatcherV1 } from "./internal.ts";
// @ts-expect-error Composite-kernel configuration matching remains source-relative.
import type { matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1 as ForbiddenPublicStableCompositeConfigurationMatcherV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose composite-kernel configuration matching.
import type { matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1 as ForbiddenInternalStableCompositeConfigurationMatcherV1 } from "./internal.ts";
// @ts-expect-error Contract-bound action-route authorities stay source-relative.
import type { ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 as ForbiddenPublicContractBoundActionRouteAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose contract-bound action-route authorities.
import type { ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 as ForbiddenInternalContractBoundActionRouteAuthorityV1 } from "./internal.ts";
// @ts-expect-error Contract-bound action-binding inputs stay source-relative.
import type { CreateManagedSurfaceContractBoundActionBindingInputInternalV1 as ForbiddenPublicContractBoundActionBindingInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose contract-bound action-binding inputs.
import type { CreateManagedSurfaceContractBoundActionBindingInputInternalV1 as ForbiddenInternalContractBoundActionBindingInputV1 } from "./internal.ts";
// @ts-expect-error Authenticated action-route results stay source-relative.
import type { ManagedSurfaceAuthenticatedActionRouteResultInternalV1 as ForbiddenPublicAuthenticatedActionRouteResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose authenticated action-route results.
import type { ManagedSurfaceAuthenticatedActionRouteResultInternalV1 as ForbiddenInternalAuthenticatedActionRouteResultV1 } from "./internal.ts";
// @ts-expect-error Authenticated action continuation inputs stay source-relative.
import type { ManagedSurfaceAuthenticatedActionContinuationInputInternalV1 as ForbiddenPublicAuthenticatedActionContinuationInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose authenticated action continuation inputs.
import type { ManagedSurfaceAuthenticatedActionContinuationInputInternalV1 as ForbiddenInternalAuthenticatedActionContinuationInputV1 } from "./internal.ts";
// @ts-expect-error Authenticated action routes stay source-relative.
import type { ManagedSurfaceAuthenticatedActionRouteInternalV1 as ForbiddenPublicAuthenticatedActionRouteV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose authenticated action routes.
import type { ManagedSurfaceAuthenticatedActionRouteInternalV1 as ForbiddenInternalAuthenticatedActionRouteV1 } from "./internal.ts";
// @ts-expect-error Contract-bound action-binding construction stays source-relative.
import type { createManagedSurfaceContractBoundActionBindingInternalV1 as ForbiddenPublicContractBoundActionBindingFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose contract-bound action-binding construction.
import type { createManagedSurfaceContractBoundActionBindingInternalV1 as ForbiddenInternalContractBoundActionBindingFactoryV1 } from "./internal.ts";
// @ts-expect-error Authenticated action-route claims stay source-relative.
import type { claimManagedSurfaceAuthenticatedActionRouteInternalV1 as ForbiddenPublicAuthenticatedActionRouteClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose authenticated action-route claims.
import type { claimManagedSurfaceAuthenticatedActionRouteInternalV1 as ForbiddenInternalAuthenticatedActionRouteClaimV1 } from "./internal.ts";
// @ts-expect-error Stable direct-action proofs stay source-relative.
import type { ManagedSurfaceStableDirectActionTargetProofInternalV1 as ForbiddenPublicStableDirectActionTargetProofV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable direct-action proofs.
import type { ManagedSurfaceStableDirectActionTargetProofInternalV1 as ForbiddenInternalStableDirectActionTargetProofV1 } from "./internal.ts";
// @ts-expect-error Stable ready-active target proofs stay source-relative.
import type { ManagedSurfaceStableReadyActiveTargetProofInternalV1 as ForbiddenPublicStableReadyActiveTargetProofV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable ready-active target proofs.
import type { ManagedSurfaceStableReadyActiveTargetProofInternalV1 as ForbiddenInternalStableReadyActiveTargetProofV1 } from "./internal.ts";
// @ts-expect-error Stable ready-active target capture results stay source-relative.
import type { ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1 as ForbiddenPublicStableReadyActiveTargetCaptureResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable ready-active target capture results.
import type { ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1 as ForbiddenInternalStableReadyActiveTargetCaptureResultV1 } from "./internal.ts";
// @ts-expect-error Stable action-input capture results stay source-relative.
import type { ManagedSurfaceStableActionInputCaptureResultInternalV1 as ForbiddenPublicStableActionInputCaptureResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable action-input capture results.
import type { ManagedSurfaceStableActionInputCaptureResultInternalV1 as ForbiddenInternalStableActionInputCaptureResultV1 } from "./internal.ts";
// @ts-expect-error Stable action-route authorities stay source-relative.
import type { ManagedSurfaceStableActionRouteAuthorityInternalV1 as ForbiddenPublicStableActionRouteAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable action-route authorities.
import type { ManagedSurfaceStableActionRouteAuthorityInternalV1 as ForbiddenInternalStableActionRouteAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stable action-route authority claims stay source-relative.
import type { claimManagedSurfaceStableActionRouteAuthorityInternalV1 as ForbiddenPublicStableActionRouteAuthorityClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable action-route authority claims.
import type { claimManagedSurfaceStableActionRouteAuthorityInternalV1 as ForbiddenInternalStableActionRouteAuthorityClaimV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child authorities remain source-relative.
import type { ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child authorities.
import type { ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child authority claims remain source-relative.
import type { claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildAuthorityClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child authority claims.
import type { claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildAuthorityClaimV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child commit guards remain source-relative.
import type { ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1 as ForbiddenPublicStableExactParentTransientChildCommitGuardV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child commit guards.
import type { ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1 as ForbiddenInternalStableExactParentTransientChildCommitGuardV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child candidates remain source-relative.
import type { ManagedSurfaceStableExactParentTransientChildCandidateInternalV1 as ForbiddenPublicStableExactParentTransientChildCandidateV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child candidates.
import type { ManagedSurfaceStableExactParentTransientChildCandidateInternalV1 as ForbiddenInternalStableExactParentTransientChildCandidateV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child preparation results remain source-relative.
import type { ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1 as ForbiddenPublicStableExactParentTransientChildPreparationResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child preparation results.
import type { ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1 as ForbiddenInternalStableExactParentTransientChildPreparationResultV1 } from "./internal.ts";
// @ts-expect-error Cross-axis reducer preparation remains source-relative.
import type { deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1 as ForbiddenPublicReducerCrossAxisChildPreparationV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose cross-axis reducer preparation.
import type { deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1 as ForbiddenInternalReducerCrossAxisChildPreparationV1 } from "./internal.ts";
// @ts-expect-error Cross-axis reducer parent projections remain source-relative.
import type { ManagedSurfaceReducerCrossAxisParentProjectionInternalV1 as ForbiddenPublicReducerCrossAxisParentProjectionV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose cross-axis reducer parent projections.
import type { ManagedSurfaceReducerCrossAxisParentProjectionInternalV1 as ForbiddenInternalReducerCrossAxisParentProjectionV1 } from "./internal.ts";
// @ts-expect-error Cross-axis reducer preparation inputs remain source-relative.
import type { DeriveManagedSurfaceReducerCrossAxisChildPreparationInputInternalV1 as ForbiddenPublicReducerCrossAxisChildPreparationInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose cross-axis reducer preparation inputs.
import type { DeriveManagedSurfaceReducerCrossAxisChildPreparationInputInternalV1 as ForbiddenInternalReducerCrossAxisChildPreparationInputV1 } from "./internal.ts";
// @ts-expect-error Prepared contract-bound action-binding inputs stay source-relative.
import type { PrepareManagedSurfaceContractBoundActionBindingInputInternalV1 as ForbiddenPublicPreparedContractBoundActionBindingInputV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared contract-bound action-binding inputs.
import type { PrepareManagedSurfaceContractBoundActionBindingInputInternalV1 as ForbiddenInternalPreparedContractBoundActionBindingInputV1 } from "./internal.ts";
// @ts-expect-error Prepared contract-bound action bindings stay source-relative.
import type { ManagedSurfacePreparedContractBoundActionBindingInternalV1 as ForbiddenPublicPreparedContractBoundActionBindingV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared contract-bound action bindings.
import type { ManagedSurfacePreparedContractBoundActionBindingInternalV1 as ForbiddenInternalPreparedContractBoundActionBindingV1 } from "./internal.ts";
// @ts-expect-error Prepared contract-bound action-binding construction stays source-relative.
import type { prepareManagedSurfaceContractBoundActionBindingInternalV1 as ForbiddenPublicPreparedContractBoundActionBindingFactoryV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared contract-bound action-binding construction.
import type { prepareManagedSurfaceContractBoundActionBindingInternalV1 as ForbiddenInternalPreparedContractBoundActionBindingFactoryV1 } from "./internal.ts";
// @ts-expect-error Prepared authenticated action-route claims stay source-relative.
import type { claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1 as ForbiddenPublicPreparedAuthenticatedActionRouteClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared authenticated action-route claims.
import type { claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1 as ForbiddenInternalPreparedAuthenticatedActionRouteClaimV1 } from "./internal.ts";
// @ts-expect-error Prepared input-binding contract tokens stay source-relative.
import type { ManagedSurfacePreparedInputBindingContractInternalV1 as ForbiddenPublicPreparedInputBindingContractV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared input-binding contract tokens.
import type { ManagedSurfacePreparedInputBindingContractInternalV1 as ForbiddenInternalPreparedInputBindingContractV1 } from "./internal.ts";
// @ts-expect-error Prepared input-binding contract capture stays source-relative.
import type { captureManagedSurfacePreparedInputBindingContractInternalV1 as ForbiddenPublicPreparedInputBindingContractCaptureV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose prepared input-binding contract capture.
import type { captureManagedSurfacePreparedInputBindingContractInternalV1 as ForbiddenInternalPreparedInputBindingContractCaptureV1 } from "./internal.ts";
// @ts-expect-error Stable readiness commit guards stay source-relative.
import type { ManagedSurfaceStableReadinessCommitGuardInternalV1 as ForbiddenPublicStableReadinessCommitGuardV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable readiness commit guards.
import type { ManagedSurfaceStableReadinessCommitGuardInternalV1 as ForbiddenInternalStableReadinessCommitGuardV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child readiness results stay source-relative.
import type { ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 as ForbiddenPublicStableExactParentTransientChildReadinessResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child readiness results.
import type { ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1 as ForbiddenInternalStableExactParentTransientChildReadinessResultV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child readiness authorities stay source-relative.
import type { ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildReadinessAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child readiness authorities.
import type { ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildReadinessAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child readiness authority claims stay source-relative.
import type { claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildReadinessAuthorityClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child readiness authority claims.
import type { claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildReadinessAuthorityClaimV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child action-input capture results stay source-relative.
import type { ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 as ForbiddenPublicStableExactParentTransientChildActionInputCaptureResultV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child action-input capture results.
import type { ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1 as ForbiddenInternalStableExactParentTransientChildActionInputCaptureResultV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child action-route authorities stay source-relative.
import type { ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildActionRouteAuthorityV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child action-route authorities.
import type { ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildActionRouteAuthorityV1 } from "./internal.ts";
// @ts-expect-error Stable exact-parent transient-child action-route authority claims stay source-relative.
import type { claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 as ForbiddenPublicStableExactParentTransientChildActionRouteAuthorityClaimV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable exact-parent transient-child action-route authority claims.
import type { claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1 as ForbiddenInternalStableExactParentTransientChildActionRouteAuthorityClaimV1 } from "./internal.ts";
/* oxlint-enable no-unused-vars */

describe("@sillymaker/ui public managed System surface", () => {
  it("keeps the composition-backed Host and launchers without standalone lifecycle hosts", () => {
    type DormantRuntimeSpellingV1 =
      | "createNarrativeManagedSurfaceFamilyContractInternalV1"
      | "createNarrativeStablePublisherBridgeInternalV1"
      | "deriveManagedSurfaceReducerTopologyProjectionInternalV1"
      | "matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1"
      | "matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1"
      | "NarrativeStableRequiredPortIdInternalV1"
      | "NarrativeStableCandidatePreflightRejectionCodeInternalV1"
      | "NarrativeStableCandidatePreflightResultInternalV1"
      | "NarrativeStablePublisherBridgeResultInternalV1"
      | "NarrativeStableSemanticResolutionRequestInternalV1"
      | "NarrativeStableSemanticResolutionPortInternalV1"
      | "NarrativeStableSayRevealGenerationPortInternalV1"
      | "NarrativeStableVoiceReplayPortInternalV1"
      | "NarrativeStableHistoryAvailabilityPortInternalV1"
      | "NarrativeStablePlaybackModeInternalV1"
      | "NarrativeStableCapturedSemanticResolutionPortInternalV1"
      | "NarrativeStableCapturedVoiceReplayPortInternalV1"
      | "NarrativeStableCapturedHistoryAvailabilityPortInternalV1"
      | "NarrativeStableChoiceActionAttemptInternalV1"
      | "NarrativeStableCustomActionAttemptInternalV1"
      | "NarrativeStablePauseResumeActionAttemptInternalV1"
      | "NarrativeStableSayActivationAttemptInternalV1"
      | "NarrativeStableSayContentAutoAttemptInternalV1"
      | "NarrativeStableSayContentAutoDispatchResultInternalV1"
      | "NarrativeStableVoiceReplayActionAttemptInternalV1"
      | "NarrativeStableVoiceReplayDispatchResultInternalV1"
      | "issueVoiceReplayAttemptInternalV1"
      | "NarrativeStablePlaybackModeToggleActionAttemptInternalV1"
      | "NarrativeStablePlaybackModeToggleDispatchResultInternalV1"
      | "readPlaybackModeInternalV1"
      | "issuePlaybackModeToggleAttemptInternalV1"
      | "NarrativeStableHistoryOpenActionAttemptInternalV1"
      | "NarrativeStableHistoryOpenIntentInternalV1"
      | "NarrativeStableHistoryOpenDispatchResultInternalV1"
      | "NarrativeStableHistoryChildLifecycleInternalV1"
      | "createNarrativeStableHistoryChildLifecycleInternalV1"
      | "NarrativeStableHistoryChildPreparationInternalV1"
      | "NarrativeStableHistoryChildPreparationResultInternalV1"
      | "NarrativeStableRootPreparationInternalV1"
      | "NarrativeStableReadinessEntryInternalV1"
      | "NarrativeStableReadinessSnapshotInternalV1"
      | "NarrativeStableHostLeaseInternalV1"
      | "NarrativeStableSessionInternalV1"
      | "createNarrativeStableSessionInternalV1"
      | "NarrativeStableHistoryObservationPortInternalV1"
      | "NarrativeStableCapturedHistoryObservationPortInternalV1"
      | "NarrativeStableHistoryRenderObservationInternalV1"
      | "NarrativeStableDialogueRendererPropsInternalV1"
      | "NarrativeStableHistoryRendererPropsInternalV1"
      | "NarrativeStableRendererPropsInternalV1"
      | "NarrativeStableRendererComponentInternalV1"
      | "NarrativeStableHostRenderKeyInternalV1"
      | "NarrativeStableHostRenderPhaseInternalV1"
      | "NarrativeStableHostRenderEntryInternalV1"
      | "NarrativeStableHostRenderSnapshotInternalV1"
      | "NarrativeStableHostRenderSourceInternalV1"
      | "CreateNarrativeStableHostRuntimeInputInternalV1"
      | "NarrativeStableHostRuntimeInternalV1"
      | "createNarrativeStableHostRuntimeInternalV1"
      | "NarrativeStableReadinessSettlementResultInternalV1"
      | "NarrativeStableHostAttachmentInternalV1"
      | "NarrativeStableHostReadyCommitInternalV1"
      | "PrepareNarrativeStableHostReadyCommitInputInternalV1"
      | "NarrativeStableHostReadyCommitPreparationResultInternalV1"
      | "prepareNarrativeStableHostReadyCommitInternalV1"
      | "NarrativeSurfaceHostPropsInternalV1"
      | "NarrativeSurfaceHostInternalV1"
      | "attachment"
      | "renderSource"
      | "kind"
      | "completion"
      | "pending"
      | "visualConfig"
      | "playerProfile"
      | "textResolver"
      | "quickMenuContribution"
      | "history"
      | "phase"
      | "renderKey"
      | "preparation"
      | "initialFocusTargetId"
      | "rendererComponent"
      | "rendererProps"
      | "parentRenderKey"
      | "historyObservation"
      | "entries"
      | "session"
      | "hostIdentity"
      | "portalContainer"
      | "inputRouter"
      | "isGestureCurrent"
      | "hostRuntime"
      | "renderEntry"
      | "portalShell"
      | "initialFocusTarget"
      | "readyCommit"
      | "getReadinessSnapshotInternalV1"
      | "getSnapshotInternalV1"
      | "subscribeInternalV1"
      | "getHistoryChildLifecycleInternalV1"
      | "attachHostInternalV1"
      | "isCurrentInternalV1"
      | "settleRootReadinessReadyInternalV1"
      | "settleRootReadinessFailedInternalV1"
      | "settleHistoryReadinessReadyInternalV1"
      | "settleHistoryReadinessFailedInternalV1"
      | "releaseInternalV1"
      | "redeemHistoryOpenIntentInternalV1"
      | "readHistoryAvailabilityInternalV1"
      | "issueHistoryOpenAttemptInternalV1"
      | "StageAcknowledgedRunProofInternalV1"
      | "StageAcknowledgedRunCommitGuardInternalV1"
      | "StageAcknowledgedRunTerminalPortInternalV1"
      | "StageAcknowledgedRunRetargetResultInternalV1"
      | "StageAcknowledgedRunAuthorityInternalV1"
      | "claimStageAcknowledgedRunAuthorityInternalV1"
      | "StagePresentationGenerationProofInternalV1"
      | "StagePresentationGenerationCaptureResultInternalV1"
      | "StagePresentationGenerationRetargetResultInternalV1"
      | "captureCurrentPresentationGenerationInternalV1"
      | "retargetPresentationGenerationInternalV1"
      | "NarrativeStableBarrierRecoveryGenerationInternalV1"
      | "NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1"
      | "NarrativeStableBarrierRecoveryAttemptInternalV1"
      | "NarrativeStableBarrierRecoveryDispatchResultInternalV1"
      | "NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1"
      | "retargetPresentationStageInternalV1"
      | "synchronizeRecoveryGenerationInternalV1"
      | "issueSettleRecoveryAttemptInternalV1"
      | "dispatchSettleRecoveryInternalV1"
      | "readReplayRecoveryUnsupportedInternalV1"
      | "NarrativeStableBarrierStageRetargetResultInternalV1"
      | "NarrativeStableBarrierTerminalDispatchResultInternalV1"
      | "CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1"
      | "NarrativeStableBarrierAcknowledgmentControllerInternalV1"
      | "createNarrativeStableBarrierAcknowledgmentControllerInternalV1"
      | "CreateNarrativeStableSayRevealControllerInputInternalV1"
      | "NarrativeStableSayRevealControllerInternalV1"
      | "createNarrativeStableSayRevealControllerInternalV1"
      | "NarrativeStablePauseExpiryControllerAttemptInternalV1"
      | "NarrativeStablePauseExpiryDispatchResultInternalV1"
      | "NarrativeStablePauseExpiryControllerInternalV1"
      | "createNarrativeStablePauseExpiryControllerInternalV1"
      | "NarrativeStablePhysicalActionDispatchResultInternalV1"
      | "CreateNarrativeStablePhysicalActionAdmissionInputInternalV1"
      | "NarrativeStablePhysicalActionAdmissionInternalV1"
      | "createNarrativeStablePhysicalActionAdmissionInternalV1"
      | "ManagedSurfaceContractBoundActionRouteAuthorityInternalV1"
      | "CreateManagedSurfaceContractBoundActionBindingInputInternalV1"
      | "ManagedSurfaceAuthenticatedActionRouteResultInternalV1"
      | "ManagedSurfaceAuthenticatedActionContinuationInputInternalV1"
      | "ManagedSurfaceAuthenticatedActionRouteInternalV1"
      | "createManagedSurfaceContractBoundActionBindingInternalV1"
      | "claimManagedSurfaceAuthenticatedActionRouteInternalV1"
      | "PrepareManagedSurfaceContractBoundActionBindingInputInternalV1"
      | "ManagedSurfacePreparedContractBoundActionBindingInternalV1"
      | "prepareManagedSurfaceContractBoundActionBindingInternalV1"
      | "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1"
      | "ManagedSurfacePreparedInputBindingContractInternalV1"
      | "captureManagedSurfacePreparedInputBindingContractInternalV1"
      | "ManagedSurfaceStableReadinessCommitGuardInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1"
      | "claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1"
      | "claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1"
      | "ManagedSurfaceStableDirectActionTargetProofInternalV1"
      | "ManagedSurfaceStableReadyActiveTargetProofInternalV1"
      | "ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1"
      | "ManagedSurfaceStableActionInputCaptureResultInternalV1"
      | "ManagedSurfaceStableActionRouteAuthorityInternalV1"
      | "claimManagedSurfaceStableActionRouteAuthorityInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1"
      | "claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildCandidateInternalV1"
      | "ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1"
      | "deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1"
      | "ManagedSurfaceReducerCrossAxisParentProjectionInternalV1"
      | "DeriveManagedSurfaceReducerCrossAxisChildPreparationInputInternalV1"
      | "prepareExactParentTransientChildInternalV1"
      | "commitInternalV1"
      | "abortInternalV1"
      | "getBindingInternalV1"
      | "settleStableReadinessReadyWithCommitGuardInternalV1"
      | "settleStableReadinessFailedWithCommitGuardInternalV1"
      | "settleExactParentTransientChildReadinessReadyInternalV1"
      | "settleExactParentTransientChildReadinessFailedInternalV1"
      | "captureCurrentExactParentTransientChildInputInternalV1"
      | "captureReadyActiveStableTargetInternalV1"
      | "isCurrentReadyActiveStableTargetInternalV1"
      | "settleStableReadinessFailedInternalV1"
      | "settleStableReadinessReadyInternalV1";

    expectTypeOf<Extract<keyof typeof publicUiV1, DormantRuntimeSpellingV1>>()
      .toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof typeof internalUiV1, DormantRuntimeSpellingV1>>()
      .toEqualTypeOf<never>();
    expect(publicUiV1.SystemDialogHostV1).toBeTypeOf("function");
    expect(publicUiV1.SettingsLauncherV1).toBeTypeOf("function");
    expect(publicUiV1.SavesLauncherV1).toBeTypeOf("function");
    expect(publicUiV1.useSystemDialogControllerV1).toBeTypeOf("function");

    for (
      const removedExport of [
        "createSystemDialogSessionStoreV1",
        "SettingsDialogV1",
        "ActionConfirmationDialogV1",
        "SaveOverlayV1",
      ] as const
    ) {
      expect(publicUiV1).not.toHaveProperty(removedExport);
    }
    expect(publicUiV1).not.toHaveProperty(
      "createManagedSurfaceStableAdmissionAuthorityInternalV1",
    );
    expect(internalUiV1).not.toHaveProperty(
      "createManagedSurfaceStableAdmissionAuthorityInternalV1",
    );
    for (
      const dormantContractExport of [
        "managedSurfaceStableApplyPreconditionChecksInternalV1",
        "managedSurfaceStableReadinessDeltaContractInternalV1",
        "managedSurfaceStableReadinessFenceChecksInternalV1",
        "projectManagedSurfaceTopologyPolicyInternalV1",
        "deriveManagedSurfaceReducerTopologyProjectionInternalV1",
        "createManagedSurfaceRuntimeKernelInternalV1",
        "createManagedSurfaceCoordinatorRuntimeBundleInternalV1",
        "createManagedSurfaceStableCompositeStateInternalV1",
        "compareManagedSurfaceStableCompositePrivateProvenanceInternalV1",
        "reconcileManagedSurfaceStableRootReservationsInternalV1",
        "createManagedSurfaceCoordinatorFacadeInternalV1",
        "createManagedSurfaceRuntimeAuthorityInternalV1",
        "createManagedSurfaceRuntimeAuthorityBundleInternalV1",
        "createManagedSurfaceTransientRuntimeKernelInternalV1",
        "createManagedSurfaceStableCompositeRuntimeKernelInternalV1",
        "claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1",
        "createManagedSurfaceStableReadyRuntimeBindingInternalV1",
        "createManagedSurfaceStablePreparingRuntimeBindingInternalV1",
        "createManagedSurfaceStableGapRuntimeBindingInternalV1",
        "createManagedSurfaceStableRetainedRuntimeSubtreeInternalV1",
        "registerStablePublisherLeaseInternalV1",
        "captureAdmissionContextInternalV1",
        "applyStableAdmissionProposalInternalV1",
        "disposeStablePublisherLeaseInternalV1",
        "settleStableReadinessReadyInternalV1",
        "settleStableReadinessFailedInternalV1",
        "allocateManagedSurfaceStableRuntimeAttemptInternalV1",
        "projectManagedSurfaceStableRootReservationSnapshotInternalV1",
        "matchesManagedSurfaceStableAdmissionAuthorityConfigurationInternalV1",
        "matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1",
        "matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1",
        "createNarrativeManagedSurfaceFamilyContractInternalV1",
        "createNarrativeStablePublisherBridgeInternalV1",
        "NarrativeStableRequiredPortIdInternalV1",
        "NarrativeStableCandidatePreflightRejectionCodeInternalV1",
        "NarrativeStableCandidatePreflightResultInternalV1",
        "NarrativeStablePublisherBridgeResultInternalV1",
        "NarrativeStableSemanticResolutionRequestInternalV1",
        "NarrativeStableSemanticResolutionPortInternalV1",
        "NarrativeStableSayRevealGenerationPortInternalV1",
        "NarrativeStableVoiceReplayPortInternalV1",
        "NarrativeStableHistoryAvailabilityPortInternalV1",
        "NarrativeStablePlaybackModeInternalV1",
        "NarrativeStableCapturedSemanticResolutionPortInternalV1",
        "NarrativeStableCapturedVoiceReplayPortInternalV1",
        "NarrativeStableCapturedHistoryAvailabilityPortInternalV1",
        "NarrativeStableChoiceActionAttemptInternalV1",
        "NarrativeStableCustomActionAttemptInternalV1",
        "NarrativeStablePauseResumeActionAttemptInternalV1",
        "NarrativeStableSayActivationAttemptInternalV1",
        "NarrativeStableSayContentAutoAttemptInternalV1",
        "NarrativeStableSayContentAutoDispatchResultInternalV1",
        "NarrativeStableVoiceReplayActionAttemptInternalV1",
        "NarrativeStableVoiceReplayDispatchResultInternalV1",
        "issueVoiceReplayAttemptInternalV1",
        "NarrativeStablePlaybackModeToggleActionAttemptInternalV1",
        "NarrativeStablePlaybackModeToggleDispatchResultInternalV1",
        "readPlaybackModeInternalV1",
        "issuePlaybackModeToggleAttemptInternalV1",
        "NarrativeStableHistoryOpenActionAttemptInternalV1",
        "NarrativeStableHistoryOpenIntentInternalV1",
        "NarrativeStableHistoryOpenDispatchResultInternalV1",
        "NarrativeStableHistoryChildLifecycleInternalV1",
        "createNarrativeStableHistoryChildLifecycleInternalV1",
        "NarrativeStableHistoryChildPreparationInternalV1",
        "NarrativeStableHistoryChildPreparationResultInternalV1",
        "NarrativeStableRootPreparationInternalV1",
        "NarrativeStableReadinessEntryInternalV1",
        "NarrativeStableReadinessSnapshotInternalV1",
        "NarrativeStableHostLeaseInternalV1",
        "NarrativeStableSessionInternalV1",
        "createNarrativeStableSessionInternalV1",
        "NarrativeStableHistoryObservationPortInternalV1",
        "NarrativeStableCapturedHistoryObservationPortInternalV1",
        "NarrativeStableHistoryRenderObservationInternalV1",
        "NarrativeStableDialogueRendererPropsInternalV1",
        "NarrativeStableHistoryRendererPropsInternalV1",
        "NarrativeStableRendererPropsInternalV1",
        "NarrativeStableRendererComponentInternalV1",
        "NarrativeStableHostRenderKeyInternalV1",
        "NarrativeStableHostRenderPhaseInternalV1",
        "NarrativeStableHostRenderEntryInternalV1",
        "NarrativeStableHostRenderSnapshotInternalV1",
        "NarrativeStableHostRenderSourceInternalV1",
        "CreateNarrativeStableHostRuntimeInputInternalV1",
        "NarrativeStableHostRuntimeInternalV1",
        "createNarrativeStableHostRuntimeInternalV1",
        "NarrativeStableReadinessSettlementResultInternalV1",
        "NarrativeStableHostAttachmentInternalV1",
        "NarrativeStableHostReadyCommitInternalV1",
        "PrepareNarrativeStableHostReadyCommitInputInternalV1",
        "NarrativeStableHostReadyCommitPreparationResultInternalV1",
        "prepareNarrativeStableHostReadyCommitInternalV1",
        "NarrativeSurfaceHostPropsInternalV1",
        "NarrativeSurfaceHostInternalV1",
        "attachment",
        "renderSource",
        "kind",
        "completion",
        "pending",
        "visualConfig",
        "playerProfile",
        "textResolver",
        "quickMenuContribution",
        "history",
        "phase",
        "renderKey",
        "preparation",
        "initialFocusTargetId",
        "rendererComponent",
        "rendererProps",
        "parentRenderKey",
        "historyObservation",
        "entries",
        "session",
        "hostIdentity",
        "portalContainer",
        "inputRouter",
        "isGestureCurrent",
        "hostRuntime",
        "renderEntry",
        "portalShell",
        "initialFocusTarget",
        "readyCommit",
        "getReadinessSnapshotInternalV1",
        "getSnapshotInternalV1",
        "subscribeInternalV1",
        "getHistoryChildLifecycleInternalV1",
        "attachHostInternalV1",
        "isCurrentInternalV1",
        "settleRootReadinessReadyInternalV1",
        "settleRootReadinessFailedInternalV1",
        "settleHistoryReadinessReadyInternalV1",
        "settleHistoryReadinessFailedInternalV1",
        "releaseInternalV1",
        "redeemHistoryOpenIntentInternalV1",
        "readHistoryAvailabilityInternalV1",
        "issueHistoryOpenAttemptInternalV1",
        "StageAcknowledgedRunProofInternalV1",
        "StageAcknowledgedRunCommitGuardInternalV1",
        "StageAcknowledgedRunTerminalPortInternalV1",
        "StageAcknowledgedRunRetargetResultInternalV1",
        "StageAcknowledgedRunAuthorityInternalV1",
        "claimStageAcknowledgedRunAuthorityInternalV1",
        "StagePresentationGenerationProofInternalV1",
        "StagePresentationGenerationCaptureResultInternalV1",
        "StagePresentationGenerationRetargetResultInternalV1",
        "captureCurrentPresentationGenerationInternalV1",
        "retargetPresentationGenerationInternalV1",
        "NarrativeStableBarrierRecoveryGenerationInternalV1",
        "NarrativeStableBarrierRecoveryGenerationSynchronizationResultInternalV1",
        "NarrativeStableBarrierRecoveryAttemptInternalV1",
        "NarrativeStableBarrierRecoveryDispatchResultInternalV1",
        "NarrativeStableBarrierReplayRecoveryUnsupportedResultInternalV1",
        "retargetPresentationStageInternalV1",
        "synchronizeRecoveryGenerationInternalV1",
        "issueSettleRecoveryAttemptInternalV1",
        "dispatchSettleRecoveryInternalV1",
        "readReplayRecoveryUnsupportedInternalV1",
        "NarrativeStableBarrierStageRetargetResultInternalV1",
        "NarrativeStableBarrierTerminalDispatchResultInternalV1",
        "CreateNarrativeStableBarrierAcknowledgmentControllerInputInternalV1",
        "NarrativeStableBarrierAcknowledgmentControllerInternalV1",
        "createNarrativeStableBarrierAcknowledgmentControllerInternalV1",
        "CreateNarrativeStableSayRevealControllerInputInternalV1",
        "NarrativeStableSayRevealControllerInternalV1",
        "createNarrativeStableSayRevealControllerInternalV1",
        "NarrativeStablePauseExpiryControllerAttemptInternalV1",
        "NarrativeStablePauseExpiryDispatchResultInternalV1",
        "NarrativeStablePauseExpiryControllerInternalV1",
        "createNarrativeStablePauseExpiryControllerInternalV1",
        "NarrativeStablePhysicalActionDispatchResultInternalV1",
        "CreateNarrativeStablePhysicalActionAdmissionInputInternalV1",
        "NarrativeStablePhysicalActionAdmissionInternalV1",
        "createNarrativeStablePhysicalActionAdmissionInternalV1",
        "ManagedSurfaceContractBoundActionRouteAuthorityInternalV1",
        "CreateManagedSurfaceContractBoundActionBindingInputInternalV1",
        "ManagedSurfaceAuthenticatedActionRouteResultInternalV1",
        "ManagedSurfaceAuthenticatedActionContinuationInputInternalV1",
        "ManagedSurfaceAuthenticatedActionRouteInternalV1",
        "createManagedSurfaceContractBoundActionBindingInternalV1",
        "claimManagedSurfaceAuthenticatedActionRouteInternalV1",
        "PrepareManagedSurfaceContractBoundActionBindingInputInternalV1",
        "ManagedSurfacePreparedContractBoundActionBindingInternalV1",
        "prepareManagedSurfaceContractBoundActionBindingInternalV1",
        "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1",
        "ManagedSurfacePreparedInputBindingContractInternalV1",
        "captureManagedSurfacePreparedInputBindingContractInternalV1",
        "ManagedSurfaceStableReadinessCommitGuardInternalV1",
        "ManagedSurfaceStableExactParentTransientChildReadinessResultInternalV1",
        "ManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1",
        "claimManagedSurfaceStableExactParentTransientChildReadinessAuthorityInternalV1",
        "ManagedSurfaceStableExactParentTransientChildActionInputCaptureResultInternalV1",
        "ManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1",
        "claimManagedSurfaceStableExactParentTransientChildActionRouteAuthorityInternalV1",
        "ManagedSurfaceStableDirectActionTargetProofInternalV1",
        "ManagedSurfaceStableReadyActiveTargetProofInternalV1",
        "ManagedSurfaceStableReadyActiveTargetCaptureResultInternalV1",
        "ManagedSurfaceStableActionInputCaptureResultInternalV1",
        "ManagedSurfaceStableActionRouteAuthorityInternalV1",
        "claimManagedSurfaceStableActionRouteAuthorityInternalV1",
        "ManagedSurfaceStableExactParentTransientChildAuthorityInternalV1",
        "claimManagedSurfaceStableExactParentTransientChildAuthorityInternalV1",
        "ManagedSurfaceStableExactParentTransientChildCommitGuardInternalV1",
        "ManagedSurfaceStableExactParentTransientChildCandidateInternalV1",
        "ManagedSurfaceStableExactParentTransientChildPreparationResultInternalV1",
        "deriveManagedSurfaceReducerCrossAxisChildPreparationInternalV1",
        "ManagedSurfaceReducerCrossAxisParentProjectionInternalV1",
        "DeriveManagedSurfaceReducerCrossAxisChildPreparationInputInternalV1",
        "prepareExactParentTransientChildInternalV1",
        "commitInternalV1",
        "abortInternalV1",
        "getBindingInternalV1",
        "settleStableReadinessReadyWithCommitGuardInternalV1",
        "settleStableReadinessFailedWithCommitGuardInternalV1",
        "settleExactParentTransientChildReadinessReadyInternalV1",
        "settleExactParentTransientChildReadinessFailedInternalV1",
        "captureCurrentExactParentTransientChildInputInternalV1",
        "captureReadyActiveStableTargetInternalV1",
        "isCurrentReadyActiveStableTargetInternalV1",
        "createManagedSurfaceRuntimeAttemptIdentityInternalV1",
        "hasExpectedManagedSurfaceRuntimeAttemptIdentityInternalV1",
        "recordManagedSurfaceRuntimeAttemptSequenceInternalV1",
        "copyManagedSurfaceRuntimeAttemptSequenceInternalV1",
        "inspectManagedSurfaceRuntimeAttemptSequenceInternalV1",
      ] as const
    ) {
      expect(publicUiV1).not.toHaveProperty(dormantContractExport);
      expect(internalUiV1).not.toHaveProperty(dormantContractExport);
    }
  });

  it("exports the opaque facade, structured intents, and content configuration types", () => {
    type SessionKeysV1 = Extract<keyof SystemDialogSessionV1, string>;
    type CustomSavesHasRenderCallbackV1 = "render" extends keyof SystemDialogCustomSavesV1 ? true
      : false;

    expectTypeOf<SessionKeysV1>().toEqualTypeOf<
      "getSnapshot" | "openSettings" | "openSaves"
    >();
    expectTypeOf<SystemDialogSessionV1["getSnapshot"]>()
      .returns.toEqualTypeOf<SystemDialogSessionSnapshotV1>();
    expectTypeOf<SystemDialogControllerV1["openSettings"]>()
      .returns.toEqualTypeOf<SystemDialogOpenResultV1>();
    expectTypeOf<SystemDialogControllerV1["openSaves"]>()
      .returns.toEqualTypeOf<SystemDialogOpenResultV1>();
    expectTypeOf<SystemDialogHostPropsV1["session"]>().toEqualTypeOf<
      SystemDialogSessionV1
    >();
    expectTypeOf<SystemDialogCustomSavesV1["component"]>().toEqualTypeOf<
      SystemDialogCustomSavesComponentV1
    >();
    expectTypeOf<CustomSavesHasRenderCallbackV1>().toEqualTypeOf<false>();

    // These aliases are intentionally referenced as one package-root consumer
    // so declaration regressions fail the ordinary aggregate typecheck.
    expectTypeOf<
      | SaveOverlayGuardV1
      | SaveOverlayLabelsV1
      | SaveOverlayPortV1
      | SaveOverlaySlotNamesV1
      | SavesLauncherPropsV1
      | SettingsLauncherPropsV1
      | SystemDialogCustomSavesRenderIntentsV1
      | SystemDialogSaveGuardProjectionV1
      | SystemDialogSavesV1
      | SystemDialogSettingsV1
    >().not.toBeNever();
  });
});
