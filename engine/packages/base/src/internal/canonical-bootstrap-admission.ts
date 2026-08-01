// SPDX-License-Identifier: MIT
import { projectCanonicalJsonInternalV1 } from "../contracts/canonical-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "./snapshot-work-instrumentation.ts";

/** @internal Test-only operational failure seam; absent from package barrels. */
export interface CanonicalBootstrapAdmissionHooksInternalV1 {
  readonly beforeProjectionFreeze?: (projection: unknown) => void;
}

function freezeCanonicalBootstrapProjectionV1(
  value: unknown,
  instrumentation?: SnapshotWorkInstrumentationV1,
  hooks?: CanonicalBootstrapAdmissionHooksInternalV1,
): void {
  recordSnapshotWorkV1(
    instrumentation,
    "deep_freeze_traversal",
    "bootstrap_handoff_freeze",
  );
  hooks?.beforeProjectionFreeze?.(value);

  const visited = new Set<object>();
  const freeze = (current: unknown): void => {
    if (current === null || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (
        descriptor !== undefined &&
        descriptor.get === undefined &&
        descriptor.set === undefined
      ) {
        freeze(descriptor.value);
      }
    }
    Object.freeze(current);
  };
  freeze(value);
}

/** @internal Canonical, engine-owned bootstrap handoff for Standard Core. */
export function admitCanonicalBootstrapInternalV1<TBootstrap>(
  value: TBootstrap,
  instrumentation?: SnapshotWorkInstrumentationV1,
  hooks?: CanonicalBootstrapAdmissionHooksInternalV1,
): DeepReadonly<TBootstrap> {
  const projection = projectCanonicalJsonInternalV1(
    value,
    instrumentation,
    "bootstrap_admission",
  );
  freezeCanonicalBootstrapProjectionV1(projection.value, instrumentation, hooks);
  return projection.value as DeepReadonly<TBootstrap>;
}
