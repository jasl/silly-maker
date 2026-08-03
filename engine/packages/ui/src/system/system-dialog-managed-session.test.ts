// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { createManagedSurfaceCompositionRuntimeInternalV1 } from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type { ManagedSurfacePublicationV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import {
  createSystemDialogContentConfigSnapshotInternalV1,
  systemDialogManagedContractInternalV1,
} from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogRootCatalogSnapshotInternalV1,
  snapshotSystemDialogSavesContentConfigInternalV1,
  snapshotSystemDialogSettingsContentConfigInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";

const rendererSettingsR1 = Object.freeze({ kind: "settings-r1" });
const rendererSettingsR2 = Object.freeze({ kind: "settings-r2" });
const rendererSavesR1 = Object.freeze({ kind: "saves-r1" });
const savePortV1 = Object.freeze({ kind: "save-port" });

function revisionDeltaV1(
  before: ManagedSurfacePublicationV1,
  after: ManagedSurfacePublicationV1,
): readonly [number, number] {
  return Object.freeze([
    after.publicationRevision - before.publicationRevision,
    after.topologyRevision - before.topologyRevision,
  ]);
}

function catalogV1(input: {
  readonly settingsRenderer?: object;
  readonly savesRenderer?: object;
  readonly settingsName?: string;
  readonly savesName?: string;
  readonly requiredSavePort?: boolean;
  readonly includeSavePort?: boolean;
} = {}): SystemDialogRootCatalogInternalV1 {
  return createSystemDialogRootCatalogSnapshotInternalV1({
    entries: Object.freeze([
      Object.freeze({
        rootRequest: "settings" as const,
        rendererComponent: input.settingsRenderer ?? rendererSettingsR1,
        accessibleName: input.settingsName ?? "Settings R1",
        requiredPortIds: Object.freeze([]),
        contentConfig: {
          title: "Settings",
          closeLabel: "Close",
          emptyText: "Empty",
          sections: Object.freeze([]),
        },
      }),
      Object.freeze({
        rootRequest: "saves" as const,
        rendererComponent: input.savesRenderer ?? rendererSavesR1,
        accessibleName: input.savesName ?? "Saves R1",
        requiredPortIds: Object.freeze(
          input.requiredSavePort === false ? [] : ["persistence.player-save"],
        ),
        contentConfig: {
          variant: "custom" as const,
          accessibleName: input.savesName ?? "Saves R1",
          component: input.savesRenderer ?? rendererSavesR1,
        },
      }),
    ]),
    portBindings: Object.freeze(
      input.includeSavePort === false
        ? []
        : [Object.freeze({ portId: "persistence.player-save", port: savePortV1 })],
    ),
  });
}

function sessionFixtureV1(
  catalog: SystemDialogRootCatalogInternalV1 | null,
): {
  readonly session: SystemDialogManagedSessionInternalV1;
  readonly subscribeCoordinator: (listener: () => void) => () => void;
  readonly dispose: () => void;
} {
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: Object.freeze({
      allocate: () => parseNonNegativeSafeInteger(31),
    }),
    inputRouter: createInputRouterV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    }),
  });
  const session = createSystemDialogManagedSessionInternalV1({
    runtime: runtime.getCurrent(),
    catalog,
  });
  return Object.freeze({
    session,
    subscribeCoordinator: runtime.getCurrent().coordinator.subscribe,
    dispose: () => {
      session.disposeInternalV1();
      runtime.dispose();
    },
  });
}

describe("dormant managed System dialog session", () => {
  it("notifies session observers only after the candidate record is installed", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const observedCandidateIds: string[][] = [];
    const unsubscribe = fixture.session.subscribeInternalV1(() => {
      observedCandidateIds.push(
        fixture.session.getRootCandidateRecordsInternalV1().map((record) =>
          record.surfaceInstanceId
        ),
      );
    });

    expect(fixture.session.openRootInternalV1("settings")).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(observedCandidateIds).toEqual([["surface-instance.e31.n1"]]);

    expect(fixture.session.openRootInternalV1("settings")).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    expect(observedCandidateIds).toHaveLength(1);
    unsubscribe();
    fixture.dispose();
  });

  it("applies exact root precedence without resolver work or mutation on short circuits", () => {
    const fixture = sessionFixtureV1(null);
    const { session } = fixture;
    let notifications = 0;
    const unsubscribe = fixture.subscribeCoordinator(() => notifications += 1);
    const initial = session.getManagedSnapshotInternalV1();

    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(initial);
    expect(notifications).toBe(0);

    const baseCatalog = catalogV1();
    const resolveRoot = vi.fn(baseCatalog.resolveRoot);
    const resolvePort = vi.fn(baseCatalog.resolvePort);
    session.setCatalogInternalV1(Object.freeze({ resolveRoot, resolvePort }));
    const beforeInitial = session.getManagedSnapshotInternalV1();
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    const afterInitial = session.getManagedSnapshotInternalV1();
    expect(revisionDeltaV1(beforeInitial, afterInitial)).toEqual([1, 1]);
    expect(afterInitial.orderedInstances[0]?.surfaceInstanceId).toBe("surface-instance.e31.n1");
    expect(resolveRoot).toHaveBeenCalledTimes(1);
    expect(notifications).toBe(1);

    resolveRoot.mockClear();
    resolvePort.mockClear();
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterInitial);
    expect(resolveRoot).not.toHaveBeenCalled();
    expect(resolvePort).not.toHaveBeenCalled();
    expect(notifications).toBe(1);

    session.setCatalogInternalV1(null);
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterInitial);
    expect(notifications).toBe(1);

    session.setCatalogInternalV1(Object.freeze({ resolveRoot, resolvePort }));
    session.readyCandidateInternalV1(afterInitial.orderedInstances[0]!.surfaceInstanceId);
    const active = session.getManagedSnapshotInternalV1();
    expect(notifications).toBe(2);
    resolveRoot.mockClear();
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(active);
    expect(resolveRoot).not.toHaveBeenCalled();
    expect(notifications).toBe(2);

    expect(session.openRootInternalV1("saves")).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    const replacement = session.getManagedSnapshotInternalV1();
    expect(revisionDeltaV1(active, replacement)).toEqual([1, 0]);
    expect(replacement.orderedInstances.at(-1)?.surfaceInstanceId).toBe(
      "surface-instance.e31.n2",
    );
    expect(notifications).toBe(3);

    resolveRoot.mockClear();
    resolvePort.mockClear();
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "applied",
      code: "system_dialog.pending_replacement_cancelled",
    });
    const cancelled = session.getManagedSnapshotInternalV1();
    expect(revisionDeltaV1(replacement, cancelled)).toEqual([1, 0]);
    expect(resolveRoot).not.toHaveBeenCalled();
    expect(resolvePort).not.toHaveBeenCalled();
    expect(cancelled.orderedInstances).toHaveLength(1);
    expect(cancelled.orderedInstances[0]?.surfaceInstanceId).toBe(
      active.orderedInstances[0]?.surfaceInstanceId,
    );
    expect(notifications).toBe(4);
    unsubscribe();
    fixture.dispose();
  });

  it("keeps resolver faults, missing renderers, and missing ports mutation-free", () => {
    const fixture = sessionFixtureV1(null);
    const { session } = fixture;
    const before = session.getManagedSnapshotInternalV1();
    session.setCatalogInternalV1(Object.freeze({
      resolveRoot: () => {
        throw new Error("synthetic resolver fault");
      },
      resolvePort: () => null,
    }));
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "faulted",
      code: "system_dialog.renderer_faulted",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);

    session.setCatalogInternalV1(Object.freeze({
      resolveRoot: () => null,
      resolvePort: () => null,
    }));
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_missing",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);

    session.setCatalogInternalV1(catalogV1({ includeSavePort: false }));
    expect(session.openRootInternalV1("saves")).toEqual({
      kind: "rejected",
      code: "system_dialog.required_port_missing",
      portId: "persistence.player-save",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    fixture.dispose();
  });

  it("makes the catalog apply the root-specific config copier", () => {
    const titleGetter = vi.fn(() => "Settings");
    const accessorConfig = {
      closeLabel: "Close",
      emptyText: "Empty",
      sections: Object.freeze([]),
    } as Record<string, unknown>;
    Object.defineProperty(accessorConfig, "title", { get: titleGetter, enumerable: true });

    expect(() =>
      createSystemDialogRootCatalogSnapshotInternalV1({
        entries: Object.freeze([
          Object.freeze({
            rootRequest: "settings" as const,
            rendererComponent: rendererSettingsR1,
            accessibleName: "Settings",
            requiredPortIds: Object.freeze([]),
            contentConfig: accessorConfig as never,
          }),
        ]),
        portBindings: Object.freeze([]),
      })
    ).toThrowError("ui.system_dialog_catalog_invalid");
    expect(titleGetter).not.toHaveBeenCalled();

    const genericToken = createSystemDialogContentConfigSnapshotInternalV1(
      Object.freeze({ title: "Bypass" }),
    );
    expect(() =>
      createSystemDialogRootCatalogSnapshotInternalV1({
        entries: Object.freeze([
          Object.freeze({
            rootRequest: "settings" as const,
            rendererComponent: rendererSettingsR1,
            accessibleName: "Settings",
            requiredPortIds: Object.freeze([]),
            contentConfig: genericToken as never,
          }),
        ]),
        portBindings: Object.freeze([]),
      })
    ).toThrowError("ui.system_dialog_catalog_invalid");

    const fixture = sessionFixtureV1(null);
    const before = fixture.session.getManagedSnapshotInternalV1();
    fixture.session.setCatalogInternalV1(Object.freeze({
      resolveRoot: () =>
        Object.freeze({
          rootRequest: "settings" as const,
          rendererComponent: rendererSettingsR1,
          accessibleName: "Settings",
          requiredPortIds: Object.freeze([]),
          contentConfigSnapshot: genericToken,
        }),
      resolvePort: () => null,
    }));
    expect(fixture.session.openRootInternalV1("settings")).toEqual({
      kind: "faulted",
      code: "system_dialog.renderer_faulted",
    });
    expect(fixture.session.getManagedSnapshotInternalV1()).toBe(before);
    fixture.dispose();
  });

  it("uses fresh identities for initial supersede and preserves R1 candidate snapshots", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    let notifications = 0;
    const unsubscribe = fixture.subscribeCoordinator(() => notifications += 1);
    expect(session.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    const firstRecord = session.getRootCandidateRecordsInternalV1()[0]!;
    const firstPublication = session.getManagedSnapshotInternalV1();

    session.setCatalogInternalV1(catalogV1({
      settingsRenderer: rendererSettingsR2,
      settingsName: "Settings R2",
      savesName: "Saves R2",
    }));
    expect(session.openRootInternalV1("saves")).toMatchObject({ kind: "preparing" });
    const secondPublication = session.getManagedSnapshotInternalV1();
    const secondRecord = session.getRootCandidateRecordsInternalV1()[0]!;

    expect(revisionDeltaV1(firstPublication, secondPublication)).toEqual([1, 1]);
    expect(notifications).toBe(2);
    expect(secondRecord.surfaceInstanceId).toBe("surface-instance.e31.n2");
    expect(firstRecord.resolution.rendererComponent).toBe(rendererSettingsR1);
    expect(firstRecord.resolution.accessibleName).toBe("Settings R1");
    expect(firstRecord.resolution.contentConfigSnapshot.value).toEqual({
      title: "Settings",
      closeLabel: "Close",
      emptyText: "Empty",
      sections: [],
    });
    expect(firstRecord.readiness.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
    expect(firstRecord.readiness.fail()).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(secondPublication);
    expect(notifications).toBe(2);
    expect(secondRecord.resolution.accessibleName).toBe("Saves R2");
    expect(secondRecord.resolution.contentConfigSnapshot.value).toEqual({
      variant: "custom",
      accessibleName: "Saves R2",
      component: rendererSavesR1,
    });
    expect(secondRecord.resolution.requiredPortBindings).toEqual([
      { portId: "persistence.player-save", port: savePortV1 },
    ]);
    expect(rendererSettingsR1).toEqual({ kind: "settings-r1" });
    unsubscribe();
    fixture.dispose();
  });

  it("copies Settings known fields while retaining opaque React content identity", () => {
    const reactNode = createElement("span", null, "R1");
    const source = {
      title: "Settings R1",
      closeLabel: "Close R1",
      emptyText: "Empty R1",
      sections: [reactNode],
    };
    const snapshot = snapshotSystemDialogSettingsContentConfigInternalV1(source);
    source.title = "Settings R2";
    source.sections.push(createElement("span", null, "R2"));

    expect(snapshot.value).toEqual({
      title: "Settings R1",
      closeLabel: "Close R1",
      emptyText: "Empty R1",
      sections: [reactNode],
    });
    expect(snapshot.value.sections[0]).toBe(reactNode);
    expect(Object.isFrozen(snapshot.value)).toBe(true);
    expect(Object.isFrozen(snapshot.value.sections)).toBe(true);
  });

  it("copies every standard Saves label field but retains port, guard, and callback identity", () => {
    const formatter = (value: string | number) => String(value);
    const port = Object.freeze({ kind: "port" });
    const evaluateGuard = () => Object.freeze({ allowed: true });
    const source = {
      variant: "standard" as const,
      port: port as never,
      closeLabel: "Close R1",
      evaluateGuard,
      labels: {
        accessibleName: "Saves R1",
        title: "Title R1",
        storageLoading: "loading",
        storageReady: "ready",
        storageBusy: "busy",
        storageUnavailable: "unavailable",
        slotsUnavailable: "slots unavailable",
        safelySaved: formatter,
        lastFailure: formatter,
        slotNames: {
          "auto.current": "current",
          "auto.previous": "previous",
          quick: "quick",
          manualSlot: formatter,
        },
        slotHealth: {
          empty: "empty",
          valid: "valid",
          invalid: "invalid",
          recovery_candidate: "recovery",
          unavailable: "unavailable",
        },
        quickSave: "quick save",
        manualSave: "manual save",
        savedAtText: formatter,
        importSave: "import",
        exportCurrentSave: "export current",
        loadSlot: formatter,
        clearSlot: formatter,
        exportSlot: formatter,
        confirmation: {
          loadTitle: formatter,
          loadDescription: formatter,
          clearTitle: formatter,
          clearDescription: formatter,
          importTitle: "import title",
          importDescription: "import description",
          confirmLabel: "confirm",
          cancelLabel: "cancel",
          pendingText: "pending",
          completedText: "completed",
          failedText: "failed",
        },
        operation: {
          saving: formatter,
          loading: formatter,
          clearing: formatter,
          importing: "importing",
          exporting: formatter,
          exportingCurrent: "exporting current",
          saved: formatter,
          cleared: formatter,
          loadedExact: "loaded exact",
          loadedAdopted: "loaded adopted",
          importedExact: "imported exact",
          importedAdopted: "imported adopted",
          importCancelled: "import cancelled",
          importFileRejected: {
            too_large: "too large",
            unsupported_type: "unsupported",
          },
          exported: formatter,
          exportedCurrent: "exported current",
          rejected: {
            busy: "busy",
            unavailable: "unavailable",
            empty_slot: "empty",
            conflict: "conflict",
            invalid_record: "invalid record",
            invalid_note: "invalid note",
            lineage_limit: "lineage limit",
            migration_unavailable: "migration unavailable",
            migration_rejected: "migration rejected",
            incompatible: "incompatible",
          },
          exportRejected: {
            unavailable: "unavailable",
            empty_slot: "empty",
            conflict: "conflict",
            invalid_record: "invalid record",
          },
          faulted: formatter,
          unexpectedFailure: "unexpected",
        },
      },
    };
    const snapshot = snapshotSystemDialogSavesContentConfigInternalV1(source);
    source.closeLabel = "Close R2";
    source.labels.title = "Title R2";
    source.labels.slotNames.quick = "quick R2";
    source.labels.operation.rejected.busy = "busy R2";

    expect(snapshot.value.variant).toBe("standard");
    if (snapshot.value.variant !== "standard") throw new TypeError();
    expect(snapshot.value.port).toBe(port);
    expect(snapshot.value.evaluateGuard).toBe(evaluateGuard);
    expect(snapshot.value.closeLabel).toBe("Close R1");
    expect(snapshot.value.labels.title).toBe("Title R1");
    expect(snapshot.value.labels.slotNames.quick).toBe("quick");
    expect(snapshot.value.labels.operation.rejected.busy).toBe("busy");
    expect(snapshot.value.labels.savedAtText).toBe(formatter);
    expect(Object.isFrozen(snapshot.value.labels.operation.rejected)).toBe(true);
  });

  it("captures custom Saves as a component identity without invoking it", () => {
    const component = vi.fn(() => null);
    const snapshot = snapshotSystemDialogSavesContentConfigInternalV1({
      variant: "custom",
      accessibleName: "Custom Saves",
      component,
    });

    expect(snapshot.value).toEqual({
      variant: "custom",
      accessibleName: "Custom Saves",
      component,
    });
    if (snapshot.value.variant !== "custom") throw new TypeError();
    expect(snapshot.value.component).toBe(component);
    expect(component).not.toHaveBeenCalled();
  });
});
