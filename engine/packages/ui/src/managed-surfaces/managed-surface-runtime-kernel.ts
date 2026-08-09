// SPDX-License-Identifier: MIT
import { type DeepReadonly, parsePositiveSafeInteger } from "@sillymaker/base";

import type {
  ManagedSurfaceCandidateV1,
  ManagedSurfaceOperationV1,
  ManagedSurfacePublicationV1,
  ManagedSurfaceResolvedDefinitionV1,
  ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceTransientIdentityV1 } from "./managed-surface-identity.ts";
import {
  type ManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
} from "./managed-surface-reducer.ts";

export interface ManagedSurfaceTransientCandidateRequestInternalV1 {
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly semanticOccurrenceId: string | null;
}

export interface ManagedSurfaceRuntimeKernelStateAdapterInternalV1<TState> {
  getTransientState(state: TState): ManagedSurfaceReducerStateV1;
  replaceTransientState(
    state: TState,
    nextTransientState: ManagedSurfaceReducerStateV1,
  ): TState;
  finalizeTransientTransition?(
    currentState: TState,
    reducerSuccessorState: TState,
    operation: ManagedSurfaceOperationV1,
    reducerReceipt: ManagedSurfaceTransitionReceiptV1,
  ): Readonly<{
    readonly state: TState;
    readonly receipt: ManagedSurfaceTransitionReceiptV1;
  }>;
  /**
   * First-terminal-only prepare/gate seam. The reducer receipt is the sole
   * terminal classifier. Repository adapters provide a no-throw commit gate;
   * a throwing gate keeps the prepared state uninstalled and unnotified.
   */
  prepareTerminalTransientTransition?(
    currentState: TState,
    reducerSuccessorState: TState,
    operation: ManagedSurfaceOperationV1,
    reducerReceipt: ManagedSurfaceTransitionReceiptV1,
  ): Readonly<{
    readonly state: TState;
    readonly commitGate: () => void;
  }>;
  validateInstallState?(currentState: TState, nextState: TState): void;
  /** Must not throw. Runs after assignment and before listener notification. */
  finalizeInstallState?(nextState: TState): void;
}

export interface CreateManagedSurfaceRuntimeKernelInputInternalV1<TState> {
  readonly initialState: TState;
  readonly stateAdapter: ManagedSurfaceRuntimeKernelStateAdapterInternalV1<TState>;
  readonly reportSubscriberFailure?: () => void;
}

export interface ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult> {
  readonly state: TState;
  readonly result: TResult;
}

declare const managedSurfaceRuntimePreparedStateInstallBrandInternalV1: unique symbol;

export interface ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState> {
  readonly [managedSurfaceRuntimePreparedStateInstallBrandInternalV1]: TState;
}

export type ManagedSurfaceRuntimePreparedStateInstallResultInternalV1 =
  | "installed"
  | "aborted"
  | "stale"
  | "invalid";

/**
 * The sole mutable owner for one runtime composition. Stable R3b work may wrap
 * its state around the transient reducer projection, but it must reuse this
 * state cell, listener owner, and identity cursor rather than mirror them.
 */
export interface ManagedSurfaceRuntimeKernelInternalV1<TState> {
  getStateInternalV1(): TState;
  getTransientStateInternalV1(): ManagedSurfaceReducerStateV1;
  getTransientSnapshotInternalV1(): DeepReadonly<ManagedSurfacePublicationV1>;
  peekTransientCandidateInternalV1(
    input: ManagedSurfaceTransientCandidateRequestInternalV1,
  ): ManagedSurfaceCandidateV1;
  transitionTransientInternalV1(
    operation: ManagedSurfaceOperationV1,
  ): ManagedSurfaceTransitionReceiptV1;
  transitionStateInternalV1<TResult>(
    transition: (
      currentState: TState,
    ) => ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult>,
  ): TResult;
  prepareStateInstallInternalV1(
    expectedState: TState,
    nextState: TState,
  ): ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>;
  commitPreparedStateInstallInternalV1(
    prepared: ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>,
    gate: () => boolean,
  ): ManagedSurfaceRuntimePreparedStateInstallResultInternalV1;
  subscribeTransientInternalV1(listener: () => void): () => void;
  subscribeStateInternalV1(listener: () => void): () => void;
}

interface ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState> {
  readonly expectedState: TState;
  readonly nextState: TState;
  readonly transientPublicationChanged: boolean;
  readonly stateChanged: boolean;
  readonly nextCoordinatorDisposed: boolean;
}

interface ManagedSurfaceRuntimeInstallNotificationInternalV1 {
  readonly transientListeners: readonly (() => void)[];
  readonly stateListeners: readonly (() => void)[];
  readonly nextCoordinatorDisposed: boolean;
}

export function createManagedSurfaceRuntimeKernelInternalV1<TState>(
  input: CreateManagedSurfaceRuntimeKernelInputInternalV1<TState>,
): ManagedSurfaceRuntimeKernelInternalV1<TState> {
  const stateAdapter = input.stateAdapter;
  const getTransientState = stateAdapter.getTransientState;
  const replaceTransientState = stateAdapter.replaceTransientState;
  const finalizeTransientTransition = stateAdapter.finalizeTransientTransition;
  const prepareTerminalTransientTransition = stateAdapter.prepareTerminalTransientTransition;
  const validateInstallState = stateAdapter.validateInstallState;
  const finalizeInstallState = stateAdapter.finalizeInstallState;
  const reportSubscriberFailure = input.reportSubscriberFailure;
  let state = input.initialState;
  let transitionInProgress = false;
  const transientListeners = new Set<() => void>();
  const stateListeners = new Set<() => void>();
  const preparedStateInstalls = new WeakMap<
    ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>,
    ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>
  >();
  const emptyListenerVector = Object.freeze([]) as readonly (() => void)[];

  const transientStateFor = (stateValue: TState): ManagedSurfaceReducerStateV1 =>
    Reflect.apply(getTransientState, stateAdapter, [stateValue]) as ManagedSurfaceReducerStateV1;

  const currentTransientState = (): ManagedSurfaceReducerStateV1 => transientStateFor(state);

  const reportFailure = (): void => {
    try {
      reportSubscriberFailure?.();
    } catch {
      // Diagnostics remain best effort after a committed state transition.
    }
  };

  const notify = (listeners: readonly (() => void)[]): void => {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        reportFailure();
      }
    }
  };

  const beginTransition = (): void => {
    if (transitionInProgress) {
      throw new TypeError("ui.managed_surface_runtime_transition_in_progress");
    }
    transitionInProgress = true;
  };

  const prepareInstallRecord = (
    expectedState: TState,
    nextState: TState,
    previousTransientState?: ManagedSurfaceReducerStateV1,
  ): ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState> => {
    const previousPublication = (previousTransientState ?? transientStateFor(expectedState))
      .publication;
    if (validateInstallState !== undefined) {
      Reflect.apply(validateInstallState, stateAdapter, [expectedState, nextState]);
    }
    const nextPublication = transientStateFor(nextState).publication;
    return Object.freeze({
      expectedState,
      nextState,
      transientPublicationChanged: nextPublication !== previousPublication,
      stateChanged: nextState !== expectedState,
      nextCoordinatorDisposed: nextPublication.coordinatorDisposed,
    });
  };

  const captureInstallNotification = (
    prepared: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>,
  ): ManagedSurfaceRuntimeInstallNotificationInternalV1 =>
    Object.freeze({
      transientListeners: prepared.transientPublicationChanged
        ? Object.freeze([...transientListeners])
        : emptyListenerVector,
      stateListeners: prepared.stateChanged
        ? Object.freeze([...stateListeners])
        : emptyListenerVector,
      nextCoordinatorDisposed: prepared.nextCoordinatorDisposed,
    });

  const deliverInstallNotification = (
    notification: ManagedSurfaceRuntimeInstallNotificationInternalV1,
  ): void => {
    notify(notification.transientListeners);
    notify(notification.stateListeners);
    if (notification.nextCoordinatorDisposed) {
      transientListeners.clear();
      stateListeners.clear();
    }
  };

  const subscribe = (listeners: Set<() => void>, listener: () => void): () => void => {
    if (currentTransientState().publication.coordinatorDisposed) {
      throw new TypeError("ui.managed_surface_coordinator_disposed");
    }
    listeners.add(listener);
    let subscribed = true;
    return (): void => {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(listener);
    };
  };

  const kernel: ManagedSurfaceRuntimeKernelInternalV1<TState> = Object.freeze({
    getStateInternalV1: (): TState => state,
    getTransientStateInternalV1: currentTransientState,
    getTransientSnapshotInternalV1: (): DeepReadonly<ManagedSurfacePublicationV1> =>
      currentTransientState().publication,
    peekTransientCandidateInternalV1(
      request: ManagedSurfaceTransientCandidateRequestInternalV1,
    ): ManagedSurfaceCandidateV1 {
      const transientState = currentTransientState();
      if (transientState.identitySequenceHighWater >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError("ui.managed_surface_id_sequence_exhausted");
      }
      const sequence = parsePositiveSafeInteger(
        transientState.identitySequenceHighWater + 1,
      );
      const identity = createManagedSurfaceTransientIdentityV1(
        transientState.publication.applicationEpoch,
        sequence,
      );
      return Object.freeze({
        identityAllocation: identity.allocation,
        definition: request.definition,
        target: Object.freeze({
          kind: "transient" as const,
          occurrenceId: identity.occurrenceId,
        }),
        surfaceInstanceId: identity.surfaceInstanceId,
        routingLeaseId: identity.routingLeaseId,
        semanticOccurrenceId: request.semanticOccurrenceId,
      });
    },
    transitionTransientInternalV1(
      operation: ManagedSurfaceOperationV1,
    ): ManagedSurfaceTransitionReceiptV1 {
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      let receipt!: ManagedSurfaceTransitionReceiptV1;
      try {
        const previousState = state;
        const previousTransientState = transientStateFor(previousState);
        const reducerResult = reduceManagedSurfaceV1(previousTransientState, operation);
        const reducerSuccessorState = reducerResult.state === previousTransientState
          ? previousState
          : Reflect.apply(replaceTransientState, stateAdapter, [
            previousState,
            reducerResult.state,
          ]) as TState;
        const firstTerminalCoordinatorReceipt = reducerResult.receipt.kind === "applied" &&
          reducerResult.receipt.code === "surface.coordinator_disposed";
        const terminalCoordinatorReceipt = reducerResult.receipt.code ===
            "surface.coordinator_disposed" ||
          reducerResult.receipt.code === "surface.coordinator_already_disposed";
        let terminalCommitGate: (() => void) | undefined;
        let finalizedState: TState;
        let finalizedReceipt: ManagedSurfaceTransitionReceiptV1;
        if (
          firstTerminalCoordinatorReceipt &&
          prepareTerminalTransientTransition !== undefined
        ) {
          const preparedTerminal = Reflect.apply(
            prepareTerminalTransientTransition,
            stateAdapter,
            [
              previousState,
              reducerSuccessorState,
              operation,
              reducerResult.receipt,
            ],
          ) as Readonly<{
            readonly state: TState;
            readonly commitGate: () => void;
          }>;
          finalizedState = preparedTerminal.state;
          terminalCommitGate = preparedTerminal.commitGate;
          finalizedReceipt = reducerResult.receipt;
        } else {
          const finalized = finalizeTransientTransition === undefined ||
              terminalCoordinatorReceipt
            ? Object.freeze({ state: reducerSuccessorState, receipt: reducerResult.receipt })
            : Reflect.apply(finalizeTransientTransition, stateAdapter, [
              previousState,
              reducerSuccessorState,
              operation,
              reducerResult.receipt,
            ]) as Readonly<{
              readonly state: TState;
              readonly receipt: ManagedSurfaceTransitionReceiptV1;
            }>;
          finalizedState = finalized.state;
          finalizedReceipt = finalized.receipt;
        }
        const prepared = prepareInstallRecord(
          previousState,
          finalizedState,
          previousTransientState,
        );
        const nextState = prepared.nextState;
        notification = captureInstallNotification(prepared);
        if (terminalCommitGate !== undefined) {
          Reflect.apply(terminalCommitGate, undefined, []);
        }
        state = nextState;
        if (finalizeInstallState !== undefined) {
          Reflect.apply(finalizeInstallState, stateAdapter, [nextState]);
        }
        receipt = finalizedReceipt;
      } finally {
        transitionInProgress = false;
      }
      deliverInstallNotification(notification);
      return receipt;
    },
    transitionStateInternalV1<TResult>(
      transition: (
        currentState: TState,
      ) => ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult>,
    ): TResult {
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      let planned!: ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult>;
      try {
        const previousState = state;
        const previousTransientState = transientStateFor(previousState);
        if (previousTransientState.publication.coordinatorDisposed) {
          throw new TypeError("ui.managed_surface_coordinator_disposed");
        }
        planned = transition(previousState);
        const prepared = prepareInstallRecord(
          previousState,
          planned.state,
          previousTransientState,
        );
        notification = captureInstallNotification(prepared);
        state = prepared.nextState;
        if (finalizeInstallState !== undefined) {
          Reflect.apply(finalizeInstallState, stateAdapter, [prepared.nextState]);
        }
      } finally {
        transitionInProgress = false;
      }
      deliverInstallNotification(notification);
      return planned.result;
    },
    prepareStateInstallInternalV1(
      expectedState: TState,
      nextState: TState,
    ): ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState> {
      beginTransition();
      try {
        if (state !== expectedState) {
          throw new TypeError("ui.managed_surface_runtime_state_stale");
        }
        const previousTransientState = transientStateFor(expectedState);
        if (previousTransientState.publication.coordinatorDisposed) {
          throw new TypeError("ui.managed_surface_coordinator_disposed");
        }
        const prepared = prepareInstallRecord(
          expectedState,
          nextState,
          previousTransientState,
        );
        const token = Object.freeze(
          {},
        ) as ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>;
        preparedStateInstalls.set(token, prepared);
        return token;
      } finally {
        transitionInProgress = false;
      }
    },
    commitPreparedStateInstallInternalV1(
      token: ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>,
      gate: () => boolean,
    ): ManagedSurfaceRuntimePreparedStateInstallResultInternalV1 {
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      let installed = false;
      try {
        const prepared = preparedStateInstalls.get(token);
        if (prepared === undefined) return "invalid";
        preparedStateInstalls.delete(token);
        if (state !== prepared.expectedState) return "stale";

        notification = captureInstallNotification(prepared);
        const nextState = prepared.nextState;
        if (!gate()) return "aborted";
        state = nextState;
        if (finalizeInstallState !== undefined) {
          Reflect.apply(finalizeInstallState, stateAdapter, [nextState]);
        }
        installed = true;
      } finally {
        transitionInProgress = false;
      }
      if (!installed) return "aborted";
      deliverInstallNotification(notification);
      return "installed";
    },
    subscribeTransientInternalV1(listener: () => void): () => void {
      return subscribe(transientListeners, listener);
    },
    subscribeStateInternalV1(listener: () => void): () => void {
      return subscribe(stateListeners, listener);
    },
  });

  return kernel;
}

export function createManagedSurfaceTransientRuntimeKernelInternalV1(
  initialState: ManagedSurfaceReducerStateV1,
  reportSubscriberFailure?: () => void,
): ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceReducerStateV1> {
  return createManagedSurfaceRuntimeKernelInternalV1({
    initialState,
    stateAdapter: Object.freeze({
      getTransientState: (state: ManagedSurfaceReducerStateV1) => state,
      replaceTransientState: (
        _state: ManagedSurfaceReducerStateV1,
        nextTransientState: ManagedSurfaceReducerStateV1,
      ) => nextTransientState,
    }),
    ...(reportSubscriberFailure === undefined ? {} : { reportSubscriberFailure }),
  });
}
