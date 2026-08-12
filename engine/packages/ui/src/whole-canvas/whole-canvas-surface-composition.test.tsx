// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceCoordinatorRuntimeV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import type {
  WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
  WholeCanvasManagedSurfaceRootDesiredInternalV1,
} from "./whole-canvas-managed-surface-session.ts";
import {
  createWholeCanvasSurfaceCompositionDefinitionInternalV1,
  createWholeCanvasSurfaceCompositionRuntimeInternalV1,
  resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1,
  resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1,
} from "./whole-canvas-surface-composition.tsx";

const primaryActionIdInternalV1 = "test.whole-canvas.activate";

function targetInternalV1(targetId: string) {
  return Object.freeze({ targetId, parameters: Object.freeze({}) });
}

function desiredInternalV1(targetId: string): WholeCanvasManagedSurfaceRootDesiredInternalV1 {
  return Object.freeze({
    bootSplash: null,
    title: null,
    story: Object.freeze({
      sourceKind: "application" as const,
      target: targetInternalV1(targetId),
    }),
  });
}

function resolvedInternalV1(targetId: string) {
  return Object.freeze({
    accessibleNameTextId: `text.${targetId}`,
    view: Object.freeze({ targetId }),
    actions: Object.freeze([Object.freeze({
      actionId: primaryActionIdInternalV1,
      status: "enabled" as const,
      reasonTextIds: Object.freeze([]),
      intent: Object.freeze({ kind: "owner" as const, payload: Object.freeze({}) }),
    })]),
  });
}

function sourceInternalV1(initial: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const capturedListeners: (() => void)[] = [];
  return Object.freeze({
    getSnapshotInternalV1: () => snapshot,
    subscribeInternalV1(listener: () => void): () => void {
      listeners.add(listener);
      capturedListeners.push(listener);
      return Object.freeze(() => {
        listeners.delete(listener);
      });
    },
    publish(next: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null): void {
      snapshot = next;
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
    capturedListeners,
  });
}

function inputRouterInternalV1() {
  const registrations = new Set<Parameters<InputRouterV1["register"]>[0]>();
  const router: InputRouterV1 = Object.freeze({
    register(registration: Parameters<InputRouterV1["register"]>[0]): () => void {
      registrations.add(registration);
      return Object.freeze(() => registrations.delete(registration));
    },
    route(event: InputEventV1) {
      for (const registration of [...registrations].toReversed()) {
        const result = registration.handle(event);
        if (result.kind === "handled") {
          return Object.freeze({ kind: "handled" as const, context: registration.context });
        }
      }
      return inputIgnoredV1;
    },
    clearTransientInput(): void {},
  });
  return Object.freeze({ router, registrationCount: () => registrations.size });
}

function coordinatorRuntimeInternalV1(
  bundle: ManagedSurfaceCompositeKernelBundleInternalV1,
  activationKind: "initial" | "coordinator_successor" = "initial",
): ManagedSurfaceCoordinatorRuntimeV1 {
  return Object.freeze({
    applicationEpoch: bundle.applicationEpoch,
    activationKind,
    coordinator: bundle.coordinator,
    gestureLease: Object.freeze({
      begin: () => {
        throw new TypeError("unused");
      },
      isCurrent: () => false,
      revoke: () => undefined,
    }),
    bindCurrentInput: () => {
      throw new TypeError("unused");
    },
    isIngressOpen: () => true,
  }) as ManagedSurfaceCoordinatorRuntimeV1;
}

function activeHarnessInternalV1() {
  const source = sourceInternalV1(desiredInternalV1("test.whole-canvas.a"));
  const dispatchOwner = vi.fn(() => Promise.resolve());
  const catalog = Object.freeze([
    Object.freeze({
      targetId: "test.whole-canvas.a",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const]),
      actionIds: Object.freeze([primaryActionIdInternalV1]),
      defaultActionId: null,
    }),
    Object.freeze({
      targetId: "test.whole-canvas.b",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const]),
      actionIds: Object.freeze([primaryActionIdInternalV1]),
      defaultActionId: null,
    }),
  ]);
  const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
    catalog,
    getSnapshotInternalV1: source.getSnapshotInternalV1,
    subscribeInternalV1: source.subscribeInternalV1,
    resolveTargetInternalV1: (request: WholeCanvasManagedSurfaceResolveTargetRequestInternalV1) =>
      resolvedInternalV1(request.target.targetId),
    dispatchOwnerActionInternalV1: dispatchOwner,
    prepareTargetInternalV1: null,
    renderInternalV1: () => null,
  }));
  const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
  const recipe = Object.freeze({
    resolvedOwnerIds: family.resolvedOwnerIds,
    resolvedSlotDescriptors: family.resolvedSlotDescriptors,
  });
  const bundles = new Map<number, ManagedSurfaceCompositeKernelBundleInternalV1>();
  const createBundle = (applicationEpoch: number) => {
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(applicationEpoch),
      recipe,
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    bundles.set(applicationEpoch, bundle);
    return bundle;
  };
  const bundle = createBundle(41);
  const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
    definition,
    resolveKernelBundleInternalV1: (runtime) => bundles.get(runtime.applicationEpoch)!,
  });
  const attach = (nextBundle: ManagedSurfaceCompositeKernelBundleInternalV1) => {
    const gate = { open: false };
    const runtime = coordinatorRuntimeInternalV1(
      nextBundle,
      nextBundle === bundle ? "initial" : "coordinator_successor",
    );
    composition.prepareRuntimeAttachmentInternalV1(
      runtime,
      Object.freeze({ isOpen: () => gate.open }),
    );
    const notify = composition.activateRuntimeAttachmentInternalV1();
    return Object.freeze({
      runtime,
      open: () => {
        gate.open = true;
        notify();
      },
    });
  };
  const attachment = attach(bundle);
  return Object.freeze({
    source,
    dispatchOwner,
    family,
    bundle,
    composition,
    attachment,
    createBundle,
    attach,
  });
}

describe("S4b.1b WholeCanvas composition substrate", () => {
  it("captures one opaque definition and reuses its exact pre-kernel family", () => {
    const harness = activeHarnessInternalV1();
    const first = harness.family;
    const definitionFamily = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
      createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
        catalog: first.catalog,
        getSnapshotInternalV1: () => null,
        subscribeInternalV1: () => Object.freeze(() => undefined),
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        prepareTargetInternalV1: null,
        renderInternalV1: () => null,
      })),
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.stableDefinitionSidecars).not.toBe(definitionFamily.stableDefinitionSidecars);
    expect(harness.bundle.exactAggregateDefinitionSidecars[0]).toBe(
      first.stableDefinitionSidecars[0],
    );
    harness.composition.disposeInternalV1();
  });

  it("keeps the null fourth adapter in every lifecycle with zero bundle or Host allocation", () => {
    const resolveBundle = vi.fn();
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition: null,
      resolveKernelBundleInternalV1: resolveBundle,
    });
    const runtime = Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(9),
      activationKind: "initial" as const,
      coordinator: Object.freeze({}),
      gestureLease: Object.freeze({ begin: vi.fn(), isCurrent: () => false, revoke: vi.fn() }),
      bindCurrentInput: vi.fn(),
      isIngressOpen: () => true,
    }) as unknown as ManagedSurfaceCoordinatorRuntimeV1;
    const gate = { open: false };
    const observer = vi.fn();
    const unsubscribeObserver = composition.subscribeInternalV1(observer);
    composition.prepareRuntimeAttachmentInternalV1(
      runtime,
      Object.freeze({ isOpen: () => gate.open }),
    );
    const notify = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    notify();
    expect(resolveBundle).not.toHaveBeenCalled();
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
    composition.detachRuntimeInternalV1();
    composition.disposeInternalV1();
    expect(resolveBundle).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
    unsubscribeObserver();
  });

  it("installs one physical route only at ready commit and fences it on release", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const binding = harness.composition.getCurrentHostBindingInternalV1()!;
    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
    const input = inputRouterInternalV1();
    const portalContainer = document.createElement("div");
    const release = harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer,
      inputRouter: input.router,
    }));
    const pending = host.getSnapshotInternalV1().root.pending!;
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).not.toHaveBeenCalled();
    expect(host.settleReadinessInternalV1(pending, "ready")).toMatchObject({ kind: "applied" });
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    release();
    expect(input.registrationCount()).toBe(0);
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "ignored" });
    harness.composition.disposeInternalV1();
  });

  it("terminalizes the whole adapter when a second physical Host claims it", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const first = inputRouterInternalV1();
    const second = inputRouterInternalV1();
    harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer: document.createElement("div"),
      inputRouter: first.router,
    }));
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: document.createElement("div"),
        inputRouter: second.router,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
    expect(first.registrationCount()).toBe(0);
    expect(second.registrationCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
  });

  it("rejects a non-DIV portal before registration and terminalizes the exact lease", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const input = inputRouterInternalV1();
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: Object.freeze({}) as unknown as HTMLDivElement,
        inputRouter: input.router,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(input.registrationCount()).toBe(0);
    expect(harness.source.listenerCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("rolls back a hostile router registration that synchronously disposes the generation", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const cleanup = vi.fn();
    const hostileRouter: InputRouterV1 = Object.freeze({
      register: vi.fn(() => {
        harness.composition.disposeInternalV1();
        return Object.freeze(cleanup);
      }),
      route: () => inputIgnoredV1,
      clearTransientInput: () => undefined,
    });
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: document.createElement("div"),
        inputRouter: hostileRouter,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(harness.source.listenerCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("retires the predecessor listener, binding, route, and lease before a successor", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const oldBinding = harness.composition.getCurrentHostBindingInternalV1()!;
    const oldHost = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(oldBinding);
    const lateListener = harness.source.capturedListeners[0]!;
    expect(harness.source.listenerCount()).toBe(1);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(1);

    harness.composition.detachRuntimeInternalV1();
    expect(harness.source.listenerCount()).toBe(0);
    expect(oldHost.getSnapshotInternalV1().disposed).toBe(true);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    lateListener();

    harness.source.publish(desiredInternalV1("test.whole-canvas.b"));
    const successorBundle = harness.createBundle(42);
    const successor = harness.attach(successorBundle);
    successor.open();
    expect(harness.composition.getCurrentHostBindingInternalV1()).not.toBe(oldBinding);
    expect(harness.source.listenerCount()).toBe(1);
    expect(successorBundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(1);
    harness.composition.disposeInternalV1();
    expect(successorBundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
  });

  it("rejects synchronous subscription reentry and releases the prepared lease", () => {
    const cleanup = vi.fn();
    const catalog = Object.freeze([]);
    const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
      catalog,
      getSnapshotInternalV1: () => null,
      subscribeInternalV1: (listener: () => void) => {
        listener();
        return Object.freeze(cleanup);
      },
      resolveTargetInternalV1: () => null,
      dispatchOwnerActionInternalV1: null,
      prepareTargetInternalV1: null,
      renderInternalV1: () => null,
    }));
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(51),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition,
      resolveKernelBundleInternalV1: () => bundle,
    });
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => false }),
    );
    expect(() => composition.activateRuntimeAttachmentInternalV1()).toThrowError(
      "ui.whole_canvas_surface_subscription_invalid",
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("does not notify composition observers for an equal stable source publication", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const observer = vi.fn();
    const unsubscribe = harness.composition.subscribeInternalV1(observer);
    harness.source.publish(desiredInternalV1("test.whole-canvas.a"));
    expect(observer).not.toHaveBeenCalled();
    unsubscribe();
    harness.composition.disposeInternalV1();
  });

  it("terminalizes boundedly when source snapshot synchronously reenters reconciliation", () => {
    const capturedListener: { current: (() => void) | null } = { current: null };
    let reenter = false;
    const cleanup = vi.fn();
    const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
      catalog: Object.freeze([]),
      getSnapshotInternalV1: () => {
        if (reenter) capturedListener.current?.();
        return null;
      },
      subscribeInternalV1: (listener: () => void) => {
        capturedListener.current = listener;
        return Object.freeze(cleanup);
      },
      resolveTargetInternalV1: () => null,
      dispatchOwnerActionInternalV1: null,
      prepareTargetInternalV1: null,
      renderInternalV1: () => null,
    }));
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(52),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const reportFailure = vi.fn();
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition,
      resolveKernelBundleInternalV1: () => bundle,
      reportFailure,
    });
    const gate = { open: false };
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => gate.open }),
    );
    const publish = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    publish();
    reenter = true;
    capturedListener.current?.();
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
  });
});
