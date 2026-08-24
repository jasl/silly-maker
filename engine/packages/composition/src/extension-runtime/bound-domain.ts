// SPDX-License-Identifier: MIT
import { defineExtensionFactoryInternalV1, ExtensionRuntimeErrorInternalV1 } from "./contracts.ts";
import type {
  BoundExtensionConsumerInternalV1,
  BoundExtensionFactoryInputInternalV1,
  ExtensionFactoryInternalV1,
} from "./contracts.ts";

/**
 * Creates one explicit owner that mounts its selected provider before its
 * dependent. The provider object is passed directly; no lookup surface exists.
 */
export function createBoundExtensionFactoryInternalV1<TProvider, TDependent>(
  input: BoundExtensionFactoryInputInternalV1<TProvider, TDependent>,
): ExtensionFactoryInternalV1<BoundExtensionConsumerInternalV1<TProvider, TDependent>> {
  if (input === null || typeof input !== "object") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      "bound extension factory input must be an object",
    );
  }
  const provider = defineExtensionFactoryInternalV1(input.provider);
  if (input.id === provider.id) {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `bound extension owner ${input.id} must differ from provider ${provider.id}`,
    );
  }
  if (typeof input.createDependent !== "function") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `bound extension owner ${input.id} requires a dependent factory callback`,
    );
  }
  const createDependent = input.createDependent;
  return defineExtensionFactoryInternalV1({
    id: input.id,
    generation: input.generation,
    async setup(scope) {
      const mountedProvider = await scope.mountChild(provider);
      const dependentFactory = createDependent(mountedProvider.consumer);
      const mountedDependent = await scope.mountChild(dependentFactory);
      return {
        provider: mountedProvider.consumer,
        dependent: mountedDependent.consumer,
      };
    },
  });
}
