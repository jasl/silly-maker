// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { inputHandledV1 } from "../input/contracts.ts";
import {
  createInputRouterV1,
  type ManagedInputHandlerRegistrationV1,
  registerManagedInputHandlerV1,
} from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceCoordinatorLifetimeV1,
  type ManagedSurfaceApplicationEpochAllocatorV1,
  type ManagedSurfaceCoordinatorRecipeV1,
  type ManagedSurfaceCoordinatorSuccessorKindV1,
  type ManagedSurfaceCoordinatorLifetimeV1,
  type ManagedSurfaceCoordinatorRuntimeV1,
} from "./managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type CreateManagedSurfaceCoordinatorInputV1,
} from "./managed-surface-coordinator.ts";

const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const slotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
      cardinality: "single",
    }),
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);
const recipeV1: ManagedSurfaceCoordinatorRecipeV1 = Object.freeze({
  resolvedOwnerIds: Object.freeze([ownerIdV1]),
  resolvedSlotDescriptors: slotDescriptorsV1,
});

function definitionV1(): ManagedSurfaceResolvedDefinitionV1 {
  return Object.freeze({
    definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace"),
    ownerId: ownerIdV1,
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    modality: "non_blocking",
    inputPolicy: Object.freeze({ kind: "managed", inputContextId: "overlay" }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    }),
    navigationPolicy: Object.freeze({ kind: "close" }),
    actionIds: Object.freeze([
      parseManagedSurfaceActionIdV1("surface-action.activate"),
    ]),
  });
}

function openV1(runtime: ManagedSurfaceCoordinatorRuntimeV1) {
  const result = runtime.coordinator.openTransientPrimary({
    definition: definitionV1(),
    semanticOccurrenceId: null,
  });
  expect(result.receipt).toMatchObject({ kind: "applied", code: "surface.opened" });
  return result.handle!;
}

function deterministicAllocatorV1(
  values: readonly number[],
  onAllocate?: (applicationEpoch: number, call: number) => void,
): ManagedSurfaceApplicationEpochAllocatorV1 {
  let calls = 0;
  return Object.freeze({
    allocate() {
      const value = values[calls];
      calls += 1;
      if (value === undefined) throw new Error("test.epoch_sequence_exhausted");
      onAllocate?.(value, calls);
      return parseNonNegativeSafeInteger(value);
    },
  });
}

function acceptRecipeForTypeBoundaryV1(recipe: ManagedSurfaceCoordinatorRecipeV1): void {
  void recipe;
}

const successorKindsV1 = Object.freeze(
  [
    "load_rebootstrap",
    "import_rebootstrap",
    "hmr_successor",
    "coordinator_successor",
  ] as const satisfies readonly ManagedSurfaceCoordinatorSuccessorKindV1[],
);

describe("Managed Surface application lifetime", () => {
  it.each(successorKindsV1)(
    "cleans up the predecessor before %s allocation and ingress",
    (kind) => {
      const router = createInputRouterV1();
      router.register({ context: "overlay", handle: () => inputHandledV1 });
      const events: string[] = [];
      let activeManagedRegistrations = 0;
      let lifetime!: ManagedSurfaceCoordinatorLifetimeV1;
      let predecessor!: ManagedSurfaceCoordinatorRuntimeV1;
      let predecessorGesture!: ReturnType<
        ManagedSurfaceCoordinatorRuntimeV1["gestureLease"]["begin"]
      >;

      const registerManagedInputHandler = (
        target: typeof router,
        registration: ManagedInputHandlerRegistrationV1,
      ): () => void => {
        activeManagedRegistrations += 1;
        const unregister = registerManagedInputHandlerV1(target, registration);
        events.push("register");
        return () => {
          activeManagedRegistrations -= 1;
          unregister();
          events.push("unregister");
        };
      };
      const epochAllocator = deterministicAllocatorV1([41, 47], (epoch, call) => {
        events.push(`allocate:${epoch}`);
        if (call !== 2) return;
        expect(lifetime.getCurrent()).toBeNull();
        expect(activeManagedRegistrations).toBe(0);
        expect(predecessor.gestureLease.isCurrent(predecessorGesture)).toBe(false);
        expect(predecessor.coordinator.getSnapshot()).toMatchObject({
          orderedInstances: [],
          inputOwner: null,
          focusOwner: null,
          navigationTargetInstanceId: null,
          coordinatorDisposed: true,
        });
      });
      const createCoordinator = (input: CreateManagedSurfaceCoordinatorInputV1) => {
        events.push(`create:${input.applicationEpoch}`);
        return createManagedSurfaceCoordinatorV1(input);
      };

      lifetime = createManagedSurfaceCoordinatorLifetimeV1({
        epochAllocator,
        inputRouter: router,
        initialRecipe: recipeV1,
        registerManagedInputHandler,
        createCoordinator,
      });
      predecessor = lifetime.getCurrent()!;
      openV1(predecessor);
      predecessorGesture = predecessor.gestureLease.begin();
      predecessor.bindCurrentInput();
      predecessor.coordinator.subscribe(() => {
        if (!predecessor.coordinator.getSnapshot().coordinatorDisposed) return;
        events.push("coordinator_disposed");
        expect(lifetime.getCurrent()).toBeNull();
        expect(predecessor.isIngressOpen()).toBe(false);
      });
      events.length = 0;

      const successor = lifetime.replace({ kind, recipe: recipeV1 });

      expect(events).toEqual([
        "unregister",
        "coordinator_disposed",
        "allocate:47",
        "create:47",
      ]);
      expect(successor).toBe(lifetime.getCurrent());
      expect(successor).toMatchObject({ applicationEpoch: 47, activationKind: kind });
      expect(successor.isIngressOpen()).toBe(true);
      expect(predecessor.isIngressOpen()).toBe(false);
      expect(() => predecessor.gestureLease.begin()).toThrowError(
        "ui.managed_surface_ingress_closed",
      );
      expect(Object.isFrozen(successor)).toBe(true);

      lifetime.dispose();
      expect(lifetime.getCurrent()).toBeNull();
      expect(successor.isIngressOpen()).toBe(false);
    },
  );

  it("restarts local sequences without reusing compound identity and fences old actions", () => {
    const router = createInputRouterV1();
    let ordinaryInputCalls = 0;
    router.register({
      context: "overlay",
      handle: () => {
        ordinaryInputCalls += 1;
        return inputHandledV1;
      },
    });
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([5, 9]),
      inputRouter: router,
      initialRecipe: recipeV1,
    });
    const predecessor = lifetime.getCurrent()!;
    const predecessorHandle = openV1(predecessor);
    const predecessorInstance = predecessor.coordinator.getSnapshot().orderedInstances[0]!;
    const predecessorGesture = predecessor.gestureLease.begin();
    const predecessorBinding = predecessor.bindCurrentInput();
    const predecessorEnvelope = predecessorBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: predecessorGesture,
    });

    const successor = lifetime.replace({
      kind: "coordinator_successor",
      recipe: recipeV1,
    });
    const successorHandle = openV1(successor);
    const successorInstance = successor.coordinator.getSnapshot().orderedInstances[0]!;
    const successorGesture = successor.gestureLease.begin();
    const successorBinding = successor.bindCurrentInput();
    const successorEnvelope = successorBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: successorGesture,
    });
    const staleGestureEnvelope = successorBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: predecessorGesture,
    });

    expect(predecessorInstance.surfaceInstanceId).toBe("surface-instance.e5.n1");
    expect(successorInstance.surfaceInstanceId).toBe("surface-instance.e9.n1");
    expect(successorInstance.target.occurrenceId).not.toBe(
      predecessorInstance.target.occurrenceId,
    );
    expect(successorInstance.surfaceInstanceId).not.toBe(predecessorInstance.surfaceInstanceId);
    expect(successorInstance.routingLeaseId).not.toBe(predecessorInstance.routingLeaseId);
    expect(successorGesture).not.toBe(predecessorGesture);

    const beforeOldHandle = successor.coordinator.getSnapshot();
    let successorNotifications = 0;
    successor.coordinator.subscribe(() => successorNotifications += 1);
    expect(successorBinding.route(staleGestureEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_gesture" },
      surface: null,
    });
    expect(successor.coordinator.getSnapshot()).toBe(beforeOldHandle);
    expect(successorNotifications).toBe(0);
    expect(ordinaryInputCalls).toBe(0);
    expect(successor.coordinator.closeExpected(predecessorHandle)).toMatchObject({
      kind: "stale",
      code: "surface.stale_application_epoch",
    });
    expect(successor.coordinator.getSnapshot()).toBe(beforeOldHandle);
    expect(successorNotifications).toBe(0);

    expect(predecessorBinding.route(predecessorEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(ordinaryInputCalls).toBe(0);
    expect(successorBinding.route(successorEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(ordinaryInputCalls).toBe(1);
    expect(successorHandle.applicationEpoch).toBe(9);

    lifetime.dispose();
  });

  it("rejects reentrant successor creation from the predecessor terminal notification", () => {
    const router = createInputRouterV1();
    let allocatorCalls = 0;
    let coordinatorCreates = 0;
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: {
        allocate() {
          allocatorCalls += 1;
          return parseNonNegativeSafeInteger(allocatorCalls);
        },
      },
      inputRouter: router,
      initialRecipe: recipeV1,
      createCoordinator(input) {
        coordinatorCreates += 1;
        return createManagedSurfaceCoordinatorV1(input);
      },
    });
    const predecessor = lifetime.getCurrent()!;
    openV1(predecessor);
    let reentrantReplaceFailure: unknown;
    let reentrantDisposeFailure: unknown;
    predecessor.coordinator.subscribe(() => {
      if (!predecessor.coordinator.getSnapshot().coordinatorDisposed) return;
      try {
        lifetime.replace({ kind: "coordinator_successor", recipe: recipeV1 });
      } catch (error) {
        reentrantReplaceFailure = error;
      }
      try {
        lifetime.dispose();
      } catch (error) {
        reentrantDisposeFailure = error;
      }
    });

    const successor = lifetime.replace({ kind: "hmr_successor", recipe: recipeV1 });

    expect(reentrantReplaceFailure).toBeInstanceOf(TypeError);
    expect((reentrantReplaceFailure as Error).message).toBe(
      "ui.managed_surface_lifetime_transition_in_progress",
    );
    expect(reentrantDisposeFailure).toBeInstanceOf(TypeError);
    expect((reentrantDisposeFailure as Error).message).toBe(
      "ui.managed_surface_lifetime_transition_in_progress",
    );
    expect(allocatorCalls).toBe(2);
    expect(coordinatorCreates).toBe(2);
    expect(successor.applicationEpoch).toBe(2);
    expect(lifetime.getCurrent()).toBe(successor);
    expect(successor.isIngressOpen()).toBe(true);

    lifetime.dispose();
  });

  it("closes every predecessor runtime ingress before unregister callbacks run", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    let predecessor!: ManagedSurfaceCoordinatorRuntimeV1;
    let reentrantReceipt: unknown;
    let reentrantFailure: unknown;
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([11, 12]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler(target, registration) {
        const unregister = registerManagedInputHandlerV1(target, registration);
        return () => {
          unregister();
          try {
            reentrantReceipt = predecessor.coordinator.closeTop();
          } catch (error) {
            reentrantFailure = error;
          }
        };
      },
    });
    predecessor = lifetime.getCurrent()!;
    const predecessorHandle = openV1(predecessor);
    const predecessorOwnerHandle = predecessor.coordinator.getOwnerHandle(ownerIdV1)!;
    const predecessorInstance = predecessor.coordinator.getSnapshot().orderedInstances[0]!;
    const predecessorGesture = predecessor.gestureLease.begin();
    predecessor.bindCurrentInput();
    const observedPublications: Array<{
      readonly coordinatorDisposed: boolean;
      readonly publicationRevision: number;
      readonly topologyRevision: number;
    }> = [];
    predecessor.coordinator.subscribe(() => {
      const snapshot = predecessor.coordinator.getSnapshot();
      observedPublications.push({
        coordinatorDisposed: snapshot.coordinatorDisposed,
        publicationRevision: snapshot.publicationRevision,
        topologyRevision: snapshot.topologyRevision,
      });
    });

    const successor = lifetime.replace({ kind: "hmr_successor", recipe: recipeV1 });

    expect(reentrantReceipt).toBeUndefined();
    expect(reentrantFailure).toBeInstanceOf(TypeError);
    expect((reentrantFailure as Error).message).toBe(
      "ui.managed_surface_ingress_closed",
    );
    expect(observedPublications).toEqual([
      {
        coordinatorDisposed: true,
        publicationRevision: 2,
        topologyRevision: 2,
      },
    ]);
    expect(predecessor.coordinator.getSnapshot()).toMatchObject({
      coordinatorDisposed: true,
      publicationRevision: 2,
      topologyRevision: 2,
      orderedInstances: [],
    });
    const closedCoordinatorIngress = [
      [
        "getHandle",
        () => predecessor.coordinator.getHandle(predecessorHandle.surfaceInstanceId),
      ],
      ["getOwnerHandle", () => predecessor.coordinator.getOwnerHandle(ownerIdV1)],
      ["subscribe", () => predecessor.coordinator.subscribe(() => {})],
      [
        "openTransientPrimary",
        () =>
          predecessor.coordinator.openTransientPrimary({
            definition: definitionV1(),
            semanticOccurrenceId: null,
          }),
      ],
      [
        "replaceTransientPrimary",
        () =>
          predecessor.coordinator.replaceTransientPrimary({
            definition: definitionV1(),
            semanticOccurrenceId: null,
            expected: predecessorHandle,
          }),
      ],
      [
        "pushTransientChild",
        () =>
          predecessor.coordinator.pushTransientChild({
            definition: definitionV1(),
            semanticOccurrenceId: null,
            parent: predecessorHandle,
          }),
      ],
      ["closeExpected", () => predecessor.coordinator.closeExpected(predecessorHandle)],
      ["closeTop", () => predecessor.coordinator.closeTop()],
      ["closeOwner", () => predecessor.coordinator.closeOwner(predecessorOwnerHandle)],
      [
        "routeDismiss",
        () => predecessor.coordinator.routeDismiss(predecessorHandle, "back"),
      ],
      [
        "routeAction",
        () =>
          predecessor.coordinator.routeAction({
            evidence: predecessorHandle,
            actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
            routingLeaseId: predecessorInstance.routingLeaseId,
          }),
      ],
      ["disposeOwner", () => predecessor.coordinator.disposeOwner(ownerIdV1)],
    ] as const;
    expect(
      Reflect.ownKeys(predecessor.coordinator)
        .filter((key) => key !== "getSnapshot")
        .map(String)
        .sort(),
    ).toEqual(closedCoordinatorIngress.map(([name]) => name).sort());
    for (const [, call] of closedCoordinatorIngress) {
      expect(call).toThrowError("ui.managed_surface_ingress_closed");
    }
    expect(() => predecessor.bindCurrentInput()).toThrowError(
      "ui.managed_surface_ingress_closed",
    );
    expect(() => predecessor.gestureLease.begin()).toThrowError(
      "ui.managed_surface_ingress_closed",
    );
    expect(() => predecessor.gestureLease.revoke()).toThrowError(
      "ui.managed_surface_ingress_closed",
    );
    expect(predecessor.gestureLease.isCurrent(predecessorGesture)).toBe(false);
    expect(successor).toBe(lifetime.getCurrent());
    expect(successor.isIngressOpen()).toBe(true);

    lifetime.dispose();
  });

  it("fails closed when a completed unregister reports failure and continues cleanup", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    let allocatorCalls = 0;
    let coordinatorCreates = 0;
    let activeManagedRegistrations = 0;
    const epochAllocator: ManagedSurfaceApplicationEpochAllocatorV1 = {
      allocate() {
        allocatorCalls += 1;
        return parseNonNegativeSafeInteger(allocatorCalls);
      },
    };
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator,
      inputRouter: router,
      initialRecipe: recipeV1,
      createCoordinator(input) {
        coordinatorCreates += 1;
        return createManagedSurfaceCoordinatorV1(input);
      },
      registerManagedInputHandler(target, registration) {
        activeManagedRegistrations += 1;
        const unregister = registerManagedInputHandlerV1(target, registration);
        return () => {
          activeManagedRegistrations -= 1;
          unregister();
          throw new Error("test.unregister_failed");
        };
      },
    });
    const predecessor = lifetime.getCurrent()!;
    openV1(predecessor);
    const gesture = predecessor.gestureLease.begin();
    predecessor.bindCurrentInput();

    let failure: unknown;
    try {
      lifetime.replace({ kind: "hmr_successor", recipe: recipeV1 });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toHaveLength(1);
    expect((failure as Error).message).toBe("ui.managed_surface_successor_cleanup_failed");
    expect(lifetime.getCurrent()).toBeNull();
    expect(activeManagedRegistrations).toBe(0);
    expect(predecessor.gestureLease.isCurrent(gesture)).toBe(false);
    expect(predecessor.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
    expect(allocatorCalls).toBe(1);
    expect(coordinatorCreates).toBe(1);
    expect(() => lifetime.replace({ kind: "coordinator_successor", recipe: recipeV1 }))
      .toThrowError("ui.managed_surface_lifetime_disposed");
    expect(() => lifetime.dispose()).not.toThrow();
  });

  it("rejects a non-monotonic allocator after cleanup without constructing a successor", () => {
    const router = createInputRouterV1();
    let coordinatorCreates = 0;
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([3, 3]),
      inputRouter: router,
      initialRecipe: recipeV1,
      createCoordinator(input) {
        coordinatorCreates += 1;
        return createManagedSurfaceCoordinatorV1(input);
      },
    });
    const predecessor = lifetime.getCurrent()!;
    openV1(predecessor);

    expect(() => lifetime.replace({ kind: "import_rebootstrap", recipe: recipeV1 })).toThrowError(
      "ui.managed_surface_application_epoch_not_monotonic",
    );
    expect(lifetime.getCurrent()).toBeNull();
    expect(predecessor.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
    expect(coordinatorCreates).toBe(1);
  });

  it("remains sealed with no ingress when successor construction fails", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    let coordinatorCreates = 0;
    const constructionFailure = new Error("test.successor_construction_failed");
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([1, 2]),
      inputRouter: router,
      initialRecipe: recipeV1,
      createCoordinator(input) {
        coordinatorCreates += 1;
        if (coordinatorCreates === 2) throw constructionFailure;
        return createManagedSurfaceCoordinatorV1(input);
      },
    });
    const predecessor = lifetime.getCurrent()!;
    openV1(predecessor);
    const gesture = predecessor.gestureLease.begin();
    predecessor.bindCurrentInput();

    expect(() => lifetime.replace({ kind: "load_rebootstrap", recipe: recipeV1 })).toThrow(
      constructionFailure,
    );
    expect(lifetime.getCurrent()).toBeNull();
    expect(predecessor.isIngressOpen()).toBe(false);
    expect(predecessor.gestureLease.isCurrent(gesture)).toBe(false);
    expect(predecessor.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
    expect(coordinatorCreates).toBe(2);
    expect(() => lifetime.replace({ kind: "coordinator_successor", recipe: recipeV1 }))
      .toThrowError("ui.managed_surface_lifetime_disposed");
  });

  it("keeps applicationEpoch out of the author-supplied recipe", () => {
    acceptRecipeForTypeBoundaryV1({
      resolvedOwnerIds: [ownerIdV1],
      resolvedSlotDescriptors: slotDescriptorsV1,
      // @ts-expect-error The composition root allocator owns applicationEpoch.
      applicationEpoch: parseNonNegativeSafeInteger(99),
    });
    expect(Object.keys(recipeV1)).toEqual([
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
    ]);
  });

  it("keeps whole-generation disposal behind the lifetime authority", () => {
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([1]),
      inputRouter: createInputRouterV1(),
      initialRecipe: recipeV1,
    });
    const runtime = lifetime.getCurrent()!;

    expect(Reflect.ownKeys(runtime.coordinator)).not.toContain("dispose");
    expect("dispose" in runtime.coordinator).toBe(false);
    // @ts-expect-error Whole-generation disposal is lifetime-owned.
    void runtime.coordinator.dispose;

    lifetime.dispose();
    expect(runtime.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
  });
});
