// SPDX-License-Identifier: MIT
import type {
  CapabilityTokenV1,
  DependencyPortsOfV1,
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createGameAuthoringKitV1 } from "@sillymaker/base";

interface KitWitnessStateV1 {
  readonly simulation: {
    readonly storage: { readonly items: number };
    readonly shop: { readonly sales: number };
  };
}

interface KitWitnessTypesV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  KitWitnessStateV1,
  { readonly cursor: number }
> {
  readonly command: { readonly kind: "witness.kit" };
  readonly fact: { readonly kind: "witness.fact" };
  readonly rejection: { readonly code: string };
}

interface StorageReadPortV1 {
  itemCount(): number;
}

declare const storageStateSchemaV1: RuntimeSchemaV1<{ readonly items: number }>;
declare const shopStateSchemaV1: RuntimeSchemaV1<{ readonly sales: number }>;
declare const operationSchemaV1: RuntimeSchemaV1<{ readonly kind: "noop" }>;

const kit = createGameAuthoringKitV1<KitWitnessTypesV1>();
const storageRead = kit.defineCapability<StorageReadPortV1>("capability.storage.read");

export const storageModuleV1 = kit.defineStatefulModule({
  id: "kit.storage",
  contractRevision: 1,
  state: {
    slot: "simulation.storage",
    schema: storageStateSchemaV1,
    initial: () => ({ items: 0 }),
  },
  provides: (provide) => [
    provide(storageRead, ({ readOwnState }) => ({
      // readOwnState is typed as the module's own slice; no annotation needed.
      itemCount: () => readOwnState().items,
    })),
  ],
  owner: {
    operationSchema: operationSchemaV1,
    propose: (_state, _operation, _dependencies) => ({
      kind: "proposed" as const,
      proposal: { payload: { kind: "noop" as const }, facts: [] },
    }),
    apply: (state) => ({ items: state.items }),
  },
});

export const shopModuleV1 = kit.defineStatefulModule({
  id: "kit.shop",
  contractRevision: 1,
  state: {
    slot: "simulation.shop",
    schema: shopStateSchemaV1,
    initial: () => ({ sales: 0 }),
  },
  requires: { storage: storageRead },
  owner: {
    operationSchema: operationSchemaV1,
    propose: (_state, _operation, dependencies) => {
      // The dependency port is inferred from the requires declaration.
      const observed: number = dependencies.storage.itemCount();
      return {
        kind: "proposed" as const,
        proposal: { payload: { kind: "noop" as const }, facts: [] },
        observedWitness: observed,
      };
    },
    apply: (state) => ({ sales: state.sales }),
  },
});

export const compositionV1 = kit.composeModules([storageModuleV1, shopModuleV1]);

declare const witnessStateV1: KitWitnessStateV1;
export const inferredPortsV1: { readonly storage: StorageReadPortV1 } =
  compositionV1.createDependencyPortsFor(shopModuleV1, witnessStateV1);
export const inferredPortResultV1: number = inferredPortsV1.storage.itemCount();
export const inferredReadCapabilityV1: StorageReadPortV1 = compositionV1.readCapability(
  shopModuleV1,
  witnessStateV1,
  storageRead,
);

export type InferredDependencyPortsV1 = DependencyPortsOfV1<{
  readonly storage: CapabilityTokenV1<StorageReadPortV1>;
}>;
export const dependencyPortsWitnessV1: InferredDependencyPortsV1 = inferredPortsV1;

export const wrongPortShapeV1 = kit.defineStatefulModule({
  id: "kit.broken-provider",
  contractRevision: 1,
  state: {
    slot: "simulation.storage",
    schema: storageStateSchemaV1,
    initial: () => ({ items: 0 }),
  },
  provides: (provide) => [
    // @ts-expect-error the provider factory must return the token's port type
    provide(storageRead, () => ({ wrongShape: true })),
  ],
  owner: {
    operationSchema: operationSchemaV1,
    propose: () => ({
      kind: "proposed" as const,
      proposal: { payload: { kind: "noop" as const }, facts: [] },
    }),
    apply: (state) => ({ items: state.items }),
  },
});

export const wrongRequiresV1 = kit.defineStatefulModule({
  id: "kit.broken-consumer",
  contractRevision: 1,
  state: {
    slot: "simulation.shop",
    schema: shopStateSchemaV1,
    initial: () => ({ sales: 0 }),
  },
  // @ts-expect-error requires entries must be capability tokens
  requires: { storage: "capability.storage.read" },
  owner: {
    operationSchema: operationSchemaV1,
    propose: () => ({
      kind: "proposed" as const,
      proposal: { payload: { kind: "noop" as const }, facts: [] },
    }),
    apply: (state) => ({ sales: state.sales }),
  },
});
