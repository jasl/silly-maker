// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
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
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "./managed-surface-contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
  type ManagedSurfaceReducerStateV1,
} from "./managed-surface-reducer.ts";
import { createManagedSurfaceTransientIdentityV1 } from "./managed-surface-identity.ts";

const resolvedOwnerIdsV1 = Object.freeze([
  parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
  parseManagedSurfaceOwnerIdV1("surface-owner.system"),
  parseManagedSurfaceOwnerIdV1("surface-owner.other"),
]);
const primaryDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1("surface.primary");
const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.system-later"),
      cardinality: "single",
    },
    {
      kind: "child",
      parentDefinitionId: primaryDefinitionIdV1,
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
      cardinality: "stack",
    },
    {
      kind: "child",
      parentDefinitionId: primaryDefinitionIdV1,
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.stack"),
      cardinality: "stack",
    },
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function createReducerStateV1(
  applicationEpoch: number,
  resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[] = resolvedOwnerIdsV1,
  resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[] =
    resolvedSlotDescriptorsV1,
): ManagedSurfaceReducerStateV1 {
  return createManagedSurfaceReducerStateV1(
    applicationEpoch,
    resolvedOwnerIds,
    resolvedSlotDescriptors,
  );
}

function definitionV1(
  _suffix: string,
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return {
    definitionId: primaryDefinitionIdV1,
    ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    modality: "non_blocking",
    inputPolicy: { kind: "managed", inputContextId: "overlay" },
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    },
    navigationPolicy: { kind: "close" },
    actionIds: [parseManagedSurfaceActionIdV1("surface-action.activate")],
    ...overrides,
  };
}

function candidateV1(
  state: ManagedSurfaceReducerStateV1,
  suffix: string,
  overrides: Partial<ManagedSurfaceCandidateV1> = {},
): ManagedSurfaceCandidateV1 {
  const identity = createManagedSurfaceTransientIdentityV1(
    state.publication.applicationEpoch,
    parsePositiveSafeInteger(state.identitySequenceHighWater + 1),
  );
  return {
    identityAllocation: identity.allocation,
    definition: definitionV1(suffix),
    target: {
      kind: "transient",
      occurrenceId: identity.occurrenceId,
    },
    surfaceInstanceId: identity.surfaceInstanceId,
    routingLeaseId: identity.routingLeaseId,
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

function expectRevisionDeltaV1(
  before: ManagedSurfaceReducerStateV1["publication"],
  after: ManagedSurfaceReducerStateV1["publication"],
  publicationDelta: number,
  topologyDelta: number,
): void {
  expect(after.publicationRevision - before.publicationRevision).toBe(publicationDelta);
  expect(after.topologyRevision - before.topologyRevision).toBe(topologyDelta);
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
    const initial = createReducerStateV1(4);
    const actionIds = [parseManagedSurfaceActionIdV1("surface-action.activate")];
    const dismissPolicy = {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    };
    const focusPolicy = {
      kind: "owns_focus" as const,
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener" as const,
    };
    const candidate = candidateV1(initial, "inventory", {
      definition: definitionV1("inventory", {
        actionIds,
        dismissPolicy,
        focusPolicy,
      }),
    });
    const target = candidate.target as {
      occurrenceId: ReturnType<typeof parseManagedSurfaceTargetOccurrenceIdV1>;
    };
    const originalOccurrenceId = target.occurrenceId;

    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.publication)).toBe(true);
    expect(initial.publication).toEqual({
      applicationEpoch: 4,
      publicationRevision: 0,
      topologyRevision: 0,
      orderedInstances: [],
      topmostBlockingInstanceId: null,
      inputOwner: null,
      focusOwner: null,
      navigationTargetInstanceId: null,
      ownerTrace: [],
      coordinatorDisposed: false,
    });

    const result = openPrimaryV1(initial, candidate);
    actionIds.push(parseManagedSurfaceActionIdV1("surface-action.after-open"));
    dismissPolicy.escape = false;
    focusPolicy.trap = false;
    target.occurrenceId = parseManagedSurfaceTargetOccurrenceIdV1("surface-occurrence.after-open");

    expect(result.receipt).toEqual({
      kind: "applied",
      code: "surface.opened",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
      surfaceInstanceId: candidate.surfaceInstanceId,
    });
    expect(result.state).not.toBe(initial);
    expect(result.state.publication).not.toBe(initial.publication);
    expect(result.state.publication.orderedInstances).toHaveLength(1);
    expect(result.state.publication.orderedInstances[0]).toMatchObject({
      surfaceInstanceId: candidate.surfaceInstanceId,
      parentInstanceId: null,
      phase: "active",
      readiness: { kind: "ready" },
      target: {
        kind: "transient",
        occurrenceId: originalOccurrenceId,
      },
    });
    expect(result.state.publication.orderedInstances[0]).not.toHaveProperty(
      "sourcePublicationRevision",
    );
    expect(result.state.publication.orderedInstances[0]?.definition.actionIds).toEqual([
      "surface-action.activate",
    ]);
    expect(result.state.publication.orderedInstances[0]?.definition).not.toHaveProperty(
      "slotCardinality",
    );
    expect(result.state.publication.orderedInstances[0]?.definition.dismissPolicy.escape).toBe(
      true,
    );
    expect(result.state.publication.orderedInstances[0]?.definition.focusPolicy).toEqual({
      kind: "owns_focus",
      initialTargetId: "focus-target.primary",
      trap: true,
      restore: "opener",
    });
    expect(result.state.publication.inputOwner).toEqual({
      surfaceInstanceId: candidate.surfaceInstanceId,
      inputContextId: "overlay",
      routingLeaseId: candidate.routingLeaseId,
    });
    const inputRouter = createInputRouterV1();
    expect(() =>
      inputRouter.register({
        context: result.state.publication.inputOwner!.inputContextId,
        handle: () => ({ kind: "ignored" }),
      })
    ).not.toThrow();
    expect(result.state.publication.focusOwner).toEqual({
      surfaceInstanceId: candidate.surfaceInstanceId,
      initialTargetId: "focus-target.primary",
      trap: true,
      restore: "opener",
    });
    expect(result.state.publication.navigationTargetInstanceId).toBe(candidate.surfaceInstanceId);
    expect(result.state.publication.ownerTrace).toEqual([
      {
        ownerId: "surface-owner.workspace",
        surfaceInstanceIds: [candidate.surfaceInstanceId],
        disposed: false,
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
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.inputPolicy),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.dismissPolicy),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.focusPolicy),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.publication.orderedInstances[0]?.definition.navigationPolicy),
    ).toBe(true);
    expect(Object.isFrozen(result.state.publication.inputOwner)).toBe(true);
    expect(Object.isFrozen(result.state.publication.focusOwner)).toBe(true);
    expect(Object.isFrozen(result.state.publication.ownerTrace)).toBe(true);
    expect(Object.isFrozen(result.state.publication.ownerTrace[0]?.surfaceInstanceIds)).toBe(true);
  });

  it("derives suspension, render order, blocking, input, and focus from one topology", () => {
    let state = createReducerStateV1(1);
    const workspace = candidateV1(state, "workspace");
    state = openPrimaryV1(state, workspace).state;
    const blocking = candidateV1(state, "confirm", {
      definition: definitionV1("confirm", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.system"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputPolicy: { kind: "managed", inputContextId: "system" },
        focusPolicy: {
          kind: "owns_focus",
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
      { surfaceInstanceId: workspace.surfaceInstanceId, phase: "suspended" },
      { surfaceInstanceId: blocking.surfaceInstanceId, phase: "active" },
    ]);
    expect(state.publication.topmostBlockingInstanceId).toBe(blocking.surfaceInstanceId);
    expect(state.publication.inputOwner?.surfaceInstanceId).toBe(blocking.surfaceInstanceId);
    expect(state.publication.focusOwner?.surfaceInstanceId).toBe(blocking.surfaceInstanceId);

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
      { surfaceInstanceId: workspace.surfaceInstanceId, phase: "active" },
    ]);
    expect(closed.state.publication.topmostBlockingInstanceId).toBeNull();
    expect(closed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      workspace.surfaceInstanceId,
    );
  });

  it.each([
    {
      label: "input without focus",
      overrides: {
        focusPolicy: { kind: "none" as const },
        navigationPolicy: { kind: "none" as const },
      },
      input: true,
      focus: false,
      navigation: false,
    },
    {
      label: "focus only",
      overrides: {
        inputPolicy: { kind: "none" as const },
        navigationPolicy: { kind: "none" as const },
      },
      input: false,
      focus: true,
      navigation: false,
    },
    {
      label: "passive",
      overrides: {
        inputPolicy: { kind: "none" as const },
        focusPolicy: { kind: "none" as const },
        navigationPolicy: { kind: "none" as const },
      },
      input: false,
      focus: false,
      navigation: false,
    },
    {
      label: "navigation only",
      overrides: {
        inputPolicy: { kind: "none" as const },
        focusPolicy: { kind: "none" as const },
      },
      input: false,
      focus: false,
      navigation: true,
    },
  ])("derives independent axes for $label", ({ overrides, input, focus, navigation }) => {
    const state = createReducerStateV1(20);
    const candidate = candidateV1(state, "axis", {
      definition: definitionV1("axis", overrides),
    });
    const opened = openPrimaryV1(state, candidate).state.publication;

    expect(opened.inputOwner?.surfaceInstanceId ?? null).toBe(
      input ? candidate.surfaceInstanceId : null,
    );
    expect(opened.focusOwner?.surfaceInstanceId ?? null).toBe(
      focus ? candidate.surfaceInstanceId : null,
    );
    expect(opened.navigationTargetInstanceId).toBe(
      navigation ? candidate.surfaceInstanceId : null,
    );
    expect(opened.topmostBlockingInstanceId).toBeNull();
  });

  it("lets a blocker suspend input without implicitly taking input or focus", () => {
    let state = createReducerStateV1(21);
    const lower = candidateV1(state, "lower");
    state = openPrimaryV1(state, lower).state;
    const blocker = candidateV1(state, "blocker", {
      definition: definitionV1("blocker", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputPolicy: { kind: "none" },
        focusPolicy: { kind: "none" },
        navigationPolicy: { kind: "close" },
      }),
    });
    state = openPrimaryV1(state, blocker).state;

    expect(state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: lower.surfaceInstanceId, phase: "suspended" },
      { surfaceInstanceId: blocker.surfaceInstanceId, phase: "active" },
    ]);
    expect(state.publication.topmostBlockingInstanceId).toBe(blocker.surfaceInstanceId);
    expect(state.publication.inputOwner).toBeNull();
    expect(state.publication.focusOwner).toBeNull();
    expect(state.publication.navigationTargetInstanceId).toBe(blocker.surfaceInstanceId);
  });

  it("keeps focus and navigation owners independent from a higher passive instance", () => {
    let state = createReducerStateV1(22);
    const navigation = candidateV1(state, "navigation", {
      definition: definitionV1("navigation", {
        inputPolicy: { kind: "none" },
        focusPolicy: { kind: "none" },
        navigationPolicy: { kind: "close" },
      }),
    });
    state = openPrimaryV1(state, navigation).state;
    const focusOnly = candidateV1(state, "focus-only", {
      definition: definitionV1("focus-only", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        layerOrder: parseNonNegativeSafeInteger(30),
        inputPolicy: { kind: "none" },
        navigationPolicy: { kind: "none" },
      }),
    });
    state = openPrimaryV1(state, focusOnly).state;

    expect(state.publication.inputOwner).toBeNull();
    expect(state.publication.focusOwner?.surfaceInstanceId).toBe(focusOnly.surfaceInstanceId);
    expect(state.publication.navigationTargetInstanceId).toBe(navigation.surfaceInstanceId);

    expect(
      reduceManagedSurfaceV1(state, {
        kind: "route_dismiss",
        dismissKind: "back",
        evidence: {
          applicationEpoch: state.publication.applicationEpoch,
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: focusOnly.surfaceInstanceId,
        },
      }).receipt,
    ).toMatchObject({ kind: "rejected", code: "surface.invalid_transition" });
    expect(
      reduceManagedSurfaceV1(state, {
        kind: "route_dismiss",
        dismissKind: "back",
        evidence: {
          applicationEpoch: state.publication.applicationEpoch,
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: navigation.surfaceInstanceId,
        },
      }).receipt,
    ).toMatchObject({
      kind: "applied",
      code: "surface.dismissed",
      surfaceInstanceId: navigation.surfaceInstanceId,
    });

    const closed = reduceManagedSurfaceV1(state, {
      kind: "close_top",
      applicationEpoch: state.publication.applicationEpoch,
    });
    expect(closed.receipt).toMatchObject({
      kind: "applied",
      surfaceInstanceId: navigation.surfaceInstanceId,
    });
    expect(closed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: focusOnly.surfaceInstanceId },
    ]);
    expect(closed.state.publication.navigationTargetInstanceId).toBeNull();
    expect(
      reduceManagedSurfaceV1(closed.state, {
        kind: "close_top",
        applicationEpoch: closed.state.publication.applicationEpoch,
      }).receipt,
    ).toMatchObject({ kind: "unchanged", code: "surface.already_closed" });
  });

  it("selects different active instances for input and focus ownership", () => {
    let state = createReducerStateV1(23);
    const focusOwner = candidateV1(state, "focus-owner", {
      definition: definitionV1("focus-owner", {
        inputPolicy: { kind: "none" },
        navigationPolicy: { kind: "none" },
      }),
    });
    state = openPrimaryV1(state, focusOwner).state;
    const inputOwner = candidateV1(state, "input-owner", {
      definition: definitionV1("input-owner", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        layerOrder: parseNonNegativeSafeInteger(30),
        focusPolicy: { kind: "none" },
        navigationPolicy: { kind: "none" },
      }),
    });
    state = openPrimaryV1(state, inputOwner).state;

    expect(state.publication.inputOwner?.surfaceInstanceId).toBe(inputOwner.surfaceInstanceId);
    expect(state.publication.focusOwner?.surfaceInstanceId).toBe(focusOwner.surfaceInstanceId);
  });

  it("pushes and dismisses a child in parent-first topology order", () => {
    let state = createReducerStateV1(2);
    const primary = candidateV1(state, "inventory");
    state = openPrimaryV1(state, primary).state;
    const child = candidateV1(state, "item", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
      }),
    });

    const pushed = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: primary.surfaceInstanceId,
      },
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
        surfaceInstanceId: primary.surfaceInstanceId,
        parentInstanceId: null,
        phase: "active",
      },
      {
        surfaceInstanceId: child.surfaceInstanceId,
        parentInstanceId: primary.surfaceInstanceId,
        phase: "active",
      },
    ]);
    expect(state.publication.inputOwner?.surfaceInstanceId).toBe(child.surfaceInstanceId);

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
      surfaceInstanceId: child.surfaceInstanceId,
    });
    expect(dismissed.state.publication.orderedInstances).toMatchObject([
      { surfaceInstanceId: primary.surfaceInstanceId, phase: "active" },
    ]);
  });

  it("closes an expected parent and its subtree without guessing the current top", () => {
    let state = createReducerStateV1(2);
    const primary = candidateV1(state, "inventory");
    state = openPrimaryV1(state, primary).state;
    const child = candidateV1(state, "item", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
      }),
    });
    state = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: primary.surfaceInstanceId,
      },
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
      surfaceInstanceId: primary.surfaceInstanceId,
    });
    expect(closed.state.publication.orderedInstances).toEqual([]);
  });

  it("replaces a primary with fresh identity and atomically retires its subtree", () => {
    let state = createReducerStateV1(3);
    const original = candidateV1(state, "inventory-first");
    state = openPrimaryV1(state, original).state;
    const child = candidateV1(state, "item-first", {
      definition: definitionV1("item", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        placement: "child",
      }),
    });
    state = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: original.surfaceInstanceId,
      },
      candidate: child,
    }).state;

    const replacement = candidateV1(state, "inventory-second", {
      definition: definitionV1("inventory-first"),
    });
    const replaced = reduceManagedSurfaceV1(state, {
      kind: "replace_primary",
      expected: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: original.surfaceInstanceId,
      },
      candidate: replacement,
    });

    expect(replaced.receipt).toMatchObject({
      kind: "applied",
      code: "surface.replaced",
      surfaceInstanceId: replacement.surfaceInstanceId,
    });
    expect(replaced.state.publication.topologyRevision).toBe(
      state.publication.topologyRevision + 1,
    );
    expect(replaced.state.publication.orderedInstances).toMatchObject([
      {
        surfaceInstanceId: replacement.surfaceInstanceId,
        parentInstanceId: null,
        phase: "active",
      },
    ]);

    const staleOldInstance = reduceManagedSurfaceV1(replaced.state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(3),
        topologyRevision: replaced.state.publication.topologyRevision,
        surfaceInstanceId: original.surfaceInstanceId,
      },
    });
    expect(staleOldInstance.receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
    });
    expect(staleOldInstance.state).toBe(replaced.state);

    const reusedChildOccurrence = openPrimaryV1(
      replaced.state,
      candidateV1(replaced.state, "reuse-child-occurrence", {
        target: child.target,
        definition: definitionV1("reuse-child-occurrence", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    );
    expect(reusedChildOccurrence.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.invalid_identity_allocation",
    });
    expect(reusedChildOccurrence.state).toBe(replaced.state);

    const reusedRootInstance = openPrimaryV1(
      replaced.state,
      candidateV1(replaced.state, "reuse-root-instance", {
        surfaceInstanceId: original.surfaceInstanceId,
        definition: definitionV1("reuse-root-instance", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        }),
      }),
    );
    expect(reusedRootInstance.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.invalid_identity_allocation",
    });
    expect(reusedRootInstance.state).toBe(replaced.state);
  });

  it("rejects duplicate identity, occupied slots, and invalid parents atomically", () => {
    let state = createReducerStateV1(4);
    const primary = candidateV1(state, "inventory");
    state = openPrimaryV1(state, primary).state;

    const cases = [
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1(state, "duplicate-occurrence", {
            target: primary.target,
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
          candidate: candidateV1(state, "duplicate-instance", {
            surfaceInstanceId: primary.surfaceInstanceId,
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
          candidate: candidateV1(state, "duplicate-lease", {
            routingLeaseId: primary.routingLeaseId,
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
          candidate: candidateV1(state, "occupied"),
        },
        code: "surface.slot_occupied",
      },
      {
        operation: {
          kind: "push_child" as const,
          parentEvidence: {
            applicationEpoch: parseNonNegativeSafeInteger(4),
            topologyRevision: state.publication.topologyRevision,
            surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.unknown"),
          },
          candidate: candidateV1(state, "orphan", {
            definition: definitionV1("orphan", {
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
              placement: "child",
            }),
          }),
        },
        code: "surface.stale_instance",
      },
      {
        operation: {
          kind: "push_child" as const,
          parentEvidence: {
            applicationEpoch: parseNonNegativeSafeInteger(4),
            topologyRevision: state.publication.topologyRevision,
            surfaceInstanceId: primary.surfaceInstanceId,
          },
          candidate: candidateV1(state, "child-below-parent", {
            definition: definitionV1("child-below-parent", {
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
              layerOrder: parseNonNegativeSafeInteger(10),
              placement: "child",
            }),
          }),
        },
        code: "surface.invalid_parent",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1(state, "child-as-primary", {
            definition: definitionV1("child-as-primary", {
              placement: "child",
            }),
          }),
        },
        code: "surface.slot_placement_mismatch",
      },
      {
        operation: {
          kind: "open_primary" as const,
          applicationEpoch: parseNonNegativeSafeInteger(4),
          candidate: candidateV1(state, "stack-as-primary", {
            definition: definitionV1("stack-as-primary", {
              ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
              slotId: parseManagedSurfaceSlotIdV1("surface-slot.stack"),
            }),
          }),
        },
        code: "surface.slot_placement_mismatch",
      },
    ] as const;

    for (const testCase of cases) {
      const result = reduceManagedSurfaceV1(state, testCase.operation);
      expect(result.receipt).toMatchObject({
        kind: testCase.code === "surface.stale_instance" ? "stale" : "rejected",
        code: testCase.code,
      });
      expect(result.state.publication).toBe(state.publication);
      if (
        testCase.code.startsWith("surface.duplicate_") ||
        testCase.code === "surface.slot_placement_mismatch"
      ) {
        expect(result.state).toBe(state);
        expect(result.state.identitySequenceHighWater).toBe(1);
      } else {
        expect(result.state).not.toBe(state);
        expect(result.state.identitySequenceHighWater).toBe(2);
      }
    }
  });

  it("scopes a single root slot globally instead of namespacing it by owner", () => {
    let state = createReducerStateV1(17);
    state = openPrimaryV1(state, candidateV1(state, "workspace")).state;
    const before = state.publication;
    const forgedDefinition: ManagedSurfaceResolvedDefinitionV1 = {
      ...definitionV1("other-owner-same-root", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
      }),
      // @ts-expect-error cardinality belongs to the resolved slot descriptor.
      slotCardinality: "stack",
    };
    const otherOwner = candidateV1(state, "other-owner-same-root", {
      definition: forgedDefinition,
    });

    const result = openPrimaryV1(state, otherOwner);

    expect(result.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.slot_occupied",
    });
    expect(result.state.publication).toBe(before);
    expect(result.state.publication.orderedInstances).toHaveLength(1);
  });

  it("freezes slot descriptors and rejects missing or mismatched slots before allocation", () => {
    const descriptors = [...resolvedSlotDescriptorsV1];
    const state = createReducerStateV1(18, resolvedOwnerIdsV1, descriptors);
    descriptors.push({
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.late"),
      cardinality: "single",
    });

    expect(state.resolvedSlotDescriptors).toEqual(resolvedSlotDescriptorsV1);
    expect(Object.isFrozen(state.resolvedSlotDescriptors)).toBe(true);
    expect(Object.isFrozen(state.resolvedSlotDescriptors[0])).toBe(true);
    expect(() =>
      createReducerStateV1(18, resolvedOwnerIdsV1, [
        resolvedSlotDescriptorsV1[0]!,
        resolvedSlotDescriptorsV1[0]!,
      ])
    ).toThrowError("ui.managed_surface_duplicate_slot_descriptor");

    const missing = openPrimaryV1(
      state,
      candidateV1(state, "missing-slot", {
        definition: definitionV1("missing-slot", {
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.missing"),
        }),
      }),
    );
    expect(missing.receipt).toEqual({
      kind: "rejected",
      code: "surface.slot_not_resolved",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 0,
    });
    expect(missing.state).toBe(state);
    expect(missing.state.identitySequenceHighWater).toBe(0);

    const mismatched = openPrimaryV1(
      state,
      candidateV1(state, "child-as-root", {
        definition: definitionV1("child-as-root", {
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
          placement: "child",
        }),
      }),
    );
    expect(mismatched.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.slot_placement_mismatch",
    });
    expect(mismatched.state).toBe(state);
    expect(mismatched.state.identitySequenceHighWater).toBe(0);

    const parent = candidateV1(state, "parent");
    const parentOpened = openPrimaryV1(state, parent).state;
    const missingChild = reduceManagedSurfaceV1(parentOpened, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: parentOpened.publication.applicationEpoch,
        topologyRevision: parentOpened.publication.topologyRevision,
        surfaceInstanceId: parent.surfaceInstanceId,
      },
      candidate: candidateV1(parentOpened, "missing-child", {
        definition: definitionV1("missing-child", {
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.missing-child"),
          placement: "child",
        }),
      }),
    });
    expect(missingChild.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.slot_not_resolved",
    });
    expect(missingChild.state).toBe(parentOpened);
    expect(missingChild.state.identitySequenceHighWater).toBe(1);
  });

  it("scopes single child slots by exact parent and does not require the parent to own input", () => {
    const singleChildDescriptors = resolvedSlotDescriptorsV1.map((descriptor) =>
      descriptor.kind === "child" && descriptor.slotId === "surface-slot.detail"
        ? Object.freeze({ ...descriptor, cardinality: "single" as const })
        : descriptor
    );
    let state = createReducerStateV1(19, resolvedOwnerIdsV1, singleChildDescriptors);
    const parentA = candidateV1(state, "parent-a");
    state = openPrimaryV1(state, parentA).state;
    const parentB = candidateV1(state, "parent-b", {
      definition: definitionV1("parent-b", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
        layerOrder: parseNonNegativeSafeInteger(25),
      }),
    });
    state = openPrimaryV1(state, parentB).state;
    expect(state.publication.inputOwner?.surfaceInstanceId).toBe(parentB.surfaceInstanceId);

    const childA = candidateV1(state, "child-a", {
      definition: definitionV1("child-a", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        placement: "child",
        layerOrder: parseNonNegativeSafeInteger(30),
      }),
    });
    const pushedA = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: parentA.surfaceInstanceId,
      },
      candidate: childA,
    });
    expect(pushedA.receipt).toMatchObject({ kind: "applied", code: "surface.child_pushed" });
    state = pushedA.state;

    const childB = candidateV1(state, "child-b", {
      definition: childA.definition,
    });
    const pushedB = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: parentB.surfaceInstanceId,
      },
      candidate: childB,
    });
    expect(pushedB.receipt).toMatchObject({ kind: "applied", code: "surface.child_pushed" });
    state = pushedB.state;

    const occupiedA = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: parentA.surfaceInstanceId,
      },
      candidate: candidateV1(state, "child-a-second", {
        definition: childA.definition,
      }),
    });
    expect(occupiedA.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.slot_occupied",
    });
    expect(occupiedA.state.publication).toBe(state.publication);
    expect(
      state.publication.orderedInstances.filter(
        (instance) => instance.definition.slotId === "surface-slot.detail",
      ).map((instance) => instance.parentInstanceId),
    ).toEqual([parentA.surfaceInstanceId, parentB.surfaceInstanceId]);
  });

  it("never lets stale epoch, revision, or instance evidence mutate the current topology", () => {
    let state = createReducerStateV1(9);
    const primary = candidateV1(state, "inventory");
    state = openPrimaryV1(state, primary).state;
    const staleOpen = reduceManagedSurfaceV1(state, {
      kind: "open_primary",
      applicationEpoch: parseNonNegativeSafeInteger(8),
      candidate: candidateV1(state, "stale-open", {
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
    expect(staleOpen.state).not.toBe(state);
    expect(staleOpen.state.publication).toBe(state.publication);
    expect(staleOpen.state.identitySequenceHighWater).toBe(2);

    const staleCloseTop = reduceManagedSurfaceV1(state, {
      kind: "close_top",
      applicationEpoch: parseNonNegativeSafeInteger(8),
    });
    expect(staleCloseTop.receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_application_epoch",
    });
    expect(staleCloseTop.state).toBe(state);

    const empty = createReducerStateV1(9);
    const alreadyClosed = reduceManagedSurfaceV1(empty, {
      kind: "close_top",
      applicationEpoch: empty.publication.applicationEpoch,
    });
    expect(alreadyClosed.receipt).toMatchObject({
      kind: "unchanged",
      code: "surface.already_closed",
    });
    expect(alreadyClosed.state).toBe(empty);
    const ownerAlreadyClosed = reduceManagedSurfaceV1(empty, {
      kind: "close_owner",
      evidence: {
        applicationEpoch: empty.publication.applicationEpoch,
        topologyRevision: empty.publication.topologyRevision,
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
      },
    });
    expect(ownerAlreadyClosed.receipt).toMatchObject({
      kind: "unchanged",
      code: "surface.already_closed",
    });
    expect(ownerAlreadyClosed.state).toBe(empty);

    const evidenceCases = [
      {
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(8),
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: primary.surfaceInstanceId,
        },
        code: "surface.stale_application_epoch",
      },
      {
        evidence: {
          applicationEpoch: parseNonNegativeSafeInteger(9),
          topologyRevision: parseNonNegativeSafeInteger(0),
          surfaceInstanceId: primary.surfaceInstanceId,
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
    let state = createReducerStateV1(5);
    const background = candidateV1(state, "background");
    state = openPrimaryV1(state, background).state;
    const locked = candidateV1(state, "locked", {
      definition: definitionV1("locked", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.modal"),
        layerOrder: parseNonNegativeSafeInteger(80),
        modality: "blocking",
        inputPolicy: { kind: "managed", inputContextId: "system" },
        dismissPolicy: {
          back: false,
          escape: false,
          backdrop: false,
          routedCancel: false,
        },
      }),
    });
    const opened = openPrimaryV1(state, locked);

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
        { surfaceInstanceId: background.surfaceInstanceId, phase: "suspended" },
        { surfaceInstanceId: locked.surfaceInstanceId, phase: "active" },
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
      { surfaceInstanceId: background.surfaceInstanceId, phase: "active" },
    ]);
    expect(explicitlyClosed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      background.surfaceInstanceId,
    );
  });

  it("freezes the resolved owner domain and rejects unknown owners before allocation", () => {
    const workspaceOwnerId = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
    const lateOwnerId = parseManagedSurfaceOwnerIdV1("surface-owner.late");
    const ownerIds = [workspaceOwnerId];
    const state = createReducerStateV1(15, ownerIds);
    ownerIds.push(lateOwnerId);

    expect(state.resolvedOwnerIds).toEqual([workspaceOwnerId]);
    expect(Object.isFrozen(state.resolvedOwnerIds)).toBe(true);
    expect(() => createReducerStateV1(15, [workspaceOwnerId, workspaceOwnerId])).toThrowError(
      "ui.managed_surface_duplicate_owner",
    );

    const unknownCandidate = candidateV1(state, "late", {
      definition: definitionV1("late", { ownerId: lateOwnerId }),
    });
    const unknownOpen = openPrimaryV1(state, unknownCandidate);
    expect(unknownOpen.receipt).toEqual({
      kind: "rejected",
      code: "surface.unknown_owner",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 0,
    });
    expect(unknownOpen.state).toBe(state);
    expect(unknownOpen.state.identitySequenceHighWater).toBe(0);

    const unknownDispose = reduceManagedSurfaceV1(state, {
      kind: "dispose_owner",
      applicationEpoch: state.publication.applicationEpoch,
      ownerId: lateOwnerId,
    });
    expect(unknownDispose.receipt).toEqual({
      kind: "rejected",
      code: "surface.unknown_owner",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 0,
    });
    expect(unknownDispose.state).toBe(state);

    const empty = createReducerStateV1(15, []);
    expect(openPrimaryV1(empty, candidateV1(empty, "empty-domain")).receipt).toMatchObject({
      kind: "rejected",
      code: "surface.unknown_owner",
    });
    expect(empty.identitySequenceHighWater).toBe(0);
  });

  it("admits only the exact current-epoch next identity allocation", () => {
    const state = createReducerStateV1(16, [
      parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    ]);
    const skippedIdentity = createManagedSurfaceTransientIdentityV1(
      state.publication.applicationEpoch,
      parsePositiveSafeInteger(2),
    );
    const skipped = candidateV1(state, "skipped", {
      identityAllocation: skippedIdentity.allocation,
      target: { kind: "transient", occurrenceId: skippedIdentity.occurrenceId },
      surfaceInstanceId: skippedIdentity.surfaceInstanceId,
      routingLeaseId: skippedIdentity.routingLeaseId,
    });
    expect(openPrimaryV1(state, skipped)).toMatchObject({
      state,
      receipt: { kind: "rejected", code: "surface.invalid_identity_allocation" },
    });

    const otherEpochIdentity = createManagedSurfaceTransientIdentityV1(
      parseNonNegativeSafeInteger(15),
      parsePositiveSafeInteger(1),
    );
    const otherEpoch = candidateV1(state, "other-epoch", {
      identityAllocation: otherEpochIdentity.allocation,
      target: { kind: "transient", occurrenceId: otherEpochIdentity.occurrenceId },
      surfaceInstanceId: otherEpochIdentity.surfaceInstanceId,
      routingLeaseId: otherEpochIdentity.routingLeaseId,
    });
    expect(openPrimaryV1(state, otherEpoch)).toMatchObject({
      state,
      receipt: { kind: "stale", code: "surface.stale_application_epoch" },
    });

    const mismatched = candidateV1(state, "mismatched", {
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.forged"),
    });
    expect(openPrimaryV1(state, mismatched)).toMatchObject({
      state,
      receipt: { kind: "rejected", code: "surface.invalid_identity_allocation" },
    });

    const valid = candidateV1(state, "valid");
    const opened = openPrimaryV1(state, valid);
    expect(opened.receipt).toMatchObject({
      kind: "applied",
      code: "surface.opened",
      surfaceInstanceId: "surface-instance.e16.n1",
    });
    expect(opened.state.identitySequenceHighWater).toBe(1);
  });

  it("tracks publication commits separately from active topology fences", () => {
    let state = createReducerStateV1(24);
    const root = candidateV1(state, "root");
    let before = state.publication;
    let result = openPrimaryV1(state, root);
    expectRevisionDeltaV1(before, result.state.publication, 1, 1);
    state = result.state;

    before = state.publication;
    const occupied = openPrimaryV1(state, candidateV1(state, "occupied"));
    expect(occupied.receipt).toMatchObject({ kind: "rejected", code: "surface.slot_occupied" });
    expectRevisionDeltaV1(before, occupied.state.publication, 0, 0);
    expect(occupied.state.publication).toBe(before);
    state = occupied.state;

    const replacement = candidateV1(state, "replacement", { definition: root.definition });
    before = state.publication;
    result = reduceManagedSurfaceV1(state, {
      kind: "replace_primary",
      expected: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: root.surfaceInstanceId,
      },
      candidate: replacement,
    });
    expectRevisionDeltaV1(before, result.state.publication, 1, 1);
    state = result.state;

    const child = candidateV1(state, "detail", {
      definition: definitionV1("detail", {
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        placement: "child",
        layerOrder: parseNonNegativeSafeInteger(30),
      }),
    });
    before = state.publication;
    result = reduceManagedSurfaceV1(state, {
      kind: "push_child",
      parentEvidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: replacement.surfaceInstanceId,
      },
      candidate: child,
    });
    expectRevisionDeltaV1(before, result.state.publication, 1, 1);
    state = result.state;

    before = state.publication;
    const routed = reduceManagedSurfaceV1(state, {
      kind: "route_action",
      evidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: child.surfaceInstanceId,
      },
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      routingLeaseId: child.routingLeaseId,
    });
    expect(routed.receipt).toMatchObject({ kind: "unchanged", code: "surface.action_routed" });
    expectRevisionDeltaV1(before, routed.state.publication, 0, 0);
    expect(routed.state).toBe(state);

    before = state.publication;
    result = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: state.publication.applicationEpoch,
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: child.surfaceInstanceId,
      },
    });
    expectRevisionDeltaV1(before, result.state.publication, 1, 1);
    state = result.state;
    const rootEvidence = {
      applicationEpoch: state.publication.applicationEpoch,
      topologyRevision: state.publication.topologyRevision,
      surfaceInstanceId: replacement.surfaceInstanceId,
    };

    before = state.publication;
    const emptyOwnerDisposed = reduceManagedSurfaceV1(state, {
      kind: "dispose_owner",
      applicationEpoch: state.publication.applicationEpoch,
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
    });
    expectRevisionDeltaV1(before, emptyOwnerDisposed.state.publication, 1, 0);
    expect(emptyOwnerDisposed.receipt).toMatchObject({
      kind: "applied",
      beforeTopologyRevision: before.topologyRevision,
      afterTopologyRevision: before.topologyRevision,
    });
    expect(emptyOwnerDisposed.state.publication.ownerTrace).toContainEqual({
      ownerId: "surface-owner.other",
      surfaceInstanceIds: [],
      disposed: true,
    });
    state = emptyOwnerDisposed.state;

    before = state.publication;
    const repeated = reduceManagedSurfaceV1(state, {
      kind: "dispose_owner",
      applicationEpoch: state.publication.applicationEpoch,
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
    });
    expectRevisionDeltaV1(before, repeated.state.publication, 0, 0);
    expect(repeated.state).toBe(state);

    before = state.publication;
    const closedWithPreDisposeEvidence = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: rootEvidence,
    });
    expect(closedWithPreDisposeEvidence.receipt.kind).toBe("applied");
    expectRevisionDeltaV1(before, closedWithPreDisposeEvidence.state.publication, 1, 1);
    state = closedWithPreDisposeEvidence.state;

    const system = candidateV1(state, "system", {
      definition: definitionV1("system", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
      }),
    });
    state = openPrimaryV1(state, system).state;
    before = state.publication;
    const liveOwnerDisposed = reduceManagedSurfaceV1(state, {
      kind: "dispose_owner",
      applicationEpoch: state.publication.applicationEpoch,
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
    });
    expectRevisionDeltaV1(before, liveOwnerDisposed.state.publication, 1, 1);
  });

  it("keeps identity state bounded across 10,000 deterministic transitions", () => {
    const applicationEpoch = parseNonNegativeSafeInteger(14);
    const workspaceOwnerId = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
    let state = createReducerStateV1(applicationEpoch, [workspaceOwnerId]);

    for (let cycle = 1; cycle <= 3_333; cycle += 1) {
      const opened = candidateV1(state, `churn-${cycle}-open`);
      state = openPrimaryV1(state, opened).state;
      const replacement = candidateV1(state, `churn-${cycle}-replace`, {
        definition: opened.definition,
      });
      state = reduceManagedSurfaceV1(state, {
        kind: "replace_primary",
        expected: {
          applicationEpoch,
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: opened.surfaceInstanceId,
        },
        candidate: replacement,
      }).state;
      state = reduceManagedSurfaceV1(state, {
        kind: "close_expected",
        evidence: {
          applicationEpoch,
          topologyRevision: state.publication.topologyRevision,
          surfaceInstanceId: replacement.surfaceInstanceId,
        },
      }).state;
    }

    state = openPrimaryV1(state, candidateV1(state, "churn-final-open")).state;

    expect(state.publication.publicationRevision).toBe(10_000);
    expect(state.publication.topologyRevision).toBe(10_000);
    expect(state.publication.orderedInstances).toHaveLength(1);
    expect(state.publication.orderedInstances[0]).toMatchObject({
      target: { occurrenceId: "surface-occurrence.e14.n6667" },
      surfaceInstanceId: "surface-instance.e14.n6667",
      routingLeaseId: "surface-lease.e14.n6667",
    });
    expect(state).not.toHaveProperty("retiredOccurrenceIds");
    expect(state).not.toHaveProperty("retiredInstanceIds");
    expect(state).not.toHaveProperty("retiredRoutingLeaseIds");
    expect(state.identitySequenceHighWater).toBe(6_667);
    expect(state.resolvedOwnerIds).toEqual([workspaceOwnerId]);
    expect(state.disposedOwnerIds).toEqual([]);
    expect(Object.keys(state).sort()).toEqual([
      "disposedOwnerIds",
      "identitySequenceHighWater",
      "publication",
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
    ]);
    expect(Object.isFrozen(state.resolvedOwnerIds)).toBe(true);
    expect(Object.isFrozen(state.resolvedSlotDescriptors)).toBe(true);
    expect(Object.isFrozen(state.disposedOwnerIds)).toBe(true);
  });

  it("rejects allocation replay and forged identity-component ABA after close", () => {
    let state = createReducerStateV1(6);
    const original = candidateV1(state, "first");
    state = openPrimaryV1(state, original).state;
    state = reduceManagedSurfaceV1(state, {
      kind: "close_expected",
      evidence: {
        applicationEpoch: parseNonNegativeSafeInteger(6),
        topologyRevision: state.publication.topologyRevision,
        surfaceInstanceId: original.surfaceInstanceId,
      },
    }).state;

    const replayedAllocation = openPrimaryV1(state, original);
    expect(replayedAllocation.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.reused_identity_allocation",
    });
    expect(replayedAllocation.state).toBe(state);

    const reusedOccurrence = openPrimaryV1(
      state,
      candidateV1(state, "second", { target: original.target }),
    );
    expect(reusedOccurrence.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.invalid_identity_allocation",
    });
    expect(reusedOccurrence.state).toBe(state);

    const reusedInstance = openPrimaryV1(
      state,
      candidateV1(state, "third", { surfaceInstanceId: original.surfaceInstanceId }),
    );
    expect(reusedInstance.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.invalid_identity_allocation",
    });
    expect(reusedInstance.state).toBe(state);

    const reusedLease = openPrimaryV1(
      state,
      candidateV1(state, "fourth", { routingLeaseId: original.routingLeaseId }),
    );
    expect(reusedLease.receipt).toMatchObject({
      kind: "rejected",
      code: "surface.invalid_identity_allocation",
    });
    expect(reusedLease.state).toBe(state);

    const fresh = candidateV1(state, "fresh");
    const reopened = openPrimaryV1(state, fresh);
    expect(reopened.receipt).toMatchObject({
      kind: "applied",
      code: "surface.opened",
      surfaceInstanceId: fresh.surfaceInstanceId,
    });
    expect(reopened.state.identitySequenceHighWater).toBe(2);
  });

  it("disposes one owner and then the coordinator without leaving live topology", () => {
    let state = createReducerStateV1(7);
    const workspace = candidateV1(state, "workspace");
    state = openPrimaryV1(state, workspace).state;
    state = openPrimaryV1(
      state,
      candidateV1(state, "system", {
        definition: definitionV1("system", {
          ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
          slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
          layerOrder: parseNonNegativeSafeInteger(80),
          modality: "blocking",
          inputPolicy: { kind: "managed", inputContextId: "system" },
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
      { surfaceInstanceId: workspace.surfaceInstanceId, phase: "active" },
    ]);
    expect(ownerDisposed.state.publication.inputOwner?.surfaceInstanceId).toBe(
      workspace.surfaceInstanceId,
    );
    expect(ownerDisposed.state.publication.focusOwner?.surfaceInstanceId).toBe(
      workspace.surfaceInstanceId,
    );
    expect(ownerDisposed.state.publication.ownerTrace).toEqual([
      {
        ownerId: "surface-owner.workspace",
        surfaceInstanceIds: [workspace.surfaceInstanceId],
        disposed: false,
      },
      {
        ownerId: "surface-owner.system",
        surfaceInstanceIds: [],
        disposed: true,
      },
    ]);
    expect(ownerDisposed.state.disposedOwnerIds).toEqual(["surface-owner.system"]);
    expect(Object.isFrozen(ownerDisposed.state.disposedOwnerIds)).toBe(true);
    const ownerDisposedAgain = reduceManagedSurfaceV1(ownerDisposed.state, {
      kind: "dispose_owner",
      applicationEpoch: ownerDisposed.state.publication.applicationEpoch,
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.system"),
    });
    expect(ownerDisposedAgain.receipt).toMatchObject({
      kind: "unchanged",
      code: "surface.owner_already_disposed",
    });
    expect(ownerDisposedAgain.state).toBe(ownerDisposed.state);
    expect(ownerDisposedAgain.state.disposedOwnerIds).toEqual(["surface-owner.system"]);
    const rejectedOwner = openPrimaryV1(
      ownerDisposedAgain.state,
      candidateV1(ownerDisposedAgain.state, "system-later", {
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
    expect(rejectedOwner.state).not.toBe(ownerDisposed.state);
    expect(rejectedOwner.state.publication).toBe(ownerDisposed.state.publication);
    expect(rejectedOwner.state.identitySequenceHighWater).toBe(3);

    const disposed = reduceManagedSurfaceV1(rejectedOwner.state, {
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
      candidateV1(disposed.state, "after-dispose", {
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
