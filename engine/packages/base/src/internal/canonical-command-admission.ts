// SPDX-License-Identifier: MIT
import { projectCanonicalJsonInternalV1 } from "../contracts/canonical-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";

/** @internal Canonicalizes one command at a real ingress boundary. */
export function admitCanonicalCommandInternalV1<TCommand>(
  value: TCommand,
  instrumentation?: SnapshotWorkInstrumentationV1,
): DeepReadonly<TCommand> {
  return projectCanonicalJsonInternalV1(
    value,
    instrumentation,
    "command_admission",
  ).value as DeepReadonly<TCommand>;
}
