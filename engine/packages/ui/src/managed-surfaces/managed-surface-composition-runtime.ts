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

export interface ManagedSurfaceCompositionRuntimeInternalV1 {
  getCurrent(): ManagedSurfaceCoordinatorRuntimeV1;
  replace(kind: ManagedSurfaceCoordinatorSuccessorKindV1): ManagedSurfaceCoordinatorRuntimeV1;
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

  const attachCurrent = (): void => {
    const captured = current;
    const syncManagedInput = (): void => {
      if (captured !== current || !captured.isIngressOpen()) return;
      if (captured.coordinator.getSnapshot().inputOwner !== null) captured.bindCurrentInput();
    };
    unsubscribePublication = captured.coordinator.subscribe(syncManagedInput);
    syncManagedInput();
  };
  attachCurrent();

  return Object.freeze({
    getCurrent(): ManagedSurfaceCoordinatorRuntimeV1 {
      if (disposed) throw new TypeError("ui.managed_surface_composition_runtime_disposed");
      return current;
    },
    replace(kind: ManagedSurfaceCoordinatorSuccessorKindV1): ManagedSurfaceCoordinatorRuntimeV1 {
      if (disposed) throw new TypeError("ui.managed_surface_composition_runtime_disposed");
      unsubscribePublication?.();
      unsubscribePublication = null;
      try {
        current = lifetime.replace({ kind, recipe: input.recipe });
      } catch (error) {
        disposed = true;
        throw error;
      }
      attachCurrent();
      return current;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribePublication?.();
      unsubscribePublication = null;
      lifetime.dispose();
    },
  });
}

/** @internal Local non-HMR allocator; hosted composition injects the realm-stable allocator. */
export function createLocalManagedSurfaceEpochAllocatorInternalV1(): ManagedSurfaceApplicationEpochAllocatorV1 {
  let cursor: NonNegativeSafeInteger = parseNonNegativeSafeInteger(0);
  return Object.freeze({
    allocate(): NonNegativeSafeInteger {
      cursor = parseNonNegativeSafeInteger(cursor + 1);
      return cursor;
    },
  });
}
