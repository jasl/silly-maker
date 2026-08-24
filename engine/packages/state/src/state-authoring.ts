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

/** The kind-key union of a neutral workflow's domain-event union. */
export type StateEventKindOfV1<TEvent> = TEvent extends
  { readonly kind: infer TKind extends string } ? TKind : never;

/** One module's pure fold step for one admitted domain event. */
export type StateModuleEventReducerV1<TStateSlice, TEvent> = (
  state: DeepReadonly<TStateSlice>,
  event: DeepReadonly<TEvent>,
) => TStateSlice;

/**
 * A module's reducers keyed by domain-event kind. Events without a subscribed
 * reducer remain journal-only evidence.
 */
export type StateModuleEventReducerMapV1<TStateSlice, TEvent> = {
  readonly [TKind in StateEventKindOfV1<TEvent>]?: StateModuleEventReducerV1<
    TStateSlice,
    Extract<TEvent, { readonly kind: TKind }>
  >;
};

export interface StateModuleDefinitionV1<
  TTypes extends StateWorkflowTypeMapV1,
  TStateSlice,
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
  /** Pure folds are the only post-bootstrap writers of this State slice. */
  readonly reducers: StateModuleEventReducerMapV1<TStateSlice, TTypes["event"]>;
}

declare const stateModuleTypeWitnessV1: unique symbol;

export interface StateAnyModuleV1 {
  readonly id: ModuleId;
  /** The revision admitted when this neutral module was defined. */
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlot: StateSlotId;
  readonly requires: StateCapabilityRequirementsV1;
  readonly initializesAfter: readonly string[];
}

export interface StateModuleV1<
  TTypes extends StateWorkflowTypeMapV1,
  TStateSlice,
  TRequires extends StateCapabilityRequirementsV1,
> extends StateAnyModuleV1 {
  readonly requires: TRequires;
  readonly [stateModuleTypeWitnessV1]?: {
    readonly types: TTypes;
    readonly state: TStateSlice;
  };
}

/** Returns the revision admitted when the neutral module was defined. */
export function getStateModuleContractRevisionV1(
  module: StateAnyModuleV1,
): PositiveSafeInteger {
  return getStateModuleContractRevisionInternalV1(module);
}

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

/**
 * A snapshot-isolated, atomic domain-event transaction.
 *
 * Every `read()` observes the immutable command-start State. The workflow
 * decides all rejections before emission, then emits admitted domain events in
 * journal order. Base folds each event through subscribed module reducers in
 * locale-independent UTF-16 code-unit module-ID order. A rejection or fault
 * preserves the complete command-start Snapshot and transactional RNG state.
 */
export interface StateTransactionV1<TTypes extends StateWorkflowTypeMapV1> {
  read<TPort>(token: StateCapabilityV1<TPort>): TPort;
  emit(event: TTypes["event"]): void;
  reject(rejection: TTypes["rejection"]): StateTransactionOutcomeV1<TTypes>;
  complete(): StateTransactionOutcomeV1<TTypes>;
}

export interface StateWorkflowDefinitionV1<TTypes extends StateWorkflowTypeMapV1> {
  readonly eventSchema: RuntimeSchemaV1<TTypes["event"]>;
  createFault(cause: unknown): TTypes["fault"];
  /** Cross-slice invariants that cannot be owned by one module's slice schema. */
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
    TRequires extends StateCapabilityRequirementsV1 = Readonly<Record<never, never>>,
  >(
    definition: StateModuleDefinitionV1<TTypes, TStateSlice, TRequires>,
  ): StateModuleV1<TTypes, TStateSlice, TRequires>;
  composeModules<const TModules extends readonly StateAnyModuleV1[]>(
    modules: TModules,
  ): StateModuleCompositionV1<TTypes, TModules>;
}

export function createStateAuthoringKitV1<
  TTypes extends StateWorkflowTypeMapV1,
>(): StateAuthoringKitV1<TTypes> {
  return createStateAuthoringBridgeInternalV1<TTypes>();
}
