// SPDX-License-Identifier: MIT
import type { CompositionPluginScopeV1 } from "./contracts.ts";

export const compositionLifecycleActivityV1: unique symbol = Symbol(
  "sillymaker.composition.lifecycle-activity.v1",
);

export interface CompositionLifecycleActivityV1 {
  /** Claims the owning kernel until the returned idempotent release is called. */
  claim(): () => void;
}

export interface CompositionInternalPluginScopeV1 extends CompositionPluginScopeV1 {
  readonly [compositionLifecycleActivityV1]: CompositionLifecycleActivityV1;
}
