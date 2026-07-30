// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceInstanceIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceRoutingLeaseIdV1,
  parseManagedSurfaceSlotIdV1,
  parseManagedSurfaceTargetOccurrenceIdV1,
  type ManagedSurfaceCandidateV1,
  type ManagedSurfaceResolvedDefinitionV1,
} from "./managed-surface-contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
  type ManagedSurfaceReducerStateV1,
} from "./managed-surface-reducer.ts";

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

function candidateV1(
  suffix: string,
  overrides: Partial<ManagedSurfaceCandidateV1> = {},
): ManagedSurfaceCandidateV1 {
  return {
    definition: definitionV1(suffix),
    target: {
      kind: "transient",
      occurrenceId: parseManagedSurfaceTargetOccurrenceIdV1(`surface-occurrence.${suffix}`),
    },
    surfaceInstanceId: parseManagedSurfaceInstanceIdV1(`surface-instance.${suffix}`),
    routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(`surface-lease.${suffix}`),
    semanticOccurrenceId: null,
    ...overrides,
  };
}

function openPrimaryV1(state: ManagedSurfaceReducerStateV1, candidate: ManagedSurfaceCandidateV1) {
  return reduceManagedSurfaceV1(state, {
    kind: "open_primary",
    applicationEpoch: state.publication.applicationEpoch,
    candidate,
  });
}

describe("Managed Surface package-internal contracts", () => {
  it("uses the shared stable-ID grammar for every package-internal identity", () => {
    expect(parseManagedSurfaceDefinitionIdV1("surface.inventory")).toBe("surface.inventory");
    expect(parseManagedSurfaceOwnerIdV1("surface-owner.inventory")).toBe("surface-owner.inventory");
    expect(parseManagedSurfaceSlotIdV1("surface-slot.primary")).toBe("surface-slot.primary");
    expect(parseManagedSurfaceLayerIdV1("surface-layer.workspace")).toBe("surface-layer.workspace");
    expect(parseManagedSurfaceTargetOccurrenceIdV1("surface-occurrence.first")).toBe(
      "surface-occurrence.first",
    );
    expect(parseManagedSurfaceInstanceIdV1("surface-instance.first")).toBe(
      "surface-instance.first",
    );
    expect(parseManagedSurfaceRoutingLeaseIdV1("surface-lease.first")).toBe("surface-lease.first");
    expect(parseManagedSurfaceFocusTargetIdV1("focus-target.first")).toBe("focus-target.first");
    expect(parseManagedSurfaceActionIdV1("surface-action.activate")).toBe(
      "surface-action.activate",
    );

    expect(() => parseManagedSurfaceDefinitionIdV1("Inventory")).toThrow("invalid ModuleId");
  });
});

describe("reduceManagedSurfaceV1", () => {
  it("opens one synchronous primary into one deeply frozen atomic publication", () => {
    const initial = createManagedSurfaceReducerStateV1(4);
    const actionIds = [parseManagedSurfaceActionIdV1("surface-action.activate")];
    const allowedParentSlotIds: ReturnType<typeof parseManagedSurfaceSlotIdV1>[] = [];
    const dismissPolicy = {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    };
    const focusPolicy = {
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener" as const,
    };
    const target = {
      kind: "transient" as const,
      occurrenceId: parseManagedSurfaceTargetOccurrenceIdV1("surface-occurrence.inventory"),
    };
    const candidate = candidateV1("inventory", {
      definition: definitionV1("inventory", {
        actionIds,
        allowedParentSlotIds,
        dismissPolicy,
        focusPolicy,
      }),
      target,
    });

    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.publication)).toBe(true);
    expect(initial.publication).toEqual({
      applicationEpoch: 4,
      topologyRevision: 0,
      orderedInstances: [],
      topmostBlockingInstanceId: null,
      inputOwner: null,
      focusOwner: null,
      ownerTrace: [],
      coordinatorDisposed: false,
    });

    const result = openPrimaryV1(initial, candidate);
    actionIds.push(parseManagedSurfaceActionIdV1("surface-action.after-open"));
    allowedParentSlotIds.push(parseManagedSurfaceSlotIdV1("surface-slot.after-open"));
    dismissPolicy.escape = false;
    focusPolicy.trap = false;
    target.occurrenceId = parseManagedSurfaceTargetOccurrenceIdV1("surface-occurrence.after-open");

    expect(result.receipt).toEqual({
      kind: "applied",
      code: "surface.opened",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
      surfaceInstanceId: "surface-instance.inventory",
    });
    expect(result.state).not.toBe(initial);
    expect(result.state.publication).not.toBe(initial.publication);
    expect(result.state.publication.orderedInstances).toHaveLength(1);
    expect(result.state.publication.orderedInstances[0]).toMatchObject({
      surfaceInstanceId: "surface-instance.inventory",
      parentInstanceId: null,
      phase: "active",
      readiness: { kind: "ready" },
      target: {
        kind: "transient",
        occurrenceId: "surface-occurrence.inventory",
      },
    });
    expect(result.state.publication.orderedInstances[0]).not.toHaveProperty(
      "sourcePublicationRevision",
    );
    expect(result.state.publication.orderedInstances[0]?.definition.actionIds).toEqual([
      "surface-action.activate",
    ]);
    expect(result.state.publication.orderedInstances[0]?.definition.allowedParentSlotIds).toEqual(
      [],
    );
    expect(result.state.publication.orderedInstances[0]?.definition.dismissPolicy.escape).toBe(
      true,
    );
    expect(result.state.publication.orderedInstances[0]?.definition.focusPolicy.trap).toBe(true);
    expect(result.state.publication.inputOwner).toEqual({
      surfaceInstanceId: "surface-instance.inventory",
      inputContextId: "overlay",
      routingLeaseId: "surface-lease.inventory",
    });
    const inputRouter = createInputRouterV1();
    expect(() =>
      inputRouter.register({
        context: result.state.publication.inputOwner!.inputContextId,
        handle: () => ({ kind: "ignored" }),
      }),
    ).not.toThrow();
    expect(result.state.publication.focusOwner).toEqual({
      surfaceInstanceId: "surface-instance.inventory",
      initialTargetId: "focus-target.primary",
      trap: true,
      restore: "opener",
    });
    expect(result.state.publication.ownerTrace).toEqual([
      {
        ownerId: "surface-owner.workspace",
        surfaceInstanceIds: ["surface-instance.inventory"],
      },
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.state.publication)).toBe(true);
    expect(Object.isFrozen(result.state.publication.orderedInstances)).toBe(true);
    expect(Object.isFrozen(result.state.publication.orderedInstances[0])).toBe(true);
    expect(Object.isFrozen(result.state.publication.orderedInstances[0]?.target)).toBe(true);
    expect(Object.isFrozen(result.state.publication.orderedInstances[0]?.readiness)).toBe(true);
    expect(Object.isFrozen(result.state.publication.orderedInstances[0]?.definition)).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.actionIds),
    ).toBe(true);
    expect(
      Object.isFrozen(
        result.state.publication.orderedInstances[0]?.definition.allowedParentSlotIds,
      ),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.dismissPolicy),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.focusPolicy),
    ).toBe(true);
    expect(Object.isFrozen(result.state.publication.inputOwner)).toBe(true);
    expect(Object.isFrozen(result.state.publication.focusOwner)).toBe(true);
    expect(Object.isFrozen(result.state.publication.ownerTrace)).toBe(true);
    expect(Object.isFrozen(result.state.publication.ownerTrace[0]?.surfaceInstanceIds)).toBe(true);
  });

  it("derives suspension, render order, blocking, input, and focus from one topology", () => {
    let state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(1),
      candidateV1("workspace"),
    ).state;
    const blocking = candidateV1("confirm", {
      definition: definitionV1("confirm", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputContextId: "system",
        focusPolicy: {
          initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.confirm"),
          trap: true,
          restore: "opener",
        },
      }),
    });

    state = openPrimaryV1(state, blocking).state;

    expect(
      state.publication.orderedInstances.map(({ surfaceInstanceId, phase }) => ({
        surfaceInstanceId,
        phase,
      })),
    ).toEqual([
      { surfaceInstanceId: "surface-instance.workspace", phase: "suspended" },
      { surfaceInstanceId: "surface-instance.confirm", phase: "active" },
    ]);
    expect(state.publication.topmostBlockingInstanceId).toBe("surface-instance.confirm");
    expect(state.publication.inputOwner?.surfaceInstanceId).toBe("surface-instance.confirm");
    expect(state.publication.focusOwner?.surfaceInstanceId).toBe("surface-instance.confirm");

    const closed = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(1),
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: blocking.surfaceInstanceId,
      },
    });

    expect(closed.receipt.kind).toBe("applied");
    expect(closed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.workspace", phase: "active" },
    ]);
    expect(closed.state.publication.topmostBlockingInstanceId).toBeNull();
    expect(closed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      "surface-instance.workspace",
    );
  });

  it("pushes and dismisses a child in parent-first topology order", () => {
    let state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(2),
      candidateV1("inventory"),
    ).state;
    const child = candidateV1("item", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
        slotCardinality: "stack",
        allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
      }),
    });

    const pushed = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      applicationEpoch: state.publication.applicationEpoch,
      parentInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory"),
      candidate: child,
    });
    state = pushed.state;

    expect(pushed.receipt.code).toBe("surface.child_pushed");
    expect(
      state.publication.orderedInstances.map(({ surfaceInstanceId, parentInstanceId, phase }) => ({
        surfaceInstanceId,
        parentInstanceId,
        phase,
      })),
    ).toEqual([
      {
        surfaceInstanceId: "surface-instance.inventory",
        parentInstanceId: null,
        phase: "active",
      },
      {
        surfaceInstanceId: "surface-instance.item",
        parentInstanceId: "surface-instance.inventory",
        phase: "active",
      },
    ]);
    expect(state.publication.inputOwner?.surfaceInstanceId).toBe("surface-instance.item");

    const dismissed = reduceManagedSurfaceV1(state, {
      kind: "route_dismiss",
      dismissKind: "back",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(2),
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: child.surfaceInstanceId,
      },
    });

    expect(dismissed.receipt).toMatchObject({
      kind: "applied",
      code: "surface.dismissed",
      surfaceInstanceId: "surface-instance.item",
    });
    expect(dismissed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.inventory", phase: "active" },
    ]);
  });

  it("closes an expected parent and its subtree without guessing the current top", () => {
    const primary = candidateV1("inventory");
    let state = openPrimaryV1(createManagedSurfaceReducerStateV1(2), primary).state;
    const child = candidateV1("item", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
        slotCardinality: "stack",
        allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
      }),
    });
    state = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      applicationEpoch: state.publication.applicationEpoch,
      parentInstanceId: primary.surfaceInstanceId,
      candidate: child,
    }).state;

    const closed = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(2),
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: primary.surfaceInstanceId,
      },
    });

    expect(closed.receipt).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: "surface-instance.inventory",
    });
    expect(closed.state.publication.orderedInstances).toEqual([]);
  });

  it("replaces a primary with fresh identity and atomically retires its subtree", () => {
    let state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(3),
      candidateV1("inventory-first"),
    ).state;
    const child = candidateV1("item-first", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        placement: "child",
        slotCardinality: "stack",
        allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
      }),
    });
    state = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      applicationEpoch: state.publication.applicationEpoch,
      parentInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory-first"),
      candidate: child,
    }).state;

    const replacement = candidateV1("inventory-second", {
      definition: definitionV1("inventory-first"),
    });
    const replaced = reduceManagedSurfaceV1(state, {
      kind: "replace_primary",
      applicationEpoch: state.publication.applicationEpoch,
      candidate: replacement,
    });

    expect(replaced.receipt).toMatchObject({
      kind: "applied",
      code: "surface.replaced",
      surfaceInstanceId: "surface-instance.inventory-second",
    });
    expect(replaced.state.publication.topologyRevision).toBe(
      state.publication.topologyRevision + 1,
    );
    expect(replaced.state.publication.orderedInstances).toMatchObject([
      {
        surfaceInstanceId: "surface-instance.inventory-second",
        parentInstanceId: null,
        phase: "active",
      },
    ]);

    const staleOldInstance = reduceManagedSurfaceV1(replaced.state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(3),
        topologyRevision: replaced.state.publication.topologyRevision,
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory-first"),
      },
    });
    expect(staleOldInstance.receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(staleOldInstance.state).toBe(replaced.state);

    const reusedChildOccurrence = openPrimaryV1(
      replaced.state,
      candidateV1("reuse-child-occurrence", {
        target: child.target,
        definition: definitionV1("reuse-child-occurrence", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    );
    expect(reusedChildOccurrence.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_occurrence",
    });
    expect(reusedChildOccurrence.state).toBe(replaced.state);

    const reusedRootInstance = openPrimaryV1(
      replaced.state,
      candidateV1("reuse-root-instance", {
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory-first"),
        definition: definitionV1("reuse-root-instance", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    );
    expect(reusedRootInstance.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_instance",
    });
    expect(reusedRootInstance.state).toBe(replaced.state);
  });

  it("rejects duplicate identity, occupied slots, and invalid parents atomically", () => {
    let state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(4),
      candidateV1("inventory"),
    ).state;

    const cases = [
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("duplicate-occurrence", {
            target: {
              kind: "transient",
              occurrenceId: parseManagedSurfaceTargetOccurrenceIdV1("surface-occurrence.inventory"),
            },
            definition: definitionV1("duplicate-occurrence", {
              ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
            }),
          }),
        },
        code: "surface.duplicate_occurrence",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("duplicate-instance", {
            surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory"),
            definition: definitionV1("duplicate-instance", {
              ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
            }),
          }),
        },
        code: "surface.duplicate_instance",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("duplicate-lease", {
            routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.inventory"),
            definition: definitionV1("duplicate-lease", {
              ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
            }),
          }),
        },
        code: "surface.duplicate_routing_lease",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("occupied"),
        },
        code: "surface.slot_occupied",
      },
      {
        operation: {
          kind: "push_child" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          parentInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.unknown"),
          candidate: candidateV1("orphan", {
            definition: definitionV1("orphan", {
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
              placement: "child",
              slotCardinality: "stack",
              allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
            }),
          }),
        },
        code: "surface.invalid_parent",
      },
      {
        operation: {
          kind: "push_child" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          parentInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory"),
          candidate: candidateV1("child-below-parent", {
            definition: definitionV1("child-below-parent", {
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
              layerOrder: parseNonNegativeSafeInteger(10),
              placement: "child",
              slotCardinality: "stack",
              allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
            }),
          }),
        },
        code: "surface.invalid_parent",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("child-as-primary", {
            definition: definitionV1("child-as-primary", {
              placement: "child",
              allowedParentSlotIds: [parseManagedSurfaceSlotIdV1("surface-slot.primary")],
            }),
          }),
        },
        code: "surface.invalid_transition",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1("stack-as-primary", {
            definition: definitionV1("stack-as-primary", {
              ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.stack"),
              slotCardinality: "stack",
            }),
          }),
        },
        code: "surface.invalid_transition",
      },
    ] as const;

    for (const testCase of cases) {
      const result = reduceManagedSurfaceV1(state, testCase.operation);
      expect(result.receipt).toMatchObject({
        kind: "rejected",
        code: testCase.code,
      });
      expect(result.state).toBe(state);
      expect(result.state.publication).toBe(state.publication);
    }
  });

  it("never lets stale epoch, revision, or instance evidence mutate the current topology", () => {
    const state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(9),
      candidateV1("inventory"),
    ).state;
    const staleOpen = reduceManagedSurfaceV1(state, {
      kind: "open_primary",
      applicationEpoch: parseNonNegativeSafeInteger(8),
      candidate: candidateV1("stale-open", {
        definition: definitionV1("stale-open", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    });
    expect(staleOpen.receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_application_epoch",
    });
    expect(staleOpen.state).toBe(state);

    const evidenceCases = [
      {
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(8),
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory"),
        },
        code: "surface.stale_application_epoch",
      },
      {
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(9),
          topologyRevision: parseNonNegativeSafeInteger(0),
          surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.inventory"),
        },
        code: "surface.stale_topology_revision",
      },
      {
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(9),
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.old"),
        },
        code: "surface.stale_instance",
      },
    ] as const;

    for (const testCase of evidenceCases) {
      const result = reduceManagedSurfaceV1(state, {
        kind: "close_expected",
        evidence: testCase.evidence,
      });
      expect(result.receipt).toMatchObject({
        kind: "stale",
        code: testCase.code,
      });
      expect(result.state).toBe(state);
      expect(result.receipt.beforeTopologyRevision).toBe(result.receipt.afterTopologyRevision);
    }
  });

  it("blocks every dismiss route without falling through but allows explicit close", () => {
    const locked = candidateV1("locked", {
      definition: definitionV1("locked", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
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
    });
    const background = openPrimaryV1(
      createManagedSurfaceReducerStateV1(5),
      candidateV1("background"),
    );
    const opened = openPrimaryV1(background.state, locked);

    for (const dismissKind of ["back", "escape", "backdrop", "routed_cancel"] as const) {
      const result = reduceManagedSurfaceV1(opened.state, {
        kind: "route_dismiss",
        dismissKind,
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(5),
          topologyRevision: opened.state.publication.topologyRevision,
          surfaceInstanceId: locked.surfaceInstanceId,
        },
      });
      expect(result.receipt).toMatchObject({
        kind: "rejected",
        code: "surface.dismiss_locked",
      });
      expect(result.state).toBe(opened.state);
      expect(result.state.publication.orderedInstances).toMatchObject([
        { surfaceInstanceId: "surface-instance.background", phase: "suspended" },
        { surfaceInstanceId: "surface-instance.locked", phase: "active" },
      ]);
    }

    const explicitlyClosed = reduceManagedSurfaceV1(opened.state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(5),
        topologyRevision: opened.state.publication.topologyRevision,
        surfaceInstanceId: locked.surfaceInstanceId,
      },
    });
    expect(explicitlyClosed.receipt).toMatchObject({
      kind: "applied",
      code: "surface.closed",
    });
    expect(explicitlyClosed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.background", phase: "active" },
    ]);
    expect(explicitlyClosed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      "surface-instance.background",
    );
  });

  it("rejects occurrence and instance ABA reuse after close", () => {
    const original = candidateV1("first");
    let state = openPrimaryV1(createManagedSurfaceReducerStateV1(6), original).state;
    state = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(6),
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: original.surfaceInstanceId,
      },
    }).state;

    const reusedOccurrence = openPrimaryV1(
      state,
      candidateV1("second", { target: original.target }),
    );
    expect(reusedOccurrence.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_occurrence",
    });
    expect(reusedOccurrence.state).toBe(state);

    const reusedInstance = openPrimaryV1(
      state,
      candidateV1("third", { surfaceInstanceId: original.surfaceInstanceId }),
    );
    expect(reusedInstance.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_instance",
    });
    expect(reusedInstance.state).toBe(state);

    const reusedLease = openPrimaryV1(
      state,
      candidateV1("fourth", { routingLeaseId: original.routingLeaseId }),
    );
    expect(reusedLease.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_routing_lease",
    });
    expect(reusedLease.state).toBe(state);
  });

  it("disposes one owner and then the coordinator without leaving live topology", () => {
    let state = openPrimaryV1(
      createManagedSurfaceReducerStateV1(7),
      candidateV1("workspace"),
    ).state;
    state = openPrimaryV1(
      state,
      candidateV1("system", {
        definition: definitionV1("system", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
          layerOrder: parseNonNegativeSafeInteger(80),
          modality: "blocking",
          inputContextId: "system",
        }),
      }),
    ).state;

    const ownerDisposed = reduceManagedSurfaceV1(state, {
      kind: "dispose_owner",
      applicationEpoch: state.publication.applicationEpoch,
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
    });
    expect(ownerDisposed.receipt).toMatchObject({
      kind: "applied",
      code: "surface.owner_disposed",
    });
    expect(ownerDisposed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: "surface-instance.workspace", phase: "active" },
    ]);
    expect(ownerDisposed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      "surface-instance.workspace",
    );
    expect(ownerDisposed.state.publication.focusOwner?.surfaceInstanceId).toBe(
      "surface-instance.workspace",
    );
    expect(ownerDisposed.state.publication.ownerTrace).toEqual([
      {
        ownerId: "surface-owner.workspace",
        surfaceInstanceIds: ["surface-instance.workspace"],
      },
    ]);
    const rejectedOwner = openPrimaryV1(
      ownerDisposed.state,
      candidateV1("system-later", {
        definition: definitionV1("system-later", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.system-later"),
        }),
      }),
    );
    expect(rejectedOwner.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.owner_disposed",
    });
    expect(rejectedOwner.state).toBe(ownerDisposed.state);

    const disposed = reduceManagedSurfaceV1(ownerDisposed.state, {
      kind: "dispose_coordinator",
    });
    expect(disposed.receipt).toMatchObject({
      kind: "applied",
      code: "surface.coordinator_disposed",
    });
    expect(disposed.state.publication.orderedInstances).toEqual([]);
    expect(disposed.state.publication.inputOwner).toBeNull();
    expect(disposed.state.publication.focusOwner).toBeNull();
    expect(disposed.state.publication.coordinatorDisposed).toBe(true);

    const repeated = reduceManagedSurfaceV1(disposed.state, {
      kind: "dispose_coordinator",
    });
    expect(repeated.receipt).toMatchObject({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
    });
    expect(repeated.state).toBe(disposed.state);

    const rejected = openPrimaryV1(
      disposed.state,
      candidateV1("after-dispose", {
        definition: definitionV1("after-dispose", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    );
    expect(rejected.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.coordinator_disposed",
    });
    expect(rejected.state).toBe(disposed.state);
  });
});
