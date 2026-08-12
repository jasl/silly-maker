// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, type NonNegativeSafeInteger } from "@sillymaker/base";

import type { ManagedSurfaceCoordinatorRecipeV1 } from "./managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCoordinatorFacadeInternalV1,
  type ManagedSurfaceCoordinatorV1,
  type ManagedSurfaceSubscriberFailureV1,
} from "./managed-surface-coordinator.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

export interface ManagedSurfaceCompositeKernelBundleInternalV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
}
const invalidBundleCodeInternalV1 = "ui.managed_surface_composite_kernel_bundle_invalid";

/**
 * Builds the single composition-owned authority graph for an exact aggregate
 * family catalog. Its input is same-package normalized composition data.
 */
export function createManagedSurfaceCompositeKernelBundleInternalV1(input: {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly recipe: ManagedSurfaceCoordinatorRecipeV1;
  readonly definitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}): ManagedSurfaceCompositeKernelBundleInternalV1 {
  let applicationEpoch: NonNegativeSafeInteger;
  let initialTransientState: ReturnType<typeof createManagedSurfaceReducerStateV1>;
  let definitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  let reportSubscriberFailure: ((failure: ManagedSurfaceSubscriberFailureV1) => void) | undefined;
  try {
    applicationEpoch = parseNonNegativeSafeInteger(input.applicationEpoch);
    initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpoch,
      input.recipe.resolvedOwnerIds,
      input.recipe.resolvedSlotDescriptors,
    );
    definitionSidecars = input.definitionSidecars;
    if (!Array.isArray(definitionSidecars)) throw new TypeError();
    reportSubscriberFailure = input.recipe.reportSubscriberFailure;
    if (reportSubscriberFailure !== undefined && typeof reportSubscriberFailure !== "function") {
      throw new TypeError();
    }
  } catch {
    throw new TypeError(invalidBundleCodeInternalV1);
  }

  const publisherLeaseRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch,
    resolvedOwnerIds: initialTransientState.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const admissionAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry,
    definitionSidecars,
    resolvedSlotDescriptors: initialTransientState.resolvedSlotDescriptors,
  });
  const compositeRuntimeKernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority,
    publisherLeaseRegistry,
    initialTransientState,
    ...(reportSubscriberFailure === undefined ? {} : {
      reportSubscriberFailure: () => {
        reportSubscriberFailure(Object.freeze({
          code: "surface.subscriber_failed" as const,
          summary: "Managed Surface publication subscriber failed.",
          details: Object.freeze({ applicationEpoch }),
        }));
      },
    }),
  });
  return Object.freeze({
    applicationEpoch,
    coordinator: createManagedSurfaceCoordinatorFacadeInternalV1(compositeRuntimeKernel),
    publisherLeaseRegistry,
    admissionAuthority,
    compositeRuntimeKernel,
  });
}
