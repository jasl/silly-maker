// SPDX-License-Identifier: MIT
import {
  createCompositionKernelV1,
  createCompositionRegistryTokenV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "../src/index.ts";
import type {
  CompositionPluginScopeV1,
  CompositionServiceTokenV1,
  CompositionSnapshotV1,
} from "../src/index.ts";

// @ts-expect-error Cordis Context is not part of the composition public API.
import type { Context } from "../src/index.ts";

export const serviceV1 = createCompositionServiceTokenV1<
  { run(value: number): number }
>(
  "consumer.service",
);
export const registryV1 = createCompositionRegistryTokenV1<string>(
  "consumer.registry",
);

export const providerV1 = defineCompositionPluginV1({
  id: "consumer.provider",
  revision: 1,
  provides: [serviceV1],
  contributes: [{ token: registryV1, id: "consumer.entry", priority: 10 }],
  setup(scope) {
    scope.provide(serviceV1, { run: (value) => value + 1 });
    scope.contribute(registryV1, {
      id: "consumer.entry",
      value: "ready",
      priority: 10,
    });
    // @ts-expect-error The service token carries its service value type.
    scope.provide(serviceV1, "wrong");
    scope.contribute(registryV1, {
      id: "consumer.entry",
      // @ts-expect-error Registry entry values are typed by their token.
      value: 42,
      priority: 10,
    });
  },
});

export const profileV1 = defineCompositionProfileV1({
  id: "consumer.profile",
  kind: "authoritative",
  plugins: [providerV1],
});
export const kernelV1 = createCompositionKernelV1();
export const mountedV1: Promise<CompositionSnapshotV1> = kernelV1.mount(
  profileV1,
);

// @ts-expect-error Plugin revisions are mandatory boot-identity inputs.
defineCompositionPluginV1({ id: "consumer.missing-revision", setup() {} });

// @ts-expect-error Typed tokens require an inaccessible invariant phantom.
const forgedServiceV1: CompositionServiceTokenV1<string> = {
  id: "consumer.service",
  kind: "exclusive_service",
};

// @ts-expect-error Authoritative mount auto-seals; there is no manual seal window.
kernelV1.sealAuthoritative();

declare const scopeV1: CompositionPluginScopeV1;
// @ts-expect-error Cordis plugin mounting stays behind the façade.
scopeV1.plugin;
// @ts-expect-error Cordis Context stays behind the façade.
scopeV1.context;

export type ConsumerDoesNotSeeCordisContextV1 = Context;
export type ConsumerCannotForgeServiceV1 = typeof forgedServiceV1;
