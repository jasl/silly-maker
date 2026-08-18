// SPDX-License-Identifier: MIT
import type {
  StateAnyModuleV1,
  StateAuthoringKitV1,
  StateModuleCompositionV1,
  StateWorkflowTypeMapV1,
} from "@sillymaker/state";
import type { CompositionServiceTokenV1, CompositionSnapshotV1 } from "@sillymaker/composition";
import type {
  LegacyApplicationFactoryV1,
  LegacyApplicationLeaseV1,
} from "@sillymaker/composition/legacy";
import {
  activateStateApplicationV1,
  compileStateModuleCompositionV1,
  defineStateCompositionProfileV1,
  defineStateModulePluginV1,
} from "@sillymaker/composition/state";
import type { StateApplicationActivationV1 } from "@sillymaker/composition/state";

// @ts-expect-error An implementation lifecycle Context is not part of this API.
import type { Context } from "@sillymaker/composition/state";

interface ConsumerStateV1 {
  readonly simulation: { readonly counter: { readonly value: number } };
}

interface ConsumerTypesV1 extends StateWorkflowTypeMapV1<ConsumerStateV1> {
  readonly fact: never;
  readonly rejection: never;
  readonly fault: never;
}

declare const moduleV1: StateAnyModuleV1;
declare const snapshotV1: CompositionSnapshotV1;
declare const kitV1: StateAuthoringKitV1<ConsumerTypesV1>;
interface ConsumerSessionV1 {
  readonly marker: "consumer-session";
}
declare const factoryTokenV1: CompositionServiceTokenV1<
  LegacyApplicationFactoryV1<ConsumerSessionV1>
>;

export const pluginV1 = defineStateModulePluginV1(moduleV1);
export const profileV1 = defineStateCompositionProfileV1({
  id: "consumer.state-profile",
  modules: [moduleV1],
});
export const compositionV1 = compileStateModuleCompositionV1(
  snapshotV1,
  kitV1,
);
compositionV1 satisfies StateModuleCompositionV1<
  ConsumerTypesV1,
  readonly StateAnyModuleV1[]
>;
export const activationV1 = activateStateApplicationV1(
  snapshotV1,
  kitV1,
  factoryTokenV1,
);
void (activationV1 satisfies Promise<
  StateApplicationActivationV1<ConsumerTypesV1, ConsumerSessionV1>
>);
declare const resolvedActivationV1: Awaited<typeof activationV1>;
resolvedActivationV1.stateComposition satisfies StateModuleCompositionV1<
  ConsumerTypesV1,
  readonly StateAnyModuleV1[]
>;
resolvedActivationV1.lease satisfies LegacyApplicationLeaseV1<ConsumerSessionV1>;

defineStateCompositionProfileV1({
  id: "consumer.live-profile",
  // @ts-expect-error State composition profiles are always authoritative.
  kind: "live",
  modules: [moduleV1],
});

export type ConsumerDoesNotSeeLifecycleContextV1 = Context;
