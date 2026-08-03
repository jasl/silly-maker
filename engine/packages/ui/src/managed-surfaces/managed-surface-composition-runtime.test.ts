// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  parseManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
} from "./managed-surface-composition-runtime.ts";

const overlayOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.fixture-overlay");
const systemOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.fixture-system");
const overlaySlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.fixture-overlay");
const systemSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.fixture-system");

function definitionV1(input: {
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly id: string;
  readonly layerOrder: number;
}): ManagedSurfaceResolvedDefinitionV1 {
  return Object.freeze({
    definitionId: parseManagedSurfaceDefinitionIdV1(input.id),
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId,
    slotId: input.slotId,
    layerId: parseManagedSurfaceLayerIdV1(`surface-layer.${input.id}`),
    layerOrder: parseNonNegativeSafeInteger(input.layerOrder),
    placement: "root",
    modality: "blocking",
    inputPolicy: Object.freeze({ kind: "managed" as const, inputContextId: "system" as const }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({
      kind: "owns_focus" as const,
      initialTargetId: parseManagedSurfaceFocusTargetIdV1(`surface-focus.${input.id}`),
      trap: true,
      restore: "opener" as const,
    }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([parseManagedSurfaceActionIdV1("surface-action.cancel")]),
    readiness: Object.freeze({
      initialOpen: "blocking_fallback" as const,
      primaryReplacement: "retain_current" as const,
      childOpen: "blocking_fallback" as const,
    }),
  });
}

function fixtureV1(): {
  readonly runtime: ManagedSurfaceCompositionRuntimeInternalV1;
  readonly activeRegistrations: () => number;
  readonly maximumActiveRegistrations: () => number;
} {
  let cursor = 0;
  let active = 0;
  let maximumActive = 0;
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: Object.freeze({
      allocate: () => parseNonNegativeSafeInteger([11, 17][cursor++]!),
    }),
    inputRouter: createInputRouterV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: Object.freeze([overlayOwnerIdV1, systemOwnerIdV1]),
      resolvedSlotDescriptors: Object.freeze([
        Object.freeze({
          kind: "root" as const,
          slotId: overlaySlotIdV1,
          cardinality: "single" as const,
        }),
        Object.freeze({
          kind: "root" as const,
          slotId: systemSlotIdV1,
          cardinality: "single" as const,
        }),
      ]),
    }),
    registerManagedInputHandler: () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        active -= 1;
      };
    },
  });
  return Object.freeze({
    runtime,
    activeRegistrations: () => active,
    maximumActiveRegistrations: () => maximumActive,
  });
}

describe("composition-owned Managed Surface runtime", () => {
  it("owns one Coordinator, epoch, identity cursor, and managed input binding", () => {
    const fixture = fixtureV1();
    const current = fixture.runtime.getCurrent();
    const first = current.coordinator.openTransientPrimary({
      definition: definitionV1({
        ownerId: overlayOwnerIdV1,
        slotId: overlaySlotIdV1,
        id: "surface.fixture.overlay",
        layerOrder: 50,
      }),
      semanticOccurrenceId: null,
    });
    expect(first.receipt.surfaceInstanceId).toBe("surface-instance.e11.n1");
    first.readiness!.ready();
    expect(fixture.activeRegistrations()).toBe(1);

    const second = current.coordinator.openTransientPrimary({
      definition: definitionV1({
        ownerId: systemOwnerIdV1,
        slotId: systemSlotIdV1,
        id: "surface.fixture.system",
        layerOrder: 60,
      }),
      semanticOccurrenceId: null,
    });
    expect(second.receipt.surfaceInstanceId).toBe("surface-instance.e11.n2");
    second.readiness!.ready();

    expect(fixture.runtime.getCurrent()).toBe(current);
    expect(fixture.maximumActiveRegistrations()).toBe(1);
    expect(fixture.activeRegistrations()).toBe(1);
    fixture.runtime.dispose();
    expect(fixture.activeRegistrations()).toBe(0);
  });

  it("rotates both families behind one successor allocation and stale readiness fence", () => {
    const fixture = fixtureV1();
    const predecessor = fixture.runtime.getCurrent();
    const pending = predecessor.coordinator.openTransientPrimary({
      definition: definitionV1({
        ownerId: systemOwnerIdV1,
        slotId: systemSlotIdV1,
        id: "surface.fixture.system",
        layerOrder: 60,
      }),
      semanticOccurrenceId: null,
    });

    const successor = fixture.runtime.replace("coordinator_successor");

    expect(successor.applicationEpoch).toBe(17);
    expect(fixture.runtime.getCurrent()).toBe(successor);
    expect(pending.readiness!.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
    expect(successor.coordinator.getSnapshot()).toMatchObject({
      applicationEpoch: 17,
      publicationRevision: 0,
      topologyRevision: 0,
      orderedInstances: [],
    });
    fixture.runtime.dispose();
  });

  it("seals the composition authority when successor allocation fails", () => {
    const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
      epochAllocator: Object.freeze({
        allocate: () => parseNonNegativeSafeInteger(11),
      }),
      inputRouter: createInputRouterV1(),
      recipe: Object.freeze({
        resolvedOwnerIds: Object.freeze([overlayOwnerIdV1]),
        resolvedSlotDescriptors: Object.freeze([
          Object.freeze({
            kind: "root" as const,
            slotId: overlaySlotIdV1,
            cardinality: "single" as const,
          }),
        ]),
      }),
    });
    const predecessor = runtime.getCurrent();
    const pending = predecessor.coordinator.openTransientPrimary({
      definition: definitionV1({
        ownerId: overlayOwnerIdV1,
        slotId: overlaySlotIdV1,
        id: "surface.fixture.overlay",
        layerOrder: 50,
      }),
      semanticOccurrenceId: null,
    });

    expect(() => runtime.replace("coordinator_successor")).toThrowError(
      "ui.managed_surface_application_epoch_not_monotonic",
    );
    expect(() => runtime.getCurrent()).toThrowError(
      "ui.managed_surface_composition_runtime_disposed",
    );
    expect(pending.readiness!.ready().receipt).toMatchObject({
      kind: "stale",
      code: "surface.stale_readiness",
    });
    expect(() => runtime.dispose()).not.toThrow();
  });
});
