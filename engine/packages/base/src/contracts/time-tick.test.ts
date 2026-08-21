// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { interactionOccurrenceIdV1, parsePendingInteractionV1 } from "./pending-interaction.ts";
import type { HoldPendingInteractionV1 } from "./pending-interaction.ts";
import type { HoldTimelineCrossingV1 } from "./time-tick.ts";
import {
  applyElapsedToHoldV1,
  countThresholdCrossingsV1,
  evaluateTimeTickV1,
  firstMatchingHoldArmV1,
  parseTimeTickV1,
  settleHoldTimelineV1,
} from "./time-tick.ts";

function holdFixtureV1(sequence: number, totalMs = 1500): HoldPendingInteractionV1 {
  const pending = parsePendingInteractionV1({
    kind: "hold",
    definitionId: "interaction.test.commute-hold",
    seenRevision: 1,
    occurrenceId: interactionOccurrenceIdV1(sequence),
    totalMs,
    remainingMs: totalMs,
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

describe("settleHoldTimelineV1", () => {
  /**
   * The drip harness: a hold whose own tick effect increments a working
   * counter, with one arm matching at a threshold — the alert-catch shape.
   * Feeds the same hold through arbitrary batch splits and records every
   * applied crossing instant plus the settlement trace.
   */
  function runDripBatches(input: {
    readonly totalMs: number;
    readonly everyMs: number;
    readonly threshold: number;
    readonly batches: readonly number[];
  }) {
    let pending: HoldPendingInteractionV1 | null = holdFixtureV1(21, input.totalMs);
    let drip = 0;
    let totalConsumedMs = 0;
    const appliedAtMs: number[] = [];
    const trace: string[] = [];
    for (const elapsedMs of input.batches) {
      if (pending === null) throw new Error("ticked past a terminal settlement");
      const outcome = settleHoldTimelineV1({
        pending,
        elapsedMs,
        tickEveryMs: input.everyMs,
        arms: [() => drip >= input.threshold],
        onCrossing: (crossing) => {
          if (crossing.kind !== "tick") throw new Error("unexpected frame crossing");
          drip += 1;
          appliedAtMs.push(crossing.atMs);
        },
      });
      totalConsumedMs += outcome.consumedMs;
      if (outcome.kind === "holding") {
        pending = outcome.pending;
        trace.push(`holding:${String(outcome.pending.remainingMs)}`);
      } else {
        pending = null;
        trace.push(
          outcome.kind === "rerouted" ? `rerouted:${String(outcome.armIndex)}` : "expired",
        );
      }
    }
    return { drip, totalConsumedMs, appliedAtMs, trace, pending };
  }

  it("cuts at the crossing that flips the arm, for any batch split of the same sum", () => {
    // The night-room shape: an 8000ms bar dripping every 1000ms, aborting
    // once the counter reaches 2. The reroute instant, the applied
    // crossings, and the terminal counter must not depend on batching.
    const coarse = runDripBatches({ totalMs: 8000, everyMs: 1000, threshold: 2, batches: [8000] });
    const paced = runDripBatches({
      totalMs: 8000,
      everyMs: 1000,
      threshold: 2,
      batches: [1000, 1000],
    });
    const uneven = runDripBatches({
      totalMs: 8000,
      everyMs: 1000,
      threshold: 2,
      batches: [1500, 6500],
    });
    for (const run of [coarse, paced, uneven]) {
      expect(run.drip).toBe(2);
      expect(run.totalConsumedMs).toBe(2000);
      expect(run.appliedAtMs).toEqual([1000, 2000]);
      expect(run.trace.at(-1)).toBe("rerouted:0");
      expect(run.pending).toBeNull();
    }
    // Crossings past the cut never applied: 8000ms of timeline held 8
    // potential drips, the cut kept exactly 2.
    expect(coarse.drip).toBe(2);
  });

  it("keeps a skip fold from walking past the catch", () => {
    // A skip is elapsedMs = remainingMs through the same rule: the fold
    // reroutes at the true instant instead of applying every drip first.
    const skip = runDripBatches({ totalMs: 8000, everyMs: 1000, threshold: 2, batches: [8000] });
    expect(skip.trace).toEqual(["rerouted:0"]);
    expect(skip.drip).toBe(2);
    expect(skip.totalConsumedMs).toBe(2000);
  });

  it("reroutes at t=0 with zero consumption when an arm already matches", () => {
    const pending = holdFixtureV1(22, 5000);
    let crossings = 0;
    const outcome = settleHoldTimelineV1({
      pending,
      elapsedMs: 5000,
      tickEveryMs: 1000,
      arms: [() => false, () => true],
      onCrossing: () => {
        crossings += 1;
      },
    });
    expect(outcome).toEqual({ kind: "rerouted", armIndex: 1, consumedMs: 0 });
    expect(crossings).toBe(0);
  });

  it("lets an arm matching on the final crossing win over expiry", () => {
    // Expiry is "ran out of timeline unmatched": the crossing landing
    // exactly on the expiry instant applies first and its match reroutes.
    const run = runDripBatches({ totalMs: 3000, everyMs: 1000, threshold: 3, batches: [3000] });
    expect(run.trace).toEqual(["rerouted:0"]);
    expect(run.drip).toBe(3);
    expect(run.totalConsumedMs).toBe(3000);
  });

  it("matches the plain fold and crossing arithmetic when no arm ever fires", () => {
    const pending = holdFixtureV1(23);
    const applied: number[] = [];
    const partial = settleHoldTimelineV1({
      pending,
      elapsedMs: 500,
      tickEveryMs: 400,
      arms: [() => false],
      onCrossing: (crossing) => {
        applied.push(crossing.atMs);
      },
    });
    if (partial.kind !== "holding") throw new Error("expected holding");
    expect(partial.consumedMs).toBe(500);
    expect(applied).toEqual([400]);
    // Byte-identical pending to the plain fold: declaring arms that never
    // match changes nothing about the Save shape.
    const plain = applyElapsedToHoldV1(pending, 500);
    if (plain.kind !== "holding") throw new Error("expected holding");
    expect(canonicalJsonBytes(partial.pending)).toEqual(canonicalJsonBytes(plain.pending));
    expect(partial.pending.occurrenceId).toBe(pending.occurrenceId);

    // Overshoot clamps to the remainder and expires, like the plain fold.
    const overshoot = settleHoldTimelineV1({
      pending: partial.pending,
      elapsedMs: 900_000,
      tickEveryMs: 400,
      onCrossing: (crossing) => {
        applied.push(crossing.atMs);
      },
    });
    expect(overshoot).toEqual({ kind: "expired", consumedMs: 1000 });
    expect(applied).toEqual([400, 800, 1200]);
    expect(
      countThresholdCrossingsV1({ fromMs: 0, toMs: 1500, everyMs: 400 }),
    ).toBe(applied.length);
  });

  it("walks tick and frame crossings in time order with tick-first ties", () => {
    const pending = holdFixtureV1(24, 1000);
    const walk: HoldTimelineCrossingV1[] = [];
    const outcome = settleHoldTimelineV1({
      pending,
      elapsedMs: 1000,
      tickEveryMs: 500,
      // Declaration order differs from time order; a tie at 500 applies the
      // tick effect first, then the frames in declaration order.
      frameAtMs: [500, 250, 500],
      onCrossing: (crossing) => {
        walk.push(crossing);
      },
    });
    expect(outcome).toEqual({ kind: "expired", consumedMs: 1000 });
    expect(walk).toEqual([
      { kind: "frame", atMs: 250, index: 1 },
      { kind: "tick", atMs: 500 },
      { kind: "frame", atMs: 500, index: 0 },
      { kind: "frame", atMs: 500, index: 2 },
      { kind: "tick", atMs: 1000 },
    ]);

    // A frame swap is a crossing like any other: an arm flipped by it cuts
    // the walk at that instant.
    let sawFrame = false;
    const cut = settleHoldTimelineV1({
      pending: holdFixtureV1(25, 1000),
      elapsedMs: 1000,
      tickEveryMs: 500,
      frameAtMs: [500, 250, 500],
      arms: [() => sawFrame],
      onCrossing: (crossing) => {
        if (crossing.kind === "frame" && crossing.index === 0) sawFrame = true;
      },
    });
    expect(cut).toEqual({ kind: "rerouted", armIndex: 0, consumedMs: 500 });
  });

  it("shares the declaration-order first-match rule with entry checks", () => {
    expect(firstMatchingHoldArmV1([])).toBeNull();
    expect(firstMatchingHoldArmV1([() => false, () => false])).toBeNull();
    expect(firstMatchingHoldArmV1([() => false, () => true, () => true])).toBe(1);
  });

  it("rejects invalid milliseconds and crossing declarations", () => {
    const pending = holdFixtureV1(26);
    expect(() => settleHoldTimelineV1({ pending, elapsedMs: 0 })).toThrow(TypeError);
    expect(() => settleHoldTimelineV1({ pending, elapsedMs: 16.7 })).toThrow(TypeError);
    expect(() => settleHoldTimelineV1({ pending, elapsedMs: 100, tickEveryMs: 0 })).toThrow(
      TypeError,
    );
    expect(() => settleHoldTimelineV1({ pending, elapsedMs: 100, frameAtMs: [0] })).toThrow(
      TypeError,
    );
  });
});
