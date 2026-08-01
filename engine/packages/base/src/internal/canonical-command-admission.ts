// SPDX-License-Identifier: MIT
import { projectCanonicalJsonInternalV1 } from "../contracts/canonical-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "./snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "./snapshot-work-instrumentation.ts";

const canonicalCommandAdmissionBrandV1: unique symbol = Symbol(
  "sillymaker.canonical-command-admission.v1",
);
const canonicalCommandAdmissionInstrumentationV1: unique symbol = Symbol(
  "sillymaker.canonical-command-admission-instrumentation.v1",
);

/** @internal Opaque proof scoped to one command ingress operation. */
export interface CanonicalCommandAdmissionInternalV1<TCommand> {
  readonly [canonicalCommandAdmissionBrandV1]: true;
  readonly [canonicalCommandAdmissionInstrumentationV1]?: SnapshotWorkInstrumentationV1;
  readonly value: DeepReadonly<TCommand>;
}

const committedAdmissionsV1 = new WeakSet<object>();
export type CanonicalCommandHandoffTargetInternalV1 =
  | "simulation_game_execute"
  | "simulation_debug_validate"
  | "simulation_debug_execute"
  | "command_log_append";

interface ActiveCanonicalCommandHandoffInternalV1 {
  readonly admission: CanonicalCommandAdmissionInternalV1<unknown>;
  readonly target: CanonicalCommandHandoffTargetInternalV1;
  consumed: boolean;
}

const activeHandoffsV1: ActiveCanonicalCommandHandoffInternalV1[] = [];

function freezeCanonicalProjectionV1(
  value: unknown,
  instrumentation?: SnapshotWorkInstrumentationV1,
): void {
  recordSnapshotWorkV1(instrumentation, "deep_freeze_traversal", "command_handoff_freeze");
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

/** @internal Validates without freezing so vectors can preflight atomically. */
export function prepareCanonicalCommandAdmissionInternalV1<TCommand>(
  value: TCommand,
  instrumentation?: SnapshotWorkInstrumentationV1,
): CanonicalCommandAdmissionInternalV1<TCommand> {
  const projection = projectCanonicalJsonInternalV1(
    value,
    instrumentation,
    "command_admission",
  );
  return Object.freeze({
    [canonicalCommandAdmissionBrandV1]: true as const,
    ...(instrumentation === undefined
      ? {}
      : { [canonicalCommandAdmissionInstrumentationV1]: instrumentation }),
    value: projection.value as DeepReadonly<TCommand>,
  });
}

/** @internal Freezes a successfully prepared command handoff exactly once. */
export function commitCanonicalCommandAdmissionInternalV1<TCommand>(
  admission: CanonicalCommandAdmissionInternalV1<TCommand>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): CanonicalCommandAdmissionInternalV1<TCommand> {
  if (!committedAdmissionsV1.has(admission)) {
    freezeCanonicalProjectionV1(
      admission.value,
      instrumentation ?? admission[canonicalCommandAdmissionInstrumentationV1],
    );
    committedAdmissionsV1.add(admission);
  }
  return admission;
}

/** @internal Canonicalizes and freezes one independent command ingress. */
export function admitCanonicalCommandInternalV1<TCommand>(
  value: TCommand,
  instrumentation?: SnapshotWorkInstrumentationV1,
): CanonicalCommandAdmissionInternalV1<TCommand> {
  const admission = prepareCanonicalCommandAdmissionInternalV1(value, instrumentation);
  return commitCanonicalCommandAdmissionInternalV1(admission, instrumentation);
}

/** @internal Consumes only the matching one-shot internal handoff target. */
export function admitCanonicalCommandForTargetInternalV1<TCommand>(
  value: TCommand,
  target: CanonicalCommandHandoffTargetInternalV1,
  instrumentation?: SnapshotWorkInstrumentationV1,
): CanonicalCommandAdmissionInternalV1<TCommand> {
  const handoff = activeHandoffsV1.at(-1);
  if (
    handoff !== undefined &&
    !handoff.consumed &&
    handoff.target === target &&
    handoff.admission.value === value
  ) {
    handoff.consumed = true;
    return handoff.admission as CanonicalCommandAdmissionInternalV1<TCommand>;
  }
  return admitCanonicalCommandInternalV1(
    value,
    instrumentation ?? handoff?.admission[canonicalCommandAdmissionInstrumentationV1],
  );
}

/** @internal Offers one committed admission to one exact synchronous target. */
export function withCanonicalCommandHandoffInternalV1<TCommand, TResult>(
  admission: CanonicalCommandAdmissionInternalV1<TCommand>,
  target: CanonicalCommandHandoffTargetInternalV1,
  callback: () => TResult,
): TResult {
  if (!committedAdmissionsV1.has(admission)) {
    throw new TypeError("Canonical command admission was not committed");
  }
  const handoff: ActiveCanonicalCommandHandoffInternalV1 = {
    admission: admission as CanonicalCommandAdmissionInternalV1<unknown>,
    target,
    consumed: false,
  };
  activeHandoffsV1.push(handoff);
  let outcome:
    | { readonly kind: "returned"; readonly value: TResult }
    | { readonly kind: "threw"; readonly error: unknown };
  try {
    outcome = { kind: "returned", value: callback() };
  } catch (error) {
    outcome = { kind: "threw", error };
  }
  const popped = activeHandoffsV1.pop();
  if (popped !== handoff) {
    throw new TypeError("Canonical command admission scope was corrupted");
  }
  if (outcome.kind === "threw") throw outcome.error;
  return outcome.value;
}
