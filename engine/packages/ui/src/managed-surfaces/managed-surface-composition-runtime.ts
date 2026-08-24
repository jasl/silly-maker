// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { NonNegativeSafeInteger } from "@sillymaker/base";

import type { InputRouterV1 } from "../input/contracts.ts";
import {
  createManagedSurfaceCoordinatorLifetimeV1,
  type CreateManagedSurfaceCoordinatorLifetimeInputV1,
  type ManagedSurfaceApplicationEpochAllocatorV1,
  type ManagedSurfaceCoordinatorRecipeV1,
  type ManagedSurfaceCoordinatorRuntimeV1,
  type ManagedSurfaceCoordinatorSuccessorKindV1,
} from "./managed-surface-coordinator-lifetime.ts";

export interface ManagedSurfaceFamilyActivationGateInternalV1 {
  /** Opens every prepared family ingress at one composition-owned commit point. */
  isOpen(): boolean;
}

export interface ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  /** Closes family ingress and subscriptions without notifying family observers. */
  detachRuntimeInternalV1(): void;
  /** Silently binds the detached adapter to one successor runtime. */
  prepareRuntimeAttachmentInternalV1(
    runtime: ManagedSurfaceCoordinatorRuntimeV1,
    activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
  ): void;
  /** Arms ingress behind the shared gate and returns a no-throw notification closure. */
  activateRuntimeAttachmentInternalV1(): () => void;
  /** Cancels either a prepared or activated attachment without family notification. */
  abortRuntimeAttachmentInternalV1(): void;
}

export type ManagedSurfaceFamilyRuntimeAdaptersInternalV1 = readonly [
  ManagedSurfaceFamilyRuntimeAdapterInternalV1,
  ...ManagedSurfaceFamilyRuntimeAdapterInternalV1[],
];

export interface ManagedSurfaceCompositionRuntimeInternalV1 {
  getCurrent(): ManagedSurfaceCoordinatorRuntimeV1;
  replace(
    kind: ManagedSurfaceCoordinatorSuccessorKindV1,
    familyAdapters: ManagedSurfaceFamilyRuntimeAdaptersInternalV1,
  ): ManagedSurfaceCoordinatorRuntimeV1;
  dispose(): void;
}

export interface CreateManagedSurfaceCompositionRuntimeInternalInputV1 {
  readonly epochAllocator: ManagedSurfaceApplicationEpochAllocatorV1;
  readonly inputRouter: InputRouterV1;
  readonly recipe: ManagedSurfaceCoordinatorRecipeV1;
  /** @internal Deterministic test seam; production uses the standard registration. */
  readonly registerManagedInputHandler?: CreateManagedSurfaceCoordinatorLifetimeInputV1[
    "registerManagedInputHandler"
  ];
  /** @internal Deterministic test seam; production uses the standard Coordinator. */
  readonly createCoordinator?: CreateManagedSurfaceCoordinatorLifetimeInputV1[
    "createCoordinator"
  ];
}

/**
 * @internal Composition authority for one application epoch at a time.
 * Family adapters consume its runtime; only this owner rotates epochs and binds managed input.
 */
export function createManagedSurfaceCompositionRuntimeInternalV1(
  input: CreateManagedSurfaceCompositionRuntimeInternalInputV1,
): ManagedSurfaceCompositionRuntimeInternalV1 {
  const lifetime = createManagedSurfaceCoordinatorLifetimeV1({
    epochAllocator: input.epochAllocator,
    inputRouter: input.inputRouter,
    initialRecipe: input.recipe,
    ...(input.registerManagedInputHandler === undefined
      ? {}
      : { registerManagedInputHandler: input.registerManagedInputHandler }),
    ...(input.createCoordinator === undefined
      ? {}
      : { createCoordinator: input.createCoordinator }),
  });
  let current = lifetime.getCurrent()!;
  let unsubscribePublication: (() => void) | null = null;
  let disposed = false;
  let transitioning = false;

  const attachCurrent = (
    activationGate: ManagedSurfaceFamilyActivationGateInternalV1 | null,
  ): () => void => {
    const captured = current;
    const syncManagedInput = (): void => {
      if (
        captured !== current || !captured.isIngressOpen() ||
        (activationGate !== null && !activationGate.isOpen())
      ) return;
      if (captured.coordinator.getSnapshot().inputOwner !== null) captured.bindCurrentInput();
    };
    unsubscribePublication = captured.coordinator.subscribe(syncManagedInput);
    syncManagedInput();
    return syncManagedInput;
  };
  attachCurrent(null);

  return {
    getCurrent(): ManagedSurfaceCoordinatorRuntimeV1 {
      if (disposed) throw new TypeError("ui.managed_surface_composition_runtime_disposed");
      return current;
    },
    replace(
      kind: ManagedSurfaceCoordinatorSuccessorKindV1,
      familyAdapters: ManagedSurfaceFamilyRuntimeAdaptersInternalV1,
    ): ManagedSurfaceCoordinatorRuntimeV1 {
      if (disposed) throw new TypeError("ui.managed_surface_composition_runtime_disposed");
      if (transitioning) {
        throw new TypeError("ui.managed_surface_composition_transition_in_progress");
      }
      transitioning = true;
      const activationState = { open: false };
      const activationGate: ManagedSurfaceFamilyActivationGateInternalV1 = {
        isOpen: (): boolean => activationState.open,
      };
      try {
        const activationNotifications: (() => void)[] = [];
        try {
          for (const adapter of familyAdapters) adapter.detachRuntimeInternalV1();
          unsubscribePublication?.();
          unsubscribePublication = null;
          current = lifetime.replace({ kind, recipe: input.recipe });
          const syncCurrentInput = attachCurrent(activationGate);
          for (const adapter of familyAdapters) {
            adapter.prepareRuntimeAttachmentInternalV1(current, activationGate);
          }
          for (const adapter of familyAdapters) {
            activationNotifications.push(adapter.activateRuntimeAttachmentInternalV1());
          }
          // Open every armed family at one point, then install the current input
          // publication before any family observer can synchronously re-enter.
          activationState.open = true;
          syncCurrentInput();
        } catch (error) {
          activationState.open = false;
          disposed = true;
          const cleanupErrors: unknown[] = [];
          for (const adapter of familyAdapters) {
            try {
              adapter.abortRuntimeAttachmentInternalV1();
            } catch (cleanupError) {
              cleanupErrors.push(cleanupError);
            }
          }
          try {
            unsubscribePublication?.();
            unsubscribePublication = null;
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          try {
            lifetime.dispose();
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          if (cleanupErrors.length > 0) {
            const cleanupFailure = new Error(
              "ui.managed_surface_family_activation_cleanup_failed",
              { cause: error },
            );
            Object.defineProperty(cleanupFailure, "cleanupErrors", {
              value: cleanupErrors,
            });
            throw cleanupFailure;
          }
          throw error;
        }
        for (const notifyActivation of activationNotifications) notifyActivation();
        return current;
      } finally {
        transitioning = false;
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribePublication?.();
      unsubscribePublication = null;
      lifetime.dispose();
    },
  };
}

/** @internal Local non-HMR allocator; hosted composition injects the realm-stable allocator. */
export function createLocalManagedSurfaceEpochAllocatorInternalV1(): ManagedSurfaceApplicationEpochAllocatorV1 {
  let cursor: NonNegativeSafeInteger = parseNonNegativeSafeInteger(0);
  return {
    allocate(): NonNegativeSafeInteger {
      cursor = parseNonNegativeSafeInteger(cursor + 1);
      return cursor;
    },
  };
}
