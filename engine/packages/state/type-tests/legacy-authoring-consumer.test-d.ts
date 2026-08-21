// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { defineGameSimulation } from "@sillymaker/base/authoring";
import { createStateAuthoringKitV1, type StateWorkflowTypeMapV1 } from "@sillymaker/state";
import {
  createLegacyGameplayModuleBindingsV1,
  type LegacyGameplayModuleBindingTupleV1,
} from "@sillymaker/state/legacy";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface ConsumerStateV1 {
  readonly simulation: {
    readonly alpha: { readonly value: number };
    readonly beta: { readonly value: number };
  };
}

interface ConsumerBootstrapV1 extends GameBootstrapInputV1 {
  readonly source: "consumer";
}

interface ConsumerQueriesV1 {
  readValue(): number;
}

interface ConsumerViewModelV1 {
  readonly value: number;
}

interface ConsumerTypesV1
  extends GameSimulationTypeMapV1<ConsumerBootstrapV1, ConsumerStateV1, RngStateV1> {
  readonly snapshot: GameSnapshotEnvelopeV1<ConsumerStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: { readonly kind: "consumer.run" };
  readonly event: { readonly kind: "consumer.event" };
  readonly rejection: { readonly code: "consumer.rejected" };
  readonly fault: { readonly code: "consumer.failed" };
  readonly debugCommand: { readonly kind: "consumer.debug" };
  readonly debugValidationError: { readonly code: "consumer.debug-invalid" };
  readonly executionContext: undefined;
  readonly queries: ConsumerQueriesV1;
  readonly viewModel: ConsumerViewModelV1;
}

declare const sliceSchemaV1: RuntimeSchemaV1<{ readonly value: number }>;
declare const commandSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["command"]>;
declare const stateSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["state"]>;
declare const eventSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["event"]>;
declare const rejectionSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["rejection"]>;
declare const debugCommandSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["debugCommand"]>;
declare const debugValidationErrorSchemaV1: RuntimeSchemaV1<
  ConsumerTypesV1["debugValidationError"]
>;
declare const bootstrapInputV1: ConsumerTypesV1["bootstrapInput"];
declare const initialStateV1: ConsumerTypesV1["state"];
declare const queriesV1: ConsumerTypesV1["queries"];
declare const viewModelV1: ConsumerTypesV1["viewModel"];
declare const commandExecutorV1: {
  executeAttempt(
    snapshot: DeepReadonly<ConsumerTypesV1["snapshot"]>,
    command: DeepReadonly<ConsumerTypesV1["command"]>,
    context: ConsumerTypesV1["executionContext"],
  ): unknown;
};
declare const debugCommandExecutorV1: {
  validate(
    snapshot: DeepReadonly<ConsumerTypesV1["snapshot"]>,
    command: DeepReadonly<ConsumerTypesV1["debugCommand"]>,
    context: ConsumerTypesV1["executionContext"],
  ): { readonly kind: "allowed" };
  executeAttempt(
    snapshot: DeepReadonly<ConsumerTypesV1["snapshot"]>,
    command: DeepReadonly<ConsumerTypesV1["debugCommand"]>,
    context: ConsumerTypesV1["executionContext"],
  ): unknown;
};

const kitV1 = createStateAuthoringKitV1<ConsumerTypesV1>();
const alphaV1 = kitV1.defineModule({
  id: "consumer.alpha",
  contractRevision: 1,
  state: { slot: "simulation.alpha", schema: sliceSchemaV1, initial: () => ({ value: 1 }) },
  reducers: {
    "consumer.event"(state) {
      return state;
    },
  },
});
const betaV1 = kitV1.defineModule({
  id: "consumer.beta",
  contractRevision: 1,
  state: { slot: "simulation.beta", schema: sliceSchemaV1, initial: () => ({ value: 2 }) },
  reducers: {
    "consumer.event"(state) {
      return state;
    },
  },
});
const compositionV1 = kitV1.composeModules([alphaV1, betaV1]);
export const legacyBindingsV1 = createLegacyGameplayModuleBindingsV1(
  compositionV1,
  commandSchemaV1,
);

legacyBindingsV1 satisfies LegacyGameplayModuleBindingTupleV1<
  ConsumerTypesV1,
  readonly [typeof alphaV1, typeof betaV1]
>;
legacyBindingsV1 satisfies readonly [
  GameplayModuleBindingV1<
    ConsumerTypesV1,
    unknown,
    ConsumerTypesV1["command"]
  >,
  GameplayModuleBindingV1<
    ConsumerTypesV1,
    unknown,
    ConsumerTypesV1["command"]
  >,
];
type LegacyTupleLengthV1 = ExpectV1<EqualV1<typeof legacyBindingsV1.length, 2>>;
legacyBindingsV1[0].commandSchema satisfies RuntimeSchemaV1<ConsumerTypesV1["command"]> | null;
export const consumerSimulationV1 = defineGameSimulation<ConsumerTypesV1>()({
  contractRevision: 1,
  modules: legacyBindingsV1,
  stateSchema: stateSchemaV1,
  commandSchema: commandSchemaV1,
  eventSchema: eventSchemaV1,
  rejectionSchema: rejectionSchemaV1,
  debugCommandSchema: debugCommandSchemaV1,
  debugValidationErrorSchema: debugValidationErrorSchemaV1,
  commandExecutor: commandExecutorV1,
  debugCommandExecutor: debugCommandExecutorV1,
  createBootstrapInput: () => bootstrapInputV1,
  createInitialState: () => initialStateV1,
  createQueries: () => queriesV1,
  projectGameView: () => viewModelV1,
});

interface StateOnlyTypesV1 extends StateWorkflowTypeMapV1<ConsumerStateV1> {
  readonly command: ConsumerTypesV1["command"];
  readonly event: never;
  readonly rejection: never;
  readonly fault: never;
}
declare const stateOnlyCommandSchemaV1: RuntimeSchemaV1<StateOnlyTypesV1["command"]>;
const stateOnlyKitV1 = createStateAuthoringKitV1<StateOnlyTypesV1>();
const stateOnlyModuleV1 = stateOnlyKitV1.defineModule({
  id: "consumer.state-only",
  contractRevision: 1,
  state: { slot: "simulation.alpha", schema: sliceSchemaV1, initial: () => ({ value: 1 }) },
  reducers: {},
});
const stateOnlyCompositionV1 = stateOnlyKitV1.composeModules([stateOnlyModuleV1]);
// @ts-expect-error the legacy Game adapter requires the consumer's complete GameSimulation map.
createLegacyGameplayModuleBindingsV1(stateOnlyCompositionV1, stateOnlyCommandSchemaV1);

// @ts-expect-error Game-named migration adapters remain absent from the neutral root.
import { createLegacyGameplayModuleBindingsV1 as rootLegacyAdapterV1 } from "@sillymaker/state";
type _NoRootLegacyAdapterV1 = typeof rootLegacyAdapterV1;
void (0 as unknown as LegacyTupleLengthV1);
void (0 as unknown as _NoRootLegacyAdapterV1);
