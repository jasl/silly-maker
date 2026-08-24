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

export interface ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState> {
  prepareStateInstallInternalV1(
    previousState: TState,
    nextState: TState,
  ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null;
}

export interface ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
  validateInternalV1(): boolean;
  commitLogicalInternalV1(): void;
  abortInternalV1(): void;
  completeInstalledInternalV1(): void;
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
  setStateInstallParticipantInternalV1(
    participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>,
  ): void;
  subscribeTransientInternalV1(listener: () => void): () => void;
  subscribeStateInternalV1(listener: () => void): () => void;
}

interface ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState> {
  readonly expectedState: TState;
  readonly expectedInstallGeneration: object;
  readonly nextInstallGeneration: object;
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

type ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState> =
  | Readonly<{ readonly kind: "unclaimed" }>
  | Readonly<{
    readonly kind: "none" | "fault";
    readonly participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>;
  }>
  | Readonly<{
    readonly kind: "prepared";
    readonly participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>;
    readonly prepared: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1;
  }>;

const unclaimedPreparedParticipantPhaseInternalV1 = {
  kind: "unclaimed" as const,
};

const stateInstallParticipantInvalidInternalV1 = (): never => {
  throw new TypeError("ui.managed_surface_runtime_state_install_participant_invalid");
};

export function createManagedSurfaceRuntimeKernelInternalV1<TState>(
  input: CreateManagedSurfaceRuntimeKernelInputInternalV1<TState>,
): ManagedSurfaceRuntimeKernelInternalV1<TState> {
  const stateAdapter = input.stateAdapter;
  const reportSubscriberFailure = input.reportSubscriberFailure;
  let state = input.initialState;
  let stateInstallGeneration: object = {};
  let transitionInProgress = false;
  const transientListeners = new Set<() => void>();
  const stateListeners = new Set<() => void>();
  const preparedStateInstalls = new WeakMap<
    ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>,
    ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>
  >();
  const emptyListenerVector: readonly (() => void)[] = [];

  const transientStateFor = (stateValue: TState): ManagedSurfaceReducerStateV1 =>
    stateAdapter.getTransientState(stateValue);

  const currentTransientState = (): ManagedSurfaceReducerStateV1 => transientStateFor(state);
  let stateInstallParticipant:
    | ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>
    | null = null;
  let stateInstallParticipantTerminal = currentTransientState().publication.coordinatorDisposed;

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

  const prepareStateInstallParticipant = (
    previousState: TState,
    nextState: TState,
  ): ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState> => {
    if (previousState === nextState) return unclaimedPreparedParticipantPhaseInternalV1;
    const participant = stateInstallParticipantTerminal ? null : stateInstallParticipant;
    if (participant === null) return unclaimedPreparedParticipantPhaseInternalV1;
    let prepared: ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null;
    try {
      prepared = participant.prepareStateInstallInternalV1(previousState, nextState);
    } catch {
      return { kind: "fault" as const, participant };
    }
    return prepared === null
      ? { kind: "none" as const, participant }
      : { kind: "prepared" as const, participant, prepared };
  };

  const participantObservationIsCurrent = (
    participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>,
  ): boolean => !stateInstallParticipantTerminal && stateInstallParticipant === participant;

  const abortPreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState>,
  ): void => {
    if (phase.kind !== "prepared") return;
    try {
      phase.prepared.abortInternalV1();
    } catch {
      // A source-relative participant promises a no-throw logical abort.
    }
  };

  const validatePreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState>,
    expectedState: TState,
    expectedGeneration: object,
  ): "valid" | "stale" | "fault" => {
    const observedCurrent = phase.kind === "unclaimed" ||
      participantObservationIsCurrent(phase.participant);
    if (
      state !== expectedState || stateInstallGeneration !== expectedGeneration ||
      !observedCurrent
    ) {
      abortPreparedParticipant(phase);
      return "stale";
    }
    if (phase.kind === "fault") return "fault";
    if (phase.kind !== "prepared") return "valid";
    let validated: unknown;
    try {
      validated = phase.prepared.validateInternalV1();
    } catch {
      abortPreparedParticipant(phase);
      return "fault";
    }
    if (validated === true) return "valid";
    abortPreparedParticipant(phase);
    return validated === false ? "stale" : "fault";
  };

  const commitPreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState>,
  ): boolean => {
    if (phase.kind !== "prepared") return true;
    try {
      phase.prepared.commitLogicalInternalV1();
      return true;
    } catch {
      abortPreparedParticipant(phase);
      return false;
    }
  };

  const completePreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1<TState>,
  ): void => {
    if (phase.kind !== "prepared") return;
    try {
      phase.prepared.completeInstalledInternalV1();
    } catch {
      // Physical cancellation/scheduling is best effort after assignment.
    }
  };

  const fenceTerminalStateInstallParticipant = (): void => {
    if (stateInstallParticipantTerminal) return;
    stateInstallParticipantTerminal = true;
    stateInstallParticipant = null;
  };

  const assignPreparedInstall = (
    prepared: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>,
  ): void => {
    state = prepared.nextState;
    if (prepared.nextState !== prepared.expectedState) {
      stateInstallGeneration = prepared.nextInstallGeneration;
    }
    if (prepared.nextCoordinatorDisposed) fenceTerminalStateInstallParticipant();
    stateAdapter.finalizeInstallState?.(prepared.nextState);
  };

  const currentTransientFailureReceipt = (
    kind: "rejected" | "faulted",
    code: "surface.invalid_transition" | "surface.transition_faulted",
  ): ManagedSurfaceTransitionReceiptV1 => {
    const topologyRevision = currentTransientState().publication.topologyRevision;
    return {
      kind,
      code,
      beforeTopologyRevision: topologyRevision,
      afterTopologyRevision: topologyRevision,
    };
  };

  const prepareInstallRecord = (
    expectedState: TState,
    nextState: TState,
    previousTransientState?: ManagedSurfaceReducerStateV1,
  ): ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState> => {
    const previousPublication = (previousTransientState ?? transientStateFor(expectedState))
      .publication;
    stateAdapter.validateInstallState?.(expectedState, nextState);
    const nextPublication = transientStateFor(nextState).publication;
    return {
      expectedState,
      expectedInstallGeneration: stateInstallGeneration,
      nextInstallGeneration: {},
      nextState,
      transientPublicationChanged: nextPublication !== previousPublication,
      stateChanged: nextState !== expectedState,
      nextCoordinatorDisposed: nextPublication.coordinatorDisposed,
    };
  };

  const captureInstallNotification = (
    prepared: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>,
  ): ManagedSurfaceRuntimeInstallNotificationInternalV1 => ({
    transientListeners: prepared.transientPublicationChanged
      ? [...transientListeners]
      : emptyListenerVector,
    stateListeners: prepared.stateChanged ? [...stateListeners] : emptyListenerVector,
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

  const kernel: ManagedSurfaceRuntimeKernelInternalV1<TState> = {
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
      return {
        identityAllocation: identity.allocation,
        definition: request.definition,
        target: {
          kind: "transient" as const,
          occurrenceId: identity.occurrenceId,
        },
        surfaceInstanceId: identity.surfaceInstanceId,
        routingLeaseId: identity.routingLeaseId,
        semanticOccurrenceId: request.semanticOccurrenceId,
      };
    },
    transitionTransientInternalV1(
      operation: ManagedSurfaceOperationV1,
    ): ManagedSurfaceTransitionReceiptV1 {
      beginTransition();
      let prepared!: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>;
      let terminalCommitGate: (() => void) | undefined;
      let finalizedReceipt!: ManagedSurfaceTransitionReceiptV1;
      try {
        const previousState = state;
        const previousTransientState = transientStateFor(previousState);
        const reducerResult = reduceManagedSurfaceV1(previousTransientState, operation);
        const reducerSuccessorState = reducerResult.state === previousTransientState
          ? previousState
          : stateAdapter.replaceTransientState(
            previousState,
            reducerResult.state,
          );
        const firstTerminalCoordinatorReceipt = reducerResult.receipt.kind === "applied" &&
          reducerResult.receipt.code === "surface.coordinator_disposed";
        const terminalCoordinatorReceipt = reducerResult.receipt.code ===
            "surface.coordinator_disposed" ||
          reducerResult.receipt.code === "surface.coordinator_already_disposed";
        let finalizedState: TState;
        if (
          firstTerminalCoordinatorReceipt &&
          stateAdapter.prepareTerminalTransientTransition !== undefined
        ) {
          const preparedTerminal = stateAdapter.prepareTerminalTransientTransition(
            previousState,
            reducerSuccessorState,
            operation,
            reducerResult.receipt,
          );
          finalizedState = preparedTerminal.state;
          terminalCommitGate = preparedTerminal.commitGate;
          finalizedReceipt = reducerResult.receipt;
        } else {
          const finalized = stateAdapter.finalizeTransientTransition === undefined ||
              terminalCoordinatorReceipt
            ? { state: reducerSuccessorState, receipt: reducerResult.receipt }
            : stateAdapter.finalizeTransientTransition(
              previousState,
              reducerSuccessorState,
              operation,
              reducerResult.receipt,
            );
          finalizedState = finalized.state;
          finalizedReceipt = finalized.receipt;
        }
        prepared = prepareInstallRecord(
          previousState,
          finalizedState,
          previousTransientState,
        );
      } finally {
        transitionInProgress = false;
      }

      const participantPhase = prepareStateInstallParticipant(
        prepared.expectedState,
        prepared.nextState,
      );
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      let receipt!: ManagedSurfaceTransitionReceiptV1;
      try {
        const validation = validatePreparedParticipant(
          participantPhase,
          prepared.expectedState,
          prepared.expectedInstallGeneration,
        );
        if (validation === "stale") {
          return currentTransientFailureReceipt(
            "rejected",
            "surface.invalid_transition",
          );
        }
        if (validation === "fault") {
          return currentTransientFailureReceipt(
            "faulted",
            "surface.transition_faulted",
          );
        }
        notification = captureInstallNotification(prepared);
        if (terminalCommitGate !== undefined) {
          try {
            terminalCommitGate();
          } catch (error) {
            abortPreparedParticipant(participantPhase);
            throw error;
          }
        }
        if (!commitPreparedParticipant(participantPhase)) {
          return currentTransientFailureReceipt(
            "faulted",
            "surface.transition_faulted",
          );
        }
        assignPreparedInstall(prepared);
        receipt = finalizedReceipt;
      } finally {
        transitionInProgress = false;
      }
      deliverInstallNotification(notification);
      completePreparedParticipant(participantPhase);
      return receipt;
    },
    transitionStateInternalV1<TResult>(
      transition: (
        currentState: TState,
      ) => ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult>,
    ): TResult {
      beginTransition();
      let planned!: ManagedSurfaceRuntimeStateTransitionInternalV1<TState, TResult>;
      let prepared!: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>;
      try {
        const previousState = state;
        const previousTransientState = transientStateFor(previousState);
        if (previousTransientState.publication.coordinatorDisposed) {
          throw new TypeError("ui.managed_surface_coordinator_disposed");
        }
        planned = transition(previousState);
        prepared = prepareInstallRecord(
          previousState,
          planned.state,
          previousTransientState,
        );
      } finally {
        transitionInProgress = false;
      }

      const participantPhase = prepareStateInstallParticipant(
        prepared.expectedState,
        prepared.nextState,
      );
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      try {
        const validation = validatePreparedParticipant(
          participantPhase,
          prepared.expectedState,
          prepared.expectedInstallGeneration,
        );
        if (validation === "stale") {
          throw new TypeError("ui.managed_surface_runtime_state_stale");
        }
        if (validation === "fault") {
          throw new TypeError(
            "ui.managed_surface_runtime_state_install_participant_faulted",
          );
        }
        notification = captureInstallNotification(prepared);
        if (!commitPreparedParticipant(participantPhase)) {
          throw new TypeError(
            "ui.managed_surface_runtime_state_install_participant_faulted",
          );
        }
        assignPreparedInstall(prepared);
      } finally {
        transitionInProgress = false;
      }
      deliverInstallNotification(notification);
      completePreparedParticipant(participantPhase);
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
        const token = {} as ManagedSurfaceRuntimePreparedStateInstallInternalV1<TState>;
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
      let prepared!: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>;
      try {
        const captured = preparedStateInstalls.get(token);
        if (captured === undefined) return "invalid";
        preparedStateInstalls.delete(token);
        if (
          state !== captured.expectedState ||
          stateInstallGeneration !== captured.expectedInstallGeneration
        ) {
          return "stale";
        }
        prepared = captured;
      } finally {
        transitionInProgress = false;
      }

      const participantPhase = prepareStateInstallParticipant(
        prepared.expectedState,
        prepared.nextState,
      );
      beginTransition();
      let notification!: ManagedSurfaceRuntimeInstallNotificationInternalV1;
      try {
        const validation = validatePreparedParticipant(
          participantPhase,
          prepared.expectedState,
          prepared.expectedInstallGeneration,
        );
        if (validation === "stale") return "stale";
        if (validation === "fault") return "aborted";
        notification = captureInstallNotification(prepared);
        let gateAccepted: boolean;
        try {
          gateAccepted = gate();
        } catch (error) {
          abortPreparedParticipant(participantPhase);
          throw error;
        }
        if (!gateAccepted) {
          abortPreparedParticipant(participantPhase);
          return "aborted";
        }
        if (!commitPreparedParticipant(participantPhase)) return "aborted";
        assignPreparedInstall(prepared);
      } finally {
        transitionInProgress = false;
      }
      deliverInstallNotification(notification);
      completePreparedParticipant(participantPhase);
      return "installed";
    },
    setStateInstallParticipantInternalV1(
      participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>,
    ): void {
      if (
        stateInstallParticipantTerminal || stateInstallParticipant !== null
      ) {
        stateInstallParticipantInvalidInternalV1();
      }
      stateInstallParticipant = participant;
    },
    subscribeTransientInternalV1(listener: () => void): () => void {
      return subscribe(transientListeners, listener);
    },
    subscribeStateInternalV1(listener: () => void): () => void {
      return subscribe(stateListeners, listener);
    },
  };

  return kernel;
}

export function createManagedSurfaceTransientRuntimeKernelInternalV1(
  initialState: ManagedSurfaceReducerStateV1,
  reportSubscriberFailure?: () => void,
): ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceReducerStateV1> {
  return createManagedSurfaceRuntimeKernelInternalV1({
    initialState,
    stateAdapter: {
      getTransientState: (state: ManagedSurfaceReducerStateV1) => state,
      replaceTransientState: (
        _state: ManagedSurfaceReducerStateV1,
        nextTransientState: ManagedSurfaceReducerStateV1,
      ) => nextTransientState,
    },
    ...(reportSubscriberFailure === undefined ? {} : { reportSubscriberFailure }),
  });
}
