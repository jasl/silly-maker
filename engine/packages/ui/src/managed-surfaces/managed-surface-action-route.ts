// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputContextIdV1,
  type InputRouteResultV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { registerManagedInputHandlerV1 } from "../input/input-router.ts";
import {
  type ManagedSurfaceActionEnvelopeV1,
  type ManagedSurfaceActionIdV1,
  type ManagedSurfaceGestureIdV1,
  type ManagedSurfaceInputPublicationRevisionV1,
  type ManagedSurfaceInstanceIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceRouteActionInputV1,
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
  readonly registerManagedInputHandler?: typeof registerManagedInputHandlerV1;
}

export interface ManagedSurfaceContractBoundActionRouteAuthorityInternalV1 {
  routeActionInternalV1(
    input: ManagedSurfaceRouteActionInputV1,
  ): ManagedSurfaceTransitionReceiptV1;
}

export interface CreateManagedSurfaceContractBoundActionBindingInputInternalV1 {
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  readonly contract: ManagedSurfaceInputBindingContractV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
  readonly registerManagedInputHandler?: typeof registerManagedInputHandlerV1;
}

export interface ManagedSurfaceAuthenticatedActionRouteResultInternalV1<TResult> {
  readonly route: ManagedSurfaceActionRouteResultV1;
  readonly consumerResult: TResult | null;
}

export interface ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> {
  routeInternalV1(
    envelope: ManagedSurfaceActionEnvelopeV1,
    attempt: TAttempt,
  ): ManagedSurfaceAuthenticatedActionRouteResultInternalV1<TResult>;
  disposeInternalV1(): void;
}

export interface ManagedSurfaceInputBindingContractV1 {
  readonly applicationEpoch: ManagedSurfaceActionEnvelopeV1["applicationEpoch"];
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly inputContextId: InputContextIdV1;
  readonly routingLeaseId: ManagedSurfaceRoutingLeaseIdV1;
  readonly actionIds: readonly ManagedSurfaceActionIdV1[];
  readonly topologyRevision: ManagedSurfaceActionEnvelopeV1["surfaceTopologyRevision"];
}

export function equalManagedSurfaceInputBindingContractV1(
  left: ManagedSurfaceInputBindingContractV1,
  right: ManagedSurfaceInputBindingContractV1,
): boolean {
  return left.applicationEpoch === right.applicationEpoch &&
    left.ownerId === right.ownerId &&
    left.surfaceInstanceId === right.surfaceInstanceId &&
    left.inputContextId === right.inputContextId &&
    left.routingLeaseId === right.routingLeaseId &&
    left.topologyRevision === right.topologyRevision &&
    left.actionIds.length === right.actionIds.length &&
    left.actionIds.every((actionId, index) => actionId === right.actionIds[index]);
}

interface RouterBindingStateV1 {
  revision: number;
  current: ManagedSurfaceActionBindingRecordV1 | null;
}

interface ManagedSurfaceActionBindingRecordV1 {
  readonly revision: ManagedSurfaceInputPublicationRevisionV1;
  readonly contract: ManagedSurfaceInputBindingContractV1;
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  readonly routeAction: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1[
    "routeActionInternalV1"
  ];
  isGestureCurrent: CreateManagedSurfaceContractBoundActionBindingInputInternalV1[
    "isGestureCurrent"
  ];
  readonly unregister: () => void;
  binding: ManagedSurfaceActionBindingV1 | null;
  claimedRoute: ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 | null;
  routeWithClaim:
    | ((
      envelope: ManagedSurfaceActionEnvelopeV1,
      invocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 | null,
    ) => ManagedSurfaceActionRouteResultV1)
    | null;
  active: boolean;
}

interface ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 {
  readonly consume: (attempt: unknown) => unknown;
  active: boolean;
  routeInProgress: boolean;
}

interface ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 {
  readonly claim: ManagedSurfaceAuthenticatedActionClaimRecordInternalV1;
  readonly attempt: unknown;
  invoked: boolean;
  result: unknown;
}

interface ManagedSurfaceDispatchContextV1 {
  readonly binding: ManagedSurfaceActionBindingRecordV1;
  readonly envelope: ManagedSurfaceActionEnvelopeV1;
  surface: ManagedSurfaceTransitionReceiptV1 | null;
  inputFailure: "input.stale_publication" | "input.stale_gesture" | null;
  readonly claimInvocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 | null;
}

const routerBindingStatesV1 = new WeakMap<InputRouterV1, RouterBindingStateV1>();
const managedDispatchesV1 = new WeakMap<object, ManagedSurfaceDispatchContextV1>();
const bindingRecordsV1 = new WeakMap<
  ManagedSurfaceActionBindingV1,
  ManagedSurfaceActionBindingRecordV1
>();
const coordinatorAuthoritiesV1 = new WeakMap<
  ManagedSurfaceCoordinatorV1,
  ManagedSurfaceContractBoundActionRouteAuthorityInternalV1
>();
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

export function createManagedSurfaceContractBoundActionBindingInternalV1(
  input: CreateManagedSurfaceContractBoundActionBindingInputInternalV1,
): ManagedSurfaceActionBindingV1 {
  const contract = input.contract;
  const authority = input.authority;
  const routeAction = authority.routeActionInternalV1;
  if (typeof routeAction !== "function") {
    throw new TypeError("ui.managed_surface_input_authority_invalid");
  }
  const registerManagedInputHandler = input.registerManagedInputHandler ??
    registerManagedInputHandlerV1;

  let routerState = routerBindingStatesV1.get(input.inputRouter);
  if (routerState === undefined) {
    routerState = { revision: 0, current: null };
    routerBindingStatesV1.set(input.inputRouter, routerState);
  }
  const retained = routerState.current;
  if (
    retained !== null &&
    retained.active &&
    retained.binding !== null &&
    equalManagedSurfaceInputBindingContractV1(retained.contract, contract)
  ) {
    if (retained.authority !== authority) {
      throw new TypeError("ui.managed_surface_input_authority_conflict");
    }
    retained.isGestureCurrent = input.isGestureCurrent;
    return retained.binding;
  }
  const revision = allocateInputPublicationRevisionV1(routerState);
  const capturedRoutingLeaseId: ManagedSurfaceRoutingLeaseIdV1 = contract.routingLeaseId;
  const evidence = Object.freeze({
    applicationEpoch: contract.applicationEpoch,
    topologyRevision: contract.topologyRevision,
    surfaceInstanceId: contract.surfaceInstanceId,
  });

  let unregisterRegistrationV1 = (): void => {};
  const record: ManagedSurfaceActionBindingRecordV1 = {
    revision,
    contract,
    authority,
    routeAction,
    isGestureCurrent: input.isGestureCurrent,
    unregister: () => unregisterRegistrationV1(),
    binding: null,
    claimedRoute: null,
    routeWithClaim: null,
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

    const surface = Reflect.apply(record.routeAction, record.authority, [{
      evidence: {
        applicationEpoch: dispatch.envelope.applicationEpoch,
        topologyRevision: dispatch.envelope.surfaceTopologyRevision,
        surfaceInstanceId: dispatch.envelope.surfaceInstanceId,
      },
      actionId: dispatch.envelope.actionId,
      routingLeaseId: capturedRoutingLeaseId,
    }]) as ManagedSurfaceTransitionReceiptV1;
    dispatch.surface = surface;
    if (surface.kind !== "unchanged" || surface.code !== "surface.action_routed") {
      return inputHandledV1;
    }
    if (!isCurrentInputPublicationV1(dispatch.envelope)) {
      dispatch.surface = null;
      dispatch.inputFailure = "input.stale_publication";
      return inputHandledV1;
    }
    const gestureCurrent = record.isGestureCurrent(dispatch.envelope.gestureId);
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
    const claim = record.claimedRoute;
    if (claim !== null) {
      const invocation = dispatch.claimInvocation;
      if (claim.active && invocation?.claim === claim) {
        invocation.result = Reflect.apply(claim.consume, undefined, [invocation.attempt]);
        invocation.invoked = true;
      }
      return inputHandledV1;
    }
    return inputIgnoredV1;
  };
  const registerManagedGateV1 = (): () => void =>
    registerManagedInputHandler(input.inputRouter, {
      context: contract.inputContextId,
      handle: handleManagedEventV1,
    });
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

  const routeWithClaim = (
    rawEnvelope: ManagedSurfaceActionEnvelopeV1,
    claimInvocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 | null,
  ): ManagedSurfaceActionRouteResultV1 => {
    const envelope = parseEnvelopeV1(rawEnvelope);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(envelope.actionId),
    }) satisfies DeepReadonly<InputEventV1>;
    if (!isCurrentInputPublicationV1(envelope)) {
      return staleInputResultV1(envelope, "input.stale_publication");
    }
    const gestureCurrent = record.isGestureCurrent(envelope.gestureId);
    if (!isCurrentInputPublicationV1(envelope)) {
      return staleInputResultV1(envelope, "input.stale_publication");
    }
    if (!gestureCurrent) {
      return staleInputResultV1(envelope, "input.stale_gesture");
    }

    const dispatch: ManagedSurfaceDispatchContextV1 = {
      binding: record,
      envelope,
      surface: null,
      inputFailure: null,
      claimInvocation,
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
  record.routeWithClaim = routeWithClaim;

  const binding: ManagedSurfaceActionBindingV1 = Object.freeze({
    createEnvelope,
    route: (envelope: ManagedSurfaceActionEnvelopeV1) => routeWithClaim(envelope, null),
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
  record.binding = binding;
  bindingRecordsV1.set(binding, record);
  return binding;
}

export function claimManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult>(
  binding: ManagedSurfaceActionBindingV1,
  consume: (attempt: TAttempt) => TResult,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> {
  const record = bindingRecordsV1.get(binding);
  if (
    record === undefined || !record.active || record.binding !== binding ||
    record.claimedRoute !== null || typeof consume !== "function"
  ) {
    throw new TypeError("ui.managed_surface_action_route_claim_invalid");
  }
  const claim: ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 = {
    consume: consume as (attempt: unknown) => unknown,
    active: true,
    routeInProgress: false,
  };
  record.claimedRoute = claim;
  return Object.freeze({
    routeInternalV1(
      envelope: ManagedSurfaceActionEnvelopeV1,
      attempt: TAttempt,
    ): ManagedSurfaceAuthenticatedActionRouteResultInternalV1<TResult> {
      if (claim.routeInProgress) {
        throw new TypeError("ui.managed_surface_action_route_in_progress");
      }
      const routeWithClaim = record.routeWithClaim;
      if (routeWithClaim === null) {
        throw new TypeError("ui.managed_surface_action_route_claim_invalid");
      }
      const invocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 = {
        claim,
        attempt,
        invoked: false,
        result: null,
      };
      claim.routeInProgress = true;
      try {
        const route = routeWithClaim(envelope, invocation);
        return Object.freeze({
          route,
          consumerResult: invocation.invoked ? invocation.result as TResult : null,
        });
      } finally {
        claim.routeInProgress = false;
      }
    },
    disposeInternalV1(): void {
      if (!claim.active) return;
      claim.active = false;
      binding.dispose();
    },
  });
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
  const contract: ManagedSurfaceInputBindingContractV1 = Object.freeze({
    applicationEpoch: publication.applicationEpoch,
    ownerId: target.definition.ownerId,
    surfaceInstanceId: target.surfaceInstanceId,
    inputContextId: inputOwner.inputContextId,
    routingLeaseId: inputOwner.routingLeaseId,
    actionIds: Object.freeze([...target.definition.actionIds]),
    topologyRevision: publication.topologyRevision,
  });
  let authority = coordinatorAuthoritiesV1.get(input.coordinator);
  if (authority === undefined) {
    const coordinator = input.coordinator;
    const routeAction = coordinator.routeAction;
    authority = Object.freeze({
      routeActionInternalV1(request: ManagedSurfaceRouteActionInputV1) {
        return Reflect.apply(routeAction, coordinator, [request]);
      },
    });
    coordinatorAuthoritiesV1.set(coordinator, authority);
  }
  return createManagedSurfaceContractBoundActionBindingInternalV1({
    authority,
    contract,
    inputRouter: input.inputRouter,
    isGestureCurrent: input.isGestureCurrent,
    ...(input.registerManagedInputHandler === undefined
      ? {}
      : { registerManagedInputHandler: input.registerManagedInputHandler }),
  });
}
