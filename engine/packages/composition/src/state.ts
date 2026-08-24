// SPDX-License-Identifier: MIT
import {
  getStateModuleContractRevisionV1,
  type StateAnyModuleV1,
  type StateAuthoringKitV1,
  type StateModuleCompositionV1,
  type StateWorkflowTypeMapV1,
} from "@sillymaker/state";

import {
  CompositionErrorV1,
  createCompositionRegistryTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "./contracts.ts";
import type {
  CompositionPluginV1,
  CompositionProfileV1,
  CompositionServiceTokenV1,
  CompositionSnapshotV1,
} from "./contracts.ts";
import { compileLegacyApplicationFactoryV1 } from "./legacy-application.ts";
import type { LegacyApplicationFactoryV1, LegacyApplicationLeaseV1 } from "./legacy-application.ts";

const stateModulesV1 = createCompositionRegistryTokenV1<StateAnyModuleV1>(
  "sillymaker.state.modules",
);

/** Adapts one neutral State module to one deterministic registry contribution. */
export function defineStateModulePluginV1(
  module: StateAnyModuleV1,
): CompositionPluginV1 {
  const id = String(module.id);
  return defineCompositionPluginV1({
    id,
    revision: getStateModuleContractRevisionV1(module),
    contributes: [{ token: stateModulesV1, id }],
    setup(scope) {
      scope.contribute(stateModulesV1, { id, value: module });
    },
  });
}

export interface StateCompositionProfileOptionsV1 {
  readonly id: string;
  readonly modules: readonly StateAnyModuleV1[];
  readonly plugins?: readonly CompositionPluginV1[];
}

/** State module profiles are authoritative and permanently seal when mounted. */
export function defineStateCompositionProfileV1(
  options: StateCompositionProfileOptionsV1,
): CompositionProfileV1 {
  return defineCompositionProfileV1({
    id: options.id,
    kind: "authoritative",
    plugins: [
      ...options.modules.map(defineStateModulePluginV1),
      ...(options.plugins ?? []),
    ],
  });
}

/**
 * Resolves the State registry once, before Session creation, and returns the
 * direct StateAuthoringKit composition with no Context or registry hot-path
 * lookup.
 */
export function compileStateModuleCompositionV1<
  TTypes extends StateWorkflowTypeMapV1,
>(
  snapshot: CompositionSnapshotV1,
  authoringKit: StateAuthoringKitV1<TTypes>,
): StateModuleCompositionV1<TTypes, readonly StateAnyModuleV1[]> {
  if (snapshot.bootDiagnostic.kind !== "authoritative") {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      "State module composition requires an authoritative profile",
    );
  }
  return snapshot.compileDirectPlan((resolver) => {
    const modules = resolver.contributions(stateModulesV1).map(({ value }) => value);
    return authoringKit.composeModules(modules);
  });
}

export interface StateApplicationActivationV1<
  TTypes extends StateWorkflowTypeMapV1,
  TApplication,
> {
  readonly stateComposition: StateModuleCompositionV1<
    TTypes,
    readonly StateAnyModuleV1[]
  >;
  readonly lease: LegacyApplicationLeaseV1<TApplication>;
}

/**
 * Compiles the direct State plan before activating and creating the one legacy
 * application lease. The lease remains the sole application/Session owner.
 */
export async function activateStateApplicationV1<
  TTypes extends StateWorkflowTypeMapV1,
  TApplication,
>(
  snapshot: CompositionSnapshotV1,
  authoringKit: StateAuthoringKitV1<TTypes>,
  factoryToken: CompositionServiceTokenV1<
    LegacyApplicationFactoryV1<TApplication>
  >,
): Promise<StateApplicationActivationV1<TTypes, TApplication>> {
  const stateComposition = compileStateModuleCompositionV1(
    snapshot,
    authoringKit,
  );
  const factory = compileLegacyApplicationFactoryV1(snapshot, factoryToken);
  const lease = await factory.create();
  return { stateComposition, lease };
}
