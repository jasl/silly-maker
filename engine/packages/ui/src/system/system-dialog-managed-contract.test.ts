// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createManagedSurfaceCoordinatorV1 } from "../managed-surfaces/managed-surface-coordinator.ts";
import {
  createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1,
  createSystemDialogContentConfigSnapshotInternalV1,
  createSystemDialogRootCandidateResolutionSnapshotInternalV1,
  normalizeSystemDialogConfirmationInvocationInternalV1,
  systemDialogManagedContractInternalV1,
  type SystemDialogConfirmationInvocationInternalV1,
  type SystemDialogContentConfigSnapshotInternalV1,
  type SystemDialogRequiredPortBindingInternalV1,
  type SystemDialogOpenResultV1,
  type SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";

function acceptSystemDialogSessionV1(_session: SystemDialogSessionV1): void {}
function acceptSystemDialogOpenResultV1(_result: SystemDialogOpenResultV1): void {}

interface FixtureContentConfigV1 {
  readonly variant: string;
  readonly metadata: Readonly<{ revision: number }>;
  readonly sections: readonly object[];
}

function snapshotFixtureContentConfigV1(input: {
  readonly variant: string;
  readonly metadata: { readonly revision: number };
  readonly sections: readonly object[];
}): SystemDialogContentConfigSnapshotInternalV1<FixtureContentConfigV1> {
  return createSystemDialogContentConfigSnapshotInternalV1(Object.freeze({
    variant: input.variant,
    metadata: Object.freeze({ revision: input.metadata.revision }),
    sections: Object.freeze([...input.sections]),
  }));
}

describe("dormant managed System dialog contract", () => {
  it("normalizes only the closed load, clear, and import confirmation invocation shapes", () => {
    const accepted = [
      { kind: "load", slotId: "auto.current" },
      { kind: "clear", slotId: "manual.99" },
      { kind: "import" },
    ] as const;

    expect(accepted.map(normalizeSystemDialogConfirmationInvocationInternalV1)).toEqual(accepted);
    for (const invocation of accepted) {
      const normalized = normalizeSystemDialogConfirmationInvocationInternalV1(invocation);
      expect(Object.isFrozen(normalized)).toBe(true);
      expectTypeOf(normalized).toMatchTypeOf<SystemDialogConfirmationInvocationInternalV1>();
    }

    for (
      const rejected of [
        { kind: "load" },
        { kind: "import", slotId: "auto.current" },
        { kind: "clear", slotId: "manual.0" },
        { kind: "load", slotId: "manual.100" },
        { kind: "save", slotId: "quick" },
        { kind: "load", slotId: "quick", extra: true },
        null,
      ]
    ) {
      expect(() => normalizeSystemDialogConfirmationInvocationInternalV1(rejected)).toThrowError(
        "ui.system_dialog_confirmation_invocation_invalid",
      );
    }

    const accessor = { kind: "import" } as Record<string, unknown>;
    Object.defineProperty(accessor, "kind", {
      configurable: true,
      enumerable: true,
      get: () => "import",
    });
    expect(() => normalizeSystemDialogConfirmationInvocationInternalV1(accessor)).toThrowError(
      "ui.system_dialog_confirmation_invocation_invalid",
    );
  });

  it("freezes one confirmation renderer and required-port resolution per fresh child", () => {
    const renderer = Object.freeze({ kind: "confirmation-renderer" });
    const port = Object.freeze({ kind: "confirmation-port" });
    const invocation = normalizeSystemDialogConfirmationInvocationInternalV1({
      kind: "clear",
      slotId: "manual.2",
    });
    const snapshot = createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1({
      invocation,
      rendererComponent: renderer,
      accessibleName: "Confirm clear",
      requiredPortBindings: [{ portId: "persistence.player-save", port }],
    });

    expect(snapshot).toEqual({
      invocation,
      definition: systemDialogManagedContractInternalV1.definitions.confirmation,
      rendererComponent: renderer,
      accessibleName: "Confirm clear",
      requiredPortBindings: [{ portId: "persistence.player-save", port }],
    });
    expect(snapshot.invocation).toEqual(invocation);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.requiredPortBindings)).toBe(true);
    expect(Object.isFrozen(snapshot.requiredPortBindings[0])).toBe(true);
  });

  it("freezes one owner, one root slot, and one exact Saves confirmation child", () => {
    const contract = systemDialogManagedContractInternalV1;

    expect(contract.rootRequests).toEqual(["settings", "saves"]);
    expect(contract.savesRendererVariants).toEqual(["standard", "custom"]);
    expect(contract.confirmationOperationKinds).toEqual(["load", "clear", "import"]);
    expect(contract.resolvedOwnerIds).toEqual(["surface-owner.system"]);
    expect(contract.resolvedSlotDescriptors).toEqual([
      {
        kind: "root",
        slotId: "surface-slot.system.root",
        cardinality: "single",
      },
      {
        kind: "child",
        parentDefinitionId: "surface.system.saves",
        slotId: "surface-slot.system.confirmation",
        cardinality: "single",
      },
    ]);
    expect(Object.keys(contract.definitions)).toEqual([
      "settings",
      "saves",
      "confirmation",
    ]);
    expect(contract.definitions.settings).toMatchObject({
      definitionId: "surface.system.settings",
      ownerId: "surface-owner.system",
      slotId: "surface-slot.system.root",
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "system" },
      dismissPolicy: { back: true, escape: true, backdrop: true, routedCancel: true },
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.saves).toMatchObject({
      definitionId: "surface.system.saves",
      slotId: "surface-slot.system.root",
      placement: "root",
    });
    expect(contract.definitions.confirmation).toMatchObject({
      definitionId: "surface.system.action-confirmation",
      slotId: "surface-slot.system.confirmation",
      placement: "child",
    });
    for (const definition of Object.values(contract.definitions)) {
      expect(definition).toMatchObject({
        ownerId: "surface-owner.system",
        modality: "blocking",
        inputPolicy: { kind: "managed", inputContextId: "system" },
        dismissPolicy: { back: true, escape: true, backdrop: true, routedCancel: true },
        focusPolicy: { kind: "owns_focus", trap: true, restore: "opener" },
        navigationPolicy: { kind: "close" },
        readiness: {
          initialOpen: "blocking_fallback",
          primaryReplacement: "retain_current",
          childOpen: "blocking_fallback",
        },
      });
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.inputPolicy)).toBe(true);
      expect(Object.isFrozen(definition.dismissPolicy)).toBe(true);
      expect(Object.isFrozen(definition.focusPolicy)).toBe(true);
      expect(Object.isFrozen(definition.actionIds)).toBe(true);
      expect(Object.isFrozen(definition.readiness)).toBe(true);
    }
    expect(Reflect.ownKeys(contract.definitions.settings)).not.toContain(
      "sourcePublicationRevision",
    );
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.definitions)).toBe(true);
    expect(Object.isFrozen(contract.definitions.settings)).toBe(true);
    expect(Object.isFrozen(contract.resolvedSlotDescriptors)).toBe(true);
    expect(Object.isFrozen(contract.resolvedSlotDescriptors[0])).toBe(true);
  });

  it("rejects confirmation under Settings before allocation but admits it under Saves", () => {
    const contract = systemDialogManagedContractInternalV1;
    const settingsCoordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      resolvedOwnerIds: contract.resolvedOwnerIds,
      resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    const settingsPreparation = settingsCoordinator.openTransientPrimary({
      definition: contract.definitions.settings,
      semanticOccurrenceId: null,
    });
    const settings = settingsPreparation.readiness!.ready().handle!;
    const beforeInvalid = settingsCoordinator.getSnapshot();
    let invalidNotifications = 0;
    settingsCoordinator.subscribe(() => invalidNotifications += 1);

    const invalid = settingsCoordinator.pushTransientChild({
      definition: contract.definitions.confirmation,
      semanticOccurrenceId: null,
      parent: settings,
    });

    expect(invalid.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.slot_not_resolved",
    });
    expect(settingsCoordinator.getSnapshot()).toBe(beforeInvalid);
    expect(invalidNotifications).toBe(0);
    const replacement = settingsCoordinator.replaceTransientPrimary({
      definition: contract.definitions.saves,
      semanticOccurrenceId: null,
      expected: settings,
    });
    expect(replacement.receipt.surfaceInstanceId).toBe("surface-instance.e7.n2");

    const savesCoordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(8),
      resolvedOwnerIds: contract.resolvedOwnerIds,
      resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    const savesPreparation = savesCoordinator.openTransientPrimary({
      definition: contract.definitions.saves,
      semanticOccurrenceId: null,
    });
    const saves = savesPreparation.readiness!.ready().handle!;
    const confirmation = savesCoordinator.pushTransientChild({
      definition: contract.definitions.confirmation,
      semanticOccurrenceId: null,
      parent: saves,
    });
    expect(confirmation.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: "surface-instance.e8.n2",
    });
  });

  it("freezes the target public result union without exposing lifecycle evidence", () => {
    type ResultKeysV1<T> = T extends unknown ? keyof T : never;
    type ExactTargetResultV1 =
      | {
        readonly kind: "preparing";
        readonly code: "system_dialog.preparation_started";
      }
      | {
        readonly kind: "applied";
        readonly code: "system_dialog.pending_replacement_cancelled";
      }
      | {
        readonly kind: "unchanged";
        readonly code: "system_dialog.already_requested";
      }
      | {
        readonly kind: "rejected";
        readonly code:
          | "system_dialog.renderer_unavailable"
          | "system_dialog.renderer_missing"
          | "system_dialog.required_port_missing"
          | "system_dialog.disposed";
        readonly portId?: string;
      }
      | {
        readonly kind: "faulted";
        readonly code:
          | "system_dialog.renderer_faulted"
          | "system_dialog.transition_faulted";
      };

    expectTypeOf<SystemDialogOpenResultV1>().toEqualTypeOf<ExactTargetResultV1>();
    expectTypeOf<ResultKeysV1<SystemDialogOpenResultV1>>().toEqualTypeOf<
      "kind" | "code" | "portId"
    >();
    const examples = [
      { kind: "preparing", code: "system_dialog.preparation_started" },
      { kind: "applied", code: "system_dialog.pending_replacement_cancelled" },
      { kind: "unchanged", code: "system_dialog.already_requested" },
      { kind: "rejected", code: "system_dialog.renderer_unavailable" },
      { kind: "rejected", code: "system_dialog.renderer_missing" },
      {
        kind: "rejected",
        code: "system_dialog.required_port_missing",
        portId: "persistence.player-save",
      },
      { kind: "rejected", code: "system_dialog.disposed" },
      { kind: "faulted", code: "system_dialog.renderer_faulted" },
      { kind: "faulted", code: "system_dialog.transition_faulted" },
    ] as const satisfies readonly SystemDialogOpenResultV1[];

    for (const result of examples) {
      expect(Object.keys(result).every((key) => ["kind", "code", "portId"].includes(key))).toBe(
        true,
      );
    }

    // @ts-expect-error The composition-created session cannot be structurally forged.
    acceptSystemDialogSessionV1({});
    acceptSystemDialogOpenResultV1({
      kind: "unchanged",
      // @ts-expect-error The accepted idempotent code covers active and pending requests.
      code: "system_dialog.already_current",
    });
    acceptSystemDialogOpenResultV1({
      kind: "preparing",
      code: "system_dialog.preparation_started",
      // @ts-expect-error Ordinary results cannot expose managed instance evidence.
      surfaceInstanceId: "surface-instance.e1.n1",
    });
  });

  it("declares one logical Host lease and per-root-candidate resolution snapshots", () => {
    expect(systemDialogManagedContractInternalV1.host).toEqual({
      logicalLeaseCardinality: "single",
      portalCardinality: "single",
      catalogAuthorityCardinality: "single",
      conflictCode: "ui.system_dialog_host_lease_conflict",
      candidateResolution: "snapshot_per_candidate",
    });
    expect(Object.isFrozen(systemDialogManagedContractInternalV1.host)).toBe(true);

    const rendererR1 = (): null => null;
    const rendererR2 = (): null => null;
    const portR1 = Object.freeze({ kind: "port-r1" });
    const portR2 = Object.freeze({ kind: "port-r2" });
    const reactNodeR1 = { kind: "react-node-r1" };
    const configSourceR1 = {
      variant: "standard",
      metadata: { revision: 1 },
      sections: [reactNodeR1],
    };
    const configR1 = snapshotFixtureContentConfigV1(configSourceR1);
    const configR2 = snapshotFixtureContentConfigV1({
      variant: "custom",
      metadata: { revision: 2 },
      sections: [],
    });
    const requiredPortBindings: SystemDialogRequiredPortBindingInternalV1[] = [{
      portId: "persistence.player-save",
      port: portR1,
    }];
    const mutableCatalogEntry: {
      rootRequest: "saves";
      rendererComponent: () => null;
      accessibleName: string;
      requiredPortBindings: SystemDialogRequiredPortBindingInternalV1[];
      contentConfigSnapshot: SystemDialogContentConfigSnapshotInternalV1<
        FixtureContentConfigV1
      >;
    } = {
      rootRequest: "saves" as const,
      rendererComponent: rendererR1,
      accessibleName: "Saves",
      requiredPortBindings,
      contentConfigSnapshot: configR1,
    };
    const snapshotR1 = createSystemDialogRootCandidateResolutionSnapshotInternalV1(
      mutableCatalogEntry,
    );
    configSourceR1.metadata.revision = 99;
    configSourceR1.sections.push({ kind: "later-react-node" });

    mutableCatalogEntry.rendererComponent = rendererR2;
    mutableCatalogEntry.accessibleName = "Saves R2";
    mutableCatalogEntry.requiredPortBindings = [
      { portId: "persistence.player-save", port: portR1 },
      { portId: "persistence.player-import", port: portR2 },
    ];
    mutableCatalogEntry.contentConfigSnapshot = configR2;
    const snapshotR2 = createSystemDialogRootCandidateResolutionSnapshotInternalV1(
      mutableCatalogEntry,
    );

    expect(snapshotR1.definition).toBe(
      systemDialogManagedContractInternalV1.definitions.saves,
    );
    expect(snapshotR1.rendererComponent).toBe(rendererR1);
    expect(snapshotR1.accessibleName).toBe("Saves");
    expect(snapshotR1.requiredPortBindings).toEqual([
      { portId: "persistence.player-save", port: portR1 },
    ]);
    expect(snapshotR1.contentConfigSnapshot).toBe(configR1);
    expect(snapshotR1.contentConfigSnapshot.value.metadata.revision).toBe(1);
    expect(snapshotR1.contentConfigSnapshot.value.sections).toEqual([reactNodeR1]);
    expect(snapshotR1.contentConfigSnapshot.value.sections[0]).toBe(reactNodeR1);
    expect(snapshotR2.rendererComponent).toBe(rendererR2);
    expect(snapshotR2.accessibleName).toBe("Saves R2");
    expect(snapshotR2.requiredPortBindings).toHaveLength(2);
    expect(snapshotR2.contentConfigSnapshot).toBe(configR2);
    expect(Object.isFrozen(snapshotR1)).toBe(true);
    expect(Object.isFrozen(snapshotR1.requiredPortBindings)).toBe(true);
    expect(Object.isFrozen(snapshotR1.requiredPortBindings[0])).toBe(true);

    expect(() =>
      createSystemDialogRootCandidateResolutionSnapshotInternalV1({
        ...mutableCatalogEntry,
        // @ts-expect-error The canonical definition is derived from the normalized root request.
        definition: {
          ...systemDialogManagedContractInternalV1.definitions.saves,
          ownerId: "surface-owner.attacker",
        },
      })
    ).toThrowError("ui.system_dialog_candidate_resolution_invalid");
    expect(() =>
      createSystemDialogContentConfigSnapshotInternalV1({
        variant: "custom",
      })
    ).toThrowError("ui.system_dialog_content_config_snapshot_invalid");
    expect(() =>
      createSystemDialogRootCandidateResolutionSnapshotInternalV1({
        ...mutableCatalogEntry,
        get accessibleName() {
          return "Accessor Saves";
        },
      })
    ).toThrowError("ui.system_dialog_candidate_resolution_invalid");
  });
});
