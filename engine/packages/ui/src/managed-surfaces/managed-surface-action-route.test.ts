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
  claimManagedSurfaceAuthenticatedActionRouteInternalV1,
  createManagedSurfaceActionBindingV1,
  createManagedSurfaceContractBoundActionBindingInternalV1,
  equalManagedSurfaceInputBindingContractV1,
  type ManagedSurfaceActionBindingV1,
  type ManagedSurfaceInputBindingContractV1,
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
    expect(countingRouter.getActiveRegistrationCount()).toBe(0);
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
});
