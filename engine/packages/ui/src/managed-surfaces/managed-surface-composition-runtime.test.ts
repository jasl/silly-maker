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
import type { ManagedSurfaceCoordinatorRuntimeV1 } from "./managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceFamilyActivationGateInternalV1,
  type ManagedSurfaceFamilyRuntimeAdapterInternalV1,
} from "./managed-surface-composition-runtime.ts";
import { createManagedSurfaceCoordinatorV1 } from "./managed-surface-coordinator.ts";

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
  readonly registrationCount: () => number;
  readonly unregistrationCount: () => number;
} {
  let cursor = 0;
  let active = 0;
  let maximumActive = 0;
  let registrations = 0;
  let unregistrations = 0;
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
      registrations += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        unregistrations += 1;
        active -= 1;
      };
    },
  });
  return Object.freeze({
    runtime,
    activeRegistrations: () => active,
    maximumActiveRegistrations: () => maximumActive,
    registrationCount: () => registrations,
    unregistrationCount: () => unregistrations,
  });
}

function familyAdapterV1(): ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  let detached = false;
  let prepared = false;
  return Object.freeze({
    detachRuntimeInternalV1(): void {
      detached = true;
      prepared = false;
    },
    prepareRuntimeAttachmentInternalV1(): void {
      if (!detached || prepared) throw new TypeError("fixture.invalid_prepare");
      prepared = true;
    },
    activateRuntimeAttachmentInternalV1(): () => void {
      if (!detached || !prepared) throw new TypeError("fixture.invalid_activate");
      detached = false;
      prepared = false;
      return () => undefined;
    },
    abortRuntimeAttachmentInternalV1(): void {
      detached = true;
      prepared = false;
    },
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

  it("retains one input binding and gesture through replacement preparation and failure", () => {
    const fixture = fixtureV1();
    const runtime = fixture.runtime.getCurrent();
    const active = runtime.coordinator.openTransientPrimary({
      definition: definitionV1({
        ownerId: overlayOwnerIdV1,
        slotId: overlaySlotIdV1,
        id: "surface.fixture.overlay-a",
        layerOrder: 50,
      }),
      semanticOccurrenceId: null,
    });
    active.readiness!.ready();
    const activeInstanceId = active.receipt.surfaceInstanceId!;
    const retainedBinding = runtime.bindCurrentInput();
    const retainedGesture = runtime.gestureLease.begin();
    const retainedEnvelope = retainedBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
      gestureId: retainedGesture,
    });

    const firstReplacement = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1({
        ownerId: overlayOwnerIdV1,
        slotId: overlaySlotIdV1,
        id: "surface.fixture.overlay-b",
        layerOrder: 50,
      }),
      semanticOccurrenceId: null,
      expected: runtime.coordinator.getHandle(activeInstanceId)!,
    });
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(
      runtime.bindCurrentInput().createEnvelope({
        actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
        gestureId: retainedGesture,
      }).inputPublicationRevision,
    ).toBe(retainedEnvelope.inputPublicationRevision);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
    expect({
      registered: fixture.registrationCount(),
      unregistered: fixture.unregistrationCount(),
      active: fixture.activeRegistrations(),
      maximumActive: fixture.maximumActiveRegistrations(),
    }).toEqual({ registered: 1, unregistered: 0, active: 1, maximumActive: 1 });

    firstReplacement.readiness!.fail();
    expect(runtime.bindCurrentInput()).toBe(retainedBinding);
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
    expect({
      registered: fixture.registrationCount(),
      unregistered: fixture.unregistrationCount(),
      active: fixture.activeRegistrations(),
      maximumActive: fixture.maximumActiveRegistrations(),
    }).toEqual({ registered: 1, unregistered: 0, active: 1, maximumActive: 1 });

    const secondReplacement = runtime.coordinator.replaceTransientPrimary({
      definition: definitionV1({
        ownerId: overlayOwnerIdV1,
        slotId: overlaySlotIdV1,
        id: "surface.fixture.overlay-b",
        layerOrder: 50,
      }),
      semanticOccurrenceId: null,
      expected: runtime.coordinator.getHandle(activeInstanceId)!,
    });
    secondReplacement.readiness!.ready();
    const activeBinding = runtime.bindCurrentInput();
    const activeGesture = runtime.gestureLease.begin();
    const activeEnvelope = activeBinding.createEnvelope({
      actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
      gestureId: activeGesture,
    });
    expect(activeBinding).not.toBe(retainedBinding);
    expect(activeEnvelope.inputPublicationRevision).toBe(
      retainedEnvelope.inputPublicationRevision + 2,
    );
    expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(false);
    expect({
      registered: fixture.registrationCount(),
      unregistered: fixture.unregistrationCount(),
      active: fixture.activeRegistrations(),
      maximumActive: fixture.maximumActiveRegistrations(),
    }).toEqual({ registered: 2, unregistered: 1, active: 1, maximumActive: 1 });

    fixture.runtime.dispose();
    expect(fixture.unregistrationCount()).toBe(2);
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

    const successor = fixture.runtime.replace("coordinator_successor", [familyAdapterV1()]);

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

  it("rejects direct nested replacement until every activation notification drains", () => {
    const fixture = fixtureV1();
    let nestedFailure: unknown;
    const adapter: ManagedSurfaceFamilyRuntimeAdapterInternalV1 = Object.freeze({
      detachRuntimeInternalV1: () => undefined,
      prepareRuntimeAttachmentInternalV1: () => undefined,
      activateRuntimeAttachmentInternalV1: () => () => {
        try {
          fixture.runtime.replace("coordinator_successor", [familyAdapterV1()]);
        } catch (error) {
          nestedFailure = error;
        }
      },
      abortRuntimeAttachmentInternalV1: () => undefined,
    });

    const successor = fixture.runtime.replace("coordinator_successor", [adapter]);

    expect(nestedFailure).toMatchObject({
      name: "TypeError",
      message: "ui.managed_surface_composition_transition_in_progress",
    });
    expect(fixture.runtime.getCurrent()).toBe(successor);
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

    expect(() => runtime.replace("coordinator_successor", [familyAdapterV1()])).toThrowError(
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

  it.each(["prepare", "activate"] as const)(
    "seals an unannounced successor when the second family %s phase fails",
    (failurePhase) => {
      const epochs = [11, 17] as const;
      let epochCursor = 0;
      const coordinators: ReturnType<typeof createManagedSurfaceCoordinatorV1>[] = [];
      const rawNotifications: number[] = [];
      const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
        epochAllocator: Object.freeze({
          allocate: () => parseNonNegativeSafeInteger(epochs[epochCursor++]!),
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
        createCoordinator(input) {
          const coordinator = createManagedSurfaceCoordinatorV1(input);
          const index = coordinators.length;
          coordinators.push(coordinator);
          rawNotifications[index] = 0;
          coordinator.subscribe(() => {
            rawNotifications[index] = (rawNotifications[index] ?? 0) + 1;
          });
          return coordinator;
        },
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
      const failure = new Error(`fixture.${failurePhase}_failed`);
      let successorRuntime: ManagedSurfaceCoordinatorRuntimeV1 | null = null;
      let successorBeforeFailure: unknown;
      let firstNotifications = 0;
      let secondNotifications = 0;
      let firstIngress = true;
      let secondIngress = true;
      let firstReentrantMutations = 0;
      let firstActivationGate: ManagedSurfaceFamilyActivationGateInternalV1 | null = null;

      const participant = (
        index: 0 | 1,
      ): ManagedSurfaceFamilyRuntimeAdapterInternalV1 => {
        let detached = false;
        let prepared = false;
        return Object.freeze({
          detachRuntimeInternalV1(): void {
            detached = true;
            prepared = false;
            if (index === 0) firstIngress = false;
            else secondIngress = false;
          },
          prepareRuntimeAttachmentInternalV1(
            nextRuntime: ManagedSurfaceCoordinatorRuntimeV1,
            nextActivationGate: ManagedSurfaceFamilyActivationGateInternalV1,
          ): void {
            successorRuntime = nextRuntime;
            if (index === 0) {
              successorBeforeFailure = nextRuntime.coordinator.getSnapshot();
              firstActivationGate = nextActivationGate;
            }
            prepared = true;
            if (index === 1 && failurePhase === "prepare") throw failure;
          },
          activateRuntimeAttachmentInternalV1(): () => void {
            if (!detached || !prepared) throw new TypeError("fixture.invalid_activation_state");
            if (index === 1 && failurePhase === "activate") {
              if (firstIngress && firstActivationGate?.isOpen() === true) {
                firstReentrantMutations += 1;
              }
              throw failure;
            }
            detached = false;
            prepared = false;
            if (index === 0) firstIngress = true;
            else secondIngress = true;
            return (): void => {
              if (index === 0) firstNotifications += 1;
              else secondNotifications += 1;
            };
          },
          abortRuntimeAttachmentInternalV1(): void {
            detached = true;
            prepared = false;
            if (index === 0) firstIngress = false;
            else secondIngress = false;
          },
        });
      };

      let thrown: unknown;
      try {
        runtime.replace("coordinator_successor", [participant(0), participant(1)]);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(failure);
      expect({ firstNotifications, secondNotifications, firstIngress, secondIngress }).toEqual({
        firstNotifications: 0,
        secondNotifications: 0,
        firstIngress: false,
        secondIngress: false,
      });
      expect(firstReentrantMutations).toBe(0);
      expect(() => runtime.getCurrent()).toThrowError(
        "ui.managed_surface_composition_runtime_disposed",
      );
      expect(
        (successorRuntime as ManagedSurfaceCoordinatorRuntimeV1 | null)?.isIngressOpen(),
      ).toBe(false);
      expect(coordinators).toHaveLength(2);
      expect(rawNotifications).toEqual([2, 1]);
      expect(successorBeforeFailure).toMatchObject({
        applicationEpoch: 17,
        publicationRevision: 0,
        topologyRevision: 0,
        orderedInstances: [],
        coordinatorDisposed: false,
      });
      expect(coordinators[1]!.getSnapshot()).toMatchObject({
        applicationEpoch: 17,
        publicationRevision: 1,
        topologyRevision: 1,
        orderedInstances: [],
        coordinatorDisposed: true,
      });
      expect(coordinators[1]!.getSnapshot()).not.toBe(successorBeforeFailure);
      const predecessorTerminal = coordinators[0]!.getSnapshot();
      const successorTerminal = coordinators[1]!.getSnapshot();
      expect(pending.readiness!.ready().receipt).toMatchObject({
        kind: "stale",
        code: "surface.stale_readiness",
      });
      expect(pending.readiness!.fail()).toMatchObject({
        kind: "stale",
        code: "surface.stale_readiness",
      });
      expect(coordinators[0]!.getSnapshot()).toBe(predecessorTerminal);
      expect(coordinators[1]!.getSnapshot()).toBe(successorTerminal);
      expect(epochCursor).toBe(2);
      expect(() => runtime.dispose()).not.toThrow();
    },
  );
});
