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
/* oxlint-enable no-unused-vars */

describe("@sillymaker/ui public managed System surface", () => {
  it("keeps the composition-backed Host and launchers without standalone lifecycle hosts", () => {
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
        "createManagedSurfaceRuntimeKernelInternalV1",
        "createManagedSurfaceCoordinatorRuntimeBundleInternalV1",
        "createManagedSurfaceStableCompositeStateInternalV1",
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
        "allocateManagedSurfaceStableRuntimeAttemptInternalV1",
        "projectManagedSurfaceStableRootReservationSnapshotInternalV1",
        "matchesManagedSurfaceStableAdmissionAuthorityConfigurationInternalV1",
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
