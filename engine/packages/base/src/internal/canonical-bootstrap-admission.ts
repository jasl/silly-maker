// SPDX-License-Identifier: MIT
import { projectCanonicalJsonInternalV1 } from "../contracts/canonical-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";

/** @internal Canonical, engine-owned bootstrap handoff for Standard Core. */
export function admitCanonicalBootstrapInternalV1<TBootstrap>(
  value: TBootstrap,
  instrumentation?: SnapshotWorkInstrumentationV1,
): DeepReadonly<TBootstrap> {
  const projection = projectCanonicalJsonInternalV1(
    value,
    instrumentation,
    "bootstrap_admission",
  );
  return projection.value as DeepReadonly<TBootstrap>;
}
