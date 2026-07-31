// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceInstanceIdV1,
  type ManagedSurfacePublicationV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type ManagedSurfaceCoordinatorV1,
  type ManagedSurfaceHandleV1,
  type ManagedSurfaceHandleResultV1,
  type ManagedSurfaceReadinessAdapterV1,
} from "./managed-surface-coordinator.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(23);
const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const otherOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.other");
const primaryDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1("surface.workspace");
const primarySlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.primary");
const detailSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.detail");
const otherSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.other");
const readinessPolicyV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});
const sparseActionIdsV1: unknown[] = [];
sparseActionIdsV1.length = 1;
const slotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root",
      slotId: primarySlotIdV1,
      cardinality: "single",
    }),
    Object.freeze({
      kind: "child",
      parentDefinitionId: primaryDefinitionIdV1,
      slotId: detailSlotIdV1,
      cardinality: "stack",
    }),
    Object.freeze({
      kind: "root",
      slotId: otherSlotIdV1,
      cardinality: "single",
    }),
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

type ReadinessDefinitionV1 = ManagedSurfaceResolvedDefinitionV1 & {
  readonly contractRevision: PositiveSafeInteger;
  readonly readiness: typeof readinessPolicyV1;
};

function definitionV1(
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ReadinessDefinitionV1 {
  return {
    definitionId: primaryDefinitionIdV1,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: ownerIdV1,
    slotId: primarySlotIdV1,
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    modality: "blocking",
    inputPolicy: { kind: "managed", inputContextId: "overlay" },
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.workspace"),
      trap: true,
      restore: "opener",
    },
    navigationPolicy: { kind: "close" },
    actionIds: [parseManagedSurfaceActionIdV1("surface-action.activate")],
    readiness: readinessPolicyV1,
    ...overrides,
  };
}

function createCoordinatorV1(): ManagedSurfaceCoordinatorV1 {
  return createManagedSurfaceCoordinatorV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [ownerIdV1, otherOwnerIdV1],
    resolvedSlotDescriptors: slotDescriptorsV1,
  });
}

function acceptDefinitionForTypeBoundaryV1(
  definition: ManagedSurfaceResolvedDefinitionV1,
): void {
  void definition;
}

function expectRevisionDeltaV1(
  before: ManagedSurfacePublicationV1,
  after: ManagedSurfacePublicationV1,
  publicationDelta: number,
  topologyDelta: number,
): void {
  expect(after.publicationRevision - before.publicationRevision).toBe(publicationDelta);
  expect(after.topologyRevision - before.topologyRevision).toBe(topologyDelta);
}

function expectPreparingWithoutOrdinaryAuthorityV1(
  coordinator: ManagedSurfaceCoordinatorV1,
  candidateInstanceId: ManagedSurfaceInstanceIdV1,
  expectedParentInstanceId: ManagedSurfaceInstanceIdV1 | null,
): void {
  const snapshot = coordinator.getSnapshot();
  expect(snapshot.orderedInstances.find(
    (instance) => instance.surfaceInstanceId === candidateInstanceId,
  )).toMatchObject({
    surfaceInstanceId: candidateInstanceId,
    parentInstanceId: expectedParentInstanceId,
    phase: "preparing",
    readiness: { kind: "preparing" },
  });
  expect(coordinator.getHandle(candidateInstanceId)).toBeNull();
  expect(snapshot.topmostBlockingInstanceId).not.toBe(candidateInstanceId);
  expect(snapshot.inputOwner?.surfaceInstanceId).not.toBe(candidateInstanceId);
  expect(snapshot.focusOwner?.surfaceInstanceId).not.toBe(candidateInstanceId);
  expect(snapshot.navigationTargetInstanceId).not.toBe(candidateInstanceId);
}

function requireHandleV1(
  result: ReturnType<ManagedSurfaceCoordinatorV1["openTransientPrimary"]>,
): ManagedSurfaceHandleV1 {
  expect(result.readiness).not.toBeNull();
  const ready = result.readiness!.ready();
  expect(ready.handle).not.toBeNull();
  return ready.handle!;
}

interface PreparedScenarioV1 {
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly preparation: ManagedSurfaceHandleResultV1;
  readonly readiness: ManagedSurfaceReadinessAdapterV1;
  readonly candidateInstanceId: ManagedSurfaceInstanceIdV1;
  readonly retainedInstanceId: ManagedSurfaceInstanceIdV1 | null;
  readonly parentInstanceId: ManagedSurfaceInstanceIdV1 | null;
}

function preparedScenarioV1(
  transition: "initial_open" | "primary_replacement" | "child_open",
): PreparedScenarioV1 {
  const coordinator = createCoordinatorV1();
  let preparation: ManagedSurfaceHandleResultV1;
  let retainedInstanceId: ManagedSurfaceInstanceIdV1 | null = null;
  let parentInstanceId: ManagedSurfaceInstanceIdV1 | null = null;
  if (transition === "initial_open") {
    preparation = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
  } else {
    const currentHandle = requireHandleV1(coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    }));
    if (transition === "primary_replacement") {
      retainedInstanceId = currentHandle.surfaceInstanceId;
      preparation = coordinator.replaceTransientPrimary({
        definition: definitionV1(),
        semanticOccurrenceId: null,
        expected: currentHandle,
      });
    } else {
      parentInstanceId = currentHandle.surfaceInstanceId;
      preparation = coordinator.pushTransientChild({
        definition: definitionV1({
          definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace.detail"),
          slotId: detailSlotIdV1,
          layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace-detail"),
          layerOrder: parseNonNegativeSafeInteger(30),
          placement: "child",
        }),
        semanticOccurrenceId: null,
        parent: currentHandle,
      });
    }
  }
  expect(preparation.readiness).not.toBeNull();
  return {
    coordinator,
    preparation,
    readiness: preparation.readiness!,
    candidateInstanceId: preparation.receipt.surfaceInstanceId!,
    retainedInstanceId,
    parentInstanceId,
  };
}

describe("Managed Surface transition-kind readiness", () => {
  it.each([
    [
      "missing readiness contract",
      (() => {
        const { contractRevision: _contractRevision, readiness: _readiness, ...definition } =
          definitionV1();
        return definition;
      })(),
    ],
    ["non-positive contract revision", { ...definitionV1(), contractRevision: 0 }],
    [
      "invalid transition policy",
      {
        ...definitionV1(),
        readiness: { ...readinessPolicyV1, primaryReplacement: "blocking_fallback" },
      },
    ],
    ["sparse action catalog", { ...definitionV1(), actionIds: sparseActionIdsV1 }],
    ["future reconcile placeholder", { ...definitionV1(), sourcePublicationRevision: 1 }],
  ])("rejects %s before identity allocation or publication", (_label, definition) => {
    const coordinator = createCoordinatorV1();
    const before = coordinator.getSnapshot();
    let notifications = 0;
    coordinator.subscribe(() => notifications += 1);

    const result = coordinator.openTransientPrimary({
      definition: definition as unknown as ManagedSurfaceResolvedDefinitionV1,
      semanticOccurrenceId: null,
    });

    expect(result).toMatchObject({
      receipt: {
        kind: "rejected",
        code: "surface.invalid_definition",
      },
      handle: null,
    });
    expect(coordinator.getSnapshot()).toBe(before);
    expect(notifications).toBe(0);

    const valid = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(valid.receipt.surfaceInstanceId).toBe("surface-instance.e23.n1");
  });

  it("requires readiness and contract revision at the TypeScript boundary", () => {
    const { contractRevision: _contractRevision, ...missingContractRevision } = definitionV1();
    const { readiness: _readiness, ...missingReadiness } = definitionV1();

    // @ts-expect-error contractRevision is required by every resolved definition.
    acceptDefinitionForTypeBoundaryV1(missingContractRevision);
    // @ts-expect-error readiness is required by every resolved definition.
    acceptDefinitionForTypeBoundaryV1(missingReadiness);
  });

  it("prepares an initial open behind a code-native blocking fallback", () => {
    const coordinator = createCoordinatorV1();
    let notifications = 0;
    coordinator.subscribe(() => notifications += 1);
    const before = coordinator.getSnapshot();

    const result = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    const candidateInstanceId = result.receipt.surfaceInstanceId!;
    const after = coordinator.getSnapshot();

    expect(result.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: candidateInstanceId,
    });
    expect(result.handle).toBeNull();
    expectPreparingWithoutOrdinaryAuthorityV1(coordinator, candidateInstanceId, null);
    expect(after).toMatchObject({
      preparationFallbacks: [
        { kind: "blocking_fallback", candidateInstanceId },
      ],
      inputOwner: null,
      focusOwner: null,
      navigationTargetInstanceId: null,
    });
    expect(Reflect.ownKeys(after.preparationFallbacks[0]!)).toEqual([
      "kind",
      "candidateInstanceId",
    ]);
    expect(Object.isFrozen(after.preparationFallbacks)).toBe(true);
    expect(Object.isFrozen(after.preparationFallbacks[0])).toBe(true);
    expect("definition" in after.preparationFallbacks[0]!).toBe(false);
    expect("routingLeaseId" in after.preparationFallbacks[0]!).toBe(false);
    expectRevisionDeltaV1(before, after, 1, 1);
    expect(notifications).toBe(1);
  });

  it("prepares a primary replacement while retaining the current active surface", () => {
    const coordinator = createCoordinatorV1();
    const currentHandle = requireHandleV1(coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    }));
    const currentInstanceId = currentHandle.surfaceInstanceId;
    const before = coordinator.getSnapshot();
    let notifications = 0;
    coordinator.subscribe(() => notifications += 1);

    const result = coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: currentHandle,
    });
    const candidateInstanceId = result.receipt.surfaceInstanceId!;
    const after = coordinator.getSnapshot();

    expect(result.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: candidateInstanceId,
    });
    expect(result.handle).toBeNull();
    expectPreparingWithoutOrdinaryAuthorityV1(coordinator, candidateInstanceId, null);
    expect(after.orderedInstances.map((instance) => instance.surfaceInstanceId)).toEqual([
      currentInstanceId,
      candidateInstanceId,
    ]);
    expect(after.orderedInstances.find(
      (instance) => instance.surfaceInstanceId === currentInstanceId,
    )).toMatchObject({ phase: "active", readiness: { kind: "ready" } });
    expect(after.preparationFallbacks).toEqual([]);
    expect(after.inputOwner?.surfaceInstanceId).toBe(currentInstanceId);
    expect(after.focusOwner?.surfaceInstanceId).toBe(currentInstanceId);
    expect(after.navigationTargetInstanceId).toBe(currentInstanceId);
    expectRevisionDeltaV1(before, after, 1, 0);
    expect(notifications).toBe(1);
  });

  it("restores the previous owner when an initial fallback fails", () => {
    const coordinator = createCoordinatorV1();
    const previous = requireHandleV1(coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.other"),
        ownerId: otherOwnerIdV1,
        slotId: otherSlotIdV1,
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.other"),
        layerOrder: parseNonNegativeSafeInteger(10),
      }),
      semanticOccurrenceId: null,
    }));
    const beforePreparation = coordinator.getSnapshot();
    expect(beforePreparation.inputOwner?.surfaceInstanceId).toBe(previous.surfaceInstanceId);
    expect(beforePreparation.focusOwner?.surfaceInstanceId).toBe(previous.surfaceInstanceId);

    const preparation = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    const preparing = coordinator.getSnapshot();
    expectRevisionDeltaV1(beforePreparation, preparing, 1, 1);
    expect(preparing.inputOwner).toBeNull();
    expect(preparing.focusOwner).toBeNull();
    expect(preparing.navigationTargetInstanceId).toBeNull();

    expect(preparation.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
    });
    const restored = coordinator.getSnapshot();
    expectRevisionDeltaV1(preparing, restored, 1, 1);
    expect(restored.inputOwner?.surfaceInstanceId).toBe(previous.surfaceInstanceId);
    expect(restored.focusOwner?.surfaceInstanceId).toBe(previous.surfaceInstanceId);
    expect(restored.navigationTargetInstanceId).toBe(previous.surfaceInstanceId);
  });

  it("does not grant a preparing candidate semantic action authority", () => {
    const coordinator = createCoordinatorV1();
    const preparation = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    const candidate = coordinator.getSnapshot().orderedInstances[0]!;
    const before = coordinator.getSnapshot();
    let notifications = 0;
    coordinator.subscribe(() => notifications += 1);

    expect(coordinator.routeAction({
      evidence: {
        applicationEpoch: before.applicationEpoch,
        topologyRevision: before.topologyRevision,
        surfaceInstanceId: candidate.surfaceInstanceId,
      },
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      routingLeaseId: candidate.routingLeaseId,
    })).toMatchObject({
      kind: "stale",
      code: "surface.stale_instance",
      surfaceInstanceId: preparation.receipt.surfaceInstanceId,
    });
    expect(coordinator.getSnapshot()).toBe(before);
    expect(notifications).toBe(0);
  });

  it("prepares a child behind a blocking fallback without transferring authority", () => {
    const coordinator = createCoordinatorV1();
    const parentHandle = requireHandleV1(coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    }));
    const before = coordinator.getSnapshot();
    let notifications = 0;
    coordinator.subscribe(() => notifications += 1);

    const result = coordinator.pushTransientChild({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace.detail"),
        slotId: detailSlotIdV1,
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace-detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
      }),
      semanticOccurrenceId: null,
      parent: parentHandle,
    });
    const candidateInstanceId = result.receipt.surfaceInstanceId!;
    const after = coordinator.getSnapshot();

    expect(result.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: candidateInstanceId,
    });
    expect(result.handle).toBeNull();
    expectPreparingWithoutOrdinaryAuthorityV1(
      coordinator,
      candidateInstanceId,
      parentHandle.surfaceInstanceId,
    );
    expect(after.orderedInstances.find(
      (instance) => instance.surfaceInstanceId === parentHandle.surfaceInstanceId,
    )).toMatchObject({ phase: "suspended", readiness: { kind: "ready" } });
    expect(after.preparationFallbacks).toEqual([
      { kind: "blocking_fallback", candidateInstanceId },
    ]);
    expect(after.inputOwner).toBeNull();
    expect(after.focusOwner).toBeNull();
    expect(after.navigationTargetInstanceId).toBeNull();
    expectRevisionDeltaV1(before, after, 1, 1);
    expect(notifications).toBe(1);
  });

  it.each(
    [
      ["initial_open", "ready", 1, 1],
      ["primary_replacement", "ready", 1, 1],
      ["child_open", "ready", 1, 1],
      ["initial_open", "failed", 1, 1],
      ["primary_replacement", "failed", 1, 0],
      ["child_open", "failed", 1, 1],
    ] as const,
  )(
    "%s settles %s with exact publication and topology revisions",
    (transition, outcome, publicationDelta, topologyDelta) => {
      const scenario = preparedScenarioV1(transition);
      expect(Reflect.ownKeys(scenario.readiness.evidence)).toEqual([
        "applicationEpoch",
        "surfaceInstanceId",
      ]);
      const before = scenario.coordinator.getSnapshot();
      let notifications = 0;
      scenario.coordinator.subscribe(() => notifications += 1);

      const receipt = outcome === "ready"
        ? scenario.readiness.ready().receipt
        : scenario.readiness.fail();
      const after = scenario.coordinator.getSnapshot();

      expect(receipt).toMatchObject({
        kind: "applied",
        code: outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed",
        surfaceInstanceId: scenario.candidateInstanceId,
      });
      expectRevisionDeltaV1(before, after, publicationDelta, topologyDelta);
      expect(notifications).toBe(1);
      expect(after.preparationFallbacks).toEqual([]);
      const candidate = after.orderedInstances.find(
        (instance) => instance.surfaceInstanceId === scenario.candidateInstanceId,
      );
      if (outcome === "ready") {
        expect(candidate).toMatchObject({ phase: "active", readiness: { kind: "ready" } });
        expect(after.inputOwner?.surfaceInstanceId).toBe(scenario.candidateInstanceId);
        expect(after.focusOwner?.surfaceInstanceId).toBe(scenario.candidateInstanceId);
        expect(after.navigationTargetInstanceId).toBe(scenario.candidateInstanceId);
        if (scenario.retainedInstanceId !== null) {
          expect(after.orderedInstances.some(
            (instance) => instance.surfaceInstanceId === scenario.retainedInstanceId,
          )).toBe(false);
        }
      } else {
        expect(candidate).toBeUndefined();
        expect(after.inputOwner?.surfaceInstanceId ?? null).toBe(
          scenario.retainedInstanceId ?? scenario.parentInstanceId,
        );
        expect(after.focusOwner?.surfaceInstanceId ?? null).toBe(
          scenario.retainedInstanceId ?? scenario.parentInstanceId,
        );
      }

      const settled = scenario.coordinator.getSnapshot();
      const late = outcome === "ready"
        ? scenario.readiness.fail()
        : scenario.readiness.ready().receipt;
      expect(late).toMatchObject({
        kind: "stale",
        code: "surface.stale_readiness",
        surfaceInstanceId: scenario.candidateInstanceId,
      });
      expect(scenario.coordinator.getSnapshot()).toBe(settled);
      expect(notifications).toBe(1);
    },
  );

  it("closes an initial fallback and never reuses its candidate identity", () => {
    const coordinator = createCoordinatorV1();
    const first = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    const firstCandidate = first.receipt.surfaceInstanceId!;
    const beforeClose = coordinator.getSnapshot();

    expect(coordinator.closeTop()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: firstCandidate,
    });
    const afterClose = coordinator.getSnapshot();
    expectRevisionDeltaV1(beforeClose, afterClose, 1, 1);
    expect(afterClose.orderedInstances).toEqual([]);
    expect(afterClose.preparationFallbacks).toEqual([]);
    expect(first.readiness!.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });

    const retry = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(retry.receipt.surfaceInstanceId).toBe("surface-instance.e23.n2");
    expect(retry.receipt.surfaceInstanceId).not.toBe(firstCandidate);
  });

  it("closes a retained predecessor and cancels its replacement in one commit", () => {
    const scenario = preparedScenarioV1("primary_replacement");
    const before = scenario.coordinator.getSnapshot();

    expect(scenario.coordinator.closeTop()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: scenario.retainedInstanceId,
    });
    const after = scenario.coordinator.getSnapshot();
    expectRevisionDeltaV1(before, after, 1, 1);
    expect(after.orderedInstances).toEqual([]);
    expect(scenario.readiness.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
  });

  it("closes a child fallback without closing its retained parent", () => {
    const scenario = preparedScenarioV1("child_open");
    const before = scenario.coordinator.getSnapshot();

    expect(scenario.coordinator.closeTop()).toMatchObject({
      kind: "applied",
      code: "surface.closed",
      surfaceInstanceId: scenario.candidateInstanceId,
    });
    const after = scenario.coordinator.getSnapshot();
    expectRevisionDeltaV1(before, after, 1, 1);
    expect(after.orderedInstances.map((instance) => instance.surfaceInstanceId)).toEqual([
      scenario.parentInstanceId,
    ]);
    expect(after.inputOwner?.surfaceInstanceId).toBe(scenario.parentInstanceId);
    expect(after.focusOwner?.surfaceInstanceId).toBe(scenario.parentInstanceId);
    expect(scenario.readiness.fail()).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });

    const currentParent = scenario.coordinator.getHandle(scenario.parentInstanceId!)!;
    const retry = scenario.coordinator.pushTransientChild({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace.detail"),
        slotId: detailSlotIdV1,
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace-detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
      }),
      semanticOccurrenceId: null,
      parent: currentParent,
    });
    expect(retry.receipt.surfaceInstanceId).toBe("surface-instance.e23.n3");
    expect(retry.receipt.surfaceInstanceId).not.toBe(scenario.candidateInstanceId);
  });

  it("allocates a fresh candidate after readiness failure", () => {
    const coordinator = createCoordinatorV1();
    const first = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(first.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
      surfaceInstanceId: "surface-instance.e23.n1",
    });

    const retry = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(retry.receipt.surfaceInstanceId).toBe("surface-instance.e23.n2");
    expect(retry.receipt.surfaceInstanceId).not.toBe(first.receipt.surfaceInstanceId);
  });

  it("atomically replaces an older pending replacement with a fresh attempt", () => {
    const scenario = preparedScenarioV1("primary_replacement");
    const before = scenario.coordinator.getSnapshot();
    const retainedHandle = scenario.coordinator.getHandle(scenario.retainedInstanceId!)!;

    const second = scenario.coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    const after = scenario.coordinator.getSnapshot();

    expect(second.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: "surface-instance.e23.n3",
    });
    expectRevisionDeltaV1(before, after, 1, 0);
    expect(after.orderedInstances.map((instance) => instance.surfaceInstanceId)).toEqual([
      scenario.retainedInstanceId,
      second.receipt.surfaceInstanceId,
    ]);
    expect(scenario.readiness.fail()).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
  });

  it("does not cancel a live replacement when a second request fails preflight", () => {
    const scenario = preparedScenarioV1("primary_replacement");
    const retainedHandle = scenario.coordinator.getHandle(scenario.retainedInstanceId!)!;
    const before = scenario.coordinator.getSnapshot();
    let notifications = 0;
    scenario.coordinator.subscribe(() => notifications += 1);

    const invalid = scenario.coordinator.replaceTransientPrimary({
      definition: {
        ...definitionV1(),
        sourcePublicationRevision: 1,
      } as unknown as ManagedSurfaceResolvedDefinitionV1,
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });

    expect(invalid).toMatchObject({
      receipt: { kind: "rejected", code: "surface.invalid_definition" },
      handle: null,
      readiness: null,
    });
    expect(scenario.coordinator.getSnapshot()).toBe(before);
    expect(notifications).toBe(0);
    expect(scenario.readiness.ready().receipt).toMatchObject({
      kind: "applied",
      code: "surface.readiness_ready",
      surfaceInstanceId: scenario.candidateInstanceId,
    });
  });

  it("cancels pending work through owner and Coordinator disposal", () => {
    const initial = preparedScenarioV1("initial_open");
    const beforeOwner = initial.coordinator.getSnapshot();
    expect(initial.coordinator.disposeOwner(ownerIdV1)).toMatchObject({
      kind: "applied",
      code: "surface.owner_disposed",
    });
    expectRevisionDeltaV1(beforeOwner, initial.coordinator.getSnapshot(), 1, 1);
    expect(initial.coordinator.getSnapshot().orderedInstances).toEqual([]);
    expect(initial.readiness.fail()).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });

    const child = preparedScenarioV1("child_open");
    const beforeCoordinator = child.coordinator.getSnapshot();
    expect(child.coordinator.dispose()).toMatchObject({
      kind: "applied",
      code: "surface.coordinator_disposed",
    });
    expectRevisionDeltaV1(beforeCoordinator, child.coordinator.getSnapshot(), 1, 1);
    expect(child.coordinator.getSnapshot().orderedInstances).toEqual([]);
    expect(child.readiness.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
  });

  it("keeps a live replacement receipt valid across unrelated revision changes", () => {
    const scenario = preparedScenarioV1("primary_replacement");
    const pendingPublication = scenario.coordinator.getSnapshot();

    expect(scenario.coordinator.disposeOwner(otherOwnerIdV1)).toMatchObject({
      kind: "applied",
      code: "surface.owner_disposed",
    });
    expectRevisionDeltaV1(pendingPublication, scenario.coordinator.getSnapshot(), 1, 0);
    expect(
      scenario.coordinator.getSnapshot().orderedInstances.some(
        (instance) => instance.surfaceInstanceId === scenario.candidateInstanceId,
      ),
    ).toBe(true);

    const beforeReady = scenario.coordinator.getSnapshot();
    expect(scenario.readiness.ready().receipt).toMatchObject({
      kind: "applied",
      code: "surface.readiness_ready",
    });
    expectRevisionDeltaV1(beforeReady, scenario.coordinator.getSnapshot(), 1, 1);
  });

  it("keeps a live replacement receipt valid across unrelated topology changes", () => {
    const scenario = preparedScenarioV1("primary_replacement");
    const beforeOtherPreparation = scenario.coordinator.getSnapshot();

    const other = scenario.coordinator.openTransientPrimary({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.other"),
        ownerId: otherOwnerIdV1,
        slotId: otherSlotIdV1,
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.other"),
        layerOrder: parseNonNegativeSafeInteger(40),
      }),
      semanticOccurrenceId: null,
    });
    expect(other.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
    });
    expectRevisionDeltaV1(
      beforeOtherPreparation,
      scenario.coordinator.getSnapshot(),
      1,
      1,
    );

    const beforeOtherFailure = scenario.coordinator.getSnapshot();
    expect(other.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
    });
    expectRevisionDeltaV1(beforeOtherFailure, scenario.coordinator.getSnapshot(), 1, 1);
    expect(
      scenario.coordinator.getSnapshot().orderedInstances.some(
        (instance) => instance.surfaceInstanceId === scenario.candidateInstanceId,
      ),
    ).toBe(true);

    const beforeReady = scenario.coordinator.getSnapshot();
    expect(scenario.readiness.ready().receipt).toMatchObject({
      kind: "applied",
      code: "surface.readiness_ready",
      surfaceInstanceId: scenario.candidateInstanceId,
    });
    expectRevisionDeltaV1(beforeReady, scenario.coordinator.getSnapshot(), 1, 1);
  });
});
