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
  readonly fact: TTypes["fact"];
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
  const composition = createGameSessionV1<LegacyStateRuntimeTypeMapV1<TTypes>>(
    definition as unknown as GameSessionInputV1<LegacyStateRuntimeTypeMapV1<TTypes>>,
  );
  const runtime: StateRuntimeV1<TTypes> = Object.freeze({
    session: composition.session as unknown as StateSessionV1<TTypes>,
  });
  return Object.freeze({
    runtime,
    composition,
    runtimeControl: composition.runtimeControl,
  });
}
