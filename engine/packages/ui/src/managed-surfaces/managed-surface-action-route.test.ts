// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import {
  createInputRouterV1,
  type ManagedInputHandlerRegistrationV1,
  registerManagedInputHandlerV1,
} from "../input/input-router.ts";
import {
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceGestureIdV1,
  type ManagedSurfaceRouteActionInputV1,
  type ManagedSurfaceTransitionReceiptV1,
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
  captureManagedSurfacePreparedInputBindingContractInternalV1,
  claimManagedSurfaceAuthenticatedActionRouteInternalV1,
  claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1,
  createManagedSurfaceActionBindingV1,
  createManagedSurfaceContractBoundActionBindingInternalV1,
  equalManagedSurfaceInputBindingContractV1,
  prepareManagedSurfaceContractBoundActionBindingInternalV1,
  type ManagedSurfaceActionBindingV1,
  type ManagedSurfaceInputBindingContractV1,
  type ManagedSurfacePreparedContractBoundActionBindingInternalV1,
  type ManagedSurfacePreparedInputBindingContractInternalV1,
} from "./managed-surface-action-route.ts";
import {
  createManagedSurfaceCoordinatorV1 as createManagedSurfaceCoordinatorImplementationV1,
  type CreateManagedSurfaceCoordinatorInputV1,
  type ManagedSurfaceCoordinatorV1,
  type ManagedSurfaceHandleV1,
  type ManagedSurfaceHandleResultV1,
  type ManagedSurfaceTransientOpenInputV1,
  type ManagedSurfaceTransientReplaceInputV1,
} from "./managed-surface-coordinator.ts";

const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.debug"),
      cardinality: "single",
    },
    {
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.system"),
      cardinality: "single",
    },
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function createManagedSurfaceCoordinatorV1(
  input: Omit<CreateManagedSurfaceCoordinatorInputV1, "resolvedSlotDescriptors">,
) {
  return createManagedSurfaceCoordinatorImplementationV1({
    ...input,
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });
}

function readyResultV1(result: ManagedSurfaceHandleResultV1): ManagedSurfaceHandleResultV1 {
  expect(result.readiness).not.toBeNull();
  return result.readiness!.ready();
}

function openReadyV1(
  coordinator: ManagedSurfaceCoordinatorV1,
  input: ManagedSurfaceTransientOpenInputV1,
): ManagedSurfaceHandleResultV1 {
  return readyResultV1(coordinator.openTransientPrimary(input));
}

function replaceReadyV1(
  coordinator: ManagedSurfaceCoordinatorV1,
  input: ManagedSurfaceTransientReplaceInputV1,
): ManagedSurfaceHandleResultV1 {
  return readyResultV1(coordinator.replaceTransientPrimary(input));
}

const activateActionIdV1 = parseManagedSurfaceActionIdV1("surface-action.activate");
const otherActionIdV1 = parseManagedSurfaceActionIdV1("surface-action.other");

function definitionV1(
  suffix: string,
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return {
    definitionId: parseManagedSurfaceDefinitionIdV1(`surface-definition.${suffix}`),
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    modality: "non_blocking",
    inputPolicy: { kind: "managed", inputContextId: "overlay" },
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    },
    navigationPolicy: { kind: "close" },
    actionIds: [activateActionIdV1],
    readiness: {
      initialOpen: "blocking_fallback",
      primaryReplacement: "retain_current",
      childOpen: "blocking_fallback",
    },
    ...overrides,
  };
}

function gestureV1(suffix: string) {
  return parseManagedSurfaceGestureIdV1(`gesture.test.${suffix}`);
}

function inputBindingContractV1(
  overrides: Partial<ManagedSurfaceInputBindingContractV1> = {},
): ManagedSurfaceInputBindingContractV1 {
  return Object.freeze({
    applicationEpoch: parseNonNegativeSafeInteger(4),
    ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
    surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.n1"),
    inputContextId: "overlay",
    routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n1"),
    actionIds: Object.freeze([activateActionIdV1]),
    topologyRevision: parseNonNegativeSafeInteger(1),
    ...overrides,
  });
}

function routedReceiptForContractV1(contract: ManagedSurfaceInputBindingContractV1) {
  return Object.freeze({
    kind: "unchanged" as const,
    code: "surface.action_routed" as const,
    beforeTopologyRevision: contract.topologyRevision,
    afterTopologyRevision: contract.topologyRevision,
    surfaceInstanceId: contract.surfaceInstanceId,
  });
}

function createContractBoundAuthorityV1() {
  const routeActionInternalV1 = vi.fn((input: ManagedSurfaceRouteActionInputV1) =>
    Object.freeze({
      kind: "unchanged" as const,
      code: "surface.action_routed" as const,
      beforeTopologyRevision: input.evidence.topologyRevision,
      afterTopologyRevision: input.evidence.topologyRevision,
      surfaceInstanceId: input.evidence.surfaceInstanceId,
    })
  );
  return Object.freeze({
    authority: Object.freeze({ routeActionInternalV1 }),
    routeActionInternalV1,
  });
}

interface FixtureOptionsV1 {
  readonly inputRouter?: InputRouterV1;
  readonly beforeGestureCheck?: (gestureId: ManagedSurfaceGestureIdV1) => void;
  readonly registerManagedInputHandler?: typeof registerManagedInputHandlerV1;
}

function createCountingInputRouterV1() {
  const router = createInputRouterV1();
  let activeRegistrationCount = 0;
  let registrationCount = 0;
  let unregistrationCount = 0;
  const registerManagedInputHandler = (
    target: InputRouterV1,
    registration: ManagedInputHandlerRegistrationV1,
  ): () => void => {
    registrationCount += 1;
    activeRegistrationCount += 1;
    const unregisterDelegate = registerManagedInputHandlerV1(target, registration);
    let active = true;
    return (): void => {
      if (!active) return;
      active = false;
      unregistrationCount += 1;
      activeRegistrationCount -= 1;
      unregisterDelegate();
    };
  };
  return Object.freeze({
    router,
    registerManagedInputHandler,
    getActiveRegistrationCount: () => activeRegistrationCount,
    getRegistrationCount: () => registrationCount,
    getUnregistrationCount: () => unregistrationCount,
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
  const opened = openReadyV1(coordinator, {
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
    ...(options.registerManagedInputHandler === undefined
      ? {}
      : { registerManagedInputHandler: options.registerManagedInputHandler }),
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
      surfaceTopologyRevision: 2,
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
        beforeTopologyRevision: 2,
        afterTopologyRevision: 2,
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
        beforeTopologyRevision: 2,
        afterTopologyRevision: 2,
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
        beforeTopologyRevision: 2,
        afterTopologyRevision: 2,
        surfaceInstanceId: "surface-instance.e4.n1",
      },
    });
    expect(fixture.lower).not.toHaveBeenCalled();
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("fails closed after rebind, gesture expiry, and binding dispose", () => {
    const fixture = createFixtureV1();
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: otherActionIdV1,
      gestureId: gestureV1("undeclared-old-publication"),
    });
    expect(
      replaceReadyV1(fixture.coordinator, {
        expected: fixture.opened,
        definition: definitionV1("successor"),
        semanticOccurrenceId: null,
      }).receipt.kind,
    ).toBe("applied");
    const afterRebind = fixture.coordinator.getSnapshot();
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
    expect(fixture.coordinator.getSnapshot()).toBe(afterRebind);
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
          beforeTopologyRevision: 3,
          afterTopologyRevision: 3,
          surfaceInstanceId: "surface-instance.e4.n1",
        },
      },
      {
        label: "Coordinator dispose",
        dispose: (fixture: ReturnType<typeof createFixtureV1>) => fixture.coordinator.dispose(),
        surface: {
          kind: "rejected",
          code: "surface.coordinator_disposed",
          beforeTopologyRevision: 3,
          afterTopologyRevision: 3,
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

    openReadyV1(fixture.coordinator, {
      definition: definitionV1("debug", {
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.debug"),
        slotId: parseManagedSurfaceSlotIdV1("surface-slot.debug"),
        layerId: parseManagedSurfaceLayerIdV1("surface-layer.debug"),
        layerOrder: parseNonNegativeSafeInteger(90),
        inputPolicy: { kind: "managed", inputContextId: "debug" },
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

    expect(before.topologyRevision).toBe(2);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("consumes stale input-publication and gesture evidence before ordinary handlers", () => {
    const fixture = createFixtureV1();
    const oldEnvelope = fixture.binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("old-publication"),
    });
    expect(
      replaceReadyV1(fixture.coordinator, {
        expected: fixture.opened,
        definition: definitionV1("successor"),
        semanticOccurrenceId: null,
      }).receipt.kind,
    ).toBe("applied");
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

  it.each([
    {
      label: "application epoch",
      contract: inputBindingContractV1({ applicationEpoch: parseNonNegativeSafeInteger(5) }),
    },
    {
      label: "owner",
      contract: inputBindingContractV1({
        ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.other"),
      }),
    },
    {
      label: "instance",
      contract: inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.n2"),
      }),
    },
    { label: "context", contract: inputBindingContractV1({ inputContextId: "system" }) },
    {
      label: "routing lease",
      contract: inputBindingContractV1({
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n2"),
      }),
    },
    {
      label: "action catalog",
      contract: inputBindingContractV1({
        actionIds: [activateActionIdV1, parseManagedSurfaceActionIdV1("surface-action.other")],
      }),
    },
    {
      label: "topology revision",
      contract: inputBindingContractV1({ topologyRevision: parseNonNegativeSafeInteger(2) }),
    },
  ])("replaces an input binding when its $label changes", ({ contract }) => {
    expect(equalManagedSurfaceInputBindingContractV1(inputBindingContractV1(), contract)).toBe(
      false,
    );
  });

  it("compares input action catalogs by value and order rather than array identity", () => {
    const actionA = activateActionIdV1;
    const actionB = parseManagedSurfaceActionIdV1("surface-action.other");
    expect(
      equalManagedSurfaceInputBindingContractV1(
        inputBindingContractV1({ actionIds: [actionA, actionB] }),
        inputBindingContractV1({ actionIds: [actionA, actionB] }),
      ),
    ).toBe(true);
    expect(
      equalManagedSurfaceInputBindingContractV1(
        inputBindingContractV1({ actionIds: [actionA, actionB] }),
        inputBindingContractV1({ actionIds: [actionB, actionA] }),
      ),
    ).toBe(false);
  });

  it("reuses one binding and input publication across recreated construction delegates", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(18),
      resolvedOwnerIds: [parseManagedSurfaceOwnerIdV1("surface-owner.workspace")],
    });
    openReadyV1(coordinator, {
      definition: definitionV1("inventory"),
      semanticOccurrenceId: null,
    });
    const countingRouter = createCountingInputRouterV1();
    const inputRouter = countingRouter.router;
    const initialGestureCurrent = vi.fn(() => false);
    const first = createManagedSurfaceActionBindingV1({
      coordinator,
      inputRouter,
      isGestureCurrent: initialGestureCurrent,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const firstEnvelope = first.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("same-contract-first"),
    });
    const retainedGestureCurrent = vi.fn(() => true);
    const alternateRegistrar = vi.fn(countingRouter.registerManagedInputHandler);

    const retained = createManagedSurfaceActionBindingV1({
      coordinator,
      inputRouter,
      isGestureCurrent: retainedGestureCurrent,
      registerManagedInputHandler: alternateRegistrar,
    });
    const retainedEnvelope = retained.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("same-contract-retained"),
    });

    expect(retained).toBe(first);
    expect(retainedEnvelope.inputPublicationRevision).toBe(
      firstEnvelope.inputPublicationRevision,
    );
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
    expect(alternateRegistrar).not.toHaveBeenCalled();
    expect(first.route(firstEnvelope)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(initialGestureCurrent).not.toHaveBeenCalled();
    expect(retainedGestureCurrent).toHaveBeenCalledTimes(2);
  });

  it("rejects a value-equal contract from a different Coordinator authority", () => {
    const ownerId = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
    const createCoordinator = () => {
      const coordinator = createManagedSurfaceCoordinatorV1({
        applicationEpoch: parseNonNegativeSafeInteger(19),
        resolvedOwnerIds: [ownerId],
      });
      openReadyV1(coordinator, {
        definition: definitionV1("inventory"),
        semanticOccurrenceId: null,
      });
      return coordinator;
    };
    const firstCoordinator = createCoordinator();
    const secondCoordinator = createCoordinator();
    const countingRouter = createCountingInputRouterV1();
    const binding = createManagedSurfaceActionBindingV1({
      coordinator: firstCoordinator,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const queued = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("authority-conflict"),
    });

    expect(() =>
      createManagedSurfaceActionBindingV1({
        coordinator: secondCoordinator,
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
      })
    ).toThrowError("ui.managed_surface_input_authority_conflict");
    secondCoordinator.dispose();

    expect(binding.route(queued)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("retains binding, registration, and queued actions across a publication-only owner commit", () => {
    const coordinator = createManagedSurfaceCoordinatorV1({
      applicationEpoch: parseNonNegativeSafeInteger(25),
      resolvedOwnerIds: [
        parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
        parseManagedSurfaceOwnerIdV1("surface-owner.system"),
      ],
    });
    openReadyV1(coordinator, {
      definition: definitionV1("inventory"),
      semanticOccurrenceId: null,
    });
    const countingRouter = createCountingInputRouterV1();
    const lower = vi.fn(() => inputHandledV1);
    countingRouter.router.register({ context: "overlay", handle: lower });
    const binding = createManagedSurfaceActionBindingV1({
      coordinator,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const queuedBeforeCommit = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("before-publication-only"),
    });
    const before = coordinator.getSnapshot();
    const listener = vi.fn();
    coordinator.subscribe(listener);

    expect(
      coordinator.disposeOwner(parseManagedSurfaceOwnerIdV1("surface-owner.system")),
    ).toMatchObject({
      kind: "applied",
      beforeTopologyRevision: before.topologyRevision,
      afterTopologyRevision: before.topologyRevision,
    });
    const after = coordinator.getSnapshot();
    expect(after.publicationRevision).toBe(before.publicationRevision + 1);
    expect(after.topologyRevision).toBe(before.topologyRevision);
    expect(after.ownerTrace).toContainEqual({
      ownerId: "surface-owner.system",
      surfaceInstanceIds: [],
      disposed: true,
    });
    expect(listener).toHaveBeenCalledOnce();

    const alternateRegistrar = vi.fn(countingRouter.registerManagedInputHandler);
    const retained = createManagedSurfaceActionBindingV1({
      coordinator,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: alternateRegistrar,
    });
    const afterCommitEnvelope = retained.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("after-publication-only"),
    });
    expect(retained).toBe(binding);
    expect(afterCommitEnvelope.inputPublicationRevision).toBe(
      queuedBeforeCommit.inputPublicationRevision,
    );
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
    expect(alternateRegistrar).not.toHaveBeenCalled();

    expect(binding.route(queuedBeforeCommit)).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(retained.route(afterCommitEnvelope)).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(lower).toHaveBeenCalledTimes(2);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("does not revive a superseded gate when the preflight currentness check rebinds", () => {
    const countingRouter = createCountingInputRouterV1();
    let shouldRebind = false;
    let successor: ManagedSurfaceActionBindingV1 | null = null;
    let fixture: ReturnType<typeof createFixtureV1>;
    fixture = createFixtureV1({
      inputRouter: countingRouter.router,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
      beforeGestureCheck: () => {
        if (!shouldRebind) return;
        shouldRebind = false;
        expect(
          replaceReadyV1(fixture.coordinator, {
            expected: fixture.opened,
            definition: definitionV1("preflight-successor"),
            semanticOccurrenceId: null,
          }).receipt.kind,
        ).toBe("applied");
        successor = createManagedSurfaceActionBindingV1({
          coordinator: fixture.coordinator,
          inputRouter: fixture.router,
          isGestureCurrent: () => true,
          registerManagedInputHandler: countingRouter.registerManagedInputHandler,
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
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
    expect(fixture.lower).not.toHaveBeenCalled();
  });

  it("rechecks publication evidence after the in-gate currentness callback", () => {
    const countingRouter = createCountingInputRouterV1();
    let gestureCheckCount = 0;
    let successor: ManagedSurfaceActionBindingV1 | null = null;
    let fixture: ReturnType<typeof createFixtureV1>;
    fixture = createFixtureV1({
      inputRouter: countingRouter.router,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
      beforeGestureCheck: () => {
        gestureCheckCount += 1;
        if (gestureCheckCount !== 2) return;
        expect(
          replaceReadyV1(fixture.coordinator, {
            expected: fixture.opened,
            definition: definitionV1("gate-successor"),
            semanticOccurrenceId: null,
          }).receipt.kind,
        ).toBe("applied");
        successor = createManagedSurfaceActionBindingV1({
          coordinator: fixture.coordinator,
          inputRouter: fixture.router,
          isGestureCurrent: () => true,
          registerManagedInputHandler: countingRouter.registerManagedInputHandler,
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
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
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
        const replacement = replaceReadyV1(fixture.coordinator, {
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
    expect(fixture.coordinator.getSnapshot().topologyRevision).toBe(2);
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
      beforeTopologyRevision: 2,
      afterTopologyRevision: 2,
      surfaceInstanceId: "surface-instance.e4.n1",
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(fixture.coordinator.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reuses one contract-bound binding for the same authority and rejects a foreign authority", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    let routeResult: ManagedSurfaceTransitionReceiptV1 = routedReceiptForContractV1(contract);
    const authority = Object.freeze({
      routeActionInternalV1: vi.fn(() => routeResult),
    });
    const firstGestureCurrent = vi.fn(() => false);
    const first = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority,
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent: firstGestureCurrent,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const firstEnvelope = first.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("contract-bound-first"),
    });
    const retainedGestureCurrent = vi.fn(() => true);
    const alternateRegistrar = vi.fn(countingRouter.registerManagedInputHandler);

    const retained = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: retainedGestureCurrent,
      registerManagedInputHandler: alternateRegistrar,
    });

    expect(retained).toBe(first);
    expect(
      retained.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("contract-bound-retained"),
      }).inputPublicationRevision,
    ).toBe(firstEnvelope.inputPublicationRevision);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(alternateRegistrar).not.toHaveBeenCalled();

    routeResult = Object.freeze({
      ...routedReceiptForContractV1(contract),
      kind: "rejected" as const,
      code: "surface.action_unpublished" as const,
    });
    expect(first.route(firstEnvelope)).toMatchObject({
      input: { kind: "consumed" },
      surface: { kind: "rejected", code: "surface.action_unpublished" },
    });
    expect(firstGestureCurrent).not.toHaveBeenCalled();
    expect(retainedGestureCurrent).toHaveBeenCalledOnce();

    const foreignAuthority = Object.freeze({
      routeActionInternalV1: vi.fn(() => routedReceiptForContractV1(contract)),
    });
    expect(() =>
      createManagedSurfaceContractBoundActionBindingInternalV1({
        authority: foreignAuthority,
        contract: inputBindingContractV1(),
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
      })
    ).toThrowError("ui.managed_surface_input_authority_conflict");
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("runs a claimed continuation once after surface and physical-gesture admission", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    const order: string[] = [];
    const lower = vi.fn(() => {
      order.push("lower");
      return inputHandledV1;
    });
    countingRouter.router.register({ context: "overlay", handle: lower });
    const authority = Object.freeze({
      routeActionInternalV1: vi.fn(() => {
        order.push("surface");
        return routedReceiptForContractV1(contract);
      }),
    });
    const binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority,
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => {
        order.push("gesture");
        return true;
      },
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const consumerResult = Object.freeze({ kind: "semantic-dispatched" as const });
    let authenticatedContinuationInput: unknown;
    const consume = vi.fn((input: unknown) => {
      authenticatedContinuationInput = input;
      order.push("consumer");
      return consumerResult;
    });
    const claimed = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);
    const envelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("claimed-current"),
    });
    const opaqueAttempt = Object.freeze({
      kind: "physical-attempt" as const,
      actionId: otherActionIdV1,
    });

    const result = claimed.routeInternalV1(envelope, opaqueAttempt);

    expect(Reflect.ownKeys(result)).toEqual(["route", "consumerResult"]);
    expect(result).toEqual({
      route: {
        input: {
          kind: "consumed",
          code: "input.managed_surface_consumed",
          gestureId: "gesture.test.claimed-current",
          inputPublicationRevision: envelope.inputPublicationRevision,
        },
        surface: routedReceiptForContractV1(contract),
      },
      consumerResult,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(consume).toHaveBeenCalledOnce();
    expect(Reflect.ownKeys(authenticatedContinuationInput as object)).toEqual([
      "actionId",
      "attempt",
    ]);
    expect(authenticatedContinuationInput).toEqual({
      actionId: activateActionIdV1,
      attempt: opaqueAttempt,
    });
    expect(Object.isFrozen(authenticatedContinuationInput)).toBe(true);
    expect(
      (authenticatedContinuationInput as { readonly attempt: unknown }).attempt,
    ).toBe(opaqueAttempt);
    expect(
      (authenticatedContinuationInput as { readonly actionId: unknown }).actionId,
    ).not.toBe(opaqueAttempt.actionId);
    expect(order).toEqual(["gesture", "surface", "gesture", "consumer"]);
    expect(lower).not.toHaveBeenCalled();
  });

  it("keeps direct untagged input fallthrough while a claimed route consumes binding-origin input", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    const lower = vi.fn(() => inputHandledV1);
    countingRouter.router.register({ context: "overlay", handle: lower });
    const binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: Object.freeze({
        routeActionInternalV1: () => routedReceiptForContractV1(contract),
      }),
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const consume = vi.fn(() => "consumed-by-owner");
    const claimed = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);

    expect(
      countingRouter.router.route({
        kind: "action",
        actionId: parseInputActionIdV1(activateActionIdV1),
      }),
    ).toEqual({ kind: "handled", context: "overlay" });
    expect(lower).toHaveBeenCalledOnce();
    expect(consume).not.toHaveBeenCalled();

    const rawEnvelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("claimed-raw-binding"),
    });
    expect(binding.route(rawEnvelope)).toEqual({
      input: {
        kind: "consumed",
        code: "input.managed_surface_consumed",
        gestureId: rawEnvelope.gestureId,
        inputPublicationRevision: rawEnvelope.inputPublicationRevision,
      },
      surface: routedReceiptForContractV1(contract),
    });
    expect(lower).toHaveBeenCalledOnce();
    expect(consume).not.toHaveBeenCalled();

    const result = claimed.routeInternalV1(
      binding.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("claimed-no-fallthrough"),
      }),
      Object.freeze({ kind: "attempt" }),
    );
    expect(result.consumerResult).toBe("consumed-by-owner");
    expect(result.route.input.code).toBe("input.managed_surface_consumed");
    expect(lower).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledOnce();
  });

  it("claims an authentic binding once and seals the route on dispose", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    const lower = vi.fn(() => inputHandledV1);
    countingRouter.router.register({ context: "overlay", handle: lower });
    const binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: Object.freeze({
        routeActionInternalV1: () => routedReceiptForContractV1(contract),
      }),
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const consume = vi.fn(() => "semantic");
    const claimed = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);
    const envelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("claimed-dispose"),
    });

    expect(() => claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, vi.fn()))
      .toThrow(TypeError);
    expect(() =>
      claimManagedSurfaceAuthenticatedActionRouteInternalV1(
        { ...binding } as ManagedSurfaceActionBindingV1,
        vi.fn(),
      )
    ).toThrow(TypeError);

    claimed.disposeInternalV1();
    claimed.disposeInternalV1();
    expect(claimed.routeInternalV1(envelope, Object.freeze({ kind: "attempt" }))).toEqual({
      route: {
        input: {
          kind: "consumed",
          code: "input.stale_publication",
          gestureId: envelope.gestureId,
          inputPublicationRevision: envelope.inputPublicationRevision,
        },
        surface: null,
      },
      consumerResult: null,
    });
    expect(consume).not.toHaveBeenCalled();
    expect(lower).not.toHaveBeenCalled();
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
  });

  it("fences reentry and resets the claim after a throwing continuation", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    const lower = vi.fn(() => inputHandledV1);
    countingRouter.router.register({ context: "overlay", handle: lower });
    const binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: Object.freeze({
        routeActionInternalV1: () => routedReceiptForContractV1(contract),
      }),
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const envelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("claimed-reentry"),
    });
    const attempt = Object.freeze({ kind: "attempt" });
    const sentinel = new Error("semantic dispatch failed");
    let claimed!: ReturnType<typeof claimManagedSurfaceAuthenticatedActionRouteInternalV1>;
    let mode: "reenter" | "throw" | "succeed" = "reenter";
    const consume = vi.fn(() => {
      if (mode === "reenter") {
        expect(() => claimed.routeInternalV1(envelope, attempt)).toThrow(TypeError);
        return "outer";
      }
      if (mode === "throw") throw sentinel;
      return "recovered";
    });
    claimed = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);

    expect(claimed.routeInternalV1(envelope, attempt).consumerResult).toBe("outer");
    mode = "throw";
    expect(() => claimed.routeInternalV1(envelope, attempt)).toThrow(sentinel);
    mode = "succeed";
    expect(claimed.routeInternalV1(envelope, attempt).consumerResult).toBe("recovered");
    expect(consume).toHaveBeenCalledTimes(3);
    expect(lower).not.toHaveBeenCalled();
  });

  it("consumes one claimed invocation once across same-event router reentry", () => {
    const countingRouter = createCountingInputRouterV1();
    const contract = inputBindingContractV1();
    let routeActionCount = 0;
    const routeActionInternalV1 = vi.fn(() => {
      routeActionCount += 1;
      return routeActionCount === 1 ? routedReceiptForContractV1(contract) : Object.freeze({
        kind: "rejected" as const,
        code: "surface.not_input_owner" as const,
        beforeTopologyRevision: contract.topologyRevision,
        afterTopologyRevision: contract.topologyRevision,
        surfaceInstanceId: contract.surfaceInstanceId,
      });
    });
    const isGestureCurrent = vi.fn(() => true);
    const binding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: Object.freeze({ routeActionInternalV1 }),
      contract,
      inputRouter: countingRouter.router,
      isGestureCurrent,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    let reentered = false;
    let nestedRoute: unknown = null;
    countingRouter.router.register({
      context: "debug",
      handle: (event) => {
        if (!reentered) {
          reentered = true;
          nestedRoute = countingRouter.router.route(event);
        }
        return inputIgnoredV1;
      },
    });
    const consumerResult = Object.freeze({ kind: "same-event-consumer" as const });
    const consume = vi.fn(() => consumerResult);
    const claimed = claimManagedSurfaceAuthenticatedActionRouteInternalV1(binding, consume);
    const envelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("claimed-same-event-reentry"),
    });

    expect(claimed.routeInternalV1(envelope, Object.freeze({ kind: "attempt" }))).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult,
    });
    expect(nestedRoute).toEqual({ kind: "handled", context: "overlay" });
    expect(routeActionInternalV1).toHaveBeenCalledOnce();
    expect(isGestureCurrent).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenCalledOnce();
  });

  it("prepares and preclaims one zero-key contract-token binding before a plain-only commit", () => {
    const countingRouter = createCountingInputRouterV1();
    const currentContract = inputBindingContractV1();
    const currentAuthority = createContractBoundAuthorityV1();
    const current = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: currentAuthority.authority,
      contract: currentContract,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const oldEnvelope = current.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-old"),
    });
    const candidateAuthority = createContractBoundAuthorityV1();
    const gestureCurrent = vi.fn(() => true);
    const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: candidateAuthority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: gestureCurrent,
      registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
    });
    const rawContract = {
      applicationEpoch: parseNonNegativeSafeInteger(4),
      ownerId: parseManagedSurfaceOwnerIdV1("surface-owner.workspace"),
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.n2"),
      inputContextId: "overlay" as const,
      routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n2"),
      actionIds: [activateActionIdV1],
      topologyRevision: parseNonNegativeSafeInteger(2),
    } satisfies ManagedSurfaceInputBindingContractV1;
    const contractToken = captureManagedSurfacePreparedInputBindingContractInternalV1(
      rawContract,
    );
    rawContract.surfaceInstanceId = parseManagedSurfaceInstanceIdV1(
      "surface-instance.mutated",
    );
    rawContract.topologyRevision = parseNonNegativeSafeInteger(999);
    rawContract.actionIds[0] = otherActionIdV1;
    const consumerResult = Object.freeze({ kind: "consumer-result" as const });
    const consume = vi.fn(() => consumerResult);
    const claimed = claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
      prepared,
      consume,
    );

    expect(Reflect.ownKeys(prepared)).toEqual([
      "commitInternalV1",
      "abortInternalV1",
      "getBindingInternalV1",
    ]);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(prepared.getBindingInternalV1()).toBeNull();
    expect(Reflect.ownKeys(contractToken)).toEqual([]);
    expect(Object.isFrozen(contractToken)).toBe(true);
    expect(Reflect.ownKeys(claimed)).toEqual(["routeInternalV1", "disposeInternalV1"]);
    expect(Object.isFrozen(claimed)).toBe(true);
    expect(countingRouter.getRegistrationCount()).toBe(1);

    candidateAuthority.routeActionInternalV1.mockClear();
    expect(prepared.commitInternalV1(contractToken)).toBe(true);
    expect(prepared.commitInternalV1(contractToken)).toBe(false);
    expect(candidateAuthority.routeActionInternalV1).not.toHaveBeenCalled();
    expect(gestureCurrent).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);

    const binding = prepared.getBindingInternalV1();
    expect(binding).not.toBeNull();
    expect(prepared.getBindingInternalV1()).toBe(binding);
    const envelope = binding!.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-current"),
    });
    expect(envelope).toMatchObject({
      surfaceInstanceId: "surface-instance.e4.n2",
      surfaceTopologyRevision: 2,
      inputPublicationRevision: 2,
    });
    const opaqueAttempt = Object.freeze({ kind: "prepared-attempt" as const });
    expect(claimed.routeInternalV1(envelope, opaqueAttempt)).toMatchObject({
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
      consumerResult,
    });
    expect(consume).toHaveBeenCalledOnce();
    expect(current.route(oldEnvelope)).toMatchObject({
      input: { kind: "consumed", code: "input.stale_publication" },
      surface: null,
    });
  });

  it("rejects forged tokens and receivers and keeps abort exact, idempotent, and zero-delta", () => {
    const countingRouter = createCountingInputRouterV1();
    const currentAuthority = createContractBoundAuthorityV1();
    const current = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: currentAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const currentEnvelope = current.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-abort-current"),
    });
    const candidateAuthority = createContractBoundAuthorityV1();
    const createPrepared = () =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: candidateAuthority.authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
      });
    const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.n2"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n2"),
        topologyRevision: parseNonNegativeSafeInteger(2),
      }),
    );
    const forgedToken = { ...token } as ManagedSurfacePreparedInputBindingContractInternalV1;
    const forgedPrepared = {
      ...createPrepared(),
    } as ManagedSurfacePreparedContractBoundActionBindingInternalV1;
    expect(() =>
      claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
        forgedPrepared,
        vi.fn(),
      )
    ).toThrowError("ui.managed_surface_action_route_claim_invalid");

    const forgedAttempt = createPrepared();
    expect(forgedAttempt.commitInternalV1(forgedToken)).toBe(false);
    expect(forgedAttempt.getBindingInternalV1()).toBeNull();
    const abortAttempt = createPrepared();
    abortAttempt.abortInternalV1();
    abortAttempt.abortInternalV1();
    expect(abortAttempt.commitInternalV1(token)).toBe(false);
    expect(abortAttempt.getBindingInternalV1()).toBeNull();
    expect(Reflect.apply(abortAttempt.commitInternalV1, {}, [token])).toBe(false);
    expect(Reflect.apply(abortAttempt.getBindingInternalV1, {}, [])).toBeNull();

    expect(current.route(currentEnvelope)).toMatchObject({
      input: { kind: "unhandled" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("terminal-aborts failed commits, releases both slots, and rejects post-commit preclaims", () => {
    const countingRouter = createCountingInputRouterV1();
    const authorityA = createContractBoundAuthorityV1();
    const authorityB = createContractBoundAuthorityV1();
    const authorityC = createContractBoundAuthorityV1();
    const prepareFor = (
      authority: ReturnType<typeof createContractBoundAuthorityV1>["authority"],
    ) =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: countingRouter.registerManagedInputHandler,
      });
    const preparationA = prepareFor(authorityA.authority);
    const preparationB = prepareFor(authorityB.authority);
    const wrongContextToken = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({ inputContextId: "system" }),
    );

    expect(preparationA.commitInternalV1(wrongContextToken)).toBe(false);
    expect(preparationB.commitInternalV1(wrongContextToken)).toBe(false);
    expect(preparationA.getBindingInternalV1()).toBeNull();
    expect(preparationB.getBindingInternalV1()).toBeNull();
    expect(() =>
      claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
        preparationA,
        vi.fn(),
      )
    ).toThrowError("ui.managed_surface_action_route_claim_invalid");
    expect(() =>
      claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
        preparationB,
        vi.fn(),
      )
    ).toThrowError("ui.managed_surface_action_route_claim_invalid");

    const preparationC = prepareFor(authorityC.authority);
    preparationC.abortInternalV1();
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("descriptor-captures prepared input and raw contracts without invoking accessors", () => {
    const countingRouter = createCountingInputRouterV1();
    const authorityGetter = vi.fn(() => () => routedReceiptForContractV1(inputBindingContractV1()));
    const accessorAuthority = Object.defineProperty({}, "routeActionInternalV1", {
      configurable: true,
      enumerable: true,
      get: authorityGetter,
    });
    const registrar = vi.fn(countingRouter.registerManagedInputHandler);
    expect(() =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: accessorAuthority as never,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: registrar,
      })
    ).toThrowError("ui.managed_surface_input_authority_invalid");
    expect(authorityGetter).not.toHaveBeenCalled();
    expect(registrar).not.toHaveBeenCalled();

    const contractGetter = vi.fn(() => parseNonNegativeSafeInteger(4));
    const contractWithAccessor = Object.defineProperties({}, {
      applicationEpoch: { enumerable: true, get: contractGetter },
      ownerId: { enumerable: true, value: parseManagedSurfaceOwnerIdV1("surface-owner.workspace") },
      surfaceInstanceId: {
        enumerable: true,
        value: parseManagedSurfaceInstanceIdV1("surface-instance.e4.n2"),
      },
      inputContextId: { enumerable: true, value: "overlay" },
      routingLeaseId: {
        enumerable: true,
        value: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.n2"),
      },
      actionIds: { enumerable: true, value: [activateActionIdV1] },
      topologyRevision: { enumerable: true, value: parseNonNegativeSafeInteger(2) },
    });
    expect(() =>
      captureManagedSurfacePreparedInputBindingContractInternalV1(
        contractWithAccessor as ManagedSurfaceInputBindingContractV1,
      )
    ).toThrow(TypeError);
    expect(contractGetter).not.toHaveBeenCalled();
  });

  it("bounds two latest-per-authority preparations and makes the first current-pointer commit win", () => {
    const countingRouter = createCountingInputRouterV1();
    const currentAuthority = createContractBoundAuthorityV1();
    const current = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: currentAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const currentEnvelope = current.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-two-current"),
    });
    const authorityA = createContractBoundAuthorityV1();
    const authorityB = createContractBoundAuthorityV1();
    const authorityC = createContractBoundAuthorityV1();
    const prepareFor = (
      authority: ReturnType<typeof createContractBoundAuthorityV1>["authority"],
      registerManagedInputHandler: typeof registerManagedInputHandlerV1 =
        countingRouter.registerManagedInputHandler,
    ) =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler,
      });
    const preparationA1 = prepareFor(authorityA.authority);
    const preparationB1 = prepareFor(authorityB.authority);
    const thirdRegistrar = vi.fn(countingRouter.registerManagedInputHandler);
    expect(() => prepareFor(authorityC.authority, thirdRegistrar)).toThrowError(
      "ui.managed_surface_input_authority_conflict",
    );
    expect(thirdRegistrar).not.toHaveBeenCalled();
    const preparationA2 = prepareFor(authorityA.authority, thirdRegistrar);
    expect(thirdRegistrar).not.toHaveBeenCalled();

    const contractA = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.a"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.a"),
        topologyRevision: parseNonNegativeSafeInteger(4),
      }),
    );
    const contractB = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.b"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.b"),
        topologyRevision: parseNonNegativeSafeInteger(5),
      }),
    );
    expect(preparationA1.commitInternalV1(contractA)).toBe(false);
    expect(current.route(currentEnvelope)).toMatchObject({
      input: { kind: "unhandled" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(preparationA2.commitInternalV1(contractA)).toBe(true);
    expect(
      preparationA2.getBindingInternalV1()!.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("prepared-two-a"),
      }).inputPublicationRevision,
    ).toBe(4);
    expect(preparationB1.commitInternalV1(contractB)).toBe(false);

    const preparationB2 = prepareFor(authorityB.authority, thirdRegistrar);
    expect(preparationB2.commitInternalV1(contractB)).toBe(true);
    expect(
      preparationB2.getBindingInternalV1()!.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("prepared-two-b"),
      }).inputPublicationRevision,
    ).toBe(5);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("burns aborted reservations without rollback and keeps dispatcher/preparation retention bounded over 10k churn", () => {
    const countingRouter = createCountingInputRouterV1();
    const currentAuthority = createContractBoundAuthorityV1();
    const current = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: currentAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const queued = current.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-churn-current"),
    });
    const candidateAuthority = createContractBoundAuthorityV1();

    for (let index = 0; index < 10_000; index += 1) {
      const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: candidateAuthority.authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
      });
      prepared.abortInternalV1();
    }
    expect(current.route(queued)).toMatchObject({
      input: { kind: "unhandled" },
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });

    const finalPrepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: candidateAuthority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
    });
    const finalToken = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.final"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.final"),
        topologyRevision: parseNonNegativeSafeInteger(10_002),
      }),
    );
    expect(finalPrepared.commitInternalV1(finalToken)).toBe(true);
    expect(
      finalPrepared.getBindingInternalV1()!.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1("prepared-churn-final"),
      }).inputPublicationRevision,
    ).toBe(10_002);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
  });

  it("keeps 10k sequential committed replacements on one dispatcher without revision reuse", () => {
    const countingRouter = createCountingInputRouterV1();
    const initialAuthority = createContractBoundAuthorityV1();
    let currentBinding = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: initialAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    let currentEnvelope = currentBinding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("sequential-commit-initial"),
    });
    expect(currentEnvelope.inputPublicationRevision).toBe(1);

    for (let index = 0; index < 10_000; index += 1) {
      const authority = createContractBoundAuthorityV1();
      const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: authority.authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
      });
      const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
        inputBindingContractV1({
          surfaceInstanceId: parseManagedSurfaceInstanceIdV1(
            `surface-instance.e4.commit-${index}`,
          ),
          routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(
            `surface-lease.e4.commit-${index}`,
          ),
          topologyRevision: parseNonNegativeSafeInteger(index + 2),
        }),
      );
      expect(prepared.commitInternalV1(token)).toBe(true);
      const successor = prepared.getBindingInternalV1();
      expect(successor).not.toBeNull();
      const successorEnvelope = successor!.createEnvelope({
        actionId: activateActionIdV1,
        gestureId: gestureV1(`sequential-commit-${index}`),
      });
      expect(successorEnvelope.inputPublicationRevision).toBe(index + 2);
      expect(currentBinding.route(currentEnvelope)).toMatchObject({
        input: { kind: "consumed", code: "input.stale_publication" },
        surface: null,
      });
      currentBinding = successor!;
      currentEnvelope = successorEnvelope;
    }

    expect(currentEnvelope.inputPublicationRevision).toBe(10_001);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("prepares the first empty-context dispatcher once and retains its first registrar", () => {
    const countingRouter = createCountingInputRouterV1();
    const authority = createContractBoundAuthorityV1();
    const firstRegistrar = vi.fn(countingRouter.registerManagedInputHandler);
    const firstRegistrarGetter = vi.fn(() => firstRegistrar);
    const firstAccessorInput = Object.defineProperties({}, {
      authority: { enumerable: true, value: authority.authority },
      inputContextId: { enumerable: true, value: "overlay" },
      inputRouter: { enumerable: true, value: countingRouter.router },
      isGestureCurrent: { enumerable: true, value: () => true },
      registerManagedInputHandler: { enumerable: true, get: firstRegistrarGetter },
    });
    expect(() =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1(firstAccessorInput as never)
    ).toThrow(TypeError);
    expect(firstRegistrarGetter).not.toHaveBeenCalled();
    expect(firstRegistrar).not.toHaveBeenCalled();
    expect(countingRouter.getRegistrationCount()).toBe(0);

    const first = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: authority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: firstRegistrar,
    });
    expect(firstRegistrar).toHaveBeenCalledOnce();
    expect(countingRouter.getRegistrationCount()).toBe(1);
    first.abortInternalV1();

    const alternateRegistrar = vi.fn(countingRouter.registerManagedInputHandler);
    const alternateRegistrarGetter = vi.fn(() => alternateRegistrar);
    const optionalRegistrarDescriptorRead = vi.fn();
    const alternateAccessorInput = new Proxy(
      Object.defineProperties({}, {
        authority: { enumerable: true, value: authority.authority },
        inputContextId: { enumerable: true, value: "overlay" },
        inputRouter: { enumerable: true, value: countingRouter.router },
        isGestureCurrent: { enumerable: true, value: () => true },
        registerManagedInputHandler: { enumerable: true, get: alternateRegistrarGetter },
      }),
      {
        getOwnPropertyDescriptor(target, property) {
          if (property === "registerManagedInputHandler") {
            optionalRegistrarDescriptorRead();
            throw new Error("later registrar descriptor must remain unread");
          }
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      },
    );
    const successor = prepareManagedSurfaceContractBoundActionBindingInternalV1(
      alternateAccessorInput as never,
    );
    const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1(),
    );
    expect(successor.commitInternalV1(token)).toBe(true);
    expect(optionalRegistrarDescriptorRead).not.toHaveBeenCalled();
    expect(alternateRegistrarGetter).not.toHaveBeenCalled();
    expect(alternateRegistrar).not.toHaveBeenCalled();
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("fails closed when the first registrar synchronously reenters the same router context", () => {
    const countingRouter = createCountingInputRouterV1();
    const outerAuthority = createContractBoundAuthorityV1();
    const nestedAuthority = createContractBoundAuthorityV1();
    let registrarCallCount = 0;
    let nestedError: unknown = null;
    const reentrantRegistrar: typeof registerManagedInputHandlerV1 = (router, registration) => {
      registrarCallCount += 1;
      if (registrarCallCount === 1) {
        try {
          prepareManagedSurfaceContractBoundActionBindingInternalV1({
            authority: nestedAuthority.authority,
            inputContextId: "overlay",
            inputRouter: countingRouter.router,
            isGestureCurrent: () => true,
            registerManagedInputHandler: reentrantRegistrar,
          });
        } catch (error) {
          nestedError = error;
        }
      }
      return countingRouter.registerManagedInputHandler(router, registration);
    };

    const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: outerAuthority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: reentrantRegistrar,
    });
    const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1(),
    );

    expect(prepared.commitInternalV1(token)).toBe(true);
    expect(nestedError).toBeInstanceOf(TypeError);
    expect((nestedError as TypeError).message).toBe(
      "ui.managed_surface_input_authority_conflict",
    );
    expect(registrarCallCount).toBe(1);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("poisons a context when its first registrar throws after registration without accumulating dispatchers", () => {
    const countingRouter = createCountingInputRouterV1();
    const firstAuthority = createContractBoundAuthorityV1();
    const sentinel = new Error("registrar failed after registration");
    const sideEffectingRegistrar: typeof registerManagedInputHandlerV1 = (
      router,
      registration,
    ) => {
      countingRouter.registerManagedInputHandler(router, registration);
      throw sentinel;
    };

    expect(() =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: firstAuthority.authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
        registerManagedInputHandler: sideEffectingRegistrar,
      })
    ).toThrowError("ui.managed_surface_input_authority_invalid");
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);

    const alternateRegistrar = vi.fn(countingRouter.registerManagedInputHandler);
    for (
      const authority of [
        createContractBoundAuthorityV1().authority,
        createContractBoundAuthorityV1().authority,
      ]
    ) {
      expect(() =>
        prepareManagedSurfaceContractBoundActionBindingInternalV1({
          authority,
          inputContextId: "overlay",
          inputRouter: countingRouter.router,
          isGestureCurrent: () => true,
          registerManagedInputHandler: alternateRegistrar,
        })
      ).toThrowError("ui.managed_surface_input_authority_conflict");
    }
    expect(alternateRegistrar).not.toHaveBeenCalled();
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getActiveRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("lets a preclaimed route dispose its inert preparation before commit", () => {
    const countingRouter = createCountingInputRouterV1();
    const authority = createContractBoundAuthorityV1();
    const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: authority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const claimed = claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
      prepared,
      vi.fn(),
    );
    const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1(),
    );

    claimed.disposeInternalV1();
    claimed.disposeInternalV1();
    expect(prepared.commitInternalV1(token)).toBe(false);
    expect(prepared.getBindingInternalV1()).toBeNull();

    const successor = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: authority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
    });
    expect(successor.commitInternalV1(token)).toBe(true);
    expect(successor.getBindingInternalV1()).not.toBeNull();
    expect(countingRouter.getRegistrationCount()).toBe(1);
  });

  it("keeps independent current bindings and stable dispatchers per router input context", () => {
    const countingRouter = createCountingInputRouterV1();
    const overlayAuthority = createContractBoundAuthorityV1();
    const overlay = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: overlayAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const systemAuthority = createContractBoundAuthorityV1();
    const system = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: systemAuthority.authority,
      contract: inputBindingContractV1({
        inputContextId: "system",
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.system"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.system"),
      }),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const overlayEnvelope = overlay.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("context-overlay"),
    });
    const systemEnvelope = system.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("context-system"),
    });

    expect(overlay.route(overlayEnvelope)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(system.route(systemEnvelope)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(countingRouter.getRegistrationCount()).toBe(2);

    const overlaySuccessorAuthority = createContractBoundAuthorityV1();
    const overlaySuccessor = prepareManagedSurfaceContractBoundActionBindingInternalV1({
      authority: overlaySuccessorAuthority.authority,
      inputContextId: "overlay",
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: vi.fn(countingRouter.registerManagedInputHandler),
    });
    expect(overlaySuccessor.commitInternalV1(
      captureManagedSurfacePreparedInputBindingContractInternalV1(
        inputBindingContractV1({
          surfaceInstanceId: parseManagedSurfaceInstanceIdV1(
            "surface-instance.e4.overlay-successor",
          ),
          routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1(
            "surface-lease.e4.overlay-successor",
          ),
          topologyRevision: parseNonNegativeSafeInteger(2),
        }),
      ),
    )).toBe(true);
    expect(overlay.route(overlayEnvelope)).toMatchObject({
      input: { code: "input.stale_publication" },
      surface: null,
    });
    expect(system.route(systemEnvelope)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });
    expect(countingRouter.getRegistrationCount()).toBe(2);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });

  it("enforces exact prepared input descriptors and one preclaim with receiver fencing", () => {
    const countingRouter = createCountingInputRouterV1();
    const authority = createContractBoundAuthorityV1();
    createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: authority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const candidateAuthority = createContractBoundAuthorityV1();
    const baseInput = {
      authority: candidateAuthority.authority,
      inputContextId: "overlay" as const,
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
    };
    expect(() =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        ...baseInput,
        extra: true,
      } as never)
    ).toThrow(TypeError);
    expect(() =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority: baseInput.authority,
        inputContextId: baseInput.inputContextId,
        inputRouter: baseInput.inputRouter,
      } as never)
    ).toThrow(TypeError);

    const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1(baseInput);
    const claimed = claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(
      prepared,
      vi.fn(() => "claimed"),
    );
    expect(() => claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(prepared, vi.fn()))
      .toThrowError("ui.managed_surface_action_route_claim_invalid");
    const token = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.claimed"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.claimed"),
        topologyRevision: parseNonNegativeSafeInteger(2),
      }),
    );
    expect(prepared.commitInternalV1(token)).toBe(true);
    const binding = prepared.getBindingInternalV1()!;
    const envelope = binding.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-borrowed-claim"),
    });
    expect(() => Reflect.apply(claimed.routeInternalV1, {}, [envelope, {}])).toThrowError(
      "ui.managed_surface_action_route_claim_invalid",
    );

    const aborted = prepareManagedSurfaceContractBoundActionBindingInternalV1(baseInput);
    aborted.abortInternalV1();
    expect(() => claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1(aborted, vi.fn()))
      .toThrowError("ui.managed_surface_action_route_claim_invalid");
  });

  it("rejects contract-token context, authority-use, and expected-current drift without publication", () => {
    const countingRouter = createCountingInputRouterV1();
    const currentAuthority = createContractBoundAuthorityV1();
    const current = createManagedSurfaceContractBoundActionBindingInternalV1({
      authority: currentAuthority.authority,
      contract: inputBindingContractV1(),
      inputRouter: countingRouter.router,
      isGestureCurrent: () => true,
      registerManagedInputHandler: countingRouter.registerManagedInputHandler,
    });
    const queued = current.createEnvelope({
      actionId: activateActionIdV1,
      gestureId: gestureV1("prepared-drift-current"),
    });
    const authorityA = createContractBoundAuthorityV1();
    const authorityB = createContractBoundAuthorityV1();
    const prepareFor = (
      authority: ReturnType<typeof createContractBoundAuthorityV1>["authority"],
    ) =>
      prepareManagedSurfaceContractBoundActionBindingInternalV1({
        authority,
        inputContextId: "overlay",
        inputRouter: countingRouter.router,
        isGestureCurrent: () => true,
      });
    const wrongContext = prepareFor(authorityA.authority);
    const systemToken = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({ inputContextId: "system" }),
    );
    expect(wrongContext.commitInternalV1(systemToken)).toBe(false);
    expect(current.route(queued)).toMatchObject({
      surface: { kind: "unchanged", code: "surface.action_routed" },
    });

    const preparationA = prepareFor(authorityA.authority);
    const preparationB = prepareFor(authorityB.authority);
    const tokenA = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.drift-a"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.drift-a"),
        topologyRevision: parseNonNegativeSafeInteger(3),
      }),
    );
    const tokenB = captureManagedSurfacePreparedInputBindingContractInternalV1(
      inputBindingContractV1({
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e4.drift-b"),
        routingLeaseId: parseManagedSurfaceRoutingLeaseIdV1("surface-lease.e4.drift-b"),
        topologyRevision: parseNonNegativeSafeInteger(4),
      }),
    );
    expect(preparationA.commitInternalV1(tokenA)).toBe(true);
    expect(preparationB.commitInternalV1(tokenB)).toBe(false);
    const foreignAuthorityAttempt = prepareFor(authorityB.authority);
    expect(foreignAuthorityAttempt.commitInternalV1(tokenA)).toBe(false);
    expect(countingRouter.getRegistrationCount()).toBe(1);
    expect(countingRouter.getUnregistrationCount()).toBe(0);
  });
});
