// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputRouteResultV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import {
  type ManagedSurfaceActionEnvelopeV1,
  type ManagedSurfaceActionIdV1,
  type ManagedSurfaceGestureIdV1,
  type ManagedSurfaceInputPublicationRevisionV1,
  type ManagedSurfaceRoutingLeaseIdV1,
  type ManagedSurfaceTransitionReceiptV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
  parseManagedSurfaceInputPublicationRevisionV1,
  parseManagedSurfaceInstanceIdV1,
} from "./managed-surface-contracts.ts";
import type { ManagedSurfaceCoordinatorV1 } from "./managed-surface-coordinator.ts";

export type ManagedSurfaceInputRouteCodeV1 =
  | "input.managed_surface_consumed"
  | "input.managed_surface_unhandled"
  | "input.stale_publication"
  | "input.stale_gesture";

export interface ManagedSurfaceInputRouteReceiptV1 {
  readonly kind: "consumed" | "unhandled";
  readonly code: ManagedSurfaceInputRouteCodeV1;
  readonly gestureId: ManagedSurfaceGestureIdV1;
  readonly inputPublicationRevision: ManagedSurfaceInputPublicationRevisionV1;
}

export interface ManagedSurfaceActionRouteResultV1 {
  readonly input: ManagedSurfaceInputRouteReceiptV1;
  readonly surface: ManagedSurfaceTransitionReceiptV1 | null;
}

export interface ManagedSurfaceActionBindingV1 {
  createEnvelope(input: {
    readonly actionId: ManagedSurfaceActionIdV1;
    readonly gestureId: ManagedSurfaceGestureIdV1;
  }): ManagedSurfaceActionEnvelopeV1;
  route(envelope: ManagedSurfaceActionEnvelopeV1): ManagedSurfaceActionRouteResultV1;
  dispose(): void;
}

export interface CreateManagedSurfaceActionBindingInputV1 {
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

interface RouterBindingStateV1 {
  revision: number;
  current: ManagedSurfaceActionBindingRecordV1 | null;
}

interface ManagedSurfaceActionBindingRecordV1 {
  readonly revision: ManagedSurfaceInputPublicationRevisionV1;
  readonly unregister: () => void;
  active: boolean;
}

interface ManagedSurfaceDispatchContextV1 {
  readonly binding: ManagedSurfaceActionBindingRecordV1;
  readonly envelope: ManagedSurfaceActionEnvelopeV1;
  surface: ManagedSurfaceTransitionReceiptV1 | null;
  inputFailure: "input.stale_publication" | "input.stale_gesture" | null;
}

const routerBindingStatesV1 = new WeakMap<InputRouterV1, RouterBindingStateV1>();
const managedDispatchesV1 = new WeakMap<object, ManagedSurfaceDispatchContextV1>();
const envelopeKeysV1 = Object.freeze(
  [
    "applicationEpoch",
    "surfaceInstanceId",
    "surfaceTopologyRevision",
    "actionId",
    "gestureId",
    "inputPublicationRevision",
  ] as const,
);

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeysV1(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Reflect.ownKeys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((expectedKey) => Object.hasOwn(value, expectedKey))
  );
}

function parseEnvelopeV1(value: unknown): ManagedSurfaceActionEnvelopeV1 {
  try {
    if (!isRecordV1(value) || !hasExactOwnKeysV1(value, envelopeKeysV1)) {
      throw new TypeError();
    }
    return Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(value.applicationEpoch),
      surfaceInstanceId: parseManagedSurfaceInstanceIdV1(value.surfaceInstanceId),
      surfaceTopologyRevision: parseNonNegativeSafeInteger(value.surfaceTopologyRevision),
      actionId: parseManagedSurfaceActionIdV1(value.actionId),
      gestureId: parseManagedSurfaceGestureIdV1(value.gestureId),
      inputPublicationRevision: parseManagedSurfaceInputPublicationRevisionV1(
        value.inputPublicationRevision,
      ),
    });
  } catch {
    throw new TypeError("ui.invalid_managed_surface_action_envelope");
  }
}

function allocateInputPublicationRevisionV1(
  state: RouterBindingStateV1,
): ManagedSurfaceInputPublicationRevisionV1 {
  const revision = parseNonNegativeSafeInteger(state.revision + 1);
  state.revision = revision;
  return parseManagedSurfaceInputPublicationRevisionV1(revision);
}

function inputReceiptV1(
  kind: ManagedSurfaceInputRouteReceiptV1["kind"],
  code: ManagedSurfaceInputRouteCodeV1,
  envelope: ManagedSurfaceActionEnvelopeV1,
): ManagedSurfaceInputRouteReceiptV1 {
  return Object.freeze({
    kind,
    code,
    gestureId: envelope.gestureId,
    inputPublicationRevision: envelope.inputPublicationRevision,
  });
}

function routeResultV1(
  input: ManagedSurfaceInputRouteReceiptV1,
  surface: ManagedSurfaceTransitionReceiptV1 | null,
): ManagedSurfaceActionRouteResultV1 {
  return Object.freeze({ input, surface });
}

function routedInputReceiptV1(
  route: InputRouteResultV1,
  envelope: ManagedSurfaceActionEnvelopeV1,
): ManagedSurfaceInputRouteReceiptV1 {
  return route.kind === "handled"
    ? inputReceiptV1("consumed", "input.managed_surface_consumed", envelope)
    : inputReceiptV1("unhandled", "input.managed_surface_unhandled", envelope);
}

function staleInputResultV1(
  envelope: ManagedSurfaceActionEnvelopeV1,
  code: "input.stale_publication" | "input.stale_gesture",
): ManagedSurfaceActionRouteResultV1 {
  return routeResultV1(inputReceiptV1("consumed", code, envelope), null);
}

export function createManagedSurfaceActionBindingV1(
  input: CreateManagedSurfaceActionBindingInputV1,
): ManagedSurfaceActionBindingV1 {
  const publication = input.coordinator.getSnapshot();
  const inputOwner = publication.inputOwner;
  if (inputOwner === null) {
    throw new TypeError("ui.managed_surface_input_owner_required");
  }
  const target = publication.orderedInstances.find(
    (instance) => instance.surfaceInstanceId === inputOwner.surfaceInstanceId,
  );
  if (target === undefined) {
    throw new TypeError("ui.managed_surface_input_owner_required");
  }

  let routerState = routerBindingStatesV1.get(input.inputRouter);
  if (routerState === undefined) {
    routerState = { revision: 0, current: null };
    routerBindingStatesV1.set(input.inputRouter, routerState);
  }
  const revision = allocateInputPublicationRevisionV1(routerState);
  const capturedRoutingLeaseId: ManagedSurfaceRoutingLeaseIdV1 = inputOwner.routingLeaseId;
  const evidence = Object.freeze({
    applicationEpoch: publication.applicationEpoch,
    topologyRevision: publication.topologyRevision,
    surfaceInstanceId: target.surfaceInstanceId,
  });

  let unregisterRegistrationV1 = (): void => {};
  const record: ManagedSurfaceActionBindingRecordV1 = {
    revision,
    unregister: () => unregisterRegistrationV1(),
    active: true,
  };
  const isCurrentInputPublicationV1 = (envelope: ManagedSurfaceActionEnvelopeV1): boolean =>
    record.active &&
    routerState?.current === record &&
    envelope.inputPublicationRevision === record.revision;
  const handleManagedEventV1 = (event: DeepReadonly<InputEventV1>) => {
    if (event.kind !== "action") return inputIgnoredV1;
    const dispatch = managedDispatchesV1.get(event);
    if (dispatch === undefined || dispatch.binding !== record) return inputIgnoredV1;

    const surface = input.coordinator.routeAction({
      evidence: {
        applicationEpoch: dispatch.envelope.applicationEpoch,
        topologyRevision: dispatch.envelope.surfaceTopologyRevision,
        surfaceInstanceId: dispatch.envelope.surfaceInstanceId,
      },
      actionId: dispatch.envelope.actionId,
      routingLeaseId: capturedRoutingLeaseId,
    });
    dispatch.surface = surface;
    if (surface.kind !== "unchanged" || surface.code !== "surface.action_routed") {
      return inputHandledV1;
    }
    if (!isCurrentInputPublicationV1(dispatch.envelope)) {
      dispatch.surface = null;
      dispatch.inputFailure = "input.stale_publication";
      return inputHandledV1;
    }
    const gestureCurrent = input.isGestureCurrent(dispatch.envelope.gestureId);
    if (!isCurrentInputPublicationV1(dispatch.envelope)) {
      dispatch.surface = null;
      dispatch.inputFailure = "input.stale_publication";
      return inputHandledV1;
    }
    if (!gestureCurrent) {
      dispatch.surface = null;
      dispatch.inputFailure = "input.stale_gesture";
      return inputHandledV1;
    }
    return inputIgnoredV1;
  };
  const registerManagedGateV1 = (): () => void =>
    input.inputRouter.register({
      context: inputOwner.inputContextId,
      handle: handleManagedEventV1,
    });
  const refreshManagedGateV1 = (): void => {
    unregisterRegistrationV1();
    unregisterRegistrationV1 = registerManagedGateV1();
  };
  unregisterRegistrationV1 = registerManagedGateV1();
  const previous = routerState.current;
  routerState.current = record;
  if (previous !== null) {
    previous.active = false;
    previous.unregister();
  }

  const createEnvelope = (request: {
    readonly actionId: ManagedSurfaceActionIdV1;
    readonly gestureId: ManagedSurfaceGestureIdV1;
  }): ManagedSurfaceActionEnvelopeV1 =>
    Object.freeze({
      applicationEpoch: evidence.applicationEpoch,
      surfaceInstanceId: evidence.surfaceInstanceId,
      surfaceTopologyRevision: evidence.topologyRevision,
      actionId: parseManagedSurfaceActionIdV1(request.actionId),
      gestureId: parseManagedSurfaceGestureIdV1(request.gestureId),
      inputPublicationRevision: revision,
    });

  const route = (
    rawEnvelope: ManagedSurfaceActionEnvelopeV1,
  ): ManagedSurfaceActionRouteResultV1 => {
    const envelope = parseEnvelopeV1(rawEnvelope);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(envelope.actionId),
    }) satisfies DeepReadonly<InputEventV1>;
    if (!isCurrentInputPublicationV1(envelope)) {
      return staleInputResultV1(envelope, "input.stale_publication");
    }
    const gestureCurrent = input.isGestureCurrent(envelope.gestureId);
    if (!isCurrentInputPublicationV1(envelope)) {
      return staleInputResultV1(envelope, "input.stale_publication");
    }
    if (!gestureCurrent) {
      return staleInputResultV1(envelope, "input.stale_gesture");
    }

    refreshManagedGateV1();
    const dispatch: ManagedSurfaceDispatchContextV1 = {
      binding: record,
      envelope,
      surface: null,
      inputFailure: null,
    };
    managedDispatchesV1.set(event, dispatch);
    try {
      const inputRoute = input.inputRouter.route(event);
      if (dispatch.inputFailure !== null) {
        return staleInputResultV1(envelope, dispatch.inputFailure);
      }
      return routeResultV1(routedInputReceiptV1(inputRoute, envelope), dispatch.surface);
    } finally {
      managedDispatchesV1.delete(event);
    }
  };

  return Object.freeze({
    createEnvelope,
    route,
    dispose(): void {
      if (!record.active) return;
      record.active = false;
      record.unregister();
      if (routerState?.current === record) {
        routerState.current = null;
        allocateInputPublicationRevisionV1(routerState);
      }
    },
  });
}
