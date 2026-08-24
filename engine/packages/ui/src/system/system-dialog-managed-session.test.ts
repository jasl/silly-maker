// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { createManagedSurfaceCompositionRuntimeInternalV1 } from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type { ManagedSurfacePublicationV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import {
  createSystemDialogContentConfigSnapshotInternalV1,
  systemDialogManagedContractInternalV1,
  type SystemDialogConfirmationInvocationInternalV1,
  type SystemDialogRootRequestInternalV1,
} from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
  createSystemDialogRootCatalogSnapshotInternalV1,
  snapshotSystemDialogSavesContentConfigInternalV1,
  snapshotSystemDialogSettingsContentConfigInternalV1,
  type SystemDialogConfirmationOperationOutcomeInternalV1,
  type SystemDialogHostAttachmentInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";

const rendererSettingsR1 = { kind: "settings-r1" };
const rendererSettingsR2 = { kind: "settings-r2" };
const rendererSavesR1 = { kind: "saves-r1" };
const rendererConfirmationR1 = { kind: "confirmation-r1" };
const rendererConfirmationR2 = { kind: "confirmation-r2" };
const savePortV1 = { kind: "save-port" };
const confirmationPortV1 = { kind: "confirmation-port" };

function revisionDeltaV1(
  before: ManagedSurfacePublicationV1,
  after: ManagedSurfacePublicationV1,
): readonly [number, number] {
  return [
    after.publicationRevision - before.publicationRevision,
    after.topologyRevision - before.topologyRevision,
  ];
}

function catalogV1(input: {
  readonly settingsRenderer?: object;
  readonly savesRenderer?: object;
  readonly settingsName?: string;
  readonly savesName?: string;
  readonly requiredSavePort?: boolean;
  readonly includeSavePort?: boolean;
  readonly includeConfirmation?: boolean;
  readonly confirmationRenderer?: object;
  readonly includeConfirmationPort?: boolean;
} = {}): SystemDialogRootCatalogInternalV1 {
  return createSystemDialogRootCatalogSnapshotInternalV1({
    entries: [
      {
        rootRequest: "settings" as const,
        rendererComponent: input.settingsRenderer ?? rendererSettingsR1,
        accessibleName: input.settingsName ?? "Settings R1",
        requiredPortIds: [],
        contentConfig: {
          title: "Settings",
          closeLabel: "Close",
          emptyText: "Empty",
          sections: [],
        },
      },
      {
        rootRequest: "saves" as const,
        rendererComponent: input.savesRenderer ?? rendererSavesR1,
        accessibleName: input.savesName ?? "Saves R1",
        requiredPortIds: input.requiredSavePort === false ? [] : ["persistence.player-save"],
        contentConfig: {
          variant: "custom" as const,
          accessibleName: input.savesName ?? "Saves R1",
          component: input.savesRenderer ?? rendererSavesR1,
        },
      },
    ],
    portBindings: [
      ...(input.includeSavePort === false
        ? []
        : [{ portId: "persistence.player-save", port: savePortV1 }]),
      ...(input.includeConfirmationPort === false
        ? []
        : [{ portId: "system.confirmation", port: confirmationPortV1 }]),
    ],
    confirmationEntry: input.includeConfirmation === false ? null : ({
      rendererComponent: input.confirmationRenderer ?? rendererConfirmationR1,
      accessibleName: "Action confirmation",
      requiredPortIds: ["system.confirmation"],
    }),
  });
}

function sessionFixtureV1(
  catalog: SystemDialogRootCatalogInternalV1 | null,
  reportFailure?: (code: string, error: unknown) => void,
): {
  readonly session: SystemDialogManagedSessionInternalV1;
  readonly updateCatalog: (catalog: SystemDialogRootCatalogInternalV1 | null) => void;
  readonly readyCandidate: SystemDialogHostAttachmentInternalV1["readyCandidateInternalV1"];
  readonly subscribeCoordinator: (listener: () => void) => () => void;
  readonly dismissCurrentFallback: (surfaceInstanceId: string) => void;
  readonly releaseHost: () => void;
  readonly rotate: (kind: "load_rebootstrap" | "import_rebootstrap") => void;
  readonly dispose: () => void;
} {
  let epoch = 30;
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: {
      allocate: () => parseNonNegativeSafeInteger(epoch += 1),
    },
    inputRouter: createInputRouterV1(),
    recipe: {
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    },
  });
  const session = createSystemDialogManagedSessionInternalV1({
    runtime: runtime.getCurrent(),
    ...(reportFailure === undefined ? {} : { reportFailure }),
  });
  const hostIdentity = { kind: "session-fixture-host" };
  const portalContainer = { kind: "session-fixture-portal" };
  let attachment = catalog === null
    ? null
    : session.attachHostInternalV1({ hostIdentity, portalContainer, catalog });
  return ({
    session,
    updateCatalog(nextCatalog) {
      if (attachment === null) {
        attachment = session.attachHostInternalV1({
          hostIdentity,
          portalContainer,
          catalog: nextCatalog,
        });
      } else {
        attachment.updateCatalogInternalV1(nextCatalog);
      }
    },
    readyCandidate(surfaceInstanceId) {
      if (attachment === null) throw new TypeError("test.system_host_not_attached");
      return attachment.readyCandidateInternalV1(surfaceInstanceId);
    },
    subscribeCoordinator: (listener) => runtime.getCurrent().coordinator.subscribe(listener),
    dismissCurrentFallback(surfaceInstanceId) {
      const current = runtime.getCurrent();
      const snapshot = current.coordinator.getSnapshot();
      current.coordinator.routeFallbackDismissExactCandidate(
        {
          applicationEpoch: snapshot.applicationEpoch,
          surfaceInstanceId: surfaceInstanceId as never,
        },
        "routed_cancel",
      );
    },
    releaseHost: () => attachment?.release(),
    rotate: (kind) => {
      runtime.replace(kind, [session]);
    },
    dispose: () => {
      session.disposeInternalV1();
      runtime.dispose();
    },
  });
}

function deferredV1<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return ({ promise, resolve, reject });
}

describe("dormant managed System dialog session", () => {
  it("grants one logical Host lease and rejects a distinct Host before mutation", async () => {
    const fixture = sessionFixtureV1(null);
    const { session } = fixture;
    const firstHost = { kind: "first-host" };
    const secondHost = { kind: "second-host" };
    const portal = { kind: "system-portal" };
    const catalog = catalogV1();
    const before = session.getManagedSnapshotInternalV1();
    let notifications = 0;
    const unsubscribe = session.subscribeInternalV1(() => notifications += 1);

    const attachment = session.attachHostInternalV1({
      hostIdentity: firstHost,
      portalContainer: portal,
      catalog,
    });

    expect(attachment.isAcknowledgmentOpen()).toBe(true);
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    expect(notifications).toBe(0);
    expect(() =>
      session.attachHostInternalV1({
        hostIdentity: secondHost,
        portalContainer: { kind: "losing-portal" },
        catalog: catalogV1({ settingsName: "Losing catalog" }),
      })
    ).toThrowError("ui.system_dialog_host_lease_conflict");
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    expect(notifications).toBe(0);

    attachment.release();
    expect(attachment.isAcknowledgmentOpen()).toBe(false);
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    await new Promise<void>((complete) => queueMicrotask(complete));

    const successorAttachment = session.attachHostInternalV1({
      hostIdentity: secondHost,
      portalContainer: portal,
      catalog,
    });
    expect(successorAttachment.isAcknowledgmentOpen()).toBe(true);
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    expect(notifications).toBe(0);

    successorAttachment.release();
    await new Promise<void>((complete) => queueMicrotask(complete));
    unsubscribe();
    fixture.dispose();
  });

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

  it("never reports a root candidate that a synchronous coordinator observer retired", () => {
    const fixture = sessionFixtureV1(catalogV1());
    let retired = false;
    const unsubscribe = fixture.subscribeCoordinator(() => {
      if (retired) return;
      const candidate = fixture.session.getManagedSnapshotInternalV1().orderedInstances[0];
      if (candidate === undefined) return;
      retired = true;
      fixture.dismissCurrentFallback(candidate.surfaceInstanceId);
    });

    expect(fixture.session.openRootInternalV1("settings")).toEqual({
      kind: "faulted",
      code: "system_dialog.transition_faulted",
    });
    expect(retired).toBe(true);
    expect(fixture.session.getManagedSnapshotInternalV1().orderedInstances).toEqual([]);
    expect(fixture.session.getRootCandidateRecordsInternalV1()).toEqual([]);
    unsubscribe();
    fixture.dispose();
  });

  it("rechecks the Host lease after root resolver work before allocating", () => {
    const baseCatalog = catalogV1();
    let releaseHost = (): void => undefined;
    const fixture = sessionFixtureV1({
      ...baseCatalog,
      resolveRoot(request: SystemDialogRootRequestInternalV1) {
        releaseHost();
        return baseCatalog.resolveRoot(request);
      },
    });
    releaseHost = fixture.releaseHost;
    const before = fixture.session.getManagedSnapshotInternalV1();

    expect(fixture.session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(fixture.session.getManagedSnapshotInternalV1()).toBe(before);
    expect(before.orderedInstances).toEqual([]);
    fixture.dispose();
  });

  it("rejects a live logical Host portal change before remounting its candidate", async () => {
    const fixture = sessionFixtureV1(null);
    const hostIdentity = { kind: "stable-portal-host" };
    const portalR1 = { kind: "portal-r1" };
    const attachment = fixture.session.attachHostInternalV1({
      hostIdentity,
      portalContainer: portalR1,
      catalog: catalogV1(),
    });
    fixture.session.openRootInternalV1("settings");
    const preparing = fixture.session.getManagedSnapshotInternalV1();

    expect(() =>
      fixture.session.attachHostInternalV1({
        hostIdentity,
        portalContainer: { kind: "portal-r2" },
        catalog: catalogV1({ settingsName: "Settings R2" }),
      })
    ).toThrowError("ui.system_dialog_host_portal_conflict");
    expect(fixture.session.getManagedSnapshotInternalV1()).toBe(preparing);
    expect(attachment.isAcknowledgmentOpen()).toBe(true);

    const continuation = fixture.session.attachHostInternalV1({
      hostIdentity,
      portalContainer: portalR1,
      catalog: catalogV1(),
    });
    expect(attachment.isAcknowledgmentOpen()).toBe(false);
    expect(continuation.isAcknowledgmentOpen()).toBe(true);
    expect(
      continuation.readyCandidateInternalV1(
        preparing.orderedInstances[0]!.surfaceInstanceId,
      ),
    ).toMatchObject({
      kind: "applied",
      code: "surface.readiness_ready",
    });

    continuation.release();
    await new Promise<void>((complete) => queueMicrotask(complete));
    fixture.dispose();
  });

  it("provides an identity-stable Host render snapshot", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    const initial = session.getHostRenderSnapshotInternalV1();

    expect(session.getHostRenderSnapshotInternalV1()).toBe(initial);
    expect(initial.entries).toEqual([]);
    expect(session.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });

    const preparing = session.getHostRenderSnapshotInternalV1();
    expect(preparing).not.toBe(initial);
    expect(session.getHostRenderSnapshotInternalV1()).toBe(preparing);
    expect(preparing.entries).toHaveLength(1);
    expect(preparing.entries[0]).toMatchObject({
      surfaceInstanceId: "surface-instance.e31.n1",
      phase: "preparing",
      rootRequest: "settings",
    });
    expect(preparing.entries[0]?.resolution.rendererComponent).toBe(rendererSettingsR1);
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
    fixture.updateCatalog({ resolveRoot, resolvePort });
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

    fixture.updateCatalog(null);
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterInitial);
    expect(notifications).toBe(1);

    fixture.updateCatalog({ resolveRoot, resolvePort });
    fixture.readyCandidate(afterInitial.orderedInstances[0]!.surfaceInstanceId);
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
    fixture.updateCatalog({
      resolveRoot: () => {
        throw new Error("synthetic resolver fault");
      },
      resolvePort: () => null,
    });
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "faulted",
      code: "system_dialog.renderer_faulted",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);

    fixture.updateCatalog({
      resolveRoot: () => null,
      resolvePort: () => null,
    });
    expect(session.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_missing",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);

    fixture.updateCatalog(catalogV1({ includeSavePort: false }));
    expect(session.openRootInternalV1("saves")).toEqual({
      kind: "rejected",
      code: "system_dialog.required_port_missing",
      portId: "persistence.player-save",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    fixture.dispose();
  });

  it("makes the catalog apply the root-specific config copier", () => {
    const config = {
      title: "Settings R1",
      closeLabel: "Close",
      emptyText: "Empty",
      sections: [] as ReactNode[],
    };
    const catalog = createSystemDialogRootCatalogSnapshotInternalV1({
      entries: [{
        rootRequest: "settings",
        rendererComponent: rendererSettingsR1,
        accessibleName: "Settings",
        requiredPortIds: [],
        contentConfig: config,
      }],
      portBindings: [],
    });
    config.title = "Settings R2";
    config.sections.push(createElement("span", null, "later"));
    expect(catalog.resolveRoot("settings")?.contentConfigSnapshot.value).toEqual({
      title: "Settings R1",
      closeLabel: "Close",
      emptyText: "Empty",
      sections: [],
    });

    const genericToken = createSystemDialogContentConfigSnapshotInternalV1(
      { title: "Bypass" },
    );
    expect(() =>
      createSystemDialogRootCatalogSnapshotInternalV1({
        entries: [
          {
            rootRequest: "settings" as const,
            rendererComponent: rendererSettingsR1,
            accessibleName: "Settings",
            requiredPortIds: [],
            contentConfig: genericToken as never,
          },
        ],
        portBindings: [],
      })
    ).toThrowError("ui.system_dialog_catalog_invalid");
  });

  it("uses fresh identities for initial supersede and preserves R1 candidate snapshots", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    let notifications = 0;
    const unsubscribe = fixture.subscribeCoordinator(() => notifications += 1);
    expect(session.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    const firstRecord = session.getRootCandidateRecordsInternalV1()[0]!;
    const firstPublication = session.getManagedSnapshotInternalV1();

    fixture.updateCatalog(catalogV1({
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
  });

  it("copies every standard Saves label field and snapshots one live guard projection", () => {
    const formatter = (value: string | number) => String(value);
    const guardSnapshot = { revision: 1 };
    const getSnapshot = () => guardSnapshot;
    const subscribe = () => () => undefined;
    const evaluate = () => ({ allowed: true });
    const source = {
      variant: "standard" as const,
      closeLabel: "Close R1",
      guardProjection: { getSnapshot, subscribe, evaluate },
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
            in_flight: "in flight",
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
        recovery: {
          checking: "checking",
          confirmation: {
            reanchorTitle: formatter,
            reanchorDescription: formatter,
            restoreTitle: formatter,
            restoreDescription: formatter,
            discardTitle: formatter,
            discardDescription: formatter,
          },
          disposition: {
            direct: "direct",
            migration_required: "migration required",
            adoption_required: "adoption required",
            migration_and_adoption_required: "migration and adoption required",
            migration_unavailable: "migration unavailable",
            migration_rejected: "migration rejected",
            incompatible: "incompatible",
            reanchor_required: "reanchor required",
            invalid_record: "invalid record",
            unavailable: "unavailable",
            faulted: "faulted",
          },
          backup: {
            available: "backup available",
            invalid: "backup invalid",
            unavailable: "backup unavailable",
          },
          action: {
            inspect: "inspect",
            upgrade: "upgrade",
            reanchor: "reanchor",
            restore: "restore",
            exportBackup: "export backup",
            discard: "discard",
          },
          operation: {
            upgrading: formatter,
            reanchoring: formatter,
            restoring: formatter,
            exportingBackup: formatter,
            discarding: formatter,
            upgradedExact: "upgraded exact",
            upgradedAdopted: "upgraded adopted",
            reanchored: "reanchored",
            restored: "restored",
            backupExported: "backup exported",
            discarded: "discarded",
            rejected: {
              busy: "busy",
              unavailable: "unavailable",
              empty_slot: "empty slot",
              backup_pending: "backup pending",
              conflict: "conflict",
              invalid_record: "invalid record",
              migration_unavailable: "migration unavailable",
              migration_rejected: "migration rejected",
              incompatible: "incompatible",
              reanchor_required: "reanchor required",
              not_required: "not required",
              empty_backup: "empty backup",
              invalid_backup: "invalid backup",
            },
            faulted: "faulted",
          },
        },
      },
    };
    const snapshot = snapshotSystemDialogSavesContentConfigInternalV1(source);
    source.closeLabel = "Close R2";
    source.labels.title = "Title R2";
    source.labels.slotNames.quick = "quick R2";
    source.labels.operation.rejected.busy = "busy R2";
    source.labels.recovery.action.restore = "restore R2";

    expect(snapshot.value.variant).toBe("standard");
    if (snapshot.value.variant !== "standard") throw new TypeError();
    expect(snapshot.value.guardProjection).toEqual({ getSnapshot, subscribe, evaluate });
    expect(snapshot.value.guardProjection).not.toBe(source.guardProjection);
    expect(snapshot.value.closeLabel).toBe("Close R1");
    expect(snapshot.value.labels.title).toBe("Title R1");
    expect(snapshot.value.labels.slotNames.quick).toBe("quick");
    expect(snapshot.value.labels.operation.rejected.busy).toBe("busy");
    const recovery = snapshot.value.labels.recovery;
    expect(recovery).toBeDefined();
    if (recovery === undefined) throw new TypeError();
    expect(recovery.confirmation.reanchorTitle("quick")).toBe("quick");
    expect(recovery.action.restore).toBe("restore");
    expect(snapshot.value.labels.savedAtText).toBe(formatter);

    const legacyLabels = { ...source.labels } as Record<string, unknown>;
    Reflect.deleteProperty(legacyLabels, "recovery");
    const legacySnapshot = snapshotSystemDialogSavesContentConfigInternalV1({
      variant: "standard",
      closeLabel: "Legacy close",
      labels: legacyLabels as never,
    });
    if (legacySnapshot.value.variant !== "standard") throw new TypeError();
    expect(legacySnapshot.value.labels).not.toHaveProperty("recovery");
    expect(legacySnapshot.value.labels.confirmation).not.toHaveProperty("reanchorTitle");
    const partialRecovery = { ...source.labels.recovery } as Record<string, unknown>;
    Reflect.deleteProperty(partialRecovery, "confirmation");
    expect(() =>
      snapshotSystemDialogSavesContentConfigInternalV1({
        ...source,
        labels: { ...source.labels, recovery: partialRecovery } as never,
      })
    ).toThrowError("ui.system_dialog_saves_config_invalid");
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

  it("opens only an exact current ready Saves child with its resolver and ports", () => {
    const catalog = catalogV1();
    const resolveConfirmation = vi.fn(catalog.resolveConfirmation);
    const fixture = sessionFixtureV1({ ...catalog, resolveConfirmation });
    const { session } = fixture;
    expect(session.openRootInternalV1("saves")).toMatchObject({ kind: "preparing" });
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const rootEntry = session.getHostRenderSnapshotInternalV1().entries.find(
      (entry) => entry.kind === "root",
    );
    expect(rootEntry?.kind).toBe("root");
    if (rootEntry?.kind !== "root" || rootEntry.lifecycleIntents === null) throw new TypeError();

    const dispatch = vi.fn(async () => ({ kind: "retain_root" as const, result: 1 }));
    const resultSink = vi.fn();
    const operationBinding = {
      dispatch,
      resultSink,
      finalizeExactRoot: vi.fn(),
    };
    const opened = rootEntry.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "manual.2" },
      operationBinding,
    });
    expect(opened).toEqual({
      kind: "preparing",
      code: "system_dialog.confirmation_preparation_started",
      surfaceInstanceId: "surface-instance.e31.n2",
    });
    expect(resolveConfirmation).toHaveBeenCalledTimes(1);
    fixture.updateCatalog(catalogV1({ confirmationRenderer: rendererConfirmationR2 }));

    const preparing = session.getHostRenderSnapshotInternalV1();
    expect(preparing.entries).toHaveLength(2);
    expect(preparing.entries[1]).toMatchObject({
      kind: "confirmation",
      surfaceInstanceId: "surface-instance.e31.n2",
      parentSurfaceInstanceId: "surface-instance.e31.n1",
      phase: "preparing",
      invocation: { kind: "clear", slotId: "manual.2" },
      resolution: {
        rendererComponent: rendererConfirmationR1,
        accessibleName: "Action confirmation",
        requiredPortBindings: [
          { portId: "system.confirmation", port: confirmationPortV1 },
        ],
      },
    });
    expect(
      rootEntry.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding,
      }),
    ).toEqual({
      kind: "unchanged",
      code: "system_dialog.confirmation_already_requested",
    });
    expect(resolveConfirmation).toHaveBeenCalledTimes(1);

    const child = preparing.entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    expect(child.controller.dispatchOnceInternalV1()).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_not_ready",
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(child.controller.cancelInternalV1("routed_cancel")).toEqual({
      kind: "applied",
      code: "system_dialog.confirmation_closed",
    });
    expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);
    const reopened = rootEntry.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "import" },
      operationBinding,
    });
    expect(reopened).toMatchObject({
      kind: "preparing",
      surfaceInstanceId: "surface-instance.e31.n3",
    });
    expect(resolveConfirmation).toHaveBeenCalledTimes(1);
    expect(session.getHostRenderSnapshotInternalV1().entries[1]).toMatchObject({
      kind: "confirmation",
      surfaceInstanceId: "surface-instance.e31.n3",
      resolution: { rendererComponent: rendererConfirmationR2 },
    });
    fixture.dispose();
  });

  it("keeps a reentrant fresh candidate authoritative when an observer retires its predecessor", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
    const freshDeferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const freshResultSink = vi.fn();
    const freshFinalizer = vi.fn();
    let intervened = false;
    let freshOpenResult: unknown = null;
    const unsubscribe = fixture.subscribeCoordinator(() => {
      if (intervened) return;
      const candidate = session.getManagedSnapshotInternalV1().orderedInstances.find(
        (instance) => instance.parentInstanceId === "surface-instance.e31.n1",
      );
      if (candidate === undefined) return;
      intervened = true;
      fixture.dismissCurrentFallback(candidate.surfaceInstanceId);
      freshOpenResult = root.lifecycleIntents!.requestConfirmationInternalV1({
        invocation: { kind: "clear", slotId: "manual.1" },
        operationBinding: {
          dispatch: () => freshDeferred.promise,
          resultSink: freshResultSink,
          finalizeExactRoot: freshFinalizer,
        },
      });
    });

    const result = root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "import" },
      operationBinding: {
        dispatch: async () => ({ kind: "successor" as const }),
        resultSink: vi.fn(),
        finalizeExactRoot: vi.fn(),
      },
    });

    expect(intervened).toBe(true);
    expect(result).toEqual({
      kind: "faulted",
      code: "system_dialog.confirmation_transition_faulted",
    });
    expect(freshOpenResult).toMatchObject({
      kind: "preparing",
      surfaceInstanceId: "surface-instance.e31.n3",
    });
    fixture.readyCandidate("surface-instance.e31.n3" as never);
    const freshChild = session.getHostRenderSnapshotInternalV1().entries[1];
    if (freshChild?.kind !== "confirmation") throw new TypeError();
    freshChild.controller.dispatchOnceInternalV1();
    freshDeferred.resolve({ kind: "retain_root", result: "fresh" });
    await freshDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(freshResultSink).toHaveBeenCalledWith({ kind: "settled", result: "fresh" });
    expect(freshFinalizer).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toMatchObject([
      { kind: "root", surfaceInstanceId: "surface-instance.e31.n1", phase: "active" },
    ]);
    unsubscribe();
    fixture.dispose();
  });

  it.each(["resolver", "port"] as const)(
    "rechecks the exact Host and parent after confirmation %s work",
    (releaseBoundary) => {
      const baseCatalog = catalogV1();
      const fixture = sessionFixtureV1(baseCatalog);
      const { session } = fixture;
      session.openRootInternalV1("saves");
      fixture.readyCandidate("surface-instance.e31.n1" as never);
      const root = session.getHostRenderSnapshotInternalV1().entries[0];
      if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
      fixture.updateCatalog({
        ...baseCatalog,
        resolveConfirmation(invocation: SystemDialogConfirmationInvocationInternalV1) {
          if (releaseBoundary === "resolver") fixture.releaseHost();
          return baseCatalog.resolveConfirmation?.(invocation) ?? null;
        },
        resolvePort(portId: string) {
          if (releaseBoundary === "port" && portId === "system.confirmation") {
            fixture.releaseHost();
          }
          return baseCatalog.resolvePort(portId);
        },
      });
      const before = session.getManagedSnapshotInternalV1();

      expect(root.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding: {
          dispatch: async () => ({ kind: "successor" as const }),
          resultSink: vi.fn(),
          finalizeExactRoot: vi.fn(),
        },
      })).toEqual({
        kind: "rejected",
        code: "system_dialog.confirmation_renderer_unavailable",
      });
      expect(session.getManagedSnapshotInternalV1()).toBe(before);
      expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);
      fixture.dispose();
    },
  );

  it("dispatches once and delivers a retained-root completion only through the live exact child", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
    const deferred = deferredV1<{ readonly kind: "retain_root"; readonly result: string }>();
    const dispatch = vi.fn(() => deferred.promise);
    const resultSink = vi.fn();
    const finalizeExactRoot = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "auto.previous" },
      operationBinding: { dispatch, resultSink, finalizeExactRoot },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();

    expect(child.controller.dispatchOnceInternalV1()).toEqual({
      kind: "applied",
      code: "system_dialog.confirmation_operation_dispatched",
    });
    expect(child.controller.dispatchOnceInternalV1()).toEqual({
      kind: "unchanged",
      code: "system_dialog.confirmation_operation_already_dispatched",
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ kind: "clear", slotId: "auto.previous" });
    deferred.resolve({ kind: "retain_root", result: "cleared" });
    await deferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(resultSink).toHaveBeenCalledTimes(1);
    expect(resultSink).toHaveBeenCalledWith({ kind: "settled", result: "cleared" });
    expect(finalizeExactRoot).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toMatchObject([
      { kind: "root", surfaceInstanceId: "surface-instance.e31.n1", phase: "active" },
    ]);
    fixture.dispose();
  });

  it.each(
    [
      ["reanchor", "manual.1"],
      ["restore", "auto.previous"],
      ["discard", "quick"],
    ] as const,
  )(
    "keeps %s single-dispatch and revokes its late result after cancel",
    async (kind, slotId) => {
      const fixture = sessionFixtureV1(catalogV1());
      const { session } = fixture;
      session.openRootInternalV1("saves");
      fixture.readyCandidate("surface-instance.e31.n1" as never);
      const root = session.getHostRenderSnapshotInternalV1().entries[0];
      if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
      const deferred = deferredV1<{ readonly kind: "retain_root"; readonly result: string }>();
      const dispatch = vi.fn(() => deferred.promise);
      const resultSink = vi.fn();
      const finalizeExactRoot = vi.fn();
      const invocation = { kind, slotId };
      root.lifecycleIntents.requestConfirmationInternalV1({
        invocation,
        operationBinding: { dispatch, resultSink, finalizeExactRoot },
      });
      fixture.readyCandidate("surface-instance.e31.n2" as never);
      const child = session.getHostRenderSnapshotInternalV1().entries[1];
      if (child?.kind !== "confirmation") throw new TypeError();

      expect(child.invocation).toEqual(invocation);
      expect(child.invocation).not.toBe(invocation);
      expect(child.controller.dispatchOnceInternalV1()).toMatchObject({ kind: "applied" });
      expect(child.controller.dispatchOnceInternalV1()).toEqual({
        kind: "unchanged",
        code: "system_dialog.confirmation_operation_already_dispatched",
      });
      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith(invocation);
      expect(child.controller.cancelInternalV1("routed_cancel")).toMatchObject({ kind: "applied" });
      const afterCancel = session.getManagedSnapshotInternalV1();

      deferred.resolve({ kind: "retain_root", result: `${kind}-done` });
      await deferred.promise;
      await new Promise<void>((complete) => queueMicrotask(complete));

      expect(resultSink).not.toHaveBeenCalled();
      expect(finalizeExactRoot).toHaveBeenCalledOnce();
      expect(session.getManagedSnapshotInternalV1()).toBe(afterCancel);
      expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);
      fixture.dispose();
    },
  );

  it.each(
    [
      ["reanchor", "manual.1"],
      ["restore", "auto.previous"],
      ["discard", "quick"],
    ] as const,
  )("rejects a successor outcome from retained-root %s", async (kind, slotId) => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
    const resultSink = vi.fn();
    const finalizeExactRoot = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind, slotId },
      operationBinding: {
        dispatch: () => Promise.resolve({ kind: "successor" as const }),
        resultSink,
        finalizeExactRoot,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();

    child.controller.dispatchOnceInternalV1();
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(resultSink).toHaveBeenCalledOnce();
    expect(resultSink.mock.calls[0]?.[0]).toMatchObject({ kind: "faulted" });
    expect(finalizeExactRoot).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toMatchObject([
      { kind: "root", surfaceInstanceId: "surface-instance.e31.n1", phase: "active" },
    ]);
    fixture.dispose();
  });

  it("lets a cancelled operation finish while revoking close/result, and leaves successor success to rotation", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();

    const cancelledDeferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const cancelledDispatch = vi.fn(() => cancelledDeferred.promise);
    const cancelledSink = vi.fn();
    const cancelledFinalizer = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: cancelledDispatch,
        resultSink: cancelledSink,
        finalizeExactRoot: cancelledFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    let child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    expect(child.controller.dispatchOnceInternalV1()).toMatchObject({ kind: "applied" });
    expect(child.controller.cancelInternalV1("routed_cancel")).toMatchObject({ kind: "applied" });
    const afterCancel = session.getManagedSnapshotInternalV1();
    let sessionNotifications = 0;
    let coordinatorNotifications = 0;
    const unsubscribeSession = session.subscribeInternalV1(() => sessionNotifications += 1);
    const unsubscribeCoordinator = fixture.subscribeCoordinator(
      () => coordinatorNotifications += 1,
    );
    cancelledDeferred.resolve({ kind: "retain_root", result: "cleared" });
    await cancelledDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(cancelledDispatch).toHaveBeenCalledTimes(1);
    expect(cancelledSink).not.toHaveBeenCalled();
    expect(cancelledFinalizer).toHaveBeenCalledOnce();
    expect(session.getManagedSnapshotInternalV1()).toBe(afterCancel);
    expect(sessionNotifications).toBe(0);
    expect(coordinatorNotifications).toBe(0);
    expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);
    unsubscribeCoordinator();
    unsubscribeSession();

    const successorDeferred = deferredV1<{ readonly kind: "successor" }>();
    const successorSink = vi.fn();
    const successorFinalizer = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "load", slotId: "auto.current" },
      operationBinding: {
        dispatch: () => successorDeferred.promise,
        resultSink: successorSink,
        finalizeExactRoot: successorFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n3" as never);
    child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    successorDeferred.resolve({ kind: "successor" });
    await successorDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(successorSink).not.toHaveBeenCalled();
    expect(successorFinalizer).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toMatchObject([
      { kind: "root", surfaceInstanceId: "surface-instance.e31.n1" },
      { kind: "confirmation", surfaceInstanceId: "surface-instance.e31.n3" },
    ]);
    fixture.dispose();
  });

  it("keeps a fresh successor root unchanged when the predecessor load settles as successor", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const predecessorRoot = session.getHostRenderSnapshotInternalV1().entries[0];
    if (
      predecessorRoot?.kind !== "root" ||
      predecessorRoot.lifecycleIntents === null
    ) {
      throw new TypeError();
    }

    const completion = deferredV1<{ readonly kind: "successor" }>();
    const resultSink = vi.fn();
    const finalizeExactRoot = vi.fn();
    predecessorRoot.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "load", slotId: "auto.current" },
      operationBinding: {
        dispatch: () => completion.promise,
        resultSink,
        finalizeExactRoot,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const predecessorChild = session.getHostRenderSnapshotInternalV1().entries[1];
    if (predecessorChild?.kind !== "confirmation") throw new TypeError();
    predecessorChild.controller.dispatchOnceInternalV1();

    fixture.rotate("load_rebootstrap");
    session.openRootInternalV1("settings");
    fixture.readyCandidate("surface-instance.e32.n1" as never);
    const freshPublication = session.getManagedSnapshotInternalV1();
    const freshRenderSnapshot = session.getHostRenderSnapshotInternalV1();
    expect(freshRenderSnapshot.entries).toMatchObject([
      {
        kind: "root",
        rootRequest: "settings",
        surfaceInstanceId: "surface-instance.e32.n1",
      },
    ]);
    let sessionNotifications = 0;
    let coordinatorNotifications = 0;
    const unsubscribeSession = session.subscribeInternalV1(() => sessionNotifications += 1);
    const unsubscribeCoordinator = fixture.subscribeCoordinator(
      () => coordinatorNotifications += 1,
    );

    completion.resolve({ kind: "successor" });
    await completion.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(resultSink).not.toHaveBeenCalled();
    expect(finalizeExactRoot).not.toHaveBeenCalled();
    expect(session.getManagedSnapshotInternalV1()).toBe(freshPublication);
    expect(session.getHostRenderSnapshotInternalV1()).toBe(freshRenderSnapshot);
    expect(sessionNotifications).toBe(0);
    expect(coordinatorNotifications).toBe(0);
    unsubscribeCoordinator();
    unsubscribeSession();
    fixture.dispose();
  });

  it("keeps invalid invocations, unavailable renderers, missing ports, and stale parents at zero delta", () => {
    const catalog = catalogV1();
    const resolveConfirmation = vi.fn(catalog.resolveConfirmation!);
    const fixture = sessionFixtureV1({ ...catalog, resolveConfirmation });
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const saves = session.getHostRenderSnapshotInternalV1().entries[0];
    if (saves?.kind !== "root" || saves.lifecycleIntents === null) throw new TypeError();
    const operationBinding = {
      dispatch: async () => ({ kind: "retain_root" as const, result: null }),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    };
    let notifications = 0;
    const unsubscribe = session.subscribeInternalV1(() => notifications += 1);

    const beforeInvalid = session.getManagedSnapshotInternalV1();
    expect(
      saves.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import", slotId: "quick" } as never,
        operationBinding,
      }),
    ).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_invocation_invalid",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeInvalid);
    expect(resolveConfirmation).not.toHaveBeenCalled();
    expect(notifications).toBe(0);

    fixture.updateCatalog(catalogV1({ includeConfirmation: false }));
    const beforeMissing = session.getManagedSnapshotInternalV1();
    expect(
      saves.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding,
      }),
    ).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_renderer_missing",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeMissing);
    expect(notifications).toBe(0);

    fixture.updateCatalog(catalogV1({ includeConfirmationPort: false }));
    const beforePort = session.getManagedSnapshotInternalV1();
    expect(
      saves.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding,
      }),
    ).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_required_port_missing",
      portId: "system.confirmation",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforePort);
    expect(notifications).toBe(0);

    fixture.updateCatalog(catalogV1());
    session.openRootInternalV1("settings");
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const settings = session.getHostRenderSnapshotInternalV1().entries[0];
    if (settings?.kind !== "root") throw new TypeError();
    expect(settings.lifecycleIntents).toBeNull();
    const beforeSettings = session.getManagedSnapshotInternalV1();
    expect(
      saves.lifecycleIntents.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding,
      }),
    ).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_parent_stale",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeSettings);
    expect(notifications).toBe(2);
    unsubscribe();
    fixture.dispose();
  });

  it("turns sync throws, async rejection, and malformed outcomes into one live fault delivery", async () => {
    const failures = vi.fn();
    const fixture = sessionFixtureV1(catalogV1(), failures);
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();

    const exerciseFault = async (
      dispatch: () => Promise<SystemDialogConfirmationOperationOutcomeInternalV1>,
      expectedChildId: string,
    ): Promise<void> => {
      const resultSink = vi.fn();
      const finalizeExactRoot = vi.fn();
      root.lifecycleIntents!.requestConfirmationInternalV1({
        invocation: { kind: "clear", slotId: "quick" },
        operationBinding: { dispatch, resultSink, finalizeExactRoot },
      });
      fixture.readyCandidate(expectedChildId as never);
      const child = session.getHostRenderSnapshotInternalV1().entries[1];
      if (child?.kind !== "confirmation") throw new TypeError();
      expect(child.controller.dispatchOnceInternalV1()).toMatchObject({ kind: "applied" });
      await new Promise<void>((complete) => queueMicrotask(complete));
      expect(resultSink).toHaveBeenCalledTimes(1);
      expect(resultSink.mock.calls[0]?.[0]).toMatchObject({ kind: "faulted" });
      expect(finalizeExactRoot).toHaveBeenCalledOnce();
      expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);
    };

    await exerciseFault(() => {
      throw new Error("sync dispatch fault");
    }, "surface-instance.e31.n2");
    await exerciseFault(
      () => Promise.reject(new Error("async dispatch fault")),
      "surface-instance.e31.n3",
    );
    await exerciseFault(
      () => Promise.resolve({ kind: "retain_root" } as never),
      "surface-instance.e31.n4",
    );

    const throwingSink = vi.fn(() => {
      throw new Error("sink fault");
    });
    const finalizeAfterThrowingSink = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: async () => ({ kind: "retain_root" as const, result: "ok" }),
        resultSink: throwingSink,
        finalizeExactRoot: finalizeAfterThrowingSink,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n5" as never);
    const child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(throwingSink).toHaveBeenCalledTimes(1);
    expect(failures).toHaveBeenCalledWith(
      "ui.system_dialog_confirmation_result_sink_failed",
      expect.any(Error),
    );
    expect(finalizeAfterThrowingSink).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toHaveLength(1);

    fixture.dispose();
  });

  it("settles against fresh exact handles while a root replacement remains preparing", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const saves = session.getHostRenderSnapshotInternalV1().entries[0];
    if (saves?.kind !== "root" || saves.lifecycleIntents === null) throw new TypeError();
    const deferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const resultSink = vi.fn();
    const finalizeExactRoot = vi.fn();
    saves.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: () => deferred.promise,
        resultSink,
        finalizeExactRoot,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();

    expect(session.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    const replacementPreparing = session.getManagedSnapshotInternalV1();
    expect(replacementPreparing.orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.e31.n1", phase: "suspended" },
      { surfaceInstanceId: "surface-instance.e31.n3", phase: "preparing" },
      { surfaceInstanceId: "surface-instance.e31.n2", phase: "active" },
    ]);
    deferred.resolve({ kind: "retain_root", result: "cleared" });
    await deferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(resultSink).toHaveBeenCalledTimes(1);
    expect(resultSink).toHaveBeenCalledWith({ kind: "settled", result: "cleared" });
    expect(finalizeExactRoot).toHaveBeenCalledOnce();
    expect(session.getManagedSnapshotInternalV1().orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.e31.n1", phase: "active" },
      { surfaceInstanceId: "surface-instance.e31.n3", phase: "preparing" },
    ]);
    fixture.dispose();
  });

  it("fences completion after root replacement, successor rotation, and real Host release", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const firstRoot = session.getHostRenderSnapshotInternalV1().entries[0];
    if (firstRoot?.kind !== "root" || firstRoot.lifecycleIntents === null) throw new TypeError();
    const replacedDeferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const replacedSink = vi.fn();
    const replacedFinalizer = vi.fn();
    firstRoot.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: () => replacedDeferred.promise,
        resultSink: replacedSink,
        finalizeExactRoot: replacedFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    let child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    session.openRootInternalV1("settings");
    fixture.readyCandidate("surface-instance.e31.n3" as never);
    replacedDeferred.resolve({ kind: "retain_root", result: "late" });
    await replacedDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(replacedSink).not.toHaveBeenCalled();
    expect(replacedFinalizer).not.toHaveBeenCalled();

    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n4" as never);
    const secondRoot = session.getHostRenderSnapshotInternalV1().entries[0];
    if (secondRoot?.kind !== "root" || secondRoot.lifecycleIntents === null) throw new TypeError();
    const rotatedDeferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const rotatedSink = vi.fn();
    const rotatedFinalizer = vi.fn();
    secondRoot.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: () => rotatedDeferred.promise,
        resultSink: rotatedSink,
        finalizeExactRoot: rotatedFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n5" as never);
    child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    fixture.rotate("load_rebootstrap");
    expect(session.getManagedSnapshotInternalV1().applicationEpoch).toBe(32);
    expect(session.getHostRenderSnapshotInternalV1().entries).toEqual([]);
    rotatedDeferred.resolve({ kind: "retain_root", result: "late" });
    await rotatedDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(rotatedSink).not.toHaveBeenCalled();
    expect(rotatedFinalizer).not.toHaveBeenCalled();

    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e32.n1" as never);
    const successorRoot = session.getHostRenderSnapshotInternalV1().entries[0];
    if (successorRoot?.kind !== "root" || successorRoot.lifecycleIntents === null) {
      throw new TypeError();
    }
    const releasedDeferred = deferredV1<{
      readonly kind: "retain_root";
      readonly result: string;
    }>();
    const releasedSink = vi.fn();
    const releasedFinalizer = vi.fn();
    successorRoot.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: () => releasedDeferred.promise,
        resultSink: releasedSink,
        finalizeExactRoot: releasedFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e32.n2" as never);
    child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    releasedDeferred.resolve({ kind: "retain_root", result: "late" });
    fixture.releaseHost();
    await releasedDeferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));
    expect(releasedSink).not.toHaveBeenCalled();
    expect(releasedFinalizer).not.toHaveBeenCalled();
    expect(session.getHostRenderSnapshotInternalV1().entries).toEqual([]);
    fixture.dispose();
  });

  it("rechecks Host ingress after child-close notification before invoking the result sink", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
    const resultSink = vi.fn();
    const finalizeExactRoot = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: async () => ({ kind: "retain_root" as const, result: "clear" }),
        resultSink,
        finalizeExactRoot,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    let released = false;
    const unsubscribe = session.subscribeInternalV1(() => {
      if (
        !released &&
        session.getHostRenderSnapshotInternalV1().entries.length === 1
      ) {
        released = true;
        fixture.releaseHost();
      }
    });
    const child = session.getHostRenderSnapshotInternalV1().entries[1];
    if (child?.kind !== "confirmation") throw new TypeError();
    child.controller.dispatchOnceInternalV1();
    await new Promise<void>((complete) => queueMicrotask(complete));
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(released).toBe(true);
    expect(resultSink).not.toHaveBeenCalled();
    expect(finalizeExactRoot).not.toHaveBeenCalled();
    expect(session.getHostRenderSnapshotInternalV1().entries).toEqual([]);
    unsubscribe();
    fixture.dispose();
  });

  it("revokes an old child result when close notification opens a fresh child", async () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root" || root.lifecycleIntents === null) throw new TypeError();
    const deferred = deferredV1<{ readonly kind: "retain_root"; readonly result: string }>();
    const oldResultSink = vi.fn();
    const oldFinalizer = vi.fn();
    root.lifecycleIntents.requestConfirmationInternalV1({
      invocation: { kind: "clear", slotId: "quick" },
      operationBinding: {
        dispatch: () => deferred.promise,
        resultSink: oldResultSink,
        finalizeExactRoot: oldFinalizer,
      },
    });
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const oldChild = session.getHostRenderSnapshotInternalV1().entries[1];
    if (oldChild?.kind !== "confirmation") throw new TypeError();
    oldChild.controller.dispatchOnceInternalV1();

    let reopened = false;
    const unsubscribe = session.subscribeInternalV1(() => {
      if (reopened || session.getHostRenderSnapshotInternalV1().entries.length !== 1) return;
      reopened = true;
      root.lifecycleIntents!.requestConfirmationInternalV1({
        invocation: { kind: "import" },
        operationBinding: {
          dispatch: async () => ({ kind: "successor" as const }),
          resultSink: vi.fn(),
          finalizeExactRoot: vi.fn(),
        },
      });
    });
    deferred.resolve({ kind: "retain_root", result: "old" });
    await deferred.promise;
    await new Promise<void>((complete) => queueMicrotask(complete));

    expect(reopened).toBe(true);
    expect(oldResultSink).not.toHaveBeenCalled();
    expect(oldFinalizer).toHaveBeenCalledOnce();
    expect(session.getHostRenderSnapshotInternalV1().entries).toMatchObject([
      { kind: "root", surfaceInstanceId: "surface-instance.e31.n1" },
      { kind: "confirmation", surfaceInstanceId: "surface-instance.e31.n3" },
    ]);
    unsubscribe();
    fixture.dispose();
  });

  it("projects only ready roots through the minimal identity-stable public facade", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const facade = createSystemDialogSessionFacadeInternalV1(fixture.session);

    const closed = facade.getSnapshot();
    expect(closed).toEqual({ active: null });
    expect(facade.getSnapshot()).toBe(closed);

    expect(facade.openSettings()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(facade.getSnapshot()).toBe(closed);

    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const activeSettings = facade.getSnapshot();
    expect(activeSettings).toEqual({ active: "settings" });
    expect(activeSettings).not.toBe(closed);
    expect(facade.getSnapshot()).toBe(activeSettings);

    expect(facade.openSaves()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(facade.getSnapshot()).toBe(activeSettings);

    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const activeSaves = facade.getSnapshot();
    expect(activeSaves).toEqual({ active: "saves" });
    expect(activeSaves).not.toBe(activeSettings);
    expect(facade.getSnapshot()).toBe(activeSaves);
    fixture.dispose();
  });

  it("keeps initial preparation and supersede out of the public active view", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const facade = createSystemDialogSessionFacadeInternalV1(fixture.session);
    const closed = facade.getSnapshot();

    facade.openSettings();
    expect(facade.getSnapshot()).toBe(closed);
    expect(facade.openSaves()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(facade.getSnapshot()).toBe(closed);
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    expect(facade.getSnapshot()).toEqual({ active: "saves" });
    fixture.dispose();
  });

  it("binds root close and dismiss to the exact runtime, instance, and owner preparation", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("settings");
    const initial = session.getHostRenderSnapshotInternalV1().entries[0];
    if (initial?.kind !== "root") throw new TypeError();

    expect(initial.controller.cancelInternalV1("escape")).toMatchObject({
      kind: "applied",
      code: "surface.dismissed",
    });
    expect(session.getHostRenderSnapshotInternalV1().entries).toEqual([]);

    session.openRootInternalV1("settings");
    fixture.readyCandidate("surface-instance.e31.n2" as never);
    const retained = session.getHostRenderSnapshotInternalV1().entries[0];
    if (retained?.kind !== "root") throw new TypeError();
    session.openRootInternalV1("saves");
    const beforeClose = session.getManagedSnapshotInternalV1();

    expect(retained.controller.closeInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
    });
    expect(session.getHostRenderSnapshotInternalV1().entries).toEqual([]);
    expect(revisionDeltaV1(beforeClose, session.getManagedSnapshotInternalV1())).toEqual([1, 1]);

    const afterClose = session.getManagedSnapshotInternalV1();
    expect(retained.controller.closeInternalV1()).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(retained.controller.cancelInternalV1("escape")).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterClose);
    fixture.dispose();
  });

  it("revokes exact root controllers before Host release and successor callbacks can mutate", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const { session } = fixture;
    session.openRootInternalV1("saves");
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const predecessor = session.getHostRenderSnapshotInternalV1().entries[0];
    if (predecessor?.kind !== "root") throw new TypeError();

    fixture.rotate("load_rebootstrap");
    const successorBefore = session.getManagedSnapshotInternalV1();
    expect(predecessor.controller.closeInternalV1()).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(predecessor.controller.cancelInternalV1("backdrop")).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(successorBefore);

    session.openRootInternalV1("settings");
    fixture.readyCandidate("surface-instance.e32.n1" as never);
    const attached = session.getHostRenderSnapshotInternalV1().entries[0];
    if (attached?.kind !== "root") throw new TypeError();
    fixture.releaseHost();
    const releaseBefore = session.getManagedSnapshotInternalV1();
    expect(attached.controller.closeInternalV1()).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(releaseBefore);
    fixture.dispose();
  });

  it("fences public opens and exact root controllers as soon as terminal disposal seals", () => {
    const fixture = sessionFixtureV1(catalogV1());
    const facade = createSystemDialogSessionFacadeInternalV1(fixture.session);
    facade.openSettings();
    fixture.readyCandidate("surface-instance.e31.n1" as never);
    const root = fixture.session.getHostRenderSnapshotInternalV1().entries[0];
    if (root?.kind !== "root") throw new TypeError();
    const before = fixture.session.getManagedSnapshotInternalV1();

    fixture.session.sealTerminalDisposalInternalV1();
    expect(facade.openSaves()).toEqual({
      kind: "rejected",
      code: "system_dialog.disposed",
    });
    expect(root.controller.closeInternalV1()).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(fixture.session.getManagedSnapshotInternalV1()).toBe(before);
    fixture.dispose();
  });
});
