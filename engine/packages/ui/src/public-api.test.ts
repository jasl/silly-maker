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
// @ts-expect-error Apply-precondition row types stay source-relative.
import type { ManagedSurfaceStableApplyPreconditionCheckRowInternalV1 as ForbiddenPublicStableApplyCheckV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable apply rows.
import type { ManagedSurfaceStableApplyPreconditionCheckRowInternalV1 as ForbiddenInternalStableApplyCheckV1 } from "./internal.ts";
// @ts-expect-error Readiness-fence row types stay source-relative.
import type { ManagedSurfaceStableReadinessFenceCheckRowInternalV1 as ForbiddenPublicStableReadinessCheckV1 } from "./index.ts";
// @ts-expect-error The Host-only internal barrel does not expose stable readiness rows.
import type { ManagedSurfaceStableReadinessFenceCheckRowInternalV1 as ForbiddenInternalStableReadinessCheckV1 } from "./internal.ts";
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
        "managedSurfaceStableReadinessFenceChecksInternalV1",
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
