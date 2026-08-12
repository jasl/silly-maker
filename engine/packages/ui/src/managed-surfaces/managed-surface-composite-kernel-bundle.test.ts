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
import {
  matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "./managed-surface-stable-admission.ts";
import { matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1 } from "./managed-surface-stable-composite-state.ts";

function aggregateFixtureV1() {
  const narrative = createNarrativeManagedSurfaceFamilyContractInternalV1();
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
  it("builds one exact shared authority graph for Narrative and WholeCanvas", () => {
    const fixture = aggregateFixtureV1();
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe: fixture.recipe,
      definitionSidecars: fixture.definitionSidecars,
    }));

    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Reflect.ownKeys(bundle)).toEqual([
      "applicationEpoch",
      "coordinator",
      "publisherLeaseRegistry",
      "admissionAuthority",
      "compositeRuntimeKernel",
      "exactAggregateDefinitionSidecars",
      "exactAggregateSlotDescriptors",
    ]);
    expect(bundle.applicationEpoch).toBe(7);
    expect(bundle.exactAggregateDefinitionSidecars).toEqual(fixture.definitionSidecars);
    expect(bundle.exactAggregateDefinitionSidecars).not.toBe(fixture.definitionSidecars);
    expect(
      bundle.exactAggregateDefinitionSidecars.every((sidecar, index) =>
        sidecar === fixture.definitionSidecars[index]
      ),
    ).toBe(true);
    expect(bundle.exactAggregateSlotDescriptors).toEqual(
      fixture.recipe.resolvedSlotDescriptors,
    );
    expect(Object.isFrozen(bundle.exactAggregateDefinitionSidecars)).toBe(true);
    expect(Object.isFrozen(bundle.exactAggregateSlotDescriptors)).toBe(true);
    expect(bundle.coordinator.getSnapshot()).toBe(
      bundle.compositeRuntimeKernel.getTransientSnapshotInternalV1(),
    );
    expect(
      matchesManagedSurfaceStableCompositeRuntimeKernelConfigurationInternalV1(
        bundle.compositeRuntimeKernel,
        bundle.admissionAuthority,
        bundle.publisherLeaseRegistry,
      ),
    ).toBe(true);
    for (const family of [fixture.narrative, fixture.wholeCanvas]) {
      expect(
        matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1(
          bundle.admissionAuthority,
          bundle.publisherLeaseRegistry,
          bundle.exactAggregateDefinitionSidecars,
          bundle.exactAggregateSlotDescriptors,
          family.stableDefinitionSidecars,
          family.resolvedSlotDescriptors,
        ),
      ).toBe(true);
    }
    const lookalikeWholeCanvas = createWholeCanvasManagedSurfaceFamilyContractInternalV1(
      Object.freeze([]),
    );
    expect(
      matchesManagedSurfaceStableAdmissionAuthorityFamilyConfigurationInternalV1(
        bundle.admissionAuthority,
        bundle.publisherLeaseRegistry,
        bundle.exactAggregateDefinitionSidecars,
        bundle.exactAggregateSlotDescriptors,
        lookalikeWholeCanvas.stableDefinitionSidecars,
        lookalikeWholeCanvas.resolvedSlotDescriptors,
      ),
    ).toBe(false);
  });

  it("captures the exact frozen three-key input without invoking accessors", () => {
    const fixture = aggregateFixtureV1();
    const getter = vi.fn(() => fixture.recipe);
    const accessor = Object.freeze(Object.defineProperties({}, {
      applicationEpoch: {
        enumerable: true,
        value: parseNonNegativeSafeInteger(7),
      },
      recipe: {
        enumerable: true,
        get: getter,
      },
      definitionSidecars: {
        enumerable: true,
        value: fixture.definitionSidecars,
      },
    }));

    expect(() => createManagedSurfaceCompositeKernelBundleInternalV1(accessor as never))
      .toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
    expect(getter).not.toHaveBeenCalled();

    const recipeGetter = vi.fn(() => fixture.recipe.resolvedOwnerIds);
    const recipeAccessor = Object.freeze(Object.defineProperties({}, {
      resolvedOwnerIds: {
        enumerable: true,
        get: recipeGetter,
      },
      resolvedSlotDescriptors: {
        enumerable: true,
        value: fixture.recipe.resolvedSlotDescriptors,
      },
    }));
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: recipeAccessor as ManagedSurfaceCoordinatorRecipeV1,
        definitionSidecars: fixture.definitionSidecars,
      }))
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
    expect(recipeGetter).not.toHaveBeenCalled();

    const sidecarGetter = vi.fn(() => fixture.definitionSidecars[0]);
    const sidecarAccessor = [fixture.definitionSidecars[0]!];
    Object.defineProperty(sidecarAccessor, "0", {
      configurable: true,
      enumerable: true,
      get: sidecarGetter,
    });
    Object.freeze(sidecarAccessor);
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: fixture.recipe,
        definitionSidecars: sidecarAccessor,
      }) as never)
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
    expect(sidecarGetter).not.toHaveBeenCalled();

    const valid = Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(7),
      recipe: fixture.recipe,
      definitionSidecars: fixture.definitionSidecars,
    });
    const malformed = [
      { ...valid },
      Object.freeze({ ...valid, extra: true }),
      Object.freeze({ applicationEpoch: valid.applicationEpoch, recipe: valid.recipe }),
      Object.freeze(Object.assign(Object.create({ inherited: true }), valid)),
    ];
    for (const input of malformed) {
      expect(() => createManagedSurfaceCompositeKernelBundleInternalV1(input as never))
        .toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
    }
  });

  it("rejects malformed or duplicate aggregate vectors before inspecting a sidecar", () => {
    const fixture = aggregateFixtureV1();
    const sidecarTrap = vi.fn();
    const opaqueSidecar = new Proxy(Object.freeze({}), {
      get() {
        sidecarTrap();
        throw new Error("sidecar read after aggregate rejection");
      },
      getOwnPropertyDescriptor() {
        sidecarTrap();
        throw new Error("sidecar descriptor read after aggregate rejection");
      },
      ownKeys() {
        sidecarTrap();
        throw new Error("sidecar keys read after aggregate rejection");
      },
    }) as ManagedSurfaceStableDefinitionSidecarInternalV1;
    const duplicateSidecars = Object.freeze([opaqueSidecar, opaqueSidecar]);

    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: fixture.recipe,
        definitionSidecars: duplicateSidecars,
      }))
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");
    expect(sidecarTrap).not.toHaveBeenCalled();

    const duplicateSlotRecipe = Object.freeze({
      ...fixture.recipe,
      resolvedSlotDescriptors: Object.freeze([
        ...fixture.recipe.resolvedSlotDescriptors,
        fixture.recipe.resolvedSlotDescriptors[0]!,
      ]),
    });
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: duplicateSlotRecipe,
        definitionSidecars: fixture.definitionSidecars,
      }))
    ).toThrowError("ui.managed_surface_composite_kernel_bundle_invalid");

    const sparseSidecars = Array<ManagedSurfaceStableDefinitionSidecarInternalV1>(2);
    sparseSidecars[0] = fixture.definitionSidecars[0]!;
    Object.freeze(sparseSidecars);
    expect(() =>
      createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
        applicationEpoch: parseNonNegativeSafeInteger(7),
        recipe: fixture.recipe,
        definitionSidecars: sparseSidecars,
      }))
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
