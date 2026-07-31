// SPDX-License-Identifier: MIT
import {
  type NonNegativeSafeInteger,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { InputRouterV1 } from "../input/contracts.ts";
import {
  type ManagedInputHandlerRegistrationV1,
  registerManagedInputHandlerV1,
} from "../input/input-router.ts";
import {
  createManagedSurfaceActionBindingV1,
  type ManagedSurfaceActionBindingV1,
} from "./managed-surface-action-route.ts";
import {
  type ManagedSurfaceGestureIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  parseManagedSurfaceGestureIdV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type CreateManagedSurfaceCoordinatorInputV1,
  type ManagedSurfaceCoordinatorV1,
  type ManagedSurfaceHandleResultV1,
  type ManagedSurfaceReadinessAdapterV1,
} from "./managed-surface-coordinator.ts";

export type ManagedSurfaceCoordinatorSuccessorKindV1 =
  | "load_rebootstrap"
  | "import_rebootstrap"
  | "hmr_successor"
  | "coordinator_successor";

export type ManagedSurfaceCoordinatorActivationKindV1 =
  | "initial"
  | ManagedSurfaceCoordinatorSuccessorKindV1;

export interface ManagedSurfaceApplicationEpochAllocatorV1 {
  allocate(): NonNegativeSafeInteger;
}

export interface ManagedSurfaceCoordinatorRecipeV1 {
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly reportSubscriberFailure?: CreateManagedSurfaceCoordinatorInputV1[
    "reportSubscriberFailure"
  ];
}

export interface ManagedSurfaceGestureLeaseV1 {
  begin(): ManagedSurfaceGestureIdV1;
  isCurrent(gestureId: ManagedSurfaceGestureIdV1): boolean;
  revoke(): void;
}

export type ManagedSurfaceCoordinatorRuntimePortV1 = Omit<
  ManagedSurfaceCoordinatorV1,
  "dispose"
>;

export interface ManagedSurfaceCoordinatorRuntimeV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly activationKind: ManagedSurfaceCoordinatorActivationKindV1;
  readonly coordinator: ManagedSurfaceCoordinatorRuntimePortV1;
  readonly gestureLease: ManagedSurfaceGestureLeaseV1;
  bindCurrentInput(): ManagedSurfaceActionBindingV1;
  isIngressOpen(): boolean;
}

export interface ManagedSurfaceCoordinatorReplaceInputV1 {
  readonly kind: ManagedSurfaceCoordinatorSuccessorKindV1;
  readonly recipe: ManagedSurfaceCoordinatorRecipeV1;
}

export interface ManagedSurfaceCoordinatorLifetimeV1 {
  getCurrent(): ManagedSurfaceCoordinatorRuntimeV1 | null;
  replace(input: ManagedSurfaceCoordinatorReplaceInputV1): ManagedSurfaceCoordinatorRuntimeV1;
  dispose(): void;
}

export interface CreateManagedSurfaceCoordinatorLifetimeInputV1 {
  readonly epochAllocator: ManagedSurfaceApplicationEpochAllocatorV1;
  readonly inputRouter: InputRouterV1;
  readonly initialRecipe: ManagedSurfaceCoordinatorRecipeV1;
  /** @internal Injected disposers must revoke registration before reporting failure. */
  readonly registerManagedInputHandler?: (
    router: InputRouterV1,
    registration: ManagedInputHandlerRegistrationV1,
  ) => () => void;
  /** @internal Deterministic test seam; the result must honor the Coordinator contract. */
  readonly createCoordinator?: (
    input: CreateManagedSurfaceCoordinatorInputV1,
  ) => ManagedSurfaceCoordinatorV1;
}

interface RuntimeRecordV1 {
  readonly runtime: ManagedSurfaceCoordinatorRuntimeV1;
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly gestureLease: ManagedSurfaceGestureLeaseOwnerV1;
  binding: ManagedSurfaceActionBindingV1 | null;
  ingressOpen: boolean;
  lastTopologyRevision: NonNegativeSafeInteger;
}

interface ManagedSurfaceGestureLeaseOwnerV1 extends ManagedSurfaceGestureLeaseV1 {
  dispose(): void;
}

type ManagedSurfaceCoordinatorLifetimePhaseV1 = "active" | "transitioning" | "sealed";

function createGestureLeaseV1(
  applicationEpoch: NonNegativeSafeInteger,
): ManagedSurfaceGestureLeaseOwnerV1 {
  let sequenceHighWater = 0;
  let currentGestureId: ManagedSurfaceGestureIdV1 | null = null;
  let disposed = false;

  return Object.freeze({
    begin(): ManagedSurfaceGestureIdV1 {
      if (disposed) throw new TypeError("ui.managed_surface_gesture_lease_disposed");
      if (sequenceHighWater >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError("ui.managed_surface_gesture_sequence_exhausted");
      }
      const sequence = parsePositiveSafeInteger(sequenceHighWater + 1);
      sequenceHighWater = sequence;
      currentGestureId = parseManagedSurfaceGestureIdV1(
        `surface-gesture.e${applicationEpoch}.n${sequence}`,
      );
      return currentGestureId;
    },
    isCurrent(gestureId: ManagedSurfaceGestureIdV1): boolean {
      return !disposed && currentGestureId !== null && gestureId === currentGestureId;
    },
    revoke(): void {
      currentGestureId = null;
    },
    dispose(): void {
      disposed = true;
      currentGestureId = null;
    },
  });
}

function cleanupErrorV1(errors: readonly unknown[]): AggregateError {
  return new AggregateError(errors, "ui.managed_surface_successor_cleanup_failed");
}

function createRuntimeCoordinatorPortV1(
  coordinator: ManagedSurfaceCoordinatorV1,
  requireIngress: () => void,
  isIngressOpen: () => boolean,
): ManagedSurfaceCoordinatorRuntimePortV1 {
  const gated = <Args extends unknown[], Result>(
    operation: (...args: Args) => Result,
  ): (...args: Args) => Result =>
  (...args: Args): Result => {
    requireIngress();
    return operation(...args);
  };

  const staleReadinessReceiptV1 = (
    evidence: ManagedSurfaceReadinessAdapterV1["evidence"],
  ) => {
    const topologyRevision = coordinator.getSnapshot().topologyRevision;
    return Object.freeze({
      kind: "stale" as const,
      code: "surface.stale_readiness" as const,
      beforeTopologyRevision: topologyRevision,
      afterTopologyRevision: topologyRevision,
      surfaceInstanceId: evidence.surfaceInstanceId,
    });
  };
  const runtimeReadinessAdapterV1 = (
    readiness: ManagedSurfaceReadinessAdapterV1,
  ): ManagedSurfaceReadinessAdapterV1 =>
    Object.freeze({
      evidence: readiness.evidence,
      ready(): ManagedSurfaceHandleResultV1 {
        if (isIngressOpen()) return readiness.ready();
        return Object.freeze({
          receipt: staleReadinessReceiptV1(readiness.evidence),
          handle: null,
          readiness: null,
        });
      },
      fail() {
        return isIngressOpen() ? readiness.fail() : staleReadinessReceiptV1(readiness.evidence);
      },
    });
  const preparationResultV1 = (result: ManagedSurfaceHandleResultV1) =>
    result.readiness === null ? result : Object.freeze({
      ...result,
      readiness: runtimeReadinessAdapterV1(result.readiness),
    });
  const gatedPreparation = <Args extends unknown[]>(
    operation: (...args: Args) => ManagedSurfaceHandleResultV1,
  ): (...args: Args) => ManagedSurfaceHandleResultV1 =>
  (...args: Args): ManagedSurfaceHandleResultV1 => {
    requireIngress();
    return preparationResultV1(operation(...args));
  };

  return Object.freeze({
    getSnapshot: coordinator.getSnapshot,
    getHandle: gated(coordinator.getHandle),
    getOwnerHandle: gated(coordinator.getOwnerHandle),
    subscribe: gated(coordinator.subscribe),
    openTransientPrimary: gatedPreparation(coordinator.openTransientPrimary),
    replaceTransientPrimary: gatedPreparation(coordinator.replaceTransientPrimary),
    pushTransientChild: gatedPreparation(coordinator.pushTransientChild),
    closeExpected: gated(coordinator.closeExpected),
    closeTop: gated(coordinator.closeTop),
    closeOwner: gated(coordinator.closeOwner),
    routeDismiss: gated(coordinator.routeDismiss),
    routeAction: gated(coordinator.routeAction),
    disposeOwner: gated(coordinator.disposeOwner),
  });
}

function createRuntimeGestureLeasePortV1(
  gestureLease: ManagedSurfaceGestureLeaseOwnerV1,
  requireIngress: () => void,
  isIngressOpen: () => boolean,
): ManagedSurfaceGestureLeaseV1 {
  return Object.freeze({
    begin(): ManagedSurfaceGestureIdV1 {
      requireIngress();
      return gestureLease.begin();
    },
    isCurrent(gestureId: ManagedSurfaceGestureIdV1): boolean {
      return isIngressOpen() && gestureLease.isCurrent(gestureId);
    },
    revoke(): void {
      requireIngress();
      gestureLease.revoke();
    },
  });
}

export function createManagedSurfaceCoordinatorLifetimeV1(
  input: CreateManagedSurfaceCoordinatorLifetimeInputV1,
): ManagedSurfaceCoordinatorLifetimeV1 {
  const createCoordinator = input.createCoordinator ?? createManagedSurfaceCoordinatorV1;
  const registerManagedInputHandler = input.registerManagedInputHandler ??
    ((router: InputRouterV1, registration: ManagedInputHandlerRegistrationV1) =>
      registerManagedInputHandlerV1(router, registration));
  let lastApplicationEpoch: NonNegativeSafeInteger | null = null;
  let current: RuntimeRecordV1 | null = null;
  let phase: ManagedSurfaceCoordinatorLifetimePhaseV1 = "active";

  const allocateEpoch = (): NonNegativeSafeInteger => {
    const applicationEpoch = parseNonNegativeSafeInteger(input.epochAllocator.allocate());
    if (lastApplicationEpoch !== null && applicationEpoch <= lastApplicationEpoch) {
      throw new TypeError("ui.managed_surface_application_epoch_not_monotonic");
    }
    lastApplicationEpoch = applicationEpoch;
    return applicationEpoch;
  };

  const createRuntime = (
    activationKind: ManagedSurfaceCoordinatorActivationKindV1,
    recipe: ManagedSurfaceCoordinatorRecipeV1,
  ): RuntimeRecordV1 => {
    const applicationEpoch = allocateEpoch();
    const coordinator = createCoordinator({
      applicationEpoch,
      resolvedOwnerIds: recipe.resolvedOwnerIds,
      resolvedSlotDescriptors: recipe.resolvedSlotDescriptors,
      ...(recipe.reportSubscriberFailure === undefined
        ? {}
        : { reportSubscriberFailure: recipe.reportSubscriberFailure }),
    });
    if (coordinator.getSnapshot().applicationEpoch !== applicationEpoch) {
      coordinator.dispose();
      throw new TypeError("ui.managed_surface_coordinator_epoch_mismatch");
    }
    const gestureLease = createGestureLeaseV1(applicationEpoch);
    let record!: RuntimeRecordV1;
    const isIngressOpen = (): boolean => record.ingressOpen && current === record;
    const requireIngress = (): void => {
      if (!isIngressOpen()) {
        throw new TypeError("ui.managed_surface_ingress_closed");
      }
    };
    const coordinatorPort = createRuntimeCoordinatorPortV1(
      coordinator,
      requireIngress,
      isIngressOpen,
    );
    const gestureLeasePort = createRuntimeGestureLeasePortV1(
      gestureLease,
      requireIngress,
      isIngressOpen,
    );
    const runtime: ManagedSurfaceCoordinatorRuntimeV1 = Object.freeze({
      applicationEpoch,
      activationKind,
      coordinator: coordinatorPort,
      gestureLease: gestureLeasePort,
      bindCurrentInput(): ManagedSurfaceActionBindingV1 {
        requireIngress();
        const binding = createManagedSurfaceActionBindingV1({
          coordinator,
          inputRouter: input.inputRouter,
          isGestureCurrent: gestureLease.isCurrent,
          registerManagedInputHandler,
        });
        record.binding = binding;
        return binding;
      },
      isIngressOpen(): boolean {
        return isIngressOpen();
      },
    });
    record = {
      runtime,
      coordinator,
      gestureLease,
      binding: null,
      ingressOpen: false,
      lastTopologyRevision: coordinator.getSnapshot().topologyRevision,
    };
    coordinator.subscribe(() => {
      if (coordinator.getSnapshot().topologyRevision === record.lastTopologyRevision) return;
      record.lastTopologyRevision = coordinator.getSnapshot().topologyRevision;
      const binding = record.binding;
      record.binding = null;
      try {
        binding?.dispose();
      } finally {
        gestureLease.revoke();
      }
    });
    return record;
  };

  const cleanupCurrent = (): void => {
    const predecessor = current;
    current = null;
    if (predecessor === null) return;
    predecessor.ingressOpen = false;
    const binding = predecessor.binding;
    predecessor.binding = null;
    const errors: unknown[] = [];
    try {
      binding?.dispose();
    } catch (error) {
      errors.push(error);
    }
    try {
      predecessor.gestureLease.dispose();
    } catch (error) {
      errors.push(error);
    }
    try {
      predecessor.coordinator.dispose();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0) throw cleanupErrorV1(errors);
  };

  const initial = createRuntime("initial", input.initialRecipe);
  initial.ingressOpen = true;
  current = initial;

  const lifetime: ManagedSurfaceCoordinatorLifetimeV1 = Object.freeze({
    getCurrent(): ManagedSurfaceCoordinatorRuntimeV1 | null {
      return current?.runtime ?? null;
    },
    replace(request: ManagedSurfaceCoordinatorReplaceInputV1): ManagedSurfaceCoordinatorRuntimeV1 {
      if (phase === "sealed") throw new TypeError("ui.managed_surface_lifetime_disposed");
      if (phase === "transitioning") {
        throw new TypeError("ui.managed_surface_lifetime_transition_in_progress");
      }
      phase = "transitioning";
      try {
        cleanupCurrent();
      } catch (error) {
        phase = "sealed";
        throw error;
      }
      let successor: RuntimeRecordV1;
      try {
        successor = createRuntime(request.kind, request.recipe);
      } catch (error) {
        phase = "sealed";
        throw error;
      }
      successor.ingressOpen = true;
      current = successor;
      phase = "active";
      return successor.runtime;
    },
    dispose(): void {
      if (phase === "sealed") return;
      if (phase === "transitioning") {
        throw new TypeError("ui.managed_surface_lifetime_transition_in_progress");
      }
      phase = "sealed";
      cleanupCurrent();
    },
  });

  return lifetime;
}
