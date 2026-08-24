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
    return { elapsedMs: record.elapsedMs };
  }
  return {
    elapsedMs: record.elapsedMs,
    expectedHoldOccurrenceId: parseInteractionOccurrenceIdV1(
      record.expectedHoldOccurrenceId,
      `${path}/expectedHoldOccurrenceId`,
    ),
  };
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
    return { kind: "accepted", hold: null };
  }
  if (
    pending === null ||
    pending.kind !== "hold" ||
    pending.occurrenceId !== tick.expectedHoldOccurrenceId
  ) {
    return {
      kind: "rejected",
      code: "time.hold_occurrence_stale",
    };
  }
  return { kind: "accepted", hold: pending };
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
  if (remainingMs === 0) return { kind: "expired" };
  return {
    kind: "holding",
    pending: { ...pending, remainingMs },
  };
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

/**
 * One state-change instant on a hold's consumed-time axis: a periodic tick
 * crossing or a one-shot mid-hold frame swap. `atMs` is consumed hold time
 * (`0` = the hold opened), `index` points into the declared frame list.
 */
export type HoldTimelineCrossingV1 =
  | { readonly kind: "tick"; readonly atMs: number }
  | { readonly kind: "frame"; readonly atMs: number; readonly index: number };

export type HoldTimelineSettlementV1 =
  | {
    readonly kind: "holding";
    readonly pending: HoldPendingInteractionV1;
    readonly consumedMs: number;
  }
  | { readonly kind: "expired"; readonly consumedMs: number }
  | {
    readonly kind: "rerouted";
    readonly armIndex: number;
    readonly consumedMs: number;
  };

/**
 * The declaration-order first-match rule shared by hold-open entry checks
 * and {@link settleHoldTimelineV1}: the index of the first arm whose
 * predicate reports true, or null. Arms are zero-argument closures over the
 * caller's working state, following the `activeWhen` precedent — base owns
 * the walk, never a predicate data grammar.
 */
export function firstMatchingHoldArmV1(arms: readonly (() => boolean)[]): number | null {
  let index = 0;
  for (const matches of arms) {
    if (matches()) return index;
    index += 1;
  }
  return null;
}

/**
 * The shared occurrence-timeline settlement every Narrative runner applies
 * to a hold-scoped time tick once the hold declares `when` arms (and the
 * superset of {@link applyElapsedToHoldV1} when it does not): a reroute
 * instant is a point on the consumed-time axis, never an end-of-commit
 * phase, so `{500,500,500}` and `{1500}` reroute at the same instant with
 * the same crossings applied.
 *
 * The walk, in order:
 *
 * 1. evaluate `arms` at t=0 (catching state written since the previous
 *    settlement by monitors or ordinary commands) — a match reroutes with
 *    zero consumption;
 * 2. step through the hold's own state-change instants inside
 *    `(consumedBefore, consumedBefore + min(elapsedMs, remainingMs)]` in
 *    ascending time order — periodic `tickEveryMs` crossings and one-shot
 *    `frameAtMs` swaps; a same-instant tie applies the tick effect before
 *    the frame swap, frames sharing an instant keep declaration order. Each
 *    crossing is delivered to `onCrossing` (the caller applies it to its
 *    working state) and the arms are re-evaluated; the first match cuts the
 *    walk at that instant — later crossings never apply, and the discarded
 *    remainder never pre-folds whatever the reroute target opens (the same
 *    rule that keeps a stale report from pre-folding a successor hold);
 * 3. a timeline exhausted without a match expires (span reached
 *    `remainingMs`) or keeps holding with the remainder decremented. An arm
 *    matching on the final crossing wins over expiry — expiry is defined as
 *    "ran out of timeline unmatched", so no tie special-case exists.
 *
 * Arms read the caller's working state: command-start state plus this
 * hold's own crossings applied so far (the `activeWhen` granularity
 * discipline — state written by monitor settlement or foreign commands
 * surfaces at the next settlement's t=0 check). Session-global consumers
 * such as monitors still settle with the full reported milliseconds; the
 * cut applies to the occurrence axis only.
 */
export function settleHoldTimelineV1(input: {
  readonly pending: HoldPendingInteractionV1;
  readonly elapsedMs: number;
  /** The hold's own periodic tick cadence, when the node declares one. */
  readonly tickEveryMs?: number;
  /** The hold's own one-shot frame-swap instants (consumed-time ms). */
  readonly frameAtMs?: readonly number[];
  /** Ordered `when` arms as zero-argument working-state predicates. */
  readonly arms?: readonly (() => boolean)[];
  /** Applies one crossing to the caller's working state, in walk order. */
  readonly onCrossing?: (crossing: HoldTimelineCrossingV1) => void;
}): HoldTimelineSettlementV1 {
  const { pending, elapsedMs } = input;
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 1) {
    throw new TypeError("time tick elapsedMs must be a positive integer");
  }
  const tickEveryMs = input.tickEveryMs;
  if (tickEveryMs !== undefined && (!Number.isSafeInteger(tickEveryMs) || tickEveryMs < 1)) {
    throw new TypeError("hold timeline tickEveryMs must be a positive integer");
  }
  const frameAtMs = input.frameAtMs ?? [];
  for (const atMs of frameAtMs) {
    if (!Number.isSafeInteger(atMs) || atMs < 1) {
      throw new TypeError("hold timeline frameAtMs must be positive integers");
    }
  }
  const arms = input.arms ?? [];

  const entryMatch = firstMatchingHoldArmV1(arms);
  if (entryMatch !== null) {
    return {
      kind: "rerouted",
      armIndex: entryMatch,
      consumedMs: 0,
    };
  }

  const fromMs = pending.totalMs - pending.remainingMs;
  const spanMs = Math.min(elapsedMs, pending.remainingMs);
  const toMs = fromMs + spanMs;

  const tickInstants: number[] = [];
  if (tickEveryMs !== undefined) {
    for (
      let atMs = (Math.floor(fromMs / tickEveryMs) + 1) * tickEveryMs;
      atMs <= toMs;
      atMs += tickEveryMs
    ) {
      tickInstants.push(atMs);
    }
  }
  const frameCrossings = frameAtMs
    .map((atMs, index) => ({ atMs, index }))
    .filter((frame) => frame.atMs > fromMs && frame.atMs <= toMs)
    .toSorted((a, b) => a.atMs - b.atMs || a.index - b.index);

  let tickCursor = 0;
  let frameCursor = 0;
  for (;;) {
    const tickAt = tickInstants[tickCursor];
    const frame = frameCrossings[frameCursor];
    let crossing: HoldTimelineCrossingV1;
    if (tickAt !== undefined && (frame === undefined || tickAt <= frame.atMs)) {
      crossing = { kind: "tick", atMs: tickAt };
      tickCursor += 1;
    } else if (frame !== undefined) {
      crossing = {
        kind: "frame",
        atMs: frame.atMs,
        index: frame.index,
      };
      frameCursor += 1;
    } else {
      break;
    }
    input.onCrossing?.(crossing);
    const match = firstMatchingHoldArmV1(arms);
    if (match !== null) {
      return {
        kind: "rerouted",
        armIndex: match,
        consumedMs: crossing.atMs - fromMs,
      };
    }
  }

  const fold = applyElapsedToHoldV1(pending, elapsedMs);
  if (fold.kind === "expired") {
    return { kind: "expired", consumedMs: spanMs };
  }
  return {
    kind: "holding",
    pending: fold.pending,
    consumedMs: spanMs,
  };
}
