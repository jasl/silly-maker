// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ModuleId,
  PositiveSafeInteger,
  RngDrawTraceV1,
  RngStateV1,
  RuleRngV1,
  RuntimeSchemaV1,
  StateSlotId,
} from "@sillymaker/base";

import {
  createStateAuthoringBridgeInternalV1,
  getStateModuleContractRevisionInternalV1,
} from "./state-authoring-adapter.ts";
import type {
  StateCommandAttemptV1,
  StateRuntimeTypeMapV1,
  StateSnapshotV1,
} from "./state-runtime.ts";

export interface StateWorkflowTypeMapV1<TState = unknown>
  extends StateRuntimeTypeMapV1<TState, RngStateV1> {
  readonly snapshot: StateSnapshotV1<TState, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
}

declare const stateCapabilityPortWitnessV1: unique symbol;

export interface StateCapabilityV1<TPort> {
  readonly kind: "capability_token";
  readonly id: string;
  readonly [stateCapabilityPortWitnessV1]?: TPort;
}

export interface StateCapabilityProviderContextV1<TStateSlice> {
  readOwnState(): DeepReadonly<TStateSlice>;
}

export interface StateCapabilityProvisionV1<TStateSlice> {
  readonly token: StateCapabilityV1<unknown>;
  readonly createPort: (context: StateCapabilityProviderContextV1<TStateSlice>) => unknown;
}

export type StateCapabilityRequirementsV1 = Readonly<
  Record<string, StateCapabilityV1<unknown>>
>;

export type StateDependencyPortsOfV1<TRequires extends StateCapabilityRequirementsV1> = {
  readonly [TKey in keyof TRequires]: TRequires[TKey] extends StateCapabilityV1<infer TPort> ? TPort
    : never;
};

export type ProvideStateCapabilityV1<TStateSlice> = <TPort>(
  token: StateCapabilityV1<TPort>,
  createPort: (context: StateCapabilityProviderContextV1<TStateSlice>) => TPort,
) => StateCapabilityProvisionV1<TStateSlice>;

export interface StateModuleProposalV1<TOperation, TFact> {
  readonly payload: TOperation;
  readonly facts: readonly TFact[];
}

export type StateModuleProposalResultV1<TOperation, TFact, TRejection> =
  | {
    readonly kind: "proposed";
    readonly proposal: StateModuleProposalV1<TOperation, TFact>;
  }
  | { readonly kind: "rejected"; readonly rejection: TRejection };

/**
 * Owner operations for one neutral State slice.
 *
 * Module-local invariants are deliberately not part of the V1 neutral
 * surface. The existing Base transaction runner validates the aggregate
 * candidate through `StateWorkflowDefinitionV1.validateCandidate`; expose a
 * local invariant contract only when a real consumer establishes where and
 * when those checks execute.
 */
export interface StateModuleOwnerV1<
  TTypes extends StateWorkflowTypeMapV1,
  TStateSlice,
  TOwnerOperation,
  TRequires extends StateCapabilityRequirementsV1,
> {
  readonly operationSchema: RuntimeSchemaV1<TOwnerOperation>;
  readonly proposalSchema?: RuntimeSchemaV1<
    StateModuleProposalV1<TOwnerOperation, TTypes["fact"]>
  >;
  propose(
    state: DeepReadonly<TStateSlice>,
    operation: DeepReadonly<TOwnerOperation>,
    dependencies: StateDependencyPortsOfV1<TRequires>,
  ): StateModuleProposalResultV1<TOwnerOperation, TTypes["fact"], TTypes["rejection"]>;
  apply(
    state: DeepReadonly<TStateSlice>,
    proposal: DeepReadonly<StateModuleProposalV1<TOwnerOperation, TTypes["fact"]>>,
  ): TStateSlice;
}

export interface StateModuleDefinitionV1<
  TTypes extends StateWorkflowTypeMapV1,
  TStateSlice,
  TOwnerOperation,
  TRequires extends StateCapabilityRequirementsV1,
> {
  readonly id: string;
  readonly contractRevision: number;
  readonly state: {
    readonly slot: string;
    readonly schema: RuntimeSchemaV1<TStateSlice>;
    /**
     * V1 module initialization is intentionally bootstrap-independent. The
     * legacy bridge invokes this factory without forwarding Base's bootstrap
     * input; add a typed bootstrap contract only when a real neutral consumer
     * requires one.
     */
    readonly initial: () => TStateSlice;
  };
  readonly requires?: TRequires;
  readonly provides?: (
    provide: ProvideStateCapabilityV1<TStateSlice>,
  ) => readonly StateCapabilityProvisionV1<TStateSlice>[];
  readonly initializesAfter?: readonly string[];
  readonly owner: StateModuleOwnerV1<TTypes, TStateSlice, TOwnerOperation, TRequires>;
}

declare const stateModuleTypeWitnessV1: unique symbol;

export interface StateAnyModuleV1 {
  readonly id: ModuleId;
  /** The immutable revision admitted when this neutral module was defined. */
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlot: StateSlotId;
  readonly requires: StateCapabilityRequirementsV1;
  readonly initializesAfter: readonly string[];
}

export interface StateModuleV1<
  TTypes extends StateWorkflowTypeMapV1,
  TStateSlice,
  TOwnerOperation,
  TRequires extends StateCapabilityRequirementsV1,
> extends StateAnyModuleV1 {
  readonly requires: TRequires;
  readonly [stateModuleTypeWitnessV1]?: {
    readonly types: TTypes;
    readonly state: TStateSlice;
    readonly operation: TOwnerOperation;
  };
}

/** Returns the immutable revision admitted when the neutral module was defined. */
export function getStateModuleContractRevisionV1(
  module: StateAnyModuleV1,
): PositiveSafeInteger {
  return getStateModuleContractRevisionInternalV1(module);
}

export type StateModuleOperationOfV1<TModule> = TModule extends StateModuleV1<
  infer _TTypes,
  infer _TStateSlice,
  infer TOwnerOperation,
  infer _TRequires
> ? TOwnerOperation
  : never;

export interface StateModuleDescriptorV1 {
  readonly id: ModuleId;
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly dependencies: readonly ModuleId[];
}

export interface StateModuleBindingV1 {
  readonly descriptor: StateModuleDescriptorV1;
}

export type StateModuleBindingsOfV1<TModules extends readonly StateAnyModuleV1[]> = {
  readonly [TIndex in keyof TModules]: StateModuleBindingV1;
};

export type StateTransactionOutcomeV1<TTypes extends StateWorkflowTypeMapV1> =
  | { readonly kind: "transaction_complete" }
  | { readonly kind: "transaction_reject"; readonly rejection: TTypes["rejection"] };

export type StateTransactionProposeResultV1<TTypes extends StateWorkflowTypeMapV1> =
  | { readonly kind: "proposed" }
  | { readonly kind: "rejected"; readonly rejection: TTypes["rejection"] };

/**
 * A snapshot-isolated, atomic multi-owner command transaction.
 *
 * Every `read()` and owner `propose()` observes the immutable command-start
 * State; staged proposals are never visible through later reads (there is no
 * read-your-writes). Each owner may stage at most one proposal. Once the
 * workflow completes, proposals are applied against their command-start owner
 * slices in locale-independent UTF-16 code-unit module-ID order, and facts are
 * collected in that same order. A rejection or fault preserves the complete
 * command-start Snapshot and transactional RNG state.
 */
export interface StateTransactionV1<TTypes extends StateWorkflowTypeMapV1> {
  read<TPort>(token: StateCapabilityV1<TPort>): TPort;
  propose<TModule extends StateAnyModuleV1>(
    module: TModule,
    operation: StateModuleOperationOfV1<TModule>,
  ): StateTransactionProposeResultV1<TTypes>;
  reject(rejection: TTypes["rejection"]): StateTransactionOutcomeV1<TTypes>;
  complete(): StateTransactionOutcomeV1<TTypes>;
}

export interface StateWorkflowDefinitionV1<TTypes extends StateWorkflowTypeMapV1> {
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  createFault(cause: unknown): TTypes["fault"];
  validateCandidate?(state: DeepReadonly<TTypes["state"]>): readonly string[];
  run(transaction: StateTransactionV1<TTypes>): StateTransactionOutcomeV1<TTypes>;
}

export type StateWorkflowRngV1 = RuleRngV1;

/**
 * An executable workflow backed by the Base transaction runner. It produces a
 * command attempt only; the existing Session remains the sole installer of an
 * authoritative Snapshot.
 */
export interface StateWorkflowV1<TTypes extends StateWorkflowTypeMapV1> {
  execute(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    rng: StateWorkflowRngV1,
  ): StateCommandAttemptV1<TTypes>;
}

export interface StateModuleCompositionV1<
  TTypes extends StateWorkflowTypeMapV1,
  TModules extends readonly StateAnyModuleV1[],
> {
  readonly modules: StateModuleBindingsOfV1<TModules>;
  createDependencyPortsFor<TRequires extends StateCapabilityRequirementsV1>(
    module: { readonly requires: TRequires; readonly id: ModuleId },
    state: DeepReadonly<TTypes["state"]>,
  ): StateDependencyPortsOfV1<TRequires>;
  readCapability<TPort>(
    consumer: { readonly requires: StateCapabilityRequirementsV1; readonly id: ModuleId },
    state: DeepReadonly<TTypes["state"]>,
    token: StateCapabilityV1<TPort>,
  ): TPort;
  createWorkflow(definition: StateWorkflowDefinitionV1<TTypes>): StateWorkflowV1<TTypes>;
}

export interface StateAuthoringKitV1<TTypes extends StateWorkflowTypeMapV1> {
  defineCapability<TPort>(id: string): StateCapabilityV1<TPort>;
  defineModule<
    TStateSlice,
    TOwnerOperation,
    TRequires extends StateCapabilityRequirementsV1 = Readonly<Record<never, never>>,
  >(
    definition: StateModuleDefinitionV1<TTypes, TStateSlice, TOwnerOperation, TRequires>,
  ): StateModuleV1<TTypes, TStateSlice, TOwnerOperation, TRequires>;
  composeModules<const TModules extends readonly StateAnyModuleV1[]>(
    modules: TModules,
  ): StateModuleCompositionV1<TTypes, TModules>;
}

export function createStateAuthoringKitV1<
  TTypes extends StateWorkflowTypeMapV1,
>(): StateAuthoringKitV1<TTypes> {
  return createStateAuthoringBridgeInternalV1<TTypes>();
}
