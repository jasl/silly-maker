// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createNarrativeManagedSurfaceFamilyContractInternalV1 } from "../narrative/narrative-managed-surface-family.ts";
import { createWholeCanvasManagedSurfaceFamilyContractInternalV1 } from "../whole-canvas/whole-canvas-managed-surface-family.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "./managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceCoordinatorRecipeV1 } from "./managed-surface-coordinator-lifetime.ts";

function aggregateFixtureV1() {
  const narrative = createNarrativeManagedSurfaceFamilyContractInternalV1({ history: true });
  const wholeCanvas = createWholeCanvasManagedSurfaceFamilyContractInternalV1(Object.freeze([]));
  const recipe: ManagedSurfaceCoordinatorRecipeV1 = Object.freeze({
    resolvedOwnerIds: Object.freeze([
      ...narrative.resolvedOwnerIds,
      ...wholeCanvas.resolvedOwnerIds,
    ]),
    resolvedSlotDescriptors: Object.freeze([
      ...narrative.resolvedSlotDescriptors,
      ...wholeCanvas.resolvedSlotDescriptors,
    ]),
  });
  const definitionSidecars = Object.freeze([
    ...narrative.stableDefinitionSidecars,
    ...wholeCanvas.stableDefinitionSidecars,
  ]);
  return Object.freeze({ narrative, wholeCanvas, recipe, definitionSidecars });
}

function createAggregateBundleV1(): ManagedSurfaceCompositeKernelBundleInternalV1 {
  const fixture = aggregateFixtureV1();
  return createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
    applicationEpoch: parseNonNegativeSafeInteger(7),
    recipe: fixture.recipe,
    definitionSidecars: fixture.definitionSidecars,
  }));
}

describe("managed-surface composite-kernel bundle", () => {
  it("builds one shared authority graph for Narrative and WholeCanvas", () => {
    const fixture = aggregateFixtureV1();
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe: fixture.recipe,
      definitionSidecars: fixture.definitionSidecars,
    }));

    expect(bundle.applicationEpoch).toBe(7);
    expect(bundle.coordinator.getSnapshot()).toBe(
      bundle.compositeRuntimeKernel.getTransientSnapshotInternalV1(),
    );
  });

  it("accepts ordinary typed composition data without frozen-record admission", () => {
    const fixture = aggregateFixtureV1();
    const recipe: ManagedSurfaceCoordinatorRecipeV1 = {
      resolvedOwnerIds: [...fixture.recipe.resolvedOwnerIds],
      resolvedSlotDescriptors: [...fixture.recipe.resolvedSlotDescriptors],
    };
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe,
      definitionSidecars: [...fixture.definitionSidecars],
    });

    expect(bundle.applicationEpoch).toBe(7);
    expect(bundle.coordinator.getSnapshot()).toBe(
      bundle.compositeRuntimeKernel.getTransientSnapshotInternalV1(),
    );
  });

  it("rejects duplicate aggregate owners and slots as semantic construction failures", () => {
    const fixture = aggregateFixtureV1();
    const duplicateOwnerRecipe: ManagedSurfaceCoordinatorRecipeV1 = {
      ...fixture.recipe,
      resolvedOwnerIds: [
        ...fixture.recipe.resolvedOwnerIds,
        fixture.recipe.resolvedOwnerIds[0]!,
      ],
    };
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: duplicateOwnerRecipe,
        definitionSidecars: [...fixture.definitionSidecars],
      })
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");

    const duplicateSlotRecipe: ManagedSurfaceCoordinatorRecipeV1 = {
      ...fixture.recipe,
      resolvedSlotDescriptors: [
        ...fixture.recipe.resolvedSlotDescriptors,
        fixture.recipe.resolvedSlotDescriptors[0]!,
      ],
    };
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: duplicateSlotRecipe,
        definitionSidecars: [...fixture.definitionSidecars],
      })
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
  });

  it("keeps independently created bundles on disjoint authority graphs", () => {
    const first = createAggregateBundleV1();
    const second = createAggregateBundleV1();

    expect(second).not.toBe(first);
    expect(second.coordinator).not.toBe(first.coordinator);
    expect(second.publisherLeaseRegistry).not.toBe(first.publisherLeaseRegistry);
    expect(second.admissionAuthority).not.toBe(first.admissionAuthority);
    expect(second.compositeRuntimeKernel).not.toBe(first.compositeRuntimeKernel);
  });

  it("preserves the captured recipe subscriber-failure reporter", () => {
    const fixture = aggregateFixtureV1();
    const reportSubscriberFailure = vi.fn();
    const recipe = Object.freeze({
      ...fixture.recipe,
      reportSubscriberFailure,
    });
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe,
      definitionSidecars: fixture.definitionSidecars,
    }));
    bundle.compositeRuntimeKernel.subscribeStateInternalV1(() => {
      throw new Error("subscriber failure");
    });

    expect(bundle.compositeRuntimeKernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
    expect(reportSubscriberFailure).toHaveBeenCalledOnce();
    expect(reportSubscriberFailure).toHaveBeenCalledWith({
      code: "surface.subscriber_failed",
      summary: "Managed Surface publication subscriber failed.",
      details: { applicationEpoch: 7 },
    });
  });
});
