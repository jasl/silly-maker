// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { interactionOccurrenceIdV1, parsePendingInteractionV1 } from "./pending-interaction.ts";
import type { HoldPendingInteractionV1 } from "./pending-interaction.ts";
import {
  applyElapsedToHoldV1,
  countThresholdCrossingsV1,
  evaluateTimeTickV1,
  parseTimeTickV1,
} from "./time-tick.ts";

function holdFixtureV1(sequence: number): HoldPendingInteractionV1 {
  const pending = parsePendingInteractionV1({
    kind: "hold",
    definitionId: "interaction.test.commute-hold",
    seenRevision: 1,
    occurrenceId: interactionOccurrenceIdV1(sequence),
    totalMs: 1500,
    remainingMs: 1500,
    skippable: false,
  });
  if (pending.kind !== "hold") throw new Error("expected hold");
  return pending;
}

function sayFixtureV1(): ReturnType<typeof parsePendingInteractionV1> {
  return parsePendingInteractionV1({
    kind: "say",
    definitionId: "interaction.test.intro",
    seenRevision: 1,
    occurrenceId: interactionOccurrenceIdV1(20),
    speakerTextId: null,
    textId: "text.test.line",
    advancePolicy: "confirm",
  });
}

describe("TimeTickV1", () => {
  it("parses fenced and unfenced ticks and rejects invalid milliseconds", () => {
    const unfenced = parseTimeTickV1({ elapsedMs: 500 });
    expect(unfenced).toEqual({ elapsedMs: 500 });
    expect(Object.hasOwn(unfenced, "expectedHoldOccurrenceId")).toBe(false);
    expect(Object.isFrozen(unfenced)).toBe(true);

    const fenced = parseTimeTickV1({
      elapsedMs: 250,
      expectedHoldOccurrenceId: interactionOccurrenceIdV1(11),
    });
    expect(fenced).toEqual({
      elapsedMs: 250,
      expectedHoldOccurrenceId: "interaction-occurrence.11",
    });
    expect(parseTimeTickV1(JSON.parse(JSON.stringify(fenced)))).toEqual(fenced);

    for (const elapsedMs of [0, -1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
      expect(() => parseTimeTickV1({ elapsedMs })).toThrow("time_elapsed_invalid");
    }
    expect(() => parseTimeTickV1({ elapsedMs: 1, expectedHoldOccurrenceId: "nope" })).toThrow(
      "interaction_occurrence_invalid",
    );
    expect(() => parseTimeTickV1({ elapsedMs: 1, extra: true })).toThrow();
    expect(() => parseTimeTickV1(null)).toThrow("object_expected");
  });

  it("scopes settlement by the optional hold fence", () => {
    const hold = holdFixtureV1(11);

    // A fenced tick is accepted only while its exact occurrence is pending.
    const fenced = parseTimeTickV1({
      elapsedMs: 500,
      expectedHoldOccurrenceId: hold.occurrenceId,
    });
    expect(evaluateTimeTickV1(hold, fenced)).toEqual({ kind: "accepted", hold });

    // Stale fences reject outright: a queued report or an automation replay
    // must never pre-fold a successor hold the player never watched.
    expect(evaluateTimeTickV1(holdFixtureV1(12), fenced)).toEqual({
      kind: "rejected",
      code: "time.hold_occurrence_stale",
    });
    expect(evaluateTimeTickV1(sayFixtureV1(), fenced)).toEqual({
      kind: "rejected",
      code: "time.hold_occurrence_stale",
    });
    expect(evaluateTimeTickV1(null, fenced)).toEqual({
      kind: "rejected",
      code: "time.hold_occurrence_stale",
    });

    // An unfenced tick settles only session-global consumers: accepted over
    // any pending — including a hold — but never granted the hold scope.
    const unfenced = parseTimeTickV1({ elapsedMs: 500 });
    expect(evaluateTimeTickV1(hold, unfenced)).toEqual({ kind: "accepted", hold: null });
    expect(evaluateTimeTickV1(sayFixtureV1(), unfenced)).toEqual({ kind: "accepted", hold: null });
    expect(evaluateTimeTickV1(null, unfenced)).toEqual({ kind: "accepted", hold: null });
  });

  it("keeps the boundary occurrence across partial ticks and expires on the zero-reaching tick", () => {
    const hold = holdFixtureV1(12);

    const afterFirst = applyElapsedToHoldV1(hold, 500);
    if (afterFirst.kind !== "holding") throw new Error("expected holding");
    expect(afterFirst.pending.remainingMs).toBe(1000);
    expect(afterFirst.pending.totalMs).toBe(1500);
    expect(afterFirst.pending.occurrenceId).toBe(hold.occurrenceId);
    expect(afterFirst.pending.definitionId).toBe(hold.definitionId);
    expect(Object.isFrozen(afterFirst.pending)).toBe(true);

    const afterSecond = applyElapsedToHoldV1(afterFirst.pending, 500);
    if (afterSecond.kind !== "holding") throw new Error("expected holding");
    expect(afterSecond.pending.remainingMs).toBe(500);
    expect(afterSecond.pending.occurrenceId).toBe(hold.occurrenceId);

    // The zero-reaching tick expires in the same application: there is no
    // separate hold_expire step.
    expect(applyElapsedToHoldV1(afterSecond.pending, 500)).toEqual({ kind: "expired" });

    // Overshoot clamps instead of rejecting (frame hitches, skip folds).
    expect(applyElapsedToHoldV1(afterSecond.pending, 900_000)).toEqual({ kind: "expired" });

    expect(() => applyElapsedToHoldV1(hold, 0)).toThrow(TypeError);
    expect(() => applyElapsedToHoldV1(hold, 16.7)).toThrow(TypeError);
  });

  it("reaches the same terminal state for any batch split with the same millisecond sum", () => {
    const hold = holdFixtureV1(13);

    const runBatches = (batches: readonly number[]) => {
      let pending: HoldPendingInteractionV1 | null = hold;
      const trace: (number | "expired")[] = [];
      for (const elapsedMs of batches) {
        if (pending === null) throw new Error("ticked past expiry");
        const outcome = applyElapsedToHoldV1(pending, elapsedMs);
        if (outcome.kind === "expired") {
          pending = null;
          trace.push("expired");
        } else {
          pending = outcome.pending;
          trace.push(outcome.pending.remainingMs);
        }
      }
      return { pending, trace };
    };

    const fine = runBatches([500, 500, 500]);
    const coarse = runBatches([1500]);
    const uneven = runBatches([1, 1498, 1]);
    expect(fine.pending).toBeNull();
    expect(coarse.pending).toBeNull();
    expect(uneven.pending).toBeNull();
    expect(fine.trace).toEqual([1000, 500, "expired"]);
    expect(uneven.trace).toEqual([1499, 1, "expired"]);

    // Equal prefix sums produce byte-identical pendings (Save shape).
    const viaTwo = runBatches([300, 700]);
    const viaOne = runBatches([1000]);
    expect(viaTwo.pending).not.toBeNull();
    expect(canonicalJsonBytes(viaTwo.pending)).toEqual(canonicalJsonBytes(viaOne.pending));
  });

  it("settles threshold crossings identically for any batch split of the same sum", () => {
    const totalMs = 1500;
    const everyMs = 400;
    // The hold mapping: consumed time runs from `totalMs - beforeRemaining`
    // to `totalMs - afterRemaining`.
    const settle = (elapsedBatches: readonly number[]): number => {
      let remainingMs = totalMs;
      let crossings = 0;
      for (const elapsedMs of elapsedBatches) {
        const beforeRemainingMs = remainingMs;
        remainingMs = Math.max(0, remainingMs - elapsedMs);
        crossings += countThresholdCrossingsV1({
          fromMs: totalMs - beforeRemainingMs,
          toMs: totalMs - remainingMs,
          everyMs,
        });
      }
      return crossings;
    };

    // {500,500,500} ≡ {1500} ≡ any other split: 400/800/1200 crossed 3 times.
    expect(settle([1500])).toBe(3);
    expect(settle([500, 500, 500])).toBe(3);
    expect(settle([100, 299, 1, 700, 400])).toBe(3);
    expect(settle([1499, 1])).toBe(3);

    // A multiple landing exactly on the settlement end belongs to this
    // settlement: the last 500 of a 1500 hold settles the expiry crossing.
    expect(countThresholdCrossingsV1({ fromMs: 1000, toMs: 1500, everyMs: 500 })).toBe(1);

    // No progress, no crossing; sub-threshold progress, no crossing.
    expect(countThresholdCrossingsV1({ fromMs: 0, toMs: 0, everyMs: 400 })).toBe(0);
    expect(countThresholdCrossingsV1({ fromMs: 0, toMs: 399, everyMs: 400 })).toBe(0);

    // Monitor mapping: accumulated milliseconds pass through directly.
    expect(countThresholdCrossingsV1({ fromMs: 4999, toMs: 10_001, everyMs: 5000 })).toBe(2);

    expect(() => countThresholdCrossingsV1({ fromMs: 200, toMs: 100, everyMs: 400 })).toThrow(
      TypeError,
    );
    expect(() => countThresholdCrossingsV1({ fromMs: -1, toMs: 100, everyMs: 400 })).toThrow(
      TypeError,
    );
    expect(() => countThresholdCrossingsV1({ fromMs: 0, toMs: 500, everyMs: 0 })).toThrow(
      TypeError,
    );
    expect(() => countThresholdCrossingsV1({ fromMs: 0, toMs: 0.5, everyMs: 400 })).toThrow(
      TypeError,
    );
  });
});
