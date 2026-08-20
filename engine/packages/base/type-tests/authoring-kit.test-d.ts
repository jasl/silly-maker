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

type KitWitnessEventV1 =
  | { readonly kind: "witness.item_stored"; readonly items: number }
  | { readonly kind: "witness.sale_closed"; readonly sales: number };

interface KitWitnessTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    KitWitnessStateV1,
    { readonly cursor: number }
  > {
  readonly command: { readonly kind: "witness.kit" };
  readonly event: KitWitnessEventV1;
  readonly rejection: { readonly code: string };
}

interface StorageReadPortV1 {
  itemCount(): number;
}

declare const storageStateSchemaV1: RuntimeSchemaV1<{ readonly items: number }>;
declare const shopStateSchemaV1: RuntimeSchemaV1<{ readonly sales: number }>;

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
  reducers: {
    // state is the module's own slice; event narrows to the keyed kind.
    "witness.item_stored": (state, event) => ({ items: state.items + event.items }),
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
  reducers: {
    "witness.sale_closed": (_state, event) => ({ sales: event.sales }),
  },
});

export const compositionV1 = kit.composeModules([storageModuleV1, shopModuleV1]);

declare const witnessStateV1: KitWitnessStateV1;
export const inferredPortsV1: { readonly storage: StorageReadPortV1 } = compositionV1
  .createDependencyPortsFor(shopModuleV1, witnessStateV1);
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
  reducers: {},
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
  reducers: {},
});

export const wrongReducerKindV1 = kit.defineStatefulModule({
  id: "kit.broken-reducer-kind",
  contractRevision: 1,
  state: {
    slot: "simulation.storage",
    schema: storageStateSchemaV1,
    initial: () => ({ items: 0 }),
  },
  reducers: {
    // @ts-expect-error reducer keys must be declared domain-event kinds
    "witness.unknown_kind": (state: { readonly items: number }) => state,
  },
});

export const wrongReducerReturnV1 = kit.defineStatefulModule({
  id: "kit.broken-reducer-return",
  contractRevision: 1,
  state: {
    slot: "simulation.storage",
    schema: storageStateSchemaV1,
    initial: () => ({ items: 0 }),
  },
  reducers: {
    // @ts-expect-error a reducer must return the module's own slice shape
    "witness.item_stored": () => ({ sales: 0 }),
  },
});
