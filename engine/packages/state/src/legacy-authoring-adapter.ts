// SPDX-License-Identifier: MIT
import type {
  GameSimulationTypeMapV1,
  GameplayModuleBindingV1,
  GameplayModuleDescriptorV1,
  RuntimeSchemaV1,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
} from "@sillymaker/base";
import { defineGameplayModule } from "@sillymaker/base/authoring";

import type {
  StateAnyModuleV1,
  StateModuleBindingV1,
  StateModuleCompositionV1,
  StateWorkflowTypeMapV1,
} from "./state-authoring.ts";

type ErasedStatefulGameplayModuleBindingV1 = StatefulGameplayModuleBindingV1<
  GameSimulationTypeMapV1,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

type ErasedStatelessGameplayModuleBindingV1 = StatelessGameplayModuleBindingV1<
  GameSimulationTypeMapV1,
  unknown,
  unknown,
  unknown,
  unknown
>;

type ErasedGameplayModuleBindingV1 =
  | ErasedStatefulGameplayModuleBindingV1
  | ErasedStatelessGameplayModuleBindingV1;

export type LegacyGameplayModuleBindingV1<
  TTypes extends StateWorkflowTypeMapV1 & GameSimulationTypeMapV1,
> = GameplayModuleBindingV1<
  TTypes,
  unknown,
  TTypes["command"]
>;

export type LegacyGameplayModuleBindingTupleV1<
  TTypes extends StateWorkflowTypeMapV1 & GameSimulationTypeMapV1,
  TModules extends readonly StateAnyModuleV1[],
> = {
  readonly [TIndex in keyof TModules]: LegacyGameplayModuleBindingV1<TTypes>;
};

const defineErasedGameplayModuleV1 = defineGameplayModule<GameSimulationTypeMapV1>();

function admitSourceBindingV1(binding: StateModuleBindingV1): ErasedGameplayModuleBindingV1 {
  if (binding === null || typeof binding !== "object" || Array.isArray(binding)) {
    throw new TypeError("invalid GameplayModule binding");
  }
  const bindingKindDescriptor = Object.getOwnPropertyDescriptor(binding, "bindingKind");
  if (bindingKindDescriptor?.get !== undefined || bindingKindDescriptor?.set !== undefined) {
    throw new TypeError("authoring accessors are forbidden");
  }
  const bindingKind = bindingKindDescriptor?.value;
  if (bindingKind === "stateful") {
    return defineErasedGameplayModuleV1(
      binding as unknown as ErasedStatefulGameplayModuleBindingV1,
    );
  }
  if (bindingKind === "stateless") {
    return defineErasedGameplayModuleV1(
      binding as unknown as ErasedStatelessGameplayModuleBindingV1,
    );
  }
  throw new TypeError("invalid GameplayModule bindingKind");
}

function copyDescriptorV1(
  descriptor: GameplayModuleDescriptorV1,
): GameplayModuleDescriptorV1 {
  return {
    id: descriptor.id,
    contractRevision: descriptor.contractRevision,
    stateSlots: [...descriptor.stateSlots],
    dependencies: [...descriptor.dependencies],
  };
}

function rebuildBindingV1(
  source: ErasedGameplayModuleBindingV1,
  commandSchema: RuntimeSchemaV1<unknown>,
): ErasedGameplayModuleBindingV1 {
  if (source.bindingKind === "stateful") {
    return defineErasedGameplayModuleV1({
      bindingKind: "stateful",
      descriptor: copyDescriptorV1(source.descriptor),
      commandSchema,
      querySchema: source.querySchema,
      queryResultSchema: source.queryResultSchema,
      stateSchema: source.stateSchema,
      localInvariants: [...source.localInvariants],
      reducers: source.reducers,
      queries: source.queries,
      createInitialState: source.createInitialState,
      createReadPort: source.createReadPort,
    });
  }
  return defineErasedGameplayModuleV1({
    bindingKind: "stateless",
    descriptor: copyDescriptorV1(source.descriptor),
    commandSchema,
    querySchema: source.querySchema,
    queryResultSchema: source.queryResultSchema,
    reducers: null,
    capabilities: source.capabilities,
  });
}

/**
 * Re-admits neutral State bindings for a legacy GameSimulation, attaching its
 * aggregate command Schema without relying on property enumeration.
 */
export function createLegacyGameplayModuleBindingsV1<
  TTypes extends StateWorkflowTypeMapV1 & GameSimulationTypeMapV1,
  const TModules extends readonly StateAnyModuleV1[],
>(
  composition: StateModuleCompositionV1<TTypes, TModules>,
  commandSchema: RuntimeSchemaV1<TTypes["command"]>,
): LegacyGameplayModuleBindingTupleV1<TTypes, TModules>;
export function createLegacyGameplayModuleBindingsV1(
  composition: { readonly modules: readonly StateModuleBindingV1[] },
  commandSchema: RuntimeSchemaV1<unknown>,
): readonly unknown[] {
  return Object.freeze(
    composition.modules.map((binding) =>
      rebuildBindingV1(admitSourceBindingV1(binding), commandSchema)
    ),
  );
}
