// SPDX-License-Identifier: MIT
import { dataFailure, readExactRecord } from "./presentation-data.ts";

/**
 * Persistence safepoints V1: the application-declared vocabulary that tells
 * the persistence orchestrator which committed states are safe re-entry
 * points. A commit classified `safepoint` is an ordinary autosave candidate;
 * a commit classified `in_flight` sits inside an in-flight span — a bounded
 * multi-commit stretch (a `presentation_barrier` in progress, an asset
 * assembly, an external side-effect bracket) whose intermediate states the
 * Story does not want re-entered from a Save.
 *
 * While a span is open the orchestrator defers autosave (in-flight commits
 * never become candidates) and export paths fall back to the most recent
 * safepoint Snapshot, so crash recovery always resumes at the pre-span
 * safepoint. The classification never enters authoritative state, Saves, or
 * digests: every commit remains complete, valid, and replayable — a span
 * only expresses a re-entry preference, never a second authority.
 *
 * The declared bound keeps spans honest: admission rejects an unbounded
 * declaration, and at runtime a span that exceeds `maxInFlightCommits`
 * consecutive in-flight commits forfeits the inhibit (with a diagnostic)
 * until the next safepoint commit — long-lived state can never use a span
 * to escape the Save.
 */
export type PersistenceSafepointClassificationV1 = "safepoint" | "in_flight";

export interface PersistenceSafepointPolicyV1<TState> {
  /**
   * Deterministic read of committed authoritative state: derive the
   * classification from existing vocabulary (a `presentation_barrier`
   * pending interaction is naturally in-flight) or from an explicit span
   * field the Story's domain events set and clear. No wall clock, no
   * ambient randomness, no mutation.
   */
  classify(state: TState): PersistenceSafepointClassificationV1;
  /**
   * The admission-enforced span bound: the maximum number of consecutive
   * in-flight commits the orchestrator honors (1..256, matching the
   * rollback-ring magnitude) before the inhibit forfeits with a
   * diagnostic. Commit count keeps the bound deterministic — no second
   * wall clock enters persistence policy.
   */
  readonly maxInFlightCommits: number;
}

/** Upper bound admission accepts for `maxInFlightCommits`. */
export const maxPersistenceSafepointSpanCommitsV1 = 256;

/**
 * Admission for an application's safepoint policy declaration: an exact
 * record carrying a classifier function and a bounded positive
 * safe-integer commit budget. An unbounded or malformed declaration is
 * rejected here, before any session or persistence owner exists.
 */
export function parsePersistenceSafepointPolicyV1<TState>(
  value: PersistenceSafepointPolicyV1<TState>,
  path = "/persistenceSafepoint",
): PersistenceSafepointPolicyV1<TState> {
  const record = readExactRecord(value, ["classify", "maxInFlightCommits"], path);
  if (typeof record.classify !== "function") {
    return dataFailure(`${path}/classify`, "safepoint_classifier_invalid");
  }
  if (
    typeof record.maxInFlightCommits !== "number" ||
    !Number.isSafeInteger(record.maxInFlightCommits) ||
    record.maxInFlightCommits < 1 ||
    record.maxInFlightCommits > maxPersistenceSafepointSpanCommitsV1
  ) {
    return dataFailure(`${path}/maxInFlightCommits`, "safepoint_bound_invalid");
  }
  return Object.freeze({
    classify: record.classify as PersistenceSafepointPolicyV1<TState>["classify"],
    maxInFlightCommits: record.maxInFlightCommits,
  });
}
