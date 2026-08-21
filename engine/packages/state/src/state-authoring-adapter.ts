// SPDX-License-Identifier: MIT
import {
  parsePositiveSafeInteger,
  type DeepReadonly,
  type ModuleId,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  type AuthoringKitAnyStatefulModuleV1,
  type AuthoringKitStatefulModuleConfigV1,
  type CapabilityRequirementsV1,
  type KitTransactionOutcomeV1,
  type KitTransactionRunnerConfigV1,
  type KitTransactionV1,
} from "@sillymaker/base/authoring";

import type {
  StateAnyModuleV1,
  StateAuthoringKitV1,
  StateCapabilityRequirementsV1,
  StateCapabilityV1,
  StateDependencyPortsOfV1,
  StateModuleCompositionV1,
  StateModuleDefinitionV1,
  StateModuleBindingsOfV1,
  StateModuleV1,
  StateWorkflowDefinitionV1,
  StateWorkflowRngV1,
  StateWorkflowTypeMapV1,
  StateWorkflowV1,
} from "./state-authoring.ts";
import type { LegacyStateRuntimeTypeMapV1 } from "./legacy-adapter.ts";

type LegacyTypesForV1<TTypes extends StateWorkflowTypeMapV1> = LegacyStateRuntimeTypeMapV1<TTypes>;

// Package-local cold-path bridge to the one Base module used by composition;
// it carries no State, event journal, or Session authority.
const legacyStateModuleCarrierV1: unique symbol = Symbol("sillymaker.state.legacy-module");

function legacyStateModuleV1(module: StateAnyModuleV1): AuthoringKitAnyStatefulModuleV1 {
  const descriptor = Object.getOwnPropertyDescriptor(module, legacyStateModuleCarrierV1);
  const legacyModule: unknown = descriptor?.value;
  if (legacyModule === null || typeof legacyModule !== "object") {
    throw new TypeError("invalid neutral State module");
  }
  return legacyModule as AuthoringKitAnyStatefulModuleV1;
}

export function getStateModuleContractRevisionInternalV1(
  module: StateAnyModuleV1,
): PositiveSafeInteger {
  return parsePositiveSafeInteger(module.contractRevision);
}

export function createStateAuthoringBridgeInternalV1<
  TTypes extends StateWorkflowTypeMapV1,
>(): StateAuthoringKitV1<TTypes> {
  type TLegacyTypes = LegacyTypesForV1<TTypes>;
  const legacyKit = createGameAuthoringKitV1<TLegacyTypes>();

  // The runtime token is shared; only the package-local phantom witness differs.
  const defineCapability = <TPort>(id: string): StateCapabilityV1<TPort> =>
    legacyKit.defineCapability<TPort>(id) as StateCapabilityV1<TPort>;

  const defineModule = <
    TStateSlice,
    TRequires extends StateCapabilityRequirementsV1,
  >(
    definition: StateModuleDefinitionV1<TTypes, TStateSlice, TRequires>,
  ): StateModuleV1<TTypes, TStateSlice, TRequires> => {
    const contractRevision = parsePositiveSafeInteger(
      definition.contractRevision,
    );
    const admittedDefinition: StateModuleDefinitionV1<
      TTypes,
      TStateSlice,
      TRequires
    > = Object.freeze({
      id: definition.id,
      contractRevision,
      state: definition.state,
      ...(definition.requires === undefined ? {} : { requires: definition.requires }),
      ...(definition.provides === undefined ? {} : { provides: definition.provides }),
      ...(definition.initializesAfter === undefined
        ? {}
        : { initializesAfter: definition.initializesAfter }),
      reducers: definition.reducers,
    });
    const legacyConfig: AuthoringKitStatefulModuleConfigV1<
      TLegacyTypes,
      TStateSlice,
      never,
      TRequires
    > = {
      id: admittedDefinition.id,
      contractRevision,
      state: {
        slot: admittedDefinition.state.slot,
        schema: admittedDefinition.state.schema,
        initial() {
          return admittedDefinition.state.initial();
        },
      },
      ...(admittedDefinition.requires === undefined
        ? {}
        : { requires: admittedDefinition.requires }),
      ...(admittedDefinition.provides === undefined
        ? {}
        : { provides: admittedDefinition.provides }),
      ...(admittedDefinition.initializesAfter === undefined
        ? {}
        : { initializesAfter: admittedDefinition.initializesAfter }),
      reducers: admittedDefinition.reducers,
    };
    Object.freeze(legacyConfig);
    const legacyModule = legacyKit.defineStatefulModule(legacyConfig);
    const module: StateModuleV1<
      TTypes,
      TStateSlice,
      TRequires
    > = {
      id: legacyModule.id,
      contractRevision,
      stateSlot: legacyModule.stateSlot,
      requires: legacyModule.requires,
      initializesAfter: legacyModule.initializesAfter,
    };
    Object.defineProperty(module, legacyStateModuleCarrierV1, {
      value: legacyModule,
      configurable: false,
      enumerable: false,
      writable: false,
    });
    return Object.freeze(module);
  };

  const composeModules = <const TModules extends readonly StateAnyModuleV1[]>(
    modules: TModules,
  ): StateModuleCompositionV1<TTypes, TModules> => {
    const legacyComposition = legacyKit.composeModules(modules.map(legacyStateModuleV1));
    // Keep the physical bindings for the legacy adapter while exposing only
    // the neutral descriptor tuple. Tuple cardinality is the erased detail.
    const bindings = legacyComposition.modules as unknown as StateModuleBindingsOfV1<TModules>;
    const composition: StateModuleCompositionV1<TTypes, TModules> = Object.freeze({
      modules: bindings,
      createDependencyPortsFor<TRequires extends StateCapabilityRequirementsV1>(
        module: { readonly requires: TRequires; readonly id: ModuleId },
        state: DeepReadonly<TTypes["state"]>,
      ): StateDependencyPortsOfV1<TRequires> {
        const legacyConsumer: {
          readonly requires: CapabilityRequirementsV1;
          readonly id: ModuleId;
        } = { id: module.id, requires: module.requires };
        return legacyComposition.createDependencyPortsFor(
          legacyConsumer,
          state,
        ) as StateDependencyPortsOfV1<TRequires>;
      },
      readCapability<TPort>(
        consumer: { readonly requires: StateCapabilityRequirementsV1; readonly id: ModuleId },
        state: DeepReadonly<TTypes["state"]>,
        token: StateCapabilityV1<TPort>,
      ): TPort {
        const legacyConsumer: {
          readonly requires: CapabilityRequirementsV1;
          readonly id: ModuleId;
        } = { id: consumer.id, requires: consumer.requires };
        return legacyComposition.readCapability(
          legacyConsumer,
          state,
          token,
        );
      },
      createWorkflow(
        definition: StateWorkflowDefinitionV1<TTypes>,
      ): StateWorkflowV1<TTypes> {
        const validateCandidate = definition.validateCandidate;
        const runnerConfig: KitTransactionRunnerConfigV1<TLegacyTypes> = {
          stateSchema: definition.stateSchema,
          eventSchema: definition.eventSchema,
          createFault(cause) {
            return definition.createFault(cause);
          },
          ...(validateCandidate === undefined ? {} : {
            validateCandidate(state) {
              return validateCandidate.call(definition, state);
            },
          }),
        };
        const runner = legacyComposition.createTransactionRunner(runnerConfig);
        // This is the exact Base transaction object. Only the neutral/Base
        // module type witnesses differ, so no transaction wrapper or authority
        // is created in the command path.
        const run = definition.run as unknown as (
          transaction: KitTransactionV1<TLegacyTypes>,
        ) => KitTransactionOutcomeV1<TLegacyTypes>;
        const workflow: StateWorkflowV1<TTypes> = Object.freeze({
          execute(
            snapshot: DeepReadonly<TTypes["snapshot"]>,
            rng: StateWorkflowRngV1,
          ) {
            return runner.execute(snapshot, rng, run);
          },
        });
        return workflow;
      },
    });
    return composition;
  };

  const kit: StateAuthoringKitV1<TTypes> = Object.freeze({
    defineCapability,
    defineModule,
    composeModules,
  });
  return kit;
}
