// SPDX-License-Identifier: MIT
import type { PositiveSafeInteger, RuntimeSchemaV1, StateSlotId } from "@sillymaker/base";
import {
  createStateAuthoringKitV1,
  getStateModuleContractRevisionV1,
  type StateModuleOperationOfV1,
  type StateTransactionV1,
  type StateWorkflowRngV1,
  type StateWorkflowTypeMapV1,
  type StateWorkflowV1,
} from "@sillymaker/state";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface TypeTestStateV1 {
  readonly simulation: {
    readonly calendar: { readonly day: number };
  };
}

interface TypeTestTypesV1 extends StateWorkflowTypeMapV1<TypeTestStateV1> {
  readonly fact: { readonly kind: "calendar.advanced" };
  readonly rejection: { readonly code: "calendar.blocked" };
  readonly fault: { readonly code: "calendar.failed" };
}

declare const stateSchemaV1: RuntimeSchemaV1<TypeTestStateV1>;
declare const sliceSchemaV1: RuntimeSchemaV1<{ readonly day: number }>;
declare const operationSchemaV1: RuntimeSchemaV1<{ readonly kind: "advance" }>;
declare const snapshotV1: TypeTestTypesV1["snapshot"];
declare const rngV1: StateWorkflowRngV1;

const kitV1 = createStateAuthoringKitV1<TypeTestTypesV1>();
const calendarV1 = kitV1.defineModule({
  id: "type.calendar",
  contractRevision: 1,
  state: {
    slot: "simulation.calendar",
    schema: sliceSchemaV1,
    initial: () => ({ day: 1 }),
  },
  owner: {
    operationSchema: operationSchemaV1,
    propose(_state, operation) {
      return {
        kind: "proposed",
        proposal: { payload: operation, facts: [{ kind: "calendar.advanced" }] },
      };
    },
    apply(state) {
      return { day: state.day + 1 };
    },
  },
});

type CalendarOperationV1 = ExpectV1<
  EqualV1<StateModuleOperationOfV1<typeof calendarV1>, { readonly kind: "advance" }>
>;
type TransactionKeysV1 = ExpectV1<
  EqualV1<keyof StateTransactionV1<TypeTestTypesV1>, "complete" | "propose" | "read" | "reject">
>;
type WorkflowKeysV1 = ExpectV1<
  EqualV1<keyof StateWorkflowV1<TypeTestTypesV1>, "execute">
>;

const compositionV1 = kitV1.composeModules([calendarV1]);
getStateModuleContractRevisionV1(calendarV1) satisfies PositiveSafeInteger;
compositionV1.modules[0].descriptor.stateSlots[0] satisfies StateSlotId | undefined;
const workflowV1 = compositionV1.createWorkflow({
  stateSchema: stateSchemaV1,
  createFault: () => ({ code: "calendar.failed" }),
  run(transaction) {
    transaction.propose(calendarV1, { kind: "advance" });
    // @ts-expect-error operations stay owned and typed by their State module
    transaction.propose(calendarV1, { kind: "retreat" });
    return transaction.complete();
  },
});
workflowV1 satisfies StateWorkflowV1<TypeTestTypesV1>;
workflowV1.execute(snapshotV1, rngV1);

// @ts-expect-error legacy authoring names are not exported by the neutral root
import type { GameAuthoringKitV1 } from "@sillymaker/state";
// @ts-expect-error legacy transaction names are not exported by the neutral root
import type { KitTransactionV1 } from "@sillymaker/state";
// @ts-expect-error React types are not exported by the neutral root
import type { ReactNode } from "@sillymaker/state";

type _NoLegacyAuthoringV1 = GameAuthoringKitV1;
type _NoLegacyTransactionV1 = KitTransactionV1;
type _NoReactV1 = ReactNode;
void (0 as unknown as CalendarOperationV1);
void (0 as unknown as TransactionKeysV1);
void (0 as unknown as WorkflowKeysV1);
void (0 as unknown as _NoLegacyAuthoringV1);
void (0 as unknown as _NoLegacyTransactionV1);
void (0 as unknown as _NoReactV1);
