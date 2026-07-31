// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceGestureIdV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceGestureIdV1,
  parseManagedSurfaceInstanceIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceRoutingLeaseIdV1,
  parseManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceActionBindingV1,
  type ManagedSurfaceActionBindingV1,
} from "./managed-surface-action-route.ts";
import {
  createManagedSurfaceCoordinatorV1,
  type ManagedSurfaceHandleV1,
} from "./managed-surface-coordinator.ts";

const activateActionIdV1 = parseManagedSurfaceActionIdV1("surface-action.activate");
const otherActionIdV1 = parseManagedSurfaceActionIdV1("surface-action.other");

function definitionV1(
  suffix: string,
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return {
    definitionId: parseManagedSurfaceDefinitionIdV1(`surface-definition.${suffix}`),
    ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    slotCardinality: "single",
    allowedParentSlotIds: [],
    modality: "non_blocking",
    inputContextId: "overlay",
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    },
    actionIds: [activateActionIdV1],
    ...overrides,
  };
}

function gestureV1(suffix: string) {
  return parseManagedSurfaceGestureIdV1(`gesture.test.${suffix}`);
}

interface FixtureOptionsV1 {
  readonly inputRouter?: InputRouterV1;
  readonly beforeGestureCheck?: (gestureId: ManagedSurfaceGestureIdV1) => void;
}

function createCountingInputRouterV1() {
  const delegate = createInputRouterV1();
  let activeRegistrationCount = 0;
  const router: InputRouterV1 = Object.freeze({
    register(registration: Parameters<InputRouterV1["register"]>[0]) {
      const unregisterDelegate = delegate.register(registration);
      activeRegistrationCount += 1;
      let active = true;
      return (): void => {
        if (!active) return;
        active = false;
        activeRegistrationCount -= 1;
        unregisterDelegate();
      };
    },
    route: (event: Parameters<InputRouterV1["route"]>[0]) => delegate.route(event),
    clearTransientInput: () => delegate.clearTransientInput(),
  });
  return Object.freeze({
    router,
    getActiveRegistrationCount: () => activeRegistrationCount,
  });
}

function createFixtureV1(options: FixtureOptionsV1 = {}) {
  const coordinator = createManagedSurfaceCoordinatorV1({
    applicationEpoch: parseNonNegativeSafeInteger(4),
    resolvedOwnerIds: [
      parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
      parseManagedSurfaceOwnerIdV1("surface-owner.debug"),
    ],
  });
  const opened = coordinator.openTransientPrimary({
    definition: definitionV1("inventory"),
    semanticOccurrenceId: "semantic.inventory",
  });
  const router = options.inputRouter ?? createInputRouterV1();
  const handledEvents: InputEventV1[] = [];
  const lower = vi.fn((event: InputEventV1): InputHandlerResultV1 => {
    handledEvents.push(event);
    return inputHandledV1;
  });
  router.register({ context: "overlay", handle: lower });
  const staleGestures = new Set<string>();
  const binding = createManagedSurfaceActionBindingV1({
    coordinator,
    inputRouter: router,
    isGestureCurrent: (gestureId) => {
      options.beforeGestureCheck?.(gestureId);
      return !staleGestures.has(gestureId);
    },
  });
  return {
    binding,
    coordinator,
    handledEvents,
    lower,
    opened: opened.handle!,
    router,
    staleGestures,
  };
}

describe("Managed Surface action route", () => {
  it("builds the exact frozen six-field canonical envelope and preserves public shapes", () => {
    const fixture = createFixtureV1();
    const envelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("exact"),
    });

    expect(Reflect.ownKeys(envelope)).toEqual([
      "applicationEpoch",
      "surfaceInstanceId",
      "surfaceTopologyRevision",
      "actionId",
      "gestureId",
      "inputPublicationRevision",
    ]);
    expect(envelope).toEqual({
      applicationEpoch: 4,
      surfaceInstanceId: "surface-instance.e4.n1",
      surfaceTopologyRevision: 1,
      actionId: "surface-action.activate",
      gestureId: "gesture.test.exact",
      inputPublicationRevision: 1,
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Reflect.ownKeys(fixture.router)).toEqual(["register", "route", "clearTransientInput"]);

    expect(() =>
      fixture.binding.route({
        ...envelope,
        routingLeaseId: "surface-lease.forged",
        targetOccurrenceId: "surface-occurrence.forged",
        semanticOccurrenceId: "semantic.forged",
      } as never)
    ).toThrowError("ui.invalid_managed_surface_action_envelope");
    const { gestureId: _gestureId, ...missingGesture } = envelope;
    expect(() => fixture.binding.route(missingGesture as never)).toThrowError(
      "ui.invalid_managed_surface_action_envelope",
    );
    expect(() => fixture.binding.route(Object.create(envelope) as never)).toThrowError(
      "ui.invalid_managed_surface_action_envelope",
    );
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("routes a current declared action through the public router without changing topology", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);
    const envelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("current"),
    });

    const result = fixture.binding.route(envelope);

    expect(result).toEqual({
      input: {
        kind: "consumed",
        code: "input.managed_surface_consumed",
        gestureId: "gesture.test.current",
        inputPublicationRevision: 1,
      },
      surface: {
        kind: "unchanged",
        code: "surface.action_routed",
        beforeTopologyRevision: 1,
        afterTopologyRevision: 1,
        surfaceInstanceId: "surface-instance.e4.n1",
      },
    });
    expect(fixture.lower).toHaveBeenCalledOnce();
    expect(fixture.handledEvents).toHaveLength(1);
    expect(fixture.handledEvents[0]).toEqual({
      kind: "action",
      actionId: "surface-action.activate",
    });
    expect(Reflect.ownKeys(fixture.handledEvents[0]!)).toEqual(["kind", "actionId"]);
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.input)).toBe(true);
    expect(Object.isFrozen(result.surface)).toBe(true);

    fixture.lower.mockImplementation(() => inputIgnoredV1);
    const unhandled = fixture.binding.route(
      fixture.binding.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("current-unhandled"),
      }),
    );
    expect(unhandled).toMatchObject({
      input: { kind: "unhandled", code: "input.managed_surface_unhandled" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(fixture.lower).toHaveBeenCalledTimes(2);
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects binding-origin unpublished actions without ordinary fallthrough", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);
    const envelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("undeclared"),
    });

    expect(fixture.binding.route(envelope)).toEqual({
      input: {
        kind: "consumed",
        code: "input.managed_surface_consumed",
        gestureId: "gesture.test.undeclared",
        inputPublicationRevision: 1,
      },
      surface: {
        kind: "rejected",
        code: "surface.action_unpublished",
        beforeTopologyRevision: 1,
        afterTopologyRevision: 1,
        surfaceInstanceId: "surface-instance.e4.n1",
      },
    });
    expect(fixture.lower).not.toHaveBeenCalled();

    fixture.lower.mockImplementation(() => inputIgnoredV1);
    const ignored = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("undeclared-ignored"),
    });
    expect(fixture.binding.route(ignored)).toEqual({
      input: {
        kind: "consumed",
        code: "input.managed_surface_consumed",
        gestureId: "gesture.test.undeclared-ignored",
        inputPublicationRevision: 1,
      },
      surface: {
        kind: "rejected",
        code: "surface.action_unpublished",
        beforeTopologyRevision: 1,
        afterTopologyRevision: 1,
        surfaceInstanceId: "surface-instance.e4.n1",
      },
    });
    expect(fixture.lower).not.toHaveBeenCalled();
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("fails closed after rebind, gesture expiry, and binding dispose", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("undeclared-old-publication"),
    });
    const successor = createManagedSurfaceActionBindingV1({
      coordinator: fixture.coordinator,
      inputRouter: fixture.router,
      isGestureCurrent: (gestureId) => !fixture.staleGestures.has(gestureId),
    });

    expect(fixture.binding.route(oldEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(fixture.lower).not.toHaveBeenCalled();

    const expiredGesture = successor.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("undeclared-expired-gesture"),
    });
    fixture.staleGestures.add(expiredGesture.gestureId);
    expect(successor.route(expiredGesture)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_gesture" },
      surface: null,
    });
    expect(fixture.lower).not.toHaveBeenCalled();

    successor.dispose();
    expect(successor.route(expiredGesture)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(fixture.lower).not.toHaveBeenCalled();
    expect(fixture.coordinator.getSnapshot()).toBe(before);
  });

  it.each(
    [
      {
        label: "owner dispose",
        dispose: (fixture: ReturnType<typeof createFixtureV1>) =>
          fixture.coordinator.disposeOwner(parseManagedSurfaceOwnerIdV1("surface-owner.workspace")),
        surface: {
          kind: "stale",
          code: "surface.stale_topology_revision",
          beforeTopologyRevision: 2,
          afterTopologyRevision: 2,
          surfaceInstanceId: "surface-instance.e4.n1",
        },
      },
      {
        label: "Coordinator dispose",
        dispose: (fixture: ReturnType<typeof createFixtureV1>) => fixture.coordinator.dispose(),
        surface: {
          kind: "rejected",
          code: "surface.coordinator_disposed",
          beforeTopologyRevision: 2,
          afterTopologyRevision: 2,
        },
      },
    ] as const,
  )("fails closed after $label", ({ dispose, surface }) => {
    const fixture = createFixtureV1();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);
    const queuedEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("queued-before-dispose"),
    });
    expect(dispose(fixture)).toMatchObject({ kind: "applied" });
    const afterDispose = fixture.coordinator.getSnapshot();
    listener.mockClear();
    const retainedBindingEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("created-after-dispose"),
    });

    for (const envelope of [queuedEnvelope, retainedBindingEnvelope]) {
      const result = fixture.binding.route(envelope);
      expect(result.input).toMatchObject({
        kind: "consumed",
        code: "input.managed_surface_consumed",
      });
      expect(result.surface).toEqual(surface);
    }
    expect(fixture.lower).not.toHaveBeenCalled();
    expect(fixture.coordinator.getSnapshot()).toBe(afterDispose);
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "application epoch",
      change: { applicationEpoch: parseNonNegativeSafeInteger(99) },
      code: "surface.stale_application_epoch",
    },
    {
      label: "topology revision",
      change: { surfaceTopologyRevision: parseNonNegativeSafeInteger(99) },
      code: "surface.stale_topology_revision",
    },
    {
      label: "surface instance",
      change: {
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.retired"),
      },
      code: "surface.stale_instance",
    },
  ])("consumes stale $label evidence without reaching a lower handler", ({ change, code }) => {
    const fixture = createFixtureV1();
    const envelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1(`stale-${code}`),
    });

    const result = fixture.binding.route({ ...envelope, ...change });

    expect(result.input.kind).toBe("consumed");
    expect(result.surface).toMatchObject({ kind: "stale", code });
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("keeps the managed gate ahead of handlers registered later in the same context", () => {
    const fixture = createFixtureV1();
    const lateHandler = vi.fn(() => inputHandledV1);
    fixture.router.register({ context: "overlay", handle: lateHandler });
    const envelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("late-handler"),
    });

    const stale = fixture.binding.route({
      ...envelope,
      surfaceTopologyRevision: parseNonNegativeSafeInteger(99),
    });

    expect(stale).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "stale", code: "surface.stale_topology_revision" },
    });
    expect(lateHandler).not.toHaveBeenCalled();
    expect(fixture.lower).not.toHaveBeenCalled();

    const current = fixture.binding.route(envelope);
    expect(current).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(lateHandler).toHaveBeenCalledOnce();
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("validates current input ownership, captured lease, and the current action catalog", () => {
    const fixture = createFixtureV1();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);
    const before = fixture.coordinator.getSnapshot();

    expect(
      fixture.coordinator.routeAction({
        evidence: fixture.opened,
        actionId: activateActionIdV1,
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.stale"),
      }),
    ).toMatchObject({
      kind: "stale",
      code: "surface.stale_routing_lease",
    });
    expect(
      fixture.coordinator.routeAction({
        evidence: fixture.opened,
        actionId: otherActionIdV1,
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n1"),
      }),
    ).toMatchObject({
      kind: "rejected",
      code: "surface.action_unpublished",
    });

    fixture.coordinator.openTransientPrimary({
      definition: definitionV1("debug", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.debug"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.debug"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.debug"),
        layerOrder: parseNonNegativeSafeInteger(90),
        inputContextId: "debug",
      }),
      semanticOccurrenceId: null,
    });
    const lowerAtCurrentRevision = fixture.coordinator.getHandle(fixture.opened.surfaceInstanceId)!;
    expect(
      fixture.coordinator.routeAction({
        evidence: lowerAtCurrentRevision,
        actionId: activateActionIdV1,
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n1"),
      }),
    ).toMatchObject({
      kind: "rejected",
      code: "surface.not_input_owner",
    });

    expect(before.topologyRevision).toBe(1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("consumes stale input-publication and gesture evidence before ordinary handlers", () => {
    const fixture = createFixtureV1();
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("old-publication"),
    });
    const successor = createManagedSurfaceActionBindingV1({
      coordinator: fixture.coordinator,
      inputRouter: fixture.router,
      isGestureCurrent: (gestureId) => !fixture.staleGestures.has(gestureId),
    });

    expect(
      successor.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("successor"),
      }).inputPublicationRevision,
    ).toBeGreaterThan(oldEnvelope.inputPublicationRevision);
    expect(fixture.binding.route(oldEnvelope)).toEqual({
      input: {
        kind: "consumed",
        code: "input.stale_publication",
        gestureId: "gesture.test.old-publication",
        inputPublicationRevision: oldEnvelope.inputPublicationRevision,
      },
      surface: null,
    });
    expect(fixture.lower).not.toHaveBeenCalled();

    const staleGesture = successor.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("stale"),
    });
    fixture.staleGestures.add(staleGesture.gestureId);
    expect(successor.route(staleGesture)).toEqual({
      input: {
        kind: "consumed",
        code: "input.stale_gesture",
        gestureId: "gesture.test.stale",
        inputPublicationRevision: staleGesture.inputPublicationRevision,
      },
      surface: null,
    });
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("does not revive a superseded gate when the preflight currentness check rebinds", () => {
    const countingRouter = createCountingInputRouterV1();
    let shouldRebind = false;
    let successor: ManagedSurfaceActionBindingV1 | null = null;
    let fixture: ReturnType<typeof createFixtureV1>;
    fixture = createFixtureV1({
      inputRouter: countingRouter.router,
      beforeGestureCheck: () => {
        if (!shouldRebind) return;
        shouldRebind = false;
        successor = createManagedSurfaceActionBindingV1({
          coordinator: fixture.coordinator,
          inputRouter: fixture.router,
          isGestureCurrent: () => true,
        });
      },
    });
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("preflight-rebind"),
    });
    shouldRebind = true;

    expect(fixture.binding.route(oldEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(successor).not.toBeNull();
    expect(countingRouter.getActiveRegistrationCount()).toBe(2);
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("rechecks publication evidence after the in-gate currentness callback", () => {
    const countingRouter = createCountingInputRouterV1();
    let gestureCheckCount = 0;
    let successor: ManagedSurfaceActionBindingV1 | null = null;
    let fixture: ReturnType<typeof createFixtureV1>;
    fixture = createFixtureV1({
      inputRouter: countingRouter.router,
      beforeGestureCheck: () => {
        gestureCheckCount += 1;
        if (gestureCheckCount !== 2) return;
        successor = createManagedSurfaceActionBindingV1({
          coordinator: fixture.coordinator,
          inputRouter: fixture.router,
          isGestureCurrent: () => true,
        });
      },
    });
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("gate-rebind"),
    });

    expect(fixture.binding.route(oldEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
    expect(successor).not.toBeNull();
    expect(countingRouter.getActiveRegistrationCount()).toBe(2);
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("fences an old dispatch snapshot when a higher handler replaces and rebinds mid-route", () => {
    const fixture = createFixtureV1();
    let successor: ManagedSurfaceActionBindingV1 | null = null;
    let replaced = false;
    fixture.router.register({
      context: "debug",
      handle: () => {
        if (replaced) return inputIgnoredV1;
        replaced = true;
        const replacement = fixture.coordinator.replaceTransientPrimary({
          expected: fixture.opened,
          definition: definitionV1("replacement"),
          semanticOccurrenceId: null,
        });
        expect(replacement.receipt.kind).toBe("applied");
        successor = createManagedSurfaceActionBindingV1({
          coordinator: fixture.coordinator,
          inputRouter: fixture.router,
          isGestureCurrent: () => true,
        });
        return inputIgnoredV1;
      },
    });
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("pointer-up-old"),
    });

    const stale = fixture.binding.route(oldEnvelope);

    expect(stale.input.kind).toBe("consumed");
    expect(stale.surface).toMatchObject({
      kind: "stale",
      code: "surface.stale_topology_revision",
    });
    expect(fixture.lower).not.toHaveBeenCalled();

    const successorBinding = successor as ManagedSurfaceActionBindingV1 | null;
    expect(successorBinding).not.toBeNull();
    const nextEnvelope = successorBinding!.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("pointer-up-next"),
    });
    expect(successorBinding!.route(nextEnvelope)).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(fixture.lower).toHaveBeenCalledOnce();
  });

  it("preserves direct untagged fallthrough while the managed gate is active", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();

    expect(
      fixture.router.route({
        kind: "action",
        actionId: parseInputActionIdV1(activateActionIdV1),
      }),
    ).toEqual({ kind: "handled", context: "overlay" });
    expect(fixture.lower).toHaveBeenCalledOnce();

    fixture.lower.mockImplementation(() => inputIgnoredV1);
    expect(
      fixture.router.route({
        kind: "action",
        actionId: parseInputActionIdV1(otherActionIdV1),
      }),
    ).toEqual({ kind: "ignored" });
    expect(fixture.lower).toHaveBeenCalledTimes(2);
    expect(fixture.coordinator.getSnapshot()).toBe(before);
  });

  it("fails closed for envelopes created before and after binding dispose", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);
    const queuedEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("queued-before-binding-dispose"),
    });

    fixture.binding.dispose();
    fixture.binding.dispose();
    const retainedBindingEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("created-after-binding-dispose"),
    });

    for (const envelope of [queuedEnvelope, retainedBindingEnvelope]) {
      expect(fixture.binding.route(envelope)).toEqual({
        input: {
          kind: "consumed",
          code: "input.stale_publication",
          gestureId: envelope.gestureId,
          inputPublicationRevision: envelope.inputPublicationRevision,
        },
        surface: null,
      });
    }
    expect(fixture.lower).not.toHaveBeenCalled();
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(fixture.coordinator.getSnapshot().topologyRevision).toBe(1);
    expect(listener).not.toHaveBeenCalled();

    expect(
      fixture.router.route({
        kind: "action",
        actionId: parseInputActionIdV1(activateActionIdV1),
      }),
    ).toEqual({ kind: "handled", context: "overlay" });
    expect(fixture.lower).toHaveBeenCalledOnce();
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps a direct valid Coordinator route action unchanged and frozen", () => {
    const fixture = createFixtureV1();
    const before = fixture.coordinator.getSnapshot();
    const listener = vi.fn();
    fixture.coordinator.subscribe(listener);

    const receipt = fixture.coordinator.routeAction({
      evidence: fixture.opened as ManagedSurfaceHandleV1,
      actionId: activateActionIdV1,
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n1"),
    });

    expect(receipt).toEqual({
      kind: "unchanged",
      code: "surface.action_routed",
      beforeTopologyRevision: 1,
      afterTopologyRevision: 1,
      surfaceInstanceId: "surface-instance.e4.n1",
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
});
