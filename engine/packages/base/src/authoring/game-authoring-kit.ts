// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "../contracts/diagnostic-envelope.js";
import {
  AuthoringDiagnosticErrorV1,
  createDiagnosticV1,
} from "../contracts/diagnostic-envelope.js";
import type {
  GameplayModuleBindingV1,
  GameSimulationTypeMapV1,
  ModuleLocalInvariantV1,
  ModuleOwnerProposalEnvelopeV1,
  ModuleProposalResultV1,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
} from "../contracts/gameplay-module.js";
import type { DeepReadonly, ModuleId, RuntimeSchemaV1, StateSlotId } from "../contracts/values.js";
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "../contracts/values.js";
import { defineGameplayModule } from "./define-gameplay-module.js";

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
  readonly [TKey in keyof TRequires]: TRequires[TKey] extends CapabilityTokenV1<infer TPort>
    ? TPort
    : never;
};

export type ProvideCapabilityV1<TStateSlice> = <TPort>(
  token: CapabilityTokenV1<TPort>,
  createPort: (context: CapabilityProviderContextV1<TStateSlice>) => TPort,
) => CapabilityProvisionV1<TStateSlice>;

export interface AuthoringKitStatefulOwnerV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TOwnerOperation,
  TRequires extends CapabilityRequirementsV1,
> {
  readonly operationSchema: RuntimeSchemaV1<TOwnerOperation>;
  readonly proposalSchema?: RuntimeSchemaV1<
    ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TTypes["fact"]>
  >;
  propose(
    state: DeepReadonly<TStateSlice>,
    operation: DeepReadonly<TOwnerOperation>,
    dependencies: DependencyPortsOfV1<TRequires>,
  ): ModuleProposalResultV1<
    ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TTypes["fact"]>,
    TTypes["rejection"]
  >;
  apply(
    state: DeepReadonly<TStateSlice>,
    proposal: DeepReadonly<ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TTypes["fact"]>>,
  ): TStateSlice;
  readonly invariants?: readonly ModuleLocalInvariantV1<TStateSlice, DeepReadonly<TStateSlice>>[];
}

export interface AuthoringKitStatefulModuleConfigV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TOwnerOperation,
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
  readonly owner: AuthoringKitStatefulOwnerV1<TTypes, TStateSlice, TOwnerOperation, TRequires>;
}

export type AuthoringKitStatefulBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TOwnerOperation,
  TModuleCommand,
  TRequires extends CapabilityRequirementsV1,
> = StatefulGameplayModuleBindingV1<
  TTypes,
  TStateSlice,
  TModuleCommand,
  never,
  never,
  TOwnerOperation,
  ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TTypes["fact"]>,
  DeepReadonly<TStateSlice>,
  DependencyPortsOfV1<TRequires>
>;

export interface AuthoringKitStatefulModuleV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TOwnerOperation,
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
    TOwnerOperation,
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
    readonly owner: {
      readonly operationSchema: RuntimeSchemaV1<unknown>;
      readonly proposalSchema?: RuntimeSchemaV1<unknown>;
      readonly propose: (state: never, operation: never, dependencies: never) => unknown;
      readonly apply: (state: never, proposal: never) => unknown;
      readonly invariants?: readonly {
        readonly check: (state: never, readPort: never) => unknown;
      }[];
    };
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
  AuthoringKitAnyStatefulModuleV1 | AuthoringKitAnyStatelessModuleV1;

export type AuthoringKitBindingOfV1<TTypes extends GameSimulationTypeMapV1, TModule> =
  TModule extends AuthoringKitStatefulModuleV1<
    TTypes,
    infer TStateSlice,
    infer TOwnerOperation,
    infer TModuleCommand,
    infer TRequires
  >
    ? AuthoringKitStatefulBindingV1<TTypes, TStateSlice, TOwnerOperation, TModuleCommand, TRequires>
    : TModule extends AuthoringKitStatelessModuleV1<TTypes, infer TCapabilities>
      ? StatelessGameplayModuleBindingV1<TTypes, never, never, never, TCapabilities>
      : GameplayModuleBindingV1<TTypes>;

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
  for (const id of [...nodes].sort((left, right) => left.localeCompare(right))) visit(id);
  return diagnostics;
}

export interface GameAuthoringKitV1<TTypes extends GameSimulationTypeMapV1> {
  defineCapability<TPort>(id: string): CapabilityTokenV1<TPort>;
  defineStatefulModule<
    TStateSlice,
    TOwnerOperation,
    TModuleCommand = never,
    TRequires extends CapabilityRequirementsV1 = Readonly<Record<never, never>>,
  >(
    config: AuthoringKitStatefulModuleConfigV1<
      TTypes,
      TStateSlice,
      TOwnerOperation,
      TModuleCommand,
      TRequires
    >,
  ): AuthoringKitStatefulModuleV1<TTypes, TStateSlice, TOwnerOperation, TModuleCommand, TRequires>;
  defineStatelessModule<TCapabilities>(
    config: AuthoringKitStatelessModuleConfigV1<TCapabilities>,
  ): AuthoringKitStatelessModuleV1<TTypes, TCapabilities>;
  composeModules<const TModules extends readonly AuthoringKitAnyModuleV1[]>(
    modules: TModules,
  ): AuthoringKitCompositionV1<TTypes, TModules>;
}

function deriveProposalSchemaV1<TOwnerOperation, TFact>(
  operationSchema: RuntimeSchemaV1<TOwnerOperation>,
): RuntimeSchemaV1<ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TFact>> {
  return Object.freeze({
    parse(value: unknown): ModuleOwnerProposalEnvelopeV1<TOwnerOperation, TFact> {
      if (value === null || typeof value !== "object") {
        throw new TypeError("invalid owner proposal");
      }
      const payload = operationSchema.parse(Reflect.get(value, "payload"));
      const facts = Reflect.get(value, "facts");
      if (!Array.isArray(facts)) throw new TypeError("invalid owner proposal facts");
      return Object.freeze({
        payload,
        facts: Object.freeze([...facts]) as readonly TFact[],
      });
    },
  });
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
    ((provide: ProvideCapabilityV1<never>) => readonly CapabilityProvisionV1<never>[]) | undefined;
  readonly initializesAfter?: readonly string[] | undefined;
  readonly owner: {
    readonly operationSchema: RuntimeSchemaV1<unknown>;
    readonly proposalSchema?: RuntimeSchemaV1<unknown> | undefined;
    readonly propose: (state: never, operation: never, dependencies: never) => unknown;
    readonly apply: (state: never, proposal: never) => unknown;
    readonly invariants?: readonly ModuleLocalInvariantV1<never, never>[] | undefined;
  };
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
          ownerOperationSchema: null,
          ownerProposalSchema: null,
          owner: null,
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
      ].sort((left, right) => left.localeCompare(right));
      const proposalSchema =
        config.owner.proposalSchema ?? deriveProposalSchemaV1(config.owner.operationSchema);
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
        ownerOperationSchema: config.owner.operationSchema as never,
        ownerProposalSchema: proposalSchema as never,
        localInvariants: [...(config.owner.invariants ?? [])] as never,
        owner: {
          propose: config.owner.propose as never,
          apply: config.owner.apply as never,
        },
        queries: null,
        createInitialState: config.state.initial as never,
        createReadPort: ((state: never) => state) as never,
      });
    });

    const declaredTokensByModule = new Map<ModuleId, ReadonlySet<CapabilityTokenV1<unknown>>>(
      statefulModules.map((module) => [module.id, new Set(Object.values(module.requires))]),
    );

    return Object.freeze({
      modules: Object.freeze(bindings),
      createDependencyPortsFor(consumer: ErasedConsumerV1, state: unknown) {
        const ports: Record<string, unknown> = {};
        for (const [name, token] of Object.entries(consumer.requires)) {
          ports[name] = buildPort(token, state);
        }
        return Object.freeze(ports);
      },
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
    });
  }

  return Object.freeze({
    defineCapability,
    defineStatefulModule,
    defineStatelessModule,
    composeModules,
  }) as unknown as GameAuthoringKitV1<TTypes>;
}
