// SPDX-License-Identifier: MIT
import type { GameBootstrapInputV1, GameSimulationTypeMapV1 } from "@sillymaker/base";
import {
  createGameSessionV1,
  type GameSessionCompositionV1,
  type GameSessionInputV1,
  type GameSessionRuntimeControlV1,
} from "@sillymaker/base/runtime";

import type {
  StateRuntimeDefinitionV1,
  StateRuntimeTypeMapV1,
  StateRuntimeV1,
  StateSessionV1,
} from "./state-runtime.ts";

export interface LegacyStateRuntimeTypeMapV1<TTypes extends StateRuntimeTypeMapV1>
  extends GameSimulationTypeMapV1<GameBootstrapInputV1, TTypes["state"], TTypes["rngState"]> {
  readonly snapshot: TTypes["snapshot"];
  readonly rngDrawTrace: TTypes["rngDrawTrace"];
  readonly command: TTypes["command"];
  readonly event: TTypes["event"];
  readonly rejection: TTypes["rejection"];
  readonly fault: TTypes["fault"];
  readonly debugCommand: TTypes["debugCommand"];
  readonly debugValidationError: TTypes["debugValidationError"];
  readonly executionContext: TTypes["executionContext"];
  readonly queries: never;
  readonly viewModel: never;
}

export interface LegacyStateRuntimeAdapterV1<TTypes extends StateRuntimeTypeMapV1> {
  readonly runtime: StateRuntimeV1<TTypes>;
  readonly composition: GameSessionCompositionV1<LegacyStateRuntimeTypeMapV1<TTypes>>;
  readonly runtimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]>;
}

export function createStateRuntimeBridgeInternalV1<TTypes extends StateRuntimeTypeMapV1>(
  definition: StateRuntimeDefinitionV1<TTypes>,
): LegacyStateRuntimeAdapterV1<TTypes> {
  type TLegacyTypes = LegacyStateRuntimeTypeMapV1<TTypes>;
  const available = definition.available;
  const debugDefinition = definition.debug;
  const onAttempt = definition.onAttempt;
  const onObserverFailure = definition.onObserverFailure;
  const onHmrInvalidated = definition.onHmrInvalidated;
  const input: GameSessionInputV1<TLegacyTypes> = {
    initialSnapshot: definition.initialSnapshot,
    commandSchema: definition.commandSchema,
    executionContext: definition.executionContext,
    executeAttempt(snapshot, command, context) {
      return definition.executeAttempt(snapshot, command, context);
    },
    normalizeUnexpectedDispatchFault(error, snapshot) {
      return definition.normalizeUnexpectedDispatchFault(error, snapshot);
    },
    ...(available === undefined ? {} : { available }),
    ...(debugDefinition === undefined ? {} : {
      debug: {
        validate(snapshot, command, context) {
          return debugDefinition.validate(snapshot, command, context);
        },
        executeAttempt(snapshot, command, context) {
          return debugDefinition.executeAttempt(snapshot, command, context);
        },
        normalizeUnexpectedFault(error, snapshot) {
          return debugDefinition.normalizeUnexpectedFault(error, snapshot);
        },
      },
    }),
    ...(onAttempt === undefined
      ? {}
      : { onAttempt: (attempt) => onAttempt.call(definition, attempt) }),
    ...(onObserverFailure === undefined
      ? {}
      : { onObserverFailure: (error) => onObserverFailure.call(definition, error) }),
    ...(onHmrInvalidated === undefined
      ? {}
      : { onHmrInvalidated: () => onHmrInvalidated.call(definition) }),
  };
  const composition = createGameSessionV1<TLegacyTypes>(input);
  const session: StateSessionV1<TTypes> = composition.session;
  const runtime: StateRuntimeV1<TTypes> = Object.freeze({
    session,
  });
  return Object.freeze({
    runtime,
    composition,
    runtimeControl: composition.runtimeControl,
  });
}
