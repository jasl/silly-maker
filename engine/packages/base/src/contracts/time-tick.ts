// SPDX-License-Identifier: MIT
import { dataFailure, readExactRecord } from "./presentation-data.ts";
import type { HoldPendingInteractionV1, PendingInteractionV1 } from "./pending-interaction.ts";
import { parseInteractionOccurrenceIdV1 } from "./pending-interaction.ts";

/**
 * TimeTick V1: the single session-level time verb. A Host reports elapsed
 * presentation-clock milliseconds through a Story-owned command carrying
 * this payload; one commit settles every authoritative time consumer —
 * first the pending hold's remainder (when the tick is hold-scoped), then
 * session-global consumers such as authoritative monitors, in that fixed
 * order. Wall-clock timestamps never enter State, Saves, or digests: the
 * authoritative side only ever consumes reported milliseconds, so replay
 * reads the command log and never re-reads a clock.
 *
 * The optional `expectedHoldOccurrenceId` fence decides the settlement
 * scope. A fenced tick was measured against one specific hold occurrence:
 * it may fold that hold's remainder, and it is rejected outright when the
 * occurrence is no longer current — a queued stale report or an automation
 * replay must not pre-fold a successor hold the player never watched (a
 * wait only consumes its own elapsed time, the same rule as frame-counted
 * waits in frame-loop engines). An unfenced tick settles only
 * session-global consumers and never touches a hold. One verb, one
 * optional field, two settlement scopes.
 */
export interface TimeTickV1 {
  /** Positive safe integer of reported elapsed milliseconds. */
  readonly elapsedMs: number;
  /**
   * Hold-scope fence: present iff the elapsed time was measured while this
   * hold occurrence was pending. Grants the tick the right to fold that
   * hold; stale fences reject the whole command.
   */
  readonly expectedHoldOccurrenceId?: string;
}

const freezeTimeTickDataInternalV1 = Object.freeze;

export function parseTimeTickV1(value: unknown, path = "/timeTick"): TimeTickV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "object_expected");
  }
  const declaresFence = Object.hasOwn(value, "expectedHoldOccurrenceId");
  const record = readExactRecord(
    value,
    declaresFence ? ["elapsedMs", "expectedHoldOccurrenceId"] : ["elapsedMs"],
    path,
  );
  // Any positive integer is admissible: overshoot from a frame hitch or a
  // skip fold clamps against the remaining milliseconds when applied, so no
  // gameplay cap is invented here.
  if (
    typeof record.elapsedMs !== "number" ||
    !Number.isSafeInteger(record.elapsedMs) ||
    record.elapsedMs < 1
  ) {
    return dataFailure(`${path}/elapsedMs`, "time_elapsed_invalid");
  }
  if (!declaresFence) {
    return freezeTimeTickDataInternalV1({ elapsedMs: record.elapsedMs });
  }
  return freezeTimeTickDataInternalV1({
    elapsedMs: record.elapsedMs,
    expectedHoldOccurrenceId: parseInteractionOccurrenceIdV1(
      record.expectedHoldOccurrenceId,
      `${path}/expectedHoldOccurrenceId`,
    ),
  });
}

export type TimeTickRejectionCodeV1 = "time.hold_occurrence_stale";

export type TimeTickOutcomeV1 =
  | {
    readonly kind: "accepted";
    /** The hold this tick may fold; null for an unfenced (global) tick. */
    readonly hold: HoldPendingInteractionV1 | null;
  }
  | { readonly kind: "rejected"; readonly code: TimeTickRejectionCodeV1 };

/**
 * The single time-tick evaluator, used at preview and re-checked at the
 * session queue front like every interaction resolution. A fenced tick is
 * accepted only while its hold occurrence is still pending; an unfenced
 * tick is always accepted and settles no hold.
 */
export function evaluateTimeTickV1(
  pending: PendingInteractionV1 | null,
  tick: TimeTickV1,
): TimeTickOutcomeV1 {
  if (tick.expectedHoldOccurrenceId === undefined) {
    return freezeTimeTickDataInternalV1({ kind: "accepted", hold: null });
  }
  if (
    pending === null ||
    pending.kind !== "hold" ||
    pending.occurrenceId !== tick.expectedHoldOccurrenceId
  ) {
    return freezeTimeTickDataInternalV1({
      kind: "rejected",
      code: "time.hold_occurrence_stale",
    });
  }
  return freezeTimeTickDataInternalV1({ kind: "accepted", hold: pending });
}

export type HoldSettlementV1 =
  | { readonly kind: "holding"; readonly pending: HoldPendingInteractionV1 }
  | { readonly kind: "expired" };

/**
 * The shared hold arithmetic every Narrative runner applies to a hold-
 * scoped time tick: consume `min(elapsedMs, remainingMs)` — overshoot from
 * a frame hitch or a skip fold clamps instead of rejecting — and either
 * keep the same boundary with the decremented remainder (the occurrence
 * stays stable across partial ticks) or report expiry so the runner
 * advances to the node's successor in the same commit. The terminal state
 * depends only on the sum of elapsed milliseconds, never on how a Host
 * batched them.
 */
export function applyElapsedToHoldV1(
  pending: HoldPendingInteractionV1,
  elapsedMs: number,
): HoldSettlementV1 {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 1) {
    throw new TypeError("time tick elapsedMs must be a positive integer");
  }
  const remainingMs = pending.remainingMs - Math.min(elapsedMs, pending.remainingMs);
  if (remainingMs === 0) return freezeTimeTickDataInternalV1({ kind: "expired" });
  return freezeTimeTickDataInternalV1({
    kind: "holding",
    pending: freezeTimeTickDataInternalV1({ ...pending, remainingMs }),
  });
}

/**
 * Threshold-crossing settlement shared by every authoritative time
 * consumer: how many whole multiples of `everyMs` lie in `(fromMs, toMs]`.
 * Story runners apply a declared per-period effect exactly this many times
 * inside the same commit, so the authoritative outcome depends only on the
 * millisecond sum — `{500,500,500}` and `{1500}` settle identically —
 * never on how a Host batched the ticks. A multiple landing exactly on
 * `toMs` belongs to this settlement. Holds map consumed time as
 * `fromMs = totalMs - beforeRemainingMs`, `toMs = totalMs -
 * afterRemainingMs`; monitors pass accumulated milliseconds directly.
 */
export function countThresholdCrossingsV1(input: {
  readonly fromMs: number;
  readonly toMs: number;
  readonly everyMs: number;
}): number {
  const { fromMs, toMs, everyMs } = input;
  if (!Number.isSafeInteger(everyMs) || everyMs < 1) {
    throw new TypeError("threshold crossing everyMs must be a positive integer");
  }
  if (
    !Number.isSafeInteger(fromMs) || !Number.isSafeInteger(toMs) ||
    fromMs < 0 || toMs < fromMs
  ) {
    throw new TypeError("threshold crossing span must satisfy 0 <= from <= to");
  }
  return Math.floor(toMs / everyMs) - Math.floor(fromMs / everyMs);
}
