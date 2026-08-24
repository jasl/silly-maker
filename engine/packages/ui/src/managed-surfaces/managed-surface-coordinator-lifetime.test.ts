// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
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
  type ManagedSurfaceCoordinatorRuntimeV1,
} from "./managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type CreateManagedSurfaceCoordinatorInputV1,
  type ManagedSurfaceHandleResultV1,
} from "./managed-surface-coordinator.ts";

const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const slotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
      cardinality: "single",
    }),
    Object.freeze({
      kind: "child",
      parentDefinitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace"),
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
      cardinality: "stack",
    }),
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);
const recipeV1: ManagedSurfaceCoordinatorRecipeV1 = Object.freeze({
  resolvedOwnerIds: Object.freeze([ownerIdV1]),
  resolvedSlotDescriptors: slotDescriptorsV1,
});

function definitionV1(
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return Object.freeze({
    definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace"),
    contractRevision: parsePositiveSafeInteger(1),
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
    readiness: Object.freeze({
      initialOpen: "blocking_fallback",
      primaryReplacement: "retain_current",
      childOpen: "blocking_fallback",
    }),
    ...overrides,
  });
}

function openV1(runtime: ManagedSurfaceCoordinatorRuntimeV1) {
  const preparation = runtime.coordinator.openTransientPrimary({
    definition: definitionV1(),
    semanticOccurrenceId: null,
  });
  expect(preparation.receipt).toMatchObject({
    kind: "applied",
    code: "surface.preparation_started",
  });
  const result = preparation.readiness!.ready();
  expect(result.receipt).toMatchObject({
    kind: "applied",
    code: "surface.readiness_ready",
  });
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

function countingManagedInputRegistrationV1() {
  let activeRegistrations = 0;
  let registrations = 0;
  let unregistrations = 0;
  return Object.freeze({
    register(
      router: ReturnType<typeof createInputRouterV1>,
      registration: ManagedInputHandlerRegistrationV1,
    ): () => void {
      registrations += 1;
      activeRegistrations += 1;
      const unregister = registerManagedInputHandlerV1(router, registration);
      let active = true;
      return (): void => {
        if (!active) return;
        active = false;
        unregistrations += 1;
        activeRegistrations -= 1;
        unregister();
      };
    },
    active: () => activeRegistrations,
    registered: () => registrations,
    unregistered: () => unregistrations,
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
      let managedRegistrations = 0;
      let managedUnregistrations = 0;

      const registerManagedInputHandler = (
        target: typeof router,
        registration: ManagedInputHandlerRegistrationV1,
      ): () => void => {
        managedRegistrations += 1;
        activeManagedRegistrations += 1;
        const unregister = registerManagedInputHandlerV1(target, registration);
        events.push("register");
        return () => {
          managedUnregistrations += 1;
          activeManagedRegistrations -= 1;
          unregister();
          events.push("unregister");
        };
      };
      const epochAllocator = deterministicAllocatorV1([41, 47], (epoch, call) => {
        events.push(`allocate:${epoch}`);
        if (call !== 2) return;
        expect(lifetime.getCurrent()).toBeNull();
        expect({
          activeManagedRegistrations,
          managedRegistrations,
          managedUnregistrations,
        }).toEqual({
          activeManagedRegistrations: 1,
          managedRegistrations: 1,
          managedUnregistrations: 0,
        });
        expect(predecessor.gestureLease.isCurrent(predecessorGesture)).toBe(false);
        expect(predecessorBinding.route(predecessorBinding.createEnvelope({
          actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
          gestureId: predecessorGesture,
        }))).toMatchObject({
          input: { kind: "consumed", code: "input.stale_publication" },
          surface: null,
        });
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

      const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
        epochAllocator,
        inputRouter: router,
        initialRecipe: recipeV1,
        registerManagedInputHandler,
        createCoordinator,
      });
      const predecessor = lifetime.getCurrent()!;
      openV1(predecessor);
      const predecessorGesture = predecessor.gestureLease.begin();
      const predecessorBinding = predecessor.bindCurrentInput();
      predecessor.coordinator.subscribe(() => {
        if (!predecessor.coordinator.getSnapshot().coordinatorDisposed) return;
        events.push("coordinator_disposed");
        expect(lifetime.getCurrent()).toBeNull();
        expect(predecessor.isIngressOpen()).toBe(false);
      });
      events.length = 0;

      const successor = lifetime.replace({ kind, recipe: recipeV1 });

      expect(events).toEqual([
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
      lifetime.dispose();
      expect(lifetime.getCurrent()).toBeNull();
      expect(successor.isIngressOpen()).toBe(false);
      expect({
        activeManagedRegistrations,
        managedRegistrations,
        managedUnregistrations,
      }).toEqual({
        activeManagedRegistrations: 1,
        managedRegistrations: 1,
        managedUnregistrations: 0,
      });
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

  it("retains the current binding and gesture until replacement readiness cuts over", () => {
    const router = createInputRouterV1();
    let ordinaryInputCalls = 0;
    router.register({
      context: "overlay",
      handle: () => {
        ordinaryInputCalls += 1;
        return inputHandledV1;
      },
    });
    const registrations = countingManagedInputRegistrationV1();
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([21]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler: registrations.register,
    });
    const runtime = lifetime.getCurrent()!;
    const retainedHandle = openV1(runtime);
    const retainedGesture = runtime.gestureLease.begin();
    const retainedBinding = runtime.bindCurrentInput();
    const retainedEnvelope = retainedBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: retainedGesture,
    });
    expect(registrations.active()).toBe(1);

    const first = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    expect(runtime.coordinator.getSnapshot()).toMatchObject({
      publicationRevision: 3,
      topologyRevision: 2,
      inputOwner: { surfaceInstanceId: retainedHandle.surfaceInstanceId },
      focusOwner: { surfaceInstanceId: retainedHandle.surfaceInstanceId },
      navigationTargetInstanceId: retainedHandle.surfaceInstanceId,
    });
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(registrations.registered()).toBe(1);
    expect(registrations.active()).toBe(1);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
    expect(retainedBinding.route(retainedEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(ordinaryInputCalls).toBe(1);

    const second = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    expect(first.readiness!.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(registrations.active()).toBe(1);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);

    expect(second.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
    });
    expect(runtime.coordinator.getSnapshot()).toMatchObject({
      publicationRevision: 5,
      topologyRevision: 2,
      inputOwner: { surfaceInstanceId: retainedHandle.surfaceInstanceId },
    });
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(registrations.active()).toBe(1);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);

    const third = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    const candidateInstanceId = third.receipt.surfaceInstanceId!;
    const observedAtomicCutovers: unknown[] = [];
    runtime.coordinator.subscribe(() => {
      const snapshot = runtime.coordinator.getSnapshot();
      if (snapshot.inputOwner?.surfaceInstanceId !== candidateInstanceId) return;
      observedAtomicCutovers.push({
        publicationRevision: snapshot.publicationRevision,
        topologyRevision: snapshot.topologyRevision,
        focusOwner: snapshot.focusOwner?.surfaceInstanceId ?? null,
        navigationTarget: snapshot.navigationTargetInstanceId,
        activeRegistrations: registrations.active(),
        retainedGestureCurrent: runtime.gestureLease.isCurrent(retainedGesture),
      });
    });

    const activated = third.readiness!.ready();
    expect(activated.receipt).toMatchObject({
      kind: "applied",
      code: "surface.readiness_ready",
      surfaceInstanceId: candidateInstanceId,
    });
    expect(observedAtomicCutovers).toEqual([
      {
        publicationRevision: 7,
        topologyRevision: 3,
        focusOwner: candidateInstanceId,
        navigationTarget: candidateInstanceId,
        activeRegistrations: 1,
        retainedGestureCurrent: false,
      },
    ]);
    expect(registrations.unregistered()).toBe(0);
    expect(retainedBinding.route(retainedEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(ordinaryInputCalls).toBe(1);

    const successorGesture = runtime.gestureLease.begin();
    const successorBinding = runtime.bindCurrentInput();
    expect(successorBinding).not.toBe(retainedBinding);
    expect(registrations.registered()).toBe(1);
    expect(registrations.active()).toBe(1);
    const successorEnvelope = successorBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: successorGesture,
    });
    expect(successorBinding.route(successorEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(ordinaryInputCalls).toBe(2);

    lifetime.dispose();
    expect(successorBinding.route(successorEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(registrations.registered()).toBe(1);
    expect(registrations.unregistered()).toBe(0);
    expect(registrations.active()).toBe(1);
  });

  it("keeps the exact binding and gesture when a pending replacement is cancelled", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    const registrations = countingManagedInputRegistrationV1();
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([22]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler: registrations.register,
    });
    const runtime = lifetime.getCurrent()!;
    const retainedHandle = openV1(runtime);
    const retainedGesture = runtime.gestureLease.begin();
    const retainedBinding = runtime.bindCurrentInput();
    const retainedEnvelope = retainedBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: retainedGesture,
    });
    const replacement = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace.replacement"),
      }),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    const before = runtime.coordinator.getSnapshot();

    const cancelled = runtime.coordinator.cancelTransientPrimaryReplacement({
      retained: retainedHandle,
      pending: replacement.readiness!.evidence,
    });
    const after = runtime.coordinator.getSnapshot();

    expect(cancelled).toMatchObject({
      kind: "applied",
      code: "surface.preparation_cancelled",
    });
    expect(after.publicationRevision - before.publicationRevision).toBe(1);
    expect(after.topologyRevision).toBe(before.topologyRevision);
    expect(after.inputOwner).toEqual(before.inputOwner);
    expect(after.focusOwner).toEqual(before.focusOwner);
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(registrations.registered()).toBe(1);
    expect(registrations.unregistered()).toBe(0);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
    expect(retainedBinding.route(retainedEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.managed_surface_consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(replacement.readiness!.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });

    lifetime.dispose();
  });

  it("revokes ordinary input before publishing a child blocking fallback", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    const registrations = countingManagedInputRegistrationV1();
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([31]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler: registrations.register,
    });
    const runtime = lifetime.getCurrent()!;
    const parentHandle = openV1(runtime);
    const parentGesture = runtime.gestureLease.begin();
    const parentBinding = runtime.bindCurrentInput();
    const parentEnvelope = parentBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: parentGesture,
    });
    const observedFallbackFences: unknown[] = [];
    runtime.coordinator.subscribe(() => {
      const snapshot = runtime.coordinator.getSnapshot();
      if (snapshot.preparationFallbacks.length === 0) return;
      observedFallbackFences.push({
        publicationRevision: snapshot.publicationRevision,
        topologyRevision: snapshot.topologyRevision,
        inputOwner: snapshot.inputOwner,
        focusOwner: snapshot.focusOwner,
        navigationTargetInstanceId: snapshot.navigationTargetInstanceId,
        activeRegistrations: registrations.active(),
        parentGestureCurrent: runtime.gestureLease.isCurrent(parentGesture),
      });
    });

    const child = runtime.coordinator.pushTransientChild({
      definition: definitionV1({
        definitionId: parseManagedSurfaceDefinitionIdV1("surface.workspace.detail"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.detail"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace-detail"),
        layerOrder: parseNonNegativeSafeInteger(30),
        placement: "child",
      }),
      semanticOccurrenceId: null,
      parent: parentHandle,
    });
    expect(child.receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
    });
    expect(observedFallbackFences).toEqual([
      {
        publicationRevision: 3,
        topologyRevision: 3,
        inputOwner: null,
        focusOwner: null,
        navigationTargetInstanceId: null,
        activeRegistrations: 1,
        parentGestureCurrent: false,
      },
    ]);
    expect(parentBinding.route(parentEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });

    expect(child.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
    });
    expect(runtime.coordinator.getSnapshot()).toMatchObject({
      publicationRevision: 4,
      topologyRevision: 4,
      inputOwner: { surfaceInstanceId: parentHandle.surfaceInstanceId },
      focusOwner: { surfaceInstanceId: parentHandle.surfaceInstanceId },
      navigationTargetInstanceId: parentHandle.surfaceInstanceId,
    });
    expect(runtime.gestureLease.isCurrent(parentGesture)).toBe(false);
    expect(registrations.active()).toBe(1);
    const restoredBinding = runtime.bindCurrentInput();
    expect(restoredBinding).not.toBe(parentBinding);
    expect(registrations.registered()).toBe(1);
    expect(registrations.active()).toBe(1);

    lifetime.dispose();
    expect(registrations.registered()).toBe(1);
    expect(registrations.unregistered()).toBe(0);
    expect(registrations.active()).toBe(1);
  });

  it("cancels pending readiness across an epoch rotation before successor ingress", () => {
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([37, 41]),
      inputRouter: createInputRouterV1(),
      initialRecipe: recipeV1,
    });
    const predecessor = lifetime.getCurrent()!;
    const pending = predecessor.coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(pending.receipt.surfaceInstanceId).toBe("surface-instance.e37.n1");

    const successor = lifetime.replace({
      kind: "coordinator_successor",
      recipe: recipeV1,
    });
    const predecessorTerminal = predecessor.coordinator.getSnapshot();
    expect(predecessorTerminal).toMatchObject({
      publicationRevision: 2,
      topologyRevision: 2,
      orderedInstances: [],
      preparationFallbacks: [],
      inputOwner: null,
      focusOwner: null,
      navigationTargetInstanceId: null,
      coordinatorDisposed: true,
    });
    const successorBeforeLateReceipt = successor.coordinator.getSnapshot();

    expect(pending.readiness!.ready()).toMatchObject({
      receipt: {
        kind: "stale",
        code: "surface.stale_readiness",
        surfaceInstanceId: "surface-instance.e37.n1",
      },
      handle: null,
      readiness: null,
    });
    expect(pending.readiness!.fail()).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
      surfaceInstanceId: "surface-instance.e37.n1",
    });
    expect(predecessor.coordinator.getSnapshot()).toBe(predecessorTerminal);
    expect(successor.coordinator.getSnapshot()).toBe(successorBeforeLateReceipt);

    const successorPending = successor.coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });
    expect(successorPending.receipt.surfaceInstanceId).toBe("surface-instance.e41.n1");
    expect(successorPending.receipt.surfaceInstanceId).not.toBe(
      pending.receipt.surfaceInstanceId,
    );

    lifetime.dispose();
  });

  it("fences reentrant readiness from the predecessor terminal notification", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    const registrations = countingManagedInputRegistrationV1();
    let reentrantReadiness: ManagedSurfaceHandleResultV1 | undefined;
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([51, 53]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler: registrations.register,
    });
    const predecessor = lifetime.getCurrent()!;
    const retainedHandle = openV1(predecessor);
    const retainedGesture = predecessor.gestureLease.begin();
    predecessor.bindCurrentInput();
    const pending = predecessor.coordinator.replaceTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
      expected: retainedHandle,
    });
    const observedPublications: Array<{
      readonly publicationRevision: number;
      readonly topologyRevision: number;
      readonly coordinatorDisposed: boolean;
    }> = [];
    predecessor.coordinator.subscribe(() => {
      const snapshot = predecessor.coordinator.getSnapshot();
      observedPublications.push({
        publicationRevision: snapshot.publicationRevision,
        topologyRevision: snapshot.topologyRevision,
        coordinatorDisposed: snapshot.coordinatorDisposed,
      });
      if (snapshot.coordinatorDisposed) {
        reentrantReadiness = pending.readiness!.ready();
      }
    });

    const successor = lifetime.replace({
      kind: "hmr_successor",
      recipe: recipeV1,
    });

    expect(reentrantReadiness).toMatchObject({
      receipt: {
        kind: "stale",
        code: "surface.stale_readiness",
        surfaceInstanceId: pending.receipt.surfaceInstanceId,
      },
      handle: null,
      readiness: null,
    });
    expect(observedPublications).toEqual([
      {
        publicationRevision: 4,
        topologyRevision: 3,
        coordinatorDisposed: true,
      },
    ]);
    expect(predecessor.gestureLease.isCurrent(retainedGesture)).toBe(false);
    expect(predecessor.coordinator.getSnapshot().orderedInstances).toEqual([]);
    expect(successor.isIngressOpen()).toBe(true);
    expect(registrations.registered()).toBe(1);
    expect(registrations.unregistered()).toBe(0);
    expect(registrations.active()).toBe(1);

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

  it("closes every predecessor runtime ingress before terminal notification reentry", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    const registrations = countingManagedInputRegistrationV1();
    let reentrantReceipt: unknown;
    let reentrantFailure: unknown;
    const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
      epochAllocator: deterministicAllocatorV1([11, 12]),
      inputRouter: router,
      initialRecipe: recipeV1,
      registerManagedInputHandler: registrations.register,
    });
    const predecessor = lifetime.getCurrent()!;
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
      if (snapshot.coordinatorDisposed) {
        try {
          reentrantReceipt = predecessor.coordinator.closeTop();
        } catch (error) {
          reentrantFailure = error;
        }
      }
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
        publicationRevision: 3,
        topologyRevision: 3,
      },
    ]);
    expect(predecessor.coordinator.getSnapshot()).toMatchObject({
      coordinatorDisposed: true,
      publicationRevision: 3,
      topologyRevision: 3,
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
        "supersedeTransientInitialPreparation",
        () =>
          predecessor.coordinator.supersedeTransientInitialPreparation({
            definition: definitionV1(),
            semanticOccurrenceId: null,
            expected: {
              applicationEpoch: predecessorHandle.applicationEpoch,
              surfaceInstanceId: predecessorHandle.surfaceInstanceId,
            },
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
        "cancelTransientPrimaryReplacement",
        () =>
          predecessor.coordinator.cancelTransientPrimaryReplacement({
            retained: predecessorHandle,
            pending: {
              applicationEpoch: predecessorHandle.applicationEpoch,
              surfaceInstanceId: predecessorHandle.surfaceInstanceId,
            },
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
      [
        "closeExpectedWithOwnerPreparationCancel",
        () =>
          predecessor.coordinator.closeExpectedWithOwnerPreparationCancel(
            predecessorHandle,
            ownerIdV1,
          ),
      ],
      ["closeTop", () => predecessor.coordinator.closeTop()],
      [
        "closeTopWithOwnerPreparationCancel",
        () => predecessor.coordinator.closeTopWithOwnerPreparationCancel(ownerIdV1),
      ],
      ["closeOwner", () => predecessor.coordinator.closeOwner(predecessorOwnerHandle)],
      [
        "routeDismiss",
        () => predecessor.coordinator.routeDismiss(predecessorHandle, "back"),
      ],
      [
        "routeDismissWithOwnerPreparationCancel",
        () =>
          predecessor.coordinator.routeDismissWithOwnerPreparationCancel(
            predecessorHandle,
            ownerIdV1,
            "back",
          ),
      ],
      [
        "routeFallbackDismissExactCandidate",
        () =>
          predecessor.coordinator.routeFallbackDismissExactCandidate(
            {
              applicationEpoch: predecessorHandle.applicationEpoch,
              surfaceInstanceId: predecessorHandle.surfaceInstanceId,
            },
            "back",
          ),
      ],
      [
        "routeFallbackDismissWithOwnerPreparationCancel",
        () =>
          predecessor.coordinator.routeFallbackDismissWithOwnerPreparationCancel(
            {
              applicationEpoch: predecessorHandle.applicationEpoch,
              surfaceInstanceId: predecessorHandle.surfaceInstanceId,
            },
            ownerIdV1,
            "back",
          ),
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
    expect(registrations.registered()).toBe(1);
    expect(registrations.unregistered()).toBe(0);
    expect(registrations.active()).toBe(1);

    lifetime.dispose();
  });

  it("fails closed on terminal cleanup failure without unregistering the stable dispatcher", () => {
    const router = createInputRouterV1();
    router.register({ context: "overlay", handle: () => inputHandledV1 });
    let allocatorCalls = 0;
    let coordinatorCreates = 0;
    let activeManagedRegistrations = 0;
    let managedUnregistrations = 0;
    const cleanupFailure = new Error("test.coordinator_dispose_failed");
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
        const coordinator = createManagedSurfaceCoordinatorV1(input);
        return Object.freeze({
          ...coordinator,
          dispose() {
            coordinator.dispose();
            throw cleanupFailure;
          },
        });
      },
      registerManagedInputHandler(target, registration) {
        activeManagedRegistrations += 1;
        const unregister = registerManagedInputHandlerV1(target, registration);
        return () => {
          managedUnregistrations += 1;
          activeManagedRegistrations -= 1;
          unregister();
        };
      },
    });
    const predecessor = lifetime.getCurrent()!;
    openV1(predecessor);
    const gesture = predecessor.gestureLease.begin();
    const binding = predecessor.bindCurrentInput();
    const envelope = binding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.activate"),
      gestureId: gesture,
    });

    let failure: unknown;
    try {
      lifetime.replace({ kind: "hmr_successor", recipe: recipeV1 });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toHaveLength(1);
    expect((failure as AggregateError).errors[0]).toBe(cleanupFailure);
    expect((failure as Error).message).toBe("ui.managed_surface_successor_cleanup_failed");
    expect(lifetime.getCurrent()).toBeNull();
    expect(activeManagedRegistrations).toBe(1);
    expect(managedUnregistrations).toBe(0);
    expect(predecessor.gestureLease.isCurrent(gesture)).toBe(false);
    expect(predecessor.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
    expect(binding.route(envelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
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

    expect("dispose" in runtime.coordinator).toBe(false);
    // @ts-expect-error Whole-generation disposal is lifetime-owned.
    void runtime.coordinator.dispose;

    lifetime.dispose();
    expect(runtime.coordinator.getSnapshot().coordinatorDisposed).toBe(true);
  });
});
