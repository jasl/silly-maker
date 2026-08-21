// SPDX-License-Identifier: MIT
import type { GameSnapshotEnvelopeV1 } from "./snapshot.ts";
import type { StrictJsonObjectV1 } from "./strict-json.ts";
import type {
  DeepReadonly,
  ModuleId,
  NonZeroUint32,
  PositiveSafeInteger,
  RuntimeSchemaV1,
  StateSlotId,
} from "./values.ts";

export interface GameBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface BootstrapEntropyV1 {
  nextUuidV4(): string;
  nextNonZeroUint32(): NonZeroUint32;
}

export interface GameplayModuleDescriptorV1 {
  readonly id: ModuleId;
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly dependencies: readonly ModuleId[];
}

export interface GameSimulationTypeMapV1<
  TBootstrapInput extends GameBootstrapInputV1 = GameBootstrapInputV1,
  TState = unknown,
  TRngState = unknown,
> {
  readonly bootstrapInput: TBootstrapInput;
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: GameSnapshotEnvelopeV1<TState, TRngState>;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly event: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly debugValidationError: unknown;
  readonly executionContext: unknown;
  readonly queries: unknown;
  readonly viewModel: unknown;
}

export declare const gameSimulationTypeWitnessV1: unique symbol;

export interface GameSimulationTypeWitnessV1<TTypes extends GameSimulationTypeMapV1> {
  readonly [gameSimulationTypeWitnessV1]?: (types: TTypes) => TTypes;
}

export interface ModuleInvariantViolationV1 {
  readonly code: string;
  readonly details: StrictJsonObjectV1;
}

export interface ModuleLocalInvariantV1<TStateSlice, TReadPort> {
  check(
    state: DeepReadonly<TStateSlice>,
    readPort: TReadPort,
  ): readonly ModuleInvariantViolationV1[];
}

/**
 * The kind key union of a Story's domain-event union. Domain events are the
 * only internal authoritative update channel: producers (command handlers,
 * engine monitors) emit them inside a commit, reducers fold them into state
 * atomically, and the committed sequence is the read-side event journal.
 */
export type DomainEventKindOfV1<TEvent> = TEvent extends
  { readonly kind: infer TKind extends string } ? TKind : never;

/**
 * One module's pure fold step for one admitted domain event: next slice =
 * reduce(current slice, event). Reducers are total for admitted events — a
 * throw faults the whole commit and leaves authoritative state unchanged.
 * They never reject, draw randomness, or read other modules' slices; every
 * decision (validation, RNG, cross-module reads) happens in the command
 * handler before the event is emitted.
 */
export type ModuleEventReducerV1<TStateSlice, TEvent> = (
  state: DeepReadonly<TStateSlice>,
  event: DeepReadonly<TEvent>,
) => TStateSlice;

/**
 * A module's declared reducers, keyed by domain-event kind. Kinds absent
 * from every module's map are journal-only events (evidence without state).
 */
export type ModuleEventReducerMapV1<TStateSlice, TEvent> = {
  readonly [TKind in DomainEventKindOfV1<TEvent>]?: ModuleEventReducerV1<
    TStateSlice,
    Extract<TEvent, { readonly kind: TKind }>
  >;
};

export interface ModuleQueryCapabilityV1<
  TStateSlice,
  TModuleQuery,
  TModuleQueryResult,
  TDependencyPorts,
> {
  execute(
    state: DeepReadonly<TStateSlice>,
    query: DeepReadonly<TModuleQuery>,
    dependencies: TDependencyPorts,
  ): TModuleQueryResult;
}

export interface GameplayModuleSurfaceV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly descriptor: GameplayModuleDescriptorV1;
  readonly commandSchema: RuntimeSchemaV1<TModuleCommand> | null;
  readonly querySchema: RuntimeSchemaV1<TModuleQuery> | null;
  readonly queryResultSchema: RuntimeSchemaV1<TModuleQueryResult> | null;
}

export interface StatefulGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TReadPort,
  TDependencyPorts,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateful";
  readonly stateSchema: RuntimeSchemaV1<TStateSlice>;
  readonly localInvariants: readonly ModuleLocalInvariantV1<TStateSlice, TReadPort>[];
  readonly reducers: ModuleEventReducerMapV1<TStateSlice, TTypes["event"]>;
  readonly queries:
    | ModuleQueryCapabilityV1<
      TStateSlice,
      TModuleQuery,
      TModuleQueryResult,
      TDependencyPorts
    >
    | null;
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TStateSlice;
  createReadPort(state: DeepReadonly<TStateSlice>): TReadPort;
}

export interface StatelessGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TCapabilities,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateless";
  readonly reducers: null;
  readonly capabilities: TCapabilities;
}

export type GameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1 = GameSimulationTypeMapV1,
  TStateSlice = unknown,
  TModuleCommand = unknown,
  TModuleQuery = unknown,
  TModuleQueryResult = unknown,
  TReadPort = unknown,
  TDependencyPorts = unknown,
> =
  | StatefulGameplayModuleBindingV1<
    TTypes,
    TStateSlice,
    TModuleCommand,
    TModuleQuery,
    TModuleQueryResult,
    TReadPort,
    TDependencyPorts
  >
  | StatelessGameplayModuleBindingV1<
    TTypes,
    TModuleCommand,
    TModuleQuery,
    TModuleQueryResult,
    TReadPort
  >;

export type GameplayModuleTupleForSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
> = {
  readonly [TIndex in keyof TModules]: TModules[TIndex] extends GameplayModuleBindingV1<
    TTypes,
    infer _TStateSlice,
    infer _TModuleCommand,
    infer _TModuleQuery,
    infer _TModuleQueryResult,
    infer _TReadPort,
    infer _TDependencyPorts
  > ? TModules[TIndex]
    : never;
};

export interface GameCommandExecutorV1<TSnapshot, TCommand, TContext, TAttempt> {
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TCommand>,
    context: TContext,
  ): TAttempt;
}

export type GameDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
    readonly kind: "validation_failed";
    readonly errors: readonly TValidationError[];
  };

export interface GameDebugCommandExecutorV1<
  TSnapshot,
  TDebugCommand,
  TContext,
  TValidationError,
  TAttempt,
> {
  validate(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): GameDebugCommandValidationResultV1<TValidationError>;
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): TAttempt;
}

export interface GameSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
  TExecutor extends GameCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["command"],
    TTypes["executionContext"],
    unknown
  >,
  TDebugExecutor extends GameDebugCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["debugCommand"],
    TTypes["executionContext"],
    TTypes["debugValidationError"],
    unknown
  >,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly contractRevision: 1;
  readonly modules: GameplayModuleTupleForSimulationV1<TTypes, TModules>;
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly eventSchema: RuntimeSchemaV1<TTypes["event"]>;
  readonly rejectionSchema: RuntimeSchemaV1<TTypes["rejection"]>;
  readonly debugCommandSchema: RuntimeSchemaV1<TTypes["debugCommand"]>;
  readonly debugValidationErrorSchema: RuntimeSchemaV1<TTypes["debugValidationError"]>;
  readonly commandExecutor: TExecutor;
  readonly debugCommandExecutor: TDebugExecutor;
  createBootstrapInput(entropy: BootstrapEntropyV1): TTypes["bootstrapInput"];
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TTypes["state"];
  createQueries(state: DeepReadonly<TTypes["state"]>): TTypes["queries"];
  projectGameView(queries: TTypes["queries"]): TTypes["viewModel"];
}
