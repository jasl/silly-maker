// SPDX-License-Identifier: MIT
import {
  parsePositiveSafeInteger,
  type DeepReadonly,
  type ModuleId,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  type AuthoringKitAnyModuleV1,
  type AuthoringKitStatefulModuleConfigV1,
  type CapabilityRequirementsV1,
  type CapabilityTokenV1,
  type KitTransactionOutcomeV1,
  type KitTransactionRunnerConfigV1,
  type KitTransactionV1,
} from "@sillymaker/base/authoring";

import type {
  StateAnyModuleV1,
  StateAuthoringKitV1,
  StateCapabilityRequirementsV1,
  StateCapabilityV1,
  StateModuleCompositionV1,
  StateModuleDefinitionV1,
  StateModuleV1,
  StateWorkflowDefinitionV1,
  StateWorkflowRngV1,
  StateWorkflowTypeMapV1,
  StateWorkflowV1,
} from "./state-authoring.ts";
import type { LegacyStateRuntimeTypeMapV1 } from "./legacy-adapter.ts";

type LegacyTypesForV1<TTypes extends StateWorkflowTypeMapV1> = LegacyStateRuntimeTypeMapV1<TTypes>;

export function getStateModuleContractRevisionInternalV1(
  module: StateAnyModuleV1,
): PositiveSafeInteger {
  const carrier = module as unknown as {
    readonly config?: { readonly contractRevision?: unknown };
  };
  return parsePositiveSafeInteger(carrier.config?.contractRevision);
}

export function createStateAuthoringBridgeInternalV1<
  TTypes extends StateWorkflowTypeMapV1,
>(): StateAuthoringKitV1<TTypes> {
  type TLegacyTypes = LegacyTypesForV1<TTypes>;
  const legacyKit = createGameAuthoringKitV1<TLegacyTypes>();

  const defineCapability = <TPort>(id: string): StateCapabilityV1<TPort> =>
    legacyKit.defineCapability<TPort>(id) as StateCapabilityV1<TPort>;

  const defineModule = <
    TStateSlice,
    TOwnerOperation,
    TRequires extends StateCapabilityRequirementsV1,
  >(
    definition: StateModuleDefinitionV1<TTypes, TStateSlice, TOwnerOperation, TRequires>,
  ): StateModuleV1<TTypes, TStateSlice, TOwnerOperation, TRequires> => {
    const contractRevision = parsePositiveSafeInteger(
      definition.contractRevision,
    );
    const admittedDefinition = Object.freeze({
      ...definition,
      contractRevision,
    });
    const module = legacyKit.defineStatefulModule<
      TStateSlice,
      TOwnerOperation,
      never,
      CapabilityRequirementsV1
    >(
      admittedDefinition as unknown as AuthoringKitStatefulModuleConfigV1<
        TLegacyTypes,
        TStateSlice,
        TOwnerOperation,
        never,
        CapabilityRequirementsV1
      >,
    ) as unknown as StateModuleV1<TTypes, TStateSlice, TOwnerOperation, TRequires>;
    return module;
  };

  const composeModules = <const TModules extends readonly StateAnyModuleV1[]>(
    modules: TModules,
  ): StateModuleCompositionV1<TTypes, TModules> => {
    const legacyComposition = legacyKit.composeModules(
      modules as unknown as readonly AuthoringKitAnyModuleV1[],
    );
    return Object.freeze({
      modules: legacyComposition.modules,
      createDependencyPortsFor(
        module: { readonly requires: StateCapabilityRequirementsV1; readonly id: ModuleId },
        state: DeepReadonly<TTypes["state"]>,
      ) {
        return legacyComposition.createDependencyPortsFor(
          module as unknown as {
            readonly requires: CapabilityRequirementsV1;
            readonly id: ModuleId;
          },
          state,
        );
      },
      readCapability(
        consumer: { readonly requires: StateCapabilityRequirementsV1; readonly id: ModuleId },
        state: DeepReadonly<TTypes["state"]>,
        token: StateCapabilityV1<unknown>,
      ) {
        return legacyComposition.readCapability(
          consumer as unknown as {
            readonly requires: CapabilityRequirementsV1;
            readonly id: ModuleId;
          },
          state,
          token as CapabilityTokenV1<unknown>,
        );
      },
      createWorkflow(
        definition: StateWorkflowDefinitionV1<TTypes>,
      ): StateWorkflowV1<TTypes> {
        const runner = legacyComposition.createTransactionRunner(
          definition as unknown as KitTransactionRunnerConfigV1<TLegacyTypes>,
        );
        return Object.freeze({
          execute(
            snapshot: DeepReadonly<TTypes["snapshot"]>,
            rng: StateWorkflowRngV1,
          ) {
            return runner.execute(
              snapshot,
              rng,
              definition.run as unknown as (
                transaction: KitTransactionV1<TLegacyTypes>,
              ) => KitTransactionOutcomeV1<TLegacyTypes>,
            );
          },
        }) as StateWorkflowV1<TTypes>;
      },
    }) as StateModuleCompositionV1<TTypes, TModules>;
  };

  return Object.freeze({ defineCapability, defineModule, composeModules }) as StateAuthoringKitV1<
    TTypes
  >;
}
