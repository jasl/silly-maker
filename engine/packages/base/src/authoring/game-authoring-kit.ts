// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "../contracts/diagnostic-envelope.ts";
import {
  AuthoringDiagnosticErrorV1,
  createDiagnosticV1,
} from "../contracts/diagnostic-envelope.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import { commitAttemptV1, faultAttemptV1, rejectAttemptV1 } from "../contracts/execution.ts";
import type {
  GameplayModuleBindingV1,
  GameSimulationTypeMapV1,
  ModuleEventReducerMapV1,
  ModuleLocalInvariantV1,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
} from "../contracts/gameplay-module.ts";
import type { RngDrawTraceV1, RngStateV1, RuleRngV1 } from "../contracts/rng.ts";
import type { DeepReadonly, ModuleId, RuntimeSchemaV1, StateSlotId } from "../contracts/values.ts";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.ts";
import { compareUtf16CodeUnitsInternalV1 } from "../internal/utf16-code-unit-order.ts";
import { defineGameplayModule } from "./define-gameplay-module.ts";

declare const capabilityPortBrandV1: unique symbol;

/**
 * A typed capability identity. The token is the only handle a consumer can
 * declare in `requires`; the port type rides along at the type level so
 * provider factories and consumer code stay in sync without a service
 * locator.
 */
export interface CapabilityTokenV1<TPort> {
  readonly kind: "capability_token";
  readonly id: string;
  readonly [capabilityPortBrandV1]?: TPort;
}

export interface CapabilityProviderContextV1<TStateSlice> {
  readOwnState(): DeepReadonly<TStateSlice>;
}

export interface CapabilityProvisionV1<TStateSlice> {
  readonly token: CapabilityTokenV1<unknown>;
  readonly createPort: (context: CapabilityProviderContextV1<TStateSlice>) => unknown;
}

export type CapabilityRequirementsV1 = Readonly<Record<string, CapabilityTokenV1<unknown>>>;

export type DependencyPortsOfV1<TRequires extends CapabilityRequirementsV1> = {
  readonly [TKey in keyof TRequires]: TRequires[TKey] extends CapabilityTokenV1<infer TPort> ? TPort
    : never;
};

export type ProvideCapabilityV1<TStateSlice> = <TPort>(
  token: CapabilityTokenV1<TPort>,
  createPort: (context: CapabilityProviderContextV1<TStateSlice>) => TPort,
) => CapabilityProvisionV1<TStateSlice>;

export interface AuthoringKitStatefulModuleConfigV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TRequires extends CapabilityRequirementsV1,
> {
  readonly id: string;
  readonly contractRevision: number;
  readonly state: {
    readonly slot: string;
    readonly schema: RuntimeSchemaV1<TStateSlice>;
    readonly initial: (bootstrap: DeepReadonly<TTypes["bootstrapInput"]>) => TStateSlice;
  };
  readonly commandSchema?: RuntimeSchemaV1<TModuleCommand>;
  readonly requires?: TRequires;
  readonly provides?: (
    provide: ProvideCapabilityV1<TStateSlice>,
  ) => readonly CapabilityProvisionV1<TStateSlice>[];
  readonly initializesAfter?: readonly string[];
  /**
   * The module's pure fold steps, keyed by domain-event kind. Reducers are
   * the only way this module's slice changes after bootstrap; command
   * handlers decide and emit, reducers fold, nothing else writes.
   */
  readonly reducers: ModuleEventReducerMapV1<TStateSlice, TTypes["event"]>;
  readonly invariants?: readonly ModuleLocalInvariantV1<TStateSlice, DeepReadonly<TStateSlice>>[];
}

export type AuthoringKitStatefulBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TRequires extends CapabilityRequirementsV1,
> = StatefulGameplayModuleBindingV1<
  TTypes,
  TStateSlice,
  TModuleCommand,
  never,
  never,
  DeepReadonly<TStateSlice>,
  DependencyPortsOfV1<TRequires>
>;

export interface AuthoringKitStatefulModuleV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TRequires extends CapabilityRequirementsV1,
> {
  readonly kind: "kit_stateful_module";
  readonly id: ModuleId;
  readonly stateSlot: StateSlotId;
  readonly requires: TRequires;
  readonly initializesAfter: readonly string[];
  readonly provisions: readonly CapabilityProvisionV1<TStateSlice>[];
  readonly config: AuthoringKitStatefulModuleConfigV1<
    TTypes,
    TStateSlice,
    TModuleCommand,
    TRequires
  >;
}

export interface AuthoringKitStatelessModuleConfigV1<TCapabilities> {
  readonly id: string;
  readonly contractRevision: number;
  readonly capabilities: TCapabilities;
}

export interface AuthoringKitStatelessModuleV1<
  TTypes extends GameSimulationTypeMapV1,
  TCapabilities,
> {
  readonly kind: "kit_stateless_module";
  readonly id: ModuleId;
  readonly config: AuthoringKitStatelessModuleConfigV1<TCapabilities>;
  readonly typeWitness?: TTypes;
}

/**
 * Variance-erased module shapes used only as the composeModules constraint;
 * inference still preserves each module's precise type through the tuple.
 */
export interface AuthoringKitAnyStatefulModuleV1 {
  readonly kind: "kit_stateful_module";
  readonly id: ModuleId;
  readonly stateSlot: StateSlotId;
  readonly requires: CapabilityRequirementsV1;
  readonly initializesAfter: readonly string[];
  readonly provisions: readonly {
    readonly token: CapabilityTokenV1<unknown>;
    readonly createPort: (context: never) => unknown;
  }[];
  readonly config: {
    readonly id: string;
    readonly contractRevision: number;
    readonly state: {
      readonly slot: string;
      readonly schema: RuntimeSchemaV1<unknown>;
      readonly initial: (bootstrap: never) => unknown;
    };
    readonly commandSchema?: RuntimeSchemaV1<unknown>;
    readonly reducers: Readonly<Record<string, (state: never, event: never) => unknown>>;
    readonly invariants?: readonly {
      readonly check: (state: never, readPort: never) => unknown;
    }[];
  };
}

export interface AuthoringKitAnyStatelessModuleV1 {
  readonly kind: "kit_stateless_module";
  readonly id: ModuleId;
  readonly config: {
    readonly id: string;
    readonly contractRevision: number;
    readonly capabilities: unknown;
  };
}

export type AuthoringKitAnyModuleV1 =
  | AuthoringKitAnyStatefulModuleV1
  | AuthoringKitAnyStatelessModuleV1;

export type AuthoringKitBindingOfV1<TTypes extends GameSimulationTypeMapV1, TModule> =
  TModule extends AuthoringKitStatefulModuleV1<
    TTypes,
    infer TStateSlice,
    infer TModuleCommand,
    infer TRequires
  > ? AuthoringKitStatefulBindingV1<TTypes, TStateSlice, TModuleCommand, TRequires>
    : TModule extends AuthoringKitStatelessModuleV1<TTypes, infer TCapabilities>
      ? StatelessGameplayModuleBindingV1<TTypes, never, never, never, TCapabilities>
    : GameplayModuleBindingV1<TTypes>;

export type KitTransactionOutcomeV1<TTypes extends GameSimulationTypeMapV1> =
  | { readonly kind: "transaction_complete" }
  | { readonly kind: "transaction_reject"; readonly rejection: TTypes["rejection"] };

/**
 * The Story-facing transaction surface. The handler reads the command-start
 * immutable Snapshot, decides, and emits domain events; the engine folds the
 * admitted events through every declared reducer in one atomic commit while
 * validation, rejection, fault, and RNG/sequence rollback stay engine-owned.
 * `emit` never rejects — an event is a decided outcome, so every gameplay
 * refusal must happen before emission via `reject`.
 */
export interface KitTransactionV1<TTypes extends GameSimulationTypeMapV1> {
  read<TPort>(token: CapabilityTokenV1<TPort>): TPort;
  emit(event: TTypes["event"]): void;
  reject(rejection: TTypes["rejection"]): KitTransactionOutcomeV1<TTypes>;
  complete(): KitTransactionOutcomeV1<TTypes>;
}

export interface KitTransactionRunnerConfigV1<TTypes extends GameSimulationTypeMapV1> {
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  readonly eventSchema: RuntimeSchemaV1<TTypes["event"]>;
  createFault(cause: unknown): TTypes["fault"];
  validateCandidate?(state: DeepReadonly<TTypes["state"]>): readonly string[];
}

export type KitAttemptOfV1<TTypes extends GameSimulationTypeMapV1> =
  CommandExecutionAttemptEnvelopeV1<
    TTypes["snapshot"],
    TTypes["event"],
    TTypes["rejection"],
    TTypes["fault"],
    RngStateV1,
    RngDrawTraceV1
  >;

export interface KitTransactionRunnerV1<TTypes extends GameSimulationTypeMapV1> {
  execute(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    rng: RuleRngV1,
    run: (transaction: KitTransactionV1<TTypes>) => KitTransactionOutcomeV1<TTypes>,
  ): KitAttemptOfV1<TTypes>;
}

export interface AuthoringKitCompositionV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly AuthoringKitAnyModuleV1[],
> {
  readonly modules: {
    readonly [TIndex in keyof TModules]: AuthoringKitBindingOfV1<TTypes, TModules[TIndex]>;
  };
  createDependencyPortsFor<TRequires extends CapabilityRequirementsV1>(
    module: { readonly requires: TRequires; readonly id: ModuleId },
    state: DeepReadonly<TTypes["state"]>,
  ): DependencyPortsOfV1<TRequires>;
  readCapability<TPort>(
    consumer: { readonly requires: CapabilityRequirementsV1; readonly id: ModuleId },
    state: DeepReadonly<TTypes["state"]>,
    token: CapabilityTokenV1<TPort>,
  ): TPort;
  createTransactionRunner(
    config: KitTransactionRunnerConfigV1<TTypes>,
  ): KitTransactionRunnerV1<TTypes>;
}

function kitDiagnosticV1(
  code: string,
  message: string,
  subject: { readonly kind: string; readonly id: string },
  details: Readonly<Record<string, string>> = {},
): DiagnosticEnvelopeV1 {
  return createDiagnosticV1({ code, message, subject, details });
}

function readStateSlotV1(state: unknown, slot: string): unknown {
  let current = state;
  for (const property of slot.split(".")) {
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, property)) {
      throw new AuthoringDiagnosticErrorV1([
        kitDiagnosticV1(
          "authoring.capability.provider_state_missing",
          `State slot ${slot} is absent from aggregate State`,
          { kind: "state_slot", id: slot },
        ),
      ]);
    }
    current = Reflect.get(current, property);
  }
  return current;
}

function writeStateSlotV1(state: unknown, slot: string, value: unknown): unknown {
  const parts = slot.split(".");
  const set = (current: unknown, index: number): unknown => {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      throw new AuthoringDiagnosticErrorV1([
        kitDiagnosticV1(
          "authoring.capability.provider_state_missing",
          `State slot ${slot} is absent from aggregate State`,
          { kind: "state_slot", id: slot },
        ),
      ]);
    }
    const record = current as Readonly<Record<string, unknown>>;
    const key = parts[index] as string;
    if (!Object.hasOwn(record, key)) {
      throw new AuthoringDiagnosticErrorV1([
        kitDiagnosticV1(
          "authoring.capability.provider_state_missing",
          `State slot ${slot} is absent from aggregate State`,
          { kind: "state_slot", id: slot },
        ),
      ]);
    }
    return {
      ...record,
      [key]: index === parts.length - 1 ? value : set(record[key], index + 1),
    };
  };
  return set(state, 0);
}

function assertGraphIsDagV1(
  nodes: readonly ModuleId[],
  edges: ReadonlyMap<ModuleId, readonly ModuleId[]>,
  cycleCode: string,
  cycleMessage: (id: string) => string,
): readonly DiagnosticEnvelopeV1[] {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const active = new Set<ModuleId>();
  const complete = new Set<ModuleId>();
  const visit = (id: ModuleId): void => {
    if (active.has(id)) {
      diagnostics.push(kitDiagnosticV1(cycleCode, cycleMessage(id), { kind: "module", id }));
      return;
    }
    if (complete.has(id)) return;
    active.add(id);
    for (const next of edges.get(id) ?? []) visit(next);
    active.delete(id);
    complete.add(id);
  };
  for (const id of [...nodes].sort(compareUtf16CodeUnitsInternalV1)) visit(id);
  return diagnostics;
}

export interface GameAuthoringKitV1<TTypes extends GameSimulationTypeMapV1> {
  defineCapability<TPort>(id: string): CapabilityTokenV1<TPort>;
  defineStatefulModule<
    TStateSlice,
    TModuleCommand = never,
    TRequires extends CapabilityRequirementsV1 = Readonly<Record<never, never>>,
  >(
    config: AuthoringKitStatefulModuleConfigV1<
      TTypes,
      TStateSlice,
      TModuleCommand,
      TRequires
    >,
  ): AuthoringKitStatefulModuleV1<TTypes, TStateSlice, TModuleCommand, TRequires>;
  defineStatelessModule<TCapabilities>(
    config: AuthoringKitStatelessModuleConfigV1<TCapabilities>,
  ): AuthoringKitStatelessModuleV1<TTypes, TCapabilities>;
  composeModules<const TModules extends readonly AuthoringKitAnyModuleV1[]>(
    modules: TModules,
  ): AuthoringKitCompositionV1<TTypes, TModules>;
}

interface ErasedStatefulConfigV1 {
  readonly id: string;
  readonly contractRevision: number;
  readonly state: {
    readonly slot: string;
    readonly schema: RuntimeSchemaV1<unknown>;
    readonly initial: (bootstrap: never) => unknown;
  };
  readonly commandSchema?: RuntimeSchemaV1<unknown> | undefined;
  readonly requires?: CapabilityRequirementsV1 | undefined;
  readonly provides?:
    | ((provide: ProvideCapabilityV1<never>) => readonly CapabilityProvisionV1<never>[])
    | undefined;
  readonly initializesAfter?: readonly string[] | undefined;
  readonly reducers: Readonly<Record<string, (state: never, event: never) => unknown>>;
  readonly invariants?: readonly ModuleLocalInvariantV1<never, never>[] | undefined;
}

interface ErasedStatefulModuleV1 {
  readonly kind: "kit_stateful_module";
  readonly id: ModuleId;
  readonly stateSlot: StateSlotId;
  readonly requires: CapabilityRequirementsV1;
  readonly initializesAfter: readonly string[];
  readonly provisions: readonly CapabilityProvisionV1<never>[];
  readonly config: ErasedStatefulConfigV1;
}

interface ErasedStatelessModuleV1 {
  readonly kind: "kit_stateless_module";
  readonly id: ModuleId;
  readonly config: AuthoringKitStatelessModuleConfigV1<unknown>;
}

type ErasedModuleV1 = ErasedStatefulModuleV1 | ErasedStatelessModuleV1;

interface ErasedConsumerV1 {
  readonly requires: CapabilityRequirementsV1;
  readonly id: ModuleId;
}

interface ErasedTransactionSnapshotV1 {
  readonly state: unknown;
  readonly rng: RngStateV1;
  readonly commandSequence: number;
  readonly integrity: unknown;
}

interface ErasedRunnerConfigV1 {
  readonly stateSchema: RuntimeSchemaV1<unknown>;
  readonly eventSchema: RuntimeSchemaV1<unknown>;
  createFault(cause: unknown): unknown;
  validateCandidate?(state: never): readonly string[];
}

type ErasedTransactionOutcomeV1 =
  | { readonly kind: "transaction_complete"; readonly rejection?: undefined }
  | { readonly kind: "transaction_reject"; readonly rejection: unknown };

function validateReducerMapV1(
  reducers: unknown,
  moduleId: string,
): Readonly<Record<string, (state: never, event: never) => unknown>> {
  if (
    reducers === null ||
    typeof reducers !== "object" ||
    Array.isArray(reducers) ||
    Object.getPrototypeOf(reducers) !== Object.prototype
  ) {
    throw new AuthoringDiagnosticErrorV1([
      kitDiagnosticV1(
        "authoring.module.invalid_reducers",
        `module ${moduleId} must declare a plain reducers record`,
        { kind: "module", id: moduleId },
      ),
    ]);
  }
  for (const [kind, reducer] of Object.entries(reducers)) {
    if (kind.length === 0 || typeof reducer !== "function") {
      throw new AuthoringDiagnosticErrorV1([
        kitDiagnosticV1(
          "authoring.module.invalid_reducers",
          `module ${moduleId} reducer for kind ${JSON.stringify(kind)} must be a function`,
          { kind: "module", id: moduleId },
          { eventKind: kind },
        ),
      ]);
    }
  }
  return reducers as Readonly<Record<string, (state: never, event: never) => unknown>>;
}

export function createGameAuthoringKitV1<
  TTypes extends GameSimulationTypeMapV1,
>(): GameAuthoringKitV1<TTypes> {
  const issuedTokenIds = new Map<string, CapabilityTokenV1<unknown>>();

  function defineCapability(id: string): CapabilityTokenV1<unknown> {
    const parsedId = String(parseModuleId(id));
    const existing = issuedTokenIds.get(parsedId);
    if (existing !== undefined) {
      throw new AuthoringDiagnosticErrorV1([
        kitDiagnosticV1(
          "authoring.capability.duplicate_token",
          `capability token ${parsedId} is already defined`,
          { kind: "capability", id: parsedId },
        ),
      ]);
    }
    const token: CapabilityTokenV1<unknown> = Object.freeze({
      kind: "capability_token" as const,
      id: parsedId,
    });
    issuedTokenIds.set(parsedId, token);
    return token;
  }

  function defineStatefulModule(config: ErasedStatefulConfigV1): ErasedStatefulModuleV1 {
    const id = parseModuleId(config.id);
    const stateSlot = parseStateSlotId(config.state.slot);
    parsePositiveSafeInteger(config.contractRevision);
    validateReducerMapV1(config.reducers, String(id));
    const provide: ProvideCapabilityV1<never> = (token, createPort) =>
      Object.freeze({ token, createPort });
    const provisions = Object.freeze(
      config.provides === undefined ? [] : [...config.provides(provide)],
    );
    return Object.freeze({
      kind: "kit_stateful_module" as const,
      id,
      stateSlot,
      requires: Object.freeze({ ...config.requires }),
      initializesAfter: Object.freeze([...(config.initializesAfter ?? [])]),
      provisions,
      config,
    });
  }

  function defineStatelessModule(
    config: AuthoringKitStatelessModuleConfigV1<unknown>,
  ): ErasedStatelessModuleV1 {
    parsePositiveSafeInteger(config.contractRevision);
    return Object.freeze({
      kind: "kit_stateless_module" as const,
      id: parseModuleId(config.id),
      config,
    });
  }

  function composeModules(modules: readonly ErasedModuleV1[]) {
    const diagnostics: DiagnosticEnvelopeV1[] = [];
    const statefulModules = modules.filter(
      (module): module is ErasedStatefulModuleV1 => module.kind === "kit_stateful_module",
    );
    const moduleIds = new Set(modules.map((module) => module.id));

    const providersByToken = new Map<
      CapabilityTokenV1<unknown>,
      {
        readonly module: ErasedStatefulModuleV1;
        readonly provision: CapabilityProvisionV1<never>;
      }
    >();
    const providerTokenIds = new Map<string, CapabilityTokenV1<unknown>>();
    for (const module of statefulModules) {
      for (const provision of module.provisions) {
        const existingToken = providerTokenIds.get(provision.token.id);
        if (existingToken !== undefined && existingToken !== provision.token) {
          diagnostics.push(
            kitDiagnosticV1(
              "authoring.capability.duplicate_token",
              `two distinct capability tokens share the id ${provision.token.id}`,
              { kind: "capability", id: provision.token.id },
            ),
          );
          continue;
        }
        providerTokenIds.set(provision.token.id, provision.token);
        if (providersByToken.has(provision.token)) {
          diagnostics.push(
            kitDiagnosticV1(
              "authoring.capability.duplicate_provider",
              `capability ${provision.token.id} has more than one provider`,
              { kind: "capability", id: provision.token.id },
              { provider: String(module.id) },
            ),
          );
          continue;
        }
        providersByToken.set(provision.token, { module, provision });
      }
    }

    const capabilityEdges = new Map<ModuleId, readonly ModuleId[]>();
    for (const module of statefulModules) {
      const edges: ModuleId[] = [];
      for (const [name, token] of Object.entries(module.requires)) {
        const provider = providersByToken.get(token);
        if (provider === undefined) {
          diagnostics.push(
            kitDiagnosticV1(
              "authoring.capability.missing_provider",
              `capability ${token.id} required by ${String(module.id)} has no provider`,
              { kind: "capability", id: token.id },
              { consumer: String(module.id), binding: name },
            ),
          );
          continue;
        }
        edges.push(provider.module.id);
      }
      capabilityEdges.set(module.id, edges);
    }
    diagnostics.push(
      ...assertGraphIsDagV1(
        statefulModules.map((module) => module.id),
        capabilityEdges,
        "authoring.capability.dependency_cycle",
        (id) => `capability dependency cycle at ${id}`,
      ),
    );

    const lifecycleEdges = new Map<ModuleId, readonly ModuleId[]>();
    for (const module of statefulModules) {
      const edges: ModuleId[] = [];
      for (const after of module.initializesAfter) {
        const afterId = parseModuleId(after);
        if (!moduleIds.has(afterId)) {
          diagnostics.push(
            kitDiagnosticV1(
              "authoring.lifecycle.unknown_module",
              `initializesAfter references unknown module ${afterId}`,
              { kind: "module", id: String(module.id) },
              { initializesAfter: String(afterId) },
            ),
          );
          continue;
        }
        edges.push(afterId);
      }
      lifecycleEdges.set(module.id, edges);
    }
    diagnostics.push(
      ...assertGraphIsDagV1(
        statefulModules.map((module) => module.id),
        lifecycleEdges,
        "authoring.lifecycle.dependency_cycle",
        (id) => `lifecycle dependency cycle at ${id}`,
      ),
    );

    if (diagnostics.length > 0) {
      throw new AuthoringDiagnosticErrorV1(
        diagnostics,
        `module composition failed with ${diagnostics.length} diagnostic(s)`,
      );
    }

    const buildPort = (token: CapabilityTokenV1<unknown>, state: unknown): unknown => {
      const provider = providersByToken.get(token);
      if (provider === undefined) {
        throw new AuthoringDiagnosticErrorV1([
          kitDiagnosticV1(
            "authoring.capability.missing_provider",
            `capability ${token.id} has no provider`,
            { kind: "capability", id: token.id },
          ),
        ]);
      }
      const context: CapabilityProviderContextV1<never> = Object.freeze({
        readOwnState: () => readStateSlotV1(state, provider.module.stateSlot) as never,
      });
      return provider.provision.createPort(context);
    };

    const bindings = modules.map((module) => {
      if (module.kind === "kit_stateless_module") {
        return defineGameplayModule<TTypes>()({
          bindingKind: "stateless" as const,
          descriptor: {
            id: module.id,
            contractRevision: parsePositiveSafeInteger(module.config.contractRevision),
            stateSlots: [],
            dependencies: [],
          },
          commandSchema: null,
          querySchema: null,
          queryResultSchema: null,
          reducers: null,
          capabilities: module.config.capabilities as never,
        });
      }
      const config = module.config;
      const dependencies = [
        ...new Set(
          Object.values(module.requires).map((token) => {
            const provider = providersByToken.get(token);
            if (provider === undefined) {
              throw new TypeError("capability provider disappeared after validation");
            }
            return provider.module.id;
          }),
        ),
      ].sort(compareUtf16CodeUnitsInternalV1);
      return defineGameplayModule<TTypes>()({
        bindingKind: "stateful" as const,
        descriptor: {
          id: module.id,
          contractRevision: parsePositiveSafeInteger(config.contractRevision),
          stateSlots: [module.stateSlot],
          dependencies,
        },
        commandSchema: (config.commandSchema ?? null) as never,
        querySchema: null,
        queryResultSchema: null,
        stateSchema: config.state.schema as never,
        localInvariants: [...(config.invariants ?? [])] as never,
        reducers: config.reducers as never,
        queries: null,
        createInitialState: config.state.initial as never,
        createReadPort: ((state: never) => state) as never,
      });
    });

    const declaredTokensByModule = new Map<ModuleId, ReadonlySet<CapabilityTokenV1<unknown>>>(
      statefulModules.map((module) => [module.id, new Set(Object.values(module.requires))]),
    );

    // Fold order is deterministic: events in emission order, and for each
    // event every subscribed module in UTF-16 module-id order.
    const foldModulesOrdered = [...statefulModules].sort((left, right) =>
      compareUtf16CodeUnitsInternalV1(String(left.id), String(right.id))
    );

    const createDependencyPortsFor = (consumer: ErasedConsumerV1, state: unknown) => {
      const ports: Record<string, unknown> = {};
      for (const [name, token] of Object.entries(consumer.requires)) {
        ports[name] = buildPort(token, state);
      }
      return Object.freeze(ports);
    };

    const createTransactionRunner = (config: ErasedRunnerConfigV1) =>
      Object.freeze({
        execute(
          snapshot: ErasedTransactionSnapshotV1,
          rng: RuleRngV1,
          run: (transaction: never) => ErasedTransactionOutcomeV1,
        ) {
          const emitted: { readonly kind: string; readonly event: unknown }[] = [];
          // The transaction latches closed on the first reject/complete: a
          // handler (or leaked reference) touching it afterwards is a bug and
          // faults instead of silently extending a settled commit.
          let settled = false;
          const assertOpen = (operation: string): void => {
            if (!settled) return;
            throw new AuthoringDiagnosticErrorV1([
              kitDiagnosticV1(
                "authoring.transaction.settled",
                `transaction ${operation} was called after reject/complete settled it`,
                { kind: "transaction", id: operation },
              ),
            ]);
          };
          const transaction = Object.freeze({
            read: (token: CapabilityTokenV1<unknown>) => buildPort(token, snapshot.state),
            emit(event: unknown): void {
              assertOpen("emit");
              const parsed = config.eventSchema.parse(event);
              const kind = parsed === null || typeof parsed !== "object"
                ? undefined
                : Reflect.get(parsed, "kind");
              if (typeof kind !== "string" || kind.length === 0) {
                throw new AuthoringDiagnosticErrorV1([
                  kitDiagnosticV1(
                    "authoring.transaction.invalid_event",
                    "domain events must carry a non-empty string kind",
                    { kind: "event", id: "unknown" },
                  ),
                ]);
              }
              emitted.push({ kind, event: parsed });
            },
            reject(rejection: unknown) {
              assertOpen("reject");
              settled = true;
              return Object.freeze({ kind: "transaction_reject" as const, rejection });
            },
            complete() {
              assertOpen("complete");
              settled = true;
              return Object.freeze({ kind: "transaction_complete" as const });
            },
          });

          try {
            const outcome = run(transaction as never);
            if (outcome.kind === "transaction_reject") {
              return rejectAttemptV1(snapshot, rng, [outcome.rejection]);
            }
            if (outcome.kind !== "transaction_complete") {
              throw new TypeError("transaction run returned an invalid outcome");
            }
            let nextState: unknown = snapshot.state;
            const touched = new Set<ErasedStatefulModuleV1>();
            for (const { kind, event } of emitted) {
              for (const module of foldModulesOrdered) {
                const reducer = Object.hasOwn(module.config.reducers, kind)
                  ? module.config.reducers[kind]
                  : undefined;
                if (reducer === undefined) continue;
                const slice = readStateSlotV1(nextState, module.stateSlot);
                const reduced = reducer(slice as never, event as never);
                nextState = writeStateSlotV1(nextState, module.stateSlot, reduced);
                touched.add(module);
              }
            }
            // Touched slices validate once after the whole fold, not per
            // event: reducers are trusted Story code consuming events the
            // schema admitted at emit time, and an invalid intermediate value
            // still faults here before any commit.
            for (const module of foldModulesOrdered) {
              if (!touched.has(module)) continue;
              const slice = readStateSlotV1(nextState, module.stateSlot);
              const parsedSlice = module.config.state.schema.parse(slice);
              nextState = writeStateSlotV1(nextState, module.stateSlot, parsedSlice);
            }
            const candidateState = config.stateSchema.parse(nextState);
            const violations = config.validateCandidate?.(candidateState as never) ?? [];
            if (violations.length > 0) {
              throw new AuthoringDiagnosticErrorV1([
                kitDiagnosticV1(
                  "authoring.transaction.invariant_violation",
                  `transaction candidate violated ${violations.length} invariant(s)`,
                  { kind: "state", id: "candidate" },
                  { violations: violations.join(", ") },
                ),
              ]);
            }
            const next = Object.freeze({
              state: candidateState,
              rng: rng.candidateState(),
              commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
              integrity: snapshot.integrity,
            });
            return commitAttemptV1(
              snapshot,
              next as typeof snapshot,
              rng,
              emitted.map((entry) => entry.event),
            );
          } catch (error) {
            return faultAttemptV1(snapshot, rng, config.createFault(error));
          }
        },
      });

    return Object.freeze({
      modules: Object.freeze(bindings),
      createDependencyPortsFor,
      readCapability(
        consumer: ErasedConsumerV1,
        state: unknown,
        token: CapabilityTokenV1<unknown>,
      ) {
        const declared = declaredTokensByModule.get(consumer.id);
        if (declared === undefined || !declared.has(token)) {
          throw new AuthoringDiagnosticErrorV1([
            kitDiagnosticV1(
              "authoring.capability.undeclared_access",
              `module ${String(consumer.id)} did not declare capability ${token.id}`,
              { kind: "capability", id: token.id },
              { consumer: String(consumer.id) },
            ),
          ]);
        }
        return buildPort(token, state);
      },
      createTransactionRunner,
    });
  }

  return Object.freeze({
    defineCapability,
    defineStatefulModule,
    defineStatelessModule,
    composeModules,
  }) as unknown as GameAuthoringKitV1<TTypes>;
}
