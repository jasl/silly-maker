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

interface ManagedSurfaceRuntimeStateInstallParticipantClaimRecordInternalV1 {
  readonly kind: "claim_record";
  readonly participantOwner: ManagedSurfaceRuntimeStateInstallParticipantOwnerInternalV1;
  exactClaimant: object | null;
  participant: object | null;
  prepareStateInstall: ((previousState: unknown, nextState: unknown) => unknown) | null;
  terminal: boolean;
}

interface ManagedSurfaceRuntimeStateInstallParticipantOwnerInternalV1 {
  readonly kind: "participant_owner";
}

interface ManagedSurfaceRuntimeCapturedPreparedStateInstallParticipantInternalV1 {
  readonly receiver: object;
  readonly validate: () => unknown;
  readonly commitLogical: () => unknown;
  readonly abort: () => unknown;
  readonly completeInstalled: () => unknown;
}

interface ManagedSurfaceRuntimeObservedStateInstallParticipantInternalV1 {
  readonly claimRecord: ManagedSurfaceRuntimeStateInstallParticipantClaimRecordInternalV1;
  readonly participant: object;
  readonly prepareStateInstall: (previousState: unknown, nextState: unknown) => unknown;
}

type ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1 =
  | Readonly<{ readonly kind: "unclaimed" }>
  | Readonly<{
    readonly kind: "none" | "fault";
    readonly observed: ManagedSurfaceRuntimeObservedStateInstallParticipantInternalV1;
  }>
  | Readonly<{
    readonly kind: "prepared";
    readonly observed: ManagedSurfaceRuntimeObservedStateInstallParticipantInternalV1;
    readonly prepared: ManagedSurfaceRuntimeCapturedPreparedStateInstallParticipantInternalV1;
  }>;

const unclaimedPreparedParticipantPhaseInternalV1 = Object.freeze({
  kind: "unclaimed" as const,
});

const managedSurfaceRuntimeStateInstallParticipantClaimRecordsInternalV1 = new WeakMap<
  object,
  | ManagedSurfaceRuntimeStateInstallParticipantClaimRecordInternalV1
  | ManagedSurfaceRuntimeStateInstallParticipantOwnerInternalV1
>();

const stateInstallParticipantClaimInvalidInternalV1 = (): never => {
  throw new TypeError("ui.managed_surface_runtime_state_install_participant_claim_invalid");
};

function captureManagedSurfaceRuntimeStateInstallParticipantInternalV1(
  participant: unknown,
):
  | Readonly<{
    receiver: object;
    prepareStateInstall: (previousState: unknown, nextState: unknown) => unknown;
  }>
  | null {
  if (
    (typeof participant !== "object" && typeof participant !== "function") ||
    participant === null
  ) {
    return null;
  }
  try {
    const ownKeys = Reflect.ownKeys(participant);
    const descriptor = Reflect.getOwnPropertyDescriptor(
      participant,
      "prepareStateInstallInternalV1",
    );
    if (
      !Object.isFrozen(participant) || ownKeys.length !== 1 ||
      ownKeys[0] !== "prepareStateInstallInternalV1" || descriptor === undefined ||
      !("value" in descriptor) || typeof descriptor.value !== "function"
    ) {
      return null;
    }
    return Object.freeze({
      receiver: participant,
      prepareStateInstall: descriptor.value as (
        previousState: unknown,
        nextState: unknown,
      ) => unknown,
    });
  } catch {
    return null;
  }
}

function captureManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1(
  prepared: unknown,
): ManagedSurfaceRuntimeCapturedPreparedStateInstallParticipantInternalV1 | null {
  if ((typeof prepared !== "object" && typeof prepared !== "function") || prepared === null) {
    return null;
  }
  const expectedKeys = [
    "validateInternalV1",
    "commitLogicalInternalV1",
    "abortInternalV1",
    "completeInstalledInternalV1",
  ] as const;
  try {
    const ownKeys = Reflect.ownKeys(prepared);
    if (
      !Object.isFrozen(prepared) || ownKeys.length !== expectedKeys.length ||
      expectedKeys.some((key) => !ownKeys.includes(key))
    ) {
      return null;
    }
    const readMethod = (key: (typeof expectedKeys)[number]): (() => unknown) | null => {
      const descriptor = Reflect.getOwnPropertyDescriptor(prepared, key);
      if (
        descriptor === undefined || !("value" in descriptor) ||
        typeof descriptor.value !== "function"
      ) {
        return null;
      }
      return descriptor.value as () => unknown;
    };
    const validate = readMethod("validateInternalV1");
    const commitLogical = readMethod("commitLogicalInternalV1");
    const abort = readMethod("abortInternalV1");
    const completeInstalled = readMethod("completeInstalledInternalV1");
    if (
      validate === null || commitLogical === null || abort === null ||
      completeInstalled === null
    ) return null;
    return Object.freeze({
      receiver: prepared,
      validate,
      commitLogical,
      abort,
      completeInstalled,
    });
  } catch {
    return null;
  }
}

export function claimManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>(
  kernel: ManagedSurfaceRuntimeKernelInternalV1<TState>,
  exactClaimant: object,
  participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState>,
): ManagedSurfaceRuntimeStateInstallParticipantInternalV1<TState> {
  if ((typeof kernel !== "object" && typeof kernel !== "function") || kernel === null) {
    return stateInstallParticipantClaimInvalidInternalV1();
  }
  const record = managedSurfaceRuntimeStateInstallParticipantClaimRecordsInternalV1.get(kernel);
  if (
    record === undefined || record.kind !== "claim_record" || record.terminal ||
    ((typeof exactClaimant !== "object" && typeof exactClaimant !== "function") ||
      exactClaimant === null)
  ) {
    return stateInstallParticipantClaimInvalidInternalV1();
  }
  if (record.exactClaimant !== null) {
    if (record.exactClaimant !== exactClaimant || record.participant !== participant) {
      return stateInstallParticipantClaimInvalidInternalV1();
    }
    return participant;
  }
  const captured = captureManagedSurfaceRuntimeStateInstallParticipantInternalV1(participant);
  if (captured === null) return stateInstallParticipantClaimInvalidInternalV1();
  const participantOwner = managedSurfaceRuntimeStateInstallParticipantClaimRecordsInternalV1.get(
    captured.receiver,
  );
  if (participantOwner !== undefined && participantOwner !== record.participantOwner) {
    return stateInstallParticipantClaimInvalidInternalV1();
  }
  record.exactClaimant = exactClaimant;
  record.participant = captured.receiver;
  record.prepareStateInstall = captured.prepareStateInstall;
  managedSurfaceRuntimeStateInstallParticipantClaimRecordsInternalV1.set(
    captured.receiver,
    record.participantOwner,
  );
  return participant;
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
  let stateInstallGeneration: object = Object.freeze({});
  let transitionInProgress = false;
  let participantClaimRecord!: ManagedSurfaceRuntimeStateInstallParticipantClaimRecordInternalV1;
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

  const observeStateInstallParticipant = ():
    | ManagedSurfaceRuntimeObservedStateInstallParticipantInternalV1
    | null => {
    const participant = participantClaimRecord.participant;
    const prepareStateInstall = participantClaimRecord.prepareStateInstall;
    if (
      participantClaimRecord.terminal || participant === null ||
      prepareStateInstall === null
    ) {
      return null;
    }
    return Object.freeze({
      claimRecord: participantClaimRecord,
      participant,
      prepareStateInstall,
    });
  };

  const prepareStateInstallParticipant = (
    previousState: TState,
    nextState: TState,
  ): ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1 => {
    if (previousState === nextState) return unclaimedPreparedParticipantPhaseInternalV1;
    const observed = observeStateInstallParticipant();
    if (observed === null) return unclaimedPreparedParticipantPhaseInternalV1;
    let output: unknown;
    try {
      output = Reflect.apply(observed.prepareStateInstall, observed.participant, [
        previousState,
        nextState,
      ]);
    } catch {
      return Object.freeze({ kind: "fault" as const, observed });
    }
    if (output === null) return Object.freeze({ kind: "none" as const, observed });
    const prepared = captureManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1(
      output,
    );
    return prepared === null
      ? Object.freeze({ kind: "fault" as const, observed })
      : Object.freeze({ kind: "prepared" as const, observed, prepared });
  };

  const participantObservationIsCurrent = (
    observed: ManagedSurfaceRuntimeObservedStateInstallParticipantInternalV1,
  ): boolean =>
    observed.claimRecord === participantClaimRecord && !participantClaimRecord.terminal &&
    participantClaimRecord.participant === observed.participant &&
    participantClaimRecord.prepareStateInstall === observed.prepareStateInstall;

  const abortPreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1,
  ): void => {
    if (phase.kind !== "prepared") return;
    try {
      Reflect.apply(phase.prepared.abort, phase.prepared.receiver, []);
    } catch {
      // A source-relative participant promises a no-throw logical abort.
    }
  };

  const validatePreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1,
    expectedState: TState,
    expectedGeneration: object,
  ): "valid" | "stale" | "fault" => {
    const observedCurrent = phase.kind === "unclaimed" ||
      participantObservationIsCurrent(phase.observed);
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
      validated = Reflect.apply(phase.prepared.validate, phase.prepared.receiver, []);
    } catch {
      abortPreparedParticipant(phase);
      return "fault";
    }
    if (validated === true) return "valid";
    abortPreparedParticipant(phase);
    return validated === false ? "stale" : "fault";
  };

  const commitPreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1,
  ): boolean => {
    if (phase.kind !== "prepared") return true;
    try {
      Reflect.apply(phase.prepared.commitLogical, phase.prepared.receiver, []);
      return true;
    } catch {
      abortPreparedParticipant(phase);
      return false;
    }
  };

  const completePreparedParticipant = (
    phase: ManagedSurfaceRuntimePreparedParticipantPhaseInternalV1,
  ): void => {
    if (phase.kind !== "prepared") return;
    try {
      Reflect.apply(phase.prepared.completeInstalled, phase.prepared.receiver, []);
    } catch {
      // Physical cancellation/scheduling is best effort after assignment.
    }
  };

  const fenceTerminalStateInstallParticipant = (): void => {
    if (participantClaimRecord.terminal) return;
    participantClaimRecord.terminal = true;
    participantClaimRecord.exactClaimant = null;
    participantClaimRecord.participant = null;
    participantClaimRecord.prepareStateInstall = null;
  };

  const assignPreparedInstall = (
    prepared: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>,
  ): void => {
    state = prepared.nextState;
    if (prepared.nextState !== prepared.expectedState) {
      stateInstallGeneration = prepared.nextInstallGeneration;
    }
    if (prepared.nextCoordinatorDisposed) fenceTerminalStateInstallParticipant();
    if (finalizeInstallState !== undefined) {
      Reflect.apply(finalizeInstallState, stateAdapter, [prepared.nextState]);
    }
  };

  const currentTransientFailureReceipt = (
    kind: "rejected" | "faulted",
    code: "surface.invalid_transition" | "surface.transition_faulted",
  ): ManagedSurfaceTransitionReceiptV1 => {
    const topologyRevision = currentTransientState().publication.topologyRevision;
    return Object.freeze({
      kind,
      code,
      beforeTopologyRevision: topologyRevision,
      afterTopologyRevision: topologyRevision,
    });
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
      expectedInstallGeneration: stateInstallGeneration,
      nextInstallGeneration: Object.freeze({}),
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
      let prepared!: ManagedSurfaceRuntimePreparedStateInstallRecordInternalV1<TState>;
      let terminalCommitGate: (() => void) | undefined;
      let finalizedReceipt!: ManagedSurfaceTransitionReceiptV1;
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
        let finalizedState: TState;
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
            Reflect.apply(terminalCommitGate, undefined, []);
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
    subscribeTransientInternalV1(listener: () => void): () => void {
      return subscribe(transientListeners, listener);
    },
    subscribeStateInternalV1(listener: () => void): () => void {
      return subscribe(stateListeners, listener);
    },
  });

  participantClaimRecord = {
    kind: "claim_record",
    participantOwner: Object.freeze({ kind: "participant_owner" }),
    exactClaimant: null,
    participant: null,
    prepareStateInstall: null,
    terminal: currentTransientState().publication.coordinatorDisposed,
  };
  managedSurfaceRuntimeStateInstallParticipantClaimRecordsInternalV1.set(
    kernel,
    participantClaimRecord,
  );

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
