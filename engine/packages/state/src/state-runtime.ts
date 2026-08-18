// SPDX-License-Identifier: MIT
import type {
  CommandExecutionAttemptEnvelopeV1,
  CommandExecutionResultEnvelopeV1,
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RunIntegrityV1,
  RuntimeSchemaV1,
  RuntimeSessionStatusV1,
  SessionDispatchOperationResultV1,
} from "@sillymaker/base";

import { createStateRuntimeBridgeInternalV1 } from "./legacy-adapter.ts";

export interface StateSnapshotV1<TState = unknown, TRngState = unknown> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: RunIntegrityV1;
}

export interface StateRuntimeTypeMapV1<TState = unknown, TRngState = unknown> {
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: StateSnapshotV1<TState, TRngState>;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly fact: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly debugValidationError: unknown;
  readonly executionContext: unknown;
}

export type StateCommandResultV1<TTypes extends StateRuntimeTypeMapV1> =
  CommandExecutionResultEnvelopeV1<
    TTypes["snapshot"],
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["fault"]
  >;

export type StateCommandAttemptV1<TTypes extends StateRuntimeTypeMapV1> =
  CommandExecutionAttemptEnvelopeV1<
    TTypes["snapshot"],
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["fault"],
    TTypes["rngState"],
    TTypes["rngDrawTrace"]
  >;

export type StateDispatchResultV1<TTypes extends StateRuntimeTypeMapV1> =
  SessionDispatchOperationResultV1<StateCommandResultV1<TTypes>>;

export type StateFinalizedCommandAttemptV1<TTypes extends StateRuntimeTypeMapV1> =
  & DeepReadonly<StateCommandAttemptV1<TTypes>>
  & {
    readonly preSnapshot: DeepReadonly<TTypes["snapshot"]>;
    readonly preStateDigest: Digest;
    readonly postStateDigest: Digest;
  };

export type StateSessionStatusV1 = RuntimeSessionStatusV1;

export interface StateSessionFaultCauseV1 {
  readonly at: "dispatch" | "debug" | "session";
  readonly message: string;
  readonly stackSummary: readonly string[];
}

export interface StateSessionV1<TTypes extends StateRuntimeTypeMapV1> {
  getStatus(): StateSessionStatusV1;
  getCurrentSnapshot(): DeepReadonly<TTypes["snapshot"]>;
  getLastFaultCause(): StateSessionFaultCauseV1 | null;
  subscribe(listener: () => void): () => void;
  dispatch(command: DeepReadonly<TTypes["command"]>): Promise<StateDispatchResultV1<TTypes>>;
}

export type StateDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
    readonly kind: "validation_failed";
    readonly errors: readonly TValidationError[];
  };

export interface StateRuntimeDebugDefinitionV1<TTypes extends StateRuntimeTypeMapV1> {
  validate(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["debugCommand"]>,
    context: TTypes["executionContext"],
  ): StateDebugCommandValidationResultV1<TTypes["debugValidationError"]>;
  executeAttempt(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["debugCommand"]>,
    context: TTypes["executionContext"],
  ): StateCommandAttemptV1<TTypes> | PromiseLike<StateCommandAttemptV1<TTypes>>;
  normalizeUnexpectedFault(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): StateCommandAttemptV1<TTypes>;
}

export interface StateRuntimeDefinitionV1<TTypes extends StateRuntimeTypeMapV1> {
  readonly initialSnapshot: TTypes["snapshot"];
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly executionContext: TTypes["executionContext"];
  readonly available?: boolean;
  executeAttempt(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["command"]>,
    context: TTypes["executionContext"],
  ): StateCommandAttemptV1<TTypes> | PromiseLike<StateCommandAttemptV1<TTypes>>;
  normalizeUnexpectedDispatchFault(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): StateCommandAttemptV1<TTypes>;
  readonly debug?: StateRuntimeDebugDefinitionV1<TTypes>;
  onAttempt?(attempt: StateFinalizedCommandAttemptV1<TTypes>): void;
  onObserverFailure?(error: unknown): void;
  onHmrInvalidated?(): void;
}

export interface StateRuntimeV1<TTypes extends StateRuntimeTypeMapV1> {
  readonly session: StateSessionV1<TTypes>;
}

export function createStateRuntimeV1<TTypes extends StateRuntimeTypeMapV1>(
  definition: StateRuntimeDefinitionV1<TTypes>,
): StateRuntimeV1<TTypes> {
  return createStateRuntimeBridgeInternalV1(definition).runtime;
}
