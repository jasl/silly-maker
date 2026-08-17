// SPDX-License-Identifier: MIT
import type { GameplayModuleBindingV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createStateAuthoringKitV1, type StateWorkflowTypeMapV1 } from "@sillymaker/state";
import {
  createLegacyGameplayModuleBindingsV1,
  type LegacyGameplayModuleBindingTupleV1,
  type LegacyStateRuntimeTypeMapV1,
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

interface ConsumerTypesV1 extends StateWorkflowTypeMapV1<ConsumerStateV1> {
  readonly command: { readonly kind: "consumer.run" };
  readonly fact: never;
  readonly rejection: never;
  readonly fault: never;
}

declare const sliceSchemaV1: RuntimeSchemaV1<{ readonly value: number }>;
declare const operationSchemaV1: RuntimeSchemaV1<{ readonly kind: "retain" }>;
declare const commandSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["command"]>;

const kitV1 = createStateAuthoringKitV1<ConsumerTypesV1>();
const alphaV1 = kitV1.defineModule({
  id: "consumer.alpha",
  contractRevision: 1,
  state: { slot: "simulation.alpha", schema: sliceSchemaV1, initial: () => ({ value: 1 }) },
  owner: {
    operationSchema: operationSchemaV1,
    propose(_state, operation) {
      return { kind: "proposed", proposal: { payload: operation, facts: [] } };
    },
    apply(state) {
      return state;
    },
  },
});
const betaV1 = kitV1.defineModule({
  id: "consumer.beta",
  contractRevision: 1,
  state: { slot: "simulation.beta", schema: sliceSchemaV1, initial: () => ({ value: 2 }) },
  owner: {
    operationSchema: operationSchemaV1,
    propose(_state, operation) {
      return { kind: "proposed", proposal: { payload: operation, facts: [] } };
    },
    apply(state) {
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
    LegacyStateRuntimeTypeMapV1<ConsumerTypesV1>,
    unknown,
    ConsumerTypesV1["command"]
  >,
  GameplayModuleBindingV1<
    LegacyStateRuntimeTypeMapV1<ConsumerTypesV1>,
    unknown,
    ConsumerTypesV1["command"]
  >,
];
type LegacyTupleLengthV1 = ExpectV1<EqualV1<typeof legacyBindingsV1.length, 2>>;
legacyBindingsV1[0].commandSchema satisfies RuntimeSchemaV1<ConsumerTypesV1["command"]> | null;

// @ts-expect-error Game-named migration adapters remain absent from the neutral root.
import { createLegacyGameplayModuleBindingsV1 as rootLegacyAdapterV1 } from "@sillymaker/state";
type _NoRootLegacyAdapterV1 = typeof rootLegacyAdapterV1;
void (0 as unknown as LegacyTupleLengthV1);
void (0 as unknown as _NoRootLegacyAdapterV1);
