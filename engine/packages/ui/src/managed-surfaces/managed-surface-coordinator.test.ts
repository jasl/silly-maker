// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  type ManagedSurfaceResolvedDefinitionV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type ManagedSurfaceHandleV1,
} from "./managed-surface-coordinator.ts";

function definitionV1(
  suffix: string,
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return {
    definitionId: parseManagedSurfaceDefinitionIdV1(`surface.${suffix}`),
    ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    slotCardinality: "single",
    allowedParentSlotIds: [],
    modality: "non_blocking",
    inputContextId: "overlay",
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    },
    actionIds: [parseManagedSurfaceActionIdV1("surface-action.activate")],
    ...overrides,
  };
}

function childDefinitionV1(suffix: string): ManagedSurfaceResolvedDefinitionV1 {
  return definitionV1(suffix, {
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
    layerOrder: parseNonNegativeSafeInteger(30),
    placement: "child",
    slotCardinality: "stack",
    allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
  });
}

describe("ManagedSurfaceCoordinatorV1", () => {
  it("allocates deterministic transient identities and publishes each applied transition once", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(4),
    });
    const initial = coordinator.getSnapshot();
    const observed: (typeof initial)[] = [];
    coordinator.subscribe(() => observed.push(coordinator.getSnapshot()));

    expect(initial).toEqual({
      applicationEpoch: 4,
      topologyRevision: 0,
      orderedInstances: [],
      topmostBlockingInstanceId: null,
      inputOwner: null,
      focusOwner: null,
      ownerTrace: [],
      coordinatorDisposed: false,
    });
    expect(Object.isFrozen(initial)).toBe(true);

    const opened = coordinator.openTransientPrimary({
      definition: definitionV1("inventory"),
      semanticOccurrenceId: "semantic.inventory",
    });

    expect(opened.receipt).toMatchObject({
      kind: "applied",
      code: "surface.opened",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
      surfaceInstanceId: "surface-instance.e4.n1",
    });
    expect(opened.handle).toEqual({
      applicationEpoch: 4,
      topologyRevision: 1,
      surfaceInstanceId: "surface-instance.e4.n1",
    });
    expect(coordinator.getSnapshot().orderedInstances[0]).toMatchObject({
      target: {
        kind: "transient",
        occurrenceId: "surface-occurrence.e4.n1",
      },
      surfaceInstanceId: "surface-instance.e4.n1",
      routingLeaseId: "surface-lease.e4.n1",
      semanticOccurrenceId: "semantic.inventory",
    });
    expect(observed).toEqual([coordinator.getSnapshot()]);
    expect(Object.isFrozen(opened)).toBe(true);
    expect(Object.isFrozen(opened.receipt)).toBe(true);
    expect(Object.isFrozen(opened.handle)).toBe(true);
  });

  it("does not publish rejected work and never rolls an allocated identity back", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(5),
    });
    const listener = vi.fn();
    coordinator.subscribe(listener);
    const first = coordinator.openTransientPrimary({
      definition: definitionV1("first"),
      semanticOccurrenceId: null,
    });
    const beforeRejected = coordinator.getSnapshot();
    listener.mockClear();

    const rejected = coordinator.openTransientPrimary({
      definition: definitionV1("occupied"),
      semanticOccurrenceId: null,
    });

    expect(rejected).toMatchObject({
      receipt: { kind: "rejected", code: "surface.slot_occupied" },
      handle: null,
    });
    expect(coordinator.getSnapshot()).toBe(beforeRejected);
    expect(listener).not.toHaveBeenCalled();

    coordinator.closeExpected(first.handle!);
    const next = coordinator.openTransientPrimary({
      definition: definitionV1("next"),
      semanticOccurrenceId: null,
    });
    expect(next.handle?.surfaceInstanceId).toBe("surface-instance.e5.n3");
    expect(coordinator.getSnapshot().orderedInstances[0]?.target.occurrenceId).toBe(
      "surface-occurrence.e5.n3",
    );
  });

  it("keeps handles bound to the exact topology revision instead of refreshing them", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(6),
    });
    const first = coordinator.openTransientPrimary({
      definition: definitionV1("first"),
      semanticOccurrenceId: null,
    });
    coordinator.openTransientPrimary({
      definition: definitionV1("other", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
      }),
      semanticOccurrenceId: null,
    });
    const beforeStale = coordinator.getSnapshot();
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const stale = coordinator.closeExpected(first.handle!);

    expect(stale).toMatchObject({
      kind: "stale",
      code: "surface.stale_topology_revision",
      beforeTopologyRevision: 2,
      afterTopologyRevision: 2,
    });
    expect(coordinator.getSnapshot()).toBe(beforeStale);
    expect(listener).not.toHaveBeenCalled();

    const refreshed = coordinator.getHandle(first.handle!.surfaceInstanceId);
    expect(refreshed).toEqual({
      applicationEpoch: 6,
      topologyRevision: 2,
      surfaceInstanceId: "surface-instance.e6.n1",
    });
    expect(coordinator.closeExpected(refreshed!)).toMatchObject({
      kind: "applied",
      code: "surface.closed",
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("fences child pushes with exact parent evidence after intervening topology changes", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(7),
    });
    const parent = coordinator.openTransientPrimary({
      definition: definitionV1("parent"),
      semanticOccurrenceId: null,
    });
    const firstChild = coordinator.pushTransientChild({
      parent: parent.handle!,
      definition: childDefinitionV1("first-child"),
      semanticOccurrenceId: null,
    });
    coordinator.closeExpected(firstChild.handle!);
    const beforeStale = coordinator.getSnapshot();

    const stale = coordinator.pushTransientChild({
      parent: parent.handle!,
      definition: childDefinitionV1("stale-child"),
      semanticOccurrenceId: null,
    });

    expect(stale).toMatchObject({
      receipt: { kind: "stale", code: "surface.stale_topology_revision" },
      handle: null,
    });
    expect(coordinator.getSnapshot()).toBe(beforeStale);

    const refreshedParent = coordinator.getHandle(parent.handle!.surfaceInstanceId);
    const pushed = coordinator.pushTransientChild({
      parent: refreshedParent!,
      definition: childDefinitionV1("fresh-child"),
      semanticOccurrenceId: null,
    });
    expect(pushed).toMatchObject({
      receipt: { kind: "applied", code: "surface.child_pushed" },
      handle: {
        topologyRevision: 4,
        surfaceInstanceId: "surface-instance.e7.n4",
      },
    });
  });

  it("fences primary replacement against callbacks for a retired predecessor", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(8),
    });
    const first = coordinator.openTransientPrimary({
      definition: definitionV1("first"),
      semanticOccurrenceId: null,
    });
    const second = coordinator.replaceTransientPrimary({
      expected: first.handle!,
      definition: definitionV1("second"),
      semanticOccurrenceId: null,
    });
    const beforeStale = coordinator.getSnapshot();

    const stale = coordinator.replaceTransientPrimary({
      expected: first.handle!,
      definition: definitionV1("stale"),
      semanticOccurrenceId: null,
    });

    expect(stale).toMatchObject({
      receipt: { kind: "stale", code: "surface.stale_topology_revision" },
      handle: null,
    });
    expect(coordinator.getSnapshot()).toBe(beforeStale);

    const third = coordinator.replaceTransientPrimary({
      expected: coordinator.getHandle(second.handle!.surfaceInstanceId)!,
      definition: definitionV1("third"),
      semanticOccurrenceId: null,
    });
    expect(third).toMatchObject({
      receipt: { kind: "applied", code: "surface.replaced" },
      handle: {
        topologyRevision: 3,
        surfaceInstanceId: "surface-instance.e8.n4",
      },
    });
  });

  it("isolates subscriber and failure-sink exceptions after committing the publication", () => {
    const failures: unknown[] = [];
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(9),
      reportSubscriberFailure(failure) {
        failures.push(failure);
        throw new Error("failure-sink");
      },
    });
    const healthy = vi.fn(() => {
      expect(coordinator.getSnapshot().topologyRevision).toBe(1);
    });
    const unsubscribe = coordinator.subscribe(() => {
      throw new Error("subscriber");
    });
    coordinator.subscribe(healthy);

    expect(() =>
      coordinator.openTransientPrimary({
        definition: definitionV1("inventory"),
        semanticOccurrenceId: null,
      })
    ).not.toThrow();

    expect(healthy).toHaveBeenCalledOnce();
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({
      code: "surface.subscriber_failed",
      summary: "Managed Surface publication subscriber failed.",
      details: {},
    });
    expect(Object.isFrozen(failures[0])).toBe(true);
    expect(Object.isFrozen((failures[0] as { details: object }).details)).toBe(true);

    unsubscribe();
    unsubscribe();
  });

  it("publishes owner and coordinator disposal atomically, then seals the store", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(10),
    });
    coordinator.openTransientPrimary({
      definition: definitionV1("workspace"),
      semanticOccurrenceId: null,
    });
    coordinator.openTransientPrimary({
      definition: definitionV1("system", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputContextId: "system",
      }),
      semanticOccurrenceId: null,
    });
    const observations: ReturnType<typeof coordinator.getSnapshot>[] = [];
    const unsubscribe = coordinator.subscribe(() => observations.push(coordinator.getSnapshot()));

    expect(
      coordinator.disposeOwner(parseManagedSurfaceOwnerIdV1("surface-owner.system")),
    ).toMatchObject({
      kind: "applied",
      code: "surface.owner_disposed",
    });
    expect(coordinator.getSnapshot().inputOwner?.surfaceInstanceId).toBe("surface-instance.e10.n1");

    expect(coordinator.dispose()).toMatchObject({
      kind: "applied",
      code: "surface.coordinator_disposed",
    });
    const terminal = coordinator.getSnapshot();
    expect(terminal).toMatchObject({
      topologyRevision: 4,
      orderedInstances: [],
      inputOwner: null,
      focusOwner: null,
      coordinatorDisposed: true,
    });
    expect(observations).toHaveLength(2);
    expect(observations[1]).toBe(terminal);

    expect(coordinator.dispose()).toMatchObject({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
    });
    expect(observations).toHaveLength(2);
    expect(() => coordinator.subscribe(vi.fn())).toThrowError(
      "ui.managed_surface_coordinator_disposed",
    );

    const postDispose = coordinator.openTransientPrimary({
      definition: definitionV1("later", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.later"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.later"),
      }),
      semanticOccurrenceId: null,
    });
    expect(postDispose).toMatchObject({
      receipt: { kind: "rejected", code: "surface.coordinator_disposed" },
      handle: null,
    });
    expect(coordinator.getSnapshot()).toBe(terminal);
    expect(observations).toHaveLength(2);

    unsubscribe();
    unsubscribe();
  });

  it("treats caller-supplied handles as immutable evidence values", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(11),
    });
    const opened = coordinator.openTransientPrimary({
      definition: definitionV1("inventory"),
      semanticOccurrenceId: null,
    });
    const copiedHandle: ManagedSurfaceHandleV1 = {
      applicationEpoch: opened.handle!.applicationEpoch,
      topologyRevision: opened.handle!.topologyRevision,
      surfaceInstanceId: opened.handle!.surfaceInstanceId,
    };

    expect(coordinator.closeExpected(copiedHandle)).toMatchObject({
      kind: "applied",
      code: "surface.closed",
    });
  });

  it("closes the current top explicitly without treating dismiss policy as close authority", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(12),
    });
    const parent = coordinator.openTransientPrimary({
      definition: definitionV1("workspace"),
      semanticOccurrenceId: null,
    });
    coordinator.pushTransientChild({
      parent: parent.handle!,
      definition: childDefinitionV1("detail"),
      semanticOccurrenceId: null,
    });
    const locked = coordinator.openTransientPrimary({
      definition: definitionV1("locked", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputContextId: "system",
        dismissPolicy: {
          back: false,
          escape: false,
          backdrop: false,
          routedCancel: false,
        },
      }),
      semanticOccurrenceId: null,
    });
    const listener = vi.fn();
    coordinator.subscribe(listener);

    expect(coordinator.routeDismiss(locked.handle!, "back")).toMatchObject({
      kind: "rejected",
      code: "surface.dismiss_locked",
    });
    expect(listener).not.toHaveBeenCalled();

    coordinator.openTransientPrimary({
      definition: definitionV1("higher-nonblocking", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.debug"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.debug"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.debug"),
        layerOrder: parseNonNegativeSafeInteger(90),
        inputContextId: "debug",
      }),
      semanticOccurrenceId: null,
    });
    expect(coordinator.getSnapshot().topmostBlockingInstanceId).toBe("surface-instance.e12.n3");
    expect(coordinator.getSnapshot().inputOwner?.surfaceInstanceId).toBe("surface-instance.e12.n4");
    listener.mockClear();

    expect(coordinator.closeTop()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: "surface-instance.e12.n4",
    });
    expect(coordinator.getSnapshot().inputOwner?.surfaceInstanceId).toBe("surface-instance.e12.n3");
    expect(coordinator.closeTop()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: "surface-instance.e12.n3",
    });
    expect(coordinator.getSnapshot().inputOwner?.surfaceInstanceId).toBe("surface-instance.e12.n2");
    expect(coordinator.closeTop()).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e12.n2",
    });
    expect(coordinator.closeTop()).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e12.n1",
    });
    const empty = coordinator.getSnapshot();
    expect(coordinator.closeTop()).toMatchObject({
      kind: "unchanged",
      code: "surface.already_closed",
    });
    expect(coordinator.getSnapshot()).toBe(empty);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("closes an owner's live topology without permanently disposing that owner", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(13),
    });
    coordinator.openTransientPrimary({
      definition: definitionV1("workspace"),
      semanticOccurrenceId: null,
    });
    const system = coordinator.openTransientPrimary({
      definition: definitionV1("system", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputContextId: "system",
      }),
      semanticOccurrenceId: null,
    });
    const systemOwnerId = parseManagedSurfaceOwnerIdV1("surface-owner.system");
    coordinator.pushTransientChild({
      parent: system.handle!,
      definition: definitionV1("system-detail", {
        ownerId: systemOwnerId,
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.system-detail"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(90),
        placement: "child",
        slotCardinality: "stack",
        allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.system")],
        modality: "blocking",
        inputContextId: "system",
      }),
      semanticOccurrenceId: null,
    });
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const firstOwnerHandle = coordinator.getOwnerHandle(systemOwnerId);
    expect(firstOwnerHandle).toEqual({
      applicationEpoch: 13,
      topologyRevision: 3,
      ownerId: "surface-owner.system",
    });
    expect(Object.isFrozen(firstOwnerHandle)).toBe(true);
    expect(coordinator.closeOwner(firstOwnerHandle!)).toMatchObject({
      kind: "applied",
      code: "surface.owner_closed",
      beforeTopologyRevision: 3,
      afterTopologyRevision: 4,
    });
    expect(coordinator.getSnapshot().orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.e13.n1" },
    ]);
    expect(coordinator.getSnapshot().inputOwner?.surfaceInstanceId).toBe("surface-instance.e13.n1");
    expect(coordinator.getSnapshot().focusOwner?.surfaceInstanceId).toBe("surface-instance.e13.n1");
    expect(listener).toHaveBeenCalledOnce();

    const reopened = coordinator.openTransientPrimary({
      definition: definitionV1("system-reopened", {
        ownerId: systemOwnerId,
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputContextId: "system",
      }),
      semanticOccurrenceId: null,
    });
    expect(reopened).toMatchObject({
      receipt: { kind: "applied", code: "surface.opened" },
      handle: { surfaceInstanceId: "surface-instance.e13.n4" },
    });
    expect(coordinator.getSnapshot().orderedInstances[1]).toMatchObject({
      target: { occurrenceId: "surface-occurrence.e13.n4" },
      surfaceInstanceId: "surface-instance.e13.n4",
      routingLeaseId: "surface-lease.e13.n4",
    });
    expect(listener).toHaveBeenCalledTimes(2);
    const beforeStale = coordinator.getSnapshot();
    listener.mockClear();
    expect(coordinator.closeOwner(firstOwnerHandle!)).toMatchObject({
      kind: "stale",
      code: "surface.stale_topology_revision",
    });
    expect(coordinator.getSnapshot()).toBe(beforeStale);
    expect(listener).not.toHaveBeenCalled();

    expect(coordinator.closeOwner(coordinator.getOwnerHandle(systemOwnerId)!)).toMatchObject({
      kind: "applied",
      code: "surface.owner_closed",
    });
    const afterClose = coordinator.getSnapshot();
    listener.mockClear();

    expect(coordinator.getOwnerHandle(systemOwnerId)).toBeNull();
    expect(coordinator.getSnapshot()).toBe(afterClose);
    expect(listener).not.toHaveBeenCalled();
  });
});
