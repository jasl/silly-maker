// SPDX-License-Identifier: MIT
import type { RunIntegrityReasonV1, RunIntegrityV1 } from "../../contracts/snapshot.ts";
import { runIntegrityV1Schema } from "../../contracts/snapshot.ts";
import type { DeepReadonly } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";

export type IntegrityDirectiveV1 =
  | { readonly kind: "preserve_current" }
  | { readonly kind: "accept_replacement" }
  | { readonly kind: "mark_modified"; readonly reason: RunIntegrityReasonV1 };

export function markRunModifiedV1(
  integrityValue: RunIntegrityV1,
  reasonValue: RunIntegrityReasonV1,
): RunIntegrityV1 {
  const mutationCount = parseNonNegativeSafeInteger(integrityValue.mutationCount + 1);
  const reasonSequence = parseNonNegativeSafeInteger(reasonValue.sequence);
  const reason = { ...reasonValue, sequence: reasonSequence } as RunIntegrityReasonV1;
  const reasons = integrityValue.reasons.some(({ kind }) => kind === reasonValue.kind)
    ? integrityValue.reasons
    : [...integrityValue.reasons, reason].slice(0, 16);
  return {
    mode: "modified",
    mutationCount,
    firstMutationSequence: integrityValue.firstMutationSequence === null
      ? reasonSequence
      : integrityValue.firstMutationSequence,
    reasons,
  };
}

export function finalizeSnapshotIntegrityV1<
  TSnapshot extends { readonly integrity: RunIntegrityV1 },
>(
  current: DeepReadonly<TSnapshot>,
  candidate: TSnapshot,
  directive: IntegrityDirectiveV1,
): TSnapshot {
  if (directive.kind === "accept_replacement") {
    runIntegrityV1Schema.parse(candidate.integrity);
    return candidate;
  }
  if (candidate.integrity !== current.integrity) {
    throw new TypeError("Story-owned Snapshot changed RunIntegrity");
  }
  if (directive.kind === "preserve_current") return candidate;
  return {
    ...candidate,
    integrity: markRunModifiedV1(current.integrity, directive.reason),
  } as TSnapshot;
}
