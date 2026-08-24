// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

import {
  inputHandledV1,
  inputIgnoredV1,
  type InputActionIdV1,
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

export interface ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<TAttempt> {
  readonly actionId: ManagedSurfaceActionIdV1;
  readonly attempt: TAttempt;
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

declare const managedSurfacePreparedInputBindingContractBrandInternalV1: unique symbol;

export interface ManagedSurfacePreparedInputBindingContractInternalV1 {
  readonly [managedSurfacePreparedInputBindingContractBrandInternalV1]: true;
}

export interface PrepareManagedSurfaceContractBoundActionBindingInputInternalV1 {
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  readonly inputContextId: InputContextIdV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
  readonly registerManagedInputHandler?: typeof registerManagedInputHandlerV1;
}

export interface ManagedSurfacePreparedContractBoundActionBindingInternalV1 {
  commitInternalV1(
    contract: ManagedSurfacePreparedInputBindingContractInternalV1,
  ): boolean;
  abortInternalV1(): void;
  getBindingInternalV1(): ManagedSurfaceActionBindingV1 | null;
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

type ManagedSurfacePreparedSlotInternalV1 = "first" | "second";
type ManagedSurfaceActionBindingPhaseInternalV1 =
  | "prepared"
  | "current"
  | "retired"
  | "aborted";

interface RouterBindingStateV1 {
  revision: number;
  readonly contexts: Map<InputContextIdV1, ManagedSurfaceContextBindingStateInternalV1>;
}

interface ManagedSurfaceContextBindingStateInternalV1 {
  readonly inputContextId: InputContextIdV1;
  dispatcherReady: boolean;
  current: ManagedSurfaceActionBindingRecordV1 | null;
  preparedFirst: ManagedSurfaceActionBindingRecordV1 | null;
  preparedSecond: ManagedSurfaceActionBindingRecordV1 | null;
}

interface ManagedSurfaceActionBindingRecordV1 {
  readonly routerState: RouterBindingStateV1;
  readonly contextState: ManagedSurfaceContextBindingStateInternalV1;
  readonly inputRouter: InputRouterV1;
  readonly revision: ManagedSurfaceInputPublicationRevisionV1;
  contract: ManagedSurfaceInputBindingContractV1 | null;
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  isGestureCurrent: CreateManagedSurfaceContractBoundActionBindingInputInternalV1[
    "isGestureCurrent"
  ];
  expectedCurrent: ManagedSurfaceActionBindingRecordV1 | null;
  readonly preparedSlot: ManagedSurfacePreparedSlotInternalV1;
  binding: ManagedSurfaceActionBindingV1 | null;
  preparedHandle: ManagedSurfacePreparedContractBoundActionBindingInternalV1 | null;
  claimedRoute: ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 | null;
  routeWithClaim:
    | ((
      envelope: ManagedSurfaceActionEnvelopeV1,
      invocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 | null,
    ) => ManagedSurfaceActionRouteResultV1)
    | null;
  phase: ManagedSurfaceActionBindingPhaseInternalV1;
  committed: boolean;
  commitAttempted: boolean;
}

interface ManagedSurfacePreparedInputBindingContractRecordInternalV1 {
  readonly contract: ManagedSurfaceInputBindingContractV1;
  consumed: boolean;
}

interface ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 {
  readonly consume: (
    input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<unknown>,
  ) => unknown;
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
  gateEntered: boolean;
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
const preparedBindingRecordsV1 = new WeakMap<
  ManagedSurfacePreparedContractBoundActionBindingInternalV1,
  ManagedSurfaceActionBindingRecordV1
>();
const preparedInputBindingContractRecordsV1 = new WeakMap<
  ManagedSurfacePreparedInputBindingContractInternalV1,
  ManagedSurfacePreparedInputBindingContractRecordInternalV1
>();
const coordinatorAuthoritiesV1 = new WeakMap<
  ManagedSurfaceCoordinatorV1,
  ManagedSurfaceContractBoundActionRouteAuthorityInternalV1
>();

export function captureManagedSurfacePreparedInputBindingContractInternalV1(
  contract: ManagedSurfaceInputBindingContractV1,
): ManagedSurfacePreparedInputBindingContractInternalV1 {
  const token = {} as ManagedSurfacePreparedInputBindingContractInternalV1;
  preparedInputBindingContractRecordsV1.set(token, {
    contract,
    consumed: false,
  });
  return token;
}

interface CapturedPrepareManagedSurfaceContractBoundActionBindingInputInternalV1 {
  readonly authority: ManagedSurfaceContractBoundActionRouteAuthorityInternalV1;
  readonly inputContextId: InputContextIdV1;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
  readonly registerManagedInputHandler: typeof registerManagedInputHandlerV1;
}

function capturePrepareManagedSurfaceContractBoundActionBindingInputInternalV1(
  input: PrepareManagedSurfaceContractBoundActionBindingInputInternalV1,
): CapturedPrepareManagedSurfaceContractBoundActionBindingInputInternalV1 {
  return {
    authority: input.authority,
    inputContextId: input.inputContextId,
    inputRouter: input.inputRouter,
    isGestureCurrent: input.isGestureCurrent,
    registerManagedInputHandler: input.registerManagedInputHandler ??
      registerManagedInputHandlerV1,
  };
}

function allocateInputPublicationRevisionV1(
  state: RouterBindingStateV1,
): ManagedSurfaceInputPublicationRevisionV1 {
  const revision = state.revision + 1;
  if (!Number.isSafeInteger(revision)) {
    throw new RangeError("ui.managed_surface_input_publication_revision_exhausted");
  }
  state.revision = revision;
  return revision as ManagedSurfaceInputPublicationRevisionV1;
}

function inputReceiptV1(
  kind: ManagedSurfaceInputRouteReceiptV1["kind"],
  code: ManagedSurfaceInputRouteCodeV1,
  envelope: ManagedSurfaceActionEnvelopeV1,
): ManagedSurfaceInputRouteReceiptV1 {
  return {
    kind,
    code,
    gestureId: envelope.gestureId,
    inputPublicationRevision: envelope.inputPublicationRevision,
  };
}

function routeResultV1(
  input: ManagedSurfaceInputRouteReceiptV1,
  surface: ManagedSurfaceTransitionReceiptV1 | null,
): ManagedSurfaceActionRouteResultV1 {
  return { input, surface };
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

function isCurrentInputPublicationInternalV1(
  record: ManagedSurfaceActionBindingRecordV1,
  envelope: ManagedSurfaceActionEnvelopeV1,
): boolean {
  return record.phase === "current" &&
    record.contextState.current === record &&
    envelope.inputPublicationRevision === record.revision;
}

function handleManagedContextEventInternalV1(
  contextState: ManagedSurfaceContextBindingStateInternalV1,
  event: DeepReadonly<InputEventV1>,
) {
  if (event.kind !== "action") return inputIgnoredV1;
  const dispatch = managedDispatchesV1.get(event);
  const record = dispatch?.binding ?? null;
  if (
    dispatch === undefined || record === null || record.contextState !== contextState ||
    record.contract === null
  ) {
    return inputIgnoredV1;
  }
  if (dispatch.gateEntered) return inputHandledV1;
  dispatch.gateEntered = true;

  const surface = record.authority.routeActionInternalV1({
    evidence: {
      applicationEpoch: dispatch.envelope.applicationEpoch,
      topologyRevision: dispatch.envelope.surfaceTopologyRevision,
      surfaceInstanceId: dispatch.envelope.surfaceInstanceId,
    },
    actionId: dispatch.envelope.actionId,
    routingLeaseId: record.contract.routingLeaseId,
  });
  dispatch.surface = surface;
  if (surface.kind !== "unchanged" || surface.code !== "surface.action_routed") {
    return inputHandledV1;
  }
  if (!isCurrentInputPublicationInternalV1(record, dispatch.envelope)) {
    dispatch.surface = null;
    dispatch.inputFailure = "input.stale_publication";
    return inputHandledV1;
  }
  const gestureCurrent = record.isGestureCurrent(dispatch.envelope.gestureId);
  if (!isCurrentInputPublicationInternalV1(record, dispatch.envelope)) {
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
    if (claim.active && invocation?.claim === claim && !invocation.invoked) {
      const continuationInput = {
        actionId: dispatch.envelope.actionId,
        attempt: invocation.attempt,
      } satisfies ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<unknown>;
      invocation.invoked = true;
      invocation.result = claim.consume(continuationInput);
    }
    return inputHandledV1;
  }
  return inputIgnoredV1;
}

function routerBindingStateInternalV1(inputRouter: InputRouterV1): RouterBindingStateV1 {
  let state = routerBindingStatesV1.get(inputRouter);
  if (state === undefined) {
    state = { revision: 0, contexts: new Map() };
    routerBindingStatesV1.set(inputRouter, state);
  }
  return state;
}

function contextBindingStateInternalV1(
  routerState: RouterBindingStateV1,
  captured: CapturedPrepareManagedSurfaceContractBoundActionBindingInputInternalV1,
): ManagedSurfaceContextBindingStateInternalV1 {
  const retained = routerState.contexts.get(captured.inputContextId);
  if (retained !== undefined) {
    if (!retained.dispatcherReady) {
      throw new TypeError("ui.managed_surface_input_authority_conflict");
    }
    return retained;
  }

  const contextState: ManagedSurfaceContextBindingStateInternalV1 = {
    inputContextId: captured.inputContextId,
    dispatcherReady: false,
    current: null,
    preparedFirst: null,
    preparedSecond: null,
  };
  routerState.contexts.set(captured.inputContextId, contextState);
  try {
    captured.registerManagedInputHandler(captured.inputRouter, {
      context: captured.inputContextId,
      handle: (event) => handleManagedContextEventInternalV1(contextState, event),
    });
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "ui.managed_surface_input_authority_invalid"
    ) {
      throw error;
    }
    throw new TypeError("ui.managed_surface_input_authority_invalid", {
      cause: error,
    });
  }
  contextState.dispatcherReady = true;
  return contextState;
}

function clearPreparedSlotInternalV1(record: ManagedSurfaceActionBindingRecordV1): void {
  if (
    record.preparedSlot === "first" &&
    record.contextState.preparedFirst === record
  ) {
    record.contextState.preparedFirst = null;
  } else if (
    record.preparedSlot === "second" &&
    record.contextState.preparedSecond === record
  ) {
    record.contextState.preparedSecond = null;
  }
}

function abortPreparedBindingRecordInternalV1(
  record: ManagedSurfaceActionBindingRecordV1,
): void {
  if (record.phase !== "prepared") return;
  clearPreparedSlotInternalV1(record);
  record.expectedCurrent = null;
  record.phase = "aborted";
  record.commitAttempted = true;
  if (record.claimedRoute !== null) record.claimedRoute.active = false;
}

function retireCurrentBindingRecordInternalV1(
  record: ManagedSurfaceActionBindingRecordV1,
): void {
  if (record.phase === "prepared") {
    abortPreparedBindingRecordInternalV1(record);
    return;
  }
  if (record.phase !== "current") return;
  record.phase = "retired";
  if (record.contextState.current === record) {
    record.contextState.current = null;
    allocateInputPublicationRevisionV1(record.routerState);
  }
  if (record.claimedRoute !== null) record.claimedRoute.active = false;
}

function routeWithBindingRecordInternalV1(
  record: ManagedSurfaceActionBindingRecordV1,
  envelope: ManagedSurfaceActionEnvelopeV1,
  claimInvocation: ManagedSurfaceAuthenticatedActionClaimInvocationInternalV1 | null,
): ManagedSurfaceActionRouteResultV1 {
  const event = {
    kind: "action" as const,
    actionId: envelope.actionId as unknown as InputActionIdV1,
  } satisfies DeepReadonly<InputEventV1>;
  if (!isCurrentInputPublicationInternalV1(record, envelope)) {
    return staleInputResultV1(envelope, "input.stale_publication");
  }
  const gestureCurrent = record.isGestureCurrent(envelope.gestureId);
  if (!isCurrentInputPublicationInternalV1(record, envelope)) {
    return staleInputResultV1(envelope, "input.stale_publication");
  }
  if (!gestureCurrent) {
    return staleInputResultV1(envelope, "input.stale_gesture");
  }

  const dispatch: ManagedSurfaceDispatchContextV1 = {
    binding: record,
    envelope,
    gateEntered: false,
    surface: null,
    inputFailure: null,
    claimInvocation,
  };
  managedDispatchesV1.set(event, dispatch);
  try {
    const inputRoute = record.inputRouter.route(event);
    if (dispatch.inputFailure !== null) {
      return staleInputResultV1(envelope, dispatch.inputFailure);
    }
    return routeResultV1(routedInputReceiptV1(inputRoute, envelope), dispatch.surface);
  } finally {
    managedDispatchesV1.delete(event);
  }
}

function createPreparedBindingRecordInternalV1(
  captured: CapturedPrepareManagedSurfaceContractBoundActionBindingInputInternalV1,
  routerState: RouterBindingStateV1,
  contextState: ManagedSurfaceContextBindingStateInternalV1,
  preparedSlot: ManagedSurfacePreparedSlotInternalV1,
): ManagedSurfacePreparedContractBoundActionBindingInternalV1 {
  const record: ManagedSurfaceActionBindingRecordV1 = {
    routerState,
    contextState,
    inputRouter: captured.inputRouter,
    revision: allocateInputPublicationRevisionV1(routerState),
    contract: null,
    authority: captured.authority,
    isGestureCurrent: captured.isGestureCurrent,
    expectedCurrent: contextState.current,
    preparedSlot,
    binding: null,
    preparedHandle: null,
    claimedRoute: null,
    routeWithClaim: null,
    phase: "prepared",
    committed: false,
    commitAttempted: false,
  };
  const binding: ManagedSurfaceActionBindingV1 = {
    createEnvelope(request: {
      readonly actionId: ManagedSurfaceActionIdV1;
      readonly gestureId: ManagedSurfaceGestureIdV1;
    }): ManagedSurfaceActionEnvelopeV1 {
      const contract = record.contract;
      if (contract === null) {
        throw new TypeError("ui.managed_surface_action_route_claim_invalid");
      }
      return {
        applicationEpoch: contract.applicationEpoch,
        surfaceInstanceId: contract.surfaceInstanceId,
        surfaceTopologyRevision: contract.topologyRevision,
        actionId: request.actionId,
        gestureId: request.gestureId,
        inputPublicationRevision: record.revision,
      };
    },
    route(envelope: ManagedSurfaceActionEnvelopeV1): ManagedSurfaceActionRouteResultV1 {
      return routeWithBindingRecordInternalV1(record, envelope, null);
    },
    dispose(): void {
      retireCurrentBindingRecordInternalV1(record);
    },
  };
  record.binding = binding;
  record.routeWithClaim = (envelope, invocation) =>
    routeWithBindingRecordInternalV1(record, envelope, invocation);
  bindingRecordsV1.set(binding, record);

  const prepared: ManagedSurfacePreparedContractBoundActionBindingInternalV1 = {
    commitInternalV1(
      token: ManagedSurfacePreparedInputBindingContractInternalV1,
    ): boolean {
      if (record.commitAttempted) return false;
      record.commitAttempted = true;
      const expectedCurrent = record.expectedCurrent;
      const tokenRecord = preparedInputBindingContractRecordsV1.get(token);
      if (
        record.phase !== "prepared" || tokenRecord === undefined || tokenRecord.consumed ||
        tokenRecord.contract.inputContextId !== contextState.inputContextId ||
        contextState.current !== expectedCurrent ||
        (preparedSlot === "first"
          ? contextState.preparedFirst !== record
          : contextState.preparedSecond !== record)
      ) {
        abortPreparedBindingRecordInternalV1(record);
        return false;
      }

      record.contract = tokenRecord.contract;
      tokenRecord.consumed = true;
      clearPreparedSlotInternalV1(record);
      record.expectedCurrent = null;
      const previous = contextState.current;
      contextState.current = record;
      record.phase = "current";
      record.committed = true;
      if (previous !== null && previous !== record) {
        previous.phase = "retired";
        if (previous.claimedRoute !== null) previous.claimedRoute.active = false;
      }
      return true;
    },
    abortInternalV1(): void {
      abortPreparedBindingRecordInternalV1(record);
    },
    getBindingInternalV1(): ManagedSurfaceActionBindingV1 | null {
      return record.committed ? record.binding : null;
    },
  };
  record.preparedHandle = prepared;
  preparedBindingRecordsV1.set(prepared, record);
  if (preparedSlot === "first") contextState.preparedFirst = record;
  else contextState.preparedSecond = record;
  return prepared;
}

export function prepareManagedSurfaceContractBoundActionBindingInternalV1(
  input: PrepareManagedSurfaceContractBoundActionBindingInputInternalV1,
): ManagedSurfacePreparedContractBoundActionBindingInternalV1 {
  const captured = capturePrepareManagedSurfaceContractBoundActionBindingInputInternalV1(input);
  const routerState = routerBindingStateInternalV1(captured.inputRouter);
  const contextState = contextBindingStateInternalV1(routerState, captured);
  for (const retained of [contextState.preparedFirst, contextState.preparedSecond]) {
    if (retained?.authority === captured.authority) {
      abortPreparedBindingRecordInternalV1(retained);
    }
  }
  const preparedSlot = contextState.preparedFirst === null
    ? "first"
    : contextState.preparedSecond === null
    ? "second"
    : null;
  if (preparedSlot === null) {
    throw new TypeError("ui.managed_surface_input_authority_conflict");
  }
  const prepared = createPreparedBindingRecordInternalV1(
    captured,
    routerState,
    contextState,
    preparedSlot,
  );
  return prepared;
}

export function createManagedSurfaceContractBoundActionBindingInternalV1(
  input: CreateManagedSurfaceContractBoundActionBindingInputInternalV1,
): ManagedSurfaceActionBindingV1 {
  const contractToken = captureManagedSurfacePreparedInputBindingContractInternalV1(
    input.contract,
  );
  const contract = input.contract;
  const retained = routerBindingStatesV1.get(input.inputRouter)?.contexts
    .get(contract.inputContextId)?.current ?? null;
  if (
    retained !== null && retained.phase === "current" && retained.contract !== null &&
    retained.binding !== null &&
    equalManagedSurfaceInputBindingContractV1(retained.contract, contract)
  ) {
    if (retained.authority !== input.authority) {
      throw new TypeError("ui.managed_surface_input_authority_conflict");
    }
    retained.isGestureCurrent = input.isGestureCurrent;
    return retained.binding;
  }

  const prepared = prepareManagedSurfaceContractBoundActionBindingInternalV1({
    authority: input.authority,
    inputContextId: contract.inputContextId,
    inputRouter: input.inputRouter,
    isGestureCurrent: input.isGestureCurrent,
    ...(input.registerManagedInputHandler === undefined
      ? {}
      : { registerManagedInputHandler: input.registerManagedInputHandler }),
  });
  if (!prepared.commitInternalV1(contractToken)) {
    prepared.abortInternalV1();
    throw new TypeError("ui.managed_surface_input_authority_conflict");
  }
  const binding = prepared.getBindingInternalV1();
  if (binding === null) {
    throw new TypeError("ui.managed_surface_input_authority_invalid");
  }
  return binding;
}

export function claimManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult>(
  binding: ManagedSurfaceActionBindingV1,
  consume: (
    input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<TAttempt>,
  ) => TResult,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> {
  const record = bindingRecordsV1.get(binding);
  if (
    record === undefined || record.phase !== "current" || record.binding !== binding ||
    record.claimedRoute !== null || typeof consume !== "function"
  ) {
    throw new TypeError("ui.managed_surface_action_route_claim_invalid");
  }
  return claimManagedSurfaceActionBindingRecordInternalV1(record, consume);
}

export function claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1<
  TAttempt,
  TResult,
>(
  prepared: ManagedSurfacePreparedContractBoundActionBindingInternalV1,
  consume: (
    input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<TAttempt>,
  ) => TResult,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> {
  const record = preparedBindingRecordsV1.get(prepared);
  if (
    record === undefined || record.phase !== "prepared" ||
    record.preparedHandle !== prepared || record.claimedRoute !== null ||
    typeof consume !== "function"
  ) {
    throw new TypeError("ui.managed_surface_action_route_claim_invalid");
  }
  return claimManagedSurfaceActionBindingRecordInternalV1(record, consume);
}

function claimManagedSurfaceActionBindingRecordInternalV1<TAttempt, TResult>(
  record: ManagedSurfaceActionBindingRecordV1,
  consume: (
    input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<TAttempt>,
  ) => TResult,
): ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> {
  const claim: ManagedSurfaceAuthenticatedActionClaimRecordInternalV1 = {
    consume: consume as (
      input: ManagedSurfaceAuthenticatedActionContinuationInputInternalV1<unknown>,
    ) => unknown,
    active: true,
    routeInProgress: false,
  };
  record.claimedRoute = claim;
  const claimed: ManagedSurfaceAuthenticatedActionRouteInternalV1<TAttempt, TResult> = {
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
        return {
          route,
          consumerResult: invocation.invoked ? invocation.result as TResult : null,
        };
      } finally {
        claim.routeInProgress = false;
      }
    },
    disposeInternalV1(): void {
      if (!claim.active) return;
      claim.active = false;
      const binding = record.binding;
      if (binding !== null) binding.dispose();
    },
  };
  return claimed;
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
  const contract: ManagedSurfaceInputBindingContractV1 = {
    applicationEpoch: publication.applicationEpoch,
    ownerId: target.definition.ownerId,
    surfaceInstanceId: target.surfaceInstanceId,
    inputContextId: inputOwner.inputContextId,
    routingLeaseId: inputOwner.routingLeaseId,
    actionIds: target.definition.actionIds,
    topologyRevision: publication.topologyRevision,
  };
  let authority = coordinatorAuthoritiesV1.get(input.coordinator);
  if (authority === undefined) {
    const coordinator = input.coordinator;
    authority = {
      routeActionInternalV1(request: ManagedSurfaceRouteActionInputV1) {
        return coordinator.routeAction(request);
      },
    };
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
